// El motor de sincronización: local primero, el espejo después.
// Un ciclo = empujar la cola → bajar el espejo → reafirmar absorbidas.
// Sin escalera adaptativa: el contrato es uno solo y un error se nombra
// («tabla: mensaje») y QUEDA en el estado hasta que un ciclo limpio lo
// borre — probar la conexión jamás limpia un error (lección de 2026).

import { TABLAS, type Fila, type Tabla } from './db';
import type { Repo } from './repo';
import type { TransporteRemoto } from './transporte';

export interface EstadoSync {
  conectado: boolean;
  pendientes: number;
  /** Vacío solo si el último ciclo cerró limpio. */
  error: string;
  ultimoCiclo?: string;
}

const CLAVE_ABSORBIDAS = 'personas-absorbidas';
const fotoClave = (tabla: Tabla) => `foto-remota:${tabla}`;

export class Sincronizador {
  private estado: EstadoSync = { conectado: false, pendientes: 0, error: '' };
  private enCurso: Promise<void> | null = null;

  constructor(
    private repo: Repo,
    private transporte: TransporteRemoto,
    private alCambiar?: (e: EstadoSync) => void,
  ) {}

  get estadoActual(): EstadoSync {
    return this.estado;
  }

  private emitir(parche: Partial<EstadoSync>): void {
    this.estado = { ...this.estado, ...parche };
    this.alCambiar?.(this.estado);
  }

  /** Un ciclo completo. Si ya hay uno en curso, devuelve el mismo. */
  ciclo(): Promise<void> {
    if (!this.enCurso) {
      this.enCurso = this.ejecutarCiclo().finally(() => {
        this.enCurso = null;
      });
    }
    return this.enCurso;
  }

  private async ejecutarCiclo(): Promise<void> {
    try {
      await this.empujar();
      await this.bajarTodo();
      await this.reafirmarAbsorbidas();
      this.emitir({
        conectado: true,
        error: '',
        pendientes: await this.repo.contarPendientes(),
        ultimoCiclo: new Date().toISOString(),
      });
    } catch (e) {
      // El error queda dicho y el indicador en rojo hasta un ciclo limpio.
      this.emitir({
        conectado: false,
        error: e instanceof Error ? e.message : String(e),
        pendientes: await this.repo.contarPendientes(),
      });
    }
  }

  /** Probar la conexión NO toca el error guardado: solo dice si hay red. */
  async probarConexion(): Promise<boolean> {
    try {
      await this.transporte.bajar('personas');
      this.emitir({ conectado: true });
      return true;
    } catch {
      this.emitir({ conectado: false });
      return false;
    }
  }

  /** Borrado DEFINITIVO de una fila: sale del espejo y de la base
   * local, y de la cola si estaba pendiente de subir. Primero el
   * espejo: si no hay conexión o sesión, nada local se toca y el
   * error dice por qué. Sin vuelta atrás. */
  async borrarDefinitivo(tabla: Tabla, id: string): Promise<void> {
    await this.transporte.borrarFila(tabla, id);
    await this.repo.desencolar(tabla, id);
    await this.repo.eliminarLocal(tabla, id);
  }

  private async empujar(): Promise<void> {
    const pendientes = await this.repo.pendientes();
    const porTabla = new Map<Tabla, string[]>();
    for (const p of pendientes) {
      const lista = porTabla.get(p.tabla) ?? [];
      lista.push(p.id);
      porTabla.set(p.tabla, lista);
    }
    for (const [tabla, ids] of porTabla) {
      const filas: Fila[] = [];
      for (const id of ids) {
        const fila = await this.repo.obtenerConSobre(tabla, id);
        if (fila) filas.push(fila);
        else await this.repo.desencolar(tabla, id); // ya no existe: nada que subir
      }
      if (filas.length === 0) continue;
      try {
        await this.transporte.subir(tabla, filas);
      } catch (e) {
        throw new Error(`${tabla}: ${e instanceof Error ? e.message : String(e)}`);
      }
      for (const id of ids) await this.repo.desencolar(tabla, id);
    }
  }

  private async bajarTodo(): Promise<void> {
    const absorbidas = await this.absorbidas();
    for (const tabla of TABLAS) {
      let remotas: Fila[];
      try {
        remotas = await this.transporte.bajar(tabla);
      } catch (e) {
        throw new Error(`${tabla}: ${e instanceof Error ? e.message : String(e)}`);
      }
      for (const remota of remotas) {
        if (tabla === 'personas' && absorbidas.has(remota.id)) continue; // no resucita
        if (await this.repo.tienePendiente(tabla, remota.id)) continue; // lo local sin subir manda
        const local = await this.repo.obtenerConSobre(tabla, remota.id);
        if (
          !local ||
          remota.version > local.version ||
          (remota.version === local.version && remota.borrado && !local.borrado)
        ) {
          await this.repo.aplicarRemota(tabla, remota);
        }
      }
      await this.reconciliar(tabla, remotas);
    }
  }

  /**
   * Reconciliación con foto: un registro local se borra de verdad solo si
   * estaba en la foto remota anterior, ya no está en el espejo y no tiene
   * nada pendiente de subir. Un espejo vacío no informa: no se toca nada.
   */
  private async reconciliar(tabla: Tabla, remotas: Fila[]): Promise<void> {
    if (remotas.length === 0) return;
    const fotoAntes = new Set((await this.repo.metaGet<string[]>(fotoClave(tabla))) ?? []);
    const idsAhora = new Set(remotas.map((r) => r.id));
    if (fotoAntes.size > 0) {
      const absorbidas = tabla === 'personas' ? await this.absorbidas() : new Set<string>();
      for (const local of await this.repo.todosConSobre(tabla)) {
        if (idsAhora.has(local.id)) continue;
        if (!fotoAntes.has(local.id)) continue;
        if (await this.repo.tienePendiente(tabla, local.id)) continue;
        if (absorbidas.has(local.id)) continue;
        await this.repo.eliminarLocal(tabla, local.id);
      }
    }
    await this.repo.metaSet(fotoClave(tabla), [...idsAhora]);
  }

  // — Unir personas: la absorbida no resucita en ningún equipo, nunca. —

  async registrarAbsorbida(personaId: string): Promise<void> {
    const s = await this.absorbidas();
    s.add(personaId);
    await this.repo.metaSet(CLAVE_ABSORBIDAS, [...s]);
  }

  private async absorbidas(): Promise<Set<string>> {
    return new Set((await this.repo.metaGet<string[]>(CLAVE_ABSORBIDAS)) ?? []);
  }

  /** Si un equipo viejo volvió a subir a la absorbida, se re-marca borrada. */
  private async reafirmarAbsorbidas(): Promise<void> {
    const s = await this.absorbidas();
    if (s.size === 0) return;
    const remotas = await this.transporte.bajar('personas');
    const vivas = remotas.filter((r) => s.has(r.id) && !r.borrado);
    if (vivas.length === 0) return;
    await this.transporte.subir(
      'personas',
      vivas.map((r) => ({ ...r, version: r.version + 1, borrado: true })),
    );
  }
}
