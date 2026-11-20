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
import { anosConRegistros, mesesConRegistros } from '../motor/periodos';
import GuiaPagina from './GuiaPagina';
import { CabeceraPagina } from './Piezas';


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

  const fechasInforme = datos
    ? [
        ...datos.conversiones.flatMap((c) => [c.fecha, ...c.historial.map((h) => h.fecha)]),
        ...datos.miembros.map((m) => m.fechaIngreso),
        ...datos.aportes.map((a) => a.fecha),
        ...datos.evangelismos.map((e) => e.fecha),
      ]
    : [];
  const anos = datos ? anosConRegistros(fechasInforme) : [];
  const anoEfectivo = anos.includes(ano) ? ano : (anos[0] ?? ano);
  const mesesDisp = datos ? mesesConRegistros(fechasInforme, anoEfectivo) : [];

  const informe: InformeTipo | null = useMemo(() => {
    if (!datos) return null;
    const desde = `${anoEfectivo}-${String(mes === 0 ? 1 : mes).padStart(2, '0')}-01`;
    const fin = mes === 0 ? new Date(anoEfectivo, 12, 0) : new Date(anoEfectivo, mes, 0);
    const hasta = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
    const periodo: Periodo = { desde, hasta };
    return construirInforme(depto, datos, { periodo, cohorte: { ano: anoEfectivo, mes: mes === 0 ? undefined : mes } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, depto, anoEfectivo, mes]);

  return (
    <div className="panel">
      <CabeceraPagina titulo="📋 Informe">
        <button className="btn" onClick={() => window.print()}>
          🖨️ Imprimir
        </button>
      </CabeceraPagina>
      <GuiaPagina texto="Los números para compartir, por departamento y por período, listos para imprimir. Cuenta personas, como el Panel, no registros." />

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
          <select value={anoEfectivo} onChange={(e) => setAno(Number(e.target.value))}>
            {(anos.length > 0 ? anos : [anoEfectivo]).map((a) => (
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
            {mesesDisp.map((m) => (
              <option key={m} value={m}>
                {MESES[m - 1]}
              </option>
            ))}
            {mes !== 0 && !mesesDisp.includes(mes) && (
              <option value={mes}>{MESES[mes - 1]}</option>
            )}
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
