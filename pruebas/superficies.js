// Superficies, secciones y volúmenes: cálculo con casos de resultado conocido (planos) y recorrido en pantalla.
//   node pruebas/superficies.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  p.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  const cerca = (a, e, tol) => Math.abs(a - e) <= (tol || 0.001);
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── 1. cálculo: TN = plano z = 100 + 0.1·x; SR = plano z = 98; malla de puntos cada 2 m en 20 × 20 m ──
  const r = await p.evaluate(() => {
    const d = (z, desc) => { const o = []; for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) o.push({ id: desc + i + '_' + j, t: 'p', x: 1000000 + i * 2, y: 900000 + j * 2, nom: '', z: z(i * 2, j * 2), d: desc }); return o; };
    const proy = { dibujos: [{ id: 1, nombre: 'D', objs: d(x => 100 + 0.1 * x, 'TN').concat(d(() => 98, 'SR'))
      .concat([{ id: 'eje', t: 'pl', v: [{ x: 1000000, y: 900010 }, { x: 1000020, y: 900010 }] }, { id: 'lim', t: 'pl', c: true, v: [{ x: 1000000, y: 900000 }, { x: 1000010, y: 900000 }, { x: 1000010, y: 900020 }, { x: 1000000, y: 900020 }] }]) }] };
    const sTN = { id: 'a', fuente: { tipo: 'desc', descs: ['TN'] } }, sSR = { id: 'b', fuente: { tipo: 'desc', descs: ['SR'] } };
    const tA = superficieTIN(proy, sTN), tB = superficieTIN(proy, sSR);
    const tLim = calcularTIN(proy, { ...sTN, limite: { dibId: 1, objId: 'lim' } });
    const tMax = calcularTIN(proy, { ...sTN, ladoMax: '3' }), tMax2 = calcularTIN(proy, { ...sTN, ladoMax: '1.5' });
    const est = estacionesLinea(proy.dibujos[0].objs.find(o => o.id === 'eje').v, 5, 0);
    const secs = est.map(e => { const A = { x: e.p.x - e.n.x * 4, y: e.p.y - e.n.y * 4 }, B = { x: e.p.x + e.n.x * 4, y: e.p.y + e.n.y * 4 };
      const a = areaEntrePerfiles(perfilTIN(tA, A, B), perfilTIN(tB, A, B)); return { s: e.s, abs: e.abs, corte: a.corte, relleno: a.relleno }; });
    const v = volumenPorSecciones(secs), mFranja = volumenPorMallas(tA, tB, 0.25, franjaSecciones(est, 4, 4)), mTodo = volumenPorMallas(tA, tB, 0.25);
    // relleno: SR más arriba que TN en parte (SR = 101): cruce en x = 10
    const sSR2 = { id: 'c', fuente: { tipo: 'desc', descs: ['SR2'] } }, proy2 = { dibujos: [{ id: 1, nombre: 'D', objs: d(x => 100 + 0.1 * x, 'TN').concat(d(() => 101, 'SR2')) }] };
    const t2a = superficieTIN(proy2, { id: 'x', fuente: { tipo: 'desc', descs: ['TN'] } }), t2b = superficieTIN(proy2, sSR2);
    const ac = areaEntrePerfiles(perfilTIN(t2a, { x: 1000000, y: 900010 }, { x: 1000020, y: 900010 }), perfilTIN(t2b, { x: 1000000, y: 900010 }, { x: 1000020, y: 900010 }));
    const m2 = volumenPorMallas(t2a, t2b, 0.1);
    // líneas de quiebre: un tramo entre dos puntos (0,0)→(4,2) y otro que nace en (1,1), donde no hay punto
    const proyQ = { dibujos: [{ id: 1, nombre: 'D', objs: d(x => 100 + 0.1 * x, 'TN').concat([{ id: 'q1', t: 'l', a: { x: 1000000, y: 900000 }, b: { x: 1000004, y: 900002 } }, { id: 'q2', t: 'l', a: { x: 1000001, y: 900001 }, b: { x: 1000003, y: 900005 } }]) }] };
    const tQ = calcularTIN(proyQ, { ...sTN, quiebres: [{ dibId: 1, objId: 'q1' }, { dibId: 1, objId: 'q2' }] });
    const iDe = (x, y) => tQ.pts.findIndex(q => Math.abs(q.x - x) < 1e-6 && Math.abs(q.y - y) < 1e-6);
    const tieneLado = (i, j) => { for (let k = 0; k < tQ.tri.length; k += 3) { const t3 = [tQ.tri[k], tQ.tri[k + 1], tQ.tri[k + 2]]; if (t3.includes(i) && t3.includes(j)) return true; } return false; };
    const nuevo = tQ.pts.find(q => q.quiebre);
    const quiebre = { lado1: tieneLado(iDe(1000000, 900000), iDe(1000004, 900002)), lado2: tieneLado(iDe(1000001, 900001), iDe(1000003, 900005)), nuevoZ: nuevo && nuevo.z, avisos: tQ.avisos.join(' ') };
    return { quiebre, n: tA.n, z: zEnTIN(tA, 1000005, 900007.3), fuera: zEnTIN(tA, 999990, 900007), nLim: tLim.n, nMax: tMax.n, nMax2: tMax2.n, avisoMax2: tMax2.avisos.join(' '),
      areas: secs.map(s => +s.corte.toFixed(3)), v, mFranja, mTodo, ac, m2, curvas: curvasTIN(tA, 0.5).map(c => c.z).join(','), mayores: curvasTIN(tA, 0.5).filter(c => c.mayor).map(c => c.z).join(','),
      bordes: bordesTIN(tA).map(l => l.length), poco: calcularTIN({ dibujos: [] }, sTN).avisos.join(' ') };
  });
  ok(r.n === 200, '200 triángulos en 11 × 11 puntos: ' + r.n);
  ok(r.quiebre.lado1 && r.quiebre.lado2, 'las líneas de quiebre quedan como lados de triángulo: ' + JSON.stringify(r.quiebre));
  ok(r.quiebre.nuevoZ !== undefined && Math.abs(r.quiebre.nuevoZ - 100.1) < 1e-9 && !r.quiebre.avisos, 'un vértice de quiebre sin punto entra con la cota de la superficie (100.1 en x = 1)');
  ok(cerca(r.z, 100.5) && r.fuera === null, 'cota interpolada en (5, 7.3) = 100.500 y null afuera: ' + r.z);
  ok(r.nLim === 100, 'límite con una figura (la mitad): 100 triángulos: ' + r.nLim);
  ok(r.nMax === 200 && r.nMax2 === 0 && /No quedó ningún triángulo/.test(r.avisoMax2), 'lado máximo 3 m deja todo (la diagonal mide 2.83); 1.5 m quita todo y avisa');
  ok(JSON.stringify(r.areas) === '[16,20,24,28,32]', 'áreas de corte de las secciones (8 m × espesor): ' + r.areas.join(', '));
  ok(r.v.corte === 480 && r.v.relleno === 0 && r.v.filas[1].vCorte === 90 && r.v.largo === 20, 'volumen por secciones 480 m³ (8 × 20 × 3): ' + r.v.corte);
  ok(r.mFranja.corte === 480 && cerca(r.mFranja.area, 160, 0.01), 'por mallas en la franja de las secciones = 480 m³ en 160 m²: ' + r.mFranja.corte);
  ok(r.mTodo.corte === 1200 && cerca(r.mTodo.area, 400, 0.01), 'por mallas en toda la zona común = 1200 m³ (20 × 20 × 3): ' + r.mTodo.corte);
  ok(cerca(r.ac.corte, 5) && cerca(r.ac.relleno, 5), 'sección que cruza (101 contra 100 + 0.1·x en 20 m): corte 5 y relleno 5 m²: ' + r.ac.corte.toFixed(3) + ' / ' + r.ac.relleno.toFixed(3));
  ok(cerca(r.m2.corte, 100, 0.5) && cerca(r.m2.relleno, 100, 0.5), 'por mallas con cruce: corte 100 y relleno 100 m³: ' + r.m2.corte + ' / ' + r.m2.relleno);
  ok(r.curvas === '100.5,101,101.5,102' && r.mayores === '', 'curvas cada 0.5 m entre 100 y 102 (ninguna mayor de 2.5 m): ' + r.curvas);
  ok(JSON.stringify(r.bordes) === '[40]', 'el borde de la superficie es un lazo de 40 vértices');
  ok(/al menos 3 puntos/.test(r.poco), 'sin puntos avisa: ' + r.poco);

  // ── 2. en pantalla ──
  const objs = []; for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) objs.push({ id: i * 100 + j, t: 'p', x: 1000000 + i * 2, y: 900000 + j * 2, nom: String(i * 11 + j + 1), z: 100 + 0.1 * i * 2 + 0.05 * j * 2, d: 'TN' });
  const proyecto = [{ id: 1, nombre: 'Lote 4', creado: '', dibujos: [{ id: 2, nombre: 'Levantamiento', sig: 1, objs }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'superficies' })); indexedDB.deleteDatabase('minicivil'); }, proyecto);
  await p.reload(); await p.waitForSelector('.mc-superficies'); await p.waitForTimeout(300);
  ok((await p.textContent('.mc-superficies')).includes('121 puntos con cota'), 'sin superficies: explica cómo crear la primera');
  await p.click('button:has-text("Nueva superficie")');
  await p.fill('.mc-sup-nombre', 'Terreno natural');
  ok((await p.textContent('.mc-sup-resumen')).includes('121 puntos · 200 triángulos · cotas 100.000 a 103.000'), 'resumen en vivo: ' + await p.textContent('.mc-sup-resumen'));
  await p.click('button[data-textura=rayada]');
  await p.click('button:has-text("Guardar superficie")'); await p.waitForTimeout(300);
  const datos = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0]; });
  let d = await datos();
  ok(d.superficies && d.superficies.length === 1 && d.superficies[0].nombre === 'Terreno natural' && d.superficies[0].textura === 'rayada' && d.superficies[0].curvas === '0.5', 'la superficie queda guardada con nombre, textura y curvas');
  ok(await p.$('.mc-sup-planta[data-sup="Terreno natural"]') !== null, 'la planta muestra la superficie con su relleno');
  const nCurvas = await p.$$eval('.mc-curva', l => l.length);
  ok(nCurvas === 5, 'curvas cada 0.5 m de 100.5 a 102.5 (5): ' + nCurvas);
  ok((await p.$$eval('.mc-planta text', t => t.map(x => x.textContent))).includes('102.50'), 'la curva mayor (102.50) lleva su cota');
  await p.click('.mc-ver-malla'); await p.waitForTimeout(150);
  ok(await p.$('.mc-malla') !== null, 'se puede ver la malla de triángulos');
  ok((await p.textContent('.mc-sup-tarjeta')).includes('200 triángulos'), 'la tarjeta resume la superficie');
  // editar: lado máximo y un punto escondido
  await p.click('.mc-sup-tarjeta button:has-text("Editar")'); await p.fill('.mc-lado-max', '1'); await p.waitForTimeout(100);
  ok((await p.textContent('.mc-sup-resumen')).includes('No quedó ningún triángulo'), 'lado máximo muy chico avisa en vivo');
  await p.click('button:has-text("Cancelar")');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  // zoom con los botones
  await p.click('.mc-planta button[aria-label=Acercar]'); await p.click('.mc-planta button[aria-label="Ver todo"]');
  // vista 3D: abre, pinta algo distinto del fondo, se gira y se cierra
  await p.click('button:has-text("Ver en 3D")'); await p.waitForSelector('.mc-3d'); await p.waitForTimeout(500);
  const lienzo = await p.$('.mc-3d-lienzo');
  if (!lienzo) ok((await p.textContent('.mc-3d')).includes('WebGL'), 'sin WebGL en este navegador: avisa');
  else {
    const pinta = () => p.evaluate(() => { const c = document.querySelector('.mc-3d-lienzo'), x = document.createElement('canvas'); x.width = c.width; x.height = c.height; const g = x.getContext('2d'); g.drawImage(c, 0, 0);
      const d = g.getImageData(0, 0, x.width, x.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - 30) + Math.abs(d[i + 1] - 37) + Math.abs(d[i + 2] - 48) > 30) n++; return n; });
    const n1 = await pinta();
    ok(n1 > 100, 'la vista 3D dibuja la superficie (' + n1 + ' muestras con color)');
    const bb = await lienzo.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2 + 120, bb.y + bb.height / 2 + 40, { steps: 5 }); await p.mouse.up();
    await p.fill('.mc-3d-exag', '8');
    const n2 = await pinta();
    ok(n2 > 100 && n2 !== n1, 'girar y exagerar cambian la imagen (' + n1 + ' → ' + n2 + ')');
  }
  await p.click('.mc-3d button:has-text("Volver")'); await p.waitForTimeout(150);
  ok(!(await p.$('.mc-3d')), 'la vista 3D se cierra');
  // al recargar sigue en la pestaña de superficies
  await p.reload(); await p.waitForSelector('.mc-superficies'); await p.waitForTimeout(200);
  ok(await p.$('.mc-sup-planta') !== null, 'al recargar sigue en Superficies con la superficie');
  await p.click('button[data-pestana=dibujo]'); await p.waitForSelector('.tv-dib-svg');
  ok(true, 'vuelve al Dibujo con la pestaña');
  // ── 3. secciones y volúmenes en pantalla: TN = 100 + 0.1·x, SR = 98, eje de 20 m a lo largo de x ──
  const o3 = []; let id3 = 1;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) { o3.push({ id: id3++, t: 'p', x: 1000000 + i * 2, y: 900000 + j * 2, nom: '', z: 100 + 0.1 * i * 2, d: 'TN' }); o3.push({ id: id3++, t: 'p', x: 1000000 + i * 2 + 0.3, y: 900000 + j * 2 + 0.3, nom: '', z: 98, d: 'SR' }); }
  o3.push({ id: 'eje', t: 'eje', v: [{ x: 1000000.5, y: 900010 }, { x: 1000019.5, y: 900010 }], abs0: 100, paso: 10, nom: 'Eje' });
  const proy3 = [{ id: 1, nombre: 'Plataforma', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 1, objs: o3 }],
    superficies: [{ id: 'tn', nombre: 'Terreno natural', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', textura: 'puntos', curvas: '' }, { id: 'sr', nombre: 'Subrasante', fuente: { tipo: 'desc', descs: ['SR'] }, color: '#64748B', textura: 'cuadros', curvas: '' }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'secciones' })); }, proy3);
  await p.reload(); await p.waitForSelector('.mc-secciones'); await p.waitForTimeout(200);
  await p.selectOption('.mc-secc-linea', { index: 1 }); await p.waitForTimeout(200);
  await p.click('.mc-secciones button:has-text("5 m")'); await p.fill('.mc-secc-izq', '4'); await p.fill('.mc-secc-der', '4'); await p.waitForTimeout(300);
  ok((await p.textContent('.mc-secc-abs')) === '0+100', 'la primera sección lleva la abscisa del eje (abs0 = 100): ' + await p.textContent('.mc-secc-abs'));
  const filasS = await p.$$eval('.mc-tabla-secc tbody tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  ok(filasS.length === 5 && filasS[0] === '0+100 16.400 0.000 8.000' && filasS[4] === '0+119 31.600 0.000 8.000', 'secciones cada 5 m más el final (0+119), área = 8 × espesor (el eje empieza en x = 0.5: 2.05 × 8 = 16.4): ' + filasS.join(' | '));
  ok(await p.$('.mc-sec-corte') !== null && (await p.$$('.mc-sec-perfil')).length === 2, 'la sección dibuja el corte rayado y los dos perfiles');
  ok((await p.textContent('.mc-secc-corte')).includes('16.400 m²'), 'área de corte de la sección mostrada: ' + await p.textContent('.mc-secc-corte'));
  await p.click('.mc-secciones button:has-text("›")'); await p.waitForTimeout(100);
  ok((await p.textContent('.mc-secc-abs')) === '0+105', 'siguiente sección: ' + await p.textContent('.mc-secc-abs'));
  await p.click('button[data-pestana=volumenes]'); await p.waitForSelector('.mc-volumenes'); await p.waitForTimeout(300);
  const filasV = await p.$$eval('.mc-tabla-vol tbody tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  // (16.4+20.4)/2×5 = 92.000; (20.4+24.4)/2×5 = 112.000; (24.4+28.4)/2×5 = 132.000; último tramo de 4 m: (28.4+31.6)/2×4 = 120.000 → total 456.000
  ok(filasV[1] === '0+105 20.400 0.000 5.000 92.000 0.000' && filasV[4] === '0+119 31.600 0.000 4.000 120.000 0.000', 'tabla de volúmenes (cuentas a mano): ' + filasV[1] + ' | ' + filasV[4]);
  ok(filasV[5] === 'TOTAL 19.000 456.000 0.000' && (await p.textContent('.mc-vol-corte')).includes('456.000'), 'total por secciones 456.000 m³ = suma de las filas: ' + filasV[5]);
  const cmp = await p.textContent('.mc-vol-comparar');
  ok(/corte 45[0-9]\.\d{3} m³/.test(cmp) && /diferencia [+-]?\d\.\d %/.test(cmp), 'por mallas en la franja, para comparar (8 × 19 × 3 = 456 + los cuadros del borde): ' + cmp.split('Si la')[0]);
  await p.click('button[data-metodo=mallas]'); await p.waitForTimeout(400);
  ok((await p.textContent('.mc-volumenes')).includes('Por mallas (cuadros de 0.250 m'), 'método por mallas como principal');
  await p.click('button:has-text("toda la zona común")'); await p.waitForTimeout(600);
  const todo = await p.textContent('.mc-vol-corte');
  ok(/1[01]\d\d\.\d{3}/.test(todo), 'por mallas en toda la zona común (~19.7 × 19.7 × 3): ' + todo);
  await p.click('button[data-metodo=secciones]'); await p.click('button:has-text("la franja de las secciones")');
  await p.click('button:has-text("Copiar tabla")'); await p.waitForTimeout(200);
  const d3 = await p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].secciones; });
  ok(d3 && d3.paso === '5' && d3.izq === '4' && d3.metodo === 'secciones' && d3.linea && d3.linea.objId === 'eje', 'la configuración de secciones y volumen queda guardada en el proyecto');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Volúmenes sin desplazamiento de lado en celular (la tabla se desliza dentro de su caja)');
  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
