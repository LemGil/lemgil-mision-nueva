import { describe, expect, it } from 'vitest';
import type { Aporte, Campana, DatosMinisterio, Entrega, Reunion } from '../modelo/tipos';
import { RepoFalso } from '../migracion/repoFalso';
import { actualizarReunion, borrarReunion, registrarReunion } from './acciones';
import { avisoCuadreParte, partesDeGrupo, resumenReuniones } from '../motor/reuniones';
import { resumenBienComun } from '../motor/bienComun';

const GRUPO = { id: 'g1', nombre: 'IGLESIA 120 Y 51', tipo: 'Iglesia' };

function datosDesde(repo: RepoFalso): DatosMinisterio {
  return {
    personas: [],
    conversiones: [],
    miembros: [],
    estudiantes: [],
    diezmadores: [],
    beneficiarios: [],
    hitos: [],
    asignaciones: [],
    grupos: [GRUPO],
    evangelismos: [],
    aportes: repo.vivos<Aporte>('aportes'),
    colaboradores: [],
    aportesRed: [],
    campanas: repo.vivos<Campana>('campanas'),
    entregas: repo.vivos<Entrega>('entregas'),
    reuniones: repo.vivos<Reunion>('reuniones'),
    pasos: [],
  } as DatosMinisterio;
}

const PARTE = {
  grupoId: 'g1',
  fecha: '2026-11-22',
  personas: 30,
  mujeres: 14,
  hombres: 10,
  ninos: 6,
  visitas: 4,
  nuevosCongregados: 2,
  profesiones: 1,
  almuerzos: 20,
  sopas: 0,
};

describe('el parte de reunión y sus vínculos', () => {
  it('al registrar: la ofrenda va a Bien Común como aporte del grupo y los almuerzos a Manos Abiertas', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), PARTE, 5000);
    const d = datosDesde(repo);
    expect(d.reuniones).toHaveLength(1);
    const aporte = d.aportes.find((a) => a.reunionId === reunion.id);
    expect(aporte).toMatchObject({ grupoId: 'g1', monto: 5000, tipo: 'Ofrenda', fecha: '2026-11-22' });
    const entrega = d.entregas.find((e) => e.reunionId === reunion.id);
    expect(entrega).toMatchObject({ tipo: 'Almuerzo', cantidad: 20, beneficiarioNombre: 'IGLESIA 120 Y 51' });
    expect(d.campanas.map((c) => c.nombre)).toEqual(['Almuerzo con Jesús']);
    expect(d.entregas.filter((e) => e.tipo === 'Sopa')).toHaveLength(0);
  });

  it('al corregir: quitar la ofrenda y los almuerzos los borra, y las sopas crean su entrega y su campaña', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), PARTE, 5000);
    await actualizarReunion(r, datosDesde(repo), { ...reunion, almuerzos: 0, sopas: 12 }, 0);
    const d = datosDesde(repo);
    expect(d.aportes).toHaveLength(0);
    expect(d.entregas.map((e) => e.tipo)).toEqual(['Sopa']);
    expect(d.entregas[0].cantidad).toBe(12);
    expect(d.campanas.map((c) => c.nombre).sort()).toEqual(['Almuerzo con Jesús', 'Sopa con Jesús']);
  });

  it('al borrar el parte caen también su ofrenda y sus entregas', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), PARTE, 5000);
    await borrarReunion(r, datosDesde(repo), reunion.id);
    const d = datosDesde(repo);
    expect(d.reuniones).toHaveLength(0);
    expect(d.aportes).toHaveLength(0);
    expect(d.entregas).toHaveLength(0);
  });
});

describe('el motor de reuniones', () => {
  it('resume el período y ordena los partes', () => {
    const datos = datosDesde(new RepoFalso());
    datos.reuniones = [
      { ...PARTE, id: 'r1', fecha: '2026-11-15', personas: 20, visitas: 2, profesiones: 0 },
      { ...PARTE, id: 'r2', fecha: '2026-11-22', personas: 30, visitas: 4, profesiones: 1 },
    ] as Reunion[];
    expect(partesDeGrupo(datos, 'g1').map((p) => p.id)).toEqual(['r2', 'r1']);
    const res = resumenReuniones(datos, 'g1');
    expect(res).toMatchObject({ partes: 2, promedioPersonas: 25, visitas: 6, profesiones: 1 });
  });

  it('el cuadre avisa solo cuando el desglose no suma el total', () => {
    expect(avisoCuadreParte({ personas: 30, mujeres: 14, hombres: 10, ninos: 6 })).toBeNull();
    expect(avisoCuadreParte({ personas: 30, mujeres: 14, hombres: 10, ninos: 5 })).toContain('suma 29');
  });

  it('Bien Común separa lo del grupo de lo de las personas', () => {
    const datos = datosDesde(new RepoFalso());
    datos.aportes = [
      { id: 'a1', personaId: 'p1', fecha: '2026-11-01', monto: 100, tipo: 'Diezmo' },
      { id: 'a2', grupoId: 'g1', fecha: '2026-11-01', monto: 40, tipo: 'Ofrenda' },
    ] as Aporte[];
    const res = resumenBienComun(datos);
    expect(res.totalAportes).toBe(140);
    expect(res.totalGrupo).toBe(40);
    expect(res.cantidadGrupo).toBe(1);
    expect(res.porPersona.get('p1')).toBe(100);
  });
});

describe('la campaña de las comidas con nombres parecidos', () => {
  it('prefiere la campaña de la casa aunque exista otra con la palabra', async () => {
    const repo = new RepoFalso();
    repo.sembrar('campanas', { id: 'camp-suelta', nombre: 'almuerzo', estado: 'En curso', borrado: false });
    repo.sembrar('campanas', { id: 'camp-casa', nombre: 'Almuerzo con Jesús', estado: 'En curso', borrado: false });
    repo.sembrar('campanas', { id: 'camp-sopa-suelta', nombre: 'Sopa de la casa', estado: 'En curso', borrado: false });
    repo.sembrar('campanas', { id: 'camp-sopa', nombre: 'Sopa con Jesús', estado: 'En curso', borrado: false });
    const datos = datosDesde(repo);
    await registrarReunion(repo.comoRepo(), datos, { ...PARTE, almuerzos: 10, sopas: 4 }, 0);
    const despues = datosDesde(repo);
    expect(despues.entregas.find((e) => e.tipo === 'Almuerzo')?.campanaId).toBe('camp-casa');
    expect(despues.entregas.find((e) => e.tipo === 'Sopa')?.campanaId).toBe('camp-sopa');
  });
});
