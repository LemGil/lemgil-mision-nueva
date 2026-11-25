import { describe, expect, it } from 'vitest';
import type { DatosMinisterio } from '../modelo/tipos';
import { resumenMinisterios } from './ministerios';

const base: DatosMinisterio = {
  personas: [
    { id: 'p1', nombre: 'Ana', apellidos: 'Paz' },
    { id: 'p2', nombre: 'Beto', apellidos: 'Río' },
    { id: 'p3', nombre: 'Cora', apellidos: 'Sol' },
  ],
  conversiones: [],
  miembros: [],
  estudiantes: [],
  diezmadores: [],
  aportes: [],
  beneficiarios: [],
  hitos: [],
  asignaciones: [
    { id: 'a1', personaId: 'p2', ministerio: 'ENSEÑANZA' },
    { id: 'a2', personaId: 'p1', ministerio: 'ENSEÑANZA' },
    { id: 'a3', personaId: 'p3', ministerio: 'MANOS ABIERTAS' },
  ],
  grupos: [],
  evangelismos: [],
  colaboradores: [],
  aportesRed: [],
  campanas: [],
  entregas: [],
  reuniones: [],
  pasos: [],
};

describe('resumenMinisterios', () => {
  it('agrupa por ministerio con su gente ordenada por nombre', () => {
    const r = resumenMinisterios(base);
    expect(r.map((m) => m.nombre)).toEqual(['ENSEÑANZA', 'MANOS ABIERTAS']);
    expect(r[0].miembros.map((m) => m.nombre)).toEqual(['Ana Paz', 'Beto Río']);
    expect(r[1].miembros).toHaveLength(1);
  });

  it('marca a quien está al frente del ministerio', () => {
    const conFrente = {
      ...base,
      asignaciones: base.asignaciones.map((a, i) =>
        i === 0 ? { ...a, responsable: true } : a,
      ),
    };
    const r = resumenMinisterios(conFrente);
    const conResponsable = r.find((m) => m.responsable);
    expect(conResponsable).toBeDefined();
    expect(conResponsable!.miembros.some((m) => m.responsable)).toBe(true);
  });

  it('sin asignaciones, no hay ministerios', () => {
    expect(resumenMinisterios({ ...base, asignaciones: [] })).toEqual([]);
  });
});
