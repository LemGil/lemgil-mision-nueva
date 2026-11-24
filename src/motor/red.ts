// La Red de Colaboradores: apoyo EXTERNO al Ministerio (personas,
// iglesias, ministerios que ofrendan). Vive fuera de la ficha única:
// no son miembros ni cuentan en el censo; su mesa cuenta su registro
// propio y sus aportes, como en la app anterior.

import type { DatosMinisterio, Periodo } from '../modelo/tipos';

/** Los tipos de aporte de la Red, en la lista de LemGil (2026-11-24):
 * son los destinos que la casa maneja. La lista del selector NACE DEL
 * USO, como las Zonas y los tipos de Grupo: cualquier tipo que ya
 * exista en los aportes se suma al final, para que ningún aporte
 * viejo quede fuera del selector al editarlo. */
export const TIPOS_APORTE_RED = ['Diezmo', 'Ofrenda General', 'Manos Abiertas', 'Misión', 'Ofrenda'];

export function tiposAporteRed(datos: DatosMinisterio): string[] {
  const lista = [...TIPOS_APORTE_RED];
  const extras = new Set<string>();
  for (const a of datos.aportesRed) {
    const t = a.tipo?.trim();
    if (t && !lista.includes(t)) extras.add(t);
  }
  return [...lista, ...[...extras].sort((a, b) => a.localeCompare(b))];
}

export interface ResumenRed {
  activos: number;
  inactivos: number;
  /** Suma de aportes dentro del período (o de todos, sin período). */
  totalAportes: number;
  cantidadAportes: number;
  /** colaboradorId → total aportado en el período. */
  porColaborador: Map<string, number>;
  /** colaboradorId → cantidad de aportes en el período. */
  porColaboradorCantidad: Map<string, number>;
  /** tipo → total aportado en el período (el tablero por tipo). */
  porTipo: Map<string, number>;
}

export function resumenRed(datos: DatosMinisterio, periodo?: Periodo): ResumenRed {
  const enPeriodo = (f: string) => !periodo || (f >= periodo.desde && f <= periodo.hasta);
  const porColaborador = new Map<string, number>();
  const porColaboradorCantidad = new Map<string, number>();
  const porTipo = new Map<string, number>();
  let total = 0;
  let cantidad = 0;
  for (const a of datos.aportesRed) {
    if (!enPeriodo(a.fecha)) continue;
    total += a.monto;
    cantidad++;
    porColaborador.set(a.colaboradorId, (porColaborador.get(a.colaboradorId) ?? 0) + a.monto);
    porColaboradorCantidad.set(a.colaboradorId, (porColaboradorCantidad.get(a.colaboradorId) ?? 0) + 1);
    const t = a.tipo?.trim();
    if (t) porTipo.set(t, (porTipo.get(t) ?? 0) + a.monto);
  }
  return {
    activos: datos.colaboradores.filter((c) => c.estado === 'Activo').length,
    inactivos: datos.colaboradores.filter((c) => c.estado !== 'Activo').length,
    totalAportes: total,
    cantidadAportes: cantidad,
    porColaborador,
    porColaboradorCantidad,
    porTipo,
  };
}

export const nombreColaborador = (c: { nombre: string; apellido?: string }): string =>
  `${c.nombre} ${c.apellido ?? ''}`.trim();
