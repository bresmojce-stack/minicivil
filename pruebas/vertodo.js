// v57: "Ver todo" encuadra donde está agrupado el dibujo: un objeto suelto a 50 km no deja el plano diminuto, y lo avisa.
//   node pruebas/vertodo.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  const abrir = async objs => {
    await p.evaluate(o => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify([{ id: 1, nombre: 'V', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 1, objs: o }] }]));
      localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, objs);
    await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);
    await p.evaluate(() => { window.__avisos = []; window.addEventListener('tv-aviso', e => window.__avisos.push(e.detail)); });
    await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(400);
    return p.evaluate(() => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), a = MC_DIB.aP({ x: 1000, y: 2000 }), z = MC_DIB.aP({ x: 1100, y: 2100 });
      return { ancho: Math.abs(z.X - a.X) / r.width, alto: Math.abs(z.Y - a.Y) / r.height, avisos: window.__avisos }; });
  };
  const grupo = []; for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) grupo.push({ id: 'g' + i + j, t: 'l', a: { x: 1000 + i * 10, y: 2000 + j * 10 }, b: { x: 1000 + i * 10 + 10, y: 2000 + j * 10 + 10 } });
  const r1 = await abrir(grupo.concat([{ id: 'lejos', t: 'p', x: 51000, y: 2000 }]));
  ok(Math.max(r1.ancho, r1.alto) > 0.6, 'con un punto suelto a 50 km, los 100 m del grupo llenan la pantalla (' + Math.round(Math.max(r1.ancho, r1.alto) * 100) + ' %)');
  ok(r1.avisos.some(t => /1 objeto suelto lejos/.test(t)), 'y avisa que quedó fuera (' + JSON.stringify(r1.avisos) + ')');
  const r2 = await abrir(grupo);
  ok(Math.max(r2.ancho, r2.alto) > 0.6 && !r2.avisos.length, 'sin nada suelto, igual que siempre y sin aviso');
  const dos = grupo.concat(grupo.map(o => ({ ...o, id: o.id + 'b', a: { x: o.a.x + 3000, y: o.a.y }, b: { x: o.b.x + 3000, y: o.b.y } })));
  const r3 = await abrir(dos);
  ok(r3.ancho < 0.1 && !r3.avisos.length, 'dos grupos iguales a 3 km: se ven los dos, no deja ninguno fuera');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.'); process.exit(fallas ? 1 : 0);
})();
