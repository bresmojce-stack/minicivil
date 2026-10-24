// Dibujo con el dedo (boceto aprobado por Brian): arrastrar un dedo mueve la vista en cualquier herramienta,
// un toque corto pone el punto (pegado al imán) y, si el dedo se queda quieto, sale la lupa para apuntar fino.
//   node pruebas/dedo.js [index.html]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +(process.env.W || 1000), height: 700 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  // cuadrícula de puntos cada 10 m, para que haya imanes
  const objs = []; for (let i = 0; i < 25; i++) objs.push({ id: i + 1, t: 'p', x: 1000000 + (i % 5) * 10, y: 900000 + Math.floor(i / 5) * 10, nom: String(i + 1) });
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 26, objs }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(p);
  const toque = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
  const caja = await (await p.$('.tv-dib-svg')).boundingBox(), cx = caja.x + caja.width / 2, cy = caja.y + caja.height / 2;
  const herr = async (g, id) => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(150); };
  const estado = () => p.evaluate(() => { vaciarGuardado();
    const d = JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0];
    return { n: d.objs.length, ultimo: d.objs[d.objs.length - 1], cmd: document.querySelector('.tv-dib-cmd').textContent.replace(/\s+/g, ' ').slice(0, 22),
      escala: document.querySelector('.tv-dib-escala div').textContent.trim(), lupa: !!document.querySelector('.tv-dib-lupa') }; });
  const arrastrar = async (x0, y0, dx, dy, pausa) => {
    await toque('touchStart', [[x0, y0]]);
    if (pausa) await p.waitForTimeout(pausa);
    for (let i = 1; i <= 8; i++) { await toque('touchMove', [[x0 + dx * i / 8, y0 + dy * i / 8]]); await p.waitForTimeout(16); }
    await toque('touchEnd', []); await p.waitForTimeout(350);
  };
  const tocarCorto = async (x, y) => { await toque('touchStart', [[x, y]]); await p.waitForTimeout(70); await toque('touchEnd', []); await p.waitForTimeout(350); };

  await herr('dibujar', 'linea');
  const unPunto = () => p.evaluate(() => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP({ x: 1000000, y: 900000 }); return { x: r.left + s.X, y: r.top + s.Y }; });
  const libres0 = await unPunto();
  const a0 = await estado();
  // 1. arrastrar un dedo con la herramienta Línea: mueve la vista y no dibuja
  await arrastrar(cx - 120, cy - 60, 220, 110);
  const a1 = await estado();
  ok(a1.n === a0.n && /primer punto/.test(a1.cmd), 'arrastrar un dedo con Línea no dibuja (' + a1.n + ' objetos, "' + a1.cmd.trim() + '")');
  // puntos que estén a la vista y lejos de los botones flotantes (abajo a la derecha) y de la barra de escala
  // los puntos se pintan en la imagen de fondo: su sitio lo da MC_DIB.aP (cuadrícula de 5 x 5 cada 10 m desde 1000000/900000)
  const tocables = () => p.evaluate(c => {
    const cm = document.querySelector('.tv-dib-cmd'), rc = cm && cm.getBoundingClientRect();
    const enCinta = (x, y) => !!rc && x > rc.left - 8 && x < rc.right + 8 && y > rc.top - 8 && y < rc.bottom + 8;
    const rb = document.querySelector('.mc-rapida').getBoundingClientRect();   // v37: barra rápida
    const enBarra = (x, y) => x > rb.left - 12 && y > rb.top - 12 && y < rb.bottom + 12;
    const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), l = [];
    for (let i = 0; i < 25; i++) { const s = MC_DIB.aP({ x: 1000000 + (i % 5) * 10, y: 900000 + Math.floor(i / 5) * 10 });
      l.push({ nom: String(i + 1), x: r.left + s.X, y: r.top + s.Y }); }
    return l.filter(q => q.x > c.x + 20 && q.x < c.x + c.width - 20 && q.y > c.y + 20 && q.y < c.y + c.height - 20
      && !enBarra(q.x, q.y)                                             // barra rápida
      && !(q.x < c.x + 230 && q.y > c.y + c.height - 60)                // barra de escala
      && !enCinta(q.x, q.y)); }, caja);                                 // v26: la cinta de comando flota arriba
  let libres = await tocables();
  ok(Math.hypot(libres0.x - (await unPunto()).x, libres0.y - (await unPunto()).y) > 40, 'el dibujo se corrió con el dedo');
  if (libres.length < 2) {   // en pantallas angostas el arrastre puede dejarlos casi afuera: se encuadra todo
    await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(400); libres = await tocables();
    await herr('dibujar', 'linea');
  }
  ok(libres.length >= 2, 'quedan puntos a la vista para tocarlos (' + libres.length + ')');
  const movido = libres[0], otro = libres[1];
  // 2. toque corto: pone el primer punto, pegado al punto de al lado (imán)
  await tocarCorto(movido.x + 4, movido.y - 3);
  const a2 = await estado();
  ok(/segundo punto/.test(a2.cmd) && a2.n === a0.n, 'un toque corto pone el primer punto de la línea ("' + a2.cmd.trim() + '")');
  // 3. otro toque corto cierra la línea, y queda pegada a los dos puntos (imán)
  await tocarCorto(otro.x - 3, otro.y + 4);
  const a3 = await estado(), L = a3.ultimo;
  const esPunto = (q, n) => { const i = +n - 1; return Math.abs(q.x - (1000000 + (i % 5) * 10)) < 0.01 && Math.abs(q.y - (900000 + Math.floor(i / 5) * 10)) < 0.01; };
  const pegada = L && L.t === 'l' && esPunto(L.a, movido.nom) && esPunto(L.b, otro.nom);
  ok(a3.n === a0.n + 1 && pegada, 'los dos toques dejan la línea pegada a los puntos ' + movido.nom + ' y ' + otro.nom + ' (imán)');
  // 4. dedo quieto: sale la lupa, se ajusta y al soltar el punto queda donde apuntó
  await herr('dibujar', 'punto');
  await toque('touchStart', [[cx + 30, cy + 40]]); await p.waitForTimeout(500);
  const conLupa = await estado();
  ok(conLupa.lupa, 'con el dedo quieto sale la lupa para apuntar');
  for (let i = 1; i <= 6; i++) { await toque('touchMove', [[cx + 30 + 3 * i, cy + 40 - 2 * i]]); await p.waitForTimeout(16); }
  const enLupa = await estado();
  ok(enLupa.escala === conLupa.escala, 'con la lupa abierta el arrastre apunta y no mueve la vista');
  await toque('touchEnd', []); await p.waitForTimeout(400);
  const a4 = await estado();
  ok(a4.n === a3.n + 1 && a4.ultimo.t === 'p', 'al soltar la lupa queda el punto puesto (' + a4.n + ' objetos)');
  // 6. Seleccionar varios conserva su recuadro
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(400);   // todos a la vista: el recuadro no depende de dónde quedó la vista
  await herr('editar', 'seleccionar');
  // el recuadro se hace alrededor de puntos que están a la vista
  const zona = await p.evaluate(() => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), qs = [];
    for (let i = 0; i < 25; i++) { const s = MC_DIB.aP({ x: 1000000 + (i % 5) * 10, y: 900000 + Math.floor(i / 5) * 10 }); qs.push({ x: r.left + s.X, y: r.top + s.Y }); }
    const xs = qs.map(q => q.x), ys = qs.map(q => q.y); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; });
  const cj = await (await p.$('.tv-dib-svg')).boundingBox();   // el recuadro tiene que empezar y acabar DENTRO del lienzo
  const cinta = await p.evaluate(() => { const c = document.querySelector('.tv-dib-cmd'); if (!c) return 0; const r = c.getBoundingClientRect(); return r.bottom + 8; });
  const ax = Math.max(cj.x + 6, zona.x0 - 12), ay = Math.max(cj.y + 6, cinta, zona.y0 - 12);
  const bx = Math.min(cj.x + cj.width - 6, zona.x1 + 12), by = Math.min(cj.y + cj.height - 6, zona.y1 + 12);
  await arrastrar(ax, ay, bx - ax, by - ay);
  const sel = await p.evaluate(() => document.querySelector('.tv-dib-cmd').textContent.replace(/\s+/g, ' '));
  const marcados = await p.$$eval('.tv-dib-capa [stroke="#F59E0B"], .tv-dib-capa [fill="#F59E0B"]', e => e.length);
  ok(/elegid|\(\d+\)/.test(sel) || marcados > 0, 'Seleccionar varios sigue haciendo el recuadro con el dedo ("' + sel.trim().slice(0, 44) + '")');
  // 7. la pluma sigue dibujando a mano alzada
  await herr('dibujar', 'pluma');
  const n7 = (await estado()).n;
  await arrastrar(cx - 80, cy + 60, 160, -40);
  const a7 = await estado();
  ok(a7.n === n7 + 1 && a7.ultimo.t === 'fh', 'la pluma sigue dibujando a mano alzada con el dedo');

  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (dedo).');
  process.exit(fallas ? 1 : 0);
})();
