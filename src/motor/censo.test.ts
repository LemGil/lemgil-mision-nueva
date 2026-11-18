import { describe, expect, it } from 'vitest';
import { PS_DISCIPULADO } from '../modelo/catalogo';
import { calcularCenso, clasificarPersona } from './censo';
import { conteoMision } from './mision';
import { CASO_2026, HOY, NOVIEMBRE_2026 } from './casos';

describe('censo — el caso real de 2026', () => {
  const censo = calcularCenso(CASO_2026, { hoy: HOY });

  it('cada persona cuenta una vez, en su etapa más avanzada', () => {
    const porNombre = Object.fromEntries(censo.etapas.map((e) => [e.nombre, e.cantidad]));
    expect(porNombre).toEqual({
      Alcanzado: 1,
      Confeso: 1,
      Converso: 1,
      Discipulado: 2, // p3 (la duplicada, por su registro más avanzado) + p5
      Bautizado: 1, // p6, la del traslado
    });
    expect(censo.enProceso).toBe(6);
  });

  it('el total = en proceso + miembros activos (el gozne cuenta como miembro)', () => {
    expect(censo.miembros).toBe(3); // p7, p11, p12
    expect(censo.total).toBe(9);
  });

  it('el integrado con miembro Inactivo cae en Inactivos, fuera del total', () => {
    expect(censo.inactivos).toBe(1); // p8
    expect(clasificarPersona(CASO_2026, 'p8').clase).toBe('inactivo');
  });

  it('la duplicada se clasifica por su paso más avanzado', () => {
    expect(clasificarPersona(CASO_2026, 'p3')).toEqual({
      clase: 'etapa',
      pasoId: PS_DISCIPULADO,
    });
  });

  it('bajas y demografía', () => {
    expect(censo.bajas).toEqual({ apartados: 1, traslados: 0, fallecidos: 1, otrasSalidas: 0 });
    expect(censo.demografico).toEqual({
      hombres: 4, mujeres: 5, sinDatoSexo: 0,
      ninos: 2, jovenes: 1, adultos: 3, ancianos: 2, sinEdad: 1,
    });
  });

  it('diezmadores es transversal: solo los de la congregación', () => {
    expect(censo.diezmadores).toBe(2); // p5 y p12; p9 es apartado, fuera
  });

  it('el período lee el historial: confesiones, conversiones y bajas', () => {
    const conPeriodo = calcularCenso(CASO_2026, { hoy: HOY, periodo: NOVIEMBRE_2026 });
    expect(conPeriodo.periodo).toEqual({ confesiones: 2, conversiones: 1, bajas: 1 });
  });
});

describe('la mesa de Misión cuenta registros', () => {
  const conteo = conteoMision(CASO_2026);

  it('En proceso = registros en la ruta, no personas', () => {
    expect(conteo.enProceso).toBe(9); // p3 aporta 2 registros
    expect(conteo.totalRegistros).toBe(10);
  });

  it('las tarjetas por paso son la foto de los registros', () => {
    const foto = Object.fromEntries(conteo.pasos.map((t) => [t.nombre, t.foto]));
    expect(foto).toEqual({
      Alcanzado: 1, Confeso: 2, Converso: 1, Discipulado: 2, Bautizado: 1, Integrado: 2,
    });
    const salidas = Object.fromEntries(conteo.salidas.map((t) => [t.nombre, t.foto]));
    expect(salidas).toEqual({ Apartado: 1, Traslado: 0, Fallecido: 0 });
  });

  it('con período, las tarjetas cuentan entradas y En proceso las entradas a la ruta', () => {
    const conPeriodo = conteoMision(CASO_2026, NOVIEMBRE_2026);
    const per = Object.fromEntries(conPeriodo.pasos.map((t) => [t.nombre, t.periodo]));
    expect(per.Confeso).toBe(2);
    expect(per.Converso).toBe(1);
    expect(conPeriodo.enProcesoPeriodo).toBe(1); // solo c1 entró a la ruta en noviembre
  });
});
