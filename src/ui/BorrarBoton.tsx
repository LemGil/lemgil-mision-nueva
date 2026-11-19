import { useState } from 'react';

/** Borrar con confirmación en el mismo sitio: el primer toque pregunta
 * «¿Seguro?» y solo el segundo borra. Sin ventanas del navegador. */
export default function BorrarBoton({
  onBorrar,
  texto = '🗑️ Borrar',
  titulo,
}: {
  onBorrar: () => void;
  texto?: string;
  titulo?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <button type="button" className="btn btn-borrar" title={titulo} onClick={() => setConfirmando(true)}>
        {texto}
      </button>
    );
  }
  return (
    <span className="confirmar-borrado">
      <span>¿Seguro?</span>
      <button
        type="button"
        className="btn btn-borrar-firme"
        onClick={() => {
          setConfirmando(false);
          onBorrar();
        }}
      >
        Sí, borrar
      </button>
      <button type="button" className="btn" onClick={() => setConfirmando(false)}>
        No
      </button>
    </span>
  );
}
