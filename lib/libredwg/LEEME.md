# LibreDWG para navegador (leer DWG)

`@mlightcad/libredwg-web` 0.8.2 (https://github.com/mlightcad/libredwg-web), compilado de LibreDWG
(https://www.gnu.org/software/libredwg/). Licencia GPL-3.0 (texto en `COPYING`). Brian autorizó la dependencia
y la licencia el 2026-10-24.

Copiado tal cual del paquete npm: `dist/libredwg-web.js` (envoltura, importa `../wasm/libredwg-web.js`) y
`wasm/` (el lector compilado). Mini Civil lo carga solo al abrir un DWG (`dwgATexto` en index.html) y `sw.js` lo
guarda al instalar para que funcione sin internet. Para cambiar de versión: reemplazar los tres archivos y
cambiar `CACHE_LIB` en sw.js.

`pruebas/muestra_2018.dwg` viene de los datos de prueba de LibreDWG (`test/test-data/example_2018.dwg`, GPL-3.0).
