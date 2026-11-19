import { describe, expect, it } from 'vitest';
import { pasosDeMiembros } from '../modelo/catalogo';
import type { Paso } from '../modelo/tipos';

const paso = (id: string, nombre: string, orden: number): Paso => ({
  id,
  ambito: 'miembros',
  nombre,
  emoji: '',
  orden,
});

describe('pasosDeMiembros sin duplicados', () => {
  it('con dos pasos del mismo nombre deja solo el primero por orden', () => {
    const pasos = [
      paso('pm-diezmo', 'Diezmador', 3),
      paso('uuid-propio', 'Diezmador', 2),
      paso('pm-grupo', 'En un grupo', 1),
    ];
    const r = pasosDeMiembros(pasos);
    expect(r.map((p) => p.nombre)).toEqual(['En un grupo', 'Diezmador']);
    expect(r[1].id).toBe('uuid-propio');
  });

  it('nombres distintos no se tocan', () => {
    const pasos = [paso('a', 'Grupo', 1), paso('b', 'Academia', 2)];
    expect(pasosDeMiembros(pasos)).toHaveLength(2);
  });
});
