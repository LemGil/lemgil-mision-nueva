import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { registrarPersona, type EntradaMision } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio, Sexo } from '../modelo/tipos';
import { buscarPersonas, fichaDePersona, situacionDe } from '../motor/personaVista';
import Modal from './Modal';

const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function Personas({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [recargas, setRecargas] = useState(0);

  // Formulario de registro (el único que teclea datos nuevos)
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [carnet, setCarnet] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sexo, setSexo] = useState<Sexo>(null);
  const [nacimiento, setNacimiento] = useState('');
  const [altaMision, setAltaMision] = useState(false);
  const [entrada, setEntrada] = useState<EntradaMision>('alcanzado');
  const [altaIntegrado, setAltaIntegrado] = useState(false);
  const [altaBeneficiario, setAltaBeneficiario] = useState(false);
  const [errorForm, setErrorForm] = useState('');

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

  const lista = buscarPersonas(datos, busqueda);
  const ficha = seleccionada ? fichaDePersona(datos, seleccionada) : null;
  const nombrePasoEntrada = (e: EntradaMision) =>
    datos.pasos.find((p) => p.id === { alcanzado: 'ps-congregado', confeso: 'ps-confeso', converso: 'ps-nuevo', bautizado: 'ps-bautizado' }[e])?.nombre ?? e;

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrorForm('');
    try {
      const persona = await registrarPersona(
        repo,
        datos,
        {
          nombre: nombre.trim(),
          apellidos: apellidos.trim() || undefined,
          numeroIdentidad: carnet.trim() || undefined,
          telefono: telefono.trim() || undefined,
          sexo,
          fechaNacimiento: nacimiento || undefined,
        },
        {
          mision: altaIntegrado ? undefined : altaMision ? entrada : undefined,
          integrado: altaIntegrado,
          beneficiario: altaBeneficiario,
        },
        hoyIso(),
      );
      setMostrarForm(false);
      setNombre(''); setApellidos(''); setCarnet(''); setTelefono('');
      setSexo(null); setNacimiento('');
      setAltaMision(false); setAltaIntegrado(false); setAltaBeneficiario(false);
      setSeleccionada(persona.id);
      recargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <h1>Personas</h1>
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>
          ➕ Nueva persona
        </button>
      </header>

      {mostrarForm && (
        <form className="tarjeta formulario" onSubmit={guardar}>
          <h2>➕ Nueva persona</h2>
          <div className="form-fila">
            <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></label>
            <label>Apellidos<input value={apellidos} onChange={(e) => setApellidos(e.target.value)} /></label>
          </div>
          <div className="form-fila">
            <label>Nº de Identidad<input value={carnet} onChange={(e) => setCarnet(e.target.value)} /></label>
            <label>Teléfono<input value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
          </div>
          <div className="form-fila">
            <label>
              Sexo
              <select value={sexo ?? ''} onChange={(e) => setSexo((e.target.value || null) as Sexo)}>
                <option value="">Sin especificar</option>
                <option value="M">Hombre</option>
                <option value="F">Mujer</option>
              </select>
            </label>
            <label>Fecha de nacimiento<input type="date" value={nacimiento} onChange={(e) => setNacimiento(e.target.value)} /></label>
          </div>
          <fieldset className="altas">
            <legend>Al guardar, dar de alta también como:</legend>
            <label className="check">
              <input type="checkbox" checked={altaMision} disabled={altaIntegrado} onChange={(e) => setAltaMision(e.target.checked)} />
              En Misión, entrando como:
            </label>
            <div className="radios">
              {(['alcanzado', 'confeso', 'converso', 'bautizado'] as EntradaMision[]).map((e) => (
                <label key={e} className="check">
                  <input type="radio" name="entrada" checked={entrada === e} disabled={!altaMision || altaIntegrado} onChange={() => setEntrada(e)} />
                  {nombrePasoEntrada(e)}
                  {e === 'bautizado' && ' — llega de traslado, ya bautizado'}
                </label>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" checked={altaIntegrado} onChange={(e) => setAltaIntegrado(e.target.checked)} />
              Integrado → Miembro directo
            </label>
            <label className="check">
              <input type="checkbox" checked={altaBeneficiario} onChange={(e) => setAltaBeneficiario(e.target.checked)} />
              Beneficiario → Manos Abiertas
            </label>
          </fieldset>
          {errorForm && <p className="aviso aviso-rojo">{errorForm}</p>}
          <div className="form-acciones">
            <button className="btn btn-dorado" type="submit">💾 Guardar</button>
            <button className="btn" type="button" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="buscador">
        <input
          placeholder="🔍 Buscar por nombre, teléfono o Nº de Identidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <span className="tenue">
          {busqueda ? `Mostrando ${lista.length} de ${datos.personas.length}` : `${datos.personas.length} personas`}
        </span>
      </div>

      <ul className="lista-personas">
        {lista.map((p) => {
          const sit = situacionDe(datos, p.id);
          const fichaP = fichaDePersona(datos, p.id);
          return (
            <li key={p.id}>
              <button className={`persona-fila ${seleccionada === p.id ? 'activa' : ''}`} onClick={() => setSeleccionada(p.id)}>
                <span className="persona-nombre">{p.nombre} {p.apellidos ?? ''}</span>
                <span className="persona-meta">{p.telefono ?? 'Sin teléfono'}{p.numeroIdentidad ? ` · ${p.numeroIdentidad}` : ''}</span>
                <span className={`chip chip-${sit.tono}`}>{sit.texto}</span>
                {fichaP && fichaP.repetidos.length > 0 && (
                  <span className="chip chip-rojo">
                    ⚠ {fichaP.repetidos.map((r) => `${r.cantidad} en ${r.proceso}`).join(' · ')}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {lista.length === 0 && <li className="tenue">Sin coincidencias.</li>}
      </ul>

      {ficha && (
        <Modal onCerrar={() => setSeleccionada(null)}>
          <h2>
            {ficha.persona.nombre} {ficha.persona.apellidos ?? ''}{' '}
            <span className={`chip chip-${ficha.situacion.tono}`}>{ficha.situacion.texto}</span>
          </h2>
          {ficha.repetidos.length > 0 && (
            <p className="aviso aviso-rojo">
              ⚠ Esta persona tiene procesos repetidos:{' '}
              {ficha.repetidos.map((r) => `${r.cantidad} en ${r.proceso}`).join(' · ')}. Deja el
              registro bueno y borra el sobrante en su módulo.
            </p>
          )}
          <p className="tenue">
            {ficha.persona.numeroIdentidad && <>Nº de Identidad {ficha.persona.numeroIdentidad} · </>}
            {ficha.persona.telefono && <>Tel. {ficha.persona.telefono} · </>}
            {ficha.persona.fechaNacimiento && <>Nació {ficha.persona.fechaNacimiento} · </>}
            {ficha.persona.sexo && <>{ficha.persona.sexo === 'M' ? 'Hombre' : 'Mujer'}</>}
          </p>

          {ficha.mision.map((m) => (
            <div key={m.conversion.id} className="proceso">
              <h3>🧭 Misión — {m.pasoEmoji} {m.pasoNombre}</h3>
              {m.historial.length > 0 && (
                <ul className="historial">
                  {m.historial.map((h, i) => (
                    <li key={i}>{h.fecha} · {h.pasoNombre}{h.nota ? ` · ${h.nota}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {ficha.escaleras.map(({ miembro, escalera }) => (
            <div key={miembro.id} className="proceso">
              <h3>🏠 Miembro — {miembro.estado} (desde {miembro.fechaIngreso})</h3>
              <div className="franja">
                {escalera.estados.map((e) => (
                  <span key={e.paso.id} className={`franja-paso ${e.cumplido ? 'paso-hecho' : 'paso-falta'}`}>
                    {e.cumplido ? '✓' : '○'} {e.paso.emoji} {e.paso.nombre}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {ficha.estudiante && (
            <div className="proceso"><h3>🎓 Academia — estudiante {ficha.estudiante.estado}</h3></div>
          )}
          {ficha.diezmador && (
            <div className="proceso"><h3>🌾 Bien Común — diezmador {ficha.diezmador.activo ? 'activo' : 'inactivo'}</h3></div>
          )}
          {ficha.beneficiario && (
            <div className="proceso"><h3>👐 Manos Abiertas — beneficiario {ficha.beneficiario.estado}</h3></div>
          )}
          {ficha.mision.length === 0 && ficha.miembros.length === 0 && !ficha.estudiante && !ficha.diezmador && !ficha.beneficiario && (
            <p className="tenue">Sin procesos todavía.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
