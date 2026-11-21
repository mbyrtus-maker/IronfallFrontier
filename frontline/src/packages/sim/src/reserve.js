"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reserve = exports.RV_DROP_RETURNED = exports.RV_RECALL_CANCELLED = exports.RV_RECALLED = exports.RV_RECALL = exports.RV_ARRIVED = exports.RV_DROP = exports.RV_STORED = exports.EV_RESERVE = exports.ACT_RESERVE_MODE = exports.ACT_RAPID_REINFORCE = exports.ACT_RECALL = exports.ACT_RESERVE_DEPLOY = void 0;
exports.reserveRules = reserveRules;
exports.withoutReserve = withoutReserve;
exports.ACT_RESERVE_DEPLOY = 56, exports.ACT_RECALL = 57, exports.ACT_RAPID_REINFORCE = 58, exports.ACT_RESERVE_MODE = 59;
exports.EV_RESERVE = 111; // = events.ts EV.RESERVE
exports.RV_STORED = 1, exports.RV_DROP = 2, exports.RV_ARRIVED = 3, exports.RV_RECALL = 4, exports.RV_RECALLED = 5, exports.RV_RECALL_CANCELLED = 6, exports.RV_DROP_RETURNED = 7;
function reserveRules(data, typeIds, unitCount, sizeClass, tickRate) {
    const C = data.constants, pr = C.production ?? {}, P = data.points ?? {};
    const rs = pr.reserveSize;
    if (!rs || typeof rs !== "object")
        return null;
    const size = typeof rs[sizeClass] === "number" ? rs[sizeClass] : typeof rs.small === "number" ? rs.small : 0;
    const n = (v, def) => (typeof v === "number" && v >= 0 ? v : def);
    const blds = data.buildings;
    const di = blds.findIndex((b) => b.effects?.forwardBaseCore === true && typeof b.effects?.reserveSlots === "number");
    const droppable = new Uint8Array(typeIds.length);
    data.units.forEach((u, i) => { if (i < unitCount)
        droppable[i] = u.reserveDroppable === false ? 0 : 1; });
    const source = new Uint8Array(typeIds.length);
    blds.forEach((b, i) => { if (b.effects?.supplySource === true)
        source[unitCount + i] = 1; });
    return {
        size, dropTicks: Math.round(n(pr.dropSeconds, 5) * tickRate), recallTicks: Math.round(n(pr.recallSeconds, 10) * tickRate), zone: n(P.callInZoneRadius, 150),
        depotType: di >= 0 ? unitCount + di : -1, depotSlots: di >= 0 ? blds[di].effects.reserveSlots : 0,
        depotDropTicks: Math.round(n(di >= 0 ? blds[di].effects.reinforceDelaySeconds : undefined, n(pr.dropSeconds, 5)) * tickRate),
        rapidDropTicks: Math.round(n(P.rapidReinforce?.dropSeconds, 2) * tickRate), rapidCooldownTicks: Math.round(n(P.rapidReinforce?.cooldownSeconds, 120) * tickRate),
        momentumMul: n(P.momentum?.fullMomentumReinforceCooldownMultiplier, 1), droppable, source,
    };
}
/** The data without the reserve (production.reserveSize removed): finished units wait for the field (HOLD_*), the stage-2 rule. For tests of that rule alone. */
function withoutReserve(data) {
    const C = data?.constants;
    if (!C?.production?.reserveSize)
        return data;
    const { reserveSize: _r, ...pr } = C.production;
    return { ...data, constants: { ...C, production: pr } };
}
class Reserve {
    R;
    /** entries per team (arrival order). */
    entries = [[], [], [], []];
    /** building ids in reserve mode (ascending). */
    mode = new Set();
    drops = [];
    recalls = [];
    /** per point: tick the rapid-reinforce button is ready again (0: ready). */
    rapid;
    constructor(R, nPoints) { this.R = R; this.rapid = new Int32Array(nPoints); }
    capacity(sim, team) {
        let n = this.R.size + (sim.bfx ? sim.bfx.reserveExtra(team) : 0); // fix-qa2: Tech Lab larger reserve
        if (this.R.depotType >= 0)
            for (let s = 0; s < sim.hi; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === this.R.depotType && sim.team[s] === team)
                    n += this.R.depotSlots;
        return n;
    }
    /** Entries in the reserve plus those being recalled (a recall holds its place). */
    used(team) { return this.entries[team].length + this.recalls.filter((r) => r.team === team).length; }
    hasRoom(sim, team) { return this.used(team) < this.capacity(sim, team); }
    /** Is (x, z) in a call-in zone of team: near a supplied own point or an own Field Depot. Returns 2 for a depot zone, 1 a point zone, 0 none. */
    zoneAt(sim, team, x, z, needSupplied = true) {
        const r2 = this.R.zone * this.R.zone;
        if (this.R.depotType >= 0)
            for (let s = 0; s < sim.hi; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === this.R.depotType && sim.team[s] === team && (sim.x[s] - x) ** 2 + (sim.z[s] - z) ** 2 <= r2)
                    return 2;
        const P = sim.pts;
        if (!P) { // no strategic points: the Command Core's spot is the (citadel's) call-in zone
            for (let s = 0; s < sim.hi; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && this.R.source[sim.etype[s]] && sim.team[s] === team && (sim.x[s] - x) ** 2 + (sim.z[s] - z) ** 2 <= r2)
                    return 1;
            return 0;
        }
        for (let p = 0; p < P.n; p++)
            if (P.owner[p] === team && (!needSupplied || (P.flags[p] & 1)) && (P.px[p] - x) ** 2 + (P.pz[p] - z) ** 2 <= r2)
                return 1;
        return 0;
    }
    /** Production: store a finished item of type t for team at full health. */
    store(sim, team, t, building) {
        const n = sim.d.tSquadSize[t];
        const e = { type: t, hp: new Array(n).fill(sim.d.tHp[t]), shield: new Array(n).fill(sim.d.tShield[t]) };
        this.entries[team].push(e);
        sim.events.push(exports.EV_RESERVE, sim.tick, team, exports.RV_STORED, t, building, this.entries[team].length, 0, 0, 0);
    }
    deploy(sim, team, k, x, z, rapidTicks = -1) {
        const list = this.entries[team];
        if (!(k >= 0 && k < list.length))
            return "reserveEmpty";
        const e = list[k];
        if (!this.R.droppable[e.type])
            return "notDroppable";
        const zone = rapidTicks >= 0 ? 1 : this.zoneAt(sim, team, x, z);
        if (!zone)
            return "notInCallInZone";
        if (sim.spawnRefusalOf(e.type, team))
            return "callOverBudget";
        list.splice(k, 1);
        const delay = rapidTicks >= 0 ? rapidTicks : zone === 2 ? this.R.depotDropTicks : this.R.dropTicks;
        this.drops.push({ team, e, x, z, tick: sim.tick + delay });
        sim.events.push(exports.EV_RESERVE, sim.tick, team, exports.RV_DROP, e.type, 0, list.length, x, z, 0);
        return null;
    }
    recall(sim, team, id) {
        const s = sim.idToSlot.get(id), d = sim.d;
        if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
            return "unknownUnit";
        if (sim.team[s] !== team)
            return "notOwner";
        const t = sim.etype[s];
        if (d.tStructure[t] || d.tPilot[t] || t >= d.unitCount)
            return "structure";
        if (sim.crewable(s) && sim.driverIsPlayer(s))
            return "playerDriven";
        if (!this.R.droppable[t] || sim.airS[s])
            return "notDroppable";
        if (this.recalls.some((r) => r.id === id))
            return "reserveFull";
        if (!this.hasRoom(sim, team))
            return "reserveFull";
        if (this.zoneAt(sim, team, sim.x[s], sim.z[s]) !== 1)
            return "notInCallInZone";
        this.recalls.push({ team, id, tick: sim.tick + this.R.recallTicks });
        sim.events.push(exports.EV_RESERVE, sim.tick, team, exports.RV_RECALL, t, id, this.entries[team].length, sim.x[s], sim.z[s], 0);
        return null;
    }
    rapidReinforce(sim, team, p, count) {
        const P = sim.pts;
        if (!P || !(p >= 0 && p < P.n) || P.owner[p] !== team)
            return "notOwner";
        if (!(P.flags[p] & 4))
            return "notUnderAttack"; // PT_UNDER_ATTACK
        if (this.rapid[p] > sim.tick)
            return "reinforceCooldown";
        const want = Math.max(1, Math.floor(count));
        let sent = 0;
        for (let k = 0; k < this.entries[team].length && sent < want;) {
            const e = this.entries[team][k];
            if (!this.R.droppable[e.type] || sim.spawnRefusalOf(e.type, team)) {
                k++;
                continue;
            }
            const off = (sent - (want - 1) / 2) * 12;
            if (this.deploy(sim, team, k, P.px[p] + off, P.pz[p] + 10, this.R.rapidDropTicks) === null)
                sent++;
            else
                k++;
        }
        if (sent === 0)
            return "reserveEmpty";
        let mul = 1;
        for (let u = 0; u < 4; u++)
            if (u !== team && sim.momentum(u) >= 1 - 1e-9)
                mul = this.R.momentumMul;
        this.rapid[p] = sim.tick + Math.round(this.R.rapidCooldownTicks * mul);
        return null;
    }
    /** Each step: drops that land, recalls that complete or break. */
    step(sim) {
        if (this.drops.length) {
            const keep = [];
            for (const dr of this.drops) {
                if (dr.tick > sim.tick) {
                    keep.push(dr);
                    continue;
                }
                const t = dr.e.type, n = sim.d.tSquadSize[t];
                const r = sim.slotsLeft() >= n * 4 ? sim.trySpawnUnit(sim.d.typeIds[t], dr.team, dr.x, dr.z) : null;
                if (!r || !r.ok) {
                    this.entries[dr.team].push(dr.e);
                    sim.events.push(exports.EV_RESERVE, sim.tick, dr.team, exports.RV_DROP_RETURNED, t, 0, this.entries[dr.team].length, dr.x, dr.z, 0);
                    continue;
                }
                r.ids.forEach((id, i) => { const s = sim.idToSlot.get(id); sim.hp[s] = Math.min(sim.d.tHp[t], dr.e.hp[i] ?? sim.d.tHp[t]); sim.shield[s] = Math.min(sim.d.tShield[t], dr.e.shield[i] ?? 0); });
                sim.events.push(exports.EV_RESERVE, sim.tick, dr.team, exports.RV_ARRIVED, t, r.ids[0], this.entries[dr.team].length, dr.x, dr.z, 0);
            }
            this.drops = keep;
        }
        if (this.recalls.length) {
            const keep = [];
            for (const rc of this.recalls) {
                const s = sim.idToSlot.get(rc.id);
                const alive = s !== undefined && sim.alive[s] && sim.hp[s] > 0;
                if (!alive || sim.team[s] !== rc.team || this.zoneAt(sim, rc.team, sim.x[s], sim.z[s]) !== 1 || (sim.crewable(s) && sim.driverIsPlayer(s))) {
                    sim.events.push(exports.EV_RESERVE, sim.tick, rc.team, exports.RV_RECALL_CANCELLED, alive ? sim.etype[s] : -1, rc.id, this.entries[rc.team].length, 0, 0, 0);
                    continue;
                }
                if (rc.tick > sim.tick) {
                    keep.push(rc);
                    continue;
                }
                const t = sim.etype[s], sq = sim.squads.get(sim.squad[s]);
                const members = sq ? sq.members.slice() : [rc.id];
                const e = { type: t, hp: [], shield: [] };
                for (const id of members) {
                    const m = sim.idToSlot.get(id);
                    if (m === undefined)
                        continue;
                    e.hp.push(sim.hp[m]);
                    e.shield.push(sim.shield[m]);
                }
                for (const id of members) {
                    const m = sim.idToSlot.get(id);
                    if (m !== undefined)
                        sim.quietRemove(m);
                }
                this.entries[rc.team].push(e);
                sim.events.push(exports.EV_RESERVE, sim.tick, rc.team, exports.RV_RECALLED, t, rc.id, this.entries[rc.team].length, 0, 0, 0);
            }
            this.recalls = keep;
        }
    }
    view(sim, team) { return this.entries[team].map((e) => ({ type: sim.d.typeIds[e.type], hp: e.hp.slice(), shield: e.shield.slice() })); }
    hash(word, num) {
        const ent = (e) => { word(e.type); word(e.hp.length); for (const v of e.hp)
            num(v); for (const v of e.shield)
            num(v); };
        for (let t = 0; t < 4; t++) {
            word(this.entries[t].length);
            for (const e of this.entries[t])
                ent(e);
        }
        const m = [...this.mode].sort((a, b) => a - b);
        word(m.length);
        for (const v of m)
            word(v);
        word(this.drops.length);
        for (const d of this.drops) {
            word(d.team);
            ent(d.e);
            num(d.x);
            num(d.z);
            word(d.tick);
        }
        word(this.recalls.length);
        for (const r of this.recalls) {
            word(r.team);
            word(r.id);
            word(r.tick);
        }
        word(this.rapid.length);
        for (const v of this.rapid)
            word(v);
    }
    exportTo(w) {
        const ent = (e) => { w.i32(e.type); w.i32(e.hp.length); for (const v of e.hp)
            w.f64(v); for (const v of e.shield)
            w.f64(v); };
        for (let t = 0; t < 4; t++) {
            w.i32(this.entries[t].length);
            for (const e of this.entries[t])
                ent(e);
        }
        const m = [...this.mode].sort((a, b) => a - b);
        w.i32(m.length);
        for (const v of m)
            w.i32(v);
        w.i32(this.drops.length);
        for (const d of this.drops) {
            w.u8(d.team);
            ent(d.e);
            w.f64(d.x);
            w.f64(d.z);
            w.i32(d.tick);
        }
        w.i32(this.recalls.length);
        for (const r of this.recalls) {
            w.u8(r.team);
            w.i32(r.id);
            w.i32(r.tick);
        }
        w.i32(this.rapid.length);
        for (const v of this.rapid)
            w.i32(v);
    }
    restoreFrom(r) {
        const ent = () => { const type = r.i32(), n = r.i32(), hp = [], shield = []; for (let k = 0; k < n; k++)
            hp.push(r.f64()); for (let k = 0; k < n; k++)
            shield.push(r.f64()); return { type, hp, shield }; };
        for (let t = 0; t < 4; t++) {
            this.entries[t] = [];
            for (let k = 0, n = r.i32(); k < n; k++)
                this.entries[t].push(ent());
        }
        this.mode = new Set();
        for (let k = 0, n = r.i32(); k < n; k++)
            this.mode.add(r.i32());
        this.drops = [];
        for (let k = 0, n = r.i32(); k < n; k++) {
            const team = r.u8(), e = ent(), x = r.f64(), z = r.f64(), tick = r.i32();
            this.drops.push({ team, e, x, z, tick });
        }
        this.recalls = [];
        for (let k = 0, n = r.i32(); k < n; k++) {
            const team = r.u8(), id = r.i32(), tick = r.i32();
            this.recalls.push({ team, id, tick });
        }
        const n = r.i32();
        if (n !== this.rapid.length)
            throw new Error(`reserve: state has ${n} points, map has ${this.rapid.length}`);
        for (let k = 0; k < n; k++)
            this.rapid[k] = r.i32();
    }
}
exports.Reserve = Reserve;
