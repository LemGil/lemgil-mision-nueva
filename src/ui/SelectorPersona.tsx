import { useState } from 'react';
import type { DatosMinisterio } from '../modelo/tipos';
import { buscarPersonas } from '../motor/personaVista';

interface Props {
  datos: DatosMinisterio;
  /** personaIds que no deben aparecer (ya tienen el proceso, etc.). */
  excluir?: Set<string>;
  onElegir: (personaId: string) => void;
  placeholder?: string;
}

/** El selector de personas de las mesas: busca al teclear (nombre, teléfono
 * o carné) y elige con un toque. Solo personas ya registradas. */
export default function SelectorPersona({ datos, excluir, onElegir, placeholder }: Props) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const candidatas = buscarPersonas(datos, texto)
    .filter((p) => !excluir?.has(p.id))
    .slice(0, 8);

  return (
    <div className="selector-persona">
      <input
        placeholder={placeholder ?? '🔍 Buscar persona registrada…'}
        value={texto}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
      />
      {abierto && (
        <ul className="lista-personas">
          {candidatas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="persona-fila"
                onClick={() => {
                  onElegir(p.id);
                  setTexto('');
                  setAbierto(false);
                }}
              >
                <span className="persona-nombre">
                  {p.nombre} {p.apellidos ?? ''}
                </span>
                <span className="persona-meta">{p.telefono ?? 'Sin teléfono'}</span>
              </button>
            </li>
          ))}
          {candidatas.length === 0 && <li className="tenue">Sin personas disponibles.</li>}
        </ul>
      )}
    </div>
  );
}
