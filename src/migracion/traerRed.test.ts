import { describe, expect, it } from 'vitest';
import { convertirRed, vistaPreviaRed } from './traerRed';
import type { RespaldoViejo } from './convertir';

const respaldo: RespaldoViejo = {
  colaboradores: [
    {
      id: 'c1', nombre: 'CORBAN', apellido: 'MINISTERIO', telefono: '18327050355',
      email: 'x@y.z', estado: 'Activo', tipo: 'Iglesia', planOfrendaTipo: '',
      planOfrendaMonto: 0, notas: 'Ayuda Mensual',
    },
    { id: 'c2', nombre: 'Ana', estado: 'Inactivo', tipo: 'Persona' },
  ],
  aportes: [
    { id: 'a1', colaboradorId: 'c1', fecha: '2025-08-10', monto: 210, tipo: 'Diezmo', metodo: 'Efectivo', referencia: '', notas: '' },
    { id: 'a2', colaboradorId: 'c2', fecha: '2026-01-20', monto: 50, tipo: 'Ofrenda' },
    { id: 'a3', colaboradorId: 'fantasma', fecha: '2026-02-01', monto: 999, tipo: 'Ofrenda' },
  ],
};

describe('convertirRed', () => {
  it('trae colaboradores y aportes con sus campos; el huérfano queda fuera y contado', () => {
    const { colaboradores, aportesRed, huerfanos } = convertirRed(respaldo);
    expect(colaboradores).toHaveLength(2);
    expect(colaboradores[0].nombre).toBe('CORBAN');
    expect(colaboradores[0].tipo).toBe('Iglesia');
    expect(aportesRed).toHaveLength(2);
    expect(huerfanos).toBe(1);
    const previa = vistaPreviaRed(respaldo);
    expect(previa.total).toBe(260);
  });
});
