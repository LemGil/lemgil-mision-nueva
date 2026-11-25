import { describe, expect, it } from 'vitest';
import type { AporteRed, Colaborador } from '../modelo/tipos';
import { borradosRed, restaurarAporteBorrado, restaurarColaboradorBorrado } from './recuperarRed';
import { RepoFalso } from './repoFalso';

describe('recuperarRed (la papelera de la Red)', () => {
  it('lista solo las tumbas y al restaurar vuelven a estar vivas, tal cual', async () => {
    const repo = new RepoFalso();
    repo.sembrar('colaboradores', { id: 'c1', nombre: 'MAYLI', apellido: 'PEGUERO', estado: 'Activo', borrado: true });
    repo.sembrar('colaboradores', { id: 'c2', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', borrado: false });
    repo.sembrar('aportesRed', { id: 'a1', colaboradorId: 'c1', fecha: '2026-07-10', monto: 100, tipo: 'Diezmo', borrado: true });
    repo.sembrar('aportesRed', { id: 'a2', colaboradorId: 'c2', fecha: '2026-07-11', monto: 50, tipo: 'Diezmo', borrado: false });
    const r = repo.comoRepo();

    const b = await borradosRed(r);
    expect(b.colaboradores.map((c) => c.id)).toEqual(['c1']);
    expect(b.aportes.map((a) => a.id)).toEqual(['a1']);

    await restaurarColaboradorBorrado(r, b.colaboradores[0]);
    await restaurarAporteBorrado(r, b.aportes[0]);
    expect(repo.vivos<Colaborador>('colaboradores').map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    const aportes = repo.vivos<AporteRed>('aportesRed');
    expect(aportes.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    expect(aportes.find((a) => a.id === 'a1')?.monto).toBe(100);
    expect((await borradosRed(r)).colaboradores).toEqual([]);
  });
});
