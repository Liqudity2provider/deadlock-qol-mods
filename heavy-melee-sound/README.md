# Heavy melee: louder, more distinct wind-up sound

Goal: when an enemy starts a heavy melee, the charge sound is louder and sharper than stock, so you parry on reaction.

A sound mod is a VPK that **replaces the compiled sound file at the exact same path**. Nothing else changes, so the
mod survives most patches. Compiling `.wav -> .vsnd_c` needs Valve's resourcecompiler from **Reduced CSDK 12**, which
is Windows-only. Everything below runs on a Windows PC with Deadlock installed.

## 1. Find the right sound (5 minutes, in the Hero Sandbox)
```
snd_showstart 3          // console: print every sound as it starts
```
Spawn a dummy (`citadel_create_unit haze`), stand next to it and hold melee. The console prints the path of the
wind-up sound, something like `sounds/heroes/<hero>/melee_heavy_charge.vsnd` or a shared
`sounds/weapons/melee/heavy_windup_*.vsnd`. Every hero may have its own variant: repeat for 2–3 heroes and note
which paths are shared. Write the paths into `sounds.txt`, one per line.

The soundevent itself (volume, pitch, falloff) lives in `soundevents/*.vsndevts_c`. Editing it also needs the
CSDK, and the event names are not in any public doc, so we go the file-replacement route.

## 2. Export the originals
Source 2 Viewer → open `Deadlock/game/citadel/pak01_dir.vpk` → navigate to each path from `sounds.txt` →
right click → *Decompile & export* → you get `.wav` files. Put them in `original/` keeping the folder structure.

## 3. Make them loud and sharp
```bash
./boost.sh original/ boosted/     # ffmpeg: +9 dB, high-shelf +4 dB at 3 kHz, limiter, trims leading silence
```
Tune `GAIN_DB` / `SHELF_DB` in the script. Keep the file length identical to the original: the game
expects the wind-up to end when the lunge starts.

## 4. Compile and pack (Windows, CSDK 12)
```powershell
.\build.ps1 -Csdk "D:\Reduced_CSDK_12" -Out dist\pak58_dir.vpk
```
The script copies `boosted/` into a CSDK addon's `content/` tree at the original paths, runs
`resourcecompiler.exe` on every wav, collects the `.vsnd_c` output and packs `pak58_dir.vpk` with `CSDKCfgVPK.exe`
(or `modlock vpk pack` if present).

## 5. Install
Copy `pak58_dir.vpk` to `Deadlock\game\citadel\addons\` and make sure `gameinfo.gi` has `Game citadel/addons` in
`SearchPaths`. The Deadlock Mod Manager does both for you if you zip the vpk.

## Caveats
- Valve has published no policy on client mods. No bans are known for file-based cosmetic/sound mods, and the
  mod never touches the process. Still your risk.
- The louder cue only helps for heavy melees **you can already hear** (same audio range); it doesn't reveal anything new.
- If the wind-up sound is a hero-specific voice grunt rather than a shared SFX, you need one replacement per hero.
