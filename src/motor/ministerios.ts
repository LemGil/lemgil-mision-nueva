// Ministerios: no hay tabla de ministerios — un ministerio existe porque
// tiene personas sirviendo en él. Esta vista los agrupa por nombre con su
// gente, para ver con claridad cada ministerio y el registro de cada
// miembro (lo que LemGil pidió para esta mesa).

import type { DatosMinisterio } from '../modelo/tipos';

export interface MiembroDeMinisterio {
  asignacionId: string;
  personaId: string;
  nombre: string;
}

export interface MinisterioVista {
  nombre: string;
  miembros: MiembroDeMinisterio[];
}

export function resumenMinisterios(datos: DatosMinisterio): MinisterioVista[] {
  const nombreDe = new Map(datos.personas.map((p) => [p.id, `${p.nombre} ${p.apellidos ?? ''}`.trim()]));
  const porNombre = new Map<string, MiembroDeMinisterio[]>();
  for (const a of datos.asignaciones) {
    const lista = porNombre.get(a.ministerio) ?? [];
    lista.push({
      asignacionId: a.id,
      personaId: a.personaId,
      nombre: nombreDe.get(a.personaId) ?? '—',
    });
    porNombre.set(a.ministerio, lista);
  }
  return [...porNombre.entries()]
    .map(([nombre, miembros]) => ({
      nombre,
      miembros: miembros.sort((x, y) => x.nombre.localeCompare(y.nombre)),
    }))
    .sort((x, y) => x.nombre.localeCompare(y.nombre));
}
