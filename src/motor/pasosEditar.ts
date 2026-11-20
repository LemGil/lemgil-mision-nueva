// Editar los pasos (pedido de LemGil, 2026-11-20): el catálogo se puede
// renombrar, reordenar y ampliar en Misión y en Miembros, con las
// protecciones del modelo congelado:
//  - El nombre y el emoji son datos: cambiarlos no rompe nada (todo
//    cuelga del id estable).
//  - En Misión solo se mueven los pasos del camino: el inicio, el gozne
//    y las salidas guardan su lugar y su función.
//  - Nunca se borra un paso protegido, ni uno que se alimenta solo
//    (fuente viva de Miembros), ni uno con registros encima.

import type { AmbitoPaso, DatosMinisterio, Paso } from '../modelo/tipos';

/** Los pasos de un ámbito, en su orden, sin deduplicar: el editor ve
 * el catálogo entero tal como está guardado. */
export function pasosDelAmbito(pasos: Paso[], ambito: AmbitoPaso): Paso[] {
  return pasos
    .filter((p) => p.ambito === ambito)
    .slice()
    .sort((a, b) => a.orden - b.orden);
}

/** Renumera 1..n una lista ya ordenada. */
export function renumerar(lista: Paso[]): Paso[] {
  return lista.map((p, i) => ({ ...p, orden: i + 1 }));
}

/** ¿Este paso puede cambiar de lugar? En Miembros, toda la escalera;
 * en Misión, solo el camino. */
export function puedeMover(paso: Paso): boolean {
  if (paso.ambito === 'miembros') return true;
  return paso.rol === 'camino';
}

/** Mueve un paso un lugar (-1 sube, +1 baja) cambiándolo por su vecino
 * si AMBOS pueden moverse; devuelve la lista del ámbito renumerada, o
 * null si el movimiento no cabe (borde o vecino fijo). */
export function moverEnLista(
  pasos: Paso[],
  ambito: AmbitoPaso,
  id: string,
  dir: -1 | 1,
): Paso[] | null {
  const lista = pasosDelAmbito(pasos, ambito);
  const i = lista.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const j = i + dir;
  if (j < 0 || j >= lista.length) return null;
  if (!puedeMover(lista[i]) || !puedeMover(lista[j])) return null;
  const copia = lista.slice();
  const [movido] = copia.splice(i, 1);
  copia.splice(j, 0, movido);
  return renumerar(copia);
}

/** Registros que cuelgan del paso: en Misión, conversiones que están o
 * pasaron por él; en Miembros, hitos que lo cumplen. */
export function usoDelPaso(datos: DatosMinisterio, paso: Paso): number {
  if (paso.ambito === 'mision') {
    return datos.conversiones.filter(
      (c) => c.estado === paso.id || (c.historial ?? []).some((h) => h.estado === paso.id),
    ).length;
  }
  return datos.hitos.filter((h) => h.pasoId === paso.id).length;
}

export function puedeBorrarPaso(
  datos: DatosMinisterio,
  paso: Paso,
): { ok: boolean; motivo?: string } {
  if (paso.protegido) {
    return { ok: false, motivo: 'Es un paso protegido: sostiene la ruta y no se borra.' };
  }
  if (paso.ambito === 'miembros' && paso.fuente && paso.fuente !== 'manual') {
    return {
      ok: false,
      motivo: 'Este peldaño se cumple solo (grupo, diezmo, academia, ministerio o hermano mayor): no se borra.',
    };
  }
  const uso = usoDelPaso(datos, paso);
  if (uso > 0) {
    return { ok: false, motivo: `Tiene ${uso} registro(s) encima: no se borra un paso en uso.` };
  }
  return { ok: true };
}

/** La lista del ámbito con un paso nuevo ya colocado y renumerada:
 * en Misión entra al camino, justo antes del gozne; en Miembros, al
 * final de la escalera. */
export function listaConPasoNuevo(pasos: Paso[], nuevo: Paso): Paso[] {
  const lista = pasosDelAmbito(pasos, nuevo.ambito);
  if (nuevo.ambito === 'mision') {
    const iGozne = lista.findIndex((p) => p.rol === 'gozne');
    lista.splice(iGozne >= 0 ? iGozne : lista.length, 0, nuevo);
  } else {
    lista.push(nuevo);
  }
  return renumerar(lista);
}

/** Nombre repetido dentro del ámbito (sin contar al propio paso). */
export function nombreRepetido(pasos: Paso[], ambito: AmbitoPaso, nombre: string, exceptoId?: string): boolean {
  const clave = nombre.trim().toLowerCase();
  return pasosDelAmbito(pasos, ambito).some(
    (p) => p.id !== exceptoId && p.nombre.trim().toLowerCase() === clave,
  );
}
