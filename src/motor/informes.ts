// Los Informes por departamento (plano §6.2): lo que Secretaría comparte.
// Cada informe se construye SOLO con el motor de conteo — las mismas
// funciones que alimentan el Panel y las mesas — así que un número del
// Informe es, por construcción, el mismo número en todas partes.

import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import { resumenBienComun } from './bienComun';
import { calcularCenso } from './censo';
import { verificarCuadre } from './cuadre';
import { escaleraDeMiembro, tarjetasDeMiembros } from './miembros';
import { corteBautizados, informeMision, type InformeMision } from './informeMision';
import { nombreColaborador, resumenRed } from './red';
import { resumenManos } from './manosAbiertas';
import { resumenMinisterios } from './ministerios';
import { formatoDinero } from './dinero';

export type DepartamentoId =
  | 'general'
  | 'mision'
  | 'miembros'
  | 'academia'
  | 'bien-comun'
  | 'colaboradores'
  | 'manos-abiertas';

export const DEPARTAMENTOS: { id: DepartamentoId; nombre: string }[] = [
  { id: 'general', nombre: 'General' },
  { id: 'mision', nombre: 'Misión' },
  { id: 'miembros', nombre: 'Miembros y Ministerios' },
  { id: 'academia', nombre: 'Academia' },
  { id: 'bien-comun', nombre: 'Bien Común' },
  { id: 'colaboradores', nombre: 'Red de Colaboradores' },
  { id: 'manos-abiertas', nombre: 'Manos Abiertas' },
];

export interface SeccionInforme {
  titulo: string;
  filas: [string, string][];
}

export interface Informe {
  id: DepartamentoId;
  titulo: string;
  /** La línea principal del informe, si el departamento la tiene:
   * se muestra destacada, antes de las secciones. */
  principal?: string;
  secciones: SeccionInforme[];
}

export interface OpcionesInforme {
  periodo?: Periodo;
  cohorte?: { ano?: number; mes?: number };
}

const n = (x: number) => String(x);

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** '2025-03-02' → '2 mar 2025', la fecha corta de la casa. */
const fechaInforme = (iso: string) =>
  `${Number(iso.slice(8, 10))} ${MESES_CORTO[Number(iso.slice(5, 7)) - 1] ?? ''} ${iso.slice(0, 4)}`;

/** Las secciones ampliadas del Informe de Misión (lo ampliado:
 * persona por persona). Las comparten la página Informe y la
 * propia página Misión, para que el formato sea uno solo. */
export function seccionesInformeMision(inf: InformeMision): SeccionInforme[] {
    const vacia: [string, string][] = [['Sin registros en el período', '']];
    return [
      {
        titulo: `🙏 Alcanzados (${inf.principal.alcanzados})`,
        filas: inf.alcanzados.length
          ? inf.alcanzados.map((a): [string, string] => [
              a.nombre,
              `${a.fecha} · hoy: ${a.pasoActual} · ${a.diasEnRuta} días en la ruta${a.vinoBautizado ? ' · 💧 vino bautizado' : ''}`,
            ])
          : vacia,
      },
      {
        titulo: `💧 Bautizados (${inf.principal.bautizados})`,
        filas: inf.bautizados.length
          ? inf.bautizados.map((b): [string, string] => [b.nombre, b.fecha])
          : vacia,
      },
      {
        titulo: `🏘️ Añadidos (${inf.principal.integrados})`,
        filas: inf.integrados.length
          ? inf.integrados.map((i): [string, string] => [
              i.nombre,
              i.bautizadoConNosotros
                ? `${i.fecha} · 💧 se bautizó con nosotros`
                : `${i.fecha} · vino ya bautizado`,
            ])
          : vacia,
      },
      {
        titulo: '🚪 Bajas por tipo',
        filas: inf.bajasDesglose.length
          ? inf.bajasDesglose.map((d): [string, string] => [d.salida, n(d.cantidad)])
          : vacia,
      },
      {
        titulo: `🚪 Las bajas (${inf.principal.bajas})`,
        filas: inf.bajas.length
          ? inf.bajas.map((b): [string, string] => [
              b.nombre,
              `${b.salida} · ${b.fecha}${b.pasoPrevio ? ` · venía de ${b.pasoPrevio}` : ''}`,
            ])
          : vacia,
      },
      {
        titulo: `🧭 En proceso (${inf.principal.enProceso}) — entraron en el período y siguen`,
        filas: inf.enProceso.length
          ? inf.enProceso.map((e): [string, string] => [
              e.nombre,
              `${e.pasoActual} · ${e.diasEnPaso} días en el paso · ${e.diasEnRuta} en la ruta${e.vinoBautizado ? ' · 💧 vino bautizado' : ''}`,
            ])
          : vacia,
      },
    ]
}

export function construirInforme(
  id: DepartamentoId,
  datos: DatosMinisterio,
  opts: OpcionesInforme = {},
): Informe {
  switch (id) {
    case 'general': {
      const censo = calcularCenso(datos, { periodo: opts.periodo });
      const corteBaut = corteBautizados(datos);
      const cuadre = verificarCuadre(datos);
      const secciones: SeccionInforme[] = [
        {
          titulo: '👥 Censo de la Congregación',
          filas: [
            ['Total de Congregados', n(censo.total)],
            ...censo.etapas.map((e): [string, string] => [`${e.emoji} ${e.nombre}`, n(e.cantidad)]),
            ['Miembros', n(censo.miembros)],
            ['Diezmadores (corte transversal)', n(censo.diezmadores)],
            [
              'Bautizados (corte transversal)',
              `${n(corteBaut.casa)} con nosotros · ${n(corteBaut.fuera)} vinieron bautizados`,
            ],
            ['Hombres / Mujeres', `${censo.demografico.hombres} / ${censo.demografico.mujeres}`],
            [
              'Niños / Jóvenes / Adultos / Ancianos',
              `${censo.demografico.ninos} / ${censo.demografico.jovenes} / ${censo.demografico.adultos} / ${censo.demografico.ancianos}`,
            ],
            ['Inactivos (fuera del total)', n(censo.inactivos)],
            [
              'Bajas: Apartados / Traslados / Fallecidos',
              `${censo.bajas.apartados} / ${censo.bajas.traslados} / ${censo.bajas.fallecidos}`,
            ],
          ],
        },
      ];
      if (censo.periodo) {
        secciones.push({
          titulo: '📅 Movimiento del período',
          filas: [
            ['Confesiones', n(censo.periodo.confesiones)],
            ['Conversiones', n(censo.periodo.conversiones)],
            ['Bajas', n(censo.periodo.bajas)],
          ],
        });
      }
      secciones.push({
        titulo: '🧮 El cuadre',
        filas: [
          ['Estado', cuadre.verde ? '🟢 Cuadra' : '🔴 No cuadra'],
          ...cuadre.chequeos.map((c): [string, string] => [
            c.nombre,
            `${c.ok ? '✓' : '✗'} ${c.detalle}`,
          ]),
        ],
      });
      return { id, titulo: 'Informe General del Ministerio', secciones };
    }
    case 'mision': {
      // El formato de LemGil (2026-11-21): lo principal en cinco
      // números —personas únicas— y lo ampliado, persona por
      // persona. El motor vive en informeMision.ts.
      const inf = informeMision(datos, opts.periodo);
      return { id, titulo: 'Informe de Misión', principal: inf.frase, secciones: seccionesInformeMision(inf) };
    }
    case 'miembros': {
      const t = tarjetasDeMiembros(datos, opts.cohorte);
      const cumplidos = new Map<string, number>();
      for (const m of datos.miembros) {
        if (m.estado !== 'Activo') continue;
        for (const e of escaleraDeMiembro(datos, m).estados) {
          if (e.cumplido) cumplidos.set(e.paso.nombre, (cumplidos.get(e.paso.nombre) ?? 0) + 1);
        }
      }
      const secciones: SeccionInforme[] = [
        {
          titulo: opts.cohorte?.ano ? '🏠 La foto de la cohorte' : '🏠 La foto de la membresía',
          filas: [
            ['Activos', n(t.activos)],
            ['Inactivos', n(t.inactivos)],
            ['Trasladados', n(t.trasladados)],
            ['Fallecidos', n(t.fallecidos)],
            ['Disciplinados', n(t.disciplinados)],
          ],
        },
        {
          titulo: '🪜 La escalera (sobre los Activos)',
          filas: [
            ['En Grupo', n(t.enGrupo)],
            ['Diezmadores', n(t.diezmadores)],
            ['En la Academia', n(t.enAcademia)],
            ['Sirviendo', n(t.sirviendo)],
            ['Hermano Mayor (los que son)', n(t.hermanoMayor)],
            ['Líderes', n(t.lideres)],
            ...[...cumplidos.entries()].map(([nombre, c]): [string, string] => [
              `Paso cumplido: ${nombre}`,
              n(c),
            ]),
          ],
        },
      ];
      // Los ministerios con su ficha (v67): el servicio, cada
      // ministerio con su responsable y su misión, y lo que hay
      // que cuidar — empezando por los miembros que aún no sirven.
      const vistas = resumenMinisterios(datos);
      const nombrePersona = (personaId: string) => {
        const p = datos.personas.find((x) => x.id === personaId);
        return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : '—';
      };
      const conGente = vistas.filter((v) => v.miembros.length > 0).length;
      const sinFrente = vistas.filter((v) => !v.responsable);
      const sinGente = vistas.filter((v) => v.miembros.length === 0);
      const sirviendoIds = new Set(datos.asignaciones.map((a) => a.personaId));
      secciones.push({
        titulo: '🤲 El servicio en los ministerios',
        filas: [
          ['Ministerios', n(vistas.length)],
          ['Con ficha registrada', n(datos.ministerios.length)],
          ['Con gente sirviendo', n(conGente)],
          ['Personas sirviendo', n(sirviendoIds.size)],
          ['Sin nadie al frente', n(sinFrente.length)],
          ['Sin gente todavía', n(sinGente.length)],
        ],
      });
      if (vistas.length > 0) {
        secciones.push({
          titulo: '⛪ Los ministerios',
          filas: vistas.map((v): [string, string] => [
            v.nombre,
            [
              v.responsable ? `Al frente: ${v.responsable}` : 'Sin nadie al frente',
              v.miembros.length > 0 ? `${v.miembros.length} sirviendo` : 'sin gente',
              v.inicio ? `desde el ${fechaInforme(v.inicio)}` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          ]),
        });
      }
      const conMision = vistas.filter((v) => v.mision);
      if (conMision.length > 0) {
        secciones.push({
          titulo: '🎯 Las misiones',
          filas: conMision.map((v): [string, string] => [v.nombre, v.mision!]),
        });
      }
      const sinServir = datos.miembros
        .filter((m) => m.estado === 'Activo' && !sirviendoIds.has(m.personaId))
        .map((m) => nombrePersona(m.personaId))
        .sort((a, b) => a.localeCompare(b));
      const porPersona = new Map<string, string[]>();
      for (const a of datos.asignaciones) {
        const lista = porPersona.get(a.personaId) ?? [];
        lista.push(a.ministerio);
        porPersona.set(a.personaId, lista);
      }
      const enVarios = [...porPersona.entries()]
        .filter(([, lista]) => lista.length > 1)
        .map(([personaId, lista]) => ({ nombre: nombrePersona(personaId), ministerios: lista }))
        .sort(
          (a, b) =>
            b.ministerios.length - a.ministerios.length || a.nombre.localeCompare(b.nombre),
        );
      const filasCuidar: [string, string][] = [
        ...sinServir.map((nombre): [string, string] => [
          nombre,
          'Miembro activo · aún no sirve en un ministerio',
        ]),
        ...enVarios.map((x): [string, string] => [
          x.nombre,
          `Sirve en ${x.ministerios.length}: ${x.ministerios.join(', ')}`,
        ]),
        ...sinFrente.map((v): [string, string] => [v.nombre, 'Ministerio sin nadie al frente']),
        ...sinGente.map((v): [string, string] => [v.nombre, 'Ministerio sin gente todavía']),
      ];
      if (filasCuidar.length > 0) {
        secciones.push({
          titulo: `⚠️ A cuidar (${sinServir.length} sin servir · ${enVarios.length} en varios)`,
          filas: filasCuidar,
        });
      }
      return { id, titulo: 'Informe de Miembros y Ministerios', secciones };
    }
    case 'academia': {
      const activos = datos.estudiantes.filter((e) => e.estado === 'Activo').length;
      return {
        id,
        titulo: 'Informe de la Academia',
        secciones: [
          {
            titulo: '🎓 Estudiantes',
            filas: [
              ['Activos', n(activos)],
              ['Inactivos', n(datos.estudiantes.length - activos)],
              ['Total', n(datos.estudiantes.length)],
            ],
          },
        ],
      };
    }
    case 'bien-comun': {
      const activos = datos.diezmadores.filter((d) => d.activo).length;
      const resumen = resumenBienComun(datos, opts.periodo);
      return {
        id,
        titulo: 'Informe de Bien Común',
        secciones: [
          {
            titulo: '🌾 Diezmadores',
            filas: [
              ['Activos', n(activos)],
              ['Inactivos', n(datos.diezmadores.length - activos)],
              ['Total', n(datos.diezmadores.length)],
            ],
          },
          {
            titulo: opts.periodo ? '💰 Aportes del período' : '💰 Aportes',
            filas: [
              ['Total aportado', formatoDinero(resumen.totalAportes)],
              ['Cantidad de aportes', n(resumen.cantidadAportes)],
            ],
          },
        ],
      };
    }
    case 'colaboradores': {
      const resumen = resumenRed(datos, opts.periodo);
      const porColaborador: [string, string][] = datos.colaboradores
        .map((c) => ({
          nombre: nombreColaborador(c),
          total: resumen.porColaborador.get(c.id) ?? 0,
        }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total)
        .map((x): [string, string] => [x.nombre, formatoDinero(x.total)]);
      return {
        id,
        titulo: 'Informe de la Red de Colaboradores',
        secciones: [
          {
            titulo: '🤝 Colaboradores (externos al Ministerio)',
            filas: [
              ['Activos', n(resumen.activos)],
              ['Inactivos', n(resumen.inactivos)],
              ['Total', n(datos.colaboradores.length)],
            ],
          },
          {
            titulo: opts.periodo ? '💰 Aportes del período' : '💰 Aportes',
            filas: [
              ['Total aportado', formatoDinero(resumen.totalAportes)],
              ['Cantidad de aportes', n(resumen.cantidadAportes)],
            ],
          },
          ...(porColaborador.length > 0
            ? [{ titulo: '💰 Por colaborador', filas: porColaborador }]
            : []),
        ],
      };
    }
    case 'manos-abiertas': {
      const porEstado = new Map<string, number>();
      for (const b of datos.beneficiarios) {
        porEstado.set(b.estado, (porEstado.get(b.estado) ?? 0) + 1);
      }
      const manos = resumenManos(datos);
      const porCampana: [string, string][] = datos.campanas
        .map((c) => {
          const r = manos.porCampana.get(c.id);
          return {
            nombre: c.nombre,
            texto: r
              ? `${r.entregas} entregas · ${r.totalCantidad} en cantidad · última ${r.ultimaFecha}`
              : 'sin entregas',
          };
        })
        .map((x): [string, string] => [x.nombre, x.texto]);
      return {
        id,
        titulo: 'Informe de Manos Abiertas',
        secciones: [
          {
            titulo: '👐 Beneficiarios',
            filas: [
              ...[...porEstado.entries()].map(([e, c]): [string, string] => [e, n(c)]),
              ['Total', n(datos.beneficiarios.length)],
            ],
          },
          {
            titulo: '🎪 Campañas y entregas',
            filas: [
              ['Campañas en curso', n(manos.campanasEnCurso)],
              ['Campañas en total', n(manos.campanasTotal)],
              ['Entregas registradas', n(manos.entregasTotal)],
              ...porCampana,
            ],
          },
        ],
      };
    }
  }
}
