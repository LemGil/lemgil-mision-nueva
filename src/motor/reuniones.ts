// El parte de reunión: los conteos de cada reunión de un grupo.
// Estadística de la reunión — no toca el censo ni los procesos.

import type { Aporte, DatosMinisterio, Periodo, Reunion } from '../modelo/tipos';

const enPeriodo = (f: string, periodo?: Periodo) =>
  !periodo || (f >= periodo.desde && f <= periodo.hasta);

/** Los partes de un grupo, del más reciente al más viejo. */
export function partesDeGrupo(datos: DatosMinisterio, grupoId: string): Reunion[] {
  return datos.reuniones
    .filter((r) => r.grupoId === grupoId)
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export interface ResumenReuniones {
  partes: number;
  promedioPersonas: number;
  visitas: number;
  nuevos: number;
  profesiones: number;
  almuerzos: number;
  sopas: number;
  /** Los diezmos anotados en los partes: cuántos y su total. */
  diezmos: number;
  totalDiezmos: number;
}

/** El resumen del período: cómo van funcionando las reuniones. */
export function resumenReuniones(
  datos: DatosMinisterio,
  grupoId?: string,
  periodo?: Periodo,
): ResumenReuniones {
  const partes = datos.reuniones.filter(
    (r) => (!grupoId || r.grupoId === grupoId) && enPeriodo(r.fecha, periodo),
  );
  const suma = (f: (r: Reunion) => number) => partes.reduce((x, r) => x + f(r), 0);
  const ids = new Set(partes.map((p) => p.id));
  const diez = datos.aportes.filter((a) => a.reunionId && ids.has(a.reunionId) && a.personaId);
  return {
    partes: partes.length,
    promedioPersonas:
      partes.length === 0 ? 0 : Math.round((suma((r) => r.personas) / partes.length) * 10) / 10,
    visitas: suma((r) => r.visitas),
    nuevos: suma((r) => r.nuevosCongregados),
    profesiones: suma((r) => r.profesiones),
    almuerzos: suma((r) => r.almuerzos),
    sopas: suma((r) => r.sopas),
    diezmos: diez.length,
    totalDiezmos: diez.reduce((x, a) => x + a.monto, 0),
  };
}

/** El aviso de cuadre del parte: mujeres + hombres + niños debe dar
 * el total de personas. Avisa, nunca bloquea. */
export function avisoCuadreParte(p: {
  personas: number;
  mujeres: number;
  hombres: number;
  ninos: number;
}): string | null {
  const suma = p.mujeres + p.hombres + p.ninos;
  if (suma === p.personas) return null;
  return `El desglose suma ${suma} (mujeres + hombres + niños) y el total dice ${p.personas}: revísalo antes de guardar.`;
}

/** La ofrenda que un parte llevó a Bien Común, si la hubo (la
 * del grupo: los diezmos del parte también llevan reunionId). */
export function ofrendaDeParte(datos: DatosMinisterio, reunionId: string): Aporte | undefined {
  return datos.aportes.find((a) => a.reunionId === reunionId && a.grupoId);
}

/** Los diezmos que un parte llevó a Bien Común, a nombre de
 * cada persona. */
export function diezmosDeParte(datos: DatosMinisterio, reunionId: string): Aporte[] {
  return datos.aportes.filter((a) => a.reunionId === reunionId && a.personaId);
}
