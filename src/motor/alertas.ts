// Las alertas del Panel (plano §6.1): casos nombrados, no solo conteos.
// La de estancados vigila el inicio del camino (Alcanzado) y Confeso — quien
// hizo la oración de fe y está por verse si permanece —, que es donde la
// gente se pierde sin hacer ruido.

import { PS_CONFESO, pasoPorId } from '../modelo/catalogo';
import type { DatosMinisterio } from '../modelo/tipos';

export const UMBRAL_DIAS_ESTANCADO = 30;

function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + 'T12:00:00').getTime();
  const b = new Date(hasta + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

/** Cuándo entró la conversión a su paso actual (del historial; si no hay, el registro). */
export function fechaEnPasoActual(estado: string, historial: { fecha: string; estado: string }[], fechaRegistro: string): string {
  let mejor: string | null = null;
  for (const h of historial ?? []) {
    if (h.estado === estado && (!mejor || h.fecha > mejor)) mejor = h.fecha;
  }
  return mejor ?? fechaRegistro;
}

export interface Estancado {
  personaId: string;
  nombre: string;
  pasoNombre: string;
  pasoEmoji: string;
  dias: number;
}

export function estancados(
  datos: DatosMinisterio,
  hoy: string,
  umbralDias: number = UMBRAL_DIAS_ESTANCADO,
): Estancado[] {
  const nombreDe = new Map(datos.personas.map((p) => [p.id, p.nombre]));
  const out: Estancado[] = [];
  for (const c of datos.conversiones) {
    const paso = pasoPorId(datos.pasos, c.estado);
    if (!paso) continue;
    const vigilado = paso.rol === 'inicio' || c.estado === PS_CONFESO;
    if (!vigilado) continue;
    const dias = diasEntre(fechaEnPasoActual(c.estado, c.historial, c.fecha), hoy);
    if (dias >= umbralDias) {
      out.push({
        personaId: c.personaId,
        nombre: nombreDe.get(c.personaId) ?? '(sin ficha)',
        pasoNombre: paso.nombre,
        pasoEmoji: paso.emoji,
        dias,
      });
    }
  }
  return out.sort((a, b) => b.dias - a.dias);
}

export interface CumpleProximo {
  personaId: string;
  nombre: string;
  /** Día y mes del cumpleaños (DD/MM). */
  diaMes: string;
  dias: number; // 0 = hoy
  edadQueCumple: number | null;
}

export function cumpleanosProximos(
  datos: DatosMinisterio,
  hoy: string,
  ventanaDias: number = 30,
): CumpleProximo[] {
  const h = new Date(hoy + 'T12:00:00');
  const out: CumpleProximo[] = [];
  for (const p of datos.personas) {
    if (!p.fechaNacimiento) continue;
    const n = new Date(p.fechaNacimiento + 'T12:00:00');
    if (isNaN(n.getTime())) continue;
    let proximo = new Date(h.getFullYear(), n.getMonth(), n.getDate());
    if (proximo.getTime() < new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime()) {
      proximo = new Date(h.getFullYear() + 1, n.getMonth(), n.getDate());
    }
    const dias = Math.round((proximo.getTime() - new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime()) / 86400000);
    if (dias <= ventanaDias) {
      out.push({
        personaId: p.id,
        nombre: p.nombre,
        diaMes: `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}`,
        dias,
        edadQueCumple: proximo.getFullYear() - n.getFullYear(),
      });
    }
  }
  return out.sort((a, b) => a.dias - b.dias);
}
