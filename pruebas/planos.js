// v41: lo que faltaba al leer planos de AutoCAD (DXF y, desde la v42, DWG): cotas, sombreados, elipses, directrices,
// rellenos de flechas, caras 3D, tipo de línea, textos con altura/giro/alineación, atributos que no son de punto,
// bloques en espejo y objetos dibujados en otro plano. Más el paso de DWG (lo que da LibreDWG) a DXF.
// Todo con un DXF escrito a mano y resultados conocidos.
//   node pruebas/planos.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');

const DXF = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC',
  '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER',
  '0', 'LAYER', '2', 'MURO', '70', '0', '62', '1', '6', 'HIDDEN',
  '0', 'LAYER', '2', 'EJE', '70', '0', '62', '5', '6', 'CENTER',
  '0', 'LAYER', '2', 'DEFPOINTS', '70', '0', '62', '7', '6', 'CONTINUOUS',
  '0', 'ENDTAB', '0', 'ENDSEC',
  '0', 'SECTION', '2', 'BLOCKS',
  // la cota: AutoCAD la guarda ya dibujada en un bloque *D…
  '0', 'BLOCK', '2', '*D1', '10', '0', '20', '0',
  '0', 'LINE', '8', 'COTAS', '10', '0', '20', '0', '11', '10', '21', '0',
  '0', 'MTEXT', '8', 'COTAS', '10', '5', '20', '0.5', '40', '0.25', '71', '8', '1', '10.00',
  '0', 'POINT', '8', 'DEFPOINTS', '10', '0', '20', '0',
  '0', 'SOLID', '8', 'COTAS', '10', '0', '20', '0', '11', '0.3', '21', '0.1', '12', '0.3', '22', '-0.1', '13', '0.3', '23', '-0.1',
  '0', 'ENDBLK',
  '0', 'BLOCK', '2', 'CASITA', '10', '0', '20', '0',
  '0', 'CIRCLE', '8', '0', '10', '2', '20', '0', '40', '1',
  '0', 'LINE', '8', '0', '10', '0', '20', '0', '11', '4', '21', '0',
  '0', 'ATTDEF', '8', '0', '10', '0', '20', '2', '40', '0.5', '1', 'PLANTILLA', '2', 'NOMBRE',
  '0', 'ENDBLK',
  '0', 'ENDSEC',
  '0', 'SECTION', '2', 'ENTITIES',
  '0', 'LINE', '8', 'MURO', '10', '0', '20', '0', '11', '10', '21', '0',                                   // 1 discontinua por capa
  '0', 'LINE', '8', 'MURO', '6', 'CONTINUOUS', '10', '0', '20', '1', '11', '10', '21', '1',                // 2 continua (manda el objeto)
  '0', 'LWPOLYLINE', '8', 'EJE', '90', '2', '70', '0', '10', '0', '20', '2', '10', '10', '20', '2',        // 3 eje por capa
  '0', 'DIMENSION', '8', 'COTAS', '2', '*D1', '10', '0', '20', '0',                                          // 4 cota
  '0', 'TEXT', '8', '0', '10', '100', '20', '100', '40', '2.5', '50', '30', '1', 'GIRADO', '72', '2', '11', '100', '21', '100', '73', '3',
  '0', 'MTEXT', '8', '0', '10', '50', '20', '50', '40', '1.5', '71', '5', '11', '0', '21', '1', '1', 'VERTICAL',
  '0', 'ELLIPSE', '8', '0', '10', '200', '20', '0', '11', '10', '21', '0', '40', '0.5', '41', '0', '42', '6.283185307179586',
  '0', 'HATCH', '8', '0', '2', 'SOLID', '70', '1', '91', '1', '92', '2', '72', '0', '73', '1', '93', '4',
  '10', '300', '20', '0', '10', '310', '20', '0', '10', '310', '20', '10', '10', '300', '20', '10', '97', '0', '75', '0', '76', '1',
  '0', 'HATCH', '8', '0', '2', 'ANSI31', '70', '0', '91', '1', '92', '1', '93', '2',
  '72', '1', '10', '400', '20', '0', '11', '410', '21', '0',
  '72', '2', '10', '405', '20', '0', '40', '5', '50', '0', '51', '180', '73', '1', '97', '0', '75', '0', '76', '1',
  '0', 'LEADER', '8', '0', '76', '3', '10', '0', '20', '20', '10', '5', '20', '25', '10', '10', '20', '25',
  '0', 'MULTILEADER', '8', '0', '300', 'CONTEXT_DATA{', '40', '1', '10', '999', '20', '999', '41', '0.3', '304', 'NOTA', '12', '60', '22', '60',
  '302', 'LEADER{', '10', '58', '20', '58', '304', 'LEADER_LINE{', '10', '50', '20', '50', '305', '}', '303', '}', '301', '}',
  '0', 'SOLID', '8', '0', '10', '500', '20', '0', '11', '510', '21', '0', '12', '500', '22', '10', '13', '510', '23', '10',
  '0', '3DFACE', '8', '0', '10', '600', '20', '0', '30', '1', '11', '610', '21', '0', '31', '2', '12', '610', '22', '10', '32', '3', '13', '600', '23', '10', '33', '4',
  // bloque en espejo (escala X = −1) con un atributo que no es de punto
  '0', 'INSERT', '8', '0', '66', '1', '2', 'CASITA', '10', '700', '20', '0', '41', '-1', '42', '1',
  '0', 'ATTRIB', '8', '0', '10', '700', '20', '2', '40', '0.5', '1', 'CASA 1', '2', 'NOMBRE', '70', '0',
  '0', 'SEQEND',
  // en otro plano: polilínea en espejo (230 = −1) y círculo en un plano vertical (220 = −1)
  '0', 'LWPOLYLINE', '8', '0', '90', '2', '70', '0', '10', '1', '20', '1', '10', '2', '20', '1', '210', '0', '220', '0', '230', '-1',
  '0', 'CIRCLE', '8', '0', '10', '5', '20', '3', '30', '7', '40', '1', '210', '0', '220', '-1', '230', '0',
  '0', 'ENDSEC', '0', 'EOF'].join('\n');

// lo que LibreDWG entrega de un DWG (forma de "DwgDatabase"), escrito a mano
const DB = {
  header: { INSUNITS: 6 },
  tables: {
    LAYER: { entries: [{ name: '0', colorIndex: 7, lineType: 'Continuous' }, { name: 'MURO', colorIndex: 1, lineType: 'DASHED' }] },
    BLOCK_RECORD: { entries: [{ name: '*Model_Space', handle: '1F' }, { name: '*Paper_Space', handle: '363' },
      { name: 'B1', basePoint: { x: 0, y: 0 }, entities: [{ type: 'LINE', layer: '0', colorIndex: 256, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 0 } }] }] }
  },
  entities: [
    { type: 'LINE', ownerBlockRecordSoftId: '1F', layer: 'MURO', colorIndex: 256, lineType: '', startPoint: { x: 1087000.1234567891, y: 877000.9876543219, z: 0 }, endPoint: { x: 1087010, y: 877000, z: 0 } },
    { type: 'ARC', ownerBlockRecordSoftId: '1F', layer: '0', colorIndex: 3, center: { x: 0, y: 0 }, radius: 2, startAngle: 0, endAngle: Math.PI / 2 },
    { type: 'INSERT', ownerBlockRecordSoftId: '1F', layer: '0', colorIndex: 256, name: 'B1', insertionPoint: { x: 50, y: 50 }, xScale: 1, yScale: 1, rotation: Math.PI / 2,
      attribs: [{ type: 'ATTRIB', layer: '0', colorIndex: 256, tag: 'NOTA', flags: 0, text: { text: 'BLOQUE B1', startPoint: { x: 50, y: 52 }, textHeight: 0.4, rotation: 0, halign: 0, valign: 0 } }] },
    { type: 'LWPOLYLINE', ownerBlockRecordSoftId: '1F', layer: '0', colorIndex: 256, flag: 1, vertices: [{ x: 0, y: 0, bulge: 1 }, { x: 10, y: 0, bulge: 1 }] },
    { type: 'TEXT', ownerBlockRecordSoftId: '1F', layer: '0', colorIndex: 256, text: 'DWG', startPoint: { x: 5, y: 5 }, endPoint: { x: 0, y: 0 }, textHeight: 1.2, rotation: Math.PI / 4, halign: 0, valign: 0 },
    { type: 'HATCH', ownerBlockRecordSoftId: '1F', layer: '0', colorIndex: 256, patternName: 'ANSI31', solidFill: 0,
      boundaryPaths: [{ boundaryPathTypeFlag: 1, edges: [{ type: 2, center: { x: 20, y: 0 }, radius: 1, startAngle: 0, endAngle: 2 * Math.PI, isCCW: 1 }] }] },
    { type: 'LINE', ownerBlockRecordSoftId: '363', layer: '0', colorIndex: 256, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },   // espacio papel: no va
    { type: '3DSOLID', ownerBlockRecordSoftId: '1F', layer: '0', colorIndex: 256 }
  ]
};

(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 820 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  const r = await p.evaluate(t => leerDXF(t, 1), DXF);
  const casi = (a, c, e = 1e-6) => Math.abs(a - c) < e;
  const O = r.objs, lin = O.filter(o => o.t === 'l'), tx = s => O.find(o => o.t === 'tx' && o.s === s);
  const area = v => Math.abs(v.reduce((s, q, i) => { const n = v[(i + 1) % v.length]; return s + q.x * n.y - n.x * q.y; }, 0) / 2);
  const salta = t => (r.saltados.find(x => x.tipo === t) || {}).n || 0;

  // tipo de línea
  const l1 = lin.find(o => casi(o.a.y, 0) && casi(o.b.x, 10) && o.tipo), l2 = lin.find(o => casi(o.a.y, 1));
  ok(l1 && l1.tipo === 'disc' && l2 && !l2.tipo, 'tipo de línea: la capa HIDDEN da discontinua, y "CONTINUOUS" en el objeto manda');
  ok(O.some(o => o.t === 'pl' && o.tipo === 'centro' && casi(o.v[0].y, 2)), 'la capa CENTER da línea de eje');
  // cota
  const t10 = tx('10.00');
  ok(t10 && casi(t10.p.x, 5) && casi(t10.h, 0.25) && t10.al === 'cd' && lin.some(o => o.a.x === 0 && casi(o.b.x, 10) && o.a.y === 0 && !o.tipo),
    'la cota entra dibujada como en AutoCAD: su línea y su número "10.00" (alto 0.25, centrado abajo)');
  ok(!O.some(o => o.t === 'p'), 'los puntos de la capa DEFPOINTS (definición de la cota) no entran como puntos del levantamiento');
  ok(O.some(o => o.t === 'pl' && o.som === 'relleno' && casi(o.v[1].x, 0.3) && o.v.length === 3), 'la flecha rellena de la cota (SOLID de 3 esquinas) entra como triángulo relleno');
  // textos
  const gi = tx('GIRADO'), ve = tx('VERTICAL');
  ok(gi && casi(gi.h, 2.5) && casi(gi.rot, Math.PI / 6) && gi.al === 'rt' && casi(gi.p.x, 100), 'TEXT: alto 2.5, girado 30°, alineado arriba a la derecha');
  ok(ve && casi(ve.p.x, 50) && casi(ve.p.y, 50) && casi(ve.rot, Math.PI / 2) && ve.al === 'cm',
    'MTEXT: queda en su punto (50, 50) y girado 90° según su dirección (antes el 11 de la dirección lo mandaba al 0,1)');
  // elipse, sombreados, directrices, relleno y cara 3D
  const el = O.find(o => o.t === 'pl' && o.c && o.v.every(q => q.x >= 189.99 && q.x <= 210.01));
  ok(el && casi(Math.max(...el.v.map(q => q.x)), 210) && casi(Math.max(...el.v.map(q => Math.abs(q.y))), 5, 1e-3), 'elipse de 20 × 10 m como figura cerrada');
  const hs = O.find(o => o.som === 'relleno' && o.v.length === 4 && casi(o.v[0].x, 300));
  ok(hs && casi(area(hs.v), 100), 'sombreado sólido: cuadrado relleno de 100 m²');
  const hr = O.find(o => o.som === 'rayado' && o.v.some(q => casi(q.x, 410)));
  ok(hr && Math.abs(area(hr.v) - Math.PI * 25 / 2) / (Math.PI * 25 / 2) < 0.01, 'sombreado rayado con un lado en arco: medio círculo de radio 5 (39,27 m²): ' + (hr && area(hr.v).toFixed(2)));
  ok(O.some(o => o.t === 'pl' && !o.c && o.v.length === 3 && casi(o.v[2].x, 10) && casi(o.v[2].y, 25)), 'directriz (LEADER): su línea de 3 vértices');
  const nota = tx('NOTA');
  ok(nota && casi(nota.p.x, 60) && casi(nota.h, 0.3) && O.some(o => o.t === 'pl' && casi(o.v[0].x, 50) && casi(o.v[1].x, 58)), 'directriz múltiple: su línea (50,50 → 58,58) y su texto "NOTA" en (60, 60)');
  const so = O.find(o => o.som === 'relleno' && casi(o.v[0].x, 500));
  ok(so && casi(area(so.v), 100), 'SOLID de 4 esquinas en su orden de AutoCAD (1-2-4-3): cuadrado relleno de 100 m²');
  const cara = O.find(o => o.t === 'pl' && o.c && casi(o.v[0].x, 600));
  ok(cara && cara.v.map(q => q.z).join() === '1,2,3,4' && !cara.som, 'cara 3D: su contorno con las cotas de sus 4 esquinas');
  // bloque en espejo con atributo
  const cir = O.find(o => o.t === 'pl' && o.c && o.v.every(q => q.x > 696.9 && q.x < 699.1));
  ok(cir && casi(Math.min(...cir.v.map(q => q.x)), 697, 1e-3) && lin.some(o => casi(o.a.x, 700) && casi(o.b.x, 696)),
    'bloque en espejo: su círculo queda a la izquierda (698, 0) y su línea va de 700 a 696');
  ok(tx('CASA 1') && casi(tx('CASA 1').h, 0.5) && !tx('PLANTILLA'), 'el atributo "CASA 1" se ve como texto; la plantilla del atributo (ATTDEF) no');
  // en otro plano
  ok(O.some(o => o.t === 'pl' && casi(o.v[0].x, -1) && casi(o.v[1].x, -2) && casi(o.v[0].y, 1)), 'polilínea en espejo (plano 0,0,−1): x pasa a −1 y −2, como en AutoCAD');
  const vert = O.find(o => o.t === 'pl' && o.c && o.v.every(q => casi(q.y, -7)));
  ok(vert && casi(Math.min(...vert.v.map(q => q.x)), 4, 1e-3) && casi(Math.max(...vert.v.map(q => q.z)), 4, 1e-3),
    'círculo en un plano vertical: en planta es una línea en y = −7, de x 4 a 6, y sube hasta la cota 4');
  ok(r.saltados.length === 0, 'no queda nada sin traer: ' + JSON.stringify(r.saltados));

  // DWG → DXF (lo que hará la v42 al abrir un DWG)
  const { dwgADxf } = await import("file://" + path.join(__dirname, "..", "lib", "libredwg", "dwg_a_dxf.js"));
  const d = await p.evaluate(t => { const x = leerDXF(t, 1); return { objs: x.objs, saltados: x.saltados, uni: x.unidad || x.uni }; }, dwgADxf(DB));
  const dl = d.objs.find(o => o.t === 'l' && o.tipo);
  ok(dl && dl.a.x === 1087000.1234567891 && dl.a.y === 877000.9876543219, 'DWG → DXF: las coordenadas pasan con todos sus decimales (1087000.1234567891)');
  ok(dl && dl.tipo === 'disc', 'y el tipo de línea de su capa (DASHED → discontinua)');
  const ar = d.objs.find(o => o.t === 'ar');
  ok(ar && casi(ar.a2, Math.PI / 2) && ar.col, 'arco: los ángulos del DWG (radianes) llegan bien (0° a 90°) con su color');
  ok(d.objs.some(o => o.t === 'l' && casi(o.a.x, 50) && casi(o.b.x, 50) && casi(o.b.y, 51)), 'bloque girado 90°: su línea va hacia el Norte');
  ok(d.objs.some(o => o.t === 'tx' && o.s === 'BLOQUE B1' && casi(o.h, 0.4)), 'el atributo del bloque llega como texto');
  const dp = d.objs.find(o => o.t === 'pl' && !o.som && o.v.length === 2);
  ok(dp && dp.c && dp.v[0].b === 1, 'polilínea con lados curvos: cerrada y con su curvatura');
  ok(d.objs.some(o => o.t === 'tx' && o.s === 'DWG' && casi(o.rot, Math.PI / 4)), 'texto girado 45°');
  const dh = d.objs.find(o => o.som === 'rayado');
  ok(dh && Math.abs(area(dh.v) - Math.PI) / Math.PI < 0.01, 'sombreado con borde circular: círculo de radio 1 (3,14 m²)');
  ok(!d.objs.some(o => o.t === 'l' && casi(o.b.x, 1) && casi(o.b.y, 1)), 'lo del espacio papel no entra (solo el espacio modelo)');
  ok(d.saltados.length === 1 && d.saltados[0].tipo === '3DSOLID', 'y dice lo que no trajo: 1 sólido 3D');

  // en pantalla: el texto con tamaño escala con el zoom y gira
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999));
    localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 1, objs: [{ id: 1, t: 'tx', p: { x: 0, y: 0 }, s: 'PLANO', h: 2, rot: Math.PI / 2, al: 'cm' }, { id: 2, t: 'l', a: { x: -20, y: -20 }, b: { x: 20, y: 20 } }] }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  await p.click('.mc-rapida [data-accion=todo]'); await p.waitForTimeout(500);
  // v45: el texto se pinta en el canvas (MC_DIB.muestraTx = el primero que se pintó)
  const en = await p.evaluate(() => { const t = MC_DIB.muestraTx;
    const a = MC_DIB.aP({ x: 0, y: 0 }), c = MC_DIB.aP({ x: 1, y: 0 }); return t && t.s === 'PLANO' && { fs: t.fs, k: Math.hypot(c.X - a.X, c.Y - a.Y), rot: t.rot, al: t.al }; });
  ok(en && casi(en.fs, 2 * en.k, 0.01) && casi(en.rot, Math.PI / 2, 1e-9) && en.al === 'cm', 'en el dibujo el texto mide 2 m a la escala de la vista y va girado 90°: ' + JSON.stringify(en));
  // ida y vuelta por nuestro DXF: altura, giro y alineación se conservan
  const iv = await p.evaluate(() => { const pr = HIST.actual.proyectos[0]; const t = crearDXF(pr.dibujos[0], pr); return leerDXF(t, 1).objs.find(o => o.t === 'tx'); });
  ok(iv && casi(iv.h, 2) && casi(iv.rot, Math.PI / 2) && iv.al === 'cm', 'nuestro DXF lleva el texto con su altura, giro y alineación, y vuelve igual');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (planos ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
