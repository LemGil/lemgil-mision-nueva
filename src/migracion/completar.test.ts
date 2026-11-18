import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { BaseLocal } from '../datos/db';
import { Repo } from '../datos/repo';
import type { Persona } from '../modelo/tipos';
import { completarPersonas, rellenosPara, vistaPreviaCompletar } from './completar';

const local: Persona = { id: 'p1', nombre: 'Ana', telefono: '555' };
const remota: Persona = {
  id: 'p1',
  nombre: 'Ana',
  apellidos: 'Uno',
  telefono: '999',
  profesion: 'Maestra',
  bautizado: true,
  fechaBautismo: '2020-01-01',
};

describe('completar datos desde el respaldo', () => {
  it('rellena solo los huecos y nunca sobrescribe', () => {
    const r = rellenosPara(local, remota);
    expect(r.apellidos).toBe('Uno');
    expect(r.profesion).toBe('Maestra');
    expect(r.bautizado).toBe(true);
    expect(r.telefono).toBeUndefined();
  });

  it('la vista previa cuenta por campo y salta a quien no está', () => {
    const { resumen, cambios } = vistaPreviaCompletar(
      [local],
      [remota, { id: 'pX', nombre: 'Nadie' }],
    );
    expect(resumen.personas).toBe(1);
    expect(resumen.campos.apellidos).toBe(1);
    expect(cambios).toHaveLength(1);
  });

  it('escribe en el repo solo los rellenos', async () => {
    const repo = new Repo(new BaseLocal('completar-1'));
    await repo.guardar('personas', local);
    const resumen = await completarPersonas(
      repo,
      { personas: [{ id: 'p1', nombre: 'Ana', apellido: 'Uno', profesion: 'Maestra', bautizado: false }] },
      [local],
    );
    expect(resumen.personas).toBe(1);
    const datos = await aDatosMinisterio(repo);
    expect(datos.personas[0].apellidos).toBe('Uno');
    expect(datos.personas[0].profesion).toBe('Maestra');
    expect(datos.personas[0].bautizado).toBe(false);
    expect(datos.personas[0].telefono).toBe('555');
  });
});
