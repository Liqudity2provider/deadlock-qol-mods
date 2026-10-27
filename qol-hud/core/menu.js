// In-game settings menu: one row per registered module (ON/OFF) + its settings. Opened by the gear button.
var QolMenu = (function () {
  var open = false;
  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function find(id) { var r = root(); return r ? r.FindChildTraverse(id) : null; }

  function btn(parent, text, color, w, onClick) {
    var b = $.CreatePanel("Button", parent, "");
    b.style.width = w + "px"; b.style.height = "22px"; b.style.margin = "2px";
    b.style.backgroundColor = "#1a1716"; b.style.border = "1px solid #2a2523";
    var l = $.CreatePanel("Label", b, ""); l.text = text; l.hittest = false;
    l.style.fontSize = "12px"; l.style.color = color; l.style.horizontalAlign = "center"; l.style.verticalAlign = "center";
    b.SetPanelEvent("onactivate", onClick);
    return b;
  }
  function label(parent, text, size, color) {
    var l = $.CreatePanel("Label", parent, ""); l.text = text; l.hittest = false;
    l.style.fontSize = (size || 12) + "px"; l.style.color = color || "#efe9e3"; l.style.verticalAlign = "center"; l.style.marginRight = "8px";
    return l;
  }

  function fmtVal(s, v) { return s.type === "bool" ? (v ? "on" : "off") : String(v); }

  function build() {
    var body = find("QolMenuBody"); if (!body) return;
    body.RemoveAndDeleteChildren();
    var hint = label(body, "settings " + (QolSettings.isPersistent() ? "are saved between matches" : "reset on restart (no persistent storage in this build)"), 10, "#a39b93");
    hint.style.marginBottom = "6px";
    QolRegistry.all().forEach(function (m) {
      var row = $.CreatePanel("Panel", body, ""); row.style.flowChildren = "right"; row.style.marginTop = "6px"; row.style.width = "100%";
      var on = QolRegistry.enabled(m.id);
      btn(row, on ? "ON" : "OFF", on ? "#7bd389" : "#f06a5a", 44, function () { QolRegistry.setEnabled(m.id, !QolRegistry.enabled(m.id)); build(); });
      var t = label(row, m.name, 13); t.style.width = "150px";
      label(row, m.description || "", 10, "#a39b93");
      (m.settings || []).forEach(function (s) {
        var sr = $.CreatePanel("Panel", body, ""); sr.style.flowChildren = "right"; sr.style.marginLeft = "48px"; sr.style.width = "100%";
        var sl = label(sr, s.label, 11, "#a39b93"); sl.style.width = "150px";
        var v = QolRegistry.value(m.id, s.key);
        if (s.type === "bool") {
          btn(sr, fmtVal(s, v), v ? "#7bd389" : "#a39b93", 60, function () { QolRegistry.setValue(m.id, s.key, !QolRegistry.value(m.id, s.key)); build(); });
        } else if (s.type === "number") {
          btn(sr, "−", "#efe9e3", 26, function () { var c = QolRegistry.value(m.id, s.key) - (s.step || 1); QolRegistry.setValue(m.id, s.key, Math.max(s.min, c)); build(); });
          var vl = label(sr, String(v), 12); vl.style.width = "50px"; vl.style.horizontalAlign = "center";
          btn(sr, "+", "#efe9e3", 26, function () { var c = QolRegistry.value(m.id, s.key) + (s.step || 1); QolRegistry.setValue(m.id, s.key, Math.min(s.max, c)); build(); });
        } else if (s.type === "enum") {
          btn(sr, String(v), "#f0a132", 110, function () { var i = s.options.indexOf(QolRegistry.value(m.id, s.key)); QolRegistry.setValue(m.id, s.key, s.options[(i + 1) % s.options.length]); build(); });
        }
      });
    });
  }

  function toggle() {
    open = !open;
    var p = find("QolMenu"); if (!p) return;
    p.style.visibility = open ? "visible" : "collapse";
    if (open) build();
  }
  return { toggle: toggle, rebuild: build };
})();
