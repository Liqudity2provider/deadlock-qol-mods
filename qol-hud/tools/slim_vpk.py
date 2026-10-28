#!/usr/bin/env python3
"""Make a heavy skin mod lighter: cap every texture at --max px (drops the top mips, no re-encode) and remove
editor-only files, then repack.

  slim_vpk.py IN.vpk OUT.vpk [--max 1024] [--keep-work]

Needs modlock (MODLOCK env or PATH) for unpack/pack.
"""
import argparse, os, shutil, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vtex

JUNK = ("tools_thumbnail_cache.bin", "tools_asset_info.bin")   # written by the authoring tools, never read by the game


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out"); ap.add_argument("--max", type=int, default=1024); ap.add_argument("--keep-work", action="store_true")
    a = ap.parse_args()
    modlock = os.environ.get("MODLOCK", "modlock")
    work = tempfile.mkdtemp(prefix="slim_")
    subprocess.check_call([modlock, "vpk", "unpack", a.src, work], stdout=subprocess.DEVNULL)
    shrunk = skipped = 0; before = after = 0
    for root, _, files in os.walk(work):
        for fn in files:
            p = os.path.join(root, fn)
            if fn in JUNK and root == work:
                before += os.path.getsize(p); os.remove(p); continue
            if not fn.endswith(".vtex_c"): continue
            d = open(p, "rb").read(); before += len(d)
            out = vtex.shrink(d, a.max)
            if out is None:
                after += len(d)
                if max(vtex.header(d)["w"], vtex.header(d)["h"]) > a.max: skipped += 1; print("kept as is:", os.path.relpath(p, work))
                continue
            open(p, "wb").write(out); after += len(out); shrunk += 1
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    subprocess.check_call([modlock, "vpk", "pack", work, a.out], stdout=subprocess.DEVNULL)
    print(f"{shrunk} textures capped at {a.max}px, {skipped} too big but unsupported; "
          f"textures+junk {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB; {os.path.getsize(a.src) / 1e6:.1f} MB -> {os.path.getsize(a.out) / 1e6:.1f} MB")
    if a.keep_work: print("work dir:", work)
    else: shutil.rmtree(work)


if __name__ == "__main__":
    main()
