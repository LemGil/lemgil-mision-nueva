export type Vista = 'lista' | 'tarjetas' | 'agrupada';

export interface OpcionAgrupar {
  valor: string;
  etiqueta: string;
}

/** El selector de vista de las listas: la barra segmentada de la
 * constitución — ☰ Lista · ▦ Tarjetas · ≣ Agrupada — y, en la
 * vista agrupada, el criterio (por paso, por zona o por grupo,
 * según la mesa) también en píldoras, nunca en desplegable
 * (Fase 3 del plan de conformidad, 2026-11-21). */
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
        <>
          <span className="tenue">Agrupar por</span>
          <div className="seg" role="group" aria-label="Agrupar por">
            {opciones.map((o) => (
              <button
                key={o.valor}
                type="button"
                aria-pressed={agruparPor === o.valor}
                onClick={() => setAgruparPor(o.valor)}
              >
                {o.etiqueta}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
