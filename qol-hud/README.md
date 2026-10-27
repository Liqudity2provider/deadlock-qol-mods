# QoL HUD — modular Deadlock HUD mod with an in-game settings menu

One VPK, several modules, a ⚙ button on the HUD. Each module can be switched on/off and configured in the menu while
playing; settings persist between matches when the game exposes `$.persistentStorage` (CS2-era Panorama does; if not,
the menu says so and settings last for the session).

```
core/                        settings store, module registry, menu, match clock, base_hud template
modules/timings/             upcoming objectives strip + marks (S/M/L/Sin/Mid/Box buttons)        [hud]
modules/routes/              box routes as numbered dots over the minimap                          [hud]
modules/parry/               parry window + cooldown bar under the crosshair                       [hud]
modules/heavy_melee_sound/   louder heavy-melee wind-up (compiled sounds in assets/)               [sound]
modules/_example_skin/       template for texture/model replacements                              [skin]
config.json                  {"disabled": [...]} build-time switch; VERSION shown in the menu
build.py                     assembles core + modules -> src/ -> dist/pak57_dir.vpk (modlock)
tools/vsnd.py                any audio -> Deadlock .vsnd_c using the original game file as template (no CSDK)
tools/gen_routes.py          map entity lump -> modules/routes/routes_data.js
tools/vtex.py                recolor / replace BC7 textures (.vtex_c) without Valve tools
tools/make_skins.py          rebuild all skin_* modules from game files via their recipe.json
```

## Making a sound module (no Valve tools)
```bash
modlock vpk unpack "<Deadlock>/game/citadel/pak01_dir.vpk" orig sounds/player/melee/shared/charged_melee_full.vsnd_c
python3 tools/vsnd.py build orig/sounds/player/melee/shared/charged_melee_full.vsnd_c my.ogg \
    modules/my_sound/assets/sounds/player/melee/shared/charged_melee_full.vsnd_c --onset --gain 6
```
`--onset` cuts everything before the main hit so it lands at 0 ms; `--seconds N` limits length. Find which file an
event plays with `modlock kv3 soundevents/....vsndevts_c` (see `Player.Melee.Hold.Shared`, `Nurse.Fear.Cast`).

The menu has tabs All / HUD / Sounds / Skins. HUD cards have an ON/OFF pill and settings rows; sound and skin
cards are informational (they are files inside the VPK, so changing them means rebuilding and restarting).

## Build
```bash
./build.sh            # needs modlock on PATH (https://github.com/paralin/modlock/releases), no Valve tools
```

## Writing a module
Create `modules/<name>/` with:
- `module.json` — `{ "id": "name", "kind": "hud", "name": "…", "description": "…", "scripts": ["module.js"], "panel": "panel.xml", "quick": "quick.xml" }`
  For sounds/skins: `{ "id": "x", "kind": "sound", "name": "…", "description": "…", "assets": "assets" }` and put compiled
  game files under `assets/` at their original paths; no JS needed.
- `module.js` — register once:
  ```js
  QolRegistry.register({
    id: "name", name: "Shown in menu", description: "one line",
    settings: [ { key: "size", label: "size", type: "number", def: 10, min: 4, max: 20, step: 2 },
                { key: "on",   label: "flag", type: "bool",   def: true },
                { key: "mode", label: "mode", type: "enum",   def: "a", options: ["a", "b"] } ],
    onChange: function (key, value) { /* apply */ },
    setEnabled: function (on) { /* show/hide */ },
  });
  ```
- `panel.xml` (optional) — Panorama XML inserted into the HUD root (use inline `style=`, no CSS files).
- `quick.xml` (optional) — buttons inserted into the quick bar next to ⚙.
Rename the folder to `_name` to leave it out of the build. Read settings with `QolRegistry.value(id, key)`,
store your own state with `QolSettings.set(id, key, v)`.

## Why not toggling whole VPKs in-game
Panorama VPKs mount at startup; the engine can't load or unload them while running. For enabling/disabling other
people's mods (skins, sounds) use the Deadlock Mod Manager; our menu covers everything *inside* this mod.

## Timings module
Schedule in `modules/timings/schedule.js` (City Never Sleeps, Oct 2026). Marks: press S/M/L when you clear a camp,
Sin for Sinner's Sacrifice, Mid when the mid boss dies (7/6/5 min respawn tracked automatically), Box when you break
a crate group. Settings: lookahead seconds, list rows, creep waves on/off, position (top / left / under crosshair).

## Routes module
Coordinates in `modules/routes/module.js` are minimap-relative placeholders. Enable a route, read
`[QolRoutes] minimap rect …` in the console and adjust. Settings: dot size, numbers, remember last route.

## Status (tested in Deadlock build 6821, Oct 27 2026)
Run in real Deadlock (hideout, sandbox, local bot match on dl_midtown):
- Match clock is the top bar's `GameTime` label; HUD hides in menu / hideout / hero select, shows in matches (also with the shop open).
- Timings strip and list match the game clock; menu, tabs, ON/OFF and settings work in-game.
- Box routes: crate clusters come from the map's entity lump (`tools/gen_routes.py`), placed with the minimap square
  measured from Panorama (`minimap_container` centre + `hud_minimap` size); verified pixel-exact against walker icons.
- Parry timer triggers on the game's own `#parry_unavailable` panel (appears on parry, hides when ready).
- Sounds: `tools/vsnd.py` builds `.vsnd_c` without Valve tools; the game plays them (verified with `soundinfo`).
- Not available in this build's Panorama: persistent storage (settings reset on restart), key binds outside focus.
- Debug overlay: build with `QOL_DEBUG=1 ./build.sh`.
