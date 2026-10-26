// Importar DXF (v31). Se prueba con un DXF escrito a mano (LWPOLYLINE con curva, bloque, MTEXT,
// sombreado y cota que deben saltarse) y con nuestro propio DXF de ida y vuelta.
//   node pruebas/leerdxf.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');

// DXF a mano: 2 capas, un punto, una línea, una LWPOLYLINE cerrada con un lado curvo (bulge 0.5),
// un círculo, un arco, un MTEXT, un bloque "ARBOL" insertado girado 90°, un sombreado y una cota.
const DXF = ['0','SECTION','2','HEADER','9','$ACADVER','1','AC1015','0','ENDSEC',
 '0','SECTION','2','TABLES','0','TABLE','2','LAYER','70','2',
 '0','LAYER','2','TN','70','0','62','3','6','CONTINUOUS',
 '0','LAYER','2','BORDE','70','0','62','1','6','CONTINUOUS',
 '0','ENDTAB','0','ENDSEC',
 '0','SECTION','2','BLOCKS',
 '0','BLOCK','2','ARBOL','10','0.0','20','0.0',
 '0','LINE','8','BORDE','10','0.0','20','0.0','30','0.0','11','2.0','21','0.0','31','0.0',
 '0','CIRCLE','8','BORDE','10','0.0','20','0.0','30','0.0','40','1.0',
 '0','ENDBLK',
 '0','ENDSEC',
 '0','SECTION','2','ENTITIES',
 '0','POINT','8','TN','10','1000.5','20','2000.25','30','1501.2',
 '0','LINE','8','BORDE','10','1000.0','20','2000.0','30','0.0','11','1020.0','21','2010.0','31','0.0',
 '0','LWPOLYLINE','8','BORDE','90','3','70','1','10','1000.0','20','2000.0','42','0.5','10','1015.0','20','2000.0','10','1015.0','20','2012.0',
 '0','CIRCLE','8','TN','10','1030.0','20','2000.0','30','0.0','40','4.0',
 '0','ARC','8','TN','10','1040.0','20','2000.0','30','0.0','40','3.0','50','0.0','51','90.0',
 '0','MTEXT','8','TN','10','1010.0','20','1975.0','40','0.5','1','\\fArial|b0;AREA 180 m2',
 '0','TEXT','8','TN','10','0.0','20','0.0','40','2.0','1','CENTRADO','72','1','11','1060.0','21','1990.0',
 '0','INSERT','8','BORDE','2','ARBOL','10','1050.0','20','2000.0','41','1.0','42','1.0','50','90.0',
 '0','HATCH','8','TN','10','0.0','20','0.0',
 '0','DIMENSION','8','TN','10','0.0','20','0.0',
 '0','SPLINE','8','TN','10','0.0','20','0.0',
 '0','ENDSEC','0','EOF'].join('\r\n');

(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 820 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  const casi = (a, b2, t) => Math.abs(a - b2) < (t || 1e-6);
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── 1. el DXF escrito a mano ──
  const r = await p.evaluate(t => leerDXF(t, 1), DXF);
  const cuenta = t => (r.resumen.find(x => x.tipo === t) || { n: 0 }).n;
  const salta = t => (r.saltados.find(x => x.tipo === t) || { n: 0 }).n;
  ok(!r.error && r.objs.length === 9, 'lee el archivo: 9 objetos (punto, línea, polilínea, círculo, arco, 2 textos y los 2 del bloque) → ' + r.objs.length);
  const pto = r.objs.find(o => o.t === 'p');
  ok(pto && casi(pto.x, 1000.5) && casi(pto.y, 2000.25) && casi(pto.z, 1501.2) && pto.d === 'TN' && pto.col === '#16A34A',
    'el punto trae Este 1000.5, Norte 2000.25, cota 1501.2, descripción TN y el verde de su capa');
  const pl = r.objs.find(o => o.t === 'pl');
  ok(pl && pl.c === true && pl.v.length === 3 && casi(pl.v[0].b, 0.5) && pl.col === '#DC2626',
    'la polilínea llega cerrada, con 3 vértices, el lado curvo (curvatura 0.5) y el rojo de su capa');
  const arcoOK = await p.evaluate(o => { const A = DIB.arcoDe(o.v[0], o.v[1], o.v[0].b); return { r: A.r, largo: A.largo, area: DIB.areaObj(o) }; }, pl);
  ok(casi(arcoOK.r, 9.375, 1e-9) && casi(arcoOK.area, 129.313056, 1e-5),
    'la curva importada se puede medir: radio 9.375 m y área ' + arcoOK.area.toFixed(6) + ' m² (90 del triángulo + 39.313 del arco)');
  const ar = r.objs.find(o => o.t === 'ar');
  ok(ar && casi(ar.r, 3) && casi(ar.a1, 0) && casi(ar.a2, Math.PI / 2), 'el arco llega con su radio y sus ángulos en radianes (0 a 90°)');
  const tx = r.objs.find(o => o.t === 'tx');
  ok(tx && tx.s === 'AREA 180 m2', 'el MTEXT llega limpio, sin los códigos de formato: "' + (tx ? tx.s : '') + '"');
  const bloque = r.objs.filter(o => o.t === 'ci' && casi(o.r, 1));
  const lin = r.objs.filter(o => o.t === 'l');
  ok(bloque.length === 1 && casi(bloque[0].c.x, 1050) && casi(bloque[0].c.y, 2000) && cuenta('BLOQUE') === 1,
    'el bloque se dibuja con sus líneas en el sitio donde se insertó (1050, 2000)');
  const lb = lin.find(o => casi(o.a.x, 1050) && casi(o.a.y, 2000));
  ok(lb && casi(lb.b.x, 1050, 1e-9) && casi(lb.b.y, 2002, 1e-9), 'el bloque entra girado 90°: su línea de 2 m va hacia el Norte');
  ok(salta('HATCH') === 1 && salta('DIMENSION') === 1 && salta('SPLINE') === 1 && r.saltados.length === 3,
    'dice qué no se trajo: 1 sombreado, 1 cota de AutoCAD y 1 spline');
  ok(r.capas.length === 2 && r.capas.every(c => c.n > 0), 'lista las capas que de verdad trajeron objetos: ' + r.capas.map(c => c.nombre + ':' + c.n).join(', '));

  // ── texto centrado: su posición de verdad va en el grupo 11, no en el 10 (arreglo 3 de la auditoría) ──
  const cen = r.objs.find(o => o.t === 'tx' && o.s === 'CENTRADO');
  ok(cen && casi(cen.p.x, 1060) && casi(cen.p.y, 1990),
    'un texto centrado cae donde va, no en el (0,0) del grupo 10: (' + (cen ? cen.p.x + ', ' + cen.p.y : '?') + ')');

  // ── unidades del archivo (arreglo 2): en milímetros entraría 1000 veces más grande ──
  const uni = await p.evaluate(() => {
    const hacer = ins => ['0','SECTION','2','HEADER','9','$ACADVER','1','AC1015','9','$INSUNITS','70',String(ins),'0','ENDSEC',
      '0','SECTION','2','ENTITIES','0','LINE','8','0','10','0.0','20','0.0','11','5000.0','21','0.0','0','ENDSEC','0','EOF'].join('\r\n');
    const sinCab = ['0','SECTION','2','ENTITIES','0','LINE','8','0','10','0.0','20','0.0','11','5.0','21','0.0','0','ENDSEC','0','EOF'].join('\r\n');
    return { mm: leerDXF(hacer(4), 1).unidades, m: leerDXF(hacer(6), 1).unidades, cero: leerDXF(hacer(0), 1).unidades, nada: leerDXF(sinCab, 1).unidades };
  });
  ok(uni.mm && uni.mm.nombre === 'milímetros' && casi(uni.mm.factor, 0.001) && uni.mm.conocida === true,
    'reconoce que el archivo está en milímetros y que hay que multiplicar por 0.001');
  ok(uni.m && casi(uni.m.factor, 1) && uni.cero && uni.cero.conocida === false && uni.nada === null,
    'en metros no cambia nada; "sin unidad" y un archivo sin encabezado se tratan como metros y se avisa');

  // ── 1. un DXF grande se lee rápido (antes era cuadrático: 2 MB tardaba 2 segundos) ──
  const vel = await p.evaluate(() => {
    const L = ['0','SECTION','2','ENTITIES'];
    for (let i = 0; i < 20000; i++) L.push('0','POINT','8','TN','10',String(1000 + i * 0.1),'20','2000','30','1500');
    for (let i = 0; i < 3000; i++) { L.push('0','POLYLINE','8','B','66','1','70','0');
      for (let j = 0; j < 8; j++) L.push('0','VERTEX','8','B','10',String(i + j * 0.5),'20',String(j));
      L.push('0','SEQEND','8','B'); }
    L.push('0','ENDSEC','0','EOF');
    const t = L.join('\r\n'), t0 = performance.now(), rr = leerDXF(t, 1);
    return { mb: +(t.length / 1048576).toFixed(2), objs: rr.objs.length, ms: Math.round(performance.now() - t0) };
  });
  ok(vel.objs === 23000 && vel.ms < 900, 'un DXF de ' + vel.mb + ' MB con 3000 polilíneas se lee en ' + vel.ms + ' ms (antes 1971 ms)');

  // ── 2. ida y vuelta con nuestro propio DXF ──
  const ida = await p.evaluate(() => {
    const dib = { nombre: 'd', objs: [
      { id: 1, t: 'pl', c: true, v: [{ x: 500, y: 700, b: -0.75 }, { x: 520, y: 700 }, { x: 520, y: 715 }, { x: 500, y: 715 }] },
      { id: 2, t: 'ci', c: { x: 540, y: 700 }, r: 2.5 }] };
    const leido = leerDXF(crearDXF(dib), 1);
    const a = dib.objs[0], c2 = leido.objs.find(o => o.t === 'pl');
    return { area1: DIB.areaObj(a), area2: c2 ? DIB.areaObj(c2) : null, largo1: DIB.largoObj(a), largo2: c2 ? DIB.largoObj(c2) : null,
      bul: c2 ? c2.v[0].b : null, r: (leido.objs.find(o => o.t === 'ci') || {}).r, n: leido.objs.length };
  });
  ok(casi(ida.bul, -0.75, 1e-9) && casi(ida.area1, ida.area2, 1e-6) && casi(ida.largo1, ida.largo2, 1e-6),
    'ida y vuelta por DXF: la curvatura, el área (' + ida.area1.toFixed(4) + ') y el perímetro quedan iguales');
  ok(casi(ida.r, 2.5), 'el círculo vuelve con su radio exacto');

  // ── v48: lo que antes no se traía: SPLINE, MLINE, TRACE, mallas, tablas de AutoCAD y la lista de clases (Civil 3D) ──
  const v48 = await p.evaluate(() => {
    const D = a => a.map(String);
    const t = D(['0', 'SECTION', '2', 'CLASSES', '0', 'CLASS', '1', 'AECC_COGO_POINT', '2', 'AeccDbCogoPoint', '3', 'Civil', '90', '0', '91', '5', '280', '0', '281', '1', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'BLOCKS', '0', 'BLOCK', '2', '*T1', '10', '0', '20', '0', '0', 'LINE', '8', '0', '10', '500', '20', '0', '11', '510', '21', '0', '0', 'ENDBLK', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
      // spline de grado 2 con nudos 0 0 0 1 1 1: es una parábola; a la mitad vale 0.25·P0 + 0.5·P1 + 0.25·P2 = (5, 5)
      '0', 'SPLINE', '8', '0', '70', '8', '71', '2', '72', '6', '73', '3', '74', '0', '40', '0', '40', '0', '40', '0', '40', '1', '40', '1', '40', '1',
      '10', '0', '20', '0', '30', '0', '10', '5', '20', '10', '30', '0', '10', '10', '20', '0', '30', '0',
      // multilínea de 2 líneas: la de corrimiento 0 y la de corrimiento -2 a lo largo del inglete (0, 1)
      '0', 'MLINE', '8', '0', '71', '0', '72', '2', '73', '2', '10', '100', '20', '0',
      '11', '100', '21', '0', '12', '1', '22', '0', '13', '0', '23', '1', '74', '2', '41', '0', '41', '0', '75', '0', '74', '2', '41', '-2', '41', '0', '75', '0',
      '11', '120', '21', '0', '12', '1', '22', '0', '13', '0', '23', '1', '74', '2', '41', '0', '41', '0', '75', '0', '74', '2', '41', '-2', '41', '0', '75', '0',
      '0', 'TRACE', '8', '0', '10', '200', '20', '0', '11', '210', '21', '0', '12', '200', '22', '5', '13', '210', '23', '5',
      // malla de caras: 4 vértices y 2 caras
      '0', 'POLYLINE', '8', '0', '70', '64', '71', '4', '72', '2',
      '0', 'VERTEX', '8', '0', '10', '300', '20', '0', '30', '1', '70', '192', '0', 'VERTEX', '8', '0', '10', '310', '20', '0', '30', '2', '70', '192',
      '0', 'VERTEX', '8', '0', '10', '310', '20', '10', '30', '3', '70', '192', '0', 'VERTEX', '8', '0', '10', '300', '20', '10', '30', '4', '70', '192',
      '0', 'VERTEX', '8', '0', '10', '0', '20', '0', '70', '128', '71', '1', '72', '2', '73', '3', '0', 'VERTEX', '8', '0', '10', '0', '20', '0', '70', '128', '71', '1', '72', '-3', '73', '4',
      '0', 'SEQEND',
      // malla de cuadrícula 2 × 3: 2 filas y 3 columnas
      '0', 'POLYLINE', '8', '0', '70', '16', '71', '2', '72', '3',
      '0', 'VERTEX', '8', '0', '10', '400', '20', '0', '0', 'VERTEX', '8', '0', '10', '401', '20', '0', '0', 'VERTEX', '8', '0', '10', '402', '20', '0',
      '0', 'VERTEX', '8', '0', '10', '400', '20', '1', '0', 'VERTEX', '8', '0', '10', '401', '20', '1', '0', 'VERTEX', '8', '0', '10', '402', '20', '1', '0', 'SEQEND',
      '0', 'ACAD_TABLE', '8', '0', '2', '*T1', '10', '500', '20', '0',
      '0', 'ENDSEC', '0', 'EOF']).join('\n');
    const r = leerDXF(t, 1), O = r.objs;
    const sp = O.find(o => o.t === 'pl' && o.v.length > 10 && o.v[0].x === 0), mitad = sp && sp.v[Math.round((sp.v.length - 1) / 2)];
    const ml = O.filter(o => o.t === 'pl' && o.v.length === 2 && o.v[0].x === 100);
    const tr = O.find(o => o.t === 'pl' && o.som === 'relleno' && o.v.some(q => q.x === 200));
    const caras = O.filter(o => o.t === 'pl' && o.c && o.v.some(q => q.x === 300));
    const cuad = O.filter(o => o.t === 'pl' && o.v.every(q => q.x >= 400 && q.x <= 402));
    const tabla = O.find(o => o.t === 'l' && o.a.x === 500 && o.b.x === 510);
    return { mitad, ml: ml.map(o => o.v.map(q => [q.x, q.y])), tr: tr && tr.v.length, caras: caras.map(o => o.v.map(q => q.z)), cuad: cuad.map(o => o.v.length).sort(),
      tabla: !!tabla, saltados: r.saltados, resumen: r.resumen.map(x => x.tipo) };
  });
  ok(v48.mitad && casi(v48.mitad.x, 5, 1e-6) && casi(v48.mitad.y, 5, 1e-6), 'SPLINE: la curva de verdad (la parábola pasa por (5, 5) a la mitad), no sus puntos de control: ' + JSON.stringify(v48.mitad));
  ok(JSON.stringify(v48.ml) === JSON.stringify([[[100, 0], [120, 0]], [[100, -2], [120, -2]]]), 'MLINE: sus 2 líneas, la segunda corrida 2 m por el inglete: ' + JSON.stringify(v48.ml));
  ok(v48.tr === 4, 'TRACE: entra como relleno de 4 esquinas');
  ok(JSON.stringify(v48.caras) === JSON.stringify([[1, 2, 3], [1, 3, 4]]), 'malla de caras: 2 caras con las cotas de sus vértices: ' + JSON.stringify(v48.caras));
  ok(JSON.stringify(v48.cuad) === JSON.stringify([2, 2, 2, 3, 3]), 'malla de cuadrícula 2 × 3: 2 filas de 3 y 3 columnas de 2: ' + JSON.stringify(v48.cuad));
  ok(v48.tabla && v48.resumen.includes('TABLA'), 'tabla de AutoCAD: se dibuja su bloque *T');
  ok(v48.saltados.some(x => x.tipo === 'AECC_COGO_POINT' && x.n === 5), 'lo de Civil 3D que no se puede leer se cuenta en "no se trae" (5 AECC_COGO_POINT): ' + JSON.stringify(v48.saltados));

  // ── v48: presentaciones (espacio papel). Ventana con centro (50, 50) en el papel, 40 × 20, que mira el modelo en (50, 0) con
  // 10 de alto: escala 2. La línea del modelo (0,0)–(100,0) cae en el papel en y = 50 y se recorta a x de 30 a 70 ──
  const pres = await p.evaluate(() => {
    const t = ['0', 'SECTION', '2', 'TABLES', '0', 'BLOCK_RECORD', '5', 'A1', '2', '*Paper_Space', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'BLOCKS', '0', 'BLOCK', '2', '*Paper_Space', '10', '0', '20', '0', '0', 'ENDBLK', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
      '0', 'LINE', '8', '0', '10', '0', '20', '0', '11', '100', '21', '0',
      '0', 'LINE', '8', '0', '67', '1', '10', '0', '20', '0', '11', '297', '21', '0',   // del papel (67 = 1): no va al modelo
      '0', 'VIEWPORT', '8', '0', '67', '1', '10', '148', '20', '105', '40', '297', '41', '210', '68', '1', '69', '1', '12', '148', '22', '105', '45', '210',
      '0', 'VIEWPORT', '8', '0', '67', '1', '10', '50', '20', '50', '40', '40', '41', '20', '68', '2', '69', '2', '12', '50', '22', '0', '16', '0', '26', '0', '36', '1', '45', '10',
      '0', 'ENDSEC', '0', 'SECTION', '2', 'OBJECTS', '0', 'LAYOUT', '330', '1A', '1', 'Lámina 1', '71', '1', '330', 'A1', '0', 'ENDSEC', '0', 'EOF'].join('\n');
    const r = leerDXF(t, 1), L = r.presentaciones[0];
    const recorte = L && L.objs.find(o => o.t === 'l' && o.a.y === 50);
    return { modelo: r.objs.length, n: r.presentaciones.length, nombre: L && L.nombre, ventanas: L && L.ventanas, recorte: recorte && [[recorte.a.x, recorte.a.y], [recorte.b.x, recorte.b.y]],
      papel: L && L.objs.some(o => o.t === 'l' && o.b.x === 297) };
  });
  ok(pres.modelo === 1, 'la línea del papel (67 = 1) no se mezcla con el modelo: ' + pres.modelo + ' objeto en el modelo');
  ok(pres.n === 1 && pres.nombre === 'Lámina 1' && pres.ventanas === 1 && pres.papel, 'la presentación "Lámina 1" trae su papel y 1 ventana (la de la hoja entera no cuenta)');
  ok(pres.recorte && pres.recorte.every((q, i) => casi(q[0], [30, 70][i], 1e-9) && casi(q[1], 50, 1e-9)),
    'en la ventana, la línea del modelo queda a escala 2 y recortada al marco: de (30, 50) a (70, 50): ' + JSON.stringify(pres.recorte));

  // ── v59: la hoja de la presentación (límites del LAYOUT) y los puntos en la hoja: un POINT suelto va sin textos (en AutoCAD no
  // lleva), uno de un bloque con atributos conserva su número y su cota ──
  const hoja = await p.evaluate(() => {
    const t = ['0', 'SECTION', '2', 'TABLES', '0', 'BLOCK_RECORD', '5', 'A1', '2', '*Paper_Space', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'BLOCKS', '0', 'BLOCK', '2', '*Paper_Space', '10', '0', '20', '0', '0', 'ENDBLK', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'ENTITIES',
      '0', 'POINT', '8', 'P PUNTOS COORDENADAS ZV', '10', '48', '20', '1', '30', '5',
      '0', 'INSERT', '8', 'P PUNTOS COORDENADAS ZV', '2', 'PTO', '66', '1', '10', '52', '20', '1',
      '0', 'ATTRIB', '8', '0', '10', '52', '20', '1', '1', '91', '2', 'PUNTO', '0', 'ATTRIB', '8', '0', '10', '52', '20', '1', '1', '956.640', '2', 'COTA', '0', 'SEQEND',
      '0', 'LINE', '8', '0', '67', '1', '10', '0', '20', '0', '11', '297', '21', '0',
      '0', 'VIEWPORT', '8', '0', '67', '1', '10', '148', '20', '105', '40', '297', '41', '210', '68', '1', '69', '1', '12', '148', '22', '105', '45', '210',
      '0', 'VIEWPORT', '8', '0', '67', '1', '10', '50', '20', '50', '40', '40', '41', '20', '68', '2', '69', '2', '12', '50', '22', '0', '16', '0', '26', '0', '36', '1', '45', '10',
      '0', 'ENDSEC', '0', 'SECTION', '2', 'OBJECTS', '0', 'LAYOUT', '330', '1A', '1', 'Lámina 1', '10', '-5', '20', '-7', '11', '292', '21', '203', '71', '1', '330', 'A1', '0', 'ENDSEC', '0', 'EOF'].join('\n');
    const r = leerDXF(t, 1), L = r.presentaciones[0], pts = L ? L.objs.filter(o => o.t === 'p') : [];
    const suelto = pts.find(o => o.nom !== '91'), atrib = pts.find(o => o.nom === '91');
    const dib = { nombre: 'Lámina 1 · presentación', pres: true, objs: [] };
    return { hoja: L && L.hoja, n: pts.length, suelto: suelto && { nom: suelto.nom, z: suelto.z, d: suelto.d }, atrib: atrib && { z: atrib.z, x: atrib.x, y: atrib.y },
      modeloD: (r.objs.find(o => o.t === 'p' && o.nom !== '91') || {}).d, etq: etqDe(dib) };
  });
  ok(hoja.hoja && hoja.hoja.x0 === -5 && hoja.hoja.y0 === -7 && hoja.hoja.x1 === 292 && hoja.hoja.y1 === 203, 'la presentación trae su hoja (límites del LAYOUT): ' + JSON.stringify(hoja.hoja));
  ok(hoja.n === 2 && hoja.suelto && hoja.suelto.nom === undefined && hoja.suelto.z === undefined && hoja.suelto.d === undefined && hoja.modeloD === 'P PUNTOS COORDENADAS ZV',
    'en la hoja el POINT suelto va sin número, cota ni capa (en el modelo sigue con su capa): ' + JSON.stringify(hoja.suelto));
  ok(hoja.atrib && hoja.atrib.z === 956.64 && casi(hoja.atrib.x, 54, 1e-9) && casi(hoja.atrib.y, 52, 1e-9) && hoja.etq.num && hoja.etq.z && !hoja.etq.d,
    'el punto de un bloque con atributos llega a la hoja con su número 91 y su cota 956.640, y la hoja muestra número y cota: ' + JSON.stringify(hoja));

  // ── v47: los 256 colores de AutoCAD entran con su color exacto y vuelven con su número ──
  const aci = await p.evaluate(() => {
    const lin = c => ['0', 'LINE', '8', '0', '62', String(c), '10', '0', '20', '0', '11', '10', '21', '0'];
    const t = ['0', 'SECTION', '2', 'ENTITIES'].concat(lin(140), lin(92), lin(1), lin(7), ['0', 'ENDSEC', '0', 'EOF']).join('\n');
    const r = leerDXF(t, 1), cols = r.objs.map(o => o.col || null);
    const vuelta = crearDXF({ id: 1, nombre: 'd', objs: r.objs.map((o, i) => ({ ...o, id: i + 1 })) }).split(/\r?\n/);
    return { cols, sinColor: r.sinColor, txt: vuelta.join('\n') };
  });
  ok(aci.cols[0] === '#00BFFF' && aci.cols[1] === '#00A500' && aci.cols[2] === '#DC2626' && aci.cols[3] === null && aci.sinColor === 0,
    'colores de AutoCAD: el 140 entra azul celeste exacto (#00BFFF), el 92 verde (#00A500), el 1 y el 7 como siempre, y ninguno queda sin color: ' + JSON.stringify(aci.cols));
  ok(/\n62\n140\n/.test(aci.txt) && /\n62\n92\n/.test(aci.txt), 'y al exportar el DXF vuelven con su mismo número de color (140 y 92)');

  // ── 3. archivos que no sirven ──
  const malos = await p.evaluate(() => ({
    bin: leerDXF('AutoCAD Binary DXF\r\n\u0000\u0000', 1).error,
    vacio: leerDXF('hola mundo\nesto no es un dxf', 1).error,
    sinNada: leerDXF(['0', 'SECTION', '2', 'ENTITIES', '0', 'ENDSEC', '0', 'EOF'].join('\n'), 1).error
  }));
  ok(/binario/i.test(malos.bin || ''), 'un DXF binario se rechaza con una explicación: "' + malos.bin + '"');
  ok(!!malos.vacio && !!malos.sinNada, 'un archivo que no es DXF, o uno sin nada dibujable, lo dice en vez de quedarse callado');

  // ── 4. en pantalla ──
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v));
    localStorage.setItem('minicivil__t', String(Date.now() + 99999));
    localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 1, objs: [] }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  await p.click('.mc-mas'); await p.waitForTimeout(250);
  ok(!!(await p.$('.mc-mas-dxfin')), 'el menú ⋯ trae el botón "Importar DXF"');
  await p.click('.mc-mas-dxfin'); await p.waitForTimeout(350);
  ok(!!(await p.$('.mc-dxf-elegir')), 'se abre el panel con las instrucciones y el botón de elegir archivo');
  // se mete el archivo por el mismo camino que usaría Brian (el diálogo del sistema)
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.mc-dxf-elegir')]);
  await fc.setFiles({ name: 'EJE 3.dxf', mimeType: 'application/dxf', buffer: Buffer.from(DXF, 'utf8') });
  await p.waitForTimeout(600);
  const panel = (await p.textContent('.tv-dib-dxf')).replace(/\s+/g, ' ');
  ok(/EJE 3\.dxf/.test(panel) && /SE VA A DIBUJAR/.test(panel), 'la revisión muestra el nombre del archivo y lo que se va a dibujar');
  ok(/Polil[ií]neas\s*1/.test(panel) && /trae curvas y se conservan/.test(panel), 'avisa que la polilínea trae curvas y se conservan');
  ok(/NO SE TRAE/.test(panel) && /Sombreados\s*1/.test(panel) && /Cotas de AutoCAD\s*1/.test(panel), 'la revisión dice qué no se trae, con nombres en español');
  ok(/TN · 5/.test(panel) && /BORDE · 4/.test(panel), 'muestra las capas con cuántos objetos trae cada una');
  // la casilla de unidades solo sale si el archivo está en otra unidad; este viene sin encabezado
  ok(/no dice en qué unidad está/.test(panel), 'si el archivo no dice la unidad, el panel lo advierte');
  await p.click('.mc-dxf-aqui'); await p.waitForTimeout(700);
  const dentro = await p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0].objs; });
  ok(dentro.length === 9 && dentro.some(o => o.t === 'pl' && o.v[0].b) && dentro.some(o => o.t === 'ar'),
    'queda dibujado en el dibujo: ' + dentro.length + ' objetos, con la curva y el arco');
  ok(!(await p.$('.tv-dib-dxf')), 'el panel se cierra al dibujar');
  await p.evaluate(() => deshacer()); await p.waitForTimeout(400);
  const tras = await p.evaluate(() => HIST.actual.proyectos[0].dibujos[0].objs.length);
  ok(tras === 0, 'un solo Deshacer quita todo el DXF (quedan ' + tras + ' objetos)');

  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (leer DXF ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
