import { describe, expect, it } from 'vitest';
import { estadoDesdeHistorial, historialOrdenado } from './mision';

describe('estadoDesdeHistorial', () => {
  it('manda la entrada de fecha más reciente, aunque el historial venga desordenado', () => {
    const h = [
      { fecha: '2026-03-01', estado: 'ps-nuevo' },
      { fecha: '2026-01-15', estado: 'ps-congregado' },
      { fecha: '2026-02-10', estado: 'ps-confeso' },
    ];
    expect(estadoDesdeHistorial(h)).toBe('ps-nuevo');
    expect(historialOrdenado(h).map((e) => e.estado)).toEqual([
      'ps-congregado',
      'ps-confeso',
      'ps-nuevo',
    ]);
  });

  it('a igual fecha manda la última escrita; vacío da null', () => {
    const h = [
      { fecha: '2026-01-15', estado: 'ps-congregado' },
      { fecha: '2026-01-15', estado: 'ps-confeso' },
    ];
    expect(estadoDesdeHistorial(h)).toBe('ps-confeso');
    expect(estadoDesdeHistorial([])).toBeNull();
  });
});
