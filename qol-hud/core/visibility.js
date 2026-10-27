// Hide every QoL panel outside live matches (menu, dashboard, hideout). The debug label stays visible.
var QolVisibility = (function () {
  var PANELS = ["QolQuick", "QolTimings", "QolRoutes", "QolParry"];
  var last = null;
  function root() { var r = $.GetContextPanel(); while (r && r.GetParent()) r = r.GetParent(); return r; }
  function loop() {
    var show = QolState.inMatch();
    if (show !== last) {
      var r = root();
      PANELS.forEach(function (id) { var p = r ? r.FindChildTraverse(id) : null; if (p) p.SetHasClass("QolHiddenByState", !show); if (p) p.style.opacity = show ? "1" : "0"; });
      var menu = r ? r.FindChildTraverse("QolMenu") : null; if (menu && !show) menu.style.visibility = "collapse";
      last = show;
    }
    $.Schedule(0.5, loop);
  }
  $.Schedule(0.6, loop);
  return {};
})();
