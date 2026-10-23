// Lados curvos de la polilínea (v30). Números comprobados a mano:
//   cuerda (0,0)-(10,0) con curvatura 1 → semicírculo: centro (5,0), radio 5, largo 15.707963, cima (5,-5).
//   cuadrado de 10 con el lado 1 a curvatura 0.5 → radio 6.25, flecha 2.5,
//   perímetro 100-10+... = 41.591190 m y área 100 + 6.25²(θ-sen θ)/2 = 117.472470 m² (θ = 4·atan(0.5)).
//   node pruebas/arcos.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 820 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  const casi = (a, b2, t) => Math.abs(a - b2) < (t || 1e-6);
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── 1. la matemática ──
  const r = await p.evaluate(() => {
    const cua = bul => ({ t: 'pl', c: true, v: [{ x: 0, y: 0, b: bul }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] });
    const o = cua(0.5), fino = DIB.puntos(o);
    return {
      semi: DIB.arcoDe({ x: 0, y: 0 }, { x: 10, y: 0 }, 1),
      cima: DIB.medioLado({ x: 0, y: 0 }, { x: 10, y: 0 }, 1),
      largo: DIB.largoObj(o), area: DIB.areaObj(o),
      largoFino: DIB.largo(fino, true), areaFina: DIB.area(fino), nFino: fino.length,
      negativa: DIB.areaObj(cua(-0.5)),
      recta: { largo: DIB.largoObj(cua(0)), area: DIB.areaObj(cua(0)), pts: DIB.puntos(cua(0)).length, curvas: DIB.conCurvas(cua(0)) },
      bulR: DIB.bulDeRadio({ x: 0, y: 0 }, { x: 10, y: 0 }, 6.25, 1),
      bulRchico: DIB.bulDeRadio({ x: 0, y: 0 }, { x: 10, y: 0 }, 4, 1),
      bulF: DIB.bulDeFlecha({ x: 0, y: 0 }, { x: 10, y: 0 }, 2.5),
      flecha: DIB.flechaDe({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.5),
      sinArco: DIB.arcoDe({ x: 0, y: 0 }, { x: 10, y: 0 }, 0)
    };
  });
  ok(r.semi && casi(r.semi.c.x, 5) && casi(r.semi.c.y, 0) && casi(r.semi.r, 5) && casi(r.semi.largo, 15.707963, 1e-5),
    'curvatura 1 da un semicírculo exacto: centro (5, 0), radio 5, largo ' + r.semi.largo.toFixed(6));
  ok(casi(r.cima.x, 5, 1e-9) && casi(r.cima.y, -5, 1e-9), 'la cima del arco (imán de punto medio) queda en (5, -5), al lado derecho de a→b como en el DXF');
  ok(casi(r.largo, 41.591190, 1e-6), 'perímetro exacto con el arco: ' + r.largo.toFixed(6) + ' m');
  ok(casi(r.area, 117.472470, 1e-6), 'área exacta con el arco: ' + r.area.toFixed(6) + ' m²');
  ok(r.areaFina < r.area && r.area - r.areaFina < 0.05 && r.largoFino < r.largo && r.largo - r.largoFino < 0.01,
    'la cuenta exacta y la de muchas cuerdas coinciden (área ' + r.areaFina.toFixed(3) + ' vs ' + r.area.toFixed(3) + '): el signo y el sentido están bien');
  ok(casi(r.negativa, 82.527530, 1e-6), 'con la curvatura al otro lado el arco quita área: ' + r.negativa.toFixed(6) + ' m² (100 - 17.472)');
  ok(casi(r.recta.largo, 40) && casi(r.recta.area, 100) && r.recta.pts === 4 && r.recta.curvas === false,
    'sin curvatura todo queda como siempre: perímetro 40, área 100, 4 puntos');
  ok(casi(r.bulR, 0.5, 1e-9) && r.bulRchico === null, 'del radio sale la curvatura (6.25 → 0.5) y un radio menor que la mitad del lado se rechaza');
  ok(casi(r.bulF, 0.5, 1e-9) && casi(r.flecha, 2.5, 1e-9), 'de la flecha sale la curvatura (2.5 → 0.5) y al revés');
  ok(r.sinArco === null, 'curvatura 0 no es arco: sigue siendo un lado recto');

  // ── 2. el DXF ──
  const dxf = await p.evaluate(() => {
    const sin = { objs: [{ id: 1, t: 'pl', c: true, v: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }] };
    const con = { objs: [{ id: 1, t: 'pl', c: true, v: [{ x: 0, y: 0, b: 0.5 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }] };
    return { sin: crearDXF(sin), con: crearDXF(con) };
  });
  ok(!/\r?\n\s*42\r?\n/.test(dxf.sin), 'un dibujo sin curvas no escribe ninguna curvatura en el DXF (archivo igual que siempre)');
  ok(/\r?\n\s*42\r?\n0?\.?5\r?\n/.test(dxf.con), 'el lado curvo sale al DXF en el grupo 42 con su valor (0.5)');
  ok(dxf.con.replace(/\r?\n\s*42\r?\n[-\d.]+/g, '') === dxf.sin, 'quitando esa línea, el DXF con curva es idéntico al DXF sin curva');

  // ── 3. en pantalla ──
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v));
    localStorage.setItem('minicivil__t', String(Date.now() + 99999));
    localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 9, objs: [
      { id: 1, t: 'pl', c: true, v: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
      { id: 2, t: 'p', x: -6, y: -8, nom: 'A' }, { id: 3, t: 'p', x: 16, y: 18, nom: 'B' }] }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  await p.click('.tv-dib-nav button[data-grupo=ver]'); await p.click('.tv-dib-hoja button[data-herr="@todo"]'); await p.waitForTimeout(400);

  const enPantalla = q => p.evaluate(c => { const rc = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP(c); return { x: rc.left + s.X, y: rc.top + s.Y }; }, q);
  const herr = async (g, id) => { if (!(await p.$(`.tv-dib-hoja button[data-herr="${id}"]`))) await p.click(`.tv-dib-nav button[data-grupo=${g}]`);
    await p.waitForTimeout(200); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(200); };
  const obj1 = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs.find(o => o.id === 1); });

  // elegir la polilínea y curvar el lado 1
  await herr('editar', 'elegir');
  { const s = await enPantalla({ x: 5, y: 0 }); await p.mouse.click(s.x, s.y); await p.waitForTimeout(350); }
  const lados = await p.$$eval('.mc-lado', e => e.length);
  ok(lados === 4, 'el panel lista los 4 lados con su botón Recto / Curvo (' + lados + ')');
  await p.locator('.mc-lado').first().locator('.mc-curvo').click(); await p.waitForTimeout(400);
  const o1 = await obj1();
  ok(o1.v[0].b === 0.2, 'al pulsar "Curvo" el lado 1 queda con curvatura 0.2 (flecha = la décima parte del lado)');
  const camino = await p.evaluate(() => { const g = document.querySelector('.tv-dib-svg'); const ps = [...g.querySelectorAll('path')].map(x => x.getAttribute('d') || ''); return ps.find(d => /A[\d.]/.test(d)) || ''; });
  ok(/A[\d.]+,[\d.]+ 0 [01] [01]/.test(camino), 'se dibuja con un arco de verdad (comando A del SVG), no con la cuerda');

  // escribir el radio
  await p.locator('.mc-lado').first().locator('.mc-radio').fill('6.25');
  await p.evaluate(() => { const i = document.querySelector('.mc-lado .mc-radio'); if (i) i.blur(); }); await p.waitForTimeout(400);
  const o2 = await obj1();
  ok(o2 && Math.abs(o2.v[0].b - 0.5) < 1e-6, 'se escribe el radio 6.25 y la curvatura queda en 0.5 (' + (o2 ? o2.v[0].b : '?') + ')');
  const txt = (await p.textContent('body')).replace(/\s+/g, ' ');
  ok(/117\.47/.test(txt) && /41\.59/.test(txt), 'el panel muestra el área 117.472 m² y el perímetro 41.591 m');

  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (arcos ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
