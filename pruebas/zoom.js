// Dibujo: mover y acercar sin que queden restos de la imagen anterior (Brian, tablet: "va dejando la imagen residual").
//   node pruebas/zoom.js [index.html]
// El dibujo se vuelve a pintar de verdad en cada cuadro del gesto: nada de transform (ni atributo ni CSS), los puntos miden lo
// mismo en la imagen, los textos se siguen viendo mientras se mueve, solo se pinta lo que cabe en pantalla, las nubes de muchos
// puntos van juntas en un trazo, el pellizco con un dedo fuera del lienzo no dibuja y "Regenerar imagen" rehace el dibujo.
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const errs = [];
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  const objs = []; for (let i = 0; i < 25; i++) objs.push({ id: i + 1, t: 'p', x: 1000000 + (i % 5) * 10, y: 900000 + Math.floor(i / 5) * 10, nom: String(i + 1), z: 1500, d: 'TN' });
  objs.push({ id: 99, t: 'tx', p: { x: 1000020, y: 900020 }, s: 'LOTE' });
  const abrir = async (p, lista) => {
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
    await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
      [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 26, objs: lista }] }]);
    await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);
  };
  // nada movido ni escalado a mano: ni el atributo transform del grupo ni un transform de CSS en lo que hay dentro
  const sinTransform = p => p.evaluate(() => {
    const g = document.querySelector('.tv-dib-capa');
    if (g.getAttribute('transform') || getComputedStyle(g).transform !== 'none') return false;
    return [...g.querySelectorAll('.tv-fijo, .tv-pt')].every(e => getComputedStyle(e).transform === 'none' && !e.style.transform);
  });
  const escalaBarra = p => p.$eval('.tv-dib-escala div', e => e.textContent.trim());
  const textos = p => p.$$eval('.tv-dib-svg .tv-fijo text', t => t.length);

  // ── PC: rueda del mouse ──
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await abrir(p, objs);
  const bb = await (await p.$('.tv-dib-svg')).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const ruedas = n => p.evaluate(n => { const s = document.querySelector('.tv-dib-svg'), r = s.getBoundingClientRect(); for (let i = 0; i < n; i++) s.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); }, n);
  const grupos = () => p.$$eval('.tv-dib-svg .tv-fijo', gs => { const ps = gs.filter(g => g.querySelector('.tv-pt')); return [ps.length, ps.filter(g => g.querySelector('text')).length]; });
  const conTexto = async () => (await grupos())[1];
  const escala0 = await escalaBarra(p), conT0 = await conTexto();
  await ruedas(4); await p.waitForTimeout(60);   // sin soltar nada: ya debe estar pintado de nuevo
  const g1 = await grupos(), enGesto = { escala: await escalaBarra(p), puntos: g1[0], conTexto: g1[1], limpio: await sinTransform(p) };
  ok(enGesto.escala !== escala0, 'con la rueda el dibujo queda pintado de nuevo en el acto (' + escala0 + ' → ' + enGesto.escala + ')');
  ok(enGesto.limpio, 'nada queda movido ni escalado a mano: el navegador pinta todo el lienzo (sin restos)');
  ok(conT0 > 0 && enGesto.conTexto === enGesto.puntos, 'los puntos que quedan a la vista llevan su texto mientras acerca (' + enGesto.conTexto + ' de ' + enGesto.puntos + ')');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.tv-dib-svg')).overflow !== 'visible'), 'el lienzo recorta en sus bordes (nada se pinta por fuera)');
  // solo se pinta lo que cabe en pantalla, y al encuadrar aparece lo que estaba afuera
  const nombres = () => p.$$eval('.tv-dib-svg .tv-fijo text', t => t.map(x => x.textContent));
  await p.evaluate(() => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 4, nombre: 'Lejos', sig: 9, objs: [
    { id: 1, t: 'p', x: 1000000, y: 900000, nom: 'cerca' }, { id: 2, t: 'p', x: 1000010, y: 900000, nom: 'cerca2' },
    { id: 3, t: 'p', x: 1004000, y: 900000, nom: 'lejos' }] }] }]); }); await p.waitForTimeout(600);
  await p.click('.tv-dib-nav button[data-grupo=ver]'); await p.click('.tv-dib-hoja button[data-herr="@todo"]'); await p.waitForTimeout(500);
  const sitio = await p.evaluate(() => { const g = [...document.querySelectorAll('.tv-dib-svg .tv-fijo')].find(e => (e.querySelector('text') || {}).textContent === 'cerca');
    const c = g.querySelector('.tv-pt'), q = new DOMPoint(+c.getAttribute('x1'), +c.getAttribute('y1')).matrixTransform(c.getScreenCTM()); return { x: q.x, y: q.y }; });
  // acercar sobre "cerca" (la rueda acerca hacia donde está el puntero): el de 4 km queda afuera
  await p.mouse.move(sitio.x, sitio.y);
  await p.evaluate(q => { const s = document.querySelector('.tv-dib-svg'); for (let i = 0; i < 6; i++) s.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: q.x, clientY: q.y, bubbles: true, cancelable: true })); }, sitio);
  await p.waitForTimeout(400);
  const antesLejos = await nombres();
  ok(antesLejos.includes('cerca') && !antesLejos.includes('lejos'), 'lo que queda fuera de la pantalla no se pinta (' + antesLejos.join(', ') + ')');
  await p.click('.tv-dib-nav button[data-grupo=ver]'); await p.click('.tv-dib-hoja button[data-herr="@todo"]'); await p.waitForTimeout(500);
  ok((await nombres()).includes('lejos'), 'al encuadrar todo aparece lo que estaba afuera');
  // 300 puntos juntos: de lejos sin textos y al acercar aparecen donde caben
  let sem = 7; const rnd = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
  const loma = []; for (let i = 0; i < 300; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 60; loma.push({ id: i + 1, t: 'p', x: 1000060 + r * Math.cos(a), y: 1000060 + r * Math.sin(a), z: 1500, nom: String(i + 1), d: 'TN' }); }
  await p.evaluate(v => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 3, nombre: 'Loma', sig: 301, objs: v }] }]); }, loma); await p.waitForTimeout(500);
  const parte = async () => { const g = await grupos(); return { n: g[0], txt: g[1] }; };
  const lejos = await parte();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await ruedas(6); await p.waitForTimeout(400);
  const cerca = await parte();
  ok(lejos.txt / lejos.n < 0.25 && cerca.txt / cerca.n > 0.8, 'de lejos los puntos juntos van sin texto y al acercar lo llevan: ' +
    lejos.txt + '/' + lejos.n + ' → ' + cerca.txt + '/' + cerca.n + ' con texto');
  // 1200 puntos: los que no llevan texto se pintan juntos (un trazo por color) y al tocar uno se elige ese
  const nube = []; for (let i = 0; i < 1200; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 40; nube.push({ id: i + 1, t: 'p', x: 1000060 + r * Math.cos(a), y: 1000060 + r * Math.sin(a), z: 1500, nom: String(i + 1), col: '#0891B2' }); }
  await p.evaluate(v => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 5, nombre: 'Nube', sig: 1201, objs: v }] }]); }, nube); await p.waitForTimeout(600);
  await p.click('.tv-dib-nav button[data-grupo=ver]'); await p.click('.tv-dib-hoja button[data-herr="@todo"]'); await p.waitForTimeout(500);
  const pintado = await p.evaluate(() => ({ nubes: document.querySelectorAll('.tv-dib-capa path.tv-pt').length, sueltos: document.querySelectorAll('.tv-dib-capa .tv-fijo').length }));
  ok(pintado.nubes >= 1 && pintado.sueltos < 400, '1200 puntos: los que no llevan texto van juntos (' + pintado.nubes + ' trazo(s), ' + pintado.sueltos + ' sueltos)');
  await p.click('.tv-dib-nav button[data-grupo=editar]'); await p.click('.tv-dib-hoja button[data-herr="elegir"]'); await p.waitForTimeout(200);
  const uno = await p.evaluate(() => { const d = document.querySelector('.tv-dib-capa path.tv-pt').getAttribute('d'), m = d.match(/M([\d.]+) ([\d.]+)/), s = document.querySelector('.tv-dib-svg').getBoundingClientRect();
    return { x: s.left + +m[1], y: s.top + +m[2] }; });
  await p.mouse.click(uno.x, uno.y); await p.waitForTimeout(400);
  const panelSel = await p.$('.tv-dib-panel');
  ok(!!panelSel && /PUNTO/i.test(await panelSel.innerText()), 'un punto de la nube se puede tocar y elegir');
  await p.close();

  // ── tablet con los dedos ──
  const ctx = await b.newContext({ viewport: { width: 1000, height: 625 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const t = await ctx.newPage(); await abrir(t, objs);
  const cdp = await ctx.newCDPSession(t);
  const toque = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
  const caja = await (await t.$('.tv-dib-svg')).boundingBox(), cx = caja.x + caja.width / 2, cy = caja.y + caja.height / 2;
  // el punto 12, junto al centro: dónde está en la pantalla y cuánto mide en la imagen
  const donde = () => t.evaluate(() => {
    const g = [...document.querySelectorAll('.tv-dib-svg .tv-fijo')].find(e => (e.querySelector('text') || {}).textContent === '12');
    const c = g && g.querySelector('.tv-pt'); if (!c) return null;
    const q = new DOMPoint(+c.getAttribute('x1'), +c.getAttribute('y1')).matrixTransform(c.getScreenCTM()); return { x: q.x, y: q.y };
  });
  const diametro = async q => {
    const png = await t.screenshot({ clip: { x: q.x - 7, y: q.y - 7, width: 14, height: 14 } });
    const n = await t.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 110) n++;   // rojo del punto (#DC2626)
      return n;
    }, png.toString('base64'));
    return 2 * Math.sqrt(n / Math.PI);
  };
  const q0 = await donde(), d0 = await diametro(q0), e0 = await escalaBarra(t);
  await toque('touchStart', [[cx - 40, cy], [cx + 40, cy]]);
  for (let i = 1; i <= 10; i++) { await toque('touchMove', [[cx - 40 - 8 * i, cy], [cx + 40 + 8 * i, cy]]); await t.waitForTimeout(16); }
  const enPellizco = { escala: await escalaBarra(t), limpio: await sinTransform(t) };
  const q1 = await donde(), d1 = await diametro(q1);
  await toque('touchEnd', []); await t.waitForTimeout(400);
  const q2 = await donde(), d2 = await diametro(q2);
  ok(enPellizco.escala !== e0 && enPellizco.limpio, 'con los dedos el dibujo se pinta de nuevo mientras el gesto va (' + e0 + ' → ' + enPellizco.escala + ')');
  ok(Math.abs(d1 - d0) < 1.2 && Math.abs(d2 - d0) < 1.2 && d0 > 6, 'el punto mide lo mismo en la imagen antes, durante y después: ' + [d0, d1, d2].map(v => v.toFixed(1)).join(' / ') + ' px');
  ok(Math.hypot(q1.x - q2.x, q1.y - q2.y) < 1.5, 'al soltar el punto queda donde lo dejó el gesto (se movió ' + Math.hypot(q1.x - q2.x, q1.y - q2.y).toFixed(2) + ' px)');
  // mover la vista con un dedo (mano): el dibujo se repinta corrido y la escala no cambia
  await t.click('[data-accion="mano"]');
  const antesMano = await donde();
  await toque('touchStart', [[cx, cy]]); for (let i = 1; i <= 6; i++) { await toque('touchMove', [[cx + 12 * i, cy + 6 * i]]); await t.waitForTimeout(16); }
  const enMano = { punto: await donde(), escala: await escalaBarra(t), limpio: await sinTransform(t) };
  await toque('touchEnd', []); await t.waitForTimeout(300);
  await t.click('[data-accion="mano"]'); await t.waitForTimeout(200);
  ok(enMano.limpio && enMano.escala === (await escalaBarra(t)) && Math.hypot(enMano.punto.x - antesMano.x, enMano.punto.y - antesMano.y) > 40,
    'al moverse con un dedo el dibujo se repinta corrido, sin escalar nada');
  // pellizco con un dedo en un botón o en la barra de abajo: aleja igual y no pone ningún punto
  const guardados = () => t.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs.length; });
  await toque('touchStart', [[cx - 120, cy + 30]]); await toque('touchEnd', []); await t.waitForTimeout(300);   // primer punto de una línea
  const antes = { n: await guardados(), escala: await escalaBarra(t), cmd: await t.textContent('.tv-dib-cmd') };
  const fuera = async (sel, nombre) => {
    const bt = await (await t.$(sel)).boundingBox(), bx = bt.x + bt.width / 2, by = bt.y + bt.height / 2, ax = cx - 150, ay = cy - 60;
    await toque('touchStart', [[ax, ay], [bx, by]]);
    for (let i = 1; i <= 10; i++) { await toque('touchMove', [[ax + (bx - ax) * 0.04 * i, ay + (by - ay) * 0.04 * i], [bx - (bx - ax) * 0.02 * i, by - (by - ay) * 0.02 * i]]); await t.waitForTimeout(16); }
    const e = await escalaBarra(t); await toque('touchEnd', []); await t.waitForTimeout(400);
    ok(e !== antes.escala, 'pellizco con un dedo en ' + nombre + ': el dibujo se aleja durante el gesto (' + antes.escala + ' → ' + e + ')');
  };
  await fuera('[data-accion="deshacer"]', 'el botón Quitar punto');
  await fuera('.tv-dib-nav [data-grupo]:nth-child(4)', 'la barra de abajo');
  const despues = { n: await guardados(), escala: await escalaBarra(t), cmd: await t.textContent('.tv-dib-cmd'), hoja: !!(await t.$('.tv-dib-hoja')), quitar: await t.textContent('[data-accion="deshacer"]') };
  ok(despues.n === antes.n && /segundo punto/.test(despues.cmd) && /Quitar punto/.test(despues.quitar), 'esos pellizcos no ponen puntos ni líneas y no quitan el punto que ya estaba (' + despues.n + ' objetos)');
  ok(!despues.hoja && despues.escala !== antes.escala, 'el dedo de afuera no abre la barra de herramientas y la vista sí cambió (' + antes.escala + ' → ' + despues.escala + ')');
  // Regenerar imagen: el dibujo se arma de nuevo y se ve igual
  const g0 = await t.evaluateHandle(() => document.querySelector('.tv-dib-capa')), n0 = await t.$$eval('.tv-dib-capa .tv-pt', c => c.length);
  await t.click('[data-accion="regenerar"]'); await t.waitForTimeout(300);
  ok(await t.evaluate(g => document.querySelector('.tv-dib-capa') !== g && document.querySelector('.tv-dib-capa').isConnected, g0) && (await t.$$eval('.tv-dib-capa .tv-pt', c => c.length)) === n0, 'Regenerar imagen arma el dibujo de nuevo (' + n0 + ' puntos)');

  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (zoom).');
  process.exit(fallas ? 1 : 0);
})();
