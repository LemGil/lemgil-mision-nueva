// Traer las ofrendas del grupo desde el respaldo de la app anterior.
// En la app vieja, las ofrendas recogidas en las reuniones se
// registraban a nombre del grupo (aportesComun con grupoId, sin
// diezmador). En la migración quedaron fuera porque el Aporte solo
// admitía persona. Ahora el Aporte admite grupo: esta herramienta
// las trae por su id, tal cual, al grupo que LemGil confirmó: el
// único grupo de la casa, que cambió de nombre/id en el camino —
// los dos grupoId del respaldo son el mismo grupo.

import type { Aporte, DatosMinisterio, Grupo } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import type { RespaldoViejo } from './convertir';

type Registro = Record<string, unknown>;

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const numero = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const sinAcentos = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Las filas del respaldo que son ofrendas del grupo. */
function filasDelGrupo(respaldo: RespaldoViejo): Registro[] {
  const filas = respaldo.aportesComun ?? respaldo.registros ?? respaldo.aportes ?? [];
  return filas.filter((f) => texto(f.grupoId) !== '' && texto(f.diezmadorId) === '' && texto(f.personaId) === '');
}

/** El grupo destino: el de tipo Iglesia; si no, el que se llame
 * como el grupo del respaldo; si no, el primero. */
export function grupoDestino(datos: DatosMinisterio): Grupo | undefined {
  return (
    datos.grupos.find((g) => sinAcentos(g.tipo ?? '') === 'iglesia') ??
    datos.grupos.find((g) => sinAcentos(g.nombre).includes('120 y 51')) ??
    datos.grupos[0]
  );
}

export interface PreviaOfrendasGrupo {
  registros: number;
  total: number;
  destino?: Grupo;
}

export function previaOfrendasGrupo(
  respaldo: RespaldoViejo,
  datos: DatosMinisterio,
): PreviaOfrendasGrupo {
  const filas = filasDelGrupo(respaldo);
  return {
    registros: filas.length,
    total: filas.reduce((x, f) => x + numero(f.monto), 0),
    destino: grupoDestino(datos),
  };
}

export interface ResultadoTraerOfrendas {
  entraron: number;
  yaEstaban: number;
  restaurados: number;
  destino: string;
}

export async function traerOfrendasGrupo(
  repo: Repo,
  respaldo: RespaldoViejo,
  datos: DatosMinisterio,
): Promise<ResultadoTraerOfrendas> {
  const destino = grupoDestino(datos);
  if (!destino) {
    throw new Error('No hay ningún grupo en la app: crea primero el grupo (IGLESIA 120 Y 51).');
  }
  let entraron = 0;
  let yaEstaban = 0;
  let restaurados = 0;
  for (const f of filasDelGrupo(respaldo)) {
    const id = texto(f.id);
    if (!id) continue;
    const previa = await repo.obtenerConSobre('aportes', id);
    if (previa && !previa.borrado) {
      yaEstaban++;
      continue;
    }
    const aporte: Aporte = {
      id,
      grupoId: destino.id,
      fecha: texto(f.fecha),
      monto: numero(f.monto),
      tipo: 'Ofrenda',
      metodo: texto(f.metodo) || undefined,
      referencia: texto(f.referencia) || undefined,
      notas: texto(f.notas) || undefined,
    };
    await repo.guardar('aportes', aporte);
    if (previa?.borrado) restaurados++;
    else entraron++;
  }
  return { entraron, yaEstaban, restaurados, destino: destino.nombre };
}
