# Deadlock QoL mods


Client-side, file-based mods for Deadlock, tested in-game (build 6821): one VPK, a folder of modules, an in-game ⚙ menu (timings, real box routes on the minimap, parry timer), a heavy-melee cue and hero skins, all built without Valve tools. Recommended community skins and their authors: [CREDITS.md](CREDITS.md).
**Install:** download `Install-QoL-HUD.bat` from [Releases](../../releases/latest), double-click, press 1. **Menu:** in a match open the shop (B) to free the cursor, click the orange "mods" button top right.
Two file-based mods for the vanilla Deadlock client. They override files through the `citadel/addons` search path:
no injection, no memory reads, nothing touches the process. Valve has published no policy on such mods; in practice
cosmetic/HUD/sound VPKs are widespread and no bans are known. Use at your own risk.

| Mod | What | Build | Status |
|---|---|---|---|
| [qol-hud](qol-hud) | **One VPK, one folder of modules, one ⚙ menu in-game.** HUD modules toggle live: Timings, Box routes, Parry timer. Sound/skin modules are baked in and listed in the menu. Drop a folder into `modules/` to add one. | `modlock` on macOS/Linux/Windows, no Valve tools for HUD; CSDK for sounds/skins | compiles; **not yet run in-game** |
| [qol-hud/modules/heavy_melee_sound](qol-hud/modules/heavy_melee_sound) | Louder, sharper heavy-melee wind-up so you parry on reaction. | Windows + Reduced CSDK 12 + ffmpeg | recipe + scripts; needs the sound paths found in-game |

Ideas backlog with what is and isn't possible client-side: [CATALOG.md](CATALOG.md).

## Install
**Easy:** download `Install-QoL-HUD.bat` from the latest release, double-click, press 1. It finds the game, downloads and
verifies the mod, patches `gameinfo.gi` and checks for conflicts. Press 2 to get a report to send back, 3 to uninstall.
Details: [installer/README.md](installer/README.md).

**Manual:**
1. Copy `pakNN_dir.vpk` into `Steam\steamapps\common\Deadlock\game\citadel\addons\` (create the folder).
2. In `game\citadel\gameinfo.gi`, inside `SearchPaths`, make sure the first line is `Game citadel/addons` (patches reset this).
3. Restart Deadlock. Remove the vpk if the game fails to start after a patch.

## qol-hud: how it works
- Overrides `panorama/layout/base_hud.xml` the way the Threat HUD mod does: the real `CitadelHud` stays as a child, our
  panels sit next to it.
- Match time: reads the `mm:ss` label from the top bar (regex scan of HUD labels). Fallback: the `0:00` button at the horn, or
  auto-start when the MatchStart takeover disappears.
- Schedule is one table in `qol_schedule.js` (City Never Sleeps, Oct 2026): crates 3:00, small camps 2:00 (+1:25), medium 5:00
  (+4:50), large 8:00 (+5:35), Sinner's 8:00 (+5:00), bridge buff every 5:00 from 5:00, urn 10:00 every 5:00, rift window 10:00,
  mid boss respawn 7/6/5 min, waves 30/25/20 s. Edit there after patches.
- Routes: coordinates in `qol_routes.js` are minimap-relative (0..1) **placeholders**. Calibration: enable a route, open the console
  and read `[QolRoutes] minimap rect …`, then compare dots with real box positions and adjust.
- Known unknowns until the first in-game run: exact label text of the clock, whether `base_hud.xml` is still the HUD root
  in the current build, `actualuiscale_x` availability. All three have fallbacks or are one-line fixes.

## Same features without a client mod
On our own training servers (Deadworks plugin) all of this is already server-side: route beams in the world, timers in chat,
and a louder parry cue could be played with the Sound API on `player_used_ability`. Client mods are for real matches only.
