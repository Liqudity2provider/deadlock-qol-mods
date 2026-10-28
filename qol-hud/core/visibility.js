// Hide every QoL panel outside live matches (menu, dashboard, hideout). The debug label stays visible.
var QolVisibility = (function () {
  var PANELS = ["QolQuick", "QolTimings", "QolRoutes", "QolParry"];
  var last = null;
  function loop() {
    var show = QolState.inMatch();
    if (show !== last) {
      PANELS.forEach(function (id) { var p = QolFind(id); if (p) p.SetHasClass("QolHiddenByState", !show); if (p) p.style.opacity = show ? "1" : "0"; });
      var menu = QolFind("QolMenu"); if (menu && !show) menu.style.visibility = "collapse";
      last = show;
    }
    $.Schedule(0.5, loop);
  }
  $.Schedule(0.6, loop);
  return {};
})();
