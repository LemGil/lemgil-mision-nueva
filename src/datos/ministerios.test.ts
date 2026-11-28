import { describe, expect, it } from 'vitest';
import {
  actualizarMinisterio,
  borrarMinisterio,
  crearMinisterio,
  fijarResponsableMinisterio,
} from './acciones';
import { RepoFalso } from '../migracion/repoFalso';
import type { AsignacionMinisterio, DatosMinisterio, Ministerio } from '../modelo/tipos';
import { resumenMinisterios } from '../motor/ministerios';

function datosDesde(repo: RepoFalso): DatosMinisterio {
  return {
    personas: [
      { id: 'p1', nombre: 'Ana', apellidos: 'Paz' },
      { id: 'p2', nombre: 'Beto', apellidos: 'Río' },
      { id: 'p3', nombre: 'Cora', apellidos: 'Sol' },
    ],
    conversiones: [],
    miembros: [],
    estudiantes: [],
    diezmadores: [],
    beneficiarios: [],
    hitos: [],
    asignaciones: repo.vivos<AsignacionMinisterio>('asignaciones'),
    grupos: [],
    evangelismos: [],
    aportes: [],
    colaboradores: [],
    aportesRed: [],
    campanas: [],
    entregas: [],
    reuniones: [],
    academias: [],
    encuentros: [],
    ministerios: repo.vivos<Ministerio>('ministerios'),
    pasos: [],
  } as DatosMinisterio;
}

describe('la ficha del ministerio', () => {
  it('crea la ficha con inicio, misión y responsable; el responsable queda participante', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const m = await crearMinisterio(r, datosDesde(repo), {
      nombre: 'Intercesión',
      inicio: '2025-03-02',
      mision: 'Orar por la casa',
      responsableId: 'p1',
      participanteIds: ['p2'],
    });
    expect(m.id).toBeTruthy();
    const d = datosDesde(repo);
    expect(d.ministerios).toHaveLength(1);
    expect(d.ministerios[0].mision).toBe('Orar por la casa');
    // p2 por la lista y p1 por el gozne del responsable.
    expect(d.asignaciones.map((a) => a.personaId).sort()).toEqual(['p1', 'p2']);
    await expect(
      crearMinisterio(r, datosDesde(repo), { nombre: 'intercesion' }),
    ).rejects.toThrow('Ya hay un ministerio llamado');
  });

  it('adoptar un ministerio que ya vivía en asignaciones: la lista manda', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const previa: AsignacionMinisterio = { id: 'a1', personaId: 'p3', ministerio: 'Alabanza' };
    await repo.guardar('asignaciones', previa);
    await crearMinisterio(r, datosDesde(repo), {
      nombre: 'Alabanza',
      participanteIds: ['p1'],
    });
    const d = datosDesde(repo);
    expect(d.ministerios).toHaveLength(1);
    expect(d.asignaciones.map((a) => a.personaId)).toEqual(['p1']);
  });

  it('al corregir, el renombre mueve las asignaciones y la lista sincroniza', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const m = await crearMinisterio(r, datosDesde(repo), {
      nombre: 'Alabanza',
      participanteIds: ['p1', 'p2'],
    });
    await actualizarMinisterio(
      r,
      datosDesde(repo),
      { ...m, nombre: 'Alabanza y Adoración' },
      ['p2', 'p3'],
    );
    const d = datosDesde(repo);
    expect(d.ministerios[0].nombre).toBe('Alabanza y Adoración');
    expect(d.asignaciones.map((a) => a.personaId).sort()).toEqual(['p2', 'p3']);
    expect(d.asignaciones.every((a) => a.ministerio === 'Alabanza y Adoración')).toBe(true);
  });

  it('fijar al responsable sin ficha la crea, con su asignación', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    await fijarResponsableMinisterio(r, datosDesde(repo), 'Ujieres', 'p2');
    const d = datosDesde(repo);
    expect(d.ministerios).toHaveLength(1);
    expect(d.ministerios[0].responsableId).toBe('p2');
    expect(d.asignaciones.map((a) => a.personaId)).toEqual(['p2']);
    const vista = resumenMinisterios(d).find((v) => v.nombre === 'Ujieres');
    expect(vista?.responsable).toBe('Beto Río');
  });

  it('borrar el ministerio quita a su gente y su ficha', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    await crearMinisterio(r, datosDesde(repo), {
      nombre: 'Ujieres',
      participanteIds: ['p1'],
    });
    await borrarMinisterio(r, datosDesde(repo), 'Ujieres');
    const d = datosDesde(repo);
    expect(d.ministerios).toHaveLength(0);
    expect(d.asignaciones).toHaveLength(0);
  });
});
