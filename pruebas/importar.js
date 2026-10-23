// Importar puntos de la estación (.csv / .txt): lectura de archivos de varias formas (separadores, coma decimal,
// título, orden Este-Norte, errores), recorrido en pantalla, cota y descripción guardadas, colores por descripción,
// filtros de la Lista de puntos, deshacer y DXF con capas por descripción.
//   node pruebas/importar.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  p.on('dialog', d => d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── 1. lectura (sin pantalla) ──
  const casos = await p.evaluate(() => {
    const L = (t, op, ex) => leerArchivoPuntos(t, op || {}, ex || [], 1);
    const resumen = r => r.sep + '|' + !!r.encabezado + '|' + r.filas.map(f => [f.nom, f.N, f.E, f.z, f.d, f.estado].join(',')).join(';');
    return {
      coma: resumen(L('Punto,Norte,Este,Cota,Descripcion\r\n1,1000.000,2000.000,1520.345,BM1\r\n2,1012.48,2003.15,1520.112,BORDE')),
      pyc: resumen(L('1;1000,5;2000,25;1520,345;TN\n2;1001,5;2001,25;1520,1;TN')),
      tab: resumen(L('1\t1000.5\t2000.25\t1520.345\tBORDE IZQ')),
      espacios: resumen(L('1   1000.500  2000.250 1520.345 BORDE IZQ\n2 1001 2001 1520 EJE')),
      espComa: resumen(L('1 1000,5 2000,25 1520,3 TN')),
      orden: resumen(L('1,2000.000,1000.000,1520.000,BM', { orden: 'EN' })),
      dosTitulos: resumen(L('Levantamiento lote 4\nPunto,Norte,Este,Cota,Descripcion\n1,1000,2000,1500,TN')),
      bom: resumen(L('﻿7,1000,2000,1500,PI')),
      problemas: L('1,1000,2000,,TN\n2,1000,20a9,1500,TN\n3,1000,2000,15x,TN\n3,1001,2001,1501,TN\n,1002,2002,1502,TN\n4,1003\n5,9000000,2003,1503,TN\n6,1004,2004,1504,TN', {}, [{ nom: '6' }])
        .filas.map(f => f.linea + ':' + f.estado + ':' + (f.nom || '') + ':' + f.msg.join(' / ')),
      colores: JSON.stringify(coloresDescripcion(['BORDE', 'eje', 'Borde', 'TN'], [{ d: 'TN', col: '#0891B2' }])),
      capa: [capaDeDesc('Borde izq.'), capaDeDesc('Muro ñandú'), capaDeDesc('')].join('|')
    };
  });
  ok(casos.coma === ',|true|1,1000,2000,1520.345,BM1,ok;2,1012.48,2003.15,1520.112,BORDE,ok', 'coma con título: ' + casos.coma);
  ok(casos.pyc === ';|false|1,1000.5,2000.25,1520.345,TN,ok;2,1001.5,2001.25,1520.1,TN,ok', 'punto y coma con coma decimal: ' + casos.pyc);
  ok(casos.tab === '\t|false|1,1000.5,2000.25,1520.345,BORDE IZQ,ok', 'tabulación, descripción con espacio: ' + JSON.stringify(casos.tab));
  ok(casos.espacios === ' |false|1,1000.5,2000.25,1520.345,BORDE IZQ,ok;2,1001,2001,1520,EJE,ok', 'espacios (varios) y descripción con espacio: ' + casos.espacios);
  ok(casos.espComa === ' |false|1,1000.5,2000.25,1520.3,TN,ok', 'espacios con coma decimal: ' + casos.espComa);
  ok(casos.orden === ',|false|1,1000,2000,1520,BM,ok', 'orden Este, Norte: ' + casos.orden);
  ok(casos.dosTitulos === ',|true|1,1000,2000,1500,TN,ok', 'dos líneas de título antes de los puntos: las dos se saltan: ' + casos.dosTitulos);
  ok(casos.bom === ',|false|7,1000,2000,1500,PI,ok', 'archivo con marca BOM al comienzo: ' + casos.bom);
  const pr = casos.problemas;
  ok(/^1:aviso:1:sin cota/.test(pr[0]), 'sin cota → aviso: ' + pr[0]);
  ok(/^2:malo::el Este “20a9” no es un número/.test(pr[1]), 'Este con letras → rojo: ' + pr[1]);
  ok(/^3:aviso:3:la cota “15x” no es un número/.test(pr[2]), 'cota con letras → aviso, sin altura: ' + pr[2]);
  ok(/^4:aviso:3 \(2\):el número 3 ya está: se dibuja como “3 \(2\)”/.test(pr[3]), 'número repetido → “3 (2)”: ' + pr[3]);
  ok(/^5:aviso:P1:sin número: se dibuja como “P1”/.test(pr[4]), 'sin número → P1: ' + pr[4]);
  ok(/^6:malo::faltan datos/.test(pr[5]), 'línea incompleta → rojo: ' + pr[5]);
  ok(/^7:malo::el Norte queda a 899\d\.\d km/.test(pr[6]), 'lejos de los demás → rojo: ' + pr[6]);
  ok(/^8:aviso:6 \(2\):el número 6 ya está/.test(pr[7]), 'número que ya estaba en el dibujo → “6 (2)”: ' + pr[7]);
  ok(casos.colores === '{"TN":"#0891B2","BORDE":"#DC2626","EJE":"#2563EB"}', 'un color por descripción (mayúsculas = minúsculas; TN conserva el suyo): ' + casos.colores);
  ok(casos.capa === 'BORDE_IZQ|MURO_NANDU|SIN_DESCRIPCION', 'nombres de capa del DXF: ' + casos.capa);

  // ── 2. en pantalla ──
  const dibujo = [{ id: 1, nombre: 'Lote 4', creado: '', dibujos: [{ id: 2, nombre: 'Levantamiento', sig: 2, objs: [{ id: 3, t: 'p', x: 1990, y: 990, nom: 'P1' }] }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1 })); indexedDB.deleteDatabase('minicivil'); }, dibujo);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(300);
  await p.click('.mc-mas'); await p.waitForTimeout(250);   // v26: "Importar puntos" está en el menú "⋯"
  await p.click('.mc-mas-importar'); await p.waitForTimeout(150);
  const txt = await p.textContent('.tv-dib-importar');
  ok(/5 datos, en este orden/.test(txt) && /Número/.test(txt) && /Norte/.test(txt) && /Cota/.test(txt) && /Descripción/.test(txt) && /No tienes que elegirlo/.test(txt) && /\.csv/.test(txt) && /\.txt/.test(txt), 'el panel explica el archivo: 5 datos, .csv/.txt, separadores');
  if (movil) ok(await p.evaluate(() => { const e = document.querySelector('.tv-dib-importar'); return e.scrollWidth <= e.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'sin desplazamiento de lado en celular');
  const csv = 'Punto,Norte,Este,Cota,Descripcion\n1,1000.000,2000.000,1520.345,BM1\n2,1012.480,2003.150,1520.112,BORDE\n3,1015.020,2010.880,1519.874,EJE\n4,1018.640,2018.200,1519.630,TN\n5,1021.300,2024.010,,TN\n6,1024.100,20a9.330,1519.210,BORDE\n7,1026.000,2030.000,1519.100,BORDE\n8,1028.000,2034.000,1518.900,eje\n';
  const ruta = path.join(os.tmpdir(), 'mc_puntos_prueba.csv'); fs.writeFileSync(ruta, csv);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('.tv-imp-elegir')]);
  await fc.setFiles(ruta); await p.waitForSelector('.tv-imp-resumen');
  ok((await p.textContent('.tv-imp-resumen')).includes('8 puntos · separado por comas · título en la línea 1 (se salta)'), 'resumen: ' + await p.textContent('.tv-imp-resumen'));
  ok((await p.textContent('.tv-imp-listos')).includes('6 listos') && (await p.textContent('.tv-imp-avisos')).includes('1 se dibujan') && (await p.textContent('.tv-imp-malos')).includes('1 no se dibujan'), 'conteo: 6 listos, 1 con aviso, 1 en rojo');
  ok((await p.textContent('.tv-imp-mala')).includes('Línea 7: el Este “20a9.330” no es un número'), 'la fila en rojo dice la línea y el error');
  ok((await p.$$('.tv-imp-mala, .tv-imp-aviso, .tv-imp-ok')).length === 8, 'muestra las 8 filas');
  await p.click('.tv-imp-dibujar'); await p.waitForTimeout(400);
  const datos = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].dibujos; });
  let ds = await datos(); let pts = ds[0].objs.filter(o => o.t === 'p');
  const p4 = pts.find(o => o.nom === '4'), p5 = pts.find(o => o.nom === '5'), p8 = pts.find(o => o.nom === '8'), p2 = pts.find(o => o.nom === '2');
  ok(pts.length === 8 && !pts.some(o => o.nom === '6'), '7 puntos nuevos + el que había (el 6 en rojo no entra): ' + pts.map(o => o.nom).join(','));
  ok(p4 && p4.x === 2018.2 && p4.y === 1018.64 && p4.z === 1519.63 && p4.d === 'TN', 'el punto guarda norte, este, cota y descripción: ' + JSON.stringify(p4));
  ok(p5 && !('z' in p5), 'sin cota queda sin altura');
  ok(p2.col && p8.col === pts.find(o => o.nom === '3').col && new Set([p2.col, p8.col, p4.col, pts.find(o => o.nom === '1').col]).size === 4, 'un color por descripción (EJE y eje juntos): BORDE ' + p2.col + ', EJE ' + p8.col + ', TN ' + p4.col);
  // los puntos y sus textos se pintan en la imagen de fondo: MC_DIB dice cuántos salieron y los del primero
  const pintado = await p.evaluate(() => ({ txt: MC_DIB.txt, muestra: MC_DIB.muestra }));
  ok(pintado.muestra && pintado.muestra.textos.length === 3 && /^\d+\.\d{3}$/.test(pintado.muestra.textos[1]) && /^[A-Za-z]/.test(pintado.muestra.textos[2]),
    'en el dibujo se ven número, cota y descripción: ' + JSON.stringify(pintado.muestra && pintado.muestra.textos));
  // deshacer los quita todos juntos
  await p.click('.tv-dib-nav button[data-grupo=editar]'); const dh = await p.$('.tv-dib-hoja button[data-herr="@deshacer"]');
  if (dh) { await dh.click(); } else { await p.click('.tv-dib-nav button[data-grupo=editar]'); await p.click('button[title^="Deshacer"]'); }
  await p.waitForTimeout(300);
  ds = await datos();
  ok(ds[0].objs.length === 1, 'un solo Deshacer quita todos los puntos importados: quedan ' + ds[0].objs.length);
  // otra vez, ahora con Este, Norte invertido para ver que cambia, y de vuelta al normal
  await p.click('.mc-mas'); await p.waitForTimeout(250);
  await p.click('.mc-mas-importar');
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('.tv-imp-elegir')]);
  await fc2.setFiles(ruta); await p.waitForSelector('.tv-imp-resumen');
  await p.click('button[data-orden=EN]'); await p.waitForTimeout(100);
  const primeraEN = await p.$eval('.tv-imp-ok', e => e.innerText);
  await p.click('button[data-orden=NE]'); await p.waitForTimeout(100);
  ok(/2000\.000[\s\S]*1000\.000/.test(primeraEN), 'con "Este, Norte" se invierten las columnas en la revisión');
  await p.click('.tv-imp-dibujar'); await p.waitForTimeout(400);
  // ── 3. Lista de puntos: filtros ──
  await p.click('.tv-dib-nav button[data-grupo=ver]'); await p.click('.tv-dib-hoja button[data-herr="@puntos"]'); await p.waitForTimeout(150);
  const filas = () => p.$$eval('.tv-dib-lista .tv-dib-pt', r => r.length);
  ok(await filas() === 8, 'lista con los 8 puntos');
  await p.click('.tv-lp-chip:has-text("BORDE (2)")'); await p.waitForTimeout(100);
  ok(await filas() === 2, 'filtro por descripción BORDE: ' + await filas());
  await p.click('.tv-lp-chip:has-text("BORDE (2)")');
  await p.fill('.tv-lp-zmin', '1519.5'); await p.fill('.tv-lp-zmax', '1520.2'); await p.waitForTimeout(100);
  ok(await filas() === 3, 'filtro por cota 1519.5 a 1520.2 (2, 3 y 4): ' + await filas());
  await p.click('button:has-text("Quitar filtros")'); await p.waitForTimeout(100);
  const azul = (await datos())[0].objs.find(o => o.nom === '3').col;
  await p.click(`.tv-lp-chip[data-filtro="c${azul}"]`);
  await p.waitForTimeout(100);
  ok(await filas() === 2, 'filtro por color (el de EJE): ' + await filas());
  await p.click('button:has-text("Elegir los 2")'); await p.click('button:has-text("Esconder (2)")'); await p.waitForTimeout(200);
  ds = await datos();
  ok(ds[0].objs.filter(o => o.oculto).map(o => o.nom).sort().join(',') === '3,8', 'esconder lo filtrado: ' + ds[0].objs.filter(o => o.oculto).map(o => o.nom).join(','));
  await p.click('button:has-text("Quitar filtros")');
  await p.click('input[data-mostrar=z]'); await p.waitForTimeout(150);
  const pintado2 = await p.evaluate(() => ({ txt: MC_DIB.txt, muestra: MC_DIB.muestra }));
  ok(pintado2.muestra && pintado2.muestra.textos.length === 2 && !pintado2.muestra.textos.some(t => /^\d+\.\d{3}$/.test(t)) && /^[A-Za-z]/.test(pintado2.muestra.textos[1])
    && pintado2.txt < pintado.txt, 'quitar "Cota" de lo que se muestra la esconde del dibujo: ' + JSON.stringify(pintado2.muestra && pintado2.muestra.textos));
  ds = await datos();
  ok(ds[0].etq && ds[0].etq.z === false, 'lo que se muestra queda guardado en el dibujo');
  await p.click('input[data-mostrar=z]');
  await p.click('button:has-text("Mostrar todos")'); await p.waitForTimeout(200);
  // ── 4. DXF ──
  const dxf = (await p.evaluate(() => (vaciarGuardado(), crearDXF(JSON.parse(localStorage.getItem('minicivil'))[0].dibujos[0])))).replace(/\r\n/g, '\n');
  const capas = [...dxf.matchAll(/\n0\nLAYER\n2\n([^\n]+)/g)].map(m => m[1]);
  ok(JSON.stringify(capas) === '["TOPOVIAS","BM1","BORDE","EJE","TN"]', 'DXF con una capa por descripción: ' + capas.join(','));
  ok(/\nPOINT\n8\nTN\n(?:62\n\d+\n)?10\n2018\.2\n20\n1018\.64\n30\n1519\.63\n/.test(dxf), 'en el DXF el punto 4 va en la capa TN y a su cota (Z)');
  ok(dxf.includes('\n1\n1519.630\n') && dxf.includes('\n1\nBORDE\n'), 'el DXF lleva los textos de cota y descripción');
  const viejo = (await p.evaluate(() => crearDXF({ objs: [{ id: 1, t: 'p', x: 5, y: 6, nom: 'A' }, { id: 2, t: 'l', a: { x: 0, y: 0 }, b: { x: 3, y: 4 } }] }))).replace(/\r\n/g, '\n');
  ok(/LAYER\n70\n1\n0\nLAYER\n2\nTOPOVIAS/.test(viejo) && /POINT\n8\nTOPOVIAS\n62\n1\n10\n5\n20\n6\n30\n0\n/.test(viejo), 'un dibujo sin cotas ni descripciones sale en el DXF igual que antes');
  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
