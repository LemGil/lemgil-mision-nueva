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

// ——— Pertenencia con tipos (decisión de LemGil, 2026-11-23) ———
// Existen diferentes tipos de grupo (Iglesia, Oikos…): una persona
// puede estar en UN grupo de cada tipo — su Iglesia y su Oikos a la
// vez. La pertenencia vive en `grupoIds` (la lista); el `grupoId`
// viejo se sigue leyendo como una lista de uno, sin migración.

const normalizarTipo = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** La clave de comparación del tipo de un grupo ('' si no tiene). */
export function claveTipoGrupo(grupo?: Grupo | null): string {
  return normalizarTipo(grupo?.tipo ?? '');
}

/** El tipo tal como se muestra ('Sin tipo' si el grupo no tiene). */
export function tipoVisibleGrupo(grupo?: Grupo | null): string {
  return grupo?.tipo?.trim() || 'Sin tipo';
}

/** Los ids de grupo de una persona: la unión de su ficha y de su
 * ficha de miembro, leyendo el dato viejo (grupoId) y el nuevo
 * (grupoIds), solo grupos que existen. */
export function idsGruposDe(datos: DatosMinisterio, personaId: string): string[] {
  const ids = new Set<string>();
  const agregar = (lista?: string[], unico?: string | null) => {
    for (const id of lista ?? []) if (id) ids.add(id);
    if (unico) ids.add(unico);
  };
  const persona = datos.personas.find((x) => x.id === personaId);
  if (persona) agregar(persona.grupoIds, persona.grupoId);
  const miembro = datos.miembros.find((x) => x.personaId === personaId);
  if (miembro) agregar(miembro.grupoIds, miembro.grupoId);
  return [...ids].filter((id) => datos.grupos.some((g) => g.id === id));
}

/** Los grupos de una persona, en el orden de su lista. */
export function gruposDePersona(datos: DatosMinisterio, personaId: string): Grupo[] {
  return idsGruposDe(datos, personaId)
    .map((id) => datos.grupos.find((g) => g.id === id))
    .filter((g): g is Grupo => !!g);
}

/** Los nombres de sus grupos unidos ('IGLESIA 120 Y 51 · OIKOS ALICIA'). */
export function nombresGruposDe(datos: DatosMinisterio, personaId: string): string | undefined {
  const nombres = gruposDePersona(datos, personaId).map((g) => g.nombre);
  return nombres.length ? nombres.join(' · ') : undefined;
}

/** El grupo que la persona ya tiene de un tipo dado (por su clave). */
export function grupoDeTipo(
  datos: DatosMinisterio,
  personaId: string,
  claveTipo: string,
): Grupo | undefined {
  return gruposDePersona(datos, personaId).find((g) => claveTipoGrupo(g) === claveTipo);
}

/** Los tipos de grupo en uso, para los selectores por tipo: Iglesia
 * y Oikos primero si existen; el tipo vacío aparece como 'Sin tipo'
 * solo si hay grupos sin tipo. */
export function tiposDeGrupoEnUso(datos: DatosMinisterio): { clave: string; nombre: string }[] {
  const vistos = new Map<string, string>();
  for (const g of datos.grupos) {
    const clave = claveTipoGrupo(g);
    if (!vistos.has(clave)) vistos.set(clave, tipoVisibleGrupo(g));
  }
  const orden = (clave: string) => (clave === 'iglesia' ? 0 : clave === 'oikos' ? 1 : clave === '' ? 3 : 2);
  return [...vistos.entries()]
    .map(([clave, nombre]) => ({ clave, nombre }))
    .sort((a, b) => orden(a.clave) - orden(b.clave) || a.nombre.localeCompare(b.nombre));
}

/** Las personas asignadas a un grupo (sin filtrar bajas: eso lo
 * decide quien muestra, como hace la página de Grupos). */
export function idsMiembrosDeGrupo(datos: DatosMinisterio, grupoId: string): string[] {
  const ids: string[] = [];
  for (const p of datos.personas) {
    if (idsGruposDe(datos, p.id).includes(grupoId)) ids.push(p.id);
  }
  return ids;
}

// ——— La familia de grupos: el Oikos cuelga de su Iglesia ———
// (decisión de LemGil, 2026-11-23: mañana pueden ser más iglesias,
// y cada Oikos sabe de cuál es; la lista se lee por familia y el
// Oikos se distingue: 🏡 frente al 🏠 de la Iglesia).

/** El icono del grupo según su tipo: el Oikos es la casita 🏡. */
export function iconoGrupo(grupo?: Grupo | null): string {
  return claveTipoGrupo(grupo) === 'oikos' ? '🏡' : '🏠';
}

/** ¿Es un grupo de tipo Iglesia? */
export function esIglesia(grupo?: Grupo | null): boolean {
  return claveTipoGrupo(grupo) === 'iglesia';
}

/** ¿Es un grupo de tipo Oikos? */
export function esOikos(grupo?: Grupo | null): boolean {
  return claveTipoGrupo(grupo) === 'oikos';
}

/** La Iglesia de la que cuelga este grupo (su padre), si la tiene. */
export function padreDe(datos: DatosMinisterio, grupo: Grupo): Grupo | undefined {
  return grupo.padreId ? datos.grupos.find((g) => g.id === grupo.padreId) : undefined;
}

/** Los grupos que cuelgan de este (sus Oikos), por nombre. */
export function hijosDe(datos: DatosMinisterio, grupoId: string): Grupo[] {
  return datos.grupos
    .filter((g) => g.padreId === grupoId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** La lista ordenada por familia: cada Iglesia primero, con sus
 * Oikos pegados debajo; después los demás grupos. Los huérfanos
 * (padre que ya no existe) quedan como raíces, a la vista. */
export function ordenarGruposPorFamilia(datos: DatosMinisterio, grupos: Grupo[]): Grupo[] {
  const enLaLista = new Set(grupos.map((g) => g.id));
  const hijos = new Map<string, Grupo[]>();
  const raices: Grupo[] = [];
  for (const g of [...grupos].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    if (g.padreId && enLaLista.has(g.padreId) && datos.grupos.some((x) => x.id === g.padreId)) {
      const lista = hijos.get(g.padreId) ?? [];
      lista.push(g);
      hijos.set(g.padreId, lista);
    } else {
      raices.push(g);
    }
  }
  raices.sort(
    (a, b) =>
      Number(esIglesia(b)) - Number(esIglesia(a)) || a.nombre.localeCompare(b.nombre),
  );
  const salida: Grupo[] = [];
  for (const r of raices) {
    salida.push(r);
    for (const h of hijos.get(r.id) ?? []) salida.push(h);
  }
  return salida;
}
