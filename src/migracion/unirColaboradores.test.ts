import { describe, expect, it } from 'vitest';
import type { AporteRed, Colaborador, DatosMinisterio } from '../modelo/tipos';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import { planUnionColaboradores, unirColaboradoresRepetidos } from './unirColaboradores';
import { RepoFalso } from './repoFalso';

const datos: DatosMinisterio = {
  personas: [], conversiones: [], miembros: [], estudiantes: [], diezmadores: [],
  beneficiarios: [], hitos: [], asignaciones: [], grupos: [], evangelismos: [],
  aportes: [], pasos: CATALOGO_SEMILLA, campanas: [], entregas: [],
  reuniones: [],
  academias: [], encuentros: [],
  colaboradores: [
    { id: 'k1', nombre: 'CORBAN', apellido: 'MINISTERIO', estado: 'Activo', tipo: 'Iglesia', telefono: '555-1' },
    { id: 'k2', nombre: 'Corban', apellido: 'Ministerio', estado: 'Activo', tipo: 'Persona' },
    { id: 'y1', nombre: 'PASTOR YULIET', estado: 'Activo', tipo: 'Persona' },
    { id: 'y2', nombre: 'Pastor Yuliet', estado: 'Activo', tipo: 'Persona', email: 'y@x.z' },
    { id: 'g1', nombre: 'GINA HERRERA', estado: 'Activo', tipo: 'Persona' },
  ],
  aportesRed: [
    { id: 'a1', colaboradorId: 'k2', fecha: '2026-01-01', monto: 100, tipo: 'Diezmo' },
    { id: 'a2', colaboradorId: 'k2', fecha: '2026-01-02', monto: 200, tipo: 'Diezmo' },
    { id: 'a3', colaboradorId: 'y1', fecha: '2026-01-03', monto: 300, tipo: 'Ofrenda' },
    { id: 'a4', colaboradorId: 'y2', fecha: '2026-01-04', monto: 50, tipo: 'Ofrenda' },
    { id: 'a5', colaboradorId: 'g1', fecha: '2026-01-05', monto: 70, tipo: 'Ofrenda' },
  ],
};

describe('unirColaboradoresRepetidos', () => {
  it('el plan: un grupo por nombre repetido; el principal es el de más aportes', () => {
    const plan = planUnionColaboradores(datos);
    expect(plan).toHaveLength(2);
    const corban = plan.find((g) => g.principal.id === 'k2');
    expect(corban?.absorbidos.map((c) => c.id)).toEqual(['k1']);
    expect(corban?.aportesMovidos).toBe(0);
    const yuliet = plan.find((g) => g.principal.id === 'y1');
    expect(yuliet?.aportesMovidos).toBe(1);
  });

  it('une: los aportes pasan al principal, la copia se borra y los huecos se completan', async () => {
    const repo = new RepoFalso();
    for (const c of datos.colaboradores) repo.sembrar('colaboradores', { ...c, borrado: false });
    for (const a of datos.aportesRed) repo.sembrar('aportesRed', { ...a, borrado: false });
    const r = await unirColaboradoresRepetidos(repo.comoRepo(), datos);
    expect(r).toEqual({ grupos: 2, absorbidas: 2, aportesMovidos: 1 });

    const vivos = repo.vivos<Colaborador>('colaboradores');
    expect(vivos.map((c) => c.id).sort()).toEqual(['g1', 'k2', 'y1']);
    // El principal de Yuliet ganó el email de la copia; el de Corban, el teléfono.
    expect(vivos.find((c) => c.id === 'y1')?.email).toBe('y@x.z');
    expect(vivos.find((c) => c.id === 'k2')?.telefono).toBe('555-1');
    // Todos los aportes cuelgan de las fichas vivas.
    const aportes = repo.vivos<AporteRed>('aportesRed');
    expect(aportes).toHaveLength(5);
    expect(aportes.find((a) => a.id === 'a4')?.colaboradorId).toBe('y1');
    const totalYuliet = aportes.filter((a) => a.colaboradorId === 'y1').reduce((s, a) => s + a.monto, 0);
    expect(totalYuliet).toBe(350);
  });

  it('sin repetidos no toca nada', async () => {
    const repo = new RepoFalso();
    const sinDup: DatosMinisterio = { ...datos, colaboradores: [datos.colaboradores[4]], aportesRed: [datos.aportesRed[4]] };
    const r = await unirColaboradoresRepetidos(repo.comoRepo(), sinDup);
    expect(r).toEqual({ grupos: 0, absorbidas: 0, aportesMovidos: 0 });
  });
});
