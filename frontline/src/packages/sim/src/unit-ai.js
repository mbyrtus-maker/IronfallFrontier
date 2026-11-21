"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PT_STEAL = void 0;
exports.unitAiRules = unitAiRules;
exports.segDist2 = segDist2;
exports.unitAiCover = unitAiCover;
exports.unitAiPilots = unitAiPilots;
function need(v, path) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
        throw new Error(`unit AI: data field constants.unitAi.${path} missing or not a non-negative number`);
    return v;
}
/** Compiles constants.unitAi for the sim's match (null: absent). teamDifficulty(team): the match difficulty of an AI team, or null. */
function unitAiRules(data, tickRate, teamDifficulty) {
    const u = data.constants.unitAi;
    if (!u || typeof u !== "object")
        return null;
    const aimMul = new Float64Array(4), reactTicks = new Int32Array(4), scanTicks = new Int32Array(4), hijack = new Uint8Array(4);
    for (let t = 0; t < 4; t++) {
        const k = teamDifficulty(t) ?? u.friendlyDifficulty;
        const d = u.difficulties?.[k];
        if (!d)
            throw new Error(`unit AI: constants.unitAi.difficulties.${String(k)} missing`);
        aimMul[t] = need(d.dispersionMultiplier, `difficulties.${k}.dispersionMultiplier`);
        reactTicks[t] = Math.max(1, Math.round(need(d.reactionSeconds, `difficulties.${k}.reactionSeconds`) * tickRate));
        scanTicks[t] = Math.max(1, Math.round(need(d.scanSeconds, `difficulties.${k}.scanSeconds`) * tickRate));
        hijack[t] = teamDifficulty(t) !== null && d.pilotHijack === true ? 1 : 0;
    }
    return {
        aimMul, reactTicks, scanTicks,
        focus: Math.min(1, need(u.focusFireWeight, "focusFireWeight")), longGun: need(u.longGunRangeMetres, "longGunRangeMetres"),
        holdFrac: need(u.holdRangeFraction, "holdRangeFraction"), kiteSpeed: need(u.kiteMinSpeed, "kiteMinSpeed"), kiteMargin: need(u.kiteMarginMetres, "kiteMarginMetres"),
        leash: need(u.leashMetres, "leashMetres"),
        hijack, hijackRadius: need(u.pilotHijackRadiusMetres, "pilotHijackRadiusMetres"),
        coverTicks: Math.max(1, Math.round(need(u.coverThinkSeconds, "coverThinkSeconds") * tickRate)), coverSearch: need(u.coverSearchMetres, "coverSearchMetres"),
    };
}
/** Distance squared from (px, pz) to the segment (ax, az)-(bx, bz). */
function segDist2(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
    let f = l2 > 1e-12 ? ((px - ax) * vx + (pz - az) * vz) / l2 : 0;
    if (f < 0)
        f = 0;
    else if (f > 1)
        f = 1;
    const dx = px - (ax + f * vx), dz = pz - (az + f * vz);
    return dx * dx + dz * dz;
}
/** Cover cell types of the terrain layer (breaksLineOfSight or signatureMultiplier < 1). */
function coverAt(sim, x, z) {
    const L = sim.tlayer;
    const t = L.typeAt(x, z, false);
    return L.losBreak[t] === 1 || L.sig[t] < 1;
}
/** The cover step (every coverTicks; needs a terrain layer). Infantry = armour class 0, not pilots. */
function unitAiCover(sim, R) {
    const L = sim.tlayer;
    if (!L || sim.tick % R.coverTicks !== 0)
        return;
    const d = sim.d, cm = L.cell, n = Math.ceil(R.coverSearch / cm);
    for (let s = 0; s < sim.hi; s++) {
        if (!sim.alive[s] || sim.hp[s] <= 0 || d.tStructure[sim.etype[s]] || d.tArmour[sim.etype[s]] !== 0 || sim.etype[s] === d.pilotType)
            continue;
        if (sim.ordType[s] !== 0 || sim.ord.ext.has(sim.eid[s]) || sim.ctlOn[s] || sim.tgtSlot[s] < 0)
            continue;
        if (coverAt(sim, sim.x[s], sim.z[s]))
            continue;
        const ci = Math.floor(sim.x[s] / cm), cj = Math.floor(sim.z[s] / cm);
        let bx = 0, bz = 0, bd = Infinity;
        for (let j = cj - n; j <= cj + n; j++)
            for (let i = ci - n; i <= ci + n; i++) {
                const x = (i + 0.5) * cm, z = (j + 0.5) * cm;
                if (x < 0 || z < 0 || x > sim.mapSize || z > sim.mapSize || !coverAt(sim, x, z) || !L.passableAt(x, z, 0))
                    continue;
                const dd = (x - sim.x[s]) ** 2 + (z - sim.z[s]) ** 2;
                if (dd <= R.coverSearch * R.coverSearch && dd < bd) {
                    bd = dd;
                    bx = x;
                    bz = z;
                }
            }
        if (bd < Infinity)
            sim.order([sim.eid[s]], { type: "move", x: bx, z: bz });
    }
}
/** Pilot task value: walking to an enemy vehicle to steal it (task 1 = walking home, sim.ts). */
exports.PT_STEAL = 2;
/** Pilot step (after kitAiReboard): AI-team pilots walking home hijack an empty enemy vehicle in reach (difficulty pilotHijack). */
function unitAiPilots(sim, R) {
    const d = sim.d, M = sim.match;
    if (!M || !d.crewOn)
        return;
    for (const p of sim.pilots.values()) {
        if (p.player >= 0 || !R.hijack[p.team & 3] || p.state !== 1 || (p.task !== 1 && p.task !== exports.PT_STEAL) || p.hackVehicle !== 0 || (sim.tick + p.id) % 10 !== 0)
            continue;
        const s = sim.idToSlot.get(p.entity);
        if (s === undefined || sim.airborne[s] !== 0 || sim.hp[s] <= 0)
            continue;
        let best = -1, bg = R.hijackRadius;
        for (let o = 0; o < sim.hi; o++) {
            if (!sim.alive[o] || sim.team[o] === p.team || !M.inMatch(sim.team[o]) || sim.hp[o] <= 0 || sim.critTick[o] >= 0 || sim.nOcc[o] !== 0)
                continue;
            if (d.tDriverSeat[sim.etype[o]] < 0 || d.tStructure[sim.etype[o]])
                continue;
            const g = sim.gap(s, o);
            if (g <= bg) {
                bg = g;
                best = o;
            }
        }
        if (best < 0) {
            if (p.task === exports.PT_STEAL)
                p.task = 1;
            continue;
        } // nothing left to steal: home again (sim.ts re-aims it)
        const r = sim.enter(p.id, sim.eid[best]);
        if (!r.ok) {
            p.task = exports.PT_STEAL;
            sim.kitWalkTo(s, sim.x[best], sim.z[best]);
        } // walking to it (the walk home does not re-aim a task-2 pilot)
    }
}
