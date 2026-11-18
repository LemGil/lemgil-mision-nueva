// La Red de Colaboradores: apoyo EXTERNO al Ministerio (personas,
// iglesias, ministerios que ofrendan). Vive fuera de la ficha única:
// no son miembros ni cuentan en el censo; su mesa cuenta su registro
// propio y sus aportes, como en la app anterior.

import type { DatosMinisterio, Periodo } from '../modelo/tipos';

export interface ResumenRed {
  activos: number;
  inactivos: number;
  /** Suma de aportes dentro del período (o de todos, sin período). */
  totalAportes: number;
  cantidadAportes: number;
  /** colaboradorId → total aportado en el período. */
  porColaborador: Map<string, number>;
}

export function resumenRed(datos: DatosMinisterio, periodo?: Periodo): ResumenRed {
  const enPeriodo = (f: string) => !periodo || (f >= periodo.desde && f <= periodo.hasta);
  const porColaborador = new Map<string, number>();
  let total = 0;
  let cantidad = 0;
  for (const a of datos.aportesRed) {
    if (!enPeriodo(a.fecha)) continue;
    total += a.monto;
    cantidad++;
    porColaborador.set(a.colaboradorId, (porColaborador.get(a.colaboradorId) ?? 0) + a.monto);
  }
  return {
    activos: datos.colaboradores.filter((c) => c.estado === 'Activo').length,
    inactivos: datos.colaboradores.filter((c) => c.estado !== 'Activo').length,
    totalAportes: total,
    cantidadAportes: cantidad,
    porColaborador,
  };
}

export const nombreColaborador = (c: { nombre: string; apellido?: string }): string =>
  `${c.nombre} ${c.apellido ?? ''}`.trim();
