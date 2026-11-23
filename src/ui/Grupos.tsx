import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarGrupo, borrarGrupo, crearGrupo } from '../datos/acciones';
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
import { Buscador, CabeceraPagina, FilaPersona, Kpi, TarjetaPersona } from './Piezas';
import { coincideBusqueda } from '../motor/personaVista';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';
import { conteoPorPasoDelGrupo, estadoGrupo, liderVisible, lineaReunion, porcentajeCapacidad } from '../motor/gruposVista';

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

export default function Grupos({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('');
  const [liderId, setLiderId] = useState<string | null>(null);
  const [liderTexto, setLiderTexto] = useState('');
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
  const miembrosDe = (grupoId: string) => {
    const ids = new Set<string>();
    for (const m of datos.miembros) if (m.grupoId === grupoId) ids.add(m.personaId);
    for (const p of datos.personas) if (p.grupoId === grupoId) ids.add(p.id);
    // En el grupo solo salen los que están: apartados, traslados y
    // fallecidos (las bajas) no se listan ni se cuentan.
    return [...ids]
      .filter((id) => !esPersonaBaja(id))
      .map((id) => personaDe(id))
      .filter(Boolean);
  };
  const detalle = seleccionado ? datos.grupos.find((g) => g.id === seleccionado) : undefined;
  const conGrupo = new Set<string>();
  for (const m of datos.miembros) if (m.grupoId) conGrupo.add(m.personaId);
  for (const p of datos.personas) if (p.grupoId) conGrupo.add(p.id);
  for (const id of [...conGrupo]) if (esPersonaBaja(id)) conGrupo.delete(id);

  const visibles = datos.grupos.filter((g) =>
    coincideBusqueda(busqueda, g.nombre, g.zona, g.lugar, liderVisible(datos, g)),
  );
  const claveGrupo = (g: (typeof datos.grupos)[number]): string => {
    if (agruparPor === 'lider') {
      const l = g.liderId ? personaDe(g.liderId) : undefined;
      return l ? `${l.nombre} ${l.apellidos ?? ''}`.trim() : 'Sin líder';
    }
    return g.zona?.trim() || 'Sin zona';
  };
  const filaGrupo = (g: (typeof datos.grupos)[number]) => {
    const lider = liderVisible(datos, g);
    const reunion = lineaReunion(g);
    return (
      <li key={g.id}>
        <FilaPersona
          nombre={`🏠 ${g.nombre}`}
          meta={<>{miembrosDe(g.id).length} personas{lider ? ` · 👤 ${lider}` : ''}{reunion ? ` · ${reunion}` : ''}{g.lat != null ? ' · 📍 en el mapa' : ''}</>}
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
        nombre={`🏠 ${g.nombre}`}
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
      <GuiaPagina texto="Los grupos de la congregación, con su líder, su reunión y su capacidad. Cada persona pertenece a un solo grupo." />
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
          <label>Líder (texto libre)<input value={liderTexto} onChange={(e) => setLiderTexto(e.target.value)} placeholder="Ej.: Pastores Luis y Daymi" /></label>
          <label>Capacidad<input type="number" min={0} value={capacidad} onChange={(e) => setCapacidad(e.target.value)} /></label>
        </div>
        <div className="form-fila">
          <label>Día de reunión<input value={dia} onChange={(e) => setDia(e.target.value)} list="dias-semana" /></label>
          <label>Hora<input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
        </div>
        <div className="form-fila">
          <label>Lugar de reunión<input value={lugar} onChange={(e) => setLugar(e.target.value)} list="lugares-grupo" /></label>
        </div>
        <datalist id="dias-semana">{DIAS_SEMANA.map((d) => <option key={d} value={d} />)}</datalist>
        <datalist id="lugares-grupo">{[...new Set(datos.grupos.map((g) => g.lugar).filter(Boolean))].map((l) => <option key={l} value={l} />)}</datalist>
        <p className="tenue">Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin elegir'}</p>
        <SelectorPersona datos={datos} onElegir={setLiderId} placeholder="🔍 Buscar al líder…" />
        <div className="form-acciones">
          <button
            className="btn btn-dorado"
            disabled={!nombre.trim()}
            onClick={async () => {
              setError('');
              try {
                await crearGrupo(repo, {
                nombre: nombre.trim(),
                zona: zona.trim() || undefined,
                liderId,
                liderTexto: liderTexto.trim() || undefined,
                dia: dia.trim() || undefined,
                hora: hora.trim() || undefined,
                lugar: lugar.trim() || undefined,
                capacidad: capacidadNumero(capacidad),
              });
                setNombre(''); setZona(''); setLiderId(null); setLiderTexto(''); setDia(''); setHora(''); setLugar(''); setCapacidad('');
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
        ]}
      />
      {vista === 'lista' && (
        <ul className="lista-personas">
          {visibles.map(filaGrupo)}
          {visibles.length === 0 && <li className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        visibles.length === 0
          ? <p className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</p>
          : <div className="tarjetas-grid">{visibles.map(tarjetaGrupo)}</div>
      )}
      {vista === 'agrupada' && (
        visibles.length === 0
          ? <p className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</p>
          : agrupar(visibles, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaGrupo)}</ul>
              </div>
            ))
      )}

      {detalle && (
        <Modal onCerrar={() => setSeleccionado(null)}>
          <h2>🏠 {detalle.nombre}</h2>
          <p>
            <span className={`chip ${estadoGrupo(miembrosDe(detalle.id).length, detalle.capacidad).clase}`}>
              {estadoGrupo(miembrosDe(detalle.id).length, detalle.capacidad).etiqueta}
            </span>
          </p>
          <StatsGrupo datos={datos} grupo={detalle} miembros={miembrosDe(detalle.id)} />
          <h3>En el grupo</h3>
          {miembrosDe(detalle.id).length === 0 ? (
            <p className="tenue">Nadie asignado todavía (se asigna desde Miembros o desde la ficha).</p>
          ) : (
            <ul className="historial">
              {miembrosDe(detalle.id).map((p) => (
                <li key={p!.id}>{p!.nombre} {p!.apellidos ?? ''}</li>
              ))}
            </ul>
          )}

          <FormEditarGrupo
            key={detalle.id}
            repo={repo}
            datos={datos}
            grupo={detalle}
            onGuardado={recargar}
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
}: {
  repo: Repo;
  datos: DatosMinisterio;
  grupo: Grupo;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [zona, setZona] = useState(grupo.zona ?? '');
  const [liderId, setLiderId] = useState<string | null>(grupo.liderId ?? null);
  const [liderTexto, setLiderTexto] = useState(grupo.liderTexto ?? '');
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
      <p className="tenue">
        Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin líder'}
      </p>
      <div className="form-fila">
        <label>
          Líder (texto libre)
          <input value={liderTexto} onChange={(e) => { setLiderTexto(e.target.value); tocar(); }} placeholder="Ej.: Pastores Luis y Daymi" />
        </label>
        <label>
          Capacidad
          <input type="number" min={0} value={capacidad} onChange={(e) => { setCapacidad(e.target.value); tocar(); }} />
        </label>
      </div>
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
      <SelectorPersona
        datos={datos}
        onElegir={(id) => { setLiderId(id); tocar(); }}
        placeholder="🔍 Cambiar el líder…"
      />
      <div className="form-acciones">
        <button
          className="btn btn-dorado"
          disabled={!nombre.trim()}
          onClick={async () => {
            setError('');
            setGuardado(false);
            try {
              await actualizarGrupo(repo, {
                ...grupo,
                nombre: nombre.trim(),
                zona: zona.trim() || undefined,
                liderId,
                liderTexto: liderTexto.trim() || undefined,
                dia: dia.trim() || undefined,
                hora: hora.trim() || undefined,
                lugar: lugar.trim() || undefined,
                capacidad: capacidadNumero(capacidad),
              });
              setGuardado(true);
              onGuardado();
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
