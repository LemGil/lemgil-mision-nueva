import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import type { Repo } from '../datos/repo';
import type { Sincronizador } from '../datos/sync';
import type { DatosMinisterio } from '../modelo/tipos';
import { verificarCuadre, type ResultadoCuadre } from '../motor/cuadre';
import {
  completarPersonas,
  ETIQUETA_CAMPO,
  vistaPreviaCompletar,
  type ResumenCompletar,
} from '../migracion/completar';
import { traerRed, vistaPreviaRed, type ResultadoTraerRed, type VistaPreviaRed } from '../migracion/traerRed';
import { unirColaboradoresRepetidos } from '../migracion/unirColaboradores';
import { restaurarRedDesdeRespaldo } from '../migracion/restaurarRed';
import { diagnosticoRed } from '../migracion/diagnosticoRed';
import { borradosRed, borrarDefinitivoAporteRed, borrarDefinitivoColaboradorRed, restaurarAporteBorrado, restaurarColaboradorBorrado, type BorradosRed } from '../migracion/recuperarRed';
import BorrarBoton from './BorrarBoton';
import { formatoDinero } from '../motor/dinero';
import { traerManos, vistaPreviaManos, type VistaPreviaManos } from '../migracion/traerManos';
import { completarBeneficiarios, vistaPreviaCompletarBeneficiarios, type ResumenCompletarBeneficiarios } from '../migracion/completarBeneficiarios';
import { completarGrupos, vistaPreviaCompletarGrupos, type ResumenCompletarGrupos } from '../migracion/completarGrupos';
import { renombrarAnadidos } from '../migracion/renombrarAnadidos';
import { convertirRespaldo, type InformeMigracion, type RespaldoViejo } from '../migracion/convertir';
import { importarEnRepo, puedeImportar } from '../migracion/importar';
import GuiaPagina from './GuiaPagina';
import { FilaAcciones, CabeceraPagina, Pestanas } from './Piezas';

interface VistaPrevia {
  datos: DatosMinisterio;
  informe: InformeMigracion;
  cuadre: ResultadoCuadre;
}

export default function Migrar({ repo, sincronizador }: { repo: Repo; sincronizador: Sincronizador | null }) {
  const [actuales, setActuales] = useState<DatosMinisterio | null>(null);
  const [previa, setPrevia] = useState<VistaPrevia | null>(null);
  const [error, setError] = useState('');
  const [importado, setImportado] = useState(false);
  const [importando, setImportando] = useState(false);
  const [respaldoCompletar, setRespaldoCompletar] = useState<RespaldoViejo | null>(null);
  const [previaCompletar, setPreviaCompletar] = useState<ResumenCompletar | null>(null);
  const [completado, setCompletado] = useState<ResumenCompletar | null>(null);
  const [completando, setCompletando] = useState(false);
  const [respaldoRed, setRespaldoRed] = useState<RespaldoViejo | null>(null);
  const [previaRed, setPreviaRed] = useState<VistaPreviaRed | null>(null);
  const [traidaRed, setTraidaRed] = useState<ResultadoTraerRed | null>(null);
  const [uniendo, setUniendo] = useState(false);
  const [avisoUnion, setAvisoUnion] = useState('');
  const [restaurando, setRestaurando] = useState(false);
  const [avisoRestaurar, setAvisoRestaurar] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [diagnostico, setDiagnostico] = useState<string[] | null>(null);
  const [papelera, setPapelera] = useState<BorradosRed | null>(null);
  const [cargandoPapelera, setCargandoPapelera] = useState(false);
  const [avisoPapelera, setAvisoPapelera] = useState('');
  const [trayendoRed, setTrayendoRed] = useState(false);
  const [respaldoManos, setRespaldoManos] = useState<RespaldoViejo | null>(null);
  const [previaManos, setPreviaManos] = useState<VistaPreviaManos | null>(null);
  const [traidasManos, setTraidasManos] = useState<VistaPreviaManos | null>(null);
  const [trayendoManos, setTrayendoManos] = useState(false);
  const [respaldoBenef, setRespaldoBenef] = useState<RespaldoViejo | null>(null);
  const [previaBenef, setPreviaBenef] = useState<ResumenCompletarBeneficiarios | null>(null);
  const [traidosBenef, setTraidosBenef] = useState<ResumenCompletarBeneficiarios | null>(null);
  const [completandoBenef, setCompletandoBenef] = useState(false);
  const [respaldoGrupos, setRespaldoGrupos] = useState<RespaldoViejo | null>(null);
  const [previaGrupos, setPreviaGrupos] = useState<ResumenCompletarGrupos | null>(null);
  const [traidosGrupos, setTraidosGrupos] = useState<ResumenCompletarGrupos | null>(null);
  const [completandoGrupos, setCompletandoGrupos] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [renombrado, setRenombrado] = useState<number | null>(null);
  // Regla de pestañas (2026-11-23): las herramientas en pestañas,
  // no apiladas: Importar · Completar datos · Traer · Añadidos.
  const [seccion, setSeccion] = useState<'importar' | 'completar' | 'traer' | 'anadidos'>('importar');

  const cargar = useCallback(async () => {
    setActuales(await aDatosMinisterio(repo));
  }, [repo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!actuales) return <p className="cargando">Cargando…</p>;
  const guardia = puedeImportar(actuales);

  const leerArchivo = async (archivo: File) => {
    setError('');
    setPrevia(null);
    try {
      const textoLeido = await archivo.text();
      const respaldo = JSON.parse(textoLeido) as RespaldoViejo;
      if (!respaldo || typeof respaldo !== 'object' || !Array.isArray(respaldo.personas)) {
        throw new Error('Ese archivo no es un respaldo de la app actual (le falta la tabla de personas).');
      }
      const { datos, informe } = convertirRespaldo(respaldo);
      setPrevia({ datos, informe, cuadre: verificarCuadre(datos) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const importar = async () => {
    if (!previa) return;
    setImportando(true);
    setError('');
    try {
      await importarEnRepo(repo, previa.datos);
      setImportado(true);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportando(false);
    }
  };

  const leerArchivoCompletar = async (archivo: File) => {
    setError('');
    setPreviaCompletar(null);
    setCompletado(null);
    try {
      const respaldo = JSON.parse(await archivo.text()) as RespaldoViejo;
      if (!respaldo || typeof respaldo !== 'object' || !Array.isArray(respaldo.personas)) {
        throw new Error('Ese archivo no es un respaldo de la app actual (le falta la tabla de personas).');
      }
      const { datos } = convertirRespaldo(respaldo);
      setRespaldoCompletar(respaldo);
      setPreviaCompletar(vistaPreviaCompletar(actuales.personas, datos.personas).resumen);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const completar = async () => {
    if (!respaldoCompletar) return;
    setCompletando(true);
    setError('');
    try {
      const resumen = await completarPersonas(repo, respaldoCompletar, actuales.personas);
      setCompletado(resumen);
      setPreviaCompletar(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompletando(false);
    }
  };

  const textoResumen = (r: ResumenCompletar) =>
    Object.entries(r.campos)
      .map(([campo, n]) => `${ETIQUETA_CAMPO[campo] ?? campo} ×${n}`)
      .join(' · ');

  const leerArchivoRed = async (archivo: File) => {
    setError('');
    setPreviaRed(null);
    setTraidaRed(null);
    try {
      const respaldo = JSON.parse(await archivo.text()) as RespaldoViejo;
      if (!respaldo || typeof respaldo !== 'object' || !Array.isArray(respaldo.colaboradores)) {
        throw new Error('Ese archivo no trae la Red de Colaboradores de la app anterior.');
      }
      setRespaldoRed(respaldo);
      setPreviaRed(vistaPreviaRed(respaldo));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const leerArchivoManos = async (archivo: File) => {
    setError('');
    setPreviaManos(null);
    setTraidasManos(null);
    try {
      const respaldo = JSON.parse(await archivo.text()) as RespaldoViejo;
      if (!respaldo || typeof respaldo !== 'object' || !Array.isArray(respaldo.campanas)) {
        throw new Error('Ese archivo no trae las Campañas de Manos Abiertas de la app anterior.');
      }
      setRespaldoManos(respaldo);
      setPreviaManos(vistaPreviaManos(respaldo));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const traerLasManos = async () => {
    if (!respaldoManos) return;
    setTrayendoManos(true);
    setError('');
    try {
      const resumen = await traerManos(repo, respaldoManos);
      setTraidasManos(resumen);
      setPreviaManos(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrayendoManos(false);
    }
  };

  const leerArchivoGrupos = async (archivo: File) => {
    setError('');
    setPreviaGrupos(null);
    setTraidosGrupos(null);
    try {
      const respaldo = JSON.parse(await archivo.text()) as RespaldoViejo;
      if (!respaldo || typeof respaldo !== 'object' || !Array.isArray(respaldo.grupos)) {
        throw new Error('Ese archivo no es un respaldo de la app anterior.');
      }
      setRespaldoGrupos(respaldo);
      setPreviaGrupos(vistaPreviaCompletarGrupos(actuales.grupos, respaldo));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const completarLosGrupos = async () => {
    if (!respaldoGrupos) return;
    setCompletandoGrupos(true);
    setError('');
    try {
      const resumen = await completarGrupos(repo, respaldoGrupos, actuales.grupos);
      setTraidosGrupos(resumen);
      setPreviaGrupos(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompletandoGrupos(false);
    }
  };

  const renombrarPaso = async () => {
    setRenombrando(true);
    setError('');
    try {
      setRenombrado(await renombrarAnadidos(repo));
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRenombrando(false);
    }
  };

  const leerArchivoBenef = async (archivo: File) => {
    setError('');
    setPreviaBenef(null);
    setTraidosBenef(null);
    try {
      const respaldo = JSON.parse(await archivo.text()) as RespaldoViejo;
      if (!respaldo || typeof respaldo !== 'object' || !Array.isArray(respaldo.beneficiarios)) {
        throw new Error('Ese archivo no es un respaldo de la app anterior.');
      }
      setRespaldoBenef(respaldo);
      setPreviaBenef(vistaPreviaCompletarBeneficiarios(actuales.beneficiarios, respaldo));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const completarLosBeneficiarios = async () => {
    if (!respaldoBenef) return;
    setCompletandoBenef(true);
    setError('');
    try {
      const resumen = await completarBeneficiarios(repo, respaldoBenef, actuales.beneficiarios);
      setTraidosBenef(resumen);
      setPreviaBenef(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompletandoBenef(false);
    }
  };

  const unirRepetidos = async () => {
    setUniendo(true);
    setError('');
    try {
      const r = await unirColaboradoresRepetidos(repo, actuales);
      setAvisoUnion(
        r.grupos === 0
          ? '✓ No hay colaboradores repetidos: cada nombre aparece una sola vez.'
          : `✓ Se unió ${r.grupos} nombre(s): ${r.absorbidas} ficha(s) copia fuera y ${r.aportesMovidos} aporte(s) pasaron a la ficha principal. Sincroniza para subirlo.`,
      );
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUniendo(false);
    }
  };

  const restaurarLaRed = async () => {
    if (!respaldoRed) return;
    setRestaurando(true);
    setError('');
    try {
      const r = await restaurarRedDesdeRespaldo(repo, actuales, respaldoRed);
      if (r.fallos.length > 0) {
        setError(
          `La restauración no pudo escribir ${r.fallos.length} registro(s): ${r.fallos.map((f) => `${f.tabla} ${f.id}: ${f.mensaje}`).join(' · ')}. Al releer: ${r.verificacion.siguenFuera} aporte(s) siguen fuera de su ficha. Pásale este aviso a Leo tal cual.`,
        );
      } else if (r.verificacion.siguenFuera > 0 || r.verificacion.fichasQueFaltan > 0) {
        setError(
          `Escribí la reparación y al RELEER esta base quedó así: ${r.verificacion.siguenFuera} aporte(s) del respaldo siguen fuera de su ficha y ${r.verificacion.fichasQueFaltan} ficha(s) con aportes no aparecen. No es el resultado esperado: pásale este aviso a Leo tal cual.`,
        );
      } else {
        setAvisoRestaurar(
          r.fichasRestauradas === 0 && r.aportesReubicados === 0 && r.aportesRestaurados === 0
            ? '✓ Todo está en su sitio, verificado al releer la base: cada ficha y cada aporte del respaldo están con su dueño.'
            : `✓ Reparación hecha y VERIFICADA al releer la base: ${r.fichasRestauradas} ficha(s) restaurada(s), ${r.aportesReubicados} aporte(s) devueltos a su dueño, ${r.aportesRestaurados} aporte(s) restaurados${r.copiasVaciasSaltadas > 0 ? `; ${r.copiasVaciasSaltadas} copia(s) vacía(s) de la unión quedaron fuera, sin resucitar` : ''}. Sincroniza para subirlo.`,
        );
      }
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestaurando(false);
    }
  };

  const verPapelera = async () => {
    setCargandoPapelera(true);
    setError('');
    try {
      setPapelera(await borradosRed(repo));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargandoPapelera(false);
    }
  };

  const revisarLaRed = async () => {
    if (!respaldoRed) return;
    setRevisando(true);
    setError('');
    try {
      const sobresC = await repo.todosConSobre('colaboradores');
      const sobresA = await repo.todosConSobre('aportesRed');
      setDiagnostico(diagnosticoRed(actuales, respaldoRed, sobresC, sobresA));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRevisando(false);
    }
  };

  const traerLaRed = async () => {
    if (!respaldoRed) return;
    setTrayendoRed(true);
    setError('');
    try {
      const resumen = await traerRed(repo, respaldoRed);
      setTraidaRed(resumen);
      setPreviaRed(null);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrayendoRed(false);
    }
  };

  return (
    <div className="panel">
      <CabeceraPagina titulo="🔀 Migración (una sola vez)" />
      <GuiaPagina texto="La puerta de entrada de los datos: importar el respaldo de la app anterior (solo con la base vacía) y completar los datos que falten, sin sobrescribir nada." />
      <p className="tenue">
        Trae el respaldo JSON completo de la app actual («💾 Respaldo JSON», junto al botón de
        sincronizar). Primero verás el informe de la conversión — qué viaja, qué queda fuera y
        por qué — y el cuadre de los datos ya convertidos. Nada se importa hasta que pulses el
        botón.
      </p>

      {!guardia.ok && !importado && <p className="aviso aviso-rojo">{guardia.motivo}</p>}
      {error && <p className="aviso aviso-rojo">{error}</p>}

      <Pestanas
        opciones={[
          { id: 'importar', etiqueta: '🧳 Importar' },
          { id: 'completar', etiqueta: '💾 Completar datos' },
          { id: 'traer', etiqueta: '📥 Traer' },
          { id: 'anadidos', etiqueta: '🏘️ Añadidos' },
        ]}
        activa={seccion}
        onCambiar={(id) => setSeccion(id as 'importar' | 'completar' | 'traer' | 'anadidos')}
      />

      {seccion === 'importar' && (
        <>
          {importado ? (
        <section className="tarjeta">
          <h2>✓ Migración importada</h2>
          <p>
            Los datos ya viven en la app nueva. Sincroniza (chip de arriba) para subirlos a
            mision-lemgil, y revisa el Panel: el cuadre debe estar en verde. Si el cuadre marca
            repetidos, son los que ya existían: se cazan en Personas con la señal ⚠.
          </p>
        </section>
      ) : (
        <>
          <section className="tarjeta">
            <h2>1 · Elige el respaldo</h2>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void leerArchivo(f);
              }}
            />
          </section>

          {previa && (
            <>
              <section className="tarjeta">
                <h2>2 · Lo que viaja</h2>
                <table className="tabla-informe">
                  <tbody>
                    {Object.entries(previa.informe.conteos).map(([tabla, n]) => (
                      <tr key={tabla}><td>{tabla}</td><td className="num">{n}</td></tr>
                    ))}
                  </tbody>
                </table>
                {previa.informe.huerfanos.length > 0 && (
                  <>
                    <h3>⚠ Procesos huérfanos (no viajan)</h3>
                    <ul className="alerta-lista">
                      {previa.informe.huerfanos.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </>
                )}
                {previa.informe.avisos.length > 0 && (
                  <>
                    <h3>Avisos</h3>
                    <ul className="alerta-lista">
                      {previa.informe.avisos.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </>
                )}
                <h3>El cuadre de lo convertido</h3>
                <p>
                  {previa.cuadre.verde ? (
                    <span className="chip chip-verde">🟢 Cuadra</span>
                  ) : (
                    <span className="chip chip-rojo">🔴 No cuadra todavía</span>
                  )}
                </p>
                {!previa.cuadre.verde && (
                  <ul className="alerta-lista">
                    {previa.cuadre.chequeos.filter((c) => !c.ok).map((c) => (
                      <li key={c.nombre}>{c.nombre}: {c.detalle}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="tarjeta">
                <h2>3 · Importar</h2>
                <p className="tenue">
                  Esto escribe los datos en esta app y quedan encolados para subir. No toca la
                  app actual.
                </p>
                <button className="btn btn-dorado" disabled={!guardia.ok || importando} onClick={importar}>
                  {importando ? 'Importando…' : '🧳 Importar la migración'}
                </button>
              </section>
            </>
          )}
        </>
      )}
        </>
      )}

      {seccion === 'completar' && actuales.personas.length > 0 && (
        <section className="tarjeta">
          <h2>💾 Completar datos de las personas</h2>
          <p className="tenue">
            La primera conversión dejó campos sin viajar (apellidos, profesión, estado civil,
            bautismo, cónyuge, hijos…). Elige el mismo respaldo y se rellenan <strong>solo los
            huecos</strong> de las personas que ya están aquí: nunca se sobrescribe un dato, no
            se crea a nadie y no se tocan los procesos.
          </p>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leerArchivoCompletar(f);
            }}
          />
          {previaCompletar && previaCompletar.personas > 0 && (
            <>
              <p>
                <strong>{previaCompletar.personas} personas</strong> ganarían datos:{' '}
                {textoResumen(previaCompletar)}.
              </p>
              <button className="btn btn-dorado" disabled={completando} onClick={completar}>
                {completando ? 'Completando…' : '💾 Completar los datos'}
              </button>
            </>
          )}
          {previaCompletar && previaCompletar.personas === 0 && (
            <p className="aviso aviso-verde">✓ No falta nada: las fichas ya tienen todos los datos del respaldo.</p>
          )}
          {completado && (
            <p className="aviso aviso-verde">
              ✓ Se completaron {completado.personas} personas ({textoResumen(completado)}).
              Sincroniza para subirlo.
            </p>
          )}
        </section>
      )}

      {seccion === 'traer' && (
        <>
        <section className="tarjeta">
          <h2>🤝 Traer la Red de Colaboradores</h2>
          <p className="tenue">
            La Red quedó fuera de la migración principal porque es externa a la ficha única.
            Elige el mismo respaldo y entra <strong>lo que falte</strong>, registro a registro
            por su id: lo que ya está no se duplica ni se sobrescribe, y lo que borraste no
            resucita. Se puede correr las veces que haga falta.
          </p>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leerArchivoRed(f);
            }}
          />
          {previaRed && previaRed.colaboradores > 0 && (
            <>
              <p>
                El respaldo trae <strong>{previaRed.colaboradores} colaboradores</strong> con{' '}
                <strong>{previaRed.aportes} aportes</strong> (total {previaRed.total}). Al
                traer solo entra lo que falte aquí.
                {previaRed.huerfanos > 0 &&
                  ` ${previaRed.huerfanos} aporte(s) sin colaborador quedan fuera.`}
              </p>
              <button className="btn btn-dorado" disabled={trayendoRed} onClick={traerLaRed}>
                {trayendoRed ? 'Trayendo…' : '🤝 Traer la Red'}
              </button>
            </>
          )}
          {previaRed && previaRed.colaboradores === 0 && (
            <p className="aviso aviso-rojo">Ese respaldo no trae colaboradores en su Red.</p>
          )}
          {traidaRed && (
            <p className="aviso aviso-verde">
              ✓ Entraron {traidaRed.colaboradores} colaboradores con {traidaRed.aportes} aportes
              (total {traidaRed.total}).
              {traidaRed.yaEstaban > 0 &&
                ` ${traidaRed.yaEstaban} registro(s) del respaldo ya estaban y no se tocaron.`}
              {traidaRed.restaurados > 0 &&
                ` Se restauraron ${traidaRed.restaurados} registro(s) que habían sido borrados.`}
              {' '}Sincroniza para subirlos.
            </p>
          )}
        </section>

        <section className="tarjeta">
          <h2>🤝 Unir colaboradores repetidos</h2>
          <p className="tenue">
            Si la misma persona o iglesia quedó dos veces en la Red, sus aportes cuelgan de
            una sola ficha y la otra se ve en cero. Esta herramienta pasa todos los aportes
            a la ficha con más aportes y borra las copias; los datos de contacto que le
            falten a la principal se completan desde las copias.
          </p>
          <button className="btn btn-dorado" disabled={uniendo} onClick={unirRepetidos}>
            {uniendo ? 'Uniendo…' : '🤝 Unir repetidos'}
          </button>
          {avisoUnion && <p className="aviso aviso-verde">{avisoUnion}</p>}
        </section>

        <section className="tarjeta">
          <h2>🎯 Restaurar la Red según el respaldo</h2>
          <p className="tenue">
            La reparación fuerte, por id: cada colaborador del respaldo vuelve a existir con
            su nombre, y cada aporte del respaldo vuelve a colgar de <strong>su dueño</strong>,
            esté donde esté ahora. Los aportes registrados a mano en esta app no están en el
            respaldo y no se tocan.
          </p>
          {respaldoRed ? (
            <button className="btn btn-dorado" disabled={restaurando} onClick={restaurarLaRed}>
              {restaurando ? 'Restaurando…' : '🎯 Restaurar según el respaldo'}
            </button>
          ) : (
            <p className="tenue">Primero elige el respaldo arriba, en «🤝 Traer la Red de Colaboradores».</p>
          )}
          {avisoRestaurar && <p className="aviso aviso-verde">{avisoRestaurar}</p>}
        </section>

        <section className="tarjeta">
          <h2>♻️ Recuperar borrados de la Red</h2>
          <p className="tenue">
            La papelera: borrar en la app es lógico (el registro queda guardado como
            borrado, no se pierde). Aquí están las fichas y los aportes de la Red hoy
            borrados — incluidos los registrados a mano, que no están en el respaldo —
            y cada uno vuelve tal cual con su botón. Si una ficha y sus aportes están
            borrados, restaura primero la ficha y después sus aportes. Y lo que ya no
            quieras guardar ni en la papelera se puede borrar definitivamente: sale de
            la nube y de este equipo, para siempre (necesita conexión y la sesión
            iniciada).
          </p>
          <button className="btn btn-dorado" disabled={cargandoPapelera} onClick={verPapelera}>
            {cargandoPapelera ? 'Buscando…' : '♻️ Ver los borrados'}
          </button>
          {avisoPapelera && <p className="aviso aviso-verde">{avisoPapelera}</p>}
          {papelera && papelera.colaboradores.length === 0 && papelera.aportes.length === 0 && (
            <p className="tenue">La papelera está vacía: no hay nada borrado en la Red.</p>
          )}
          {papelera && papelera.colaboradores.length > 0 && (
            <>
              <h3>Fichas borradas</h3>
              <ul className="lista">
                {papelera.colaboradores.map((c) => (
                  <li key={c.id}>
                    <FilaAcciones
                      nombre={`${c.nombre} ${c.apellido ?? ''}`.trim()}
                      meta={c.tipo ?? ''}
                      acciones={
                        <>
                          <button
                            className="btn"
                            onClick={async () => {
                              await restaurarColaboradorBorrado(repo, c);
                              await verPapelera();
                              await cargar();
                            }}
                          >
                            ♻️ Restaurar
                          </button>
                          <BorrarBoton
                            texto="🗑️ Definitivo"
                            titulo="Borra para siempre esta ficha y los aportes suyos que están en la papelera. Sin vuelta atrás."
                            onBorrar={async () => {
                              if (!sincronizador) {
                                setError('El borrado definitivo necesita la sesión iniciada y conexión: sal y entra de nuevo con tu correo y contraseña.');
                                return;
                              }
                              setError('');
                              setAvisoPapelera('');
                              try {
                                const r = await borrarDefinitivoColaboradorRed(repo, sincronizador, c);
                                setAvisoPapelera(
                                  `Borrado para siempre: la ficha de ${`${c.nombre} ${c.apellido ?? ''}`.trim()} y ${r.aportes} aporte(s) que estaban en la papelera.`,
                                );
                              } catch (e) {
                                setError(e instanceof Error ? e.message : String(e));
                              }
                              await verPapelera();
                              await cargar();
                            }}
                          />
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          {papelera && papelera.aportes.length > 0 && (
            <>
              <h3>Aportes borrados</h3>
              <ul className="lista">
                {papelera.aportes.map((a) => {
                  const dueno =
                    actuales.colaboradores.find((c) => c.id === a.colaboradorId) ??
                    papelera.colaboradores.find((c) => c.id === a.colaboradorId);
                  return (
                    <li key={a.id}>
                      <FilaAcciones
                        nombre={`${a.fecha} · ${a.tipo} · ${formatoDinero(a.monto)}`}
                        meta={dueno ? `de ${`${dueno.nombre} ${dueno.apellido ?? ''}`.trim()}` : 'sin ficha'}
                        acciones={
                          <>
                            <button
                              className="btn"
                              onClick={async () => {
                                await restaurarAporteBorrado(repo, a);
                                await verPapelera();
                                await cargar();
                              }}
                            >
                              ♻️ Restaurar
                            </button>
                            <BorrarBoton
                              texto="🗑️ Definitivo"
                              titulo="Borra este aporte para siempre. Sin vuelta atrás."
                              onBorrar={async () => {
                                if (!sincronizador) {
                                  setError('El borrado definitivo necesita la sesión iniciada y conexión: sal y entra de nuevo con tu correo y contraseña.');
                                  return;
                                }
                                setError('');
                                setAvisoPapelera('');
                                try {
                                  await borrarDefinitivoAporteRed(sincronizador, a);
                                  setAvisoPapelera(
                                    `Borrado para siempre: el aporte del ${a.fecha} por ${formatoDinero(a.monto)}.`,
                                  );
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : String(e));
                                }
                                await verPapelera();
                                await cargar();
                              }}
                            />
                          </>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section className="tarjeta">
          <h2>🔍 Revisar la Red contra el respaldo</h2>
          <p className="tenue">
            Solo lectura, no toca nada: dice cómo está cada ficha del respaldo (bien, con
            otro nombre, borrada o ausente) y dónde cuelgan hoy sus aportes. Es el mapa
            exacto de la base para reparar sin adivinar.
          </p>
          {respaldoRed ? (
            <button className="btn btn-dorado" disabled={revisando} onClick={revisarLaRed}>
              {revisando ? 'Revisando…' : '🔍 Revisar la Red'}
            </button>
          ) : (
            <p className="tenue">Primero elige el respaldo arriba, en «🤝 Traer la Red de Colaboradores».</p>
          )}
          {diagnostico && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
              {diagnostico.join('\n')}
            </pre>
          )}
        </section>
        </>
      )}

      {seccion === 'traer' && (
        <>
          {actuales.campanas.length === 0 ? (
        <section className="tarjeta">
          <h2>👐 Traer las Campañas y Entregas de Manos Abiertas</h2>
          <p className="tenue">
            La migración principal trajo los beneficiarios, pero las campañas (Desayuno con
            Jesús, Sopa con Jesús…) y sus entregas quedaron en la app anterior. Elige el mismo
            respaldo y entran tal cual estaban. Solo trabaja si aún no hay campañas aquí:
            nunca duplica.
          </p>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leerArchivoManos(f);
            }}
          />
          {previaManos && previaManos.campanas > 0 && (
            <>
              <p>
                Entrarían <strong>{previaManos.campanas} campañas</strong> con{' '}
                <strong>{previaManos.entregas} entregas</strong>.
                {previaManos.huerfanas > 0 &&
                  ` ${previaManos.huerfanas} entrega(s) sin campaña quedan fuera.`}
              </p>
              <button className="btn btn-dorado" disabled={trayendoManos} onClick={traerLasManos}>
                {trayendoManos ? 'Trayendo…' : '👐 Traer Campañas y Entregas'}
              </button>
            </>
          )}
          {previaManos && previaManos.campanas === 0 && (
            <p className="aviso aviso-rojo">Ese respaldo no trae campañas de Manos Abiertas.</p>
          )}
          {traidasManos && (
            <p className="aviso aviso-verde">
              ✓ Entraron {traidasManos.campanas} campañas con {traidasManos.entregas} entregas.
              Sincroniza para subirlas.
            </p>
          )}
        </section>
      ) : (
        <section className="tarjeta">
          <h2>👐 Campañas de Manos Abiertas</h2>
          <p className="aviso aviso-verde">
            ✓ Las campañas ya están en la app ({actuales.campanas.length}). Su mesa está en
            👐 Manos Abiertas.
          </p>
        </section>
      )}
        </>
      )}

      {seccion === 'completar' && (
        <>
      <section className="tarjeta">
        <h2>👐 Completar los datos de los beneficiarios</h2>
        <p className="tenue">
          La primera migración trajo a los beneficiarios sin su tipo (Persona, Familia o
          Grupo), su nombre propio, su representante, el tamaño de la familia, el teléfono y
          la zona. Elige el mismo respaldo y se rellenan SOLO los huecos: lo que ya esté
          puesto no se toca.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void leerArchivoBenef(f);
          }}
        />
        {previaBenef && previaBenef.beneficiarios > 0 && (
          <>
            <p>
              <strong>{previaBenef.beneficiarios} beneficiarios</strong> ganarían datos:{' '}
              {Object.entries(previaBenef.campos)
                .map(([campo, n]) => `${campo}: ${n}`)
                .join(' · ')}
            </p>
            <button className="btn btn-dorado" disabled={completandoBenef} onClick={completarLosBeneficiarios}>
              {completandoBenef ? 'Completando…' : '👐 Completar beneficiarios'}
            </button>
          </>
        )}
        {previaBenef && previaBenef.beneficiarios === 0 && (
          <p className="aviso aviso-verde">✓ Los beneficiarios ya tienen todos sus datos.</p>
        )}
        {traidosBenef && (
          <p className="aviso aviso-verde">
            ✓ Se completaron {traidosBenef.beneficiarios} beneficiarios. Sincroniza para subirlos.
          </p>
        )}
      </section>
        </>
      )}

      {seccion === 'completar' && (
        <>
      <section className="tarjeta">
        <h2>🏠 Completar los datos de los grupos</h2>
        <p className="tenue">
          La primera migración trajo los grupos sin su reunión: el día, la hora, el lugar,
          la capacidad y el líder en texto libre quedaron en la app anterior. Elige el mismo
          respaldo y se rellenan SOLO los huecos: lo que ya esté puesto no se toca.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void leerArchivoGrupos(f);
          }}
        />
        {previaGrupos && previaGrupos.grupos > 0 && (
          <>
            <p>
              <strong>{previaGrupos.grupos} grupos</strong> ganarían datos:{' '}
              {Object.entries(previaGrupos.campos)
                .map(([campo, n]) => `${campo}: ${n}`)
                .join(' · ')}
            </p>
            <button className="btn btn-dorado" disabled={completandoGrupos} onClick={completarLosGrupos}>
              {completandoGrupos ? 'Completando…' : '🏠 Completar grupos'}
            </button>
          </>
        )}
        {previaGrupos && previaGrupos.grupos === 0 && (
          <p className="aviso aviso-verde">✓ Los grupos ya tienen todos sus datos.</p>
        )}
        {traidosGrupos && (
          <p className="aviso aviso-verde">
            ✓ Se completaron {traidosGrupos.grupos} grupos. Sincroniza para subirlos.
          </p>
        )}
      </section>
        </>
      )}

      {seccion === 'anadidos' && (
        <>
      <section className="tarjeta">
        <h2>🏘️ El paso se llama Añadidos</h2>
        <p className="tenue">
          El paso del gozne cambió de nombre: de «Integrado» a «Añadidos» (decisión del
          2026-11-22). Es el mismo paso — su id no cambia, como ayer Congregado se volvió
          Alcanzado. Este botón lo renombra en los datos de este equipo; al sincronizar,
          el nombre nuevo llega a todos.
        </p>
        <button className="btn btn-dorado" disabled={renombrando} onClick={renombrarPaso}>
          {renombrando ? 'Renombrando…' : '🏘️ Renombrar el paso a Añadidos'}
        </button>
        {renombrado === 1 && (
          <p className="aviso aviso-verde">✓ El paso ya se llama Añadidos. Sincroniza para subirlo.</p>
        )}
        {renombrado === 0 && (
          <p className="aviso aviso-verde">✓ El paso ya se llamaba Añadidos en este equipo.</p>
        )}
      </section>
        </>
      )}
    </div>
  );
}
