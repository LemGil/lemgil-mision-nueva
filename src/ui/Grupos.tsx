import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarGrupo, borrarGrupo, crearGrupo } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { clasificarPersona } from '../motor/censo';
import { esBaja } from '../motor/vistas';
import type { Grupo } from '../modelo/tipos';
import { InputZona } from './CamposLista';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';

import Modal from './Modal';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';

export default function Grupos({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('');
  const [liderId, setLiderId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
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

  const claveGrupo = (g: (typeof datos.grupos)[number]): string => {
    if (agruparPor === 'lider') {
      const l = g.liderId ? personaDe(g.liderId) : undefined;
      return l ? `${l.nombre} ${l.apellidos ?? ''}`.trim() : 'Sin líder';
    }
    return g.zona?.trim() || 'Sin zona';
  };
  const filaGrupo = (g: (typeof datos.grupos)[number]) => (
    <li key={g.id}>
      <button className={`persona-fila ${seleccionado === g.id ? 'activa' : ''}`} onClick={() => setSeleccionado(g.id)}>
        <span className="persona-nombre">🏠 {g.nombre}</span>
        <span className="persona-meta">
          {miembrosDe(g.id).length} personas
          {g.liderId ? ` · líder ${personaDe(g.liderId)?.nombre ?? ''}` : ''}
          {g.lat != null ? ' · 📍 en el mapa' : ''}
        </span>
      </button>
    </li>
  );
  const tarjetaGrupo = (g: (typeof datos.grupos)[number]) => (
    <button key={g.id} className="persona-card" onClick={() => setSeleccionado(g.id)}>
      <span className="persona-nombre">🏠 {g.nombre}</span>
      <span className="persona-meta">{miembrosDe(g.id).length} personas{g.zona ? ` · Zona ${g.zona}` : ''}</span>
      <span className="persona-meta">
        {g.liderId ? `Líder: ${personaDe(g.liderId)?.nombre ?? ''} ${personaDe(g.liderId)?.apellidos ?? ''}` : 'Sin líder'}
        {g.lat != null ? ' · 📍 en el mapa' : ''}
      </span>
    </button>
  );

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>🏠 Grupos</h1></header>
      <GuiaPagina texto="Los grupos de la congregación, con su líder y su zona. Cada persona pertenece a un solo grupo." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <div className="kpi kpi-principal"><span className="kpi-numero">{datos.grupos.length}</span><span className="kpi-titulo">Grupos</span></div>
        <div className="kpi"><span className="kpi-numero">{conGrupo.size}</span><span className="kpi-titulo">Personas en grupos</span></div>
      </section>

      {!mostrarForm && (
        <div className="form-acciones">
          <button className="btn btn-dorado" onClick={() => setMostrarForm(true)}>➕ Nuevo grupo</button>
        </div>
      )}
      {mostrarForm && (
      <section className="tarjeta formulario">
        <h2>➕ Nuevo grupo</h2>
        <div className="form-fila">
          <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label>Zona<InputZona datos={datos} value={zona} onChange={setZona} /></label>
        </div>
        <p className="tenue">Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin elegir'}</p>
        <SelectorPersona datos={datos} onElegir={setLiderId} placeholder="🔍 Buscar al líder…" />
        <div className="form-acciones">
          <button
            className="btn btn-dorado"
            disabled={!nombre.trim()}
            onClick={async () => {
              setError('');
              try {
                await crearGrupo(repo, { nombre: nombre.trim(), zona: zona.trim() || undefined, liderId });
                setNombre(''); setZona(''); setLiderId(null);
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
          {datos.grupos.map(filaGrupo)}
          {datos.grupos.length === 0 && <li className="tenue">Sin grupos todavía.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        datos.grupos.length === 0
          ? <p className="tenue">Sin grupos todavía.</p>
          : <div className="tarjetas-grid">{datos.grupos.map(tarjetaGrupo)}</div>
      )}
      {vista === 'agrupada' && (
        datos.grupos.length === 0
          ? <p className="tenue">Sin grupos todavía.</p>
          : agrupar(datos.grupos, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaGrupo)}</ul>
              </div>
            ))
      )}

      {detalle && (
        <Modal onCerrar={() => setSeleccionado(null)}>
          <h2>🏠 {detalle.nombre}</h2>
          <p className="tenue">
            {detalle.zona && <>Zona {detalle.zona} · </>}
            {detalle.liderId && <>Líder: {personaDe(detalle.liderId)?.nombre} {personaDe(detalle.liderId)?.apellidos ?? ''}</>}
          </p>
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
