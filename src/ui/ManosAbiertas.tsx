import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { crearBeneficiario } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import GuiaPagina from './GuiaPagina';


export default function ManosAbiertas({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [error, setError] = useState('');
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
          </button>
        </span>
      </div>
    );
  };

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>👐 Manos Abiertas</h1></header>
      <GuiaPagina texto="Las casas y personas que reciben ayuda, activas e inactivas." />
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
    </div>
  );
}
