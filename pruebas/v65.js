// v65: volumen exacto entre superficies, cota de equilibrio, curvas suavizadas, LandXML, plataformas con taludes, capas y hojas que miran el modelo.
//   node pruebas/v65.js [index.html]        (W=390 celular)
const { chromium } = require(process.env.PLAYWRIGHT || require('path').join(__dirname, 'pw.js'));
const path = require('path');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600, archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil, acceptDownloads: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  const casi = (a, e, tol) => Math.abs(a - e) <= (tol || 0.001);
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── cuentas puras, con resultados hechos a mano ──
  const r = await p.evaluate(() => {
    const malla = (zf, n, L) => { const pts = [], tri = []; for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const x = i * L / n, y = j * L / n; pts.push({ x, y, z: zf(x, y) }); }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; tri.push(a, b, d, a, d, c); }
      return { pts, tri: Int32Array.from(tri), n: tri.length / 3, caja: { x0: 0, y0: 0, x1: L, y1: L }, zmin: Math.min(...pts.map(q => q.z)), zmax: Math.max(...pts.map(q => q.z)) }; };
    const correr = (a, c) => { const g = volumenPasos(a, c); let x = g.next(); while (!x.done) x = g.next(); return x.value; };
    // prisma contra una suma fina
    let malos = 0; const dd = [[1, -1, 0.5], [-2, 3, 1], [4, -1, -2], [1, -1, 0], [0, 2, -3], [-1, 0, 0.5], [2, 2, -1], [-3, -1, 2]];
    for (const [a, c, e] of dd) { const v = { corte: 0, relleno: 0 }; prisma(1, a, c, e, v); let C = 0, R = 0; const N = 500, cel = 2 / (N * N); for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) { const u = (i + 1 / 3) / N, w = (j + 1 / 3) / N, q = 1 - u - w, d = a * u + c * w + e * q; if (d > 0) C += d * cel / 2 * 2 / 2; else R -= d * cel / 2 * 2 / 2; if (i + j < N - 1) { const u2 = (i + 2 / 3) / N, w2 = (j + 2 / 3) / N, q2 = 1 - u2 - w2, d2 = a * u2 + c * w2 + e * q2; if (d2 > 0) C += d2 * cel / 2; else R -= d2 * cel / 2; } } if (Math.abs(v.corte - C) > 0.01 || Math.abs(v.relleno - R) > 0.01) malos++; }
    // plano z = 100 + 0.1 x contra plano 105, sobre 100 × 100: cruza en x = 50; a cada lado 12 500 m³
    const A = malla((x) => 100 + 0.1 * x, 7, 100), B = malla(() => 105, 3, 100), v = correr(A, B);
    const bal = curvaVolumenCota(A);
    // suavizar: un zigzag abierto conserva sus extremos y no crece de más
    const sv = suavizarTramos([[0, 0, 1, 1], [1, 1, 2, 0], [2, 0, 3, 1]]);
    return { malos, v, bal: { eq: bal.equilibrio, corte: bal.en.corte, relleno: bal.en.relleno, area: bal.area, filas: bal.filas.length }, sv: { ini: sv[0].slice(0, 2), fin: sv[sv.length - 1].slice(2), n: sv.length } };
  });
  ok(r.malos === 0, 'el prisma parte bien cuando cruza: igual a una suma fina en 8 casos (' + r.malos + ' diferencias)');
  ok(casi(r.v.corte, 12500, 0.01) && casi(r.v.relleno, 12500, 0.01) && casi(r.v.area, 10000, 0.01), 'dos planos que se cruzan, con mallas distintas: 12 500 de corte y 12 500 de relleno: ' + JSON.stringify(r.v));
  ok(casi(r.bal.eq, 105) && casi(r.bal.corte, 12500, 0.01) && casi(r.bal.relleno, 12500, 0.01) && r.bal.filas === 13, 'cota de equilibrio del plano: 105, con corte = relleno: ' + JSON.stringify(r.bal));
  ok(r.sv.ini.join() === '0,0' && r.sv.fin.join() === '3,1' && r.sv.n > 3, 'curva suavizada: mismos extremos y más vértices (' + r.sv.n + ')');

  // v67: los números no se repiten, y lo guardado con repetidos se repara
  const ids = await p.evaluate(() => { const c = new Set(); for (let i = 0; i < 300000; i++) c.add(idNuevo()); const l = [{ id: 1, t: 'p', x: 0, y: 0 }, { id: 2, t: 'p', x: 1, y: 0 }, { id: 1, t: 'p', x: 2, y: 0 }, { id: 1, t: 'p', x: 3, y: 0 }], r = idsUnicos(l), sano = l.slice(0, 2);
    return { n: c.size, unicos: new Set(r.map(o => o.id)).size, primero: r[0].id, x: r.map(o => o.x).join(), igual: idsUnicos(sano) === sano }; });
  ok(ids.n === 300000, '300 000 números seguidos, sin ninguno repetido');
  ok(ids.unicos === 4 && ids.primero === 1 && ids.x === '0,1,2,3' && ids.igual, 'lo guardado con números repetidos se repara sin mover nada, y lo sano queda igual');

  // ── LandXML: ida y vuelta, con sus triángulos tal cual ──
  const x = await p.evaluate(() => {
    const proy = { id: 1, nombre: 'P&L <1>', superficies: [{ id: 2, nombre: 'Terreno', fijo: { p: [1000, 2000, 10, 1010, 2000, 11, 1000, 2010, 12, 1010, 2010, 13], f: [0, 1, 3, 0, 3, 2] } }],
      dibujos: [{ id: 3, nombre: 'D', objs: [{ t: 'p', id: 1, x: 5000.5, y: 7000.25, z: 1520.125, nom: '7', d: 'TN' }, { t: 'p', id: 2, x: 1, y: 2, nom: 'sin cota' }] }] };
    const txt = crearLandXML(proy), v = leerLandXML(txt), mal = leerLandXML('<a></a>');
    const pies = leerLandXML('<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2"><Units><Imperial linearUnit="foot"/></Units><CgPoints><CgPoint name="1">10 20 30</CgPoint></CgPoints></LandXML>');
    const s = v.superficies[0], t = calcularTIN(proy, { fijo: { p: s.p, f: s.f } });
    return { nombre: txt.includes('P&amp;L &lt;1&gt;'), orden: txt.includes('>7000.25 5000.5 1520.125<'), pts: v.puntos, s: { nombre: s.nombre, f: s.f.length, p: s.p.length }, area: t.n, mal: mal.error, pies: pies.puntos[0] };
  });
  ok(x.nombre && x.orden, 'LandXML escapa los textos y escribe Norte, Este, Cota');
  ok(x.pts.length === 1 && x.pts[0].x === 5000.5 && x.pts[0].y === 7000.25 && x.pts[0].z === 1520.125 && x.pts[0].nom === '7' && x.pts[0].d === 'TN', 'ida y vuelta: el punto vuelve igual, y el que no tiene cota no va: ' + JSON.stringify(x.pts));
  ok(x.s.nombre === 'Terreno' && x.s.f === 6 && x.area === 2, 'la superficie vuelve con sus 2 triángulos tal cual: ' + JSON.stringify(x.s));
  ok(!!x.mal && casi(x.pies.x, 6.096) && casi(x.pies.y, 3.048) && casi(x.pies.z, 9.144), 'un archivo que no es LandXML se rechaza y uno en pies pasa a metros');

  // ── plataforma: terreno plano a 100, cuadrado de 10 × 10 a cota 101, talud de relleno 2:1 ──
  const pl = await p.evaluate(() => {
    const puntos = []; for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) puntos.push({ t: 'p', id: 'g' + i + j, x: 5 + i * 10, y: 5 + j * 10, z: 100, nom: '' });
    const proy = { id: 1, dibujos: [{ id: 1, nombre: 'T', objs: puntos }], superficies: [] }, sup = superficieNueva('Terreno', 0), t = calcularTIN(proy, sup);
    const R = taludesPlataforma(t, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], 101, 1.5, 2);
    const d = R.borde.map(q => { const dx = Math.max(0 - q.x, 0, q.x - 10), dy = Math.max(0 - q.y, 0, q.y - 10); return Math.hypot(dx, dy); });
    const corte = taludesPlataforma(t, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], 99, 1.5, 2);
    const dc = corte.borde.map(q => { const dx = Math.max(0 - q.x, 0, q.x - 10), dy = Math.max(0 - q.y, 0, q.y - 10); return Math.hypot(dx, dy); });
    return { n: R.borde.length, min: Math.min(...d), max: Math.max(...d), z: R.borde.every(q => Math.abs(q.z - 100) < 1e-4), fuera: R.fuera, minC: Math.min(...dc), maxC: Math.max(...dc) };
  });
  ok(pl.n > 20 && casi(pl.min, 2, 0.01) && casi(pl.max, 2, 0.01) && pl.z && pl.fuera === 0, 'relleno de 1 m a 2:1: el talud toca el terreno a 2 m del borde, a cota 100 (' + pl.n + ' puntos, ' + pl.min.toFixed(3) + ' a ' + pl.max.toFixed(3) + ' m)');
  ok(casi(pl.minC, 1.5, 0.01) && casi(pl.maxC, 1.5, 0.01), 'corte de 1 m a 1,5:1: toca a 1,5 m (' + pl.minC.toFixed(3) + ' a ' + pl.maxC.toFixed(3) + ' m)');

  // un proyecto sin dibujos también deja volver al inicio
  await p.fill('form input', 'Vacío'); await p.click('form button[type=submit]'); await p.waitForTimeout(300);
  ok(!!(await p.$('.mc-volver')), 'un proyecto sin dibujos tiene botón de volver');
  await p.click('.mc-volver'); await p.waitForSelector('form input');

  // ── hojas que miran el modelo y capas ──
  await p.evaluate(() => {
    const lin = (id, capa, x) => ({ id, t: 'l', a: { x, y: 0 }, b: { x, y: 10 }, capa });
    const modelo = { id: 11, nombre: 'Modelo', sig: 1, objs: [lin(1, 'VIA', 5), lin(2, 'VIA', 15), lin(3, 'REDES', 25)] };
    const hoja = { id: 12, nombre: 'H1 · presentación', pres: true, sig: 1, hoja: { x0: 0, y0: 0, x1: 100, y1: 100 }, objs: [{ id: 9, t: 'l', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } }], modeloId: 11,
      vent: [{ C: { x: 50, y: 50 }, w: 80, hh: 40, s: 2, tw: 0, Tg: { x: 20, y: 5 }, Vc: { x: 0, y: 0 } }] };
    HIST.crudo.proyectos([{ id: 10, nombre: 'Plano', creado: '', dibujos: [modelo, hoja] }]); vaciarGuardado();
  });
  await p.reload(); await p.waitForSelector('.mc-proyecto'); await p.click('.mc-proyecto', { position: { x: 30, y: 16 } }); await p.waitForSelector('.tv-dibujo');
  const uno = await p.evaluate(() => { const t = HIST.actual.proyectos[0].dibujos, h = hojaViva(t, t[1]); return { n: h.objs.length, xs: h.objs.filter(o => o.id < 0).map(o => o.a.x).sort((a, b) => a - b), sinVent: !h.vent, guardada: !!t[1].vent, nGuardada: t[1].objs.length, cruda: HOJA_CRUDA.get(h) === t[1] }; });
  ok(uno.n === 4 && uno.xs.join() === '20,40,60' && uno.sinVent && uno.guardada && uno.nGuardada === 1 && uno.cruda, 'la hoja se arma mirando el modelo (a escala 2 en 20, 40 y 60) y lo guardado sigue liviano: ' + JSON.stringify(uno));
  await p.evaluate(() => { const l = HIST.actual.proyectos[0], t = l.dibujos; HIST.crudo.proyectos([{ ...l, dibujos: [{ ...t[0], objs: t[0].objs.filter(o => o.id !== 1) }, t[1]] }]); });
  const dos = await p.evaluate(() => { const t = HIST.actual.proyectos[0].dibujos; return hojaViva(t, t[1]).objs.length; });
  ok(dos === 3, 'si el modelo cambia, la hoja lo refleja, como en AutoCAD (' + dos + ' objetos)');

  await p.click('[data-grupo=herramientas]'); await p.click('[data-herr="@capas"]'); await p.waitForSelector('.mc-capas');
  const pintadas = () => p.evaluate(() => window.MC_DIB.trazos);
  await p.waitForTimeout(200); const t0 = await pintadas();
  await p.click('[data-capa="REDES"]'); await p.waitForTimeout(300);
  const t1 = await pintadas(), off = await p.evaluate(() => HIST.actual.proyectos[0].dibujos[0].capasOff);
  ok(t0 === 2 && t1 === 1 && off.join() === 'REDES', 'apagar la capa REDES quita su línea del dibujo (' + t0 + ' → ' + t1 + ') y queda anotada');
  const dxf = await p.evaluate(() => { const d = HIST.actual.proyectos[0].dibujos[0], t = crearDXF(d, HIST.actual.proyectos[0]), sinOff = crearDXF({ ...d, capasOff: [] }, HIST.actual.proyectos[0]); return { va: t.includes('REDES'), vaSin: sinOff.includes('REDES'), via: t.includes('VIA') }; });
  ok(!dxf.va && dxf.vaSin && dxf.via, 'lo apagado no va al DXF, y lo prendido sale en su capa');
  const hoja2 = await p.evaluate(() => { const t = HIST.actual.proyectos[0].dibujos; return hojaViva(t, t[1]).objs.length; });
  ok(hoja2 === 2, 'la capa apagada en el modelo tampoco sale en la hoja (' + hoja2 + ' objetos)');
  await p.click('.mc-capas-todas'); await p.waitForTimeout(300);
  ok(await pintadas() === 2, 'Prender todas la devuelve');
  await p.click('.mc-capas button:has-text("Listo")');

  // ── pantalla de Volúmenes y Superficies ──
  await p.evaluate(() => { const l = HIST.actual.proyectos[0], pts = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push({ t: 'p', id: 'q' + i + j, x: i * 25, y: j * 25, z: 100 + 0.1 * i * 25, nom: 'q', d: 'TN' });
    const f = { id: 77, t: 'pl', c: true, v: [{ x: 40, y: 40 }, { x: 60, y: 40 }, { x: 60, y: 60 }, { x: 40, y: 60 }] };
    const s1 = { ...superficieNueva('Terreno', 0), fuente: { tipo: 'desc', descs: ['TN'], dibId: null } }, s2 = { ...superficieNueva('Plano', 1), fijo: { p: [0, 0, 105, 100, 0, 105, 100, 100, 105, 0, 100, 105], f: [0, 1, 2, 0, 2, 3] } };
    HIST.crudo.proyectos([{ ...l, dibujos: [{ ...l.dibujos[0], objs: pts.concat([f]) }, l.dibujos[1]], superficies: [s1, s2], secciones: { arriba: s1.id, abajo: s2.id } }]); });
  await p.click('[data-pestana=volumenes]'); await p.waitForSelector('.mc-exacto-corte', { timeout: 10000 });
  const cv = await p.textContent('.mc-exacto-corte');
  ok(/12500\.000/.test(cv), 'Volúmenes muestra el volumen exacto: ' + cv.trim());
  await p.click('.mc-equilibrio'); await p.waitForSelector('.mc-equilibrio-cota');
  ok(/105\.000/.test(await p.textContent('.mc-equilibrio-cota')), 'y la cota de equilibrio: ' + (await p.textContent('.mc-equilibrio-cota')));
  await p.click('[data-pestana=superficies]'); await p.waitForSelector('.mc-sup-vistas');
  await p.click('[data-vista=planta]'); await p.waitForSelector('.mc-plataforma-abrir'); await p.click('.mc-plataforma-abrir'); await p.waitForSelector('.mc-plataforma');
  await p.selectOption('.mc-plat-fig', { index: 1 }); await p.fill('.mc-plat-cota', '105.5'); await p.click('.mc-plat-crear'); await p.waitForTimeout(400);
  const pla = await p.evaluate(() => { const l = HIST.actual.proyectos[0], s = l.superficies[l.superficies.length - 1], t = superficieTIN(l, s), g = volumenPasos(t, superficieTIN(l, l.superficies[0])); let x = g.next(); while (!x.done) x = g.next();
    return { n: l.superficies.length, tri: t.n, avisos: t.avisos, centro: zEnTIN(t, 50, 50), esquina: zEnTIN(t, 42, 58), corte: x.value.corte, relleno: x.value.relleno, area: x.value.area }; });
  ok(pla.n === 3 && pla.tri > 20 && !pla.avisos.length, 'Plataforma con taludes crea su superficie sin avisos: ' + JSON.stringify(pla.avisos));
  ok(casi(pla.centro, 105.5) && casi(pla.esquina, 105.5), 'el interior de la plataforma queda plano a su cota: ' + pla.centro + ' y ' + pla.esquina);
  // a mano: interior 15 × 20 × 0,75 = 225 de relleno y 5 × 20 × 0,25 = 25 de corte, más los taludes (unos 60 y 5)
  ok(pla.corte > 275 && pla.corte < 295 && pla.relleno > 28 && pla.relleno < 33, 'el volumen de la plataforma cuadra con la cuenta a mano: ' + pla.corte.toFixed(1) + ' sobre el terreno y ' + pla.relleno.toFixed(1) + ' bajo el terreno');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => HIST.actual.proyectos[0].superficies.length) === 2, 'Deshacer la quita en un solo paso');
  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.log('FALLA ' + e.message.slice(0, 300)); process.exit(1); });
