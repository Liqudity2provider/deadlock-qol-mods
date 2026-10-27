// Match clock. Primary: read the mm:ss label the game draws in the top bar.
// Fallback: a local stopwatch started when the MatchStart takeover disappears, or by the 0:00 button.
var QolClock = (function () {
  var hud = null, clockLabel = null, lastText = "", lastSeconds = -1, labelPathStr = "";
  var manualStartAt = null, matchStartSeen = false, matchStartGone = false;
  var TIME_RE = /^\s*(\d{1,3}):(\d{2})\s*$/;

  function hudPanel() {
    if (hud && hud.IsValid()) return hud;
    var p = $.GetContextPanel();
    while (p && p.IsValid() && p.GetParent()) p = p.GetParent();
    hud = p ? p.FindChildTraverse("Hud") : null;
    return hud;
  }

  function findClockLabel(root) {
    // breadth-first over the top bar first (cheap), then the whole hud (one-off)
    var queue = [root], seen = 0;
    while (queue.length && seen < 4000) {
      var p = queue.shift(); seen++;
      if (!p || !p.IsValid()) continue;
      if (p.paneltype === "Label") {
        var t = p.text;
        if (typeof t === "string" && TIME_RE.test(t)) return p;
      }
      var kids = p.Children ? p.Children() : [];
      for (var i = 0; i < kids.length; i++) queue.push(kids[i]);
    }
    return null;
  }

  function parse(text) {
    var m = TIME_RE.exec(text || "");
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : -1;
  }

  function poll() {
    var h = hudPanel();
    if (h) {
      if (!clockLabel || !clockLabel.IsValid()) {
        // only trust a mm:ss label inside the top bar: other HUD labels (respawn timers, hideout clocks) also look like mm:ss
        var top = h.FindChildTraverse("TopBar");
        clockLabel = top ? findClockLabel(top) : null;
        if (clockLabel) { var q = clockLabel, parts = []; while (q && q !== top && parts.length < 6) { parts.unshift(q.id || q.paneltype); q = q.GetParent(); } labelPathStr = parts.join("/"); }
      }
      if (clockLabel) {
        var t = clockLabel.text;
        if (t !== lastText) { lastText = t; var s = parse(t); if (s >= 0) lastSeconds = s; }
      }
      // (auto-start from the MatchStart takeover removed: it fired in the main menu. Manual 0:00 button remains.)
    }
    $.Schedule(0.25, poll);
  }

  function now() {
    if (lastSeconds >= 0) return lastSeconds;
    if (manualStartAt !== null) return Math.floor((Date.now() - manualStartAt) / 1000);
    return -1;
  }

  function manualStart() { manualStartAt = Date.now(); lastSeconds = -1; clockLabel = null; }
  function source() { return lastSeconds >= 0 ? "hud" : manualStartAt !== null ? "manual" : "none"; }
  function labelText() { return clockLabel && clockLabel.IsValid() ? clockLabel.text : ""; }

  $.Schedule(1.0, poll);
  return { now: now, manualStart: manualStart, source: source, labelText: labelText, labelPath: function () { return labelPathStr; } };
})();
