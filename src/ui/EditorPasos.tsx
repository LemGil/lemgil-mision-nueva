import { useState } from 'react';
import { borrarPasoAccion, crearPaso, moverPaso, renombrarPaso } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { AmbitoPaso, DatosMinisterio, Paso } from '../modelo/tipos';
import {
  pasosDelAmbito,
  puedeBorrarPaso,
  puedeMover,
  usoDelPaso,
} from '../motor/pasosEditar';
import BorrarBoton from './BorrarBoton';
import Modal from './Modal';

/** La ventana para editar los pasos de un ámbito (Misión o Miembros):
 * nombre, emoji y orden de cada paso, pasos nuevos y bajas — con las
 * protecciones del modelo: lo protegido y lo que está en uso no se
 * borra, y en Misión el inicio, el gozne y las salidas no se mueven. */
export default function EditorPasos({
  datos,
  repo,
  ambito,
  onCerrar,
  recargar,
}: {
  datos: DatosMinisterio;
  repo: Repo;
  ambito: AmbitoPaso;
  onCerrar: () => void;
  recargar: () => void;
}) {
  const [error, setError] = useState('');
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState('');
  const lista = pasosDelAmbito(datos.pasos, ambito);

  const actuar = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const agregar = async () => {
    await actuar(async () => {
      await crearPaso(repo, datos, ambito, nuevoNombre, nuevoEmoji);
      setNuevoNombre('');
      setNuevoEmoji('');
      setMostrarNuevo(false);
    });
  };

  return (
    <Modal onCerrar={onCerrar}>
      <h2>{ambito === 'mision' ? '⚙️ Pasos de Misión' : '⚙️ Escalera de Miembros'}</h2>
      <p className="tenue">
        {ambito === 'mision'
          ? 'El nombre y el emoji se cambian sin tocar los registros: todo cuelga del paso, no de su nombre. Solo se mueven los pasos del camino; el inicio, el gozne y las salidas guardan su lugar.'
          : 'El nombre y el emoji se cambian sin tocar los registros. La escalera entera se puede reordenar; los peldaños que se cumplen solos no se borran.'}
      </p>
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <ul className="pasos-lista">
        {lista.map((p, i) => (
          <FilaPasoEditor
            key={`${p.id}:${p.nombre}:${p.emoji}`}
            paso={p}
            datos={datos}
            esPrimeroMovible={i === 0 || !puedeMover(lista[i - 1])}
            esUltimoMovible={i === lista.length - 1 || !puedeMover(lista[i + 1])}
            onGuardar={(nombre, emoji) => actuar(() => renombrarPaso(repo, datos, p, nombre, emoji))}
            onMover={(dir) => actuar(() => moverPaso(repo, datos, p, dir))}
            onBorrar={() => actuar(() => borrarPasoAccion(repo, datos, p))}
          />
        ))}
      </ul>

      <div className="form-acciones">
        <button type="button" className="btn btn-dorado" onClick={() => setMostrarNuevo((v) => !v)}>
          ➕ Nuevo paso
        </button>
      </div>
      {mostrarNuevo && (
        <div className="form-grid">
          <label>
            Emoji
            <input value={nuevoEmoji} onChange={(e) => setNuevoEmoji(e.target.value)} placeholder="•" />
          </label>
          <label>
            Nombre del paso
            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre…" />
          </label>
          <div className="form-acciones">
            <button type="button" className="btn btn-dorado" onClick={() => void agregar()}>
              Agregar
            </button>
            <button type="button" className="btn" onClick={() => setMostrarNuevo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function FilaPasoEditor({
  paso,
  datos,
  esPrimeroMovible,
  esUltimoMovible,
  onGuardar,
  onMover,
  onBorrar,
}: {
  paso: Paso;
  datos: DatosMinisterio;
  esPrimeroMovible: boolean;
  esUltimoMovible: boolean;
  onGuardar: (nombre: string, emoji: string) => Promise<void>;
  onMover: (dir: -1 | 1) => Promise<void>;
  onBorrar: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(paso.nombre);
  const [emoji, setEmoji] = useState(paso.emoji);
  const sucio = nombre.trim() !== paso.nombre || emoji.trim() !== paso.emoji;
  const movible = puedeMover(paso);
  const borrado = puedeBorrarPaso(datos, paso);
  const uso = usoDelPaso(datos, paso);
  const funcion =
    paso.ambito === 'mision'
      ? paso.rol === 'inicio'
        ? 'inicio'
        : paso.rol === 'gozne'
          ? 'gozne'
          : paso.rol === 'salida'
            ? 'salida'
            : 'camino'
      : paso.fuente === 'manual'
        ? 'manual'
        : 'se cumple solo';

  return (
    <li className="paso-fila-editor">
      <input
        className="paso-emoji"
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        aria-label={`Emoji de ${paso.nombre}`}
      />
      <input
        className="paso-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        aria-label={`Nombre de ${paso.nombre}`}
      />
      <span className="chip chip-gris">
        {funcion}
        {paso.protegido ? ' 🔒' : ''}
        {uso > 0 ? ` · ${uso} en uso` : ''}
      </span>
      <button
        type="button"
        className="btn"
        title="Subir un lugar"
        disabled={!movible || esPrimeroMovible}
        onClick={() => void onMover(-1)}
      >
        ▲
      </button>
      <button
        type="button"
        className="btn"
        title="Bajar un lugar"
        disabled={!movible || esUltimoMovible}
        onClick={() => void onMover(1)}
      >
        ▼
      </button>
      {sucio && (
        <button type="button" className="btn btn-dorado" onClick={() => void onGuardar(nombre, emoji)}>
          ✓ Guardar
        </button>
      )}
      {borrado.ok ? (
        <BorrarBoton texto="🗑️" titulo={`Borrar el paso ${paso.nombre}`} onBorrar={onBorrar} />
      ) : (
        <span className="tenue" title={borrado.motivo}>
          no se borra
        </span>
      )}
    </li>
  );
}
