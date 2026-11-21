"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAT_RED = void 0;
exports.laserView = laserView;
exports.laserHud = laserHud;
exports.laserEdges = laserEdges;
/** Heat (0..1) from which the heat bar turns red. */
exports.HEAT_RED = 0.75;
function laserView(L, dt) {
    if (!L)
        return { charge: 0, cooldownS: 0, cooldownFrac: 0, heat: 0, overheated: false, lockS: 0, lockFrac: 0, aiCooling: false };
    return {
        charge: L.charge, cooldownS: L.cooldownTicks * dt, cooldownFrac: L.cooldownFull > 0 ? Math.min(1, L.cooldownTicks / L.cooldownFull) : 0,
        heat: L.heat, overheated: L.overheated, lockS: L.lockTicks * dt, lockFrac: L.lockFull > 0 ? Math.min(1, L.lockTicks / L.lockFull) : 0, aiCooling: false,
    };
}
const pc = (f) => `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`;
/**
 * The Lancer driver's rows: LMB laser cannon (CHARGING with a bar filling over the charge time, COOLDOWN with its timer and
 * a bar refilling, READY · hold LMB) and RMB rapid laser (HEAT bar, red near full; OVERHEATED with its countdown).
 */
function laserHud(v, cannon, rapid, cKey = "LMB", rKey = "RMB") { // Frontline: a null name leaves its row out
    const state = v.charge > 0 ? "charging" : v.cooldownS > 0 ? "cooldown" : "ready";
    const cTxt = state === "charging" ? `CHARGING ${pc(v.charge)}` : state === "cooldown" ? `COOLDOWN ${v.cooldownS.toFixed(1)} s` : "READY · hold LMB";
    const cFill = state === "charging" ? v.charge : state === "cooldown" ? 1 - v.cooldownFrac : 1;
    const heatRed = v.overheated || v.heat >= exports.HEAT_RED;
    const hTxt = v.overheated ? `OVERHEATED ${v.lockS.toFixed(1)} s` : v.heat > 0 ? `HEAT ${pc(v.heat)}` : "COOL · hold RMB";
    const hFill = v.overheated ? v.lockFrac : v.heat;
    const html = `<div class="row"><span class="label">${cannon === null ? "Heat" : rapid === null ? "Charge" : "Lasers"}</span></div>`
        + (cannon === null ? "" : `<div class="lz ${state}"><span><kbd>${cKey}</kbd> ${cannon}</span><b>${cTxt.replace("hold LMB", `hold ${cKey}`)}</b></div><i class="lzb ${state}"><b style="width:${pc(cFill)}"></b></i>`)
        + (rapid === null ? "" : `<div class="lz${heatRed ? " hot" : ""}${v.overheated ? " over" : ""}"><span><kbd>${rKey}</kbd> ${rapid}</span><b>${hTxt.replace("hold RMB", `hold ${rKey}`)}</b></div><i class="lzb heat${heatRed ? " hot" : ""}${v.overheated ? " over" : ""}"><b style="width:${pc(hFill)}"></b></i>`);
    return { html, state, heatRed };
}
/** What changed between two views of one Lancer (cues and effects to start). */
function laserEdges(was, now) {
    const w = was ?? laserView(undefined, 1);
    return {
        chargeStart: w.charge <= 0 && now.charge > 0,
        fired: w.charge > 0 && now.charge <= 0 && now.cooldownS > 0,
        ready: w.cooldownS > 0 && now.cooldownS <= 0,
        overheat: !w.overheated && now.overheated,
        cooled: w.overheated && !now.overheated,
    };
}
