// Revisar la Red contra el respaldo: el diagnóstico, de solo lectura.
// Para cada colaborador del respaldo dice cómo está su ficha (bien,
// con otro nombre, borrada o ausente) y dónde cuelgan hoy sus
// aportes. No toca nada: imprime la verdad de la base para poder
// reparar con exactitud, sin adivinar.

import type { DatosMinisterio } from '../modelo/tipos';
import type { Fila } from '../datos/db';
import type { RespaldoViejo } from './convertir';
import { convertirRed } from './traerRed';

const nombreDe = (nombre: string, apellido?: string): string =>
  `${nombre} ${apellido ?? ''}`.replace(/\s+/g, ' ').trim();

export function diagnosticoRed(
  datos: DatosMinisterio,
  respaldo: RespaldoViejo,
  sobresColaboradores: Fila[],
  sobresAportes: Fila[],
): string[] {
  const { colaboradores, aportesRed } = convertirRed(respaldo);
  const tumbaColab = new Map(sobresColaboradores.map((f) => [f.id, f.borrado]));
  const tumbaAporte = new Map(sobresAportes.map((f) => [f.id, f.borrado]));
  const nombrePorId = new Map(
    datos.colaboradores.map((c) => [c.id, nombreDe(c.nombre, c.apellido)]),
  );
  const lineas: string[] = [];

  for (const c of colaboradores) {
    const nombreRespaldo = nombreDe(c.nombre, c.apellido);
    const viva = datos.colaboradores.find((x) => x.id === c.id);
    let estado: string;
    if (viva) {
      const nombreVivo = nombreDe(viva.nombre, viva.apellido);
      estado =
        nombreVivo.toUpperCase() === nombreRespaldo.toUpperCase()
          ? 'ficha bien, con su nombre'
          : `ficha EXISTE pero con otro nombre: «${nombreVivo}»`;
    } else if (tumbaColab.get(c.id)) {
      estado = 'ficha BORRADA (queda su tumba)';
    } else {
      estado = 'ficha AUSENTE (ni viva ni borrada)';
    }

    const suyos = aportesRed.filter((a) => a.colaboradorId === c.id);
    let enSuya = 0;
    let caidos = 0;
    const enOtra = new Map<string, number>();
    for (const a of suyos) {
      const actual = datos.aportesRed.find((x) => x.id === a.id);
      if (!actual) {
        caidos++;
        continue;
      }
      if (actual.colaboradorId === c.id) {
        enSuya++;
      } else {
        const dueno = nombrePorId.get(actual.colaboradorId) ?? actual.colaboradorId;
        enOtra.set(dueno, (enOtra.get(dueno) ?? 0) + 1);
      }
    }
    const partes = [
      `${nombreRespaldo}: ${estado}`,
      `aportes del respaldo: ${suyos.length}, en su ficha: ${enSuya}`,
    ];
    for (const [dueno, n] of enOtra) partes.push(`en la ficha de «${dueno}»: ${n}`);
    if (caidos > 0) partes.push(`borrados o ausentes: ${caidos}`);
    lineas.push(partes.join(' · '));
  }

  const idsRespaldo = new Set(colaboradores.map((c) => c.id));
  for (const c of datos.colaboradores) {
    if (!idsRespaldo.has(c.id)) {
      const n = datos.aportesRed.filter((a) => a.colaboradorId === c.id).length;
      lineas.push(
        `${nombreDe(c.nombre, c.apellido)}: ficha creada en la app (no está en el respaldo) · aportes: ${n}`,
      );
    }
  }

  lineas.push(
    `TOTAL en la app: ${datos.colaboradores.length} colaboradores vivos · ${datos.aportesRed.length} aportes vivos`,
  );
  return lineas;
}
