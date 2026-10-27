// Enemy ult tracker: six rows, one per enemy. Click a row when that enemy used their ult -> countdown from the
// hero's base ult cooldown. Hero names are read from the scoreboard/top bar when found; otherwise rows say E1..E6
// and you can cycle the hero with a long list. No game-state API is used, only HUD labels.
var QolUlts = (function () {
  var slots = [], enabled = true, autoRoster = true, compact = false;
  var HEROES = Object.keys(QolUltCooldowns).filter(function (k) { return k !== "DEFAULT"; });
  for (var i = 0; i < 6; i++) slots.push({ hero: "", usedAt: 0, row: null, name: null, timer: null });

  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function find(id) { var r = root(); return r ? r.FindChildTraverse(id) : null; }
  function pretty(h) { return h ? h.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : "E"; }

  function build() {
    var rows = find("QolUltRows"); if (!rows) return;
    rows.RemoveAndDeleteChildren();
    slots.forEach(function (s, i) {
      var row = $.CreatePanel("Button", rows, "QolUltRow" + i);
      row.style.flowChildren = "right"; row.style.width = compact ? "120px" : "170px"; row.style.height = "20px"; row.style.margin = "1px";
      row.style.backgroundColor = "#0b0a0ac0"; row.style.border = "1px solid #2a2523"; row.style.borderRadius = "4px";
      var name = $.CreatePanel("Label", row, ""); name.hittest = false; name.style.fontSize = "11px"; name.style.color = "#efe9e3";
      name.style.width = compact ? "70px" : "110px"; name.style.verticalAlign = "center"; name.style.marginLeft = "6px";
      var t = $.CreatePanel("Label", row, ""); t.hittest = false; t.style.fontSize = "11px"; t.style.color = "#7bd389"; t.style.verticalAlign = "center";
      s.row = row; s.name = name; s.timer = t;
      row.SetPanelEvent("onactivate", function () { use(i); });
      row.SetPanelEvent("oncontextmenu", function () { cycleHero(i); });
    });
  }

  function use(i) { var s = slots[i]; s.usedAt = s.usedAt && remaining(s) > 0 ? 0 : Date.now(); }
  function cycleHero(i) { var s = slots[i]; var idx = HEROES.indexOf(s.hero); s.hero = HEROES[(idx + 1) % HEROES.length]; }
  function cd(s) { return QolUltCooldowns[s.hero] || QolUltCooldowns.DEFAULT; }
  function remaining(s) { return s.usedAt ? cd(s) - (Date.now() - s.usedAt) / 1000 : 0; }

  // best-effort roster: look for 6 enemy hero names in HUD labels (scoreboard / top bar). Unknown ids -> no-op.
  function tryRoster() {
    if (!autoRoster) return;
    var h = find("Hud"); if (!h) return;
    var top = h.FindChildTraverse("TopBar"); if (!top) return;
    var names = [], q = [top], n = 0;
    while (q.length && n++ < 1500) {
      var p = q.shift(); if (!p || !p.IsValid()) continue;
      if (p.paneltype === "Label" && typeof p.text === "string") {
        var key = p.text.toLowerCase().replace(/[^a-z& ]/g, "").replace(/ & /g, "_and_").replace(/ /g, "_");
        if (HEROES.indexOf(key) >= 0 && names.indexOf(key) < 0) names.push(key);
      }
      var kids = p.Children ? p.Children() : []; for (var i = 0; i < kids.length; i++) q.push(kids[i]);
    }
    // the top bar lists 12 heroes; we don't know which 6 are enemies without ids, so only fill empty slots with the last 6
    if (names.length >= 12) { var enemy = names.slice(6, 12); enemy.forEach(function (hn, i) { if (!slots[i].hero) slots[i].hero = hn; }); }
  }

  function render() {
    var box = find("QolUlts");
    if (!enabled || !box || !QolState.inMatch()) { if (box) box.style.visibility = "collapse"; $.Schedule(0.25, render); return; }
    box.style.visibility = "visible";
    if (!slots[0].row || !slots[0].row.IsValid()) build();
    slots.forEach(function (s, i) {
      if (!s.name) return;
      s.name.text = (s.hero ? pretty(s.hero) : "E" + (i + 1)) + (s.hero ? "" : "  (right-click: hero)");
      var r = remaining(s);
      if (r > 0) { s.timer.text = Math.ceil(r) + "s"; s.timer.style.color = r < 15 ? "#f0a132" : "#f06a5a"; s.row.style.border = "1px solid #f06a5a66"; }
      else { s.timer.text = s.usedAt ? "READY" : "—"; s.timer.style.color = "#7bd389"; s.row.style.border = "1px solid #2a2523"; }
    });
    $.Schedule(0.25, render);
  }

  QolRegistry.register({
    id: "ults", name: "Enemy ult tracker", description: "off by default: click a row (shop open) when an enemy ults; right-click sets the hero", defaultEnabled: false,
    settings: [
      { key: "autoRoster", label: "read heroes from HUD", type: "bool", def: true },
      { key: "compact", label: "compact rows", type: "bool", def: false },
    ],
    onChange: function (k, v) { if (k === "autoRoster") autoRoster = v; if (k === "compact") { compact = v; build(); } },
    setEnabled: function (on) { enabled = on; },
  });
  $.Schedule(2.0, render);
  $.Schedule(5.0, function loop() { tryRoster(); $.Schedule(15.0, loop); });
  return { use: use, cycleHero: cycleHero };
})();
