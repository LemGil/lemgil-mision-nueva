import { describe, expect, it } from 'vitest';
import type { AporteRed, Colaborador } from '../modelo/tipos';
import { borradosRed, borrarDefinitivoAporteRed, borrarDefinitivoColaboradorRed, restaurarAporteBorrado, restaurarColaboradorBorrado, type Purgador } from './recuperarRed';
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

  it('el borrado definitivo purga la ficha con sus aportes borrados, y solo eso', async () => {
    const repo = new RepoFalso();
    repo.sembrar('colaboradores', { id: 'c1', nombre: 'MAYLI', apellido: 'PEGUERO', estado: 'Activo', borrado: true });
    repo.sembrar('colaboradores', { id: 'c2', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', borrado: true });
    repo.sembrar('aportesRed', { id: 'a1', colaboradorId: 'c1', fecha: '2026-07-10', monto: 100, tipo: 'Diezmo', borrado: true });
    repo.sembrar('aportesRed', { id: 'a2', colaboradorId: 'c1', fecha: '2026-06-10', monto: 90, tipo: 'Diezmo', borrado: true });
    repo.sembrar('aportesRed', { id: 'a3', colaboradorId: 'c2', fecha: '2026-07-11', monto: 50, tipo: 'Diezmo', borrado: true });
    const r = repo.comoRepo();
    const purgador: Purgador = {
      borrarDefinitivo: async (tabla, id) => {
        await repo.eliminarLocal(tabla, id);
      },
    };

    const res = await borrarDefinitivoColaboradorRed(r, purgador, { id: 'c1', nombre: 'MAYLI' } as Colaborador);
    expect(res.aportes).toBe(2);
    expect((await repo.todosConSobre('colaboradores')).map((f) => f.id)).toEqual(['c2']);
    expect((await repo.todosConSobre('aportesRed')).map((f) => f.id)).toEqual(['a3']);

    await borrarDefinitivoAporteRed(purgador, { id: 'a3' } as AporteRed);
    expect(await repo.todosConSobre('aportesRed')).toEqual([]);
  });

  it('se niega a purgar una ficha que tiene aportes vivos', async () => {
    const repo = new RepoFalso();
    repo.sembrar('colaboradores', { id: 'c1', nombre: 'MAYLI', apellido: 'PEGUERO', estado: 'Activo', borrado: true });
    repo.sembrar('aportesRed', { id: 'a1', colaboradorId: 'c1', fecha: '2026-07-10', monto: 100, tipo: 'Diezmo', borrado: false });
    const purgador: Purgador = { borrarDefinitivo: async () => undefined };
    await expect(
      borrarDefinitivoColaboradorRed(repo.comoRepo(), purgador, { id: 'c1', nombre: 'MAYLI' } as Colaborador),
    ).rejects.toThrow('aportes vivos');
    expect((await repo.todosConSobre('colaboradores')).length).toBe(1);
  });
});
