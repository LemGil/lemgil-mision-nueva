import { describe, expect, it } from 'vitest';
import { construirInforme, type Informe } from './informes';
import { CASO_2026, NOVIEMBRE_2026 } from './casos';

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

  it('Misión informa registros: En proceso 9, no las 6 personas', () => {
    const inf = construirInforme('mision', CASO_2026, { periodo: NOVIEMBRE_2026 });
    expect(fila(inf, 'proceso', 'En proceso')).toBe('9');
    expect(fila(inf, 'proceso', 'Confeso')).toContain('2 en el período');
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
