# Credits

## Community skins installed alongside QoL HUD (not redistributed here)
Download from the authors' pages; all are CC BY-NC-ND 4.0 (attribution, non-commercial, no derivatives).

| Hero | Skin | Author(s) | Link |
|---|---|---|---|
| Shiv | Gilded Rage Shiv (VIOLET UPDATE) | PloobisMDL | https://gamebanana.com/mods/706952 |
| Vindicta | Vatican Vindicta (CITY NEVER SLEEPS) | neoNote, hqbits, TaffyTha, DragonRoIlZ | https://gamebanana.com/mods/694568 |
| Rat King | Gilded Albino RatKing + particles | cry.baby | https://gamebanana.com/mods/723752 |
| Vindicta | Goth Vindicta | asteriaa, milkies | https://gamebanana.com/mods/721650 |
| Graves | Sparxie Graves overhaul (camera fix for Violet) | [Ash] | https://gamebanana.com/mods/669718 |

Heavy skins (4K textures, 100-600 MB) can be made lighter on your own PC with `qol-hud/tools/slim_vpk.py`: it caps
textures at 1024 px by dropping the top mip levels (the author's own lower mips, nothing re-encoded) and removes
editor-only files. Slimmed copies are for personal use only: the licenses above forbid redistributing modified files.

## HUD mod used alongside QoL HUD
- [QOL Lock](https://gamebanana.com/mods/650634) by civo, BreadRollius, bytenode, Predi_i and contributors
  (Apache-2.0, source: https://github.com/civo7/QOLLOCK). It overrides `hud.xml`, QoL HUD overrides `base_hud.xml`,
  so both load together (tested in game, build 6821). Settings: Esc menu -> QOL LOCK.

Install: put each mod's `pakNN_dir.vpk` into `Deadlock/game/citadel/addons/` (keep the numbers distinct) after running the QoL HUD installer, which sets up `gameinfo.gi`.

## Graphics configs
- [Sqooky's OptimizationLock](https://gamebanana.com/mods/656341) by Sqooky and contributors (GPL-3.0). We recommend
  installing its gameinfo.gi as is; `perf/qol_fast.cfg` / `qol_pretty.cfg` (also inside the VPK for the menu's graphics
  buttons) reuse its ConVar values and are GPL-3.0.

## Tools and references
- [modlock](https://github.com/paralin/modlock) — Panorama compiler and VPK tools.
- [ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat) — format reference for KV3 v5, sounds and textures.
- Match timings: deadlockhandbook.com, deadlock.wiki.
