// Trazos juntos (v33): lo que comparte estilo se dibuja en UN camino del svg, así un plano importado
// con miles de líneas no arrastra al mover. Lo que se edita (elegido, señalado o con relleno) sigue aparte.
//   node pruebas/juntos.js [index.html]        (W=390 para celular)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const W = +(process.env.W || 1100), movil = W < 600;
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: movil ? 844 : 820 }, isMobile: movil, hasTouch: movil });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');

  const abrir = async objs => {
    await p.evaluate(o => { localStorage.clear();
      localStorage.setItem('minicivil', JSON.stringify([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'd', sig: 1, objs: o }] }]));
      localStorage.setItem('minicivil__t', String(Date.now() + 99999));
      localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); }, objs);
    await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(500);
    await p.click('.tv-dib-nav button[data-grupo=ver]'); await p.click('.tv-dib-hoja button[data-herr="@todo"]'); await p.waitForTimeout(450);
  };
  const cuenta = () => p.evaluate(() => {
    const svg = document.querySelector('.tv-dib-svg');
    const j = [...svg.querySelectorAll('.tv-dib-juntos')];
    return { total: svg.querySelectorAll('*').length, juntos: j.length,
      trozos: j.reduce((s, x) => s + ((x.getAttribute('d') || '').match(/M/g) || []).length, 0),
      arcos: j.some(x => /A[\d.]+,[\d.]+ 0 [01] [01]/.test(x.getAttribute('d') || '')),
      lineas: svg.querySelectorAll('line').length, polilineas: svg.querySelectorAll('polyline, polygon').length,
      sueltos: [...svg.querySelectorAll('path, polyline, polygon, circle')].filter(x => !x.classList.contains('tv-dib-juntos')
        && /0284C7|0F172A|DC2626|7C3AED/i.test(x.getAttribute('stroke') || '')
        && /^(none|)$/.test(x.getAttribute('fill') || '')).length,
      circulos: svg.querySelectorAll('circle').length };
  });

  // ── 1. un plano con 800 líneas de dos colores: pocos elementos, todas dibujadas ──
  const objs = []; let id = 1;
  for (let i = 0; i < 800; i++) { const x = (i % 40) * 5, y = Math.floor(i / 40) * 5;
    objs.push({ id: id++, t: 'pl', v: [{ x, y }, { x: x + 4, y }, { x: x + 4, y: y + 4 }], ...(i % 2 ? { col: '#DC2626' } : {}) }); }
  objs.push({ id: id++, t: 'pl', v: [{ x: 10, y: 120, b: 0.6 }, { x: 40, y: 120 }] });          // con curva, sin elegir
  objs.push({ id: id++, t: 'pl', c: true, som: 'relleno', v: [{ x: 60, y: 120 }, { x: 90, y: 120 }, { x: 90, y: 140 }] });  // con relleno
  objs.push({ id: id++, t: 'l', a: { x: 10, y: 160 }, b: { x: 60, y: 160 }, oculto: true });     // escondida
  await abrir(objs);
  const c1 = await cuenta();
  ok(c1.juntos > 0 && c1.juntos <= 8, 'los 801 trazos caben en ' + c1.juntos + ' caminos del svg (uno por estilo)');
  ok(c1.trozos === 801, 'y están todos: ' + c1.trozos + ' trozos dentro de esos caminos (800 líneas + la curva)');
  ok(c1.total < 60, 'el svg completo baja a ' + c1.total + ' elementos (antes era uno por objeto: más de 800)');
  ok(c1.arcos, 'una polilínea con curva que no está elegida se dibuja con su arco de verdad dentro del camino junto');
  ok(c1.sueltos === 0, 'ningún trazo sin relleno se dibuja ya en su propio elemento (quedan ' + c1.sueltos + ')');

  // ── 2. lo que no se junta: el relleno y lo escondido ──
  const relleno = await p.evaluate(() => {
    const svg = document.querySelector('.tv-dib-svg');
    const con = [...svg.querySelectorAll('path, polygon')].filter(x => !x.classList.contains('tv-dib-juntos') && !/^(none|)$/.test(x.getAttribute('fill') || ''));
    return { n: con.length, fill: con[0] ? con[0].getAttribute('fill') : null };
  });
  ok(relleno.n === 1 && /rgba|url/.test(relleno.fill || ''), 'la figura con relleno se dibuja aparte, con su relleno (' + relleno.fill + ')');
  // la línea escondida no está entre los 801 trozos; al mostrarla, aparece
  await p.evaluate(() => { const P0 = HIST.actual.proyectos[0];
    HIST.crudo.proyectos([{ ...P0, dibujos: P0.dibujos.map(d => ({ ...d, objs: d.objs.map(o => o.oculto ? { ...o, oculto: false } : o) })) }]); });
  await p.waitForTimeout(450);
  const c1b = await cuenta();
  ok(c1b.trozos === 802, 'lo escondido no se dibujaba (801); al mostrarlo entra al camino junto (' + c1b.trozos + ')');

  // ── 3. elegir sigue funcionando y lo elegido sale aparte, resaltado ──
  const enPantalla = q => p.evaluate(c => { const r = document.querySelector('.tv-dib-svg').getBoundingClientRect(), s = MC_DIB.aP(c); return { x: r.left + s.X, y: r.top + s.Y }; }, q);
  const herr = async (g, i2) => { if (!(await p.$(`.tv-dib-hoja button[data-herr="${i2}"]`))) await p.click(`.tv-dib-nav button[data-grupo=${g}]`);
    await p.waitForTimeout(200); await p.click(`.tv-dib-hoja button[data-herr="${i2}"]`); await p.waitForTimeout(200); };
  await herr('editar', 'elegir');
  { const s = await enPantalla({ x: 2, y: 0 }); await p.mouse.click(s.x, s.y); await p.waitForTimeout(400); }
  const sel = await p.evaluate(() => {
    const svg = document.querySelector('.tv-dib-svg');
    const res = [...svg.querySelectorAll('path, polyline, polygon')].filter(x => !x.classList.contains('tv-dib-juntos') && /F59E0B/i.test(x.getAttribute('stroke') || ''));
    const j = [...svg.querySelectorAll('.tv-dib-juntos')].reduce((s2, x) => s2 + ((x.getAttribute('d') || '').match(/M/g) || []).length, 0);
    return { resaltados: res.length, trozos: j, panel: /POLIL/.test(document.body.textContent) };
  });
  ok(sel.panel && sel.resaltados >= 1, 'tocar una línea la elige: sale su panel y se dibuja aparte, resaltada');
  ok(sel.trozos === 801, 'y sale del camino junto: quedan ' + sel.trozos + ' trozos (802 menos la elegida)');

  // ── 4. mover la vista: el tiempo por cuadro ya no crece con el dibujo ──
  const medir = async () => p.evaluate(async () => {
    const svg = document.querySelector('.tv-dib-svg'), caja = svg.getBoundingClientRect();
    const t0 = performance.now();
    for (let k = 0; k < 10; k++) { svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -60, clientX: caja.left + 100, clientY: caja.top + 200, bubbles: true, cancelable: true }));
      await new Promise(r => requestAnimationFrame(r)); }
    return (performance.now() - t0) / 10;
  });
  await abrir([]);
  const vacio = await medir();
  const muchos = []; let id2 = 1;
  for (let i = 0; i < 3000; i++) { const x = (i % 60) * 4, y = Math.floor(i / 60) * 4;
    muchos.push({ id: id2++, t: 'pl', v: [{ x, y }, { x: x + 3, y }, { x: x + 3, y: y + 3 }] }); }
  await abrir(muchos);
  const c2 = await cuenta();
  const lleno = await medir();
  ok(c2.juntos <= 4 && c2.trozos === 3000, '3000 polilíneas en ' + c2.juntos + ' camino(s), con sus ' + c2.trozos + ' trozos');
  ok(lleno < vacio * 1.8 + 4, 'acercar con 3000 polilíneas cuesta ' + lleno.toFixed(1) + ' ms por cuadro, casi lo mismo que con el dibujo vacío (' + vacio.toFixed(1) + ' ms)');

  if (movil) ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sin desplazamiento de lado en celular');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (trazos juntos ' + (movil ? 'celular' : 'PC') + ').');
  process.exit(fallas ? 1 : 0);
})();
