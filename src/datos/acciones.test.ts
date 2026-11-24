import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  PS_ALCAZADO,
  PS_APARTADO,
  PS_BAUTIZADO,
  PS_CONFESO,
  PS_CONVERSO,
  PS_INTEGRADO,
  PS_TRASLADO,
} from '../modelo/catalogo';
import { aDatosMinisterio, sembrarCatalogoSiVacio } from './aDatosMinisterio';
import { avanzarConversion, agregarAGrupo, borrarGrupo, crearConversion, crearConversionLlegaBautizado, crearMiembro, darAltasDirectas, quitarDeGrupo, registrarPersona } from './acciones';
import { idsGruposDe } from '../motor/gruposVista';
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

describe('altas directas desde la edición de la ficha', () => {
  it('marcar un alta que le falta la crea, con la misma siembra del registro nuevo', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Gala' }, {}, HOY);
    const datos = await aDatosMinisterio(repo);
    await darAltasDirectas(repo, datos, p.id, { mision: 'converso', beneficiario: true }, HOY);
    const datos2 = await aDatosMinisterio(repo);
    const conv = datos2.conversiones.find((c) => c.personaId === p.id);
    expect(conv?.estado).toBe(PS_CONVERSO);
    expect(conv?.historial).toEqual([{ fecha: HOY, estado: PS_CONVERSO, nota: 'Registro inicial' }]);
    expect(datos2.beneficiarios.find((b) => b.personaId === p.id)?.estado).toBe('Activo');
  });

  it('la combinación Integrado en edición: la conversión nace en el gozne y el miembro enlazado', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Juan' }, {}, HOY);
    const datos = await aDatosMinisterio(repo);
    await darAltasDirectas(repo, datos, p.id, { integrado: true }, HOY);
    const datos2 = await aDatosMinisterio(repo);
    const conv = datos2.conversiones.find((c) => c.personaId === p.id);
    const miembro = datos2.miembros.find((m) => m.personaId === p.id);
    expect(conv?.estado).toBe(PS_INTEGRADO);
    expect(miembro?.estado).toBe('Activo');
    expect(miembro?.conversionId).toBe(conv?.id);
  });

  it('si ya tiene el proceso, el alta se bloquea y nada se duplica', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(
      repo, datos0, { nombre: 'Hugo' }, { integrado: true, beneficiario: true }, HOY,
    );
    const datos = await aDatosMinisterio(repo);
    await expect(
      darAltasDirectas(repo, datos, p.id, { mision: 'alcanzado' }, HOY),
    ).rejects.toThrow('ya está en Misión');
    await expect(
      darAltasDirectas(repo, datos, p.id, { integrado: true }, HOY),
    ).rejects.toThrow('ya está en Misión');
    await expect(
      darAltasDirectas(repo, datos, p.id, { beneficiario: true }, HOY),
    ).rejects.toThrow('ya es beneficiaria');
    const datos2 = await aDatosMinisterio(repo);
    expect(datos2.conversiones.filter((c) => c.personaId === p.id)).toHaveLength(1);
    expect(datos2.miembros.filter((m) => m.personaId === p.id)).toHaveLength(1);
    expect(datos2.beneficiarios.filter((b) => b.personaId === p.id)).toHaveLength(1);
  });

  it('el miembro directo (sin Misión) también bloquea el alta Integrado', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Iris' }, {}, HOY);
    const datos = await aDatosMinisterio(repo);
    await crearMiembro(repo, datos, p.id, HOY);
    const datos2 = await aDatosMinisterio(repo);
    await expect(
      darAltasDirectas(repo, datos2, p.id, { integrado: true }, HOY),
    ).rejects.toThrow('ya es miembro');
    expect(
      (await aDatosMinisterio(repo)).miembros.filter((m) => m.personaId === p.id),
    ).toHaveLength(1);
  });

  it('una conversión cerrada como salida (Apartado) también bloquea: el bloqueo mira el registro, no su estado', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Karla' }, { mision: 'converso' }, HOY);
    const datos = await aDatosMinisterio(repo);
    const conv = datos.conversiones.find((c) => c.personaId === p.id)!;
    await avanzarConversion(repo, datos, conv.id, PS_APARTADO, HOY);
    const datos2 = await aDatosMinisterio(repo);
    await expect(
      darAltasDirectas(repo, datos2, p.id, { mision: 'alcanzado' }, HOY),
    ).rejects.toThrow('ya está en Misión');
    expect(
      (await aDatosMinisterio(repo)).conversiones.filter((c) => c.personaId === p.id),
    ).toHaveLength(1);
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

  it('quien llega bautizado: nace en Alcanzado, con su bautismo en la persona y la nota en el historial', async () => {
    const repo = await repoListo();
    const datos0 = await aDatosMinisterio(repo);
    const p = await registrarPersona(repo, datos0, { nombre: 'Llega Bautizado' }, {}, HOY);
    const datos1 = await aDatosMinisterio(repo);
    await crearConversionLlegaBautizado(repo, datos1, p.id, '2020-05-01', HOY);
    const datos = await aDatosMinisterio(repo);
    const conv = datos.conversiones.find((c) => c.personaId === p.id);
    expect(conv?.estado).toBe(PS_ALCAZADO);
    expect(conv?.bautizado).toBe(true);
    expect(conv?.historial).toEqual([
      { fecha: HOY, estado: PS_ALCAZADO, nota: 'Llegó bautizado/a de otra congregación' },
    ]);
    const persona = datos.personas.find((x) => x.id === p.id);
    expect(persona?.bautizado).toBe(true);
    expect(persona?.fechaBautismo).toBe('2020-05-01');
    // Y el bloqueo duro sigue: no puede tener dos registros.
    await expect(
      crearConversionLlegaBautizado(repo, datos, p.id, '', HOY),
    ).rejects.toThrow('solo puede tener UN registro');
  });
});

describe('grupos con tipos: un grupo por tipo', () => {
  it('la persona está en su Iglesia y su Oikos; cambiar de Oikos no toca la Iglesia', async () => {
    const repo = await repoListo();
    await repo.guardar('grupos', { id: 'g-iglesia', nombre: 'IGLESIA 120 Y 51', tipo: 'Iglesia' });
    await repo.guardar('grupos', { id: 'g-oikos', nombre: 'OIKOS ALICIA', tipo: 'Oikos' });
    await repo.guardar('grupos', { id: 'g-oikos2', nombre: 'OIKOS BETEL', tipo: 'Oikos' });
    await repo.guardar('personas', { id: 'p1', nombre: 'Luis' });
    await repo.guardar('miembros', { id: 'm1', personaId: 'p1', estado: 'Activo', fechaIngreso: HOY });
    let datos = await aDatosMinisterio(repo);
    await agregarAGrupo(repo, datos, 'p1', datos.grupos.find((g) => g.id === 'g-iglesia')!);
    datos = await aDatosMinisterio(repo);
    await agregarAGrupo(repo, datos, 'p1', datos.grupos.find((g) => g.id === 'g-oikos')!);
    datos = await aDatosMinisterio(repo);
    expect(idsGruposDe(datos, 'p1')).toEqual(['g-iglesia', 'g-oikos']);
    await agregarAGrupo(repo, datos, 'p1', datos.grupos.find((g) => g.id === 'g-oikos2')!);
    datos = await aDatosMinisterio(repo);
    expect(idsGruposDe(datos, 'p1')).toEqual(['g-iglesia', 'g-oikos2']);
    const per = datos.personas.find((x) => x.id === 'p1')!;
    const mie = datos.miembros.find((x) => x.personaId === 'p1')!;
    expect(per.grupoIds).toEqual(['g-iglesia', 'g-oikos2']);
    expect(mie.grupoIds).toEqual(['g-iglesia', 'g-oikos2']);
    expect(per.grupoId).toBe('g-iglesia');
    await quitarDeGrupo(repo, datos, 'p1', 'g-oikos2');
    datos = await aDatosMinisterio(repo);
    expect(idsGruposDe(datos, 'p1')).toEqual(['g-iglesia']);
  });
});

describe('la familia de grupos al borrar', () => {
  it('al borrar una Iglesia, sus Oikos quedan sin padre (no se rompen)', async () => {
    const repo = await repoListo();
    await repo.guardar('grupos', { id: 'g-iglesia', nombre: 'IGLESIA 120 Y 51', tipo: 'Iglesia' });
    await repo.guardar('grupos', { id: 'g-oikos', nombre: 'OIKOS ALICIA', tipo: 'Oikos', padreId: 'g-iglesia' });
    const datos = await aDatosMinisterio(repo);
    await borrarGrupo(repo, datos, 'g-iglesia');
    const datos2 = await aDatosMinisterio(repo);
    expect(datos2.grupos.map((g) => g.id)).toEqual(['g-oikos']);
    expect(datos2.grupos[0].padreId).toBeNull();
  });
});
