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
import { traerManos, vistaPreviaManos, type VistaPreviaManos } from '../migracion/traerManos';
import { completarBeneficiarios, vistaPreviaCompletarBeneficiarios, type ResumenCompletarBeneficiarios } from '../migracion/completarBeneficiarios';
import { completarGrupos, vistaPreviaCompletarGrupos, type ResumenCompletarGrupos } from '../migracion/completarGrupos';
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
      <header className="panel-cabecera"><h1>🔀 Migración (una sola vez)</h1></header>
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
    </div>
  );
}
