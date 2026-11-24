import { describe, expect, it } from 'vitest';
import { convertirRed, vistaPreviaRed } from './traerRed';
import type { RespaldoViejo } from './convertir';

const respaldo: RespaldoViejo = {
  colaboradores: [
    {
      id: 'c1', nombre: 'CORBAN', apellido: 'MINISTERIO', telefono: '18327050355',
      email: 'x@y.z', estado: 'Activo', tipo: 'Iglesia', planOfrendaTipo: '',
      planOfrendaMonto: 0, notas: 'Ayuda Mensual',
    },
    { id: 'c2', nombre: 'Ana', estado: 'Inactivo', tipo: 'Persona' },
  ],
  aportes: [
    { id: 'a1', colaboradorId: 'c1', fecha: '2025-08-10', monto: 210, tipo: 'Diezmo', metodo: 'Efectivo', referencia: '', notas: '' },
    { id: 'a2', colaboradorId: 'c2', fecha: '2026-01-20', monto: 50, tipo: 'Ofrenda' },
    { id: 'a3', colaboradorId: 'fantasma', fecha: '2026-02-01', monto: 999, tipo: 'Ofrenda' },
  ],
};

describe('convertirRed', () => {
  it('trae colaboradores y aportes con sus campos; el huérfano queda fuera y contado', () => {
    const { colaboradores, aportesRed, huerfanos } = convertirRed(respaldo);
    expect(colaboradores).toHaveLength(2);
    expect(colaboradores[0].nombre).toBe('CORBAN');
    expect(colaboradores[0].tipo).toBe('Iglesia');
    expect(aportesRed).toHaveLength(2);
    expect(huerfanos).toBe(1);
    const previa = vistaPreviaRed(respaldo);
    expect(previa.total).toBe(260);
  });
});

import { traerRed } from './traerRed';
import { RepoFalso } from './repoFalso';
import type { AporteRed, Colaborador } from '../modelo/tipos';

describe('traerRed (restaurativa)', () => {
  it('en una base vacía trae todo; el huérfano queda fuera', async () => {
    const repo = new RepoFalso();
    const r = await traerRed(repo.comoRepo(), respaldo);
    expect(r).toEqual({ colaboradores: 2, aportes: 2, yaEstaban: 0, restaurados: 0, huerfanos: 1, total: 260 });
    expect(repo.vivos<Colaborador>('colaboradores')).toHaveLength(2);
    expect(repo.vivos<AporteRed>('aportesRed')).toHaveLength(2);
  });

  it('correrla dos veces no duplica: la segunda no trae nada', async () => {
    const repo = new RepoFalso();
    await traerRed(repo.comoRepo(), respaldo);
    const r = await traerRed(repo.comoRepo(), respaldo);
    expect(r.colaboradores).toBe(0);
    expect(r.aportes).toBe(0);
    expect(r.yaEstaban).toBe(4);
    expect(repo.vivos<Colaborador>('colaboradores')).toHaveLength(2);
  });

  it('trae lo que falta y restaura lo borrado: correrla es recuperar', async () => {
    const repo = new RepoFalso();
    // c1 ya vive aquí (creado a mano); a2 fue borrado alguna vez: el Traer lo restaura.
    repo.sembrar('colaboradores', { id: 'c1', nombre: 'CORBAN', apellido: 'MINISTERIO', estado: 'Activo', borrado: false });
    repo.sembrar('aportesRed', { id: 'a2', colaboradorId: 'c2', fecha: '2026-01-20', monto: 50, tipo: 'Ofrenda', borrado: true });
    const r = await traerRed(repo.comoRepo(), respaldo);
    expect(r.colaboradores).toBe(1); // solo c2
    expect(r.aportes).toBe(2); // a1 entra y a2 se restaura
    expect(r.yaEstaban).toBe(1); // solo c1
    expect(r.restaurados).toBe(1); // la tumba de a2
    const aportes = await repo.todosConSobre('aportesRed');
    expect(aportes.find((a) => a.id === 'a2')?.borrado).toBe(false);
    expect(repo.vivos<AporteRed>('aportesRed').map((a) => a.id).sort()).toEqual(['a1', 'a2']);
  });
});
