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
  academias: [], encuentros: [], ministerios: [],
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

  it('un ministerio del catálogo se ve aunque no tenga gente, con su ficha', () => {
    const conCatalogo: DatosMinisterio = {
      ...base,
      asignaciones: [],
      ministerios: [
        { id: 'm1', nombre: 'Intercesión', inicio: '2025-03-02', mision: 'Orar por la casa', responsableId: 'p1' },
      ],
    };
    const r = resumenMinisterios(conCatalogo);
    expect(r).toHaveLength(1);
    expect(r[0].ministerioId).toBe('m1');
    expect(r[0].inicio).toBe('2025-03-02');
    expect(r[0].mision).toBe('Orar por la casa');
    expect(r[0].responsable).toBe('Ana Paz');
    expect(r[0].miembros).toEqual([]);
  });

  it('el responsable de la ficha manda sobre la marca vieja de la asignación', () => {
    const conAmbos: DatosMinisterio = {
      ...base,
      asignaciones: base.asignaciones.map((a, i) =>
        i === 0 ? { ...a, responsable: true } : a,
      ),
      ministerios: [{ id: 'm1', nombre: 'ENSEÑANZA', responsableId: 'p1' }],
    };
    const r = resumenMinisterios(conAmbos);
    const ensenanza = r.find((m) => m.nombre === 'ENSEÑANZA')!;
    // La marca vieja señalaba a Beto (p2); la ficha manda: Ana (p1).
    expect(ensenanza.responsable).toBe('Ana Paz');
    expect(ensenanza.miembros.find((m) => m.personaId === 'p1')?.responsable).toBe(true);
    expect(ensenanza.miembros.find((m) => m.personaId === 'p2')?.responsable).toBe(false);
  });
});
