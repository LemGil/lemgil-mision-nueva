// El cuadre (plano §4): la app verifica sola que sus números se sostienen
// entre sí, cruzando caminos de conteo independientes. Si un camino se
// equivoca, el cuadre se pone rojo: el error se ve, no se esconde.

import type { DatosMinisterio } from '../modelo/tipos';
import { calcularCenso } from './censo';
import { conteoMision } from './mision';
import { excedentesEnProceso, personasConProceso, procesosRepetidos } from './repetidos';

export interface ChequeoCuadre {
  nombre: string;
  ok: boolean;
  detalle: string;
}

export interface ResultadoCuadre {
  verde: boolean;
  chequeos: ChequeoCuadre[];
}

export function verificarCuadre(datos: DatosMinisterio): ResultadoCuadre {
  const chequeos: ChequeoCuadre[] = [];
  const censo = calcularCenso(datos);
  const mision = conteoMision(datos);

  // 1. El total del censo es la suma de sus partes.
  const sumaEtapas = censo.etapas.reduce((s, e) => s + e.cantidad, 0);
  chequeos.push({
    nombre: 'El total es la suma de etapas + miembros',
    ok: censo.total === sumaEtapas + censo.miembros && censo.enProceso === sumaEtapas,
    detalle: `total ${censo.total} = etapas ${sumaEtapas} + miembros ${censo.miembros}`,
  });

  // 2. Registros vs personas: la diferencia son exactamente los excedentes.
  const personasProceso = personasConProceso(datos);
  const excedentes = excedentesEnProceso(datos);
  chequeos.push({
    nombre: 'Registros en proceso − personas con proceso = excedentes',
    ok: mision.enProceso - personasProceso === excedentes,
    detalle: `${mision.enProceso} registros − ${personasProceso} personas = ${excedentes} excedentes`,
  });

  // 3. Todo excedente de Misión está señalado como proceso repetido.
  const repetidos = procesosRepetidos(datos);
  let senalados = 0;
  for (const lista of repetidos.values()) {
    for (const r of lista) if (r.proceso === 'Misión') senalados += r.cantidad - 1;
  }
  chequeos.push({
    nombre: 'Los excedentes están señalados en Personas',
    ok: senalados === excedentes,
    detalle: `${senalados} excedentes señalados de ${excedentes}`,
  });

  // 4. Las tarjetas de Misión cubren todos los registros, ni uno más.
  const sumaTarjetas =
    mision.pasos.reduce((s, t) => s + t.foto, 0) +
    mision.salidas.reduce((s, t) => s + t.foto, 0);
  chequeos.push({
    nombre: 'Las tarjetas de Misión cubren todos los registros',
    ok: sumaTarjetas === mision.totalRegistros,
    detalle: `tarjetas ${sumaTarjetas} de ${mision.totalRegistros} registros`,
  });

  // 5. Ningún proceso cuelga de una persona inexistente.
  const ids = new Set(datos.personas.map((p) => p.id));
  const huerfanos =
    datos.conversiones.filter((c) => !ids.has(c.personaId)).length +
    datos.miembros.filter((m) => !ids.has(m.personaId)).length +
    datos.estudiantes.filter((e) => !ids.has(e.personaId)).length +
    datos.diezmadores.filter((d) => !ids.has(d.personaId)).length;
  chequeos.push({
    nombre: 'Ningún proceso sin persona',
    ok: huerfanos === 0,
    detalle: huerfanos === 0 ? 'todas las referencias existen' : `${huerfanos} referencias rotas`,
  });

  return { verde: chequeos.every((c) => c.ok), chequeos };
}
