# Mini Civil

**App en vivo:** https://bresmojce-stack.github.io/minicivil/ (se instala desde el navegador: Chrome → ⋮ → *Instalar app*; iPhone: Safari → Compartir → *Agregar a inicio*).

Una app CAD con funciones 3D para volúmenes simples. Mini Civil 3D de obra: lo que de verdad se usa en campo, en PC, tablet, iPhone y Android. Hoy (versión 2) trae el
CAD de TopoVías con coordenadas reales (Norte y Este): puntos, líneas, polilíneas, figuras, círculos, arcos,
medidas, áreas, cotas, auto acotar, cuadro de coordenadas, tabla de puntos, ejes con abscisas y DXF para AutoCAD.
Organizado por **proyectos**, cada uno con sus dibujos, con copia en **Google Drive** (botón de la nube arriba: carpeta "Mini Civil" en tu Drive, para tenerlo en todos tus equipos). Se irá ampliando por etapas (puntos de la estación,
superficies, curvas de nivel, perfiles, secciones, volúmenes, 3D).

## Archivos

- `index.html`: toda la app en un solo archivo (React incluido, funciona sin internet).
- `manifest.json`, íconos: para instalarla en el celular, tablet o PC.
- `sw.js`: modo sin conexión. **Al publicar una versión nueva, cambiar `CACHE_VERSION`** (y `TV_VERSION` en index.html).
- `pruebas/`: revisión de sintaxis y pruebas en el navegador (ver `pruebas/LEEME.md`).

## Publicar

**GitHub Pages** (gratis): en el repositorio → *Settings → Pages → Source: Deploy from a branch* → rama `main`,
carpeta `/ (root)` → *Save*. Cada cambio subido a `main` se publica solo en 1–2 minutos. `.nojekyll` hace que
GitHub publique los archivos tal cual.

Los datos se guardan en cada equipo (IndexedDB y localStorage) con nombres propios de Mini Civil, aparte de los de
TopoVías aunque las dos estén en la misma dirección.
