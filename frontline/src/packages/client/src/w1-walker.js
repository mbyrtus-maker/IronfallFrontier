"use strict";
// W1 (designer 16 Nov 13:26): the Strider walks on four legs. The procedural gait, pure (no DOM / WebGL): main.ts feeds
// it the drawn position and hull yaw each frame and draws the body and the four legs (meshes.ts siege + sleg kinds,
// render.ts two-bone leg IK) from what it returns.
//
//   gait       a trot: diagonal pairs (front-left + rear-right, front-right + rear-left) swing half a cycle apart; each
//              foot is in the air for WALKER.swing of the cycle. A planted foot keeps its world position (it never
//              slides); the cycle advances with the fastest neutral foot point's ground speed (hull speed plus the
//              turn, so turning in place steps too): one stride (WALKER.stride) of travel per stance, so the cycle rate
//              is tied to the actual ground speed. Stopped, it finishes the steps that bring every foot back under its
//              hip and stands (idle stand)
//   swing      a lifted foot travels from where it left the ground to its neutral point plus the lead that puts it
//              under the hip at mid-stance, on an eased arc WALKER.lift high; it lands on the terrain (ground(x, z))
//   body       follows the ground under the four feet (height, pitch and roll, damped), bobs down at each pair's
//              footfall and sways toward the supporting pair; main.ts adds a slight lean from acceleration
//   footfalls  every landing is reported (sound: footfall thuds; dust)
//
// Logic tests: test/logic/w1-walker.test.mjs.
Object.defineProperty(exports, "__esModule", { value: true });
exports.WALKER = void 0;
exports.newGait = newGait;
exports.modelToWorld = modelToWorld;
exports.gaitStep = gaitStep;
exports.bodyPoint = bodyPoint;
exports.legPose = legPose;
/** Gait and geometry constants (model space of the siege kind: +x forward, +y up, +z right; metres, seconds). */
exports.WALKER = {
    /** Hip joints (model space, from the ground under the hull origin): front right, front left, rear right, rear left.
     *  W2 (designer 16 Nov 14:36, "massive, off the ground"): on the outer faces of the big hip housings at the hull's
     *  corners, 6.4 m up (belly 5 m off the ground). */
    hips: [[4.7, 11.0, 4.3], [4.7, 11.0, -4.3], [-5.3, 11.0, 4.3], [-5.3, 11.0, -4.3]],
    /** Designer 20 Nov ("make the strider twice as tall and fix its legs stance"): the hull is built RISE m higher than
     *  W2's (then "30% shorter": belly 9.6 m up, the top 17.3 m), the legs drawn legScale times longer (thickness kept near W2's), and the feet
     *  planted a little wider so the legs stand nearly straight (a slight knee) instead of crouching spider-like. */
    rise: 4.6, legScale: 1.4,
    /** Neutral foot points (model x, z) under the stance: splayed out, the front pair angled forward. */
    feet: [[8.4, 7.3], [8.4, -7.3], [-8.1, 7.3], [-8.1, -7.3]],
    /** Phase offsets: the diagonal pairs (FR + RL, FL + RR) half a cycle apart. */
    offsets: [0.5, 0, 0, 0.5],
    /** Thigh (hip to knee) and shin (knee to sole) lengths. */
    L1: 5.0, L2: 4.2,
    /** Stride: how far a planted foot travels relative to the hull during its stance (m). */
    stride: 4.8,
    /** Fraction of the cycle a foot is in the air. */
    swing: 0.38,
    /** Foot lift at mid-swing (m) for a full stride. */
    lift: 2.0,
    /** Settle steps (stopped, a foot off its neutral point): one cycle in this many seconds. */
    settleCycle: 1.6,
    /** A foot farther than this from its neutral point (m) when stopped steps back under its hip. */
    settleDist: 1.0,
    /** Below this foot speed (m/s) the gait does not advance by speed (only settle steps). */
    minSpeed: 0.25,
    /** Body: dip (m) at each footfall and roll sway (rad) toward the supporting pair at full stride; slope follow 0..1. */
    bob: 0.4, sway: 0.018, slopeFollow: 0.7,
    /** Height of the stance above the ground at the hull origin (the kind's hover offset). W2: 0, the model is built
     *  from the ground up (model y = the sim's up: the muzzles and seat zones read straight off the mesh). */
    stance: 0,
};
/** Frontline: the bipedal mech's gait (two Strider legs under a narrow torso; the legs walk in turn). */
exports.MECH_WALKER = { ...exports.WALKER, hips: [[0.2, 6.3, 1.75], [0.2, 6.3, -1.75]], feet: [[0.35, 1.75], [0.35, -1.75]], offsets: [0, 0.5],
    stride: 5.4, swing: 0.42, lift: 1.4, bob: 0.3, sway: 0.04, settleDist: 0.5, biped: true, legScale: 0.8, rise: 0 }; // designer 19 Nov: "a slightly longer stride still" (was 4.6)
function newGait(W = exports.WALKER) {
    const feet = [], n = W.hips.length;
    for (let i = 0; i < n; i++)
        feet.push({ x: 0, y: 0, z: 0, swing: false, sx: 0, sz: 0, yaw: 0, syaw: 0, qs: 0 });
    return { W, init: false, p: 0, feet, vx: 0, vz: 0, w: 0, amp: 0, px: 0, pz: 0, pyaw: 0, nx: new Array(n).fill(0), nz: new Array(n).fill(0), dy: 0, pitch: 0, roll: 0, steps: 0 };
}
const frac = (v) => v - Math.floor(v);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI)
    d -= 2 * Math.PI; while (d < -Math.PI)
    d += 2 * Math.PI; return d; };
/** Model (x, z) to world at hull (x0, z0, yaw): the renderer's rotation (render.ts rot). */
function modelToWorld(mx, mz, x0, z0, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [x0 + mx * c - mz * s, z0 + mx * s + mz * c];
}
/**
 * One frame of the gait: hull drawn at (x, z) with yaw, frame time dt (s), ground height ground(x, z), the type's top
 * speed (for the amplitude). Mutates and returns the frame result.
 */
function gaitStep(g, x, z, yaw, dt, ground, top) {
    // a long frame (a slow machine, a hidden tab) is walked in sub-steps of at most a tenth of a cycle, the hull's pose
    // interpolated, so no step is skipped and no foot is left behind
    if (g.init && dt > 0 && Math.hypot(x - g.px, z - g.pz) <= 30) {
        const span = Math.hypot(x - g.px, z - g.pz) + Math.abs(angDiff(yaw, g.pyaw)) * 9;
        const n = Math.min(12, Math.ceil((span * (1 - g.W.swing)) / g.W.stride / 0.1));
        if (n > 1) {
            const x0 = g.px, z0 = g.pz, y0 = g.pyaw, dyaw = angDiff(yaw, y0), landed = [];
            let f = null;
            for (let k = 1; k <= n; k++) {
                f = stepOnce(g, x0 + (x - x0) * k / n, z0 + (z - z0) * k / n, y0 + dyaw * k / n, dt / n, ground, top);
                landed.push(...f.landed);
            }
            f.landed = landed;
            return f;
        }
    }
    return stepOnce(g, x, z, yaw, dt, ground, top);
}
function stepOnce(g, x, z, yaw, dt, ground, top) {
    const W = g.W, NL = W.hips.length, out = { dy: g.dy, pitch: g.pitch, roll: g.roll, landed: [], rate: 0 };
    const neutral = (i) => modelToWorld(W.feet[i][0], W.feet[i][1], x, z, yaw);
    if (!g.init || !(dt > 0) || Math.hypot(x - g.px, z - g.pz) > 30) {
        for (let i = 0; i < NL; i++) {
            const [fx, fz] = neutral(i), f = g.feet[i];
            f.x = fx;
            f.z = fz;
            f.y = ground(fx, fz);
            f.swing = false;
            f.yaw = yaw;
            g.nx[i] = fx;
            g.nz[i] = fz;
        }
        g.init = true;
        g.px = x;
        g.pz = z;
        g.pyaw = yaw;
        g.vx = g.vz = g.w = 0;
        bodyFollow(g, x, z, yaw, ground, 1);
        out.dy = g.dy;
        out.pitch = g.pitch;
        out.roll = g.roll;
        return out;
    }
    const vdt = Math.min(dt, 0.5);
    dt = Math.min(dt, 0.1);
    // hull velocity and turn rate from the drawn track (smoothed over ~0.1 s: snapshot steps)
    const a = 1 - Math.exp(-dt * 10);
    g.vx += ((x - g.px) / vdt - g.vx) * a;
    g.vz += ((z - g.pz) / vdt - g.vz) * a;
    g.w += (angDiff(yaw, g.pyaw) / vdt - g.w) * a;
    g.px = x;
    g.pz = z;
    g.pyaw = yaw;
    // the fastest neutral foot point's ground speed (hull speed + turn: rotating (rx, rz) moves it by w (-rz, rx)), and how
    // far the neutral points actually moved this frame (the cycle advances by that: exact at any frame rate)
    let s = 0, disp = 0, swinging = false, travel = 0;
    const ux = new Array(NL).fill(0), uz = new Array(NL).fill(0);
    for (let i = 0; i < NL; i++) {
        const [nx, nz] = neutral(i), rx = nx - x, rz = nz - z;
        travel = Math.max(travel, Math.hypot(nx - g.nx[i], nz - g.nz[i]));
        g.nx[i] = nx;
        g.nz[i] = nz;
        ux[i] = g.vx - g.w * rz;
        uz[i] = g.vz + g.w * rx;
        s = Math.max(s, Math.hypot(ux[i], uz[i]));
        const f = g.feet[i];
        if (f.swing)
            swinging = true;
        else
            disp = Math.max(disp, Math.hypot(f.x - nx, f.z - nz));
    }
    let rate = s > W.minSpeed ? (s * (1 - W.swing)) / W.stride : 0; // cycles per second (for the swing's lead)
    let dp = s > W.minSpeed ? (travel * (1 - W.swing)) / W.stride : 0; // one stride of travel per stance
    if (s <= W.minSpeed && (swinging || disp > W.settleDist)) {
        dp = dt / W.settleCycle;
        if (rate < 1 / W.settleCycle)
            rate = 1 / W.settleCycle;
    }
    if (s <= W.minSpeed)
        for (let i = 0; i < NL; i++) {
            ux[i] = 0;
            uz[i] = 0;
        } // settling: feet go back under the hips
    if (dp > 0.3)
        dp = 0.3;
    // W2 (longer legs: a foot dragged a whole cycle overreaches): setting off from a stand with every foot down, the cycle
    // skips ahead to where both pairs are in stance, so the first pair lifts within a fraction of a cycle
    if (dp > 0 && !swinging) {
        const f0 = frac(g.p);
        if (f0 < W.swing)
            g.p += W.swing - f0;
        else if (f0 >= 0.5 && f0 < 0.5 + W.swing)
            g.p += 0.5 + W.swing - f0;
    }
    const p0 = g.p, p1 = p0 + dp;
    g.p = p1;
    out.rate = rate;
    const T = rate > 0 ? 1 / rate : W.settleCycle;
    for (let i = 0; i < NL; i++) {
        const f = g.feet[i], q0 = frac(p0 + W.offsets[i]), q1 = frac(p1 + W.offsets[i]);
        const wrapped = dp > 0 && q1 < q0;
        const [nx, nz] = neutral(i);
        // a planted foot inside its swing window (it stayed home while settling) lifts late if enough of the window is left
        if (!f.swing && dp > 0 && q1 < W.swing && (wrapped || q0 >= W.swing || W.swing - q1 > 0.15)) {
            // lift off only if this foot needs the step (stopped and already home: it stays planted)
            if (s > W.minSpeed || Math.hypot(f.x - nx, f.z - nz) > W.settleDist * 0.5) {
                f.swing = true;
                f.sx = f.x;
                f.sz = f.z;
                f.syaw = f.yaw;
                f.qs = wrapped || q0 >= W.swing ? 0 : q0;
            }
        }
        if (f.swing) {
            if (q1 >= W.swing) {
                // landing: on the target, on the ground
                const [tx, tz] = target(W, nx, nz, ux[i], uz[i], 0, T);
                f.x = tx;
                f.z = tz;
                f.y = ground(tx, tz);
                f.swing = false;
                f.yaw = yaw;
                out.landed.push(i);
                g.steps++;
            }
            else {
                const sp = Math.min(1, Math.max(0, (q1 - f.qs) / (W.swing - f.qs))), e = sp * sp * (3 - 2 * sp);
                const [tx, tz] = target(W, nx, nz, ux[i], uz[i], (W.swing - q1) * T, T);
                f.x = f.sx + (tx - f.sx) * e;
                f.z = f.sz + (tz - f.sz) * e;
                f.yaw = f.syaw + angDiff(yaw, f.syaw) * e;
                const len = Math.hypot(tx - f.sx, tz - f.sz);
                f.y = ground(f.x, f.z) + W.lift * Math.min(1, 0.35 + len / W.stride) * Math.sin(Math.PI * sp);
            }
        }
        else {
            f.y = ground(f.x, f.z);
            // a foot left far behind (teleport, a snapshot jump): back under the hip
            if (Math.hypot(f.x - nx, f.z - nz) > 1.8 * W.stride) {
                f.x = nx;
                f.z = nz;
                f.y = ground(nx, nz);
                f.yaw = yaw;
            }
        }
    }
    // amplitude: the stride being walked (0 standing .. 1 full speed)
    const want = Math.min(1, Math.max(s > W.minSpeed ? s / Math.max(1, top) : 0, rate > 0 ? 0.3 : 0));
    g.amp += (want - g.amp) * Math.min(1, dt * 4);
    bodyFollow(g, x, z, yaw, ground, Math.min(1, dt * 6));
    // footfall dip (each pair lands at q = swing) and sway toward the pair on the ground
    const ph = frac(g.p - W.swing) * 2 * Math.PI;
    out.dy = g.dy - W.bob * g.amp * (0.5 + 0.5 * Math.cos(2 * ph));
    out.pitch = g.pitch;
    out.roll = g.roll + W.sway * g.amp * Math.sin(ph);
    return out;
}
/** Where swinging foot i should land: its neutral point plus the lead (remaining swing + half the stance) at its speed, capped. */
function target(W, nx, nz, ux, uz, left, T) {
    let lx = ux * (left + (1 - W.swing) * T * 0.5), lz = uz * (left + (1 - W.swing) * T * 0.5);
    const l = Math.hypot(lx, lz), cap = W.stride * 0.6;
    if (l > cap) {
        lx *= cap / l;
        lz *= cap / l;
    }
    return [nx + lx, nz + lz];
}
/** Body height / pitch / roll from the ground under the four neutral foot points (k: smoothing step 0..1). */
function bodyFollow(g, x, z, yaw, ground, k) {
    const W = g.W, h = [];
    for (let i = 0; i < W.feet.length; i++) {
        const [fx, fz] = modelToWorld(W.feet[i][0], W.feet[i][1], x, z, yaw);
        h.push(ground(fx, fz));
    }
    if (h.length === 2) { // Frontline: two legs: height from both feet, roll across them, no pitch
        const c2 = ground(x, z), wid2 = W.feet[0][1] - W.feet[1][1];
        g.dy += (((h[0] + h[1]) / 2 - c2) * 0.6 - g.dy) * k;
        g.pitch += (0 - g.pitch) * k;
        g.roll += (Math.atan2(h[1] - h[0], wid2) * W.slopeFollow - g.roll) * k;
        return;
    }
    const c = ground(x, z), mean = (h[0] + h[1] + h[2] + h[3]) / 4;
    const len = W.feet[0][0] - W.feet[2][0], wid = W.feet[0][1] - W.feet[1][1];
    const pitch = Math.atan2((h[0] + h[1]) / 2 - (h[2] + h[3]) / 2, len) * W.slopeFollow;
    const roll = Math.atan2((h[1] + h[3]) / 2 - (h[0] + h[2]) / 2, wid) * W.slopeFollow; // right side lower: roll > 0
    const dy = (mean - c) * 0.6;
    g.dy += (dy - g.dy) * k;
    g.pitch += (pitch - g.pitch) * k;
    g.roll += (roll - g.roll) * k;
}
/**
 * World position of model point (mx, my, mz) on the walker body drawn at (x, y, z, yaw) with the tilt (pitch, roll)
 * and stance offset: the renderer's transform (render.ts unitWorld: tilt about 1 m up, then yaw, then the kind's hover).
 */
function bodyPoint(mx, my, mz, x, y, z, yaw, pitch, roll) {
    let px = mx, py = my - 1, pz = mz;
    {
        const c = Math.cos(pitch), s = Math.sin(pitch);
        const nx = px * c - py * s, ny = px * s + py * c;
        px = nx;
        py = ny;
    }
    {
        const c = Math.cos(-roll), s = Math.sin(-roll);
        const nz = pz * c - py * s, ny = pz * s + py * c;
        pz = nz;
        py = ny;
    }
    py += 1;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [x + px * c - pz * s, y + py + exports.WALKER.stance, z + px * s + pz * c];
}
/**
 * The leg's two-bone pose (the shader's, render.ts walkerLeg): horizontal reach d and drop dy from hip to sole, thigh
 * L1, shin L2, knee up. Returns the hip pitch, the knee point (d, y in the leg plane) and the sole actually reached.
 */
function legPose(d, dy, L1 = exports.WALKER.L1, L2 = exports.WALKER.L2) {
    const D0 = Math.hypot(d, dy), D = Math.min(L1 + L2 - 0.01, Math.max(Math.abs(L1 - L2) + 0.01, D0));
    const base = Math.atan2(dy, d), ca = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D);
    const hip = base + Math.acos(Math.max(-1, Math.min(1, ca)));
    const kx = L1 * Math.cos(hip), ky = L1 * Math.sin(hip), sa = Math.atan2(dy - ky, d - kx);
    return { hip, kx, ky, fx: kx + L2 * Math.cos(sa), fy: ky + L2 * Math.sin(sa) };
}
