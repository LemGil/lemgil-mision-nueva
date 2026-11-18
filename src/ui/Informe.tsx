import { useEffect, useMemo, useState } from 'react';
import { aDatosMinisterio } from '../datos/aDatosMinisterio';
import type { Repo } from '../datos/repo';
import type { DatosMinisterio, Periodo } from '../modelo/tipos';
import {
  construirInforme,
  DEPARTAMENTOS,
  type DepartamentoId,
  type Informe as InformeTipo,
} from '../motor/informes';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function Informe({ repo }: { repo: Repo }) {
  const [datos, setDatos] = useState<DatosMinisterio | null>(null);
  const [depto, setDepto] = useState<DepartamentoId>('general');
  const hoy = new Date();
  const [ano, setAno] = useState<number>(hoy.getFullYear());
  const [mes, setMes] = useState<number>(0); // 0 = todo el año

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const d = await aDatosMinisterio(repo);
      if (vivo) setDatos(d);
    })();
    return () => {
      vivo = false;
    };
  }, [repo]);

  const informe: InformeTipo | null = useMemo(() => {
    if (!datos) return null;
    const desde = `${ano}-${String(mes === 0 ? 1 : mes).padStart(2, '0')}-01`;
    const fin = mes === 0 ? new Date(ano, 12, 0) : new Date(ano, mes, 0);
    const hasta = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
    const periodo: Periodo = { desde, hasta };
    return construirInforme(depto, datos, { periodo, cohorte: { ano, mes: mes === 0 ? undefined : mes } });
  }, [datos, depto, ano, mes]);

  const anos = [hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1];

  return (
    <div className="panel">
      <header className="panel-cabecera">
        <h1>Informe</h1>
        <button className="btn" onClick={() => window.print()}>
          🖨️ Imprimir
        </button>
      </header>

      <div className="selector-depto">
        {DEPARTAMENTOS.map((d) => (
          <button
            key={d.id}
            className={`chip chip-boton ${depto === d.id ? 'chip-activo' : ''}`}
            onClick={() => setDepto(d.id)}
          >
            {d.nombre}
          </button>
        ))}
      </div>

      <div className="selector-periodo">
        <label>
          Año{' '}
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mes{' '}
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            <option value={0}>Todo el año</option>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!informe ? (
        <p className="cargando">Cargando…</p>
      ) : (
        <>
          <h2 className="informe-titulo">{informe.titulo}</h2>
          {informe.secciones.map((s) => (
            <section className="tarjeta" key={s.titulo}>
              <h2>{s.titulo}</h2>
              <table className="informe-tabla">
                <tbody>
                  {s.filas.map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td className="informe-valor">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
