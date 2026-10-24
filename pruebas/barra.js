// v37: herramientas reordenadas, barra rápida a la carta, tema en el menú ⋯ y Drive como punto.
//   node pruebas/barra.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 900 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  const proy = [{ id: 1, nombre: 'P', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 1, objs: [{ id: 9, t: 'p', x: 0, y: 0, z: 1, d: 'TN' }, { id: 8, t: 'p', x: 30, y: 40, z: 2, d: 'TN' }, { id: 7, t: 'p', x: 40, y: 0, z: 3, d: 'TN' }] }],
    superficies: [{ id: 111, nombre: 'Terreno', fuente: { tipo: 'desc', descs: ['TN'] }, color: '#16A34A', curvas: '1' }] }];
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999));
    localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, proy);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
  const grupo = async g => { await p.click(`.tv-dib-nav button[data-grupo=${g}]`); await p.waitForTimeout(120);
    const l = await p.$$eval('.tv-dib-hoja button[data-herr]', bs => bs.map(x => x.dataset.herr)); await p.click(`.tv-dib-nav button[data-grupo=${g}]`); return l; };

  // grupos
  const grupos = await p.$$eval('.tv-dib-nav button[data-grupo]', bs => bs.map(x => x.dataset.grupo));
  ok(grupos.includes('herramientas') && !grupos.includes('ver'), 'grupos: ' + grupos.join(', '));
  const dib = await grupo('dibujar'), med = await grupo('medir'), edi = await grupo('editar'), her = await grupo('herramientas');
  ok(!dib.some(x => /^@|paralela|desfase|estacar/.test(x)), 'Dibujar solo dibuja: ' + dib.join(', '));
  ok(med.join() === 'idcoord,distancia,area,angulo,radio,abscisa', 'Medir solo mide: ' + med.join(', '));
  ok(edi.includes('paralela') && edi.includes('desfase') && !edi.some(x => x[0] === '@'), 'Paralela y Desfase en Editar; sin deshacer en la lista');
  ok(['replanteo', 'cuadro', 'acotar', 'autoacotar', 'estacar', '@imanes', '@cuadricula', '@buscar', '@puntos', '@regenerar', '@dib3d', '@barra'].every(x => her.includes(x)), 'Herramientas: ' + her.join(', '));
  const enPantalla = await p.evaluate(() => { const r = document.querySelector('.tv-dib-nav').getBoundingClientRect(); return [...document.querySelectorAll('.tv-dib-nav button')].every(x => x.getBoundingClientRect().right <= r.right + 1) && r.height < 60; });
  ok(enPantalla, 'los grupos caben en una línea');

  // barra rápida
  const barra = () => p.$$eval('.mc-rapida [data-accion]', bs => bs.map(x => x.dataset.accion));
  ok((await barra()).join() === 'distancia,todo,mano,deshacer,rehacer', 'la barra rápida trae lo de siempre: ' + (await barra()).join(', '));
  await p.click('.mc-rapida [data-accion=distancia]'); await p.waitForTimeout(150);
  ok(/DISTANCIA/.test(await p.textContent('.tv-dib-cmd')), 'tocar Distancia en la barra la activa');
  await p.click('.tv-dib-nav button[data-grupo=herramientas]'); await p.click('.tv-dib-hoja button[data-herr="@barra"]'); await p.waitForTimeout(150);
  await p.click('.mc-rapida-elegir [data-rapida=area]'); await p.click('.mc-rapida-elegir [data-rapida=mano]'); await p.waitForTimeout(100);
  await p.click('.mc-rapida-elegir button:has-text("Listo")');
  ok((await barra()).join() === 'distancia,todo,deshacer,rehacer,area', 'se agrega Área y se quita la mano: ' + (await barra()).join(', '));
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);
  ok((await barra()).join() === 'distancia,todo,deshacer,rehacer,area', 'el equipo se acuerda de la barra al recargar');
  await p.click('.mc-rapida-ver'); await p.waitForTimeout(100);
  ok((await barra()).length === 0, 'la barra se esconde');
  await p.click('.mc-rapida-ver'); await p.waitForTimeout(100);
  ok((await barra()).length === 5, 'y vuelve');

  // fila de arriba: sin tema; Drive es un punto de 28 px; el tema está en el ⋯
  ok(!(await p.$('.mc-barra-dib .tv-btn-tema')) && !(await p.$('.mc-dib3d')), 'arriba ya no está el tema ni "Dib 3D"');
  const nube = await p.$eval('.mc-barra-dib .tv-nube', e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), e.innerText.trim()]; });
  ok(nube[0] === 28 && nube[1] === 28 && !nube[2], 'Drive es un punto de 28 px sin texto: ' + nube.join(' × '));
  await p.click('.mc-barra-dib .tv-nube'); await p.waitForTimeout(150);
  ok(!!(await p.$('.tv-panel-nube')), 'tocar el punto abre Drive');
  await p.click('.tv-panel-nube button[aria-label^=Cerra]'); await p.waitForTimeout(100);
  await p.click('.mc-mas'); await p.click('.tv-dib-mas [data-tema-btn=oscuro]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.documentElement.getAttribute('data-tema')) === 'oscuro', 'el tema se cambia en el menú ⋯');
  // v39: la superficie se edita en su pestaña
  ok(!grupos.includes('superficie') && !(await p.$('.mc-modo')), 'el Dibujo ya no tiene el grupo Superficie ni el 2D | 3D');
  const irA = async (tab, v) => { await p.evaluate(([t, v]) => { localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: t })); if (v) localStorage.setItem('minicivil_supvista', JSON.stringify(v)); }, [tab, v]); await p.reload(); await p.waitForTimeout(700); };
  await irA('superficies', 'editar');
  const gs = await p.$$eval('.tv-dib-nav button[data-grupo]', bs => bs.map(x => x.dataset.grupo));
  ok(gs.join() === 'superficie,dibujar' && /QUITAR TRIÁNGULO/.test(await p.textContent('.tv-dib-cmd')), 'Superficies → Editar: grupos Triángulos y Dibujar, y arranca en Quitar triángulo');
  // auditoría v39: con el 3D abierto, Retroceso no borra lo que quedó elegido en el 2D
  await p.click('.tv-dib-nav button[data-grupo=dibujar]'); await p.click('.tv-dib-hoja button[data-herr=elegir]'); await p.waitForTimeout(150);
  const q = await p.evaluate(() => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), a = MC_DIB.aP({ x: 30, y: 40 }); return { x: r.left + a.X, y: r.top + a.Y }; });
  if (movil) await p.touchscreen.tap(q.x, q.y); else await p.mouse.click(q.x, q.y); await p.waitForTimeout(300);
  const nObj = () => p.evaluate(() => HIST.actual.proyectos[0].dibujos[0].objs.length), n0 = await nObj();
  ok(!!(await p.$('.tv-dib-panel')), 'en Editar se elige un punto');
  await p.click('[data-vista="3d"]'); await p.waitForTimeout(400);
  await p.keyboard.press('Backspace'); await p.waitForTimeout(300);
  ok(await nObj() === n0, 'en el 3D, Retroceso no borra el punto elegido en el 2D (' + n0 + ' → ' + await nObj() + ')');
  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (barra).');
  process.exit(fallas ? 1 : 0);
})();
