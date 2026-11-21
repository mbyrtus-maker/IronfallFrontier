"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrewDispatch = exports.CDF_RESERVE = exports.CD_CANCELLED = exports.CD_BOARDED = exports.CD_SENT = exports.PT_CREW = exports.ACT_DISPATCH = void 0;
exports.operatorSeatsFree = operatorSeatsFree;
exports.dispatchCrew = dispatchCrew;
exports.dispatchStep = dispatchStep;
const data_ts_1 = require("./data.js");
const events_ts_1 = require("./events.js");
exports.ACT_DISPATCH = 63;
/** Pilot task while sent to a vehicle (1 walking home, 2 stealing: unit-ai.ts). */
exports.PT_CREW = 3;
exports.CD_SENT = 1, exports.CD_BOARDED = 2, exports.CD_CANCELLED = 3;
/** CREW_DISPATCH flags: the pilot came out of the reserve. */
exports.CDF_RESERVE = 1;
class CrewDispatch {
    /** pilot id -> vehicle id. */
    to = new Map();
    /** Derived (not state): vehicle id -> pilots on the way. */
    count = new Map();
    refresh() { this.count.clear(); for (const v of this.to.values())
        this.count.set(v, (this.count.get(v) ?? 0) + 1); }
    enRoute(vehicleId) { return this.count.get(vehicleId) ?? 0; }
    keys() { return [...this.to.keys()].sort((a, b) => a - b); }
    hash(word) { word(0xc1d15); const k = this.keys(); word(k.length); for (const p of k) {
        word(p);
        word(this.to.get(p));
    } }
    exportTo(w) { const k = this.keys(); w.i32(k.length); for (const p of k) {
        w.i32(p);
        w.i32(this.to.get(p));
    } }
    restoreFrom(r) { this.to = new Map(); for (let i = 0, n = r.i32(); i < n; i++) {
        const p = r.i32();
        this.to.set(p, r.i32());
    } this.refresh(); }
}
exports.CrewDispatch = CrewDispatch;
/** Empty operator seats of vehicle slot vs, the driver seat first, then the gunner seats in order (transport-held seats skipped). */
function operatorSeatsFree(sim, vs) {
    const d = sim.d, t = sim.etype[vs], ns = d.tSeatCount[t], dj = d.tDriverSeat[t], out = [];
    if (dj < 0)
        return out;
    const free = (j) => sim.occ[vs * data_ts_1.MAX_SEATS + j] === 0 && !(sim.tp !== null && sim.tp.held(sim.eid[vs], j));
    if (free(dj))
        out.push(dj);
    for (let j = 0; j < ns; j++) {
        if (j === dj)
            continue;
        const role = d.tSeatRole[t * data_ts_1.MAX_SEATS + j];
        if ((role === data_ts_1.SEAT_DRIVER || role === data_ts_1.SEAT_GUNNER) && free(j))
            out.push(j);
    }
    return out;
}
/** Body slot of a free AI pilot (see the header), or -1. */
function freeBody(sim, p, team, allowSent) {
    if (p.team !== team || p.player >= 0 || p.state !== 1 || p.hackVehicle !== 0 || (!allowSent && p.task === exports.PT_CREW))
        return -1;
    const s = sim.idToSlot.get(p.entity);
    if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0 || sim.airborne[s] !== 0)
        return -1;
    return s;
}
/** Why vehicle slot vs cannot take a pilot of `team` now (null: it can). */
function vehicleWhy(sim, team, vs) {
    if (vs === undefined || !sim.alive[vs] || sim.hp[vs] <= 0)
        return "unknownVehicle";
    if (sim.team[vs] !== team)
        return "notOwner";
    if (!sim.crewable(vs) || sim.d.tStructure[sim.etype[vs]])
        return "notCrewable";
    if (sim.critTick[vs] >= 0)
        return "hullCritical";
    return null;
}
function send(sim, C, p, s, vehicleId, vs, home) {
    C.to.set(p.id, vehicleId);
    C.refresh();
    p.task = exports.PT_CREW;
    sim.kitWalkTo(s, sim.x[vs], sim.z[vs]);
    sim.events.push(events_ts_1.EV.CREW_DISPATCH, sim.tick, p.team, p.id, vehicleId, exports.CD_SENT, home >= 0 ? sim.eid[home] : 0, sim.eid[s], 0, home >= 0 ? exports.CDF_RESERVE : 0);
}
/** ACT_DISPATCH (see the header). */
function dispatchCrew(sim, team, vehicleId, bodyId, want) {
    const vs = sim.idToSlot.get(vehicleId);
    const why = vehicleWhy(sim, team, vs);
    if (why)
        return { ok: false, reason: why };
    const seats = operatorSeatsFree(sim, vs).length;
    if (seats === 0)
        return { ok: false, reason: "vehicleCrewed" };
    const C = sim.dispatchState();
    let free = seats - C.enRoute(vehicleId);
    if (bodyId > 0) {
        const ps = sim.idToSlot.get(bodyId), pid = ps !== undefined ? sim.slotPilot[ps] : 0, p = pid ? sim.pilots.get(pid) : undefined;
        if (!p)
            return { ok: false, reason: "unknownPilot" };
        if (p.team !== team)
            return { ok: false, reason: "notOwner" };
        if (p.player >= 0)
            return { ok: false, reason: "notPlayerPilot" };
        const s = freeBody(sim, p, team, true);
        if (s < 0)
            return { ok: false, reason: "pilotBusy" };
        if (C.to.get(p.id) === vehicleId)
            return { ok: true };
        if (free <= 0)
            return { ok: false, reason: "crewEnRoute" };
        if (C.to.has(p.id)) {
            C.to.delete(p.id);
            C.refresh();
        }
        send(sim, C, p, s, vehicleId, vs, -1);
        return { ok: true, ids: [p.id] };
    }
    if (free <= 0)
        return { ok: false, reason: "crewEnRoute" };
    const n = Math.max(1, Math.min(free, Math.floor(want) || 1));
    const ids = [];
    const vx = sim.x[vs], vz = sim.z[vs];
    for (let k = 0; k < n; k++) {
        // nearest free pilot on foot
        let best = null, bs = -1, bd = Infinity;
        for (const p of sim.pilots.values()) {
            const s = freeBody(sim, p, team, false);
            if (s < 0)
                continue;
            const dx = sim.x[s] - vx, dz = sim.z[s] - vz, d2 = dx * dx + dz * dz;
            if (d2 < bd || (d2 === bd && best !== null && p.id < best.id)) {
                bd = d2;
                best = p;
                bs = s;
            }
        }
        // nearest serving pilot home, if the reserve has a pilot
        let home = -1, hd = Infinity;
        const P = sim.pool;
        if (P !== null && P.avail[team] > 0) {
            for (let o = 0; o < sim.hi; o++) {
                if (!sim.alive[o] || sim.team[o] !== team || sim.hp[o] <= 0 || !sim.d.tPilotHome[sim.etype[o]] || !sim.homeServes(o))
                    continue;
                const dx = sim.x[o] - vx, dz = sim.z[o] - vz, d2 = dx * dx + dz * dz;
                if (d2 < hd) {
                    hd = d2;
                    home = o;
                }
            }
        }
        if (best !== null && bd <= hd) {
            send(sim, C, best, bs, vehicleId, vs, -1);
            ids.push(best.id);
            continue;
        }
        if (home >= 0) {
            if (sim.slotsLeft() < 1) {
                if (!ids.length)
                    return { ok: false, reason: "entityCapacity" };
                break;
            }
            const p = sim.reservePilotAt(team, home, vx, vz);
            P.members.add(p.id);
            P.avail[team]--;
            send(sim, C, p, sim.idToSlot.get(p.entity), vehicleId, vs, home);
            ids.push(p.id);
            continue;
        }
        if (!ids.length)
            return { ok: false, reason: "noFreePilot" };
        break;
    }
    return { ok: true, ids };
}
/** Pilot step (Sim.pilotStep): sent pilots walk on, board in reach, or give up. */
function dispatchStep(sim) {
    const C = sim.dispatch;
    if (C === null || C.to.size === 0)
        return;
    let changed = false;
    for (const pid of C.keys()) {
        const vid = C.to.get(pid), p = sim.pilots.get(pid);
        if (!p || p.state !== 1 || p.task !== exports.PT_CREW) {
            C.to.delete(pid);
            changed = true;
            if (p && p.task === exports.PT_CREW)
                p.task = 0;
            continue;
        } // boarded elsewhere, downed, dead or re-tasked
        const s = sim.idToSlot.get(p.entity);
        if (s === undefined) {
            C.to.delete(pid);
            changed = true;
            continue;
        }
        const vs = sim.idToSlot.get(vid);
        let why = vehicleWhy(sim, p.team, vs);
        if (!why && operatorSeatsFree(sim, vs).length === 0)
            why = "vehicleCrewed";
        if (why) {
            C.to.delete(pid);
            changed = true;
            sim.sendHome(p, s);
            sim.events.push(events_ts_1.EV.CREW_DISPATCH, sim.tick, p.team, pid, vid, exports.CD_CANCELLED, sim.reasonCodeOf(why), p.entity, 0, 0);
            continue;
        }
        if (sim.pilotInReach(s, vs)) {
            const seat = operatorSeatsFree(sim, vs)[0];
            const r = sim.enter(pid, vid, seat, p.team);
            if (r.ok) {
                C.to.delete(pid);
                changed = true;
                sim.events.push(events_ts_1.EV.CREW_DISPATCH, sim.tick, p.team, pid, vid, exports.CD_BOARDED, seat, 0, 0, 0);
                continue;
            }
        }
        if ((sim.tick + pid) % 10 === 0)
            sim.kitWalkTo(s, sim.x[vs], sim.z[vs]); // the vehicle may move: re-aim
    }
    if (changed)
        C.refresh();
}
