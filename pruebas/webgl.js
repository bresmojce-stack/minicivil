// v50: un dibujo de más de 20 000 trazos pinta sus líneas y rellenos con WebGL (motorGL). Se pinta el mismo dibujo con WebGL y
// con el canvas de siempre (window.MC_SIN_GL) y se compara qué píxeles quedan pintados. WebGL por software (SwiftShader).
// v52: también con el zoom al máximo y a 60 km del origen de los tramos (antes de cerca se pasaba al canvas): la línea debe
// caer en el mismo sitio que en el canvas.
// v53: con WEBGPU=1 lo mismo con WebGPU (por software, SwiftShader): la página se sirve por http, porque WebGPU solo existe ahí.
//   node pruebas/webgl.js [index.html]      WEBGPU=1 node pruebas/webgl.js [index.html]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const WGPU = !!process.env.WEBGPU, MOTOR = WGPU ? 'webgpu' : 'webgl';
(async () => {
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'].concat(WGPU ? ['--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader'] : []) });
  let url = 'file://' + archivo, srv = null;
  if (WGPU) { srv = http.createServer((q, r) => { const f = path.join(path.dirname(archivo), decodeURIComponent(q.url.split('?')[0]) === '/' ? path.basename(archivo) : decodeURIComponent(q.url.split('?')[0]));
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': /\.html$/.test(f) ? 'text/html; charset=utf-8' : /\.js$/.test(f) ? 'text/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
    await new Promise(o => srv.listen(0, o)); url = 'http://localhost:' + srv.address().port + '/'; }
  const p = await (await b.newContext({ viewport: { width: 900, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  // lo que va mostrando el Dibujo mientras prepara el plano (v52: aparece por partes)
  await p.addInitScript(() => { window.__vistos = []; setInterval(() => { const g = window.MC_DIB && MC_DIB.gl; if (g) window.__vistos.push(g.listo ? -1 : g.tramos); }, 5); });
  await p.goto(url); await p.waitForSelector('header.tv-header');
  // 25 000 objetos lejos del 0,0 (como un plano en coordenadas de verdad): líneas, polilíneas con curva, círculos, arcos
  // discontinuos, figuras rellenas y rayadas
  const objs = await p.evaluate(() => { const o = []; for (let i = 0; i < 25000; i++) { const x = 1e6 + (i % 160) * 6, y = 2e6 + Math.floor(i / 160) * 6, t = i % 6;
    if (t === 0) o.push({ id: 'o' + i, t: 'l', a: { x, y }, b: { x: x + 4, y: y + 3 }, col: '#DC2626' });
    else if (t === 1) o.push({ id: 'o' + i, t: 'pl', v: [{ x, y }, { x: x + 4, y }, { x: x + 4, y: y + 4, b: 0.4 }], col: '#2563EB' });
    else if (t === 2) o.push({ id: 'o' + i, t: 'ci', c: { x: x + 2, y: y + 2 }, r: 1.5, col: '#16A34A' });
    else if (t === 3) o.push({ id: 'o' + i, t: 'ar', c: { x: x + 2, y: y + 2 }, r: 2, a1: 0.3, a2: 2.5, tipo: 'disc' });
    else if (t === 4) o.push({ id: 'o' + i, t: 'pl', v: [{ x, y }, { x: x + 5, y }, { x: x + 5, y: y + 5 }, { x, y: y + 5 }], c: true, som: 'relleno', col: '#CA8A04' });
    else o.push({ id: 'o' + i, t: 'pl', v: [{ x, y }, { x: x + 5, y }, { x: x + 2, y: y + 5 }], c: true, som: 'rayado', col: '#7C3AED' }); } return o; });
  // `mira`: punto del terreno que queda bajo el ratón al acercar; `rueda`: cuánto se gira (cada vez)
  const imagen = async (lista, sinGL, mira, veces, rueda) => {
    await p.evaluate(o => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 1, objs: o }] }]));
      localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, lista);
    await p.reload(); await p.waitForSelector('.tv-dib-svg'); if (sinGL) await p.evaluate(() => { window.MC_SIN_GL = true; });
    await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(300);
    const bx = await (await p.$('.tv-dib-fondo')).boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    for (let i = 0; i < veces; i++) {   // con `mira`, se apunta de nuevo cada vez (el punto bajo el ratón se corre un poco al acercar)
      if (mira) { const s = await p.evaluate(q => MC_DIB.aP(q), mira); await p.mouse.move(bx.x + s.X, bx.y + s.Y); }
      await p.mouse.wheel(0, rueda); await p.waitForTimeout(50); }
    await p.evaluate(async () => { const t0 = performance.now(); while (performance.now() - t0 < 60000) { const g = window.MC_DIB && MC_DIB.gl; if (!g || g.listo) break; await new Promise(r => setTimeout(r, 200)); } });
    await p.waitForTimeout(1500);
    const info = await p.evaluate(m => ({ gl: MC_DIB.gl, parcial: window.__vistos.some(n => n > 0), a: m && MC_DIB.aP({ x: 1e6, y: 2e6 }), b: m && MC_DIB.aP({ x: 1e6 + 4, y: 2e6 + 3 }), w: document.querySelector('.tv-dib-fondo').width,
      dpr: document.querySelector('.tv-dib-fondo').width / document.querySelector('.tv-dib-fondo').clientWidth }), mira);
    const px = await p.evaluate(() => { const c = document.querySelector('.tv-dib-fondo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, o = new Uint8Array(d.length / 4);
      for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + 3] > 100 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 600 ? 1 : 0; return Array.from(o); });
    return { info, px };
  };
  const comparar = (conGL, sinGL, min) => { let a = 0, ambos = 0; for (let i = 0; i < sinGL.px.length; i++) { if (sinGL.px[i]) { a++; if (conGL.px[i]) ambos++; } }
    return { a, ambos, n: conGL.px.reduce((s, v) => s + v, 0), bien: a > min && ambos / a > 0.9, pct: a ? Math.round(ambos / a * 100) : 0 }; };

  const conGL = await imagen(objs, false, null, 7, -120), sinGL = await imagen(objs, true, null, 7, -120);
  ok(conGL.info.gl && conGL.info.gl.motor === MOTOR && conGL.info.gl.listo && conGL.info.gl.tramos > 100000, 'el dibujo grande usa la tarjeta gráfica con ' + MOTOR + ' (' + JSON.stringify(conGL.info.gl) + ')');
  ok(conGL.info.parcial, 'el plano va apareciendo mientras se prepara (antes de estar listo ya se ven tramos)');
  ok(!sinGL.info.gl, 'con MC_SIN_GL se pinta con el canvas de siempre');
  const c1 = comparar(conGL, sinGL, 1000);
  ok(c1.bien, 'lo que pinta el canvas lo pinta también WebGL (' + c1.pct + ' % de ' + c1.a + ' píxeles)');
  ok(c1.n < c1.a * 1.6 && c1.a < sinGL.px.length * 0.6, 'WebGL no pinta de más (' + c1.n + ' contra ' + c1.a + ' píxeles de ' + sinGL.px.length + ')');

  // con el zoom casi al máximo (unos 10 000 px por metro) y el origen de los tramos a 60 km: en 32 bits la línea se correría
  // decenas de píxeles; con alto + resto cae a menos de 3 px de donde dicen los datos
  const lejos = [{ id: 'lejos', t: 'l', a: { x: 1e6 - 60000, y: 2e6 - 60000 }, b: { x: 1e6 - 59999, y: 2e6 - 60000 }, col: '#DC2626' }].concat(objs);
  const mira = { x: 1e6 + 2.0003, y: 2e6 + 1.5002 };   // a la mitad de la primera línea roja
  const cerca = await imagen(lejos, false, mira, 9, -1000), g = cerca.info;
  ok(g.gl && g.gl.motor === MOTOR && g.gl.listo, 'de cerca sigue pintando la tarjeta gráfica (' + JSON.stringify(g.gl) + ')');
  // cada píxel pintado, a qué distancia (en px de pantalla) queda de la línea calculada con los datos de 64 bits
  const ux = g.b.X - g.a.X, uy = g.b.Y - g.a.Y, L = Math.hypot(ux, uy); let n = 0, junto = 0;
  cerca.px.forEach((v, i) => { if (!v) return; n++; const X = (i % g.w) / g.dpr, Y = Math.floor(i / g.w) / g.dpr;
    if (Math.abs((X - g.a.X) * uy - (Y - g.a.Y) * ux) / L < 3) junto++; });
  ok(L > 20000 && n > 300 && junto / n > 0.9, 'de cerca (' + Math.round(L / 5) + ' px por metro) la línea cae donde debe (' + Math.round(junto / Math.max(n, 1) * 100) + ' % de ' + n + ' píxeles a menos de 3 px)');

  // v57: borrar en un plano grande no lo rearma entero: la línea se apaga en la tarjeta al momento, y Deshacer la trae de vuelta
  // (en un motor aparte), sin volver a preparar las 25 000
  { await imagen(objs, false, { x: 1e6 + 2, y: 2e6 + 1.5 }, 14, -120);
    const bx = await (await p.$('.tv-dib-fondo')).boundingBox();
    const rojo = () => p.evaluate(() => { const c = document.querySelector('.tv-dib-fondo'), f = c.width / c.clientWidth, s = MC_DIB.aP({ x: 1e6 + 2, y: 2e6 + 1.5 });
      const d = c.getContext('2d').getImageData(Math.round(s.X * f) - 2, Math.round(s.Y * f) - 2, 5, 5).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100 && d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 110) n++; return n; });
    const antes = await p.evaluate(() => MC_DIB.gl), r0 = await rojo();
    await p.click('.tv-dib-nav button[data-grupo=editar]'); await p.click('.tv-dib-hoja button[data-herr=borrar]'); await p.waitForTimeout(150);
    const s = await p.evaluate(() => MC_DIB.aP({ x: 1e6 + 2, y: 2e6 + 1.5 })); const t0 = Date.now();
    await p.mouse.click(bx.x + s.X, bx.y + s.Y);
    await p.waitForFunction(() => MC_DIB.gl && MC_DIB.gl.ocultos === 1, null, { timeout: 10000 }).catch(() => {});
    const ms = Date.now() - t0, tras = await p.evaluate(() => MC_DIB.gl), r1 = await rojo();
    ok(r0 > 3 && r1 === 0 && tras.ocultos === 1 && tras.ms === antes.ms && tras.listo, 'borrar una línea de un plano grande la quita al momento sin rearmarlo (' + ms + ' ms; rojo ' + r0 + ' → ' + r1 + '; ' + JSON.stringify({ ocultos: tras.ocultos, ms: tras.ms }) + ')');
    await p.keyboard.press('Control+z');
    await p.waitForFunction(() => MC_DIB.gl && MC_DIB.gl.aparte === 1, null, { timeout: 10000 }).catch(() => {});
    const vuelta = await p.evaluate(() => MC_DIB.gl), r2 = await rojo();
    ok(r2 > 3 && vuelta.aparte === 1 && vuelta.ms === antes.ms, 'Deshacer la trae de vuelta, también sin rearmar (rojo ' + r2 + '; ' + JSON.stringify({ aparte: vuelta.aparte, ms: vuelta.ms }) + ')'); }

  // v52: textos con tamaño (giros y alineaciones) y puntos con nombre, también en la tarjeta: comparados con el canvas
  const tp = await p.evaluate(() => { const o = [], AL = ['lb', 'cm', 'rt', 'ld', 'cb']; for (let i = 0; i < 24000; i++) { const x = 5e5 + (i % 150) * 8, y = 1e6 + Math.floor(i / 150) * 8;
    if (i % 2) o.push({ id: 't' + i, t: 'tx', p: { x, y }, s: 'K' + (i % 97) + 'é', h: 1.6, rot: (i % 4) * 0.5, al: AL[i % 5], col: i % 3 ? '#0F172A' : '#2563EB' });
    else o.push({ id: 'p' + i, t: 'p', x: x + 3, y: y + 3, nom: String(i), col: '#DC2626' }); } return o; });
  const tGL = await imagen(tp, false, null, 6, -120), tCv = await imagen(tp, true, null, 6, -120);
  ok(tGL.info.gl && tGL.info.gl.motor === MOTOR && tGL.info.gl.listo && tGL.info.gl.puntos === 12000 && tGL.info.gl.letras > 30000, 'puntos y letras en la tarjeta (' + JSON.stringify(tGL.info.gl) + ')');
  const c3 = comparar(tGL, tCv, 1000);
  ok(c3.a > 1000 && c3.ambos / c3.a > 0.8 && c3.n < c3.a * 1.4, 'textos y puntos caen donde los pinta el canvas (' + c3.pct + ' % de ' + c3.a + ' píxeles; WebGL ' + c3.n + ')');

  // v54: una superficie grande (70 × 70 puntos, ~9 500 triángulos) en Superficies → Editar: los triángulos van en la tarjeta
  // (no en el svg) y cada lado cae donde debe: a la mitad de un lado hay color de la superficie, en el centro de un triángulo no
  const sp = []; for (let i = 0; i < 70; i++) for (let j = 0; j < 70; j++) sp.push({ id: 1000 + i * 70 + j, t: 'p', x: 1e6 + i * 10, y: 9e5 + j * 10, z: 100 + i * 0.1 + j * 0.05, d: 'TN' });
  await p.evaluate(o => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify([{ id: 1, nombre: 'S', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 9999, objs: o }],
    superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '' }] }]));
    localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'superficies' }));
    localStorage.setItem('minicivil_supvista', JSON.stringify('editar')); }, sp);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(800);
  { const bx = await (await p.$('.tv-dib-fondo')).boundingBox(), c = await p.evaluate(() => MC_DIB.aP({ x: 1e6 + 345, y: 9e5 + 345 }));
    await p.mouse.move(bx.x + c.X, bx.y + c.Y); for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(60); } await p.waitForTimeout(800); }
  const sup = await p.evaluate(() => { const c = document.querySelector('.tv-dib-fondo'), x = c.getContext('2d'), f = c.width / c.clientWidth;
    const verde = q => { const s = MC_DIB.aP(q); let n = 0; const d = x.getImageData(Math.round(s.X * f) - 2, Math.round(s.Y * f) - 2, 5, 5).data;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 60 && d[i + 1] > d[i] + 30 && d[i + 1] > d[i + 2] + 20) n++; return n; };
    let lado = 0, centro = 0; for (let i = 30; i < 40; i++) { lado += verde({ x: 1e6 + i * 10 + 5, y: 9e5 + 340 }) > 0 ? 1 : 0; centro += verde({ x: 1e6 + i * 10 + 5, y: 9e5 + 342.5 }) > 0 ? 1 : 0; }
    const a = MC_DIB.aP({ x: 1e6, y: 9e5 }), b = MC_DIB.aP({ x: 1e6 + 10, y: 9e5 });
    return { svg: !!document.querySelector('.mc-sup-tri'), lado, centro, pxm: Math.round((b.X - a.X) * 10) / 100 }; });
  if (process.env.VER) { const bx = await (await p.$('.tv-dib-fondo')).boundingBox(); await p.screenshot({ clip: bx, path: process.env.VER }); }
  ok(!sup.svg && sup.lado >= 9 && sup.centro <= 1, 'superficie grande: los triángulos van en la tarjeta y caen en su sitio (' + JSON.stringify(sup) + ')');
  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); if (srv) srv.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.'); process.exit(fallas ? 1 : 0);
})();
