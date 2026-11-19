// El dinero se lee como dinero: con sus miles separados (2.949.090),
// no como un número crudo pegado. Los conteos de personas y registros
// siguen en su formato simple; esto es solo para los montos.

const formato = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

export function formatoDinero(valor: number): string {
  return formato.format(valor);
}
