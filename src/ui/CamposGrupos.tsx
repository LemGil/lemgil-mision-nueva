import type { DatosMinisterio } from '../modelo/tipos';
import { claveTipoGrupo, tiposDeGrupoEnUso } from '../motor/gruposVista';

/** Los selectores de grupo POR TIPO: uno por cada tipo en uso
 * (Iglesia, Oikos…), porque una persona puede estar en un grupo de
 * cada tipo a la vez (decisión de LemGil, 2026-11-23). `seleccion`
 * es la lista de ids de grupo elegidos; al cambiar un tipo se
 * reemplaza solo el grupo de ese tipo. */
export default function CamposGrupos({
  datos,
  seleccion,
  onCambiar,
}: {
  datos: DatosMinisterio;
  seleccion: string[];
  onCambiar: (ids: string[]) => void;
}) {
  const tipos = tiposDeGrupoEnUso(datos);
  if (tipos.length === 0) return null;
  const elegidoDe = (clave: string): string =>
    seleccion.find((id) => {
      const g = datos.grupos.find((x) => x.id === id);
      return !!g && claveTipoGrupo(g) === clave;
    }) ?? '';
  return (
    <>
      {tipos.map((t) => (
        <div className="form-fila" key={t.clave || 'sin-tipo'}>
          <label>
            Grupo · {t.nombre}
            <select
              value={elegidoDe(t.clave)}
              onChange={(e) => {
                const sinEseTipo = seleccion.filter((id) => {
                  const g = datos.grupos.find((x) => x.id === id);
                  return !g || claveTipoGrupo(g) !== t.clave;
                });
                onCambiar(e.target.value ? [...sinEseTipo, e.target.value] : sinEseTipo);
              }}
            >
              <option value="">Sin grupo de este tipo</option>
              {datos.grupos
                .filter((g) => claveTipoGrupo(g) === t.clave)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
            </select>
          </label>
        </div>
      ))}
    </>
  );
}
