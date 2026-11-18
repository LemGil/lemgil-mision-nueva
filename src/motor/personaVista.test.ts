import { describe, expect, it } from 'vitest';
import { buscarPersonas, fichaDePersona, situacionDe } from './personaVista';
import { CASO_2026 } from './casos';

describe('la ficha de la persona', () => {
  it('la situación sale de la misma clasificación del censo', () => {
    expect(situacionDe(CASO_2026, 'p3')).toEqual({ texto: '📖 Discipulado', tono: 'ambar' });
    expect(situacionDe(CASO_2026, 'p8').texto).toBe('Miembro inactivo');
    expect(situacionDe(CASO_2026, 'p9').texto).toBe('Apartado');
    expect(situacionDe(CASO_2026, 'p7').texto).toBe('Miembro activo');
  });

  it('la duplicada muestra sus dos procesos y la señal de repetido', () => {
    const ficha = fichaDePersona(CASO_2026, 'p3');
    expect(ficha?.mision).toHaveLength(2);
    expect(ficha?.repetidos).toEqual([{ proceso: 'Misión', cantidad: 2 }]);
  });

  it('la integrada muestra su escalera de miembro', () => {
    const ficha = fichaDePersona(CASO_2026, 'p7');
    expect(ficha?.miembros).toHaveLength(1);
    expect(ficha?.escaleras[0].escalera.cumplidos).toBe(4);
  });

  it('buscar por nombre, teléfono o carné', () => {
    const datos = {
      ...CASO_2026,
      personas: CASO_2026.personas.map((p) =>
        p.id === 'p3' ? { ...p, telefono: '555-1234', numeroIdentidad: '90010112345' } : p,
      ),
    };
    expect(buscarPersonas(datos, 'tres').map((p) => p.id)).toEqual(['p3']);
    expect(buscarPersonas(datos, '1234').map((p) => p.id)).toEqual(['p3']);
    expect(buscarPersonas(datos, '010112').map((p) => p.id)).toEqual(['p3']);
    expect(buscarPersonas(datos, '')).toHaveLength(12);
  });
});
