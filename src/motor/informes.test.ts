import { describe, expect, it } from 'vitest';
import { construirInforme, type Informe } from './informes';
import { CASO_2026, NOVIEMBRE_2026 } from './casos';
import type { DatosMinisterio } from '../modelo/tipos';

/** Busca una fila por el final de su etiqueta (las de pasos llevan emoji). */
function fila(informe: Informe, seccion: string, etiqueta: string): string | undefined {
  const s = informe.secciones.find((x) => x.titulo.includes(seccion));
  return s?.filas.find(([k]) => k === etiqueta || k.endsWith(etiqueta))?.[1];
}

describe('informes por departamento — los mismos números del motor', () => {
  it('el General trae el censo y el cuadre en verde', () => {
    const inf = construirInforme('general', CASO_2026, { periodo: NOVIEMBRE_2026 });
    expect(fila(inf, 'Censo', 'Total de Congregados')).toBe('9');
    expect(fila(inf, 'Censo', 'Discipulado')).toBe('2');
    expect(fila(inf, 'cuadre', 'Estado')).toContain('🟢');
    expect(fila(inf, 'Movimiento', 'Confesiones')).toBe('2');
    expect(fila(inf, 'Movimiento', 'Conversiones')).toBe('1');
    expect(fila(inf, 'Movimiento', 'Bajas')).toBe('1');
  });

  it('Misión informa personas: lo principal y lo ampliado del período', () => {
    const inf = construirInforme('mision', CASO_2026, { periodo: NOVIEMBRE_2026 });
    expect(inf.principal).toBe(
      'Se terminó con: 1 Alcanzados · 0 Bautizados · 0 Añadidos · 1 Bajas · 2 En Proceso',
    );
    expect(fila(inf, 'Alcanzados', 'Uno')).toContain('hoy: Alcanzado');
    expect(fila(inf, 'Las bajas', 'Nueve')).toContain('Apartado · 2026-11-12');
    expect(fila(inf, 'En proceso', 'Tres')).toContain('Discipulado');
  });

  it('Miembros: la foto y la escalera coinciden con las tarjetas', () => {
    const inf = construirInforme('miembros', CASO_2026);
    expect(fila(inf, 'foto', 'Activos')).toBe('3');
    expect(fila(inf, 'escalera', 'Diezmadores')).toBe('1');
    expect(fila(inf, 'escalera', 'Hermano Mayor (los que son)')).toBe('1');
  });

  it('Academia y Bien Común cuentan sus registros', () => {
    expect(fila(construirInforme('academia', CASO_2026), 'Estudiantes', 'Activos')).toBe('1');
    expect(fila(construirInforme('bien-comun', CASO_2026), 'Diezmadores', 'Activos')).toBe('3');
  });
});

describe('el informe de Ministerios dentro de Miembros y Ministerios', () => {
  const datos = {
    personas: [
      { id: 'p1', nombre: 'Ana', apellidos: 'Paz' },
      { id: 'p2', nombre: 'Beto', apellidos: 'Río' },
      { id: 'p3', nombre: 'Cora', apellidos: 'Sol' },
      { id: 'p4', nombre: 'Darío', apellidos: 'Mar' },
    ],
    conversiones: [],
    miembros: [
      { id: 'm1', personaId: 'p1', estado: 'Activo', fechaIngreso: '2025-01-05' },
      { id: 'm2', personaId: 'p2', estado: 'Activo', fechaIngreso: '2025-01-05' },
      { id: 'm3', personaId: 'p3', estado: 'Activo', fechaIngreso: '2025-01-05' },
    ],
    estudiantes: [],
    diezmadores: [],
    beneficiarios: [],
    hitos: [],
    asignaciones: [
      { id: 'a1', personaId: 'p1', ministerio: 'Intercesión' },
      { id: 'a2', personaId: 'p1', ministerio: 'Alabanza' },
      { id: 'a3', personaId: 'p3', ministerio: 'Intercesión' },
      { id: 'a4', personaId: 'p4', ministerio: 'Alabanza' },
    ],
    grupos: [],
    evangelismos: [],
    aportes: [],
    colaboradores: [],
    aportesRed: [],
    campanas: [],
    entregas: [],
    reuniones: [],
    academias: [],
    encuentros: [],
    ministerios: [
      { id: 'min1', nombre: 'Intercesión', inicio: '2025-03-02', mision: 'Orar por la casa', responsableId: 'p3' },
      { id: 'min2', nombre: 'Nuevo Ministerio' },
    ],
    pasos: [],
  } as DatosMinisterio;

  it('el servicio: los totales del servicio salen de las asignaciones y las fichas', () => {
    const inf = construirInforme('miembros', datos);
    expect(fila(inf, 'El servicio', 'Ministerios')).toBe('3');
    expect(fila(inf, 'El servicio', 'Con ficha registrada')).toBe('2');
    expect(fila(inf, 'El servicio', 'Personas sirviendo')).toBe('3');
    expect(fila(inf, 'El servicio', 'Sin nadie al frente')).toBe('2');
    expect(fila(inf, 'El servicio', 'Sin gente todavía')).toBe('1');
  });

  it('cada ministerio con su responsable, su gente y su inicio; y su misión aparte', () => {
    const inf = construirInforme('miembros', datos);
    expect(fila(inf, 'Los ministerios', 'Intercesión')).toContain('Al frente: Cora Sol');
    expect(fila(inf, 'Los ministerios', 'Intercesión')).toContain('2 sirviendo');
    expect(fila(inf, 'Los ministerios', 'Intercesión')).toContain('desde el 2 mar 2025');
    expect(fila(inf, 'Las misiones', 'Intercesión')).toBe('Orar por la casa');
  });

  it('a cuidar: el miembro que no sirve, el que sirve en varios y el ministerio vacío', () => {
    const inf = construirInforme('miembros', datos);
    expect(fila(inf, 'A cuidar', 'Beto Río')).toContain('aún no sirve');
    expect(fila(inf, 'A cuidar', 'Ana Paz')).toContain('Sirve en 2');
    // «Nuevo Ministerio» sale dos veces en A cuidar: sin frente y sin gente.
    const cuidar = inf.secciones.find((x) => x.titulo.includes('A cuidar'));
    expect(
      cuidar?.filas.some(([k, v]) => k === 'Nuevo Ministerio' && v.includes('sin gente')),
    ).toBe(true);
    expect(fila(inf, 'A cuidar', 'Alabanza')).toContain('sin nadie al frente');
  });
});
