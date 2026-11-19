import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import {
  actualizarBeneficiario,
  actualizarCampana,
  actualizarEntrega,
  borrarBeneficiario,
  borrarCampana,
  borrarEntrega,
  crearBeneficiario,
  crearBeneficiarioManual,
  crearCampana,
  registrarEntrega,
} from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { Beneficiario, DatosMinisterio, Entrega } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';
import Modal from './Modal';
import { InputNombre, InputZona } from './CamposLista';
import { nombreDeEntrega, resumenManos } from '../motor/manosAbiertas';

type Pestana = 'beneficiarios' | 'campanas' | 'entregas';
const TIPOS_BENEFICIARIO = ['Persona', 'Familia', 'Grupo'];
const ESTADOS_CAMPANA = ['Planificada', 'En curso', 'Terminada'];

export default function ManosAbiertas({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState<Pestana>('beneficiarios');
  // Beneficiarios
  const [ver, setVer] = useState('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('zona');
  const [mostrarBenef, setMostrarBenef] = useState(false);
  const [tipoBenef, setTipoBenef] = useState('Persona');
  const [nombreB, setNombreB] = useState('');
  const [representanteB, setRepresentanteB] = useState('');
  const [familiaB, setFamiliaB] = useState('');
  const [telefonoB, setTelefonoB] = useState('');
  const [zonaB, setZonaB] = useState('');
  const [benefSel, setBenefSel] = useState<string | null>(null);
  const [nombreBE, setNombreBE] = useState('');
  const [representanteBE, setRepresentanteBE] = useState('');
  const [familiaBE, setFamiliaBE] = useState('');
  const [telefonoBE, setTelefonoBE] = useState('');
  const [zonaBE, setZonaBE] = useState('');
  // Campañas
  const [mostrarCamp, setMostrarCamp] = useState(false);
  const [nombreC, setNombreC] = useState('');
  const [tipoC, setTipoC] = useState('Alimentaria');
  const [zonaC, setZonaC] = useState('');
  const [responsableC, setResponsableC] = useState('');
  const [inicioC, setInicioC] = useState('');
  const [finC, setFinC] = useState('');
  const [metaC, setMetaC] = useState('');
  const [descripcionC, setDescripcionC] = useState('');
  const [campanaSel, setCampanaSel] = useState<string | null>(null);
  const [editandoCamp, setEditandoCamp] = useState(false);
  const [nombreCE, setNombreCE] = useState('');
  const [tipoCE, setTipoCE] = useState('');
  const [zonaCE, setZonaCE] = useState('');
  const [responsableCE, setResponsableCE] = useState('');
  const [inicioCE, setInicioCE] = useState('');
  const [finCE, setFinCE] = useState('');
  const [metaCE, setMetaCE] = useState('');
  const [descripcionCE, setDescripcionCE] = useState('');
  // Entregas
  const [mostrarEntrega, setMostrarEntrega] = useState(false);
  const [filtroCampana, setFiltroCampana] = useState('');
  const [campanaE, setCampanaE] = useState('');
  const [fechaE, setFechaE] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoE, setTipoE] = useState('');
  const [cantidadE, setCantidadE] = useState('');
  const [unidadE, setUnidadE] = useState('personas');
  const [benefSelE, setBenefSelE] = useState('');
  const [nombreManualE, setNombreManualE] = useState('');
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

  if (!datos) {
    return (
      <div className="panel">
        <p className="tenue">Cargando…</p>
      </div>
    );
  }

  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);
  const nombreBeneficiario = (b: Beneficiario): string => {
    const p = b.personaId ? personaDe(b.personaId) : undefined;
    if (p) return `${p.nombre} ${p.apellidos ?? ''}`.trim();
    return b.nombre ?? 'Casa / Grupo';
  };
  const tipoDe = (b: Beneficiario): string => b.tipo ?? (b.personaId ? 'Persona' : 'Grupo');
  const zonaDe = (b: Beneficiario): string =>
    b.zona ?? (b.personaId ? personaDe(b.personaId)?.zona : undefined) ?? 'Sin zona';
  const nombreBenefPorId = (beneficiarioId: string): string | undefined => {
    const b = datos.beneficiarios.find((x) => x.id === beneficiarioId);
    return b ? nombreBeneficiario(b) : undefined;
  };
  const nombreCampana = (id: string): string =>
    datos.campanas.find((c) => c.id === id)?.nombre ?? 'Campaña borrada';

  const manos = resumenManos(datos);
  const activos = datos.beneficiarios.filter((b) => b.estado === 'Activo').length;

  // ── Beneficiarios ──
  const visibles = datos.beneficiarios.filter((b) =>
    ver === 'todos' ? true : ver === 'activos' ? b.estado === 'Activo' : b.estado !== 'Activo',
  );
  const claveGrupo = (b: Beneficiario): string => {
    if (agruparPor === 'tipo') return tipoDe(b);
    if (agruparPor === 'estado') return b.estado;
    return zonaDe(b);
  };
  const abrirBenef = (b: Beneficiario) => {
    setBenefSel(b.id);
    setNombreBE(b.nombre ?? '');
    setRepresentanteBE(b.representante ?? '');
    setFamiliaBE(b.familia ? String(b.familia) : '');
    setTelefonoBE(b.telefono ?? '');
    setZonaBE(b.zona ?? '');
  };
  const benefDetalle = benefSel ? datos.beneficiarios.find((b) => b.id === benefSel) : undefined;
  const filaBeneficiario = (b: Beneficiario) => (
    <li key={b.id}>
      <button className="persona-fila" onClick={() => abrirBenef(b)}>
        <span className="persona-nombre">{nombreBeneficiario(b)}</span>
        <span className="persona-meta">
          {tipoDe(b)}
          {b.familia ? ` · ${b.familia} personas` : ''}
          {` · ${zonaDe(b)}`}
          {b.representante ? ` · Resp.: ${b.representante}` : ''}
        </span>
        <span className={`chip ${b.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{b.estado}</span>
      </button>
    </li>
  );
  const tarjetaBeneficiario = (b: Beneficiario) => (
    <div key={b.id} className="persona-card">
      <button className="persona-fila" onClick={() => abrirBenef(b)}>
        <span className="persona-nombre">{nombreBeneficiario(b)}</span>
      </button>
      <span className="persona-meta">
        {tipoDe(b)}
        {b.familia ? ` · ${b.familia} personas` : ''}
        {` · ${zonaDe(b)}`}
      </span>
      <span className={`chip ${b.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{b.estado}</span>
    </div>
  );

  // ── Campañas ──
  const campanaDetalle = campanaSel ? datos.campanas.find((c) => c.id === campanaSel) : undefined;
  const entregasDe = campanaDetalle
    ? datos.entregas
        .filter((e) => e.campanaId === campanaDetalle.id)
        .slice()
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    : [];

  // ── Entregas (todas) ──
  const todasEntregas = datos.entregas
    .filter((e) => !filtroCampana || e.campanaId === filtroCampana)
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const filaEntrega = (e: Entrega, conCampana: boolean) => (
    <li key={e.id}>
      <input
        type="date"
        value={e.fecha}
        onChange={async (ev) => {
          await actualizarEntrega(repo, { ...e, fecha: ev.target.value });
          recargar();
        }}
      />
      <span>
        {nombreDeEntrega(e, nombreBenefPorId)}
        {conCampana ? ` · ${nombreCampana(e.campanaId)}` : ''}
      </span>
      <span className="tenue">
        {e.tipo ?? ''} · {e.cantidad ?? ''} {e.unidad ?? ''}
      </span>
      <BorrarBoton
        texto="🗑️"
        titulo="Borrar esta entrega"
        onBorrar={async () => {
          await borrarEntrega(repo, e.id);
          recargar();
        }}
      />
    </li>
  );

  const guardarEntrega = async (campanaId: string) => {
    await registrarEntrega(repo, {
      campanaId,
      beneficiarioId: benefSelE || undefined,
      beneficiarioNombre: benefSelE ? undefined : nombreManualE.trim() || undefined,
      fecha: fechaE,
      tipo: tipoE.trim() || undefined,
      cantidad: cantidadE ? Number(cantidadE) : undefined,
      unidad: unidadE.trim() || undefined,
      notas: notasE.trim() || undefined,
    });
    setTipoE('');
    setCantidadE('');
    setNombreManualE('');
    setNotasE('');
    recargar();
  };

  const formularioEntrega = (campanaFija?: string) => (
    <>
      <div className="form-fila">
        {!campanaFija && (
          <label>
            Campaña *
            <select value={campanaE} onChange={(e) => setCampanaE(e.target.value)}>
              <option value="">— Elige la campaña —</option>
              {datos.campanas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <label>Fecha<input type="date" value={fechaE} onChange={(e) => setFechaE(e.target.value)} /></label>
        <label>
          Beneficiario
          <select value={benefSelE} onChange={(e) => setBenefSelE(e.target.value)}>
            <option value="">✍️ Nombre escrito a mano…</option>
            {datos.beneficiarios.map((b) => (
              <option key={b.id} value={b.id}>
                {nombreBeneficiario(b)} ({tipoDe(b)})
              </option>
            ))}
          </select>
        </label>
        {!benefSelE && (
          <label>Nombre<input value={nombreManualE} onChange={(e) => setNombreManualE(e.target.value)} placeholder="Iglesia, casa, grupo…" /></label>
        )}
      </div>
      <div className="form-fila">
        <label>Tipo<input value={tipoE} onChange={(e) => setTipoE(e.target.value)} placeholder="Canasta básica, almuerzo…" /></label>
        <label>Cantidad<input type="number" min="0" value={cantidadE} onChange={(e) => setCantidadE(e.target.value)} /></label>
        <label>Unidad<input value={unidadE} onChange={(e) => setUnidadE(e.target.value)} /></label>
        <label>Notas<input value={notasE} onChange={(e) => setNotasE(e.target.value)} /></label>
        <div className="form-acciones">
          <button
            className="btn btn-dorado"
            disabled={!campanaFija && !campanaE}
            onClick={async () => {
              await guardarEntrega(campanaFija ?? campanaE);
              if (!campanaFija) setMostrarEntrega(false);
            }}
          >
            💾 Registrar entrega
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <h1>👐 Manos Abiertas</h1>
      </header>
      <GuiaPagina texto="La ayuda organizada en tres mesas: a quién se ayuda (Personas, Familias y Grupos), las campañas (Desayuno con Jesús, Sopa con Jesús…) y cada entrega que se hace." />
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <section className="kpis">
        <div className="kpi kpi-principal"><span className="kpi-numero">{activos}</span><span className="kpi-titulo">Beneficiarios activos</span></div>
        <div className="kpi"><span className="kpi-numero">{manos.campanasEnCurso}</span><span className="kpi-titulo">Campañas en curso</span></div>
        <div className="kpi"><span className="kpi-numero">{manos.entregasTotal}</span><span className="kpi-titulo">Entregas registradas</span></div>
        <div className="kpi"><span className="kpi-numero">{datos.beneficiarios.length}</span><span className="kpi-titulo">Beneficiarios en total</span></div>
      </section>

      <div className="pestanas">
        <button className={pestana === 'beneficiarios' ? 'pestana activa' : 'pestana'} onClick={() => setPestana('beneficiarios')}>
          🧑 Beneficiarios ({datos.beneficiarios.length})
        </button>
        <button className={pestana === 'campanas' ? 'pestana activa' : 'pestana'} onClick={() => setPestana('campanas')}>
          🎪 Campañas ({datos.campanas.length})
        </button>
        <button className={pestana === 'entregas' ? 'pestana activa' : 'pestana'} onClick={() => setPestana('entregas')}>
          📦 Entregas ({datos.entregas.length})
        </button>
      </div>

      {pestana === 'beneficiarios' && (
        <>
          {!mostrarBenef && (
            <div className="form-acciones">
              <button className="btn btn-dorado" onClick={() => setMostrarBenef(true)}>➕ Nuevo beneficiario</button>
            </div>
          )}
          {mostrarBenef && (
            <section className="tarjeta">
              <h2>➕ Nuevo beneficiario</h2>
              <div className="form-fila">
                <label>
                  ¿A quién se ayuda?
                  <select value={tipoBenef} onChange={(e) => setTipoBenef(e.target.value)}>
                    {TIPOS_BENEFICIARIO.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              {tipoBenef === 'Persona' ? (
                <>
                  <p className="tenue">Elige a la persona en la lista (queda enlazada a su ficha).</p>
                  <SelectorPersona
                    datos={datos}
                    excluir={new Set(datos.beneficiarios.map((b) => b.personaId).filter(Boolean) as string[])}
                    onElegir={async (personaId) => {
                      setError('');
                      try {
                        await crearBeneficiario(repo, datos, personaId);
                        setMostrarBenef(false);
                        recargar();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : String(e));
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="form-fila">
                    <label>Nombre de la {tipoBenef === 'Familia' ? 'familia' : 'casa o grupo'} *<input value={nombreB} onChange={(e) => setNombreB(e.target.value)} placeholder={tipoBenef === 'Familia' ? 'Familia Pérez…' : 'Casa de…'} /></label>
                    <label>Representante<input value={representanteB} onChange={(e) => setRepresentanteB(e.target.value)} /></label>
                    <label>Personas que la forman<input type="number" min="0" value={familiaB} onChange={(e) => setFamiliaB(e.target.value)} /></label>
                  </div>
                  <div className="form-fila">
                    <label>Teléfono<input value={telefonoB} onChange={(e) => setTelefonoB(e.target.value)} /></label>
                    <label>Zona<InputZona datos={datos} value={zonaB} onChange={setZonaB} /></label>
                    <div className="form-acciones">
                      <button
                        className="btn btn-dorado"
                        disabled={!nombreB.trim()}
                        onClick={async () => {
                          setError('');
                          try {
                            await crearBeneficiarioManual(repo, {
                              tipo: tipoBenef,
                              nombre: nombreB.trim(),
                              representante: representanteB.trim() || undefined,
                              familia: familiaB ? Number(familiaB) : undefined,
                              telefono: telefonoB.trim() || undefined,
                              zona: zonaB.trim() || undefined,
                            });
                            setNombreB(''); setRepresentanteB(''); setFamiliaB(''); setTelefonoB(''); setZonaB('');
                            setMostrarBenef(false);
                            recargar();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : String(e));
                          }
                        }}
                      >
                        💾 Agregar {tipoBenef === 'Familia' ? 'familia' : 'grupo'}
                      </button>
                    </div>
                  </div>
                </>
              )}
              <div className="form-acciones">
                <button className="btn" onClick={() => setMostrarBenef(false)}>Cerrar</button>
              </div>
            </section>
          )}

          <div className="vista-barra">
            <label>
              Ver:{' '}
              <select value={ver} onChange={(e) => setVer(e.target.value)}>
                <option value="activos">Solo activos</option>
                <option value="inactivos">Inactivos</option>
                <option value="todos">Todos</option>
              </select>
            </label>
          </div>
          <BarraVistas
            vista={vista}
            setVista={setVista}
            agruparPor={agruparPor}
            setAgruparPor={setAgruparPor}
            opciones={[
              { valor: 'zona', etiqueta: 'Zona' },
              { valor: 'tipo', etiqueta: 'Tipo' },
              { valor: 'estado', etiqueta: 'Estado' },
            ]}
          />
          {vista === 'lista' && (
            visibles.length === 0
              ? <p className="tenue">Sin beneficiarios para esta vista.</p>
              : <ul className="lista-personas">{visibles.map(filaBeneficiario)}</ul>
          )}
          {vista === 'tarjetas' && (
            visibles.length === 0
              ? <p className="tenue">Sin beneficiarios para esta vista.</p>
              : <div className="tarjetas-grid">{visibles.map(tarjetaBeneficiario)}</div>
          )}
          {vista === 'agrupada' && (
            visibles.length === 0
              ? <p className="tenue">Sin beneficiarios para esta vista.</p>
              : agrupar(visibles, claveGrupo).map((g) => (
                  <div key={g.titulo}>
                    <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                    <ul className="lista-personas">{g.items.map(filaBeneficiario)}</ul>
                  </div>
                ))
          )}
        </>
      )}

      {pestana === 'campanas' && (
        <>
          {!mostrarCamp && (
            <div className="form-acciones">
              <button className="btn btn-dorado" onClick={() => setMostrarCamp(true)}>➕ Nueva campaña</button>
            </div>
          )}
          {mostrarCamp && (
            <section className="tarjeta formulario">
              <h2>➕ Nueva campaña</h2>
              <div className="form-fila">
                <label>Nombre *<input value={nombreC} onChange={(e) => setNombreC(e.target.value)} /></label>
                <label>Tipo<input value={tipoC} onChange={(e) => setTipoC(e.target.value)} /></label>
                <label>Zona<InputZona datos={datos} value={zonaC} onChange={setZonaC} /></label>
              </div>
              <div className="form-fila">
                <label>Responsable<InputNombre datos={datos} value={responsableC} onChange={setResponsableC} /></label>
                <label>Inicio<input type="date" value={inicioC} onChange={(e) => setInicioC(e.target.value)} /></label>
                <label>Fin<input type="date" value={finC} onChange={(e) => setFinC(e.target.value)} /></label>
                <label>Meta (familias/personas)<input type="number" min="0" value={metaC} onChange={(e) => setMetaC(e.target.value)} /></label>
              </div>
              <div className="form-fila">
                <label>Descripción<input value={descripcionC} onChange={(e) => setDescripcionC(e.target.value)} /></label>
              </div>
              <div className="form-acciones">
                <button
                  className="btn btn-dorado"
                  disabled={!nombreC.trim()}
                  onClick={async () => {
                    setError('');
                    try {
                      await crearCampana(repo, {
                        nombre: nombreC.trim(),
                        tipo: tipoC.trim() || undefined,
                        zona: zonaC.trim() || undefined,
                        responsable: responsableC.trim() || undefined,
                        fechaInicio: inicioC || undefined,
                        fechaFin: finC || undefined,
                        metaFamilias: metaC ? Number(metaC) : undefined,
                        estado: 'En curso',
                        descripcion: descripcionC.trim() || undefined,
                      });
                      setNombreC(''); setZonaC(''); setResponsableC(''); setInicioC(''); setFinC(''); setMetaC(''); setDescripcionC('');
                      setMostrarCamp(false);
                      recargar();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                >
                  💾 Crear campaña
                </button>
                <button className="btn" onClick={() => setMostrarCamp(false)}>Cerrar</button>
              </div>
            </section>
          )}
          <ul className="lista-personas">
            {datos.campanas.map((c) => {
              const r = manos.porCampana.get(c.id);
              return (
                <li key={c.id}>
                  <button className="persona-fila" onClick={() => { setCampanaSel(c.id); setEditandoCamp(false); }}>
                    <span className="persona-nombre">{c.nombre}</span>
                    <span className="persona-meta">
                      {c.zona ?? 'Sin zona'}
                      {c.responsable ? ` · ${c.responsable}` : ''}
                      {r ? ` · ${r.entregas} entregas (${r.totalCantidad})` : ' · sin entregas'}
                    </span>
                    <span className={`chip ${c.estado === 'En curso' ? 'chip-verde' : 'chip-gris'}`}>{c.estado}</span>
                  </button>
                </li>
              );
            })}
            {datos.campanas.length === 0 && <li className="tenue">Sin campañas todavía: crea la primera con el botón de arriba.</li>}
          </ul>
        </>
      )}

      {pestana === 'entregas' && (
        <>
          {!mostrarEntrega && (
            <div className="form-acciones">
              <button className="btn btn-dorado" onClick={() => setMostrarEntrega(true)}>➕ Registrar entrega</button>
            </div>
          )}
          {mostrarEntrega && (
            <section className="tarjeta formulario">
              <h2>➕ Registrar entrega</h2>
              {formularioEntrega()}
              <div className="form-acciones">
                <button className="btn" onClick={() => setMostrarEntrega(false)}>Cerrar</button>
              </div>
            </section>
          )}
          <div className="vista-barra">
            <label>
              Campaña:{' '}
              <select value={filtroCampana} onChange={(e) => setFiltroCampana(e.target.value)}>
                <option value="">Todas</option>
                {datos.campanas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <span className="tenue">{todasEntregas.length} entregas</span>
          </div>
          {todasEntregas.length === 0 ? (
            <p className="tenue">Sin entregas para esta vista.</p>
          ) : (
            <ul className="historial-edit">{todasEntregas.map((e) => filaEntrega(e, true))}</ul>
          )}
        </>
      )}

      {benefDetalle && (
        <Modal onCerrar={() => setBenefSel(null)}>
          <h2>👐 {nombreBeneficiario(benefDetalle)}</h2>
          <p className="tenue">
            {tipoDe(benefDetalle)}
            {benefDetalle.familia ? ` · ${benefDetalle.familia} personas` : ''}
            {` · ${zonaDe(benefDetalle)}`}
            {benefDetalle.telefono ? ` · ${benefDetalle.telefono}` : ''}
          </p>
          <div className="form-fila">
            <label>
              Estado
              <select
                value={benefDetalle.estado}
                onChange={async (e) => {
                  await actualizarBeneficiario(repo, { ...benefDetalle, estado: e.target.value });
                  recargar();
                }}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
          </div>
          {!benefDetalle.personaId && (
            <>
              <div className="form-fila">
                <label>Nombre<input value={nombreBE} onChange={(e) => setNombreBE(e.target.value)} /></label>
                <label>Representante<input value={representanteBE} onChange={(e) => setRepresentanteBE(e.target.value)} /></label>
                <label>Personas que la forman<input type="number" min="0" value={familiaBE} onChange={(e) => setFamiliaBE(e.target.value)} /></label>
              </div>
              <div className="form-fila">
                <label>Teléfono<input value={telefonoBE} onChange={(e) => setTelefonoBE(e.target.value)} /></label>
                <label>Zona<InputZona datos={datos} value={zonaBE} onChange={setZonaBE} /></label>
              </div>
            </>
          )}
          {benefDetalle.personaId && (
            <div className="form-fila">
              <label>Teléfono<input value={telefonoBE} onChange={(e) => setTelefonoBE(e.target.value)} /></label>
              <label>Zona<InputZona datos={datos} value={zonaBE} onChange={setZonaBE} /></label>
              <label>Personas en su casa<input type="number" min="0" value={familiaBE} onChange={(e) => setFamiliaBE(e.target.value)} /></label>
            </div>
          )}
          <div className="form-acciones">
            <button
              className="btn btn-dorado"
              onClick={async () => {
                await actualizarBeneficiario(repo, {
                  ...benefDetalle,
                  nombre: benefDetalle.personaId ? benefDetalle.nombre : nombreBE.trim() || undefined,
                  representante: benefDetalle.personaId ? benefDetalle.representante : representanteBE.trim() || undefined,
                  familia: familiaBE ? Number(familiaBE) : undefined,
                  telefono: telefonoBE.trim() || undefined,
                  zona: zonaBE.trim() || undefined,
                });
                setBenefSel(null);
                recargar();
              }}
            >
              💾 Guardar cambios
            </button>
            <BorrarBoton
              texto="🗑️ Quitar beneficiario"
              titulo="Lo quita de Manos Abiertas (su ficha de persona no se toca)"
              onBorrar={async () => {
                await borrarBeneficiario(repo, benefDetalle.id);
                setBenefSel(null);
                recargar();
              }}
            />
          </div>
        </Modal>
      )}

      {campanaDetalle && (
        <Modal onCerrar={() => setCampanaSel(null)}>
          <h2>🎪 {campanaDetalle.nombre}</h2>
          <p className="tenue">
            {campanaDetalle.tipo ?? ''}
            {campanaDetalle.zona ? ` · Zona ${campanaDetalle.zona}` : ''}
            {campanaDetalle.responsable ? ` · Responsable: ${campanaDetalle.responsable}` : ''}
            {campanaDetalle.fechaInicio ? ` · ${campanaDetalle.fechaInicio} → ${campanaDetalle.fechaFin ?? ''}` : ''}
            {campanaDetalle.metaFamilias ? ` · Meta: ${campanaDetalle.metaFamilias} ${campanaDetalle.metaTipo ?? ''}` : ''}
          </p>
          {campanaDetalle.descripcion && <p className="tenue">📝 {campanaDetalle.descripcion}</p>}
          <div className="form-fila">
            <label>
              Estado
              <select
                value={campanaDetalle.estado}
                onChange={async (e) => {
                  await actualizarCampana(repo, { ...campanaDetalle, estado: e.target.value });
                  recargar();
                }}
              >
                {ESTADOS_CAMPANA.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </label>
            <div className="form-acciones">
              <button
                className="btn"
                onClick={() => {
                  setNombreCE(campanaDetalle.nombre);
                  setTipoCE(campanaDetalle.tipo ?? '');
                  setZonaCE(campanaDetalle.zona ?? '');
                  setResponsableCE(campanaDetalle.responsable ?? '');
                  setInicioCE(campanaDetalle.fechaInicio ?? '');
                  setFinCE(campanaDetalle.fechaFin ?? '');
                  setMetaCE(campanaDetalle.metaFamilias ? String(campanaDetalle.metaFamilias) : '');
                  setDescripcionCE(campanaDetalle.descripcion ?? '');
                  setEditandoCamp((v) => !v);
                }}
              >
                ✏️ Editar campaña
              </button>
              <BorrarBoton
                texto="🗑️ Borrar campaña"
                titulo="Borra la campaña y todas sus entregas"
                onBorrar={async () => {
                  await borrarCampana(repo, datos, campanaDetalle.id);
                  setCampanaSel(null);
                  recargar();
                }}
              />
            </div>
          </div>
          {editandoCamp && (
            <>
              <div className="form-fila">
                <label>Nombre *<input value={nombreCE} onChange={(e) => setNombreCE(e.target.value)} /></label>
                <label>Tipo<input value={tipoCE} onChange={(e) => setTipoCE(e.target.value)} /></label>
                <label>Zona<InputZona datos={datos} value={zonaCE} onChange={setZonaCE} /></label>
              </div>
              <div className="form-fila">
                <label>Responsable<InputNombre datos={datos} value={responsableCE} onChange={setResponsableCE} /></label>
                <label>Inicio<input type="date" value={inicioCE} onChange={(e) => setInicioCE(e.target.value)} /></label>
                <label>Fin<input type="date" value={finCE} onChange={(e) => setFinCE(e.target.value)} /></label>
                <label>Meta<input type="number" min="0" value={metaCE} onChange={(e) => setMetaCE(e.target.value)} /></label>
              </div>
              <div className="form-fila">
                <label>Descripción<input value={descripcionCE} onChange={(e) => setDescripcionCE(e.target.value)} /></label>
              </div>
              <div className="form-acciones">
                <button
                  className="btn btn-dorado"
                  disabled={!nombreCE.trim()}
                  onClick={async () => {
                    await actualizarCampana(repo, {
                      ...campanaDetalle,
                      nombre: nombreCE.trim(),
                      tipo: tipoCE.trim() || undefined,
                      zona: zonaCE.trim() || undefined,
                      responsable: responsableCE.trim() || undefined,
                      fechaInicio: inicioCE || undefined,
                      fechaFin: finCE || undefined,
                      metaFamilias: metaCE ? Number(metaCE) : undefined,
                      descripcion: descripcionCE.trim() || undefined,
                    });
                    setEditandoCamp(false);
                    recargar();
                  }}
                >
                  💾 Guardar cambios
                </button>
              </div>
            </>
          )}

          <h3>Entregas de esta campaña ({entregasDe.length})</h3>
          {entregasDe.length === 0 ? (
            <p className="tenue">Sin entregas registradas en esta campaña.</p>
          ) : (
            <ul className="historial-edit">{entregasDe.map((e) => filaEntrega(e, false))}</ul>
          )}
          {formularioEntrega(campanaDetalle.id)}
        </Modal>
      )}
    </div>
  );
}
