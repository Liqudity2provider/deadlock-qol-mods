#!/usr/bin/env python3
"""Assemble core + modules/*/ into src/, then compile src -> dist/pak57_dir.vpk with modlock.
Drop a folder into modules/ (module.json + module.js [+ panel.xml, quick.xml]) and it is picked up.
Disable a module at build time by renaming its folder to start with '_' (runtime on/off is in the in-game menu)."""
import json, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src"); MODS = os.path.join(HERE, "modules"); CORE = os.path.join(HERE, "core")
scripts_dir = os.path.join(SRC, "panorama", "scripts"); layout_dir = os.path.join(SRC, "panorama", "layout")
shutil.rmtree(SRC, ignore_errors=True); os.makedirs(scripts_dir); os.makedirs(layout_dir)
for f, out in (("settings.js", "qol_settings.js"), ("clock.js", "qol_clock.js"), ("menu.js", "qol_menu.js")):
    shutil.copy(os.path.join(CORE, f), os.path.join(scripts_dir, out))
includes, panels, quick = [], [], []
for name in sorted(os.listdir(MODS)):
    d = os.path.join(MODS, name)
    if name.startswith("_") or not os.path.isfile(os.path.join(d, "module.json")): continue
    m = json.load(open(os.path.join(d, "module.json")))
    for s in m["scripts"]:
        out = f"mod_{m['id']}_{os.path.splitext(s)[0]}.js"; shutil.copy(os.path.join(d, s), os.path.join(scripts_dir, out))
        includes.append(f'    <include src="s2r://panorama/scripts/{out[:-3]}.vjs_c" />')
    if m.get("panel"): panels.append(open(os.path.join(d, m["panel"])).read().rstrip())
    if m.get("quick"): quick.append(open(os.path.join(d, m["quick"])).read().rstrip())
    print("module:", m["id"])
tpl = open(os.path.join(CORE, "base_hud.template.xml")).read()
tpl = tpl.replace("<!-- MODULE_SCRIPTS -->", "\n".join(includes)).replace("<!-- MODULE_PANELS -->", "\n\n".join(panels)).replace("<!-- MODULE_QUICK -->", "\n".join(quick))
open(os.path.join(layout_dir, "base_hud.xml"), "w").write(tpl)
os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
modlock = os.environ.get("MODLOCK", "modlock")
out = os.path.join(HERE, "dist", "pak57_dir.vpk")
subprocess.check_call([modlock, "panorama", "compile", SRC, "--addon", "qolhud", "-o", out])
subprocess.check_call([modlock, "vpk", "list", out])
print("->", out)
