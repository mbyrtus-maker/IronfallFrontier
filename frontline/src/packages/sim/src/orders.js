"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orders = exports.EXT_FIELDS = exports.ORDER_KIND_NAMES = exports.OK_RETREAT = exports.OK_HOLD_FIRE = exports.OK_FOLLOW = exports.OK_ATTACK_MY_TARGET = exports.OK_DEFEND = exports.OK_GUARD = exports.OK_PICKUP = exports.OK_ATTACK = exports.OK_ATTACK_MOVE = exports.OK_MOVE = exports.OK_STOP = exports.OK_NONE = exports.FM_COLUMN = exports.FM_WEDGE = exports.FM_LINE = exports.FM_NONE = exports.FORMATIONS = void 0;
exports.orderKind = orderKind;
exports.orderRules = orderRules;
exports.formationIndex = formationIndex;
exports.formationSlots = formationSlots;
exports.jitterUnit = jitterUnit;
exports.FORMATIONS = ["none", "line", "wedge", "column"];
exports.FM_NONE = 0, exports.FM_LINE = 1, exports.FM_WEDGE = 2, exports.FM_COLUMN = 3;
/** Order kinds (ACK events, snapshot orders block). Stable: append only. */
exports.OK_NONE = 0, exports.OK_STOP = 1, exports.OK_MOVE = 2, exports.OK_ATTACK_MOVE = 3, exports.OK_ATTACK = 4, exports.OK_PICKUP = 5, exports.OK_GUARD = 6, exports.OK_DEFEND = 7, exports.OK_ATTACK_MY_TARGET = 8, exports.OK_FOLLOW = 9, exports.OK_HOLD_FIRE = 10, exports.OK_RETREAT = 11;
exports.ORDER_KIND_NAMES = ["none", "stop", "move", "attackMove", "attack", "pickup", "guard", "defend", "attackMyTarget", "follow", "holdFire", "retreat"];
/** OK_* kind of an order (ACK events). */
function orderKind(o) {
    const i = exports.ORDER_KIND_NAMES.indexOf(o.type);
    return i < 0 ? exports.OK_NONE : i;
}
function need(v, path) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
        throw new Error(`orders: data field constants.${path} missing or not a non-negative number`);
    return v;
}
/** Reads constants.orders (thrown error names the missing field). */
function orderRules(data) {
    const o = data.constants.orders ?? {};
    const f = o.formation ?? {}, g = o.guard ?? {}, dd = o.defend ?? {}, fl = o.follow ?? {};
    return {
        thinkTicks: Math.max(1, Math.round(need(o.thinkIntervalTicks, "orders.thinkIntervalTicks"))),
        spacingMul: need(f.spacingRadiusMultiple, "orders.formation.spacingRadiusMultiple"), spacingGap: need(f.spacingGapMetres, "orders.formation.spacingGapMetres"),
        jitter: need(f.infantryJitterMetres, "orders.formation.infantryJitterMetres"),
        catchUp: need(f.catchUpMultiplier, "orders.formation.catchUpMultiplier"), slotTol: need(f.slotToleranceMetres, "orders.formation.slotToleranceMetres"),
        aheadFactor: need(f.aheadSpeedFactor, "orders.formation.aheadSpeedFactor"), waitMetres: need(f.stragglerWaitMetres, "orders.formation.stragglerWaitMetres"),
        leadSeconds: need(f.slotLeadSeconds, "orders.formation.slotLeadSeconds"),
        guardStay: need(g.stayMetres, "orders.guard.stayMetres"), guardThreat: need(g.threatRadiusMetres, "orders.guard.threatRadiusMetres"), guardLeash: need(g.leashMetres, "orders.guard.leashMetres"),
        defendRadius: need(dd.radiusMetres, "orders.defend.radiusMetres"), defendLeash: need(dd.leashMetres, "orders.defend.leashMetres"),
        followDist: need(fl.distanceMetres, "orders.follow.distanceMetres"), followSlack: need(fl.slackMetres, "orders.follow.slackMetres"),
    };
}
function formationIndex(f) {
    if (f === undefined)
        return exports.FM_NONE;
    const i = exports.FORMATIONS.indexOf(f);
    if (i < 0)
        throw new Error(`unknown formation ${String(f)} (one of ${exports.FORMATIONS.join(", ")})`);
    return i;
}
/**
 * Slot offsets [right, forward] (metres, in the frame of travel) of a formation of n units, centred so that their
 * centroid is (0, 0). Slot k goes to the k-th unit in role order. back[k] = 1: unit k is artillery (rear);
 * inside[k] = 1: unit k is anti-air, placed inside the formation (ruling 22, design doc 18: "tanks in front, artillery
 * behind and anti-air inside" when the group is mixed). The other units are the outer body, tanks first.
 *   line:   outer units in the front row, anti-air in a middle row, artillery in the rear row.
 *   wedge:  the outer units form the wedge (tip, then pairs behind); anti-air fills the inside of the wedge (row r
 *           holds up to 2r - 1 places strictly between the arms, centre first); artillery in a row behind both.
 *   column: the outer units in single file with the anti-air in the middle of the file; artillery at the tail.
 * With no outer unit (an all anti-air or all artillery group) the formation is the plain one in role order.
 */
function formationSlots(form, n, spacing, back, inside) {
    const out = new Array(n);
    const outer = [], ins = [], bk = [];
    for (let k = 0; k < n; k++)
        (back && back[k] ? bk : inside && inside[k] ? ins : outer).push(k);
    if (outer.length === 0) {
        outer.push(...ins, ...bk);
        ins.length = 0;
        bk.length = 0;
        outer.sort((a, b) => a - b);
    }
    const row = (ks, z) => ks.forEach((k, i) => { out[k] = [(i - (ks.length - 1) / 2) * spacing, z]; });
    if (form === exports.FM_LINE) {
        row(outer, 0);
        if (ins.length)
            row(ins, -spacing);
        row(bk, ins.length ? -2 * spacing : -spacing);
    }
    else if (form === exports.FM_WEDGE) {
        let rows = 0;
        outer.forEach((k, i) => {
            if (i === 0) {
                out[k] = [0, 0];
                return;
            }
            const r = Math.ceil(i / 2), side = i % 2 === 1 ? -1 : 1;
            out[k] = [side * r * spacing, -r * spacing];
            rows = r;
        });
        let r = 1, c = 0;
        for (const k of ins) {
            // row r: 2r - 1 places x = 0, -1, +1, ... (r - 1) spacings, strictly inside the arms at +-r spacings
            const step = (c + 1) >> 1, side = c % 2 === 1 ? -1 : 1;
            out[k] = [side * step * spacing, -r * spacing];
            if (++c >= 2 * r - 1) {
                r++;
                c = 0;
            }
        }
        const insRows = ins.length ? (c === 0 ? r - 1 : r) : 0;
        row(bk, -(Math.max(rows, insRows) + 1) * spacing);
    }
    else if (form === exports.FM_COLUMN) {
        const h = Math.ceil(outer.length / 2);
        [...outer.slice(0, h), ...ins, ...outer.slice(h), ...bk].forEach((k, i) => { out[k] = [0, -i * spacing]; });
    }
    else {
        for (let k = 0; k < n; k++)
            out[k] = [0, 0];
    }
    let cx = 0, cz = 0;
    for (const p of out) {
        cx += p[0];
        cz += p[1];
    }
    if (n > 0) {
        cx /= n;
        cz /= n;
    }
    for (const p of out) {
        p[0] -= cx;
        p[1] -= cz;
    }
    return out;
}
/** Fixed per-entity value in [-1, 1] (integer hash; `salt` picks an independent stream). */
function jitterUnit(id, salt) {
    let h = Math.imul(id ^ Math.imul(salt, 0x27d4eb2d), 0x9e3779b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    return ((h >>> 0) / 0xffffffff) * 2 - 1;
}
exports.EXT_FIELDS = ["kind", "form", "tgt", "pilot", "x", "z", "ox", "oz", "speed", "ret", "eng"];
class Orders {
    /** Entity id -> extension record of its order (hashed, exported). */
    ext = new Map();
    /** Formation move groups by id (hashed once any was made, exported). */
    groups = new Map();
    nextGroup = 1;
    /** Entity ids with hold fire on (hashed, exported). */
    hold = new Set();
    rules0 = null;
    data;
    constructor(data) { this.data = data; }
    /** constants.orders, read on first use (fixture data without it still runs every old order). */
    get rules() { return this.rules0 ?? (this.rules0 = orderRules(this.data)); }
    cores = null;
    /** Is type index t a Command Core (a building with effects.supplySource)? Type index = units.length + building index. */
    isCore(t) {
        if (!this.cores) {
            const nu = this.data.units.length, c = new Uint8Array(nu + this.data.buildings.length);
            this.data.buildings.forEach((b, i) => { if (b.effects?.supplySource === true)
                c[nu + i] = 1; });
            this.cores = c;
        }
        return this.cores[t] === 1;
    }
    set(id, e) {
        const r = { form: 0, tgt: 0, pilot: 0, x: 0, z: 0, ox: 0, oz: 0, speed: 0, ret: 0, eng: 0, ...e };
        this.ext.set(id, r);
        return r;
    }
    hash(word, num) {
        const ids = Array.from(this.ext.keys()).sort((a, b) => a - b);
        word(ids.length);
        for (const id of ids) {
            const e = this.ext.get(id);
            word(id);
            for (const k of exports.EXT_FIELDS)
                num(e[k]);
        }
        const hs = Array.from(this.hold).sort((a, b) => a - b);
        word(hs.length);
        for (const id of hs)
            word(id);
        if (this.nextGroup > 1) { // formation groups (absent until the first formation move: the hash is unchanged)
            word(this.nextGroup);
            const gs = Array.from(this.groups.keys()).sort((a, b) => a - b);
            word(gs.length);
            for (const id of gs) {
                const g = this.groups.get(id);
                word(id);
                word(g.wps.length);
                for (const v of g.wps)
                    num(v);
                word(g.leg);
                num(g.ax);
                num(g.az);
                num(g.hx);
                num(g.hz);
                num(g.fhx);
                num(g.fhz);
                num(g.speed);
                word(g.done);
            }
        }
    }
    exportTo(w) {
        const ids = Array.from(this.ext.keys()).sort((a, b) => a - b);
        w.u32(ids.length);
        for (const id of ids) {
            const e = this.ext.get(id);
            w.i32(id);
            for (const k of exports.EXT_FIELDS)
                w.f64(e[k]);
        }
        const hs = Array.from(this.hold).sort((a, b) => a - b);
        w.u32(hs.length);
        for (const id of hs)
            w.i32(id);
        w.u32(this.nextGroup);
        const gs = Array.from(this.groups.keys()).sort((a, b) => a - b);
        w.u32(gs.length);
        for (const id of gs) {
            const g = this.groups.get(id);
            w.i32(id);
            w.u32(g.wps.length);
            for (const v of g.wps)
                w.f64(v);
            w.i32(g.leg);
            w.f64(g.ax);
            w.f64(g.az);
            w.f64(g.hx);
            w.f64(g.hz);
            w.f64(g.fhx);
            w.f64(g.fhz);
            w.f64(g.speed);
            w.i32(g.done);
        }
    }
    restoreFrom(r) {
        this.ext.clear();
        this.hold.clear();
        for (let i = 0, n = r.u32(); i < n; i++) {
            const id = r.i32(), e = {};
            for (const k of exports.EXT_FIELDS)
                e[k] = r.f64();
            this.ext.set(id, e);
        }
        for (let i = 0, n = r.u32(); i < n; i++)
            this.hold.add(r.i32());
        this.groups.clear();
        this.nextGroup = r.u32();
        for (let i = 0, n = r.u32(); i < n; i++) {
            const id = r.i32(), wps = [];
            for (let k = 0, m = r.u32(); k < m; k++)
                wps.push(r.f64());
            const leg = r.i32(), ax = r.f64(), az = r.f64(), hx = r.f64(), hz = r.f64(), fhx = r.f64(), fhz = r.f64(), speed = r.f64(), done = r.i32();
            this.groups.set(id, { id, wps, leg, ax, az, hx, hz, fhx, fhz, speed, done });
        }
    }
}
exports.Orders = Orders;
