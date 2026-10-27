// On-screen diagnostics (retail builds drop $.Msg). Enabled when the build sets QOL_DEBUG = true.
// Shows clock source + the state of known HUD panels so we can tell menu / hideout / match apart from a screenshot.
var QolDebug = (function () {
  var IDS = ["Hud", "HudCore", "gameplay_hud", "gameplay_hud_alive", "gameplay_hud_dead", "TopBar", "hud_minimap", "MatchStart",
             "Pregame", "PregameCountdown", "MatchEnd", "hud_hero_testing", "CitadelHudHideout", "health_and_abilities_container", "join_team"];
  var lines = [];
  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function log(s) { lines.push(s); if (lines.length > 22) lines.shift(); }
  function describe(p) {
    if (!p || !p.IsValid()) return "-";
    var vis = p.visible ? "V" : "h";
    var w = Math.round(p.actuallayoutwidth || 0), h = Math.round(p.actuallayoutheight || 0);
    var op = ""; try { op = p.style.opacity ? " op" + p.style.opacity : ""; } catch (e) {}
    var kids = p.Children ? p.Children().length : 0;
    return vis + " " + w + "x" + h + " c" + kids + op;
  }
  function keys(o) { var k = []; try { for (var n in o) k.push(n); } catch (e) {} return k.slice(0, 14).join(","); }
  function probe() {
    var parts = [];
    ["Game", "GameUI", "GameInterfaceAPI", "GameEvents", "Players", "Entities", "SteamOverlayAPI", "LobbyAPI", "CitadelAPI", "$.persistentStorage", "$.RegisterKeyBind", "$.Localize"].forEach(function (n) {
      var v; try { v = n.charAt(0) === "$" ? $[n.slice(2)] : eval("typeof " + n + " !== 'undefined' ? " + n + " : undefined"); } catch (e) { v = undefined; }
      if (v !== undefined) parts.push(n + (typeof v === "object" ? "{" + keys(v) + "}" : ":" + typeof v));
    });
    return parts.join("  ");
  }
  function tick() {
    var r = root(), lab = r ? r.FindChildTraverse("QolDebugText") : null;
    if (!lab) { $.Schedule(1.0, tick); return; }
    var out = ["QOL DEBUG " + (typeof QOL_VERSION !== "undefined" ? QOL_VERSION : ""),
               "clock: " + QolClock.now() + "s src=" + QolClock.source() + " label='" + QolClock.labelText() + "' path=" + QolClock.labelPath(),
               "inMatch: " + (typeof QolState !== "undefined" ? QolState.inMatch() + " (" + QolState.reason() + ")" : "?")];
    out.push("api: " + probe());
    var hud0 = r.FindChildTraverse("Hud");
    if (hud0) {
      var mm = ["hud_minimap", "HudMinimapContainer", "minimap_container", "minimap_frame"].map(function (id) {
        var p = hud0.FindChildTraverse(id); if (!p) return id + ":-";
        var pos = p.GetPositionWithinWindow ? p.GetPositionWithinWindow() : { x: "?", y: "?" };
        return id + ":" + Math.round(pos.x) + "," + Math.round(pos.y) + " " + Math.round(p.actuallayoutwidth) + "x" + Math.round(p.actuallayoutheight);
      });
      out.push("minimap: " + mm.join("  ") + "  uiscale=" + (hud0.actualuiscale_x || "?"));
      var tc = ["LocalPlayerTeam1", "LocalPlayerTeam2", "Team1", "Team2", "TeamAmber", "TeamSapphire", "AmberTeam", "SapphireTeam"].filter(function (c) { try { return hud0.BHasClass(c) || r.BHasClass(c); } catch (e) { return false; } });
      out.push("team classes: " + (tc.join(",") || "none"));
    }
    out.push("---- newest first ----");
    out = out.concat(lines.slice().reverse());
    lab.text = out.join("\n");
    $.Schedule(1.0, tick);
  }
  // panel diff: log HUD panels (with ids) that appear/disappear, to discover state indicators (parry, stun, ...)
  var prev = null;
  function snapshot() {
    var r = root(), hud = r ? r.FindChildTraverse("Hud") : null, cur = {};
    if (!hud) return cur;
    var q = [hud], n = 0;
    while (q.length && n++ < 4000) {
      var p = q.shift(); if (!p || !p.IsValid()) continue;
      if (p.id && p.id.indexOf("Qol") !== 0) cur[p.id] = p.visible && (p.actuallayoutwidth || 0) > 0 ? 1 : 0;
      if (p.visible) { var kids = p.Children ? p.Children() : []; for (var i = 0; i < kids.length; i++) q.push(kids[i]); }
    }
    return cur;
  }
  function diffLoop() {
    var cur = snapshot();
    if (prev) {
      var on1 = [], off1 = [];
      for (var k in cur) if (cur[k] && !prev[k]) on1.push(k);
      for (var k2 in prev) if (prev[k2] && !cur[k2]) off1.push(k2);
      var NOISE = /^(hud_event|PrewarmStatus|MessageContents|SenderImage|MessageSource|KeyboardLetter|KeyboardLabelSnippet|modIconContainer|mod_icon_background|ActiveTagContainer|HeroImage|ChatArrow|MessageText|IntroContainer|BuildNumber)$/;
      on1 = on1.filter(function (x) { return !NOISE.test(x); }); off1 = off1.filter(function (x) { return !NOISE.test(x); });
      if ((on1.length || off1.length) && on1.length + off1.length < 14) log(((Date.now() / 1000) % 1000).toFixed(1) + " +" + on1.join(",") + "  -" + off1.join(","));
    }
    prev = cur;
    $.Schedule(0.1, diffLoop);
  }
  var on = typeof QOL_DEBUG !== "undefined" && QOL_DEBUG;
  if (on) { $.Schedule(1.0, tick); $.Schedule(3.0, diffLoop); }
  return { log: log, on: on };
})();
