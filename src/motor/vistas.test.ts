import { describe, expect, it } from 'vitest';
import { agrupar, visibleSegunVer } from './vistas';

describe('agrupar', () => {
  it('agrupa por la clave y manda los «Sin …» al final', () => {
    const items = [
      { n: 'Ana', z: 'Norte' },
      { n: 'Beto', z: 'Sin zona' },
      { n: 'Cora', z: 'Norte' },
      { n: 'Dario', z: 'Este' },
    ];
    const g = agrupar(items, (i) => i.z);
    expect(g.map((x) => x.titulo)).toEqual(['Este', 'Norte', 'Sin zona']);
    expect(g[1].items.map((i) => i.n)).toEqual(['Ana', 'Cora']);
  });
});

describe('visibleSegunVer', () => {
  it('activos esconde las bajas; bajas muestra solo las bajas', () => {
    expect(visibleSegunVer('etapa', 'activos')).toBe(true);
    expect(visibleSegunVer('miembro', 'activos')).toBe(true);
    expect(visibleSegunVer('inactivo', 'activos')).toBe(true);
    expect(visibleSegunVer('apartado', 'activos')).toBe(false);
    expect(visibleSegunVer('trasladado', 'activos')).toBe(false);
    expect(visibleSegunVer('fallecido', 'activos')).toBe(false);
    expect(visibleSegunVer('apartado', 'bajas')).toBe(true);
    expect(visibleSegunVer('etapa', 'bajas')).toBe(false);
    expect(visibleSegunVer('fallecido', 'todos')).toBe(true);
  });
});
