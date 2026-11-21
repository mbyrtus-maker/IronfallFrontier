"use strict";
// m1 (designer playtest 15 Nov 22:29, "movement is a little choppy by the AI"): per-entity motion tracks for drawing.
// main.ts used to draw every entity by interpolating between the two snapshots around the render clock. An entity whose
// record is not in every snapshot (a guest's far entities are refreshed every farSnapshotDivisor snapshots; deadbands
// hold small changes) then stood still for several snapshots and jumped on in one: stop-start on screen. Here each
// entity keeps the snapshots in which it actually changed (samples), is interpolated between those, and is drawn
// late by its own update gap beyond the stream's (`extra`, eased), so the bracketing sample is there by the time it
// is needed and no extrapolation is ever guessed. With a record every snapshot this is exactly the old interpolation
// (extra 0). Pure (no DOM / WebGL); logic test: test/logic/m1-smooth.test.mjs.
// j1 (designer playtest 16 Nov 13:02, "the jumping animation for vehicles and people is still not smooth"): the track
// carries the altitude and the vertical speed too (snapshot v31: 1/128 m, 1/16 m/s), and the altitude between two samples
// is a cubic Hermite through both heights with both vertical speeds, which is the sim's own parabola under gravity (and
// a tangential touch-down on landing: the speed after landing is 0), instead of a straight line between 0.25 m steps.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracks = exports.SMOOTH = void 0;
exports.altAt = altAt;
const N = 8;
/** Largest extra delay (ticks) and the easing rate of `extra` (ticks of delay per tick of render time). */
exports.SMOOTH = { maxExtra: 10, ease: 0.1, gapMax: 16, gapK: 0.3 };
function newTrack() { return { t: new Float64Array(N), x: new Float64Array(N), z: new Float64Array(N), h: new Float64Array(N), a: new Float64Array(N), v: new Float64Array(N), cushion: false, n: 0, head: 0, gap: 0, extra: 0, seen: 0, lastR: -1 }; }
const at = (tr, k) => (tr.head - 1 - k + N * 2) % N; // k = 0: newest
/**
 * j1: altitude between two samples (heights a0, a1 m; vertical speeds v0, v1 m per tick, NaN: unknown) T ticks apart, at
 * fraction f: cubic Hermite (exact for a parabola under constant gravity or thrust); linear without both speeds. Never
 * below the lower end when both ends are at or above the ground (a landing does not dip into it).
 * cushion (hover vehicles): a landing (down to 0 with no speed left) keeps its fall speed to the ground, where the hull
 * settle spring (tilt.ts) takes it over, instead of braking to a stop in the air within the last tick.
 */
function altAt(a0, v0, a1, v1, T, f, cushion = false) {
    if (v0 !== v0 || v1 !== v1 || !(T > 0))
        return a0 + (a1 - a0) * f;
    if (cushion && a1 === 0 && v1 === 0 && v0 < 0 && a0 > 0)
        return Math.max(0, a0 + Math.min(v0 * T, -a0) * f);
    const f2 = f * f, f3 = f2 * f;
    const y = (2 * f3 - 3 * f2 + 1) * a0 + (f3 - 2 * f2 + f) * T * v0 + (-2 * f3 + 3 * f2) * a1 + (f3 - f2) * T * v1;
    return a0 >= 0 && a1 >= 0 && y < 0 ? 0 : y;
}
class Tracks {
    map = new Map();
    /** Snapshot spacing of the stream (ticks): the gap every entity has anyway. */
    base = 1;
    /**
     * One entity of a new snapshot at `tick`: a sample when its position, heading or altitude changed (or it is new).
     * alt: altitude (m); vy: vertical speed in m per tick (NaN: unknown, linear altitude).
     */
    push(id, tick, x, z, h, alt = 0, vy = NaN, cushion = false) {
        let tr = this.map.get(id);
        if (!tr) {
            tr = newTrack();
            this.map.set(id, tr);
        }
        tr.seen = tick;
        tr.cushion = cushion;
        if (tr.n > 0) {
            const i = at(tr, 0);
            if (tick <= tr.t[i])
                return;
            if (tr.x[i] === x && tr.z[i] === z && tr.h[i] === h && tr.a[i] === alt && (tr.v[i] === vy || (vy !== vy && tr.v[i] !== tr.v[i])))
                return;
            const g = tick - tr.t[i], moved = tr.x[i] !== x || tr.z[i] !== z;
            // the update gap while moving steadily (a stop, a start or a long hold is not a gap of the schedule)
            if (moved && g <= exports.SMOOTH.gapMax && tr.n > 1) {
                const j = at(tr, 1);
                if (tr.x[j] !== tr.x[i] || tr.z[j] !== tr.z[i])
                    tr.gap += (g - tr.gap) * exports.SMOOTH.gapK;
            }
            // longer than the schedule since the last change: it stood there until one gap ago (a start is not smeared over
            // the whole standstill)
            const expect = Math.max(this.base, tr.gap);
            // (held on the ground or on the hover: no vertical speed; held in the air by a deadband: linear)
            if (g > expect + 0.5)
                this.addRaw(tr, tick - expect, tr.x[i], tr.z[i], tr.h[i], tr.a[i], tr.a[i] === 0 ? 0 : NaN);
        }
        this.addRaw(tr, tick, x, z, h, alt, vy);
    }
    addRaw(tr, tick, x, z, h, alt, vy) {
        const i = tr.head;
        tr.t[i] = tick;
        tr.x[i] = x;
        tr.z[i] = z;
        tr.h[i] = h;
        tr.a[i] = alt;
        tr.v[i] = vy;
        tr.head = (i + 1) % N;
        if (tr.n < N)
            tr.n++;
    }
    /**
     * Position and heading of entity `id` at render tick r (into out: x, z, heading, vx, vz per tick, altitude m); false if unknown.
     * lerpAngle: the caller's heading interpolation.
     */
    sample(id, r, out, lerpAngle) {
        const tr = this.map.get(id);
        if (!tr || tr.n === 0)
            return false;
        // extra delay: the entity's own gap beyond the stream's, eased (never a jump of the drawn time)
        const want = Math.min(exports.SMOOTH.maxExtra, Math.max(0, tr.gap - this.base));
        const dr = tr.lastR < 0 ? 0 : Math.max(0, Math.min(1, r - tr.lastR));
        tr.extra = tr.lastR < 0 ? want : tr.extra + Math.max(-exports.SMOOTH.ease * 4 * dr, Math.min(exports.SMOOTH.ease * dr, want - tr.extra));
        tr.lastR = r;
        const q = r - tr.extra;
        let k = 0;
        while (k < tr.n - 1 && tr.t[at(tr, k)] > q)
            k++;
        const a = at(tr, k);
        if (k === 0 || tr.t[a] > q) {
            out[0] = tr.x[a];
            out[1] = tr.z[a];
            out[2] = tr.h[a];
            out[5] = tr.a[a];
        }
        else {
            const b = at(tr, k - 1), T = tr.t[b] - tr.t[a], f = (q - tr.t[a]) / T;
            out[0] = tr.x[a] + (tr.x[b] - tr.x[a]) * f;
            out[1] = tr.z[a] + (tr.z[b] - tr.z[a]) * f;
            out[2] = lerpAngle(tr.h[a], tr.h[b], f);
            out[5] = altAt(tr.a[a], tr.v[a], tr.a[b], tr.v[b], T, f, tr.cushion);
        }
        // velocity (m per tick) of the segment drawn
        const s0 = k === 0 ? (tr.n > 1 ? at(tr, 1) : a) : a, s1 = k === 0 ? a : at(tr, k - 1), dt = tr.t[s1] - tr.t[s0];
        const stale = k === 0 && q - tr.t[a] > Math.max(this.base, tr.gap) + 1; // past the newest sample: standing still
        out[3] = dt > 0 && !stale ? (tr.x[s1] - tr.x[s0]) / dt : 0;
        out[4] = dt > 0 && !stale ? (tr.z[s1] - tr.z[s0]) / dt : 0;
        return true;
    }
    /** Forget entities not in a snapshot for `ticks`. */
    prune(tick, ticks = 200) { for (const [id, tr] of this.map)
        if (tick - tr.seen > ticks)
            this.map.delete(id); }
    clear() { this.map.clear(); }
}
exports.Tracks = Tracks;
