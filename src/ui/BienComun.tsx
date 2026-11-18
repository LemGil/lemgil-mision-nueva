import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { crearDiezmador, registrarAporte } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import { resumenBienComun } from '../motor/bienComun';
import SelectorPersona from './SelectorPersona';
import Modal from './Modal';

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
  const anoActual = new Date().getFullYear();

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>🌾 Bien Común</h1></header>
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <div className="selector-periodo">
        <label>
          📅 Aportes:{' '}
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            <option value={0}>Todo el tiempo</option>
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
      <ul className="lista-personas">
        {visibles.map((d) => {
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
        })}
        {visibles.length === 0 && <li className="tenue">Sin diezmadores para esta vista.</li>}
      </ul>

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
          </button>
          <h3>Aportes</h3>
          {aportesDe.length === 0 ? (
            <p className="tenue">Sin aportes registrados.</p>
          ) : (
            <ul className="historial">
              {aportesDe.map((a) => (
                <li key={a.id}>{a.fecha} · {a.tipo} · {a.monto}</li>
              ))}
            </ul>
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
