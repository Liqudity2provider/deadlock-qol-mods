// Parry timer. Deadlock parry: 1.0 s animation, melee is parried during the first 0.75 s, then a cooldown.
// Trigger (found in-game, build 6821): when you parry, the HUD shows the panel #parry_unavailable (with ParryImage /
// ParryCooldownBorder) and hides it again when the parry is available. We start the window on its appearance and
// show the cooldown until it disappears, so the bar follows the real game state, not a guessed key.
// The game's indicator has no progress, so the countdown uses the expected lockout: citadel_ability_melee_parry
// AbilityCooldown 4.5 s (4.6 s measured from the key press), minus ParryCooldownReduction 1.75 s with Rebuttal
// (upgrade_melee_rebuttal). Rebuttal is detected from our own item icons (class "parryRebuttal", the same one QOL Lock
// uses), and every finished cooldown re-measures the length for the current mode, so a patch can't leave it stale.
var QolParry = (function () {
  var ACTIVE = 0.75, TOTAL = 1.0;
  var LOCKOUT = { base: 4.6, rebuttal: 2.85 };  // press -> ready, seconds; replaced by what we measure
  var state = { phase: "idle", t0: 0 };      // idle | active | tail | cooldown
  var enabled = true, showCooldown = true, scale = 1.0, wasVisible = false, cdEnd = 0, shown = true;
  var rebuttal = false;

  function find(id) { return QolFind(id); }
  var indicator = null;
  function parryPanel() {
    if (indicator && indicator.IsValid()) return indicator;
    indicator = find("parry_unavailable");
    return indicator;
  }
  function visibleNow(p) { return !!(p && p.IsValid() && p.visible && (p.actuallayoutwidth || 0) > 0); }

  // Own items live under #ModPurchasedPanelUniversal (the quickbuy "next item" icon is elsewhere, so it can't fool us).
  function ownsRebuttal() {
    var box = find("ModPurchasedPanelUniversal");
    if (box && box.FindChildrenWithClassTraverse) {
      var hits = box.FindChildrenWithClassTraverse("parryRebuttal") || [];
      for (var h = 0; h < hits.length; h++) {
        for (var p = hits[h]; p && p !== box; p = p.GetParent()) {
          if (p.paneltype === "CitadelModIcon") { if (p.BHasClass("hasAbility")) return true; break; }
        }
        if (hits[h].BHasClass("hasAbility")) return true;
      }
    }
    return false;
  }
  function watchItems() { if (enabled) rebuttal = ownsRebuttal(); $.Schedule(2.0, watchItems); }
  function lockout() { return LOCKOUT[rebuttal ? "rebuttal" : "base"]; }

  function start() { state = { phase: "active", t0: Date.now(), mode: rebuttal ? "rebuttal" : "base" }; }
  function manual() { if (state.phase === "idle" || state.phase === "cooldown") start(); }

  function watch() {
    var v = visibleNow(parryPanel());
    if (enabled) {
      if (v && !wasVisible) start();
      if (!v && wasVisible) {                       // parry ready again: learn the real length for this mode
        cdEnd = Date.now();
        var d = (cdEnd - state.t0) / 1000;
        if (state.mode && state.mode === (rebuttal ? "rebuttal" : "base") && d > 1.5 && d < 10) LOCKOUT[state.mode] = d;
      }
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
      var total = lockout(), left = Math.max(0, total - el), span = Math.max(0.1, total - TOTAL);
      txt.text = (rebuttal ? "rebuttal " : "parry ") + (left > 0 ? left.toFixed(1) + "s" : "...");
      txt.style.color = rebuttal ? "#c084fc" : "#f06a5a";
      fill.style.backgroundColor = rebuttal ? "#c084fc" : "#f06a5a";
      fill.style.width = Math.min(100, 100 * left / span).toFixed(0) + "%";
    }
    $.Schedule(0.03, render);
  }

  QolRegistry.register({
    id: "parry", name: "Parry timer", description: "0.75 s parry window + cooldown countdown (knows Rebuttal), from the game's own parry indicator",
    settings: [
      { key: "showCooldown", label: "show cooldown", type: "bool", def: true },
      { key: "scale", label: "bar width", type: "enum", def: "normal", options: ["small", "normal", "wide"] },
    ],
    onChange: function (k, v) { if (k === "showCooldown") showCooldown = v; if (k === "scale") scale = v === "small" ? 0.6 : v === "wide" ? 1.5 : 1.0; },
    setEnabled: function (on) { enabled = on; var b = find("QolParry"); if (!on && b) b.style.visibility = "collapse"; },
  });
  $.Schedule(1.0, render); $.Schedule(1.0, watch); $.Schedule(2.0, watchItems);
  return { manual: manual, start: start, rebuttal: function () { return rebuttal; } };
})();
