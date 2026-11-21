"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mining = exports.EV_HARVEST_DELIVERED = exports.EV_DEPOSIT_EXHAUSTED = exports.HARVESTER_PHASE_NAMES = exports.HV_EXITING = exports.HV_DOCKING = exports.HV_QUEUED = exports.HV_UNLOADING = exports.HV_WAITING = exports.HV_TO_DROPOFF = exports.HV_LOADING = exports.HV_TO_DEPOSIT = exports.HV_IDLE = void 0;
exports.dockLayout = dockLayout;
exports.normaliseMining = normaliseMining;
exports.mapHasMining = mapHasMining;
const data_ts_1 = require("./data.js");
exports.HV_IDLE = 0, exports.HV_TO_DEPOSIT = 1, exports.HV_LOADING = 2, exports.HV_TO_DROPOFF = 3, exports.HV_WAITING = 4, exports.HV_UNLOADING = 5, exports.HV_QUEUED = 6, exports.HV_DOCKING = 7, exports.HV_EXITING = 8;
exports.HARVESTER_PHASE_NAMES = ["idle", "toDeposit", "loading", "toDropOff", "waitingForDropOff", "unloading", "queued", "docking", "exiting"];
/**
 * q1: dock geometry of a drop-off at (cx, cz) facing (fx, fz) (dirX = cos yaw, dirZ = sin yaw). docks: flat [right, forward]
 * pairs in the building frame (buildings.json effects.docks; null: one dock in front). Dock k stands bR + hR + reach / 2 from
 * the centre along its direction; the lane runs out along the mean dock direction. Pure (the client draws it too).
 */
function dockLayout(cx, cz, fx, fz, docks, bR, hR, reach) {
    const L = { n: 0, dx: [], dz: [], ux: [], uz: [], nx: 0, nz: 0, ox: 0, oz: 0 };
    const rX = -fz, rZ = fx, dist = bR + hR + reach * 0.5;
    const src = docks && docks.length >= 2 ? docks : [0, 1];
    let sx = 0, sz = 0;
    for (let i = 0; i + 1 < src.length; i += 2) {
        const r = src[i], f = src[i + 1];
        let wx = fx * f + rX * r, wz = fz * f + rZ * r;
        const l = Math.sqrt(wx * wx + wz * wz);
        if (l > 1e-9) {
            wx /= l;
            wz /= l;
        }
        else {
            wx = fx;
            wz = fz;
        }
        L.ux.push(wx);
        L.uz.push(wz);
        L.dx.push(cx + wx * dist);
        L.dz.push(cz + wz * dist);
        sx += wx;
        sz += wz;
        L.n++;
    }
    const sl = Math.sqrt(sx * sx + sz * sz);
    if (sl > 1e-9) {
        L.nx = sx / sl;
        L.nz = sz / sl;
    }
    else {
        L.nx = fx;
        L.nz = fz;
    }
    L.ox = cx + L.nx * dist;
    L.oz = cz + L.nz * dist;
    return L;
}
/** Event kinds (events.ts EV) this module logs. */
exports.EV_DEPOSIT_EXHAUSTED = 19, exports.EV_HARVEST_DELIVERED = 20;
function need(v, path) {
    if (typeof v !== "number" || !Number.isFinite(v) || !(v > 0))
        throw new Error(`mining: data field ${path} missing or not a positive number`);
    return v;
}
function finite(v) { return typeof v === "number" && Number.isFinite(v); }
/** Normalises and checks the mining part of a map definition (ids unique, inside the map, positive sizes). */
function normaliseMining(map, mapSize, flowRange = [0, Infinity]) {
    const ids = new Set();
    const deposits = [];
    for (const dp of map.deposits ?? []) {
        if (typeof dp.id !== "string" || !dp.id || ids.has(dp.id))
            throw new Error(`map deposit id ${JSON.stringify(dp.id)} missing or duplicated`);
        ids.add(dp.id);
        if (!finite(dp.x) || !finite(dp.z) || !finite(dp.radius) || !finite(dp.ore))
            throw new Error(`map deposit ${dp.id}: x, z, radius, ore must be finite numbers`);
        if (dp.x < 0 || dp.x > mapSize || dp.z < 0 || dp.z > mapSize)
            throw new Error(`map deposit ${dp.id}: outside the ${mapSize} m map`);
        if (!(dp.radius > 0))
            throw new Error(`map deposit ${dp.id}: radius must be > 0`);
        if (!(dp.ore > 0))
            throw new Error(`map deposit ${dp.id}: ore must be > 0`);
        deposits.push({ id: dp.id, x: dp.x, z: dp.z, radius: dp.radius, ore: dp.ore });
    }
    const geysers = [];
    for (const g of map.geysers ?? []) {
        if (typeof g.id !== "string" || !g.id || ids.has(g.id))
            throw new Error(`map geyser id ${JSON.stringify(g.id)} missing or duplicated`);
        ids.add(g.id);
        if (!finite(g.x) || !finite(g.z) || !finite(g.radius) || !finite(g.gasPerSecond))
            throw new Error(`map geyser ${g.id}: x, z, radius, gasPerSecond must be finite numbers`);
        if (g.x < 0 || g.x > mapSize || g.z < 0 || g.z > mapSize)
            throw new Error(`map geyser ${g.id}: outside the ${mapSize} m map`);
        if (!(g.radius > 0))
            throw new Error(`map geyser ${g.id}: radius must be > 0`);
        if (!(g.gasPerSecond >= flowRange[0] && g.gasPerSecond <= flowRange[1]))
            throw new Error(`map geyser ${g.id}: gasPerSecond ${g.gasPerSecond} outside the Gas Extractor's ${flowRange[0]}-${flowRange[1]} (buildings.json effects.gasPerSecond)`);
        geysers.push({ id: g.id, x: g.x, z: g.z, radius: g.radius, gasPerSecond: g.gasPerSecond });
    }
    return { deposits, geysers };
}
/** Does this map definition need a Mining object? */
function mapHasMining(map) {
    return !!map && ((Array.isArray(map.deposits) && map.deposits.length > 0) || (Array.isArray(map.geysers) && map.geysers.length > 0));
}
class Mining {
    def;
    /** JSON of the normalised mining definition (exported with the state; hashed through defHash). */
    defJson;
    defHash;
    nd;
    dx;
    dz;
    dr;
    dOre0;
    /** Per type index: harvester ore capacity (0 = not a harvester), drop-off building. */
    tCap;
    tDrop;
    tExtractor;
    ng;
    gx;
    gz;
    gr;
    gRate;
    /** Scratch (not state): extractor slot per geyser this tick (-1 none) and whether it pumped. */
    gSlot;
    gOn;
    tOreStore;
    tGasStore;
    baseOre;
    baseGas;
    /** Storage caps per team, recomputed at the start of every step (not state: derived from the buildings). */
    oreCap = new Float64Array(4);
    gasCap = new Float64Array(4);
    loadSeconds;
    unloadSeconds;
    reach;
    /** q1 dock queue: per type flat [right, forward] dock pairs (drop-off buildings; null: default one dock in front). */
    tDocks;
    qGap;
    qJoin;
    qExit;
    qExitSeconds;
    qArrive;
    /** q1: per slot, the drop-off entity id of a lane member (0 none); filled by lanes() before movement. Not state. */
    lane = new Int32Array(0);
    /** q1: per slot, a harvester settled on its queue place or on its dock: other harvesters do not push it (they slide off it). */
    firm = new Uint8Array(0);
    /** q1: lanes of this tick by drop-off entity id (scratch). */
    lanesNow = new Map();
    spot = new Map();
    // ---- state
    /** Remaining ore per deposit. */
    remaining;
    /** Harvester records by entity id. */
    harv = new Map();
    /** haulerLoad: planet.ts PlanetRules.haulerLoad (doc 12 hauler load: +50% in low gravity, -30% in high). */
    constructor(map, data, mapSize, haulerLoad = 1) {
        const units = data.units;
        const blds = data.buildings;
        this.tCap = new Float64Array(units.length + blds.length);
        this.tDrop = new Uint8Array(units.length + blds.length);
        units.forEach((u, i) => { if (u.harvestsDeposits)
            this.tCap[i] = need(u.cargoCapacity?.ore, `units.json ${u.id}.cargoCapacity.ore`) * haulerLoad; });
        blds.forEach((b, i) => { this.tDrop[units.length + i] = b.effects?.oreDropOff === true ? 1 : 0; });
        this.tExtractor = new Uint8Array(units.length + blds.length);
        this.tOreStore = new Float64Array(units.length + blds.length);
        this.tGasStore = new Float64Array(units.length + blds.length);
        blds.forEach((b, i) => {
            this.tOreStore[units.length + i] = b.effects?.oreStorage ?? 0;
            this.tGasStore[units.length + i] = b.effects?.gasStorage ?? 0;
        });
        let flow = [Infinity, -Infinity];
        blds.forEach((b, i) => {
            if (b.effects?.requiresGeyser !== true)
                return;
            this.tExtractor[units.length + i] = 1;
            const r = b.effects.gasPerSecond;
            if (r)
                flow = [Math.min(flow[0], r[0]), Math.max(flow[1], r[1])];
        });
        if (!(flow[0] <= flow[1]))
            flow = [0, Infinity];
        const m = (data.constants.economy ?? {}).mining ?? {};
        this.loadSeconds = need(m.harvesterLoadSeconds, "constants.economy.mining.harvesterLoadSeconds");
        this.unloadSeconds = need(m.harvesterUnloadSeconds, "constants.economy.mining.harvesterUnloadSeconds");
        this.reach = need(m.dropOffReachMetres, "constants.economy.mining.dropOffReachMetres");
        this.tDocks = new Array(units.length + blds.length).fill(null);
        blds.forEach((b, i) => { const k = b.effects?.docks; if (Array.isArray(k) && k.length)
            this.tDocks[units.length + i] = Float64Array.from(k.flat()); });
        const q = m.queue ?? {};
        this.qGap = finite(q.gapMetres) ? q.gapMetres : 2;
        this.qJoin = finite(q.joinMetres) ? q.joinMetres : 20;
        this.qExit = finite(q.exitMetres) ? q.exitMetres : 14;
        this.qExitSeconds = finite(q.exitSeconds) ? q.exitSeconds : 6;
        this.qArrive = finite(q.dockArriveMetres) ? q.dockArriveMetres : 3.5;
        const bs = m.baseStorage ?? {};
        if (!finite(bs.ore) || !finite(bs.gas) || bs.ore < 0 || bs.gas < 0)
            throw new Error("mining: data field constants.economy.mining.baseStorage.ore / .gas missing or negative");
        this.baseOre = bs.ore;
        this.baseGas = bs.gas;
        this.def = normaliseMining(map, mapSize, flow);
        this.defJson = JSON.stringify(this.def);
        this.defHash = (0, data_ts_1.hashString)(this.defJson);
        const ds = this.def.deposits;
        this.nd = ds.length;
        this.dx = Float64Array.from(ds, (d) => d.x);
        this.dz = Float64Array.from(ds, (d) => d.z);
        this.dr = Float64Array.from(ds, (d) => d.radius);
        this.dOre0 = Float64Array.from(ds, (d) => d.ore);
        this.remaining = Float64Array.from(ds, (d) => d.ore);
        const gs = this.def.geysers;
        this.ng = gs.length;
        this.gx = Float64Array.from(gs, (g) => g.x);
        this.gz = Float64Array.from(gs, (g) => g.z);
        this.gr = Float64Array.from(gs, (g) => g.radius);
        this.gRate = Float64Array.from(gs, (g) => g.gasPerSecond);
        this.gSlot = new Int32Array(this.ng).fill(-1);
        this.gOn = new Uint8Array(this.ng);
    }
    geyserInfo() { return this.def.geysers.map((g, i) => ({ index: i, id: g.id, x: g.x, z: g.z, radius: g.radius, gasPerSecond: g.gasPerSecond })); }
    depositInfo() { return this.def.deposits.map((d, i) => ({ index: i, id: d.id, x: d.x, z: d.z, radius: d.radius, ore: d.ore })); }
    depositView(i) { return { index: i, id: this.def.deposits[i].id, remaining: this.remaining[i], exhausted: this.remaining[i] <= 0 }; }
    /** Recomputes every team's storage caps from its live buildings. */
    caps(host) {
        this.oreCap.fill(this.baseOre);
        this.gasCap.fill(this.baseGas);
        for (let s = 0; s < host.hi; s++) { // every slot (not only the live list: a building spawned between steps counts at once)
            if (!host.alive[s] || host.hp[s] <= 0)
                continue;
            const t = host.etype[s];
            if ((this.tOreStore[t] > 0 || this.tGasStore[t] > 0) && host.underConstruction(s))
                continue;
            if (this.tOreStore[t] > 0)
                this.oreCap[host.team[s]] += this.tOreStore[t];
            if (this.tGasStore[t] > 0)
                this.gasCap[host.team[s]] += this.tGasStore[t];
        }
    }
    /** Harvester records in entity id order. */
    harvList() { return [...this.harv.values()].sort((a, b) => a.id - b.id); }
    harvView(h, host) {
        const s = host.idToSlot.get(h.id);
        return { id: h.id, manual: h.mode === 1, phase: h.phase, phaseName: exports.HARVESTER_PHASE_NAMES[h.phase], deposit: h.dep, load: h.load, capacity: s === undefined ? 0 : this.tCap[host.etype[s]], dropOff: h.drop, dock: h.dock, queuePlace: this.queuePlace(h) };
    }
    /** q1: place in its drop-off's queue (1 = next to dock), 0 when not queued. From the records alone. */
    queuePlace(h) {
        if (h.phase !== exports.HV_QUEUED || h.mode !== 0)
            return 0;
        const D = this.spot.get(h.id);
        if (D === undefined)
            return 0;
        let n = 1;
        for (const o of this.harv.values())
            if (o !== h && o.mode === 0 && o.phase === exports.HV_QUEUED && o.drop === h.drop) {
                const E = this.spot.get(o.id);
                if (E !== undefined && E < D)
                    n++;
            }
        return n;
    }
    rec(id) { let h = this.harv.get(id); if (!h) {
        h = { id, mode: 0, phase: exports.HV_IDLE, dep: -1, load: 0, drop: 0, dlv: 0, dock: -1, qt: 0, qa: 0, ex: 0, ez: 0, exT: 0 };
        this.harv.set(id, h);
    } return h; }
    /** An outside order reached harvester `id` (slot s): it leaves the loop (and its dock or queue place). */
    manual(host, s) {
        if (this.tCap[host.etype[s]] > 0) {
            const h = this.rec(host.eid[s]);
            h.mode = 1;
            this.leaveLane(h);
        }
    }
    leaveLane(h) {
        if (h.phase === exports.HV_QUEUED || h.phase === exports.HV_DOCKING)
            h.phase = exports.HV_TO_DROPOFF;
        else if (h.phase === exports.HV_EXITING) {
            h.phase = exports.HV_IDLE;
            h.drop = 0;
        }
        h.dock = -1;
    }
    /** Puts harvester slot s (back) into the loop, at deposit dep (-1: the nearest with ore). */
    assign(host, s, dep) {
        const h = this.rec(host.eid[s]);
        h.mode = 0;
        h.dock = -1;
        h.drop = 0;
        if (dep >= 0 && this.remaining[dep] > 0) {
            h.dep = dep;
            h.phase = h.load >= this.tCap[host.etype[s]] ? exports.HV_TO_DROPOFF : exports.HV_TO_DEPOSIT;
        }
        else {
            h.dep = -1;
            h.phase = exports.HV_IDLE;
        }
    }
    nearestDeposit(x, z, not = -1) {
        let best = -1, bd = Infinity;
        for (let i = 0; i < this.nd; i++) {
            if (i === not || this.remaining[i] <= 0)
                continue;
            const dx = x - this.dx[i], dz = z - this.dz[i], d2 = dx * dx + dz * dz;
            if (d2 < bd) {
                bd = d2;
                best = i;
            }
        }
        return best;
    }
    /** A live friendly finished drop-off building (slot o) for team. */
    isDrop(host, o, team) {
        return host.alive[o] === 1 && host.hp[o] > 0 && host.team[o] === team && (this.tDrop[host.etype[o]] === 1 || (host.extraDropOff !== undefined && host.extraDropOff(o))) && !host.underConstruction(o);
    }
    dropSlot(host, id, team) {
        if (id === 0)
            return -1;
        const o = host.idToSlot.get(id);
        return o !== undefined && this.isDrop(host, o, team) ? o : -1;
    }
    /** q1: the lane of drop-off slot o this tick (created on first use). */
    laneOf(host, o, hR) {
        const id = host.eid[o];
        let ln = this.lanesNow.get(id);
        if (!ln) {
            const t = host.etype[o];
            ln = { o, L: dockLayout(host.x[o], host.z[o], host.dirX[o], host.dirZ[o], this.tDocks[t], host.d.tRadius[t], hR, this.reach), occ: 0, q: [], tail: 0, committed: 0 };
            this.lanesNow.set(id, ln);
        }
        return ln;
    }
    /** q1: least travel time + estimated wait (committed harvesters x unload time / docks); ties lower entity id. */
    chooseDropOff(host, s) {
        let best = -1, bc = Infinity;
        const team = host.team[s], spd = host.d.tSpeed[host.etype[s]] || 1, hR = host.d.tRadius[host.etype[s]];
        for (let k = 0; k < host.nLive; k++) {
            const o = host.live[k];
            if (!this.isDrop(host, o, team))
                continue;
            const dx = host.x[s] - host.x[o], dz = host.z[s] - host.z[o];
            const ln = this.lanesNow.get(host.eid[o]);
            const docks = ln ? ln.L.n : (this.tDocks[host.etype[o]]?.length ?? 2) >> 1;
            const c = Math.sqrt(dx * dx + dz * dz) / spd + ((ln ? ln.committed : 0) * this.unloadSeconds) / Math.max(1, docks);
            if (c < bc || (c === bc && host.eid[o] < host.eid[best])) {
                bc = c;
                best = o;
            }
        }
        if (best >= 0)
            this.laneOf(host, best, hR).committed++;
        return best;
    }
    /** The nearest friendly drop-off (a harvester a player drives unloads at any by position). */
    nearestDropOff(host, s) {
        let best = -1, bd = Infinity;
        for (let k = 0; k < host.nLive; k++) {
            const o = host.live[k];
            if (!this.isDrop(host, o, host.team[s]))
                continue;
            const dx = host.x[s] - host.x[o], dz = host.z[s] - host.z[o], d2 = dx * dx + dz * dz;
            if (d2 < bd || (d2 === bd && host.eid[o] < host.eid[best])) {
                bd = d2;
                best = o;
            }
        }
        return best;
    }
    /** q1: per slot lane membership for the separation exemption (called before movement). */
    lanes(host) {
        if (this.lane.length < host.alive.length) {
            this.lane = new Int32Array(host.alive.length);
            this.firm = new Uint8Array(host.alive.length);
        }
        else {
            this.lane.fill(0);
            this.firm.fill(0);
        }
        for (const h of this.harv.values()) {
            if (h.mode !== 0 || h.drop === 0)
                continue;
            const q = h.phase === exports.HV_QUEUED;
            if (!((q && h.qa === 1) || h.phase === exports.HV_DOCKING || h.phase === exports.HV_UNLOADING || h.phase === exports.HV_EXITING))
                continue;
            const s = host.idToSlot.get(h.id);
            if (s === undefined)
                continue;
            this.lane[s] = h.drop;
            if (q || (h.phase === exports.HV_UNLOADING && h.dock >= 0))
                this.firm[s] = 1;
        }
        return this.lane;
    }
    /** q1: queue place distances (from the lane origin) for every queued harvester, after giving free docks to the heads. */
    laneStep(host, list) {
        this.lanesNow.clear();
        this.spot.clear();
        for (const h of list) {
            if (h.mode !== 0)
                continue;
            const s = host.idToSlot.get(h.id);
            if (s === undefined || !host.alive[s] || host.hp[s] <= 0)
                continue;
            const inLane = h.phase === exports.HV_QUEUED || h.phase === exports.HV_DOCKING || h.phase === exports.HV_UNLOADING || h.phase === exports.HV_EXITING;
            if (!inLane && h.phase !== exports.HV_TO_DROPOFF)
                continue;
            const o = this.dropSlot(host, h.drop, host.team[s]);
            if (o < 0) {
                if (h.phase === exports.HV_EXITING)
                    h.phase = exports.HV_IDLE;
                else if (h.phase !== exports.HV_UNLOADING)
                    h.phase = exports.HV_TO_DROPOFF;
                if (h.phase !== exports.HV_UNLOADING)
                    h.drop = 0;
                h.dock = -1;
                continue;
            }
            const ln = this.laneOf(host, o, host.d.tRadius[host.etype[s]]);
            if (h.phase !== exports.HV_EXITING)
                ln.committed++;
            if ((h.phase === exports.HV_DOCKING || h.phase === exports.HV_UNLOADING) && h.dock >= 0) {
                if (h.dock >= ln.L.n || (ln.occ & (1 << h.dock)))
                    h.dock = -1;
                else
                    ln.occ |= 1 << h.dock;
            }
            else if (h.phase === exports.HV_QUEUED)
                ln.q.push(h);
        }
        for (const ln of [...this.lanesNow.values()].sort((a, b) => host.eid[a.o] - host.eid[b.o])) {
            // settled first in ticket order; those still driving in by how far up the lane they are (then ticket, id)
            const up = (h) => { const s = host.idToSlot.get(h.id); return (host.x[s] - ln.L.ox) * ln.L.nx + (host.z[s] - ln.L.oz) * ln.L.nz; };
            ln.q.sort((a, b) => (b.qa - a.qa) || (a.qa === 1 ? a.qt - b.qt : up(a) - up(b) || a.qt - b.qt) || a.id - b.id);
            while (ln.q.length) {
                const h = ln.q[0], s = host.idToSlot.get(h.id);
                const k = this.freeDock(ln, host.x[s], host.z[s]);
                if (k < 0)
                    break;
                ln.q.shift();
                h.phase = exports.HV_DOCKING;
                h.dock = k;
                ln.occ |= 1 << k;
            }
            for (const h of ln.q) {
                const s = host.idToSlot.get(h.id);
                this.spot.set(h.id, ln.tail + 2 * host.d.tRadius[host.etype[s]] + this.qGap);
                ln.tail += 2 * host.d.tRadius[host.etype[s]] + this.qGap;
            }
        }
    }
    /** Free dock of a lane nearest (x, z) (ties lower index), -1 none. */
    freeDock(ln, x, z) {
        let best = -1, bd = Infinity;
        for (let k = 0; k < ln.L.n; k++) {
            if (ln.occ & (1 << k))
                continue;
            const dx = x - ln.L.dx[k], dz = z - ln.L.dz[k], d2 = dx * dx + dz * dz;
            if (d2 < bd) {
                bd = d2;
                best = k;
            }
        }
        return best;
    }
    inDeposit(host, s, i) {
        const dx = host.x[s] - this.dx[i], dz = host.z[s] - this.dz[i], r = this.dr[i] + host.d.tRadius[host.etype[s]];
        return dx * dx + dz * dz <= r * r;
    }
    gap(host, s, o) {
        const dx = host.x[s] - host.x[o], dz = host.z[s] - host.z[o];
        return Math.sqrt(dx * dx + dz * dz) - host.d.tRadius[host.etype[s]] - host.d.tRadius[host.etype[o]];
    }
    /** Pick the next deposit for a harvester (or go unload / idle). */
    next(host, h, s, cap) {
        const dep = h.dep >= 0 && this.remaining[h.dep] > 0 ? h.dep : this.nearestDeposit(host.x[s], host.z[s]);
        if (h.load >= cap) {
            h.phase = exports.HV_TO_DROPOFF;
            return;
        }
        if (dep >= 0) {
            h.dep = dep;
            h.phase = exports.HV_TO_DEPOSIT;
            return;
        }
        h.dep = -1;
        h.phase = h.load > 0 ? exports.HV_TO_DROPOFF : exports.HV_IDLE;
    }
    /** One tick (step phase 10). */
    step(host) {
        // storage caps, new harvesters join the loop (auto); extractors on geysers (one per geyser: the lowest entity id)
        const ng = this.ng, gSlot = this.gSlot;
        gSlot.fill(-1);
        this.gOn.fill(0);
        this.caps(host);
        for (let k = 0; k < host.nLive; k++) {
            const s = host.live[k];
            if (!host.alive[s] || host.hp[s] <= 0)
                continue;
            const t = host.etype[s];
            if (this.tCap[t] > 0) {
                if (!this.harv.has(host.eid[s]))
                    this.rec(host.eid[s]);
            }
            else if (this.tExtractor[t] && ng > 0 && !host.underConstruction(s)) {
                for (let g = 0; g < ng; g++) {
                    const dx = host.x[s] - this.gx[g], dz = host.z[s] - this.gz[g];
                    if (dx * dx + dz * dz > this.gr[g] * this.gr[g])
                        continue;
                    if (gSlot[g] < 0 || host.eid[s] < host.eid[gSlot[g]])
                        gSlot[g] = s;
                }
            }
        }
        // gas: each geyser with an extractor on a supplied point pumps its flow (doc 7), up to the team's gas cap
        for (let g = 0; g < ng; g++) {
            const s = gSlot[g];
            if (s < 0 || !host.mineSupplied(s))
                continue;
            const team = host.team[s];
            let a = this.gRate[g] * host.d.dt * (host.incomeMul ? host.incomeMul(team) : 1) * (host.fkit ? host.fkit.gasMul(team) : 1); // Frontline 4a: the gas / ore priority
            const room = this.gasCap[team] - host.gas[team];
            if (a > room)
                a = room > 0 ? room : 0;
            host.gas[team] += a;
            this.gOn[g] = 1;
        }
        if (this.harv.size === 0)
            return;
        const dt = host.d.dt, list = this.harvList();
        this.laneStep(host, list);
        for (const h of list) {
            const s = host.idToSlot.get(h.id);
            if (s === undefined || !host.alive[s] || host.hp[s] <= 0) {
                this.harv.delete(h.id);
                continue;
            }
            if (h.mode === 1)
                continue;
            const cap = this.tCap[host.etype[s]], steer = host.mineCanSteer(s), team = host.team[s];
            if (h.phase === exports.HV_IDLE) {
                this.next(host, h, s, cap);
                if (h.phase === exports.HV_IDLE)
                    continue;
            }
            if (h.phase === exports.HV_TO_DEPOSIT) {
                if (h.dep < 0 || this.remaining[h.dep] <= 0) {
                    h.dep = -1;
                    this.next(host, h, s, cap);
                    if (h.phase !== exports.HV_TO_DEPOSIT)
                        continue;
                }
                if (this.inDeposit(host, s, h.dep)) {
                    h.phase = exports.HV_LOADING;
                    if (steer)
                        host.mineStop(s);
                }
                else {
                    if (steer)
                        host.mineMove(s, this.dx[h.dep], this.dz[h.dep]);
                    continue;
                }
            }
            if (h.phase === exports.HV_LOADING) {
                const i = h.dep;
                if (i < 0 || !this.inDeposit(host, s, i)) {
                    h.phase = exports.HV_TO_DEPOSIT;
                    if (i < 0)
                        h.phase = exports.HV_IDLE;
                    continue;
                }
                let a = (cap / this.loadSeconds) * dt;
                if (a > cap - h.load)
                    a = cap - h.load;
                if (a > this.remaining[i])
                    a = this.remaining[i];
                h.load += a;
                this.remaining[i] -= a;
                if (this.remaining[i] <= 1e-9) {
                    this.remaining[i] = 0;
                    host.events.push(exports.EV_DEPOSIT_EXHAUSTED, host.tick, 255, i, 0, -1, 0, 0, 0, 0);
                }
                if (h.load >= cap - 1e-9) {
                    h.load = cap;
                    h.phase = exports.HV_TO_DROPOFF;
                }
                else if (this.remaining[i] <= 0) {
                    h.dep = -1;
                    const o = this.nearestDeposit(host.x[s], host.z[s]);
                    if (o >= 0) {
                        h.dep = o;
                        h.phase = exports.HV_TO_DEPOSIT;
                    }
                    else
                        h.phase = h.load > 0 ? exports.HV_TO_DROPOFF : exports.HV_IDLE;
                }
                if (h.phase !== exports.HV_TO_DROPOFF)
                    continue;
            }
            if (h.phase === exports.HV_TO_DROPOFF || h.phase === exports.HV_WAITING) {
                if (!steer) {
                    // a player drives it: unloads by position at the nearest drop-off (no dock, no queue)
                    const o = this.nearestDropOff(host, s);
                    if (o < 0) {
                        h.phase = exports.HV_WAITING;
                        h.drop = 0;
                        continue;
                    }
                    h.phase = exports.HV_TO_DROPOFF;
                    if (this.gap(host, s, o) > this.reach) {
                        h.drop = host.eid[o];
                        continue;
                    }
                    h.drop = host.eid[o];
                    h.dock = -1;
                    h.phase = exports.HV_UNLOADING;
                }
                else {
                    let o = this.dropSlot(host, h.drop, team);
                    if (o < 0) {
                        o = this.chooseDropOff(host, s);
                        h.drop = o < 0 ? 0 : host.eid[o];
                        h.dock = -1;
                    }
                    if (o < 0) {
                        if (h.phase !== exports.HV_WAITING)
                            host.mineStop(s);
                        h.phase = exports.HV_WAITING;
                        continue;
                    }
                    h.phase = exports.HV_TO_DROPOFF;
                    const hR = host.d.tRadius[host.etype[s]], ln = this.laneOf(host, o, hR), L = ln.L;
                    const k = ln.q.length === 0 ? this.freeDock(ln, host.x[s], host.z[s]) : -1;
                    let tx, tz;
                    if (k >= 0) {
                        tx = L.dx[k];
                        tz = L.dz[k];
                    }
                    else {
                        const D = ln.tail + 2 * hR + this.qGap;
                        tx = L.ox + L.nx * D;
                        tz = L.oz + L.nz * D;
                    }
                    const dx = tx - host.x[s], dz = tz - host.z[s];
                    if (dx * dx + dz * dz <= this.qJoin * this.qJoin) {
                        if (k >= 0) {
                            h.phase = exports.HV_DOCKING;
                            h.dock = k;
                            ln.occ |= 1 << k;
                        }
                        else {
                            // ticket: the tick it joined, then (same tick) nearer the docks first, so joiners do not cross each other
                            const ox = host.x[s] - L.ox, oz = host.z[s] - L.oz;
                            h.phase = exports.HV_QUEUED;
                            h.qt = host.tick * 1024 + Math.min(1023, Math.floor(Math.sqrt(ox * ox + oz * oz)));
                            ln.q.push(h);
                            ln.tail += 2 * hR + this.qGap;
                            this.spot.set(h.id, ln.tail);
                        }
                    }
                    host.mineMove(s, tx, tz);
                    continue;
                }
            }
            if (h.phase === exports.HV_QUEUED) {
                const o = this.dropSlot(host, h.drop, team), D = this.spot.get(h.id);
                if (!steer || o < 0 || D === undefined) {
                    this.leaveLane(h);
                    continue;
                }
                const hR = host.d.tRadius[host.etype[s]], L = this.laneOf(host, o, hR).L;
                let tx = L.ox + L.nx * D, tz = L.oz + L.nz * D;
                const dx = tx - host.x[s], dz = tz - host.z[s];
                if (dx * dx + dz * dz <= this.qArrive * this.qArrive) {
                    h.qa = 1;
                    host.mineStop(s);
                    if (host.mineFace)
                        host.mineFace(s, -L.nx, -L.nz);
                } // waits on its place, facing the docks
                else {
                    // not on the lane axis yet and not behind its place: come in from behind, along the lane (no cutting across)
                    const rx = host.x[s] - L.ox, rz = host.z[s] - L.oz, along = rx * L.nx + rz * L.nz, side = Math.abs(rx * L.nz - rz * L.nx);
                    if (h.qa === 0 && side > hR && along < D + 2 * hR + this.qGap) {
                        tx += L.nx * (2 * hR + this.qGap);
                        tz += L.nz * (2 * hR + this.qGap);
                    }
                    host.mineMove(s, tx, tz);
                }
                continue;
            }
            if (h.phase === exports.HV_DOCKING) {
                const o = this.dropSlot(host, h.drop, team);
                if (!steer || o < 0 || h.dock < 0) {
                    this.leaveLane(h);
                    continue;
                }
                const L = this.laneOf(host, o, host.d.tRadius[host.etype[s]]).L, tx = L.dx[h.dock], tz = L.dz[h.dock];
                const dx = tx - host.x[s], dz = tz - host.z[s];
                if (dx * dx + dz * dz <= this.qArrive * this.qArrive && this.gap(host, s, o) <= this.reach) {
                    h.phase = exports.HV_UNLOADING;
                    host.mineStop(s);
                }
                else {
                    host.mineMove(s, tx, tz);
                    continue;
                }
            }
            if (h.phase === exports.HV_UNLOADING) {
                const o = host.idToSlot.get(h.drop);
                if (o === undefined || !host.alive[o] || host.hp[o] <= 0 || host.team[o] !== team || this.gap(host, s, o) > this.reach) {
                    h.phase = exports.HV_TO_DROPOFF;
                    h.dock = -1;
                    if (o === undefined || !host.alive[o] || host.hp[o] <= 0 || host.team[o] !== team)
                        h.drop = 0;
                    continue;
                }
                if (steer && h.dock >= 0 && host.mineFace)
                    host.mineFace(s, host.x[o] - host.x[s], host.z[o] - host.z[s]);
                let a = (cap / this.unloadSeconds) * dt;
                if (a > h.load)
                    a = h.load;
                const mul = host.incomeMul ? host.incomeMul(team) : 1; // w2b: the load leaves the harvester as is; the stockpile gains x mul
                const room = (this.oreCap[team] - host.ore[team]) / mul;
                if (a > room)
                    a = room > 0 ? room : 0;
                h.load -= a;
                h.dlv += a;
                host.ore[team] += a * mul;
                if (h.load <= 1e-9) {
                    h.load = 0;
                    host.events.push(exports.EV_HARVEST_DELIVERED, host.tick, team, h.id, h.drop, h.dep, 0, h.dlv, 0, 0);
                    h.dlv = 0;
                    if (steer && h.dock >= 0) {
                        // q1: leave sideways along the face, on the dock's side of the lane (a centred dock: toward the deposit)
                        const L = this.laneOf(host, o, host.d.tRadius[host.etype[s]]).L, k = h.dock, tX = -L.nz, tZ = L.nx;
                        let side = L.ux[k] * tX + L.uz[k] * tZ;
                        if (Math.abs(side) < 0.1) {
                            const dp = h.dep >= 0 ? h.dep : this.nearestDeposit(host.x[s], host.z[s]);
                            side = dp >= 0 ? (this.dx[dp] - host.x[o]) * tX + (this.dz[dp] - host.z[o]) * tZ : 1;
                        }
                        const sg = side < 0 ? -1 : 1;
                        h.ex = L.dx[k] + tX * sg * this.qExit + L.nx * this.reach * 0.5;
                        h.ez = L.dz[k] + tZ * sg * this.qExit + L.nz * this.reach * 0.5;
                        h.exT = host.tick + Math.round(this.qExitSeconds / dt);
                        h.phase = exports.HV_EXITING;
                        h.dock = -1;
                        host.mineMove(s, h.ex, h.ez);
                    }
                    else {
                        h.dock = -1;
                        h.drop = 0;
                        this.next(host, h, s, cap);
                    }
                }
                continue;
            }
            if (h.phase === exports.HV_EXITING) {
                const dx = h.ex - host.x[s], dz = h.ez - host.z[s];
                if (!steer || host.tick >= h.exT || dx * dx + dz * dz <= this.qArrive * this.qArrive) {
                    h.drop = 0;
                    this.next(host, h, s, cap);
                }
                else
                    host.mineMove(s, h.ex, h.ez);
            }
        }
    }
    /** State export (state.ts), after the strategic points section. */
    exportTo(w) {
        w.u32(this.nd);
        w.typed(this.remaining, this.nd);
        const hl = this.harvList();
        w.u32(hl.length);
        for (const h of hl) {
            w.i32(h.id);
            w.u8(h.mode);
            w.u8(h.phase);
            w.i32(h.dep);
            w.f64(h.load);
            w.i32(h.drop);
            w.f64(h.dlv);
            w.i32(h.dock);
            w.i32(h.qt);
            w.u8(h.qa);
            w.f64(h.ex);
            w.f64(h.ez);
            w.i32(h.exT);
        }
    }
    restoreFrom(r) {
        if (r.u32() !== this.nd)
            throw new Error("bad state: deposit count");
        this.remaining.set(r.f64s(this.nd));
        this.harv.clear();
        for (let i = 0, n = r.u32(); i < n; i++) {
            const id = r.i32(), mode = r.u8(), phase = r.u8(), dep = r.i32(), load = r.f64(), drop = r.i32(), dlv = r.f64();
            const dock = r.i32(), qt = r.i32(), qa = r.u8(), ex = r.f64(), ez = r.f64(), exT = r.i32(); // q1 (state v34)
            this.harv.set(id, { id, mode, phase, dep, load, drop, dlv, dock, qt, qa, ex, ez, exT });
        }
    }
    /** Feeds every state field to the state hash. */
    hash(word, num, str) {
        str(this.defHash);
        word(this.nd);
        for (let i = 0; i < this.nd; i++)
            num(this.remaining[i]);
        const hl = this.harvList();
        word(hl.length);
        for (const h of hl) {
            word(h.id);
            word(h.mode);
            word(h.phase);
            word(h.dep);
            num(h.load);
            word(h.drop);
            num(h.dlv);
            word(h.dock);
            word(h.qt);
            word(h.qa);
            num(h.ex);
            num(h.ez);
            word(h.exT);
        }
    }
}
exports.Mining = Mining;
