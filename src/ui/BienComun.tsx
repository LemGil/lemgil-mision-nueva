import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarAporte, borrarAporte, borrarDiezmador, crearDiezmador, registrarAporte } from '../datos/acciones';
import { iconoGrupo, nombresGruposDe } from '../motor/gruposVista';
import type { Repo } from '../datos/repo';
import type { Aporte, DatosMinisterio, Periodo } from '../modelo/tipos';
import { resumenBienComun } from '../motor/bienComun';
import SelectorPersona from './SelectorPersona';
import { anosConRegistros, mesesConRegistros } from '../motor/periodos';
import { formatoDinero } from '../motor/dinero';

import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';

import Modal from './Modal';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, FilaEdicion, FilaPersona, FilaRegistro, Kpi, ListaEdicion, Pestanas, TarjetaPersona } from './Piezas';
import { buscarPersonas, coincideBusqueda } from '../motor/personaVista';

const hoyIso = () => new Date().toISOString().slice(0, 10);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** El editor de UN aporte: el mismo en la ficha del diezmador y en
 * el Registro general. El registro se maneja en el registro:
 * tocarlo lo abre aquí mismo, sin cargar la ficha de nadie. */
function EditorAporteComun({
  repo,
  aporte,
  recargar,
  onCerrar,
  soloOfrenda = false,
}: {
  repo: Repo;
  aporte: Aporte;
  recargar: () => void;
  onCerrar: () => void;
  /** Los aportes del grupo son siempre Ofrenda: el diezmo va a
   * nombre del diezmador. */
  soloOfrenda?: boolean;
}) {
  return (
<ListaEdicion>
                        <FilaEdicion>
                    <input
                      type="date"
                      value={aporte.fecha}
                      onChange={async (e) => {
                        await actualizarAporte(repo, { ...aporte, fecha: e.target.value });
                        recargar();
                      }}
                    />
                    <select
                      value={aporte.tipo}
                      onChange={async (e) => {
                        await actualizarAporte(repo, { ...aporte, tipo: e.target.value as 'Diezmo' | 'Ofrenda' });
                        recargar();
                      }}
                    >
                      {!soloOfrenda && <option value="Diezmo">Diezmo</option>}
                      <option value="Ofrenda">Ofrenda</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      defaultValue={aporte.monto}
                      style={{ width: '7em' }}
                      onBlur={async (e) => {
                        const v = Number(e.target.value);
                        if (v > 0 && v !== aporte.monto) {
                          await actualizarAporte(repo, { ...aporte, monto: v });
                          recargar();
                        }
                      }}
                    />
                    <BorrarBoton
                      texto="🗑️"
                      titulo="Borrar este aporte"
                      onBorrar={async () => {
                        await borrarAporte(repo, aporte.id);
                        recargar();
                      }}
                    />
                  
                          <button className="btn" title="Cerrar el editor" onClick={onCerrar}>
                            ✔
                          </button>
                        </FilaEdicion>
                      </ListaEdicion>
  );
}

export default function BienComun({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [ano, setAno] = useState(0);
  const [mes, setMes] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [editandoAporte, setEditandoAporte] = useState<string | null>(null);
  const [editandoRegistro, setEditandoRegistro] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [ver, setVer] = useState('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('zona');
  const [monto, setMonto] = useState('');
  const [fechaAporte, setFechaAporte] = useState(hoyIso());
  const [tipoAporte, setTipoAporte] = useState<'Diezmo' | 'Ofrenda'>('Diezmo');
  const [mostrarAporte, setMostrarAporte] = useState(false);
  const [seccion, setSeccion] = useState<'diezmadores' | 'registro'>('diezmadores');
  // Formulario general de aportes (para cualquier diezmador, sin abrir su ficha)
  const [mostrarGeneral, setMostrarGeneral] = useState(false);
  const [personaG, setPersonaG] = useState('');
  const [fechaG, setFechaG] = useState(hoyIso());
  const [tipoG, setTipoG] = useState<'Diezmo' | 'Ofrenda'>('Diezmo');
  const [montoG, setMontoG] = useState('');

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
  const visibles = datos.diezmadores.filter(
    (d) => (ver === 'todos' || (ver === 'activos' ? d.activo : !d.activo)) && idsBuscadas.has(d.personaId),
  );
  const periodo: Periodo | undefined =
    ano === 0
      ? undefined
      : {
          desde: `${ano}-${String(mes === 0 ? 1 : mes).padStart(2, '0')}-01`,
          hasta: (() => {
            const fin = mes === 0 ? new Date(ano, 12, 0) : new Date(ano, mes, 0);
            return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
          })(),
        };
  const resumen = resumenBienComun(datos, periodo);
  const personaDe = (id: string) => datos.personas.find((p) => p.id === id);
  const detalle = seleccionado ? datos.diezmadores.find((d) => d.id === seleccionado) : undefined;
  const aportesDe = detalle
    ? datos.aportes.filter((a) => a.personaId === detalle.personaId).slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    : [];
  const registroGeneral = datos.aportes
    .filter((a) => !periodo || (a.fecha >= periodo.desde && a.fecha <= periodo.hasta))
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const registroVisible = registroGeneral.filter((a) => {
    const p = personaDe(a.personaId ?? '');
    const g = a.grupoId ? datos.grupos.find((x) => x.id === a.grupoId) : undefined;
    return coincideBusqueda(busqueda, p ? `${p.nombre} ${p.apellidos ?? ''}` : undefined, g?.nombre, a.tipo);
  });
  const fechasAportes = datos.aportes.map((a) => a.fecha);
  const mesesDisp = ano === 0 ? [] : mesesConRegistros(fechasAportes, ano);

  const claveGrupo = (d: (typeof visibles)[number]): string => {
    const p = personaDe(d.personaId);
    if (agruparPor === 'estado') return d.activo ? 'Activos' : 'Inactivos';
    if (agruparPor === 'grupo') {
      return (p ? nombresGruposDe(datos, p.id) : undefined) ?? 'Sin grupo';
    }
    return p?.zona?.trim() || 'Sin zona';
  };
  const filaDiezmador = (d: (typeof visibles)[number]) => {
    const p = personaDe(d.personaId);
    const meta = [
      p?.zona ?? 'Sin zona',
      p ? nombresGruposDe(datos, p.id) : undefined,
      `${resumen.porPersonaCantidad.get(d.personaId) ?? 0} aportes`,
    ].filter(Boolean).join(' · ');
    return (
      <li key={d.id}>
        <FilaPersona
          nombre={`${p?.nombre ?? ''} ${p?.apellidos ?? ''}`}
          meta={meta}
          derecha={(
            <span className="fila-lado">
              <span className="fila-valor">{formatoDinero(resumen.porPersona.get(d.personaId) ?? 0)}</span>
              <span className={`chip ${d.activo ? 'chip-verde' : 'chip-gris'}`}>{d.activo ? '● Activo' : '○ Inactivo'}</span>
            </span>
          )}
          activa={seleccionado === d.id}
          onClick={() => setSeleccionado(d.id)}
        />
      </li>
    );
  };
  const tarjetaDiezmador = (d: (typeof visibles)[number]) => {
    const p = personaDe(d.personaId);
    return (
      <TarjetaPersona key={d.id} nombre={`${p?.nombre ?? ''} ${p?.apellidos ?? ''}`} onClick={() => setSeleccionado(d.id)}>
        <span className="persona-meta">
          {[p?.zona ?? 'Sin zona', p ? nombresGruposDe(datos, p.id) : undefined, `${resumen.porPersonaCantidad.get(d.personaId) ?? 0} aportes`].filter(Boolean).join(' · ')}
        </span>
        <span className="tarjeta-valor">{formatoDinero(resumen.porPersona.get(d.personaId) ?? 0)}</span>
        <span><span className={`chip ${d.activo ? 'chip-verde' : 'chip-gris'}`}>{d.activo ? '● Activo' : '○ Inactivo'}</span></span>
      </TarjetaPersona>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="🌾 Bien Común">
        {seccion === 'diezmadores' && (
          <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo diezmador</button>
        )}
        {seccion === 'registro' && (
          <button className="btn btn-dorado" onClick={() => setMostrarGeneral((v) => !v)}>➕ Registrar aporte (general)</button>
        )}
      </CabeceraPagina>
      <GuiaPagina texto="Los diezmadores y sus aportes de diezmos y ofrendas. Los aportes quedan a nombre de la persona para siempre: son historia, no se borran con su salida." />
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <div className="selector-periodo">
        <label>
          📅 Aportes:{' '}
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            <option value={0}>Todo el tiempo</option>
            {anosConRegistros(fechasAportes).map((a) => (
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
      </div>

      <section className="kpis">
        <Kpi principal icono="👥" numero={resumen.diezmadoresActivos} titulo="Diezmadores activos" />
        <Kpi icono="○" numero={resumen.diezmadoresInactivos} titulo="Inactivos" />
        <Kpi icono="🌾" dinero numero={formatoDinero(resumen.totalAportes)} titulo={<>Total aportado{periodo ? ' en el período' : ''}</>} />
        <Kpi icono="🏠" dinero numero={formatoDinero(resumen.totalGrupo)} titulo={<>Ofrendas del grupo{periodo ? ' en el período' : ''}</>} />
        <Kpi icono="🧾" numero={resumen.cantidadAportes} titulo={<>Aportes{periodo ? ' en el período' : ''}</>} />
      </section>

      <Pestanas
        opciones={[
          { id: 'diezmadores', etiqueta: `🌾 Diezmadores (${datos.diezmadores.length})` },
          { id: 'registro', etiqueta: `📋 Registro general (${registroGeneral.length})` },
        ]}
        activa={seccion}
        onCambiar={setSeccion}
      />

      <Buscador>
        <input placeholder="🔍 Buscar por nombre o tipo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </Buscador>
      {seccion === 'registro' && (
        <section className="tarjeta">
          <h2>📋 Registro general de aportes</h2>
          <p className="tenue">
            Todos los aportes registrados{periodo ? ' en el período elegido arriba' : ''}, del más
            reciente al más viejo. Total: {formatoDinero(registroGeneral.reduce((x, a) => x + a.monto, 0))}.
            Toca un registro para corregirlo o borrarlo aquí mismo, sin entrar a la ficha.
          </p>
          {mostrarGeneral && (
            <>
              <div className="form-fila">
                <label>
                  Diezmador *
                  <select value={personaG} onChange={(e) => setPersonaG(e.target.value)}>
                    <option value="">— Elige quién aporta —</option>
                    {datos.diezmadores.map((d) => {
                      const p = personaDe(d.personaId);
                      return (
                        <option key={d.id} value={d.personaId}>
                          {p ? `${p.nombre} ${p.apellidos ?? ''}` : 'Persona borrada'}{d.activo ? '' : ' (Inactivo)'}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label>Fecha<input type="date" value={fechaG} onChange={(e) => setFechaG(e.target.value)} /></label>
                <label>
                  Tipo
                  <select value={tipoG} onChange={(e) => setTipoG(e.target.value as 'Diezmo' | 'Ofrenda')}>
                    <option value="Diezmo">Diezmo</option>
                    <option value="Ofrenda">Ofrenda</option>
                  </select>
                </label>
                <label>Monto<input type="number" min="0" value={montoG} onChange={(e) => setMontoG(e.target.value)} /></label>
                <div className="form-acciones">
                  <button
                    className="btn btn-dorado"
                    disabled={!personaG || !montoG || Number(montoG) <= 0}
                    onClick={async () => {
                      await registrarAporte(repo, {
                        personaId: personaG,
                        fecha: fechaG,
                        monto: Number(montoG),
                        tipo: tipoG,
                      });
                      setMontoG('');
                      recargar();
                    }}
                  >
                    💾 Registrar aporte
                  </button>
                  <button className="btn" onClick={() => setMostrarGeneral(false)}>Cerrar</button>
                </div>
              </div>
              <p className="tenue">El formulario queda abierto y con la persona elegida: puedes registrar varios aportes seguidos sin abrir ficha por ficha.</p>
            </>
          )}
          {registroVisible.length === 0 ? (
            <p className="tenue">Sin aportes en esta vista.</p>
          ) : (
            <ul className="lista-personas">
              {registroVisible.map((a) => {
                const p = personaDe(a.personaId ?? '');
                const g = a.grupoId ? datos.grupos.find((x) => x.id === a.grupoId) : undefined;
                return (
                  <li key={a.id}>
                    {editandoRegistro === a.id ? (
                    <EditorAporteComun repo={repo} aporte={a} recargar={recargar} onCerrar={() => setEditandoRegistro(null)} soloOfrenda={!!a.grupoId} />
                  ) : (
                    <FilaRegistro
                      fecha={a.fecha}
                      nombre={g ? `${iconoGrupo(g)} ${g.nombre}` : p ? `${p.nombre} ${p.apellidos ?? ''}` : 'Persona borrada'}
                      meta={g ? `Ofrenda del grupo${a.reunionId ? ' · del parte de reunión' : ''}${a.referencia ? ` · ref. ${a.referencia}` : ''}` : a.reunionId ? `${a.tipo} · del parte de reunión` : a.tipo}
                      valor={formatoDinero(a.monto)}
                      onClick={() => setEditandoRegistro(a.id)}
                    />
                  )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {seccion === 'diezmadores' && (
        <>
      {mostrarForm && (
      <section className="tarjeta">
        <h2>➕ Nuevo diezmador</h2>
        <SelectorPersona
          datos={datos}
          excluir={new Set(datos.diezmadores.map((d) => d.personaId))}
          onElegir={async (personaId) => {
            setError('');
            try {
              await crearDiezmador(repo, datos, personaId);
              recargar();
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

      <div className="vista-barra">
        <span className="seg" role="group" aria-label="Ver">
          <button type="button" aria-pressed={ver === 'activos'} onClick={() => setVer('activos')}>Activos</button>
          <button type="button" aria-pressed={ver === 'inactivos'} onClick={() => setVer('inactivos')}>Inactivos</button>
          <button type="button" aria-pressed={ver === 'todos'} onClick={() => setVer('todos')}>Todos</button>
        </span>
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
          {visibles.map(filaDiezmador)}
          {visibles.length === 0 && <li className="tenue">Sin diezmadores para esta vista.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        visibles.length === 0
          ? <p className="tenue">Sin diezmadores para esta vista.</p>
          : <div className="tarjetas-grid">{visibles.map(tarjetaDiezmador)}</div>
      )}
      {vista === 'agrupada' && (
        visibles.length === 0
          ? <p className="tenue">Sin diezmadores para esta vista.</p>
          : agrupar(visibles, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaDiezmador)}</ul>
              </div>
            ))
      )}

        </>
      )}

      {detalle && (
        <Modal onCerrar={() => setSeleccionado(null)}>
          <h2>{personaDe(detalle.personaId)?.nombre} {personaDe(detalle.personaId)?.apellidos ?? ''}</h2>
          <button
            className="btn"
            onClick={async () => {
              await repo.guardar('diezmadores', { ...detalle, activo: !detalle.activo });
              recargar();
            }}
          >
            {detalle.activo ? 'Pasar a Inactivo' : 'Reactivar'}
          </button>{' '}
          <BorrarBoton
            texto="🗑️ Quitar diezmador"
            titulo="Borrar el registro de diezmador (sus aportes quedan en la historia)"
            onBorrar={async () => {
              await borrarDiezmador(repo, detalle.id);
              setSeleccionado(null);
              recargar();
            }}
          />
          <div className="form-acciones">
            <button className="btn btn-dorado" onClick={() => setMostrarAporte((v) => !v)}>
              {mostrarAporte ? '➖ Cerrar el registro' : '➕ Registrar aporte'}
            </button>
          </div>
          {mostrarAporte && (
            <div className="form-fila">
              <label>Fecha<input type="date" value={fechaAporte} onChange={(e) => setFechaAporte(e.target.value)} /></label>
              <label>
                Tipo
                <select value={tipoAporte} onChange={(e) => setTipoAporte(e.target.value as 'Diezmo' | 'Ofrenda')}>
                  <option value="Diezmo">Diezmo</option>
                  <option value="Ofrenda">Ofrenda</option>
                </select>
              </label>
              <label>Monto<input type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
              <div className="form-acciones">
                <button
                  className="btn btn-dorado"
                  disabled={!monto || Number(monto) <= 0}
                  onClick={async () => {
                    await registrarAporte(repo, {
                      personaId: detalle.personaId,
                      fecha: fechaAporte,
                      monto: Number(monto),
                      tipo: tipoAporte,
                    });
                    setMonto('');
                    recargar();
                  }}
                >
                  💾 Registrar aporte
                </button>
              </div>
            </div>
          )}
          <h3>Aportes</h3>
          {aportesDe.length === 0 ? (
            <p className="tenue">Sin aportes registrados.</p>
          ) : (
            <>
              <ul className="lista">
                {aportesDe.map((a) => (
                  <li key={a.id}>
                    {editandoAporte === a.id ? (
                      <EditorAporteComun repo={repo} aporte={a} recargar={recargar} onCerrar={() => setEditandoAporte(null)} />
                    ) : (
                      <FilaRegistro
                        fecha={a.fecha}
                        nombre={a.tipo}
                        meta={a.reunionId ? 'del parte de reunión' : undefined}
                        valor={formatoDinero(a.monto)}
                        onClick={() => setEditandoAporte(a.id)}
                      />
                    )}
                  </li>
                ))}
              </ul>
              <p className="tenue">
                {aportesDe.length} aportes · total {formatoDinero(aportesDe.reduce((x, a) => x + a.monto, 0))}.
                Toca un aporte para corregirlo.
              </p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
