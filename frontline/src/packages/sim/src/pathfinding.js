"use strict";
// Stage 2 s6: navigation grid, path search and path following for ground units.
//
// Grid. One square grid per map (constants.pathfinding.cellMetres), built once from the heightfield: each cell keeps
// a bit per movement class (armour classes infantry, bike, light, medium, heavy) set when the terrain slope at the
// cell centre is above that class's limit (terrain.json slopeLimitsDegrees; tangents from fmath dsin/dcos, compared
// squared, so only + - * / are used), and a second bit for the cells next to such a cell: straight lines keep off
// those (a hull's width of margin) and A* charges 6 extra per step on them. Aircraft and structures have no class and never path. Structures are stamped
// on top as a per-cell count (cells whose centre lies within the structure radius + structureClearanceMetres);
// sync() compares the live structures with the stamped set every tick and re-stamps on a change (a building placed by
// construction, a building destroyed). Every change bumps `ver`; QA1 bug 5: only the agents whose route crosses a cell a
// new structure blocks (or, after a removal, whose best-effort path stopped short of its goal) re-evaluate their route,
// the others are moved to the new `ver` in sync(). A search still short of its goal after pocketCheckAfterExpansions
// checks whether the goal is walled in (searchPocket) instead of expanding maxExpansionsPerSearch cells.
//
// Requests. steer() is the one hook in the movement code: given a unit's position and the goal it would drive to
// this tick, it returns the point to drive to instead. A goal in clear line of sight on the grid (sampled every half
// cell) is driven to directly: on open ground nothing changes. Otherwise the agent queues a request and keeps driving
// straight until service() answers it. service() runs once per tick before movement and spends at most
// expansionsPerTick A* node expansions (a request that starts within the budget runs to completion, at most
// maxExpansionsPerSearch, else the path goes to the explored cell nearest the goal). A* uses integer octile costs
// (10 / 14, no corner cutting) and a binary heap ordered by (f, h, cell index): the result does not depend on the
// engine. Paths are cached by (class, start cell, goal cell) until the grid changes; a cache hit is charged the
// cost of the search it replaces, so the tick a request completes never depends on what is cached (the cache is not
// part of the exported state). Paths are string-pulled (greedy line of sight) to their corner cells.
//
// Agents are keyed by entity id (units) or -(group id + 1) (a formation group's anchor, sim.formationStep). An agent
// not steered on the previous tick is dropped. Agents, the queue and the stamped structures are exported (state.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nav = exports.NAV_CLASSES = void 0;
exports.navGroupClass = navGroupClass;
exports.navClassMask = navClassMask;
exports.compileNavRules = compileNavRules;
const fmath_ts_1 = require("./fmath.js");
const data_ts_1 = require("./data.js");
exports.NAV_CLASSES = 6; // movement classes (data.ts tMove) 0..4 (the ground armour classes) and 5 (W1: walker) path; 6 (air) and 7 (structure) do not
/**
 * QA3-13: path class of a group of movement classes (bit k of `mask`: class k is in the group). One class: that class.
 * Several: NAV_CLASSES + mask, a combined class whose cells are blocked when they are blocked for ANY class in the mask
 * (slope or terrain layer), so the path is passable by every member. Fits the exported u8 agent class (at most 69).
 */
function navGroupClass(mask) {
    for (let k = 0; k < exports.NAV_CLASSES; k++)
        if (mask === 1 << k)
            return k;
    return exports.NAV_CLASSES + (mask & ((1 << exports.NAV_CLASSES) - 1));
}
/** Class bits of a path class (a single class or a navGroupClass combination). */
function navClassMask(cls) { return cls < exports.NAV_CLASSES ? 1 << cls : cls - exports.NAV_CLASSES; }
function compileNavRules(data) {
    const p = data.constants.pathfinding;
    if (!p)
        return null;
    const tan2 = new Float64Array(exports.NAV_CLASSES).fill(Infinity);
    const lim = data.terrain?.slopeLimitsDegrees;
    const names = data_ts_1.MOVE_NAMES; // W1: + walker
    if (lim)
        for (let k = 0; k < exports.NAV_CLASSES; k++) {
            const deg = lim[names[k]];
            if (typeof deg === "number" && deg > 0 && deg < 90) {
                const a = deg * Math.PI / 180, t = (0, fmath_ts_1.dsin)(a) / (0, fmath_ts_1.dcos)(a);
                tan2[k] = t * t;
            }
        }
    return {
        cell: p.cellMetres, clearance: p.structureClearanceMetres, perTick: p.expansionsPerTick, perSearch: p.maxExpansionsPerSearch,
        repathCells: p.repathCells, reach: p.waypointReachMetres, cacheMax: p.pathCacheEntries, pocket: typeof p.pocketProbeCells === "number" ? p.pocketProbeCells : 0,
        pocketAfter: typeof p.pocketCheckAfterExpansions === "number" ? p.pocketCheckAfterExpansions : 0, tan2,
    };
}
/** QA1 bug 5: pockets probed in a row before a search falls back to the capped full search (code constant: a loop bound). */
const POCKET_HOPS = 16;
/** Segment (ax, az)-(bx, bz) passes within r of (cx, cz). */
function segNear(ax, az, bx, bz, cx, cz, r) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    let t = l2 > 0 ? ((cx - ax) * dx + (cz - az) * dz) / l2 : 0;
    if (t < 0)
        t = 0;
    else if (t > 1)
        t = 1;
    const ex = ax + dx * t - cx, ez = az + dz * t - cz;
    return ex * ex + ez * ez <= r * r;
}
class Nav {
    R;
    n; // cells per side
    cell;
    slope; // bit k: too steep for class k
    near; // bit k: next to a cell too steep for class k (kept clear by straight lines, extra A* cost)
    occ; // structures covering the cell
    ver = 0;
    stamps = new Map();
    agents = new Map();
    queue = []; // [agent key, request id]
    nextReq = 1;
    /** steer() result scratch (not state). */
    out = new Float64Array(2);
    /** Work counters of the last tick: [A* expansions, searches, LOS checks] (not state). */
    work = new Int32Array(3);
    cache = new Map();
    // search scratch
    gs;
    par;
    mark;
    closed;
    stamp = 0;
    pm;
    pstamp = 0;
    pq; // pocket probe scratch
    hk = new Float64Array(1024);
    hc = new Int32Array(1024);
    hn = 0;
    constructor(R, mapSize, height) {
        this.R = R;
        this.cell = R.cell;
        this.n = Math.max(1, Math.ceil(mapSize / R.cell));
        const N = this.n * this.n;
        this.slope = new Uint8Array(N);
        this.near = new Uint8Array(N);
        this.occ = new Uint16Array(N);
        this.gs = new Int32Array(N);
        this.par = new Int32Array(N);
        this.mark = new Int32Array(N);
        this.closed = new Int32Array(N);
        this.pm = new Int32Array(N);
        this.pq = new Int32Array(Math.max(1, R.pocket) + 8);
        if (height) {
            const c = this.cell, h = c * 0.5;
            for (let j = 0; j < this.n; j++)
                for (let i = 0; i < this.n; i++) {
                    const x = (i + 0.5) * c, z = (j + 0.5) * c;
                    const gx = (height(x + h, z) - height(x - h, z)) / c, gz = (height(x, z + h) - height(x, z - h)) / c;
                    const t2 = gx * gx + gz * gz;
                    let m = 0;
                    for (let k = 0; k < exports.NAV_CLASSES; k++)
                        if (t2 > R.tan2[k])
                            m |= 1 << k;
                    this.slope[j * this.n + i] = m;
                }
            this.computeNear();
        }
    }
    computeNear() {
        const n = this.n;
        for (let j = 0; j < n; j++)
            for (let i = 0; i < n; i++) {
                let m = 0;
                for (let dj = -1; dj <= 1; dj++)
                    for (let di = -1; di <= 1; di++) {
                        const ii = i + di, jj = j + dj;
                        if (ii >= 0 && jj >= 0 && ii < n && jj < n)
                            m |= this.slope[jj * n + ii];
                    }
                this.near[j * n + i] = m & ~this.slope[j * n + i];
            }
    }
    /** Wave 2 D extra A* step cost per (cell * NAV_CLASSES + class), in tenths of the step (terrain layer slow cells); null: none. */
    tcost = null;
    /** QA3-13: a terrain layer was applied (per-class passability is then not ordered by slope limit alone; not state, static). */
    layered = false;
    /**
     * Wave 2 D (terrainlayer.ts navGrid): terrain cells impassable for a class are blocked like a too-steep slope (and get
     * the same margin); slow cells cost more in A*. Called once after construction (the layer is static).
     */
    applyTerrain(blocked, cost) {
        for (let c = 0; c < this.slope.length; c++)
            this.slope[c] |= blocked[c];
        this.layered = true;
        this.computeNear();
        let any = false;
        for (let i = 0; i < cost.length && !any; i++)
            if (cost[i] !== 0)
                any = true;
        this.tcost = any ? cost : null;
    }
    /**
     * T1 (ruling 116, relief.ts): slow climbs cost more in A*: per cell and class the relief slope speed factor of the
     * cell's steepest grade, as extra tenths of the step (round(10 / factor) - 10, at most 250), added to the terrain
     * layer's. Called once after construction (and after applyTerrain).
     */
    applySlopeCost(height, factor) {
        const n = this.n, c = this.cell, h = c * 0.5;
        const cost = this.tcost ?? new Uint8Array(n * n * exports.NAV_CLASSES);
        let any = this.tcost !== null;
        for (let j = 0; j < n; j++)
            for (let i = 0; i < n; i++) {
                const x = (i + 0.5) * c, z = (j + 0.5) * c;
                const gx = (height(x + h, z) - height(x - h, z)) / c, gz = (height(x, z + h) - height(x, z - h)) / c;
                const g = Math.sqrt(gx * gx + gz * gz), k = j * n + i;
                for (let cl = 0; cl < exports.NAV_CLASSES; cl++) {
                    const f = factor(cl, g);
                    if (!(f < 1) || !(f > 0))
                        continue;
                    const v = cost[k * exports.NAV_CLASSES + cl] + Math.round(10 / f) - 10;
                    cost[k * exports.NAV_CLASSES + cl] = v > 250 ? 250 : v;
                    any = true;
                }
            }
        this.tcost = any ? cost : null;
    }
    /** T1: may class cls step from (ox, oz) into (nx, nz)? Not from a climbable cell into a too-steep one (slope bits only, structures not counted). */
    slopeStepOk(ox, oz, nx, nz, cls) {
        const b = 1 << cls;
        return (this.slope[this.cellOf(nx, nz)] & b) === 0 || (this.slope[this.cellOf(ox, oz)] & b) !== 0;
    }
    cellOf(x, z) {
        const n = this.n;
        let i = Math.floor(x / this.cell), j = Math.floor(z / this.cell);
        if (i < 0)
            i = 0;
        else if (i >= n)
            i = n - 1;
        if (j < 0)
            j = 0;
        else if (j >= n)
            j = n - 1;
        return j * n + i;
    }
    blocked(c, cls) { return this.occ[c] > 0 || (this.slope[c] & navClassMask(cls)) !== 0; }
    /** Blocked for straight lines: also the cells next to a too-steep one (a hull's width off the slope). */
    losBlocked(c, cls) { return this.occ[c] > 0 || ((this.slope[c] | this.near[c]) & navClassMask(cls)) !== 0; }
    // ------------------------------------------------------------ structures
    /** Stamps new structures and clears destroyed ones (every tick, before orders and movement). */
    sync(h) {
        const tick = h.tick;
        let changed = false;
        const added = this.added;
        added.length = 0;
        for (let s = 0; s < h.hi; s++) {
            if (!h.alive[s] || !h.d.tStructure[h.etype[s]])
                continue;
            const id = h.eid[s];
            const st = this.stamps.get(id);
            if (st) {
                st.seen = tick;
                continue;
            }
            const ns = { x: h.x[s], z: h.z[s], r: h.d.tRadius[h.etype[s]] + this.R.clearance, seen: tick };
            if (!added.length) {
                if (!this.fresh)
                    this.fresh = new Int32Array(this.occ.length);
                this.freshStamp++;
            }
            this.stamps.set(id, ns);
            this.paint(ns, 1, this.fresh, this.freshStamp);
            changed = true;
            added.push(ns);
        }
        let removed = false;
        for (const [id, st] of this.stamps)
            if (st.seen !== tick) {
                this.paint(st, -1);
                this.stamps.delete(id);
                changed = true;
                removed = true;
            }
        if (changed) {
            const old = this.ver;
            this.ver++;
            this.cache.clear();
            // QA1 bug 5: only agents the change concerns re-evaluate (their `ver` stays old): a route (position, remaining
            // waypoints, goal) that crosses a cell a structure placed this tick blocks, or, when a structure was removed, a
            // best-effort path that stopped short of its goal (the way may be open now). Every other agent keeps its route and its place in the queue.
            // Decided here from the state alone (agents, stamps), so a restored copy decides the same.
            for (const a of this.agents.values())
                if (a.ver === old && !this.affected(a, added, removed))
                    a.ver = this.ver;
        }
        // agents not steered on the previous tick are dropped
        for (const [k, a] of this.agents)
            if (a.t < tick - 1)
                this.agents.delete(k);
    }
    added = [];
    /** Cells painted by structures added in the current sync (stamp = fresh), for affected(). Scratch, not state. */
    fresh = null;
    freshStamp = 0;
    /** Does a grid change (structures `added` this tick, `removed`: any removed) concern agent a's current route? */
    affected(a, added, removed) {
        if (a.gc < 0)
            return true;
        if (a.st === 1)
            return false; // waiting: its search runs on the grid as it is when served
        let px = a.x, pz = a.z;
        const p = a.path;
        if (a.st === 2 && p) {
            const np = p.length >> 1;
            if (removed && np > 0) {
                const ex = p[(np - 1) * 2] - a.gx, ez = p[(np - 1) * 2 + 1] - a.gz;
                if (ex * ex + ez * ez > (2 * this.cell) ** 2 && this.cellOf(p[(np - 1) * 2], p[(np - 1) * 2 + 1]) !== a.gc)
                    return true;
            }
            for (let i = a.idx; i < np; i++) {
                const qx = p[i * 2], qz = p[i * 2 + 1];
                if (this.crossesFresh(px, pz, qx, qz, added))
                    return true;
                px = qx;
                pz = qz;
            }
        }
        return this.crossesFresh(px, pz, a.gx, a.gz, added);
    }
    /** The segment passes through a cell blocked by a structure added this sync (sampled every half cell, as clear()). */
    crossesFresh(ax, az, bx, bz, added) {
        let near = false;
        for (const st of added)
            if (segNear(ax, az, bx, bz, st.x, st.z, st.r + this.cell)) {
                near = true;
                break;
            }
        if (!near)
            return false;
        const F = this.fresh, fs = this.freshStamp;
        const dx = bx - ax, dz = bz - az, len = Math.sqrt(dx * dx + dz * dz);
        const steps = Math.ceil(len / (this.cell * 0.5));
        for (let k = 0; k <= steps; k++) {
            const t = steps === 0 ? 1 : k / steps;
            if (F[this.cellOf(ax + dx * t, az + dz * t)] === fs)
                return true;
        }
        return false;
    }
    paint(st, v, fresh = null, fs = 0) {
        const c = this.cell, n = this.n, r2 = st.r * st.r;
        const i0 = Math.max(0, Math.floor((st.x - st.r) / c)), i1 = Math.min(n - 1, Math.floor((st.x + st.r) / c));
        const j0 = Math.max(0, Math.floor((st.z - st.r) / c)), j1 = Math.min(n - 1, Math.floor((st.z + st.r) / c));
        for (let j = j0; j <= j1; j++)
            for (let i = i0; i <= i1; i++) {
                const dx = (i + 0.5) * c - st.x, dz = (j + 0.5) * c - st.z;
                if (dx * dx + dz * dz <= r2) {
                    this.occ[j * n + i] += v;
                    if (fresh)
                        fresh[j * n + i] = fs;
                }
            }
    }
    // ------------------------------------------------------------ line of sight on the grid
    /**
     * Clear straight line from (ax, az) to (bx, bz) for class cls, sampled every half cell. Blocked cells within one cell of
     * the start (a unit standing in or against one) and within `slack` metres of the end (a goal on or beside an obstacle) are ignored.
     */
    clear(ax, az, bx, bz, cls, slack = 0) {
        this.work[2]++;
        const dx = bx - ax, dz = bz - az, len = Math.sqrt(dx * dx + dz * dz);
        const steps = Math.ceil(len / (this.cell * 0.5));
        let leaving = true;
        for (let k = 0; k <= steps; k++) {
            const t = steps === 0 ? 1 : k / steps, x = ax + dx * t, z = az + dz * t;
            const b = this.losBlocked(this.cellOf(x, z), cls);
            if (!b) {
                leaving = false;
                continue;
            }
            if (leaving && len * t <= this.cell)
                continue;
            leaving = false;
            if (slack > 0 && len * (1 - t) <= slack)
                return true;
            return false;
        }
        return true;
    }
    /** Distance slack for a goal on an obstacle: metres from the goal to the nearest free cell centre + one cell (0 when free). */
    goalSlack(gx, gz, cls) {
        const c = this.cellOf(gx, gz);
        if (!this.losBlocked(c, cls))
            return 0;
        const f = this.nearestFree(c, cls, true);
        if (f < 0)
            return 0;
        const fx = (f % this.n + 0.5) * this.cell - gx, fz = (Math.floor(f / this.n) + 0.5) * this.cell - gz;
        return Math.sqrt(fx * fx + fz * fz) + this.cell;
    }
    /**
     * QA1 bug 6: a goal point for class cls that lies in a cell blocked by a structure or too steep for the class moves to
     * the centre of the nearest free cell (rings, as nearestFree), in out[0..1]; returns false (out = the point) when it is
     * free or nothing free is near. Orders and formation slots go through this, so a unit never drives at a spot it cannot
     * reach and stays on its order forever.
     */
    freePoint(x, z, cls, out) {
        out[0] = x;
        out[1] = z;
        if (cls < 0 || cls >= exports.NAV_CLASSES)
            return false;
        const c = this.cellOf(x, z);
        if (!this.blocked(c, cls))
            return false;
        const f = this.nearestFree(c, cls);
        if (f < 0)
            return false;
        out[0] = (f % this.n + 0.5) * this.cell;
        out[1] = (Math.floor(f / this.n) + 0.5) * this.cell;
        return true;
    }
    /** Nearest free cell to c by rings (first in ring scan order), up to 16 rings; -1 if none. */
    nearestFree(c, cls, los = false) {
        const n = this.n, ci = c % n, cj = Math.floor(c / n);
        for (let r = 1; r <= 16; r++) {
            let best = -1, bd = Infinity;
            for (let j = cj - r; j <= cj + r; j++)
                for (let i = ci - r; i <= ci + r; i++) {
                    if (i < 0 || j < 0 || i >= n || j >= n)
                        continue;
                    if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r)
                        continue;
                    const k = j * n + i;
                    if (los ? this.losBlocked(k, cls) : this.blocked(k, cls))
                        continue;
                    const d = (i - ci) * (i - ci) + (j - cj) * (j - cj);
                    if (d < bd) {
                        bd = d;
                        best = k;
                    }
                }
            if (best >= 0)
                return best;
        }
        return -1;
    }
    // ------------------------------------------------------------ steering hook
    /**
     * The point unit / anchor `key` (class cls, at x, z) should drive to this tick on its way to (gx, gz), in out[0..1].
     * Returns true when it differs from the goal (an intermediate path waypoint).
     */
    steer(key, cls, x, z, gx, gz, tick, out) {
        out[0] = gx;
        out[1] = gz;
        const gc = this.cellOf(gx, gz);
        let a = this.agents.get(key);
        if (!a) {
            a = { cls, st: 0, gc: -1, ver: -1, t: tick, req: 0, x, z, gx, gz, idx: 0, path: null };
            this.agents.set(key, a);
        }
        a.t = tick;
        a.x = x;
        a.z = z;
        a.gx = gx;
        a.gz = gz;
        const fresh = a.cls === cls && a.ver === this.ver;
        let re = !fresh || a.gc < 0;
        if (!re && a.gc !== gc) {
            if (a.st === 0)
                re = true;
            else {
                const n = this.n, di = Math.abs((a.gc % n) - (gc % n)), dj = Math.abs(Math.floor(a.gc / n) - Math.floor(gc / n));
                if (Math.max(di, dj) > this.R.repathCells)
                    re = true;
            }
        }
        if (re) {
            a.cls = cls;
            a.ver = this.ver;
            a.gc = gc;
            a.path = null;
            a.idx = 0;
            if (this.clear(x, z, gx, gz, cls, this.goalSlack(gx, gz, cls)))
                a.st = 0;
            else {
                a.st = 1;
                a.req = this.nextReq++;
                this.queue.push([key, a.req]);
            }
        }
        if (a.st !== 2 || !a.path)
            return false;
        const p = a.path, np = p.length >> 1, r2 = this.R.reach * this.R.reach;
        while (a.idx < np) {
            const dx = p[a.idx * 2] - x, dz = p[a.idx * 2 + 1] - z;
            if (dx * dx + dz * dz > r2)
                break;
            a.idx++;
        }
        // look one waypoint (or the goal) ahead: skip the current one when the next is in clear sight
        if (a.idx < np) {
            const last = a.idx + 1 >= np;
            const nx = last ? gx : p[(a.idx + 1) * 2], nz = last ? gz : p[(a.idx + 1) * 2 + 1];
            if (this.clear(x, z, nx, nz, cls, last ? this.goalSlack(gx, gz, cls) : 0))
                a.idx++;
        }
        if (a.idx >= np)
            return false;
        out[0] = p[a.idx * 2];
        out[1] = p[a.idx * 2 + 1];
        return true;
    }
    /**
     * QA3-13: agent `key` has followed its whole path and still has no clear line to its goal (the goal cannot be reached
     * by its class: the search ended at the explored cell nearest the goal). Call after steer() on the same tick.
     */
    exhausted(key) {
        const a = this.agents.get(key);
        if (!a || a.st !== 2 || !a.path || a.idx < (a.path.length >> 1))
            return false;
        return !this.clear(a.x, a.z, a.gx, a.gz, a.cls, this.goalSlack(a.gx, a.gz, a.cls));
    }
    /** QA3-13: (x, z) is too steep or impassable terrain for class cls (structures not counted). */
    groundBlocked(x, z, cls) { return (this.slope[this.cellOf(x, z)] & navClassMask(cls)) !== 0; }
    /** The path an agent follows (remaining waypoints then the goal), or null when it drives straight. */
    route(key) {
        const a = this.agents.get(key);
        if (!a || a.st !== 2 || !a.path)
            return null;
        const out = [];
        for (let i = a.idx; i < a.path.length >> 1; i++)
            out.push([a.path[i * 2], a.path[i * 2 + 1]]);
        out.push([a.gx, a.gz]);
        return out;
    }
    // ------------------------------------------------------------ path service
    /** Answers queued requests in order until this tick's expansion budget is spent (once per tick, before movement). */
    service() {
        this.work[0] = 0;
        this.work[1] = 0;
        let budget = this.R.perTick;
        while (budget > 0 && this.queue.length) {
            const [key, req] = this.queue.shift();
            const a = this.agents.get(key);
            if (!a || a.st !== 1 || a.req !== req)
                continue;
            const sc = this.cellOf(a.x, a.z), gcell = this.cellOf(a.gx, a.gz);
            let goal = gcell;
            if (this.blocked(goal, a.cls)) {
                const f = this.nearestFree(goal, a.cls);
                if (f >= 0)
                    goal = f;
            }
            const ck = `${a.cls}:${sc}:${goal}`;
            let hit = this.cache.get(ck);
            if (!hit) {
                hit = this.searchPocket(sc, goal, a.cls);
                if (this.cache.size >= this.R.cacheMax)
                    this.cache.delete(this.cache.keys().next().value);
                this.cache.set(ck, hit);
            }
            budget -= hit.cost;
            this.work[0] += hit.cost;
            this.work[1]++;
            a.path = hit.path;
            a.idx = 0;
            a.st = 2;
        }
    }
    // Binary heap ordered by (f, h, cell index). QA1 bug 5: f and h packed into one key f * 2^24 + h (h < 2^24 on any grid
    // under 1.2 million cells a side; exact in a double), the same order with one comparison less.
    heapPush(f, h, c) {
        if (this.hn >= this.hk.length) {
            const m = this.hk.length * 2;
            const nk = new Float64Array(m);
            nk.set(this.hk);
            this.hk = nk;
            const nc = new Int32Array(m);
            nc.set(this.hc);
            this.hc = nc;
        }
        let i = this.hn++;
        const K = this.hk, C = this.hc, key = f * 16777216 + h;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (K[p] < key || (K[p] === key && C[p] < c))
                break;
            K[i] = K[p];
            C[i] = C[p];
            i = p;
        }
        K[i] = key;
        C[i] = c;
    }
    heapPop() {
        const K = this.hk, C = this.hc;
        const top = C[0];
        const n = --this.hn;
        if (n > 0) {
            const key = K[n], c = C[n];
            let i = 0;
            for (;;) {
                let l = i * 2 + 1;
                if (l >= n)
                    break;
                const r = l + 1;
                if (r < n && (K[r] < K[l] || (K[r] === K[l] && C[r] < C[l])))
                    l = r;
                if (key < K[l] || (key === K[l] && c <= C[l]))
                    break;
                K[i] = K[l];
                C[i] = C[l];
                i = l;
            }
            K[i] = key;
            C[i] = c;
        }
        return top;
    }
    octile(a, b) {
        const n = this.n, di = Math.abs((a % n) - (b % n)), dj = Math.abs(Math.floor(a / n) - Math.floor(b / n));
        return di > dj ? 10 * di + 4 * dj : 10 * dj + 4 * di;
    }
    /**
     * QA1 bug 5: A* with a pocket probe. A goal walled in by structures (or slopes) in a small region the start is not in
     * cannot be reached, and A* would expand maxExpansionsPerSearch cells to learn it. When the search has not reached
     * the goal after R.pocketAfter expansions (and has not run out of cells: the start's own region is then exhausted, the
     * full search would end the same), a flood from the goal (4-connected free cells: the same connectivity as the
     * octile steps without corner cutting) of at most R.pocket cells decides: a closed region without the start is a
     * pocket, and the search goes instead to the nearest free cell outside it (the spot by the wall, as the capped search
     * would end). Every cell probed counts as an expansion. A function of the grid only (deterministic, cacheable).
     */
    searchPocket(s, g, cls) {
        const P = this.R.pocket, A = this.R.pocketAfter;
        if (P <= 0 || A <= 0 || A >= this.R.perSearch)
            return this.search(s, g, cls);
        const first = this.search(s, g, cls, A);
        if (first.reached || first.cost < A)
            return first; // reached, or the start's own region is exhausted (as the full search would)
        // the goal's region, then the region of the nearest free cell outside it, ... until one is open (POCKET_HOPS at most)
        let spent = first.cost, goal = g, open = false;
        const st = ++this.pstamp;
        for (let hop = 0; hop < POCKET_HOPS; hop++) {
            const probe = this.probe(goal, s, cls, P, st);
            spent += probe.cells;
            if (probe.open) {
                open = true;
                break;
            }
            const out = this.outside(g, cls, st);
            if (out < 0)
                break;
            goal = out;
        }
        if (!open)
            goal = g; // no way out found: the capped search to the goal, as before
        const r = this.search(s, goal, cls);
        r.cost += spent;
        return r;
    }
    /** Flood from g over free cells (at most cap): open when it reaches `s` or the cap (not a small closed pocket). Marks pm. */
    probe(g, s, cls, cap, st) {
        const n = this.n, pm = this.pm, q = this.pq;
        let head = 0, tail = 0;
        pm[g] = st;
        q[tail++] = g;
        while (head < tail) {
            const c = q[head++];
            if (c === s)
                return { open: true, cells: head };
            if (tail >= cap)
                return { open: true, cells: head };
            const ci = c % n, cj = (c - ci) / n;
            for (let k = 0; k < 4; k++) {
                const i = ci + (k === 0 ? 1 : k === 1 ? -1 : 0), j = cj + (k === 2 ? 1 : k === 3 ? -1 : 0);
                if (i < 0 || j < 0 || i >= n || j >= n)
                    continue;
                const m = j * n + i;
                if (pm[m] === st || this.blocked(m, cls))
                    continue;
                pm[m] = st;
                q[tail++] = m;
            }
        }
        return { open: false, cells: head };
    }
    /** Nearest free cell to g (rings) outside the pockets probed with stamp st; -1 none within 64 rings. */
    outside(g, cls, st) {
        const n = this.n, ci = g % n, cj = Math.floor(g / n), pm = this.pm;
        for (let r = 1; r <= 64; r++) {
            let best = -1, bd = Infinity;
            for (let j = cj - r; j <= cj + r; j++)
                for (let i = ci - r; i <= ci + r; i++) {
                    if (i < 0 || j < 0 || i >= n || j >= n)
                        continue;
                    if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r)
                        continue;
                    const k = j * n + i;
                    if (pm[k] === st || this.blocked(k, cls))
                        continue;
                    const d = (i - ci) * (i - ci) + (j - cj) * (j - cj);
                    if (d < bd) {
                        bd = d;
                        best = k;
                    }
                }
            if (best >= 0)
                return best;
        }
        return -1;
    }
    /** A* from cell s to cell g for class cls. Returns string-pulled waypoints (cell centres) and the expansions spent. */
    search(s, g, cls, limit = this.R.perSearch) {
        const n = this.n, gs = this.gs, par = this.par, mark = this.mark, closed = this.closed;
        const st = ++this.stamp;
        this.hn = 0;
        gs[s] = 0;
        par[s] = -1;
        mark[s] = st;
        // QA1 bug 5: the same search as before with the blocked test and the octile heuristic inlined (identical results)
        const occ = this.occ, slope = this.slope, near = this.near, tc = this.tcost, bit = navClassMask(cls); // QA3-13: a combined class blocks where any member class is blocked
        const gi = g % n, gj = (g - gi) / n;
        let best = s, bh = this.octile(s, g), bg = 0, cost = 0;
        this.heapPush(bh, bh, s);
        while (this.hn > 0) {
            const c = this.heapPop();
            if (closed[c] === st)
                continue;
            closed[c] = st;
            cost++;
            const ci = c % n, cj = (c - ci) / n;
            let hx = ci - gi, hz = cj - gj;
            if (hx < 0)
                hx = -hx;
            if (hz < 0)
                hz = -hz;
            const hc = hx > hz ? 10 * hx + 4 * hz : 10 * hz + 4 * hx;
            if (hc < bh || (hc === bh && gs[c] < bg)) {
                best = c;
                bh = hc;
                bg = gs[c];
            }
            if (c === g || cost >= limit)
                break;
            const gc = gs[c];
            for (let dj = -1; dj <= 1; dj++)
                for (let di = -1; di <= 1; di++) {
                    if (di === 0 && dj === 0)
                        continue;
                    const i = ci + di, j = cj + dj;
                    if (i < 0 || j < 0 || i >= n || j >= n)
                        continue;
                    const k = j * n + i;
                    if (closed[k] === st || occ[k] > 0 || (slope[k] & bit) !== 0)
                        continue;
                    const diag = di !== 0 && dj !== 0;
                    if (diag) {
                        const a = cj * n + i, b = j * n + ci;
                        if (occ[a] > 0 || (slope[a] & bit) !== 0 || occ[b] > 0 || (slope[b] & bit) !== 0)
                            continue;
                    } // no corner cutting
                    const step = diag ? 14 : 10;
                    let tk = 0; // slow-terrain cost: the class's own, or the slowest member class of a combined class (QA3-13)
                    if (tc !== null) {
                        if (cls < exports.NAV_CLASSES)
                            tk = tc[k * exports.NAV_CLASSES + cls];
                        else
                            for (let q = 0; q < exports.NAV_CLASSES; q++)
                                if ((bit >> q) & 1 && tc[k * exports.NAV_CLASSES + q] > tk)
                                    tk = tc[k * exports.NAV_CLASSES + q];
                    }
                    const ng = gc + step + ((near[k] & bit) !== 0 ? 6 : 0) + ((step * tk) / 10 | 0);
                    if (mark[k] === st && gs[k] <= ng)
                        continue;
                    mark[k] = st;
                    gs[k] = ng;
                    par[k] = c;
                    let ex = i - gi, ez = j - gj;
                    if (ex < 0)
                        ex = -ex;
                    if (ez < 0)
                        ez = -ez;
                    const h = ex > ez ? 10 * ex + 4 * ez : 10 * ez + 4 * ex;
                    this.heapPush(ng + h, h, k);
                }
        }
        // cells from start to best, then string-pull
        const cells = [];
        for (let c = best; c !== -1; c = par[c]) {
            cells.push(c);
            if (c === s)
                break;
        }
        cells.reverse();
        const pts = [];
        const cx = (c) => (c % n + 0.5) * this.cell, cz = (c) => (Math.floor(c / n) + 0.5) * this.cell;
        let a = 0;
        while (a < cells.length - 1) {
            let b = a + 1;
            while (b + 1 < cells.length && this.clear(cx(cells[a]), cz(cells[a]), cx(cells[b + 1]), cz(cells[b + 1]), cls))
                b++;
            pts.push(cx(cells[b]), cz(cells[b]));
            a = b;
        }
        return { path: new Float64Array(pts), cost, reached: best === g };
    }
    // ------------------------------------------------------------ state
    exportTo(w) {
        w.u32(this.ver);
        w.u32(this.nextReq);
        w.u32(this.stamps.size);
        for (const [id, st] of this.stamps) {
            w.i32(id);
            w.f64(st.x);
            w.f64(st.z);
            w.f64(st.r);
            w.i32(st.seen);
        }
        w.u32(this.agents.size);
        for (const [k, a] of this.agents) {
            w.i32(k);
            w.u8(a.cls);
            w.u8(a.st);
            w.i32(a.gc);
            w.i32(a.ver);
            w.i32(a.t);
            w.u32(a.req);
            w.f64(a.x);
            w.f64(a.z);
            w.f64(a.gx);
            w.f64(a.gz);
            w.u32(a.idx);
            const p = a.path;
            w.i32(p ? p.length : -1);
            if (p)
                for (let i = 0; i < p.length; i++)
                    w.f64(p[i]);
        }
        w.u32(this.queue.length);
        for (const [k, q] of this.queue) {
            w.i32(k);
            w.u32(q);
        }
    }
    restoreFrom(r) {
        this.ver = r.u32();
        this.nextReq = r.u32();
        this.occ.fill(0);
        this.stamps.clear();
        this.agents.clear();
        this.cache.clear();
        for (let i = 0, n = r.u32(); i < n; i++) {
            const id = r.i32();
            const st = { x: r.f64(), z: r.f64(), r: r.f64(), seen: r.i32() };
            this.stamps.set(id, st);
            this.paint(st, 1);
        }
        for (let i = 0, n = r.u32(); i < n; i++) {
            const k = r.i32();
            const a = { cls: r.u8(), st: r.u8(), gc: r.i32(), ver: r.i32(), t: r.i32(), req: r.u32(), x: r.f64(), z: r.f64(), gx: r.f64(), gz: r.f64(), idx: r.u32(), path: null };
            const len = r.i32();
            if (len >= 0) {
                const p = new Float64Array(len);
                for (let j = 0; j < len; j++)
                    p[j] = r.f64();
                a.path = p;
            }
            this.agents.set(k, a);
        }
        this.queue = [];
        for (let i = 0, n = r.u32(); i < n; i++) {
            const k = r.i32();
            this.queue.push([k, r.u32()]);
        }
    }
}
exports.Nav = Nav;
