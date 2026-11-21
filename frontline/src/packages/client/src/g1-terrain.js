"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackSegments = trackSegments;
exports.trackWeight = trackWeight;
exports.layerFx = layerFx;
/** Track segments from the map's point links (each link once), with a gentle bend (two sub-segments). */
function trackSegments(points) {
    const out = [], seen = new Set();
    const by = new Map((points ?? []).map((p) => [p.id, p]));
    for (const p of points ?? [])
        for (const l of p.links ?? []) {
            const q = by.get(l);
            if (!q)
                continue;
            const key = p.id < l ? `${p.id}|${l}` : `${l}|${p.id}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) || 1, bend = (Math.sin(p.x * 0.013 + q.z * 0.011) * 0.08) * L;
            const mx = (p.x + q.x) / 2 - (dz / L) * bend, mz = (p.z + q.z) / 2 + (dx / L) * bend;
            for (const [ax, az, bx, bz] of [[p.x, p.z, mx, mz], [mx, mz, q.x, q.z]])
                out.push({ ax, az, bx, bz, len: Math.hypot(bx - ax, bz - az) || 1 });
        }
    return out;
}
/** Track weight 0..1 at (x, z): a 4-6 m wide worn band along each segment, wobbling, fading in the middle of long links. */
function trackWeight(segs, x, z, wob) {
    let w = 0;
    for (const s of segs) {
        const ux = (s.bx - s.ax) / s.len, uz = (s.bz - s.az) / s.len, px = x - s.ax, pz = z - s.az;
        const t = px * ux + pz * uz;
        if (t < -8 || t > s.len + 8)
            continue;
        const d = Math.abs(px * uz - pz * ux) + wob * 3;
        if (d > 9)
            continue;
        const k = 1 - Math.min(1, Math.max(0, (d - 3.5) / 4.5));
        w = Math.max(w, k);
    }
    return w;
}
/** Surface weights [lava, liquid, ice] at (x, z): the layer type sampled at a noise-jittered spot (organic edges). */
function layerFx(L, at, x, z, jx, jz, out) {
    if (!L)
        return;
    let lava = 0, liq = 0, ice = 0;
    for (const [ox, oz] of [[0, 0], [28, 10], [-14, 26], [10, -28], [-26, -12]]) {
        const t = at(L, x + ox + jx * 70, z + oz + jz * 70);
        if (t === "lava")
            lava += 0.2;
        else if (t === "liquid")
            liq += 0.2;
        else if (t === "ice-glass-flats")
            ice += 0.2;
    }
    const sm = (v) => (v <= 0.3 ? 0 : v >= 0.7 ? 1 : (v - 0.3) / 0.4);
    out[3] = sm(lava);
    out[4] = sm(liq);
    out[5] = sm(ice);
}
