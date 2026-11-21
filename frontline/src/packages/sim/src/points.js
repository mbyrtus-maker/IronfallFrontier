"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Points = exports.EV_POINT = exports.EV_BUILDING_HACK = exports.EV_CORE = exports.CORE_EVENT_NAMES = exports.CE_RESTORED = exports.CE_DISABLED = exports.CE_HACK_STOPPED = exports.CE_HACK_STARTED = exports.POINT_EVENT_NAMES = exports.PE_CAPTURE_RESET = exports.PE_HACK_STOPPED = exports.PE_HACK_STARTED = exports.PE_SUPPLY_RESTORED = exports.PE_SUPPLY_LOST = exports.PE_CAPTURED = exports.PE_CONTESTED = exports.PE_CAPTURE_STARTED = exports.PT_HACKING = exports.PT_UNDER_ATTACK = exports.PT_CONTESTED = exports.PT_SUPPLIED = exports.NEUTRAL = void 0;
exports.normaliseMap = normaliseMap;
exports.frontLinePairs = frontLinePairs;
const data_ts_1 = require("./data.js");
exports.NEUTRAL = -1;
/** Point flags (PointView.flags, snapshot). */
exports.PT_SUPPLIED = 1, exports.PT_CONTESTED = 2, exports.PT_UNDER_ATTACK = 4, exports.PT_HACKING = 8;
/** EV.POINT phases (event field b). */
exports.PE_CAPTURE_STARTED = 0, exports.PE_CONTESTED = 1, exports.PE_CAPTURED = 2, exports.PE_SUPPLY_LOST = 3, exports.PE_SUPPLY_RESTORED = 4, exports.PE_HACK_STARTED = 5, exports.PE_HACK_STOPPED = 6, exports.PE_CAPTURE_RESET = 7;
exports.POINT_EVENT_NAMES = ["captureStarted", "contested", "captured", "supplyLost", "supplyRestored", "hackStarted", "hackStopped", "captureReset"];
/** EV.CORE phases (event field b; ruling 29). */
exports.CE_HACK_STARTED = 0, exports.CE_HACK_STOPPED = 1, exports.CE_DISABLED = 2, exports.CE_RESTORED = 3;
exports.CORE_EVENT_NAMES = ["hackStarted", "hackStopped", "disabled", "restored"];
exports.EV_CORE = 18;
/** fix-qa2: an enemy building hacked by a pilot (same phases as EV_CORE). = events.ts EV.BUILDING_HACK. */
exports.EV_BUILDING_HACK = 112;
const MAXT = 4; // = MAX_TEAMS (sim.ts); repeated to avoid an import cycle
function need(v, path) {
    if (typeof v !== "number" || !Number.isFinite(v))
        throw new Error(`strategic points: data field ${path} missing or not a number`);
    return v;
}
/** Points rules from data/points.json (+ economy.capturedStructureHealthFraction). Throws if the data has no points table. */
function compileRules(data, tickRate) {
    const P = data.points;
    if (!P || typeof P !== "object")
        throw new Error("createSim: the map defines strategic points but the data has no points table (data/points.json)");
    const cap = P.capture ?? {}, sup = P.supply ?? {}, mo = P.momentum ?? {};
    const levels = (P.fortification?.levels ?? []);
    const captureSeconds = [];
    for (const l of levels)
        captureSeconds[l.level] = need(l.captureSeconds, `points.fortification.levels[${l.level}].captureSeconds`);
    if (!(captureSeconds[0] > 0))
        throw new Error("strategic points: points.fortification.levels must include level 0 with captureSeconds");
    const eco = data.constants.economy ?? {};
    const types = (P.pointTypes ?? []);
    if (P.commandCore?.capturable !== false)
        throw new Error("strategic points: points.commandCore.capturable must be false (ruling 29)");
    return {
        coreDisabledTicks: Math.max(1, Math.round(need(P.commandCore?.disabledSeconds, "points.commandCore.disabledSeconds") * tickRate)),
        ring: need(cap.ringRadius, "points.capture.ringRadius"),
        hackTicks: Math.max(1, Math.round(need(cap.hackSeconds, "points.capture.hackSeconds") * tickRate)),
        bldDisabledTicks: typeof data.constants.pilot?.hackBuildingDisableSeconds === "number" ? Math.max(1, Math.round(data.constants.pilot.hackBuildingDisableSeconds * tickRate)) : 0,
        hackEnergy: typeof data.constants.pilot?.hackTool?.energyPerSecond === "number" ? data.constants.pilot.hackTool.energyPerSecond / tickRate : 0,
        captureSeconds,
        decayMul: need(cap.decayRateMultiplier, "points.capture.decayRateMultiplier"),
        reach: need(cap.terminalReachMetres, "points.capture.terminalReachMetres"),
        citadelType: String(P.standardBase?.pointType ?? "citadel-site"),
        shieldDecaySeconds: need(sup.cutOffShieldDecaySeconds, "points.supply.cutOffShieldDecaySeconds"),
        fortLossTicks: Math.max(1, Math.round(need(sup.cutOffFortificationLossSeconds, "points.supply.cutOffFortificationLossSeconds") * tickRate)),
        keptHull: need(eco.capturedStructureHealthFraction, "constants.economy.capturedStructureHealthFraction"),
        momentumFull: need(mo.fullAfterSeconds, "points.momentum.fullAfterSeconds"),
        typeIds: types.map((t) => t.id), maxFort: new Map(types.map((t) => [t.id, t.maxFortificationLevel])),
    };
}
/** Normalises and checks a map definition (ids unique, types known, links known and symmetric, inside the map). */
function normaliseMap(map, data, mapSize) {
    if (!map || !Array.isArray(map.points) || map.points.length === 0)
        throw new Error("createSim: map.points must be a non-empty array");
    const P = data.points;
    const types = new Map((P?.pointTypes ?? []).map((t) => [t.id, t.maxFortificationLevel]));
    const ids = new Set();
    const out = [];
    for (const p of map.points) {
        if (typeof p.id !== "string" || !p.id || ids.has(p.id))
            throw new Error(`map point id ${JSON.stringify(p.id)} missing or duplicated`);
        ids.add(p.id);
        if (!types.has(p.type))
            throw new Error(`map point ${p.id}: unknown point type ${p.type} (points.json pointTypes: ${[...types.keys()].join(", ")})`);
        for (const v of [p.x, p.z, p.radius])
            if (typeof v !== "number" || !Number.isFinite(v))
                throw new Error(`map point ${p.id}: x, z, radius must be finite numbers`);
        if (p.x < 0 || p.x > mapSize || p.z < 0 || p.z > mapSize)
            throw new Error(`map point ${p.id}: outside the ${mapSize} m map`);
        if (!(p.radius > 0))
            throw new Error(`map point ${p.id}: radius must be > 0`);
        const owner = p.owner === undefined || p.owner === null ? exports.NEUTRAL : p.owner;
        if (!Number.isInteger(owner) || owner < exports.NEUTRAL || owner >= MAXT)
            throw new Error(`map point ${p.id}: owner must be a team 0-${MAXT - 1} or -1 (neutral)`);
        const fort = p.fortification ?? 0;
        if (!Number.isInteger(fort) || fort < 0 || fort > (types.get(p.type) ?? 0))
            throw new Error(`map point ${p.id}: fortification ${fort} outside 0-${types.get(p.type)}`);
        const term = p.terminal ? [p.terminal[0], p.terminal[1]] : [p.x, p.z];
        if (!Number.isFinite(term[0]) || !Number.isFinite(term[1]))
            throw new Error(`map point ${p.id}: bad terminal`);
        out.push({ id: p.id, type: p.type, x: p.x, z: p.z, radius: p.radius, owner, links: [], fortification: fort, terminal: term });
    }
    const byId = new Map(out.map((p, i) => [p.id, i]));
    const adj = out.map(() => new Set());
    map.points.forEach((p, i) => {
        for (const l of p.links ?? []) {
            if (!byId.has(l))
                throw new Error(`map point ${p.id}: link to unknown point ${l}`);
            if (l === p.id)
                throw new Error(`map point ${p.id}: links to itself`);
            adj[i].add(l);
            adj[byId.get(l)].add(p.id);
        }
    });
    out.forEach((p, i) => { p.links = [...adj[i]].sort((a, b) => byId.get(a) - byId.get(b)); });
    return { id: map.id ?? "", name: map.name ?? "", size: map.size ?? mapSize, points: out };
}
exports.EV_POINT = 17;
const PC_INTERACT = 64;
class Points {
    def;
    /** JSON of the normalised map (exported with the state; hashed through defHash). */
    defJson;
    defHash;
    /** Hash of data.points (the rules): guards export / restore like the data fingerprint. */
    rulesHash;
    n;
    ids;
    types;
    px;
    pz;
    area;
    tx;
    tz;
    citadel;
    adj;
    rules;
    /** Per type index: capture rate multiplier (units.json captureRateMultiplier, default 1) and supply source (effects.supplySource). */
    tRate;
    tSource;
    /** fix-qa2: per type, a building an enemy pilot can hack to disable (not a Core, not a point structure). */
    tHackable;
    // ---- state
    owner;
    capTeam;
    capProg;
    flags;
    fort;
    cutTicks;
    hackPilot;
    hackTicks;
    momentum;
    /** Command Core hacks and disables (ruling 29), by Core entity id; only Cores with a hack running or a disable pending. */
    cores = new Map();
    // ---- scratch (not state)
    cnt;
    rate;
    blk;
    src;
    hackSeen;
    nSup = new Int32Array(MAXT);
    structSlots = new Int32Array(64);
    structPt = new Int32Array(64);
    coreSlots = [];
    coreSeen = new Set();
    constructor(map, data, mapSize, tickRate) {
        this.rules = compileRules(data, tickRate);
        this.def = normaliseMap(map, data, mapSize);
        this.defJson = JSON.stringify(this.def);
        this.defHash = (0, data_ts_1.hashString)(this.defJson);
        this.rulesHash = (0, data_ts_1.hashString)(JSON.stringify([data.points, data.constants.economy?.capturedStructureHealthFraction]));
        const pts = this.def.points, n = pts.length;
        this.n = n;
        this.ids = pts.map((p) => p.id);
        this.types = pts.map((p) => p.type);
        this.px = Float64Array.from(pts, (p) => p.x);
        this.pz = Float64Array.from(pts, (p) => p.z);
        this.area = Float64Array.from(pts, (p) => p.radius);
        this.tx = Float64Array.from(pts, (p) => p.terminal[0]);
        this.tz = Float64Array.from(pts, (p) => p.terminal[1]);
        this.citadel = Uint8Array.from(pts, (p) => (p.type === this.rules.citadelType ? 1 : 0));
        const byId = new Map(this.ids.map((id, i) => [id, i]));
        this.adj = pts.map((p) => p.links.map((l) => byId.get(l)));
        const units = data.units;
        const blds = data.buildings;
        const nt = units.length + blds.length;
        this.tRate = new Float64Array(nt);
        this.tSource = new Uint8Array(nt);
        units.forEach((u, i) => { this.tRate[i] = typeof u.captureRateMultiplier === "number" ? u.captureRateMultiplier : 1; });
        blds.forEach((b, i) => { this.tSource[units.length + i] = b.effects?.supplySource === true ? 1 : 0; });
        this.tHackable = new Uint8Array(nt);
        blds.forEach((b, i) => { const e = (b.effects ?? {}); if (this.rules.bldDisabledTicks > 0 && e.supplySource !== true && e.pointStructure !== true)
            this.tHackable[units.length + i] = 1; });
        this.owner = Int8Array.from(pts, (p) => p.owner);
        this.capTeam = new Int8Array(n).fill(-1);
        this.capProg = new Float64Array(n);
        this.flags = new Uint8Array(n);
        this.fort = Uint8Array.from(pts, (p) => p.fortification);
        this.cutTicks = new Int32Array(n);
        this.hackPilot = new Int32Array(n);
        this.hackTicks = new Int32Array(n);
        this.momentum = new Float64Array(MAXT);
        this.cnt = new Int32Array(n * MAXT);
        this.rate = new Float64Array(n * MAXT);
        this.blk = new Int32Array(n * MAXT);
        this.src = new Uint8Array(n);
        this.hackSeen = new Uint8Array(n);
    }
    /** Capture time (s) of point p at its fortification level. */
    captureSeconds(p) { const cs = this.rules.captureSeconds; return cs[this.fort[p]] ?? cs[0]; }
    /** Index of point id, -1 if none. */
    indexOf(id) { return this.ids.indexOf(id); }
    /** The point whose area contains (x, z) (the nearest centre if areas overlap; ties: lower index), -1 = none. */
    pointAt(x, z) {
        let best = -1, bd = Infinity;
        for (let p = 0; p < this.n; p++) {
            const dx = x - this.px[p], dz = z - this.pz[p], d2 = dx * dx + dz * dz;
            if (d2 <= this.area[p] * this.area[p] && d2 < bd) {
                bd = d2;
                best = p;
            }
        }
        return best;
    }
    /** Structure slot s stands on a point owned by its team that is supplied. */
    structureSupplied(h, s) {
        const p = this.pointAt(h.x[s], h.z[s]);
        return p >= 0 && this.owner[p] === h.team[s] && (this.flags[p] & exports.PT_SUPPLIED) !== 0;
    }
    /** Is the Command Core with entity id `id` disabled by a hack at this tick (ruling 29)? */
    coreDisabled(id, tick) { const c = this.cores.get(id); return !!c && c.until > tick; }
    /** Supplied points held by team (a supplied citadel counts once here). */
    suppliedCount(team) { let n = 0; for (let p = 0; p < this.n; p++)
        if (this.owner[p] === team && (this.flags[p] & exports.PT_SUPPLIED))
            n++; return n; }
    /** Pairs [a, b] (a < b) of adjacent points held by two different teams (the front line). */
    frontLine() { return frontLinePairs(this.adj, this.owner); }
    ev(h, phase, p, team, other, pilot = 0) {
        h.events.push(exports.EV_POINT, h.tick, team < 0 ? 255 : team, p, phase, team, other, pilot, 0, 0);
    }
    /** Recomputes supply flags (force: kept for callers; S14 there are no budgets to set). */
    refresh(h, _force) {
        this.scanSources(h);
        this.supply(h, -1);
    }
    scanSources(h) {
        this.src.fill(0);
        for (let s = 0; s < h.hi; s++) {
            if (!h.alive[s] || h.hp[s] <= 0 || !this.tSource[h.etype[s]])
                continue;
            const p = this.pointAt(h.x[s], h.z[s]);
            if (p >= 0)
                this.src[p] |= 1 << h.team[s];
        }
    }
    /** Supply BFS from source points through same-owner links. Logs supply events (not for point `flipped`). Returns whether any flag changed. */
    supply(h, flipped) {
        const n = this.n, own = this.owner;
        const sup = new Uint8Array(n), queue = [];
        for (let p = 0; p < n; p++)
            if (own[p] >= 0 && (this.src[p] & (1 << own[p]))) {
                sup[p] = 1;
                queue.push(p);
            }
        while (queue.length) {
            const p = queue.shift();
            for (const q of this.adj[p])
                if (!sup[q] && own[q] === own[p]) {
                    sup[q] = 1;
                    queue.push(q);
                }
        }
        let changed = false;
        for (let p = 0; p < n; p++) {
            const was = (this.flags[p] & exports.PT_SUPPLIED) !== 0, now = sup[p] === 1;
            if (was === now)
                continue;
            changed = true;
            this.flags[p] = now ? this.flags[p] | exports.PT_SUPPLIED : this.flags[p] & ~exports.PT_SUPPLIED;
            if (p !== flipped && own[p] >= 0)
                this.ev(h, now ? exports.PE_SUPPLY_RESTORED : exports.PE_SUPPLY_LOST, p, own[p], -1);
            if (now)
                this.cutTicks[p] = 0;
        }
        return changed;
    }
    /** Flips point p to team (capture or hack). */
    flip(h, p, team) {
        const prev = this.owner[p];
        this.owner[p] = team;
        this.capTeam[p] = -1;
        this.capProg[p] = 0;
        this.fort[p] = 0;
        this.cutTicks[p] = 0;
        if (this.hackPilot[p] !== 0 && h.pilots.get(this.hackPilot[p])?.team !== team)
            this.ev(h, exports.PE_HACK_STOPPED, p, h.pilots.get(this.hackPilot[p])?.team ?? -1, -1, this.hackPilot[p]);
        this.hackPilot[p] = 0;
        this.hackTicks[p] = 0;
        this.ev(h, exports.PE_CAPTURED, p, team, prev);
        if (prev >= 0) {
            // the previous owner's structures in the area change team, kept at (at most) capturedStructureHealthFraction of full hull
            for (let s = 0; s < h.hi; s++) {
                if (!h.alive[s] || h.hp[s] <= 0 || h.team[s] !== prev || !h.d.tStructure[h.etype[s]])
                    continue;
                if (this.tSource[h.etype[s]])
                    continue; // ruling 29: a Command Core never changes owner
                if (this.pointAt(h.x[s], h.z[s]) !== p)
                    continue;
                const keep = h.d.tHp[h.etype[s]] * this.rules.keptHull;
                h.captureStructure(s, team, h.hp[s] < keep ? h.hp[s] : keep);
            }
        }
    }
    /** One tick (step phase 10, before production). */
    step(h) {
        const n = this.n, r = this.rules, d = h.d, dt = d.dt, ring2 = r.ring * r.ring;
        const cnt = this.cnt, rate = this.rate, blk = this.blk;
        cnt.fill(0);
        rate.fill(0);
        blk.fill(0);
        this.src.fill(0);
        this.hackSeen.fill(0);
        let ns = 0;
        // 0. supply sources (the Command Cores) per point, before presence: a point holding a standing Core of another
        // team cannot be captured or hacked as a point (ruling 29)
        const cores = this.coreSlots;
        cores.length = 0;
        this.coreSeen.clear();
        for (let k = 0; k < h.nLive; k++) {
            const s = h.live[k];
            if (!h.alive[s] || h.hp[s] <= 0 || !this.tSource[h.etype[s]])
                continue;
            cores.push(s);
            const p = this.pointAt(h.x[s], h.z[s]);
            if (p >= 0)
                this.src[p] |= 1 << h.team[s];
        }
        // 1. presence, defenders, supply sources, structures by point, hackers
        for (let k = 0; k < h.nLive; k++) {
            const s = h.live[k];
            if (!h.alive[s] || h.hp[s] <= 0)
                continue;
            const t = h.etype[s], tm = h.team[s], x = h.x[s], z = h.z[s];
            if (d.tStructure[t]) {
                const p = this.pointAt(x, z);
                if (p >= 0) {
                    if (ns >= this.structSlots.length) {
                        const a = new Int32Array(ns * 2);
                        a.set(this.structSlots);
                        this.structSlots = a;
                        const b = new Int32Array(ns * 2);
                        b.set(this.structPt);
                        this.structPt = b;
                    }
                    this.structSlots[ns] = s;
                    this.structPt[ns] = p;
                    ns++;
                }
                if (h.mCount[s] > 0)
                    for (let p2 = 0; p2 < n; p2++) {
                        const dx = x - this.px[p2], dz = z - this.pz[p2];
                        if (dx * dx + dz * dz <= ring2)
                            blk[p2 * MAXT + tm]++;
                    }
                continue;
            }
            if (h.airS[s] || h.critTick[s] >= 0)
                continue; // flying aircraft and hulls in their critical window do not count
            if (d.crewOn && d.tDriverSeat[t] >= 0 && h.nOcc[s] === 0)
                continue; // empty vehicles do not count
            const mul = this.tRate[t];
            for (let p = 0; p < n; p++) {
                const dx = x - this.px[p], dz = z - this.pz[p];
                if (dx * dx + dz * dz > ring2)
                    continue;
                const i = p * MAXT + tm;
                cnt[i]++;
                if (mul > rate[i])
                    rate[i] = mul;
            }
            // pilot hack: a player pilot on foot, on the ground, holding interact within reach of a terminal of a point its team does not own
            const pid = h.slotPilot[s];
            // ruling 17 (fix-qa2 g): the hack tool runs on pilot energy: with none left the hack stops (PE_HACK_STOPPED / CE_HACK_STOPPED)
            if (pid !== 0 && h.ctlOn[s] && (h.ctlFlags[s] & PC_INTERACT) && h.airborne[s] === 0 && !(r.hackEnergy > 0 && h.energy[s] <= 0)) {
                const pl = h.pilots.get(pid);
                if (pl && pl.player >= 0) {
                    const reach = r.reach + d.tRadius[t];
                    // ruling 29: an enemy Command Core within reach (surface gap) is hacked instead of a point terminal
                    let core = -1, cd = Infinity;
                    for (const c of cores) {
                        if (h.team[c] === tm)
                            continue;
                        const cr = reach + d.tRadius[h.etype[c]], dx = x - h.x[c], dz = z - h.z[c], d2 = dx * dx + dz * dz;
                        if (d2 <= cr * cr && d2 < cd) {
                            cd = d2;
                            core = c;
                        }
                    }
                    if (core >= 0) {
                        const cid = h.eid[core];
                        let cs = this.cores.get(cid);
                        if (!(cs && cs.until > h.tick) && (!cs || cs.pilot === 0 || cs.pilot === pid) && !this.coreSeen.has(cid)) {
                            if (!cs) {
                                cs = { until: 0, pilot: 0, ticks: 0 };
                                this.cores.set(cid, cs);
                            }
                            if (cs.pilot === 0) {
                                cs.pilot = pid;
                                cs.ticks = 0;
                                this.coreEv(h, exports.CE_HACK_STARTED, cid, h.team[core], tm, pid);
                            }
                            this.coreSeen.add(cid);
                            if (cs.pilot === pid)
                                this.spendHack(h, s);
                        }
                        continue;
                    }
                    let best = -1, bd = Infinity;
                    for (let p = 0; p < n; p++) {
                        if (this.owner[p] === tm)
                            continue;
                        if (this.src[p] & ~(1 << tm))
                            continue; // a standing enemy Core holds the point
                        const dx = x - this.tx[p], dz = z - this.tz[p], d2 = dx * dx + dz * dz;
                        if (d2 <= reach * reach && d2 < bd) {
                            bd = d2;
                            best = p;
                        }
                    }
                    if (best >= 0 && (this.hackPilot[best] === 0 || this.hackPilot[best] === pid) && !this.hackSeen[best]) {
                        if (this.hackPilot[best] === 0) {
                            this.hackPilot[best] = pid;
                            this.hackTicks[best] = 0;
                            this.ev(h, exports.PE_HACK_STARTED, best, tm, this.owner[best], pid);
                        }
                        this.hackSeen[best] = 1;
                        this.spendHack(h, s);
                    }
                    else if (best < 0 && r.bldDisabledTicks > 0) {
                        // fix-qa2 (doc 13): no point terminal in reach: the nearest enemy building in reach is hacked (disabled for bldDisabledTicks)
                        let bs = -1, bd2 = Infinity;
                        for (let k2 = 0; k2 < h.nLive; k2++) {
                            const o = h.live[k2];
                            if (!h.alive[o] || h.hp[o] <= 0 || !this.tHackable[h.etype[o]] || h.team[o] === tm)
                                continue;
                            const cr = reach + d.tRadius[h.etype[o]], dx = x - h.x[o], dz = z - h.z[o], d2 = dx * dx + dz * dz;
                            if (d2 <= cr * cr && d2 < bd2) {
                                bd2 = d2;
                                bs = o;
                            }
                        }
                        if (bs >= 0) {
                            const bid = h.eid[bs];
                            let cs = this.cores.get(bid);
                            if (!(cs && cs.until > h.tick) && (!cs || cs.pilot === 0 || cs.pilot === pid) && !this.coreSeen.has(bid)) {
                                if (!cs) {
                                    cs = { until: 0, pilot: 0, ticks: 0, bld: 1 };
                                    this.cores.set(bid, cs);
                                }
                                if (cs.pilot === 0) {
                                    cs.pilot = pid;
                                    cs.ticks = 0;
                                    this.coreEv(h, exports.CE_HACK_STARTED, bid, h.team[bs], tm, pid);
                                }
                                this.coreSeen.add(bid);
                                if (cs.pilot === pid)
                                    this.spendHack(h, s);
                            }
                        }
                    }
                }
            }
        }
        let ownerChanged = -1, anyFlip = false;
        for (let p = 0; p < n; p++) {
            // 2. hack progress (checked first: a completed hack flips the point this tick)
            if (this.hackPilot[p] !== 0) {
                const pid = this.hackPilot[p];
                if (!this.hackSeen[p]) {
                    this.ev(h, exports.PE_HACK_STOPPED, p, h.pilots.get(pid)?.team ?? -1, this.owner[p], pid);
                    this.hackPilot[p] = 0;
                    this.hackTicks[p] = 0;
                }
                else if (++this.hackTicks[p] >= r.hackTicks) {
                    this.flip(h, p, h.pilots.get(pid).team);
                    anyFlip = true;
                    ownerChanged = p;
                }
            }
            // 3. ring capture
            const own = this.owner[p];
            let present = 0, team = -1, capturers = 0;
            for (let t = 0; t < MAXT; t++) {
                const i = p * MAXT + t;
                if (cnt[i] > 0 || blk[i] > 0) {
                    present++;
                    team = t;
                    if (cnt[i] > 0)
                        capturers++;
                }
            }
            const contested = present >= 2;
            const wasContested = (this.flags[p] & exports.PT_CONTESTED) !== 0;
            const cs = this.captureSeconds(p);
            if (contested) {
                if (!wasContested && this.capProg[p] > 0)
                    this.ev(h, exports.PE_CONTESTED, p, this.capTeam[p], own);
            }
            else if (present === 1 && capturers === 1 && team !== own && !(this.src[p] & ~(1 << team))) { // ruling 29: not while an enemy Core stands
                const step = (dt * rate[p * MAXT + team]) / cs;
                if (this.capTeam[p] >= 0 && this.capTeam[p] !== team && this.capProg[p] > 0) {
                    this.capProg[p] -= step;
                    if (this.capProg[p] <= 0) {
                        this.capProg[p] = 0;
                        this.capTeam[p] = -1;
                    }
                }
                else {
                    if (this.capTeam[p] !== team || this.capProg[p] === 0) {
                        this.capTeam[p] = team;
                        this.ev(h, exports.PE_CAPTURE_STARTED, p, team, own);
                    }
                    this.capProg[p] += step;
                    if (this.capProg[p] >= 1 - 1e-9) {
                        this.flip(h, p, team);
                        anyFlip = true;
                        ownerChanged = p;
                    }
                }
            }
            else if (this.capProg[p] > 0) {
                this.capProg[p] -= (dt * r.decayMul) / cs;
                if (this.capProg[p] <= 0) {
                    const ct = this.capTeam[p];
                    this.capProg[p] = 0;
                    this.capTeam[p] = -1;
                    this.ev(h, exports.PE_CAPTURE_RESET, p, ct, this.owner[p]);
                }
            }
            // derived flags (supplied is set below)
            const o = this.owner[p];
            let enemyIn = false;
            if (o >= 0)
                for (let t = 0; t < MAXT; t++)
                    if (t !== o && cnt[p * MAXT + t] > 0)
                        enemyIn = true;
            const hp = this.hackPilot[p];
            const attacked = o >= 0 && (enemyIn || (this.capTeam[p] >= 0 && this.capTeam[p] !== o && this.capProg[p] > 0) || hp !== 0);
            let f = this.flags[p] & exports.PT_SUPPLIED;
            if (contested)
                f |= exports.PT_CONTESTED;
            if (attacked)
                f |= exports.PT_UNDER_ATTACK;
            if (hp !== 0)
                f |= exports.PT_HACKING;
            this.flags[p] = f;
        }
        // Command Core hacks and disables (ruling 29), in Core id order
        if (this.cores.size)
            this.coreStep(h);
        // sources may have changed team with a flip this tick: rescan the flipped structures' points
        if (anyFlip)
            this.scanSources(h);
        // 4. supply
        this.supply(h, ownerChanged);
        // 5. cut-off effects: shield decay; fortification upkeep
        const sd = r.shieldDecaySeconds;
        for (let i = 0; i < ns; i++) {
            const s = this.structSlots[i], p = this.structPt[i];
            if (!h.alive[s] || h.hp[s] <= 0 || this.owner[p] !== h.team[s] || (this.flags[p] & exports.PT_SUPPLIED))
                continue;
            if (h.shield[s] > 0 && sd > 0) {
                const v = h.shield[s] - (h.d.tShield[h.etype[s]] * dt) / sd;
                h.shield[s] = v > 0 ? v : 0;
            }
        }
        for (let p = 0; p < n; p++) {
            if (this.owner[p] < 0 || (this.flags[p] & exports.PT_SUPPLIED) || this.fort[p] === 0) {
                this.cutTicks[p] = 0;
                continue;
            }
            if (++this.cutTicks[p] >= r.fortLossTicks) {
                this.fort[p]--;
                this.cutTicks[p] = 0;
            }
        }
        // 6. momentum
        const nSup = this.nSup;
        nSup.fill(0);
        for (let p = 0; p < n; p++)
            if (this.owner[p] >= 0 && (this.flags[p] & exports.PT_SUPPLIED))
                nSup[this.owner[p]]++;
        const dm = dt / r.momentumFull;
        for (let t = 0; t < MAXT; t++) {
            let other = 0;
            for (let u = 0; u < MAXT; u++)
                if (u !== t && nSup[u] > other)
                    other = nSup[u];
            let m = this.momentum[t];
            if (nSup[t] > other)
                m += dm;
            else
                m -= dm;
            this.momentum[t] = m < 0 ? 0 : m > 1 ? 1 : m;
        }
    }
    /** One tick of hack-tool energy from the hacking pilot's body slot s (ruling 17). */
    spendHack(h, s) { const e = this.rules.hackEnergy; if (e > 0) {
        const v = h.energy[s] - e;
        h.energy[s] = v > 0 ? v : 0;
    } }
    /** EV.CORE: event team `stamp` (the Core's team; for a gone Core the hacker's), field c `cField` (default: stamp). fix-qa2: a hacked building uses EV_BUILDING_HACK. */
    coreEv(h, phase, core, stamp, hackTeam, pilot, cField = stamp) {
        const o = h.idToSlot.get(core);
        const kind = (o !== undefined && !this.tSource[h.etype[o]]) || (o === undefined && this.cores.get(core)?.bld === 1) ? exports.EV_BUILDING_HACK : exports.EV_CORE;
        h.events.push(kind, h.tick, stamp, core, phase, cField, hackTeam, pilot, 0, 0);
    }
    /** fix-qa2: completed Core / building disables per hacking team (Infiltration objective); hashed and exported with the cores. */
    hacksDone = new Int32Array(MAXT);
    /** Hack progress, disable and restore of Command Cores (ruling 29). */
    coreStep(h) {
        const r = this.rules;
        for (const id of [...this.cores.keys()].sort((a, b) => a - b)) {
            const c = this.cores.get(id);
            let slot = -1;
            for (const s of this.coreSlots)
                if (h.eid[s] === id) {
                    slot = s;
                    break;
                }
            if (slot < 0) {
                const o = h.idToSlot.get(id);
                if (o !== undefined && h.alive[o] && h.hp[o] > 0 && this.tHackable[h.etype[o]])
                    slot = o;
            } // fix-qa2: a hacked building
            if (slot < 0) { // the Core is gone; QA3-9: a hack in progress ends with hackStopped (Core team -1: unknown, the Core is gone)
                if (c.pilot !== 0) {
                    const hackTeam = h.pilots.get(c.pilot)?.team ?? -1;
                    this.coreEv(h, exports.CE_HACK_STOPPED, id, hackTeam, hackTeam, c.pilot, -1);
                }
                this.cores.delete(id);
                continue;
            }
            const team = h.team[slot];
            if (c.pilot !== 0) {
                const hackTeam = h.pilots.get(c.pilot)?.team ?? -1;
                if (!this.coreSeen.has(id)) {
                    this.coreEv(h, exports.CE_HACK_STOPPED, id, team, hackTeam, c.pilot);
                    c.pilot = 0;
                    c.ticks = 0;
                }
                else if (++c.ticks >= r.hackTicks) {
                    c.until = h.tick + (this.tSource[h.etype[slot]] ? r.coreDisabledTicks : r.bldDisabledTicks);
                    this.coreEv(h, exports.CE_DISABLED, id, team, hackTeam, c.pilot);
                    c.pilot = 0;
                    c.ticks = 0;
                    this.hacksDone[hackTeam & 3]++;
                }
            }
            if (c.until > 0 && c.until <= h.tick) {
                c.until = 0;
                this.coreEv(h, exports.CE_RESTORED, id, team, -1, 0);
            }
            if (c.until === 0 && c.pilot === 0)
                this.cores.delete(id);
        }
    }
    /** Core records in id order (hash, export, snapshot). */
    coreList() { return [...this.cores.entries()].sort((a, b) => a[0] - b[0]); }
    /** Feeds every state field to the state hash. */
    hash(word, num, str) {
        str(this.defHash);
        str(this.rulesHash);
        for (let p = 0; p < this.n; p++) {
            word(this.owner[p]);
            word(this.capTeam[p]);
            num(this.capProg[p]);
            word(this.flags[p]);
            word(this.fort[p]);
            word(this.cutTicks[p]);
            word(this.hackPilot[p]);
            word(this.hackTicks[p]);
        }
        for (let t = 0; t < MAXT; t++)
            num(this.momentum[t]);
        const cl = this.coreList();
        if (cl.length) {
            word(cl.length);
            for (const [id, c] of cl) {
                word(id);
                word(c.until);
                word(c.pilot);
                word(c.ticks);
                if (c.bld)
                    word(-7);
            }
        } // none: as before ruling 29
        if (this.hacksDone.some((v) => v !== 0))
            for (let t = 0; t < MAXT; t++)
                word(this.hacksDone[t]); // fix-qa2 (none: as before)
    }
    /** Dynamic state arrays, in export order. */
    stateArrays() {
        return [this.owner, this.capTeam, this.capProg, this.flags, this.fort, this.cutTicks, this.hackPilot, this.hackTicks, this.momentum];
    }
    info() {
        return this.def.points.map((p, i) => ({ index: i, id: p.id, type: p.type, x: p.x, z: p.z, radius: p.radius, ringRadius: this.rules.ring, links: [...this.adj[i]], citadel: this.citadel[i] === 1, terminal: [this.tx[i], this.tz[i]] }));
    }
    view(p) {
        const f = this.flags[p];
        return {
            index: p, id: this.ids[p], owner: this.owner[p], captureTeam: this.capTeam[p], captureProgress: this.capProg[p],
            supplied: (f & exports.PT_SUPPLIED) !== 0, contested: (f & exports.PT_CONTESTED) !== 0, underAttack: (f & exports.PT_UNDER_ATTACK) !== 0, hacking: (f & exports.PT_HACKING) !== 0,
            hackPilot: this.hackPilot[p], hackProgress: this.hackTicks[p] / this.rules.hackTicks, fortification: this.fort[p], flags: f,
        };
    }
}
exports.Points = Points;
/** Front line from a link list and owners (also for guests: links from the map definition, owners from the snapshot). */
function frontLinePairs(adj, owner) {
    const out = [];
    for (let a = 0; a < adj.length; a++)
        for (const b of adj[a])
            if (b > a && owner[a] >= 0 && owner[b] >= 0 && owner[a] !== owner[b])
                out.push([a, b]);
    return out;
}
