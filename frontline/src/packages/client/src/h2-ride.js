"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidePredictor = void 0;
// Ruling 112: own-vehicle prediction for a guest driving a hover vehicle (the vehicle twin of c7b.ts OwnPredictor).
// The page steps its own vehicle once per sim tick with the sim's pure vehicleMoveStep (predict.ts: the same momentum,
// turn, boost and hop arithmetic as the host) and sends each input with a rising clientSeq. Each snapshot carries the
// host's exact own-vehicle state (DecodedPilot.ride, snapshot v29) and the last clientSeq the host applied: the predictor
// drops the inputs up to it and replays the rest from the host's state. The difference between the old and the new
// prediction is kept as a fading visual offset (a nudge from a collision is not a jump); a large one snaps. With momentum
// the host and the guest agree exactly on open ground, so the driven vehicle does not rubber-band.
const predict_ts_1 = require("../../sim/src/predict.js");
const smooth_ts_1 = require("./smooth.js");
class RidePredictor {
    R;
    type;
    ground;
    hist = [];
    state = null;
    prev = null;
    seq = 0;
    stepAt = 0;
    err = { x: 0, y: 0, z: 0 };
    stats = { steps: 0, reconciles: 0, snaps: 0, maxCorrection: 0, lastCorrection: 0, acked: 0, pending: 0 };
    static SNAP_M = 4;
    /** T1: relief walls (relief.ts reliefStepRule; null: none). */
    canStep;
    constructor(R, type, ground, seq0 = 0, canStep) { this.R = R; this.type = type; this.ground = ground; this.seq = seq0; this.canStep = canStep ?? undefined; }
    reset() { this.hist = []; this.state = null; this.prev = null; this.err = { x: 0, y: 0, z: 0 }; }
    /** One tick of the own input; returns its clientSeq (null before the first host state). */
    step(inp, now) {
        if (!this.state)
            return null;
        const s = ++this.seq;
        this.prev = this.state;
        this.state = (0, predict_ts_1.vehicleMoveStep)(this.R, this.state, inp, this.ground, this.canStep);
        this.hist.push({ seq: s, inp, after: this.state });
        if (this.hist.length > 120)
            this.hist.shift();
        this.stepAt = now;
        this.stats.steps++;
        this.stats.pending = this.hist.length;
        return s;
    }
    /** A snapshot's exact own-vehicle state and the last clientSeq the host applied. */
    reconcile(h, inputSeq) {
        this.stats.reconciles++;
        this.stats.acked = inputSeq;
        while (this.hist.length && this.hist[0].seq <= inputSeq)
            this.hist.shift();
        const base = { ...h, y: this.ground(h.x, h.z) + h.hopH };
        if (!this.state) {
            this.state = base;
            this.prev = base;
            return;
        }
        let s = base, p = base;
        for (const x of this.hist) {
            p = s;
            s = (0, predict_ts_1.vehicleMoveStep)(this.R, s, x.inp, this.ground, this.canStep);
            x.after = s;
        }
        const dx = this.state.x - s.x, dy = this.state.y - s.y, dz = this.state.z - s.z, d = Math.hypot(dx, dz);
        this.stats.lastCorrection = d;
        if (d > this.stats.maxCorrection)
            this.stats.maxCorrection = d;
        if (d > RidePredictor.SNAP_M) {
            this.err = { x: 0, y: 0, z: 0 };
            this.stats.snaps++;
        }
        else {
            this.err.x += dx;
            this.err.y += dy;
            this.err.z += dz;
        }
        this.state = s;
        this.prev = this.hist.length ? p : s;
        this.stats.pending = this.hist.length;
    }
    /** The drawn vehicle: between the last two predicted ticks, plus the fading offset; yaw from the predicted hull. */
    pos(now, tickMs, frameDt) {
        const s = this.state, p = this.prev ?? s;
        if (!s || !p)
            return null;
        const f = Math.max(0, Math.min(1, (now - this.stepAt) / tickMs));
        const k = Math.exp(-frameDt * 10);
        this.err.x *= k;
        this.err.y *= k;
        this.err.z *= k;
        const ya = Math.atan2(p.dirZ, p.dirX), yb = Math.atan2(s.dirZ, s.dirX);
        let dy = yb - ya;
        if (dy > Math.PI)
            dy -= 2 * Math.PI;
        else if (dy < -Math.PI)
            dy += 2 * Math.PI;
        return { x: p.x + (s.x - p.x) * f + this.err.x, y: p.y + (s.y - p.y) * f + this.err.y, z: p.z + (s.z - p.z) * f + this.err.z, vx: s.vx, vz: s.vz, yaw: ya + dy * f, hop: (0, smooth_ts_1.altAt)(p.hopH, p.vy * this.R.dt, s.hopH, s.vy * this.R.dt, 1, f, true) }; // j1: the hop arc between ticks (Hermite with both vertical speeds: the sim's parabola), not a line
    }
}
exports.RidePredictor = RidePredictor;
