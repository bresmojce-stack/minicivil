// Presentación (hojas para exportar): escala exacta, rótulos dentro de la hoja, PDF igual a la pantalla y recorrido en pantalla.
//   node pruebas/presentacion.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  p.on('dialog', d => d.accept());
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  // ── 1. cálculo ──
  const r = await p.evaluate(async () => {
    const proy = { dibujos: [{ id: 1, objs: [{ id: 'l', t: 'l', a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }, { id: 'p', t: 'p', x: 100, y: 50, nom: '1', z: 10 }] }] };
    const pz = { id: 1, t: 'ventana', x: 0, y: 0, w: 100, h: 80, dibId: 1, cx: 5, cy: 0, escala: '500', norte: false, barra: false };
    const g = primsVentana(proy, pz)[0], lin = g.hijos.find(q => q.k === 'l');
    const enc = encuadrarVentana(proy, { ...pz, w: 150, h: 100 });
    // rótulos: todo dentro de la hoja y el espacio para el dibujo dentro del marco, en las 5 plantillas y las dos orientaciones
    const largo = 'Proyecto con un nombre larguísimo que no debería caber en ninguna casilla del rótulo de la hoja';
    const pr2 = { dibujos: [], presentacion: { datos: { proyecto: largo, empresa: largo, localizacion: largo, elaboro: largo, reviso: largo, aprobo: largo, contrato: largo, objeto: largo, notas: largo, cargoElaboro: largo } } };
    const malos = [];
    // los 9 tamaños de hoja, las 5 plantillas y las dos orientaciones: nada se sale del margen y queda espacio para el dibujo
    HOJA_ORDEN.forEach(tam => [1, 2, 3, 4, 5].forEach(n => ['h', 'v'].forEach(o => {
      const hoja = { tam, plantilla: n, orient: o, contenido: largo, fecha: '22/10/2026', revision: '0', piezas: [] }, T = tamHoja(hoja), R = rotuloHoja(pr2, hoja, 3, 12), a = R.area;
      const m = 10 * kRotulo(T) - 0.1, et = tam + n + o;
      R.prims.forEach(q => { const xs = q.k === 'l' ? q.pts.map(v => v[0]) : [q.x], ys = q.k === 'l' ? q.pts.map(v => v[1]) : [q.y];
        if (q.k === 't') { const w = anchoTexto(q.s, q.pt, q.b), x0 = q.al === 'c' ? q.x - w / 2 : q.al === 'r' ? q.x - w : q.x; xs.push(x0, x0 + w); }
        if (Math.min(...xs) < m || Math.max(...xs) > T.w - m || Math.min(...ys) < m || Math.max(...ys) > T.h - m) malos.push(et + ' ' + (q.s || q.k)); });
      if (a.x < m || a.y < m || a.x + a.w > T.w - m || a.y + a.h > T.h - m || a.w < 100 || a.h < 100) malos.push(et + ' area ' + JSON.stringify(a));
    })));
    // el rótulo crece con la hoja: en un A0 la franja de la plantilla 1 mide el doble que en carta
    const fr = hh => { const R = rotuloHoja(pr2, { tam: hh, plantilla: 1, orient: 'h', piezas: [] }, 1, 1), T = tamHoja({ tam: hh, orient: 'h' }); return T.h - 10 * kRotulo(T) - R.area.y - R.area.h; };
    const crece = { carta: fr('carta'), a0: fr('a0'), ka0: kRotulo(tamHoja({ tam: 'a0', orient: 'h' })) };
    // textos de casilla cortados: ninguno más ancho que su casilla (plantilla 1, PROYECTO = 5/12 del ancho)
    const t1 = rotuloHoja(pr2, { plantilla: 1, orient: 'h', piezas: [] }, 1, 1).prims.find(q => q.k === 't' && q.s.startsWith('Proyecto con'));
    // PDF de dos hojas (horizontal y vertical): tamaño carta, textos del rótulo, sin los textos guía grises
    const pr3 = { nombre: 'Prueba', dibujos: proy.dibujos, presentacion: { datos: { proyecto: 'Plataforma Lote 4' }, hojas: [{ id: 1, plantilla: 1, orient: 'h', contenido: 'PLANTA', piezas: [pz] }, { id: 2, plantilla: 5, orient: 'v', piezas: [] }] } };
    const a = crearHojasPDF(pr3), txt = await a.blob.text();
    // una hoja A3 vertical: 297 × 420 mm = 841,9 × 1190,6 puntos
    const a3 = await crearHojasPDF({ nombre: 'A3', dibujos: proy.dibujos, presentacion: { hojas: [{ id: 1, tam: 'a3', orient: 'v', plantilla: 1, piezas: [] }] } }).blob.text();
    return { mb3: (a3.match(/\/MediaBox \[[^\]]+\]/) || [''])[0], crece, largo: Math.hypot(lin.pts[1][0] - lin.pts[0][0], lin.pts[1][1] - lin.pts[0][1]), x0: lin.pts[0][0], y0: lin.pts[0][1], enc, malos, t1: t1 && anchoTexto(t1.s, t1.pt, t1.b), u5: (279.4 - 20) / 12 * 5,
      paginas: a.paginas, nombre: a.nombre, pdf: txt.slice(0, 5), tam: (txt.match(/\/MediaBox \[[^\]]+\]/g) || []).join(' '), guia: txt.includes('[EMPRESA]'), tieneProy: txt.includes('Plataforma Lote 4') };
  });
  ok(Math.abs(r.largo - 20) < 1e-9 && Math.abs(r.x0 - 40) < 1e-9 && Math.abs(r.y0 - 40) < 1e-9, 'escala exacta: 10 m a 1:500 = 20 mm en la hoja, en su sitio: ' + r.largo.toFixed(3) + ' mm');
  ok(r.enc.escala === '750' && Math.abs(r.enc.cx - 50) < 1e-9 && Math.abs(r.enc.cy - 25) < 1e-9, 'encuadrar: 100 × 50 m en una ventana de 150 × 100 mm (menos 5 mm a cada lado) → 1:750 (1:714 no es estándar), centrado: ' + JSON.stringify(r.enc));
  ok(!r.malos.length, 'los 9 tamaños × 5 plantillas × 2 orientaciones: nada se sale de la hoja y queda espacio para el dibujo' + (r.malos.length ? ': ' + r.malos.slice(0, 5).join(' | ') : ''));
  ok(Math.abs(r.crece.ka0 - 2.06) < 0.02 && Math.abs(r.crece.a0 / r.crece.carta - r.crece.ka0) < 0.05, 'el rótulo crece con la hoja: la franja pasa de ' +
    r.crece.carta.toFixed(1) + ' mm en carta a ' + r.crece.a0.toFixed(1) + ' mm en A0 (× ' + r.crece.ka0 + ')');
  ok(r.t1 && r.t1 < r.u5 - 2.5, 'un nombre largo se corta para caber en su casilla: ' + (r.t1 || 0).toFixed(1) + ' mm de ' + r.u5.toFixed(1));
  ok(r.pdf === '%PDF-' && r.paginas === 2 && /MediaBox \[0 0 792\.?\d* 612\.?\d*\].*MediaBox \[0 0 612\.?\d* 792\.?\d*\]/.test(r.tam) && r.nombre === 'MiniCivil - Planos - Prueba.pdf', 'PDF de 2 hojas carta (horizontal y vertical): ' + r.tam);
  ok(r.tieneProy && !r.guia, 'el PDF lleva los datos del rótulo y no los textos guía grises');
  ok(/MediaBox \[0 0 841\.8?\d* 1190\.[56]\d*\]/.test(r.mb3), 'una hoja A3 vertical sale en el PDF con su tamaño: ' + r.mb3);

  // ── 2. en pantalla ──
  const objs = []; let id = 1;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 6; j++) { objs.push({ id: id++, t: 'p', x: 1000000 + i * 5, y: 900000 + j * 5, nom: String(id), z: 100 + 0.1 * i * 5, d: 'TN' }); objs.push({ id: id++, t: 'p', x: 1000000 + i * 5, y: 900000 + j * 5, nom: '', z: 101, d: 'SR' }); }
  objs.push({ id: 'eje', t: 'eje', v: [{ x: 1000002, y: 900015 }, { x: 1000048, y: 900015 }], abs0: 0, paso: 10, nom: 'Eje' });
  const proyecto = [{ id: 1, nombre: 'Lote 4', creado: '', dibujos: [{ id: 2, nombre: 'Levantamiento', sig: 200, objs }],
    superficies: [{ id: 'tn', nombre: 'Terreno natural', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '0.5' }, { id: 'sr', nombre: 'Subrasante', fuente: { tipo: 'desc', descs: ['SR'] }, color: '#B45309', curvas: '' }],
    secciones: { linea: { dibId: 2, objId: 'eje' }, paso: '10', izq: '10', der: '10' } }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'presentacion' })); }, proyecto);
  await p.reload(); await p.waitForSelector('.mc-presentacion'); await p.waitForTimeout(200);
  const datos = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0].presentacion; });
  await p.click('.mc-hoja-nueva'); await p.waitForTimeout(300);
  let d = await datos();
  const v0 = d.hojas[0].piezas[0];
  ok(d.hojas.length === 1 && v0.t === 'ventana' && v0.escala && Math.abs(v0.cx - 1000025) < 1e-6, 'hoja nueva: carta horizontal con una ventana encuadrada en el dibujo (1:' + v0.escala + ')');
  ok((await p.textContent('.mc-hoja')).includes('[PROYECTO]') && (await p.$$('.mc-hoja circle')).length >= 154, 'en pantalla: el rótulo con sus textos guía y los puntos del dibujo');
  // mover la ventana arrastrando, cambiarle el tamaño con la esquina y correr el dibujo adentro
  const caja = async () => { const el = await p.$('.mc-pieza[data-pieza=ventana] .mc-pieza-toque'); await el.scrollIntoViewIfNeeded(); return el.boundingBox(); };
  const arrastrar = async (x, y, dx, dy) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx / 2, y + dy / 2, { steps: 3 }); await p.mouse.move(x + dx, y + dy, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(150); };
  let bb = await caja(); const pxmm = (await (await p.$('.mc-hoja')).boundingBox()).width / 279.4;
  await arrastrar(bb.x + bb.width / 2, bb.y + bb.height / 2, 10 * pxmm, 5 * pxmm);
  d = await datos(); let v1 = d.hojas[0].piezas[0];
  ok(Math.abs(v1.x - v0.x - 10) <= 0.5 && Math.abs(v1.y - v0.y - 5) <= 0.5 && v1.cx === v0.cx, 'arrastrar la ventana la mueve 10 × 5 mm sin mover el dibujo adentro: ' + (v1.x - v0.x) + ' × ' + (v1.y - v0.y));
  await p.fill('.mc-pz-w', '120'); await p.fill('.mc-pz-h', '90'); await p.waitForTimeout(150);
  await (await p.$('.mc-manija')).scrollIntoViewIfNeeded(); const man = await (await p.$('.mc-manija')).boundingBox();
  await arrastrar(man.x + man.width / 2, man.y + man.height / 2, -20 * pxmm, -10 * pxmm);
  d = await datos(); v1 = d.hojas[0].piezas[0];
  ok(Math.abs(v1.w - 100) <= 0.5 && Math.abs(v1.h - 80) <= 0.5, 'la esquina azul cambia el tamaño (120 × 90 → 100 × 80 mm): ' + v1.w + ' × ' + v1.h);
  await p.click('.mc-pz-escala', { clickCount: 3 }); await p.fill('.mc-pz-escala', '500'); await p.click('.mc-mover-dib');
  bb = await caja(); await arrastrar(bb.x + bb.width / 2, bb.y + bb.height / 2, 20 * pxmm, 0);
  d = await datos(); const v2 = d.hojas[0].piezas[0];
  ok(Math.abs((v1.cx - v2.cx) - 10) < 0.3 && v2.x === v1.x, 'con "Mover el dibujo adentro", 20 mm a 1:500 corren el dibujo 10 m y la ventana no se mueve: ' + (v1.cx - v2.cx).toFixed(2) + ' m');
  await p.click('.mc-mover-dib');
  await p.click('.mc-pz-curvas >> nth=0'); await p.click('.mc-pz-cortes'); await p.click('.mc-pz-etq-z'); await p.waitForTimeout(150);
  d = await datos(); const v3 = d.hojas[0].piezas[0];
  ok(v3.curvas && v3.curvas[0] === 'tn' && v3.cortes && v3.etq && v3.etq.z === false, 'la ventana guarda qué se ve: curvas, cortes y sin la cota de los puntos');
  // secciones y tabla
  await p.click('.mc-agregar-secciones'); await p.waitForTimeout(150);
  ok((await p.$$('.mc-pieza[data-pieza=secciones]')).length === 1 && (await p.textContent('.mc-hoja')).includes('0+000'), 'se agregan las secciones (las mismas de la pestaña Secciones)');
  await p.click('.mc-agregar-tabla'); await p.waitForTimeout(150);
  const tTabla = await p.textContent('.mc-hoja');
  ok(tTabla.includes('VOLÚMENES') && tTabla.includes('TOTAL'), 'se agrega la tabla de volúmenes con su total');
  // rótulo: datos del proyecto, otra plantilla (las piezas se acomodan) y vertical
  await p.click('.mc-ver-datos'); await p.fill('.mc-dato-proyecto', 'Plataforma Lote 4'); await p.fill('.mc-dato-elaboro', 'Brian Escobar'); await p.fill('.mc-hoja-contenido', 'PLANTA Y VOLÚMENES'); await p.waitForTimeout(150);
  ok((await p.textContent('.mc-hoja')).includes('Plataforma Lote 4'), 'los datos del rótulo salen en la hoja');
  await p.click('.mc-plantilla[data-v=p2]'); await p.waitForTimeout(150);
  d = await datos();
  const dentro = d.hojas[0].piezas.every(q => q.x + q.w <= 279.4 - 10 - 55 + 0.2);
  ok(d.hojas[0].plantilla === 2 && dentro, 'con el cajetín a la derecha las piezas se corren para no quedar debajo: ' + d.hojas[0].piezas.map(q => (q.x + q.w).toFixed(1)).join(', '));
  await p.click('.mc-orient-v'); await p.waitForTimeout(150);
  d = await datos();
  ok(d.hojas[0].orient === 'v' && d.hojas[0].piezas.every(q => q.x + q.w <= 215.9 - 10 + 0.2), 'en vertical las piezas caben en la hoja');
  // v22: se cambia el tamaño de la hoja y las piezas se acomodan al nuevo rótulo
  await p.click('.mc-tam[data-v=a3]'); await p.waitForTimeout(200);
  d = await datos();
  const enA3 = d.hojas[0].piezas.every(q => q.x + q.w <= 297 - 10 + 0.5 && q.y + q.h <= 420 - 10 + 0.5);
  ok(d.hojas[0].tam === 'a3' && enA3, 'se cambia la hoja a A3 vertical y las piezas quedan dentro');
  await p.click('.mc-tam[data-v=carta]'); await p.waitForTimeout(200);
  // segunda hoja y PDF
  await p.click('.mc-hoja-nueva'); await p.waitForTimeout(200);
  ok((await p.$$('.mc-hoja-tab')).length === 2, 'segunda hoja');
  await p.click('.mc-exportar'); await p.waitForTimeout(600);
  ok((await p.textContent('body')).includes('Planos en PDF listos'), 'Exportar PDF deja el archivo listo para guardar o compartir');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=💾 Guardar en el dispositivo')]);
  const ruta = path.join(os.tmpdir(), 'mc_planos_prueba.pdf'); await dl.saveAs(ruta);
  const pdf = fs.readFileSync(ruta, 'latin1');
  ok(pdf.startsWith('%PDF-') && (pdf.match(/\/Type \/Page[^s]/g) || []).length === 2 && /MiniCivil - Planos - Lote 4\.pdf/.test(dl.suggestedFilename()), 'PDF de 2 hojas: ' + dl.suggestedFilename());
  await p.click('text=Cerrar').catch(() => {});
  // eliminar la segunda hoja
  await p.click('button:has-text("Eliminar hoja")'); await p.waitForTimeout(150);
  ok((await datos()).hojas.length === 1, 'se elimina una hoja');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
