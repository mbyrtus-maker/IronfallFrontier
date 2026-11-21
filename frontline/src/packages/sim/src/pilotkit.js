"use strict";
// Pilot kit (stage 2 S12; design doc 13 "Pilot combat", doc 14 stealth tools): the pilot game on foot.
//
// 1. Downed and revive (doc 13 "Down and out"). A PLAYER pilot on foot whose health reaches zero is DOWNED, not dead:
//    its body stays where it fell (hp 0: nothing targets or damages it, it does not move or fire) for
//    pilot.downedSeconds. A friendly player pilot on foot, on the ground, holding interact within crew.enterRangeMetres
//    (surface gap) of the body for pilot.reviveSeconds without a break revives it: it stands up with
//    pilot.reviveHealthFraction of its health and an empty shield (which regenerates after its usual delay). Not revived
//    in time: it dies there (PILOT_DEATH) and the normal respawn rule runs from then (supplied Barracks or Command
//    Core, death penalty, cap). Outright kills skip the downed state: a single hit at least the pilot's full health +
//    shield (ruling 27: a heavy shell kills outright; also demo charges, support calls), destroy() (scripted), and every
//    death in a seat (rulings 25-26: bike riders die with the bike; sniped crews die in the seat). AI pilots just die.
//    Events DOWNED / REVIVED; the pilot record's state is P_DOWNED (3) while down.
// 2. Demolition charge (doc 13 kit "Demo charge x2"). A player or AI pilot on foot, on the ground, plants a charge
//    (Sim.plantCharge / queuePlantCharge) on an enemy or neutral vehicle or structure whose surface is within the charge
//    weapon's range (the pilot unit's kitWeapons entry of class placed-charge: pilot-demo-charge, 3 m) — an enemy
//    Command Core included. One of pilot.demoChargeCount charges is used; refilled to full on respawn and on foot within
//    pilot.energy.refillRadiusMetres of a friendly building with effects.pilotEnergyRefill (Barracks, Core, Field Depot).
//    The charge sticks to the target at the side it was planted on and detonates pilot.demoChargeFuseSeconds later:
//    one hit of the charge weapon through the normal damage pipeline (damage matrix, shield, rear bonus when planted on
//    the rear of a vehicle, critical window / auto-eject, kills; no backstab bonus). Target gone first: it fizzles.
//    Event CHARGE (1 planted, 2 detonated, 4 fizzled).
// 3. Hijack (already in sim.ts: 5 s contact on an empty enemy vehicle, the vehicle changes team). Added: an AI pilot on
//    foot of a team without player pilots (the enemy side) walking home (ejected, or left on foot) that has an EMPTY, intact vehicle of its own team within
//    pilot.aiReboardRadiusMetres walks to it and climbs in (friendly vehicles are entered at once), checked every 10 ticks.
// 4. Cloak field (doc 14 stealth tools; ruling 17: powered by pilot energy). A player pilot on foot holding
//    PilotControlInput.cloak is cloaked: signature x stealth.cloak.signatureMultiplier, for at most
//    stealth.cloak.maxSeconds, draining stealth.cloak.gasPerSecond of PILOT ENERGY per second (ruling 17 moved every
//    powered pilot tool onto the one energy reserve; the doc's "gas per second" is read as that). It ends on release,
//    when the time or the energy runs out, on entering a vehicle, going down, and when the pilot fires ("breaks on
//    firing"); then stealth.cloak.rechargeSeconds before it can be used again. Event CLOAK.
//    pilotSignatureMultiplier(sim, slot) is the single hook for detection: crouch x cloak for a pilot body (1 otherwise).
// 5. Movement feel: a controlled pilot on foot no longer reaches full speed (or stops) in one tick. kitPilotVelocity
//    turns the input's wanted horizontal velocity into the new one, changing it by at most pilot.moveAcceleration x dt
//    per tick while speeding up and pilot.moveDeceleration x dt while slowing down (the last tick's real velocity is the
//    start). The viewer's own body position also goes into the snapshot at 1 mm (kitPilotBytes).
//
// State (created on first use, so a sim that never uses the kit hashes as before): per pilot record (ascending id) and
// the planted charges. Hashed and exported (state.ts) when present.
Object.defineProperty(exports, "__esModule", { value: true });
exports.KIT_VEL = exports.PC_CLOAK = exports.PilotKit = exports.P_DOWNED = void 0;
exports.compileKitRules = compileKitRules;
exports.kitTryDown = kitTryDown;
exports.kitDownedLeft = kitDownedLeft;
exports.kitReviveProgress = kitReviveProgress;
exports.kitOnDeath = kitOnDeath;
exports.kitPlant = kitPlant;
exports.kitDetonate = kitDetonate;
exports.pilotCloaked = pilotCloaked;
exports.pilotSignatureMultiplier = pilotSignatureMultiplier;
exports.kitStep = kitStep;
exports.kitPilotBytes = kitPilotBytes;
exports.kitPilotDecode = kitPilotDecode;
exports.kitAiReboard = kitAiReboard;
exports.kitPilotVelocity = kitPilotVelocity;
const s15_ts_1 = require("./s15.js");
const events_ts_1 = require("./events.js");
/** Pilot record state while downed (sim.ts P_SEATED 0, P_FOOT 1, P_DEAD 2). */
exports.P_DOWNED = 3;
function num(raw, path, dflt) {
    let o = raw;
    for (const k of path.split(".")) {
        if (o === null || typeof o !== "object")
            return dflt;
        o = o[k];
    }
    return typeof o === "number" && Number.isFinite(o) ? o : dflt;
}
/** Kit rules from data (null without crews). */
function compileKitRules(d) {
    if (!d.crew)
        return null;
    const c = d.raw.constants, tr = 1 / d.dt;
    const r = {
        downedTicks: Math.round(num(c, "pilot.downedSeconds", 0) * tr),
        reviveTicks: Math.max(1, Math.round(num(c, "pilot.reviveSeconds", 4) * tr)),
        reviveHpFrac: num(c, "pilot.reviveHealthFraction", 0.5),
        reach: d.crew.enterRange,
        chargeCount: Math.max(0, Math.round(num(c, "pilot.demoChargeCount", 0))),
        fuseTicks: Math.max(1, Math.round(num(c, "pilot.demoChargeFuseSeconds", 5) * tr)),
        chargeWeapon: -1, chargeReach: 0, refillRadius: d.crew.refillRadius,
        aiReboard: num(c, "pilot.aiReboardRadiusMetres", 0),
        cloakMul: num(c, "stealth.cloak.signatureMultiplier", 1), cloakTicks: Math.round(num(c, "stealth.cloak.maxSeconds", 0) * tr),
        cloakRecharge: Math.round(num(c, "stealth.cloak.rechargeSeconds", 0) * tr), cloakEnergy: num(c, "stealth.cloak.gasPerSecond", 0) / tr,
        accel: num(c, "pilot.moveAcceleration", 0), decel: num(c, "pilot.moveDeceleration", 0),
        crouchMul: d.tSignature[d.pilotType] > 0 ? d.crew.crouchedSignature / d.tSignature[d.pilotType] : 1,
        proneMul: d.tSignature[d.pilotType] > 0 ? d.crew.proneSignature / d.tSignature[d.pilotType] : 1,
    };
    // the pilot's placed charge: its kitWeapons entry of class placed-charge
    const pu = d.raw.units.find((u) => u.category === "pilot");
    for (const id of pu?.kitWeapons ?? []) {
        const w = d.raw.weapons.find((x) => x.id === id);
        if (w && w.class === "placed-charge") {
            r.chargeWeapon = d.weaponIds.indexOf(id);
            r.chargeReach = w.range;
            break;
        }
    }
    return r;
}
const KP_FIELDS = ["id", "downedUntil", "reviver", "reviveStart", "charges", "cloakStart", "cloakUntil", "cloakReady"];
function newRec(id, charges) { return { id, downedUntil: 0, reviver: 0, reviveStart: 0, charges, cloakStart: 0, cloakUntil: 0, cloakReady: 0 }; }
class PilotKit {
    rules;
    pilots = new Map(); // ascending id (kept sorted)
    charges = []; // ascending id
    nextCharge = 1;
    constructor(rules) { this.rules = rules; }
    rec(id) {
        let k = this.pilots.get(id);
        if (!k) {
            k = newRec(id, this.rules.chargeCount);
            this.pilots.set(id, k);
            const keys = Array.from(this.pilots.keys());
            if (keys.some((v, i) => i > 0 && v < keys[i - 1])) {
                const m = new Map();
                for (const v of keys.sort((a, b) => a - b))
                    m.set(v, this.pilots.get(v));
                this.pilots = m;
            }
        }
        return k;
    }
    hash(word, num) {
        word(0x917c17);
        word(this.pilots.size);
        for (const k of this.pilots.values())
            for (const f of KP_FIELDS)
                word(k[f]);
        word(this.nextCharge);
        word(this.charges.length);
        for (const c of this.charges) {
            word(c.id);
            word(c.pilot);
            word(c.team);
            word(c.target);
            num(c.f);
            num(c.r);
            word(c.detTick);
        }
    }
    exportTo(w) {
        w.i32(this.pilots.size);
        for (const k of this.pilots.values())
            for (const f of KP_FIELDS)
                w.i32(k[f]);
        w.i32(this.nextCharge);
        w.i32(this.charges.length);
        for (const c of this.charges) {
            w.i32(c.id);
            w.i32(c.pilot);
            w.i32(c.team);
            w.i32(c.target);
            w.f64(c.f);
            w.f64(c.r);
            w.i32(c.detTick);
        }
    }
    restoreFrom(r) {
        this.pilots = new Map();
        for (let i = 0, n = r.i32(); i < n; i++) {
            const k = newRec(0, 0);
            for (const f of KP_FIELDS)
                k[f] = r.i32();
            this.pilots.set(k.id, k);
        }
        this.nextCharge = r.i32();
        this.charges = [];
        for (let i = 0, n = r.i32(); i < n; i++) {
            const id = r.i32(), pilot = r.i32(), team = r.i32(), target = r.i32(), f = r.f64(), rr = r.f64(), detTick = r.i32();
            this.charges.push({ id, pilot, team, target, f, r: rr, detTick });
        }
    }
}
exports.PilotKit = PilotKit;
/**
 * Hook (Sim.removeDead): body slot s of a pilot reached zero health. Returns true when the pilot goes DOWN instead of
 * dying (the caller keeps the entity). outright: the killing blow was an outright kill (see the file header).
 */
function kitTryDown(sim, s, outright) {
    const R = sim.kitRules;
    if (!R || R.downedTicks <= 0 || outright)
        return false;
    const p = sim.pilots.get(sim.slotPilot[s]);
    if (!p || p.player < 0 || p.state !== 1)
        return false;
    if (!(0, s15_ts_1.reviveHelpPossible)(sim, p.id, s))
        return false; // rulings 79 / 88: nobody could revive him: he dies at once
    const K = sim.kitState(), k = K.rec(p.id), tick = sim.tick;
    p.state = exports.P_DOWNED;
    if (p.hackVehicle !== 0) {
        sim.events.push(events_ts_1.EV.HIJACK, tick, p.team, p.id, p.hackVehicle, tick - p.hackStart, 1, 0, 0, 2);
        sim.orderEvents.push({ tick, seq: p.hackSeq, id: p.id, reason: "hijackInterrupted" });
        p.hackVehicle = 0;
        p.hackSeq = 0;
        p.hackSeat = -1;
    }
    sim.hp[s] = 0;
    sim.shield[s] = 0;
    sim.ctlOn[s] = 0;
    sim.ctlFire[s] = 0;
    sim.ctlFlags[s] = 0;
    sim.ctlTool[s] = 0;
    sim.ctlThrust[s] = 0;
    sim.ctlStrafe[s] = 0;
    sim.ctlMask[s] = 0;
    sim.stance[s] = 0;
    sim.stanceT[s] = 0;
    sim.velX[s] = 0;
    sim.velZ[s] = 0;
    if (sim.ordType[s] !== 0 || sim.waypoints[s]) { // an AI-led body (Frontline's AI pilots) kept its last order and crawled on while down
        sim.dropTargets(s);
        sim.ordType[s] = 0;
        sim.waypoints[s] = null;
        sim.wpIdx[s] = 0;
    }
    k.downedUntil = tick + R.downedTicks;
    k.reviver = 0;
    k.reviveStart = 0;
    sim.events.push(events_ts_1.EV.DOWNED, tick, p.team, p.id, sim.eid[s], R.downedTicks, 0, 0, 0, events_ts_1.F_PLAYER);
    return true;
}
/** Frontline (designer 19 Nov: "add a give up option so I don't have to sit there for 20 secs"): a downed pilot bleeds out now (the next step). */
function kitGiveUp(sim, pilotId) {
    const k = sim.kit?.pilots.get(pilotId), p = sim.pilots.get(pilotId);
    if (!k || !p || p.state !== exports.P_DOWNED || k.downedUntil <= 0)
        return false;
    k.downedUntil = sim.tick;
    k.reviver = 0;
    return true;
}
exports.kitGiveUp = kitGiveUp;
/** Ticks until a downed pilot bleeds out (0 if not downed). */
function kitDownedLeft(sim, pilotId) {
    const k = sim.kit?.pilots.get(pilotId);
    return k && k.downedUntil > 0 ? Math.max(0, k.downedUntil - sim.tick) : 0;
}
/** Revive progress of a downed pilot, 0..1. */
function kitReviveProgress(sim, pilotId) {
    const k = sim.kit?.pilots.get(pilotId), R = sim.kitRules;
    return k && R && k.downedUntil > 0 && k.reviver !== 0 ? Math.min(1, (sim.tick - k.reviveStart) / R.reviveTicks) : 0;
}
/** Hook (Sim.pilotDied): a fresh kit on respawn (charges full, cloak ready). */
function kitOnDeath(sim, pilotId) { sim.kit?.pilots.delete(pilotId); }
/** Sim.plantCharge: pilot pilotId plants a demo charge on targetId (see the file header). */
function kitPlant(sim, pilotId, targetId, team) {
    const R = sim.kitRules, d = sim.d;
    if (!R || R.chargeWeapon < 0)
        return { ok: false, reason: "notCrewable" };
    const p = sim.pilots.get(pilotId);
    if (!p || p.state === 2)
        return { ok: false, reason: "unknownPilot" };
    if (team !== undefined && p.team !== team)
        return { ok: false, reason: "notOwner" };
    if (p.state !== 1)
        return { ok: false, reason: "pilotNotOnFoot" };
    const ps = sim.idToSlot.get(p.entity), ts = sim.idToSlot.get(targetId);
    if (ps === undefined)
        return { ok: false, reason: "unknownPilot" };
    if ((sim.stance[ps] & 3) === 2 || sim.stanceChanging(ps))
        return { ok: false, reason: "pilotProne" }; // ruling 42: no planting while prone
    const k = sim.kit?.pilots.get(p.id);
    if ((k ? k.charges : R.chargeCount) <= 0)
        return { ok: false, reason: "noCharges" };
    if (ts === undefined || !sim.alive[ts] || sim.hp[ts] <= 0)
        return { ok: false, reason: "unknownTarget" };
    const tt = sim.etype[ts];
    if (sim.team[ts] === p.team)
        return { ok: false, reason: "friendlyTarget" };
    if (!d.tVehicle[tt] && !d.tStructure[tt])
        return { ok: false, reason: "cannotDamageTarget" }; // pilots, infantry
    if (d.tAir[tt] && sim.entity(targetId).altitude > d.constants.airAltitude * 0.5)
        return { ok: false, reason: "cannotDamageTarget" }; // aircraft in flight
    if (sim.airborne[ps] !== 0 || sim.gap(ps, ts) > R.chargeReach)
        return { ok: false, reason: "tooFar" };
    const K = sim.kitState(), rec = K.rec(p.id);
    rec.charges--;
    // the side it is planted on, in the target's frame (forward, right)
    const dx = sim.x[ps] - sim.x[ts], dz = sim.z[ps] - sim.z[ts], fx = sim.dirX[ts], fz = sim.dirZ[ts];
    const c = { id: K.nextCharge++, pilot: p.id, team: p.team, target: targetId, f: dx * fx + dz * fz, r: -dx * fz + dz * fx, detTick: sim.tick + R.fuseTicks };
    K.charges.push(c);
    sim.events.push(events_ts_1.EV.CHARGE, sim.tick, p.team, c.id, p.id, targetId, R.fuseTicks, 0, 0, 1);
    return { ok: true, ids: [c.id] };
}
/** Step hook (phase 7b, before deaths are removed): charges whose fuse ran out detonate. */
function kitDetonate(sim) {
    const K = sim.kit, R = sim.kitRules;
    if (!K || !R || K.charges.length === 0)
        return;
    const tick = sim.tick;
    let j = 0;
    for (let i = 0; i < K.charges.length; i++) {
        const c = K.charges[i];
        if (c.detTick > tick) {
            K.charges[j++] = c;
            continue;
        }
        const ts = sim.idToSlot.get(c.target);
        if (ts === undefined || !sim.alive[ts] || sim.hp[ts] <= 0) {
            sim.events.push(events_ts_1.EV.CHARGE, tick, c.team, c.id, c.pilot, c.target, 0, 0, 0, 4);
            continue;
        }
        // the blast travels from the planted side into the hull: rear bonus when planted behind a vehicle
        const fx = sim.dirX[ts], fz = sim.dirZ[ts];
        const wx = c.f * fx - c.r * fz, wz = c.f * fz + c.r * fx;
        sim.kitDamage(ts, R.chargeWeapon, c.team, c.pilot, -wx, -wz);
        sim.events.push(events_ts_1.EV.CHARGE, tick, c.team, c.id, c.pilot, c.target, 0, 0, 0, 2);
    }
    K.charges.length = j;
}
/** PilotControlInput.cloak (control flag bit). */
exports.PC_CLOAK = 128;
/**
 * Detection hook (Sim.sensorSweep; the vision work can call it for any slot): signature multiplier of slot s from the
 * pilot's own tools — crouched (stealth.pilotCrouchedSignature / the pilot unit's signature) x cloaked
 * (stealth.cloak.signatureMultiplier). 1 for anything that is not a pilot body.
 */
/** Is the pilot body in slot s cloaked now? */
function pilotCloaked(sim, s) {
    const pid = sim.slotPilot[s];
    if (pid === 0 || sim.kit === null)
        return false;
    const k = sim.kit.pilots.get(pid);
    return k !== undefined && k.cloakUntil > 0;
}
function pilotSignatureMultiplier(sim, s) {
    const pid = sim.slotPilot[s];
    if (pid === 0)
        return 1;
    const R = sim.kitRules;
    let m = 1;
    const st = sim.stance[s] & 3; // ruling 42: crouched (doc 14 pilotCrouchedSignature) / prone (stealth.pilotProneSignature)
    if (st === 1)
        m = R ? R.crouchMul : 1;
    else if (st === 2)
        m = R ? R.proneMul : 1;
    const k = sim.kit !== null ? sim.kit.pilots.get(pid) : undefined;
    if (k !== undefined && k.cloakUntil > 0 && R)
        m *= R.cloakMul;
    return m;
}
/** Cloak upkeep for pilot record k (on foot: body slot s, or undefined). */
function cloakStep(sim, R, p, k, s) {
    const tick = sim.tick;
    const held = s !== undefined && p.state === 1 && sim.ctlOn[s] === 1 && (sim.ctlFlags[s] & exports.PC_CLOAK) !== 0;
    if (k.cloakUntil > 0) {
        let why = 0;
        if (s !== undefined && sim.lastFired[s] >= k.cloakStart)
            why = 4; // fired: breaks
        else if (!held || tick >= k.cloakUntil || s === undefined || sim.energy[s] <= 0)
            why = 2;
        if (why === 0) {
            const e = sim.energy[s] - R.cloakEnergy;
            sim.energy[s] = e > 0 ? e : 0;
            return;
        }
        k.cloakUntil = 0;
        k.cloakReady = tick + R.cloakRecharge;
        sim.events.push(events_ts_1.EV.CLOAK, tick, p.team, p.id, s !== undefined ? sim.eid[s] : 0, R.cloakRecharge, 0, 0, 0, why);
    }
    else if (held && tick >= k.cloakReady && sim.energy[s] > 0 && R.cloakTicks > 0) {
        k.cloakStart = tick;
        k.cloakUntil = tick + R.cloakTicks;
        // designer playtest 16 Nov 12:26 ("shot while my cloak field was on"): cloaking drops every enemy's track at once,
        // and anything aimed at the pilot loses it (detection then needs stealth.cloak.revealMetres, sim.ts sweepFrom)
        for (let t = 0; t < 4; t++)
            if (t !== sim.team[s])
                sim.detExpiry[s * 4 + t] = 0;
        sim.dropTargetsOn(s);
        sim.events.push(events_ts_1.EV.CLOAK, tick, p.team, p.id, sim.eid[s], R.cloakTicks, 0, 0, 0, 1);
    }
}
/** Step hook (end of Sim.pilotStep, phase 10): cloak, bleed-out and revive, charge resupply. */
function kitStep(sim) {
    const R = sim.kitRules;
    if (!R)
        return;
    const tick = sim.tick, d = sim.d;
    // cloak: player pilots on foot holding the key get a record; running cloaks are kept up or ended
    for (const p of sim.pilots.values()) {
        if (p.player < 0)
            continue;
        const s = p.state === 1 ? sim.idToSlot.get(p.entity) : undefined;
        let k = sim.kit !== null ? sim.kit.pilots.get(p.id) : undefined;
        if (k === undefined) {
            if (s === undefined || !sim.ctlOn[s] || (sim.ctlFlags[s] & exports.PC_CLOAK) === 0)
                continue;
            k = sim.kitState().rec(p.id);
        }
        cloakStep(sim, R, p, k, s);
    }
    const K = sim.kit;
    if (!K)
        return;
    for (const k of K.pilots.values()) {
        if (k.charges < R.chargeCount && (tick + k.id) % 10 === 0)
            resupply(sim, k);
        if (k.downedUntil <= 0)
            continue;
        const p = sim.pilots.get(k.id);
        const s = p ? sim.idToSlot.get(p.entity) : undefined;
        if (!p || p.state !== exports.P_DOWNED || s === undefined) {
            k.downedUntil = 0;
            k.reviver = 0;
            (0, s15_ts_1.helperDone)(sim, k.id);
            continue;
        }
        // revive: the first friendly player pilot (ascending id) on foot, on the ground, holding interact within reach
        let rv = 0;
        for (const q of sim.pilots.values()) {
            if (q.id === p.id || q.team !== p.team || q.player < 0 || q.state !== 1)
                continue;
            const qs = sim.idToSlot.get(q.entity);
            if (qs === undefined || sim.hp[qs] <= 0 || !sim.ctlOn[qs] || (sim.ctlFlags[qs] & 64) === 0 || sim.airborne[qs] !== 0)
                continue;
            if (sim.gap(qs, s) > R.reach)
                continue;
            if (k.reviver === q.id) {
                rv = q.id;
                break;
            }
            if (rv === 0)
                rv = q.id;
        }
        if (rv === 0)
            k.reviver = 0;
        else if (rv !== k.reviver) {
            k.reviver = rv;
            k.reviveStart = tick;
        }
        if (k.reviver === 0) { // rulings 79 / 88: a friendly AI pilot or soldier in range walks over and revives him
            const by = (0, s15_ts_1.aiReviveStep)(sim, p.id, s, R.reach, R.reviveTicks);
            if (by !== 0) {
                const hs = sim.idToSlot.get(by), hp = hs !== undefined ? sim.slotPilot[hs] : 0;
                p.state = 1;
                sim.hp[s] = sim.bodyMaxHp(s) * R.reviveHpFrac;
                sim.shield[s] = 0;
                sim.lastHit[s] = tick;
                sim.events.push(events_ts_1.EV.REVIVED, tick, p.team, p.id, hp, sim.eid[s], by, 0, 0, events_ts_1.F_PLAYER);
                k.downedUntil = 0;
                k.reviver = 0;
                k.reviveStart = 0;
                continue;
            }
        }
        if (k.reviver !== 0 && tick - k.reviveStart >= R.reviveTicks) {
            (0, s15_ts_1.helperDone)(sim, p.id);
            p.state = 1;
            sim.hp[s] = sim.bodyMaxHp(s) * R.reviveHpFrac;
            sim.shield[s] = 0;
            sim.lastHit[s] = tick;
            sim.events.push(events_ts_1.EV.REVIVED, tick, p.team, p.id, k.reviver, sim.eid[s], 0, 0, 0, events_ts_1.F_PLAYER);
            k.downedUntil = 0;
            k.reviver = 0;
            k.reviveStart = 0;
            continue;
        }
        if (tick >= k.downedUntil) {
            (0, s15_ts_1.helperDone)(sim, p.id);
            k.downedUntil = 0;
            k.reviver = 0;
            k.reviveStart = 0;
            const id = sim.eid[s], x = sim.x[s], z = sim.z[s];
            sim.despawn(s);
            p.state = 1; // pilotDied takes it from on foot to dead (respawn timer from now)
            sim.pilotDied(p, 0, id, x, z);
        }
    }
}
/**
 * Snapshot v12 tail of the PILOT block (netsnap.ts): u8 revive progress (1/255), u8 demo charges left, u8 cloak
 * (0 ready, 1 active, 2 recharging), varint cloak ticks, u8 fine position flag, [u32 x, u32 z in millimetres].
 */
function kitPilotBytes(sim, pilotId, s, w) {
    const k = sim.kit?.pilots.get(pilotId), R = sim.kitRules, tick = sim.tick;
    w.u8(Math.min(255, Math.floor(kitReviveProgress(sim, pilotId) * 255)));
    w.u8(k ? k.charges : R ? R.chargeCount : 0);
    if (k && k.cloakUntil > 0) {
        w.u8(1);
        w.varint(Math.max(0, k.cloakUntil - tick));
    }
    else if (k && k.cloakReady > tick) {
        w.u8(2);
        w.varint(k.cloakReady - tick);
    }
    else {
        w.u8(0);
        w.varint(0);
    }
    if (s !== undefined) {
        w.u8(1);
        w.u32(Math.round(sim.x[s] * 1000));
        w.u32(Math.round(sim.z[s] * 1000));
    }
    else
        w.u8(0);
}
function kitPilotDecode(r) {
    const reviveProgress = r.u8() / 255, charges = r.u8(), cloak = r.u8(), cloakTicks = r.varint();
    let x = null, z = null;
    if (r.u8() === 1) {
        x = r.u32() / 1000;
        z = r.u32() / 1000;
    }
    return { reviveProgress, charges, cloak, cloakTicks, x, z };
}
/** Demo charges back to full on foot near a friendly energy-refill building (Barracks, Command Core, Field Depot). */
function resupply(sim, k) {
    const p = sim.pilots.get(k.id), R = sim.kitRules, d = sim.d;
    const s = p && p.state === 1 ? sim.idToSlot.get(p.entity) : undefined;
    if (!p || s === undefined)
        return;
    for (let o = 0; o < sim.hi; o++) {
        if (!sim.alive[o] || sim.team[o] !== p.team || !d.tEnergyRefill[sim.etype[o]] || sim.hp[o] <= 0)
            continue;
        if (sim.gap(s, o) <= R.refillRadius) {
            k.charges = R.chargeCount;
            return;
        }
    }
}
/** Step hook (Sim.pilotStep, phase 10): AI pilots on foot walking home re-board a nearby empty vehicle of their team. */
function kitAiReboard(sim) {
    const R = sim.kitRules, d = sim.d, tick = sim.tick;
    if (!R || R.aiReboard <= 0)
        return;
    // only on teams without player pilots (the enemy side): a friendly AI pilot never climbs into a vehicle a player parked
    let playerTeams = 0;
    for (const p of sim.pilots.values())
        if (p.player >= 0)
            playerTeams |= 1 << p.team;
    for (const p of sim.pilots.values()) {
        if (p.player >= 0 || (playerTeams & (1 << p.team)) !== 0 || p.state !== 1 || p.task !== 1 || p.hackVehicle !== 0 || (tick + p.id) % 10 !== 0)
            continue;
        const s = sim.idToSlot.get(p.entity);
        if (s === undefined || sim.airborne[s] !== 0 || sim.hp[s] <= 0)
            continue;
        let best = -1, bg = R.aiReboard;
        for (let o = 0; o < sim.hi; o++) {
            if (!sim.alive[o] || sim.team[o] !== p.team || sim.hp[o] <= 0 || sim.critTick[o] >= 0 || sim.nOcc[o] !== 0)
                continue;
            if (d.tDriverSeat[sim.etype[o]] < 0)
                continue;
            const g = sim.gap(s, o);
            if (g <= bg) {
                bg = g;
                best = o;
            }
        }
        if (best < 0)
            continue;
        const r = sim.enter(p.id, sim.eid[best]);
        if (!r.ok)
            sim.kitWalkTo(s, sim.x[best], sim.z[best]); // out of reach (or not yet): walk to it
    }
}
/** Scratch for kitPilotVelocity's result (module level: not simulation state). */
exports.KIT_VEL = new Float64Array(2);
/**
 * Hook (Sim.pilotSteer): new horizontal velocity of pilot body slot s that wants (wx, wz) m/s, written to out[0], out[1]
 * (a scratch array: no allocation). Without acceleration data the wanted velocity is taken at once.
 */
function kitPilotVelocity(sim, s, wx, wz, out) {
    const R = sim.kitRules;
    if (!R || R.accel <= 0 || R.decel <= 0) {
        out[0] = wx;
        out[1] = wz;
        return;
    }
    const vx = sim.velX[s], vz = sim.velZ[s], dx = wx - vx, dz = wz - vz;
    const rate = (wx * wx + wz * wz >= vx * vx + vz * vz ? R.accel : R.decel) * sim.d.dt;
    const l2 = dx * dx + dz * dz;
    if (l2 <= rate * rate) {
        out[0] = wx;
        out[1] = wz;
        return;
    }
    const k = rate / Math.sqrt(l2);
    out[0] = vx + dx * k;
    out[1] = vz + dz * k;
}
