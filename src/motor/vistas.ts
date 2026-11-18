// Vistas de las listas: cómo se agrupa y qué se muestra por defecto.
// Regla de LemGil: las listas abren SOLO con los activos; las bajas
// (traslados, apartados, fallecidos) salen únicamente cuando se filtran.

import type { ClasePersona } from './censo';

export interface GrupoVista<T> {
  titulo: string;
  items: T[];
}

/** Agrupa por la clave dada; los grupos «Sin …» van al final. */
export function agrupar<T>(items: readonly T[], clave: (t: T) => string): GrupoVista<T>[] {
  const mapa = new Map<string, T[]>();
  for (const it of items) {
    const k = clave(it);
    const arr = mapa.get(k) ?? [];
    arr.push(it);
    mapa.set(k, arr);
  }
  const peso = (t: string) => (t.startsWith('Sin ') ? 1 : 0);
  return [...mapa.entries()]
    .map(([titulo, lista]) => ({ titulo, items: lista }))
    .sort((a, b) => peso(a.titulo) - peso(b.titulo) || a.titulo.localeCompare(b.titulo));
}

export type VerPersonas = 'activos' | 'bajas' | 'todos';

export const esBaja = (clase: ClasePersona): boolean =>
  clase === 'fallecido' || clase === 'apartado' || clase === 'salida' || clase === 'trasladado';

/** ¿Esta persona se ve en la lista con el filtro «Ver» elegido? */
export function visibleSegunVer(clase: ClasePersona, ver: VerPersonas): boolean {
  if (ver === 'activos') return !esBaja(clase);
  if (ver === 'bajas') return esBaja(clase);
  return true;
}
