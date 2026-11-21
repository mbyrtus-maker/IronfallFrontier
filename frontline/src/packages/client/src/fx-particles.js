"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Particles = exports.BAND_CRIT = exports.BAND_HIGH = exports.BAND_NORMAL = exports.BAND_AMBIENT = exports.PASS_DECAL = exports.PASS_ADD = exports.PASS_ALPHA = exports.SH = exports.GEOM_FLAT = exports.GEOM_STREAK = exports.GEOM_BILL = exports.P2_FLOATS = void 0;
exports.writeInst = writeInst;
exports.distFade = distFade;
exports.nearFadeK = nearFadeK;
// P2 effects pass: the particle system. No WebGL here (render.ts draws what fill() writes), so Node tests drive it.
//  * A fixed pool of simulated particles (struct of arrays, no allocation per particle) and a pool of ground decals;
//    "once" instances for effects attached to something this frame only (engine glows, beams, rings, dome surfaces).
//  * A global budget with priority bands, like the sound mixer's voice cap: 0 ambient (weather, motes, idle dust),
//    1 normal (most effects), 2 important (explosions near the player, call-downs), 3 critical (the player's own fire
//    and hits on the player: always admitted, stealing a lower band's particle when the pool is full). Each band is
//    refused above its fill fraction (CAPS.bandLimit); ambient also has its own share.
//  * LOD by distance: emitters ask count(n, x, y, z) for how many particles to spawn there (full within lodNear, then
//    falling, scaled down further as the pool fills); beyond an effect's far distance nothing is spawned or drawn, and
//    the last quarter fades.
//  * Fades: near the camera by size on screen (radius / distance), so a puff beside the camera never fills the view
//    (C8 / QA4 bug 7); with distance; and over each particle's life.
//  * Two passes plus decals: alpha (smoke, dust, debris) and additive (flash, fire, sparks, glows, tracers, beams).
const fx_table_ts_1 = require("./fx-table.js");
/** Instance layout handed to render.ts drawP2: iA x, y, z, size | iB axis x, y, z, length (streak; flat: normal, rotation) | iC r, g, b, a | iD shape, geom, life fraction, seed. */
exports.P2_FLOATS = 16;
exports.GEOM_BILL = 0, exports.GEOM_STREAK = 1, exports.GEOM_FLAT = 2;
/** Fragment shapes (render.ts P2 shader). */
exports.SH = { glow: 0, smoke: 1, spark: 2, ring: 3, star: 4, scorch: 5, shock: 6, beam: 7, ripple: 8, chunk: 9, streak: 10, hex: 11, flame: 12 };
exports.PASS_ALPHA = 0, exports.PASS_ADD = 1, exports.PASS_DECAL = 2;
exports.BAND_AMBIENT = 0, exports.BAND_NORMAL = 1, exports.BAND_HIGH = 2, exports.BAND_CRIT = 3;
const F_NONEAR = 1;
class Pool {
    cap;
    n = 0;
    x;
    y;
    z;
    vx;
    vy;
    vz;
    s0;
    s1;
    age;
    life;
    r0;
    g0;
    b0;
    r1;
    g1;
    b1;
    a;
    drag;
    grav;
    floor;
    stretch;
    ax;
    ay;
    az;
    len;
    fin;
    fpow;
    far;
    seed;
    shape;
    geom;
    pass;
    band;
    flags;
    constructor(cap) {
        this.cap = cap;
        const f = () => new Float32Array(cap), u = () => new Uint8Array(cap);
        this.x = f();
        this.y = f();
        this.z = f();
        this.vx = f();
        this.vy = f();
        this.vz = f();
        this.s0 = f();
        this.s1 = f();
        this.age = f();
        this.life = f();
        this.r0 = f();
        this.g0 = f();
        this.b0 = f();
        this.r1 = f();
        this.g1 = f();
        this.b1 = f();
        this.a = f();
        this.drag = f();
        this.grav = f();
        this.floor = f();
        this.stretch = f();
        this.ax = f();
        this.ay = f();
        this.az = f();
        this.len = f();
        this.fin = f();
        this.fpow = f();
        this.far = f();
        this.seed = f();
        this.shape = u();
        this.geom = u();
        this.pass = u();
        this.band = u();
        this.flags = u();
    }
    set(i, o, seed) {
        this.x[i] = o.x;
        this.y[i] = o.y;
        this.z[i] = o.z;
        this.vx[i] = o.vx ?? 0;
        this.vy[i] = o.vy ?? 0;
        this.vz[i] = o.vz ?? 0;
        this.s0[i] = o.s0;
        this.s1[i] = o.s1 ?? o.s0;
        this.age[i] = -(o.delay ?? 0);
        this.life[i] = Math.max(0.01, o.life);
        const c1 = o.c1 ?? o.c0;
        this.r0[i] = o.c0[0];
        this.g0[i] = o.c0[1];
        this.b0[i] = o.c0[2];
        this.r1[i] = c1[0];
        this.g1[i] = c1[1];
        this.b1[i] = c1[2];
        this.a[i] = o.a ?? 1;
        this.drag[i] = o.drag ?? 0;
        this.grav[i] = o.grav ?? 0;
        this.floor[i] = o.floor ?? -1e9;
        this.stretch[i] = o.stretch ?? 0;
        this.ax[i] = o.ax ?? 0;
        this.ay[i] = o.ay ?? 0;
        this.az[i] = o.az ?? 0;
        this.len[i] = o.len ?? 0;
        this.fin[i] = o.fin ?? 0;
        this.fpow[i] = o.fpow ?? 1;
        this.far[i] = o.far ?? fx_table_ts_1.CAPS.far;
        this.seed[i] = o.seed ?? seed;
        this.shape[i] = o.shape;
        this.geom[i] = o.geom ?? exports.GEOM_BILL;
        this.pass[i] = o.pass;
        this.band[i] = o.band ?? exports.BAND_NORMAL;
        this.flags[i] = o.noNear ? F_NONEAR : 0;
    }
    arrs = null;
    copy(d, s) {
        const A = this.arrs ??= [this.x, this.y, this.z, this.vx, this.vy, this.vz, this.s0, this.s1, this.age, this.life, this.r0, this.g0, this.b0, this.r1, this.g1, this.b1, this.a,
            this.drag, this.grav, this.floor, this.stretch, this.ax, this.ay, this.az, this.len, this.fin, this.fpow, this.far, this.seed, this.shape, this.geom, this.pass, this.band, this.flags];
        for (let k = 0; k < A.length; k++)
            A[k][d] = A[k][s];
    }
}
class Particles {
    pool;
    decals;
    /** this frame's attached instances (written straight in the instance layout), per pass */
    onceA;
    onceAdd;
    onceDec;
    nA = 0;
    nAdd = 0;
    nDec = 0;
    eye = [0, 0, 0];
    fwd = [0, 0, -1];
    /** settings: 0..1 multiplier on flash brightness (pause menu "reduce flashes") */
    flashK = 1;
    stats = { alive: 0, decals: 0, once: 0, spawned: 0, refused: 0, stolen: 0, culled: 0, nearFaded: 0, peak: 0, drawnAlpha: 0, drawnAdd: 0, drawnDecal: 0, byBand: [0, 0, 0, 0] };
    bandCount = [0, 0, 0, 0];
    cursor = 0;
    rnd = 987654321;
    constructor(cap = fx_table_ts_1.CAPS.particles, decalCap = fx_table_ts_1.CAPS.decals, onceCap = fx_table_ts_1.CAPS.once) {
        this.pool = new Pool(cap);
        this.decals = new Pool(decalCap);
        this.onceA = new Float32Array(onceCap * exports.P2_FLOATS);
        this.onceAdd = new Float32Array(onceCap * exports.P2_FLOATS);
        this.onceDec = new Float32Array(Math.max(16, onceCap >> 3) * exports.P2_FLOATS);
    }
    r() { this.rnd = (Math.imul(this.rnd, 1664525) + 1013904223) >>> 0; return this.rnd / 4294967296; }
    /** -1..1 */
    s() { return this.r() * 2 - 1; }
    get alive() { return this.pool.n; }
    dist(x, y, z) { return Math.hypot(x - this.eye[0], y - this.eye[1], z - this.eye[2]); }
    /** LOD: how many of `n` particles to spawn at (x, y, z) (random rounding, so 0.4 of a particle is sometimes one). */
    count(n, x, y, z, far = fx_table_ts_1.CAPS.far, band = exports.BAND_NORMAL) {
        const d = this.dist(x, y, z);
        if (d > far)
            return 0;
        let k = d <= fx_table_ts_1.CAPS.lodNear ? 1 : Math.max(fx_table_ts_1.CAPS.lodMin, 1 / (1 + (d - fx_table_ts_1.CAPS.lodNear) / fx_table_ts_1.CAPS.lodFall));
        const fill = this.pool.n / this.pool.cap;
        if (band < exports.BAND_CRIT && fill > 0.5)
            k *= Math.max(0.2, 1 - (fill - 0.5) * 1.6);
        const v = n * k, i = Math.floor(v);
        return i + (this.r() < v - i ? 1 : 0);
    }
    /** Spawns one simulated particle (or a decal for PASS_DECAL). Returns false when the budget refused it. */
    add(o) {
        const P = o.pass === exports.PASS_DECAL ? this.decals : this.pool, band = o.band ?? exports.BAND_NORMAL;
        if (this.dist(o.x, o.y, o.z) > (o.far ?? fx_table_ts_1.CAPS.far)) {
            this.stats.culled++;
            return false;
        }
        let i = -1;
        if (P === this.decals) {
            if (P.n < P.cap)
                i = P.n++;
            else { // the oldest-by-life-fraction decal goes
                let best = 0, bt = -1;
                for (let j = 0; j < P.n; j++) {
                    const t = P.age[j] / P.life[j];
                    if (t > bt) {
                        bt = t;
                        best = j;
                    }
                }
                i = best;
                this.stats.stolen++;
            }
        }
        else {
            const fill = P.n / P.cap;
            if (band < exports.BAND_CRIT && fill >= fx_table_ts_1.CAPS.bandLimit[band]) {
                this.stats.refused++;
                return false;
            }
            if (band === exports.BAND_AMBIENT && this.bandCount[0] >= P.cap * fx_table_ts_1.CAPS.ambientShare) {
                this.stats.refused++;
                return false;
            }
            if (P.n < P.cap)
                i = P.n++;
            else {
                // full: steal a particle of a lower band (scan from a rotating cursor: lower bands are many when it is full)
                for (let k = 0; k < P.n; k++) {
                    const j = (this.cursor + k) % P.n;
                    if (P.band[j] < band) {
                        i = j;
                        this.cursor = j + 1;
                        break;
                    }
                }
                if (i < 0) {
                    this.stats.refused++;
                    return false;
                }
                this.bandCount[P.band[i]]--;
                this.stats.stolen++;
            }
            this.bandCount[band]++;
        }
        P.set(i, o, this.r());
        this.stats.spawned++;
        return true;
    }
    /** An instance for this frame only (attached effects). geom / shape / pass as for add(); a: alpha. */
    once(pass, x, y, z, size, c, a, shape, geom = exports.GEOM_BILL, ax = 0, ay = 0, az = 0, len = 0, t = 0, seed = 0, noNear = false, far = fx_table_ts_1.CAPS.far) {
        if (a <= 0.003 || size <= 0)
            return false;
        const d = this.dist(x, y, z);
        if (d > far)
            return false;
        if (geom !== exports.GEOM_FLAT && pass !== exports.PASS_DECAL) {
            const vx = x - this.eye[0], vy = y - this.eye[1], vz = z - this.eye[2];
            if (vx * this.fwd[0] + vy * this.fwd[1] + vz * this.fwd[2] < -(size + len))
                return false; // behind the camera
        }
        a *= distFade(d, far);
        if (!noNear && pass !== exports.PASS_DECAL && geom !== exports.GEOM_STREAK) {
            const f = nearFadeK(size / Math.max(d, 1e-3), pass === exports.PASS_ADD ? fx_table_ts_1.CAPS.nearAdd : fx_table_ts_1.CAPS.nearAlpha);
            if (f < 1) {
                this.stats.nearFaded++;
                a *= f;
                if (a <= 0.003)
                    return false;
            }
        }
        let buf, n;
        if (pass === exports.PASS_ALPHA) {
            buf = this.onceA;
            n = this.nA;
        }
        else if (pass === exports.PASS_ADD) {
            buf = this.onceAdd;
            n = this.nAdd;
        }
        else {
            buf = this.onceDec;
            n = this.nDec;
        }
        if ((n + 1) * exports.P2_FLOATS > buf.length)
            return false;
        writeInst(buf, n * exports.P2_FLOATS, x, y, z, size, ax, ay, az, len, c[0], c[1], c[2], a, shape, geom, t, seed);
        if (pass === exports.PASS_ALPHA)
            this.nA++;
        else if (pass === exports.PASS_ADD)
            this.nAdd++;
        else
            this.nDec++;
        return true;
    }
    update(dt) {
        for (const P of [this.pool, this.decals]) {
            // dead particles are replaced by the last one (swap-remove: order does not matter, nothing is sorted)
            let n = P.n;
            for (let i = 0; i < n; i++) {
                P.age[i] += dt;
                if (P.age[i] >= P.life[i]) {
                    if (P === this.pool)
                        this.bandCount[P.band[i]]--;
                    n--;
                    if (i !== n) {
                        P.copy(i, n);
                        P.age[i] -= dt;
                        i--;
                    } // the moved one is aged when its turn comes again
                    continue;
                }
                if (P.age[i] > 0) {
                    if (P.drag[i] > 0) {
                        const k = Math.exp(-P.drag[i] * dt);
                        P.vx[i] *= k;
                        P.vy[i] *= k;
                        P.vz[i] *= k;
                    }
                    P.vy[i] -= P.grav[i] * dt;
                    P.x[i] += P.vx[i] * dt;
                    P.y[i] += P.vy[i] * dt;
                    P.z[i] += P.vz[i] * dt;
                    if (P.y[i] < P.floor[i]) {
                        P.y[i] = P.floor[i];
                        P.vy[i] = Math.abs(P.vy[i]) * 0.3;
                        P.vx[i] *= 0.55;
                        P.vz[i] *= 0.55;
                        if (P.vy[i] < 0.6) {
                            P.vy[i] = 0;
                            P.grav[i] = 0;
                            P.drag[i] = Math.max(P.drag[i], 6);
                        }
                    }
                }
            }
            P.n = n;
        }
        this.stats.alive = this.pool.n;
        this.stats.decals = this.decals.n;
        this.stats.peak = Math.max(this.stats.peak, this.pool.n);
        this.stats.byBand = this.bandCount.slice();
    }
    /**
     * Writes this frame's instances: alpha, additive and decal passes (pool first, then the attached ones), and clears
     * the attached list. Returns the counts. Particles behind the camera, past their far distance or not yet born are
     * skipped; near ones fade by size on screen.
     */
    fill(outA, outAdd, outDec) {
        let na = 0, nadd = 0, nd = 0;
        this.stats.nearFaded = 0;
        const E = this.eye, Fw = this.fwd, capA = Math.min(fx_table_ts_1.CAPS.frameAlpha, outA.length / exports.P2_FLOATS), capAdd = Math.min(fx_table_ts_1.CAPS.frameAdd, outAdd.length / exports.P2_FLOATS), capD = Math.min(fx_table_ts_1.CAPS.frameDecal, outDec.length / exports.P2_FLOATS);
        for (const P of [this.pool, this.decals]) {
            for (let i = 0; i < P.n; i++) {
                const age = P.age[i];
                if (age < 0)
                    continue;
                const pass = P.pass[i];
                if (pass === exports.PASS_ALPHA ? na >= capA : pass === exports.PASS_ADD ? nadd >= capAdd : nd >= capD)
                    continue;
                const t = age / P.life[i], x = P.x[i], y = P.y[i], z = P.z[i];
                const size = P.s0[i] + (P.s1[i] - P.s0[i]) * (pass === exports.PASS_ADD ? t : Math.sqrt(t));
                const vx = x - E[0], vy = y - E[1], vz = z - E[2], d = Math.hypot(vx, vy, vz);
                if (d > P.far[i])
                    continue;
                const geom = P.geom[i];
                let ax = P.ax[i], ay = P.ay[i], az = P.az[i], len = P.len[i];
                if (geom === exports.GEOM_STREAK && P.stretch[i] > 0) {
                    const sp = Math.hypot(P.vx[i], P.vy[i], P.vz[i]);
                    if (sp > 1e-3) {
                        ax = P.vx[i] / sp;
                        ay = P.vy[i] / sp;
                        az = P.vz[i] / sp;
                        len = Math.max(size * 2, sp * P.stretch[i]);
                    }
                    else {
                        ax = 0;
                        ay = 1;
                        az = 0;
                        len = size * 2;
                    }
                }
                if (geom !== exports.GEOM_FLAT && vx * Fw[0] + vy * Fw[1] + vz * Fw[2] < -(size + len)) {
                    continue;
                }
                const fin = P.fin[i];
                let a = P.a[i] * (fin > 0 && t < fin ? t / fin : 1) * Math.pow(Math.max(0, 1 - t), P.fpow[i]);
                a *= distFade(d, P.far[i]);
                if (pass !== exports.PASS_DECAL && geom !== exports.GEOM_STREAK && !(P.flags[i] & F_NONEAR)) {
                    const f = nearFadeK(size / Math.max(d, 1e-3), pass === exports.PASS_ADD ? fx_table_ts_1.CAPS.nearAdd : fx_table_ts_1.CAPS.nearAlpha);
                    if (f < 1) {
                        this.stats.nearFaded++;
                        a *= f;
                    }
                }
                if (a <= 0.003)
                    continue;
                const r = P.r0[i] + (P.r1[i] - P.r0[i]) * t, g = P.g0[i] + (P.g1[i] - P.g0[i]) * t, b = P.b0[i] + (P.b1[i] - P.b0[i]) * t;
                if (pass === exports.PASS_ALPHA) {
                    writeInst(outA, na * exports.P2_FLOATS, x, y, z, size, ax, ay, az, len, r, g, b, a, P.shape[i], geom, t, P.seed[i]);
                    na++;
                }
                else if (pass === exports.PASS_ADD) {
                    writeInst(outAdd, nadd * exports.P2_FLOATS, x, y, z, size, ax, ay, az, len, r, g, b, a, P.shape[i], geom, t, P.seed[i]);
                    nadd++;
                }
                else {
                    writeInst(outDec, nd * exports.P2_FLOATS, x, y, z, size, ax, ay, az, len, r, g, b, a, P.shape[i], geom, t, P.seed[i]);
                    nd++;
                }
            }
        }
        // attached instances (already faded when added)
        const cp = (src, m, dst, n, cap) => { const k = Math.max(0, Math.min(m, cap - n)); dst.set(src.subarray(0, k * exports.P2_FLOATS), n * exports.P2_FLOATS); return n + k; };
        na = cp(this.onceA, this.nA, outA, na, capA);
        nadd = cp(this.onceAdd, this.nAdd, outAdd, nadd, capAdd);
        nd = cp(this.onceDec, this.nDec, outDec, nd, capD);
        this.stats.once = this.nA + this.nAdd + this.nDec;
        this.nA = 0;
        this.nAdd = 0;
        this.nDec = 0;
        this.stats.drawnAlpha = na;
        this.stats.drawnAdd = nadd;
        this.stats.drawnDecal = nd;
        return { a: na, add: nadd, dec: nd };
    }
    clear() { this.pool.n = 0; this.decals.n = 0; this.nA = this.nAdd = this.nDec = 0; this.bandCount = [0, 0, 0, 0]; }
}
exports.Particles = Particles;
function writeInst(o, k, x, y, z, s, ax, ay, az, len, r, g, b, a, shape, geom, t, seed) {
    o[k] = x;
    o[k + 1] = y;
    o[k + 2] = z;
    o[k + 3] = s;
    o[k + 4] = ax;
    o[k + 5] = ay;
    o[k + 6] = az;
    o[k + 7] = len;
    o[k + 8] = r;
    o[k + 9] = g;
    o[k + 10] = b;
    o[k + 11] = a;
    o[k + 12] = shape;
    o[k + 13] = geom;
    o[k + 14] = t;
    o[k + 15] = seed;
}
/** 1 up to 3/4 of far, then linearly to 0 at far. */
function distFade(d, far) { const s = far * 0.75; return d <= s ? 1 : d >= far ? 0 : (far - d) / (far - s); }
/** Size-on-screen fade (k = radius / distance): 1 under lim[0], 0 over lim[1]. */
function nearFadeK(k, lim) { return k <= lim[0] ? 1 : k >= lim[1] ? 0 : (lim[1] - k) / (lim[1] - lim[0]); }
