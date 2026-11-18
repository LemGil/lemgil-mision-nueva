import { useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { asignarMinisterio, quitarDeMinisterio } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import { resumenMinisterios } from '../motor/ministerios';
import Modal from './Modal';
import SelectorPersona from './SelectorPersona';

export default function Ministerios({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [personaNueva, setPersonaNueva] = useState('');
  const [error, setError] = useState('');

  const recargar = async () => setDatos(await aDatosMinisterio(repo));
  useEffect(() => {
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!datos) return <p className="cargando">Cargando…</p>;
  const ministerios = resumenMinisterios(datos);
  const vista = abierto ? ministerios.find((m) => m.nombre === abierto) : undefined;
  const sirviendo = new Set(datos.asignaciones.map((a) => a.personaId));
  const nombreDe = (id: string) => {
    const p = datos.personas.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : '—';
  };

  const asignar = async (ministerio: string, personaId: string) => {
    setError('');
    try {
      await asignarMinisterio(repo, datos, { personaId, ministerio });
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo asignar.');
    }
  };

  return (
    <div>
      <h1>🤲 Ministerios</h1>
      <p className="tenue">
        Cada ministerio con su gente. Al asignar a una persona, su escalera de Miembros marca el
        paso de servir sola.
      </p>
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <section className="kpis">
        <div className="kpi">
          <div className="kpi-numero">{ministerios.length}</div>
          <div className="kpi-titulo">Ministerios</div>
        </div>
        <div className="kpi">
          <div className="kpi-numero">{sirviendo.size}</div>
          <div className="kpi-titulo">Personas sirviendo</div>
        </div>
      </section>

      <ul className="lista-personas">
        {ministerios.map((m) => (
          <li key={m.nombre}>
            <button className="persona-fila" onClick={() => setAbierto(m.nombre)}>
              <span className="persona-nombre">🤲 {m.nombre}</span>
              <span className="tenue">
                {m.miembros.length} {m.miembros.length === 1 ? 'persona' : 'personas'}
              </span>
            </button>
          </li>
        ))}
        {ministerios.length === 0 && <li className="tenue">Aún no hay ministerios con gente.</li>}
      </ul>

      <section className="tarjeta formulario">
        <h2>Nuevo ministerio</h2>
        <div className="form-fila">
          <label>
            Nombre del ministerio
            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
          </label>
        </div>
        <SelectorPersona datos={datos} onElegir={setPersonaNueva} />
        {personaNueva && <p className="tenue">Primera persona: {nombreDe(personaNueva)}</p>}
        <div className="form-acciones">
          <button
            type="button"
            className="btn btn-dorado"
            disabled={!nuevoNombre.trim() || !personaNueva}
            onClick={async () => {
              await asignar(nuevoNombre, personaNueva);
              setNuevoNombre('');
              setPersonaNueva('');
            }}
          >
            Crear y asignar
          </button>
        </div>
        <p className="tenue">Un ministerio nace con su primera persona; el resto se agrega dentro.</p>
      </section>

      {vista && (
        <Modal onCerrar={() => setAbierto(null)}>
          <h2>🤲 {vista.nombre}</h2>
          {error && <p className="aviso aviso-rojo">{error}</p>}
          <ul className="lista-personas">
            {vista.miembros.map((p) => (
              <li key={p.asignacionId} className="persona-fila">
                <span className="persona-nombre">{p.nombre}</span>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await quitarDeMinisterio(repo, p.asignacionId);
                    await recargar();
                  }}
                >
                  Quitar
                </button>
              </li>
            ))}
            {vista.miembros.length === 0 && <li className="tenue">Sin personas todavía.</li>}
          </ul>
          <h3>Agregar a una persona</h3>
          <SelectorPersona
            datos={datos}
            excluir={new Set(vista.miembros.map((p) => p.personaId))}
            onElegir={(id) => void asignar(vista.nombre, id)}
          />
          <p className="tenue">Toca una persona de la lista para agregarla al momento.</p>
        </Modal>
      )}
    </div>
  );
}
