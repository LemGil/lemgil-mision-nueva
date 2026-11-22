// El Informe de Misión con el formato de LemGil (2026-11-21):
// primero LO PRINCIPAL en cinco números y luego LO AMPLIADO,
// persona por persona. La Misión es hacer discípulos según
// Mateo 28 — alcanzar, enseñar, bautizar, integrar —, así que
// el informe se enfoca en las PERSONAS, no en los movimientos:
// cada número cuenta personas únicas (nadie cuenta dos veces,
// aunque tenga un registro repetido) y las Bajas suman todas
// las salidas: apartado, traslado y fallecido. Los movimientos
// quedan donde pertenecen: como guía dentro de la historia de
// cada persona.

import type { Conversion, DatosMinisterio, Periodo } from '../modelo/tipos';
import { PS_BAUTIZADO, pasosDeMision } from '../modelo/catalogo';

const enPeriodo = (fecha: string, periodo: Periodo): boolean =>
  fecha >= periodo.desde && fecha <= periodo.hasta;

export interface AlcanzadoInforme {
  personaId: string;
  nombre: string;
  /** Fecha en que entró a Alcanzado dentro del período. */
  fecha: string;
  /** El paso en que está hoy (o su salida). */
  pasoActual: string;
  diasEnRuta: number;
  /** Llegó ya bautizado de otra congregación. */
  vinoBautizado: boolean;
}

export interface BautizadoInforme {
  personaId: string;
  nombre: string;
  fecha: string;
}

export interface IntegradoInforme {
  personaId: string;
  nombre: string;
  fecha: string;
  /** true: su historial recorrió aquí el paso Bautizado antes de
   * Añadido. false: vino ya bautizado (entró por Bautizado o
   * directo a Añadido, sin bautismo registrado en la casa). */
  bautizadoConNosotros: boolean;
}

export interface BajaInforme {
  personaId: string;
  nombre: string;
  /** Nombre del paso de salida al que entró en el período. */
  salida: string;
  fecha: string;
  /** El paso en que estaba justo antes de salir, si se conoce. */
  pasoPrevio?: string;
}

export interface EnProcesoInforme {
  personaId: string;
  nombre: string;
  pasoActual: string;
  diasEnPaso: number;
  diasEnRuta: number;
  /** Llegó ya bautizado de otra congregación. */
  vinoBautizado: boolean;
}

export interface InformeMision {
  frase: string;
  principal: {
    alcanzados: number;
    bautizados: number;
    integrados: number;
    bajas: number;
    enProceso: number;
  };
  alcanzados: AlcanzadoInforme[];
  bautizados: BautizadoInforme[];
  integrados: IntegradoInforme[];
  /** Personas por tipo de salida, en el orden del catálogo. */
  bajasDesglose: { salida: string; cantidad: number }[];
  bajas: BajaInforme[];
  enProceso: EnProcesoInforme[];
}

const diasEntre = (desde: string, hasta: string): number =>
  Math.max(0, Math.floor((Date.parse(hasta) - Date.parse(desde)) / 86_400_000));

/** La fecha en que una conversión entró a un paso dentro del
 * período (la más temprana), con la misma regla del motor de
 * conteo: el historial manda; sin historial, vale la fecha de
 * registro si el paso actual es ese. */
function fechaEntrada(c: Conversion, pasoId: string, periodo?: Periodo): string | null {
  const fechas = (c.historial ?? [])
    .filter((h) => h.estado === pasoId && (!periodo || enPeriodo(h.fecha, periodo)))
    .map((h) => h.fecha)
    .sort();
  if (fechas.length > 0) return fechas[0];
  if ((c.historial ?? []).length === 0 && c.estado === pasoId && (!periodo || enPeriodo(c.fecha, periodo))) {
    return c.fecha;
  }
  return null;
}

export type OrigenBautismo = 'casa' | 'fuera' | null;

/** El origen del bautismo de una persona (regla del 2026-11-22):
 * si su historial recorrió el paso Bautizado DESPUÉS de haber
 * entrado a la ruta (no como primera entrada), se bautizó CON
 * NOSOTROS. Si entró por Bautizado — la vieja puerta de los
 * traslados — o su ficha de persona dice bautizado sin paso
 * recorrido en la casa, VINO YA BAUTIZADO. Sin ninguna señal,
 * null: no consta bautismo. */
export function origenBautismo(datos: DatosMinisterio, personaId: string): OrigenBautismo {
  let fuera = false;
  for (const c of datos.conversiones) {
    if (c.personaId !== personaId) continue;
    const hist = (c.historial ?? []).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    const idx = hist.findIndex((h) => h.estado === PS_BAUTIZADO);
    if (idx > 0) return 'casa';
    if (idx === 0) fuera = true;
    if (hist.length === 0 && c.estado === PS_BAUTIZADO) fuera = true;
  }
  if (fuera) return 'fuera';
  const p = datos.personas.find((x) => x.id === personaId);
  if (p?.bautizado) return 'fuera';
  return null;
}

/** Los bautizados como corte transversal del censo — personas,
 * divididas por el origen de su bautismo (Panel e Informe
 * General). No toca el total de Congregados. */
export function corteBautizados(datos: DatosMinisterio): { casa: number; fuera: number; total: number } {
  let casa = 0;
  let fuera = 0;
  for (const p of datos.personas) {
    const o = origenBautismo(datos, p.id);
    if (o === 'casa') casa++;
    else if (o === 'fuera') fuera++;
  }
  return { casa, fuera, total: casa + fuera };
}

export function informeMision(
  datos: DatosMinisterio,
  periodo?: Periodo,
  hoy: string = new Date().toISOString().slice(0, 10),
): InformeMision {
  const pasos = pasosDeMision(datos.pasos);
  const pasoPorId = new Map(pasos.map((p) => [p.id, p]));
  const inicio = pasos.find((p) => p.rol === 'inicio');
  const gozne = pasos.find((p) => p.rol === 'gozne');
  const salidas = pasos.filter((p) => p.rol === 'salida');
  const esRuta = (pasoId: string): boolean => {
    const rol = pasoPorId.get(pasoId)?.rol;
    return rol === 'inicio' || rol === 'camino' || rol === 'gozne';
  };
  const nombrePaso = (pasoId: string): string => pasoPorId.get(pasoId)?.nombre ?? pasoId;
  const nombrePersona = (personaId: string): string => {
    const p = datos.personas.find((x) => x.id === personaId);
    if (!p) return 'Persona borrada';
    return `${p.nombre} ${p.apellidos ?? ''}`.trim() || 'Sin nombre';
  };

  // Las conversiones de cada persona: la unidad del informe es
  // la persona, tenga uno o varios registros.
  const porPersona = new Map<string, Conversion[]>();
  for (const c of datos.conversiones) {
    const lista = porPersona.get(c.personaId) ?? [];
    lista.push(c);
    porPersona.set(c.personaId, lista);
  }

  /** La entrada más temprana de la persona a un paso en el período. */
  const entradaDe = (convs: Conversion[], pasoId: string): { fecha: string; conv: Conversion } | null => {
    let mejor: { fecha: string; conv: Conversion } | null = null;
    for (const c of convs) {
      const f = fechaEntrada(c, pasoId, periodo);
      if (f && (!mejor || f < mejor.fecha)) mejor = { fecha: f, conv: c };
    }
    return mejor;
  };

  /** El estado de hoy de la persona entre todos sus registros:
   * una salida manda sobre la ruta; en la ruta manda el paso
   * más avanzado. Devuelve también desde cuándo está ahí. */
  const estadoActual = (convs: Conversion[]): { pasoId: string; desde: string } => {
    let salida: { pasoId: string; desde: string } | null = null;
    let ruta: { pasoId: string; desde: string; orden: number } | null = null;
    for (const c of convs) {
      const entradas = (c.historial ?? []).filter((h) => h.estado === c.estado);
      const desde = entradas.length > 0 ? entradas[entradas.length - 1].fecha : c.fecha;
      const paso = pasoPorId.get(c.estado);
      if (paso?.rol === 'salida') {
        if (!salida || desde > salida.desde) salida = { pasoId: c.estado, desde };
      } else if (paso) {
        if (!ruta || paso.orden > ruta.orden) ruta = { pasoId: c.estado, desde, orden: paso.orden };
      }
    }
    if (salida) return salida;
    if (ruta) return { pasoId: ruta.pasoId, desde: ruta.desde };
    const c = convs[0];
    return { pasoId: c.estado, desde: c.fecha };
  };

  const alcanzados: AlcanzadoInforme[] = [];
  const bautizados: BautizadoInforme[] = [];
  const integrados: IntegradoInforme[] = [];
  const bajas: BajaInforme[] = [];
  const enProceso: EnProcesoInforme[] = [];

  for (const [personaId, convs] of porPersona) {
    const nombre = nombrePersona(personaId);
    const actual = estadoActual(convs);
    const vinoBautizado = origenBautismo(datos, personaId) === 'fuera';

    if (inicio) {
      const e = entradaDe(convs, inicio.id);
      if (e) {
        alcanzados.push({
          personaId,
          nombre,
          fecha: e.fecha,
          pasoActual: nombrePaso(actual.pasoId),
          diasEnRuta: diasEntre(e.fecha, hoy),
          vinoBautizado,
        });
      }
    }

    // Bautizados del período: SOLO los de la casa — la entrada al
    // paso Bautizado que no es la primera del registro. La que es
    // la primera fue la vieja puerta de los traslados: esa
    // persona vino ya bautizada y no cuenta como bautismo nuestro.
    let fechaBautCasa: string | null = null;
    for (const c of convs) {
      const hist = (c.historial ?? []).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      hist.forEach((h, idx) => {
        if (h.estado === PS_BAUTIZADO && idx > 0 && (!periodo || enPeriodo(h.fecha, periodo))) {
          if (!fechaBautCasa || h.fecha < fechaBautCasa) fechaBautCasa = h.fecha;
        }
      });
    }
    if (fechaBautCasa) {
      bautizados.push({ personaId, nombre, fecha: fechaBautCasa as string });
    }

    if (gozne) {
      const eInt = entradaDe(convs, gozne.id);
      if (eInt) {
        // ¿Se bautizó con nosotros? Su historial recorrió el paso
        // Bautizado DESPUÉS de haber entrado a la ruta (no como
        // primer paso) y ANTES de llegar a Añadido.
        const hist = (eInt.conv.historial ?? []).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
        const idxInt = hist.findIndex((h) => h.estado === gozne.id);
        const antes = idxInt >= 0 ? hist.slice(0, idxInt) : hist;
        const idxBaut = antes.findIndex((h) => h.estado === PS_BAUTIZADO);
        const bautizadoConNosotros = idxBaut > 0;
        integrados.push({ personaId, nombre, fecha: eInt.fecha, bautizadoConNosotros });
      }
    }

    // La baja: la salida a la que entró en el período (la primera).
    let baja: { fecha: string; conv: Conversion; salidaId: string } | null = null;
    for (const s of salidas) {
      const e = entradaDe(convs, s.id);
      if (e && (!baja || e.fecha < baja.fecha)) baja = { fecha: e.fecha, conv: e.conv, salidaId: s.id };
    }
    if (baja) {
      const b = baja as { fecha: string; conv: Conversion; salidaId: string };
      const hist = (b.conv.historial ?? []).slice().sort((a, z) => (a.fecha < z.fecha ? -1 : 1));
      const idx = hist.findIndex((h) => h.estado === b.salidaId && h.fecha === b.fecha);
      const previo = idx > 0 ? hist[idx - 1] : undefined;
      bajas.push({
        personaId,
        nombre,
        salida: nombrePaso(b.salidaId),
        fecha: b.fecha,
        pasoPrevio: previo ? nombrePaso(previo.estado) : undefined,
      });
    }

    // En proceso: entró a la ruta en el período (su registro nació
    // entonces, o entró a Alcanzado entonces — así entran también
    // los traslados, que llegan por Bautizado) y hoy sigue en ella.
    let entradaRuta: string | null = null;
    for (const c of convs) {
      if (!periodo || enPeriodo(c.fecha, periodo)) {
        if (!entradaRuta || c.fecha < entradaRuta) entradaRuta = c.fecha;
      }
    }
    if (inicio) {
      const e = entradaDe(convs, inicio.id);
      if (e && (!entradaRuta || e.fecha < entradaRuta)) entradaRuta = e.fecha;
    }
    if (entradaRuta && esRuta(actual.pasoId)) {
      enProceso.push({
        personaId,
        nombre,
        pasoActual: nombrePaso(actual.pasoId),
        diasEnPaso: diasEntre(actual.desde, hoy),
        diasEnRuta: diasEntre(entradaRuta, hoy),
        vinoBautizado,
      });
    }
  }

  const porFecha = <T extends { fecha: string; nombre: string }>(a: T, b: T): number =>
    a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.nombre.localeCompare(b.nombre);
  alcanzados.sort(porFecha);
  bautizados.sort(porFecha);
  integrados.sort(porFecha);
  bajas.sort(porFecha);
  enProceso.sort((a, b) => b.diasEnPaso - a.diasEnPaso || a.nombre.localeCompare(b.nombre));

  const bajasDesglose = salidas
    .map((s) => ({
      salida: s.nombre,
      cantidad: bajas.filter((b) => b.salida === s.nombre).length,
    }))
    .filter((d) => d.cantidad > 0);

  const principal = {
    alcanzados: alcanzados.length,
    bautizados: bautizados.length,
    integrados: integrados.length,
    bajas: bajas.length,
    enProceso: enProceso.length,
  };
  const frase =
    `Se terminó con: ${principal.alcanzados} Alcanzados · ${principal.bautizados} Bautizados · ` +
    `${principal.integrados} Añadidos · ${principal.bajas} Bajas · ${principal.enProceso} En Proceso`;

  return { frase, principal, alcanzados, bautizados, integrados, bajasDesglose, bajas, enProceso };
}
