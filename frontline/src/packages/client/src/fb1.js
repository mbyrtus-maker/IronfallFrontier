"use strict";
// Ruling 132 (FB1, designer 16 Nov 23:25): a forward base unfolds its own defences as it deploys (two turrets whose
// roof petals fold back and whose gun head rises, an arc of armour barricades that swing up from the ground) and folds
// them as it packs up. Pure helpers for the page; the logic tests call them directly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FbDefenceTracker = exports.FB_WALL = exports.FB_TURRET = exports.FB_DEF_RADIUS = void 0;
exports.turretDeploy = turretDeploy;
exports.wallDeploy = wallDeploy;
exports.defenceText = defenceText;
/** Defences of a base lie within this distance (m) of the base centre (sim: turrets 16 m, barricades 32 m). */
exports.FB_DEF_RADIUS = 45;
/** Building types of a forward base's own defences (points.forwardBase.defences). */
exports.FB_TURRET = "fb-turret", exports.FB_WALL = "fb-barricade";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/**
 * Remembers the FORWARD_BASE unfold / fold events (FB_DEFENCES / FB_FOLDING) by place and time, and gives each
 * defence its open fraction now: 0 folded .. 1 unfolded. One with no event near it (seen later, joined) is open.
 */
class FbDefenceTracker {
    ev = [];
    /** QA screenshots only: slow motion factor for the animation (the page's window.__fb1). */
    slow = 1;
    note(x, z, nowMs, secs, fold) {
        this.ev = this.ev.filter((q) => nowMs - q.t < q.ms + 5000);
        this.ev.push({ x, z, t: nowMs, ms: Math.max(1, secs * 1000 * this.slow), fold });
    }
    /** Open fraction of a defence at (x, z) now (the latest event within FB_DEF_RADIUS). */
    open(x, z, nowMs) {
        for (let i = this.ev.length - 1; i >= 0; i--) {
            const q = this.ev[i];
            if (Math.hypot(q.x - x, q.z - z) > exports.FB_DEF_RADIUS)
                continue;
            const f = clamp01((nowMs - q.t) / q.ms);
            if (q.fold)
                return 1 - f;
            if (nowMs - q.t < q.ms + 5000)
                return f;
        }
        return 1;
    }
    get size() { return this.ev.length; }
}
exports.FbDefenceTracker = FbDefenceTracker;
/** The shader's deploy value (iC.x) for a turret open by u: the petals fold back first, then the head rises (render.ts podPetals / podHead). */
function turretDeploy(u) { return clamp01(u); }
/** The shader's value for a barricade open by u: render.ts podPetals runs 0.08 (upright) .. 0.55 (flat), so the plate lies flat at u 0 and stands at u 1; segments rise one after another (k of n). */
function wallDeploy(u, k = 0, n = 1) {
    const lag = n > 1 ? (0.3 * k) / (n - 1) : 0, v = clamp01((u - lag) / (1 - 0.3));
    return 0.55 - 0.47 * v;
}
/** Feed line for the defences' own FORWARD_BASE phases. */
function defenceText(phase, count, at, own) {
    return phase === "unfold"
        ? `FORWARD BASE DEFENCES UNFOLDING at ${at} · ${count === 1 ? "1 piece" : `${count} pieces`}${own ? "" : " · ENEMY"}`
        : `FORWARD BASE DEFENCES FOLDING at ${at}${own ? "" : " · ENEMY"}`;
}
