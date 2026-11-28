import { describe, expect, it } from 'vitest';
import type { AporteRed, Colaborador, DatosMinisterio } from '../modelo/tipos';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import type { Fila } from '../datos/db';
import type { RespaldoViejo } from './convertir';
import { diagnosticoRed } from './diagnosticoRed';

const respaldo: RespaldoViejo = {
  colaboradores: [
    { id: 'i1', nombre: 'ISABEL', apellido: 'MIRANDA', estado: 'Activo', tipo: 'Persona' },
    { id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona' },
    { id: 'm1', nombre: 'MAYLI', apellido: 'PEGUERO', estado: 'Activo', tipo: 'Persona' },
  ],
  aportes: [
    { id: 'a1', colaboradorId: 'i1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
    { id: 'a2', colaboradorId: 'i1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
    { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
    { id: 'a4', colaboradorId: 'm1', fecha: '2025-04-01', monto: 70, tipo: 'Diezmo' },
  ],
};

const fila = (id: string, borrado: boolean): Fila =>
  ({ id, version: 1, actualizado: '', borrado, datos: {} }) as unknown as Fila;

describe('diagnosticoRed', () => {
  it('nombra cada caso: otro nombre, tumba, aportes en otra ficha y caídos', () => {
    const datos: DatosMinisterio = {
      personas: [], conversiones: [], miembros: [], estudiantes: [], diezmadores: [],
      beneficiarios: [], hitos: [], asignaciones: [], grupos: [], evangelismos: [],
      aportes: [], pasos: CATALOGO_SEMILLA, campanas: [], entregas: [],
      reuniones: [],
      academias: [], encuentros: [], ministerios: [],
      colaboradores: [
        // La ficha de Isabel vive, pero con el nombre de Gina.
        { id: 'i1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo' } as Colaborador,
        { id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo' } as Colaborador,
        { id: 'x1', nombre: 'NUEVO', estado: 'Activo' } as Colaborador,
      ],
      aportesRed: [
        { id: 'a1', colaboradorId: 'i1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
        { id: 'a2', colaboradorId: 'g1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
        { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
        // a4 no está vivo: cayó.
      ],
    };
    const lineas = diagnosticoRed(
      datos,
      respaldo,
      [fila('i1', false), fila('g1', false), fila('m1', true), fila('x1', false)],
      [fila('a1', false), fila('a2', false), fila('a3', false), fila('a4', true)],
    );
    const isabel = lineas.find((l) => l.startsWith('ISABEL MIRANDA'));
    expect(isabel).toContain('con otro nombre: «GINA HERRERA»');
    expect(isabel).toContain('en su ficha: 1');
    expect(isabel).toContain('en la ficha de «GINA HERRERA»: 1');
    const mayli = lineas.find((l) => l.startsWith('MAYLI'));
    expect(mayli).toContain('BORRADA');
    expect(mayli).toContain('borrados o ausentes: 1');
    expect(lineas.some((l) => l.includes('creada en la app'))).toBe(true);
    expect(lineas[lineas.length - 1]).toContain('3 colaboradores vivos · 3 aportes vivos');
  });

  it('con todo en su sitio, cada ficha sale bien y con sus aportes', () => {
    const datos: DatosMinisterio = {
      personas: [], conversiones: [], miembros: [], estudiantes: [], diezmadores: [],
      beneficiarios: [], hitos: [], asignaciones: [], grupos: [], evangelismos: [],
      aportes: [], pasos: CATALOGO_SEMILLA, campanas: [], entregas: [],
      reuniones: [],
      academias: [], encuentros: [], ministerios: [],
      colaboradores: [
        { id: 'i1', nombre: 'ISABEL', apellido: 'MIRANDA', estado: 'Activo' } as Colaborador,
        { id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo' } as Colaborador,
        { id: 'm1', nombre: 'MAYLI', apellido: 'PEGUERO', estado: 'Activo' } as Colaborador,
      ],
      aportesRed: (respaldo.aportes as unknown as AporteRed[]).map((a) => ({ ...a })),
    };
    const lineas = diagnosticoRed(datos, respaldo, [], []);
    expect(lineas[0]).toContain('ficha bien, con su nombre');
    expect(lineas[0]).toContain('en su ficha: 2');
  });
});
