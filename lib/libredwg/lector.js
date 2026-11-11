// v44: lector de DWG en un Worker. Recibe el archivo (sin copiarlo), lo lee con LibreDWG y lo devuelve como parejas de DXF.
// index.html cierra el Worker al terminar: así se libera de golpe toda la memoria que deja el wasm.
// v69: el paso de lo leído a parejas va por el camino corto (rapido.js) y sale en arreglos de números que viajan sin copiarse
// (antes, 60 MB de texto). Si el camino corto falla, se usa el de la librería, como siempre. El DWG se suelta apenas se pasa.
import { LibreDwg, Dwg_File_Type } from "./dist/libredwg-web.js";
import { dwgADxf } from "./dwg_a_dxf.js";
self.onmessage = async e => {
  let dwg = null, lib = null;
  try {
    const t0 = performance.now();
    lib = await LibreDwg.create(new URL("./wasm", import.meta.url).href);
    dwg = lib.dwg_read_data(e.data, Dwg_File_Type.DWG);
    if (!dwg) throw new Error("el archivo no parece un DWG o está dañado");
    const t1 = performance.now(); let db, rapido = true;
    try { db = (await import("./rapido.js")).convertirRapido(lib, dwg); } catch (err) { rapido = false; console.warn("Mini Civil · lector rápido: " + (err && err.message || err) + "; se usa el de siempre"); db = lib.convert(dwg); }
    lib.dwg_free(dwg); dwg = null;
    const p = dwgADxf(db, true); db = null;
    self.postMessage({ pares: p, ms: { leer: t1 - t0, pasar: performance.now() - t1, rapido } }, [p.cod.buffer, p.val.buffer]);
  } catch (err) {
    self.postMessage({ error: String(err && err.message || err) });
  } finally { try { if (dwg) lib.dwg_free(dwg); } catch (_) {} }
};
