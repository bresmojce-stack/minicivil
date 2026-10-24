// Dibujo: mover y acercar sin que queden restos de la imagen anterior (Brian, tablet y celular: "va dejando la imagen residual").
//   node pruebas/zoom.js [index.html]
// Desde la v19 la cuadrícula y los puntos se pintan en una imagen (canvas) que se borra entera en cada cuadro, y el svg de encima
// solo lleva lo que se está editando. Aquí se revisa: que nada quede movido ni escalado a mano, que el punto mida lo mismo en la
// imagen antes/durante/después del gesto, que solo se pinte lo que cabe en la pantalla, que una nube de puntos no cree miles de
// piezas en el svg, el pellizco con un dedo fuera del lienzo y "Regenerar imagen".
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
  // nada movido ni escalado a mano: ni el grupo del svg ni la imagen de fondo llevan transform
  const sinTransform = p => p.evaluate(() => {
    const g = document.querySelector('.tv-dib-capa'), c = document.querySelector('.tv-dib-fondo');
    if (!c || g.getAttribute('transform') || getComputedStyle(g).transform !== 'none') return false;
    if (getComputedStyle(c).transform !== 'none' || c.style.transform) return false;
    return [...g.children].every(e => getComputedStyle(e).transform === 'none' && !e.style.transform);
  });
  const escalaBarra = p => p.$eval('.tv-dib-escala div', e => e.textContent.trim());
  // lo que la app pintó en la imagen de fondo en el último cuadro: cuántos puntos y cuántos textos
  const pintado = p => p.evaluate(() => ({ pts: MC_DIB.pts, txt: MC_DIB.txt }));
  const enPantalla = (p, q) => p.evaluate(q => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP(q); return { x: r.left + s.X, y: r.top + s.Y }; }, q);

  // ── PC: rueda del mouse ──
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await abrir(p, objs);
  const bb = await (await p.$('.tv-dib-svg')).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const rueda = (n, q) => p.evaluate(([n, q]) => { const s = document.querySelector('.tv-dib-svg'), r = s.getBoundingClientRect();
    const X = q ? q.x : r.left + r.width / 2, Y = q ? q.y : r.top + r.height / 2;
    for (let i = 0; i < n; i++) s.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: X, clientY: Y, bubbles: true, cancelable: true })); }, [n, q]);
  const escala0 = await escalaBarra(p), p0 = await pintado(p);
  await rueda(4); await p.waitForTimeout(60);   // sin soltar nada: ya debe estar pintado de nuevo
  const enGesto = { escala: await escalaBarra(p), ...(await pintado(p)), limpio: await sinTransform(p) };
  ok(enGesto.escala !== escala0, 'con la rueda el dibujo queda pintado de nuevo en el acto (' + escala0 + ' → ' + enGesto.escala + ')');
  ok(enGesto.limpio, 'nada queda movido ni escalado a mano: la imagen se borra y se pinta entera (sin restos)');
  ok(p0.txt > 0 && enGesto.txt > 0, 'los puntos que quedan a la vista llevan su texto mientras acerca (' + p0.txt + ' → ' + enGesto.txt + ' textos)');
  ok(await p.evaluate(() => !!document.querySelector('.tv-dib-fondo') && document.querySelectorAll('.tv-dib-capa .tv-pt').length === 0),
    'los puntos van en la imagen de fondo, no en piezas sueltas del svg');
  // solo se pinta lo que cabe en la pantalla, y al encuadrar vuelve a estar todo
  await p.evaluate(() => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 4, nombre: 'Lejos', sig: 9, objs: [
    { id: 1, t: 'p', x: 1000000, y: 900000, nom: 'cerca' }, { id: 2, t: 'p', x: 1000010, y: 900000, nom: 'cerca2' },
    { id: 3, t: 'p', x: 1004000, y: 900000, nom: 'lejos' }] }] }]); }); await p.waitForTimeout(600);
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(500);
  ok((await pintado(p)).pts === 3, 'al encuadrar todo se pintan los tres puntos');
  const sitio = await enPantalla(p, { x: 1000000, y: 900000 });
  await p.mouse.move(sitio.x, sitio.y); await rueda(6, sitio); await p.waitForTimeout(400);   // acercar sobre "cerca"
  ok((await pintado(p)).pts === 2, 'lo que queda fuera de la pantalla no se pinta (2 de 3 puntos)');
  // 300 puntos juntos: de lejos sin textos (no se amontonan) y al acercar con sus textos
  let sem = 7; const rnd = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
  const loma = []; for (let i = 0; i < 300; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 60; loma.push({ id: i + 1, t: 'p', x: 1000060 + r * Math.cos(a), y: 1000060 + r * Math.sin(a), z: 1500, nom: String(i + 1), d: 'TN' }); }
  await p.evaluate(v => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 3, nombre: 'Loma', sig: 301, objs: v }] }]); }, loma); await p.waitForTimeout(500);
  const lejos = await pintado(p);
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await rueda(6); await p.waitForTimeout(400);
  const cerca = await pintado(p);
  ok(lejos.txt / lejos.pts < 0.3 && cerca.txt / cerca.pts > 1.5, 'de lejos los puntos juntos van sin texto y al acercar lo llevan: ' +
    lejos.txt + '/' + lejos.pts + ' → ' + cerca.txt + '/' + cerca.pts + ' (textos/puntos)');
  // v21: de lejos, sin textos, las marcas de los puntos SE VEN de verdad en la pantalla (antes eran un trazo de largo cero con
  // punta redonda: el Chrome del computador lo pintaba, el navegador del celular de Brian no, y la pantalla quedaba vacía)
  const rojos = async pg => {
    const bz = await (await pg.$('.tv-dib-svg')).boundingBox();
    const png = await pg.screenshot({ clip: { x: bz.x, y: bz.y, width: bz.width, height: bz.height } });
    return pg.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 110) n++;   // rojo del punto (#DC2626)
      return n;
    }, png.toString('base64'));
  };
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(600);   // todos a la vista: de lejos, sin textos
  const nLejos = await pintado(p), pxLejos = await rojos(p);
  ok(nLejos.txt / nLejos.pts < 0.3 && pxLejos > 2000, 'de lejos, sin textos, las marcas de los puntos se ven en la pantalla (' + pxLejos + ' píxeles de marca, ' + nLejos.txt + '/' + nLejos.pts + ' textos/puntos)');
  // 1200 puntos: todos en la imagen y el svg casi vacío (antes eran miles de piezas sueltas)
  const nube = []; for (let i = 0; i < 1200; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 40; nube.push({ id: i + 1, t: 'p', x: 1000060 + r * Math.cos(a), y: 1000060 + r * Math.sin(a), z: 1500, nom: String(i + 1), col: '#0891B2' }); }
  await p.evaluate(v => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 5, nombre: 'Nube', sig: 1201, objs: v }] }]); }, nube); await p.waitForTimeout(600);
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(600);
  // en el svg solo quedan los defs (las tramas de los sombreados), nada por punto
  const conNube = await pintado(p), piezas = await p.$$eval('.tv-dib-capa > *:not(defs)', e => e.length);
  ok(conNube.pts > 1000 && piezas === 0, '1200 puntos: todos en la imagen y ninguna pieza suelta en el svg (' + conNube.pts + ' puntos pintados)');
  // y se pueden seguir tocando y eligiendo
  await p.click('.tv-dib-nav button[data-grupo=editar]'); await p.click('.tv-dib-hoja button[data-herr="elegir"]'); await p.waitForTimeout(200);
  const uno = await enPantalla(p, nube[0]);
  await p.mouse.click(uno.x, uno.y); await p.waitForTimeout(400);
  const panelSel = await p.$('.tv-dib-panel');
  ok(!!panelSel && /PUNTO/i.test(await panelSel.innerText()), 'un punto de la nube se puede tocar y elegir');
  // v21: la marca del punto elegido es un círculo de verdad, no una raya de largo cero (esa no se pinta en algunos navegadores)
  const marca = await p.evaluate(() => { const e = document.querySelector('.tv-dib-capa .tv-pt'); if (!e) return 'no hay marca';
    return e.tagName.toLowerCase() === 'circle' ? 'circle' : e.tagName.toLowerCase() + (e.getAttribute('x1') === e.getAttribute('x2') ? ' de largo cero' : ''); });
  ok(marca === 'circle', 'la marca del punto elegido es un círculo relleno (' + marca + ')');
  await p.close();

  // ── tablet con los dedos ──
  const ctx = await b.newContext({ viewport: { width: 1000, height: 625 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const t = await ctx.newPage(); await abrir(t, objs);
  const cdp = await ctx.newCDPSession(t);
  const toque = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
  const caja = await (await t.$('.tv-dib-svg')).boundingBox(), cx = caja.x + caja.width / 2, cy = caja.y + caja.height / 2;
  const punto12 = { x: 1000000 + 10, y: 900000 + 20 };   // el punto 12, junto al centro
  const donde = () => enPantalla(t, punto12);
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
  const q0 = await donde(), d0 = await diametro(q0), e0 = await escalaBarra(t);
  await toque('touchStart', [[cx - 40, cy], [cx + 40, cy]]);
  for (let i = 1; i <= 10; i++) { await toque('touchMove', [[cx - 40 - 8 * i, cy], [cx + 40 + 8 * i, cy]]); await t.waitForTimeout(16); }
  const enPellizco = { escala: await escalaBarra(t), limpio: await sinTransform(t) };
  const q1 = await donde(), d1 = await diametro(q1);
  const gAntes = await t.evaluateHandle(() => document.querySelector('.tv-dib-capa'));
  await toque('touchEnd', []); await t.waitForTimeout(400);
  const q2 = await donde(), d2 = await diametro(q2);
  // v20: al soltar, el dibujo se arma de nuevo solo (como "Regenerar imagen", sin tocar el botón)
  ok(await t.evaluate(g => document.querySelector('.tv-dib-capa') !== g && document.querySelector('.tv-dib-capa').isConnected, gAntes),
    'al soltar el pellizco el dibujo se arma de nuevo solo');
  ok(enPellizco.escala !== e0 && enPellizco.limpio, 'con los dedos el dibujo se pinta de nuevo mientras el gesto va (' + e0 + ' → ' + enPellizco.escala + ')');
  ok(Math.abs(d1 - d0) < 1.2 && Math.abs(d2 - d0) < 1.2 && d0 > 6, 'el punto mide lo mismo en la imagen antes, durante y después: ' + [d0, d1, d2].map(v => v.toFixed(1)).join(' / ') + ' px');
  ok(Math.hypot(q1.x - q2.x, q1.y - q2.y) < 1.5, 'al soltar el punto queda donde lo dejó el gesto (se movió ' + Math.hypot(q1.x - q2.x, q1.y - q2.y).toFixed(2) + ' px)');
  // mover la vista con un dedo (mano): el dibujo se repinta corrido y la escala no cambia
  await t.click('[data-accion="mano"]');
  const antesMano = await donde();
  await toque('touchStart', [[cx, cy]]); for (let i = 1; i <= 6; i++) { await toque('touchMove', [[cx + 12 * i, cy + 6 * i]]); await t.waitForTimeout(16); }
  const enMano = { punto: await donde(), escala: await escalaBarra(t), limpio: await sinTransform(t) };
  const gMano = await t.evaluateHandle(() => document.querySelector('.tv-dib-capa'));
  await toque('touchEnd', []); await t.waitForTimeout(300);
  ok(await t.evaluate(g => document.querySelector('.tv-dib-capa') !== g && document.querySelector('.tv-dib-capa').isConnected, gMano),
    'al soltar después de mover con el dedo el dibujo también se arma de nuevo solo');
  await t.click('[data-accion="mano"]'); await t.waitForTimeout(200);
  ok(enMano.limpio && enMano.escala === (await escalaBarra(t)) && Math.hypot(enMano.punto.x - antesMano.x, enMano.punto.y - antesMano.y) > 40,
    'al moverse con un dedo el dibujo se repinta corrido, sin escalar nada');
  // pellizco con un dedo en un botón o en la barra de abajo: aleja igual y no pone ningún punto
  const guardados = () => t.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs.length; });
  await toque('touchStart', [[cx - 120, cy + 30]]); await toque('touchEnd', []); await t.waitForTimeout(300);   // primer punto de una línea
  const antes = { n: await guardados(), escala: await escalaBarra(t), cmd: await t.textContent('.tv-dib-cmd') };
  const fuera = async (sel, nombre) => {
    const bt = await (await t.$(sel)).boundingBox(), bx = bt.x + bt.width / 2, by = bt.y + bt.height / 2, ax = cx - 150, ay = cy - 60;
    await toque('touchStart', [[ax, ay], [bx, by]]);
    for (let i = 1; i <= 10; i++) { await toque('touchMove', [[ax + (bx - ax) * 0.04 * i, ay + (by - ay) * 0.04 * i], [bx - (bx - ax) * 0.02 * i, by - (by - ay) * 0.02 * i]]); await t.waitForTimeout(16); }
    const e = await escalaBarra(t); await toque('touchEnd', []); await t.waitForTimeout(400);
    ok(e !== antes.escala, 'pellizco con un dedo en ' + nombre + ': el dibujo se aleja durante el gesto (' + antes.escala + ' → ' + e + ')');
  };
  await fuera('[data-accion="deshacer"]', 'el botón Quitar punto');
  await fuera('.tv-dib-nav [data-grupo]:nth-child(4)', 'la barra de abajo');
  const despues = { n: await guardados(), escala: await escalaBarra(t), cmd: await t.textContent('.tv-dib-cmd'), hoja: !!(await t.$('.tv-dib-hoja')), quitar: await t.getAttribute('[data-accion="deshacer"]', 'title') };
  ok(despues.n === antes.n && /segundo punto/.test(despues.cmd) && /Quitar el último punto/.test(despues.quitar), 'esos pellizcos no ponen puntos ni líneas y no quitan el punto que ya estaba (' + despues.n + ' objetos)');
  ok(!despues.hoja && despues.escala !== antes.escala, 'el dedo de afuera no abre la barra de herramientas y la vista sí cambió (' + antes.escala + ' → ' + despues.escala + ')');
  // Regenerar imagen: el dibujo se arma de nuevo y se ve igual
  const g0 = await t.evaluateHandle(() => document.querySelector('.tv-dib-capa')), n0 = (await pintado(t)).pts;
  await t.click('.tv-dib-nav button[data-grupo=herramientas]'); await t.click('.tv-dib-hoja button[data-herr="@regenerar"]'); await t.waitForTimeout(300);
  ok(await t.evaluate(g => document.querySelector('.tv-dib-capa') !== g && document.querySelector('.tv-dib-capa').isConnected, g0) && (await pintado(t)).pts === n0,
    'Regenerar imagen arma el dibujo de nuevo (' + n0 + ' puntos)');

  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (zoom).');
  process.exit(fallas ? 1 : 0);
})();
