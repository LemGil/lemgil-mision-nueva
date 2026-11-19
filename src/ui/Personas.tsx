import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarPersona, borrarPersona, quitarZona, registrarPersona, renombrarZona, type EntradaMision } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio, Persona, Sexo } from '../modelo/tipos';
import { buscarPersonas, fichaDePersona, situacionDe } from '../motor/personaVista';
import { clasificarPersona } from '../motor/censo';
import { agrupar, visibleSegunVer, type VerPersonas } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import Modal from './Modal';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';

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
  const [ver, setVer] = useState<VerPersonas>('activos');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('paso');
  const [zonaEditando, setZonaEditando] = useState<string | null>(null);
  const [zonaNombre, setZonaNombre] = useState('');
  const [errorZonas, setErrorZonas] = useState('');

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

  const lista = buscarPersonas(datos, busqueda).filter((per) =>
    visibleSegunVer(clasificarPersona(datos, per.id).clase, ver),
  );
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

  const zonas = (() => {
    const mapa = new Map<string, { nombre: string; cantidad: number; grupos: number }>();
    for (const per of datos.personas) {
      const z = per.zona?.trim();
      if (!z) continue;
      const e = mapa.get(z) ?? { nombre: z, cantidad: 0, grupos: 0 };
      e.cantidad++;
      mapa.set(z, e);
    }
    for (const g of datos.grupos) {
      const z = g.zona?.trim();
      if (!z) continue;
      const e = mapa.get(z) ?? { nombre: z, cantidad: 0, grupos: 0 };
      e.grupos++;
      mapa.set(z, e);
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  })();

  const claveGrupo = (per: Persona): string => {
    if (agruparPor === 'zona') return per.zona?.trim() || 'Sin zona';
    if (agruparPor === 'grupo') return grupoDe(per.grupoId) ?? 'Sin grupo';
    return situacionDe(datos, per.id).texto;
  };

  const filaPersona = (per: Persona) => {
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
  };

  const tarjetaPersona = (per: Persona) => {
    const sit = situacionDe(datos, per.id);
    return (
      <button key={per.id} className="persona-card" onClick={() => setSeleccionada(per.id)}>
        <span className="persona-nombre">{per.nombre} {per.apellidos ?? ''}</span>
        <span><span className={`chip chip-${sit.tono}`}>{sit.texto}</span></span>
        <span className="persona-meta">{per.telefono ?? 'Sin teléfono'}</span>
        <span className="persona-meta">
          {[grupoDe(per.grupoId), per.zona].filter(Boolean).join(' · ') || 'Sin grupo ni zona'}
        </span>
      </button>
    );
  };

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <h1>Personas</h1>
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>
          ➕ Nueva persona
        </button>
      </header>
      <GuiaPagina texto="La ficha única: aquí cada persona se escribe una sola vez, con su Nº de Identidad. Todas las demás mesas eligen de esta lista." />

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
        <select value={ver} onChange={(e) => setVer(e.target.value as VerPersonas)}>
          <option value="activos">Solo activos</option>
          <option value="bajas">Bajas (apartados, traslados, fallecidos)</option>
          <option value="todos">Todos</option>
        </select>
        <span className="tenue">Mostrando {lista.length} de {datos.personas.length}</span>
      </div>

      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[
          { valor: 'paso', etiqueta: 'El paso en que está' },
          { valor: 'zona', etiqueta: 'Zona' },
          { valor: 'grupo', etiqueta: 'Grupo' },
        ]}
      />

      {vista === 'lista' && (
        <ul className="lista-personas">
          {lista.map(filaPersona)}
          {lista.length === 0 && <li className="tenue">Sin coincidencias.</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        lista.length === 0
          ? <p className="tenue">Sin coincidencias.</p>
          : <div className="tarjetas-grid">{lista.map(tarjetaPersona)}</div>
      )}
      {vista === 'agrupada' && (
        lista.length === 0
          ? <p className="tenue">Sin coincidencias.</p>
          : agrupar(lista, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaPersona)}</ul>
              </div>
            ))
      )}

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

          <div className="form-acciones">
            <BorrarBoton
              texto="🗑️ Borrar esta ficha"
              onBorrar={async () => {
                setErrorEdicion('');
                try {
                  await borrarPersona(repo, datos, p.id);
                  setSeleccionada(null);
                  recargar();
                } catch (e) {
                  setErrorEdicion(e instanceof Error ? e.message : String(e));
                }
              }}
            />
          </div>
          {errorEdicion && !editando && <p className="aviso aviso-rojo">{errorEdicion}</p>}
        </Modal>
      )}

      <section className="tarjeta">
        <h2>🗺️ Zonas</h2>
        <p className="tenue">
          La lista de zonas sale de las fichas y los grupos. Renombrar corrige la zona en
          todas partes a la vez; quitarla deja esas fichas sin zona.
        </p>
        {errorZonas && <p className="aviso aviso-rojo">{errorZonas}</p>}
        <ul className="lista-personas">
          {zonas.map((z) => (
            <li key={z.nombre}>
              <div className="persona-fila">
                <span className="persona-nombre">{z.nombre}</span>
                <span className="persona-meta">{z.cantidad} fichas{z.grupos > 0 ? ` · ${z.grupos} grupos` : ''}</span>
                {zonaEditando === z.nombre ? (
                  <>
                    <input value={zonaNombre} onChange={(e) => setZonaNombre(e.target.value)} />
                    <button
                      className="btn btn-dorado"
                      onClick={async () => {
                        setErrorZonas('');
                        try {
                          await renombrarZona(repo, datos, z.nombre, zonaNombre);
                          setZonaEditando(null);
                          recargar();
                        } catch (e) {
                          setErrorZonas(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    >
                      💾 Guardar
                    </button>
                    <button className="btn" onClick={() => setZonaEditando(null)}>Cancelar</button>
                  </>
                ) : (
                  <button
                    className="btn"
                    onClick={() => {
                      setZonaEditando(z.nombre);
                      setZonaNombre(z.nombre);
                    }}
                  >
                    ✏️ Renombrar
                  </button>
                )}
                <BorrarBoton
                  texto="🗑️"
                  titulo="Quitar esta zona de todas las fichas"
                  onBorrar={async () => {
                    await quitarZona(repo, datos, z.nombre);
                    recargar();
                  }}
                />
              </div>
            </li>
          ))}
          {zonas.length === 0 && <li className="tenue">Todavía no hay zonas en las fichas.</li>}
        </ul>
      </section>
    </div>
  );
}
