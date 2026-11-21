"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteVisible = exports.UnitMemory = exports.GUNNER_ZOOM_FOV = exports.powerText = exports.usesText = exports.lineCall = exports.podCall = exports.callFxKind = exports.reviveCandidate = exports.CL_BROKEN = exports.CL_OFF = exports.CL_ON = exports.CH_FIZZLED = exports.CH_DETONATED = exports.CH_PLANTED = exports.CHARGE_KEY_LABEL = exports.CHARGE_KEY = exports.CLOAK_KEY_LABEL = exports.CLOAK_KEY = exports.PILOT_DOWNED = exports.objectiveDefs = exports.clock = exports.reasonCodeText = exports.reasonText = exports.REASON_TEXT = void 0;
exports.missingReasonTexts = missingReasonTexts;
exports.objectiveRows = objectiveRows;
exports.objectiveEventText = objectiveEventText;
exports.matchReasonText = matchReasonText;
exports.downedText = downedText;
exports.downedMates = downedMates;
exports.chargeTarget = chargeTarget;
exports.cloakText = cloakText;
exports.kitEventText = kitEventText;
exports.podHeight = podHeight;
exports.linePoints = linePoints;
exports.zoneModels = zoneModels;
exports.callEffectText = callEffectText;
exports.toggleLoadout = toggleLoadout;
exports.weatherEffectText = weatherEffectText;
exports.weatherHud = weatherHud;
exports.weatherEventText = weatherEventText;
exports.weatherLook = weatherLook;
exports.terrainLayerOf = terrainLayerOf;
exports.layerTypeAt = layerTypeAt;
exports.planetPalette = planetPalette;
exports.terrainTint = terrainTint;
exports.fortifyInfo = fortifyInfo;
exports.pointPower = pointPower;
exports.tierUnlocks = tierUnlocks;
exports.tierPanelHtml = tierPanelHtml;
exports.economyEventText = economyEventText;
exports.aircraftPrompt = aircraftPrompt;
exports.landingChange = landingChange;
exports.passengerText = passengerText;
exports.unitEventText = unitEventText;
exports.recentShooters = recentShooters;
// Client C6: what the sim gained in stage 2 / 3 (S11-S13, W2b, W2c) on screen. Pure functions: snapshot blocks /
// events in, texts and models out. main.ts draws what these return; the logic tests (test/logic/c6*.test.mjs) call
// them directly. Everything here works on a guest too: it reads the snapshot and its events only.
const fb1_ts_1 = require("./fb1.js");
const sim_ts_1 = require("../../sim/src/sim.js");
const c4_ts_1 = require("./c4.js");
const c5_ts_1 = require("./c5.js");
const calls_ts_1 = require("../../sim/src/calls.js");
const pilotkit_ts_1 = require("../../sim/src/pilotkit.js");
const objectives_ts_1 = require("../../sim/src/objectives.js");
const events_ts_1 = require("../../sim/src/events.js");
const economy2_ts_1 = require("../../sim/src/economy2.js");
// ------------------------------------------------------------------ item 1: refusal texts for every reason code
/**
 * Plain words for every REJECT / CALL_REFUSED reason the sim has (sim.ts OrderRejectReason, codes 1-71, 80-81, 90-96, 100-106, 111-113, 120-127, 140-144;
 * the names come from the sim's ORDER_REASONS). Construction (46-59) and call (60-68) texts are C4's and C5's.
 */
exports.REASON_TEXT = {
    ...c4_ts_1.BUILD_REASON_TEXT,
    ...c5_ts_1.CALL_REASON_TEXT,
    unknownUnit: "unit no longer exists", structure: "structures take no orders", notOwner: "not your unit", noWaypoints: "no route given",
    unknownTarget: "target is gone", friendlyTarget: "cannot attack a friendly unit", targetNotDetected: "target not detected",
    cannotDamageTarget: "no weapon can damage that target", targetDestroyed: "target destroyed", targetLost: "target lost",
    noDriver: "it has no driver", playerDriven: "a player is driving it", unknownPilot: "no such pilot", pilotNotOnFoot: "you are not on foot",
    notPlayerPilot: "not a player pilot", enemyPilot: "enemy pilot", notCrewable: "it has no seats", hullCritical: "the vehicle is being destroyed",
    notSeated: "you are not in a vehicle", unknownVehicle: "the vehicle is gone", tooFar: "too far: get within 3 m of the hull", seatOccupied: "that seat is taken",
    noFreeSeat: "no free seat", enemyOccupied: "enemy crew aboard: snipe the driver first", badSeat: "no such seat", unknownBuilding: "the building is gone",
    notProducer: "this building cannot build that", tierLocked: "tech tier locked", queueFull: "queue full (5)", productionOff: "production is off",
    badQueueIndex: "no such queue item", unknownUnitType: "unknown unit type", pickupEnded: "pickup ended",
    notController: "you do not control that seat", notControllable: "that cannot be controlled directly", entityCapacity: "the battle is at its entity limit: try again in a moment",
    hijackInterrupted: "hijack interrupted", cannotAfford: "not enough ore / gas",
    // s4 / s5 / s7
    notHarvester: "only a Harvester mines", unknownDeposit: "the deposit is gone or exhausted", notFriendly: "can only guard your own side",
    selfTarget: "a unit cannot guard itself", orderTargetGone: "the unit it was guarding or following is gone", noRetreatPoint: "nowhere to retreat to: no Command Core standing",
    matchOver: "the match is over",
    // s11 calls (69, 70: C5's table), s12 pilot kit (71)
    noCharges: "no demo charges left: refill at a Barracks, the Command Core or a Field Depot",
    // w2b economy (90-96)
    fortifyInProgress: "already being fortified", maxFortification: "already at its highest fortification level",
    notForwardBaseVehicle: "only a Forward Base Vehicle deploys a base",
    forwardBaseSite: "deploy on a held, supplied point that is not a citadel and has no forward base",
    forwardBaseLimit: "forward base limit reached for this map", notForwardBase: "that is not your Field Depot", baseBusy: "already deploying or packing",
    // w2c (100)
    noAtmosphere: "no atmosphere: aircraft cannot fly on this world",
    // w2d (113; 111 / 112 are C5's)
    terrainUnbuildable: "the ground there cannot be built on",
    // w2e transports and progression (101-106)
    notTransport: "that vehicle does not carry infantry", transportFull: "no room aboard", notInfantry: "only infantry can board it",
    noCargo: "nothing aboard to unload", cannotLift: "that cannot be lifted", notLicensed: "the host still gates vehicles by licence (an older version)",
    // C8: fix-qa1 / fix-qa3 (150, 165)
    badInput: "the game refused a malformed command (a bad value was sent)", pilotProne: "you are prone: get up first (T, 1.2 s)",
    // C9: fix-qa2 garrisons and the reserve (155-164)
    garrisoned: "that squad is garrisoned: it only stops, holds fire or moves inside its point (ungarrison it first)",
    noGarrisonSlot: "no free garrison slot: each standing bunker at the point holds 2 squads",
    notGarrisonable: "only an own AI squad on the ground can garrison (not a pilot, a player's vehicle, an aircraft or a building)",
    notGarrisoned: "that squad is not garrisoned",
    reserveFull: "the reserve is full (more room: a Field Depot adds 6)",
    notInCallInZone: "not in a call-in zone: deploy within 150 m of a supplied own point or a Field Depot",
    notDroppable: "that unit cannot be dropped (heavy units and aircraft in flight stay out of the reserve)",
    reserveEmpty: "nothing suitable in the reserve",
    notUnderAttack: "rapid reinforce: that point is not under attack",
    reinforceCooldown: "rapid reinforce is cooling down at that point",
    // w2f join / stealth (120-127)
    playerExists: "that player is already in the battle", noDropPoint: "no Command Core to drop in at", notJoinable: "cannot join that side",
    notRelayTower: "only a Relay Tower can jam", noDecoy: "no decoy beacons left", notScoutBike: "only a Dart rider can pulse",
    pulseCooldown: "scout pulse recharging", callJammed: "an enemy jammer blocks orbital calls there",
    // w3b battle groups (140-144)
    noBattleGroups: "no battle groups in this battle", groupUnknown: "no such battle group", groupFull: "that battle group is full",
    notGroupable: "that unit cannot join a battle group", groupBadOrder: "that order does not fit the group",
    // C11: S14 pilot reserve (175-178), S15 vehicle drop (180)
    noPilotsAvailable: "no pilots at base: bring pilots home (walk them to the Core, a Barracks or a Field Depot)",
    crewNotAtBase: "crew it within 150 m of the Command Core, a supplied Barracks or a running Field Depot",
    vehicleCrewed: "it already has its crew",
    noFreePilot: "no free pilot: none on foot and none at base (bring pilots home or wait for one)", pilotBusy: "that pilot is busy (not a free AI pilot on foot)", crewEnRoute: "a pilot is already on the way for every empty seat", notMannable: "not a gun you can man (or someone is in it)", // C1 rulings 124-125
    callNotOnFoot: "throw call beacons on foot (in a vehicle the designator marks the spot)", // ruling 128
    callNotSeated: "fire call beacons from a vehicle seat (on foot: throw them)", // ruling 129
    barracksCap: "Barracks full: build or rebuild a Barracks (4 squads each)",
    callHidden: "no vehicle to drop: none in the reserve and none can be built now",
};
/** A reason name in words (the name itself when the table has no text: a newer sim). */
const reasonText = (r) => exports.REASON_TEXT[r] ?? r;
exports.reasonText = reasonText;
/** A REJECT / CALL_REFUSED code (1-based) in words. */
const reasonCodeText = (code) => (0, exports.reasonText)(sim_ts_1.ORDER_REASONS[code - 1] ?? `code ${code}`);
exports.reasonCodeText = reasonCodeText;
/** Reason names the sim has (codes in use) without a text here; the logic test keeps this empty. */
function missingReasonTexts() {
    return sim_ts_1.ORDER_REASONS.map((r, i) => [r, i + 1]).filter(([r]) => !!r && !(r in exports.REASON_TEXT)).map(([r, c]) => `${c} ${r}`);
}
// ------------------------------------------------------------------ item 3: objectives (S13)
/** m:ss */
const clock = (s) => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
exports.clock = clock;
/** The mission's objectives in the sim's order (primary first, then the side objectives). */
const objectiveDefs = (m) => (m ? [m.primary, ...(m.side ?? [])] : []);
exports.objectiveDefs = objectiveDefs;
const TYPE_LABEL = {
    conquest: "Destroy the enemy Command Core", holdPoints: "Hold points", destroyStructure: "Destroy the target", survive: "Survive",
    captureExtract: "Capture and extract", destroyAntiAir: "Destroy the anti-air battery", parTime: "Par time", keepShields: "Keep the Core's shields",
    // C9: fix-qa2 (objectives.ts codes 8-11)
    extractionQuota: "Ship the extraction quota", escort: "Escort", infiltration: "Infiltration", holdout: "Hold out",
};
/**
 * Rows for the objectives panel from the snapshot's match block (every viewer has it) and the scenario's definitions
 * (names, hold seconds, mission timers). `hull`: the largest target hull + shield seen per objective index (destroy
 * objectives send hull left, not a fraction; the caller keeps this map across snapshots).
 */
function objectiveRows(match, defs, tick, dt, team, hull) {
    if (!match)
        return [];
    const now = tick * dt;
    return match.objectives.map((o, i) => {
        const d = defs[i] ?? { type: o.type };
        const status = o.status === objectives_ts_1.OS_DONE ? "done" : o.status === objectives_ts_1.OS_FAILED ? "failed" : "active";
        let progress = o.progress, detail = "", timer = null;
        switch (o.type) {
            case "conquest":
                detail = `Cores destroyed ${o.value}/${o.goal}`;
                break;
            case "holdPoints": {
                const need = d.seconds ?? (o.progress > 0 ? o.timerSeconds / o.progress : 0);
                detail = `points held ${o.value}/${o.goal}${o.value >= o.goal ? "" : ` · need ${o.goal - o.value} more`}`;
                if (status === "active")
                    timer = o.value >= o.goal ? `held ${(0, exports.clock)(o.timerSeconds)} / ${(0, exports.clock)(need)}` : "timer stopped";
                break;
            }
            case "destroyStructure":
            case "destroyAntiAir": {
                const max = Math.max(hull.get(i) ?? 0, o.value);
                hull.set(i, max);
                if (status === "active")
                    progress = max > 0 ? 1 - o.value / max : 0;
                detail = status === "done" ? (o.type === "destroyAntiAir" ? "destroyed · air calls unlocked on that half" : "destroyed") : `target hull + shield ${o.value}`;
                break;
            }
            case "survive":
                detail = `Core standing`;
                if (status === "active")
                    timer = `${(0, exports.clock)(o.goal - o.value)} left`;
                break;
            case "captureExtract":
                detail = o.value ? "point held · extraction running" : "point not held · timer paused";
                if (status === "active")
                    timer = `extraction ${(0, exports.clock)(o.timerSeconds)} / ${(0, exports.clock)(o.goal)}`;
                break;
            case "parTime":
                detail = "finish the primary objective in time";
                if (status === "active")
                    timer = `${(0, exports.clock)(o.goal - o.value)} left`;
                break;
            case "keepShields":
                detail = `Core shield ${o.value}`;
                break;
            // C9: fix-qa2 types (the sidecar adds the shipped totals and the escorted unit's hull: c9.ts objectiveExtra)
            case "extractionQuota":
                detail = "ship ore and gas at the Launch Pad uplink";
                break;
            case "escort":
                detail = `route point ${o.value}/${o.goal}`;
                break;
            case "infiltration":
                detail = `enemy buildings / Cores hacked ${o.value}/${o.goal} · hold E at an enemy wall`;
                break;
            case "holdout":
                detail = `wave ${Math.min(o.goal, o.value + (status === "active" ? 1 : 0))} of ${o.goal}${status === "active" ? ` · ${o.value} survived` : ""}`;
                break;
        }
        if (status === "active" && typeof d.failAfterSeconds === "number")
            timer = `${timer ? timer + " · " : ""}mission ends in ${(0, exports.clock)(d.failAfterSeconds - now)}`;
        return { index: i, name: d.name ?? TYPE_LABEL[o.type] ?? o.type, type: o.type, side: o.side, team: o.team, own: o.team === team, status, progress: Math.max(0, Math.min(1, progress)), detail, timer };
    });
}
/** Feed line and sound for OBJECTIVE_PROGRESS / DONE / FAILED (a index, b type, c team, d permille, v1 value, v2 goal). */
function objectiveEventText(e, defs, team, lastPermille) {
    if (e.kind !== events_ts_1.EV.OBJECTIVE_PROGRESS && e.kind !== events_ts_1.EV.OBJECTIVE_DONE && e.kind !== events_ts_1.EV.OBJECTIVE_FAILED)
        return null;
    const d = defs[e.a], type = objectives_ts_1.OBJ_TYPES[e.b] ?? "objective", own = e.c === team;
    const name = d?.name ?? TYPE_LABEL[type] ?? type, side = d && defs.indexOf(d) > 0 ? "SIDE " : "";
    const who = own ? "" : " · ENEMY";
    if (e.kind === events_ts_1.EV.OBJECTIVE_DONE)
        return { text: `${side}OBJECTIVE DONE · ${name}${who}`, kind: own ? "good" : "bad", sound: own ? "objective-done" : "objective-failed" };
    if (e.kind === events_ts_1.EV.OBJECTIVE_FAILED)
        return { text: `${side}OBJECTIVE FAILED · ${name}${who}`, kind: own ? "bad" : "good", sound: own ? "objective-failed" : "objective-done" };
    const prev = lastPermille.get(e.a) ?? 0;
    lastPermille.set(e.a, e.d);
    if (e.d < prev)
        return { text: `${side}OBJECTIVE · ${name} · timer restarted (${Math.floor(e.d / 10)}%)${who}`, kind: "warn", sound: "objective" };
    return { text: `${side}OBJECTIVE · ${name} · ${Math.floor(e.d / 10)}%${type === "holdPoints" ? ` · ${e.v1}/${e.v2} points` : ""}${who}`, kind: "info", sound: "objective" };
}
/** Why the match ended, in words (match block reason / MATCH_OVER c), for the end panel. */
function matchReasonText(reason, winner, team, defs) {
    const prim = defs[0]?.name ?? (defs[0] ? TYPE_LABEL[defs[0].type] : "the objective");
    if (reason === objectives_ts_1.MR_CORE)
        return winner === team ? "The enemy Command Core was destroyed" : "Your Command Core was destroyed";
    if (reason === objectives_ts_1.MR_OBJECTIVE_DONE)
        return winner === team ? `Objective done: ${prim}` : `The enemy completed its objective: ${prim}`;
    if (reason === objectives_ts_1.MR_OBJECTIVE_FAILED)
        return winner === team ? `The enemy failed its objective: ${prim}` : `Objective failed: ${prim}`;
    return null;
}
// ------------------------------------------------------------------ item 4: the pilot game (S12: downed / revive, demo charge, cloak)
/** Pilot record state while downed (pilotkit.ts P_DOWNED). */
exports.PILOT_DOWNED = pilotkit_ts_1.P_DOWNED;
/** Keys on foot (first person): hold R cloaks, G plants a demo charge; revive is the existing hold E (interact). */
exports.CLOAK_KEY = "KeyR", exports.CLOAK_KEY_LABEL = "R", exports.CHARGE_KEY = "KeyG", exports.CHARGE_KEY_LABEL = "G";
/** CHARGE event flags (pilotkit.ts): 1 planted, 2 detonated, 4 fizzled. CLOAK flags: 1 on, 2 off, 4 broken by firing. */
exports.CH_PLANTED = 1, exports.CH_DETONATED = 2, exports.CH_FIZZLED = 4, exports.CL_ON = 1, exports.CL_OFF = 2, exports.CL_BROKEN = 4;
/** The own-pilot downed overlay: bleed-out countdown and revive progress (DecodedPilot: respawnTicks = ticks to bleed out). */
function downedText(p, dt, solo = false) {
    if (p.state !== pilotkit_ts_1.P_DOWNED)
        return { down: false, seconds: 0, revive: 0, text: "" };
    const seconds = Math.ceil(p.respawnTicks * dt), revive = p.kit?.reviveProgress ?? 0;
    // C8 (QA4 bug 14): alone, nobody can revive; say what comes next instead (the sim has no give-up input)
    const wait = solo ? `DOWNED · no squadmate to revive you · bleed-out in ${seconds} s, then respawn at a Barracks or the Command Core` : `DOWNED · bleeding out in ${seconds} s · a squadmate can revive you: hold E beside your body`;
    return { down: true, seconds, revive, text: revive > 0 ? `BEING REVIVED · ${Math.round(revive * 100)}% · bleed-out in ${seconds} s` : wait };
}
/** Downed squadmates (PLAYER records with state 3 carry the body entity; every teammate sees them). */
function downedMates(players, ents, me, x, z) {
    const out = [];
    for (const p of players?.values() ?? []) {
        if (p.pilotId === me || p.state !== pilotkit_ts_1.P_DOWNED)
            continue;
        const e = ents.get(p.entity);
        if (e)
            out.push({ pilotId: p.pilotId, entity: p.entity, x: e.x, z: e.z, dist: Math.hypot(e.x - x, e.z - z) });
    }
    return out.sort((a, b) => a.dist - b.dist);
}
/** The squadmate a held E revives: the nearest downed one within reach (crew.enterRangeMetres surface gap + body radii). */
const reviveCandidate = (mates, reach) => mates.find((m) => m.dist <= reach) ?? null;
exports.reviveCandidate = reviveCandidate;
/**
 * The demo charge's target: a vehicle or structure of another team (enemy or neutral) whose surface is within reach of
 * the pilot, the one nearest the aim line first (the sim checks the 3 m reach from the body again).
 */
function chargeTarget(list, team, x, z, aimYaw, reach) {
    let best = null, bs = Infinity;
    const ax = Math.cos(aimYaw), az = Math.sin(aimYaw);
    for (const e of list) {
        if (!e.plantable || e.team === team)
            continue;
        const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz), gap = d - e.radius;
        if (gap > reach)
            continue;
        const off = d > 1e-6 ? 1 - (dx * ax + dz * az) / d : 0; // 0 straight ahead, 2 behind
        const score = gap + off * 3;
        if (score < bs) {
            bs = score;
            best = e;
        }
    }
    return best;
}
/** Cloak status on the HUD (kit.cloak 0 ready, 1 active, 2 recharging; cloakTicks: left / until ready). */
function cloakText(kit, dt) {
    if (!kit)
        return "";
    const s = Math.ceil(kit.cloakTicks * dt);
    return kit.cloak === 1 ? `CLOAKED ${s} s` : kit.cloak === 2 ? `cloak recharging ${s} s` : `cloak ready (hold ${exports.CLOAK_KEY_LABEL})`;
}
/** Feed lines for DOWNED / REVIVED / CHARGE / CLOAK (own team). names: pilot id -> squadmate name ("" for an unnamed one). */
function kitEventText(e, me, name, typeName) {
    const who = (id) => (id === me ? "YOU" : (name(id) || "a squadmate").toUpperCase());
    switch (e.kind) {
        case events_ts_1.EV.DOWNED: return e.a === me ? { text: "YOU ARE DOWN · hold on: a squadmate can revive you", kind: "bad" } : { text: `${who(e.a)} IS DOWN · hold E beside them to revive`, kind: "warn" };
        case events_ts_1.EV.REVIVED: return e.a === me ? { text: `REVIVED by ${who(e.b)}`, kind: "good" } : e.b === me ? { text: `YOU REVIVED ${who(e.a)}`, kind: "good" } : { text: `${who(e.a)} REVIVED by ${who(e.b)}`, kind: "good" };
        case events_ts_1.EV.CHARGE: {
            if (e.flags & exports.CH_PLANTED)
                return e.b === me ? { text: `CHARGE PLANTED on the ${typeName(e.c)} · clear the blast`, kind: "info" } : null;
            if (e.flags & exports.CH_DETONATED)
                return e.b === me ? { text: `CHARGE DETONATED · ${typeName(e.c)}`, kind: "good" } : null;
            if (e.flags & exports.CH_FIZZLED)
                return e.b === me ? { text: "CHARGE FIZZLED · the target was gone", kind: "warn" } : null;
            return null;
        }
        case events_ts_1.EV.CLOAK: {
            if (e.a !== me)
                return null;
            if (e.flags & exports.CL_ON)
                return { text: "CLOAKED · moving drains energy · firing breaks it", kind: "info" };
            if (e.flags & exports.CL_BROKEN)
                return { text: "CLOAK BROKEN · you fired", kind: "warn" };
            if (e.flags & exports.CL_OFF)
                return { text: "CLOAK OFF", kind: "info" };
            return null;
        }
    }
    return null;
}
const FX_KINDS = ["none", "strike", "resupply", "drop", "sweep", "barrage", "line", "sentry", "mines", "smoke", "shield", "emp", "pod", "repair", "supply"]; // ruling 121: 13 repair beacon, 14 supply drop
/** What a call looks like (calls.ts CALL_FX_*). */
const callFxKind = (rules, call) => FX_KINDS[rules?.calls[call]?.fx ?? 0] ?? "none";
exports.callFxKind = callFxKind;
/** Calls delivered by a drop pod falling onto the beacon during the delay. */
const podCall = (k) => k === "resupply" || k === "drop" || k === "sentry" || k === "pod" || k === "repair" || k === "supply";
exports.podCall = podCall;
/** Calls whose effect runs along the throw / aim direction (ACT_CALL aimYaw): the line drawn before the throw. */
const lineCall = (k) => k === "line" || k === "smoke";
exports.lineCall = lineCall;
/** Height of a falling pod over the beacon (null: not falling yet); it falls the last `fallS` seconds, accelerating. */
function podHeight(secondsLeft, fallS = 2.5, top = 320) {
    if (secondsLeft > fallS || secondsLeft < 0)
        return null;
    const k = secondsLeft / fallS;
    return top * k * k;
}
/** Points along a line from (x, z) in direction yaw (radians, x = cos, z = sin), length len, n + 1 points. */
function linePoints(x, z, yaw, len, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
        const t = (i / n) * len;
        out.push([x + Math.cos(yaw) * t, z + Math.sin(yaw) * t]);
    }
    return out;
}
/** "2 of 3 left" for air calls with uses before the rearm (own[].usesLeft); "" otherwise. */
const usesText = (usesLeft, uses) => (uses > 1 && usesLeft > 0 ? `${usesLeft} of ${uses} left` : "");
exports.usesText = usesText;
/**
 * Lasting call effects from the snapshot's zones (w2a): sentry (value = its entity), minefield (value = live-mine
 * bitmask; only the laying team gets it), smoke wall, shield dome, heavy weapon pod (value = weapon index), barrage.
 */
function zoneModels(block, rules, tick, dt, team, mapSize, weaponName, names) {
    if (!block || !rules)
        return [];
    return (block.zones ?? []).map((zn) => {
        const def = rules.calls[zn.call], kind = (0, exports.callFxKind)(rules, zn.call), secondsLeft = zn.endTick > 0 ? Math.max(0, (zn.endTick - tick) * dt) : null;
        const nm = names[zn.call] ?? def?.id ?? "call", t = secondsLeft !== null ? ` · ${Math.ceil(secondsLeft)} s` : "";
        const mines = [];
        let label = `${nm.toUpperCase()}${t}`;
        if (kind === "mines" && def) {
            const out = [0, 0];
            for (let k = 0; k < Math.min(def.count, 31); k++)
                if (zn.value & (1 << k)) {
                    (0, calls_ts_1.minePoint)(zn.beacon, k, zn.x, zn.z, def.radius, mapSize, out);
                    mines.push([out[0], out[1]]);
                }
            label = `MINEFIELD · ${mines.length} live`;
        }
        else if (kind === "pod")
            label = (rules.fixed ?? []).includes(zn.call) ? `ANTI-ARMOUR · ${weaponName(zn.value).toUpperCase()} + SPARE ROCKETS${t} · walk over it` : `HEAVY WEAPON POD · ${weaponName(zn.value)}${t} · walk over it`; // ruling 133
        else if (kind === "sentry")
            label = `SENTRY${t}`;
        else if (kind === "repair")
            label = `REPAIR BEACON${t} · vehicles and buildings within ${def?.radius ?? 15} m`; // ruling 121
        else if (kind === "barrage")
            label = `BARRAGE · ${zn.value} shells`;
        return { beacon: zn.beacon, call: zn.call, kind, team: zn.team, own: zn.team === team, x: zn.x, z: zn.z, yaw: zn.dirYaw, len: def?.lineLength ?? 40, width: def?.width ?? 6, radius: def?.radius ?? 10, secondsLeft, label, mines };
    });
}
/** Feed lines for CALL_EFFECT sub-kinds the player should know about (mine set off, pod taken, sentry online). */
function callEffectText(e, rules, names, me, weaponName) {
    const sub = e.flags & 15, nm = (names[e.c] ?? "call").toUpperCase();
    void rules;
    if (sub === calls_ts_1.CE_MINE)
        return { text: `MINE SET OFF${e.flags & 16 ? " · it hit something" : ""}`, kind: "warn" };
    const aa = !!rules && (rules.fixed ?? []).includes(e.c); // ruling 133: the anti-armour rocket tube drop
    if (sub === calls_ts_1.CE_PICKUP)
        return e.d === me ? { text: aa ? `ROCKET TUBE · picked up with spare rockets · weapon 2 until you die · 700 explosive, a Lancer in 3 hits` : `HEAVY WEAPON · picked up · it replaces your long rifle (2) until you die`, kind: "good" } : { text: aa ? "ROCKET TUBE DROP taken" : "HEAVY WEAPON POD taken", kind: "info" };
    if (sub === calls_ts_1.CE_START && (0, exports.callFxKind)(rules, e.c) === "sentry")
        return { text: `${nm} ONLINE · 90 s`, kind: "info" };
    if (sub === calls_ts_1.CE_START && (0, exports.callFxKind)(rules, e.c) === "pod")
        return { text: `${nm} DOWN · ${weaponName(e.d)} · walk over it`, kind: "info" };
    if (sub === calls_ts_1.CE_START && (0, exports.callFxKind)(rules, e.c) === "emp")
        return { text: `EMP · ${e.d} disabled for 8 s`, kind: "info" };
    return null;
}
/** Loadout editing: a call toggled in or out, at most `slots` calls, in the order picked. */
function toggleLoadout(list, id, slots) {
    if (list.includes(id))
        return list.filter((x) => x !== id);
    return list.length >= slots ? [...list] : [...list, id];
}
/** What a weather does, in a few words (weather.json effects). */
function weatherEffectText(w) {
    const e = w?.effects ?? {}, out = [];
    if (typeof e.sightMultiplier === "number")
        out.push(`sight x${e.sightMultiplier}`);
    if (typeof e.sightRangeMetres === "number")
        out.push(`sight ${e.sightRangeMetres} m`);
    if (e.radarBlind)
        out.push("radar blind");
    if (typeof e.visualDetectionMultiplier === "number")
        out.push("hard to see");
    if (e.aircraftGrounded)
        out.push("aircraft grounded");
    if (e.shieldsOffline)
        out.push("shields offline");
    if (e.orbitalCallsUnavailable)
        out.push("no orbital calls");
    if (e.shieldRechargeSlow)
        out.push("shields recharge slowly");
    if (typeof e.fireAndExplosiveDamageBonus === "number")
        out.push(`fire and explosives +${Math.round(Number(e.fireAndExplosiveDamageBonus) * 100)}%`);
    if (e.softGroundEverywhere)
        out.push("soft ground everywhere");
    return out.join(", ");
}
/** The HUD line: current weather (and when it ends), the forecast (and when it starts). Indices into weather.json. */
function weatherHud(w, defs, tick, dt) {
    if (!w)
        return { current: null, currentId: null, next: null, text: "" };
    const cur = w.current >= 0 ? defs[w.current] : undefined, nx = w.next >= 0 ? defs[w.next] : undefined;
    const parts = [];
    if (cur && cur.id !== "clear")
        parts.push(`${cur.name.toUpperCase()}${w.endsTick > 0 ? ` · ends in ${(0, exports.clock)((w.endsTick - tick) * dt)}` : ""}`);
    else
        parts.push("CLEAR");
    if (nx && nx.id !== "clear")
        parts.push(`next: ${nx.name}${w.startsTick > 0 ? ` in ${(0, exports.clock)((w.startsTick - tick) * dt)}` : ""}`);
    return { current: cur?.name ?? null, currentId: cur?.id ?? null, next: nx?.name ?? null, text: parts.join(" · ") };
}
/** Feed line for WEATHER (70): a weather index, b phase (0 forecast, 1 started, 2 ended), c ticks. */
function weatherEventText(e, defs, dt) {
    if (e.kind !== events_ts_1.EV.WEATHER)
        return null;
    const w = defs[e.a], nm = (w?.name ?? "weather").toUpperCase(), fx = weatherEffectText(w);
    if (e.b === 0)
        return { text: `WEATHER WARNING · ${nm} in ${Math.round(e.c * dt)} s${fx ? ` · ${fx}` : ""}`, kind: "warn" };
    if (e.b === 1)
        return { text: `WEATHER · ${nm}${fx ? ` · ${fx}` : ""}`, kind: "warn" };
    if (e.b === 2)
        return { text: `WEATHER CLEARING · ${nm} is over`, kind: "info" };
    return null;
}
function weatherLook(id) {
    switch (id) {
        case "night": return { fogStart: null, fogMul: 1.6, tint: [0.12, 0.16, 0.3], tintK: 0.7, light: 0.35, overlay: "wx-night" };
        case "dust-storm": return { fogStart: 20, fogMul: 9, tint: [0.75, 0.52, 0.3], tintK: 0.65, light: 0.75, overlay: "wx-dust" };
        case "fog-bank": return { fogStart: 10, fogMul: 14, tint: [0.78, 0.8, 0.8], tintK: 0.75, light: 0.85, overlay: "wx-fog" };
        case "electrical-storm": return { fogStart: null, fogMul: 2.2, tint: [0.3, 0.33, 0.42], tintK: 0.55, light: 0.6, overlay: "wx-storm" };
        case "ash-fall": return { fogStart: 30, fogMul: 5, tint: [0.35, 0.32, 0.3], tintK: 0.6, light: 0.6, overlay: "wx-ash" };
        case "solar-flare": return { fogStart: null, fogMul: 1, tint: [1, 0.95, 0.8], tintK: 0.35, light: 1.35, overlay: "wx-flare" };
        case "methane-rain": return { fogStart: 40, fogMul: 4, tint: [0.35, 0.5, 0.48], tintK: 0.5, light: 0.7, overlay: "wx-rain" };
    }
    return { fogStart: null, fogMul: 1, tint: [1, 1, 1], tintK: 0, light: 1, overlay: "" };
}
/** The scenario's terrain layer (W2d: scenario.terrainLayer, else the map's own; null: none). */
function terrainLayerOf(sc, map) {
    return sc.terrainLayer ?? map.terrainLayer ?? null;
}
/** Terrain type at (x, z): the legend's id; a lava liquid is "lava". null off the layer. */
function layerTypeAt(L, x, z) {
    if (!L)
        return null;
    const i = Math.floor(x / L.cellMetres), j = Math.floor(z / L.cellMetres), row = L.rows[j];
    if (!row || i < 0 || i >= row.length)
        return null;
    const v = L.legend[row[i]];
    if (v === undefined)
        return null;
    if (typeof v === "string")
        return v;
    return v.lava ? "lava" : v.type;
}
/** Ground colours per planet (planets.json look): olive, ochre, dark, mud, slate. */
function planetPalette(planet) {
    switch (planet) {
        case "rust": return { olive: [0.56, 0.36, 0.22], ochre: [0.7, 0.5, 0.3], dark: [0.42, 0.26, 0.18], mud: [0.45, 0.3, 0.2], slate: [0.5, 0.38, 0.33] };
        case "pale": return { olive: [0.5, 0.5, 0.52], ochre: [0.62, 0.62, 0.64], dark: [0.34, 0.34, 0.36], mud: [0.42, 0.42, 0.43], slate: [0.3, 0.3, 0.32] };
        case "brume": return { olive: [0.24, 0.38, 0.36], ochre: [0.34, 0.46, 0.42], dark: [0.17, 0.27, 0.27], mud: [0.27, 0.32, 0.3], slate: [0.36, 0.42, 0.42] };
        case "cinder": return { olive: [0.2, 0.18, 0.17], ochre: [0.32, 0.25, 0.2], dark: [0.13, 0.12, 0.12], mud: [0.26, 0.2, 0.17], slate: [0.24, 0.23, 0.23] };
    }
    return { olive: [0.4, 0.5, 0.25], ochre: [0.58, 0.55, 0.32], dark: [0.31, 0.44, 0.21], mud: [0.44, 0.36, 0.25], slate: [0.47, 0.46, 0.42] }; // G1: the concept's greens
}
/** Ground tint per terrain type (and planet: soft ground is snow on Halcyon, dust on Rust, ash on Cinder), with its weight. */
function terrainTint(type, planet) {
    switch (type) {
        case null:
        case "open-plain": return null;
        case "soft-ground": return { c: planet === "halcyon" ? [0.88, 0.9, 0.92] : planet === "cinder" ? [0.3, 0.29, 0.28] : planet === "rust" ? [0.78, 0.6, 0.42] : [0.5, 0.5, 0.46], k: 0.7 };
        case "ridge": return { c: [0.55, 0.53, 0.48], k: 0.35 };
        case "canyon": return { c: [0.3, 0.2, 0.15], k: 0.6 };
        case "crater-field": return { c: [0.35, 0.34, 0.33], k: 0.5 };
        case "ice-glass-flats": return { c: [0.75, 0.82, 0.88], k: 0.75 };
        case "lava": return { c: [1.0, 0.42, 0.08], k: 0.9 };
        case "liquid": return { c: planet === "brume" ? [0.1, 0.25, 0.28] : [0.2, 0.3, 0.35], k: 0.85 };
        case "cliffs": return { c: [0.25, 0.24, 0.24], k: 0.6 };
        case "rock-forest-ruins": return { c: [0.22, 0.26, 0.2], k: 0.45 };
        case "caves-tunnels": return { c: [0.15, 0.14, 0.13], k: 0.6 };
    }
    return null;
}
/** Fortification of a point: its level, the next level's cost and what it adds (points.json fortification.levels). */
function fortifyInfo(levels, level) {
    const cur = levels.find((l) => l.level === level), nx = levels.find((l) => l.level === level + 1);
    return { level, name: cur?.name ?? `level ${level}`, next: nx ? { level: nx.level, name: nx.name, ore: nx.cost?.ore ?? 0, gas: nx.cost?.gas ?? 0, adds: nx.adds ?? "" } : null };
}
/**
 * Power per point (W2b, not on the wire): the sum of buildings.json `power` of the owner's finished structures inside
 * the point's area (the sim's rule). Negative: underpowered (half production speed and turret fire rate).
 */
function pointPower(st, owners, structures, tPower) {
    const out = st.map(() => ({ supply: 0, draw: 0, net: 0 }));
    for (const s of structures) {
        if (s.building)
            continue;
        let best = -1, bd = Infinity;
        for (const p of st) {
            const d = Math.hypot(s.x - p.x, s.z - p.z);
            if (d <= p.radius && d < bd) {
                bd = d;
                best = p.index;
            }
        }
        if (best < 0 || owners[best] !== s.team)
            continue;
        const w = tPower[s.type] ?? 0, o = out[best];
        if (w > 0)
            o.supply += w;
        else
            o.draw -= w;
        o.net += w;
    }
    return out;
}
const powerText = (p) => p.net < 0 ? `LOW POWER ${p.net} (supply ${p.supply}, draw ${p.draw}) · production and turrets at half speed · build a Reactor` : `power ${p.net >= 0 ? "+" : ""}${p.net} (supply ${p.supply}, draw ${p.draw})`;
exports.powerText = powerText;
/** What a tier building opens (constants.techTiers[N].requires): the units and buildings of that tier. */
function tierUnlocks(data, buildingId) {
    const tiers = (data.constants.techTiers ?? {});
    const t = Object.entries(tiers).find(([, v]) => v.requires?.includes(buildingId));
    if (!t)
        return "";
    const n = Number(t[0]);
    const units = data.units.filter((u) => u.tier === n).map((u) => u.name);
    const blds = data.buildings.filter((b) => b.tier === n && b.id !== buildingId).map((b) => b.name);
    const all = [...units, ...blds];
    return `unlocks tier ${n}${t[1].suppliedPoints ? ` (with ${t[1].suppliedPoints} supplied points)` : ""}: ${all.slice(0, 6).join(", ")}${all.length > 6 ? ` +${all.length - 6}` : ""}`;
}
/**
 * U1: the panel of a building that opens a tech tier (Armoury: tier 2, Tech Lab: tier 3): whether the tier is open
 * now (closed: the page's tier reason, e.g. supplied points still missing) and what it unlocks. Empty for other buildings.
 */
function tierPanelHtml(data, buildingId, closedReason, underConstruction) {
    const tiers = (data.constants.techTiers ?? {});
    const t = Object.entries(tiers).find(([, v]) => v.requires?.includes(buildingId));
    if (!t)
        return "";
    const n = Number(t[0]), un = tierUnlocks(data, buildingId).replace(/^unlocks /, "");
    const state = underConstruction ? `<span class="w">still under construction: tier ${n} opens when it is finished</span>`
        : closedReason ? `<span class="w">tier ${n} still closed · ${closedReason}</span>` : `<b>tier ${n} open</b>`;
    const extra = data.buildings.find((b) => b.id === buildingId)?.effects ?? {};
    const later = extra.weaponSwap || extra.rearm ? `<div class="note">Weapon swap and rearm at the ${buildingId === "armoury" ? "Armoury" : "building"} are not in the game yet: its job now is opening tier ${n}.</div>` : "";
    return `<div class="ph2">TECH TIER ${n}</div><div class="note">${state} · ${un}</div>${later}`;
}
/** Feed lines for FORTIFY 50 / FORWARD_BASE 51 (every viewer; c / team say whose). WRECK 52 is gone (ruling 106). */
function economyEventText(e, team, pointName, levelName, typeName) {
    if (e.kind === events_ts_1.EV.FORTIFY) {
        const own = e.c === team, at = pointName(e.a), who = own ? "" : " · ENEMY";
        if (e.b === economy2_ts_1.FE_STARTED)
            return { text: `FORTIFYING ${at} → ${levelName(e.d)} · ${e.v1} s of work${who}`, kind: own ? "info" : "warn" };
        if (e.b === economy2_ts_1.FE_DONE)
            return { text: `FORTIFIED ${at} · ${levelName(e.d)}${who}`, kind: own ? "good" : "warn" };
        if (e.b === economy2_ts_1.FE_ENDED)
            return { text: `FORTIFY STOPPED · ${at}${who}`, kind: "warn" };
        if (e.b === economy2_ts_1.FE_LOST)
            return { text: `FORTIFICATION LOST · ${at}${who}`, kind: own ? "bad" : "good" };
    }
    if (e.kind === events_ts_1.EV.FORWARD_BASE) {
        const own = e.team === team, at = e.c >= 0 ? pointName(e.c) : "the field", who = own ? "" : " · ENEMY";
        const T = { [economy2_ts_1.FB_DEPLOYING]: `FORWARD BASE DEPLOYING at ${at} · ${e.v1} s`, [economy2_ts_1.FB_DEPLOYED]: `FORWARD BASE DEPLOYED at ${at}`, [economy2_ts_1.FB_CANCELLED]: `FORWARD BASE DEPLOY CANCELLED`, [economy2_ts_1.FB_PACKING]: `FORWARD BASE PACKING at ${at} · ${e.v1} s`, [economy2_ts_1.FB_PACKED]: `FORWARD BASE PACKED UP at ${at}`, [economy2_ts_1.FB_SHUTDOWN]: `FORWARD BASE SHUT DOWN at ${at} · cut off from supply`, [economy2_ts_1.FB_RESTORED]: `FORWARD BASE BACK ONLINE at ${at}` };
        if (e.b === economy2_ts_1.FB_DEFENCES || e.b === economy2_ts_1.FB_FOLDING)
            return { text: (0, fb1_ts_1.defenceText)(e.b === economy2_ts_1.FB_DEFENCES ? "unfold" : "fold", e.d, at, own), kind: own ? "info" : "warn" }; // ruling 132
        const t = T[e.b];
        return t ? { text: t + who, kind: e.b === economy2_ts_1.FB_SHUTDOWN ? (own ? "bad" : "good") : own ? "info" : "warn" } : null;
    }
    return null;
}
// ------------------------------------------------------------------ item 7: units (W2c): aircraft, gunners, passengers
/** Gunner seat: RMB held shows the zoomed sight (FOV in degrees). */
exports.GUNNER_ZOOM_FOV = 24;
/** The aircraft pilot's line: hold C to land / stay landed (queuePilotControl crouch). C8 (QA4 bug 5): `height` is the
 * height above the ground (c8.ts aircraftHeight: the type's flight height plus the snapshot's offset), not the offset;
 * LANDED only on the ground (under half a metre), so a descent below the cruise height is no longer read as landed. */
function aircraftPrompt(height, crouch) {
    if (height < 0.5)
        return crouch ? "LANDED · release C to lift off" : "LIFTING OFF";
    return crouch ? `LANDING · ${Math.round(height)} m · keep C held` : `ALT ${Math.round(height)} m · hold C to land (an Air Pad rearms)`;
}
/** Landed / lifted off from the own aircraft's altitude sign (AIRCRAFT_LANDING is host-only). null: no change. */
function landingChange(prevAlt, alt) {
    if (prevAlt === null)
        return null;
    if (prevAlt >= 0 && alt < 0)
        return "landed";
    if (prevAlt < 0 && alt >= 0)
        return "lifted";
    return null;
}
/** Passenger view line: the vehicle, its hull, altitude / speed, who drives it, how many ride. */
function passengerText(o) {
    return `PASSENGER · ${o.name.toUpperCase()} · hull ${Math.round(o.hull * 100)}%${o.air ? ` · alt ${Math.max(0, Math.round(o.alt))} m` : ""} · ${Math.round(o.speed * 3.6)} km/h · driver: ${o.driver} · aboard ${o.riders}/${o.seats}`;
}
/** Feed lines for AIRCRAFT_DOWN / PASSENGER_LOST / AIRCRAFT_LANDING (when the stream carries them). */
function unitEventText(e, me, team, typeName, entTeam) {
    if (e.kind === events_ts_1.EV.AIRCRAFT_DOWN) {
        const own = entTeam(e.a) === team;
        return { text: `AIRCRAFT DOWN · ${typeName(e.b)} from ${e.c} m${own ? "" : " · enemy"}`, kind: own ? "bad" : "good" };
    }
    if (e.kind === events_ts_1.EV.PASSENGER_LOST)
        return { text: e.a === me ? "YOU DID NOT SURVIVE THE CRASH" : "PASSENGER LOST in the wreck", kind: "bad" };
    if (e.kind === events_ts_1.EV.AIRCRAFT_LANDING)
        return null; // the own aircraft's line: c7b landingEventText
    return null;
}
// ------------------------------------------------------------------ item 8: vision (S9): last-seen ghosts, muzzle reveal, enemy sites
/**
 * The client's own memory of enemy units (the sim sends no last-known positions: a contact drops off the wire 6 s
 * after its last sighting). A unit that leaves the wire becomes a ghost at its last position for `keepMs`; a death of
 * its type close by at that moment removes it (the sidecar deaths carry type and position, not the id).
 */
class UnitMemory {
    seen = new Map();
    ghostsById = new Map();
    keepMs;
    constructor(keepMs = 30000) { this.keepMs = keepMs; }
    update(enemies, now, deaths) {
        const on = new Set();
        for (const e of enemies) {
            on.add(e.id);
            this.seen.set(e.id, { type: e.type, team: e.team, x: e.x, z: e.z, t: now });
            this.ghostsById.delete(e.id);
        }
        for (const [id, s] of this.seen) {
            if (on.has(id))
                continue;
            this.seen.delete(id);
            // C7b: UNIT_DIED names the entity; a death without an id (older paths) matches by type and place
            const died = deaths.some((d) => d.id === id || (d.id === undefined && d.type === s.type && Math.abs(d.t - now) < 2500 && Math.hypot(d.x - s.x, d.z - s.z) < 20));
            if (!died)
                this.ghostsById.set(id, { type: s.type, team: s.team, x: s.x, z: s.z, lost: now });
        }
        for (const [id, g] of this.ghostsById)
            if (now - g.lost > this.keepMs)
                this.ghostsById.delete(id);
    }
    /** Ghosts with their age (s), for drawing. A late death of the type nearby clears one too. */
    ghosts(now, deaths) {
        const out = [];
        for (const [id, g] of this.ghostsById) {
            if (deaths.some((d) => d.id === id || (d.id === undefined && d.type === g.type && d.t >= g.lost - 2500 && Math.hypot(d.x - g.x, d.z - g.z) < 20))) {
                this.ghostsById.delete(id);
                continue;
            }
            out.push({ id, type: g.type, team: g.team, x: g.x, z: g.z, age: (now - g.lost) / 1000 });
        }
        return out;
    }
    clear() { this.seen.clear(); this.ghostsById.clear(); }
}
exports.UnitMemory = UnitMemory;
/** Muzzle reveal (S9): enemy shooters of the recent shots and projectiles (they are on the wire for 4 s after firing). */
function recentShooters(shots, projectiles, teamOf, team) {
    const out = new Set();
    for (const s of shots)
        if (s.shooter && teamOf(s.shooter) !== team && teamOf(s.shooter) >= 0)
            out.add(s.shooter);
    for (const p of projectiles)
        if (p.shooter && p.team !== team)
            out.add(p.shooter);
    return out;
}
/** Enemy building sites are shown only while their structure is on the wire (seen); own sites always. */
const siteVisible = (site, onWire) => site.own || (site.entity !== 0 && onWire(site.entity));
exports.siteVisible = siteVisible;
