import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { guardarEvangelismo } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import GuiaPagina from './GuiaPagina';


const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function Evangelismos({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [fecha, setFecha] = useState(hoyIso());
  const [lugar, setLugar] = useState('');
  const [liderId, setLiderId] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('mes');
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
  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);
  const mes = hoyIso().slice(0, 7);
  const esteMes = datos.evangelismos.filter((e) => e.fecha.startsWith(mes)).length;
  const participantesUnicos = new Set(datos.evangelismos.flatMap((e) => e.participanteIds)).size;
  const lista = datos.evangelismos.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const MESES_NOM = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const claveGrupo = (e: (typeof lista)[number]): string => {
    if (agruparPor === 'lider') {
      const l = e.liderId ? personaDe(e.liderId) : undefined;
      return l ? `${l.nombre} ${l.apellidos ?? ''}`.trim() : 'Sin líder';
    }
    const m = Number(e.fecha.slice(5, 7));
    return `${MESES_NOM[m - 1] ?? e.fecha.slice(0, 7)} ${e.fecha.slice(0, 4)}`;
  };
  const filaEvangelismo = (e: (typeof lista)[number]) => (
    <li key={e.id}>
      <div className="persona-fila">
        <span className="persona-nombre">{e.fecha}{e.lugar ? ` · ${e.lugar}` : ''}</span>
        <span className="persona-meta">
          {e.participanteIds.length} participantes
          {e.liderId ? ` · líder ${personaDe(e.liderId)?.nombre ?? ''}` : ''}
        </span>
      </div>
    </li>
  );
  const tarjetaEvangelismo = (e: (typeof lista)[number]) => (
    <div key={e.id} className="persona-card">
      <span className="persona-nombre">📣 {e.fecha}{e.lugar ? ` · ${e.lugar}` : ''}</span>
      <span className="persona-meta">
        {e.participanteIds.length} participantes
        {e.liderId ? ` · líder ${personaDe(e.liderId)?.nombre ?? ''} ${personaDe(e.liderId)?.apellidos ?? ''}` : ''}
      </span>
      <span className="persona-meta">
        {e.participanteIds.map((id) => personaDe(id)?.nombre).filter(Boolean).join(', ') || 'Sin participantes'}
      </span>
    </div>
  );

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <h1>📣 Evangelismos</h1>
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo</button>
      </header>
      <GuiaPagina texto="Las salidas evangelísticas: fecha, lugar, líder y participantes." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <div className="kpi kpi-principal"><span className="kpi-numero">{datos.evangelismos.length}</span><span className="kpi-titulo">Evangelismos</span></div>
        <div className="kpi"><span className="kpi-numero">{esteMes}</span><span className="kpi-titulo">Este mes</span></div>
        <div className="kpi"><span className="kpi-numero">{participantesUnicos}</span><span className="kpi-titulo">Participantes (personas)</span></div>
      </section>

      {mostrarForm && (
        <section className="tarjeta formulario">
          <h2>➕ Nuevo evangelismo</h2>
          <div className="form-fila">
            <label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
            <label>Lugar<input value={lugar} onChange={(e) => setLugar(e.target.value)} /></label>
          </div>
          <p className="tenue">Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin elegir'}</p>
          <SelectorPersona datos={datos} onElegir={setLiderId} placeholder="🔍 Buscar al líder…" />
          <p className="tenue">Participantes ({participantes.length}): {participantes.map((id) => personaDe(id)?.nombre).filter(Boolean).join(', ') || 'ninguno'}</p>
          <SelectorPersona
            datos={datos}
            excluir={new Set(participantes)}
            onElegir={(id) => setParticipantes((prev) => [...prev, id])}
            placeholder="🔍 Agregar participante…"
          />
          <div className="form-acciones">
            <button
              className="btn btn-dorado"
              onClick={async () => {
                setError('');
                try {
                  await guardarEvangelismo(repo, { fecha, lugar: lugar.trim() || undefined, liderId, participanteIds: participantes });
                  setMostrarForm(false);
                  setLugar(''); setLiderId(null); setParticipantes([]);
                  recargar();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              💾 Guardar
            </button>
            <button className="btn" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </section>
      )}

      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[
          { valor: 'mes', etiqueta: 'Mes' },
          { valor: 'lider', etiqueta: 'Líder' },
        ]}
      />
      {vista === 'lista' && (
        <ul className="lista-personas">
          {lista.map(filaEvangelismo)}
          {lista.length === 0 && <li className="tenue">Sin evangelismos registrados.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        lista.length === 0
          ? <p className="tenue">Sin evangelismos registrados.</p>
          : <div className="tarjetas-grid">{lista.map(tarjetaEvangelismo)}</div>
      )}
      {vista === 'agrupada' && (
        lista.length === 0
          ? <p className="tenue">Sin evangelismos registrados.</p>
          : agrupar(lista, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaEvangelismo)}</ul>
              </div>
            ))
      )}
    </div>
  );
}
