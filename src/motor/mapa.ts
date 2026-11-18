// El mapa de chinchetas (plano §6.4): manuales — GPS o toque — porque la
// geocodificación automática de direcciones cubanas no es fiable.

import type { DatosMinisterio } from '../modelo/tipos';

export interface PuntoMapa {
  tipo: 'persona' | 'grupo';
  id: string;
  nombre: string;
  emoji: string;
  lat: number;
  lng: number;
}

export const CENTRO_DEFECTO: [number, number] = [23.1136, -82.3666]; // La Habana

export function puntosDelMapa(datos: DatosMinisterio): PuntoMapa[] {
  const puntos: PuntoMapa[] = [];
  for (const p of datos.personas) {
    if (p.lat != null && p.lng != null) {
      puntos.push({
        tipo: 'persona',
        id: p.id,
        nombre: `${p.nombre} ${p.apellidos ?? ''}`.trim(),
        emoji: '👤',
        lat: p.lat,
        lng: p.lng,
      });
    }
  }
  for (const g of datos.grupos) {
    if (g.lat != null && g.lng != null) {
      puntos.push({ tipo: 'grupo', id: g.id, nombre: g.nombre, emoji: '🏠', lat: g.lat, lng: g.lng });
    }
  }
  return puntos;
}

/** Fichas que aún no tienen chincheta (para ofrecer fijarlas). */
export function sinUbicacion(datos: DatosMinisterio): { tipo: 'persona' | 'grupo'; id: string; nombre: string }[] {
  const out: { tipo: 'persona' | 'grupo'; id: string; nombre: string }[] = [];
  for (const p of datos.personas) {
    if (p.lat == null || p.lng == null) {
      out.push({ tipo: 'persona', id: p.id, nombre: `${p.nombre} ${p.apellidos ?? ''}`.trim() });
    }
  }
  for (const g of datos.grupos) {
    if (g.lat == null || g.lng == null) out.push({ tipo: 'grupo', id: g.id, nombre: g.nombre });
  }
  return out;
}
