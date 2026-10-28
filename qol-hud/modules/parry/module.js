// Parry timer. Deadlock parry: 1.0 s animation, melee is parried during the first 0.75 s, then a cooldown.
// Trigger (found in-game, build 6821): when you parry, the HUD shows the panel #parry_unavailable (with ParryImage /
// ParryCooldownBorder) and hides it again when the parry is available. We start the window on its appearance and
// show the cooldown until it disappears, so the bar follows the real game state, not a guessed key.
var QolParry = (function () {
  var ACTIVE = 0.75, TOTAL = 1.0;
  var state = { phase: "idle", t0: 0 };      // idle | active | tail | cooldown
  var enabled = true, showCooldown = true, scale = 1.0, wasVisible = false, cdEnd = 0, shown = true;

  function find(id) { return QolFind(id); }
  var indicator = null;
  function parryPanel() {
    if (indicator && indicator.IsValid()) return indicator;
    indicator = find("parry_unavailable");
    return indicator;
  }
  function visibleNow(p) { return !!(p && p.IsValid() && p.visible && (p.actuallayoutwidth || 0) > 0); }

  function start() { state = { phase: "active", t0: Date.now() }; }
  function manual() { if (state.phase === "idle" || state.phase === "cooldown") start(); }

  function watch() {
    var v = visibleNow(parryPanel());
    if (enabled) {
      if (v && !wasVisible) start();
      if (!v && wasVisible) cdEnd = Date.now();     // parry ready again
    }
    wasVisible = v;
    $.Schedule(0.03, watch);
  }

  function render() {
    var box = find("QolParry"), txt = find("QolParryText"), fill = find("QolParryFill");
    if (!enabled || !box || !txt || !fill) { $.Schedule(0.1, render); return; }
    var el = (Date.now() - state.t0) / 1000;
    if (state.phase === "active" && el >= ACTIVE) state.phase = "tail";
    if (state.phase === "tail" && el >= TOTAL) state.phase = showCooldown ? "cooldown" : "idle";
    if (state.phase === "cooldown" && (!wasVisible || el > 12)) state.phase = "idle";
    if (state.phase === "idle") { if (shown) { box.style.visibility = "collapse"; shown = false; } $.Schedule(0.05, render); return; }
    if (!shown) { box.style.visibility = "visible"; shown = true; }
    var w = Math.round(180 * scale) + "px"; box.style.width = w; find("QolParryTrack").style.width = w;
    if (state.phase === "active") {
      txt.text = "PARRY " + (ACTIVE - el).toFixed(2); txt.style.color = "#7bd389";
      fill.style.backgroundColor = "#7bd389"; fill.style.width = Math.max(0, 100 * (1 - el / ACTIVE)).toFixed(0) + "%";
    } else if (state.phase === "tail") {
      txt.text = "late"; txt.style.color = "#f0a132"; fill.style.backgroundColor = "#f0a132"; fill.style.width = "100%";
    } else {
      txt.text = "parry cooldown"; txt.style.color = "#f06a5a";
      fill.style.backgroundColor = "#f06a5a"; fill.style.width = "100%";
    }
    $.Schedule(0.03, render);
  }

  QolRegistry.register({
    id: "parry", name: "Parry timer", description: "0.75 s parry window + cooldown, from the game's own parry indicator",
    settings: [
      { key: "showCooldown", label: "show cooldown", type: "bool", def: true },
      { key: "scale", label: "bar width", type: "enum", def: "normal", options: ["small", "normal", "wide"] },
    ],
    onChange: function (k, v) { if (k === "showCooldown") showCooldown = v; if (k === "scale") scale = v === "small" ? 0.6 : v === "wide" ? 1.5 : 1.0; },
    setEnabled: function (on) { enabled = on; var b = find("QolParry"); if (!on && b) b.style.visibility = "collapse"; },
  });
  $.Schedule(1.0, render); $.Schedule(1.0, watch);
  return { manual: manual, start: start };
})();
