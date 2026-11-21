import { describe, expect, it } from 'vitest';
import { resumenBienComun } from './bienComun';
import { CASO_2026, NOVIEMBRE_2026 } from './casos';
import { puntosDelMapa, sinUbicacion } from './mapa';

describe('Bien Común', () => {
  it('los aportes se suman por período y por persona', () => {
    const nov = resumenBienComun(CASO_2026, NOVIEMBRE_2026);
    expect(nov.totalAportes).toBe(700); // 500 de p5 + 200 de p12 (la ofrenda de octubre no)
    expect(nov.cantidadAportes).toBe(2);
    expect(nov.porPersona.get('p12')).toBe(200);
    const todo = resumenBienComun(CASO_2026);
    expect(todo.totalAportes).toBe(850);
    expect(todo.diezmadoresActivos).toBe(3);
  });
});

describe('el mapa', () => {
  it('solo las fichas con chincheta son puntos; las demás se ofrecen para fijar', () => {
    const datos = {
      ...CASO_2026,
      personas: CASO_2026.personas.map((p) =>
        p.id === 'p1' ? { ...p, lat: 23.11, lng: -82.36 } : p,
      ),
    };
    const puntos = puntosDelMapa(datos);
    expect(puntos).toHaveLength(1);
    expect(puntos[0]).toMatchObject({ tipo: 'persona', id: 'p1', emoji: '👤' });
    const sin = sinUbicacion(datos);
    expect(sin.some((s) => s.id === 'p1')).toBe(false);
    expect(sin.some((s) => s.tipo === 'grupo' && s.id === 'g1')).toBe(true);
  });

  it('sigue la regla de las listas: las bajas solo salen al filtrarlas', () => {
    // p1 está en proceso (activo); p9 está Apartado y p10 Fallecido (bajas).
    const datos = {
      ...CASO_2026,
      personas: CASO_2026.personas.map((p) =>
        ['p1', 'p9', 'p10'].includes(p.id) ? { ...p, lat: 23.11, lng: -82.36 } : p,
      ),
      grupos: CASO_2026.grupos.map((g) => ({ ...g, lat: 23.12, lng: -82.37 })),
    };
    const ids = (ver: 'activos' | 'bajas' | 'todos') =>
      puntosDelMapa(datos, ver).filter((x) => x.tipo === 'persona').map((x) => x.id);
    expect(ids('activos')).toEqual(['p1']);
    expect(ids('bajas')).toEqual(['p9', 'p10']);
    expect(ids('todos')).toEqual(['p1', 'p9', 'p10']);
    // Sin filtro expreso se mantiene el comportamiento histórico (todos),
    // y los grupos —sin estado en el modelo— se ven en cualquier vista.
    expect(puntosDelMapa(datos).some((x) => x.tipo === 'grupo' && x.id === 'g1')).toBe(true);
    expect(puntosDelMapa(datos, 'bajas').some((x) => x.tipo === 'grupo' && x.id === 'g1')).toBe(true);
  });

  it('la lista «sin ubicación» aplica el mismo filtro que las chinchetas', () => {
    // Nadie tiene chincheta en el CASO: p9 (Apartado) no debe ofrecerse
    // para fijar en la vista de activos, y sí en la de bajas.
    expect(sinUbicacion(CASO_2026, 'activos').some((s) => s.id === 'p9')).toBe(false);
    expect(sinUbicacion(CASO_2026, 'activos').some((s) => s.id === 'p1')).toBe(true);
    expect(sinUbicacion(CASO_2026, 'bajas').some((s) => s.id === 'p9')).toBe(true);
    expect(sinUbicacion(CASO_2026, 'bajas').some((s) => s.id === 'p1')).toBe(false);
    expect(sinUbicacion(CASO_2026, 'todos').some((s) => s.id === 'p9')).toBe(true);
  });
});
