import { useCallback, useEffect, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio } from '../modelo/tipos';
import { verificarCuadre, type ResultadoCuadre } from '../motor/cuadre';
import { convertirRespaldo, type InformeMigracion, type RespaldoViejo } from '../migracion/convertir';
import { importarEnRepo, puedeImportar } from '../migracion/importar';

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

  return (
    <div className="panel">
      <header className="panel-cabecera"><h1>🧳 Migración (una sola vez)</h1></header>
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
    </div>
  );
}
