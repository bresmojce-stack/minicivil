// 3D dentro del Dibujo: botón 2D | 3D, puntos, líneas a su cota y muros; tocar un triángulo, quitarlo y verlo en 2D.
//   node pruebas/dibujo3d.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1280), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, hasTouch: true, isMobile: movil });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  const objs = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) objs.push({ id: 100 + i * 10 + j, t: 'p', x: 1000000 + i * 10, y: 900000 + j * 10, z: 100 + 3 * Math.sin(i / 2) + j * 0.5, nom: String(i * 7 + j + 1), d: 'TN' });
  objs.push({ id: 'muro', t: 'pl', alto: 2, v: [{ x: 1000010, y: 900020, z: 104 }, { x: 1000050, y: 900020, z: 104 }] });
  objs.push({ id: 'borde', t: 'pl', v: [{ x: 1000000, y: 900060 }, { x: 1000060, y: 900060 }] });   // sin cota: va sobre la superficie
  const proyecto = [{ id: 1, nombre: 'Lote', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 60, objs }], superficies: [{ id: 'tn', nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, proyecto);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(300);
  const datos = () => p.evaluate(() => { vaciarGuardado(); return JSON.parse(localStorage.getItem('minicivil'))[0]; });
  ok(await p.$('.mc-modo button[data-modo="3D"]') !== null, 'el botón 2D | 3D está en la fila de arriba del Dibujo');
  await p.click('.mc-modo button[data-modo="3D"]'); await p.waitForSelector('.mc-3d-dibujo'); await p.waitForTimeout(500);
  const lienzo = await p.$('.mc-3d-dibujo .mc-3d-lienzo');
  if (!lienzo) { ok((await p.textContent('.mc-3d-dibujo')).includes('WebGL'), 'sin WebGL: avisa'); }
  else {
    const caja = await (await p.$('.tv-dib-svg')).boundingBox(), c3 = await lienzo.boundingBox();
    ok(c3.width > 200 && c3.y >= caja.y - 120 && !(await p.$('.mc-3d[role=dialog]')), 'el 3D se abre dentro del mismo panel del Dibujo (no a pantalla completa)');
    const escena = await p.evaluate(() => { const m = [...document.querySelectorAll('.mc-3d-dibujo')].length; return m; });
    // contar lo que hay en la escena: puntos, 2 líneas (muro y borde) y la pared del muro
    const n = await p.evaluate(() => { const c = document.querySelector('.mc-3d-dibujo .mc-3d-lienzo'), x = document.createElement('canvas'); x.width = c.width; x.height = c.height; const g = x.getContext('2d'); g.drawImage(c, 0, 0);
      const d = g.getImageData(0, 0, x.width, x.height).data; let k = 0; for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - 30) + Math.abs(d[i + 1] - 37) + Math.abs(d[i + 2] - 48) > 30) k++; return k; });
    ok(escena === 1 && n > 100, 'la escena 3D dibuja la superficie, los puntos y el muro (' + n + ' muestras con color)');
    // tocar el centro: marca un triángulo
    await p.mouse.click(c3.x + c3.width / 2, c3.y + c3.height / 2); await p.waitForTimeout(300);
    const sel = await p.$('.mc-3d-sel');
    ok(!!sel, 'tocar la superficie en 3D marca un triángulo y ofrece quitarlo');
    if (sel) {
      await p.click('.mc-3d-quitar'); await p.waitForTimeout(500);
      const d = await datos();
      ok(d.superficies[0].quitados && d.superficies[0].quitados.length === 1, 'Quitar este triángulo lo saca de la superficie (y se guarda)');
      // otro toque en otro sitio (el primero quedó como hueco): la escena se rearmó y sigue respondiendo
      for (const [dx, dy] of [[60, 30], [-60, 30], [40, -40], [-40, -40], [0, 70]]) { await p.mouse.click(c3.x + c3.width / 2 + dx, c3.y + c3.height / 2 + dy); await p.waitForTimeout(250); if (await p.$('.mc-3d-sel')) break; }
      if (await p.$('.mc-3d-sel')) { await p.click('.mc-3d-sel button:has-text("Ver en 2D")'); await p.waitForTimeout(300);
        ok(!(await p.$('.mc-3d-dibujo')) && await p.$('.mc-sup-marca') !== null, '"Ver en 2D" vuelve al Dibujo con el triángulo marcado en naranja'); }
      else ok(false, 'un segundo toque también marca un triángulo');
    }
  }
  // ── v24: cómo se ve la superficie: sólido, triángulos y curvas de nivel, cada uno aparte ──
  if (!(await p.$('.mc-3d-dibujo'))) { await p.click('.mc-modo button[data-modo="3D"]'); await p.waitForSelector('.mc-3d-dibujo'); await p.waitForTimeout(800); }
  if (await p.$('.mc-3d-dibujo .mc-3d-lienzo')) {
    const verdes = () => p.evaluate(() => { const c = document.querySelector('.mc-3d-dibujo .mc-3d-lienzo'), x = document.createElement('canvas');
      x.width = c.width; x.height = c.height; const g = x.getContext('2d'); g.drawImage(c, 0, 0);
      const d = g.getImageData(0, 0, x.width, x.height).data; let n = 0, claros = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 1] > d[i] + 20 && d[i + 1] > d[i + 2] + 20) { n++; if (d[i + 1] > 170) claros++; } }
      let pintado = 0;
      for (let i = 0; i < d.length; i += 4) { if (Math.abs(d[i] - 30) > 12 || Math.abs(d[i + 1] - 37) > 12 || Math.abs(d[i + 2] - 48) > 12) pintado++; }
      return { n, claros, pintado }; });
    const hoy = await verdes();
    ok(hoy.n > 500, 'de entrada se ve la superficie en 3D (' + hoy.n + ' muestras del color del terreno)');
    await p.click('.mc-3d label:has-text("Curvas de nivel") input'); await p.waitForTimeout(600);
    const conCurvas = await verdes();
    ok(conCurvas.claros > hoy.claros + 40, 'con "Curvas de nivel" salen las curvas a su cota, más claras que el terreno (' + hoy.claros + ' → ' + conCurvas.claros + ')');
    await p.click('.mc-3d label:has-text("Sólido") input'); await p.waitForTimeout(500);
    const sinSolido = await verdes();
    ok(sinSolido.n < conCurvas.n && sinSolido.n > 40, 'se apaga el sólido y quedan los triángulos y las curvas (' + conCurvas.n + ' → ' + sinSolido.n + ')');
    await p.click('.mc-3d label:has-text("Triángulos") input'); await p.waitForTimeout(500);
    const soloCurvas = await verdes();
    ok(soloCurvas.pintado < sinSolido.pintado * 0.75 && soloCurvas.n > 30,
      'y apagando los triángulos quedan solo las curvas (' + sinSolido.pintado + ' → ' + soloCurvas.pintado + ' píxeles dibujados)');
    // se acuerda al volver a entrar
    await p.click('.mc-3d-dibujo button:has-text("‹ 2D")'); await p.waitForTimeout(300);
    await p.click('.mc-modo button[data-modo="3D"]'); await p.waitForSelector('.mc-3d-dibujo'); await p.waitForTimeout(900);
    ok(await p.isChecked('.mc-3d label:has-text("Curvas de nivel") input') && !(await p.isChecked('.mc-3d label:has-text("Sólido") input')),
      'al volver a entrar se acuerda de cómo quedó la vista');
    await p.click('.mc-3d label:has-text("Sólido") input'); await p.click('.mc-3d label:has-text("Triángulos") input');
    await p.click('.mc-3d label:has-text("Curvas de nivel") input'); await p.waitForTimeout(400);
  }
  // ── v23: los textos de los puntos en 3D (cota y descripción), cada uno con su casilla ──
  if (!(await p.$('.mc-3d-dibujo'))) { await p.click('.mc-modo button[data-modo="3D"]'); await p.waitForSelector('.mc-3d-dibujo'); await p.waitForTimeout(800); }
  if (await p.$('.mc-3d-dibujo .mc-3d-lienzo')) {
    const cuantos = () => p.evaluate(() => (window.MC_3D || {}).etq || 0);
    // píxeles del canvas de textos: todos, y los de la descripción (que va en el color del punto, rojizo)
    const pintados = async (soloRojos) => {
      const c = await p.$('.mc-3d-textos'); if (!c) return 0;
      return p.evaluate(rojos => { const cv = document.querySelector('.mc-3d-textos'), x = document.createElement('canvas');
        x.width = cv.width; x.height = cv.height; const g = x.getContext('2d'); g.drawImage(cv, 0, 0);
        const d = g.getImageData(0, 0, x.width, x.height).data; let n = 0;
        for (let i = 0; i < d.length; i += 4) { if (d[i + 3] <= 40) continue;
          if (!rojos || (d[i] > 150 && d[i + 1] < 190 && d[i + 2] < 190)) n++; }
        return n; }, !!soloRojos);
    };
    ok(await cuantos() === 0 && await pintados() === 0, 'al empezar, los puntos en 3D van sin textos (la vista va más suelta)');
    await p.click('.mc-3d label:has-text("Cota") input'); await p.waitForTimeout(400);
    const conCota = await cuantos(), pxCota = await pintados();
    ok(conCota > 0 && pxCota > 200, 'con la casilla Cota, los puntos muestran su cota (' + conCota + ' puntos con texto)');
    const rojosCota = await pintados(true);
    await p.click('.mc-3d label:has-text("Descripción") input'); await p.waitForTimeout(400);
    ok(await pintados(true) > rojosCota + 50, 'con Descripción también sale el TN, en el color del punto');
    await p.click('.mc-3d label:has-text("Cota") input'); await p.waitForTimeout(400);
    const soloD = await pintados();
    ok(soloD > 0 && await pintados(true) > 0 && soloD < pxCota, 'se puede dejar solo la descripción, sin la cota (' + soloD + ' px)');
    await p.click('.mc-3d label:has-text("Descripción") input'); await p.waitForTimeout(400);
    const fin2 = { n: await cuantos(), px: await pintados(), z: await p.isChecked('.mc-3d label:has-text("Cota") input'), d: await p.isChecked('.mc-3d label:has-text("Descripción") input') };
    ok(fin2.n === 0 && fin2.px === 0, 'apagando las dos casillas, el 3D vuelve a quedar sin textos (' + JSON.stringify(fin2) + ')');
    // se acuerda al volver a entrar
    await p.click('.mc-3d label:has-text("Cota") input'); await p.waitForTimeout(300);
    await p.click('.mc-3d-dibujo button:has-text("‹ 2D")'); await p.waitForTimeout(300);
    await p.click('.mc-modo button[data-modo="3D"]'); await p.waitForSelector('.mc-3d-dibujo'); await p.waitForTimeout(700);
    ok(await p.isChecked('.mc-3d label:has-text("Cota") input') && await cuantos() > 0, 'al volver a entrar al 3D se acuerda de las casillas');
    await p.click('.mc-3d label:has-text("Cota") input'); await p.waitForTimeout(300);
  }
  // ── v24: los ajustes de la superficie se cambian sin salir del 3D ──
  if (!(await p.$('.mc-3d-dibujo'))) { await p.click('.mc-modo button[data-modo="3D"]'); await p.waitForSelector('.mc-3d-dibujo'); await p.waitForTimeout(800); }
  if (await p.$('.mc-3d-ajustes')) {
    await p.click('.mc-3d-ajustes'); await p.waitForTimeout(400);
    ok(await p.$('.mc-3d-editor .mc-editor-sup') !== null, 'el botón ⚙ abre los ajustes de la superficie dentro del 3D');
    await p.fill('.mc-3d-editor .mc-curvas', '2');
    await p.fill('.mc-3d-editor .mc-sup-nombre', 'Terreno natural');
    await p.click('.mc-3d-editor button:has-text("Guardar superficie")'); await p.waitForTimeout(900);
    const d2 = await datos();
    ok(!(await p.$('.mc-3d-editor')) && d2.superficies[0].curvas === '2' && d2.superficies[0].nombre === 'Terreno natural',
      'se guardan los cambios y el 3D vuelve, con la superficie ya cambiada');
    ok((await p.textContent('.mc-3d')).includes('Terreno natural'), 'el nombre nuevo sale en las casillas del 3D');
    await p.click('.mc-3d-ajustes'); await p.waitForTimeout(400);
    await p.fill('.mc-3d-editor .mc-sup-nombre', 'NO GUARDAR');
    await p.click('.mc-3d-editor button:has-text("Cancelar")'); await p.waitForTimeout(500);
    ok(!(await p.$('.mc-3d-editor')) && (await datos()).superficies[0].nombre === 'Terreno natural', 'Cancelar no cambia nada');
  }
  if (await p.$('.mc-3d-dibujo')) await p.click('.mc-3d-dibujo button:has-text("‹ 2D")');
  await p.waitForTimeout(200);
  ok(!(await p.$('.mc-3d-dibujo')) && await p.$('.tv-dib-svg') !== null, 'se vuelve al 2D');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.filter(e => !/deprecated/i.test(e)).length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
