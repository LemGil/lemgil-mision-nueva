import { describe, expect, it } from 'vitest';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import type { DatosMinisterio } from '../modelo/tipos';
import {
  conteoPorPasoDelGrupo,
  estadoGrupo,
  liderVisible,
  lineaReunion,
  porcentajeCapacidad,
} from './gruposVista';

describe('estadoGrupo (la regla de la app de siempre)', () => {
  it('sin capacidad: Sin meta', () => {
    expect(estadoGrupo(10, 0).etiqueta).toBe('⚪ Sin meta');
    expect(estadoGrupo(10, undefined).etiqueta).toBe('⚪ Sin meta');
  });
  it('menos del 70%: Disponible', () => {
    expect(estadoGrupo(27, 40).etiqueta).toBe('🟢 Disponible');
  });
  it('70% justo: Casi Lleno (el caso de la foto: 28 de 40)', () => {
    expect(estadoGrupo(28, 40).etiqueta).toBe('🟡 Casi Lleno');
  });
  it('100% o más: Saturado', () => {
    expect(estadoGrupo(40, 40).etiqueta).toBe('🔴 Saturado');
    expect(estadoGrupo(45, 40).etiqueta).toBe('🔴 Saturado');
  });
  it('la barra se recorta a 100', () => {
    expect(porcentajeCapacidad(28, 40)).toBe(70);
    expect(porcentajeCapacidad(50, 40)).toBe(100);
    expect(porcentajeCapacidad(3, 0)).toBe(0);
  });
});

const datos = {
  personas: [
    { id: 'p1', nombre: 'Luis', apellidos: 'Pérez' },
    { id: 'p2', nombre: 'Ana' },
    { id: 'p3', nombre: 'Juan' },
    { id: 'p4', nombre: 'Eva' },
  ],
  conversiones: [
    { id: 'c1', personaId: 'p1', estado: 'ps-nuevo', fecha: '2024-01-01', historial: [] },
    { id: 'c2', personaId: 'p2', estado: 'ps-discipulado', fecha: '2024-01-01', historial: [] },
    { id: 'c3', personaId: 'p3', estado: 'ps-integrado', fecha: '2024-01-01', historial: [] },
    { id: 'c4', personaId: 'p4', estado: 'ps-integrado', fecha: '2024-01-01', historial: [] },
  ],
  pasos: CATALOGO_SEMILLA,
} as unknown as DatosMinisterio;

describe('conteoPorPasoDelGrupo y textos', () => {
  it('cuenta los asignados por paso de la foto', () => {
    const r = conteoPorPasoDelGrupo(datos, new Set(['p1', 'p2', 'p3', 'p4']));
    expect(r.map((x) => [x.corto, x.n])).toEqual([
      ['Conversos', 1],
      ['Discip.', 1],
      ['Bautiz.', 0],
      ['Integr.', 2],
    ]);
  });
  it('el líder en texto libre manda sobre la persona', () => {
    const g = { id: 'g1', nombre: 'G', liderId: 'p1', liderTexto: 'Pastores Luis y Daymi' };
    expect(liderVisible(datos, g)).toBe('Pastores Luis y Daymi');
    expect(liderVisible(datos, { id: 'g1', nombre: 'G', liderId: 'p1' })).toBe('Luis Pérez');
    expect(liderVisible(datos, { id: 'g1', nombre: 'G' })).toBe('');
  });
  it('la línea de reunión junta lo que haya', () => {
    expect(lineaReunion({ id: 'g', nombre: 'G', dia: 'Domingo', hora: '10:30', lugar: 'CASA CENTRO' })).toBe('Domingo 10:30 · CASA CENTRO');
    expect(lineaReunion({ id: 'g', nombre: 'G', lugar: 'CASA CENTRO' })).toBe('CASA CENTRO');
    expect(lineaReunion({ id: 'g', nombre: 'G' })).toBe('');
  });
});
