// v50: un dibujo de más de 20 000 trazos pinta sus líneas y rellenos con WebGL (motorGL). Se pinta el mismo dibujo con WebGL y
// con el canvas de siempre (window.MC_SIN_GL) y se compara qué píxeles quedan pintados. WebGL por software (SwiftShader).
// v52: también con el zoom al máximo y a 60 km del origen de los tramos (antes de cerca se pasaba al canvas): la línea debe
// caer en el mismo sitio que en el canvas.
//   node pruebas/webgl.js [index.html]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
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
    const info = await p.evaluate(m => ({ gl: MC_DIB.gl, a: m && MC_DIB.aP({ x: 1e6, y: 2e6 }), b: m && MC_DIB.aP({ x: 1e6 + 4, y: 2e6 + 3 }), w: document.querySelector('.tv-dib-fondo').width,
      dpr: document.querySelector('.tv-dib-fondo').width / document.querySelector('.tv-dib-fondo').clientWidth }), mira);
    const px = await p.evaluate(() => { const c = document.querySelector('.tv-dib-fondo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, o = new Uint8Array(d.length / 4);
      for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + 3] > 100 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 600 ? 1 : 0; return Array.from(o); });
    return { info, px };
  };
  const comparar = (conGL, sinGL, min) => { let a = 0, ambos = 0; for (let i = 0; i < sinGL.px.length; i++) { if (sinGL.px[i]) { a++; if (conGL.px[i]) ambos++; } }
    return { a, ambos, n: conGL.px.reduce((s, v) => s + v, 0), bien: a > min && ambos / a > 0.9, pct: a ? Math.round(ambos / a * 100) : 0 }; };

  const conGL = await imagen(objs, false, null, 7, -120), sinGL = await imagen(objs, true, null, 7, -120);
  ok(conGL.info.gl && conGL.info.gl.listo && conGL.info.gl.tramos > 100000, 'el dibujo grande usa la tarjeta gráfica (' + JSON.stringify(conGL.info.gl) + ')');
  ok(!sinGL.info.gl, 'con MC_SIN_GL se pinta con el canvas de siempre');
  const c1 = comparar(conGL, sinGL, 1000);
  ok(c1.bien, 'lo que pinta el canvas lo pinta también WebGL (' + c1.pct + ' % de ' + c1.a + ' píxeles)');
  ok(c1.n < c1.a * 1.6 && c1.a < sinGL.px.length * 0.6, 'WebGL no pinta de más (' + c1.n + ' contra ' + c1.a + ' píxeles de ' + sinGL.px.length + ')');

  // con el zoom casi al máximo (unos 10 000 px por metro) y el origen de los tramos a 60 km: en 32 bits la línea se correría
  // decenas de píxeles; con alto + resto cae a menos de 3 px de donde dicen los datos
  const lejos = [{ id: 'lejos', t: 'l', a: { x: 1e6 - 60000, y: 2e6 - 60000 }, b: { x: 1e6 - 59999, y: 2e6 - 60000 }, col: '#DC2626' }].concat(objs);
  const mira = { x: 1e6 + 2.0003, y: 2e6 + 1.5002 };   // a la mitad de la primera línea roja
  const cerca = await imagen(lejos, false, mira, 9, -1000), g = cerca.info;
  ok(g.gl && g.gl.listo, 'de cerca sigue pintando la tarjeta gráfica (' + JSON.stringify(g.gl) + ')');
  // cada píxel pintado, a qué distancia (en px de pantalla) queda de la línea calculada con los datos de 64 bits
  const ux = g.b.X - g.a.X, uy = g.b.Y - g.a.Y, L = Math.hypot(ux, uy); let n = 0, junto = 0;
  cerca.px.forEach((v, i) => { if (!v) return; n++; const X = (i % g.w) / g.dpr, Y = Math.floor(i / g.w) / g.dpr;
    if (Math.abs((X - g.a.X) * uy - (Y - g.a.Y) * ux) / L < 3) junto++; });
  ok(L > 20000 && n > 300 && junto / n > 0.9, 'de cerca (' + Math.round(L / 5) + ' px por metro) la línea cae donde debe (' + Math.round(junto / Math.max(n, 1) * 100) + ' % de ' + n + ' píxeles a menos de 3 px)');
  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.'); process.exit(fallas ? 1 : 0);
})();
