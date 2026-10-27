# Nurse Harrow ult -> "Ты не бойся ночи" (ENZRO)

Nurse Harrow is `hero_nurse` internally; her ult casts the event `Nurse.Fear.Cast`, which plays
`sounds/abilities/nurse/nurse_fear_channel_start.vsnd`. We replace that file with an 8 s clip of the track
(leading silence trimmed, normalized, fade-out). Verified in-game: the sound still plays at 7.1 s (original is 3.97 s).

```bash
python3 ../../tools/vsnd.py build <original nurse_fear_channel_start.vsnd_c> source/harrow_ult_8s.wav \
    assets/sounds/abilities/nurse/nurse_fear_channel_start.vsnd_c --seconds 8
```
The track is copyrighted: `source/` and the compiled asset are not in the public repo, and public releases build
with this module disabled (`config.public.json`).
