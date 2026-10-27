# Deadlock QoL mods


Client-side, file-based mods for Deadlock: a HUD with upcoming-timings strip + box routes on the minimap, and a louder heavy-melee cue.
Download the ready VPK from [Releases](../../releases). Build from source with [modlock](https://github.com/paralin/modlock).
Two file-based mods for the vanilla Deadlock client. They override files through the `citadel/addons` search path:
no injection, no memory reads, nothing touches the process. Valve has published no policy on such mods; in practice
cosmetic/HUD/sound VPKs are widespread and no bans are known. Use at your own risk.

| Mod | What | Build | Status |
|---|---|---|---|
| [qol-hud](qol-hud) | **Timings strip**: what happens in the next 15 s (urn, bridge buff, camps, crates, mid, waves) + next-5 list, with one-click marks for things the clock can't know (camp cleared, mid killed). **Box routes**: numbered dots over the minimap, cycle lanes. | `modlock` on macOS/Linux/Windows, no Valve tools (inline styles only, no CSS) | compiles; **not yet run in-game** |
| [heavy-melee-sound](heavy-melee-sound) | Louder, sharper heavy-melee wind-up so you parry on reaction. | Windows + Reduced CSDK 12 + ffmpeg | recipe + scripts; needs the sound paths found in-game |

## Install (both)
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
