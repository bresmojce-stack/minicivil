// Dibujo 3D (Brian, v22): con el botón prendido, cada vértice que se pega a un punto se lleva su cota; apagado, todo queda plano.
// También revisa la barra de arriba, que dentro de un proyecto se fundió con la fila del proyecto para dejar más lienzo.
//   node pruebas/dib3d.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 760 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // cuadrícula de 9 puntos con cota, cada 10 m
  const objs = []; let n = 1;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) objs.push({ id: n, t: 'p', x: 1000000 + i * 10, y: 900000 + j * 10, z: 1500 + i + j * 0.5, nom: String(n++), d: 'TN' });
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v));
    localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 10, objs }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);

  // ── la barra de arriba: dentro del proyecto no está, y sus botones pasaron a la fila del proyecto ──
  const barra = await p.evaluate(() => ({ header: !!document.querySelector('header.tv-header'),
    enFila: document.querySelectorAll('.mc-barra-proy .tv-acciones button, .mc-barra-proy .tv-acciones .tv-guardado').length,
    y: Math.round(document.querySelector('.tv-dib-svg').getBoundingClientRect().top) }));
  ok(!barra.header && barra.enFila >= 2, 'dentro del proyecto no hay barra de arriba y sus botones están en la fila del proyecto (' + barra.enFila + ')');
  await p.evaluate(() => { document.querySelector('.mc-barra-proy button').click(); }); await p.waitForTimeout(300);
  ok(!!(await p.$('header.tv-header')) && !!(await p.$('.tv-brand')), 'en la pantalla de inicio la barra con el logo sigue estando');
  await p.evaluate(v => { localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, 0);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);

  const estado = () => p.evaluate(() => { vaciarGuardado();
    const d = JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0];
    return { n: d.objs.length, ultimo: d.objs[d.objs.length - 1], cmd: document.querySelector('.tv-dib-cmd').textContent.replace(/\s+/g, ' ').slice(0, 30) }; });
  const enPantalla = q => p.evaluate(c => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP(c); return { x: r.left + s.X, y: r.top + s.Y }; }, q);
  const tocar = async q => { const s = await enPantalla(q); await p.mouse.click(s.x, s.y); await p.waitForTimeout(220); };
  const herr = async (g, id) => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(150); };
  await p.click('.tv-dib-nav button[data-grupo=ver]'); await p.click('.tv-dib-hoja button[data-herr="@todo"]'); await p.waitForTimeout(400);

  // ── apagado: la línea queda plana (como siempre) ──
  const apagado = await p.getAttribute('.mc-dib3d', 'aria-pressed');
  ok(apagado === 'false', 'el Dibujo 3D arranca apagado; lo prende Brian');
  await herr('dibujar', 'linea');
  await tocar(objs[0]); await tocar(objs[4]);
  const a1 = await estado();
  ok(a1.ultimo.t === 'l' && a1.ultimo.a.z === undefined && a1.ultimo.b.z === undefined, 'apagado: la línea se pega a los puntos pero no toma cotas');

  // ── prendido: la línea toma la cota de cada punto ──
  await p.click('.mc-dib3d'); await p.waitForTimeout(250);
  ok((await p.getAttribute('.mc-dib3d', 'aria-pressed')) === 'true', 'el botón "Dib 3D" se prende');
  await herr('dibujar', 'linea');
  await tocar(objs[0]); await tocar(objs[8]);
  const a2 = await estado();
  const z0 = objs[0].z, z8 = objs[8].z;
  ok(a2.n === a1.n + 1 && Math.abs(a2.ultimo.a.z - z0) < 1e-9 && Math.abs(a2.ultimo.b.z - z8) < 1e-9,
    'prendido: la línea toma la cota de los dos puntos (' + a2.ultimo.a.z + ' y ' + a2.ultimo.b.z + ')');
  ok((await p.textContent('body')).includes('quedó en 3D'), 'avisa que la línea quedó en 3D');

  // ── polilínea: tres puntos con cota y el aviso ──
  await herr('dibujar', 'polilinea');
  await tocar(objs[1]); await tocar(objs[4]); await tocar(objs[7]);
  await p.click('.tv-dib-cmd button:has-text("Terminar")'); await p.waitForTimeout(350);
  const a3 = await estado();
  const zs = (a3.ultimo.v || []).map(q => q.z);
  ok(a3.ultimo.t === 'pl' && zs.length === 3 && zs.every(z => z != null), 'la polilínea toma la cota de sus tres vértices: ' + zs.join(' / '));

  // ── un vértice en el aire (sin punto debajo): queda sin cota y el aviso lo dice ──
  await herr('dibujar', 'linea');
  const libre = { x: objs[0].x + 3.33, y: objs[0].y + 3.33 };
  await tocar(objs[2]); await tocar(libre);
  const a4 = await estado();
  ok(a4.ultimo.a.z != null && a4.ultimo.b.z == null, 'el vértice que no cae sobre un punto queda sin cota');
  ok(/1 de 2 vértices con cota/.test(await p.textContent('body')), 'el aviso dice cuántos vértices quedaron con cota');

  // ── la cota también se toma de una línea que ya la tiene (su extremo) ──
  await herr('dibujar', 'linea');
  await tocar(objs[8]); await tocar(objs[5]);
  const a5 = await estado();
  ok(Math.abs(a5.ultimo.a.z - z8) < 1e-9, 'pegándose al extremo de una línea que ya tiene cota, también la toma');

  // ── el punto suelto y las figuras siguen planos ──
  await herr('dibujar', 'rect');
  await tocar(objs[0]); await tocar(objs[8]);
  const a6 = await estado();
  ok(a6.ultimo.t === 'pl' && (a6.ultimo.v || []).every(q => q.z == null), 'las figuras (rectángulo) siguen planas');

  // ── el DXF saca en 3D las líneas con cota ──
  const texto = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0]; const r = crearDXF(d); return typeof r === 'string' ? r : (r && (r.texto || r.contenido)) || ''; });
  const cotasDxf = []; const re = /\r?\n30\r?\n(-?\d+(?:\.\d+)?)/g; let mm;
  while ((mm = re.exec(texto))) cotasDxf.push(parseFloat(mm[1]));
  ok(cotasDxf.some(z => Math.abs(z - z0) < 1e-6) && cotasDxf.some(z => Math.abs(z - z8) < 1e-6),
    'el DXF saca las cotas (grupo 30) de lo que se dibujó en 3D: ' + [...new Set(cotasDxf)].filter(z => z !== 0).slice(0, 4).join(', '));

  // ── se apaga y vuelve a dibujar plano; y se acuerda al recargar ──
  await p.click('.mc-dib3d'); await p.waitForTimeout(200);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  ok((await p.getAttribute('.mc-dib3d', 'aria-pressed')) === 'false', 'al recargar, el equipo se acuerda de que quedó apagado');

  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (dibujo 3D).');
  process.exit(fallas ? 1 : 0);
})();
