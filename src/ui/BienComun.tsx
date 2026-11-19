import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarAporte, borrarAporte, borrarDiezmador, crearDiezmador, registrarAporte } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import { resumenBienComun } from '../motor/bienComun';
import SelectorPersona from './SelectorPersona';
import { anosConRegistros, mesesConRegistros } from '../motor/periodos';

import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';

import Modal from './Modal';
import GuiaPagina from './GuiaPagina';

const hoyIso = () => new Date().toISOString().slice(0, 10);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function BienComun({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [ano, setAno] = useState(0);
  const [mes, setMes] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ver, setVer] = useState('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('zona');
  const [monto, setMonto] = useState('');
  const [fechaAporte, setFechaAporte] = useState(hoyIso());
  const [tipoAporte, setTipoAporte] = useState<'Diezmo' | 'Ofrenda'>('Diezmo');

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

  const visibles = datos.diezmadores.filter((d) => ver === 'todos' || (ver === 'activos' ? d.activo : !d.activo));
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
  const fechasAportes = datos.aportes.map((a) => a.fecha);
  const mesesDisp = ano === 0 ? [] : mesesConRegistros(fechasAportes, ano);

  const claveGrupo = (d: (typeof visibles)[number]): string => {
    const p = personaDe(d.personaId);
    if (agruparPor === 'estado') return d.activo ? 'Activos' : 'Inactivos';
    if (agruparPor === 'grupo') {
      const g = p?.grupoId ? datos.grupos.find((x) => x.id === p.grupoId) : undefined;
      return g?.nombre ?? 'Sin grupo';
    }
    return p?.zona?.trim() || 'Sin zona';
  };
  const filaDiezmador = (d: (typeof visibles)[number]) => {
    const p = personaDe(d.personaId);
    return (
      <li key={d.id}>
        <button className={`persona-fila ${seleccionado === d.id ? 'activa' : ''}`} onClick={() => setSeleccionado(d.id)}>
          <span className="persona-nombre">{p?.nombre} {p?.apellidos ?? ''}</span>
          <span className="persona-meta">aportó {resumen.porPersona.get(d.personaId) ?? 0}{periodo ? ' en el período' : ''}</span>
          <span className={`chip ${d.activo ? 'chip-verde' : 'chip-gris'}`}>{d.activo ? 'Activo' : 'Inactivo'}</span>
        </button>
      </li>
    );
  };
  const tarjetaDiezmador = (d: (typeof visibles)[number]) => {
    const p = personaDe(d.personaId);
    return (
      <button key={d.id} className="persona-card" onClick={() => setSeleccionado(d.id)}>
        <span className="persona-nombre">{p?.nombre} {p?.apellidos ?? ''}</span>
        <span><span className={`chip ${d.activo ? 'chip-verde' : 'chip-gris'}`}>{d.activo ? 'Activo' : 'Inactivo'}</span></span>
        <span className="persona-meta">aportó {resumen.porPersona.get(d.personaId) ?? 0}{periodo ? ' en el período' : ''}</span>
        <span className="persona-meta">{p?.zona ?? 'Sin zona'}</span>
      </button>
    );
  };

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>🌾 Bien Común</h1></header>
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
        <div className="kpi kpi-principal"><span className="kpi-numero">{resumen.diezmadoresActivos}</span><span className="kpi-titulo">Diezmadores activos</span></div>
        <div className="kpi"><span className="kpi-numero">{resumen.diezmadoresInactivos}</span><span className="kpi-titulo">Inactivos</span></div>
        <div className="kpi"><span className="kpi-numero">{resumen.totalAportes}</span><span className="kpi-titulo">Total aportado{periodo ? ' en el período' : ''}</span></div>
        <div className="kpi"><span className="kpi-numero">{resumen.cantidadAportes}</span><span className="kpi-titulo">Aportes{periodo ? ' en el período' : ''}</span></div>
      </section>

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
          <h3>Aportes (editables)</h3>
          {aportesDe.length === 0 ? (
            <p className="tenue">Sin aportes registrados.</p>
          ) : (
            <>
              <ul className="historial-edit">
                {aportesDe.map((a) => (
                  <li key={a.id}>
                    <input
                      type="date"
                      value={a.fecha}
                      onChange={async (e) => {
                        await actualizarAporte(repo, { ...a, fecha: e.target.value });
                        recargar();
                      }}
                    />
                    <select
                      value={a.tipo}
                      onChange={async (e) => {
                        await actualizarAporte(repo, { ...a, tipo: e.target.value as 'Diezmo' | 'Ofrenda' });
                        recargar();
                      }}
                    >
                      <option value="Diezmo">Diezmo</option>
                      <option value="Ofrenda">Ofrenda</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      defaultValue={a.monto}
                      style={{ width: '7em' }}
                      onBlur={async (e) => {
                        const v = Number(e.target.value);
                        if (v > 0 && v !== a.monto) {
                          await actualizarAporte(repo, { ...a, monto: v });
                          recargar();
                        }
                      }}
                    />
                    <BorrarBoton
                      texto="🗑️"
                      titulo="Borrar este aporte"
                      onBorrar={async () => {
                        await borrarAporte(repo, a.id);
                        recargar();
                      }}
                    />
                  </li>
                ))}
              </ul>
              <p className="tenue">
                {aportesDe.length} aportes · total {aportesDe.reduce((x, a) => x + a.monto, 0)}.
                Toca la fecha, el tipo o el monto para corregirlos.
              </p>
            </>
          )}
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
        </Modal>
      )}
    </div>
  );
}
