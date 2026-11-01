// Playwright para las pruebas, en cualquier equipo: la nube tiene su Chromium; en la PC de Brian se usa el Chrome instalado.
const fs = require('fs');
const lugares = ['/opt/node22/lib/node_modules/playwright', 'C:/Users/bresm/medir_gpu/node_modules/playwright', 'playwright'];
const pw = require(lugares.find(l => !l.includes('/') || fs.existsSync(l)));
if (!fs.existsSync(pw.chromium.executablePath())) {
  const lanzar = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = o => lanzar({ ...(o || {}), channel: 'chrome' });
}
module.exports = pw;
