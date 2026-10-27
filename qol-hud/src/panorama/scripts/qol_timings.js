// Renders "next N seconds" strip + a short list of upcoming events, plus manual marks.
var QolTimings = (function () {
  var LOOKAHEAD = 15;        // seconds: what counts as "coming up"
  var LIST = 5;              // rows in the secondary list
  var marks = [];            // {name, at}
  var midDeaths = 0;
  var enabled = true;

  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }

  function upcoming(t) {
    var out = [];
    QolSchedule.FIXED.forEach(function (e) {
      e.at.forEach(function (a) {
        if (a > t) out.push({ name: e.name, at: a, note: e.note });
      });
      if (e.period) {
        var first = e.at[0];
        if (t >= first) { var k = Math.floor((t - first) / e.period) + 1; out.push({ name: e.name, at: first + k * e.period, note: e.note }); }
      }
    });
    out.push({ name: "Wave", at: QolSchedule.nextWave(t), minor: true });
    marks.forEach(function (m) { if (m.at > t) out.push({ name: m.name, at: m.at, marked: true }); });
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  }

  function panel(id) { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r ? r.FindChildTraverse(id) : null; }

  function render() {
    if (!enabled) { $.Schedule(0.5, render); return; }
    var t = QolClock.now();
    var next = panel("QolNextLabel");
    if (!next) { $.Schedule(0.5, render); return; }
    if (t < 0) {
      next.text = "timers: waiting for match clock (press 0:00 at horn)";
      for (var j = 1; j <= LIST; j++) { var l = panel("QolList" + j); if (l) l.text = ""; }
      $.Schedule(0.5, render); return;
    }
    var up = upcoming(t);
    var soon = up.filter(function (e) { return e.at - t <= LOOKAHEAD && !e.minor; });
    var wave = up.filter(function (e) { return e.minor; })[0];
    var parts = soon.map(function (e) { return e.name + " " + fmt(e.at - t); });
    if (wave && wave.at - t <= 5) parts.push("wave " + fmt(wave.at - t));
    next.text = parts.length ? "NEXT  " + parts.join("   ·   ") : "[" + fmt(t) + "]  nothing in " + LOOKAHEAD + "s";
    next.style.color = soon.length && soon[0].at - t <= 3 ? "#f0a132" : "#efe9e3";
    var rest = up.filter(function (e) { return !e.minor; }).slice(0, LIST);
    for (var i = 1; i <= LIST; i++) {
      var lab = panel("QolList" + i); if (!lab) continue;
      var e = rest[i - 1];
      lab.text = e ? (e.marked ? "• " : "  ") + e.name + "  " + fmt(e.at - t) + (e.note ? "  (" + e.note + ")" : "") : "";
    }
    $.Schedule(0.25, render);
  }

  function mark(kind) {
    var t = QolClock.now(); if (t < 0) return;
    var m = QolSchedule.MARKED[kind]; if (!m) return;
    if (kind === "midboss") midDeaths++;
    var delay = m.delay(midDeaths);
    // replace an existing mark of the same kind (re-cleared camp)
    marks = marks.filter(function (x) { return x.kind !== kind; });
    marks.push({ kind: kind, name: m.name, at: t + delay });
  }

  function setEnabled(v) { enabled = v; var p = panel("QolTimings"); if (p) p.style.visibility = v ? "visible" : "collapse"; }
  function setLookahead(s) { LOOKAHEAD = s; }

  $.Schedule(1.5, render);
  return { mark: mark, setEnabled: setEnabled, setLookahead: setLookahead, isEnabled: function () { return enabled; } };
})();
