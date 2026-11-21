import os
"""Music mastering pass (designer 19 Nov: "make sure they all fit together in a theme with the opening cinematic").
Every track is tilted toward the intro's tonal balance (low and high shelves from a band-energy match, clamped), glued
with the same gentle compressor, trimmed of silence at the ends, faded, and levelled to one loudness (two-pass EBU R128)."""
import json, subprocess, sys, os, numpy as np
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..", "frontline/music_src")
TARGET_I, TARGET_TP = -16.0, -1.5
def bands(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "11025", "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32); win = 2048
    fr = np.lib.stride_tricks.sliding_window_view(a, win)[::1024] * np.hanning(win)
    P = (np.abs(np.fft.rfft(fr, axis=1)) ** 2).mean(0); fq = np.fft.rfftfreq(win, 1 / 11025); tot = P.sum()
    b = lambda lo, hi: 10 * np.log10(P[(fq >= lo) & (fq < hi)].sum() / tot + 1e-12)
    return b(20, 150), b(2000, 5500)
def chain(path, ref):
    lo, hi = bands(path)
    g_hi = float(np.clip((ref[1] - hi) * 1.45, -11, 3)); g_lo = float(np.clip(ref[0] - lo, -3, 3))
    pre = (f"highpass=f=28,silenceremove=start_periods=1:start_threshold=-55dB:stop_periods=-1:stop_threshold=-60dB:stop_duration=1.5,"
           f"lowshelf=f=140:g={g_lo:.2f}:w=0.7,highshelf=f=2600:g={g_hi:.2f}:w=0.6,"
           "acompressor=threshold=-20dB:ratio=2:attack=25:release=300:knee=6:makeup=1")
    return pre, g_lo, g_hi
def master(name, src, dst, ref, fade_in=1.2, fade_out=3.0, max_s=None):
    pre, g_lo, g_hi = chain(src, ref)
    tmp = f"/tmp/mm_{name}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af", pre, "-ar", "44100", "-ac", "2", tmp], check=True)  # EQ, glue, trimmed
    L = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tmp], capture_output=True, text=True).stdout)
    if max_s:
        L = min(L, max_s)
    m = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-t", f"{L:.2f}", "-af", f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA=14:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
    ln = (f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA=14:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    fades = f"afade=t=in:st=0:d={fade_in}" + (f",afade=t=out:st={L - fade_out:.2f}:d={fade_out}" if fade_out > 0 else "")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp, "-t", f"{L:.2f}", "-af", f"{ln},aresample=44100,{fades}", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "128k", dst], check=True)
    os.remove(tmp)
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", dst, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = [l for l in out.splitlines() if l.strip().startswith("I:")][-1].split()[1]
    lo, hi = bands(dst)
    print(f"{name:16s} {j['input_i']:>6s} -> {I} LUFS  shelves lo {g_lo:+.1f} hi {g_hi:+.1f} dB  bands now lo {lo:5.1f} hi {hi:5.1f}  {L:5.0f}s {os.path.getsize(dst)//1024:5d} KB")
if __name__ == "__main__":
    plan = json.load(open(sys.argv[1]))
    ref = bands(f"{SRC}/introMusic_original.mp3")
    print("intro reference bands", [round(x, 1) for x in ref])
    for t in plan:
        master(t["id"], f"{SRC}/{t['src']}", t["dst"], ref, t.get("fadeIn", 1.2), t.get("fadeOut", 3.0), t.get("maxS"))
