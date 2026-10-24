// v34: agarrar un objeto por la esquina que uno escoja, llevarlo moviendo la pantalla y soltarlo donde sea.
// El caso de Brian: pegar las secciones en el dibujo y moverlas lejos con el dedo.
//   node pruebas/agarrar.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // terreno de prueba: plano al 2 %, con subrasante 1 m más abajo, y un cuadrado de 10 m para ensamblar
  const objs = []; let n = 1;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 4; j++) objs.push({ id: n, t: 'p', x: i * 20, y: j * 10, z: 100 + 0.02 * (i * 20), nom: String(n++), d: 'TN' });
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 4; j++) objs.push({ id: n, t: 'p', x: i * 20, y: j * 10, z: 99 + 0.02 * (i * 20), nom: String(n++), d: 'SR' });
  objs.push({ id: 'eje', t: 'pl', v: [{ x: 0, y: 20 }, { x: 200, y: 20 }] });
  objs.push({ id: 'cua', t: 'pl', c: true, v: [{ x: 0, y: 60 }, { x: 10, y: 60 }, { x: 10, y: 70 }, { x: 0, y: 70 }] });
  const proy = [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 300, objs }],
    superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' },
      { id: 222, nombre: 'Subrasante', fuente: { tipo: 'desc', descs: ['SR'] }, color: '#B45309', curvas: '' }],
    secciones: { linea: { dibId: 2, objId: 'eje' }, paso: '20', izq: '10', der: '10', arriba: 111, abajo: 222 } }];
  const ir = async tab => { await p.evaluate(t => localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: t })), tab);
    await p.reload(); await p.waitForTimeout(600); };
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); }, proy);

  // ── pegar las secciones en el dibujo ──
  await ir('secciones'); await p.waitForSelector('.mc-pegar-secc');
  await p.click('.mc-pegar-secc'); await p.waitForTimeout(800);
  const pz0 = await p.evaluate(() => (HIST.actual.proyectos[0].dibujos[0].objs || []).find(o => o.t === 'pz'));
  ok(!!pz0, 'las secciones quedan pegadas en el dibujo en ' + JSON.stringify(pz0 && pz0.p));

  const herr = async (g, id) => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(150); };
  const caja = async () => p.evaluate(() => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(); return { l: r.left, t: r.top }; });
  const enPant = async q => p.evaluate(w => MC_DIB.aP(w), q);
  const cmd = async () => (await p.textContent('.tv-dib-cmd')).replace(/\s+/g, ' ');
  const pieza = async () => p.evaluate(() => (HIST.actual.proyectos[0].dibujos[0].objs || []).find(o => o.t === 'pz'));
  const toque = async (X, Y) => {   // un toque corto de dedo (o clic de ratón) en el lienzo
    const c = await caja();
    if (movil) await p.touchscreen.tap(c.l + X, c.t + Y);
    else { await p.mouse.move(c.l + X, c.t + Y); await p.waitForTimeout(90); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); }
    await p.waitForTimeout(260);
  };
  const arrastrar = async (X, Y, dx, dy) => {   // arrastre de un dedo = mover la vista (como siempre)
    const c = await caja();
    if (movil) {
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.l + X, y: c.t + Y }] });
      for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.l + X + dx * i / 8, y: c.t + Y + dy * i / 8 }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await p.mouse.move(c.l + X, c.t + Y); await p.mouse.down({ button: 'middle' });
      await p.mouse.move(c.l + X + dx, c.t + Y + dy, { steps: 8 }); await p.mouse.up({ button: 'middle' });
    }
    await p.waitForTimeout(350);
  };

  await herr('ver', '@todo'); await p.waitForTimeout(400);
  await herr('editar', 'mover');
  ok(/toca los objetos/.test(await cmd()), 'MOVER pide tocar los objetos: ' + await cmd());

  // ── 1. tocar la pieza y pasar a "Siguiente" ──
  const g = await p.evaluate(z => DIB.pzTam(z), pz0);
  const centro = { x: pz0.p.x + g.W / 2, y: pz0.p.y - g.H / 2 };
  const sc = await enPant(centro);
  const tam = await p.evaluate(([x, y]) => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect();
    const e = document.elementFromPoint(r.left + x, r.top + y); return { w: Math.round(r.width), h: Math.round(r.height), sobre: e && (String(e.getAttribute && e.getAttribute('class') || '') + '|' + e.tagName) }; }, [sc.X, sc.Y]);
  await toque(sc.X, sc.Y);
  ok(/Siguiente \(1\)/.test(await cmd()), 'al tocarla queda elegida (1) [centro ' + JSON.stringify({X:Math.round(sc.X),Y:Math.round(sc.Y)}) + ' en lienzo ' + JSON.stringify(tam) + ']');
  await p.click('.tv-dib-cmd button:has-text("Siguiente")'); await p.waitForTimeout(250);
  ok(/de dónde la agarras/.test(await cmd()), 'ahora pide de dónde agarrarla: ' + await cmd());

  // ── 2. agarrarla por la ESQUINA de abajo a la izquierda (con imán) ──
  const esq = { x: pz0.p.x, y: pz0.p.y - g.H };
  const se = await enPant(esq);
  await toque(se.X, se.Y);
  ok(/va agarrada/.test(await cmd()), 'queda agarrada: ' + await cmd());
  ok(!!(await p.$('.tv-dib-cmd button:has-text("Soltar aquí")')), 'sale el botón "Soltar aquí"');
  const prev1 = await p.$$('path[stroke="#F59E0B"], polyline[stroke="#F59E0B"], polygon[stroke="#F59E0B"], line[stroke="#F59E0B"]');
  ok(prev1.length > 0, 'se ve la vista previa amarilla con la cruz del agarre (' + prev1.length + ' trazos)');

  // ── 3. mover la pantalla: la pieza viaja con ella y no se suelta ──
  const antesPz = JSON.stringify((await pieza()).p);
  const ptAntes = await enPant({ x: 0, y: 0 });
  await arrastrar(Math.round(sc.X), Math.round(sc.Y), -220, -120);
  const ptDesp = await enPant({ x: 0, y: 0 });
  ok(Math.hypot(ptDesp.X - ptAntes.X, ptDesp.Y - ptAntes.Y) > 100, 'arrastrar un dedo sigue moviendo la pantalla (se corrió ' +
    Math.round(Math.hypot(ptDesp.X - ptAntes.X, ptDesp.Y - ptAntes.Y)) + ' px)');
  ok(JSON.stringify((await pieza()).p) === antesPz, 'la pieza todavía NO se ha movido en el dibujo (sigue agarrada)');
  ok(/va agarrada/.test(await cmd()) && !!(await p.$('.tv-dib-cmd button:has-text("Soltar aquí")')), 'sigue agarrada después de mover la pantalla');
  // la vista previa sigue pegada al mismo punto de la PANTALLA
  const leerCruz = () => p.evaluate(() => { const e = document.querySelector('path[stroke="#F59E0B"][stroke-width="2"]');
    const m = e && /M([-\d.]+) ([-\d.]+)h/.exec(e.getAttribute('d')); return m ? { X: +m[1] + 9, Y: +m[2] } : null; });
  const cruz = await leerCruz();
  if (movil) ok(cruz && Math.abs(cruz.X - se.X) < 3 && Math.abs(cruz.Y - se.Y) < 3,
    'con el dedo el punto de agarre queda clavado en el mismo sitio de la pantalla (' + JSON.stringify(cruz) + ' vs ' + JSON.stringify({ X: Math.round(se.X), Y: Math.round(se.Y) }) + ')');
  else ok(!!cruz, 'con el ratón la cruz sigue a la mira, como siempre (' + JSON.stringify(cruz) + ')');

  // ── 4. soltarla donde está ahora en la pantalla ──
  await p.click('.tv-dib-cmd button:has-text("Soltar aquí")'); await p.waitForTimeout(500);
  const pz1 = await pieza();
  const dx = pz1.p.x - pz0.p.x, dy = pz1.p.y - pz0.p.y;
  ok(JSON.stringify(pz1.p) !== antesPz, 'al soltar, la pieza SÍ se movió en el dibujo: ' + JSON.stringify(pz1.p));
  // se movió lo mismo que se movió la pantalla (220 px a la izquierda, 120 arriba → en el terreno, hacia +x y +y según el zoom)
  const k = await p.evaluate(() => { const a = MC_DIB.aP({ x: 0, y: 0 }), b2 = MC_DIB.aP({ x: 1, y: 0 }); return b2.X - a.X; });
  // lo importante: la esquina del agarre queda EXACTAMENTE donde mostraba la cruz
  const esqFin = await enPant({ x: pz1.p.x, y: pz1.p.y - g.H });
  ok(Math.abs(esqFin.X - cruz.X) < 2 && Math.abs(esqFin.Y - cruz.Y) < 2,
    'la esquina del agarre cae donde mostraba la cruz (' + JSON.stringify({ X: Math.round(esqFin.X), Y: Math.round(esqFin.Y) }) + ')');
  if (movil) ok(Math.abs(dx - 220 / k) < 0.05 && Math.abs(dy + 120 / k) < 0.05,
    'y eso es exactamente lo que se movió la pantalla (' + dx.toFixed(3) + ', ' + dy.toFixed(3) + ' m = +' + (220 / k).toFixed(3) + ', -' + (120 / k).toFixed(3) + ')');
  else ok(Math.abs(dx) > 1 || Math.abs(dy) > 1, 'se movió (' + dx.toFixed(3) + ', ' + dy.toFixed(3) + ' m)');
  ok(!/va agarrada/.test(await cmd()), 'al soltar se termina la operación: ' + await cmd());
  // un solo paso de deshacer
  await herr('editar', '@deshacer'); await p.waitForTimeout(400);
  ok(JSON.stringify((await pieza()).p) === antesPz, 'Deshacer la devuelve a donde estaba, en un solo paso');

  // ── 5. ensamblar: agarrar el cuadrado por una esquina y pegarlo a la esquina de la pieza (con imán) ──
  await herr('ver', '@todo'); await p.waitForTimeout(400);
  await herr('editar', 'mover');
  const cLado = await enPant({ x: 5, y: 60 });        // mitad del lado de abajo del cuadrado
  await toque(cLado.X, cLado.Y);
  ok(/Siguiente \(1\)/.test(await cmd()), 'se elige el cuadrado tocando su lado');
  await p.click('.tv-dib-cmd button:has-text("Siguiente")'); await p.waitForTimeout(250);
  const cEsq = await enPant({ x: 10, y: 60 });        // su esquina de abajo a la derecha
  await toque(cEsq.X, cEsq.Y);
  ok(/va agarrada/.test(await cmd()), 'agarrado por la esquina que yo escogí');
  const destino = await enPant({ x: 100, y: 40 });    // un punto del levantamiento (hay punto ahí)
  await toque(destino.X, destino.Y);
  await p.waitForTimeout(400);
  const cua2 = await p.evaluate(() => (HIST.actual.proyectos[0].dibujos[0].objs || []).find(o => o.id === 'cua'));
  const v2 = cua2.v.map(q => [+q.x.toFixed(3), +q.y.toFixed(3)]);
  ok(JSON.stringify(v2.find(a => Math.abs(a[0] - 100) < 0.002 && Math.abs(a[1] - 40) < 0.002)) !== undefined,
    'la esquina del agarre queda EXACTA en el punto de destino: ' + JSON.stringify(v2));
  const lados = await p.evaluate(o => DIB.lados(o).map(([a, b2]) => +DIB.dist(a, b2).toFixed(3)), cua2);
  ok(lados.join() === '10,10,10,10', 'el cuadrado llega igualito (lados ' + lados.join(', ') + ')');

  // ── 6. Cancelar suelta el agarre sin mover nada (el cuadrado ya quedó en 90..100 × 40..50) ──
  await herr('editar', 'mover');
  const cLado2 = await enPant({ x: 95, y: 40 });
  await toque(cLado2.X, cLado2.Y);
  const antesC = JSON.stringify((await p.evaluate(() => (HIST.actual.proyectos[0].dibujos[0].objs || []).find(o => o.id === 'cua'))).v);
  await p.click('.tv-dib-cmd button:has-text("Cancelar")'); await p.waitForTimeout(300);
  ok(!(await p.$('.tv-dib-cmd button:has-text("Soltar aquí")')), 'Cancelar quita el agarre');
  ok(JSON.stringify((await p.evaluate(() => (HIST.actual.proyectos[0].dibujos[0].objs || []).find(o => o.id === 'cua'))).v) === antesC, 'y no mueve nada');

  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs[0] : ''));
  console.log(fallas ? '\n' + fallas + ' FALLAS' : '\nTodo bien (' + (movil ? 'celular' : 'PC') + ')');
  await b.close(); process.exit(fallas ? 1 : 0);
})();
