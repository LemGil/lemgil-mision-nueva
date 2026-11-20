import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { BaseLocal } from '../datos/db';
import { Repo } from '../datos/repo';
import { verificarCuadre } from '../motor/cuadre';
import { convertirRespaldo, type RespaldoViejo } from './convertir';
import { importarEnRepo } from './importar';

// Un respaldo con la forma de la app actual: el primer paso renombrado por
// LemGil (Alcanzado), el diezmador en la tabla «dadores», el hito colgando
// del miembro, el líder del grupo como texto libre y un proceso huérfano.
const RESPALDO: RespaldoViejo = {
  personas: [
    { id: 'p1', nombre: 'Ana', apellidos: 'Uno', numeroIdentidad: '111', sexo: 'F', fechaNacimiento: '1990-05-10' },
    { id: 'p2', nombre: 'Beto', apellidos: 'Dos', numeroIdentidad: '222', sexo: 'M' },
    { id: 'p3', nombre: 'Cora', apellidos: 'Tres', numeroIdentidad: '333', sexo: 'F' },
  ],
  pasosSeguimiento: [
    { id: 'ps-congregado', ambito: 'mision', nombre: 'Alcanzado', emoji: '🙏', orden: 1, rol: 'inicio', protegido: true },
    { id: 'ps-confeso', ambito: 'mision', nombre: 'Confeso', emoji: '🤲', orden: 2, rol: 'camino' },
    { id: 'ps-nuevo', ambito: 'mision', nombre: 'Converso', emoji: '🌱', orden: 3, rol: 'camino' },
    { id: 'ps-integrado', ambito: 'mision', nombre: 'Integrado', emoji: '🏘️', orden: 4, rol: 'gozne', protegido: true },
    { id: 'ps-apartado', ambito: 'mision', nombre: 'Apartado', emoji: '🚪', orden: 5, rol: 'salida', protegido: true },
    { id: 'pm-grupo', ambito: 'miembros', nombre: 'Grupo', emoji: '👥', orden: 1, fuente: 'grupo' },
    { id: 'pm-diezmo', ambito: 'miembros', nombre: 'Diezmador', emoji: '🌾', orden: 2, fuente: 'diezmo' },
  ],
  conversiones: [
    {
      id: 'c1', personaId: 'p1', estado: 'ps-integrado', fecha: '2026-01-05',
      historial: [{ fecha: '2026-01-05', estado: 'ps-integrado', nota: 'Registro inicial' }],
    },
    { id: 'c2', personaId: 'p2', estado: 'ps-confeso', fecha: '2026-11-01', historial: [] },
    { id: 'cX', personaId: 'fantasma', estado: 'ps-nuevo', fecha: '2026-01-01', historial: [] },
  ],
  miembros: [
    { id: 'm1', personaId: 'p1', estado: 'Activo', fechaIngreso: '2026-01-05', conversionId: 'c1', hermanoMayorId: 'p3' },
  ],
  dadores: [{ id: 'd1', personaId: 'p1', activo: true }],
  aportesComun: [{ id: 'a1', diezmadorId: 'd1', fecha: '2026-11-02', monto: 300, tipo: 'Diezmo' }],
  estudiantes: [{ id: 'e1', personaId: 'p1', estado: 'Activo' }],
  beneficiarios: [{ id: 'b1', personaId: 'p2', estado: 'Activo' }],
  hitos: [{ id: 'h1', miembroId: 'm1', tipo: 'Liderazgo', fecha: '2026-06-01' }],
  ministerios: [{ id: 'min1', nombre: 'Alabanza' }],
  miembrosMinisterios: [{ id: 'mm1', miembroId: 'm1', ministerioId: 'min1', rol: 'Servidor' }],
  grupos: [{ id: 'g1', nombre: 'Grupo Central', lider: 'Ana Uno', zona: 'Centro', lat: 23.11, lng: -82.36 }],
  evangelismos: [
    { id: 'ev1', fecha: '2026-11-05', lugar: 'Parque', liderId: 'p1', participanteIds: ['p1', 'p2', 'fantasma'] },
  ],
  colaboradores: [{ id: 'col1', nombre: 'Externo' }],
  tablaRara: [{ id: 'z1' }],
};

describe('la migración única', () => {
  const { datos, informe } = convertirRespaldo(RESPALDO);

  it('conserva los nombres vivos del catálogo (Alcanzado)', () => {
    expect(datos.pasos.find((p) => p.id === 'ps-congregado')?.nombre).toBe('Alcanzado');
    expect(informe.conteos.pasos).toBe(7);
  });

  it('enlaza lo que colgaba del miembro o del diezmador a la persona', () => {
    expect(datos.hitos[0].personaId).toBe('p1');
    expect(datos.aportes[0].personaId).toBe('p1');
    expect(datos.personas.find((p) => p.id === 'p1')?.hermanoMayorId).toBe('p3');
    // La asignación de ministerio (tabla miembrosMinisterios) llega por persona y nombre.
    expect(datos.asignaciones).toEqual([{ id: 'mm1', personaId: 'p1', ministerio: 'Alabanza' }]);
  });

  it('el líder en texto libre no se enlaza a ciegas: viaja como texto (liderTexto)', () => {
    expect(datos.grupos[0].liderId).toBeNull();
    expect(datos.grupos[0].liderTexto).toBe('Ana Uno');
  });

  it('el proceso huérfano se reporta y no viaja', () => {
    expect(datos.conversiones.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(informe.huerfanos.some((h) => h.includes('cX'))).toBe(true);
  });

  it('la Red queda fuera con su aviso, y la tabla rara también', () => {
    expect(informe.avisos.some((a) => a.includes('Red de Colaboradores'))).toBe(true);
    expect(informe.avisos.some((a) => a.includes('tablaRara'))).toBe(true);
  });

  it('lo migrado pasa el cuadre y se importa entero en la base nueva', async () => {    const cuadre = verificarCuadre(datos);
    expect(cuadre.verde).toBe(true);

    const repo = new Repo(new BaseLocal('migracion-test'));
    await importarEnRepo(repo, datos);
    const leidos = await aDatosMinisterio(repo);
    expect(leidos.personas).toHaveLength(3);
    expect(leidos.conversiones).toHaveLength(2);
    expect(leidos.pasos.find((p) => p.id === 'ps-congregado')?.nombre).toBe('Alcanzado');
    expect(verificarCuadre(leidos).verde).toBe(true);
  });
});

describe('la guardia de la importación', () => {
  it('solo se importa sobre la base vacía', async () => {
    const { puedeImportar } = await import('./importar');
    const { datos } = convertirRespaldo(RESPALDO);
    expect(puedeImportar({ ...datos, personas: [] }).ok).toBe(true);
    const conGente = puedeImportar(datos);
    expect(conGente.ok).toBe(false);
    expect(conGente.motivo).toContain('ya tiene 3 personas');
  });
});

describe('convertirRespaldo — enlaces con la ortografía vieja (respaldo real 2026-11-18)', () => {
  const viejo = {
    personas: [{ id: 'p1', nombre: 'Ana' }],
    miembros: [{ id: 'm1', personaId: 'p1', estado: 'Activo' }],
    ministerios: [{ id: 'n1', nombre: 'Alabanza' }],
    hitos: [
      { id: 'h1', miembroid: 'm1', tipo: 'Bautismo', fecha: '2024-05-01' },
      { id: 'h2', miembroid: 'NOMBRE EN TEXTO', tipo: 'Integración', fecha: '2023-01-01' },
    ],
    miembrosMinisterios: [{ id: 'a1', miembroid: 'm1', ministerioId: 'n1' }],
    pasosSeguimiento: [
      { id: 'pm-integracion', ambito: 'miembro', nombre: 'Integrado', orden: 0 },
      { id: 'pm-grupo', ambito: 'miembro', nombre: 'En un grupo', orden: 1, fuente: 'grupo' },
    ],
    aportesComun: [
      { id: 'ap1', fecha: '2024-01-01', monto: 100 },
      { id: 'ap2', diezmadorId: 'd1', fecha: '2024-02-01', monto: 50 },
    ],
    dadores: [{ id: 'd1', personaId: 'p1', activo: true }],
  };
  const { datos, informe } = convertirRespaldo(viejo as never);

  it('resuelve hitos y asignaciones enlazados con «miembroid» en minúscula', () => {
    expect(datos.hitos.map((h) => h.id)).toEqual(['h1']);
    expect(datos.hitos[0].personaId).toBe('p1');
    expect(datos.asignaciones).toHaveLength(1);
    expect(datos.asignaciones[0].ministerio).toBe('Alabanza');
    expect(informe.huerfanos.some((h) => h.startsWith('hitos:h2'))).toBe(true);
  });

  it('los pasos de ámbito «miembro» viajan como «miembros» y pm-integracion no viaja', () => {
    expect(datos.pasos.map((p) => p.id)).toEqual(['pm-grupo']);
    expect(datos.pasos[0].ambito).toBe('miembros');
    expect(informe.avisos.some((a) => a.includes('Integración es la puerta'))).toBe(true);
  });

  it('avisa de los aportes sin diezmador en vez de saltarlos en silencio', () => {
    expect(datos.aportes.map((a) => a.id)).toEqual(['ap2']);
    expect(informe.avisos.some((a) => a.includes('1 aportes'))).toBe(true);
  });
});

describe('datos completos de la persona', () => {
  it('apellido en singular y los campos que antes no viajaban', () => {
    const { datos } = convertirRespaldo({
      personas: [
        {
          id: 'x1',
          nombre: 'Luz',
          apellido: 'MORTICORENA RAMIREZ',
          profesion: 'Maestra',
          estadoCivil: 'Casada',
          conyuge: 'Luis Enrique',
          hijos: '2',
          email: 'luz@correo.cu',
          contactoPreferido: 'WhatsApp',
          bautizado: true,
          fechabautismo: '2020-03-15',
        },
      ],
    });
    const p = datos.personas[0];
    expect(p.apellidos).toBe('MORTICORENA RAMIREZ');
    expect(p.profesion).toBe('Maestra');
    expect(p.estadoCivil).toBe('Casada');
    expect(p.conyuge).toBe('Luis Enrique');
    expect(p.hijos).toBe('2');
    expect(p.email).toBe('luz@correo.cu');
    expect(p.contactoPreferido).toBe('WhatsApp');
    expect(p.bautizado).toBe(true);
    expect(p.fechaBautismo).toBe('2020-03-15');
  });
});
