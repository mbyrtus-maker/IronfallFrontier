"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXT_BOOST = exports.EXT_LASER = exports.EXT_GASFLOOR = exports.EXT_DOWNED = exports.EXT_AMMO = exports.S15 = exports.AM_FULL = exports.AM_DRY = void 0;
exports.ammoOnSpawn = ammoOnSpawn;
exports.ammoFull = ammoFull;
exports.ammoStep = ammoStep;
exports.ammoReturning = ammoReturning;
exports.extRecords = extRecords;
exports.extDecode = extDecode;
exports.extRemove = extRemove;
exports.ashForecast = ashForecast;
exports.ashStep = ashStep;
exports.ashCrash = ashCrash;
exports.idleActive = idleActive;
exports.idleStep = idleStep;
exports.findHelper = findHelper;
exports.reviveHelpPossible = reviveHelpPossible;
exports.aiReviveStep = aiReviveStep;
exports.helperDone = helperDone;
exports.helpBits = helpBits;
exports.domeGasFloor = domeGasFloor;
exports.setGasFloor = setGasFloor;
const data_ts_1 = require("./data.js");
const events_ts_1 = require("./events.js");
/** AMMO event phases (b). */
exports.AM_DRY = 1, exports.AM_FULL = 2;
class S15 {
    /** ruling 55: aircraft entity id -> rounds left per mount (-1: an unlimited mount). */
    ammo = new Map();
    /** ruling 55: AI aircraft that went dry and are rearming -> [tick it went dry]. */
    rearming = new Map();
    /** ruling 67: aircraft held on the ground by ash fall -> [1 if it was in the air (crash landing) else 0, 1 once the crash damage is applied]. */
    ashDown = new Map();
    /** ruling 71: aircraft falling after an EMP burst hit them in flight -> [vertical speed m/s]. */
    empFall = new Map();
    /** ruling 73: player pilot id -> [tick of its last active control input (or of its body appearing), body entity id]. */
    idle = new Map();
    /** rulings 79 / 88: downed player pilot id -> [AI helper entity id (0 none), tick its revive hold started (-1 not yet)]. */
    helper = new Map();
    /** ruling 86: team -> [the Shield Projector gas floor its player set] (absent: the data's effects.domeGasFloor). */
    gasFloor = new Map();
    maps() { return [this.ammo, this.rearming, this.ashDown, this.empFall, this.idle, this.helper, this.gasFloor]; }
    hash(word, num) {
        word(0x5150015);
        for (const m of this.maps()) {
            word(m.size);
            for (const [k, v] of m) {
                word(k);
                word(v.length);
                for (const x of v)
                    num(x);
            }
        }
    }
    exportTo(w) {
        for (const m of this.maps()) {
            w.i32(m.size);
            for (const [k, v] of m) {
                w.i32(k);
                w.i32(v.length);
                for (const x of v)
                    w.f64(x);
            }
        }
    }
    restoreFrom(r) {
        for (const m of this.maps()) {
            m.clear();
            for (let i = 0, n = r.i32(); i < n; i++) {
                const k = r.i32(), len = r.i32(), v = [];
                for (let j = 0; j < len; j++)
                    v.push(r.f64());
                m.set(k, v);
            }
        }
    }
}
exports.S15 = S15;
// ------------------------------------------------------------------ ruling 55: aircraft ammunition
/** A new entity in slot s (Sim.spawnUnit): an aircraft with a limited weapon gets full loads. */
function ammoOnSpawn(sim, s) {
    const d = sim.d, t = sim.etype[s];
    if (!d.tAir[t] || d.rearmTicks <= 0)
        return;
    const mc = sim.mCount[s];
    let any = false;
    const v = [];
    for (let m = 0; m < mc; m++) {
        const w = sim.mWeapon[s * data_ts_1.MAX_MOUNTS + m], a = w >= 0 ? d.wAmmo[w] : 0;
        v.push(a > 0 ? a : -1);
        if (a > 0)
            any = true;
    }
    if (any)
        sim.s15State().ammo.set(sim.eid[s], v);
}
/** Full load of mount m of slot s (0: unlimited). */
function ammoFull(sim, s, m) {
    const w = sim.mWeapon[s * data_ts_1.MAX_MOUNTS + m];
    return w >= 0 ? sim.d.wAmmo[w] : 0;
}
/** Does the aircraft (rounds per mount `am`) want to rearm: its driver-seat weapon, or every limited weapon, is empty? */
function wantsRearm(sim, s, am) {
    const d = sim.d, t = sim.etype[s], drv = d.tDriverSeat[t];
    let limited = 0, empty = 0;
    for (let m = 0; m < am.length; m++) {
        if (am[m] < 0)
            continue;
        limited++;
        if (am[m] < 1) {
            empty++;
            if (d.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + m] === drv)
                return true;
        }
    }
    return limited > 0 && empty === limited;
}
/** Is landed aircraft slot s beside a live, finished friendly Air Pad? */
function atPad(sim, s) {
    if (sim.airS[s] !== 0 || sim.flyAlt[s] > 0)
        return false;
    const pad = sim.nearestPad(s);
    return pad >= 0 && sim.gap(s, pad) <= sim.d.crew.padLandGap + 2;
}
/** Per tick (Sim.step, after the pilots): rearming at pads, AI aircraft going dry. */
function ammoStep(sim) {
    const S = sim.s15;
    if (S === null || S.ammo.size === 0)
        return;
    const d = sim.d, per = d.rearmTicks;
    for (const [id, am] of S.ammo) {
        const s = sim.idToSlot.get(id);
        if (s === undefined || !sim.alive[s]) {
            S.ammo.delete(id);
            S.rearming.delete(id);
            continue;
        }
        let full = true;
        for (let m = 0; m < am.length; m++)
            if (am[m] >= 0 && am[m] < ammoFull(sim, s, m)) {
                full = false;
                break;
            }
        if (!full && per > 0 && atPad(sim, s)) {
            for (let m = 0; m < am.length; m++) {
                if (am[m] < 0)
                    continue;
                const f = ammoFull(sim, s, m);
                am[m] = Math.min(f, am[m] + f / per);
            }
            full = true;
            for (let m = 0; m < am.length; m++)
                if (am[m] >= 0 && am[m] < ammoFull(sim, s, m)) {
                    full = false;
                    break;
                }
            if (full) {
                S.rearming.delete(id);
                sim.events.push(events_ts_1.EV.AMMO, sim.tick, sim.team[s], id, exports.AM_FULL, 0, 0, sim.x[s], sim.z[s], 0);
            }
            continue;
        }
        if (!full && !S.rearming.has(id) && sim.aiFlown(s) && wantsRearm(sim, s, am)) {
            S.rearming.set(id, [sim.tick]);
            sim.events.push(events_ts_1.EV.AMMO, sim.tick, sim.team[s], id, exports.AM_DRY, 0, 0, sim.x[s], sim.z[s], 0);
        }
    }
}
/** Sim.moveUnit: an AI aircraft that went dry flies to its nearest pad and lands there until rearmed. */
function ammoReturning(sim, s) {
    const S = sim.s15;
    return S !== null && S.rearming.size > 0 && S.rearming.has(sim.eid[s]);
}
// ------------------------------------------------------------------ snapshot ext records (netsnap.ts, protocol v22)
// One keyed record map after the decoys: key = id * 8 + kind; each record is varint key, then the kind's payload.
/** Ruling 55: rounds of an aircraft of the viewer's team. id = aircraft entity. u8 flags (1 rearming), u8 n, n x (u8 mount, varint rounds left (whole), varint full load). */
exports.EXT_AMMO = 1;
/**
 * Rulings 79 / 88: a downed player pilot of the viewer's team. id = pilot id. u8 help bits (1 an AI helper is coming, 2 it
 * is holding the revive, 4 a player is reviving him now, 8 another player of the team is alive), varint helper entity (0).
 */
exports.EXT_DOWNED = 2;
/** Ruling 86: the viewer team's Shield Projector gas floor. id = team. varint floor (whole gas), u8 1 if one of the team's projectors is off for it. */
exports.EXT_GASFLOOR = 3;
/**
 * Ruling 91 (designer playtest 15 Nov, Lancer laser): laser state of a vehicle with a charge or heat weapon. id = vehicle
 * entity. Every viewer that sees the vehicle gets it while its cannon charges (so enemies see the shot coming); the vehicle's
 * own team gets it whenever any value is not at rest. u8 flags (1 full record: own team; 2 overheated; 4 AI cooling),
 * u8 charge (1/255 of chargeSeconds); full record: u8 charge ticks total, varint cannon cooldown ticks left, varint
 * cooldown ticks of a full period, u8 heat (1/255), varint overheat lockout ticks left, varint lockout ticks total.
 */
exports.EXT_LASER = 4;
/**
 * Ruling 108 (Dart Scout boost): boost meter of a vehicle of the viewer's team with a boost (unit.boost), while the meter is
 * not full or the vehicle is boosting. id = vehicle entity. u8 meter (1/255 of full), u8 flags (1 boosting, 2 meter below
 * boost.minStartFraction: cannot start a boost).
 */
exports.EXT_BOOST = 5;
/** Ext records for a viewer of team vteam into `out` (key -> record bytes). */
function extRecords(sim, vteam, out, mk) {
    if (sim.kit !== null)
        for (const k of sim.kit.pilots.values()) {
            if (k.downedUntil <= 0)
                continue;
            const p = sim.pilots.get(k.id);
            if (!p || p.team !== vteam || p.state !== 3)
                continue;
            const b = mk(), key = p.id * 8 + exports.EXT_DOWNED, r = sim.s15?.helper.get(p.id);
            b.varint(key);
            b.u8(helpBits(sim, p.id) | (k.reviver !== 0 ? 4 : 0) | (otherPlayerAlive(sim, p.id, p.team) ? 8 : 0));
            b.varint(r ? r[0] : 0);
            out.set(key, b.bytes());
        }
    if (sim.bfx !== null) { // ruling 86: only once the team has a Shield Projector
        let floor = -1, off = false;
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.team[s] !== vteam || sim.hp[s] <= 0)
                continue;
            const f0 = sim.bfx.R.domeFloor[sim.etype[s]];
            if (!(sim.bfx.R.domeR[sim.etype[s]] > 0))
                continue;
            const f = domeGasFloor(sim, vteam, f0);
            floor = f;
            if (sim.gas[vteam] + 1e-9 < f)
                off = true;
        }
        if (floor >= 0) {
            const b = mk(), key = vteam * 8 + exports.EXT_GASFLOOR;
            b.varint(key);
            b.varint(Math.round(floor));
            b.u8(off ? 1 : 0);
            out.set(key, b.bytes());
        }
    }
    laserRecords(sim, vteam, out, mk);
    boostRecords(sim, vteam, out, mk);
    const S = sim.s15;
    if (S === null)
        return;
    for (const [id, am] of S.ammo) {
        const s = sim.idToSlot.get(id);
        if (s === undefined || !sim.alive[s] || sim.team[s] !== vteam)
            continue;
        const b = mk(), key = id * 8 + exports.EXT_AMMO;
        b.varint(key);
        b.u8(S.rearming.has(id) ? 1 : 0);
        let n = 0;
        for (const v of am)
            if (v >= 0)
                n++;
        b.u8(n);
        for (let m = 0; m < am.length; m++)
            if (am[m] >= 0) {
                b.u8(m);
                b.varint(Math.max(0, Math.floor(am[m] + 1e-9)));
                b.varint(ammoFull(sim, s, m));
            }
        out.set(key, b.bytes());
    }
}
/** Ruling 108: EXT_BOOST records (see EXT_BOOST). */
function boostRecords(sim, vteam, out, mk) {
    const d = sim.d;
    for (let s = 0; s < sim.hi; s++) {
        const t = sim.etype[s];
        if (!(d.tBoostMul[t] > 0) || !sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== vteam)
            continue;
        const m = sim.boostM[s], on = sim.boostOn[s] === 1;
        if (m >= 1 && !on)
            continue;
        const b = mk(), key = sim.eid[s] * 8 + exports.EXT_BOOST;
        b.varint(key);
        b.u8(Math.max(0, Math.min(255, Math.round(m * 255))));
        b.u8((on ? 1 : 0) | (!on && m < d.tBoostMin[t] ? 2 : 0));
        out.set(key, b.bytes());
    }
}
/** Ruling 91: EXT_LASER records (see EXT_LASER). */
function laserRecords(sim, vteam, out, mk) {
    const d = sim.d, dt = d.dt;
    let any = false;
    for (let w = 0; w < d.wChargeTicks.length; w++)
        if (d.wChargeTicks[w] > 0 || d.wHeatPerShot[w] > 0) {
            any = true;
            break;
        }
    if (!any)
        return;
    for (let s = 0; s < sim.hi; s++) {
        if (!sim.alive[s] || sim.hp[s] <= 0)
            continue;
        const mc = sim.mCount[s], mb = s * data_ts_1.MAX_MOUNTS;
        let cm = -1, hm = -1;
        for (let m = 0; m < mc; m++) {
            const w = sim.mWeapon[mb + m];
            if (w < 0)
                continue;
            if (cm < 0 && d.wChargeTicks[w] > 0)
                cm = mb + m;
            const ov = (k) => (sim.mOvh[k] > sim.tick ? 1 : 0);
            if (d.wHeatPerShot[w] > 0 && (hm < 0 || ov(mb + m) > ov(hm) || (ov(mb + m) === ov(hm) && sim.mHeat[mb + m] > sim.mHeat[hm])))
                hm = mb + m; // the hottest heat weapon (Frontline: a pilot's laser gun or shoulder cannon, whichever is in use)
        }
        if (cm < 0 && hm < 0)
            continue;
        const own = sim.team[s] === vteam, id = sim.eid[s];
        const ct = cm >= 0 ? d.wChargeTicks[sim.mWeapon[cm]] : 0, chg = cm >= 0 ? sim.mChg[cm] : 0;
        const cdT = cm >= 0 && sim.cooldown[cm] > 1e-9 ? Math.ceil(sim.cooldown[cm] / dt - 1e-6) : 0;
        const heat = hm >= 0 ? sim.mHeat[hm] : 0, ovh = hm >= 0 ? sim.mOvh[hm] : 0, lockT = ovh > 0 ? Math.max(0, ovh - sim.tick) : 0;
        if (own ? chg === 0 && cdT === 0 && heat === 0 && lockT === 0 && ovh === 0 : chg === 0 || !sim.isDetectedBy(id, vteam))
            continue;
        const b = mk(), key = id * 8 + exports.EXT_LASER;
        b.varint(key);
        b.u8((own ? 1 : 0) | (lockT > 0 ? 2 : 0) | (ovh === -1 ? 4 : 0));
        b.u8(ct > 0 ? Math.min(255, Math.round((chg / ct) * 255)) : 0);
        if (own) {
            b.u8(Math.min(255, ct));
            b.varint(cdT);
            b.varint(cm >= 0 ? Math.round(d.wPeriod[sim.mWeapon[cm]] / dt) : 0);
            b.u8(Math.min(255, Math.round(heat * 255)));
            b.varint(lockT);
            b.varint(hm >= 0 ? d.wLockTicks[sim.mWeapon[hm]] : 0);
        }
        out.set(key, b.bytes());
    }
}
/** Decodes one ext record (after its key) into the view's typed maps. */
function extDecode(key, r, ammo, downed, gasFloor, lasers, boosts) {
    const kind = key & 7, id = Math.floor(key / 8);
    if (kind === exports.EXT_BOOST) {
        const meter = r.u8() / 255, f = r.u8();
        boosts?.set(id, { id, meter, boosting: (f & 1) !== 0, low: (f & 2) !== 0 });
    }
    else if (kind === exports.EXT_LASER) {
        const f = r.u8(), charge = r.u8() / 255, full = (f & 1) !== 0;
        const L = { id, full, charge, chargeTicks: 0, cooldownTicks: 0, cooldownFull: 0, heat: 0, overheated: (f & 2) !== 0, lockTicks: 0, lockFull: 0 };
        if (full) {
            L.chargeTicks = r.u8();
            L.cooldownTicks = r.varint();
            L.cooldownFull = r.varint();
            L.heat = r.u8() / 255;
            L.lockTicks = r.varint();
            L.lockFull = r.varint();
        }
        lasers?.set(id, L);
    }
    else if (kind === exports.EXT_GASFLOOR) {
        const floor = r.varint(), off = r.u8();
        gasFloor.set(id, { team: id, floor, domeOff: off === 1 });
    }
    else if (kind === exports.EXT_DOWNED) {
        const f = r.u8(), helper = r.varint();
        downed.set(id, { pilotId: id, helpComing: (f & 7) !== 0, aiHelper: (f & 1) !== 0, aiReviving: (f & 2) !== 0, playerReviving: (f & 4) !== 0, playersAlive: (f & 8) !== 0, helper });
    }
    else if (kind === exports.EXT_AMMO) {
        const f = r.u8(), n = r.u8(), mounts = [];
        for (let i = 0; i < n; i++) {
            const mount = r.u8(), left = r.varint(), full = r.varint();
            mounts.push({ mount, left, full });
        }
        ammo.set(id, { id, rearming: (f & 1) !== 0, mounts });
    }
    else
        throw new Error(`snapshot ext record kind ${kind}`);
}
/** Removes the typed entry of a removed ext record key. */
function extRemove(key, ammo, downed, gasFloor, lasers, boosts) {
    const kind = key & 7, id = Math.floor(key / 8);
    if (kind === exports.EXT_BOOST)
        boosts?.delete(id);
    if (kind === exports.EXT_LASER)
        lasers?.delete(id);
    if (kind === exports.EXT_AMMO)
        ammo.delete(id);
    else if (kind === exports.EXT_GASFLOOR)
        gasFloor.delete(id);
    else if (kind === exports.EXT_DOWNED)
        downed.delete(id);
}
// ------------------------------------------------------------------ ruling 67: ash fall grounds aircraft in the air
/** effects of weather index w from the data (crashLandSeconds, crashLandHullFraction, aircraftGrounded). */
function wxEffects(sim, w) {
    const list = sim.d.raw.weather?.weather ?? [];
    return list[w]?.effects ?? {};
}
/** The weather forecast (Sim's WEATHER emit, phase forecast): a warning to each team with aircraft in the air. */
function ashForecast(sim, w, ticks) {
    if (wxEffects(sim, w).aircraftGrounded !== true)
        return;
    const n = [0, 0, 0, 0];
    for (let s = 0; s < sim.hi; s++)
        if (sim.alive[s] && sim.d.tAir[sim.etype[s]] && sim.flyAlt[s] > 0 && sim.team[s] < 4)
            n[sim.team[s]]++;
    for (let t = 0; t < 4; t++)
        if (n[t] > 0)
            sim.events.push(events_ts_1.EV.AIR_WARNING, sim.tick, t, w, n[t], ticks, 0, 0, 0, 0);
}
/** Per tick after the weather update (before movement): who is held down by ash, who is crash-landing. */
function ashStep(sim) {
    const W = sim.weather;
    const on = W !== null && W.e.grounded;
    const S = sim.s15;
    if (!on) {
        if (S !== null && S.ashDown.size)
            S.ashDown.clear();
        return;
    }
    for (let s = 0; s < sim.hi; s++) {
        if (!sim.alive[s] || !sim.d.tAir[sim.etype[s]] || sim.hp[s] <= 0)
            continue;
        const id = sim.eid[s], St = sim.s15State();
        if (St.ashDown.has(id))
            continue;
        const air = sim.flyAlt[s] > 0 ? 1 : 0;
        St.ashDown.set(id, [air, 0]);
        if (air)
            sim.events.push(events_ts_1.EV.ASH_CRASH, sim.tick, sim.team[s], id, 1, 0, 0, sim.x[s], sim.z[s], 0);
    }
    if (S !== null)
        for (const id of S.ashDown.keys())
            if (!sim.idToSlot.has(id))
                S.ashDown.delete(id);
}
/** Ruling 67 crash-landing numbers of the weather in force: metres of descent per tick and the hull fraction lost. */
function ashCrash(sim) {
    const W = sim.weather;
    const e = W.cur >= 0 ? wxEffects(sim, W.sched[W.cur].w) : {};
    const secs = typeof e.crashLandSeconds === "number" ? e.crashLandSeconds : 3, hull = typeof e.crashLandHullFraction === "number" ? e.crashLandHullFraction : 0.5;
    return { perTick: sim.d.constants.airAltitude / Math.max(1, secs * sim.d.constants.tickRate), hull };
}
// ------------------------------------------------------------------ ruling 73: an idle player's pilot drops prone
const PC_PRONE_FLAG = 256; // sim.ts PC_PRONE
function idleTicks(sim) {
    const v = sim.d.raw.constants.pilot?.idleProneSeconds;
    return typeof v === "number" && v > 0 ? Math.round(v * sim.d.constants.tickRate) : -1;
}
/** Sim.controlPilot (on foot): an input with activity restarts the idle clock. */
function idleActive(sim, pilotId, entity) {
    if (idleTicks(sim) < 0)
        return;
    const r = sim.s15State().idle.get(pilotId);
    if (r) {
        r[0] = sim.tick;
        r[1] = entity;
    }
    else
        sim.s15State().idle.set(pilotId, [sim.tick, entity]);
}
/** Is an AI vehicle on its way to pick pilot pid up (ruling 19 pickup order)? */
function awaitsPickup(sim, pid) {
    for (let s = 0; s < sim.hi; s++)
        if (sim.alive[s] && sim.ordType[s] === 4 && sim.ordTargetId[s] === pid)
            return true; // ORD_PICKUP
    return false;
}
/** Per tick after the inputs: player pilots on foot idle for idleProneSeconds are held prone with nothing pressed. */
function idleStep(sim) {
    const T = idleTicks(sim);
    if (T < 0)
        return;
    let S = sim.s15;
    for (const p of sim.pilots.values()) {
        if (p.player < 0 || p.state !== 1 || (sim.fkit && sim.fkit.bots && sim.fkit.bots.ids.has(p.id)))
            continue; // Frontline 4c: AI pilots are never idle players
        if (S === null)
            S = sim.s15State();
        const r = S.idle.get(p.id);
        if (!r || r[1] !== p.entity) {
            S.idle.set(p.id, [sim.tick, p.entity]);
            continue;
        } // a new body: the clock starts now
        if (sim.tick - r[0] < T)
            continue;
        if (awaitsPickup(sim, p.id)) {
            r[0] = sim.tick;
            continue;
        } // waiting for a ride he called (ruling 19) is not idle
        const s = sim.idToSlot.get(p.entity);
        if (s === undefined)
            continue;
        sim.ctlOn[s] = 1;
        sim.ctlMask[s] = 0;
        sim.ctlThrust[s] = 0;
        sim.ctlStrafe[s] = 0;
        sim.ctlFire[s] = 0;
        sim.ctlTool[s] = 0;
        sim.ctlFlags[s] = PC_PRONE_FLAG;
    }
    if (S !== null && S.idle.size)
        for (const id of [...S.idle.keys()]) {
            const p = sim.pilots.get(id);
            if (!p || p.player < 0)
                S.idle.delete(id);
        }
}
// ------------------------------------------------------------------ rulings 79 + 88: who can revive a downed player
function reviveRange(sim) {
    const v = sim.d.raw.constants.pilot?.aiReviveRangeMetres;
    return typeof v === "number" && v > 0 ? v : 0;
}
/** Can slot o (team `team`) revive: an AI pilot on foot (not a player) or an infantry soldier, alive, on the ground? */
function helperOk(sim, o, team) {
    if (!sim.alive[o] || sim.team[o] !== team || sim.hp[o] <= 0 || sim.airborne[o] !== 0)
        return false;
    const d = sim.d, t = sim.etype[o];
    if (t === d.pilotType) {
        const q = sim.pilots.get(sim.slotPilot[o]);
        return q !== undefined && (q.player < 0 || (sim.isBotPilot && sim.isBotPilot(q.id))) && q.state === 1; // Frontline 4c: AI pilots revive too
    }
    return d.tArmour[t] === 0 && !d.tStructure[t] && sim.slotPilot[o] === 0; // AC_INFANTRY soldier
}
/** Nearest friendly AI helper slot within the revive range of (x, z) (-1 none; ties: lower slot). */
function findHelper(sim, team, x, z) {
    const R = reviveRange(sim);
    if (R <= 0)
        return -1;
    let best = -1, bd = R * R;
    for (let o = 0; o < sim.hi; o++) {
        if (!helperOk(sim, o, team))
            continue;
        const dx = sim.x[o] - x, dz = sim.z[o] - z, d2 = dx * dx + dz * dz;
        if (d2 <= bd && (best < 0 || d2 < bd)) {
            best = o;
            bd = d2;
        }
    }
    return best;
}
/** Another player of p's team alive (on foot or seated; not dead, not downed)? */
function otherPlayerAlive(sim, pid, team) {
    for (const q of sim.pilots.values())
        if (q.id !== pid && q.team === team && q.player >= 0 && (q.state === 0 || q.state === 1))
            return true;
    return false;
}
/** pilotkit.kitTryDown: may player pilot pid (body slot s) be downed at all (rulings 79 / 88)? */
function reviveHelpPossible(sim, pid, s) {
    return otherPlayerAlive(sim, pid, sim.team[s]) || findHelper(sim, sim.team[s], sim.x[s], sim.z[s]) >= 0;
}
/**
 * pilotkit.kitStep, for downed pilot pid (body slot s) that no player is reviving this tick: the AI helper walks to
 * the body and holds the revive. Returns the helper's entity id when the revive completes this tick (else 0).
 */
function aiReviveStep(sim, pid, s, reach, reviveTicks) {
    if (reviveRange(sim) <= 0)
        return 0;
    const S = sim.s15State();
    let r = S.helper.get(pid);
    let hs = r && r[0] ? sim.idToSlot.get(r[0]) : undefined;
    if (hs === undefined || !helperOk(sim, hs, sim.team[s])) {
        const f = findHelper(sim, sim.team[s], sim.x[s], sim.z[s]);
        if (f < 0) {
            if (r) {
                r[0] = 0;
                r[1] = -1;
            }
            return 0;
        }
        hs = f;
        if (!r) {
            r = [0, -1];
            S.helper.set(pid, r);
        }
        r[0] = sim.eid[f];
        r[1] = -1;
    }
    if (sim.gap(hs, s) > reach) {
        r[1] = -1;
        sim.kitWalkTo(hs, sim.x[s], sim.z[s]);
        return 0;
    }
    if (r[1] < 0) {
        r[1] = sim.tick;
        sim.dropTargets(hs);
        sim.order([sim.eid[hs]], { type: "stop" }, sim.team[hs]);
    }
    if (sim.tick - r[1] < reviveTicks)
        return 0;
    const id = r[0];
    S.helper.delete(pid);
    const q = sim.pilots.get(sim.slotPilot[hs]);
    if (q && q.player < 0)
        sim.sendHome(q, hs); // the AI pilot goes on home
    return id;
}
/** Downed pilot pid is no longer downed (revived, dead, gone): forget its helper. */
function helperDone(sim, pid) { if (sim.s15 !== null && sim.s15.helper.size)
    sim.s15.helper.delete(pid); }
/** Snapshot: is help coming for downed pilot pid? bit 0 an AI helper is assigned, bit 1 its revive hold runs. */
function helpBits(sim, pid) {
    const r = sim.s15?.helper.get(pid);
    return r && r[0] ? 1 | (r[1] >= 0 ? 2 : 0) : 0;
}
// ------------------------------------------------------------------ ruling 86: Shield Projector gas floor
/** The team's dome gas floor: its own setting, else the data's (dflt). */
function domeGasFloor(sim, team, dflt) {
    const r = sim.s15 !== null && sim.s15.gasFloor.size ? sim.s15.gasFloor.get(team) : undefined;
    return r ? r[0] : dflt;
}
/** Sim.setDomeGasFloor: the team's own level (whole gas, 0-100000). */
function setGasFloor(sim, team, gas) {
    if (!Number.isFinite(gas) || gas < 0 || gas > 100000 || !(team >= 0 && team < 4))
        return false;
    sim.s15State().gasFloor.set(team, [Math.round(gas)]);
    return true;
}
