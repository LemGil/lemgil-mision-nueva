import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarGrupo, agregarAGrupo, borrarGrupo, crearGrupo, quitarDeGrupo } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { clasificarPersona } from '../motor/censo';
import { esBaja } from '../motor/vistas';
import type { Grupo, Persona } from '../modelo/tipos';
import { InputZona } from './CamposLista';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';

import Modal from './Modal';
import { Buscador, CabeceraPagina, FilaAcciones, FilaPersona, Kpi, TarjetaPersona } from './Piezas';
import { coincideBusqueda } from '../motor/personaVista';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';
import { claveTipoGrupo, conteoPorPasoDelGrupo, esIglesia, estadoGrupo, grupoDeTipo, hijosDe, iconoGrupo, idsGruposDe, idsMiembrosDeGrupo, liderVisible, lineaReunion, ordenarGruposPorFamilia, padreDe, porcentajeCapacidad, tipoVisibleGrupo, tiposDeGrupoEnUso } from '../motor/gruposVista';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const capacidadNumero = (s: string): number | undefined => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** El cuerpo rico del grupo (el de la foto de la app de siempre):
 * zona y líder, la reunión, el conteo por paso de la ruta y la barra
 * de capacidad. Lo usan la tarjeta y la ventana del grupo. */
function StatsGrupo({ datos, grupo, miembros }: { datos: DatosMinisterio; grupo: Grupo; miembros: (Persona | undefined)[] }) {
  const total = miembros.length;
  const conteos = conteoPorPasoDelGrupo(datos, new Set(miembros.map((p) => p!.id)));
  const lider = liderVisible(datos, grupo);
  const reunion = lineaReunion(grupo);
  return (
    <>
      <span className="persona-meta">
        {grupo.tipo ? `🏷️ ${grupo.tipo} · ` : ''}
        {grupo.zona ? `📍 ${grupo.zona}` : '📍 Sin zona'}
        {lider ? ` · 👤 ${lider}` : ''}
        {grupo.lat != null ? ' · 📍 en el mapa' : ''}
      </span>
      {reunion && <span className="persona-meta">🏠 {reunion}</span>}
      <span className="grupo-stats">
        {conteos.map((c) => (
          <span key={c.paso.id} className="grupo-stat">
            <b>{c.n}</b>
            <small>{c.paso.emoji} {c.corto}</small>
          </span>
        ))}
      </span>
      <span className="persona-meta">
        Total asignados <strong>{total}{grupo.capacidad ? ` / ${grupo.capacidad}` : ''}</strong>
      </span>
      {grupo.capacidad ? (
        <span className="barra-capacidad">
          <span style={{ width: `${porcentajeCapacidad(total, grupo.capacidad)}%` }} />
        </span>
      ) : null}
    </>
  );
}

/** La sección de miembros del formulario del grupo: los que están,
 * con su ✕ para quitar, y el buscador para agregar. El aviso de
 * movimiento salta solo si la persona ya está en otro grupo DEL
 * MISMO tipo que el del formulario (su Iglesia no estorba a su Oikos). */
function SeccionMiembros({
  datos,
  seleccion,
  onCambiar,
  tipoTexto,
  grupoActualId,
}: {
  datos: DatosMinisterio;
  seleccion: string[];
  onCambiar: (ids: string[]) => void;
  tipoTexto: string;
  grupoActualId?: string;
}) {
  const personaDe = (id: string) => datos.personas.find((x) => x.id === id);
  const claveNueva = claveTipoGrupo({ tipo: tipoTexto } as Grupo);
  // La regla acordada de las listas: apartados, traslados y fallecidos
  // no salen — ni en la lista ni en el buscador para agregar.
  const idsBajas = new Set(
    datos.personas.filter((per) => esBaja(clasificarPersona(datos, per.id).clase)).map((per) => per.id),
  );
  return (
    <>
      <h3>👥 Miembros del grupo</h3>
      {seleccion.length === 0 ? (
        <p className="tenue">Nadie todavía: busca y agrega a los hermanos.</p>
      ) : (
        <ul className="lista-personas">
          {seleccion.map((id) => {
            const per = personaDe(id);
            const otro = grupoDeTipo(datos, id, claveNueva);
            const aviso = otro && otro.id !== grupoActualId ? otro : undefined;
            return (
              <li key={id}>
                <FilaAcciones
                  nombre={per ? `${per.nombre} ${per.apellidos ?? ''}` : id}
                  meta={aviso ? `⚠ Está en ${aviso.nombre} (mismo tipo): al guardar pasará a este grupo` : undefined}
                  acciones={
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onCambiar(seleccion.filter((x) => x !== id))}
                    >
                      ✕ Quitar
                    </button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      <SelectorPersona
        datos={datos}
        excluir={new Set([...seleccion, ...idsBajas])}
        onElegir={(id) => onCambiar([...seleccion, id])}
        placeholder="🔍 Agregar un miembro…"
      />
    </>
  );
}

export default function Grupos({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [miembrosSel, setMiembrosSel] = useState<string[]>([]);
  const [padreId, setPadreId] = useState('');
  const [zona, setZona] = useState('');
  const [liderId, setLiderId] = useState<string | null>(null);
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
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
  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);
  const esPersonaBaja = (personaId: string) =>
    esBaja(clasificarPersona(datos, personaId).clase);
  const miembrosDe = (grupoId: string) =>
    // En el grupo solo salen los que están: apartados, traslados y
    // fallecidos (las bajas) no se listan ni se cuentan.
    idsMiembrosDeGrupo(datos, grupoId)
      .filter((id) => !esPersonaBaja(id))
      .map((id) => personaDe(id))
      .filter(Boolean);
  const detalle = seleccionado ? datos.grupos.find((g) => g.id === seleccionado) : undefined;
  const padreDetalle = detalle ? padreDe(datos, detalle) : undefined;
  const hijosDetalle = detalle ? hijosDe(datos, detalle.id) : [];
  const conGrupo = new Set<string>();
  for (const p of datos.personas) if (idsGruposDe(datos, p.id).length > 0) conGrupo.add(p.id);
  for (const id of [...conGrupo]) if (esPersonaBaja(id)) conGrupo.delete(id);

  const visibles = datos.grupos.filter((g) =>
    coincideBusqueda(busqueda, g.nombre, g.zona, g.lugar, liderVisible(datos, g)),
  );
  const visiblesFamilia = ordenarGruposPorFamilia(datos, visibles);
  const claveGrupo = (g: (typeof datos.grupos)[number]): string => {
    if (agruparPor === 'lider') {
      const l = g.liderId ? personaDe(g.liderId) : undefined;
      return l ? `${l.nombre} ${l.apellidos ?? ''}`.trim() : 'Sin líder';
    }
    if (agruparPor === 'tipo') return tipoVisibleGrupo(g);
    return g.zona?.trim() || 'Sin zona';
  };
  const filaGrupo = (g: (typeof datos.grupos)[number]) => {
    const lider = liderVisible(datos, g);
    const reunion = lineaReunion(g);
    const esHijo = !!padreDe(datos, g);
    return (
      <li key={g.id} style={esHijo ? { marginLeft: 24 } : undefined}>
        <FilaPersona
          nombre={`${esHijo ? '↳ ' : ''}${iconoGrupo(g)} ${g.nombre}`}
          meta={<>{g.tipo ? `${g.tipo} · ` : ''}{miembrosDe(g.id).length} personas{lider ? ` · 👤 ${lider}` : ''}{reunion ? ` · ${reunion}` : ''}{g.lat != null ? ' · 📍 en el mapa' : ''}</>}
          activa={seleccionado === g.id}
          onClick={() => setSeleccionado(g.id)}
        />
      </li>
    );
  };
  const tarjetaGrupo = (g: (typeof datos.grupos)[number]) => {
    const miembros = miembrosDe(g.id);
    const est = estadoGrupo(miembros.length, g.capacidad);
    return (
      <TarjetaPersona
        key={g.id}
        nombre={`${iconoGrupo(g)} ${g.nombre}`}
        derecha={<span className={`chip ${est.clase}`}>{est.etiqueta}</span>}
        onClick={() => setSeleccionado(g.id)}
      >
        <StatsGrupo datos={datos} grupo={g} miembros={miembros} />
      </TarjetaPersona>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="🧑‍🤝‍🧑 Grupos">
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo grupo</button>
      </CabeceraPagina>
      <GuiaPagina texto="Los grupos de la congregación, con su tipo, su líder, su reunión y su capacidad. Una persona puede estar en un grupo de cada tipo: su Iglesia y su Oikos." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <Kpi principal icono="🧑‍🤝‍🧑" numero={datos.grupos.length} titulo="Grupos" />
        <Kpi icono="👥" numero={conGrupo.size} titulo="Personas en grupos" />
      </section>

      {mostrarForm && (
      <section className="tarjeta formulario">
        <h2>➕ Nuevo grupo</h2>
        <div className="form-fila">
          <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label>Zona<InputZona datos={datos} value={zona} onChange={setZona} /></label>
        </div>
        <div className="form-fila">
          <label>Tipo<input value={tipo} onChange={(e) => setTipo(e.target.value)} list="tipos-grupo" placeholder="Ej.: Iglesia, Oikos" /></label>
          <label>Capacidad<input type="number" min={0} value={capacidad} onChange={(e) => setCapacidad(e.target.value)} /></label>
        </div>
        {claveTipoGrupo({ tipo } as Grupo) === 'oikos' && (
          <div className="form-fila">
            <label>
              Su Iglesia
              <select value={padreId} onChange={(e) => setPadreId(e.target.value)}>
                <option value="">Sin Iglesia asignada</option>
                {datos.grupos.filter((g) => esIglesia(g)).map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="form-fila">
          <label>Día de reunión<input value={dia} onChange={(e) => setDia(e.target.value)} list="dias-semana" /></label>
          <label>Hora<input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
        </div>
        <div className="form-fila">
          <label>Lugar de reunión<input value={lugar} onChange={(e) => setLugar(e.target.value)} list="lugares-grupo" /></label>
        </div>
        <datalist id="dias-semana">{DIAS_SEMANA.map((d) => <option key={d} value={d} />)}</datalist>
        <datalist id="lugares-grupo">{[...new Set(datos.grupos.map((g) => g.lugar).filter(Boolean))].map((l) => <option key={l} value={l} />)}</datalist>
        <datalist id="tipos-grupo">{[...new Set(['Iglesia', 'Oikos', ...tiposDeGrupoEnUso(datos).map((t) => t.nombre)])].filter((t) => t !== 'Sin tipo').map((t) => <option key={t} value={t} />)}</datalist>
        <h3>👤 Líder</h3>
        <p className="tenue">
          Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin elegir'}
          {liderId && (
            <button type="button" className="btn" onClick={() => setLiderId(null)}>✕ Quitar</button>
          )}
        </p>
        <SelectorPersona datos={datos} onElegir={setLiderId} placeholder="🔍 Buscar al líder…" />
        <SeccionMiembros datos={datos} seleccion={miembrosSel} onCambiar={setMiembrosSel} tipoTexto={tipo} />
        <div className="form-acciones">
          <button
            className="btn btn-dorado"
            disabled={!nombre.trim()}
            onClick={async () => {
              setError('');
              try {
                const creado = await crearGrupo(repo, {
                nombre: nombre.trim(),
                tipo: tipo.trim() || undefined,
                padreId: claveTipoGrupo({ tipo } as Grupo) === 'oikos' ? padreId || undefined : undefined,
                zona: zona.trim() || undefined,
                liderId,
                dia: dia.trim() || undefined,
                hora: hora.trim() || undefined,
                lugar: lugar.trim() || undefined,
                capacidad: capacidadNumero(capacidad),
              });
                for (const pid of miembrosSel) await agregarAGrupo(repo, datos, pid, creado);
                setNombre(''); setTipo(''); setPadreId(''); setMiembrosSel([]); setZona(''); setLiderId(null); setDia(''); setHora(''); setLugar(''); setCapacidad('');
              setMostrarForm(false);
                recargar();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            💾 Crear grupo
          </button>
        </div>
              <div className="form-acciones">
          <button className="btn" onClick={() => setMostrarForm(false)}>Cerrar</button>
        </div>
      </section>
      )}

      <Buscador>
        <input placeholder="🔍 Buscar grupo, zona o líder…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </Buscador>
      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[
          { valor: 'zona', etiqueta: 'Zona' },
          { valor: 'lider', etiqueta: 'Líder' },
          { valor: 'tipo', etiqueta: 'Tipo' },
        ]}
      />
      {vista === 'lista' && (
        <ul className="lista-personas">
          {visiblesFamilia.map(filaGrupo)}
          {visibles.length === 0 && <li className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        visibles.length === 0
          ? <p className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</p>
          : <div className="tarjetas-grid">{visiblesFamilia.map(tarjetaGrupo)}</div>
      )}
      {vista === 'agrupada' && (
        visibles.length === 0
          ? <p className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</p>
          : agrupar(visiblesFamilia, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaGrupo)}</ul>
              </div>
            ))
      )}

      {detalle && (
        <Modal onCerrar={() => setSeleccionado(null)}>
          <h2>{iconoGrupo(detalle)} {detalle.nombre}</h2>
          <p>
            <span className={`chip ${estadoGrupo(miembrosDe(detalle.id).length, detalle.capacidad).clase}`}>
              {estadoGrupo(miembrosDe(detalle.id).length, detalle.capacidad).etiqueta}
            </span>
          </p>
          <StatsGrupo datos={datos} grupo={detalle} miembros={miembrosDe(detalle.id)} />
          {padreDetalle && (
            <>
              <h3>Su Iglesia</h3>
              <ul className="lista-personas">
                <li>
                  <FilaPersona
                    nombre={`🏠 ${padreDetalle.nombre}`}
                    meta="La Iglesia de la que es parte este Oikos"
                    onClick={() => setSeleccionado(padreDetalle.id)}
                  />
                </li>
              </ul>
            </>
          )}
          {hijosDetalle.length > 0 && (
            <>
              <h3>🏡 Sus Oikos</h3>
              <ul className="lista-personas">
                {hijosDetalle.map((h) => (
                  <li key={h.id}>
                    <FilaPersona
                      nombre={`🏡 ${h.nombre}`}
                      meta={`${miembrosDe(h.id).length} personas`}
                      onClick={() => setSeleccionado(h.id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          <FormEditarGrupo
            key={detalle.id}
            repo={repo}
            datos={datos}
            grupo={detalle}
            onGuardado={recargar}
            onCerrar={() => setSeleccionado(null)}
          />
          <div className="form-acciones">
            <BorrarBoton
              texto="🗑️ Borrar grupo"
              onBorrar={async () => {
                await borrarGrupo(repo, datos, detalle.id);
                setSeleccionado(null);
                recargar();
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

/** El formulario de edición del grupo: nace con los datos del grupo
 * (el padre lo monta con key = id del grupo, así cada grupo abre con
 * SUS datos, sin efectos de sincronía) y confirma al guardar. */
function FormEditarGrupo({
  repo,
  datos,
  grupo,
  onGuardado,
  onCerrar,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  grupo: Grupo;
  onGuardado: () => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [tipo, setTipo] = useState(grupo.tipo ?? '');
  const [padreId, setPadreId] = useState(grupo.padreId ?? '');
  const [miembrosSel, setMiembrosSel] = useState<string[]>(() =>
    idsMiembrosDeGrupo(datos, grupo.id).filter((id) => !esBaja(clasificarPersona(datos, id).clase)),
  );
  const [zona, setZona] = useState(grupo.zona ?? '');
  const [liderId, setLiderId] = useState<string | null>(grupo.liderId ?? null);
  const [dia, setDia] = useState(grupo.dia ?? '');
  const [hora, setHora] = useState(grupo.hora ?? '');
  const [lugar, setLugar] = useState(grupo.lugar ?? '');
  const [capacidad, setCapacidad] = useState(grupo.capacidad ? String(grupo.capacidad) : '');
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');
  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);
  const tocar = () => setGuardado(false);
  return (
    <>
      <h3>✏️ Editar grupo</h3>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      {guardado && <p className="aviso aviso-verde">✓ Cambios guardados.</p>}
      <div className="form-fila">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => { setNombre(e.target.value); tocar(); }} />
        </label>
        <label>
          Zona
          <InputZona datos={datos} value={zona} onChange={(v) => { setZona(v); tocar(); }} />
        </label>
      </div>
      <div className="form-fila">
        <label>
          Tipo
          <input value={tipo} onChange={(e) => { setTipo(e.target.value); tocar(); }} list="tipos-grupo" placeholder="Ej.: Iglesia, Oikos" />
        </label>
        <label>
          Capacidad
          <input type="number" min={0} value={capacidad} onChange={(e) => { setCapacidad(e.target.value); tocar(); }} />
        </label>
      </div>
      {claveTipoGrupo({ tipo } as Grupo) === 'oikos' && (
        <div className="form-fila">
          <label>
            Su Iglesia
            <select value={padreId} onChange={(e) => { setPadreId(e.target.value); tocar(); }}>
              <option value="">Sin Iglesia asignada</option>
              {datos.grupos.filter((g) => esIglesia(g) && g.id !== grupo.id).map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <h3>👤 Líder</h3>
      <p className="tenue">
        Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin líder'}
        {liderId && (
          <button type="button" className="btn" onClick={() => { setLiderId(null); tocar(); }}>✕ Quitar</button>
        )}
      </p>
      <SelectorPersona
        datos={datos}
        onElegir={(id) => { setLiderId(id); tocar(); }}
        placeholder="🔍 Cambiar el líder…"
      />
      <div className="form-fila">
        <label>
          Día de reunión
          <input value={dia} onChange={(e) => { setDia(e.target.value); tocar(); }} list="dias-semana" />
        </label>
        <label>
          Hora
          <input type="time" value={hora} onChange={(e) => { setHora(e.target.value); tocar(); }} />
        </label>
      </div>
      <div className="form-fila">
        <label>
          Lugar de reunión
          <input value={lugar} onChange={(e) => { setLugar(e.target.value); tocar(); }} list="lugares-grupo" />
        </label>
      </div>
      <datalist id="dias-semana">{DIAS_SEMANA.map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="lugares-grupo">{[...new Set(datos.grupos.map((g) => g.lugar).filter(Boolean))].map((l) => <option key={l} value={l} />)}</datalist>
      <SeccionMiembros datos={datos} seleccion={miembrosSel} onCambiar={(ids) => { setMiembrosSel(ids); tocar(); }} tipoTexto={tipo} grupoActualId={grupo.id} />
      <div className="form-acciones">
        <button
          className="btn btn-dorado"
          disabled={!nombre.trim()}
          onClick={async () => {
            setError('');
            setGuardado(false);
            try {
              const actualizado = {
                ...grupo,
                nombre: nombre.trim(),
                tipo: tipo.trim() || undefined,
                padreId: claveTipoGrupo({ tipo } as Grupo) === 'oikos' ? padreId || undefined : undefined,
                zona: zona.trim() || undefined,
                liderId,
                liderTexto: undefined,
                dia: dia.trim() || undefined,
                hora: hora.trim() || undefined,
                lugar: lugar.trim() || undefined,
                capacidad: capacidadNumero(capacidad),
              };
              await actualizarGrupo(repo, actualizado);
              const iniciales = idsMiembrosDeGrupo(datos, grupo.id).filter(
                (id) => !esBaja(clasificarPersona(datos, id).clase),
              );
              for (const id of miembrosSel) {
                if (!iniciales.includes(id)) await agregarAGrupo(repo, datos, id, actualizado);
              }
              for (const id of iniciales) {
                if (!miembrosSel.includes(id)) await quitarDeGrupo(repo, datos, id, grupo.id);
              }
              onGuardado();
              onCerrar();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          💾 Guardar cambios
        </button>
      </div>
    </>
  );
}
