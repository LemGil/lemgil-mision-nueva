// El puente datos → motor: arma el DatosMinisterio (sin sobres, sin
// borrados) que el motor de conteo consume. Si el catálogo está vacío, se
// siembra el del modelo congelado.

import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import type {
  Aporte,
  AsignacionMinisterio,
  Beneficiario,
  Conversion,
  DatosMinisterio,
  Diezmador,
  Estudiante,
  Evangelismo,
  Grupo,
  Hito,
  Miembro,
  Paso,
  Persona,
} from '../modelo/tipos';
import type { Repo } from './repo';

export async function sembrarCatalogoSiVacio(repo: Repo): Promise<void> {
  const existentes = await repo.listar<Paso>('pasos');
  if (existentes.length > 0) return;
  for (const paso of CATALOGO_SEMILLA) await repo.guardar('pasos', paso);
}

export async function aDatosMinisterio(repo: Repo): Promise<DatosMinisterio> {
  const [
    personas,
    conversiones,
    miembros,
    estudiantes,
    diezmadores,
    beneficiarios,
    hitos,
    asignaciones,
    grupos,
    evangelismos,
    aportes,
    pasos,
  ] = await Promise.all([
    repo.listar<Persona>('personas'),
    repo.listar<Conversion>('conversiones'),
    repo.listar<Miembro>('miembros'),
    repo.listar<Estudiante>('estudiantes'),
    repo.listar<Diezmador>('diezmadores'),
    repo.listar<Beneficiario>('beneficiarios'),
    repo.listar<Hito>('hitos'),
    repo.listar<AsignacionMinisterio>('asignaciones'),
    repo.listar<Grupo>('grupos'),
    repo.listar<Evangelismo>('evangelismos'),
    repo.listar<Aporte>('aportes'),
    repo.listar<Paso>('pasos'),
  ]);
  return {
    personas,
    conversiones,
    miembros,
    estudiantes,
    diezmadores,
    beneficiarios,
    hitos,
    asignaciones,
    grupos,
    evangelismos,
    aportes,
    pasos: pasos.length > 0 ? pasos : CATALOGO_SEMILLA,
  };
}
