// Pegar las secciones, la tabla y el perfil en el dibujo (v28): quedan como un objeto más, vivo.
// Terreno de prueba: plano al 2 % a lo largo de x, con una segunda superficie 1 m más abajo.
//   node pruebas/piezas.js [index.html]        (W=390 para celular)
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
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 4; j++) objs.push({ id: n, t: 'p', x: i * 20, y: j * 10, z: 99 + 0.02 * (i * 20), nom: String(n++), d: 'SR' });
  objs.push({ id: 'eje', t: 'pl', v: [{ x: 0, y: 20 }, { x: 200, y: 20 }] });
  const proy = [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 300, objs }],
    superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' },
      { id: 222, nombre: 'Subrasante', fuente: { tipo: 'desc', descs: ['SR'] }, color: '#B45309', curvas: '' }],
    secciones: { linea: { dibId: 2, objId: 'eje' }, paso: '20', izq: '10', der: '10', arriba: 111, abajo: 222 } }];
  const ir = async tab => { await p.evaluate(t => localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: t })), tab);
    await p.reload(); await p.waitForTimeout(600); };
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); }, proy);
  await ir('secciones');

  const piezas = () => p.evaluate(() => { vaciarGuardado();
    return (JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs || []).filter(o => o.t === 'pz'); });

  // ── 1. pegar el perfil ──
  await p.waitForSelector('.mc-pegar-perfil');
  const dice = (await p.textContent('.mc-perfil')).replace(/\s+/g, ' ');
  ok(/a escala 1:\d+/.test(dice), 'el botón de pegar el perfil propone una escala: ' + (dice.match(/a escala 1:\d+/) || [''])[0]);
  await p.click('.mc-pegar-perfil'); await p.waitForTimeout(700);
  ok(!!(await p.$('.tv-dib-svg')), 'al pegar, la app lleva a la pestaña Dibujo');
  const p1 = await piezas();
  ok(p1.length === 1 && p1[0].clase === 'perfil' && p1[0].w > 0 && p1[0].h > 0 && p1[0].esc > 0,
    'el perfil queda como un objeto del dibujo (1:' + (p1[0] || {}).esc + ', ' + (p1[0] || {}).w + ' × ' + (p1[0] || {}).h + ' mm)');
  const dibujado = await p.evaluate(() => { const g = document.querySelector('.mc-pz'); return g ? { n: g.querySelectorAll('path, text, circle, rect').length, txt: g.textContent } : null; });
  ok(dibujado && dibujado.n > 20 && /PERFIL LONGITUDINAL/.test(dibujado.txt), 'se dibuja en el lienzo con su marco, cuadrícula y textos (' + (dibujado ? dibujado.n : 0) + ' piezas)');

  // ── 2. pegar la tabla de volúmenes y las secciones ──
  await ir('volumenes'); await p.waitForSelector('.mc-pegar-tabla');
  await p.click('.mc-pegar-tabla'); await p.waitForTimeout(700);
  await ir('secciones'); await p.waitForSelector('.mc-pegar-secc');
  await p.click('.mc-pegar-secc'); await p.waitForTimeout(700);
  const p3 = await piezas();
  ok(p3.length === 3 && p3.map(o => o.clase).sort().join(',') === 'perfil,secciones,tabla', 'quedan las tres piezas: ' + p3.map(o => o.clase).join(', '));
  const secc = p3.find(o => o.clase === 'secciones');
  ok(secc && secc.cols === 2 && secc.filas === 2 && secc.desde === 1, 'las secciones se pegan en cuadrícula de 2 × 2 desde la 1.ª');
  // ninguna se monta sobre otra: las cajas no se cruzan
  const cajas = await p.evaluate(() => (HIST.actual.proyectos[0].dibujos[0].objs || []).filter(o => o.t === 'pz')
    .map(o => { const c = DIB.caja(o); return { x0: Math.min(c[0].x, c[1].x), y0: Math.min(c[0].y, c[1].y), x1: Math.max(c[0].x, c[1].x), y1: Math.max(c[0].y, c[1].y) }; }));
  let cruce = false;
  for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
    const a = cajas[i], c = cajas[j];
    if (a.x0 < c.x1 - 1e-6 && c.x0 < a.x1 - 1e-6 && a.y0 < c.y1 - 1e-6 && c.y0 < a.y1 - 1e-6) cruce = true; }
  ok(!cruce, 'cada pieza se pone al lado de lo que ya había, sin montarse (' + cajas.length + ' cajas)');

  // ── 3. elegir una pieza en el dibujo y cambiarle la escala ──
  const centro = await p.evaluate(() => { const o = (HIST.actual.proyectos[0].dibujos[0].objs || []).find(q => q.t === 'pz' && q.clase === 'perfil');
    const c = DIB.caja(o), s = MC_DIB.aP({ x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 });
    const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(); return { x: r.left + s.X, y: r.top + s.Y }; });
  await p.click('.tv-dib-nav button[data-grupo=editar]'); await p.click('.tv-dib-hoja button[data-herr="elegir"]'); await p.waitForTimeout(200);
  await p.mouse.click(centro.x, centro.y); await p.waitForTimeout(350);
  const panel = (await p.textContent('body')).replace(/\s+/g, ' ');
  ok(/Perfil longitudinal/.test(panel) && /m en el terreno/.test(panel), 'al tocarla, el panel dice qué es, su escala y cuánto mide en el terreno');
  const antes = (await piezas()).find(o => o.clase === 'perfil');
  await p.click('.mc-pz-esc:text-is("1:1000")'); await p.waitForTimeout(450);
  const dsp = (await piezas()).find(o => o.clase === 'perfil');
  const tam = await p.evaluate(() => { const o = (HIST.actual.proyectos[0].dibujos[0].objs || []).find(q => q.t === 'pz' && q.clase === 'perfil'); return DIB.pzTam(o); });
  ok(dsp.esc === 1000 && Math.abs(tam.W - dsp.w) < 1e-6, 'se le cambia la escala a 1:1000 y mide ' + tam.W.toFixed(1) + ' m de ancho en el terreno');
  ok(antes.esc !== dsp.esc && antes.w === dsp.w, 'la escala no cambia el tamaño en el papel, solo lo que ocupa en el terreno');

  // ── 4. viva: si cambia el paso de las secciones, la pieza cambia con él ──
  const v1 = await p.evaluate(() => primsDePieza(HIST.actual.proyectos[0], (HIST.actual.proyectos[0].dibujos[0].objs || []).find(q => q.t === 'pz' && q.clase === 'tabla')).length);
  await p.evaluate(() => { const P0 = HIST.actual.proyectos[0];
    HIST.actual.proyectos[0] = { ...P0, secciones: { ...P0.secciones, paso: '50' } }; });
  const v2 = await p.evaluate(() => primsDePieza(HIST.actual.proyectos[0], (HIST.actual.proyectos[0].dibujos[0].objs || []).find(q => q.t === 'pz' && q.clase === 'tabla')).length);
  ok(v1 > 0 && v2 > 0 && v1 !== v2, 'la pieza está viva: con otro paso la tabla trae otras filas (' + v1 + ' → ' + v2 + ' piezas)');

  // ── 5. el DXF las saca con sus líneas y textos ──
  const dxf = await p.evaluate(() => crearDXF(HIST.actual.proyectos[0].dibujos[0], HIST.actual.proyectos[0]));
  ok(/PERFIL LONGITUDINAL/.test(dxf), 'el DXF saca los textos de la pieza');
  const sinProy = await p.evaluate(() => crearDXF(HIST.actual.proyectos[0].dibujos[0]));
  ok(!/PERFIL LONGITUDINAL/.test(sinProy) && /ENTITIES/.test(sinProy), 'sin el proyecto, el DXF sale igual que siempre (no se cae)');

  // ── 6. deshacer en un solo paso ──
  await p.evaluate(() => deshacer()); await p.waitForTimeout(400);
  const pd = await p.evaluate(() => (HIST.actual.proyectos[0].dibujos[0].objs || []).filter(o => o.t === 'pz').length);
  ok(pd === 3, 'deshacer quita el último cambio (quedan ' + pd + ' piezas, la escala vuelve atrás)');

  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (piezas ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
