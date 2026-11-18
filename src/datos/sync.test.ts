import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BaseLocal } from './db';
import { Repo } from './repo';
import { Sincronizador } from './sync';
import { TransporteMemoria } from './transporte';
import { aDatosMinisterio, sembrarCatalogoSiVacio } from './aDatosMinisterio';
import { verificarCuadre } from '../motor/cuadre';
import { CASO_2026 } from '../motor/casos';
import type { Persona } from '../modelo/tipos';

let contador = 0;
/** Un «equipo»: su propia base local, compartiendo el mismo espejo. */
function equipo(espejo: TransporteMemoria) {
  const db = new BaseLocal(`prueba-${++contador}`);
  const repo = new Repo(db);
  const sync = new Sincronizador(repo, espejo);
  return { db, repo, sync };
}

const ana: Persona = { id: 'p-ana', nombre: 'Ana', numeroIdentidad: '123' };

describe('sync entre dos equipos con un mismo espejo', () => {
  it('lo que un equipo guarda, el otro lo recibe', async () => {
    const espejo = new TransporteMemoria();
    const a = equipo(espejo);
    const b = equipo(espejo);
    await a.repo.guardar('personas', ana);
    await a.sync.ciclo();
    await b.sync.ciclo();
    const enB = await b.repo.listar<Persona>('personas');
    expect(enB.map((p) => p.id)).toEqual(['p-ana']);
    expect(enB[0].nombre).toBe('Ana');
  });

  it('el borrado es lógico: viaja y el otro equipo deja de verla', async () => {
    const espejo = new TransporteMemoria();
    const a = equipo(espejo);
    const b = equipo(espejo);
    await a.repo.guardar('personas', ana);
    await a.sync.ciclo();
    await b.sync.ciclo();
    await b.repo.borrar('personas', 'p-ana');
    await b.sync.ciclo();
    await a.sync.ciclo();
    expect(await a.repo.listar('personas')).toEqual([]);
    // En el espejo el registro SIGUE, marcado borrado: es su propia tumba.
    const crudo = espejo.crudo('personas');
    expect(crudo).toHaveLength(1);
    expect(crudo[0].borrado).toBe(true);
  });

  it('la absorbida no resucita: ni al bajar ni si un equipo viejo la re-sube', async () => {
    const espejo = new TransporteMemoria();
    const a = equipo(espejo); // el equipo viejo, desactualizado
    const b = equipo(espejo);
    await a.repo.guardar('personas', ana);
    await a.sync.ciclo();
    await b.sync.ciclo();
    // En B se une Ana con otra ficha: se registra absorbida y se borra.
    await b.sync.registrarAbsorbida('p-ana');
    await b.repo.borrar('personas', 'p-ana');
    await b.sync.ciclo();
    // El equipo viejo la edita (sin saber nada) y sincroniza: la re-sube viva.
    await a.repo.guardar('personas', { ...ana, telefono: '555' });
    await a.sync.ciclo();
    // B sincroniza: no la recibe viva y el espejo la vuelve a marcar borrada.
    await b.sync.ciclo();
    expect(await b.repo.listar('personas')).toEqual([]);
    expect(espejo.crudo('personas')[0].borrado).toBe(true);
  });

  it('sin conexión, todo queda encolado y el error se nombra; al volver, sale', async () => {
    const espejo = new TransporteMemoria();
    const a = equipo(espejo);
    await a.repo.guardar('personas', ana);
    espejo.fallo = new Error('sin red');
    await a.sync.ciclo();
    expect(a.sync.estadoActual.error).toContain('personas');
    expect(await a.repo.contarPendientes()).toBe(1);
    // Probar la conexión NO limpia el error (la lección de 2026).
    espejo.fallo = null;
    await a.sync.probarConexion();
    expect(a.sync.estadoActual.error).not.toBe('');
    // Un ciclo limpio sí.
    await a.sync.ciclo();
    expect(a.sync.estadoActual.error).toBe('');
    expect(await a.repo.contarPendientes()).toBe(0);
  });

  it('de la base al motor: el caso de 2026 guardado y leído cuadra en verde', async () => {
    const espejo = new TransporteMemoria();
    const a = equipo(espejo);
    await sembrarCatalogoSiVacio(a.repo);
    for (const p of CASO_2026.personas) await a.repo.guardar('personas', p);
    for (const c of CASO_2026.conversiones) await a.repo.guardar('conversiones', c);
    for (const m of CASO_2026.miembros) await a.repo.guardar('miembros', m);
    for (const e of CASO_2026.estudiantes) await a.repo.guardar('estudiantes', e);
    for (const d of CASO_2026.diezmadores) await a.repo.guardar('diezmadores', d);
    for (const h of CASO_2026.hitos) await a.repo.guardar('hitos', h);
    for (const x of CASO_2026.asignaciones) await a.repo.guardar('asignaciones', x);
    const datos = await aDatosMinisterio(a.repo);
    expect(verificarCuadre(datos).verde).toBe(true);
  });
});
