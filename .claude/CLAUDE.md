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
borra cachés `minicivil-*`. Ojo: el `sw.js` de TopoVías borra todas las cachés que no sean la suya cuando publica
una versión; Mini Civil la vuelve a llenar en la siguiente apertura con internet (arreglo propuesto a Brian para
TopoVías: filtrar `k.startsWith("topovias-")`). Los nombres de funciones y variables (`TV_KEY`, `TVDB`, `HIST`,
clases `tv-*`, eventos `tv-*`) se dejaron iguales a TopoVías para poder copiar arreglos de una a otra.

## Al publicar (solo cuando Brian lo autorice)
- Subir `TV_VERSION` en index.html, `CACHE_VERSION` en sw.js (ej. "2" y "minicivil-v2") y la versión del
  `<title>` (hoy "Mini Civil v1").
- `node pruebas/sintaxis.js` (sintaxis de cada `<script>` y versión igual en los dos archivos; corre también en
  GitHub en cada push a `main`, `.github/workflows/sintaxis.yml`).
- `node pruebas/abrir.js` y `W=390 node pruebas/abrir.js` (PC y celular).
- Commit con `git -c user.email=bresmojce@gmail.com -c user.name=bresmojce-stack commit`, push a `main`.

## Mapa del código (buscar por el comentario de sección `// ───`)
| Sección | Qué hay |
|---|---|
| (antes del `<script>` de la app) | `<style>` de TopoVías completo (fuentes incrustadas, variables de los temas, clases `tv-*`), React y ReactDOM 18.3.1 incrustados |
| PALETA / UI ATOMS | `C` (colores de interfaz como `var(--c-*)`), `Icono`/`ICONOS`, `Label`, `Input`, `Sel`, `Btn`, `Card`, `BloqueoCtx` (sin uso aún) |
| ALMACENAMIENTO / COMA DECIMAL | `TVDB` (IndexedDB "minicivil"), `DATOS`, `precargarDatos`, `leerDato`, `guardarDato` (guardado diferido 300 ms), `vaciarGuardado`, `escribirDato`, `numeroConPunto`/`corregirComas` y el escuchador global que cambia la coma por punto, `leerNumero`, `lsLeer`/`lsGuardar` |
| COPIAS AUTOMÁTICAS | `copiaAutomatica` (foto del día antes del primer cambio; guarda `{obras: [], vias: <proyectos>}` como en TopoVías), `leerCopiasAutomaticas` |
| TEMAS | `TEMAS` (Claro y Oscuro con `listo: true`; los otros cuatro apagados), `hojaTemas`, `leerTema` (solo temas `listo`), `ponerTema` (localStorage `minicivil_tema`), `TV_VERSION`, `TV_KEY`, `TV_KEY_OBRAS` (reservado) |
| OTRA VENTANA / DESHACER | `TV_CANAL`, `AvisoOtraVentana`; `HIST`, `histAntesDeCambio`, `deshacer`/`rehacer` (de los proyectos; el Dibujo tiene su propio deshacer) |
| INSTALAR | `BotonInstalarFinal`, `EstadoGuardado`, `BotonTema`, `SelectorTema` (solo los temas con `listo`), `VentanaArchivo` (guardar o compartir el DXF) |
| DIBUJO (mini CAD de obra) | Igual que TopoVías v92: `DIB`, `EJE` (alineamiento con abscisas: polilínea → Elegir → "Usar como eje"), `crearDXF`, `DIB_GRUPOS`, `TabDibujo({ proy, onChange, onArchivo })`, `panelTablaPuntos`, `panelEscribir`, `panelListaPuntos`. Formato de objetos al comienzo de la sección. Se quitó: "→ Vía" (`panelPasarVia`, `detectarDibujoVia`), "Marcar parqueadero" (`marcarparq`) y "Eje de la vía" (`@eje`, `traerEje`) |
| PROYECTOS (Mini Civil) | `proyectoNuevo` (`{ id, nombre, creado, dibujos }`), `useLocalProyectos` (guarda en `TV_KEY`, con deshacer), `copiaDeProyectos` (para `FalloApp`), `Logo`, `PantallaProyectos`, `App` (inicio = lista de proyectos; proyecto = su Dibujo), `FalloApp`, arranque y aviso de versión nueva |

## Estado y lo que sigue
- Versión 1 (2026-10-22): etapa 0. Proyectos → dibujos con todo el CAD de TopoVías, temas Claro y Oscuro, guardado
  automático, copia del día, deshacer, modo sin conexión e instalación. Pruebas: `pruebas/abrir.js` (PC y
  celular) y `pruebas/dibujo.js` (el recorrido del Dibujo de TopoVías: da lo mismo que allá).
- Plan propuesto (cada etapa con boceto y visto bueno): 1 importar puntos de la estación (CSV/TXT P,N,E,Z,D) con
  grupos por descripción; 2 superficie (TIN), líneas de quiebre, curvas de nivel; 3 alineamiento y perfil;
  4 secciones y volúmenes con Excel de fórmulas; 5 vista 3D (librería con permiso); 6 compartir con compañeros.
- Pendiente de Brian: qué funciones de Civil 3D usa de verdad (para ordenar las etapas), formato de los puntos
  de la estación, si los compañeros trabajan en proyectos separados o en el mismo.
