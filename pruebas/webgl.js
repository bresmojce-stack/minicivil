// v50: un dibujo de más de 20 000 trazos pinta sus líneas y rellenos con WebGL (motorGL). Se pinta el mismo dibujo con WebGL y
// con el canvas de siempre (window.MC_SIN_GL) y se compara qué píxeles quedan pintados. WebGL por software (SwiftShader).
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
  const imagen = async sinGL => {
    await p.evaluate(o => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 1, objs: o }] }]));
      localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, objs);
    await p.reload(); await p.waitForSelector('.tv-dib-svg'); if (sinGL) await p.evaluate(() => { window.MC_SIN_GL = true; });
    await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(300);
    const bx = await (await p.$('.tv-dib-svg')).boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    for (let i = 0; i < 7; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(50); }   // de cerca: se ven las formas
    await p.evaluate(async () => { const t0 = performance.now(); while (performance.now() - t0 < 60000) { const g = window.MC_DIB && MC_DIB.gl; if (!g || g.listo) break; await new Promise(r => setTimeout(r, 200)); } });
    await p.waitForTimeout(1500);
    const info = await p.evaluate(() => ({ gl: MC_DIB.gl }));
    const px = await p.evaluate(() => { const c = document.querySelector('.tv-dib-fondo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, o = new Uint8Array(d.length / 4);
      for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + 3] > 100 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 600 ? 1 : 0; return Array.from(o); });
    return { info, px };
  };
  const conGL = await imagen(false), sinGL = await imagen(true);
  ok(conGL.info.gl && conGL.info.gl.listo && conGL.info.gl.tramos > 100000, 'el dibujo grande usa la tarjeta gráfica (' + JSON.stringify(conGL.info.gl) + ')');
  ok(!sinGL.info.gl, 'con MC_SIN_GL se pinta con el canvas de siempre');
  let a = 0, ambos = 0; for (let i = 0; i < sinGL.px.length; i++) { if (sinGL.px[i]) { a++; if (conGL.px[i]) ambos++; } }
  const n = conGL.px.reduce((s, v) => s + v, 0);
  ok(a > 1000 && ambos / a > 0.9, 'lo que pinta el canvas lo pinta también WebGL (' + Math.round(ambos / a * 100) + ' % de ' + a + ' píxeles)');
  ok(n < a * 1.6 && a < sinGL.px.length * 0.6, 'WebGL no pinta de más (' + n + ' contra ' + a + ' píxeles de ' + sinGL.px.length + ')');
  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.'); process.exit(fallas ? 1 : 0);
})();
