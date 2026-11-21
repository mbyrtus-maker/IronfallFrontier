"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOT_NEAR = exports.PUFF_NEAR = exports.Fx = void 0;
exports.nearFade = nearFade;
// Short-lived effect puffs: death explosions (fireball, smoke, debris), impact
// sparks and muzzle flashes. Low-poly balls drawn in one instanced call.
// The command view's tactical display draws explosions as brief expanding outline rings instead (rings list).
const render_ts_1 = require("./render.js");
const FIRE = [1.0, 0.62, 0.22], FIRE_HOT = [1.0, 0.9, 0.55];
const SMOKE = [0.34, 0.32, 0.3], SMOKE_LIGHT = [0.6, 0.58, 0.54];
const DEBRIS = [0.14, 0.14, 0.13];
class Fx {
    list = [];
    rings = [];
    get ringCount() { return this.rings.length; }
    /** P2: the effects pass's layers (null: the old puffs only). */
    ext = null;
    /** P2: a marker ring for the command view (the tactical display draws rings only): team = line colour index (3 effects). */
    ring(x, y, z, r0, r1, life, team = 3, a0 = 1, delay = 0) {
        if (this.rings.length < 600)
            this.rings.push({ x, y, z, r0, r1, age: -delay, life, team, a0 });
    }
    rnd = 12345;
    r() { this.rnd = (Math.imul(this.rnd, 1664525) + 1013904223) >>> 0; return this.rnd / 4294967296; }
    get count() { return this.list.length + (this.once.length + this.keep.length) / render_ts_1.FX_FLOATS; }
    /** C5: glowing dots for this frame only (beacon pillars, the throw arc, the target ring); drawn by the next fill. */
    once = [];
    keep = [];
    dot(x, y, z, r, c, a, emissive = 1) { this.once.push(x, y, z, r, c[0], c[1], c[2], a, emissive); }
    /** Frontline: a one-frame dot that is never near-faded (the shoulder laser cannon's beam, wide on screen at the muzzle). */
    dotKeep(x, y, z, r, c, a, emissive = 1) { this.keep.push(x, y, z, r, c[0], c[1], c[2], a, emissive); }
    get dots() { return this.once.length / render_ts_1.FX_FLOATS; }
    /** `team`: line-colour index of the unit that died (the ring's colour in the tactical display). */
    explosion(x, y, z, size, team = 3) {
        this.ext?.explosion(x, y, z, size, team); // P2
        const R = () => this.r() * 2 - 1;
        this.rings.push({ x, y: y + 0.5, z, r0: size * 0.4, r1: size * 3.2 + 4, age: 0, life: 0.8, team, a0: 1 });
        this.rings.push({ x, y: y + 0.5, z, r0: size * 0.2, r1: size * 1.8 + 2, age: -0.12, life: 0.6, team: 3, a0: 0.8 });
        this.list.push({ x, y: y + size * 0.4, z, vx: 0, vy: size * 0.4, vz: 0, r0: size * 0.4, r1: size * 1.3, age: 0, life: 0.55, c0: FIRE_HOT, c1: FIRE, a0: 1, emissive: 1, gravity: 0 });
        // P2: with the effects pass on, its billboards carry the fire, smoke and debris; the low-poly core stays (one fireball, two smoke balls)
        if (this.ext) {
            for (let i = 0; i < 2; i++)
                this.list.push({ x: x + R() * size * 0.4, y: y + size * 0.5, z: z + R() * size * 0.4, vx: R(), vy: 1.5 + this.r() * size * 0.5, vz: R(), r0: size * 0.5, r1: size * (1.3 + this.r()), age: -0.2 * i, life: 2.4 + this.r(), c0: SMOKE, c1: SMOKE_LIGHT, a0: 0.45, emissive: 0, gravity: -0.6 });
            return;
        }
        for (let i = 0; i < 2; i++)
            this.list.push({ x: x + R() * size * 0.5, y: y + size * 0.3, z: z + R() * size * 0.5, vx: R() * 2, vy: size * 0.8, vz: R() * 2, r0: size * 0.3, r1: size * 0.9, age: 0, life: 0.4 + this.r() * 0.2, c0: FIRE_HOT, c1: FIRE, a0: 0.9, emissive: 1, gravity: 0 });
        for (let i = 0; i < 5; i++)
            this.list.push({ x: x + R() * size * 0.6, y: y + size * 0.5, z: z + R() * size * 0.6, vx: R() * 1.5, vy: 1.5 + this.r() * size * 0.6, vz: R() * 1.5, r0: size * 0.5, r1: size * (1.4 + this.r()), age: -0.15 * i, life: 2.2 + this.r() * 1.2, c0: SMOKE, c1: SMOKE_LIGHT, a0: 0.5, emissive: 0, gravity: -0.6 });
        for (let i = 0; i < 6; i++)
            this.list.push({ x, y: y + size * 0.4, z, vx: R() * size * 3, vy: 4 + this.r() * size * 3, vz: R() * size * 3, r0: 0.12 * size + 0.1, r1: 0.1 * size, age: 0, life: 1.1 + this.r() * 0.6, c0: DEBRIS, c1: DEBRIS, a0: 1, emissive: 0, gravity: 9.8 });
    }
    /** Impact where a shot ended: a hot flash, a few sparks flying off, a puff of dust. `k`: size (splash weapons ~1.8). */
    spark(x, y, z, glow, k = 1) {
        this.ext?.spark(x, y, z, glow, k); // P2
        if (this.ext) {
            this.rings.push({ x, y, z, r0: 0.4, r1: 2.2, age: 0, life: 0.2, team: 3, a0: 0.35 });
            return;
        } // P2: the effects pass draws the impact
        const R = () => this.r() * 2 - 1;
        this.list.push({ x, y, z, vx: 0, vy: 1, vz: 0, r0: 0.5 * k, r1: 1.6 * k, age: 0, life: 0.22, c0: [1, 0.95, 0.8], c1: glow, a0: 0.95, emissive: 1, gravity: 0 });
        for (let i = 0; i < 4; i++)
            this.list.push({ x, y, z, vx: R() * 9 * k, vy: 3 + this.r() * 7 * k, vz: R() * 9 * k, r0: 0.12, r1: 0.05, age: 0, life: 0.3 + this.r() * 0.25, c0: [1, 0.9, 0.6], c1: [1, 0.5, 0.15], a0: 1, emissive: 1, gravity: 14 });
        this.rings.push({ x, y, z, r0: 0.4, r1: 2.2, age: 0, life: 0.2, team: 3, a0: 0.35 }); // impact: small and faint
        this.list.push({ x, y, z, vx: 0, vy: 1.2, vz: 0, r0: 0.6 * k, r1: 1.8 * k, age: 0, life: 0.8, c0: SMOKE, c1: SMOKE_LIGHT, a0: 0.3, emissive: 0, gravity: -0.4 });
    }
    /** Muzzle flash: a short bright glow (k: size; the player's own shots are larger). */
    muzzle(x, y, z, glow, k = 1, sustain = 0) {
        this.ext?.muzzle(x, y, z, k, sustain); // P2
        if (this.ext && sustain <= 0 && k < 1.6)
            return; // P2: the effects pass draws the flash (the own guns' glow stays)
        // sustain > 0 (an automatic weapon's own shots): a short core, and the glow held for one shot period, so the next
        // shot's flash overlaps it and a held trigger gives one flickering glow, not a strobe
        this.list.push({ x, y, z, vx: 0, vy: 0, vz: 0, r0: 0.6 * k, r1: 1.0 * k, age: 0, life: sustain > 0 ? 0.05 : 0.08, c0: [1, 1, 0.9], c1: glow, a0: sustain > 0 ? 0.8 : 1, emissive: 1, gravity: 0, nf: false });
        this.list.push({ x, y, z, vx: 0, vy: 0.6, vz: 0, r0: 0.3 * k, r1: (sustain > 0 ? 0.9 : 1.4) * k, age: 0, life: Math.max(0.14, sustain), c0: [1, 0.85, 0.5], c1: glow, a0: sustain > 0 ? 0.4 : 0.55, emissive: 1, gravity: 0, nf: false });
    }
    update(dt) {
        let w = 0;
        for (let i = 0; i < this.list.length; i++) {
            const p = this.list[i];
            p.age += dt;
            if (p.age >= p.life)
                continue;
            if (p.age > 0) {
                p.vy -= p.gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.z += p.vz * dt;
                if (p.gravity > 0) {
                    p.vx *= 0.98;
                    p.vz *= 0.98;
                }
            }
            this.list[w++] = p;
        }
        this.list.length = w;
        if (this.list.length > 4000)
            this.list.splice(0, this.list.length - 4000);
        let k = 0;
        for (const r of this.rings) {
            r.age += dt;
            if (r.age < r.life)
                this.rings[k++] = r;
        }
        this.rings.length = k;
        if (this.rings.length > 600)
            this.rings.splice(0, this.rings.length - 600);
    }
    /** Rings as unit instances for the edge shader: x, y, z, 0, 0, team, alpha (phase slot), radius (scale slot). */
    fillRings(out) {
        let n = 0;
        for (const r of this.rings) {
            if (r.age < 0)
                continue;
            if ((n + 1) * render_ts_1.INST_FLOATS > out.length)
                break;
            const t = r.age / r.life, k = n * render_ts_1.INST_FLOATS, e = 1 - (1 - t) * (1 - t);
            out[k] = r.x;
            out[k + 1] = r.y;
            out[k + 2] = r.z;
            out[k + 3] = 0;
            out[k + 4] = 0;
            out[k + 5] = r.team;
            out[k + 6] = r.a0 * (1 - t * t);
            out[k + 7] = r.r0 + (r.r1 - r.r0) * e;
            out[k + 8] = 0;
            out[k + 9] = 0;
            out[k + 10] = 0;
            out[k + 11] = 0;
            n++;
        }
        return n;
    }
    /** C8 (QA4 bug 7): effects near the camera fade out instead of filling the screen. `eye`: the camera position (null: no fade). */
    nearFaded = 0;
    fill(out, eye = null) {
        let n = 0;
        this.nearFaded = 0;
        for (const p of this.list) {
            if (p.age < 0)
                continue;
            if ((n + 1) * render_ts_1.FX_FLOATS > out.length)
                break;
            const t = p.age / p.life, k = n * render_ts_1.FX_FLOATS;
            out[k] = p.x;
            out[k + 1] = p.y;
            out[k + 2] = p.z;
            out[k + 3] = p.r0 + (p.r1 - p.r0) * Math.sqrt(t);
            out[k + 4] = p.c0[0] + (p.c1[0] - p.c0[0]) * t;
            out[k + 5] = p.c0[1] + (p.c1[1] - p.c0[1]) * t;
            out[k + 6] = p.c0[2] + (p.c1[2] - p.c0[2]) * t;
            out[k + 7] = p.a0 * (p.emissive ? 1 - t * t : Math.min(1, (1 - t) * 1.6));
            out[k + 8] = p.emissive;
            if (eye && p.nf !== false) {
                const f = nearFade(out[k] - eye[0], out[k + 1] - eye[1], out[k + 2] - eye[2], out[k + 3], exports.PUFF_NEAR);
                if (f < 1) {
                    out[k + 7] *= f;
                    this.nearFaded++;
                    if (f <= 0)
                        continue;
                }
            }
            n++;
        }
        for (let i = 0; i + render_ts_1.FX_FLOATS <= this.once.length && (n + 1) * render_ts_1.FX_FLOATS <= out.length; i += render_ts_1.FX_FLOATS) {
            for (let j = 0; j < render_ts_1.FX_FLOATS; j++)
                out[n * render_ts_1.FX_FLOATS + j] = this.once[i + j];
            if (eye) {
                const k = n * render_ts_1.FX_FLOATS, f = nearFade(out[k] - eye[0], out[k + 1] - eye[1], out[k + 2] - eye[2], out[k + 3], exports.DOT_NEAR);
                if (f < 1) {
                    out[k + 7] *= f;
                    this.nearFaded++;
                    if (f <= 0)
                        continue;
                }
            }
            n++;
        }
        this.once.length = 0;
        for (let i = 0; i + render_ts_1.FX_FLOATS <= this.keep.length && (n + 1) * render_ts_1.FX_FLOATS <= out.length; i += render_ts_1.FX_FLOATS) {
            for (let j = 0; j < render_ts_1.FX_FLOATS; j++)
                out[n * render_ts_1.FX_FLOATS + j] = this.keep[i + j];
            n++;
        }
        this.keep.length = 0;
        return n;
    }
}
exports.Fx = Fx;
/** C8: the size on screen (radius / distance) where a near effect starts to fade, and where it is gone: world puffs
 * (smoke, fireballs) fade from about a quarter of the view height across, gone at half; marker dots (beacon pillars, the call's
 * target ring and throw arc, pods) from about 30 px across at 720 p, gone at 60 px. */
exports.PUFF_NEAR = [0.2, 0.4], exports.DOT_NEAR = [0.025, 0.05];
function nearFade(dx, dy, dz, r, lim) {
    const d = Math.hypot(dx, dy, dz), k = d > 1e-3 ? r / d : 1e9;
    return k <= lim[0] ? 1 : k >= lim[1] ? 0 : (lim[1] - k) / (lim[1] - lim[0]);
}
