import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import {
  actualizarAcademia,
  actualizarEncuentro,
  borrarAcademia,
  borrarEncuentro,
  borrarEstudiante,
  crearAcademia,
  crearEstudiante,
  registrarEncuentro,
} from '../datos/acciones';
import { nombresGruposDe } from '../motor/gruposVista';
import type { Repo } from '../datos/repo';
import type { Academia as AcademiaCat, DatosMinisterio, Encuentro } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, FilaAcciones, FilaPersona, FilaRegistro, Kpi, Pestanas, Tarjeta } from './Piezas';
import { buscarPersonas } from '../motor/personaVista';
import {
  concluidosDeAcademia,
  conclusionesDeEstudiante,
  encuentrosDeAcademia,
  encuentrosRecientes,
  nivelesDeAcademias,
  resumenAcademias,
} from '../motor/academia';

const hoyIso = () => new Date().toISOString().slice(0, 10);

type PestanaAcademia = 'estudiantes' | 'academias' | 'encuentros';

export default function Academia({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState<PestanaAcademia>('estudiantes');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [ver, setVer] = useState('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('zona');
  const recargar = useCallback(() => setRecargas((x) => x + 1), []);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const d = await aDatosMinisterio(repo);
      if (vivo) setDatos(d);
    })();
    return () => {
      vivo = false;
    };
  }, [repo, recargas]);

  if (!datos) return <p className="cargando">Cargando…</p>;

  const idsBuscadas = new Set(buscarPersonas(datos, busqueda).map((p) => p.id));
  const visibles = datos.estudiantes.filter(
    (e) => (ver === 'todos' || (ver === 'activos' ? e.estado === 'Activo' : e.estado !== 'Activo')) && idsBuscadas.has(e.personaId),
  );
  const activos = datos.estudiantes.filter((e) => e.estado === 'Activo').length;
  const resumenAc = resumenAcademias(datos);
  const personaDe = (id: string) => datos.personas.find((p) => p.id === id);

  const alternar = async (e: (typeof visibles)[number]) => {
    await repo.guardar('estudiantes', { ...e, estado: e.estado === 'Activo' ? 'Inactivo' : 'Activo' });
    recargar();
  };
  const claveGrupo = (e: (typeof visibles)[number]): string => {
    const p = personaDe(e.personaId);
    if (agruparPor === 'estado') return e.estado;
    if (agruparPor === 'grupo') {
      return (p ? nombresGruposDe(datos, p.id) : undefined) ?? 'Sin grupo';
    }
    return p?.zona?.trim() || 'Sin zona';
  };
  const filaEstudiante = (e: (typeof visibles)[number]) => {
    const p = personaDe(e.personaId);
    const concluidas = conclusionesDeEstudiante(datos, e.personaId).length;
    return (
      <li key={e.id}>
        <FilaAcciones
          nombre={`${p?.nombre} ${p?.apellidos ?? ''}`}
          meta={concluidas > 0 ? `🏁 Concluyó ${concluidas} academia(s)` : undefined}
          derecha={<span className={`chip ${e.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{e.estado}</span>}
          acciones={
            <>
              <button className="btn" onClick={() => void alternar(e)}>
                {e.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
              </button>
              <BorrarBoton
                texto="🗑️ Quitar"
                titulo="Borrar el registro de estudiante"
                onBorrar={async () => {
                await borrarEstudiante(repo, e.id);
                recargar();
                }}
              />
            </>
          }
        />
      </li>
    );
  };
  const tarjetaEstudiante = (e: (typeof visibles)[number]) => {
    const p = personaDe(e.personaId);
    const concluidas = conclusionesDeEstudiante(datos, e.personaId).length;
    return (
      <Tarjeta key={e.id} nombre={`${p?.nombre ?? ''} ${p?.apellidos ?? ''}`}>
        <span><span className={`chip ${e.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{e.estado}</span></span>
        <span className="persona-meta">{[p?.zona, p ? nombresGruposDe(datos, p.id) : undefined].filter(Boolean).join(' · ') || 'Sin zona ni grupo'}</span>
        {concluidas > 0 && <span className="persona-meta">🏁 Concluyó {concluidas} academia(s)</span>}
        <span>
          <button className="btn" onClick={() => void alternar(e)}>
            {e.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
          </button>{' '}
          <BorrarBoton
            texto="🗑️ Quitar"
            titulo="Borrar el registro de estudiante"
            onBorrar={async () => {
              await borrarEstudiante(repo, e.id);
              recargar();
            }}
          />
        </span>
      </Tarjeta>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="🎓 Academia">
        {pestana === 'estudiantes' && (
          <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo estudiante</button>
        )}
      </CabeceraPagina>
      <GuiaPagina texto="Los estudiantes de la Academia del Espíritu, el catálogo de academias por nivel y los encuentros donde cada academia se concluye." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <Pestanas
        opciones={[
          { id: 'estudiantes', etiqueta: `🎓 Estudiantes (${datos.estudiantes.length})` },
          { id: 'academias', etiqueta: `📚 Academias (${datos.academias.length})` },
          { id: 'encuentros', etiqueta: `🏁 Encuentros (${datos.encuentros.length})` },
        ]}
        activa={pestana}
        onCambiar={setPestana}
      />
      {pestana === 'estudiantes' && (
        <>
          <section className="kpis">
            <Kpi principal icono="🎓" numero={activos} titulo="Estudiantes activos" />
            <Kpi icono="○" numero={datos.estudiantes.length - activos} titulo="Inactivos" />
            <Kpi icono="📚" numero={datos.estudiantes.length} titulo="Total" />
            <Kpi icono="🏁" numero={resumenAc.conclusiones} titulo="Conclusiones" sub={`${resumenAc.alumnosConcluidos} alumno(s) concluyeron`} />
          </section>
          {mostrarForm && (
          <section className="tarjeta">
            <h2>➕ Nuevo estudiante</h2>
            <SelectorPersona
              datos={datos}
              excluir={new Set(datos.estudiantes.map((e) => e.personaId))}
              onElegir={async (personaId) => {
                setError('');
                try {
                  await crearEstudiante(repo, datos, personaId);
                  recargar();
                  setMostrarForm(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            />
                  <div className="form-acciones">
              <button className="btn" onClick={() => setMostrarForm(false)}>Cerrar</button>
            </div>
          </section>
          )}
          <Buscador>
            <input placeholder="🔍 Buscar estudiante…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </Buscador>
          <div className="vista-barra">
            <label>
              Ver{' '}
              <select value={ver} onChange={(e) => setVer(e.target.value)}>
                <option value="activos">Solo activos</option>
                <option value="inactivos">Inactivos</option>
                <option value="todos">Todos</option>
              </select>
            </label>
            <span className="tenue">{visibles.length} en la lista</span>
          </div>
          <BarraVistas
            vista={vista}
            setVista={setVista}
            agruparPor={agruparPor}
            setAgruparPor={setAgruparPor}
            opciones={[
              { valor: 'zona', etiqueta: 'Zona' },
              { valor: 'grupo', etiqueta: 'Grupo' },
              { valor: 'estado', etiqueta: 'Estado' },
            ]}
          />
          {vista === 'lista' && (
            <ul className="lista-personas">
              {visibles.map(filaEstudiante)}
              {visibles.length === 0 && <li className="tenue">Sin estudiantes para esta vista.</li>}
            </ul>
          )}
          {vista === 'tarjetas' && (
            visibles.length === 0
              ? <p className="tenue">Sin estudiantes para esta vista.</p>
              : <div className="tarjetas-grid">{visibles.map(tarjetaEstudiante)}</div>
          )}
          {vista === 'agrupada' && (
            visibles.length === 0
              ? <p className="tenue">Sin estudiantes para esta vista.</p>
              : agrupar(visibles, claveGrupo).map((g) => (
                  <div key={g.titulo}>
                    <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                    <ul className="lista-personas">{g.items.map(filaEstudiante)}</ul>
                  </div>
                ))
          )}
        </>
      )}
      {pestana === 'academias' && (
        <SeccionAcademias repo={repo} datos={datos} recargar={recargar} />
      )}
      {pestana === 'encuentros' && (
        <SeccionEncuentros repo={repo} datos={datos} recargar={recargar} />
      )}
    </div>
  );
}

/** El formulario de una academia del catálogo: nombre y nivel
 * (el nivel se elige de los ya en uso o se escribe uno nuevo). */
function FormAcademia({
  repo,
  datos,
  academia,
  onListo,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  academia?: AcademiaCat;
  onListo: () => void;
}) {
  const [nombre, setNombre] = useState(academia?.nombre ?? '');
  const [nivel, setNivel] = useState(academia?.nivel ?? '');
  const [error, setError] = useState('');
  const guardar = async () => {
    setError('');
    try {
      if (academia) await actualizarAcademia(repo, { ...academia, nombre, nivel });
      else await crearAcademia(repo, datos, { nombre, nivel });
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="tarjeta formulario">
      <h3>{academia ? '✏️ Editar academia' : '📚 Nueva academia'}</h3>
      <div className="form-fila">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Descodificando…" />
        </label>
        <label>
          Nivel
          <input value={nivel} onChange={(e) => setNivel(e.target.value)} placeholder="Nivel I" list="niveles-de-academias" />
          <datalist id="niveles-de-academias">
            {nivelesDeAcademias(datos).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
      </div>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <div className="form-acciones">
        <button className="btn btn-dorado" onClick={() => void guardar()}>💾 Guardar</button>
        <button className="btn" onClick={onListo}>Cancelar</button>
        {academia && (
          <BorrarBoton
            texto="🗑️ Borrar academia"
            titulo="Borra la academia del catálogo (solo si no tiene encuentros)"
            onBorrar={async () => {
              try {
                await borrarAcademia(repo, datos, academia.id);
                onListo();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

/** La pestaña Academias: el catálogo, ordenado por nivel y nombre;
 * tocar una la edita. */
function SeccionAcademias({
  repo,
  datos,
  recargar,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  recargar: () => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const academiaEditando =
    editando && editando !== 'nueva' ? datos.academias.find((a) => a.id === editando) : undefined;
  const ordenadas = datos.academias
    .slice()
    .sort((a, b) => a.nivel.localeCompare(b.nivel) || a.nombre.localeCompare(b.nombre));
  return (
    <>
      <div className="form-acciones">
        <button className="btn btn-dorado" onClick={() => setEditando(editando ? null : 'nueva')}>
          {editando ? '✕ Cerrar el formulario' : '➕ Nueva academia'}
        </button>
      </div>
      {editando && (
        <FormAcademia
          key={editando}
          repo={repo}
          datos={datos}
          academia={academiaEditando}
          onListo={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
      {ordenadas.length === 0 ? (
        <p className="tenue">Todavía no hay academias en el catálogo. Crea la primera con su nombre y su nivel.</p>
      ) : (
        <ul className="lista-personas">
          {ordenadas.map((a) => {
            const enc = encuentrosDeAcademia(datos, a.id).length;
            const conc = concluidosDeAcademia(datos, a.id).size;
            return (
              <li key={a.id}>
                <FilaPersona
                  nombre={a.nombre}
                  meta={`${a.nivel || 'Sin nivel'} · ${enc} encuentro(s) · ${conc} la concluyeron`}
                  onClick={() => setEditando(a.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** El formulario de un encuentro: la academia, la fecha y los
 * alumnos que lo recibieron (se eligen de los estudiantes). */
function FormEncuentro({
  repo,
  datos,
  encuentro,
  onListo,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  encuentro?: Encuentro;
  onListo: () => void;
}) {
  const [fecha, setFecha] = useState(encuentro?.fecha ?? hoyIso());
  const [academiaId, setAcademiaId] = useState(encuentro?.academiaId ?? datos.academias[0]?.id ?? '');
  const [alumnos, setAlumnos] = useState<string[]>(encuentro?.alumnoIds ?? []);
  const [error, setError] = useState('');
  const nombreDe = (id: string) => {
    const p = datos.personas.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : 'Persona borrada';
  };
  const idsEstudiantes = new Set(datos.estudiantes.map((e) => e.personaId));
  const excluir = new Set(
    datos.personas.filter((p) => !idsEstudiantes.has(p.id)).map((p) => p.id),
  );
  for (const id of alumnos) excluir.add(id);
  const guardar = async () => {
    setError('');
    try {
      if (encuentro) {
        await actualizarEncuentro(repo, { ...encuentro, fecha, academiaId, alumnoIds: alumnos });
      } else {
        await registrarEncuentro(repo, datos, { fecha, academiaId, alumnoIds: alumnos });
      }
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="tarjeta formulario">
      <h3>{encuentro ? '✏️ Corregir el encuentro' : '🏁 Nuevo encuentro'}</h3>
      <div className="form-fila">
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label>
          Academia
          <select value={academiaId} onChange={(e) => setAcademiaId(e.target.value)}>
            {datos.academias.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
                {a.nivel ? ` · ${a.nivel}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <p>
          <strong>🎓 Alumnos que recibieron el encuentro</strong>
        </p>
        {alumnos.map((id) => (
          <div className="form-fila" key={id}>
            <span>{nombreDe(id)}</span>
            <button
              type="button"
              className="btn"
              onClick={() => setAlumnos(alumnos.filter((x) => x !== id))}
            >
              ✕
            </button>
          </div>
        ))}
        <SelectorPersona
          datos={datos}
          excluir={excluir}
          onElegir={(id) => setAlumnos([...alumnos, id])}
          placeholder="Añadir alumno…"
        />
      </div>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <div className="form-acciones">
        <button className="btn btn-dorado" onClick={() => void guardar()}>💾 Guardar el encuentro</button>
        <button className="btn" onClick={onListo}>Cancelar</button>
        {encuentro && (
          <BorrarBoton
            texto="🗑️ Borrar encuentro"
            titulo="Borra el encuentro y las conclusiones que nacen de él"
            onBorrar={async () => {
              await borrarEncuentro(repo, encuentro.id);
              onListo();
            }}
          />
        )}
      </div>
    </div>
  );
}

/** La pestaña Encuentros: el historial de encuentros, del más
 * reciente al más viejo; tocar uno lo corrige. */
function SeccionEncuentros({
  repo,
  datos,
  recargar,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  recargar: () => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const lista = encuentrosRecientes(datos);
  const encuentroEditando =
    editando && editando !== 'nuevo' ? datos.encuentros.find((e) => e.id === editando) : undefined;
  if (datos.academias.length === 0) {
    return (
      <p className="tenue">
        Primero registra las academias en la pestaña Academias: cada encuentro es el cierre de una
        academia.
      </p>
    );
  }
  return (
    <>
      <div className="form-acciones">
        <button className="btn btn-dorado" onClick={() => setEditando(editando ? null : 'nuevo')}>
          {editando ? '✕ Cerrar el formulario' : '➕ Registrar encuentro'}
        </button>
      </div>
      {editando && (
        <FormEncuentro
          key={editando}
          repo={repo}
          datos={datos}
          encuentro={encuentroEditando}
          onListo={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
      {lista.length === 0 ? (
        <p className="tenue">Todavía no hay encuentros registrados.</p>
      ) : (
        <ul className="lista-personas">
          {lista.map((e) => {
            const a = datos.academias.find((x) => x.id === e.academiaId);
            return (
              <li key={e.id}>
                <FilaRegistro
                  fecha={e.fecha}
                  nombre={a?.nombre ?? 'Academia borrada'}
                  meta={a?.nivel || undefined}
                  valor={`${e.alumnoIds.length} alumno(s)`}
                  onClick={() => setEditando(e.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
