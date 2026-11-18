import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { crearGrupo } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import Modal from './Modal';

export default function Grupos({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('');
  const [liderId, setLiderId] = useState<string | null>(null);
  const [error, setError] = useState('');
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
  const miembrosDe = (grupoId: string) => {
    const ids = new Set<string>();
    for (const m of datos.miembros) if (m.grupoId === grupoId) ids.add(m.personaId);
    for (const p of datos.personas) if (p.grupoId === grupoId) ids.add(p.id);
    return [...ids].map((id) => personaDe(id)).filter(Boolean);
  };
  const detalle = seleccionado ? datos.grupos.find((g) => g.id === seleccionado) : undefined;
  const conGrupo = new Set<string>();
  for (const m of datos.miembros) if (m.grupoId) conGrupo.add(m.personaId);
  for (const p of datos.personas) if (p.grupoId) conGrupo.add(p.id);

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>🏠 Grupos</h1></header>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <div className="kpi kpi-principal"><span className="kpi-numero">{datos.grupos.length}</span><span className="kpi-titulo">Grupos</span></div>
        <div className="kpi"><span className="kpi-numero">{conGrupo.size}</span><span className="kpi-titulo">Personas en grupos</span></div>
      </section>

      <section className="tarjeta formulario">
        <h2>➕ Nuevo grupo</h2>
        <div className="form-fila">
          <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label>Zona<input value={zona} onChange={(e) => setZona(e.target.value)} /></label>
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
                recargar();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            💾 Crear grupo
          </button>
        </div>
      </section>

      <ul className="lista-personas">
        {datos.grupos.map((g) => (
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
        ))}
        {datos.grupos.length === 0 && <li className="tenue">Sin grupos todavía.</li>}
      </ul>

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
        </Modal>
      )}
    </div>
  );
}
