// La base local y el contrato uniforme (plano §5).
// TODA tabla remota tiene exactamente las mismas columnas:
//   id text · version int · actualizado text · borrado bool · datos jsonb
// El contenido del registro viaja entero dentro de `datos`: el espejo remoto
// no interpreta el dominio, así que no hay columnas que falten, sobren o
// choquen — la clase de errores que persiguió a la app actual no puede nacer.
// Localmente cada registro lleva el sobre {version, actualizado, borrado}
// junto a sus campos; el motor de conteo nunca lo ve (ver aDatosMinisterio).

import Dexie, { type Table } from 'dexie';

export const TABLAS = [
  'personas',
  'conversiones',
  'miembros',
  'estudiantes',
  'diezmadores',
  'beneficiarios',
  'hitos',
  'asignaciones',
  'pasos',
  'grupos',
  'evangelismos',
  'aportes',
  'colaboradores',
  'aportesRed',
  'campanas',
  'entregas',
] as const;

export type Tabla = (typeof TABLAS)[number];

/** Un registro tal como vive en la base local y viaja al espejo. */
export type Fila = Record<string, unknown> & {
  id: string;
  version: number;
  actualizado: string;
  borrado?: boolean;
};

export interface EntradaSalida {
  clave: string; // `${tabla}:${id}`
  tabla: Tabla;
  id: string;
  encolado: string;
}

export interface MetaKV {
  clave: string;
  valor: unknown;
}

export class BaseLocal extends Dexie {
  personas!: Table<Fila, string>;
  conversiones!: Table<Fila, string>;
  miembros!: Table<Fila, string>;
  estudiantes!: Table<Fila, string>;
  diezmadores!: Table<Fila, string>;
  beneficiarios!: Table<Fila, string>;
  hitos!: Table<Fila, string>;
  asignaciones!: Table<Fila, string>;
  pasos!: Table<Fila, string>;
  grupos!: Table<Fila, string>;
  evangelismos!: Table<Fila, string>;
  aportes!: Table<Fila, string>;
  colaboradores!: Table<Fila, string>;
  aportesRed!: Table<Fila, string>;
  campanas!: Table<Fila, string>;
  entregas!: Table<Fila, string>;
  salida!: Table<EntradaSalida, string>;
  meta!: Table<MetaKV, string>;

  constructor(nombre = 'mision-nueva') {
    super(nombre);
    // v1: las 12 tablas originales. v2: + la Red de Colaboradores.
    // v3: + Campañas y Entregas de Manos Abiertas.
    const v1 = [
      'personas', 'conversiones', 'miembros', 'estudiantes', 'diezmadores',
      'beneficiarios', 'hitos', 'asignaciones', 'pasos', 'grupos',
      'evangelismos', 'aportes',
    ];
    const tiendasV1: Record<string, string> = { salida: 'clave', meta: 'clave' };
    for (const t of v1) tiendasV1[t] = 'id';
    this.version(1).stores(tiendasV1);
    const tiendasV2: Record<string, string> = { salida: 'clave', meta: 'clave' };
    for (const t of [...v1, 'colaboradores', 'aportesRed']) tiendasV2[t] = 'id';
    this.version(2).stores(tiendasV2);
    const tiendas: Record<string, string> = { salida: 'clave', meta: 'clave' };
    for (const t of TABLAS) tiendas[t] = 'id';
    this.version(3).stores(tiendas);
  }

  tabla(nombre: Tabla): Table<Fila, string> {
    return this.table(nombre) as Table<Fila, string>;
  }
}

/**
 * Si otra pestaña/equipo sube la versión del esquema, esta conexión se
 * cierra y la vista se recarga: nunca se sigue trabajando sobre una base
 * cerrada (la lección del DatabaseClosedError de 2026-11-05).
 */
export function instalarVigilanciaDeVersion(db: BaseLocal, alCerrar: () => void): void {
  db.on('versionchange', () => {
    void db.close();
    alCerrar();
  });
}
