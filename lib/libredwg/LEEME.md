# LibreDWG para navegador (leer DWG)

`@mlightcad/libredwg-web` 0.8.2 (https://github.com/mlightcad/libredwg-web), compilado de LibreDWG
(https://www.gnu.org/software/libredwg/). Licencia GPL-3.0 (texto en `COPYING`). Brian autorizó la dependencia
y la licencia el 2026-10-24.

Copiado tal cual del paquete npm: `dist/libredwg-web.js` (envoltura, importa `../wasm/libredwg-web.js`) y
`wasm/` (el lector compilado). Mini Civil lo carga solo al abrir un DWG (`dwgATexto` en index.html) y `sw.js` lo
guarda al instalar para que funcione sin internet. Para cambiar de versión: reemplazar los tres archivos y
cambiar `CACHE_LIB` en sw.js.

`pruebas/muestra_2018.dwg` viene de los datos de prueba de LibreDWG (`test/test-data/example_2018.dwg`, GPL-3.0).

## Cambios de Mini Civil (v69, 2026-11-11)

- `dist/libredwg-web.js`: una sola edición, en la lista de `export` del final: se agregaron `LibreDwgConverter` y
  `LibreEntityConverter` (ya existían en el archivo, pero no se podían usar desde afuera). Nada más cambia. Al actualizar la
  librería hay que repetir esa edición.
- `rapido.js` (de Mini Civil): subclases de esos dos convertidores que piden solo lo que la app usa y leen las líneas y
  polilíneas directo de la memoria del lector. Con un plano de 120 000 objetos, pasar lo leído baja de ~8 s a ~3 s y el pico de
  memoria a la mitad. Si falla, `lector.js` usa `lib.convert`, como antes.
- `dwg_a_dxf.js` puede devolver las parejas del DXF en arreglos de números (`dwgADxf(db, true)`) en vez de texto.
- `sw.js` guarda `dist/libredwg-web.js` y `rapido.js` con cada versión de la app; en el espacio de la librería solo queda `wasm/`.
