# Graphics toggle

Two configs for switching graphics in a match, without restarting. The QoL HUD menu has buttons for them
(graphics: fast / pretty) and ships them in the VPK (modules/graphics_toggle); the console works too:

    exec qol_fast      shadows, glow, bloom, particle lights off (Sqooky's values)
    exec qol_pretty    the same ConVars back to stock

Without the VPK, put both files in `Deadlock/game/citadel/cfg/`. Values come from Sqooky's OptimizationLock 3.7.1
(GPL-3, https://gamebanana.com/mods/656341): only the ConVars that differ from stock and that the retail console
accepts at runtime (33 of its ConVars are "Unknown command" in a match and only work from gameinfo.gi).

Measured in a 6v6 bot match (build 6821, i5-11400F + RTX 3060), alternating 6-sample blocks in the same scene:
- base gameinfo.gi = Sqooky's: fast ~115 fps, pretty ~88 fps.
- base gameinfo.gi = stock: ~99 fps both. Most of the gain comes from the startup-only sections of gameinfo.gi,
  so keep Sqooky's gameinfo.gi installed and use these to bring visuals back when you want them.
Sun shadows visibly toggle with a stock gameinfo.gi; with Sqooky's (shadow textures sized 0 at startup) they may not.

License: GPL-3.0 (LICENSE-GPL-3.0.txt), as the values come from Sqooky's GPL-3.0 config.
