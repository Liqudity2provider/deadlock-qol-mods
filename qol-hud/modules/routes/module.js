// Box routes drawn over the minimap as numbered dots. Coordinates are minimap-relative (0..1, x right, y down).
// These are PLACEHOLDERS until calibrated in-game (see README: calibration mode prints the minimap rect to console).
var QolRoutes = (function () {
  var ROUTES = [
    { id: "left",  name: "Left lane boxes",  color: "#4fd1c5", pts: [[0.16, 0.78], [0.14, 0.66], [0.20, 0.58], [0.15, 0.48], [0.22, 0.40]] },
    { id: "mid",   name: "Mid boxes",        color: "#f0a132", pts: [[0.50, 0.80], [0.46, 0.68], [0.54, 0.60], [0.48, 0.50], [0.53, 0.42]] },
    { id: "right", name: "Right lane boxes", color: "#f06a5a", pts: [[0.84, 0.78], [0.86, 0.66], [0.80, 0.58], [0.85, 0.48], [0.78, 0.40]] },
  ];
  var idx = -1;            // -1 = off
  var dots = [], enabled = true, dotSize = 10, showNumbers = true;

  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function hud() { var r = root(); return r ? r.FindChildTraverse("Hud") : null; }

  // absolute rect of the minimap panel, by summing layout offsets up the tree
  function minimapRect() {
    var h = hud(); if (!h) return null;
    var mm = h.FindChildTraverse("hud_minimap") || h.FindChildTraverse("minimap_container");
    if (!mm || !mm.IsValid()) return null;
    var x = 0, y = 0, p = mm;
    while (p && p.IsValid() && p.GetParent()) { x += p.actualxoffset || 0; y += p.actualyoffset || 0; p = p.GetParent(); }
    var scale = mm.actuallayoutwidth && mm.actualuiscale_x ? mm.actualuiscale_x : 1;
    return { x: x / scale, y: y / scale, w: (mm.actuallayoutwidth || 0) / scale, h: (mm.actuallayoutheight || 0) / scale };
  }

  function clear() { dots.forEach(function (d) { if (d && d.IsValid()) d.DeleteAsync(0); }); dots = []; }

  function draw() {
    var overlay = root() ? root().FindChildTraverse("QolRoutes") : null;
    var label = root() ? root().FindChildTraverse("QolRoutesLabel") : null;
    if (!overlay) return;
    clear();
    if (idx < 0 || !enabled) { overlay.style.visibility = "collapse"; if (label) label.text = "routes: off"; return; }
    var rect = minimapRect();
    if (!rect || rect.w < 10) { if (label) label.text = "routes: no minimap"; $.Schedule(1.0, draw); return; }
    var r = ROUTES[idx];
    overlay.style.visibility = "visible";
    overlay.style.position = Math.round(rect.x) + "px " + Math.round(rect.y) + "px 0px";
    overlay.style.width = Math.round(rect.w) + "px"; overlay.style.height = Math.round(rect.h) + "px";
    var title = overlay.FindChildTraverse("QolRoutesTitle"); if (title) { title.text = r.name; title.style.color = r.color; }
    if (label) label.text = "routes: " + r.id;
    r.pts.forEach(function (pt, i) {
      var d = $.CreatePanel("Panel", overlay, "QolDot" + i);
      d.hittest = false;
      d.style.position = Math.round(pt[0] * rect.w - dotSize / 2) + "px " + Math.round(pt[1] * rect.h - dotSize / 2) + "px 0px";
      d.style.width = dotSize + "px"; d.style.height = dotSize + "px"; d.style.borderRadius = (dotSize / 2) + "px";
      d.style.backgroundColor = r.color; d.style.border = "1px solid #000000";
      dots.push(d);
      if (!showNumbers) return;
      var n = $.CreatePanel("Label", overlay, "QolDotN" + i);
      n.hittest = false; n.text = String(i + 1);
      n.style.position = Math.round(pt[0] * rect.w + 6) + "px " + Math.round(pt[1] * rect.h - 8) + "px 0px";
      n.style.fontSize = "10px"; n.style.color = "#ffffff"; n.style.textShadow = "1px 1px 1px 1.0 #000000";
      dots.push(n);
    });
    // calibration help: print the minimap rect once per draw so coordinates can be tuned
    $.Msg("[QolRoutes] minimap rect x=" + rect.x + " y=" + rect.y + " w=" + rect.w + " h=" + rect.h);
  }

  function cycle() { idx = idx + 1 >= ROUTES.length ? -1 : idx + 1; QolSettings.set("routes", "lastRoute", idx); draw(); }
  QolRegistry.register({
    id: "routes", name: "Box routes", description: "numbered dots over the minimap",
    settings: [
      { key: "dotSize", label: "dot size", type: "number", def: 10, min: 6, max: 18, step: 2 },
      { key: "numbers", label: "show numbers", type: "bool", def: true },
      { key: "remember", label: "remember last route", type: "bool", def: true },
    ],
    onChange: function (k, v) { if (k === "dotSize") dotSize = v; if (k === "numbers") showNumbers = v; if (k === "remember" && v) { var r = QolSettings.get("routes", "lastRoute", -1); if (typeof r === "number") idx = r; } draw(); },
    setEnabled: function (on) { enabled = on; draw(); },
  });
  // redraw periodically: the minimap moves/scales when the shop or scoreboard opens
  function tick() { if (idx >= 0) draw(); $.Schedule(2.0, tick); }
  $.Schedule(2.0, tick);
  return { cycle: cycle, draw: draw, ROUTES: ROUTES };
})();
