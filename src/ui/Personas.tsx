import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarPersona, registrarPersona, type EntradaMision } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio, Persona, Sexo } from '../modelo/tipos';
import { buscarPersonas, fichaDePersona, situacionDe } from '../motor/personaVista';
import Modal from './Modal';

const hoyIso = () => new Date().toISOString().slice(0, 10);
const txt = (v: string) => v.trim() || undefined;

/** Los campos de datos de la persona, compartidos por el registro y la
 * edición: un solo juego de campos para la ficha única. */
interface Campos {
  nombre: string;
  apellidos: string;
  carnet: string;
  telefono: string;
  sexo: Sexo;
  nacimiento: string;
  direccion: string;
  zona: string;
  profesion: string;
  estadoCivil: string;
  conyuge: string;
  hijos: string;
  contacto: string;
  email: string;
  bautizado: boolean;
  fechaBautismo: string;
  grupoId: string;
  hermanoMayorId: string;
}

const camposDe = (p?: Persona): Campos => ({
  nombre: p?.nombre ?? '',
  apellidos: p?.apellidos ?? '',
  carnet: p?.numeroIdentidad ?? '',
  telefono: p?.telefono ?? '',
  sexo: p?.sexo ?? null,
  nacimiento: p?.fechaNacimiento ?? '',
  direccion: p?.direccion ?? '',
  zona: p?.zona ?? '',
  profesion: p?.profesion ?? '',
  estadoCivil: p?.estadoCivil ?? '',
  conyuge: p?.conyuge ?? '',
  hijos: p?.hijos ?? '',
  contacto: p?.contactoPreferido ?? '',
  email: p?.email ?? '',
  bautizado: p?.bautizado ?? false,
  fechaBautismo: p?.fechaBautismo ?? '',
  grupoId: p?.grupoId ?? '',
  hermanoMayorId: p?.hermanoMayorId ?? '',
});

const personaDe = (c: Campos): Omit<Persona, 'id'> => ({
  nombre: c.nombre.trim(),
  apellidos: txt(c.apellidos),
  numeroIdentidad: txt(c.carnet),
  telefono: txt(c.telefono),
  sexo: c.sexo,
  fechaNacimiento: c.nacimiento || undefined,
  direccion: txt(c.direccion),
  zona: txt(c.zona),
  profesion: txt(c.profesion),
  estadoCivil: txt(c.estadoCivil),
  conyuge: txt(c.conyuge),
  hijos: txt(c.hijos),
  contactoPreferido: txt(c.contacto),
  email: txt(c.email),
  bautizado: c.bautizado,
  fechaBautismo: c.bautizado ? c.fechaBautismo || undefined : undefined,
  grupoId: c.grupoId || null,
  hermanoMayorId: c.hermanoMayorId || null,
});

function FormularioCampos({
  campos,
  set,
  datos,
  excluirId,
}: {
  campos: Campos;
  set: (c: Campos) => void;
  datos: DatosMinisterio;
  excluirId?: string;
}) {
  const u = (parcial: Partial<Campos>) => set({ ...campos, ...parcial });
  return (
    <>
      <div className="form-fila">
        <label>Nombre<input value={campos.nombre} onChange={(e) => u({ nombre: e.target.value })} required /></label>
        <label>Apellidos<input value={campos.apellidos} onChange={(e) => u({ apellidos: e.target.value })} /></label>
      </div>
      <div className="form-fila">
        <label>Nº de Identidad<input value={campos.carnet} onChange={(e) => u({ carnet: e.target.value })} /></label>
        <label>Teléfono<input value={campos.telefono} onChange={(e) => u({ telefono: e.target.value })} /></label>
      </div>
      <div className="form-fila">
        <label>
          Sexo
          <select value={campos.sexo ?? ''} onChange={(e) => u({ sexo: (e.target.value || null) as Sexo })}>
            <option value="">Sin especificar</option>
            <option value="M">Hombre</option>
            <option value="F">Mujer</option>
          </select>
        </label>
        <label>Fecha de nacimiento<input type="date" value={campos.nacimiento} onChange={(e) => u({ nacimiento: e.target.value })} /></label>
      </div>
      <div className="form-fila">
        <label>Dirección<input value={campos.direccion} onChange={(e) => u({ direccion: e.target.value })} /></label>
        <label>Zona<input value={campos.zona} onChange={(e) => u({ zona: e.target.value })} /></label>
      </div>
      <div className="form-fila">
        <label>Profesión<input value={campos.profesion} onChange={(e) => u({ profesion: e.target.value })} /></label>
        <label>Estado civil<input value={campos.estadoCivil} onChange={(e) => u({ estadoCivil: e.target.value })} /></label>
      </div>
      <div className="form-fila">
        <label>Cónyuge<input value={campos.conyuge} onChange={(e) => u({ conyuge: e.target.value })} /></label>
        <label>Hijos<input value={campos.hijos} onChange={(e) => u({ hijos: e.target.value })} /></label>
      </div>
      <div className="form-fila">
        <label>Contacto preferido<input value={campos.contacto} onChange={(e) => u({ contacto: e.target.value })} /></label>
        <label>Correo<input value={campos.email} onChange={(e) => u({ email: e.target.value })} /></label>
      </div>
      <div className="form-fila">
        <label>
          Grupo
          <select value={campos.grupoId} onChange={(e) => u({ grupoId: e.target.value })}>
            <option value="">Sin grupo</option>
            {datos.grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Hermano mayor
          <select value={campos.hermanoMayorId} onChange={(e) => u({ hermanoMayorId: e.target.value })}>
            <option value="">Sin hermano mayor</option>
            {datos.personas
              .filter((p) => p.id !== excluirId)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos ?? ''}</option>
              ))}
          </select>
        </label>
      </div>
      <div className="form-fila">
        <label className="check">
          <input type="checkbox" checked={campos.bautizado} onChange={(e) => u({ bautizado: e.target.checked })} />
          Bautizado en aguas
        </label>
        {campos.bautizado && (
          <label>Fecha de bautismo<input type="date" value={campos.fechaBautismo} onChange={(e) => u({ fechaBautismo: e.target.value })} /></label>
        )}
      </div>
    </>
  );
}

export default function Personas({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(false);
  const [recargas, setRecargas] = useState(0);

  const [campos, setCampos] = useState<Campos>(camposDe());
  const [camposEdicion, setCamposEdicion] = useState<Campos>(camposDe());
  const [altaMision, setAltaMision] = useState(false);
  const [entrada, setEntrada] = useState<EntradaMision>('alcanzado');
  const [altaIntegrado, setAltaIntegrado] = useState(false);
  const [altaBeneficiario, setAltaBeneficiario] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');

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
  const nombreDe = (id?: string | null) => {
    const p = id ? datos.personas.find((x) => x.id === id) : undefined;
    return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : undefined;
  };
  const grupoDe = (id?: string | null) => (id ? datos.grupos.find((g) => g.id === id)?.nombre : undefined);

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrorForm('');
    try {
      const persona = await registrarPersona(
        repo,
        datos,
        personaDe(campos),
        {
          mision: altaIntegrado ? undefined : altaMision ? entrada : undefined,
          integrado: altaIntegrado,
          beneficiario: altaBeneficiario,
        },
        hoyIso(),
      );
      setMostrarForm(false);
      setCampos(camposDe());
      setAltaMision(false); setAltaIntegrado(false); setAltaBeneficiario(false);
      setSeleccionada(persona.id);
      recargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : String(e));
    }
  };

  const guardarEdicion = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!ficha) return;
    setErrorEdicion('');
    try {
      await actualizarPersona(repo, datos, { ...ficha.persona, ...personaDe(camposEdicion) });
      setEditando(false);
      recargar();
    } catch (e) {
      setErrorEdicion(e instanceof Error ? e.message : String(e));
    }
  };

  const p = ficha?.persona;
  const filasDatos: [string, string][] = p
    ? (
        [
          ['Nº de Identidad', p.numeroIdentidad],
          ['Teléfono', p.telefono],
          ['Nació', p.fechaNacimiento],
          ['Sexo', p.sexo ? (p.sexo === 'M' ? 'Hombre' : 'Mujer') : undefined],
          ['Dirección', p.direccion],
          ['Zona', p.zona],
          ['Profesión', p.profesion],
          ['Estado civil', p.estadoCivil],
          ['Cónyuge', p.conyuge],
          ['Hijos', p.hijos],
          ['Contacto preferido', p.contactoPreferido],
          ['Correo', p.email],
          ['Grupo', grupoDe(p.grupoId)],
          ['Hermano mayor', nombreDe(p.hermanoMayorId)],
          ['Bautizado', p.bautizado === undefined ? undefined : p.bautizado ? `Sí${p.fechaBautismo ? ` · ${p.fechaBautismo}` : ''}` : 'No'],
        ] as [string, string | undefined][]
      ).filter((f): f is [string, string] => !!f[1])
    : [];

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
          <FormularioCampos campos={campos} set={setCampos} datos={datos} />
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
        {lista.map((per) => {
          const sit = situacionDe(datos, per.id);
          const fichaP = fichaDePersona(datos, per.id);
          return (
            <li key={per.id}>
              <button className={`persona-fila ${seleccionada === per.id ? 'activa' : ''}`} onClick={() => setSeleccionada(per.id)}>
                <span className="persona-nombre">{per.nombre} {per.apellidos ?? ''}</span>
                <span className="persona-meta">{per.telefono ?? 'Sin teléfono'}{per.numeroIdentidad ? ` · ${per.numeroIdentidad}` : ''}</span>
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

      {ficha && p && (
        <Modal
          onCerrar={() => {
            setSeleccionada(null);
            setEditando(false);
          }}
        >
          <h2>
            {p.nombre} {p.apellidos ?? ''}{' '}
            <span className={`chip chip-${ficha.situacion.tono}`}>{ficha.situacion.texto}</span>
          </h2>
          {ficha.repetidos.length > 0 && (
            <p className="aviso aviso-rojo">
              ⚠ Esta persona tiene procesos repetidos:{' '}
              {ficha.repetidos.map((r) => `${r.cantidad} en ${r.proceso}`).join(' · ')}. Deja el
              registro bueno y borra el sobrante en su módulo.
            </p>
          )}

          {editando ? (
            <form className="formulario" onSubmit={guardarEdicion}>
              <FormularioCampos campos={camposEdicion} set={setCamposEdicion} datos={datos} excluirId={p.id} />
              {errorEdicion && <p className="aviso aviso-rojo">{errorEdicion}</p>}
              <div className="form-acciones">
                <button className="btn btn-dorado" type="submit">💾 Guardar cambios</button>
                <button className="btn" type="button" onClick={() => setEditando(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              {filasDatos.length > 0 ? (
                <table className="tabla-datos">
                  <tbody>
                    {filasDatos.map(([etiqueta, valor]) => (
                      <tr key={etiqueta}><td className="tenue">{etiqueta}</td><td>{valor}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="tenue">Sin datos registrados todavía.</p>
              )}
              <div className="form-acciones">
                <button
                  className="btn"
                  onClick={() => {
                    setCamposEdicion(camposDe(p));
                    setErrorEdicion('');
                    setEditando(true);
                  }}
                >
                  ✏️ Editar datos
                </button>
              </div>
            </>
          )}

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
