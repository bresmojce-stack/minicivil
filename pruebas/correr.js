// Batería completa: corre cada prueba en PC, celular y tablet y dice cuáles fallaron.
//   node pruebas/correr.js            SOLO=superficies,importar node pruebas/correr.js   (solo algunas)
const { spawnSync } = require('child_process'), path = require('path'), os = require('os'), fs = require('fs');
const dir = __dirname, index = path.join(dir, '..', 'index.html'), salida = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-pruebas-'));
const P = [
  ['sintaxis', 'sintaxis.js', {}, []],
  ['abrir PC', 'abrir.js', {}, []], ['abrir celular', 'abrir.js', { W: '390' }, []], ['abrir tablet', 'abrir.js', { W: '820' }, []],
  ['dibujo PC', 'dibujo.js', {}, [index, path.join(salida, 'dib')]], ['dibujo celular', 'dibujo.js', { W: '390' }, [index, path.join(salida, 'dibcel')]], ['zoom sin restos', 'zoom.js', {}, []], ['dedo: arrastrar y apuntar PC', 'dedo.js', {}, []], ['dedo: arrastrar y apuntar celular', 'dedo.js', { W: '390' }, []], ['superficie en el dibujo PC', 'supdibujo.js', {}, []], ['superficie en el dibujo celular', 'supdibujo.js', { W: '390' }, []], ['3D en el dibujo PC', 'dibujo3d.js', {}, []], ['3D en el dibujo celular', 'dibujo3d.js', { W: '390' }, []],
  ['importar PC', 'importar.js', {}, []], ['importar celular', 'importar.js', { W: '390' }, []],
  ['superficies PC', 'superficies.js', {}, []], ['superficies celular', 'superficies.js', { W: '390' }, []], ['superficies tablet', 'superficies.js', { W: '820' }, []],
  ['presentación PC', 'presentacion.js', {}, []], ['presentación celular', 'presentacion.js', { W: '390' }, []],
  ['nube', 'nube.js', {}, []], ['sin conexión', 'sinconexion.js', {}, []]
];
const solo = (process.env.SOLO || '').split(',').filter(Boolean);
const malas = [];
P.forEach(([nombre, archivo, env, args]) => {
  if (solo.length && !solo.some(s => nombre.includes(s) || archivo.includes(s))) return;
  const t = Date.now(), r = spawnSync(process.execPath, [path.join(dir, archivo), ...args], { env: { ...process.env, ...env }, encoding: 'utf8', timeout: 600000 });
  const texto = (r.stdout || '') + (r.stderr || ''), fallas = texto.split('\n').filter(l => /^FALLA|Error|ERR/.test(l));
  // dibujo.js no dice bien/falla: termina en "no errors"
  const bien = r.status === 0 && !fallas.length && (archivo !== 'dibujo.js' || /no errors\s*$/.test(texto.trim()));
  console.log((bien ? 'bien  ' : 'FALLA ') + nombre + ' (' + Math.round((Date.now() - t) / 1000) + ' s)');
  if (!bien) { malas.push(nombre); console.log('   ' + (fallas.length ? fallas : texto.trim().split('\n').slice(-6)).join('\n   ')); }
});
console.log(malas.length ? '\n' + malas.length + ' prueba(s) con fallas: ' + malas.join(', ') : '\nTodas las pruebas bien.');
process.exit(malas.length ? 1 : 0);
