# Heavy melee: the hit lands at the start of the wind-up

Replaces `sounds/player/melee/shared/charged_melee_full.vsnd` (event `Player.Melee.Hold.Shared`, shared by every
hero). In-game timing from a bot match: this sound starts the heavy melee, the lunge follows 0.33-0.38 s later and the
swing ~0.8 s later. The replacement puts the loud part at ~60 ms, leaving ~0.3 s to parry.

Rebuild (no Valve tools needed):
```bash
python3 ../../tools/vsnd.py build <original charged_melee_full.vsnd_c> source/heavy_windup_original.ogg \
    assets/sounds/player/melee/shared/charged_melee_full.vsnd_c --onset --gain 6
```
`source/heavy_windup_ingame_preview.mp3` is exactly what plays in-game.

Older notes (CSDK route) are kept in git history.
