import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarMiembro, crearMiembro, registrarHito } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import { pasosDeMiembros } from '../modelo/catalogo';
import type { DatosMinisterio, EstadoMiembro } from '../modelo/tipos';
import { cumpleanosProximos } from '../motor/alertas';
import { escaleraDeMiembro, estaEnElPaso, tarjetasDeMiembros } from '../motor/miembros';
import { buscarPersonas } from '../motor/personaVista';
import SelectorPersona from './SelectorPersona';
import Modal from './Modal';

const hoyIso = () => new Date().toISOString().slice(0, 10);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ESTADOS: EstadoMiembro[] = ['Activo', 'Inactivo', 'Disciplinado', 'Trasladado', 'Fallecido'];

export default function Miembros({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [ano, setAno] = useState(0);
  const [mes, setMes] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPaso, setFiltroPaso] = useState('');
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hitoPaso, setHitoPaso] = useState('');
  const [hitoFecha, setHitoFecha] = useState(hoyIso());

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

  const tarjetas = tarjetasDeMiembros(datos, ano === 0 ? undefined : { ano, mes: mes === 0 ? undefined : mes });
  const personaDe = (id: string) => datos.personas.find((p) => p.id === id);
  const idsBuscados = new Set(buscarPersonas(datos, busqueda).map((p) => p.id));
  const lista = datos.miembros.filter((m) => {
    if (busqueda && !idsBuscados.has(m.personaId)) return false;
    // El Directorio abre SOLO con Activos; los demás estados, por el filtro.
    if (filtroEstado ? m.estado !== filtroEstado : m.estado !== 'Activo') return false;
    if (filtroPaso && !estaEnElPaso(datos, m, filtroPaso)) return false;
    return true;
  });
  const detalle = seleccionado ? datos.miembros.find((m) => m.id === seleccionado) : undefined;
  const escalera = detalle ? escaleraDeMiembro(datos, detalle) : null;
  const hitos = detalle ? datos.hitos.filter((h) => h.personaId === detalle.personaId) : [];
  const pasosManual = pasosDeMiembros(datos.pasos).filter((p) => p.fuente === 'manual');
  const enCasa = new Set(
    datos.miembros.filter((m) => ['Activo', 'Inactivo', 'Disciplinado'].includes(m.estado)).map((m) => m.personaId),
  );
  const cumples = cumpleanosProximos(datos, hoyIso()).filter((c) => enCasa.has(c.personaId));
  const anoActual = new Date().getFullYear();

  const tarjetasVista: [string, number][] = [
    ['Activos', tarjetas.activos], ['Inactivos', tarjetas.inactivos],
    ['Trasladados', tarjetas.trasladados], ['Fallecidos', tarjetas.fallecidos],
    ['Disciplinados', tarjetas.disciplinados], ['En Grupo', tarjetas.enGrupo],
    ['Diezmadores', tarjetas.diezmadores], ['En la Academia', tarjetas.enAcademia],
    ['Sirviendo', tarjetas.sirviendo], ['Hermano Mayor', tarjetas.hermanoMayor],
    ['Líderes', tarjetas.lideres],
  ];

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <h1>🏠 Miembros</h1>
      </header>
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <section className="tarjeta">
        <h2>➕ Nuevo miembro</h2>
        <p className="tenue">Solo personas registradas y que aún no sean miembros (bloqueo duro).</p>
        <SelectorPersona
          datos={datos}
          excluir={new Set(datos.miembros.map((m) => m.personaId))}
          onElegir={async (personaId) => {
            setError('');
            try {
              await crearMiembro(repo, datos, personaId, hoyIso());
              recargar();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </section>

      <div className="selector-periodo">
        <label>
          📅 Tarjetas:{' '}
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            <option value={0}>Foto completa</option>
            {[anoActual - 1, anoActual, anoActual + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Mes{' '}
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} disabled={ano === 0}>
            <option value={0}>Todo el año</option>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </label>
        {ano !== 0 && <span className="tenue">la foto de los que ingresaron en el período</span>}
      </div>

      <section className="kpis">
        {tarjetasVista.map(([titulo, valor]) => (
          <div className="kpi" key={titulo}>
            <span className="kpi-numero">{valor}</span>
            <span className="kpi-titulo">{titulo}</span>
          </div>
        ))}
      </section>

      <div className="buscador">
        <input placeholder="🔍 Buscar en el Directorio…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Solo Activos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select value={filtroPaso} onChange={(e) => setFiltroPaso(e.target.value)}>
          <option value="">🪜 Están en: todos</option>
          {pasosDeMiembros(datos.pasos).map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} Están en: {p.nombre}</option>
          ))}
          <option value="completa">🏁 Escalera completa</option>
        </select>
        <span className="tenue">{lista.length} en el Directorio</span>
      </div>

      <ul className="lista-personas">
        {lista.map((m) => {
          const p = personaDe(m.personaId);
          const esc = escaleraDeMiembro(datos, m);
          return (
            <li key={m.id}>
              <button className={`persona-fila ${seleccionado === m.id ? 'activa' : ''}`} onClick={() => setSeleccionado(m.id)}>
                <span className="persona-nombre">{p?.nombre} {p?.apellidos ?? ''}</span>
                <span className="persona-meta">
                  {m.estado} · escalera {esc.cumplidos}/{esc.total}
                  {esc.actual ? ` · le falta ${esc.actual.nombre}` : ' · completa'}
                </span>
              </button>
            </li>
          );
        })}
        {lista.length === 0 && <li className="tenue">Sin miembros para este filtro.</li>}
      </ul>

      {detalle && escalera && (
        <Modal onCerrar={() => setSeleccionado(null)}>
          <h2>{personaDe(detalle.personaId)?.nombre} {personaDe(detalle.personaId)?.apellidos ?? ''}</h2>
          <div className="franja">
            {escalera.estados.map((e) => (
              <span key={e.paso.id} className={`franja-paso ${e.cumplido ? 'paso-hecho' : 'paso-falta'}`}>
                {e.cumplido ? '✓' : '○'} {e.paso.emoji} {e.paso.nombre}
              </span>
            ))}
          </div>
          <div className="form-fila">
            <label>
              Estado
              <select
                value={detalle.estado}
                onChange={async (e) => {
                  await actualizarMiembro(repo, { ...detalle, estado: e.target.value as EstadoMiembro });
                  recargar();
                }}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </label>
            <label>
              Grupo
              <select
                value={detalle.grupoId ?? ''}
                onChange={async (e) => {
                  await actualizarMiembro(repo, { ...detalle, grupoId: e.target.value || null });
                  recargar();
                }}
              >
                <option value="">Sin grupo</option>
                {datos.grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </label>
          </div>

          <h3>Hitos</h3>
          {hitos.length === 0 ? (
            <p className="tenue">Sin hitos registrados.</p>
          ) : (
            <ul className="historial">
              {hitos.map((h) => (
                <li key={h.id}>
                  {h.fecha ?? ''} · {h.tipo ?? datos.pasos.find((p) => p.id === h.pasoId)?.nombre ?? 'Hito'}
                </li>
              ))}
            </ul>
          )}
          <div className="form-fila">
            <label>
              Paso (se registra como hito)
              <select value={hitoPaso} onChange={(e) => setHitoPaso(e.target.value)}>
                <option value="">Elegir…</option>
                {pasosManual.map((p) => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Fecha
              <input type="date" value={hitoFecha} onChange={(e) => setHitoFecha(e.target.value)} />
            </label>
            <div className="form-acciones">
              <button
                className="btn"
                disabled={!hitoPaso}
                onClick={async () => {
                  await registrarHito(repo, { personaId: detalle.personaId, pasoId: hitoPaso, fecha: hitoFecha });
                  setHitoPaso('');
                  recargar();
                }}
              >
                ➕ Registrar hito
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cumples.length > 0 && (
        <section className="tarjeta">
          <h2>🎂 Cumpleaños de miembros (30 días)</h2>
          <ul className="alerta-lista">
            {cumples.map((c) => (
              <li key={c.personaId}>
                {c.nombre} · {c.diaMes} · {c.dias === 0 ? '¡hoy!' : c.dias === 1 ? 'mañana' : `en ${c.dias} días`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
