// Drive simulado con dos equipos (A en PC, B en celular): conectar, recibir, cambiar, borrar y que use SU ID de
// cliente y SU carpeta "Mini Civil" (un archivo de TopoVías en el mismo Drive no se toca).
//   node pruebas/nube.js [index.html]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const drive = { files: {}, n: 0 };
const nuevoId = () => 'f' + (++drive.n);
// lo que TopoVías ya tenía en el mismo Drive (otra app): Mini Civil no debe verlo ni tocarlo
drive.files.tv1 = { id: 'tv1', name: 'TopoVías', folder: true, t: Date.now() };
drive.files.tv2 = { id: 'tv2', name: 'Vía - EJE 7.json', parent: 'tv1', appProperties: { k: 'via:11', h: 'x' }, data: '{}', t: Date.now() };
const pedidos = [];
function responder(route, status, body) {
  return route.fulfill({ status, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Content-Type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
}
async function manejarDrive(route) {
  const req = route.request(), url = new URL(req.url()), m = req.method();
  if (m === 'OPTIONS') return responder(route, 204);
  if (!/Bearer tok/.test(req.headers()['authorization'] || '')) return responder(route, 401, { error: 'no' });
  const ruta = url.pathname;
  if (ruta === '/drive/v3/about') return responder(route, 200, { user: { emailAddress: 'prueba@gmail.com' } });
  const pub = f => ({ id: f.id, name: f.name, modifiedTime: new Date(f.t).toISOString(), appProperties: f.appProperties, trashed: f.trashed, parents: f.parent ? [f.parent] : [] });
  if (ruta === '/drive/v3/files' && m === 'GET') {
    const q = url.searchParams.get('q') || '';
    let l = Object.values(drive.files).filter(f => !f.trashed);
    const nm = q.match(/name='([^']+)'/); if (nm) l = l.filter(f => f.name === nm[1] && f.folder);
    const par = q.match(/'([^']+)' in parents/); if (par) l = l.filter(f => f.parent === par[1]);
    return responder(route, 200, { files: l.map(pub) });
  }
  if (ruta === '/drive/v3/files' && m === 'POST') {
    const b = JSON.parse(req.postData()); const id = nuevoId();
    drive.files[id] = { id, name: b.name, folder: true, t: Date.now() }; return responder(route, 200, { id });
  }
  let mm = ruta.match(/^\/drive\/v3\/files\/(\w+)$/);
  if (mm) {
    const f = drive.files[mm[1]]; if (!f) return responder(route, 404, {});
    if (m === 'GET' && url.searchParams.get('alt') === 'media') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: f.data });
    if (m === 'GET') return responder(route, 200, pub(f));
    if (m === 'PATCH') { Object.assign(f, JSON.parse(req.postData())); f.t = Date.now(); return responder(route, 200, pub(f)); }
  }
  mm = ruta.match(/^\/upload\/drive\/v3\/files(?:\/(\w+))?$/);
  if (mm) {
    const ct = req.headers()['content-type'], b = ct.match(/boundary=(.+)$/)[1];
    const partes = req.postData().split('--' + b).filter(x => x.trim() && x.trim() !== '--').map(x => x.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''));
    const meta = JSON.parse(partes[0]), data = partes[1];
    let f = mm[1] ? drive.files[mm[1]] : null;
    if (!f) { const id = nuevoId(); f = drive.files[id] = { id, parent: meta.parents[0] }; }
    Object.assign(f, { name: meta.name, appProperties: meta.appProperties, data, t: Date.now() });
    return responder(route, 200, { id: f.id, modifiedTime: new Date(f.t).toISOString() });
  }
  return responder(route, 404, { error: 'ruta ' + m + ' ' + ruta });
}
const GIS = `window.google = { accounts: { oauth2: { initTokenClient: c => { window.__cliente = c.client_id; return { requestAccessToken: o => setTimeout(() => c.callback({ access_token: 'tok', expires_in: 3600 }), 50) }; }, revoke: (t, f) => f && f() } } };`;
const proy = (id, nombre, n) => ({ id, nombre, creado: '', dibujos: [{ id: id * 10, nombre: 'Dibujo 1', sig: n + 1, objs: Array.from({ length: n }, (_, i) => ({ id: id * 100 + i, t: 'p', x: 1000 + i, y: 1000 + i, nom: 'P' + (i + 1) })) }] });
(async () => {
  const b = await chromium.launch();
  const errs = [];
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  async function equipo(nombre, proyectos, W) {
    const ctx = await b.newContext({ viewport: { width: W || 1280, height: 900 }, isMobile: (W || 1280) < 600, hasTouch: true });
    await ctx.route('https://www.googleapis.com/**', manejarDrive);
    await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: GIS }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(nombre + ': ' + e.message)); p.on('dialog', d => d.accept());
    await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
    await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now())); indexedDB.deleteDatabase('minicivil'); }, proyectos);
    await p.reload(); await p.waitForSelector('header.tv-header'); await p.waitForTimeout(400);
    return p;
  }
  const estado = p => p.evaluate(() => ({ est: NUBE.estado, msg: NUBE.msg, proyectos: HIST.actual.proyectos.map(v => v.nombre + '[' + v.dibujos[0].objs.length + ']').sort() }));
  const espera = async p => { await p.waitForFunction(() => !NUBE.ocupado && NUBE.estado !== 'sincronizando'); await p.waitForTimeout(100); };
  const enMiniCivil = () => { const c = Object.values(drive.files).find(f => f.folder && f.name === 'Mini Civil' && !f.trashed); return Object.values(drive.files).filter(f => c && f.parent === c.id && !f.trashed).map(f => f.name).sort().join(' | '); };
  const conectar = async p => { await p.click('button.tv-nube'); await p.click('button:has-text("Conectar con Google")'); await espera(p); await p.click('.tv-panel-nube button[aria-label=Cerrar]'); };

  // 1. A con dos proyectos se conecta
  const A = await equipo('A', [proy(1, 'Lote 4', 3), proy(2, 'Vía Tamarindo', 1)]);
  await conectar(A);
  ok((await A.evaluate(() => window.__cliente)) === '439434487259-vlavhlami0fhhulpb50um0n2u43bqfis.apps.googleusercontent.com', 'usa el ID de cliente de Mini Civil (no el de TopoVías)');
  ok(enMiniCivil() === 'Proyecto - Lote 4.json | Proyecto - Vía Tamarindo.json', '1. A sube sus 2 proyectos a la carpeta "Mini Civil": ' + enMiniCivil());
  ok((await A.textContent('button.tv-nube')).includes('Drive'), '   el botón de la barra dice ' + (await A.textContent('button.tv-nube')).trim());
  // 2. B vacío (celular) se conecta y los recibe
  const B = await equipo('B', [], 390);
  await conectar(B);
  let e = await estado(B);
  ok(JSON.stringify(e.proyectos) === '["Lote 4[3]","Vía Tamarindo[1]"]', '2. B recibe: ' + JSON.stringify(e.proyectos) + ' · ' + e.msg);
  // 3. B cambia un proyecto y agrega otro; A los trae al sincronizar
  await B.evaluate(() => { const l = HIST.actual.proyectos; HIST.crudo.proyectos(l.map(v => v.nombre === 'Lote 4' ? { ...v, nombre: 'Lote 4 (B)' } : v).concat([{ id: 3, nombre: 'Nuevo en B', creado: '', dibujos: [{ id: 30, nombre: 'D', sig: 1, objs: [] }] }])); vaciarGuardado(); });
  await B.evaluate(() => nubeSincronizar(true)); await espera(B);
  await A.evaluate(() => nubeSincronizar(true)); await espera(A);
  e = await estado(A);
  ok(JSON.stringify(e.proyectos) === '["Lote 4 (B)[3]","Nuevo en B[0]","Vía Tamarindo[1]"]', '3. A trae lo de B: ' + JSON.stringify(e.proyectos));
  ok(enMiniCivil() === 'Proyecto - Lote 4 (B).json | Proyecto - Nuevo en B.json | Proyecto - Vía Tamarindo.json', '   en Drive: ' + enMiniCivil());
  // 4. A borra un proyecto; B lo deja de tener
  await A.evaluate(() => { HIST.crudo.proyectos(HIST.actual.proyectos.filter(v => v.nombre !== 'Vía Tamarindo')); vaciarGuardado(); });
  await A.evaluate(() => nubeSincronizar(true)); await espera(A);
  await B.evaluate(() => nubeSincronizar(true)); await espera(B);
  e = await estado(B);
  ok(JSON.stringify(e.proyectos) === '["Lote 4 (B)[3]","Nuevo en B[0]"]', '4. borrado en A, B lo quita: ' + JSON.stringify(e.proyectos));
  // 5. lo de TopoVías en el mismo Drive sigue igual
  ok(!drive.files.tv1.trashed && !drive.files.tv2.trashed && drive.files.tv2.data === '{}' && drive.files.tv2.name === 'Vía - EJE 7.json', '5. la carpeta "TopoVías" y su archivo no se tocaron');
  ok(await A.evaluate(() => localStorage.getItem('topovias_standalone_nube') === null && !!localStorage.getItem('minicivil_nube')), '   la conexión se guarda como "minicivil_nube", aparte de TopoVías');
  // 6. desconectar no borra nada
  const antes = enMiniCivil();
  await A.click('button.tv-nube'); await A.click('.tv-panel-nube button:has-text("Desconectar")'); await A.waitForTimeout(200);
  ok(enMiniCivil() === antes && (await estado(A)).proyectos.length === 2, '6. desconectar no borra nada (ni en Drive ni en el equipo)');
  ok(!errs.length, 'sin errores en la consola' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (Drive simulado).');
  process.exit(fallas ? 1 : 0);
})();
