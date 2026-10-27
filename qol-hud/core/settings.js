// Settings store + module registry. Persists through $.persistentStorage when the build exposes it
// (CS2-era Panorama does), otherwise settings live for the session only.
var QolSettings = (function () {
  var KEY = "qolhud.settings.v1";
  var data = {};
  var persistent = (function () { try { return typeof $.persistentStorage !== "undefined" && $.persistentStorage; } catch (e) { return null; } })();
  try { if (persistent) { var raw = persistent.getItem(KEY); if (raw) data = JSON.parse(raw); } } catch (e) { data = {}; }
  function save() { try { if (persistent) persistent.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function get(mod, key, def) { var m = data[mod]; return m && key in m ? m[key] : def; }
  function set(mod, key, val) { data[mod] = data[mod] || {}; data[mod][key] = val; save(); }
  return { get: get, set: set, isPersistent: function () { return !!persistent; } };
})();

var QolRegistry = (function () {
  var mods = [];
  // spec: { id, kind: 'hud'|'sound'|'skin', name, description, settings: [{key, label, type: 'bool'|'number'|'enum', def, min, max, step, options}], onChange(key, value), setEnabled(bool) }
  function register(spec) {
    if (!spec.kind) spec.kind = "hud";
    mods.push(spec);
    if (spec.kind !== "hud") return;   // file mods are always on while packed
    var on = QolSettings.get(spec.id, "enabled", true);
    if (spec.setEnabled) spec.setEnabled(on);
    (spec.settings || []).forEach(function (s) { var v = QolSettings.get(spec.id, s.key, s.def); if (spec.onChange) spec.onChange(s.key, v); });
  }
  function enabled(id) { return QolSettings.get(id, "enabled", true); }
  function setEnabled(id, on) { QolSettings.set(id, "enabled", on); mods.forEach(function (m) { if (m.id === id && m.setEnabled) m.setEnabled(on); }); }
  function value(id, key) { var m = mods.filter(function (x) { return x.id === id; })[0]; var s = m && (m.settings || []).filter(function (x) { return x.key === key; })[0]; return QolSettings.get(id, key, s ? s.def : undefined); }
  function setValue(id, key, v) { QolSettings.set(id, key, v); mods.forEach(function (m) { if (m.id === id && m.onChange) m.onChange(key, v); }); }
  return { register: register, all: function () { return mods.slice(); }, enabled: enabled, setEnabled: setEnabled, value: value, setValue: setValue };
})();
