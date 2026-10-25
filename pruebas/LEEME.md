# Pruebas de Mini Civil

    node pruebas/correr.js                       # TODAS, en PC, celular y tablet; dice cuáles fallaron (SOLO=superficies,nube para algunas)
    node pruebas/sinconexion.js                  # con servidor de verdad: caché propia, abre sin internet, no toca la caché de TopoVías

    node pruebas/sintaxis.js                     # sintaxis de cada <script> y versión igual en index.html y sw.js (también en GitHub)
    node pruebas/abrir.js                        # PC: abre, crea proyecto y dibujo, dibuja, DXF, temas Claro y Oscuro, recarga
    W=390 node pruebas/abrir.js                  # lo mismo en celular (y que no haya desplazamiento de lado)
    node pruebas/dibujo.js index.html <salida>   # recorrido completo del Dibujo copiado de TopoVías (W=390 celular)
    node pruebas/importar.js                     # importar puntos: 17 casos de archivos, recorrido, filtros, deshacer y DXF (W=390 celular)
    node pruebas/superficies.js                  # superficies, secciones y volúmenes con planos de resultado conocido + pantalla (W=390 celular)
    node pruebas/zoom.js                         # Dibujo: mover y acercar sin restos (se repinta en cada cuadro, sin transform; puntos
                                                 # del mismo tamaño medidos en la imagen; solo se pinta lo que cabe; nubes de puntos
                                                 # en un trazo; pellizco con un dedo fuera del lienzo; Regenerar imagen)
    node pruebas/dedo.js                         # Dibujo con el dedo: arrastrar mueve la vista, toque corto pone el punto,
                                                 # dedo quieto abre la lupa (W=390 para el celular)
    node pruebas/supdibujo.js                    # Superficie en el Dibujo: quitar/devolver, voltear, unir; cotas de una polilínea y DXF 3D (W=390 celular)
    node pruebas/dibujo3d.js                     # 3D dentro del Dibujo: botón 2D|3D, muros, tocar y quitar un triángulo, verlo en 2D (W=390 celular)
    node pruebas/presentacion.js                 # Presentación: escala exacta, 5 rótulos dentro de la hoja, PDF y recorrido en pantalla (W=390 celular)
    node pruebas/nube.js                         # Google Drive simulado con dos equipos (subir, recibir, cambiar, borrar, aparte de TopoVías)
    node pruebas/trozos.js                       # v50: un dibujo grande se guarda por pedazos y se arma igual; la copia automática sin temporales
    node pruebas/webgl.js                        # v50: dibujo de 25 000 objetos con WebGL (por software) = el mismo con el canvas

Usan Playwright con el Chromium de la máquina (`PLAYWRIGHT=/ruta/a/playwright` si está en otro lugar).
`dibujo.js` debe dar lo mismo que `pruebas/dibujo.js` de TopoVías, menos el alto del lienzo (aquí no hay pestañas
de la vía), el nombre del DXF y el paso de "vía bloqueada", que en Mini Civil no existe.
