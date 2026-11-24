// Restaurar la Red según el respaldo: la reparación fuerte.
// Cada colaborador del respaldo vuelve a existir con su nombre, y
// cada aporte del respaldo vuelve a colgar de SU dueño, esté donde
// esté ahora (si una unión o un borrado lo movió de ficha, regresa).
// Los aportes registrados a mano en la app nueva no están en el
// respaldo y no se tocan. Todo se decide por id: es exacto.

import type { DatosMinisterio } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import type { RespaldoViejo } from './convertir';
import { convertirRed } from './traerRed';

export interface ResultadoRestaurarRed {
  /** Fichas que no existían (o tenían otro nombre) y volvieron a ser las del respaldo. */
  fichasRestauradas: number;
  /** Aportes del respaldo que estaban colgando de otra ficha y volvieron a su dueño. */
  aportesReubicados: number;
  /** Aportes del respaldo que habían sido borrados y se restauraron. */
  aportesRestaurados: number;
}

const nombreCompleto = (nombre: string, apellido?: string): string =>
  `${nombre} ${apellido ?? ''}`.replace(/\s+/g, ' ').trim().toUpperCase();

export async function restaurarRedDesdeRespaldo(
  repo: Repo,
  datos: DatosMinisterio,
  respaldo: RespaldoViejo,
): Promise<ResultadoRestaurarRed> {
  const { colaboradores, aportesRed } = convertirRed(respaldo);
  let fichasRestauradas = 0;
  let aportesReubicados = 0;
  let aportesRestaurados = 0;

  // 1) Las fichas: que cada colaborador del respaldo exista, con su nombre.
  for (const c of colaboradores) {
    const viva = datos.colaboradores.find((x) => x.id === c.id);
    if (!viva) {
      await repo.guardar('colaboradores', c);
      fichasRestauradas++;
    } else if (nombreCompleto(viva.nombre, viva.apellido) !== nombreCompleto(c.nombre, c.apellido)) {
      await repo.guardar('colaboradores', { ...viva, nombre: c.nombre, apellido: c.apellido });
      fichasRestauradas++;
    }
  }

  // 2) Los aportes: que cada aporte del respaldo cuelgue de su dueño.
  for (const a of aportesRed) {
    const actual = datos.aportesRed.find((x) => x.id === a.id);
    if (!actual) {
      await repo.guardar('aportesRed', a);
      aportesRestaurados++;
    } else if (actual.colaboradorId !== a.colaboradorId) {
      await repo.guardar('aportesRed', { ...actual, colaboradorId: a.colaboradorId });
      aportesReubicados++;
    }
  }

  return { fichasRestauradas, aportesReubicados, aportesRestaurados };
}
