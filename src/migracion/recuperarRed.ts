// Recuperar borrados de la Red: la papelera.
// Borrar en la app es lógico (el registro queda como tumba), así que
// lo borrado se puede levantar tal cual: las fichas de colaborador
// y los aportes que no están en el respaldo (los registrados a mano)
// también tienen aquí su vuelta. Restaurar un aporte cuya ficha
// sigue borrada lo deja vivo pero sin ficha a la vista: primero la
// ficha, después sus aportes.

import type { AporteRed, Colaborador } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import { sinSobre } from '../datos/repo';

export interface BorradosRed {
  colaboradores: Colaborador[];
  aportes: AporteRed[];
}

export async function borradosRed(repo: Repo): Promise<BorradosRed> {
  const colabs = await repo.todosConSobre('colaboradores');
  const aportes = await repo.todosConSobre('aportesRed');
  return {
    colaboradores: colabs
      .filter((f) => f.borrado)
      .map((f) => sinSobre(f) as unknown as Colaborador),
    aportes: aportes
      .filter((f) => f.borrado)
      .map((f) => sinSobre(f) as unknown as AporteRed),
  };
}

export async function restaurarColaboradorBorrado(repo: Repo, c: Colaborador): Promise<void> {
  await repo.guardar('colaboradores', c);
}

export async function restaurarAporteBorrado(repo: Repo, a: AporteRed): Promise<void> {
  await repo.guardar('aportesRed', a);
}

/** Quien sabe purgar de verdad (el Sincronizador): borra la fila
 * del espejo y de la base local. Si falla (sin conexión o sin
 * sesión), nada se toca. */
export interface Purgador {
  borrarDefinitivo(tabla: 'colaboradores' | 'aportesRed', id: string): Promise<void>;
}

export async function borrarDefinitivoAporteRed(purgador: Purgador, a: AporteRed): Promise<void> {
  await purgador.borrarDefinitivo('aportesRed', a.id);
}

/** Borra para siempre una ficha borrada y los aportes suyos que
 * también están en la papelera. Si la ficha tiene aportes VIVOS
 * (alguien restauró aportes sin restaurar la ficha), se niega:
 * primero la ficha se restaura o esos aportes se borran. */
export async function borrarDefinitivoColaboradorRed(
  repo: Repo,
  purgador: Purgador,
  c: Colaborador,
): Promise<{ aportes: number }> {
  const vivos = await repo.listar<AporteRed>('aportesRed');
  if (vivos.some((a) => a.colaboradorId === c.id)) {
    throw new Error(
      'Esa ficha tiene aportes vivos: restáurala, o borra primero esos aportes.',
    );
  }
  const tumbas = (await borradosRed(repo)).aportes.filter((a) => a.colaboradorId === c.id);
  for (const a of tumbas) await purgador.borrarDefinitivo('aportesRed', a.id);
  await purgador.borrarDefinitivo('colaboradores', c.id);
  return { aportes: tumbas.length };
}
