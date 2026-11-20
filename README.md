# Ministerio LemGil — app nueva (desde cero)

Construida por el **plano con el modelo congelado** aprobado por LemGil el
2026-11-17 (en `~/workspace/goals/mision-apk-ministry-app-improvements/files/plano-app-nueva-modelo-congelado.md`).

Principio rector: **los números cuadran, o la app no sirve.** Toda cifra sale
de un solo motor de conteo (`src/motor/`); el cuadre se verifica solo
(`src/motor/cuadre.ts`).

## Estado

- **Fase 1 — modelo + motor de conteo + cuadre: CONSTRUIDA** (18/18 pruebas).
- **Fase 2 — base local + sync con contrato uniforme: CONSTRUIDA en el taller**
  (23/23 pruebas: dos «equipos» contra un espejo en memoria; la absorbida no
  resucita; el error no se limpia hasta un ciclo limpio). El proyecto propio
  quedó listo y verificado (el antes pausado «academia-del-espiritu», hoy
  `mision-lemgil`: las 9 tablas con el contrato exacto). La config (URL, anon,
  correo) la rellena LemGil en su PC — no viaja por el chat.
- **Fase 3 — Panel e Informe: CONSTRUIDA** (compila; 30/30 pruebas).
  Entrada con el usuario existente; el Panel muestra el censo, la franja «La
  congregación hoy», la demografía, el mes en curso, las **alertas** con casos
  nombrados (estancados en Alcanzado y Confeso a los 30 días; cumpleaños
  próximos), el semáforo del cuadre y el estado de sync, con botón para cargar
  el caso de prueba. El **Informe** trae los 7 departamentos del plano, con
  selector de año/mes, construido solo con el motor — e imprime desde el
  navegador.
- **Fase 4 (parte 1) — Personas y Misión: CONSTRUIDA** (compila; 40/40 pruebas).
  Personas: lista con búsqueda (nombre/teléfono/carné), situación desde la
  misma clasificación del censo, señal de repetidos, la **ficha-trayectoria**
  (Misión con historial, escalera del miembro, Academia, Diezmador,
  Beneficiario) y el **único formulario de registro** con bloqueo del carné y
  altas directas (Misión en sus 4 entradas, Integrado, Beneficiario).
  Misión: tarjetas con filtro de período (todas responden), lista de
  Congregados (registros), avance rápido que **se detiene antes del gozne** —
  a Integrado se llega guardando desde el detalle —, detalle con pipeline e
  historial, y altas con bloqueo duro. Las acciones viven en
  `src/datos/acciones.ts`, probadas: el gozne crea el miembro una sola vez y
  las salidas se reflejan (Apartado → Inactivo, Traslado → Trasladado).
- **Fase 4 (parte 2) — las mesas restantes: CONSTRUIDA** (compila; 42/42
  pruebas). Miembros con su foto/cohorte, Directorio que abre solo con
  Activos, filtro «Están en:», escalera e hitos en el detalle y cumpleaños
  solo de miembros; Academia, Bien Común (diezmadores y **aportes**, con
  período), Manos Abiertas, Grupos, Evangelismos y el **Mapa** de chinchetas
  (fijar por toque o GPS; modo edición con arrastre; el glifo con halo, sin
  círculo). El modelo creció con `grupos`, `evangelismos` y `aportes` (mismo
  contrato; SQL en `sql/agregar-tablas-fase4.sql`).
- **La app ya tiene todas las superficies del plano.** Queda la Fase 5: la
  migración única desde la app actual, y la convivencia hasta el cuadre en
  verde con los datos reales. **El conversor ya está construido y probado**
  (`src/migracion/`): toma el respaldo JSON de la app actual, conserva el
  catálogo con sus nombres vivos, re-enlaza a la persona lo que colgaba del
  miembro o del diezmador, y reporta huérfanos y no-mapeados sin inventar
  nada; lo convertido pasa el cuadre y se importa entero (48/48 pruebas).

- **Constitución Visual — Fase A (cimientos): APLICADA** (2026-11-19,
  aprobada por LemGil con la muestra viva). Los tokens de la constitución
  viven una sola vez en `:root` de `src/index.css` (Colores Madre —
  petróleo y oro luz incluidos —, escala de letra 11·13·14·15·17·19·24·30,
  escala de espacio 4·8·12·16·24·32, radios 8·12·16·999, sombras y
  movimiento) y todo el CSS los usa: ningún color ni radio suelto fuera
  de la tabla. El botón dorado es gradiente oro → oro luz. **Iconos de
  página aprobados** en el menú y en el título de cada página: Panel 🏠 ·
  Informe 📋 · Personas 👥 · Misión 📣 · Miembros 🤝 · Grupos 🧑‍🤝‍🧑 ·
  Ministerios ⛪ · Academia 🎓 · Evangelismos 🔥 · Bien Común 🌾 · Red
  🌐 · Manos Abiertas 🤲 · Mapa 📍 · Migración 🔀. Sin tocar datos ni
  comportamiento (77/77 pruebas).
- **Constitución Visual — Fase B (piezas únicas): APLICADA** (2026-11-19).
  `src/ui/Piezas.tsx` trae **FilaPersona** (la Lista, una sola: nombre +
  meta en columna y chip/valor a la derecha), **FilaRegistro** (fecha ·
  concepto, valor a la derecha en negrita — `.fila-valor`) y **Pestanas**.
  Adoptadas ya: FilaPersona en Personas, Miembros, Bien Común y Red;
  FilaRegistro en los **dos registros generales** (Bien Común y Red),
  que quedan idénticos entre sí y a las listas personales; Pestanas en
  Bien Común, Red y Manos Abiertas.
- **Constitución Visual — Fase C (pantallas): APLICADA** (2026-11-19).
  FilaPersona viste también las filas de Grupos, Manos Abiertas
  (beneficiarios y campañas), Ministerios (lista y agrupada), Mapa
  (sin chincheta) y el SelectorPersona: **toda fila sencilla de lista de
  la app pasa ya por la pieza única**. Quedan con su traje propio, a
  propósito, las filas que llevan botones de acción dentro (Academia,
  Evangelismos, Misión y la ventana de Ministerios). Con esto la
  constitución queda aplicada entera: tokens (A), piezas (B) y
  pantallas (C).
- **Sincronización automática (2026-11-19, pedido de LemGil):** además
  del ciclo al entrar/abrir y del botón «🔄 Sincronizar» del Panel, con
  la app abierta corre un ciclo al montar el sincronizador, cada
  3 minutos, al volver la conexión (evento «online») y al regresar a
  la app (visible). El ciclo se protege de solaparse consigo mismo.

La app actual (`lemgil-mision-apk`) sigue viva e intacta mientras tanto.
