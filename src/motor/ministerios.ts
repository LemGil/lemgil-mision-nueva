// Ministerios: no hay tabla de ministerios — un ministerio existe porque
// tiene personas sirviendo en él. Esta vista los agrupa por nombre con su
// gente, para ver con claridad cada ministerio y el registro de cada
// miembro (lo que LemGil pidió para esta mesa).

import type { DatosMinisterio } from '../modelo/tipos';

export interface MiembroDeMinisterio {
  asignacionId: string;
  personaId: string;
  nombre: string;
  responsable: boolean;
}

export interface MinisterioVista {
  nombre: string;
  miembros: MiembroDeMinisterio[];
  /** Nombre de quien está al frente, si el ministerio lo tiene marcado. */
  responsable?: string;
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
      responsable: a.responsable === true,
    });
    porNombre.set(a.ministerio, lista);
  }
  return [...porNombre.entries()]
    .map(([nombre, miembros]) => {
      const ordenados = miembros.sort((x, y) => x.nombre.localeCompare(y.nombre));
      return {
        nombre,
        miembros: ordenados,
        responsable: ordenados.find((m) => m.responsable)?.nombre,
      };
    })
    .sort((x, y) => x.nombre.localeCompare(y.nombre));
}
