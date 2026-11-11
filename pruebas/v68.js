// v68 (Brian): un punto puesto a mano sobre una línea se elige al tocarlo (antes salía el panel de la línea, con
// Mover/Copiar/Girar, y no se podía poner la cota), y el punto escrito con "Escribir" lleva cota opcional.
//   node pruebas/v68.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || require('path').join(__dirname, 'pw.js'));
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 760 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999));
    sessionStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 10, objs: [{ id: 5, t: 'p', x: 0, y: 0, nom: '1' }, { id: 6, t: 'p', x: 100, y: 100, nom: '2' }] }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(400);
  const scr = q => p.evaluate(c => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP(c); return { x: r.left + s.X, y: r.top + s.Y }; }, q);
  const tap = async (x, y) => { if (movil) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await p.waitForTimeout(300); };
  const tocar = async q => { const s = await scr(q); await tap(s.x, s.y); };
  const herr = async (g, id) => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(150); };
  const objs = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs; });
  const panel = () => p.evaluate(() => { const t = [...document.querySelectorAll('div')].find(d => /^(PUNTO|LÍNEA)$/.test(d.textContent.trim())); return t ? t.textContent.trim() : ''; });

  // el caso de Brian: una línea y, encima, un punto puesto a mano
  await herr('dibujar', 'linea'); await tocar({ x: 20, y: 20 }); await tocar({ x: 80, y: 60 });
  await herr('dibujar', 'punto'); await tocar({ x: 50, y: 40 }); await tocar({ x: 80, y: 60 });
  const o1 = await objs();
  ok(o1.filter(o => o.t === 'p').length === 4 && o1.some(o => o.t === 'l'), 'línea y dos puntos a mano (uno en medio y otro en su extremo)');
  await herr('editar', 'elegir');
  await tocar({ x: 50, y: 40 });
  if (process.env.FOTO) await p.screenshot({ path: process.env.FOTO });
  ok((await panel()) === 'PUNTO', 'tocar el punto que está sobre la línea abre el panel del PUNTO (' + (await panel()) + ')');
  // poner la cota en el panel
  const cota = await p.evaluateHandle(() => [...document.querySelectorAll('span')].filter(d => d.textContent.trim() === 'Cota').map(d => d.parentElement.querySelector('input')).find(Boolean));
  await cota.asElement().fill('1523.456'); await cota.asElement().press('Enter'); await p.waitForTimeout(400);
  const pz = (await objs()).filter(o => o.t === 'p').sort((a, c) => Math.hypot(a.x - 50, a.y - 40) - Math.hypot(c.x - 50, c.y - 40))[0];
  ok(pz && pz.z === 1523.456, 'la cota escrita queda en el punto (' + (pz && pz.z) + ')');
  ok((await objs()).find(o => o.t === 'l').a.z === undefined, 'la línea no se toca');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await tocar({ x: 80, y: 60 });
  ok((await panel()) === 'PUNTO', 'el punto en el extremo de la línea también se elige');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // cerrar el panel (en el celular tapa la línea)
  await p.evaluate(() => { const t = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === 'PUNTO');
    const x = t && t.parentElement.querySelector('button'); if (x) x.click(); }); await p.waitForTimeout(250);
  await tocar({ x: 35, y: 30 });
  ok((await panel()) === 'LÍNEA', 'tocando la línea lejos del punto se sigue eligiendo la línea');

  // punto escrito con cota
  await herr('dibujar', 'punto');
  await p.click('.tv-dib-cmd button:has-text("Escribir")'); await p.waitForTimeout(250);
  const campos = await p.$$('form input');
  await campos[0].fill('70'); await campos[1].fill('10'); await campos[2].fill('1499.5');
  await p.click('form button[type=submit]'); await p.waitForTimeout(400);
  const pe = (await objs()).find(o => o.t === 'p' && o.x === 10 && o.y === 70);
  ok(pe && pe.z === 1499.5, 'el punto escrito con Norte, Este y Cota queda con su cota (' + (pe && pe.z) + ')');
  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  console.log(fallas ? fallas + ' FALLA(S)' : 'Todo bien'); process.exit(fallas ? 1 : 0);
})();
