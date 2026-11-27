import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import { actualizarGrupo, actualizarReunion, agregarAGrupo, borrarGrupo, borrarReunion, crearGrupo, quitarDeGrupo, registrarReunion } from '../datos/acciones';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import SelectorPersona from './SelectorPersona';
import { clasificarPersona } from '../motor/censo';
import { esBaja } from '../motor/vistas';
import type { Grupo, Persona, Reunion } from '../modelo/tipos';
import { InputZona } from './CamposLista';
import { agrupar } from '../motor/vistas';
import BarraVistas, { type Vista } from './BarraVistas';

import Modal from './Modal';
import { Buscador, CabeceraPagina, FilaAcciones, FilaPersona, FilaRegistro, Kpi, Pestanas, TarjetaPersona } from './Piezas';
import { coincideBusqueda } from '../motor/personaVista';
import BorrarBoton from './BorrarBoton';
import GuiaPagina from './GuiaPagina';
import { claveTipoGrupo, conteoPorPasoDelGrupo, esIglesia, esOikos, estadoGrupo, grupoDeTipo, hijosDe, iconoGrupo, idsCongregados, idsGruposDe, idsMiembrosDeGrupo, liderVisible, lineaReunion, ordenarGruposPorFamilia, padreDe, personasPorOikos, porcentajeCapacidad, tipoVisibleGrupo, tiposDeGrupoEnUso } from '../motor/gruposVista';
import { useNavigate } from 'react-router-dom';
import { avisoCuadreParte, diezmosDeParte, ofrendaDeParte, partesDeGrupo, resumenReuniones, tesorosDeParte } from '../motor/reuniones';
import { formatoDinero } from '../motor/dinero';

const hoyIso = () => new Date().toISOString().slice(0, 10);

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const capacidadNumero = (s: string): number | undefined => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** El cuerpo rico del grupo (el de la foto de la app de siempre):
 * zona y líder, la reunión, el conteo por paso de la ruta y la barra
 * de capacidad. Lo usan la tarjeta y la ventana del grupo. */
function StatsGrupo({ datos, grupo, miembros }: { datos: DatosMinisterio; grupo: Grupo; miembros: (Persona | undefined)[] }) {
  const total = miembros.length;
  const conteos = conteoPorPasoDelGrupo(datos, new Set(miembros.map((p) => p!.id)));
  const lider = liderVisible(datos, grupo);
  const reunion = lineaReunion(grupo);
  return (
    <>
      <span className="persona-meta">
        {grupo.tipo ? `🏷️ ${grupo.tipo} · ` : ''}
        {grupo.zona ? `📍 ${grupo.zona}` : '📍 Sin zona'}
        {lider ? ` · 👤 ${lider}` : ''}
        {grupo.lat != null ? ' · 📍 en el mapa' : ''}
      </span>
      {reunion && <span className="persona-meta">🏠 {reunion}</span>}
      <span className="grupo-stats">
        {conteos.map((c) => (
          <span key={c.paso.id} className="grupo-stat">
            <b>{c.n}</b>
            <small>{c.paso.emoji} {c.corto}</small>
          </span>
        ))}
      </span>
      <span className="persona-meta">
        Total asignados <strong>{total}{grupo.capacidad ? ` / ${grupo.capacidad}` : ''}</strong>
      </span>
      {grupo.capacidad ? (
        <span className="barra-capacidad">
          <span style={{ width: `${porcentajeCapacidad(total, grupo.capacidad)}%` }} />
        </span>
      ) : null}
    </>
  );
}

/** La sección de miembros del formulario del grupo: los que están,
 * con su ✕ para quitar, y el buscador para agregar. El aviso de
 * movimiento salta solo si la persona ya está en otro grupo DEL
 * MISMO tipo que el del formulario (su Iglesia no estorba a su Oikos). */
function SeccionMiembros({
  datos,
  seleccion,
  onCambiar,
  tipoTexto,
  grupoActualId,
}: {
  datos: DatosMinisterio;
  seleccion: string[];
  onCambiar: (ids: string[]) => void;
  tipoTexto: string;
  grupoActualId?: string;
}) {
  const personaDe = (id: string) => datos.personas.find((x) => x.id === id);
  const claveNueva = claveTipoGrupo({ tipo: tipoTexto } as Grupo);
  // La regla acordada de las listas: apartados, traslados y fallecidos
  // no salen — ni en la lista ni en el buscador para agregar.
  const idsBajas = new Set(
    datos.personas.filter((per) => esBaja(clasificarPersona(datos, per.id).clase)).map((per) => per.id),
  );
  return (
    <>
      <h3>👥 Miembros del grupo</h3>
      {seleccion.length === 0 ? (
        <p className="tenue">Nadie todavía: busca y agrega a los hermanos.</p>
      ) : (
        <ul className="lista-personas">
          {seleccion.map((id) => {
            const per = personaDe(id);
            const otro = grupoDeTipo(datos, id, claveNueva);
            const aviso = otro && otro.id !== grupoActualId ? otro : undefined;
            return (
              <li key={id}>
                <FilaAcciones
                  nombre={per ? `${per.nombre} ${per.apellidos ?? ''}` : id}
                  meta={aviso ? `⚠ Está en ${aviso.nombre} (mismo tipo): al guardar pasará a este grupo` : undefined}
                  acciones={
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onCambiar(seleccion.filter((x) => x !== id))}
                    >
                      ✕ Quitar
                    </button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      <SelectorPersona
        datos={datos}
        excluir={new Set([...seleccion, ...idsBajas])}
        onElegir={(id) => onCambiar([...seleccion, id])}
        placeholder="🔍 Agregar un miembro…"
      />
    </>
  );
}


/** El formulario del parte de reunión: los conteos de la reunión,
 * la ofrenda (que va a Bien Común como aporte del grupo) y las
 * comidas (que van a Manos Abiertas como entregas). */
function FormParte({
  repo,
  datos,
  grupo,
  parte,
  onListo,
  onGuardado,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  grupo: Grupo;
  parte?: Reunion;
  onListo: () => void;
  /** Tras guardar un parte NUEVO: recarga sin cerrar (el formulario
   * queda abierto y limpio para registrar otro). */
  onGuardado: () => void;
}) {
  const [fecha, setFecha] = useState(parte?.fecha ?? hoyIso());
  const [personas, setPersonas] = useState(String(parte?.personas ?? ''));
  const [mujeres, setMujeres] = useState(String(parte?.mujeres ?? ''));
  const [hombres, setHombres] = useState(String(parte?.hombres ?? ''));
  const [ninos, setNinos] = useState(String(parte?.ninos ?? ''));
  const [visitas, setVisitas] = useState(String(parte?.visitas ?? ''));
  const [nuevos, setNuevos] = useState(String(parte?.nuevosCongregados ?? ''));
  const [profesiones, setProfesiones] = useState(String(parte?.profesiones ?? ''));
  const [almuerzos, setAlmuerzos] = useState(String(parte?.almuerzos ?? ''));
  const [sopas, setSopas] = useState(String(parte?.sopas ?? ''));
  const [ofrenda, setOfrenda] = useState(() => {
    if (!parte) return '';
    const a = ofrendaDeParte(datos, parte.id);
    return a ? String(a.monto) : '';
  });
  const [diezmos, setDiezmos] = useState<{ personaId: string; monto: string }[]>(() =>
    parte
      ? diezmosDeParte(datos, parte.id).map((a) => ({
          personaId: a.personaId as string,
          monto: String(a.monto),
        }))
      : [],
  );
  const [tesoros, setTesoros] = useState<
    { personaId?: string; nombre: string; tipo: string; detalle: string }[]
  >(() =>
    parte
      ? tesorosDeParte(datos, parte.id).map((e) => {
          const p = e.personaId ? datos.personas.find((x) => x.id === e.personaId) : undefined;
          return {
            personaId: e.personaId,
            nombre:
              e.beneficiarioNombre ?? (p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : ''),
            tipo: e.tipo ?? 'Alimentos',
            detalle: e.notas ?? '',
          };
        })
      : [],
  );
  const [visita, setVisita] = useState('');
  const [notas, setNotas] = useState(parte?.notas ?? '');
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState('');
  const nombreDe = (id: string) => {
    const p = datos.personas.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellidos ?? ''}`.trim() : 'Persona borrada';
  };
  const n = (v: string) => Math.max(0, parseInt(v, 10) || 0);
  const aviso = avisoCuadreParte({
    personas: n(personas),
    mujeres: n(mujeres),
    hombres: n(hombres),
    ninos: n(ninos),
  });
  const guardar = async () => {
    setError('');
    setGuardado('');
    const sinMonto = diezmos.find((d) => !(Number(d.monto) > 0));
    if (sinMonto) {
      setError(`Falta el monto del diezmo de ${nombreDe(sinMonto.personaId)}.`);
      return;
    }
    if (tesoros.some((t) => !t.nombre.trim())) {
      setError('Falta el nombre de una persona que recibió el Tesoro.');
      return;
    }
    const listaDiezmos = diezmos.map((d) => ({ personaId: d.personaId, monto: Number(d.monto) }));
    const listaTesoros = tesoros.map((t) => ({
      personaId: t.personaId,
      nombre: t.nombre.trim(),
      tipo: t.tipo,
      detalle: t.detalle.trim() || undefined,
    }));
    const base = {
      grupoId: grupo.id,
      fecha,
      personas: n(personas),
      mujeres: n(mujeres),
      hombres: n(hombres),
      ninos: n(ninos),
      visitas: n(visitas),
      nuevosCongregados: n(nuevos),
      profesiones: n(profesiones),
      almuerzos: n(almuerzos),
      sopas: n(sopas),
      notas: notas.trim() || undefined,
    };
    try {
      if (parte) {
        await actualizarReunion(repo, datos, { ...base, id: parte.id }, Number(ofrenda) || 0, listaDiezmos, listaTesoros);
        onListo();
      } else {
        await registrarReunion(repo, datos, base, Number(ofrenda) || 0, listaDiezmos, listaTesoros);
        // El parte nuevo NO cierra el formulario: queda abierto y
        // limpio para seguir registrando, conservando la fecha. Solo
        // cierra con Cancelar o tocando otra vez «Registrar parte».
        setPersonas('');
        setMujeres('');
        setHombres('');
        setNinos('');
        setVisitas('');
        setNuevos('');
        setProfesiones('');
        setAlmuerzos('');
        setSopas('');
        setOfrenda('');
        setDiezmos([]);
        setTesoros([]);
        setVisita('');
        setNotas('');
        setGuardado('✓ Parte guardado. El formulario quedó limpio para registrar otro; la fecha se mantiene.');
        onGuardado();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="tarjeta formulario">
      <h3>{parte ? '✏️ Corregir el parte' : '🗓️ Nuevo parte de reunión'}</h3>
      <div className="form-fila">
        <label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label>Personas<input type="number" min="0" value={personas} onChange={(e) => setPersonas(e.target.value)} /></label>
      </div>
      <div className="form-fila">
        <label>Mujeres<input type="number" min="0" value={mujeres} onChange={(e) => setMujeres(e.target.value)} /></label>
        <label>Hombres<input type="number" min="0" value={hombres} onChange={(e) => setHombres(e.target.value)} /></label>
        <label>Niños<input type="number" min="0" value={ninos} onChange={(e) => setNinos(e.target.value)} /></label>
      </div>
      <div className="form-fila">
        <label>Visitas<input type="number" min="0" value={visitas} onChange={(e) => setVisitas(e.target.value)} /></label>
        <label>Nuevos congregados<input type="number" min="0" value={nuevos} onChange={(e) => setNuevos(e.target.value)} /></label>
        <label>Profesiones de fe<input type="number" min="0" value={profesiones} onChange={(e) => setProfesiones(e.target.value)} /></label>
      </div>
      <div className="form-fila">
        <label>Ofrenda recogida ($)<input type="number" min="0" value={ofrenda} onChange={(e) => setOfrenda(e.target.value)} /></label>
        <label>Almuerzos repartidos<input type="number" min="0" value={almuerzos} onChange={(e) => setAlmuerzos(e.target.value)} /></label>
        <label>Sopas repartidas<input type="number" min="0" value={sopas} onChange={(e) => setSopas(e.target.value)} /></label>
      </div>
      <div>
        <p>
          <strong>🌾 Diezmos</strong>{' '}
          <span className="tenue">— pasan a Bien Común a nombre de cada persona</span>
        </p>
        {diezmos.map((d) => (
          <div className="form-fila" key={d.personaId}>
            <span>{nombreDe(d.personaId)}</span>
            <label>
              Monto ($)
              <input
                type="number"
                min="0"
                value={d.monto}
                onChange={(e) =>
                  setDiezmos(diezmos.map((x) => (x.personaId === d.personaId ? { ...x, monto: e.target.value } : x)))
                }
              />
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => setDiezmos(diezmos.filter((x) => x.personaId !== d.personaId))}
            >
              ✕
            </button>
          </div>
        ))}
        <SelectorPersona
          datos={datos}
          excluir={new Set(diezmos.map((d) => d.personaId))}
          onElegir={(id) => setDiezmos([...diezmos, { personaId: id, monto: '' }])}
          placeholder="Añadir a quien diezmó…"
        />
      </div>
      <div>
        <p>
          <strong>🎁 Tesoro de Manos Abiertas</strong>{' '}
          <span className="tenue">— los regalos de esta reunión; quedan en Manos Abiertas a nombre de quien recibió</span>
        </p>
        {tesoros.map((t, i) => (
          <div className="form-fila" key={i}>
            {t.personaId ? (
              <span>{t.nombre}</span>
            ) : (
              <label>
                Visita
                <input
                  value={t.nombre}
                  onChange={(e) =>
                    setTesoros(tesoros.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))
                  }
                />
              </label>
            )}
            <label>
              Regalo
              <select
                value={t.tipo}
                onChange={(e) =>
                  setTesoros(tesoros.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)))
                }
              >
                <option value="Alimentos">Alimentos</option>
                <option value="Aseo">Aseo</option>
                <option value="Ambos">Ambos</option>
              </select>
            </label>
            <label>
              Detalle
              <input
                value={t.detalle}
                placeholder="Opcional"
                onChange={(e) =>
                  setTesoros(tesoros.map((x, j) => (j === i ? { ...x, detalle: e.target.value } : x)))
                }
              />
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => setTesoros(tesoros.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <SelectorPersona
          datos={datos}
          excluir={new Set(tesoros.map((t) => t.personaId).filter((x): x is string => !!x))}
          onElegir={(id) =>
            setTesoros([...tesoros, { personaId: id, nombre: nombreDe(id), tipo: 'Alimentos', detalle: '' }])
          }
          placeholder="Añadir hermano que recibió…"
        />
        <div className="form-fila">
          <label>
            ¿Recibió una visita?
            <input
              value={visita}
              onChange={(e) => setVisita(e.target.value)}
              placeholder="Nombre de la visita"
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!visita.trim()) return;
              setTesoros([...tesoros, { nombre: visita.trim(), tipo: 'Alimentos', detalle: '' }]);
              setVisita('');
            }}
          >
            ➕ Añadir visita
          </button>
        </div>
      </div>
      <div className="form-fila">
        <label>Notas<input value={notas} onChange={(e) => setNotas(e.target.value)} /></label>
      </div>
      <p className="tenue">La ofrenda queda en Bien Común como aporte del grupo, los diezmos a nombre de cada persona, los almuerzos y sopas en Manos Abiertas como entregas de ese día, y los regalos del Tesoro a nombre de cada persona que recibió.</p>
      {aviso && <p className="aviso">{aviso}</p>}
      {error && <p className="aviso aviso-rojo">{error}</p>}
      {guardado && <p className="aviso aviso-verde">{guardado}</p>}
      <div className="form-acciones">
        <button className="btn btn-dorado" onClick={guardar}>💾 Guardar el parte</button>
        <button className="btn" onClick={onListo}>Cancelar</button>
        {parte && (
          <BorrarBoton
            texto="🗑️ Borrar parte"
            titulo="Borra el parte con su ofrenda, sus diezmos y sus entregas"
            onBorrar={async () => {
              await borrarReunion(repo, datos, parte.id);
              onListo();
            }}
          />
        )}
      </div>
    </div>
  );
}

/** La sección de Reuniones en la ficha del grupo: el botón del
 * parte en su propia fila (abre el formulario y lo vuelve a cerrar),
 * el informe del período en tarjetas y el historial (tocar un parte
 * lo corrige). */
function SeccionReuniones({
  repo,
  datos,
  grupo,
  recargar,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  grupo: Grupo;
  recargar: () => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const partes = partesDeGrupo(datos, grupo.id);
  const resumen = resumenReuniones(datos, grupo.id);
  const ofrendas = datos.aportes.filter((a) => a.grupoId === grupo.id);
  const totalOfrendas = ofrendas.reduce((x, a) => x + a.monto, 0);
  const parteEditando =
    editando && editando !== 'nuevo' ? partes.find((p) => p.id === editando) : undefined;
  return (
    <>
      <div className="form-acciones">
        <button
          className="btn btn-dorado"
          onClick={() => setEditando(editando ? null : 'nuevo')}
        >
          {editando ? '✕ Cerrar el formulario' : '➕ Registrar parte'}
        </button>
      </div>
      {resumen.partes === 0 ? (
        <p className="tenue">Sin partes registrados todavía.</p>
      ) : (
        <section className="kpis">
          <Kpi icono="📅" numero={resumen.partes} titulo="Partes" />
          <Kpi icono="👥" numero={resumen.promedioPersonas} titulo="Asistencia promedio" />
          <Kpi icono="🚶" numero={resumen.visitas} titulo="Visitas" />
          <Kpi icono="🌱" numero={resumen.nuevos} titulo="Nuevos congregados" />
          <Kpi icono="✝️" numero={resumen.profesiones} titulo="Profesiones de fe" />
          <Kpi icono="🍽️" numero={resumen.almuerzos} titulo="Almuerzos repartidos" />
          <Kpi icono="🍲" numero={resumen.sopas} titulo="Sopas repartidas" />
          {resumen.diezmos > 0 && (
            <Kpi icono="🌾" numero={formatoDinero(resumen.totalDiezmos)} dinero titulo="Diezmos" sub={`${resumen.diezmos} anotados`} />
          )}
          {ofrendas.length > 0 && (
            <Kpi icono="💰" numero={formatoDinero(totalOfrendas)} dinero titulo="Ofrendas del grupo" sub={`${ofrendas.length} en Bien Común`} />
          )}
          {resumen.tesoros > 0 && (
            <Kpi icono="🎁" numero={resumen.tesoros} titulo="Regalos del Tesoro" />
          )}
        </section>
      )}
      {editando && (
        <FormParte
          key={editando}
          repo={repo}
          datos={datos}
          grupo={grupo}
          parte={parteEditando}
          onListo={() => {
            setEditando(null);
            recargar();
          }}
          onGuardado={recargar}
        />
      )}
      {partes.length > 0 && (
        <ul className="lista-personas">
          {partes.map((p) => {
            const of = ofrendaDeParte(datos, p.id);
            const dz = diezmosDeParte(datos, p.id);
            const ts = tesorosDeParte(datos, p.id);
            return (
              <li key={p.id}>
                <FilaRegistro
                  fecha={p.fecha}
                  nombre={`${p.personas} personas`}
                  meta={`${p.mujeres} mujeres · ${p.hombres} hombres · ${p.ninos} niños · ${p.visitas} visitas · ${p.profesiones} profesiones${dz.length > 0 ? ` · 🌾 ${dz.length} diezmos (${formatoDinero(dz.reduce((x, a) => x + a.monto, 0))})` : ''}${ts.length > 0 ? ` · 🎁 ${ts.length} del Tesoro` : ''}`}
                  valor={of ? formatoDinero(of.monto) : '—'}
                  onClick={() => setEditando(p.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function Grupos({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [pestanaFicha, setPestanaFicha] = useState<'datos' | 'oikos' | 'reuniones'>('datos');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [miembrosSel, setMiembrosSel] = useState<string[]>([]);
  const [padreId, setPadreId] = useState('');
  const [zona, setZona] = useState('');
  const [liderId, setLiderId] = useState<string | null>(null);
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [vista, setVista] = useState<Vista>('lista');
  const [agruparPor, setAgruparPor] = useState('zona');
  const recargar = useCallback(() => setRecargas((x) => x + 1), []);
  const navigate = useNavigate();
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
  // Al cambiar de grupo, su ficha abre siempre en la pestaña Datos.
  useEffect(() => {
    setPestanaFicha('datos');
  }, [seleccionado]);

  if (!datos) return <p className="cargando">Cargando…</p>;
  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);
  const esPersonaBaja = (personaId: string) =>
    esBaja(clasificarPersona(datos, personaId).clase);
  const miembrosDe = (grupoId: string) =>
    // En el grupo solo salen los que están: apartados, traslados y
    // fallecidos (las bajas) no se listan ni se cuentan.
    idsMiembrosDeGrupo(datos, grupoId)
      .filter((id) => !esPersonaBaja(id))
      .map((id) => personaDe(id))
      .filter(Boolean);
  const detalle = seleccionado ? datos.grupos.find((g) => g.id === seleccionado) : undefined;
  const padreDetalle = detalle ? padreDe(datos, detalle) : undefined;
  const hijosDetalle = detalle ? hijosDe(datos, detalle.id) : [];
  const pestana =
    pestanaFicha === 'oikos' && !(detalle && esIglesia(detalle)) ? 'datos' : pestanaFicha;
  // El tablero: la familia y el embudo de la casa — congregados que
  // ya encontraron su Oikos y congregados que aún están en el proceso.
  const nIglesias = datos.grupos.filter((g) => esIglesia(g)).length;
  const oikosTodos = datos.grupos.filter((g) => esOikos(g));
  const nOikosSinIglesia = oikosTodos.filter((g) => !padreDe(datos, g)).length;
  const congregados = idsCongregados(datos);
  const enOikos = personasPorOikos(datos, 'en-oikos');
  const sinOikos = personasPorOikos(datos, 'sin-oikos');

  const visibles = datos.grupos.filter((g) =>
    coincideBusqueda(busqueda, g.nombre, g.zona, g.lugar, liderVisible(datos, g)),
  );
  const visiblesFamilia = ordenarGruposPorFamilia(datos, visibles);
  const claveGrupo = (g: (typeof datos.grupos)[number]): string => {
    if (agruparPor === 'lider') {
      const l = g.liderId ? personaDe(g.liderId) : undefined;
      return l ? `${l.nombre} ${l.apellidos ?? ''}`.trim() : 'Sin líder';
    }
    if (agruparPor === 'tipo') return tipoVisibleGrupo(g);
    return g.zona?.trim() || 'Sin zona';
  };
  const filaGrupo = (g: (typeof datos.grupos)[number]) => {
    const lider = liderVisible(datos, g);
    const reunion = lineaReunion(g);
    const esHijo = !!padreDe(datos, g);
    return (
      <li key={g.id} style={esHijo ? { marginLeft: 24 } : undefined}>
        <FilaPersona
          nombre={`${esHijo ? '↳ ' : ''}${iconoGrupo(g)} ${g.nombre}`}
          meta={<>{g.tipo ? `${g.tipo} · ` : ''}{miembrosDe(g.id).length} personas{lider ? ` · 👤 ${lider}` : ''}{reunion ? ` · ${reunion}` : ''}{g.lat != null ? ' · 📍 en el mapa' : ''}</>}
          activa={seleccionado === g.id}
          onClick={() => setSeleccionado(g.id)}
        />
      </li>
    );
  };
  const tarjetaGrupo = (g: (typeof datos.grupos)[number]) => {
    const miembros = miembrosDe(g.id);
    const est = estadoGrupo(miembros.length, g.capacidad);
    return (
      <TarjetaPersona
        key={g.id}
        nombre={`${iconoGrupo(g)} ${g.nombre}`}
        derecha={<span className={`chip ${est.clase}`}>{est.etiqueta}</span>}
        onClick={() => setSeleccionado(g.id)}
      >
        <StatsGrupo datos={datos} grupo={g} miembros={miembros} />
      </TarjetaPersona>
    );
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="🧑‍🤝‍🧑 Grupos">
        <button className="btn btn-dorado" onClick={() => setMostrarForm((v) => !v)}>➕ Nuevo grupo</button>
      </CabeceraPagina>
      <GuiaPagina texto="Los grupos de la congregación, con su tipo, su líder, su reunión y su capacidad. El tablero sigue el proceso de la casa: cada congregado va encontrando su Oikos — toca «En un Oikos» o «Sin Oikos» para ver quiénes son." />
      {error && <p className="aviso aviso-rojo">{error}</p>}
      <section className="kpis">
        <Kpi principal icono="🧑‍🤝‍🧑" numero={datos.grupos.length} titulo="Grupos" />
        <Kpi icono="🏠" numero={nIglesias} titulo="Iglesias" />
        <Kpi icono="🏡" numero={oikosTodos.length} titulo="Oikos" sub={nOikosSinIglesia > 0 ? `${nOikosSinIglesia} sin Iglesia` : undefined} />
        <Kpi icono="👥" numero={congregados.size} titulo="Congregados" />
        <Kpi icono="🏡" numero={enOikos.size} titulo="En un Oikos" onClick={() => navigate('/personas', { state: { filtroOikos: 'en-oikos' } })} />
        <Kpi icono="⏳" numero={sinOikos.size} titulo="Sin Oikos" onClick={() => navigate('/personas', { state: { filtroOikos: 'sin-oikos' } })} />
      </section>

      {mostrarForm && (
      <section className="tarjeta formulario">
        <h2>➕ Nuevo grupo</h2>
        <div className="form-fila">
          <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label>Zona<InputZona datos={datos} value={zona} onChange={setZona} /></label>
        </div>
        <div className="form-fila">
          <label>Tipo<input value={tipo} onChange={(e) => setTipo(e.target.value)} list="tipos-grupo" placeholder="Ej.: Iglesia, Oikos" /></label>
          <label>Capacidad<input type="number" min={0} value={capacidad} onChange={(e) => setCapacidad(e.target.value)} /></label>
        </div>
        {claveTipoGrupo({ tipo } as Grupo) === 'oikos' && (
          <div className="form-fila">
            <label>
              Su Iglesia
              <select value={padreId} onChange={(e) => setPadreId(e.target.value)}>
                <option value="">Sin Iglesia asignada</option>
                {datos.grupos.filter((g) => esIglesia(g)).map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="form-fila">
          <label>Día de reunión<input value={dia} onChange={(e) => setDia(e.target.value)} list="dias-semana" /></label>
          <label>Hora<input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
        </div>
        <div className="form-fila">
          <label>Lugar de reunión<input value={lugar} onChange={(e) => setLugar(e.target.value)} list="lugares-grupo" /></label>
        </div>
        <datalist id="dias-semana">{DIAS_SEMANA.map((d) => <option key={d} value={d} />)}</datalist>
        <datalist id="lugares-grupo">{[...new Set(datos.grupos.map((g) => g.lugar).filter(Boolean))].map((l) => <option key={l} value={l} />)}</datalist>
        <datalist id="tipos-grupo">{[...new Set(['Iglesia', 'Oikos', ...tiposDeGrupoEnUso(datos).map((t) => t.nombre)])].filter((t) => t !== 'Sin tipo').map((t) => <option key={t} value={t} />)}</datalist>
        <h3>👤 Líder</h3>
        <p className="tenue">
          Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin elegir'}
          {liderId && (
            <button type="button" className="btn" onClick={() => setLiderId(null)}>✕ Quitar</button>
          )}
        </p>
        <SelectorPersona datos={datos} onElegir={setLiderId} placeholder="🔍 Buscar al líder…" />
        <SeccionMiembros datos={datos} seleccion={miembrosSel} onCambiar={setMiembrosSel} tipoTexto={tipo} />
        <div className="form-acciones">
          <button
            className="btn btn-dorado"
            disabled={!nombre.trim()}
            onClick={async () => {
              setError('');
              try {
                const creado = await crearGrupo(repo, {
                nombre: nombre.trim(),
                tipo: tipo.trim() || undefined,
                padreId: claveTipoGrupo({ tipo } as Grupo) === 'oikos' ? padreId || undefined : undefined,
                zona: zona.trim() || undefined,
                liderId,
                dia: dia.trim() || undefined,
                hora: hora.trim() || undefined,
                lugar: lugar.trim() || undefined,
                capacidad: capacidadNumero(capacidad),
              });
                for (const pid of miembrosSel) await agregarAGrupo(repo, datos, pid, creado);
                setNombre(''); setTipo(''); setPadreId(''); setMiembrosSel([]); setZona(''); setLiderId(null); setDia(''); setHora(''); setLugar(''); setCapacidad('');
              setMostrarForm(false);
                recargar();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            💾 Crear grupo
          </button>
        </div>
              <div className="form-acciones">
          <button className="btn" onClick={() => setMostrarForm(false)}>Cerrar</button>
        </div>
      </section>
      )}

      <Buscador>
        <input placeholder="🔍 Buscar grupo, zona o líder…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </Buscador>
      <BarraVistas
        vista={vista}
        setVista={setVista}
        agruparPor={agruparPor}
        setAgruparPor={setAgruparPor}
        opciones={[
          { valor: 'zona', etiqueta: 'Zona' },
          { valor: 'lider', etiqueta: 'Líder' },
          { valor: 'tipo', etiqueta: 'Tipo' },
        ]}
      />
      {vista === 'lista' && (
        <ul className="lista-personas">
          {visiblesFamilia.map(filaGrupo)}
          {visibles.length === 0 && <li className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</li>}
        </ul>
      )}
      {vista === 'tarjetas' && (
        visibles.length === 0
          ? <p className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</p>
          : <div className="tarjetas-grid">{visiblesFamilia.map(tarjetaGrupo)}</div>
      )}
      {vista === 'agrupada' && (
        visibles.length === 0
          ? <p className="tenue">{busqueda ? 'Sin coincidencias.' : 'Sin grupos todavía.'}</p>
          : agrupar(visiblesFamilia, claveGrupo).map((g) => (
              <div key={g.titulo}>
                <h3 className="grupo-titulo">{g.titulo} · {g.items.length}</h3>
                <ul className="lista-personas">{g.items.map(filaGrupo)}</ul>
              </div>
            ))
      )}

      {detalle && (
        <Modal onCerrar={() => setSeleccionado(null)}>
          <h2>{iconoGrupo(detalle)} {detalle.nombre}</h2>
          <p>
            <span className={`chip ${estadoGrupo(miembrosDe(detalle.id).length, detalle.capacidad).clase}`}>
              {estadoGrupo(miembrosDe(detalle.id).length, detalle.capacidad).etiqueta}
            </span>
          </p>
          <Pestanas
            opciones={[
              { id: 'datos', etiqueta: '📋 Datos' },
              ...(esIglesia(detalle)
                ? [{ id: 'oikos' as const, etiqueta: `🏡 Oikos (${hijosDetalle.length})` }]
                : []),
              { id: 'reuniones', etiqueta: `🗓️ Reuniones (${partesDeGrupo(datos, detalle.id).length})` },
            ]}
            activa={pestana}
            onCambiar={setPestanaFicha}
          />
          {pestana === 'reuniones' && (
            <SeccionReuniones repo={repo} datos={datos} grupo={detalle} recargar={recargar} />
          )}
          {pestana === 'oikos' && (
            <>
              <p className="tenue">
                De los congregados: {personasPorOikos(datos, 'en-oikos').size} ya están en un
                Oikos · {personasPorOikos(datos, 'sin-oikos').size} aún no.
              </p>
              {hijosDetalle.length === 0 ? (
                <p className="tenue">
                  Esta Iglesia aún no tiene Oikos: se crean con «➕ Nuevo grupo», tipo Oikos
                  y esta Iglesia como su Iglesia.
                </p>
              ) : (
                <ul className="lista-personas">
                  {hijosDetalle.map((h) => {
                    const est = estadoGrupo(miembrosDe(h.id).length, h.capacidad);
                    return (
                      <li key={h.id}>
                        <FilaPersona
                          nombre={`🏡 ${h.nombre}`}
                          meta={[
                            `${miembrosDe(h.id).length} personas`,
                            liderVisible(datos, h) || undefined,
                            lineaReunion(h) || undefined,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          derecha={<span className={`chip ${est.clase}`}>{est.etiqueta}</span>}
                          onClick={() => setSeleccionado(h.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          {pestana === 'datos' && (
            <>
          <StatsGrupo datos={datos} grupo={detalle} miembros={miembrosDe(detalle.id)} />
          {padreDetalle && (
            <>
              <h3>Su Iglesia</h3>
              <ul className="lista-personas">
                <li>
                  <FilaPersona
                    nombre={`🏠 ${padreDetalle.nombre}`}
                    meta="La Iglesia de la que es parte este Oikos"
                    onClick={() => setSeleccionado(padreDetalle.id)}
                  />
                </li>
              </ul>
            </>
          )}
          <FormEditarGrupo
            key={detalle.id}
            repo={repo}
            datos={datos}
            grupo={detalle}
            onGuardado={recargar}
            onCerrar={() => setSeleccionado(null)}
          />
          <div className="form-acciones">
            <BorrarBoton
              texto="🗑️ Borrar grupo"
              onBorrar={async () => {
                await borrarGrupo(repo, datos, detalle.id);
                setSeleccionado(null);
                recargar();
              }}
            />
          </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/** El formulario de edición del grupo: nace con los datos del grupo
 * (el padre lo monta con key = id del grupo, así cada grupo abre con
 * SUS datos, sin efectos de sincronía) y confirma al guardar. */
function FormEditarGrupo({
  repo,
  datos,
  grupo,
  onGuardado,
  onCerrar,
}: {
  repo: Repo;
  datos: DatosMinisterio;
  grupo: Grupo;
  onGuardado: () => void;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(grupo.nombre);
  const [tipo, setTipo] = useState(grupo.tipo ?? '');
  const [padreId, setPadreId] = useState(grupo.padreId ?? '');
  const [miembrosSel, setMiembrosSel] = useState<string[]>(() =>
    idsMiembrosDeGrupo(datos, grupo.id).filter((id) => !esBaja(clasificarPersona(datos, id).clase)),
  );
  const [zona, setZona] = useState(grupo.zona ?? '');
  const [liderId, setLiderId] = useState<string | null>(grupo.liderId ?? null);
  const [dia, setDia] = useState(grupo.dia ?? '');
  const [hora, setHora] = useState(grupo.hora ?? '');
  const [lugar, setLugar] = useState(grupo.lugar ?? '');
  const [capacidad, setCapacidad] = useState(grupo.capacidad ? String(grupo.capacidad) : '');
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');
  const personaDe = (id?: string | null) => datos.personas.find((p) => p.id === id);
  const tocar = () => setGuardado(false);
  return (
    <>
      <h3>✏️ Editar grupo</h3>
      {error && <p className="aviso aviso-rojo">{error}</p>}
      {guardado && <p className="aviso aviso-verde">✓ Cambios guardados.</p>}
      <div className="form-fila">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => { setNombre(e.target.value); tocar(); }} />
        </label>
        <label>
          Zona
          <InputZona datos={datos} value={zona} onChange={(v) => { setZona(v); tocar(); }} />
        </label>
      </div>
      <div className="form-fila">
        <label>
          Tipo
          <input value={tipo} onChange={(e) => { setTipo(e.target.value); tocar(); }} list="tipos-grupo" placeholder="Ej.: Iglesia, Oikos" />
        </label>
        <label>
          Capacidad
          <input type="number" min={0} value={capacidad} onChange={(e) => { setCapacidad(e.target.value); tocar(); }} />
        </label>
      </div>
      {claveTipoGrupo({ tipo } as Grupo) === 'oikos' && (
        <div className="form-fila">
          <label>
            Su Iglesia
            <select value={padreId} onChange={(e) => { setPadreId(e.target.value); tocar(); }}>
              <option value="">Sin Iglesia asignada</option>
              {datos.grupos.filter((g) => esIglesia(g) && g.id !== grupo.id).map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <h3>👤 Líder</h3>
      <p className="tenue">
        Líder: {liderId ? `${personaDe(liderId)?.nombre} ${personaDe(liderId)?.apellidos ?? ''}` : 'sin líder'}
        {liderId && (
          <button type="button" className="btn" onClick={() => { setLiderId(null); tocar(); }}>✕ Quitar</button>
        )}
      </p>
      <SelectorPersona
        datos={datos}
        onElegir={(id) => { setLiderId(id); tocar(); }}
        placeholder="🔍 Cambiar el líder…"
      />
      <div className="form-fila">
        <label>
          Día de reunión
          <input value={dia} onChange={(e) => { setDia(e.target.value); tocar(); }} list="dias-semana" />
        </label>
        <label>
          Hora
          <input type="time" value={hora} onChange={(e) => { setHora(e.target.value); tocar(); }} />
        </label>
      </div>
      <div className="form-fila">
        <label>
          Lugar de reunión
          <input value={lugar} onChange={(e) => { setLugar(e.target.value); tocar(); }} list="lugares-grupo" />
        </label>
      </div>
      <datalist id="dias-semana">{DIAS_SEMANA.map((d) => <option key={d} value={d} />)}</datalist>
      <datalist id="lugares-grupo">{[...new Set(datos.grupos.map((g) => g.lugar).filter(Boolean))].map((l) => <option key={l} value={l} />)}</datalist>
      <SeccionMiembros datos={datos} seleccion={miembrosSel} onCambiar={(ids) => { setMiembrosSel(ids); tocar(); }} tipoTexto={tipo} grupoActualId={grupo.id} />
      <div className="form-acciones">
        <button
          className="btn btn-dorado"
          disabled={!nombre.trim()}
          onClick={async () => {
            setError('');
            setGuardado(false);
            try {
              const actualizado = {
                ...grupo,
                nombre: nombre.trim(),
                tipo: tipo.trim() || undefined,
                padreId: claveTipoGrupo({ tipo } as Grupo) === 'oikos' ? padreId || undefined : undefined,
                zona: zona.trim() || undefined,
                liderId,
                liderTexto: undefined,
                dia: dia.trim() || undefined,
                hora: hora.trim() || undefined,
                lugar: lugar.trim() || undefined,
                capacidad: capacidadNumero(capacidad),
              };
              await actualizarGrupo(repo, actualizado);
              const iniciales = idsMiembrosDeGrupo(datos, grupo.id).filter(
                (id) => !esBaja(clasificarPersona(datos, id).clase),
              );
              for (const id of miembrosSel) {
                if (!iniciales.includes(id)) await agregarAGrupo(repo, datos, id, actualizado);
              }
              for (const id of iniciales) {
                if (!miembrosSel.includes(id)) await quitarDeGrupo(repo, datos, id, grupo.id);
              }
              onGuardado();
              onCerrar();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          💾 Guardar cambios
        </button>
      </div>
    </>
  );
}
