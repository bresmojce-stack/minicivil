// v43: "Abrir archivo" desde el inicio (DWG, DXF y puntos), sin guardar hasta decidir, y el DWG también sin internet.
// Necesita un servidor de verdad (el lector de DWG se carga como módulo, y eso no funciona desde file://).
// El DWG es el de ejemplo de LibreDWG (pruebas/muestra_2018.dwg, AutoCAD 2018).
//   node pruebas/abrirarchivo.js [carpeta del repositorio]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), http = require('http'), fs = require('fs'), os = require('os');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
  const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/minicivil\//, '/'); if (f === '/') f = '/index.html';
    const ruta = path.join(raiz, f); if (!ruta.startsWith(raiz) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': tipos[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(r); });
  await new Promise(ok => srv.listen(0, ok));
  const url = 'http://localhost:' + srv.address().port + '/minicivil/';
  // archivos de prueba: el DWG de ejemplo, un DXF y unos puntos
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-abrir-'));
  const dxf = path.join(tmp, 'Lote prueba.dxf'), csv = path.join(tmp, 'Puntos obra.csv');
  fs.writeFileSync(dxf, ['0', 'SECTION', '2', 'ENTITIES', '0', 'LINE', '8', '0', '10', '1000', '20', '2000', '11', '1010', '21', '2000', '0', 'CIRCLE', '8', '0', '10', '1005', '20', '2005', '40', '2', '0', 'ENDSEC', '0', 'EOF'].join('\n'));
  fs.writeFileSync(csv, '1,1000,2000,100.5,BM\n2,1010,2000,101.2,TN\n3,1010,2010,102.0,TN\n');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto(url); await p.waitForSelector('header.tv-header');
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForSelector('header.tv-header');
  const datos = () => p.evaluate(() => HIST.actual.proyectos);
  const abrir = async archivo => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.mc-abrir-archivo')]); await fc.setFiles(archivo); };

  // ── DWG ──
  ok(!!(await p.$('.mc-abrir-archivo')), 'en el inicio está el botón "Abrir archivo"');
  const t0 = Date.now();
  await abrir(path.join(raiz, 'pruebas', 'muestra_2018.dwg'));
  await p.waitForSelector('.mc-dxf-aqui', { timeout: 60000 });
  const panel = await p.textContent('.tv-dib-dxf');
  ok(/muestra_2018/.test(panel), 'el DWG se lee y sale la revisión de lo que trae (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s, con la librería por primera vez)');
  let d = await datos();
  ok(d.length === 1 && d[0].temporal === true && d[0].nombre === 'muestra_2018', 'queda como proyecto "sin guardar", con el nombre del archivo');
  ok(!!(await p.$('.mc-temporal')) && !(await p.$('.mc-pestanas')), 'arriba la franja "Sin guardar" y, mientras tanto, solo el Dibujo (sin fila de pestañas)');
  await p.click('.mc-dxf-aqui'); await p.waitForTimeout(600);
  d = await datos();
  const objs = d[0].dibujos[0].objs, tipos2 = {}; objs.forEach(o => { tipos2[o.t] = (tipos2[o.t] || 0) + 1; });
  ok(objs.length > 50 && tipos2.l && tipos2.pl && tipos2.tx, 'se dibuja: ' + objs.length + ' objetos ' + JSON.stringify(tipos2));
  ok(objs.some(o => o.t === 'tx' && o.h > 0), 'los textos llegan con su tamaño');
  // ── guardar como proyecto ──
  await p.click('.mc-guardar-proy'); await p.waitForTimeout(400);
  d = await datos();
  ok(d.length === 1 && !d[0].temporal && !(await p.$('.mc-temporal')) && (await p.$$('.mc-pestanas [data-pestana]')).length === 5,
    '"Guardar como proyecto" lo deja como un proyecto más, con todas sus pestañas');

  // ── DXF: se abre y se cierra sin guardar; Deshacer lo trae de vuelta ──
  await p.click('.mc-volver'); await p.waitForSelector('.mc-abrir-archivo');
  await abrir(dxf); await p.waitForSelector('.mc-dxf-aqui', { timeout: 20000 }); await p.click('.mc-dxf-aqui'); await p.waitForTimeout(400);
  d = await datos();
  ok(d.length === 2 && d[1].temporal && d[1].dibujos[0].objs.length === 2, 'un DXF también: 2 objetos en un proyecto sin guardar');
  await p.click('.mc-cerrar-archivo'); await p.waitForTimeout(400);
  d = await datos();
  ok(d.length === 1 && !!(await p.$('.mc-abrir-archivo')), '"Cerrar" lo quita y vuelve al inicio; el proyecto guardado sigue');
  await p.click('.tv-deshacer button'); await p.waitForTimeout(400);
  d = await datos();
  ok(d.length === 2 && d[1].temporal && (await p.textContent('body')).includes('sin guardar'), '↶ Deshacer lo trae de vuelta, todavía sin guardar');
  // ── puntos ──
  await abrir(csv); await p.waitForTimeout(800);
  ok(/Dibujar 3 puntos/.test(await p.textContent('body')), 'unos puntos (.csv) abren la revisión de Importar puntos: "Dibujar 3 puntos"');

  // ── sin internet: el lector de DWG quedó guardado ──
  await p.waitForFunction(async () => { const c = await caches.open('minicivil-libredwg-0.8.2'); return !!(await c.match('./lib/libredwg/wasm/libredwg-web.wasm')); }, null, { timeout: 60000 }).catch(() => {});
  const guardada = await p.evaluate(async () => { const c = await caches.open('minicivil-libredwg-0.8.2'); return (await c.keys()).length; });
  ok(guardada === 3, 'el lector de DWG quedó guardado en el equipo (' + guardada + ' de 3 archivos)');
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(() => {});
  await ctx.setOffline(true);
  await p.goto(url); await p.waitForSelector('.tv-main', { timeout: 20000 });
  if (await p.$('.mc-volver')) { await p.click('.mc-volver'); }
  await p.waitForSelector('.mc-abrir-archivo');
  await abrir(path.join(raiz, 'pruebas', 'muestra_2018.dwg'));
  const sin = await p.waitForSelector('.mc-dxf-aqui', { timeout: 60000 }).then(() => true).catch(() => false);
  ok(sin, 'sin internet también abre un DWG');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (abrir archivo ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
