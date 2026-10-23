// Modo sin conexión: con un servidor de verdad, la app se instala en caché (minicivil-vN), abre sin internet con
// sus datos y no toca cachés de otras apps de la misma dirección (TopoVías).
//   node pruebas/sinconexion.js [carpeta del repositorio]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), http = require('http'), fs = require('fs');
(async () => {
  const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/minicivil\//, '/'); if (f === '/') f = '/index.html';
    const ruta = path.join(raiz, f); if (!ruta.startsWith(raiz) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': tipos[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(r); });
  await new Promise(ok => srv.listen(0, ok));
  const url = 'http://localhost:' + srv.address().port + '/minicivil/';
  const b = await chromium.launch(), ctx = await b.newContext(), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto(url); await p.waitForSelector('header.tv-header');
  await p.evaluate(() => caches.open('topovias-v93').then(c => c.put('/topovias/x', new Response('de TopoVías'))));
  await p.waitForFunction(async () => (await caches.keys()).some(k => k.startsWith('minicivil-')), null, { timeout: 30000 });
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(() => {});
  const v = await p.evaluate(() => TV_VERSION);
  const llaves = await p.evaluate(() => caches.keys());
  ok(llaves.includes('minicivil-v' + v) && llaves.includes('topovias-v93'), 'caché propia minicivil-v' + v + ' y la de TopoVías intacta: ' + llaves.join(', '));
  await p.fill('form input', 'Sin señal'); await p.click('form button[type=submit]'); await p.waitForTimeout(600);
  await p.evaluate(() => vaciarGuardado());
  await ctx.setOffline(true);
  await p.reload(); await p.waitForSelector('.tv-main', { timeout: 15000 }); await p.waitForTimeout(500);   // dentro de un proyecto ya no hay barra de arriba (v22)
  ok((await p.textContent('body')).includes('Sin señal'), 'sin internet la app abre con sus datos');
  ok(await p.evaluate(() => typeof Delaunator === 'function' && typeof THREE === 'object' && !!window.jspdf && typeof Constrainautor === 'function'), 'sin internet están las cuatro librerías (triangulación, quiebres, 3D y PDF)');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (sin conexión).');
  process.exit(fallas ? 1 : 0);
})();
