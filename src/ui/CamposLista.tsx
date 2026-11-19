import { useId } from 'react';
import type { DatosMinisterio } from '../modelo/tipos';

/** Las zonas que ya existen: salen de las fichas, los grupos, las
 * campañas y los beneficiarios. Los formularios se enlazan a esta
 * lista para no partir una zona en dos por una letra («PÓSITO» y
 * «Pósito» cuentan como zonas distintas si se escriben libres). */
export function zonasConocidas(datos: DatosMinisterio): string[] {
  const z = new Set<string>();
  for (const p of datos.personas) if (p.zona?.trim()) z.add(p.zona.trim());
  for (const g of datos.grupos) if (g.zona?.trim()) z.add(g.zona.trim());
  for (const c of datos.campanas) if (c.zona?.trim()) z.add(c.zona.trim());
  for (const b of datos.beneficiarios) if (b.zona?.trim()) z.add(b.zona.trim());
  return [...z].sort((a, b) => a.localeCompare(b));
}

/** Campo de zona enlazado a la lista: sugiere las zonas que ya existen
 * y permite escribir una nueva. */
export function InputZona({
  datos,
  value,
  onChange,
}: {
  datos: DatosMinisterio;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={id}
        placeholder="Elige o escribe la zona"
      />
      <datalist id={id}>
        {zonasConocidas(datos).map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </>
  );
}

/** Campo de nombre enlazado a la lista de personas: para responsables
 * y encargados, que salen de la congregación misma. */
export function InputNombre({
  datos,
  value,
  onChange,
  placeholder,
}: {
  datos: DatosMinisterio;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const nombres = datos.personas
    .map((p) => `${p.nombre} ${p.apellidos ?? ''}`.trim())
    .sort((a, b) => a.localeCompare(b));
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={id}
        placeholder={placeholder ?? 'Elige o escribe el nombre'}
      />
      <datalist id={id}>
        {nombres.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  );
}
