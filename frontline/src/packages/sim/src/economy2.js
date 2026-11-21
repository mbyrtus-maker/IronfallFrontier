"use strict";
// Economy depth (stage 3 wave 2 task B; design doc 6, 7, 9, 10, 17, 18). One module, small hooks in sim.ts,
// construction.ts, mining.ts, enemy-ai.ts, state.ts and netsnap.ts. Present (sim.eco2) on every map with strategic points.
//
// 1. Fortification (doc 6 "Reinforcing held points"). queueFortify(tick, team, point, constructor?) (ACT_FORTIFY 25)
//    starts an upgrade of a held, supplied point to its next level (points.json fortification.levels[]: cost, captureSeconds,
//    extraDefenceOnlySlots, selfRepairPerSecond). The cost is paid at the start. The named (or nearest) Constructor drives to
//    the point; the upgrade progresses while it is inside the capture ring and the point stays owned and supplied, over
//    upgradeSecondsPerLevel interpolated by level (level 1 the first value, the top level the last). Done: the level rises
//    (capture time and defence-only slots follow from points.ts / construction.ts). Point lost: the job ends, no refund.
//    Level 3 "slow self-repair": the owner's structures on a supplied level-3 point regain selfRepairPerSecond hull.
//    The enemy commander fortifies a point it has held for hegemonyFortifyAfterSeconds (enemy-ai.ts).
//    A level lost while cut off (points.ts) logs FE_LOST.
// 2. Forward bases (doc 18). queueDeployBase(tick, fbvId) (ACT_DEPLOY_BASE 26): a Forward Base Vehicle standing on a held,
//    supplied non-citadel point without a forward base deploys over forwardBase.deploySeconds (it must stay within
//    DEPLOY_DRIFT m); then it is replaced by the Field Depot (forwardBase.coreBuilding). Limit per team:
//    forwardBase.limits[map size class]. queuePackBase(tick, depotId) (ACT_PACK_BASE 27): packUpSeconds later the depot
//    becomes the vehicle again. A forward-base point has forwardBase.slots slots (the depot uses none) and only the
//    forward list may be built there (Repair Bay, Relay Tower, defence buildings, Gas Tank; construction.ts hook);
//    fortification at most forwardBase.maxFortificationLevel. The depot is a respawn point and refills pilot energy and
//    kit (data effects); it keeps working (respawn) for unsuppliedRunSeconds after losing supply, then shuts down.
//    FB1 (ruling 132) own defences: forwardBase.defences.unfoldSeconds before the deploy ends the base unfolds its own
//    point structures around the vehicle (never built, no build slot): `turretCount` turrets on opposite corners
//    (front-left and rear-right) at turretRadiusMetres, and an arc of `wallSegments` barricade segments at
//    wallRadiusMetres facing the likeliest approach (the nearest enemy-held point, else the nearest enemy Command Core,
//    else the map centre). They hold their fire while unfolding (weapon cooldown = unfoldSeconds) and belong to the base
//    (keyed by the vehicle, then the depot): event FORWARD_BASE phase FB_DEFENCES (d count, v1 unfold s). Destroyed ones
//    are not rebuilt. Pack-up: unfoldSeconds before it ends they fold (FB_FOLDING; hold fire), and at its end every
//    standing one is packed away whatever its damage (a fresh set unfolds at the next deploy). A cancelled deploy folds
//    them away (removed); the base destroyed (or the vehicle while deploying): they are destroyed with it.
// 3. Power (doc 7): per point, the sum of buildings.json power of the point owner's finished structures in its area. Below
//    zero the point is underpowered: production there runs at economy.underpoweredProductionSpeed and its armed structures
//    fire at economy.underpoweredTurretFireRate (sim.ts hooks). Derived every tick (not state).
// 4. Repair Bay (doc 9): a finished, supplied Repair Bay repairs friendly vehicles and structures within repairRadius at
//    repairPerSecond each (not pilots, not itself). The Director's retreating units go to the nearest own Repair Bay.
// 5. Salvage: removed (designer playtest 15 Nov, ruling 106). Destroyed vehicles leave no wreck in the sim; the client
//    draws a short destruction effect only.
// 6. Enemy income (doc 17): an AI team's mining and gas income x coop.scaling[players].enemyIncome x the difficulty's
//    incomeMultiplier (mining.ts hook).
//
// State (hashed and exported): fortify jobs, per point held-since tick and last seen owner / level, deploy / pack jobs,
// depot cut-off timers. Everything else is derived.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Economy2 = exports.FORWARD_BASE_EVENT_NAMES = exports.FB_FOLDING = exports.FB_DEFENCES = exports.FB_RESTORED = exports.FB_SHUTDOWN = exports.FB_PACKED = exports.FB_PACKING = exports.FB_CANCELLED = exports.FB_DEPLOYED = exports.FB_DEPLOYING = exports.FORTIFY_EVENT_NAMES = exports.FJ_CUT_OFF = exports.FJ_ON_THE_WAY = exports.FJ_BUILDING = exports.FE_LOST = exports.FE_ENDED = exports.FE_DONE = exports.FE_STARTED = exports.EV_FORWARD_BASE = exports.EV_FORTIFY = exports.ACT_PACK_BASE = exports.ACT_DEPLOY_BASE = exports.ACT_FORTIFY = void 0;
const data_ts_1 = require("./data.js");
const fmath_ts_1 = require("./fmath.js");
exports.ACT_FORTIFY = 25, exports.ACT_DEPLOY_BASE = 26, exports.ACT_PACK_BASE = 27;
/** Event kinds (events.ts reserves 50-59 for this module). */
exports.EV_FORTIFY = 50, exports.EV_FORWARD_BASE = 51; // 52 (WRECK) retired by ruling 106
/** FORTIFY phases (event b): a point, c team, d level (target / new / lost-to), v1 seconds of the upgrade. */
exports.FE_STARTED = 0, exports.FE_DONE = 1, exports.FE_ENDED = 2, exports.FE_LOST = 3;
/** Ruling 133: fortify job stages on the wire (Economy2.jobStage). */
exports.FJ_BUILDING = 0, exports.FJ_ON_THE_WAY = 1, exports.FJ_CUT_OFF = 2;
exports.FORTIFY_EVENT_NAMES = ["started", "done", "ended", "lost"];
/** FORWARD_BASE phases (event b): a entity (vehicle or depot), c point, d other entity (the new one), v1 seconds. */
exports.FB_DEPLOYING = 0, exports.FB_DEPLOYED = 1, exports.FB_CANCELLED = 2, exports.FB_PACKING = 3, exports.FB_PACKED = 4, exports.FB_SHUTDOWN = 5, exports.FB_RESTORED = 6, exports.FB_DEFENCES = 7, exports.FB_FOLDING = 8;
exports.FORWARD_BASE_EVENT_NAMES = ["deploying", "deployed", "cancelled", "packing", "packed", "shutDown", "restored", "defences", "folding"];
/** A forward base vehicle must stay within this distance (m) of where it started deploying. */
const DEPLOY_DRIFT = 5;
const PT_SUPPLIED = 1;
function num(v, path, dflt) {
    if (v === undefined && dflt !== undefined)
        return dflt;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
        throw new Error(`economy2: data field ${path} missing or not a number >= 0`);
    return v;
}
function compile(sim, data) {
    const dt = sim.d.dt, tr = Math.round(1 / dt);
    const P = data.points;
    const F = P.fortification ?? {};
    const levels = (F.levels ?? []).slice().sort((a, b) => a.level - b.level)
        .map((l) => ({ ore: num(l.cost?.ore, "fortification cost.ore", 0), gas: num(l.cost?.gas, "fortification cost.gas", 0), selfRepair: num(l.selfRepairPerSecond, "selfRepairPerSecond", 0) }));
    const maxLevel = new Map();
    for (const pt of (P.pointTypes ?? []))
        maxLevel.set(pt.id, Math.min(levels.length - 1, pt.maxFortificationLevel ?? levels.length - 1));
    const secs = Array.isArray(F.upgradeSecondsPerLevel) ? F.upgradeSecondsPerLevel : [30, 60];
    const ids = sim.d.typeIds, ti = (id) => (typeof id === "string" ? ids.indexOf(id) : -1);
    const FB = P.forwardBase ?? {};
    const nt = ids.length, units = data.units, blds = data.buildings;
    const fbAllowed = new Uint8Array(nt), tPower = new Float64Array(nt);
    const forwardList = new Set(["repair-bay", "relay-tower", "gas-tank", "air-pad"]); // doc 18 "landing pad" read as the Air Pad
    const C = data.constants, E = C.economy ?? {};
    let repairType = -1, repairRadius = 0, repairPer = 0;
    blds.forEach((b, i) => {
        const t = units.length + i;
        tPower[t] = typeof b.power === "number" ? b.power : 0;
        if (forwardList.has(b.id) || b.defence === true)
            fbAllowed[t] = 1;
        if (b.effects?.repairRadius && repairType < 0) {
            repairType = t;
            repairRadius = b.effects.repairRadius;
            repairPer = b.effects.repairPerSecond ?? 0;
        }
    });
    const scaling = (C.coop?.scaling ?? {});
    const income = [1, 2, 3, 4].map((k) => scaling[k]?.enemyIncome ?? 1);
    const incomeDiff = new Map();
    for (const [k, v] of Object.entries((C.enemyAi?.difficulties ?? {})))
        incomeDiff.set(k, v.incomeMultiplier ?? 1);
    return {
        levels, maxLevel, secLo: secs[0] ?? 30, secHi: secs[secs.length - 1] ?? 60, hegemonyTicks: Math.round(num(F.hegemonyFortifyAfterSeconds, "hegemonyFortifyAfterSeconds", 300) * tr),
        fbvType: ti(FB.vehicle), depotType: ti(FB.coreBuilding), fbDeployTicks: Math.round(num(FB.deploySeconds, "forwardBase.deploySeconds", 20) * tr),
        fbPackTicks: Math.round(num(FB.packUpSeconds, "forwardBase.packUpSeconds", 60) * tr), fbSlots: num(FB.slots, "forwardBase.slots", 3),
        fbMaxLevel: num(FB.maxFortificationLevel, "forwardBase.maxFortificationLevel", 1), fbLimits: (FB.limits ?? {}),
        fbRunTicks: Math.round(num(FB.unsuppliedRunSeconds, "forwardBase.unsuppliedRunSeconds", 180) * tr), fbAllowed,
        tPower, lowProd: num(E.underpoweredProductionSpeed, "economy.underpoweredProductionSpeed", 0.5), lowFire: num(E.underpoweredTurretFireRate, "economy.underpoweredTurretFireRate", 0.5),
        repairType, repairRadius, repairPerTick: repairPer * dt,
        income, incomeDiff,
        ...defRules(FB.defences, ti, tr),
        coreType: blds.findIndex((b) => b.effects?.supplySource === true) < 0 ? -1 : units.length + blds.findIndex((b) => b.effects?.supplySource === true),
    };
}
function defRules(D, ti, tr) {
    if (!D)
        return { defTurret: -1, defTurrets: 0, defTurretR: 0, defWall: -1, defWalls: 0, defWallR: 0, defUnfoldTicks: 0 };
    const t = ti(D.turret), w = ti(D.wall);
    if ((D.turret !== undefined && t < 0) || (D.wall !== undefined && w < 0))
        throw new Error("economy2: forwardBase.defences names an unknown building");
    return {
        defTurret: t, defTurrets: t < 0 ? 0 : Math.round(num(D.turretCount, "forwardBase.defences.turretCount", 2)), defTurretR: num(D.turretRadiusMetres, "forwardBase.defences.turretRadiusMetres", 16),
        defWall: w, defWalls: w < 0 ? 0 : Math.round(num(D.wallSegments, "forwardBase.defences.wallSegments", 4)), defWallR: num(D.wallRadiusMetres, "forwardBase.defences.wallRadiusMetres", 30),
        defUnfoldTicks: Math.max(1, Math.round(num(D.unfoldSeconds, "forwardBase.defences.unfoldSeconds", 4) * tr)),
    };
}
class Economy2 {
    R;
    // ---- state
    jobs = new Map(); // by point
    heldSince;
    lastOwner;
    lastFort;
    baseJobs = new Map(); // by entity id (vehicle deploying / depot packing)
    depotCut = new Map(); // depot entity id -> ticks unsupplied
    /** FB1: a forward base's own defences: owner entity id (the deploying vehicle, then the depot) -> structure ids. */
    defs = new Map();
    // ---- derived (not state)
    power;
    lowSlot;
    fwdDepot;
    ring;
    constructor(sim, data) {
        this.R = compile(sim, data);
        const n = sim.pts.n;
        this.heldSince = new Int32Array(n);
        this.lastOwner = Int8Array.from(sim.pts.owner);
        this.lastFort = Uint8Array.from(sim.pts.fort);
        this.power = new Float64Array(n);
        this.fwdDepot = new Int32Array(n).fill(-1);
        this.lowSlot = new Uint8Array(sim.cap);
        this.ring = sim.pts.rules.ring;
    }
    // ------------------------------------------------------------ fortification
    /** Highest level a point may reach (point type; a forward base point: forwardBase.maxFortificationLevel). */
    maxLevel(sim, p) {
        const m = this.R.maxLevel.get(sim.pts.types[p]) ?? 0;
        return this.fwdDepot[p] >= 0 ? Math.min(m, this.R.fbMaxLevel) : m;
    }
    /** Upgrade ticks to reach level L (1..top). */
    upgradeTicks(sim, L) {
        const top = this.R.levels.length - 1, R = this.R;
        const f = top <= 1 ? 0 : (L - 1) / (top - 1);
        return Math.round((R.secLo + (R.secHi - R.secLo) * f) / sim.d.dt);
    }
    fortifyRefusal(sim, team, p) {
        const P = sim.pts;
        if (!Number.isInteger(p) || p < 0 || p >= P.n)
            return "unknownPoint";
        if (P.owner[p] !== team)
            return "pointNotOwned";
        if (!(P.flags[p] & PT_SUPPLIED))
            return "pointUnsupplied";
        if (this.jobs.has(p))
            return "fortifyInProgress";
        const L = P.fort[p] + 1;
        if (L > this.maxLevel(sim, p) || L >= this.R.levels.length)
            return "maxFortification";
        if (!sim.con || this.nearestBuilder(sim, team, P.px[p], P.pz[p]) === 0)
            return "noConstructor";
        const c = this.R.levels[L];
        if (sim.ore[team] + 1e-9 < c.ore || sim.gas[team] + 1e-9 < c.gas)
            return "cannotAfford";
        return null;
    }
    fortify(sim, team, p, builder) {
        const why = this.fortifyRefusal(sim, team, p);
        if (why)
            return { ok: false, reason: why };
        const P = sim.pts;
        if (builder > 0) {
            const s = sim.idToSlot.get(builder);
            if (s === undefined || sim.etype[s] !== sim.con.builderType || sim.team[s] !== team || sim.hp[s] <= 0)
                return { ok: false, reason: "notConstructor" };
        }
        else
            builder = this.nearestBuilder(sim, team, P.px[p], P.pz[p]);
        const L = P.fort[p] + 1, c = this.R.levels[L], ticks = this.upgradeTicks(sim, L);
        sim.ore[team] -= c.ore;
        sim.gas[team] -= c.gas;
        this.jobs.set(p, { point: p, team, level: L, builder, progress: 0, ticks, ore: c.ore, gas: c.gas });
        sim.events.push(exports.EV_FORTIFY, sim.tick, team, p, exports.FE_STARTED, team, L, ticks * sim.d.dt, 0, 0);
        return { ok: true };
    }
    /**
     * Ruling 133: what a fortify job is doing now, for the screen (derived, not state): FJ_BUILDING (its Constructor is in
     * the capture ring of the supplied point: progress rises), FJ_ON_THE_WAY (the Constructor is driving there, or none is
     * left), FJ_CUT_OFF (in the ring but the point is not supplied: paused).
     */
    jobStage(sim, j) {
        const P = sim.pts, s = sim.idToSlot.get(j.builder);
        if (s === undefined || sim.hp[s] <= 0)
            return exports.FJ_ON_THE_WAY;
        const dx = sim.x[s] - P.px[j.point], dz = sim.z[s] - P.pz[j.point];
        if (dx * dx + dz * dz > this.ring * this.ring)
            return exports.FJ_ON_THE_WAY;
        return P.flags[j.point] & PT_SUPPLIED ? exports.FJ_BUILDING : exports.FJ_CUT_OFF;
    }
    nearestBuilder(sim, team, x, z) {
        const bt = sim.con ? sim.con.builderType : -1;
        let best = 0, bd = Infinity;
        if (bt < 0)
            return 0;
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || sim.etype[s] !== bt || sim.team[s] !== team)
                continue;
            const dx = sim.x[s] - x, dz = sim.z[s] - z, d2 = dx * dx + dz * dz;
            if (d2 < bd) {
                bd = d2;
                best = sim.eid[s];
            }
        }
        return best;
    }
    fortifyStep(sim) {
        const P = sim.pts;
        for (let p = 0; p < P.n; p++) {
            if (P.owner[p] !== this.lastOwner[p]) {
                this.lastOwner[p] = P.owner[p];
                this.heldSince[p] = sim.tick;
            }
            else if (P.fort[p] < this.lastFort[p] && !this.jobs.has(p))
                sim.events.push(exports.EV_FORTIFY, sim.tick, P.owner[p] < 0 ? 255 : P.owner[p], p, exports.FE_LOST, P.owner[p], P.fort[p], 0, 0, 0);
            this.lastFort[p] = P.fort[p];
        }
        if (this.jobs.size === 0)
            return;
        const r2 = this.ring * this.ring;
        for (const p of [...this.jobs.keys()].sort((a, b) => a - b)) {
            const j = this.jobs.get(p);
            if (P.owner[p] !== j.team) {
                this.jobs.delete(p);
                sim.events.push(exports.EV_FORTIFY, sim.tick, j.team, p, exports.FE_ENDED, j.team, j.level, 0, 0, 0);
                continue;
            }
            let s = sim.idToSlot.get(j.builder);
            if (s === undefined || sim.hp[s] <= 0) {
                j.builder = this.nearestBuilder(sim, j.team, P.px[p], P.pz[p]);
                s = sim.idToSlot.get(j.builder);
            }
            if (s === undefined)
                continue;
            const dx = sim.x[s] - P.px[p], dz = sim.z[s] - P.pz[p];
            const inRing = dx * dx + dz * dz <= r2;
            if (!inRing) {
                if (sim.mineCanSteer(s) && !this.busyBuilding(sim, j.builder))
                    sim.mineMove(s, P.px[p], P.pz[p]);
                continue;
            }
            if (!(P.flags[p] & PT_SUPPLIED))
                continue;
            if (++j.progress >= j.ticks) {
                P.fort[p] = j.level;
                this.lastFort[p] = j.level;
                P.cutTicks[p] = 0;
                this.jobs.delete(p);
                sim.events.push(exports.EV_FORTIFY, sim.tick, j.team, p, exports.FE_DONE, j.team, j.level, j.ticks * sim.d.dt, 0, 0);
            }
        }
    }
    busyBuilding(sim, id) {
        if (!sim.con)
            return false;
        for (const st of sim.con.sites.values())
            if (st.builder === id)
                return true;
        return false;
    }
    /** Ticks team has held point p without a break (sim.tick - held-since; -1 if it does not own it). */
    heldTicks(sim, p, team) { return sim.pts.owner[p] === team ? sim.tick - this.heldSince[p] : -1; }
    selfRepair(sim) {
        const P = sim.pts, d = sim.d;
        let any = false;
        for (let p = 0; p < P.n; p++)
            if (this.R.levels[P.fort[p]]?.selfRepair > 0) {
                any = true;
                break;
            }
        if (!any)
            return;
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || !d.tStructure[sim.etype[s]])
                continue;
            const max = d.tHp[sim.etype[s]];
            if (sim.hp[s] >= max || (sim.con && sim.con.underConstruction(sim.eid[s])))
                continue;
            const p = P.pointAt(sim.x[s], sim.z[s]);
            if (p < 0 || P.owner[p] !== sim.team[s] || !(P.flags[p] & PT_SUPPLIED))
                continue;
            const rate = this.R.levels[P.fort[p]]?.selfRepair ?? 0;
            if (rate > 0)
                sim.hp[s] = Math.min(max, sim.hp[s] + rate * d.dt);
        }
    }
    // ------------------------------------------------------------ forward bases (doc 18)
    /** Forward base limit per team for this map (forwardBase.limits[map size class]; no class: the medium value). */
    baseLimit(sim) { const L = this.R.fbLimits; return L[sim.mapSizeClass] ?? L.medium ?? 4; }
    /** Forward bases of team: live depots plus vehicles deploying. */
    baseCount(sim, team) {
        let n = 0;
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === this.R.depotType && sim.team[s] === team)
                n++;
        for (const j of this.baseJobs.values())
            if (j.team === team && !j.pack)
                n++;
        return n;
    }
    /** Is point p a forward-base point (a live Field Depot of its owner stands there)? */
    isForward(p) { return p >= 0 && p < this.fwdDepot.length && this.fwdDepot[p] >= 0; }
    deployBase(sim, id, team) {
        const s = sim.idToSlot.get(id), P = sim.pts;
        if (s === undefined || sim.hp[s] <= 0 || sim.etype[s] !== this.R.fbvType || this.R.depotType < 0)
            return { ok: false, reason: "notForwardBaseVehicle" };
        if (team !== undefined && sim.team[s] !== team)
            return { ok: false, reason: "notOwner" };
        if (this.baseJobs.has(id))
            return { ok: false, reason: "baseBusy" };
        const tm = sim.team[s], p = P.pointAt(sim.x[s], sim.z[s]);
        if (p < 0 || P.owner[p] !== tm || !(P.flags[p] & PT_SUPPLIED) || P.types[p] === "citadel-site" || this.isForward(p))
            return { ok: false, reason: "forwardBaseSite" };
        for (const j of this.baseJobs.values())
            if (!j.pack && P.pointAt(j.x, j.z) === p)
                return { ok: false, reason: "forwardBaseSite" };
        if (this.baseCount(sim, tm) >= this.baseLimit(sim))
            return { ok: false, reason: "forwardBaseLimit" };
        this.baseJobs.set(id, { id, team: tm, pack: 0, progress: 0, x: sim.x[s], z: sim.z[s] });
        sim.mineStop(s);
        sim.events.push(exports.EV_FORWARD_BASE, sim.tick, tm, id, exports.FB_DEPLOYING, p, 0, this.R.fbDeployTicks * sim.d.dt, sim.detMask(s), 0);
        return { ok: true };
    }
    packBase(sim, id, team) {
        const s = sim.idToSlot.get(id);
        if (s === undefined || sim.hp[s] <= 0 || sim.etype[s] !== this.R.depotType || this.R.fbvType < 0)
            return { ok: false, reason: "notForwardBase" };
        if (team !== undefined && sim.team[s] !== team)
            return { ok: false, reason: "notOwner" };
        if (this.baseJobs.has(id))
            return { ok: false, reason: "baseBusy" };
        this.baseJobs.set(id, { id, team: sim.team[s], pack: 1, progress: 0, x: sim.x[s], z: sim.z[s] });
        sim.events.push(exports.EV_FORWARD_BASE, sim.tick, sim.team[s], id, exports.FB_PACKING, sim.pts.pointAt(sim.x[s], sim.z[s]), 0, this.R.fbPackTicks * sim.d.dt, sim.detMask(s), 0);
        return { ok: true };
    }
    baseStep(sim) {
        const P = sim.pts, R = this.R;
        this.fwdDepot.fill(-1);
        if (R.depotType >= 0)
            for (let s = 0; s < sim.hi; s++) {
                if (!sim.alive[s] || sim.hp[s] <= 0 || sim.etype[s] !== R.depotType)
                    continue;
                const p = P.pointAt(sim.x[s], sim.z[s]);
                if (p >= 0 && P.owner[p] === sim.team[s] && this.fwdDepot[p] < 0)
                    this.fwdDepot[p] = s;
                // doc 18: a depot that loses supply keeps working for unsuppliedRunSeconds, then shuts down
                const id = sim.eid[s], sup = p >= 0 && P.owner[p] === sim.team[s] && (P.flags[p] & PT_SUPPLIED) !== 0;
                const c = this.depotCut.get(id) ?? 0;
                if (sup) {
                    if (c > 0) {
                        this.depotCut.delete(id);
                        if (c >= R.fbRunTicks)
                            sim.events.push(exports.EV_FORWARD_BASE, sim.tick, sim.team[s], id, exports.FB_RESTORED, p, 0, 0, sim.detMask(s), 0);
                    }
                }
                else {
                    this.depotCut.set(id, c + 1);
                    if (c + 1 === R.fbRunTicks)
                        sim.events.push(exports.EV_FORWARD_BASE, sim.tick, sim.team[s], id, exports.FB_SHUTDOWN, p, 0, 0, sim.detMask(s), 0);
                }
            }
        for (const id of [...this.depotCut.keys()])
            if (!sim.idToSlot.has(id))
                this.depotCut.delete(id);
        if (this.baseJobs.size === 0)
            return;
        for (const id of [...this.baseJobs.keys()].sort((a, b) => a - b)) {
            const j = this.baseJobs.get(id), s = sim.idToSlot.get(id);
            const p = P.pointAt(j.x, j.z);
            const gone = s === undefined || sim.hp[s] <= 0;
            const moved = !gone && ((sim.x[s] - j.x) ** 2 + (sim.z[s] - j.z) ** 2 > DEPLOY_DRIFT * DEPLOY_DRIFT);
            const lost = !j.pack && (p < 0 || P.owner[p] !== j.team);
            if (gone || moved || lost) {
                this.baseJobs.delete(id);
                sim.events.push(exports.EV_FORWARD_BASE, sim.tick, j.team, id, exports.FB_CANCELLED, p, 0, 0, gone ? 0 : sim.detMask(s), 0);
                if (!j.pack)
                    this.dropDefences(sim, id, gone); // FB1: a cancelled deploy folds them away; the vehicle destroyed: they go with it
                continue;
            }
            ++j.progress;
            // FB1: the base's own defences unfold over the last unfoldSeconds of the deploy and fold over the last of the pack-up
            const total = j.pack ? R.fbPackTicks : R.fbDeployTicks, at = Math.max(0, total - R.defUnfoldTicks);
            if (!j.pack && j.progress >= at && !this.defs.has(id) && (R.defTurrets > 0 || R.defWalls > 0))
                this.unfold(sim, s, j.team, p, (total - j.progress) * sim.d.dt);
            if (j.pack && this.defs.has(id)) {
                if (j.progress === at)
                    sim.events.push(exports.EV_FORWARD_BASE, sim.tick, j.team, id, exports.FB_FOLDING, p, this.defs.get(id).length, R.defUnfoldTicks * sim.d.dt, sim.detMask(s), 0);
                if (j.progress >= at)
                    this.holdFire(sim, id, 2 * sim.d.dt);
            }
            if (j.progress < total)
                continue;
            // QA5-8: packing makes a unit (the Forward Base Vehicle): it waits at the end, like a production item, while the
            // team is at its unit cap (S14: no Command Points)
            if (j.pack && sim.spawnRefusalOf(R.fbvType, j.team) !== null) {
                j.progress = R.fbPackTicks - 1;
                continue;
            }
            this.baseJobs.delete(id);
            const x = sim.x[s], z = sim.z[s], seen = sim.detMask(s);
            sim.quietRemove(s);
            // S14: a packed Forward Base Vehicle takes its driver from the pilot reserve (trySpawnUnit); the deploying one's went back
            let nid = 0;
            if (j.pack) {
                const r = sim.trySpawnUnit(sim.d.typeIds[R.fbvType], j.team, x, z);
                nid = r.ok ? r.ids[0] : 0;
            }
            else
                nid = sim.spawnUnit(sim.d.typeIds[R.depotType], j.team, x, z);
            sim.events.push(exports.EV_FORWARD_BASE, sim.tick, j.team, id, j.pack ? exports.FB_PACKED : exports.FB_DEPLOYED, p, nid, 0, seen, 0);
            const dl = this.defs.get(id);
            if (dl) {
                this.defs.delete(id);
                if (j.pack || !nid)
                    this.removeIds(sim, dl, !nid);
                else
                    this.defs.set(nid, dl);
            } // FB1: packed away / now the depot's
        }
    }
    // ------------------------------------------------------------ FB1: forward base defences (ruling 132)
    /** Owner entity id -> its standing defence ids (pruned of the dead). Called every step. */
    defStep(sim) {
        if (this.defs.size === 0)
            return;
        for (const id of [...this.defs.keys()].sort((a, b) => a - b)) {
            const l = this.defs.get(id);
            for (let k = l.length - 1; k >= 0; k--) {
                const s = sim.idToSlot.get(l[k]);
                if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
                    l.splice(k, 1);
            }
            const s = sim.idToSlot.get(id);
            if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
                this.dropDefences(sim, id, true); // the base destroyed: they go with it
            else if (l.length === 0 && !this.baseJobs.has(id))
                this.defs.delete(id);
        }
    }
    dropDefences(sim, owner, destroy) {
        const l = this.defs.get(owner);
        if (!l)
            return;
        this.defs.delete(owner);
        this.removeIds(sim, l, destroy);
    }
    removeIds(sim, ids, destroy) {
        for (const d of ids) {
            const s = sim.idToSlot.get(d);
            if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
                continue;
            if (destroy)
                sim.destroy(d);
            else
                sim.quietRemove(s);
        }
    }
    holdFire(sim, owner, secs) {
        for (const d of this.defs.get(owner) ?? []) {
            const s = sim.idToSlot.get(d);
            if (s === undefined)
                continue;
            for (let m = 0; m < sim.mCount[s]; m++) {
                const i = s * data_ts_1.MAX_MOUNTS + m;
                if (sim.cooldown[i] < secs)
                    sim.cooldown[i] = secs;
            }
        }
    }
    /** Unit vector from (x, z) toward the likeliest approach for team: the nearest enemy-held point, else the nearest enemy Command Core, else the map centre. */
    threatDir(sim, team, x, z) {
        const P = sim.pts;
        let bx = 0, bz = 0, bd = Infinity;
        for (let q = 0; q < P.n; q++) {
            if (P.owner[q] < 0 || P.owner[q] === team)
                continue;
            const d2 = (P.px[q] - x) ** 2 + (P.pz[q] - z) ** 2;
            if (d2 > 1 && d2 < bd) {
                bd = d2;
                bx = P.px[q];
                bz = P.pz[q];
            }
        }
        if (bd === Infinity && this.R.coreType >= 0)
            for (let s = 0; s < sim.hi; s++) {
                if (!sim.alive[s] || sim.hp[s] <= 0 || sim.etype[s] !== this.R.coreType || sim.team[s] === team)
                    continue;
                const d2 = (sim.x[s] - x) ** 2 + (sim.z[s] - z) ** 2;
                if (d2 > 1 && d2 < bd) {
                    bd = d2;
                    bx = sim.x[s];
                    bz = sim.z[s];
                }
            }
        if (bd === Infinity) {
            bx = sim.mapSize / 2;
            bz = sim.mapSize / 2;
        }
        const dx = bx - x, dz = bz - z, l = Math.sqrt(dx * dx + dz * dz);
        return l < 1e-6 ? [1, 0] : [dx / l, dz / l];
    }
    /** The spots of the defences for a base at (x, z) facing f: turrets first (front-left, rear-right, ...), then the wall arc. Each [type, x, z, face x, face z]. */
    defenceLayout(fx, fz, x, z) {
        const R = this.R, out = [];
        const rot = (a) => { const c = (0, fmath_ts_1.dcos)(a), s = (0, fmath_ts_1.dsin)(a); return [fx * c - fz * s, fx * s + fz * c]; };
        for (let k = 0; k < R.defTurrets; k++) {
            const [ux, uz] = rot(Math.PI / 4 + (k % 2) * Math.PI + Math.floor(k / 2) * (Math.PI / 2)); // opposite corners, then the other pair
            out.push([R.defTurret, x + ux * R.defTurretR, z + uz * R.defTurretR, fx, fz]);
        }
        if (R.defWalls > 0) {
            const half = R.defWall >= 0 ? 7 : 0, step = (2 * half + 0.5) / Math.max(1, R.defWallR); // segments side by side (structure footprints)
            for (let k = 0; k < R.defWalls; k++) {
                const [ux, uz] = rot((k - (R.defWalls - 1) / 2) * step);
                out.push([R.defWall, x + ux * R.defWallR, z + uz * R.defWallR, ux, uz]);
            }
        }
        return out;
    }
    unfold(sim, vs, team, p, secs) {
        const d = sim.d, x = sim.x[vs], z = sim.z[vs];
        const [fx, fz] = this.threatDir(sim, team, x, z);
        const ids = [];
        for (const [t, px, pz, ax, az] of this.defenceLayout(fx, fz, x, z)) {
            if (sim.slotsLeft() < 1)
                break;
            const r = d.tRadius[t];
            let cx = px, cz = pz, ok = false;
            for (let tries = 0; tries < 4 && !ok; tries++) {
                ok = cx >= r && cz >= r && cx <= sim.mapSize - r && cz <= sim.mapSize - r;
                for (let s = 0; s < sim.hi && ok; s++) {
                    if (!sim.alive[s] || sim.hp[s] <= 0 || !d.tStructure[sim.etype[s]] || ids.includes(sim.eid[s]))
                        continue;
                    const lim = r + d.tRadius[sim.etype[s]];
                    if ((sim.x[s] - cx) ** 2 + (sim.z[s] - cz) ** 2 < lim * lim)
                        ok = false;
                }
                if (!ok) {
                    cx += ax * 4;
                    cz += az * 4;
                } // a standing structure in the way: step it out along its facing
            }
            if (!ok)
                continue;
            const id = sim.spawnUnit(d.typeIds[t], team, cx, cz);
            if (!id)
                continue;
            const s = sim.idToSlot.get(id);
            sim.dirX[s] = ax;
            sim.dirZ[s] = az;
            for (let m = 0; m < sim.mCount[s]; m++)
                sim.cooldown[s * data_ts_1.MAX_MOUNTS + m] = Math.max(sim.cooldown[s * data_ts_1.MAX_MOUNTS + m], secs); // holds its fire while it unfolds
            sim.clearFootprint(s);
            ids.push(id);
        }
        this.defs.set(sim.eid[vs], ids);
        sim.events.push(exports.EV_FORWARD_BASE, sim.tick, team, sim.eid[vs], exports.FB_DEFENCES, p, ids.length, secs, sim.detMask(vs), 0);
    }
    /** FB1: the defences of the forward base (depot or deploying vehicle) entity id (standing ids). */
    defencesOf(id) { return (this.defs.get(id) ?? []).slice(); }
    /** Respawn hook: a Field Depot keeps serving as a respawn point for unsuppliedRunSeconds after losing supply. */
    depotRunning(sim, s) { return sim.etype[s] === this.R.depotType && (this.depotCut.get(sim.eid[s]) ?? 0) < this.R.fbRunTicks; }
    /** construction.ts hook: on a forward-base point only the forward list may be built, in forwardBase.slots slots. */
    buildAllowedAt(p, t) { return !this.isForward(p) || this.R.fbAllowed[t] === 1; }
    // ------------------------------------------------------------ power (doc 7)
    /** Recomputes per-point power and the underpowered structure flags (derived; also run after a restore). */
    powerStep(sim) {
        const P = sim.pts, d = sim.d, tp = this.R.tPower;
        this.power.fill(0);
        if (this.lowSlot.length < sim.cap)
            this.lowSlot = new Uint8Array(sim.cap);
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || !d.tStructure[sim.etype[s]] || tp[sim.etype[s]] === 0)
                continue;
            const p = P.pointAt(sim.x[s], sim.z[s]);
            if (p < 0 || P.owner[p] !== sim.team[s])
                continue;
            if (tp[sim.etype[s]] > 0 && sim.con && sim.con.underConstruction(sim.eid[s]))
                continue; // an unfinished Reactor gives nothing
            this.power[p] += tp[sim.etype[s]];
        }
        for (let s = 0; s < sim.hi; s++) {
            this.lowSlot[s] = 0;
            if (!sim.alive[s] || !d.tStructure[sim.etype[s]])
                continue;
            const p = P.pointAt(sim.x[s], sim.z[s]);
            if (p >= 0 && P.owner[p] === sim.team[s] && this.power[p] < 0)
                this.lowSlot[s] = 1;
        }
    }
    /** Production progress this tick at building slot s (underpowered: underpoweredProductionSpeed as a fraction of ticks). */
    prodAdvance(sim, s) {
        if (!this.lowSlot[s])
            return true;
        const f = this.R.lowProd;
        return Math.floor((sim.tick + 1) * f) > Math.floor(sim.tick * f);
    }
    /** Weapon period multiplier for slot s (underpowered armed structure: 1 / underpoweredTurretFireRate). */
    fireMul(s) { return this.lowSlot[s] && this.R.lowFire > 0 ? 1 / this.R.lowFire : 1; }
    // ------------------------------------------------------------ Repair Bay (doc 9)
    repairStep(sim) {
        const R = this.R, d = sim.d;
        if (R.repairType < 0 || R.repairPerTick <= 0)
            return;
        const r2 = R.repairRadius * R.repairRadius;
        for (let b = 0; b < sim.hi; b++) {
            if (!sim.alive[b] || sim.hp[b] <= 0 || sim.etype[b] !== R.repairType)
                continue;
            if (sim.con && sim.con.underConstruction(sim.eid[b]))
                continue;
            if (!sim.pts.structureSupplied(sim, b))
                continue; // doc 6: cut-off points cannot repair
            const team = sim.team[b];
            for (let s = 0; s < sim.hi; s++) {
                if (s === b || !sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== team)
                    continue;
                const t = sim.etype[s];
                if (!(d.tVehicle[t] || d.tStructure[t]))
                    continue;
                const max = d.tStructure[t] ? sim.maxHull(s) : d.tHp[t]; // QA3-11: a call-in sentry keeps its own (lower) hull
                if (sim.hp[s] >= max)
                    continue;
                if (d.tStructure[t] && sim.callSentry(s))
                    continue; // ruling 78: call-in sentries are not repairable
                if (d.tStructure[t] && sim.con && sim.con.underConstruction(sim.eid[s]))
                    continue;
                const dx = sim.x[s] - sim.x[b], dz = sim.z[s] - sim.z[b];
                if (dx * dx + dz * dz > r2)
                    continue;
                sim.hp[s] = Math.min(max, sim.hp[s] + R.repairPerTick);
            }
        }
    }
    /** Nearest finished Repair Bay of team to (x, z) on a supplied point (slot, -1 none): where the Director sends damaged units. */
    nearestRepair(sim, team, x, z) {
        let best = -1, bd = Infinity;
        if (this.R.repairType < 0)
            return -1;
        for (let b = 0; b < sim.hi; b++) {
            if (!sim.alive[b] || sim.hp[b] <= 0 || sim.etype[b] !== this.R.repairType || sim.team[b] !== team)
                continue;
            if ((sim.con && sim.con.underConstruction(sim.eid[b])) || !sim.pts.structureSupplied(sim, b))
                continue;
            const d2 = (sim.x[b] - x) ** 2 + (sim.z[b] - z) ** 2;
            if (d2 < bd) {
                bd = d2;
                best = b;
            }
        }
        return best;
    }
    // ------------------------------------------------------------ enemy income (doc 17)
    /** Income multiplier of team: AI teams coop.scaling[players].enemyIncome x difficulty incomeMultiplier; human teams 1. */
    incomeMul(sim, team) {
        const M = sim.match;
        if (!M || !M.isAi(team))
            return 1;
        return (this.R.income[M.players - 1] ?? 1) * (this.R.incomeDiff.get(M.difficulty[team]) ?? 1);
    }
    /** One tick (step phase 10, after construction and mining). */
    step(sim) {
        this.powerStep(sim);
        this.repairStep(sim);
        this.baseStep(sim);
        this.defStep(sim);
        this.fortifyStep(sim);
        this.selfRepair(sim);
    }
    // ------------------------------------------------------------ hash / export
    hash(word, numh) {
        word(0xec02);
        for (let p = 0; p < this.heldSince.length; p++) {
            word(this.heldSince[p]);
            word(this.lastOwner[p]);
            word(this.lastFort[p]);
        }
        const js = [...this.jobs.values()].sort((a, b) => a.point - b.point);
        word(js.length);
        for (const j of js) {
            word(j.point);
            word(j.team);
            word(j.level);
            word(j.builder);
            word(j.progress);
            word(j.ticks);
            numh(j.ore);
            numh(j.gas);
        }
        const bj = [...this.baseJobs.values()].sort((a, b) => a.id - b.id);
        word(bj.length);
        for (const j of bj) {
            word(j.id);
            word(j.team);
            word(j.pack);
            word(j.progress);
            numh(j.x);
            numh(j.z);
        }
        const dc = [...this.depotCut.entries()].sort((a, b) => a[0] - b[0]);
        word(dc.length);
        for (const [k, v] of dc) {
            word(k);
            word(v);
        }
        if (this.defs.size !== 0) { // FB1: only once a base has unfolded defences (sims without them hash as before)
            word(0xfb1d);
            for (const k of [...this.defs.keys()].sort((a, b) => a - b)) {
                const l = this.defs.get(k);
                word(k);
                word(l.length);
                for (const v of l)
                    word(v);
            }
        }
    }
    exportTo(w) {
        const n = this.heldSince.length;
        w.u32(n);
        for (let p = 0; p < n; p++) {
            w.i32(this.heldSince[p]);
            w.i32(this.lastOwner[p]);
            w.u8(this.lastFort[p]);
        }
        const js = [...this.jobs.values()].sort((a, b) => a.point - b.point);
        w.u32(js.length);
        for (const j of js) {
            w.i32(j.point);
            w.i32(j.team);
            w.i32(j.level);
            w.i32(j.builder);
            w.i32(j.progress);
            w.i32(j.ticks);
            w.f64(j.ore);
            w.f64(j.gas);
        }
        const bj = [...this.baseJobs.values()].sort((a, b) => a.id - b.id);
        w.u32(bj.length);
        for (const j of bj) {
            w.i32(j.id);
            w.i32(j.team);
            w.i32(j.pack);
            w.i32(j.progress);
            w.f64(j.x);
            w.f64(j.z);
        }
        const dc = [...this.depotCut.entries()].sort((a, b) => a[0] - b[0]);
        w.u32(dc.length);
        for (const [k, v] of dc) {
            w.i32(k);
            w.i32(v);
        }
        const dk = [...this.defs.keys()].sort((a, b) => a - b); // FB1 (state v42)
        w.u32(dk.length);
        for (const k of dk) {
            const l = this.defs.get(k);
            w.i32(k);
            w.u32(l.length);
            for (const v of l)
                w.i32(v);
        }
    }
    restoreFrom(r) {
        const n = r.u32();
        if (n !== this.heldSince.length)
            throw new Error("bad state: economy2 point count");
        for (let p = 0; p < n; p++) {
            this.heldSince[p] = r.i32();
            this.lastOwner[p] = r.i32();
            this.lastFort[p] = r.u8();
        }
        this.jobs.clear();
        for (let i = 0, m = r.u32(); i < m; i++) {
            const j = { point: r.i32(), team: r.i32(), level: r.i32(), builder: r.i32(), progress: r.i32(), ticks: r.i32(), ore: r.f64(), gas: r.f64() };
            this.jobs.set(j.point, j);
        }
        this.baseJobs.clear();
        for (let i = 0, m = r.u32(); i < m; i++) {
            const j = { id: r.i32(), team: r.i32(), pack: r.i32(), progress: r.i32(), x: r.f64(), z: r.f64() };
            this.baseJobs.set(j.id, j);
        }
        this.depotCut.clear();
        for (let i = 0, m = r.u32(); i < m; i++) {
            const k = r.i32();
            this.depotCut.set(k, r.i32());
        }
        this.defs.clear();
        for (let i = 0, m = r.u32(); i < m; i++) {
            const k = r.i32(), l = [];
            for (let q = 0, n = r.u32(); q < n; q++)
                l.push(r.i32());
            this.defs.set(k, l);
        }
    }
}
exports.Economy2 = Economy2;
