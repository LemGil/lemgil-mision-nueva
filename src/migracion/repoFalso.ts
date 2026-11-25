// Un Repo en memoria para las pruebas de las herramientas de
// migración: guarda las filas con su sobre (borrado incluido),
// igual que el Repo de verdad.
import type { Repo } from '../datos/repo';
import type { Tabla } from '../datos/db';

type FilaFalsa = Record<string, unknown> & { id: string; borrado: boolean };

export class RepoFalso {
  private tablas = new Map<string, Map<string, FilaFalsa>>();

  private tabla(nombre: Tabla): Map<string, FilaFalsa> {
    let t = this.tablas.get(nombre);
    if (!t) {
      t = new Map();
      this.tablas.set(nombre, t);
    }
    return t;
  }

  async guardar(tabla: Tabla, entidad: { id: string }): Promise<void> {
    this.tabla(tabla).set(entidad.id, { ...entidad, borrado: false });
  }

  async borrar(tabla: Tabla, id: string): Promise<void> {
    const f = this.tabla(tabla).get(id);
    if (f) this.tabla(tabla).set(id, { ...f, borrado: true });
  }

  async eliminarLocal(tabla: Tabla, id: string): Promise<void> {
    this.tabla(tabla).delete(id);
  }

  async listar<T>(tabla: Tabla): Promise<T[]> {
    return this.vivos<T>(tabla);
  }

  async todosConSobre(tabla: Tabla): Promise<FilaFalsa[]> {
    return [...this.tabla(tabla).values()];
  }

  async obtenerConSobre(tabla: Tabla, id: string): Promise<FilaFalsa | undefined> {
    return this.tabla(tabla).get(id);
  }

  /** Siembra una fila tal cual (para simular tumbas). */
  sembrar(tabla: Tabla, fila: FilaFalsa): void {
    this.tabla(tabla).set(fila.id, fila);
  }

  vivos<T>(tabla: Tabla): T[] {
    return [...this.tabla(tabla).values()]
      .filter((f) => !f.borrado)
      .map((f) => {
        const { borrado, ...resto } = f;
        return resto as T;
      });
  }

  comoRepo(): Repo {
    return this as unknown as Repo;
  }
}
