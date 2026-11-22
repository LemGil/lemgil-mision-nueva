import { describe, expect, it } from 'vitest';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import type { DatosMinisterio, Paso } from '../modelo/tipos';
import {
  listaConPasoNuevo,
  moverEnLista,
  nombreRepetido,
  pasosDelAmbito,
  puedeBorrarPaso,
  usoDelPaso,
} from './pasosEditar';

const pasos = CATALOGO_SEMILLA.map((p) => ({ ...p }));

const datosVacios = (conversiones: DatosMinisterio['conversiones'], hitos: DatosMinisterio['hitos']): DatosMinisterio =>
  ({
    personas: [],
    conversiones,
    miembros: [],
    estudiantes: [],
    diezmadores: [],
    beneficiarios: [],
    hitos,
    asignaciones: [],
    pasos,
    grupos: [],
    evangelismos: [],
    aportes: [],
    colaboradores: [],
    aportesRed: [],
    campanas: [],
    entregas: [],
  }) as DatosMinisterio;

describe('moverEnLista', () => {
  it('intercambia dos pasos del camino en Misión', () => {
    const r = moverEnLista(pasos, 'mision', 'ps-confeso', 1)!;
    const nombres = pasosDelAmbito(r, 'mision').map((p) => p.nombre);
    expect(nombres.slice(0, 4)).toEqual(['Alcanzado', 'Converso', 'Confeso', 'Discipulado']);
  });

  it('el inicio no se mueve ni deja pasar al camino', () => {
    expect(moverEnLista(pasos, 'mision', 'ps-congregado', 1)).toBeNull();
    expect(moverEnLista(pasos, 'mision', 'ps-confeso', -1)).toBeNull();
  });

  it('el gozne no se mueve y el último del camino no lo cruza', () => {
    expect(moverEnLista(pasos, 'mision', 'ps-integrado', -1)).toBeNull();
    expect(moverEnLista(pasos, 'mision', 'ps-bautizado', 1)).toBeNull();
  });

  it('en Miembros se mueve cualquier peldaño', () => {
    const r = moverEnLista(pasos, 'miembros', 'pm-diezmo', 1)!;
    const nombres = pasosDelAmbito(r, 'miembros').map((p) => p.nombre);
    expect(nombres.slice(0, 3)).toEqual(['Grupo', 'Academia', 'Diezmador']);
  });
});

describe('puedeBorrarPaso', () => {
  it('un paso protegido no se borra', () => {
    const d = datosVacios([], []);
    const r = puedeBorrarPaso(d, pasos.find((p) => p.id === 'ps-integrado')!);
    expect(r.ok).toBe(false);
  });

  it('un peldaño de fuente viva no se borra', () => {
    const d = datosVacios([], []);
    const r = puedeBorrarPaso(d, pasos.find((p) => p.id === 'pm-diezmo')!);
    expect(r.ok).toBe(false);
  });

  it('un paso del camino con registros encima no se borra', () => {
    const conv = {
      id: 'c1', personaId: 'p1', estado: 'ps-confeso', fecha: '2024-01-01',
      historial: [{ fecha: '2024-01-01', estado: 'ps-congregado' }, { fecha: '2024-02-01', estado: 'ps-confeso' }],
    } as DatosMinisterio['conversiones'][number];
    const d = datosVacios([conv], []);
    expect(usoDelPaso(d, pasos.find((p) => p.id === 'ps-confeso')!)).toBe(1);
    expect(puedeBorrarPaso(d, pasos.find((p) => p.id === 'ps-confeso')!).ok).toBe(false);
  });

  it('un paso libre sí se borra', () => {
    const d = datosVacios([], []);
    expect(puedeBorrarPaso(d, pasos.find((p) => p.id === 'ps-confeso')!).ok).toBe(true);
    const liderazgo = pasos.find((p) => p.id === 'pm-liderazgo')!;
    expect(puedeBorrarPaso(d, liderazgo).ok).toBe(true);
  });
});

describe('listaConPasoNuevo y nombreRepetido', () => {
  it('en Misión el paso nuevo entra antes del gozne y la lista queda renumerada', () => {
    const nuevo: Paso = { id: 'px-1', ambito: 'mision', nombre: 'Ayuno', emoji: '🕯️', orden: 0, rol: 'camino' };
    const r = listaConPasoNuevo(pasos, nuevo);
    const nombres = pasosDelAmbito(r, 'mision').map((p) => p.nombre);
    expect(nombres).toEqual(['Alcanzado', 'Confeso', 'Converso', 'Discipulado', 'Bautizado', 'Ayuno', 'Añadidos', 'Apartado', 'Traslado', 'Fallecido']);
    expect(pasosDelAmbito(r, 'mision').map((p) => p.orden)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('en Miembros entra al final', () => {
    const nuevo: Paso = { id: 'px-2', ambito: 'miembros', nombre: 'Servicio', emoji: '🧹', orden: 0, fuente: 'manual' };
    const r = listaConPasoNuevo(pasos, nuevo);
    const nombres = pasosDelAmbito(r, 'miembros').map((p) => p.nombre);
    expect(nombres[nombres.length - 1]).toBe('Servicio');
  });

  it('detecta nombres repetidos en el ámbito', () => {
    expect(nombreRepetido(pasos, 'mision', 'confeso')).toBe(true);
    expect(nombreRepetido(pasos, 'mision', 'Confeso', 'ps-confeso')).toBe(false);
    expect(nombreRepetido(pasos, 'miembros', 'Confeso')).toBe(false);
  });
});
