// Datos sintéticos que reproducen los casos reales de 2026, los que hicieron
// que los números no cuadraran en la app actual:
//  - p3: UNA persona con DOS registros de Misión (Confeso y Discipulado).
//  - p7: Integrada con su miembro Activo (el gozne): cuenta como Miembro.
//  - p8: Integrado con su miembro Inactivo: cae en Inactivos, fuera del total.
//  - p6: llegó por traslado ya bautizada: su registro nace en Bautizado.
//  - p9: Confeso que no perseveró: salió por Apartado (baja del período).

import {
  CATALOGO_SEMILLA,
  PM_LIDERAZGO,
  PS_APARTADO,
  PS_BAUTIZADO,
  PS_CONFESO,
  PS_CONVERSO,
  PS_DISCIPULADO,
  PS_INTEGRADO,
  PS_ALCAZADO,
} from '../modelo/catalogo';
import type { DatosMinisterio } from '../modelo/tipos';

export const HOY = '2026-11-17';
export const NOVIEMBRE_2026 = { desde: '2026-11-01', hasta: '2026-11-30' };

export const CASO_2026: DatosMinisterio = {
  pasos: CATALOGO_SEMILLA,
  personas: [
    { id: 'p1', nombre: 'Uno', sexo: 'M', fechaNacimiento: '1990-05-01' },
    { id: 'p2', nombre: 'Dos', sexo: 'F', fechaNacimiento: '2018-03-01' },
    { id: 'p3', nombre: 'Tres', sexo: 'M', fechaNacimiento: '2000-07-01' },
    { id: 'p4', nombre: 'Cuatro', sexo: 'F', fechaNacimiento: '1985-01-01', hermanoMayorId: 'p7' },
    { id: 'p5', nombre: 'Cinco', sexo: 'M', fechaNacimiento: '1950-02-01' },
    { id: 'p6', nombre: 'Seis', sexo: 'F' },
    { id: 'p7', nombre: 'Siete', sexo: 'F', fechaNacimiento: '1995-04-01', grupoId: 'g1' },
    { id: 'p8', nombre: 'Ocho', sexo: 'M', fechaNacimiento: '1988-01-01' },
    { id: 'p9', nombre: 'Nueve', sexo: 'F', fechaNacimiento: '1992-01-01' },
    { id: 'p10', nombre: 'Diez', sexo: 'M', fechaNacimiento: '1970-01-01' },
    { id: 'p11', nombre: 'Once', sexo: 'F', fechaNacimiento: '1960-06-01' },
    { id: 'p12', nombre: 'Doce', sexo: 'M', fechaNacimiento: '2015-08-01' },
  ],
  conversiones: [
    { id: 'c1', personaId: 'p1', estado: PS_ALCAZADO, fecha: '2026-11-02', historial: [{ fecha: '2026-11-02', estado: PS_ALCAZADO }] },
    { id: 'c2', personaId: 'p2', estado: PS_CONFESO, fecha: '2026-10-28', historial: [{ fecha: '2026-11-05', estado: PS_CONFESO }] },
    { id: 'c3a', personaId: 'p3', estado: PS_CONFESO, fecha: '2026-11-03', historial: [{ fecha: '2026-11-03', estado: PS_CONFESO }] },
    { id: 'c3b', personaId: 'p3', estado: PS_DISCIPULADO, fecha: '2026-08-01', historial: [{ fecha: '2026-08-01', estado: PS_DISCIPULADO, nota: 'Registro inicial' }] },
    { id: 'c4', personaId: 'p4', estado: PS_CONVERSO, fecha: '2026-10-20', historial: [{ fecha: '2026-10-20', estado: PS_CONFESO }, { fecha: '2026-11-10', estado: PS_CONVERSO }] },
    { id: 'c5', personaId: 'p5', estado: PS_DISCIPULADO, fecha: '2026-05-01', historial: [] },
    { id: 'c6', personaId: 'p6', estado: PS_BAUTIZADO, fecha: '2026-09-01', historial: [{ fecha: '2026-09-01', estado: PS_BAUTIZADO, nota: 'Registro inicial' }], bautizado: true },
    { id: 'c7', personaId: 'p7', estado: PS_INTEGRADO, fecha: '2025-12-01', historial: [] },
    { id: 'c8', personaId: 'p8', estado: PS_INTEGRADO, fecha: '2024-02-01', historial: [] },
    { id: 'c9', personaId: 'p9', estado: PS_APARTADO, fecha: '2026-06-01', historial: [{ fecha: '2026-11-12', estado: PS_APARTADO }] },
  ],
  miembros: [
    { id: 'm7', personaId: 'p7', estado: 'Activo', fechaIngreso: '2026-01-15', conversionId: 'c7', grupoId: 'g1' },
    { id: 'm8', personaId: 'p8', estado: 'Inactivo', fechaIngreso: '2024-03-01', conversionId: 'c8' },
    { id: 'm10', personaId: 'p10', estado: 'Fallecido', fechaIngreso: '2020-01-01' },
    { id: 'm11', personaId: 'p11', estado: 'Activo', fechaIngreso: '2025-06-01', conversionId: null },
    { id: 'm12', personaId: 'p12', estado: 'Activo', fechaIngreso: '2026-01-20', conversionId: null },
  ],
  estudiantes: [{ id: 'e7', personaId: 'p7', estado: 'Activo' }],
  diezmadores: [
    { id: 'd5', personaId: 'p5', activo: true },
    { id: 'd9', personaId: 'p9', activo: true },
    { id: 'd12', personaId: 'p12', activo: true },
  ],
  beneficiarios: [],
  hitos: [{ id: 'h11', personaId: 'p11', pasoId: PM_LIDERAZGO, fecha: '2025-09-01' }],
  asignaciones: [{ id: 'a7', personaId: 'p7', ministerio: 'Alabanza' }],
  grupos: [{ id: 'g1', nombre: 'Grupo Central', liderId: 'p7', zona: 'Centro' }],
  evangelismos: [],
  aportes: [
    { id: 'ap5', personaId: 'p5', fecha: '2026-11-03', monto: 500, tipo: 'Diezmo' },
    { id: 'ap12', personaId: 'p12', fecha: '2026-11-10', monto: 200, tipo: 'Diezmo' },
    { id: 'ap12b', personaId: 'p12', fecha: '2026-10-05', monto: 150, tipo: 'Ofrenda' },
  ],
};
