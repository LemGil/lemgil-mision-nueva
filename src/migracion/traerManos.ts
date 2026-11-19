// Traer las Campañas y Entregas de Manos Abiertas desde el respaldo de
// la app anterior. Quedaron fuera de la migración principal (la mesa
// nació solo con beneficiarios); esta herramienta las recupera tal
// cual, con sus ids originales. Solo trabaja si aún no hay campañas
// en la app nueva: nunca duplica ni sobrescribe.

import type { Campana, Entrega } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import type { RespaldoViejo } from './convertir';

type Registro = Record<string, unknown>;

export interface VistaPreviaManos {
  campanas: number;
  entregas: number;
  huerfanas: number;
}

const texto = (r: Registro, ...campos: string[]): string | undefined => {
  for (const c of campos) {
    const v = r[c];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
};

const numero = (r: Registro, campo: string): number | undefined => {
  const v = r[campo];
  return typeof v === 'number' && !Number.isNaN(v) ? v : undefined;
};

export function convertirManos(respaldo: RespaldoViejo): {
  campanas: Campana[];
  entregas: Entrega[];
  huerfanas: number;
} {
  const campanas: Campana[] = (respaldo.campanas ?? []).map((r) => ({
    id: String(r.id),
    nombre: texto(r, 'nombre') ?? '(sin nombre)',
    // En la app vieja algunas campañas guardan las fechas en minúsculas.
    fechaInicio: texto(r, 'fechaInicio', 'fechainicio'),
    fechaFin: texto(r, 'fechaFin', 'fechafin'),
    zona: texto(r, 'zona'),
    tipo: texto(r, 'tipo'),
    metaFamilias: numero(r, 'metaFamilias'),
    metaTipo: texto(r, 'metaTipo'),
    responsable: texto(r, 'responsable'),
    estado: texto(r, 'estado') ?? 'En curso',
    descripcion: texto(r, 'descripcion'),
  }));
  const ids = new Set(campanas.map((c) => c.id));
  const entregas: Entrega[] = [];
  let huerfanas = 0;
  for (const r of respaldo.entregas ?? []) {
    const campanaId = texto(r, 'campanaId');
    if (!campanaId || !ids.has(campanaId)) {
      huerfanas++;
      continue;
    }
    entregas.push({
      id: String(r.id),
      campanaId,
      beneficiarioId: texto(r, 'beneficiarioId'),
      beneficiarioNombre: texto(r, 'beneficiarioNombre'),
      fecha: texto(r, 'fecha') ?? '',
      tipo: texto(r, 'tipo'),
      cantidad: numero(r, 'cantidad'),
      unidad: texto(r, 'unidad'),
      notas: texto(r, 'notas'),
    });
  }
  return { campanas, entregas, huerfanas };
}

export function vistaPreviaManos(respaldo: RespaldoViejo): VistaPreviaManos {
  const { campanas, entregas, huerfanas } = convertirManos(respaldo);
  return { campanas: campanas.length, entregas: entregas.length, huerfanas };
}

/** Importa Campañas y Entregas SOLO si aún no hay campañas en la base. */
export async function traerManos(
  repo: Repo,
  respaldo: RespaldoViejo,
): Promise<VistaPreviaManos> {
  const existentes = await repo.listar<Campana>('campanas');
  if (existentes.length > 0) {
    throw new Error('Ya hay campañas en la app nueva: no se trae nada para no duplicar.');
  }
  const { campanas, entregas, huerfanas } = convertirManos(respaldo);
  for (const c of campanas) await repo.guardar('campanas', c);
  for (const e of entregas) await repo.guardar('entregas', e);
  return { campanas: campanas.length, entregas: entregas.length, huerfanas };
}
