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

/** La tarjeta única (vista de tarjetas): el caparazón de la fila en
 * grande — nombre fuerte arriba, a la derecha el chip si lo lleva, y
 * el contenido debajo. Es botón: tocarla abre el detalle. */
export function TarjetaPersona({
  nombre,
  derecha,
  onClick,
  children,
}: {
  nombre: ReactNode;
  derecha?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <button type="button" className="persona-card" onClick={onClick}>
      {derecha ? (
        <span className="tarjeta-cabecera">
          <span className="persona-nombre">{nombre}</span>
          {derecha}
        </span>
      ) : (
        <span className="persona-nombre">{nombre}</span>
      )}
      {children}
    </button>
  );
}

/** La tarjeta que no es botón: lleva botones de acción dentro
 * (Academia, Evangelismos). El mismo caparazón, en div. */
export function Tarjeta({ nombre, children }: { nombre: ReactNode; children?: ReactNode }) {
  return (
    <div className="persona-card">
      <span className="persona-nombre">{nombre}</span>
      {children}
    </div>
  );
}

/** El KPI único de las cabeceras: número grande, título y sub. */
export function Kpi({
  numero,
  titulo,
  sub,
  principal,
}: {
  numero: ReactNode;
  titulo: ReactNode;
  sub?: ReactNode;
  principal?: boolean;
}) {
  return (
    <div className={`kpi${principal ? ' kpi-principal' : ''}`}>
      <span className="kpi-numero">{numero}</span>
      <span className="kpi-titulo">{titulo}</span>
      {sub !== undefined && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

/** La lista editable única de las ventanas (historiales, hitos,
 * aportes, entregas): cada registro se corrige en su propia fila. */
export function ListaEdicion({ children }: { children: ReactNode }) {
  return <ul className="historial-edit">{children}</ul>;
}

/** La fila editable: la misma cáscara en todas las mesas; dentro
 * van los campos propios de cada registro. */
export function FilaEdicion({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

/** Los datos de una ficha en ventana: etiqueta tenue y valor, en la
 * tabla única de datos. */
export function DatosLista({ filas }: { filas: [string, string][] }) {
  return (
    <table className="tabla-datos">
      <tbody>
        {filas.map(([etiqueta, valor]) => (
          <tr key={etiqueta}>
            <td className="tenue">{etiqueta}</td>
            <td>{valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** La cabecera única de página: el título a la izquierda y, a la
 * derecha, el estado de la página o su acción principal. Toda
 * página abre con esta pieza. */
export function CabeceraPagina({ titulo, children }: { titulo: ReactNode; children?: ReactNode }) {
  return (
    <header className="panel-cabecera">
      <h1>{titulo}</h1>
      {children}
    </header>
  );
}

/** El buscador único de las listas: el campo de búsqueda y, a su
 * lado, los filtros propios de cada mesa. */
export function Buscador({ children }: { children: ReactNode }) {
  return <div className="buscador">{children}</div>;
}
