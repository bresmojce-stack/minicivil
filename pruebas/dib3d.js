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
    enFila: document.querySelectorAll('.mc-barra-dib .tv-acciones button, .mc-barra-dib .tv-acciones .tv-guardado').length,
    y: Math.round(document.querySelector('.tv-dib-svg').getBoundingClientRect().top) }));
  ok(!barra.header && barra.enFila >= 2, 'dentro del Dibujo no hay barra de arriba y sus botones están en la fila del dibujo (' + barra.enFila + ')');
  await p.evaluate(() => { document.querySelector('.mc-volver').click(); }); await p.waitForTimeout(300);
  ok(!!(await p.$('header.tv-header')) && !!(await p.$('.tv-brand')), 'en la pantalla de inicio la barra con el logo sigue estando');
  await p.evaluate(v => { localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, 0);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);

  const estado = () => p.evaluate(() => { vaciarGuardado();
    const d = JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0];
    return { n: d.objs.length, ultimo: d.objs[d.objs.length - 1], cmd: document.querySelector('.tv-dib-cmd').textContent.replace(/\s+/g, ' ').slice(0, 30) }; });
  const enPantalla = q => p.evaluate(c => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP(c); return { x: r.left + s.X, y: r.top + s.Y }; }, q);
  // v26: la cinta de comando flota arriba del lienzo; si un punto queda debajo, se corre la vista para poder tocarlo
  const bajoCinta = q => p.evaluate(c => { const cm = document.querySelector('.tv-dib-cmd'); if (!cm) return false;
    const r = cm.getBoundingClientRect(); return c.x > r.left - 8 && c.x < r.right + 8 && c.y > r.top - 8 && c.y < r.bottom + 8; }, q);
  const tocar = async q => { const s = await enPantalla(q); await p.mouse.click(s.x, s.y); await p.waitForTimeout(220); };
  const herr = async (g, id) => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(150); };
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(400);

  // ── v26: el espacio ganado y que la cinta flotante NO se robe los toques del dibujo ──
  const caja0 = await (await p.$('.tv-dib-svg')).boundingBox();
  const m26 = await p.evaluate(() => {
    const cmd = document.querySelector('.tv-dib-cmd'), svg = document.querySelector('.tv-dib-svg');
    const rc = cmd.getBoundingClientRect(), rs = svg.getBoundingClientRect();
    // cuánto del lienzo tapa la cinta, y qué hay bajo el dedo en los cuatro puntos cardinales del lienzo
    const prueba = [[0.5, 0.5], [0.5, 0.9], [0.1, 0.6], [0.9, 0.5]].map(([a, b]) => {
      const el = document.elementFromPoint(rs.left + rs.width * a, rs.top + rs.height * b);
      return el ? el.tagName : 'nada'; });
    return { tapa: Math.round(rc.width * rc.height / (rs.width * rs.height) * 100), prueba, flota: getComputedStyle(cmd).position };
  });
  ok(m26.flota === 'absolute' && m26.tapa < 18, 'la cinta de comando flota sobre el dibujo y tapa poco (' + m26.tapa + ' % del lienzo)');
  ok(m26.prueba.every(t => t === 'svg'), 'en el centro y los bordes del lienzo, el dedo llega al dibujo y no a la cinta (' + m26.prueba.join(', ') + ')');
  ok(caja0.height > 560, 'el lienzo gana alto con la barra fundida y la cinta flotando (' + Math.round(caja0.height) + ' px)');
  // el menú "⋯" guarda lo que antes ocupaba una fila entera, y todo sigue estando
  await p.click('.mc-mas'); await p.waitForTimeout(300);
  const enMas = await p.evaluate(() => [...document.querySelectorAll('.tv-dib-mas button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  ok(['Nuevo', '✎ Renombrar', 'Duplicar', 'Borrar', 'Importar puntos', 'Tabla de puntos', 'DXF', 'Claro', 'Oscuro'].every(t => enMas.some(x => x.includes(t))),
    'el menú ⋯ tiene nuevo, renombrar, duplicar, borrar, importar, tabla y DXF (' + enMas.length + ' botones)');
  await p.click('.tv-dib-mas button:has-text("Cerrar")'); await p.waitForTimeout(250);
  ok(!(await p.$('.tv-dib-mas')), 'el menú ⋯ se cierra');

  // ── apagado: la línea queda plana (como siempre) ──
  const apagado = await p.evaluate(() => localStorage.getItem('minicivil_dib3d') === 'true' ? 'true' : 'false');
  ok(apagado === 'false', 'el Dibujo 3D arranca apagado; lo prende Brian');
  await herr('dibujar', 'linea');
  await tocar(objs[0]); await tocar(objs[4]);
  const a1 = await estado();
  ok(a1.ultimo.t === 'l' && a1.ultimo.a.z === undefined && a1.ultimo.b.z === undefined, 'apagado: la línea se pega a los puntos pero no toma cotas');

  // ── prendido: la línea toma la cota de cada punto ──
  await p.click('.tv-dib-nav button[data-grupo=herramientas]'); await p.click('.tv-dib-hoja button[data-herr="@dib3d"]'); await p.waitForTimeout(250);
  ok((await p.evaluate(() => localStorage.getItem('minicivil_dib3d') === 'true' ? 'true' : 'false')) === 'true', '"Tomar cota de los puntos" (Herramientas) se prende');
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
  await tocar(objs[0]); await tocar(objs[3]);   // objs[0] es extremo de la línea de antes; los dos quedan abajo, lejos de la cinta
  const a5 = await estado();
  ok(Math.abs(a5.ultimo.a.z - z0) < 1e-9, 'pegándose al extremo de una línea que ya tiene cota, también la toma');

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
  await p.click('.tv-dib-nav button[data-grupo=herramientas]'); await p.click('.tv-dib-hoja button[data-herr="@dib3d"]'); await p.waitForTimeout(200);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  ok((await p.evaluate(() => localStorage.getItem('minicivil_dib3d') === 'true' ? 'true' : 'false')) === 'false', 'al recargar, el equipo se acuerda de que quedó apagado');

  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (dibujo 3D).');
  process.exit(fallas ? 1 : 0);
})();
