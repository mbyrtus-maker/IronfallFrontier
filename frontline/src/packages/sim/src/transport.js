"use strict";
// Transports (wave 2 task E; design doc 8 "Transport and logistics", doc 11 Carrier and Mule).
//
// 1. Infantry boarding. An infantry squad (non-pilot infantry unit, e.g. Trooper squad, Sapper team) is ordered to
//    board a friendly transport (Sim.load / queueLoad, action 30): a vehicle listed in constants.transport.
//    infantryCarriers (Carrier, Mule). Each soldier takes one FREE passenger seat (a seat no pilot holds and no other
//    soldier holds); the order is refused when there is none (transportFull). The members walk to the transport and
//    climb in when within crew.enterRangeMetres (surface gap); an aircraft must be on the ground (an AI-flown Mule
//    lands while a squad is boarding it). Aboard, a soldier is out of the world (no entity: it cannot be shot, does not
//    shoot) and keeps its id, squad, health and shield in a cargo record. Event CARGO (63) flags 1 boarded.
// 2. Unloading (Sim.unload / queueUnload, action 31) at a spot: the transport is ordered to move there (an AI driver;
//    a player at the wheel drives it himself) and, once within transport.unloadRadiusMetres of it (and landed, for an
//    aircraft: an AI Mule lands there), one soldier steps out every transport.unloadIntervalSeconds beside the hull,
//    ordered on to the spot. Unloading continues under fire; there is no immunity while stepping out. A slung vehicle
//    is dropped at the same time (see 3). Event CARGO flags 2 unloaded.
// 3. Sling load (doc 11: the Mule "airlifts 2 vehicles or 1 heavy"). A unit with liftCapacity (the Mule) is ordered to
//    lift a friendly ground vehicle (Sim.airlift / queueAirlift, action 32): it flies to it and picks it up within
//    transport.liftReachMetres (horizontal surface gap). Up to liftCapacity.vehicles droppable vehicles, or
//    liftCapacity.heavy units with reserveDroppable false (and then nothing else). The slung vehicle stays a live
//    entity (it can be shot; its crew stays aboard) pinned transport.slingHangMetres below the lifter; it neither
//    drives nor fires while slung. Dropped by unload at the spot (it lands under the lifter). Event CARGO flags 4
//    lifted, 8 dropped. liftCapacity.cargo (ore / gas) is not built: the sim has no cargo pods.
// 4. A transport destroyed with soldiers aboard: each soldier rolls crew.carrierPassengerSurviveChance (the existing
//    passenger roll, sim PRNG, ascending seat); survivors are put on the ground around the wreck, the rest die aboard
//    (event CARGO_LOST 64). Pilots aboard go through the existing roll and the normal auto-eject (ruling 34). A
//    transport removed without a hull-critical step (destroy(), a bike-like death) loses every soldier aboard. A
//    destroyed lifter drops its sling load where it is.
// 5. The enemy commander ferry (enemy-ai.ts calls ferryCandidate / startFerry): see EnemyAi.
//
// State (created on first use: a sim that never uses transports hashes as before): cargo records (by vehicle, seat),
// boarding squads, unload orders, lifts. Hashed and exported (state.ts) when present.
Object.defineProperty(exports, "__esModule", { value: true });
exports.F_PLAYER = exports.Transport = exports.CG_DROPPED = exports.CG_LIFTED = exports.CG_UNLOADED = exports.CG_BOARDED = void 0;
exports.compileTransportRules = compileTransportRules;
exports.freePassengerSeats = freePassengerSeats;
exports.isSoldier = isSoldier;
exports.tpLoad = tpLoad;
exports.tpUnload = tpUnload;
exports.tpLift = tpLift;
exports.tpWantsLand = tpWantsLand;
exports.tpStep = tpStep;
exports.tpPin = tpPin;
exports.tpSlingPair = tpSlingPair;
exports.tpSlung = tpSlung;
exports.tpVehicleDown = tpVehicleDown;
exports.tpTeamChanged = tpTeamChanged;
exports.tpGone = tpGone;
exports.tpTryFerry = tpTryFerry;
exports.tpCargoOf = tpCargoOf;
const events_ts_1 = require("./events.js");
Object.defineProperty(exports, "F_PLAYER", { enumerable: true, get: function () { return events_ts_1.F_PLAYER; } });
const data_ts_1 = require("./data.js");
/** CARGO event flags (EV.CARGO, 63). */
exports.CG_BOARDED = 1, exports.CG_UNLOADED = 2, exports.CG_LIFTED = 4, exports.CG_DROPPED = 8;
function compileTransportRules(sim) {
    const d = sim.d, t = d.raw.constants.transport;
    const nu = d.unitCount;
    const carrier = new Uint8Array(nu), liftVehicles = new Int32Array(nu), liftHeavy = new Int32Array(nu), heavy = new Uint8Array(nu);
    const ids = t?.infantryCarriers ?? [];
    for (const id of ids) {
        const k = d.typeIds.indexOf(id);
        if (k >= 0 && k < nu)
            carrier[k] = 1;
    }
    d.raw.units.forEach((u, k) => {
        const lc = u.liftCapacity;
        if (lc) {
            liftVehicles[k] = lc.vehicles ?? 0;
            liftHeavy[k] = lc.heavy ?? 0;
        }
        if (u.reserveDroppable === false)
            heavy[k] = 1;
    });
    const num = (v, dflt) => (typeof v === "number" ? v : dflt);
    const ferry = (t?.ferry ?? {});
    const tr = d.constants.tickRate;
    return {
        carrier, liftVehicles, liftHeavy, heavy,
        unloadTicks: Math.max(1, Math.round(num(t?.unloadIntervalSeconds, 0.5) * tr)), unloadRadius: num(t?.unloadRadiusMetres, 15),
        liftReach: num(t?.liftReachMetres, 6), hang: num(t?.slingHangMetres, 4),
        ferryMin: num(ferry.minDistanceMetres, 0), ferryChance: num(ferry.chance, 0), ferryCooldownTicks: Math.round(num(ferry.cooldownSeconds, 0) * tr),
    };
}
const CARGO_F = ["vehicle", "seat", "id", "type", "team", "squad"];
class Transport {
    cargo = [];
    loads = [];
    unloads = [];
    lifts = [];
    ferries = [];
    /** Per team: tick of the last enemy-commander ferry. */
    lastFerry = [-1 << 30, -1 << 30, -1 << 30, -1 << 30];
    held(vehicle, seat) { for (const c of this.cargo)
        if (c.vehicle === vehicle && c.seat === seat)
            return true; return false; }
    aboard(vehicle) { return this.cargo.filter((c) => c.vehicle === vehicle); }
    used() { return this.cargo.length + this.loads.length + this.unloads.length + this.lifts.length + this.ferries.length > 0; }
    sortCargo() { this.cargo.sort((a, b) => a.vehicle - b.vehicle || a.seat - b.seat); }
    addCargo(c) { this.cargo.push(c); this.sortCargo(); }
    hash(word, num) {
        word(0x7a4590);
        word(this.cargo.length);
        for (const c of this.cargo) {
            for (const f of CARGO_F)
                word(c[f]);
            num(c.hp);
            num(c.shield);
        }
        word(this.loads.length);
        for (const l of this.loads) {
            word(l.squad);
            word(l.vehicle);
        }
        word(this.unloads.length);
        for (const u of this.unloads) {
            word(u.vehicle);
            num(u.x);
            num(u.z);
            word(u.next);
        }
        word(this.lifts.length);
        for (const l of this.lifts) {
            word(l.lifter);
            word(l.target);
            word(l.slung);
        }
        word(this.ferries.length);
        for (const f of this.ferries) {
            word(f.vehicle);
            word(f.squad);
            num(f.x);
            num(f.z);
        }
        for (const t of this.lastFerry)
            word(t);
    }
    exportTo(w) {
        w.i32(this.cargo.length);
        for (const c of this.cargo) {
            for (const f of CARGO_F)
                w.i32(c[f]);
            w.f64(c.hp);
            w.f64(c.shield);
        }
        w.i32(this.loads.length);
        for (const l of this.loads) {
            w.i32(l.squad);
            w.i32(l.vehicle);
        }
        w.i32(this.unloads.length);
        for (const u of this.unloads) {
            w.i32(u.vehicle);
            w.f64(u.x);
            w.f64(u.z);
            w.i32(u.next);
        }
        w.i32(this.lifts.length);
        for (const l of this.lifts) {
            w.i32(l.lifter);
            w.i32(l.target);
            w.i32(l.slung);
        }
        w.i32(this.ferries.length);
        for (const f of this.ferries) {
            w.i32(f.vehicle);
            w.i32(f.squad);
            w.f64(f.x);
            w.f64(f.z);
        }
        for (const t of this.lastFerry)
            w.i32(t);
    }
    restoreFrom(r) {
        this.cargo = [];
        this.loads = [];
        this.unloads = [];
        this.lifts = [];
        this.ferries = [];
        for (let i = 0, n = r.i32(); i < n; i++) {
            const c = { vehicle: 0, seat: 0, id: 0, type: 0, team: 0, squad: 0, hp: 0, shield: 0 };
            for (const f of CARGO_F)
                c[f] = r.i32();
            c.hp = r.f64();
            c.shield = r.f64();
            this.cargo.push(c);
        }
        for (let i = 0, n = r.i32(); i < n; i++)
            this.loads.push({ squad: r.i32(), vehicle: r.i32() });
        for (let i = 0, n = r.i32(); i < n; i++)
            this.unloads.push({ vehicle: r.i32(), x: r.f64(), z: r.f64(), next: r.i32() });
        for (let i = 0, n = r.i32(); i < n; i++)
            this.lifts.push({ lifter: r.i32(), target: r.i32(), slung: r.i32() });
        this.ferries = [];
        for (let i = 0, n = r.i32(); i < n; i++)
            this.ferries.push({ vehicle: r.i32(), squad: r.i32(), x: r.f64(), z: r.f64() });
        for (let k = 0; k < 4; k++)
            this.lastFerry[k] = r.i32();
    }
}
exports.Transport = Transport;
const rej = (reason) => ({ ok: false, reason });
/** Free passenger seats of vehicle slot vs: no pilot and no soldier in them (ascending). */
function freePassengerSeats(sim, vs) {
    const d = sim.d, t = sim.etype[vs], out = [], vid = sim.eid[vs];
    for (let j = 0; j < d.tSeatCount[t]; j++) {
        if (d.tSeatRole[t * data_ts_1.MAX_SEATS + j] !== data_ts_1.SEAT_PASSENGER || sim.occ[vs * data_ts_1.MAX_SEATS + j] !== 0)
            continue;
        if (sim.tp && sim.tp.held(vid, j))
            continue;
        out.push(j);
    }
    return out;
}
function isSoldier(sim, s) {
    const d = sim.d, t = sim.etype[s];
    return t < d.unitCount && d.tArmour[t] === data_ts_1.AC_INFANTRY && !d.tPilot[t] && !d.tStructure[t];
}
/** Load order (action 30): squad squadId boards vehicle vehicleId. */
function tpLoad(sim, squadId, vehicleId, team) {
    const sq = sim.squads.get(squadId);
    if (!sq || sq.members.length === 0)
        return rej("unknownUnit");
    if (team !== undefined && sq.team !== team)
        return rej("notOwner");
    const vs = sim.idToSlot.get(vehicleId);
    if (vs === undefined || !sim.alive[vs] || sim.hp[vs] <= 0)
        return rej("unknownVehicle");
    const R = sim.tpRules;
    if (!R.carrier[sim.etype[vs]])
        return rej("notTransport");
    if (sim.team[vs] !== sq.team)
        return rej("notFriendly");
    for (const id of sq.members) {
        const s = sim.idToSlot.get(id);
        if (s === undefined || !isSoldier(sim, s))
            return rej("notInfantry");
    }
    const T = sim.tpState();
    const pending = T.loads.filter((l) => l.vehicle === vehicleId && l.squad !== squadId).reduce((n, l) => n + (sim.squads.get(l.squad)?.members.length ?? 0), 0);
    if (freePassengerSeats(sim, vs).length - pending <= 0)
        return rej("transportFull");
    T.loads = T.loads.filter((l) => l.squad !== squadId);
    T.loads.push({ squad: squadId, vehicle: vehicleId });
    sim.order(sq.members, { type: "move", x: sim.x[vs], z: sim.z[vs] });
    return { ok: true, ids: sq.members.slice() };
}
/** Unload order (action 31): vehicle vehicleId unloads its soldiers and drops its sling load at (x, z). */
function tpUnload(sim, vehicleId, x, z, team) {
    const vs = sim.idToSlot.get(vehicleId);
    if (vs === undefined || !sim.alive[vs])
        return rej("unknownVehicle");
    if (team !== undefined && sim.team[vs] !== team)
        return rej("notOwner");
    const T = sim.tp;
    if (!T || (!T.cargo.some((c) => c.vehicle === vehicleId) && !T.lifts.some((l) => l.lifter === vehicleId && l.slung)))
        return rej("noCargo");
    T.unloads = T.unloads.filter((u) => u.vehicle !== vehicleId);
    T.unloads.push({ vehicle: vehicleId, x, z, next: sim.tick });
    T.unloads.sort((a, b) => a.vehicle - b.vehicle);
    if (!sim.driverIsPlayer(vs))
        sim.order([vehicleId], { type: "move", x, z });
    return { ok: true };
}
/** Airlift order (action 32): lifter lifterId picks up friendly ground vehicle targetId. */
function tpLift(sim, lifterId, targetId, team) {
    const d = sim.d, R = sim.tpRules;
    const ls = sim.idToSlot.get(lifterId), ts = sim.idToSlot.get(targetId);
    if (ls === undefined || !sim.alive[ls])
        return rej("unknownVehicle");
    if (team !== undefined && sim.team[ls] !== team)
        return rej("notOwner");
    const lt = sim.etype[ls];
    if (R.liftVehicles[lt] + R.liftHeavy[lt] === 0)
        return rej("cannotLift");
    if (ts === undefined || !sim.alive[ts] || sim.hp[ts] <= 0)
        return rej("unknownTarget");
    const tt = sim.etype[ts];
    if (sim.team[ts] !== sim.team[ls])
        return rej("notFriendly");
    if (ts === ls || tt >= d.unitCount || !d.tVehicle[tt] || d.tAir[tt] || d.tStructure[tt])
        return rej("cannotLift");
    const T = sim.tpState();
    if (T.lifts.some((l) => l.target === targetId))
        return rej("cannotLift");
    if (T.lifts.some((l) => l.lifter === targetId))
        return rej("cannotLift");
    const mine = T.lifts.filter((l) => l.lifter === lifterId).map((l) => sim.idToSlot.get(l.target)).filter((s) => s !== undefined);
    const nHeavy = mine.filter((s) => R.heavy[sim.etype[s]]).length, nLight = mine.length - nHeavy;
    if (R.heavy[tt] ? (nLight > 0 || nHeavy + 1 > R.liftHeavy[lt]) : (nHeavy > 0 || nLight + 1 > R.liftVehicles[lt]))
        return rej("transportFull");
    T.lifts.push({ lifter: lifterId, target: targetId, slung: 0 });
    T.lifts.sort((a, b) => a.lifter - b.lifter || a.target - b.target);
    if (!sim.driverIsPlayer(ls))
        sim.order([lifterId], { type: "move", x: sim.x[ts], z: sim.z[ts] });
    return { ok: true };
}
/** An AI-flown aircraft that should land now (a squad is boarding it, or it is unloading at its spot). Called from moveUnit. */
function tpWantsLand(sim, s) {
    const T = sim.tp;
    if (!T)
        return false;
    const id = sim.eid[s];
    if (T.loads.some((l) => l.vehicle === id))
        return true;
    const u = T.unloads.find((q) => q.vehicle === id);
    if (u && T.cargo.some((c) => c.vehicle === id)) {
        const dx = sim.x[s] - u.x, dz = sim.z[s] - u.z;
        return dx * dx + dz * dz <= sim.tpRules.unloadRadius ** 2;
    }
    return false;
}
/** Puts soldier slot s aboard vehicle slot vs in seat j (out of the world). */
function stow(sim, s, vs, j) {
    const id = sim.eid[s];
    sim.tpState().addCargo({ vehicle: sim.eid[vs], seat: j, id, type: sim.etype[s], team: sim.team[s], squad: sim.squad[s], hp: sim.hp[s], shield: sim.shield[s] });
    sim.ord.ext.delete(id);
    sim.ord.hold.delete(id);
    sim.despawn(s);
    sim.events.push(events_ts_1.EV.CARGO, sim.tick, sim.team[vs], sim.eid[vs], id, j, sim.squad[s], 0, 0, exports.CG_BOARDED);
}
/** Brings cargo record c back into the world at (x, z) with its own id and squad. Returns the slot, or -1 (no entity room). */
function unstow(sim, c, x, z) {
    if (sim.slotsLeft() < 1)
        return -1;
    if (!sim.squads.has(c.squad)) {
        sim.squads.set(c.squad, { id: c.squad, team: c.team, members: [], structure: false });
        const all = Array.from(sim.squads.entries()).sort((a, b) => a[0] - b[0]);
        sim.squads.clear();
        for (const [k, v] of all)
            sim.squads.set(k, v);
    }
    const nid = sim.spawnUnit(sim.d.typeIds[c.type], c.team, x, z, { squadId: c.squad });
    const s = sim.idToSlot.get(nid);
    sim.idToSlot.delete(nid);
    sim.eid[s] = c.id;
    sim.idToSlot.set(c.id, s);
    if (sim.nextId === nid + 1)
        sim.nextId = nid; // the borrowed id is returned: ids stay as if nobody had boarded
    const sq = sim.squads.get(c.squad);
    sq.members = sq.members.filter((m) => m !== nid);
    sq.members.push(c.id);
    sq.members.sort((a, b) => a - b);
    sim.hp[s] = c.hp;
    sim.shield[s] = c.shield;
    return s;
}
/** Spot k of n around vehicle slot vs (beside the hull, on the ground). */
function besideHull(sim, vs, k, n) {
    const a = (k * 2 * Math.PI) / Math.max(1, n) + Math.PI, r = sim.d.tRadius[sim.etype[vs]] + 2;
    const fx = sim.dirX[vs], fz = sim.dirZ[vs], c = Math.cos(a), sn = Math.sin(a);
    return [sim.x[vs] + (fx * c - fz * sn) * r, sim.z[vs] + (fz * c + fx * sn) * r];
}
/** Per tick (after production): boarding, unloading, picking up sling loads. */
function tpStep(sim) {
    const T = sim.tp;
    if (!T || !T.used())
        return;
    const d = sim.d, R = sim.tpRules, reach = d.crew.enterRange;
    // boarding
    for (const l of T.loads.slice()) {
        const sq = sim.squads.get(l.squad), vs = sim.idToSlot.get(l.vehicle);
        if (!sq || vs === undefined || !sim.alive[vs] || sim.hp[vs] <= 0) {
            T.loads = T.loads.filter((x) => x !== l);
            continue;
        }
        const landed = !d.tAir[sim.etype[vs]] || sim.airS[vs] === 0;
        for (const id of sq.members.slice()) {
            const s = sim.idToSlot.get(id);
            if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
                continue;
            if (landed && sim.gap(s, vs) <= reach) {
                const free = freePassengerSeats(sim, vs);
                if (free.length === 0) {
                    sim.order([id], { type: "stop" });
                    continue;
                }
                stow(sim, s, vs, free[0]);
            }
            else if (sim.tick % 10 === 0) { // follow a moving transport
                const dx = sim.x[vs] - sim.x[s], dz = sim.z[vs] - sim.z[s];
                if (sim.ordType[s] === 0 || dx * dx + dz * dz > 25)
                    sim.order([id], { type: "move", x: sim.x[vs], z: sim.z[vs] });
            }
        }
        if (!sim.squads.has(l.squad) || freePassengerSeats(sim, vs).length === 0)
            T.loads = T.loads.filter((x) => x !== l);
    }
    // unloading
    for (const u of T.unloads.slice()) {
        const vs = sim.idToSlot.get(u.vehicle);
        if (vs === undefined || !sim.alive[vs]) {
            T.unloads = T.unloads.filter((x) => x !== u);
            continue;
        }
        const dx = sim.x[vs] - u.x, dz = sim.z[vs] - u.z;
        if (dx * dx + dz * dz > R.unloadRadius * R.unloadRadius || sim.tick < u.next)
            continue;
        // sling loads drop at once (the lifter need not land)
        for (const l of T.lifts.filter((q) => q.lifter === u.vehicle && q.slung))
            dropSling(sim, l);
        const aboard = T.cargo.filter((c) => c.vehicle === u.vehicle);
        if (aboard.length && (!d.tAir[sim.etype[vs]] || sim.airS[vs] === 0)) {
            const c = aboard[0], [x, z] = besideHull(sim, vs, c.seat, d.tSeatCount[sim.etype[vs]]);
            const s = unstow(sim, c, x, z);
            if (s >= 0) {
                T.cargo = T.cargo.filter((q) => q !== c);
                sim.order([c.id], { type: "move", x: u.x + (x - sim.x[vs]), z: u.z + (z - sim.z[vs]) });
                sim.events.push(events_ts_1.EV.CARGO, sim.tick, sim.team[vs], u.vehicle, c.id, c.seat, c.squad, 0, 0, exports.CG_UNLOADED);
                u.next = sim.tick + R.unloadTicks;
            }
        }
        if (!T.cargo.some((c) => c.vehicle === u.vehicle) && !T.lifts.some((q) => q.lifter === u.vehicle && q.slung))
            T.unloads = T.unloads.filter((x) => x !== u);
    }
    // enemy-commander ferries: boarding finished (nobody of the squad left outside, or the load ended) -> unload at the target
    for (const f of T.ferries.slice()) {
        const vs = sim.idToSlot.get(f.vehicle);
        if (vs === undefined || !sim.alive[vs]) {
            T.ferries = T.ferries.filter((x) => x !== f);
            continue;
        }
        if (T.loads.some((l) => l.vehicle === f.vehicle && l.squad === f.squad))
            continue;
        T.ferries = T.ferries.filter((x) => x !== f);
        if (T.cargo.some((c) => c.vehicle === f.vehicle))
            tpUnload(sim, f.vehicle, f.x, f.z);
    }
    // lifts: fly to the target, pick it up within reach
    for (const l of T.lifts.slice()) {
        const ls = sim.idToSlot.get(l.lifter), ts = sim.idToSlot.get(l.target);
        if (ls === undefined || ts === undefined || !sim.alive[ls] || !sim.alive[ts] || sim.hp[ts] <= 0) {
            T.lifts = T.lifts.filter((x) => x !== l);
            continue;
        }
        if (l.slung)
            continue;
        const dx = sim.x[ts] - sim.x[ls], dz = sim.z[ts] - sim.z[ls];
        if (Math.sqrt(dx * dx + dz * dz) - d.tRadius[sim.etype[ls]] - d.tRadius[sim.etype[ts]] <= R.liftReach) {
            l.slung = 1;
            sim.order([l.target], { type: "stop" });
            sim.events.push(events_ts_1.EV.CARGO, sim.tick, sim.team[ls], l.lifter, l.target, -1, 0, 0, 0, exports.CG_LIFTED);
        }
        else if (sim.tick % 10 === 0 && !sim.driverIsPlayer(ls) && sim.ordType[ls] === 0)
            sim.order([l.lifter], { type: "move", x: sim.x[ts], z: sim.z[ts] });
    }
}
function dropSling(sim, l) {
    const T = sim.tp;
    T.lifts = T.lifts.filter((x) => x !== l);
    const ts = sim.idToSlot.get(l.target), ls = sim.idToSlot.get(l.lifter);
    if (ts !== undefined && sim.alive[ts]) {
        sim.velX[ts] = 0;
        sim.velZ[ts] = 0;
        sim.events.push(events_ts_1.EV.CARGO, sim.tick, sim.team[ts], l.lifter, l.target, -1, 0, 0, 0, exports.CG_DROPPED);
    }
    void ls;
}
/** After movement: slung vehicles follow their lifter (pinned below it), and hold fire. */
function tpPin(sim) {
    const T = sim.tp;
    if (!T || T.lifts.length === 0)
        return;
    const R = sim.tpRules, dt = sim.d.dt;
    let k = 0;
    for (const l of T.lifts) {
        if (!l.slung)
            continue;
        const ls = sim.idToSlot.get(l.lifter), ts = sim.idToSlot.get(l.target);
        if (ls === undefined || ts === undefined)
            continue;
        const off = (k++ % 2 === 0 ? 1 : -1) * (T.lifts.filter((q) => q.lifter === l.lifter && q.slung).length > 1 ? sim.d.tRadius[sim.etype[ts]] : 0);
        sim.x[ts] = sim.x[ls] - sim.dirZ[ls] * off;
        sim.z[ts] = sim.z[ls] + sim.dirX[ls] * off;
        sim.y[ts] = Math.max(sim.y[ts], sim.y[ls] - R.hang - sim.d.tRadius[sim.etype[ts]]); // moveUnit put it on the ground: never below it
        sim.velX[ts] = sim.velX[ls];
        sim.velZ[ts] = sim.velZ[ls];
        sim.dirX[ts] = sim.dirX[ls];
        sim.dirZ[ts] = sim.dirZ[ls];
        sim.waypoints[ts] = null;
        sim.ordType[ts] = 0;
        for (let m = 0; m < sim.mCount[ts]; m++) {
            const i = ts * data_ts_1.MAX_MOUNTS + m;
            if (sim.cooldown[i] < dt * 2)
                sim.cooldown[i] = dt * 2;
        }
    }
}
/** QA5-2: is one of slots a, b the lifter and the other its slung vehicle (they share a spot: no separation between them)? */
function tpSlingPair(sim, a, b) {
    const T = sim.tp;
    if (!T || T.lifts.length === 0)
        return false;
    const ia = sim.eid[a], ib = sim.eid[b];
    for (const l of T.lifts)
        if (l.slung === 1 && ((l.lifter === ia && l.target === ib) || (l.lifter === ib && l.target === ia)))
            return true;
    return false;
}
/** Is slot s a slung vehicle (pinned: it does not drive)? */
function tpSlung(sim, s) {
    const T = sim.tp;
    if (!T || T.lifts.length === 0)
        return false;
    const id = sim.eid[s];
    return T.lifts.some((l) => l.target === id && l.slung === 1);
}
/** A transport's hull reached zero (criticalStep, before the crew's roll and eject): soldiers aboard roll; survivors land around the wreck. */
function tpVehicleDown(sim, vs) {
    const T = sim.tp;
    if (!T || !T.used())
        return;
    const vid = sim.eid[vs], chance = sim.d.crew.passengerSurvive, n = sim.d.tSeatCount[sim.etype[vs]];
    for (const c of T.cargo.filter((q) => q.vehicle === vid)) {
        T.cargo = T.cargo.filter((q) => q !== c);
        const lives = chance >= 1 || sim.rng.next() < chance;
        if (lives) {
            const [x, z] = besideHull(sim, vs, c.seat, n);
            if (unstow(sim, c, x, z) >= 0) {
                sim.events.push(events_ts_1.EV.CARGO, sim.tick, c.team, vid, c.id, c.seat, c.squad, 0, 0, exports.CG_UNLOADED);
                continue;
            }
        }
        lostAboard(sim, c, vid);
    }
    for (const l of T.lifts.filter((q) => q.lifter === vid)) {
        if (l.slung)
            dropSling(sim, l);
        else
            T.lifts = T.lifts.filter((x) => x !== l);
    }
}
function lostAboard(sim, c, vid) {
    sim.events.push(events_ts_1.EV.CARGO_LOST, sim.tick, c.team, vid, c.id, c.seat, c.type, 0, 0, 0);
    const sq = sim.squads.get(c.squad);
    if (sq && sq.members.length === 0)
        sim.squads.delete(c.squad);
}
/**
 * QA3-6: vehicle slot vs now belongs to `team` (a hijack: Sim.changeTeam). Soldiers of other teams aboard get out:
 * each steps out beside the hull (event CARGO flags CG_UNLOADED, in seat order; with no entity room left the soldier
 * is lost aboard, CARGO_LOST, as in a wreck). The old team's boarding, unload and ferry jobs for the vehicle end, and a
 * sling-loaded vehicle of another team is dropped where it is.
 */
function tpTeamChanged(sim, vs, team) {
    const T = sim.tp;
    if (!T || !T.used())
        return;
    const vid = sim.eid[vs], n = sim.d.tSeatCount[sim.etype[vs]];
    for (const c of T.cargo.filter((q) => q.vehicle === vid && q.team !== team)) {
        T.cargo = T.cargo.filter((q) => q !== c);
        const [x, z] = besideHull(sim, vs, c.seat, n);
        if (unstow(sim, c, x, z) >= 0) {
            sim.events.push(events_ts_1.EV.CARGO, sim.tick, c.team, vid, c.id, c.seat, c.squad, 0, 0, exports.CG_UNLOADED);
            continue;
        }
        lostAboard(sim, c, vid);
    }
    T.loads = T.loads.filter((l) => l.vehicle !== vid || sim.squads.get(l.squad)?.team === team);
    T.unloads = T.unloads.filter((u) => u.vehicle !== vid);
    T.ferries = T.ferries.filter((f) => f.vehicle !== vid);
    for (const l of T.lifts.filter((q) => q.lifter === vid)) {
        const ts = sim.idToSlot.get(l.target);
        if (ts !== undefined && sim.team[ts] === team)
            continue;
        if (l.slung)
            dropSling(sim, l);
        else
            T.lifts = T.lifts.filter((x) => x !== l);
    }
}
/** removeDead: vehicle id `vid` is gone. Soldiers still aboard die; lifts end (a slung load is dropped); a gone slung vehicle ends its lift. */
function tpGone(sim, vid) {
    const T = sim.tp;
    if (!T || !T.used())
        return;
    for (const c of T.cargo.filter((q) => q.vehicle === vid)) {
        T.cargo = T.cargo.filter((q) => q !== c);
        lostAboard(sim, c, vid);
    }
    T.loads = T.loads.filter((l) => l.vehicle !== vid);
    T.unloads = T.unloads.filter((u) => u.vehicle !== vid);
    for (const l of T.lifts.filter((q) => q.lifter === vid || q.target === vid)) {
        if (l.slung && l.lifter === vid)
            dropSling(sim, l);
        else
            T.lifts = T.lifts.filter((x) => x !== l);
    }
}
/**
 * Enemy commander (enemy-ai.ts, capture runs): group `grp` (slots) is about to be sent to (x, z). If the target is at
 * least transport.ferry.minDistanceMetres from the group, the team's ferry cooldown has run out, an idle AI-driven
 * Carrier of the team (empty, no order or an arrived attack-move, no transport job) exists and a roll of the sim PRNG passes transport.ferry.chance,
 * one whole infantry squad of the group is ordered to board it and the Carrier unloads it at (x, z) (event FERRY).
 * Returns the slots taken out of the group (the squad and the Carrier); [] = no ferry.
 */
function tpTryFerry(sim, team, grp, x, z, busy, by) {
    const R = sim.tpRules;
    // fix-t1-ai ruling 85: the commander's difficulty may set its own chance, cooldown and minimum distance
    const ch = by?.chance ?? R?.ferryChance ?? 0, cd = by?.cooldownTicks ?? R?.ferryCooldownTicks ?? 0, md = by?.minDistance ?? R?.ferryMin ?? 0;
    if (!R || ch <= 0)
        return [];
    const T = sim.tp;
    if (T && sim.tick - T.lastFerry[team] < cd)
        return [];
    let cx = 0, cz = 0;
    for (const s of grp) {
        cx += sim.x[s];
        cz += sim.z[s];
    }
    cx /= grp.length;
    cz /= grp.length;
    if ((x - cx) ** 2 + (z - cz) ** 2 < md * md)
        return [];
    // one whole infantry squad in the group
    let squad = -1;
    for (const s of grp) {
        if (!isSoldier(sim, s))
            continue;
        const sq = sim.squads.get(sim.squad[s]);
        if (sq && sq.members.every((id) => { const m = sim.idToSlot.get(id); return m !== undefined && grp.includes(m); })) {
            squad = sq.id;
            break;
        }
    }
    if (squad < 0)
        return [];
    // the nearest idle Carrier of the team
    let car = -1, best = Infinity;
    for (let s = 0; s < sim.hi; s++) {
        if (!sim.alive[s] || sim.team[s] !== team || sim.hp[s] <= 0 || !R.carrier[sim.etype[s]] || sim.d.tAir[sim.etype[s]] || busy.has(s))
            continue;
        if (!sim.drv[s] || sim.critTick[s] >= 0 || sim.driverIsPlayer(s))
            continue;
        const id = sim.eid[s];
        // QA5-7: idle as the commander counts it (enemy-ai idle(), QA1 bug 6): no order, or an attack-move whose last
        // waypoint it reached (the sim keeps the order type), and no s5 order; with `=== 0` alone no Carrier that had ever
        // moved with a group qualified, so the commander never ferried
        if (!(sim.ordType[s] === 0 || (sim.ordType[s] === 2 && !sim.waypoints[s])) || sim.ord.ext.has(id))
            continue;
        if (T && (T.cargo.some((c) => c.vehicle === id) || T.loads.some((l) => l.vehicle === id) || T.unloads.some((u) => u.vehicle === id) || T.ferries.some((f) => f.vehicle === id)))
            continue;
        const dd = (sim.x[s] - cx) ** 2 + (sim.z[s] - cz) ** 2;
        if (dd < best) {
            best = dd;
            car = s;
        }
    }
    if (car < 0)
        return [];
    if (sim.rng.next() >= ch)
        return [];
    const r = tpLoad(sim, squad, sim.eid[car]);
    if (!r.ok)
        return [];
    const t2 = sim.tpState();
    t2.lastFerry[team] = sim.tick;
    t2.ferries.push({ vehicle: sim.eid[car], squad, x, z });
    sim.events.push(events_ts_1.EV.FERRY, sim.tick, team, sim.eid[car], squad, 0, 0, x, z, 0);
    const out = [car];
    for (const id of sim.squads.get(squad).members)
        out.push(sim.idToSlot.get(id));
    return out;
}
/** Squad ids with at least one soldier aboard, and soldiers aboard per vehicle (queries for the client / AI). */
function tpCargoOf(sim, vehicleId) {
    if (!sim.tp)
        return [];
    return sim.tp.aboard(vehicleId).map((c) => ({ id: c.id, seat: c.seat, typeId: sim.d.typeIds[c.type], squad: c.squad, hp: c.hp }));
}
