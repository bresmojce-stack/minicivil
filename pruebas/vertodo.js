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
  // v58: las presentaciones de un plano van en la pestaña Presentación, cada una en su pestaña abajo (como las "Sheets" de
  // AutoCAD); el Dibujo ve solo el modelo, y "Hojas para PDF" sigue en la misma pestaña
  ok(!(await p.$('.mc-pestanas-dib')), 'sin presentaciones no hay pestañas abajo');
  const lam = n => ({ id: 10 + n, nombre: 'VIAL ' + n + ' · presentación', sig: 1, objs: [{ id: 'm' + n, t: 'l', a: { x: 0, y: 0 }, b: { x: 0.4 * n, y: 0.3 } }] });
  const conPres = async tab => { await p.evaluate(([o, l, tab]) => { localStorage.setItem('minicivil', JSON.stringify([{ id: 1, nombre: 'V', creado: '', dibujos: [{ id: 2, nombre: 'Plano', sig: 1, objs: o }].concat(l) }]));
      localStorage.setItem('minicivil__t', String(Date.now() + 199999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab })); }, [grupo, [lam(1), lam(2)], tab]);
    await p.reload(); await p.waitForTimeout(500); };
  await conPres('dibujo'); await p.waitForSelector('.tv-dib-svg');
  const opDib = await p.$$eval('.mc-barra-dib select option', os => os.map(o => o.textContent));
  ok(!(await p.$('.mc-pestanas-dib')) && !opDib.some(t => /VIAL/.test(t)), 'en el Dibujo solo el modelo, sin las presentaciones (' + opDib.join(' | ') + ')');
  await conPres('presentacion'); await p.waitForSelector('.mc-pres-vistas'); await p.waitForSelector('.tv-dib-svg');
  const vistas = await p.$$eval('.mc-pres-vistas button', bs => bs.map(b => b.textContent));
  const tabs = await p.$$eval('.mc-pestanas-dib button', bs => bs.map(b => b.textContent + (b.getAttribute('aria-selected') === 'true' ? '*' : '')));
  await p.click('.mc-pestanas-dib button:has-text("VIAL 2")'); await p.waitForTimeout(300);
  const sel = await p.$eval('.mc-pestanas-dib button[aria-selected=true]', b => b.textContent);
  ok(/Presentaciones del plano \(2\)/.test(vistas[0]) && tabs.join('|') === 'VIAL 1*|VIAL 2' && sel === 'VIAL 2', 'en Presentación salen las presentaciones del plano con sus pestañas (' + vistas.join(' / ') + ' · ' + tabs.join(' | ') + ' → ' + sel + ')');
  await p.click('.mc-pres-vistas .mc-presvista-hojas'); await p.waitForTimeout(300);
  const hojas = !(await p.$('.mc-pestanas-dib')) && /primera hoja|Hoja/i.test(await p.textContent('main'));
  await p.click('.mc-pres-vistas .mc-presvista-plano'); await p.waitForTimeout(300);
  const guardado = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 600)); const v = JSON.parse(localStorage.getItem('minicivil') || '[]'); return v[0] ? v[0].dibujos.map(d => d.nombre).join('|') : ''; });
  ok(hojas && (await p.$('.mc-pestanas-dib')) && guardado === 'Plano|VIAL 1 · presentación|VIAL 2 · presentación', '"Hojas para PDF" sigue ahí, se vuelve a las presentaciones y no se pierde ningún dibujo (' + guardado + ')');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.'); process.exit(fallas ? 1 : 0);
})();
