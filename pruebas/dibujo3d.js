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
  const proyecto = [{ id: 1, nombre: 'Lote', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 60, objs }], superficies: [{ id: 'tn', nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '' }] }];
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
  if (await p.$('.mc-3d-dibujo')) await p.click('.mc-3d-dibujo button:has-text("‹ 2D")');
  await p.waitForTimeout(200);
  ok(!(await p.$('.mc-3d-dibujo')) && await p.$('.tv-dib-svg') !== null, 'se vuelve al 2D');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.filter(e => !/deprecated/i.test(e)).length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
