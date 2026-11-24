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

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** La fila de registro única (constitución §4), como en la
 * muestra: la fecha en su columna —el día en negrita y el mes—,
 * el nombre y el concepto, y el valor a la derecha en negrita.
 * Idéntica en la ficha personal y en el registro general: si un
 * día mejora, mejoran los dos sitios a la vez. */
export function FilaRegistro({
  fecha,
  nombre,
  meta,
  valor,
  onClick,
}: {
  fecha: string;
  nombre: ReactNode;
  meta?: ReactNode;
  valor: string;
  onClick: () => void;
}) {
  const dia = fecha.slice(8, 10);
  const mes = MESES_CORTO[Number(fecha.slice(5, 7)) - 1] ?? '';
  return (
    <button type="button" className="persona-fila" onClick={onClick}>
      <span className="fila-fecha">
        <b>{dia}</b>
        {mes}
      </span>
      <span className="persona-main">
        <span className="persona-nombre">{nombre}</span>
        {meta != null && <span className="persona-meta">{meta}</span>}
      </span>
      <span className="fila-valor">{valor}</span>
    </button>
  );
}

/** Las Pestañas: píldoras; la activa, en petróleo. */
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
/** La fila con acciones: la misma fila de la lista única (nombre
 * fuerte, meta tenue, valor o chip a la derecha) con su zona de
 * botones al final, para las listas que trabajan sin abrir la ficha
 * (avanzar, editar o borrar ahí mismo). Con onClick, la zona
 * principal abre; sin onClick, la fila solo se mira y mandan sus
 * botones. Nace en la Fase 1 del plan de conformidad (2026-11-21):
 * una sola forma de listar, también con botones. */
export function FilaAcciones({
  nombre,
  meta,
  derecha,
  acciones,
  activa,
  onClick,
}: {
  nombre: ReactNode;
  meta?: ReactNode;
  derecha?: ReactNode;
  acciones?: ReactNode;
  activa?: boolean;
  onClick?: () => void;
}) {
  const principal = (
    <>
      <span className="persona-nombre">{nombre}</span>
      {meta != null && <span className="persona-meta">{meta}</span>}
    </>
  );
  return (
    <div className={`persona-fila${activa ? ' activa' : ''}`}>
      {onClick ? (
        <button type="button" className="persona-main" onClick={onClick}>
          {principal}
        </button>
      ) : (
        <span className="persona-main">{principal}</span>
      )}
      {derecha}
      {acciones}
    </div>
  );
}

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

/** El KPI único de las cabeceras, como en la muestra: su icono,
 * el número grande (el dinero, más pequeño y en petróleo), la
 * etiqueta en mayúsculas tenues y el sub si lo lleva. */
export function Kpi({
  numero,
  titulo,
  sub,
  principal,
  icono,
  dinero,
  onClick,
}: {
  numero: ReactNode;
  titulo: ReactNode;
  sub?: ReactNode;
  principal?: boolean;
  icono?: ReactNode;
  dinero?: boolean;
  onClick?: () => void;
}) {
  const contenido = (
    <>
      {icono !== undefined && (
        <span className="kpi-icono" aria-hidden="true">{icono}</span>
      )}
      <span className="kpi-numero">{numero}</span>
      <span className="kpi-titulo">{titulo}</span>
      {sub !== undefined && <span className="kpi-sub">{sub}</span>}
    </>
  );
  const clase = `kpi${principal ? ' kpi-principal' : ''}${dinero ? ' kpi-dinero' : ''}${onClick ? ' kpi-boton' : ''}`;
  return onClick ? (
    <button type="button" className={clase} onClick={onClick}>
      {contenido}
    </button>
  ) : (
    <div className={clase}>{contenido}</div>
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

/** Los datos de una ficha en ventana, como en la muestra: cada
 * dato en su fila —la etiqueta tenue a la izquierda y el valor en
 * negrita a la derecha, separados por la línea punteada. */
export function DatosLista({ filas }: { filas: [string, string][] }) {
  return (
    <div className="datos-lista">
      {filas.map(([etiqueta, valor]) => (
        <div className="dato" key={etiqueta}>
          <span>{etiqueta}</span>
          <b>{valor}</b>
        </div>
      ))}
    </div>
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
