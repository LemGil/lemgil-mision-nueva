import { useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { asignarMinisterio, borrarMinisterio, marcarResponsableMinisterio, quitarDeMinisterio, renombrarMinisterio } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import { resumenMinisterios } from '../motor/ministerios';
import BarraVistas, { type Vista } from './BarraVistas';
import Modal from './Modal';
import BorrarBoton from './BorrarBoton';
import SelectorPersona from './SelectorPersona';
import GuiaPagina from './GuiaPagina';
import { FilaPersona } from './Piezas';

export default function Ministerios({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [personaNueva, setPersonaNueva] = useState('');
  const [error, setError] = useState('');
  const [vista, setVista] = useState<Vista>('lista');
  const [nuevoNombreMin, setNuevoNombreMin] = useState('');
  const [agruparPor, setAgruparPor] = useState('ministerio');

  const recargar = async () => setDatos(await aDatosMinisterio(repo));
  useEffect(() => {
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Todos los hooks van antes del retorno temprano: si este useEffect
  // quedara tras el «if (!datos)», React contaria un hook mas al cargar
  // los datos y la pagina entera caeria (error #310).
  useEffect(() => {
    setNuevoNombreMin(abierto ?? '');
  }, [abierto]);

  if (!datos) return <p className="cargando">Cargando…</p>;
  const ministerios = resumenMinisterios(datos);
  const detalleMin = abierto ? ministerios.find((m) => m.nombre === abierto) : undefined;
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
      <h1>⛪ Ministerios</h1>
      <GuiaPagina texto="Quién sirve en cada ministerio. Al asignar a un miembro, su escalera marca sola el paso de Sirviendo." />
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

      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[{ valor: 'ministerio', etiqueta: 'Ministerio' }]}
      />

      {vista === 'lista' && (
        <ul className="lista-personas">
          {ministerios.map((m) => (
            <li key={m.nombre}>
              <FilaPersona
                nombre={`🤲 ${m.nombre}`}
                meta={`${m.miembros.length} ${m.miembros.length === 1 ? 'persona' : 'personas'}`}
                onClick={() => setAbierto(m.nombre)}
              />
            </li>
          ))}
          {ministerios.length === 0 && <li className="tenue">Aún no hay ministerios con gente.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        ministerios.length === 0
          ? <p className="tenue">Aún no hay ministerios con gente.</p>
          : (
            <div className="tarjetas-grid">
              {ministerios.map((m) => (
                <button key={m.nombre} className="persona-card" onClick={() => setAbierto(m.nombre)}>
                  <span className="persona-nombre">🤲 {m.nombre}</span>
                  <span className="persona-meta">
                    {m.miembros.length} {m.miembros.length === 1 ? 'persona' : 'personas'}
                  </span>
                  {m.responsable && (
                    <span className="persona-meta">⭐ al frente: {m.responsable}</span>
                  )}
                  <span className="persona-meta">
                    {m.miembros.slice(0, 3).map((p) => p.nombre).join(', ')}
                    {m.miembros.length > 3 ? '…' : ''}
                  </span>
                </button>
              ))}
            </div>
          )
      )}
      {vista === 'agrupada' && (
        ministerios.length === 0
          ? <p className="tenue">Aún no hay ministerios con gente.</p>
          : ministerios.map((m) => (
              <div key={m.nombre}>
                <h3 className="grupo-titulo">🤲 {m.nombre} · {m.miembros.length}</h3>
                <ul className="lista-personas">
                  {m.miembros.map((p) => (
                    <li key={p.asignacionId}>
                      <FilaPersona nombre={p.nombre} onClick={() => setAbierto(m.nombre)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))
      )}

      {!mostrarForm && (
        <div className="form-acciones">
          <button className="btn btn-dorado" onClick={() => setMostrarForm(true)}>➕ Nuevo ministerio</button>
        </div>
      )}
      {mostrarForm && (
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
              setMostrarForm(false);
            }}
          >
            Crear y asignar
          </button>
        </div>
        <p className="tenue">Un ministerio nace con su primera persona; el resto se agrega dentro.</p>
              <div className="form-acciones">
          <button className="btn" onClick={() => setMostrarForm(false)}>Cerrar</button>
        </div>
      </section>
      )}

      {detalleMin && (
        <Modal onCerrar={() => setAbierto(null)}>
          <h2>🤲 {detalleMin.nombre}</h2>
          {error && <p className="aviso aviso-rojo">{error}</p>}
          <p className="tenue">
            {detalleMin.miembros.length} en el ministerio
            {detalleMin.responsable ? ` · ⭐ al frente: ${detalleMin.responsable}` : ' · sin nadie al frente'}
          </p>
          <div className="form-fila">
            <label>
              Nombre del ministerio
              <input value={nuevoNombreMin} onChange={(e) => setNuevoNombreMin(e.target.value)} />
            </label>
            <div className="form-acciones">
              <button
                type="button"
                className="btn"
                disabled={!nuevoNombreMin.trim() || nuevoNombreMin.trim() === detalleMin.nombre}
                onClick={async () => {
                  setError('');
                  try {
                    await renombrarMinisterio(repo, datos, detalleMin.nombre, nuevoNombreMin);
                    setAbierto(nuevoNombreMin.trim());
                    await recargar();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                }}
              >
                ✏️ Renombrar
              </button>
            </div>
          </div>
          <ul className="lista-personas">
            {detalleMin.miembros.map((p) => (
              <li key={p.asignacionId} className="persona-fila">
                <span className="persona-nombre">{p.nombre}</span>
                <button
                  type="button"
                  className="btn"
                  title={p.responsable ? 'Quitar del frente' : 'Poner al frente del ministerio'}
                  onClick={async () => {
                    await marcarResponsableMinisterio(
                      repo,
                      datos,
                      detalleMin.nombre,
                      p.responsable ? null : p.asignacionId,
                    );
                    await recargar();
                  }}
                >
                  {p.responsable ? '⭐ Al frente' : '☆ Al frente'}
                </button>
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
            {detalleMin.miembros.length === 0 && <li className="tenue">Sin personas todavía.</li>}
          </ul>
          <h3>Agregar a una persona</h3>
          <SelectorPersona
            datos={datos}
            excluir={new Set(detalleMin.miembros.map((p) => p.personaId))}
            onElegir={(id) => void asignar(detalleMin.nombre, id)}
          />
          <p className="tenue">Toca una persona de la lista para agregarla al momento.</p>

          <div className="form-acciones">
            <BorrarBoton
              texto="🗑️ Borrar este ministerio"
              titulo="Quita a toda su gente del ministerio"
              onBorrar={async () => {
                await borrarMinisterio(repo, datos, detalleMin.nombre);
                setAbierto(null);
                await recargar();
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
