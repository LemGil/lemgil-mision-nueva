import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { avanzarConversion, borrarConversion, crearConversion, guardarHistorial, type EntradaMision } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import { esSalida, pasosDeMision } from '../modelo/catalogo';
import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import { fechaEnPasoActual } from '../motor/alertas';
import { conteoMision, siguientePasoEnRuta } from '../motor/mision';
import { buscarPersonas } from '../motor/personaVista';
import { agrupar } from '../motor/vistas';
import { anosConRegistros, mesesConRegistros } from '../motor/periodos';

import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';
import Modal from './Modal';
import GuiaPagina from './GuiaPagina';
import EditorPasos from './EditorPasos';
import { Buscador, CabeceraPagina, FilaEdicion, Kpi, ListaEdicion, TarjetaPersona } from './Piezas';

const hoyIso = () => new Date().toISOString().slice(0, 10);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function Mision({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [ano, setAno] = useState<number>(0); // 0 = sin período (la foto)
  const [mes, setMes] = useState<number>(0);
  const [filtroPaso, setFiltroPaso] = useState<string>('proceso');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState('');
  const [nuevoPasoHist, setNuevoPasoHist] = useState('');
  const [nuevaFechaHist, setNuevaFechaHist] = useState(hoyIso());
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('paso');

  // Nuevo congregado
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [buscaPersona, setBuscaPersona] = useState('');
  const [personaElegida, setPersonaElegida] = useState<string | null>(null);
  const [entrada, setEntrada] = useState<EntradaMision>('alcanzado');

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
  const conteo = conteoMision(datos, periodo);
  const ruta = pasosDeMision(datos.pasos);
  const personaDe = (id: string) => datos.personas.find((p) => p.id === id);
  const hoy = hoyIso();

  const candidatas = buscarPersonas(datos, buscaPersona).filter(
    (p) => !datos.conversiones.some((c) => c.personaId === p.id),
  );
  const idsBuscadas = new Set(buscarPersonas(datos, busqueda).map((p) => p.id));

  const lista = datos.conversiones.filter((c) => {
    if (busqueda && !idsBuscadas.has(c.personaId)) return false;
    if (filtroPaso === 'proceso') return !esSalida(datos.pasos, c.estado);
    if (filtroPaso === 'todas') return true;
    return c.estado === filtroPaso;
  });

  const detalle = seleccionada ? datos.conversiones.find((c) => c.id === seleccionada) : undefined;

  const avanzar = async (conversionId: string, pasoId: string, nota: string) => {
    setErrorAccion('');
    try {
      await avanzarConversion(repo, datos, conversionId, pasoId, hoy, nota);
      recargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : String(e));
    }
  };

  const guardarHist = async (historial: import('../modelo/tipos').EntradaHistorial[]) => {
    if (!detalle) return;
    setErrorAccion('');
    try {
      await guardarHistorial(repo, datos, detalle.id, historial);
      recargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : String(e));
    }
  };

  const crear = async () => {
    if (!personaElegida) return;
    setErrorAccion('');
    try {
      await crearConversion(repo, datos, personaElegida, entrada, hoy);
      setMostrarNuevo(false);
      setPersonaElegida(null);
      setBuscaPersona('');
      recargar();
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : String(e));
    }
  };

  const fechasMision = datos.conversiones.flatMap((c) => [c.fecha, ...c.historial.map((h) => h.fecha)]);
  const anos = [0, ...anosConRegistros(fechasMision)];
  const mesesDisp = ano === 0 ? [] : mesesConRegistros(fechasMision, ano);

  const diasEnPaso = (c: (typeof lista)[number]) =>
    Math.max(
      0,
      Math.round(
        (new Date(hoy + 'T12:00:00').getTime() -
          new Date(fechaEnPasoActual(c.estado, c.historial, c.fecha) + 'T12:00:00').getTime()) /
          86400000,
      ),
    );

  const claveGrupo = (c: (typeof lista)[number]): string => {
    const per = personaDe(c.personaId);
    if (agruparPor === 'zona') return per?.zona?.trim() || 'Sin zona';
    if (agruparPor === 'grupo') {
      const g = per?.grupoId ? datos.grupos.find((x) => x.id === per.grupoId) : undefined;
      return g?.nombre ?? 'Sin grupo';
    }
    const paso = datos.pasos.find((x) => x.id === c.estado);
    return paso ? `${paso.emoji} ${paso.nombre}` : c.estado;
  };

  const filaConversion = (c: (typeof lista)[number]) => {
    const p = personaDe(c.personaId);
    const paso = datos.pasos.find((x) => x.id === c.estado);
    const siguiente = siguientePasoEnRuta(datos, c.estado);
    return (
      <li key={c.id}>
        <div className={`persona-fila ${seleccionada === c.id ? 'activa' : ''}`}>
          <button className="persona-main" onClick={() => setSeleccionada(c.id)}>
            <span className="persona-nombre">{p?.nombre ?? '(sin ficha)'} {p?.apellidos ?? ''}</span>
            <span className="persona-meta">{paso?.emoji} {paso?.nombre} · {diasEnPaso(c)} días en el paso</span>
          </button>
          {siguiente && paso?.rol !== 'gozne' && (
            <button
              className="btn btn-avance"
              title={`Avanzar a ${datos.pasos.find((x) => x.id === siguiente)?.nombre}`}
              onClick={() => avanzar(c.id, siguiente, 'Avance rápido')}
            >
              ▸
            </button>
          )}
        </div>
      </li>
    );
  };

  const tarjetaConversion = (c: (typeof lista)[number]) => {
    const p = personaDe(c.personaId);
    const paso = datos.pasos.find((x) => x.id === c.estado);
    return (
      <TarjetaPersona key={c.id} nombre={`${p?.nombre ?? '(sin ficha)'} ${p?.apellidos ?? ''}`} onClick={() => setSeleccionada(c.id)}>
        <span className="persona-meta">{paso?.emoji} {paso?.nombre} · {diasEnPaso(c)} días en el paso</span>
        <span className="persona-meta">
          {[p?.telefono, p?.zona].filter(Boolean).join(' · ') || 'Sin teléfono ni zona'}
        </span>
      </TarjetaPersona>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="📣 Misión">
        <div className="form-acciones">
          <button className="btn" onClick={() => setEditandoPasos(true)}>
            ⚙️ Pasos
          </button>
          <button className="btn btn-dorado" onClick={() => setMostrarNuevo((v) => !v)}>
            ➕ Nuevo Congregado
          </button>
        </div>
      </CabeceraPagina>
      <GuiaPagina texto="La mesa del camino: Alcanzado → Confeso → Converso → Discipulado → Bautizado → Integrado. Cuenta registros paso a paso; al llegar a Integrado, la persona nace como miembro." />

      {editandoPasos && datos && (
        <EditorPasos
          datos={datos}
          repo={repo}
          ambito="mision"
          onCerrar={() => setEditandoPasos(false)}
          recargar={recargar}
        />
      )}

      {errorAccion && <p className="aviso aviso-rojo">{errorAccion}</p>}

      {mostrarNuevo && (
        <section className="tarjeta formulario">
          <h2>➕ Nuevo Congregado</h2>
          <p className="tenue">
            Elige una persona ya registrada (las que ya están en Misión no aparecen: bloqueo
            duro). Si aún no está registrada, créala primero en Personas con «➕ Nueva persona».
          </p>
          <input
            placeholder="🔍 Buscar persona…"
            value={buscaPersona}
            onChange={(e) => setBuscaPersona(e.target.value)}
          />
          <ul className="lista-personas">
            {candidatas.slice(0, 8).map((p) => (
              <li key={p.id}>
                <button
                  className={`persona-fila ${personaElegida === p.id ? 'activa' : ''}`}
                  onClick={() => setPersonaElegida(p.id)}
                >
                  <span className="persona-nombre">{p.nombre} {p.apellidos ?? ''}</span>
                  <span className="persona-meta">{p.telefono ?? 'Sin teléfono'}</span>
                </button>
              </li>
            ))}
            {candidatas.length === 0 && <li className="tenue">Sin personas disponibles.</li>}
          </ul>
          <div className="radios">
            {(['alcanzado', 'confeso', 'converso', 'bautizado'] as EntradaMision[]).map((e) => {
              const pasoId = { alcanzado: 'ps-congregado', confeso: 'ps-confeso', converso: 'ps-nuevo', bautizado: 'ps-bautizado' }[e];
              const paso = datos.pasos.find((p) => p.id === pasoId);
              return (
                <label key={e} className="check">
                  <input type="radio" name="entrada-mision" checked={entrada === e} onChange={() => setEntrada(e)} />
                  Como {paso?.nombre ?? e}
                  {e === 'bautizado' && ' — llega de traslado, ya bautizado'}
                </label>
              );
            })}
          </div>
          <div className="form-acciones">
            <button className="btn btn-dorado" onClick={crear} disabled={!personaElegida}>
              💾 Registrar
            </button>
            <button className="btn" onClick={() => setMostrarNuevo(false)}>Cancelar</button>
          </div>
        </section>
      )}

      <div className="selector-periodo">
        <label>
          📅 Tarjetas:{' '}
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {anos.map((a) => (
              <option key={a} value={a}>{a === 0 ? 'Foto actual' : a}</option>
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
        {periodo && <span className="tenue">cuentan las entradas a cada paso en el período</span>}
      </div>

      <section className="kpis">
        <Kpi
          principal
          icono="🧭"
          numero={periodo ? (conteo.enProcesoPeriodo ?? 0) : conteo.enProceso}
          titulo="En proceso"
          sub={periodo ? 'entraron en el período y siguen en la ruta' : 'registros en la ruta de Misión'}
        />
        {conteo.pasos.map((t) => (
          <Kpi
            key={t.pasoId}
            icono={t.emoji}
            numero={periodo ? (t.periodo ?? 0) : t.foto}
            titulo={t.nombre}
            sub={periodo ? `${t.foto} hoy` : undefined}
          />
        ))}
        {conteo.salidas
          .filter((t) => (periodo ? (t.periodo ?? 0) : t.foto) > 0)
          .map((t) => (
            <Kpi
              key={t.pasoId}
              icono={t.emoji}
              numero={periodo ? (t.periodo ?? 0) : t.foto}
              titulo={t.nombre}
              sub={periodo ? `${t.foto} hoy` : undefined}
            />
          ))}
      </section>

      <Buscador>
        <input placeholder="🔍 Buscar en la lista…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={filtroPaso} onChange={(e) => setFiltroPaso(e.target.value)}>
          <option value="proceso">En proceso</option>
          {ruta.map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>
          ))}
          <option value="todas">Todas (con salidas)</option>
        </select>
        <span className="tenue">{lista.length} registros</span>
      </Buscador>

      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[
          { valor: 'paso', etiqueta: 'El paso en que está' },
          { valor: 'zona', etiqueta: 'Zona' },
          { valor: 'grupo', etiqueta: 'Grupo' },
        ]}
      />

      {vista === 'lista' && (
        <ul className="lista-personas">
          {lista.map(filaConversion)}
          {lista.length === 0 && <li className="tenue">Sin registros para este filtro.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        lista.length === 0
          ? <p className="tenue">Sin registros para este filtro.</p>
          : <div className="tarjetas-grid">{lista.map(tarjetaConversion)}</div>
      )}
      {vista === 'agrupada' && (
        lista.length === 0
          ? <p className="tenue">Sin registros para este filtro.</p>
          : agrupar(lista, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaConversion)}</ul>
              </div>
            ))
      )}

      {detalle && (
        <Modal onCerrar={() => setSeleccionada(null)}>
          <h2>
            {personaDe(detalle.personaId)?.nombre} {personaDe(detalle.personaId)?.apellidos ?? ''}
          </h2>
          <div className="franja">
            {ruta
              .filter((p) => p.rol !== 'salida')
              .map((p) => {
                const orden = (x: string) => datos.pasos.find((y) => y.id === x)?.orden ?? 0;
                const hecho = orden(p.id) < orden(detalle.estado);
                const actual = p.id === detalle.estado;
                return (
                  <span key={p.id} className={`franja-paso ${actual ? 'paso-actual' : hecho ? 'paso-hecho' : 'paso-falta'}`}>
                    {p.emoji} {p.nombre}
                  </span>
                );
              })}
            {esSalida(datos.pasos, detalle.estado) && (
              <span className="franja-paso paso-actual">
                {datos.pasos.find((p) => p.id === detalle.estado)?.emoji}{' '}
                {datos.pasos.find((p) => p.id === detalle.estado)?.nombre}
              </span>
            )}
          </div>

          <div className="form-fila">
            <label>
              Estado
              <select id="estado-detalle" defaultValue={detalle.estado} key={detalle.id + detalle.estado}>
                {ruta.map((p) => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>
                ))}
              </select>
            </label>
            <div className="form-acciones">
              <button
                className="btn btn-dorado"
                onClick={() => {
                  const sel = document.getElementById('estado-detalle') as HTMLSelectElement;
                  void avanzar(detalle.id, sel.value, 'Cambio de estado');
                }}
              >
                💾 Guardar estado
              </button>
            </div>
          </div>
          <p className="tenue">
            Al caer en {ruta.find((p) => p.rol === 'gozne')?.nombre ?? 'Integrado'} nace el
            miembro automáticamente — es el gozne. Por eso el avance rápido (▸) se detiene antes:
            a Integrado se llega desde aquí, guardando.
          </p>

          <h3>Historial (editable)</h3>
          {errorAccion && <p className="aviso aviso-rojo">{errorAccion}</p>}
          <ListaEdicion>
            {(detalle.historial ?? []).map((h, i, arr) => {
              const pasoH = datos.pasos.find((p) => p.id === h.estado);
              const esActual = i === arr.length - 1 && h.estado === detalle.estado;
              return (
                <FilaEdicion key={i}>
                  <input
                    type="date"
                    value={h.fecha}
                    onChange={(e) => {
                      const copia = (detalle.historial ?? []).map((x, j) =>
                        j === i ? { ...x, fecha: e.target.value } : x,
                      );
                      void guardarHist(copia);
                    }}
                  />
                  <span className={esActual ? 'actual' : ''}>
                    {pasoH?.emoji} {pasoH?.nombre ?? h.estado}
                    {esActual ? ' · paso actual' : ''}
                  </span>
                  {h.nota && <span className="tenue">{h.nota}</span>}
                  {arr.length > 1 && (
                    <BorrarBoton
                      texto="🗑️"
                      titulo="Quitar esta entrada del historial"
                      onBorrar={() =>
                        void guardarHist((detalle.historial ?? []).filter((_, j) => j !== i))
                      }
                    />
                  )}
                </FilaEdicion>
              );
            })}
          </ListaEdicion>
          <div className="form-fila">
            <label>
              Paso que falta en el historial
              <select value={nuevoPasoHist} onChange={(e) => setNuevoPasoHist(e.target.value)}>
                <option value="">Elegir…</option>
                {ruta.map((p) => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Fecha
              <input type="date" value={nuevaFechaHist} onChange={(e) => setNuevaFechaHist(e.target.value)} />
            </label>
            <div className="form-acciones">
              <button
                className="btn"
                disabled={!nuevoPasoHist}
                onClick={() => {
                  void guardarHist([
                    ...(detalle.historial ?? []),
                    { fecha: nuevaFechaHist, estado: nuevoPasoHist, nota: 'Corrección del historial' },
                  ]);
                  setNuevoPasoHist('');
                }}
              >
                ➕ Agregar al historial
              </button>
            </div>
          </div>
          <p className="tenue">
            Al corregir el historial, el estado del registro se recalcula solo: manda la
            entrada de fecha más reciente.
          </p>

          <div className="form-acciones">
            <BorrarBoton
              texto="🗑️ Borrar este registro de Misión"
              onBorrar={async () => {
                await borrarConversion(repo, detalle.id);
                setSeleccionada(null);
                recargar();
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
