import { describe, expect, it } from 'vitest';
import { verificarCuadre } from './cuadre';
import { procesosRepetidos } from './repetidos';
import { CASO_2026 } from './casos';

describe('el cuadre', () => {
  it('el caso de 2026 cuadra en verde, con la duplicada señalada', () => {
    const r = verificarCuadre(CASO_2026);
    expect(r.chequeos.map((c) => [c.nombre, c.ok])).toEqual([
      ['El total es la suma de etapas + miembros', true],
      ['Registros en proceso − personas con proceso = excedentes', true],
      ['Los excedentes están señalados en Personas', true],
      ['Las tarjetas de Misión cubren todos los registros', true],
      ['Ningún proceso sin persona', true],
    ]);
    expect(r.verde).toBe(true);

    const repetidos = procesosRepetidos(CASO_2026);
    expect(repetidos.get('p3')).toEqual([{ proceso: 'Misión', cantidad: 2 }]);
  });

  it('un proceso huérfano pone el cuadre en rojo', () => {
    const roto = {
      ...CASO_2026,
      conversiones: [
        ...CASO_2026.conversiones,
        { id: 'cx', personaId: 'fantasma', estado: 'ps-confeso', fecha: '2026-11-01', historial: [] },
      ],
    };
    const r = verificarCuadre(roto);
    expect(r.verde).toBe(false);
    expect(r.chequeos.find((c) => c.nombre === 'Ningún proceso sin persona')?.ok).toBe(false);
  });
});
