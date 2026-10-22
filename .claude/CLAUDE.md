# Mini Civil — guía para trabajar en el código

Mini Civil 3D de obra para Brian Escobar, topógrafo (Colombia), y sus compañeros: lo que de verdad se usa en
obra, en PC, tablet, iPhone y Android. Un solo archivo: `index.html` (React 18 sin JSX, `React.createElement`).
PWA publicada en GitHub Pages (https://bresmojce-stack.github.io/minicivil/) al hacer push a `main`.
Responder siempre en español, claro y sin tecnicismos.

Nació el 2026-10-22 copiando el Dibujo (mini CAD) de TopoVías v92 sin tocar TopoVías y quitándole lo que lo
amarraba a una vía. Se irá armando por etapas, cada una con boceto y visto bueno de Brian.

## Reglas de Brian (obligatorias, las mismas de TopoVías)
- **Prioridad absoluta: conservar la funcionalidad.** No reescribir, eliminar, simplificar ni reemplazar
  funciones por implementaciones de ejemplo. No alterar fórmulas, cálculos, validaciones, eventos,
  identificadores, nombres de funciones, rutas, formatos de datos ni almacenamiento, salvo autorización expresa.
  Antes de editar, inspeccionar el código y explicar qué archivos se cambian.
- **Temas:** por ahora solo **Claro y Oscuro** (Brian, 2026-10-22). Los otros cuatro de TopoVías (Agua, Fuego,
  Aire, Tierra) siguen en `TEMAS` con `listo: false`: no salen en el selector ni en el botón, y `leerTema` no los
  usa aunque estén guardados; para volver a ofrecerlos basta `listo: true`. No recolorear información técnica (dibujos, cotas, capas CAD, colores de objetos): solo la interfaz.
- **Accesibilidad:** contraste suficiente en los seis temas; adaptación a celular y tablet; sin dependencias
  nuevas sin autorización (una librería 3D, por ejemplo Three.js, se pide antes).
- **Flujo obligatorio:** 1 auditar antes de editar; 2 proponer plan con archivos y riesgos; 3 esperar aprobación
  antes de cambios estructurales; 4 cambios pequeños y revisables; 5 revisar el diff de Git; 6 comprobaciones
  apropiadas; 7 informar qué archivos cambiaron, qué se comprobó, qué falló y qué queda pendiente.
- **Nunca** comandos destructivos de Git, publicar, commit/push ni eliminar archivos sin autorización explícita de
  Brian en cada caso. No afirmar que una prueba pasó si no se ejecutó y verificó.
- **Pruebas:** mientras se trabaja, solo lo mínimo (sintaxis y que la app abra). Las completas se proponen y se
  corren si Brian dice que sí: antes de publicar, al terminar una función completa o tras tocar datos guardados.
- Pasos pequeños; antes de una función grande, mostrar primero un boceto.
- **No tocar TopoVías** desde este repositorio. Si algo de TopoVías sirve, se copia; un arreglo que también
  le sirva a TopoVías se le propone a Brian aparte.
- No tocar Netlify ni la cuenta bresmojcej@gmail.com (es de la finca).

## Ayudantes (Brian, 2026-10-22: "Opus para el código, lo simple a un modelo más liviano")
En `.claude/agents/` hay dos ayudantes que corren con Haiku. Opus (la conversación principal) diseña, decide y
escribe el código; a ellos se les pasa lo que es solo leer o comprobar:
- `explorador` (solo lectura): buscar dónde está algo, leer secciones largas de `index.html` o de TopoVías,
  resumir cómo funciona una función. Usarlo cuando la búsqueda sea larga; una búsqueda de una línea se hace directo.
- `probador`: correr las pruebas después de un cambio y traer solo el resultado (bien / falla y el error).
Ninguno cambia archivos, hace commit ni push. Lo que traen se revisa antes de afirmar algo: si el probador dice
"bien", se cuenta como probado; si el explorador cita código, se mira la línea antes de editarla.

## Misma dirección que TopoVías (importante)
Las dos apps viven en `bresmojce-stack.github.io`, así que comparten el almacenamiento del navegador. Por eso todo
lo de Mini Civil lleva otro nombre: localStorage `minicivil*` (`TV_KEY = 'minicivil'`), tema `minicivil_tema`,
IndexedDB `minicivil`, canal de otra ventana `minicivil`, caché `minicivil-vN`. El `sw.js` de Mini Civil solo
borra cachés `minicivil-*`, y desde TopoVías v93 el de TopoVías solo borra las `topovias-*`. En Drive cada una tiene su propio ID de cliente y su carpeta ("TopoVías" / "Mini Civil"), así Google las trata como apps distintas. Los nombres de funciones y variables (`TV_KEY`, `TVDB`, `HIST`,
clases `tv-*`, eventos `tv-*`) se dejaron iguales a TopoVías para poder copiar arreglos de una a otra.

## Al publicar (solo cuando Brian lo autorice)
- Subir `TV_VERSION` en index.html, `CACHE_VERSION` en sw.js (ej. "2" y "minicivil-v2") y la versión del
  `<title>` (hoy "Mini Civil v6").
- `node pruebas/sintaxis.js` (sintaxis de cada `<script>` y versión igual en los dos archivos; corre también en
  GitHub en cada push a `main`, `.github/workflows/sintaxis.yml`).
- `node pruebas/abrir.js` y `W=390 node pruebas/abrir.js` (PC y celular); `node pruebas/importar.js` si se tocaron los puntos o el DXF; `node pruebas/nube.js` si se tocó Drive o los datos.
- Commit con `git -c user.email=bresmojce@gmail.com -c user.name=bresmojce-stack commit`, push a `main`.

## Mapa del código (buscar por el comentario de sección `// ───`)
| Sección | Qué hay |
|---|---|
| (antes del `<script>` de la app) | `<style>` de TopoVías completo (fuentes incrustadas, variables de los temas, clases `tv-*`), React y ReactDOM 18.3.1 incrustados; librerías incrustadas tal cual, cada una en su `<script>` con su licencia (`/*! Nombre versión · licencia */`): Delaunator 5.0.1 (`window.Delaunator`, triangulación), Constrainautor 4.0.1 (`window.Constrainautor`, líneas de quiebre) y three.js r158 (`window.THREE`, build/three.min.js: el último con archivo clásico; escribe en la consola un aviso de que está "deprecated", no es error). Para meter otra: `meter_lib.py` del scratchpad o a mano antes de `<script>\n// ─── PALETA` |
| PALETA / UI ATOMS | `C` (colores de interfaz como `var(--c-*)`), `Icono`/`ICONOS`, `Label`, `Input`, `Sel`, `Btn`, `Card`, `BloqueoCtx` (sin uso aún) |
| ALMACENAMIENTO / COMA DECIMAL | `TVDB` (IndexedDB "minicivil"), `DATOS`, `precargarDatos`, `leerDato`, `guardarDato` (guardado diferido 300 ms), `vaciarGuardado`, `escribirDato`, `numeroConPunto`/`corregirComas` y el escuchador global que cambia la coma por punto, `leerNumero`, `lsLeer`/`lsGuardar` |
| COPIAS AUTOMÁTICAS | `copiaAutomatica` (foto del día antes del primer cambio; guarda `{obras: [], vias: <proyectos>}` como en TopoVías), `leerCopiasAutomaticas` |
| TEMAS | `TEMAS` (Claro y Oscuro con `listo: true`; los otros cuatro apagados), `hojaTemas`, `leerTema` (solo temas `listo`), `ponerTema` (localStorage `minicivil_tema`), `TV_VERSION`, `TV_KEY`, `TV_KEY_OBRAS` (reservado) |
| OTRA VENTANA / DESHACER | `TV_CANAL`, `AvisoOtraVentana`; `HIST`, `histAntesDeCambio`, `deshacer`/`rehacer` (de los proyectos; el Dibujo tiene su propio deshacer) |
| SINCRONIZAR CON GOOGLE DRIVE | Copiado de TopoVías v92 sin obras ni fotos: `nubeSincronizar` (un archivo "Proyecto - <nombre>.json" por proyecto, clave `proy:<id>` en appProperties, carpeta `NUBE_CARPETA` = "Mini Civil"), `nubeIniciar` (al abrir, al volver, 30 s después de cada cambio), `nubeDesconectar`, `BotonNube`/`PanelNube` (barra). `NUBE_CLIENTE` es el ID **propio** de Mini Civil (proyecto "Mini Civil" de Google Cloud, número 439434487259); nunca usar el de TopoVías (374164493256…), que es otra app. Conexión guardada en localStorage `minicivil_nube`. Prueba `pruebas/nube.js` (Drive simulado, dos equipos) |
| INSTALAR | `BotonInstalarFinal`, `EstadoGuardado`, `BotonTema`, `SelectorTema` (solo los temas con `listo`), `VentanaArchivo` (guardar o compartir el DXF) |
| DIBUJO (mini CAD de obra) | Igual que TopoVías v92: `DIB`, `EJE` (alineamiento con abscisas: polilínea → Elegir → "Usar como eje"), `crearDXF`, `DIB_GRUPOS`, `TabDibujo({ proy, onChange, onArchivo })`, `panelTablaPuntos`, `panelEscribir`, `panelListaPuntos`. Formato de objetos al comienzo de la sección. Se quitó: "→ Vía" (`panelPasarVia`, `detectarDibujoVia`), "Marcar parqueadero" (`marcarparq`) y "Eje de la vía" (`@eje`, `traerEje`). Mini Civil agregó: el punto guarda `z` (cota) y `d` (descripción) si los tiene; `dib.etq` = {num, z, d} qué textos acompañan a cada punto (`etqDe`, `ETQ_DEF`; en pantalla, en `capaDeps` y en el DXF); Cota y Descripción en el panel de Elegir; Lista de puntos con filtros por descripción, color y cota (`lpFil`, "Elegir" toma lo filtrado, muestra hasta 300 filas); DXF: punto a su Z y en la capa de su descripción (`capaDeDesc`, tabla LAYER solo si hay descripciones: sin ellas el DXF sale idéntico al de TopoVías) |
| IMPORTAR PUNTOS (después de `objetosTablaPuntos`) | `leerArchivoPuntos(texto, op, existentes, sig)` (solo lee; separador `separadorPuntos`: el que deja norte y este como números, tabulación / punto y coma / coma / espacios; título de la línea 1 se salta; `op.orden` "NE"/"EN"; rojo = sin norte o este, incompleta o a más de 5 km del centro; ámbar = sin cota o cota no numérica, sin número → P…, número repetido → "3 (2)"), `coloresDescripcion` (`IMP_COLORES`, mayúsculas = minúsculas, la que ya está conserva su color), `objetosImportados`, `IMP_EJEMPLO`. Pantalla: `panelImportar` (instrucciones → revisión → "Dibujar N puntos" en un solo deshacer, en este dibujo o en uno nuevo; lee UTF-8 o, si no, Windows-1252), `dibujarImportados`, estados `imp`/`impOp` (orden y color en localStorage `minicivil_impOp`); botón "Importar puntos" arriba y `@importar` en Dibujar. Boceto aprobado: https://claude.ai/artifact/JmQfXZsw5q4nvcAPLZY3yn. Prueba `pruebas/importar.js` |
| SUPERFICIES, SECCIONES Y VOLÚMENES (antes de PROYECTOS) | Cálculo puro: `proy.superficies` (formato en el comentario de la sección), `puntosDeSuperficie` (puntos con cota, no escondidos, por descripción o dibujo), `calcularTIN` (Delaunator en coordenadas locales; quiebres con Constrainautor: vértice pegado a un punto a 2 cm o nuevo con la cota de la superficie; límite = centro del triángulo dentro de la figura; lado máximo), `superficieTIN` (en memoria `CACHE_TIN`: mismo `proy.dibujos` + misma superficie = mismo TIN), `indiceTIN`/`zEnTIN`, `bordesTIN`, `curvasTIN` (mayor cada 5), `perfilTIN` (trozos {s, z} sobre un segmento), `zEnPerfil`, `areaEntrePerfiles` (corte/relleno con cruce), `estacionesLinea` (cada paso + el final, perpendicular a la derecha), `franjaSecciones`, `volumenPorSecciones` (promedio de áreas × distancia con los valores redondeados de la tabla), `volumenPorMallas` (cuadrícula fina, opcional dentro de la franja de las secciones), `r3`. Pantalla: `patronSup`/`MuestraSup` (color + textura), `VisorPlanta` (planta con borde, relleno, curvas, malla, línea y cortes; mover/acercar con dedo, ratón o rueda; fondo blanco fijo), `EditorSuperficie`, `TabSuperficies`, `Vista3D` (Three.js: un dedo gira, dos acercan y mueven, rueda, botón derecho o Mayús mueve; exagerar altura en localStorage `minicivil_exag3d`; superficies y malla se prenden y apagan; libera todo al cerrar; sin WebGL avisa), `PESTANAS_PROY`. Prueba `pruebas/superficies.js` (planos con resultado conocido) |
| PROYECTOS (Mini Civil) | `proyectoNuevo` (`{ id, nombre, creado, dibujos }`), `useLocalProyectos` (guarda en `TV_KEY`, con deshacer), `copiaDeProyectos` (para `FalloApp`), `Logo`, `TarjetaNube`, `PantallaProyectos`, `App` (inicio = lista de proyectos; proyecto = pestañas `nav.tab`: Dibujo, Superficies…), `FalloApp`, arranque y aviso de versión nueva |

## Estado y lo que sigue
- Versión 6 (2026-10-22): vista 3D de las superficies visibles ("Ver en 3D" en Superficies). Las líneas de quiebre ya iban en la v5 (probadas: el tramo queda como lado de triángulo; vértice sin punto toma la cota de la superficie).
- Versión 5 (2026-10-22, Brian aprobó el boceto https://claude.ai/artifact/MrWt96FwHZ4TdXevr6B3v8 y las librerías; "haz todo de corrido"): pestaña Superficies (de qué puntos sale, límite, lado máximo, líneas de quiebre, color y textura, curvas de nivel) con su planta. Probado con planos de resultado conocido (`superficies.js`).
- Versión 4 (2026-10-22, Brian: "guarde y reconozca las alturas", invertir norte y este, color por descripción, filtrar por descripción, color o alturas): etapa 1, importar puntos de la estación (.csv / .txt: número, norte, este, cota, descripción) según el boceto. Ver IMPORTAR PUNTOS en el mapa. Probado: `importar.js` (17 casos de lectura + recorrido en PC y celular, deshacer, filtros, DXF), DXF de un dibujo normal idéntico byte por byte a la v3 y `dibujo.js` igual.
- Versión 3 (2026-10-22, Brian: "el botón de la nube está muy pequeño"): el botón de Drive de la barra mide 40 px y dice "Drive" también en el celular (regla `.tv-acciones .tv-nube .tv-txt` en el `<style>`), y el inicio tiene la tarjeta `TarjetaNube` ("Copia en Google Drive", abre `PanelNube`). El ícono pequeño de la derecha es `EstadoGuardado` (aviso, no botón). `abrir.js` lo revisa.
- Versión 2 (2026-10-22, Brian: "copia de seguridad en Drive pero para ella misma"): sincronización con Google Drive propia (ver la sección en el mapa). Su ID de cliente está en el proyecto "Mini Civil" de Google Cloud (cuenta bresmojce@gmail.com), aparte del de TopoVías. Prueba `nube.js`: sube, recibe, cambia, borra, usa su ID y su carpeta y no toca la carpeta de TopoVías. TopoVías v93 en el mismo día: su `sw.js` ya no borra la caché de Mini Civil.
- Versión 1 (2026-10-22): etapa 0. Proyectos → dibujos con todo el CAD de TopoVías, temas Claro y Oscuro, guardado
  automático, copia del día, deshacer, modo sin conexión e instalación. Pruebas: `pruebas/abrir.js` (PC y
  celular) y `pruebas/dibujo.js` (el recorrido del Dibujo de TopoVías: da lo mismo que allá).
- Plan propuesto (cada etapa con boceto y visto bueno): 1 importar puntos de la estación (hecho en la v4); 2 superficie (TIN), líneas de quiebre, curvas de nivel; 3 alineamiento y perfil;
  4 secciones y volúmenes con Excel de fórmulas; 5 vista 3D (librería con permiso); 6 compartir con compañeros.
- Pendiente de Brian: qué funciones de Civil 3D usa de verdad (para ordenar las etapas), un archivo real de su
  estación para probar la lectura, si los compañeros trabajan en proyectos separados o en el mismo.
