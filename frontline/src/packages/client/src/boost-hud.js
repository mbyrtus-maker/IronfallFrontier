"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boostView = boostView;
exports.boostHud = boostHud;
exports.boostEdges = boostEdges;
/** No record: the meter is full and the vehicle is not boosting. */
function boostView(B) {
    return B ? { meter: B.meter, boosting: B.boosting, low: B.low } : { meter: 1, boosting: false, low: false };
}
const pc = (f) => `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`;
/** The driver's row: BOOSTING with the meter draining, RECHARGING (too low to start below the start fraction), READY. */
function boostHud(v, key = "Shift") {
    const state = v.boosting ? "boosting" : v.low ? "low" : v.meter < 1 ? "recharging" : "ready";
    const txt = state === "boosting" ? `BOOSTING ${pc(v.meter)}` : state === "low" ? `RECHARGING ${pc(v.meter)}` : state === "recharging" ? `${pc(v.meter)} · hold ${key}` : `READY · hold ${key} + W`;
    const html = `<div class="bz ${state}"><span><kbd>${key}</kbd> Boost</span><b>${txt}</b></div><i class="bzb ${state}"><b style="width:${pc(v.meter)}"></b></i>`;
    return { html, state };
}
/** What changed between two views of the own scout (cues to play). */
function boostEdges(was, now) {
    const w = was ?? boostView(undefined);
    return { started: !w.boosting && now.boosting, emptied: w.boosting && !now.boosting && now.meter <= 0.02, ready: w.meter < 1 && now.meter >= 1 && !now.boosting };
}
