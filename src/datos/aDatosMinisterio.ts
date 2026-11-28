// El puente datos → motor: arma el DatosMinisterio (sin sobres, sin
// borrados) que el motor de conteo consume. Si el catálogo está vacío, se
// siembra el del modelo congelado.

import { CATALOGO_SEMILLA } from '../modelo/catalogo';
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
  Estudiante,
  Evangelismo,
  Grupo,
  Hito,
  Miembro,
  Ministerio,
  Paso,
  Persona,
  Reunion,
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
    colaboradores,
    aportesRed,
    campanas,
    entregas,
    reuniones,
    academias,
    encuentros,
    ministerios,
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
    repo.listar<Colaborador>('colaboradores'),
    repo.listar<AporteRed>('aportesRed'),
    repo.listar<Campana>('campanas'),
    repo.listar<Entrega>('entregas'),
    repo.listar<Reunion>('reuniones'),
    repo.listar<Academia>('academias'),
    repo.listar<Encuentro>('encuentros'),
    repo.listar<Ministerio>('ministerios'),
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
    colaboradores,
    aportesRed,
    campanas,
    entregas,
    reuniones,
    academias,
    encuentros,
    ministerios,
    pasos: pasos.length > 0 ? pasos : CATALOGO_SEMILLA,
  };
}
