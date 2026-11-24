// El mapa de chinchetas (plano §6.4): manuales — GPS o toque — porque la
// geocodificación automática de direcciones cubanas no es fiable.
//
// El mapa sigue la regla de todas las listas (motor/vistas): por defecto
// solo se ven los ACTIVOS; las bajas (apartados, trasladados, fallecidos)
// salen únicamente cuando se filtran con «Ver». Los grupos no tienen
// estado en el modelo, así que sus chinchetas se ven siempre.

import type { DatosMinisterio } from '../modelo/tipos';
import { clasificarPersona } from './censo';
import { visibleSegunVer, type VerPersonas } from './vistas';
import { iconoGrupo } from './gruposVista';

export interface PuntoMapa {
  tipo: 'persona' | 'grupo';
  id: string;
  nombre: string;
  emoji: string;
  lat: number;
  lng: number;
}

export const CENTRO_DEFECTO: [number, number] = [23.1136, -82.3666]; // La Habana

/** ¿La persona se ve en el mapa con el filtro «Ver» elegido? */
const personaVisible = (datos: DatosMinisterio, personaId: string, ver: VerPersonas): boolean =>
  visibleSegunVer(clasificarPersona(datos, personaId).clase, ver);

export function puntosDelMapa(datos: DatosMinisterio, ver: VerPersonas = 'todos'): PuntoMapa[] {
  const puntos: PuntoMapa[] = [];
  for (const p of datos.personas) {
    if (p.lat != null && p.lng != null && personaVisible(datos, p.id, ver)) {
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
      puntos.push({ tipo: 'grupo', id: g.id, nombre: g.nombre, emoji: iconoGrupo(g), lat: g.lat, lng: g.lng });
    }
  }
  return puntos;
}

/** Fichas que aún no tienen chincheta (para ofrecer fijarlas). */
export function sinUbicacion(
  datos: DatosMinisterio,
  ver: VerPersonas = 'todos',
): { tipo: 'persona' | 'grupo'; id: string; nombre: string }[] {
  const out: { tipo: 'persona' | 'grupo'; id: string; nombre: string }[] = [];
  for (const p of datos.personas) {
    if ((p.lat == null || p.lng == null) && personaVisible(datos, p.id, ver)) {
      out.push({ tipo: 'persona', id: p.id, nombre: `${p.nombre} ${p.apellidos ?? ''}`.trim() });
    }
  }
  for (const g of datos.grupos) {
    if (g.lat == null || g.lng == null) out.push({ tipo: 'grupo', id: g.id, nombre: g.nombre });
  }
  return out;
}
