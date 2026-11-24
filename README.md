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
- **Editar los pasos (2026-11-20, pedido de LemGil):** botón «⚙️ Pasos»
  en Misión y en Miembros abre el EditorPasos: renombrar y cambiar el
  emoji de cualquier paso (el id no se toca), reordenar con ▲▼ (en
  Misión solo el camino; la escalera de Miembros entera), crear pasos
  (en Misión entran al camino antes del gozne; en Miembros, manuales
  al final) y borrar con protecciones (nunca un protegido, ni un
  peldaño de fuente viva, ni uno con registros encima). Lógica en
  `src/motor/pasosEditar.ts` (88/88).
- **Grupos como la app de siempre (2026-11-20, foto de LemGil):** el
  Grupo recupera los campos que la migración no trajo — día, hora y
  lugar de reunión, capacidad y líder en texto libre (`liderTexto`,
  manda en pantalla sobre el líder-persona) — en el tipo, el
  convertidor y la herramienta «🏠 Completar los datos de los grupos»
  de Migración. La tarjeta y la ventana muestran la vista de la foto:
  chip de estado (≥100% Saturado, ≥70% Casi Lleno, si no Disponible;
  sin capacidad, Sin meta), conteo de asignados por paso (Converso,
  Discipulado, Bautizado, Integrado) y barra de capacidad. Crear y
  editar grupos cubren todos los campos. Lógica en
  `src/motor/gruposVista.ts` (96/96).

- **Fase D — uniformidad completa (2026-11-20, pedido de LemGil):**
  las piezas que la constitución (§4) mandaba y las fases A–C no
  habían construido. D1: `TarjetaPersona`/`Tarjeta` (la tarjeta única,
  en botón o con acciones dentro) y `Kpi` adoptados en las 14
  páginas — no queda ni una tarjeta ni un KPI escritos a mano. D2:
  `ListaEdicion`/`FilaEdicion` (la fila editable única de
  historiales, hitos, aportes y entregas) y `DatosLista` (la tabla
  de datos de la ficha). D3: `CabeceraPagina` en las 14 páginas
  (Ministerios no tenía cabecera) con la acción principal de
  Academia y Grupos subida a la cabecera, y `Buscador` en las tres
  listas que buscan. Verificado por búsqueda: fuera de `Piezas.tsx`
  no queda marcado a mano de tarjeta, KPI, lista editable, tabla de
  datos, cabecera ni buscador (96/96).

- **Fase E — como la muestra viva (2026-11-20, fotos y archivo de
  LemGil):** las piezas ya únicas visten por fin el traje exacto de
  la muestra aprobada. Tokens reparados (la Fase A había dejado
  `--borde`, `--guia-fondo` y otros apuntando a sí mismos) con los
  valores de la muestra; KPI con icono, etiqueta en mayúsculas y el
  dinero en petróleo a 22px; pestaña activa en petróleo; la vista
  Lista/Tarjetas/Agrupada como barra segmentada y el «Ver» de Bien
  Común, Red y Personas segmentado; la fila y la tarjeta de dinero
  con el valor a la derecha en negrita y el chip debajo (Bien Común
  y Red, con la cantidad de aportes en la meta, del motor);
  `FilaRegistro` con su columna de fecha (día en negrita y mes);
  `DatosLista` como filas etiqueta/valor de la muestra; botones,
  chips, guía, campos y ventana con el traje de la muestra (96/96).

- **Informe de Misión con el formato de LemGil (2026-11-21):** la
  sección Misión del Informe se rehízo según su formato fijado en
  el chat de orientación y su decisión de conteo: primero LO
  PRINCIPAL en cinco números —«Se terminó con: N Alcanzados · N
  Bautizados · N Integrados · N Bajas · N En Proceso»— contando
  PERSONAS ÚNICAS (nadie dos veces) y con las Bajas sumando todas
  las salidas; luego LO AMPLIADO, persona por persona (quiénes,
  cuándo, en qué paso están hoy, el tiempo en el paso y en la
  ruta; cada Integrado con su marca: 💧 se bautizó con nosotros o
  vino ya bautizado; las Bajas desglosadas por tipo y con el paso
  del que venía cada uno). Motor puro `informeMision.ts` (108/108).

- **El informe, también en la página Misión (2026-11-21):** a
  petición de LemGil («No veo cambios en Misión»), el formato
  completo vive además en la propia página Misión, bajo sus
  tarjetas del período: la línea principal destacada y las seis
  secciones ampliadas, calculadas con el período elegido en la
  página (o de todo el tiempo, sin período). Las secciones se
  construyen con la misma función compartida
  (`seccionesInformeMision`) que usa la página Informe: un solo
  formato en dos casas (108/108). Ajuste del mismo día, a su
  palabra: la página Misión es mesa de trabajo, no papel — las
  listas ampliadas van en **pestañas** (Alcanzados · Bautizados
  · Integrados · Bajas · En proceso) y como **tablas con
  encabezado** (Nombre · Fecha · Estado hoy · Días en la ruta),
  sin repetir la misma frase en cada fila; el desglose de bajas
  va como línea breve sobre su tabla. El Informe conserva su
  formato de lectura para imprimir. Corrección del mismo día, a
  su palabra («las listas con el formato de la constitución, y
  nada»): fuera las tablas — las listas de la página Misión usan
  la fila única de la constitución (`FilaPersona`: nombre fuerte,
  meta tenue, valor/chip a la derecha; tocar una fila abre la
  ficha), y **toda la información de la mesa va en pestañas**
  (⭐ Lo principal —la frase y las tarjetas del proceso— ·
  Alcanzados · Bautizados · Integrados · Bajas · En proceso);
  **abajo** quedan el buscador y la lista principal de
  registros.

- **Conformidad, Fase 1 — la Lista única (2026-11-21):** nace la
  variante canónica `FilaAcciones` (la fila de siempre con su zona
  de botones) y se adopta en Academia, Evangelismos, la lista
  principal de Misión, los asignados de Ministerios y el gestor de
  Zonas de Personas: ya no queda ninguna `persona-fila` escrita a
  mano fuera de `Piezas.tsx`. El alta de Misión usa el
  `SelectorPersona` compartido, y las alertas del Panel son filas
  de la lista única que abren la ficha de la persona en Personas
  (108/108).

- **Conformidad, Fase 2 — la Fila de registro única (2026-11-21):**
  en las fichas de Bien Común y de la Red, los aportes se ven con
  la misma `FilaRegistro` del registro general (fecha · concepto
  · valor en negrita); tocar un aporte lo abre en su editor, con
  su botón de cerrar. Las entregas de Manos Abiertas también
  pasan a `FilaRegistro` (fecha · beneficiario · valor = cantidad
  y unidad), en su pestaña y en la ventana de la campaña
  (108/108).

- **Conformidad, Fase 3 — el sistema (2026-11-21):** todos los
  márgenes y rellenos del CSS quedan en la escala de espacios
  (4·8·12·16·24·32, con los 10 y 14 de la muestra en sus piezas);
  ningún color vive fuera de `:root` (los valores de la muestra
  del botón dorado, el chip oro y el botón de borrar también son
  tokens, y los velos del menú igual); el movimiento suave llega
  a la barra segmentada y a los campos; y «Agrupar por» pasa de
  desplegable a píldoras. Con esta fase, el plan de conformidad
  queda construido entero (108/108).

- **Arreglo (2026-11-21):** la Fase 2 había dejado un `useState`
  de Manos Abiertas DESPUÉS de la guardia de carga — el error
  #310 de React, la página en blanco al entrar. El estado subió
  con los demás, antes de la guardia; barrido de todas las
  páginas: ningún otro caso (108/108).

- **Ajuste (2026-11-22):** la página Misión ya no muestra el
  panel amarillo «Se terminó con…» en su pestaña principal — los
  mismos cinco números viven en los títulos de las pestañas. El
  Informe (el papel) conserva su principal, porque ahí no hay
  pestañas (108/108).

- **Bautizados y Añadidos (2026-11-22, plan de LemGil):** quien
  llega ya bautizado entra como Alcanzado — la puerta de entrada
  por Bautizado se cerró — con la marca «💧 Llega ya bautizado»
  en el alta (su bautismo y su fecha quedan en la persona y el
  historial lo anota). El origen del bautismo se deriva con la
  regla de la primera entrada (`origenBautismo`): el «Bautizados»
  del informe cuenta solo los de la casa, y el Panel y el Informe
  General llevan el corte transversal «💧 Bautizados: N con
  nosotros · M vinieron bautizados». El paso del gozne se llama
  ahora **Añadidos** (mismo id; herramienta en Migración para
  renombrarlo en los datos vivos). 111/111.

- **Alineación (2026-11-22):** el formulario de Personas también
  perdió la entrada «como Bautizado» (al crear y al editar): la
  marca «💧 Llega ya bautizado» de Misión es la única vía para
  quien llega bautizado, y su bautismo se marca en los datos de
  la persona (111/111).

- **Demografía ajustada (2026-11-22, decisión de LemGil):** las
  bandas de edad de la casa son Niños 0–14 · Jóvenes 15–30 ·
  Adultos 31–59 · Ancianos 60+. Y «Hombres / Mujeres» cuenta
  solo a los adultos: un niño no cuenta como hombre ni como
  mujer aunque su sexo (Masculino/Femenino) esté registrado; sin
  fecha de nacimiento cuenta por su sexo y queda en «Sin edad»
  (111/111).

- **Botones de formulario rectificados (2026-11-22):** en
  Academia, Bien Común, Grupos, Manos Abiertas, Miembros,
  Ministerios, Red de Colaboradores y el Editor de pasos, el
  botón de crear se escondía al abrir su formulario; ahora queda
  siempre visible y alterna (abrir/cerrar), como ya hacían
  Personas, Misión y Evangelismos (111/111).

- **Panel, «La congregación hoy» parejo (2026-11-23):** la línea
  de demografía dejó de ser texto corrido: ahora es una segunda
  franja de píldoras con la misma vista de la línea de etapas.
  Todas las píldoras de la tarjeta llevan el borde dorado de
  Miembros y son botones que llevan a su lista, como las
  alertas: las etapas → Misión, Miembros → Miembros, y la
  demografía (Hombres, Mujeres, Niños, Jóvenes, Adultos,
  Ancianos…) → Personas. Acotado a esa tarjeta: las franjas de
  las fichas no cambian (111/111).

- **Del Panel a la lista filtrada (2026-11-23):** tocar una
  píldora de demografía en «La congregación hoy» (Niños,
  Mujeres, Ancianos…) llega a Personas con SOLO esas personas:
  el motor ganó `personasDemografia`, que usa exactamente las
  reglas del censo, y Personas muestra la banda «Filtro del
  Panel» con su «✕ Quitar filtro». Las etapas llegan a Misión
  con el filtro de ese paso puesto. Prueba de invariante: el
  tamaño de cada grupo = el número del Panel (112/112).

- **Buscador en todas las mesas (2026-11-23):** las páginas que
  no tenían buscador lo ganaron, para que estén todas parejas:
  Academia (por estudiante), Evangelismos (lugar, líder o
  participante), Grupos (grupo, zona o líder), Ministerios
  (ministerio o persona), Bien Común y Red (su lista y su
  Registro general, por nombre o tipo) y Manos Abiertas (las
  tres pestañas). Helper compartido `coincideBusqueda` en
  personaVista, sin acentos como el de Personas (112/112).

- **Regla de pestañas (2026-11-23):** los aspectos diferentes
  de una página van en pestañas, no apilados (regla de oro Nº 8
  de la Constitución Visual). Primer caso: en Personas, Zonas
  salió de debajo de la lista a su propia pestaña — la página
  abre con «👥 Personas · 🗺️ Zonas» (112/112).

- **La regla de pestañas, completa (2026-11-23):** Migración
  agrupa sus herramientas en Importar · Completar datos ·
  Traer · Añadidos, y el Mapa en «🗺️ Mapa» · «📍 Por fijar
  (N)» — el mapa se oculta sin desmontarse (Leaflet no se
  recrea) y tocar una ficha por fijar salta al mapa con su
  banda de fijando arriba (112/112).

La app actual (`lemgil-mision-apk`) sigue viva e intacta mientras tanto.

## Tipos de grupo y formulario de Grupos completo (v34)

- **Tipos de grupo** (decisión de LemGil, 2026-11-23): un grupo tiene
  `tipo` (Iglesia, Oikos…; la lista nace del uso, como las zonas).
  La regla «un solo grupo por persona» pasa a ser **un grupo por
  tipo**: un hermano está en su Iglesia y en su Oikos a la vez. La
  pertenencia vive en `grupoIds` (persona y miembro, espejados por
  `asignarGrupos`); el `grupoId` viejo se sigue leyendo sin migración.
- **Formulario de Grupos**: campo Tipo en crear y editar; bloque de
  líder unido (buscador + texto libre + ✕ quitar + qué se muestra);
  sección «Miembros del grupo» en los dos formularios (agregar/quitar,
  con aviso de movimiento solo dentro del mismo tipo).
- Miembros y Personas asignan con selectores **por tipo**
  (`CamposGrupos`); las metas de Misión, Academia y Bien Común
  muestran todos los grupos de la persona.
- 117/117 pruebas.

## Arreglo de la ventana del grupo (v35)

La lista de miembros salía dos veces en la ventana del grupo (la
lista de solo lectura «En el grupo» y la del formulario). Queda una
sola: la del formulario, con las filas en la fila única de la
constitución (`FilaAcciones`: nombre, aviso y ✕ Quitar).

## Guardar cierra el formulario del grupo (v36)

En la ventana del grupo, «💾 Guardar cambios» guardaba y dejaba el
formulario abierto. Ahora, al guardar bien, la ventana se cierra
(si hay un error, se queda abierta y lo muestra).

## Grupos: bajas fuera de la lista y líder solo de la lista (v37)

- La lista de miembros del formulario sigue la regla acordada:
  apartados, traslados y fallecidos no salen — ni en la lista ni en
  el buscador para agregar — y al guardar, la asignación de una baja
  no se toca.
- El líder se agrega de UNA forma: el escogido de la lista de
  nombres. Fuera el campo «Líder (texto libre)» de los dos
  formularios; al guardar una edición, el texto libre viejo se va.

## La familia de grupos: el Oikos cuelga de su Iglesia (v38)

- `Grupo.padreId`: en el formulario, si el tipo es Oikos aparece el
  selector «Su Iglesia» (solo grupos de tipo Iglesia). Dos niveles:
  Iglesia → Oikos. Al borrar una Iglesia, sus Oikos quedan sin padre.
- La ventana del Oikos muestra su Iglesia y la de la Iglesia lista
  «🏡 Sus Oikos», navegables con un toque.
- Imagen y posición: el Oikos es 🏡 (la Iglesia, 🏠) en la lista, la
  tarjeta, la ventana y la chincheta del mapa; la lista se ordena por
  familia — cada Iglesia con sus Oikos indentados debajo (↳).
- 121/121 pruebas.

## El tablero de Grupos con cinco datos (v39)

El tablero superior de Grupos ya no trae solo Grupos y Personas:
🏠 Iglesias, 🏡 Oikos (con «N sin Iglesia» debajo si hay huérfanos),
👥 Personas en grupos y ⚠️ Sin grupo — las personas de la casa (en
camino, en el gozne o miembros activos) que no están en ningún
grupo: a quién hay que ubicar.

## El embudo de Grupos: congregados → su Oikos (v40)

El tablero sigue el proceso de la casa (LemGil, 2026-11-23): la
mayoría entra por la Iglesia y poco a poco cada congregado encuentra
su Oikos. Salen «Personas en grupos» y «Sin grupo»; entran
👥 Congregados, 🏡 En un Oikos y ⏳ Sin Oikos — estos dos se tocan y
abren Personas filtrada (franja «Filtro de Grupos»), con la misma
cuenta para el número y la lista (`personasPorOikos`). El KPI de
Piezas ahora acepta onClick y se pinta como botón.
124/124 pruebas.

## La Red con los tipos de la casa (v41)

El selector de Tipo del aporte traía una lista genérica (Diezmo,
Ofrenda, Donación, Otro) y la página no mostraba todos los tipos.
Ahora la lista es la de LemGil — Diezmo · Ofrenda General ·
Manos Abiertas · Misión · Ofrenda — y nace del uso: cualquier tipo
que ya exista en los aportes se suma, para que ninguno quede fuera
al editarlo. El tablero gana una fila de tarjetas por tipo con su
total, siguiendo el mismo período del resto de la página.
127/127 pruebas.

## Recuperar la Red: traer lo que falta y unir repetidos (v42)

La herramienta de traer la Red solo trabajaba con la Red vacía — y
la página la escondía en cuanto había un colaborador —, así que una
base con fichas creadas a mano nunca recibió la importación (se
veían 6 fichas y 4 aportes de los 8 y 113 del respaldo). Ahora
«Traer la Red» es restaurativa: entra solo el id que falte, sin
duplicar ni resucitar borrados, las veces que haga falta. Y nueva
herramienta «Unir colaboradores repetidos»: los duplicados por
nombre (CORBAN y PASTOR YULIET ya venían dos veces del respaldo)
pasan sus aportes a la ficha principal y las copias se borran.
133/133 pruebas.

## El Traer también restaura los borrados (v43)

Caso Isabel Miranda: su ficha no aparecía ni con «Ver: Todos» — su
id vivía como tumba (borrado lógico) y el Traer restaurativo la
saltaba por la regla de no resucitar. Pero el Traer es una
recuperación deliberada, con el respaldo en la mano: ahora levanta
también las tumbas de la Red y el aviso cuenta los restaurados.
La sincronización quedó revisada: un registro local sin subir
manda sobre el espejo y la reconciliación nunca lo toca.
133/133 pruebas.

## Restaurar la Red según el respaldo (v44)

Caso Isabel Miranda: tras la recuperación, su ficha no aparecía y
sus 38 aportes ($2.124.250) quedaron colgando de la ficha de Gina
Herrera (45 aportes = 6 de Gina + 38 de Isabel + 1 manual, exacto).
Nueva herramienta en Migración → Traer: «Restaurar la Red según el
respaldo» — por id, cada ficha del respaldo vuelve a existir con su
nombre y cada aporte del respaldo vuelve a su dueño; los aportes
registrados a mano no se tocan. 136/136 pruebas.
