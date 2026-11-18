import { useMemo, useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { crearCliente, entrarYSincronizar, hayConexionConfigurada } from './datos/conexion';
import { BaseLocal, instalarVigilanciaDeVersion } from './datos/db';
import { Repo } from './datos/repo';
import { sembrarCatalogoSiVacio } from './datos/aDatosMinisterio';
import type { EstadoSync, Sincronizador } from './datos/sync';
import BienComun from './ui/BienComun';
import Entrar from './ui/Entrar';
import Evangelismos from './ui/Evangelismos';
import Grupos from './ui/Grupos';
import Informe from './ui/Informe';
import ManosAbiertas from './ui/ManosAbiertas';
import Mapa from './ui/Mapa';
import Miembros from './ui/Miembros';
import Mision from './ui/Mision';
import Panel from './ui/Panel';
import Personas from './ui/Personas';
import Academia from './ui/Academia';

export default function App() {
  const { db, repo } = useMemo(() => {
    const db = new BaseLocal();
    instalarVigilanciaDeVersion(db, () => window.location.reload());
    const repo = new Repo(db);
    void sembrarCatalogoSiVacio(repo);
    return { db, repo };
  }, []);
  void db;

  const configurada = hayConexionConfigurada();
  const [dentro, setDentro] = useState(!configurada);
  const [sync, setSync] = useState<Sincronizador | null>(null);
  const [estadoSync, setEstadoSync] = useState<EstadoSync | null>(null);

  const entrar = async (correo: string, contrasena: string) => {
    const s = await entrarYSincronizar(crearCliente(), repo, correo, contrasena, setEstadoSync);
    setSync(s);
    setEstadoSync(s.estadoActual);
    setDentro(true);
  };

  if (!dentro) return <Entrar onEntrar={entrar} />;

  return (
    <HashRouter>
      <div className="app">
        <nav className="menu">
          <div className="menu-marca">Ministerio LemGil</div>
          <div className="menu-grupo">Secretaría</div>
          <NavLink to="/" end>
            📊 Panel
          </NavLink>
          <NavLink to="/informe">📄 Informe</NavLink>
          <NavLink to="/personas">👥 Personas</NavLink>
          <div className="menu-grupo">Mesas</div>
          <NavLink to="/mision">🧭 Misión</NavLink>
          <NavLink to="/miembros">🏠 Miembros</NavLink>
          <NavLink to="/academia">🎓 Academia</NavLink>
          <NavLink to="/grupos">👥 Grupos</NavLink>
          <NavLink to="/evangelismos">📣 Evangelismos</NavLink>
          <NavLink to="/bien-comun">🌾 Bien Común</NavLink>
          <NavLink to="/manos-abiertas">👐 Manos Abiertas</NavLink>
          <NavLink to="/mapa">🗺️ Mapa</NavLink>
        </nav>
        <main className="contenido">
          <Routes>
            <Route
              path="/"
              element={
                <Panel repo={repo} sync={sync} estadoSync={estadoSync} modoLocal={!configurada} />
              }
            />
            <Route path="/informe" element={<Informe repo={repo} />} />
            <Route path="/personas" element={<Personas repo={repo} />} />
            <Route path="/mision" element={<Mision repo={repo} />} />
            <Route path="/miembros" element={<Miembros repo={repo} />} />
            <Route path="/academia" element={<Academia repo={repo} />} />
            <Route path="/grupos" element={<Grupos repo={repo} />} />
            <Route path="/evangelismos" element={<Evangelismos repo={repo} />} />
            <Route path="/bien-comun" element={<BienComun repo={repo} />} />
            <Route path="/manos-abiertas" element={<ManosAbiertas repo={repo} />} />
            <Route path="/mapa" element={<Mapa repo={repo} />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
