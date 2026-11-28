import { describe, expect, it } from 'vitest';
import { CATALOGO_SEMILLA, PS_ALCAZADO, PS_CONFESO, PS_CONVERSO } from '../modelo/catalogo';
import type { DatosMinisterio } from '../modelo/tipos';
import { cumpleanosProximos, estancados } from './alertas';
import { CASO_2026, HOY } from './casos';

const base: DatosMinisterio = {
  pasos: CATALOGO_SEMILLA,
  personas: [
    { id: 'a', nombre: 'Atascado', fechaNacimiento: '1990-11-20' },
    { id: 'b', nombre: 'Reciente', fechaNacimiento: '1990-12-25' },
    { id: 'c', nombre: 'Caminando', fechaNacimiento: '1990-11-17' },
  ],
  conversiones: [
    { id: 'ca', personaId: 'a', estado: PS_ALCAZADO, fecha: '2026-09-01', historial: [{ fecha: '2026-09-01', estado: PS_ALCAZADO }] },
    { id: 'cb', personaId: 'b', estado: PS_CONFESO, fecha: '2026-11-10', historial: [{ fecha: '2026-11-10', estado: PS_CONFESO }] },
    { id: 'cc', personaId: 'c', estado: PS_CONVERSO, fecha: '2026-01-01', historial: [] },
  ],
  miembros: [],
  estudiantes: [],
  diezmadores: [],
  beneficiarios: [],
  hitos: [],
  asignaciones: [],
  grupos: [],
  evangelismos: [],
  colaboradores: [],
  aportesRed: [],
  campanas: [],
  entregas: [],
  reuniones: [],
  academias: [], encuentros: [], ministerios: [],
  aportes: [],
};

describe('alertas', () => {
  it('estancados vigila Alcanzado y Confeso, con nombre, paso y días', () => {
    const lista = estancados(base, HOY);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nombre: 'Atascado', pasoNombre: 'Alcanzado' });
    expect(lista[0].dias).toBe(77);
    // 'Reciente' lleva 7 días en Confeso: aún no. 'Caminando' está en Converso: no se vigila.
  });

  it('en el caso de 2026 nadie lleva 30 días en Alcanzado o Confeso', () => {
    expect(estancados(CASO_2026, HOY)).toEqual([]);
  });

  it('cumpleaños próximos dentro de 30 días, con el de hoy primero', () => {
    const cumples = cumpleanosProximos(base, HOY);
    expect(cumples.map((c) => c.nombre)).toEqual(['Caminando', 'Atascado']);
    expect(cumples[0].dias).toBe(0);
    expect(cumples[0].edadQueCumple).toBe(36);
    expect(cumples[1].dias).toBe(3);
  });
});
