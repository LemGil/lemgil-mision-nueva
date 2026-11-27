import { describe, expect, it } from 'vitest';
import {
  actualizarEncuentro,
  borrarAcademia,
  crearAcademia,
  registrarEncuentro,
} from './acciones';
import { RepoFalso } from '../migracion/repoFalso';
import type { Academia, DatosMinisterio, Encuentro, Estudiante } from '../modelo/tipos';
import {
  concluidosDeAcademia,
  conclusionesDeEstudiante,
  resumenAcademias,
} from '../motor/academia';

function datosDesde(repo: RepoFalso): DatosMinisterio {
  return {
    personas: [],
    conversiones: [],
    miembros: [],
    estudiantes: repo.vivos<Estudiante>('estudiantes'),
    diezmadores: [],
    beneficiarios: [],
    hitos: [],
    asignaciones: [],
    grupos: [],
    evangelismos: [],
    aportes: [],
    colaboradores: [],
    aportesRed: [],
    campanas: [],
    entregas: [],
    reuniones: [],
    academias: repo.vivos<Academia>('academias'),
    encuentros: repo.vivos<Encuentro>('encuentros'),
    pasos: [],
  } as DatosMinisterio;
}

describe('el catálogo de academias', () => {
  it('crea una academia con su nombre y su nivel; el nombre repetido se niega', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const a = await crearAcademia(r, datosDesde(repo), {
      nombre: 'Descodificando la Salvación',
      nivel: 'Nivel I',
    });
    expect(a.id).toBeTruthy();
    expect(datosDesde(repo).academias).toHaveLength(1);
    await expect(
      crearAcademia(r, datosDesde(repo), { nombre: 'descodificando la salvacion', nivel: 'Nivel II' }),
    ).rejects.toThrow('Ya hay una academia con ese nombre');
  });

  it('una academia con encuentros no se borra; sin encuentros, sí', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const a = await crearAcademia(r, datosDesde(repo), { nombre: 'Academia A', nivel: 'Nivel I' });
    const b = await crearAcademia(r, datosDesde(repo), { nombre: 'Academia B', nivel: 'Nivel I' });
    await registrarEncuentro(r, datosDesde(repo), {
      academiaId: a.id,
      fecha: '2026-11-29',
      alumnoIds: ['p1'],
    });
    await expect(borrarAcademia(r, datosDesde(repo), a.id)).rejects.toThrow(
      'ya tiene encuentros',
    );
    await borrarAcademia(r, datosDesde(repo), b.id);
    expect(datosDesde(repo).academias.map((x) => x.id)).toEqual([a.id]);
  });
});

describe('los encuentros y las conclusiones', () => {
  it('registrar exige una academia del catálogo y una fecha; los alumnos no se duplican', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const a = await crearAcademia(r, datosDesde(repo), { nombre: 'Academia A', nivel: 'Nivel I' });
    await expect(
      registrarEncuentro(r, datosDesde(repo), { academiaId: 'no-existe', fecha: '2026-11-29', alumnoIds: [] }),
    ).rejects.toThrow('academia del catálogo');
    const e = await registrarEncuentro(r, datosDesde(repo), {
      academiaId: a.id,
      fecha: '2026-11-29',
      alumnoIds: ['p1', 'p1', 'p2'],
    });
    expect(e.alumnoIds).toEqual(['p1', 'p2']);
  });

  it('concluidos: únicos entre encuentros; la conclusión del estudiante lleva su primera fecha', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const a = await crearAcademia(r, datosDesde(repo), { nombre: 'Academia A', nivel: 'Nivel I' });
    await registrarEncuentro(r, datosDesde(repo), { academiaId: a.id, fecha: '2026-11-29', alumnoIds: ['p1', 'p2'] });
    await registrarEncuentro(r, datosDesde(repo), { academiaId: a.id, fecha: '2026-12-06', alumnoIds: ['p1', 'p3'] });
    const d = datosDesde(repo);
    expect([...concluidosDeAcademia(d, a.id)].sort()).toEqual(['p1', 'p2', 'p3']);
    const deP1 = conclusionesDeEstudiante(d, 'p1');
    expect(deP1).toHaveLength(1);
    expect(deP1[0].fecha).toBe('2026-11-29');
    expect(deP1[0].academia.nombre).toBe('Academia A');
    const resumen = resumenAcademias(d);
    expect(resumen).toEqual({ academias: 1, encuentros: 2, conclusiones: 3, alumnosConcluidos: 3 });
  });

  it('el gozne: quien recibe el encuentro queda estudiante Activo, y el Inactivo se reactiva', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const a = await crearAcademia(r, datosDesde(repo), { nombre: 'Academia A', nivel: 'Nivel I' });
    const fichaInactiva: Estudiante = { id: 'e-p2', personaId: 'p2', estado: 'Inactivo' };
    await repo.guardar('estudiantes', fichaInactiva);
    await registrarEncuentro(r, datosDesde(repo), {
      academiaId: a.id,
      fecha: '2026-11-29',
      alumnoIds: ['p1', 'p2'],
    });
    const d = datosDesde(repo);
    expect(d.estudiantes).toHaveLength(2);
    expect(d.estudiantes.find((e) => e.personaId === 'p1')?.estado).toBe('Activo');
    expect(d.estudiantes.find((e) => e.personaId === 'p2')?.estado).toBe('Activo');
  });

  it('quitar a un alumno del encuentro no le quita la ficha de estudiante', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const a = await crearAcademia(r, datosDesde(repo), { nombre: 'Academia A', nivel: 'Nivel I' });
    const e = await registrarEncuentro(r, datosDesde(repo), {
      academiaId: a.id,
      fecha: '2026-11-29',
      alumnoIds: ['p1'],
    });
    await actualizarEncuentro(r, datosDesde(repo), { ...e, alumnoIds: [] });
    const d = datosDesde(repo);
    expect(d.estudiantes.map((x) => x.personaId)).toEqual(['p1']);
    expect(conclusionesDeEstudiante(d, 'p1')).toHaveLength(0);
  });

  it('al corregir un encuentro, la lista de alumnos queda exacta', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const a = await crearAcademia(r, datosDesde(repo), { nombre: 'Academia A', nivel: 'Nivel I' });
    const e = await registrarEncuentro(r, datosDesde(repo), {
      academiaId: a.id,
      fecha: '2026-11-29',
      alumnoIds: ['p1', 'p2'],
    });
    await actualizarEncuentro(r, datosDesde(repo), { ...e, alumnoIds: ['p2', 'p3'] });
    const d = datosDesde(repo);
    expect([...concluidosDeAcademia(d, a.id)].sort()).toEqual(['p2', 'p3']);
    expect(conclusionesDeEstudiante(d, 'p1')).toHaveLength(0);
  });
});
