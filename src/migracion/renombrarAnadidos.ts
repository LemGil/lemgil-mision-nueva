import type { Repo } from '../datos/repo';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { PS_INTEGRADO } from '../modelo/catalogo';

/**
 * Renombra el paso del gozne en los datos vivos: de «Integrado»
 * a «Añadidos» (decisión de LemGil del 2026-11-22). El id del
 * paso no cambia — es el mismo paso con nombre nuevo, como ayer
 * Congregado → Alcanzado. Devuelve 1 si renombró y 0 si ya se
 * llamaba Añadidos (o el paso no está).
 */
export async function renombrarAnadidos(repo: Repo): Promise<number> {
  const datos = await aDatosMinisterio(repo);
  const paso = datos.pasos.find((p) => p.id === PS_INTEGRADO);
  if (!paso || paso.nombre === 'Añadidos') return 0;
  await repo.guardar('pasos', { ...paso, nombre: 'Añadidos' });
  return 1;
}
