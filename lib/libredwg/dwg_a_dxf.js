// v44: dwgADxf vive aquí para que lo use el Worker del lector (lector.js) y las pruebas; antes estaba en index.html, igual.
// v41: lo que LibreDWG lee de un DWG (su "DwgDatabase") pasado a DXF de texto, para que entre por leerDXF con todo lo que
// ya sabe (capas, colores, bloques, atributos, unidades, cotas, sombreados). Solo el espacio modelo; los números van enteros.
export function dwgADxf(db) {
  const L = [], g = (c, v) => L.push(c, v == null ? "" : String(v).replace(/\r?\n/g, " "));
  const gr = r => (r || 0) * 180 / Math.PI, P = (c, q) => { q = q || {}; g(c, q.x || 0); g(c + 10, q.y || 0); if (q.z) g(c + 20, q.z); };
  const tabla = n => (db.tables && db.tables[n] && db.tables[n].entries) || [];
  const comun = e => { g(8, e.layer || "0"); if (e.colorIndex != null && e.colorIndex !== 256) g(62, e.colorIndex); if (e.lineType) g(6, e.lineType);
    const N = e.extrusionDirection; if (N && (N.x || N.y || N.z) && !(Math.abs(N.x) < 1e-12 && Math.abs(N.y) < 1e-12 && N.z > 0)) { g(210, N.x); g(220, N.y); g(230, N.z); } };
  const texto = (T, e, t) => { g(0, T); comun(e); P(10, t.startPoint); g(40, t.textHeight); g(1, t.text); if (t.rotation) g(50, gr(t.rotation));
    g(72, t.halign || 0); P(11, t.endPoint && (t.endPoint.x || t.endPoint.y) ? t.endPoint : t.startPoint); g(73, t.valign || 0); };
  const ent = e => {
    const T = e.type;
    if (T === "LINE") { g(0, T); comun(e); P(10, e.startPoint); P(11, e.endPoint); }
    else if (T === "POINT") { g(0, T); comun(e); P(10, e.position); }
    else if (T === "CIRCLE") { g(0, T); comun(e); P(10, e.center); g(40, e.radius); }
    else if (T === "ARC") { g(0, T); comun(e); P(10, e.center); g(40, e.radius); g(50, gr(e.startAngle)); g(51, gr(e.endAngle)); }
    else if (T === "ELLIPSE") { g(0, T); comun(e); P(10, e.center); P(11, e.majorAxisEndPoint); g(40, e.axisRatio); g(41, e.startAngle); g(42, e.endAngle); }
    else if (T === "TEXT") texto(T, e, e);
    else if (T === "MTEXT") { g(0, T); comun(e); P(10, e.insertionPoint); g(40, e.textHeight); g(71, e.attachmentPoint || 1); g(1, e.text); if (e.direction) P(11, e.direction); }
    else if (T === "LWPOLYLINE") { g(0, T); comun(e); g(70, (e.flag || 0) & 1); if (e.elevation) g(38, e.elevation);
      (e.vertices || []).forEach(v => { g(10, v.x); g(20, v.y); if (v.bulge) g(42, v.bulge); }); }
    else if (T === "POLYLINE2D" || T === "POLYLINE3D") { g(0, "POLYLINE"); comun(e); g(70, (e.flag || 0) | (T === "POLYLINE3D" ? 8 : 0));
      (e.vertices || []).forEach(v => { if (v.flag & 16) return; g(0, "VERTEX"); g(8, e.layer || "0"); P(10, T === "POLYLINE2D" && e.elevation ? { ...v, z: e.elevation } : v); if (v.bulge) g(42, v.bulge); }); g(0, "SEQEND"); }
    else if (T === "INSERT") { g(0, T); comun(e); g(2, e.name); P(10, e.insertionPoint); g(41, e.xScale == null ? 1 : e.xScale); g(42, e.yScale == null ? 1 : e.yScale);
      if (e.rotation) g(50, gr(e.rotation));
      (e.attribs || []).forEach(a => { texto("ATTRIB", a, a.text || {}); g(2, a.tag); g(70, a.flags || 0); });
      if ((e.attribs || []).length) g(0, "SEQEND"); }
    else if (T === "DIMENSION") { g(0, T); comun(e); g(2, e.name); }
    else if (T === "SOLID" || T === "3DFACE" || T === "TRACE") { g(0, T); comun(e); P(10, e.corner1); P(11, e.corner2); P(12, e.corner3); P(13, e.corner4 || e.corner3); }
    else if (T === "SPLINE") {   // v48: con sus nudos, pesos, puntos de control y de ajuste
      const nud = e.knots || [], cp = e.controlPoints || [], fp = e.fitPoints || [], w = e.weights || [];
      g(0, T); comun(e); g(70, e.flag || 0); g(71, e.degree || 3); g(72, nud.length); g(73, cp.length); g(74, fp.length);
      nud.forEach(k => g(40, k)); if (w.length === cp.length) w.forEach(k => g(41, k));
      cp.forEach(q => P(10, q)); fp.forEach(q => P(11, q)); }
    else if (T === "MLINE") {   // v48: vértices con su inglete y el corrimiento de cada línea
      const vs = e.vertices || [], nL = e.numberOfLines || 0;
      g(0, T); comun(e); g(71, e.flags || 0); g(72, vs.length); g(73, nL); P(10, e.startPoint);
      vs.forEach(v => { P(11, v.vertex); P(12, v.vertexDirection); P(13, v.miterDirection);
        for (let l = 0; l < nL; l++) { const ln = (v.lines || [])[l] || {}, sp = ln.segmentParams || [], fp = ln.areaFillParams || [];
          g(74, sp.length); sp.forEach(x => g(41, x)); g(75, fp.length); fp.forEach(x => g(42, x)); } }); }
    else if (T === "ACAD_TABLE") {   // v48: la tabla ya viene dibujada en su bloque (*T…): se pasa el nombre de ese bloque
      // LibreDWG a veces no trae el enlace al bloque: entonces, si hay tantos bloques *T como tablas, se emparejan en orden
      const tT = tabla("BLOCK_RECORD").filter(x => /^\*T/i.test(x.name)), todas = (db.entities || []).filter(x => x.type === "ACAD_TABLE");
      const b = tabla("BLOCK_RECORD").find(x => e.blockRecordHandle && x.handle === e.blockRecordHandle) || (tT.length === todas.length ? tT[todas.indexOf(e)] : null);
      g(0, T); comun(e); if (b) g(2, b.name); P(10, e.startPoint); }
    else if (T === "VIEWPORT") {   // v48: ventana de una presentación: dónde está en el papel y qué parte del modelo muestra
      g(0, T); comun(e); P(10, e.viewportCenter); g(40, e.width); g(41, e.height); g(68, e.status == null ? 1 : e.status); g(69, e.viewportId);
      P(12, e.displayCenter); P(16, e.viewDirection); P(17, e.targetPoint); g(45, e.viewHeight); if (e.viewTwistAngle) g(51, gr(e.viewTwistAngle)); }
    else if (T === "LEADER") { g(0, T); comun(e); (e.vertices || []).forEach(v => { g(10, v.x); g(20, v.y); }); }
    else if (T === "MULTILEADER") {   // se pasa ya partida: sus líneas y su texto
      (e.leaderSections || []).forEach(sec => (sec.leaderLines || []).forEach(l => {
        const v = (l.vertices || []).concat(sec.lastLeaderLinePoint ? [sec.lastLeaderLinePoint] : []);
        if (v.length >= 2) { g(0, "LWPOLYLINE"); comun(e); g(70, 0); v.forEach(q => { g(10, q.x); g(20, q.y); }); } }));
      if (e.textContent) { g(0, "MTEXT"); comun(e); P(10, e.textAnchor || e.contentBasePosition); g(40, e.textHeight); g(71, e.textAttachmentPoint || 1); g(1, e.textContent); if (e.textDirection) P(11, e.textDirection); }
    }
    else if (T === "HATCH") { g(0, T); comun(e); g(2, e.patternName || ""); g(70, e.solidFill ? 1 : 0); const bp = e.boundaryPaths || []; g(91, bp.length);
      bp.forEach(b => { g(92, b.boundaryPathTypeFlag || 0);
        if (b.boundaryPathTypeFlag & 2) { g(72, b.hasBulge ? 1 : 0); g(73, b.isClosed ? 1 : 0); g(93, (b.vertices || []).length);
          (b.vertices || []).forEach(v => { g(10, v.x); g(20, v.y); if (b.hasBulge) g(42, v.bulge || 0); }); }
        else { g(93, (b.edges || []).length);
          (b.edges || []).forEach(d => { g(72, d.type);
            if (d.type === 1) { g(10, d.start.x); g(20, d.start.y); g(11, d.end.x); g(21, d.end.y); }
            else if (d.type === 2) { g(10, d.center.x); g(20, d.center.y); g(40, d.radius); g(50, gr(d.startAngle)); g(51, gr(d.endAngle)); g(73, d.isCCW ? 1 : 0); }
            else if (d.type === 3) { g(10, d.center.x); g(20, d.center.y); g(11, d.end.x); g(21, d.end.y); g(40, d.lengthOfMinorAxis); g(50, gr(d.startAngle)); g(51, gr(d.endAngle)); g(73, d.isCCW ? 1 : 0); }
            else if (d.type === 4) { g(94, d.degree); g(95, (d.knots || []).length); g(96, (d.controlPoints || []).length); (d.knots || []).forEach(k => g(40, k)); (d.controlPoints || []).forEach(q => { g(10, q.x); g(20, q.y); }); } }); }
        g(97, 0); }); }
    else { g(0, T); comun(e); }   // lo demás se nombra para que la revisión diga qué no se trajo
  };
  g(0, "SECTION"); g(2, "HEADER"); g(9, "$INSUNITS"); g(70, (db.header && db.header.INSUNITS) || 0); g(0, "ENDSEC");
  // v48: la lista de clases: así la revisión puede decir qué objetos de Civil 3D u otros programas trae y no se pueden leer
  g(0, "SECTION"); g(2, "CLASSES");
  (db.classes || []).forEach(c => { if (!c.isAnEntityFlag || !(c.instanceCount > 0)) return;
    g(0, "CLASS"); g(1, c.dxfName); g(2, c.cppName); g(3, c.appName); g(90, c.capabilitiesFlag || 0); g(91, c.instanceCount); g(280, 0); g(281, 1); });
  g(0, "ENDSEC");
  g(0, "SECTION"); g(2, "TABLES");
  tabla("LAYER").forEach(c => { g(0, "LAYER"); g(2, c.name); g(70, c.frozen ? 1 : 0); g(62, (c.off ? -1 : 1) * (c.colorIndex || 7)); if (c.lineType) g(6, c.lineType); });
  // v48: los registros de bloque de las presentaciones (número → nombre), para unir cada presentación con su bloque *Paper_Space…
  const papeles = tabla("BLOCK_RECORD").filter(b => /^\*paper_space/i.test(b.name));
  papeles.forEach(b => { g(0, "BLOCK_RECORD"); g(5, b.handle); g(2, b.name); });
  g(0, "ENDSEC");
  g(0, "SECTION"); g(2, "BLOCKS");
  tabla("BLOCK_RECORD").forEach(b => { if (/^\*(model|paper)_space/i.test(b.name)) return;
    g(0, "BLOCK"); g(2, b.name); P(10, b.basePoint); (b.entities || []).forEach(ent); g(0, "ENDBLK"); });
  // v48: lo de cada presentación (sus objetos de papel y sus ventanas), como el bloque *Paper_Space… de su registro
  papeles.forEach(b => { g(0, "BLOCK"); g(2, b.name); g(10, 0); g(20, 0);
    (db.entities || []).forEach(e => { if (e.ownerBlockRecordSoftId === b.handle) ent(e); }); g(0, "ENDBLK"); });
  g(0, "ENDSEC");
  const ms = tabla("BLOCK_RECORD").find(b => /^\*model_space$/i.test(b.name));
  g(0, "SECTION"); g(2, "ENTITIES");
  (db.entities || []).forEach(e => { if (!ms || e.ownerBlockRecordSoftId === ms.handle) ent(e); });
  g(0, "ENDSEC");
  // v48: las presentaciones (nombre, orden de la pestaña y el registro de su bloque)
  g(0, "SECTION"); g(2, "OBJECTS");
  ((db.objects && db.objects.LAYOUT) || []).forEach(l => { if (!papeles.some(b => b.handle === l.paperSpaceTableId)) return;
    g(0, "LAYOUT"); g(5, l.handle); g(1, l.layoutName); g(71, l.tabOrder || 0);
    if (l.minLimit && l.maxLimit) { g(10, l.minLimit.x); g(20, l.minLimit.y); g(11, l.maxLimit.x); g(21, l.maxLimit.y); }   // v58: la hoja de papel
    g(330, l.paperSpaceTableId); });   // 330 = su bloque, como en el DXF de AutoCAD
  g(0, "ENDSEC"); g(0, "EOF");
  return L.join("\n");
}
