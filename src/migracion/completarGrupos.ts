// Completar los datos de los grupos desde el respaldo viejo.
// La primera conversión trajo solo nombre, zona, líder enlazado y la
// chincheta: el día y la hora de reunión, el lugar, la capacidad y el
// líder en texto libre («Pastores Luis y Daymi») quedaron en la app
// anterior. Esto rellena SOLO los huecos de los grupos que ya están
// aquí (emparejados por id): nunca sobrescribe ni crea a nadie.

import type { Grupo } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import type { RespaldoViejo } from './convertir';

type Registro = Record<string, unknown>;

const texto = (r: Registro, ...campos: string[]): string | undefined => {
  for (const c of campos) {
    const v = r[c];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
};

const capacidadDe = (r: Registro): number | undefined => {
  const v = r.capacidad;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export interface ResumenCompletarGrupos {
  grupos: number;
  campos: Record<string, number>;
}

type CamposGrupo = 'dia' | 'hora' | 'lugar' | 'capacidad' | 'liderTexto';
const CAMPOS: CamposGrupo[] = ['dia', 'hora', 'lugar', 'capacidad', 'liderTexto'];

/** Los grupos del respaldo, con los datos que la primera conversión
 * no trajo, emparejados por id. */
function gruposDelRespaldo(respaldo: RespaldoViejo): Map<string, Partial<Grupo>> {
  const mapa = new Map<string, Partial<Grupo>>();
  for (const r of respaldo.grupos ?? []) {
    const id = String(r.id ?? '');
    if (!id) continue;
    mapa.set(id, {
      dia: texto(r, 'dia'),
      hora: texto(r, 'hora'),
      lugar: texto(r, 'lugar'),
      capacidad: capacidadDe(r),
      liderTexto: texto(r, 'lider'),
    });
  }
  return mapa;
}

const vacio = (v: unknown) => v === undefined || v === null || v === '';

export function vistaPreviaCompletarGrupos(
  actuales: Grupo[],
  respaldo: RespaldoViejo,
): ResumenCompletarGrupos {
  const delRespaldo = gruposDelRespaldo(respaldo);
  const campos: Record<string, number> = {};
  let grupos = 0;
  for (const g of actuales) {
    const viejo = delRespaldo.get(g.id);
    if (!viejo) continue;
    let gana = false;
    for (const campo of CAMPOS) {
      if (vacio(g[campo]) && !vacio(viejo[campo])) {
        campos[campo] = (campos[campo] ?? 0) + 1;
        gana = true;
      }
    }
    if (gana) grupos++;
  }
  return { grupos, campos };
}

export async function completarGrupos(
  repo: Repo,
  respaldo: RespaldoViejo,
  actuales: Grupo[],
): Promise<ResumenCompletarGrupos> {
  const delRespaldo = gruposDelRespaldo(respaldo);
  const campos: Record<string, number> = {};
  let grupos = 0;
  for (const g of actuales) {
    const viejo = delRespaldo.get(g.id);
    if (!viejo) continue;
    const relleno: Grupo = { ...g };
    let gana = false;
    const poner = (campo: CamposGrupo, hay: boolean, aplicar: () => void) => {
      if (hay) {
        aplicar();
        campos[campo] = (campos[campo] ?? 0) + 1;
        gana = true;
      }
    };
    poner('dia', vacio(g.dia) && !vacio(viejo.dia), () => { relleno.dia = viejo.dia; });
    poner('hora', vacio(g.hora) && !vacio(viejo.hora), () => { relleno.hora = viejo.hora; });
    poner('lugar', vacio(g.lugar) && !vacio(viejo.lugar), () => { relleno.lugar = viejo.lugar; });
    poner('capacidad', vacio(g.capacidad) && viejo.capacidad !== undefined, () => { relleno.capacidad = viejo.capacidad; });
    poner('liderTexto', vacio(g.liderTexto) && !vacio(viejo.liderTexto), () => { relleno.liderTexto = viejo.liderTexto; });
    if (gana) {
      grupos++;
      await repo.guardar('grupos', relleno);
    }
  }
  return { grupos, campos };
}
