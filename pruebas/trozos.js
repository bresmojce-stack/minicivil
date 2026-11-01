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
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
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
  // v61: al abrir la app el plano NO se arma (queda su registro con las claves y cuántos objetos); se arma al abrir el proyecto
  const r2a = await p.evaluate(async () => { const d = DATOS.valores[TV_KEY][0].dibujos[0], n0 = (await TVDB.claves()).filter(c => String(c).includes('__trozo')).length;
    await guardarProyectosIdb(TV_KEY, DATOS.valores[TV_KEY].concat([{ id: 'otro', nombre: 'Otro', creado: 1, dibujos: [] }]));   // se guarda otro cambio sin abrir el plano
    const n1 = (await TVDB.claves()).filter(c => String(c).includes('__trozo')).length;
    return { stub: Array.isArray(d.__trozos) && !d.objs, n: d.__n, n0, n1, inicio: !!document.querySelector('.mc-abrir-archivo') }; });
  ok(r2a.stub && r2a.n === 60001 && r2a.inicio, 'al abrir la app se ve el inicio y el plano no se arma (' + JSON.stringify(r2a) + ')');
  ok(r2a.n0 === 13 && r2a.n1 === 13, 'guardar otro cambio sin abrir el plano no borra sus pedazos (' + r2a.n0 + ' → ' + r2a.n1 + ')');
  const r2 = await p.evaluate(async () => { const armar = async () => { const v = DATOS.valores[TV_KEY]; for (let i = 0; i < v.length; i++) if (sinArmar(v[i])) v[i] = { ...v[i], dibujos: await armarProyecto(v[i]) }; return v; }; const v = await armar(), d = v[0].dibujos[0];
    return { n: d.objs.length, ult: d.objs[d.objs.length - 1].id, primero: d.objs[0].a.x, sinTrozos: !('__trozos' in d), chico: v[0].dibujos[1].objs.length }; });
  ok(r2.n === 60001 && r2.ult === 'nuevo' && r2.primero === 0 && r2.sinTrozos && r2.chico === 1, 'al abrir el proyecto se arma igual (60 001 objetos, en orden)');

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
  // v61: la app abre igual (el plano no se arma al entrar); al abrir el proyecto lo dice y no escribe encima
  await p.evaluate(() => document.querySelector('.mc-proyecto').click()); await p.waitForSelector('.mc-armar-error', { timeout: 20000 });
  const r5 = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 700)); const reg = await TVDB.get(TV_KEY);
    return { error: document.querySelector('.mc-armar-error').textContent, intacto: Array.isArray(reg[0].dibujos[0].__trozos) && reg[0].dibujos[0].__trozos.length === 6 }; });
  ok(/Falta un pedazo/.test(r5.error) && r5.intacto, 'si falta un pedazo, al abrir el proyecto lo dice y no escribe encima (' + JSON.stringify(r5) + ')');
  await p.evaluate(() => localStorage.removeItem(TV_KEY + '__soloIdb'));

  // un pedazo huérfano (de una escritura cortada al recargar) se borra en la próxima escritura después de abrir (precargarDatos)
  await p.evaluate(async () => { for (const c of await TVDB.claves()) await TVDB.del(c); localStorage.clear(); localStorage.setItem(TV_KEY + '__soloIdb', '1');
    await TVDB.set(TV_KEY, [{ id: 'A', nombre: 'Chico', creado: 1, dibujos: [] }]);
    await TVDB.set(TV_KEY + '__t', Date.now() + 3e6); await TVDB.set(TV_KEY + '__trozohuerfano_1', [{ id: 'x', t: 'p', x: 0, y: 0 }]); });
  await p.reload(); await p.waitForSelector('header.tv-header');
  const r6 = await p.evaluate(async () => { await guardarProyectosIdb(TV_KEY, DATOS.valores[TV_KEY]); return (await TVDB.claves()).filter(c => String(c).includes('__trozo')).length; });
  ok(r6 === 0, 'un pedazo huérfano se borra en la primera escritura después de abrir (' + r6 + ')');

  // v58: las polilíneas de un dibujo grande abren con los vértices compactos: por fuera, idénticas (JSON byte por byte, copia
  // con { ... }, structuredClone) y por dentro en una lista de números
  await p.evaluate(async () => { for (const c of await TVDB.claves()) await TVDB.del(c); localStorage.clear(); localStorage.setItem(TV_KEY + '__soloIdb', '1');
    const objs = []; for (let i = 0; i < 25000; i++) objs.push({ id: 'p' + i, t: 'pl', v: [{ x: i + 0.1, y: 0.2 }, { x: i + 1.3, y: 2.4, z: 10.5 }, { x: i + 2.5, y: 0.6, b: 0.25 }, { x: i + 3.7, y: 1.8, z: 0, b: -1 }], c: i % 2 === 0, col: '#2563EB' });
    window.__orig = JSON.stringify(objs);
    await guardarProyectosIdb(TV_KEY, [{ id: 'P', nombre: 'Polis', creado: 1, dibujos: [{ id: 'D', nombre: 'd', objs }] }]); await TVDB.set(TV_KEY + '__t', Date.now() + 4e6);
    localStorage.setItem('__orig', window.__orig); });
  await p.reload(); await p.waitForSelector('header.tv-header');
  const r7 = await p.evaluate(async () => { const armar = async () => { const v = DATOS.valores[TV_KEY]; for (let i = 0; i < v.length; i++) if (sinArmar(v[i])) v[i] = { ...v[i], dibujos: await armarProyecto(v[i]) }; return v; }; const o = (await armar())[0].dibujos[0].objs, d = Object.getOwnPropertyDescriptor(o[3], 'v');
    const igual = JSON.stringify(o) === localStorage.getItem('__orig'), c = { ...o[3], col: '#000' }, sc = structuredClone(o[5]);
    return { compacto: !!(d && d.get) && o[3].__vf instanceof Float64Array, igual, copia: Array.isArray(c.v) && c.v[2].b === 0.25 && c.v[1].z === 10.5 && !('__vf' in c),
      clon: Array.isArray(sc.v) && sc.v.length === 4 && sc.v[3].z === 0 && sc.v[3].b === -1, area: Math.abs(DIB.areaObj(o[0]) - DIB.areaObj(JSON.parse(localStorage.getItem('__orig'))[0])) < 1e-12 }; });
  ok(r7.compacto && r7.igual && r7.copia && r7.clon && r7.area, 'un dibujo grande de polilíneas abre con los vértices compactos y sale idéntico (' + JSON.stringify(r7) + ')');
  // v58: al guardar otra vez, los pedazos llevan las listas de números (`__cv`) y al abrir de nuevo sale idéntico
  await p.evaluate(async () => { TROZOS.porPrimero = new Map(); await guardarProyectosIdb(TV_KEY, DATOS.valores[TV_KEY]); await TVDB.set(TV_KEY + '__t', Date.now() + 5e6); });
  const pz = await p.evaluate(async () => { const c = (await TVDB.get(TV_KEY))[0].dibujos[0].__trozos[0], t = await TVDB.get(c); return { cv: !!(t[3].__cv && t[3].__cv.f instanceof Float64Array), sinV: !('v' in t[3]) }; });
  await p.reload(); await p.waitForSelector('header.tv-header');
  const r8 = await p.evaluate(async () => { const armar = async () => { const v = DATOS.valores[TV_KEY]; for (let i = 0; i < v.length; i++) if (sinArmar(v[i])) v[i] = { ...v[i], dibujos: await armarProyecto(v[i]) }; return v; }; const o = (await armar())[0].dibujos[0].objs; return { n: o.length, igual: JSON.stringify(o) === localStorage.getItem('__orig'), compacto: o[3].__vf instanceof Float64Array }; });
  ok(pz.cv && pz.sinV && r8.igual && r8.compacto && r8.n === 25000, 'guardado otra vez: los pedazos van con sus listas de números y abre idéntico (' + JSON.stringify({ ...pz, ...r8 }) + ')');

  // v61: con un proyecto abierto, cerrar la app y volver a entrar (otra pestaña, misma memoria del equipo) arranca en el inicio
  await p.evaluate(() => document.querySelector('.mc-proyecto').click()); await p.waitForTimeout(800);
  const dentro = await p.evaluate(() => !document.querySelector('.mc-abrir-archivo'));
  const p2 = await p.context().newPage(); await p2.goto(p.url()); await p2.waitForSelector('header.tv-header');
  const inicio = await p2.evaluate(() => !!document.querySelector('.mc-abrir-archivo') && !document.querySelector('.tv-dib-svg'));
  await p2.close();
  ok(dentro && inicio, 'cerrar con un proyecto abierto y volver a entrar arranca en el inicio (dentro: ' + dentro + ', inicio: ' + inicio + ')');
  ok(!errs.length, 'sin errores en la página' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien.'); process.exit(fallas ? 1 : 0);
})();
