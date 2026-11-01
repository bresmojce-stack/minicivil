// v62: lo que encontró el inspector externo sobre la v61 y no tenía prueba: Deshacer tras eliminar un plano sin abrir, las claves del
// dibujo al armarlo, la hora de cada proyecto, copias automáticas y de rescate con planos sin abrir, DXF con cotas a medias y comas en textos.
//   node pruebas/v62.js [carpeta del repositorio]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), http = require('http'), fs = require('fs');
(async () => {
  const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
  const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/minicivil\//, '/'); if (f === '/') f = '/index.html';
    const ruta = path.join(raiz, f); if (!ruta.startsWith(raiz) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': tipos[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(r); });
  await new Promise(ok => srv.listen(0, ok));
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('http://localhost:' + srv.address().port + '/minicivil/'); await p.waitForSelector('header.tv-header');

  // un plano de 25 000 objetos guardado por pedazos, con `etq` DESPUÉS de objs, y la app recién abierta
  const sembrar = async () => { await p.evaluate(async () => {
    const objs = []; for (let i = 0; i < 25000; i++) objs.push({ id: 'o' + i, t: 'l', a: { x: i, y: 0 }, b: { x: i, y: 1.5 } });
    await guardarProyectosIdb(TV_KEY, [{ id: 7, nombre: 'Plano', creado: '', dibujos: [{ id: 70, nombre: 'Modelo', sig: 1, objs, etq: { num: true, z: true, d: false } }] }]);
    await TVDB.set(TV_KEY + '__t', 1000); localStorage.removeItem(TV_KEY); localStorage.removeItem(TV_KEY + '__t'); localStorage.setItem(TV_KEY + '__soloIdb', '1'); localStorage.removeItem(TV_KEY + '_horas'); });
    await p.reload(); await p.waitForSelector('.mc-proyecto'); await p.waitForTimeout(300); };
  const abrirProy = async () => { await p.click('.mc-proyecto', { position: { x: 30, y: 16 } });
    await p.waitForFunction(() => document.querySelector('.mc-armar-error') || (HIST.actual.proyectos[0] && !sinArmar(HIST.actual.proyectos[0]) && document.querySelector('.tv-dibujo')), null, { timeout: 30000 });
    return p.evaluate(() => { const e = document.querySelector('.mc-armar-error'), d = HIST.actual.proyectos[0].dibujos[0]; return { error: e ? e.innerText : '', n: d.objs ? d.objs.length : 0, claves: Object.keys(d).join() }; }); };

  // 1. eliminar sin abrir, Deshacer
  await sembrar();
  await p.click('.mc-proyecto button:has-text("Eliminar")'); await p.waitForTimeout(1500);
  ok(!(await p.$('.mc-proyecto')), '1. el plano sin abrir se elimina de la lista');
  await p.click('.tv-deshacer button:has-text("Deshacer")'); await p.waitForSelector('.mc-proyecto'); await p.waitForTimeout(800);
  let r = await abrirProy();
  ok(!r.error && r.n === 25000, '1. Deshacer lo devuelve y abre entero (' + (r.error || r.n + ' objetos') + ')');

  // 2. armarlo no cambia el orden de las claves ni la hora del proyecto
  await p.evaluate(() => sessionStorage.clear()); await sembrar();
  const antes = await p.evaluate(() => horaProyecto(HIST.actual.proyectos[0]));
  r = await abrirProy();
  ok(/^id,nombre,sig,objs,etq/.test(r.claves), '2. armar deja las claves en su orden (' + r.claves + ')');
  await p.waitForTimeout(800);
  const despues = await p.evaluate(() => horaProyecto(HIST.actual.proyectos[0]));
  ok(antes === 1000 && despues === 1000, '2. abrir un plano sin cambiar nada no cambia su hora (' + antes + ' → ' + despues + ')');

  // 5. copia automática con un plano sin abrir: restaurarla no lo vacía
  await p.evaluate(() => sessionStorage.clear()); await sembrar();
  await p.evaluate(async () => { DATOS.copiaDia = null; copiaAutomatica(); });
  await p.waitForTimeout(800);
  ok(await p.evaluate(async () => (await leerCopiasAutomaticas())[0].vias[0].dibujos[0].sinCopia === true), '5. la copia lleva el plano sin abrir marcado');
  await p.click('.mc-copias-ver'); await p.waitForSelector('.mc-copia-restaurar');
  await Promise.all([p.waitForEvent('load'), p.click('.mc-copia-restaurar')]); await p.waitForSelector('.mc-proyecto'); await p.waitForTimeout(500);
  r = await abrirProy();
  ok(!r.error && r.n === 25000, '5. restaurar la copia desde el inicio conserva el plano (' + (r.error || r.n + ' objetos') + ')');

  // 5. copia de rescate: lleva los objetos del plano sin abrir (se fuerza la pantalla de fallo sin dañar los datos)
  await p.evaluate(() => sessionStorage.clear()); await sembrar();
  await p.evaluate(() => { DATOS.otraVentana = true; HIST.crudo.proyectos([{ id: 1, dibujos: 5 }]); });
  await p.waitForSelector('button:has-text("Guardar copia de mis datos")');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Guardar copia de mis datos")')]);
  const copia = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok(copia.proyectos[0].dibujos[0].objs && copia.proyectos[0].dibujos[0].objs.length === 25000, '5. la copia de rescate lleva el plano entero (' + (copia.proyectos[0].dibujos[0].objs || []).length + ' objetos)');
  await p.reload(); await p.waitForSelector('header.tv-header');

  // 7. DXF con cota solo en algunos vértices (cuentas a mano)
  const dxf = await p.evaluate(() => crearDXF({ nombre: 'd', sig: 1, objs: [
    { id: 1, t: 'pl', v: [{ x: 0, y: 0, z: 1500 }, { x: 10, y: 0 }, { x: 20, y: 0, z: 1501 }, { x: 30, y: 0 }] },
    { id: 2, t: 'l', a: { x: 0, y: 5, z: 100 }, b: { x: 9, y: 5 } },
    { id: 3, t: 'pl', v: [{ x: 0, y: 9 }, { x: 5, y: 9 }, { x: 8, y: 9 }] }] }));
  const L = dxf.split(/\r?\n/).map(s => s.trim()), vert = [];
  for (let i = 0; i < L.length; i += 2) if (L[i] === '0' && L[i + 1] === 'VERTEX') { let j = i + 2; while (L[j] !== '30') j += 2; vert.push(+L[j + 1]); }
  ok(vert.slice(0, 4).join() === '1500,1500.5,1501,1501', '7. polilínea 1500 / sin cota / 1501 / sin cota = ' + vert.slice(0, 4).join(' / '));
  const iL = L.indexOf('LINE'); const z1 = +L[L.indexOf('30', iL) + 1], z2 = +L[L.indexOf('31', iL) + 1];
  ok(z1 === 100 && z2 === 100, '7. línea con cota en un extremo: ' + z1 + ' y ' + z2);
  ok(!vert.slice(4).some(z => z !== 0) , '7. polilínea sin cotas sigue en 0');

  // 8. comas: lo que es texto no cambia; lo que es número sí
  const c = await p.evaluate(() => corregirComas({ nombre: '0,80', ladoMax: '1,5', dibujos: [{ nombre: '4,5', objs: [{ t: 'p', nom: '12,5', d: '3,2' }, { t: 'tx', s: '0,80' }] }], presentacion: { datos: { notas: '2,5' }, hojas: [{ revision: '1,2', escala: '1,5' }] } }));
  ok(c.nombre === '0,80' && c.dibujos[0].nombre === '4,5' && c.dibujos[0].objs[0].nom === '12,5' && c.dibujos[0].objs[0].d === '3,2' && c.dibujos[0].objs[1].s === '0,80' && c.presentacion.datos.notas === '2,5' && c.presentacion.hojas[0].revision === '1,2', '8. nombres, descripciones y textos con coma se conservan');
  ok(c.ladoMax === '1.5' && c.presentacion.hojas[0].escala === '1.5', '8. los números guardados con coma pasan a punto');
  await p.fill('form input', ''); await p.type('form input', '0,80');
  ok(await p.inputValue('form input') === '0,80', '8. al escribir un nombre la coma se queda');
  await p.evaluate(() => { const i = document.createElement('input'); i.id = 'n'; i.setAttribute('inputmode', 'decimal'); document.body.appendChild(i); });
  await p.type('#n', '1,5');
  ok(await p.inputValue('#n') === '1.5', '8. en una casilla de números pasa a punto');

  ok(!errs.filter(e => !/dibujos|reduce|map|is not/.test(e)).length, 'sin errores en la página' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close(); srv.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.log('FALLA ' + e.message); process.exit(1); });
