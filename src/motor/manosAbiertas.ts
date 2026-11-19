// Manos Abiertas: beneficiarios, campañas y entregas. Una campaña
// (Desayuno con Jesús, Sopa con Jesús…) organiza las entregas; cada
// entrega deja constancia de qué se dio, cuánto y a quién.

import type { DatosMinisterio, Entrega } from '../modelo/tipos';

export interface ResumenCampana {
  campanaId: string;
  entregas: number;
  /** Suma de las cantidades entregadas (en sus unidades mezcladas). */
  totalCantidad: number;
  ultimaFecha: string;
}

export interface ResumenManos {
  campanasEnCurso: number;
  campanasTotal: number;
  entregasTotal: number;
  porCampana: Map<string, ResumenCampana>;
}

export function resumenManos(datos: DatosMinisterio): ResumenManos {
  const porCampana = new Map<string, ResumenCampana>();
  for (const e of datos.entregas) {
    const r = porCampana.get(e.campanaId) ?? {
      campanaId: e.campanaId,
      entregas: 0,
      totalCantidad: 0,
      ultimaFecha: '',
    };
    r.entregas++;
    r.totalCantidad += e.cantidad ?? 0;
    if (e.fecha > r.ultimaFecha) r.ultimaFecha = e.fecha;
    porCampana.set(e.campanaId, r);
  }
  return {
    campanasEnCurso: datos.campanas.filter((c) => c.estado === 'En curso').length,
    campanasTotal: datos.campanas.length,
    entregasTotal: datos.entregas.length,
    porCampana,
  };
}

/** El nombre visible de una entrega: el escrito a mano, o el del
 * beneficiario registrado, o un genérico. */
export function nombreDeEntrega(
  e: Entrega,
  nombreBeneficiario: (beneficiarioId: string) => string | undefined,
): string {
  if (e.beneficiarioNombre?.trim()) return e.beneficiarioNombre.trim();
  if (e.beneficiarioId) return nombreBeneficiario(e.beneficiarioId) ?? 'Beneficiario';
  return 'Sin nombre';
}
