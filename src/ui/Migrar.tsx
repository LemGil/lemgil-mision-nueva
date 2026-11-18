import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import { verificarCuadre, type ResultadoCuadre } from '../motor/cuadre';
import {
  completarPersonas,
  ETIQUETA_CAMPO,
  vistaPreviaCompletar,
  type ResumenCompletar,
} from '../migracion/completar';
import { traerRed, vistaPreviaRed, type VistaPreviaRed } from '../migracion/traerRed';
import { convertirRespaldo, type InformeMigracion, type RespaldoViejo } from '../migracion/convertir';
import { importarEnRepo, puedeImportar } from '../migracion/importar';
import GuiaPagina from './GuiaPagina';

interface VistaPrevia {
  datos: DatosMinisterio;
  informe: InformeMigracion;
  cuadre: ResultadoCuadre;
}

export default function Migrar({ repo }: { repo: Repo }) {
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
  const [traidaRed, setTraidaRed] = useState<VistaPreviaRed | null>(null);
  const [trayendoRed, setTrayendoRed] = useState(false);

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
      <header className="panel-cabecera"><h1>🧳 Migración (una sola vez)</h1></header>
      <GuiaPagina texto="La puerta de entrada de los datos: importar el respaldo de la app anterior (solo con la base vacía) y completar los datos que falten, sin sobrescribir nada." />
      <p className="tenue">
        Trae el respaldo JSON completo de la app actual («💾 Respaldo JSON», junto al botón de
        sincronizar). Primero verás el informe de la conversión — qué viaja, qué queda fuera y
        por qué — y el cuadre de los datos ya convertidos. Nada se importa hasta que pulses el
        botón.
      </p>

      {!guardia.ok && !importado && <p className="aviso aviso-rojo">{guardia.motivo}</p>}
      {error && <p className="aviso aviso-rojo">{error}</p>}

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

      {actuales.personas.length > 0 && (
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

      {actuales.colaboradores.length === 0 ? (
        <section className="tarjeta">
          <h2>🤝 Traer la Red de Colaboradores</h2>
          <p className="tenue">
            La Red quedó fuera de la migración principal porque es externa a la ficha única.
            Elige el mismo respaldo y entran sus colaboradores con todos sus aportes, tal cual
            estaban. Solo trabaja si la Red está vacía aquí: nunca duplica.
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
                Entrarían <strong>{previaRed.colaboradores} colaboradores</strong> con{' '}
                <strong>{previaRed.aportes} aportes</strong> (total {previaRed.total}).
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
              (total {traidaRed.total}). Sincroniza para subirlos.
            </p>
          )}
        </section>
      ) : (
        <section className="tarjeta">
          <h2>🤝 Red de Colaboradores</h2>
          <p className="aviso aviso-verde">
            ✓ La Red ya está en la app ({actuales.colaboradores.length} colaboradores). Su mesa
            está en el menú: 🤝 Red de Colaboradores.
          </p>
        </section>
      )}
    </div>
  );
}
