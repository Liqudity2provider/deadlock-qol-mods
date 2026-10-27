# Installer

`Install-QoL-HUD.bat`: download it from the latest release, double-click, pick 1/2/3.

| | What it does |
|---|---|
| **1. Install / update / repair** | finds Deadlock through Steam (registry + `libraryfolders.vdf` + `appmanifest_1422450.acf`), waits until the game is closed, downloads the latest `pak57_dir.vpk`, verifies its SHA-256 against the release, checks it really is QoL HUD, places it in `game/citadel/addons/`, adds `Game citadel/addons` plus `Mod`/`Write` paths for `citadel` and `core` to `gameinfo.gi` (without them, since the Sep 29 2026 patch, the game crashes on start with "Unable to read default keybinding configuration"; backup `gameinfo.gi.qolhud.bak`, line endings preserved), verifies again, warns about other HUD mods that replace `base_hud` (lower pak number wins). Never overwrites someone else's `pak57`: uses the next free slot. Re-run after every Deadlock patch. |
| **2. Check and report** | all the checks above + update check + reads `game/citadel/console.log` for HUD lines, Panorama errors, minimap rect, parry modifiers and `sounds/…vsnd` paths. Saves `qolhud-report.txt` on the Desktop and copies it to the clipboard. Needs `-condebug` in Deadlock's launch options (the script copies it to the clipboard when missing). |
| **3. Uninstall** | removes our VPK and marker; removes the `gameinfo.gi` line only if no other addon VPKs remain. |

The `.bat` runs `install.ps1` from next to it if present, otherwise fetches the current one from this repo.
PowerShell directly:
```powershell
powershell -ExecutionPolicy Bypass -File install.ps1 -Action install      # report | uninstall
# options: -DeadlockPath "D:\SteamLibrary\steamapps\common\Deadlock"  -Tag v0.3.0  -Source my.vpk  -Yes
```
