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
