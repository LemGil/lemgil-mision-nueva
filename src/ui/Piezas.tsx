import type { ReactNode } from 'react';

/**
 * Las piezas únicas de la Constitución Visual (Fase B, 2026-11-19).
 * Cada pieza existe una sola vez y se reusa en todas las pantallas:
 * si una mejora, mejora la app entera.
 */

/**
 * La Lista, una sola: nombre fuerte a la izquierda con su meta tenue
 * debajo, y a la derecha el chip o el valor que la fila traiga.
 * Las vistas de tarjetas y agrupada son esta misma fila con otro traje.
 */
export function FilaPersona({
  nombre,
  meta,
  derecha,
  activa,
  onClick,
}: {
  nombre: ReactNode;
  meta?: ReactNode;
  derecha?: ReactNode;
  activa?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`persona-fila ${activa ? 'activa' : ''}`} onClick={onClick}>
      <span className="persona-main">
        <span className="persona-nombre">{nombre}</span>
        {meta != null && <span className="persona-meta">{meta}</span>}
      </span>
      {derecha}
    </button>
  );
}

/**
 * La Fila de registro, una sola: fecha · concepto en la meta, y el valor
 * a la derecha en negrita. La misma en la ficha personal y en el registro
 * general: quien aprende una, aprendió todas.
 */
export function FilaRegistro({
  nombre,
  meta,
  valor,
  onClick,
}: {
  nombre: ReactNode;
  meta: ReactNode;
  valor: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="persona-fila" onClick={onClick}>
      <span className="persona-main">
        <span className="persona-nombre">{nombre}</span>
        <span className="persona-meta">{meta}</span>
      </span>
      <span className="fila-valor">{valor}</span>
    </button>
  );
}

/** Las Pestañas: píldoras; la activa, en gradiente oro. */
export function Pestanas<T extends string>({
  opciones,
  activa,
  onCambiar,
}: {
  opciones: readonly { id: T; etiqueta: ReactNode }[];
  activa: T;
  onCambiar: (id: T) => void;
}) {
  return (
    <div className="pestanas">
      {opciones.map((o) => (
        <button
          type="button"
          key={o.id}
          className={activa === o.id ? 'pestana activa' : 'pestana'}
          onClick={() => onCambiar(o.id)}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
