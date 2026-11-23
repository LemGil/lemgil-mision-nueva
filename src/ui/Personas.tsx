import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarPersona, asignarGrupos, borrarPersona, darAltasDirectas, quitarZona, registrarPersona, renombrarZona, type EntradaMision } from '../datos/acciones';
import { idsGruposDe, nombresGruposDe } from '../motor/gruposVista';
import CamposGrupos from './CamposGrupos';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio, Persona, Sexo } from '../modelo/tipos';
import { buscarPersonas, fichaDePersona, situacionDe } from '../motor/personaVista';
import { clasificarPersona, personasDemografia, ETIQUETAS_DEMOGRAFIA, type ClaveDemografica } from '../motor/censo';
import { agrupar, visibleSegunVer, type VerPersonas } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';
import Modal from './Modal';
import BorrarBoton from './BorrarBoton';
import { InputZona } from './CamposLista';
import GuiaPagina from './GuiaPagina';
import { Buscador, CabeceraPagina, DatosLista, FilaAcciones, FilaPersona, Pestanas, TarjetaPersona } from './Piezas';
import { origenBautismo } from '../motor/informeMision';

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
        <label>Zona<InputZona datos={datos} value={campos.zona} onChange={(v) => u({ zona: v })} /></label>
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
  // Filtro que llega del Panel: la demografía («Niños», «Mujeres»…)
  // trae a la lista con SOLO esas personas.
  const [filtroDemo, setFiltroDemo] = useState<ClaveDemografica | null>(null);
  // Regla de la casa (2026-11-23): los aspectos diferentes de una
  // página van en PESTAÑAS, no apilados — Zonas ya no se pierde
  // debajo de la lista.
  const [seccion, setSeccion] = useState<'personas' | 'zonas'>('personas');
  // Llegada desde el Panel: tocar una alerta trae aquí con la
  // ficha pedida; se abre y se limpia el estado para no reabrirla
  // al volver atrás.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const st = location.state as { abrirFicha?: string; filtroDemo?: ClaveDemografica } | null;
    if (st?.abrirFicha) {
      setSeleccionada(st.abrirFicha);
      navigate(location.pathname, { replace: true, state: null });
    } else if (st?.filtroDemo) {
      setFiltroDemo(st.filtroDemo);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(false);
  const [recargas, setRecargas] = useState(0);

  const [campos, setCampos] = useState<Campos>(camposDe());
  const [camposEdicion, setCamposEdicion] = useState<Campos>(camposDe());
  const [gruposCrear, setGruposCrear] = useState<string[]>([]);
  const [gruposEditar, setGruposEditar] = useState<string[]>([]);
  const [altaMision, setAltaMision] = useState(false);
  const [entrada, setEntrada] = useState<EntradaMision>('alcanzado');
  const [altaIntegrado, setAltaIntegrado] = useState(false);
  const [altaBeneficiario, setAltaBeneficiario] = useState(false);
  const [edAltaMision, setEdAltaMision] = useState(false);
  const [edEntrada, setEdEntrada] = useState<EntradaMision>('alcanzado');
  const [edAltaIntegrado, setEdAltaIntegrado] = useState(false);
  const [edAltaBeneficiario, setEdAltaBeneficiario] = useState(false);
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

  const idsDemo = filtroDemo
    ? personasDemografia(datos, filtroDemo, new Date().toISOString().slice(0, 10))
    : null;
  const lista = buscarPersonas(datos, busqueda)
    .filter((per) => visibleSegunVer(clasificarPersona(datos, per.id).clase, ver))
    .filter((per) => !idsDemo || idsDemo.has(per.id));
  const ficha = seleccionada ? fichaDePersona(datos, seleccionada) : null;
  const nombrePasoEntrada = (e: EntradaMision) =>
    datos.pasos.find((p) => p.id === { alcanzado: 'ps-congregado', confeso: 'ps-confeso', converso: 'ps-nuevo', bautizado: 'ps-bautizado' }[e])?.nombre ?? e;
  const nombreDe = (id?: string | null) => {
    const p = id ? datos.personas.find((x) => x.id === id) : undefined;
    return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : undefined;
  };

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
      if (gruposCrear.length) {
        await asignarGrupos(repo, { ...datos, personas: [...datos.personas, persona] }, persona.id, gruposCrear);
      }
      setMostrarForm(false);
      setCampos(camposDe());
      setGruposCrear([]);
      setAltaMision(false); setAltaIntegrado(false); setAltaBeneficiario(false);
      setSeleccionada(persona.id);
      recargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : String(e));
    }
  };

  const limpiarAltasEdicion = () => {
    setEdAltaMision(false);
    setEdEntrada('alcanzado');
    setEdAltaIntegrado(false);
    setEdAltaBeneficiario(false);
  };

  const guardarEdicion = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!ficha) return;
    setErrorEdicion('');
    try {
      const actualizada = { ...ficha.persona, ...personaDe(camposEdicion) };
      await actualizarPersona(repo, datos, actualizada);
      await asignarGrupos(
        repo,
        { ...datos, personas: datos.personas.map((x) => (x.id === actualizada.id ? actualizada : x)) },
        actualizada.id,
        gruposEditar,
      );
      // Las altas que le faltaban y se marcaron nacen con la misma siembra
      // del registro nuevo; la sección es solo de altas, nunca borra.
      if (edAltaIntegrado || edAltaMision || edAltaBeneficiario) {
        await darAltasDirectas(
          repo,
          datos,
          ficha.persona.id,
          {
            mision: edAltaIntegrado ? undefined : edAltaMision ? edEntrada : undefined,
            integrado: edAltaIntegrado,
            beneficiario: edAltaBeneficiario,
          },
          hoyIso(),
        );
      }
      limpiarAltasEdicion();
      setEditando(false);
      recargar();
    } catch (e) {
      setErrorEdicion(e instanceof Error ? e.message : String(e));
    }
  };

  const p = ficha?.persona;
  const misionEd = ficha?.mision[0];
  const miembroEd = ficha?.miembros[0];
  const beneficiarioEd = ficha?.beneficiario;
  const origenP = p ? origenBautismo(datos, p.id) : null;
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
          ['Grupos', nombresGruposDe(datos, p.id)],
          ['Hermano mayor', nombreDe(p.hermanoMayorId)],
          ['Bautizado', p.bautizado === undefined && !origenP ? undefined : (p.bautizado || origenP) ? `Sí${p.fechaBautismo ? ` · ${p.fechaBautismo}` : ''}${origenP === 'casa' ? ' · se bautizó con nosotros' : origenP === 'fuera' ? ' · vino ya bautizado' : ''}` : 'No'],
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
    if (agruparPor === 'grupo') return nombresGruposDe(datos, per.id) ?? 'Sin grupo';
    return situacionDe(datos, per.id).texto;
  };

  const filaPersona = (per: Persona) => {
    const sit = situacionDe(datos, per.id);
    const fichaP = fichaDePersona(datos, per.id);
    return (
      <li key={per.id}>
        <FilaPersona
          nombre={`${per.nombre} ${per.apellidos ?? ''}`}
          meta={<>{per.telefono ?? 'Sin teléfono'}{per.numeroIdentidad ? ` · ${per.numeroIdentidad}` : ''}</>}
          derecha={(
            <>
              <span className={`chip chip-${sit.tono}`}>{sit.texto}</span>
              {fichaP && fichaP.repetidos.length > 0 && (
                <span className="chip chip-rojo">
                  ⚠ {fichaP.repetidos.map((r) => `${r.cantidad} en ${r.proceso}`).join(' · ')}
                </span>
              )}
            </>
          )}
          activa={seleccionada === per.id}
          onClick={() => setSeleccionada(per.id)}
        />
      </li>
    );
  };

  const tarjetaPersona = (per: Persona) => {
    const sit = situacionDe(datos, per.id);
    return (
      <TarjetaPersona key={per.id} nombre={`${per.nombre} ${per.apellidos ?? ''}`} onClick={() => setSeleccionada(per.id)}>
        <span><span className={`chip chip-${sit.tono}`}>{sit.texto}</span></span>
        <span className="persona-meta">{per.telefono ?? 'Sin teléfono'}</span>
        <span className="persona-meta">
          {[nombresGruposDe(datos, per.id), per.zona].filter(Boolean).join(' · ') || 'Sin grupo ni zona'}
        </span>
      </TarjetaPersona>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="👥 Personas">
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>
          ➕ Nueva persona
        </button>
      </CabeceraPagina>
      <GuiaPagina texto="La ficha única: aquí cada persona se escribe una sola vez, con su Nº de Identidad. Todas las demás mesas eligen de esta lista." />

      {mostrarForm && (
        <form className="tarjeta formulario" onSubmit={guardar}>
          <h2>➕ Nueva persona</h2>
          <FormularioCampos campos={campos} set={setCampos} datos={datos} />
          <CamposGrupos datos={datos} seleccion={gruposCrear} onCambiar={setGruposCrear} />
          <fieldset className="altas">
            <legend>Al guardar, dar de alta también como:</legend>
            <label className="check">
              <input type="checkbox" checked={altaMision} disabled={altaIntegrado} onChange={(e) => setAltaMision(e.target.checked)} />
              En Misión, entrando como:
            </label>
            <div className="radios">
              {(['alcanzado', 'confeso', 'converso'] as EntradaMision[]).map((e) => (
                <label key={e} className="check">
                  <input type="radio" name="entrada" checked={entrada === e} disabled={!altaMision || altaIntegrado} onChange={() => setEntrada(e)} />
                  {nombrePasoEntrada(e)}
                </label>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" checked={altaIntegrado} onChange={(e) => setAltaIntegrado(e.target.checked)} />
              Añadido → Miembro directo
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

      <Pestanas
        opciones={[
          { id: 'personas', etiqueta: `👥 Personas (${datos.personas.length})` },
          { id: 'zonas', etiqueta: `🗺️ Zonas (${zonas.length})` },
        ]}
        activa={seccion}
        onCambiar={(id) => setSeccion(id as 'personas' | 'zonas')}
      />

      {seccion === 'personas' && (
        <>
      {filtroDemo && (
        <p className="filtro-panel">
          <span>
            Filtro del Panel: <strong>{ETIQUETAS_DEMOGRAFIA[filtroDemo]}</strong> —{' '}
            {idsDemo?.size ?? 0} personas
          </span>
          <button type="button" className="btn" onClick={() => setFiltroDemo(null)}>
            ✕ Quitar filtro
          </button>
        </p>
      )}

      <Buscador>
        <input
          placeholder="🔍 Buscar por nombre, teléfono o Nº de Identidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <span className="seg" role="group" aria-label="Ver">
          <button type="button" aria-pressed={ver === 'activos'} onClick={() => setVer('activos')}>Activos</button>
          <button type="button" aria-pressed={ver === 'bajas'} onClick={() => setVer('bajas')}>Bajas</button>
          <button type="button" aria-pressed={ver === 'todos'} onClick={() => setVer('todos')}>Todos</button>
        </span>
        <span className="tenue">Mostrando {lista.length} de {datos.personas.length}</span>
      </Buscador>

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
        </>
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
              <CamposGrupos datos={datos} seleccion={gruposEditar} onCambiar={setGruposEditar} />
              <fieldset className="altas">
                <legend>Al guardar, dar de alta también como:</legend>
                {misionEd ? (
                  <p className="check ya-esta">✔ Ya está en Misión — paso {misionEd.pasoNombre}</p>
                ) : (
                  <>
                    <label className="check">
                      <input type="checkbox" checked={edAltaMision} disabled={edAltaIntegrado} onChange={(e) => setEdAltaMision(e.target.checked)} />
                      En Misión, entrando como:
                    </label>
                    <div className="radios">
                      {(['alcanzado', 'confeso', 'converso'] as EntradaMision[]).map((e) => (
                        <label key={e} className="check">
                          <input type="radio" name="entrada-edicion" checked={edEntrada === e} disabled={!edAltaMision || edAltaIntegrado} onChange={() => setEdEntrada(e)} />
                          {nombrePasoEntrada(e)}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {miembroEd ? (
                  <p className="check ya-esta">✔ Ya es miembro</p>
                ) : misionEd ? (
                  <p className="check ya-esta">El miembro nace cuando su registro de Misión llegue a Añadidos.</p>
                ) : (
                  <label className="check">
                    <input type="checkbox" checked={edAltaIntegrado} onChange={(e) => setEdAltaIntegrado(e.target.checked)} />
                    Añadido → Miembro directo
                  </label>
                )}
                {beneficiarioEd ? (
                  <p className="check ya-esta">✔ Ya es beneficiario</p>
                ) : (
                  <label className="check">
                    <input type="checkbox" checked={edAltaBeneficiario} onChange={(e) => setEdAltaBeneficiario(e.target.checked)} />
                    Beneficiario → Manos Abiertas
                  </label>
                )}
              </fieldset>
              {errorEdicion && <p className="aviso aviso-rojo">{errorEdicion}</p>}
              <div className="form-acciones">
                <button className="btn btn-dorado" type="submit">💾 Guardar cambios</button>
                <button className="btn" type="button" onClick={() => setEditando(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              {filasDatos.length > 0 ? (
                <DatosLista filas={filasDatos} />
              ) : (
                <p className="tenue">Sin datos registrados todavía.</p>
              )}
              <div className="form-acciones">
                <button
                  className="btn"
                  onClick={() => {
                    setCamposEdicion(camposDe(p));
                    setGruposEditar(idsGruposDe(datos, p.id));
                    limpiarAltasEdicion();
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

      {seccion === 'zonas' && (
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
              <FilaAcciones
                nombre={z.nombre}
                meta={`${z.cantidad} fichas${z.grupos > 0 ? ` · ${z.grupos} grupos` : ''}`}
                acciones={
                  <>
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
                  </>
                }
              />
            </li>
          ))}
          {zonas.length === 0 && <li className="tenue">Todavía no hay zonas en las fichas.</li>}
        </ul>
      </section>
      )}
    </div>
  );
}
