# Mod ideas catalog

What the vanilla client allows: **HUD** (Panorama XML/JS over the real HUD, reads only what the HUD shows),
**sounds** (replace compiled sound files), **skins/textures/models** (replace compiled assets). No game-state API,
no memory, no network: everything below respects that. ✅ built · 🔧 scaffolded · 💡 idea.

## HUD modules (toggle + settings in the ⚙ menu)
| | Module | What | Notes |
|---|---|---|---|
| ✅ | Timings | next-15 s strip + list: urn, bridge buff, camps, crates, mid, rift, waves; S/M/L/Sin/Mid/Box marks | tested in-game, reads the real match clock |
| ✅ | Box routes | crate clusters from the real map entities, numbered pickup order over the minimap | tested in-game, pixel-exact placement |
| ✅ | Parry timer | 0.75 s window + cooldown, triggered by the game's own parry indicator | tested in-game |
| ✅ | Enemy ult tracker | 6 rows, click when an enemy ults → countdown from base ult CD; right-click sets hero | renders in-game; roster auto-read is best effort |
| 💡 | Souls/min | SPM and net-worth delta vs lane opponent from the top bar numbers | pure label math |
| 💡 | Deny/last-hit counter | your lane CS from the scoreboard, pace vs par (e.g. 60 by 10:00) | |
| 💡 | Death timer + buyback-style hints | respawn countdown bigger, "what's up when you're back" | reads `respawn_timer` |
| 💡 | Zipline boost reminder | 2-min boost cooldown after use, small icon near minimap | manual mark or modifier scan |
| 💡 | Objective HP strip | guardian/walker HP of all lanes in one row | from `objectives_health_friendly` |
| 💡 | Big stamina pips | larger, color-coded stamina under crosshair | |
| 💡 | Ammo/reload bar | reload progress bar + "last mag" warning | |
| 💡 | Minimap zoom | enlarge minimap panel, optional square | CSS-free: inline style on the container |
| 💡 | Damage report popup | last fight breakdown after death, who hit you with what | from `CitadelHudDamageReport` |
| 💡 | Combat log filter | only parries/stuns/ult casts in the chat area | |
| 💡 | Chat macros | buttons: "mid boss", "urn left", "ult ready" | if chat send is exposed to Panorama |
| 💡 | Shop quick-buy | 6 favorite items as buttons when shop is open | needs purchase API exposed to UI |
| 💡 | Hero notes | your own notes per matchup, shown at hero select | persistent storage |
| 💡 | Streamer mode | hide names/avatars, big clean HUD | |

## Sound packs (baked into the VPK, listed in the menu as "restart to change")
| | Pack | What |
|---|---|---|
| ✅ | Heavy melee cue | hit lands at ~60 ms of the wind-up (lunge is at ~350 ms) so you can parry; tested in-game |
| ✅ | Nurse Harrow ult song | 8 s clip on `Nurse.Fear.Cast`; tested in-game (local only, copyrighted track) |
| 💡 | Parry success ding | distinct high "tink" on successful parry |
| 💡 | Hitmarker boost | louder/shorter hit confirm, headshot variant |
| 💡 | Quiet own gun | -6 dB on your weapon so you hear footsteps and ults |
| 💡 | Ult callouts | enemy ult voicelines replaced with clean English callouts ("SEVEN ULT") |
| 💡 | Urn/mid/rift alarms | replace announcer stingers with short, unmistakable alarms |
| 💡 | Low-ammo click | audible click on last 20% of the mag |
| 💡 | Kill sound packs | CS-style or custom kill/headshot sounds |
| 💡 | Footstep boost | louder enemy footsteps (if separate files; often shared with own) |
| 💡 | Chat ping sounds | distinct ping sound per lane |

## Skins & visuals (baked)
| | Pack | What |
|---|---|---|
| 🔧 | Example skin template | folder + workflow |
| 💡 | High-contrast enemy recolors | bright hero textures for enemies (only if enemy/ally materials differ; otherwise per-hero) |
| 💡 | Clean item icons | flat, high-contrast item icons in shop/HUD |
| 💡 | Minimap hero icons | bigger, readable icons |
| 💡 | Weapon skins | per-hero gun textures |
| 💡 | Crosshair textures | custom crosshair sprites (beyond the in-game options) |
| 💡 | Loading screens / menu art | your team's art in the lobby |
| 💡 | Font pack | heavier, Cyrillic-friendly HUD font |
| 💡 | Zipline/ability VFX recolor | recolor particle textures for readability |
| 💡 | Soul orb glow | brighter orbs for easier last hits/denies |

## Not possible client-side (needs a server mod, i.e. our training servers)
3D route lines in the world (Panorama has no camera / player position API), knowing whether a crate was already broken,
enemy heavy-melee wind-up indicator, true respawn timers for camps/boxes without marks,
auto-detected ult usage, anything that changes gameplay.
