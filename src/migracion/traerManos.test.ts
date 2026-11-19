import { describe, expect, it } from 'vitest';
import { convertirManos, vistaPreviaManos } from './traerManos';
import type { RespaldoViejo } from './convertir';

const respaldo: RespaldoViejo = {
  campanas: [
    {
      id: 'c1', nombre: 'Sopa con Jesús', fechainicio: '2026-01-05', fechafin: '2026-12-29',
      zona: 'PÓSITO NORTE', tipo: 'Alimentaria', metaFamilias: 40, metaTipo: 'Personas',
      responsable: 'Luis E', estado: 'En curso', descripcion: 'Alimento ligero cada martes',
    },
    { id: 'c2', nombre: 'Vistiendo al Desnudo', estado: 'Planificada' },
  ],
  entregas: [
    { id: 'e1', campanaId: 'c1', beneficiarioId: '', beneficiarioNombre: 'Iglesia 120 y 51', fecha: '2026-01-04', tipo: 'almuerzo', cantidad: 20, unidad: 'personas' },
    { id: 'e2', campanaId: 'fantasma', fecha: '2026-01-04', cantidad: 5 },
  ],
};

describe('convertirManos', () => {
  it('trae campañas (fechas en minúsculas incluidas) y entregas; la huérfana queda fuera', () => {
    const { campanas, entregas, huerfanas } = convertirManos(respaldo);
    expect(campanas).toHaveLength(2);
    expect(campanas[0].fechaInicio).toBe('2026-01-05');
    expect(campanas[0].fechaFin).toBe('2026-12-29');
    expect(campanas[0].metaFamilias).toBe(40);
    expect(entregas).toHaveLength(1);
    expect(entregas[0].beneficiarioNombre).toBe('Iglesia 120 y 51');
    expect(huerfanas).toBe(1);
    expect(vistaPreviaManos(respaldo)).toEqual({ campanas: 2, entregas: 1, huerfanas: 1 });
  });
});
