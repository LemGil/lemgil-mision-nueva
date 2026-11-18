// Los filtros de período se alimentan de las fechas REALES registradas:
// solo aparecen los años y meses que tienen registros (pedido de LemGil:
// nada de años vacíos como 2027 ni años con datos escondidos como 2024).

/** Años con al menos un registro, del más reciente al más antiguo. */
export function anosConRegistros(fechas: Iterable<string | null | undefined>): number[] {
  const s = new Set<number>();
  for (const f of fechas) {
    if (f && /^\d{4}-\d{2}/.test(f)) s.add(Number(f.slice(0, 4)));
  }
  return [...s].sort((a, b) => b - a);
}

/** Meses (1–12) con registros dentro del año dado, en orden. */
export function mesesConRegistros(fechas: Iterable<string | null | undefined>, ano: number): number[] {
  const s = new Set<number>();
  for (const f of fechas) {
    if (f && /^\d{4}-\d{2}/.test(f) && Number(f.slice(0, 4)) === ano) {
      const m = Number(f.slice(5, 7));
      if (m >= 1 && m <= 12) s.add(m);
    }
  }
  return [...s].sort((a, b) => a - b);
}
