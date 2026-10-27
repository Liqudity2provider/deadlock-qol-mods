// Parry timer. Deadlock parry: 1.0 s animation, melee is parried only during the first 0.75 s,
// a whiffed parry locks it for 4.5 s. Enemy heavy-melee wind-up is NOT visible to Panorama, so the
// module tracks YOUR parry: it watches the HUD modifier/status panels for a parry-related modifier
// and shows the active window + cooldown as a bar under the crosshair.
// Calibration: enable "log modifiers" in the menu, press parry, read the console, add the class/id to PATTERNS.
var QolParry = (function () {
  var ACTIVE = 0.75, TOTAL = 1.0, COOLDOWN = 4.5;
  var PATTERNS = ["parry", "Parry", "melee_parry"];
  var state = { phase: "idle", t0: 0 };      // idle | active | tail | cooldown
  var enabled = true, logMods = false, showCooldown = true, scale = 1.0;
  var seen = {};

  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function find(id) { var r = root(); return r ? r.FindChildTraverse(id) : null; }

  function modifierPanels() {
    var h = find("Hud"); if (!h) return [];
    var out = [];
    ["hud_modifiers", "StatusEffects", "hud_aura_modifiers", "status_bars"].forEach(function (id) {
      var p = h.FindChildTraverse(id); if (p && p.IsValid()) out.push(p);
    });
    return out;
  }

  function looksLikeParry(p) {
    var id = p.id || "";
    for (var i = 0; i < PATTERNS.length; i++) {
      if (id.indexOf(PATTERNS[i]) >= 0) return true;
      try { if (p.BHasClass(PATTERNS[i])) return true; } catch (e) {}
    }
    return false;
  }

  function scan() {
    var found = false;
    modifierPanels().forEach(function (root) {
      var q = [root], n = 0;
      while (q.length && n++ < 600) {
        var p = q.shift(); if (!p || !p.IsValid()) continue;
        if (logMods && p.id && !seen[p.id]) { seen[p.id] = true; $.Msg("[QolParry] modifier panel id=" + p.id + " type=" + p.paneltype); }
        if (looksLikeParry(p)) found = true;
        var kids = p.Children ? p.Children() : []; for (var i = 0; i < kids.length; i++) q.push(kids[i]);
      }
    });
    if (found && state.phase === "idle") start();
  }

  function start() { state = { phase: "active", t0: Date.now() }; }
  function manual() { if (state.phase === "idle" || state.phase === "cooldown") start(); }

  function render() {
    var box = find("QolParry"), txt = find("QolParryText"), fill = find("QolParryFill");
    if (!enabled || !box || !txt || !fill) { $.Schedule(0.1, render); return; }
    var el = (Date.now() - state.t0) / 1000;
    if (state.phase === "active" && el >= ACTIVE) state.phase = "tail";
    if (state.phase === "tail" && el >= TOTAL) state.phase = showCooldown ? "cooldown" : "idle";
    if (state.phase === "cooldown" && el >= TOTAL + COOLDOWN) state.phase = "idle";
    if (state.phase === "idle") { box.style.visibility = "collapse"; $.Schedule(0.05, render); return; }
    box.style.visibility = "visible";
    box.style.width = Math.round(180 * scale) + "px"; find("QolParryTrack").style.width = Math.round(180 * scale) + "px";
    if (state.phase === "active") {
      txt.text = "PARRY " + (ACTIVE - el).toFixed(2); txt.style.color = "#7bd389";
      fill.style.backgroundColor = "#7bd389"; fill.style.width = Math.max(0, 100 * (1 - el / ACTIVE)).toFixed(0) + "%";
    } else if (state.phase === "tail") {
      txt.text = "late"; txt.style.color = "#f0a132"; fill.style.backgroundColor = "#f0a132"; fill.style.width = "100%";
    } else {
      var c = TOTAL + COOLDOWN - el;
      txt.text = "cooldown " + c.toFixed(1); txt.style.color = "#f06a5a";
      fill.style.backgroundColor = "#f06a5a"; fill.style.width = Math.max(0, 100 * (c / COOLDOWN)).toFixed(0) + "%";
    }
    $.Schedule(0.05, render);
  }

  function scanLoop() { if (enabled) scan(); $.Schedule(0.1, scanLoop); }

  QolRegistry.register({
    id: "parry", name: "Parry timer", description: "0.75 s window + 4.5 s whiff cooldown under the crosshair",
    settings: [
      { key: "showCooldown", label: "show whiff cooldown", type: "bool", def: true },
      { key: "scale", label: "bar width", type: "enum", def: "normal", options: ["small", "normal", "wide"] },
      { key: "logMods", label: "log modifiers (calibration)", type: "bool", def: false },
    ],
    onChange: function (k, v) { if (k === "showCooldown") showCooldown = v; if (k === "logMods") { logMods = v; seen = {}; } if (k === "scale") scale = v === "small" ? 0.6 : v === "wide" ? 1.5 : 1.0; },
    setEnabled: function (on) { enabled = on; var b = find("QolParry"); if (!on && b) b.style.visibility = "collapse"; },
  });
  $.Schedule(1.0, render); $.Schedule(1.0, scanLoop);
  return { manual: manual, start: start };
})();
