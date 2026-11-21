"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAVE_REMOVE = exports.LEAVE_TO_AI = exports.ACT_LEAVE = exports.ACT_JOIN = void 0;
exports.compileCoopRules = compileCoopRules;
exports.coopJoin = coopJoin;
exports.coopLeave = coopLeave;
exports.playerCount = playerCount;
const events_ts_1 = require("./events.js");
const data_ts_1 = require("./data.js");
const progression_ts_1 = require("./progression.js");
/** Action kinds (reserved 40-44): 40 join, 41 leave; 42-44 in stealth.ts. */
exports.ACT_JOIN = 40, exports.ACT_LEAVE = 41;
exports.LEAVE_TO_AI = 0, exports.LEAVE_REMOVE = 1;
function compileCoopRules(constants, tickRate) {
    const s = constants.coop?.dropPodSeconds;
    return { dropPodTicks: typeof s === "number" && s >= 0 ? Math.round(s * tickRate) : 0 };
}
function coreOf(sim, team) {
    const tc = sim.coreTypes();
    let best = -1;
    for (let s = 0; s < sim.hi; s++)
        if (sim.alive[s] && sim.team[s] === team && tc[sim.etype[s]] && sim.hp[s] > 0 && (best < 0 || sim.eid[s] < sim.eid[best]))
            best = s;
    return best;
}
/** Adds player `player` to human team `team` (drop pod at the team's Command Core). Result ids: [pilot id]. */
function coopJoin(sim, team, player) {
    const d = sim.d;
    if (!d.crewOn || !Number.isInteger(team) || team < 0 || team >= sim.nTeams || !Number.isInteger(player) || player < 0 || player > 255)
        return { ok: false, reason: "notJoinable" };
    const M = sim.match;
    if (M && M.over)
        return { ok: false, reason: "matchOver" }; // QA3-15: like every other input after the end
    if (M && (!M.inMatch(team) || M.isAi(team)))
        return { ok: false, reason: "notJoinable" };
    for (const p of sim.pilots.values())
        if (p.player === player)
            return { ok: false, reason: "playerExists" };
    const cs = coreOf(sim, team);
    if (cs < 0)
        return { ok: false, reason: "noDropPoint" };
    const p = sim.newPilot(team, player, 0);
    if (sim.prog)
        (0, progression_ts_1.progOnPilot)(sim, p.id); // QA3-10: the profile applied for this player (calls), as spawnPilot does
    const land = sim.tick + sim.coopRules.dropPodTicks;
    p.state = 2;
    p.respawnTick = land;
    p.lastX = sim.x[cs];
    p.lastZ = sim.z[cs];
    p.aliveSince = land;
    sim.events.push(events_ts_1.EV.PLAYER_JOINED, sim.tick, team, p.id, player, sim.eid[cs], land - sim.tick, sim.x[cs], sim.z[cs], 0);
    recount(sim);
    return { ok: true, ids: [p.id] };
}
/** Removes player pilot `pilotId` (mode LEAVE_TO_AI or LEAVE_REMOVE). */
function coopLeave(sim, pilotId, mode, team) {
    const p = sim.pilots.get(pilotId);
    if (!p)
        return { ok: false, reason: "unknownPilot" };
    if (team !== undefined && p.team !== team)
        return { ok: false, reason: "notOwner" };
    if (p.player < 0)
        return { ok: false, reason: "notPlayerPilot" };
    const player = p.player;
    // rulings 75 / 76: a leaver in a PASSENGER seat is removed (the AI takes over only a pilot on foot or in a crew seat)
    if (p.state === 0 && mode !== exports.LEAVE_REMOVE) {
        const vs = sim.idToSlot.get(p.vehicle);
        if (vs !== undefined && (sim.d.tSeatRole[sim.etype[vs] * data_ts_1.MAX_SEATS + p.seat] === data_ts_1.SEAT_PASSENGER || sim.d.tBunker[sim.etype[vs]]))
            mode = exports.LEAVE_REMOVE;
    } // B1: a leaver in a bunker is removed too (no AI mans bunkers)
    (0, progression_ts_1.progOnLeave)(sim, player, p.team, p.aliveSince); // QA3-7: the battle result is judged for the team he left from
    let left = 0;
    // the player's production items stay in the team's queues (the squad's units), untagged
    for (const q of sim.prod.values())
        for (const it of q.items)
            if (it.by === player)
                it.by = -1;
    if (sim.calls) {
        // ruling 72: a carried heavy weapon (weapon pod) VANISHES with the leaving player: off the body he leaves behind too
        const cs = sim.calls.callers.get(p.id);
        if (cs && cs.heavy >= 0 && (p.state === 1 || p.state === 3)) {
            const bs = sim.idToSlot.get(p.entity);
            if (bs !== undefined && sim.mCount[bs] >= 2)
                sim.mWeapon[bs * data_ts_1.MAX_MOUNTS + 1] = sim.d.tMounts[sim.etype[bs] * data_ts_1.MAX_MOUNTS + 1];
        }
        sim.calls.callers.delete(p.id);
    }
    if (sim.kit)
        sim.kit.pilots.delete(p.id);
    p.hackVehicle = 0;
    p.hackSeq = 0;
    p.hackSeat = -1;
    if (p.state === 0) {
        const vs = sim.idToSlot.get(p.vehicle);
        left = p.vehicle;
        if (vs !== undefined) {
            sim.releaseSeatControl(vs, p.seat);
            if (mode === exports.LEAVE_REMOVE) {
                sim.occ[vs * data_ts_1.MAX_SEATS + p.seat] = 0;
                sim.pilots.delete(p.id);
            }
            else
                p.player = -1;
            sim.recomputeCrew(vs);
        }
        else
            sim.pilots.delete(p.id);
    }
    else if (p.state === 1 || p.state === 3) {
        const s = sim.idToSlot.get(p.entity);
        left = p.entity;
        if (s !== undefined && p.state === 1 && mode !== exports.LEAVE_REMOVE) {
            sim.ctlOn[s] = 0;
            sim.ctlFlags[s] = 0;
            sim.ctlTool[s] = 0;
            sim.ctlMask[s] = 0;
            sim.ctlFire[s] = 0;
            sim.stance[s] = 0;
            sim.stanceT[s] = 0;
            p.player = -1;
            sim.sendHome(p, s);
        }
        else {
            if (s !== undefined)
                sim.despawn(s);
            sim.pilots.delete(p.id);
        }
    }
    else {
        if (p.state === 4 && p.seat >= 0) {
            const vs = sim.idToSlot.get(p.vehicle);
            if (vs !== undefined && sim.occ[vs * data_ts_1.MAX_SEATS] === p.id)
                sim.gunRelease(vs);
        }
        sim.pilots.delete(p.id);
    } // ruling 125: a leaving gunner's turret goes back to automatic
    sim.events.push(events_ts_1.EV.PLAYER_LEFT, sim.tick, p.team, p.id, player, mode === exports.LEAVE_REMOVE ? 1 : 0, left, 0, 0, 0);
    // w3b (battlegroups.ts): to the AI, the vehicle he drove passes to the squad's battle groups (GROUP added event)
    if (mode !== exports.LEAVE_REMOVE && p.state === 0 && left)
        sim.passUnitsToSquad(p.team, [left]);
    recount(sim);
    return { ok: true, ids: [p.id] };
}
/** Player pilots on the match's human teams (all teams without match rules). */
function playerCount(sim) {
    const M = sim.match;
    let n = 0;
    for (const p of sim.pilots.values())
        if (p.player >= 0 && (!M || (M.inMatch(p.team) && !M.isAi(p.team))))
            n++;
    return n;
}
function recount(sim) {
    if (!sim.match)
        return;
    const n = playerCount(sim);
    sim.match.setPlayers(n < 1 ? 1 : n > 4 ? 4 : n);
}
