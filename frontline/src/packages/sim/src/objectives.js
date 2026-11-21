"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Objectives = exports.MATCH_REASON_NAMES = exports.MR_OBJECTIVE_FAILED = exports.MR_OBJECTIVE_DONE = exports.MR_CORE = exports.MR_NONE = exports.OBJ_STATUS_NAMES = exports.OS_FAILED = exports.OS_DONE = exports.OS_ACTIVE = exports.SIDE_TYPES = exports.PRIMARY_TYPES = exports.OBJ_TYPES = void 0;
const points_ts_1 = require("./points.js");
exports.OBJ_TYPES = ["conquest", "holdPoints", "destroyStructure", "survive", "captureExtract", "destroyAntiAir", "parTime", "keepShields", "extractionQuota", "escort", "infiltration", "holdout"];
exports.PRIMARY_TYPES = ["conquest", "holdPoints", "destroyStructure", "survive", "captureExtract", "extractionQuota", "escort", "infiltration", "holdout"];
exports.SIDE_TYPES = ["destroyAntiAir", "parTime", "keepShields"];
exports.OS_ACTIVE = 0, exports.OS_DONE = 1, exports.OS_FAILED = 2;
exports.OBJ_STATUS_NAMES = ["active", "done", "failed"];
/** MATCH_OVER reason (event c, snapshot, matchState().reason). */
exports.MR_NONE = 0, exports.MR_CORE = 1, exports.MR_OBJECTIVE_DONE = 2, exports.MR_OBJECTIVE_FAILED = 3;
exports.MATCH_REASON_NAMES = ["", "coreDestroyed", "objectiveDone", "objectiveFailed"];
class Objectives {
    list = [];
    /** Bitmask per team of map halves with air calls unlocked (1 west, 2 east). Derived from statuses (not stored). */
    tr;
    constructor(def, sim, defaultTeam) {
        const o = sim.d.raw.constants.objectives ?? {};
        this.tr = sim.d.constants.tickRate;
        const P = sim.pts;
        const add = (d, side) => {
            const ti = exports.OBJ_TYPES.indexOf(d.type);
            if (ti < 0)
                throw new Error(`objectives: unknown type ${d.type} (known: ${exports.OBJ_TYPES.join(", ")})`);
            if (side ? !exports.SIDE_TYPES.includes(d.type) : !exports.PRIMARY_TYPES.includes(d.type))
                throw new Error(`objectives: ${d.type} cannot be a ${side ? "side" : "primary"} objective`);
            const team = d.team ?? defaultTeam;
            const num = (v, path) => { if (typeof v !== "number" || !(v > 0))
                throw new Error(`objectives: ${d.type} needs ${path} (scenario or data/constants.json objectives)`); return v; };
            let goal = 0, need = 0, point = -1, qOre = 0, qGas = 0, convNeed = 0;
            const route = [];
            if (d.type === "holdPoints") {
                if (!P)
                    throw new Error("objectives: holdPoints needs a map with points");
                need = d.points ?? Math.ceil(num(d.pointFraction ?? o.conquest?.pointFraction, "pointFraction") * P.n - 1e-9);
                goal = Math.round(num(d.seconds ?? o.conquest?.holdSeconds, "seconds") * this.tr);
            }
            else if (d.type === "survive")
                goal = Math.round(num(d.seconds ?? o.survive?.seconds, "seconds") * this.tr);
            else if (d.type === "captureExtract") {
                if (!P)
                    throw new Error("objectives: captureExtract needs a map with points");
                point = P.ids.indexOf(d.point ?? "");
                if (point < 0)
                    throw new Error(`objectives: captureExtract: unknown point ${d.point}`);
                goal = Math.round(num(d.seconds ?? o.captureExtract?.seconds, "seconds") * this.tr);
            }
            else if (d.type === "parTime")
                goal = Math.round(num(d.seconds, "seconds") * this.tr);
            else if ((d.type === "destroyStructure" || d.type === "destroyAntiAir") && !d.target)
                throw new Error(`objectives: ${d.type} needs a target tag`);
            else if (d.type === "extractionQuota") {
                qOre = num(d.ore ?? o.extractionQuota?.ore, "ore");
                qGas = num(d.gas ?? o.extractionQuota?.gas, "gas");
                need = 1000;
            }
            else if (d.type === "escort") {
                if (!P)
                    throw new Error("objectives: escort needs a map with points");
                if (!d.target)
                    throw new Error("objectives: escort needs a target tag (the escorted unit)");
                const want = Math.round(num(o.escort?.points, "escort.points"));
                const ids = d.route ?? [];
                if (ids.length !== want)
                    throw new Error(`objectives: escort needs a route of ${want} point ids (constants.objectives.escort.points)`);
                for (const id of ids) {
                    const pi = P.ids.indexOf(id);
                    if (pi < 0)
                        throw new Error(`objectives: escort: unknown point ${id}`);
                    route.push(pi);
                }
                need = route.length;
            }
            else if (d.type === "infiltration")
                need = Math.round(num(d.terminals ?? o.infiltration?.terminals, "terminals"));
            else if (d.type === "holdout")
                need = Math.round(num(d.waves ?? o.holdout?.waves, "waves"));
            const half = d.half === "west" ? 1 : d.half === "east" ? 2 : 0;
            if (d.type === "escort") {
                const tags = d.convoy ?? [];
                if (tags.length < 1)
                    throw new Error("objectives: escort needs a convoy (ruling 63: Haulers led by a Forward Base Vehicle)");
                convNeed = Math.ceil(num(o.escort?.convoyArriveFraction, "escort.convoyArriveFraction") * tags.length - 1e-9);
            }
            this.list.push({ def: d, type: ti, side, team, goalTicks: goal, need, point, half, route, qOre, qGas, convoy: [], convNeed,
                failTick: d.failAfterSeconds ? Math.round(d.failAfterSeconds * this.tr) : -1,
                status: exports.OS_ACTIVE, timer: 0, value: 0, target: 0, decile: 0 });
        };
        if (!def || !def.primary)
            throw new Error("objectives: a mission needs a primary objective");
        add(def.primary, false);
        for (const s of def.side ?? [])
            add(s, true);
    }
    get primary() { return this.list[0]; }
    /** Binds spawn tags to entity ids (scenario start). Every target tag must exist. */
    bind(sim, tags) {
        for (const ob of this.list) {
            if (!ob.def.target)
                continue;
            const id = tags.get(ob.def.target);
            if (id === undefined)
                throw new Error(`objectives: no spawn tagged ${ob.def.target}`);
            ob.target = id;
            if (!ob.half) {
                const s = sim.idToSlot.get(id);
                ob.half = sim.x[s] < sim.mapSize / 2 ? 1 : 2;
            }
            if (exports.OBJ_TYPES[ob.type] === "escort") { // S15 ruling 63: the leader is a Forward Base Vehicle, the convoy Haulers
                const E = sim.d.raw.constants.objectives?.escort ?? {};
                const typeOf = (eid) => sim.d.typeIds[sim.etype[sim.idToSlot.get(eid)]];
                if (typeOf(id) !== E.leaderUnit)
                    throw new Error(`objectives: escort leader ${ob.def.target} is a ${typeOf(id)}, not a ${E.leaderUnit} (ruling 63)`);
                ob.convoy = [];
                for (const tg of ob.def.convoy ?? []) {
                    const cid = tags.get(tg);
                    if (cid === undefined)
                        throw new Error(`objectives: no spawn tagged ${tg}`);
                    if (typeOf(cid) !== E.convoyUnit)
                        throw new Error(`objectives: escort convoy ${tg} is a ${typeOf(cid)}, not a ${E.convoyUnit} (ruling 63)`);
                    ob.convoy.push(cid);
                }
            }
        }
    }
    /** Air calls unlocked for team at x (destroyAntiAir done on that half). */
    airCallsUnlocked(team, x, mapSize) {
        const h = x < mapSize / 2 ? 1 : 2;
        for (const ob of this.list)
            if (exports.OBJ_TYPES[ob.type] === "destroyAntiAir" && ob.team === team && ob.status === exports.OS_DONE && ob.half === h)
                return true;
        return false;
    }
    /**
     * One evaluation (every tickRate ticks while the match runs). Returns MR_OBJECTIVE_DONE / MR_OBJECTIVE_FAILED when
     * the primary decided the match in this call, else MR_NONE. Pushes the OBJECTIVE_* events through emit.
     */
    evaluate(sim, emit) {
        const step = this.tr, P = sim.pts;
        for (let i = 0; i < this.list.length; i++) {
            const ob = this.list[i];
            if (ob.status !== exports.OS_ACTIVE)
                continue;
            const t = exports.OBJ_TYPES[ob.type];
            let restart = false;
            switch (t) {
                case "conquest": {
                    let start = 0, left = 0;
                    for (const [ct, , , alive] of coreList(sim))
                        if (ct !== ob.team && sim.match.inMatch(ct)) {
                            start++;
                            if (alive)
                                left++;
                        }
                    ob.value = start - left;
                    ob.need = start;
                    break; // decided by the Core check (Match.judge)
                }
                case "holdPoints": {
                    let n = 0;
                    for (let p = 0; p < P.n; p++)
                        if (P.owner[p] === ob.team && (P.flags[p] & points_ts_1.PT_SUPPLIED))
                            n++;
                    ob.value = n;
                    if (n >= ob.need)
                        ob.timer += step;
                    else {
                        restart = ob.timer > 0;
                        ob.timer = 0;
                    }
                    if (ob.timer >= ob.goalTicks)
                        ob.status = exports.OS_DONE;
                    break;
                }
                case "survive":
                    ob.timer += step;
                    ob.value = Math.floor(ob.timer / this.tr);
                    if (ob.timer >= ob.goalTicks)
                        ob.status = exports.OS_DONE;
                    break;
                case "captureExtract": {
                    const own = P.owner[ob.point] === ob.team && !(P.flags[ob.point] & points_ts_1.PT_CONTESTED);
                    if (own)
                        ob.timer += step;
                    ob.value = own ? 1 : 0;
                    if (ob.timer >= ob.goalTicks)
                        ob.status = exports.OS_DONE;
                    break;
                }
                case "destroyStructure":
                case "destroyAntiAir": {
                    const s = sim.idToSlot.get(ob.target);
                    const alive = s !== undefined && sim.alive[s] && sim.hp[s] > 0;
                    ob.value = alive ? Math.ceil(sim.hp[s] + sim.shield[s]) : 0;
                    if (!alive)
                        ob.status = exports.OS_DONE;
                    break;
                }
                case "parTime":
                    ob.timer = sim.tick;
                    ob.value = Math.floor(ob.timer / this.tr);
                    if (ob.timer > ob.goalTicks)
                        ob.status = exports.OS_FAILED;
                    break;
                case "extractionQuota": { // fix-qa2 (doc 4): ore and gas shipped off-world at the Launch Pad uplink (sim.exportCargo)
                    const [eo, eg] = sim.exportedCargo(ob.team);
                    ob.value = Math.floor(1000 * Math.min(1, eo / ob.qOre) * 0.5 + 1000 * Math.min(1, eg / ob.qGas) * 0.5);
                    if (eo + 1e-9 >= ob.qOre && eg + 1e-9 >= ob.qGas) {
                        ob.value = 1000;
                        ob.status = exports.OS_DONE;
                    }
                    break;
                }
                case "escort": { // fix-qa2 (doc 4); S15 ruling 63: the Forward Base Vehicle leads its Haulers through the route's points
                    const s = sim.idToSlot.get(ob.target);
                    if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0) {
                        ob.status = exports.OS_FAILED;
                        break;
                    }
                    const live = [];
                    for (const id of ob.convoy) {
                        const cs = sim.idToSlot.get(id);
                        if (cs !== undefined && sim.alive[cs] && sim.hp[cs] > 0)
                            live.push(cs);
                    }
                    if (live.length < ob.convNeed) {
                        ob.status = exports.OS_FAILED;
                        break;
                    } // too few Haulers left to arrive
                    const leg = ob.value;
                    if (leg < ob.route.length && P.pointAt(sim.x[s], sim.z[s]) === ob.route[leg])
                        ob.value = leg + 1;
                    if (ob.value >= ob.route.length) {
                        const last = ob.route[ob.route.length - 1];
                        let arrived = 0;
                        for (const cs of live)
                            if (P.pointAt(sim.x[cs], sim.z[cs]) === last)
                                arrived++;
                        if (arrived >= ob.convNeed) {
                            ob.status = exports.OS_DONE;
                            const E = sim.d.raw.constants.objectives?.escort ?? {};
                            if (E.deployAtEnd === true)
                                sim.deployBase(ob.target, sim.team[s]); // deploys there if the point allows it (else it stays a vehicle)
                            break;
                        }
                    }
                    else if (sim.ordType[s] === 0) {
                        const q = ob.route[ob.value];
                        sim.order([ob.target], { type: "move", x: P.px[q], z: P.pz[q] }, sim.team[s]);
                    } // the leader drives on to the next point
                    // the Haulers keep a column behind the leader (a move order only when one has fallen out of its place)
                    const E2 = sim.d.raw.constants.objectives?.escort ?? {};
                    const gap = typeof E2.convoySpacingMetres === "number" ? E2.convoySpacingMetres : 15;
                    for (let k = 0; k < live.length; k++) {
                        const cs = live[k], back = (k + 1) * gap;
                        const gx = sim.x[s] - sim.dirX[s] * back, gz = sim.z[s] - sim.dirZ[s] * back;
                        const dx = sim.x[cs] - gx, dz = sim.z[cs] - gz;
                        if (dx * dx + dz * dz > gap * gap)
                            sim.order([sim.eid[cs]], { type: "move", x: gx, z: gz }, sim.team[cs]);
                    }
                    break;
                }
                case "infiltration": // fix-qa2 (doc 4): enemy terminals hacked (building and Core disables by the team's pilots)
                    ob.value = P ? P.hacksDone[ob.team] : 0;
                    if (ob.value >= ob.need)
                        ob.status = exports.OS_DONE;
                    break;
                case "holdout": { // fix-qa2 (doc 4 "survive 10 waves"): enemy Director waves sent and over (not in pressure now)
                    let n = 0;
                    const M = sim.match;
                    for (let t = 0; t < 4; t++)
                        if (t !== ob.team && M.inMatch(t))
                            n += M.dirWaves[t] - (M.dirPhase[t] === 2 ? 1 : 0); // DP_PRESSURE: that wave is still on
                    ob.value = Math.max(0, n);
                    if (ob.value >= ob.need)
                        ob.status = exports.OS_DONE;
                    break;
                }
                case "keepShields": {
                    let sh = -1;
                    for (const [ct, s, , alive] of coreList(sim))
                        if (ct === ob.team && alive)
                            sh = Math.max(sh, sim.shield[s]);
                    ob.value = Math.max(0, Math.ceil(sh));
                    if (sh <= 0)
                        ob.status = exports.OS_FAILED;
                    break;
                }
            }
            if (ob.status === exports.OS_ACTIVE && ob.failTick >= 0 && sim.tick >= ob.failTick)
                ob.status = exports.OS_FAILED;
            this.report(i, emit, restart);
        }
        const pr = this.primary;
        if (pr.status === exports.OS_DONE) {
            this.settle(exports.OS_DONE);
            this.flush(emit);
            return exports.MR_OBJECTIVE_DONE;
        }
        if (pr.status === exports.OS_FAILED) {
            this.settle(exports.OS_FAILED);
            this.flush(emit);
            return exports.MR_OBJECTIVE_FAILED;
        }
        return exports.MR_NONE;
    }
    /** The match ended by the Core check: the primary follows the winner; side objectives settle. */
    matchEnded(winner, emit) {
        const pr = this.primary;
        if (pr.status === exports.OS_ACTIVE) {
            pr.status = winner === pr.team ? exports.OS_DONE : exports.OS_FAILED;
            if (pr.status === exports.OS_DONE && exports.OBJ_TYPES[pr.type] === "conquest")
                pr.value = pr.need;
        }
        this.settle(pr.status);
        this.flush(emit);
    }
    /** Side objectives once the primary is decided. */
    settle(primary) {
        for (const ob of this.list) {
            if (!ob.side || ob.status !== exports.OS_ACTIVE)
                continue;
            const t = exports.OBJ_TYPES[ob.type];
            ob.status = primary === exports.OS_DONE && (t === "keepShields" || t === "parTime") ? exports.OS_DONE : exports.OS_FAILED;
        }
    }
    /** Emits DONE / FAILED for every settled objective not yet reported (decile 11 / 12 = reported). */
    flush(emit) { for (let i = 0; i < this.list.length; i++)
        this.report(i, emit, false); }
    report(i, emit, restart) {
        const ob = this.list[i];
        const pm = this.permille(ob);
        if (ob.status !== exports.OS_ACTIVE) {
            const mark = ob.status === exports.OS_DONE ? 11 : 12;
            if (ob.decile !== mark) {
                ob.decile = mark;
                emit(ob.status === exports.OS_DONE ? 1 : 2, i, ob.type, ob.team, pm, ob.value, this.goal(ob));
            }
            return;
        }
        const dc = Math.floor(pm / 100);
        if (dc !== ob.decile || restart) {
            ob.decile = dc;
            emit(0, i, ob.type, ob.team, pm, ob.value, this.goal(ob));
        }
    }
    goal(ob) {
        const t = exports.OBJ_TYPES[ob.type];
        return t === "conquest" || t === "holdPoints" || t === "escort" || t === "infiltration" || t === "holdout" || t === "extractionQuota" ? ob.need : ob.goalTicks > 0 ? Math.round(ob.goalTicks / this.tr) : 0;
    }
    permille(ob) {
        const t = exports.OBJ_TYPES[ob.type];
        if (ob.status === exports.OS_DONE && !ob.side)
            return 1000;
        switch (t) {
            case "conquest": return ob.need > 0 ? Math.floor((1000 * ob.value) / ob.need) : 0;
            case "holdPoints":
            case "survive":
            case "captureExtract":
            case "parTime": return ob.goalTicks > 0 ? Math.min(1000, Math.floor((1000 * ob.timer) / ob.goalTicks)) : 0;
            case "destroyStructure":
            case "destroyAntiAir": return ob.status === exports.OS_DONE ? 1000 : 0;
            case "extractionQuota": return Math.min(1000, ob.value);
            case "escort":
            case "infiltration":
            case "holdout": return ob.need > 0 ? Math.min(1000, Math.floor((1000 * ob.value) / ob.need)) : 0;
            default: return ob.status === exports.OS_DONE ? 1000 : 0;
        }
    }
    hash(word) { for (const ob of this.list) {
        word(ob.status);
        word(ob.timer);
        word(ob.value);
        word(ob.target);
        word(ob.decile);
        word(ob.need);
        if (ob.convoy.length) {
            word(ob.convoy.length);
            for (const id of ob.convoy)
                word(id);
        }
    } }
    exportTo(w) { for (const ob of this.list) {
        w.u8(ob.status);
        w.i32(ob.timer);
        w.i32(ob.value);
        w.i32(ob.target);
        w.u8(ob.decile);
        w.i32(ob.need);
        w.u8(ob.half);
        w.i32(ob.convoy.length);
        for (const id of ob.convoy)
            w.i32(id);
    } } // state v26: + escort convoy ids
    restoreFrom(r) { for (const ob of this.list) {
        ob.status = r.u8();
        ob.timer = r.i32();
        ob.value = r.i32();
        ob.target = r.i32();
        ob.decile = r.u8();
        ob.need = r.i32();
        ob.half = r.u8();
        ob.convoy = [];
        for (let i = 0, n = r.i32(); i < n; i++)
            ob.convoy.push(r.i32());
    } }
    view() {
        return this.list.map((ob, index) => ({ index, type: exports.OBJ_TYPES[ob.type], side: ob.side, team: ob.team, name: ob.def.name ?? exports.OBJ_TYPES[ob.type],
            status: ob.status, statusName: exports.OBJ_STATUS_NAMES[ob.status], progress: this.permille(ob) / 1000, value: ob.value, goal: this.goal(ob),
            timerSeconds: Math.floor(ob.timer / this.tr), target: ob.target }));
    }
}
exports.Objectives = Objectives;
/** Every Command Core ever in the world is not tracked; this lists the live ones and, per team, whether one stands. */
function coreList(sim) {
    const out = [];
    const tc = sim.match.coreType;
    for (let s = 0; s < sim.hi; s++)
        if (sim.alive[s] && tc[sim.etype[s]])
            out.push([sim.team[s], s, sim.eid[s], sim.hp[s] > 0]);
    // teams of the match with no Core left still count as an enemy Core destroyed (conquest progress)
    for (const t of sim.match.teams())
        if (!out.some((c) => c[0] === t))
            out.push([t, -1, 0, false]);
    return out;
}
