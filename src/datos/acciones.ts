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
import type {
  Aporte,
  Beneficiario,
  Conversion,
  DatosMinisterio,
  Diezmador,
  Estudiante,
  Evangelismo,
  Grupo,
  Hito,
  Miembro,
  Persona,
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

  let conversion: Conversion | null = null;
  if (altas.integrado) {
    conversion = await crearConversionInterna(repo, datos, persona.id, PS_INTEGRADO, hoy);
    await crearMiembroInterno(repo, persona.id, conversion.id, hoy);
  } else if (altas.mision) {
    conversion = await crearConversionInterna(
      repo,
      datos,
      persona.id,
      PASO_DE_ENTRADA[altas.mision],
      hoy,
    );
  }
  if (altas.beneficiario) {
    await repo.guardar('beneficiarios', {
      id: nuevoId(),
      personaId: persona.id,
      estado: 'Activo',
    });
  }
  return persona;
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

export async function crearBeneficiario(
  repo: Repo,
  datos: DatosMinisterio,
  personaId: string,
): Promise<Beneficiario> {
  if (datos.beneficiarios.some((b) => b.personaId === personaId)) {
    throw new Error('Esta persona ya es beneficiaria en Manos Abiertas.');
  }
  const beneficiario: Beneficiario = { id: nuevoId(), personaId, estado: 'Activo' };
  await repo.guardar('beneficiarios', beneficiario);
  return beneficiario;
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
