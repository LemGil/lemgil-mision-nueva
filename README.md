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
  verde con los datos reales.

La app actual (`lemgil-mision-apk`) sigue viva e intacta mientras tanto.
