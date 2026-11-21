import os
#!/usr/bin/env python3
"""Frontline soundscape pass: give every designer recording the same 'house' sound.

For each file in frontline/samples (base64 of an audio file) the untouched original is kept once in
frontline/samples_orig, and the sample is rebuilt from that original:
  mono, 44.1 kHz -> one bandwidth (30 Hz .. 11 kHz: the 24 kHz recordings and the full-band ones meet)
  -> the house tone (a touch of low warmth, the harsh 2.5-5 kHz band and the fizz above 7 kHz eased)
  -> the same light tape-like saturation for all (driven from a common level, so each gets the same amount)
  -> back to the file's own loudness (loudest 100 ms), so the in-game balance tuned so far stays,
     with peaks held under -1 dBFS (several recordings were clipping over full scale).
v2 (designer 19 Nov, "make the game sound like one game rather than several pieces clipped together"):
  -> hiss removed from the recordings that carry it (spectral noise reduction, not on the engine / jet loops)
  -> each recording's own room tail cut back to its family's length (guns ~0.45 s to -40 dB): the space comes from the
     game's one shared reverb (audio.ts, planet-aware) instead of a different baked-in room per recording
  -> families of two or more matched on their whole spectrum (1/3-octave bands toward the family's mean, 60 %, +-6 dB),
     the others keep the brightness tilt
  -> spiky peaks evened out within a family (a crest-factor ceiling), so no shot is much punchier than its neighbours
Short one-shots (< 0.6 s) are written as WAV (no MP3 encoder delay at the start of a shot), longer ones as MP3 160k.
"""
import base64, os, subprocess, sys, tempfile, shutil
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..", "frontline")
SAMPLES, ORIG = f"{ROOT}/samples", f"{ROOT}/samples_orig"
SR = 44100
HOUSE = ",".join([
    "highpass=f=30:p=2",
    "lowpass=f=11000:p=2", "lowpass=f=11000:p=2",          # one bandwidth for all
    "lowshelf=f=160:g=1.5:w=0.7",                          # a little body
    "equalizer=f=3400:t=o:w=1.2:g=-2.5",                   # the harsh band
    "highshelf=f=7000:g=-3:w=0.7",                         # the fizz
])


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def filt(a, chain):
    with tempfile.TemporaryDirectory() as d:
        i, o = f"{d}/i.f32", f"{d}/o.f32"
        a.astype(np.float32).tofile(i)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", i, "-af", chain, "-f", "f32le", o], check=True)
        return np.fromfile(o, dtype=np.float32)


def loud100(a):
    w = SR // 10
    if len(a) <= w:
        return float(np.sqrt(np.mean(a ** 2)) + 1e-12)
    return float(max(np.sqrt(np.mean(a[i:i + w] ** 2)) for i in range(0, len(a) - w, w // 2)) + 1e-12)


def limit(a, ceiling=0.89):
    """Soft knee peak hold at ceiling (-1 dBFS): tanh above 0.7 of it."""
    k = 0.7 * ceiling
    out = a.copy()
    m = np.abs(out) > k
    out[m] = np.sign(out[m]) * (k + (ceiling - k) * np.tanh((np.abs(out[m]) - k) / (ceiling - k)))
    return out


def encode(a, path_wav_or_mp3):
    with tempfile.TemporaryDirectory() as d:
        i = f"{d}/i.f32"
        a.astype(np.float32).tofile(i)
        if path_wav_or_mp3.endswith(".wav"):
            args = ["-c:a", "pcm_s16le"]
        else:
            args = ["-c:a", "libmp3lame", "-b:a", "160k"]
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", i, *args, path_wav_or_mp3], check=True)
        return open(path_wav_or_mp3, "rb").read()


# families: each recording is tilted toward its family's brightness (spectral centroid of its loudest 300 ms), so a
# carbine and a rifle, or two footsteps of one set, sound like they came from the same session
FAMILY_SPECTRA = {}
FAMILY = {
    "carbine": "arms", "rifle": "arms", "machinePistol": "arms", "mg": "arms", "minigun": "arms", "shotgun": "boomgun",
    "laserGun": "arms", "lancer": "beam", "grenadeLauncher": "heavy", "rocket": "launch", "rocket2": "launch",
    "explosion": "boom", "grenadeBoom": "boom", "afterburner": "jet", "gunshipEngine": "engine",
    "footrun1": "steps", "footrun2": "steps", "footrun3": "steps", "footrun4": "steps",
    "footwalk1": "steps", "footwalk2": "steps", "footwalk3": "steps", "footwalk4": "steps",
    "step1": "stomp", "step2": "stomp", "step3": "stomp",
}
TARGET = {"arms": 2600, "heavy": 2000, "boomgun": 1450, "beam": 1500, "jet": 850, "launch": 520, "boom": 950, "engine": 1500, "steps": 2900, "stomp": 900}


def centroid(a):
    w = SR // 10
    rms = [np.sqrt(np.mean(a[i:i + w] ** 2)) for i in range(0, max(1, len(a) - w), w // 2)] or [0]
    i0 = int(np.argmax(rms)) * (w // 2)
    seg = a[i0:i0 + int(0.3 * SR)]
    if len(seg) < 1024:
        seg = a
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
    fr = np.fft.rfftfreq(len(seg), 1 / SR)
    return float(np.sum(sp * fr) / (np.sum(sp) + 1e-12))


def tilt(a, name):
    fam = FAMILY.get(name)
    if not fam:
        return a, 0.0
    c = centroid(a)
    g = float(np.clip(6.0 * np.log2(TARGET[fam] / max(c, 50.0)), -5.0, 5.0))  # dB, half the octave distance x 12
    if abs(g) < 0.5:
        return a, 0.0
    return filt(a, f"highshelf=f=1800:g={g:.2f}:w=0.6,lowshelf=f=250:g={-g / 2:.2f}:w=0.6")[: len(a)], g


# v2: hiss removal, tail lengths (s to -40 dB below the peak), crest ceilings (dB above the loudest 100 ms)
DENOISE = {"rocket", "rocket2", "mg", "laserGun", "rifle", "shotgun", "grenadeLauncher", "carbine", "machinePistol", "lancer", "grenadeBoom", "explosion"}
TAIL = {"arms": 0.45, "boomgun": 0.6, "heavy": 0.45, "steps": 0.2, "stomp": 0.32}
LOOPS = {"afterburner", "gunshipEngine", "minigun"}  # held / looped: no tail or crest shaping
CREST = {"arms": 13.0, "steps": 12.0, "stomp": 12.0, "boomgun": 13.0, "heavy": 13.0}
BANDS = [25 * 2 ** (i / 3) for i in range(0, 28)]  # 1/3-octave centres, 25 Hz .. 10 kHz


def band_spectrum(a):
    w = SR // 10
    rms = [np.sqrt(np.mean(a[i:i + w] ** 2)) for i in range(0, max(1, len(a) - w), w // 2)] or [0]
    i0 = int(np.argmax(rms)) * (w // 2)
    seg = a[i0:i0 + int(0.3 * SR)]
    if len(seg) < 2048:
        seg = np.pad(a, (0, max(0, 2048 - len(a))))
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    fr = np.fft.rfftfreq(len(seg), 1 / SR)
    out = []
    for c in BANDS:
        m = (fr >= c / 2 ** (1 / 6)) & (fr < c * 2 ** (1 / 6))
        out.append(10 * np.log10(np.sum(sp[m]) + 1e-12))
    out = np.array(out)
    return out - np.mean(out)


def denoise(a):
    """Spectral noise reduction from the recording's own quietest stretch (ffmpeg afftdn, noise floor measured)."""
    w = int(0.02 * SR)
    fr = [np.sqrt(np.mean(a[i:i + w] ** 2)) + 1e-9 for i in range(0, max(1, len(a) - w), w)]
    floor = 20 * np.log10(np.percentile(fr, 10))
    nf = float(np.clip(floor, -80, -20))
    return filt(a, f"afftdn=nr=14:nf={nf:.1f}:tn=1")[: len(a)], nf


def shape_tail(a, t40):
    """Cuts a baked-in room tail back: after the peak, the level may fall no slower than a line from -6 dB at 60 ms to
    -40 dB at t40 (gain eased toward it, so the body of the sound is untouched); then trimmed and faded."""
    w = int(0.005 * SR)
    env = np.array([np.sqrt(np.mean(a[i:i + w] ** 2)) + 1e-9 for i in range(0, len(a), w)])
    db = 20 * np.log10(env)
    pk = int(np.argmax(db)); top = db[pk]
    g = np.ones_like(db)
    for i in range(pk, len(db)):
        t = (i - pk) * 0.005
        allow = top - 6 - 34 * max(0.0, (t - 0.06)) / max(0.05, t40 - 0.06) if t > 0.06 else top
        if db[i] > allow:
            g[i] = 10 ** ((allow - db[i]) / 20 * 0.85)
    # smooth the gain curve (no zipper), expand to samples
    k = np.ones(5) / 5
    g = np.convolve(np.pad(g, 2, mode="edge"), k, mode="valid")
    gs = np.interp(np.arange(len(a)), np.arange(len(g)) * w + w / 2, g)
    b = a * gs
    # trim where it has fallen 60 dB under the peak, with a 20 ms fade
    env2 = np.abs(b)
    thr = np.max(env2) * 10 ** (-60 / 20)
    last = int(np.nonzero(env2 > thr)[0][-1]) if np.any(env2 > thr) else len(b) - 1
    end = min(len(b), last + int(0.02 * SR))
    b = b[:end].copy()
    f = min(int(0.02 * SR), len(b))
    b[-f:] *= np.linspace(1, 0, f)
    return b


def crest_cap(a, cap_db):
    l = loud100(a)
    ceiling = l * 10 ** (cap_db / 20)
    if np.max(np.abs(a)) <= ceiling:
        return a
    return limit(a / ceiling * 0.89) * (ceiling / 0.89)


def main():
    os.makedirs(ORIG, exist_ok=True)
    names = sorted(os.listdir(SAMPLES))
    # each family's mean spectrum (after the house EQ), for the spectral match (families of two or more)
    global FAMILY_SPECTRA
    FAMILY_SPECTRA = {}
    by_fam = {}
    for n in names:
        if n in FAMILY and os.path.exists(f"{ORIG}/{n}"):
            by_fam.setdefault(FAMILY[n], []).append(n)
    for fam, members in by_fam.items():
        if len(members) < 2:
            continue
        specs = []
        for n in members:
            with tempfile.TemporaryDirectory() as d:
                p = f"{d}/in.bin"
                open(p, "wb").write(base64.b64decode(open(f"{ORIG}/{n}").read()))
                specs.append(band_spectrum(filt(decode(p), HOUSE)))
        FAMILY_SPECTRA[fam] = np.mean(specs, axis=0)
    report = []
    for n in names:
        if n == "introMusic":  # the opening cinematic's music: a finished mix, not a sound effect
            continue
        src, keep = f"{SAMPLES}/{n}", f"{ORIG}/{n}"
        if not os.path.exists(keep):
            shutil.copyfile(src, keep)  # the untouched original, once
        with tempfile.TemporaryDirectory() as d:
            p = f"{d}/in.bin"
            open(p, "wb").write(base64.b64decode(open(keep).read()))
            a = decode(p)
        if len(a) == 0:
            continue
        target = loud100(a)
        nf = 0.0
        if n in DENOISE:
            a, nf = denoise(a)
        b = filt(a, HOUSE)[: len(a)]
        fam = FAMILY.get(n)
        if fam and FAMILY_SPECTRA.get(fam) is not None:
            corr = np.clip(0.6 * (FAMILY_SPECTRA[fam] - band_spectrum(b)), -6, 6)
            entries = ";".join(f"entry({c:.0f},{g:.2f})" for c, g in zip(BANDS, corr))
            b = filt(b, f"firequalizer=gain_entry='{entries}':delay=0.02:fixed=on:zero_phase=on")[: len(b)]
            tg = float(np.mean(np.abs(corr)))
        else:
            b, tg = tilt(b, n)
        if n not in LOOPS and fam in TAIL:
            b = shape_tail(b, TAIL[fam])
        if n not in LOOPS and fam in CREST:
            b = crest_cap(b, CREST[fam])
        # the same saturation for all: peak to -3 dBFS, tanh with 4 dB of drive, back down
        pk = float(np.max(np.abs(b)) + 1e-9)
        x = b / pk * 0.708 * 1.585
        x = np.tanh(x) / 1.585
        # back to the original loudness, peaks held
        x *= target / loud100(x)
        x = limit(x)
        dur = len(x) / SR
        with tempfile.TemporaryDirectory() as d:
            data = encode(x, f"{d}/o.wav" if dur < 0.6 else f"{d}/o.mp3")
        open(src, "w").write(base64.b64encode(data).decode())
        report.append((n, tg, dur, 20 * np.log10(target), 20 * np.log10(loud100(x)), 20 * np.log10(float(np.max(np.abs(a))) + 1e-9), 20 * np.log10(float(np.max(np.abs(x))) + 1e-9)))
    print(f"{'name':16}{'tilt dB':>8}{'dur':>6}{'loud in':>9}{'loud out':>9}{'peak in':>9}{'peak out':>9}")
    for r in report:
        print(f"{r[0]:16}{r[1]:8.1f}{r[2]:6.2f}{r[3]:9.1f}{r[4]:9.1f}{r[5]:9.1f}{r[6]:9.1f}")


if __name__ == "__main__":
    main()
