import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { borrarEvangelismo, guardarEvangelismo } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import BorrarBoton from './BorrarBoton';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, FilaAcciones, Kpi, Tarjeta } from './Piezas';
import { coincideBusqueda } from '../motor/personaVista';


const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function Evangelismos({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
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
  const nombreCompleto = (id?: string | null) => {
    const p = id ? personaDe(id) : undefined;
    return p ? `${p.nombre} ${p.apellidos ?? ''}` : undefined;
  };
  const lista = datos.evangelismos
    .filter((e) =>
      coincideBusqueda(busqueda, e.lugar, e.notas, nombreCompleto(e.liderId), ...e.participanteIds.map((id) => nombreCompleto(id))),
    )
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const MESES_NOM = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const claveGrupo = (e: (typeof lista)[number]): string => {
    if (agruparPor === 'lider') {
      const l = e.liderId ? personaDe(e.liderId) : undefined;
      return l ? `${l.nombre} ${l.apellidos ?? ''}`.trim() : 'Sin líder';
    }
    const m = Number(e.fecha.slice(5, 7));
    return `${MESES_NOM[m - 1] ?? e.fecha.slice(0, 7)} ${e.fecha.slice(0, 4)}`;
  };
  const comenzarEdicion = (e: (typeof lista)[number]) => {
    setEditandoId(e.id);
    setFecha(e.fecha);
    setLugar(e.lugar ?? '');
    setLiderId(e.liderId ?? null);
    setParticipantes(e.participanteIds);
    setMostrarForm(true);
  };
  const filaEvangelismo = (e: (typeof lista)[number]) => (
    <li key={e.id}>
      <FilaAcciones
        nombre={`${e.fecha}${e.lugar ? ` · ${e.lugar}` : ''}`}
        meta={`${e.participanteIds.length} participantes${e.liderId ? ` · líder ${personaDe(e.liderId)?.nombre ?? ''}` : ''}`}
        acciones={
          <>
            <button className="btn" onClick={() => comenzarEdicion(e)}>✏️</button>
            <BorrarBoton
              texto="🗑️"
              titulo="Borrar este evangelismo"
              onBorrar={async () => {
                await borrarEvangelismo(repo, e.id);
                recargar();
              }}
            />
          </>
        }
      />
    </li>
  );
  const tarjetaEvangelismo = (e: (typeof lista)[number]) => (
    <Tarjeta key={e.id} nombre={`📣 ${e.fecha}${e.lugar ? ` · ${e.lugar}` : ''}`}>
      <span className="persona-meta">
        {e.participanteIds.length} participantes
        {e.liderId ? ` · líder ${personaDe(e.liderId)?.nombre ?? ''} ${personaDe(e.liderId)?.apellidos ?? ''}` : ''}
      </span>
      <span className="persona-meta">
        {e.participanteIds.map((id) => personaDe(id)?.nombre).filter(Boolean).join(', ') || 'Sin participantes'}
      </span>
    </Tarjeta>
  );

  return (
    <div className="panel">
      <CabeceraPagina titulo="🔥 Evangelismos">
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo</button>
      </CabeceraPagina>
      <GuiaPagina texto="Las salidas evangelísticas: fecha, lugar, líder y participantes." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <Kpi principal icono="🔥" numero={datos.evangelismos.length} titulo="Evangelismos" />
        <Kpi icono="📅" numero={esteMes} titulo="Este mes" />
        <Kpi icono="👥" numero={participantesUnicos} titulo="Participantes (personas)" />
      </section>

      {mostrarForm && (
        <section className="tarjeta formulario">
          <h2>{editandoId ? '✏️ Editar evangelismo' : '➕ Nuevo evangelismo'}</h2>
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
                  await guardarEvangelismo(repo, { id: editandoId ?? undefined, fecha, lugar: lugar.trim() || undefined, liderId, participanteIds: participantes });
                  setMostrarForm(false);
                  setEditandoId(null);
                  setLugar(''); setLiderId(null); setParticipantes([]);
                  recargar();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              💾 Guardar
            </button>
            <button className="btn" onClick={() => { setMostrarForm(false); setEditandoId(null); }}>Cancelar</button>
          </div>
        </section>
      )}

      <Buscador>
        <input placeholder="🔍 Buscar por lugar, líder o participante…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </Buscador>
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
