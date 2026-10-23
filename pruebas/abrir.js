// Prueba mínima: la app abre, se crea un proyecto y un dibujo, se dibuja, se guarda y vuelve al recargar; solo Claro y Oscuro.
//   node pruebas/abrir.js [index.html]        (W=390 para celular; por defecto PC 1280)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  p.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('minicivil'); }); await p.reload(); await p.waitForSelector('header.tv-header');
  ok(/^Mini Civil v\d+$/.test(await p.title()), 'título: ' + await p.title());
  ok((await p.textContent('.tv-brand')).includes('Mini Civil'), 'encabezado dice Mini Civil');
  // proyecto nuevo
  await p.fill('form input', 'Lote prueba'); await p.click('form button[type=submit]'); await p.waitForTimeout(300);
  await p.click('button:has-text("Crear el primer dibujo")'); await p.waitForTimeout(400);
  ok(await p.$('.tv-dib-svg') !== null, 'el lienzo del dibujo abre');
  ok(!(await p.textContent('body')).includes('→ Vía'), 'no hay botón "→ Vía"');
  const herr = async (g, id) => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(100); };
  await p.click('.tv-dib-nav button[data-grupo=dibujar]');
  ok(!(await p.$('.tv-dib-hoja button[data-herr="@eje"]')), 'no está "Eje de la vía" en Dibujar');
  await p.click('.tv-dib-nav button[data-grupo=dibujar]');
  // dos puntos escritos y una línea entre ellos con imanes
  await herr('dibujar', 'punto');
  await p.click('.tv-dib-cmd button:has-text("Escribir")');
  for (const [n, e] of [['1000', '1000'], ['1030', '1040']]) {
    await p.fill('.tv-dib-teclado input[placeholder="1000.000"] >> nth=0', n); await p.fill('.tv-dib-teclado input[placeholder="1000.000"] >> nth=1', e);
    await p.click('.tv-dib-teclado button[type=submit]'); await p.waitForTimeout(150);
  }
  await p.click('.tv-dib-teclado button:has-text("Cerrar")');
  await herr('ver', '@todo'); await p.waitForTimeout(150);
  // los puntos se pintan en la imagen de fondo: su sitio en la pantalla lo da MC_DIB.aP (norte, este → píxeles del lienzo)
  const pts = await p.evaluate(() => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect();
    return [{ x: 1000, y: 1000 }, { x: 1040, y: 1030 }].map(q => { const s = MC_DIB.aP(q); return [r.left + s.X, r.top + s.Y]; }); });
  await herr('dibujar', 'linea');
  for (const [x, y] of pts) { if (movil) await p.touchscreen.tap(x + 3, y - 3); else await p.mouse.click(x + 3, y - 3); await p.waitForTimeout(120); }
  const datos = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil')); });
  let d = await datos();
  const objs = d[0].dibujos[0].objs;
  const L = objs.find(o => o.t === 'l');
  ok(objs.filter(o => o.t === 'p').length === 2 && L && L.a.x === 1000 && L.b.y === 1030, 'dos puntos y la línea pegada a ellos: ' + JSON.stringify(L && [L.a, L.b]));
  // DXF
  await p.click('.mc-mas'); await p.waitForTimeout(250);   // v26: DXF está en el menú "⋯"
  await p.click('.mc-mas-dxf'); await p.waitForTimeout(200);
  ok((await p.textContent('body')).includes('DXF listo para AutoCAD'), 'la ventana del DXF abre');
  await p.keyboard.press('Escape'); const cerrar = await p.$('button:has-text("Cerrar")'); if (cerrar) await cerrar.click();
  // solo Claro y Oscuro: el botón de la barra va de uno al otro
  const temas = [];
  for (let i = 0; i < 4; i++) { await p.click('button[data-accion=tema]'); await p.waitForTimeout(80); temas.push(await p.evaluate(() => document.documentElement.getAttribute('data-tema'))); }
  ok(temas.join() === 'oscuro,claro,oscuro,claro', 'el botón de tema alterna Claro y Oscuro: ' + temas.join());
  // celular: sin desplazamiento de lado
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  // recargar: el proyecto y el dibujo siguen
  await p.reload(); await p.waitForSelector('.tv-dib-svg');
  d = await datos();
  ok(d.length === 1 && d[0].nombre === 'Lote prueba' && d[0].dibujos[0].objs.length === 3, 'al recargar sigue el proyecto con sus 3 objetos');
  ok(await p.evaluate(() => localStorage.getItem('topovias_standalone') === null), 'no toca los datos de TopoVías');
  await p.click('.mc-volver');  await p.waitForTimeout(150);   // v26: el botón de volver es la flecha ‹ de la barra del dibujo
  ok(JSON.stringify(await p.$$eval('[data-tema-btn]', bs => bs.map(x => x.dataset.temaBtn))) === '["claro","oscuro"]', 'el inicio ofrece solo Claro y Oscuro');
  await p.evaluate(() => { localStorage.setItem('minicivil_tema', 'fuego'); }); await p.reload(); await p.waitForSelector('header.tv-header');
  ok(await p.evaluate(() => document.documentElement.getAttribute('data-tema')) !== 'fuego', 'un tema apagado guardado no se usa');
  ok((await p.textContent('.mc-proyecto')).includes('1 dibujo · 3 objetos'), 'la tarjeta del proyecto resume: ' + await p.textContent('.mc-proyecto'));
  // Drive: botón de la barra grande y con texto (también en celular) y tarjeta en el inicio; los dos abren la ventana
  const bn = await p.$eval('header button.tv-nube', e => ({ alto: Math.round(e.getBoundingClientRect().height), txt: e.innerText.trim() }));
  ok(bn.alto >= 40 && bn.txt === 'Drive', 'botón de Drive en la barra: ' + bn.alto + ' px de alto, dice "' + bn.txt + '"');
  await p.click('header button.tv-nube'); await p.waitForTimeout(150);
  ok(!!(await p.$('.tv-panel-nube')), 'el botón de la barra abre la ventana de Drive');
  await p.click('.tv-panel-nube button[aria-label=Cerrar]');
  await p.click('button:has-text("Conectar con Google Drive")'); await p.waitForTimeout(150);
  ok(!!(await p.$('.tv-panel-nube')), 'la tarjeta del inicio abre la ventana de Drive');
  await p.click('.tv-panel-nube button[aria-label=Cerrar]');
  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
