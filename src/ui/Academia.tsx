import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { crearEstudiante } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';

export default function Academia({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
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
  const activos = datos.estudiantes.filter((e) => e.estado === 'Activo').length;
  const personaDe = (id: string) => datos.personas.find((p) => p.id === id);

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>🎓 Academia</h1></header>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <div className="kpi kpi-principal"><span className="kpi-numero">{activos}</span><span className="kpi-titulo">Estudiantes activos</span></div>
        <div className="kpi"><span className="kpi-numero">{datos.estudiantes.length - activos}</span><span className="kpi-titulo">Inactivos</span></div>
        <div className="kpi"><span className="kpi-numero">{datos.estudiantes.length}</span><span className="kpi-titulo">Total</span></div>
      </section>
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
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </section>
      <ul className="lista-personas">
        {datos.estudiantes.map((e) => {
          const p = personaDe(e.personaId);
          return (
            <li key={e.id}>
              <div className="persona-fila">
                <span className="persona-nombre">{p?.nombre} {p?.apellidos ?? ''}</span>
                <span className={`chip ${e.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{e.estado}</span>
                <button
                  className="btn"
                  onClick={async () => {
                    await repo.guardar('estudiantes', { ...e, estado: e.estado === 'Activo' ? 'Inactivo' : 'Activo' });
                    recargar();
                  }}
                >
                  {e.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
                </button>
              </div>
            </li>
          );
        })}
        {datos.estudiantes.length === 0 && <li className="tenue">Sin estudiantes todavía.</li>}
      </ul>
    </div>
  );
}
