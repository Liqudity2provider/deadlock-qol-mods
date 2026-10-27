#!/usr/bin/env python3
"""Recolor / replace a Deadlock .vtex_c texture without Valve's resource compiler (BC7 / DXT1 / DXT5, 2D, no mip compression).

The texel payload follows the resource header, mips from smallest to largest. We keep the header (same size, format,
mip count) and rewrite the payload: decode mip 0, edit, rebuild the mip chain, re-encode.

  vtex.py info   FILE.vtex_c
  vtex.py export FILE.vtex_c OUT.png
  vtex.py recolor FILE.vtex_c OUT.vtex_c [--hue DEG] [--sat X] [--val X] [--tint #rrggbb --tint-amount 0..1]
                 [--hue-from DEG --hue-to DEG]   (only touch pixels whose hue is in that range)  [--preview OUT.png]
  vtex.py replace FILE.vtex_c IMAGE.png OUT.vtex_c          (image is resized to the texture size)
"""
import argparse, struct, sys, os
import numpy as np
from PIL import Image
import etcpak, texture2ddecoder

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vsnd  # resource parsing helpers

FMT = {1: "DXT1", 2: "DXT5", 20: "BC7"}
BLOCK_BYTES = {1: 8, 2: 16, 20: 16}


def header(d):
    R = vsnd.parse_resource(d)
    t, o, s = [b for b in R["blocks"] if b[0] == b"DATA"][0]
    ver, flags = struct.unpack_from("<HH", d, o)
    w, h, depth = struct.unpack_from("<HHH", d, o + 20)
    fmt, mips = d[o + 26], d[o + 27]
    eo, ec = struct.unpack_from("<II", d, o + 32)
    extra = []
    p = o + 32 + eo
    for i in range(ec):
        typ, off, sz = struct.unpack_from("<III", d, p + i * 12); extra.append(typ)
    return {"R": R, "w": w, "h": h, "depth": depth, "fmt": fmt, "mips": mips, "flags": flags, "extra": extra}


def mip_dims(w, h, i):
    return max(1, w >> i), max(1, h >> i)


def mip_bytes(fmt, w, h):
    return max(1, (w + 3) // 4) * max(1, (h + 3) // 4) * BLOCK_BYTES[fmt]


def check(H, d):
    if H["fmt"] not in FMT: raise SystemExit("unsupported format %d" % H["fmt"])
    if H["depth"] != 1 or (H["flags"] & 0x0F): raise SystemExit("only plain 2D textures")
    if 4 in H["extra"]: raise SystemExit("mip-compressed textures not supported yet")
    total = sum(mip_bytes(H["fmt"], *mip_dims(H["w"], H["h"], i)) for i in range(H["mips"]))
    if total != len(H["R"]["tail"]): raise SystemExit("payload size mismatch: expected %d, file has %d" % (total, len(H["R"]["tail"])))


def decode_mip0(d, H):
    tail = H["R"]["tail"]
    off = sum(mip_bytes(H["fmt"], *mip_dims(H["w"], H["h"], i)) for i in range(1, H["mips"]))
    data = tail[off:off + mip_bytes(H["fmt"], H["w"], H["h"])]
    dec = {20: texture2ddecoder.decode_bc7, 2: texture2ddecoder.decode_bc3, 1: texture2ddecoder.decode_bc1}[H["fmt"]](data, H["w"], H["h"])
    return Image.frombytes("RGBA", (H["w"], H["h"]), dec, "raw", "BGRA")


def encode_chain(img, H):
    out = []
    for i in range(H["mips"] - 1, -1, -1):                         # smallest first
        mw, mh = mip_dims(H["w"], H["h"], i)
        m = img if i == 0 else img.resize((mw, mh), Image.LANCZOS)
        bw, bh = max(4, mw), max(4, mh)
        if (bw, bh) != (mw, mh): m = m.resize((bw, bh), Image.NEAREST)
        raw = m.convert("RGBA").tobytes()
        enc = {20: etcpak.compress_bc7, 2: etcpak.compress_bc3, 1: etcpak.compress_bc1}[H["fmt"]](raw, bw, bh)
        assert len(enc) == mip_bytes(H["fmt"], mw, mh), (i, len(enc), mip_bytes(H["fmt"], mw, mh))
        out.append(enc)
    return b"".join(out)


def recolor(img, hue=0.0, sat=1.0, val=1.0, tint=None, tint_amount=0.0, hue_from=None, hue_to=None):
    a = np.asarray(img.convert("RGBA")).astype(np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3:]
    hsv = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8), "RGB").convert("HSV")).astype(np.float32)
    H_, S_, V_ = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    mask = np.ones_like(H_)
    if hue_from is not None and hue_to is not None:
        lo, hi = hue_from % 360, hue_to % 360
        inside = (H_ >= lo) & (H_ <= hi) if lo <= hi else (H_ >= lo) | (H_ <= hi)
        mask = (inside & (S_ > 0.12)).astype(np.float32)
        mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize(mask.shape[::-1])).astype(np.float32) / 255
    H2 = (H_ + hue * mask) % 360
    S2 = np.clip(S_ * (1 + (sat - 1) * mask), 0, 1)
    V2 = np.clip(V_ * (1 + (val - 1) * mask), 0, 1)
    hsv2 = np.stack([H2 * 255 / 360, S2 * 255, V2 * 255], -1).astype(np.uint8)
    rgb2 = np.asarray(Image.fromarray(hsv2, "HSV").convert("RGB")).astype(np.float32) / 255
    if tint:
        t = np.array([int(tint[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
        lum = rgb2.mean(-1, keepdims=True)
        rgb2 = rgb2 * (1 - tint_amount * mask[..., None]) + (lum * t * 1.6).clip(0, 1) * tint_amount * mask[..., None]
    out = np.concatenate([rgb2, alpha], -1)
    return Image.fromarray((out.clip(0, 1) * 255).astype(np.uint8), "RGBA")


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("info"); a.add_argument("file")
    e = sub.add_parser("export"); e.add_argument("file"); e.add_argument("png")
    r = sub.add_parser("recolor"); r.add_argument("file"); r.add_argument("out")
    for k, t, dv in (("--hue", float, 0.0), ("--sat", float, 1.0), ("--val", float, 1.0), ("--tint-amount", float, 0.0), ("--hue-from", float, None), ("--hue-to", float, None)):
        r.add_argument(k, type=t, default=dv)
    r.add_argument("--tint"); r.add_argument("--preview")
    p = sub.add_parser("replace"); p.add_argument("file"); p.add_argument("image"); p.add_argument("out")
    args = ap.parse_args()
    d = open(args.file, "rb").read(); H = header(d)
    if args.cmd == "info":
        print({k: H[k] for k in ("w", "h", "fmt", "mips", "flags", "extra")}, FMT.get(H["fmt"]), "payload", len(H["R"]["tail"])); return
    check(H, d)
    img = decode_mip0(d, H)
    if args.cmd == "export": img.save(args.png); return
    if args.cmd == "recolor":
        img = recolor(img, args.hue, args.sat, args.val, args.tint, args.tint_amount, args.hue_from, args.hue_to)
        if args.preview: img.convert("RGB").resize((512, 512)).save(args.preview)
    else:
        img = Image.open(args.image).convert("RGBA").resize((H["w"], H["h"]), Image.LANCZOS)
    payload = encode_chain(img, H)
    assert len(payload) == len(H["R"]["tail"])
    open(args.out, "wb").write(d[:H["R"]["size"]] + payload)
    print({"out": args.out, "bytes": H["R"]["size"] + len(payload)})


if __name__ == "__main__":
    main()
