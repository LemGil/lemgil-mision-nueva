import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  PS_APARTADO,
  PS_BAUTIZADO,
  PS_CONFESO,
  PS_CONVERSO,
  PS_INTEGRADO,
  PS_TRASLADO,
} from '../modelo/catalogo';
import { aDatosMinisterio, sembrarCatalogoSiVacio } from './aDatosMinisterio';
import { avanzarConversion, crearConversion, registrarPersona } from './acciones';
import { BaseLocal } from './db';
import { Repo } from './repo';

let n = 0;
async function repoListo() {
  const repo = new Repo(new BaseLocal(`acciones-${++n}`));
  await sembrarCatalogoSiVacio(repo);
  return repo;
}
const HOY = '2026-11-18';

describe('acciones con las reglas del modelo', () => {
  it('el carné duplicado bloquea el registro', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    await registrarPersona(repo, datos0, { nombre: 'Ana', numeroIdentidad: '12345' }, {}, HOY);
    const datos1 = await aDatosMinisterio(repo);
    await expect(
      registrarPersona(repo, datos1, { nombre: 'Ana Otra', numeroIdentidad: '123-45' }, {}, HOY),
    ).rejects.toThrow('Ya existe una persona con ese Nº de Identidad');
  });

  it('alta directa como Confeso: la conversión nace en Confeso con su historial', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Beto' }, { mision: 'confeso' }, HOY);
    const datos = await aDatosMinisterio(repo);
    const conv = datos.conversiones.find((c) => c.personaId === p.id);
    expect(conv?.estado).toBe(PS_CONFESO);
    expect(conv?.historial).toEqual([{ fecha: HOY, estado: PS_CONFESO, nota: 'Registro inicial' }]);
  });

  it('alta directa Integrado: nace la conversión en el gozne y el miembro enlazado', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Cora' }, { integrado: true }, HOY);
    const datos = await aDatosMinisterio(repo);
    const conv = datos.conversiones.find((c) => c.personaId === p.id);
    const miembro = datos.miembros.find((m) => m.personaId === p.id);
    expect(conv?.estado).toBe(PS_INTEGRADO);
    expect(miembro?.estado).toBe('Activo');
    expect(miembro?.conversionId).toBe(conv?.id);
  });

  it('bloqueo duro: una persona no puede tener dos registros en Misión', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Dario' }, { mision: 'alcanzado' }, HOY);
    const datos = await aDatosMinisterio(repo);
    await expect(crearConversion(repo, datos, p.id, 'converso', HOY)).rejects.toThrow(
      'ya está en Misión',
    );
  });

  it('avanzar al gozne crea el miembro una sola vez; la salida se refleja', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Elena' }, { mision: 'converso' }, HOY);
    let datos = await aDatosMinisterio(repo);
    const conv = datos.conversiones.find((c) => c.personaId === p.id)!;
    expect(conv.estado).toBe(PS_CONVERSO);

    await avanzarConversion(repo, datos, conv.id, PS_BAUTIZADO, HOY);
    datos = await aDatosMinisterio(repo);
    await avanzarConversion(repo, datos, conv.id, PS_INTEGRADO, HOY);
    datos = await aDatosMinisterio(repo);
    expect(datos.miembros.filter((m) => m.personaId === p.id)).toHaveLength(1);
    expect(datos.conversiones[0].bautizado).toBe(true);

    // Apartado: el miembro Activo pasa a Inactivo.
    await avanzarConversion(repo, datos, conv.id, PS_APARTADO, HOY);
    datos = await aDatosMinisterio(repo);
    expect(datos.miembros.find((m) => m.personaId === p.id)?.estado).toBe('Inactivo');
  });

  it('el traslado se refleja como miembro Trasladado', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Fito' }, { integrado: true }, HOY);
    const datos = await aDatosMinisterio(repo);
    const conv = datos.conversiones.find((c) => c.personaId === p.id)!;
    await avanzarConversion(repo, datos, conv.id, PS_TRASLADO, HOY);
    const datos2 = await aDatosMinisterio(repo);
    expect(datos2.miembros.find((m) => m.personaId === p.id)?.estado).toBe('Trasladado');
  });
});

describe('ministerios', () => {
  it('asignar crea la asignación y repetir en el mismo ministerio se bloquea', async () => {
    const { asignarMinisterio, quitarDeMinisterio } = await import('./acciones');
    const repo = await repoListo();
    const p = await registrarPersona(repo, await aDatosMinisterio(repo), { nombre: 'Luz' }, {}, HOY);
    const datos = await aDatosMinisterio(repo);
    const a = await asignarMinisterio(repo, datos, { personaId: p.id, ministerio: 'ENSEÑANZA' });
    expect(a.ministerio).toBe('ENSEÑANZA');
    const datos2 = await aDatosMinisterio(repo);
    expect(datos2.asignaciones).toHaveLength(1);
    await expect(
      asignarMinisterio(repo, datos2, { personaId: p.id, ministerio: 'enseñanza' }),
    ).rejects.toThrow('ya está en ese ministerio');
    await quitarDeMinisterio(repo, a.id);
    expect((await aDatosMinisterio(repo)).asignaciones).toHaveLength(0);
  });
});
