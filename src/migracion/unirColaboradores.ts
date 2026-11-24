// Unir colaboradores repetidos de la Red: la misma persona o iglesia
// quedó registrada dos veces (venía así de la app anterior) y los
// aportes cuelgan de una sola ficha — la otra se ve «0 aportes · $0».
// La unión pasa todos los aportes a la ficha principal (la que más
// aportes tiene), completa sus huecos con los datos de las copias y
// borra las copias. Nada se pierde: el borrado es lógico y los
// aportes solo cambian de ficha.

import type { Colaborador, DatosMinisterio } from '../modelo/tipos';
import type { Repo } from '../datos/repo';

const claveNombre = (c: Colaborador): string =>
  `${c.nombre} ${c.apellido ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export interface GrupoUnion {
  principal: Colaborador;
  absorbidos: Colaborador[];
  aportesMovidos: number;
}

/** El plan de unión: un grupo por cada nombre repetido. Puro. */
export function planUnionColaboradores(datos: DatosMinisterio): GrupoUnion[] {
  const conteo = (id: string) =>
    datos.aportesRed.filter((a) => a.colaboradorId === id).length;
  const porClave = new Map<string, Colaborador[]>();
  for (const c of datos.colaboradores) {
    const k = claveNombre(c);
    if (!k) continue;
    porClave.set(k, [...(porClave.get(k) ?? []), c]);
  }
  const grupos: GrupoUnion[] = [];
  for (const lista of porClave.values()) {
    if (lista.length < 2) continue;
    const ordenada = [...lista].sort((a, b) => conteo(b.id) - conteo(a.id));
    const absorbidos = ordenada.slice(1);
    grupos.push({
      principal: ordenada[0],
      absorbidos,
      aportesMovidos: absorbidos.reduce((suma, c) => suma + conteo(c.id), 0),
    });
  }
  return grupos;
}

export interface ResultadoUnion {
  grupos: number;
  absorbidas: number;
  aportesMovidos: number;
}

export async function unirColaboradoresRepetidos(
  repo: Repo,
  datos: DatosMinisterio,
): Promise<ResultadoUnion> {
  const grupos = planUnionColaboradores(datos);
  let absorbidas = 0;
  let movidos = 0;
  for (const g of grupos) {
    // Los huecos del principal se completan con lo que tengan las copias.
    const fusion: Colaborador = { ...g.principal };
    let cambio = false;
    for (const copia of g.absorbidos) {
      if (!fusion.apellido && copia.apellido) { fusion.apellido = copia.apellido; cambio = true; }
      if (!fusion.telefono && copia.telefono) { fusion.telefono = copia.telefono; cambio = true; }
      if (!fusion.email && copia.email) { fusion.email = copia.email; cambio = true; }
      if (!fusion.tipo && copia.tipo) { fusion.tipo = copia.tipo; cambio = true; }
      if (!fusion.planOfrendaTipo && copia.planOfrendaTipo) { fusion.planOfrendaTipo = copia.planOfrendaTipo; cambio = true; }
      if (!fusion.planOfrendaMonto && copia.planOfrendaMonto) { fusion.planOfrendaMonto = copia.planOfrendaMonto; cambio = true; }
      if (!fusion.notas && copia.notas) { fusion.notas = copia.notas; cambio = true; }
    }
    if (cambio) await repo.guardar('colaboradores', fusion);
    for (const copia of g.absorbidos) {
      for (const a of datos.aportesRed.filter((x) => x.colaboradorId === copia.id)) {
        await repo.guardar('aportesRed', { ...a, colaboradorId: g.principal.id });
        movidos++;
      }
      await repo.borrar('colaboradores', copia.id);
      absorbidas++;
    }
  }
  return { grupos: grupos.length, absorbidas, aportesMovidos: movidos };
}
