// Box routes over the minimap. Data: routes_data.js (generated from the map's entities, tools/gen_routes.py).
// Placement: the minimap image spans the citadel_minimap_boundary square; on screen we take the minimap panel's
// rect from Panorama and apply a per-build calibration (measured in-game: see README).
var QolRoutes = (function () {
  var D = QolRoutesData;
  var idx = -1, enabled = true, dotSize = 9, showNumbers = true, showBuffs = false, showLine = true;
  // calibration: map-image square relative to the measured minimap panel rect (fractions of panel size)
  var CAL = { dx: 0, dy: 0, scale: 1.0 };
  var dots = [];

  function find(id) { return QolFind(id); }

  function absRect(p) {
    if (!p || !p.IsValid()) return null;
    var w = p.actuallayoutwidth || 0, h = p.actuallayoutheight || 0;
    var x = 0, y = 0;
    if (p.GetPositionWithinWindow) { var pos = p.GetPositionWithinWindow(); x = pos.x; y = pos.y; }
    else { var q = p; while (q && q.IsValid() && q.GetParent()) { x += q.actualxoffset || 0; y += q.actualyoffset || 0; q = q.GetParent(); } }
    return { x: x, y: y, w: w, h: h };
  }

  function minimapRect() {
    // Measured in-game (build 6821): the map image is the hud_minimap panel (378x378 at 1080p), centred in
    // minimap_container. hud_minimap carries a transform, so its own GetPositionWithinWindow is not its top-left;
    // the container's position is reliable, so we centre the image square inside it.
    var hud = find("Hud"); if (!hud) return null;
    var img = find("hud_minimap"), box = absRect(find("minimap_container"));
    if (!img || !box || box.w < 40 || !(box.x === box.x)) return null;   // NaN check: hidden minimap
    var w = img.actuallayoutwidth || box.w, h = img.actuallayoutheight || box.h;
    return { id: "minimap_container", x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w: w, h: h };
  }

  function southTeam() {
    // routes are stored for the team whose base is at the bottom of the unrotated minimap. Deadlock rotates the minimap
    // so your base is always at the bottom, which makes stored coordinates valid for both teams.
    return true;
  }

  function clear() { dots.forEach(function (d) { if (d && d.IsValid()) d.DeleteAsync(0); }); dots = []; }

  function dot(parent, x, y, size, color, border) {
    var d = $.CreatePanel("Panel", parent, ""); d.hittest = false;
    d.style.position = Math.round(x - size / 2) + "px " + Math.round(y - size / 2) + "px 0px";
    d.style.width = size + "px"; d.style.height = size + "px"; d.style.borderRadius = (size / 2) + "px";
    d.style.backgroundColor = color; d.style.border = (border || 1) + "px solid #000000cc";
    dots.push(d); return d;
  }
  function label(parent, x, y, text, color, size) {
    var n = $.CreatePanel("Label", parent, ""); n.hittest = false; n.text = text;
    n.style.position = Math.round(x) + "px " + Math.round(y) + "px 0px";
    n.style.fontSize = (size || 10) + "px"; n.style.color = color || "#ffffff"; n.style.fontWeight = "bold";
    n.style.textShadow = "1px 1px 1px 1.0 #000000"; dots.push(n); return n;
  }

  function draw() {
    var overlay = find("QolRoutes"), btn = find("QolRoutesLabel");
    if (!overlay) return;
    clear();
    if (idx < 0 || !enabled) { overlay.style.visibility = "collapse"; if (btn) btn.text = "routes: off"; return; }
    var rect = minimapRect();
    if (!rect) { if (btn) btn.text = "routes: no map"; overlay.style.visibility = "collapse"; return; }
    var scale = overlay.actualuiscale_x || 1;
    var side = rect.w * CAL.scale;
    var ox = (rect.x + rect.w * CAL.dx) / scale, oy = (rect.y + rect.h * CAL.dy) / scale, S = side / scale;
    overlay.style.visibility = "visible";
    overlay.style.position = Math.round(ox) + "px " + Math.round(oy) + "px 0px";
    overlay.style.width = Math.round(S) + "px"; overlay.style.height = Math.round(S) + "px";
    var r = D.routes[idx];
    if (btn) btn.text = "routes: " + r.id;
    var title = find("QolRoutesTitle"); if (title) { title.text = r.name; title.style.color = r.color; }
    if (showBuffs) D.buffs.forEach(function (b) { dot(overlay, b[0] * S, b[1] * S, 4, "#c084fccc", 0); });
    if (showLine) {
      for (var i = 0; i + 1 < r.pts.length; i++) {
        var a = r.pts[i], b = r.pts[i + 1];
        var steps = Math.max(2, Math.round(Math.hypot((b[0] - a[0]) * S, (b[1] - a[1]) * S) / 6));
        for (var k = 1; k < steps; k++) { var t = k / steps; dot(overlay, (a[0] + (b[0] - a[0]) * t) * S, (a[1] + (b[1] - a[1]) * t) * S, 2, r.color + "aa", 0); }
      }
    }
    r.pts.forEach(function (p, i) {
      var sz = dotSize + Math.min(6, p[2] - 4);
      dot(overlay, p[0] * S, p[1] * S, sz, r.color, 1);
      if (showNumbers) label(overlay, p[0] * S + sz / 2, p[1] * S - 8, String(i + 1), "#ffffff", 10);
    });
    if (typeof QolDebug !== "undefined" && QolDebug.on) QolDebug.log("minimap " + rect.id + " x=" + Math.round(rect.x) + " y=" + Math.round(rect.y) + " w=" + Math.round(rect.w) + " h=" + Math.round(rect.h) + " uiscale=" + scale);
  }

  function cycle() { idx = idx + 1 >= D.routes.length ? -1 : idx + 1; QolSettings.set("routes", "lastRoute", idx); draw(); }
  function tick() { if (idx >= 0) draw(); $.Schedule(1.5, tick); }   // minimap moves when shop / scoreboard open

  QolRegistry.register({
    id: "routes", name: "Box routes", description: "crate clusters from the real map, numbered in pickup order",
    settings: [
      { key: "dotSize", label: "dot size", type: "number", def: 9, min: 5, max: 16, step: 1 },
      { key: "numbers", label: "show numbers", type: "bool", def: true },
      { key: "line", label: "draw path", type: "bool", def: true },
      { key: "buffs", label: "show buff containers", type: "bool", def: false },
      { key: "calScale", label: "calibration: size %", type: "number", def: 100, min: 80, max: 140, step: 1 },
      { key: "calX", label: "calibration: x %", type: "number", def: 0, min: -30, max: 30, step: 1 },
      { key: "calY", label: "calibration: y %", type: "number", def: 0, min: -30, max: 30, step: 1 },
    ],
    onChange: function (k, v) {
      if (k === "dotSize") dotSize = v; if (k === "numbers") showNumbers = v; if (k === "line") showLine = v; if (k === "buffs") showBuffs = v;
      if (k === "calScale") CAL.scale = v / 100; if (k === "calX") CAL.dx = v / 100; if (k === "calY") CAL.dy = v / 100;
      draw();
    },
    setEnabled: function (on) { enabled = on; draw(); },
  });
  $.Schedule(2.0, tick);
  return { cycle: cycle, draw: draw, rect: minimapRect };
})();
