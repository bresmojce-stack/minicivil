// Imanes Cercano y Perpendicular (v29). Números a mano:
//   línea A(0,0)-B(100,0). Perpendicular desde (30,40) cae en (30,0). Cercano al cursor (70,3) cae en (70,0).
//   node pruebas/imanes.js [index.html]        (W=390 para celular)
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
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── 1. la matemática sola (sin pantalla) ──
  const objs = [{ id: 1, t: 'l', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } },
    { id: 2, t: 'ci', c: { x: 0, y: 200 }, r: 50 }];
  const r = await p.evaluate(O => {
    const sol = (act, p, base, tol) => imanVivo(O, act, p, base, tol);
    const todo = { perp: true, cercano: true };
    return {
      perp: sol(todo, { x: 30, y: 3 }, { x: 30, y: 40 }, 5),
      cercano: sol({ cercano: true }, { x: 70, y: 3 }, null, 5),
      // el pie cae fuera del tramo (base en x = 140): no hay perpendicular
      fuera: sol({ perp: true }, { x: 99, y: 3 }, { x: 140, y: 40 }, 5),
      lejos: sol(todo, { x: 50, y: 40 }, { x: 50, y: 60 }, 5),
      // círculo: Cercano al borde y Perpendicular desde un punto de afuera (pasa por el centro)
      circulo: sol({ cercano: true }, { x: 0, y: 253 }, null, 5),
      circPerp: sol({ perp: true }, { x: 48, y: 200 }, { x: 300, y: 200 }, 5),
      // con los dos prendidos, Perpendicular manda
      manda: sol(todo, { x: 30, y: 3 }, { x: 30, y: 40 }, 5).tipo,
      apagados: sol({}, { x: 30, y: 3 }, { x: 30, y: 40 }, 5)
    };
  }, objs);
  const cerca = (q, x, y) => q && Math.abs(q.x - x) < 1e-9 && Math.abs(q.y - y) < 1e-9;
  ok(cerca(r.perp, 30, 0) && r.perp.tipo === 'perp', 'Perpendicular desde (30,40) a la línea cae exacto en (30, 0)');
  ok(cerca(r.cercano, 70, 0) && r.cercano.tipo === 'cercano', 'Cercano con el cursor en (70,3) cae exacto en (70, 0)');
  ok(r.fuera === null, 'si el pie de la perpendicular cae fuera del tramo, no hay imán (no se inventa la prolongación)');
  ok(r.lejos === null, 'con el cursor lejos de la línea (40 m, tolerancia 5) no hay imán');
  ok(cerca(r.circulo, 0, 250), 'Cercano en un círculo cae en su borde: (0, 250)');
  ok(cerca(r.circPerp, 50, 200), 'Perpendicular a un círculo cae en el borde mirando al centro: (50, 200)');
  ok(r.manda === 'perp', 'con los dos prendidos, Perpendicular manda sobre Cercano');
  ok(r.apagados === null, 'con los dos apagados no hay imán vivo');

  // ── 2. en pantalla: dibujar una línea pegándose perpendicular a otra ──
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v));
    localStorage.setItem('minicivil__t', String(Date.now() + 99999));
    localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 9, objs: [{ id: 1, t: 'l', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } },
      { id: 2, t: 'p', x: -10, y: 50, nom: 'A' }, { id: 3, t: 'p', x: 110, y: -10, nom: 'B' }] }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(400);

  // las casillas nuevas están, con Perpendicular prendido y Cercano apagado
  await p.click('.tv-dib-nav button[data-grupo=herramientas]'); await p.click('.tv-dib-hoja button[data-herr="@imanes"]'); await p.waitForTimeout(300);
  const casillas = await p.evaluate(() => [...document.querySelectorAll('label')].filter(l => /Perpendicular|Cercano/.test(l.textContent))
    .map(l => ({ t: l.textContent.trim(), on: l.querySelector('input').checked })));
  ok(casillas.length === 2 && casillas.find(c => /Perpendicular/.test(c.t)).on === true && casillas.find(c => /Cercano/.test(c.t)).on === false,
    'el panel de imanes trae Perpendicular (prendido) y Cercano (apagado): ' + casillas.map(c => c.t + '=' + c.on).join(', '));
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Listo'); if (b) b.click(); });
  await p.waitForTimeout(250);

  const enPantalla = q => p.evaluate(c => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP(c); return { x: r.left + s.X, y: r.top + s.Y }; }, q);
  const tocar = async q => { const s = await enPantalla(q); await p.mouse.click(s.x, s.y); await p.waitForTimeout(220); };
  // elegir herramienta: abre el grupo si está cerrado
  const herr = async (g, id) => {
    if (!(await p.$(`.tv-dib-hoja button[data-herr="${id}"]`))) await p.click(`.tv-dib-nav button[data-grupo=${g}]`);
    await p.waitForTimeout(200); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(200);
  };
  const ultimo = () => p.evaluate(() => { vaciarGuardado(); const o = JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs; return o[o.length - 1]; });

  await herr('dibujar', 'linea');
  await tocar({ x: 30, y: 40 });          // primer punto libre
  { const s = await enPantalla({ x: 31, y: 1.2 }); await p.mouse.move(s.x, s.y); await p.waitForTimeout(150); }
  await tocar({ x: 31, y: 1.2 });         // cerca de la línea: debe pegarse al pie de la perpendicular (30, 0)
  const L = await ultimo();
  ok(L.t === 'l' && Math.abs(L.b.x - 30) < 0.02 && Math.abs(L.b.y) < 0.02,
    'dibujando una línea desde (30,40), el segundo punto se pega perpendicular a (30, 0): quedó en (' + L.b.x.toFixed(3) + ', ' + L.b.y.toFixed(3) + ')');

  // ── 3. Cercano: se prende y el punto cae sobre la línea donde está el cursor ──
  await p.click('.tv-dib-nav button[data-grupo=herramientas]'); await p.click('.tv-dib-hoja button[data-herr="@imanes"]'); await p.waitForTimeout(250);
  await p.evaluate(() => { const l = [...document.querySelectorAll('label')].find(x => /Cercano/.test(x.textContent)); l.querySelector('input').click();
    const pp = [...document.querySelectorAll('label')].find(x => /Perpendicular/.test(x.textContent)); pp.querySelector('input').click(); });
  await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Listo'); if (b) b.click(); });
  await p.waitForTimeout(250);
  await herr('dibujar', 'punto');
  await tocar({ x: 70, y: 2.5 });
  const P2 = await ultimo();
  ok(P2.t === 'p' && Math.abs(P2.x - 70) < 0.5 && Math.abs(P2.y) < 0.02,
    'con Cercano prendido, el punto cae sobre la línea en (' + P2.x.toFixed(3) + ', ' + P2.y.toFixed(3) + ')');

  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (imanes ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
