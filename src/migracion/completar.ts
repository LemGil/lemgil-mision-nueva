// Completar datos de personas desde el respaldo, DESPUÉS de la migración:
// la primera conversión dejó campos sin mapear (apellidos venían en
// singular, y no viajaban profesión, estado civil, bautismo, cónyuge,
// hijos…). Esto rellena SOLO los huecos de las personas que ya existen en
// la app: nunca sobrescribe un dato, nunca crea a nadie, nunca toca los
// procesos.

import type { Repo } from '../datos/repo';
import type { Persona } from '../modelo/tipos';
import { convertirRespaldo, type RespaldoViejo } from './convertir';

const CAMPOS_TEXTO = [
  'apellidos',
  'numeroIdentidad',
  'telefono',
  'fechaNacimiento',
  'direccion',
  'zona',
  'profesion',
  'estadoCivil',
  'contactoPreferido',
  'email',
  'conyuge',
  'hijos',
  'fechaBautismo',
] as const;

export const ETIQUETA_CAMPO: Record<string, string> = {
  apellidos: 'apellidos',
  numeroIdentidad: 'Nº de Identidad',
  telefono: 'teléfono',
  fechaNacimiento: 'fecha de nacimiento',
  direccion: 'dirección',
  zona: 'zona',
  profesion: 'profesión',
  estadoCivil: 'estado civil',
  contactoPreferido: 'contacto preferido',
  email: 'correo',
  conyuge: 'cónyuge',
  hijos: 'hijos',
  fechaBautismo: 'fecha de bautismo',
  sexo: 'sexo',
  bautizado: 'bautismo',
  grupoId: 'grupo',
  hermanoMayorId: 'hermano mayor',
  lat: 'ubicación',
  lng: 'ubicación',
};

export interface ResumenCompletar {
  personas: number;
  campos: Record<string, number>;
}

export interface CambioCompletar {
  local: Persona;
  relleno: Partial<Persona>;
}

const vacio = (v: unknown) => v === undefined || v === null || v === '';

/** Los campos que el respaldo puede rellenar en esta ficha (solo huecos). */
export function rellenosPara(local: Persona, remota: Persona): Partial<Persona> {
  const r: Partial<Persona> = {};
  for (const c of CAMPOS_TEXTO) {
    if (vacio(local[c]) && !vacio(remota[c])) {
      (r as Record<string, unknown>)[c] = remota[c];
    }
  }
  if (vacio(local.sexo) && remota.sexo) r.sexo = remota.sexo;
  if (local.bautizado === undefined && remota.bautizado !== undefined) {
    r.bautizado = remota.bautizado;
  }
  if (vacio(local.grupoId) && remota.grupoId) r.grupoId = remota.grupoId;
  if (vacio(local.hermanoMayorId) && remota.hermanoMayorId) {
    r.hermanoMayorId = remota.hermanoMayorId;
  }
  if (vacio(local.lat) && remota.lat != null) r.lat = remota.lat;
  if (vacio(local.lng) && remota.lng != null) r.lng = remota.lng;
  return r;
}

export function vistaPreviaCompletar(
  locales: Persona[],
  remotas: Persona[],
): { resumen: ResumenCompletar; cambios: CambioCompletar[] } {
  const porId = new Map(locales.map((p) => [p.id, p]));
  const cambios: CambioCompletar[] = [];
  const campos: Record<string, number> = {};
  for (const remota of remotas) {
    const local = porId.get(remota.id);
    if (!local) continue;
    const relleno = rellenosPara(local, remota);
    const claves = Object.keys(relleno);
    if (claves.length === 0) continue;
    cambios.push({ local, relleno });
    for (const k of claves) campos[k] = (campos[k] ?? 0) + 1;
  }
  return { resumen: { personas: cambios.length, campos }, cambios };
}

export async function completarPersonas(
  repo: Repo,
  respaldo: RespaldoViejo,
  locales: Persona[],
): Promise<ResumenCompletar> {
  const { datos } = convertirRespaldo(respaldo);
  const { resumen, cambios } = vistaPreviaCompletar(locales, datos.personas);
  for (const { local, relleno } of cambios) {
    await repo.guardar('personas', { ...local, ...relleno });
  }
  return resumen;
}
