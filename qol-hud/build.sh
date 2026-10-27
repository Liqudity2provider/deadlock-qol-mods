#!/usr/bin/env bash
# Compiles src/ -> dist/pak57_dir.vpk with modlock (no Valve tools needed; we use no CSS files, only inline styles).
set -euo pipefail
cd "$(dirname "$0")"
MODLOCK="${MODLOCK:-modlock}"
command -v "$MODLOCK" >/dev/null || { echo "modlock not found: https://github.com/paralin/modlock/releases"; exit 1; }
mkdir -p dist
"$MODLOCK" panorama compile src --addon qolhud -o dist/pak57_dir.vpk
"$MODLOCK" vpk list dist/pak57_dir.vpk
echo "-> dist/pak57_dir.vpk  (copy to Deadlock/game/citadel/addons/)"
