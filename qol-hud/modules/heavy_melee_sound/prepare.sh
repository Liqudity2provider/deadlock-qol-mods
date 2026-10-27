#!/usr/bin/env bash
# Lay out source/heavy_windup.wav at every path listed in sounds.txt -> boosted/<path>.wav (input for build.ps1).
# Optional: pass another wav/ogg/mp3 as $1; it is trimmed (leading silence), boosted and converted first.
set -euo pipefail
cd "$(dirname "$0")"
SRC="source/heavy_windup.wav"
if [ "${1:-}" != "" ]; then
  ffmpeg -v error -y -i "$1" -af "silenceremove=start_periods=1:start_threshold=-30dB:start_silence=0.005,volume=6dB,highshelf=f=3000:g=3,alimiter=limit=0.98:attack=1:release=40" -ar 44100 -ac 1 -c:a pcm_s16le "$SRC"
  echo "converted $1 -> $SRC"
fi
rm -rf boosted; n=0
while IFS= read -r line; do
  line="${line%%#*}"; line="$(echo "$line" | xargs)"; [ -z "$line" ] && continue
  out="boosted/${line%.vsnd}.wav"; mkdir -p "$(dirname "$out")"; cp "$SRC" "$out"; n=$((n+1)); echo "-> $out"
done < sounds.txt
[ "$n" -gt 0 ] || echo "sounds.txt has no paths yet: find them in-game with 'snd_showstart 3' (see README)"
