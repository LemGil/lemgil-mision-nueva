// La señal de procesos repetidos (plano §2.1): el carné bloquea la ficha
// duplicada, pero un PROCESO puede nacer dos veces bajo la misma persona
// (importación, sincronización). Esto lo caza: una persona, un registro por
// proceso. Nada se une ni se borra solo: se señala.

import { esSalida } from '../modelo/catalogo';
import type { DatosMinisterio } from '../modelo/tipos';

export interface ProcesoRepetido {
  proceso: 'Misión' | 'Miembros' | 'Academia' | 'Diezmadores' | 'Manos Abiertas';
  cantidad: number;
}

function contar<T>(items: T[], clave: (x: T) => string | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = clave(it);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** personaId → procesos con más de un registro. */
export function procesosRepetidos(datos: DatosMinisterio): Map<string, ProcesoRepetido[]> {
  const porProceso: { nombre: ProcesoRepetido['proceso']; conteo: Map<string, number> }[] = [
    { nombre: 'Misión', conteo: contar(datos.conversiones, (c) => c.personaId) },
    { nombre: 'Miembros', conteo: contar(datos.miembros, (m) => m.personaId) },
    { nombre: 'Academia', conteo: contar(datos.estudiantes, (e) => e.personaId) },
    { nombre: 'Diezmadores', conteo: contar(datos.diezmadores, (d) => d.personaId) },
    { nombre: 'Manos Abiertas', conteo: contar(datos.beneficiarios, (b) => b.personaId) },
  ];
  const out = new Map<string, ProcesoRepetido[]>();
  for (const { nombre, conteo } of porProceso) {
    for (const [personaId, cantidad] of conteo) {
      if (cantidad > 1) {
        const lista = out.get(personaId) ?? [];
        lista.push({ proceso: nombre, cantidad });
        out.set(personaId, lista);
      }
    }
  }
  return out;
}

/** Registros de Misión en proceso que sobran: Σ (n − 1) por persona. */
export function excedentesEnProceso(datos: DatosMinisterio): number {
  const enProceso = datos.conversiones.filter((c) => !esSalida(datos.pasos, c.estado));
  const porPersona = contar(enProceso, (c) => c.personaId);
  let total = 0;
  for (const n of porPersona.values()) if (n > 1) total += n - 1;
  return total;
}

/** Personas con al menos un registro de Misión en proceso. */
export function personasConProceso(datos: DatosMinisterio): number {
  const s = new Set<string>();
  for (const c of datos.conversiones) {
    if (!esSalida(datos.pasos, c.estado)) s.add(c.personaId);
  }
  return s.size;
}
