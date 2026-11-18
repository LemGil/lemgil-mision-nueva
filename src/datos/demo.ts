// El caso de prueba de 2026, cargable en la base local para ver la app
// trabajando (y para la primera prueba de sync entre dos equipos reales).
// Son los mismos datos sintéticos de las pruebas del motor.

import { CASO_2026 } from '../motor/casos';
import { sembrarCatalogoSiVacio } from './aDatosMinisterio';
import type { Repo } from './repo';

export async function cargarCasoDePrueba(repo: Repo): Promise<void> {
  await sembrarCatalogoSiVacio(repo);
  for (const p of CASO_2026.personas) await repo.guardar('personas', p);
  for (const c of CASO_2026.conversiones) await repo.guardar('conversiones', c);
  for (const m of CASO_2026.miembros) await repo.guardar('miembros', m);
  for (const e of CASO_2026.estudiantes) await repo.guardar('estudiantes', e);
  for (const d of CASO_2026.diezmadores) await repo.guardar('diezmadores', d);
  for (const h of CASO_2026.hitos) await repo.guardar('hitos', h);
  for (const x of CASO_2026.asignaciones) await repo.guardar('asignaciones', x);
  for (const g of CASO_2026.grupos) await repo.guardar('grupos', g);
  for (const a of CASO_2026.aportes) await repo.guardar('aportes', a);
}
