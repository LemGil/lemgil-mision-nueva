import { describe, expect, it } from 'vitest';
import { vistaPreviaCompletarBeneficiarios } from './completarBeneficiarios';
import type { Beneficiario } from '../modelo/tipos';
import type { RespaldoViejo } from './convertir';

const actuales: Beneficiario[] = [
  { id: 'b1', personaId: null, estado: 'Activo' },
  { id: 'b2', personaId: 'p1', estado: 'Activo', tipo: 'Persona' },
];

const respaldo: RespaldoViejo = {
  beneficiarios: [
    {
      id: 'b1', tipo: 'Familia', nombre: 'Familia', apellido: 'Pérez',
      representativeName: 'María Pérez', familia: 5, telefono: '555',
      zona: 'PÓSITO', estado: 'Activo', personaId: '',
    },
    { id: 'b2', tipo: 'Persona', zona: 'NORTE', personaId: 'p1' },
  ],
};

describe('vistaPreviaCompletarBeneficiarios', () => {
  it('cuenta solo los huecos que el respaldo puede rellenar', () => {
    const r = vistaPreviaCompletarBeneficiarios(actuales, respaldo);
    expect(r.beneficiarios).toBe(2);
    expect(r.campos.tipo).toBe(1); // b2 ya tenía tipo
    expect(r.campos.nombre).toBe(1); // «Familia Pérez»
    expect(r.campos.familia).toBe(1);
    expect(r.campos.zona).toBe(2);
  });
});
