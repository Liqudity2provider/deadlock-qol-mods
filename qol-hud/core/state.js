// Are we in a live match? HUD modules hide in the main menu / dashboard and show in matches.
// Signals (first that is available wins); tuned from in-game debug screenshots.
var QolState = (function () {
  var why = "init", cache = false;
  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function vis(p) { return p && p.IsValid() && p.visible && (p.actuallayoutheight || 0) > 0; }
  function compute() {
    var r = root(); var hud = r ? r.FindChildTraverse("Hud") : null;
    if (!hud || !vis(hud)) { why = "no hud"; return false; }
    var top = hud.FindChildTraverse("TopBar");
    var alive = hud.FindChildTraverse("gameplay_hud_alive"), dead = hud.FindChildTraverse("gameplay_hud_dead");
    var hideout = hud.FindChildTraverse("CitadelHudHideout");
    if (hideout && vis(hideout)) { why = "hideout"; return false; }
    if (!(vis(alive) || vis(dead))) { why = "no gameplay hud"; return false; }
    // the top bar collapses while the shop / builds are open; the GameTime label still ticks, so trust the clock instead
    if (QolClock.source() !== "hud") { why = "no match clock"; return false; }
    why = "match"; return true;
  }
  function loop() { cache = compute(); $.Schedule(0.5, loop); }
  $.Schedule(0.5, loop);
  return { inMatch: function () { return cache || (typeof QOL_FORCE_SHOW !== "undefined" && QOL_FORCE_SHOW); }, reason: function () { return why; } };
})();
