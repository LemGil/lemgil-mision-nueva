// El catálogo de academias y sus encuentros finales: quién
// concluyó qué academia, y cuándo. La conclusión nace del
// encuentro — no del consumo del contenido.

import type { Academia, DatosMinisterio, Encuentro } from '../modelo/tipos';

/** Los encuentros de una academia, del más reciente al más viejo. */
export function encuentrosDeAcademia(datos: DatosMinisterio, academiaId: string): Encuentro[] {
  return datos.encuentros
    .filter((e) => e.academiaId === academiaId)
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

/** Todos los encuentros, del más reciente al más viejo. */
export function encuentrosRecientes(datos: DatosMinisterio): Encuentro[] {
  return datos.encuentros.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

/** Los alumnos que concluyeron una academia, sin repetir: los que
 * están en alguno de sus encuentros. */
export function concluidosDeAcademia(datos: DatosMinisterio, academiaId: string): Set<string> {
  const ids = new Set<string>();
  for (const e of datos.encuentros) {
    if (e.academiaId !== academiaId) continue;
    for (const id of e.alumnoIds) ids.add(id);
  }
  return ids;
}

export interface ConclusionDeEstudiante {
  academia: Academia;
  /** La fecha de su PRIMER encuentro de esa academia: ahí la concluyó. */
  fecha: string;
  encuentroId: string;
}

/** Las academias que un estudiante concluyó, de la más reciente a
 * la más vieja. */
export function conclusionesDeEstudiante(
  datos: DatosMinisterio,
  personaId: string,
): ConclusionDeEstudiante[] {
  const porAcademia = new Map<string, ConclusionDeEstudiante>();
  const cronologico = datos.encuentros.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  for (const e of cronologico) {
    if (!e.alumnoIds.includes(personaId) || porAcademia.has(e.academiaId)) continue;
    const academia = datos.academias.find((a) => a.id === e.academiaId);
    if (!academia) continue;
    porAcademia.set(e.academiaId, { academia, fecha: e.fecha, encuentroId: e.id });
  }
  return [...porAcademia.values()].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

/** Los niveles en uso en el catálogo, para elegir al crear o
 * editar una academia (el nivel nace del uso). */
export function nivelesDeAcademias(datos: DatosMinisterio): string[] {
  return [...new Set(datos.academias.map((a) => a.nivel).filter(Boolean))].sort();
}

export interface ResumenAcademias {
  academias: number;
  encuentros: number;
  /** Pares alumno–academia concluidos. */
  conclusiones: number;
  /** Alumnos únicos que concluyeron al menos una academia. */
  alumnosConcluidos: number;
}

export function resumenAcademias(datos: DatosMinisterio): ResumenAcademias {
  const pares = new Set<string>();
  const alumnos = new Set<string>();
  for (const a of datos.academias) {
    for (const pid of concluidosDeAcademia(datos, a.id)) {
      pares.add(`${a.id}:${pid}`);
      alumnos.add(pid);
    }
  }
  return {
    academias: datos.academias.length,
    encuentros: datos.encuentros.length,
    conclusiones: pares.size,
    alumnosConcluidos: alumnos.size,
  };
}
