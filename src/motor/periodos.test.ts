import { describe, expect, it } from 'vitest';
import { anosConRegistros, mesesConRegistros } from './periodos';

describe('períodos desde las fechas reales', () => {
  const fechas = ['2024-01-13', '2024-03-02', '2026-08-22', '2026-08-30', undefined, null, 'sin-fecha', ''];

  it('años: solo los que tienen registros, recientes primero', () => {
    expect(anosConRegistros(fechas)).toEqual([2026, 2024]);
  });

  it('meses: solo los del año elegido que tienen registros', () => {
    expect(mesesConRegistros(fechas, 2024)).toEqual([1, 3]);
    expect(mesesConRegistros(fechas, 2026)).toEqual([8]);
    expect(mesesConRegistros(fechas, 2027)).toEqual([]);
  });
});
