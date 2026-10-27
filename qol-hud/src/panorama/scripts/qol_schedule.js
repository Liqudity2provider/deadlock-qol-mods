// Match schedule. Source: deadlockhandbook.com + deadlock.wiki, checked Oct 2026 (City Never Sleeps, build 6722).
// Valve changes these often -> everything lives here, nothing is hard-coded elsewhere.
// Times in seconds. Two kinds of events:
//   fixed:   happens at known match times (first spawn + optional period)
//   marked:  countdown starts when the player presses a mark button (camp cleared, mid killed, ...)
var QolSchedule = (function () {
  var FIXED = [
    { id: "crates",      name: "Crates spawn",          at: [180],            period: 0 },
    { id: "crates5",     name: "Tunnel crates",         at: [300],            period: 0 },
    { id: "crates10",    name: "Mid-pit room crates",   at: [600],            period: 0 },
    { id: "statues",     name: "Gold statues",          at: [120],            period: 0 },
    { id: "camp_small",  name: "Small camps",           at: [120],            period: 0 },
    { id: "camp_medium", name: "Medium camps",          at: [300],            period: 0 },
    { id: "camp_large",  name: "Large camps",           at: [480],            period: 0 },
    { id: "sinner",      name: "Sinner's Sacrifice",    at: [480],            period: 0 },
    { id: "bridge",      name: "Bridge buff",           at: [300],            period: 300, until: 99999 },
    { id: "urn",         name: "Soul Urn",              at: [600],            period: 300, until: 99999, note: "skips a turn while carried" },
    { id: "rift",        name: "Unstable Rift window",  at: [600],            period: 0 },
    { id: "statue_up1",  name: "Statue buffs upgrade",  at: [600, 1800],      period: 0 },
    { id: "guardian_dr", name: "Guardians -75% resist", at: [720],            period: 0 },
    { id: "walker_dr",   name: "Walkers -65% resist",   at: [1080],           period: 0 },
    { id: "troop25",     name: "Troopers every 25s",    at: [1200],           period: 0 },
    { id: "troop20",     name: "Troopers +50% HP / 20s",at: [2100],           period: 0 },
  ];
  // creep waves: 0:30 then every 30s, 25s after 20:00, 20s after 35:00
  function nextWave(t) {
    var period = t >= 2100 ? 20 : t >= 1200 ? 25 : 30;
    var base = t >= 2100 ? 2100 : t >= 1200 ? 1200 : 30;
    if (t < 30) return 30;
    var k = Math.floor((t - base) / period) + 1;
    return base + k * period;
  }
  // marked events: respawn delay after the player marks it. Mid boss delay depends on how many times it died.
  var MARKED = {
    camp_small:  { name: "Small camp back",   delay: function () { return 85; } },
    camp_medium: { name: "Medium camp back",  delay: function () { return 290; } },
    camp_large:  { name: "Large camp back",   delay: function () { return 335; } },
    sinner:      { name: "Sinner's back",     delay: function () { return 300; } },
    crates:      { name: "Crates back",       delay: function () { return 180; } },
    midboss:     { name: "Mid Boss back",     delay: function (n) { return n <= 1 ? 420 : n === 2 ? 360 : 300; } },
  };
  return { FIXED: FIXED, MARKED: MARKED, nextWave: nextWave };
})();
