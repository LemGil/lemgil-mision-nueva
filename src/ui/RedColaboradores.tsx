import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarAporteRed, actualizarColaborador, borrarAporteRed, borrarColaborador, crearColaborador, registrarAporteRed } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { Colaborador, DatosMinisterio, Periodo } from '../modelo/tipos';
import { anosConRegistros, mesesConRegistros } from '../motor/periodos';
import { nombreColaborador, resumenRed } from '../motor/red';
import { formatoDinero } from '../motor/dinero';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, FilaEdicion, FilaPersona, FilaRegistro, Kpi, ListaEdicion, Pestanas, TarjetaPersona } from './Piezas';
import { coincideBusqueda } from '../motor/personaVista';
import Modal from './Modal';
import BorrarBoton from './BorrarBoton';

const hoyIso = () => new Date().toISOString().slice(0, 10);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const TIPOS_COLABORADOR = ['Persona', 'Iglesia', 'Ministerio', 'Empresa', 'Otro'];
const TIPOS_APORTE = ['Diezmo', 'Ofrenda', 'Donación', 'Otro'];
const METODOS = ['Efectivo', 'Transferencia', 'Otro'];

export default function RedColaboradores({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [ano, setAno] = useState(0);
  const [mes, setMes] = useState(0);
  const [ver, setVer] = useState('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('tipo');
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [editandoAporte, setEditandoAporte] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarAporte, setMostrarAporte] = useState(false);
  const [seccion, setSeccion] = useState<'colaboradores' | 'registro'>('colaboradores');
  // Formulario general de aportes (para cualquier colaborador, sin abrir su ficha)
  const [mostrarGeneral, setMostrarGeneral] = useState(false);
  const [colaboradorG, setColaboradorG] = useState('');
  const [fechaG, setFechaG] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoG, setTipoG] = useState('Ofrenda');
  const [metodoG, setMetodoG] = useState('Efectivo');
  const [montoG, setMontoG] = useState('');
  const [referenciaG, setReferenciaG] = useState('');
  // Formulario de nuevo colaborador
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [tipo, setTipo] = useState('Persona');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [planTipo, setPlanTipo] = useState('');
  const [planMonto, setPlanMonto] = useState('');
  const [notas, setNotas] = useState('');
  // Formulario de aporte
  const [monto, setMonto] = useState('');
  const [fechaAporte, setFechaAporte] = useState(hoyIso());
  const [tipoAporte, setTipoAporte] = useState('Ofrenda');
  const [metodo, setMetodo] = useState('Efectivo');
  const [referencia, setReferencia] = useState('');
  // Edición del colaborador
  const [editandoColab, setEditandoColab] = useState(false);
  const [nombreE, setNombreE] = useState('');
  const [apellidoE, setApellidoE] = useState('');
  const [tipoE, setTipoE] = useState('Persona');
  const [telefonoE, setTelefonoE] = useState('');
  const [emailE, setEmailE] = useState('');
  const [planTipoE, setPlanTipoE] = useState('');
  const [planMontoE, setPlanMontoE] = useState('');
  const [notasE, setNotasE] = useState('');

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

  const fechasAportes = datos.aportesRed.map((a) => a.fecha);
  const mesesDisp = ano === 0 ? [] : mesesConRegistros(fechasAportes, ano);
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
  const resumen = resumenRed(datos, periodo);
  const visibles = datos.colaboradores.filter(
    (c) =>
      (ver === 'todos' || (ver === 'activos' ? c.estado === 'Activo' : c.estado !== 'Activo')) &&
      coincideBusqueda(busqueda, c.nombre, c.apellido, c.tipo),
  );
  const detalle = seleccionado ? datos.colaboradores.find((c) => c.id === seleccionado) : undefined;
  const aportesDe = detalle
    ? datos.aportesRed
        .filter((a) => a.colaboradorId === detalle.id)
        .slice()
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    : [];
  const registroGeneral = datos.aportesRed
    .filter((a) => !periodo || (a.fecha >= periodo.desde && a.fecha <= periodo.hasta))
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const registroVisible = registroGeneral.filter((a) => {
    const c = datos.colaboradores.find((x) => x.id === a.colaboradorId);
    return coincideBusqueda(busqueda, c ? nombreColaborador(c) : undefined, a.tipo);
  });

  const claveGrupo = (c: Colaborador): string => {
    if (agruparPor === 'estado') return c.estado;
    return c.tipo?.trim() || 'Sin tipo';
  };

  const filaColaborador = (c: Colaborador) => (
    <li key={c.id}>
      <FilaPersona
        nombre={nombreColaborador(c)}
        meta={`${c.tipo ?? 'Sin tipo'} · ${resumen.porColaboradorCantidad.get(c.id) ?? 0} aportes`}
        derecha={(
          <span className="fila-lado">
            <span className="fila-valor">{formatoDinero(resumen.porColaborador.get(c.id) ?? 0)}</span>
            <span className={`chip ${c.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{c.estado === 'Activo' ? '● Activo' : '○ Inactivo'}</span>
          </span>
        )}
        activa={seleccionado === c.id}
        onClick={() => setSeleccionado(c.id)}
      />
    </li>
  );

  const tarjetaColaborador = (c: Colaborador) => (
    <TarjetaPersona key={c.id} nombre={nombreColaborador(c)} onClick={() => setSeleccionado(c.id)}>
      <span className="persona-meta">
        {c.tipo ?? 'Sin tipo'} · {resumen.porColaboradorCantidad.get(c.id) ?? 0} aportes
      </span>
      <span className="tarjeta-valor">{formatoDinero(resumen.porColaborador.get(c.id) ?? 0)}</span>
      <span>
        <span className={`chip ${c.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{c.estado === 'Activo' ? '● Activo' : '○ Inactivo'}</span>{' '}
        <span className="chip chip-gris">{c.tipo ?? 'Sin tipo'}</span>
      </span>
      <span className="persona-meta">{c.telefono ?? c.email ?? 'Sin contacto'}</span>
    </TarjetaPersona>
  );

  return (
    <div className="panel">
      <CabeceraPagina titulo="🌐 Red de Colaboradores">
        {seccion === 'colaboradores' && (
          <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo colaborador</button>
        )}
        {seccion === 'registro' && (
          <button className="btn btn-dorado" onClick={() => setMostrarGeneral((v) => !v)}>➕ Registrar aporte (general)</button>
        )}
      </CabeceraPagina>
      <GuiaPagina texto="Apoyo externo al Ministerio: personas, iglesias y ministerios que ofrendan. No son miembros: no entran en la ficha única ni en el censo; aquí viven su propio registro y sus aportes." />
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
            {mes !== 0 && !mesesDisp.includes(mes) && <option value={mes}>{MESES[mes - 1]}</option>}
          </select>
        </label>
      </div>

      <section className="kpis">
        <Kpi principal icono="👥" numero={resumen.activos} titulo="Colaboradores activos" />
        <Kpi icono="○" numero={resumen.inactivos} titulo="Inactivos" />
        <Kpi icono="🌾" dinero numero={formatoDinero(resumen.totalAportes)} titulo={<>Total aportado{periodo ? ' en el período' : ''}</>} />
        <Kpi icono="🧾" numero={resumen.cantidadAportes} titulo={<>Aportes{periodo ? ' en el período' : ''}</>} />
      </section>

      <Pestanas
        opciones={[
          { id: 'colaboradores', etiqueta: `🤝 Colaboradores (${datos.colaboradores.length})` },
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
            Todos los aportes de la Red registrados{periodo ? ' en el período elegido arriba' : ''}, del
            más reciente al más viejo. Total: {formatoDinero(registroGeneral.reduce((x, a) => x + a.monto, 0))}.
            Toca un registro para abrir la ficha de su colaborador.
          </p>
          {mostrarGeneral && (
            <>
              <div className="form-fila">
                <label>
                  Colaborador *
                  <select value={colaboradorG} onChange={(e) => setColaboradorG(e.target.value)}>
                    <option value="">— Elige quién aporta —</option>
                    {datos.colaboradores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {nombreColaborador(c)}{c.estado === 'Activo' ? '' : ' (Inactivo)'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Fecha<input type="date" value={fechaG} onChange={(e) => setFechaG(e.target.value)} /></label>
                <label>
                  Tipo
                  <select value={tipoG} onChange={(e) => setTipoG(e.target.value)}>
                    {TIPOS_APORTE.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Método
                  <select value={metodoG} onChange={(e) => setMetodoG(e.target.value)}>
                    {METODOS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>Monto<input type="number" min="0" value={montoG} onChange={(e) => setMontoG(e.target.value)} /></label>
                <label>Referencia<input value={referenciaG} onChange={(e) => setReferenciaG(e.target.value)} /></label>
                <div className="form-acciones">
                  <button
                    className="btn btn-dorado"
                    disabled={!colaboradorG || !montoG || Number(montoG) <= 0}
                    onClick={async () => {
                      await registrarAporteRed(repo, {
                        colaboradorId: colaboradorG,
                        fecha: fechaG,
                        monto: Number(montoG),
                        tipo: tipoG,
                        metodo: metodoG,
                        referencia: referenciaG.trim() || undefined,
                      });
                      setMontoG('');
                      setReferenciaG('');
                      recargar();
                    }}
                  >
                    💾 Registrar aporte
                  </button>
                  <button className="btn" onClick={() => setMostrarGeneral(false)}>Cerrar</button>
                </div>
              </div>
              <p className="tenue">El formulario queda abierto y con el colaborador elegido: puedes registrar varios aportes seguidos sin abrir ficha por ficha.</p>
            </>
          )}
          {registroVisible.length === 0 ? (
            <p className="tenue">Sin aportes en esta vista.</p>
          ) : (
            <ul className="lista-personas">
              {registroVisible.map((a) => (
                <li key={a.id}>
                  <FilaRegistro
                    fecha={a.fecha}
                    nombre={nombreColaborador(datos.colaboradores.find((c) => c.id === a.colaboradorId) ?? { nombre: 'Colaborador borrado' })}
                    meta={<>{a.tipo}{a.metodo ? ` · ${a.metodo}` : ''}{a.referencia ? ` · ref. ${a.referencia}` : ''}</>}
                    valor={formatoDinero(a.monto)}
                    onClick={() => setSeleccionado(a.colaboradorId)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {seccion === 'colaboradores' && (
        <>
      {mostrarForm && (
      <section className="tarjeta formulario">
        <h2>➕ Nuevo colaborador</h2>
        <div className="form-fila">
          <label>Nombre *<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label>Apellido<input value={apellido} onChange={(e) => setApellido(e.target.value)} /></label>
          <label>
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_COLABORADOR.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-fila">
          <label>Teléfono<input value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
          <label>Correo<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        </div>
        <div className="form-fila">
          <label>Plan de ofrenda (tipo)<input value={planTipo} onChange={(e) => setPlanTipo(e.target.value)} placeholder="Mensual, por campaña…" /></label>
          <label>Plan (monto)<input type="number" min="0" value={planMonto} onChange={(e) => setPlanMonto(e.target.value)} /></label>
          <label>Notas<input value={notas} onChange={(e) => setNotas(e.target.value)} /></label>
        </div>
        <div className="form-acciones">
          <button
            className="btn btn-dorado"
            disabled={!nombre.trim()}
            onClick={async () => {
              setError('');
              try {
                await crearColaborador(repo, {
                  nombre: nombre.trim(),
                  apellido: apellido.trim() || undefined,
                  tipo,
                  telefono: telefono.trim() || undefined,
                  email: email.trim() || undefined,
                  estado: 'Activo',
                  planOfrendaTipo: planTipo.trim() || undefined,
                  planOfrendaMonto: planMonto ? Number(planMonto) : undefined,
                  notas: notas.trim() || undefined,
                });
                setNombre(''); setApellido(''); setTelefono(''); setEmail('');
                setPlanTipo(''); setPlanMonto(''); setNotas('');
                recargar();
              setMostrarForm(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            💾 Crear colaborador
          </button>
        </div>
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
          { valor: 'tipo', etiqueta: 'Tipo' },
          { valor: 'estado', etiqueta: 'Estado' },
        ]}
      />
      {vista === 'lista' && (
        <ul className="lista-personas">
          {visibles.map(filaColaborador)}
          {visibles.length === 0 && <li className="tenue">Sin colaboradores para esta vista.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        visibles.length === 0
          ? <p className="tenue">Sin colaboradores para esta vista.</p>
          : <div className="tarjetas-grid">{visibles.map(tarjetaColaborador)}</div>
      )}
      {vista === 'agrupada' && (
        visibles.length === 0
          ? <p className="tenue">Sin colaboradores para esta vista.</p>
          : agrupar(visibles, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaColaborador)}</ul>
              </div>
            ))
      )}

        </>
      )}

      {detalle && (
        <Modal onCerrar={() => setSeleccionado(null)}>
          <h2>{nombreColaborador(detalle)}</h2>
          <p className="tenue">
            {detalle.tipo ?? ''}
            {detalle.telefono ? ` · ${detalle.telefono}` : ''}
            {detalle.email ? ` · ${detalle.email}` : ''}
          </p>
          {(detalle.planOfrendaTipo || detalle.planOfrendaMonto) && (
            <p className="tenue">
              Plan: {detalle.planOfrendaTipo ?? ''} {detalle.planOfrendaMonto ? formatoDinero(detalle.planOfrendaMonto) : ''}
            </p>
          )}
          {detalle.notas && <p className="tenue">📝 {detalle.notas}</p>}
          <button
            className="btn"
            onClick={async () => {
              await actualizarColaborador(repo, {
                ...detalle,
                estado: detalle.estado === 'Activo' ? 'Inactivo' : 'Activo',
              });
              recargar();
            }}
          >
            {detalle.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
          </button>{' '}
          <button
            className="btn"
            onClick={() => {
              setNombreE(detalle.nombre);
              setApellidoE(detalle.apellido ?? '');
              setTipoE(detalle.tipo ?? 'Persona');
              setTelefonoE(detalle.telefono ?? '');
              setEmailE(detalle.email ?? '');
              setPlanTipoE(detalle.planOfrendaTipo ?? '');
              setPlanMontoE(detalle.planOfrendaMonto ? String(detalle.planOfrendaMonto) : '');
              setNotasE(detalle.notas ?? '');
              setEditandoColab((v) => !v);
            }}
          >
            ✏️ Editar datos
          </button>{' '}
          <BorrarBoton
            texto="🗑️ Borrar colaborador"
            titulo="Borra al colaborador y todos sus aportes"
            onBorrar={async () => {
              await borrarColaborador(repo, datos, detalle.id);
              setSeleccionado(null);
              recargar();
            }}
          />
          {editandoColab && (
            <>
              <div className="form-fila">
                <label>Nombre *<input value={nombreE} onChange={(e) => setNombreE(e.target.value)} /></label>
                <label>Apellido<input value={apellidoE} onChange={(e) => setApellidoE(e.target.value)} /></label>
                <label>
                  Tipo
                  <select value={tipoE} onChange={(e) => setTipoE(e.target.value)}>
                    {TIPOS_COLABORADOR.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-fila">
                <label>Teléfono<input value={telefonoE} onChange={(e) => setTelefonoE(e.target.value)} /></label>
                <label>Correo<input value={emailE} onChange={(e) => setEmailE(e.target.value)} /></label>
              </div>
              <div className="form-fila">
                <label>Plan de ofrenda (tipo)<input value={planTipoE} onChange={(e) => setPlanTipoE(e.target.value)} /></label>
                <label>Plan (monto)<input type="number" min="0" value={planMontoE} onChange={(e) => setPlanMontoE(e.target.value)} /></label>
                <label>Notas<input value={notasE} onChange={(e) => setNotasE(e.target.value)} /></label>
              </div>
              <div className="form-acciones">
                <button
                  className="btn btn-dorado"
                  disabled={!nombreE.trim()}
                  onClick={async () => {
                    await actualizarColaborador(repo, {
                      ...detalle,
                      nombre: nombreE.trim(),
                      apellido: apellidoE.trim() || undefined,
                      tipo: tipoE,
                      telefono: telefonoE.trim() || undefined,
                      email: emailE.trim() || undefined,
                      planOfrendaTipo: planTipoE.trim() || undefined,
                      planOfrendaMonto: planMontoE ? Number(planMontoE) : undefined,
                      notas: notasE.trim() || undefined,
                    });
                    setEditandoColab(false);
                    recargar();
                  }}
                >
                  💾 Guardar cambios
                </button>
              </div>
            </>
          )}
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
              <select value={tipoAporte} onChange={(e) => setTipoAporte(e.target.value)}>
                {TIPOS_APORTE.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Método
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {METODOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>Monto<input type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
            <label>Referencia<input value={referencia} onChange={(e) => setReferencia(e.target.value)} /></label>
            <div className="form-acciones">
              <button
                className="btn btn-dorado"
                disabled={!monto || Number(monto) <= 0}
                onClick={async () => {
                  await registrarAporteRed(repo, {
                    colaboradorId: detalle.id,
                    fecha: fechaAporte,
                    monto: Number(monto),
                    tipo: tipoAporte,
                    metodo,
                    referencia: referencia.trim() || undefined,
                  });
                  setMonto('');
                  setReferencia('');
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
                      <ListaEdicion>
                        <FilaEdicion>
                    <input
                      type="date"
                      value={a.fecha}
                      onChange={async (e) => {
                        await actualizarAporteRed(repo, { ...a, fecha: e.target.value });
                        recargar();
                      }}
                    />
                    <select
                      value={a.tipo}
                      onChange={async (e) => {
                        await actualizarAporteRed(repo, { ...a, tipo: e.target.value });
                        recargar();
                      }}
                    >
                      {TIPOS_APORTE.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={a.metodo ?? 'Efectivo'}
                      onChange={async (e) => {
                        await actualizarAporteRed(repo, { ...a, metodo: e.target.value });
                        recargar();
                      }}
                    >
                      {METODOS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      defaultValue={a.monto}
                      style={{ width: '7em' }}
                      onBlur={async (e) => {
                        const v = Number(e.target.value);
                        if (v > 0 && v !== a.monto) {
                          await actualizarAporteRed(repo, { ...a, monto: v });
                          recargar();
                        }
                      }}
                    />
                    <input
                      type="text"
                      defaultValue={a.referencia ?? ''}
                      placeholder="Referencia"
                      style={{ width: '8em' }}
                      onBlur={async (e) => {
                        const v = e.target.value.trim();
                        if (v !== (a.referencia ?? '')) {
                          await actualizarAporteRed(repo, { ...a, referencia: v || undefined });
                          recargar();
                        }
                      }}
                    />
                    <BorrarBoton
                      texto="🗑️"
                      titulo="Borrar este aporte"
                      onBorrar={async () => {
                        await borrarAporteRed(repo, a.id);
                        recargar();
                      }}
                    />
                  
                          <button className="btn" title="Cerrar el editor" onClick={() => setEditandoAporte(null)}>
                            ✔
                          </button>
                        </FilaEdicion>
                      </ListaEdicion>
                    ) : (
                      <FilaRegistro
                        fecha={a.fecha}
                        nombre={a.tipo}
                        meta={`${a.metodo ?? 'Efectivo'}${a.referencia ? ` · ${a.referencia}` : ''}`}
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
