// LA MIGRACIÓN ÚNICA (plano §8): del respaldo JSON de la app actual al
// modelo nuevo. Es un conversor tolerante: mapea por nombre de campo con
// respaldos, y TODO lo que no puede mapear con seguridad lo anota en el
// informe — no inventa ni fusiona nada. Los duplicados viajan tal cual: el
// cuadre dirá la verdad sobre ellos y la señal de repetidos los marcará.
// El catálogo viejo viaja entero: los nombres vivos de LemGil (Alcanzado…)
// son suyos y se conservan.

import type {
  Aporte,
  AsignacionMinisterio,
  Beneficiario,
  Conversion,
  DatosMinisterio,
  Diezmador,
  EstadoMiembro,
  Estudiante,
  Evangelismo,
  Grupo,
  Hito,
  Miembro,
  Paso,
  Persona,
} from '../modelo/tipos';

type Registro = Record<string, unknown>;

/** El respaldo de la app actual: tabla → registros, tal como salen de su base. */
export type RespaldoViejo = Record<string, Registro[]>;

export interface InformeMigracion {
  conteos: Record<string, number>;
  /** Procesos cuyo personaId no existe entre las personas migradas. */
  huerfanos: string[];
  avisos: string[];
}

const texto = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined;
const textoONulo = (v: unknown): string | null => texto(v) ?? null;
const numero = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const idDe = (r: Registro): string => String(r.id ?? '');

export function convertirRespaldo(respaldo: RespaldoViejo): {
  datos: DatosMinisterio;
  informe: InformeMigracion;
} {
  const avisos: string[] = [];
  const huerfanos: string[] = [];

  // — Personas: el núcleo. —
  const personas: Persona[] = (respaldo.personas ?? []).map((r) => ({
    id: idDe(r),
    nombre: texto(r.nombre) ?? '(sin nombre)',
    apellidos: texto(r.apellidos),
    numeroIdentidad: texto(r.numeroIdentidad) ?? texto(r.carne) ?? texto(r.ci),
    telefono: texto(r.telefono),
    fechaNacimiento: texto(r.fechaNacimiento) ?? texto(r.nacimiento),
    sexo: r.sexo === 'M' || r.sexo === 'F' ? r.sexo : null,
    direccion: texto(r.direccion),
    zona: texto(r.zona),
    grupoId: textoONulo(r.grupoId),
    hermanoMayorId: textoONulo(r.hermanoMayorId),
    lat: numero(r.lat) ?? null,
    lng: numero(r.lng) ?? null,
  }));
  const idsPersonas = new Set(personas.map((p) => p.id));
  const personaExiste = (tabla: string, r: Registro): boolean => {
    const pid = texto(r.personaId);
    if (!pid) {
      // Procesos viejos sin personaId: se enlazan por su propio id cuando la
      // persona heredó el id del registro prioritario (regla de la ficha única).
      if (idsPersonas.has(idDe(r))) return true;
      huerfanos.push(`${tabla}:${idDe(r)} (sin personaId)`);
      return false;
    }
    if (!idsPersonas.has(pid)) {
      huerfanos.push(`${tabla}:${idDe(r)} → persona ${pid} no existe`);
      return false;
    }
    return true;
  };
  const personaIdDe = (r: Registro): string => texto(r.personaId) ?? idDe(r);

  // — El catálogo viaja: los nombres vivos son del maestro. —
  const pasosViejos = respaldo.pasosSeguimiento ?? respaldo.pasos ?? [];
  const pasos: Paso[] = pasosViejos
    .filter((r) => r.ambito === 'mision' || r.ambito === 'miembros')
    .map((r) => ({
      id: idDe(r),
      ambito: r.ambito as Paso['ambito'],
      nombre: texto(r.nombre) ?? idDe(r),
      emoji: texto(r.emoji) ?? '',
      orden: numero(r.orden) ?? 0,
      rol: (texto(r.rol) as Paso['rol']) ?? undefined,
      fuente: (texto(r.fuente) as Paso['fuente']) ?? undefined,
      protegido: r.protegido === true,
    }));
  if (pasos.length === 0) avisos.push('El respaldo no traía catálogo: se usará la semilla.');

  // — Misión. —
  const conversiones: Conversion[] = (respaldo.conversiones ?? [])
    .filter((r) => personaExiste('conversiones', r))
    .map((r) => ({
      id: idDe(r),
      personaId: personaIdDe(r),
      estado: texto(r.estado) ?? '',
      fecha: texto(r.fecha) ?? '',
      historial: Array.isArray(r.historial)
        ? (r.historial as Registro[]).map((h) => ({
            fecha: texto(h.fecha) ?? '',
            estado: texto(h.estado) ?? '',
            nota: texto(h.nota),
          }))
        : [],
      bautizado: r.bautizado === true || undefined,
      fechaBautismo: texto(r.fechaBautismo) ?? texto(r.fechabautismo),
    }));

  // — Miembros. —
  const estadosMiembro: EstadoMiembro[] = ['Activo', 'Inactivo', 'Disciplinado', 'Trasladado', 'Fallecido'];
  const miembros: Miembro[] = (respaldo.miembros ?? [])
    .filter((r) => personaExiste('miembros', r))
    .map((r) => {
      const estadoCrudo = texto(r.estado);
      return {
        id: idDe(r),
        personaId: personaIdDe(r),
        estado: estadosMiembro.includes(estadoCrudo as EstadoMiembro)
          ? (estadoCrudo as EstadoMiembro)
          : 'Activo',
        fechaIngreso: texto(r.fechaIngreso) ?? texto(r.fecha) ?? '',
        conversionId: textoONulo(r.conversionId),
        grupoId: textoONulo(r.grupoId),
      };
    });
  // El hermano mayor vivía en la ficha del miembro en la app vieja; en el
  // modelo nuevo vive en la persona.
  const miembroPorId = new Map((respaldo.miembros ?? []).map((r) => [idDe(r), r]));
  for (const p of personas) {
    if (p.hermanoMayorId) continue;
    const miembro = (respaldo.miembros ?? []).find((r) => personaIdDe(r) === p.id);
    const hm = miembro ? texto(miembro.hermanoMayorId) : undefined;
    if (hm && idsPersonas.has(hm)) p.hermanoMayorId = hm;
  }

  // — Academia, Bien Común, Manos Abiertas. —
  const estudiantes: Estudiante[] = (respaldo.estudiantes ?? [])
    .filter((r) => personaExiste('estudiantes', r))
    .map((r) => ({
      id: idDe(r),
      personaId: personaIdDe(r),
      estado: texto(r.estado) === 'Inactivo' ? 'Inactivo' : 'Activo',
    }));

  const diezmadores: Diezmador[] = (respaldo.dadores ?? respaldo.diezmadores ?? [])
    .filter((r) => personaExiste('diezmadores', r))
    .map((r) => ({
      id: idDe(r),
      personaId: personaIdDe(r),
      activo: r.activo !== false,
    }));

  const aportes: Aporte[] = (respaldo.aportesComun ?? respaldo.registros ?? respaldo.aportes ?? [])
    .filter((r) => texto(r.personaId) || texto(r.diezmadorId))
    .map((r) => {
      // En la app vieja el aporte cuelga del diezmador; aquí, de la persona.
      let pid = texto(r.personaId);
      if (!pid) {
        const diez = (respaldo.dadores ?? []).find((d) => idDe(d) === texto(r.diezmadorId));
        pid = diez ? texto(diez.personaId) : undefined;
      }
      return {
        id: idDe(r),
        personaId: pid ?? '',
        fecha: texto(r.fecha) ?? '',
        monto: numero(r.monto) ?? numero(r.cantidad) ?? 0,
        tipo: texto(r.tipo) === 'Ofrenda' ? ('Ofrenda' as const) : ('Diezmo' as const),
      };
    })
    .filter((a) => {
      if (!idsPersonas.has(a.personaId)) {
        huerfanos.push(`aportes:${a.id} → persona no existe`);
        return false;
      }
      return true;
    });

  const beneficiarios: Beneficiario[] = (respaldo.beneficiarios ?? [])
    .filter((r) => !texto(r.personaId) || personaExiste('beneficiarios', r))
    .map((r) => ({
      id: idDe(r),
      personaId: textoONulo(r.personaId),
      estado: texto(r.estado) === 'Inactivo' ? 'Inactivo' : 'Activo',
    }));

  // — Hitos: en la app vieja cuelgan del miembro; aquí, de la persona. —
  const hitos: Hito[] = (respaldo.hitos ?? [])
    .map((r) => {
      let pid = texto(r.personaId);
      if (!pid && texto(r.miembroId)) {
        const m = miembroPorId.get(texto(r.miembroId)!);
        pid = m ? personaIdDe(m) : undefined;
      }
      return {
        id: idDe(r),
        personaId: pid ?? '',
        pasoId: texto(r.pasoId),
        tipo: texto(r.tipo),
        fecha: texto(r.fecha),
      };
    })
    .filter((h) => {
      if (!idsPersonas.has(h.personaId)) {
        huerfanos.push(`hitos:${h.id} → persona no existe`);
        return false;
      }
      return true;
    });

  // — Ministerios: la asignación vieja era por miembro; aquí, por persona. —
  const asignaciones: AsignacionMinisterio[] = (
    respaldo.miembrosMinisterios ?? respaldo.miembroMinisterios ?? respaldo.asignaciones ?? []
  )
    .map((r) => {
      let pid = texto(r.personaId);
      if (!pid && texto(r.miembroId)) {
        const m = miembroPorId.get(texto(r.miembroId)!);
        pid = m ? personaIdDe(m) : undefined;
      }
      const ministerio =
        texto(r.ministerio) ??
        texto((respaldo.ministerios ?? []).find((x) => idDe(x) === texto(r.ministerioId))?.nombre);
      return { id: idDe(r), personaId: pid ?? '', ministerio: ministerio ?? '' };
    })
    .filter((a) => {
      if (!idsPersonas.has(a.personaId) || !a.ministerio) {
        if (a.id) huerfanos.push(`asignaciones:${a.id} → sin persona o sin ministerio`);
        return false;
      }
      return true;
    });

  // — Grupos: el líder viejo era texto libre; no se enlaza a ciegas. —
  const grupos: Grupo[] = (respaldo.grupos ?? []).map((r) => {
    const liderId = texto(r.liderId);
    if (!liderId && texto(r.lider)) {
      avisos.push(`Grupo «${texto(r.nombre)}»: su líder era texto libre («${texto(r.lider)}») y queda sin enlazar.`);
    }
    return {
      id: idDe(r),
      nombre: texto(r.nombre) ?? '(sin nombre)',
      liderId: liderId && idsPersonas.has(liderId) ? liderId : null,
      zona: texto(r.zona),
      lat: numero(r.lat) ?? null,
      lng: numero(r.lng) ?? null,
    };
  });

  // — Evangelismos: líder y participantes ya son personas desde la ficha única. —
  const evangelismos: Evangelismo[] = (respaldo.evangelismos ?? []).map((r) => ({
    id: idDe(r),
    fecha: texto(r.fecha) ?? '',
    lugar: texto(r.lugar),
    liderId: textoONulo(r.liderId),
    participanteIds: (Array.isArray(r.participanteIds)
      ? (r.participanteIds as unknown[])
      : Array.isArray(r.participantes)
        ? (r.participantes as unknown[])
        : []
    )
      .map(String)
      .filter((id) => idsPersonas.has(id)),
    notas: texto(r.notas),
  }));

  if ((respaldo.colaboradores ?? []).length > 0) {
    avisos.push(
      `La Red de Colaboradores (${(respaldo.colaboradores ?? []).length} registros) no migra: es un registro externo a la ficha única y se queda en su propio registro.`,
    );
  }
  const tablasIgnoradas = Object.keys(respaldo).filter(
    (t) =>
      ![
        'personas', 'conversiones', 'miembros', 'estudiantes', 'dadores', 'diezmadores',
        'aportes', 'aportesComun', 'registros', 'beneficiarios', 'hitos',
        'miembrosMinisterios', 'miembroMinisterios', 'asignaciones', 'ministerios', 'grupos', 'evangelismos',
        'pasosSeguimiento', 'pasos', 'colaboradores',
      ].includes(t),
  );
  if (tablasIgnoradas.length > 0) {
    avisos.push(`Tablas del respaldo sin destino en el modelo nuevo: ${tablasIgnoradas.join(', ')}.`);
  }

  const datos: DatosMinisterio = {
    personas,
    conversiones,
    miembros,
    estudiantes,
    diezmadores,
    beneficiarios,
    hitos,
    asignaciones,
    grupos,
    evangelismos,
    aportes,
    pasos,
  };
  return {
    datos,
    informe: {
      conteos: {
        personas: personas.length,
        conversiones: conversiones.length,
        miembros: miembros.length,
        estudiantes: estudiantes.length,
        diezmadores: diezmadores.length,
        aportes: aportes.length,
        beneficiarios: beneficiarios.length,
        hitos: hitos.length,
        asignaciones: asignaciones.length,
        grupos: grupos.length,
        evangelismos: evangelismos.length,
        pasos: pasos.length,
      },
      huerfanos,
      avisos,
    },
  };
}
