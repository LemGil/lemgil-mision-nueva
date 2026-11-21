// Los Informes por departamento (plano §6.2): lo que Secretaría comparte.
// Cada informe se construye SOLO con el motor de conteo — las mismas
// funciones que alimentan el Panel y las mesas — así que un número del
// Informe es, por construcción, el mismo número en todas partes.

import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import { resumenBienComun } from './bienComun';
import { calcularCenso } from './censo';
import { verificarCuadre } from './cuadre';
import { escaleraDeMiembro, tarjetasDeMiembros } from './miembros';
import { informeMision, type InformeMision } from './informeMision';
import { nombreColaborador, resumenRed } from './red';
import { resumenManos } from './manosAbiertas';
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
              `${a.fecha} · hoy: ${a.pasoActual} · ${a.diasEnRuta} días en la ruta`,
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
        titulo: `🏘️ Integrados (${inf.principal.integrados})`,
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
              `${e.pasoActual} · ${e.diasEnPaso} días en el paso · ${e.diasEnRuta} en la ruta`,
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
      const cuadre = verificarCuadre(datos);
      const secciones: SeccionInforme[] = [
        {
          titulo: '👥 Censo de la Congregación',
          filas: [
            ['Total de Congregados', n(censo.total)],
            ...censo.etapas.map((e): [string, string] => [`${e.emoji} ${e.nombre}`, n(e.cantidad)]),
            ['Miembros', n(censo.miembros)],
            ['Diezmadores (corte transversal)', n(censo.diezmadores)],
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
      return {
        id,
        titulo: 'Informe de Miembros y Ministerios',
        secciones: [
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
        ],
      };
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
