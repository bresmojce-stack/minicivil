// v70: lo preparado para la tarjeta gráfica se guarda por pedazos y al abrir se lee hecho. Lo que importa: que salga EXACTAMENTE lo
// mismo que preparando todo de una vez (misma huella de todos los números), también después de cambiar un objeto, y que lo
// preparado de un pedazo que ya no existe se borre. Y que al abrir se vea la vista previa.
//   node pruebas/v70.js [carpeta del repositorio]
const { chromium } = require(process.env.PLAYWRIGHT || require('path').join(__dirname, 'pw.js'));
const path = require('path'), http = require('http'), fs = require('fs');
(async () => {
  const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
  const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/minicivil\//, '/'); if (f === '/') f = '/index.html';
    const ruta = path.join(raiz, f); if (!ruta.startsWith(raiz) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': tipos[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(r); });
  await new Promise(ok => srv.listen(0, ok)); const url = 'http://localhost:' + srv.address().port + '/minicivil/';
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const ctx = await b.newContext({ viewport: { width: 1000, height: 760 } });
  await ctx.addInitScript(() => { window.MC_GL_HUELLA = true; try { if (localStorage.getItem('mc_prueba_sin_cache')) window.MC_SIN_GLCACHE = true; } catch (_) {} });
  const errs = []; let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  let p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForSelector('header.tv-header');
  // un plano de 22 000 objetos de todas las clases que van a la tarjeta
  await p.evaluate(async () => {
    const objs = [], col = ['#DC2626', '#16A34A', '#0284C7', undefined]; let id = 1;
    for (let i = 0; i < 22000; i++) { const x = 1000000 + (i % 200) * 7, y = 900000 + Math.floor(i / 200) * 7, c = col[i % 4], k = i % 11;
      if (k === 0) objs.push({ id: id++, t: 'pl', c: true, col: c, v: [{ x, y }, { x: x + 4, y }, { x: x + 4, y: y + 3, b: 0.4 }, { x, y: y + 3 }] });
      else if (k === 1) objs.push({ id: id++, t: 'ci', c: { x: x + 2, y: y + 2 }, r: 1.5, col: c });
      else if (k === 2) objs.push({ id: id++, t: 'p', x, y, z: 1500 + i / 1000, nom: String(i), d: 'TN' });
      else if (k === 3) objs.push({ id: id++, t: 'tx', p: { x, y }, s: 'T' + (i % 97), h: 1.2, col: c });
      else if (k === 4) objs.push({ id: id++, t: 'pl', tipo: 'disc', col: c, v: [{ x, y }, { x: x + 2, y: y + 1 }, { x: x + 5, y }, { x: x + 6, y: y + 4 }, { x: x + 1, y: y + 5 }] });
      else objs.push({ id: id++, t: 'l', a: { x, y }, b: { x: x + 5, y: y + 4 }, col: c });
    }
    await guardarProyectosIdb(TV_KEY, [{ id: 71, nombre: 'Grande', creado: 1, dibujos: [{ id: 72, nombre: 'Plano', sig: 1, objs }] }]);
    await TVDB.set(TV_KEY + '__t', Date.now() + 1e6); try { localStorage.removeItem(TV_KEY); } catch (_) {}
  });
  const abrir = async sinCache => { await p.close(); p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForSelector('.mc-proyecto'); await p.evaluate(s => { if (s) localStorage.setItem('mc_prueba_sin_cache', '1'); else localStorage.removeItem('mc_prueba_sin_cache'); }, sinCache);
    await p.reload(); await p.waitForSelector('.mc-proyecto');
    await p.evaluate(() => { window.VIO_PREVIA = false; new MutationObserver(() => { const c = document.querySelector('.mc-previa'); if (c && c.style.opacity === '1') window.VIO_PREVIA = true; }).observe(document.body, { subtree: true, childList: true, attributes: true }); });
    await p.evaluate(() => document.querySelector('.mc-proyecto').click());
    await p.waitForFunction(() => window.MC_DIB && MC_DIB.gl && MC_DIB.gl.listo, null, { timeout: 120000, polling: 100 });
    if (0) console.log('   ', await p.evaluate(() => { const o = HIST.actual.proyectos[0].dibujos[0].objs, v = TROZOS.porPrimero.get(o[0]); return JSON.stringify({ n: o.length, pz: !!pedazosDe(o), v: !!v, largo: v && v.parte.length, dif: v ? v.parte.findIndex((x, j) => x !== o[j]) : null, mapa: TROZOS.porPrimero.size }); }));
    const r = await p.evaluate(() => ({ huella: MC_DIB.gl.huella, cache: MC_DIB.gl.cache, tramos: MC_DIB.gl.tramos, previa: window.VIO_PREVIA }));
    await p.waitForTimeout(2500); return r; };   // la espera: para que lo recién preparado alcance a guardarse
  const claves = () => p.evaluate(async () => { const k = (await TVDB.claves()).filter(c => typeof c === 'string'); const tz = new Set(k.filter(c => c.includes('__trozo') && !c.startsWith(TV_KEY + '_gl:'))); return { sueltos: k.filter(c => c.startsWith(TV_KEY + '_gl:') && !tz.has(c.slice(TV_KEY.length + 4))).length, gl: k.filter(c => c.startsWith(TV_KEY + '_gl:')).length, trozos: tz.size, glv: k.filter(c => c.startsWith(TV_KEY + '_glv:')).length }; });

  const m = await abrir(true);
  ok(m.huella && m.cache == null && m.tramos > 100000, 'preparando todo de una vez (como antes): ' + m.tramos + ' tramos, huella ' + m.huella);
  const a = await abrir(false);
  ok(a.cache === '0 de 5' && a.huella === m.huella, 'primera vez por pedazos: nada guardado todavía (' + a.cache + ') y sale lo mismo (' + a.huella + ')');
  const k1 = await claves();
  ok(k1.gl === 5 && k1.sueltos === 0 && k1.glv === 1, 'lo preparado de los 5 pedazos quedó guardado, con la ficha de la vista (' + JSON.stringify(k1) + ')');
  const c = await abrir(false);
  ok(c.cache === '5 de 5' && c.huella === m.huella, 'segunda vez: los 5 pedazos se leen hechos (' + c.cache + ') y sale lo mismo');
  ok(c.previa === true, 'al abrir se vio la vista previa mientras se cargaban los objetos');
  // cambia un objeto del tercer pedazo: solo ese se prepara de nuevo, y lo preparado del pedazo viejo se borra
  await p.evaluate(async () => { const pr = HIST.actual.proyectos[0], d = pr.dibujos[0], objs = d.objs.slice(); objs[12345] = { ...objs[12345], col: '#EA580C' }; objs.splice(12400, 1);
    await guardarProyectosIdb(TV_KEY, [{ ...pr, dibujos: [{ ...d, objs }] }]); await TVDB.set(TV_KEY + '__t', Date.now() + 2e6); });
  const e = await abrir(false);
  ok(/^[1-4] de 5$/.test(e.cache) && e.huella !== m.huella, 'después de cambiar un objeto, se leen hechos los pedazos que no cambiaron (' + e.cache + ')');
  const e2 = await abrir(true);
  ok(e2.huella === e.huella, 'y sale lo mismo que preparando todo de una vez con el plano cambiado (' + e.huella + ')');
  const k2 = await claves();
  ok(k2.gl === 5 && k2.sueltos === 0, 'lo preparado de los pedazos que ya no existen se borró (' + JSON.stringify(k2) + ')');
  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); srv.close();
  console.log(fallas ? fallas + ' FALLA(S)' : 'Todo bien'); process.exit(fallas ? 1 : 0);
})();
