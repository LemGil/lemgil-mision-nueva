// Las acciones de escritura con las reglas del modelo congelado (plano §2):
//  - El carné bloquea la ficha duplicada, siempre.
//  - Bloqueo duro: UNA persona, UN registro por proceso (Misión, Miembros).
//  - El miembro nace SOLO en el gozne (Integrado), enlazado a su conversión.
//  - Las salidas se reflejan en el miembro: Traslado → Trasladado,
//    Fallecido → Fallecido, Apartado y demás salidas → Inactivo (desde Activo).
// Toda acción pasa por el Repo: queda encolada para sincronizar.

import {
  PS_ALCAZADO,
  PS_BAUTIZADO,
  PS_CONFESO,
  PS_CONVERSO,
  PS_FALLECIDO,
  PS_INTEGRADO,
  PS_TRASLADO,
  esGozne,
  pasoPorId,
} from '../modelo/catalogo';
import { historialOrdenado } from '../motor/mision';
import { claveTipoGrupo, idsGruposDe } from '../motor/gruposVista';
import {
  listaConPasoNuevo,
  moverEnLista,
  nombreRepetido,
  pasosDelAmbito,
  puedeBorrarPaso,
  renumerar,
} from '../motor/pasosEditar';
import type {
  Academia,
  Aporte,
  AporteRed,
  AsignacionMinisterio,
  Beneficiario,
  Campana,
  Colaborador,
  Conversion,
  DatosMinisterio,
  Diezmador,
  Encuentro,
  Entrega,
  EntradaHistorial,
  Estudiante,
  Evangelismo,
  Grupo,
  Hito,
  Miembro,
  Paso,
  Persona,
  Reunion,
} from '../modelo/tipos';
import type { Repo } from './repo';

const nuevoId = () => crypto.randomUUID();
const digitos = (s: string) => s.replace(/\D/g, '');

export type EntradaMision = 'alcanzado' | 'confeso' | 'converso' | 'bautizado';

export const PASO_DE_ENTRADA: Record<EntradaMision, string> = {
  alcanzado: PS_ALCAZADO,
  confeso: PS_CONFESO,
  converso: PS_CONVERSO,
  bautizado: PS_BAUTIZADO,
};

export interface AltasDirectas {
  mision?: EntradaMision; // undefined = no dar de alta en Misión
  integrado?: boolean;
  beneficiario?: boolean;
}

function historialDeNacimiento(estado: string, pasoInicioId: string, hoy: string) {
  return estado === pasoInicioId
    ? []
    : [{ fecha: hoy, estado, nota: 'Registro inicial' }];
}

async function crearConversionInterna(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  estado: string,
  hoy: string,
): Promise<Conversion> {
  const inicio = datos.pasos.find((p) => p.rol === 'inicio');
  const conversion: Conversion = {
    id: nuevoId(),
    personaId,
    estado,
    fecha: hoy,
    historial: historialDeNacimiento(estado, inicio?.id ?? PS_ALCAZADO, hoy),
    bautizado: estado === PS_BAUTIZADO || undefined,
  };
  await repo.guardar('conversiones', conversion);
  return conversion;
}

async function crearMiembroInterno(
  repo: Repo,
  personaId: string,
  conversionId: string | null,
  hoy: string,
): Promise<Miembro> {
  const miembro: Miembro = {
    id: nuevoId(),
    personaId,
    estado: 'Activo',
    fechaIngreso: hoy,
    conversionId,
  };
  await repo.guardar('miembros', miembro);
  return miembro;
}

/** La siembra de las altas directas, UNA sola vía compartida por el
 * registro de la persona nueva y por las altas desde la edición de su
 * ficha: los procesos nacen igual en los dos sitios. */
async function aplicarAltasDirectas(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  altas: AltasDirectas,
  hoy: string,
): Promise<void> {
  if (altas.integrado) {
    const conversion = await crearConversionInterna(repo, datos, personaId, PS_INTEGRADO, hoy);
    await crearMiembroInterno(repo, personaId, conversion.id, hoy);
  } else if (altas.mision) {
    await crearConversionInterna(repo, datos, personaId, PASO_DE_ENTRADA[altas.mision], hoy);
  }
  if (altas.beneficiario) {
    await repo.guardar('beneficiarios', {
      id: nuevoId(),
      personaId,
      estado: 'Activo',
    });
  }
}

/** Registra una persona nueva (el ÚNICO formulario que teclea datos nuevos),
 * con sus altas directas combinables. El carné duplicado bloquea. */
export async function registrarPersona(
  repo: Repo,
  datos: DatosMinisterio,
  nueva: Omit<Persona, 'id'>,
  altas: AltasDirectas,
  hoy: string,
): Promise<Persona> {
  const carnet = nueva.numeroIdentidad ? digitos(nueva.numeroIdentidad) : '';
  if (carnet) {
    const choque = datos.personas.find(
      (p) => p.numeroIdentidad && digitos(p.numeroIdentidad) === carnet,
    );
    if (choque) {
      throw new Error(
        `Ya existe una persona con ese Nº de Identidad: ${choque.nombre}. No se puede registrar dos veces.`,
      );
    }
  }
  const persona: Persona = { ...nueva, id: nuevoId() };
  await repo.guardar('personas', persona);
  await aplicarAltasDirectas(repo, datos, persona.id, altas, hoy);
  return persona;
}

/** Da las altas directas a una persona YA registrada, desde la edición de
 * su ficha — quien se registró antes de que existiera la sección de altas
 * las recibe ahora, sin pasar por los módulos. Es SOLO de altas: nada se
 * desmarca ni se borra aquí. Misma siembra que el registro nuevo, con el
 * bloqueo duro de siempre, validado ANTES de sembrar: si el proceso ya
 * existe —aunque su registro esté cerrado como salida (Apartado,
 * Traslado…)— no nace otro, porque el bloqueo de la app mira el registro,
 * no su estado. */
export async function darAltasDirectas(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  altas: AltasDirectas,
  hoy: string,
): Promise<void> {
  if (altas.integrado || altas.mision) {
    const existente = datos.conversiones.find((c) => c.personaId === personaId);
    if (existente) {
      const paso = pasoPorId(datos.pasos, existente.estado);
      throw new Error(
        `Esta persona ya está en Misión (estado actual: ${paso?.nombre ?? existente.estado}). Una persona solo puede tener UN registro en Misión: trabaja sobre su ficha.`,
      );
    }
  }
  if (altas.integrado) {
    const miembro = datos.miembros.find((m) => m.personaId === personaId);
    if (miembro) {
      throw new Error(
        `Esta persona ya es miembro (estado: ${miembro.estado}). Una persona solo puede tener UNA ficha en Miembros.`,
      );
    }
  }
  if (altas.beneficiario && datos.beneficiarios.some((b) => b.personaId === personaId)) {
    throw new Error('Esta persona ya es beneficiaria en Manos Abiertas.');
  }
  await aplicarAltasDirectas(repo, datos, personaId, altas, hoy);
}

/** Da de alta en Misión a una persona existente. Bloqueo duro: si ya tiene
 * un registro en Misión, no nace otro. */
export async function crearConversion(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  entrada: EntradaMision,
  hoy: string,
): Promise<Conversion> {
  const existente = datos.conversiones.find((c) => c.personaId === personaId);
  if (existente) {
    const paso = pasoPorId(datos.pasos, existente.estado);
    throw new Error(
      `Esta persona ya está en Misión (estado actual: ${paso?.nombre ?? existente.estado}). Una persona solo puede tener UN registro en Misión: trabaja sobre su ficha.`,
    );
  }
  return crearConversionInterna(repo, datos, personaId, PASO_DE_ENTRADA[entrada], hoy);
}

/**
 * Alta en Misión de quien llega ya bautizado de otra congregación
 * (procedimiento del 2026-11-22): el proceso nace en Alcanzado —
 * como el de todos —, la persona queda con su bautismo (y su
 * fecha, si se conoce) registrados, y el historial anota la
 * llegada. Su bautismo NO cuenta como bautismo de la casa: en los
 * conteos se lee «vino ya bautizado» por el origen.
 */
export async function crearConversionLlegaBautizado(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  fechaBautismo: string,
  hoy: string,
): Promise<Conversion> {
  const existente = datos.conversiones.find((c) => c.personaId === personaId);
  if (existente) {
    const paso = pasoPorId(datos.pasos, existente.estado);
    throw new Error(
      `Esta persona ya está en Misión (estado actual: ${paso?.nombre ?? existente.estado}). Una persona solo puede tener UN registro en Misión: trabaja sobre su ficha.`,
    );
  }
  const persona = datos.personas.find((x) => x.id === personaId);
  if (persona && (!persona.bautizado || (fechaBautismo && !persona.fechaBautismo))) {
    await repo.guardar('personas', {
      ...persona,
      bautizado: true,
      fechaBautismo: fechaBautismo || persona.fechaBautismo,
    });
  }
  const conversion = await crearConversionInterna(repo, datos, personaId, PS_ALCAZADO, hoy);
  const conNota: Conversion = {
    ...conversion,
    bautizado: true,
    historial: [
      ...(conversion.historial ?? []),
      { fecha: hoy, estado: PS_ALCAZADO, nota: 'Llegó bautizado/a de otra congregación' },
    ],
  };
  await repo.guardar('conversiones', conNota);
  return conNota;
}

/** Registra un miembro directo (sin pasar por Misión). Bloqueo duro. */
export async function crearMiembro(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  hoy: string,
): Promise<Miembro> {
  const existente = datos.miembros.find((m) => m.personaId === personaId);
  if (existente) {
    throw new Error(
      `Esta persona ya es miembro (estado: ${existente.estado}). Una persona solo puede tener UNA ficha en Miembros.`,
    );
  }
  return crearMiembroInterno(repo, personaId, null, hoy);
}

/** Mueve una conversión a otro paso: deja la entrada en el historial y
 * aplica las consecuencias del paso (el gozne y las salidas). */
export async function avanzarConversion(
  repo: Repo,
  datos: DatosMinisterio,
  conversionId: string,
  nuevoPasoId: string,
  hoy: string,
  nota: string = 'Avance',
): Promise<void> {
  const conversion = datos.conversiones.find((c) => c.id === conversionId);
  if (!conversion) throw new Error('Ese registro de Misión ya no existe.');
  if (conversion.estado === nuevoPasoId) return;

  const actualizada: Conversion = {
    ...conversion,
    estado: nuevoPasoId,
    historial: [
      ...(conversion.historial ?? []),
      { fecha: hoy, estado: nuevoPasoId, nota },
    ],
    bautizado: conversion.bautizado || nuevoPasoId === PS_BAUTIZADO || undefined,
  };
  await repo.guardar('conversiones', actualizada);

  const miembro = datos.miembros.find((m) => m.personaId === conversion.personaId);

  // El gozne: al caer en Integrado nace el miembro, y solo ahí.
  if (esGozne(datos.pasos, nuevoPasoId)) {
    if (!miembro) {
      await crearMiembroInterno(repo, conversion.personaId, conversion.id, hoy);
    }
    return;
  }

  // Las salidas se reflejan en el miembro.
  const rol = pasoPorId(datos.pasos, nuevoPasoId)?.rol;
  if (rol === 'salida' && miembro) {
    let estado: Miembro['estado'] | null = null;
    if (nuevoPasoId === PS_TRASLADO && miembro.estado !== 'Fallecido') estado = 'Trasladado';
    else if (nuevoPasoId === PS_FALLECIDO) estado = 'Fallecido';
    else if (miembro.estado === 'Activo') estado = 'Inactivo';
    if (estado && estado !== miembro.estado) {
      await repo.guardar('miembros', { ...miembro, estado });
    }
  }
}

// — Las mesas restantes: altas con el mismo bloqueo duro y ediciones. —

export async function actualizarMiembro(repo: Repo, miembro: Miembro): Promise<void> {
  await repo.guardar('miembros', miembro);
}

export async function registrarHito(
  repo: Repo,
  hito: Omit<Hito, 'id'>,
): Promise<Hito> {
  const completo: Hito = { ...hito, id: nuevoId() };
  await repo.guardar('hitos', completo);
  return completo;
}

export async function crearEstudiante(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
): Promise<Estudiante> {
  if (datos.estudiantes.some((e) => e.personaId === personaId)) {
    throw new Error('Esta persona ya es estudiante de la Academia.');
  }
  const estudiante: Estudiante = { id: nuevoId(), personaId, estado: 'Activo' };
  await repo.guardar('estudiantes', estudiante);
  return estudiante;
}

// ——— Academia: el catálogo y el encuentro final ———
// La academia se concluye en el encuentro presencial con el Maestro:
// el Encuentro registra la academia, su fecha y los alumnos que lo
// recibieron. Estar en un encuentro de una academia es haberla
// concluido (ver motor/academia).

export async function crearAcademia(
  repo: Repo,
  datos: DatosMinisterio,
  entrada: { nombre: string; nivel: string },
): Promise<Academia> {
  const nombre = entrada.nombre.trim();
  if (!nombre) throw new Error('La academia necesita un nombre.');
  if (
    datos.academias.some(
      (a) => sinAcentos(a.nombre).trim() === sinAcentos(nombre).trim(),
    )
  ) {
    throw new Error('Ya hay una academia con ese nombre.');
  }
  const academia: Academia = { id: nuevoId(), nombre, nivel: entrada.nivel.trim() };
  await repo.guardar('academias', academia);
  return academia;
}

export async function actualizarAcademia(repo: Repo, academia: Academia): Promise<void> {
  await repo.guardar('academias', {
    ...academia,
    nombre: academia.nombre.trim(),
    nivel: academia.nivel.trim(),
  });
}

/** Una academia con encuentros no se borra: primero se borran sus
 * encuentros, para no dejar conclusiones huérfanas. */
export async function borrarAcademia(
  repo: Repo,
  datos: DatosMinisterio,
  id: string,
): Promise<void> {
  if (datos.encuentros.some((e) => e.academiaId === id)) {
    throw new Error('Esta academia ya tiene encuentros registrados; bórralos primero.');
  }
  await repo.borrar('academias', id);
}

/** El gozne del encuentro (como el de Misión → Miembros): quien
 * recibe un encuentro ES estudiante de la Academia. Al guardar el
 * encuentro, cada alumno que no tenga ficha de estudiante la gana
 * (Activo), y el que la tenga Inactiva vuelve a Activo. Quitar a
 * alguien de la lista del encuentro NO le quita la ficha: eso se
 * maneja en la pestaña Estudiantes. */
async function asegurarEstudiantesDelEncuentro(
  repo: Repo,
  datos: DatosMinisterio,
  alumnoIds: string[],
): Promise<void> {
  for (const personaId of alumnoIds) {
    const ficha = datos.estudiantes.find((e) => e.personaId === personaId);
    if (!ficha) {
      await repo.guardar('estudiantes', { id: nuevoId(), personaId, estado: 'Activo' });
    } else if (ficha.estado !== 'Activo') {
      await repo.guardar('estudiantes', { ...ficha, estado: 'Activo' });
    }
  }
}

export async function registrarEncuentro(
  repo: Repo,
  datos: DatosMinisterio,
  entrada: Omit<Encuentro, 'id'>,
): Promise<Encuentro> {
  if (!datos.academias.some((a) => a.id === entrada.academiaId)) {
    throw new Error('El encuentro necesita una academia del catálogo.');
  }
  if (!entrada.fecha) throw new Error('El encuentro necesita una fecha.');
  const encuentro: Encuentro = {
    ...entrada,
    id: nuevoId(),
    alumnoIds: [...new Set(entrada.alumnoIds)],
  };
  await repo.guardar('encuentros', encuentro);
  await asegurarEstudiantesDelEncuentro(repo, datos, encuentro.alumnoIds);
  return encuentro;
}

export async function actualizarEncuentro(
  repo: Repo,
  datos: DatosMinisterio,
  encuentro: Encuentro,
): Promise<void> {
  const limpio: Encuentro = {
    ...encuentro,
    alumnoIds: [...new Set(encuentro.alumnoIds)],
  };
  await repo.guardar('encuentros', limpio);
  await asegurarEstudiantesDelEncuentro(repo, datos, limpio.alumnoIds);
}

export async function borrarEncuentro(repo: Repo, id: string): Promise<void> {
  await repo.borrar('encuentros', id);
}

export async function crearDiezmador(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
): Promise<Diezmador> {
  if (datos.diezmadores.some((d) => d.personaId === personaId)) {
    throw new Error('Esta persona ya es diezmador en Bien Común.');
  }
  const diezmador: Diezmador = { id: nuevoId(), personaId, activo: true };
  await repo.guardar('diezmadores', diezmador);
  return diezmador;
}

export async function registrarAporte(
  repo: Repo,
  aporte: Omit<Aporte, 'id'>,
): Promise<Aporte> {
  const completo: Aporte = { ...aporte, id: nuevoId() };
  await repo.guardar('aportes', completo);
  return completo;
}

// ── Red de Colaboradores (externos: NO pasan por la ficha única) ──────

export async function crearColaborador(
  repo: Repo,
  colaborador: Omit<Colaborador, 'id'>,
): Promise<Colaborador> {
  const completo: Colaborador = { ...colaborador, id: nuevoId() };
  await repo.guardar('colaboradores', completo);
  return completo;
}

export async function actualizarColaborador(
  repo: Repo,
  colaborador: Colaborador,
): Promise<void> {
  await repo.guardar('colaboradores', colaborador);
}

export async function registrarAporteRed(
  repo: Repo,
  aporte: Omit<AporteRed, 'id'>,
): Promise<AporteRed> {
  const completo: AporteRed = { ...aporte, id: nuevoId() };
  await repo.guardar('aportesRed', completo);
  return completo;
}

export async function crearBeneficiario(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
): Promise<Beneficiario> {
  if (datos.beneficiarios.some((b) => b.personaId === personaId)) {
    throw new Error('Esta persona ya es beneficiaria en Manos Abiertas.');
  }
  const beneficiario: Beneficiario = { id: nuevoId(), personaId, tipo: 'Persona', estado: 'Activo' };
  await repo.guardar('beneficiarios', beneficiario);
  return beneficiario;
}

/** Un beneficiario Familia o Grupo: no cuelga de la ficha única, tiene
 * su propio nombre (la casa, el comedor, la familia). */
export async function crearBeneficiarioManual(
  repo: Repo,
  datos: Omit<Beneficiario, 'id' | 'personaId' | 'estado'>,
): Promise<Beneficiario> {
  const beneficiario: Beneficiario = {
    ...datos,
    id: nuevoId(),
    personaId: null,
    estado: 'Activo',
  };
  await repo.guardar('beneficiarios', beneficiario);
  return beneficiario;
}

export async function actualizarBeneficiario(
  repo: Repo,
  beneficiario: Beneficiario,
): Promise<void> {
  await repo.guardar('beneficiarios', beneficiario);
}

export async function crearGrupo(
  repo: Repo,
  grupo: Omit<Grupo, 'id'>,
): Promise<Grupo> {
  const completo: Grupo = { ...grupo, id: nuevoId() };
  await repo.guardar('grupos', completo);
  return completo;
}

export async function guardarEvangelismo(
  repo: Repo,
  evangelismo: Omit<Evangelismo, 'id'> & { id?: string },
): Promise<Evangelismo> {
  const completo: Evangelismo = { ...evangelismo, id: evangelismo.id ?? nuevoId() };
  await repo.guardar('evangelismos', completo);
  return completo;
}

/** Fija o mueve la chincheta de una persona o un grupo. */
export async function fijarUbicacion(
  repo: Repo,
  datos: DatosMinisterio,
  tipo: 'persona' | 'grupo',
  id: string,
  lat: number,
  lng: number,
): Promise<void> {
  if (tipo === 'persona') {
    const p = datos.personas.find((x) => x.id === id);
    if (p) await repo.guardar('personas', { ...p, lat, lng });
  } else {
    const g = datos.grupos.find((x) => x.id === id);
    if (g) await repo.guardar('grupos', { ...g, lat, lng });
  }
}

/** Asigna una persona a un ministerio (por nombre: el ministerio nace con
 * su primera asignación). Una persona no se repite en el mismo ministerio. */
export async function asignarMinisterio(
  repo: Repo,
  datos: DatosMinisterio,
  entrada: { personaId: string; ministerio: string },
): Promise<AsignacionMinisterio> {
  const nombre = entrada.ministerio.trim();
  if (!nombre) throw new Error('El ministerio necesita un nombre.');
  const repetida = datos.asignaciones.some(
    (a) => a.personaId === entrada.personaId && a.ministerio.toLowerCase() === nombre.toLowerCase(),
  );
  if (repetida) throw new Error('Esa persona ya está en ese ministerio.');
  const asignacion: AsignacionMinisterio = {
    id: nuevoId(),
    personaId: entrada.personaId,
    ministerio: nombre,
  };
  await repo.guardar('asignaciones', asignacion);
  return asignacion;
}

/** Quita a una persona de un ministerio (borrado lógico del Repo). */
export async function quitarDeMinisterio(repo: Repo, asignacionId: string): Promise<void> {
  await repo.borrar('asignaciones', asignacionId);
}

/** Edita los datos de una persona ya registrada. El carné sigue siendo
 * único: si el nuevo número ya es de OTRA persona, se bloquea. */
export async function actualizarPersona(
  repo: Repo,
  datos: DatosMinisterio,
  persona: Persona,
): Promise<void> {
  const carnet = persona.numeroIdentidad ? digitos(persona.numeroIdentidad) : '';
  if (carnet) {
    const choque = datos.personas.find(
      (p) => p.id !== persona.id && p.numeroIdentidad && digitos(p.numeroIdentidad) === carnet,
    );
    if (choque) {
      throw new Error(
        `Ya existe otra persona con ese Nº de Identidad: ${choque.nombre}. No se puede repetir.`,
      );
    }
  }
  await repo.guardar('personas', persona);
}

// ── Editar y borrar registros (pedido de LemGil, 2026-11-18) ──────────
// Toda mesa da ahora la opción de corregir y de borrar su registro.
// Borrar es blando (tumba): sale de todas las vistas y del conteo, y la
// sincronización lo respeta en todos los equipos.

/** Guarda el historial editado de una conversión y recalcula su estado
 * (manda la entrada más reciente), aplicando las consecuencias del paso
 * resultante: el gozne hace nacer el miembro y las salidas se reflejan. */
export async function guardarHistorial(
  repo: Repo,
  datos: DatosMinisterio,
  conversionId: string,
  historialNuevo: EntradaHistorial[],
): Promise<void> {
  const conversion = datos.conversiones.find((c) => c.id === conversionId);
  if (!conversion) throw new Error('Ese registro de Misión ya no existe.');
  if (historialNuevo.length === 0) {
    throw new Error('El historial no puede quedar vacío: todo registro guarda al menos su entrada inicial.');
  }
  const ordenado = historialOrdenado(historialNuevo);
  const nuevoEstado = ordenado[ordenado.length - 1].estado;
  const actualizada: Conversion = {
    ...conversion,
    historial: ordenado,
    estado: nuevoEstado,
    bautizado:
      conversion.bautizado || ordenado.some((h) => h.estado === PS_BAUTIZADO) || undefined,
  };
  await repo.guardar('conversiones', actualizada);
  if (nuevoEstado === conversion.estado) return;

  const miembro = datos.miembros.find((m) => m.personaId === conversion.personaId);
  if (esGozne(datos.pasos, nuevoEstado)) {
    if (!miembro) {
      await crearMiembroInterno(
        repo,
        conversion.personaId,
        conversion.id,
        ordenado[ordenado.length - 1].fecha,
      );
    }
    return;
  }
  const rol = pasoPorId(datos.pasos, nuevoEstado)?.rol;
  if (rol === 'salida' && miembro) {
    let estado: Miembro['estado'] | null = null;
    if (nuevoEstado === PS_TRASLADO && miembro.estado !== 'Fallecido') estado = 'Trasladado';
    else if (nuevoEstado === PS_FALLECIDO) estado = 'Fallecido';
    else if (miembro.estado === 'Activo') estado = 'Inactivo';
    if (estado && estado !== miembro.estado) {
      await repo.guardar('miembros', { ...miembro, estado });
    }
  }
}

export async function borrarConversion(repo: Repo, id: string): Promise<void> {
  await repo.borrar('conversiones', id);
}

export async function borrarMiembro(repo: Repo, id: string): Promise<void> {
  await repo.borrar('miembros', id);
}

export async function actualizarHito(repo: Repo, hito: Hito): Promise<void> {
  await repo.guardar('hitos', hito);
}

export async function borrarHito(repo: Repo, id: string): Promise<void> {
  await repo.borrar('hitos', id);
}

export async function borrarEstudiante(repo: Repo, id: string): Promise<void> {
  await repo.borrar('estudiantes', id);
}

export async function borrarDiezmador(repo: Repo, id: string): Promise<void> {
  await repo.borrar('diezmadores', id);
}

export async function borrarBeneficiario(repo: Repo, id: string): Promise<void> {
  await repo.borrar('beneficiarios', id);
}

export async function borrarAporte(repo: Repo, id: string): Promise<void> {
  await repo.borrar('aportes', id);
}

export async function borrarAporteRed(repo: Repo, id: string): Promise<void> {
  await repo.borrar('aportesRed', id);
}

/** Borra al colaborador y sus aportes: sin colaborador, sus aportes no
 * tienen a quién colgar (la Red no guarda fotos históricas). */
export async function borrarColaborador(
  repo: Repo,
  datos: DatosMinisterio,
  id: string,
): Promise<void> {
  for (const a of datos.aportesRed.filter((x) => x.colaboradorId === id)) {
    await repo.borrar('aportesRed', a.id);
  }
  await repo.borrar('colaboradores', id);
}

export async function actualizarGrupo(repo: Repo, grupo: Grupo): Promise<void> {
  await repo.guardar('grupos', grupo);
}

// ——— Pertenencia a grupos con tipos (2026-11-23) ———
// La lista `grupoIds` es la fuente; `grupoId` queda como espejo del
// primero para cualquier lector viejo. Una persona puede estar en un
// grupo de cada tipo (su Iglesia y su Oikos).

/** Fija la lista completa de grupos de una persona, en su ficha y en
 * su ficha de miembro a la vez (las dos se leen juntas). */
export async function asignarGrupos(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  grupoIds: string[],
): Promise<void> {
  const espejo = grupoIds[0] ?? null;
  const persona = datos.personas.find((x) => x.id === personaId);
  if (persona) {
    await repo.guardar('personas', { ...persona, grupoIds, grupoId: espejo });
  }
  const miembro = datos.miembros.find((x) => x.personaId === personaId);
  if (miembro) {
    await repo.guardar('miembros', { ...miembro, grupoIds, grupoId: espejo });
  }
}

/** Agrega a la persona al grupo, respetando la regla de un grupo por
 * tipo: si ya estaba en otro grupo DEL MISMO tipo, sale de aquel. */
export async function agregarAGrupo(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  grupo: Grupo,
): Promise<void> {
  const clave = claveTipoGrupo(grupo);
  const actuales = idsGruposDe(datos, personaId).filter((id) => {
    if (id === grupo.id) return false;
    const otro = datos.grupos.find((g) => g.id === id);
    return claveTipoGrupo(otro) !== clave;
  });
  await asignarGrupos(repo, datos, personaId, [...actuales, grupo.id]);
}

/** Quita a la persona de un grupo (los demás grupos quedan). */
export async function quitarDeGrupo(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
  grupoId: string,
): Promise<void> {
  const actuales = idsGruposDe(datos, personaId).filter((id) => id !== grupoId);
  await asignarGrupos(repo, datos, personaId, actuales);
}

/** Borra el grupo y lo quita de las fichas que lo tenían. */
export async function borrarGrupo(
  repo: Repo,
  datos: DatosMinisterio,
  id: string,
): Promise<void> {
  for (const p of datos.personas) {
    if (idsGruposDe(datos, p.id).includes(id)) {
      const restantes = idsGruposDe(datos, p.id).filter((g) => g !== id);
      await repo.guardar('personas', { ...p, grupoIds: restantes, grupoId: restantes[0] ?? null });
    }
  }
  for (const m of datos.miembros) {
    if (idsGruposDe(datos, m.personaId).includes(id)) {
      const restantes = idsGruposDe(datos, m.personaId).filter((g) => g !== id);
      await repo.guardar('miembros', { ...m, grupoIds: restantes, grupoId: restantes[0] ?? null });
    }
  }
  // Los grupos que colgaban de este (sus Oikos) quedan sin padre, a
  // la vista, para reasignarlos — no se rompen ni desaparecen.
  for (const g of datos.grupos.filter((x) => x.padreId === id)) {
    await repo.guardar('grupos', { ...g, padreId: null });
  }
  await repo.borrar('grupos', id);
}

export async function borrarEvangelismo(repo: Repo, id: string): Promise<void> {
  await repo.borrar('evangelismos', id);
}

// ── Ministerios: renombrar, borrar y quién está al frente ─────────────

export async function renombrarMinisterio(
  repo: Repo,
  datos: DatosMinisterio,
  viejo: string,
  nuevo: string,
): Promise<void> {
  const limpio = nuevo.trim();
  if (!limpio) throw new Error('El nombre no puede quedar vacío.');
  const existe = datos.asignaciones.some(
    (a) => a.ministerio !== viejo && a.ministerio.trim().toLowerCase() === limpio.toLowerCase(),
  );
  if (existe) throw new Error(`Ya hay otro ministerio llamado «${limpio}».`);
  for (const a of datos.asignaciones.filter((x) => x.ministerio === viejo)) {
    await repo.guardar('asignaciones', { ...a, ministerio: limpio });
  }
}

/** Borrar un ministerio = quitar a toda su gente de él. */
export async function borrarMinisterio(
  repo: Repo,
  datos: DatosMinisterio,
  nombre: string,
): Promise<void> {
  for (const a of datos.asignaciones.filter((x) => x.ministerio === nombre)) {
    await repo.borrar('asignaciones', a.id);
  }
}

/** Marca quién está al frente (uno solo por ministerio; null = nadie). */
export async function marcarResponsableMinisterio(
  repo: Repo,
  datos: DatosMinisterio,
  ministerio: string,
  asignacionId: string | null,
): Promise<void> {
  for (const a of datos.asignaciones.filter((x) => x.ministerio === ministerio)) {
    const responsable = a.id === asignacionId ? true : undefined;
    if ((a.responsable === true) !== (responsable === true)) {
      await repo.guardar('asignaciones', { ...a, responsable });
    }
  }
}

// ── Zonas: la lista sale de las fichas; se corrige en bloque ──────────

export async function renombrarZona(
  repo: Repo,
  datos: DatosMinisterio,
  vieja: string,
  nueva: string,
): Promise<void> {
  const limpia = nueva.trim();
  if (!limpia) throw new Error('La zona no puede quedar vacía.');
  for (const p of datos.personas.filter((x) => x.zona === vieja)) {
    await repo.guardar('personas', { ...p, zona: limpia });
  }
  for (const g of datos.grupos.filter((x) => x.zona === vieja)) {
    await repo.guardar('grupos', { ...g, zona: limpia });
  }
}

/** Quitar una zona = dejar sin zona a las fichas y grupos que la tenían. */
export async function quitarZona(
  repo: Repo,
  datos: DatosMinisterio,
  zona: string,
): Promise<void> {
  for (const p of datos.personas.filter((x) => x.zona === zona)) {
    await repo.guardar('personas', { ...p, zona: undefined });
  }
  for (const g of datos.grupos.filter((x) => x.zona === zona)) {
    await repo.guardar('grupos', { ...g, zona: undefined });
  }
}

/** Borra la ficha única SOLO si la persona no tiene ningún proceso:
 * primero se borran sus registros en cada mesa. */
export async function borrarPersona(
  repo: Repo,
  datos: DatosMinisterio,
  id: string,
): Promise<void> {
  const procesos: string[] = [];
  if (datos.conversiones.some((c) => c.personaId === id)) procesos.push('Misión');
  if (datos.miembros.some((m) => m.personaId === id)) procesos.push('Miembros');
  if (datos.estudiantes.some((e) => e.personaId === id)) procesos.push('Academia');
  if (datos.diezmadores.some((d) => d.personaId === id)) procesos.push('Bien Común');
  if (datos.beneficiarios.some((b) => b.personaId === id)) procesos.push('Manos Abiertas');
  if (datos.asignaciones.some((a) => a.personaId === id)) procesos.push('Ministerios');
  if (procesos.length > 0) {
    throw new Error(
      `Esta persona tiene registros en: ${procesos.join(', ')}. Borra primero esos registros y luego su ficha.`,
    );
  }
  await repo.borrar('personas', id);
}

// ── Aportes editables (Bien Común y Red) ──────────────────────────────

export async function actualizarAporte(repo: Repo, aporte: Aporte): Promise<void> {
  await repo.guardar('aportes', aporte);
}

export async function actualizarAporteRed(repo: Repo, aporte: AporteRed): Promise<void> {
  await repo.guardar('aportesRed', aporte);
}

// ── Manos Abiertas: Campañas y Entregas ───────────────────────────────

export async function crearCampana(
  repo: Repo,
  campana: Omit<Campana, 'id'>,
): Promise<Campana> {
  const completa: Campana = { ...campana, id: nuevoId() };
  await repo.guardar('campanas', completa);
  return completa;
}

export async function actualizarCampana(repo: Repo, campana: Campana): Promise<void> {
  await repo.guardar('campanas', campana);
}

/** Borra la campaña y sus entregas: sin campaña, no tienen dónde colgar. */
export async function borrarCampana(
  repo: Repo,
  datos: DatosMinisterio,
  id: string,
): Promise<void> {
  for (const e of datos.entregas.filter((x) => x.campanaId === id)) {
    await repo.borrar('entregas', e.id);
  }
  await repo.borrar('campanas', id);
}

export async function registrarEntrega(
  repo: Repo,
  entrega: Omit<Entrega, 'id'>,
): Promise<Entrega> {
  const completa: Entrega = { ...entrega, id: nuevoId() };
  await repo.guardar('entregas', completa);
  return completa;
}

export async function actualizarEntrega(repo: Repo, entrega: Entrega): Promise<void> {
  await repo.guardar('entregas', entrega);
}

export async function borrarEntrega(repo: Repo, id: string): Promise<void> {
  await repo.borrar('entregas', id);
}

// — Editar los pasos (Misión y Miembros): nombre, emoji, orden, altas y
// bajas con las protecciones del motor (pasosEditar). Todo pasa por el
// Repo y viaja con la sync como cualquier otro dato. —

/** Renombra un paso y/o cambia su emoji. El id no se toca: los
 * registros que cuelgan de él quedan intactos. */
export async function renombrarPaso(
  repo: Repo,
  datos: DatosMinisterio,
  paso: Paso,
  nombre: string,
  emoji: string,
): Promise<void> {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('El paso necesita un nombre.');
  if (nombreRepetido(datos.pasos, paso.ambito, limpio, paso.id)) {
    throw new Error(`Ya hay un paso llamado «${limpio}» en este ámbito.`);
  }
  await repo.guardar('pasos', { ...paso, nombre: limpio, emoji: emoji.trim() || paso.emoji });
}

/** Sube o baja un paso un lugar (las reglas de quién puede moverse
 * viven en el motor). Devuelve true si se movió. */
export async function moverPaso(
  repo: Repo,
  datos: DatosMinisterio,
  paso: Paso,
  dir: -1 | 1,
): Promise<boolean> {
  const lista = moverEnLista(datos.pasos, paso.ambito, paso.id, dir);
  if (!lista) return false;
  for (const p of lista) await repo.guardar('pasos', p);
  return true;
}

/** Crea un paso: en Misión entra al camino antes del gozne; en
 * Miembros, como peldaño manual al final de la escalera. */
export async function crearPaso(
  repo: Repo,
  datos: DatosMinisterio,
  ambito: Paso['ambito'],
  nombre: string,
  emoji: string,
): Promise<Paso> {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('El paso necesita un nombre.');
  if (nombreRepetido(datos.pasos, ambito, limpio)) {
    throw new Error(`Ya hay un paso llamado «${limpio}» en este ámbito.`);
  }
  const nuevo: Paso = {
    id: nuevoId(),
    ambito,
    nombre: limpio,
    emoji: emoji.trim() || '•',
    orden: 0,
    ...(ambito === 'mision' ? { rol: 'camino' as const } : { fuente: 'manual' as const }),
  };
  for (const p of listaConPasoNuevo(datos.pasos, nuevo)) await repo.guardar('pasos', p);
  return nuevo;
}

/** Borra un paso si las protecciones lo permiten; el ámbito se
 * renumera para no dejar huecos. */
export async function borrarPasoAccion(
  repo: Repo,
  datos: DatosMinisterio,
  paso: Paso,
): Promise<void> {
  const veredicto = puedeBorrarPaso(datos, paso);
  if (!veredicto.ok) throw new Error(veredicto.motivo);
  await repo.borrar('pasos', paso.id);
  const restantes = renumerar(
    pasosDelAmbito(datos.pasos, paso.ambito).filter((p) => p.id !== paso.id),
  );
  for (const p of restantes) await repo.guardar('pasos', p);
}

// ── Reuniones: el parte, con sus vínculos ────────────────────────────
// El parte guarda los conteos. Su ofrenda vive como Aporte del grupo
// en Bien Común (reunionId), sus diezmos como Aportes de cada persona
// (reunionId) y sus almuerzos/sopas y los regalos del Tesoro como
// Entregas de Manos Abiertas (reunionId): el parte es el editor de
// todos ellos.

const NOMBRE_CAMPANA: Record<'Almuerzo' | 'Sopa', string> = {
  Almuerzo: 'Almuerzo con Jesús',
  Sopa: 'Sopa con Jesús',
};

const sinAcentos = (t: string) =>
  t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** La campaña de Manos Abiertas de cada comida; si no existe, nace
 * con el nombre de la casa. */
async function campanaDeComida(
  repo: Repo,
  datos: DatosMinisterio,
  tipo: 'Almuerzo' | 'Sopa',
  creadas: Campana[],
): Promise<Campana> {
  const busca = tipo === 'Almuerzo' ? 'almuerzo' : 'sopa';
  const casa = sinAcentos(NOMBRE_CAMPANA[tipo]);
  const todas = [...datos.campanas, ...creadas];
  // La campaña de la casa manda: primero el nombre de la casa
  // («Almuerzo con Jesús»), después el nombre exacto («almuerzo»)
  // y solo al final cualquier nombre que contenga la palabra.
  // Antes decidía el orden de la base y las comidas caían en la
  // campaña «almuerzo» en vez de en «Almuerzo con Jesús».
  const existente =
    todas.find((c) => sinAcentos(c.nombre).trim() === casa) ??
    todas.find((c) => sinAcentos(c.nombre).trim() === busca) ??
    todas.find((c) => sinAcentos(c.nombre).includes(busca));
  if (existente) return existente;
  const nueva = await crearCampana(repo, { nombre: NOMBRE_CAMPANA[tipo], estado: 'En curso' });
  creadas.push(nueva);
  return nueva;
}

async function sincronizarOfrendaDelParte(
  repo: Repo,
  datos: DatosMinisterio,
  reunion: Reunion,
  ofrenda: number,
): Promise<void> {
  const previa = datos.aportes.find((a) => a.reunionId === reunion.id && a.grupoId);
  if (ofrenda > 0) {
    if (previa) {
      await actualizarAporte(repo, { ...previa, fecha: reunion.fecha, monto: ofrenda });
    } else if (
      await adoptarOfrendaSuelta(repo, datos, reunion, ofrenda)
    ) {
      // La ofrenda de esa reunión ya estaba en Bien Común (las
      // históricas entraron sin vínculo): quedó enlazada al parte
      // en vez de crear otra. Registrar el parte viejo no duplica.
    } else {
      await registrarAporte(repo, {
        grupoId: reunion.grupoId,
        reunionId: reunion.id,
        fecha: reunion.fecha,
        monto: ofrenda,
        tipo: 'Ofrenda',
      });
    }
  } else if (previa) {
    await borrarAporte(repo, previa.id);
  }
}

async function adoptarOfrendaSuelta(
  repo: Repo,
  datos: DatosMinisterio,
  reunion: Reunion,
  ofrenda: number,
): Promise<boolean> {
  const sueltas = datos.aportes.filter(
    (a) =>
      a.grupoId === reunion.grupoId &&
      !a.reunionId &&
      a.fecha === reunion.fecha &&
      a.tipo === 'Ofrenda',
  );
  const adoptable = sueltas.find((a) => a.monto === ofrenda) ?? sueltas[0];
  if (!adoptable) return false;
  await actualizarAporte(repo, {
    ...adoptable,
    reunionId: reunion.id,
    fecha: reunion.fecha,
    monto: ofrenda,
  });
  return true;
}

async function sincronizarComidaDelParte(
  repo: Repo,
  datos: DatosMinisterio,
  reunion: Reunion,
  tipo: 'Almuerzo' | 'Sopa',
  cantidad: number,
  creadas: Campana[],
): Promise<void> {
  const previa = datos.entregas.find((e) => e.reunionId === reunion.id && e.tipo === tipo);
  if (cantidad > 0) {
    const campana = await campanaDeComida(repo, datos, tipo, creadas);
    const grupo = datos.grupos.find((g) => g.id === reunion.grupoId);
    const base: Omit<Entrega, 'id'> = {
      campanaId: campana.id,
      beneficiarioNombre: grupo?.nombre,
      fecha: reunion.fecha,
      tipo,
      cantidad,
      unidad: 'raciones',
      reunionId: reunion.id,
    };
    // Adopción, como con la ofrenda: una entrega suelta de esa
    // campaña en la misma fecha es la de esta reunión.
    const adoptable = previa
      ? undefined
      : datos.entregas.find(
          (e) =>
            !e.reunionId &&
            e.campanaId === campana.id &&
            e.fecha === reunion.fecha &&
            sinAcentos(e.tipo ?? '') === sinAcentos(tipo),
        );
    const existente = previa ?? adoptable;
    if (existente) await actualizarEntrega(repo, { ...existente, ...base });
    else await registrarEntrega(repo, base);
  } else if (previa) {
    await borrarEntrega(repo, previa.id);
  }
}

/** Un diezmo anotado en el parte: la persona y su monto. Al
 * guardar, pasa a Bien Común como su aporte de Diezmo de esa
 * fecha, enlazado al parte (reunionId). */
export interface DiezmoDelParte {
  personaId: string;
  monto: number;
}

async function sincronizarDiezmosDelParte(
  repo: Repo,
  datos: DatosMinisterio,
  reunion: Reunion,
  diezmos: DiezmoDelParte[],
): Promise<void> {
  const delParte = datos.aportes.filter((a) => a.reunionId === reunion.id && a.personaId);
  const reclamados = new Set<string>();
  const conFicha = new Set(datos.diezmadores.map((d) => d.personaId));
  for (const d of diezmos) {
    if (!d.personaId || !(d.monto > 0)) continue;
    const propio = delParte.find((a) => a.personaId === d.personaId);
    if (propio) {
      reclamados.add(propio.id);
      await actualizarAporte(repo, { ...propio, fecha: reunion.fecha, monto: d.monto, tipo: 'Diezmo' });
    } else {
      // Adopción (como la ofrenda en v58): un diezmo suelto de la
      // misma persona y la misma fecha es el de esta reunión.
      const suelto = datos.aportes.find(
        (a) =>
          !a.reunionId &&
          !reclamados.has(a.id) &&
          a.personaId === d.personaId &&
          a.fecha === reunion.fecha &&
          a.tipo === 'Diezmo',
      );
      if (suelto) {
        reclamados.add(suelto.id);
        await actualizarAporte(repo, { ...suelto, reunionId: reunion.id, monto: d.monto });
      } else {
        await registrarAporte(repo, {
          personaId: d.personaId,
          reunionId: reunion.id,
          fecha: reunion.fecha,
          monto: d.monto,
          tipo: 'Diezmo',
        });
      }
    }
    // Quien diezma queda de diezmador: su ficha nace con el diezmo.
    if (!conFicha.has(d.personaId)) {
      await crearDiezmador(repo, datos, d.personaId);
      conFicha.add(d.personaId);
    }
  }
  // Los que el parte ya no trae, se borran: el parte es su editor.
  for (const a of delParte) {
    if (!reclamados.has(a.id)) await borrarAporte(repo, a.id);
  }
}

/** La campaña del proyecto Tesoro en Manos Abiertas. */
const NOMBRE_CAMPANA_TESORO = 'Tesoro de Manos Abiertas';

/** La campaña del Tesoro entre las que hay (la de la casa manda:
 * primero el nombre exacto y solo al final cualquiera que contenga
 * «tesoro», como con las comidas); sin crearla todavía. */
function campanaTesoroExistente(todas: Campana[]): Campana | undefined {
  const casa = sinAcentos(NOMBRE_CAMPANA_TESORO);
  return (
    todas.find((c) => sinAcentos(c.nombre).trim() === casa) ??
    todas.find((c) => sinAcentos(c.nombre).includes('tesoro'))
  );
}

/** Un regalo del Tesoro anotado en el parte: quién recibió (una
 * persona de la casa, con su personaId, o una visita, solo con el
 * nombre escrito), qué se le entregó y un detalle opcional. Sin
 * costo: son regalos, no compras. Al guardar, pasa a Manos Abiertas
 * como una Entrega de la campaña «Tesoro de Manos Abiertas» de esa
 * fecha, enlazada al parte (reunionId). */
export interface TesoroDelParte {
  personaId?: string;
  nombre: string;
  /** 'Alimentos' | 'Aseo' | 'Ambos' */
  tipo: string;
  /** El producto que se entrega (arroz, aceite, jabón…). */
  producto?: string;
  /** Cuántas unidades van en la entrega; si falta, 1. */
  cantidad?: number;
  detalle?: string;
}

async function sincronizarTesoroDelParte(
  repo: Repo,
  datos: DatosMinisterio,
  reunion: Reunion,
  tesoros: TesoroDelParte[],
  creadas: Campana[],
): Promise<void> {
  const validos = tesoros.filter((t) => t.nombre.trim());
  const existente = campanaTesoroExistente([...datos.campanas, ...creadas]);
  // Las entregas que este parte ya tenía en la campaña del Tesoro.
  const delParte = existente
    ? datos.entregas.filter((e) => e.reunionId === reunion.id && e.campanaId === existente.id)
    : [];
  if (validos.length === 0 && delParte.length === 0) return;
  let campana = existente;
  if (!campana) {
    campana = await crearCampana(repo, { nombre: NOMBRE_CAMPANA_TESORO, estado: 'En curso' });
    creadas.push(campana);
  }
  const reclamados = new Set<string>();
  const mismaPersona = (e: { personaId?: string; beneficiarioNombre?: string }, t: TesoroDelParte) =>
    t.personaId
      ? e.personaId === t.personaId
      : !e.personaId &&
        sinAcentos(e.beneficiarioNombre ?? '').trim() === sinAcentos(t.nombre).trim();
  for (const t of validos) {
    const base: Omit<Entrega, 'id'> = {
      campanaId: campana.id,
      personaId: t.personaId,
      beneficiarioNombre: t.nombre.trim(),
      fecha: reunion.fecha,
      tipo: t.tipo,
      producto: t.producto?.trim() || undefined,
      cantidad: t.cantidad && t.cantidad > 0 ? Math.floor(t.cantidad) : 1,
      unidad: 'regalo',
      reunionId: reunion.id,
      notas: t.detalle?.trim() || undefined,
    };
    const propio = delParte.find((e) => !reclamados.has(e.id) && mismaPersona(e, t));
    if (propio) {
      reclamados.add(propio.id);
      await actualizarEntrega(repo, { ...propio, ...base });
    } else {
      // Adopción (como la ofrenda y los diezmos): una entrega suelta
      // de la campaña, de la misma fecha y la misma persona, es la
      // de esta reunión — se enlaza en vez de duplicarse.
      const suelta = datos.entregas.find(
        (e) =>
          !e.reunionId &&
          !reclamados.has(e.id) &&
          e.campanaId === campana.id &&
          e.fecha === reunion.fecha &&
          mismaPersona(e, t),
      );
      if (suelta) {
        reclamados.add(suelta.id);
        await actualizarEntrega(repo, { ...suelta, ...base });
      } else {
        await registrarEntrega(repo, base);
      }
    }
  }
  // Los que el parte ya no trae, se borran: el parte es su editor.
  for (const e of delParte) {
    if (!reclamados.has(e.id)) await borrarEntrega(repo, e.id);
  }
}

async function sincronizarVinculosDelParte(
  repo: Repo,
  datos: DatosMinisterio,
  reunion: Reunion,
  ofrenda: number,
  diezmos: DiezmoDelParte[],
  tesoros: TesoroDelParte[] = [],
): Promise<void> {
  const creadas: Campana[] = [];
  await sincronizarOfrendaDelParte(repo, datos, reunion, ofrenda);
  await sincronizarDiezmosDelParte(repo, datos, reunion, diezmos);
  await sincronizarComidaDelParte(repo, datos, reunion, 'Almuerzo', reunion.almuerzos, creadas);
  await sincronizarComidaDelParte(repo, datos, reunion, 'Sopa', reunion.sopas, creadas);
  await sincronizarTesoroDelParte(repo, datos, reunion, tesoros, creadas);
}

export async function registrarReunion(
  repo: Repo,
  datos: DatosMinisterio,
  entrada: Omit<Reunion, 'id'>,
  ofrenda: number,
  diezmos: DiezmoDelParte[] = [],
  tesoros: TesoroDelParte[] = [],
): Promise<Reunion> {
  const completa: Reunion = { ...entrada, id: nuevoId() };
  await repo.guardar('reuniones', completa);
  await sincronizarVinculosDelParte(repo, datos, completa, ofrenda, diezmos, tesoros);
  return completa;
}

export async function actualizarReunion(
  repo: Repo,
  datos: DatosMinisterio,
  reunion: Reunion,
  ofrenda: number,
  diezmos: DiezmoDelParte[] = [],
  tesoros: TesoroDelParte[] = [],
): Promise<void> {
  await repo.guardar('reuniones', reunion);
  await sincronizarVinculosDelParte(repo, datos, reunion, ofrenda, diezmos, tesoros);
}

/** Borrar el parte borra también su ofrenda y sus entregas: son el
 * mismo hecho contado en tres libros. */
export async function borrarReunion(
  repo: Repo,
  datos: DatosMinisterio,
  id: string,
): Promise<void> {
  for (const a of datos.aportes.filter((x) => x.reunionId === id)) {
    await borrarAporte(repo, a.id);
  }
  for (const e of datos.entregas.filter((x) => x.reunionId === id)) {
    await borrarEntrega(repo, e.id);
  }
  await repo.borrar('reuniones', id);
}
