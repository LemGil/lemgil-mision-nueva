import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { borrarEstudiante, crearEstudiante } from '../datos/acciones';
import { nombresGruposDe } from '../motor/gruposVista';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, FilaAcciones, Kpi, Tarjeta } from './Piezas';
import { buscarPersonas } from '../motor/personaVista';


export default function Academia({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [ver, setVer] = useState('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('zona');
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

  const idsBuscadas = new Set(buscarPersonas(datos, busqueda).map((p) => p.id));
  const visibles = datos.estudiantes.filter(
    (e) => (ver === 'todos' || (ver === 'activos' ? e.estado === 'Activo' : e.estado !== 'Activo')) && idsBuscadas.has(e.personaId),
  );
  const activos = datos.estudiantes.filter((e) => e.estado === 'Activo').length;
  const personaDe = (id: string) => datos.personas.find((p) => p.id === id);

  const alternar = async (e: (typeof visibles)[number]) => {
    await repo.guardar('estudiantes', { ...e, estado: e.estado === 'Activo' ? 'Inactivo' : 'Activo' });
    recargar();
  };
  const claveGrupo = (e: (typeof visibles)[number]): string => {
    const p = personaDe(e.personaId);
    if (agruparPor === 'estado') return e.estado;
    if (agruparPor === 'grupo') {
      return (p ? nombresGruposDe(datos, p.id) : undefined) ?? 'Sin grupo';
    }
    return p?.zona?.trim() || 'Sin zona';
  };
  const filaEstudiante = (e: (typeof visibles)[number]) => {
    const p = personaDe(e.personaId);
    return (
      <li key={e.id}>
        <FilaAcciones
          nombre={`${p?.nombre} ${p?.apellidos ?? ''}`}
          derecha={<span className={`chip ${e.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{e.estado}</span>}
          acciones={
            <>
              <button className="btn" onClick={() => void alternar(e)}>
                {e.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
              </button>
              <BorrarBoton
                texto="🗑️ Quitar"
                titulo="Borrar el registro de estudiante"
                onBorrar={async () => {
                await borrarEstudiante(repo, e.id);
                recargar();
                }}
              />
            </>
          }
        />
      </li>
    );
  };
  const tarjetaEstudiante = (e: (typeof visibles)[number]) => {
    const p = personaDe(e.personaId);
    return (
      <Tarjeta key={e.id} nombre={`${p?.nombre ?? ''} ${p?.apellidos ?? ''}`}>
        <span><span className={`chip ${e.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{e.estado}</span></span>
        <span className="persona-meta">{[p?.zona, p ? nombresGruposDe(datos, p.id) : undefined].filter(Boolean).join(' · ') || 'Sin zona ni grupo'}</span>
        <span>
          <button className="btn" onClick={() => void alternar(e)}>
            {e.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
          </button>{' '}
          <BorrarBoton
            texto="🗑️ Quitar"
            titulo="Borrar el registro de estudiante"
            onBorrar={async () => {
              await borrarEstudiante(repo, e.id);
              recargar();
            }}
          />
        </span>
      </Tarjeta>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="🎓 Academia">
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo estudiante</button>
      </CabeceraPagina>
      <GuiaPagina texto="Los estudiantes de la Academia del Espíritu: quién está activo y quién no." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <Kpi principal icono="🎓" numero={activos} titulo="Estudiantes activos" />
        <Kpi icono="○" numero={datos.estudiantes.length - activos} titulo="Inactivos" />
        <Kpi icono="📚" numero={datos.estudiantes.length} titulo="Total" />
      </section>
      {mostrarForm && (
      <section className="tarjeta">
        <h2>➕ Nuevo estudiante</h2>
        <SelectorPersona
          datos={datos}
          excluir={new Set(datos.estudiantes.map((e) => e.personaId))}
          onElegir={async (personaId) => {
            setError('');
            try {
              await crearEstudiante(repo, datos, personaId);
              recargar();
              setMostrarForm(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
              <div className="form-acciones">
          <button className="btn" onClick={() => setMostrarForm(false)}>Cerrar</button>
        </div>
      </section>
      )}
      <Buscador>
        <input placeholder="🔍 Buscar estudiante…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </Buscador>
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
          {visibles.map(filaEstudiante)}
          {visibles.length === 0 && <li className="tenue">Sin estudiantes para esta vista.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        visibles.length === 0
          ? <p className="tenue">Sin estudiantes para esta vista.</p>
          : <div className="tarjetas-grid">{visibles.map(tarjetaEstudiante)}</div>
      )}
      {vista === 'agrupada' && (
        visibles.length === 0
          ? <p className="tenue">Sin estudiantes para esta vista.</p>
          : agrupar(visibles, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaEstudiante)}</ul>
              </div>
            ))
      )}
    </div>
  );
}
