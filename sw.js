// Mini Civil: funciona sin internet.
// Al publicar una versión nueva, cambiar CACHE_VERSION (y TV_VERSION en index.html).
const CACHE_VERSION = "minicivil-v48";
// v44: cada archivo del lector se agrega solo si falta (los equipos con la v43 no vuelven a bajar los 11 MB del wasm).
// v43: el lector de DWG (LibreDWG, ~11 MB) va en su propio espacio: se baja una sola vez al instalar y no se vuelve a bajar
// en cada versión de la app; solo si cambia CACHE_LIB (al cambiar de versión de la librería)
const CACHE_LIB = "minicivil-libredwg-0.8.2";
const LIB = ["./lib/libredwg/dist/libredwg-web.js", "./lib/libredwg/wasm/libredwg-web.js", "./lib/libredwg/wasm/libredwg-web.wasm"];
// v48: el lector (lector.js) y el paso a DXF (dwg_a_dxf.js) son de la app y cambian con ella: van con cada versión, no con la librería
const ARCHIVOS = ["./", "./index.html", "./lib/libredwg/lector.js", "./lib/libredwg/dwg_a_dxf.js", "./manifest.json", "./icon-mc-192.png", "./icon-mc-512.png", "./icon-mc-maskable.png", "./apple-touch-icon.png", "./favicon.png"];

self.addEventListener("install", e => {
  // si el lector de DWG no alcanza a bajar (sin señal), la app se instala igual y lo baja la primera vez que se abra un DWG
  const lib = caches.open(CACHE_LIB).then(c => Promise.all(LIB.map(u => c.match(u).then(m => m ? null : c.add(u))))).catch(() => null);
  e.waitUntil(Promise.all([caches.open(CACHE_VERSION).then(c => c.addAll(ARCHIVOS.map(a => new Request(a, { cache: "reload" })))), lib]).then(() => self.skipWaiting()));
});

// Solo borra sus propias copias viejas: TopoVías vive en la misma dirección (bresmojce-stack.github.io)
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("minicivil-") && k !== CACHE_VERSION && k !== CACHE_LIB).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// La app (index.html): primero la red, para tener siempre la última versión; si no hay señal
// o tarda más de 4 s, se abre la guardada. Lo demás (íconos): primero lo guardado.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // la app y su manifest (nombre e ícono) se piden primero a la red
  const navegar = e.request.mode === "navigate" || /manifest\.json$/.test(new URL(e.request.url).pathname);
  const deLib = /\/lib\/libredwg\/(dist|wasm)\//.test(new URL(e.request.url).pathname);
  e.respondWith(caches.open(deLib ? CACHE_LIB : CACHE_VERSION).then(async cache => {
    const clave = e.request.mode === "navigate" ? "./index.html" : e.request;
    const guardado = await cache.match(clave, { ignoreSearch: e.request.mode === "navigate" });
    const red = fetch(e.request, navegar ? { cache: "no-cache" } : undefined).then(r => {
      if (r && r.ok) cache.put(clave, r.clone());
      return r;
    }).catch(() => null);
    if (navegar && guardado) {
      const espera = new Promise(res => setTimeout(() => res(null), 4000));
      const r = await Promise.race([red, espera]);
      if (r && r.ok) return r;
      e.waitUntil(red);
      return guardado;
    }
    if (guardado) { e.waitUntil(red); return guardado; }
    return (await red) || new Response("Sin conexión", { status: 503 });
  }));
});
