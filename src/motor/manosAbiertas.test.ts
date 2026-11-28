import { describe, expect, it } from 'vitest';
import type { DatosMinisterio } from '../modelo/tipos';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import { nombreDeEntrega, resumenManos } from './manosAbiertas';

const datos: DatosMinisterio = {
  personas: [], conversiones: [], miembros: [], estudiantes: [], diezmadores: [],
  beneficiarios: [], hitos: [], asignaciones: [], grupos: [], evangelismos: [],
  aportes: [], colaboradores: [], aportesRed: [], pasos: CATALOGO_SEMILLA,
  campanas: [
    { id: 'c1', nombre: 'Sopa con Jesús', estado: 'En curso' },
    { id: 'c2', nombre: 'Vistiendo al Desnudo', estado: 'Planificada' },
  ],
  entregas: [
    { id: 'e1', campanaId: 'c1', fecha: '2026-01-04', cantidad: 20, beneficiarioNombre: 'Iglesia 120 y 51' },
    { id: 'e2', campanaId: 'c1', fecha: '2026-02-01', cantidad: 30 },
  ],
  reuniones: [],
  academias: [], encuentros: [], ministerios: [],
};

describe('resumenManos', () => {
  it('cuenta campañas en curso y resume las entregas por campaña', () => {
    const r = resumenManos(datos);
    expect(r.campanasEnCurso).toBe(1);
    expect(r.campanasTotal).toBe(2);
    expect(r.entregasTotal).toBe(2);
    expect(r.porCampana.get('c1')).toEqual({
      campanaId: 'c1',
      entregas: 2,
      totalCantidad: 50,
      ultimaFecha: '2026-02-01',
    });
  });

  it('el nombre de la entrega prefiere el escrito a mano', () => {
    expect(nombreDeEntrega(datos.entregas[0], () => 'Otro')).toBe('Iglesia 120 y 51');
    expect(nombreDeEntrega(datos.entregas[1], () => 'Otro')).toBe('Sin nombre');
  });
});
