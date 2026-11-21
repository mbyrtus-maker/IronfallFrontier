"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrongPoints = exports.GA_ENDED = exports.GA_RELEASED = exports.GA_GARRISONED = exports.EV_GARRISON = exports.ACT_GARRISON = void 0;
exports.strongRules = strongRules;
exports.withoutPointStructures = withoutPointStructures;
const fmath_ts_1 = require("./fmath.js");
exports.ACT_GARRISON = 55;
exports.EV_GARRISON = 110; // = events.ts EV.GARRISON
exports.GA_GARRISONED = 1, exports.GA_RELEASED = 2, exports.GA_ENDED = 3;
function strongRules(data, typeIds, callIds) {
    const P = data.points;
    const bid = P?.controlNode?.building;
    if (typeof bid !== "string")
        return null;
    const ti = (id, what) => { const i = typeof id === "string" ? typeIds.indexOf(id) : -1; if (i < 0)
        throw new Error(`strategic points: ${what} names unknown building ${String(id)}`); return i; };
    const lay = P.fortification?.layout ?? {};
    const levels = (P.fortification?.levels ?? []).slice().sort((a, b) => a.level - b.level);
    const shield = [], armoured = [], walls = [], bunker = [], mines = [], gs = [];
    let sh = 0, ar = false, wa = false, bu = false, mi = 0, g = 0;
    for (const l of levels) {
        if (typeof l.controlNodeShield === "number")
            sh = Math.max(sh, l.controlNodeShield);
        if (l.armouredControlNode === true)
            ar = true;
        if (l.barricadeWalls === true)
            wa = true;
        if (typeof l.garrisonSlots === "number" && l.garrisonSlots > 0) {
            bu = true;
            g = Math.max(g, l.garrisonSlots);
        }
        if (typeof l.minefieldApproaches === "number")
            mi = Math.max(mi, l.minefieldApproaches);
        shield[l.level] = sh;
        armoured[l.level] = ar;
        walls[l.level] = wa;
        bunker[l.level] = bu;
        mines[l.level] = mi;
        gs[l.level] = g;
    }
    const prebuilt = new Map();
    for (const pt of (P.pointTypes ?? []))
        if (Array.isArray(pt.prebuilt))
            prebuilt.set(pt.id, pt.prebuilt.map((b) => ti(b, `pointTypes ${pt.id}.prebuilt`)));
    return {
        nodeType: ti(bid, "controlNode.building"), wallType: ti(lay.wallBuilding, "fortification.layout.wallBuilding"), bunkerType: ti(lay.bunkerBuilding, "fortification.layout.bunkerBuilding"),
        segs: Math.max(1, Math.round(typeof lay.wallSegmentsPerApproach === "number" ? lay.wallSegmentsPerApproach : 1)),
        shield, armoured, walls, bunker, mines, garrisonSlots: gs, prebuilt,
        armouredDirect: typeof P.fortification?.armouredNodeDirectFraction === "number" ? P.fortification.armouredNodeDirectFraction : 0,
        mineCall: callIds && typeof lay.minefieldCall === "string" ? callIds.indexOf(lay.minefieldCall) : -1,
        garrisonOn: typeof P.garrison?.armourBonus === "number",
        garrisonArmour: typeof P.garrison?.armourBonus === "number" ? P.garrison.armourBonus : 0,
    };
}
/**
 * The data without the point structures (points.controlNode.building removed): the stage-2 point model (capture by
 * presence with no node to destroy). For tools and tests about capture and supply mechanics alone.
 */
function withoutPointStructures(data) {
    const P = data?.points;
    if (!P?.controlNode)
        return data;
    const { building: _b, ...cn } = P.controlNode;
    return { ...data, points: { ...P, controlNode: cn } };
}
/** Built-level mask bits (per point). */
const B_WALLS = 1, B_BUNKER = 2, B_MINES = 4;
const ROT = (40 * Math.PI) / 180;
class StrongPoints {
    R;
    n;
    node;
    lastOwner;
    pre;
    built;
    /** per point: the fortification level seen last step (a rise to a level with a larger node shield grants it). */
    lvSeen;
    /** per point: wall / bunker / prebuilt entity ids and minefield beacon ids (ascending creation). */
    walls;
    bunkers;
    prebuiltIds;
    mines;
    /** Derived each step (not state): armoured node ids. */
    armoured = new Set();
    /** Derived (not state): prebuilt entity ids, for the build-slot count. */
    prebuiltSet = new Set();
    /** Garrisoned squads: squad id -> point (insertion order = garrison order; hashed, exported in that order). */
    garrison = new Map();
    constructor(R, n) {
        this.R = R;
        this.n = n;
        this.node = new Int32Array(n);
        this.lastOwner = new Int8Array(n).fill(-1);
        this.pre = new Uint8Array(n);
        this.built = new Uint8Array(n);
        this.lvSeen = new Uint8Array(n);
        this.walls = Array.from({ length: n }, () => []);
        this.bunkers = Array.from({ length: n }, () => []);
        this.prebuiltIds = Array.from({ length: n }, () => []);
        this.mines = Array.from({ length: n }, () => []);
    }
    hash(word) {
        for (let p = 0; p < this.n; p++) {
            word(this.node[p]);
            word(this.lastOwner[p]);
            word(this.pre[p]);
            word(this.built[p]);
            word(this.lvSeen[p]);
            for (const a of [this.walls[p], this.bunkers[p], this.prebuiltIds[p], this.mines[p]]) {
                word(a.length);
                for (const v of a)
                    word(v);
            }
        }
        word(this.garrison.size);
        for (const [q, p] of this.garrison) {
            word(q);
            word(p);
        }
    }
    exportTo(w) {
        w.i32(this.n);
        for (let p = 0; p < this.n; p++) {
            w.i32(this.node[p]);
            w.u8(this.lastOwner[p] + 1);
            w.u8(this.pre[p]);
            w.u8(this.built[p]);
            w.u8(this.lvSeen[p]);
            for (const a of [this.walls[p], this.bunkers[p], this.prebuiltIds[p], this.mines[p]]) {
                w.i32(a.length);
                for (const v of a)
                    w.i32(v);
            }
        }
        w.i32(this.garrison.size);
        for (const [q, p] of this.garrison) {
            w.i32(q);
            w.i32(p);
        }
    }
    restoreFrom(r) {
        const n = r.i32();
        if (n !== this.n)
            throw new Error(`strong points: state has ${n} points, map has ${this.n}`);
        for (let p = 0; p < n; p++) {
            this.node[p] = r.i32();
            this.lastOwner[p] = r.u8() - 1;
            this.pre[p] = r.u8();
            this.built[p] = r.u8();
            this.lvSeen[p] = r.u8();
            const rd = () => { const a = []; for (let k = 0, m = r.i32(); k < m; k++)
                a.push(r.i32()); return a; };
            this.walls[p] = rd();
            this.bunkers[p] = rd();
            this.prebuiltIds[p] = rd();
            this.mines[p] = rd();
        }
        this.prebuiltSet = new Set(this.prebuiltIds.flat());
        this.garrison.clear();
        for (let k = 0, m = r.i32(); k < m; k++) {
            const q = r.i32();
            this.garrison.set(q, r.i32());
        }
    }
    /**
     * Damage multiplier for a hit by weapon w on slot e (sim.applyDamage): an armoured node hit by a non-ballistic weapon
     * takes R.armouredDirect of it (ruling 131: no longer 0, so every unit and player shot can bring a Stronghold's Citadel
     * down; siege guns and artillery still do full damage); garrison armour.
     */
    damageMul(sim, e, w) {
        if (this.armoured.size !== 0 && this.armoured.has(sim.eid[e]) && sim.d.wBallistic[w] === 0)
            return this.R.armouredDirect;
        if (this.garrison.size !== 0 && this.inGarrison(sim, e) >= 0)
            return 1 / (1 + this.R.garrisonArmour);
        return 1;
    }
    /** Point whose garrison slot s belongs to while it stands inside that point's area (-1: not garrisoned there). */
    inGarrison(sim, s) {
        const p = this.garrisonOf(sim, s);
        return p >= 0 && sim.pts.pointAt(sim.x[s], sim.z[s]) === p ? p : -1;
    }
    /** Point slot s's squad is garrisoned at (-1 none). */
    garrisonOf(sim, s) { if (this.garrison.size === 0)
        return -1; const p = this.garrison.get(sim.squad[s]); return p === undefined ? -1 : p; }
    /** Squads garrisoned at point p (in garrison order). */
    squadsAt(p) { const out = []; for (const [q, pp] of this.garrison)
        if (pp === p)
            out.push(q); return out; }
    /** Where point p's garrison stands: its first standing own bunker, else the point centre. */
    post(sim, p) {
        const P = sim.pts;
        for (const id of [...this.prebuiltIds[p], ...this.bunkers[p]]) {
            const s = sim.idToSlot.get(id);
            if (s !== undefined && sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === this.R.bunkerType && sim.team[s] === P.owner[p]) {
                const r = sim.d.tRadius[sim.etype[s]] + 4, dx = P.px[p] - sim.x[s], dz = P.pz[p] - sim.z[s], l = Math.sqrt(dx * dx + dz * dz) || 1;
                return [sim.x[s] + (dx / l) * r, sim.z[s] + (dz / l) * r];
            }
        }
        return [P.px[p], P.pz[p]];
    }
    /** ACT_GARRISON: garrison (on 1) or release (0) the squad of entity id at point p for team. */
    setGarrison(sim, team, p, id, on) {
        if (!this.R.garrisonOn)
            return { ok: false, reason: "notGarrisonable" };
        const s = sim.idToSlot.get(id);
        if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
            return { ok: false, reason: "unknownUnit" };
        if (sim.team[s] !== team)
            return { ok: false, reason: "notOwner" };
        const q = sim.squad[s];
        if (!on) {
            if (!this.garrison.has(q))
                return { ok: false, reason: "notGarrisoned" };
            const pp = this.garrison.get(q);
            this.garrison.delete(q);
            sim.events.push(exports.EV_GARRISON, sim.tick, team, pp, exports.GA_RELEASED, q, id, 0, 0, 0);
            return { ok: true };
        }
        const P = sim.pts, d = sim.d, t = sim.etype[s];
        if (!(p >= 0 && p < P.n) || P.owner[p] !== team)
            return { ok: false, reason: "notOwner" };
        if (d.tStructure[t] || d.tAir[t] || d.tPilot[t] || ((sim.crewable(s)) && sim.driverIsPlayer(s)))
            return { ok: false, reason: "notGarrisonable" };
        if (this.garrison.has(q))
            return { ok: false, reason: "garrisoned" };
        if (this.squadsAt(p).length >= this.garrisonSlots(sim, p))
            return { ok: false, reason: "noGarrisonSlot" };
        const sq = sim.squads.get(q);
        const ids = sq ? sq.members.slice() : [id];
        sim.order(ids, { type: "move", x: this.post(sim, p)[0], z: this.post(sim, p)[1] }, team); // walk to the post (before the garrison flag: a plain move)
        this.garrison.set(q, p);
        sim.events.push(exports.EV_GARRISON, sim.tick, team, p, exports.GA_GARRISONED, q, id, 0, 0, 0);
        return { ok: true };
    }
    /** Garrison upkeep (each step): ends lost garrisons, trims to the slots, sends stray members back. */
    garrisonStep(sim) {
        if (this.garrison.size === 0)
            return;
        const P = sim.pts;
        const end = (q, p) => { this.garrison.delete(q); const sq = sim.squads.get(q); sim.events.push(exports.EV_GARRISON, sim.tick, sq ? sq.team : P.owner[p], p, exports.GA_ENDED, q, sq?.members[0] ?? 0, 0, 0, 0); };
        for (const [q, p] of [...this.garrison]) {
            const sq = sim.squads.get(q);
            if (!sq || sq.members.length === 0 || P.owner[p] !== sq.team)
                end(q, p);
        }
        for (let p = 0; p < this.n; p++) {
            const at = this.squadsAt(p);
            if (at.length === 0)
                continue;
            const slots = this.garrisonSlots(sim, p);
            for (let k = at.length - 1; k >= slots; k--)
                end(at[k], p);
        }
        if (sim.tick % 20 !== 0)
            return; // once a second: strays walk back to the post
        for (const [q, p] of this.garrison) {
            const sq = sim.squads.get(q);
            const stray = sq.members.filter((id) => { const s = sim.idToSlot.get(id); return s !== undefined && sim.ordType[s] === 0 && P.pointAt(sim.x[s], sim.z[s]) !== p; });
            if (stray.length) {
                const [x, z] = this.post(sim, p);
                sim.order(stray, { type: "move", x, z }, sq.team);
            }
        }
    }
    /** Garrison slots of point p (its standing bunkers x the level's slots; 0 without a bunker). */
    garrisonSlots(sim, p) {
        const P = sim.pts, lv = Math.min(P.fort[p], this.R.garrisonSlots.length - 1);
        let slots = 0;
        const per = Math.max(0, ...this.R.garrisonSlots.filter((x) => x !== undefined));
        for (const id of [...this.bunkers[p], ...this.prebuiltIds[p]]) {
            const s = sim.idToSlot.get(id);
            if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0 || sim.etype[s] !== this.R.bunkerType || sim.team[s] !== P.owner[p])
                continue;
            slots += this.bunkers[p].includes(id) ? (this.R.garrisonSlots[lv] ?? 0) : per;
        }
        return slots;
    }
    /** One step (after points and economy2: owners and levels are this tick's). */
    step(sim) {
        const P = sim.pts, R = this.R;
        this.armoured.clear();
        this.garrisonStep(sim);
        for (let p = 0; p < this.n; p++) {
            const own = P.owner[p], lv = P.fort[p];
            if (own !== this.lastOwner[p]) {
                this.lastOwner[p] = own;
                const ns = this.node[p] ? sim.idToSlot.get(this.node[p]) : undefined;
                const standing = ns !== undefined && sim.alive[ns] && sim.hp[ns] > 0;
                if (own >= 0 && !(standing && sim.team[ns] === own)) {
                    if (standing)
                        sim.destroy(this.node[p]);
                    this.node[p] = this.place(sim, p, R.nodeType, own, P.px[p], P.pz[p]);
                }
                else if (own < 0)
                    this.node[p] = 0;
                if (own >= 0 && !this.pre[p]) {
                    this.pre[p] = 1;
                    const list = R.prebuilt.get(P.types[p]) ?? [];
                    list.forEach((t, k) => {
                        const a = (2 * Math.PI * (k + 0.5)) / Math.max(1, list.length), r = P.area[p] * 0.45;
                        const id = this.place(sim, p, t, own, P.px[p] + r * (0, fmath_ts_1.dcos)(a), P.pz[p] + r * (0, fmath_ts_1.dsin)(a));
                        if (id) {
                            this.prebuiltIds[p].push(id);
                            this.prebuiltSet.add(id);
                        }
                    });
                }
            }
            // fortification structures for the current level
            const want = own < 0 ? 0 : (R.walls[lv] ? B_WALLS : 0) | (R.bunker[lv] ? B_BUNKER : 0) | ((R.mines[lv] ?? 0) > 0 && R.mineCall >= 0 ? B_MINES : 0);
            const have = this.built[p];
            if ((have & ~want) !== 0)
                this.tearDown(sim, p, have & ~want);
            if ((want & ~have) !== 0)
                this.buildUp(sim, p, want & ~have, own);
            // node shield and armour
            const prevLv = this.lvSeen[p];
            this.lvSeen[p] = lv;
            const ns = this.node[p] ? sim.idToSlot.get(this.node[p]) : undefined;
            if (ns === undefined || !sim.alive[ns] || sim.hp[ns] <= 0)
                continue;
            const max = own >= 0 ? R.shield[lv] ?? 0 : 0;
            if (lv > prevLv && max > (R.shield[prevLv] ?? 0))
                sim.shield[ns] = max; // the level that gives the shield (doc level 2) grants it full
            if (own >= 0 && R.armoured[lv])
                this.armoured.add(this.node[p]);
            if (sim.shield[ns] > max)
                sim.shield[ns] = max;
            else if (sim.shield[ns] < max) {
                const c = sim.d.constants;
                if (P.flags[p] & 1) { // PT_SUPPLIED: recharge after the building-shield delay
                    if (c.bldShieldFracPerTick > 0 && sim.tick - sim.lastHit[ns] >= c.bldShieldDelayTicks)
                        sim.shield[ns] = Math.min(max, sim.shield[ns] + max * c.bldShieldFracPerTick);
                }
            }
            if (!(P.flags[p] & 1) && sim.shield[ns] > 0 && P.rules.shieldDecaySeconds > 0)
                sim.shield[ns] = Math.max(0, sim.shield[ns] - (max * sim.d.dt) / P.rules.shieldDecaySeconds);
        }
    }
    buildUp(sim, p, bits, own) {
        const P = sim.pts, R = this.R;
        if (bits & B_WALLS) {
            const rw = sim.d.tRadius[R.wallType];
            for (const q of P.adj[p].slice().sort((a, b) => a - b)) {
                const dx = P.px[q] - P.px[p], dz = P.pz[q] - P.pz[p], l = Math.sqrt(dx * dx + dz * dz);
                if (l < 1e-9)
                    continue;
                const fx = dx / l, fz = dz / l, edge = Math.max(P.rules.ring + rw * 2, P.area[p] - rw);
                for (let k = 0; k < R.segs; k++) {
                    const off = (k - (R.segs - 1) / 2) * rw * 2;
                    const id = this.place(sim, p, R.wallType, own, P.px[p] + fx * edge - fz * off, P.pz[p] + fz * edge + fx * off);
                    if (id)
                        this.walls[p].push(id);
                }
            }
            this.built[p] |= B_WALLS;
        }
        if (bits & B_BUNKER) {
            const r = Math.min(P.rules.ring * 0.6, P.area[p] * 0.3);
            const id = this.place(sim, p, R.bunkerType, own, P.px[p] - r, P.pz[p] + r);
            if (id)
                this.bunkers[p].push(id);
            this.built[p] |= B_BUNKER;
        }
        if (bits & B_MINES) {
            const C = sim.callState(), def = C.rules.calls[R.mineCall];
            const links = P.adj[p].slice().sort((a, b) => a - b);
            const d2 = (q) => (P.px[q] - P.px[p]) ** 2 + (P.pz[q] - P.pz[p]) ** 2;
            const ranked = links.filter((q) => P.owner[q] !== own).sort((a, b) => d2(a) - d2(b) || a - b);
            const order = [...ranked, ...links.filter((q) => !ranked.includes(q))];
            const nm = Math.min(this.R.mines[P.fort[p]] ?? 0, Math.max(1, order.length));
            for (let k = 0; k < nm; k++) {
                const q = order[k];
                let x = P.px[p], z = P.pz[p];
                if (q !== undefined) {
                    const dx = P.px[q] - x, dz = P.pz[q] - z, l = Math.sqrt(dx * dx + dz * dz) || 1, dd = P.area[p] + def.radius;
                    x += (dx / l) * dd;
                    z += (dz / l) * dd;
                }
                const id = C.nextBeacon++;
                // QA5-1: the mine key is secret seeded randomness, as for the Minefield call (QA1 bug 2); the field centre and
                // the fortification level are public, so a fixed key would give every mine away
                const key = (sim.rng.nextU32() >>> 1) | 1;
                C.effects.push({ beacon: id, call: R.mineCall, team: own, caller: 0, x, z, dx: 0, dz: 0, start: sim.tick, end: 0x7fffffff, n: def.count, ids: new Array(def.count).fill(key) });
                this.mines[p].push(id);
            }
            this.built[p] |= B_MINES;
        }
    }
    tearDown(sim, p, bits) {
        const gone = (ids) => { for (const id of ids)
            sim.destroy(id); ids.length = 0; };
        if (bits & B_WALLS)
            gone(this.walls[p]);
        if (bits & B_BUNKER)
            gone(this.bunkers[p]);
        if (bits & B_MINES && sim.calls) {
            const set = new Set(this.mines[p]);
            for (const e of sim.calls.effects)
                if (set.has(e.beacon)) {
                    for (let k = 0; k < e.ids.length; k++)
                        e.ids[k] = 0;
                    e.n = 0;
                    e.end = sim.tick;
                }
            this.mines[p].length = 0;
        }
        this.built[p] &= ~bits;
    }
    /** Spawns structure type t for team at (x, z), moved outward from point p's centre past standing structures; 0 if no slot. */
    place(sim, p, t, team, x, z) {
        if (sim.slotsLeft() < 1)
            return 0;
        const P = sim.pts, d = sim.d, r = d.tRadius[t];
        let cx = x, cz = z;
        for (let tries = 0; tries < 12; tries++) {
            let clear = cx >= r && cz >= r && cx <= sim.mapSize - r && cz <= sim.mapSize - r;
            for (let s = 0; s < sim.hi && clear; s++) {
                if (!sim.alive[s] || !d.tStructure[sim.etype[s]])
                    continue;
                const lim = r + d.tRadius[sim.etype[s]];
                if ((sim.x[s] - cx) ** 2 + (sim.z[s] - cz) ** 2 < lim * lim)
                    clear = false;
            }
            if (clear)
                break;
            // step around the point centre: rotate the offset by 40 degrees and push it out by one radius
            let ox = cx - P.px[p], oz = cz - P.pz[p], l = Math.sqrt(ox * ox + oz * oz);
            if (l < 1e-9) {
                ox = 1;
                oz = 0;
                l = 1;
            }
            const ca = (0, fmath_ts_1.dcos)(ROT), sa = (0, fmath_ts_1.dsin)(ROT), k = (l + r) / l;
            cx = Math.min(sim.mapSize - r, Math.max(r, P.px[p] + (ox * ca - oz * sa) * k));
            cz = Math.min(sim.mapSize - r, Math.max(r, P.pz[p] + (ox * sa + oz * ca) * k));
        }
        const id = sim.spawnUnit(d.typeIds[t], team, cx, cz);
        if (id)
            sim.clearFootprint(sim.idToSlot.get(id)); // QA5-5: no unit left wedged inside a wall that appears on it
        return id;
    }
}
exports.StrongPoints = StrongPoints;
