// v36: deshacer en todos los módulos. Ctrl+Z en el Dibujo 2D deshace lo ya dibujado, y fuera del Dibujo
// (Superficies, Secciones, Volúmenes, Presentación) hay botón de deshacer y Ctrl+Z.
//   node pruebas/deshacer.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  const objs = []; let n = 1;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) objs.push({ id: n, t: 'p', x: i * 20, y: j * 20, z: 100 + i, nom: String(n++), d: 'TN' });
  const proy = [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 30, objs }],
    superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' }] }];
  const ir = async tab => { await p.evaluate(t => localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: t })), tab); await p.reload(); await p.waitForTimeout(700); };
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); }, proy);
  const nObjs = () => p.evaluate(() => HIST.actual.proyectos[0].dibujos[0].objs.length);

  // ── Dibujo 2D: Ctrl+Z deshace un punto ya puesto ──
  await ir('dibujo');
  await p.click('.tv-dib-nav button[data-grupo=dibujar]'); await p.click('.tv-dib-hoja button[data-herr="punto"]'); await p.waitForTimeout(150);
  const c = await p.evaluate(() => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.55 }; });
  const antes = await nObjs();
  if (movil) await p.touchscreen.tap(c.x, c.y); else await p.mouse.click(c.x, c.y);
  await p.waitForTimeout(400);
  ok(await nObjs() === antes + 1, 'en el Dibujo se pone un punto (' + antes + ' → ' + await nObjs() + ')');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
  ok(await nObjs() === antes, 'Ctrl+Z en el Dibujo 2D deshace el punto ya puesto (antes solo deshacía lo que estaba en curso)');
  await p.keyboard.press('Control+y'); await p.waitForTimeout(400);
  ok(await nObjs() === antes + 1, 'Ctrl+Y lo vuelve a poner');
  ok(!(await p.$('.tv-deshacer')), 'en el Dibujo no sale el botón de la app (tiene el suyo)');

  // ── Superficies: esconder una superficie y deshacerlo con el botón ──
  await ir('superficies');
  const oculta = () => p.evaluate(() => !!HIST.actual.proyectos[0].superficies[0].oculta);
  ok(!(await p.$('.tv-deshacer')), 'sin cambios en esta pestaña no sale el botón de deshacer');
  await p.click('.mc-sup-tarjeta button[aria-label^="Esconder"]'); await p.waitForTimeout(400);
  ok(await oculta(), 'en Superficies se esconde la superficie');
  ok(!!(await p.$('.tv-deshacer')), 'y sale el botón de deshacer');
  await p.click('.tv-deshacer button[title^="Deshacer"]'); await p.waitForTimeout(400);
  ok(!(await oculta()), 'el botón de deshacer la vuelve a mostrar');
  await p.keyboard.press('Control+y'); await p.waitForTimeout(400);
  ok(await oculta(), 'Ctrl+Y en Superficies rehace');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
  ok(!(await oculta()), 'Ctrl+Z en Superficies deshace');

  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs[0] : ''));
  console.log(fallas ? '\n' + fallas + ' FALLAS' : '\nTodo bien (' + (movil ? 'celular' : 'PC') + ')');
  await b.close(); process.exit(fallas ? 1 : 0);
})();
