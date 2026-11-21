"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleGroups = exports.GROUP_ORDER_NAMES = exports.GO_ESCORT = exports.GO_PATROL = exports.GO_HOLD = exports.GO_ASSAULT = exports.GO_NONE = exports.GE_EMPTY = exports.GE_PATROL_LEG = exports.GE_RETREAT = exports.GE_REINFORCE = exports.GE_ORDER = exports.GE_REMOVED = exports.GE_ADDED = exports.EV_AUTO_DEFEND = exports.EV_GROUP = exports.ACT_AUTO_DEFEND = exports.ACT_GROUP_REINFORCE = exports.ACT_GROUP_WAYPOINT = exports.ACT_GROUP_ORDER = exports.ACT_GROUP_SET = void 0;
exports.groupRules = groupRules;
exports.groupSet = groupSet;
exports.groupOrder = groupOrder;
exports.groupWaypoint = groupWaypoint;
exports.groupReinforce = groupReinforce;
exports.setAutoDefend = setAutoDefend;
exports.groupAdopt = groupAdopt;
exports.groupsStep = groupsStep;
exports.ACT_GROUP_SET = 50, exports.ACT_GROUP_ORDER = 51, exports.ACT_GROUP_WAYPOINT = 52, exports.ACT_GROUP_REINFORCE = 53, exports.ACT_AUTO_DEFEND = 54;
exports.EV_GROUP = 100, exports.EV_AUTO_DEFEND = 101; // = events.ts EV.GROUP, EV.AUTO_DEFEND
/** GROUP event b: what happened (a label, c value: entity id / order kind / type / leg). */
exports.GE_ADDED = 1, exports.GE_REMOVED = 2, exports.GE_ORDER = 3, exports.GE_REINFORCE = 4, exports.GE_RETREAT = 5, exports.GE_PATROL_LEG = 6, exports.GE_EMPTY = 7;
/** Group order kinds (ACT_GROUP_ORDER b). */
exports.GO_NONE = 0, exports.GO_ASSAULT = 1, exports.GO_HOLD = 2, exports.GO_PATROL = 3, exports.GO_ESCORT = 4;
exports.GROUP_ORDER_NAMES = ["none", "assault", "hold", "patrol", "escort"];
function groupRules(data, tickRate) {
    const g = data.constants.battleGroups;
    if (!g || typeof g !== "object")
        return null;
    const n = (k) => { const v = g[k]; if (typeof v !== "number" || !(v >= 0))
        throw new Error(`battle groups: data field constants.battleGroups.${k} missing or not a non-negative number`); return v; };
    return {
        maxGroups: Math.round(n("maxGroups")), maxUnits: Math.round(n("maxUnits")), maxPatrol: Math.round(n("maxPatrolPoints")),
        thinkTicks: Math.max(1, Math.round(n("thinkSeconds") * tickRate)), retreatHull: n("retreatHullFraction"), returnHull: n("returnHullFraction"),
        holdRadius: n("holdRadiusMetres"), escortRadius: n("escortRadiusMetres"), reinforceBelow: n("reinforceBelowFraction"),
        adoptRadius: n("adoptRadiusMetres"), reinforceCooldown: Math.round(n("reinforceCooldownSeconds") * tickRate), autoDefendRadius: n("autoDefendRadiusMetres"),
    };
}
class BattleGroups {
    /** key team * 16 + label, ascending. */
    groups = new Map();
    /** Per team: auto-defend on (bit 0), alarm raised (bit 1). */
    autoDefend = new Uint8Array(4);
    empty() { return this.groups.size === 0 && !this.autoDefend.some((v) => v !== 0); }
    keys() { return [...this.groups.keys()].sort((a, b) => a - b); }
    groupOf(team, id) { for (const k of this.keys()) {
        const g = this.groups.get(k);
        if (g.team === team && g.members.includes(id))
            return g;
    } return null; }
    view(team) {
        const out = [];
        for (const k of this.keys()) {
            const g = this.groups.get(k);
            if (g.team !== team)
                continue;
            const route = [];
            for (let i = 0; i + 1 < g.route.length; i += 2)
                route.push([g.route[i], g.route[i + 1]]);
            out.push({ label: g.label, members: g.members.slice(), order: exports.GROUP_ORDER_NAMES[g.order], target: g.target, route, leg: g.leg, reinforce: g.reinforce === 1, peak: g.peak });
        }
        return out;
    }
    hash(word, num) {
        if (this.empty())
            return;
        word(0x6267);
        for (let t = 0; t < 4; t++)
            word(this.autoDefend[t]);
        for (const k of this.keys()) {
            const g = this.groups.get(k);
            word(k);
            word(g.members.length);
            for (const id of g.members)
                word(id);
            word(g.peak);
            word(g.order);
            word(g.target);
            word(g.route.length);
            for (const v of g.route)
                num(v);
            word(g.leg);
            word(g.reinforce);
            word(g.lastRequest);
            word(g.rtype);
        }
    }
    exportTo(w) {
        for (let t = 0; t < 4; t++)
            w.u8(this.autoDefend[t]);
        const ks = this.keys();
        w.i32(ks.length);
        for (const k of ks) {
            const g = this.groups.get(k);
            w.u8(g.team);
            w.u8(g.label);
            w.i32(g.members.length);
            for (const id of g.members)
                w.i32(id);
            w.i32(g.peak);
            w.u8(g.order);
            w.i32(g.target);
            w.i32(g.route.length);
            for (const v of g.route)
                w.f64(v);
            w.i32(g.leg);
            w.u8(g.reinforce);
            w.i32(g.lastRequest);
            w.i32(g.rtype);
        }
    }
    restoreFrom(r) {
        for (let t = 0; t < 4; t++)
            this.autoDefend[t] = r.u8();
        this.groups.clear();
        for (let i = 0, n = r.i32(); i < n; i++) {
            const team = r.u8(), label = r.u8(), members = [];
            for (let j = 0, m = r.i32(); j < m; j++)
                members.push(r.i32());
            const peak = r.i32(), order = r.u8(), target = r.i32(), route = [];
            for (let j = 0, m = r.i32(); j < m; j++)
                route.push(r.f64());
            const leg = r.i32(), reinforce = r.u8(), lastRequest = r.i32(), rtype = r.i32();
            this.groups.set(team * 16 + label, { team, label, members, peak, order, target, route, leg, reinforce, lastRequest, rtype });
        }
    }
}
exports.BattleGroups = BattleGroups;
/** units.json harvestsDeposits (the mining loop). */
function isHarv(sim, t) { return t < sim.d.unitCount && sim.d.raw.units[t].harvestsDeposits === true; }
/** buildings.json effects.supplySource (a Command Core). */
function isCore(sim, t) { const u = sim.d.unitCount; return t >= u && sim.d.raw.buildings[t - u].effects?.supplySource === true; }
const rej = (reason) => ({ ok: false, reason: reason });
/** Groupable: an own, live, non-structure unit with weapons or a mining loop (not a pilot on foot). */
function groupable(sim, s, team) {
    const d = sim.d, t = sim.etype[s];
    return sim.alive[s] === 1 && sim.hp[s] > 0 && sim.team[s] === team && !d.tStructure[t] && t !== d.pilotType && (sim.mCount[s] > 0 || isHarv(sim, t));
}
function groupSet(sim, team, label, id, add) {
    const R = sim.bgRules;
    if (!R)
        return rej("noBattleGroups");
    if (!(label >= 1 && label <= R.maxGroups))
        return rej("groupUnknown");
    const G = sim.bgState(), key = team * 16 + label;
    const s = sim.idToSlot.get(id);
    if (!add) {
        const g = G.groups.get(key);
        if (!g || !g.members.includes(id))
            return rej("groupUnknown");
        g.members = g.members.filter((m) => m !== id);
        sim.events.push(exports.EV_GROUP, sim.tick, team, label, exports.GE_REMOVED, id, 0, 0, 0, 0);
        if (!g.members.length) {
            G.groups.delete(key);
            sim.events.push(exports.EV_GROUP, sim.tick, team, label, exports.GE_EMPTY, 0, 0, 0, 0, 0);
        }
        return { ok: true };
    }
    if (s === undefined || !groupable(sim, s, team))
        return rej("notGroupable");
    let g = G.groups.get(key);
    if (g && g.members.includes(id))
        return { ok: true };
    if (g && g.members.length >= R.maxUnits)
        return rej("groupFull");
    const old = G.groupOf(team, id);
    if (old)
        groupSet(sim, team, old.label, id, 0);
    if (!g) {
        g = { team, label, members: [], peak: 0, order: exports.GO_NONE, target: 0, route: [], leg: 0, reinforce: 0, lastRequest: -(1 << 30), rtype: -1 };
        G.groups.set(key, g);
    }
    g.members.push(id);
    g.members.sort((a, b) => a - b);
    g.peak = Math.max(g.peak, g.members.length);
    sim.events.push(exports.EV_GROUP, sim.tick, team, label, exports.GE_ADDED, id, 0, 0, 0, 0);
    return { ok: true };
}
function groupOrder(sim, team, label, kind, target, x, z) {
    const g = sim.bg?.groups.get(team * 16 + label);
    if (!sim.bgRules || !g)
        return rej("groupUnknown");
    if (!(kind >= exports.GO_NONE && kind <= exports.GO_ESCORT))
        return rej("groupBadOrder");
    if (kind === exports.GO_ESCORT && target !== 0) {
        const ts = sim.idToSlot.get(target);
        if (ts === undefined || sim.team[ts] !== team)
            return rej("groupBadOrder");
    }
    g.order = kind;
    g.target = kind === exports.GO_ESCORT ? target : 0;
    g.leg = 0;
    g.route = kind === exports.GO_HOLD || kind === exports.GO_ASSAULT || kind === exports.GO_PATROL ? [sim.clampMap(x), sim.clampMap(z)] : [];
    sim.events.push(exports.EV_GROUP, sim.tick, team, label, exports.GE_ORDER, kind, 0, x, z, 0);
    return { ok: true };
}
function groupWaypoint(sim, team, label, x, z) {
    const g = sim.bg?.groups.get(team * 16 + label);
    if (!sim.bgRules || !g)
        return rej("groupUnknown");
    if (g.order !== exports.GO_PATROL || g.route.length / 2 >= sim.bgRules.maxPatrol)
        return rej("groupBadOrder");
    g.route.push(sim.clampMap(x), sim.clampMap(z));
    return { ok: true };
}
function groupReinforce(sim, team, label, on) {
    const g = sim.bg?.groups.get(team * 16 + label);
    if (!sim.bgRules || !g)
        return rej("groupUnknown");
    g.reinforce = on ? 1 : 0;
    return { ok: true };
}
function setAutoDefend(sim, team, on) {
    if (!sim.bgRules)
        return rej("noBattleGroups");
    if (!(team >= 0 && team < 4))
        return rej("notOwner");
    const G = sim.bgState();
    G.autoDefend[team] = on ? 1 : 0;
    return { ok: true };
}
/** Co-op hook (doc 17 "A leaving player's units pass to the squad"): the given unit ids join the team's lowest free group label. */
function groupAdopt(sim, team, ids) {
    const R = sim.bgRules;
    if (!R || !ids.length)
        return 0;
    const G = sim.bgState();
    let label = 0;
    for (let l = 1; l <= R.maxGroups && !label; l++)
        if (!G.groups.has(team * 16 + l))
            label = l;
    if (!label)
        for (let l = 1; l <= R.maxGroups && !label; l++)
            if (G.groups.get(team * 16 + l).members.length < R.maxUnits)
                label = l;
    if (!label)
        return 0;
    let n = 0;
    for (const id of ids)
        if (groupSet(sim, team, label, id, 1).ok)
            n++;
    return n;
}
const d2 = (sim, s, x, z) => (sim.x[s] - x) ** 2 + (sim.z[s] - z) ** 2;
/** The lieutenant and auto-defend (every thinkTicks). */
function groupsStep(sim) {
    const R = sim.bgRules, G = sim.bg;
    if (!R || !G || G.empty() || sim.tick % R.thinkTicks !== 0)
        return;
    const d = sim.d;
    const core = new Int32Array(4).fill(-1);
    for (let s = 0; s < sim.hi; s++)
        if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] < 4 && isCore(sim, sim.etype[s]) && core[sim.team[s]] < 0)
            core[sim.team[s]] = s;
    const free = (s) => sim.drv[s] === 1 && !sim.driverIsPlayer(s) && sim.ctlOn[s] === 0;
    const idle = (s) => free(s) && sim.ordType[s] === 0 && !sim.ord.ext.has(sim.eid[s]);
    for (const k of [...G.groups.keys()].sort((a, b) => a - b)) {
        const g = G.groups.get(k), team = g.team;
        // prune the dead
        const live = g.members.filter((id) => { const s = sim.idToSlot.get(id); return s !== undefined && sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team; });
        if (live.length !== g.members.length) {
            g.members = live;
            if (!live.length && !g.reinforce) {
                G.groups.delete(k);
                sim.events.push(exports.EV_GROUP, sim.tick, team, g.label, exports.GE_EMPTY, 0, 0, 0, 0, 0);
                continue;
            }
        }
        const slots = g.members.map((id) => sim.idToSlot.get(id));
        // damaged members fall back; healthy ones take the group order
        const active = [];
        for (const s of slots) {
            const f = sim.hp[s] / d.tHp[sim.etype[s]];
            const ext = sim.ord.ext.get(sim.eid[s]);
            const retreating = !!ext && ext.kind === 11; // OK_RETREAT
            if (f < R.retreatHull && free(s) && !retreating) {
                const rb = sim.eco2 ? sim.eco2.nearestRepair(sim, team, sim.x[s], sim.z[s]) : -1;
                const h = rb >= 0 ? rb : core[team];
                if (h >= 0) {
                    sim.order([sim.eid[s]], { type: "retreat", points: [[sim.x[h], sim.z[h]]] });
                    sim.events.push(exports.EV_GROUP, sim.tick, team, g.label, exports.GE_RETREAT, sim.eid[s], 0, 0, 0, 0);
                }
                continue;
            }
            if (retreating) {
                if (f >= R.returnHull && free(s))
                    sim.order([sim.eid[s]], { type: "stop" });
                continue;
            }
            active.push(s);
        }
        const hr2 = R.holdRadius * R.holdRadius;
        const send = (ss, x, z) => { if (ss.length)
            sim.order(ss.map((s) => sim.eid[s]), { type: "attackMove", x, z, formation: ss.length > 1 ? "wedge" : undefined }); };
        if ((g.order === exports.GO_HOLD || g.order === exports.GO_ASSAULT) && g.route.length >= 2) {
            const [x, z] = g.route;
            send(active.filter((s) => idle(s) && d2(sim, s, x, z) > hr2), x, z);
        }
        else if (g.order === exports.GO_PATROL && g.route.length >= 2) {
            const n = g.route.length / 2;
            let x = g.route[g.leg * 2], z = g.route[g.leg * 2 + 1];
            if (active.length && active.every((s) => d2(sim, s, x, z) <= hr2)) {
                g.leg = (g.leg + 1) % n;
                x = g.route[g.leg * 2];
                z = g.route[g.leg * 2 + 1];
                sim.events.push(exports.EV_GROUP, sim.tick, team, g.label, exports.GE_PATROL_LEG, g.leg, 0, x, z, 0);
                send(active.filter(free), x, z);
            }
            else
                send(active.filter((s) => idle(s) && d2(sim, s, x, z) > hr2), x, z);
        }
        else if (g.order === exports.GO_ESCORT) {
            let es = g.target ? sim.idToSlot.get(g.target) ?? -1 : -1;
            if (es >= 0 && (!sim.alive[es] || sim.hp[es] <= 0))
                es = -1;
            if (es < 0 && g.target === 0 && active.length) {
                let cx = 0, cz = 0;
                for (const s of active) {
                    cx += sim.x[s];
                    cz += sim.z[s];
                }
                cx /= active.length;
                cz /= active.length;
                let bd = Infinity;
                for (let s = 0; s < sim.hi; s++)
                    if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && isHarv(sim, sim.etype[s]) && !g.members.includes(sim.eid[s])) {
                        const dd = d2(sim, s, cx, cz);
                        if (dd < bd) {
                            bd = dd;
                            es = s;
                        }
                    }
            }
            if (es >= 0) {
                const er2 = R.escortRadius * R.escortRadius;
                send(active.filter((s) => free(s) && sim.ordType[s] !== 3 && d2(sim, s, sim.x[es], sim.z[es]) > er2), sim.x[es], sim.z[es]);
            }
        }
        // standing order: keep it reinforced
        if (g.reinforce && g.peak > 0 && g.members.length < Math.ceil(R.reinforceBelow * g.peak))
            reinforce(sim, g, core[team]);
    }
    // auto-defend the home base
    for (let team = 0; team < 4; team++) {
        if (!(G.autoDefend[team] & 1) || core[team] < 0)
            continue;
        const c = core[team], ar2 = R.autoDefendRadius * R.autoDefendRadius;
        const threats = [];
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] !== team && sim.team[s] < 4 && !d.tStructure[sim.etype[s]] && d2(sim, s, sim.x[c], sim.z[c]) <= ar2 && sim.detected(s, team))
                threats.push(s);
        if (!threats.length) {
            G.autoDefend[team] &= 1;
            continue;
        }
        if (!(G.autoDefend[team] & 2)) {
            G.autoDefend[team] |= 2;
            sim.events.push(exports.EV_AUTO_DEFEND, sim.tick, team, threats.length, sim.eid[c], 0, 0, 0, 0, 0);
        }
        const grouped = new Set();
        for (const g of G.groups.values())
            if (g.team === team)
                for (const id of g.members)
                    grouped.add(id);
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== team || d.tStructure[sim.etype[s]] || sim.etype[s] === d.pilotType || !(sim.mCount[s] > 0) || !sim.aiArmed(s) || grouped.has(sim.eid[s]) || !idle(s))
                continue; // QA1: no economy units
            if (d2(sim, s, sim.x[c], sim.z[c]) > 4 * ar2)
                continue;
            let best = threats[0], bd = Infinity;
            for (const o of threats) {
                const dd = d2(sim, s, sim.x[o], sim.z[o]);
                if (dd < bd) {
                    bd = dd;
                    best = o;
                }
            }
            sim.order([sim.eid[s]], { type: "attackMove", x: sim.x[best], z: sim.z[best] });
        }
    }
}
function reinforce(sim, g, core) {
    const R = sim.bgRules, d = sim.d;
    // the group's most common type (lowest type on ties); with no member left: none
    const cnt = new Map();
    for (const id of g.members) {
        const s = sim.idToSlot.get(id);
        cnt.set(sim.etype[s], (cnt.get(sim.etype[s]) ?? 0) + 1);
    }
    let type = -1, bc = 0;
    for (const [t, n] of [...cnt.entries()].sort((a, b) => a[0] - b[0]))
        if (n > bc) {
            bc = n;
            type = t;
        }
    if (type >= 0)
        g.rtype = type;
    else
        type = g.rtype;
    if (type < 0)
        return;
    // adopt idle units of that type near the Core (the reserve)
    if (core >= 0) {
        const ar2 = R.adoptRadius * R.adoptRadius;
        for (let s = 0; s < sim.hi && g.members.length < g.peak; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== g.team || sim.etype[s] !== type || sim.ordType[s] !== 0 || sim.driverIsPlayer(s) || !sim.aiArmed(s))
                continue; // QA1: never adopt an economy unit (off its loop)
            if (d2(sim, s, sim.x[core], sim.z[core]) > ar2 || sim.bg.groupOf(g.team, sim.eid[s]))
                continue;
            groupSet(sim, g.team, g.label, sim.eid[s], 1);
            if (g.members.length >= Math.ceil(R.reinforceBelow * g.peak))
                return;
        }
    }
    // else request one from production
    if (sim.tick - g.lastRequest < R.reinforceCooldown)
        return;
    for (let s = 0; s < sim.hi; s++) {
        if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== g.team || !d.tStructure[sim.etype[s]] || !d.tProduces[sim.etype[s]].includes(type))
            continue;
        g.lastRequest = sim.tick;
        sim.queueProduction(sim.tick + 1, sim.eid[s], d.typeIds[type], g.team);
        sim.events.push(exports.EV_GROUP, sim.tick, g.team, g.label, exports.GE_REINFORCE, type, 0, 0, 0, 0);
        return;
    }
}
