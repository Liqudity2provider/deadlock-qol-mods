#!/usr/bin/env bash
# Copy the chosen clip to every path in sounds.txt -> boosted/<path>.wav, then compile with ../heavy_melee_sound/build.ps1 -Boosted boosted -Out assets
set -euo pipefail; cd "$(dirname "$0")"
CLIP="${1:-source/harrow_ult_8s.wav}"
rm -rf boosted; n=0
while IFS= read -r line; do
  line="${line%%#*}"; line="$(echo "$line" | xargs)"; [ -z "$line" ] && continue
  out="boosted/${line%.vsnd}.wav"; mkdir -p "$(dirname "$out")"; cp "$CLIP" "$out"; n=$((n+1)); echo "-> $out"
done < sounds.txt
[ "$n" -gt 0 ] || echo "sounds.txt has no paths yet (snd_showstart 3 in-game)"
