import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarCampana, actualizarEntrega, borrarBeneficiario, borrarCampana, borrarEntrega, crearBeneficiario, crearCampana, registrarEntrega } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';
import Modal from './Modal';
import { nombreDeEntrega, resumenManos } from '../motor/manosAbiertas';
import type { Campana } from '../modelo/tipos';


export default function ManosAbiertas({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [error, setError] = useState('');
  const [ver, setVer] = useState('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('zona');
  // Campañas
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
  // Entrega nueva
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

  if (!datos) return <p className="cargando">Cargando…</p>;

  const manos = resumenManos(datos);
  const campanaDetalle = campanaSel ? datos.campanas.find((c) => c.id === campanaSel) : undefined;
  const entregasDe = campanaDetalle
    ? datos.entregas
        .filter((e) => e.campanaId === campanaDetalle.id)
        .slice()
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    : [];
  const nombreBenefPorId = (beneficiarioId: string): string | undefined => {
    const b = datos.beneficiarios.find((x) => x.id === beneficiarioId);
    if (!b) return undefined;
    const p = b.personaId ? datos.personas.find((x) => x.id === b.personaId) : undefined;
    return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : 'Casa / Grupo';
  };

  const visibles = datos.beneficiarios.filter((b) => ver === 'todos' || (ver === 'activos' ? b.estado === 'Activo' : b.estado !== 'Activo'));
  const activos = datos.beneficiarios.filter((b) => b.estado === 'Activo').length;
  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);

  const alternar = async (b: (typeof visibles)[number]) => {
    await repo.guardar('beneficiarios', { ...b, estado: b.estado === 'Activo' ? 'Inactivo' : 'Activo' });
    recargar();
  };
  const claveGrupo = (b: (typeof visibles)[number]): string => {
    if (agruparPor === 'estado') return b.estado;
    const p = personaDe(b.personaId);
    return p?.zona?.trim() || 'Sin zona';
  };
  const nombreBeneficiario = (b: (typeof visibles)[number]) => {
    const p = personaDe(b.personaId);
    return p ? `${p.nombre} ${p.apellidos ?? ''}` : 'Casa / Grupo (sin representante)';
  };
  const filaBeneficiario = (b: (typeof visibles)[number]) => (
    <li key={b.id}>
      <div className="persona-fila">
        <span className="persona-nombre">{nombreBeneficiario(b)}</span>
        <span className={`chip ${b.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{b.estado}</span>
        <button className="btn" onClick={() => void alternar(b)}>
          {b.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
        </button>
        <BorrarBoton
          texto="🗑️ Quitar"
          titulo="Borrar el registro de beneficiario"
          onBorrar={async () => {
            await borrarBeneficiario(repo, b.id);
            recargar();
          }}
        />
      </div>
    </li>
  );
  const tarjetaBeneficiario = (b: (typeof visibles)[number]) => {
    const p = personaDe(b.personaId);
    return (
      <div key={b.id} className="persona-card">
        <span className="persona-nombre">{nombreBeneficiario(b)}</span>
        <span><span className={`chip ${b.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{b.estado}</span></span>
        <span className="persona-meta">{p?.zona ?? 'Sin zona'}{p?.telefono ? ` · ${p.telefono}` : ''}</span>
        <span>
          <button className="btn" onClick={() => void alternar(b)}>
            {b.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
          </button>{' '}
          <BorrarBoton
            texto="🗑️ Quitar"
            titulo="Borrar el registro de beneficiario"
            onBorrar={async () => {
              await borrarBeneficiario(repo, b.id);
              recargar();
            }}
          />
        </span>
      </div>
    );
  };

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>👐 Manos Abiertas</h1></header>
      <GuiaPagina texto="La ayuda organizada: las campañas (Desayuno con Jesús, Sopa con Jesús…) con sus entregas, y las casas y personas beneficiarias que las reciben." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <div className="kpi kpi-principal"><span className="kpi-numero">{activos}</span><span className="kpi-titulo">Beneficiarios activos</span></div>
        <div className="kpi"><span className="kpi-numero">{manos.campanasEnCurso}</span><span className="kpi-titulo">Campañas en curso</span></div>
        <div className="kpi"><span className="kpi-numero">{manos.entregasTotal}</span><span className="kpi-titulo">Entregas registradas</span></div>
        <div className="kpi"><span className="kpi-numero">{datos.beneficiarios.length}</span><span className="kpi-titulo">Beneficiarios en total</span></div>
      </section>
      <section className="tarjeta formulario">
        <h2>🎪 Campañas</h2>
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
          {datos.campanas.length === 0 && <li className="tenue">Sin campañas todavía: crea la primera abajo.</li>}
        </ul>
        <h3>➕ Nueva campaña</h3>
        <div className="form-fila">
          <label>Nombre *<input value={nombreC} onChange={(e) => setNombreC(e.target.value)} /></label>
          <label>Tipo<input value={tipoC} onChange={(e) => setTipoC(e.target.value)} /></label>
          <label>Zona<input value={zonaC} onChange={(e) => setZonaC(e.target.value)} /></label>
        </div>
        <div className="form-fila">
          <label>Responsable<input value={responsableC} onChange={(e) => setResponsableC(e.target.value)} /></label>
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
                recargar();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            💾 Crear campaña
          </button>
        </div>
      </section>
      <section className="tarjeta">
        <h2>➕ Nuevo beneficiario</h2>
        <SelectorPersona
          datos={datos}
          excluir={new Set(datos.beneficiarios.map((b) => b.personaId).filter(Boolean) as string[])}
          onElegir={async (personaId) => {
            setError('');
            try {
              await crearBeneficiario(repo, datos, personaId);
              recargar();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
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
          { valor: 'zona', etiqueta: 'Zona' },
          { valor: 'estado', etiqueta: 'Estado' },
        ]}
      />
      {vista === 'lista' && (
        <ul className="lista-personas">
          {visibles.map(filaBeneficiario)}
          {visibles.length === 0 && <li className="tenue">Sin beneficiarios para esta vista.</li>}
        </ul>
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
                {['Planificada', 'En curso', 'Terminada'].map((e) => (
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
                <label>Zona<input value={zonaCE} onChange={(e) => setZonaCE(e.target.value)} /></label>
              </div>
              <div className="form-fila">
                <label>Responsable<input value={responsableCE} onChange={(e) => setResponsableCE(e.target.value)} /></label>
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

          <h3>Entregas ({entregasDe.length})</h3>
          {entregasDe.length === 0 ? (
            <p className="tenue">Sin entregas registradas en esta campaña.</p>
          ) : (
            <ul className="historial-edit">
              {entregasDe.map((e) => (
                <li key={e.id}>
                  <input
                    type="date"
                    value={e.fecha}
                    onChange={async (ev) => {
                      await actualizarEntrega(repo, { ...e, fecha: ev.target.value });
                      recargar();
                    }}
                  />
                  <span>{nombreDeEntrega(e, nombreBenefPorId)}</span>
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
              ))}
            </ul>
          )}
          <div className="form-fila">
            <label>Fecha<input type="date" value={fechaE} onChange={(e) => setFechaE(e.target.value)} /></label>
            <label>
              Beneficiario
              <select value={benefSelE} onChange={(e) => setBenefSelE(e.target.value)}>
                <option value="">✍️ Nombre escrito a mano…</option>
                {datos.beneficiarios.map((b) => (
                  <option key={b.id} value={b.id}>{nombreBeneficiario(b)}</option>
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
                onClick={async () => {
                  await registrarEntrega(repo, {
                    campanaId: campanaDetalle.id,
                    beneficiarioId: benefSelE || undefined,
                    beneficiarioNombre: benefSelE ? undefined : nombreManualE.trim() || undefined,
                    fecha: fechaE,
                    tipo: tipoE.trim() || undefined,
                    cantidad: cantidadE ? Number(cantidadE) : undefined,
                    unidad: unidadE.trim() || undefined,
                    notas: notasE.trim() || undefined,
                  });
                  setTipoE(''); setCantidadE(''); setNombreManualE(''); setNotasE('');
                  recargar();
                }}
              >
                💾 Registrar entrega
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
