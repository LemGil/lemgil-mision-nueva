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
