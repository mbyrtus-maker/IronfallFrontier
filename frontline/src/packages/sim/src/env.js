"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSpeedFactor = envSpeedFactor;
exports.envCanStep = envCanStep;
exports.envSignature = envSignature;
exports.envLavaStep = envLavaStep;
const data_ts_1 = require("./data.js");
/** Movement class of slot s for the terrain layer (data.ts tMove; structures: none). */
function cls(h, s) { return h.d.tMove[h.etype[s]]; } // W1: movement class (walker 5, air 6, structure 7 = TL_CLASSES)
/** Speed factor of slot s from its terrain cell and the weather. onGround: false for a pilot in the air. */
function envSpeedFactor(h, s, onGround = true) {
    let f = 1;
    const t = h.etype[s];
    if (h.d.tAir[t]) {
        if (h.weather)
            f *= h.weather.aircraftSpeed();
    }
    else if (h.tlayer && onGround)
        f *= h.tlayer.speedAt(h.x[s], h.z[s], cls(h, s), h.weather ? h.weather.soft() : false);
    return f;
}
/** May ground slot s step from (ox, oz) to (nx, nz)? Never into an impassable cell from a passable one. */
function envCanStep(h, s, ox, oz, nx, nz) {
    const L = h.tlayer;
    if (!L)
        return true;
    const k = cls(h, s);
    if (k >= data_ts_1.MOVE_AIR)
        return true;
    return L.passableAt(nx, nz, k) || !L.passableAt(ox, oz, k);
}
/** Signature factor of slot o from its terrain cell (concealment; plumes while moving on soft ground). */
function envSignature(h, o) {
    const L = h.tlayer;
    if (!L || h.d.tAir[h.etype[o]] || h.d.tStructure[h.etype[o]])
        return 1;
    const t = L.typeAt(h.x[o], h.z[o], h.weather ? h.weather.soft() : false);
    let f = L.sig[t];
    if (L.plume[t] !== 1 && (h.velX[o] !== 0 || h.velZ[o] !== 0))
        f *= L.plume[t];
    return f;
}
/**
 * Lava (terrain.json liquid lavaDamagePerSecond after lavaDamageAfterSeconds): ground vehicles standing in a lava cell.
 * Calls hurt(slot, damage) for each; keeps the linger timers (entities that left or died are dropped).
 */
function envLavaStep(h, live, n, hurt) {
    const L = h.tlayer;
    if (!L || !(L.lavaDps > 0))
        return;
    const dt = h.d.dt, seen = new Set();
    for (let k = 0; k < n; k++) {
        const s = live[k], t = h.etype[s];
        if (!h.alive[s] || h.hp[s] <= 0 || !h.d.tVehicle[t] || h.d.tAir[t])
            continue;
        if (L.lava[L.cellAt(h.x[s], h.z[s])] !== 1)
            continue;
        const id = h.eid[s], v = (L.linger.get(id) ?? 0) + dt;
        L.linger.set(id, v);
        seen.add(id);
        if (v > L.lavaAfter + 1e-9)
            hurt(s, L.lavaDps * dt);
    }
    for (const id of Array.from(L.linger.keys()))
        if (!seen.has(id))
            L.linger.delete(id);
}
