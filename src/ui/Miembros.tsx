import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarHito, actualizarMiembro, asignarGrupos, borrarHito, borrarMiembro, crearMiembro, registrarHito } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import { pasosDeMiembros } from '../modelo/catalogo';
import type { DatosMinisterio, EstadoMiembro } from '../modelo/tipos';
import { cumpleanosProximos } from '../motor/alertas';
import { escaleraDeMiembro, estaEnElPaso, tarjetasDeMiembros } from '../motor/miembros';
import { buscarPersonas } from '../motor/personaVista';
import { idsGruposDe, nombresGruposDe } from '../motor/gruposVista';
import CamposGrupos from './CamposGrupos';
import { agrupar } from '../motor/vistas';
import { anosConRegistros, mesesConRegistros } from '../motor/periodos';

import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';
import SelectorPersona from './SelectorPersona';
import Modal from './Modal';
import GuiaPagina from './GuiaPagina';
import EditorPasos from './EditorPasos';
import { Buscador, CabeceraPagina, FilaEdicion, FilaPersona, Kpi, ListaEdicion, TarjetaPersona } from './Piezas';

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
  const [mostrarForm, setMostrarForm] = useState(false);
  const [hitoPaso, setHitoPaso] = useState('');
  const [hitoFecha, setHitoFecha] = useState(hoyIso());
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('grupo');

  const recargar = useCallback(() => setRecargas((x) => x + 1), []);
  const [editandoPasos, setEditandoPasos] = useState(false);
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
  const fechasMiembros = datos.miembros.map((m) => m.fechaIngreso);
  const mesesDisp = ano === 0 ? [] : mesesConRegistros(fechasMiembros, ano);

  const ICONOS_MIEMBRO: Record<string, string> = {
    Activos: '🤝', Inactivos: '○', Trasladados: '🧳',
    Fallecidos: '✝️', Disciplinados: '⚠️', 'En Grupo': '🧑‍🤝‍🧑',
  };
  const tarjetasVista: [string, number][] = [
    ['Activos', tarjetas.activos], ['Inactivos', tarjetas.inactivos],
    ['Trasladados', tarjetas.trasladados], ['Fallecidos', tarjetas.fallecidos],
    ['Disciplinados', tarjetas.disciplinados], ['En Grupo', tarjetas.enGrupo],
    ['Diezmadores', tarjetas.diezmadores], ['En la Academia', tarjetas.enAcademia],
    ['Sirviendo', tarjetas.sirviendo], ['Hermano Mayor', tarjetas.hermanoMayor],
    ['Líderes', tarjetas.lideres],
  ];

  const grupoDeMiembro = (m: (typeof lista)[number]) => nombresGruposDe(datos, m.personaId);

  const claveGrupo = (m: (typeof lista)[number]): string => {
    if (agruparPor === 'zona') return personaDe(m.personaId)?.zona?.trim() || 'Sin zona';
    if (agruparPor === 'escalera') {
      const esc = escaleraDeMiembro(datos, m);
      return esc.actual ? `${esc.actual.emoji} Le falta: ${esc.actual.nombre}` : '🏁 Escalera completa';
    }
    return grupoDeMiembro(m) ?? 'Sin grupo';
  };

  const filaMiembro = (m: (typeof lista)[number]) => {
    const p = personaDe(m.personaId);
    const esc = escaleraDeMiembro(datos, m);
    return (
      <li key={m.id}>
        <FilaPersona
          nombre={`${p?.nombre ?? ''} ${p?.apellidos ?? ''}`}
          meta={<>{m.estado} · escalera {esc.cumplidos}/{esc.total}{esc.actual ? ` · le falta ${esc.actual.nombre}` : ' · completa'}</>}
          activa={seleccionado === m.id}
          onClick={() => setSeleccionado(m.id)}
        />
      </li>
    );
  };

  const tarjetaMiembro = (m: (typeof lista)[number]) => {
    const p = personaDe(m.personaId);
    const esc = escaleraDeMiembro(datos, m);
    return (
      <TarjetaPersona key={m.id} nombre={`${p?.nombre ?? ''} ${p?.apellidos ?? ''}`} onClick={() => setSeleccionado(m.id)}>
        <span className="persona-meta">{m.estado} · {grupoDeMiembro(m) ?? 'Sin grupo'}</span>
        <span className="franja">
          {esc.estados.map((e) => (
            <span key={e.paso.id} className={`franja-paso ${e.cumplido ? 'paso-hecho' : 'paso-falta'}`}>
              {e.cumplido ? '✓' : '○'} {e.paso.emoji}
            </span>
          ))}
        </span>
        <span className="persona-meta">
          Escalera {esc.cumplidos}/{esc.total}
          {esc.actual ? ` · le falta ${esc.actual.nombre}` : ' · 🏁 completa'}
        </span>
      </TarjetaPersona>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="🤝 Miembros">
        <div className="form-acciones">
          <button className="btn" onClick={() => setEditandoPasos(true)}>
            ⚙️ Pasos
          </button>
          <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo miembro</button>
        </div>
      </CabeceraPagina>
      <GuiaPagina texto="El directorio de los integrados y su escalera: Grupo → Diezmador → Academia → Ministerio → Hermano Mayor → Liderazgo. La Integración es la puerta, no un peldaño." />
      {error && <p className="aviso aviso-rojo">{error}</p>}

      {editandoPasos && datos && (
        <EditorPasos
          datos={datos}
          repo={repo}
          ambito="miembros"
          onCerrar={() => setEditandoPasos(false)}
          recargar={recargar}
        />
      )}

      {mostrarForm && (
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

      <div className="selector-periodo">
        <label>
          📅 Tarjetas:{' '}
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            <option value={0}>Foto completa</option>
            {anosConRegistros(fechasMiembros).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Mes{' '}
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} disabled={ano === 0}>
            <option value={0}>Todo el año</option>
            {mesesDisp.map((m) => (
              <option key={m} value={m}>{MESES[m - 1]}</option>
            ))}
            {mes !== 0 && !mesesDisp.includes(mes) && (
              <option value={mes}>{MESES[mes - 1]}</option>
            )}
          </select>
        </label>
        {ano !== 0 && <span className="tenue">la foto de los que ingresaron en el período</span>}
      </div>

      <section className="kpis">
        {tarjetasVista.map(([titulo, valor]) => (
          <Kpi key={titulo} numero={valor} titulo={titulo} icono={ICONOS_MIEMBRO[titulo]} />
        ))}
      </section>

      <Buscador>
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
      </Buscador>

      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[
          { valor: 'grupo', etiqueta: 'Grupo' },
          { valor: 'zona', etiqueta: 'Zona' },
          { valor: 'escalera', etiqueta: 'El paso que le falta' },
        ]}
      />

      {vista === 'lista' && (
        <ul className="lista-personas">
          {lista.map(filaMiembro)}
          {lista.length === 0 && <li className="tenue">Sin miembros para este filtro.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        lista.length === 0
          ? <p className="tenue">Sin miembros para este filtro.</p>
          : <div className="tarjetas-grid">{lista.map(tarjetaMiembro)}</div>
      )}
      {vista === 'agrupada' && (
        lista.length === 0
          ? <p className="tenue">Sin miembros para este filtro.</p>
          : agrupar(lista, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaMiembro)}</ul>
              </div>
            ))
      )}

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
          </div>
          <CamposGrupos
            datos={datos}
            seleccion={idsGruposDe(datos, detalle.personaId)}
            onCambiar={async (ids) => {
              await asignarGrupos(repo, datos, detalle.personaId, ids);
              recargar();
            }}
          />

          <h3>Hitos (editables)</h3>
          {hitos.length === 0 ? (
            <p className="tenue">Sin hitos registrados.</p>
          ) : (
            <ListaEdicion>
              {hitos.map((h) => (
                <FilaEdicion key={h.id}>
                  <input
                    type="date"
                    value={h.fecha ?? ''}
                    onChange={async (e) => {
                      await actualizarHito(repo, { ...h, fecha: e.target.value });
                      recargar();
                    }}
                  />
                  <span>{h.tipo ?? datos.pasos.find((p) => p.id === h.pasoId)?.nombre ?? 'Hito'}</span>
                  <BorrarBoton
                    texto="🗑️"
                    titulo="Borrar este hito"
                    onBorrar={async () => {
                      await borrarHito(repo, h.id);
                      recargar();
                    }}
                  />
                </FilaEdicion>
              ))}
            </ListaEdicion>
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

          <div className="form-acciones">
            <BorrarBoton
              texto="🗑️ Borrar esta ficha de miembro"
              onBorrar={async () => {
                await borrarMiembro(repo, detalle.id);
                setSeleccionado(null);
                recargar();
              }}
            />
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
