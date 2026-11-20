export type Vista = 'lista' | 'tarjetas' | 'agrupada';

export interface OpcionAgrupar {
  valor: string;
  etiqueta: string;
}

/** El selector de vista de las listas: la barra segmentada de la
 * constitución — ☰ Lista · ▦ Tarjetas · ≣ Agrupada — y, en la
 * vista agrupada, el criterio (por paso, por zona o por grupo,
 * según la mesa). */
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
      <div className="seg" role="group" aria-label="Vista de la lista">
        <button type="button" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}>
          ☰ Lista
        </button>
        <button type="button" aria-pressed={vista === 'tarjetas'} onClick={() => setVista('tarjetas')}>
          ▦ Tarjetas
        </button>
        <button type="button" aria-pressed={vista === 'agrupada'} onClick={() => setVista('agrupada')}>
          ≣ Agrupada
        </button>
      </div>
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
