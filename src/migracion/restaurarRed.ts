// Restaurar la Red según el respaldo: la reparación fuerte.
// Cada colaborador del respaldo vuelve a existir con su nombre, y
// cada aporte del respaldo vuelve a colgar de SU dueño, esté donde
// esté ahora (si una unión o un borrado lo movió de ficha, regresa).
// Los aportes registrados a mano en la app nueva no están en el
// respaldo y no se tocan. Todo se decide por id: es exacto.

import type { AporteRed, Colaborador, DatosMinisterio } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import type { RespaldoViejo } from './convertir';
import { convertirRed } from './traerRed';

export interface FalloRestaurar {
  tabla: string;
  id: string;
  mensaje: string;
}

export interface ResultadoRestaurarRed {
  /** Registros que no se pudieron escribir, con su error exacto: la
   *  herramienta ya no se detiene en el primero; lo salta, lo nombra
   *  y termina todo lo demás. */
  fallos: FalloRestaurar[];
  /** Fichas que no existían (o tenían otro nombre) y volvieron a ser las del respaldo. */
  fichasRestauradas: number;
  /** Copias sin aportes que la unión ya había fundido: quedan fuera, no se resucitan. */
  copiasVaciasSaltadas: number;
  /** Aportes del respaldo que estaban colgando de otra ficha y volvieron a su dueño. */
  aportesReubicados: number;
  /** Aportes del respaldo que habían sido borrados y se restauraron. */
  aportesRestaurados: number;
  /** La verdad tras RELEER la base al terminar de escribir. */
  verificacion: {
    /** Aportes del respaldo que, releyendo, siguen fuera de su ficha. */
    siguenFuera: number;
    /** Fichas con aportes del respaldo que, releyendo, no aparecen vivas. */
    fichasQueFaltan: number;
  };
}

const nombreCompleto = (nombre: string, apellido?: string): string =>
  `${nombre} ${apellido ?? ''}`.replace(/\s+/g, ' ').trim().toUpperCase();

export async function restaurarRedDesdeRespaldo(
  repo: Repo,
  datos: DatosMinisterio,
  respaldo: RespaldoViejo,
): Promise<ResultadoRestaurarRed> {
  const { colaboradores, aportesRed } = convertirRed(respaldo);
  const fallos: FalloRestaurar[] = [];
  const intentar = async (
    tabla: 'colaboradores' | 'aportesRed',
    entidad: { id: string },
  ): Promise<boolean> => {
    try {
      await repo.guardar(tabla, entidad);
      return true;
    } catch (e) {
      fallos.push({ tabla, id: entidad.id, mensaje: e instanceof Error ? e.message : String(e) });
      return false;
    }
  };
  let fichasRestauradas = 0;
  let copiasVaciasSaltadas = 0;
  let aportesReubicados = 0;
  let aportesRestaurados = 0;

  // Una ficha del respaldo sin ningún aporte (ni en el respaldo ni
  // vivo colgando de ella) es una copia que la unión ya fundió con
  // su principal: resucitarla recrearía el duplicado. Se salta.
  const conAportesRespaldo = new Set(aportesRed.map((a) => a.colaboradorId));
  const conAportesVivos = new Set(datos.aportesRed.map((a) => a.colaboradorId));

  // 1) Las fichas: que cada colaborador del respaldo exista, con su nombre.
  for (const c of colaboradores) {
    const viva = datos.colaboradores.find((x) => x.id === c.id);
    if (!viva) {
      if (!conAportesRespaldo.has(c.id) && !conAportesVivos.has(c.id)) {
        copiasVaciasSaltadas++;
        continue;
      }
      if (await intentar('colaboradores', c)) fichasRestauradas++;
    } else if (nombreCompleto(viva.nombre, viva.apellido) !== nombreCompleto(c.nombre, c.apellido)) {
      const corregida = { ...viva, nombre: c.nombre, apellido: c.apellido };
      if (await intentar('colaboradores', corregida)) fichasRestauradas++;
    }
  }

  // 2) Los aportes: que cada aporte del respaldo cuelgue de su dueño.
  for (const a of aportesRed) {
    const actual = datos.aportesRed.find((x) => x.id === a.id);
    if (!actual) {
      if (await intentar('aportesRed', a)) aportesRestaurados++;
    } else if (actual.colaboradorId !== a.colaboradorId) {
      const movido = { ...actual, colaboradorId: a.colaboradorId };
      if (await intentar('aportesRed', movido)) aportesReubicados++;
    }
  }

  // 3) Verificación: releer la base y contar lo que de verdad quedó.
  // El aviso ya no dice lo que se INTENTÓ: dice lo que se CONFIRMÓ.
  const colabsAhora = await repo.listar<Colaborador>('colaboradores');
  const aportesAhora = await repo.listar<AporteRed>('aportesRed');
  let siguenFuera = 0;
  for (const a of aportesRed) {
    const actual = aportesAhora.find((x) => x.id === a.id);
    if (!actual || actual.colaboradorId !== a.colaboradorId) siguenFuera++;
  }
  let fichasQueFaltan = 0;
  for (const c of colaboradores) {
    if (!conAportesRespaldo.has(c.id)) continue; // copia vacía: fuera a propósito
    if (!colabsAhora.some((x) => x.id === c.id)) fichasQueFaltan++;
  }

  return {
    fallos,
    fichasRestauradas,
    copiasVaciasSaltadas,
    aportesReubicados,
    aportesRestaurados,
    verificacion: { siguenFuera, fichasQueFaltan },
  };
}
