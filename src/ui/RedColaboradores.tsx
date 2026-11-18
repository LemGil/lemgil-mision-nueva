import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarColaborador, crearColaborador, registrarAporteRed } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { Colaborador, DatosMinisterio, Periodo } from '../modelo/tipos';
import { anosConRegistros, mesesConRegistros } from '../motor/periodos';
import { nombreColaborador, resumenRed } from '../motor/red';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import GuiaPagina from './GuiaPagina';
import Modal from './Modal';

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
  const [error, setError] = useState('');
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
    (c) => ver === 'todos' || (ver === 'activos' ? c.estado === 'Activo' : c.estado !== 'Activo'),
  );
  const detalle = seleccionado ? datos.colaboradores.find((c) => c.id === seleccionado) : undefined;
  const aportesDe = detalle
    ? datos.aportesRed
        .filter((a) => a.colaboradorId === detalle.id)
        .slice()
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    : [];

  const claveGrupo = (c: Colaborador): string => {
    if (agruparPor === 'estado') return c.estado;
    return c.tipo?.trim() || 'Sin tipo';
  };

  const filaColaborador = (c: Colaborador) => (
    <li key={c.id}>
      <button className={`persona-fila ${seleccionado === c.id ? 'activa' : ''}`} onClick={() => setSeleccionado(c.id)}>
        <span className="persona-nombre">{nombreColaborador(c)}</span>
        <span className="persona-meta">
          {c.tipo ?? 'Sin tipo'} · aportó {resumen.porColaborador.get(c.id) ?? 0}
          {periodo ? ' en el período' : ''}
        </span>
        <span className={`chip ${c.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{c.estado}</span>
      </button>
    </li>
  );

  const tarjetaColaborador = (c: Colaborador) => (
    <button key={c.id} className="persona-card" onClick={() => setSeleccionado(c.id)}>
      <span className="persona-nombre">{nombreColaborador(c)}</span>
      <span>
        <span className={`chip ${c.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{c.estado}</span>{' '}
        <span className="chip chip-gris">{c.tipo ?? 'Sin tipo'}</span>
      </span>
      <span className="persona-meta">
        aportó {resumen.porColaborador.get(c.id) ?? 0}
        {periodo ? ' en el período' : ''}
      </span>
      <span className="persona-meta">{c.telefono ?? c.email ?? 'Sin contacto'}</span>
    </button>
  );

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>🤝 Red de Colaboradores</h1></header>
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
        <div className="kpi kpi-principal"><span className="kpi-numero">{resumen.activos}</span><span className="kpi-titulo">Colaboradores activos</span></div>
        <div className="kpi"><span className="kpi-numero">{resumen.inactivos}</span><span className="kpi-titulo">Inactivos</span></div>
        <div className="kpi"><span className="kpi-numero">{resumen.totalAportes}</span><span className="kpi-titulo">Total aportado{periodo ? ' en el período' : ''}</span></div>
        <div className="kpi"><span className="kpi-numero">{resumen.cantidadAportes}</span><span className="kpi-titulo">Aportes{periodo ? ' en el período' : ''}</span></div>
      </section>

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
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            💾 Crear colaborador
          </button>
        </div>
      </section>

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
              Plan: {detalle.planOfrendaTipo ?? ''} {detalle.planOfrendaMonto ?? ''}
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
          </button>
          <h3>Aportes</h3>
          {aportesDe.length === 0 ? (
            <p className="tenue">Sin aportes registrados.</p>
          ) : (
            <ul className="historial">
              {aportesDe.map((a) => (
                <li key={a.id}>
                  {a.fecha} · {a.tipo} · {a.monto}
                  {a.metodo ? ` · ${a.metodo}` : ''}
                  {a.referencia ? ` · ref. ${a.referencia}` : ''}
                </li>
              ))}
            </ul>
          )}
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
        </Modal>
      )}
    </div>
  );
}
