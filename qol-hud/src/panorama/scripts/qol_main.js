var QolMain = (function () {
  function toggleTimings() {
    var on = !QolTimings.isEnabled();
    QolTimings.setEnabled(on);
    var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent();
    var l = r ? r.FindChildTraverse("QolToggleTimingsLabel") : null;
    if (l) l.text = on ? "timers" : "timers off";
  }
  $.Msg("[QolHud] loaded: timings + box routes");
  return { toggleTimings: toggleTimings };
})();
