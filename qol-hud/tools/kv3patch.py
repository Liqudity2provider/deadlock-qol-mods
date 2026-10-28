#!/usr/bin/env python3
"""Read / patch numbers inside a compiled resource's binary KeyValues3 (v5, e.g. soundevents/*.vsndevts_c) in place.

Values keep their stored type and size, so no re-encoder is needed: only the lane bytes change, then the buffer is
re-compressed. Paths use "/" between keys (event names contain dots).

  kv3patch.py dump FILE [PREFIX]                         print path = value (type) for every scalar
  kv3patch.py set  FILE OUT "Player.Melee.Hold.Shared/volume=10" ...
"""
import argparse, struct, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vsnd

# KV3BinaryNodeType (ValveResourceFormat)
NULL, BOOLEAN, INT64, UINT64, DOUBLE, STRING, BLOB, ARRAY, OBJECT, ARRAY_TYPED = 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
INT32, UINT32, TRUE_, FALSE_, INT64_0, INT64_1, DOUBLE_0, DOUBLE_1, FLOAT, INT16, UINT16 = 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21
UINT32_0, UINT32_1, ARRAY_BYTELEN, ARRAY_AUX, INT8, UINT8 = 22, 23, 24, 25, 26, 27   # 22+ only seen in v4/v5
CONST = {NULL: None, TRUE_: True, FALSE_: False, INT64_0: 0, INT64_1: 1, DOUBLE_0: 0.0, DOUBLE_1: 1.0, UINT32_0: 0, UINT32_1: 1}
LANE = {BOOLEAN: (1, "<B"), INT8: (1, "<b"), UINT8: (1, "<B"), INT16: (2, "<h"), UINT16: (2, "<H"), INT32: (4, "<i"),
        UINT32: (4, "<I"), FLOAT: (4, "<f"), INT64: (8, "<q"), UINT64: (8, "<Q"), DOUBLE: (8, "<d")}


def align(o, n): return (o + n - 1) & ~(n - 1)


class Lanes:
    """Read cursors over the 1/2/4/8-byte lanes of one decompressed buffer; remembers absolute offsets."""
    def __init__(self, buf, start, counts):
        self.buf, self.pos, o = buf, {}, start
        for size, n in zip((1, 2, 4, 8), counts):
            if n: o = align(o, size); self.pos[size] = o; o += n * size
            else: self.pos[size] = o
        self.end = o

    def take(self, size, fmt):
        o = self.pos[size]; self.pos[size] += size
        return o, struct.unpack_from(fmt, self.buf, o)[0]


class Doc:
    def __init__(self, data):
        self.R = vsnd.parse_resource(data); self.data = data
        i = next(i for i, b in enumerate(self.R["blocks"]) if b[0] in (b"DATA", b"CTRL") and data[b[1]:b[1] + 4] == b"\x05" + b"3VK")
        self.block = i; t, off, sz = self.R["blocks"][i]
        self.H, self.names, b1, b2, self.rest = vsnd.kv3_split(data[off:off + sz])
        H = self.H
        if H["cblocks"]: raise SystemExit("binary blobs not supported")
        self.b1, self.b2 = b1, b2
        aux = Lanes(b1, 0, (H["cb1"], H["cb2"], H["cb4"], H["cb8"]))
        nstr = struct.unpack_from("<i", b1, aux.pos[4])[0]; aux.pos[4] += 4
        p = aux.pos[1]; self.strings = []                       # strings live in buffer 1's byte lane
        for _ in range(nstr):
            e = b1.index(0, p); self.strings.append(b1[p:e].decode("utf8", "replace")); p = e + 1
        aux.pos[1] = p
        self.aux = aux
        self.objlen_pos = 0
        self.main = Lanes(b2, H["cobjb2"] * 4, (H["cb1b2"], H["cb2b2"], H["cb4b2"], H["cb8b2"]))
        self.types, self.tp = b2, self.main.end
        self.leaves = {}                                         # path -> (buffer, offset, type, value)
        self.root = self.value("", *self.typ(), self.main)

    def typ(self):
        b = self.types[self.tp]; self.tp += 1; flag = 0
        if b & 0x80: flag = self.types[self.tp]; self.tp += 1
        if b & 0x40: self.tp += 1
        return b & 0x3F, flag

    def leaf(self, path, lanes, t):
        size, fmt = LANE[t]; o, v = lanes.take(size, fmt)
        self.leaves[path] = (lanes.buf, o, t, v); return v

    def value(self, path, t, flag, lanes):
        if t in CONST: return CONST[t]
        if t in LANE: return self.leaf(path, lanes, t)
        if t == STRING:
            _, i = self.main.take(4, "<i"); return self.strings[i] if 0 <= i < len(self.strings) else ""
        if t == ARRAY:
            _, n = self.main.take(4, "<i")
            return [self.value(f"{path}/{k}", *self.typ(), self.main) for k in range(n)]
        if t in (ARRAY_TYPED, ARRAY_BYTELEN, ARRAY_AUX):
            _, n = self.main.take(4, "<i") if t == ARRAY_TYPED else self.main.take(1, "<B")
            st, sf = self.typ(); el = self.aux if t == ARRAY_AUX else self.main
            return [self.value(f"{path}/{k}", st, sf, el) for k in range(n)]
        if t == OBJECT:
            n = struct.unpack_from("<i", self.b2, self.objlen_pos)[0]; self.objlen_pos += 4
            obj = {}
            for _ in range(n):
                ct, cf = self.typ()
                _, ki = self.main.take(4, "<i"); key = self.strings[ki] if 0 <= ki < len(self.strings) else ""
                obj[key] = self.value(f"{path}/{key}" if path else key, ct, cf, self.main)
            return obj
        raise SystemExit(f"unsupported KV3 node type {t} at {path!r}")

    def set(self, path, v):
        if path not in self.leaves: raise SystemExit(f"{path}: not a stored number (missing, or a constant like 0/1)")
        buf, o, t, old = self.leaves[path]; size, fmt = LANE[t]
        new = float(v) if t in (FLOAT, DOUBLE) else int(float(v))
        struct.pack_into(fmt, buf, o, new); return old, new

    def save(self):
        ctrl = vsnd.kv3_join(self.H, self.names, self.b1, self.b2, self.rest)
        blocks = [self.data[o:o + s] for _, o, s in self.R["blocks"]]; blocks[self.block] = ctrl
        return vsnd.build_resource(self.R, blocks) + self.R["tail"]


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("dump"); d.add_argument("file"); d.add_argument("prefix", nargs="?", default="")
    s = sub.add_parser("set"); s.add_argument("file"); s.add_argument("out"); s.add_argument("assign", nargs="+")
    a = ap.parse_args()
    doc = Doc(open(a.file, "rb").read())
    if a.cmd == "dump":
        for p, (_, _, t, v) in doc.leaves.items():
            if p.startswith(a.prefix): print(f"{p} = {v} (type {t})")
        return
    for asg in a.assign:
        p, v = asg.rsplit("=", 1); old, new = doc.set(p, v); print(f"{p}: {old} -> {new}")
    open(a.out, "wb").write(doc.save())


if __name__ == "__main__":
    main()
