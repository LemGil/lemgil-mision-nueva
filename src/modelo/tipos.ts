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
  conyuge?: string;
  /** Cantidad de hijos, como texto (así viene del registro original). */
  hijos?: string;
  email?: string;
  contactoPreferido?: string;
  grupoId?: string | null;
  grupoIds?: string[];
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
  grupoIds?: string[];
}

export interface Estudiante {
  id: string;
  personaId: string;
  estado: string; // 'Activo' | 'Inactivo' | …
}

/** Una academia del catálogo de la Academia del Espíritu: su nombre
 * («Descodificando la Salvación») y su nivel («Nivel I» — el nivel
 * nace del uso, como las Zonas). */
export interface Academia {
  id: string;
  nombre: string;
  nivel: string;
}

/** El encuentro final de una academia, en una fecha: los alumnos
 * que lo recibieron ese día (sus personaId). Estar en un encuentro
 * de una academia es haberla concluido — la formación se sella en
 * persona, con el Maestro. Un registro por encuentro, editable,
 * como el parte es un registro por reunión. */
export interface Encuentro {
  id: string;
  academiaId: string;
  fecha: string;
  alumnoIds: string[];
}

export interface Diezmador {
  id: string;
  personaId: string;
  activo: boolean;
}

export interface Beneficiario {
  id: string;
  personaId?: string | null;
  /** 'Persona' | 'Familia' | 'Grupo' — a quién se ayuda. */
  tipo?: string;
  /** Nombre propio cuando es Familia o Grupo (una casa, un comedor…). */
  nombre?: string;
  /** Quién responde por la familia o el grupo. */
  representante?: string;
  /** Cuántas personas forman la familia o el grupo. */
  familia?: number;
  telefono?: string;
  zona?: string;
  estado: string;
}

/** Una campaña de Manos Abiertas (Desayuno con Jesús, Sopa con Jesús…). */
export interface Campana {
  id: string;
  nombre: string;
  fechaInicio?: string;
  fechaFin?: string;
  zona?: string;
  tipo?: string;
  metaFamilias?: number;
  metaTipo?: string;
  responsable?: string;
  /** 'Planificada' | 'En curso' | 'Terminada' */
  estado: string;
  descripcion?: string;
}

/** Una entrega hecha dentro de una campaña. El beneficiario puede ser un
 * registro de Manos Abiertas (beneficiarioId) o un nombre escrito a mano
 * (beneficiarioNombre), como trabajaba la app anterior. */
export interface Entrega {
  id: string;
  campanaId: string;
  beneficiarioId?: string;
  beneficiarioNombre?: string;
  /** Si quien recibió es una persona de la ficha única (los regalos
   * del Tesoro que anota el parte), su id; el nombre va también en
   * beneficiarioNombre, para que Manos Abiertas lo muestre sin
   * tener que resolver la ficha. Una visita no lleva personaId:
   * queda solo su nombre escrito. */
  personaId?: string;
  fecha: string;
  tipo?: string;
  cantidad?: number;
  unidad?: string;
  /** El producto entregado (los regalos del Tesoro que anota el
   * parte: arroz, aceite, jabón…); cuántas unidades, en `cantidad`. */
  producto?: string;
  /** Si nació del parte de reunión, su id: el parte es su editor. */
  reunionId?: string;
  notas?: string;
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
  /** Quién está al frente del ministerio (uno por ministerio). */
  responsable?: boolean;
}

/** Un ministerio de la casa, con su ficha propia (pedido de LemGil,
 * 2026-11-27): su nombre, cuándo inició o se formó, la misión que
 * tendrá y quién está al frente como responsable — aquí nadie es
 * «líder»: somos servidores. Su gente son las asignaciones con su
 * nombre; un ministerio del catálogo se ve aunque aún no tenga
 * gente, y uno que solo vive en asignaciones se adopta al editarlo. */
export interface Ministerio {
  id: string;
  nombre: string;
  /** Fecha de inicio o formación (ISO). */
  inicio?: string;
  /** La misión que el ministerio tendrá. */
  mision?: string;
  /** La persona al frente (responsable). Al guardar queda también
   * como participante: estar al frente es servir ahí. */
  responsableId?: string | null;
}

/** Un grupo de la iglesia. Sus miembros son las personas/miembros con su grupoId. */
export interface Grupo {
  id: string;
  nombre: string;
  tipo?: string;
  padreId?: string | null;
  liderId?: string | null; // personaId del líder
  /** El líder en texto libre (p. ej. «Pastores Luis y Daymi»): si está
   * puesto, es el que se muestra; el de la app anterior era así. */
  liderTexto?: string;
  zona?: string;
  dia?: string; // día de reunión («Domingo»)
  hora?: string; // hora de reunión («10:30»)
  lugar?: string; // dónde se reúne («CASA CENTRO»)
  capacidad?: number; // la meta de asignados; sin capacidad no hay barra
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
  /** El dueño: una persona (su diezmador) O un grupo — nunca los dos.
   * Los diezmos son siempre de persona; las ofrendas recogidas en la
   * reunión son del grupo. */
  personaId?: string;
  grupoId?: string;
  /** Si nació del parte de reunión, su id: el parte es su editor. */
  reunionId?: string;
  fecha: string;
  monto: number;
  tipo: 'Diezmo' | 'Ofrenda';
  metodo?: string;
  referencia?: string;
  notas?: string;
}

/**
 * El parte de una reunión: los conteos que se toman en cada reunión
 * para ver cómo va funcionando (asistencia, visitas, profesiones,
 * comidas repartidas). Es estadística de la reunión, NO fichas de
 * personas: no toca el censo ni los procesos de Misión. Su ofrenda
 * vive como Aporte del grupo en Bien Común (reunionId) y sus
 * almuerzos/sopas como Entregas en Manos Abiertas (reunionId).
 */
export interface Reunion {
  id: string;
  grupoId: string;
  fecha: string;
  personas: number;
  mujeres: number;
  hombres: number;
  ninos: number;
  visitas: number;
  nuevosCongregados: number;
  profesiones: number;
  almuerzos: number;
  sopas: number;
  notas?: string;
}

/**
 * Un colaborador de la Red: apoyo externo (persona, iglesia, ministerio…).
 * NO es una persona de la ficha única: vive en su propio registro.
 */
export interface Colaborador {
  id: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  /** 'Activo' | 'Inactivo' */
  estado: string;
  /** 'Persona' | 'Iglesia' | 'Ministerio' | 'Empresa' | 'Otro' */
  tipo?: string;
  planOfrendaTipo?: string;
  planOfrendaMonto?: number;
  notas?: string;
}

/** Un aporte de un colaborador de la Red. */
export interface AporteRed {
  id: string;
  colaboradorId: string;
  fecha: string;
  monto: number;
  tipo: string;
  metodo?: string;
  referencia?: string;
  notas?: string;
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
  colaboradores: Colaborador[];
  aportesRed: AporteRed[];
  campanas: Campana[];
  entregas: Entrega[];
  reuniones: Reunion[];
  academias: Academia[];
  encuentros: Encuentro[];
  ministerios: Ministerio[];
  pasos: Paso[];
}

export interface Periodo {
  desde: string; // YYYY-MM-DD, inclusivo
  hasta: string; // YYYY-MM-DD, inclusivo
}
