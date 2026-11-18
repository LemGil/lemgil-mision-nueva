import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { guardarEvangelismo } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';

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

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <h1>📣 Evangelismos</h1>
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo</button>
      </header>
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

      <ul className="lista-personas">
        {lista.map((e) => (
          <li key={e.id}>
            <div className="persona-fila">
              <span className="persona-nombre">{e.fecha}{e.lugar ? ` · ${e.lugar}` : ''}</span>
              <span className="persona-meta">
                {e.participanteIds.length} participantes
                {e.liderId ? ` · líder ${personaDe(e.liderId)?.nombre ?? ''}` : ''}
              </span>
            </div>
          </li>
        ))}
        {lista.length === 0 && <li className="tenue">Sin evangelismos registrados.</li>}
      </ul>
    </div>
  );
}
