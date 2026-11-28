import { useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import {
  actualizarMinisterio,
  asignarMinisterio,
  borrarMinisterio,
  crearMinisterio,
  fijarResponsableMinisterio,
  quitarDeMinisterio,
} from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import { resumenMinisterios, type MinisterioVista } from '../motor/ministerios';
import BarraVistas, { type Vista } from './BarraVistas';
import Modal from './Modal';
import BorrarBoton from './BorrarBoton';
import SelectorPersona from './SelectorPersona';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, FilaAcciones, FilaPersona, Kpi, TarjetaPersona } from './Piezas';
import { coincideBusqueda } from '../motor/personaVista';

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** '2026-11-29' → '29 nov 2026', como la columna de fecha de la fila única. */
const fechaCorta = (iso: string) =>
  `${iso.slice(8, 10)} ${MESES_CORTO[Number(iso.slice(5, 7)) - 1] ?? ''} ${iso.slice(0, 4)}`;

export default function Ministerios({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<MinisterioVista | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('ministerio');

  const recargar = async () => setDatos(await aDatosMinisterio(repo));
  useEffect(() => {
    void recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!datos) return <p className="cargando">Cargando…</p>;
  const todosMinisterios = resumenMinisterios(datos);
  const ministerios = todosMinisterios.filter((m) =>
    coincideBusqueda(busqueda, m.nombre, m.mision, m.responsable, ...m.miembros.map((x) => x.nombre)),
  );
  const detalleMin = abierto ? todosMinisterios.find((m) => m.nombre === abierto) : undefined;
  const sirviendo = new Set(datos.asignaciones.map((a) => a.personaId));
  const conResponsable = todosMinisterios.filter((m) => m.responsable).length;

  const asignar = async (ministerio: string, personaId: string) => {
    setError('');
    try {
      await asignarMinisterio(repo, datos, { personaId, ministerio });
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo asignar.');
    }
  };

  const metaDe = (m: MinisterioVista) =>
    [
      `${m.miembros.length} ${m.miembros.length === 1 ? 'persona' : 'personas'}`,
      m.responsable ? `⭐ al frente: ${m.responsable}` : null,
      m.inicio ? `desde el ${fechaCorta(m.inicio)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <div>
      <CabeceraPagina titulo="⛪ Ministerios">
        <button
          className="btn btn-dorado"
          onClick={() => {
            setEditando(null);
            setMostrarForm((v) => !v);
          }}
        >
          ➕ Nuevo ministerio
        </button>
      </CabeceraPagina>
      <GuiaPagina texto="Cada ministerio con su ficha: su misión, quién está al frente como responsable y su gente. Aquí nadie es líder: somos servidores." />
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <section className="kpis">
        <Kpi icono="⛪" numero={todosMinisterios.length} titulo="Ministerios" />
        <Kpi icono="🤝" numero={sirviendo.size} titulo="Personas sirviendo" />
        <Kpi icono="⭐" numero={conResponsable} titulo="Con responsable" />
      </section>

      <Buscador>
        <input placeholder="🔍 Buscar ministerio o persona…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </Buscador>
      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[{ valor: 'ministerio', etiqueta: 'Ministerio' }]}
      />

      {(mostrarForm || editando) && (
        <FormMinisterio
          key={editando ? editando.nombre : 'nuevo'}
          repo={repo}
          datos={datos}
          vista={editando ?? undefined}
          onGuardado={async (nombreFinal) => {
            setMostrarForm(false);
            setEditando(null);
            await recargar();
            setAbierto(nombreFinal);
          }}
          onCancelar={() => {
            setMostrarForm(false);
            setEditando(null);
          }}
        />
      )}

      {vista === 'lista' && (
        <ul className="lista-personas">
          {ministerios.map((m) => (
            <li key={m.nombre}>
              <FilaPersona
                nombre={`🤲 ${m.nombre}`}
                meta={metaDe(m)}
                onClick={() => setAbierto(m.nombre)}
              />
            </li>
          ))}
          {ministerios.length === 0 && <li className="tenue">Aún no hay ministerios.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        ministerios.length === 0
          ? <p className="tenue">Aún no hay ministerios.</p>
          : (
            <div className="tarjetas-grid">
              {ministerios.map((m) => (
                <TarjetaPersona key={m.nombre} nombre={`🤲 ${m.nombre}`} onClick={() => setAbierto(m.nombre)}>
                  <span className="persona-meta">
                    {m.responsable ? `⭐ Al frente: ${m.responsable}` : 'Sin nadie al frente'}
                  </span>
                  {m.mision && (
                    <span className="persona-meta">
                      {m.mision.length > 110 ? `${m.mision.slice(0, 110)}…` : m.mision}
                    </span>
                  )}
                  <span className="persona-meta">{metaDe(m)}</span>
                  {m.miembros.length > 0 && (
                    <span className="persona-meta">
                      {m.miembros.slice(0, 3).map((p) => p.nombre).join(', ')}
                      {m.miembros.length > 3 ? '…' : ''}
                    </span>
                  )}
                </TarjetaPersona>
              ))}
            </div>
          )
      )}
      {vista === 'agrupada' && (
        ministerios.length === 0
          ? <p className="tenue">Aún no hay ministerios.</p>
          : ministerios.map((m) => (
              <div key={m.nombre}>
                <h3 className="grupo-titulo">🤲 {m.nombre} · {m.miembros.length}</h3>
                <ul className="lista-personas">
                  {m.miembros.map((p) => (
                    <li key={p.asignacionId}>
                      <FilaPersona nombre={p.nombre} onClick={() => setAbierto(m.nombre)} />
                    </li>
                  ))}
                  {m.miembros.length === 0 && <li className="tenue">Sin personas todavía.</li>}
                </ul>
              </div>
            ))
      )}

      {detalleMin && (
        <Modal onCerrar={() => setAbierto(null)}>
          <h2>🤲 {detalleMin.nombre}</h2>
          {error && <p className="aviso aviso-rojo">{error}</p>}
          <p className="tenue">
            {detalleMin.miembros.length} en el ministerio
            {detalleMin.responsable ? ` · ⭐ al frente: ${detalleMin.responsable}` : ' · sin nadie al frente'}
            {detalleMin.inicio ? ` · desde el ${fechaCorta(detalleMin.inicio)}` : ''}
          </p>
          {detalleMin.mision && <p>{detalleMin.mision}</p>}
          {!detalleMin.ministerioId && (
            <p className="tenue">
              Este ministerio aún no tiene su ficha registrada: al editarlo le agregas su
              inicio, su misión y su responsable.
            </p>
          )}
          <div className="form-acciones">
            <button
              type="button"
              className="btn btn-dorado"
              onClick={() => {
                setEditando(detalleMin);
                setMostrarForm(false);
                setAbierto(null);
              }}
            >
              ✏️ Editar la ficha
            </button>
          </div>
          <ul className="lista-personas">
            {detalleMin.miembros.map((p) => (
              <li key={p.asignacionId}>
                <FilaAcciones
                  nombre={p.responsable ? `${p.nombre} ⭐` : p.nombre}
                  acciones={
                    <>
                      <button
                        type="button"
                        className="btn"
                        title={p.responsable ? 'Quitar del frente' : 'Poner al frente del ministerio'}
                        onClick={async () => {
                          await fijarResponsableMinisterio(
                            repo,
                            datos,
                            detalleMin.nombre,
                            p.responsable ? null : p.personaId,
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
                    </>
                  }
                />
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
              titulo="Quita a toda su gente del ministerio y borra su ficha"
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

/** El formulario de la ficha del ministerio: nombre, inicio o
 * formación, la misión que tendrá, quién está al frente como
 * responsable y sus participantes. Si el ministerio ya vivía en
 * asignaciones sin ficha, guardarlo lo adopta en el catálogo. */
function FormMinisterio({
  repo,
  datos,
  vista,
  onGuardado,
  onCancelar,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  vista?: MinisterioVista;
  onGuardado: (nombreFinal: string) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(vista?.nombre ?? '');
  const [inicio, setInicio] = useState(vista?.inicio ?? '');
  const [mision, setMision] = useState(vista?.mision ?? '');
  const [responsableId, setResponsableId] = useState<string | null>(vista?.responsableId ?? null);
  const [participantes, setParticipantes] = useState<string[]>(
    vista?.miembros.map((m) => m.personaId) ?? [],
  );
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const nombreDe = (id: string) => {
    const p = datos.personas.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : '—';
  };

  const guardar = async () => {
    setError('');
    setGuardando(true);
    try {
      if (vista?.ministerioId) {
        await actualizarMinisterio(
          repo,
          datos,
          {
            id: vista.ministerioId,
            nombre,
            inicio: inicio || undefined,
            mision,
            responsableId,
          },
          participantes,
        );
      } else {
        await crearMinisterio(repo, datos, {
          nombre,
          inicio,
          mision,
          responsableId,
          participanteIds: participantes,
        });
      }
      onGuardado(nombre.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="tarjeta formulario">
      <h2>{vista ? 'Editar ministerio' : 'Nuevo ministerio'}</h2>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <div className="form-fila">
        <label>
          Nombre del ministerio
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          Inicio o formación
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
      </div>
      <label>
        Misión que tendrá
        <textarea
          value={mision}
          onChange={(e) => setMision(e.target.value)}
          rows={3}
          placeholder="¿Qué hará este ministerio?"
        />
      </label>
      <h3>Al frente (responsable)</h3>
      {responsableId ? (
        <p>
          ⭐ {nombreDe(responsableId)}{' '}
          <button type="button" className="btn" onClick={() => setResponsableId(null)}>
            ✕ Quitar
          </button>
        </p>
      ) : (
        <SelectorPersona datos={datos} onElegir={setResponsableId} />
      )}
      <p className="tenue">El responsable queda también como participante al guardar.</p>
      <h3>Participantes</h3>
      {participantes.length > 0 && (
        <ul className="lista-personas">
          {participantes.map((id) => (
            <li key={id}>
              <FilaAcciones
                nombre={nombreDe(id)}
                acciones={
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setParticipantes(participantes.filter((x) => x !== id))}
                  >
                    ✕
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <SelectorPersona
        datos={datos}
        excluir={new Set(participantes)}
        onElegir={(id) => setParticipantes([...participantes, id])}
      />
      <div className="form-acciones">
        <button className="btn" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-dorado"
          disabled={!nombre.trim() || guardando}
          onClick={() => void guardar()}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </section>
  );
}
