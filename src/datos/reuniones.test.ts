import { describe, expect, it } from 'vitest';
import type { Aporte, Campana, DatosMinisterio, Entrega, Reunion } from '../modelo/tipos';
import { RepoFalso } from '../migracion/repoFalso';
import { actualizarReunion, borrarReunion, registrarReunion } from './acciones';
import { avisoCuadreParte, ofrendaDeParte, partesDeGrupo, resumenReuniones, tesorosDeParte } from '../motor/reuniones';
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
    academias: [], encuentros: [], ministerios: [],
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

describe('registrar un parte viejo no duplica lo que ya está', () => {
  it('la ofrenda histórica se enlaza al parte en vez de crearse otra', async () => {
    const repo = new RepoFalso();
    repo.sembrar('aportes', { id: 'ap-viejo', grupoId: 'g1', fecha: PARTE.fecha, monto: 5000, tipo: 'Ofrenda', borrado: false });
    const reunion = await registrarReunion(repo.comoRepo(), datosDesde(repo), PARTE, 5000);
    const d = datosDesde(repo);
    expect(d.aportes).toHaveLength(1);
    expect(d.aportes[0].id).toBe('ap-viejo');
    expect(d.aportes[0].reunionId).toBe(reunion.id);
    expect(d.aportes[0].monto).toBe(5000);
  });

  it('si el monto difiere, manda el parte y sigue siendo un solo registro', async () => {
    const repo = new RepoFalso();
    repo.sembrar('aportes', { id: 'ap-viejo', grupoId: 'g1', fecha: PARTE.fecha, monto: 4000, tipo: 'Ofrenda', borrado: false });
    await registrarReunion(repo.comoRepo(), datosDesde(repo), PARTE, 5000);
    const d = datosDesde(repo);
    expect(d.aportes).toHaveLength(1);
    expect(d.aportes[0].monto).toBe(5000);
  });

  it('una ofrenda suelta de otra fecha no se toca: el parte crea la suya', async () => {
    const repo = new RepoFalso();
    repo.sembrar('aportes', { id: 'ap-viejo', grupoId: 'g1', fecha: '2026-11-15', monto: 5000, tipo: 'Ofrenda', borrado: false });
    await registrarReunion(repo.comoRepo(), datosDesde(repo), PARTE, 5000);
    const d = datosDesde(repo);
    expect(d.aportes).toHaveLength(2);
    expect(d.aportes.find((a) => a.id === 'ap-viejo')?.reunionId).toBeUndefined();
  });

  it('la entrega histórica de la campaña se enlaza igual', async () => {
    const repo = new RepoFalso();
    repo.sembrar('campanas', { id: 'camp-casa', nombre: 'Almuerzo con Jesús', estado: 'En curso', borrado: false });
    repo.sembrar('entregas', { id: 'en-vieja', campanaId: 'camp-casa', fecha: PARTE.fecha, tipo: 'almuerzo', cantidad: 99, borrado: false });
    const reunion = await registrarReunion(repo.comoRepo(), datosDesde(repo), { ...PARTE, almuerzos: 10 }, 0);
    const d = datosDesde(repo);
    expect(d.entregas).toHaveLength(1);
    expect(d.entregas[0].id).toBe('en-vieja');
    expect(d.entregas[0].reunionId).toBe(reunion.id);
    expect(d.entregas[0].cantidad).toBe(10);
  });
});

describe('los diezmos del parte pasan a Bien Común', () => {
  const DIEZMOS = [
    { personaId: 'p1', monto: 3000 },
    { personaId: 'p2', monto: 1500 },
  ];

  it('al registrar: cada diezmo es un aporte a su nombre, enlazado al parte, y su ficha de diezmador nace', async () => {
    const repo = new RepoFalso();
    const reunion = await registrarReunion(repo.comoRepo(), datosDesde(repo), PARTE, 5000, DIEZMOS);
    const d = datosDesde(repo);
    const diezmos = d.aportes.filter((a) => a.personaId);
    expect(diezmos).toHaveLength(2);
    expect(diezmos.every((a) => a.tipo === 'Diezmo' && a.reunionId === reunion.id && a.fecha === PARTE.fecha)).toBe(true);
    expect(diezmos.reduce((x, a) => x + a.monto, 0)).toBe(4500);
    // la ofrenda del grupo sigue siendo suya, sin confundirse
    expect(ofrendaDeParte(d, reunion.id)?.monto).toBe(5000);
    expect(repo.vivos<{ personaId: string }>('diezmadores').map((x) => x.personaId).sort()).toEqual(['p1', 'p2']);
    // y Bien Común los cuenta por persona
    const resumen = resumenBienComun(d);
    expect(resumen.porPersona.get('p1')).toBe(3000);
    expect(resumen.totalGrupo).toBe(5000);
  });

  it('al corregir: cambiar un monto, quitar uno y añadir otro deja la lista exacta', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), PARTE, 0, DIEZMOS);
    await actualizarReunion(r, datosDesde(repo), reunion, 0, [
      { personaId: 'p1', monto: 3500 },
      { personaId: 'p3', monto: 700 },
    ]);
    const d = datosDesde(repo);
    const diezmos = d.aportes.filter((a) => a.personaId);
    expect(diezmos).toHaveLength(2);
    expect(diezmos.find((a) => a.personaId === 'p1')?.monto).toBe(3500);
    expect(diezmos.find((a) => a.personaId === 'p3')?.monto).toBe(700);
    expect(diezmos.some((a) => a.personaId === 'p2')).toBe(false);
  });

  it('un diezmo suelto de la misma persona y fecha se adopta, no se duplica', async () => {
    const repo = new RepoFalso();
    repo.sembrar('aportes', { id: 'ap-suelto', personaId: 'p1', fecha: PARTE.fecha, monto: 3000, tipo: 'Diezmo', borrado: false });
    const reunion = await registrarReunion(repo.comoRepo(), datosDesde(repo), PARTE, 0, DIEZMOS);
    const d = datosDesde(repo);
    const deP1 = d.aportes.filter((a) => a.personaId === 'p1');
    expect(deP1).toHaveLength(1);
    expect(deP1[0].id).toBe('ap-suelto');
    expect(deP1[0].reunionId).toBe(reunion.id);
  });

  it('si la persona ya es diezmador, no se le crea otra ficha', async () => {
    const repo = new RepoFalso();
    repo.sembrar('diezmadores', { id: 'dz1', personaId: 'p1', activo: true, borrado: false });
    const datos = { ...datosDesde(repo), diezmadores: [{ id: 'dz1', personaId: 'p1', activo: true }] };
    await registrarReunion(repo.comoRepo(), datos, PARTE, 0, DIEZMOS);
    expect(repo.vivos('diezmadores').filter((x) => (x as { personaId: string }).personaId === 'p1')).toHaveLength(1);
    expect(repo.vivos('diezmadores')).toHaveLength(2);
  });

  it('al borrar el parte caen también sus diezmos', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), PARTE, 5000, DIEZMOS);
    await borrarReunion(r, datosDesde(repo), reunion.id);
    const d = datosDesde(repo);
    expect(d.aportes).toHaveLength(0);
    expect(d.reuniones).toHaveLength(0);
  });

  it('el resumen de reuniones cuenta los diezmos de los partes', async () => {
    const repo = new RepoFalso();
    await registrarReunion(repo.comoRepo(), datosDesde(repo), PARTE, 0, DIEZMOS);
    const resumen = resumenReuniones(datosDesde(repo), 'g1');
    expect(resumen.diezmos).toBe(2);
    expect(resumen.totalDiezmos).toBe(4500);
  });
});

describe('el Tesoro de Manos Abiertas en el parte', () => {
  const SIN_COMIDA = { ...PARTE, almuerzos: 0, sopas: 0 };
  const TESOROS = [
    { personaId: 'p1', nombre: 'Ana Hermana', tipo: 'Alimentos', detalle: 'Arroz y aceite' },
    { nombre: 'María de visita', tipo: 'Aseo' },
  ];

  it('al registrar: cada regalo es una entrega a su nombre en la campaña del Tesoro, que nace si no existe', async () => {
    const repo = new RepoFalso();
    const reunion = await registrarReunion(repo.comoRepo(), datosDesde(repo), SIN_COMIDA, 0, [], TESOROS);
    const d = datosDesde(repo);
    expect(d.campanas.map((c) => c.nombre)).toEqual(['Tesoro de Manos Abiertas']);
    const entregas = tesorosDeParte(d, reunion.id);
    expect(entregas).toHaveLength(2);
    const deAna = entregas.find((e) => e.personaId === 'p1');
    expect(deAna).toMatchObject({
      beneficiarioNombre: 'Ana Hermana',
      tipo: 'Alimentos',
      cantidad: 1,
      unidad: 'regalo',
      fecha: PARTE.fecha,
      notas: 'Arroz y aceite',
    });
    const deMaria = entregas.find((e) => e.beneficiarioNombre === 'María de visita');
    expect(deMaria?.personaId).toBeUndefined();
    expect(deMaria?.tipo).toBe('Aseo');
    expect(deMaria?.notas).toBeUndefined();
    // el resumen del grupo cuenta los regalos
    expect(resumenReuniones(d, 'g1').tesoros).toBe(2);
  });

  it('una entrega suelta de la campaña, misma fecha y misma persona, se adopta y no se duplica', async () => {
    const repo = new RepoFalso();
    repo.sembrar('campanas', { id: 'camp-tesoro', nombre: 'Tesoro de Manos Abiertas', estado: 'En curso', borrado: false });
    repo.sembrar('entregas', { id: 'en-suelta', campanaId: 'camp-tesoro', personaId: 'p1', beneficiarioNombre: 'Ana Hermana', fecha: PARTE.fecha, tipo: 'Alimentos', borrado: false });
    repo.sembrar('entregas', { id: 'en-visita', campanaId: 'camp-tesoro', beneficiarioNombre: 'María de visita', fecha: PARTE.fecha, tipo: 'Aseo', borrado: false });
    const reunion = await registrarReunion(repo.comoRepo(), datosDesde(repo), SIN_COMIDA, 0, [], TESOROS);
    const d = datosDesde(repo);
    expect(d.entregas).toHaveLength(2);
    expect(d.entregas.map((e) => e.id).sort()).toEqual(['en-suelta', 'en-visita']);
    expect(d.entregas.every((e) => e.reunionId === reunion.id)).toBe(true);
  });

  it('la campaña de la casa manda sobre otra que solo contenga «tesoro»', async () => {
    const repo = new RepoFalso();
    repo.sembrar('campanas', { id: 'camp-suelta', nombre: 'tesoro', estado: 'En curso', borrado: false });
    repo.sembrar('campanas', { id: 'camp-casa', nombre: 'Tesoro de Manos Abiertas', estado: 'En curso', borrado: false });
    await registrarReunion(repo.comoRepo(), datosDesde(repo), SIN_COMIDA, 0, [], TESOROS);
    const d = datosDesde(repo);
    expect(d.campanas).toHaveLength(2);
    expect(d.entregas.every((e) => e.campanaId === 'camp-casa')).toBe(true);
  });

  it('al corregir: cambiar un regalo, quitar uno y añadir otro deja la lista exacta', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), SIN_COMIDA, 0, [], TESOROS);
    await actualizarReunion(r, datosDesde(repo), reunion, 0, [], [
      { personaId: 'p1', nombre: 'Ana Hermana', tipo: 'Ambos' },
      { personaId: 'p2', nombre: 'Luis Hermano', tipo: 'Alimentos' },
    ]);
    const d = datosDesde(repo);
    const entregas = tesorosDeParte(d, reunion.id);
    expect(entregas).toHaveLength(2);
    expect(entregas.find((e) => e.personaId === 'p1')?.tipo).toBe('Ambos');
    expect(entregas.find((e) => e.personaId === 'p2')?.beneficiarioNombre).toBe('Luis Hermano');
    expect(entregas.some((e) => e.beneficiarioNombre === 'María de visita')).toBe(false);
  });

  it('sin regalos no nace la campaña ni quedan entregas', async () => {
    const repo = new RepoFalso();
    await registrarReunion(repo.comoRepo(), datosDesde(repo), SIN_COMIDA, 0, [], []);
    const d = datosDesde(repo);
    expect(d.campanas).toHaveLength(0);
    expect(d.entregas).toHaveLength(0);
  });

  it('al borrar el parte caen también sus regalos del Tesoro', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), SIN_COMIDA, 0, [], TESOROS);
    await borrarReunion(r, datosDesde(repo), reunion.id);
    const d = datosDesde(repo);
    expect(d.entregas).toHaveLength(0);
    expect(d.reuniones).toHaveLength(0);
  });

  it('el producto y la cantidad del regalo viajan a la entrega; sin cantidad, una unidad', async () => {
    const repo = new RepoFalso();
    const reunion = await registrarReunion(repo.comoRepo(), datosDesde(repo), SIN_COMIDA, 0, [], [
      { personaId: 'p1', nombre: 'Ana Hermana', tipo: 'Alimentos', producto: 'Arroz', cantidad: 2 },
      { nombre: 'María de visita', tipo: 'Aseo', producto: 'Jabón' },
    ]);
    const d = datosDesde(repo);
    const entregas = tesorosDeParte(d, reunion.id);
    expect(entregas.find((e) => e.personaId === 'p1')).toMatchObject({ producto: 'Arroz', cantidad: 2 });
    expect(entregas.find((e) => e.beneficiarioNombre === 'María de visita')).toMatchObject({ producto: 'Jabón', cantidad: 1 });
  });

  it('al corregir el parte se corrigen el producto y la cantidad del regalo', async () => {
    const repo = new RepoFalso();
    const r = repo.comoRepo();
    const reunion = await registrarReunion(r, datosDesde(repo), SIN_COMIDA, 0, [], [
      { personaId: 'p1', nombre: 'Ana Hermana', tipo: 'Alimentos', producto: 'Arroz', cantidad: 1 },
    ]);
    await actualizarReunion(r, datosDesde(repo), reunion, 0, [], [
      { personaId: 'p1', nombre: 'Ana Hermana', tipo: 'Alimentos', producto: 'Aceite', cantidad: 3 },
    ]);
    const d = datosDesde(repo);
    const entregas = tesorosDeParte(d, reunion.id);
    expect(entregas).toHaveLength(1);
    expect(entregas[0]).toMatchObject({ producto: 'Aceite', cantidad: 3 });
  });
});
