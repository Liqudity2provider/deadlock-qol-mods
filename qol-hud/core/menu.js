// In-game settings menu. One card per module: accent bar, name, description, ON/OFF pill, settings rows.
// File mods (sounds/skins) are listed too, but they are baked into the VPK: the card says "restart to change".
var QolMenu = (function () {
  var open = false, tab = "all";
  var C = { bg: "#0d0b0bf2", card: "#161312", line: "#2a2523", fg: "#efe9e3", muted: "#a39b93", accent: "#f0a132", ok: "#7bd389", bad: "#f06a5a", teal: "#4fd1c5", purple: "#c084fc" };
  var KIND = { hud: { label: "HUD", color: C.accent }, sound: { label: "SOUND", color: C.purple }, skin: { label: "SKIN", color: C.teal } };

  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function find(id) { var r = root(); return r ? r.FindChildTraverse(id) : null; }

  function mk(type, parent, st, text) {
    var p = $.CreatePanel(type, parent, "");
    if (text !== undefined) { p.text = text; p.hittest = false; }
    for (var k in st) p.style[k] = st[k];
    return p;
  }
  function pill(parent, text, color, w, onClick, filled) {
    var b = $.CreatePanel("Button", parent, "");
    b.style.width = w + "px"; b.style.height = "24px"; b.style.marginRight = "6px"; b.style.borderRadius = "12px";
    b.style.backgroundColor = filled ? color : "#1a1716"; b.style.border = "1px solid " + color;
    var l = mk("Label", b, { fontSize: "11px", color: filled ? "#1a1000" : color, horizontalAlign: "center", verticalAlign: "center", fontWeight: "bold" }, text);
    l.hittest = false; b.SetPanelEvent("onactivate", onClick);
    return b;
  }
  function tiny(parent, text, onClick) {
    var b = $.CreatePanel("Button", parent, "");
    b.style.width = "26px"; b.style.height = "22px"; b.style.marginRight = "4px"; b.style.borderRadius = "4px";
    b.style.backgroundColor = "#1f1b19"; b.style.border = "1px solid " + C.line;
    mk("Label", b, { fontSize: "13px", color: C.fg, horizontalAlign: "center", verticalAlign: "center" }, text).hittest = false;
    b.SetPanelEvent("onactivate", onClick); return b;
  }

  function card(body, m) {
    var kind = KIND[m.kind || "hud"] || KIND.hud;
    var on = m.kind && m.kind !== "hud" ? true : QolRegistry.enabled(m.id);
    var c = mk("Panel", body, { flowChildren: "right", width: "100%", marginTop: "6px", backgroundColor: C.card, border: "1px solid " + C.line, borderRadius: "8px", padding: "0px" });
    mk("Panel", c, { width: "4px", height: "100%", backgroundColor: on ? kind.color : C.line, borderRadius: "8px 0px 0px 8px" });
    var inner = mk("Panel", c, { flowChildren: "down", width: "fill-parent-flow(1.0)", padding: "8px 10px" });
    var head = mk("Panel", inner, { flowChildren: "right", width: "100%" });
    mk("Label", head, { fontSize: "9px", color: kind.color, letterSpacing: "1px", width: "48px", verticalAlign: "center", fontWeight: "bold" }, kind.label);
    mk("Label", head, { fontSize: "14px", color: on ? C.fg : C.muted, width: "170px", verticalAlign: "center", fontWeight: "bold" }, m.name);
    mk("Label", head, { fontSize: "10px", color: C.muted, verticalAlign: "center", width: "fill-parent-flow(1.0)" }, m.description || "");
    if (m.kind && m.kind !== "hud") mk("Label", head, { fontSize: "10px", color: C.muted, horizontalAlign: "right", verticalAlign: "center" }, "baked in · restart to change");
    else pill(head, on ? "ON" : "OFF", on ? C.ok : C.bad, 54, function () { QolRegistry.setEnabled(m.id, !QolRegistry.enabled(m.id)); build(); }, on);
    if (!on) return;
    (m.settings || []).forEach(function (s) {
      var row = mk("Panel", inner, { flowChildren: "right", width: "100%", marginTop: "4px", marginLeft: "48px" });
      mk("Label", row, { fontSize: "11px", color: C.muted, width: "190px", verticalAlign: "center" }, s.label);
      var v = QolRegistry.value(m.id, s.key);
      if (s.type === "bool") pill(row, v ? "on" : "off", v ? C.ok : C.muted, 50, function () { QolRegistry.setValue(m.id, s.key, !QolRegistry.value(m.id, s.key)); build(); }, false);
      else if (s.type === "number") {
        tiny(row, "−", function () { QolRegistry.setValue(m.id, s.key, Math.max(s.min, QolRegistry.value(m.id, s.key) - (s.step || 1))); build(); });
        mk("Label", row, { fontSize: "12px", color: C.fg, width: "44px", horizontalAlign: "center", verticalAlign: "center", fontWeight: "bold" }, String(v));
        tiny(row, "+", function () { QolRegistry.setValue(m.id, s.key, Math.min(s.max, QolRegistry.value(m.id, s.key) + (s.step || 1))); build(); });
      } else if (s.type === "enum") pill(row, String(v) + "  ▸", C.accent, 130, function () { var i = s.options.indexOf(QolRegistry.value(m.id, s.key)); QolRegistry.setValue(m.id, s.key, s.options[(i + 1) % s.options.length]); build(); }, false);
    });
  }

  function build() {
    var body = find("QolMenuBody"); if (!body) return;
    body.RemoveAndDeleteChildren();
    var tabs = mk("Panel", body, { flowChildren: "right", width: "100%", marginBottom: "4px" });
    [["all", "All"], ["hud", "HUD"], ["sound", "Sounds"], ["skin", "Skins"]].forEach(function (t) {
      pill(tabs, t[1], tab === t[0] ? C.accent : C.muted, 64, function () { tab = t[0]; build(); }, tab === t[0]);
    });
    var mods = QolRegistry.all().filter(function (m) { return tab === "all" || (m.kind || "hud") === tab; });
    if (!mods.length) mk("Label", body, { fontSize: "11px", color: C.muted, marginTop: "10px" }, "nothing in this tab");
    mods.forEach(function (m) { card(body, m); });
    var foot = mk("Panel", body, { flowChildren: "right", width: "100%", marginTop: "8px" });
    mk("Label", foot, { fontSize: "9px", color: C.muted }, QolSettings.isPersistent() ? "settings are saved between matches" : "no persistent storage in this build: settings reset on restart");
    mk("Label", foot, { fontSize: "9px", color: C.muted, horizontalAlign: "right" }, "QoL HUD " + (typeof QOL_VERSION !== "undefined" ? QOL_VERSION : ""));
  }

  function toggle() { open = !open; var p = find("QolMenu"); if (!p) return; p.style.visibility = open ? "visible" : "collapse"; if (open) build(); }
  return { toggle: toggle, rebuild: build };
})();
