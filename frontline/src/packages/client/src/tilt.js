"use strict";
// Ruling 112 (Battlezone hover handling) on screen: hover vehicles lean into turns and strafes and dip the nose on
// braking (roll / pitch from the drawn velocity's lateral and longitudinal acceleration, through an under-damped spring),
// and settle on the hover after a hop (a short dip of the hull on landing). Pure (no DOM / WebGL): main.ts feeds it the
// interpolated position each frame and packs the angles into the instance's walk-phase slot (render.ts tiltOf); the
// first-person chase camera follows a softened copy. Logic tests: test/logic/h2-tilt.test.mjs.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TILT = void 0;
exports.newTilt = newTilt;
exports.tiltStep = tiltStep;
exports.packTilt = packTilt;
exports.unpackTilt = unpackTilt;
exports.TILT = {
    /** rad per m/s^2 of acceleration (forward: nose up on thrust, down on braking; lateral: lean into the turn / strafe). */
    pitchPerAccel: 0.006, rollPerAccel: 0.006, // designer playtest 15 Nov 21:38: "a little too wobbly" (was 0.011 / 0.012)
    /** Largest lean (rad, about 14 degrees). */
    max: 0.14, // about 8 degrees (was 0.25)
    /** Spring of the angles: stiffness (1/s^2) and damping (1/s): under-damped, a little overshoot. */
    k: 60, c: 15, // critically damped: no overshoot (was c 9)
    /** Velocity smoothing (1/s) before the acceleration is taken (snapshots step at 20 Hz). */
    vSmooth: 6,
    /** Landing: sink per m/s of landing speed, spring stiffness and damping. */
    landSink: 0.06, liftK: 120, liftC: 14, // j1: the hull keeps its fall speed into the hover and the spring brakes it (was 90 / 11 with a third of the speed cut at touch-down)
};
function newTilt() { return { vx: 0, vz: 0, pitch: 0, roll: 0, pitchV: 0, rollV: 0, lift: 0, liftV: 0, alt: 0, altV: 0, init: false }; }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/**
 * One frame: drawn velocity (vx, vz) m/s, hull yaw (rad), height above the ground (m), frame time (s). weight scales the
 * lean (1 hover vehicles; walkers less). Returns the state (mutated).
 */
function tiltStep(st, vx, vz, yaw, alt, dt, weight = 1) {
    if (!(dt > 0))
        return st;
    dt = Math.min(dt, 0.1);
    if (!st.init) {
        st.vx = vx;
        st.vz = vz;
        st.alt = alt;
        st.init = true;
        return st;
    }
    const a = 1 - Math.exp(-exports.TILT.vSmooth * dt);
    const nvx = st.vx + (vx - st.vx) * a, nvz = st.vz + (vz - st.vz) * a;
    const ax = (nvx - st.vx) / dt, az = (nvz - st.vz) / dt;
    st.vx = nvx;
    st.vz = nvz;
    const fx = Math.cos(yaw), fz = Math.sin(yaw);
    const along = ax * fx + az * fz, side = -ax * fz + az * fx; // right of the hull: (-sin, cos)
    // lean into the acceleration: thrust lifts the nose, braking dips it; a turn or strafe to the right drops the right side
    const wantP = clamp(along * exports.TILT.pitchPerAccel * weight, -exports.TILT.max, exports.TILT.max), wantR = clamp(side * exports.TILT.rollPerAccel * weight, -exports.TILT.max, exports.TILT.max);
    // hop landing: the hull sinks into its hover by the landing speed and springs back
    const altV = (alt - st.alt) / dt;
    // j1 (designer playtest 16 Nov 13:02): the drawn arc reaches the hover at its fall speed (smooth.ts altAt cushion) and
    // the settle spring takes that speed over as it is, so the height has no kink at touch-down (landSink kept for tuning)
    const landing = st.alt > 0.05 && alt <= 0.05 && st.altV < -1;
    if (landing)
        st.liftV += st.altV * Math.min(1, exports.TILT.landSink * 16.7);
    st.alt = alt;
    st.altV = altV;
    // springs, semi-implicit in sub-steps of at most 1/120 s (stable at any frame rate)
    const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let i = 0; i < n; i++) {
        st.pitchV += ((wantP - st.pitch) * exports.TILT.k - st.pitchV * exports.TILT.c) * h;
        st.pitch = clamp(st.pitch + st.pitchV * h, -exports.TILT.max, exports.TILT.max);
        st.rollV += ((wantR - st.roll) * exports.TILT.k - st.rollV * exports.TILT.c) * h;
        st.roll = clamp(st.roll + st.rollV * h, -exports.TILT.max, exports.TILT.max);
        if (!landing) {
            st.liftV += (-st.lift * exports.TILT.liftK - st.liftV * exports.TILT.liftC) * h;
            st.lift = clamp(st.lift + st.liftV * h, -0.8, 0.4);
        } // the landing frame's drop is the arc's
    }
    return st;
}
/** The instance's walk-phase slot for a tilt (render.ts tiltOf): 100 + pitch code * 1024 + roll code (codes 0..1023 over -0.4..0.4 rad). */
function packTilt(pitch, roll) {
    const q = (v) => Math.round((clamp(v, -0.4, 0.4) / 0.8 + 0.5) * 1023);
    return 100 + q(pitch) * 1024 + q(roll);
}
/** Inverse of packTilt (tests; the shader decodes the same way). */
function unpackTilt(v) {
    const w = v - 100, ip = Math.floor(w / 1024), ir = w - ip * 1024;
    return { pitch: (ip / 1023 - 0.5) * 0.8, roll: (ir / 1023 - 0.5) * 0.8 };
}
