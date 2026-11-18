// Volcar lo convertido en la base local de la app nueva (todo pasa por el
// Repo: queda encolado y la primera sincronización lo sube entero).

import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';

/** La migración es ÚNICA y sobre una base vacía: si ya hay personas, no se
 * importa (mezclar dos bases crearía el desorden que esta app vino a matar). */
export function puedeImportar(actuales: DatosMinisterio): { ok: boolean; motivo?: string } {
  if (actuales.personas.length > 0) {
    return {
      ok: false,
      motivo: `Esta base ya tiene ${actuales.personas.length} personas. La migración solo se hace una vez, sobre la app nueva vacía.`,
    };
  }
  return { ok: true };
}

export async function importarEnRepo(repo: Repo, datos: DatosMinisterio): Promise<void> {
  // El catálogo primero: los procesos lo referencian.
  for (const p of datos.pasos) await repo.guardar('pasos', p);
  for (const p of datos.personas) await repo.guardar('personas', p);
  for (const c of datos.conversiones) await repo.guardar('conversiones', c);
  for (const m of datos.miembros) await repo.guardar('miembros', m);
  for (const e of datos.estudiantes) await repo.guardar('estudiantes', e);
  for (const d of datos.diezmadores) await repo.guardar('diezmadores', d);
  for (const a of datos.aportes) await repo.guardar('aportes', a);
  for (const b of datos.beneficiarios) await repo.guardar('beneficiarios', b);
  for (const h of datos.hitos) await repo.guardar('hitos', h);
  for (const a of datos.asignaciones) await repo.guardar('asignaciones', a);
  for (const g of datos.grupos) await repo.guardar('grupos', g);
  for (const e of datos.evangelismos) await repo.guardar('evangelismos', e);
}
