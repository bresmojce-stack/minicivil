// v44: lector de DWG en un Worker. Recibe el archivo (sin copiarlo), lo lee con LibreDWG, lo pasa a DXF de texto y lo devuelve.
// index.html cierra el Worker al terminar: así se libera de golpe toda la memoria que deja el wasm.
import { LibreDwg, Dwg_File_Type } from "./dist/libredwg-web.js";
import { dwgADxf } from "./dwg_a_dxf.js";
self.onmessage = async e => {
  let dwg = null, lib = null;
  try {
    lib = await LibreDwg.create(new URL("./wasm", import.meta.url).href);
    dwg = lib.dwg_read_data(e.data, Dwg_File_Type.DWG);
    if (!dwg) throw new Error("el archivo no parece un DWG o está dañado");
    self.postMessage({ texto: dwgADxf(lib.convert(dwg)) });
  } catch (err) {
    self.postMessage({ error: String(err && err.message || err) });
  } finally { try { if (dwg) lib.dwg_free(dwg); } catch (_) {} }
};
