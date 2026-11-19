// Completar los datos de los beneficiarios desde el respaldo viejo.
// La primera conversión trajo solo personaId y estado; el tipo
// (Persona/Familia/Grupo), el nombre propio, el representante, el
// tamaño de la familia, el teléfono y la zona quedaron en la app
// anterior. Esto rellena SOLO los huecos de los beneficiarios que ya
// están aquí (emparejados por id): nunca sobrescribe ni crea a nadie.

import type { Beneficiario } from '../modelo/tipos';
import type { Repo } from '../datos/repo';
import type { RespaldoViejo } from './convertir';

type Registro = Record<string, unknown>;

const texto = (r: Registro, ...campos: string[]): string | undefined => {
  for (const c of campos) {
    const v = r[c];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
};

export interface ResumenCompletarBeneficiarios {
  beneficiarios: number;
  campos: Record<string, number>;
}

const CAMPOS: (keyof Beneficiario)[] = [
  'tipo',
  'nombre',
  'representante',
  'familia',
  'telefono',
  'zona',
];

/** Los beneficiarios del respaldo, con los datos que la primera
 * conversión no trajo, emparejados por id. */
function beneficiariosDelRespaldo(respaldo: RespaldoViejo): Map<string, Partial<Beneficiario>> {
  const mapa = new Map<string, Partial<Beneficiario>>();
  for (const r of respaldo.beneficiarios ?? []) {
    const id = String(r.id ?? '');
    if (!id) continue;
    const nombre =
      [texto(r, 'nombre'), texto(r, 'apellido')].filter(Boolean).join(' ') || undefined;
    mapa.set(id, {
      tipo: texto(r, 'tipo'),
      nombre,
      representante: texto(r, 'representativeName', 'representante'),
      familia: typeof r.familia === 'number' ? r.familia : undefined,
      telefono: texto(r, 'telefono'),
      zona: texto(r, 'zona'),
    });
  }
  return mapa;
}

export function vistaPreviaCompletarBeneficiarios(
  actuales: Beneficiario[],
  respaldo: RespaldoViejo,
): ResumenCompletarBeneficiarios {
  const delRespaldo = beneficiariosDelRespaldo(respaldo);
  const campos: Record<string, number> = {};
  let beneficiarios = 0;
  for (const b of actuales) {
    const viejo = delRespaldo.get(b.id);
    if (!viejo) continue;
    let gana = false;
    for (const campo of CAMPOS) {
      const antes = b[campo];
      const nuevo = viejo[campo];
      if ((antes === undefined || antes === null || antes === '') && nuevo !== undefined && nuevo !== '') {
        campos[campo] = (campos[campo] ?? 0) + 1;
        gana = true;
      }
    }
    if (gana) beneficiarios++;
  }
  return { beneficiarios, campos };
}

export async function completarBeneficiarios(
  repo: Repo,
  respaldo: RespaldoViejo,
  actuales: Beneficiario[],
): Promise<ResumenCompletarBeneficiarios> {
  const delRespaldo = beneficiariosDelRespaldo(respaldo);
  const campos: Record<string, number> = {};
  let beneficiarios = 0;
  const vacio = (v: unknown) => v === undefined || v === null || v === '';
  for (const b of actuales) {
    const viejo = delRespaldo.get(b.id);
    if (!viejo) continue;
    const relleno: Beneficiario = { ...b };
    let gana = false;
    const poner = (campo: string, hay: boolean, aplicar: () => void) => {
      if (hay) {
        aplicar();
        campos[campo] = (campos[campo] ?? 0) + 1;
        gana = true;
      }
    };
    poner('tipo', vacio(b.tipo) && !vacio(viejo.tipo), () => { relleno.tipo = viejo.tipo; });
    poner('nombre', vacio(b.nombre) && !vacio(viejo.nombre), () => { relleno.nombre = viejo.nombre; });
    poner('representante', vacio(b.representante) && !vacio(viejo.representante), () => { relleno.representante = viejo.representante; });
    poner('familia', vacio(b.familia) && viejo.familia !== undefined, () => { relleno.familia = viejo.familia; });
    poner('telefono', vacio(b.telefono) && !vacio(viejo.telefono), () => { relleno.telefono = viejo.telefono; });
    poner('zona', vacio(b.zona) && !vacio(viejo.zona), () => { relleno.zona = viejo.zona; });
    if (gana) {
      beneficiarios++;
      await repo.guardar('beneficiarios', relleno);
    }
  }
  return { beneficiarios, campos };
}
