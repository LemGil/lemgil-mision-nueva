import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { cargarCasoDePrueba } from '../datos/demo';
import type { Repo } from '../datos/repo';
import type { EstadoSync, Sincronizador } from '../datos/sync';
import type { DatosMinisterio } from '../modelo/tipos';
import { calcularCenso, type Censo } from '../motor/censo';
import { cumpleanosProximos, estancados, type CumpleProximo, type Estancado } from '../motor/alertas';
import { verificarCuadre, type ResultadoCuadre } from '../motor/cuadre';
import GuiaPagina from './GuiaPagina';
import { CabeceraPagina, Kpi } from './Piezas';

interface Props {
  repo: Repo;
  sync: Sincronizador | null;
  estadoSync: EstadoSync | null;
  modoLocal: boolean;
}

function mesActual(): { desde: string; hasta: string; nombre: string } {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const desde = new Date(y, m, 1);
  const hasta = new Date(y, m + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    desde: iso(desde),
    hasta: iso(hasta),
    nombre: hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
  };
}

export default function Panel({ repo, sync, estadoSync, modoLocal }: Props) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [censo, setCenso] = useState<Censo | null>(null);
  const [cuadre, setCuadre] = useState<ResultadoCuadre | null>(null);
  const [atascados, setAtascados] = useState<Estancado[]>([]);
  const [cumples, setCumples] = useState<CumpleProximo[]>([]);
  const [recargas, setRecargas] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const d = await aDatosMinisterio(repo);
      if (!vivo) return;
      setDatos(d);
      setCenso(calcularCenso(d, { periodo: mesActual() }));
      setCuadre(verificarCuadre(d));
      const hoyIso = new Date().toISOString().slice(0, 10);
      setAtascados(estancados(d, hoyIso));
      setCumples(cumpleanosProximos(d, hoyIso));
    })();
    return () => {
      vivo = false;
    };
  }, [repo, recargas, estadoSync?.ultimoCiclo]);

  const sincronizarAhora = async () => {
    if (!sync) return;
    setSincronizando(true);
    await sync.ciclo();
    setSincronizando(false);
    recargar();
  };

  const cargarPrueba = async () => {
    await cargarCasoDePrueba(repo);
    recargar();
  };

  if (!datos || !censo || !cuadre) return <p className="cargando">Cargando…</p>;

  const sinDatos = datos.personas.length === 0;
  const bajasTotal =
    censo.bajas.apartados + censo.bajas.traslados + censo.bajas.fallecidos + censo.bajas.otrasSalidas;
  const fallos = cuadre.chequeos.filter((c) => !c.ok);

  return (
    <div className="panel">
      <CabeceraPagina titulo="🏠 Panel">
        <div className="panel-estados">
          <span className={`chip ${cuadre.verde ? 'chip-verde' : 'chip-rojo'}`}>
            {cuadre.verde ? '🟢 El cuadre' : '🔴 El cuadre no cierra'}
          </span>
          {modoLocal ? (
            <span className="chip chip-gris">⚪ Modo local (sin proyecto conectado)</span>
          ) : estadoSync?.error ? (
            <span className="chip chip-rojo">🔴 {estadoSync.error}</span>
          ) : estadoSync && estadoSync.pendientes > 0 ? (
            <span className="chip chip-ambar">⏳ {estadoSync.pendientes} por subir</span>
          ) : (
            <span className="chip chip-verde">🟢 Al día</span>
          )}
          {sync && (
            <button className="btn" onClick={sincronizarAhora} disabled={sincronizando}>
              {sincronizando ? 'Sincronizando…' : '🔄 Sincronizar'}
            </button>
          )}
        </div>
      </CabeceraPagina>
      <GuiaPagina texto="La foto de la congregación hoy: cada persona cuenta una sola vez, en su etapa más avanzada. Aquí no se trabaja, se mira: el total, el cuadre, las alertas y el movimiento de este mes." />

      {!cuadre.verde && (
        <section className="aviso aviso-rojo">
          <strong>El cuadre no cierra:</strong>
          <ul>
            {fallos.map((f) => (
              <li key={f.nombre}>
                {f.nombre} — {f.detalle}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sinDatos ? (
        <section className="vacio">
          <p>
            La app nueva arranca vacía: tus datos llegan con la migración única, cuando el
            cuadre dé verde con ellos. Mientras tanto puedes verla trabajar con el caso de
            prueba de 2026 (los mismos datos de las pruebas del motor).
          </p>
          <button className="btn btn-dorado" onClick={cargarPrueba}>
            Cargar el caso de prueba
          </button>
        </section>
      ) : (
        <>
          <section className="kpis">
            <Kpi
              principal
              numero={censo.total}
              titulo="Total de Congregados"
              sub={<>{censo.enProceso} en proceso · {censo.miembros} miembros</>}
            />
            <Kpi numero={censo.enProceso} titulo="En proceso (personas)" />
            <Kpi numero={censo.miembros} titulo="Miembros" />
            <Kpi numero={censo.diezmadores} titulo="Diezmadores" sub="corte transversal" />
            <Kpi
              numero={bajasTotal}
              titulo="Bajas"
              sub={<>{censo.bajas.apartados} apartados · {censo.bajas.traslados} traslados ·{' '}{censo.bajas.fallecidos} fallecidos</>}
            />
            {censo.inactivos > 0 && (
              <Kpi numero={censo.inactivos} titulo="Inactivos" sub="fuera del total" />
            )}
          </section>

          <section className="tarjeta">
            <h2>👥 La congregación hoy</h2>
            <div className="franja">
              {censo.etapas.map((e) => (
                <span key={e.pasoId} className="franja-paso">
                  {e.emoji} {e.nombre} <strong>{e.cantidad}</strong>
                </span>
              ))}
              <span className="franja-paso franja-miembros">
                🏠 Miembros <strong>{censo.miembros}</strong>
              </span>
            </div>
            <p className="demografia">
              Hombres {censo.demografico.hombres} · Mujeres {censo.demografico.mujeres}
              {censo.demografico.sinDatoSexo > 0 &&
                ` · Sin dato ${censo.demografico.sinDatoSexo}`}{' '}
              — Niños {censo.demografico.ninos} · Jóvenes {censo.demografico.jovenes} ·
              Adultos {censo.demografico.adultos} · Ancianos {censo.demografico.ancianos}
              {censo.demografico.sinEdad > 0 && ` · Sin edad ${censo.demografico.sinEdad}`}
            </p>
          </section>

          {(atascados.length > 0 || cumples.length > 0) && (
            <section className="tarjeta">
              <h2>🔔 Alertas</h2>
              {atascados.length > 0 && (
                <>
                  <p className="alerta-titulo">
                    Estancados en el inicio del camino ({atascados.length}) — 30 días o más sin
                    avanzar:
                  </p>
                  <ul className="alerta-lista">
                    {atascados.slice(0, 8).map((e) => (
                      <li key={e.personaId + e.pasoNombre}>
                        {e.nombre} · {e.pasoEmoji} {e.pasoNombre} · {e.dias} días
                      </li>
                    ))}
                    {atascados.length > 8 && <li>…y {atascados.length - 8} más</li>}
                  </ul>
                </>
              )}
              {cumples.length > 0 && (
                <>
                  <p className="alerta-titulo">🎂 Cumpleaños próximos:</p>
                  <ul className="alerta-lista">
                    {cumples.slice(0, 8).map((c) => (
                      <li key={c.personaId}>
                        {c.nombre} · {c.diaMes} ·{' '}
                        {c.dias === 0 ? '¡hoy!' : c.dias === 1 ? 'mañana' : `en ${c.dias} días`}
                        {c.edadQueCumple ? ` · cumple ${c.edadQueCumple}` : ''}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {censo.periodo && (
            <section className="tarjeta">
              <h2>📅 Este mes ({mesActual().nombre})</h2>
              <p className="periodo-lineas">
                Confesiones <strong>{censo.periodo.confesiones}</strong> · Conversiones{' '}
                <strong>{censo.periodo.conversiones}</strong> · Bajas{' '}
                <strong>{censo.periodo.bajas}</strong>
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
