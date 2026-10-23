# Pruebas de Mini Civil

    node pruebas/correr.js                       # TODAS, en PC, celular y tablet; dice cuáles fallaron (SOLO=superficies,nube para algunas)
    node pruebas/sinconexion.js                  # con servidor de verdad: caché propia, abre sin internet, no toca la caché de TopoVías

    node pruebas/sintaxis.js                     # sintaxis de cada <script> y versión igual en index.html y sw.js (también en GitHub)
    node pruebas/abrir.js                        # PC: abre, crea proyecto y dibujo, dibuja, DXF, temas Claro y Oscuro, recarga
    W=390 node pruebas/abrir.js                  # lo mismo en celular (y que no haya desplazamiento de lado)
    node pruebas/dibujo.js index.html <salida>   # recorrido completo del Dibujo copiado de TopoVías (W=390 celular)
    node pruebas/importar.js                     # importar puntos: 17 casos de archivos, recorrido, filtros, deshacer y DXF (W=390 celular)
    node pruebas/superficies.js                  # superficies, secciones y volúmenes con planos de resultado conocido + pantalla (W=390 celular)
    node pruebas/zoom.js                         # Dibujo: puntos y textos del mismo tamaño en pantalla durante el zoom
    node pruebas/supdibujo.js                    # Superficie en el Dibujo: quitar/devolver, voltear, unir; cotas de una polilínea y DXF 3D (W=390 celular)
    node pruebas/presentacion.js                 # Presentación: escala exacta, 5 rótulos dentro de la hoja, PDF y recorrido en pantalla (W=390 celular)
    node pruebas/nube.js                         # Google Drive simulado con dos equipos (subir, recibir, cambiar, borrar, aparte de TopoVías)

Usan Playwright con el Chromium de la máquina (`PLAYWRIGHT=/ruta/a/playwright` si está en otro lugar).
`dibujo.js` debe dar lo mismo que `pruebas/dibujo.js` de TopoVías, menos el alto del lienzo (aquí no hay pestañas
de la vía), el nombre del DXF y el paso de "vía bloqueada", que en Mini Civil no existe.
