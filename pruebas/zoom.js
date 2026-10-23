// Dibujo: zoom con la rueda y con los dedos — Brian: "fijos en pantalla" y "pone puntos donde no van".
//   node pruebas/zoom.js [index.html]
// Puntos del mismo tamaño antes, durante y después del gesto (medidos en la imagen), sin transform de CSS (en Android dejaba
// restos), textos que se esconden solo mientras cambia la escala, pellizco con un dedo fuera del lienzo y "Regenerar imagen".
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
  const escala = p => p.evaluate(() => +(document.querySelector('.tv-dib-capa').getAttribute('data-escala') || 1));
  const textoVisible = p => p.evaluate(() => { const t = document.querySelector('.tv-dib-svg .tv-fijo text'); return getComputedStyle(t).visibility === 'visible'; });
  const sinCSS = p => p.evaluate(() => [...document.querySelectorAll('.tv-dib-capa .tv-fijo')].every(e => getComputedStyle(e).transform === 'none' && !e.style.transform && !e.style.transformOrigin));

  // ── PC: rueda del mouse ──
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await abrir(p, objs);
  const bb = await (await p.$('.tv-dib-svg')).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const ruedas = n => p.evaluate(n => { const s = document.querySelector('.tv-dib-svg'), r = s.getBoundingClientRect(); for (let i = 0; i < n; i++) s.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); }, n);
  ok(await textoVisible(p), 'antes del zoom se ven los textos de los puntos');
  await ruedas(4);
  const durante = { escala: await escala(p), texto: await textoVisible(p), css: await sinCSS(p) };
  await p.mouse.move(bb.x + bb.width / 2 + 5, bb.y + bb.height / 2 + 5); await p.waitForTimeout(400);
  ok(durante.escala > 3, 'a la mitad del gesto el dibujo está agrandado ×' + durante.escala.toFixed(1));
  ok(!durante.texto && await textoVisible(p), 'mientras acerca los textos se esconden y al terminar vuelven');
  ok(durante.css, 'los puntos no llevan transform de CSS durante el gesto');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.tv-dib-svg')).overflow === 'visible'), 'durante el gesto se ve lo que estaba fuera de la pantalla (el dibujo no se corta)');
  // 300 puntos juntos: de lejos sin textos (no se amontonan) y al acercar aparecen donde caben
  let sem = 7; const rnd = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
  const loma = []; for (let i = 0; i < 300; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 60; loma.push({ id: i + 1, t: 'p', x: 1000060 + r * Math.cos(a), y: 1000060 + r * Math.sin(a), z: 1500, nom: String(i + 1), d: 'TN' }); }
  await p.evaluate(v => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 3, nombre: 'Loma', sig: 301, objs: v }] }]); }, loma); await p.waitForTimeout(500);
  const textos = () => p.evaluate(() => document.querySelectorAll('.tv-dib-svg .tv-fijo text').length);
  const lejos = await textos();
  await ruedas(6);
  await p.mouse.move(bb.x + 20, bb.y + 20); await p.waitForTimeout(400);
  const cerca = await textos();
  ok(lejos < 60 && cerca > lejos * 5, 'de lejos los textos de los puntos juntos se esconden y al acercar aparecen: ' + lejos + ' → ' + cerca + ' textos');
  await p.close();

  // ── tablet con los dedos ──
  const ctx = await b.newContext({ viewport: { width: 1000, height: 625 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const t = await ctx.newPage(); await abrir(t, objs);
  const cdp = await ctx.newCDPSession(t);
  const toque = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
  const caja = await (await t.$('.tv-dib-svg')).boundingBox(), cx = caja.x + caja.width / 2, cy = caja.y + caja.height / 2;
  // el punto 12, junto al centro (el 13 lleva encima el texto LOTE y el 8 sale del lienzo al acercar): dónde está en la pantalla
  // (con el gesto incluido) y cuánto mide en la imagen
  const donde = () => t.evaluate(([cx, cy]) => {
    const cs = [...document.querySelectorAll('.tv-dib-svg .tv-fijo .tv-pt')].map(c => { const q = new DOMPoint(+c.getAttribute('x1'), +c.getAttribute('y1')).matrixTransform(c.getScreenCTM()); return { x: q.x, y: q.y, n: c.parentNode.querySelector('text') && c.parentNode.querySelector('text').textContent }; });
    return cs.find(q => q.n === '12');
  }, [cx, cy]);
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
  const q0 = await donde(), d0 = await diametro(q0);
  // pellizco con los dos dedos en el lienzo: acercar ×3
  await toque('touchStart', [[cx - 40, cy], [cx + 40, cy]]);
  for (let i = 1; i <= 10; i++) { await toque('touchMove', [[cx - 40 - 8 * i, cy], [cx + 40 + 8 * i, cy]]); await t.waitForTimeout(16); }
  const enGesto = { escala: await escala(t), texto: await textoVisible(t), css: await sinCSS(t) };
  const q1 = await donde(), d1 = await diametro(q1);
  await toque('touchEnd', []); await t.waitForTimeout(450);
  const q2 = await donde(), d2 = await diametro(q2);
  ok(enGesto.escala > 2.5, 'con los dedos el dibujo se agranda durante el gesto ×' + enGesto.escala.toFixed(1));
  ok(Math.abs(d1 - d0) < 1.2 && Math.abs(d2 - d0) < 1.2 && d0 > 6, 'el punto mide lo mismo en la imagen antes, durante y después: ' + [d0, d1, d2].map(v => v.toFixed(1)).join(' / ') + ' px');
  ok(q1.n === q2.n && Math.hypot(q1.x - q2.x, q1.y - q2.y) < 1.5, 'al soltar el punto queda donde lo dejó el gesto (punto ' + q2.n + ', se movió ' + Math.hypot(q1.x - q2.x, q1.y - q2.y).toFixed(2) + ' px)');
  ok(!enGesto.texto && await textoVisible(t) && enGesto.css, 'con los dedos: textos escondidos solo durante el gesto y nada con transform de CSS');
  // mover la vista con un dedo (mano): la escala no cambia y los textos se siguen viendo
  await t.click('[data-accion="mano"]');
  await toque('touchStart', [[cx, cy]]); for (let i = 1; i <= 6; i++) { await toque('touchMove', [[cx + 10 * i, cy + 5 * i]]); await t.waitForTimeout(16); }
  const enMano = { escala: await escala(t), texto: await textoVisible(t) };
  await toque('touchEnd', []); await t.waitForTimeout(300);
  await t.click('[data-accion="mano"]'); await t.waitForTimeout(200);
  ok(enMano.escala === 1 && enMano.texto, 'al moverse sin acercar los textos siguen a la vista');
  // pellizco con un dedo en un botón o en la barra de abajo: aleja igual y no pone ningún punto
  const guardados = () => t.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs.length; });
  await toque('touchStart', [[cx - 120, cy + 30]]); await toque('touchEnd', []); await t.waitForTimeout(300);   // primer punto de una línea
  const antes = { n: await guardados(), escala: await t.textContent('.tv-dib-escala'), cmd: await t.textContent('.tv-dib-cmd') };
  const fuera = async (sel, nombre) => {
    const bt = await (await t.$(sel)).boundingBox(), bx = bt.x + bt.width / 2, by = bt.y + bt.height / 2, ax = cx - 150, ay = cy - 60;
    await toque('touchStart', [[ax, ay], [bx, by]]);
    for (let i = 1; i <= 10; i++) { await toque('touchMove', [[ax + (bx - ax) * 0.04 * i, ay + (by - ay) * 0.04 * i], [bx - (bx - ax) * 0.02 * i, by - (by - ay) * 0.02 * i]]); await t.waitForTimeout(16); }
    const e = await escala(t); await toque('touchEnd', []); await t.waitForTimeout(450);
    ok(e < 0.75, 'pellizco con un dedo en ' + nombre + ': el dibujo se aleja durante el gesto (×' + e.toFixed(2) + ')');
  };
  await fuera('[data-accion="deshacer"]', 'el botón Quitar punto');
  await fuera('.tv-dib-nav [data-grupo]:nth-child(4)', 'la barra de abajo');
  const despues = { n: await guardados(), escala: await t.textContent('.tv-dib-escala'), cmd: await t.textContent('.tv-dib-cmd'), hoja: !!(await t.$('.tv-dib-hoja')), quitar: await t.textContent('[data-accion="deshacer"]') };
  ok(despues.n === antes.n && /segundo punto/.test(despues.cmd) && /Quitar punto/.test(despues.quitar), 'esos pellizcos no ponen puntos ni líneas y no quitan el punto que ya estaba (' + despues.n + ' objetos)');
  ok(!despues.hoja && despues.escala !== antes.escala, 'el dedo de afuera no abre la barra de herramientas y la vista sí cambió (' + antes.escala.trim() + ' → ' + despues.escala.trim() + ')');
  // Regenerar imagen: el dibujo se arma de nuevo (otro grupo) y se ve igual
  const g0 = await t.evaluateHandle(() => document.querySelector('.tv-dib-capa')), n0 = await t.$$eval('.tv-dib-capa .tv-pt', c => c.length);
  await t.click('[data-accion="regenerar"]'); await t.waitForTimeout(300);
  ok(await t.evaluate(g => document.querySelector('.tv-dib-capa') !== g && document.querySelector('.tv-dib-capa').isConnected, g0) && (await t.$$eval('.tv-dib-capa .tv-pt', c => c.length)) === n0, 'Regenerar imagen arma el dibujo de nuevo (' + n0 + ' puntos)');

  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (zoom).');
  process.exit(fallas ? 1 : 0);
})();
