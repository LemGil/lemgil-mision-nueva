// El transporte remoto: el espejo. Una sola interfaz; dos implementaciones:
// memoria (para las pruebas entre «equipos») y Supabase (el proyecto propio).
// El espejo guarda filas con el contrato uniforme: no sabe nada del dominio.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Fila } from './db';

export interface TransporteRemoto {
  subir(tabla: string, filas: Fila[]): Promise<void>;
  bajar(tabla: string): Promise<Fila[]>;
  /** Borrado DEFINITIVO en el espejo: la fila deja de existir. */
  borrarFila(tabla: string, id: string): Promise<void>;
}

/** Convierte una fila local a la fila del espejo (contenido dentro de `datos`). */
export function aFilaEspejo(fila: Fila): Record<string, unknown> {
  const { id, version, actualizado, borrado, ...datos } = fila;
  return { id, version, actualizado, borrado: !!borrado, datos };
}

/** Y de vuelta: la fila del espejo a fila local. */
export function desdeFilaEspejo(espejo: Record<string, unknown>): Fila {
  const datos = (espejo.datos ?? {}) as Record<string, unknown>;
  return {
    ...datos,
    id: String(espejo.id),
    version: Number(espejo.version ?? 1),
    actualizado: String(espejo.actualizado ?? ''),
    borrado: !!espejo.borrado,
  };
}

/** Espejo en memoria: el «servidor» de las pruebas. */
export class TransporteMemoria implements TransporteRemoto {
  private tablas = new Map<string, Map<string, Record<string, unknown>>>();
  /** Para simular caídas: si está puesta, subir/bajar lanzan este error. */
  fallo: Error | null = null;

  private tienda(tabla: string) {
    let t = this.tablas.get(tabla);
    if (!t) {
      t = new Map();
      this.tablas.set(tabla, t);
    }
    return t;
  }

  async subir(tabla: string, filas: Fila[]): Promise<void> {
    if (this.fallo) throw this.fallo;
    const t = this.tienda(tabla);
    for (const f of filas) t.set(f.id, aFilaEspejo(f));
  }

  async bajar(tabla: string): Promise<Fila[]> {
    if (this.fallo) throw this.fallo;
    return [...this.tienda(tabla).values()].map(desdeFilaEspejo);
  }

  async borrarFila(tabla: string, id: string): Promise<void> {
    if (this.fallo) throw this.fallo;
    this.tienda(tabla).delete(id);
  }

  /** Lo que el espejo guarda de verdad (para verificar en pruebas). */
  crudo(tabla: string): Record<string, unknown>[] {
    return [...this.tienda(tabla).values()];
  }
}

/** El espejo real: el proyecto Supabase propio de esta app. */
export function crearTransporteSupabase(cliente: SupabaseClient): TransporteRemoto {
  return {
    async subir(tabla, filas) {
      if (filas.length === 0) return;
      const { error } = await cliente
        .from(tabla)
        .upsert(filas.map(aFilaEspejo), { onConflict: 'id' });
      if (error) throw new Error(error.message);
    },
    async bajar(tabla) {
      const { data, error } = await cliente.from(tabla).select('id, version, actualizado, borrado, datos');
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => desdeFilaEspejo(r as Record<string, unknown>));
    },
    async borrarFila(tabla, id) {
      const { error } = await cliente.from(tabla).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
  };
}
