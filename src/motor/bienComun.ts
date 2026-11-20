// Bien Común: los diezmadores y sus aportes (plano §2.2).
// Su fecha-evento es la fecha del aporte; el alta, la del registro.

import type { DatosMinisterio, Periodo } from '../modelo/tipos';

export interface ResumenBienComun {
  diezmadoresActivos: number;
  diezmadoresInactivos: number;
  /** Suma de aportes dentro del período (o de todos, sin período). */
  totalAportes: number;
  cantidadAportes: number;
  /** personaId → total aportado en el período. */
  porPersona: Map<string, number>;
  /** personaId → cantidad de aportes en el período. */
  porPersonaCantidad: Map<string, number>;
}

export function resumenBienComun(datos: DatosMinisterio, periodo?: Periodo): ResumenBienComun {
  const enPeriodo = (f: string) => !periodo || (f >= periodo.desde && f <= periodo.hasta);
  const porPersona = new Map<string, number>();
  const porPersonaCantidad = new Map<string, number>();
  let total = 0;
  let cantidad = 0;
  for (const a of datos.aportes) {
    if (!enPeriodo(a.fecha)) continue;
    total += a.monto;
    cantidad++;
    porPersona.set(a.personaId, (porPersona.get(a.personaId) ?? 0) + a.monto);
    porPersonaCantidad.set(a.personaId, (porPersonaCantidad.get(a.personaId) ?? 0) + 1);
  }
  return {
    diezmadoresActivos: datos.diezmadores.filter((d) => d.activo).length,
    diezmadoresInactivos: datos.diezmadores.filter((d) => !d.activo).length,
    totalAportes: total,
    cantidadAportes: cantidad,
    porPersona,
    porPersonaCantidad,
  };
}
