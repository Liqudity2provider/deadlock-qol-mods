#!/usr/bin/env bash
# Boost + sharpen every wav under $1 into $2 (same relative paths). Needs ffmpeg.
set -euo pipefail
SRC="${1:?src dir}"; DST="${2:?dst dir}"
GAIN_DB="${GAIN_DB:-9}"; SHELF_DB="${SHELF_DB:-4}"; SHELF_HZ="${SHELF_HZ:-3000}"
find "$SRC" -type f -name '*.wav' | while read -r f; do
  rel="${f#$SRC/}"; mkdir -p "$DST/$(dirname "$rel")"
  ffmpeg -loglevel error -y -i "$f" \
    -af "volume=${GAIN_DB}dB,highshelf=f=${SHELF_HZ}:g=${SHELF_DB},alimiter=limit=0.98:attack=2:release=50" \
    -c:a pcm_s16le "$DST/$rel"
  echo "boosted $rel"
done
