#!/usr/bin/env python3
"""Build a Deadlock .vsnd_c from any audio file, without Valve's resource compiler.

A compiled sound is a Source 2 resource (RED2 + DATA + CTRL blocks) followed by raw MP3 frames.
CTRL holds KeyValues3 v5 describing the sound (m_nRate, m_nChannels, m_nSampleCount, m_flDuration,
m_nStreamingSize, ...). We take the ORIGINAL game file as a template, swap the MP3 payload and patch those
fields inside the decompressed KV3 buffers, then re-compress (LZ4) and re-assemble the resource.

  vsnd.py info  FILE.vsnd_c
  vsnd.py build TEMPLATE.vsnd_c INPUT_AUDIO OUT.vsnd_c [--seconds N] [--gain DB] [--bitrate 192k]
"""
import argparse, json, os, shutil, struct, subprocess, sys, tempfile
import lz4.block

KV3_HDR_V5 = struct.Struct("<4s16sIHHiiiiHHiiii" + "ii" + "iiiiiiiiiiii")  # v2+ fields, v4 (+2), v5 (+12)


def parse_resource(d):
    size, hv, ver, boff, bcnt = struct.unpack_from("<IHHII", d, 0)
    blocks, base = [], 8 + boff
    for i in range(bcnt):
        o = base + i * 12
        t = d[o:o + 4]; ro, rs = struct.unpack_from("<II", d, o + 4)
        blocks.append([t, o + 4 + ro, rs])
    return {"size": size, "hv": hv, "ver": ver, "boff": boff, "blocks": blocks, "tail": d[size:]}


def kv3_split(ctrl):
    h = list(KV3_HDR_V5.unpack_from(ctrl, 0))
    names = ["magic", "guid", "method", "dict", "frame", "cb1", "cb4", "cb8", "ctypes", "cobj", "carr", "su_total", "sc_total",
             "cblocks", "sblobs", "cb2", "sblockcs", "su1", "sc1", "su2", "sc2", "cb1b2", "cb2b2", "cb4b2", "cb8b2", "cnodes", "cobjb2", "carr2", "carrel"]
    H = dict(zip(names, h))
    if H["magic"][1:] != b"3VK" or H["magic"][0] != 5:
        raise SystemExit("CTRL is not KV3 v5")
    if H["cblocks"] != 0:
        raise SystemExit("KV3 with binary blobs not supported")
    p = KV3_HDR_V5.size
    c1 = ctrl[p:p + H["sc1"]]; c2 = ctrl[p + H["sc1"]:p + H["sc1"] + H["sc2"]]
    rest = ctrl[p + H["sc1"] + H["sc2"]:]
    if H["method"] == 1:
        b1 = lz4.block.decompress(c1, uncompressed_size=H["su1"]); b2 = lz4.block.decompress(c2, uncompressed_size=H["su2"])
    elif H["method"] == 0:
        b1, b2 = c1, c2
    else:
        raise SystemExit("unsupported KV3 compression %d" % H["method"])
    return H, names, bytearray(b1), bytearray(b2), rest


def kv3_join(H, names, b1, b2, rest):
    H = dict(H)
    if H["method"] == 1:
        c1 = lz4.block.compress(bytes(b1), store_size=False); c2 = lz4.block.compress(bytes(b2), store_size=False)
    else:
        c1, c2 = bytes(b1), bytes(b2)
    H["su1"], H["sc1"], H["su2"], H["sc2"] = len(b1), len(c1), len(b2), len(c2)
    H["su_total"] = len(b1) + len(b2)
    H["sc_total"] = len(c1) + len(c2)
    return KV3_HDR_V5.pack(*[H[n] for n in names]) + c1 + c2 + rest


def build_resource(R, new_blocks_data):
    """new_blocks_data: list of bytes per block, same order/types. Keeps 16-byte block alignment like the originals."""
    bcnt = len(R["blocks"])
    head_len = 16 + bcnt * 12
    pos = (head_len + 15) & ~15
    offsets = []
    body = bytearray()
    for i, data in enumerate(new_blocks_data):
        if i > 0:
            pos = (pos + 15) & ~15
        offsets.append(pos)
        need = pos - head_len - len(body)
        body += b"\0" * need + data
        pos += len(data)
    total = head_len + len(body)
    out = bytearray(struct.pack("<IHHII", total, R["hv"], R["ver"], 8, bcnt))
    for i, (t, _, _) in enumerate(R["blocks"]):
        field = 16 + i * 12 + 4
        out += t + struct.pack("<II", offsets[i] - field, len(new_blocks_data[i]))
    out += body
    assert len(out) == total
    return bytes(out)


def mp3_frames(buf):
    """Count MPEG-1 Layer III audio frames (skips Xing/Info frames). Returns (frames, samples_per_frame, rate, channels)."""
    rates = [44100, 48000, 32000]; brs = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    i, n, rate, ch = 0, 0, None, None
    while i + 4 <= len(buf):
        if buf[i] == 0xFF and (buf[i + 1] & 0xE0) == 0xE0:
            b1, b2, b3 = buf[i + 1], buf[i + 2], buf[i + 3]
            if (b1 >> 3) & 3 != 3 or (b1 >> 1) & 3 != 1:  # MPEG1, Layer III only
                i += 1; continue
            bri, sri, pad = b2 >> 4, (b2 >> 2) & 3, (b2 >> 1) & 1
            if bri in (0, 15) or sri == 3:
                i += 1; continue
            rate = rates[sri]; ch = 1 if (b3 >> 6) == 3 else 2
            flen = 144000 * brs[bri] // rate + pad
            side = 17 if ch == 1 else 32
            tag = buf[i + 4 + side:i + 8 + side]
            if tag not in (b"Xing", b"Info"):
                n += 1
            i += flen
        else:
            i += 1
    return n, 1152, rate, ch


def patch_lane(buf, old, new, fmt):
    ob, nb = struct.pack(fmt, old), struct.pack(fmt, new)
    hits = [k for k in range(len(buf) - len(ob) + 1) if buf[k:k + len(ob)] == ob]
    for k in hits:
        buf[k:k + len(nb)] = nb
    return len(hits)


def info(path):
    d = open(path, "rb").read(); R = parse_resource(d)
    ctrl_i = [i for i, b in enumerate(R["blocks"]) if b[0] == b"CTRL"][0]
    t, off, sz = R["blocks"][ctrl_i]
    H, names, b1, b2, rest = kv3_split(d[off:off + sz])
    f, spf, rate, ch = mp3_frames(R["tail"])
    return {"resource": R["size"], "audio_bytes": len(R["tail"]), "mp3_frames": f, "rate": rate, "channels": ch,
            "kv3": {k: H[k] for k in ("method", "su1", "sc1", "su2", "sc2", "cb4b2", "cb8b2")}}


def find_onset(audio, threshold=0.5, preroll=0.02):
    """Seconds into `audio` where the main transient starts: first 10 ms window above `threshold` x peak RMS, minus preroll."""
    import array, math
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", audio, "-ac", "1", "-ar", "44100", "-f", "s16le", "-"])
    a = array.array("h"); a.frombytes(raw)
    win = 441
    env = [math.sqrt(sum(x * x for x in a[i:i + win]) / win) for i in range(0, len(a) - win, win)]
    if not env: return 0.0
    peak = max(env)
    first = next(i for i, e in enumerate(env) if e >= threshold * peak)
    return max(0.0, first * win / 44100 - preroll)


def build(template, audio, out, seconds=None, gain=0.0, bitrate="192k", meta=None, onset=False):
    d = open(template, "rb").read(); R = parse_resource(d)
    meta = meta or json.loads(subprocess.check_output([os.environ.get("MODLOCK", "modlock"), "kv3", template]))
    snd = meta["m_vSound"]
    if snd["m_nFormat"] != "MP3":
        raise SystemExit("template is %s, only MP3 templates are supported" % snd["m_nFormat"])
    rate, ch = snd["m_nRate"], snd["m_nChannels"]
    start = find_onset(audio) if onset else 0.0
    with tempfile.TemporaryDirectory() as tmp:
        mp3 = os.path.join(tmp, "a.mp3")
        af = ["aformat=sample_rates=%d:channel_layouts=%s" % (rate, "mono" if ch == 1 else "stereo")]   # downmix before the limiter
        af += ["afade=t=in:st=0:d=0.005"] if onset else ["silenceremove=start_periods=1:start_threshold=-35dB:start_silence=0.005"]
        if gain: af += ["volume=%sdB" % gain, "alimiter=limit=0.97:attack=1:release=60:level=0"]   # loud, not clipped
        if seconds: af.append("afade=t=out:st=%s:d=0.35" % max(0, float(seconds) - 0.35))
        cmd = ["ffmpeg", "-v", "error", "-y"] + (["-ss", "%.3f" % start] if start else []) + ["-i", audio, "-af", ",".join(af)]
        if seconds: cmd += ["-t", str(seconds)]
        cmd += ["-ar", str(rate), "-ac", str(ch), "-c:a", "libmp3lame", "-b:a", bitrate, "-write_xing", "0", "-id3v2_version", "0", mp3]
        subprocess.check_call(cmd)
        payload = open(mp3, "rb").read()
    frames, spf, prate, pch = mp3_frames(payload)
    assert prate == rate and pch == ch, (prate, rate, pch, ch)
    samples = frames * spf
    duration = samples / rate
    ctrl_i = [i for i, b in enumerate(R["blocks"]) if b[0] == b"CTRL"][0]
    t, off, sz = R["blocks"][ctrl_i]
    H, names, b1, b2, rest = kv3_split(d[off:off + sz])
    # KV3 v5 keeps typed values in buffer 2 lanes: ints in the 4-byte lane, doubles in the 8-byte lane
    hits = {
        "samples": patch_lane(b2, snd["m_nSampleCount"], samples, "<i"),
        "size": patch_lane(b2, snd["m_nStreamingSize"], len(payload), "<i"),
        "duration": patch_lane(b2, snd["m_flDuration"], duration, "<d"),
    }
    if any(v != 1 for v in hits.values()):
        raise SystemExit("could not patch KV3 uniquely: %s" % hits)
    new_ctrl = kv3_join(H, names, b1, b2, rest)
    blocks = [d[o:o + s] for (_, o, s) in R["blocks"]]
    blocks[ctrl_i] = new_ctrl
    res = build_resource(R, blocks)
    open(out, "wb").write(res + payload)
    return {"out": out, "onset_trimmed_s": round(start, 3), "frames": frames, "samples": samples, "duration": round(duration, 3), "audio_bytes": len(payload), "patched": hits}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("info"); a.add_argument("file")
    b = sub.add_parser("build"); b.add_argument("template"); b.add_argument("audio"); b.add_argument("out")
    b.add_argument("--seconds", type=float); b.add_argument("--gain", type=float, default=0.0); b.add_argument("--bitrate", default="192k")
    b.add_argument("--onset", action="store_true", help="cut everything before the main transient so the hit plays at 0 ms")
    args = ap.parse_args()
    if args.cmd == "info": print(json.dumps(info(args.file), indent=2))
    else: print(json.dumps(build(args.template, args.audio, args.out, args.seconds, args.gain, args.bitrate, onset=args.onset), indent=2))
