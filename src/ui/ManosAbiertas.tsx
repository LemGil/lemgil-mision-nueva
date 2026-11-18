import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { crearBeneficiario } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';

export default function ManosAbiertas({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [error, setError] = useState('');
  const [ver, setVer] = useState('activos');
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

  const visibles = datos.beneficiarios.filter((b) => ver === 'todos' || (ver === 'activos' ? b.estado === 'Activo' : b.estado !== 'Activo'));
  const activos = datos.beneficiarios.filter((b) => b.estado === 'Activo').length;
  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>👐 Manos Abiertas</h1></header>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <div className="kpi kpi-principal"><span className="kpi-numero">{activos}</span><span className="kpi-titulo">Beneficiarios activos</span></div>
        <div className="kpi"><span className="kpi-numero">{datos.beneficiarios.length}</span><span className="kpi-titulo">Total</span></div>
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
      <ul className="lista-personas">
        {visibles.map((b) => {
          const p = personaDe(b.personaId);
          return (
            <li key={b.id}>
              <div className="persona-fila">
                <span className="persona-nombre">{p ? `${p.nombre} ${p.apellidos ?? ''}` : 'Casa / Grupo (sin representante)'}</span>
                <span className={`chip ${b.estado === 'Activo' ? 'chip-verde' : 'chip-gris'}`}>{b.estado}</span>
                <button
                  className="btn"
                  onClick={async () => {
                    await repo.guardar('beneficiarios', { ...b, estado: b.estado === 'Activo' ? 'Inactivo' : 'Activo' });
                    recargar();
                  }}
                >
                  {b.estado === 'Activo' ? 'Pasar a Inactivo' : 'Reactivar'}
                </button>
              </div>
            </li>
          );
        })}
        {visibles.length === 0 && <li className="tenue">Sin beneficiarios para esta vista.</li>}
      </ul>
    </div>
  );
}
