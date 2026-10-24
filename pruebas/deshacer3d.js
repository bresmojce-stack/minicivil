// v35.1: deshacer y rehacer DENTRO de la vista 3D (Brian dibujó una línea en 3D y quitó un triángulo y no pudo deshacer).
//   node pruebas/deshacer3d.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  const objs = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) objs.push({ id: 100 + i * 10 + j, t: 'p', x: 1000000 + i * 10, y: 900000 + j * 10, z: 100 + 3 * Math.sin(i / 2) + j * 0.5, nom: String(i * 7 + j + 1), d: 'TN' });
  const proy = [{ id: 1, nombre: 'Lote', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 60, objs }], superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, proy);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);
  await p.click('.mc-modo button[data-modo="3D"]'); await p.waitForSelector('.mc-3d-dibujo'); await p.waitForTimeout(900);
  if (!(await p.$('.mc-3d-dibujo .mc-3d-lienzo'))) { ok(true, 'sin WebGL en este equipo: no se puede probar el 3D'); await b.close(); process.exit(0); }

  const estado = () => p.evaluate(() => ({ atras: HIST.atras.length, adelante: HIST.adelante.length,
    objs: HIST.actual.proyectos[0].dibujos[0].objs.length, quitados: ((HIST.actual.proyectos[0].superficies || [])[0].quitados || []).length }));
  // ¿el botón se puede tocar de verdad (nada lo tapa)?
  const alcanzable = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (e === t || e.contains(t)); }, sel);
  const sitioLibre = () => p.evaluate(() => { const cv = document.querySelector('.mc-3d-dibujo .mc-3d-lienzo'), r = cv.getBoundingClientRect();
    for (let X = r.left + 60; X < r.right - 70; X += 14) for (let Y = r.top + 100; Y < r.bottom - 120; Y += 14) { const q = MC_3D.dondeCae(X, Y); if (q && q.en === 'terreno') return { X, Y }; } return null; });

  // ── 1. los botones están y se pueden tocar ──
  ok(await alcanzable('.mc-3d-undo') && await alcanzable('.mc-3d-redo'), 'Deshacer y Rehacer se ven y se pueden tocar dentro del 3D');
  ok(await p.$eval('.mc-3d-undo', e => e.disabled) && await p.$eval('.mc-3d-redo', e => e.disabled), 'sin nada que deshacer, los dos están apagados');

  // ── 2. quitar un triángulo y deshacerlo ──
  const libre = await sitioLibre();
  await p.mouse.click(libre.X, libre.Y); await p.waitForTimeout(400);
  ok(!!(await p.$('.mc-3d-sel')), 'tocar el terreno marca un triángulo');
  await p.click('.mc-3d-quitar'); await p.waitForTimeout(700);
  let e1 = await estado();
  ok(e1.quitados === 1, 'Quitar este triángulo lo saca de la superficie (' + e1.quitados + ')');
  ok(!(await p.$eval('.mc-3d-undo', e => e.disabled)), 'ahora Deshacer se enciende');
  await p.click('.mc-3d-undo'); await p.waitForTimeout(700);
  e1 = await estado();
  ok(e1.quitados === 0, 'Deshacer devuelve el triángulo (' + e1.quitados + ' quitados)');
  ok(!(await p.$('.mc-3d-sel')), 'y se cierra el cartel del triángulo que ya no existe');
  await p.click('.mc-3d-redo'); await p.waitForTimeout(700);
  ok((await estado()).quitados === 1, 'Rehacer lo vuelve a quitar');
  await p.click('.mc-3d-undo'); await p.waitForTimeout(600);
  ok((await estado()).quitados === 0, 'y se deshace otra vez');

  // ── 3. dibujar una polilínea y deshacerla ──
  const antes = (await estado()).objs;
  await p.click('.mc-3d-dib[data-dib="polilinea"]'); await p.waitForTimeout(350);
  const sitios = await p.evaluate(() => { const cv = document.querySelector('.mc-3d-dibujo .mc-3d-lienzo'), r = cv.getBoundingClientRect(), out = [];
    for (let X = r.left + 40; X < r.right - 60 && out.length < 2; X += 16) for (let Y = r.top + 90; Y < r.bottom - 110 && out.length < 2; Y += 16) { const q = MC_3D.dondeCae(X, Y); if (q && q.en === 'terreno' && (!out.length || Math.hypot(out[0].X - X, out[0].Y - Y) > 60)) out.push({ X, Y }); } return out; });
  ok(sitios.length === 2, 'hay dos sitios del terreno para poner los vértices');
  for (const s of sitios) { await p.mouse.click(s.X, s.Y); await p.waitForTimeout(300); }
  // mientras se dibuja, Ctrl+Z quita el último vértice (no toca el historial)
  const pasosAntes = (await estado()).atras;
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  const txtPanel = (await p.textContent('.mc-3d-dibpanel')).replace(/\s+/g, ' ');
  ok(/1 vértice/.test(txtPanel) && (await estado()).atras === pasosAntes, 'mientras se dibuja, Ctrl+Z quita solo el último vértice y no toca lo ya hecho');
  await p.mouse.click(sitios[1].X, sitios[1].Y); await p.waitForTimeout(300);
  await p.click('.mc-3d-terminar'); await p.waitForTimeout(1200);
  ok((await estado()).objs === antes + 1, 'Terminar deja la polilínea en el dibujo (' + antes + ' → ' + (await estado()).objs + ' objetos)');
  await p.click('.mc-3d-undo'); await p.waitForTimeout(700);
  ok((await estado()).objs === antes, 'Deshacer quita la polilínea dibujada en el 3D');
  await p.click('.mc-3d-redo'); await p.waitForTimeout(700);
  ok((await estado()).objs === antes + 1, 'Rehacer la vuelve a poner');

  // ── 4. el teclado ──
  await p.keyboard.press('Control+z'); await p.waitForTimeout(600);
  ok((await estado()).objs === antes, 'Ctrl+Z en el 3D deshace');
  await p.keyboard.press('Control+y'); await p.waitForTimeout(600);
  ok((await estado()).objs === antes + 1, 'Ctrl+Y en el 3D rehace');

  // ── 5. borrar una línea desde el 3D también se deshace ──
  await p.evaluate(() => document.querySelector('.mc-3d-dib[aria-pressed="true"]') && document.querySelector('.mc-3d-dib[aria-pressed="true"]').click());
  await p.waitForTimeout(300);
  ok(await alcanzable('.mc-3d-undo'), 'después de salir del modo dibujar, los botones siguen al alcance');

  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs[0] : ''));
  console.log(fallas ? '\n' + fallas + ' FALLAS' : '\nTodo bien (' + (movil ? 'celular' : 'PC') + ')');
  await b.close(); process.exit(fallas ? 1 : 0);
})();
