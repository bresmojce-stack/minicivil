# Diagnóstico de optimización DWG — Mini Civil v43

Fecha: 2026-10-24. Solo lectura: no se cambió ningún archivo de la app.
Base: el documento "Plan de Optimización CAD de Alto Rendimiento".

## 1. Qué usamos hoy

| Pregunta del plan | Respuesta |
|---|---|
| ¿Qué lee los DWG? | LibreDWG 0.8.2 (wasm, 11 MB) en `lib/libredwg/`. Se carga con `import()` en `dwgATexto` (`index.html`). |
| ¿Corre en el hilo principal? | **Sí.** No hay ningún Worker. Mientras convierte, la pantalla se congela. |
| ¿Se pasa todo a objetos JS a la vez? | No. El DWG se convierte a DXF de texto (`dwgADxf`) y entra por `leerDXF`. El texto es chico (1 MB para un DWG de 2 MB). |
| ¿Cómo se dibuja? | Puntos y cuadrícula en canvas 2D. Líneas y polilíneas agrupadas en pocos caminos SVG (v33). Textos ocultos si no caben. |
| ¿Bloques (INSERT)? | Se leen como instancias del bloque (`leerDXF` con giro y escala), hasta 4 niveles. |
| ¿Sombreados (HATCH)? | Se traen como figuras con borde y relleno, sin límite de cantidad. |
| ¿Selección e imanes? | Por casillas (`vecino`, imanes), sin recorrer todo el dibujo. |
| ¿Modo sin conexión? | `sw.js` guarda el wasm y el lector en `minicivil-libredwg-0.8.2`. Ya cumple la Fase 5.2. |

## 2. Medidas (4 DWG de Brian, el mayor de 2 MB)

| Archivo | Tamaño | Lee el DWG | `leerDXF` | Objetos |
|---|---|---|---|---|
| Levantamiento salón lote | 2,0 MB | 1,08 s | 24 ms | 435 |
| Propuesta muro talud | 1,0 MB | 0,55 s | 46 ms | 8 753 |
| SOLEVANTE planta de muros | 0,7 MB | 0,73 s | 27 ms | 2 822 |
| Canal Azcárate | 0,9 MB | 0,18 s | 7 ms | 271 |

- El cuello de botella es el wasm leyendo el DWG, no `leerDXF`.
- Memoria de la página: de 50 MB a unos 1 080 MB al cargar el lector, y se queda ahí.
  Medido en el Chromium de pruebas; falta confirmarlo en un celular.
- **No se probaron los archivos de 18 y 22 MB** (no están disponibles). Todo lo de ellos es estimación.

## 3. Fases del plan frente al código

| Fase | Estado | Propuesta |
|---|---|---|
| 1.1 Worker para el lector | No existe | **Hacer.** Archivo nuevo `lib/libredwg/lector.js`; el DWG viaja sin copiarse. |
| 1.2 Liberar memoria | `dwg_free` ya se llama, pero el wasm sigue en memoria | **Hacer.** Cerrar el Worker al terminar cada archivo libera todo el bloque. |
| 1.3 Filtrar basura / HATCH | HATCH sin límite | Hacer con cuidado, después de medir cuántos trae un plano real. |
| 1.4 Float32 y `originOffset` | Los dibujos guardan coordenadas completas | **No hacer.** En coordenadas grandes puede mover los puntos varios centímetros y toca cálculos, DXF y datos guardados. |
| 2 Bloques por instancia | Ya se hace así | Nada. |
| 3 WebGL | Canvas 2D + SVG agrupado; 34 ms por cuadro con 8 753 objetos | Solo si las medidas con planos pesados lo piden. |
| 4 Índice espacial | Casillas | Solo si hay más de unos 15 000 objetos. |
| 5.1 Textos por tamaño | Ya hay `TXT_PX` y no se pintan los de menos de 2,5 px | Revisar el umbral del plan (6 px). |
| 5.2 Caché sin conexión | Ya cumple | Agregar el Worker nuevo a `sw.js`. |

## 4. Fase 1 propuesta (sin escribir aún)

- `index.html`: `dwgATexto` pasa a hablar con el Worker (unas 25 líneas).
- `lib/libredwg/lector.js`: nuevo, unas 30 líneas.
- `sw.js`: una línea para guardarlo sin conexión y subir la versión.
- Mismo resultado de siempre: el DXF de texto. Nada de lo que funciona hoy cambia.
- Pruebas: batería de 50, `abrirarchivo.js` (incluye DWG sin internet) y DXF idéntico byte por byte.
- No se publica sin autorización de Brian.

## 5. Pendiente de Brian

1. Autorizar el código de la Fase 1 (1.1 y 1.2, sin 1.4).
2. Subir el DWG de 18 o 22 MB para medir antes y después.

---

# Parte 2 — Prueba de carga y cuadros por segundo (después de la v44)

Fecha: 2026-10-25. Solo medir: no se cambió código de la app en esta parte.

## Cómo se midió
- Como el DWG de 22 MB no se pudo subir, se importó **el mismo plano real** ("Propuesta muro talud", 1 MB, 8 753 objetos)
  1, 5, 10 y 20 veces en el mismo dibujo. 20 copias = 175 060 objetos, del orden de lo que traería un DWG de ~20 MB.
- Las copias quedan **una encima de otra**, así todo está en pantalla a la vez: es el **peor caso** (como "Ver todo").
- Navegador de pruebas (Chromium) con pantalla de celular de 390 px, en el computador de pruebas. **Un celular real será más
  lento** (no se sabe cuánto; suele ser de 2 a 4 veces).
- Cuadros por segundo = 1000 ÷ milisegundos por cuadro. Para que se sienta suave hacen falta unos 30 (33 ms); 60 es lo ideal.

## Resultados

| Objetos | Acercar/alejar (ms por cuadro) | Cuadros por segundo | Imanes al mover el cursor | Un toque (elegir) | Abrir la app con el dibujo | Memoria |
|---|---|---|---|---|---|---|
| 8 753 (1 plano) | 21 ms (peor 31) | **~48** | 15 ms (~67 por segundo) | 66 ms | 0,2 s | 16 MB |
| 43 765 (×5) | 107 ms (peor 129) | **~9** | 94 ms (~11) | 0,3 s | 0,6 s | 104 MB |
| 87 530 (×10) | 220 ms (peor 304) | **~4,5** | 254 ms (~4) | 0,5 s | 1,4 s | 282 MB |
| 175 060 (×20) | 697 ms (peor 836) | **~1,4** | 937 ms (~1) | 1,4 s | 3,4 s | 916 MB |

Importar cada copia (leer el DWG + dibujar): de 1,6 s la primera a 5,2 s la vigésima; la pantalla se trabó hasta 1,1 s en la
última (al meter los objetos al dibujo, no al leer el DWG, que ya va en el Worker).

## Lo que esto dice
1. **Con un plano normal (hasta ~10 000 objetos) va bien**: ~48 cuadros por segundo.
2. **Todo crece en línea recta con la cantidad de objetos.** Con un plano de 20 MB la app queda casi congelada:
   - **Acercar y mover la vista**: en cada cuadro se vuelven a armar los caminos del SVG con todos los objetos que se ven.
   - **Imanes y toque**: se revisan todos los objetos del dibujo cada vez que se mueve el cursor o se toca.
   - **Memoria**: cada objeto es un objeto de JavaScript con sus coordenadas; 175 000 objetos ≈ 900 MB. En un celular
     puede cerrarse la app.
3. **Fallo encontrado (real)**: con más de ~80 000 objetos, **"Ver todo" falla** ("Maximum call stack size exceeded") en
   `verTodo` (`Math.min(...xs)` con cientos de miles de números). Después de importar, la vista no se acomoda.
   El mismo patrón está en otros sitios que pueden recibir listas enormes (curvas de nivel con muchos puntos, ventana de
   Presentación). Arreglo: cambiar esas líneas por un recorrido simple; unas 10 líneas, no cambia ningún resultado.
4. **Los HATCH (1.3) no son el problema en esta app**: el sombreado de AutoCAD no trae las rayitas, solo el borde; Mini Civil
   lo dibuja con un patrón del SVG que no cuesta nada. No hace falta limitar su densidad.

## Propuesta (para aprobar, en este orden)
| Paso | Qué | Por qué | Tamaño |
|---|---|---|---|
| A | Arreglar `verTodo` y los otros `Math.min(...)` con listas grandes | Fallo real con planos grandes | ~10 líneas |
| B | **Fase 4 sin librería**: casillas para imanes y toque (como ya se hace con los puntos) | Pasa de revisar 175 000 objetos a revisar los de unos pocos metros alrededor | ~40 líneas |
| C | **Fase 3, versión liviana**: dibujar los trazos juntos en el canvas con caminos guardados (`Path2D`) que se arman una sola vez y en cada cuadro solo se mueven y escalan | Lo caro hoy es rearmar los caminos en cada cuadro; WebGL completo sería reescribir el motor | ~60 líneas, con boceto antes |
| D | Fase 5.1: textos por tamaño (ya existe; revisar si sirve con 6 px) | Pequeño ajuste | pocas líneas |

Cada paso se mide igual que aquí (misma tabla) y con la batería completa; el DXF de un dibujo normal debe salir idéntico.
