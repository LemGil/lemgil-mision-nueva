// El censo: la única verdad de conteo de PERSONAS (plano §2.5 y §3).
// Cada persona cuenta una sola vez, en su etapa más avanzada.
// Prioridad al clasificar: Fallecido → Apartado → otra salida → miembro
// Trasladado → miembro Inactivo → miembro Activo → gozne → paso más avanzado.

import {
  PS_APARTADO,
  PS_CONFESO,
  PS_CONVERSO,
  PS_FALLECIDO,
  pasoPorId,
  pasosDeMision,
} from '../modelo/catalogo';
import type { Conversion, DatosMinisterio, Miembro, Periodo } from '../modelo/tipos';

export type ClasePersona =
  | 'fallecido'
  | 'apartado'
  | 'salida'
  | 'trasladado'
  | 'inactivo'
  | 'miembro'
  | 'gozne'
  | 'etapa'
  | 'fuera';

export interface Clasificacion {
  clase: ClasePersona;
  pasoId?: string; // solo cuando clase === 'etapa'
}

function conversionesDe(datos: DatosMinisterio, personaId: string): Conversion[] {
  return datos.conversiones.filter((c) => c.personaId === personaId);
}

function miembrosDe(datos: DatosMinisterio, personaId: string): Miembro[] {
  return datos.miembros.filter((m) => m.personaId === personaId);
}

export function clasificarPersona(
  datos: DatosMinisterio,
  personaId: string,
): Clasificacion {
  const convs = conversionesDe(datos, personaId);
  const miems = miembrosDe(datos, personaId);
  const rolDe = (id: string) => pasoPorId(datos.pasos, id)?.rol;

  if (
    convs.some((c) => c.estado === PS_FALLECIDO) ||
    miems.some((m) => m.estado === 'Fallecido')
  ) {
    return { clase: 'fallecido' };
  }
  if (convs.some((c) => c.estado === PS_APARTADO)) return { clase: 'apartado' };
  if (convs.some((c) => rolDe(c.estado) === 'salida')) return { clase: 'salida' };
  if (miems.some((m) => m.estado === 'Trasladado')) return { clase: 'trasladado' };
  if (miems.some((m) => m.estado === 'Inactivo')) return { clase: 'inactivo' };
  if (miems.some((m) => m.estado === 'Activo')) return { clase: 'miembro' };
  if (convs.some((c) => rolDe(c.estado) === 'gozne')) return { clase: 'gozne' };

  // El paso en camino más avanzado según el orden del catálogo.
  let mejor: { pasoId: string; orden: number } | null = null;
  for (const c of convs) {
    const paso = pasoPorId(datos.pasos, c.estado);
    if (paso && (paso.rol === 'inicio' || paso.rol === 'camino')) {
      if (!mejor || paso.orden > mejor.orden) mejor = { pasoId: paso.id, orden: paso.orden };
    }
  }
  if (mejor) return { clase: 'etapa', pasoId: mejor.pasoId };
  return { clase: 'fuera' };
}

export interface EtapaCenso {
  pasoId: string;
  nombre: string;
  emoji: string;
  cantidad: number;
}

export interface Censo {
  /** enProceso (personas) + miembros. La foto de la congregación. */
  total: number;
  /** Personas en proceso, por paso de la ruta (inicio + camino). */
  etapas: EtapaCenso[];
  enProceso: number;
  /** Miembros Activos + los del gozne aún sin ficha activa: cuentan como miembros. */
  miembros: number;
  demografico: {
    hombres: number;
    mujeres: number;
    sinDatoSexo: number;
    ninos: number; // 0–11
    jovenes: number; // 12–29
    adultos: number; // 30–59
    ancianos: number; // 60+
    sinEdad: number;
  };
  /** Corte transversal sobre la congregación: NO es un peldaño de la ruta. */
  diezmadores: number;
  bajas: { apartados: number; traslados: number; fallecidos: number; otrasSalidas: number };
  /** Fuera del total: miembros Inactivos (aunque tengan proceso activo). */
  inactivos: number;
  periodo?: {
    confesiones: number;
    conversiones: number;
    bajas: number;
  };
}

function edadEn(fechaNacimiento: string | undefined, hoy: string): number | null {
  if (!fechaNacimiento) return null;
  const n = new Date(fechaNacimiento + 'T12:00:00');
  const h = new Date(hoy + 'T12:00:00');
  if (isNaN(n.getTime()) || isNaN(h.getTime())) return null;
  let e = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
  return e < 0 ? null : e;
}

function enPeriodo(fecha: string, periodo: Periodo): boolean {
  return fecha >= periodo.desde && fecha <= periodo.hasta;
}

/** Entradas de una conversión a un paso dentro del período (del historial;
 * sin historial, la fecha de registro si hoy está en ese paso). */
export function entradasAlPaso(c: Conversion, pasoId: string, periodo: Periodo): number {
  const del = (c.historial ?? []).filter(
    (h) => h.estado === pasoId && enPeriodo(h.fecha, periodo),
  ).length;
  if (del > 0) return del;
  if (c.estado === pasoId && !(c.historial?.length) && enPeriodo(c.fecha, periodo)) return 1;
  return 0;
}

export function calcularCenso(
  datos: DatosMinisterio,
  opts?: { periodo?: Periodo; hoy?: string },
): Censo {
  const hoy = opts?.hoy ?? new Date().toISOString().slice(0, 10);
  const ruta = pasosDeMision(datos.pasos).filter(
    (p) => p.rol === 'inicio' || p.rol === 'camino',
  );
  const porPaso = new Map<string, number>(ruta.map((p) => [p.id, 0]));
  const diezmadoresActivos = new Set(
    datos.diezmadores.filter((d) => d.activo).map((d) => d.personaId),
  );

  let miembros = 0;
  let inactivos = 0;
  const bajas = { apartados: 0, traslados: 0, fallecidos: 0, otrasSalidas: 0 };
  const demografico = {
    hombres: 0, mujeres: 0, sinDatoSexo: 0,
    ninos: 0, jovenes: 0, adultos: 0, ancianos: 0, sinEdad: 0,
  };
  let diezmadores = 0;

  for (const persona of datos.personas) {
    const { clase, pasoId } = clasificarPersona(datos, persona.id);
    if (clase === 'etapa' && pasoId) porPaso.set(pasoId, (porPaso.get(pasoId) ?? 0) + 1);
    else if (clase === 'miembro' || clase === 'gozne') miembros++;
    else if (clase === 'inactivo') inactivos++;
    else if (clase === 'apartado') bajas.apartados++;
    else if (clase === 'trasladado') bajas.traslados++;
    else if (clase === 'fallecido') bajas.fallecidos++;
    else if (clase === 'salida') bajas.otrasSalidas++;

    const enLaCongregacion = clase === 'etapa' || clase === 'miembro' || clase === 'gozne';
    if (enLaCongregacion) {
      if (persona.sexo === 'M') demografico.hombres++;
      else if (persona.sexo === 'F') demografico.mujeres++;
      else demografico.sinDatoSexo++;
      const edad = edadEn(persona.fechaNacimiento, hoy);
      if (edad === null) demografico.sinEdad++;
      else if (edad <= 11) demografico.ninos++;
      else if (edad <= 29) demografico.jovenes++;
      else if (edad <= 59) demografico.adultos++;
      else demografico.ancianos++;
      if (diezmadoresActivos.has(persona.id)) diezmadores++;
    }
  }

  const etapas: EtapaCenso[] = ruta.map((p) => ({
    pasoId: p.id,
    nombre: p.nombre,
    emoji: p.emoji,
    cantidad: porPaso.get(p.id) ?? 0,
  }));
  const enProceso = etapas.reduce((s, e) => s + e.cantidad, 0);

  let periodo: Censo['periodo'];
  if (opts?.periodo) {
    const per = opts.periodo;
    let confesiones = 0;
    let conversiones = 0;
    let bajasPer = 0;
    for (const c of datos.conversiones) {
      confesiones += entradasAlPaso(c, PS_CONFESO, per);
      conversiones += entradasAlPaso(c, PS_CONVERSO, per);
      for (const h of c.historial ?? []) {
        if (pasoPorId(datos.pasos, h.estado)?.rol === 'salida' && enPeriodo(h.fecha, per)) {
          bajasPer++;
        }
      }
    }
    periodo = { confesiones, conversiones, bajas: bajasPer };
  }

  return {
    total: enProceso + miembros,
    etapas,
    enProceso,
    miembros,
    demografico,
    diezmadores,
    bajas,
    inactivos,
    periodo,
  };
}
