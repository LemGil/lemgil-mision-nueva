import { useEffect, type ReactNode } from 'react';

/** Ventana sobre la página: el detalle se ve sin bajar hasta el final de
 * la lista, como en la app de siempre. Se cierra con la ✕, tocando fuera
 * o con Escape, y la lista queda donde estaba. */
export default function Modal({
  onCerrar,
  children,
}: {
  onCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onCerrar]);

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
