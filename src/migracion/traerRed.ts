// Traer la Red de Colaboradores desde el respaldo de la app anterior.
// La Red quedó fuera de la migración principal (es externa a la ficha
// única); esta herramienta la recupera tal cual: los colaboradores y
// sus aportes, con sus ids originales. Es RESTAURATIVA: trae lo que
// falte y RESTAURA lo que haya sido borrado (su tumba se levanta),
// porque correrla es un acto deliberado de recuperación, con el
// respaldo en la mano. Lo que está vivo no se duplica ni se
// sobrescribe. Se puede correr las veces que haga falta hasta que
// la Red quede completa.

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

export interface ResultadoTraerRed {
  /** Colaboradores que entraron ahora. */
  colaboradores: number;
  /** Aportes que entraron ahora. */
  aportes: number;
  /** Registros del respaldo que ya estaban vivos: no se tocaron. */
  yaEstaban: number;
  /** Registros que habían sido borrados y esta corrida restauró. */
  restaurados: number;
  /** Aportes del respaldo sin colaborador: quedan fuera. */
  huerfanos: number;
  /** Suma de los aportes que entraron ahora. */
  total: number;
}

/** Trae lo que falte de la Red, registro a registro por su id. */
export async function traerRed(
  repo: Repo,
  respaldo: RespaldoViejo,
): Promise<ResultadoTraerRed> {
  const { colaboradores, aportesRed, huerfanos } = convertirRed(respaldo);
  const vivosColab = new Set<string>();
  const tumbasColab = new Set<string>();
  for (const f of await repo.todosConSobre('colaboradores')) {
    (f.borrado ? tumbasColab : vivosColab).add(f.id);
  }
  const vivosAportes = new Set<string>();
  const tumbasAportes = new Set<string>();
  for (const f of await repo.todosConSobre('aportesRed')) {
    (f.borrado ? tumbasAportes : vivosAportes).add(f.id);
  }
  let yaEstaban = 0;
  let restaurados = 0;
  let colabTraidos = 0;
  let aportesTraidos = 0;
  let total = 0;
  for (const c of colaboradores) {
    if (vivosColab.has(c.id)) {
      yaEstaban++;
      continue;
    }
    if (tumbasColab.has(c.id)) restaurados++;
    await repo.guardar('colaboradores', c);
    colabTraidos++;
  }
  for (const a of aportesRed) {
    if (vivosAportes.has(a.id)) {
      yaEstaban++;
      continue;
    }
    if (tumbasAportes.has(a.id)) restaurados++;
    await repo.guardar('aportesRed', a);
    aportesTraidos++;
    total += a.monto;
  }
  return { colaboradores: colabTraidos, aportes: aportesTraidos, yaEstaban, restaurados, huerfanos, total };
}
