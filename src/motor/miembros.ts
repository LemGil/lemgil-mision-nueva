// La escalera de Miembros y sus tarjetas (plano §2.4 y §3).
// La Integración no es un peldaño: es la puerta (el gozne). La escalera que
// se trabaja es Grupo → Diezmador → Academia → Ministerio → Hermano Mayor →
// Liderazgo, y cada paso se cumple desde su fuente viva.
// Las tarjetas son la FOTO COMPLETA de la membresía; con período, la foto de
// la COHORTE que ingresó en ese año/mes (los miembros no guardan historial
// de estados: su fecha común es el ingreso).

import { pasosDeMiembros } from '../modelo/catalogo';
import { idsGruposDe } from './gruposVista';
import type { DatosMinisterio, Miembro, Paso } from '../modelo/tipos';

export interface EstadoPaso {
  paso: Paso;
  cumplido: boolean;
}

export interface EscaleraMiembro {
  estados: EstadoPaso[];
  /** El primer paso sin cumplir; null si la escalera está completa. */
  actual: Paso | null;
  cumplidos: number;
  total: number;
}

export function escaleraDeMiembro(datos: DatosMinisterio, miembro: Miembro): EscaleraMiembro {
  const persona = datos.personas.find((p) => p.id === miembro.personaId);
  const diezmadoresActivos = new Set(
    datos.diezmadores.filter((d) => d.activo).map((d) => d.personaId),
  );
  const estudiantesActivos = new Set(
    datos.estudiantes.filter((e) => e.estado === 'Activo').map((e) => e.personaId),
  );
  const sirviendo = new Set(datos.asignaciones.map((a) => a.personaId));
  const sonHermanoMayor = new Set(
    datos.personas.map((p) => p.hermanoMayorId).filter(Boolean) as string[],
  );
  const hitosDe = datos.hitos.filter((h) => h.personaId === miembro.personaId);

  const cumplido = (paso: Paso): boolean => {
    switch (paso.fuente) {
      case 'grupo':
        return idsGruposDe(datos, miembro.personaId).length > 0;
      case 'diezmo':
        return diezmadoresActivos.has(miembro.personaId);
      case 'academia':
        return estudiantesActivos.has(miembro.personaId);
      case 'ministerio':
        return sirviendo.has(miembro.personaId);
      case 'hermanoMayor':
        return sonHermanoMayor.has(miembro.personaId);
      case 'manual':
        return hitosDe.some((h) => h.pasoId === paso.id);
      default:
        return false;
    }
  };

  const estados = pasosDeMiembros(datos.pasos).map((paso) => ({
    paso,
    cumplido: cumplido(paso),
  }));
  const primeroSinCumplir = estados.find((e) => !e.cumplido);
  return {
    estados,
    actual: primeroSinCumplir ? primeroSinCumplir.paso : null,
    cumplidos: estados.filter((e) => e.cumplido).length,
    total: estados.length,
  };
}

/** ¿La fecha cae en el período de cohorte? Sin año elegido, todo pasa. */
export function fechaEnCohorte(
  fecha: string | undefined,
  periodo?: { ano?: number; mes?: number },
): boolean {
  if (!periodo?.ano) return true;
  if (!fecha) return false;
  const prefijo = periodo.mes
    ? `${periodo.ano}-${String(periodo.mes).padStart(2, '0')}`
    : `${periodo.ano}`;
  return fecha.startsWith(prefijo);
}

export interface TarjetasMiembros {
  activos: number;
  inactivos: number;
  trasladados: number;
  fallecidos: number;
  disciplinados: number;
  // Atributos, siempre sobre los Activos de la foto/cohorte:
  enGrupo: number;
  diezmadores: number;
  enAcademia: number;
  sirviendo: number;
  /** Los que SON hermano mayor de alguien. */
  hermanoMayor: number;
  lideres: number;
}

export function tarjetasDeMiembros(
  datos: DatosMinisterio,
  periodo?: { ano?: number; mes?: number },
): TarjetasMiembros {
  const foto = datos.miembros.filter((m) => fechaEnCohorte(m.fechaIngreso, periodo));
  const porEstado = (e: Miembro['estado']) => foto.filter((m) => m.estado === e).length;
  const t: TarjetasMiembros = {
    activos: porEstado('Activo'),
    inactivos: porEstado('Inactivo'),
    trasladados: porEstado('Trasladado'),
    fallecidos: porEstado('Fallecido'),
    disciplinados: porEstado('Disciplinado'),
    enGrupo: 0,
    diezmadores: 0,
    enAcademia: 0,
    sirviendo: 0,
    hermanoMayor: 0,
    lideres: 0,
  };
  for (const m of foto) {
    if (m.estado !== 'Activo') continue;
    const esc = escaleraDeMiembro(datos, m);
    for (const e of esc.estados) {
      if (!e.cumplido) continue;
      if (e.paso.fuente === 'grupo') t.enGrupo++;
      else if (e.paso.fuente === 'diezmo') t.diezmadores++;
      else if (e.paso.fuente === 'academia') t.enAcademia++;
      else if (e.paso.fuente === 'ministerio') t.sirviendo++;
      else if (e.paso.fuente === 'hermanoMayor') t.hermanoMayor++;
      else if (e.paso.fuente === 'manual') t.lideres++;
    }
  }
  return t;
}

/** Filtro «Están en:»: el paso CUMPLIDO (no el que falta). */
export function estaEnElPaso(
  datos: DatosMinisterio,
  miembro: Miembro,
  filtro: string, // pasoId o 'completa'
): boolean {
  const esc = escaleraDeMiembro(datos, miembro);
  if (filtro === 'completa') return esc.actual === null;
  return esc.estados.some((e) => e.paso.id === filtro && e.cumplido);
}
