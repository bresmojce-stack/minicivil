// Dibujo: puntos y textos del mismo tamaño en pantalla antes, durante y después de acercar (rueda) — Brian: "fijos en pantalla".
//   node pruebas/zoom.js [index.html]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const archivo = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fallas = 0; const ok = (bien, txt) => { console.log((bien ? 'bien  ' : 'FALLA ') + txt); if (!bien) fallas++; };
  await p.goto('file://' + archivo); await p.waitForSelector('header.tv-header');
  const objs = []; for (let i = 0; i < 25; i++) objs.push({ id: i + 1, t: 'p', x: 1000000 + (i % 5) * 10, y: 900000 + Math.floor(i / 5) * 10, nom: String(i + 1), z: 1500, d: 'TN' });
  objs.push({ id: 99, t: 'tx', p: { x: 1000020, y: 900020 }, s: 'LOTE' });
  await p.evaluate(v => { localStorage.clear(); localStorage.setItem('minicivil', JSON.stringify(v)); localStorage.setItem('minicivil__t', String(Date.now() + 99999)); localStorage.setItem('minicivil_nav', JSON.stringify({ vista: 'proyecto', id: 1, tab: 'dibujo' })); },
    [{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 2, nombre: 'Lev', sig: 26, objs }] }]);
  await p.reload(); await p.waitForSelector('.tv-dib-svg'); await p.waitForTimeout(400);
  const med = () => p.evaluate(() => { const c = document.querySelector('.tv-dib-svg .tv-fijo circle'), t = document.querySelector('.tv-dib-svg text.tv-fijo'), s = document.querySelector('.tv-dib-svg');
    return { punto: c.getBoundingClientRect().width, texto: t.getBoundingClientRect().height, escala: (document.querySelector('.tv-dib-capa').getAttribute('data-escala')) || 1 }; });
  const antes = await med();
  const bb = await (await p.$('.tv-dib-svg')).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.evaluate(() => { const s = document.querySelector('.tv-dib-svg'), r = s.getBoundingClientRect(); for (let i = 0; i < 4; i++) s.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); });
  const durante = await med();
  await p.mouse.move(bb.x + bb.width / 2 + 5, bb.y + bb.height / 2 + 5); await p.waitForTimeout(400);
  const despues = await med();
  const igual = (a, c) => Math.abs(a - c) < 0.6;
  ok(+durante.escala > 3, 'a la mitad del gesto la imagen está agrandada ×' + (+durante.escala).toFixed(1));
  ok(igual(durante.punto, antes.punto) && igual(despues.punto, antes.punto), 'el punto mide lo mismo antes, durante y después: ' + [antes.punto, durante.punto, despues.punto].map(v => v.toFixed(1)).join(' / ') + ' px');
  ok(igual(durante.texto, antes.texto) && igual(despues.texto, antes.texto), 'el texto mide lo mismo antes, durante y después: ' + [antes.texto, durante.texto, despues.texto].map(v => v.toFixed(1)).join(' / ') + ' px');
  // el lienzo no recorta lo que estaba fuera de la pantalla mientras se aleja o se mueve
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.tv-dib-svg')).overflow === 'visible'), 'durante el gesto se ve lo que estaba fuera de la pantalla (el dibujo no se corta)');
  // 300 puntos juntos: de lejos sin textos (no se amontonan) y al acercar aparecen donde caben
  let sem = 7; const rnd = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
  const loma = []; for (let i = 0; i < 300; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 60; loma.push({ id: i + 1, t: 'p', x: 1000060 + r * Math.cos(a), y: 1000060 + r * Math.sin(a), z: 1500, nom: String(i + 1), d: 'TN' }); }
  await p.evaluate(v => { HIST.crudo.proyectos([{ id: 1, nombre: 'Z', creado: '', dibujos: [{ id: 3, nombre: 'Loma', sig: 301, objs: v }] }]); }, loma); await p.waitForTimeout(500);
  const textos = () => p.evaluate(() => document.querySelectorAll('.tv-dib-svg .tv-fijo text').length);
  const lejos = await textos();
  await p.evaluate(() => { const s = document.querySelector('.tv-dib-svg'), r = s.getBoundingClientRect(); for (let i = 0; i < 6; i++) s.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); });
  await p.mouse.move(bb.x + 20, bb.y + 20); await p.waitForTimeout(400);
  const cerca = await textos();
  ok(lejos < 60 && cerca > lejos * 5, 'de lejos los textos de los puntos juntos se esconden y al acercar aparecen: ' + lejos + ' → ' + cerca + ' textos');
  ok(!errs.length, 'sin errores' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fallas ? fallas + ' falla(s).' : 'Todo bien (zoom).');
  process.exit(fallas ? 1 : 0);
})();
