# Nurse Harrow ult → "Ты не бойся ночи" (ENZRO)

Replaces the ultimate's sound with a clip of the track. Two clips are prepared in `source/`:
`harrow_ult_8s.wav` (first 8 s, leading silence trimmed, normalized to -12 LUFS, fade-out) and `harrow_ult_full.wav` (28 s).
Pick the length that matches the ult's real duration: the engine stops a one-shot sound only when the event ends, so a
clip longer than the ult keeps playing.

1. Find the ult sound paths in-game: `snd_showstart 3`, use the ult, copy the `sounds/…vsnd` lines into `sounds.txt`.
2. `./prepare.sh` (or `./prepare.sh source/harrow_ult_full.wav`) → `boosted/`.
3. Windows + CSDK 12: `..\heavy_melee_sound\build.ps1 -Csdk D:\Reduced_CSDK_12 -Boosted boosted -Out assets` → compiled `.vsnd_c` land in `assets/`.
4. `../../build.sh` packs it into `pak57_dir.vpk`; the menu shows the pack on the Sounds tab.

The track is copyrighted: `source/` is excluded from the public repo. Build it for yourself and friends.
