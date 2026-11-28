import { describe, expect, it } from 'vitest';
import type { AporteRed, Colaborador, DatosMinisterio } from '../modelo/tipos';
import { CATALOGO_SEMILLA } from '../modelo/catalogo';
import type { RespaldoViejo } from './convertir';
import { restaurarRedDesdeRespaldo } from './restaurarRed';
import { RepoFalso } from './repoFalso';

const respaldo: RespaldoViejo = {
  colaboradores: [
    { id: 'i1', nombre: 'ISABEL', apellido: 'MIRANDA', estado: 'Activo', tipo: 'Persona' },
    { id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona' },
  ],
  aportes: [
    { id: 'a1', colaboradorId: 'i1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
    { id: 'a2', colaboradorId: 'i1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
    { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
  ],
};

const base = (colaboradores: Colaborador[], aportesRed: AporteRed[]): DatosMinisterio => ({
  personas: [], conversiones: [], miembros: [], estudiantes: [], diezmadores: [],
  beneficiarios: [], hitos: [], asignaciones: [], grupos: [], evangelismos: [],
  aportes: [], pasos: CATALOGO_SEMILLA, campanas: [], entregas: [], colaboradores, aportesRed,
  reuniones: [],
  academias: [], encuentros: [], ministerios: [],
});

describe('restaurarRedDesdeRespaldo', () => {
  it('devuelve los aportes movidos a su dueño y levanta la ficha caída', async () => {
    // Como quedó la casa: Isabel no está; sus aportes cuelgan de Gina.
    const datos = base(
      [{ id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona' }],
      [
        { id: 'a1', colaboradorId: 'g1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
        { id: 'a2', colaboradorId: 'g1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
        { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
        { id: 'm1', colaboradorId: 'g1', fecha: '2026-01-01', monto: 999, tipo: 'Ofrenda' },
      ],
    );
    const repo = new RepoFalso();
    for (const c of datos.colaboradores) repo.sembrar('colaboradores', { ...c, borrado: false });
    for (const a of datos.aportesRed) repo.sembrar('aportesRed', { ...a, borrado: false });

    const r = await restaurarRedDesdeRespaldo(repo.comoRepo(), datos, respaldo);
    expect(r.fallos).toEqual([]);
    expect(r).toMatchObject({ fichasRestauradas: 1, copiasVaciasSaltadas: 0, aportesReubicados: 2, aportesRestaurados: 0, verificacion: { siguenFuera: 0, fichasQueFaltan: 0 } });

    const colabs = repo.vivos<Colaborador>('colaboradores');
    expect(colabs.map((c) => c.id).sort()).toEqual(['g1', 'i1']);
    const aportes = repo.vivos<AporteRed>('aportesRed');
    expect(aportes.filter((a) => a.colaboradorId === 'i1').map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    // El aporte registrado a mano (m1) no se toca: sigue donde estaba.
    expect(aportes.find((a) => a.id === 'm1')?.colaboradorId).toBe('g1');
  });

  it('corrige el nombre de una ficha viva que quedó con el nombre de otra', async () => {
    const datos = base(
      [
        { id: 'i1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona', telefono: '555' },
        { id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona' },
      ],
      [
        { id: 'a1', colaboradorId: 'i1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
        { id: 'a2', colaboradorId: 'i1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
        { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
      ],
    );
    const repo = new RepoFalso();
    for (const c of datos.colaboradores) repo.sembrar('colaboradores', { ...c, borrado: false });
    for (const a of datos.aportesRed) repo.sembrar('aportesRed', { ...a, borrado: false });
    const r = await restaurarRedDesdeRespaldo(repo.comoRepo(), datos, respaldo);
    expect(r.fichasRestauradas).toBe(1);
    const isabel = repo.vivos<Colaborador>('colaboradores').find((c) => c.id === 'i1');
    expect(isabel?.nombre).toBe('ISABEL');
    expect(isabel?.apellido).toBe('MIRANDA');
    expect(isabel?.telefono).toBe('555'); // sus demás datos se conservan
  });

  it('no resucita una copia vacía que la unión ya había fundido', async () => {
    // El respaldo trae una segunda ficha del mismo nombre, sin aportes:
    // es la copia que «Unir repetidos» fundió. Debe quedarse fuera.
    const respaldoConCopia: RespaldoViejo = {
      ...respaldo,
      colaboradores: [
        ...(respaldo.colaboradores as unknown as Record<string, unknown>[]),
        { id: 'g2', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Iglesia' },
      ],
    };
    const datos = base(
      [
        { id: 'i1', nombre: 'ISABEL', apellido: 'MIRANDA', estado: 'Activo', tipo: 'Persona' },
        { id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona' },
      ],
      [
        { id: 'a1', colaboradorId: 'i1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
        { id: 'a2', colaboradorId: 'i1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
        { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
      ],
    );
    const repo = new RepoFalso();
    const r = await restaurarRedDesdeRespaldo(repo.comoRepo(), datos, respaldoConCopia);
    expect(r.copiasVaciasSaltadas).toBe(1);
    expect(r.fichasRestauradas).toBe(0);
    expect(repo.vivos<Colaborador>('colaboradores').map((c) => c.id)).not.toContain('g2');
  });

  it('un registro que falla no detiene la reparación: se nombra y el resto sigue', async () => {
    const datos = base(
      [{ id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona' }],
      [
        { id: 'a1', colaboradorId: 'g1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
        { id: 'a2', colaboradorId: 'g1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
        { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
      ],
    );
    const repo = new RepoFalso();
    for (const c of datos.colaboradores) repo.sembrar('colaboradores', { ...c, borrado: false });
    for (const a of datos.aportesRed) repo.sembrar('aportesRed', { ...a, borrado: false });
    const real = repo.comoRepo();
    const queFalla = {
      ...real,
      guardar: async (tabla: never, entidad: { id: string }) => {
        if (entidad.id === 'a2') throw new Error('error exacto de prueba');
        return real.guardar(tabla, entidad);
      },
      listar: real.listar.bind(real),
    } as unknown as typeof real;
    const r = await restaurarRedDesdeRespaldo(queFalla, datos, respaldo);
    expect(r.fallos).toEqual([{ tabla: 'aportesRed', id: 'a2', mensaje: 'error exacto de prueba' }]);
    expect(r.aportesReubicados).toBe(1); // a1 sí se movió; a2 quedó nombrado
    expect(r.verificacion.siguenFuera).toBe(1);
    const aportes = repo.vivos<AporteRed>('aportesRed');
    expect(aportes.find((a) => a.id === 'a1')?.colaboradorId).toBe('i1');
    expect(aportes.find((a) => a.id === 'a2')?.colaboradorId).toBe('g1');
  });

  it('con todo en su sitio no toca nada', async () => {
    const datos = base(
      [
        { id: 'i1', nombre: 'ISABEL', apellido: 'MIRANDA', estado: 'Activo', tipo: 'Persona' },
        { id: 'g1', nombre: 'GINA', apellido: 'HERRERA', estado: 'Activo', tipo: 'Persona' },
      ],
      [
        { id: 'a1', colaboradorId: 'i1', fecha: '2025-01-01', monto: 100, tipo: 'Ofrenda General' },
        { id: 'a2', colaboradorId: 'i1', fecha: '2025-02-01', monto: 200, tipo: 'Ofrenda General' },
        { id: 'a3', colaboradorId: 'g1', fecha: '2025-03-01', monto: 50, tipo: 'Diezmo' },
      ],
    );
    const repo = new RepoFalso();
    for (const c of datos.colaboradores) repo.sembrar('colaboradores', { ...c, borrado: false });
    for (const a of datos.aportesRed) repo.sembrar('aportesRed', { ...a, borrado: false });
    const r = await restaurarRedDesdeRespaldo(repo.comoRepo(), datos, respaldo);
    expect(r.fallos).toEqual([]);
    expect(r).toMatchObject({ fichasRestauradas: 0, copiasVaciasSaltadas: 0, aportesReubicados: 0, aportesRestaurados: 0, verificacion: { siguenFuera: 0, fichasQueFaltan: 0 } });
  });
});
