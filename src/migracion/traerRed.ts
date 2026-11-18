// Traer la Red de Colaboradores desde el respaldo de la app anterior.
// La Red quedó fuera de la migración principal (es externa a la ficha
// única); esta herramienta la recupera tal cual: los 8 colaboradores y
// sus aportes, con sus ids originales. Solo trabaja si la Red está
// vacía en la app nueva: nunca duplica ni sobrescribe.

import type { AporteRed, Colaborador } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import type { RespaldoViejo } from './convertir';

type Registro = Record<string, unknown>;

export interface VistaPreviaRed {
  colaboradores: number;
  aportes: number;
  huerfanos: number;
  total: number;
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

export function convertirRed(respaldo: RespaldoViejo): {
  colaboradores: Colaborador[];
  aportesRed: AporteRed[];
  huerfanos: number;
} {
  const colaboradores: Colaborador[] = (respaldo.colaboradores ?? []).map((r) => ({
    id: String(r.id),
    nombre: texto(r, 'nombre') ?? '(sin nombre)',
    apellido: texto(r, 'apellido', 'apellidos'),
    telefono: texto(r, 'telefono'),
    email: texto(r, 'email', 'correo'),
    estado: texto(r, 'estado') ?? 'Activo',
    tipo: texto(r, 'tipo'),
    planOfrendaTipo: texto(r, 'planOfrendaTipo'),
    planOfrendaMonto: numero(r, 'planOfrendaMonto'),
    notas: texto(r, 'notas'),
  }));
  const ids = new Set(colaboradores.map((c) => c.id));
  const aportesRed: AporteRed[] = [];
  let huerfanos = 0;
  for (const r of respaldo.aportes ?? []) {
    const colaboradorId = texto(r, 'colaboradorId');
    if (!colaboradorId || !ids.has(colaboradorId)) {
      huerfanos++;
      continue;
    }
    aportesRed.push({
      id: String(r.id),
      colaboradorId,
      fecha: texto(r, 'fecha') ?? '',
      monto: numero(r, 'monto') ?? 0,
      tipo: texto(r, 'tipo') ?? 'Ofrenda',
      metodo: texto(r, 'metodo'),
      referencia: texto(r, 'referencia'),
      notas: texto(r, 'notas'),
    });
  }
  return { colaboradores, aportesRed, huerfanos };
}

export function vistaPreviaRed(respaldo: RespaldoViejo): VistaPreviaRed {
  const { colaboradores, aportesRed, huerfanos } = convertirRed(respaldo);
  return {
    colaboradores: colaboradores.length,
    aportes: aportesRed.length,
    huerfanos,
    total: aportesRed.reduce((s, a) => s + a.monto, 0),
  };
}

/** Importa la Red SOLO si aún no hay colaboradores en la base. */
export async function traerRed(
  repo: Repo,
  respaldo: RespaldoViejo,
): Promise<VistaPreviaRed> {
  const existentes = await repo.listar<Colaborador>('colaboradores');
  if (existentes.length > 0) {
    throw new Error('La Red ya tiene colaboradores en la app nueva: no se trae nada para no duplicar.');
  }
  const { colaboradores, aportesRed, huerfanos } = convertirRed(respaldo);
  for (const c of colaboradores) await repo.guardar('colaboradores', c);
  for (const a of aportesRed) await repo.guardar('aportesRed', a);
  return {
    colaboradores: colaboradores.length,
    aportes: aportesRed.length,
    huerfanos,
    total: aportesRed.reduce((s, a) => s + a.monto, 0),
  };
}
