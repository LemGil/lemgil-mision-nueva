// El catálogo semilla del modelo congelado (plano §2.3 y §2.4).
// Las identidades (id) son las mismas de la app actual para que la migración
// única sea directa. Los nombres son los vivos de LemGil (la etapa sigue el
// nombre vivo; «Congregados» queda como nombre de la congregación/lista).

import type { Paso } from './tipos';

export const PS_ALCAZADO = 'ps-congregado'; // inicio — nombre vivo: Alcanzado
export const PS_CONFESO = 'ps-confeso';
export const PS_CONVERSO = 'ps-nuevo';
export const PS_DISCIPULADO = 'ps-discipulado';
export const PS_BAUTIZADO = 'ps-bautizado';
export const PS_INTEGRADO = 'ps-integrado'; // el gozne
export const PS_APARTADO = 'ps-apartado';
export const PS_TRASLADO = 'ps-traslado';
export const PS_FALLECIDO = 'ps-fallecido';

export const PM_GRUPO = 'pm-grupo';
export const PM_DIEZMO = 'pm-diezmo';
export const PM_ACADEMIA = 'pm-academia';
export const PM_MINISTERIO = 'pm-ministerio';
export const PM_HERMANO_MAYOR = 'pm-hermano-mayor';
export const PM_LIDERAZGO = 'pm-liderazgo';

export const CATALOGO_SEMILLA: Paso[] = [
  // La ruta de Misión: Alcanzado → Confeso → Converso → Discipulado →
  // Bautizado → Integrado (gozne) → Miembros. Salidas al final.
  { id: PS_ALCAZADO, ambito: 'mision', nombre: 'Alcanzado', emoji: '🙏', orden: 1, rol: 'inicio', protegido: true },
  { id: PS_CONFESO, ambito: 'mision', nombre: 'Confeso', emoji: '🤲', orden: 2, rol: 'camino' },
  { id: PS_CONVERSO, ambito: 'mision', nombre: 'Converso', emoji: '🌱', orden: 3, rol: 'camino' },
  { id: PS_DISCIPULADO, ambito: 'mision', nombre: 'Discipulado', emoji: '📖', orden: 4, rol: 'camino' },
  { id: PS_BAUTIZADO, ambito: 'mision', nombre: 'Bautizado', emoji: '💧', orden: 5, rol: 'camino' },
  { id: PS_INTEGRADO, ambito: 'mision', nombre: 'Integrado', emoji: '🏘️', orden: 6, rol: 'gozne', protegido: true },
  { id: PS_APARTADO, ambito: 'mision', nombre: 'Apartado', emoji: '🚪', orden: 7, rol: 'salida', protegido: true },
  { id: PS_TRASLADO, ambito: 'mision', nombre: 'Traslado', emoji: '🧳', orden: 8, rol: 'salida', protegido: true },
  { id: PS_FALLECIDO, ambito: 'mision', nombre: 'Fallecido', emoji: '✝️', orden: 9, rol: 'salida', protegido: true },
  // La escalera de Miembros. La Integración NO es un peldaño: es la puerta
  // (el gozne). La escalera que se trabaja empieza en Grupo.
  { id: PM_GRUPO, ambito: 'miembros', nombre: 'Grupo', emoji: '👥', orden: 1, fuente: 'grupo' },
  { id: PM_DIEZMO, ambito: 'miembros', nombre: 'Diezmador', emoji: '🌾', orden: 2, fuente: 'diezmo' },
  { id: PM_ACADEMIA, ambito: 'miembros', nombre: 'Academia', emoji: '🎓', orden: 3, fuente: 'academia' },
  { id: PM_MINISTERIO, ambito: 'miembros', nombre: 'Ministerio', emoji: '🤲', orden: 4, fuente: 'ministerio' },
  { id: PM_HERMANO_MAYOR, ambito: 'miembros', nombre: 'Hermano Mayor', emoji: '🌱', orden: 5, fuente: 'hermanoMayor' },
  { id: PM_LIDERAZGO, ambito: 'miembros', nombre: 'Liderazgo', emoji: '⭐', orden: 6, fuente: 'manual' },
];

export function pasosDeMision(pasos: Paso[]): Paso[] {
  return pasos
    .filter((p) => p.ambito === 'mision')
    .slice()
    .sort((a, b) => a.orden - b.orden);
}

export function pasosDeMiembros(pasos: Paso[]): Paso[] {
  const ordenados = pasos
    .filter((p) => p.ambito === 'miembros')
    .slice()
    .sort((a, b) => a.orden - b.orden);
  // Si el catálogo trae dos pasos con el mismo nombre (pasó con
  // «Diezmador»: el suyo propio y el de la semilla), la escalera muestra
  // solo el primero — palabra de LemGil, 2026-11-19.
  const vistos = new Set<string>();
  return ordenados.filter((p) => {
    const clave = p.nombre.trim().toLowerCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

export function pasoPorId(pasos: Paso[], id: string): Paso | undefined {
  return pasos.find((p) => p.id === id);
}

export function esSalida(pasos: Paso[], id: string): boolean {
  return pasoPorId(pasos, id)?.rol === 'salida';
}

export function esGozne(pasos: Paso[], id: string): boolean {
  return pasoPorId(pasos, id)?.rol === 'gozne';
}
