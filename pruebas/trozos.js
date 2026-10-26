// v50: un dibujo grande (más de 20 000 objetos) se guarda en IndexedDB por pedazos de 5 000, cada uno en su turno, y al abrir
// se arma de nuevo. v51: la copia automática no lleva los proyectos temporales (lo abierto sin guardar).
//   node pruebas/trozos.js [carpeta del repositorio]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path'), http = require('http'), fs = require('fs');
(async () => {
  const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
  const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/minicivil\//, '/'); if (f === '/') f = '/index.html';
    const ruta = path.join(raiz, f); if (!ruta.startsWith(raiz) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': tipos[path.extname(ruta)] || 'application/octet-stream' }); fs.createReadStream(ruta).pipe(r); });
  await new Promise(ok => srv.listen(0, ok));
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, t) => { console.log((bien ? 'bien  ' : 'FALLA ') + t); if (!bien) fallas++; };
  await p.goto('http://localhost:' + srv.address().port + '/minicivil/'); await p.waitForSelector('header.tv-header');

  const r1 = await p.evaluate(async () => {
    const objs = []; for (let i = 0; i < 60000; i++) objs.push({ id: 'o' + i, t: 'l', a: { x: i, y: 0 }, b: { x: i, y: 1.5 } });
    const proy = [{ id: 'P1', nombre: 'Grande', creado: 1, dibujos: [{ id: 'D1', nombre: 'Plano', objs }, { id: 'D2', nombre: 'Chico', objs: [{ id: 'c', t: 'p', x: 1, y: 2 }] }] }];
    let pausa = 0, last = performance.now(); const iv = setInterval(() => { const n = performance.now(); pausa = Math.max(pausa, n - last); last = n; }, 10);
    await guardarProyectosIdb(TV_KEY, proy); clearInterval(iv);
    const trozos = async () => (await TVDB.claves()).filter(c => String(c).includes('__trozo'));
    const ks = await trozos(), reg = await TVDB.get(TV_KEY);
    // agregar un objeto al final: los 12 pedazos llenos no se vuelven a escribir
    const objs2 = objs.concat([{ id: 'nuevo', t: 'l', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } }]);
    await guardarProyectosIdb(TV_KEY, [{ ...proy[0], dibujos: [{ ...proy[0].dibujos[0], objs: objs2 }, proy[0].dibujos[1]] }]);
    const ks2 = await trozos();
    return { pausa: Math.round(pausa), trozos: ks.length, regSinObjs: !reg[0].dibujos[0].objs && reg[0].dibujos[0].__trozos.length, chico: reg[0].dibujos[1].objs.length,
      trozos2: ks2.length, reusados: ks2.filter(c => ks.includes(c)).length };
  });
  ok(r1.trozos === 12, '60 000 objetos = 12 pedazos de 5 000 (' + r1.trozos + ')');
  ok(r1.regSinObjs === 12, 'el registro del proyecto lleva las claves de los pedazos, no los objetos');
  ok(r1.chico === 1, 'el dibujo chico va entero en el registro');
  ok(r1.trozos2 === 13 && r1.reusados === 12, 'al agregar uno al final solo se escribe un pedazo nuevo (' + r1.trozos2 + ', ' + r1.reusados + ' iguales)');
  ok(r1.pausa < 400, 'la pantalla no se queda quieta al guardar (pausa máxima ' + r1.pausa + ' ms)');

  await p.evaluate(async () => { await TVDB.set(TV_KEY + '__t', Date.now() + 1e6); try { localStorage.removeItem(TV_KEY); } catch (_) {} });
  await p.reload(); await p.waitForSelector('header.tv-header');
  const r2 = await p.evaluate(() => { const v = DATOS.valores[TV_KEY], d = v[0].dibujos[0];
    return { n: d.objs.length, ult: d.objs[d.objs.length - 1].id, primero: d.objs[0].a.x, sinTrozos: !('__trozos' in d), chico: v[0].dibujos[1].objs.length }; });
  ok(r2.n === 60001 && r2.ult === 'nuevo' && r2.primero === 0 && r2.sinTrozos && r2.chico === 1, 'al abrir se arma igual (60 001 objetos, en orden)');

  const r3 = await p.evaluate(async () => { const v = DATOS.valores[TV_KEY];
    await guardarProyectosIdb(TV_KEY, [{ ...v[0], dibujos: [v[0].dibujos[1]] }]);
    return (await TVDB.claves()).filter(c => String(c).includes('__trozo')).length; });
  ok(r3 === 0, 'al quitar el dibujo grande se borran sus pedazos (' + r3 + ')');

  // la copia automática no lleva lo abierto sin guardar
  const r4 = await p.evaluate(async () => {
    DATOS.valores[TV_KEY] = [{ id: 'A', nombre: 'Guardado', creado: 1, dibujos: [] }, { id: 'T', nombre: 'Abierto', creado: 1, temporal: true, dibujos: [] }];
    DATOS.copiaDia = null; await TVDB.del(TV_KEY + '_respaldos'); copiaAutomatica();
    for (let i = 0; i < 50; i++) { const l = await leerCopiasAutomaticas(); if (l.length) return l[0].vias.map(p => p.id).join(','); await new Promise(r => setTimeout(r, 50)); }
    return 'sin copia'; });
  ok(r4 === 'A', 'la copia automática no lleva el proyecto temporal (' + r4 + ')');

  // falta un pedazo: no carga y no escribe encima
  await p.evaluate(async () => { const objs = []; for (let i = 0; i < 30000; i++) objs.push({ id: 'o' + i, t: 'l', a: { x: i, y: 0 }, b: { x: i, y: 1 } });
    await guardarProyectosIdb(TV_KEY, [{ id: 'P1', nombre: 'G', creado: 1, dibujos: [{ id: 'D1', nombre: 'Plano', objs }] }]); await TVDB.set(TV_KEY + '__t', Date.now() + 2e6);
    const ks = (await TVDB.claves()).filter(c => String(c).includes('__trozo')); await TVDB.del(ks[2]);
    try { localStorage.setItem(TV_KEY + '__soloIdb', '1'); localStorage.removeItem(TV_KEY); } catch (_) {} });
  await p.reload(); await p.waitForSelector('header.tv-header');
  const r5 = await p.evaluate(() => ({ idb: DATOS.idb, noEscribir: !!(DATOS.noEscribir && DATOS.noEscribir[TV_KEY]) }));
  ok(r5.idb === false && r5.noEscribir, 'si falta un pedazo no se carga a medias ni se escribe encima');

  // un pedazo huérfano (de una escritura cortada al recargar) se borra en la próxima escritura después de abrir (precargarDatos)
  await p.evaluate(async () => { for (const c of await TVDB.claves()) await TVDB.del(c); localStorage.clear(); localStorage.setItem(TV_KEY + '__soloIdb', '1');
    await TVDB.set(TV_KEY, [{ id: 'A', nombre: 'Chico', creado: 1, dibujos: [] }]);
    await TVDB.set(TV_KEY + '__t', Date.now() + 3e6); await TVDB.set(TV_KEY + '__trozohuerfano_1', [{ id: 'x', t: 'p', x: 0, y: 0 }]); });
  await p.reload(); await p.waitForSelector('header.tv-header');
  const r6 = await p.evaluate(async () => { await guardarProyectosIdb(TV_KEY, DATOS.valores[TV_KEY]); return (await TVDB.claves()).filter(c => String(c).includes('__trozo')).length; });
  ok(r6 === 0, 'un pedazo huérfano se borra en la primera escritura después de abrir (' + r6 + ')');

  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.'); process.exit(fallas ? 1 : 0);
})();
