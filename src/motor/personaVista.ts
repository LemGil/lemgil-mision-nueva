// La ficha de la persona (plano §6.3): la persona y TODOS sus procesos en
// una trayectoria. La situación sale de la misma clasificación del censo —
// lo que Personas dice de alguien es lo que el censo contó de él.

import { pasoPorId } from '../modelo/catalogo';
import type {
  Beneficiario,
  Conversion,
  DatosMinisterio,
  Diezmador,
  Estudiante,
  Miembro,
  Persona,
} from '../modelo/tipos';
import { clasificarPersona } from './censo';
import { escaleraDeMiembro, type EscaleraMiembro } from './miembros';
import { procesosRepetidos, type ProcesoRepetido } from './repetidos';

export type TonoSituacion = 'verde' | 'ambar' | 'rojo' | 'gris' | 'info';

export interface Situacion {
  texto: string;
  tono: TonoSituacion;
}

export function situacionDe(datos: DatosMinisterio, personaId: string): Situacion {
  const { clase, pasoId } = clasificarPersona(datos, personaId);
  const paso = pasoId ? pasoPorId(datos.pasos, pasoId) : undefined;
  switch (clase) {
    case 'fallecido':
      return { texto: 'Fallecido', tono: 'gris' };
    case 'apartado': {
      const nombre = datos.pasos.find((p) => p.id === 'ps-apartado')?.nombre ?? 'Apartado';
      return { texto: nombre, tono: 'rojo' };
    }
    case 'salida': {
      const conv = datos.conversiones.find(
        (c) => c.personaId === personaId && pasoPorId(datos.pasos, c.estado)?.rol === 'salida',
      );
      const nombre = conv ? (pasoPorId(datos.pasos, conv.estado)?.nombre ?? 'Salida') : 'Salida';
      return { texto: nombre, tono: 'info' };
    }
    case 'trasladado':
      return { texto: 'Trasladado', tono: 'info' };
    case 'inactivo':
      return { texto: 'Miembro inactivo', tono: 'ambar' };
    case 'miembro':
      return { texto: 'Miembro activo', tono: 'verde' };
    case 'gozne': {
      const gozne = datos.pasos.find((p) => p.rol === 'gozne');
      return { texto: gozne?.nombre ?? 'Añadidos', tono: 'verde' };
    }
    case 'etapa':
      return { texto: paso ? `${paso.emoji} ${paso.nombre}` : 'En proceso', tono: 'ambar' };
    default:
      return { texto: 'Sin procesos', tono: 'gris' };
  }
}

export interface MisionEnFicha {
  conversion: Conversion;
  pasoNombre: string;
  pasoEmoji: string;
  historial: { fecha: string; pasoNombre: string; nota?: string }[];
}

export interface FichaPersona {
  persona: Persona;
  situacion: Situacion;
  mision: MisionEnFicha[];
  miembros: Miembro[];
  escaleras: { miembro: Miembro; escalera: EscaleraMiembro }[];
  estudiante?: Estudiante;
  diezmador?: Diezmador;
  beneficiario?: Beneficiario;
  repetidos: ProcesoRepetido[];
}

export function fichaDePersona(datos: DatosMinisterio, personaId: string): FichaPersona | null {
  const persona = datos.personas.find((p) => p.id === personaId);
  if (!persona) return null;
  const nombrePaso = (id: string) => pasoPorId(datos.pasos, id)?.nombre ?? id;
  const emojiPaso = (id: string) => pasoPorId(datos.pasos, id)?.emoji ?? '';
  const miembros = datos.miembros.filter((m) => m.personaId === personaId);
  return {
    persona,
    situacion: situacionDe(datos, personaId),
    mision: datos.conversiones
      .filter((c) => c.personaId === personaId)
      .map((conversion) => ({
        conversion,
        pasoNombre: nombrePaso(conversion.estado),
        pasoEmoji: emojiPaso(conversion.estado),
        historial: (conversion.historial ?? []).map((h) => ({
          fecha: h.fecha,
          pasoNombre: nombrePaso(h.estado),
          nota: h.nota,
        })),
      })),
    miembros,
    escaleras: miembros.map((miembro) => ({
      miembro,
      escalera: escaleraDeMiembro(datos, miembro),
    })),
    estudiante: datos.estudiantes.find((e) => e.personaId === personaId),
    diezmador: datos.diezmadores.find((d) => d.personaId === personaId),
    beneficiario: datos.beneficiarios.find((b) => b.personaId === personaId),
    repetidos: procesosRepetidos(datos).get(personaId) ?? [],
  };
}

const sinAcentos = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const soloDigitos = (s: string) => s.replace(/\D/g, '');

/** Búsqueda de la lista de Personas: nombre, teléfono (por dígitos) o carné. */
export function buscarPersonas(datos: DatosMinisterio, texto: string): Persona[] {
  const q = sinAcentos(texto.trim());
  const digitos = soloDigitos(texto);
  if (!q && !digitos) return datos.personas;
  return datos.personas.filter((p) => {
    const nombreCompleto = sinAcentos(`${p.nombre} ${p.apellidos ?? ''}`);
    if (q && nombreCompleto.includes(q)) return true;
    if (digitos.length >= 3) {
      if (p.telefono && soloDigitos(p.telefono).includes(digitos)) return true;
      if (p.numeroIdentidad && soloDigitos(p.numeroIdentidad).includes(digitos)) return true;
    }
    return false;
  });
}
