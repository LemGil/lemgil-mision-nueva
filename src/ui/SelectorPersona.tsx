import { useEffect, useRef, useState } from 'react';
import type { DatosMinisterio } from '../modelo/tipos';
import { buscarPersonas } from '../motor/personaVista';
import { FilaPersona } from './Piezas';

interface Props {
  datos: DatosMinisterio;
  /** personaIds que no deben aparecer (ya tienen el proceso, etc.). */
  excluir?: Set<string>;
  onElegir: (personaId: string) => void;
  placeholder?: string;
}

/** El selector de personas de las mesas: busca al teclear (nombre, teléfono
 * o carné) y elige con un toque. Solo personas ya registradas.
 * La lista se abre al entrar al campo y se cierra sola: al salir del
 * componente, al tocar fuera o con Escape — ya no se queda abierta
 * tapando el formulario cuando no se escoge a nadie. */
export default function SelectorPersona({ datos, excluir, onElegir, placeholder }: Props) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const candidatas = buscarPersonas(datos, texto)
    .filter((p) => !excluir?.has(p.id))
    .slice(0, 8);

  // Cerrar al tocar o clicar fuera del componente entero.
  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e: MouseEvent | TouchEvent) => {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alTocarFuera);
    document.addEventListener('touchstart', alTocarFuera);
    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      document.removeEventListener('touchstart', alTocarFuera);
    };
  }, [abierto]);

  return (
    <div
      className="selector-persona"
      ref={raizRef}
      onBlur={(e) => {
        // Se cierra solo cuando el foco sale del componente entero; si el
        // foco pasa a una fila de la lista, sigue abierto para elegir.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false);
      }}
    >
      <input
        placeholder={placeholder ?? '🔍 Buscar persona registrada…'}
        value={texto}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setAbierto(false);
        }}
      />
      {abierto && (
        <ul
          className="lista-personas"
          // Sin esto, en algunos navegadores el campo pierde el foco antes
          // de que llegue el clic a la fila y la elección se pierde.
          onMouseDown={(e) => e.preventDefault()}
        >
          {candidatas.map((p) => (
            <li key={p.id}>
              <FilaPersona
                nombre={`${p.nombre} ${p.apellidos ?? ''}`}
                meta={p.telefono ?? 'Sin teléfono'}
                onClick={() => {
                  onElegir(p.id);
                  setTexto('');
                  setAbierto(false);
                }}
              />
            </li>
          ))}
          {candidatas.length === 0 && <li className="tenue">Sin personas disponibles.</li>}
        </ul>
      )}
    </div>
  );
}
