// OJO: la superficie se llama "Suelo natural" y no "Terreno natural" a propósito: correr.js toma por error
// cualquier línea que contenga "ERR", y "TERRENO" la contiene (T-ERR-ENO).
// v35: (1) curvas de nivel y triángulos al DXF, (2) ATTRIB del DXF como puntos, (3) replanteo desde estación.
//   node pruebas/v35.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── terreno: plano inclinado al 2 % en x (cotas 100 a 104 en 200 m), 11 × 5 puntos cada 20 × 10 m ──
  const objs = []; let n = 1;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 4; j++) objs.push({ id: n, t: 'p', x: i * 20, y: j * 10, z: 100 + 0.02 * (i * 20), nom: String(n++), d: 'TN' });
  const proy = [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 300, objs }],
    superficies: [{ id: 111, nombre: 'Suelo natural', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' }] }];
  const ir = async tab => { await p.evaluate(t => localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: t })), tab);
    await p.reload(); await p.waitForTimeout(600); };
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); }, proy);

  // ══ 1. CURVAS Y TRIÁNGULOS AL DXF ══
  const dxf = (dxfSup) => p.evaluate(ds => {
    const pr = JSON.parse(JSON.stringify(HIST.actual.proyectos[0]));
    if (ds) pr.superficies[0].dxf = ds;
    return crearDXF(pr.dibujos[0], pr);
  }, dxfSup);
  await ir('dibujo');
  const base = await dxf(null);
  ok(/^0\r\nSECTION/.test(base) && /EOF/.test(base), 'el DXF de siempre se arma (' + base.length + ' bytes)');
  const sinMarcar = await dxf({ curvas: false, tin: false });
  ok(sinMarcar === base, 'sin marcar nada, el DXF sale IDÉNTICO byte por byte');

  const conCurvas = await dxf({ curvas: true, tin: false });
  const capas = [...new Set((conCurvas.match(/SUELO_NATURAL-[A-Z-]+/g) || []))].sort();
  ok(capas.join(',') === 'SUELO_NATURAL-CURVAS-MAY,SUELO_NATURAL-CURVAS-MEN', 'las curvas van en sus dos capas: ' + capas.join(', '));
  const pol = (conCurvas.match(/\nPOLYLINE\r/g) || []).length;
  ok(pol > 0 && pol < 40, 'cada nivel sale como UNA polilínea, no mil líneas (' + pol + ' polilíneas)');
  ok(/\n70\r\n8\r/.test(conCurvas), 'las polilíneas son 3D (bandera 8)');
  // el plano va de 100 a 104 con paso 1 → curvas en 101, 102, 103 (100 y 104 son los bordes exactos)
  const niveles = await p.evaluate(() => { const pr = HIST.actual.proyectos[0];
    return curvasTIN(superficieTIN(pr, pr.superficies[0]), 1).map(c => c.z); });
  ok(niveles.join(',') === '101,102,103,104', 'curvas cada 1 m en un plano de 100 a 104: ' + niveles.join(', '));
  // en el DXF, cada vértice de la curva de 102 lleva su cota 102
  const cotas102 = (conCurvas.match(/\n30\r\n102\r/g) || []).length;
  ok(cotas102 >= 5, 'los vértices de la curva 102 llevan la cota 102 (' + cotas102 + ' vértices)');
  // la curva de 102 está donde debe: x = (102-100)/0.02 = 100 m
  const xs102 = await p.evaluate(() => { const pr = HIST.actual.proyectos[0];
    const c = curvasTIN(superficieTIN(pr, pr.superficies[0]), 1).find(q => q.z === 102);
    return [...new Set(c.tramos.flatMap(t => [Math.round(t[0] * 1000) / 1000, Math.round(t[2] * 1000) / 1000]))]; });
  ok(xs102.length === 1 && xs102[0] === 100, 'la curva de 102 cae en x = 100.000 m exacto (' + xs102.join(', ') + ')');

  const conTin = await dxf({ curvas: false, tin: true });
  const caras = (conTin.match(/\n3DFACE\r/g) || []).length;
  const tri = await p.evaluate(() => { const pr = HIST.actual.proyectos[0]; return superficieTIN(pr, pr.superficies[0]).tri.length / 3; });
  ok(caras === tri && caras > 50, 'sale una cara 3D por triángulo (' + caras + ' de ' + tri + ')');
  ok(/SUELO_NATURAL-TIN/.test(conTin), 'los triángulos van a su capa SUELO_NATURAL-TIN');
  const ambas = await dxf({ curvas: true, tin: true });
  ok(/3DFACE/.test(ambas) && /CURVAS-MAY/.test(ambas), 'se pueden llevar las dos cosas a la vez');
  // la casilla existe en el editor de la superficie
  await ir('superficies'); await p.waitForTimeout(400);
  await p.click('.mc-superficies .mc-sup-nombre, .mc-sup-editar').catch(() => {});
  const edit = await p.$('.mc-dxf-curvas');
  if (!edit) { const b2 = await p.$$('.mc-superficies button'); for (const x of b2) { const t = await x.textContent(); if (/Ajustes|⚙|Editar/i.test(t)) { await x.click(); break; } } }
  await p.waitForTimeout(300);
  ok(!!(await p.$('.mc-dxf-curvas')) && !!(await p.$('.mc-dxf-tin')), 'las dos casillas "Llevar al DXF" están en el editor de la superficie');

  // ══ 2. ATTRIB: un bloque con atributos entra como punto ══
  const dxfConAttrib = [
    '0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC',
    '0','SECTION','2','BLOCKS',
    '0','BLOCK','2','PUNTO_TOPO','10','0','20','0','30','0',
    '0','CIRCLE','8','0','10','0','20','0','40','0.3',
    '0','ENDBLK',
    '0','BLOCK','2','ARBOL','10','0','20','0','30','0',
    '0','LINE','8','0','10','0','20','0','11','0','21','2',
    '0','ENDBLK',
    '0','ENDSEC',
    '0','SECTION','2','ENTITIES',
    // punto topográfico con atributos (como lo saca Civil 3D)
    '0','INSERT','8','PUNTOS','2','PUNTO_TOPO','10','1000.5','20','2000.25','30','0','66','1',
    '0','ATTRIB','8','PUNTOS','10','1000.5','20','2000.25','40','0.5','1','147','2','NUMERO',
    '0','ATTRIB','8','PUNTOS','10','1000.5','20','2000.25','40','0.5','1','1520,345','2','COTA',
    '0','ATTRIB','8','PUNTOS','10','1000.5','20','2000.25','40','0.5','1','BORDE VIA','2','DESCRIPCION',
    '0','SEQEND',
    // otro igual pero sin número (solo cota y descripción)
    '0','INSERT','8','PUNTOS','2','PUNTO_TOPO','10','1010','20','2010','66','1',
    '0','ATTRIB','8','PUNTOS','1','1519.870','2','ELEVATION',
    '0','SEQEND',
    // un bloque con atributos que NO son de punto: se dibuja como bloque
    '0','INSERT','8','ROTULO','2','ARBOL','10','50','20','50','66','1',
    '0','ATTRIB','8','ROTULO','1','Mi obra','2','TITULO',
    '0','SEQEND',
    // y un bloque normal sin atributos
    '0','INSERT','8','ARBOLES','2','ARBOL','10','80','20','80',
    '0','ENDSEC','0','EOF'
  ].join('\r\n') + '\r\n';
  const r = await p.evaluate(t => { const x = leerDXF(t, 1); return { error: x.error, resumen: x.resumen, objs: x.objs.map(o => ({ t: o.t, x: o.x, y: o.y, z: o.z, nom: o.nom, d: o.d })) }; }, dxfConAttrib);
  ok(!r.error, 'el DXF con atributos se lee sin error' + (r.error ? ': ' + r.error : ''));
  const pts = r.objs.filter(o => o.t === 'p');
  ok(pts.length === 2, 'entran 2 puntos de los bloques con atributos (' + pts.length + ')');
  const p1 = pts.find(o => o.nom === '147');
  ok(p1 && p1.x === 1000.5 && p1.y === 2000.25 && p1.z === 1520.345 && p1.d === 'BORDE VIA',
    'el primero trae número 147, cota 1520.345 (con coma decimal) y descripción BORDE VIA: ' + JSON.stringify(p1));
  const p2 = pts.find(o => o.z === 1519.87);
  ok(p2 && p2.nom === '1', 'el que no trae número toma el consecutivo (' + (p2 || {}).nom + ')');
  const res2 = {}; r.resumen.forEach(x => { res2[x.tipo] = x.n; });
  ok(res2.PUNTO_ATRIB === 2, 'la revisión los cuenta aparte: "Puntos de bloques con atributos" = ' + res2.PUNTO_ATRIB);
  ok(res2.BLOQUE === 2, 'los otros dos bloques se siguen dibujando como bloques (' + res2.BLOQUE + ')');
  const lineas = r.objs.filter(o => o.t === 'l').length;
  ok(lineas === 2, 'y sus líneas quedan en el dibujo (' + lineas + ')');

  // ══ 3. REPLANTEO DESDE ESTACIÓN ══
  // estación en (0,0), atrás al norte (0,100) → azimut de referencia 0°.
  // estaca en (100,0) = al este → azimut 90° → ángulo a la derecha 90°, distancia 100.000 m
  const proy3 = [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 10, objs: [
    { id: 1, t: 'p', x: 0, y: 0, z: 100, nom: 'BM1', d: 'BM' },
    { id: 2, t: 'p', x: 0, y: 100, z: 101, nom: 'BM2', d: 'BM' },
    { id: 3, t: 'p', x: 100, y: 0, z: 98.5, nom: 'E14', d: 'ESTACA' },
    { id: 4, t: 'p', x: 100, y: 100, nom: 'E15', d: 'ESTACA' },
    // dos puntos lejanos para que "Ver todo" deje las estacas en el centro de la pantalla
    // (si quedan en una esquina, el toque cae sobre el botón flotante "Regenerar imagen")
    { id: 5, t: 'p', x: -90, y: -70, nom: 'L1' }, { id: 6, t: 'p', x: 190, y: 170, nom: 'L2' }] }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); }, proy3);
  await ir('dibujo');
  const herr = async (g, id) => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.click(`.tv-dib-hoja button[data-herr="${id}"]`); await p.waitForTimeout(150); };
  await herr('ver', '@todo'); await p.waitForTimeout(400);
  ok(!!(await p.$('.tv-dib-nav button[data-grupo=medir]')), 'el grupo Medir está');
  await herr('medir', 'replanteo');
  const cmd = async () => (await p.textContent('.tv-dib-cmd')).replace(/\s+/g, ' ');
  ok(/dónde está armada la estación/.test(await cmd()), 'pide la estación: ' + await cmd());
  const caja = await p.evaluate(() => { const r2 = document.querySelector('.tv-dib-svg').getBoundingClientRect(); return { l: r2.left, t: r2.top }; });
  const toque = async (wx, wy) => { const s = await p.evaluate(q => MC_DIB.aP(q), { x: wx, y: wy });
    if (movil) await p.touchscreen.tap(caja.l + s.X, caja.t + s.Y);
    else { await p.mouse.move(caja.l + s.X, caja.t + s.Y); await p.waitForTimeout(80); await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); }
    await p.waitForTimeout(260); };
  await toque(0, 0);
  ok(/visado ATRÁS/.test(await cmd()), 'ahora pide el punto de atrás: ' + await cmd());
  await toque(0, 100);
  ok(/toca la estaca/.test(await cmd()), 'ahora pide la estaca: ' + await cmd());
  await toque(100, 0);
  await p.waitForTimeout(300);
  const ang = await p.textContent('.mc-rep-ang').catch(() => null);
  const dist = await p.textContent('.mc-rep-dist').catch(() => null);
  ok(ang === '90° 00\' 00.0"' || /^90°\s*00/.test(String(ang)), 'ángulo a la derecha = 90° exacto (' + ang + ')');
  ok(dist === '100.000 m', 'distancia horizontal = 100.000 m (' + dist + ')');
  const txt = (await p.textContent('.tv-dib-panel')).replace(/\s+/g, ' ');
  ok(/E14/.test(txt), 'dice el nombre de la estaca (E14)');
  ok(/-1\.500/.test(txt), 'Δ cota = -1.500 m (de 100 a 98.5)');
  // una estaca sin cota: no se inventa el Δ
  await toque(100, 100);
  await p.waitForTimeout(300);
  const txt2 = (await p.textContent('.tv-dib-panel')).replace(/\s+/g, ' ');
  ok(/falta cota/.test(txt2), 'si la estaca no tiene cota, lo dice y no inventa el Δ');
  const ang2 = await p.textContent('.mc-rep-ang');
  ok(/^45°\s*00/.test(ang2), 'la de (100,100) da 45° exacto (' + ang2 + ')');
  // a la izquierda: 360 - 45 = 315
  await p.click('.tv-dib-cmd button:has-text("Ángulo a la")'); await p.waitForTimeout(250);
  await toque(100, 100); await p.waitForTimeout(300);
  const ang3 = await p.textContent('.mc-rep-ang');
  ok(/^315°\s*00/.test(ang3), 'a la izquierda la misma estaca da 315° (' + ang3 + ')');
  ok(/IZQUIERDA/.test(await p.textContent('.tv-dib-panel')), 'el cartel dice a qué lado se barre');
  // el cartel deja pasar los toques (si no, con el cartel abierto no se puede tocar la estaca siguiente)
  const pe = await p.evaluate(() => { const e = document.querySelector('.mc-rep-panel'); return e ? getComputedStyle(e).pointerEvents : null; });
  ok(pe === 'none', 'el cartel no roba los toques del dibujo (pointer-events: ' + pe + ')');
  // la libreta se copia
  ok(/Copiar la libreta/.test(await cmd()), 'hay botón para copiar la libreta: ' + (await cmd()).match(/Copiar la libreta \(\d+\)/));
  // el dibujo NO cambió
  const objsFin = await p.evaluate(() => HIST.actual.proyectos[0].dibujos[0].objs.length);
  ok(objsFin === 6, 'el replanteo NO toca el dibujo: siguen los 6 puntos');
  // azimut escrito a mano en vez del punto de atrás
  await p.click('.tv-dib-cmd button:has-text("Cambiar de estación")'); await p.waitForTimeout(250);
  await toque(0, 0);
  await p.fill('.tv-dib-cmd input[placeholder="azimut atrás"]', '90'); await p.waitForTimeout(250);
  ok(/toca la estaca/.test(await cmd()), 'con el azimut escrito ya pide la estaca: ' + await cmd());
  await toque(0, 100); await p.waitForTimeout(300);
  const ang4 = await p.textContent('.mc-rep-ang');
  // quedó puesto "a la izquierda": con referencia 90° la visual al norte (azimut 0) da 270° a la derecha = 90° a la izquierda
  ok(/^90°\s*00/.test(ang4), 'el azimut escrito a mano sirve de referencia: 90° a la izquierda (' + ang4 + ')');

  // ── estacas por coordenada (sin tenerlas dibujadas) y "Escribir" ──
  await p.click('.tv-dib-cmd button:has-text("Cambiar de estación")'); await p.waitForTimeout(250);
  await toque(0, 0);          // estación en (0,0)
  await toque(0, 100);        // atrás al norte → azimut de referencia 0
  await p.click('.tv-dib-cmd button:has-text("Estacas")'); await p.waitForTimeout(250);
  ok(!!(await p.$('.mc-rep-pegar')), 'se abre el panel de estacas por coordenada');
  // pegado del Excel: una buena con cota, una sin nombre, una con coma decimal y una mala
  await p.fill('.mc-rep-pegar', 'E20\t0\t50\t97.000\n0\t-50\nE22;70,711;70,711\nesto no sirve');
  await p.waitForTimeout(300);
  const filas = await p.$$('.mc-rep-fila');
  ok(filas.length === 3, 'lee 3 estacas del texto pegado (' + filas.length + ')');
  ok(/1 línea\(s\) sin Norte y Este/.test(await p.textContent('.tv-dib-panel')), 'avisa la línea que no sirve');
  // la primera: (N 0, E 50) → al este, 90° a la derecha, 50 m, Δ cota 97 - 100 = -3.000
  // ojo: en este punto de la prueba quedó puesto "ángulo a la IZQUIERDA", así que el este da 270° y el oeste 90°
  await p.click('.mc-rep-fila[data-i="0"]'); await p.waitForTimeout(350);
  ok(/^270°\s*00/.test(await p.textContent('.mc-rep-ang')), 'la estaca escrita (N 0, E 50) da 270° a la izquierda (' + await p.textContent('.mc-rep-ang') + ')');
  ok((await p.textContent('.mc-rep-dist')) === '50.000 m', 'y 50.000 m (' + await p.textContent('.mc-rep-dist') + ')');
  ok(/-3\.000/.test(await p.textContent('.mc-rep-panel')), 'con la cota escrita sale el Δ cota -3.000');
  // la segunda: (N 0, E -50) → al oeste, 90° a la izquierda
  await p.click('.mc-rep-fila[data-i="1"]'); await p.waitForTimeout(350);
  ok(/^90°\s*00/.test(await p.textContent('.mc-rep-ang')), 'la de (N 0, E -50) da 90° a la izquierda (' + await p.textContent('.mc-rep-ang') + ')');
  // la tercera, con coma decimal: (70.711, 70.711) → 45° y 100.000 m
  await p.click('.mc-rep-fila[data-i="2"]'); await p.waitForTimeout(350);
  ok(/^315°\s*00/.test(await p.textContent('.mc-rep-ang')), 'la escrita con coma decimal (70,711 / 70,711) da 315° a la izquierda (' + await p.textContent('.mc-rep-ang') + ')');
  ok((await p.textContent('.mc-rep-dist')) === '100.000 m', 'y 100.000 m (' + await p.textContent('.mc-rep-dist') + ')');
  const antesDib = await p.evaluate(() => HIST.actual.proyectos[0].dibujos[0].objs.length);
  ok(antesDib === 6, 'las estacas escritas NO se meten al dibujo solas (' + antesDib + ' objetos)');
  await p.click('.tv-dib-panel button:has-text("Dibujarlas")'); await p.waitForTimeout(400);
  ok((await p.evaluate(() => HIST.actual.proyectos[0].dibujos[0].objs.length)) === 9, 'y con "Dibujarlas" quedan las 3 en el dibujo');

  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs[0] : ''));
  console.log(fallas ? '\n' + fallas + ' FALLAS' : '\nTodo bien (' + (movil ? 'celular' : 'PC') + ')');
  await b.close(); process.exit(fallas ? 1 : 0);
})();
