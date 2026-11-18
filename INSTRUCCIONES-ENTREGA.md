# Entrega de la app nueva — pasos en tu PC

La app nueva es un proyecto **aparte** de la actual: repo propio, proyecto
Supabase propio (`mision-lemgil`) y despliegue propio. La actual no se toca.

## Paso 0 — El SQL de la Fase 4 (una vez, en el navegador)

En el proyecto **mision-lemgil** de Supabase, abre el SQL Editor, pega el
contenido de `sql/agregar-tablas-fase4.sql` (viene dentro de este paquete) y
dale Run. Crea las tablas `grupos`, `evangelismos` y `aportes` con el mismo
contrato. Las otras nueve ya están creadas y verificadas.

## Paso 1 — Descomprimir

En una terminal:

```
cd ~/Descargas && unzip -o mision-nueva-entrega.zip
```

Queda la carpeta `~/Descargas/lemgil-mision-nueva`.

## Paso 2 — Rellenar la conexión (solo en tu PC, nunca por el chat)

Abre el archivo `lemgil-mision-nueva/src/datos/config.ts` con tu editor y
rellena los tres valores, desde el panel de **mision-lemgil** en
Settings → API:

- `SUPABASE_URL` — la Project URL.
- `SUPABASE_ANON_KEY` — la clave **anon public** (la `service_role` NO).
- `SUPABASE_EMAIL` — tu correo, el del usuario que ya existe en ese proyecto.

Guarda el archivo. Esos valores quedan solo en tu copia.

## Paso 3 — Verificar que compila

```
cd ~/Descargas/lemgil-mision-nueva && npm install && npm run build
```

Debe terminar en verde y crear la carpeta `dist/`. Las pruebas, si quieres
verlas: `npm run test:run` → 48 de 48.

## Paso 4 — Subir a GitHub

Crea primero el repo vacío en github.com/new: nombre `lemgil-mision-nueva`,
público, **sin** README. Después, en la terminal:

```
cd ~/Descargas/lemgil-mision-nueva && git init && git add -A && git commit -m "App nueva del Ministerio: fases 1 a 4" && git branch -M main && git remote add origin https://github.com/LemGil/lemgil-mision-nueva.git && git push -u origin main
```

## Paso 5 — Cloudflare Pages

En Cloudflare: Create application → Pages → Connect to Git →
`lemgil-mision-nueva`. Ajustes de compilación:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: **vacío** — en esta app el código está en la raíz del repo,
  NO dentro de `app/` como en la actual.

Deploy. Al terminar te da la dirección `*.pages.dev` de la app nueva.

## Paso 6 — La prueba entre tus dos equipos

1. En la PC, abre la dirección nueva y entra con tu correo y tu contraseña.
2. En el Panel, pulsa **«Cargar el caso de prueba»** y luego **Sincronizar**:
   el chip debe quedar 🟢 Al día.
3. En el móvil, abre la misma dirección, entra igual y sincroniza: el caso de
   prueba aparece solo (9 congregados, el cuadre en verde).
4. Cuéntale a Leo el resultado.

La app nueva arranca **vacía de datos reales**: tus datos llegan después, con
la migración única (Fase 5), cuando el cuadre dé verde con ellos.
