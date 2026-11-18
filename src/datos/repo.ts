// El repositorio: la ÚNICA puerta de escritura a la base local.
// Las pantallas nunca tocan la base directamente: todo pasa por aquí, y todo
// lo que se escribe queda encolado para sincronizar. Borrar es lógico
// (borrado = true): el registro mismo es su tumba, viaja como un cambio más
// y ningún equipo puede resucitarlo por no haber recibido un «delete» suelto.

import type { BaseLocal, Fila, Tabla } from './db';

const ahora = () => new Date().toISOString();

export class Repo {
  constructor(private db: BaseLocal) {}

  /** Crea o actualiza un registro del dominio (sin sobre) y lo encola. */
  async guardar<T extends { id: string }>(tabla: Tabla, entidad: T): Promise<Fila> {
    const t = this.db.tabla(tabla);
    const previo = await t.get(entidad.id);
    const fila: Fila = {
      ...(entidad as Record<string, unknown>),
      id: entidad.id,
      version: (previo?.version ?? 0) + 1,
      actualizado: ahora(),
      borrado: false,
    };
    await t.put(fila);
    await this.encolar(tabla, entidad.id);
    return fila;
  }

  /** Borrado lógico: marca, sube la versión y encola. Nunca desaparece. */
  async borrar(tabla: Tabla, id: string): Promise<void> {
    const t = this.db.tabla(tabla);
    const previo = await t.get(id);
    if (!previo) return;
    await t.put({ ...previo, version: previo.version + 1, actualizado: ahora(), borrado: true });
    await this.encolar(tabla, id);
  }

  /** Los registros vivos (sin borrados), sin el sobre de sync. */
  async listar<T>(tabla: Tabla): Promise<T[]> {
    const filas = await this.todosConSobre(tabla);
    return filas
      .filter((f) => !f.borrado)
      .map((f) => sinSobre(f) as T);
  }

  async todosConSobre(tabla: Tabla): Promise<Fila[]> {
    return this.db.tabla(tabla).toArray();
  }

  async obtenerConSobre(tabla: Tabla, id: string): Promise<Fila | undefined> {
    return this.db.tabla(tabla).get(id);
  }

  /** Aplica una fila que viene del espejo, tal cual (con su sobre). */
  async aplicarRemota(tabla: Tabla, fila: Fila): Promise<void> {
    await this.db.tabla(tabla).put(fila);
  }

  /** Borrado físico local (solo lo usa la reconciliación, con sus guardas). */
  async eliminarLocal(tabla: Tabla, id: string): Promise<void> {
    await this.db.tabla(tabla).delete(id);
  }

  private async encolar(tabla: Tabla, id: string): Promise<void> {
    await this.db.salida.put({ clave: `${tabla}:${id}`, tabla, id, encolado: ahora() });
  }

  async pendientes(): Promise<{ tabla: Tabla; id: string }[]> {
    const filas = await this.db.salida.toArray();
    return filas.map((f) => ({ tabla: f.tabla, id: f.id }));
  }

  async tienePendiente(tabla: Tabla, id: string): Promise<boolean> {
    return (await this.db.salida.get(`${tabla}:${id}`)) !== undefined;
  }

  async desencolar(tabla: Tabla, id: string): Promise<void> {
    await this.db.salida.delete(`${tabla}:${id}`);
  }

  async contarPendientes(): Promise<number> {
    return this.db.salida.count();
  }

  async metaGet<T>(clave: string): Promise<T | undefined> {
    const fila = await this.db.meta.get(clave);
    return fila?.valor as T | undefined;
  }

  async metaSet(clave: string, valor: unknown): Promise<void> {
    await this.db.meta.put({ clave, valor });
  }
}

/** Quita el sobre de sync: lo que el motor de conteo y las pantallas ven. */
export function sinSobre(fila: Fila): Record<string, unknown> {
  const { version: _v, actualizado: _a, borrado: _b, ...resto } = fila;
  return resto;
}
