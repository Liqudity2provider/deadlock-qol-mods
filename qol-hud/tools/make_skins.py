#!/usr/bin/env python3
"""Rebuild skin module assets from the game's own textures using each module's recipe.json.

  make_skins.py "<Deadlock>/game/citadel/pak01_dir.vpk"        (needs modlock on PATH)
Compiled textures are large, so they are not kept in git; this regenerates them (and is what the release does).
"""
import json, os, subprocess, sys, tempfile, glob
HERE = os.path.dirname(os.path.abspath(__file__)); MODS = os.path.join(HERE, "..", "modules")
vpk = sys.argv[1]; modlock = os.environ.get("MODLOCK", "modlock")
for recipe in glob.glob(os.path.join(MODS, "skin_*", "recipe.json")):
    mod = os.path.dirname(recipe); r = json.load(open(recipe))
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.check_call([modlock, "vpk", "unpack", vpk, tmp] + [t["path"] for t in r["textures"]])
        for t in r["textures"]:
            out = os.path.join(mod, "assets", t["path"]); os.makedirs(os.path.dirname(out), exist_ok=True)
            subprocess.check_call([sys.executable, os.path.join(HERE, "vtex.py"), "recolor", os.path.join(tmp, t["path"]), out] + t["args"])
    print("built", os.path.basename(mod))
