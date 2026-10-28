// Timings: "what happens in the next N seconds" strip + a short list, plus manual marks (camp cleared, mid killed...).
var QolTimings = (function () {
  var cfg = { lookahead: 15, rows: 5, waves: true, position: "top" };
  var marks = [], midDeaths = 0, enabled = true;

  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function panel(id) { return QolFind(id); }
  function setText(l, s) { if (l.text !== s) l.text = s; }   // unchanged text: no relayout

  function upcoming(t) {
    var out = [];
    QolSchedule.FIXED.forEach(function (e) {
      e.at.forEach(function (a) { if (a > t) out.push({ name: e.name, at: a, note: e.note }); });
      if (e.period) { var first = e.at[0]; if (t >= first) { var k = Math.floor((t - first) / e.period) + 1; out.push({ name: e.name, at: first + k * e.period, note: e.note }); } }
    });
    if (cfg.waves) out.push({ name: "Wave", at: QolSchedule.nextWave(t), minor: true });
    marks.forEach(function (m) { if (m.at > t) out.push({ name: m.name, at: m.at, marked: true }); });
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  }

  function render() {
    if (!enabled) { $.Schedule(0.5, render); return; }
    var t = QolClock.now(), next = panel("QolNextLabel");
    if (!next) { $.Schedule(0.5, render); return; }
    if (t < 0) {
      setText(next, "timers: waiting for match clock (press 0:00 at the horn)");
      for (var j = 1; j <= 5; j++) { var l = panel("QolList" + j); if (l) setText(l, ""); }
      $.Schedule(0.5, render); return;
    }
    var up = upcoming(t);
    var soon = up.filter(function (e) { return e.at - t <= cfg.lookahead && !e.minor; });
    var wave = up.filter(function (e) { return e.minor; })[0];
    var parts = soon.map(function (e) { return e.name + " " + fmt(e.at - t); });
    if (wave && wave.at - t <= 5) parts.push("wave " + fmt(wave.at - t));
    setText(next, parts.length ? "NEXT  " + parts.join("   ·   ") : "[" + fmt(t) + "]  nothing in " + cfg.lookahead + "s");
    next.style.color = soon.length && soon[0].at - t <= 3 ? "#f0a132" : "#efe9e3";
    var rest = up.filter(function (e) { return !e.minor; }).slice(0, cfg.rows);
    for (var i = 1; i <= 5; i++) {
      var lab = panel("QolList" + i); if (!lab) continue;
      var e = rest[i - 1];
      setText(lab, e ? (e.marked ? "• " : "  ") + e.name + "  " + fmt(e.at - t) + (e.note ? "  (" + e.note + ")" : "") : "");
    }
    $.Schedule(0.25, render);
  }

  function mark(kind) {
    var t = QolClock.now(); if (t < 0) return;
    var m = QolSchedule.MARKED[kind]; if (!m) return;
    if (kind === "midboss") midDeaths++;
    marks = marks.filter(function (x) { return x.kind !== kind; });
    marks.push({ kind: kind, name: m.name, at: t + m.delay(midDeaths) });
  }

  function applyPosition() {
    var p = panel("QolTimings"); if (!p) return;
    if (cfg.position === "top") { p.style.horizontalAlign = "center"; p.style.marginTop = "150px"; p.style.marginLeft = "0px"; }
    else if (cfg.position === "left") { p.style.horizontalAlign = "left"; p.style.marginTop = "260px"; p.style.marginLeft = "12px"; }
    else { p.style.horizontalAlign = "center"; p.style.marginTop = "420px"; p.style.marginLeft = "0px"; }
  }

  QolRegistry.register({
    id: "timings", name: "Timings", description: "upcoming objectives & respawns",
    settings: [
      { key: "lookahead", label: "lookahead (s)", type: "number", def: 15, min: 5, max: 60, step: 5 },
      { key: "rows", label: "list rows", type: "number", def: 5, min: 0, max: 5, step: 1 },
      { key: "waves", label: "show creep waves", type: "bool", def: true },
      { key: "position", label: "position", type: "enum", def: "top", options: ["top", "left", "under crosshair"] },
    ],
    onChange: function (k, v) { if (k === "position") { cfg.position = v === "under crosshair" ? "center" : v; applyPosition(); } else cfg[k] = v; },
    setEnabled: function (on) { enabled = on; var p = panel("QolTimings"); if (p) p.style.visibility = on ? "visible" : "collapse"; },
  });
  $.Schedule(1.5, render);
  return { mark: mark };
})();
