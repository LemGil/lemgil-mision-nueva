import { describe, expect, it } from 'vitest';
import type { Aporte, DatosMinisterio } from '../modelo/tipos';
import type { RespaldoViejo } from './convertir';
import { previaOfrendasGrupo, traerOfrendasGrupo } from './traerOfrendasGrupo';
import { RepoFalso } from './repoFalso';

const respaldo = {
  aportesComun: [
    { id: 'x1', grupoId: 'viejo-1', diezmadorId: null, fecha: '2024-05-19', monto: 336, tipo: 'Ofrenda', metodo: 'Efectivo', referencia: 'MY-19', notas: 'CAPELLANÍA | ' },
    { id: 'x2', grupoId: 'viejo-2', diezmadorId: null, fecha: '2025-01-12', monto: 200, tipo: 'Ofrenda' },
    { id: 'x3', grupoId: null, diezmadorId: 'd1', fecha: '2025-01-12', monto: 999, tipo: 'Diezmo' },
    { id: 'x4', grupoId: 'viejo-1', diezmadorId: 'd2', fecha: '2025-01-12', monto: 888, tipo: 'Ofrenda' },
  ],
  grupos: [{ id: 'viejo-1', nombre: 'IGLESIA 120 Y 51' }],
} as unknown as RespaldoViejo;

const datos = {
  grupos: [{ id: 'g-actual', nombre: 'IGLESIA 120 Y 51', tipo: 'Iglesia' }],
} as unknown as DatosMinisterio;

describe('traer las ofrendas del grupo', () => {
  it('la previa cuenta solo las del grupo (con grupoId y sin diezmador)', () => {
    const p = previaOfrendasGrupo(respaldo, datos);
    expect(p.registros).toBe(2);
    expect(p.total).toBe(536);
    expect(p.destino?.id).toBe('g-actual');
  });

  it('entran a nombre del grupo actual, con su método y referencia; la segunda vez ya estaban', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const res = await traerOfrendasGrupo(r, respaldo, datos);
    expect(res).toMatchObject({ entraron: 2, yaEstaban: 0, restaurados: 0, destino: 'IGLESIA 120 Y 51' });
    const aportes = repo.vivos<Aporte>('aportes');
    expect(aportes).toHaveLength(2);
    expect(aportes.find((a) => a.id === 'x1')).toMatchObject({
      grupoId: 'g-actual', tipo: 'Ofrenda', monto: 336, metodo: 'Efectivo', referencia: 'MY-19',
    });
    const res2 = await traerOfrendasGrupo(r, respaldo, datos);
    expect(res2).toMatchObject({ entraron: 0, yaEstaban: 2 });
  });
});
