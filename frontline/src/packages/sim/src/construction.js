"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Construction = exports.BUILD_YAW_STEPS = exports.EV_BUILD_ENDED = exports.EV_BUILD_DONE = exports.EV_BUILD_STARTED = exports.BUILD_END_NAMES = exports.BE_DECAYED = exports.BE_POINT_LOST = exports.BE_DESTROYED = exports.BE_CANCELLED = void 0;
exports.buildTypesForPoint = buildTypesForPoint;
exports.coreHackRules = coreHackRules;
exports.buildableFromSnapshot = buildableFromSnapshot;
exports.placeTier = placeTier;
/** BUILD_ENDED reasons (event field d). */
exports.BE_CANCELLED = 0, exports.BE_DESTROYED = 1, exports.BE_POINT_LOST = 2, exports.BE_DECAYED = 3;
exports.BUILD_END_NAMES = ["cancelled", "destroyed", "pointLost", "decayed"];
/** Event kinds (events.ts EV) this module logs. */
exports.EV_BUILD_STARTED = 23, exports.EV_BUILD_DONE = 24, exports.EV_BUILD_ENDED = 25;
/** B2: build facings are quantised to 1/BUILD_YAW_STEPS of a turn (the wire sends the step). */
exports.BUILD_YAW_STEPS = 256;
const PT_SUPPLIED = 1;
function need(v, path) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
        throw new Error(`construction: data field ${path} missing or not a number >= 0`);
    return v;
}
class Construction {
    reach;
    startFrac;
    refund;
    ringFrac;
    spacing;
    /** Type index of the constructor unit (-1: none in the data: every build is refused). */
    builderType;
    /** Per type index: buildable (1), defence (1), geyser building (1), build ticks, allowed point types. */
    tBuildable;
    tDefence;
    tGeyser;
    tTicks;
    tPointTypes;
    tIncludes;
    /** fix-qa2: point structures (effects.pointStructure: control node, bunker, barricade) use no build slot. */
    tPointStructure;
    /** Tech tier that must be open to place type t (its tier, or one below for a tier's own required building). */
    tPlaceTier;
    /** points.json: base slots and extra defence-only slots per fortification level (cumulative), by point type. */
    baseSlots = new Map();
    extraDef;
    // ---- state
    sites = new Map();
    nextId = 1;
    /** Constructors an outside order took off their sites (entity ids). */
    manual = new Set();
    /** S15 ruling 69: ticks unattended before a site decays (-1: never) and the refund share at zero. */
    decayTicks;
    decayRefund;
    /** Derived: entity ids of structures under construction (rebuilt from the sites). */
    uc = new Set();
    constructor(data, tickRate, gravityG = 1) {
        const c = (data.constants.construction ?? {});
        this.reach = need(c.reachMetres, "constants.construction.reachMetres");
        this.startFrac = need(c.startHullFraction, "constants.construction.startHullFraction");
        this.refund = need(c.cancelRefund, "constants.construction.cancelRefund");
        this.decayTicks = typeof c.decayAfterSeconds === "number" ? Math.round(c.decayAfterSeconds * tickRate) : -1; // ruling 69 (absent: no decay)
        this.decayRefund = typeof c.decayRefund === "number" ? c.decayRefund : 0;
        this.ringFrac = need(c.slotRingFraction, "constants.construction.slotRingFraction");
        this.spacing = need(c.spacingMetres, "constants.construction.spacingMetres");
        const units = data.units, blds = data.buildings;
        const nt = units.length + blds.length;
        this.builderType = typeof c.builtBy === "string" ? units.findIndex((u) => u.id === c.builtBy) : -1;
        this.tBuildable = new Uint8Array(nt);
        this.tDefence = new Uint8Array(nt);
        this.tGeyser = new Uint8Array(nt);
        this.tTicks = new Int32Array(nt);
        this.tPointTypes = new Array(nt).fill(null);
        this.tIncludes = new Array(nt).fill(null);
        this.tPointStructure = new Uint8Array(nt);
        blds.forEach((b, i) => {
            const t = units.length + i, e = (b.effects ?? {});
            this.tBuildable[t] = e.onePerMission === true || e.forwardBaseCore === true || e.pointStructure === true ? 0 : 1; // fix-qa2: point structures are placed by the sim
            if (e.pointStructure === true)
                this.tPointStructure[t] = 1;
            if (typeof e.maxPlanetGravity === "number" && gravityG > e.maxPlanetGravity + 1e-9)
                this.tBuildable[t] = 0; // fix-qa2: Mass Driver only on worlds at 0.4 g or below (doc 8)
            this.tDefence[t] = b.defence === true ? 1 : 0;
            this.tGeyser[t] = e.requiresGeyser === true ? 1 : 0;
            this.tTicks[t] = Math.max(1, Math.round(need(b.buildTime, `buildings.json ${b.id}.buildTime`) * tickRate));
            this.tPointTypes[t] = Array.isArray(b.pointTypes) ? b.pointTypes : ["citadel-site"]; // SCHEMA: default citadel-site
            this.tIncludes[t] = typeof e.includesUnit === "string" ? e.includesUnit : null;
        });
        // w2b: a building that is itself a tier requirement (constants.techTiers[N].requires: Armoury for 2, Tech Lab for 3)
        // needs only tier N - 1 to be placed, otherwise it could never be built
        this.tPlaceTier = new Uint8Array(nt);
        blds.forEach((b, i) => { this.tPlaceTier[units.length + i] = placeTier(data, b.id); });
        const P = data.points ?? {};
        for (const pt of (P.pointTypes ?? []))
            this.baseSlots.set(pt.id, pt.buildSlots ?? 0);
        const levels = (P.fortification?.levels ?? []).slice().sort((a, b) => a.level - b.level);
        this.extraDef = [];
        let acc = 0;
        for (const l of levels) {
            acc += l.extraDefenceOnlySlots ?? 0;
            this.extraDef[l.level] = acc;
        }
    }
    /** Has any site ever been placed (the hash includes this section only then)? */
    used() { return this.nextId > 1; }
    siteList() { return [...this.sites.values()].sort((a, b) => a.id - b.id); }
    underConstruction(eid) { return this.uc.size > 0 && this.uc.has(eid); }
    rebuildUc() { this.uc.clear(); for (const s of this.sites.values())
        if (s.entity)
            this.uc.add(s.entity); }
    // ------------------------------------------------------------ slots
    slotsOf(h, p) {
        const P = h.pts, type = P.types[p];
        const fwd = !!h.eco2 && h.eco2.isForward(p);
        const slots = fwd ? h.eco2.R.fbSlots : this.baseSlots.get(type) ?? 0, defenceSlots = this.extraDef[P.fort[p]] ?? 0;
        let used = 0, usedDef = 0;
        const geyserTaken = new Set();
        const count = (t, x, z, geyser) => {
            if (P.tSource[t] || (fwd && t === h.eco2.R.depotType) || this.tPointStructure[t])
                return;
            if (this.tGeyser[t]) {
                const g = geyser >= 0 ? geyser : this.geyserAt(h, x, z);
                if (g >= 0) {
                    geyserTaken.add(g);
                    return;
                }
            }
            if (this.tDefence[t])
                usedDef++;
            else
                used++;
        };
        for (let s = 0; s < h.hi; s++) {
            if (!h.alive[s] || h.hp[s] <= 0 || !h.d.tStructure[h.etype[s]])
                continue;
            if (P.pointAt(h.x[s], h.z[s]) !== p)
                continue;
            if (h.sp && h.sp.prebuiltSet.has(h.eid[s]))
                continue; // fix-qa2: a chokepoint's prebuilt structures use no build slot
            count(h.etype[s], h.x[s], h.z[s], -1);
        }
        for (const st of this.sites.values())
            if (st.point === p && !st.entity)
                count(st.type, st.x, st.z, st.geyser);
        // defence buildings fill the defence-only slots first, then normal ones
        const defOver = Math.max(0, usedDef - defenceSlots);
        const totalUsed = used + usedDef;
        const free = Math.max(0, slots - used - defOver);
        const freeDefence = Math.max(0, slots + defenceSlots - totalUsed);
        const freeGeysers = [];
        const M = h.mine;
        if (M)
            for (let g = 0; g < M.ng; g++)
                if (!geyserTaken.has(g) && P.pointAt(M.gx[g], M.gz[g]) === p)
                    freeGeysers.push(g);
        return { point: p, slots, defenceSlots, used: Math.min(totalUsed, slots + defenceSlots), usedDefence: usedDef, free, freeDefence, freeGeysers };
    }
    geyserAt(h, x, z) {
        const M = h.mine;
        if (!M)
            return -1;
        for (let g = 0; g < M.ng; g++) {
            const dx = x - M.gx[g], dz = z - M.gz[g];
            if (dx * dx + dz * dz <= M.gr[g] * M.gr[g])
                return g;
        }
        return -1;
    }
    /** Is a structure of type t at (x, z) clear of every structure and site (spacingMetres between footprints) and inside the map? */
    clear(h, t, x, z) {
        const r = h.d.tRadius[t];
        if (x - r < 0 || z - r < 0 || x + r > h.mapSize || z + r > h.mapSize)
            return false;
        for (let s = 0; s < h.hi; s++) {
            if (!h.alive[s] || !h.d.tStructure[h.etype[s]])
                continue;
            const dx = h.x[s] - x, dz = h.z[s] - z, m = r + h.d.tRadius[h.etype[s]] + this.spacing;
            if (dx * dx + dz * dz < m * m)
                return false;
        }
        for (const st of this.sites.values()) {
            if (st.entity)
                continue;
            const dx = st.x - x, dz = st.z - z, m = r + h.d.tRadius[st.type] + this.spacing;
            if (dx * dx + dz * dz < m * m)
                return false;
        }
        return true;
    }
    /** Spot for type t at point p: the first clear position on rings inside the area (deterministic), or null. */
    spot(h, t, p) {
        const P = h.pts, cx = P.px[p], cz = P.pz[p], A = P.area[p];
        for (const f of [this.ringFrac, this.ringFrac * 0.6, this.ringFrac * 1.3, this.ringFrac * 0.3]) {
            const rad = A * f;
            if (rad + h.d.tRadius[t] > A)
                continue;
            for (let k = 0; k < 16; k++) {
                const a = (k * Math.PI * 2) / 16 + 0.2;
                const x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad;
                if (P.pointAt(x, z) === p && this.clear(h, t, x, z))
                    return [x, z];
            }
        }
        return null;
    }
    /** Why team may not build type t at point p now (null: allowed). Cost and constructor are included. */
    refusal(h, team, t, p) {
        const P = h.pts;
        if (!P)
            return "unknownPoint";
        if (t < h.d.unitCount || t >= h.d.typeIds.length || !h.d.tStructure[t])
            return "unknownBuildingType";
        if (!this.tBuildable[t])
            return "notBuildable";
        if (!Number.isInteger(p) || p < 0 || p >= P.n)
            return "unknownPoint";
        if (P.owner[p] !== team)
            return "pointNotOwned";
        if (!(P.flags[p] & PT_SUPPLIED))
            return "pointUnsupplied";
        if (h.eco2 && h.eco2.isForward(p)) {
            if (!h.eco2.buildAllowedAt(p, t))
                return "wrongPointType";
        } // doc 18 forward base list
        else if (!this.tPointTypes[t].includes(P.types[p]))
            return "wrongPointType";
        if (!h.tierOpen(team, this.tPlaceTier[t]))
            return "tierLocked";
        const sl = this.slotsOf(h, p);
        if (this.tGeyser[t]) {
            if (sl.freeGeysers.length === 0)
                return "noGeyser";
        }
        else if ((this.tDefence[t] ? sl.freeDefence : sl.free) <= 0)
            return "noFreeSlot";
        if (!this.hasBuilder(h, team))
            return "noConstructor";
        if (h.ore[team] + 1e-9 < h.d.tCostOre[t] || h.gas[team] + 1e-9 < h.d.tCostGas[t])
            return "cannotAfford";
        return null;
    }
    hasBuilder(h, team) {
        if (this.builderType < 0)
            return false;
        for (let s = 0; s < h.hi; s++)
            if (h.alive[s] && h.hp[s] > 0 && h.etype[s] === this.builderType && h.team[s] === team)
                return true;
        return false;
    }
    nearestBuilder(h, team, x, z, skipManual = false) {
        let best = 0, bd = Infinity;
        if (this.builderType < 0)
            return 0;
        for (let s = 0; s < h.hi; s++) {
            if (!h.alive[s] || h.hp[s] <= 0 || h.etype[s] !== this.builderType || h.team[s] !== team)
                continue;
            if (skipManual && this.manual.has(h.eid[s]))
                continue;
            const dx = h.x[s] - x, dz = h.z[s] - z, d2 = dx * dx + dz * dz;
            if (d2 < bd || (d2 === bd && h.eid[s] < best)) {
                bd = d2;
                best = h.eid[s];
            }
        }
        return best;
    }
    /**
     * Places a site (see the header). pos: explicit [x, z] (its point is the one whose area holds it; a geyser building
     * must stand within a free geyser's radius), else point index p. builder: a constructor entity id, or -1 for the nearest.
     */
    place(h, team, t, p, pos, builder, yaw = -1) {
        const P = h.pts;
        if (!P)
            return { ok: false, reason: "unknownPoint" };
        if (pos) {
            if (!Number.isFinite(pos[0]) || !Number.isFinite(pos[1]))
                return { ok: false, reason: "badPosition" };
            p = P.pointAt(pos[0], pos[1]);
            if (p < 0)
                return { ok: false, reason: "notOnPoint" };
        }
        const why = this.refusal(h, team, t, p);
        if (why)
            return { ok: false, reason: why };
        let x, z, geyser = -1;
        if (this.tGeyser[t]) {
            const free = this.slotsOf(h, p).freeGeysers;
            if (pos) {
                geyser = this.geyserAt(h, pos[0], pos[1]);
                if (geyser < 0 || !free.includes(geyser))
                    return { ok: false, reason: "noGeyser" };
            }
            else
                geyser = free[0];
            x = h.mine.gx[geyser];
            z = h.mine.gz[geyser];
        }
        else if (pos) {
            if (!this.clear(h, t, pos[0], pos[1]) || h.pts.pointAt(pos[0], pos[1]) !== p)
                return { ok: false, reason: "badPosition" };
            x = pos[0];
            z = pos[1];
        }
        else {
            const sp = this.spot(h, t, p);
            if (!sp)
                return { ok: false, reason: "badPosition" };
            [x, z] = sp;
        }
        if (h.buildableAt && !h.buildableAt(x, z))
            return { ok: false, reason: "terrainUnbuildable" }; // wave 2 D
        let b = 0;
        if (builder >= 0) {
            const bs = h.idToSlot.get(builder);
            if (bs === undefined || !h.alive[bs] || h.hp[bs] <= 0 || h.etype[bs] !== this.builderType)
                return { ok: false, reason: "notConstructor" };
            if (h.team[bs] !== team)
                return { ok: false, reason: "notOwner" };
            b = builder;
        }
        else
            b = this.nearestBuilder(h, team, x, z);
        this.manual.delete(b);
        const co = h.d.tCostOre[t], cg = h.d.tCostGas[t];
        h.ore[team] -= co;
        h.gas[team] -= cg;
        const id = this.nextId++;
        this.sites.set(id, { id, team, type: t, point: p, x, z, geyser, builder: b, entity: 0, progress: 0, ore: co, gas: cg, idle: -1, yaw: pos && Number.isInteger(yaw) && yaw >= 0 && yaw < exports.BUILD_YAW_STEPS ? yaw : -1 });
        h.events.push(exports.EV_BUILD_STARTED, h.tick, team, id, t, p, b, co, cg, 0);
        return { ok: true, site: id };
    }
    cancel(h, team, id) {
        const st = this.sites.get(id);
        if (!st)
            return { ok: false, reason: "unknownSite" };
        if (team !== undefined && st.team !== team)
            return { ok: false, reason: "notOwner" };
        const ro = st.ore * this.refund, rg = st.gas * this.refund;
        h.ore[st.team] += ro;
        h.gas[st.team] += rg;
        this.end(h, st, exports.BE_CANCELLED, ro, rg);
        return { ok: true };
    }
    end(h, st, why, ro, rg) {
        this.sites.delete(st.id);
        if (st.entity) {
            this.uc.delete(st.entity);
            const s = h.idToSlot.get(st.entity);
            if (s !== undefined && h.alive[s] && why !== exports.BE_DESTROYED)
                h.destroy(st.entity);
        }
        h.events.push(exports.EV_BUILD_ENDED, h.tick, st.team, st.id, st.type, st.point, why, ro, rg, 0);
    }
    /** An outside order reached constructor slot s. */
    ordered(h, s) { if (h.etype[s] === this.builderType)
        this.manual.add(h.eid[s]); }
    /** One tick (step phase 10, after the strategic points and before mining / production). */
    step(h) {
        if (this.sites.size === 0) {
            if (this.manual.size)
                this.prune(h);
            return;
        }
        const P = h.pts;
        const active = new Map(); // builder id -> its first site id
        for (const st of this.siteList()) {
            // the point changed hands: the site is lost (a half-built structure the enemy took is removed)
            if (P.owner[st.point] !== st.team) {
                this.end(h, st, exports.BE_POINT_LOST, 0, 0);
                continue;
            }
            if (st.entity) {
                const s = h.idToSlot.get(st.entity);
                if (s === undefined || !h.alive[s] || h.hp[s] <= 0) {
                    this.end(h, st, exports.BE_DESTROYED, 0, 0);
                    continue;
                }
            }
            if (st.builder) {
                const bs = h.idToSlot.get(st.builder);
                if (bs === undefined || !h.alive[bs] || h.hp[bs] <= 0)
                    st.builder = 0;
            }
            if (!st.builder)
                st.builder = this.nearestBuilder(h, st.team, st.x, st.z);
            else if (this.manual.has(st.builder)) {
                // QA1 bug 4: a builder ordered elsewhere (manual) and out of reach is released when another constructor of the
                // team is free to take the site (else it stays the builder and builds when it comes back in reach)
                const bs = h.idToSlot.get(st.builder), dx = h.x[bs] - st.x, dz = h.z[bs] - st.z;
                if (Math.sqrt(dx * dx + dz * dz) - h.d.tRadius[h.etype[bs]] - h.d.tRadius[st.type] > this.reach) {
                    const alt = this.nearestBuilder(h, st.team, st.x, st.z, true);
                    if (alt)
                        st.builder = alt;
                }
            }
            if (!st.builder && this.decayTicks >= 0) { // ruling 69: no constructor left: wait, then decay at the build rate
                if (st.idle < 0)
                    st.idle = h.tick;
                if (h.tick - st.idle >= this.decayTicks) {
                    const t = st.type, full = h.d.tHp[t], ticks = this.tTicks[t];
                    if (st.progress > 0) {
                        st.progress--;
                        if (st.entity) {
                            const es = h.idToSlot.get(st.entity);
                            if (es !== undefined)
                                h.hp[es] = Math.max(1, h.hp[es] - (full * (1 - this.startFrac)) / ticks);
                        }
                    }
                    if (st.progress <= 0) {
                        const ro = st.ore * this.decayRefund, rg = st.gas * this.decayRefund;
                        h.ore[st.team] += ro;
                        h.gas[st.team] += rg;
                        this.end(h, st, exports.BE_DECAYED, ro, rg);
                    }
                }
                continue;
            }
            st.idle = -1;
            if (st.builder && !active.has(st.builder))
                active.set(st.builder, st.id);
        }
        for (const [bid, sid] of active) {
            const st = this.sites.get(sid), bs = h.idToSlot.get(bid);
            const t = st.type, rb = h.d.tRadius[h.etype[bs]], rs = h.d.tRadius[t];
            const dx = h.x[bs] - st.x, dz = h.z[bs] - st.z, dist = Math.sqrt(dx * dx + dz * dz);
            const steer = !this.manual.has(bid) && h.mineCanSteer(bs);
            if (dist - rb - rs > this.reach) {
                if (steer) {
                    const l = dist || 1, off = rs + rb + this.reach * 0.5;
                    h.mineMove(bs, st.x + (dx / l) * off, st.z + (dz / l) * off);
                }
                continue;
            }
            if (steer)
                h.mineStop(bs);
            if (!(P.flags[st.point] & PT_SUPPLIED))
                continue; // cut off: no building (doc 6)
            const full = h.d.tHp[t], ticks = this.tTicks[t];
            if (!st.entity) {
                if (h.slotsLeft() < 1)
                    continue;
                const id = h.spawnUnit(h.d.typeIds[t], st.team, st.x, st.z);
                const s = h.idToSlot.get(id);
                if (st.yaw >= 0)
                    h.faceStep(s, st.yaw); // B2: the facing the player placed it with
                h.clearFootprint(s); // QA5-5: the structure appears where units may have walked in since placement
                h.hp[s] = Math.max(1, full * this.startFrac);
                h.shield[s] = 0;
                h.mCount[s] = 0;
                st.entity = id;
                this.uc.add(id);
            }
            const s = h.idToSlot.get(st.entity);
            st.progress++;
            if (h.cheatInstant && (h.cheatInstant >> st.team) & 1)
                st.progress = ticks; // D1 test cheat: instant build
            h.hp[s] = st.progress >= ticks ? full : Math.min(full, h.hp[s] + (full * (1 - this.startFrac)) / ticks);
            if (st.progress >= ticks) {
                h.shield[s] = h.d.tShield[t];
                h.mCount[s] = h.d.tMountCount[t];
                this.sites.delete(st.id);
                this.uc.delete(st.entity);
                h.events.push(exports.EV_BUILD_DONE, h.tick, st.team, st.id, t, st.point, st.entity, 0, 0, 0);
                const inc = this.tIncludes[t];
                if (inc && h.slotsLeft() >= 1)
                    h.trySpawnUnit(inc, st.team, st.x + rs + 6, st.z);
            }
        }
        this.prune(h);
    }
    prune(h) {
        for (const id of [...this.manual]) {
            const s = h.idToSlot.get(id);
            if (s === undefined || !h.alive[s])
                this.manual.delete(id);
        }
    }
    view(h, st) {
        return { id: st.id, team: st.team, type: h.d.typeIds[st.type], point: st.point, x: st.x, z: st.z, geyser: st.geyser, yaw: st.yaw, builder: st.builder,
            entity: st.entity, progress: st.progress / this.tTicks[st.type], buildSeconds: this.tTicks[st.type] * h.d.dt, paid: { ore: st.ore, gas: st.gas } };
    }
    exportTo(w) {
        w.u32(this.nextId);
        const sl = this.siteList();
        w.u32(sl.length);
        for (const s of sl) {
            w.i32(s.id);
            w.u8(s.team);
            w.i32(s.type);
            w.i32(s.point);
            w.f64(s.x);
            w.f64(s.z);
            w.i32(s.geyser);
            w.i32(s.builder);
            w.i32(s.entity);
            w.i32(s.progress);
            w.f64(s.ore);
            w.f64(s.gas);
            w.i32(s.idle);
            w.i16(s.yaw);
        } // state v26: + idle (ruling 69); v32: + yaw (B2)
        const m = [...this.manual].sort((a, b) => a - b);
        w.u32(m.length);
        for (const id of m)
            w.i32(id);
    }
    restoreFrom(r) {
        this.nextId = r.u32();
        this.sites.clear();
        for (let i = 0, n = r.u32(); i < n; i++) {
            const id = r.i32(), team = r.u8(), type = r.i32(), point = r.i32(), x = r.f64(), z = r.f64(), geyser = r.i32(), builder = r.i32(), entity = r.i32(), progress = r.i32(), ore = r.f64(), gas = r.f64(), idle = r.i32(), yaw = r.i16();
            this.sites.set(id, { id, team, type, point, x, z, geyser, builder, entity, progress, ore, gas, idle, yaw });
        }
        this.manual.clear();
        for (let i = 0, n = r.u32(); i < n; i++)
            this.manual.add(r.i32());
        this.rebuildUc();
    }
    hash(word, num) {
        word(this.nextId);
        const sl = this.siteList();
        word(sl.length);
        for (const s of sl) {
            word(s.id);
            word(s.team);
            word(s.type);
            word(s.point);
            num(s.x);
            num(s.z);
            word(s.geyser);
            word(s.builder);
            word(s.entity);
            word(s.progress);
            num(s.ore);
            num(s.gas);
            if (s.idle >= 0)
                word(s.idle);
            if (s.yaw >= 0)
                word(0xb2000 + s.yaw);
        }
        const m = [...this.manual].sort((a, b) => a - b);
        word(m.length);
        for (const id of m)
            word(id);
    }
}
exports.Construction = Construction;
/** Building type ids that may go on a point type (static data; for the client's build menu). */
function buildTypesForPoint(data, pointType) {
    return data.buildings.filter((b) => {
        const e = b.effects ?? {};
        if (e.onePerMission === true || e.forwardBaseCore === true || e.pointStructure === true)
            return false; // designer 16 Nov: barricades, control nodes and point bunkers are placed by the sim, never in the build menu
        return (Array.isArray(b.pointTypes) ? b.pointTypes : ["citadel-site"]).includes(pointType);
    }).map((b) => b.id);
}
/**
 * Command Core hack rules for the client (ruling 29; points.json): a pilot on foot holding interact within reachMetres
 * of the Core's surface for hackSeconds disables it for disabledSeconds.
 */
function coreHackRules(data) {
    const P = (data.points ?? {});
    return { reachMetres: P.capture?.terminalReachMetres ?? 0, hackSeconds: P.capture?.hackSeconds ?? 0, disabledSeconds: P.commandCore?.disabledSeconds ?? 0 };
}
/**
 * What a team may build where, from a decoded snapshot (client side, no sim): for each point the building types its
 * point type accepts that fit a free slot (defence-only slots for defence buildings; a free geyser for a geyser
 * building) on a point the team owns and that is supplied. Cost, tier and the constructor are NOT checked here
 * (the host refuses with the reason).
 */
function buildableFromSnapshot(data, pointTypes, owners, supplied, slots, team) {
    const blds = data.buildings;
    return pointTypes.map((pt, p) => {
        if (owners[p] !== team || !supplied[p] || !slots[p])
            return { point: p, types: [] };
        const types = buildTypesForPoint(data, pt).filter((id) => {
            const b = blds.find((x) => x.id === id);
            if (b.effects?.requiresGeyser === true)
                return slots[p].freeGeysers > 0;
            return (b.defence === true ? slots[p].freeDefence : slots[p].free) > 0;
        });
        return { point: p, types };
    });
}
/**
 * w2b / U1: the tech tier that must be open to place building `id`: its data tier, except that a building that is
 * itself a tier requirement (constants.techTiers[N].requires: Armoury for 2, Tech Lab for 3) needs only tier N - 1
 * (otherwise it could never be built). The client's build menu uses the same rule.
 */
function placeTier(data, id) {
    const b = data.buildings.find((x) => x.id === id);
    let tier = b && typeof b.tier === "number" ? b.tier : 0;
    const tiers = (data.constants.techTiers ?? {});
    for (const [k, v] of Object.entries(tiers))
        if (Array.isArray(v.requires) && v.requires.includes(id))
            tier = Math.min(tier, Number(k) - 1);
    return Math.max(0, tier);
}
