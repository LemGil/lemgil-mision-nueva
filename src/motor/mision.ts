// La mesa de Misión cuenta REGISTROS (plano §3): su número cuadra fila a fila
// con su lista. Con período, cada tarjeta cuenta las ENTRADAS a su paso en el
// período (del historial); sin período, la foto actual.

import { esSalida, pasosDeMision } from '../modelo/catalogo';
import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import { entradasAlPaso } from './censo';

export interface TarjetaPaso {
  pasoId: string;
  nombre: string;
  emoji: string;
  /** Registros hoy en el paso. */
  foto: number;
  /** Entradas al paso en el período (solo si hay período). */
  periodo?: number;
}

export interface ConteoMision {
  /** Registros en la ruta (fuera de salidas): la tarjeta «En proceso». */
  enProceso: number;
  /** Con período: los que entraron a la ruta en el período y siguen en ella. */
  enProcesoPeriodo?: number;
  pasos: TarjetaPaso[]; // inicio + camino + gozne, en orden de ruta
  salidas: TarjetaPaso[];
  totalRegistros: number;
}

export function conteoMision(datos: DatosMinisterio, periodo?: Periodo): ConteoMision {
  const ruta = pasosDeMision(datos.pasos);
  const tarjetas = new Map<string, TarjetaPaso>();
  for (const p of ruta) {
    tarjetas.set(p.id, {
      pasoId: p.id,
      nombre: p.nombre,
      emoji: p.emoji,
      foto: 0,
      periodo: periodo ? 0 : undefined,
    });
  }
  const pasoInicio = ruta.find((p) => p.rol === 'inicio');

  let enProceso = 0;
  let enProcesoPeriodo = 0;
  for (const c of datos.conversiones) {
    const t = tarjetas.get(c.estado);
    if (t) t.foto++;
    if (periodo) {
      for (const p of ruta) {
        const n = entradasAlPaso(c, p.id, periodo);
        const tp = tarjetas.get(p.id);
        if (tp && n > 0) tp.periodo = (tp.periodo ?? 0) + n;
      }
    }
    if (!esSalida(datos.pasos, c.estado)) {
      enProceso++;
      if (periodo && pasoInicio && entradasAlPaso(c, pasoInicio.id, periodo) > 0) {
        enProcesoPeriodo++;
      }
    }
  }

  const deRol = (rol: string) =>
    ruta.filter((p) => p.rol === rol).map((p) => tarjetas.get(p.id)!);

  return {
    enProceso,
    enProcesoPeriodo: periodo ? enProcesoPeriodo : undefined,
    pasos: [...deRol('inicio'), ...deRol('camino'), ...deRol('gozne')],
    salidas: deRol('salida'),
    totalRegistros: datos.conversiones.length,
  };
}

/** El paso siguiente en la ruta (inicio → camino → gozne). Las salidas no
 * son «siguiente» de nadie: a ellas se llega por decisión, no por avance. */
export function siguientePasoEnRuta(datos: DatosMinisterio, pasoId: string): string | null {
  const ruta = pasosDeMision(datos.pasos).filter((p) => p.rol !== 'salida');
  const i = ruta.findIndex((p) => p.id === pasoId);
  if (i < 0 || i === ruta.length - 1) return null;
  return ruta[i + 1].id;
}

/** El estado que manda en un historial: el de la entrada más reciente
 * (a igual fecha, la última escrita). Al editar el historial — corregir
 * una fecha, quitar una entrada, agregar la que faltaba — el estado del
 * registro se recalcula desde aquí. */
export function estadoDesdeHistorial(
  historial: { fecha: string; estado: string }[],
): string | null {
  if (historial.length === 0) return null;
  const ordenado = historial
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  return ordenado[ordenado.length - 1].estado;
}

/** El historial ordenado por fecha (estable: a igual fecha manda el orden escrito). */
export function historialOrdenado<T extends { fecha: string }>(historial: T[]): T[] {
  return historial
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}
