# Heavy melee: the hit lands at the start of the wind-up

Replaces `sounds/player/melee/shared/charged_melee_full.vsnd` (event `Player.Melee.Hold.Shared`, shared by every
hero). In-game timing from a bot match: this sound starts the heavy melee, the lunge follows 0.33-0.38 s later and the
swing ~0.8 s later. The replacement puts the loud part at ~60 ms, leaving ~0.3 s to parry.

Rebuild (no Valve tools needed):
```bash
python3 ../../tools/vsnd.py build <original charged_melee_full.vsnd_c> source/heavy_windup_original.ogg \
    assets/sounds/player/melee/shared/charged_melee_full.vsnd_c --onset --gain 18
```
`source/heavy_windup_ingame_preview.mp3` is exactly what plays in-game.

The file itself is already at full scale (limiter, ~-5 LUFS), so the event is boosted too:
`assets/soundevents/player.vsndevts_c` is the game's own file (build 6821) with `Player.Melee.Hold.Shared` patched:
volume 4 -> 10 dB, own heavy -5 -> 0, allies -6 -> -2, "enemy facing you" boost range 500/1000 -> 1500/2500 units.
It replaces the whole player soundevents file, so rebuild it after a game update changes that file:
```bash
python3 ../../tools/kv3patch.py set <game soundevents/player.vsndevts_c> assets/soundevents/player.vsndevts_c \
    "Player.Melee.Hold.Shared/volume=10" "Player.Melee.Hold.Shared/volume_offset_player=0" \
    "Player.Melee.Hold.Shared/volume_offset_team=-2" \
    "Player.Melee.Hold.Shared/cone_facing_boost_min_distance=1500" "Player.Melee.Hold.Shared/cone_facing_boost_max_distance=2500"
```

Older notes (CSDK route) are kept in git history.
