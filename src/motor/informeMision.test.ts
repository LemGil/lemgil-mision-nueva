import { describe, expect, it } from 'vitest';
import type { Conversion, DatosMinisterio, Persona } from '../modelo/tipos';
import {
  PS_ALCAZADO, PS_APARTADO, PS_BAUTIZADO, PS_CONFESO, PS_CONVERSO,
  PS_DISCIPULADO, PS_FALLECIDO, PS_INTEGRADO,
} from '../modelo/catalogo';
import { CASO_2026 } from './casos';
import { corteBautizados, informeMision, origenBautismo } from './informeMision';

const P2024 = { desde: '2024-01-01', hasta: '2024-12-31' };
const HOY = '2025-01-15';

const persona = (id: string, nombre: string): Persona => ({ id, nombre });
const conv = (
  id: string,
  personaId: string,
  fecha: string,
  estado: string,
  historial: [string, string][],
): Conversion => ({
  id,
  personaId,
  fecha,
  estado,
  historial: historial.map(([f, e]) => ({ fecha: f, estado: e })),
});

function datosFixture(): DatosMinisterio {
  return {
    ...CASO_2026,
    personas: [
      persona('p1', 'Ana Plena'),
      persona('p2', 'Tomás Traslado'),
      persona('p3', 'Pablo Apartado'),
      persona('p4', 'Diana Duplicada'),
      persona('p5', 'Óscar Antiguo'),
      persona('p6', 'Irene Fallecida'),
    ],
    conversiones: [
      // p1: la ruta completa en 2024, bautizada en la casa.
      conv('c1', 'p1', '2024-01-10', PS_INTEGRADO, [
        ['2024-01-10', PS_ALCAZADO], ['2024-01-20', PS_CONFESO], ['2024-02-01', PS_CONVERSO],
        ['2024-02-10', PS_DISCIPULADO], ['2024-03-01', PS_BAUTIZADO], ['2024-04-01', PS_INTEGRADO],
      ]),
      // p2: traslado — entró por Bautizado y se integró; vino ya bautizado.
      conv('c2', 'p2', '2024-05-01', PS_INTEGRADO, [
        ['2024-05-01', PS_BAUTIZADO], ['2024-06-01', PS_INTEGRADO],
      ]),
      // p3: alcanzado en 2024 y apartado desde Confeso.
      conv('c3', 'p3', '2024-03-05', PS_APARTADO, [
        ['2024-03-05', PS_ALCAZADO], ['2024-03-20', PS_CONFESO], ['2024-09-01', PS_APARTADO],
      ]),
      // p4: DOS registros de proceso, una sola persona.
      conv('c4', 'p4', '2024-01-15', PS_ALCAZADO, [['2024-01-15', PS_ALCAZADO]]),
      conv('c5', 'p4', '2024-01-15', PS_CONFESO, [
        ['2024-01-15', PS_ALCAZADO], ['2024-02-01', PS_CONFESO],
      ]),
      // p5: de 2023 — fuera del período.
      conv('c6', 'p5', '2023-06-01', PS_CONVERSO, [
        ['2023-06-01', PS_ALCAZADO], ['2023-06-15', PS_CONFESO], ['2023-07-01', PS_CONVERSO],
      ]),
      // p6: alcanzada en 2024 y fallecida ese año.
      conv('c7', 'p6', '2024-04-01', PS_FALLECIDO, [
        ['2024-04-01', PS_ALCAZADO], ['2024-12-31', PS_FALLECIDO],
      ]),
    ],
  };
}

describe('informeMision — el formato de LemGil', () => {
  it('lo principal: cinco números en personas únicas', () => {
    const inf = informeMision(datosFixture(), P2024, HOY);
    expect(inf.principal).toEqual({
      alcanzados: 4, // p1, p3, p4 (¡una vez!), p6
      bautizados: 1, // solo p1: el traslado p2 vino ya bautizado (regla 2026-11-22)
      integrados: 2, // p1 y p2
      bajas: 2, // p3 apartado + p6 fallecida
      enProceso: 3, // p1, p2 y p4 siguen en la ruta
    });
    expect(inf.frase).toBe(
      'Se terminó con: 4 Alcanzados · 1 Bautizados · 2 Añadidos · 2 Bajas · 3 En Proceso',
    );
  });

  it('la marca del integrado: bautizado con nosotros o vino ya bautizado', () => {
    const inf = informeMision(datosFixture(), P2024, HOY);
    const porNombre = new Map(inf.integrados.map((i) => [i.nombre, i]));
    expect(porNombre.get('Ana Plena')?.bautizadoConNosotros).toBe(true);
    expect(porNombre.get('Tomás Traslado')?.bautizadoConNosotros).toBe(false);
  });

  it('las bajas se desglosan por salida y dicen de qué paso venía cada uno', () => {
    const inf = informeMision(datosFixture(), P2024, HOY);
    expect(inf.bajasDesglose).toEqual([
      { salida: 'Apartado', cantidad: 1 },
      { salida: 'Fallecido', cantidad: 1 },
    ]);
    const pablo = inf.bajas.find((b) => b.nombre === 'Pablo Apartado');
    expect(pablo?.salida).toBe('Apartado');
    expect(pablo?.pasoPrevio).toBe('Confeso');
  });

  it('en proceso: el duplicado aparece una vez y en su paso más avanzado', () => {
    const inf = informeMision(datosFixture(), P2024, HOY);
    const diana = inf.enProceso.filter((e) => e.nombre === 'Diana Duplicada');
    expect(diana).toHaveLength(1);
    expect(diana[0].pasoActual).toBe('Confeso');
    // Los que salieron no están en proceso.
    expect(inf.enProceso.map((e) => e.nombre)).not.toContain('Pablo Apartado');
    expect(inf.enProceso.map((e) => e.nombre)).not.toContain('Irene Fallecida');
  });

  it('los bautizados del informe son solo los de la casa', () => {
    const inf = informeMision(datosFixture(), P2024, HOY);
    expect(inf.bautizados.map((b) => b.nombre)).toEqual(['Ana Plena']);
  });

  it('el origen del bautismo y el corte transversal', () => {
    const d = datosFixture();
    expect(origenBautismo(d, 'p1')).toBe('casa');
    expect(origenBautismo(d, 'p2')).toBe('fuera');
    expect(origenBautismo(d, 'p3')).toBeNull();
    expect(corteBautizados(d)).toEqual({ casa: 1, fuera: 1, total: 2 });
    const inf = informeMision(d, P2024, HOY);
    const tomas = inf.enProceso.find((e) => e.nombre === 'Tomás Traslado');
    expect(tomas?.vinoBautizado).toBe(true);
    const diana = inf.enProceso.find((e) => e.nombre === 'Diana Duplicada');
    expect(diana?.vinoBautizado).toBe(false);
  });

  it('sin período cuenta todo el tiempo', () => {
    const inf = informeMision(datosFixture(), undefined, HOY);
    expect(inf.principal.alcanzados).toBe(5); // entra también Óscar, de 2023
    expect(inf.principal.enProceso).toBe(4);
  });
});
