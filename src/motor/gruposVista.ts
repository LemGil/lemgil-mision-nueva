// La vista rica del grupo, como la de la app de siempre (foto de
// LemGil, 2026-11-20): su estado según la capacidad, el conteo de sus
// asignados por paso de la ruta y la barra de llenado.

import { PS_BAUTIZADO, PS_CONVERSO, PS_DISCIPULADO, PS_INTEGRADO, pasoPorId } from '../modelo/catalogo';
import type { DatosMinisterio, Grupo, Paso } from '../modelo/tipos';

export interface EstadoGrupo {
  etiqueta: string;
  clase: string;
}

/** El estado del grupo según su llenado: la misma regla de la app
 * anterior (≥100% Saturado, ≥70% Casi Lleno, si no Disponible; sin
 * capacidad, Sin meta). */
export function estadoGrupo(total: number, capacidad?: number | null): EstadoGrupo {
  const cap = capacidad ?? 0;
  if (!cap) return { etiqueta: '⚪ Sin meta', clase: 'chip-gris' };
  const pct = (total / cap) * 100;
  if (pct >= 100) return { etiqueta: '🔴 Saturado', clase: 'chip-rojo' };
  if (pct >= 70) return { etiqueta: '🟡 Casi Lleno', clase: 'chip-ambar' };
  return { etiqueta: '🟢 Disponible', clase: 'chip-verde' };
}

/** El porcentaje de la barra (0–100, recortado). */
export function porcentajeCapacidad(total: number, capacidad?: number | null): number {
  const cap = capacidad ?? 0;
  if (!cap) return 0;
  return Math.max(0, Math.min(100, Math.round((total / cap) * 100)));
}

/** Los cuatro pasos de la foto: Converso, Discipulado, Bautizado e
 * Integrado, en orden de ruta. */
export const PASOS_DE_LA_FOTO = [PS_CONVERSO, PS_DISCIPULADO, PS_BAUTIZADO, PS_INTEGRADO];

const CORTO: Record<string, string> = {
  [PS_CONVERSO]: 'Conversos',
  [PS_DISCIPULADO]: 'Discip.',
  [PS_BAUTIZADO]: 'Bautiz.',
  [PS_INTEGRADO]: 'Integr.',
};

export interface ConteoPasoGrupo {
  paso: Paso;
  corto: string;
  n: number;
}

/** Cuántos de los asignados al grupo están hoy en cada paso de la
 * foto, según su registro de Misión. */
export function conteoPorPasoDelGrupo(
  datos: DatosMinisterio,
  personaIds: Set<string>,
): ConteoPasoGrupo[] {
  const porPersona = new Map<string, string>();
  for (const c of datos.conversiones) porPersona.set(c.personaId, c.estado);
  return PASOS_DE_LA_FOTO.map((id) => {
    const paso = pasoPorId(datos.pasos, id) ?? {
      id,
      ambito: 'mision' as const,
      nombre: id,
      emoji: '•',
      orden: 0,
    };
    let n = 0;
    for (const pid of personaIds) if (porPersona.get(pid) === id) n++;
    return { paso, corto: CORTO[id] ?? paso.nombre, n };
  });
}

/** El líder que se muestra: el texto libre manda; si no, la persona. */
export function liderVisible(
  datos: DatosMinisterio,
  grupo: Grupo,
): string {
  if (grupo.liderTexto?.trim()) return grupo.liderTexto.trim();
  const p = grupo.liderId ? datos.personas.find((x) => x.id === grupo.liderId) : undefined;
  return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : '';
}

/** La línea de reunión: «Domingo 10:30 · CASA CENTRO» (lo que haya). */
export function lineaReunion(grupo: Grupo): string {
  const cuando = [grupo.dia?.trim(), grupo.hora?.trim()].filter(Boolean).join(' ');
  return [cuando, grupo.lugar?.trim()].filter(Boolean).join(' · ');
}
