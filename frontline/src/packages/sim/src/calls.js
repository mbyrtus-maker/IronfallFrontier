"use strict";
// Support calls (stage 2 s10; design doc 15): personal, cooldown-based call-ins. A player pilot marks a target with a
// beacon (thrown on foot, designator from a vehicle); after the call's delay the effect lands at the beacon; then the
// call goes on cooldown for that pilot only.
//
// Rules (data/support-calls.json): per call delaySeconds, cooldownSeconds, requires (building ids: the team must hold a
// live one standing on a supplied point; "atmosphere" for air calls), params. Calls cost nothing from the shared wallet
// (costsSharedWallet false), full friendly fire (fullFriendlyFire). Sim values: sim.defaultLoadout, sim.throwRangeMetres,
// sim.designatorRangeMetres.
//
// Implemented effects (CALL_FX_*; s10 the strike, s11 the rest): see the per-call notes at FX_BY_ID. A call whose
// effect is not built is refused with "notImplemented".
//
// State (created on the first call input or loadout change, so a sim that never calls hashes as before): per caller
// (player pilot id) the loadout (if changed from the default) and the tick each call is ready again; the beacon list.
// Cooldown starts at impact; while a beacon of the call is pending the call is "callInProgress".
//
// Beacons are public (doc 15: "shows a coloured light pillar"): every viewer gets them in the snapshot and the
// CALL_QUEUED / CALL_IMPACT events. A beacon dropped on a pending beacon of the same call of the same team (within the
// call's radius) merges with it (beaconsMerge, doc 15 "two pilots can stack a strike"): it takes that beacon's position
// and impact tick; both effects land.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Calls = exports.TB_ROLL = exports.TB_FLY = exports.CF_THROWN = exports.CF_MERGED = exports.CEF_TEAM = exports.CE_FIRE = exports.CE_STICK = exports.CE_BOUNCE = exports.CE_THROW = exports.CE_PICKUP = exports.CE_MINE = exports.CE_END = exports.CE_START = exports.CE_LINE = exports.CE_SHELL = exports.CALL_FX_SUPPLY = exports.CALL_FX_REPAIR = exports.CALL_FX_POD = exports.CALL_FX_EMP = exports.CALL_FX_SHIELD = exports.CALL_FX_SMOKE = exports.CALL_FX_MINES = exports.CALL_FX_SENTRY = exports.CALL_FX_LINE = exports.CALL_FX_BARRAGE = exports.CALL_FX_SWEEP = exports.CALL_FX_DROP = exports.CALL_FX_RESUPPLY = exports.CALL_FX_STRIKE = exports.CALL_FX_NONE = void 0;
exports.compileCallRules = compileCallRules;
exports.callHash01 = callHash01;
exports.minePoint = minePoint;
const fmath_ts_1 = require("./fmath.js");
exports.CALL_FX_NONE = 0, exports.CALL_FX_STRIKE = 1, exports.CALL_FX_RESUPPLY = 2, exports.CALL_FX_DROP = 3, exports.CALL_FX_SWEEP = 4, exports.CALL_FX_BARRAGE = 5, exports.CALL_FX_LINE = 6;
/** w2a: sentry gun, minefield, smoke screen, shield bubble, EMP burst, heavy weapon pod. */
exports.CALL_FX_SENTRY = 7, exports.CALL_FX_MINES = 8, exports.CALL_FX_SMOKE = 9, exports.CALL_FX_SHIELD = 10, exports.CALL_FX_EMP = 11, exports.CALL_FX_POD = 12;
/** Ruling 121 (designer 16 Nov): repair beacon (lasting zone), supply drop (instant ore / gas). The recon drone is a sweep. */
exports.CALL_FX_REPAIR = 13, exports.CALL_FX_SUPPLY = 14;
/** Designer 21 Nov: Repair & Resupply: a station building (params.building) that repairs and refills around it for params.durationSeconds. */
exports.CALL_FX_DEPOT = 15;
/** CALL_EFFECT sub-kinds (event flags & 15). */
exports.CE_SHELL = 0, exports.CE_LINE = 1;
/** w2a CALL_EFFECT sub-kinds: a lasting effect started (d: sentry entity id / mines laid / entities disabled), ended,
 *  a mine went off (d mine index, flags & 16 it hit something), a weapon pod was picked up (d pilot id). */
exports.CE_START = 2, exports.CE_END = 3, exports.CE_MINE = 4, exports.CE_PICKUP = 5;
/** Ruling 128 CALL_EFFECT sub-kinds of a thrown beacon (a = its id; every viewer): thrown (v1 / v2 the hand), bounced (d bounce
 *  number), stuck to an entity (d entity id). Settling sends CALL_QUEUED as before. */
exports.CE_THROW = 6, exports.CE_BOUNCE = 7, exports.CE_STICK = 8;
/** Ruling 129 CALL_EFFECT sub-kind: a beacon fired from a vehicle (a = its id, b pilot, d vehicle id, v1 / v2 the launch point). */
exports.CE_FIRE = 9;
/** CALL_EFFECT flags: only the caller's team sees it. */
exports.CEF_TEAM = 128;
/**
 * Effect of each call id. precision-strike: one shell, params.damage of params.damageType to everything whose hit sphere
 * reaches within params.radius, both sides. resupply-pod: at impact the params.pilotsResupplied friendly pilots nearest
 * the pod within the crew refill radius (constants pilot energy refillRadiusMetres) get full energy and full free
 * jetpack burn (the sim has no ammunition or charges; ruling 17: the pod refills energy). scout-drop / vehicle-drop:
 * one empty vehicle (params.deliversUnit; vehicle-drop: sim.vehicleDropUnit, ruling 18's reserve not being in the sim)
 * lands at the beacon for the caller's team, counted against the unit caps like produced units (S14: no Command Points)
 * (refused "callOverBudget" when it would not fit; at impact it is checked again). sensor-sweep: every entity of another
 * team within params.radius at impact is detected by the caller's team for params.durationSeconds (Sim.callReveal: the
 * one place a call writes detection). barrage: from impact, params.shellsPerSecond shells for params.durationSeconds, each
 * at a deterministic spot in the params.radius disk (hash of beacon id and shell index), params.shellDamage within
 * params.shellSplashRadius, both sides (CALL_EFFECT CE_SHELL per shell). strafing-run / bomb-run: at impact
 * params.rounds / params.bombs hits evenly spaced along a params.lineLength line from the beacon forward along the throw
 * direction, each params.roundDamage / params.bombDamage within sim.strafeRoundRadiusMetres / sim.bombSplashRadiusMetres,
 * both sides; the count scales with constants.atmosphereRules[planet].aircraftPayloadMultiplier (airCallsUseAircraftPayload).
 * Air calls: usesBeforeRearm uses, then the cooldown (the rearm); refused "callBlocked" when the beacon is within the
 * anti-air range of a live enemy blockedBy.air building (Missile Battery).
 */
const FX_BY_ID = { "precision-strike": exports.CALL_FX_STRIKE, "resupply-pod": exports.CALL_FX_RESUPPLY, "scout-drop": exports.CALL_FX_DROP, "vehicle-drop": exports.CALL_FX_DROP,
    "sensor-sweep": exports.CALL_FX_SWEEP, "barrage": exports.CALL_FX_BARRAGE,
    "strafing-run": exports.CALL_FX_LINE, "bomb-run": exports.CALL_FX_LINE,
    "sentry-gun": exports.CALL_FX_SENTRY, "minefield": exports.CALL_FX_MINES, "smoke-screen": exports.CALL_FX_SMOKE, "shield-bubble": exports.CALL_FX_SHIELD,
    "emp-burst": exports.CALL_FX_EMP, "heavy-weapon-pod": exports.CALL_FX_POD,
    "recon-drone": exports.CALL_FX_SWEEP, "supply-drop": exports.CALL_FX_SUPPLY, // ruling 121
    "repair-resupply": exports.CALL_FX_DEPOT, // designer 21 Nov
    "flak-turret": exports.CALL_FX_DEPOT, // designer 21 Nov: a station body with its own guns (anti-air)
    "rocket-tube-drop": exports.CALL_FX_POD, // ruling 133: the fixed anti-armour slot (a one-weapon pod)
    // Frontline: vehicle drops, the slot 3 weapon pod, reinforcements flown in by Mule (fkit.ts)
    "tank-drop": exports.CALL_FX_DROP, "gunship-drop": exports.CALL_FX_DROP, "mech-drop": exports.CALL_FX_DROP, "slot3-drop": exports.CALL_FX_POD,
    "reinforcements": 15 };
/** CALL_QUEUED / CALL_IMPACT flags. */
exports.CF_MERGED = 1;
/** Ruling 128: the beacon was thrown (ACT_THROW_CALL) and settled; it carries a height and may ride an entity (Beacon.att). */
exports.CF_THROWN = 2;
/** Ruling 128: thrown beacon states (Thrown.st). */
exports.TB_FLY = 0, exports.TB_ROLL = 1;
const num = (v) => (typeof v === "number" ? v : 0);
/** Compiles the support-call rules from data (null when the data has no supportCalls). typeIds: compiled type ids. */
function compileCallRules(data, typeIds, tickRate, planetId, frontline = false) {
    const sc = data.supportCalls;
    if (!sc || !Array.isArray(sc.calls))
        return null;
    const ids = sc.calls.map((c) => c.id);
    const raw = data;
    const calls = sc.calls.map((c0) => {
        // designer 22 Nov: a call's frontline block (requires, timings, params) overrides it in a Frontline match
        const c = frontline && c0.frontline ? { ...c0, ...c0.frontline, params: { ...(c0.params ?? {}), ...(c0.frontline.params ?? {}) } } : c0;
        const p = c.params ?? {};
        let fx = FX_BY_ID[c.id] ?? (p.deliversUnit ? exports.CALL_FX_DROP : exports.CALL_FX_NONE); // (designer 22 Nov: any call that delivers a unit is a vehicle drop)
        if (fx === exports.CALL_FX_STRIKE && !(typeof p.damage === "number" && typeof p.radius === "number"))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_DROP && typeIds.indexOf(p.deliversUnit ?? (c.id === "vehicle-drop" ? sc.sim?.vehicleDropUnit ?? "lancer" : "")) < 0)
            fx = exports.CALL_FX_NONE;
        const wIdx = (id) => (raw.weapons ?? []).findIndex((w) => w.id === id);
        const prof = typeIds.indexOf(sc.sim?.sentryProfile ?? ""), sw = wIdx(p.weapon);
        const choices = Array.isArray(p.weaponChoices) ? p.weaponChoices.map(wIdx).filter((i) => i >= 0) : [];
        const trig = num(sc.sim?.mineTriggerRadiusMetres), width = num(sc.sim?.smokeWidthMetres);
        if (fx === exports.CALL_FX_SENTRY && (prof < 0 || sw < 0 || !(num(p.hp) > 0) || !(num(p.durationSeconds) > 0)))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_DEPOT && !(typeIds.indexOf(p.building ?? "") >= 0 && num(p.hp) > 0 && num(p.durationSeconds) > 0))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_MINES && !(trig > 0 && num(p.mines) > 0))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_SMOKE && !(width > 0 && num(p.lineLength) > 0))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_REPAIR && !(num(p.repairPerSecond) > 0 && num(p.radius) > 0 && num(p.durationSeconds) > 0))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_SUPPLY && !(num(p.radius) > 0))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_SWEEP && !(num(p.radius) > 0))
            fx = exports.CALL_FX_NONE;
        if (fx === exports.CALL_FX_POD && (choices.length === 0 || !(num(sc.sim?.weaponPodLifetimeSeconds) > 0) || !(num(sc.sim?.weaponPodPickupRadiusMetres) > 0)))
            fx = exports.CALL_FX_NONE;
        const req = [];
        let atm = false;
        for (const r of c.requires ?? []) {
            if (r === "atmosphere")
                atm = true;
            else {
                const t = typeIds.indexOf(r);
                if (t >= 0)
                    req.push(t);
            }
        }
        return { id: c.id, category: c.category, delayTicks: Math.round(c.delaySeconds * tickRate), cooldownTicks: Math.round(c.cooldownSeconds * tickRate),
            reqTypes: req, needsAtmosphere: atm, fx, radius: typeof p.radius === "number" ? p.radius : 0, damage: num(p.damage ?? p.shellDamage ?? p.roundDamage ?? p.bombDamage ?? p.mineDamage), damageType: p.damageType ?? "explosive",
            count: num(p.pilotsResupplied ?? p.rounds ?? p.bombs ?? p.mines),
            durTicks: Math.round(num(p.durationSeconds) * tickRate),
            splash: num(p.shellSplashRadius ?? (p.rounds !== undefined ? sc.sim?.strafeRoundRadiusMetres : p.bombs !== undefined ? sc.sim?.bombSplashRadiusMetres : undefined)),
            rate: num(p.shellsPerSecond), lineLength: num(p.lineLength), uses: num(c.usesBeforeRearm),
            unitType: typeIds.indexOf(p.deliversUnit ?? (c.id === "vehicle-drop" ? sc.sim?.vehicleDropUnit ?? "lancer" : "")),
            fromReserve: num(p.vehiclesFromReserve),
            weapon: sw, weapon2: wIdx(p.rocketWeapon), deployTicks: Math.round(num(p.deploySeconds) * tickRate), hp: num(p.hp), profile: fx === exports.CALL_FX_DEPOT ? typeIds.indexOf(p.building) : fx === exports.CALL_FX_SHIELD ? typeIds.indexOf(p.projector ?? "") : prof, choices, trigger: trig, infantry: p.triggeredBy === "all", width,
            repair: num(p.repairPerSecond) / tickRate, ore: num(p.ore), gas: num(p.gas), hullRepair: num(p.hullRepairFraction), mannable: p.mannable === true };
    });
    const sim = sc.sim ?? {};
    const fx0 = sim.fixedCalls ?? [];
    const dl = (sim.defaultLoadout ?? []).filter((id) => !fx0.includes(id)).map((id) => ids.indexOf(id)).filter((i) => i >= 0);
    const atm = (raw.planets ?? []).find((p) => p.id === planetId)?.atmosphere;
    const pm = raw.constants?.atmosphereRules?.[atm]?.aircraftPayloadMultiplier;
    const airPayload = sc.airCallsUseAircraftPayload === true && typeof pm === "number" ? pm : 1;
    const aaId = sc.blockedBy?.air, aaB = (raw.buildings ?? []).find((b) => b.id === aaId);
    let aaRange = 0;
    for (const wid of aaB?.weapons ?? []) {
        const w = (raw.weapons ?? []).find((x) => x.id === wid);
        if (w && w.canHitAir !== false && w.range > aaRange)
            aaRange = w.range;
    }
    const bt = sim.beaconThrow, n0 = (v, d) => (typeof v === "number" ? v : d);
    const throwing = bt && num(bt.speedMetresPerSecond) > 0 ? { speed: bt.speedMetresPerSecond, inherit: n0(bt.inheritVelocity, 0.5), rest: n0(bt.restitution, 0.3),
        fric: n0(bt.impactFriction, 0.55), roll: n0(bt.rollDecelMetresPerSecond2, 6), bounceMin: n0(bt.bounceMinMetresPerSecond, 2), maxBounces: n0(bt.maxBounces, 2),
        maxTicks: Math.max(1, Math.round(n0(bt.maxSeconds, 8) * tickRate)), radius: n0(bt.radiusMetres, 0.12), hand: n0(bt.handHeightMetres, 1.45) } : null;
    const fixed = (sim.fixedCalls ?? []).map((id) => ids.indexOf(id)).filter((i) => i >= 0);
    return { throwing, fixed, calls, ids, loadoutSize: sc.loadoutSize ?? 3, defaultLoadout: dl, throwRange: sim.throwRangeMetres ?? 40, designatorRange: sim.designatorRangeMetres ?? 300, merge: sc.beaconsMerge === true,
        airPayload, aaType: aaId ? typeIds.indexOf(aaId) : -1, aaRange,
        podTicks: Math.round(num(sim.weaponPodLifetimeSeconds) * tickRate), podRadius: num(sim.weaponPodPickupRadiusMetres),
        startSlots: typeof sc.startingLoadoutSlots === "number" ? sc.startingLoadoutSlots : sc.loadoutSize ?? 3 };
}
/** Deterministic value in [0, 1) from two integers (barrage shell spots). */
function callHash01(a, b) {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    h = Math.imul(h, 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
}
/**
 * w2a: position of mine k of the minefield with mine key `key` centred at (cx, cz) with radius r (clamped to
 * [0, mapSize]): a deterministic spot (callHash01). QA1 bug 2: the key is drawn from the sim's seeded PRNG when the
 * field is laid (Sim.mineKey), never the public beacon id; snapshots give it only to the laying team (in the zone's
 * beacon field), so the client draws its own team's mines with this and an enemy cannot compute them.
 */
function minePoint(key, k, cx, cz, r, mapSize, out) {
    const rr = r * Math.sqrt(callHash01(key, 2 * k)), a = 2 * Math.PI * callHash01(key, 2 * k + 1);
    const x = cx + rr * (0, fmath_ts_1.dcos)(a), z = cz + rr * (0, fmath_ts_1.dsin)(a);
    out[0] = x < 0 ? 0 : x > mapSize ? mapSize : x;
    out[1] = z < 0 ? 0 : z > mapSize ? mapSize : z;
}
/** Mutable call state (hashed and exported when present). */
class Calls {
    rules;
    callers = new Map(); // ascending pilot id (kept sorted)
    beacons = []; // ascending id
    effects = []; // in creation order
    /** Ruling 128: thrown beacons not yet settled (ascending id; ids from nextBeacon, kept when it settles). */
    thrown = [];
    nextBeacon = 1;
    constructor(rules) { this.rules = rules; }
    caller(id) {
        let c = this.callers.get(id);
        if (!c) {
            c = { loadout: null, ready: new Int32Array(this.rules.calls.length), uses: new Int32Array(this.rules.calls.length), heavy: -1, slots: -1 };
            this.callers.set(id, c);
            const keys = Array.from(this.callers.keys());
            if (keys.some((k, i) => i > 0 && k < keys[i - 1])) {
                const m = new Map();
                for (const k of keys.sort((a, b) => a - b))
                    m.set(k, this.callers.get(k));
                this.callers = m;
            }
        }
        return c;
    }
    inProgress(caller, call) {
        for (const b of this.beacons)
            if (b.caller === caller && b.call === call)
                return true;
        for (const t of this.thrown)
            if (t.caller === caller && t.call === call)
                return true;
        return false;
    }
    hash(word, num) {
        word(0x5ca11);
        word(this.nextBeacon);
        word(this.callers.size);
        for (const [id, c] of this.callers) {
            word(id);
            const l = c.loadout;
            word(l ? l.length : -1);
            if (l)
                for (const v of l)
                    word(v);
            for (let i = 0; i < c.ready.length; i++)
                word(c.ready[i]);
            for (let i = 0; i < c.uses.length; i++)
                word(c.uses[i]);
            word(c.heavy);
            word(c.slots);
        }
        word(this.beacons.length);
        for (const b of this.beacons) {
            word(b.id);
            word(b.call);
            word(b.team);
            word(b.caller);
            num(b.x);
            num(b.z);
            word(b.queuedTick);
            word(b.impactTick);
            word(b.flags);
            num(b.dx);
            num(b.dz);
            word(b.opt);
            if (b.flags & exports.CF_THROWN) {
                num(b.y);
                word(b.att);
                num(b.ox);
                num(b.oy);
                num(b.oz);
            }
        }
        if (this.thrown.length) {
            word(0x7b0);
            word(this.thrown.length);
            for (const t of this.thrown) {
                word(t.id);
                word(t.call);
                word(t.team);
                word(t.caller);
                word(t.opt);
                num(t.x);
                num(t.y);
                num(t.z);
                num(t.vx);
                num(t.vy);
                num(t.vz);
                num(t.dx);
                num(t.dz);
                word(t.st);
                word(t.bounces);
                word(t.born);
                word(t.src);
                word(t.fired);
            }
        }
        word(this.effects.length);
        for (const e of this.effects) {
            word(e.beacon);
            word(e.call);
            word(e.team);
            word(e.caller);
            num(e.x);
            num(e.z);
            num(e.dx);
            num(e.dz);
            word(e.start);
            word(e.end);
            word(e.n);
            word(e.ids.length);
            for (const v of e.ids)
                word(v);
        }
    }
    exportTo(w) {
        w.i32(this.nextBeacon);
        w.i32(this.callers.size);
        for (const [id, c] of this.callers) {
            w.i32(id);
            const l = c.loadout;
            w.i32(l ? l.length : -1);
            if (l)
                for (const v of l)
                    w.i32(v);
            w.i32(c.ready.length);
            for (let i = 0; i < c.ready.length; i++)
                w.i32(c.ready[i]);
            w.i32(c.uses.length);
            for (let i = 0; i < c.uses.length; i++)
                w.i32(c.uses[i]);
            w.i32(c.heavy);
            w.i32(c.slots);
        }
        w.i32(this.beacons.length);
        for (const b of this.beacons) {
            w.i32(b.id);
            w.i32(b.call);
            w.u8(b.team);
            w.i32(b.caller);
            w.f64(b.x);
            w.f64(b.z);
            w.i32(b.queuedTick);
            w.i32(b.impactTick);
            w.u8(b.flags);
            w.f64(b.dx);
            w.f64(b.dz);
            w.i32(b.opt);
            w.f64(b.y);
            w.i32(b.att);
            w.f64(b.ox);
            w.f64(b.oy);
            w.f64(b.oz);
        }
        w.i32(this.thrown.length);
        for (const t of this.thrown) {
            w.i32(t.id);
            w.i32(t.call);
            w.u8(t.team);
            w.i32(t.caller);
            w.i32(t.opt);
            w.f64(t.x);
            w.f64(t.y);
            w.f64(t.z);
            w.f64(t.vx);
            w.f64(t.vy);
            w.f64(t.vz);
            w.f64(t.dx);
            w.f64(t.dz);
            w.u8(t.st);
            w.i32(t.bounces);
            w.i32(t.born);
            w.i32(t.src);
            w.u8(t.fired);
        }
        w.i32(this.effects.length);
        for (const e of this.effects) {
            w.i32(e.beacon);
            w.i32(e.call);
            w.u8(e.team);
            w.i32(e.caller);
            w.f64(e.x);
            w.f64(e.z);
            w.f64(e.dx);
            w.f64(e.dz);
            w.i32(e.start);
            w.i32(e.end);
            w.i32(e.n);
            w.i32(e.ids.length);
            for (const v of e.ids)
                w.i32(v);
        }
    }
    restoreFrom(r) {
        this.nextBeacon = r.i32();
        this.callers = new Map();
        for (let i = 0, n = r.i32(); i < n; i++) {
            const id = r.i32(), ln = r.i32();
            let l = null;
            if (ln >= 0) {
                l = [];
                for (let k = 0; k < ln; k++)
                    l.push(r.i32());
            }
            const nr = r.i32(), ready = new Int32Array(this.rules.calls.length);
            for (let k = 0; k < nr; k++) {
                const v = r.i32();
                if (k < ready.length)
                    ready[k] = v;
            }
            const nu = r.i32(), uses = new Int32Array(this.rules.calls.length);
            for (let k = 0; k < nu; k++) {
                const v = r.i32();
                if (k < uses.length)
                    uses[k] = v;
            }
            const heavy = r.i32(), slots = r.i32();
            this.callers.set(id, { loadout: l, ready, uses, heavy, slots });
        }
        this.beacons = [];
        for (let i = 0, n = r.i32(); i < n; i++) {
            const id = r.i32(), call = r.i32(), team = r.u8(), caller = r.i32(), x = r.f64(), z = r.f64(), queuedTick = r.i32(), impactTick = r.i32(), flags = r.u8();
            const dx = r.f64(), dz = r.f64(), opt = r.i32(), y = r.f64(), att = r.i32(), ox = r.f64(), oy = r.f64(), oz = r.f64();
            this.beacons.push({ id, call, team, caller, x, z, queuedTick, impactTick, flags, dx, dz, opt, y, att, ox, oy, oz });
        }
        this.thrown = [];
        for (let i = 0, n = r.i32(); i < n; i++) {
            const id = r.i32(), call = r.i32(), team = r.u8(), caller = r.i32(), opt = r.i32(), x = r.f64(), y = r.f64(), z = r.f64(), vx = r.f64(), vy = r.f64(), vz = r.f64(), dx = r.f64(), dz = r.f64(), st = r.u8(), bounces = r.i32(), born = r.i32(), src = r.i32(), fired = r.u8();
            this.thrown.push({ id, call, team, caller, opt, x, y, z, vx, vy, vz, dx, dz, st, bounces, born, src, fired });
        }
        this.effects = [];
        for (let i = 0, n = r.i32(); i < n; i++) {
            const beacon = r.i32(), call = r.i32(), team = r.u8(), caller = r.i32(), x = r.f64(), z = r.f64(), dx = r.f64(), dz = r.f64(), start = r.i32(), end = r.i32(), k = r.i32();
            const ids = [];
            for (let j = 0, m = r.i32(); j < m; j++)
                ids.push(r.i32());
            this.effects.push({ beacon, call, team, caller, x, z, dx, dz, start, end, n: k, ids });
        }
    }
}
exports.Calls = Calls;
