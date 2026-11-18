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
});
