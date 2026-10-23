// Superficie dentro del Dibujo: quitar y devolver triángulos, voltear un lado, unir dos puntos, y cotas en una polilínea dibujada
// (por vértice, como línea de quiebre con esas cotas y en el DXF como polilínea 3D).
//   node pruebas/supdibujo.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  p.on('dialog', d => d.accept());
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── 1. cálculo ──
  const r = await p.evaluate(() => {
    const objs = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) objs.push({ id: 'p' + i + j, t: 'p', x: i * 10, y: j * 10, z: 100 + i, nom: String(i * 5 + j) });
    const proy = { dibujos: [{ id: 1, objs }] }, sup = { id: 's', fuente: { tipo: 'todos' } }, t0 = calcularTIN(proy, sup);
    const k = claveTri(t0.pts[t0.tri[0]], t0.pts[t0.tri[1]], t0.pts[t0.tri[2]]), t1 = calcularTIN(proy, { ...sup, quitados: [k] });
    // lado forzado (0,0)-(20,10): cruza la malla, debe quedar como lado
    const lado = t => { const i = t.pts.findIndex(q => q.x === 0 && q.y === 0), j = t.pts.findIndex(q => q.x === 20 && q.y === 10); for (let n = 0; n < t.tri.length; n += 3) { const tr = [t.tri[n], t.tri[n + 1], t.tri[n + 2]]; if (tr.includes(i) && tr.includes(j)) return true; } return false; };
    const t2 = calcularTIN(proy, { ...sup, lados: [{ a: { x: 0, y: 0 }, b: { x: 20, y: 10 } }] });
    // línea de quiebre con cotas propias: un muro a 150 cruzando en y = 15 (vértices sin puntos debajo)
    const pr3 = { dibujos: [{ id: 1, objs: objs.concat([{ id: 'm', t: 'pl', v: [{ x: 5, y: 15, z: 150 }, { x: 35, y: 15, z: 150 }] }]) }] };
    const t3 = calcularTIN(pr3, { ...sup, quiebres: [{ dibId: 1, objId: 'm' }] });
    // dos puntos en el mismo sitio con otra cota (corona 10 y pie 7): la superficie elige según su opción
    const rep = { dibujos: [{ id: 1, objs: [{ id: 1, t: 'p', x: 5, y: 5, z: 7, nom: 'pie' }, { id: 2, t: 'p', x: 5, y: 5, z: 10, nom: 'corona' }, { id: 3, t: 'p', x: 0, y: 0, z: 5 }, { id: 4, t: 'p', x: 10, y: 0, z: 5 }, { id: 5, t: 'p', x: 0, y: 10, z: 5 }, { id: 6, t: 'p', x: 10, y: 10, z: 5 }] }] };
    const zr = m => zEnTIN(calcularTIN(rep, { ...sup, repetido: m }), 5, 5), avAlto = calcularTIN(rep, { ...sup, repetido: 'alto' }).avisos.join(' ');
    return { zPrim: zr(undefined), zAlto: zr('alto'), zBajo: zr('bajo'), avAlto, n0: t0.n, n1: t1.n, q1: t1.quitados.length, antes: lado(t0), despues: lado(t2), av2: t2.avisos.join(' '), z3: zEnTIN(t3, 20, 15), z3b: zEnTIN(t3, 20, 30) };
  });
  ok(r.n1 === r.n0 - 1 && r.q1 === 1, 'un triángulo quitado sale de la superficie y queda en la lista de quitados: ' + r.n0 + ' → ' + r.n1);
  ok(!r.antes && r.despues && !r.av2, 'un lado forzado entre dos puntos queda como lado de triángulo');
  ok(r.zPrim === 7 && r.zAlto === 10 && r.zBajo === 7 && /se usa el más alto/.test(r.avAlto) && /Ppie cota 7\.000 → queda Pcorona cota 10\.000/.test(r.avAlto), 'mismo sitio con otra cota: el primero (7), el más alto (10) o el más bajo (7), y avisa cuál quedó: ' + [r.zPrim, r.zAlto, r.zBajo].join(' / '));
  ok(Math.abs(r.z3 - 150) < 1e-6 && Math.abs(r.z3b - 102) < 1e-6, 'la línea de quiebre con cotas propias usa esas cotas (150 en el muro; el resto sigue el terreno): ' + r.z3 + ' / ' + r.z3b);

  // ── 2. en pantalla ──
  const objs = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) objs.push({ id: 100 + i * 10 + j, t: 'p', x: 1000000 + i * 10, y: 900000 + j * 10, z: 100 + i, nom: String(i * 7 + j + 1), d: 'TN' });
  objs.push({ id: 'muro', t: 'pl', v: [{ x: 1000005, y: 900035 }, { x: 1000055, y: 900035 }] });
  const proyecto = [{ id: 1, nombre: 'Lote', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 60, objs }], superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '' }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, proyecto);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);
  const datos = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0]; });
  // de terreno a pantalla, con dos puntos que se ven
  const mapa = await p.evaluate(() => { const cs = [...document.querySelectorAll('.tv-dib-svg .tv-fijo .tv-pt')], s = document.querySelector('.tv-dib-svg').getBoundingClientRect();
    const a = cs[0], z = cs[cs.length - 1]; return { ax: +a.getAttribute('x1'), ay: +a.getAttribute('y1'), zx: +z.getAttribute('x1'), zy: +z.getAttribute('y1'), left: s.left, top: s.top }; });
  const kx = (mapa.zx - mapa.ax) / 60, ky = (mapa.zy - mapa.ay) / 60;   // el primero es (0,0) y el último (60,60), en metros desde 1000000/900000
  const pant = (x, y) => ({ x: mapa.left + mapa.ax + x * kx, y: mapa.top + mapa.ay + y * ky });
  const tocar = async (x, y) => { const q = pant(x, y); await p.mouse.click(q.x, q.y); await p.waitForTimeout(150); };
  const herr = async id => { await p.click('button[data-grupo=superficie]'); await p.click(`button[data-herr=${id}]`); await p.waitForTimeout(150); };
  await herr('supquitar');
  ok(await p.$('.mc-sup-tri') !== null, 'con una herramienta de Superficie se ven los triángulos sobre el dibujo');
  await tocar(13, 3);
  let d = await datos();
  ok(d.superficies[0].quitados && d.superficies[0].quitados.length === 1 && await p.$('.mc-sup-quitados') !== null, 'tocar un triángulo lo quita (y se ve rayado en rojo)');
  await herr('supdevolver'); await tocar(13, 3);
  d = await datos();
  ok(d.superficies[0].quitados.length === 0, 'tocar el triángulo rayado lo devuelve');
  // voltear: el lado entre (10,0) y (10,10) es vertical y lo comparten dos triángulos
  await herr('supvoltear'); await tocar(10, 5);
  const hay = await p.$('button:has-text("Voltear")');
  ok(!!hay, 'tocar un lado lo marca y pide confirmar (Voltear / Cancelar)');
  if (hay) { await hay.click(); await p.waitForTimeout(150); }
  d = await datos();
  const L = (d.superficies[0].lados || [])[0];
  ok(L && L.voltear && Math.abs(L.a.x - L.b.x) > 5, 'al voltear se guarda la otra diagonal como lado forzado: ' + JSON.stringify(L));
  // unir dos puntos: (30,30) con (50,40)
  await herr('supunir'); await tocar(30, 30); await tocar(50, 40);
  d = await datos();
  const U = (d.superficies[0].lados || []).find(l => !l.voltear);
  ok(U && Math.abs(U.a.x - 1000030) < 1e-6 && Math.abs(U.b.y - 900040) < 1e-6, 'unir dos puntos guarda el lado forzado entre ellos');
  const tinOk = await p.evaluate(() => { const pr = HIST.actual.proyectos[0], t = superficieTIN(pr, pr.superficies[0]); return !t.avisos.length; });
  ok(tinOk, 'la superficie respeta el volteo y la unión sin avisos');
  await p.click('button:has-text("Cambios (2)")'); await p.waitForTimeout(150);
  ok((await p.textContent('.tv-dib-panel')).includes('1 lado(s) volteado(s) · 1 unión(es) forzada(s)'), 'el panel Cambios cuenta lo hecho');
  await p.click('.tv-dib-panel button:has-text("Quitar todos los cambios")'); await p.waitForTimeout(150);
  d = await datos();
  ok(!d.superficies[0].lados.length && !d.superficies[0].quitados.length, 'Quitar todos los cambios deja la superficie como salió');
  // cotas del muro (polilínea): elegir, cota de todos 150 y usarla como línea de quiebre
  await p.click('button[data-grupo=editar]'); await p.click('button[data-herr=elegir]'); await p.waitForTimeout(100);
  await tocar(30, 35);
  const fila = await p.$('.tv-dib-panel div:has(> span:text-is("Cota de todos")) input');
  ok(!!fila, 'al elegir la polilínea salen sus cotas');
  if (fila) { await fila.fill('150'); await fila.press('Enter'); await p.waitForTimeout(200); }
  await p.check('.mc-dib-quiebre'); await p.waitForTimeout(200);
  d = await datos();
  const muro = d.dibujos[0].objs.find(o => o.id === 'muro');
  ok(muro.v.every(q => q.z === 150) && d.superficies[0].quiebres.some(r => r.objId === 'muro'), 'la polilínea guarda la cota en cada vértice y queda como línea de quiebre de la superficie');
  const z = await p.evaluate(() => { const pr = HIST.actual.proyectos[0]; return zEnTIN(superficieTIN(pr, pr.superficies[0]), 1000030, 900035); });
  ok(Math.abs(z - 150) < 1e-6, 'la superficie pasa por el muro a 150: ' + z);
  const dxf = await p.evaluate(() => crearDXF(HIST.actual.proyectos[0].dibujos[0]));
  ok(/POLYLINE\r\n(?:[^\r]*\r\n)*?70\r\n8\r\n/.test(dxf) && dxf.includes('\r\n30\r\n150\r\n'), 'en el DXF el muro sale como polilínea 3D a su cota');
  // con dos superficies: la lista de la barra debe cambiar de verdad la que se edita (antes seguía en la primera)
  await p.evaluate(() => HIST.crudo.proyectos(HIST.actual.proyectos.map(q => ({ ...q,
    superficies: q.superficies.concat([{ id: 222, nombre: 'Rasante', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#2563EB', curvas: '' }]) }))));
  await p.waitForTimeout(400); await herr('supquitar');
  await p.selectOption('.mc-dib-sup-elegir', '222'); await p.waitForTimeout(400);
  ok(await p.inputValue('.mc-dib-sup-elegir') === '222' && /Rasante/.test(await p.textContent('.tv-dib-cmd')), 'al elegir otra superficie, la barra pasa a esa');
  await tocar(13, 3);
  d = await datos();
  const porNom = n => (d.superficies.find(s2 => s2.nombre === n).quitados || []).length;
  ok(porNom('Rasante') === 1 && porNom('Terreno') === 0, 'el triángulo se quita de la superficie elegida, no de la primera (Rasante ' + porNom('Rasante') + ', Terreno ' + porNom('Terreno') + ')');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
