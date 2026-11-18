/** La breve explicación al inicio de cada página: qué sucede ahí.
 * Sirve de guía para quien usa la app y de acuerdo visible cuando
 * revisamos juntos qué hace cada mesa. */
export default function GuiaPagina({ texto }: { texto: string }) {
  return <p className="guia-pagina">💡 {texto}</p>;
}
