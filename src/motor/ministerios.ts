// Ministerios: la vista une la ficha del catálogo (nombre, inicio,
// misión y responsable) con su gente, que son las asignaciones con
// su nombre. Un ministerio del catálogo se ve aunque aún no tenga
// gente; uno que solo vive en asignaciones se ve igual y se adopta
// al editarlo. El responsable manda desde la ficha; la marca vieja
// en la asignación solo vale si el ministerio no tiene ficha.

import type { DatosMinisterio } from '../modelo/tipos';

export interface MiembroDeMinisterio {
  asignacionId: string;
  personaId: string;
  nombre: string;
  responsable: boolean;
}

export interface MinisterioVista {
  /** El id de la ficha del catálogo, si el ministerio la tiene. */
  ministerioId?: string;
  nombre: string;
  /** Fecha de inicio o formación, si la ficha la trae. */
  inicio?: string;
  /** La misión que el ministerio tendrá, si la ficha la trae. */
  mision?: string;
  responsableId?: string;
  miembros: MiembroDeMinisterio[];
  /** Nombre de quien está al frente, si el ministerio lo tiene marcado. */
  responsable?: string;
}

const clave = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase();

export function resumenMinisterios(datos: DatosMinisterio): MinisterioVista[] {
  const nombreDe = new Map(datos.personas.map((p) => [p.id, `${p.nombre} ${p.apellidos ?? ''}`.trim()]));
  const porClave = new Map<string, MinisterioVista>();
  const vistaDe = (nombre: string): MinisterioVista => {
    const k = clave(nombre);
    let v = porClave.get(k);
    if (!v) {
      v = { nombre, miembros: [] };
      porClave.set(k, v);
    }
    return v;
  };
  for (const a of datos.asignaciones) {
    vistaDe(a.ministerio).miembros.push({
      asignacionId: a.id,
      personaId: a.personaId,
      nombre: nombreDe.get(a.personaId) ?? '—',
      responsable: a.responsable === true,
    });
  }
  for (const m of datos.ministerios) {
    const v = vistaDe(m.nombre);
    v.ministerioId = m.id;
    v.nombre = m.nombre;
    v.inicio = m.inicio;
    v.mision = m.mision;
    if (m.responsableId) v.responsableId = m.responsableId;
  }
  return [...porClave.values()]
    .map((v) => {
      const ordenados = v.miembros.sort((x, y) => x.nombre.localeCompare(y.nombre));
      // El responsable de la ficha manda; sin ficha, vale la marca
      // que la asignación traiga de antes.
      const responsableId =
        v.responsableId ?? ordenados.find((m) => m.responsable)?.personaId;
      return {
        ...v,
        miembros: ordenados.map((m) => ({ ...m, responsable: m.personaId === responsableId })),
        responsableId,
        responsable: responsableId ? nombreDe.get(responsableId) : undefined,
      };
    })
    .sort((x, y) => x.nombre.localeCompare(y.nombre));
}
