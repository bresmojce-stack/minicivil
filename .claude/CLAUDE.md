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
- **Temas:** solo **Claro y Oscuro**. Agua, Fuego, Aire y Tierra se borraron de `TEMAS` (Brian, 2026-10-24: "la app debe
  tener solo claro y oscuro"). Un tema guardado que ya no existe cae en el del sistema. Se conserva lo que arma un tema a
  partir de su paleta (`hojaTemas`, `cTema`, `colorOscuroTema`/`colorClaroTema`) para los cinco temas nuevos de la guía visual
  (Minimalista, Ilustrativa, Dibujo técnico, Futurista, Game of Thrones; boceto https://claude.ai/artifact/Af4uF3adofC1wCyyatns8K). No recolorear información técnica (dibujos, cotas, capas CAD, colores de objetos): solo la interfaz.
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
  `<title>` (hoy "Mini Civil v43").
- `node pruebas/sintaxis.js` (sintaxis de cada `<script>` y versión igual en los dos archivos; corre también en
  GitHub en cada push a `main`, `.github/workflows/sintaxis.yml`).
- Batería completa: `node pruebas/correr.js` (50 pruebas en PC, celular y tablet, también sin conexión con servidor real; `SOLO=nombre` corre algunas). Rápidas: `node pruebas/abrir.js` y `W=390 node pruebas/abrir.js` (PC y celular); `node pruebas/importar.js` si se tocaron los puntos o el DXF; `node pruebas/nube.js` si se tocó Drive o los datos.
- Commit con `git -c user.email=bresmojce@gmail.com -c user.name=bresmojce-stack commit`, push a `main`.

## Mapa del código (buscar por el comentario de sección `// ───`)
| Sección | Qué hay |
|---|---|
| (antes del `<script>` de la app) | `<style>` de TopoVías completo (fuentes incrustadas, variables de los temas, clases `tv-*`), React y ReactDOM 18.3.1 incrustados; librerías incrustadas tal cual, cada una en su `<script>` con su licencia (`/*! Nombre versión · licencia */`): Delaunator 5.0.1 (`window.Delaunator`, triangulación), Constrainautor 4.0.1 (`window.Constrainautor`, líneas de quiebre) jsPDF 2.5.2 (`window.jspdf.jsPDF`, informe PDF) y three.js r158 (`window.THREE`, build/three.min.js: el último con archivo clásico; escribe en la consola un aviso de que está "deprecated", no es error). Para meter otra: `meter_lib.py` del scratchpad o a mano antes de `<script>\n// ─── PALETA` |
| PALETA / UI ATOMS | `C` (colores de interfaz como `var(--c-*)`), `Icono`/`ICONOS`, `Label`, `Input`, `Sel`, `Btn`, `Card` |
| ALMACENAMIENTO / COMA DECIMAL | `TVDB` (IndexedDB "minicivil"), `DATOS`, `precargarDatos`, `leerDato`, `guardarDato` (guardado diferido 300 ms), `vaciarGuardado`, `escribirDato` (más de `LS_MAX` = 500 KB va solo a IndexedDB con `__soloIdb`: el localStorage, de unos 5 MB, es compartido con TopoVías), `numeroConPunto`/`corregirComas` y el escuchador global que cambia la coma por punto, `leerNumero`, `lsLeer`/`lsGuardar` |
| COPIAS AUTOMÁTICAS | `copiaAutomatica` (foto del día antes del primer cambio; guarda `{obras: [], vias: <proyectos>}` como en TopoVías), `leerCopiasAutomaticas` |
| TEMAS | `TEMAS` (solo Claro y Oscuro), `hojaTemas`, `leerTema` (solo temas `listo`), `ponerTema` (localStorage `minicivil_tema`), `TV_VERSION`, `TV_KEY`, `TV_KEY_OBRAS` (reservado) |
| OTRA VENTANA / DESHACER | `TV_CANAL`, `AvisoOtraVentana`; `HIST`, `histAntesDeCambio`, `deshacer`/`rehacer` (de los proyectos; el Dibujo tiene su propio deshacer) |
| SINCRONIZAR CON GOOGLE DRIVE | Copiado de TopoVías v92 sin obras ni fotos: `nubeSincronizar` (un archivo "Proyecto - <nombre>.json" por proyecto, clave `proy:<id>` en appProperties, carpeta `NUBE_CARPETA` = "Mini Civil"), `nubeIniciar` (al abrir, al volver, 30 s después de cada cambio), `nubeDesconectar`, `BotonNube`/`PanelNube` (barra). `NUBE_CLIENTE` es el ID **propio** de Mini Civil (proyecto "Mini Civil" de Google Cloud, número 439434487259); nunca usar el de TopoVías (374164493256…), que es otra app. Conexión guardada en localStorage `minicivil_nube`. Prueba `pruebas/nube.js` (Drive simulado, dos equipos) |
| INSTALAR | `BotonInstalarFinal`, `EstadoGuardado`, `BotonTema`, `SelectorTema` (solo los temas con `listo`), `VentanaArchivo` (guardar o compartir el DXF) |
| DIBUJO (mini CAD de obra) | (v35: **replanteo desde estación** en el grupo Medir (`replanteo`, dentro de `DIB_PIDE_PUNTO` para que tenga imán, mira y "Escribir"). Estado `rep` = { est, atras, az, der, filas }: se toca (o se escribe) dónde está armada la estación, el punto visado atrás (o se escribe el azimut de referencia, `leerAzimut`) y después cada estaca. `angBarrido(azRef, azEstaca, der)` da el ángulo horizontal a barrer y `resReplanteo(q, azRef)` arma el cartel (`res.tipo = "replanteo"`, clases `mc-rep-ang`/`mc-rep-dist`) y suma la fila a la libreta; `libretaTexto()` la copia para Excel. El nombre y la cota de la estaca salen del punto del levantamiento que esté a 2 cm (si no hay, el consecutivo y sin Δ cota: no se inventa). El cartel va **abajo** y con `pointer-events: none` (clase `mc-rep-panel`, regla en el `<style>`) para poder seguir tocando estacas debajo de él. **Estacas por coordenada** (`repL`, `repPegar`, `repIr`, panel `mc-rep-pegar`/`mc-rep-fila`): se pegan del Excel "Nombre Norte Este [Cota]" por línea y se recorren con ◀ ▶ sin tenerlas dibujadas; el separador se escoge como en el importador (el primero que deje Norte y Este numéricos, así "70,711" no se parte por la coma); "Dibujarlas" las mete al dibujo como puntos con descripción ESTACA. NO toca el dibujo, ni cálculos, ni el DXF) (v34: **agarrar y soltar** en Mover y Copiar. Al tocar el punto de agarre, lo elegido queda pegado a la PANTALLA en ese punto (estado `agarre` = {X, Y} en píxeles, puesto con `aP(q)`): así se mueve y se acerca la vista con un dedo como siempre y la figura viaja con la pantalla, se lleva tan lejos como se quiera y se suelta con **✓ Soltar aquí** (`soltarAgarre`) o tocando el destino con imán. El destino de la vista previa y del soltar es el mismo: `cursor || aM(agarre.X, agarre.Y)` (con ratón manda la mira, como siempre). `aplicarMover(q)` es el código que ya estaba, sacado de `tocar` para que lo usen los tres caminos. El agarre se borra en `setHerr`, `cancelar`, `deshacerDib` y `terminarSeleccion`. Girar no lo usa. En la misma versión, arreglo: `distObjeto` de una pieza pegada (`pz`) tomaba `DIB.caja(o)` como 2 esquinas, pero desde la v32 son las **4 esquinas giradas**, así que la caja salía de alto cero y la pieza solo se podía tocar por su borde de arriba; ahora toma el mínimo y el máximo de las esquinas) (v30: **lados curvos** en la polilínea, el *bulge* del DXF: el vértice guarda `b`; `DIB.arcoDe`, `lados`, `trazos`, `puntos`, `medioLado`, `largoObj`, `areaObj`, `bulDeRadio`/`bulDeFlecha`; Recto/Curvo con radio y flecha en Elegir; grupo 42 en el DXF; sin `b` todo igual que antes) (v29: imanes **Cercano** y **Perpendicular** en `imanVivo`, que sí depende de dónde está el cursor; los fijos siguen en `imanesDibujo` y mandan sobre los vivos) Igual que TopoVías v92: `DIB`, `EJE` (alineamiento con abscisas: polilínea → Elegir → "Usar como eje"), `crearDXF`, `DIB_GRUPOS`, `TabDibujo({ proy, onChange, onArchivo, onSupers })`, `panelTablaPuntos`, `panelEscribir`, `panelListaPuntos`. Formato de objetos al comienzo de la sección. Se quitó: "→ Vía" (`panelPasarVia`, `detectarDibujoVia`), "Marcar parqueadero" (`marcarparq`) y "Eje de la vía" (`@eje`, `traerEje`). Mini Civil agregó: el punto guarda `z` (cota) y `d` (descripción) si los tiene; `dib.etq` = {num, z, d} qué textos acompañan a cada punto (`etqDe`, `ETQ_DEF`; en pantalla, en `capaDeps` y en el DXF); Cota y Descripción en el panel de Elegir; Lista de puntos con filtros por descripción, color y cota (`lpFil`, "Elegir" toma lo filtrado, muestra hasta 300 filas); mover y acercar sin restos (v19): la cuadrícula y los puntos se pintan en un `<canvas>` (`tv-dib-fondo`, `cvRef`) que se borra entero y se vuelve a pintar en cada cuadro (`pintarFondo`); el svg de encima, del mismo tamaño y encima del canvas, lleva solo lo que se edita (líneas, figuras, superficie, mira, imanes, lo elegido) y la lupa copia del canvas con `drawImage` (`pintarLupa`); los dos se llaman desde `pintarRef.current` en un `React.useLayoutEffect` que se registra ANTES de la salida temprana `if (!dib) return …` (si va después, React falla con el error #310). `moverVista` solo guarda la vista y pide el repintado por cuadro de pantalla (`requestAnimationFrame` + `setVistaR`, `rafRef`); nada se mueve ni se escala a mano. Antes se movía y escalaba lo ya pintado (v14 la imagen del svg, v15 el grupo `capaGRef` con `transform`) o se repintaba el svg entero (v17): en la tablet y el celular de Brian el navegador no invalidaba esos miles de elementos y quedaban restos que solo se iban con "Regenerar imagen". Para que el repintado sea barato: la caja recorta, la cuadrícula se pinta solo del área visible y los objetos cuya caja (`DIB.caja`) no toca la pantalla (260 px de margen) no se dibujan: 17 ms por cuadro con 400, 1200 o 5000 puntos (en la v17, 84 ms con 5000). Para las pruebas, `window.MC_DIB = { aP, pts, txt, muestra }` (posición en pantalla de un punto del terreno, cuántos puntos y textos se pintaron, y los textos del punto con más etiquetas). La marca del punto es un **círculo relleno** (`arc` en el canvas, `<circle>` en el svg del elegido), del mismo tamaño en pantalla a cualquier zoom: hasta la v20 era un trazo de largo cero con punta redonda y el navegador del celular y la tablet de Brian no lo pintaba (v21); **Dibujo 3D** (v22, botón `mc-dib3d` "Dib 3D" junto a 2D | 3D; estado `dib3d`, localStorage `minicivil_dib3d`, arranca apagado): prendido, el vértice que se pega a un punto (o al extremo de una línea que ya tiene cota) se lleva esa cota — `imanesDibujo` lleva `z` y `nom` en el candidato de extremo, `DIB.extremos` la saca del punto, y `ponerPunto` la guarda en `q.z` solo con `linea`/`polilinea`/`area` (las figuras siguen planas); cartel verde con la cota junto a la mira (`mc-cota-iman`) y aviso al terminar con cuántos vértices quedaron con cota (`avisoCotas`). El resto (3D, DXF 3D, panel de cotas) ya existía desde la v14. Prueba `pruebas/dib3d.js`; gesto de un dedo (v17, boceto aprobado https://claude.ai/artifact/RzHok3uDebbj5c96nZfv47): con el dedo, arrastrar MUEVE LA VISTA en cualquier herramienta (pasados 8 px; `conDedo` en `onDown`, el mouse sigue igual que siempre), un toque corto pone el punto con imán, y si el dedo se queda quieto `LUPA_MS` = 350 ms sale la lupa y entra en puntería (`G.apuntando`: el arrastre afina y al soltar el punto queda donde apuntó; `soltarLargo` cancela la espera al moverse, al pellizcar o al soltar). La pluma sigue dibujando a mano alzada y "Seleccionar varios" sigue haciendo su recuadro; en las herramientas de Superficie el arrastre, que antes no hacía nada, ahora mueve la vista (prueba `pruebas/dedo.js`); pellizco con un dedo fuera del lienzo (en un botón o en las barras): `dedosFuera` lo sigue con los toques de toda la pantalla (`empezarPellizco`/`pellizcar`, `G.pinch.fuera`) y el dedo del lienzo ya no pone un punto al soltar; "Regenerar imagen" arma de nuevo el grupo (`rearmarLienzo`: clave `lienzoN` + vaciar el canvas con `c.width = c.width`) para que el navegador pinte todo desde cero, y desde la v20 eso pasa solo cada vez que se suelta el dedo o para la rueda (`fijarVista` lo llama, sin aviso); el svg va con `overflow: visible` dentro de una caja que recorta, y la cuadrícula se pinta una pantalla más a cada lado, así al alejar o moverse no se corta el dibujo; los textos de cada punto se ven solo si su vecino más cercano (`vecino`, por casillas) queda a más de `TXT_PX` = 34 px en pantalla (de lejos solo puntos pequeños, al acercar aparecen los textos donde caben) (prueba `pruebas/zoom.js`); grupo **Superficie** (`supquitar`, `supvoltear`, `supunir`, `supdevolver`; estado `supId`/`supAct`, `supSel` = lado a voltear, `supA` = primer punto a unir, `capaSup` = los triángulos en pantalla como un solo trazo, `tocarSup`, `voltearSup`, panel "Cambios"); botón **2D | 3D** junto a DXF (`modo3d`): la `Vista3D` va dentro del lienzo (`incrustado`) con el dibujo (`dib`), tocar un triángulo lo marca (`onQuitarTri`) y "Ver en 2D" vuelve con él marcado (`supMarca`); cotas de líneas y polilíneas en Elegir (`filasCota`: cota de todos o por vértice en `v[i].z` / `a.z` `b.z`, altura de muro `alto`, "Tomar de los puntos" a 2 cm, "Tomar de <superficie>", casilla de línea de quiebre de la superficie); DXF: línea y polilínea con cotas salen 3D (POLYLINE bandera 8, vértices 32); punto a su Z y en la capa de su descripción (`capaDeDesc`, tabla LAYER solo si hay descripciones: sin ellas el DXF sale idéntico al de TopoVías) |
| LEER DXF (antes de IMPORTAR PUNTOS) | `leerDXF(texto, sig)` (v31): solo lee. Parejas (código, valor) agrupadas por el código 0; resincroniza si una línea de código no es número. POINT, LINE, LWPOLYLINE/POLYLINE (curvatura del grupo 42, cerrada, cotas), CIRCLE, ARC, TEXT/MTEXT (limpia `\\f…;`, llaves y `\\P`) y los bloques (BLOCKS + INSERT con giro y escala uniforme, hasta 4 niveles; estirado = se salta). Capas → color (`DXF_ACI`, índice de AutoCAD al color más parecido; el 62 del objeto manda, 256/0 = por capa). Devuelve `{ objs, resumen, saltados, capas, sinColor, bloques, error }`. Pantalla: `panelDXF` (instrucciones → revisión → dibujar aquí o en uno nuevo, un solo Deshacer), `dibujarDXF`, estado `dxfIn`, lectura en memoria `LECTURA_DXF`; botón en el menú ⋯ (`mc-mas-dxfin`) y `@dxf` en Dibujar. Prueba `pruebas/leerdxf.js` |
| IMPORTAR PUNTOS (después de `objetosTablaPuntos`) | `leerArchivoPuntos(texto, op, existentes, sig)` (solo lee; separador `separadorPuntos`: el que deja norte y este como números, tabulación / punto y coma / coma / espacios; las líneas de título antes del primer punto se saltan (`encabezado` = número de la última); `op.orden` "NE"/"EN"; rojo = sin norte o este, incompleta o a más de 5 km del centro; ámbar = sin cota o cota no numérica, sin número → P…, número repetido → "3 (2)"), `coloresDescripcion` (`IMP_COLORES`, mayúsculas = minúsculas, la que ya está conserva su color), `objetosImportados`, `IMP_EJEMPLO`. Pantalla: `panelImportar` (instrucciones → revisión → "Dibujar N puntos" en un solo deshacer, en este dibujo o en uno nuevo; lee UTF-8 o, si no, Windows-1252), `dibujarImportados`, estados `imp`/`impOp` (orden y color en localStorage `minicivil_impOp`); botón "Importar puntos" arriba y `@importar` en Dibujar. Boceto aprobado: https://claude.ai/artifact/JmQfXZsw5q4nvcAPLZY3yn. Prueba `pruebas/importar.js` |
| SUPERFICIES, SECCIONES Y VOLÚMENES (antes de PROYECTOS) | Cálculo puro: `proy.superficies` (formato en el comentario de la sección), `puntosDeSuperficie` (puntos con cota, no escondidos, por descripción o dibujo; dos en el mismo norte y este con otra cota: queda el primero, el más alto o el más bajo según `sup.repetido` ("primero"|"alto"|"bajo", en el editor) y `calcularTIN` avisa cuál), `calcularTIN` (Delaunator en coordenadas locales; quiebres con Constrainautor: vértice pegado a un punto a 2 cm o nuevo con su cota propia si la tiene, si no la de la superficie; lados forzados `sup.lados` [{a, b, voltear?}] entre puntos que ya están; triángulos quitados `sup.quitados` (claves `claveTri` por sus vértices al mm) salen en `t.quitados`; `trianguloEn`, `dentroTri`; límite = centro del triángulo dentro de la figura; lado máximo), `superficieTIN` (en memoria `CACHE_TIN`: mismo `proy.dibujos` + misma superficie = mismo TIN), `indiceTIN`/`zEnTIN`, `bordesTIN`, `curvasTIN` (mayor cada 5), `perfilTIN` (trozos {s, z} sobre un segmento), `zEnPerfil`, `areaEntrePerfiles` (corte/relleno con cruce: suma las áreas de los polígonos de `rellenosSeccion`, los mismos que se pintan), `estacionesLinea` (cada paso + el final, perpendicular a la derecha; en un vértice, a la mitad del ángulo; más de `SECC_MAX` = 2000 no se calculan: `demasiadas`, y Secciones y Volúmenes avisan con `avisoDemasiadas`), `franjaSecciones`, `volumenPorSecciones` (promedio de áreas × distancia con los valores redondeados de la tabla), `volumenPorMallas` (cuadrícula fina, opcional dentro de la franja de las secciones), `r3`. Pantalla: `patronSup`/`MuestraSup` (color + textura), `VisorPlanta` (planta con borde, relleno, curvas, malla, línea y cortes; mover/acercar con dedo, ratón o rueda; fondo blanco fijo), `EditorSuperficie`, `TabSuperficies`, `Vista3D` (Three.js; con `dib`: puntos a su cota, líneas a su cota o sobre la primera superficie, muros con `alto` como pared; toque corto = triángulo marcado (Raycaster) y "Quitar este triángulo"; `incrustado` = dentro del Dibujo; la escena se rearma cuando cambian las superficies o el dibujo (`claveEscena` con `idObj`) y conserva la cámara (`CAM3D`); un dedo gira, dos acercan y mueven, rueda, botón derecho o Mayús mueve; exagerar altura en localStorage `minicivil_exag3d`; cómo se ve la superficie (v24): casillas **Sólido**, **Triángulos** y **Curvas de nivel** aparte (estado `v3d`, localStorage `minicivil_vista3d`); las curvas se arman con `curvasTIN(t, s.curvas)` como `LineSegments` a su cota, levantadas un poco para que no se entierren, en el color de la superficie aclarado (`mezcla(..., 0.62)`) y las mayores más opacas; cada superficie se prende y se apaga, y con `onSup` un botón ⚙ (`mc-3d-ajustes`) abre el `EditorSuperficie` dentro del 3D (`mc-3d-editor`: nombre, de qué puntos, límite, lado máximo, color, paso de curvas) sin salir; **textos de los puntos** (v23): casillas Cota y Descripción (estado `etq3d`, localStorage `minicivil_etq3d`, apagadas al empezar; solo con `dib`), pintadas en un canvas `mc-3d-textos` encima del lienzo 3D (`S.textos`, llamado al final de `S.pintar`): cada punto se proyecta con la cámara (`grupo.localToWorld` + `project`, así respeta la exageración), se descarta lo que queda detrás o fuera, se ordenan por cercanía y se reparte la pantalla en casillas de 24 × 14 px marcando las que ocupa el rectángulo real del texto (`measureText`), así no se montan: de lejos salen pocos, al acercar aparecen más. `window.MC_3D = { etq, vistos, aP, dondeCae }` para las pruebas; **dibujar dentro del 3D** (v25, con `onDibujar`/`onBorrarObj`): botones "✎ Línea" y "✎ Polilínea" arriba (`mc-3d-dib`, estado `modoDib`), un toque corto pone el vértice y dos dedos siguen girando y acercando; `S.dondeCae(X, Y)` lo pega a un punto del levantamiento a 20 px (con su cota) o, si no, lo deja sobre el terreno con la cota de la superficie (raycast al mesh + `grupo.worldToLocal`); la línea en curso se pinta en el canvas de encima (en 3D una línea es de 1 px), con "↶ Quitar el último", "Terminar" (polilínea) y "Salir" (`mc-3d-dibpanel`); al terminar, `S.terminar3` guarda `{t:'l'}` o `{t:'pl'}` con las cotas en el mismo dibujo. Sin modo dibujar, el toque elige lo que hay debajo con `S.objEn`: primero una línea del dibujo (raycast), luego un punto a 12 px, y si no, el triángulo de siempre; el panel `mc-3d-selobj` lo deja borrar (`mc-3d-borrar`). Solo líneas y polilíneas: las figuras siguen en el 2D; libera todo al cerrar; sin WebGL avisa), `PESTANAS_PROY`. Secciones y volúmenes: `proy.secciones` (formato en `SECC_DEF`), `cfgSecc` (sin elegir propone las dos primeras; si la elegida se borró queda vacía con `borrada` y Volúmenes pide elegir; al borrar una superficie `App` anota la pareja que se usaba), `calcularSecciones`/`seccionesDe` (en memoria `CACHE_SECC`), `rellenosSeccion`, `SvgSeccion` (cuadrícula, eje, corte rayado rojo, relleno punteado azul, perfiles; exageración que cabe), `LeyendaSecc`, `TabSecciones` (línea, cada cuánto, ancho izq/der, planta con los cortes: tocar elige la sección), `TabVolumenes` (arriba/abajo, método, resumen, comparación con el otro método y su diferencia en %, mallas en la franja o en toda la zona común, "Copiar tabla" para pegar en Excel, tabla que cuadra con las secciones), `copiarTexto`. **Perfil longitudinal** (v27): `perfilLargo(proy, cfg)` recorre la línea de las secciones tramo por tramo acumulando la abscisa y corta cada superficie con el mismo `perfilTIN` de las secciones (a lo largo en vez de a lo ancho); devuelve por superficie trozos `[{a, z}]`, que se cortan donde la superficie no llega. En memoria `CACHE_PERF`/`perfilDe`. `exagPerfil(P, W, H)` propone la exageración vertical de una lista de las de siempre (`EXAG_PERF`) para que el desnivel ocupe algo más de la mitad del alto. `SvgPerfil` lo dibuja (cuadrícula, cotas a la izquierda, abscisas abajo, cada superficie con su color) y dice la exageración de verdad, avisando si la pedida no cabe. En `TabSecciones` va la tarjeta `mc-perfil` (casillas por superficie `mc-perfil-sup` → `cfg.perfOcultas`; Auto `mc-perfil-auto` o fija `mc-perfil-exag` → `cfg.perfExag`). `Card` acepta `className`. Prueba `pruebas/perfil.js` (plano al 2 %: cotas exactas). Informe: `crearInformePDF(proy, R, V, mallas, cfg)` (carta; datos, resumen, comparación, tabla que sigue en otra página, secciones 2 × 3 por página con leyenda, "Página n de N"; letras estándar Helvetica/Courier: sin flechas) y `seccionPDF`, `rgbDe`. Prueba `pruebas/superficies.js` (planos con resultado conocido y cuentas a mano en pantalla) |
| PRESENTACIÓN (antes de `PESTANAS_PROY`) | (v28: las mismas piezas se pegan en el Dibujo como objetos `t: "pz"`; `primsDePieza(proy, o)` y `CLASE_PZ` al final de la sección, `DIB.pzTam` el tamaño en el terreno) Hojas para exportar, como el espacio papel de AutoCAD (boceto aprobado https://claude.ai/artifact/JfYbknVJqmj8p5LeEZMCa9). Tamaños (v22) en `HOJA_TAM`/`HOJA_ORDEN`: carta, oficio, doble carta, A4, A3, A2, A1, A0 y pliego 70×100; el rótulo se arma como si la hoja fuera carta y después se agranda entero (`kRotulo` = raíz del ancho, tope 2,5; `escalarPrims`; `rotuloHoja` envuelve a `rotuloBase`), así en A0 mide el doble que en carta. `proy.presentacion` = { datos (rótulo, una vez por proyecto, con `logo`/`logo2` achicados a 400 px por `leerLogo`), hojas: [{ tam "carta", orient, plantilla 1..5, contenido, fecha, revision, escala, piezas }] } (formato en el comentario de la sección). Todo se arma en mm con `P` (línea, rect, texto, círculo, imagen, grupo con recorte) y se dibuja igual con `svgPrims`/`PrimsSvg` (pantalla) y `pdfPrims` (PDF): lo que se ve es lo que sale; `pantalla: true` = solo en pantalla (textos guía grises del rótulo). Textos medidos con Helvetica de jsPDF (`anchoTexto`, `cortarTexto`, `partirTexto`). Rótulos: `rotuloHoja` → { prims, area } con `celdaRot`, `logoRot`, `firmaRot` (`PLANTILLAS`: franja inferior, cajetín derecho, cuadro en la esquina, interventoría, informe técnico; `USA_PLANTILLA` para avisar lo que falta). Piezas: `primsVentana` (en memoria `CACHE_VENT`; a escala 1:N = 1000/N mm por metro; objetos del dibujo, curvas de nivel, cortes de las secciones, textos de los puntos propios `pz.etq`, norte y barra de escala; recortada a la ventana), `encuadrarVentana` (escala estándar de `ESCALAS` que cabe), `primsSecciones`/`primsSeccion` (las de la pestaña Secciones, en cuadrícula, con leyenda), `primsTabla` (la de Volúmenes; las filas que no caben se dicen). `hojaNueva`, `piezaNueva`, `crearHojasPDF`. Pantalla `TabPresentacion`: hojas, hoja en SVG con zoom; tocar elige, arrastrar mueve (al soltar se guarda: un solo deshacer), esquina azul = tamaño, "Mover el dibujo adentro" corre `cx`/`cy`; al cambiar plantilla u orientación las piezas se acomodan (`setForma`); el rótulo se dibuja encima de las piezas. Prueba `pruebas/presentacion.js` |
| PROYECTOS (Mini Civil) | **Espacio en el celular (v26)**: en la pestaña Dibujo no se dibuja `mc-barra-proy`; el botón de volver (`mc-volver`, solo la flecha) y `tv-acciones` (tema, Drive, guardado) van dentro de la fila del dibujo (`mc-barra-dib`), que `App` le pasa a `TabDibujo` en el prop `cabecera`. En las otras pestañas la fila sigue igual. En el Dibujo, nuevo/renombrar/duplicar/borrar/importar/tabla/DXF se fueron al menú `⋯` (`mc-mas`, panel `tv-dib-mas`, botones `mc-mas-*`), y la franja de comando `tv-dib-cmd` flota sobre el lienzo (`position: absolute`, ancho al contenido, `pointer-events: none` salvo en sus botones por la regla del `<style>`; se parte en varias líneas si hay muchos botones). El lienzo pasa de 479 a 601 px en el celular (del 57 % al 71 % de la pantalla). `proyectoNuevo` (`{ id, nombre, creado, dibujos }`), `useLocalProyectos` (guarda en `TV_KEY`, con deshacer), `copiaDeProyectos` (para `FalloApp`), `Logo`, `TarjetaNube`, `PantallaProyectos`, `App` (inicio = lista de proyectos; proyecto = pestañas `nav.tab`: Dibujo, Superficies…; desde la v22, dentro de un proyecto NO se dibuja la barra `tv-header`: el tema, Drive y el estado de guardado van en la fila del proyecto `mc-barra-proy`, y `tv-main` lleva `mc-sin-barra` para el margen de la franja de estado del celular. En el inicio la barra con el logo sigue), `FalloApp`, arranque y aviso de versión nueva |

## Estado y lo que sigue
- Versión 43 (2026-10-24, Brian: "haz el botón Abrir archivo con DWG"): **abrir archivos desde el inicio**. Botón
  "Abrir archivo" (`mc-abrir-archivo`, en la tarjeta Proyectos de `PantallaProyectos`) para DWG, DXF y puntos (.csv/.txt).
  `leerArchivoPlano(file)` → `{ tipo: "dxf" | "puntos", texto }`; el DWG pasa por `dwgATexto(buf)`: carga LibreDWG solo la
  primera vez (`import("./lib/libredwg/dist/libredwg-web.js")`, variable `LIBREDWG`; si falla se puede volver a intentar) y
  `dwgADxf` (v41). La App crea un **proyecto de paso** (`temporal: true`, un dibujo vacío con el nombre del archivo) y le pasa
  el archivo a `TabDibujo` (props `abrir`/`onAbierto`, estado `porAbrir` en la App), que abre la misma revisión de siempre
  (`abrirDXF` para el panel de Importar DXF, `setImp` para Importar puntos). Mientras sea temporal: franja `mc-temporal` con
  **Guardar como proyecto** (`mc-guardar-proy`, quita `temporal`) y **Cerrar** (`mc-cerrar-archivo`, lo quita; ↶ Deshacer lo
  devuelve), solo la pestaña Dibujo, en el inicio la etiqueta "Archivo abierto · sin guardar" (`mc-sin-guardar`) y **no va a
  Drive** (`nubeSincronizar` no lo pone en su lista). "Importar DXF o DWG" del menú ⋯ también acepta DWG. **LibreDWG** en
  `lib/libredwg/` (`dist/libredwg-web.js` + `wasm/`, 11 MB, GPL-3 con su `COPYING` y `LEEME.md`): `sw.js` la guarda al instalar en
  su propio espacio `CACHE_LIB = "minicivil-libredwg-0.8.2"`, que no se borra al cambiar de versión de la app (solo si cambia la
  de la librería); si no alcanza a bajar, la app se instala igual. Medido en el navegador (pantalla de celular) con los 4 DWG de
  Brian: 0,2 a 0,9 s cada uno. Prueba nueva `pruebas/abrirarchivo.js` (14 revisiones, PC y celular, con servidor de verdad
  porque el módulo no carga desde file://): DWG de ejemplo de LibreDWG (`pruebas/muestra_2018.dwg`, GPL-3), guardar como
  proyecto, DXF cerrar y deshacer, puntos y **DWG sin internet**. Batería: 50 de 50. DXF de un dibujo normal idéntico byte por byte.
- Versión 42 (2026-10-24, Brian: "la app debe tener solo claro y oscuro; los de agua, tierra, fuego y aire elimínalos"): se
  borraron esos cuatro de `TEMAS`. Nada más cambia. "Abrir archivo" con DWG pasa a la siguiente versión.
- Versión 41 (2026-10-24, Brian: "si sabes que algo falta, agrégalo" antes de abrir DWG): **el lector de planos trae lo que
  faltaba** (sirve para DXF y, desde la v42, para DWG). En `leerDXF`: **cotas** (`DIMENSION` = su bloque `*D…` ya dibujado, contado
  en `resumen.COTA`; los puntos de la capa DEFPOINTS no entran), **sombreados** (`HATCH`: cada borde —polilínea, líneas, arcos,
  elipses, splines por sus puntos de control— como figura cerrada `som: "rayado"` o `"relleno"` si es sólido), **elipses** (polilínea
  por `curva`), **directrices** (`LEADER` y `MULTILEADER`: líneas + texto), **SOLID** (las flechas, relleno en orden 1-2-4-3),
  **3DFACE** (contorno con cotas), **tipo de línea** (por objeto o por capa → `tipo` de `DIB_LINEAS` con `tipoDeLT`), **textos con
  tamaño**: el `tx` guarda `h` (alto en m), `rot` (radianes) y `al` (l/c/r + b base, d abajo, m medio, t arriba; `textoDe`),
  en pantalla escala con el zoom y no se pinta si mide menos de 2,5 px; nuestro DXF los escribe con su alto, giro y alineación;
  los `tx` sin `h` (los de la app) siguen iguales. **Atributos** que no son de punto se ven como texto; `ATTDEF` no se dibuja.
  **Bloques en espejo o estirados** (antes se saltaban: "BLOQUE ESTIRADO"): escala X e Y aparte; sus círculos y arcos pasan a
  polilínea. **Objetos en otro plano** (210/220/230, `planoDe`/`alPlano`, regla del eje arbitrario de AutoCAD) para LWPOLYLINE,
  POLYLINE, CIRCLE, ARC, TEXT, HATCH, SOLID e INSERT (antes un plano en espejo o una vista vertical caía en otro sitio). Fallo viejo
  arreglado: un MTEXT con dirección (11/21) iba a parar cerca del 0,0. Lo que no se pudo dibujar (sombreado sin borde, cota sin
  bloque) sigue contándose en "no se trajo". **`dwgADxf(db)`**: lo que entrega LibreDWG de un DWG pasado a DXF de texto (solo
  espacio modelo, números completos) para que entre por `leerDXF`; lo usa la v42. Probado con los 4 DWG de Brian (AutoCAD 2018):
  SOLEVANTE de 1 156 a 2 822 objetos y nada sin traer; los límites coinciden con los de AutoCAD (EXTMIN/EXTMAX) salvo los objetos de
  Civil 3D y los sólidos 3D (154 en el levantamiento), que no se pueden leer. Fluidez con 8 753 objetos (Propuesta del muro, pantalla
  de celular): 34 ms por cuadro contra 67 de la v40 (los textos ilegibles no se pintan). Prueba nueva `pruebas/planos.js` (33
  revisiones con números a mano; 18 fallan con la v40); `leerdxf.js` igual. DXF de un dibujo normal idéntico byte por byte. Batería: 48 de 48.
  **Siguiente (v42, aprobada):** botón "Abrir archivo" en el inicio (DWG, DXF, puntos), proyecto de paso con "Guardar como
  proyecto" / "Cerrar"; LibreDWG (`@mlightcad/libredwg-web` 0.8.2, GPL-3, ~11 MB) como archivo aparte guardado por `sw.js` al
  instalar, para abrir DWG sin internet. Brian autorizó la dependencia y la licencia.
- Versión 40 (2026-10-24, `/ponytail-audit` sobre la v39; Brian: "arregla todo, lo necesario"): 4 hallazgos, los 4 arreglados.
  (1) Con el 3D abierto seguían activas las teclas del lienzo 2D: Retroceso borraba lo que había quedado elegido en Editar sin
  verse (reproducido: 3 → 2 objetos). Los dos escuchadores de `TabDibujo` no hacen nada si `modo3d`; prueba en `barra.js` (falla
  con la v39). (2) En Superficies no sale "Tomar cota" en la barra rápida (allí siempre toma la cota). (3) `Vista3D` sin el prop
  `incrustado` (ya solo va dentro del lienzo). (4) Borradas ~45 líneas de estilo de TopoVías sin uso (`tv-subvia`, `tv-tabs`,
  `tv-punto-*`, `tv-lect`, `tv-calc-*`, `tv-bloqueada`, `tv-volver`…), con la regla repetida que venía de la v35. DXF idéntico
  byte por byte (6 874 bytes). Batería: 46 de 46. Última auditoría: 2026-10-24 (v39).
- Versión 39 (2026-10-24, boceto aprobado https://claude.ai/artifact/D672C9hD4wNjkNQwo5o6De): **módulo de Superficies**. La
  pestaña Superficies tiene tres vistas (`mc-sup-vistas`, botones `data-vista`, localStorage `minicivil_supvista`): **Planta** (lo
  de siempre, con el editor de cada superficie: ajustes y "Llevar al DXF"), **Editar** y **3D**. Editar es el mismo `TabDibujo`
  con `modoSup` (reusado, no copiado): grupos `SUP_GRUPOS` = Triángulos (quitar, voltear, unir, devolver) y Dibujar (línea,
  polilínea, elegir, borrar); arranca en Quitar triángulo; las líneas siempre toman la cota de los puntos (`dib3d || modoSup`).
  3D = la `Vista3D` incrustada de ese mismo panel (`ver3d`/`onVer3d`; "‹ 2D" vuelve a Editar con el triángulo marcado). Salió del
  Dibujo: el grupo Superficie y el botón 2D | 3D. "Ver en 3D" de Volúmenes guarda `minicivil_supvista = "3d"` y abre Superficies;
  se quitó el 3D a pantalla completa de la App (`ver3d`). Donde está el lienzo no sale el deshacer flotante de la App ni su
  espacio de 84 px abajo (`:has(.tv-dibujo)` en el `<style>`): antes la página se corría 76 px en el celular. Cálculos, datos y
  DXF sin cambios. Pruebas ajustadas: `supdibujo`, `dibujo3d`, `deshacer3d`, `superficies` (también Volúmenes → 3D), `dedo`,
  `v35`, `barra`. Batería: 46 de 46.
- Versión 38 (2026-10-24, guía de estilo aprobada https://claude.ai/artifact/7m6oaMAmmnJe4PFhXgJwxU, primero en el Dibujo):
  `Btn` 36 px (small) / 44 px de alto, esquina 8, letra 13 de grosor 600; `Input` y `Sel` esquina 8 (cambia en toda la app, son
  los átomos). En el Dibujo: barra de grupos 56 px, letra 12/600; hoja de herramientas con esquina 8 y letra 12/600; títulos de
  panel 700; botones de la cinta 36 px, 13/600; pestañas del proyecto 44 px (antes 50) con esquina 8. Medido en el celular con
  `medir_dib.js` (scratchpad): esquinas 8 de 7 a 123 controles, letra 11,5 de 79 a 0, grosor 800 de 84 a 0. Solo aspecto.
- Versión 37 (2026-10-24, plan aprobado por Brian, boceto https://claude.ai/artifact/CXHp7tQ6VCisVfLhzfrj5G): **orden de
  herramientas**. `DIB_GRUPOS`: Dibujar solo dibuja; Medir solo mide (ID, distancia, área, ángulo, radio, abscisa); Paralela y
  Desfase pasan a Editar; grupo nuevo **Herramientas** (`herramientas`, icono `wrench`): replanteo, cuadro, acotar, auto acotar,
  estacar, imanes, cuadrícula, buscar, lista de puntos, regenerar, "Tomar cota de los puntos" (`@dib3d`, el antiguo "Dib 3D",
  mismo estado `dib3d`) y "Barra rápida" (`@barra`). El grupo Ver desapareció; Importar puntos / DXF / Tabla quedan solo en el ⋯.
  **Barra rápida** (`mc-rapida`, a la derecha del lienzo, translúcida): reemplaza los botones sueltos ✋ / Regenerar / Deshacer;
  lleva `RAPIDA_DEF` (distancia, ver todo, mano, deshacer, rehacer) y cada equipo escoge (localStorage `minicivil_rapida`, panel
  `mc-rapida-elegir`, `DIB_SUELTAS` = lo que no está en ningún grupo) y la esconde con `mc-rapida-ver` (`minicivil_rapida_oculta`).
  Botones con `data-accion` = id sin "@"; todo pasa por `accion(id)` (la mano también). **Fila de arriba**: el tema pasó al ⋯
  (`SelectorTema`) y Drive es un punto de 28 px (`BotonNube({ punto: true })`, clase `mc-nube-punto`); la fila cabe en una línea
  en el celular (lienzo +34 px). Nada cambió por dentro de las herramientas. Prueba `pruebas/barra.js` (17 revisiones, PC y celular).
- **Regla de Brian (2026-10-24)**: "la opción de deshacer debe estar en todos los módulos donde se edite o dibuje algo". Y "antes
  de cambiar algo me avisas; cuando necesites escribir código me dices para autorizar". Y "tener todo simple, funcional, no hay
  que hacer 1000 líneas de código si con 100 basta".
- Versión 36 (2026-10-24, Brian: "dibujé una línea en 3D y no la pude deshacer; luego eliminé un triángulo y tampoco"):
  **deshacer en todos los módulos**. Lo dibujado o quitado en el 3D sí quedaba en el historial (`HIST`), pero la vista 3D tapaba
  el botón flotante del Dibujo (`tv-dib-deshacer`). Ahora la `Vista3D` lleva sus propios **↶ / ↷** (`mc-3d-undo`/`mc-3d-redo`,
  arriba a la derecha del lienzo; la fila de arriba del 3D ya estaba llena en el celular) y **Ctrl+Z / Ctrl+Y** (`hist3`; mientras
  se dibuja, Ctrl+Z quita primero el último vértice). Solo cuando el 3D permite editar (`puedeEditar`). Además: (a) en el Dibujo
  2D, **Ctrl+Z deshacía solo lo que estaba en curso**, nunca lo ya dibujado; ahora deshace las dos cosas (`deshacerDib`) y Ctrl+Y
  rehace; (b) **dentro de un proyecto, fuera del Dibujo, no había ningún deshacer**: el botón flotante de la App (`tv-deshacer`) y
  su Ctrl+Z solo funcionaban en el inicio. Ahora funcionan en todo lo que no es el Dibujo (`enDibujo`), es decir Superficies,
  Secciones, Volúmenes y Presentación. Pruebas nuevas `deshacer3d.js` (20 revisiones) y `deshacer.js` (11), PC y celular; las dos
  fallan con la v35. El DXF sale idéntico byte por byte.
- **Plan aprobado (2026-10-24)**, en versiones y con bocetos: https://claude.ai/artifact/CXHp7tQ6VCisVfLhzfrj5G (orden de
  herramientas), https://claude.ai/artifact/7m6oaMAmmnJe4PFhXgJwxU (guía de estilo), https://claude.ai/artifact/D672C9hD4wNjkNQwo5o6De
  (módulo de Superficies). v37 reorden de herramientas: grupo Herramientas (replanteo, cuadro, acotar, auto acotar, dividir,
  imanes, cuadrícula, buscar punto, lista de puntos, regenerar, «Tomar cota de los puntos»), Ver desaparece, Paralela y Desfase a
  Editar (como en AutoCAD), importar solo en el menú ⋯, barra rápida a la derecha a la carta (por defecto Distancia, Ver todo,
  Mano, Deshacer, Rehacer), tema al ⋯ y Drive como punto de estado. v38 guía de estilo: botones 36/44/56 (44 en paneles), esquinas
  8/12/pastilla, letra 12/13/14/16/26 (13 en botones), grosores 600/700. v39 módulo de Superficies con tres vistas (Planta, Editar
  = el lienzo del Dibujo en modo superficie, 3D) y barras Triángulos, Dibujar, Ajustes; sale del Dibujo el grupo Superficie,
  2D|3D y Dib 3D (pasa a Herramientas, apagado de entrada). Al final: batería completa, /ponytail-audit y arreglar lo necesario.
- Versión 35 (2026-10-24, Brian pidió tres cosas de un informe técnico que le hicieron y las publicamos juntas).
  **(1) Curvas de nivel y triángulos al DXF.** Cada superficie tiene dos casillas nuevas en su editor ("LLEVAR AL DXF":
  `mc-dxf-curvas` y `mc-dxf-tin`, guardadas en `sup.dxf = { curvas, tin }`). Lo marcado sale en el DXF del dibujo, en capas
  propias (`capaDeSup`: `SUELO_NATURAL-CURVAS-MAY`, `-CURVAS-MEN`, `-TIN`), las curvas como **polilíneas 3D a su cota de verdad**
  (los tramos sueltos de cada nivel se unen en caminos con `unirTramos`, comparando extremos al décimo de milímetro, para que en
  AutoCAD sean polilíneas y no mil líneas) y los triángulos como **3DFACE** (uno por triángulo de `t.tri`; los quitados no van).
  Sin marcar nada el DXF sale **idéntico byte por byte** (comprobado contra la v34 con un dibujo de 14 objetos de todos los
  tipos: 6 874 bytes). **(2) ATTRIB al leer DXF.** Un INSERT con atributos (así vienen los puntos de Civil 3D, Topcon y Leica)
  entra como punto nuestro con su número, cota y descripción: se leen los ATTRIB que siguen al INSERT, se buscan las etiquetas
  conocidas (PUNTO/NUMERO/NUMBER…, COTA/ELEVACION/ELEVATION…, DESCRIPCION/DESCRIPTION/CODIGO…) y `numeroDXF` saca el número del
  texto (acepta coma decimal). Si los atributos no son de punto, el bloque se dibuja como antes. En la revisión sale la línea
  "Puntos de bloques con atributos". **(3) Replanteo desde estación** (ver DIBUJO en el mapa), con las dos cosas que pidió
  Brian después: escribir las coordenadas (ya funcionaba con "Escribir") y una **lista de estacas pegada del Excel** para
  recorrerla sin tener el dibujo. **Fallo real que destapó la prueba en celular**: el cartel del replanteo tapaba el dibujo y no
  se podía tocar la estaca siguiente; ahora va abajo y deja pasar los toques. Prueba nueva `pruebas/v35.js` (34 revisiones, PC y
  celular, con números a mano: 90° y 100.000 m exactos, 45°, 315° a la izquierda, Δ cota −1.500 y −3.000, la curva de 102 en
  x = 100.000 m de un plano al 2 %, 80 caras 3D de 80 triángulos). Ojo: esa prueba llama a la superficie "Suelo natural" y no
  "Terreno natural" porque `correr.js` toma por error cualquier línea que contenga "ERR", y "TERRENO" la contiene. Batería: 40 de 40.
  **Descartado por Brian** (el 4.º punto del informe, superficie de diseño desde un eje con banca, bombeo y taludes; boceto
  https://claude.ai/artifact/7AHq78TdkYsTt4VASzFxDf): "no quiero hacerlo muy grande, mi idea es poder trabajar con coordenadas,
  sacar volúmenes, hacer superficies para verlas; lo de crear vías o tuberías… para vías tengo TopoVías". Boceto del replanteo:
  https://claude.ai/artifact/Fbhng4m5vKhES94mRx3pvD
  **Taller visual borrado** (2026-10-24, Brian: "elimina el taller visual, ya tengo el código y sobre eso trabajo"): se
  borraron `taller/` (panel.js, hacer.py, apariencia.html), `pruebas/taller.js` y el `.gitignore` que los tapaba. Brian trabaja
  sobre la copia que tiene en su equipo; si vuelve a hacer falta, se arma de nuevo (era index.html + un panel inyectado).
  **Pendiente que Brian dejó dicho**: "hay que ir viendo cómo hacemos un apartado de herramientas para colocar cosas útiles pero
  que solo sean para un trabajo específico" — el grupo Medir se está llenando de cosas que no son medir (replanteo, cuadro de
  coordenadas, auto acotar). Se le hará un boceto de cómo repartirlo, aparte de esta publicación.
  **Del informe técnico quedan sin hacer, por dentro y sin que se note**: Web Worker para el TIN y las mallas, las reglas CSS
  duplicadas (`.tv-subvia button` en las líneas 80 y 83; `.tv-header`/`.tv-acciones` dentro del `@media 640`) y cambiar el
  selector `[style*="monospace"]` por una clase. Se guardan para la próxima auditoría.
- Versión 34 (2026-10-24, Brian: "quiero es poder mover el objeto por toda la ventana… hay que poder mover los objetos, y más por
  toda la pantalla para ponerlo donde yo quiera sin restricción" y "poder escoger de dónde cogerla, ya que por ejemplo si hago una
  figura la necesito mover y ensamblarla en la esquina de otra"): **agarrar y soltar**. Lo encontró pegando las secciones en el
  dibujo y tratando de moverlas: con el dedo, arrastrar mueve la vista en toda herramienta (gesto de la v17, que él quiere igual),
  así que no había manera de arrastrar un objeto; y para llevarlo lejos el arrastre tampoco serviría (se sale de la pantalla).
  Solución: **la figura se pega a la pantalla**. Editar → Mover → tocar el objeto → "Siguiente" → **tocar la esquina de donde se
  agarra** (con imán) → queda agarrada en ese punto de la pantalla, con la vista previa amarilla y una **cruz naranja en el punto
  de agarre** → se mueve y se acerca la vista con un dedo **igual que siempre** y la figura viaja con la pantalla → **"✓ Soltar
  aquí"**, o tocar el destino con imán (para ensamblar esquina contra esquina), o "Escribir" la distancia y el rumbo. "Cancelar" la
  devuelve. Sin restricción de distancia: se cruza la pantalla las veces que haga falta. Los cinco pasos de antes siguen tal cual
  (es un camino nuevo al lado, no un reemplazo) y **Girar no cambia** (Brian: es otro boceto). Sirve para todo, no solo las piezas.
  **Arreglo de un fallo de la v32 que era la mitad del problema**: `distObjeto` de una pieza pegada (`pz`) leía `DIB.caja(o)` como
  si fueran 2 esquinas, pero en la v32 pasó a devolver las **4 esquinas giradas**: la caja quedaba de alto cero y la pieza solo se
  podía **tocar por su borde de arriba** (en el celular, con poco zoom, a veces sí caía dentro de la tolerancia; en PC casi nunca).
  Prueba nueva `pruebas/agarrar.js` (22 revisiones, PC y celular, con el caso de Brian: pegar las secciones, agarrarlas por la
  esquina de abajo a la izquierda, correr la pantalla 220 × 120 px, soltar y comprobar que se movió exactamente eso y que la esquina
  cae donde mostraba la cruz; después ensamblar un cuadrado de 10 m por su esquina en un punto del levantamiento: queda exacto y con
  los cuatro lados de 10). Con la v33 esa prueba da 6 fallas en celular. Batería: 38 de 38. No se tocó `crearDXF` ni ningún cálculo.
- Versión 33 (2026-10-23, el hallazgo 4 de la auditoría): **trazos juntos**. Las líneas, polilíneas, círculos, arcos y trazos
  a mano alzada que comparten estilo se dibujan ahora en **un solo camino del svg** en vez de un elemento por objeto. El
  arreglo de la v19 solo había pasado los **puntos** al canvas; con la v31 un plano importado trae miles de **líneas**, y un
  elemento del svg por objeto hacía que el navegador se arrastrara al mover (medido en pantalla de celular: 3000 polilíneas =
  3026 elementos y **28 ms por cuadro**). Ahora: **27 elementos y 14,5 ms**, lo mismo que con el dibujo vacío (14,2 ms); con
  10 000 polilíneas, 38 ms. Cómo: `dDeObj(o)` da el camino (atributo `d`) de un objeto de solo trazo — el mismo que ya usaba la
  polilínea con curvas, sacado a un ayudante — y en el armado de la capa se acumula en un `Map` por clave
  `color|grosor|guion`; al final, un `h("path", { className: "tv-dib-juntos" })` por clave. `JUNTABLES = ["l","pl","ci","ar","fh"]`.
  **No se juntan** (siguen siendo su propio elemento, con el mismo aspecto de antes): lo elegido o señalado, lo que tiene
  relleno o rayado (`rellenoDe(o) !== "none"`, para que no se mezclen los rellenos ni salgan huecos donde dos figuras se
  montan), los puntos (que van en el canvas), los textos, las cotas, el cuadro de coordenadas, el eje y las piezas pegadas.
  Lo único que cambia de aspecto: los trazos juntos se pintan **después** de las figuras con relleno, así que una línea queda
  encima de un relleno (antes dependía del orden del dibujo); el relleno es un tinte del 6 %, así que no se nota.
  Prueba nueva `pruebas/juntos.js` (13 revisiones, PC y celular: que 801 trazos quepan en 2 caminos con sus 801 trozos, que la
  curva salga con su arco dentro del camino junto, que el relleno y lo elegido queden aparte, que lo escondido no se dibuje,
  que tocar siga eligiendo bien, y que acercar con 3000 polilíneas cueste casi lo mismo que con el dibujo vacío).
  Batería: 36 de 36. El DXF de un dibujo sin curvas sigue **idéntico byte por byte** al de la v31.
- Versión 32 (2026-10-23, auditoría `/ponytail-audit` del 2026-10-23 sobre la v31; Brian: "arregla todo"): **12 de los 13
  hallazgos**. El que queda (las líneas y figuras siguen siendo elementos del SVG) va en la v33, porque es estructural.
  (1) **Leer un DXF grande era cuadrático**: la rama POLYLINE le pasaba una copia del resto del archivo a `hacer` por cada
  polilínea (`lista.slice(i + 1)`). Ahora recibe la lista y el índice. Medido: 2 MB con 3000 polilíneas de **1971 ms a 455 ms**;
  4 MB ya no se va a 6,8 s. Además el archivo se lee **fuera del dibujado de la pantalla** (antes `leerDXF` corría dentro del
  render): `leerArchivo` pone `dxfIn = { leyendo: true, kb }`, muestra "Leyendo el archivo…" y a los 40 ms guarda el resultado
  en `dxfIn.r`; se quitó `LECTURA_DXF`. (2) **Unidades**: `DXF_UNIDAD` y la lectura de `$INSUNITS` del encabezado; un archivo
  en milímetros (una línea de 5000 mm entraba como 5000 m) ahora lo dice y ofrece la casilla "pasarlo a metros" (marcada por
  defecto); `dibujarDXF(r, destino, factor)` multiplica coordenadas y radios (la curvatura no, no tiene unidad). Sin encabezado
  o con "sin unidad" avisa que se lee como metros. (3) **Texto centrado**: si viene el grupo 72, 73 o un 71 mayor que 1, la
  posición de verdad es el **grupo 11**, no el 10 (antes todos los textos centrados caían en el 0,0). (5) La herramienta
  **Medir → Área** da lo mismo que el panel de Elegir en una figura con lados curvos (`resArea(v, o)` usa `areaObj`/`largoObj`):
  antes 100 m² y 117,472 m² para la misma figura. (6) **`verticesDe`** devuelve `DIB.puntos(o)` para una polilínea: las
  secciones, el perfil, el límite de una superficie y las líneas de quiebre ya siguen la curva y no la cuerda. (7) **"Usar como
  eje"** con curvas pregunta antes y pasa la forma partida en tramos (el eje no guarda curvatura), y lo dice. (8) **La pieza
  pegada gira de verdad**: guarda `ang` (radianes, contra el reloj), `transformar` lo suma, `DIB.esquinasPz` da las cuatro
  esquinas giradas (las usan `extremos` y `caja`), en pantalla se dibuja con `rotate(-ang)` (la Y de la pantalla va al revés) y
  en el DXF las coordenadas se giran; el panel muestra "Girada N°" y "↺ Ponerla derecha". (9) **Los imanes vivos descartan por
  la caja** antes de partir los arcos: de **11,3 ms a 0,8 ms** por movimiento del ratón con 3000 polilíneas curvas.
  (10) Pruebas nuevas de todo lo anterior en `leerdxf.js`, `arcos.js` y `piezas.js`. (11) Código muerto borrado:
  `DXF_CONOCIDAS`, `dxfOp`/`setDxfOp`, `LECTURA_DXF` y la `Y` repetida de `hacer`. (12) El color se mira **después** de saber
  que el tipo se conoce (antes el aviso "N objetos con un color que no manejo" contaba objetos que ni se importaban).
  (13) Una **lente** (polilínea de 2 vértices cerrada con curvatura en los dos lados, común en un DXF) ahora cierra:
  `DIB.cerrada` y `segmentos` la aceptan; mide 78,540 m² (dos semicírculos de radio 5), antes solo la mitad.
  **Fallo extra que destapó el arreglo 9 y que la auditoría no vio**: la **caja de una polilínea con lados curvos no cubría el
  arco** (solo los vértices), así que el arco se salía de su caja: no se pintaba al recortar la vista, "Ver todo" lo dejaba
  afuera y los imanes no lo veían. `DIB.extremosArco(a, b, bul)` da la caja del arco en 4 cuentas (los puntos del círculo a 0°,
  90°, 180° y 270° que caen dentro del barrido), sin partirlo, y `DIB.caja` la usa. Comprobado que da lo mismo que la cuenta
  fina. **Comprobado aparte**: el DXF de un dibujo con 14 objetos de todos los tipos y sin curvas sigue saliendo **idéntico
  byte por byte** al de la v31 (21 309 bytes). Batería: 34 de 34.
- Versión 31 (2026-10-23, Brian: "dale con la v31", mismo boceto https://claude.ai/artifact/QEwqHBvY8bcxzgzxHDYNxv):
  **importar DXF**. `leerDXF(texto, sig)` (sección LEER DXF, antes de IMPORTAR PUNTOS) lee un .dxf de texto a mano, sin
  librerías: arma las parejas (código, valor) y las agrupa por el código 0; si una línea de código no es número, la salta para
  volver a sincronizar. Trae **POINT** (con cota; la capa queda como descripción), **LINE**, **LWPOLYLINE** y **POLYLINE** con
  su **curvatura del grupo 42** (la v30 ya la sabe dibujar y medir), cerrada o abierta, con cota del 38 o de los vértices,
  **CIRCLE**, **ARC** (ángulos de grados a radianes), **TEXT** y **MTEXT** (junta los 3 y el 1, y limpia los códigos de
  formato `\f…;`, las llaves y los `\P`), y los **bloques**: la sección BLOCKS se guarda y cada **INSERT** se dibuja con sus
  líneas en su sitio, girado y escalado (`transformar` + el radio por `trans.k`; hasta 4 niveles anidados; un bloque estirado
  —escala X distinta de Y— se salta y se avisa). Las **capas** (tabla LAYER) dan el color: índice de AutoCAD → el color más
  parecido de la app en `DXF_ACI`; un índice que no está ahí deja el color de siempre y se cuenta. El color del objeto (62)
  manda sobre el de la capa; 256 y 0 = por capa. X del DXF = Este, Y = Norte, tal cual: **no mueve ni escala nada**.
  No se trae: sombreados, cotas de AutoCAD, splines, elipses, mallas de puntos y lo demás; se cuenta por tipo y se muestra con
  nombre en español. Pantalla: `panelDXF` (igual que "Importar puntos": instrucciones → revisión → "Dibujar en este dibujo" o
  "en uno nuevo", **un solo Deshacer**), con el botón **Importar DXF** en el menú ⋯ y `@dxf` en Dibujar; estado `dxfIn`,
  lectura en memoria `LECTURA_DXF` (una vez por archivo, no en cada toque). Un DXF **binario** se rechaza explicando que hay
  que guardarlo como DXF ASCII; un archivo que no es DXF, o sin nada dibujable, también lo dice. Prueba nueva
  `pruebas/leerdxf.js` (21 revisiones, PC y celular) con un DXF **escrito a mano** (dos capas, punto con cota, línea,
  LWPOLYLINE cerrada con curvatura 0.5, círculo, arco, MTEXT con formato, bloque "ARBOL" insertado girado 90°, y un sombreado,
  una cota y un spline que deben saltarse) y de **ida y vuelta con nuestro propio DXF** (la curvatura, el área y el perímetro
  quedan iguales). Números a mano: el triángulo con el lado curvo da radio 9.375 m y área 129.313056 m² (90 del triángulo +
  39.313 del arco). Batería: 34 de 34.
  **Pendiente a propósito**: los textos entran centrados y sin girar (nuestro `tx` no guarda rotación); las etiquetas de los
  puntos de un DXF nuestro vuelven como textos sueltos (es lo que el archivo dice).
  **De lo que Brian estudió después** (3.er documento, "Especificación Arquitectónica y Matemática Definitiva"), queda
  **aprobado como idea y sin hacer**: curva en el PI del eje (radio, T, L, PC, PT, delta, con el abscisado corriendo sobre la
  curva); pendientes de la superficie (% por triángulo, flechas de escorrentía, colores por rango); prioridad de imanes al
  estilo AutoCAD (extremo > intersección > medio > centro > perpendicular > cercano; hoy gana el más cercano entre los fijos);
  centroide de una figura; tramas de achurado (concreto, grava, tierra); capas completas (color, tipo y grosor de línea,
  congelar, bloquear). **Pendiente de respuesta de Brian**: red de tuberías (pozos, tubos, Manning) y datos de obra por objeto
  (ítem de pago, fase). **Verificado de ese documento**: la curvatura mayor que 1 (arco de más de 180°) funciona bien en la
  v30 (probado con 0.3, 1, 1.5, 3 y -1.5: el centro queda a su radio de los dos extremos y el área coincide con la
  aproximación fina). **Error detectado en ese documento**: su `offsetPolyline` mueve los extremos del arco perpendicular a la
  cuerda cuando deben moverse hacia el centro (la curvatura sí se conserva: el ángulo no cambia). No copiarlo.
- Versión 30 (2026-10-23, Brian: "dale con la v30", boceto https://claude.ai/artifact/QEwqHBvY8bcxzgzxHDYNxv): **lados curvos
  en la polilínea** (el *bulge* de AutoCAD), lo primero de las dos versiones aprobadas. Cada vértice puede guardar `b` = la
  curvatura del lado que SALE de él (tangente de la cuarta parte del ángulo barrido; positiva = se abomba a la **derecha** de
  a→b, contra el reloj, como en el DXF). Sin `b`, todo queda exactamente como antes. En `DIB`: `arcoDe(a, b, bul)` (centro,
  radio, ángulos, largo), `conCurvas`, `lados` (los lados con su curvatura), `trozosLado`/`trazos`/`puntos` (el arco partido en
  cuerdas de 3°, hasta 64, para tocar, rayar y saber si un punto está dentro), `medioLado` (el imán de punto medio va a la cima
  del arco), `largoObj`/`areaSignoObj`/`areaObj` (**exactos**: el arco con su fórmula y el área del segmento circular con su
  signo, no la cuerda), `bulDeRadio`/`bulDeFlecha`/`flechaDe`. `contorno` ya devuelve `DIB.puntos(o)`. Cambiados a `trazos` o a
  los exactos: tocar un objeto (`distObjeto`), `imanVivo`, `primitivas` (cruces), el imán de medio, el panel de Elegir, Auto
  acotar, el cuadro de coordenadas, el aviso de Unir y de Desfase, y el rayado de la ventana en Presentación. En pantalla, una
  polilínea con curvas se pinta como `path` con arcos de verdad (comando A; la Y de la pantalla va al revés, así que un arco
  contra el reloj se dibuja a favor); sin curvas sigue siendo `polyline`/`polygon`, igual que antes. En el DXF la curvatura sale
  en el **grupo 42** del vértice, solo si la tiene. **Descomponer** un lado curvo da un objeto arco (`ar`), no una cuerda. En
  Elegir, cada lado trae su medida y los botones **Recto / Curvo** (y "⇄ Al otro lado"), con campos **Radio** y **Flecha** (se
  escribe uno y sale el otro; un radio menor que la mitad del lado se rechaza con aviso). De paso, `transformar` ya no pierde la
  cota ni la curvatura del vértice al mover, copiar o girar (antes `o.v.map(f)` devolvía solo x e y: una polilínea con cotas del
  Dibujo 3D las perdía al moverla). Prueba nueva `pruebas/arcos.js` (18 revisiones, PC y celular, con números a mano:
  curvatura 1 = semicírculo exacto; cuadrado de 10 con el lado 1 a curvatura 0.5 → perímetro 41.591190 m y área 117.472470 m²,
  y al otro lado 82.527530 m²). **Comprobado aparte**: el DXF de un dibujo con 14 objetos de todos los tipos y sin curvas sale
  **idéntico byte por byte** al de la v29 (21 309 bytes). Batería: 32 de 32.
  **Pendiente a propósito** (dicho en el boceto): recortar, extender y desfase tratan el lado curvo como su cuerda.
  **Lo que sigue**: la v31, leer DXF (ya puede traer las curvas sin perderlas).
- Versión 29 (2026-10-23, Brian estudió esquemas de motores CAD y eligió qué aplicar): **imanes Cercano y Perpendicular**.
  Los imanes de antes (extremo, medio, centro, cruce, abscisa) son una lista fija que no depende del cursor; estos dos sí,
  así que van en `imanVivo(objs, activos, p, base, tol)` (junto a `imanesDibujo`, `tol` en metros = píxeles / zoom) y se
  consultan en `conIman` **solo si ningún imán fijo quedó cerca**; entre los dos, Perpendicular manda. Cercano = el punto de
  la línea (o del borde del círculo o arco) justo debajo del cursor. Perpendicular = el pie de la perpendicular desde el
  último punto puesto; si cae en la prolongación y no dentro del tramo, no hay imán (no se inventa). En el círculo,
  Perpendicular cae en el borde mirando al centro. Marcas en pantalla: ⊥ azul y reloj de arena naranja. Casillas nuevas en
  el panel 🧲 Imanes: **Perpendicular prendido**, **Cercano apagado** (Cercano prendido se pega a toda línea y estorba para
  tocar en el aire). Prueba nueva `pruebas/imanes.js` (12 revisiones, PC y celular: números a mano — perpendicular desde
  (30,40) a la línea (0,0)-(100,0) da (30,0) exacto, y en pantalla la línea queda ahí). Batería: 30 de 30.
  **De lo que estudió Brian, descartado y por qué**: patrón Command con deltas (el deshacer ya funciona), DCEL/Half-Edge para
  curvas de nivel (dice que tardarían minutos; medido: las nuestras tardan milisegundos), Float64/RTE (JavaScript ya es de 64
  bits y ya se dibuja relativo al centro de la vista), pasar todo a WebGL y prohibir SVG (reescribir el motor sin ganancia),
  interfaz tipo Civil 3D (cinta 120 px + Toolspace 300 px + Properties 250 px: es de escritorio, en el celular no deja lienzo),
  dependencias `dxf-parser`/`RBush` y TypeScript (un archivo, sin compilador), coordenadas en vivo abajo y selección
  ventana/cruzada (Brian: "el 4 descartado, la selección de ventana como la tenemos"), y el índice espacial por casillas
  (medido: solo rinde de ~15.000 objetos para arriba; Brian trabaja hasta 1.000 puntos). **Lo que queda aprobado como idea,
  sin hacer, cada uno con boceto antes**: leer DXF (hoy solo se escribe) y arcos dentro de la polilínea (bulge) — van juntos;
  luego capas del dibujo (nombre, color, prender/apagar, bloquear); luego Orto/Polar con la distancia y el ángulo en vivo.
- Versión 28 (2026-10-23, Brian: "sigue con pegar las secciones y el perfil en el dibujo"): **piezas pegadas en el dibujo**,
  lo segundo del boceto https://claude.ai/artifact/76vpDuXmpj1hVkAXQNeCPv. En Secciones hay "📌 Pegar las secciones en el
  dibujo" (cuadrícula de 2 × 2 desde la 1.ª) y "📌 Pegar el perfil en el dibujo", y en Volúmenes "📌 Pegar la tabla en el
  dibujo". Cada una queda como un objeto más del dibujo (`t: "pz"`, `{ clase, p, w, h, esc, cols, filas, desde }`), **viva**:
  se arma con las mismas funciones de las hojas de Presentación (`primsSecciones`, `primsTabla`, `primsPerfil`, ahora dentro
  de `primsDePieza`), así que si cambia el paso, la línea o las superficies, la pieza cambia con ellas. Se pone al lado de lo
  que ya hay (no se monta), se mueve y se elige como cualquier objeto, y al tocarla el panel dice qué es, a qué escala está,
  cuánto mide en el terreno y deja cambiarle la escala (1:100 a 1:2000) y, en las secciones, por fila / filas / desde la n.º.
  Sale al DXF con sus líneas, textos y círculos (`crearDXF(dib, proy)`; sin el proyecto sale igual que siempre). La escala que
  se propone al pegar el perfil es la de siempre con la que mide unos 19 cm de ancho en el papel. Prueba nueva
  `pruebas/piezas.js` (PC y celular, 15 revisiones). Batería completa: 28 de 28. **Lo que sigue del mismo boceto**: el panel
  de qué datos mostrar y qué colores en las secciones.
- Versión 27 (2026-10-23, Brian: "empieza por el perfil, vivas, en cuadrícula, propón la escala"): **perfil longitudinal**,
  lo primero del boceto https://claude.ai/artifact/76vpDuXmpj1hVkAXQNeCPv. En la pestaña Secciones, debajo de la sección, una
  tarjeta nueva dibuja el terreno (y las demás superficies, cada una con su color y su casilla) a lo largo de la misma línea,
  con cuadrícula, cotas al lado y abscisas abajo. La exageración vertical la **propone la app** (Auto) y se puede fijar a mano;
  si la pedida no cabe en el alto, lo dice en vez de quedarse igual sin avisar. Se corta donde la superficie no llega, no se
  inventa terreno. Probado con un plano al 2 %: en 0, 100 y 200 m da 100,000 / 102,000 / 104,000 exactos, y una segunda
  superficie que solo llega a la mitad se corta en 100 m. Prueba nueva `pruebas/perfil.js` (PC y celular, 15 revisiones).
  Batería completa: 26 de 26. **Lo que sigue del mismo boceto** (ya decidido con Brian): pegar secciones, tabla y perfil en el
  dibujo como objetos vivos, en cuadrícula, con escala propuesta y cambiable; y después el panel de qué datos y qué colores.
- Versión 26 (2026-10-23, Brian: "hay muchas cosas que no deberían estar ocupando espacio… haz un análisis… y dame 5
  bocetos"): análisis del espacio y las tres primeras propuestas, que él eligió. Bocetos:
  https://claude.ai/artifact/7HopRmZhSTfjDaXzPPQKxd (medido: de 844 px, el lienzo solo tenía 479, el 57 %).
  (1) Lo que no se usa con el dibujo en la mano (nuevo, renombrar, duplicar, borrar, importar puntos, tabla de puntos y DXF)
  se fue al menú **⋯**: la fila de botones baja de dos líneas a una. (2) La franja de comando **flota sobre el dibujo**, como
  las coordenadas en las apps CAD que mandó: gana los 76 px que ocupaba. (3) La fila del proyecto se **funde con la del
  dibujo** en la pestaña Dibujo (el botón de volver es solo la flecha ‹). Total: el lienzo pasa de 479 a **601 px** (71 %).
  Lo importante, que él avisó: **nada cambió de funcionamiento**. La cinta flotante es transparente a los toques salvo en sus
  botones, y es del ancho de su contenido (si ocupara todo el ancho robaría los toques de la esquina: pasó en las pruebas y
  por eso se corrigió). 5 revisiones nuevas en `pruebas/dibujo3d.js` (que la cinta tape menos del 18 % y que el dedo llegue al
  dibujo en el centro y los bordes, el alto ganado y el menú ⋯ completo). Ajustadas `abrir.js`, `dibujo.js`, `importar.js`,
  `dedo.js` y `dib3d.js`, que pulsaban botones que cambiaron de sitio o tocaban a ciegas donde ahora está la cinta.
  Batería completa: 24 de 24. Pendientes del boceto (Brian decidirá): 4 pestañas más bajas, 5 modo obra a pantalla completa.
- Versión 25 (2026-10-23, Brian: "continúa y publica" — lo que faltaba del boceto y de lo que eligió): **dibujar dentro del
  3D** y **corregir el dibujo desde el 3D**. Botones "✎ Línea" y "✎ Polilínea" en la barra del 3D: un toque corto pone cada
  vértice y dos dedos siguen girando y acercando. El vértice se pega a un punto del levantamiento (toma su cota) o, si no hay
  punto cerca, cae sobre el terreno y toma la cota de la superficie ahí; el panel de abajo dice en qué cayó y con qué cota, con
  "↶ Quitar el último", "Terminar" y "Salir". Al terminar, la línea o polilínea queda en el mismo dibujo con sus cotas, se ve en
  el 2D y sale 3D en el DXF. Sin el modo dibujar, tocar elige lo que hay debajo (primero una línea, luego un punto a 12 px, y si
  no el triángulo del terreno) y se puede **Borrar**. Solo líneas y polilíneas, como Brian pidió; las figuras siguen en el 2D.
  **Mover todavía no**: arrastrar en 3D sin referencia es impreciso, así que para mover algo se va al 2D. 8 revisiones nuevas en
  `pruebas/dibujo3d.js` (PC y celular). Boceto: https://claude.ai/artifact/6teFEmXsrxH8s3ycLQ5KUW
- Versión 24 (2026-10-23, Brian: "hay que poder editar las capas… si veo que no quedó igual voy a querer corregir" y
  "diferentes tipos de vistas de las superficies, no solo sólido y triángulos, debería haber curvas de nivel"): en el 3D del
  Dibujo, (1) **Sólido**, **Triángulos** y **Curvas de nivel** son tres casillas aparte (antes el sólido iba siempre y solo se
  apagaba la malla). Las curvas van a su cota sobre el terreno, en el color de la superficie aclarado para que se lean encima
  del sólido, las mayores más vivas; sólido + curvas sin triángulos queda como un plano 3D de los de siempre. (2) Un botón ⚙
  al lado de cada superficie abre sus **ajustes dentro del 3D** (nombre, de qué puntos sale, límite, lado máximo, color, paso de
  curvas): se guarda y la vista se rehace con el cambio, sin ir a la pestaña Superficies. 9 revisiones nuevas en
  `pruebas/dibujo3d.js`. **Falta del mismo pedido** (Brian lo eligió, no se ha hecho): arreglar el dibujo (líneas y puntos) desde
  el 3D; y del boceto anterior, el modo "Dibujar" dentro del 3D (solo líneas y polilíneas).
- Versión 23 (2026-10-23, Brian: "solo necesito ver la cota y la descripción o la opción de activar o desactivar el texto…
  sin texto iría más fluido, con textos sabría qué hay en cada lugar"): en la vista 3D del Dibujo, los puntos pueden mostrar su
  cota y su descripción, cada una con su casilla abajo (junto a "Malla de triángulos"). Arrancan apagadas. Se pintan en un canvas
  encima del 3D proyectando cada punto con la cámara, y solo salen los que caben (ver Vista3D en el mapa): de lejos pocos, al
  acercar más. Sin textos la vista va igual de suelta que antes. Prueba: 6 revisiones nuevas en `pruebas/dibujo3d.js` (PC y
  celular). Boceto aprobado: https://claude.ai/artifact/6teFEmXsrxH8s3ycLQ5KUW. **Lo siguiente de ese boceto, decidido con
  Brian pero sin hacer:** modo "Dibujar" dentro del 3D (un dedo apunta, dos giran), con el vértice pegado a un punto o al
  terreno; **solo líneas y polilíneas** (las figuras se quedan en el 2D).
- Versión 22 (2026-10-23, Brian: "hay que maximizar la zona en la que se pueda trabajar" y "poder hacer líneas o polilíneas en
  3D, dibujar sobre los puntos que están, en las alturas"). Tres cosas. (1) **Más lienzo:** dentro de un proyecto se quitó la barra
  de arriba (logo y subtítulo); el tema, Drive y el estado de guardado se pasaron a la fila de "Proyectos · nombre", que ya estaba.
  En el celular el lienzo pasa de 420 a 479 px de alto y empieza 59 px más arriba. En la pantalla de inicio la barra sigue igual.
  (2) **Dibujo 3D:** botón "Dib 3D" junto a 2D | 3D, apagado al empezar, lo prende y apaga Brian y cada equipo lo recuerda.
  Prendido, cada vértice de una línea o polilínea que se pega a un punto (o al extremo de una línea que ya tiene cota) se lleva esa
  cota; sale un cartel verde con la cota en la mira y, al terminar, un aviso con cuántos vértices quedaron con cota. Las figuras
  (rectángulo, círculo, arco) siguen planas. El 3D y el DXF 3D ya existían: ahora la línea llega ahí sin escribir nada.
  Boceto aprobado: https://claude.ai/artifact/EmU9hgggjhJcAPM7kkv4E7. (3) **Tamaños de hoja** en Presentación (ver el mapa).
  `Btn` acepta `aria-pressed`. Prueba nueva `pruebas/dib3d.js` (PC y celular, 14 revisiones; falla con la v21) y `presentacion.js`
  revisa las 90 combinaciones de hoja × plantilla × orientación. Batería completa: 24 de 24.
- Versión 21 (2026-10-23, Brian con fotos del celular: "los puntos desaparecen"): la marca de cada punto era un trazo de largo
  cero con punta redonda (`moveTo` y `lineTo` al mismo sitio, `lineCap` redondo; en el svg una `<line>` con `x1 = x2`). El Chrome
  del computador lo pinta como un circulito, pero el navegador de su celular y su tablet no pinta nada: solo se veían los textos
  de los puntos, y al alejar, cuando los textos se esconden porque no caben, la pantalla quedaba vacía (su tercera foto). Ahora
  es un círculo relleno de verdad (`x.arc(...)` en el canvas y `<circle>` en el svg del punto elegido), del mismo tamaño que antes
  (radio 4,5 px, o 3 cuando los puntos quedan muy juntos). Solo cómo se dibuja la marca: no cambia posiciones, datos ni el DXF.
  Dos revisiones nuevas en `pruebas/zoom.js`: que de lejos y sin textos las marcas se vean en la pantalla, y que la del punto
  elegido sea un círculo (esta falla con la v20). Ojo: el Chromium de las pruebas SÍ pintaba el trazo de largo cero, así que el
  fallo no se podía reproducir aquí; lo que confirma el arreglo es su celular.
- Versión 20 (2026-10-23, Brian: "en tu entorno lo hace bien pero ya en celular o tablet no… que luego de mover se regenere la
  página automáticamente"): red de seguridad. En cuanto se suelta el dedo o para la rueda (`fijarVista`), el Dibujo se arma de
  nuevo solo: `rearmarLienzo` bota el grupo del svg (clave `lienzoN`) y vacía el canvas (`c.width = c.width`), lo mismo que hacía
  el botón "Regenerar imagen" pero sin aviso y sin tocar nada. Así, aunque en su equipo quede algún resto durante el gesto, al
  soltar la pantalla queda limpia. El botón sigue estando. Dos revisiones nuevas en `pruebas/zoom.js` (fallan con la v19).
- Versión 19 (2026-10-23, Brian: "no solo es la tablet, es el celular también"): el arreglo de fondo de los restos. La cuadrícula
  y los puntos ya no son elementos del SVG: se pintan en un `<canvas>` (`tv-dib-fondo`) que se borra entero (`clearRect`) y se
  vuelve a pintar en cada cuadro; en el SVG de encima queda solo lo que se edita (líneas, figuras, superficie, mira, imanes, lo
  elegido). Así el navegador ya no tiene que invalidar miles de elementos del SVG, que es lo que fallaba en la tablet y en el
  celular de Brian con los tres mecanismos anteriores (v14 transform de CSS, v15 transform del grupo, v17 repintado por cuadro).
  La lupa copia del canvas con `drawImage` en vez de rehacer el dibujo. Medido: 17 ms por cuadro con 400, 1200 y 5000 puntos
  (en la v17, 84 ms con 5000). Pintar: `pintarFondo()` y `pintarLupa()`, llamadas desde `pintarRef.current` en un solo
  `React.useLayoutEffect` registrado ANTES de la salida temprana `if (!dib) return …` (si va después, React falla con el error
  #310 al crear el primer dibujo). Para las pruebas, `window.MC_DIB = { aP, pts, txt, muestra }` da la posición en pantalla de
  un punto del terreno, cuántos puntos y textos se pintaron y los textos del punto con más etiquetas (antes se leían del DOM):
  se ajustaron `zoom.js`, `dedo.js`, `abrir.js`, `dibujo.js`, `importar.js` y `supdibujo.js`. Se quitó la "nube" de puntos en un
  `path` por color de la v17, que ya no hace falta. Falta que Brian confirme en la tablet y en el celular que los restos se
  acabaron. Prueba de la idea (SVG de hoy / SVG simple / canvas): https://claude.ai/artifact/FU3WbGTkMyGb5p8ad6Ugcd
- Versión 18 (2026-10-23, Brian: "arregla todos puntos de auditoria"): los 7 hallazgos de la auditoría del 2026-10-23 (v17).
  (1) y (2) **el mismo fallo en dos sitios**: el valor de una lista desplegable llega como texto y los id de las superficies son
  números, así que no coincidían. En el Dibujo, elegir otra superficie no cambiaba nada y los triángulos se quitaban de la primera;
  en Volúmenes, elegir arriba o abajo dejaba las dos listas vacías y borraba la tabla. Ahora `supAct` compara como texto y los
  selectores guardan el id de verdad (también los de "fuente: dibujo" y el dibujo de una ventana). (3) las pruebas usaban ids de
  texto ('tn', 'sr', 'otra') y por eso no lo veían: ahora son números (111, 222, 333) y `supdibujo.js` prueba el selector con dos
  superficies (las dos revisiones nuevas fallan con la v17). (4) la ventana de una hoja solo dibuja lo que se ve (`aLaVista`):
  con 600 líneas en 2 km a escala 1:500 pasa de 611 piezas a 17, así el PDF no carga lo que nadie verá. (5) quitada la clase
  `tv-etq`, que dejó de usarse en la v17. (6) `cerca()` busca el punto del quiebre por casillas de 2 cm (antes recorría todos los
  puntos por cada vértice). (7) `capaSup` arma los triángulos con cuentas sueltas: con 3450 triángulos el gesto pasa de 23,4 a
  17,7 ms por cuadro. Los restos de la tablet no eran de la auditoría: se arreglaron en la v19 (arriba).
- Versión 17 (2026-10-23, Brian: "si muevo de un lado a otro el dibujo o acerco y alejo va dejando la imagen residual… cómo hacemos para que la imagen esté siempre actualizada"): el Dibujo ya no mueve ni escala lo que está pintado; se vuelve a pintar entero en cada cuadro mientras el gesto va (ver DIBUJO en el mapa). Para que eso sea rápido: solo se pinta lo que cabe en la pantalla y las nubes de muchos puntos van en un solo trazo por color (con 5000 puntos, 19 ms por cuadro; antes 84). Los textos de los puntos ya no se esconden durante el gesto. Lo encontró Brian en la tablet con la v16: "Regenerar imagen" lo arreglaba, moverse lo volvía a dañar. `pruebas/zoom.js` rehecha (19 revisiones; con la v16 fallan 5). En la misma versión, el gesto de un dedo que Brian aprobó del boceto https://claude.ai/artifact/RzHok3uDebbj5c96nZfv47: arrastrar un dedo mueve la vista (antes apuntaba con la lupa y dejaba el punto al soltar), el punto se pone con un toque corto y la lupa sale al dejar el dedo quieto un momento. Prueba `pruebas/dedo.js` (PC y celular).
- Versión 16 (2026-10-23, Brian con foto de la tablet: "el zoom tiene problemas aún, pone puntos donde no van"): (1) un pellizco con un dedo fuera del lienzo (en un botón o en la barra de abajo) se tomaba como un toque del otro dedo y ponía un punto o el punto de una línea donde se soltaba: ahora acerca y aleja igual y no dibuja (reproducido: 3 de 6 pellizcos ponían puntos en la v15); (2) los restos de la imagen anterior (los TN de antes de alejar regados por la pantalla, como en sus fotos del celular de la v14) venían, lo más probable, del transform de CSS de cada punto: se quitó, los puntos se pintan con un borde que no escala y los textos se esconden mientras se acerca o aleja (con 5000 puntos cada paso del gesto pasa de 81 a 20 ms); "Regenerar imagen" ahora arma el dibujo de nuevo. Los restos no se pudieron reproducir en el Chromium de las pruebas (solo en sus equipos): falta que Brian lo confirme en la tablet. `pruebas/zoom.js` mide el punto en la imagen antes, durante y después del gesto, y prueba el dedo fuera del lienzo y Regenerar.
- Versión 15 (2026-10-23, Brian: "la opción 2, y sigue con el 3D"; y "el zoom sigue teniendo problemas": al alejar ya no se corta el dibujo y los textos de los puntos se esconden donde no caben): en cada superficie se elige qué punto usar cuando dos están en el mismo sitio con otra cota (el primero, el más alto o el más bajo); 3D dentro del mismo panel del Dibujo (botón 2D | 3D junto a DXF) con los puntos a su cota, líneas, muros con su altura, tocar un triángulo para quitarlo y "Ver en 2D" con el triángulo marcado. Prueba `pruebas/dibujo3d.js` (Chromium con `--use-angle=swiftshader` para tener WebGL).
- Versión 14 (2026-10-23, Brian aprobó el boceto https://claude.ai/artifact/JNTwQqdoa1X2NoKX8tvyn6): superficie dentro del Dibujo, etapa 2D: grupo Superficie con Quitar triángulo, Voltear lado (marca el lado y pide confirmar), Unir dos puntos, Devolver triángulo y panel Cambios (con Quitar todos); cotas a líneas y polilíneas dibujadas (por vértice, de los puntos o de la superficie), altura de muro (para el 3D) y línea de quiebre con esas cotas; DXF 3D. Prueba `pruebas/supdibujo.js`. Siguiente: 3D en el mismo panel (botón 2D | 3D junto a DXF, tocar un triángulo para quitarlo, muros con su altura).
- Versión 13 (2026-10-23, Brian: "el zoom se queda corto"): el Dibujo acerca hasta 50 px por milímetro (antes 5, límite en el pellizco y la rueda: `0.0005), 50000)`); dos puntos a 6 mm se ven separados y una línea de 2 km se sigue dibujando bien a 1 mm. Brian: casi repetido no es repetido y con otra cota es otro punto (no avisar al importar sin hablarlo).
- Versión 12 (2026-10-23, Brian: "fijos en pantalla"): en el Dibujo los puntos y los textos ya no crecen ni se encogen mientras se acerca o aleja (antes se veían así hasta soltar, porque el gesto agranda la imagen ya pintada). Siguiente (boceto aprobado https://claude.ai/artifact/JNTwQqdoa1X2NoKX8tvyn6): superficie dentro del Dibujo, etapa 2D (ver y editar triángulos: quitar, voltear lado, unir dos puntos, devolver) y luego 3D en el mismo panel.
- Versión 11 (2026-10-22, Brian aprobó el boceto y "empieza la primera etapa"): pestaña Presentación, etapa 1: hoja carta horizontal o vertical (los demás tamaños se ven como "pronto"), 5 plantillas de rótulo con datos del proyecto y logos, ventanas al dibujo a escala, secciones, tabla de volúmenes, varias hojas y PDF de todas. `Btn` acepta `className` y `aria-label`. Pendiente (etapas siguientes): más tamaños de hoja, cuadro de coordenadas, textos sueltos, girar la ventana, rótulo propio de Brian (plantilla 6).
- Versión 10 (2026-10-22, Brian: "quiero arreglar todo" lo de la auditoría de la v9): proyecto grande solo en IndexedDB (no llena el localStorage de TopoVías); tope de 2000 secciones con aviso; aviso de puntos repetidos con otra cota y de puntos en línea recta; áreas de la sección desde los polígonos que se pintan; al borrar una superficie del volumen pide elegir de nuevo; leyenda del PDF en varias líneas; sección a la mitad del ángulo en un vértice; varias líneas de título al importar; la lectura del archivo se guarda (`LECTURA_IMP`); quitado `BloqueoCtx`. Pruebas nuevas en `superficies.js` (también elegir quiebre y límite en pantalla) e `importar.js`; las nuevas fallan con la v9 y pasan con la v10.
- Auditoría con /ponytail-audit: 2026-10-23 (v31): 4 fallos de datos o de carga (DXF grande cuadrático, unidades, texto centrado, líneas en el SVG), 5 que deberíamos arreglar y 4 pequeños. Los 12 primeros se arreglaron en la v32; el de las líneas en el SVG, en la v33 (trazos juntos). Antes: 2026-10-23 (v17): 2 fallos de datos (los selectores de superficie), 2 arreglos de fondo y 3 mejoras; todo se arregló en la v18. Antes: 2026-10-22 (v9), arreglado en la v10.
- Versión 9 (2026-10-22): batería completa (`correr.js`, `sinconexion.js`) y arreglo: Volúmenes avisa si la línea de las secciones se borró del dibujo. Probado además con 7.000 puntos (TIN 29 ms, 38 secciones 81 ms, mallas 43 ms, cada pestaña abre en menos de 0.2 s en el celular) y en tema oscuro.
- Versión 8 (2026-10-22): "Informe PDF" en Volúmenes (jsPDF incrustado). Revisado por páginas con pdftoppm: nada se sale de su casilla.
- Versión 7 (2026-10-22): pestañas Secciones (sobre una línea, eje o polilínea del dibujo; cada 5/10/20/otro m; ancho a cada lado; la abscisa del eje si la línea es un eje) y Volúmenes (por secciones con la tabla que cuadra con las secciones, y por mallas como principal o para comparar). Pestañas del proyecto con ícono arriba para que quepan las cuatro en el celular.
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
