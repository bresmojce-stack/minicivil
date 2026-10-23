// Perfil longitudinal (v27): el terreno a lo largo de la línea de las secciones, con números de resultado conocido.
// Terreno de prueba: plano con 2 % a lo largo de x (z = 100 + 0.02·x) y una loma en otra superficie, para ver dos líneas.
//   node pruebas/perfil.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  const objs = []; let n = 1;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 4; j++) objs.push({ id: n, t: 'p', x: i * 20, y: j * 10, z: 100 + 0.02 * (i * 20), nom: String(n++), d: 'TN' });
  // segunda superficie: 1 m por debajo, solo en la mitad de la vía (de x = 0 a 100): el perfil debe cortarse ahí
  for (let i = 0; i <= 5; i++) for (let j = 0; j <= 4; j++) objs.push({ id: n, t: 'p', x: i * 20, y: j * 10, z: 99 + 0.02 * (i * 20), nom: String(n++), d: 'SR' });
  objs.push({ id: 'eje', t: 'pl', v: [{ x: 0, y: 20 }, { x: 200, y: 20 }] });
  const proy = [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 200, objs }],
    superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' },
      { id: 222, nombre: 'Subrasante', fuente: { tipo: 'desc', descs: ['SR'] }, color: '#B45309', curvas: '' }],
    secciones: { linea: { dibId: 2, objId: 'eje' }, paso: '20', izq: '10', der: '10', arriba: 111, abajo: 222 } }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999));
    localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'secciones' })); }, proy);
  await p.reload(); await p.waitForSelector('.mc-perfil'); await p.waitForTimeout(500);

  // ── 1. el cálculo, con números que se pueden comprobar a mano ──
  const r = await p.evaluate(() => {
    const proy = HIST.actual.proyectos[0], cfg = cfgSecc(proy), P = perfilLargo(proy, cfg);
    const z = (id, a) => { let mej = null, d = 1e9; (P.perf[id] || []).flat().forEach(q => { const dd = Math.abs(q.a - a); if (dd < d) { d = dd; mej = q; } }); return mej; };
    const hastaSR = Math.max(...(P.perf[222] || []).flat().map(q => q.a));
    return { largo: P.largo, a0: P.a0, a1: P.a1, z0: P.z0, z1: P.z1,
      tn0: z(111, 0), tn100: z(111, 100), tn200: z(111, 200), sr0: z(222, 0), hastaSR,
      exagAncha: exagPerfil(P, 600, 200), exagAngosta: exagPerfil(P, 300, 160) };
  });
  ok(Math.abs(r.largo - 200) < 1e-6 && Math.abs(r.a0) < 1e-9 && Math.abs(r.a1 - 200) < 1e-6, 'el perfil recorre la línea entera: largo ' + r.largo + ' m, de ' + r.a0 + ' a ' + r.a1);
  ok(Math.abs(r.tn0.z - 100) < 1e-6 && Math.abs(r.tn100.z - 102) < 1e-6 && Math.abs(r.tn200.z - 104) < 1e-6,
    'las cotas del terreno salen exactas (2 %): ' + [r.tn0.z, r.tn100.z, r.tn200.z].map(z => z.toFixed(3)).join(' / '));
  ok(Math.abs(r.sr0.z - 99) < 1e-6, 'la segunda superficie va 1 m por debajo: ' + r.sr0.z.toFixed(3));
  ok(Math.abs(r.hastaSR - 100) < 0.5, 'donde la superficie se acaba, el perfil se corta (la subrasante llega a ' + r.hastaSR.toFixed(1) + ' m, no a 200)');
  ok(Math.abs(r.z0 - 99) < 1e-6 && Math.abs(r.z1 - 104) < 1e-6, 'el rango de cotas es el de las dos superficies: ' + r.z0.toFixed(3) + ' a ' + r.z1.toFixed(3));
  ok(r.exagAncha >= 1 && r.exagAncha <= 100 && r.exagAngosta >= r.exagAncha,
    'propone una exageración de las de siempre y en pantalla angosta no la baja: ×' + r.exagAncha + ' / ×' + r.exagAngosta);

  // ── 2. en pantalla ──
  const lineas = await p.$$eval('.mc-perfil .mc-perfil-linea', e => e.map(x => x.getAttribute('stroke')));
  ok(lineas.filter(c => c === '#16A34A').length >= 1 && lineas.filter(c => c === '#B45309').length >= 1,
    'se dibujan las dos superficies, cada una con su color (' + lineas.length + ' tramos)');
  const txt = (await p.textContent('.mc-perfil')).replace(/\s+/g, ' ');
  ok(/0\+000/.test(txt) && /0\+200/.test(txt) && /100\.000/.test(txt), 'lleva las abscisas abajo y las cotas al lado');
  ok(/Auto \(×\d+\)/.test(txt) && /largo 200\.000 m/.test(txt), 'dice la exageración automática y el largo');

  // apagar una superficie
  await p.click('.mc-perfil-sup:has-text("Subrasante") input'); await p.waitForTimeout(350);
  const lineas2 = await p.$$eval('.mc-perfil .mc-perfil-linea', e => e.map(x => x.getAttribute('stroke')));
  ok(!lineas2.some(c => c === '#B45309') && lineas2.some(c => c === '#16A34A'), 'se puede apagar una superficie y el terreno sigue');
  await p.click('.mc-perfil-sup:has-text("Subrasante") input'); await p.waitForTimeout(300);

  // cambiar la exageración a mano y que se guarde
  // desnivel que ocupa TODO el terreno en la pantalla (no un solo tramo)
  const alto = async () => p.evaluate(() => { const ys = [];
    document.querySelectorAll('.mc-perfil .mc-perfil-linea').forEach(e => e.getAttribute('d').split(/[ML]/).filter(Boolean)
      .forEach(s => ys.push(parseFloat(s.trim().split(' ')[1]))));
    return Math.max(...ys) - Math.min(...ys); });
  await p.click('.mc-perfil-exag:has-text("×1")'); await p.waitForTimeout(400);
  const h1 = await alto();   // ×1 siempre cabe; la automática puede estar ya topada por el alto del dibujo
  await p.click('.mc-perfil-exag:has-text("×20")'); await p.waitForTimeout(400);
  const h2 = await alto();
  ok(h2 > h1 * 1.3, 'con más exageración el perfil se ve más montañoso (' + h1.toFixed(0) + ' → ' + h2.toFixed(0) + ' px de desnivel)');
  const dice = (await p.textContent('.mc-perfil')).replace(/\s+/g, ' ');
  ok(/vertical ×[\d.]+( \(×20 no cabe\))?/.test(dice), 'el dibujo dice la exageración de verdad, y avisa si la pedida no cabe');
  const g = await p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].secciones.perfExag; });
  ok(g === '20', 'la exageración elegida se guarda con el proyecto (' + g + ')');
  await p.click('.mc-perfil-auto'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].secciones.perfExag; })) === 'auto', 'y se puede volver a Auto');

  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (perfil ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
