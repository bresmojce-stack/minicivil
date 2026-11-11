// v69: el DWG ya leído por LibreDWG, pasado a la base que usa dwg_a_dxf.js, por un camino corto. `lib.convert` (el de la librería)
// pide cada dato de cada objeto uno por uno, también los que Mini Civil no usa (datos extendidos, grosor, miniaturas, el contenido
// de los objetos OLE en hexadecimal): con un plano de 120 000 objetos tardaba 8 s y dejaba 1 GB en memoria. Aquí lo común de cada
// objeto se reduce a lo que se usa (capa, color, tipo de línea, dueño) y las líneas y polilíneas, que son casi todo el plano, se
// leen directo de la memoria del lector (el sitio de cada campo se pregunta una vez). Lo demás sigue por la librería, igual.
// Los tres primeros objetos de cada tipo rápido se comparan con lo que da la librería: si algo no coincide se lanza un error y
// lector.js vuelve al camino de siempre.
import { LibreDwgConverter, LibreEntityConverter, dwgCodePageToEncoding } from "./dist/libredwg-web.js";
const hex = n => n.toString(16).toUpperCase();
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
class EntidadesRapidas extends LibreEntityConverter {
  constructor(lib) { super(lib); this.W = lib.wasmInstance; this.sitio = {}; this.vistos = { l: 0, pl: 0 }; }
  getCommonAttrs(entity) {
    // el dueño solo hace falta en los atributos de un bloque: a lo demás se lo pone la librería al recorrer cada bloque
    const L = this.libredwg;
    return { handle: hex(L.dwg_object_entity_get_handle_object(entity).value),
      ownerBlockRecordSoftId: this.enBloque ? hex(L.dwg_object_entity_get_ownerhandle_object(entity).absolute_ref) : "",
      layer: this.getLayerName(entity), colorIndex: L.dwg_object_entity_get_color_object(entity).index, lineType: this.getLtypeName(entity) };
  }
  punto(p) { const a = this.W.dwg_ptr_to_double_array(p, 3); return { x: a[0], y: a[1], z: a[2] }; }
  dato(e, campo) { return this.W.dwg_dynapi_entity_value(e, campo).data; }
  convertLine(e, comun) {
    const W = this.W, s = this.sitio.l || (this.sitio.l = { a: W.dwg_dynapi_entity_field_offset(e, "start"), b: W.dwg_dynapi_entity_field_offset(e, "end"), x: W.dwg_dynapi_entity_field_offset(e, "extrusion") });
    const r = { type: "LINE", ...comun, startPoint: this.punto(e + s.a), endPoint: this.punto(e + s.b), extrusionDirection: this.punto(e + s.x) };
    if (this.vistos.l++ < 3) { const v = super.convertLine(e, comun);
      if (!igual([r.startPoint, r.endPoint, r.extrusionDirection], [v.startPoint, v.endPoint, v.extrusionDirection])) throw new Error("lector rápido: una línea no coincide"); }
    return r;
  }
  convertLWPolyline(e, comun) {
    const W = this.W, c = n => W.dwg_dynapi_entity_field_offset(e, n);
    const s = this.sitio.pl || (this.sitio.pl = { n: c("num_points"), p: c("points"), nb: c("num_bulges"), b: c("bulges"), x: c("extrusion") });
    const u = p => W.dwg_ptr_to_uint32_t_array(e + p, 1)[0];
    const n = u(s.n), pp = u(s.p), nb = u(s.nb), pb = u(s.b);
    const xy = n && pp ? W.dwg_ptr_to_double_array(pp, 2 * n) : [], bul = nb && pb ? W.dwg_ptr_to_double_array(pb, nb) : [];
    const vertices = new Array(n);
    for (let i = 0; i < n; i++) vertices[i] = { x: xy[2 * i], y: xy[2 * i + 1], bulge: i < bul.length ? bul[i] : 0 };
    const r = { type: "LWPOLYLINE", ...comun, flag: this.dato(e, "flag"), elevation: this.dato(e, "elevation"), extrusionDirection: this.punto(e + s.x), vertices };
    if (this.vistos.pl++ < 3) { const v = super.convertLWPolyline(e, comun), q = o => o.vertices.map(p => [p.x, p.y, p.bulge]);
      if (!igual([r.flag, r.elevation, r.extrusionDirection, q(r)], [v.flag, v.elevation, v.extrusionDirection, q(v)])) throw new Error("lector rápido: una polilínea no coincide"); }
    return r;
  }
  convertInsert(e, comun) { this.enBloque = true; try { return super.convertInsert(e, comun); } finally { this.enBloque = false; } }
  convertOle2Frame(e, comun) { return { type: "OLE2FRAME", ...comun }; }   // no se dibuja: solo se cuenta
}
class BaseRapida extends LibreDwgConverter { constructor(lib) { super(lib); this.entityConverter = new EntidadesRapidas(lib); } }
export function convertirRapido(lib, data) {
  lib.decoder = new TextDecoder(dwgCodePageToEncoding(lib.dwg_get_codepage(data)));   // lo mismo que hace lib.convert antes de empezar
  const L = Object.create(lib); L.dwg_entity_block_header_get_preview = () => null; L.dwg_bmp = () => null;   // sin miniaturas
  return new BaseRapida(L).convert(data);
}
