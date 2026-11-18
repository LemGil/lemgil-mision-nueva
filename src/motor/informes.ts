// Los Informes por departamento (plano §6.2): lo que Secretaría comparte.
// Cada informe se construye SOLO con el motor de conteo — las mismas
// funciones que alimentan el Panel y las mesas — así que un número del
// Informe es, por construcción, el mismo número en todas partes.

import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import { resumenBienComun } from './bienComun';
import { calcularCenso } from './censo';
import { verificarCuadre } from './cuadre';
import { escaleraDeMiembro, tarjetasDeMiembros } from './miembros';
import { conteoMision } from './mision';

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
  secciones: SeccionInforme[];
}

export interface OpcionesInforme {
  periodo?: Periodo;
  cohorte?: { ano?: number; mes?: number };
}

const n = (x: number) => String(x);

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
      const conteo = conteoMision(datos, opts.periodo);
      const censo = calcularCenso(datos, { periodo: opts.periodo });
      const secciones: SeccionInforme[] = [
        {
          titulo: '🧭 El proceso (registros)',
          filas: [
            ['En proceso', n(conteo.enProceso)],
            ...conteo.pasos.map((t): [string, string] => [
              `${t.emoji} ${t.nombre}`,
              opts.periodo ? `${t.periodo ?? 0} en el período · ${t.foto} hoy` : n(t.foto),
            ]),
            ...conteo.salidas
              .filter((t) => t.foto > 0 || (t.periodo ?? 0) > 0)
              .map((t): [string, string] => [
                `${t.emoji} ${t.nombre}`,
                opts.periodo ? `${t.periodo ?? 0} en el período · ${t.foto} hoy` : n(t.foto),
              ]),
          ],
        },
      ];
      if (censo.periodo) {
        secciones.push({
          titulo: '📅 Movimiento del período (personas)',
          filas: [
            ['Confesiones', n(censo.periodo.confesiones)],
            ['Conversiones', n(censo.periodo.conversiones)],
            ['Bajas', n(censo.periodo.bajas)],
          ],
        });
      }
      return { id, titulo: 'Informe de Misión', secciones };
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
              ['Total aportado', n(resumen.totalAportes)],
              ['Cantidad de aportes', n(resumen.cantidadAportes)],
            ],
          },
        ],
      };
    }
    case 'colaboradores':
      return {
        id,
        titulo: 'Informe de la Red de Colaboradores',
        secciones: [
          {
            titulo: '🤝 Nota',
            filas: [
              [
                'Registro',
                'Los colaboradores son externos al Ministerio: su registro no entra en la ficha única. Su mesa llega en la Fase 4.',
              ],
            ],
          },
        ],
      };
    case 'manos-abiertas': {
      const porEstado = new Map<string, number>();
      for (const b of datos.beneficiarios) {
        porEstado.set(b.estado, (porEstado.get(b.estado) ?? 0) + 1);
      }
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
        ],
      };
    }
  }
}
