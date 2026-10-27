# QoL HUD — modular Deadlock HUD mod with an in-game settings menu

One VPK, several modules, a ⚙ button on the HUD. Each module can be switched on/off and configured in the menu while
playing; settings persist between matches when the game exposes `$.persistentStorage` (CS2-era Panorama does; if not,
the menu says so and settings last for the session).

```
core/                        settings store, module registry, menu, match clock, base_hud template
modules/timings/             upcoming objectives strip + marks (S/M/L/Sin/Mid/Box buttons)        [hud]
modules/routes/              box routes as numbered dots over the minimap                          [hud]
modules/parry/               parry window + whiff cooldown bar under the crosshair                 [hud]
modules/ults/                enemy ult tracker: 6 rows, click when used                            [hud]
modules/heavy_melee_sound/   louder heavy-melee wind-up (compiled sounds in assets/)               [sound]
modules/_example_skin/       template for texture/model replacements                              [skin]
config.json                  {"disabled": [...]} build-time switch; VERSION shown in the menu
build.py                     assembles core + modules -> src/ -> dist/pak57_dir.vpk (modlock)
```

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

## Status
Compiles; **not yet run in-game**. Unknowns: clock label text, `base_hud.xml` still being the HUD root,
`$.persistentStorage` availability. Each has a fallback.
