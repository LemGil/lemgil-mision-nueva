import { describe, expect, it } from 'vitest';
import { PM_DIEZMO, PM_GRUPO } from '../modelo/catalogo';
import { escaleraDeMiembro, estaEnElPaso, tarjetasDeMiembros } from './miembros';
import { CASO_2026 } from './casos';

const miembro = (id: string) => CASO_2026.miembros.find((m) => m.id === id)!;

describe('la escalera de Miembros (Grupo → Diezmador → Academia → Ministerio → Hermano Mayor → Liderazgo)', () => {
  it('cada paso se cumple desde su fuente viva', () => {
    const esc = escaleraDeMiembro(CASO_2026, miembro('m7'));
    const porNombre = Object.fromEntries(esc.estados.map((e) => [e.paso.nombre, e.cumplido]));
    expect(porNombre).toEqual({
      Grupo: true, // tiene grupo
      Diezmador: false,
      Academia: true, // estudiante activa
      Ministerio: true, // sirve en Alabanza
      'Hermano Mayor': true, // ES la hermana mayor de p4
      Liderazgo: false,
    });
    expect(esc.actual?.id).toBe(PM_DIEZMO); // su primer paso sin cumplir
  });

  it('Diezmador se cumple por su registro activo en Bien Común', () => {
    const esc = escaleraDeMiembro(CASO_2026, miembro('m12'));
    expect(esc.estados.find((e) => e.paso.id === PM_DIEZMO)?.cumplido).toBe(true);
    expect(esc.actual?.id).toBe(PM_GRUPO);
  });

  it('Liderazgo se cumple por su hito en la ficha', () => {
    const esc = escaleraDeMiembro(CASO_2026, miembro('m11'));
    expect(esc.estados.find((e) => e.paso.nombre === 'Liderazgo')?.cumplido).toBe(true);
  });

  it('«Están en:» filtra por el paso CUMPLIDO', () => {
    expect(estaEnElPaso(CASO_2026, miembro('m7'), 'pm-academia')).toBe(true);
    expect(estaEnElPaso(CASO_2026, miembro('m7'), PM_DIEZMO)).toBe(false);
    expect(estaEnElPaso(CASO_2026, miembro('m7'), 'completa')).toBe(false);
  });
});

describe('las tarjetas de Miembros', () => {
  it('la foto completa: estados + atributos sobre los Activos', () => {
    expect(tarjetasDeMiembros(CASO_2026)).toEqual({
      activos: 3, inactivos: 1, trasladados: 0, fallecidos: 1, disciplinados: 0,
      enGrupo: 1, diezmadores: 1, enAcademia: 1, sirviendo: 1, hermanoMayor: 1, lideres: 1,
    });
  });

  it('con período, la foto es la cohorte que ingresó en ese año', () => {
    expect(tarjetasDeMiembros(CASO_2026, { ano: 2026 })).toEqual({
      activos: 2, inactivos: 0, trasladados: 0, fallecidos: 0, disciplinados: 0,
      enGrupo: 1, diezmadores: 1, enAcademia: 1, sirviendo: 1, hermanoMayor: 1, lideres: 0,
    });
  });
});
