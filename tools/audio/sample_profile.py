import os
"""Profile of each designer recording (originals or current): noise floor, tail length, crest, duration."""
import base64, os, sys, tempfile, numpy as np, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from master_samples import decode, SR, FAMILY
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..", "frontline")
def prof(a):
    w = int(0.01 * SR)
    fr = np.array([np.sqrt(np.mean(a[i:i + w] ** 2)) + 1e-9 for i in range(0, len(a) - w, w)])
    db = 20 * np.log10(fr)
    pk = int(np.argmax(db)); top = db[pk]
    floor = np.percentile(db, 8)
    after = db[pk:]
    t40 = next((i for i, v in enumerate(after) if v < top - 40), len(after)) * 0.01
    t20 = next((i for i, v in enumerate(after) if v < top - 20), len(after)) * 0.01
    l100 = max(np.sqrt(np.mean(a[i:i + SR // 10] ** 2)) for i in range(0, max(1, len(a) - SR // 10), SR // 20)) if len(a) > SR // 10 else np.sqrt(np.mean(a**2))
    crest = 20 * np.log10(np.max(np.abs(a)) / (l100 + 1e-9))
    return len(a) / SR, floor - top, t20, t40, crest
which = sys.argv[1] if len(sys.argv) > 1 else "samples_orig"
print(f"{'name':15}{'fam':8}{'dur':>6}{'floor':>7}{'t-20':>6}{'t-40':>6}{'crest':>6}")
for n in sorted(os.listdir(f"{ROOT}/{which}")):
    if n == "introMusic": continue
    with tempfile.TemporaryDirectory() as d:
        p = f"{d}/x"; open(p, "wb").write(base64.b64decode(open(f"{ROOT}/{which}/{n}").read())); a = decode(p)
    dur, fl, t20, t40, cr = prof(a)
    print(f"{n:15}{FAMILY.get(n,'-'):8}{dur:6.2f}{fl:7.1f}{t20:6.2f}{t40:6.2f}{cr:6.1f}")
