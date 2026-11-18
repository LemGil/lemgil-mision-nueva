export type Vista = 'lista' | 'tarjetas' | 'agrupada';

export interface OpcionAgrupar {
  valor: string;
  etiqueta: string;
}

/** El selector de vista de las listas: Lista, Tarjetas o Agrupada
 * (por paso, por zona o por grupo, según la mesa). */
export default function BarraVistas({
  vista,
  setVista,
  agruparPor,
  setAgruparPor,
  opciones,
}: {
  vista: Vista;
  setVista: (v: Vista) => void;
  agruparPor: string;
  setAgruparPor: (v: string) => void;
  opciones: OpcionAgrupar[];
}) {
  return (
    <div className="vista-barra">
      <label>
        Vista{' '}
        <select value={vista} onChange={(e) => setVista(e.target.value as Vista)}>
          <option value="lista">📋 Lista</option>
          <option value="tarjetas">🃏 Tarjetas</option>
          <option value="agrupada">🗂️ Agrupada</option>
        </select>
      </label>
      {vista === 'agrupada' && (
        <label>
          Agrupar por{' '}
          <select value={agruparPor} onChange={(e) => setAgruparPor(e.target.value)}>
            {opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
