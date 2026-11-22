"use strict";
// Ruling 130 (designer 16 Nov 21:45): the sentry-gun call lands an orbital drop pod sentry. Pure helpers for the page:
// the fall (streak, retro-thruster burn, dust kick-up), the deploy after the thud (petals open, the weapon head rises),
// the manned HUD (twin guns on LMB, rocket salvo on RMB with its reload). The logic tests call these directly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.POD_STATUS = exports.PodTracker = exports.POD_DEPLOY_S = exports.POD_SETTLE_S = exports.POD_DUST_H = exports.POD_RETRO_S = exports.POD_FALL_H = exports.POD_FALL_S = void 0;
exports.podFallHeight = podFallHeight;
exports.podRetro = podRetro;
exports.podDust = podDust;
exports.podDeploy = podDeploy;
exports.podGunnerBar = podGunnerBar;
/** The pod is drawn falling for the last POD_FALL_S seconds before impact. */
exports.POD_FALL_S = 2.5;
/** Height (m) the fall starts from. */
exports.POD_FALL_H = 320;
/** Retro thrusters fire for the last POD_RETRO_S seconds; dust is kicked up below POD_DUST_H metres. */
exports.POD_RETRO_S = 0.9, exports.POD_DUST_H = 30;
/** After the thud: smoke settles for POD_SETTLE_S, then the deploy (petals, head) takes POD_DEPLOY_S (the sim's
 *  params.deploySeconds 1.5 holds its fire that long, so the head is up before it starts working). */
exports.POD_SETTLE_S = 0.2, exports.POD_DEPLOY_S = 1.3;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** Height over the ground of a pod `secs` before impact: fast from orbit, braked by the retros, still ~23 m/s at the thud. */
function podFallHeight(secs) {
    const k = clamp01(secs / exports.POD_FALL_S);
    return exports.POD_FALL_H * k * (0.18 + 0.82 * k);
}
/** Retro-thruster burn 0..1 (0 before the last POD_RETRO_S seconds; full at the ground). */
function podRetro(secs) {
    if (secs < 0 || secs > exports.POD_RETRO_S)
        return 0;
    return 0.45 + 0.55 * (1 - secs / exports.POD_RETRO_S);
}
/** Dust kicked up by the retros 0..1 (height h over the ground). */
function podDust(h) { return h >= exports.POD_DUST_H ? 0 : 1 - h / exports.POD_DUST_H; }
/** Deploy progress 0 (closed) .. 1 (petals open, head up) `s` seconds after the thud (the shader's iC.x). */
function podDeploy(s) { return clamp01((s - exports.POD_SETTLE_S) / exports.POD_DEPLOY_S); }
/**
 * Remembers the sentry pods' impacts and when each pod entity was first seen, so a pod that landed while watched opens
 * on screen and one first seen later (joined, came into view) is drawn open.
 */
class PodTracker {
    impacts = [];
    t0 = new Map();
    /** Last rocket salvo per pod entity (ms). */
    salvo = new Map();
    noteImpact(x, z, nowMs) {
        this.impacts = this.impacts.filter((q) => nowMs - q.t < 6000);
        this.impacts.push({ x, z, t: nowMs });
    }
    /** Deploy progress of pod `id` at (x, z) now. */
    progress(id, x, z, nowMs) {
        let t = this.t0.get(id);
        if (t === undefined) {
            const q = this.impacts.find((p) => Math.hypot(p.x - x, p.z - z) < 8 && nowMs - p.t < 4000);
            t = q ? q.t : nowMs - 60000;
            this.t0.set(id, t);
            if (this.t0.size > 64) {
                const k = this.t0.keys().next().value;
                if (k !== undefined)
                    this.t0.delete(k);
            }
        }
        return podDeploy((nowMs - t) / 1000);
    }
    /** A rocket of pod `id` was launched now; true when it starts a new salvo (not a later rocket of the same one). */
    rocket(id, nowMs) {
        const last = this.salvo.get(id);
        if (last !== undefined && nowMs - last < 600)
            return false;
        this.salvo.set(id, nowMs);
        return true;
    }
    /** Seconds until pod `id`'s rocket pod is loaded again (0: ready), for a reload of `reloadS`. */
    reload(id, nowMs, reloadS) {
        const last = this.salvo.get(id);
        return last === undefined ? 0 : Math.max(0, reloadS - (nowMs - last) / 1000);
    }
}
exports.PodTracker = PodTracker;
/** The bar while manning the drop pod sentry: both weapons and the rocket reload. */
function podGunnerBar(reloadLeft, reloadS, salvo) {
    const rk = reloadLeft > 0.05
        ? `CANNON <b>RELOADING ${reloadLeft.toFixed(1)} s</b> <span class="podbar"><i style="width:${Math.round(100 * (1 - reloadLeft / reloadS))}%"></i></span>`
        : `CANNON <b>READY</b>`;
    return `MANNING THE SENTRY · <b>LMB</b> machine guns · <b>RMB</b> ${rk} · mouse aims (the head turns at its own speed) · F / E: leave (it goes back to automatic)`;
}
/** Status line while manning. */
exports.POD_STATUS = "manning the sentry · LMB machine guns, RMB cannon · F / E leave";
