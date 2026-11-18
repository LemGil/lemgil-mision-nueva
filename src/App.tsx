import { useEffect, useMemo, useState } from 'react';
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import {
  crearCliente,
  crearSincronizador,
  entrarYSincronizar,
  entradoGuardado,
  hayConexionConfigurada,
  olvidarEntrado,
  restaurarSesion,
} from './datos/conexion';
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
import RedColaboradores from './ui/RedColaboradores';
import Miembros from './ui/Miembros';
import Migrar from './ui/Migrar';
import Mision from './ui/Mision';
import Ministerios from './ui/Ministerios';
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
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [restaurando, setRestaurando] = useState(configurada);
  const [sync, setSync] = useState<Sincronizador | null>(null);
  const [estadoSync, setEstadoSync] = useState<EstadoSync | null>(null);

  // Al abrir (o refrescar): la sesión guardada en el equipo manda. Si
  // Supabase la reconoce, se entra sin pedir nada; si no hay red para
  // comprobarla pero este equipo ya entró antes, se entra igual a los
  // datos locales y la sync se pondrá al día cuando vuelva la conexión.
  useEffect(() => {
    if (!configurada) return;
    let vivo = true;
    void (async () => {
      const cliente = crearCliente();
      const s = await restaurarSesion(cliente, repo, setEstadoSync);
      if (!vivo) return;
      if (s) {
        setSync(s);
        setEstadoSync(s.estadoActual);
        setDentro(true);
      } else if (entradoGuardado()) {
        setSync(crearSincronizador(cliente, repo, setEstadoSync));
        setDentro(true);
      }
      setRestaurando(false);
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entrar = async (correo: string, contrasena: string) => {
    const s = await entrarYSincronizar(crearCliente(), repo, correo, contrasena, setEstadoSync);
    setSync(s);
    setEstadoSync(s.estadoActual);
    setDentro(true);
  };

  const salir = async () => {
    olvidarEntrado();
    try {
      await crearCliente().auth.signOut();
    } catch {
      /* sin red: la entrada local ya quedó olvidada */
    }
    window.location.reload();
  };

  if (restaurando)
    return (
      <div className="entrar">
        <div className="entrar-caja">
          <h1>Ministerio LemGil</h1>
          <p className="entrar-sub">Abriendo tu sesión guardada…</p>
        </div>
      </div>
    );
  if (!dentro) return <Entrar onEntrar={entrar} />;

  return (
    <HashRouter>
      <div className="app">
        <div className="barra-movil">
          <span className="menu-marca">Ministerio LemGil</span>
          <button
            type="button"
            className="barra-boton"
            aria-label={menuAbierto ? 'Recoger el menú' : 'Abrir el menú'}
            onClick={() => setMenuAbierto((v) => !v)}
          >
            {menuAbierto ? '✕' : '☰'}
          </button>
        </div>
        {menuAbierto && (
          <div className="menu-fondo" onClick={() => setMenuAbierto(false)} />
        )}
        <nav
          className={`menu ${menuAbierto ? 'abierto' : ''}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setMenuAbierto(false);
          }}
        >
          <button
            type="button"
            className="menu-cerrar"
            aria-label="Recoger el menú"
            onClick={() => setMenuAbierto(false)}
          >
            ✕
          </button>
          <div className="menu-marca">Ministerio LemGil</div>
          <div className="menu-grupo">Secretaría</div>
          <NavLink to="/" end>
            📊 Panel
          </NavLink>
          <NavLink to="/informe">📄 Informe</NavLink>
          <NavLink to="/personas">👥 Personas</NavLink>
          <NavLink to="/migrar">🧳 Migración</NavLink>
          <div className="menu-grupo">Mesas</div>
          <NavLink to="/mision">🧭 Misión</NavLink>
          <NavLink to="/miembros">🏠 Miembros</NavLink>
          <NavLink to="/ministerios">🤲 Ministerios</NavLink>
          <NavLink to="/academia">🎓 Academia</NavLink>
          <NavLink to="/grupos">👥 Grupos</NavLink>
          <NavLink to="/evangelismos">📣 Evangelismos</NavLink>
          <NavLink to="/bien-comun">🌾 Bien Común</NavLink>
          <NavLink to="/red">🤝 Red de Colaboradores</NavLink>
          <NavLink to="/manos-abiertas">👐 Manos Abiertas</NavLink>
          <NavLink to="/mapa">🗺️ Mapa</NavLink>
          {configurada && (
            <button type="button" className="menu-salir" onClick={() => void salir()}>
              🚪 Salir
            </button>
          )}
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
            <Route path="/ministerios" element={<Ministerios repo={repo} />} />
            <Route path="/academia" element={<Academia repo={repo} />} />
            <Route path="/grupos" element={<Grupos repo={repo} />} />
            <Route path="/evangelismos" element={<Evangelismos repo={repo} />} />
            <Route path="/bien-comun" element={<BienComun repo={repo} />} />
            <Route path="/red" element={<RedColaboradores repo={repo} />} />
            <Route path="/manos-abiertas" element={<ManosAbiertas repo={repo} />} />
            <Route path="/mapa" element={<Mapa repo={repo} />} />
            <Route path="/migrar" element={<Migrar repo={repo} />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
