import { describe, expect, it } from 'vitest';
import type { DatosMinisterio } from '../modelo/tipos';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import { TIPOS_APORTE_RED, resumenRed, tiposAporteRed } from './red';

const datos: DatosMinisterio = {
  personas: [], conversiones: [], miembros: [], estudiantes: [], diezmadores: [],
  beneficiarios: [], hitos: [], asignaciones: [], grupos: [], evangelismos: [],
  aportes: [], pasos: CATALOGO_SEMILLA,
  colaboradores: [
    { id: 'c1', nombre: 'CORBAN', apellido: 'MINISTERIO', estado: 'Activo', tipo: 'Ministerio' },
    { id: 'c2', nombre: 'Ana', estado: 'Inactivo', tipo: 'Persona' },
  ],
  campanas: [], entregas: [],
  aportesRed: [
    { id: 'a1', colaboradorId: 'c1', fecha: '2025-08-10', monto: 210, tipo: 'Diezmo' },
    { id: 'a2', colaboradorId: 'c1', fecha: '2026-01-05', monto: 100, tipo: 'Ofrenda' },
    { id: 'a3', colaboradorId: 'c2', fecha: '2026-01-20', monto: 50, tipo: 'Ofrenda' },
  ],
};

describe('resumenRed', () => {
  it('cuenta activos/inactivos y suma aportes por colaborador', () => {
    const r = resumenRed(datos);
    expect(r.activos).toBe(1);
    expect(r.inactivos).toBe(1);
    expect(r.totalAportes).toBe(360);
    expect(r.cantidadAportes).toBe(3);
    expect(r.porColaborador.get('c1')).toBe(310);
  });

  it('con período, solo suma los aportes del período', () => {
    const r = resumenRed(datos, { desde: '2026-01-01', hasta: '2026-01-31' });
    expect(r.totalAportes).toBe(150);
    expect(r.cantidadAportes).toBe(2);
    expect(r.porColaborador.get('c1')).toBe(100);
  });
});

const datosTipos: DatosMinisterio = {
  ...datos,
  aportesRed: [
    { id: 'b1', colaboradorId: 'c1', fecha: '2026-02-01', monto: 500, tipo: 'Manos Abiertas' },
    { id: 'b2', colaboradorId: 'c1', fecha: '2026-02-02', monto: 300, tipo: 'Manos Abiertas' },
    { id: 'b3', colaboradorId: 'c2', fecha: '2026-02-03', monto: 100, tipo: 'Diezmo' },
    { id: 'b4', colaboradorId: 'c2', fecha: '2025-05-01', monto: 50, tipo: 'Donación' },
  ],
};

describe('los tipos de aporte de la Red', () => {
  it('la lista base es la de LemGil, en su orden', () => {
    expect(TIPOS_APORTE_RED).toEqual(['Diezmo', 'Ofrenda General', 'Manos Abiertas', 'Misión', 'Ofrenda']);
    expect(tiposAporteRed(datos)).toEqual(TIPOS_APORTE_RED);
  });

  it('un tipo que ya vive en los aportes se suma a la lista, sin duplicar', () => {
    const lista = tiposAporteRed(datosTipos);
    expect(lista).toEqual([...TIPOS_APORTE_RED, 'Donación']);
    expect(new Set(lista).size).toBe(lista.length);
  });

  it('el resumen suma por tipo y respeta el período', () => {
    const r = resumenRed(datosTipos);
    expect(r.porTipo.get('Manos Abiertas')).toBe(800);
    expect(r.porTipo.get('Diezmo')).toBe(100);
    expect(r.porTipo.get('Donación')).toBe(50);
    const feb = resumenRed(datosTipos, { desde: '2026-02-01', hasta: '2026-02-28' });
    expect(feb.porTipo.get('Manos Abiertas')).toBe(800);
    expect(feb.porTipo.has('Donación')).toBe(false);
  });
});
