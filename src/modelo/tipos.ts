// El modelo congelado (plano §2). La persona es el centro; cada módulo es un
// proceso con personaId sobre ella. Ningún proceso guarda datos personales
// propios: los lee del núcleo.

export type Sexo = 'M' | 'F' | null;

export interface Persona {
  id: string;
  nombre: string;
  apellidos?: string;
  /** Identificador principal: único e intransferible. Su duplicado se bloquea. */
  numeroIdentidad?: string;
  telefono?: string;
  direccion?: string;
  zona?: string;
  sexo?: Sexo;
  fechaNacimiento?: string; // YYYY-MM-DD
  profesion?: string;
  estadoCivil?: string;
  contactoPreferido?: string;
  grupoId?: string | null;
  /** personaId de su hermano mayor (uno solo). */
  hermanoMayorId?: string | null;
  bautizado?: boolean;
  fechaBautismo?: string;
  lat?: number | null;
  lng?: number | null;
}

export type AmbitoPaso = 'mision' | 'miembros';
export type RolPasoMision = 'inicio' | 'camino' | 'gozne' | 'salida';
/** De dónde se cumple un paso de la escalera de Miembros (su fuente viva). */
export type FuentePasoMiembro =
  | 'grupo'
  | 'diezmo'
  | 'academia'
  | 'ministerio'
  | 'hermanoMayor'
  | 'manual';

export interface Paso {
  id: string; // identidad estable; el nombre es dato editable
  ambito: AmbitoPaso;
  nombre: string;
  emoji: string;
  orden: number;
  rol?: RolPasoMision; // solo ámbito 'mision'
  fuente?: FuentePasoMiembro; // solo ámbito 'miembros'
  protegido?: boolean; // renombrable, nunca borrable ni pierde su función
}

export interface EntradaHistorial {
  fecha: string; // YYYY-MM-DD
  estado: string; // pasoId al que entró
  nota?: string;
}

/** El proceso de Misión: la conversión. `estado` guarda el pasoId actual. */
export interface Conversion {
  id: string;
  personaId: string;
  estado: string;
  fecha: string; // fecha de registro
  historial: EntradaHistorial[];
  bautizado?: boolean;
}

export type EstadoMiembro =
  | 'Activo'
  | 'Inactivo'
  | 'Trasladado'
  | 'Fallecido'
  | 'Disciplinado';

export interface Miembro {
  id: string;
  personaId: string;
  estado: EstadoMiembro;
  fechaIngreso: string; // su fecha común: la cohorte se mide por ella
  conversionId?: string | null;
  grupoId?: string | null;
}

export interface Estudiante {
  id: string;
  personaId: string;
  estado: string; // 'Activo' | 'Inactivo' | …
}

export interface Diezmador {
  id: string;
  personaId: string;
  activo: boolean;
}

export interface Beneficiario {
  id: string;
  personaId?: string | null;
  estado: string;
}

/** Un hito en la ficha del miembro: su historia; de ellos se alimenta la escalera. */
export interface Hito {
  id: string;
  personaId: string;
  pasoId?: string | null; // paso de la escalera que este hito cumple (fuente 'manual')
  tipo?: string;
  fecha?: string;
}

/** Servicio de una persona en un ministerio (fuente viva del paso Ministerio). */
export interface AsignacionMinisterio {
  id: string;
  personaId: string;
  ministerio: string;
}

/** Un grupo de la iglesia. Sus miembros son las personas/miembros con su grupoId. */
export interface Grupo {
  id: string;
  nombre: string;
  liderId?: string | null; // personaId del líder
  zona?: string;
  lat?: number | null;
  lng?: number | null;
}

/** Un evangelismo: líder y participantes son personas de la ficha única. */
export interface Evangelismo {
  id: string;
  fecha: string;
  lugar?: string;
  liderId?: string | null;
  participanteIds: string[];
  notas?: string;
}

/** Un aporte en Bien Común (diezmo u ofrenda) de un diezmador. */
export interface Aporte {
  id: string;
  personaId: string;
  fecha: string;
  monto: number;
  tipo: 'Diezmo' | 'Ofrenda';
}

/** Todo lo que el motor de conteo necesita. Nada más que esto cuenta. */
export interface DatosMinisterio {
  personas: Persona[];
  conversiones: Conversion[];
  miembros: Miembro[];
  estudiantes: Estudiante[];
  diezmadores: Diezmador[];
  beneficiarios: Beneficiario[];
  hitos: Hito[];
  asignaciones: AsignacionMinisterio[];
  grupos: Grupo[];
  evangelismos: Evangelismo[];
  aportes: Aporte[];
  pasos: Paso[];
}

export interface Periodo {
  desde: string; // YYYY-MM-DD, inclusivo
  hasta: string; // YYYY-MM-DD, inclusivo
}
