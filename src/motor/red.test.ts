import { describe, expect, it } from 'vitest';
import type { DatosMinisterio } from '../modelo/tipos';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import { resumenRed } from './red';

const datos: DatosMinisterio = {
  personas: [], conversiones: [], miembros: [], estudiantes: [], diezmadores: [],
  beneficiarios: [], hitos: [], asignaciones: [], grupos: [], evangelismos: [],
  aportes: [], pasos: CATALOGO_SEMILLA,
  colaboradores: [
    { id: 'c1', nombre: 'CORBAN', apellido: 'MINISTERIO', estado: 'Activo', tipo: 'Ministerio' },
    { id: 'c2', nombre: 'Ana', estado: 'Inactivo', tipo: 'Persona' },
  ],
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
