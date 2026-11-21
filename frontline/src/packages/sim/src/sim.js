"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACT_EXIT = exports.ACT_ENTER = exports.ACT_PACK_BASE = exports.ACT_DEPLOY_BASE = exports.ACT_FORTIFY = exports.HOLD_NAMES = exports.HOLD_BARRACKS_CAP = exports.HOLD_CORE_DISABLED = exports.HOLD_UNSUPPLIED = exports.HOLD_CAPACITY = exports.HOLD_TIER = exports.HOLD_HOST_CAP = exports.HOLD_MAP_CAP = exports.HOLD_RESOURCES = exports.HOLD_NONE = exports.TOOL_TORCH = exports.TOOL_NONE = exports.PC_GUNNER_SET = exports.PC_GUNNER = exports.PC_INTERACT = exports.ST_PRONE = exports.ST_CROUCH = exports.ST_STAND = exports.PC_PRONE = exports.PC_JET = exports.PC_JUMP = exports.PC_CROUCH = exports.PC_SPRINT = exports.AIR_EJECTING = exports.AIR_FLYING = exports.AIR_GROUND = exports.SHF_GUN = exports.SH_CAPTURED = exports.SH_DESTROYED = exports.SH_LEAVE = exports.SH_ENTER = exports.GUN_SEAT_BIT = exports.SHELTER_GUN = exports.ACT_SHELTER = exports.P_SHELTER = exports.P_DEAD = exports.P_FOOT = exports.P_SEATED = exports.ORD_ATTACK_GROUND = exports.ORD_PICKUP = exports.ORD_ATTACK = exports.ORD_ATTACK_MOVE = exports.ORD_MOVE = exports.ORD_NONE = exports.MAX_TEAMS = void 0;
exports.PILOT_FIELDS = exports.ORDER_REASONS = exports.STAT_KEYS = exports.Sim = exports.ACT_RESERVE_MODE = exports.ACT_RAPID_REINFORCE = exports.ACT_RECALL = exports.ACT_RESERVE_DEPLOY = exports.ACT_GARRISON = exports.ACT_AUTO_DEFEND = exports.ACT_GROUP_REINFORCE = exports.ACT_GROUP_WAYPOINT = exports.ACT_GROUP_ORDER = exports.ACT_GROUP_SET = exports.ACT_LIFT = exports.ACT_UNLOAD = exports.ACT_LOAD = exports.ACT_FIRE_CALL = exports.ACT_THROW_CALL = exports.ACT_CMD_CALL = exports.ACT_LOADOUT = exports.ACT_CHARGE = exports.ACT_CALL = exports.ACT_CANCEL_BUILD = exports.ACT_BUILD = exports.ACT_HARVEST = exports.ACT_RALLY = exports.ACT_CANCEL = exports.ACT_QUEUE = exports.ACT_EJECT = exports.ACT_SWITCH = void 0;
exports.newStats = newStats;
exports.reasonCode = reasonCode;
exports.cloneOrder = cloneOrder;
exports.pilotNumbers = pilotNumbers;
exports.pilotFromNumbers = pilotFromNumbers;
exports.queueNumbers = queueNumbers;
exports.queueFromNumbers = queueFromNumbers;
exports.orderNumbers = orderNumbers;
exports.orderFromNumbers = orderFromNumbers;
exports.hitDamage = hitDamage;
exports.ballisticSolve = ballisticSolve;
exports.createSim = createSim;
exports.hashFloats = hashFloats;
exports.buildYawStep = buildYawStep;
exports.orderWellFormed = orderWellFormed;
exports.callOptionCode = callOptionCode;
const data_ts_1 = require("./data.js");
const events_ts_1 = require("./events.js");
const prng_ts_1 = require("./prng.js");
const terrain_ts_1 = require("./terrain.js");
const relief_ts_1 = require("./relief.js");
const fmath_ts_1 = require("./fmath.js");
const grid_ts_1 = require("./grid.js");
const cheats_ts_1 = require("./cheats.js");
const dispatch_ts_1 = require("./dispatch.js");
const s15_ts_1 = require("./s15.js");
const netsnap_ts_1 = require("./netsnap.js");
const state_ts_1 = require("./state.js");
const data_ts_2 = require("./data.js");
const points_ts_1 = require("./points.js");
const construction_ts_1 = require("./construction.js");
const mining_ts_1 = require("./mining.js");
const match_ts_1 = require("./match.js");
const calls_ts_1 = require("./calls.js");
const enemy_ai_ts_1 = require("./enemy-ai.js");
const strongpoints_ts_1 = require("./strongpoints.js");
Object.defineProperty(exports, "ACT_GARRISON", { enumerable: true, get: function () { return strongpoints_ts_1.ACT_GARRISON; } });
const bldfx_ts_1 = require("./bldfx.js");
const reserve_ts_1 = require("./reserve.js");
Object.defineProperty(exports, "ACT_RESERVE_DEPLOY", { enumerable: true, get: function () { return reserve_ts_1.ACT_RESERVE_DEPLOY; } });
Object.defineProperty(exports, "ACT_RECALL", { enumerable: true, get: function () { return reserve_ts_1.ACT_RECALL; } });
Object.defineProperty(exports, "ACT_RAPID_REINFORCE", { enumerable: true, get: function () { return reserve_ts_1.ACT_RAPID_REINFORCE; } });
Object.defineProperty(exports, "ACT_RESERVE_MODE", { enumerable: true, get: function () { return reserve_ts_1.ACT_RESERVE_MODE; } });
const battlegroups_ts_1 = require("./battlegroups.js");
Object.defineProperty(exports, "ACT_GROUP_SET", { enumerable: true, get: function () { return battlegroups_ts_1.ACT_GROUP_SET; } });
Object.defineProperty(exports, "ACT_GROUP_ORDER", { enumerable: true, get: function () { return battlegroups_ts_1.ACT_GROUP_ORDER; } });
Object.defineProperty(exports, "ACT_GROUP_WAYPOINT", { enumerable: true, get: function () { return battlegroups_ts_1.ACT_GROUP_WAYPOINT; } });
Object.defineProperty(exports, "ACT_GROUP_REINFORCE", { enumerable: true, get: function () { return battlegroups_ts_1.ACT_GROUP_REINFORCE; } });
Object.defineProperty(exports, "ACT_AUTO_DEFEND", { enumerable: true, get: function () { return battlegroups_ts_1.ACT_AUTO_DEFEND; } });
const unit_ai_ts_1 = require("./unit-ai.js");
const pathfinding_ts_1 = require("./pathfinding.js");
const transport_ts_1 = require("./transport.js");
const progression_ts_1 = require("./progression.js");
const pilotkit_ts_1 = require("./pilotkit.js");
const stealth_ts_1 = require("./stealth.js");
const coop_ts_1 = require("./coop.js");
const env_ts_1 = require("./env.js");
const terrainlayer_ts_1 = require("./terrainlayer.js");
const weather_ts_1 = require("./weather.js");
const planet_ts_1 = require("./planet.js");
const pilotpool_ts_1 = require("./pilotpool.js");
const economy2_ts_1 = require("./economy2.js");
const orders_ts_1 = require("./orders.js");
const lanes_ts_1 = require("./lanes.js");
const fkit_ts_1 = require("./fkit.js");
exports.MAX_TEAMS = 4;
exports.ORD_NONE = 0, exports.ORD_MOVE = 1, exports.ORD_ATTACK_MOVE = 2, exports.ORD_ATTACK = 3, exports.ORD_PICKUP = 4;
/** Ruling 40: an `attack` order with a ground point (order.ground): indirect-fire mounts shell waypoints[s] = [x, z]. */
exports.ORD_ATTACK_GROUND = 5;
/** Pilot states (Pilot.state). */
exports.P_SEATED = 0, exports.P_FOOT = 1, exports.P_DEAD = 2;
/** Ruling 121 (F3, designer 16 Nov): a player pilot inside an own Citadel / Command Core (P_DOWNED = 3 is pilotkit's). */
exports.P_SHELTER = 4;
/** Ruling 121: ACT_SHELTER (a pilot id, b 1 enter structure c / 0 leave). */
exports.ACT_SHELTER = 62;
/** Ruling 125 (C1): ACT_SHELTER b 2 = man the gun seat of structure c (a pilot state P_SHELTER with seat 0). ctlMask bit of a manned gun seat on the structure. */
exports.SHELTER_GUN = 2, exports.GUN_SEAT_BIT = 0x8000;
/** Ruling 121: SHELTER event c: 1 entered, 2 left, 3 thrown out (destroyed), 4 thrown out (captured). */
exports.SH_ENTER = 1, exports.SH_LEAVE = 2, exports.SH_DESTROYED = 3, exports.SH_CAPTURED = 4;
/** Ruling 125: SHELTER event flag: the pilot is (was) the gunner of a manned turret, not inside a command seat. */
exports.SHF_GUN = 1;
/** Pilot on-foot airborne states (Sim.airborne). */
exports.AIR_GROUND = 0, exports.AIR_FLYING = 1, exports.AIR_EJECTING = 2;
/** Pilot control flag bits (PilotControlInput booleans). */
exports.PC_SPRINT = 1, exports.PC_CROUCH = 2, exports.PC_JUMP = 4, exports.PC_JET = 8;
/** Ruling 42: held prone key (control flags bit 8; ctlFlags is 16 bits wide since state v23). Prone wins over crouch. */
exports.PC_PRONE = 256;
/** Ruling 42 pilot stances (Sim.stance low 2 bits: current; bits 2-3: the stance a transition is heading to). */
exports.ST_STAND = 0, exports.ST_CROUCH = 1, exports.ST_PRONE = 2;
/** Held interact (PilotControlInput.interact): a player pilot on foot at a point's terminal hacks it (strategic points). */
exports.PC_INTERACT = 64;
/**
 * Driver seat (CONTRACTS rev 4): PC_GUNNER_SET = the input carried PilotControlInput.gunnerWeapon (true or false);
 * PC_GUNNER = it was true (fire bit 0 fires the empty gunner seats' weapons instead of the driver's own).
 */
exports.PC_GUNNER = 16, exports.PC_GUNNER_SET = 32;
/** Pilot tools (PilotControlInput.tool). */
exports.TOOL_NONE = 0, exports.TOOL_TORCH = 1;
/** Production hold reasons (ProductionQueue.hold). */
/** Hold codes (wire). 2 was HOLD_COMMAND_POINTS: retired with Command Points (S14, ruling 48); never set. */
exports.HOLD_NONE = 0, exports.HOLD_RESOURCES = 1, exports.HOLD_MAP_CAP = 3, exports.HOLD_HOST_CAP = 4, exports.HOLD_TIER = 5, exports.HOLD_CAPACITY = 6;
/** Strategic points: the building stands on a point that is not supplied (or on no point) on a map with points. */
exports.HOLD_UNSUPPLIED = 7;
/** Ruling 29: the Command Core was hacked and is disabled (points.commandCore.disabledSeconds); nothing charged, queue kept. */
exports.HOLD_CORE_DISABLED = 8;
/** S14 (ruling 65): an infantry squad waits at roll-out while the team's squads are at its Barracks cap (production.squadsPerBarracks). */
exports.HOLD_BARRACKS_CAP = 9;
exports.HOLD_NAMES = ["none", "resources", "unused", "mapCap", "hostCap", "tierLocked", "entityCapacity", "unsupplied", "coreDisabled", "barracksCap"];
var economy2_ts_2 = require("./economy2.js");
Object.defineProperty(exports, "ACT_FORTIFY", { enumerable: true, get: function () { return economy2_ts_2.ACT_FORTIFY; } });
Object.defineProperty(exports, "ACT_DEPLOY_BASE", { enumerable: true, get: function () { return economy2_ts_2.ACT_DEPLOY_BASE; } });
Object.defineProperty(exports, "ACT_PACK_BASE", { enumerable: true, get: function () { return economy2_ts_2.ACT_PACK_BASE; } });
exports.ACT_ENTER = 1, exports.ACT_EXIT = 2, exports.ACT_SWITCH = 3, exports.ACT_EJECT = 4, exports.ACT_QUEUE = 5, exports.ACT_CANCEL = 6, exports.ACT_RALLY = 7, exports.ACT_HARVEST = 8, exports.ACT_BUILD = 9, exports.ACT_CANCEL_BUILD = 10, exports.ACT_CALL = 11, exports.ACT_CHARGE = 12;
/** w2a (reserved 20-24): set a pilot's call loadout in the match; the enemy commander's support call. */
exports.ACT_LOADOUT = 20, exports.ACT_CMD_CALL = 21;
/** Ruling 128: a player pilot on foot throws the armed call's beacon (a pilot, b call index, c option code, x aim yaw, z aim pitch). */
exports.ACT_THROW_CALL = 64;
/** Ruling 129: a seated player pilot fires the armed call's beacon from the vehicle at (x, z) (a pilot, b call index, c option code). */
exports.ACT_FIRE_CALL = 65;
/** w2e transports (transport.ts; reserved action kinds 30-34): load a squad, unload at a spot, airlift a vehicle. */
exports.ACT_LOAD = 30, exports.ACT_UNLOAD = 31, exports.ACT_LIFT = 32;
const NO_TEAM = 255;
/** Every per-slot array of Sim and its elements per slot (allocSlots grows them together). */
const SLOT_ARRAY_TYPES = {};
const SLOT_ARRAYS = [];
{
    const add = (C, per, names) => { for (const k of names.split(" ")) {
        SLOT_ARRAYS.push([k, per]);
        SLOT_ARRAY_TYPES[k] = C;
    } };
    add(Uint8Array, 1, "alive team noLos ramPhase mCount ctlOn ctlFire ctlTool drv nOcc airS airborne hijacked ordType lowFly stance");
    add(Int32Array, 1, "stanceT eid squad lastFired tgtSlot tgtId lastHit slotPilot critTick lastShHit ordTargetId wpIdx live footScratch dying splashSlot splashSq");
    add(Int16Array, 1, "etype");
    add(Uint16Array, 1, "ctlMask ctlFlags");
    add(Float64Array, 1, "x y z px pz dirX dirZ velX velZ hp shield maxRange ctlThrust ctlStrafe ctlYaw ctlPitch flyAlt velY energy jetFuel splashD2");
    add(Int32Array, data_ts_1.MAX_SEATS, "occ");
    add(Float64Array, data_ts_1.MAX_SEATS, "gYaw gPitch");
    add(Uint8Array, data_ts_1.MAX_SEATS, "gFire");
    add(Int16Array, data_ts_1.MAX_MOUNTS, "mWeapon");
    add(Uint8Array, data_ts_1.MAX_MOUNTS, "mFixed mOn");
    add(Float64Array, data_ts_1.MAX_MOUNTS, "cooldown mAimMul");
    add(Int32Array, data_ts_1.MAX_MOUNTS, "mTgtSlot mTgtId");
    add(Float64Array, data_ts_1.MAX_MOUNTS, "mDX mDZ");
    add(Int32Array, data_ts_1.MAX_MOUNTS, "mLock mReady"); // F1 turret traverse / wind-up
    add(Int32Array, data_ts_1.MAX_MOUNTS, "mChg mOvh");
    add(Float64Array, data_ts_1.MAX_MOUNTS, "mHeat"); // ruling 91 laser charge / heat
    add(Int32Array, data_ts_1.MAX_MOUNTS, "mRxId mRxT"); // ruling 126 AI reaction to a small target: its id, first-shot tick
    add(Float64Array, 1, "boostM");
    add(Uint8Array, 1, "boostOn"); // ruling 108 boost meter (0..1) and boosting flag
    add(Float64Array, 1, "hopH");
    add(Int32Array, 1, "hopReady"); // ruling 112 hover hop: height above the ground, next take-off tick
    add(Int32Array, 4, "detExpiry"); // MAX_TEAMS
}
// Scratch slots (Sim.sc). Doubles are passed between the hot helpers through this
// Float64Array instead of as arguments / return values, which V8 boxes (allocates)
// when the callee is not inlined. Not state.
const SA_X = 0, SA_Y = 1, SA_Z = 2, SB_X = 3, SB_Y = 4, SB_Z = 5; // segment A->B
/** Co-op lag compensation: ticks of recent positions kept (0.8 s), and the speed bound that widens the cells searched. */
const LAG_K = 16, LAG_MAX_SPEED = 80;
const S_TERR = 6; // terrainSeg() result: fraction, or Infinity
const S_RAYT = 7; // raySeg() result: fraction of the first entity hit
const S_DIRX = 8, S_DIRZ = 9, S_ALIGN = 10; // turnToward() in / out
const S_INX = 11, S_INZ = 12, S_SCALE = 13; // applyDamage() in: shot direction, damage scale
const S_PX = 14, S_PY = 15, S_PZ = 16; // impact point for splash
const S_RX = 17, S_RZ = 18; // aim spread draws
const S_UX = 19, S_UY = 20, S_UZ = 21; // disperse(): unit direction in / out
const S_SIG = 26; // signatureTo() result
/** S9 target ranking: added to an unarmed enemy's distance squared so every armed enemy in range ranks first. */
const UNARMED_RANK = 1e12;
const S_QX = 27, S_QY = 28, S_QZ = 29; // ballisticSolveTo() target point
const S_VX = 22, S_VY = 23, S_VZ = 24, S_T = 25; // ballisticLead(): launch velocity, flight time, aim point in S_PX..S_PZ
/** m1: an AI hover vehicle holding at engage range closes again only when its target is this fraction of the range beyond it. */
const HOVER_HOLD_MARGIN = 0.1;
/** W1: an AI walker's approach speed to its last waypoint is at most this x sqrt(2 brake distance) (stops on the spot). */
const WALK_BRAKE_K = 0.9;
const S_CX = 30, S_CZ = 31; // controlSteer() result: position before separation
const S_AYAW = 32, S_APITCH = 33; // fireAimed() aim (vehicle / pilot control, or a gunner seat's)
const S_AIMMUL = 34; // fire() / fireBallistic(): dispersion multiplier of the firing mount (AI gunner accuracy)
const S_MX = 35, S_MY = 36, S_MZ = 37; // setMuzzle(): the firing mount's muzzle (shot origin)
const S_GX = 38, S_GY = 39, S_GZ = 40; // groundAt(): terrain height query (in x, z; out y)
const S_RET = 41; // engageRange() / meleeReachQ() / ramBackoff() / gapQ() result
const S_DSIG = 42; // disperse(): sigma in (aimSigma() writes it)
const S_HX = 43, S_HZ = 44; // setMuzzle(): horizontal aim direction in
const S_TA = 45; // disperse(): angle, sin, cos x 2 (45..50)
const S_SX = 51, S_SZ = 52, S_TX = 53, S_TZ = 54; // sideOf(): the line
const N_SCRATCH = 55;
/** Fixed-point iterations of the ballistic intercept (flight time to the predicted point). */
const LEAD_ITERS = 40;
/** Ruling 108: half the side gap between the two projectiles of a salvo (m). */
const SALVO_HALF_GAP = 0.7;
/** Ruling 108: a player's homing shot locks on to an enemy within 10 degrees of the aim (cos 10 deg). */
const HOMING_LOCK_COS = 0.984807753012208;
/** Chords used to check a shell's arc for friendlies and terrain before firing. */
const ARC_CHORDS = 8;
class Sim {
    d;
    /** w2f: the raw game data (coop.ts / stealth.ts read buildings' effects). */
    data;
    mapSize;
    seed;
    flat;
    terrain;
    rng;
    tick = 0;
    nextId = 1;
    nextSquadId = 1;
    nextProjId = 1;
    inputSeq = 0;
    /**
     * QA1 bug 8: the last input refused when it was queued (malformed: wrong type, non-finite or out-of-range number,
     * unknown formation, ...): its seq, the reason and the tick it was queued at; null none yet. Not sim state. The same
     * refusal goes into the event log at once (REJECT, a = seq, c = reason code, d = input kind; tick = the current tick).
     */
    lastInputRefusal = null;
    /** QA1 bug 8: refuses a malformed input at queue time (nothing is queued; never throws). Returns its seq. */
    refuseInput(kind, subject, team, reason = "badInput") {
        const seq = ++this.inputSeq;
        const tm = isTeam(team) ? team : NO_TEAM, sub = isId(subject) ? subject : 0;
        this.lastInputRefusal = { seq, reason, tick: this.tick };
        this.events.push(events_ts_1.EV.REJECT, this.tick, tm, seq, sub, reasonCode(reason), kind, 0, 0, 0);
        return seq;
    }
    // ---- entity SoA ----
    cap;
    hi = 0; // high-water slot count
    alive;
    eid;
    etype;
    team;
    squad;
    x;
    y;
    z;
    px;
    pz; // positions at start of tick (separation and the grids read these)
    dirX;
    dirZ;
    velX;
    velZ;
    hp;
    shield;
    lastFired;
    tgtSlot;
    tgtId; // primary target (movement, facing)
    /** Primary target's line of fire at the last attempt: 0 clear, 1 terrain (close in), 2 / 3 friendly in the way (sidestep left / right). */
    noLos;
    /** Ram units under an attack order: 0 charging, 1 backing off to charge again. */
    ramPhase;
    /** Tick of the last damage taken (pilot shield regeneration delay). */
    lastHit;
    // ---- direct control (queueControl), per slot ----
    ctlOn; // 1: controlled by a player
    ctlThrust;
    ctlStrafe; // -1..1, combined length <= 1
    ctlYaw;
    ctlPitch; // aim, radians
    ctlFire; // bit 0 primary, bit 1 secondary
    // ---- crews and pilots (CONTRACTS rulings 11, 15-19), per slot
    ctlFlags; // pilot on foot: PC_SPRINT | PC_CROUCH | PC_JUMP | PC_JET | ... | PC_PRONE
    /** Ruling 42: pilot body stance (ST_*: bits 0-1 current, bits 2-3 transition target) and the tick its transition ends (0: none). */
    stance;
    stanceT;
    ctlTool; // pilot on foot: TOOL_*
    /** Vehicles: bit j = seat j is under a player's direct control (queuePilotControl). */
    ctlMask;
    /** 1: the entity can drive (no crew rules for its type, or a ready driver aboard). */
    drv;
    /** Occupants aboard (crewed vehicles). */
    nOcc;
    /** Body is in the air layer: aircraft while flyAlt > 0 (landed aircraft are ground bodies). */
    airS;
    /** Aircraft: height above ground (constants.airAltitude in flight, 0 when landed). */
    flyAlt;
    /** Ruling 41: aircraft low-flight mode (1: fly at stealth.lowFlightAltitudeMetres; set by a player's toggle or an order / setLowFlight). State v23. */
    lowFly;
    /** Pilots on foot: vertical speed (m/s) and AIR_GROUND / AIR_FLYING / AIR_EJECTING. */
    velY;
    airborne;
    /** Pilots on foot: the pilot id; energy (ruling 17) and free jetpack burn left (s). */
    slotPilot;
    energy;
    jetFuel;
    /** Crewed vehicles: tick the hull reached zero (critical window), -1 = none. */
    critTick;
    /** Tick the shield last absorbed damage (shield-hit flag in snapshots). */
    lastShHit;
    /** 1: taken by a pilot of another team (hijack). */
    hijacked;
    // ---- per seat [slot * MAX_SEATS + j]
    occ; // pilot id, 0 = empty
    gYaw;
    gPitch;
    gFire; // player gunner aim and trigger
    // ---- per mount
    mOn; // 1: the mount has a crew member to fire it (or needs none)
    /** F1: world-space barrel direction (unit vector on x, z) of each mount; (0, 0) = at rest along the hull (not yet turned). */
    mDX;
    mDZ;
    /** F1: entity id of the target the mount's wind-up was started for (0 none), and the tick it may first fire at it. */
    mLock;
    mReady;
    /** Ruling 91 (Lancer laser): ticks the mount's charge has run (weapon chargeSeconds; 0 = not charging); overheat lockout end
     *  tick (> 0: disabled until then; -1: the AI lets it cool down to combat.aiHeatResume; 0 none); heat 0..1 (overheatSeconds). */
    mChg;
    mOvh;
    mHeat;
    /** Ruling 126: per mount, the small target (pilot / infantry) the AI shooter holds (0: none) and the first tick it may fire at it. */
    mRxId;
    mRxT;
    /** Ruling 108 (Dart Scout): boost meter 0..1 (full at spawn) and 1 while the driver is boosting (units with data boost). */
    boostM;
    boostOn;
    /** Ruling 112 (hover handling): hop height above the ground (m; 0 = on its hover; its vertical speed is velY) and the
     *  first tick of the next allowed take-off (constants.hover.jumpCooldownSeconds after the last one). */
    hopH;
    hopReady;
    mAimMul; // dispersion multiplier of the mount's AI fire (AI gunner / player seat on autopilot)
    // ---- pilots and teams
    pilots = new Map(); // ascending id (insertion order)
    nextPilotId = 1;
    /** Team stockpiles (ruling 18) and supplied points (tech tier 3 needs constants.techTiers.3.suppliedPoints). */
    ore = new Float64Array(exports.MAX_TEAMS);
    gas = new Float64Array(exports.MAX_TEAMS);
    suppliedPoints = new Int32Array(exports.MAX_TEAMS);
    /** Production queues by building entity id (ascending). */
    prod = new Map();
    /** Pending tick-stamped crew / production inputs and pilot control inputs (sorted by tick, then seq). */
    pendingAct = [];
    pendingPilotCtl = [];
    /** Event log (output, not state: see events.ts; its tail and serials are carried across a host handover by exportState). */
    events = new events_ts_1.EventLog();
    /**
     * Snapshot stream epoch (CONTRACTS rev 4, host handover): 0 for a new sim; a sim restored with createSimFromState
     * gets the exported epoch + 1. Snapshot encoders stamp it on every snapshot; guests reset their baselines when it
     * changes. Not sim state (not hashed).
     */
    streamEpoch = 0;
    /** First event serial produced by this host after a restore (0: not restored): sent in keyframes of the epoch. Not sim state. */
    handoverSerial = 0;
    maxRange; // longest mounted weapon range
    mCount; // mounts per slot
    mWeapon; // [slot * MAX_MOUNTS + m]
    mFixed; // [slot * MAX_MOUNTS + m] hull-fixed weapon
    cooldown; // [slot * MAX_MOUNTS + m]
    mTgtSlot;
    mTgtId; // [slot * MAX_MOUNTS + m] per-mount target
    detExpiry; // [slot * MAX_TEAMS + team] last tick the slot counts as detected by team
    ordType;
    ordTargetId;
    wpIdx;
    waypoints;
    free = []; // descending, so pop() gives the lowest free slot
    idToSlot = new Map();
    live;
    nLive = 0;
    // ---- squads (lookup by id; removed when empty) ----
    squads = new Map();
    // ---- projectiles SoA ----
    pCap = 1024;
    pN = 0;
    pId = new Int32Array(1024);
    pX0 = new Float64Array(1024);
    pY0 = new Float64Array(1024);
    pZ0 = new Float64Array(1024);
    pVX = new Float64Array(1024);
    pVY = new Float64Array(1024);
    pVZ = new Float64Array(1024);
    pT = new Float64Array(1024); // flight time at which the projectile ends (ground / max range)
    pLaunch = new Int32Array(1024);
    pWeapon = new Int16Array(1024);
    pTeam = new Uint8Array(1024);
    pBallistic = new Uint8Array(1024);
    pShooter = new Int32Array(1024); // shooter entity id (never hit by its own shot)
    pSeen = new Uint8Array(1024); // bit k: team k had detected the shooter at launch (backstab rule)
    pPilot = new Int32Array(1024); // pilot id of the seat / pilot that fired (0 = AI or no pilot): hit-marker attribution
    /**
     * Co-op lag compensation (21 Nov, after Ace of the Airways' co-op lessons: "are a guest's hits judged where the
     * guest saw them?"). A guest sees the other entities about one round trip plus its render delay in the past, so a
     * shot on a moving target that the guest landed missed on the host. lagTicks (set by the host's worker from each
     * guest's ping): pilot id -> ticks; the shots of that pilot (hitscan rays and projectiles, on foot or from a seat)
     * meet the other teams' entities where they stood that many ticks ago (a ring of recent positions, LAG_K ticks).
     * The host still applies every hit by its own rules (alive, team, range, damage), and the rewind is capped, so a
     * guest gains nothing it did not see. Not state: derived each tick, empty after a checkpoint (shots then use the
     * present positions until the ring fills again).
     */
    lagTicks = null;
    rayLag = 0;
    histX = null;
    histY = null;
    histZ = null;
    histE = null;
    pTgt = new Int32Array(1024); // ruling 108: entity id a homing projectile steers toward (0 = none)
    /** Ruling 108: target entity id for the next launch() of a homing weapon (fire / fireAimed set it; launchShot clears it). Scratch. */
    launchTgt = 0;
    /** Frontline: the target of the next homing shot (lock-on salvo), 0: lock along the aim as usual. */
    forceTgt = 0;
    // ---- unit limits (state) ----
    /** Strategic points (SimOptions.map), null on a map without points. State (hashed and exported when present). */
    pts = null;
    /** Mining (mining.ts): ore deposits, harvesters, gas extraction; null on a map without deposits or geysers. */
    mine = null;
    /** Building construction (s8; construction.ts): on maps with strategic points when the data has constants.construction. */
    con = null;
    /** Economy depth (stage 3 w2b; economy2.ts): fortification, forward bases, power, repair, enemy income (salvage removed, ruling 106). Maps with points. */
    eco2 = null;
    /** Orders of stage 2 s5 (orders.ts): extension records and hold fire. Hashed only while non-empty. */
    ord;
    /** s6 pathfinding (pathfinding.ts); null without constants.pathfinding. */
    nav = null;
    /** Match state (match.ts, SimOptions.match), null without match rules. Hashed while an AI team exists or once it is over. */
    match = null;
    /** Sim-side enemy commander (enemy-ai.ts) for the match's AI teams; null without one. No state of its own. */
    ai = null;
    /** Support-call rules (calls.ts) compiled from data; null when the data has none. Static. */
    callRules;
    /** Wave 2 D: gravity- and atmosphere-dependent rules of the planet (planet.ts). */
    planet;
    /** Support-call state (calls.ts): null until the first call input or loadout change (a sim that never calls hashes as before). */
    calls = null;
    /** S12 pilot kit rules (pilotkit.ts); null without crews. Static. */
    kitRules;
    /** S12 pilot kit state (pilotkit.ts): null until first used (a sim that never uses it hashes as before). */
    kit = null;
    /** Pilot kit state, created on first use. */
    /** w2e transport rules (transport.ts). Static. */
    tpRules;
    /** w2e transport state (transport.ts): null until first used (a sim that never uses it hashes as before). */
    tp = null;
    /** w3b unit AI (unit-ai.ts; constants.unitAi; null: absent). Derived from data and the match: not state. */
    uai = null;
    /** Ruling 126: per team, ticks an AI shooter holds a newly acquired small target before its first shot (0: none). Derived from data and match, not state. */
    rxTicks = new Int32Array(4);
    /** w3b battle groups (battlegroups.ts; constants.battleGroups): rules (null: absent) and state (null until first used). */
    bgRules = null;
    bg = null;
    /** fix-qa2 (strongpoints.ts): points' control nodes, chokepoint prebuilt structures, fortification walls / bunker / minefield (null: no map points or no points.controlNode.building). */
    sp = null;
    /** fix-qa2 (reserve.ts): the unit reserve's rules (null: no production.reserveSize) and state (null until first used). */
    /** fix-qa2 (bldfx.ts): Shield Projector domes, Tech Lab upgrades, manned towers, Mass Driver drop-offs. */
    bfx = null;
    resRules = null;
    res = null;
    /** S14 (pilotpool.ts): the pilot reserve per team (null: no constants.pilotReserve or no crews). State. */
    pool = null;
    /** S14: a team's pilot reserve counts (all 0 without a reserve). */
    pilotPool(team) { return this.pool ? this.pool.counts(this, team) : { initial: 0, gained: 0, available: 0, assigned: 0, onFoot: 0, lost: 0 }; }
    /** S14: a scenario's starting AI crews come out of their team's reserve (createScenarioSim). */
    drawStartingCrews() { if (this.pool)
        this.pool.drawStarting(this); }
    /**
     * S14 crew order (ACT_CREW 60): available pilots of the team take the empty operator seats (driver first, then
     * gunners) of own vehicle vehicleId at once, as many as are available, when it stands within
     * pilotReserve.crewRadiusMetres of a friendly pilot home (Command Core, supplied Barracks, running Field Depot).
     * Refusals: unknownVehicle, notOwner, notCrewable, hullCritical, vehicleCrewed (no empty operator seat),
     * noPilotsAvailable, crewNotAtBase (and notCrewable without a pilot reserve).
     */
    crewVehicle(team, vehicleId) {
        if (!this.pool)
            return this.rej("notCrewable");
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        const why = this.pool.crewOrder(this, team, vehicleId);
        return why ? this.rej(why) : { ok: true };
    }
    queueCrew(tick, team, vehicleId) { return this.queueAct(tick, pilotpool_ts_1.ACT_CREW, team, vehicleId, 0, 0); }
    /** Ruling 65: squads per Barracks (production.squadsPerBarracks; 0: no cap). Derived from data. */
    squadsPerBarracks = -1;
    tInfSquad = null;
    tBarracks = null;
    infTypes() {
        if (this.tInfSquad)
            return;
        const d = this.d, nt = d.typeIds.length, a = new Uint8Array(nt), b = new Uint8Array(nt);
        for (let t = 0; t < d.unitCount; t++)
            if (d.tArmour[t] === data_ts_1.AC_INFANTRY && t !== d.pilotType)
                a[t] = 1;
        for (let t = d.unitCount; t < nt; t++)
            if (d.tStructure[t])
                for (const u of d.tProduces[t])
                    if (a[u])
                        b[t] = 1;
        this.tInfSquad = a;
        this.tBarracks = b;
        const v = d.raw.constants.production?.squadsPerBarracks;
        this.squadsPerBarracks = typeof v === "number" && v > 0 ? Math.round(v) : 0;
    }
    /** Ruling 65: is type t an infantry squad under the Barracks cap? */
    isInfantrySquad(t) { this.infTypes(); return this.squadsPerBarracks > 0 && this.tInfSquad[t] === 1; }
    /** Ruling 65: the team's infantry squad cap (squadsPerBarracks x its standing, finished Barracks); Infinity without the rule. */
    infantryCap(team) {
        this.infTypes();
        if (this.squadsPerBarracks <= 0)
            return Infinity;
        let n = 0;
        for (let s = 0; s < this.hi; s++)
            if (this.alive[s] && this.hp[s] > 0 && this.team[s] === team && this.tBarracks[this.etype[s]] && !(this.con && this.con.underConstruction(this.eid[s])))
                n++;
        return n * this.squadsPerBarracks;
    }
    /** Ruling 65: the team's infantry squads: in the field, aboard transports and in the unit reserve. */
    infantrySquads(team) {
        this.infTypes();
        const ids = new Set();
        for (const sq of this.squads.values()) {
            if (sq.team !== team || sq.structure || sq.members.length === 0)
                continue;
            const s = this.idToSlot.get(sq.members[0]);
            if (s !== undefined && this.tInfSquad[this.etype[s]])
                ids.add(sq.id);
        }
        if (this.tp)
            for (const c of this.tp.cargo)
                if (c.team === team && this.tInfSquad[c.type])
                    ids.add(c.squad);
        let n = ids.size;
        if (this.res)
            for (const e of this.res.entries[team])
                if (this.tInfSquad[e.type])
                    n++;
        return n;
    }
    /** S14: pilot home slot o takes pilots in (return) and serves the crew order: a supply source, a supplied structure or a running Field Depot (respawn's rule). */
    homeServes(o) {
        return !this.pts || this.pts.tSource[this.etype[o]] === 1 || this.pts.structureSupplied(this, o) || (this.eco2 !== null && this.eco2.depotRunning(this, o));
    }
    resState() { if (!this.res)
        this.res = new reserve_ts_1.Reserve(this.resRules, this.pts ? this.pts.n : 0); return this.res; }
    /** The team's reserve (type id, hull and shield per member), in arrival order. */
    reserve(team) { return this.res ? this.res.view(this, team) : []; }
    /** Reserve capacity of the team now (map size class + Field Depots). */
    reserveCapacity(team) { return this.resRules ? (this.res ?? new reserve_ts_1.Reserve(this.resRules, 0)).capacity(this, team) : 0; }
    bgState() { if (!this.bg)
        this.bg = new battlegroups_ts_1.BattleGroups(); return this.bg; }
    /** w3b: the team's battle groups (owner's view). */
    battleGroups(team) { return this.bg ? this.bg.view(team) : []; }
    /** w2e progression rules (progression.ts); null when the data has no progression.xp. Static. */
    progRules;
    /** w2e progression state (progression.ts): null until a player is involved (a sim without players hashes as before). */
    prog = null;
    progState() { if (!this.prog)
        this.prog = new progression_ts_1.Progress(); return this.prog; }
    /**
     * w2e (progression.ts, doc 16): applies a player's profile and loadout at match start (validated against the profile
     * rules): (ruling 56: no vehicle licences, production is not gated), the pilot weapon replaces the carbine, the call loadout is
     * set, mastery bonuses apply. Reasons: badLoadout (bad profile or calls), notLicensed (a weapon or call not unlocked), unknownPilot (bad player number).
     */
    applyProfile(l) { return (0, progression_ts_1.progApply)(this, l); }
    /** w2e: per-player battle records and XP awards, once the match is over (null before). */
    battleResults() { return this.prog ? this.prog.results : null; }
    tpState() { if (!this.tp)
        this.tp = new transport_ts_1.Transport(); return this.tp; }
    kitState() { if (!this.kit)
        this.kit = new pilotkit_ts_1.PilotKit(this.kitRules); return this.kit; }
    /** w2f stealth tools (stealth.ts): rules, and the state (null until first used). */
    stlRules;
    /** w2f: MAX_TEAMS for modules that index per-team arrays without importing sim.ts values. */
    nTeams = exports.MAX_TEAMS;
    stl = null;
    stealthState() { if (!this.stl)
        this.stl = new stealth_ts_1.Stealth(); return this.stl; }
    /** S15 rulings state (s15.ts; created on first use). */
    s15 = null;
    s15State() { if (!this.s15)
        this.s15 = new s15_ts_1.S15(); return this.s15; }
    /** D1 test cheats (cheats.ts; created by the first ACT_CHEAT that sets a flag). */
    cheat = null;
    cheatState() { if (!this.cheat)
        this.cheat = new cheats_ts_1.Cheats(); return this.cheat; }
    /** C1 crew dispatch (dispatch.ts; created by the first ACT_DISPATCH). */
    dispatch = null;
    dispatchState() { if (!this.dispatch)
        this.dispatch = new dispatch_ts_1.CrewDispatch(); return this.dispatch; }
    /** C1: ACT_DISPATCH (dispatch.ts): send free AI pilots to own vehicle vehicleId (bodyId: that pilot body, 0 the nearest; n pilots). */
    dispatchCrew(team, vehicleId, bodyId = 0, n = 1) {
        if (!this.d.crewOn)
            return this.rej("notCrewable");
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        const r = (0, dispatch_ts_1.dispatchCrew)(this, team, vehicleId, bodyId, n);
        return r.ok ? r : this.rej(r.reason);
    }
    queueDispatch(tick, team, vehicleId, bodyId = 0, n = 1) { return this.queueAct(tick, dispatch_ts_1.ACT_DISPATCH, team, vehicleId, bodyId, n); }
    /** C1: pilots on the way to vehicle id (crew dispatch). */
    crewEnRoute(vehicleId) { return this.dispatch !== null ? this.dispatch.enRoute(vehicleId) : 0; }
    /** C1: reason code of a reason name (events). */
    reasonCodeOf(r) { return reasonCode(r); }
    /** C1: is pilot body ps within boarding reach of vehicle slot vs? */
    pilotInReach(ps, vs) { return this.inReach(ps, vs); }
    /** C1: a new AI pilot of `team` on foot at the door of pilot home slot h, on the side facing (tx, tz) (else the nearest free spot). */
    reservePilotAt(team, h, tx, tz) {
        const d = this.d, c = d.crew, rp = d.tRadius[d.pilotType], off = d.tRadius[this.etype[h]] + rp + c.exitGap;
        let ux = tx - this.x[h], uz = tz - this.z[h];
        const l = Math.sqrt(ux * ux + uz * uz);
        if (l > 1e-6) {
            ux /= l;
            uz /= l;
        }
        else {
            ux = this.dirX[h];
            uz = this.dirZ[h];
        }
        let x = this.clampMap(this.x[h] + ux * off), z = this.clampMap(this.z[h] + uz * off);
        if (!this.spotFree(x, z, rp, h)) {
            this.freeSpot(h, off);
            x = this.sc[S_CX];
            z = this.sc[S_CZ];
        }
        const p = this.newPilot(team, -1, 0);
        this.spawnPilotEntity(p, x, z);
        return p;
    }
    /** D1 build hook (construction.ts BuildHost.cheatInstant). */
    get cheatInstant() { return this.cheat !== null ? this.cheat.instant : 0; }
    /** Slot s is driven by an AI pilot (no player at the controls). */
    aiFlown(s) { return this.aiDriven(s); }
    /** w2f: the driver of vehicle slot vs holds the cloak key (bike cloak). */
    bikeCloakHeld(vs) { return (this.ctlFlags[vs] & pilotkit_ts_1.PC_CLOAK) !== 0; }
    /** w2f: quiet attack-move order for an AI unit (stealth.ts search). */
    /**
     * QA1 bug 4: armed for AI purposes (commander search, auto-defend, group adoption, armed-targets-first ranking): a
     * weapon with range that is not melee only. Economy and support vehicles (Constructor, Harvester, Hauler, Forward Base
     * Vehicle: a mechanical arm or ramming plow, data `melee`) are never armed in this sense.
     */
    aiArmed(s) { return this.maxRange[s] > 0 && this.d.tMeleeOnly[this.etype[s]] === 0; }
    aiOrder(id, x, z) { this.quietOrders = true; this.order([id], { type: "attackMove", x, z }); this.quietOrders = false; }
    /** w2f: switches the jammer mod of Relay Tower relayId on or off (stealth.ts). */
    setJammer(relayId, on, team) { return (0, stealth_ts_1.setJammer)(this, relayId, on, team); }
    queueJammer(tick, relayId, on, team) { return this.queueAct(tick, stealth_ts_1.ACT_JAMMER, team, relayId, on ? 1 : 0, 0); }
    /** w2f: a player pilot on foot drops a decoy beacon (stealth.ts). */
    dropDecoy(pilotId, team) { return (0, stealth_ts_1.dropDecoy)(this, pilotId, team); }
    queueDecoy(tick, pilotId, team) { return this.queueAct(tick, stealth_ts_1.ACT_DECOY, team, pilotId, 0, 0); }
    /** w2f: a Dart rider's scout ping (stealth.ts). */
    scoutPulse(pilotId, team) { return (0, stealth_ts_1.scoutPulse)(this, pilotId, team); }
    queueScoutPulse(tick, pilotId, team) { return this.queueAct(tick, stealth_ts_1.ACT_PULSE, team, pilotId, 0, 0); }
    /** Scratch (not state; empty between steps): pilot body slots whose killing blow this tick was an outright kill (pilotkit.ts). */
    outright = new Set();
    /** Per type: 1 = a Command Core (buildings' effects.supplySource), for the match check. Derived from data. */
    tCore = null;
    /** Ruling 121: per type, a command seat a player pilot can go inside: 1 always (effects.commandSeat, the Command Core), 2 only as a citadel's control node (points.controlNode.citadelCommandSeat); null none. */
    tShelter = null;
    hostUnitCap; // Infinity = none
    mapSizeClass; // "" = none
    mapUnitCap; // Infinity = none
    // ---- input queue (sorted by tick, then seq) ----
    pending = [];
    /** Pending direct-control inputs (sorted by tick, then seq). */
    pendingCtl = [];
    /** Order outcomes of the last step (see OrderEvent). */
    orderEvents = [];
    // ---- spatial ----
    fine;
    coarse;
    maxRadius = 0;
    moveMargin = 0; // max distance an entity moves in one tick (grid holds start-of-tick positions)
    terrainStep;
    // ---- scratch (not state) ----
    raySlot = -1;
    /** Entity id and pilot id of the shooter whose hit applyDamage is resolving (event log attribution). Scratch, not state. */
    hitShooter = 0;
    hitPilot = 0;
    /**
     * The shot being resolved was fired under a player's direct control (a player pilot on foot, or a player-held seat
     * weapon): only such a shot kills a seated crew member through a seat zone with a canopyKill weapon (ruling 28).
     * Scratch, not state; projectiles carry it as the sign of pPilot (negative = player shot).
     */
    hitCtl = false;
    sc = new Float64Array(N_SCRATCH);
    /** Entities at hp <= 0 waiting for removal at the end of the step (destroy() between steps puts them here). State. */
    dying;
    nDying = 0;
    /** Hash of the terrain heights (computed once; terrain is immutable). */
    terrainHash;
    blockSide = 0; // fire(): side of the friendly blocker, +1 / -1
    /** Per type: visual sensor range (sensorRange capped by fog) and radar range (0 = no radar). Derived from data. */
    tVisual;
    tRadarRange;
    grid; // the heightfield grid, null for flat terrain
    splashSlot;
    splashD2;
    splashSq;
    firingTicks;
    retryTicks;
    encoders = new Map();
    tmpPos = new Float64Array(3);
    stats;
    /**
     * Optional instrumentation (bench/ticks.ts): when set, step() adds the time of
     * each phase to phaseMs [inputs+grids, detection, targeting, movement, weapons,
     * projectiles, deaths]. Never read by the simulation itself.
     */
    phaseClock = null;
    /** S9: visual sensor range of a held strategic point (0 = off). Derived from data. */
    pointSensor = 0;
    phaseMs = new Float64Array(7);
    /** With phaseClock set: work counts of the last step [sensor sweeps, target acquisitions, projectiles updated]. */
    phaseN = new Int32Array(3);
    constructor(o) {
        this.d = (0, data_ts_1.compileData)(o.data, o.planetId);
        this.data = o.data;
        this.coopRules = (0, coop_ts_1.compileCoopRules)(o.data.constants, o.data.constants.tickRate);
        this.planet = (0, planet_ts_1.compilePlanetRules)(o.data, o.planetId);
        this.stats = newStats(this.d.weaponIds.length);
        const c = this.d.constants;
        this.mapSize = o.mapSize;
        this.seed = o.seed >>> 0;
        this.flat = !!o.flatTerrain;
        this.rng = new prng_ts_1.Prng(this.seed, 1);
        if (o.heightmap && o.flatTerrain)
            throw new Error("createSim: give heightmap or flatTerrain, not both");
        const ter = o.heightmap ? terrain_ts_1.Terrain.fromHeightmap(o.mapSize, o.heightmap)
            : o.flatTerrain ? null : terrain_ts_1.Terrain.generate(o.mapSize, c.terrainCellSize, c.terrainAmplitude, c.terrainSmoothPasses, this.seed);
        this.terrain = ter ?? new terrain_ts_1.FlatTerrain(o.mapSize);
        this.grid = ter;
        this.terrainStep = (ter ? ter.cell : c.terrainCellSize) / 2;
        this.terrainHash = ter ? hashFloats(ter.h, `${ter.cols}x${ter.rows}@${ter.cell}`) : "flat";
        const nt = this.d.typeIds.length;
        this.tVisual = new Float64Array(nt);
        this.tRadarRange = new Float64Array(nt);
        for (let t = 0; t < nt; t++) {
            const r = this.d.tSensor[t];
            this.tVisual[t] = r < this.d.fogVisualRange ? r : this.d.fogVisualRange;
            this.tRadarRange[t] = this.d.tRadar[t] ? r * c.radarRangeMultiplier : 0;
        }
        this.firingTicks = Math.round(c.firingSignatureSeconds * c.tickRate);
        { // S9 point sensors: points.controlNode.sensorRange, capped by fog; off without stealth.pointSensorHeightMetres
            const pr = (o.data.points?.controlNode?.sensorRange);
            this.pointSensor = Number.isFinite(c.pointSensorHeight) && typeof pr === "number" && pr > 0 ? Math.min(pr, this.d.fogVisualRange) : 0;
        }
        this.sc[S_AIMMUL] = 1;
        this.retryTicks = c.targetingIntervalTicks;
        const cap = o.capacity ?? 2048;
        this.maxCap = o.maxCapacity ?? 65536;
        if (!(Number.isInteger(cap) && cap > 0) || !(Number.isInteger(this.maxCap) && this.maxCap >= cap))
            throw new Error("capacity must be a positive integer <= maxCapacity");
        this.cap = 0;
        this.allocSlots(cap);
        // unit limits
        if (o.hostUnitCap !== undefined && !(Number.isInteger(o.hostUnitCap) && o.hostUnitCap > 0))
            throw new Error(`hostUnitCap must be a positive integer`);
        this.hostUnitCap = o.hostUnitCap ?? Infinity;
        const caps = this.d.mapCaps;
        let mc = o.mapSizeClass !== undefined ? caps.find((m) => m.id === o.mapSizeClass) : caps.find((m) => m.sizeM >= o.mapSize - 1e-6);
        if (o.mapSizeClass !== undefined && !mc)
            throw new Error(`unknown mapSizeClass ${o.mapSizeClass} (data has: ${caps.map((m) => m.id).join(", ")})`);
        if (!mc && caps.length)
            mc = caps[caps.length - 1];
        this.mapSizeClass = mc?.id ?? "";
        this.mapUnitCap = mc?.maxUnitsPerSide ?? Infinity;
        let maxSpeed = 0;
        for (let t = 0; t < this.d.tRadius.length; t++) {
            if (this.d.tRadius[t] > this.maxRadius)
                this.maxRadius = this.d.tRadius[t];
            if (this.d.tSpeed[t] > maxSpeed)
                maxSpeed = this.d.tSpeed[t];
        }
        this.moveMargin = maxSpeed * this.d.dt + this.maxRadius * 0.25 + 1e-6; // movement + max separation push
        // Fine grid: separation and shot collision. Coarse grid: sensors and targeting.
        const fineCell = Math.max(16, 2 * this.maxRadius + c.projectileHitRadius);
        this.fine = new grid_ts_1.SpatialGrid(o.mapSize, fineCell, 4096, cap);
        this.coarse = new grid_ts_1.SpatialGrid(o.mapSize, 128, 4096, cap);
        // ruling 18: every team starts with the mission's stock of ore and gas
        if (this.d.production)
            for (let k = 0; k < exports.MAX_TEAMS; k++) {
                this.ore[k] = this.d.production.startOre;
                this.gas[k] = this.d.production.startGas;
            }
        // strategic points: supply from the initial ownership (no Command Core yet)
        // (a map with only deposits / geysers may have no points: points: [] or omitted)
        if (o.map && !((0, mining_ts_1.mapHasMining)(o.map) && !(o.map.points?.length))) {
            this.pts = new points_ts_1.Points(o.map, o.data, o.mapSize, c.tickRate);
            this.pts.refresh(this, true);
        }
        // mining: ore deposits and gas geysers (absent: nothing changes)
        if ((0, mining_ts_1.mapHasMining)(o.map))
            this.mine = new mining_ts_1.Mining(o.map, o.data, o.mapSize, this.planet.haulerLoad);
        if (this.pts && o.data.constants.construction)
            this.con = new construction_ts_1.Construction(o.data, c.tickRate, this.d.gravityG);
        if (this.pts)
            this.eco2 = new economy2_ts_1.Economy2(this, o.data);
        this.ord = new orders_ts_1.Orders(o.data);
        const nr = (0, pathfinding_ts_1.compileNavRules)(o.data);
        if (nr)
            this.nav = new pathfinding_ts_1.Nav(nr, o.mapSize, ter ? (x, z) => ter.height(x, z) : null);
        // wave 2 D: terrain types (terrainlayer.ts): the scenario's layer, else the map's
        const tld = o.terrainLayer ?? o.map?.terrainLayer;
        if (o.weather) {
            this.weather = new weather_ts_1.Weather(o.weather, o.data, o.planetId, this.seed, c.tickRate);
            this.weather.update(0);
            this.envOn = true;
        }
        if (tld) {
            this.tlayer = new terrainlayer_ts_1.TerrainLayer(tld, o.data);
            this.envOn = true;
            if (this.nav) {
                const g = this.tlayer.navGrid(this.nav.n, this.nav.cell);
                this.nav.applyTerrain(g.blocked, g.cost);
            }
        }
        // T1 (ruling 116): planet relief rules (terrain.json relief; null on a planet without relief: nothing changes)
        this.relief = (0, relief_ts_1.compileReliefRules)(o.data, o.planetId);
        if (this.relief && this.nav && ter) {
            const R = this.relief;
            this.nav.applySlopeCost((x, z) => ter.height(x, z), (k, g) => (0, relief_ts_1.slopeSpeedFactor)(R, k, g));
        }
        this.callRules = (0, calls_ts_1.compileCallRules)(o.data, this.d.typeIds, c.tickRate, o.planetId);
        this.kitRules = (0, pilotkit_ts_1.compileKitRules)(this.d);
        this.stlRules = (0, stealth_ts_1.compileStealthRules)(this);
        { // ruling 41: low flight (constants.stealth.lowFlight*); all three or none
            const st = this.d.raw.constants.stealth ?? {};
            const alt = st.lowFlightAltitudeMetres, sig = st.lowFlightSignatureMultiplier, sp = st.lowFlightSpeedMultiplier;
            if (typeof alt === "number" && alt > 0 && typeof sig === "number" && sig > 0 && typeof sp === "number" && sp > 0)
                this.lowRules = { alt, sig, speed: sp };
        }
        this.planet.typeSpeed = new Float64Array(this.d.typeIds.length).fill(1);
        if (this.planet.hoverSpeed !== 1)
            for (let t = 0; t < this.d.unitCount; t++)
                if (this.d.tVehicle[t] && !this.d.tAir[t])
                    this.planet.typeSpeed[t] = this.planet.hoverSpeed;
        this.tpRules = (0, transport_ts_1.compileTransportRules)(this);
        this.progRules = this.d.raw.progression?.xp ? (0, progression_ts_1.progressionRules)(this.d.raw) : null;
        // match rules and the enemy commander (absent: nothing changes)
        if (o.match) {
            const ea = o.data.constants.enemyAi;
            const diffs = ea && ea.difficulties ? Object.keys(ea.difficulties) : [];
            this.match = new match_ts_1.Match(o.match, ea?.defaultDifficulty ?? "", diffs);
            const nu = this.d.unitCount, blds = o.data.buildings;
            this.tCore = new Uint8Array(this.d.typeIds.length);
            blds.forEach((b, i) => { if (b.effects?.supplySource === true)
                this.tCore[nu + i] = 1; });
            this.match.coreType = this.tCore;
            this.match.initObjectives(this); // s13 objectives (none: nothing changes)
            if (o.lanes) { // Frontline: lane waves; the commander runs every quartermaster team's base
                this.lanes = new lanes_ts_1.Lanes(this, o.lanes);
                if (this.d.raw.constants.frontline && this.d.crewOn)
                    this.fkit = new fkit_ts_1.FKit(this); // Frontline stage 2: roles, guns, grenades, armour, ammo
            }
            if (this.match.aiMask || this.lanes)
                this.ai = new enemy_ai_ts_1.EnemyAi(this, o.data);
        }
        this.bgRules = (0, battlegroups_ts_1.groupRules)(o.data, this.d.constants.tickRate);
        if (this.d.crewOn) { // ruling 121: command seats (Command Core; a citadel's control node)
            const nu = this.d.unitCount, blds = o.data.buildings, T = new Uint8Array(this.d.typeIds.length);
            const cn = o.data.points?.controlNode;
            blds.forEach((b, i) => { if (b.effects?.commandSeat === true)
                T[nu + i] = 1;
            else if (cn && cn.citadelCommandSeat === true && b.id === cn.building)
                T[nu + i] = 2; });
            if (T.some((v) => v > 0))
                this.tShelter = T;
            const G = new Uint8Array(this.d.typeIds.length); // ruling 125: buildings.json gunSeat
            blds.forEach((b, i) => { if (b.gunSeat === true)
                G[nu + i] = 1; });
            if (G.some((v) => v > 0))
                this.tGunSeat = G;
        }
        this.bfx = new bldfx_ts_1.BuildingFx((0, bldfx_ts_1.bfxRules)(o.data, this.d.unitCount, this.d.typeIds.length));
        this.resRules = this.d.production ? (0, reserve_ts_1.reserveRules)(o.data, this.d.typeIds, this.d.unitCount, this.mapSizeClass, this.d.constants.tickRate) : null;
        if (this.pts) {
            const sr = (0, strongpoints_ts_1.strongRules)(o.data, this.d.typeIds, this.callRules ? this.callRules.ids : null);
            if (sr)
                this.sp = new strongpoints_ts_1.StrongPoints(sr, this.pts.n);
        } // fix-qa2: control nodes, prebuilt, fortification structures
        if (this.d.crewOn) { // S14 pilot reserve (after the match: team sizes scale by players / difficulty)
            const M = this.match;
            const pr = (0, pilotpool_ts_1.poolRules)(o.data, this.mapSizeClass, this.d.constants.tickRate, (t) => (M && M.inMatch(t) ? { ai: M.isAi(t), difficulty: M.difficulty[t], players: M.players } : null));
            if (pr)
                this.pool = new pilotpool_ts_1.PilotPool(pr, this.pts ? this.pts.owner : null);
        }
        {
            const M = this.match;
            this.uai = (0, unit_ai_ts_1.unitAiRules)(o.data, this.d.constants.tickRate, (t) => (M && M.isAi(t) ? M.difficulty[t] : null));
        }
        { // ruling 126: AI reaction delay at a small target, by the shooter team's difficulty (non-AI teams: unitAi.friendlyDifficulty, else normal)
            const R = this.d.aiSmallReact, M = this.match, fd = o.data.constants.unitAi?.friendlyDifficulty;
            if (R !== null)
                for (let t = 0; t < 4; t++) {
                    const k = (M && M.isAi(t) ? M.difficulty[t] : null) ?? (typeof fd === "string" ? fd : "normal");
                    const sec = R[k] ?? R.normal ?? 0;
                    this.rxTicks[t] = Math.round(sec * this.d.constants.tickRate);
                }
        }
    }
    /** Hard ceiling of entity storage (SimOptions.maxCapacity). */
    maxCap;
    /**
     * (Re)allocates every per-slot array for n slots, keeping the contents of the first `cap` slots. Called by the
     * constructor and when storage grows (spawn with no free slot). Grids and snapshot encoders follow hi on their own.
     */
    allocSlots(n) {
        const old = this.cap, me = this;
        for (const [k, per] of SLOT_ARRAYS) {
            const prev = me[k];
            const C = prev ? prev.constructor : SLOT_ARRAY_TYPES[k];
            const next = new C(n * per);
            if (prev && old > 0)
                next.set(prev.subarray(0, old * per));
            me[k] = next;
        }
        if (old === 0)
            this.critTick.fill(-1);
        const wp = new Array(n).fill(null);
        for (let s = 0; s < old; s++)
            wp[s] = this.waypoints[s];
        this.waypoints = wp;
        this.cap = n;
    }
    /** Free entity slots without growing past maxCapacity (spawns that need more are refused inside step()). */
    slotsLeft() { return this.free.length + (this.maxCap - this.hi); }
    /** Ensures a free slot exists (grows storage up to maxCapacity). False at the ceiling. */
    ensureSlot() {
        if (this.free.length > 0 || this.hi < this.cap)
            return true;
        if (this.cap >= this.maxCap)
            return false;
        this.allocSlots(Math.min(this.maxCap, this.cap * 2));
        return true;
    }
    get warnings() { return this.d.warnings; }
    /** Complete lossless state (see state.ts). Restore with createSimFromState(bytes, data). */
    exportState(opts) { return (0, state_ts_1.exportState)(this, opts); }
    // =================================================================== API
    /** Spawns one entity of a unit or building type. Returns the entity id. */
    /**
     * QA5-5 (fix-t1-ai): a structure that appears at once (fortification walls / bunkers, a construction site's structure)
     * must not enclose a ground unit standing there: every live ground unit whose circle overlaps structure slot b's is
     * moved just outside it (away from its centre; rotated 30 degrees at a time, at most 12 tries, while that spot is inside
     * another structure), in ascending slot order. A squad member caught by a wall segment spawning on it stayed wedged
     * between the touching segments for good. Returns how many were moved.
     */
    clearFootprint(b) {
        const d = this.d, rb = d.tRadius[this.etype[b]], bx = this.x[b], bz = this.z[b];
        let moved = 0;
        for (let s = 0; s < this.hi; s++) {
            if (s === b || !this.alive[s] || this.hp[s] <= 0 || d.tStructure[this.etype[s]] || d.tAir[this.etype[s]] || this.airborne[s] !== exports.AIR_GROUND)
                continue;
            const ru = d.tRadius[this.etype[s]], lim = rb + ru;
            let dx = this.x[s] - bx, dz = this.z[s] - bz;
            const l = Math.sqrt(dx * dx + dz * dz);
            if (l >= lim)
                continue;
            if (l > 1e-6) {
                dx /= l;
                dz /= l;
            }
            else {
                dx = 1;
                dz = 0;
            }
            let nx = bx, nz = bz;
            for (let k = 0; k < 12; k++) {
                const a = (k * Math.PI) / 6, ca = (0, fmath_ts_1.dcos)(a), sa = (0, fmath_ts_1.dsin)(a), ux = dx * ca - dz * sa, uz = dx * sa + dz * ca;
                nx = this.clampMap(bx + ux * (lim + 0.5));
                nz = this.clampMap(bz + uz * (lim + 0.5));
                let clear = true;
                for (let o = 0; o < this.hi && clear; o++) {
                    if (o === b || !this.alive[o] || !d.tStructure[this.etype[o]])
                        continue;
                    const m = d.tRadius[this.etype[o]] + ru;
                    if ((this.x[o] - nx) ** 2 + (this.z[o] - nz) ** 2 < m * m)
                        clear = false;
                }
                if (clear)
                    break;
            }
            const q = this.sc;
            q[S_GX] = nx;
            q[S_GZ] = nz;
            this.groundAt(S_GX);
            this.x[s] = nx;
            this.z[s] = nz;
            this.y[s] = q[S_GY];
            this.velX[s] = 0;
            this.velZ[s] = 0;
            moved++;
        }
        return moved;
    }
    spawnUnit(typeId, team, x, z, opts) {
        const o = typeof opts === "number" ? { squadId: opts } : (opts ?? {});
        const d = this.d;
        const t = d.typeIds.indexOf(typeId);
        if (t < 0)
            throw new Error(`unknown unit/building ${typeId}`);
        if (team < 0 || team >= exports.MAX_TEAMS)
            throw new Error(`team out of range`);
        let sq;
        if (o.squadId !== undefined) {
            sq = this.squads.get(o.squadId);
            if (!sq)
                throw new Error(`unknown squad ${o.squadId}`);
            if (sq.team !== team)
                throw new Error(`squad ${o.squadId} belongs to another team`);
        }
        // resolve the loadout before touching any state
        const mc = d.tMountCount[t];
        const weapons = [];
        for (let m = 0; m < mc; m++)
            weapons.push(d.tMounts[t * data_ts_1.MAX_MOUNTS + m]);
        if (o.loadout) {
            for (const [k, wid] of Object.entries(o.loadout)) {
                const seat = Number(k), choices = d.tSeatChoices[t][seat];
                const wi = d.weaponIds.indexOf(wid);
                if (!choices || wi < 0 || !choices.includes(wi))
                    throw new Error(`${typeId} seat ${seat}: ${wid} is not one of its weapons/altWeapons`);
                for (let m = 0; m < mc; m++)
                    if (d.tMountSeat[t * data_ts_1.MAX_MOUNTS + m] === seat)
                        weapons[m] = wi;
            }
        }
        if (!this.ensureSlot())
            throw new Error(`entity capacity ${this.cap} exceeded (maxCapacity ${this.maxCap})`); // only outside step(): step() checks slotsLeft() before it spawns
        const s = this.free.length > 0 ? this.free.pop() : this.hi++;
        const id = this.nextId++;
        this.alive[s] = 1;
        this.eid[s] = id;
        this.etype[s] = t;
        this.team[s] = team;
        x = this.clampMap(x);
        z = this.clampMap(z);
        this.x[s] = x;
        this.z[s] = z;
        this.px[s] = x;
        this.pz[s] = z;
        this.y[s] = this.groundY(t, x, z);
        // face the map centre
        let fx = this.mapSize / 2 - x, fz = this.mapSize / 2 - z;
        const fl = Math.sqrt(fx * fx + fz * fz);
        if (fl > 1e-9) {
            fx /= fl;
            fz /= fl;
        }
        else {
            fx = 1;
            fz = 0;
        }
        this.dirX[s] = fx;
        this.dirZ[s] = fz;
        this.velX[s] = 0;
        this.velZ[s] = 0;
        this.hp[s] = d.tHp[t];
        this.shield[s] = d.tShield[t];
        this.lastFired[s] = -1 << 30;
        this.tgtSlot[s] = -1;
        this.tgtId[s] = 0;
        this.noLos[s] = 0;
        this.ramPhase[s] = 0;
        this.lastHit[s] = -1 << 30;
        this.ctlOn[s] = 0;
        this.ctlThrust[s] = 0;
        this.ctlStrafe[s] = 0;
        this.ctlYaw[s] = 0;
        this.ctlPitch[s] = 0;
        this.ctlFire[s] = 0;
        this.ctlFlags[s] = 0;
        this.ctlTool[s] = 0;
        this.ctlMask[s] = 0;
        this.drv[s] = 1;
        this.nOcc[s] = 0;
        this.stance[s] = 0;
        this.stanceT[s] = 0;
        this.airS[s] = d.tAir[t];
        this.flyAlt[s] = d.tAir[t] ? d.constants.airAltitude : 0;
        this.lowFly[s] = 0;
        this.velY[s] = 0;
        this.airborne[s] = exports.AIR_GROUND;
        this.slotPilot[s] = 0;
        this.energy[s] = 0;
        this.jetFuel[s] = 0;
        this.critTick[s] = -1;
        this.lastShHit[s] = -1 << 30;
        this.hijacked[s] = 0;
        this.boostM[s] = d.tBoostMul[t] > 0 ? 1 : 0;
        this.boostOn[s] = 0;
        this.hopH[s] = 0;
        this.hopReady[s] = 0;
        for (let j = 0; j < data_ts_1.MAX_SEATS; j++) {
            const i = s * data_ts_1.MAX_SEATS + j;
            this.occ[i] = 0;
            this.gYaw[i] = 0;
            this.gPitch[i] = 0;
            this.gFire[i] = 0;
        }
        this.mCount[s] = mc;
        let maxR = 0;
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
            const i = s * data_ts_1.MAX_MOUNTS + m;
            this.mWeapon[i] = m < mc ? weapons[m] : -1;
            this.mFixed[i] = m < mc ? d.tMountFixed[t * data_ts_1.MAX_MOUNTS + m] : 0;
            this.cooldown[i] = 0;
            this.mTgtSlot[i] = -1;
            this.mTgtId[i] = 0;
            this.mOn[i] = 1;
            this.mAimMul[i] = 1;
            this.mDX[i] = 0;
            this.mDZ[i] = 0;
            this.mLock[i] = 0;
            this.mReady[i] = 0;
            this.mChg[i] = 0;
            this.mOvh[i] = 0;
            this.mHeat[i] = 0;
            this.mRxId[i] = 0;
            this.mRxT[i] = 0;
            // manual-only (kit) weapons do not set the AI's acquisition range
            if (m < mc && !d.tMountManual[t * data_ts_1.MAX_MOUNTS + m] && d.wRange[weapons[m]] > maxR)
                maxR = d.wRange[weapons[m]];
        }
        this.maxRange[s] = maxR;
        if (d.tBunker[t]) {
            this.mCount[s] = 0;
            this.maxRange[s] = 0;
        } // B1: an empty bunker's mounts are unmanned (mounts go live while a player is inside)
        if (d.rearmTicks > 0 && d.tAir[t])
            (0, s15_ts_1.ammoOnSpawn)(this, s); // ruling 55: full loads
        for (let k = 0; k < exports.MAX_TEAMS; k++)
            this.detExpiry[s * exports.MAX_TEAMS + k] = -1;
        this.ordType[s] = exports.ORD_NONE;
        this.ordTargetId[s] = 0;
        this.wpIdx[s] = 0;
        this.waypoints[s] = null;
        this.idToSlot.set(id, s);
        if (!sq)
            sq = this.newSquad(team, d.tStructure[t] === 1);
        sq.members.push(id);
        this.squad[s] = sq.id;
        if (d.crewOn) {
            if (d.tDriverSeat[t] >= 0) {
                // ruling 19: AI vehicles carry an AI pilot (driver) and AI gunners as real occupants
                const mode = o.crew ?? "ai";
                if (mode !== "none") {
                    const nSeat = d.tSeatCount[t];
                    for (let j = 0; j < nSeat; j++) {
                        const role = d.tSeatRole[t * data_ts_1.MAX_SEATS + j];
                        if (role !== data_ts_1.SEAT_DRIVER && role !== data_ts_1.SEAT_GUNNER)
                            continue;
                        const p = this.newPilot(team, -1, mode === "expert" ? 1 : 0);
                        p.state = exports.P_SEATED;
                        p.vehicle = id;
                        p.seat = j;
                        this.occ[s * data_ts_1.MAX_SEATS + j] = p.id;
                    }
                }
                this.recomputeCrew(s);
            }
            else if (t === d.pilotType && !this.spawningPilot) {
                // a pilot entity spawned directly (tests, scenarios): an AI pilot on foot
                const p = this.newPilot(team, -1, 0);
                this.attachPilotEntity(p, s);
            }
        }
        return id;
    }
    /** spawnPilotEntity in progress (spawnUnit must not create a second pilot record). Not state. */
    spawningPilot = false;
    /** Spawns `count` (default: the type's squadSize) units in a new squad around (x, z). */
    spawnSquad(typeId, team, x, z, count, spacing, loadout, crew) {
        const t = this.d.typeIds.indexOf(typeId);
        if (t < 0)
            throw new Error(`unknown unit ${typeId}`);
        const n = count ?? this.d.tSquadSize[t];
        if (spacing === undefined)
            spacing = this.d.tSquadSpacing[t] > 0 ? this.d.tSquadSpacing[t] : 6; // data squadSpacing, else 6 m
        const sq = this.newSquad(team, this.d.tStructure[t] === 1);
        const ids = [];
        const cols = Math.ceil(Math.sqrt(n));
        for (let i = 0; i < n; i++) {
            const r = Math.floor(i / cols), c = i % cols;
            ids.push(this.spawnUnit(typeId, team, x + (c - (cols - 1) / 2) * spacing, z + (r - (cols - 1) / 2) * spacing, { squadId: sq.id, loadout, crew }));
        }
        return { squadId: sq.id, ids };
    }
    // ------------------------------------------------------------ unit limits
    /** Live units (every soldier and vehicle; not structures) of a team: what the per-side and host caps count. */
    unitCount(team) {
        // pilots (players and AI crews on foot) are not units for the caps: seated crews are not entities at all
        let n = 0;
        for (let s = 0; s < this.hi; s++)
            if (this.alive[s] && this.team[s] === team && !this.d.tStructure[this.etype[s]] && !this.d.tPilot[this.etype[s]])
                n++;
        return n;
    }
    /** The per-side unit ceiling: min(map-size cap, host cap). Infinity if neither is set. */
    unitCeiling() { return Math.min(this.mapUnitCap, this.hostUnitCap); }
    /**
     * Checked spawn of one unit of type `typeId` (a whole squad for squad types)
     * against the unit limits: the per-side cap by map size and the host benchmark cap (S14, ruling 48: no
     * Command Points; crewed vehicles take their crew from the pilot reserve). Spawns nothing if any fails.
     * spawnUnit / spawnSquad stay unchecked (tests, scripted scenes).
     */
    trySpawnUnit(typeId, team, x, z, opts) {
        const d = this.d;
        const t = d.typeIds.indexOf(typeId);
        if (t < 0 || t >= d.unitCount)
            throw new Error(`unknown unit ${typeId}`);
        if (team < 0 || team >= exports.MAX_TEAMS)
            throw new Error(`team out of range`);
        const n = d.tSquadSize[t], have = this.unitCount(team);
        if (have + n > this.mapUnitCap)
            return { ok: false, reason: "mapCap", detail: `team ${team} has ${have} units; +${n} exceeds the ${this.mapSizeClass} map cap ${this.mapUnitCap}` };
        if (have + n > this.hostUnitCap)
            return { ok: false, reason: "hostCap", detail: `team ${team} has ${have} units; +${n} exceeds the host cap ${this.hostUnitCap}` };
        // S14: with a pilot reserve the AI crew comes out of it (short: uncrewed or partly crewed, pilotpool.ts)
        const pooled = this.pool !== null && d.crewOn && d.tDriverSeat[t] >= 0 && opts?.crew !== "none";
        const r = this.spawnSquad(typeId, team, x, z, n, opts?.spacing, opts?.loadout, pooled ? "none" : opts?.crew);
        if (pooled)
            for (const id of r.ids)
                this.pool.crewNew(this, this.idToSlot.get(id), opts?.crew === "expert" ? 1 : 0, opts?.building ?? 0);
        return { ok: true, squadId: r.squadId, ids: r.ids };
    }
    /** The reason trySpawnUnit would refuse one more unit of type t for team (null: it fits). */
    spawnRefusal(t, team) {
        const n = this.d.tSquadSize[t], have = this.unitCount(team);
        if (have + n > this.mapUnitCap)
            return "mapCap";
        if (have + n > this.hostUnitCap)
            return "hostCap";
        return null;
    }
    /**
     * Applies an order now. Move orders keep the group's formation. When `team`
     * is given, only that team's units accept it (host-side ownership check).
     * Returns the ids that accepted it and, for every other id, the reason
     * (OrderRejectReason): nothing is dropped silently. An `attack` order needs a
     * live enemy target that the unit's team has detected and that one of the
     * unit's weapons can damage.
     */
    order(entityIds, order, team) {
        // s7: after the match is over outside orders are refused (internal moves of the mining loop and AI pilots still run)
        if (this.match && this.match.phase === match_ts_1.MP_OVER && !this.mineOrdering && !this.quietOrders)
            return { accepted: 0, ids: [], rejected: entityIds.map((id) => ({ id, reason: "matchOver" })) };
        if (!Array.isArray(entityIds))
            return { accepted: 0, ids: [], rejected: [] };
        if (!orderWellFormed(order))
            return { accepted: 0, ids: [], rejected: entityIds.map((id) => ({ id, reason: "badInput" })) }; // QA1 bug 8
        if (order.type === "attackMyTarget")
            return this.attackMyTarget(entityIds, order.pilotId, order.targetId, team);
        const r = this.orderInner(entityIds, order, team);
        if (r.accepted && !this.mineOrdering && !this.quietOrders)
            this.ackOrder(r.ids, order);
        return r;
    }
    /**
     * QA1 bug 6: every waypoint of slot s that lies inside a structure's footprint or on a slope too steep for its class
     * moves to the nearest free cell centre (pathfinding.ts freePoint), so the unit can arrive and its order end.
     * Ground units on a map with pathfinding only (aircraft and pilots in the air have no class).
     */
    freeWaypoints(s, w) {
        const nav = this.nav;
        if (!nav)
            return;
        const k = this.d.tMove[this.etype[s]]; // W1: movement class
        if (k >= pathfinding_ts_1.NAV_CLASSES || this.d.tAir[this.etype[s]])
            return;
        const o = nav.out;
        for (let i = 0; i < w.length; i += 2)
            if (nav.freePoint(w[i], w[i + 1], k, o)) {
                w[i] = o[0];
                w[i + 1] = o[1];
            }
    }
    /** Internal orders (an AI pilot walking home) give no ACK event. */
    quietOrders = false;
    /** One ORDER_ACK event per unit that accepted an order (s5; events.ts EV.ORDER_ACK). */
    ackOrder(ids, order, kindOverride = 0) {
        const k = kindOverride || (0, orders_ts_1.orderKind)(order);
        let tgt = 0, form = 0;
        switch (order.type) {
            case "attack":
                tgt = order.targetId;
                break;
            case "pickup":
                tgt = order.pilotId;
                break;
            case "guard":
                tgt = order.pilotId ? order.pilotId : order.targetId ?? 0;
                break;
            case "attackMyTarget":
                tgt = order.targetId;
                break;
            case "follow":
                tgt = order.pilotId;
                form = (0, orders_ts_1.formationIndex)(order.formation);
                break;
            case "holdFire":
                tgt = order.on ? 1 : 0;
                break;
            case "move":
            case "attackMove":
                form = (0, orders_ts_1.formationIndex)(order.formation);
                break;
            default: break;
        }
        for (const id of ids) {
            const s = this.idToSlot.get(id);
            if (s !== undefined)
                this.events.push(events_ts_1.EV.ORDER_ACK, this.tick, this.team[s], id, k, tgt, form, 0, 0, form);
        }
    }
    /** order() without the ACK events. */
    orderInner(entityIds, order, team) {
        const res = { accepted: 0, ids: [], rejected: [] };
        const slots = [];
        for (const id of entityIds) {
            const s = this.idToSlot.get(id);
            if (s === undefined || !this.alive[s] || this.hp[s] <= 0)
                res.rejected.push({ id, reason: "unknownUnit" });
            else if (this.d.tStructure[this.etype[s]])
                res.rejected.push({ id, reason: "structure" });
            else if (team !== undefined && this.team[s] !== team)
                res.rejected.push({ id, reason: "notOwner" });
            else if (order.type !== "stop" && order.type !== "holdFire" && this.crewable(s) && this.driverIsPlayer(s))
                res.rejected.push({ id, reason: "playerDriven" });
            else if (order.type !== "stop" && order.type !== "holdFire" && this.crewable(s) && !this.drv[s])
                res.rejected.push({ id, reason: this.critTick[s] >= 0 ? "hullCritical" : "noDriver" });
            else if (order.type === "pickup" && !this.crewable(s))
                res.rejected.push({ id, reason: "notCrewable" });
            else if (this.sp !== null && this.sp.garrison.size !== 0 && order.type !== "stop" && order.type !== "holdFire" && this.sp.garrisonOf(this, s) >= 0
                && !(order.type === "move" && "x" in order && this.pts.pointAt(order.x, order.z) === this.sp.garrisonOf(this, s)))
                res.rejected.push({ id, reason: "garrisoned" }); // fix-qa2: garrisoned units take no attack (or outside) orders
            else
                slots.push(s);
        }
        const lf = order.lowFlight;
        const accept = (s) => {
            if (lf !== undefined && this.d.tAir[this.etype[s]])
                this.lowFly[s] = lf ? 1 : 0; // ruling 41: the order's low-flight flag
            res.ids.push(this.eid[s]);
            res.accepted++;
            this.ramPhase[s] = 0;
            if (this.mine && !this.mineOrdering)
                this.mine.manual(this, s);
            if (this.con && !this.mineOrdering)
                this.con.ordered(this, s);
            if (this.ord.ext.size)
                this.ord.ext.delete(this.eid[s]); // a new order replaces any s5 order (hold fire is separate)
            if (this.ord.hold.size && this.ord.hold.has(this.eid[s]))
                this.dropTargets(s); // hold fire: nothing left aimed from the old order
        };
        if (slots.length === 0)
            return res;
        if (order.type === "holdFire") {
            // s5: a toggle beside the current order (which it does not replace); on: targets dropped at once
            for (const s of slots) {
                const id = this.eid[s];
                if (order.on) {
                    this.ord.hold.add(id);
                    if (this.ordType[s] !== exports.ORD_ATTACK) {
                        this.tgtSlot[s] = -1;
                        this.tgtId[s] = 0;
                        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
                            this.mTgtSlot[s * data_ts_1.MAX_MOUNTS + m] = -1;
                            this.mTgtId[s * data_ts_1.MAX_MOUNTS + m] = 0;
                        }
                    }
                }
                else
                    this.ord.hold.delete(id);
                res.ids.push(id);
                res.accepted++;
            }
            return res;
        }
        if (order.type === "stop") {
            for (const s of slots) {
                this.ordType[s] = exports.ORD_NONE;
                this.waypoints[s] = null;
                accept(s);
            }
            return res;
        }
        if (order.type === "pickup") {
            // ruling 19: a friendly AI-driven vehicle drives to a player pilot on foot and stops beside it
            const p = this.pilots.get(order.pilotId);
            let why = null;
            if (!p || p.state === exports.P_DEAD)
                why = "unknownPilot";
            else if (p.player < 0)
                why = "notPlayerPilot";
            else if (p.state !== exports.P_FOOT)
                why = "pilotNotOnFoot";
            for (const s of slots) {
                const id = this.eid[s];
                if (why) {
                    res.rejected.push({ id, reason: why });
                    continue;
                }
                if (p.team !== this.team[s]) {
                    res.rejected.push({ id, reason: "enemyPilot" });
                    continue;
                }
                this.ordType[s] = exports.ORD_PICKUP;
                this.ordTargetId[s] = order.pilotId;
                this.waypoints[s] = null;
                accept(s);
            }
            return res;
        }
        if (order.type === "attack" && order.ground) {
            // ruling 40 attack-ground: units with an indirect-fire (data: ballistic) weapon shell the spot until another order
            const gx = this.clampMap(order.ground.x), gz = this.clampMap(order.ground.z);
            for (const s of slots) {
                const id = this.eid[s];
                let can = false;
                for (let m = 0; m < this.mCount[s]; m++) {
                    const w = this.mWeapon[s * data_ts_1.MAX_MOUNTS + m];
                    if (w >= 0 && this.d.wBallistic[w] === 1 && this.d.wCanHitGround[w])
                        can = true;
                }
                if (!Number.isFinite(gx) || !Number.isFinite(gz) || !can) {
                    res.rejected.push({ id, reason: "cannotDamageTarget" });
                    continue;
                }
                accept(s);
                this.ordType[s] = exports.ORD_ATTACK_GROUND;
                this.ordTargetId[s] = 0;
                this.waypoints[s] = new Float64Array([gx, gz]);
                this.wpIdx[s] = 0;
                this.tgtSlot[s] = -1;
            }
            return res;
        }
        if (order.type === "attack") {
            const ts = this.idToSlot.get(order.targetId);
            if (ts === undefined || !this.alive[ts] || this.hp[ts] <= 0) {
                for (const s of slots)
                    res.rejected.push({ id: this.eid[s], reason: "unknownTarget" });
                return res;
            }
            for (const s of slots) {
                const id = this.eid[s];
                if (this.team[s] === this.team[ts]) {
                    res.rejected.push({ id, reason: "friendlyTarget" });
                    continue;
                }
                if (!this.detected(ts, this.team[s])) {
                    res.rejected.push({ id, reason: "targetNotDetected" });
                    continue;
                }
                let can = false;
                for (let m = 0; m < this.mCount[s]; m++)
                    if (this.canHit(this.mWeapon[s * data_ts_1.MAX_MOUNTS + m], ts))
                        can = true;
                if (!can) {
                    res.rejected.push({ id, reason: "cannotDamageTarget" });
                    continue;
                }
                this.ordType[s] = exports.ORD_ATTACK;
                this.ordTargetId[s] = order.targetId;
                this.waypoints[s] = null;
                this.tgtSlot[s] = -1; // re-target at once (next targeting pass)
                accept(s);
            }
            return res;
        }
        if (order.type !== "move" && order.type !== "attackMove") {
            this.orderS5(slots, order, res, accept);
            return res;
        }
        const wps = "waypoints" in order ? order.waypoints : [[order.x, order.z]];
        if (wps.length === 0) {
            for (const s of slots)
                res.rejected.push({ id: this.eid[s], reason: "noWaypoints" });
            return res;
        }
        const form = (0, orders_ts_1.formationIndex)(order.formation);
        if (form !== orders_ts_1.FM_NONE) {
            const g = this.formationMove(slots, wps, form, order.type === "move" ? exports.ORD_MOVE : exports.ORD_ATTACK_MOVE);
            for (const s of slots)
                accept(s);
            const off = this.formationOffsets(slots, form);
            for (const s of slots) {
                const o = off.get(s);
                this.ord.set(this.eid[s], { kind: order.type === "move" ? orders_ts_1.OK_MOVE : orders_ts_1.OK_ATTACK_MOVE, form, speed: g.speed, tgt: g.id, ox: o[0], oz: o[1] });
            }
            return res;
        }
        let cx = 0, cz = 0;
        for (const s of slots) {
            cx += this.x[s];
            cz += this.z[s];
        }
        cx /= slots.length;
        cz /= slots.length;
        const maxSpread = this.d.constants.formationMaxSpread;
        for (const s of slots) {
            let ox = this.x[s] - cx, oz = this.z[s] - cz;
            const ol = Math.sqrt(ox * ox + oz * oz);
            if (ol > maxSpread) {
                ox = (ox / ol) * maxSpread;
                oz = (oz / ol) * maxSpread;
            }
            const w = new Float64Array(wps.length * 2);
            for (let i = 0; i < wps.length; i++) {
                w[i * 2] = this.clampMap(wps[i][0] + ox);
                w[i * 2 + 1] = this.clampMap(wps[i][1] + oz);
            }
            this.freeWaypoints(s, w);
            this.waypoints[s] = w;
            this.wpIdx[s] = 0;
            this.ordType[s] = order.type === "move" ? exports.ORD_MOVE : exports.ORD_ATTACK_MOVE;
            accept(s);
        }
        return res;
    }
    /**
     * Attack my target (s5): the issuing player pilot's current target (sent in the order: the sim does not track a
     * player's aim) becomes the attack target of the units. Pilot checks (unknownPilot, notPlayerPilot; enemyPilot per
     * unit of another team), then exactly an `attack` order (same rejections, same fire priority, same end events).
     */
    attackMyTarget(entityIds, pilotId, targetId, team) {
        const p = this.pilots.get(pilotId);
        const why = !p || p.state === exports.P_DEAD ? "unknownPilot" : p.player < 0 ? "notPlayerPilot" : null;
        if (why)
            return { accepted: 0, ids: [], rejected: entityIds.map((id) => ({ id, reason: why })) };
        const ok = [], rej = [];
        for (const id of entityIds) {
            const s = this.idToSlot.get(id);
            if (s !== undefined && this.alive[s] && this.hp[s] > 0 && this.team[s] !== p.team && (team === undefined || this.team[s] === team))
                rej.push({ id, reason: "enemyPilot" });
            else
                ok.push(id);
        }
        const r = this.orderInner(ok, { type: "attack", targetId }, team);
        for (const x of rej)
            r.rejected.push(x);
        if (r.accepted && !this.mineOrdering && !this.quietOrders)
            this.ackOrder(r.ids, { type: "attackMyTarget", pilotId, targetId });
        return r;
    }
    /** The s5 orders other than formation moves (orders.ts): guard, defend, attackMyTarget, follow, holdFire, retreat. */
    orderS5(slots, order, res, accept) {
        const clear = (s) => { this.ordType[s] = exports.ORD_NONE; this.waypoints[s] = null; this.wpIdx[s] = 0; };
        switch (order.type) {
            case "guard": {
                const byPilot = order.pilotId !== undefined && order.pilotId !== 0, byEnt = order.targetId !== undefined && order.targetId !== 0;
                let why = null, ts = -1, pt = -1;
                if (byPilot === byEnt)
                    why = "unknownTarget";
                else if (byPilot) {
                    const p = this.pilots.get(order.pilotId);
                    if (!p || p.state === exports.P_DEAD)
                        why = "unknownPilot";
                    else
                        pt = p.team;
                }
                else {
                    const x = this.idToSlot.get(order.targetId);
                    if (x === undefined || !this.alive[x] || this.hp[x] <= 0)
                        why = "unknownTarget";
                    else
                        ts = x;
                }
                for (const s of slots) {
                    const id = this.eid[s];
                    if (why) {
                        res.rejected.push({ id, reason: why });
                        continue;
                    }
                    if (byPilot && pt !== this.team[s]) {
                        res.rejected.push({ id, reason: "enemyPilot" });
                        continue;
                    }
                    if (byEnt && ts === s) {
                        res.rejected.push({ id, reason: "selfTarget" });
                        continue;
                    }
                    if (byEnt && this.team[ts] !== this.team[s]) {
                        res.rejected.push({ id, reason: "notFriendly" });
                        continue;
                    }
                    clear(s);
                    accept(s);
                    this.ord.set(id, { kind: orders_ts_1.OK_GUARD, tgt: byPilot ? order.pilotId : order.targetId, pilot: byPilot ? 1 : 0 });
                }
                return;
            }
            case "defend": {
                // each unit holds the spot plus its offset from the group centre (as a plain move, clamped to formationMaxSpread)
                let cx = 0, cz = 0;
                for (const s of slots) {
                    cx += this.x[s];
                    cz += this.z[s];
                }
                cx /= slots.length;
                cz /= slots.length;
                const maxSpread = this.d.constants.formationMaxSpread;
                for (const s of slots) {
                    let ox = this.x[s] - cx, oz = this.z[s] - cz;
                    const ol = Math.sqrt(ox * ox + oz * oz);
                    if (ol > maxSpread) {
                        ox = (ox / ol) * maxSpread;
                        oz = (oz / ol) * maxSpread;
                    }
                    clear(s);
                    accept(s);
                    const dp = [this.clampMap(order.x + ox), this.clampMap(order.z + oz)];
                    if (this.nav)
                        this.nav.freePoint(dp[0], dp[1], this.d.tMove[this.etype[s]], dp); // QA1 bug 6
                    this.ord.set(this.eid[s], { kind: orders_ts_1.OK_DEFEND, x: dp[0], z: dp[1], ox, oz });
                }
                return;
            }
            case "follow": {
                const p = this.pilots.get(order.pilotId);
                const why = !p || p.state === exports.P_DEAD ? "unknownPilot" : p.player < 0 ? "notPlayerPilot" : null;
                const form = (0, orders_ts_1.formationIndex)(order.formation);
                const mine = slots.filter((s) => {
                    const id = this.eid[s];
                    if (why) {
                        res.rejected.push({ id, reason: why });
                        return false;
                    }
                    if (p.team !== this.team[s]) {
                        res.rejected.push({ id, reason: "enemyPilot" });
                        return false;
                    }
                    return true;
                });
                if (mine.length === 0)
                    return;
                // slots: formation [right, forward] around the follow point; "none": each unit's world offset from the group centre (clamped)
                const off = form !== orders_ts_1.FM_NONE ? this.formationOffsets(mine, form) : null;
                let cx = 0, cz = 0;
                for (const s of mine) {
                    cx += this.x[s];
                    cz += this.z[s];
                }
                cx /= mine.length;
                cz /= mine.length;
                const maxSpread = this.d.constants.formationMaxSpread, speed = form !== orders_ts_1.FM_NONE ? this.groupSpeed(mine) : 0;
                for (const s of mine) {
                    let ox, oz;
                    if (off)
                        [ox, oz] = off.get(s);
                    else {
                        ox = this.x[s] - cx;
                        oz = this.z[s] - cz;
                        const l = Math.sqrt(ox * ox + oz * oz);
                        if (l > maxSpread) {
                            ox *= maxSpread / l;
                            oz *= maxSpread / l;
                        }
                    }
                    clear(s);
                    accept(s);
                    this.ord.set(this.eid[s], { kind: orders_ts_1.OK_FOLLOW, tgt: order.pilotId, pilot: 1, form, ox, oz, speed });
                }
                return;
            }
            case "retreat": {
                // nearest given point, else the nearest own Command Core (effects.supplySource), stopping short of its hull
                const cores = [];
                if (!order.points || order.points.length === 0)
                    for (let o = 0; o < this.hi; o++)
                        if (this.alive[o] && this.hp[o] > 0 && this.ord.isCore(this.etype[o]))
                            cores.push(o);
                for (const s of slots) {
                    let gx = 0, gz = 0, bd = Infinity;
                    if (order.points && order.points.length) {
                        for (const [px, pz] of order.points) {
                            const dx = px - this.x[s], dz = pz - this.z[s], d2 = dx * dx + dz * dz;
                            if (d2 < bd) {
                                bd = d2;
                                gx = px;
                                gz = pz;
                            }
                        }
                    }
                    else {
                        let best = -1;
                        for (const o of cores) {
                            if (this.team[o] !== this.team[s])
                                continue;
                            const dx = this.x[o] - this.x[s], dz = this.z[o] - this.z[s], d2 = dx * dx + dz * dz;
                            if (d2 < bd) {
                                bd = d2;
                                best = o;
                            }
                        }
                        if (best < 0) {
                            res.rejected.push({ id: this.eid[s], reason: "noRetreatPoint" });
                            continue;
                        }
                        let ux = this.x[s] - this.x[best], uz = this.z[s] - this.z[best];
                        const l = Math.sqrt(ux * ux + uz * uz);
                        if (l > 1e-6) {
                            ux /= l;
                            uz /= l;
                        }
                        else {
                            ux = 1;
                            uz = 0;
                        }
                        const k = this.d.tRadius[this.etype[best]] + 2 * this.d.tRadius[this.etype[s]] + this.d.constants.arrivalRadius;
                        gx = this.x[best] + ux * k;
                        gz = this.z[best] + uz * k;
                    }
                    clear(s);
                    accept(s);
                    this.steerTo(s, gx, gz);
                    this.tgtSlot[s] = -1;
                    this.tgtId[s] = 0;
                    for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
                        this.mTgtSlot[s * data_ts_1.MAX_MOUNTS + m] = -1;
                        this.mTgtId[s * data_ts_1.MAX_MOUNTS + m] = 0;
                    }
                    this.ord.set(this.eid[s], { kind: orders_ts_1.OK_RETREAT, x: this.clampMap(gx), z: this.clampMap(gz) });
                }
                return;
            }
            default: throw new Error(`order type ${order.type} not implemented yet`);
        }
    }
    /** Ends an s5 order that lost its guarded / followed target (recorded: orderEvents + REJECT event, as pickupEnded). */
    endS5(s, id) {
        this.ord.ext.delete(id);
        this.ordType[s] = exports.ORD_NONE;
        this.waypoints[s] = null;
        this.orderEvents.push({ tick: this.tick, seq: 0, id, reason: "orderTargetGone" });
        this.events.push(events_ts_1.EV.REJECT, this.tick, this.team[s], 0, id, reasonCode("orderTargetGone"), 0, 0, 0, 0);
    }
    /**
     * s5 snapshot / API: the unit's current order kind (OK_*), its target (attack target entity, guarded entity or pilot,
     * followed pilot, pickup pilot; 0 none), whether the target is a pilot id, its formation and hold fire.
     */
    orderState(s) {
        const id = this.eid[s], e = this.ord.ext.size ? this.ord.ext.get(id) : undefined, hold = this.ord.hold.has(id);
        if (e)
            return { kind: e.kind, target: e.kind === orders_ts_1.OK_GUARD || e.kind === orders_ts_1.OK_FOLLOW ? e.tgt : 0, targetIsPilot: e.pilot === 1, formation: e.form, holdFire: hold };
        const o = this.ordType[s];
        const kind = o === exports.ORD_MOVE ? orders_ts_1.OK_MOVE : o === exports.ORD_ATTACK_MOVE ? orders_ts_1.OK_ATTACK_MOVE : o === exports.ORD_ATTACK || o === exports.ORD_ATTACK_GROUND ? 4 : o === exports.ORD_PICKUP ? 5 : 0;
        return { kind, target: o === exports.ORD_ATTACK || o === exports.ORD_PICKUP ? this.ordTargetId[s] : 0, targetIsPilot: o === exports.ORD_PICKUP, formation: 0, holdFire: hold };
    }
    /** Slot of the body a pilot is in: its on-foot entity or the vehicle it sits in (-1 dead / unknown). */
    pilotBodySlot(pilotId) {
        const p = this.pilots.get(pilotId);
        if (!p || p.state === exports.P_DEAD)
            return -1;
        const id = p.state === exports.P_FOOT ? p.entity : p.vehicle;
        const s = this.idToSlot.get(id);
        return s !== undefined && this.alive[s] && this.hp[s] > 0 ? s : -1;
    }
    /** Nearest enemy (to ax, az) within r of it that unit s's team detects and one of s's weapons can damage; -1 none. */
    findThreat(s, ax, az, r) {
        const d = this.d, team = this.team[s], r2 = r * r, mb = s * data_ts_1.MAX_MOUNTS;
        let best = -1, bd = Infinity;
        for (let o = 0; o < this.hi; o++) {
            if (!this.alive[o] || this.hp[o] <= 0 || this.team[o] === team)
                continue;
            if (d.crewOn && this.nOcc[o] === 0 && d.tDriverSeat[this.etype[o]] >= 0)
                continue; // empty vehicle: no threat
            const dx = this.x[o] - ax, dz = this.z[o] - az, d2 = dx * dx + dz * dz;
            if (d2 > r2 || d2 >= bd)
                continue;
            if (!this.detected(o, team))
                continue;
            let can = false;
            for (let m = 0; m < this.mCount[s]; m++)
                if (this.mOn[mb + m] && this.canHit(this.mWeapon[mb + m], o)) {
                    can = true;
                    break;
                }
            if (!can)
                continue;
            best = o;
            bd = d2;
        }
        return best;
    }
    /** Points unit s at (gx, gz) with a single-waypoint move (kept if it already heads there). */
    steerTo(s, gx, gz) {
        gx = this.clampMap(gx);
        gz = this.clampMap(gz);
        const w = this.waypoints[s];
        if (this.ordType[s] === exports.ORD_MOVE && w && w.length === 2 && Math.abs(w[0] - gx) < 0.5 && Math.abs(w[1] - gz) < 0.5)
            return;
        this.waypoints[s] = new Float64Array([gx, gz]);
        this.wpIdx[s] = 0;
        this.ordType[s] = exports.ORD_MOVE;
    }
    /**
     * Guard / defend controller (orders.ts header): engage the nearest threat within threatR of the anchor while within
     * leash of it; past the leash, or with no threat, return to within stay of it (threats ignored until back).
     * goal: where to go when returning (guard: stay / 2 short of the anchor on the unit's side; defend: the spot).
     */
    holdArea(s, e, ax, az, stay, threatR, leash, gx, gz) {
        const dx = this.x[s] - ax, dz = this.z[s] - az, du = Math.sqrt(dx * dx + dz * dz);
        if (e.ret && du <= stay)
            e.ret = 0;
        if (du > leash)
            e.ret = 1;
        let th = -1;
        if (!e.ret && !this.ord.hold.has(this.eid[s])) {
            if (e.eng) {
                const ts = this.idToSlot.get(e.eng);
                if (ts !== undefined && this.alive[ts] && this.hp[ts] > 0 && this.detected(ts, this.team[s])) {
                    const tx = this.x[ts] - ax, tz = this.z[ts] - az;
                    if (tx * tx + tz * tz <= threatR * threatR)
                        th = ts;
                }
            }
            if (th < 0)
                th = this.findThreat(s, ax, az, threatR);
        }
        if (th >= 0) {
            if (this.ordType[s] !== exports.ORD_ATTACK || this.ordTargetId[s] !== this.eid[th]) {
                this.ordType[s] = exports.ORD_ATTACK;
                this.ordTargetId[s] = this.eid[th];
                this.waypoints[s] = null;
                this.tgtSlot[s] = -1;
            }
            e.eng = this.eid[th];
            return;
        }
        e.eng = 0;
        if (this.ordType[s] === exports.ORD_ATTACK) {
            this.ordType[s] = exports.ORD_NONE;
            this.ordTargetId[s] = 0;
        }
        if (e.ret || du > stay)
            this.steerTo(s, gx, gz);
    }
    /** Clears the unit's primary and mount targets (re-acquired by the next targeting pass). */
    dropTargets(s) {
        this.tgtSlot[s] = -1;
        this.tgtId[s] = 0;
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
            this.mTgtSlot[s * data_ts_1.MAX_MOUNTS + m] = -1;
            this.mTgtId[s * data_ts_1.MAX_MOUNTS + m] = 0;
        }
    }
    /** Slowest top speed among slots (formation group speed). */
    groupSpeed(slots) {
        let v = Infinity;
        for (const s of slots)
            if (this.d.tSpeed[this.etype[s]] < v)
                v = this.d.tSpeed[this.etype[s]];
        return v;
    }
    /** Ruling 22 role rank in a mixed formation: 0 heavy / medium armour (front), 1 other, 2 anti-air (inside), 3 artillery (back). */
    roleRank(s) {
        const d = this.d, t = this.etype[s], ac = d.tArmour[t];
        let ballistic = false, aa = false;
        for (let m = 0; m < this.mCount[s]; m++) {
            const w = this.mWeapon[s * data_ts_1.MAX_MOUNTS + m];
            if (w < 0)
                continue;
            if (d.wBallistic[w])
                ballistic = true;
            if (d.wDamageType[w] === data_ts_1.DT_FLAK)
                aa = true;
        }
        if (ballistic)
            return 3;
        if (aa)
            return 2;
        return ac === 3 || ac === 4 ? 0 : 1; // ARMOUR_CLASSES medium, heavy
    }
    /** Slots in formation role order (rank, then entity id). */
    formationOrder(slots) {
        return slots.slice().sort((a, b) => (this.roleRank(a) - this.roleRank(b)) || (this.eid[a] - this.eid[b]));
    }
    /** Slot spacing of a formation of these slots (orders.formation). */
    formationSpacing(slots) {
        const R = this.ord.rules;
        let r = 0;
        for (const s of slots)
            if (this.d.tRadius[this.etype[s]] > r)
                r = this.d.tRadius[this.etype[s]];
        return R.spacingMul * r + R.spacingGap;
    }
    /** Per-unit formation slot [right, forward] (role order, line rear row for artillery, infantry jitter). */
    formationOffsets(slots, form) {
        const ordered = this.formationOrder(slots);
        const rk = ordered.map((s) => this.roleRank(s));
        const sl = (0, orders_ts_1.formationSlots)(form, ordered.length, this.formationSpacing(slots), rk.map((r) => (r === 3 ? 1 : 0)), rk.map((r) => (r === 2 ? 1 : 0)));
        // infantry jitter at most a quarter of the slot spacing (designer playtest: formations read as loose)
        const J = Math.min(this.ord.rules.jitter, this.formationSpacing(slots) * 0.25), out = new Map();
        ordered.forEach((s, k) => {
            const t = this.etype[s];
            const inf = this.d.tArmour[t] === data_ts_1.AC_INFANTRY;
            out.set(s, inf && J > 0 ? [sl[k][0] + J * (0, orders_ts_1.jitterUnit)(this.eid[s], 1), sl[k][1] + J * (0, orders_ts_1.jitterUnit)(this.eid[s], 2)] : sl[k]);
        });
        return out;
    }
    /**
     * Formation move (orders.ts header): each unit's waypoints are the group's waypoints plus its slot, turned to the
     * direction of each leg (first leg: from the group centre).
     */
    formationMove(slots, wps, form, ord) {
        let cx = 0, cz = 0;
        for (const s of slots) {
            cx += this.x[s];
            cz += this.z[s];
        }
        cx /= slots.length;
        cz /= slots.length;
        const off = this.formationOffsets(slots, form);
        // heading per leg
        const hx = new Float64Array(wps.length), hz = new Float64Array(wps.length);
        let px = cx, pz = cz, lx = 0, lz = 1;
        for (let i = 0; i < wps.length; i++) {
            const dx = wps[i][0] - px, dz = wps[i][1] - pz, l = Math.sqrt(dx * dx + dz * dz);
            if (l > 1e-6) {
                lx = dx / l;
                lz = dz / l;
            }
            hx[i] = lx;
            hz[i] = lz;
            px = wps[i][0];
            pz = wps[i][1];
        }
        for (const s of slots) {
            const [r, f] = off.get(s);
            const w = new Float64Array(wps.length * 2);
            for (let i = 0; i < wps.length; i++) {
                // right of heading (hx, hz) is (-hz, hx)
                w[i * 2] = this.clampMap(wps[i][0] - hz[i] * r + hx[i] * f);
                w[i * 2 + 1] = this.clampMap(wps[i][1] + hx[i] * r + hz[i] * f);
            }
            this.freeWaypoints(s, w);
            this.waypoints[s] = w;
            this.wpIdx[s] = 0;
            this.ordType[s] = ord;
        }
        // the moving anchor (formation cohesion): starts at the group centre, travels the group's waypoints
        const flat = [];
        for (const p of wps)
            flat.push(this.clampMap(p[0]), this.clampMap(p[1]));
        const n = wps.length;
        const g = { id: this.ord.nextGroup++, wps: flat, leg: 0, ax: cx, az: cz, hx: hx[0], hz: hz[0], fhx: hx[n - 1], fhz: hz[n - 1], speed: this.groupSpeed(slots), done: 0 };
        this.ord.groups.set(g.id, g);
        return g;
    }
    /**
     * Formation cohesion (phase 1b, every tick while groups exist): the anchor advances along the group path at group
     * speed, slowed linearly from full speed at slotToleranceMetres of worst straggler lag to a stop at
     * stragglerWaitMetres behind its slot; each member drives toward its moving slot (led by slotLeadSeconds of group speed) at its own top
     * speed up to catchUpMultiplier x group speed while it is out of its slot behind, at aheadSpeedFactor x group speed
     * while it is ahead, and at group speed within slotToleranceMetres. When the anchor has reached the end, members drive
     * to their final slots and arrive as before.
     */
    formationStep() {
        const O = this.ord, R = O.rules, dt = this.d.dt;
        const mem = new Map();
        for (const id of Array.from(O.ext.keys()).sort((a, b) => a - b)) {
            const e = O.ext.get(id);
            if (e.form === orders_ts_1.FM_NONE || (e.kind !== orders_ts_1.OK_MOVE && e.kind !== orders_ts_1.OK_ATTACK_MOVE) || !O.groups.has(e.tgt))
                continue;
            const s = this.idToSlot.get(id);
            if (s === undefined || !this.alive[s] || this.hp[s] <= 0 || !this.waypoints[s])
                continue;
            let l = mem.get(e.tgt);
            if (!l)
                mem.set(e.tgt, l = []);
            l.push(s);
        }
        for (const gid of Array.from(O.groups.keys()).sort((a, b) => a - b)) {
            const g = O.groups.get(gid), ms = mem.get(gid);
            if (!ms) {
                O.groups.delete(gid);
                continue;
            }
            // s6: the group's path class is its most slope-limited member; when a member's slot is cut off from the anchor
            // (a gap narrower than the formation) the whole group closes into a column behind the anchor until all are clear.
            // QA3-13: with a terrain layer, passability differs per class (liquid: vehicles only; caves: bikes and infantry),
            // so a mixed group paths on the combined class (navGroupClass: blocked where any member's class is blocked).
            const nav = this.nav;
            let gcls = -1, col = null, cs = 0;
            if (nav) {
                let mask = 0;
                for (const s of ms) {
                    const k = this.d.tMove[this.etype[s]];
                    if (k < pathfinding_ts_1.NAV_CLASSES) {
                        mask |= 1 << k;
                        if (gcls < 0 || nav.R.tan2[k] < nav.R.tan2[gcls])
                            gcls = k;
                    }
                }
                if (nav.layered && mask !== 0)
                    gcls = (0, pathfinding_ts_1.navGroupClass)(mask);
                if (gcls >= 0) {
                    for (const s of ms) {
                        const e = O.ext.get(this.eid[s]), k = this.d.tMove[this.etype[s]];
                        if (k >= pathfinding_ts_1.NAV_CLASSES)
                            continue;
                        if (!nav.clear(g.ax, g.az, g.ax - g.hz * e.ox + g.hx * e.oz, g.az + g.hx * e.ox + g.hz * e.oz, k)) {
                            col = new Map();
                            break;
                        }
                    }
                    if (col) {
                        const ord = this.formationOrder(ms);
                        ord.forEach((s, i) => col.set(s, i));
                        cs = this.formationSpacing(ms);
                    }
                }
            }
            const colD = (s) => col ? col.get(s) * cs : -1; // column: metres behind the anchor (-1: formation slot)
            const slotX = (e, ax, az, hx, hz, cd = -1) => cd >= 0 ? ax - hx * cd : ax - hz * e.ox + hx * e.oz;
            const slotZ = (e, ax, az, hx, hz, cd = -1) => cd >= 0 ? az - hz * cd : az + hx * e.ox + hz * e.oz;
            // worst straggler (units that can move only)
            let worst = 0;
            for (const s of ms) {
                if (this.ctlOn[s] || (this.crewable(s) && (!this.drv[s] || this.driverIsPlayer(s))))
                    continue;
                const e = O.ext.get(this.eid[s]);
                const lag = (slotX(e, g.ax, g.az, g.hx, g.hz, colD(s)) - this.x[s]) * g.hx + (slotZ(e, g.ax, g.az, g.hx, g.hz, colD(s)) - this.z[s]) * g.hz;
                if (lag > worst)
                    worst = lag;
            }
            const W = R.waitMetres, T = R.slotTol, factor = worst <= T ? 1 : worst >= W ? 0 : 1 - (worst - T) / (W - T);
            // advance the anchor
            const nw = g.wps.length / 2;
            let rem = g.speed * factor * dt;
            let guard = 0;
            while (rem > 0 && g.leg < nw && guard++ < 64) {
                let tx = g.wps[g.leg * 2], tz = g.wps[g.leg * 2 + 1];
                // s6: the anchor follows the path to its current leg's end
                const via = nav !== null && gcls >= 0 && nav.steer(-(gid + 1), gcls, g.ax, g.az, tx, tz, this.tick, nav.out);
                if (via) {
                    tx = nav.out[0];
                    tz = nav.out[1];
                }
                // QA3-13: the group's path has run out short of the leg's end (not reachable by every member): the formation
                // ends here and each member drives to its final slot on its own path (its own class), so nobody waits forever
                else if (nav !== null && gcls >= 0 && nav.exhausted(-(gid + 1))) {
                    g.leg = nw;
                    break;
                }
                const dx = tx - g.ax, dz = tz - g.az, d = Math.sqrt(dx * dx + dz * dz);
                // QA3-13: driving straight (no path waypoint) onto ground some member cannot enter (a goal in a lake or on a
                // slope): same end of the formation as above
                if (!via && nav !== null && gcls >= 0 && d > 1e-6) {
                    const st = Math.min(rem, d);
                    if (nav.groundBlocked(g.ax + dx / d * st, g.az + dz / d * st, gcls) && !nav.groundBlocked(g.ax, g.az, gcls)) {
                        g.leg = nw;
                        break;
                    }
                }
                if (d > 1e-6) {
                    g.hx = dx / d;
                    g.hz = dz / d;
                }
                if (d <= rem) {
                    g.ax = tx;
                    g.az = tz;
                    rem -= d;
                    if (!via)
                        g.leg++;
                }
                else {
                    g.ax += g.hx * rem;
                    g.az += g.hz * rem;
                    rem = 0;
                }
            }
            if (g.leg >= nw)
                g.done = 1;
            const fx = g.wps[(nw - 1) * 2], fz = g.wps[(nw - 1) * 2 + 1], lead = g.speed * R.leadSeconds;
            for (const s of ms) {
                const e = O.ext.get(this.eid[s]);
                const px = this.clampMap(slotX(e, g.ax, g.az, g.hx, g.hz, colD(s))), pz = this.clampMap(slotZ(e, g.ax, g.az, g.hx, g.hz, colD(s)));
                const ex = this.clampMap(slotX(e, fx, fz, g.fhx, g.fhz)), ez = this.clampMap(slotZ(e, fx, fz, g.fhx, g.fhz));
                const dx = px - this.x[s], dz = pz - this.z[s], lag = dx * g.hx + dz * g.hz, dist = Math.sqrt(dx * dx + dz * dz);
                const own = this.d.tSpeed[this.etype[s]];
                e.speed = lag > R.slotTol || (dist > R.slotTol && lag >= 0) ? Math.min(own, R.catchUp * g.speed) : lag < -R.slotTol ? g.speed * R.aheadFactor : g.speed;
                let w = this.waypoints[s];
                if (g.done) {
                    if (w.length !== 2)
                        w = this.waypoints[s] = new Float64Array(2);
                    w[0] = ex;
                    w[1] = ez;
                }
                else {
                    if (w.length !== 4)
                        w = this.waypoints[s] = new Float64Array(4);
                    w[0] = this.clampMap(px + g.hx * lead);
                    w[1] = this.clampMap(pz + g.hz * lead);
                    w[2] = ex;
                    w[3] = ez;
                }
                this.freeWaypoints(s, w); // QA1 bug 6: no slot inside a building or on a slope the unit cannot climb
                this.wpIdx[s] = 0;
            }
            if (g.done)
                O.groups.delete(gid);
        }
    }
    /** Phase 1b: s5 order upkeep, in entity id order (deterministic). */
    thinkOrders(tick) {
        if (this.ord.hold.size)
            for (const id of Array.from(this.ord.hold)) {
                const s = this.idToSlot.get(id);
                if (s === undefined || !this.alive[s] || this.hp[s] <= 0)
                    this.ord.hold.delete(id);
            }
        if (this.ord.groups.size)
            this.formationStep();
        const ids = Array.from(this.ord.ext.keys()).sort((a, b) => a - b);
        for (const id of ids) {
            const e = this.ord.ext.get(id);
            const s = this.idToSlot.get(id);
            if (s === undefined || !this.alive[s] || this.hp[s] <= 0) {
                this.ord.ext.delete(id);
                continue;
            }
            if (e.kind === orders_ts_1.OK_MOVE || e.kind === orders_ts_1.OK_ATTACK_MOVE) {
                const want = e.kind === orders_ts_1.OK_MOVE ? exports.ORD_MOVE : exports.ORD_ATTACK_MOVE;
                if (this.ordType[s] !== want || !this.waypoints[s])
                    this.ord.ext.delete(id); // arrived, or replaced from inside the sim
                continue;
            }
            if (e.kind === orders_ts_1.OK_RETREAT) {
                if (this.ordType[s] !== exports.ORD_MOVE || !this.waypoints[s])
                    this.ord.ext.delete(id);
                continue;
            } // arrived
            if (this.crewable(s)) {
                if (this.driverIsPlayer(s)) {
                    this.ord.ext.delete(id);
                    this.ordType[s] = exports.ORD_NONE;
                    this.waypoints[s] = null;
                    continue;
                } // a player took the wheel: the AI's order ends
                if (!this.drv[s])
                    continue; // no driver: nothing moves; the order waits
            }
            const R = this.ord.rules;
            if ((tick + this.phaseOf(s)) % R.thinkTicks !== 0)
                continue;
            if (e.kind === orders_ts_1.OK_GUARD) {
                // QA3-16: a downed pilot's body (hp 0, waiting for a revive) is still guarded; the order goes on when he is revived
                const gp = e.pilot ? this.pilots.get(e.tgt) : undefined, downed = gp !== undefined && gp.state === pilotkit_ts_1.P_DOWNED;
                const as = downed ? this.idToSlot.get(gp.entity) ?? -1 : e.pilot ? this.pilotBodySlot(e.tgt) : this.idToSlot.get(e.tgt) ?? -1;
                if (as < 0 || !this.alive[as] || (this.hp[as] <= 0 && !downed)) {
                    this.endS5(s, id);
                    continue;
                }
                if (as === s)
                    continue; // a guarding pilot's own body (cannot happen: players are not ordered)
                const ax = this.x[as], az = this.z[as];
                let ux = this.x[s] - ax, uz = this.z[s] - az;
                const ul = Math.sqrt(ux * ux + uz * uz);
                if (ul > 1e-6) {
                    ux /= ul;
                    uz /= ul;
                }
                else {
                    ux = 1;
                    uz = 0;
                }
                const k = R.guardStay * 0.5 + this.d.tRadius[this.etype[as]];
                this.holdArea(s, e, ax, az, R.guardStay + this.d.tRadius[this.etype[as]], R.guardThreat, R.guardLeash, ax + ux * k, az + uz * k);
            }
            else if (e.kind === orders_ts_1.OK_FOLLOW) {
                const p = this.pilots.get(e.tgt);
                if (!p || p.state === exports.P_DEAD) {
                    this.endS5(s, id);
                    continue;
                }
                const as = this.pilotBodySlot(e.tgt);
                if (as < 0 || as === s)
                    continue; // between bodies (cannot normally happen): hold
                // follow point: followDist behind the pilot's body along its heading; formation slots turn with that heading
                const hx = this.dirX[as], hz = this.dirZ[as];
                const bx = this.x[as] - hx * (R.followDist + this.d.tRadius[this.etype[as]]), bz = this.z[as] - hz * (R.followDist + this.d.tRadius[this.etype[as]]);
                const gx = e.form !== orders_ts_1.FM_NONE ? bx - hz * e.ox + hx * e.oz : bx + e.ox;
                const gz = e.form !== orders_ts_1.FM_NONE ? bz + hx * e.ox + hz * e.oz : bz + e.oz;
                const dx = this.x[s] - gx, dz = this.z[s] - gz;
                if (dx * dx + dz * dz > R.followSlack * R.followSlack)
                    this.steerTo(s, gx, gz);
            }
            else if (e.kind === orders_ts_1.OK_DEFEND) {
                this.holdArea(s, e, e.x, e.z, 2 * this.d.constants.arrivalRadius, R.defendRadius, R.defendLeash, e.x, e.z);
            }
        }
    }
    /** Is a player in the driver seat of crewed vehicle slot s? */
    driverIsPlayer(s) {
        const pid = this.occ[s * data_ts_1.MAX_SEATS + this.d.tDriverSeat[this.etype[s]]];
        if (pid === 0)
            return false;
        const p = this.pilots.get(pid);
        return !!p && p.player >= 0 && !this.isBotPilot(pid);
    }
    /** Frontline 4c: an AI pilot with a player-style record (its vehicle takes AI orders like any AI crew's). */
    isBotPilot(pid) { return !!(this.fkit && this.fkit.bots && this.fkit.bots.ids.has(pid)); }
    /** Is a player pilot anywhere aboard vehicle slot s? */
    playerAboard(s) {
        const ns = this.d.tSeatCount[this.etype[s]], sb = s * data_ts_1.MAX_SEATS;
        for (let j = 0; j < ns; j++) {
            const pid = this.occ[sb + j];
            if (pid !== 0 && (this.pilots.get(pid)?.player ?? -1) >= 0 && !this.isBotPilot(pid))
                return true;
        }
        return false;
    }
    /** order() for every member of a squad. An unknown squad id gives an empty result. */
    orderSquad(squadId, order, team) {
        const sq = this.squads.get(squadId);
        return sq ? this.order(sq.members.slice(), order, team) : { accepted: 0, ids: [], rejected: [] };
    }
    /**
     * Tick-stamped input: the order is applied at the start of the step that
     * produces tick `tick` (so it must be > the current tick). Orders for the same
     * tick apply in the order they were queued. Returns the input's sequence number.
     */
    queueOrder(tick, entityIds, order, team) {
        if (!Number.isInteger(tick) || tick <= this.tick)
            throw new Error(`queueOrder: tick ${tick} is not in the future (current tick ${this.tick})`);
        // QA1 bug 8: a malformed order (from a guest) is refused with badInput, never thrown
        if (!Array.isArray(entityIds) || !entityIds.every(isId) || (team !== undefined && !isTeam(team)) || !orderWellFormed(order))
            return this.refuseInput(0, Array.isArray(entityIds) ? entityIds[0] : 0, team);
        const inp = { tick, seq: ++this.inputSeq, ids: entityIds.slice(), order: cloneOrder(order), team: team === undefined ? NO_TEAM : team };
        let i = this.pending.length;
        while (i > 0 && this.pending[i - 1].tick > tick)
            i--;
        this.pending.splice(i, 0, inp);
        return inp.seq;
    }
    /**
     * Tick-stamped direct control of one entity (see ControlInput): applied at the
     * start of the step that produces tick `tick` (> current tick), after that
     * tick's orders. `input` null releases control (and clears all control state).
     * With `team` given, only that team's entity accepts it. Rejections are recorded
     * in orderEvents (and the event log) with the input's seq. Returns the sequence number.
     *
     * With crews (real data; CONTRACTS revision 4) it may only drive (a) the caller's own pilot on foot (entityId =
     * the pilot's entity), (b) the vehicle whose DRIVER seat the caller's pilot occupies, or (c) the weapon(s) of the
     * GUNNER seat the caller's pilot occupies (entityId = the vehicle, pilotId given). `pilotId` (optional) names the
     * caller's pilot; without it the pilot is inferred: the pilot whose body entityId is, or the player in the
     * vehicle's driver seat. Rejections: unknownUnit, structure, notOwner, unknownPilot, notPlayerPilot, noDriver
     * (nobody, or a driver still sliding in, in the driver seat: a driverless vehicle cannot be driven), hullCritical,
     * notController (the named pilot is not in that body or seat, or sits in a passenger seat), notControllable
     * (no pilot to control it: e.g. an infantry squad member). It is then exactly queuePilotControl with move =
     * thrust, fire bit 0 = firePrimary, bit 1 = fireSecondary (gunner seat: either fires the seat's weapons).
     * Without crews (the fixture) it controls the whole entity, as before.
     */
    queueControl(tick, entityId, input, team, pilotId) {
        if (!Number.isInteger(tick) || tick <= this.tick)
            throw new Error(`queueControl: tick ${tick} is not in the future (current tick ${this.tick})`);
        // QA1 bug 8: malformed (a guest's) arguments are refused with badInput, never thrown
        if (!isId(entityId) || (team !== undefined && !isTeam(team)) || (pilotId !== undefined && !(isId(pilotId) && pilotId > 0)))
            return this.refuseInput(0, entityId, team);
        if (input !== null && (typeof input !== "object" || !Number.isFinite(input.thrust) || !Number.isFinite(input.strafe) || !Number.isFinite(input.aimYaw) || (input.aimPitch !== undefined && !Number.isFinite(input.aimPitch))))
            return this.refuseInput(0, entityId, team);
        const qc = { tick, seq: ++this.inputSeq, id: entityId, team: team === undefined ? NO_TEAM : team, on: 0, thrust: 0, strafe: 0, yaw: 0, pitch: 0, fire: 0, pilot: pilotId ?? 0 };
        if (input) {
            const pitch = input.aimPitch ?? 0;
            let th = input.thrust < -1 ? -1 : input.thrust > 1 ? 1 : input.thrust;
            let st = input.strafe < -1 ? -1 : input.strafe > 1 ? 1 : input.strafe;
            const l = Math.sqrt(th * th + st * st);
            if (l > 1) {
                th /= l;
                st /= l;
            }
            const hp = Math.PI / 2;
            qc.on = 1;
            qc.thrust = th;
            qc.strafe = st;
            qc.yaw = input.aimYaw;
            qc.pitch = pitch < -hp ? -hp : pitch > hp ? hp : pitch;
            qc.fire = (input.firePrimary ? 1 : 0) | (input.fireSecondary ? 2 : 0);
        }
        let i = this.pendingCtl.length;
        while (i > 0 && this.pendingCtl[i - 1].tick > tick)
            i--;
        this.pendingCtl.splice(i, 0, qc);
        return qc.seq;
    }
    /** Applies one control input (step phase 1). */
    applyControl(qc) {
        const s = this.idToSlot.get(qc.id), d = this.d;
        let reason = null;
        if (s === undefined || !this.alive[s] || (this.hp[s] <= 0 && this.critTick[s] < 0))
            reason = "unknownUnit";
        else if (d.tStructure[this.etype[s]])
            reason = "structure";
        else if (qc.team !== NO_TEAM && this.team[s] !== qc.team)
            reason = "notOwner";
        let p;
        if (reason === null && s !== undefined && d.crewOn) {
            // CONTRACTS revision 4: only the caller's own pilot, the vehicle its pilot drives, or its gunner seat's weapons
            if (qc.pilot > 0) {
                p = this.pilots.get(qc.pilot);
                if (!p || p.state === exports.P_DEAD)
                    reason = "unknownPilot";
                else if (qc.team !== NO_TEAM && p.team !== qc.team)
                    reason = "notOwner";
                else if (p.player < 0)
                    reason = "notPlayerPilot";
                else if (p.state === exports.P_FOOT ? p.entity !== qc.id : p.vehicle !== qc.id)
                    reason = "notController";
                else if (p.state === exports.P_SEATED && d.tSeatRole[this.etype[s] * data_ts_1.MAX_SEATS + p.seat] === data_ts_1.SEAT_PASSENGER)
                    reason = "notController";
            }
            else if (this.slotPilot[s] !== 0) {
                p = this.pilots.get(this.slotPilot[s]);
                if (!p || p.player < 0)
                    reason = "notPlayerPilot";
            }
            else if (this.crewable(s)) {
                const pid = this.occ[s * data_ts_1.MAX_SEATS + d.tDriverSeat[this.etype[s]]];
                p = pid !== 0 ? this.pilots.get(pid) : undefined;
                if (!p)
                    reason = this.critTick[s] >= 0 ? "hullCritical" : "noDriver";
                else if (p.player < 0)
                    reason = "notPlayerPilot";
            }
            else
                reason = "notControllable";
            if (reason === null && p && p.state === exports.P_SEATED) {
                if (this.critTick[s] >= 0)
                    reason = "hullCritical";
                else if (p.seat === d.tDriverSeat[this.etype[s]] && p.readyTick > this.tick)
                    reason = "noDriver"; // still sliding into the driver seat
            }
        }
        else if (reason === null && s !== undefined && this.hp[s] <= 0)
            reason = "unknownUnit";
        if (reason !== null || s === undefined) {
            this.rejected(qc.seq, qc.id, reason ?? "unknownUnit", 0, qc.team !== NO_TEAM ? qc.team : s !== undefined ? this.team[s] : NO_TEAM);
            return;
        }
        if (p) {
            // the same as queuePilotControl for that pilot (legacy inputs carry no sprint / crouch / jump / jet / tool / gunner flag)
            const gunnerSeat = p.state === exports.P_SEATED && p.seat !== d.tDriverSeat[this.etype[s]];
            const pc = { tick: qc.tick, seq: qc.seq, pilot: p.id, team: qc.team, on: qc.on, move: qc.thrust, strafe: qc.strafe, yaw: qc.yaw, pitch: qc.pitch, flags: 0, fire: gunnerSeat ? (qc.fire !== 0 ? 1 : 0) : qc.fire, tool: 0 };
            this.controlPilot(p, pc);
            return;
        }
        // no crews (fixture): whole-entity control
        if (qc.on && !this.ctlOn[s]) {
            // taking control: drop the AI's order and targets
            this.ordType[s] = exports.ORD_NONE;
            this.waypoints[s] = null;
            this.ramPhase[s] = 0;
            this.noLos[s] = 0;
            this.tgtSlot[s] = -1;
            this.tgtId[s] = 0;
            for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
                this.mTgtSlot[s * data_ts_1.MAX_MOUNTS + m] = -1;
                this.mTgtId[s * data_ts_1.MAX_MOUNTS + m] = 0;
            }
        }
        this.ctlOn[s] = qc.on;
        this.ctlThrust[s] = qc.thrust;
        this.ctlStrafe[s] = qc.strafe;
        this.ctlYaw[s] = qc.yaw;
        this.ctlPitch[s] = qc.pitch;
        this.ctlFire[s] = qc.fire;
        if (!qc.on) {
            this.ctlMask[s] = 0;
            this.ctlFlags[s] = 0;
            this.ctlTool[s] = 0;
            this.stance[s] = 0;
            this.stanceT[s] = 0;
        } // release clears all control state
    }
    /** Destroys an entity (scripted / tests): hp 0, removed at the end of the next step. Returns false if not alive. */
    destroy(id) {
        const s = this.idToSlot.get(id);
        if (s === undefined || !this.alive[s] || (this.hp[s] <= 0 && this.critTick[s] < 0))
            return false;
        this.hp[s] = 0;
        this.dying[this.nDying++] = s;
        if (this.slotPilot[s] !== 0)
            this.outright.add(s); // scripted: no downed state (pilotkit.ts)
        return true;
    }
    entity(id) {
        const s = this.idToSlot.get(id);
        if (s === undefined || !this.alive[s])
            return undefined;
        const t = this.etype[s];
        const weapons = [];
        for (let m = 0; m < this.mCount[s]; m++)
            weapons.push(this.d.weaponIds[this.mWeapon[s * data_ts_1.MAX_MOUNTS + m]]);
        return {
            id, slot: s, typeId: this.d.typeIds[t], type: t, team: this.team[s], squad: this.squad[s],
            x: this.x[s], y: this.y[s], z: this.z[s], dirX: this.dirX[s], dirZ: this.dirZ[s],
            hp: this.hp[s], shield: this.shield[s], structure: this.d.tStructure[t] === 1,
            targetId: this.tgtSlot[s] >= 0 ? this.tgtId[s] : 0, weapons,
            occupants: Array.from(this.occ.subarray(s * data_ts_1.MAX_SEATS, s * data_ts_1.MAX_SEATS + this.d.tSeatCount[t])),
            pilotId: this.slotPilot[s], hullCritical: this.critTick[s] >= 0,
            altitude: this.y[s] - this.terrain.height(this.x[s], this.z[s]),
        };
    }
    getSquad(id) { return this.squads.get(id); }
    /** Ids of all live entities, ascending. */
    entityIds() {
        const out = [];
        for (let s = 0; s < this.hi; s++)
            if (this.alive[s])
                out.push(this.eid[s]);
        return out.sort((a, b) => a - b);
    }
    countAlive(team, includeStructures = false) {
        let n = 0;
        for (let s = 0; s < this.hi; s++)
            if (this.alive[s] && this.team[s] === team && (includeStructures || !this.d.tStructure[this.etype[s]]))
                n++;
        return n;
    }
    /** Sum of hp + shield of a team's units (not structures). */
    teamHealth(team, includeStructures = false) {
        let h = 0;
        for (let s = 0; s < this.hi; s++)
            if (this.alive[s] && this.team[s] === team && (includeStructures || !this.d.tStructure[this.etype[s]]))
                h += this.hp[s] + this.shield[s];
        return h;
    }
    isDetectedBy(id, team) {
        const s = this.idToSlot.get(id);
        return s !== undefined && this.alive[s] === 1 && this.detected(s, team);
    }
    projectileCount() { return this.pN; }
    /** Effective (planet-adjusted) range of a weapon. */
    weaponRange(weaponId) {
        const w = this.d.weaponIds.indexOf(weaponId);
        if (w < 0)
            throw new Error(`unknown weapon ${weaponId}`);
        return this.d.wRange[w];
    }
    // =================================================================== crews and pilots (rulings 11, 16-19)
    /** A pilot record (players and AI crews; undefined once an AI pilot is gone). */
    pilot(id) { return this.pilots.get(id); }
    /** Pilots of a team, ascending id (tools; allocates). */
    pilotIds(team) { const out = []; for (const p of this.pilots.values())
        if (team === undefined || p.team === team)
            out.push(p.id); return out; }
    /** Pilot id in seat j of vehicle id (0 = empty / not a vehicle). */
    occupant(vehicleId, seat) {
        const s = this.idToSlot.get(vehicleId);
        return s === undefined || seat < 0 || seat >= data_ts_1.MAX_SEATS ? 0 : this.occ[s * data_ts_1.MAX_SEATS + seat];
    }
    /** Is entity slot s a crewed vehicle (crew rules on and its type has a driver seat)? */
    crewable(s) { return this.d.crewOn && this.d.tDriverSeat[this.etype[s]] >= 0; }
    newPilot(team, player, expert) {
        const t = this.d.pilotType;
        const p = {
            id: this.nextPilotId++, team, player, expert, state: exports.P_FOOT, vehicle: 0, seat: -1, entity: 0,
            hp: t >= 0 ? this.d.tHp[t] * (player >= 0 && this.d.crew ? this.d.crew.playerHpMul : 1) : 0, shield: t >= 0 ? this.d.tShield[t] : 0, energy: this.d.crew ? this.d.crew.energyMax : 0,
            jet: this.d.crew ? this.d.crew.jetFreeBurnSeconds : 0, lastHit: -1 << 30, readyTick: 0,
            respawnTick: 0, deaths: 0, aliveSince: this.tick, lastX: 0, lastZ: 0, task: 0, hackVehicle: 0, hackStart: 0, hackSeat: -1, hackSeq: 0,
        };
        this.pilots.set(p.id, p);
        return p;
    }
    /**
     * Spawns a pilot on foot (CONTRACTS ruling 18: players start on foot). opts.player >= 0 makes it a player
     * pilot (respawns, can call rides, can be controlled); otherwise an AI pilot. Returns the pilot id; its
     * entity id is pilot(id).entity.
     */
    spawnPilot(team, x, z, opts = {}) {
        if (!this.d.crewOn)
            throw new Error("spawnPilot: this data has no crew rules (no pilot unit / constants.crew)");
        if (team < 0 || team >= exports.MAX_TEAMS)
            throw new Error("team out of range");
        const p = this.newPilot(team, opts.player !== undefined && opts.player >= 0 ? opts.player : -1, 0);
        this.spawnPilotEntity(p, x, z);
        if (this.prog && p.player >= 0)
            (0, progression_ts_1.progOnPilot)(this, p.id); // w2e: the applied call loadout
        return p.id;
    }
    /** Creates the on-foot entity of pilot p (stats from the record). Returns the slot. */
    spawnPilotEntity(p, x, z) {
        this.spawningPilot = true;
        let id;
        try {
            id = this.spawnUnit(this.d.typeIds[this.d.pilotType], p.team, x, z);
        }
        finally {
            this.spawningPilot = false;
        }
        const s = this.idToSlot.get(id);
        this.attachPilotEntity(p, s);
        this.hp[s] = p.hp;
        this.shield[s] = p.shield;
        this.lastHit[s] = p.lastHit;
        if (this.prog && p.player >= 0)
            (0, progression_ts_1.progOnBody)(this, p.id, s); // w2e: the applied pilot weapon
        if (this.fkit && p.player >= 0)
            this.fkit.onBody(this, p.id, s); // Frontline: the player's kit
        return s;
    }
    attachPilotEntity(p, s) {
        p.state = exports.P_FOOT;
        p.entity = this.eid[s];
        p.vehicle = 0;
        p.seat = -1;
        p.readyTick = 0;
        this.slotPilot[s] = p.id;
        this.energy[s] = p.energy;
        this.jetFuel[s] = p.jet;
        p.lastX = this.x[s];
        p.lastZ = this.z[s];
        if (this.calls)
            this.applyHeavy(p.id, s); // w2a: a carried heavy weapon survives the vehicle
    }
    /** Removes a live entity without a death (a pilot climbing in, an AI pilot reaching home). */
    despawn(s) {
        const id = this.eid[s];
        this.alive[s] = 0;
        this.idToSlot.delete(id);
        const sq = this.squads.get(this.squad[s]);
        if (sq) {
            const k = sq.members.indexOf(id);
            if (k >= 0)
                sq.members.splice(k, 1);
            if (sq.members.length === 0)
                this.squads.delete(sq.id);
        }
        this.waypoints[s] = null;
        this.slotPilot[s] = 0;
        const fr = this.free;
        let j = fr.length;
        fr.push(s);
        while (j > 0 && fr[j - 1] < s) {
            fr[j] = fr[j - 1];
            j--;
        }
        fr[j] = s;
    }
    /**
     * Seat-dependent caches of vehicle slot s: drv (a ready driver aboard), nOcc, and per mount mOn (its seat is
     * occupied and ready) and mAimMul (AI gunners and player seats on autopilot shoot with
     * crew.aiGunnerDispersionMultiplier; AI drivers, expert crews and players in direct control at 1).
     */
    recomputeCrew(s) {
        const d = this.d, t = this.etype[s], mb = s * data_ts_1.MAX_MOUNTS;
        if (d.tBunker[t]) {
            this.bunkerCrew(s);
            return;
        }
        if (!d.crewOn || d.tDriverSeat[t] < 0) {
            this.drv[s] = 1;
            this.nOcc[s] = 0;
            for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
                this.mOn[mb + m] = 1;
                this.mAimMul[mb + m] = 1;
            }
            return;
        }
        const sb = s * data_ts_1.MAX_SEATS, ns = d.tSeatCount[t], mul = d.crew.aiDispersionMultiplier;
        let n = 0;
        for (let j = 0; j < ns; j++)
            if (this.occ[sb + j] !== 0)
                n++;
        this.nOcc[s] = n;
        const ready = (j) => {
            const pid = this.occ[sb + j];
            if (pid === 0)
                return null;
            const p = this.pilots.get(pid);
            return p && p.readyTick <= this.tick ? p : null;
        };
        this.drv[s] = ready(d.tDriverSeat[t]) ? 1 : 0;
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
            const j = d.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + m];
            if (m >= this.mCount[s] || j < 0) {
                this.mOn[mb + m] = 1;
                this.mAimMul[mb + m] = 1;
                continue;
            }
            const p = ready(j);
            this.mOn[mb + m] = p ? 1 : 0;
            // Frontline: an empty gunner seat of a player's called-down vehicle (the gunship's door guns) is manned by the AI
            // while its pilot is aboard; a player taking the seat (or the driver taking the gun with T) overrides it
            if (!p && this.fkit && this.drv[s] && d.tSeatRole[t * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_GUNNER && this.fkit.reservedFor(this.eid[s]) !== 0) {
                this.mOn[mb + m] = 1;
                this.mAimMul[mb + m] = mul;
                continue;
            }
            const aiGunner = p !== null && p.player < 0 && p.expert === 0 && d.tSeatRole[t * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_GUNNER;
            this.mAimMul[mb + m] = p && (aiGunner || p.player >= 0) ? mul : 1;
            // w3b unit AI: AI crews (not expert, not players) at the team's difficulty dispersion multiplier
            if (this.uai && p !== null && p.player < 0 && p.expert === 0)
                this.mAimMul[mb + m] *= this.uai.aimMul[this.team[s] & 3];
        }
    }
    // ------------------------------------------------------------ B1 bunkers (buildings.json mounts; CONTRACTS ruling 99)
    /** B1: fortification level of the point bunker slot s belongs to (its fortification bunker or chokepoint prebuilt); 0 for a bunker of no point. */
    bunkerLevel(s) {
        const sp = this.sp, P = this.pts;
        if (sp === null || P === null)
            return 0;
        const id = this.eid[s];
        for (let p = 0; p < sp.n; p++)
            if (sp.bunkers[p].includes(id) || sp.prebuiltIds[p].includes(id))
                return P.fort[p];
        return 0;
    }
    /** B1: point index bunker slot s belongs to (-1: none). */
    bunkerPoint(s) {
        const sp = this.sp;
        if (sp === null || this.pts === null)
            return -1;
        const id = this.eid[s];
        for (let p = 0; p < sp.n; p++)
            if (sp.bunkers[p].includes(id) || sp.prebuiltIds[p].includes(id))
                return p;
        return -1;
    }
    /** Ruling 104: the point of bunker slot s holds a garrisoned squad of the bunker's team with a live member (the garrison mans the guns). */
    bunkerGarrisoned(s) {
        const sp = this.sp;
        if (sp === null || sp.garrison.size === 0)
            return false;
        const p = this.bunkerPoint(s);
        if (p < 0)
            return false;
        for (const [sq, gp] of sp.garrison) {
            if (gp !== p)
                continue;
            const q = this.squads.get(sq);
            if (q && q.team === this.team[s] && q.members.some((id) => { const k = this.idToSlot.get(id); return k !== undefined && this.alive[k] === 1; }))
                return true;
        }
        return false;
    }
    /** Ruling 104 (step phase 10, every 10 ticks): bunkers whose garrison started or stopped manning their guns get their mounts recomputed. */
    bunkerGarrisonStep() {
        const sp = this.sp, d = this.d;
        if (sp === null || !d.crewOn || this.tick % 10 !== 0)
            return;
        for (let p = 0; p < sp.n; p++)
            for (const list of [sp.bunkers[p], sp.prebuiltIds[p]])
                for (const id of list) {
                    const s = this.idToSlot.get(id);
                    if (s === undefined || !this.alive[s] || !d.tBunker[this.etype[s]])
                        continue;
                    const want = this.nOcc[s] > 0 || this.bunkerGarrisoned(s) ? this.bunkerMounts(s) : 0;
                    let on = 0;
                    for (let m = 0; m < want; m++)
                        on += this.mOn[s * data_ts_1.MAX_MOUNTS + m];
                    if (this.mCount[s] !== want || (want > 0 && on < want && this.bunkerGarrisoned(s)))
                        this.recomputeCrew(s);
                }
    }
    /** B1: mounts fitted on bunker slot s at its point's fortification level (mounts[].fromLevel; the first is always fitted). */
    bunkerMounts(s) {
        const d = this.d, t = this.etype[s], lv = this.bunkerLevel(s), tb = t * data_ts_1.MAX_MOUNTS;
        let n = 0;
        for (let m = 0; m < d.tMountCount[t]; m++)
            if (m === 0 || d.tMountLevel[tb + m] <= lv)
                n = m + 1;
            else
                break;
        return n;
    }
    /**
     * B1: seat caches of bunker slot s. Occupied (a player pilot inside): the mounts fitted at its level are live
     * (mCount), each fired by the pilot in its seat (direct control) or, with no control input, by the turret AI;
     * empty: no live mounts (mCount 0), so an empty bunker is not an armed structure, as before.
     */
    bunkerCrew(s) {
        const d = this.d, t = this.etype[s], sb = s * data_ts_1.MAX_SEATS, mb = s * data_ts_1.MAX_MOUNTS, ns = d.tSeatCount[t];
        let n = 0;
        for (let j = 0; j < ns; j++)
            if (this.occ[sb + j] !== 0)
                n++;
        this.nOcc[s] = n;
        this.drv[s] = 1;
        const garr = this.bunkerGarrisoned(s); // ruling 104: a garrison mans the mounts no player sits at
        const mc = n > 0 || garr ? this.bunkerMounts(s) : 0;
        this.mCount[s] = mc;
        let maxR = 0;
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
            this.mAimMul[mb + m] = 1;
            this.mOn[mb + m] = m < mc && m < ns && (this.occ[sb + m] !== 0 || garr) ? 1 : 0;
            if (m < mc && this.mOn[mb + m] && d.wRange[this.mWeapon[mb + m]] > maxR)
                maxR = d.wRange[this.mWeapon[mb + m]];
            if (m >= mc) {
                this.cooldown[mb + m] = 0;
                this.mTgtSlot[mb + m] = -1;
                this.mTgtId[mb + m] = 0;
            }
        }
        this.maxRange[s] = maxR;
    }
    /** B1: every pilot in bunker slot s leaves it normally (the bunker changes team). */
    bunkerVacate(s) {
        const ns = this.d.tSeatCount[this.etype[s]], vid = this.eid[s];
        for (let j = 0; j < ns; j++) {
            const pid = this.occ[s * data_ts_1.MAX_SEATS + j];
            const p = pid !== 0 ? this.pilots.get(pid) : undefined;
            if (!p) {
                this.occ[s * data_ts_1.MAX_SEATS + j] = 0;
                continue;
            }
            if (this.slotsLeft() < 1) {
                this.occ[s * data_ts_1.MAX_SEATS + j] = 0;
                this.releaseSeatControl(s, j);
                this.pilotDied(p, vid, 0, this.x[s], this.z[s]);
                continue;
            }
            const eid = this.exitSeat(p, s, false);
            this.events.push(events_ts_1.EV.EXIT, this.tick, p.team, p.id, vid, eid, 0, 0, 0, p.player >= 0 ? events_ts_1.F_PLAYER : 0);
        }
        this.recomputeCrew(s);
    }
    /** B1 (step phase 10): bunkers follow their point's level (mounts fitted / removed); a pilot whose mount is gone moves to a free one, or climbs out. */
    bunkerStep() {
        const d = this.d;
        for (const p of this.pilots.values()) {
            if (p.state !== exports.P_SEATED)
                continue;
            const vs = this.idToSlot.get(p.vehicle);
            if (vs === undefined || !d.tBunker[this.etype[vs]])
                continue;
            if (this.team[vs] !== p.team) {
                this.bunkerVacate(vs);
                continue;
            }
            const n = this.bunkerMounts(vs);
            if (p.seat >= n) {
                let to = -1;
                for (let j = 0; j < n; j++)
                    if (this.occ[vs * data_ts_1.MAX_SEATS + j] === 0) {
                        to = j;
                        break;
                    }
                if (to >= 0) {
                    const from = p.seat;
                    this.occ[vs * data_ts_1.MAX_SEATS + from] = 0;
                    this.releaseSeatControl(vs, from);
                    this.occ[vs * data_ts_1.MAX_SEATS + to] = p.id;
                    p.seat = to;
                    this.events.push(events_ts_1.EV.SEAT, this.tick, p.team, p.id, p.vehicle, from, to, 0, 0, 0);
                }
                else if (this.slotsLeft() >= 1) {
                    const vid = p.vehicle, eid = this.exitSeat(p, vs, false);
                    this.events.push(events_ts_1.EV.EXIT, this.tick, p.team, p.id, vid, eid, 0, 0, 0, events_ts_1.F_PLAYER);
                    continue;
                }
            }
            if (this.mCount[vs] !== n)
                this.recomputeCrew(vs);
        }
    }
    /** Drops a player's direct control of seat j of vehicle slot vs (the pilot left the seat). */
    releaseSeatControl(vs, j) {
        const bit = 1 << j;
        if (this.ctlMask[vs] & bit) {
            this.ctlMask[vs] &= ~bit;
            if (j === this.d.tDriverSeat[this.etype[vs]]) {
                this.ctlOn[vs] = 0;
                this.ctlFire[vs] = 0;
            }
            else
                this.gFire[vs * data_ts_1.MAX_SEATS + j] = 0;
        }
    }
    /** Moves vehicle slot vs to another team (hijack, ruling 11 / doc 13): own squad, no orders. */
    changeTeam(vs, team) {
        const id = this.eid[vs];
        const old = this.squads.get(this.squad[vs]);
        if (old) {
            const k = old.members.indexOf(id);
            if (k >= 0)
                old.members.splice(k, 1);
            if (old.members.length === 0)
                this.squads.delete(old.id);
        }
        const sq = this.newSquad(team, false);
        sq.members.push(id);
        this.squad[vs] = sq.id;
        this.team[vs] = team;
        this.hijacked[vs] = 1;
        this.ordType[vs] = exports.ORD_NONE;
        this.waypoints[vs] = null;
        this.ramPhase[vs] = 0;
        this.noLos[vs] = 0;
        this.tgtSlot[vs] = -1;
        this.tgtId[vs] = 0;
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
            this.mTgtSlot[vs * data_ts_1.MAX_MOUNTS + m] = -1;
            this.mTgtId[vs * data_ts_1.MAX_MOUNTS + m] = 0;
        }
        (0, transport_ts_1.tpTeamChanged)(this, vs, team); // QA3-6: the old team's soldiers aboard get out
        this.stats.hijacks++;
    }
    /** AI pilot on foot (slot s): walk to the nearest friendly pilot home (respawn point or forward base core) and despawn there. */
    sendHome(p, s) {
        p.task = 1;
        const h = this.nearestHome(s);
        if (h >= 0) {
            this.quietOrders = true;
            this.order([this.eid[s]], { type: "move", x: this.x[h], z: this.z[h] });
            this.quietOrders = false;
        }
    }
    /** Quiet move order for pilot body slot s (pilotkit.ts: AI pilots walking to a vehicle). */
    kitWalkTo(s, x, z) {
        const wp = this.waypoints[s];
        if (this.ordType[s] === exports.ORD_MOVE && wp && wp[wp.length - 2] === x && wp[wp.length - 1] === z)
            return;
        this.quietOrders = true;
        this.order([this.eid[s]], { type: "move", x, z });
        this.quietOrders = false;
    }
    nearestHome(s) {
        const d = this.d, team = this.team[s];
        let best = -1, bd = Infinity;
        for (let o = 0; o < this.hi; o++) {
            if (!this.alive[o] || this.team[o] !== team || !d.tPilotHome[this.etype[o]] || this.hp[o] <= 0 || (this.pool !== null && !this.homeServes(o)))
                continue;
            const dx = this.x[o] - this.x[s], dz = this.z[o] - this.z[s], d2 = dx * dx + dz * dz;
            if (d2 < bd) {
                bd = d2;
                best = o;
            }
        }
        return best;
    }
    /** w2c: the driver seat of crewed slot s holds an AI pilot (not a player). */
    aiDriven(s) {
        const t = this.etype[s], j = this.d.tDriverSeat[t];
        if (j < 0)
            return false;
        const pid = this.occ[s * data_ts_1.MAX_SEATS + j];
        if (pid === 0)
            return false;
        const p = this.pilots.get(pid);
        return p !== undefined && p.player < 0;
    }
    /** w2c: type t is an Air Pad (a building that produces an aircraft type). Cached per type (derived from data, not state). */
    padTypes = null;
    isAirPadType(t) {
        if (!this.padTypes) {
            const d = this.d, a = new Uint8Array(d.typeIds.length);
            for (let b = 0; b < a.length; b++)
                if (d.tStructure[b])
                    for (const u of d.tProduces[b])
                        if (d.tAir[u])
                            a[b] = 1;
            this.padTypes = a;
        }
        return this.padTypes[t] === 1;
    }
    /** w2c: nearest live, finished, friendly Air Pad to slot s (-1 none). Linear scan: only idle AI aircraft ask. */
    nearestPad(s) {
        const team = this.team[s];
        let best = -1, bd = Infinity;
        for (let o = 0; o < this.hi; o++) {
            if (!this.alive[o] || this.team[o] !== team || this.hp[o] <= 0 || !this.isAirPadType(this.etype[o]))
                continue;
            if (this.con && this.con.underConstruction(this.eid[o]))
                continue;
            const dx = this.x[o] - this.x[s], dz = this.z[o] - this.z[s], d2 = dx * dx + dz * dz;
            if (d2 < bd) {
                bd = d2;
                best = o;
            }
        }
        return best;
    }
    /** gap() into sc[S_RET] (hot loops: no boxed return). */
    gapQ(a, b) {
        const dx = this.x[b] - this.x[a], dz = this.z[b] - this.z[a];
        this.sc[S_RET] = Math.sqrt(dx * dx + dz * dz) - this.d.tRadius[this.etype[a]] - this.d.tRadius[this.etype[b]];
    }
    /** Surface gap (horizontal) between slots a and b. */
    gap(a, b) {
        const dx = this.x[b] - this.x[a], dz = this.z[b] - this.z[a];
        return Math.sqrt(dx * dx + dz * dz) - this.d.tRadius[this.etype[a]] - this.d.tRadius[this.etype[b]];
    }
    /**
     * A pilot died (seated: vehicleId; on foot: entityId) at (x, z). Players wait for respawn, which picks the respawn
     * point nearest to where they DIED (CONTRACTS rev 4); AI pilots are gone.
     */
    pilotDied(p, vehicleId, entityId, x, z) {
        p.lastX = x;
        p.lastZ = z;
        p.hackVehicle = 0;
        p.hackSeq = 0;
        p.hackSeat = -1;
        if (this.kit)
            (0, pilotkit_ts_1.kitOnDeath)(this, p.id); // S12: a fresh kit on respawn
        if (this.fkit)
            this.fkit.onDeath(p.id); // Frontline: full rounds on respawn
        if (this.stl) {
            this.stl.decoyUsed.delete(p.id);
            this.stl.bikeCloak.delete(p.id);
        } // w2f: decoys refill on respawn
        {
            const cs = this.calls?.callers.get(p.id);
            if (cs)
                cs.heavy = -1;
        } // w2a: the carried heavy weapon is lost
        this.events.push(events_ts_1.EV.PILOT_DEATH, this.tick, p.team, p.id, vehicleId, entityId, 0, 0, 0, p.player >= 0 ? events_ts_1.F_PLAYER : 0);
        this.stats.pilotDeaths[p.team]++;
        if (this.pool && p.player < 0)
            this.pool.onDeath(this, p.id, p.team, vehicleId, entityId); // S14: a reserve pilot is lost for the battle
        if (p.player < 0) {
            this.pilots.delete(p.id);
            return;
        }
        const c = this.d.crew;
        if (this.tick - p.aliveSince >= c.respawnResetTicks)
            p.deaths = 0; // the penalty resets after 3 minutes alive (doc 13)
        const wait = Math.min(c.respawnTicks + c.respawnPenaltyTicks * p.deaths, c.respawnMaxTicks);
        p.deaths++;
        p.state = exports.P_DEAD;
        p.entity = 0;
        p.vehicle = 0;
        p.seat = -1;
        p.readyTick = 0;
        p.task = 0;
        p.respawnTick = this.tick + wait;
    }
    /** Spawns pilot entity p beside vehicle slot vs (normal exit, or an AI pilot leaving its seat to a player). */
    exitSeat(p, vs, toHome) {
        const d = this.d, c = d.crew, j = p.seat;
        this.occ[vs * data_ts_1.MAX_SEATS + j] = 0;
        this.releaseSeatControl(vs, j);
        const off = d.tRadius[this.etype[vs]] + d.tRadius[d.pilotType] + c.exitGap;
        this.freeSpot(vs, off); // right of the hull if free, else the nearest free spot (CONTRACTS rev 4)
        const ps = this.spawnPilotEntity(p, this.sc[S_CX], this.sc[S_CZ]);
        if (this.airS[vs]) {
            this.y[ps] = this.y[vs];
            this.airborne[ps] = exports.AIR_FLYING;
            this.velY[ps] = 0;
        } // stepping out of a flying aircraft: a fall
        if (toHome || p.player < 0)
            this.sendHome(p, ps);
        this.recomputeCrew(vs);
        return this.eid[ps];
    }
    /**
     * Nearest free spot for a pilot body beside slot vs (exit, respawn; CONTRACTS rev 4) into sc[S_CX], sc[S_CZ]:
     * candidates at surface gap `off` (centre distance) around it, starting on its right and alternating outwards in
     * 30-degree steps, then rings 1.5 pilot diameters further out (up to 8 rings). A spot is free when it is on the map
     * (not clamped) and no live ground body (unit or structure; not aircraft in flight, not airborne pilots) overlaps
     * the pilot's circle. If nothing is free, the first spot on the map (as before: separation pushes it out).
     */
    freeSpot(vs, off) {
        const d = this.d, rp = d.tRadius[d.pilotType], q = this.sc, cx = this.x[vs], cz = this.z[vs];
        const fx = this.dirX[vs], fz = this.dirZ[vs];
        let fbX = NaN, fbZ = NaN;
        for (let ring = 0; ring <= 8; ring++) {
            const r = off + ring * 3 * rp;
            for (let k = 0; k < 12; k++) {
                // angle from the right side: 0, +30, -30, +60, -60, ... 180 degrees
                const step = (k + 1) >> 1, sgn = k & 1 ? 1 : -1, a = (step * sgn * Math.PI) / 6;
                const ca = (0, fmath_ts_1.dcos)(a), sa = (0, fmath_ts_1.dsin)(a);
                // right = (-fz, fx); rotate it by a towards the front
                const rx = -fz * ca + fx * sa, rz = fx * ca + fz * sa;
                const x = cx + rx * r, z = cz + rz * r;
                if (x !== this.clampMap(x) || z !== this.clampMap(z))
                    continue;
                if (fbX !== fbX) {
                    fbX = x;
                    fbZ = z;
                }
                if (this.spotFree(x, z, rp, vs)) {
                    q[S_CX] = x;
                    q[S_CZ] = z;
                    return;
                }
            }
        }
        q[S_CX] = fbX === fbX ? fbX : this.clampMap(cx - fz * off);
        q[S_CZ] = fbZ === fbZ ? fbZ : this.clampMap(cz + fx * off);
    }
    /** No live ground body (other than `except`) overlaps a circle of radius r at (x, z). Linear scan: exits and respawns are rare. */
    spotFree(x, z, r, except) {
        const d = this.d;
        for (let o = 0; o < this.hi; o++) {
            if (!this.alive[o] || o === except || this.airS[o] || (this.slotPilot[o] !== 0 && this.airborne[o] !== exports.AIR_GROUND))
                continue;
            const dx = this.x[o] - x, dz = this.z[o] - z, rr = r + d.tRadius[this.etype[o]];
            if (dx * dx + dz * dz < rr * rr)
                return false;
        }
        return true;
    }
    /**
     * w2c, doc 11: "passengers in a destroyed Carrier each roll to survive". Every passenger seat that cannot fire
     * (enclosed: the Carrier's; the Mule's open doors and the Tandem's pillion are not rolled) rolls the sim PRNG against
     * crew.carrierPassengerSurviveChance; a failed roll kills the passenger aboard (PASSENGER_LOST, then PILOT_DEATH).
     * Survivors are auto-ejected with the crew (ruling 34). Driver and gunner seats never roll. Ruling 45: player pilots
     * never roll (they always eject alive); AI pilots in passenger seats and AI soldiers carried as cargo (transport.ts) roll.
     */
    passengerRolls(vs) {
        const d = this.d, t = this.etype[vs], ns = d.tSeatCount[t], sb = vs * data_ts_1.MAX_SEATS, chance = d.crew.passengerSurvive;
        if (chance >= 1)
            return;
        for (let j = 0; j < ns; j++) {
            const pid = this.occ[sb + j];
            if (pid === 0 || d.tSeatRole[t * data_ts_1.MAX_SEATS + j] !== data_ts_1.SEAT_PASSENGER || d.tSeatArmed[t * data_ts_1.MAX_SEATS + j])
                continue;
            if (this.isPlayerPilot(pid))
                continue; // ruling 45: player pilots aboard always eject alive (no roll)
            if (this.rng.next() < chance)
                continue;
            this.occ[sb + j] = 0;
            this.gFire[sb + j] = 0;
            const p = this.pilots.get(pid);
            if (p) {
                this.events.push(events_ts_1.EV.PASSENGER_LOST, this.tick, p.team, p.id, this.eid[vs], j, 0, 0, 0, p.player >= 0 ? events_ts_1.F_PLAYER : 0);
                this.pilotDied(p, this.eid[vs], 0, this.x[vs], this.z[vs]);
            }
        }
        this.recomputeCrew(vs);
    }
    /** Throws everyone aboard vehicle slot vs out (doc 13): upward at crew.ejectLaunchSpeed; no fall damage on landing. */
    ejectAll(vs, flags = 0) {
        const d = this.d, c = d.crew, t = this.etype[vs], ns = d.tSeatCount[t], sb = vs * data_ts_1.MAX_SEATS, vid = this.eid[vs];
        const ids = [];
        this.ctlOn[vs] = 0;
        this.ctlMask[vs] = 0;
        this.ctlFire[vs] = 0;
        for (let j = 0; j < ns; j++) {
            const pid = this.occ[sb + j];
            if (pid === 0)
                continue;
            this.occ[sb + j] = 0;
            this.gFire[sb + j] = 0;
            const p = this.pilots.get(pid);
            if (!p)
                continue;
            // spread the crew around the hull centre so they do not land on top of each other
            const a = (j * 2 * Math.PI) / Math.max(1, ns), r = 0.5 * d.tRadius[t];
            const ps = this.spawnPilotEntity(p, this.x[vs] + (0, fmath_ts_1.dcos)(a) * r, this.z[vs] + (0, fmath_ts_1.dsin)(a) * r);
            this.y[ps] = this.y[vs] + d.tRadius[t];
            this.airborne[ps] = exports.AIR_EJECTING;
            this.velY[ps] = c.ejectSpeed;
            this.velX[ps] = this.velX[vs];
            this.velZ[ps] = this.velZ[vs];
            if (p.player < 0)
                this.sendHome(p, ps);
            ids.push(this.eid[ps]);
            this.events.push(events_ts_1.EV.EJECT, this.tick, p.team, p.id, vid, this.eid[ps], 0, 0, 0, (p.player >= 0 ? events_ts_1.F_PLAYER : 0) | flags);
            this.stats.ejections++;
        }
        this.recomputeCrew(vs);
        return ids;
    }
    /**
     * The pilot in seat j of vehicle slot vs dies where it sits (ruling 11: sniped, or a rider shot off a bike; rev 4):
     * the vehicle is left intact, the other crew keep their seats.
     */
    killSeat(vs, j) {
        const d = this.d, pid = this.occ[vs * data_ts_1.MAX_SEATS + j];
        this.occ[vs * data_ts_1.MAX_SEATS + j] = 0;
        this.releaseSeatControl(vs, j);
        const p = this.pilots.get(pid);
        if (p)
            this.pilotDied(p, this.eid[vs], 0, this.x[vs], this.z[vs]);
        if (j === d.tDriverSeat[this.etype[vs]] && this.ordType[vs] !== exports.ORD_NONE) {
            this.ordType[vs] = exports.ORD_NONE;
            this.waypoints[vs] = null;
        }
        this.stats.snipes++;
        this.recomputeCrew(vs);
    }
    /** Long-rifle hit on the driver of vehicle slot vs (ruling 11; tests and tools). */
    snipeDriver(vs) { this.killSeat(vs, this.d.tDriverSeat[this.etype[vs]]); }
    /**
     * Fraction along the scratch segment (sc[SA..SB]) of its closest approach to the zone at (forward f, up u) from
     * vehicle slot e's hull centre, if within radius r of it; -1 otherwise.
     */
    zoneAlong(e, f, u, rt, r) {
        const d = this.d, q = this.sc, t = this.etype[e], hx = this.dirX[e], hz = this.dirZ[e];
        const zx = this.x[e] + hx * f - hz * rt, zy = this.y[e] + d.tRadius[t] + u, zz = this.z[e] + hz * f + hx * rt;
        const ax = q[SA_X], ay = q[SA_Y], az = q[SA_Z], dx = q[SB_X] - ax, dy = q[SB_Y] - ay, dz = q[SB_Z] - az;
        const L2 = dx * dx + dy * dy + dz * dz;
        let k = L2 > 1e-12 ? ((zx - ax) * dx + (zy - ay) * dy + (zz - az) * dz) / L2 : 0;
        if (k < 0)
            k = 0;
        else if (k > 1)
            k = 1;
        const fx = ax + dx * k - zx, fy = ay + dy * k - zy, fz = az + dz * k - zz;
        return fx * fx + fy * fy + fz * fz <= r * r ? k : -1;
    }
    /**
     * After a shot of weapon w along the scratch segment hit slot e: the seat whose target zone it struck, or -1
     * (CONTRACTS rulings 11 and 20, revision 4). Needs: crews on; a crewed vehicle of another team than the shooter
     * (own-team shots hit the hull with the friendly-fire factor); a canopyKill weapon, or a weapon of
     * crew.riderShotWeaponClasses on an open seat (pilotHitZone.openSeat: bikes). Every OCCUPIED seat with a zone
     * (CrewConstants.sz*: units.json seats[].hitZones, else the class driver zone / the open class's gunner zone) is
     * tested on its own: the zone must be exposed to the shot (the shot arrives from within its exposed arc around
     * the arc's centre direction in the hull frame, or from at least exposedFromAboveDegrees above) and the path must
     * pass within its radius; the first zone along the path wins (ties: the lower seat index).
     */
    zoneSeat(e, w, shooterTeam) {
        const d = this.d;
        if (!d.crewOn)
            return -1;
        // ruling 28: only a player's shot is a sniper's shot; an AI's canopyKill weapon is an ordinary weapon (a rider-shot
        // class still hits the riders of open seats: ruling 26, bike riders are exposed to everyone)
        const t = this.etype[e];
        const canopy = d.wCanopyKill[w] === 1 && this.hitCtl && d.tCrewArmoured[t] !== 1; // ruling 112: armoured crew zones (units crewArmoured) cannot be sniped
        if (!canopy && d.wRiderShot[w] !== 1)
            return -1;
        if (d.tDriverSeat[t] < 0 || this.team[e] === shooterTeam || this.nOcc[e] === 0)
            return -1;
        const cr = d.crew;
        const q = this.sc, dx = q[SB_X] - q[SA_X], dy = q[SB_Y] - q[SA_Y], dz = q[SB_Z] - q[SA_Z];
        const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (L < 1e-9)
            return -1;
        // towards the shooter: -(shot direction)
        const ux = -dx / L, uy = -dy / L, uz = -dz / L, h = Math.sqrt(ux * ux + uz * uz);
        const hx = this.dirX[e], hz = this.dirZ[e], ns = d.tSeatCount[t];
        let best = -1, bk = 2;
        for (let j = 0; j < ns; j++) {
            const k = t * data_ts_1.MAX_SEATS + j;
            if (this.occ[e * data_ts_1.MAX_SEATS + j] === 0 || !(cr.szRad[k] > 0))
                continue;
            if (!canopy && cr.szOpen[k] !== 1)
                continue;
            // the arc's centre direction in the world: forward * cos + right * sin (right = (-hz, hx), as muzzles)
            const cx = hx * cr.szArcX[k] - hz * cr.szArcZ[k], cz = hz * cr.szArcX[k] + hx * cr.szArcZ[k];
            const cosA = h > 1e-9 ? (cx * ux + cz * uz) / h : 1;
            if (!(cosA >= cr.szArcCos[k] || uy >= cr.szAboveSin[k]))
                continue; // the hull covers this seat from this side
            const f = this.zoneAlong(e, cr.szF[k], cr.szU[k], cr.szR[k], cr.szRad[k]);
            if (f >= 0 && f < bk) {
                best = j;
                bk = f;
            }
        }
        return best;
    }
    /**
     * Target zones of the crew seats of vehicle `vehicleId` (CONTRACTS ruling 20), in seat order: world centre of the
     * zone (x, y, z), radius, seat role, the occupant (pilot id, 0 = empty) and whether the seat's rider can be hit by
     * small arms (open seat). Seats without a zone are left out. Empty for non-crewed entities. For clients and tools
     * (debug rings, sniper markers); the same geometry the sim tests against.
     */
    seatZones(vehicleId) {
        const d = this.d, s = this.idToSlot.get(vehicleId), out = [];
        if (!d.crewOn || s === undefined || !this.alive[s])
            return out;
        const t = this.etype[s], cr = d.crew, hx = this.dirX[s], hz = this.dirZ[s];
        for (let j = 0; j < d.tSeatCount[t]; j++) {
            const k = t * data_ts_1.MAX_SEATS + j;
            if (!(cr.szRad[k] > 0))
                continue;
            const role = d.tSeatRole[k];
            out.push({ seat: j, role: role === data_ts_1.SEAT_DRIVER ? "driver" : role === data_ts_1.SEAT_GUNNER ? "gunner" : "passenger",
                x: this.x[s] + hx * cr.szF[k] - hz * cr.szR[k], y: this.y[s] + d.tRadius[t] + cr.szU[k], z: this.z[s] + hz * cr.szF[k] + hx * cr.szR[k],
                radius: cr.szRad[k], occupant: this.occ[s * data_ts_1.MAX_SEATS + j], open: cr.szOpen[k] === 1, armoured: d.tCrewArmoured[t] === 1 });
        }
        return out;
    }
    /** True if pilot id pid is a player's pilot (ruling 28: player shots). */
    isPlayerPilot(pid) { if (pid === 0)
        return false; const p = this.pilots.get(pid); return !!p && p.player >= 0; }
    /** A shot of weapon w that hit slot e: if it struck a pilot zone (zoneSeat), kill (canopyKill) or damage (small arms) that rider instead of the hull; true if so. */
    zoneStrike(e, w, shooterTeam) {
        // Frontline: a canopy shot only reaches the crew once the vehicle's shield is down (sniping is a finishing move)
        if (this.fkit && this.d.wCanopyKill[w] === 1 && this.shield[e] > 0 && this.d.raw.constants.frontline.canopyNeedsShieldDown)
            return false;
        const j = this.zoneSeat(e, w, shooterTeam);
        if (j < 0)
            return false;
        if (this.d.wCanopyKill[w] === 1 && this.hitCtl)
            this.pilotKill(e, j, w, shooterTeam);
        else
            this.riderHit(e, j, w, shooterTeam);
        return true;
    }
    /**
     * Small-arms hit on the rider in seat j of open vehicle slot vs (CONTRACTS rev 4: "pilot weapons can shoot riders
     * off"): the rider takes the hit as a pilot (infantry damage multiplier, its own shield first, shieldMultiplier);
     * at zero health it dies and leaves the seat. Logged as HIT on the vehicle with F_RIDER (+ F_KILLED | F_PILOT_KILL).
     */
    riderHit(vs, j, w, shooterTeam) {
        const d = this.d, c = d.constants, p = this.pilots.get(this.occ[vs * data_ts_1.MAX_SEATS + j]);
        if (!p)
            return;
        const dtype = d.wDamageType[w];
        let dmg = d.wDamage[w] * d.matrix[dtype * data_ts_1.N_AC + data_ts_1.AC_INFANTRY];
        if (!(dmg > 0))
            return;
        p.lastHit = this.tick;
        let shd = 0;
        if (p.shield > 0) {
            const sm = c.shieldMultiplier[dtype];
            if (sm <= 0) {
                this.logHit(shooterTeam, this.eid[vs], w, 0, 0, events_ts_1.F_RIDER | events_ts_1.F_SHIELD);
                return;
            }
            const sd = dmg * sm;
            if (p.shield >= sd) {
                p.shield -= sd;
                this.stats.damage[shooterTeam] += sd;
                this.logHit(shooterTeam, this.eid[vs], w, 0, sd, events_ts_1.F_RIDER | events_ts_1.F_SHIELD);
                return;
            }
            shd = p.shield;
            dmg = (sd - p.shield) / sm;
            p.shield = 0;
        }
        const hpDmg = dmg < p.hp ? dmg : p.hp;
        p.hp -= dmg;
        this.stats.damage[shooterTeam] += shd + hpDmg;
        let fl = events_ts_1.F_RIDER | (shd > 0 ? events_ts_1.F_SHIELD : 0);
        if (p.hp <= 0) {
            p.hp = 0;
            fl |= events_ts_1.F_KILLED | events_ts_1.F_PILOT_KILL;
            this.stats.kills[shooterTeam]++;
            this.killSeat(vs, j);
        }
        this.logHit(shooterTeam, this.eid[vs], w, hpDmg, shd, fl);
    }
    // ------------------------------------------------------------ crew actions (immediate; queue* for tick-stamped)
    rej(reason) { return { ok: false, reason }; }
    /**
     * Pilot pilotId (on foot, within crew.enterRangeMetres of the hull) enters vehicle vehicleId.
     * seat: a seat index; omitted (CONTRACTS rev 4): a free seat if any (the driver seat first, then the first free
     * seat in seat order), otherwise (players only) the driver seat if a friendly AI pilot holds it (ruling 19: the
     * AI pilot climbs out and walks home), otherwise rejected noFreeSeat. A named seat held by a friendly AI pilot
     * can be taken by a player the same way. An enemy vehicle can be entered only when nobody is aboard (hijack): it
     * takes pilot.hackVehicleSeconds (doc: 5 s) of uninterrupted contact (the result carries `hijack`, the pilot stays
     * on foot; moving out of reach, taking damage, or the vehicle being boarded / leaving its team interrupts it:
     * orderEvents "hijackInterrupted", event HIJACK); friendly vehicles are entered at once. With `team`, only that
     * team's pilot is accepted.
     */
    enter(pilotId, vehicleId, seat, team) {
        const d = this.d;
        if (!d.crewOn)
            return this.rej("notCrewable");
        const p = this.pilots.get(pilotId);
        if (!p || p.state === exports.P_DEAD)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        if (p.state !== exports.P_FOOT)
            return this.rej("pilotNotOnFoot");
        const ps = this.idToSlot.get(p.entity);
        const vs = this.idToSlot.get(vehicleId);
        if (ps === undefined)
            return this.rej("unknownPilot");
        if (vs === undefined || !this.alive[vs])
            return this.rej("unknownVehicle");
        const vt = this.etype[vs], bunker = d.tBunker[vt] === 1;
        if (d.tDriverSeat[vt] < 0 && !bunker)
            return this.rej("notCrewable");
        if (p.player < 0 && d.raw.units[vt]?.playerOnly)
            return this.rej("notPlayerPilot"); // Frontline: only player pilots drive the mech
        if (this.fkit && p.player < 0 && this.fkit.reservedFor(vehicleId) !== 0)
            return this.rej("notPlayerPilot"); // Frontline: a called-down vehicle waits for its caller
        if (bunker && this.team[vs] !== p.team)
            return this.rej("notOwner"); // B1: friendly bunkers only (no hijack)
        if (bunker && p.player < 0)
            return this.rej("notPlayerPilot"); // B1: player pilots only (no new AI)
        if (this.critTick[vs] >= 0 || this.hp[vs] <= 0)
            return this.rej("hullCritical");
        if (!this.inReach(ps, vs))
            return this.rej("tooFar");
        if ((this.stance[ps] & 3) === exports.ST_PRONE || this.stanceChanging(ps))
            return this.rej("pilotProne"); // ruling 42: get up first
        const enemy = this.team[vs] !== p.team;
        if (enemy && this.nOcc[vs] > 0)
            return this.rej("enemyOccupied");
        const pick = this.pickSeat(p, vs, seat);
        if (pick < 0)
            return this.rej(pick === -2 ? "badSeat" : pick === -3 ? "seatOccupied" : "noFreeSeat");
        if (this.occ[vs * data_ts_1.MAX_SEATS + pick] !== 0 && this.slotsLeft() < 1)
            return this.rej("entityCapacity"); // the displaced AI pilot needs a body
        const hack = d.crew.hackTicks;
        if (enemy && hack > 0) {
            // CONTRACTS rev 4: a hijack takes hackVehicleSeconds of uninterrupted contact (pilotStep checks and completes it)
            if (p.hackVehicle !== vehicleId) {
                p.hackVehicle = vehicleId;
                p.hackStart = this.tick;
                p.hackSeq = this.curSeq;
                this.events.push(events_ts_1.EV.HIJACK, this.tick, p.team, p.id, vehicleId, hack, 0, 0, 0, p.player >= 0 ? events_ts_1.F_PLAYER : 0);
            }
            p.hackSeat = seat === undefined ? -1 : seat;
            return { ok: true, hijack: { vehicle: vehicleId, completeTick: p.hackStart + hack } };
        }
        return this.seatPilot(p, ps, vs, pick, enemy);
    }
    /** Is pilot body ps within reach of vehicle slot vs (crew.enterRangeMetres surface gap, vertical overlap)? */
    inReach(ps, vs) {
        const d = this.d, rv = d.tRadius[this.etype[vs]];
        return this.gap(ps, vs) <= d.crew.enterRange && Math.abs(this.y[ps] - this.y[vs]) <= 2 * rv + d.crew.enterRange;
    }
    /** Seat for pilot p entering vehicle slot vs (see enter): >= 0 the seat; -1 no free seat, -2 bad seat index, -3 the named seat is taken. */
    pickSeat(p, vs, seat) {
        const d = this.d, vt = this.etype[vs], ns = d.tSeatCount[vt], sb = vs * data_ts_1.MAX_SEATS, dj = d.tDriverSeat[vt];
        if (d.tBunker[vt]) { // B1: the mounts fitted at the bunker's level, free ones only (only player pilots ever sit there)
            const n = this.bunkerMounts(vs);
            if (seat !== undefined) {
                if (!Number.isInteger(seat) || seat < 0 || seat >= n)
                    return -2;
                return this.occ[sb + seat] === 0 ? seat : -3;
            }
            for (let j = 0; j < n; j++)
                if (this.occ[sb + j] === 0)
                    return j;
            return -1;
        }
        const held = (j) => this.tp !== null && this.tp.held(this.eid[vs], j); // w2e: a soldier aboard holds the seat
        const takeable = (j) => { if (held(j))
            return false; const o = this.occ[sb + j]; if (o === 0)
            return true; const op = this.pilots.get(o); return p.player >= 0 && !!op && op.player < 0 && op.team === p.team; };
        if (seat !== undefined) {
            if (!Number.isInteger(seat) || seat < 0 || seat >= ns)
                return -2;
            return takeable(seat) ? seat : -3;
        }
        if (this.occ[sb + dj] === 0)
            return dj;
        for (let j = 0; j < ns; j++)
            if (this.occ[sb + j] === 0 && !held(j))
                return j;
        return takeable(dj) ? dj : -1;
    }
    /** Seats pilot p (body slot ps) in seat `pick` of vehicle slot vs now (a friendly AI there walks home); enemy: the vehicle changes team (hijack). */
    seatPilot(p, ps, vs, pick, enemy) {
        const d = this.d, vt = this.etype[vs], sb = vs * data_ts_1.MAX_SEATS, vehicleId = this.eid[vs];
        const held = this.occ[sb + pick];
        if (held !== 0) {
            const op = this.pilots.get(held);
            this.exitSeat(op, vs, true);
            this.events.push(events_ts_1.EV.EXIT, this.tick, op.team, op.id, vehicleId, op.entity, 0, 0, 0, 0);
        }
        let flags = 0;
        if (enemy) {
            this.changeTeam(vs, p.team);
            flags |= events_ts_1.F_HIJACK;
        }
        if (p.hackVehicle !== 0) {
            if (p.hackVehicle === vehicleId)
                this.events.push(events_ts_1.EV.HIJACK, this.tick, p.team, p.id, vehicleId, d.crew.hackTicks, 2, 0, 0, p.player >= 0 ? events_ts_1.F_PLAYER : 0);
            p.hackVehicle = 0;
            p.hackSeq = 0;
            p.hackSeat = -1;
        }
        // the pilot climbs in: its entity is removed, its stats stay on the record
        p.hp = this.hp[ps];
        p.shield = this.shield[ps];
        p.energy = this.energy[ps];
        p.jet = this.jetFuel[ps];
        p.lastHit = this.lastHit[ps];
        p.lastX = this.x[ps];
        p.lastZ = this.z[ps];
        this.despawn(ps);
        p.state = exports.P_SEATED;
        p.entity = 0;
        p.vehicle = vehicleId;
        p.seat = pick;
        p.readyTick = 0;
        p.task = 0;
        this.occ[sb + pick] = p.id;
        if (p.player >= 0 && pick === d.tDriverSeat[vt]) {
            this.ordType[vs] = exports.ORD_NONE;
            this.waypoints[vs] = null;
            this.ramPhase[vs] = 0;
        } // the AI's order ends with its driver
        this.recomputeCrew(vs);
        this.events.push(events_ts_1.EV.ENTER, this.tick, p.team, p.id, vehicleId, pick, 0, 0, 0, flags | (p.player >= 0 ? events_ts_1.F_PLAYER : 0));
        return { ok: true, seat: pick };
    }
    /** Seq of the tick-stamped input being applied (0: an immediate call). Scratch, not state. */
    curSeq = 0;
    /**
     * A hijack in progress (pilot p on foot, body slot ps; step phase 10): completes after crew.hackTicks of contact,
     * or ends when contact breaks. Interruptions (flags): 1 out of reach, 2 the pilot took damage, 4 the vehicle was
     * boarded, changed team, reached its critical window or is gone, 8 no seat left for the pilot.
     */
    hijackStep(p, ps) {
        const d = this.d, vs = this.idToSlot.get(p.hackVehicle);
        let why = 0;
        if (vs === undefined || !this.alive[vs] || this.hp[vs] <= 0 || this.critTick[vs] >= 0 || this.nOcc[vs] > 0 || this.team[vs] === p.team)
            why = 4;
        else if (this.lastHit[ps] > p.hackStart)
            why = 2;
        else if (!this.inReach(ps, vs))
            why = 1;
        let pick = -1;
        if (why === 0 && this.tick - p.hackStart >= d.crew.hackTicks) {
            pick = this.pickSeat(p, vs, p.hackSeat >= 0 ? p.hackSeat : undefined);
            if (pick < 0)
                why = 8;
        }
        if (why !== 0) {
            this.events.push(events_ts_1.EV.HIJACK, this.tick, p.team, p.id, p.hackVehicle, this.tick - p.hackStart, 1, 0, 0, why);
            this.orderEvents.push({ tick: this.tick, seq: p.hackSeq, id: p.id, reason: "hijackInterrupted" });
            p.hackVehicle = 0;
            p.hackSeq = 0;
            p.hackSeat = -1;
            return;
        }
        if (pick >= 0)
            this.seatPilot(p, ps, vs, pick, true);
    }
    /** Normal exit (ruling 16): the pilot appears at the nearest free spot beside the vehicle (crew.exitGapMetres; never inside a structure or unit). Not during the critical window (eject then). */
    exit(pilotId, team) {
        const p = this.pilots.get(pilotId);
        if (!this.d.crewOn)
            return this.rej("notCrewable");
        if (!p || p.state === exports.P_DEAD)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        if (p.state !== exports.P_SEATED)
            return this.rej("notSeated");
        const vs = this.idToSlot.get(p.vehicle);
        if (vs === undefined)
            return this.rej("notSeated");
        if (this.critTick[vs] >= 0)
            return this.rej("hullCritical");
        if (this.slotsLeft() < 1)
            return this.rej("entityCapacity");
        const vid = p.vehicle;
        const eid = this.exitSeat(p, vs, false);
        this.events.push(events_ts_1.EV.EXIT, this.tick, p.team, p.id, vid, eid, 0, 0, 0, p.player >= 0 ? events_ts_1.F_PLAYER : 0);
        return { ok: true, ids: [eid] };
    }
    /** Eject (doc 13, any time, also inside the critical window): everyone aboard is thrown out; the vehicle stays where it is. */
    eject(pilotId, team) {
        const p = this.pilots.get(pilotId);
        if (!this.d.crewOn)
            return this.rej("notCrewable");
        if (!p || p.state === exports.P_DEAD)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        if (p.state !== exports.P_SEATED)
            return this.rej("notSeated");
        const vs = this.idToSlot.get(p.vehicle);
        if (vs === undefined)
            return this.rej("notSeated");
        if (this.slotsLeft() < this.nOcc[vs])
            return this.rej("entityCapacity"); // every occupant needs a body
        return { ok: true, ids: this.ejectAll(vs) };
    }
    /**
     * Seat switch: to `seat` if free, else (seat omitted) the next free seat after the current one. Sliding into
     * the driver seat takes crew.gunnerSlideSeconds (doc 11: 2 s) before the pilot can drive.
     */
    switchSeat(pilotId, seat, team) {
        const d = this.d;
        const p = this.pilots.get(pilotId);
        if (!d.crewOn)
            return this.rej("notCrewable");
        if (!p || p.state === exports.P_DEAD)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        if (p.state !== exports.P_SEATED)
            return this.rej("notSeated");
        const vs = this.idToSlot.get(p.vehicle);
        if (vs === undefined)
            return this.rej("notSeated");
        if (this.critTick[vs] >= 0)
            return this.rej("hullCritical");
        const vt = this.etype[vs], ns = d.tBunker[vt] ? this.bunkerMounts(vs) : d.tSeatCount[vt], sb = vs * data_ts_1.MAX_SEATS; // B1: a bunker's fitted mounts
        let to = -1;
        if (seat !== undefined) {
            if (!Number.isInteger(seat) || seat < 0 || seat >= ns)
                return this.rej("badSeat");
            if (this.occ[sb + seat] !== 0)
                return this.rej(seat === p.seat ? "badSeat" : "seatOccupied");
            to = seat;
        }
        else {
            for (let k = 1; k < ns; k++) {
                const j = (p.seat + k) % ns;
                if (this.occ[sb + j] === 0) {
                    to = j;
                    break;
                }
            }
            if (to < 0)
                return this.rej("noFreeSeat");
        }
        const from = p.seat;
        this.occ[sb + from] = 0;
        this.releaseSeatControl(vs, from);
        this.occ[sb + to] = p.id;
        p.seat = to;
        p.readyTick = to === d.tDriverSeat[vt] && d.crew.slideTicks > 0 ? this.tick + d.crew.slideTicks : 0;
        this.recomputeCrew(vs);
        this.events.push(events_ts_1.EV.SEAT, this.tick, p.team, p.id, p.vehicle, from, to, 0, 0, 0);
        return { ok: true, seat: to };
    }
    // ------------------------------------------------------------ tick-stamped crew / production inputs
    queueAct(tick, kind, team, a, b, c, x = 0, z = 0) {
        if (!Number.isInteger(tick) || tick <= this.tick)
            throw new Error(`queue: tick ${tick} is not in the future (current tick ${this.tick})`);
        // QA1 bug 8: non-finite numbers (a guest's) and a bad team are refused with badInput, never thrown
        if (typeof kind !== "number" || !Number.isInteger(kind) || kind < 0 || kind > 255)
            return this.refuseInput(0, a, team);
        for (const v of [a, b, c, x, z])
            if (typeof v !== "number" || !Number.isFinite(v))
                return this.refuseInput(kind, a, team);
        if (team !== undefined && !isTeam(team))
            return this.refuseInput(kind, a, team);
        const qa = { tick, seq: ++this.inputSeq, team: team === undefined ? NO_TEAM : team, kind, a, b, c, x, z };
        let i = this.pendingAct.length;
        while (i > 0 && this.pendingAct[i - 1].tick > tick)
            i--;
        this.pendingAct.splice(i, 0, qa);
        return qa.seq;
    }
    // ------------------------------------------------------------ w2f drop-in / drop-out (coop.ts, design doc 17)
    /**
     * w2f: shots fired by each player pilot's own station (direct control), modulo 2^16: presentation (recoil on a guest),
     * not simulation state (never hashed or exported; restarts at 0 after a restore). Read with pilotShotCount.
     */
    pilotShots = new Map();
    countShot(pilotId) { if (pilotId > 0)
        this.pilotShots.set(pilotId, ((this.pilotShots.get(pilotId) ?? 0) + 1) & 0xffff); }
    pilotShotCount(pilotId) { return this.pilotShots.get(pilotId) ?? 0; }
    /** w2f: coop rules (constants.coop.dropPodSeconds). */
    coopRules;
    tCoreAll = null;
    /** w2f: per type 1 = a Command Core (buildings with effects.supplySource). */
    coreTypes() {
        if (!this.tCoreAll) {
            const nu = this.d.unitCount, a = new Uint8Array(this.d.typeIds.length);
            this.data.buildings.forEach((b, i) => { if (b.effects?.supplySource === true)
                a[nu + i] = 1; });
            this.tCoreAll = a;
        }
        return this.tCoreAll;
    }
    /** w2f: player `player` joins human team `team` now: a drop pod to the team's Command Core (coop.ts). Result ids: [pilot id]. */
    addPlayer(team, player) { return (0, coop_ts_1.coopJoin)(this, team, player); }
    /** w2f: player pilot pilotId leaves now: mode 0 handed to the AI (default), 1 removed (coop.ts). */
    removePlayer(pilotId, mode = 0, team) { return (0, coop_ts_1.coopLeave)(this, pilotId, mode, team); }
    /** w2f: tick-stamped join (ACT_JOIN 40). Refusals: REJECT events with codes 120-122. Returns the seq; the pilot id is in PLAYER_JOINED. */
    queueJoin(tick, team, player) { return this.queueAct(tick, coop_ts_1.ACT_JOIN, team, player, 0, 0); }
    /** w2f: tick-stamped leave (ACT_LEAVE 41). */
    queueLeave(tick, pilotId, mode = 0, team) { return this.queueAct(tick, coop_ts_1.ACT_LEAVE, team, pilotId, mode, 0); }
    /** w2f: sets the match's player count (1-4: Director waves and raids, enemy income) directly (host override). */
    setPlayerCount(n) { if (!this.match)
        throw new Error("setPlayerCount: no match rules"); this.match.setPlayers(n); }
    /** Tick-stamped enter (see enter()); seat -1 / omitted = default seat. Rejections go to orderEvents and the event log. Returns the seq. */
    queueEnter(tick, pilotId, vehicleId, seat = -1, team) { return this.queueAct(tick, exports.ACT_ENTER, team, pilotId, vehicleId, seat); }
    queueExit(tick, pilotId, team) { return this.queueAct(tick, exports.ACT_EXIT, team, pilotId, 0, 0); }
    queueSwitchSeat(tick, pilotId, seat = -1, team) { return this.queueAct(tick, exports.ACT_SWITCH, team, pilotId, 0, seat); }
    queueEject(tick, pilotId, team) { return this.queueAct(tick, exports.ACT_EJECT, team, pilotId, 0, 0); }
    /**
     * S12 demolition charge (pilotkit.ts; doc 13): pilot pilotId, on foot, plants one demo charge on the enemy or neutral
     * vehicle / structure targetId (an enemy Command Core too) within the charge weapon's range; it detonates
     * pilot.demoChargeFuseSeconds later. Result ids: [charge id]. Reasons: unknownPilot, notOwner, pilotNotOnFoot,
     * noCharges, unknownTarget, friendlyTarget, cannotDamageTarget (not a vehicle / structure, or an aircraft in flight), tooFar.
     */
    plantCharge(pilotId, targetId, team) { return (0, pilotkit_ts_1.kitPlant)(this, pilotId, targetId, team); }
    /**
     * w2e (transport.ts): infantry squad squadId boards friendly transport vehicleId (constants.transport.infantryCarriers),
     * one soldier per free passenger seat. Reasons: unknownUnit, notOwner, unknownVehicle, notTransport, notFriendly,
     * notInfantry, transportFull. Result ids: the squad's members.
     */
    load(squadId, vehicleId, team) { return this.tpRules ? (0, transport_ts_1.tpLoad)(this, squadId, vehicleId, team) : this.rej("notTransport"); }
    queueLoad(tick, squadId, vehicleId, team) { return this.queueAct(tick, exports.ACT_LOAD, team, squadId, vehicleId, 0); }
    /** w2e: transport vehicleId moves to (x, z) and unloads its soldiers and sling load there. Reasons: unknownVehicle, notOwner, noCargo. */
    unload(vehicleId, x, z, team) { return this.tpRules ? (0, transport_ts_1.tpUnload)(this, vehicleId, x, z, team) : this.rej("noCargo"); }
    queueUnload(tick, vehicleId, x, z, team) { return this.queueAct(tick, exports.ACT_UNLOAD, team, vehicleId, 0, 0, x, z); }
    /** w2e: lifter lifterId (liftCapacity: the Mule) picks up friendly ground vehicle targetId as a sling load. Reasons: unknownVehicle, notOwner, cannotLift, unknownTarget, notFriendly, transportFull. */
    airlift(lifterId, targetId, team) { return this.tpRules ? (0, transport_ts_1.tpLift)(this, lifterId, targetId, team) : this.rej("cannotLift"); }
    queueAirlift(tick, lifterId, targetId, team) { return this.queueAct(tick, exports.ACT_LIFT, team, lifterId, targetId, 0); }
    /** w3b battle groups (battlegroups.ts header): add (add 1) or remove (0) entity id to / from the team's group `label`. */
    queueGroupSet(tick, team, label, entityId, add = 1) { return this.queueAct(tick, battlegroups_ts_1.ACT_GROUP_SET, team, label, entityId, add ? 1 : 0); }
    /** w3b: the group's standing order (GO_*: 1 assault, 2 hold, 3 patrol, 4 escort; 0 none) at (x, z); escort: target id (0 = the team's harvesters). */
    queueGroupOrder(tick, team, label, kind, x = 0, z = 0, targetId = 0) { return this.queueAct(tick, battlegroups_ts_1.ACT_GROUP_ORDER, team, label, kind, targetId, x, z); }
    /** w3b: append a patrol point to the group's route. */
    queueGroupWaypoint(tick, team, label, x, z) { return this.queueAct(tick, battlegroups_ts_1.ACT_GROUP_WAYPOINT, team, label, 0, 0, x, z); }
    /** w3b: standing order "keep it reinforced" on / off. */
    queueGroupReinforce(tick, team, label, on) { return this.queueAct(tick, battlegroups_ts_1.ACT_GROUP_REINFORCE, team, label, on ? 1 : 0, 0); }
    /** w3b: auto-defend of the team's home base on / off. */
    queueAutoDefend(tick, team, on) { return this.queueAct(tick, battlegroups_ts_1.ACT_AUTO_DEFEND, team, 0, on ? 1 : 0, 0); }
    /** fix-qa2 (strongpoints.ts): garrison (on) or release the squad of entity id at point index p (ACT_GARRISON, tick-stamped). */
    queueGarrison(tick, team, p, entityId, on = true) { return this.queueAct(tick, strongpoints_ts_1.ACT_GARRISON, team, p, entityId, on ? 1 : 0); }
    /** Immediate garrison / release (queueGarrison applies this at its tick). */
    garrison(team, p, entityId, on = 1) {
        if (!this.sp)
            return this.rej("notGarrisonable");
        const r = this.sp.setGarrison(this, team, p, entityId, on ? 1 : 0);
        return r.ok ? { ok: true } : this.rej(r.reason);
    }
    /** fix-qa2 reserve (reserve.ts header): deploy reserve entry k of team at (x, z) in a call-in zone (ACT_RESERVE_DEPLOY). */
    reserveDeploy(team, k, x, z) {
        if (!this.resRules)
            return this.rej("reserveEmpty");
        if (!Number.isFinite(x) || !Number.isFinite(z))
            return this.rej("notInCallInZone");
        const why = this.resState().deploy(this, team, k, this.clampMap(x), this.clampMap(z));
        return why ? this.rej(why) : { ok: true };
    }
    queueReserveDeploy(tick, team, k, x, z) { return this.queueAct(tick, reserve_ts_1.ACT_RESERVE_DEPLOY, team, k, 0, 0, x, z); }
    /** Recall own unit entityId (in a supplied point's call-in zone) to the reserve (ACT_RECALL). */
    recallUnit(team, entityId) {
        if (!this.resRules)
            return this.rej("reserveFull");
        const why = this.resState().recall(this, team, entityId);
        return why ? this.rej(why) : { ok: true };
    }
    queueRecall(tick, team, entityId) { return this.queueAct(tick, reserve_ts_1.ACT_RECALL, team, 0, entityId, 0); }
    /** Rapid reinforce (doc 6) at own point index p under attack: the first `count` droppable entries in 2 s (ACT_RAPID_REINFORCE). */
    rapidReinforce(team, p, count = 1) {
        if (!this.resRules)
            return this.rej("reserveEmpty");
        const why = this.resState().rapidReinforce(this, team, p, count);
        return why ? this.rej(why) : { ok: true };
    }
    queueRapidReinforce(tick, team, p, count = 1) { return this.queueAct(tick, reserve_ts_1.ACT_RAPID_REINFORCE, team, p, count, 0); }
    /** Reserve mode of a production building: on, its finished units go into the reserve (ACT_RESERVE_MODE). */
    setReserveMode(team, buildingId, on) {
        if (!this.resRules)
            return this.rej("reserveFull");
        const s = this.idToSlot.get(buildingId);
        if (s === undefined || !this.alive[s] || !this.d.tStructure[this.etype[s]])
            return this.rej("unknownBuilding");
        if (this.team[s] !== team)
            return this.rej("notOwner");
        if (on)
            this.resState().mode.add(buildingId);
        else if (this.res)
            this.res.mode.delete(buildingId);
        return { ok: true };
    }
    /** D1 test cheat (cheats.ts, ruling 115), tick-stamped: sub CHEAT_* with its b, c. Returns the seq. */
    queueCheat(tick, team, sub, b, c) { return this.queueAct(tick, cheats_ts_1.ACT_CHEAT, team, sub, b, c); }
    queueReserveMode(tick, team, buildingId, on) { return this.queueAct(tick, reserve_ts_1.ACT_RESERVE_MODE, team, 0, buildingId, on ? 1 : 0); }
    /**
     * Ruling 87: does `team` see strategic point p now? Its own point always; else a live unit or building of the team
     * whose sensor range (its type's sensorRange under the current weather's visual rules) reaches the point's area
     * (centre distance <= range + area radius). Line of sight is not checked. Derived (not state).
     */
    pointSeenBy(p, team) {
        const P = this.pts;
        if (!P || p < 0 || p >= P.n)
            return false;
        if (P.owner[p] === team)
            return true;
        const px = P.px[p], pz = P.pz[p], ar = P.area[p], d = this.d, wx = this.weather;
        for (let s = 0; s < this.hi; s++) {
            if (!this.alive[s] || this.team[s] !== team || this.hp[s] <= 0)
                continue;
            let r = d.tSensor[this.etype[s]];
            if (!(r > 0))
                continue;
            if (wx !== null)
                r = wx.visual(r);
            if (r > d.fogVisualRange)
                r = d.fogVisualRange;
            const dx = this.x[s] - px, dz = this.z[s] - pz, lim = r + ar;
            if (dx * dx + dz * dz <= lim * lim)
                return true;
        }
        return false;
    }
    /**
     * Rulings 57 / 60: can `team` build unit type t now for a Vehicle drop: a live, finished, supplied, not hack-disabled
     * producer of it, its tier open, aircraft allowed, and the team's ore and gas cover its normal cost.
     */
    dropBuildable(team, t) {
        const d = this.d;
        if (t < 0 || t >= d.unitCount || !d.production)
            return false;
        if (this.ore[team] + 1e-9 < d.tCostOre[t] || this.gas[team] + 1e-9 < d.tCostGas[t] || !this.tierOpen(team, d.tTier[t]))
            return false;
        if (d.tAir[t] && (!d.aircraftAllowed || (this.weather !== null && this.weather.e.grounded)))
            return false;
        for (let s = 0; s < this.hi; s++) {
            if (!this.alive[s] || this.team[s] !== team || this.hp[s] <= 0)
                continue;
            const bt = this.etype[s];
            if (!d.tStructure[bt] || !d.tProduces[bt].includes(t) || !(d.tProducesTierMask[bt] & (1 << d.tTier[t])))
                continue;
            if (this.con && this.con.underConstruction(this.eid[s]))
                continue;
            if (this.pts && this.pts.cores.size && this.pts.coreDisabled(this.eid[s], this.tick))
                continue;
            if (this.pts && !this.pts.structureSupplied(this, s))
                continue;
            if (this.match && (this.match.eliminated >> team) & 1)
                continue;
            return true;
        }
        return false;
    }
    /** Index of the first ground vehicle (droppable, not aircraft) in the team's reserve (-1 none): what Vehicle drop delivers. */
    reserveVehicle(team) {
        if (!this.res)
            return -1;
        const d = this.d;
        return this.res.entries[team].findIndex((e) => d.tVehicle[e.type] === 1 && !d.tAir[e.type] && this.resRules.droppable[e.type] === 1);
    }
    /** fix-qa2 (bldfx.ts): buy Tech Lab mission upgrade u (index or name in UPGRADE_NAMES) at own Tech Lab labId with gas. */
    buyUpgrade(team, labId, u) {
        if (!this.bfx)
            return this.rej("unknownBuilding");
        const i = typeof u === "string" ? bldfx_ts_1.UPGRADE_NAMES.indexOf(u) : u;
        const why = this.bfx.buy(this, team, labId, i);
        return why ? this.rej(why) : { ok: true };
    }
    queueBuyUpgrade(tick, team, labId, u) { return this.queueAct(tick, reserve_ts_1.ACT_RESERVE_MODE, team, 1, labId, u); }
    /** Mission upgrades a team has bought (names). */
    upgrades(team) { return this.bfx ? bldfx_ts_1.UPGRADE_NAMES.filter((_, i) => this.bfx.has(team, i)) : []; }
    /** Pilot pilotId (on foot, in reach) mans own tower towerId (doc 9: range and accuracy). */
    manTower(pilotId, towerId, team) {
        if (!this.bfx || !this.d.crewOn)
            return this.rej("notCrewable");
        const why = this.bfx.man(this, pilotId, towerId, team);
        return why ? this.rej(why) : { ok: true };
    }
    /**
     * Ruling 121 (F3, designer 16 Nov): may slot s hold a sheltering pilot of `team`? An own, standing, finished structure
     * with a command seat: the Command Core (effects.commandSeat) or a control node standing on a citadel site
     * (points.controlNode.citadelCommandSeat).
     */
    shelterable(s, team) {
        const T = this.tShelter;
        if (T === null || !this.alive[s] || this.hp[s] <= 0 || this.team[s] !== team)
            return false;
        const k = T[this.etype[s]];
        if (k === 0)
            return false;
        if (this.con && this.con.underConstruction(this.eid[s]))
            return false;
        if (k === 1)
            return true;
        const sp = this.sp, P = this.pts;
        if (sp === null || P === null)
            return false;
        for (let i = 0; i < P.n; i++)
            if (P.citadel[i] === 1 && sp.node[i] === this.eid[s])
                return true;
        return false;
    }
    /**
     * Ruling 121: player pilot pilotId (on foot, in reach: crew.enterRangeMetres surface gap) goes inside own command seat
     * structureId: its body leaves the field (stats kept on the record, as when boarding), state P_SHELTER, vehicle = the
     * structure. Inside it cannot be hit or targeted (there is no body) and only commands. AI pilots never do this.
     */
    enterShelter(pilotId, structureId, team) {
        const p = this.pilots.get(pilotId);
        if (!this.d.crewOn || this.tShelter === null)
            return this.rej("notCrewable");
        if (!p || p.state === exports.P_DEAD)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        if (p.player < 0)
            return this.rej("notPlayerPilot");
        if (p.state !== exports.P_FOOT)
            return this.rej("pilotNotOnFoot");
        const ps = this.idToSlot.get(p.entity), vs = this.idToSlot.get(structureId);
        if (ps === undefined || this.hp[ps] <= 0)
            return this.rej("unknownPilot");
        if (vs === undefined || !this.alive[vs])
            return this.rej("unknownBuilding");
        if (this.team[vs] !== p.team)
            return this.rej("notOwner");
        if (!this.shelterable(vs, p.team))
            return this.rej("notCrewable");
        if (!this.inReach(ps, vs))
            return this.rej("tooFar");
        if ((this.stance[ps] & 3) === exports.ST_PRONE || this.stanceChanging(ps))
            return this.rej("pilotProne");
        if (p.hackVehicle !== 0) {
            p.hackVehicle = 0;
            p.hackSeq = 0;
            p.hackSeat = -1;
        }
        p.hp = this.hp[ps];
        p.shield = this.shield[ps];
        p.energy = this.energy[ps];
        p.jet = this.jetFuel[ps];
        p.lastHit = this.lastHit[ps];
        p.lastX = this.x[ps];
        p.lastZ = this.z[ps];
        this.despawn(ps);
        p.state = exports.P_SHELTER;
        p.entity = 0;
        p.vehicle = structureId;
        p.seat = -1;
        p.readyTick = 0;
        p.task = 0;
        this.events.push(events_ts_1.EV.SHELTER, this.tick, p.team, p.id, structureId, exports.SH_ENTER, 0, 0, 0, events_ts_1.F_PLAYER);
        return { ok: true };
    }
    /** Ruling 121: pilot pilotId comes out of its command seat at the door (in front of the building, else the nearest free spot). */
    leaveShelter(pilotId, team) {
        const p = this.pilots.get(pilotId);
        if (!p || p.state === exports.P_DEAD)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        if (p.state !== exports.P_SHELTER)
            return this.rej("notSeated");
        if (this.slotsLeft() < 1)
            return this.rej("entityCapacity");
        const vs = this.idToSlot.get(p.vehicle);
        const gun = p.seat >= 0;
        if (vs !== undefined && gun)
            this.gunRelease(vs); // ruling 125: the turret goes back to automatic
        const eid = this.shelterOut(p, vs !== undefined && this.alive[vs] ? vs : -1, false);
        this.events.push(events_ts_1.EV.SHELTER, this.tick, p.team, p.id, this.lastShelter, exports.SH_LEAVE, eid, 0, 0, events_ts_1.F_PLAYER | (gun ? exports.SHF_GUN : 0));
        return { ok: true, ids: [eid] };
    }
    /** Scratch: the structure the last shelterOut left (event field). Not state. */
    lastShelter = 0;
    /**
     * The pilot's body back on the field at the door of structure slot vs (-1: gone; at the spot it went in from).
     * thrown: launched upward like a crew whose vehicle was destroyed (ruling 51 / 34; no fall damage). Returns the body id.
     */
    shelterOut(p, vs, thrown) {
        const d = this.d, c = d.crew, rp = d.tRadius[d.pilotType];
        this.lastShelter = p.vehicle;
        let x = p.lastX, z = p.lastZ;
        if (vs >= 0) {
            const off = d.tRadius[this.etype[vs]] + rp + c.exitGap;
            x = this.clampMap(this.x[vs] + this.dirX[vs] * off);
            z = this.clampMap(this.z[vs] + this.dirZ[vs] * off);
            if (!this.spotFree(x, z, rp, vs)) {
                this.freeSpot(vs, off);
                x = this.sc[S_CX];
                z = this.sc[S_CZ];
            }
        }
        const ps = this.spawnPilotEntity(p, x, z);
        if (thrown) {
            this.airborne[ps] = exports.AIR_EJECTING;
            this.velY[ps] = c.ejectSpeed;
            this.velX[ps] = 0;
            this.velZ[ps] = 0;
            this.stats.ejections++;
        }
        return this.eid[ps];
    }
    /**
     * Ruling 121: structure slot s was destroyed (why SH_DESTROYED) or changes team (SH_CAPTURED): every pilot inside is
     * thrown out at its door like a vehicle crew (ruling 51). No body slot left: the pilot dies there.
     */
    shelterEvict(s, why) {
        if (this.tShelter === null || this.tShelter[this.etype[s]] === 0)
            return;
        const id = this.eid[s];
        for (const p of this.pilots.values()) {
            if (p.state !== exports.P_SHELTER || p.vehicle !== id)
                continue;
            if (this.slotsLeft() < 1) {
                this.pilotDied(p, id, 0, this.x[s], this.z[s]);
                continue;
            }
            const eid = this.shelterOut(p, s, true);
            this.events.push(events_ts_1.EV.SHELTER, this.tick, p.team, p.id, id, why, eid, 0, 0, events_ts_1.F_PLAYER);
        }
    }
    /** Ruling 125: per type, buildings.json `gunSeat` (a turret a player pilot can man from inside); call-in sentries also when their call's params.mannable. */
    tGunSeat = null;
    /**
     * Ruling 125 (C1, designer 16 Nov 16:23): may slot s take a gunner of `team`? An own, standing, finished, armed structure
     * whose type has buildings.json gunSeat, or a call-in sentry whose call has params.mannable, with nobody manning it
     * (except: the pilot `except` already there).
     */
    gunSeatable(s, team, except = 0) {
        if (!this.d.crewOn || !this.alive[s] || this.hp[s] <= 0 || this.team[s] !== team || !this.d.tStructure[this.etype[s]] || this.mCount[s] === 0)
            return false;
        if (this.con && this.con.underConstruction(this.eid[s]))
            return false;
        const o = this.occ[s * data_ts_1.MAX_SEATS];
        if ((this.ctlMask[s] & exports.GUN_SEAT_BIT) !== 0 && o !== except)
            return false;
        if (this.tGunSeat !== null && this.tGunSeat[this.etype[s]] === 1)
            return true;
        const C = this.calls;
        if (C === null || !C.effects.length)
            return false;
        const id = this.eid[s];
        for (const e of C.effects) {
            const def = C.rules.calls[e.call];
            if (def.fx === calls_ts_1.CALL_FX_SENTRY && def.mannable && e.ids[0] === id)
                return true;
        }
        return false;
    }
    /**
     * Ruling 125: player pilot pilotId (on foot, in reach) mans the gun seat of own turret structureId: the body leaves the
     * field as when boarding (state P_SHELTER, vehicle = the turret, seat 0), the turret's mounts follow its aim at their
     * traverse rate and fire on its trigger; leaving (leaveShelter) gives it back to the turret AI. Destroyed: thrown out
     * like a crew (ruling 51).
     */
    manGun(pilotId, structureId, team) {
        const p = this.pilots.get(pilotId);
        if (!this.d.crewOn)
            return this.rej("notCrewable");
        if (!p || p.state === exports.P_DEAD)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        if (p.player < 0)
            return this.rej("notPlayerPilot");
        if (p.state !== exports.P_FOOT)
            return this.rej("pilotNotOnFoot");
        const ps = this.idToSlot.get(p.entity), vs = this.idToSlot.get(structureId);
        if (ps === undefined || this.hp[ps] <= 0)
            return this.rej("unknownPilot");
        if (vs === undefined || !this.alive[vs])
            return this.rej("unknownBuilding");
        if (this.team[vs] !== p.team)
            return this.rej("notOwner");
        if (!this.gunSeatable(vs, p.team))
            return this.rej("notMannable");
        if (!this.inReach(ps, vs))
            return this.rej("tooFar");
        if ((this.stance[ps] & 3) === exports.ST_PRONE || this.stanceChanging(ps))
            return this.rej("pilotProne");
        if (p.hackVehicle !== 0) {
            p.hackVehicle = 0;
            p.hackSeq = 0;
            p.hackSeat = -1;
        }
        const i = vs * data_ts_1.MAX_SEATS;
        this.gYaw[i] = this.ctlYaw[ps];
        this.gPitch[i] = this.ctlPitch[ps];
        this.gFire[i] = 0; // the gun starts on the pilot's own aim
        p.hp = this.hp[ps];
        p.shield = this.shield[ps];
        p.energy = this.energy[ps];
        p.jet = this.jetFuel[ps];
        p.lastHit = this.lastHit[ps];
        p.lastX = this.x[ps];
        p.lastZ = this.z[ps];
        this.despawn(ps);
        p.state = exports.P_SHELTER;
        p.entity = 0;
        p.vehicle = structureId;
        p.seat = 0;
        p.readyTick = 0;
        p.task = 0;
        this.occ[i] = p.id;
        this.ctlMask[vs] |= exports.GUN_SEAT_BIT;
        for (let m = 0; m < this.mCount[vs]; m++) {
            const ci = vs * data_ts_1.MAX_MOUNTS + m;
            this.mTgtSlot[ci] = -1;
            this.mTgtId[ci] = 0;
            this.mLock[ci] = 0;
            this.mReady[ci] = 0;
        }
        this.events.push(events_ts_1.EV.SHELTER, this.tick, p.team, p.id, structureId, exports.SH_ENTER, 0, 0, 0, events_ts_1.F_PLAYER | exports.SHF_GUN);
        return { ok: true, seat: 0 };
    }
    /** Ruling 125: turret slot vs has no gunner any more: its mounts go back to the turret AI. */
    gunRelease(vs) {
        const i = vs * data_ts_1.MAX_SEATS;
        this.ctlMask[vs] &= ~exports.GUN_SEAT_BIT;
        this.occ[i] = 0;
        this.gYaw[i] = 0;
        this.gPitch[i] = 0;
        this.gFire[i] = 0;
    }
    /** Ruling 125: turret slot s destroyed / captured: its gunner is thrown out at its side (no body slot left: dies there). */
    gunEvict(s, why) {
        const id = this.eid[s], pid = this.occ[s * data_ts_1.MAX_SEATS], p = this.pilots.get(pid);
        this.gunRelease(s);
        if (!p || p.state !== exports.P_SHELTER || p.vehicle !== id)
            return;
        if (this.slotsLeft() < 1) {
            this.pilotDied(p, id, 0, this.x[s], this.z[s]);
            return;
        }
        const eid = this.shelterOut(p, s, true);
        this.events.push(events_ts_1.EV.SHELTER, this.tick, p.team, p.id, id, why, eid, 0, 0, events_ts_1.F_PLAYER | exports.SHF_GUN);
    }
    /**
     * Ruling 125: the mounts of manned turret s turn toward the gunner's aim at their traverse rate (weapons without
     * traverse: at once) and fire on the trigger once the barrel is on the aim (turretAimCos), along the gunner's aim.
     */
    fireGunSeat(s) {
        const d = this.d, dt = d.dt, q = this.sc, i = s * data_ts_1.MAX_SEATS, pid = this.occ[i];
        const yaw = this.gYaw[i], ax = (0, fmath_ts_1.dcos)(yaw), az = (0, fmath_ts_1.dsin)(yaw), w0 = this.mWeapon[s * data_ts_1.MAX_MOUNTS];
        this.hitShooter = this.eid[s];
        for (let m = 0; m < this.mCount[s]; m++) {
            const ci = s * data_ts_1.MAX_MOUNTS + m, w = this.mWeapon[ci];
            if (w < 0)
                continue;
            let fx = this.mDX[ci], fz = this.mDZ[ci];
            if (fx === 0 && fz === 0) {
                fx = this.dirX[s];
                fz = this.dirZ[s];
            }
            if (d.wTraverse[w] === 0 || fx * ax + fz * az >= d.wTravCos[w]) {
                fx = ax;
                fz = az;
            }
            else {
                const sn = (fx * az - fz * ax) >= 0 ? d.wTravSin[w] : -d.wTravSin[w], cosT = d.wTravCos[w];
                const rx = fx * cosT - fz * sn, rz = fx * sn + fz * cosT, rl = Math.sqrt(rx * rx + rz * rz);
                fx = rx / rl;
                fz = rz / rl;
            }
            this.mDX[ci] = fx;
            this.mDZ[ci] = fz;
            this.mLock[ci] = 0;
            this.mReady[ci] = 0;
            const prev = this.cooldown[ci];
            if (prev <= 1e-9 && this.mHeat[ci] > 0)
                this.heatDrain(ci);
            let cd = prev > 0 ? prev - dt : 0;
            if (cd > 1e-9) {
                this.cooldown[ci] = cd;
                continue;
            }
            cd = 0;
            const lz = d.wChargeTicks[w] !== 0 || d.wHeatPerShot[w] > 0;
            const held = (this.gFire[i] & (m > 0 && w !== w0 ? 2 : 1)) !== 0; // ruling 130: LMB the guns, RMB a second weapon (the rocket pod)
            let go = held && fx * ax + fz * az >= d.turretAimCos && !this.gasShort(s, w);
            if (lz)
                go = this.laserGate(ci, w, go, false);
            let r = 0;
            if (go) {
                this.hitPilot = pid;
                this.hitCtl = true;
                q[S_AYAW] = yaw;
                q[S_APITCH] = this.gPitch[i];
                q[S_HX] = ax;
                q[S_HZ] = az;
                this.setMuzzle(s, ci);
                r = this.fireAimed(s, w, false);
            }
            if (r === 1) {
                cd += d.wPeriod[w];
                this.countShot(pid);
                this.spendShotGas(s, w);
                if (lz)
                    this.laserShot(ci, w);
            }
            this.cooldown[ci] = cd;
        }
    }
    queueManGun(tick, team, pilotId, structureId) { return this.queueAct(tick, exports.ACT_SHELTER, team, pilotId, exports.SHELTER_GUN, structureId); }
    queueShelter(tick, team, pilotId, structureId, enter) { return this.queueAct(tick, exports.ACT_SHELTER, team, pilotId, enter ? 1 : 0, structureId); }
    queueManTower(tick, team, pilotId, towerId) { return this.queueAct(tick, reserve_ts_1.ACT_RESERVE_MODE, team, 2, pilotId, towerId); }
    leaveTower(pilotId, team) {
        const p = this.pilots.get(pilotId);
        if (!this.bfx || !p)
            return this.rej("unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        const why = this.bfx.unman(pilotId);
        return why ? this.rej(why) : { ok: true };
    }
    /** Is tower towerId manned now? */
    towerManned(towerId) { const s = this.idToSlot.get(towerId); return s !== undefined && !!this.bfx && this.bfx.isManned(this, s); }
    /** Shield Projector projId's dome points left (-1: not a projector). */
    domeLeft(projId) { const r = this.bfx?.domes.get(projId); return r ? r[0] : -1; }
    /** fix-qa2 (bldfx.ts): ship ore / gas off-world at own Launch Pad uplink upId (extraction quota). */
    exportCargo(team, upId, ore, gas) {
        if (!this.bfx)
            return this.rej("unknownBuilding");
        const why = this.bfx.exportCargo(this, team, upId, ore, gas);
        return why ? this.rej(why) : { ok: true };
    }
    queueExportCargo(tick, team, upId, ore, gas) { return this.queueAct(tick, reserve_ts_1.ACT_RESERVE_MODE, team, 4, upId, ore, gas, 0); }
    /** Ruling 86: the team's Shield Projector gas floor (the dome is off while the team's gas is below it). badInput outside 0-100000. */
    setDomeGasFloor(team, gas) { return (0, s15_ts_1.setGasFloor)(this, team, gas) ? { ok: true } : this.rej("badInput"); }
    /** Ruling 86, tick-stamped: ACT_RESERVE_MODE sub-command 5 (a 5, b 0, c the gas level). */
    queueDomeGasFloor(tick, team, gas) { return this.queueAct(tick, reserve_ts_1.ACT_RESERVE_MODE, team, 5, 0, gas); }
    /** Ore and gas the team has shipped off-world. */
    exportedCargo(team) { return this.bfx ? [this.bfx.exported[2 * team], this.bfx.exported[2 * team + 1]] : [0, 0]; }
    /** MiningHost: a working Mass Driver pair end is an ore drop-off (bldfx.ts). */
    extraDropOff(o) { return this.bfx !== null && this.bfx.R.driver[this.etype[o]] === 1 && this.bfx.driverDrop(this, o); }
    /** spawnRefusal for reserve.ts. */
    spawnRefusalOf(t, team) { return this.spawnRefusal(t, team); }
    /** Point index the squad of entity id is garrisoned at (-1 none). */
    garrisonOf(entityId) { const s = this.idToSlot.get(entityId); return s === undefined || !this.sp ? -1 : this.sp.garrisonOf(this, s); }
    /** w3b co-op hook (doc 17): a leaving player's units pass to the squad: they join one of the team's battle groups. Returns how many joined. */
    passUnitsToSquad(team, ids) { return (0, battlegroups_ts_1.groupAdopt)(this, team, ids); }
    /** w2e: soldiers aboard vehicleId (out of the world: they have no entity while aboard). */
    cargoOf(vehicleId) { return (0, transport_ts_1.tpCargoOf)(this, vehicleId); }
    queuePlantCharge(tick, pilotId, targetId, team) { return this.queueAct(tick, exports.ACT_CHARGE, team, pilotId, targetId, 0); }
    /** One hit of weapon w on slot e from team (pilotkit.ts charges): direction in (inX, inZ) for the rear bonus, no backstab; hit markers for pilotId. */
    kitDamage(e, w, team, pilotId, inX, inZ) {
        const q = this.sc;
        this.hitShooter = 0;
        this.hitPilot = pilotId;
        this.hitCtl = this.isPlayerPilot(pilotId);
        q[S_INX] = inX;
        q[S_INZ] = inZ;
        q[S_SCALE] = 1;
        this.applyDamage(e, w, team, 0xff);
        this.hitShooter = 0;
        this.hitPilot = 0;
        this.hitCtl = false;
    }
    /** Tick-stamped queueing of unit type `unitId` at building `buildingId` (see addToQueue). by: player tag (-1 none). */
    queueProduction(tick, buildingId, unitId, team, by = -1) {
        const t = typeof unitId === "string" ? this.d.typeIds.indexOf(unitId) : -1;
        return this.queueAct(tick, exports.ACT_QUEUE, team, buildingId, t < 0 || t >= this.d.unitCount ? -1 : t, by);
    }
    /** Tick-stamped cancel of queue item `index` (default: the last) at building `buildingId`. */
    queueCancelProduction(tick, buildingId, index = -1, team) { return this.queueAct(tick, exports.ACT_CANCEL, team, buildingId, index, 0); }
    /** Tick-stamped rally point of building `buildingId` (null clears it). */
    queueRallyPoint(tick, buildingId, point, team) {
        if (point !== null && point !== undefined && !Array.isArray(point))
            return this.refuseInput(exports.ACT_RALLY, buildingId, team); // QA1 bug 8
        return this.queueAct(tick, exports.ACT_RALLY, team, buildingId, 0, point ? 1 : 0, point ? point[0] : 0, point ? point[1] : 0);
    }
    applyAction(qa) {
        const team = qa.team === NO_TEAM ? undefined : qa.team;
        let r, subject = qa.a;
        this.curSeq = qa.seq;
        switch (qa.kind) {
            case exports.ACT_ENTER:
                r = this.enter(qa.a, qa.b, qa.c >= 0 ? qa.c : undefined, team);
                break;
            case exports.ACT_EXIT:
                r = this.exit(qa.a, team);
                break;
            case exports.ACT_SWITCH:
                r = this.switchSeat(qa.a, qa.c >= 0 ? qa.c : undefined, team);
                break;
            case exports.ACT_EJECT:
                r = this.eject(qa.a, team);
                break;
            case exports.ACT_QUEUE:
                r = qa.b < 0 ? this.rej("unknownUnitType") : this.addToQueue(qa.a, this.d.typeIds[qa.b], team, qa.c);
                break;
            case exports.ACT_CANCEL:
                r = this.cancelProduction(qa.a, qa.b, team);
                break;
            case exports.ACT_RALLY:
                r = this.setRallyPoint(qa.a, qa.c ? [qa.x, qa.z] : null, team);
                break;
            case exports.ACT_HARVEST:
                r = this.harvest(qa.a, qa.b, team);
                break;
            case exports.ACT_BUILD:
                r = this.buildRaw(qa.team === NO_TEAM ? -1 : qa.team, qa.a, qa.b <= -2 ? -2 : qa.b, qa.b <= -2 ? [qa.x, qa.z] : null, qa.c, qa.b <= -3 ? -3 - qa.b : -1);
                break; // B2: b = -3 - yaw step (a position with a facing)
            case exports.ACT_CANCEL_BUILD:
                r = this.cancelBuild(qa.a, team);
                break;
            case exports.ACT_CHARGE:
                r = this.plantCharge(qa.a, qa.b, team);
                break;
            case exports.ACT_LOADOUT: {
                const ids = [], R = this.callRules;
                for (let k = 0, v = qa.b; k < qa.c; k++, v = Math.floor(v / 32)) {
                    const ci = (v % 32) - 1;
                    ids.push(R && ci >= 0 && ci < R.ids.length ? R.ids[ci] : "?");
                }
                r = this.loadoutAtBase(qa.a, team) ?? this.setCallLoadout(qa.a, ids, team);
                break;
            }
            case exports.ACT_CMD_CALL:
                r = this.commanderCall(qa.a, qa.b, qa.x, qa.z);
                break;
            case economy2_ts_1.ACT_FORTIFY:
                r = this.fortify(qa.team === NO_TEAM ? -1 : qa.team, qa.a, qa.b);
                break;
            case economy2_ts_1.ACT_DEPLOY_BASE:
                r = this.deployBase(qa.a, team);
                break;
            case economy2_ts_1.ACT_PACK_BASE:
                r = this.packBase(qa.a, team);
                break;
            case exports.ACT_LOAD:
                r = this.load(qa.a, qa.b, team);
                break;
            case exports.ACT_UNLOAD:
                r = this.unload(qa.a, qa.x, qa.z, team);
                break;
            case exports.ACT_LIFT:
                r = this.airlift(qa.a, qa.b, team);
                break;
            case battlegroups_ts_1.ACT_GROUP_SET:
                r = team === undefined ? this.rej("notOwner") : (0, battlegroups_ts_1.groupSet)(this, team, qa.a, qa.b, qa.c);
                break;
            case battlegroups_ts_1.ACT_GROUP_ORDER:
                r = team === undefined ? this.rej("notOwner") : (0, battlegroups_ts_1.groupOrder)(this, team, qa.a, qa.b, qa.c, qa.x, qa.z);
                break;
            case battlegroups_ts_1.ACT_GROUP_WAYPOINT:
                r = team === undefined ? this.rej("notOwner") : (0, battlegroups_ts_1.groupWaypoint)(this, team, qa.a, qa.x, qa.z);
                break;
            case battlegroups_ts_1.ACT_GROUP_REINFORCE:
                r = team === undefined ? this.rej("notOwner") : (0, battlegroups_ts_1.groupReinforce)(this, team, qa.a, qa.b);
                break;
            case battlegroups_ts_1.ACT_AUTO_DEFEND:
                r = team === undefined ? this.rej("notOwner") : (0, battlegroups_ts_1.setAutoDefend)(this, team, qa.b);
                break;
            case strongpoints_ts_1.ACT_GARRISON:
                r = team === undefined ? this.rej("notOwner") : this.garrison(team, qa.a, qa.b, qa.c);
                break;
            case reserve_ts_1.ACT_RESERVE_DEPLOY:
                r = team === undefined ? this.rej("notOwner") : this.reserveDeploy(team, qa.a, qa.x, qa.z);
                break;
            case reserve_ts_1.ACT_RECALL:
                r = team === undefined ? this.rej("notOwner") : this.recallUnit(team, qa.b);
                break;
            case reserve_ts_1.ACT_RAPID_REINFORCE:
                r = team === undefined ? this.rej("notOwner") : this.rapidReinforce(team, qa.a, qa.b);
                break;
            case reserve_ts_1.ACT_RESERVE_MODE:
                r = team === undefined ? this.rej("notOwner") : qa.a === 1 ? this.buyUpgrade(team, qa.b, qa.c) : qa.a === 2 ? this.manTower(qa.b, qa.c, team) : qa.a === 3 ? this.leaveTower(qa.b, team) : qa.a === 4 ? this.exportCargo(team, qa.b, qa.c, qa.x) : qa.a === 5 ? this.setDomeGasFloor(team, qa.c) : this.setReserveMode(team, qa.b, qa.c === 1);
                break; // 5: ruling 86 dome gas floor
            case exports.ACT_CALL:
            case exports.ACT_THROW_CALL:
            case exports.ACT_FIRE_CALL: {
                r = qa.kind === exports.ACT_THROW_CALL ? this.throwCall(qa.a, qa.b, qa.x, qa.z, team, qa.c) : qa.kind === exports.ACT_FIRE_CALL ? this.fireCall(qa.a, qa.b, qa.x, qa.z, team, qa.c) : this.callIn(qa.a, qa.b, qa.x, qa.z, team, qa.c);
                this.curSeq = 0;
                if (!r.ok) {
                    const p = this.pilots.get(qa.a);
                    this.orderEvents.push({ tick: this.tick, seq: qa.seq, id: qa.a, reason: r.reason });
                    this.events.push(events_ts_1.EV.CALL_REFUSED, this.tick, qa.team !== NO_TEAM ? qa.team : p ? p.team : NO_TEAM, qa.seq, qa.a, reasonCode(r.reason), qa.b, 0, 0, 0);
                }
                return;
            }
            case coop_ts_1.ACT_JOIN:
                r = (0, coop_ts_1.coopJoin)(this, qa.team === NO_TEAM ? -1 : qa.team, qa.a);
                break; // w2f drop-in
            case coop_ts_1.ACT_LEAVE:
                r = (0, coop_ts_1.coopLeave)(this, qa.a, qa.b, team);
                break; // w2f drop-out
            case stealth_ts_1.ACT_JAMMER:
                r = (0, stealth_ts_1.setJammer)(this, qa.a, qa.b === 1, team);
                break; // w2f stealth tools
            case stealth_ts_1.ACT_DECOY:
                r = (0, stealth_ts_1.dropDecoy)(this, qa.a, team);
                break;
            case stealth_ts_1.ACT_PULSE:
                r = (0, stealth_ts_1.scoutPulse)(this, qa.a, team);
                break;
            case pilotpool_ts_1.ACT_CREW:
                r = team === undefined ? this.rej("notOwner") : this.crewVehicle(team, qa.a);
                break; // S14
            case cheats_ts_1.ACT_CHEAT:
                r = (0, cheats_ts_1.applyCheat)(this, team, qa.a, qa.b, qa.c);
                break; // D1 test cheats (ruling 115)
            case exports.ACT_SHELTER:
                r = qa.b === 1 ? this.enterShelter(qa.a, qa.c, team) : qa.b === exports.SHELTER_GUN ? this.manGun(qa.a, qa.c, team) : this.leaveShelter(qa.a, team);
                break; // ruling 121; ruling 125 gun seat
            case dispatch_ts_1.ACT_DISPATCH:
                r = team === undefined ? this.rej("notOwner") : this.dispatchCrew(team, qa.a, qa.b, qa.c);
                break; // C1 ruling 124
            default:
                r = this.rej("badInput");
                break; // an unknown kind (the fuzz reaches queueAct directly) is refused, never thrown
        }
        this.curSeq = 0;
        if (!r.ok)
            this.rejected(qa.seq, subject, r.reason, qa.kind, qa.team === NO_TEAM ? this.subjectTeam(qa.kind, subject) : qa.team);
    }
    /** Team an input's subject belongs to (for the event log when the input named no team). */
    subjectTeam(kind, id) {
        if ((kind >= exports.ACT_ENTER && kind <= exports.ACT_EJECT) || kind === exports.ACT_CHARGE || kind === exports.ACT_LOADOUT) {
            const p = this.pilots.get(id);
            return p ? p.team : NO_TEAM;
        }
        if (kind === exports.ACT_LOAD) {
            const sq = this.squads.get(id);
            return sq ? sq.team : NO_TEAM;
        } // w2e: the subject is a squad
        const s = this.idToSlot.get(id);
        return s === undefined ? NO_TEAM : this.team[s];
    }
    /** Records a rejected tick-stamped input (orderEvents: state; event log: for the snapshot stream). */
    rejected(seq, id, reason, kind, team) {
        this.orderEvents.push({ tick: this.tick, seq, id, reason });
        this.events.push(events_ts_1.EV.REJECT, this.tick, team, seq, id, reasonCode(reason), kind, 0, 0, 0);
    }
    /**
     * F1 (playtest: "it didn't turn to fire at me"): turns the AI-aimed turret mount ci of slot s (weapon w, traverseDegPerSecond
     * > 0) by at most one tick's traverse toward its target (the attack-ground spot for an indirect-fire mount under that order),
     * else back to rest along the hull. A new target starts the wind-up: a structure's mount may not fire at it before
     * mReady (weapon acquireSeconds); vehicles have no wind-up. Uncrewed and kit mounts stay where they are.
     */
    turnTurret(s, ci, w) {
        const d = this.d, t = this.etype[s];
        if (this.mOn[ci] === 0 || d.tMountManual[t * data_ts_1.MAX_MOUNTS + (ci - s * data_ts_1.MAX_MOUNTS)])
            return;
        let fx = this.mDX[ci], fz = this.mDZ[ci];
        if (fx === 0 && fz === 0) {
            fx = this.dirX[s];
            fz = this.dirZ[s];
        }
        let dx = this.dirX[s], dz = this.dirZ[s];
        const gw = this.ordType[s] === exports.ORD_ATTACK_GROUND ? this.waypoints[s] : null, ts = this.mTgtSlot[ci];
        if (gw !== null && d.wBallistic[w] === 1 && d.wCanHitGround[w]) {
            dx = gw[0] - this.x[s];
            dz = gw[1] - this.z[s];
            this.mLock[ci] = 0;
            this.mReady[ci] = 0;
        }
        else if (ts >= 0 && this.alive[ts] && this.eid[ts] === this.mTgtId[ci]) {
            dx = this.x[ts] - this.x[s];
            dz = this.z[ts] - this.z[s];
            if (this.mLock[ci] !== this.mTgtId[ci]) {
                this.mLock[ci] = this.mTgtId[ci];
                this.mReady[ci] = this.tick + (d.tStructure[t] ? d.wAcqTicks[w] : 0);
            }
        }
        else {
            this.mLock[ci] = 0;
            this.mReady[ci] = 0;
        }
        const l = Math.sqrt(dx * dx + dz * dz);
        if (l < 1e-9) {
            this.mDX[ci] = fx;
            this.mDZ[ci] = fz;
            return;
        }
        dx /= l;
        dz /= l;
        const cosT = d.wTravCos[w];
        if (fx * dx + fz * dz >= cosT) {
            fx = dx;
            fz = dz;
        }
        else {
            const sn = (fx * dz - fz * dx) >= 0 ? d.wTravSin[w] : -d.wTravSin[w];
            const rx = fx * cosT - fz * sn, rz = fx * sn + fz * cosT, rl = Math.sqrt(rx * rx + rz * rz);
            fx = rx / rl;
            fz = rz / rl;
        }
        this.mDX[ci] = fx;
        this.mDZ[ci] = fz;
    }
    /** F1: may AI-aimed mount ci (weapon w) of slot s fire along (dx, dz) (d2 = its squared length)? Always for mounts without traverse. */
    turretOnTarget(s, ci, w, dx, dz, d2) {
        const d = this.d;
        if (d.wTraverse[w] === 0 || this.mFixed[ci] !== 0)
            return true;
        if (this.tick < this.mReady[ci])
            return false;
        if (d2 < 1e-18)
            return true;
        let fx = this.mDX[ci], fz = this.mDZ[ci];
        if (fx === 0 && fz === 0) {
            fx = this.dirX[s];
            fz = this.dirZ[s];
        }
        return (fx * dx + fz * dz) / Math.sqrt(d2) >= d.turretAimCos;
    }
    /** F1: barrel yaw of slot s for the AIM record (radians, 0 = +x towards +z): its first traversing turret mount that aims at
     *  something or is turned off its rest along the hull; NaN if none (then the snapshot uses the older rules). */
    turretYaw(s) {
        const d = this.d, mb = s * data_ts_1.MAX_MOUNTS;
        for (let m = 0; m < this.mCount[s]; m++) {
            const i = mb + m, w = this.mWeapon[i];
            if (w < 0 || d.wTraverse[w] === 0 || this.mFixed[i] !== 0)
                continue;
            const fx = this.mDX[i], fz = this.mDZ[i];
            if (fx === 0 && fz === 0)
                continue;
            if (this.mTgtSlot[i] >= 0 || fx * this.dirX[s] + fz * this.dirZ[s] < 0.99995)
                return Math.atan2(fz, fx); // presentation only
        }
        return NaN;
    }
    // ------------------------------------------------------------ direct control of a pilot
    /**
     * Tick-stamped direct control of pilot pilotId (see PilotControlInput): applied at the start of the step that
     * produces `tick`, after orders and crew actions. Sample-and-hold until the next input for the same pilot or
     * until the pilot changes place (enter / exit / eject / seat switch / death release it). null releases control.
     * Only player pilots can be controlled. Returns the seq; rejections go to orderEvents.
     */
    queuePilotControl(tick, pilotId, input, team) {
        if (!Number.isInteger(tick) || tick <= this.tick)
            throw new Error(`queuePilotControl: tick ${tick} is not in the future (current tick ${this.tick})`);
        // QA1 bug 8: malformed (a guest's) arguments are refused with badInput, never thrown
        if (!isId(pilotId) || (team !== undefined && !isTeam(team)))
            return this.refuseInput(0, pilotId, team);
        if (input !== null && (typeof input !== "object" || !Number.isFinite(input.move) || !Number.isFinite(input.strafe) || !Number.isFinite(input.aimYaw) || (input.aimPitch !== undefined && !Number.isFinite(input.aimPitch))))
            return this.refuseInput(0, pilotId, team);
        if (input && (!Number.isInteger(input.fire ?? 0) || (input.fire ?? 0) < 0 || (input.fire ?? 0) > 255 || !Number.isInteger(input.tool ?? 0) || (input.tool ?? 0) < 0 || (input.tool ?? 0) > 255))
            return this.refuseInput(0, pilotId, team);
        if (input && input.clientSeq !== undefined && Number.isInteger(input.clientSeq) && input.clientSeq > 0)
            this.ctlClientSeq.set(this.inputSeq + 1, input.clientSeq); // w2f
        const qc = { tick, seq: ++this.inputSeq, pilot: pilotId, team: team === undefined ? NO_TEAM : team, on: 0, move: 0, strafe: 0, yaw: 0, pitch: 0, flags: 0, fire: 0, tool: 0 };
        if (input) {
            const pitch = input.aimPitch ?? 0;
            let mv = input.move < -1 ? -1 : input.move > 1 ? 1 : input.move;
            let st = input.strafe < -1 ? -1 : input.strafe > 1 ? 1 : input.strafe;
            const l = Math.sqrt(mv * mv + st * st);
            if (l > 1) {
                mv /= l;
                st /= l;
            }
            const hp = Math.PI / 2;
            qc.on = 1;
            qc.move = mv;
            qc.strafe = st;
            qc.yaw = input.aimYaw;
            qc.pitch = pitch < -hp ? -hp : pitch > hp ? hp : pitch;
            qc.flags = (input.sprint ? exports.PC_SPRINT : 0) | (input.crouch ? exports.PC_CROUCH : 0) | (input.prone ? exports.PC_PRONE : 0) | (input.jump ? exports.PC_JUMP : 0) | (input.jet ? exports.PC_JET : 0) | (input.interact ? exports.PC_INTERACT : 0) | (input.cloak ? pilotkit_ts_1.PC_CLOAK : 0) |
                (input.gunnerWeapon === undefined ? 0 : exports.PC_GUNNER_SET | (input.gunnerWeapon ? exports.PC_GUNNER : 0));
            const f = input.fire ?? 0, tool = input.tool ?? 0;
            qc.fire = f;
            qc.tool = tool;
        }
        let i = this.pendingPilotCtl.length;
        while (i > 0 && this.pendingPilotCtl[i - 1].tick > tick)
            i--;
        this.pendingPilotCtl.splice(i, 0, qc);
        return qc.seq;
    }
    /** w2f: client sequence numbers of queued pilot controls (sim seq -> clientSeq) and the last applied one per pilot. Not state. */
    ctlClientSeq = new Map();
    lastCtl = new Map();
    /** w2f: the last control input applied for pilotId: its clientSeq (0 if it had none) and the tick it took effect; undefined before any. */
    lastControlInput(pilotId) { return this.lastCtl.get(pilotId); }
    applyPilotControl(qc) {
        {
            const cs = this.ctlClientSeq.get(qc.seq);
            if (cs !== undefined)
                this.ctlClientSeq.delete(qc.seq);
            this.lastCtl.set(qc.pilot, { clientSeq: cs ?? 0, tick: this.tick });
        }
        const d = this.d, p = this.pilots.get(qc.pilot);
        let reason = null;
        if (!d.crewOn)
            reason = "notCrewable";
        else if (!p)
            reason = "unknownPilot";
        else if (qc.team !== NO_TEAM && p.team !== qc.team)
            reason = "notOwner";
        else if (p.player < 0)
            reason = "notPlayerPilot";
        else if (p.state === exports.P_DEAD)
            reason = "callerDown"; // QA1 bug 9: the pilot exists but is dead, waiting to respawn or in its drop pod
        if (reason !== null || !p) {
            this.rejected(qc.seq, qc.pilot, reason ?? "unknownPilot", 0, qc.team !== NO_TEAM ? qc.team : p ? p.team : NO_TEAM);
            return;
        }
        this.controlPilot(p, qc);
    }
    /** Applies a validated pilot control input to whatever the pilot is in (on foot, driver seat, gunner seat). Release (on 0) clears that place's control state. */
    controlPilot(p, qc) {
        const d = this.d;
        if (p.state === exports.P_FOOT) {
            const s = this.idToSlot.get(p.entity);
            if (qc.on)
                (0, s15_ts_1.idleActive)(this, p.id, p.entity); // ruling 73 (H1 reading): any input that arrives means the player is present; only a stalled input stream (a leaver / lost connection) drops prone
            this.takeControl(s, qc.on === 1);
            this.ctlOn[s] = qc.on;
            this.ctlThrust[s] = qc.move;
            this.ctlStrafe[s] = qc.strafe;
            this.ctlYaw[s] = qc.yaw;
            this.ctlPitch[s] = qc.pitch;
            this.ctlFire[s] = qc.fire;
            this.ctlFlags[s] = qc.flags;
            this.ctlTool[s] = qc.tool;
            if (!qc.on)
                this.ctlMask[s] = 0;
            this.stanceUpdate(s);
            return;
        }
        if (p.state === exports.P_SHELTER && p.seat >= 0) { // ruling 125: the gunner of a manned turret: aim and trigger (the barrel follows at its traverse)
            const vs = this.idToSlot.get(p.vehicle);
            if (vs === undefined || (this.ctlMask[vs] & exports.GUN_SEAT_BIT) === 0)
                return;
            const i = vs * data_ts_1.MAX_SEATS;
            if (qc.on) {
                this.gYaw[i] = qc.yaw;
                this.gPitch[i] = qc.pitch;
            }
            this.gFire[i] = qc.on ? qc.fire & 3 : 0; // ruling 130: bit 1 (RMB) fires the sentry's rocket pod
            return;
        }
        if (p.state !== exports.P_SEATED)
            return;
        const vs = this.idToSlot.get(p.vehicle), vt = this.etype[vs], j = p.seat, bit = 1 << j;
        const role = d.tSeatRole[vt * data_ts_1.MAX_SEATS + j];
        if (role === data_ts_1.SEAT_DRIVER && j === d.tDriverSeat[vt]) {
            this.takeControl(vs, qc.on === 1);
            this.ctlOn[vs] = qc.on;
            this.ctlThrust[vs] = qc.move;
            this.ctlStrafe[vs] = qc.strafe;
            this.ctlYaw[vs] = qc.yaw;
            this.ctlPitch[vs] = qc.pitch;
            this.ctlFire[vs] = qc.on ? qc.fire & (this.fkit ? 7 : 3) : 0; // Frontline: bit 2 (R) fires the third driver weapon
            // driver: only the gunner-weapon choice (rev 4); w2c aircraft pilots also land with crouch held
            // ruling 41: an aircraft pilot toggles low flight with the jump bit (PC_JUMP, on its press: off -> on between inputs)
            if (d.tAir[vt] && qc.on && (qc.flags & exports.PC_JUMP) && !(this.ctlFlags[vs] & exports.PC_JUMP))
                this.lowFly[vs] ^= 1;
            this.ctlFlags[vs] = qc.on ? qc.flags & (exports.PC_GUNNER | exports.PC_GUNNER_SET | (d.tAir[vt] ? exports.PC_CROUCH | exports.PC_JUMP : 0) | (d.tArmour[vt] === 1 ? pilotkit_ts_1.PC_CLOAK : 0) | (d.tBoostMul[vt] > 0 ? exports.PC_SPRINT : 0) | (!d.tAir[vt] && d.tJump[vt] > 0 ? exports.PC_JUMP : 0)) : 0; // ruling 112: the hover hop (jump key); w2f: a bike rider's cloak; ruling 108: boost (the sprint key)
            if (qc.on)
                this.ctlMask[vs] |= bit;
            else
                this.ctlMask[vs] &= ~bit;
        }
        else if (role === data_ts_1.SEAT_GUNNER || role === data_ts_1.SEAT_DRIVER || (role === data_ts_1.SEAT_PASSENGER && d.tSeatArmed[vt * data_ts_1.MAX_SEATS + j])) { // ruling 33: an armed (canFire) passenger aims its personal weapon
            const i = vs * data_ts_1.MAX_SEATS + j;
            this.gYaw[i] = qc.on ? qc.yaw : 0;
            this.gPitch[i] = qc.on ? qc.pitch : 0;
            this.gFire[i] = qc.on ? qc.fire & 1 : 0;
            if (qc.on) {
                if (!(this.ctlMask[vs] & bit))
                    for (let m = 0; m < this.mCount[vs]; m++)
                        if (d.tMountCrewSeat[vt * data_ts_1.MAX_MOUNTS + m] === j) {
                            this.mTgtSlot[vs * data_ts_1.MAX_MOUNTS + m] = -1;
                            this.mTgtId[vs * data_ts_1.MAX_MOUNTS + m] = 0;
                        }
                this.ctlMask[vs] |= bit;
            }
            else
                this.ctlMask[vs] &= ~bit;
        } // other passengers: nothing to control
    }
    /** Taking control of slot s (on, and not yet controlled): drop the AI's order and targets. */
    takeControl(s, on) {
        if (!on || this.ctlOn[s])
            return;
        this.ordType[s] = exports.ORD_NONE;
        this.waypoints[s] = null;
        this.ramPhase[s] = 0;
        this.noLos[s] = 0;
        this.tgtSlot[s] = -1;
        this.tgtId[s] = 0;
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
            this.mTgtSlot[s * data_ts_1.MAX_MOUNTS + m] = -1;
            this.mTgtId[s * data_ts_1.MAX_MOUNTS + m] = 0;
        }
    }
    // ------------------------------------------------------------ hull-critical window, pilots per tick
    /** Step phase 8 (crews on): crewed vehicles whose hull reached zero (ruling 34, below). */
    criticalStep(n) {
        // ruling 34: no hull-critical window to miss. When a crewed vehicle's hull reaches zero (critTick = this tick), every
        // occupant of every seat, players and AI crews alike, is ejected at once with the normal eject launch (EJECT with
        // F_AUTO_EJECT), then the vehicle is destroyed in the same tick. With no entity room for the crew's bodies they die
        // aboard. Bikes never get here (ruling 26: their riders die with them, removeDead).
        const tick = this.tick;
        for (let k = 0; k < n; k++) {
            const s = this.live[k];
            if (!this.alive[s] || this.critTick[s] < 0 || this.hp[s] > 0)
                continue;
            this.ctlOn[s] = 0;
            this.ctlMask[s] = 0;
            this.ctlFire[s] = 0;
            if (this.tp)
                (0, transport_ts_1.tpVehicleDown)(this, s); // w2e: soldiers aboard roll the same survival chance; survivors land by the wreck
            if (this.nOcc[s] > 0)
                this.passengerRolls(s); // w2c (doc 11): passengers of an enclosed vehicle each roll to survive
            if (this.nOcc[s] > 0 && this.slotsLeft() >= this.nOcc[s])
                this.ejectAll(s, events_ts_1.F_AUTO_EJECT);
            this.events.push(events_ts_1.EV.DESTROYED, tick, this.team[s], this.eid[s], 0, 0, 0, 0, 0, 0);
            this.stats.criticalDestroyed++;
            this.dying[this.nDying++] = s;
        }
    }
    // scratch (not state): per team, the slots of pilot homes / respawn points / energy refill buildings, and their counts [team * 3 + kind]
    homes = [new Int32Array(64), new Int32Array(64), new Int32Array(64), new Int32Array(64)];
    spawns = [new Int32Array(64), new Int32Array(64), new Int32Array(64), new Int32Array(64)];
    refills = [new Int32Array(64), new Int32Array(64), new Int32Array(64), new Int32Array(64)];
    homeN = new Int32Array(exports.MAX_TEAMS * 3);
    listAdd(lists, tm, kind, s) {
        const i = tm * 3 + kind, n = this.homeN[i];
        if (n >= lists[tm].length) {
            const g = new Int32Array(lists[tm].length * 2);
            g.set(lists[tm]);
            lists[tm] = g;
        }
        lists[tm][n] = s;
        this.homeN[i] = n + 1;
    }
    footScratch = new Int32Array(0); // scratch (not state): pilot slots on foot this tick
    /**
     * Step phase 10 (crews on): pilots on foot refill energy near a friendly Barracks / Command Core / Field Depot
     * (ruling 17), use the repair torch (rulings 16-17), AI pilots on foot despawn into the nearest friendly pilot
     * home (ruling 19; re-aimed every targeting interval), seat slides complete, dead players respawn on foot at
     * the respawn point nearest to where they died (doc 13 timers).
     */
    pilotStep() {
        const d = this.d, c = d.crew, tick = this.tick, n = this.nLive;
        // pilots on foot (alive at the start of the tick) and the friendly buildings they use, in one pass over the live list
        const foot = this.footScratch;
        let nf = 0;
        // (cleared by count, not `length = 0`: that frees the arrays' storage and every push reallocates it)
        const hn = this.homeN;
        hn.fill(0);
        for (let k = 0; k < n; k++) {
            const s = this.live[k];
            if (!this.alive[s] || this.hp[s] <= 0)
                continue;
            if (this.slotPilot[s] !== 0) {
                foot[nf++] = s;
                continue;
            }
            const t = this.etype[s];
            if (!d.tStructure[t])
                continue;
            const tm = this.team[s];
            if (d.tPilotHome[t] && (!this.pool || this.homeServes(s)))
                this.listAdd(this.homes, tm, 0, s); // S14: a supplied home (ruling 47)
            if (d.tRespawnPoint[t])
                this.listAdd(this.spawns, tm, 1, s);
            if (d.tEnergyRefill[t])
                this.listAdd(this.refills, tm, 2, s);
        }
        // fix-qa2: + one navigation cell: since QA1 fix 6 a goal inside a building moves to the nearest free cell, so a pilot
        // walking home stops up to a cell short of the wall (ruling 19's walk home never ended)
        const rp = d.tRadius[d.pilotType], arrive = d.constants.arrivalRadius + rp + (this.nav ? this.nav.cell : 0);
        for (let k = 0; k < nf; k++) {
            const s = foot[k], pid = this.slotPilot[s];
            if (!this.alive[s] || pid === 0)
                continue;
            const p = this.pilots.get(pid);
            if (!p)
                continue;
            // (p.lastX / lastZ are written where the pilot boards or dies, not every tick: a double stored into a record field allocated)
            if (p.hackVehicle !== 0) {
                this.hijackStep(p, s);
                if (p.state !== exports.P_FOOT)
                    continue;
            }
            const tm = this.team[s];
            if (this.energy[s] < c.energyMax) {
                const rf = this.refills[tm], nrf = hn[tm * 3 + 2];
                for (let ri = 0; ri < nrf; ri++) {
                    const b = rf[ri];
                    this.gapQ(s, b);
                    if (this.sc[S_RET] > c.refillRadius)
                        continue;
                    const v = this.energy[s] + c.refillPerTick;
                    this.energy[s] = v > c.energyMax ? c.energyMax : v;
                    break;
                }
            }
            if (this.ctlOn[s] && this.ctlTool[s] === exports.TOOL_TORCH && this.airborne[s] === exports.AIR_GROUND)
                this.torch(s);
            // AI pilots going home: arrival checked every 5 ticks, the nearest home re-aimed every targeting interval
            if (p.task === 1 && p.player < 0 && this.airborne[s] === exports.AIR_GROUND && ((tick + s) % 5 === 0 || (tick + s) % this.retryTicks === 0)) {
                let home = -1, hd = Infinity;
                const hm = this.homes[tm], nhm = hn[tm * 3];
                for (let hi = 0; hi < nhm; hi++) {
                    const b = hm[hi];
                    this.gapQ(s, b);
                    const g = this.sc[S_RET];
                    if (g < hd) {
                        hd = g;
                        home = b;
                    }
                }
                if (home >= 0 && hd <= arrive) {
                    this.events.push(events_ts_1.EV.RETURNED, tick, tm, p.id, this.eid[home], 0, 0, 0, 0, 0);
                    this.stats.pilotsReturned[tm]++;
                    if (this.pool)
                        this.pool.onReturn(this, p.id, tm, this.eid[home], pilotpool_ts_1.PA_WALKED_HOME); // S14: back in the reserve
                    this.pilots.delete(p.id);
                    this.despawn(s);
                    continue;
                }
                if (home >= 0 && (tick + s) % this.retryTicks === 0) {
                    const wp = this.waypoints[s];
                    if (this.ordType[s] !== exports.ORD_MOVE || !wp || wp[wp.length - 2] !== this.x[home] || wp[wp.length - 1] !== this.z[home]) {
                        this.quietOrders = true;
                        this.order([this.eid[s]], { type: "move", x: this.x[home], z: this.z[home] });
                        this.quietOrders = false;
                    }
                }
            }
        }
        for (const p of this.pilots.values()) {
            if (p.state === exports.P_SHELTER) { // ruling 121: the structure is gone (removed without a death) or no longer a command seat of the team
                const vs = this.idToSlot.get(p.vehicle);
                if ((vs === undefined || !(p.seat >= 0 ? this.gunSeatable(vs, p.team, p.id) : this.shelterable(vs, p.team))) && this.slotsLeft() >= 1) {
                    const gun = p.seat >= 0;
                    if (vs !== undefined && gun)
                        this.gunRelease(vs);
                    const ok = vs !== undefined && this.alive[vs];
                    const eid = this.shelterOut(p, ok ? vs : -1, true);
                    this.events.push(events_ts_1.EV.SHELTER, tick, p.team, p.id, this.lastShelter, ok && this.team[vs] !== p.team ? exports.SH_CAPTURED : exports.SH_DESTROYED, eid, 0, 0, events_ts_1.F_PLAYER | (gun ? exports.SHF_GUN : 0));
                }
                continue;
            }
            if (p.state === exports.P_SEATED) {
                if (p.readyTick > 0 && p.readyTick <= tick) {
                    p.readyTick = 0;
                    const vs = this.idToSlot.get(p.vehicle);
                    if (vs !== undefined)
                        this.recomputeCrew(vs);
                }
            }
            else if (p.state === exports.P_DEAD && tick >= p.respawnTick) {
                let best = -1, bd = Infinity;
                const sp = this.spawns[p.team];
                for (let si = 0, ns = hn[p.team * 3 + 1]; si < ns; si++) {
                    const b = sp[si];
                    // strategic points (doc 13 / ruling 18): a supplied Barracks, or the Command Core (a supply source) anywhere
                    if (this.pts && !this.pts.tSource[this.etype[b]] && !this.pts.structureSupplied(this, b) && !(this.eco2 && this.eco2.depotRunning(this, b)))
                        continue;
                    const dx = this.x[b] - p.lastX, dz = this.z[b] - p.lastZ, d2 = dx * dx + dz * dz;
                    if (d2 < bd) {
                        bd = d2;
                        best = b;
                    }
                }
                if (best < 0)
                    continue; // no Barracks or Command Core: wait (doc 13: spectate)
                if (this.slotsLeft() < 1)
                    continue; // entity storage at maxCapacity: wait
                const off = d.tRadius[this.etype[best]] + rp + c.exitGap;
                p.hp = this.pilotMaxHp(p);
                p.shield = d.tShield[d.pilotType];
                p.energy = c.energyMax;
                p.jet = c.jetFreeBurnSeconds;
                p.lastHit = -1 << 30;
                let rx = this.x[best] + this.dirX[best] * off, rz = this.z[best] + this.dirZ[best] * off;
                if (!this.spotFree(rx, rz, rp, -1)) {
                    this.freeSpot(best, off);
                    rx = this.sc[S_CX];
                    rz = this.sc[S_CZ];
                } // in front of the building if free
                const ps = this.spawnPilotEntity(p, rx, rz);
                p.aliveSince = tick;
                this.stats.respawns++;
                this.events.push(events_ts_1.EV.RESPAWN, tick, p.team, p.id, this.eid[ps], this.eid[best], 0, 0, 0, events_ts_1.F_PLAYER);
            }
        }
        if (this.dispatch !== null)
            (0, dispatch_ts_1.dispatchStep)(this); // C1 ruling 124: pilots sent to a vehicle
        if (this.kitRules) {
            (0, pilotkit_ts_1.kitStep)(this);
            if (this.fkit)
                this.fkit.step(this); // Frontline: ammo refill
            (0, pilotkit_ts_1.kitAiReboard)(this);
        } // S12 pilot kit (pilotkit.ts)
        (0, stealth_ts_1.stealthStep)(this);
        (0, stealth_ts_1.stealthSearch)(this); // w2f stealth tools, AI search for lost contacts (stealth.ts)
        if (this.uai !== null && this.uai.hijack.some((v) => v === 1))
            (0, unit_ai_ts_1.unitAiPilots)(this, this.uai); // w3b: enemy pilots steal empty vehicles (hard)
    }
    /** Repair torch of pilot slot s (rulings 16-17): the nearest damaged friendly vehicle or structure in reach gains hull for energy. */
    torch(s) {
        const d = this.d, c = d.crew;
        if (this.energy[s] <= 0)
            return;
        const g = this.fine, rs = d.tRadius[this.etype[s]], qr = rs + this.maxRadius + c.torchRange + this.moveMargin;
        const sx = this.x[s], sz = this.z[s], team = this.team[s];
        let best = -1, bg = Infinity;
        const c0 = g.cellOf(sx - qr), c1 = g.cellOf(sx + qr), r0 = g.cellOf(sz - qr), r1 = g.cellOf(sz + qr);
        const side = g.cellsPerSide, start = g.bucketStart, ent = g.entries, ek = g.entryKey, mask = g.mask;
        for (let cz = r0; cz <= r1; cz++)
            for (let cx = c0; cx <= c1; cx++) {
                const key = cz * side + cx;
                const b = (Math.imul(key, 0x9e3779b1) >>> 16) & mask;
                for (let p = start[b], e = start[b + 1]; p < e; p++) {
                    if (ek[p] !== key)
                        continue;
                    const o = ent[p], ot = this.etype[o];
                    if (o === s || !this.alive[o] || this.team[o] !== team || this.hp[o] <= 0 || this.critTick[o] >= 0 || this.hp[o] >= (d.tStructure[ot] ? this.maxHull(o) : d.tHp[ot]))
                        continue;
                    if (!d.tStructure[ot] && !d.tVehicle[ot])
                        continue;
                    if (d.tStructure[ot] && this.callSentry(o))
                        continue; // ruling 78: call-in sentries are not repairable
                    if (this.pts && d.tStructure[ot] && !this.pts.structureSupplied(this, o))
                        continue; // cut-off points cannot repair (doc 6)
                    this.gapQ(s, o);
                    const gg = this.sc[S_RET];
                    if (gg <= c.torchRange && (gg < bg || (gg === bg && o < best))) {
                        bg = gg;
                        best = o;
                    }
                }
            }
        if (best < 0)
            return;
        const spend = this.energy[s] < c.torchEnergyPerTick ? this.energy[s] : c.torchEnergyPerTick;
        this.energy[s] -= spend;
        const v = this.hp[best] + c.torchHullPerTick * (spend / c.torchEnergyPerTick), max = this.maxHull(best); // QA3-11
        this.hp[best] = v > max ? max : v;
        const rep = v > max ? c.torchHullPerTick * (spend / c.torchEnergyPerTick) - (v - max) : c.torchHullPerTick * (spend / c.torchEnergyPerTick);
        this.stats.torchRepair += rep;
        if (this.progRules && this.slotPilot[s] !== 0)
            (0, progression_ts_1.progRepair)(this, this.slotPilot[s], rep); // w2e: battle record
    }
    // =================================================================== production and resources (ruling 18)
    // ------------------------------------------------------------ mining (mining.ts)
    /** Set while the mining loop gives its own orders (they do not switch a harvester to manual). Not state. */
    mineOrdering = false;
    /** MiningHost: AI-driven and not under direct control. */
    mineCanSteer(s) { return this.ctlOn[s] === 0 && (!this.crewable(s) || (this.drv[s] === 1 && !this.driverIsPlayer(s))); }
    /** MiningHost: internal move order to (x, z), only if it is not already the current destination. */
    mineMove(s, x, z) {
        const wp = this.waypoints[s], tx = this.clampMap(x), tz = this.clampMap(z);
        if (this.ordType[s] === exports.ORD_MOVE && wp && wp[wp.length - 2] === tx && wp[wp.length - 1] === tz)
            return;
        this.mineOrdering = true;
        this.order([this.eid[s]], { type: "move", x: tx, z: tz });
        this.mineOrdering = false;
    }
    /** MiningHost (q1): a waiting / docked harvester turns toward (dx, dz) at its turn rate. */
    mineFace(s, dx, dz) {
        const l = Math.sqrt(dx * dx + dz * dz);
        if (l < 1e-9)
            return;
        this.sc[S_DIRX] = dx / l;
        this.sc[S_DIRZ] = dz / l;
        this.turnToward(s);
    }
    /** q1: slots a and b are in the same drop-off's dock lane (no separation between them). */
    mineLaneExempt(a, b) { const L = this.mine?.lane; return !!L && a < L.length && b < L.length && L[a] !== 0 && L[a] === L[b]; }
    /** MiningHost: internal stop. */
    mineStop(s) { if (this.ordType[s] !== exports.ORD_NONE || this.waypoints[s]) {
        this.ordType[s] = exports.ORD_NONE;
        this.waypoints[s] = null;
    } }
    /** A team's storage caps (mining income only; Infinity on a map without mining). Recomputed now from its buildings. */
    storageCap(team) {
        const M = this.mine;
        if (!M)
            return { ore: Infinity, gas: Infinity };
        M.caps(this);
        return { ore: M.oreCap[team], gas: M.gasCap[team] };
    }
    /** MiningHost: structure s is on a supplied point of its team (a map without points: always). */
    mineSupplied(s) { return !this.pts || this.pts.structureSupplied(this, s); }
    /** MiningHost: structure slot s is still under construction (s8: no storage, gas or drop-off yet). */
    underConstruction(s) { return !!this.con && this.con.underConstruction(this.eid[s]); }
    // ------------------------------------------------------------ construction (s8, construction.ts)
    /**
     * Places a building site (immediate; see construction.ts): type `buildingType` at point index `target`, or at
     * position [x, z] (its point is the one whose area holds it). constructor: a Constructor entity id, -1 the team's
     * nearest. The cost is charged now. Returns { ok, reason?, site? }.
     */
    build(team, buildingType, target, constructorId = -1, yaw) {
        const t = this.d.typeIds.indexOf(buildingType);
        return this.buildRaw(team, t, Array.isArray(target) ? -2 : target, Array.isArray(target) ? target : null, constructorId, Array.isArray(target) ? buildYawStep(yaw) : -1);
    }
    buildRaw(team, t, p, pos, ctor, yawStep = -1) {
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        if (!this.con)
            return this.rej("unknownPoint");
        if (!(team >= 0 && team < exports.MAX_TEAMS))
            return this.rej("notOwner");
        if (t < this.d.unitCount || t >= this.d.typeIds.length)
            return this.rej("unknownBuildingType");
        const r = this.con.place(this, team, t, p, pos, Number.isInteger(ctor) ? ctor : -1, Number.isInteger(yawStep) ? yawStep : -1);
        return r.ok ? { ok: true, site: r.site } : this.rej(r.reason);
    }
    /** Tick-stamped build (see build()). The team is required. Returns the seq; rejections go to orderEvents and the event log (REJECT, subject = the type index). */
    /** B2: with a position, `yaw` (radians, 0 = +x towards +z) sets the finished building's facing (quantised to BUILD_YAW_STEPS); without one it faces the map centre as before. */
    queueBuild(tick, team, buildingType, target, constructorId = -1, yaw) {
        const t = typeof buildingType === "string" ? this.d.typeIds.indexOf(buildingType) : -1;
        const pos = Array.isArray(target), q = pos ? buildYawStep(yaw) : -1;
        return this.queueAct(tick, exports.ACT_BUILD, team, t < this.d.unitCount ? -1 : t, pos ? (q >= 0 ? -3 - q : -2) : target, constructorId, pos ? target[0] : 0, pos ? target[1] : 0);
    }
    /** B2: face slot s along yaw step q (construction: a placed building's chosen facing). */
    faceStep(s, q) { const a = (q * 2 * Math.PI) / construction_ts_1.BUILD_YAW_STEPS; this.dirX[s] = (0, fmath_ts_1.dcos)(a); this.dirZ[s] = (0, fmath_ts_1.dsin)(a); }
    /** Cancels a site before it is finished: its cost x construction.cancelRefund back, a half-built structure removed. */
    cancelBuild(siteId, team) {
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        if (!this.con)
            return this.rej("unknownSite");
        const r = this.con.cancel(this, team, siteId);
        return r.ok ? { ok: true } : this.rej(r.reason);
    }
    queueCancelBuild(tick, siteId, team) { return this.queueAct(tick, exports.ACT_CANCEL_BUILD, team, siteId, 0, 0); }
    /** Building sites (placed, under construction), in site id order. */
    buildSites() { const C = this.con; return C ? C.siteList().map((s) => C.view(this, s)) : []; }
    /** Build slots of point p (index), or of every point. */
    pointSlots() { const C = this.con, P = this.pts; return C && P ? Array.from({ length: P.n }, (_, p) => C.slotsOf(this, p)) : []; }
    /** What team may build where now: every buildable type at every point, ok or the refusal reason (cost and constructor included). */
    buildOptions(team) {
        const C = this.con, P = this.pts, out = [];
        if (!C || !P)
            return out;
        for (let p = 0; p < P.n; p++)
            for (const id of (0, construction_ts_1.buildTypesForPoint)(this.d.raw, P.types[p])) {
                const why = C.refusal(this, team, this.d.typeIds.indexOf(id), p);
                out.push(why ? { point: p, type: id, ok: false, reason: why } : { point: p, type: id, ok: true });
            }
        return out;
    }
    /** Gas geysers of the map (static). */
    geysersInfo() { return this.mine ? this.mine.geyserInfo() : []; }
    /**
     * Puts harvester `harvesterId` into the mining loop (s4): at deposit `deposit` (index in depositsInfo()), or -1 for the
     * nearest deposit with ore. Also takes back a harvester an outside order switched to manual. Immediate.
     */
    harvest(harvesterId, deposit = -1, team) {
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        const s = this.idToSlot.get(harvesterId);
        if (s === undefined || !this.alive[s] || this.hp[s] <= 0)
            return this.rej("unknownUnit");
        if (team !== undefined && this.team[s] !== team)
            return this.rej("notOwner");
        const M = this.mine;
        if (!M || M.tCap[this.etype[s]] <= 0)
            return this.rej(M ? "notHarvester" : "unknownDeposit");
        if (deposit !== -1 && !(Number.isInteger(deposit) && deposit >= 0 && deposit < M.nd && M.remaining[deposit] > 0))
            return this.rej("unknownDeposit");
        M.assign(this, s, deposit);
        return { ok: true };
    }
    /** Tick-stamped harvest (see harvest()). Returns the seq; rejections go to orderEvents and the event log. */
    // ------------------------------------------------------------ w2b economy depth (economy2.ts)
    /**
     * Starts a fortification upgrade of point (index) to its next level (doc 6): cost paid now; the constructor (id, or -1
     * for the team's nearest) must reach the capture ring. Refusals: unknownPoint, pointNotOwned, pointUnsupplied,
     * fortifyInProgress, maxFortification, noConstructor, notConstructor, cannotAfford (and matchOver).
     */
    fortify(team, point, constructorId = -1) {
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        if (!this.eco2)
            return this.rej("unknownPoint");
        if (team < 0 || team >= exports.MAX_TEAMS)
            return this.rej("notOwner");
        const r = this.eco2.fortify(this, team, point, constructorId);
        return r.ok ? r : this.rej(r.reason);
    }
    /** Tick-stamped fortify (ACT_FORTIFY 25). Returns the seq. */
    queueFortify(tick, team, point, constructorId = -1) { return this.queueAct(tick, economy2_ts_1.ACT_FORTIFY, team, point, constructorId, 0); }
    /** Deploys a Forward Base Vehicle where it stands (doc 18; forwardBase.deploySeconds). Refusals: notForwardBaseVehicle, notOwner, baseBusy, forwardBaseSite, forwardBaseLimit. */
    deployBase(vehicleId, team) {
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        if (!this.eco2)
            return this.rej("notForwardBaseVehicle");
        const r = this.eco2.deployBase(this, vehicleId, team);
        return r.ok ? r : this.rej(r.reason);
    }
    queueDeployBase(tick, vehicleId, team) { return this.queueAct(tick, economy2_ts_1.ACT_DEPLOY_BASE, team, vehicleId, 0, 0); }
    /** Packs a Field Depot back into its vehicle (forwardBase.packUpSeconds). Refusals: notForwardBase, notOwner, baseBusy. */
    packBase(depotId, team) {
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        if (!this.eco2)
            return this.rej("notForwardBase");
        const r = this.eco2.packBase(this, depotId, team);
        return r.ok ? r : this.rej(r.reason);
    }
    queuePackBase(tick, depotId, team) { return this.queueAct(tick, economy2_ts_1.ACT_PACK_BASE, team, depotId, 0, 0); }
    /** Removes slot s at once without a death (no events, no wreck, crew of a vehicle stays aboard only if crews are off). Forward base swap. */
    quietRemove(s) {
        if (!this.alive[s])
            return;
        if (this.d.crewOn)
            for (let j = 0; j < this.d.tSeatCount[this.etype[s]]; j++) {
                const pid = this.occ[s * data_ts_1.MAX_SEATS + j];
                if (pid === 0)
                    continue;
                // S14: a reserve pilot aboard goes straight back into the reserve (recall, a base deploying or packing)
                if (this.pool && this.pool.members.has(pid)) {
                    const p = this.pilots.get(pid);
                    this.occ[s * data_ts_1.MAX_SEATS + j] = 0;
                    this.releaseSeatControl(s, j);
                    this.pilots.delete(pid);
                    this.pool.onReturn(this, pid, p.team, this.eid[s], pilotpool_ts_1.PA_VEHICLE_REMOVED);
                    continue;
                }
                this.exit(pid);
            }
        if (this.d.crewOn)
            this.recomputeCrew(s);
        this.hp[s] = 0;
        this.dying[this.nDying++] = s;
        this.quietDeath = s;
        this.removeDead();
        this.quietDeath = -1;
    }
    /** Slot being removed by quietRemove (no wreck). Not state (only set inside one call). */
    quietDeath = -1;
    /** MiningHost hook (w2b, doc 17): income multiplier of a team (1 without economy2 or for human teams). */
    incomeMul(team) { return this.eco2 ? this.eco2.incomeMul(this, team) : 1; }
    /** Running fortification upgrades (copies, by point). */
    fortifyJobs() { return this.eco2 ? [...this.eco2.jobs.values()].sort((a, b) => a.point - b.point).map((j) => ({ ...j })) : []; }
    queueHarvest(tick, harvesterId, deposit = -1, team) { return this.queueAct(tick, exports.ACT_HARVEST, team, harvesterId, deposit, 0); }
    /** Harvester records (mining loop), in entity id order. */
    harvesters() { const M = this.mine; return M ? M.harvList().map((h) => M.harvView(h, this)) : []; }
    harvester(id) { const M = this.mine, h = M?.harv.get(id); return M && h ? M.harvView(h, this) : undefined; }
    /** Ore deposits of the map (static). */
    depositsInfo() { return this.mine ? this.mine.depositInfo() : []; }
    /** Ore deposits' remaining ore. */
    deposits() { const M = this.mine; return M ? Array.from({ length: M.nd }, (_, i) => M.depositView(i)) : []; }
    /** A team's stockpile. */
    resources(team) { return { ore: this.ore[team], gas: this.gas[team] }; }
    /** Sets a team's stockpile (scenarios). Part of the state. */
    setResources(team, ore, gas) {
        if (team < 0 || team >= exports.MAX_TEAMS)
            throw new Error("team out of range");
        if (!(ore >= 0) || !(gas >= 0) || !Number.isFinite(ore) || !Number.isFinite(gas))
            throw new Error("resources must be finite numbers >= 0");
        this.ore[team] = ore;
        this.gas[team] = gas;
    }
    /** Adds (or with negative values removes, not below 0) ore and gas: the only income this round (no mining). */
    addResources(team, ore, gas) {
        if (team < 0 || team >= exports.MAX_TEAMS)
            throw new Error("team out of range");
        if (!Number.isFinite(ore) || !Number.isFinite(gas))
            throw new Error("resources must be finite numbers");
        this.ore[team] = Math.max(0, this.ore[team] + ore);
        this.gas[team] = Math.max(0, this.gas[team] + gas);
    }
    // ------------------------------------------------------------ strategic points (design doc 6; SimOptions.map)
    /** Static info of every point (index order = the map definition's order). [] on a map without points. */
    pointsInfo() { return this.pts ? this.pts.info() : []; }
    /** Current state of every point. [] on a map without points. */
    points() { const P = this.pts; return P ? Array.from({ length: P.n }, (_, i) => P.view(i)) : []; }
    /** Current state of point `id` (string id or index), undefined if none. */
    point(id) {
        const P = this.pts;
        if (!P)
            return undefined;
        const i = typeof id === "number" ? id : P.indexOf(id);
        return i >= 0 && i < P.n ? P.view(i) : undefined;
    }
    /** Front line: pairs of adjacent point indices held by two different teams. */
    frontLine() { return this.pts ? (0, points_ts_1.frontLinePairs)(this.pts.adj, this.pts.owner) : []; }
    /** Momentum of a team, 0..1 (0 on a map without points). */
    momentum(team) { return this.pts ? this.pts.momentum[team] : 0; }
    /** Supplied points held by a team (strategic points; 0 without). */
    suppliedPointCount(team) { return this.pts ? this.pts.suppliedCount(team) : 0; }
    /**
     * Recomputes supply now (strategic points). The sim does this itself every
     * step; call it after scripted setup between steps (e.g. after spawning a Command Core) to see the result at once.
     */
    refreshPoints() { if (this.pts)
        this.pts.refresh(this, true); }
    /**
     * A structure changes team with its point (strategic points, doc 9: captured structures are kept at 50% health):
     * new team, a new single-structure squad, hull `hull`, targets cleared, its production queue lost (nothing refunded).
     */
    captureStructure(s, team, hull) {
        const id = this.eid[s];
        // QA3-4: a captured Relay Tower's jammer goes off (event JAMMER off, stamped with the old owner); the captor
        // switches it on itself
        if (this.stl !== null && this.stl.jammers.includes(id))
            (0, stealth_ts_1.setJammer)(this, id, false);
        if (this.d.crewOn && this.d.tBunker[this.etype[s]] && this.nOcc[s] > 0)
            this.bunkerVacate(s); // B1: the old side's pilots climb out
        if (this.tShelter !== null)
            this.shelterEvict(s, exports.SH_CAPTURED); // ruling 121: a captured Citadel throws the old side's pilots out
        if ((this.ctlMask[s] & exports.GUN_SEAT_BIT) !== 0)
            this.gunEvict(s, exports.SH_CAPTURED); // ruling 125
        const old = this.squads.get(this.squad[s]);
        if (old) {
            const k = old.members.indexOf(id);
            if (k >= 0)
                old.members.splice(k, 1);
            if (old.members.length === 0)
                this.squads.delete(old.id);
        }
        const sq = this.newSquad(team, true);
        sq.members.push(id);
        this.squad[s] = sq.id;
        this.team[s] = team;
        this.hp[s] = hull;
        this.tgtSlot[s] = -1;
        this.tgtId[s] = 0;
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
            this.mTgtSlot[s * data_ts_1.MAX_MOUNTS + m] = -1;
            this.mTgtId[s * data_ts_1.MAX_MOUNTS + m] = 0;
        }
        if (this.prod.size > 0)
            this.prod.delete(id);
    }
    /** Supplied points held by a team (the point layer sets it; tech tier 3 needs constants.techTiers.3.suppliedPoints). Part of the state. */
    setSuppliedPoints(team, n) {
        if (team < 0 || team >= exports.MAX_TEAMS || !Number.isInteger(n) || n < 0)
            throw new Error("setSuppliedPoints: bad team or count");
        this.suppliedPoints[team] = n;
    }
    /** Is tech tier `tier` open for `team` (doc 10: tier N needs every building of techTiers 1..N and its supplied points)? */
    tierOpen(team, tier) {
        const pr = this.d.production;
        if (!pr || tier <= 0)
            return tier <= 0;
        for (let k = 1; k <= tier && k <= 3; k++) {
            if ((this.pts ? this.pts.suppliedCount(team) : this.suppliedPoints[team]) < pr.tierPoints[k])
                return false; // strategic points: held ground
            for (const bt of pr.tierRequires[k]) {
                let found = false;
                for (let s = 0; s < this.hi && !found; s++)
                    if (this.alive[s] && this.etype[s] === bt && this.team[s] === team && this.hp[s] > 0 && !(this.con && this.con.underConstruction(this.eid[s])))
                        found = true;
                if (!found)
                    return false;
            }
        }
        return true;
    }
    /** Copy of a building's production queue (undefined: none). */
    productionQueue(buildingId) {
        const q = this.prod.get(buildingId);
        return q ? { ...q, items: q.items.map((i) => ({ ...i })) } : undefined;
    }
    /** Build ticks of unit type index t (production.unitBuildSecondsByTier by its tier). */
    buildTicks(t) { const pr = this.d.production; return pr ? pr.buildTicks[Math.min(3, Math.max(1, this.d.tTier[t]))] : 0; }
    /**
     * Queues one unit (a whole squad for squad types) at a production building (doc 10). Checked now: the
     * building can produce it (units' producedAt, effects.producesTiers), its tier is open, the queue (one of
     * production.queueLength per building) has room, and (ruling 24) the team's current ore and gas cover its cost
     * ("cannotAfford" otherwise: nothing is charged or queued). The cost is paid when the item starts (at once if the
     * queue is idle; items behind a running item when they reach the front); an item that reaches the front when
     * the team can no longer pay waits there (hold "resources"). The unit caps are checked when it
     * is finished (it waits until they allow it).
     */
    addToQueue(buildingId, unitId, team, by = -1) {
        const d = this.d, pr = d.production;
        if (!pr)
            return this.rej("productionOff");
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        const bs = this.idToSlot.get(buildingId);
        if (bs === undefined || !this.alive[bs] || this.hp[bs] <= 0 || !d.tStructure[this.etype[bs]])
            return this.rej("unknownBuilding");
        if (team !== undefined && this.team[bs] !== team)
            return this.rej("notOwner");
        if (this.con && this.con.underConstruction(buildingId))
            return this.rej("underConstruction");
        const t = d.typeIds.indexOf(unitId);
        if (t < 0 || t >= d.unitCount)
            return this.rej("unknownUnitType");
        const bt = this.etype[bs];
        if (!d.tProduces[bt].includes(t) || !(d.tProducesTierMask[bt] & (1 << d.tTier[t])))
            return this.rej("notProducer");
        if (d.tAir[t] && this.weather !== null && this.weather.e.grounded)
            return this.rej("weatherGrounded"); // wave 2 D: ash fall
        if (!this.tierOpen(this.team[bs], d.tTier[t]))
            return this.rej("tierLocked");
        // ruling 56: NO vehicle licences: production is never gated by a player's profile
        if (d.tAir[t] && !d.aircraftAllowed)
            return this.rej("noAtmosphere"); // w2c: doc 12, no atmosphere: no gunships or dropships
        let q = this.prod.get(buildingId);
        if (!q) {
            q = { building: buildingId, items: [], progress: 0, started: false, hold: exports.HOLD_NONE, rallyX: 0, rallyZ: 0, rally: false };
            this.prod.set(buildingId, q);
            this.sortProd();
        }
        if (q.items.length >= pr.queueLength)
            return this.rej("queueFull");
        // ruling 24: an item the team cannot afford now is refused (nothing charged, nothing queued); an accepted item is
        // still paid when it STARTS, and waits at the front with HOLD_RESOURCES if the stock has been spent by then
        const team0 = this.team[bs];
        if (this.ore[team0] + 1e-9 < d.tCostOre[t] || this.gas[team0] + 1e-9 < d.tCostGas[t])
            return this.rej("cannotAfford");
        if (this.isInfantrySquad(t)) { // ruling 65: squads per Barracks, counting the squads already queued
            let queued = 0;
            for (const q2 of this.prod.values()) {
                const b2 = this.idToSlot.get(q2.building);
                if (b2 !== undefined && this.team[b2] === team0)
                    for (const it of q2.items)
                        if (this.tInfSquad[it.type])
                            queued++;
            }
            if (this.infantrySquads(team0) + queued >= this.infantryCap(team0))
                return this.rej("barracksCap");
        }
        q.items.push({ type: t, by: Number.isInteger(by) && by >= 0 ? by : -1 });
        this.events.push(events_ts_1.EV.QUEUE, this.tick, this.team[bs], buildingId, t, q.items.length, 0, 0, 0, 0);
        return { ok: true };
    }
    /** Removes item `index` (default: the last). A started item is refunded (production.cancelRefund; doc 10: in full). */
    cancelProduction(buildingId, index = -1, team) {
        const pr = this.d.production;
        if (!pr)
            return this.rej("productionOff");
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        const bs = this.idToSlot.get(buildingId);
        if (bs === undefined || !this.alive[bs] || !this.d.tStructure[this.etype[bs]])
            return this.rej("unknownBuilding");
        if (team !== undefined && this.team[bs] !== team)
            return this.rej("notOwner");
        const q = this.prod.get(buildingId);
        const i = index < 0 && q ? q.items.length - 1 : index;
        if (!q || !Number.isInteger(i) || i < 0 || i >= q.items.length)
            return this.rej("badQueueIndex");
        const it = q.items[i];
        let ro = 0, rg = 0;
        if (i === 0) {
            if (q.started) {
                ro = this.d.tCostOre[it.type] * pr.cancelRefund;
                rg = this.d.tCostGas[it.type] * pr.cancelRefund;
                this.ore[this.team[bs]] += ro;
                this.gas[this.team[bs]] += rg;
            }
            q.progress = 0;
            q.started = false;
            q.hold = exports.HOLD_NONE;
        }
        q.items.splice(i, 1);
        this.events.push(events_ts_1.EV.QUEUE, this.tick, this.team[bs], buildingId, it.type, q.items.length, 0, ro, rg, 2);
        return { ok: true };
    }
    /** Rally point of a production building (doc 10: finished units drive there); null clears it. */
    setRallyPoint(buildingId, point, team) {
        const d = this.d;
        if (!d.production)
            return this.rej("productionOff");
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return this.rej("matchOver");
        const bs = this.idToSlot.get(buildingId);
        if (bs === undefined || !this.alive[bs] || !d.tStructure[this.etype[bs]])
            return this.rej("unknownBuilding");
        if (team !== undefined && this.team[bs] !== team)
            return this.rej("notOwner");
        if (d.tProduces[this.etype[bs]].length === 0)
            return this.rej("notProducer");
        let q = this.prod.get(buildingId);
        if (!q) {
            q = { building: buildingId, items: [], progress: 0, started: false, hold: exports.HOLD_NONE, rallyX: 0, rallyZ: 0, rally: false };
            this.prod.set(buildingId, q);
            this.sortProd();
        }
        if (point) {
            if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]))
                throw new Error("rally point must be finite");
            q.rally = true;
            q.rallyX = this.clampMap(point[0]);
            q.rallyZ = this.clampMap(point[1]);
        }
        else {
            q.rally = false;
            q.rallyX = 0;
            q.rallyZ = 0;
        }
        return { ok: true };
    }
    /** Keeps prod in ascending building id (deterministic iteration and export). */
    sortProd() {
        const keys = Array.from(this.prod.keys());
        let sorted = true;
        for (let i = 1; i < keys.length; i++)
            if (keys[i] < keys[i - 1])
                sorted = false;
        if (sorted)
            return;
        const m = new Map();
        for (const k of keys.sort((a, b) => a - b))
            m.set(k, this.prod.get(k));
        this.prod = m;
    }
    /** One tick of every production queue (step phase 11). */
    productionStep() {
        const d = this.d, pr = d.production;
        if (!pr || this.prod.size === 0)
            return;
        for (const q of this.prod.values()) {
            if (q.items.length === 0)
                continue;
            const bs = this.idToSlot.get(q.building);
            if (bs === undefined)
                continue;
            const team = this.team[bs], it = q.items[0], t = it.type;
            if (this.con && this.con.underConstruction(q.building))
                continue;
            // strategic points: production (start, progress, roll-out) only on a supplied point
            if (this.pts && this.pts.cores.size && this.pts.coreDisabled(this.eid[bs], this.tick)) {
                q.hold = exports.HOLD_CORE_DISABLED;
                continue;
            }
            if (this.pts && !this.pts.structureSupplied(this, bs)) {
                q.hold = exports.HOLD_UNSUPPLIED;
                continue;
            }
            // DQ-8 (minimal): an eliminated team (no Core left: no supply source) produces nothing more
            if (this.match && (this.match.eliminated >> team) & 1) {
                q.hold = exports.HOLD_UNSUPPLIED;
                continue;
            }
            if (!q.started) {
                if (!this.tierOpen(team, d.tTier[t])) {
                    q.hold = exports.HOLD_TIER;
                    continue;
                }
                const co = d.tCostOre[t], cg = d.tCostGas[t];
                if (this.ore[team] + 1e-9 < co || this.gas[team] + 1e-9 < cg) {
                    q.hold = exports.HOLD_RESOURCES;
                    continue;
                }
                this.ore[team] -= co;
                this.gas[team] -= cg; // doc 10: paid when the item starts
                q.started = true;
                q.hold = exports.HOLD_NONE;
                q.progress = 0;
                this.events.push(events_ts_1.EV.QUEUE, this.tick, team, q.building, t, q.items.length, 0, co, cg, 1);
            }
            if (this.cheat !== null && (this.cheat.instant >> team) & 1)
                q.progress = this.buildTicks(t); // D1 test cheat: instant production
            if (q.progress < this.buildTicks(t)) {
                if (this.eco2 && !this.eco2.prodAdvance(this, bs))
                    continue;
                q.progress++;
                if (q.progress < this.buildTicks(t))
                    continue;
            } // w2b: underpowered = half speed
            // finished: roll out in front of the building, if the unit caps allow (trySpawnUnit's rules); short of pilots it
            // still rolls out, uncrewed or partly crewed (S14, pilotpool.ts)
            const off = d.tRadius[this.etype[bs]] + d.tRadius[t] + pr.rollOutGap;
            const x = this.x[bs] + this.dirX[bs] * off, z = this.z[bs] + this.dirZ[bs] * off;
            // entity storage at maxCapacity: the finished item waits (the unit and its crew's bodies are never half-spawned)
            if (this.slotsLeft() < d.tSquadSize[t]) {
                q.hold = exports.HOLD_CAPACITY;
                continue;
            }
            // ruling 65: an infantry squad over the Barracks cap waits (a Barracks lost since it was queued); squads already out are kept
            if (this.isInfantrySquad(t) && this.infantrySquads(team) >= this.infantryCap(team)) {
                q.hold = exports.HOLD_BARRACKS_CAP;
                continue;
            }
            // fix-qa2 (reserve.ts): into the reserve by choice (reserve mode) or when the field is full, if it has room
            // ruling 84 (fix-t1-ai): the enemy commander does not use the reserve: an AI team's finished item waits as before
            if (this.resRules !== null && this.resRules.droppable[t] && !(this.match !== null && this.match.isAi(team)) && ((this.res !== null && this.res.mode.has(q.building)) || this.spawnRefusal(t, team) !== null) && this.resState().hasRoom(this, team)) {
                this.res.store(this, team, t, q.building);
                q.items.shift();
                q.progress = 0;
                q.started = false;
                q.hold = exports.HOLD_NONE;
                this.stats.unitsProduced++;
                continue;
            }
            const r = this.trySpawnUnit(d.typeIds[t], team, x, z, { building: q.building });
            if (!r.ok) {
                q.hold = r.reason === "mapCap" ? exports.HOLD_MAP_CAP : exports.HOLD_HOST_CAP;
                continue;
            }
            if (q.rally) {
                this.mineOrdering = true;
                this.order(r.ids, { type: "move", x: q.rallyX, z: q.rallyZ });
                this.mineOrdering = false;
            } // a produced harvester still joins the mining loop
            q.items.shift();
            q.progress = 0;
            q.started = false;
            q.hold = exports.HOLD_NONE;
            this.stats.unitsProduced++;
            this.events.push(events_ts_1.EV.PRODUCED, this.tick, team, q.building, r.ids[0], t, r.squadId, 0, 0, 0);
        }
    }
    // =================================================================== tick
    step() {
        const c = this.d.constants;
        const clk = this.phaseClock, pm = this.phaseMs;
        let tp = clk ? clk() : 0;
        this.tick++;
        const tick = this.tick;
        this.recordHist();
        const serial0 = this.events.next; // QA1 bug 1: progression scans this step's events only
        if (this.orderEvents.length)
            this.orderEvents = [];
        if (this.weather !== null) {
            this.weather.update(tick);
            this.weather.events(tick, this.wxEmit);
            if (this.weather.e.grounded || (this.s15 !== null && this.s15.ashDown.size > 0))
                (0, s15_ts_1.ashStep)(this);
        } // wave 2 D weather; ruling 67 ash fall
        // 1. tick-stamped inputs (rejections are recorded in orderEvents)
        while (this.pending.length > 0 && this.pending[0].tick <= tick) {
            const inp = this.pending.shift();
            const r = this.order(inp.ids, inp.order, inp.team === NO_TEAM ? undefined : inp.team);
            for (const x of r.rejected) {
                this.orderEvents.push({ tick, seq: inp.seq, id: x.id, reason: x.reason });
                const xs = this.idToSlot.get(x.id);
                this.events.push(events_ts_1.EV.REJECT, tick, inp.team !== NO_TEAM ? inp.team : xs !== undefined ? this.team[xs] : NO_TEAM, inp.seq, x.id, reasonCode(x.reason), 0, 0, 0, 0);
            }
        }
        while (this.pendingAct.length > 0 && this.pendingAct[0].tick <= tick)
            this.applyAction(this.pendingAct.shift());
        while (this.pendingCtl.length > 0 && this.pendingCtl[0].tick <= tick)
            this.applyControl(this.pendingCtl.shift());
        while (this.pendingPilotCtl.length > 0 && this.pendingPilotCtl[0].tick <= tick)
            this.applyPilotControl(this.pendingPilotCtl.shift());
        if (this.d.crewOn && this.pilots.size > 0)
            (0, s15_ts_1.idleStep)(this); // ruling 73: idle player pilots on foot drop prone (s15.ts)
        // 1a. s6: structures placed or destroyed since the last tick change the navigation grid
        if (this.nav)
            this.nav.sync(this);
        // 1b. s5 orders (orders.ts): end finished ones, steer guard / defend / follow (nothing to do while there are none)
        if (this.ord.ext.size || this.ord.hold.size)
            this.thinkOrders(tick);
        if (this.uai !== null && this.tlayer !== null)
            (0, unit_ai_ts_1.unitAiCover)(this, this.uai); // w3b: idle infantry under fire take cover
        if (this.bg !== null)
            (0, battlegroups_ts_1.groupsStep)(this); // w3b battle group lieutenants, auto-defend
        // 2. live list (ascending slot), start-of-tick positions, grids
        let n = 0;
        for (let s = 0; s < this.hi; s++)
            if (this.alive[s])
                this.live[n++] = s;
        this.nLive = n;
        for (let k = 0; k < n; k++) {
            const s = this.live[k];
            this.px[s] = this.x[s];
            this.pz[s] = this.z[s];
        }
        this.fine.rebuild(this.live, n, this.px, this.pz);
        this.coarse.rebuild(this.live, n, this.px, this.pz);
        if (clk) {
            const t = clk();
            pm[0] += t - tp;
            tp = t;
        }
        // 3. detection sweeps, staggered by slot
        const di = c.detectionIntervalTicks;
        let nSweep = 0, nAcq = 0;
        // T1 fairness: the stagger phase is a hash of the entity id with the seed, not the slot (slot order follows the
        // spawn order, so one team always swept, scanned and fired a tick or more ahead of the other in a mirror)
        for (let k = 0; k < n; k++) {
            const s = this.live[k];
            if ((tick + this.phaseOf(s)) % di === 0) {
                this.sensorSweep(s);
                nSweep++;
            }
        }
        nSweep += this.pointSweeps(tick, di);
        if (this.cheat !== null)
            (0, cheats_ts_1.cheatStep)(this, tick + c.lostAfterTicks); // D1 test cheats: reveal map, god mode top-up
        if (clk) {
            const t = clk();
            pm[1] += t - tp;
            tp = t;
        }
        // 4. targeting: staggered scan, or at once when a target became invalid
        const ti = c.targetingIntervalTicks;
        for (let k = 0; k < n; k++) {
            const s = this.live[k];
            if (this.mCount[s] === 0 || (this.ctlOn[s] && this.ctlMask[s] === 0))
                continue; // controlled units (whole-entity control) do not auto-target
            const U = this.uai;
            const ph = tick + this.phaseOf(s);
            if (U === null ? ph % ti === 0 || !this.targetsValid(s)
                : ph % U.scanTicks[this.team[s] & 3] === 0 || (ph % U.reactTicks[this.team[s] & 3] === 0 && !this.targetsValid(s))) {
                this.acquireTargets(s);
                nAcq++;
            } // w3b: scan / reaction by difficulty
        }
        if (clk) {
            const t = clk();
            pm[2] += t - tp;
            tp = t;
            this.phaseN[0] = nSweep;
            this.phaseN[1] = nAcq;
            this.phaseN[2] = this.pN;
        }
        // 5. movement and facing (s6: queued path requests are answered first, within the tick's budget)
        if (this.nav)
            this.nav.service();
        if (this.mine)
            this.mine.lanes(this); // q1: dock-lane membership for the separation exemption
        const emp = this.calls !== null && this.calls.effects.length > 0; // w2a EMP burst: disabled vehicles neither move nor fire
        for (let k = 0; k < n; k++) {
            const s = this.live[k];
            if (this.d.tStructure[this.etype[s]])
                continue;
            if (this.s15 !== null && this.s15.empFall.size > 0 && this.s15.empFall.has(this.eid[s])) {
                this.empFall(s);
                continue;
            } // ruling 71: still falling
            if (emp && this.empd(s)) {
                if (this.d.tAir[this.etype[s]] && this.flyAlt[s] > 0) {
                    this.s15State().empFall.set(this.eid[s], [0]);
                    this.empFall(s);
                } // ruling 71: an EMP'd aircraft in flight falls
                else {
                    this.velX[s] = 0;
                    this.velZ[s] = 0;
                }
                continue;
            }
            this.moveUnit(s);
        }
        if (this.pickupArrived.length)
            this.pickupHandOver();
        if (this.tp)
            (0, transport_ts_1.tpPin)(this); // w2e: sling loads follow their lifter
        if (clk) {
            const t = clk();
            pm[3] += t - tp;
            tp = t;
        }
        // 6. weapons
        // T1: simultaneous resolution (see simul): every unit fires from the start-of-phase state; deaths wait for removeDead
        this.simul = true;
        this.dying0 = this.nDying;
        for (let k = 0; k < n; k++)
            if (!(emp && this.empd(this.live[k])))
                this.fireWeapons(this.live[k]);
        if (clk) {
            const t = clk();
            pm[4] += t - tp;
            tp = t;
        }
        // 7. projectiles (swept collision)
        this.updateProjectiles();
        this.simul = false;
        if (clk) {
            const t = clk();
            pm[5] += t - tp;
            tp = t;
        }
        // 7b. support calls (s10, calls.ts): beacons whose delay ran out land now (nothing to do while there are none)
        // QA3-14: after MATCH_OVER nothing inbound lands and running effects (barrage shells, mines, EMP, ...) do no more:
        // calls freeze where they are, as orders, production and new calls are refused
        if (this.calls && (this.calls.beacons.length || this.calls.effects.length || this.calls.thrown.length) && !(this.match && this.match.phase === match_ts_1.MP_OVER))
            this.callStep();
        if (this.kit && this.kit.charges.length)
            (0, pilotkit_ts_1.kitDetonate)(this); // S12 demo charges (pilotkit.ts)
        if (this.envOn) { // wave 2 D: lava (terrain layer); pilots outside in a solar flare
            (0, env_ts_1.envLavaStep)(this, this.live, n, this.envHurt);
            const wd = this.weather !== null ? this.weather.e.pilotDps * this.d.dt : 0;
            if (wd > 0)
                for (let k = 0; k < n; k++) {
                    const s = this.live[k];
                    if (this.alive[s] && this.slotPilot[s] !== 0 && this.hp[s] > 0)
                        this.envDamage(s, wd);
                }
        }
        // 8. hull-critical windows (crewed vehicles at zero hull: AI eject roll, destruction at the end), then deaths
        if (this.d.crewOn)
            this.criticalStep(n);
        this.removeDead();
        // 9. shields: pilot regeneration (constants.pilot.shieldRegen*) and vehicle recharge (constants.vehicleShield,
        // ruling 15; not buildings), each after its delay since the last damage
        const wxr = this.weather === null ? 1 : this.weather.e.shieldsOff ? 0 : this.weather.e.shieldRegen; // wave 2 D: solar flare, electrical storm
        if (this.weather !== null && this.weather.e.shieldsOff)
            for (let k = 0; k < n; k++) {
                const s = this.live[k];
                if (this.shield[s] > 0)
                    this.shield[s] = 0;
            } // ruling 68: a solar flare takes ALL shields down (they recharge as usual afterwards)
        const regen = c.pilotRegenPerTick * wxr, vfrac = c.vehShieldFracPerTick * wxr, bfrac = c.bldShieldFracPerTick * wxr;
        if (regen > 0 || vfrac > 0 || bfrac > 0) {
            const delay = c.pilotRegenDelayTicks, vdelay = c.vehShieldDelayTicks, d = this.d;
            for (let k = 0; k < n; k++) {
                const s = this.live[k], t = this.etype[s];
                const max = d.tShield[t];
                if (!this.alive[s] || this.shield[s] >= max || this.hp[s] <= 0)
                    continue;
                if (emp && !d.tPilot[t] && this.empd(s))
                    continue; // w2a EMP: no shield recharge
                if (d.tPilot[t]) {
                    if (regen > 0 && tick - this.lastHit[s] >= delay) {
                        const v = this.shield[s] + regen;
                        this.shield[s] = v > max ? max : v;
                    }
                }
                else if (vfrac > 0 && d.tVehicle[t] && tick - this.lastHit[s] >= vdelay) {
                    const v = this.shield[s] + max * vfrac;
                    this.shield[s] = v > max ? max : v;
                }
                // s8: building shields (the Command Core's) regenerate after their delay, only on a supplied point (doc 6: cut-off shields decay)
                else if (bfrac > 0 && d.tStructure[t] && tick - this.lastHit[s] >= c.bldShieldDelayTicks && (!this.pts || this.pts.structureSupplied(this, s))) {
                    const v = this.shield[s] + max * bfrac;
                    this.shield[s] = v > max ? max : v;
                }
            }
        }
        // 10. production queues, pilots (respawn, seat slides, energy refill, AI pilots reaching home)
        if (this.pts)
            this.pts.step(this);
        if (this.con)
            this.con.step(this);
        if (this.mine)
            this.mine.step(this);
        if (this.eco2)
            this.eco2.step(this);
        if (this.sp)
            this.sp.step(this);
        if (this.d.crewOn && this.pilots.size > 0)
            this.bunkerStep(); // B1: bunker mounts follow the point's level
        this.bunkerGarrisonStep(); // ruling 104: garrisons man bunker guns
        if (this.bfx)
            this.bfx.step(this); // fix-qa2 building effects (domes, manned towers, upgrades)
        if (this.res)
            this.res.step(this); // fix-qa2 reserve: drops landing, recalls
        this.productionStep();
        if (this.pool)
            this.pool.step(this); // S14: vehicles produced short of pilots are crewed at a pilot home
        if (this.tp)
            (0, transport_ts_1.tpStep)(this); // w2e transports: boarding, unloading, sling pick-ups (transport.ts)
        if (this.d.crewOn)
            this.pilotStep();
        if (this.s15 !== null)
            (0, s15_ts_1.ammoStep)(this); // ruling 55: aircraft rearm at pads (s15.ts)
        // 11. match (s7): judge after a Command Core died; the enemy commander decides on its slow tick
        if (this.match) {
            if (this.match.coreDied)
                this.judgeMatch();
            if (this.match.objectives && this.match.phase !== match_ts_1.MP_OVER && this.tick % c.tickRate === 0)
                this.objectivesStep(); // s13
            if (this.ai && this.match.phase !== match_ts_1.MP_OVER)
                this.ai.step(this);
        }
        if (this.progRules && this.match)
            (0, progression_ts_1.progStep)(this, serial0); // w2e: battle record from the events; results at MATCH_OVER
        if (clk) {
            const t = clk();
            pm[6] += t - tp;
        }
    }
    /** Bitmask of teams with a live Command Core. */
    coreTeams() {
        let m = 0;
        const tc = this.tCore;
        if (!tc)
            return 0;
        for (let s = 0; s < this.hi; s++)
            if (this.alive[s] && tc[this.etype[s]] && this.hp[s] > 0)
                m |= 1 << this.team[s];
        return m;
    }
    judgeMatch() {
        const M = this.match;
        if (M.judge(this.coreTeams(), this.tick)) {
            if (M.objectives)
                M.objectives.matchEnded(M.winner, this.objectiveEmit);
            this.events.push(events_ts_1.EV.MATCH_OVER, this.tick, M.winner < 0 ? NO_TEAM : M.winner, M.winner, M.eliminated, M.reason, 0, 0, 0, 0);
        }
    }
    /** s13: OBJECTIVE_* events (objectives.ts Emit). */
    objectiveEmit = (kind, index, type, team, permille, value, goal) => {
        this.events.push(kind === 0 ? events_ts_1.EV.OBJECTIVE_PROGRESS : kind === 1 ? events_ts_1.EV.OBJECTIVE_DONE : events_ts_1.EV.OBJECTIVE_FAILED, this.tick, team, index, type, team, permille, value, goal, 0);
    };
    /** s13: once per second: objectives; the primary may end the match (MATCH_OVER c = reason). */
    objectivesStep() {
        const M = this.match;
        if (M.evaluateObjectives(this, this.objectiveEmit))
            this.events.push(events_ts_1.EV.MATCH_OVER, this.tick, M.winner < 0 ? NO_TEAM : M.winner, M.winner, M.eliminated, M.reason, 0, 0, 0, 0);
    }
    /** Match state (null without match rules). */
    matchState() { return this.match ? this.match.view() : null; }
    // ------------------------------------------------------------ support calls (stage 2 s10, calls.ts; design doc 15)
    /** The call state, created on first use. */
    callState() {
        if (!this.callRules)
            throw new Error("support calls: the data has no supportCalls");
        if (!this.calls)
            this.calls = new calls_ts_1.Calls(this.callRules);
        return this.calls;
    }
    /** Index of call id in supportCalls.calls (-1 unknown). */
    callIndex(callId) { return this.callRules ? this.callRules.ids.indexOf(callId) : -1; }
    /**
     * Call indices pilot pilotId can use: its loadout (the data's sim.defaultLoadout until setCallLoadout changes it), then
     * ruling 133's fixed calls (sim.fixedCalls: slot 5 ANTI-ARMOUR, the Rocket tube drop), which every player pilot has.
     */
    callLoadout(pilotId) {
        const R = this.callRules;
        if (!R)
            return [];
        const c = this.calls?.callers.get(pilotId);
        const l = (c && c.loadout ? c.loadout : R.defaultLoadout).slice();
        for (const f of R.fixed)
            if (!l.includes(f))
                l.push(f);
        return l;
    }
    /** Sets a player pilot's loadout (lobby / pre-mission; at most supportCalls.loadoutSize distinct calls). Immediate. */
    setCallLoadout(pilotId, callIds, team) {
        const R = this.callRules;
        if (!R)
            return this.rej("unknownCall");
        const p = this.pilots.get(pilotId);
        if (!p || p.player < 0)
            return this.rej(p ? "notPlayerPilot" : "unknownPilot");
        if (team !== undefined && p.team !== team)
            return this.rej("notOwner");
        const idx = callIds.map((id) => R.ids.indexOf(id)).filter((i) => !R.fixed.includes(i)); // ruling 133: the fixed slot is not chosen (ignored when sent)
        if (idx.length > this.callSlots(pilotId) || idx.some((i) => i < 0) || new Set(idx).size !== idx.length)
            return this.rej("badLoadout");
        this.callState().caller(pilotId).loadout = idx;
        return { ok: true };
    }
    /**
     * w2a: tick-stamped loadout change in the match (ACT_LOADOUT; doc 15 "brings up to 3 support calls into a mission"):
     * allowed while the pilot is dead (before it deploys again) or on foot within the crew refill radius of a live,
     * supplied friendly pilot respawn building (Barracks, Command Core). Refusals: loadoutNotAtBase, badLoadout and the
     * setCallLoadout ones. Cooldowns are per call and are kept. Returns the seq.
     */
    queueSetLoadout(tick, pilotId, callIds, team) {
        if (!Array.isArray(callIds))
            return this.refuseInput(exports.ACT_LOADOUT, pilotId, team); // QA1 bug 8
        let b = 0;
        for (let k = callIds.length - 1; k >= 0; k--) {
            const ci = this.callIndex(callIds[k]);
            b = b * 32 + (ci >= 0 && ci < 31 ? ci + 1 : 31);
        }
        return this.queueAct(tick, exports.ACT_LOADOUT, team, pilotId, b, callIds.length);
    }
    /** Why pilot pilotId may not change its loadout now (null: it may). */
    loadoutAtBase(pilotId, team) {
        const p = this.pilots.get(pilotId);
        if (!p || p.player < 0 || (team !== undefined && p.team !== team))
            return null; // setCallLoadout gives the reason
        if (p.state === exports.P_DEAD)
            return null;
        const s = p.state === exports.P_FOOT ? this.idToSlot.get(p.entity) : undefined, cr = this.d.crew;
        if (s !== undefined && cr) {
            const r2 = cr.refillRadius * cr.refillRadius;
            for (let k = 0; k < this.hi; k++) {
                if (!this.alive[k] || this.team[k] !== p.team || !this.d.tRespawnPoint[this.etype[k]] || this.hp[k] <= 0)
                    continue;
                if (this.pts && !this.pts.structureSupplied(this, k))
                    continue;
                const dx = this.x[k] - this.x[s], dz = this.z[k] - this.z[s], lim = Math.sqrt(r2) + this.d.tRadius[this.etype[k]];
                if (dx * dx + dz * dz <= lim * lim)
                    return null;
            }
        }
        return this.rej("loadoutNotAtBase");
    }
    /**
     * w2a: loadout slots of pilot pilotId (doc 16: a third call at rank 5; the sim has no ranks, so the host sets it:
     * supportCalls.startingLoadoutSlots .. loadoutSize). Default (never set): loadoutSize. Immediate; does not shorten a
     * loadout already chosen (it applies to the next change).
     */
    setCallSlots(pilotId, slots) {
        const R = this.callRules;
        if (!R)
            return this.rej("unknownCall");
        const p = this.pilots.get(pilotId);
        if (!p || p.player < 0)
            return this.rej(p ? "notPlayerPilot" : "unknownPilot");
        if (!Number.isInteger(slots) || slots < 0 || slots > R.loadoutSize)
            return this.rej("badLoadout");
        this.callState().caller(pilotId).slots = slots;
        return { ok: true };
    }
    /** Loadout slots of pilot pilotId. */
    callSlots(pilotId) { const R = this.callRules; if (!R)
        return 0; const c = this.calls?.callers.get(pilotId); return c && c.slots >= 0 ? c.slots : R.loadoutSize; }
    /** w2a: uses left before the rearm of an air call (usesBeforeRearm - uses since the last rearm; 0 for other calls). */
    callUsesLeft(pilotId, ci) {
        const R = this.callRules;
        if (!R || ci < 0 || ci >= R.calls.length || R.calls[ci].uses <= 0)
            return 0;
        const c = this.calls?.callers.get(pilotId);
        return R.calls[ci].uses - (c ? c.uses[ci] : 0);
    }
    /** w2a: caller record id of team's enemy commander (negative: never a pilot id). */
    static commanderCaller(team) { return -1 - team; }
    /** w2a: tick-stamped enemy-commander support call (ACT_CMD_CALL; enemy-ai.ts). */
    queueCommanderCall(tick, team, callId, x, z) {
        return this.queueAct(tick, exports.ACT_CMD_CALL, team, team, this.callIndex(callId), 0, x, z);
    }
    /**
     * w2a: why team's enemy commander cannot use call ci now (null: it can). Same rules as a pilot's call (cooldown and
     * in-progress per caller record, requirements, atmosphere) without the loadout, the throw range or a body: the
     * commander designates any spot; its caller record is Sim.commanderCaller(team).
     */
    commanderCallRefusal(team, ci) {
        const R = this.callRules;
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return "matchOver";
        if (!R || !(Number.isInteger(ci) && ci >= 0 && ci < R.calls.length))
            return "unknownCall";
        if (!this.match || !this.match.isAi(team))
            return "notOwner";
        const def = R.calls[ci], cid = Sim.commanderCaller(team);
        if (def.fx === calls_ts_1.CALL_FX_NONE)
            return "notImplemented";
        if (this.calls && this.calls.inProgress(cid, ci))
            return "callInProgress";
        const cs = this.calls?.callers.get(cid);
        if (cs && cs.ready[ci] > this.tick)
            return "callCooldown";
        if (def.needsAtmosphere && this.d.airless)
            return "callRequirement";
        if (this.weather !== null) { // wave 2 D, as for a pilot's call: ash fall grounds aircraft, a solar flare blocks orbital calls
            if (def.category === "air" && this.weather.e.grounded)
                return "weatherGrounded";
            if (def.category === "orbital" && this.weather.e.orbitalOff)
                return "weatherOrbital";
        }
        for (const bt of def.reqTypes) {
            let ok = false;
            for (let s = 0; s < this.hi && !ok; s++)
                if (this.alive[s] && this.etype[s] === bt && this.team[s] === team && this.hp[s] > 0 && (!this.pts || this.pts.structureSupplied(this, s)))
                    ok = true;
            if (!ok)
                return "callRequirement";
        }
        if (def.fx === calls_ts_1.CALL_FX_DROP || def.fx === calls_ts_1.CALL_FX_POD)
            return "notImplemented"; // the commander has no pilots to deliver to
        return null;
    }
    /**
     * QA3-1: why a call ci by team cannot land at (x, z) (null: it can). One check for every caller (pilot callIn and the
     * enemy commander's commanderCall): air calls are blocked near an enemy Missile Battery (blockedBy.air; s13
     * destroyAntiAir lifts it for that half), orbital calls inside an enemy jammer's radius (blockedBy.orbital).
     */
    callTargetRefusal(team, ci, x, z) {
        const R = this.callRules;
        if (!R || !(Number.isInteger(ci) && ci >= 0 && ci < R.calls.length))
            return "unknownCall";
        const def = R.calls[ci];
        // s13 destroyAntiAir: once done, enemy batteries on that half no longer block the team's air calls
        if (def.category === "air" && R.aaType >= 0 && R.aaRange > 0 && !this.match?.objectives?.airCallsUnlocked(team, x, this.mapSize)) {
            const r2 = R.aaRange * R.aaRange;
            for (let k = 0; k < this.hi; k++) {
                if (!this.alive[k] || this.etype[k] !== R.aaType || this.team[k] === team || this.hp[k] <= 0)
                    continue;
                if (this.con && this.con.underConstruction(this.eid[k]))
                    continue;
                const ax = this.x[k] - x, az = this.z[k] - z;
                if (ax * ax + az * az <= r2)
                    return "callBlocked";
            }
        }
        if (def.category === "orbital" && (0, stealth_ts_1.orbitalJammed)(this, team, x, z))
            return "callJammed"; // w2f: enemy jammers block orbital calls (doc 15)
        return null;
    }
    commanderCall(team, ci, x, z) {
        const why = this.commanderCallRefusal(team, ci) ?? this.callTargetRefusal(team, ci, this.clampMap(x), this.clampMap(z));
        if (why)
            return this.rej(why);
        const C = this.callState(), def = C.rules.calls[ci], cid = Sim.commanderCaller(team);
        C.caller(cid);
        x = this.clampMap(x);
        z = this.clampMap(z);
        let dx = this.mapSize / 2 - x, dz = this.mapSize / 2 - z;
        const l = Math.sqrt(dx * dx + dz * dz);
        if (l > 1e-6) {
            dx /= l;
            dz /= l;
        }
        else {
            dx = 1;
            dz = 0;
        }
        const id = C.nextBeacon++, impact = this.tick + Math.max(1, def.delayTicks);
        C.beacons.push({ id, call: ci, team, caller: cid, x, z, queuedTick: this.tick, impactTick: impact, flags: 0, dx, dz, opt: 0, y: 0, att: 0, ox: 0, oy: 0, oz: 0 });
        this.events.push(events_ts_1.EV.CALL_QUEUED, this.tick, team, id, cid, ci, impact - this.tick, x, z, 0);
        return { ok: true, ids: [id] };
    }
    /** Tick-stamped support call: pilot pilotId marks (x, z) for call callId. Refusals: CALL_REFUSED event and orderEvents. Returns the seq. */
    queueCall(tick, pilotId, callId, x, z, team, opts) {
        return this.queueAct(tick, exports.ACT_CALL, team, pilotId, this.callIndex(callId), callOptionCode(opts), x, z);
    }
    /**
     * Why pilot pilotId could not call call index ci now, ignoring the target (null: available). Order of checks: match
     * over, unknown call, pilot, loadout, not implemented, in progress, cooldown, requirement.
     */
    callRefusal(pilotId, ci, team) {
        const R = this.callRules;
        if (this.match && this.match.phase === match_ts_1.MP_OVER)
            return "matchOver";
        if (!R || !(Number.isInteger(ci) && ci >= 0 && ci < R.calls.length))
            return "unknownCall";
        const p = this.pilots.get(pilotId);
        if (!p)
            return "unknownPilot";
        if (p.player < 0)
            return "notPlayerPilot";
        if (team !== undefined && p.team !== team)
            return "notOwner";
        if (p.state === exports.P_DEAD)
            return "callerDown";
        if (!this.callLoadout(pilotId).includes(ci))
            return "notInLoadout";
        const def = R.calls[ci];
        if (def.fx === calls_ts_1.CALL_FX_NONE)
            return "notImplemented";
        if (def.fx === calls_ts_1.CALL_FX_DROP && def.fromReserve > 0 && this.resRules && this.reserveVehicle(p.team) < 0 && !this.dropBuildable(p.team, def.unitType))
            return "callHidden"; // rulings 57 / 60
        if (this.fkit && def.fx === calls_ts_1.CALL_FX_DROP) { // Frontline: one dropped vehicle per player alive at a time
            const v = this.fkit.dropped.get(pilotId), vs = v !== undefined ? this.idToSlot.get(v) : undefined;
            if (vs !== undefined && this.alive[vs] && this.hp[vs] > 0 && this.team[vs] === p.team)
                return "vehicleAlive";
        }
        const cs = this.calls?.callers.get(pilotId);
        if (this.calls && this.calls.inProgress(pilotId, ci))
            return "callInProgress";
        if (cs && cs.ready[ci] > this.tick)
            return "callCooldown";
        if (def.needsAtmosphere && this.d.airless)
            return "callRequirement";
        if (this.weather !== null) { // wave 2 D: ash fall grounds aircraft, a solar flare blocks orbital calls
            if (def.category === "air" && this.weather.e.grounded)
                return "weatherGrounded";
            if (def.category === "orbital" && this.weather.e.orbitalOff)
                return "weatherOrbital";
        }
        for (const bt of def.reqTypes) {
            let ok = false;
            for (let s = 0; s < this.hi && !ok; s++)
                if (this.alive[s] && this.etype[s] === bt && this.team[s] === p.team && this.hp[s] > 0 && (!this.pts || this.pts.structureSupplied(this, s)))
                    ok = true;
            if (!ok)
                return "callRequirement";
        }
        if (def.fx === calls_ts_1.CALL_FX_DROP && def.fromReserve > 0 && this.resRules) { // fix-qa2 (ruling 18): Vehicle drop = one vehicle from the squad's reserve
            // rulings 57 / 60: a reserve vehicle first; else one the team can build now (a producer and the cost: built and
            // dropped at its normal cost); else the call is not shown at all (callHidden; checked before cooldown and the rest)
            const k = this.reserveVehicle(p.team);
            const t = k >= 0 ? this.res.entries[p.team][k].type : def.unitType;
            if (this.spawnRefusal(t, p.team) !== null || this.slotsLeft() < this.d.tSquadSize[t])
                return "callOverBudget";
            return null;
        }
        if (def.fx === calls_ts_1.CALL_FX_DROP && (this.spawnRefusal(def.unitType, p.team) !== null || this.slotsLeft() < this.d.tSquadSize[def.unitType]))
            return "callOverBudget";
        return null;
    }
    /** callRefusal as a wire code (0 = available). */
    callRefusalCode(pilotId, ci) { const r = this.callRefusal(pilotId, ci); return r ? reasonCode(r) : 0; }
    /** Tick the call is ready again for the pilot (0: no cooldown recorded). */
    callReadyTick(pilotId, ci) { const c = this.calls?.callers.get(pilotId); return c && ci >= 0 && ci < c.ready.length ? c.ready[ci] : 0; }
    /** Immediate support call (queueCall applies this at its tick). */
    callIn(pilotId, ci, x, z, team, code = 0) {
        const why = this.callRefusal(pilotId, ci, team);
        if (why)
            return this.rej(why);
        const R = this.callRules, p = this.pilots.get(pilotId), def = R.calls[ci];
        // w2a ACT_CALL c (callOptionCode): >= 8 aim yaw + 8 (line calls run along it instead of the throw direction), 1-7 option + 1
        const opt = code >= 1 && code < 8 ? Math.floor(code) - 1 : 0;
        if (def.fx === calls_ts_1.CALL_FX_POD && opt >= def.choices.length)
            return this.rej("badCallOption");
        const s = p.state === exports.P_FOOT ? this.idToSlot.get(p.entity) : this.idToSlot.get(p.vehicle);
        if (s === undefined)
            return this.rej("callerDown");
        const range = p.state === exports.P_FOOT ? R.throwRange : R.designatorRange;
        const dx = x - this.x[s], dz = z - this.z[s];
        if (dx * dx + dz * dz > range * range)
            return this.rej("callOutOfRange");
        const tr = this.callTargetRefusal(p.team, ci, x, z);
        if (tr)
            return this.rej(tr);
        const C = this.callState();
        C.caller(pilotId);
        let tx = x - this.x[s], tz = z - this.z[s];
        const tl = Math.sqrt(tx * tx + tz * tz);
        if (tl > 1e-6) {
            tx /= tl;
            tz /= tl;
        }
        else {
            tx = this.dirX[s];
            tz = this.dirZ[s];
        }
        if (code >= 8) {
            tx = (0, fmath_ts_1.dcos)(code - 8);
            tz = (0, fmath_ts_1.dsin)(code - 8);
        }
        const id = this.placeBeacon(C.nextBeacon++, ci, p.team, pilotId, this.clampMap(x), this.clampMap(z), tx, tz, opt, 0, -1, 0, 0, 0, 0);
        return { ok: true, ids: [id] };
    }
    /**
     * Puts down a pending beacon (callIn, or a thrown beacon that settled) and sends CALL_QUEUED: the call's delay starts
     * now. A beacon on the ground merges with a pending one of the same call and team within the call's radius
     * (beaconsMerge). flags0 CF_THROWN: y is its height, att the entity it sticks to (offset ox / oy / oz). Returns the id.
     */
    placeBeacon(id, ci, team, caller, x, z, tx, tz, opt, flags0, y, att, ox, oy, oz) {
        const C = this.calls, R = C.rules, def = R.calls[ci];
        let impact = this.tick + Math.max(1, def.delayTicks), flags = flags0;
        if (R.merge && def.radius > 0 && att === 0)
            for (const b of C.beacons) {
                if (b.call !== ci || b.team !== team || b.att !== 0)
                    continue;
                const ex = b.x - x, ez = b.z - z;
                if (ex * ex + ez * ez <= def.radius * def.radius) {
                    x = b.x;
                    z = b.z;
                    if (b.flags & calls_ts_1.CF_THROWN)
                        y = b.y;
                    impact = b.impactTick;
                    flags |= calls_ts_1.CF_MERGED;
                    break;
                }
            }
        C.beacons.push({ id, call: ci, team, caller, x, z, queuedTick: this.tick, impactTick: impact, flags, dx: tx, dz: tz, opt, y: y < 0 && !(flags & calls_ts_1.CF_THROWN) ? 0 : y, att, ox, oy, oz });
        this.events.push(events_ts_1.EV.CALL_QUEUED, this.tick, team, id, caller, ci, impact - this.tick, x, z, flags);
        return id;
    }
    /** Ruling 128: tick-stamped throw of a call beacon by a player pilot on foot (aim yaw / pitch in radians; opts.option: Heavy weapon pod weapon). Returns the seq. */
    queueThrowCall(tick, pilotId, callId, yaw, pitch, team, opts) {
        return this.queueAct(tick, exports.ACT_THROW_CALL, team, pilotId, this.callIndex(callId), callOptionCode(opts && opts.option !== undefined ? { option: opts.option } : undefined), yaw, pitch);
    }
    /**
     * Ruling 128: player pilot pilotId (on foot) throws the beacon of call ci from the hand along (yaw, pitch) at
     * beaconThrow.speedMetresPerSecond plus inheritVelocity of the body's velocity. The beacon flies, bounces and rolls
     * (thrownStep) and the call is committed (placeBeacon) where it settles; until then the call is in progress.
     */
    throwCall(pilotId, ci, yaw, pitch, team, code = 0) {
        const why = this.callRefusal(pilotId, ci, team);
        if (why)
            return this.rej(why);
        const R = this.callRules, T = R.throwing, p = this.pilots.get(pilotId), def = R.calls[ci];
        if (!T)
            return this.rej("notImplemented");
        if (p.state !== exports.P_FOOT)
            return this.rej("callNotOnFoot");
        const opt = code >= 1 && code < 8 ? Math.floor(code) - 1 : 0;
        if (def.fx === calls_ts_1.CALL_FX_POD && opt >= def.choices.length)
            return this.rej("badCallOption");
        const s = this.idToSlot.get(p.entity);
        if (s === undefined)
            return this.rej("callerDown");
        if (pitch > 1.5)
            pitch = 1.5;
        else if (pitch < -1.5)
            pitch = -1.5;
        const hx = (0, fmath_ts_1.dcos)(yaw), hz = (0, fmath_ts_1.dsin)(yaw), cp = (0, fmath_ts_1.dcos)(pitch), sp = (0, fmath_ts_1.dsin)(pitch), k = T.inherit;
        const C = this.callState();
        C.caller(pilotId);
        const x = this.clampMap(this.x[s] + hx * 0.3), z = this.clampMap(this.z[s] + hz * 0.3);
        const t = { id: C.nextBeacon++, call: ci, team: p.team, caller: pilotId, opt,
            x, y: Math.max(this.y[s] + T.hand, this.terrain.height(x, z) + T.radius), z,
            vx: hx * cp * T.speed + this.velX[s] * k, vy: sp * T.speed + (this.airborne[s] ? this.velY[s] * k : 0), vz: hz * cp * T.speed + this.velZ[s] * k,
            dx: hx, dz: hz, st: calls_ts_1.TB_FLY, bounces: 0, born: this.tick, src: 0, fired: 0 };
        C.thrown.push(t);
        this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, p.team, t.id, pilotId, ci, 0, t.x, t.z, calls_ts_1.CE_THROW);
        return { ok: true, ids: [t.id] };
    }
    /** Ruling 129: tick-stamped launch of a call beacon from the vehicle of a seated player pilot at (x, z). Returns the seq. */
    queueFireCall(tick, pilotId, callId, x, z, team, opts) {
        return this.queueAct(tick, exports.ACT_FIRE_CALL, team, pilotId, this.callIndex(callId), callOptionCode(opts && opts.option !== undefined ? { option: opts.option } : undefined), x, z);
    }
    /**
     * Ruling 129: a seated player pilot fires the beacon of call ci from the vehicle's roof (hull top) at ground point
     * (x, z) within sim.designatorRangeMetres: a ballistic arc (flight time 1 s + 1 s per 120 m, at most 3.5 s) that comes
     * down on the point; it flies as a thrown beacon (thrownStep) with a short bounce (fired), never sticks to its own
     * vehicle, and the call commits where it settles. Refusals as callIn (callOutOfRange beyond the range) plus
     * callNotSeated (196) for a pilot who is not in a vehicle seat.
     */
    fireCall(pilotId, ci, x, z, team, code = 0) {
        const why = this.callRefusal(pilotId, ci, team);
        if (why)
            return this.rej(why);
        const R = this.callRules, T = R.throwing, p = this.pilots.get(pilotId), def = R.calls[ci];
        if (!T)
            return this.rej("notImplemented");
        if (p.state !== exports.P_SEATED)
            return this.rej("callNotSeated");
        const opt = code >= 1 && code < 8 ? Math.floor(code) - 1 : 0;
        if (def.fx === calls_ts_1.CALL_FX_POD && opt >= def.choices.length)
            return this.rej("badCallOption");
        const s = this.idToSlot.get(p.vehicle);
        if (s === undefined)
            return this.rej("callerDown");
        x = this.clampMap(x);
        z = this.clampMap(z);
        const ex = x - this.x[s], ez = z - this.z[s], d = Math.sqrt(ex * ex + ez * ez);
        if (d > R.designatorRange)
            return this.rej("callOutOfRange");
        const br = this.d.tRadius[this.etype[s]], y0 = this.y[s] + 2 * br + 0.3, ty = this.terrain.height(x, z) + T.radius;
        const Tf = Math.min(3.5, 1 + d / 120), g = this.d.gravity;
        const hx = d > 1e-6 ? ex / d : this.dirX[s], hz = d > 1e-6 ? ez / d : this.dirZ[s];
        const C = this.callState();
        C.caller(pilotId);
        const t = { id: C.nextBeacon++, call: ci, team: p.team, caller: pilotId, opt,
            x: this.x[s], y: y0, z: this.z[s], vx: ex / Tf, vy: (ty - y0 + 0.5 * g * Tf * Tf) / Tf, vz: ez / Tf,
            dx: hx, dz: hz, st: calls_ts_1.TB_FLY, bounces: 0, born: this.tick, src: this.eid[s], fired: 1 };
        C.thrown.push(t);
        this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, p.team, t.id, pilotId, ci, this.eid[s], t.x, t.z, calls_ts_1.CE_FIRE);
        return { ok: true, ids: [t.id] };
    }
    /**
     * Ruling 128: thrown beacons move (two half steps a tick: gravity, terrain bounce along the ground normal with
     * restitution / impactFriction, rolling with rollDecel; a vehicle or structure (hit sphere radius >= 1 m, not in the
     * air) it touches holds it); a beacon at rest, stuck, or older than maxSeconds is committed (placeBeacon). Beacons
     * stuck to an entity ride with it; when it is gone they drop to the ground under it.
     */
    thrownStep() {
        const C = this.calls, T = C.rules.throwing, d = this.d, g = d.gravity;
        for (const b of C.beacons) {
            if (b.att === 0)
                continue;
            const s = this.idToSlot.get(b.att);
            if (s !== undefined && this.alive[s]) {
                b.x = this.clampMap(this.x[s] + b.ox);
                b.z = this.clampMap(this.z[s] + b.oz);
                b.y = this.y[s] + b.oy;
            }
            else {
                b.att = 0;
                b.y = this.terrain.height(b.x, b.z);
            }
        }
        if (!C.thrown.length || !T)
            return;
        const keep = [], h2 = d.dt / 2, r = T.radius, M = this.mapSize;
        for (const t of C.thrown) {
            let done = this.tick - t.born >= T.maxTicks, stick = -1;
            const ps = this.pilots.get(t.caller), body = t.src !== 0 ? t.src : ps && ps.state === exports.P_FOOT ? ps.entity : 0;
            for (let k = 0; k < 2 && !done; k++) {
                if (t.st === calls_ts_1.TB_FLY)
                    t.vy -= g * h2;
                t.x += t.vx * h2;
                t.y += t.vy * h2;
                t.z += t.vz * h2;
                if (t.x < 0) {
                    t.x = 0;
                    t.vx = 0;
                }
                else if (t.x > M) {
                    t.x = M;
                    t.vx = 0;
                }
                if (t.z < 0) {
                    t.z = 0;
                    t.vz = 0;
                }
                else if (t.z > M) {
                    t.z = M;
                    t.vz = 0;
                }
                // a vehicle or structure in the way holds the beacon
                for (let o = 0; o < this.hi; o++) {
                    if (!this.alive[o] || this.airS[o] || this.eid[o] === body)
                        continue;
                    const br = d.tRadius[this.etype[o]];
                    if (br < 1)
                        continue;
                    const ex = t.x - this.x[o], ey = t.y - (this.y[o] + br), ez = t.z - this.z[o], rr = br + r;
                    if (ex * ex + ez * ez <= rr * rr && ey * ey + ex * ex + ez * ez <= rr * rr) {
                        stick = o;
                        break;
                    }
                }
                if (stick >= 0) {
                    done = true;
                    break;
                }
                const gh = this.terrain.height(t.x, t.z) + r;
                if (t.y > gh + 0.02) {
                    if (t.st === calls_ts_1.TB_ROLL)
                        t.st = calls_ts_1.TB_FLY;
                    continue;
                }
                t.y = gh;
                // ground normal (finite differences)
                const e = 0.5, nx0 = this.terrain.height(t.x - e, t.z) - this.terrain.height(t.x + e, t.z), nz0 = this.terrain.height(t.x, t.z - e) - this.terrain.height(t.x, t.z + e), ny0 = 2 * e;
                const nl = Math.sqrt(nx0 * nx0 + ny0 * ny0 + nz0 * nz0), nx = nx0 / nl, ny = ny0 / nl, nz = nz0 / nl;
                const vn = t.vx * nx + t.vy * ny + t.vz * nz;
                if (vn < -T.bounceMin && t.bounces < (t.fired ? 1 : T.maxBounces)) {
                    t.bounces++;
                    const f = t.fired ? T.fric * 0.08 : T.fric, bn = -vn * (t.fired ? T.rest * 0.5 : T.rest), tx = t.vx - vn * nx, ty = t.vy - vn * ny, tz = t.vz - vn * nz;
                    t.vx = tx * f + bn * nx;
                    t.vy = ty * f + bn * ny;
                    t.vz = tz * f + bn * nz;
                    t.st = calls_ts_1.TB_FLY;
                    this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, t.team, t.id, t.caller, t.call, t.bounces, t.x, t.z, calls_ts_1.CE_BOUNCE);
                }
                else {
                    // rolling: the slope pulls it along the ground, rolling friction slows it
                    t.st = calls_ts_1.TB_ROLL;
                    const gx = g * h2 * ny * nx, gy = -g * h2 * (1 - ny * ny), gz = g * h2 * ny * nz;
                    const vi = vn < 0 ? vn : 0, tx = t.vx - vi * nx + gx, ty = t.vy - vi * ny + gy, tz = t.vz - vi * nz + gz; // gravity along the slope
                    const sp = Math.sqrt(tx * tx + ty * ty + tz * tz), dec = T.roll * h2;
                    if (sp <= dec || sp < 0.25) {
                        t.vx = 0;
                        t.vy = 0;
                        t.vz = 0;
                        done = true;
                        break;
                    }
                    const q = (sp - dec) / sp;
                    t.vx = tx * q;
                    t.vy = ty * q;
                    t.vz = tz * q;
                }
            }
            if (!done) {
                keep.push(t);
                continue;
            }
            let att = 0, ox = 0, oy = 0, oz = 0, y = 0;
            if (stick >= 0) {
                att = this.eid[stick];
                ox = t.x - this.x[stick];
                oy = t.y - this.y[stick];
                oz = t.z - this.z[stick];
                y = t.y;
                this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, t.team, t.id, t.caller, t.call, att, t.x, t.z, calls_ts_1.CE_STICK);
            }
            else
                y = this.terrain.height(t.x, t.z);
            const why = this.callTargetRefusal(t.team, t.call, t.x, t.z);
            if (why) {
                this.events.push(events_ts_1.EV.CALL_REFUSED, this.tick, t.team, 0, t.caller, reasonCode(why), t.call, 0, 0, 0);
                continue;
            }
            this.placeBeacon(t.id, t.call, t.team, t.caller, t.x, t.z, t.dx, t.dz, t.opt, calls_ts_1.CF_THROWN, y, att, ox, oy, oz);
        }
        C.thrown = keep;
    }
    /** Lands every beacon whose impact tick has come (step phase 7b), then starts the caller's cooldown; runs lasting effects. */
    callStep() {
        const C = this.calls, R = C.rules;
        if (C.thrown.length || C.beacons.length)
            this.thrownStep(); // ruling 128: thrown beacons fly / settle; stuck beacons ride their entity
        if (C.effects.length)
            this.callEffectsStep();
        if (!C.beacons.length)
            return;
        const keep = [];
        for (const b of C.beacons) {
            if (b.impactTick > this.tick) {
                keep.push(b);
                continue;
            }
            const def = R.calls[b.call];
            let n = 0;
            if (def.fx === calls_ts_1.CALL_FX_STRIKE)
                n = this.callArea(b.x, b.z, def.radius, def.damage, def.damageType, b.team, b.caller > 0 ? b.caller : 0);
            else if (def.fx === calls_ts_1.CALL_FX_RESUPPLY)
                n = this.fkit ? this.fkit.addPod(this, b.x, b.z, def.count, b.team) : this.callResupply(b.x, b.z, def.count, b.team); // Frontline: a pod of containers
            else if (this.fkit && def.id === "reinforcements")
                n = this.fkit.reinforce(this, b.team, b.x, b.z); // Frontline: AI troops flown in by Mule from the base
            else if (def.fx === calls_ts_1.CALL_FX_SWEEP) {
                const r2 = def.radius * def.radius, until = this.tick + def.durTicks;
                for (let s = 0; s < this.hi; s++) {
                    if (!this.alive[s] || this.team[s] === b.team)
                        continue;
                    const dx = this.x[s] - b.x, dz = this.z[s] - b.z;
                    if (dx * dx + dz * dz <= r2) {
                        this.callReveal(s, b.team, until);
                        n++;
                    }
                }
            }
            else if (def.fx === calls_ts_1.CALL_FX_LINE) {
                const k = Math.round(def.count * R.airPayload), L = def.lineLength;
                for (let i = 0; i < k; i++) {
                    const t = (i + 0.5) / k * L; // from the beacon forward, away from the thrower
                    n += this.callArea(this.clampMap(b.x + b.dx * t), this.clampMap(b.z + b.dz * t), def.splash, def.damage, def.damageType, b.team, b.caller > 0 ? b.caller : 0);
                }
                this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, b.team, b.id, b.caller, b.call, k, this.clampMap(b.x + b.dx * L), this.clampMap(b.z + b.dz * L), calls_ts_1.CE_LINE);
            }
            else if (def.fx === calls_ts_1.CALL_FX_BARRAGE)
                C.effects.push({ beacon: b.id, call: b.call, team: b.team, caller: b.caller, x: b.x, z: b.z, dx: b.dx, dz: b.dz, start: this.tick, end: this.tick + def.durTicks, n: 0, ids: [] });
            else if (def.fx === calls_ts_1.CALL_FX_SUPPLY)
                n = this.callSupplyDrop(b.x, b.z, def.radius, def.hullRepair, b.team); // designer 16 Nov: pilot energy, vehicle repair kit, ammo
            else if (def.fx >= calls_ts_1.CALL_FX_SENTRY) {
                const r = this.callZoneStart(b, def.fx);
                if (r < 0) {
                    this.events.push(events_ts_1.EV.CALL_IMPACT, this.tick, b.team, b.id, b.caller, b.call, 0, b.x, b.z, b.flags);
                    continue;
                } // nothing landed: no cooldown
                n = r;
            }
            else if (def.fx === calls_ts_1.CALL_FX_DROP) {
                // checked again at impact (the unit caps may have changed during the delay); a failed drop starts no cooldown
                const k = def.fromReserve > 0 && this.resRules ? this.reserveVehicle(b.team) : -1;
                // rulings 57 / 60: no reserve vehicle: build one at its normal cost if a producer can and the team can pay now
                const build = def.fromReserve > 0 && this.resRules !== null && k < 0 && this.dropBuildable(b.team, def.unitType);
                if (def.fromReserve > 0 && this.resRules && k < 0 && !build) {
                    this.events.push(events_ts_1.EV.CALL_IMPACT, this.tick, b.team, b.id, b.caller, b.call, 0, b.x, b.z, b.flags);
                    continue;
                } // fix-qa2: the reserve vehicle is gone (and none can be built)
                const e = k >= 0 ? this.res.entries[b.team][k] : null, t = e ? e.type : def.unitType;
                const r = this.slotsLeft() >= this.d.tSquadSize[t] ? this.trySpawnUnit(this.d.typeIds[t], b.team, b.x, b.z, { crew: "none" }) : null;
                if (r && r.ok && build) {
                    this.ore[b.team] -= this.d.tCostOre[t];
                    this.gas[b.team] -= this.d.tCostGas[t];
                } // normal cost
                if (r && r.ok && e) {
                    this.res.entries[b.team].splice(k, 1);
                    const s = this.idToSlot.get(r.ids[0]);
                    this.hp[s] = Math.min(this.d.tHp[t], e.hp[0]);
                    this.shield[s] = Math.min(this.d.tShield[t], e.shield[0]);
                } // damage kept
                if (r && r.ok) {
                    n = r.ids[0];
                    if (this.fkit && b.caller > 0)
                        this.fkit.dropped.set(b.caller, n); // Frontline: one dropped vehicle per player at a time
                    if (this.fkit && this.d.tAir[t]) { // Frontline: a dropped aircraft arrives parked on the ground where the drop landed
                        const ns = this.idToSlot.get(n);
                        if (ns !== undefined) {
                            this.flyAlt[ns] = 0;
                            this.airS[ns] = 0;
                            // (no parking hold: a boarded aircraft lifts straight into its hover)
                            const q = this.sc;
                            q[S_GX] = this.x[ns];
                            q[S_GZ] = this.z[ns];
                            this.groundAt(S_GX);
                            this.y[ns] = q[S_GY];
                        }
                    }
                }
                else {
                    this.events.push(events_ts_1.EV.CALL_IMPACT, this.tick, b.team, b.id, b.caller, b.call, 0, b.x, b.z, b.flags);
                    continue;
                }
            }
            const cs = C.caller(b.caller);
            if (def.uses > 0 && ++cs.uses[b.call] < def.uses)
                cs.ready[b.call] = this.tick; // uses left before the rearm
            else {
                const own = this.fkit && def.id === "slot3-drop" ? this.fkit.slot3Recharge(this, b.caller) : null; // Frontline: per slot 3 weapon
                cs.ready[b.call] = this.tick + (own ?? def.cooldownTicks);
                cs.uses[b.call] = 0;
            }
            this.events.push(events_ts_1.EV.CALL_IMPACT, this.tick, b.team, b.id, b.caller, b.call, n, b.x, b.z, b.flags);
        }
        C.beacons = keep;
    }
    /** Lasting call effects (s11), before this tick's impacts: barrage shells due this tick. Ended effects are dropped. */
    callEffectsStep() {
        const C = this.calls, R = C.rules, tr = this.d.constants.tickRate;
        const keep = [];
        for (const e of C.effects) {
            const def = R.calls[e.call];
            if (def.fx === calls_ts_1.CALL_FX_BARRAGE) {
                const total = Math.round(def.durTicks * def.rate / tr), due = Math.min(total, Math.floor((this.tick - e.start) * def.rate / tr) + 1);
                while (e.n < due) {
                    const k = e.n++, r = def.radius * Math.sqrt((0, calls_ts_1.callHash01)(e.beacon, 2 * k)), a = 2 * Math.PI * (0, calls_ts_1.callHash01)(e.beacon, 2 * k + 1);
                    const x = this.clampMap(e.x + r * (0, fmath_ts_1.dcos)(a)), z = this.clampMap(e.z + r * (0, fmath_ts_1.dsin)(a));
                    const hit = this.callArea(x, z, def.splash, def.damage, def.damageType, e.team, e.caller > 0 ? e.caller : 0);
                    this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, e.team, e.beacon, e.caller, e.call, k, x, z, calls_ts_1.CE_SHELL | (hit > 0 ? 16 : 0));
                }
                if (e.n >= total)
                    continue;
            }
            else if (def.fx >= calls_ts_1.CALL_FX_SENTRY) {
                if (!this.callZoneStep(e, def.fx)) {
                    this.callZoneEnd(e);
                    continue;
                }
            }
            else if (this.tick >= e.end)
                continue;
            keep.push(e);
        }
        if (keep.length !== C.effects.length)
            this.fxDirty = true;
        C.effects = keep;
    }
    // ---------------------------------------------- w2a lasting call effects (sentry, mines, smoke, shield, EMP, weapon pod)
    /** Derived caches of the lasting effects (not state: rebuilt from Calls.effects whenever they change or after a restore). */
    fxDirty = true;
    /** Vehicle slots that reached their pickup pilot this tick (moveUnit; scratch, emptied by pickupHandOver in the same tick). */
    pickupArrived = [];
    /**
     * Ruling 19 (QA2 U02): a vehicle answering a pickup has stopped beside the player (an aircraft has landed): its AI
     * pilot climbs out (EXIT event), leaves the vehicle to the player and walks back to the nearest friendly base on foot
     * (sendHome: a real, killable unit). AI gunners stay aboard. The pickup order ends. Needs one free entity slot for
     * the pilot's body (else it retries next tick).
     */
    pickupHandOver() {
        const d = this.d;
        for (const s of this.pickupArrived) {
            if (!this.alive[s] || this.ordType[s] !== exports.ORD_PICKUP || this.slotsLeft() < 1)
                continue;
            const dj = d.tDriverSeat[this.etype[s]], o = dj >= 0 ? this.occ[s * data_ts_1.MAX_SEATS + dj] : 0;
            const op = o !== 0 ? this.pilots.get(o) : undefined;
            if (!op || op.player >= 0)
                continue;
            this.exitSeat(op, s, true);
            this.events.push(events_ts_1.EV.EXIT, this.tick, op.team, op.id, this.eid[s], op.entity, 0, 0, 0, 0);
            {
                const pp = this.pilots.get(this.ordTargetId[s]);
                if (pp && pp.player >= 0 && pp.state === exports.P_FOOT)
                    (0, s15_ts_1.idleActive)(this, pp.id, pp.entity);
            } // ruling 73: the ride arrived: the idle clock starts now
            this.ordType[s] = exports.ORD_NONE;
            this.ordTargetId[s] = 0;
            this.waypoints[s] = null;
        }
        this.pickupArrived.length = 0;
    }
    fxDomes = []; // x, y, z, r per active (not EMP-suppressed) shield bubble
    fxSmoke = []; // ax, az, bx, bz, half width per smoke screen
    fxEmp = null; // entity id -> last tick it is disabled
    fxFlare = false; // scratch: the solar flare was on at the last fxRefresh
    fxRefresh() {
        this.fxDirty = false;
        this.fxDomes = [];
        this.fxSmoke = [];
        this.fxEmp = null;
        this.fxFlare = this.weather !== null && this.weather.e.shieldsOff; // ruling 68: a solar flare takes every shield bubble down
        const C = this.calls;
        if (!C)
            return;
        const R = C.rules, emps = [];
        for (const e of C.effects)
            if (R.calls[e.call].fx === calls_ts_1.CALL_FX_EMP)
                emps.push(e);
        for (const e of C.effects) {
            const def = R.calls[e.call];
            if (def.fx === calls_ts_1.CALL_FX_SHIELD) {
                // EMP: a shield bubble that an active EMP burst reaches is down while it lasts (doc 15 "disables shields in 40 m";
                // QA3-12: the dome reaches into the burst, as the EMP takes any entity whose hit sphere reaches within its radius)
                let off = false;
                for (const m of emps) {
                    const dx = m.x - e.x, dz = m.z - e.z, r = R.calls[m.call].radius + def.radius;
                    if (dx * dx + dz * dz <= r * r)
                        off = true;
                }
                if (!off && !this.fxFlare)
                    this.fxDomes.push(e.x, this.terrain.height(e.x, e.z), e.z, def.radius);
            }
            else if (def.fx === calls_ts_1.CALL_FX_SMOKE) {
                this.fxSmoke.push(e.x, e.z, this.clampMap(e.x + e.dx * def.lineLength), this.clampMap(e.z + e.dz * def.lineLength), def.width / 2);
            }
            else if (def.fx === calls_ts_1.CALL_FX_EMP) {
                if (!this.fxEmp)
                    this.fxEmp = new Map();
                for (const id of e.ids) {
                    const u = this.fxEmp.get(id);
                    if (u === undefined || u < e.end)
                        this.fxEmp.set(id, e.end);
                }
            }
        }
    }
    /**
     * Smoke screen (w2a; the one detection hook, in sweepFrom): true when the horizontal sight line (ax, az)-(bx, bz)
     * passes within half of sim.smokeWidthMetres of an active smoke line (params.lineLength from the beacon forward along
     * the throw direction). Height is not modelled: the smoke blocks every sight line that crosses it, aircraft included.
     */
    smokeBlocks(ax, az, bx, bz) {
        if (this.fxDirty)
            this.fxRefresh();
        const L = this.fxSmoke;
        for (let i = 0; i < L.length; i += 5)
            if (segSegDist2(ax, az, bx, bz, L[i], L[i + 1], L[i + 2], L[i + 3]) <= L[i + 4] * L[i + 4])
                return true;
        return false;
    }
    /** EMP (w2a): slot s is disabled this tick (no movement, no firing, no shield recharge). */
    empd(s) {
        if (!this.calls || !this.calls.effects.length)
            return false;
        if (this.fxDirty)
            this.fxRefresh();
        if (!this.fxEmp)
            return false;
        const u = this.fxEmp.get(this.eid[s]);
        return u !== undefined && u >= this.tick;
    }
    /**
     * QA3-11: the most hull repair (Repair Bay, repair torch) can bring slot s to: its type's hull, or for a call-in sentry
     * (support call sentry-gun, a body of another type) the call's own params.hp.
     */
    /** Ruling 78: slot s is a call-in sentry gun (support call sentry-gun): it is never repaired (Repair Bay or torch). */
    callSentry(s) {
        const C = this.calls;
        if (C === null || !C.effects.length || !this.d.tStructure[this.etype[s]])
            return false;
        const id = this.eid[s];
        for (const e of C.effects)
            if (C.rules.calls[e.call].fx === calls_ts_1.CALL_FX_SENTRY && e.ids[0] === id)
                return true;
        return false;
    }
    /** Ruling 121 item 5: full health of a pilot record (player pilots x crew.playerHpMul). */
    pilotMaxHp(p) { const t = this.d.pilotType; return t < 0 ? 0 : this.d.tHp[t] * (p.player >= 0 && this.d.crew ? this.d.crew.playerHpMul : 1); }
    /** Full health of slot s: its type's, a player pilot's body x crew.playerHpMul. */
    bodyMaxHp(s) {
        const t = this.etype[s], pid = this.slotPilot[s];
        if (pid !== 0 && t === this.d.pilotType && this.d.crew && this.d.crew.playerHpMul !== 1) {
            const p = this.pilots.get(pid);
            if (p && p.player >= 0)
                return this.d.tHp[t] * this.d.crew.playerHpMul;
        }
        return this.d.tHp[t];
    }
    maxHull(s) {
        const t = this.etype[s], C = this.calls;
        if (this.slotPilot[s] !== 0)
            return this.bodyMaxHp(s);
        if (C !== null && C.effects.length && this.d.tStructure[t]) {
            const id = this.eid[s];
            for (const e of C.effects) {
                const def = C.rules.calls[e.call];
                if (def.fx === calls_ts_1.CALL_FX_SENTRY && e.ids[0] === id)
                    return Math.min(def.hp, this.d.tHp[t]);
            }
        }
        return this.d.tHp[t];
    }
    /** Starts the lasting effect of beacon b. Returns CALL_IMPACT d (entity id or count), or -1 when nothing landed. */
    callZoneStart(b, fx) {
        const C = this.calls, def = C.rules.calls[b.call], d = this.d;
        const e = { beacon: b.id, call: b.call, team: b.team, caller: b.caller, x: b.x, z: b.z, dx: b.dx, dz: b.dz, start: this.tick, end: this.tick + def.durTicks, n: 0, ids: [] };
        let r = 0, flags = calls_ts_1.CE_START;
        if (fx === calls_ts_1.CALL_FX_SENTRY) {
            // doc 15 "auto-turret, lasts 90 s": the sim.sentryProfile body with params.hp and params.weapon, uncrewed
            if (this.slotsLeft() < 1)
                return -1;
            const id = this.spawnUnit(d.typeIds[def.profile], b.team, b.x, b.z, { crew: "none" }), s = this.idToSlot.get(id);
            this.hp[s] = def.hp;
            // ruling 130: mount 0 the call's gun (params.weapon), mount 1 its rocket pod (params.rocketWeapon), others the gun
            let mr = 0;
            for (let m = 0; m < this.mCount[s]; m++) {
                const w = m === 1 && def.weapon2 >= 0 ? def.weapon2 : def.weapon;
                this.mWeapon[s * data_ts_1.MAX_MOUNTS + m] = w;
                mr = Math.max(mr, d.wRange[w]);
                if (def.deployTicks > 0)
                    this.cooldown[s * data_ts_1.MAX_MOUNTS + m] = def.deployTicks * d.dt;
            }
            this.maxRange[s] = mr;
            e.ids.push(id);
            r = id;
        }
        else if (fx === calls_ts_1.CALL_FX_MINES) {
            // doc 15: params.mines hidden mines spread over the params.radius disk; they stay until set off. ids[k] = the field's
            // mine key while mine k is live (0 once set off). The key is drawn from the sim's seeded PRNG (QA1 bug 2): the spots
            // are minePoint(key, k, ...), so nothing another team receives (beacon id, position, events) gives them away; only
            // the laying team gets the key (snapshot zones). Only the laying team sees them.
            e.end = 0x7fffffff;
            e.n = def.count;
            const key = (this.rng.nextU32() >>> 1) | 1; // positive, never 0
            for (let k = 0; k < def.count; k++)
                e.ids.push(key);
            r = def.count;
            flags |= calls_ts_1.CEF_TEAM;
        }
        else if (fx === calls_ts_1.CALL_FX_EMP) {
            // doc 15 "disables vehicles, turrets and shields in 40 m for 8 s, both sides": every vehicle, armed structure and
            // shielded structure whose hit sphere reaches within params.radius at impact (ids, ascending slot)
            const r2 = def.radius;
            for (let o = 0; o < this.hi; o++) {
                if (!this.alive[o] || this.hp[o] <= 0)
                    continue;
                const t = this.etype[o];
                if (!(d.tVehicle[t] || (d.tStructure[t] && (this.mCount[o] > 0 || d.tShield[t] > 0))))
                    continue;
                const fx2 = this.x[o] - b.x, fz2 = this.z[o] - b.z, lim = r2 + d.tRadius[t];
                if (fx2 * fx2 + fz2 * fz2 <= lim * lim)
                    e.ids.push(this.eid[o]);
            }
            r = e.ids.length;
        }
        else if (fx === calls_ts_1.CALL_FX_POD) {
            // doc 15 "one pilot heavy weapon": the pod waits sim.weaponPodLifetimeSeconds holding params.weaponChoices[option]
            e.end = this.tick + C.rules.podTicks;
            e.n = def.choices[b.opt] ?? def.choices[0];
            r = e.n;
        }
        C.effects.push(e);
        this.fxDirty = true;
        this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, b.team, b.id, b.caller, b.call, r, b.x, b.z, flags);
        return r;
    }
    /** One tick of a lasting effect; false when it is over. */
    callZoneStep(e, fx) {
        if (fx === calls_ts_1.CALL_FX_SENTRY) {
            const s = this.idToSlot.get(e.ids[0]);
            if (s === undefined || !this.alive[s] || this.hp[s] <= 0)
                return false; // destroyed
            if (this.tick >= e.end) {
                this.destroy(e.ids[0]);
                return false;
            } // its time is up
            return true;
        }
        if (fx === calls_ts_1.CALL_FX_MINES)
            return this.mineStep(e);
        if (fx === calls_ts_1.CALL_FX_POD)
            return this.tick < e.end && !this.podStep(e);
        return this.tick < e.end;
    }
    /**
     * Heavy weapon pod: the nearest player pilot of the calling team on foot (on the ground, standing) within
     * sim.weaponPodPickupRadiusMetres of the pod takes its weapon (ties: lower pilot id). True when it was taken.
     */
    podStep(e) {
        const r = this.calls.rules.podRadius;
        let best = null, bd = Infinity, bs = -1;
        for (const p of this.pilots.values()) {
            if (p.team !== e.team || p.player < 0 || p.state !== exports.P_FOOT)
                continue;
            const s = this.idToSlot.get(p.entity);
            if (s === undefined || this.hp[s] <= 0)
                continue;
            const dx = this.x[s] - e.x, dz = this.z[s] - e.z, d2 = dx * dx + dz * dz, lim = r + this.d.tRadius[this.etype[s]];
            if (d2 <= lim * lim && (d2 < bd || (d2 === bd && best !== null && p.id < best.id))) {
                best = p;
                bd = d2;
                bs = s;
            }
        }
        if (!best)
            return false;
        this.callState().caller(best.id).heavy = this.fkit ? this.fkit.slot3Of(this, best.id, e.n) : e.n; // Frontline: the kit's slot 3 weapon
        this.applyHeavy(best.id, bs);
        this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, e.team, e.beacon, e.caller, e.call, best.id, e.x, e.z, calls_ts_1.CE_PICKUP);
        return true;
    }
    /**
     * The carried heavy weapon (CallerState.heavy) replaces the pilot body's second weapon (the first kit mount: fired with
     * fire bit 1, never by the AI) on body slot s. Called on pickup and whenever the pilot gets a body on foot (leaving or
     * ejecting from a vehicle), so it survives entering and leaving vehicles; cleared when the pilot dies.
     */
    applyHeavy(pilotId, s) {
        const c = this.calls?.callers.get(pilotId);
        if (this.fkit && c && c.heavy >= 0 && this.mCount[s] > 3) { // Frontline: the slot 3 mount (key 3), not the role weapon
            this.fkit.giveSlot3(this, pilotId, s, c.heavy);
            return;
        }
        if (!c || c.heavy < 0 || this.mCount[s] < 2)
            return;
        this.mWeapon[s * data_ts_1.MAX_MOUNTS + 1] = c.heavy;
        this.cooldown[s * data_ts_1.MAX_MOUNTS + 1] = 0;
    }
    /**
     * w2a: the lasting call effects viewer team `team` may see (snapshot zones): every effect except another team's
     * minefield. dir: throw direction as yaw x 256 / 2 pi (0-255); end: last tick (0: none); value: sentry entity id,
     * minefield live-mine bitmask, weapon pod weapon index, barrage shells fired, else 0.
     */
    callZones(team) {
        const out = [], C = this.calls;
        if (!C)
            return [];
        for (const e of C.effects) {
            const fx = C.rules.calls[e.call].fx;
            if (fx === calls_ts_1.CALL_FX_MINES && e.team !== team)
                continue;
            let value = 0;
            if (fx === calls_ts_1.CALL_FX_SENTRY)
                value = e.ids[0];
            else if (fx === calls_ts_1.CALL_FX_MINES) {
                for (let k = 0; k < e.ids.length && k < 31; k++)
                    if (e.ids[k])
                        value += 2 ** k;
            }
            else if (fx === calls_ts_1.CALL_FX_POD || fx === calls_ts_1.CALL_FX_BARRAGE)
                value = e.n;
            let a = Math.atan2(e.dz, e.dx);
            if (a < 0)
                a += 2 * Math.PI;
            out.push({ beacon: e.beacon, call: e.call, team: e.team, x: e.x, z: e.z, dir: Math.round(a * 256 / (2 * Math.PI)) & 255, end: e.end >= 0x7fffffff ? 0 : e.end, value, key: fx === calls_ts_1.CALL_FX_MINES ? this.mineKey(e) : 0 });
        }
        return out;
    }
    /** Weapon index of the heavy weapon pilot pilotId carries (-1 none). */
    heavyWeapon(pilotId) { const c = this.calls?.callers.get(pilotId); return c ? c.heavy : -1; }
    /** Mine k of minefield e: position into out[0], out[1]. */
    minePos(e, k, out) {
        (0, calls_ts_1.minePoint)(this.mineKey(e), k, e.x, e.z, this.calls.rules.calls[e.call].radius, this.mapSize, out);
    }
    /** Mine key of minefield e (QA1 bug 2: secret seeded randomness, the value of every live entry of e.ids; 0 when all are spent). */
    mineKey(e) { for (const v of e.ids)
        if (v)
            return v; return 0; }
    minePt = [0, 0];
    /**
     * Minefield: a live mine goes off when the hit sphere of a live ENEMY ground vehicle (params.triggeredBy "vehicles"; "all":
     * also infantry and pilots on foot; aircraft never) comes within sim.mineTriggerRadiusMetres of it: params.mineDamage of
     * params.damageType within that radius, both sides (full friendly fire). False when every mine is spent.
     */
    mineStep(e) {
        const d = this.d, def = this.calls.rules.calls[e.call], trig = def.trigger;
        const reach = def.radius + trig + this.maxRadius;
        let liveMines = 0;
        for (let k = 0; k < e.ids.length; k++) {
            if (!e.ids[k])
                continue;
            liveMines++;
            let hit = -1;
            this.minePos(e, k, this.minePt);
            for (let i = 0; i < this.nLive && hit < 0; i++) {
                const o = this.live[i];
                if (!this.alive[o] || this.hp[o] <= 0 || this.team[o] === e.team)
                    continue;
                const t = this.etype[o];
                if (d.tStructure[t] || d.tAir[t] || this.airborne[o] !== exports.AIR_GROUND)
                    continue;
                if (!d.tVehicle[t] && !def.infantry)
                    continue;
                const fx = this.x[o] - e.x, fz = this.z[o] - e.z;
                if (fx * fx + fz * fz > reach * reach)
                    continue;
                const mx = this.x[o] - this.minePt[0], mz = this.z[o] - this.minePt[1], lim = trig + d.tRadius[t];
                if (mx * mx + mz * mz <= lim * lim)
                    hit = o;
            }
            if (hit < 0)
                continue;
            e.ids[k] = 0;
            e.n--;
            liveMines--;
            const x = this.minePt[0], z = this.minePt[1];
            const n = this.callArea(x, z, trig, def.damage, def.damageType, e.team, e.caller > 0 ? e.caller : 0);
            this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, e.team, e.beacon, e.caller, e.call, k, x, z, calls_ts_1.CE_MINE | (n > 0 ? 16 : 0));
        }
        return liveMines > 0;
    }
    /**
     * Supply drop (designer 16 Nov, replacing ruling 121's ore/gas pod and the repair beacon): at impact every own pilot within
     * `r` (on foot or seated) gets full energy and jetpack burn; every own vehicle (not one in its critical window) whose body
     * reaches within r gets `frac` of its full hull back (a repair kit, up to full) and its aircraft ammunition refilled
     * (ruling 55: the only ammunition the sim keeps). Returns the pilots + vehicles supplied.
     */
    callSupplyDrop(x, z, r, frac, team) {
        const d = this.d, c = d.crew;
        let n = 0;
        if (c)
            for (const p of this.pilots.values()) {
                if (p.team !== team || p.state === exports.P_DEAD)
                    continue;
                const foot = p.state === exports.P_FOOT, s = this.idToSlot.get(foot ? p.entity : p.vehicle);
                if (s === undefined)
                    continue;
                const dx = this.x[s] - x, dz = this.z[s] - z;
                if (dx * dx + dz * dz > (r + d.tRadius[this.etype[s]]) ** 2)
                    continue;
                if (foot) {
                    this.energy[s] = c.energyMax;
                    this.jetFuel[s] = c.jetFreeBurnSeconds;
                }
                else {
                    p.energy = c.energyMax;
                    p.jet = c.jetFreeBurnSeconds;
                }
                n++;
            }
        for (let k = 0; k < this.nLive; k++) {
            const s = this.live[k], t = this.etype[s];
            if (!this.alive[s] || this.team[s] !== team || this.hp[s] <= 0 || this.critTick[s] >= 0 || !d.tVehicle[t])
                continue;
            const dx = this.x[s] - x, dz = this.z[s] - z, lim = r + d.tRadius[t];
            if (dx * dx + dz * dz > lim * lim)
                continue;
            const max = this.maxHull(s);
            this.hp[s] = Math.min(max, this.hp[s] + max * frac);
            if (d.tAir[t])
                (0, s15_ts_1.ammoOnSpawn)(this, s);
            n++;
        }
        return n;
    }
    callZoneEnd(e) {
        this.events.push(events_ts_1.EV.CALL_EFFECT, this.tick, e.team, e.beacon, e.caller, e.call, 0, e.x, e.z, calls_ts_1.CE_END);
    }
    /**
     * Sensor sweep (s11): entity slot s counts as detected by `team` until tick `until` (inclusive). The one place a support
     * call writes detection (today: the detExpiry set that detected() and targeting read; a vision system replacing it
     * connects here). Never shortens a longer detection.
     */
    callReveal(s, team, until) {
        const i = s * exports.MAX_TEAMS + team;
        if (this.detExpiry[i] < until)
            this.detExpiry[i] = until;
    }
    /**
     * Resupply pod (s11): the `count` pilots of `team` nearest (x, z) within the crew refill radius (on foot: their body;
     * seated: their vehicle) get full energy (ruling 17) and full free jetpack burn. Ties: lower pilot id. Returns how many.
     */
    callResupply(x, z, count, team) {
        const c = this.d.crew;
        if (!c || count <= 0)
            return 0;
        const r2 = c.refillRadius * c.refillRadius, cand = [];
        for (const p of this.pilots.values()) {
            if (p.team !== team || p.state === exports.P_DEAD)
                continue;
            const foot = p.state === exports.P_FOOT, s = this.idToSlot.get(foot ? p.entity : p.vehicle);
            if (s === undefined)
                continue;
            const dx = this.x[s] - x, dz = this.z[s] - z, d2 = dx * dx + dz * dz;
            if (d2 <= r2)
                cand.push({ p, d2, s: foot ? s : -1 });
        }
        cand.sort((a, b) => a.d2 - b.d2 || a.p.id - b.p.id);
        const n = cand.length < count ? cand.length : count;
        for (let i = 0; i < n; i++) {
            const { p, s } = cand[i];
            if (s >= 0) {
                this.energy[s] = c.energyMax;
                this.jetFuel[s] = c.jetFreeBurnSeconds;
            }
            else {
                p.energy = c.energyMax;
                p.jet = c.jetFreeBurnSeconds;
            }
        }
        return n;
    }
    /**
     * Area damage of a call: `damage` of type `dtype` to every live entity whose hit sphere reaches within r (horizontal) of
     * (x, z), BOTH sides (fullFriendlyFire; friendly hits use constants.friendlyFire like any shot of that type: explosive
     * 100%). Same pipeline as a shot (damage matrix, shields, critical window / ejection, kills). Returns the entities hit.
     */
    callArea(x, z, r, damage, dtype, team, pilotId) {
        const d = this.d, dt = data_ts_1.DAMAGE_TYPES.indexOf(dtype);
        let w = -1;
        for (let i = 0; i < d.weaponIds.length; i++)
            if (d.wDamageType[i] === dt && d.wDamage[i] > 0) {
                w = i;
                break;
            }
        if (w < 0)
            return 0;
        const q = this.sc;
        let n = 0;
        this.hitShooter = 0;
        this.hitPilot = pilotId;
        for (let s = 0; s < this.hi; s++) {
            if (!this.alive[s] || this.hp[s] <= 0)
                continue;
            const rad = d.tRadius[this.etype[s]], dx = this.x[s] - x, dz = this.z[s] - z, lim = r + rad;
            if (dx * dx + dz * dz > lim * lim)
                continue;
            q[S_INX] = 0;
            q[S_INZ] = 0;
            q[S_SCALE] = damage / d.wDamage[w];
            this.applyDamage(s, w, team, 0xff);
            n++;
        }
        q[S_SCALE] = 1;
        this.hitShooter = 0;
        this.hitPilot = 0;
        return n;
    }
    // ------------------------------------------------------------ helpers
    clampMap(v) { return v < 0 ? 0 : v > this.mapSize ? this.mapSize : v; }
    groundY(t, x, z) {
        return this.terrain.height(x, z) + (this.d.tAir[t] ? this.d.constants.airAltitude : 0);
    }
    /** Height of an entity's centre (sight line, muzzle and hit sphere). */
    centerY(s) { return this.y[s] + this.d.tRadius[this.etype[s]]; }
    newSquad(team, structure) {
        const sq = { id: this.nextSquadId++, team, members: [], structure };
        this.squads.set(sq.id, sq);
        return sq;
    }
    /** Designer 16 Nov (cloak): every unit and mount aiming at slot s drops it and re-targets. */
    dropTargetsOn(s) {
        for (let o = 0; o < this.hi; o++) {
            if (!this.alive[o])
                continue;
            if (this.tgtSlot[o] === s) {
                this.tgtSlot[o] = -1;
                this.tgtId[o] = 0;
            }
            for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++)
                if (this.mTgtSlot[o * data_ts_1.MAX_MOUNTS + m] === s) {
                    this.mTgtSlot[o * data_ts_1.MAX_MOUNTS + m] = -1;
                    this.mTgtId[o * data_ts_1.MAX_MOUNTS + m] = 0;
                }
        }
    }
    detected(s, team) {
        return this.team[s] === team || this.detExpiry[s * exports.MAX_TEAMS + team] >= this.tick;
    }
    /** Bitmask of the teams that detect slot s now (bit k: team k; the own team's bit only if it is also detected by sensors). -1 slot: 0. Event fog masks. */
    detMask(s) {
        if (s < 0)
            return 0;
        let m = 0;
        for (let k = 0; k < exports.MAX_TEAMS; k++)
            if (this.detExpiry[s * exports.MAX_TEAMS + k] >= this.tick)
                m |= 1 << k;
        return m;
    }
    /**
     * Effective signature (doc 14): firing x firingMultiplier for firingSeconds
     * (overrides the rest: "shooting always gives you away"); otherwise a ground
     * vehicle that did not move last tick x idleMultiplier, and every unit on an
     * airless planet x (1 - airlessExtraReduction). Boost is not modelled.
     */
    signatureTo(s) {
        // result in sc[S_SIG] (a double returned from a non-inlined call is boxed: allocation)
        const d = this.d, c = d.constants, t = this.etype[s];
        let sig = d.tSignature[t];
        if (this.tick - this.lastFired[s] < this.firingTicks)
            sig *= c.firingSignatureFactor;
        else if (!d.tStructure[t]) {
            if (d.tVehicle[t] && !d.tAir[t] && this.velX[s] === 0 && this.velZ[s] === 0)
                sig *= c.idleSignatureFactor;
            if (d.airless)
                sig *= 1 - c.airlessSignatureReduction;
        }
        this.sc[S_SIG] = sig;
    }
    /** Ruling 41 (null: the data has no stealth.lowFlight* values: low flight off). */
    lowRules = null;
    /** Ruling 41: aircraft slot s is in low flight now (mode on, airborne, at or below the low altitude). */
    lowNow(s) { return this.lowFly[s] === 1 && this.lowRules !== null && this.airS[s] === 1 && this.d.tAir[this.etype[s]] === 1 && this.flyAlt[s] <= this.lowRules.alt + 1e-6; }
    /** Ruling 41: switches low flight for aircraft `id` (the team's own when team is given). */
    setLowFlight(id, on, team) {
        const s = this.idToSlot.get(id);
        if (s === undefined || !this.alive[s] || this.hp[s] <= 0)
            return { ok: false, reason: "unknownUnit" };
        if (team !== undefined && this.team[s] !== team)
            return { ok: false, reason: "notOwner" };
        if (!this.d.tAir[this.etype[s]])
            return { ok: false, reason: "notControllable" };
        this.lowFly[s] = on ? 1 : 0;
        return { ok: true };
    }
    /** Terrain line of sight from (sx, sy, sz) to the centre of slot o. */
    terrainClear(sx, sy, sz, o) {
        const q = this.sc;
        q[SA_X] = sx;
        q[SA_Y] = sy;
        q[SA_Z] = sz;
        q[SB_X] = this.x[o];
        q[SB_Y] = this.y[o] + this.d.tRadius[this.etype[o]];
        q[SB_Z] = this.z[o];
        this.terrainSeg();
        return q[S_TERR] >= 1;
    }
    /** Can weapon w damage entity slot e at all? */
    canHit(w, e) {
        const t = this.etype[e];
        if (this.d.tAir[t] ? !(this.d.wCanHitAir[w] || (this.lowNow(e) && this.d.wCanHitGround[w])) : !this.d.wCanHitGround[w])
            return false; // anti-air-only weapons (canHitGround false) never engage the ground; ruling 41: a low aircraft is in reach of every ground weapon
        return this.d.matrix[this.d.wDamageType[w] * data_ts_1.N_AC + this.d.tArmour[t]] > 0;
    }
    slotValid(ts, id, team) {
        return ts >= 0 && this.alive[ts] === 1 && this.eid[ts] === id && (this.hp[ts] > 0 || (this.simul && this.upAtStart(ts))) && this.detected(ts, team);
    }
    /** False if the primary or any mount target became invalid (dead, replaced or no longer detected). */
    /** w3b unit AI leash (unit-ai.ts): under attackMove, target ts is beyond leashMetres of the unit's path leg. */
    leashed(s, ts) {
        const w = this.waypoints[s];
        if (!w)
            return false;
        const i = this.wpIdx[s];
        if (i * 2 + 1 >= w.length)
            return false;
        const ax = i > 0 ? w[i * 2 - 2] : this.x[s], az = i > 0 ? w[i * 2 - 1] : this.z[s];
        const L = this.uai.leash;
        return (0, unit_ai_ts_1.segDist2)(this.x[ts], this.z[ts], ax, az, w[i * 2], w[i * 2 + 1]) > L * L;
    }
    /**
     * T1 simultaneous resolution: true during the weapons and projectile phases. A unit that was up when the weapons
     * phase began (hull above zero) stays a valid target and a body in the line of fire until the end of the projectile
     * phase, even if a shot earlier in the same tick took its hull to zero: who fires first within a tick (slot order)
     * changes nothing. Deaths are applied after both phases (removeDead).
     */
    simul = false;
    dying0 = 0;
    /** Slot o is at zero hull now but reached it during this tick's weapons / projectile phases. */
    upAtStart(o) {
        if (this.critTick[o] === this.tick)
            return true;
        const L = this.dying;
        for (let i = this.dying0, n = this.nDying; i < n; i++)
            if (L[i] === o)
                return true;
        return false;
    }
    /** T1 fairness: per-entity stagger phase (detection, target scans, order thinking): a hash of the entity id and the seed. */
    phaseOf(s) {
        let h = Math.imul(this.eid[s] ^ 0x5bd1e995, 0x9e3779b1) ^ this.seed;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        return (h ^ (h >>> 16)) >>> 0;
    }
    targetsValid(s) {
        const team = this.team[s];
        let ok = true;
        if (this.tgtSlot[s] >= 0 && !this.slotValid(this.tgtSlot[s], this.tgtId[s], team)) {
            this.tgtSlot[s] = -1;
            ok = false;
        }
        const mc = this.mCount[s];
        for (let m = 0; m < mc; m++) {
            const i = s * data_ts_1.MAX_MOUNTS + m;
            if (this.mTgtSlot[i] >= 0 && !this.slotValid(this.mTgtSlot[i], this.mTgtId[i], team)) {
                this.mTgtSlot[i] = -1;
                ok = false;
            }
        }
        if (this.ordType[s] === exports.ORD_ATTACK && this.tgtSlot[s] < 0)
            ok = false;
        return ok;
    }
    // ------------------------------------------------------------ line of sight / line of fire
    /**
     * First point where the segment A->B goes below the terrain, as a fraction of
     * the segment in (0, 1], or Infinity. Sampled every terrainCellSize / 2.
     */
    terrainHitT(ax, ay, az, bx, by, bz) {
        const q = this.sc;
        q[SA_X] = ax;
        q[SA_Y] = ay;
        q[SA_Z] = az;
        q[SB_X] = bx;
        q[SB_Y] = by;
        q[SB_Z] = bz;
        this.terrainSeg();
        return q[S_TERR];
    }
    /** terrainHitT on the scratch segment sc[SA_X..SB_Z]; result in sc[S_TERR]. */
    terrainSeg() {
        const q = this.sc;
        const ax = q[SA_X], ay = q[SA_Y], az = q[SA_Z];
        q[S_TERR] = Infinity;
        const top = this.terrain.maxHeight;
        if (ay > top && q[SB_Y] > top)
            return;
        const dx = q[SB_X] - ax, dy = q[SB_Y] - ay, dz = q[SB_Z] - az;
        const len = Math.sqrt(dx * dx + dz * dz);
        const nSteps = Math.max(1, Math.ceil(len / this.terrainStep));
        const inv = 1 / nSteps;
        for (let i = 1; i <= nSteps; i++) {
            const t = i * inv;
            q[S_GX] = ax + dx * t;
            q[S_GZ] = az + dz * t;
            this.groundAt(S_GX);
            if (ay + dy * t < q[S_GY]) {
                q[S_TERR] = t;
                return;
            }
        }
    }
    /**
     * First entity whose hit sphere the scratch segment A->B (sc[SA_X..SB_Z])
     * passes through. Sets sc[S_RAYT] (fraction along the segment) and raySlot
     * (-1: none). Rules:
     *  - the shooter (ignoreId) is never hit;
     *  - entities of the shooter's own team block with their body radius; their
     *    structures do not block their own team's shots (gun ports / firing over walls);
     *  - other teams' entities block with body radius + projectileHitRadius (fuse / aim tolerance);
     *  - skip mask (CompiledData.wSkip): bit 1: shots of weapons that cannot hit air (canHitAir false, all
     *    ballistic) pass air units; bit 2: shots of anti-air-only weapons (canHitGround false) pass every
     *    ground unit and structure, of either team (they cannot damage the ground at all, ruling 13);
     *  - entities killed earlier this tick do not block.
     */
    raySeg(ignoreId, shooterTeam, skip) {
        const q = this.sc;
        this.raySlot = -1;
        q[S_RAYT] = Infinity;
        this.rayDome = false;
        const ax = q[SA_X], ay = q[SA_Y], az = q[SA_Z], bz = q[SB_Z];
        const d = this.d, g = this.fine, cs = g.cellSize;
        const hitR = d.constants.projectileHitRadius;
        const lag = this.rayLag, K = LAG_K, hk = lag > 0 ? (((this.tick - lag) % K) + K) % K : 0;
        const margin = this.maxRadius + hitR + this.moveMargin + lag * d.dt * LAG_MAX_SPEED; // a rewound entity may sit outside its present cell
        const dx = q[SB_X] - ax, dy = q[SB_Y] - ay, dz = bz - az;
        const a = dx * dx + dy * dy + dz * dz;
        if (a < 1e-12)
            return;
        const r0 = g.cellOf(Math.min(az, bz) - margin), r1 = g.cellOf(Math.max(az, bz) + margin);
        const side = g.cellsPerSide, start = g.bucketStart, ent = g.entries, ek = g.entryKey, mask = g.mask;
        let best = -1, bestT = Infinity;
        for (let cz = r0; cz <= r1; cz++) {
            const zb0 = cz * cs - margin, zb1 = (cz + 1) * cs + margin;
            let t0 = 0, t1 = 1;
            if (dz > 1e-12 || dz < -1e-12) {
                let ta = (zb0 - az) / dz, tb = (zb1 - az) / dz;
                if (ta > tb) {
                    const tmp = ta;
                    ta = tb;
                    tb = tmp;
                }
                if (ta > t0)
                    t0 = ta;
                if (tb < t1)
                    t1 = tb;
                if (t0 > t1)
                    continue;
            }
            else if (az < zb0 || az > zb1)
                continue;
            const xa = ax + dx * t0, xb = ax + dx * t1;
            const c0 = g.cellOf((xa < xb ? xa : xb) - margin), c1 = g.cellOf((xa < xb ? xb : xa) + margin);
            for (let cx = c0; cx <= c1; cx++) {
                const key = cz * side + cx;
                const b = (Math.imul(key, 0x9e3779b1) >>> 16) & mask;
                for (let p = start[b], e = start[b + 1]; p < e; p++) {
                    if (ek[p] !== key)
                        continue;
                    const o = ent[p];
                    if ((this.hp[o] <= 0 && !(this.simul && this.upAtStart(o))) || this.eid[o] === ignoreId)
                        continue;
                    const ot = this.etype[o];
                    const own = this.team[o] === shooterTeam;
                    if (own && d.tStructure[ot])
                        continue;
                    if (skip !== 0 && (d.tAir[ot] ? (skip & 1) !== 0 : (skip & 2) !== 0))
                        continue;
                    const rr = d.tRadius[ot] + (own ? 0 : hitR);
                    let ox = this.x[o], oy = this.y[o], oz = this.z[o];
                    if (lag > 0 && !own) { // co-op lag compensation: where the guest saw it
                        const hi = o * K + hk;
                        if (this.histE[hi] === this.eid[o]) {
                            ox = this.histX[hi];
                            oy = this.histY[hi];
                            oz = this.histZ[hi];
                        }
                    }
                    const fx = ax - ox, fy = ay - (oy + d.tRadius[ot]), fz = az - oz;
                    const cc = fx * fx + fy * fy + fz * fz - rr * rr;
                    let t;
                    if (cc <= 0)
                        t = 0; // segment starts inside the sphere
                    else {
                        const bb = fx * dx + fy * dy + fz * dz; // half of b
                        if (bb >= 0)
                            continue; // moving away
                        const disc = bb * bb - a * cc;
                        if (disc < 0)
                            continue;
                        t = (-bb - Math.sqrt(disc)) / a;
                        if (t > 1)
                            continue;
                    }
                    if (t < bestT || (t === bestT && o < best)) {
                        bestT = t;
                        best = o;
                    }
                }
            }
        }
        // w2a shield bubble (the one projectile hook): a shot whose path crosses an active dome's surface stops there
        if (this.calls !== null && this.calls.effects.length) {
            const t = this.domeCut(ax, ay, az, dx, dy, dz, a);
            if (t < bestT) {
                best = -1;
                bestT = t;
                this.rayDome = true;
            }
        }
        this.raySlot = best;
        q[S_RAYT] = bestT;
    }
    /** Lag compensation: the ring of positions at the start of each tick (only while some pilot has a lag). */
    recordHist() {
        if (this.lagTicks === null || this.lagTicks.size === 0)
            return;
        const K = LAG_K, n = this.cap * K;
        if (this.histX === null || this.histX.length !== n) {
            this.histX = new Float32Array(n);
            this.histY = new Float32Array(n);
            this.histZ = new Float32Array(n);
            this.histE = new Int32Array(n).fill(-1);
        }
        const k = this.tick % K, hx = this.histX, hy = this.histY, hz = this.histZ, he = this.histE;
        for (let s = 0; s < this.hi; s++) {
            const i = s * K + k;
            hx[i] = this.x[s];
            hy[i] = this.y[s];
            hz[i] = this.z[s];
            he[i] = this.alive[s] ? this.eid[s] : -1;
        }
    }
    /** The rewind for pilot pid's shots (ticks, 0: none). */
    lagOf(pid) {
        if (this.lagTicks === null || pid === 0)
            return 0;
        const l = this.lagTicks.get(pid < 0 ? -pid : pid) ?? 0;
        return l > 0 && this.histX !== null ? Math.min(LAG_K - 1, l) : 0;
    }
    /** raySeg: the shot was stopped by a shield bubble (raySlot -1, sc[S_RAYT] where it met the dome). */
    rayDome = false;
    /**
     * Shield bubble (w2a): first fraction t in [0, 1] at which the segment A + t D crosses the surface of an active dome
     * (params.radius sphere centred on the ground at the beacon; not while an EMP burst covers its centre), Infinity if none.
     * A shot that starts and ends on the same side of the surface (both inside, both outside and missing) passes.
     */
    domeCut(ax, ay, az, dx, dy, dz, a) {
        if (this.fxDirty || this.fxFlare !== (this.weather !== null && this.weather.e.shieldsOff))
            this.fxRefresh();
        const L = this.fxDomes;
        let best = Infinity;
        for (let i = 0; i < L.length; i += 4) {
            const fx = ax - L[i], fy = ay - L[i + 1], fz = az - L[i + 2], r = L[i + 3];
            const b = fx * dx + fy * dy + fz * dz, c = fx * fx + fy * fy + fz * fz - r * r;
            const disc = b * b - a * c;
            if (disc < 0)
                continue;
            const sq = Math.sqrt(disc);
            const t = c < 0 ? (-b + sq) / a : (-b - sq) / a; // inside: where it leaves; outside: where it enters
            if (t >= 0 && t <= 1 && t < best)
                best = t;
        }
        return best;
    }
    // ------------------------------------------------------------ detection
    sensorSweep(s) {
        const t = this.etype[s];
        const range = this.d.tSensor[t];
        if (range <= 0)
            return;
        // visual detection needs line of sight and is capped by fog; radar (effects.radar) ignores both at radarRangeMultiplier x range
        // designer playtest 15 Nov 21:41 ("enemies appear out of thin air nearby"): a pilot or vehicle under a player's
        // direct control sees with its eyes out to constants.combat.playerSightMetres (line of sight, fog cap and
        // signature still apply in sweepFrom), not only its sensor range
        const ps = Math.min(this.d.playerSight, this.d.fogVisualRange), vis = this.ctlOn[s] && ps > this.tVisual[t] ? ps : this.tVisual[t];
        this.sweepFrom(this.team[s], this.x[s], this.y[s] + this.d.tRadius[t], this.z[s], vis, this.tRadarRange[t], this.relief !== null && !this.d.tAir[t] && this.airborne[s] === exports.AIR_GROUND ? this.y[s] : NaN);
    }
    /**
     * S9 point sensors (doc 6 "250 m at a point"): every held strategic point sees for its owner with
     * points.controlNode.sensorRange (capped by fog), visual only, from stealth.pointSensorHeightMetres above
     * the ground at the point centre. Staggered like unit sweeps: point p sweeps when (tick + p) % interval = 0.
     */
    pointSweeps(tick, di) {
        const P = this.pts;
        if (!P || !(this.pointSensor > 0))
            return 0;
        let n = 0;
        for (let p = 0; p < P.n; p++) {
            const own = P.owner[p];
            if (own < 0 || (tick + p) % di !== 0)
                continue;
            const x = P.px[p], z = P.pz[p];
            this.sweepFrom(own, x, this.terrain.height(x, z) + this.d.constants.pointSensorHeight, z, this.pointSensor, 0, this.relief !== null ? this.terrain.height(x, z) : NaN);
            n++;
        }
        return n;
    }
    /** Muzzle reveal (S9, stealth.muzzleRevealSeconds): slot s is detected by `team` for that long from now. */
    muzzleReveal(s, team) {
        const k = this.d.constants.muzzleRevealTicks;
        if (k <= 0 || team === this.team[s] || team < 0 || team >= exports.MAX_TEAMS)
            return;
        const i = s * exports.MAX_TEAMS + team, e = this.tick + k;
        if (this.detExpiry[i] < e)
            this.detExpiry[i] = e;
    }
    // scratch (not state) of muzzleRevealIn's grid visit
    mrTeam = 0;
    mrX = 0;
    mrZ = 0;
    mrR2 = 0;
    mrMask = 0;
    mrVisit = (o) => {
        if (!this.alive[o] || this.hp[o] <= 0)
            return;
        const t = this.team[o];
        if (t === this.mrTeam || t >= exports.MAX_TEAMS || (this.mrMask & (1 << t)) !== 0)
            return;
        const dx = this.px[o] - this.mrX, dz = this.pz[o] - this.mrZ;
        if (dx * dx + dz * dz <= this.mrR2)
            this.mrMask |= 1 << t;
    };
    /**
     * Rulings 50 / 52: a unit that fires weapon w is revealed (muzzleReveal, the existing 4 s) only to the teams that have a
     * live unit or building within that weapon's own range of it, so long-range fire stays hidden from teams farther away.
     * `targetTeam` (the team fired at; -1 for aimed player fire and ground shelling, which follow the same range rule) is
     * revealed to as well: what a weapon engages is within its reach.
     */
    muzzleRevealIn(s, w, targetTeam) {
        if (this.d.constants.muzzleRevealTicks <= 0)
            return;
        const r = this.d.wRange[w];
        this.mrTeam = this.team[s];
        this.mrX = this.x[s];
        this.mrZ = this.z[s];
        this.mrR2 = r * r;
        this.mrMask = 0;
        this.coarse.query(this.x[s], this.z[s], r, this.mrVisit);
        if (targetTeam >= 0 && targetTeam < exports.MAX_TEAMS)
            this.mrMask |= 1 << targetTeam;
        for (let k = 0; k < exports.MAX_TEAMS; k++)
            if ((this.mrMask & (1 << k)) !== 0)
                this.muzzleReveal(s, k);
    }
    /** gy: the sensor's ground height for the T1 high-ground sight bonus (NaN: none). */
    sweepFrom(team, sx, sy, sz, visual, radar, gy = NaN) {
        const wx = this.weather;
        if (wx !== null) {
            visual = wx.visual(visual);
            radar = wx.radar(radar);
        } // wave 2 D: dust storm, fog, night
        const dd = this.d, cc = dd.constants, tick = this.tick, firingTicks = this.firingTicks;
        const fireF = cc.firingSignatureFactor, idleF = cc.idleSignatureFactor, airlessF = dd.airless ? 1 - cc.airlessSignatureReduction : 1;
        // a contact stays detected for lostAfterSeconds after the last sweep that saw it (doc 14 "Lost")
        const expiry = this.tick + this.d.constants.lostAfterTicks;
        const g = this.coarse;
        const hgR = gy === gy ? this.relief : null; // T1: high ground sees farther (gy not NaN)
        const r = (visual * (hgR !== null ? 1 + hgR.hgSight : 1) > radar ? visual * (hgR !== null ? 1 + hgR.hgSight : 1) : radar) * this.d.maxSignature + this.moveMargin;
        const c0 = g.cellOf(sx - r), c1 = g.cellOf(sx + r), r0 = g.cellOf(sz - r), r1 = g.cellOf(sz + r);
        const side = g.cellsPerSide, start = g.bucketStart, ent = g.entries, ek = g.entryKey, mask = g.mask;
        for (let cz = r0; cz <= r1; cz++)
            for (let cx = c0; cx <= c1; cx++) {
                const key = cz * side + cx;
                const b = (Math.imul(key, 0x9e3779b1) >>> 16) & mask;
                for (let p = start[b], e = start[b + 1]; p < e; p++) {
                    if (ek[p] !== key)
                        continue;
                    const o = ent[p];
                    if (this.team[o] === team)
                        continue;
                    const i = o * exports.MAX_TEAMS + team;
                    if (this.detExpiry[i] >= expiry)
                        continue; // already seen by a teammate this tick
                    const dx = this.x[o] - sx, dz = this.z[o] - sz, d2 = dx * dx + dz * dz;
                    // effective signature (signatureTo, inlined: a call here made V8 box doubles)
                    const ot = this.etype[o];
                    let sig = dd.tSignature[ot];
                    if (this.slotPilot[o] !== 0) {
                        // designer playtest 16 Nov: a cloaked pilot is seen only within stealth.cloak.revealMetres (bumping into it)
                        if (this.d.cloakReveal > 0 && (0, pilotkit_ts_1.pilotCloaked)(this, o) && d2 > this.d.cloakReveal * this.d.cloakReveal)
                            continue;
                        sig *= (0, pilotkit_ts_1.pilotSignatureMultiplier)(this, o); // doc 14: crouched / cloaked pilot (pilotkit.ts hook)
                    }
                    sig *= (0, stealth_ts_1.stealthSigMul)(this, o); // w2f: jetpack burn x2, bike cloak (stealth.ts)
                    const low = this.lowRules !== null && this.lowFly[o] === 1 && this.lowNow(o);
                    if (low)
                        sig *= this.lowRules.sig; // ruling 41: low flight
                    if (tick - this.lastFired[o] < firingTicks)
                        sig *= fireF;
                    else if (!dd.tStructure[ot]) {
                        if (dd.tVehicle[ot] && !dd.tAir[ot] && this.velX[o] === 0 && this.velZ[o] === 0)
                            sig *= idleF;
                        sig *= airlessF;
                    }
                    const tl = this.tlayer;
                    if (this.envOn) {
                        sig *= (0, env_ts_1.envSignature)(this, o);
                        if (wx !== null && sig < wx.e.hide)
                            continue;
                    } // wave 2 D: terrain concealment / plumes; ash fall hides
                    const rl = radar * sig;
                    if (d2 <= rl * rl && (tl === null || tl.radarReaches(sx, sz, this.x[o], this.z[o])) && !(this.stl !== null && this.stl.jammers.length > 0 && (0, stealth_ts_1.jammedFromRadar)(this, o)) && (!low || this.terrainClear(sx, sy, sz, o))) {
                        this.detExpiry[i] = expiry;
                        continue;
                    } // radar contact (w2f: not inside its team's jammer; ruling 41: a low aircraft only with terrain line of sight)
                    let lim = visual * sig;
                    if (hgR !== null)
                        lim *= 1 + hgR.hgSight * (0, relief_ts_1.highGroundK)(hgR, gy - this.y[o]); // T1: looking down from high ground
                    if (d2 > lim * lim)
                        continue;
                    // w2a smoke screen: a sight line through an active smoke line is blocked (radar is not)
                    if (this.calls !== null && this.calls.effects.length && this.smokeBlocks(sx, sz, this.x[o], this.z[o]))
                        continue;
                    // visual detection needs line of sight over the terrain
                    const q = this.sc;
                    q[SA_X] = sx;
                    q[SA_Y] = sy;
                    q[SA_Z] = sz;
                    q[SB_X] = this.x[o];
                    q[SB_Y] = (this.y[o] + this.d.tRadius[this.etype[o]]);
                    q[SB_Z] = this.z[o];
                    this.terrainSeg();
                    if (q[S_TERR] < 1)
                        continue;
                    if (tl !== null && tl.sightBlocked(sx, sz, this.x[o], this.z[o]))
                        continue; // wave 2 D: rock forest breaks line of sight
                    this.detExpiry[i] = expiry;
                }
            }
    }
    /**
     * QA3-3: does sensor slot o (an enemy of the decoy's team) detect a decoy beacon of `team` at (x, z)? The decoy is
     * judged as an active (not idle: it fakes a working tank's signature, as w2f defined) unit of the fake type
     * (stealth.decoyBeacon.fakeUnit) standing there, by sweepFrom's rules: the observer's visual and radar ranges with the
     * weather applied (fog cap, dust, night; radar-blind weather), fake signature x airless, terrain concealment of the cell, ash-fall hiding, radar blocked by the
     * terrain layer and by the decoy team's own jammer, visual blocked by smoke, terrain and line-of-sight-breaking cells.
     */
    decoySeenBy(o, team, x, z) {
        const dd = this.d, cc = dd.constants, R = this.stlRules, ft = R.decoyType, t = this.etype[o];
        if (ft < 0 || dd.tSensor[t] <= 0)
            return false;
        let visual = this.tVisual[t], radar = this.tRadarRange[t];
        const wx = this.weather;
        if (wx !== null) {
            visual = wx.visual(visual);
            radar = wx.radar(radar);
        }
        let sig = dd.tSignature[ft];
        if (!dd.tStructure[ft] && dd.airless)
            sig *= 1 - cc.airlessSignatureReduction; // an active fake: no idle factor (w2f)
        const tl = this.tlayer;
        if (this.envOn) {
            if (tl !== null && !dd.tAir[ft] && !dd.tStructure[ft])
                sig *= tl.sig[tl.typeAt(x, z, wx !== null ? wx.soft() : false)];
            if (wx !== null && sig < wx.e.hide)
                return false;
        }
        const sx = this.x[o], sy = this.y[o] + dd.tRadius[t], sz = this.z[o];
        const dx = x - sx, dz = z - sz, d2 = dx * dx + dz * dz;
        const rl = radar * sig;
        if (d2 <= rl * rl && (tl === null || tl.radarReaches(sx, sz, x, z)) && !(0, stealth_ts_1.jammerCovers)(this, team, x, z))
            return true;
        const lim = visual * sig;
        if (d2 > lim * lim)
            return false;
        if (this.calls !== null && this.calls.effects.length && this.smokeBlocks(sx, sz, x, z))
            return false;
        const q = this.sc;
        q[SA_X] = sx;
        q[SA_Y] = sy;
        q[SA_Z] = sz;
        q[SB_X] = x;
        q[SB_Y] = this.terrain.height(x, z) + dd.tRadius[ft];
        q[SB_Z] = z;
        this.terrainSeg();
        if (q[S_TERR] < 1)
            return false;
        if (tl !== null && tl.sightBlocked(sx, sz, x, z))
            return false;
        return true;
    }
    // ------------------------------------------------------------ targeting
    /**
     * Primary target: the forced `attack` target if valid, else the nearest
     * detected enemy any mount can damage, within max(weapon range, sensor range).
     * Each mount then fires at the primary target if it can damage it and it is in
     * that mount's range; otherwise at the nearest enemy it can damage within its
     * own range; otherwise it waits for the primary target.
     */
    acquireTargets(s) {
        const d = this.d;
        const team = this.team[s];
        const sx = this.x[s], sz = this.z[s];
        const mc = this.mCount[s], mb = s * data_ts_1.MAX_MOUNTS;
        // mounts the AI aims: crewed (mOn), not a kit weapon, not under a player's direct control
        let auto = 0;
        {
            const tb = this.etype[s] * data_ts_1.MAX_MOUNTS, cm = this.ctlMask[s];
            for (let m = 0; m < mc; m++) {
                const j = d.tMountCrewSeat[tb + m];
                if (this.mOn[mb + m] && !d.tMountManual[tb + m] && !(j >= 0 && ((cm >> j) & 1)))
                    auto |= 1 << m;
            }
        }
        if (auto !== 0 && (this.ord.hold.size || this.ord.ext.size)) {
            // s5: hold fire (an explicit attack order still fires at its target), and a retreat, ignore targets
            const id = this.eid[s];
            if ((this.ord.hold.has(id) && this.ordType[s] !== exports.ORD_ATTACK) || this.ord.ext.get(id)?.kind === orders_ts_1.OK_RETREAT)
                auto = 0;
        }
        if (auto === 0) {
            this.tgtSlot[s] = -1;
            this.tgtId[s] = 0;
            for (let m = 0; m < mc; m++) {
                this.mTgtSlot[mb + m] = -1;
                this.mTgtId[mb + m] = 0;
            }
            return;
        }
        const skipEmpty = d.crewOn;
        let forced = -1;
        if (this.ordType[s] === exports.ORD_ATTACK) {
            const ts = this.idToSlot.get(this.ordTargetId[s]);
            if (ts !== undefined && this.alive[ts] && this.hp[ts] > 0 && this.team[ts] !== team && this.detected(ts, team))
                forced = ts;
            else {
                // target dead or lost: the order ends (recorded, not silent; a guard / defend engagement just ends: its controller picks the next)
                this.ordType[s] = exports.ORD_NONE;
                this.ramPhase[s] = 0;
                const gone = ts === undefined || !this.alive[ts] || this.hp[ts] <= 0;
                if (!(this.ord.ext.size && this.ord.ext.has(this.eid[s])))
                    this.orderEvents.push({ tick: this.tick, seq: 0, id: this.eid[s], reason: gone ? "targetDestroyed" : "targetLost" });
            }
        }
        const t = this.etype[s];
        let acq = d.tStructure[t] ? this.maxRange[s] : Math.max(this.maxRange[s], d.tSensor[t]);
        if (this.relief !== null)
            acq *= 1 + this.relief.hgRange; // T1: high ground reaches farther
        const acq2 = acq * acq;
        let best = -1, bestD = Infinity;
        const armedFirst = d.constants.armedTargetsFirst;
        const focus = this.uai !== null ? this.uai.focus : 0;
        const mBest = this.scratchBest, mBestD = this.scratchBestD;
        for (let m = 0; m < mc; m++) {
            mBest[m] = -1;
            mBestD[m] = Infinity;
        }
        const g = this.coarse;
        const c0 = g.cellOf(sx - acq), c1 = g.cellOf(sx + acq), r0 = g.cellOf(sz - acq), r1 = g.cellOf(sz + acq);
        const side = g.cellsPerSide, start = g.bucketStart, ent = g.entries, ek = g.entryKey, mask = g.mask;
        for (let cz = r0; cz <= r1; cz++)
            for (let cx = c0; cx <= c1; cx++) {
                const key = cz * side + cx;
                const b = (Math.imul(key, 0x9e3779b1) >>> 16) & mask;
                for (let p = start[b], e = start[b + 1]; p < e; p++) {
                    if (ek[p] !== key)
                        continue;
                    const o = ent[p];
                    if (this.team[o] === team || this.hp[o] <= 0)
                        continue;
                    if (skipEmpty && this.nOcc[o] === 0 && d.tDriverSeat[this.etype[o]] >= 0)
                        continue; // an empty, intact vehicle is no threat (left to be boarded)
                    const dx = this.x[o] - sx, dz = this.z[o] - sz;
                    const d2 = dx * dx + dz * dz;
                    if (d2 > acq2)
                        continue;
                    if (!this.detected(o, team))
                        continue;
                    // S9 threat first: an enemy with no ranged weapon (unarmed structure, economy vehicle) ranks behind every armed
                    // one; the key is the distance squared plus a constant beyond any acquisition range (no data value involved)
                    let rk = !armedFirst || this.aiArmed(o) ? d2 : d2 + UNARMED_RANK;
                    if (focus > 0) {
                        const hf = this.hp[o] / d.tHp[this.etype[o]];
                        if (hf < 1)
                            rk -= d2 * focus * (1 - (hf > 0 ? hf : 0));
                    } // w3b focus fire: the damaged first
                    let any = false;
                    const hk = this.relief !== null ? 1 + this.relief.hgRange * this.hgOver(s, o) : 1; // T1: high ground
                    for (let m = 0; m < mc; m++) {
                        const w = this.mWeapon[mb + m];
                        if (!((auto >> m) & 1) || !this.canHit(w, o))
                            continue;
                        any = true;
                        if (d.wAiMask[w] !== 0 && !((d.wAiMask[w] >> d.tArmour[this.etype[o]]) & 1))
                            continue; // ruling 91: AI target classes of this mount
                        const r = d.wRange[w] * hk, mr = d.wMinRange[w];
                        const bd = mBestD[m], bo = mBest[m]; // read on every path (no late-feedback deopt)
                        if (d2 <= r * r && d2 >= mr * mr && (rk < bd || (rk === bd && this.phaseOf(o) < this.phaseOf(bo)))) {
                            mBest[m] = o;
                            mBestD[m] = rk;
                        }
                    }
                    if (any && (rk < bestD || (rk === bestD && this.phaseOf(o) < this.phaseOf(best)))) {
                        best = o;
                        bestD = rk;
                    } // T1: ties by the id hash, not the slot
                }
            }
        const prim = forced >= 0 ? forced : best;
        if (prim !== this.tgtSlot[s])
            this.noLos[s] = 0;
        this.tgtSlot[s] = prim;
        this.tgtId[s] = prim >= 0 ? this.eid[prim] : 0;
        let pd2 = Infinity;
        const stc = d.tStructure[this.etype[s]] !== 0;
        if (prim >= 0) {
            const dx = this.x[prim] - sx, dz = this.z[prim] - sz;
            pd2 = dx * dx + dz * dz;
        }
        const phk = prim >= 0 && this.relief !== null ? 1 + this.relief.hgRange * this.hgOver(s, prim) : 1; // T1
        for (let m = 0; m < mc; m++) {
            const w = this.mWeapon[mb + m], r = d.wRange[w] * phk, mr = d.wMinRange[w];
            // mBest[m] is read on every path: a keyed load first reached late in a run
            // made V8 deoptimise acquireTargets ("insufficient type feedback"), costing
            // ~3 slow ticks (bench/ticks.ts evidence in the stage-0 update-2 report).
            const own = mBest[m];
            let pick = own;
            // H1: a structure turret neither tracks nor fires at a target inside its minRange (players can get under it)
            if (prim >= 0 && this.canHit(w, prim) && (d.wAiMask[w] === 0 || ((d.wAiMask[w] >> d.tArmour[this.etype[prim]]) & 1)) && ((pd2 <= r * r && pd2 >= mr * mr) || (own < 0 && (mr === 0 || pd2 >= mr * mr || !stc))))
                pick = prim; // ruling 91: AI target classes
            if (!((auto >> m) & 1))
                pick = -1;
            this.mTgtSlot[mb + m] = pick;
            this.mTgtId[mb + m] = pick >= 0 ? this.eid[pick] : 0;
        }
    }
    scratchBest = new Int32Array(data_ts_1.MAX_MOUNTS);
    scratchBestD = new Float64Array(data_ts_1.MAX_MOUNTS);
    /**
     * Shortest range among this entity's ranged mounts that can damage `ts` (units
     * close to it). Melee mounts are ignored here: a unit with guns does not drive
     * into contact because it also carries a melee tool.
     */
    engageRange(s, ts) {
        let r = Infinity;
        const mc = this.mCount[s], mb = s * data_ts_1.MAX_MOUNTS;
        for (let m = 0; m < mc; m++) {
            const w = this.mWeapon[mb + m];
            if (this.d.wMelee[w])
                continue;
            if (this.canHit(w, ts) && this.d.wRange[w] < r)
                r = this.d.wRange[w];
        }
        this.sc[S_RET] = r === Infinity ? this.maxRange[s] : r; // result in scratch: a returned double is boxed
    }
    /**
     * Melee reach of s against ts: centre distance at which a melee mount touches
     * it (both body radii + the weapon's range, i.e. range is the surface gap).
     * Returns -1 if no melee mount can damage ts.
     */
    meleeReach(s, ts) { this.meleeReachQ(s, ts); return this.sc[S_RET]; }
    /** meleeReach into sc[S_RET]. */
    meleeReachQ(s, ts) {
        let r = Infinity;
        const mc = this.mCount[s], mb = s * data_ts_1.MAX_MOUNTS, d = this.d;
        for (let m = 0; m < mc; m++) {
            const w = this.mWeapon[mb + m];
            if (d.wMelee[w] && this.canHit(w, ts) && d.wRange[w] < r)
                r = d.wRange[w];
        }
        this.sc[S_RET] = r === Infinity ? -1 : d.tRadius[this.etype[s]] + d.tRadius[this.etype[ts]] + r;
    }
    /**
     * How far beyond contact a ram unit backs off before charging again: enough
     * to turn round (2 x its turning radius speed / turnRate) and at least half a
     * ram cooldown of driving, so it arrives aligned, at top speed and with the
     * plow ready. Derived from data (speed, turnRate, shotsPerSecond).
     */
    ramBackoff(s) {
        const d = this.d, t = this.etype[s];
        let period = 0;
        const mc = this.mCount[s], mb = s * data_ts_1.MAX_MOUNTS;
        for (let m = 0; m < mc; m++) {
            const w = this.mWeapon[mb + m];
            if (d.wRam[w] && d.wPeriod[w] > period)
                period = d.wPeriod[w];
        }
        const speed = d.tSpeed[t];
        const turn = d.tTurnRate[t] > 0 ? (2 * speed) / d.tTurnRate[t] : 0;
        this.sc[S_RET] = Math.max(0.5 * speed * period, turn);
    }
    hasRam(s) {
        const mc = this.mCount[s], mb = s * data_ts_1.MAX_MOUNTS;
        for (let m = 0; m < mc; m++)
            if (this.d.wRam[this.mWeapon[mb + m]])
                return true;
        return false;
    }
    // ------------------------------------------------------------ movement
    /** Turns the hull towards unit vector sc[S_DIRX], sc[S_DIRZ] by at most turnRate * dt. New alignment (cos) in sc[S_ALIGN]. */
    turnToward(s) {
        const d = this.d, t = this.etype[s], q = this.sc;
        const dx = q[S_DIRX], dz = q[S_DIRZ];
        let fx = this.dirX[s], fz = this.dirZ[s];
        const dot = fx * dx + fz * dz;
        const cosT = d.tCosTurn[t];
        if (dot >= cosT) {
            fx = dx;
            fz = dz;
        }
        else {
            const sn = (fx * dz - fz * dx) >= 0 ? d.tSinTurn[t] : -d.tSinTurn[t];
            const rx = fx * cosT - fz * sn, rz = fx * sn + fz * cosT;
            const l = Math.sqrt(rx * rx + rz * rz);
            fx = rx / l;
            fz = rz / l;
        }
        this.dirX[s] = fx;
        this.dirZ[s] = fz;
        q[S_ALIGN] = fx * dx + fz * dz;
    }
    /**
     * Wave 2 D: speed factor of slot s from the planet (hover top speed), the terrain cell it stands on (terrain layer)
     * and the weather (aircraft in a dust storm). Exactly 1 with no planet effect, no terrain layer and no weather.
     */
    speedFactor(s) {
        const t = this.etype[s];
        let f = this.planet.typeSpeed[t];
        if (this.envOn)
            f *= (0, env_ts_1.envSpeedFactor)(this, s, this.airborne[s] === exports.AIR_GROUND);
        if (this.lowFly[s] && this.lowRules && this.d.tAir[t] && this.airS[s])
            f *= this.lowRules.speed; // ruling 41
        if (this.bfx !== null && this.bfx.R.harvester[t])
            f *= this.bfx.speedMul(this, s); // fix-qa2: Tech Lab faster harvesters
        if (this.relief !== null)
            f *= this.slopeFactor(s); // T1: climbing slows
        return f;
    }
    /** Wave 2 D: a terrain layer or a weather schedule is present (env.ts); false keeps every rule as before. */
    envOn = false;
    /** T1 (ruling 116): relief rules of the planet (slope speed and blocking, high ground, build slope); null: none (Halcyon). */
    relief = null;
    /** T1: weapon range factor of the shot being fired (high ground; 1 otherwise). Scratch, not state. */
    hgK = 1;
    /** T1: high-ground factor 0..1 of ground slot s over slot o (0 without relief, for aircraft and pilots in the air). */
    hgOver(s, o) {
        const R = this.relief;
        if (R === null || this.d.tAir[this.etype[s]] || this.airborne[s] !== exports.AIR_GROUND)
            return 0;
        return (0, relief_ts_1.highGroundK)(R, this.y[s] - this.y[o]);
    }
    /** T1: may ground slot s (type t) move from (ox, oz) to (nx, nz) on the relief? A hopping hover vehicle passes where its body is above the ground ahead. */
    slopeOk(s, t, hov, ox, oz, nx, nz) {
        const k = this.d.tMove[t]; // W1: movement class (walker: its own slope limit)
        if (k >= pathfinding_ts_1.NAV_CLASSES || this.nav.slopeStepOk(ox, oz, nx, nz, k))
            return true;
        return hov && this.hopH[s] > 0 && this.y[s] > this.terrain.height(nx, nz) + 0.5;
    }
    /** T1: relief slope speed factor of ground slot s: its class climbing the grade along its motion (facing when still). */
    slopeFactor(s) {
        const R = this.relief, t = this.etype[s], d = this.d;
        if (R === null || d.tAir[t] || d.tStructure[t] || this.airborne[s] !== exports.AIR_GROUND)
            return 1;
        let ux = this.velX[s], uz = this.velZ[s], l = ux * ux + uz * uz;
        if (l > 0.25) {
            l = Math.sqrt(l);
            ux /= l;
            uz /= l;
        }
        else {
            ux = this.dirX[s];
            uz = this.dirZ[s];
        }
        const x = this.x[s], z = this.z[s], e = 3;
        const g = (this.terrain.height(x + ux * e, z + uz * e) - this.terrain.height(x - ux * e, z - uz * e)) / (2 * e);
        return (0, relief_ts_1.slopeSpeedFactor)(R, d.tMove[t], g);
    }
    /** Wave 2 D: the terrain type layer (null: none). */
    tlayer = null;
    /** Wave 2 D: the weather schedule (weather.ts; null: none). */
    weather = null;
    /** Wave 2 D: current weather and the forecast (null without a weather schedule). */
    weatherView() { return this.weather ? this.weather.view(this.tick) : null; }
    /** Wave 2 D: environmental damage to the hull / body of slot s (lava, weather): no shields, no shooter. */
    envDamage(s, dmg) {
        if (!(dmg > 0) || this.hp[s] <= 0)
            return;
        const d = this.d, t = this.etype[s];
        this.hp[s] -= dmg;
        this.lastHit[s] = this.tick;
        if (this.hp[s] > 0)
            return;
        if (d.crewOn && d.tDriverSeat[t] >= 0 && d.crew.critClass[d.tArmour[t]] === 1) {
            if (this.critTick[s] < 0) {
                this.hp[s] = 0;
                this.critTick[s] = this.tick;
            }
        }
        else {
            this.hp[s] = 0;
            this.dying[this.nDying++] = s;
            if (this.slotPilot[s] !== 0)
                this.outright.add(s);
        }
    }
    /** Wave 2 D: construction may build at (x, z) (terrain layer buildable; no layer: everywhere). */
    buildableAt(x, z) {
        if (this.tlayer !== null && !this.tlayer.buildableAt(x, z))
            return false;
        if (this.relief !== null) { // T1: not on a slope steeper than relief.buildSlopeDegrees
            const e = 4, gx = (this.terrain.height(x + e, z) - this.terrain.height(x - e, z)) / (2 * e), gz = (this.terrain.height(x, z + e) - this.terrain.height(x, z - e)) / (2 * e);
            if (gx * gx + gz * gz > this.relief.build2)
                return false;
        }
        return true;
    }
    wxEmit = (w, phase, ticks, entry) => { this.events.push(events_ts_1.EV.WEATHER, this.tick, NO_TEAM, w, phase, ticks, entry, 0, 0, entry & 255); if (phase === 0)
        (0, s15_ts_1.ashForecast)(this, w, ticks); }; // ruling 67: forecast warning to teams with aircraft up
    envHurt = (s, dmg) => this.envDamage(s, dmg);
    /**
     * Ruling 67: aircraft slot s is held on the ground by ash fall (s15.ts ashDown record a): no horizontal movement; in
     * the air it comes straight down over crashLandSeconds and, on touchdown, loses crashLandHullFraction of its current
     * hull once (never to zero: the crew stays aboard alive).
     */
    /**
     * Ruling 71: aircraft slot s, hit by an EMP burst in flight, falls straight down under the planet's gravity (it keeps
     * falling after the EMP ends) and is destroyed when it reaches the ground: the hull goes to zero, the crew eject
     * automatically (rulings 34 and 51) and AIRCRAFT_DOWN is logged as for any aircraft shot down.
     */
    empFall(s) {
        const d = this.d, dt = d.dt, rec = this.s15.empFall.get(this.eid[s]);
        this.velX[s] = 0;
        this.velZ[s] = 0;
        rec[0] -= d.gravity * dt;
        this.flyAlt[s] = Math.max(0, this.flyAlt[s] + rec[0] * dt);
        const q = this.sc;
        q[S_GX] = this.x[s];
        q[S_GZ] = this.z[s];
        this.groundAt(S_GX);
        this.y[s] = q[S_GY] + this.flyAlt[s];
        if (this.flyAlt[s] <= 0) {
            this.s15.empFall.delete(this.eid[s]);
            this.envDamage(s, this.hp[s] + 1);
        } // hits the ground: destroyed (still flagged airborne: a crash)
    }
    ashHold(s, a) {
        const ox = this.x[s], oz = this.z[s];
        this.velX[s] = 0;
        this.velZ[s] = 0;
        if (this.flyAlt[s] > 0) {
            const k = (0, s15_ts_1.ashCrash)(this);
            this.flyAlt[s] = Math.max(0, this.flyAlt[s] - k.perTick);
            if (this.flyAlt[s] <= 0) {
                this.airS[s] = 0;
                this.events.push(events_ts_1.EV.AIRCRAFT_LANDING, this.tick, this.team[s], this.eid[s], 0, 0, this.detMask(s), ox, oz, 1);
                if (a[0] === 1 && a[1] === 0) {
                    a[1] = 1;
                    const lost = this.hp[s] * k.hull;
                    this.hp[s] -= lost;
                    this.lastHit[s] = this.tick;
                    this.events.push(events_ts_1.EV.ASH_CRASH, this.tick, this.team[s], this.eid[s], 2, Math.round(lost), 0, ox, oz, 0);
                }
            }
        }
        const q = this.sc;
        q[S_GX] = ox;
        q[S_GZ] = oz;
        this.groundAt(S_GX);
        this.y[s] = q[S_GY] + this.flyAlt[s];
    }
    moveUnit(s) {
        const d = this.d, c = d.constants, dt = d.dt, t = this.etype[s];
        const ox = this.x[s], oz = this.z[s];
        let gx = 0, gz = 0, hasGoal = false, faceTarget = false;
        const ord = this.ordType[s];
        const ts = this.tgtSlot[s];
        // Melee-only units (economy vehicles) close on a target only under an explicit
        // `attack` order; under attackMove they keep to their waypoints and hit what
        // they touch, and they never chase on their own.
        const meleeOnly = d.tMeleeOnly[t] === 1;
        const nl = this.noLos[s];
        let sidestep = false;
        const pilotT = d.crewOn && t === d.pilotType;
        // crewed vehicles move only with a ready driver (a player in direct control, or the AI pilot); legacy
        // whole-entity control (queueControl, ctlMask 0) drives regardless
        const crewed = d.crewOn && d.tDriverSeat[t] >= 0, canDrive = !crewed || this.drv[s] === 1;
        const ctl = this.ctlOn[s] === 1 && (this.ctlMask[s] === 0 || canDrive); // direct control: orders and targets are ignored (see controlSteer)
        if (d.tAir[t] && this.s15 !== null && this.s15.ashDown.size > 0) {
            const a = this.s15.ashDown.get(this.eid[s]);
            if (a !== undefined) {
                this.ashHold(s, a);
                return;
            }
        } // ruling 67
        if (pilotT && this.airborne[s] !== exports.AIR_GROUND && this.ctlOn[s] === 0) {
            // airborne pilot without control (ejected AI crew): drifts with its horizontal velocity, falls under gravity
            const ms = this.mapSize;
            let nx = ox + this.velX[s] * dt, nz = oz + this.velZ[s] * dt;
            nx = Math.min(ms, Math.max(0, nx));
            nz = Math.min(ms, Math.max(0, nz)); // clamp in float64 (no boxed doubles)
            this.x[s] = nx;
            this.z[s] = nz;
            this.pilotVertical(s);
            this.velX[s] = (nx - ox) / dt;
            this.velZ[s] = (nz - oz) / dt;
            return;
        }
        let landing = false; // aircraft answering a pickup: lands beside the pilot
        let finD = -1; // ruling 112: distance to the last waypoint of a move (an AI hover vehicle brakes to stop on it); -1 = not one
        if (ctl || (crewed && !canDrive && this.ctlOn[s] === 0)) { /* no goal: controlled, or no driver (the hull holds still) */ }
        else if (ord === exports.ORD_PICKUP) {
            const p = this.pilots.get(this.ordTargetId[s]);
            const ps = p && p.state === exports.P_FOOT ? this.idToSlot.get(p.entity) : undefined;
            if (ps === undefined) {
                this.ordType[s] = exports.ORD_NONE;
                this.orderEvents.push({ tick: this.tick, seq: 0, id: this.eid[s], reason: "pickupEnded" });
                this.events.push(events_ts_1.EV.REJECT, this.tick, this.team[s], 0, this.eid[s], reasonCode("pickupEnded"), 0, 0, 0, 0);
            }
            else if (this.gap(s, ps) > d.crew.pickupGap) {
                gx = this.x[ps];
                gz = this.z[ps];
                hasGoal = true;
            }
            else {
                landing = d.tAir[t] === 1;
                const dx = this.x[ps] - ox, dz = this.z[ps] - oz, l = Math.sqrt(dx * dx + dz * dz);
                if (l > 1e-9) {
                    this.sc[S_DIRX] = dx / l;
                    this.sc[S_DIRZ] = dz / l;
                    this.turnToward(s);
                } // stopped beside the pilot, facing it
                if (!landing || this.airS[s] === 0)
                    this.pickupArrived.push(s); // ruling 19: arrived (an aircraft once landed); the AI pilot climbs out after the movement phase
            }
        }
        else if (ts >= 0 && (ord === exports.ORD_ATTACK || (ord === exports.ORD_ATTACK_MOVE && !meleeOnly && !(this.uai !== null && this.leashed(s, ts))))) {
            const dx = this.x[ts] - ox, dz = this.z[ts] - oz;
            const d2 = dx * dx + dz * dz;
            if (meleeOnly) {
                this.meleeReachQ(s, ts);
                const reach = this.sc[S_RET];
                if (reach < 0)
                    faceTarget = true;
                else if (this.hasRam(s) && ord === exports.ORD_ATTACK) {
                    // ram: charge; after a hit (or when pressed against the target without
                    // closing) back off far enough to turn and come in again at speed
                    if (this.ramPhase[s] === 1) {
                        this.ramBackoff(s);
                        const back = reach + this.sc[S_RET];
                        if (d2 >= back * back) {
                            this.ramPhase[s] = 0;
                            gx = this.x[ts];
                            gz = this.z[ts];
                        }
                        else {
                            const l = Math.sqrt(d2);
                            const ux = l > 1e-9 ? -dx / l : -this.dirX[s], uz = l > 1e-9 ? -dz / l : -this.dirZ[s];
                            gx = this.x[ts] + ux * (back + d.tRadius[t]);
                            gz = this.z[ts] + uz * (back + d.tRadius[t]);
                        }
                    }
                    else {
                        gx = this.x[ts];
                        gz = this.z[ts];
                    }
                    hasGoal = true;
                }
                else if (this.hasRam(s) || d2 > reach * reach) {
                    gx = this.x[ts];
                    gz = this.z[ts];
                    hasGoal = true;
                } // attackMove rams keep driving
                else
                    faceTarget = true; // arm: close to contact, then hold and face it
            }
            else {
                this.engageRange(s, ts);
                let engage = this.sc[S_RET] * c.engageRangeFraction;
                const U = this.uai;
                let kite = false;
                if (U !== null) {
                    // w3b: long guns hold at holdRangeFraction of their longest range; fast units back off from shorter-ranged targets
                    const own = this.sc[S_RET];
                    if (own >= U.longGun)
                        engage = Math.max(engage, this.maxRange[s] * U.holdFrac);
                    const tr = this.maxRange[ts] + U.kiteMargin;
                    if (d.tSpeed[t] >= U.kiteSpeed && this.maxRange[ts] > 0 && this.maxRange[ts] < own && d2 < tr * tr && nl === 0) {
                        const l = Math.sqrt(d2);
                        if (l > 1e-9) {
                            gx = ox - (dx / l) * (tr - l + 1);
                            gz = oz - (dz / l) * (tr - l + 1);
                            hasGoal = true;
                            kite = true;
                        }
                    }
                }
                // out of range, or the line of fire is blocked: close in; a friendly in the way: also strafe aside
                if (nl >= 2)
                    sidestep = true;
                if (kite) { /* goal set above */ }
                else if (nl !== 0) {
                    gx = this.x[ts];
                    gz = this.z[ts];
                    hasGoal = true;
                }
                else if (d2 > engage * engage) {
                    if ((d.tHover[t] === 1 || d.tWalk[t] === 1) && !pilotT) { // W1: a walker brakes and holds the same way
                        // m1 (smooth AI driving): a hover vehicle closing on its target brakes to stop at engage range (no full-speed
                        // arrival and hard stop), and one holding there (slow) waits until the target is HOVER_HOLD_MARGIN beyond it
                        // before closing again (no stop-start each time the target edges out of range)
                        const ex = Math.sqrt(d2) - engage, v2 = this.velX[s] * this.velX[s] + this.velZ[s] * this.velZ[s], slow = 0.3 * d.tSpeed[t];
                        if (v2 < slow * slow && ex < engage * HOVER_HOLD_MARGIN)
                            faceTarget = true;
                        else {
                            gx = this.x[ts];
                            gz = this.z[ts];
                            hasGoal = true;
                            finD = ex;
                        }
                    }
                    else {
                        gx = this.x[ts];
                        gz = this.z[ts];
                        hasGoal = true;
                    }
                }
                else
                    faceTarget = true;
            }
        }
        else if (ord === exports.ORD_ATTACK_GROUND && this.waypoints[s]) {
            // ruling 40 attack-ground: close to within the indirect weapons' range of the spot, then hold facing it
            const w = this.waypoints[s], dx = w[0] - ox, dz = w[1] - oz, d2 = dx * dx + dz * dz;
            let r = 0;
            for (let m = 0; m < this.mCount[s]; m++) {
                const wi = this.mWeapon[s * data_ts_1.MAX_MOUNTS + m];
                if (wi >= 0 && d.wBallistic[wi] === 1 && d.wRange[wi] > r)
                    r = d.wRange[wi];
            }
            const engage = r * c.engageRangeFraction;
            if (d2 > engage * engage) {
                gx = w[0];
                gz = w[1];
                hasGoal = true;
            }
            else {
                const l = Math.sqrt(d2);
                if (l > 1e-9) {
                    this.sc[S_DIRX] = dx / l;
                    this.sc[S_DIRZ] = dz / l;
                    this.turnToward(s);
                }
            }
        }
        else if ((ord === exports.ORD_MOVE || ord === exports.ORD_ATTACK_MOVE) && this.waypoints[s]) {
            const w = this.waypoints[s];
            let i = this.wpIdx[s];
            const ar = c.arrivalRadius;
            const hovAi = d.tHover[t] === 1 && !pilotT && d.tTurnRate[t] > 0;
            while (i < w.length / 2) {
                const dx = w[i * 2] - ox, dz = w[i * 2 + 1] - oz, d2 = dx * dx + dz * dz;
                if (d2 > ar * ar) {
                    // m1: an intermediate waypoint of a hover vehicle counts as passed within the turn-in distance of its corner
                    // (radius v / turnRate x tan(corner / 2), at most half the next leg): the hull carves the corner instead of
                    // overshooting the point and swinging back
                    if (!hovAi || i + 1 >= w.length / 2)
                        break;
                    const l1 = Math.sqrt(d2), ex = w[i * 2 + 2] - w[i * 2], ez = w[i * 2 + 3] - w[i * 2 + 1], l2 = Math.sqrt(ex * ex + ez * ez);
                    if (l2 < 1e-9) {
                        i++;
                        continue;
                    }
                    const cs = (dx * ex + dz * ez) / (l1 * l2), sn = Math.abs(dx * ez - dz * ex) / (l1 * l2);
                    const v = Math.sqrt(this.velX[s] * this.velX[s] + this.velZ[s] * this.velZ[s]);
                    let turnIn = 1 + cs > 1e-6 ? (v / d.tTurnRate[t]) * sn / (1 + cs) : l2;
                    if (turnIn > 0.5 * l2)
                        turnIn = 0.5 * l2;
                    if (l1 > turnIn)
                        break;
                }
                i++;
            }
            this.wpIdx[s] = i;
            if (i < w.length / 2) {
                gx = w[i * 2];
                gz = w[i * 2 + 1];
                hasGoal = true;
                if (i === w.length / 2 - 1) {
                    const fx = gx - ox, fz = gz - oz;
                    finD = Math.sqrt(fx * fx + fz * fz);
                }
            }
            else {
                this.waypoints[s] = null;
                if (ord === exports.ORD_MOVE)
                    this.ordType[s] = exports.ORD_NONE;
            }
        }
        let pad = -1; // w2c: an idle AI aircraft flies back to the nearest friendly Air Pad and lands beside it
        if (!hasGoal && !ctl && crewed && canDrive && d.tAir[t] && ts < 0 && ord === exports.ORD_NONE && this.ctlOn[s] === 0 && this.aiDriven(s)) {
            pad = this.nearestPad(s);
            if (pad >= 0) {
                this.gapQ(s, pad);
                if (this.sc[S_RET] > d.crew.padLandGap) {
                    gx = this.x[pad];
                    gz = this.z[pad];
                    hasGoal = true;
                }
                else
                    landing = true;
            }
        }
        if (!ctl && crewed && canDrive && d.tAir[t] && this.ctlOn[s] === 0 && (0, s15_ts_1.ammoReturning)(this, s) && this.aiDriven(s)) {
            // ruling 55: an AI aircraft with empty weapons flies to the nearest friendly Air Pad and stays landed there until rearmed
            const rp = this.nearestPad(s);
            if (rp >= 0) {
                pad = rp;
                this.gapQ(s, rp);
                if (this.sc[S_RET] > d.crew.padLandGap) {
                    gx = this.x[rp];
                    gz = this.z[rp];
                    hasGoal = true;
                }
                else {
                    landing = true;
                    hasGoal = false;
                }
            }
        }
        if (this.tp && d.tAir[t] && !ctl && this.aiDriven(s) && (0, transport_ts_1.tpWantsLand)(this, s))
            landing = true; // w2e: an AI Mule lands to board or unload infantry
        if (hasGoal && this.nav && !ctl && !(pilotT && this.airborne[s] !== exports.AIR_GROUND)) {
            // s6: ground units drive along a path around slopes and structures (open ground: the goal itself)
            const k = d.tMove[t]; // W1: movement class
            if (k < pathfinding_ts_1.NAV_CLASSES && this.nav.steer(this.eid[s], k, ox, oz, gx, gz, this.tick, this.nav.out)) {
                gx = this.nav.out[0];
                gz = this.nav.out[1];
            }
        }
        if (!ctl && !hasGoal && ts >= 0 && canDrive && ord !== exports.ORD_PICKUP && ord !== exports.ORD_ATTACK_GROUND) {
            if (nl >= 2 && ord === exports.ORD_NONE && !meleeOnly)
                sidestep = true;
            else if (!sidestep)
                faceTarget = true; // holding: turn to face what we shoot at
        }
        let nx = ox, nz = oz;
        // ruling 112: a hover vehicle (units.json handling) gathers what it wants to do this tick as a velocity (wX, wZ) and
        // its momentum follows that at the type's acceleration (hoverVel); other units move by it at once, as before
        const hov = d.tHover[t] === 1 && !pilotT;
        // W1: a walker (units.json walker) gathers its wanted speed along the hull (wF, m/s; negative: backwards) and its
        // speed follows that at walker.accel / walker.brake (walkVel); its velocity always lies along the hull (no sliding)
        const walk = d.tWalk[t] === 1 && !pilotT;
        let wX = 0, wZ = 0, wF = 0;
        if (d.tBoostMul[t] > 0)
            this.boostStep(s, t, ctl && !pilotT);
        if (ctl) {
            if (pilotT)
                this.pilotSteer(s);
            else
                this.controlSteer(s);
            nx = this.sc[S_CX];
            nz = this.sc[S_CZ];
            if (hov) {
                wX = (nx - ox) / dt;
                wZ = (nz - oz) / dt;
                nx = ox;
                nz = oz;
            }
            else if (walk) {
                wF = ((nx - ox) * this.dirX[s] + (nz - oz) * this.dirZ[s]) / dt;
                if (wF < 0)
                    wF *= d.tWalkReverse[t];
                nx = ox;
                nz = oz;
            } // W1: thrust only (no strafe); reverse slower
        }
        if (sidestep && walk)
            faceTarget = true; // W1: a walker cannot strafe: it holds, facing the target, and retries the line of fire
        else if (sidestep) {
            // A friendly is in the line of fire: strafe sideways (hover vehicles and
            // infantry can), away from the blocker, keeping the hull on the target.
            // At most 2 x own radius + 4 m per line-of-fire retry (targetingIntervalTicks).
            const dx = this.x[ts] - ox, dz = this.z[ts] - oz;
            const l = Math.sqrt(dx * dx + dz * dz);
            if (l > 1e-9) {
                const side = nl === 2 ? 1 : -1;
                let stepLen = (2 * d.tRadius[t] + 4) / this.retryTicks;
                if (stepLen > d.tSpeed[t] * dt)
                    stepLen = d.tSpeed[t] * dt;
                if (hov) {
                    wX += (-dz / l) * side * stepLen / dt;
                    wZ += (dx / l) * side * stepLen / dt;
                }
                else {
                    nx += (-dz / l) * side * stepLen;
                    nz += (dx / l) * side * stepLen;
                }
            }
            faceTarget = true;
        }
        if (hasGoal) {
            let dx = gx - ox, dz = gz - oz;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 1e-9) {
                dx /= dist;
                dz /= dist;
                const q = this.sc;
                q[S_DIRX] = dx;
                q[S_DIRZ] = dz;
                this.turnToward(s);
                let align = q[S_ALIGN];
                if (walk) {
                    // W1: with the goal more than walker.turnInPlaceDegrees off the hull it stops and turns in place; inside, the
                    // speed tapers linearly from the full speed (dead ahead) to 0 at that angle
                    const c0 = d.tWalkCosInPlace[t];
                    align = align <= c0 ? 0 : c0 < 1 ? (align - c0) / (1 - c0) : 1;
                }
                else if (hov) {
                    // m1 (smooth AI driving): not speed x cos(angle to the goal), which braked an AI hover vehicle to a near stop
                    // at every bend and re-accelerated it after: it keeps the speed whose turn circle (speed / turnRate) still
                    // passes through the goal, v <= turnRate x dist / (2 sin angle), and while facing away at most (1 + cos) / 2
                    const sn = Math.abs(this.dirX[s] * dz - this.dirZ[s] * dx), top = d.tSpeed[t];
                    let k = sn > 1e-9 && top > 0 ? (d.tTurnRate[t] * dist) / (2 * sn * top) : 1;
                    const soft = 0.5 * (1 + align);
                    if (k > soft)
                        k = soft;
                    if (k > align)
                        align = k > 1 ? 1 : k;
                }
                if (align > 0) {
                    let spd = d.tSpeed[t] * this.speedFactor(s);
                    if (this.prog)
                        spd *= (0, progression_ts_1.progSpeedMul)(this, s); // w2e: the driver's vehicle mastery (speed)
                    if (this.ord.ext.size) {
                        const e = this.ord.ext.get(this.eid[s]);
                        if (e && e.speed > 0 && e.speed < spd)
                            spd = e.speed;
                    } // formation: slowest member
                    if (hov && finD >= 0) {
                        const H = d.hover, cap = H.aiBrakeK * Math.sqrt(2 * d.tAccel[t] * H.aiAccelMul * finD);
                        if (cap < spd)
                            spd = cap;
                    } // ruling 112: brake to stop on the last waypoint
                    if (walk && finD >= 0) {
                        const cap = WALK_BRAKE_K * Math.sqrt(2 * d.tWalkBrake[t] * finD);
                        if (cap < spd)
                            spd = cap;
                    } // W1: brake to stop on the last waypoint
                    let stepLen = spd * dt * align;
                    if (stepLen > dist)
                        stepLen = dist;
                    if (walk)
                        wF += stepLen / dt;
                    else if (hov) {
                        wX += this.dirX[s] * stepLen / dt;
                        wZ += this.dirZ[s] * stepLen / dt;
                    }
                    else {
                        nx += this.dirX[s] * stepLen;
                        nz += this.dirZ[s] * stepLen;
                    }
                }
            }
        }
        if (!hasGoal && faceTarget) {
            const dx = this.x[ts] - ox, dz = this.z[ts] - oz;
            const l = Math.sqrt(dx * dx + dz * dz);
            if (l > 1e-9) {
                this.sc[S_DIRX] = dx / l;
                this.sc[S_DIRZ] = dz / l;
                this.turnToward(s);
            }
        }
        if (hov) {
            this.hoverVel(s, t, wX, wZ, !ctl);
            nx = ox + this.velX[s] * dt;
            nz = oz + this.velZ[s] * dt;
        }
        let wv = 0; // W1: the walker's speed along the hull this tick
        if (walk) {
            wv = this.walkVel(s, t, wF);
            nx = ox + this.dirX[s] * wv * dt;
            nz = oz + this.dirZ[s] * wv * dt;
        }
        // separation against start-of-tick positions (order independent); airborne pilots do not collide
        const air = this.airS[s];
        const myR = d.tRadius[t];
        const qr = myR + this.maxRadius;
        let pushX = 0, pushZ = 0;
        const g = this.fine;
        const M = this.mine, mLane = M !== null ? M.lane : null, myLane = mLane !== null && s < mLane.length ? mLane[s] : 0; // q1
        const hvMe = M !== null && M.tCap[t] > 0, myFirm = hvMe && s < M.firm.length && M.firm[s] === 1;
        const c0 = g.cellOf(ox - qr), c1 = g.cellOf(ox + qr), r0 = g.cellOf(oz - qr), r1 = g.cellOf(oz + qr);
        const side = g.cellsPerSide, start = g.bucketStart, ent = g.entries, ek = g.entryKey, mask = g.mask;
        for (let cz = r0; cz <= r1; cz++)
            for (let cx = c0; cx <= c1; cx++) {
                const key = cz * side + cx;
                const b = (Math.imul(key, 0x9e3779b1) >>> 16) & mask;
                for (let p = start[b], e = start[b + 1]; p < e; p++) {
                    if (ek[p] !== key)
                        continue;
                    const o = ent[p];
                    if (o === s)
                        continue;
                    const ot = this.etype[o];
                    if (this.airS[o] !== air || (this.airborne[o] !== exports.AIR_GROUND && this.slotPilot[o] !== 0))
                        continue;
                    let firmO = false;
                    if (hvMe && M.tCap[ot] > 0) {
                        if (myLane !== 0 && o < mLane.length && mLane[o] === myLane)
                            continue; // q1: harvesters of one dock lane keep apart by the lane, not by pushing
                        if (myFirm)
                            continue; // q1: settled on its queue place / dock: other harvesters do not move it
                        firmO = o < M.firm.length && M.firm[o] === 1;
                    }
                    const rr = myR + d.tRadius[ot];
                    let dx = ox - this.px[o], dz = oz - this.pz[o];
                    const d2 = dx * dx + dz * dz;
                    if (d2 >= rr * rr)
                        continue;
                    if (this.tp !== null && this.tp.lifts.length !== 0 && (0, transport_ts_1.tpSlingPair)(this, s, o))
                        continue; // QA5-2: a landed lifter and its own sling load do not push apart
                    let len = Math.sqrt(d2);
                    if (len < 1e-6) {
                        dx = s < o ? 1 : -1;
                        dz = 0;
                        len = 1;
                    } // exact overlap: deterministic split
                    const overlap = rr - (len < 1e-6 ? 0 : len);
                    const k = d.tStructure[ot] || firmO ? overlap : overlap * 0.5; // structures (and q1 settled harvesters) do not yield
                    pushX += (dx / len) * k;
                    pushZ += (dz / len) * k;
                }
            }
        const maxPush = d.tSpeed[t] * dt + myR * 0.25;
        const pl = Math.sqrt(pushX * pushX + pushZ * pushZ);
        if (pl > maxPush) {
            pushX *= maxPush / pl;
            pushZ *= maxPush / pl;
        }
        nx += pushX;
        nz += pushZ;
        if (hov && pl > 1e-9) {
            // ruling 112: pushed off a unit or a structure: the momentum into it is lost (slides along it) and a little bounces back
            const ux = pushX / pl * (pl > maxPush ? pl / maxPush : 1), uz = pushZ / pl * (pl > maxPush ? pl / maxPush : 1), vn = this.velX[s] * ux + this.velZ[s] * uz;
            if (vn < 0) {
                const k = (1 + d.hover.bounce) * vn;
                this.velX[s] -= k * ux;
                this.velZ[s] -= k * uz;
            }
        }
        {
            const ms = this.mapSize;
            nx = Math.min(ms, Math.max(0, nx));
            nz = Math.min(ms, Math.max(0, nz));
            if (hov) {
                if (nx <= 0 || nx >= ms)
                    this.velX[s] = 0;
                if (nz <= 0 || nz >= ms)
                    this.velZ[s] = 0;
            }
        } // clamp in float64 (a ternary with a literal 0 made V8 box the result: 9 KiB/tick)
        if (this.tlayer !== null && this.airborne[s] === exports.AIR_GROUND && !d.tAir[t] && !(hov && this.hopH[s] >= d.hover.jumpClear) && !(0, env_ts_1.envCanStep)(this, s, ox, oz, nx, nz)) {
            // wave 2 D: never into an impassable terrain cell; slide along it on one axis when that is clear (ruling 112: a hop
            // of hover.jumpClearMetres clears it; a hover vehicle's momentum on the blocked axis bounces back by hover.bounce)
            const b = hov ? -d.hover.bounce : 0;
            if ((0, env_ts_1.envCanStep)(this, s, ox, oz, nx, oz)) {
                nz = oz;
                if (hov)
                    this.velZ[s] *= b;
            }
            else if ((0, env_ts_1.envCanStep)(this, s, ox, oz, ox, nz)) {
                nx = ox;
                if (hov)
                    this.velX[s] *= b;
            }
            else {
                nx = ox;
                nz = oz;
                if (hov) {
                    this.velX[s] *= b;
                    this.velZ[s] *= b;
                }
            }
        }
        if (this.relief !== null && this.nav !== null && this.airborne[s] === exports.AIR_GROUND && !d.tAir[t] && !this.slopeOk(s, t, hov, ox, oz, nx, nz)) {
            // T1 (ruling 116): never up into a cell too steep for the class; slide along it on one axis when that is clear
            const b = hov ? -d.hover.bounce : 0;
            if (this.slopeOk(s, t, hov, ox, oz, nx, oz)) {
                nz = oz;
                if (hov)
                    this.velZ[s] *= b;
            }
            else if (this.slopeOk(s, t, hov, ox, oz, ox, nz)) {
                nx = ox;
                if (hov)
                    this.velX[s] *= b;
            }
            else {
                nx = ox;
                nz = oz;
                if (hov) {
                    this.velX[s] *= b;
                    this.velZ[s] *= b;
                }
            }
        }
        this.x[s] = nx;
        this.z[s] = nz;
        if (pilotT)
            this.pilotVertical(s);
        else if (d.tAir[t]) {
            // aircraft fly at airAltitude; without a driver (or landing for a pickup) they settle to the ground and land intact (ruling 11)
            if (this.fkit && !(canDrive && this.drv[s] === 1)) {
                this.fkit.heliCrewed.delete(this.eid[s]); // Frontline: no pilot at the controls: it settles; the next pilot's boarding lifts it again
                this.fkit.heliVy.delete(this.eid[s]);
            }
            if (crewed) {
                let a = this.flyAlt[s], want = canDrive && !landing ? (this.lowFly[s] && this.lowRules ? this.lowRules.alt : c.airAltitude) : 0; // ruling 41: low flight
                // w2c: a player pilot in direct control flies at flying height (as before); crouch held descends, lands and keeps it on the ground
                if (ctl && this.ctlMask[s] !== 0 && (this.ctlFlags[s] & exports.PC_CROUCH) !== 0)
                    want = 0;
                if (this.fkit && this.fkit.parked.has(this.eid[s])) { // Frontline: a dropped aircraft lifts off on the pilot's first move
                    if (ctl && this.ctlMask[s] !== 0 && (this.ctlThrust[s] !== 0 || this.ctlStrafe[s] !== 0))
                        this.fkit.parked.delete(this.eid[s]);
                    else
                        want = 0;
                }
                const step = d.crew.settlePerTick, was = this.airS[s];
                if (this.fkit && d.tHover[t] === 1 && canDrive && this.drv[s] === 1) {
                    // Frontline helicopter handling: vertical momentum. C (crouch) pushes down (faster the longer it is held), Space
                    // (jump) pulls up; neither: the vertical speed eases to zero and it holds that height. Just boarded on the
                    // ground: it lifts into a hover at H.boardHover. Touch down faster than safeLanding: damage; wreckLanding: wrecked.
                    const H = this.fkit.R.heli, id = this.eid[s], f = ctl && this.ctlMask[s] !== 0 ? this.ctlFlags[s] : 0;
                    let vy = this.fkit.heliVy.get(id) ?? 0;
                    if (!this.fkit.heliCrewed.has(id)) {
                        this.fkit.heliCrewed.add(id);
                        if (a < 1)
                            this.fkit.heliAuto.set(id, H.boardHover);
                    }
                    const down = (f & exports.PC_CROUCH) !== 0, up = (f & exports.PC_JUMP) !== 0, auto = this.fkit.heliAuto.get(id);
                    if (down || up)
                        this.fkit.heliAuto.delete(id);
                    if (down)
                        vy = Math.max(-H.maxDescent, Math.min(vy, -H.startDescent) - H.descentAccel * dt);
                    else if (up || (auto !== undefined && a + (vy > 0 ? (vy * vy) / (2 * H.brake) : 0) < auto)) // the boarding climb brakes into its hover
                        vy = Math.min(H.climb, vy + H.climbAccel * dt);
                    else {
                        if (auto !== undefined)
                            this.fkit.heliAuto.delete(id);
                        const dv = H.brake * dt; // ease to a hover
                        vy = vy > dv ? vy - dv : vy < -dv ? vy + dv : 0;
                    }
                    let na = a + vy * dt;
                    if (na > H.ceiling) {
                        na = H.ceiling;
                        vy = Math.min(vy, 0);
                    }
                    if (na <= 0) {
                        if (a > 0 && -vy > H.safeLanding && this.hp[s] > 0)
                            this.envDamage(s, -vy >= H.wreckLanding ? this.hp[s] + this.shield[s] + 1 : (-vy - H.safeLanding) * H.damagePerSpeed);
                        na = 0;
                        vy = Math.max(0, vy);
                    }
                    this.fkit.heliVy.set(id, vy);
                    a = na;
                }
                else
                    a = a < want ? Math.min(want, a + step) : Math.max(want, a - step);
                this.flyAlt[s] = a;
                this.airS[s] = a > 0 ? 1 : 0;
                if (was !== this.airS[s])
                    this.events.push(events_ts_1.EV.AIRCRAFT_LANDING, this.tick, this.team[s], this.eid[s], was && pad >= 0 ? this.eid[pad] : 0, 0, this.detMask(s) | (was && pad >= 0 ? this.detMask(pad) << 8 : 0), nx, nz, was ? 1 : 2); // d: fog masks (QA1)
            }
            const q = this.sc;
            q[S_GX] = nx;
            q[S_GZ] = nz;
            this.groundAt(S_GX);
            this.y[s] = q[S_GY] + this.flyAlt[s];
        }
        else {
            const q = this.sc;
            q[S_GX] = nx;
            q[S_GZ] = nz;
            this.groundAt(S_GX);
            this.y[s] = q[S_GY] + (hov || (walk && d.tJump[t] > 0) ? this.hopStep(s, t, ctl && canDrive) : 0); // Frontline: mech jump jets
        }
        if (walk) {
            // W1: blocked (a unit, a structure, a wall, a too-steep cell): the speed drops to what the hull actually made along
            // its heading; the velocity stays along the hull
            const fwd = ((nx - ox) * this.dirX[s] + (nz - oz) * this.dirZ[s]) / dt;
            if (wv > 0 && fwd < wv)
                wv = fwd > 0 ? fwd : 0;
            else if (wv < 0 && fwd > wv)
                wv = fwd < 0 ? fwd : 0;
            this.velX[s] = this.dirX[s] * wv;
            this.velZ[s] = this.dirZ[s] * wv;
        }
        else if (!hov) {
            this.velX[s] = (nx - ox) / dt;
            this.velZ[s] = (nz - oz) / dt;
        }
    }
    /**
     * W1 (designer 16 Nov): speed of walker s along its hull (m/s, negative backwards) toward the wanted speed wF: up by
     * walker.accel per second while speeding up in the same direction, otherwise down by walker.brake per second (it
     * brakes to a stop before walking the other way). Taken exactly within one step (at rest: velX = velZ = 0). The
     * signed speed comes from the velocity (always along the hull; the sign from its projection on the heading).
     */
    walkVel(s, t, wF) {
        const d = this.d, vx = this.velX[s], vz = this.velZ[s];
        let v = Math.sqrt(vx * vx + vz * vz);
        if (vx * this.dirX[s] + vz * this.dirZ[s] < 0)
            v = -v;
        const up = (wF > 0 ? wF > v && v >= 0 : wF < v && v <= 0);
        const step = (up ? d.tWalkAccel[t] : d.tWalkBrake[t]) * d.dt, dv = wF - v;
        return dv > step ? v + step : dv < -step ? v - step : wF;
    }
    /**
     * Ruling 112 (Battlezone hover handling): velocity of hover vehicle s follows the wanted velocity (wX, wZ) by at most
     * handling.accel per second (x hover.aiAccelMultiplier for the AI). Speeding up, turning, strafing and braking against
     * the motion (reverse thrust) use accel; with no thrust a player's vehicle coasts, bleeding the velocity by
     * handling.drag per second; above hover.overspeedRatio x the wanted speed (after a boost) the excess bleeds with drag
     * (+ overspeedBrakeFraction of accel). The AI never coasts: it brakes at accel. Within hover.stopSpeed (or one step)
     * of the wanted velocity it takes it exactly (at rest: velX = velZ = 0, the idle signature rule).
     */
    hoverVel(s, t, wX, wZ, ai) {
        const d = this.d, H = d.hover, dt = d.dt;
        let vx = this.velX[s], vz = this.velZ[s];
        const dx = wX - vx, dz = wZ - vz, l2 = dx * dx + dz * dz;
        if (l2 === 0)
            return;
        const acc = d.tAccel[t] * (ai ? H.aiAccelMul : 1) * dt, w2 = wX * wX + wZ * wZ, l = Math.sqrt(l2);
        let rate = acc;
        if (!ai) {
            if (w2 === 0)
                rate = d.tDrag[t] * dt * l;
            else if (vx * vx + vz * vz > w2 * H.overspeedRatio * H.overspeedRatio && vx * wX + vz * wZ > 0) {
                const r = d.tDrag[t] * dt * l + H.overspeedBrake * acc;
                if (r < rate)
                    rate = r;
            }
        }
        if (l <= rate || l <= H.stopSpeed) {
            vx = wX;
            vz = wZ;
        }
        else {
            const k = rate / l;
            vx += dx * k;
            vz += dz * k;
        }
        this.velX[s] = vx;
        this.velZ[s] = vz;
    }
    /**
     * Ruling 112: the hop of hover vehicle s: with the jump key held by its driver (drive: a controlled, driven vehicle),
     * on its hover and past hopReady, it takes off at handling.jump m/s; then it flies under the planet's gravity and
     * lands back on its hover. Returns the height above the ground (0 on the hover).
     */
    hopStep(s, t, drive) {
        let h = this.hopH[s], vy = this.velY[s];
        const d = this.d, dt = d.dt;
        if (h === 0 && vy === 0) {
            if (!drive || !(d.tJump[t] > 0) || (this.ctlFlags[s] & exports.PC_JUMP) === 0 || this.tick < this.hopReady[s])
                return 0;
            vy = d.tJump[t];
            this.hopReady[s] = this.tick + d.hover.jumpCooldownTicks;
        }
        h += vy * dt - 0.5 * d.gravity * dt * dt;
        vy -= d.gravity * dt;
        if (h <= 0) {
            h = 0;
            vy = 0;
        }
        this.hopH[s] = h;
        this.velY[s] = vy;
        return h;
    }
    // ------------------------------------------------------------ weapons
    fireWeapons(s) {
        const d = this.d, dt = d.dt;
        const mc = this.mCount[s];
        if (mc === 0)
            return;
        // a crewed vehicle in its critical window (hull at zero since an earlier tick) fires nothing; one that reached
        // zero this tick still fires, like every unit alive at the start of the weapons phase (simultaneous resolution)
        if (this.critTick[s] >= 0 && this.critTick[s] < this.tick)
            return;
        if (this.slotPilot[s] !== 0 && this.hp[s] <= 0 && this.kit !== null && this.pilots.get(this.slotPilot[s])?.state === pilotkit_ts_1.P_DOWNED)
            return; // S12: downed pilots do not fire
        if (this.stanceT[s] !== 0 && this.tick < this.stanceT[s])
            return; // ruling 42: no firing while going prone or getting up
        if (this.ctlOn[s] && this.ctlMask[s] === 0) {
            this.fireControlled(s);
            return;
        }
        if (this.pts !== null && this.pts.cores.size !== 0 && d.tStructure[this.etype[s]] && this.pts.coreDisabled(this.eid[s], this.tick))
            return; // fix-qa2: a hacked building is silent
        if ((this.ctlMask[s] & exports.GUN_SEAT_BIT) !== 0) {
            this.fireGunSeat(s);
            return;
        } // ruling 125: a manned turret fires under its gunner's aim
        const team = this.team[s], mb = s * data_ts_1.MAX_MOUNTS, t = this.etype[s], tb = t * data_ts_1.MAX_MOUNTS, cm = this.ctlMask[s];
        const q = this.sc;
        this.hitShooter = this.eid[s];
        const am = this.s15 !== null && this.s15.ammo.size > 0 ? this.s15.ammo.get(this.eid[s]) : undefined; // ruling 55: aircraft rounds per mount
        // driver in direct control and the gunner-weapon flag (CONTRACTS rev 4): set = the client sent it; gun = take the empty gunner seats' weapons
        let gset = false, gun = false;
        if (cm !== 0 && this.ctlOn[s]) {
            const fl = this.ctlFlags[s];
            gset = (fl & exports.PC_GUNNER_SET) !== 0;
            if (gset && (fl & exports.PC_GUNNER) !== 0) {
                const ns = d.tSeatCount[t];
                for (let j = 0; j < ns; j++)
                    if (d.tSeatRole[t * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_GUNNER && d.tSeatArmed[t * data_ts_1.MAX_SEATS + j] && this.occ[s * data_ts_1.MAX_SEATS + j] === 0) {
                        gun = true;
                        break;
                    }
            }
        }
        const rxT = d.tRadius[t] < 1 ? 0 : this.rxTicks[team & 3]; // designer 16 Nov 19:54: no reaction delay for troopers and pilots
        for (let m = 0; m < mc; m++) {
            const ci = mb + m;
            // ruling 126: a newly acquired small target (pilot, infantry) starts the AI reaction delay; another target restarts it
            if (rxT > 0) {
                const tid = this.mTgtId[ci], tsl = this.mTgtSlot[ci];
                if (tid === 0 || tsl < 0 || this.alive[tsl] === 0 || this.eid[tsl] !== tid || d.tRadius[this.etype[tsl]] >= 1) {
                    if (this.mRxId[ci] !== 0) {
                        this.mRxId[ci] = 0;
                        this.mRxT[ci] = 0;
                    }
                }
                else if (this.mRxId[ci] !== tid) {
                    this.mRxId[ci] = tid;
                    this.mRxT[ci] = this.tick + rxT;
                }
            }
            // F1: the turret turns every tick (player-aimed seats follow the player's aim at once), whether or not it can fire
            {
                const tw = this.mWeapon[ci];
                if (tw >= 0 && d.wTraverse[tw] > 0 && this.mFixed[ci] === 0) {
                    const tj = d.tMountCrewSeat[tb + m];
                    if (cm !== 0 && tj >= 0 && ((cm >> tj) & 1 || (this.ctlOn[s] && this.occ[s * data_ts_1.MAX_SEATS + tj] === 0 && d.tSeatRole[t * data_ts_1.MAX_SEATS + tj] === data_ts_1.SEAT_GUNNER && !(this.fkit && !gun && this.mOn[ci])))) { // Frontline: an AI-manned door gun turns to its own target
                        const yaw = (cm >> tj) & 1 && tj !== d.tDriverSeat[t] ? this.gYaw[s * data_ts_1.MAX_SEATS + tj] : this.ctlYaw[s];
                        this.mDX[ci] = (0, fmath_ts_1.dcos)(yaw);
                        this.mDZ[ci] = (0, fmath_ts_1.dsin)(yaw);
                        this.mLock[ci] = 0;
                        this.mReady[ci] = 0;
                    }
                    else
                        this.turnTurret(s, ci, tw);
                }
            }
            // A weapon that was already ready (cooldown <= 0) fires with no carry-over, so
            // consecutive shots are exactly 1 / shotsPerSecond apart (the old "cooldown - dt"
            // gave the second shot of a burst one tick early). 1e-9: float tolerance.
            const prev = this.cooldown[ci];
            if (prev <= 1e-9 && this.mHeat[ci] > 0)
                this.heatDrain(ci); // ruling 91: heat drains while the gun is not firing
            let cd = prev > 0 ? prev - dt : 0;
            if (cd <= 1e-9) {
                if (cd > 0)
                    cd = 0;
                const w = this.mWeapon[ci];
                if (am !== undefined && am[m] >= 0 && am[m] < 1) {
                    this.cooldown[ci] = 0;
                    continue;
                } // ruling 55: an empty aircraft weapon cannot fire
                const ts = this.mTgtSlot[ci];
                const j = d.tMountCrewSeat[tb + m];
                this.hitPilot = j >= 0 ? this.occ[s * data_ts_1.MAX_SEATS + j] : this.slotPilot[s];
                this.hitCtl = false;
                // a player in direct control of this mount's seat (or the driver taking over an empty gunner seat)
                if (cm !== 0 && j >= 0 && ((cm >> j) & 1 || (this.ctlOn[s] && this.occ[s * data_ts_1.MAX_SEATS + j] === 0 && d.tSeatRole[t * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_GUNNER && !(this.fkit && !gun && this.mOn[ci])))) { // Frontline: an AI-manned empty door gun stays with the AI unless the driver takes it (T)
                    const driverSeat = j === d.tDriverSeat[t], gi = s * data_ts_1.MAX_SEATS + j;
                    const own = (cm >> j) & 1;
                    // own seat: the driver's weapons (silent while the driver holds the gunner weapon) or a player gunner's;
                    // an empty gunner seat under the driver: bit 0 with the flag true, never otherwise (flag false or omitted: the
                    // stage-1 "bit 1 fires the empty seat too" path is gone, CONTRACTS rev 4 "never both")
                    // ruling 32: the driver seat's extraWeapons (Tandem rocket rack) fire with bit 1 (fireSecondary)
                    const held = own ? (driverSeat ? !gun && (this.ctlFire[s] & (d.tMountExtra[tb + m] === 1 ? (this.fkit && this.fkit.R.thirdW.has(w) ? 4 : 2) : 1)) !== 0 : (this.gFire[gi] & 1) !== 0)
                        : gun && (this.ctlFire[s] & 1) !== 0;
                    let r = 0;
                    const lz = d.wChargeTicks[w] !== 0 || d.wHeatPerShot[w] > 0; // ruling 91: laser charge / heat gate
                    let go = held && !this.gasShort(s, w);
                    if (this.fkit && own && driverSeat && this.fkit.isLockW(w))
                        go = this.fkit.lockFire(this, s, w, held) && !this.gasShort(s, w); // Frontline: lock-on, fire on release
                    if (lz)
                        go = this.laserGate(ci, w, go, false);
                    if (go) {
                        if (!own)
                            this.hitPilot = this.occ[s * data_ts_1.MAX_SEATS + d.tDriverSeat[t]];
                        this.hitCtl = this.isPlayerPilot(this.hitPilot);
                        if (d.wMelee[w])
                            r = this.fireMelee(s, ci, w);
                        else {
                            if (own && !driverSeat) {
                                q[S_AYAW] = this.gYaw[gi];
                                q[S_APITCH] = this.gPitch[gi];
                            }
                            else {
                                q[S_AYAW] = this.ctlYaw[s];
                                q[S_APITCH] = this.ctlPitch[s];
                            }
                            q[S_HX] = (0, fmath_ts_1.dcos)(q[S_AYAW]);
                            q[S_HZ] = (0, fmath_ts_1.dsin)(q[S_AYAW]);
                            this.setMuzzle(s, ci);
                            r = this.fireAimed(s, w, this.mFixed[ci] === 1);
                        }
                    }
                    if (r === 1) {
                        cd += d.wPeriod[w];
                        if (cd < 0)
                            cd = 0;
                        if (this.fkit && this.fkit.isLockW(w) && this.fkit.salvoLeft(this, s) > 0)
                            cd = this.fkit.R.lock.gap; // Frontline: the salvo's missiles close together
                        this.countShot(this.hitPilot);
                        this.spendShotGas(s, w);
                        if (am !== undefined && am[m] >= 0)
                            am[m] -= 1;
                        if (lz)
                            this.laserShot(ci, w);
                    }
                    else
                        cd = 0; // w2f: recoil counter; ruling 55: a round spent
                    this.cooldown[ci] = cd;
                    continue;
                }
                if (this.mOn[ci] === 0 || d.tMountManual[tb + m]) {
                    this.cooldown[ci] = 0;
                    continue;
                } // nobody in the seat / a kit weapon the AI never fires
                q[S_AIMMUL] = this.slotPilot[s] !== 0 ? this.mAimMul[ci] * this.stanceAccuracy(s) : this.mAimMul[ci]; // ruling 42
                let result = 0; // 0: no shot possible, 1: fired, 2: held (terrain in the way), 3: held (friendly in the way)
                const lz = d.wChargeTicks[w] !== 0 || d.wHeatPerShot[w] > 0; // ruling 91: laser charge / heat gate
                let inArc = false;
                const gw = this.ordType[s] === exports.ORD_ATTACK_GROUND ? this.waypoints[s] : null;
                if (gw !== null && d.wBallistic[w] === 1 && d.wCanHitGround[w]) {
                    // ruling 40 attack-ground: this indirect-fire mount shells the ordered spot (when within range), nothing else
                    const dx = gw[0] - this.x[s], dz = gw[1] - this.z[s], r = d.wRange[w], d2 = dx * dx + dz * dz;
                    if (d2 <= r * r && this.turretOnTarget(s, ci, w, dx, dz, d2)) {
                        const l = Math.sqrt(d2);
                        if (l > 1e-9) {
                            q[S_HX] = dx / l;
                            q[S_HZ] = dz / l;
                        }
                        else {
                            q[S_HX] = this.dirX[s];
                            q[S_HZ] = this.dirZ[s];
                        }
                        this.setMuzzle(s, ci);
                        result = this.fireBallisticAt(s, w, gw[0], gw[1]);
                    }
                }
                else if (d.wMelee[w])
                    result = this.fireMelee(s, ci, w);
                else if (ts >= 0 && this.gasShort(s, w))
                    result = 0; // fix-qa2 d: an energy weapon with no gas left holds fire
                else if (ts >= 0 && this.slotValid(ts, this.mTgtId[ci], team) && this.canHit(w, ts)) {
                    const dx = this.x[ts] - this.x[s], dz = this.z[ts] - this.z[s];
                    const hk = this.relief !== null ? 1 + this.relief.hgRange * this.hgOver(s, ts) : 1; // T1: high ground
                    const r = (d.tStructure[t] && this.bfx !== null ? d.wRange[w] * this.bfx.rangeMul(s, team) : d.wRange[w]) * hk, d2 = dx * dx + dz * dz; // fix-qa2: manned tower, turret-range upgrade
                    if (d2 <= r * r) {
                        // hull-fixed (driver) weapons fire only along the hull
                        let aligned = true;
                        if (this.mFixed[ci]) {
                            const l = Math.sqrt(d2);
                            aligned = l < 1e-9 || (this.dirX[s] * dx + this.dirZ[s] * dz) / l >= d.fixedCos;
                        }
                        else
                            aligned = this.turretOnTarget(s, ci, w, dx, dz, d2); // F1: barrel within the aim tolerance, wind-up over
                        // ruling 126: no shot at a small target before the reaction delay is over (a laser's charge runs inside it, ending with it)
                        if (aligned && this.mRxId[ci] !== 0 && this.mRxId[ci] === this.mTgtId[ci] && this.tick < this.mRxT[ci] - (lz ? d.wChargeTicks[w] : 0))
                            aligned = false;
                        if (aligned && lz) {
                            inArc = true;
                            if (!this.laserGate(ci, w, true, true))
                                aligned = false;
                        } // ruling 91: the AI charges only with a target in its arc
                        if (aligned) {
                            const l = Math.sqrt(d2);
                            if (l > 1e-9) {
                                q[S_HX] = dx / l;
                                q[S_HZ] = dz / l;
                            }
                            else {
                                q[S_HX] = this.dirX[s];
                                q[S_HZ] = this.dirZ[s];
                            }
                            this.setMuzzle(s, ci);
                            this.hgK = hk;
                            result = this.fire(s, w, ts);
                            this.hgK = 1;
                        }
                    }
                }
                if (lz && !inArc)
                    this.mChg[ci] = 0; // ruling 91: no target in the arc: the charge is lost
                if (result === 1) {
                    cd += this.eco2 && d.tStructure[t] ? d.wPeriod[w] * this.eco2.fireMul(s) : d.wPeriod[w];
                    if (cd < 0)
                        cd = 0;
                    if (ts === this.tgtSlot[s])
                        this.noLos[s] = 0;
                    this.spendShotGas(s, w);
                    if (am !== undefined && am[m] >= 0)
                        am[m] -= 1;
                    if (lz)
                        this.laserShot(ci, w);
                } // ruling 55: a round spent; w2b: underpowered turrets fire at half rate
                else if (result >= 2) {
                    cd = this.retryTicks * dt; // re-check the line of fire later
                    if (ts === this.tgtSlot[s])
                        this.noLos[s] = result === 2 ? 1 : this.blockSide > 0 ? 2 : 3;
                    this.stats.heldFire++;
                    if (result === 2)
                        this.stats.heldTerrain++;
                    else
                        this.stats.heldFriendly++;
                }
                else {
                    cd = 0;
                    if (ts === this.tgtSlot[s] && this.noLos[s] >= 2)
                        this.noLos[s] = 0; // no shot to retry: stop sidestepping
                }
            }
            this.cooldown[ci] = cd;
        }
    }
    // ------------------------------------------------------------ direct control
    /**
     * Ruling 108 (Dart Scout boost): the driver holds the sprint key (PC_SPRINT) while thrusting forward: top speed x
     * tBoostMul while the meter lasts (boost.seconds from full). The meter refills over boost.rechargeSeconds while not
     * boosting; a boost starts only with at least boost.minStartFraction in the meter. The AI never boosts.
     */
    boostStep(s, t, ctl) {
        const d = this.d, want = ctl && this.ctlOn[s] === 1 && (this.ctlFlags[s] & exports.PC_SPRINT) !== 0 && this.ctlThrust[s] > 0;
        let m = this.boostM[s];
        if (want && m > 0 && (this.boostOn[s] === 1 || m >= d.tBoostMin[t])) {
            m -= d.tBoostDrain[t];
            this.boostOn[s] = m > 0 ? 1 : 0;
            if (m < 0)
                m = 0;
        }
        else {
            this.boostOn[s] = 0;
            m += d.tBoostFill[t];
            if (m > 1)
                m = 1;
        }
        this.boostM[s] = m;
    }
    /**
     * Movement of a controlled entity: the hull turns toward the aim yaw at the
     * type's turnRate (turnToward), then moves by thrust along the hull and strafe
     * to its right, at most the type's speed (thrust and strafe combined length
     * <= 1). Strafing is allowed for every hover unit (W1: a walker takes the thrust along the hull only).
     * Result (position before separation) in sc[S_CX], sc[S_CZ].
     */
    controlSteer(s) {
        const d = this.d, t = this.etype[s], q = this.sc, yaw = this.ctlYaw[s];
        q[S_DIRX] = (0, fmath_ts_1.dcos)(yaw);
        q[S_DIRZ] = (0, fmath_ts_1.dsin)(yaw);
        this.turnToward(s);
        const fx = this.dirX[s], fz = this.dirZ[s], step = d.tSpeed[t] * this.speedFactor(s) * d.dt * (this.prog ? (0, progression_ts_1.progSpeedMul)(this, s) : 1) * (this.boostOn[s] ? d.tBoostMul[t] : 1); // w2e: driver's vehicle mastery; ruling 108 boost
        const th = this.ctlThrust[s], st = this.ctlStrafe[s];
        // right of the hull on (x, z) with y up: (-dirZ, dirX)
        q[S_CX] = this.x[s] + (fx * th - fz * st) * step;
        q[S_CZ] = this.z[s] + (fz * th + fx * st) * step;
    }
    /**
     * Ruling 42: stance of controlled pilot body s from its held keys (prone wins over crouch). Standing <-> crouched is
     * immediate; going prone takes crew.toProneTicks and getting up crew.upTicks (to crouched or standing, whichever key is
     * held when it starts). During a transition the pilot keeps its current stance's signature and accuracy, crawls, and
     * cannot fire or use the jump pack; a key change meanwhile is taken up once it ends. Not airborne: on the ground only.
     */
    stanceUpdate(s) {
        const c = this.d.crew;
        if (!c || this.slotPilot[s] === 0)
            return;
        const f = this.ctlOn[s] ? this.ctlFlags[s] : 0;
        const want = this.airborne[s] !== exports.AIR_GROUND ? (this.stance[s] & 3) : (f & exports.PC_PRONE) ? exports.ST_PRONE : (f & exports.PC_CROUCH) ? exports.ST_CROUCH : exports.ST_STAND;
        let cur = this.stance[s] & 3, to = (this.stance[s] >> 2) & 3;
        if (this.stanceT[s] !== 0) {
            if (this.tick < this.stanceT[s])
                return;
            cur = to;
            this.stanceT[s] = 0;
        }
        if (want !== cur) {
            const T = want === exports.ST_PRONE ? c.toProneTicks : cur === exports.ST_PRONE ? c.upTicks : 0;
            if (T > 0) {
                to = want;
                this.stanceT[s] = this.tick + T;
            }
            else
                cur = want;
        }
        this.stance[s] = cur | ((this.stanceT[s] !== 0 ? to : cur) << 2);
    }
    /** Ruling 42: current stance of slot s (ST_*), and whether it is changing stance (going prone / getting up). */
    stanceOf(s) { return this.stance[s] & 3; }
    stanceChanging(s) { return this.stanceT[s] !== 0 && this.tick < this.stanceT[s]; }
    /** Ruling 109: a player's own shot on foot (slot s a pilot body, the shooter a player) hits where aimed: x crew.playerAcc. */
    playerFootAcc(s, w) {
        const c = this.d.crew;
        return c === null || c.playerAcc === 1 || c.playerAccSkip[w] === 1 || !this.hitCtl || !this.onFootPilot(s) ? 1 : c.playerAcc;
    }
    /** Ruling 42: dispersion / aim error multiplier of shots from slot s (a pilot on foot: by stance; 1 otherwise). */
    stanceAccuracy(s) {
        const c = this.d.crew, st = this.stance[s] & 3;
        return c === null || st === exports.ST_STAND || this.slotPilot[s] === 0 ? 1 : st === exports.ST_PRONE ? c.proneAcc : c.crouchAcc;
    }
    /**
     * Movement of a pilot on foot under direct control (ruling 18): faces the aim yaw at once, moves `move`
     * along it and `strafe` to its right at the pilot's speed (x sprintSpeedMultiplier sprinting, x
     * crouchSpeedMultiplier crouched; base speed in the air: air control). Result in sc[S_CX], sc[S_CZ].
     */
    pilotSteer(s) {
        const d = this.d, c = d.crew, q = this.sc, yaw = this.ctlYaw[s], f = this.ctlFlags[s];
        const fx = (0, fmath_ts_1.dcos)(yaw), fz = (0, fmath_ts_1.dsin)(yaw);
        this.dirX[s] = fx;
        this.dirZ[s] = fz;
        let speed = d.tSpeed[this.etype[s]] * this.speedFactor(s) * (this.fkit ? this.fkit.speedMul(this, s) : 1); // Frontline: armour
        this.stanceUpdate(s);
        // ruling 42: prone (and going down / getting up) crawls; crouched is slow; sprint only standing
        const stc = this.stance[s] & 3, moving = this.stanceT[s] !== 0;
        if (this.airborne[s] === exports.AIR_GROUND)
            speed *= stc === exports.ST_PRONE || moving ? c.proneMul : stc === exports.ST_CROUCH ? c.crouchMul : (f & exports.PC_SPRINT) ? c.sprintMul : 1;
        const th = this.ctlThrust[s], st = this.ctlStrafe[s], kv = pilotkit_ts_1.KIT_VEL;
        // S12 (pilotkit.ts): acceleration / deceleration towards the wanted velocity instead of full speed in one tick
        (0, pilotkit_ts_1.kitPilotVelocity)(this, s, (fx * th - fz * st) * speed, (fz * th + fx * st) * speed, kv);
        q[S_CX] = this.x[s] + kv[0] * d.dt;
        q[S_CZ] = this.z[s] + kv[1] * d.dt;
    }
    /**
     * Vertical motion of a pilot on foot at (nx, nz): jump (pilot.jumpSpeed), jetpack (thrust while the jet is
     * held: the free burn first, pilot.jetpackBurnSecondsHalcyon / gravity, self-recharging while not burning;
     * then energy, ruling 17), planet gravity, landing with fall damage (pilot.fallDamage: speed above safeSpeed,
     * ruling 23; ejected pilots included: their jet brakes the descent to pilot.jetpack.brakedDescentSpeed, AI pilots
     * always brake, players while they hold the jet).
     */
    pilotVertical(s) {
        const nx = this.x[s], nz = this.z[s]; // the new horizontal position (already written)
        const d = this.d, c = d.crew, dt = d.dt, g = d.gravity;
        const qg = this.sc;
        qg[S_GX] = nx;
        qg[S_GZ] = nz;
        this.groundAt(S_GX);
        const ground = qg[S_GY];
        let air = this.airborne[s];
        const flags = this.ctlOn[s] ? this.ctlFlags[s] : 0;
        let burning = false;
        const lying = (this.stance[s] & 3) === exports.ST_PRONE || this.stanceT[s] !== 0; // ruling 42: no jump pack while prone or changing stance
        if (air === exports.AIR_GROUND && !lying) {
            if (flags & exports.PC_JUMP) {
                this.velY[s] = c.jumpSpeed * (this.fkit ? this.fkit.jumpMul(this, s) : 1); // Frontline: armour
                air = exports.AIR_FLYING;
            }
            else if ((flags & exports.PC_JET) && (this.jetFuel[s] > 0 || this.energy[s] > 0)) {
                this.velY[s] = 0;
                air = exports.AIR_FLYING;
            }
        }
        if (air !== exports.AIR_GROUND) {
            // ejecting (ruling 23): the jet brakes the descent instead of climbing — it burns only while the pilot falls
            // faster than pilot.jetpack.brakedDescentSpeed. A player brakes by holding the jet; AI pilots (no control) always do.
            let jet = (flags & exports.PC_JET) !== 0;
            if (air === exports.AIR_EJECTING) {
                if (!jet && this.ctlOn[s] === 0) {
                    const ep = this.pilots.get(this.slotPilot[s]);
                    jet = ep !== undefined && ep.player < 0;
                }
                if (jet && !(this.velY[s] < -c.brakedDescent))
                    jet = false;
            }
            if (jet) {
                if (this.jetFuel[s] > 0) {
                    this.jetFuel[s] = Math.max(0, this.jetFuel[s] - dt);
                    burning = true;
                }
                else if (this.energy[s] > 0) {
                    this.energy[s] = Math.max(0, this.energy[s] - c.jetEnergyPerSecond * (this.fkit ? this.fkit.R.jetEnergyMul : 1) * dt); // Frontline: shorter hover
                    burning = true;
                }
            }
            // constant acceleration over the tick (exact kinematics: the apex of a jump is v^2 / 2g)
            let vy = this.velY[s];
            const acc = (burning ? c.jetThrust : 0) - g;
            let y = this.y[s] + vy * dt + 0.5 * acc * dt * dt;
            vy += acc * dt;
            if (burning && vy > c.jetMaxRise)
                vy = c.jetMaxRise;
            if (y <= ground) {
                const impact = -vy;
                // ruling 23: fall damage from impact speeds above pilot.fallDamage.safeSpeed (set clearly above a full free-burn hop at
                // 1 g); the impact speed sqrt(2 g h) carries the planet's gravity. Ejected pilots too (they brake with the jet).
                if (impact > c.fallSafe && this.hp[s] > 0) {
                    const dmg = (impact - c.fallSafe) * c.fallPerSpeed;
                    this.hp[s] -= dmg;
                    this.lastHit[s] = this.tick;
                    this.stats.fallDamage += dmg;
                    if (this.hp[s] <= 0) {
                        this.hp[s] = 0;
                        this.dying[this.nDying++] = s;
                        this.outright.add(s);
                    } // S12: a fatal fall kills outright (ruling 23), no downed state
                }
                y = ground;
                vy = 0;
                air = exports.AIR_GROUND;
            }
            this.y[s] = y;
            this.velY[s] = vy;
        }
        else {
            this.y[s] = ground;
            this.velY[s] = 0;
        }
        if (!burning && this.jetFuel[s] < c.jetFreeBurnSeconds) {
            const v = this.jetFuel[s] + c.jetRechargePerTick;
            this.jetFuel[s] = v > c.jetFreeBurnSeconds ? c.jetFreeBurnSeconds : v;
        }
        this.airborne[s] = air;
    }
    /**
     * Weapons of a controlled entity: mount 0 fires while firePrimary is held,
     * every other mount while fireSecondary is held, each at its own rate
     * (the same cooldown rule as fireWeapons). No auto-targeting: shots go along
     * the aim (fireAimed); melee tools hit what they touch (fireMelee).
     */
    /**
     * fix-qa2 d (doc 7 "gas is spent on ... energy weapons", doc 11 "Energy (lasers, arc guns; costs gas)"): a weapon with
     * gasPerShot > 0 takes that much gas from the firing team's stockpile per shot, for players and AI alike (a pilot on
     * foot pays the same amount from his own energy reserve instead: ruling 17 "pilot energy weapons"). The doc
     * does not say what an energy weapon does with no gas; the sim's reading (data/ASSUMPTIONS.md): it does not fire
     * (the mount stays ready and fires as soon as the team has the gas). True when weapon w of slot s cannot pay for its next shot.
     */
    /**
     * Ruling 91 (designer playtest 15 Nov, Lancer laser). Gate of a ready mount ci with a charge (weapon chargeSeconds) or heat
     * (overheatSeconds) weapon w; want: the trigger is held (player) or a target is in the arc (AI). Returns true when the
     * mount fires this tick. Charge: runs one tick per call while wanted, the shot goes when it is full; not wanted = the
     * charge is cancelled. Heat: an overheated mount is disabled until its lockout ends; the AI (ai) also stops at
     * combat.aiHeatCeiling and waits for the heat to drain to aiHeatResume, so it does not overheat.
     */
    laserGate(ci, w, want, ai) {
        const d = this.d;
        if (d.wHeatPerShot[w] > 0) {
            const o = this.mOvh[ci];
            if (o > 0) {
                if (this.tick < o) {
                    this.mChg[ci] = 0;
                    return false;
                }
                this.mOvh[ci] = 0;
            }
            if (ai) {
                if (this.mOvh[ci] === -1) {
                    if (this.mHeat[ci] > d.aiHeatResume)
                        return false;
                    this.mOvh[ci] = 0;
                }
                if (this.mHeat[ci] + d.wHeatPerShot[w] >= d.aiHeatCeiling) {
                    this.mOvh[ci] = -1;
                    return false;
                }
            }
            else if (this.mOvh[ci] === -1)
                this.mOvh[ci] = 0;
        }
        const ct = d.wChargeTicks[w];
        if (ct > 0) {
            if (!want) {
                this.mChg[ci] = 0;
                return false;
            }
            if (this.mChg[ci] >= ct)
                return true; // chargeSeconds after the trigger tick: the shot
            this.mChg[ci]++;
            return false;
        }
        return want;
    }
    /** Ruling 91: mount ci fired its laser weapon w: the charge is spent, the shot's heat added; full heat overheats it. */
    laserShot(ci, w) {
        const d = this.d;
        this.mChg[ci] = 0;
        const h = d.wHeatPerShot[w];
        if (h <= 0)
            return;
        const v = this.mHeat[ci] + h;
        if (v >= 1 - 1e-9) {
            this.mHeat[ci] = 1;
            // Frontline: an overheated laser stays locked (and hot) until its cell is replaced (fkit.swapCell)
            this.mOvh[ci] = this.fkit && this.fkit.isLaser(w) ? fkit_ts_1.CELL_STUCK : this.tick + Math.max(1, d.wLockTicks[w]);
        }
        else
            this.mHeat[ci] = v;
    }
    /** Ruling 91: one tick of heat drain of mount ci (it did not fire last tick, or it is locked out). */
    heatDrain(ci) {
        if (this.mOvh[ci] >= fkit_ts_1.CELL_STUCK)
            return; // Frontline: a spent laser cell does not cool off
        const w = this.mWeapon[ci];
        const v = this.mHeat[ci] - (w >= 0 ? this.d.wHeatDrain[w] : 1);
        this.mHeat[ci] = v > 1e-9 ? v : 0;
    }
    gasShort(s, w) {
        const g = this.d.wGas[w];
        if (g <= 0)
            return false;
        if (this.onFootPilot(s))
            return this.energy[s] + 1e-9 < g; // ruling 17: a pilot's energy weapon runs on the pilot's energy reserve
        return this.gas[this.team[s]] + 1e-9 < g;
    }
    spendShotGas(s, w) {
        const g = this.d.wGas[w];
        if (g <= 0)
            return;
        if (this.onFootPilot(s)) {
            this.energy[s] = Math.max(0, this.energy[s] - g);
            return;
        }
        const k = this.team[s];
        this.gas[k] = Math.max(0, this.gas[k] - g);
    }
    /** Slot s is a pilot's body on foot (ruling 17: pilot gear runs on pilot energy). */
    onFootPilot(s) { return this.d.crewOn && this.etype[s] === this.d.pilotType && this.slotPilot[s] !== 0; }
    fireControlled(s) {
        const d = this.d, dt = d.dt, mc = this.mCount[s], mb = s * data_ts_1.MAX_MOUNTS, fire = this.ctlFire[s];
        const q = this.sc;
        q[S_AYAW] = this.ctlYaw[s];
        q[S_APITCH] = this.ctlPitch[s];
        this.hitShooter = this.eid[s];
        this.hitPilot = this.slotPilot[s];
        this.hitCtl = this.isPlayerPilot(this.hitPilot);
        for (let m = 0; m < mc; m++) {
            const ci = mb + m;
            const prev = this.cooldown[ci];
            if (prev <= 1e-9 && this.mHeat[ci] > 0)
                this.heatDrain(ci); // ruling 91
            let cd = prev > 0 ? prev - dt : 0;
            if (cd <= 1e-9) {
                if (cd > 0)
                    cd = 0;
                let held = m === 0 ? (fire & 1) !== 0 : (fire & 2) !== 0;
                if (this.fkit && m >= 2) // Frontline: the last mount (grenade) fires with bit 4; mount 2 (slot 3 weapon) with bit 8
                    held = m === mc - 1 ? (fire & 4) !== 0 : m === 2 && (fire & 8) !== 0 && this.mWeapon[ci] !== this.fkit.emptyW;
                const fam = this.fkit && this.s15 !== null ? this.s15.ammo.get(this.eid[s]) : undefined;
                if (fam !== undefined && fam[m] >= 0 && fam[m] < 1)
                    held = false; // Frontline: out of rounds (or heat cells)
                const lw = this.mWeapon[ci], lz = lw >= 0 && (d.wChargeTicks[lw] !== 0 || d.wHeatPerShot[lw] > 0);
                if (lz)
                    held = this.laserGate(ci, lw, held && !this.gasShort(s, lw), false); // ruling 91
                if (held) {
                    const w = this.mWeapon[ci];
                    const short = this.gasShort(s, w);
                    if (!short && !d.wMelee[w]) {
                        q[S_HX] = (0, fmath_ts_1.dcos)(q[S_AYAW]);
                        q[S_HZ] = (0, fmath_ts_1.dsin)(q[S_AYAW]);
                        this.setMuzzle(s, ci);
                    }
                    const r = short ? 0 : d.wMelee[w] ? this.fireMelee(s, ci, w) : this.fireAimed(s, w, this.mFixed[ci] === 1);
                    if (r === 1) {
                        cd += d.wPeriod[w];
                        if (cd < 0)
                            cd = 0;
                        this.countShot(this.hitPilot);
                        this.spendShotGas(s, w);
                        if (fam !== undefined && fam[m] >= 0 && !this.fkit.isLaser(w))
                            fam[m] -= 1; // Frontline: a laser's ammo is its cells (spent by overheating, fkit.swapCell)
                        if (lz)
                            this.laserShot(ci, w);
                    } // w2f: recoil counter
                    else
                        cd = 0;
                }
                else
                    cd = 0;
            }
            this.cooldown[ci] = cd;
        }
    }
    /**
     * Muzzle of mount ci of slot s (the shot origin) into sc[S_MX..S_MZ]: the mount's data offset (forward, up, right;
     * CompiledData.tMuzzle) from the entity's base point, in the hull frame for hull-fixed mounts and turned to the
     * horizontal aim direction (hx, hz) for turret mounts. Without muzzle data the offset is (0, radius, 0): the
     * hit-sphere centre, exactly the old origin.
     */
    setMuzzle(s, ci) {
        const d = this.d, q = this.sc, k = (this.etype[s] * data_ts_1.MAX_MOUNTS + (ci - s * data_ts_1.MAX_MOUNTS)) * 3;
        const f = d.tMuzzle[k], u = d.tMuzzle[k + 1], r = d.tMuzzle[k + 2];
        let fx = q[S_HX], fz = q[S_HZ];
        if (this.mFixed[ci] === 1) {
            fx = this.dirX[s];
            fz = this.dirZ[s];
        }
        q[S_MX] = this.x[s] + (fx * f - fz * r);
        q[S_MY] = this.y[s] + u;
        q[S_MZ] = this.z[s] + (fz * f + fx * r);
    }
    /**
     * One manually aimed shot of weapon w from slot s along the control aim
     * (yaw, pitch). Hull-fixed mounts fire along the aim clamped to the fixed
     * arc (fixedCos) around the hull. projectileSpread and dispersionDeg apply as
     * in fire(), but always the BASE dispersionDeg: a manual shot has no target, so the
     * speed-dependent aim error (ruling 14) does not apply; no lead, no line-of-fire
     * hold (the player chooses). Straight
     * projectiles fly to full range, ballistic shells until they hit something or
     * the ground, hitscan rays to full range. Returns 1 (fired).
     */
    fireAimed(s, w, fixed) {
        const d = this.d, q = this.sc;
        const sx = q[S_MX], sy = q[S_MY], sz = q[S_MZ]; // muzzle (setMuzzle)
        const yaw = q[S_AYAW], pitch = q[S_APITCH];
        // Frontline: a shotgun shell is several pellets, each its own dispersed shot (weapons.json pellets)
        if (this.fkit && !this.flPellet) {
            const pel = d.raw.weapons[w]?.pellets ?? 1;
            if (pel > 1) {
                this.flPellet = true;
                const mx = q[S_MX], my = q[S_MY], mz = q[S_MZ];
                try {
                    for (let k = 0; k < pel; k++) {
                        q[S_MX] = mx;
                        q[S_MY] = my;
                        q[S_MZ] = mz;
                        q[S_AYAW] = yaw;
                        q[S_APITCH] = pitch;
                        this.fireAimed(s, w, fixed);
                    }
                }
                finally {
                    this.flPellet = false;
                }
                return 1;
            }
        }
        if (this.fkit && this.fkit.isTargeter(w)) { // Frontline: the missile silo's handheld targeter
            const cp0 = (0, fmath_ts_1.dcos)(pitch);
            return this.fkit.fireTargeter(this, s, sx, sy, sz, (0, fmath_ts_1.dcos)(yaw) * cp0, (0, fmath_ts_1.dsin)(pitch), (0, fmath_ts_1.dsin)(yaw) * cp0);
        }
        if (this.fkit && this.fkit.isHeal(w)) { // Frontline: the medic gun heals and revives instead of hitting
            const cp0 = (0, fmath_ts_1.dcos)(pitch);
            return this.fkit.fireHeal(this, s, w, sx, sy, sz, (0, fmath_ts_1.dcos)(yaw) * cp0, (0, fmath_ts_1.dsin)(pitch), (0, fmath_ts_1.dsin)(yaw) * cp0);
        }
        let hx = (0, fmath_ts_1.dcos)(yaw), hz = (0, fmath_ts_1.dsin)(yaw);
        if (fixed && d.fixedCos > -1) {
            const fx = this.dirX[s], fz = this.dirZ[s];
            if (fx * hx + fz * hz < d.fixedCos) {
                const c = d.fixedCos, sn = ((fx * hz - fz * hx) >= 0 ? 1 : -1) * Math.sqrt(1 - c * c);
                hx = fx * c - fz * sn;
                hz = fx * sn + fz * c;
            }
        }
        const cp = (0, fmath_ts_1.dcos)(pitch), range = d.wRange[w];
        let ax = sx + hx * cp * range, az = sz + hz * cp * range;
        const ay = sy + (0, fmath_ts_1.dsin)(pitch) * range;
        const spread = d.constants.projectileSpread * range * cp;
        this.rng.signedTo(q, S_RX);
        this.rng.signedTo(q, S_RZ);
        ax += spread * q[S_RX];
        az += spread * q[S_RZ];
        let dx = ax - sx, dy = ay - sy, dz = az - sz;
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
        q[S_UX] = dx / l;
        q[S_UY] = dy / l;
        q[S_UZ] = dz / l;
        if (d.wDispersion[w] > 0) {
            q[S_DSIG] = d.wDispersion[w] * this.stanceAccuracy(s) * this.playerFootAcc(s, w);
            if (d.wBallistic[w] === 1)
                this.shellPitchK(s, w);
            this.disperse();
        } // ruling 42: crouched / prone; ruling 109: a player on foot
        dx = q[S_UX];
        dy = q[S_UY];
        dz = q[S_UZ];
        const team = this.team[s], shooterId = this.eid[s], seen = this.seenMask(s);
        const wi = team * d.weaponIds.length + w;
        this.stats.shots++;
        this.stats.weaponShots[wi]++;
        this.lastFired[s] = this.tick;
        this.muzzleRevealIn(s, w, -1);
        const speed = d.wSpeed[w];
        if (d.wBallistic[w] === 1) {
            q[S_VX] = dx * speed;
            q[S_VY] = dy * speed;
            q[S_VZ] = dz * speed;
            q[S_T] = d.constants.maxProjectileSeconds;
            this.launchShot(s, w, true, seen);
            return 1;
        }
        if (speed <= 0) {
            // hitscan (as in fire())
            const bx = sx + dx * range, by = sy + dy * range, bz = sz + dz * range;
            q[SA_X] = sx;
            q[SA_Y] = sy;
            q[SA_Z] = sz;
            q[SB_X] = bx;
            q[SB_Y] = by;
            q[SB_Z] = bz;
            this.rayLag = this.hitCtl ? this.lagOf(this.hitPilot) : 0; // co-op lag compensation (a guest's aimed ray)
            this.raySeg(shooterId, team, d.wSkip[w]);
            this.rayLag = 0;
            this.terrainSeg();
            const tgh = q[S_TERR], rt = q[S_RAYT], hit = this.raySlot;
            this.logShot(w, team, tgh < rt && tgh <= 1 ? -1 : hit, tgh < rt && tgh <= 1 ? tgh : hit >= 0 || this.rayDome ? rt : 1);
            if (tgh < rt && tgh <= 1) {
                this.stats.groundHits++;
                if (d.wSplash[w] > 0) {
                    q[S_PX] = sx + (bx - sx) * tgh;
                    q[S_PY] = sy + (by - sy) * tgh;
                    q[S_PZ] = sz + (bz - sz) * tgh;
                    this.splash(w, -1, team, seen, shooterId);
                }
                return 1;
            }
            if (hit < 0) {
                this.stats.misses++;
                return 1;
            }
            this.stats.hits++;
            this.stats.weaponHits[wi]++;
            if (this.zoneStrike(hit, w, team))
                return 1; // ruling 11 / rev 4: a pilot zone was struck, not the hull
            q[S_INX] = dx;
            q[S_INZ] = dz;
            q[S_SCALE] = this.fkit ? this.fkit.pelletFalloff(this, w, rt * range) : 1; // Frontline: pellets lose punch with distance
            this.applyDamage(hit, w, team, seen);
            if (d.wSplash[w] > 0) {
                q[S_PX] = sx + (bx - sx) * rt;
                q[S_PY] = sy + (by - sy) * rt;
                q[S_PZ] = sz + (bz - sz) * rt;
                this.bodyImpact(hit);
                this.splash(w, hit, team, seen, shooterId);
            }
            return 1;
        }
        let T = range / speed;
        if (T > d.constants.maxProjectileSeconds)
            T = d.constants.maxProjectileSeconds;
        q[S_VX] = dx * speed;
        q[S_VY] = dy * speed;
        q[S_VZ] = dz * speed;
        q[S_T] = T;
        if (d.wHoming[w] > 0) {
            q[S_UX] = dx;
            q[S_UY] = dy;
            q[S_UZ] = dz;
            this.launchTgt = this.forceTgt ? this.forceTgt : this.homingLock(s, w); // Frontline: a lock-on salvo shot's own target
            this.forceTgt = 0;
        } // ruling 108: lock on along the aim
        this.launchShot(s, w, false, seen);
        return 1;
    }
    /**
     * Melee mount ci of s (weapon w). Target: the mount's target if it is in
     * contact, else the nearest enemy in contact (detection is not needed to hit
     * what you touch). Contact: centre distance <= both body radii + range, and
     * for hull-fixed (driver) tools the target within the fixed-weapon arc ahead.
     * Aircraft are never hit. Arm: full damage. Ram: damage x clamp(closing speed
     * / own top speed, 0, 1); no hit (and no cooldown) when not closing.
     * Returns 1 on a hit, 0 otherwise.
     */
    fireMelee(s, ci, w) {
        const d = this.d, team = this.team[s], t = this.etype[s];
        const sx = this.x[s], sz = this.z[s], rs = d.tRadius[t], range = d.wRange[w];
        const fixed = this.mFixed[ci] === 1;
        let best = -1, bestD = Infinity;
        const mt = this.mTgtSlot[ci];
        if (mt >= 0 && this.alive[mt] && this.eid[mt] === this.mTgtId[ci] && this.meleeContact(s, mt, w, fixed))
            best = mt;
        else {
            const g = this.fine, qr = rs + this.maxRadius + range + this.moveMargin;
            const c0 = g.cellOf(sx - qr), c1 = g.cellOf(sx + qr), r0 = g.cellOf(sz - qr), r1 = g.cellOf(sz + qr);
            const side = g.cellsPerSide, start = g.bucketStart, ent = g.entries, ek = g.entryKey, mask = g.mask;
            for (let cz = r0; cz <= r1; cz++)
                for (let cx = c0; cx <= c1; cx++) {
                    const key = cz * side + cx;
                    const b = (Math.imul(key, 0x9e3779b1) >>> 16) & mask;
                    for (let p = start[b], e = start[b + 1]; p < e; p++) {
                        if (ek[p] !== key)
                            continue;
                        const o = ent[p];
                        if (!this.meleeContact(s, o, w, fixed))
                            continue;
                        const dx = this.x[o] - sx, dz = this.z[o] - sz, d2 = dx * dx + dz * dz;
                        if (d2 < bestD || (d2 === bestD && this.phaseOf(o) < this.phaseOf(best))) {
                            best = o;
                            bestD = d2;
                        }
                    }
                }
        }
        if (best < 0)
            return 0;
        let ux = this.x[best] - sx, uz = this.z[best] - sz;
        const l = Math.sqrt(ux * ux + uz * uz);
        if (l > 1e-9) {
            ux /= l;
            uz /= l;
        }
        else {
            ux = this.dirX[s];
            uz = this.dirZ[s];
        }
        let scale = 1;
        if (d.wRam[w]) {
            const closing = (this.velX[s] - this.velX[best]) * ux + (this.velZ[s] - this.velZ[best]) * uz;
            const top = d.tSpeed[t];
            scale = top > 0 ? closing / top : 0;
            if (scale > 1)
                scale = 1;
            if (!(scale > 0)) {
                // pressed against the target without closing: back off to charge again
                if (this.ordType[s] === exports.ORD_ATTACK && this.eid[best] === this.ordTargetId[s])
                    this.ramPhase[s] = 1;
                return 0;
            }
        }
        this.stats.shots++;
        this.stats.hits++;
        this.stats.meleeHits++;
        const wi = team * d.weaponIds.length + w;
        this.stats.weaponShots[wi]++;
        this.stats.weaponHits[wi]++;
        this.lastFired[s] = this.tick;
        if (d.wRam[w] && this.ordType[s] === exports.ORD_ATTACK)
            this.ramPhase[s] = 1; // back off, then charge again
        const q = this.sc;
        q[S_INX] = ux;
        q[S_INZ] = uz;
        q[S_SCALE] = scale;
        this.applyDamage(best, w, team, this.seenMask(s));
        this.muzzleRevealIn(s, w, this.team[best]);
        return 1;
    }
    /** Is o an enemy ground entity that melee weapon w of s touches (see fireMelee)? */
    meleeContact(s, o, w, fixed) {
        if (o === s || this.team[o] === this.team[s] || (this.hp[o] <= 0 && !(this.simul && this.upAtStart(o))) || !this.canHit(w, o))
            return false;
        const d = this.d;
        const dx = this.x[o] - this.x[s], dz = this.z[o] - this.z[s];
        const reach = d.tRadius[this.etype[s]] + d.tRadius[this.etype[o]] + d.wRange[w];
        const d2 = dx * dx + dz * dz;
        if (d2 > reach * reach)
            return false;
        if (!fixed)
            return true;
        const l = Math.sqrt(d2);
        return l < 1e-9 || (this.dirX[s] * dx + this.dirZ[s] * dz) / l >= d.fixedCos;
    }
    /** Bitmask of teams that currently detect slot s. */
    seenMask(s) {
        let m = 0;
        for (let k = 0; k < exports.MAX_TEAMS; k++)
            if (this.detected(s, k))
                m |= 1 << k;
        return m;
    }
    /**
     * One shot of weapon w from slot s at slot ts (CONTRACTS rev 3 accuracy model):
     *  - projectile weapons lead the target: straight shots aim at the first-order
     *    intercept from the target's current velocity; ballistic shells solve the
     *    arc to the predicted ground point (low arc; the high arc if friendlies or
     *    terrain block the low one). Hitscan aims at the target.
     *  - the aim point gets the global projectileSpread, then the shot direction
     *    gets the weapon's dispersionDeg (seeded PRNG, per-axis standard deviation).
     *  - hit or miss is decided later by the swept collision only.
     * Returns 1 fired, 0 no shot possible now (no intercept within range, inside
     * minRange), 2 held (terrain blocks), 3 held (a friendly blocks; side in blockSide).
     */
    fire(s, w, ts) {
        const d = this.d, q = this.sc;
        const sx = q[S_MX], sy = q[S_MY], sz = q[S_MZ]; // muzzle (setMuzzle)
        const speed = d.wSpeed[w];
        const skip = d.wSkip[w];
        const shooterId = this.eid[s], team = this.team[s];
        const mr = d.wMinRange[w];
        if (mr > 0) {
            const ex = this.x[ts] - sx, ez = this.z[ts] - sz;
            if (ex * ex + ez * ez < mr * mr)
                return 0;
        }
        if (d.wBallistic[w] === 1)
            return this.fireBallistic(s, w, ts);
        let ax = this.x[ts], ay = (this.y[ts] + this.d.tRadius[this.etype[ts]]), az = this.z[ts];
        if (speed > 0) {
            // first-order intercept: |R + V t| = speed t, R = target - muzzle, V = target velocity
            const vx = this.velX[ts], vz = this.velZ[ts];
            const rx = ax - sx, ry = ay - sy, rz = az - sz;
            const a = vx * vx + vz * vz - speed * speed, b = 2 * (rx * vx + rz * vz), c = rx * rx + ry * ry + rz * rz;
            let t = -1;
            if (a > -1e-9 && a < 1e-9) {
                if (b < 0)
                    t = -c / b;
            }
            else {
                const disc = b * b - 4 * a * c;
                if (disc >= 0) {
                    const sq = Math.sqrt(disc);
                    const t1 = (-b - sq) / (2 * a), t2 = (-b + sq) / (2 * a);
                    t = t1 > 0 && (t2 <= 0 || t1 < t2) ? t1 : t2;
                }
            }
            if (!(t > 0) || t * speed > d.wRange[w] * this.hgK)
                return 0; // cannot catch it within range (T1: x high ground)
            let lk = d.tStructure[this.etype[s]] ? d.structureLeadFraction : 1; // designer 15 Nov: structure turrets lead imperfectly
            if (d.tRadius[this.etype[ts]] < 1 && d.tRadius[this.etype[s]] >= 1)
                lk *= d.aiSmallTargetLead; // ruling 126: AI fire leads a moving small target short
            ax += vx * t * lk;
            az += vz * t * lk;
        }
        // Line of fire to the aim point: hold if terrain or a friendly is in the way (an enemy is fair
        // game). The check stops where the shot meets the target's hit sphere (target radius +
        // projectileHitRadius before the aim point): a friendly beyond that point, e.g. one in
        // contact with the target, is not in the shot's path, because the shot bursts on the target first.
        {
            const lx = ax - sx, ly = ay - sy, lz = az - sz;
            const L = Math.sqrt(lx * lx + ly * ly + lz * lz);
            const stop = d.tRadius[this.etype[ts]] + d.constants.projectileHitRadius;
            const k = L > stop ? (L - stop) / L : 0;
            q[SA_X] = sx;
            q[SA_Y] = sy;
            q[SA_Z] = sz;
            q[SB_X] = sx + lx * k;
            q[SB_Y] = sy + ly * k;
            q[SB_Z] = sz + lz * k;
        }
        this.terrainSeg();
        this.raySeg(shooterId, team, skip);
        const tg = q[S_TERR], rt0 = q[S_RAYT];
        if (tg < 1 && tg < rt0)
            return 2;
        if (this.raySlot >= 0 && this.team[this.raySlot] === team) {
            q[S_SX] = sx;
            q[S_SZ] = sz;
            q[S_TX] = ax;
            q[S_TZ] = az;
            this.blockSide = this.sideOf(this.raySlot);
            return 3;
        }
        const dx0 = ax - sx, dz0 = az - sz;
        const spread = d.constants.projectileSpread * Math.sqrt(dx0 * dx0 + dz0 * dz0);
        this.rng.signedTo(q, S_RX);
        this.rng.signedTo(q, S_RZ);
        ax += spread * q[S_RX];
        az += spread * q[S_RZ];
        let dx = ax - sx, dy = ay - sy, dz = az - sz;
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (l < 1e-9)
            return 0;
        q[S_UX] = dx / l;
        q[S_UY] = dy / l;
        q[S_UZ] = dz / l;
        if (d.wDispersion[w] > 0) {
            this.aimSigma(w, ts, s);
            this.disperse();
        }
        dx = q[S_UX];
        dy = q[S_UY];
        dz = q[S_UZ];
        const seen = this.seenMask(s);
        const wi = team * d.weaponIds.length + w;
        this.stats.shots++;
        this.stats.weaponShots[wi]++;
        this.lastFired[s] = this.tick;
        this.muzzleRevealIn(s, w, this.team[ts]);
        if (speed <= 0) {
            // hitscan: a ray out to full range along the (dispersed) aim line
            const k = d.wRange[w] * this.hgK;
            const bx = sx + dx * k, by = sy + dy * k, bz = sz + dz * k;
            q[SA_X] = sx;
            q[SA_Y] = sy;
            q[SA_Z] = sz;
            q[SB_X] = bx;
            q[SB_Y] = by;
            q[SB_Z] = bz;
            this.rayLag = this.hitCtl ? this.lagOf(this.hitPilot) : 0; // co-op lag compensation (a guest's aimed ray)
            this.raySeg(shooterId, team, skip);
            this.rayLag = 0;
            this.terrainSeg();
            const tgh = q[S_TERR], rt = q[S_RAYT], hit = this.raySlot;
            this.logShot(w, team, tgh < rt && tgh <= 1 ? -1 : hit, tgh < rt && tgh <= 1 ? tgh : hit >= 0 || this.rayDome ? rt : 1);
            if (tgh < rt && tgh <= 1) {
                this.stats.groundHits++;
                if (d.wSplash[w] > 0) {
                    q[S_PX] = sx + (bx - sx) * tgh;
                    q[S_PY] = sy + (by - sy) * tgh;
                    q[S_PZ] = sz + (bz - sz) * tgh;
                    this.splash(w, -1, team, seen, shooterId);
                }
                return 1;
            }
            if (hit < 0) {
                this.stats.misses++;
                return 1;
            }
            this.stats.hits++;
            this.stats.weaponHits[wi]++;
            if (this.zoneStrike(hit, w, team))
                return 1; // ruling 11 / rev 4: a pilot zone was struck, not the hull
            q[S_INX] = dx;
            q[S_INZ] = dz;
            q[S_SCALE] = this.fkit ? this.fkit.pelletFalloff(this, w, rt * k) : 1; // Frontline: pellets lose punch with distance
            this.applyDamage(hit, w, team, seen);
            if (d.wSplash[w] > 0) {
                q[S_PX] = sx + (bx - sx) * rt;
                q[S_PY] = sy + (by - sy) * rt;
                q[S_PZ] = sz + (bz - sz) * rt;
                this.bodyImpact(hit);
                this.splash(w, hit, team, seen, shooterId);
            }
            return 1;
        }
        let T = d.wRange[w] * this.hgK / speed; // straight shots fly on to full range if they miss
        if (T > d.constants.maxProjectileSeconds)
            T = d.constants.maxProjectileSeconds;
        q[S_VX] = dx * speed;
        q[S_VY] = dy * speed;
        q[S_VZ] = dz * speed;
        q[S_T] = T;
        this.launchTgt = d.aiHomingSmall || d.tRadius[this.etype[ts]] >= 1 || d.tRadius[this.etype[s]] < 1 ? this.eid[ts] : 0; // ruling 108: a homing weapon steers toward the target it was fired at; ruling 126: an AI shot never locks a small target
        this.launchShot(s, w, false, seen);
        return 1;
    }
    /** Ballistic shot (see fire). */
    fireBallistic(s, w, ts) {
        const d = this.d, q = this.sc;
        const sx = q[S_MX], sz = q[S_MZ];
        const team = this.team[s];
        // aim spread offsets, drawn once per attempt
        this.rng.signedTo(q, S_RX);
        this.rng.signedTo(q, S_RZ);
        // ruling 40: indirect fire needs no line of fire. The low arc if its path is clear, else the high arc, fired even when
        // something (a ridge, a building, a friendly) is in its path; if the high arc cannot be solved, the low one. The shell
        // then flies its real arc (it bursts on whatever it meets).
        let haveLow = false, used = 0;
        for (let arc = 0; arc < 2; arc++) {
            if (!this.ballisticLead(s, w, ts, arc)) {
                if (haveLow) {
                    this.loadArc();
                    break;
                }
                return 0;
            } // unreachable: no shot
            // spread on the predicted aim point, then the final launch solution to it
            const px = q[S_PX], pz = q[S_PZ];
            const ex = px - sx, ez = pz - sz;
            const spread = d.constants.projectileSpread * Math.sqrt(ex * ex + ez * ez);
            q[S_QX] = px + spread * q[S_RX];
            q[S_QZ] = pz + spread * q[S_RZ];
            this.groundQ();
            q[S_PY] = q[S_QY]; // aim height (sc[S_PX], sc[S_PZ] keep the predicted point)
            if (!this.ballisticSolveTo(s, w, arc) || q[S_T] > d.constants.maxProjectileSeconds) {
                if (haveLow) {
                    this.loadArc();
                    break;
                }
                return 0;
            }
            used = arc;
            if (arc === 1 || this.arcBlocked(s, w) === 0)
                break;
            this.saveArc();
            haveLow = true;
        }
        // launch velocity in S_VX..S_VZ, aim point S_PX..S_PZ; ruling 131: dispersion scatters the aim point on the ground
        // (sigma x distance across and along the line of fire) and the same arc is solved to it
        if (d.wDispersion[w] > 0) {
            this.aimSigma(w, ts, s);
            this.scatterArc(s, w, used);
        }
        const vx = q[S_VX], vy = q[S_VY], vz = q[S_VZ];
        // flight time back down to the aim height (the aim point's ground); terrain may end it earlier
        const g = d.gravity, sy = q[S_MY], drop = q[S_PY] - sy;
        const disc = vy * vy - 2 * g * drop;
        let T = q[S_T];
        if (disc >= 0)
            T = (vy + Math.sqrt(disc)) / g;
        if (!(T > 0) || T > d.constants.maxProjectileSeconds)
            return 0;
        const seen = this.seenMask(s);
        this.stats.shots++;
        this.stats.weaponShots[team * d.weaponIds.length + w]++;
        this.lastFired[s] = this.tick;
        this.muzzleRevealIn(s, w, this.team[ts]);
        q[S_VX] = vx;
        q[S_VY] = vy;
        q[S_VZ] = vz;
        q[S_T] = T;
        this.launchShot(s, w, true, seen);
        return 1;
    }
    /**
     * Ruling 131: ballistic dispersion on the ground. The angular sigma sc[S_DSIG] becomes an aim-point error of sigma x
     * the muzzle-to-aim-point distance across and along the line of fire (normal deviates as disperse()), and the arc
     * (0 low, 1 high) is solved to that point (aim point sc[S_PX..S_PZ] and launch sc[S_VX..S_VZ], sc[S_T] replaced). The
     * old angular perturbation of the launch direction blew a shallow low arc's elevation error up into a range error of
     * hundreds of metres (Strider siege gun, 140 m/s: about 4 km per radian). If the arc to the scattered point cannot be
     * solved, the undispersed launch stays.
     */
    scatterArc(s, w, arc) {
        const q = this.sc, r = this.rng, sigma = q[S_DSIG];
        r.signedTo(q, S_RX);
        let n1 = q[S_RX];
        r.signedTo(q, S_RX);
        n1 += q[S_RX];
        r.signedTo(q, S_RX);
        n1 += q[S_RX];
        r.signedTo(q, S_RZ);
        let n2 = q[S_RZ];
        r.signedTo(q, S_RZ);
        n2 += q[S_RZ];
        r.signedTo(q, S_RZ);
        n2 += q[S_RZ];
        const px = q[S_PX], py = q[S_PY], pz = q[S_PZ], ex = px - q[S_MX], ez = pz - q[S_MZ], ey = py - q[S_MY];
        const h = Math.sqrt(ex * ex + ez * ez);
        if (h < 1e-6)
            return;
        const L = Math.sqrt(h * h + ey * ey), ux = ex / h, uz = ez / h, across = sigma * n1 * L, along = sigma * n2 * L;
        const vx = q[S_VX], vy = q[S_VY], vz = q[S_VZ], T = q[S_T];
        q[S_QX] = px + ux * along - uz * across;
        q[S_QZ] = pz + uz * along + ux * across;
        this.groundQ();
        if (!this.ballisticSolveTo(s, w, arc) || q[S_T] > this.d.constants.maxProjectileSeconds) {
            q[S_VX] = vx;
            q[S_VY] = vy;
            q[S_VZ] = vz;
            q[S_T] = T;
            return;
        }
        q[S_PX] = q[S_QX];
        q[S_PY] = q[S_QY];
        q[S_PZ] = q[S_QZ];
    }
    /** Ruling 131: disperse() multiplies its pitch error by this once (then back to 1). Scratch, not state. */
    dispPitchK = 1;
    /**
     * Ruling 131: a manually aimed shell (no target point) scatters on the ground as an AI shell does (scatterArc): its
     * pitch error is scaled so that the range error on flat ground at the shooter's height is sigma x the distance to
     * where it lands (at most the plain angular error). Unit direction in sc[S_UX..S_UZ], muzzle sc[S_MX..S_MZ].
     */
    shellPitchK(s, w) {
        const q = this.sc, v = this.d.wSpeed[w], g = this.d.gravity;
        let h = q[S_MY] - this.y[s];
        if (h < 0)
            h = 0;
        const sn = q[S_UY], c = Math.sqrt(q[S_UX] * q[S_UX] + q[S_UZ] * q[S_UZ]);
        const Q = Math.sqrt(v * v * sn * sn + 2 * g * h);
        if (!(Q > 1e-9) || !(v > 0))
            return;
        const R = (v * c * (v * sn + Q)) / g;
        const dR = Math.abs((v / g) * (-v * sn * sn - sn * Q + v * c * c + (v * v * sn * c * c) / Q));
        const L = Math.sqrt(R * R + h * h);
        if (dR > L)
            this.dispPitchK = L / dR;
    }
    /** Ruling 40: keeps / restores the low-arc launch solution (S_VX..S_VZ, S_T, aim point S_PX..S_PZ); scratch, not state. */
    arcSave = [0, 0, 0, 0, 0, 0, 0]; // plain array: scratch, not a state field
    saveArc() { const q = this.sc, a = this.arcSave; a[0] = q[S_VX]; a[1] = q[S_VY]; a[2] = q[S_VZ]; a[3] = q[S_T]; a[4] = q[S_PX]; a[5] = q[S_PY]; a[6] = q[S_PZ]; }
    loadArc() { const q = this.sc, a = this.arcSave; q[S_VX] = a[0]; q[S_VY] = a[1]; q[S_VZ] = a[2]; q[S_T] = a[3]; q[S_PX] = a[4]; q[S_PY] = a[5]; q[S_PZ] = a[6]; }
    /**
     * Ruling 40 attack-ground: one shell of ballistic weapon w from slot s at the ground point (gx, gz): no target, so no
     * lead and the base dispersion; projectileSpread, minRange and range as for a target; no line-of-fire hold (low arc if
     * clear, else high). The shot reveals the shooter to every other team (no target team). Returns 1 fired, 0 no shot.
     */
    fireBallisticAt(s, w, gx, gz) {
        const d = this.d, q = this.sc, sx = q[S_MX], sz = q[S_MZ], team = this.team[s];
        const ex = gx - sx, ez = gz - sz, mr = d.wMinRange[w];
        if (ex * ex + ez * ez < mr * mr)
            return 0;
        this.rng.signedTo(q, S_RX);
        this.rng.signedTo(q, S_RZ);
        const spread = d.constants.projectileSpread * Math.sqrt(ex * ex + ez * ez);
        let haveLow = false, used = 0;
        for (let arc = 0; arc < 2; arc++) {
            q[S_QX] = gx + spread * q[S_RX];
            q[S_QZ] = gz + spread * q[S_RZ];
            this.groundQ();
            q[S_PX] = q[S_QX];
            q[S_PY] = q[S_QY];
            q[S_PZ] = q[S_QZ];
            if (!this.ballisticSolveTo(s, w, arc) || q[S_T] > d.constants.maxProjectileSeconds) {
                if (haveLow) {
                    this.loadArc();
                    break;
                }
                return 0;
            }
            used = arc;
            if (arc === 1 || this.arcBlocked(s, w) === 0)
                break;
            this.saveArc();
            haveLow = true;
        }
        if (d.wDispersion[w] > 0) {
            q[S_DSIG] = d.wDispersion[w] * q[S_AIMMUL];
            this.scatterArc(s, w, used);
        } // ruling 131: on the ground
        const vx = q[S_VX], vy = q[S_VY], vz = q[S_VZ];
        const g = d.gravity, drop = q[S_PY] - q[S_MY], disc = vy * vy - 2 * g * drop;
        let T = q[S_T];
        if (disc >= 0)
            T = (vy + Math.sqrt(disc)) / g;
        if (!(T > 0) || T > d.constants.maxProjectileSeconds)
            return 0;
        const seen = this.seenMask(s);
        this.stats.shots++;
        this.stats.weaponShots[team * d.weaponIds.length + w]++;
        this.lastFired[s] = this.tick;
        this.muzzleRevealIn(s, w, -1);
        q[S_VX] = vx;
        q[S_VY] = vy;
        q[S_VZ] = vz;
        q[S_T] = T;
        this.launchShot(s, w, true, seen);
        return 1;
    }
    /**
     * Ballistic lead: fixed-point iteration t <- flightTime(target ground point at
     * time t) on the given arc (0 low, 1 high), LEAD_ITERS steps at most. On
     * success the predicted aim point is in sc[S_PX..S_PZ] and true is returned;
     * false if the point is out of reach or the iteration does not converge.
     */
    ballisticLead(s, w, ts, arc) {
        const q = this.sc;
        const lf = this.d.tRadius[this.etype[ts]] < 1 && this.d.tRadius[this.etype[s]] >= 1 ? this.d.aiSmallTargetLead : 1; // ruling 126: AI shells lead a moving small target short
        const tx = this.x[ts], tz = this.z[ts], vx = this.velX[ts] * lf, vz = this.velZ[ts] * lf;
        let t = 0, ok = false;
        for (let k = 0; k < LEAD_ITERS; k++) {
            const px = tx + vx * t, pz = tz + vz * t;
            q[S_QX] = px;
            q[S_QZ] = pz;
            this.groundQ();
            if (!this.ballisticSolveTo(s, w, arc))
                return false;
            const nt = q[S_T];
            const err = nt - t;
            t = nt;
            if (err < 1e-3 && err > -1e-3) {
                ok = true;
                break;
            } // 1 ms of flight: the shell lands within centimetres
            if (vx === 0 && vz === 0) {
                ok = true;
                break;
            }
        }
        if (!ok)
            return false;
        q[S_QX] = tx + vx * t;
        q[S_QZ] = tz + vz * t;
        this.groundQ();
        q[S_PX] = q[S_QX];
        q[S_PY] = q[S_QY];
        q[S_PZ] = q[S_QZ];
        return true;
    }
    /**
     * Launch solution of shell weapon w from slot s to the point (px, py, pz) on
     * the given arc (0 low, 1 high): velocity in sc[S_VX..S_VZ], flight time in
     * sc[S_T]. False if out of reach. Only + - * / sqrt (same maths as ballisticSolve).
     */
    ballisticSolveTo(s, w, arc) {
        const d = this.d, q = this.sc;
        const px = q[S_QX], py = q[S_QY], pz = q[S_QZ];
        const dx = px - q[S_MX], dz = pz - q[S_MZ], dy = py - q[S_MY];
        const hd = Math.sqrt(dx * dx + dz * dz);
        if (hd < 1e-6)
            return false;
        const g = d.gravity, v = d.wSpeed[w], v2 = v * v;
        const disc = v2 * v2 - g * (g * hd * hd + 2 * dy * v2);
        if (disc < 0)
            return false;
        const tan = (arc === 0 ? v2 - Math.sqrt(disc) : v2 + Math.sqrt(disc)) / (g * hd);
        const vh = v / Math.sqrt(1 + tan * tan);
        q[S_VX] = (dx / hd) * vh;
        q[S_VZ] = (dz / hd) * vh;
        q[S_VY] = vh * tan;
        q[S_T] = hd / vh;
        return true;
    }
    /**
     * Checks the arc in sc[S_VX..S_VZ], sc[S_T] from slot s in ARC_CHORDS chords
     * against the current positions of entities and the terrain. Returns 0 clear
     * (or the first thing in the way is an enemy), 2 terrain in the way (not
     * counting the last chord, where the shell comes down), 3 a friendly in the
     * way (blockSide set).
     */
    arcBlocked(s, w) {
        const d = this.d, q = this.sc;
        const x0 = q[S_MX], y0 = q[S_MY], z0 = q[S_MZ];
        const vx = q[S_VX], vy = q[S_VY], vz = q[S_VZ], T = q[S_T], hg = 0.5 * d.gravity;
        const shooterId = this.eid[s], team = this.team[s];
        for (let k = 0; k < ARC_CHORDS; k++) {
            const t0 = (T * k) / ARC_CHORDS, t1 = (T * (k + 1)) / ARC_CHORDS;
            q[SA_X] = x0 + vx * t0;
            q[SA_Y] = y0 + vy * t0 - hg * t0 * t0;
            q[SA_Z] = z0 + vz * t0;
            q[SB_X] = x0 + vx * t1;
            q[SB_Y] = y0 + vy * t1 - hg * t1 * t1;
            q[SB_Z] = z0 + vz * t1;
            this.raySeg(shooterId, team, d.wSkip[w] | 1);
            const rt = q[S_RAYT], hit = this.raySlot;
            let tg = Infinity;
            if (k < ARC_CHORDS - 1) {
                this.terrainSeg();
                tg = q[S_TERR];
            }
            if (tg <= 1 && tg < rt)
                return 2;
            if (hit >= 0) {
                if (this.team[hit] !== team)
                    return 0;
                q[S_SX] = x0;
                q[S_SZ] = z0;
                q[S_TX] = q[S_PX];
                q[S_TZ] = q[S_PZ];
                this.blockSide = this.sideOf(hit);
                return 3;
            }
        }
        return 0;
    }
    /** +1 if entity b is to the left of the line (sx, sz) -> (tx, tz), else -1; the shooter should step to the other side. */
    sideOf(b) {
        const q = this.sc, sx = q[S_SX], sz = q[S_SZ], tx = q[S_TX], tz = q[S_TZ]; // line (sx, sz) -> (tx, tz) in scratch: no boxed arguments
        const dx = tx - sx, dz = tz - sz;
        const left = (this.x[b] - sx) * -dz + (this.z[b] - sz) * dx;
        return left > 0 ? -1 : 1;
    }
    /**
     * Effective angular error (radians, per-axis standard deviation) of one shot of
     * weapon w at slot ts (CONTRACTS ruling 14): dispersionDeg x (1 + aimErrorSpeedFactor
     * x targetSpeed / aimErrorReferenceSpeed), targetSpeed = the target's actual speed
     * (m/s, its velocity over the last tick) at the moment of firing. Factor 0 (or the
     * constants absent): the base dispersion, bit-identical to the old rule.
     * Direct-control shots (fireAimed) have no target and use the base dispersion.
     */
    aimSigma(w, ts, s) {
        // designer playtest 15 Nov: AI fire (aimSigma is the auto-targeting path; players fire through fireAimed) spreads wider at small targets (pilots, infantry)
        // designer 16 Nov 19:54: troopers and pilots (radius < 1 m) shooting do not have this penalty, only vehicles, turrets and structures
        const small = this.d.tRadius[this.etype[ts]] < 1 && this.d.tRadius[this.etype[s]] >= 1 ? this.d.aiSmallTargetSpread : 1;
        const base = this.d.wDispersion[w] * this.sc[S_AIMMUL] * small, k = this.d.constants.aimErrorPerSpeed;
        if (k === 0) {
            this.sc[S_DSIG] = base;
            return;
        }
        const vx = this.velX[ts], vz = this.velZ[ts];
        this.sc[S_DSIG] = base * (1 + k * Math.sqrt(vx * vx + vz * vz)); // into scratch for disperse(): no boxed doubles
    }
    /**
     * Perturbs the unit direction sc[S_UX..S_UZ] by two independent angular
     * errors (yaw and pitch) with standard deviation sigma radians. The normal
     * deviates are sums of 3 uniform(-1, 1) draws (variance exactly 1, |n| <= 3);
     * rotations use the polynomial dsin/dcos, so the result is bit-identical on
     * every engine.
     */
    disperse() {
        const q = this.sc, r = this.rng, sigma = q[S_DSIG];
        r.signedTo(q, S_RX);
        let n1 = q[S_RX];
        r.signedTo(q, S_RX);
        n1 += q[S_RX];
        r.signedTo(q, S_RX);
        n1 += q[S_RX];
        r.signedTo(q, S_RZ);
        let n2 = q[S_RZ];
        r.signedTo(q, S_RZ);
        n2 += q[S_RZ];
        r.signedTo(q, S_RZ);
        n2 += q[S_RZ];
        q[S_TA] = sigma * n1;
        q[S_TA + 3] = sigma * n2 * this.dispPitchK;
        this.dispPitchK = 1; // ruling 131: a manual shell's pitch error scaled
        (0, fmath_ts_1.sinCosTo)(q, S_TA);
        (0, fmath_ts_1.sinCosTo)(q, S_TA + 3); // dsin / dcos on the scratch array (same arithmetic; no boxed returns)
        const t1 = q[S_TA + 1] / q[S_TA + 2], t2 = q[S_TA + 4] / q[S_TA + 5];
        const dx = q[S_UX], dy = q[S_UY], dz = q[S_UZ];
        // u: horizontal, perpendicular to d; v = d x u
        const h = Math.sqrt(dx * dx + dz * dz);
        let ux = 1, uz = 0;
        if (h > 1e-9) {
            ux = -dz / h;
            uz = dx / h;
        }
        const vx = dy * uz, vy = dz * ux - dx * uz, vz = -dy * ux;
        let nx = dx + t1 * ux + t2 * vx, ny = dy + t2 * vy, nz = dz + t1 * uz + t2 * vz;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= l;
        ny /= l;
        nz /= l;
        q[S_UX] = nx;
        q[S_UY] = ny;
        q[S_UZ] = nz;
    }
    /**
     * sc[S_QY] = terrain height at (sc[S_QX], sc[S_QZ]): Terrain.height inlined on
     * scratch slots, because a double returned from a non-inlined call is boxed.
     */
    groundQ() { this.groundAt(S_QX); }
    /** sc[i + 1] = terrain height at (sc[i], sc[i + 2]) (Terrain.height inlined: same arithmetic; doubles stay in the scratch array). */
    groundAt(i0) {
        const q = this.sc, g = this.grid;
        if (!g) {
            q[i0 + 1] = 0;
            return;
        }
        const nx = g.cols, nz = g.rows;
        let fx = q[i0] / g.cell, fz = q[i0 + 2] / g.cell;
        if (fx < 0)
            fx = 0;
        else if (fx > nx - 1)
            fx = nx - 1;
        if (fz < 0)
            fz = 0;
        else if (fz > nz - 1)
            fz = nz - 1;
        let i = Math.floor(fx), j = Math.floor(fz);
        if (i > nx - 2)
            i = nx - 2;
        if (j > nz - 2)
            j = nz - 2;
        const tx = fx - i, tz = fz - j, h = g.h, o = j * nx + i;
        const h0 = h[o] + (h[o + 1] - h[o]) * tx, h1 = h[o + nx] + (h[o + nx + 1] - h[o + nx]) * tx;
        q[i0 + 1] = h0 + (h1 - h0) * tz;
    }
    /** Adds a projectile from slot s's muzzle; velocity sc[S_VX..S_VZ], flight time sc[S_T] (scratch: no boxed double arguments). */
    launch(s, w, ballistic, seen) {
        const q = this.sc, vx = q[S_VX], vy = q[S_VY], vz = q[S_VZ], T = q[S_T];
        this.stats.projectilesSpawned++;
        if (this.pN >= this.pCap)
            this.growProjectiles(this.pCap * 2);
        const i = this.pN++;
        this.pId[i] = this.nextProjId++;
        this.pX0[i] = q[S_MX];
        this.pY0[i] = q[S_MY];
        this.pZ0[i] = q[S_MZ]; // the muzzle (setMuzzle)
        this.pVX[i] = vx;
        this.pVY[i] = vy;
        this.pVZ[i] = vz;
        this.pT[i] = T;
        this.pLaunch[i] = this.tick;
        this.pWeapon[i] = w;
        this.pTeam[i] = this.team[s];
        this.pBallistic[i] = ballistic ? 1 : 0;
        this.pShooter[i] = this.eid[s];
        this.pSeen[i] = seen;
        this.pPilot[i] = this.hitCtl ? -this.hitPilot : this.hitPilot;
        this.pTgt[i] = this.d.wHoming[w] > 0 ? this.launchTgt : 0;
    }
    /**
     * Ruling 108: launch() for every projectile of one shot. A salvo weapon (weapon.salvo 2) fires two projectiles side by side,
     * SALVO_HALF_GAP metres either side of the muzzle across the flight direction, with the same velocity. Clears launchTgt.
     */
    launchShot(s, w, ballistic, seen) {
        const n = this.d.wSalvo[w];
        if (n < 2) {
            this.launch(s, w, ballistic, seen);
            this.launchTgt = 0;
            return;
        }
        const q = this.sc, vx = q[S_VX], vz = q[S_VZ], l = Math.sqrt(vx * vx + vz * vz);
        const ox = l > 1e-9 ? (-vz / l) * SALVO_HALF_GAP : 0, oz = l > 1e-9 ? (vx / l) * SALVO_HALF_GAP : SALVO_HALF_GAP;
        const mx = q[S_MX], my = q[S_MY], mz = q[S_MZ];
        if (n === 2) {
            q[S_MX] = mx + ox;
            q[S_MZ] = mz + oz;
            this.launch(s, w, ballistic, seen);
            q[S_MX] = mx - ox;
            q[S_MZ] = mz - oz;
            this.launch(s, w, ballistic, seen);
        }
        else {
            // ruling 130: a pack two rows high (rows SALVO_HALF_GAP apart, columns SALVO_HALF_GAP apart across the flight)
            const cols = Math.ceil(n / 2);
            for (let k = 0; k < n; k++) {
                const f = (k >> 1) - (cols - 1) / 2, up = (k & 1) === 0 ? 0.5 * SALVO_HALF_GAP : -0.5 * SALVO_HALF_GAP;
                q[S_MX] = mx + ox * f;
                q[S_MY] = my + up;
                q[S_MZ] = mz + oz * f;
                this.launch(s, w, ballistic, seen);
            }
        }
        q[S_MX] = mx;
        q[S_MY] = my;
        q[S_MZ] = mz;
        this.stats.shots += n - 1;
        this.stats.weaponShots[this.team[s] * this.d.weaponIds.length + w] += n - 1; // every further projectile counts as a shot
        this.launchTgt = 0;
    }
    /**
     * Ruling 108: lock-on for a player's homing shot along the aim (unit vector sc[S_UX..S_UZ]) from the muzzle: the nearest
     * enemy unit (not a structure) the shooter's team has detected, within the weapon's range and HOMING_LOCK_COS of the aim.
     * Returns its entity id, 0 if none.
     */
    homingLock(s, w) {
        const q = this.sc, sx = q[S_MX], sy = q[S_MY], sz = q[S_MZ], ux = q[S_UX], uy = q[S_UY], uz = q[S_UZ], R = this.d.wRange[w], tm = this.team[s];
        let best = 0, bd = R * R;
        for (let k = 0; k < this.nLive; k++) {
            const o = this.live[k];
            if (!this.alive[o] || this.hp[o] <= 0 || this.team[o] === tm || this.d.tStructure[this.etype[o]] || !this.detected(o, tm))
                continue;
            if (this.d.tAir[this.etype[o]] && !this.d.wCanHitAir[w])
                continue;
            const dx = this.x[o] - sx, dy = this.y[o] + this.d.tRadius[this.etype[o]] - sy, dz = this.z[o] - sz, d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= bd || d2 < 1)
                continue;
            if ((dx * ux + dy * uy + dz * uz) < HOMING_LOCK_COS * Math.sqrt(d2))
                continue;
            bd = d2;
            best = this.eid[o];
        }
        return best;
    }
    /**
     * Moves the impact point sc[S_PX..S_PZ] (where the shot's fuse sphere met the
     * entity) onto the true body of slot e: the nearest point of e's sphere.
     * Splash is centred there (CONTRACTS rev 3), not on the inflated hit sphere.
     */
    bodyImpact(e) {
        const q = this.sc, r = this.d.tRadius[this.etype[e]];
        const cx = this.x[e], cy = this.y[e] + r, cz = this.z[e];
        const fx = q[S_PX] - cx, fy = q[S_PY] - cy, fz = q[S_PZ] - cz;
        const l = Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (l <= r)
            return;
        const k = r / l;
        q[S_PX] = cx + fx * k;
        q[S_PY] = cy + fy * k;
        q[S_PZ] = cz + fz * k;
    }
    /**
     * Applies one hit of weapon w to slot e. sc[S_INX], sc[S_INZ]: horizontal
     * direction the shot was travelling (0, 0: no direction, no rear bonus);
     * sc[S_SCALE]: damage scale (ram closing speed; 1 otherwise). seen: teams
     * that had detected the shooter (backstab).
     */
    applyDamage(e, w, shooterTeam, seen) {
        const d = this.d, t = this.etype[e], c = d.constants, q = this.sc;
        if (this.hp[e] <= 0)
            return;
        const dtype = d.wDamageType[w];
        let dmg = d.wDamage[w] * d.matrix[dtype * data_ts_1.N_AC + d.tArmour[t]] * q[S_SCALE];
        if (this.prog && this.prog.applied.size)
            dmg *= (0, progression_ts_1.progDamageMul)(this, this.hitPilot, w, e); // w2e: mastery (weapon damage, player-driven hull)
        if (this.fkit)
            dmg *= this.fkit.damageMul(this, e); // Frontline: pilot armour
        let bonus = 1;
        // constants read up front: a property load first reached late in a run (e.g. the
        // first backstab) deoptimised this function (bench/ticks.ts --trace-deopt evidence)
        const rearBonus = c.rearDamageBonus, stabBonus = c.backstabDamageBonus, ffDirect = c.friendlyFireDirect, ffExpl = c.friendlyFireExplosive;
        if (c.rearOn && d.tVehicle[t]) {
            const inX = q[S_INX], inZ = q[S_INZ];
            const l = Math.sqrt(inX * inX + inZ * inZ);
            // direction to the attacker is -in; compare with the target's facing at impact
            if (l > 1e-9 && -(this.dirX[e] * inX + this.dirZ[e] * inZ) / l < d.rearDot)
                bonus += rearBonus;
        }
        const friendly = this.team[e] === shooterTeam;
        if (c.backstabOn && !friendly && !d.tStructure[t] && (seen & (1 << this.team[e])) === 0)
            bonus += stabBonus; // units only
        dmg *= bonus;
        if (this.weather !== null && dtype === data_ts_1.DT_EXPLOSIVE)
            dmg *= this.weather.e.explosive; // wave 2 D: methane rain
        if (this.sp !== null)
            dmg *= this.sp.damageMul(this, e, w); // fix-qa2: armoured control node (siege only), garrison armour
        if (friendly) {
            this.stats.friendlyHits++;
            dmg *= c.friendlyFireOn ? (dtype === data_ts_1.DT_EXPLOSIVE || dtype === data_ts_1.DT_FLAK ? ffExpl : ffDirect) : 0;
        }
        if (dmg <= 0)
            return;
        if (this.cheat !== null && (0, cheats_ts_1.cheatGod)(this, e))
            return; // D1 test cheat: god mode
        if (this.bfx !== null && !friendly) {
            dmg = this.bfx.damage(this, e, dmg, shooterTeam);
            if (dmg <= 0)
                return;
        } // fix-qa2: armour plating, Shield Projector dome
        this.lastHit[e] = this.tick;
        this.stats.damage[shooterTeam] += Math.min(dmg, this.hp[e] + this.shield[e]);
        const fl = friendly ? events_ts_1.F_FRIENDLY : 0, hitDmg = dmg;
        let shd = 0;
        if (this.shield[e] > 0 && !(this.weather !== null && this.weather.e.shieldsOff)) { // wave 2 D: solar flare
            const sm = c.shieldMultiplier[dtype];
            if (sm <= 0)
                return; // shields stop this damage type completely
            const sd = dmg * sm;
            this.lastShHit[e] = this.tick;
            if (this.shield[e] >= sd) {
                this.shield[e] -= sd;
                this.logHit(shooterTeam, this.eid[e], w, 0, sd, fl | events_ts_1.F_SHIELD);
                return;
            }
            shd = this.shield[e];
            dmg = (sd - this.shield[e]) / sm; // overflow, converted back to hull damage
            this.shield[e] = 0;
        }
        if (this.fkit) { // Frontline: small arms strip shields but barely scratch (or cannot pierce) armour
            dmg *= this.fkit.hullMul(this, e, w);
            if (dmg <= 0) {
                if (shd > 0)
                    this.logHit(shooterTeam, this.eid[e], w, 0, shd, fl | events_ts_1.F_SHIELD);
                return;
            }
        }
        this.hp[e] -= dmg;
        let kf = 0;
        if (this.hp[e] <= 0) {
            kf = events_ts_1.F_KILLED;
            // S12 (pilotkit.ts): a single hit of at least a pilot's full health + shield kills outright (ruling 27), no downed state
            if (this.slotPilot[e] !== 0 && hitDmg >= this.bodyMaxHp(e) + d.tShield[t])
                this.outright.add(e);
            if (d.crewOn && d.tDriverSeat[t] >= 0 && d.crew.critClass[d.tArmour[t]] === 1) {
                // crewed vehicle of a critical-window class (rulings 25-26: not bikes): hull at zero starts the critical
                // window (doc 13); criticalStep destroys it at the end. A bike dies at once and its riders with it (removeDead).
                if (this.critTick[e] < 0) {
                    this.hp[e] = 0;
                    this.critTick[e] = this.tick;
                    kf |= events_ts_1.F_CRITICAL;
                }
            }
            else
                this.dying[this.nDying++] = e;
            if (!friendly)
                this.stats.kills[shooterTeam]++;
        }
        this.logHit(shooterTeam, this.eid[e], w, dmg, shd, fl | kf | (shd > 0 ? events_ts_1.F_SHIELD : 0));
    }
    /** A canopyKill shot through the pilot zone of seat j of slot e (ruling 11): the rider dies; logged as a hit with F_PILOT_KILL. */
    pilotKill(e, j, w, shooterTeam) {
        this.lastHit[e] = this.tick;
        const rider = j !== this.d.tDriverSeat[this.etype[e]];
        this.killSeat(e, j);
        this.logHit(shooterTeam, this.eid[e], w, 0, 0, events_ts_1.F_PILOT_KILL | (rider ? events_ts_1.F_RIDER : 0));
    }
    /** SHOT event of a hitscan ray along the scratch segment (muzzle SA, full-range end SB), ending at fraction f; hit: entity slot or -1. */
    logShot(w, team, hit, f) {
        const ev = this.events, q = this.sc;
        const i = ev.push(events_ts_1.EV.SHOT, this.tick, team, this.hitShooter, hit >= 0 ? this.eid[hit] : 0, this.hitPilot, w, 0, 0, hit >= 0 ? events_ts_1.F_SHOT_HIT : f < 1 ? events_ts_1.F_SHOT_GROUND : 0) % ev.cap;
        const ax = q[SA_X], ay = q[SA_Y], az = q[SA_Z];
        ev.x0[i] = ax;
        ev.y0[i] = ay;
        ev.z0[i] = az;
        ev.x1[i] = ax + (q[SB_X] - ax) * f;
        ev.y1[i] = ay + (q[SB_Y] - ay) * f;
        ev.z1[i] = az + (q[SB_Z] - az) * f;
    }
    /** HIT event of the shot being resolved (shooter / pilot from hitShooter / hitPilot). Doubles go in through the ring index (no boxed arguments). */
    logHit(shooterTeam, target, w, hull, shield, flags) {
        const ev = this.events, i = ev.push(events_ts_1.EV.HIT, this.tick, shooterTeam, this.hitShooter, target, this.hitPilot, w, 0, 0, flags) % ev.cap;
        ev.v1[i] = hull;
        ev.v2[i] = shield;
        if ((flags & events_ts_1.F_KILLED) && this.progRules) {
            const e = this.idToSlot.get(target);
            if (e !== undefined)
                (0, progression_ts_1.progKill)(this, e, this.hitShooter, this.hitPilot, w, shooterTeam);
        } // w2e: battle record
    }
    /**
     * Splash of weapon w around the impact point sc[S_PX..S_PZ] (SCHEMA: area
     * damage radius r = splashRadius). `direct`: slot hit directly (already
     * damaged), -1 for a ground burst. Rules:
     *  - every entity whose hit sphere reaches within r of the impact point takes
     *    one full hit (damage matrix, shields, friendly-fire factor, backstab; no
     *    rear bonus, no falloff), except the directly hit entity and the shooter;
     *  - squad soldiers (squadSize > 1): per squad, at most 2 x floor(r / squadSpacing)
     *    soldiers besides the one hit directly (one more if no soldier of that
     *    squad was hit directly), nearest to the impact first;
     *  - weapons that cannot hit air do not splash aircraft; anti-air-only weapons
     *    (canHitGround false) do not splash ground units or structures.
     * Order is deterministic (fine-grid order, then sorted by squad, distance, slot).
     */
    splash(w, direct, shooterTeam, seen, shooterId) {
        const d = this.d, q = this.sc;
        const r = d.wSplash[w];
        const px = q[S_PX], py = q[S_PY], pz = q[S_PZ];
        const skip = d.wSkip[w];
        const directSq = direct >= 0 && d.tSquadSize[this.etype[direct]] > 1 ? this.squad[direct] : 0;
        q[S_INX] = 0;
        q[S_INZ] = 0;
        q[S_SCALE] = 1;
        const g = this.fine, qr = r + this.maxRadius + this.moveMargin;
        const c0 = g.cellOf(px - qr), c1 = g.cellOf(px + qr), r0 = g.cellOf(pz - qr), r1 = g.cellOf(pz + qr);
        const side = g.cellsPerSide, start = g.bucketStart, ent = g.entries, ek = g.entryKey, mask = g.mask;
        const cs = this.splashSlot, cd = this.splashD2, csq = this.splashSq;
        let nc = 0;
        for (let cz = r0; cz <= r1; cz++)
            for (let cx = c0; cx <= c1; cx++) {
                const key = cz * side + cx;
                const b = (Math.imul(key, 0x9e3779b1) >>> 16) & mask;
                for (let p = start[b], e = start[b + 1]; p < e; p++) {
                    if (ek[p] !== key)
                        continue;
                    const o = ent[p];
                    if (o === direct || this.hp[o] <= 0 || this.eid[o] === shooterId)
                        continue;
                    const ot = this.etype[o];
                    if (skip !== 0 && (d.tAir[ot] ? (skip & 1) !== 0 : (skip & 2) !== 0))
                        continue;
                    const rad = d.tRadius[ot];
                    const fx = this.x[o] - px, fy = this.y[o] + rad - py, fz = this.z[o] - pz;
                    const d2 = fx * fx + fy * fy + fz * fz, lim = r + rad;
                    if (d2 > lim * lim)
                        continue;
                    if (d.tSquadSize[ot] > 1) {
                        cs[nc] = o;
                        cd[nc] = d2;
                        csq[nc] = this.squad[o];
                        nc++;
                        continue;
                    }
                    this.stats.splashHits++;
                    this.applyDamage(o, w, shooterTeam, seen);
                }
            }
        if (nc === 0)
            return;
        // squad soldiers: sort by (squad, distance, slot), then hit up to the cap per squad
        for (let i = 1; i < nc; i++) {
            const a = cs[i], ad = cd[i], aq = csq[i];
            let j = i - 1;
            while (j >= 0 && (csq[j] > aq || (csq[j] === aq && (cd[j] > ad || (cd[j] === ad && cs[j] > a))))) {
                cs[j + 1] = cs[j];
                cd[j + 1] = cd[j];
                csq[j + 1] = csq[j];
                j--;
            }
            cs[j + 1] = a;
            cd[j + 1] = ad;
            csq[j + 1] = aq;
        }
        let curSq = -1, left = 0;
        for (let i = 0; i < nc; i++) {
            const o = cs[i];
            if (csq[i] !== curSq) {
                curSq = csq[i];
                const sp = d.tSquadSpacing[this.etype[o]];
                left = sp > 0 ? 2 * Math.floor(r / sp) + (curSq === directSq ? 0 : 1) : this.cap;
            }
            if (left <= 0)
                continue;
            left--;
            this.stats.splashHits++;
            this.applyDamage(o, w, shooterTeam, seen);
        }
    }
    // ------------------------------------------------------------ projectiles
    growProjectiles(n) {
        const g64 = (a) => { const b = new Float64Array(n); b.set(a.subarray(0, Math.min(a.length, n))); return b; };
        const g32 = (a) => { const b = new Int32Array(n); b.set(a.subarray(0, Math.min(a.length, n))); return b; };
        const g16 = (a) => { const b = new Int16Array(n); b.set(a.subarray(0, Math.min(a.length, n))); return b; };
        const g8 = (a) => { const b = new Uint8Array(n); b.set(a.subarray(0, Math.min(a.length, n))); return b; };
        this.pX0 = g64(this.pX0);
        this.pY0 = g64(this.pY0);
        this.pZ0 = g64(this.pZ0);
        this.pVX = g64(this.pVX);
        this.pVY = g64(this.pVY);
        this.pVZ = g64(this.pVZ);
        this.pT = g64(this.pT);
        this.pId = g32(this.pId);
        this.pLaunch = g32(this.pLaunch);
        this.pShooter = g32(this.pShooter);
        this.pPilot = g32(this.pPilot);
        this.pTgt = g32(this.pTgt);
        this.pWeapon = g16(this.pWeapon);
        this.pTeam = g8(this.pTeam);
        this.pBallistic = g8(this.pBallistic);
        this.pSeen = g8(this.pSeen);
        this.pCap = n;
    }
    /** Writes the projectile's position at flight time t into out. */
    projectileAt(i, t, out) {
        const gy = this.pBallistic[i] ? -0.5 * this.d.gravity * t * t : 0;
        out[0] = this.pX0[i] + this.pVX[i] * t;
        out[1] = this.pY0[i] + this.pVY[i] * t + gy;
        out[2] = this.pZ0[i] + this.pVZ[i] * t;
    }
    /**
     * Swept collision: each tick a projectile travels the segment between its
     * positions at the previous and the current tick (a chord of the arc for
     * shells). The first entity sphere or terrain sample on that segment stops it,
     * so fast shots cannot tunnel through thin targets.
     */
    updateProjectiles() {
        const d = this.d, dt = d.dt, q = this.sc, hg = 0.5 * d.gravity, ms = this.mapSize;
        let i = 0;
        while (i < this.pN) {
            const T = this.pT[i];
            const age = (this.tick - this.pLaunch[i]) * dt;
            if (age <= 0) {
                i++;
                continue;
            } // launched this tick
            let t0 = age - dt;
            if (t0 < 0)
                t0 = 0;
            const t1 = age < T ? age : T;
            if (this.pTgt[i] !== 0)
                this.homingStep(i, t0);
            // positions at t0 and t1 (projectileAt, inlined)
            const bal = this.pBallistic[i] === 1;
            const x0 = this.pX0[i], y0 = this.pY0[i], z0 = this.pZ0[i], vx = this.pVX[i], vy = this.pVY[i], vz = this.pVZ[i];
            const ax = x0 + vx * t0, ay = y0 + vy * t0 - (bal ? hg * t0 * t0 : 0), az = z0 + vz * t0;
            const bx = x0 + vx * t1, by = y0 + vy * t1 - (bal ? hg * t1 * t1 : 0), bz = z0 + vz * t1;
            q[SA_X] = ax;
            q[SA_Y] = ay;
            q[SA_Z] = az;
            q[SB_X] = bx;
            q[SB_Y] = by;
            q[SB_Z] = bz;
            const w = this.pWeapon[i], team = this.pTeam[i];
            this.rayLag = this.pPilot[i] < 0 ? this.lagOf(-this.pPilot[i]) : 0; // a player's aimed shot (negative pPilot)
            this.raySeg(this.pShooter[i], team, d.wSkip[w]);
            this.rayLag = 0;
            this.terrainSeg();
            const tg = q[S_TERR], rt = q[S_RAYT], hit = this.raySlot;
            // 0: flying, 1: entity hit, 2: ground hit, 3: shell landed at its aim point, 4: expired / left the map
            let end = 0;
            if (this.rayDome && rt <= tg)
                end = 4; // w2a: absorbed by a shield bubble (no damage, no splash)
            else if (hit >= 0 && rt <= tg)
                end = 1;
            else if (tg <= 1)
                end = 2;
            else if (age + 1e-9 >= T || bx < 0 || bz < 0 || bx > ms || bz > ms)
                end = bal && age + 1e-9 >= T ? 3 : 4;
            if (end === 0) {
                i++;
                continue;
            }
            this.hitShooter = this.pShooter[i];
            {
                const pp = this.pPilot[i];
                this.hitPilot = pp < 0 ? -pp : pp;
                this.hitCtl = pp < 0;
            }
            if (end === 1) {
                this.stats.hits++;
                this.stats.weaponHits[team * d.weaponIds.length + w]++;
                if (this.zoneStrike(hit, w, team)) {
                    const last = --this.pN;
                    if (i !== last)
                        this.copyProjectile(last, i);
                    continue;
                } // a pilot zone, not the hull
                q[S_INX] = vx;
                q[S_INZ] = vz;
                q[S_SCALE] = 1;
                this.applyDamage(hit, w, team, this.pSeen[i]);
            }
            else if (end === 4)
                this.stats.misses++;
            else
                this.stats.groundHits++;
            // splash: at the hit point, the ground hit point, or where a shell lands
            if (d.wSplash[w] > 0 && end !== 4) {
                const f = end === 1 ? rt : end === 2 ? tg : 1;
                q[S_PX] = ax + (bx - ax) * f;
                q[S_PY] = ay + (by - ay) * f;
                q[S_PZ] = az + (bz - az) * f;
                if (end === 1)
                    this.bodyImpact(hit);
                this.splash(w, end === 1 ? hit : -1, team, this.pSeen[i], this.pShooter[i]);
            }
            const last = --this.pN;
            if (i !== last)
                this.copyProjectile(last, i);
        }
    }
    /**
     * Ruling 108: a homing projectile turns its velocity toward its target's hit-sphere centre by at most
     * weapon.homingDegPerSecond x dt this tick (a chord step: only square roots, deterministic), keeping its speed, then
     * rebases its start point so that the position at flight time t0 is unchanged (x(t) = x0 + v t stays the projectile's
     * path from t0 on). A target that is gone, dead or behind it (more than 90 degrees off) ends the homing.
     */
    homingStep(i, t0) {
        const o = this.idToSlot.get(this.pTgt[i]);
        if (o === undefined || !this.alive[o] || this.hp[o] <= 0) {
            this.pTgt[i] = 0;
            return;
        }
        const vx = this.pVX[i], vy = this.pVY[i], vz = this.pVZ[i], sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (sp < 1e-9) {
            this.pTgt[i] = 0;
            return;
        }
        const px = this.pX0[i] + vx * t0, py = this.pY0[i] + vy * t0, pz = this.pZ0[i] + vz * t0;
        let dx = this.x[o] - px, dy = this.y[o] + this.d.tRadius[this.etype[o]] - py, dz = this.z[o] - pz;
        const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dl < 1e-6)
            return;
        dx /= dl;
        dy /= dl;
        dz /= dl;
        const ux = vx / sp, uy = vy / sp, uz = vz / sp;
        if (ux * dx + uy * dy + uz * dz <= 0) {
            this.pTgt[i] = 0;
            return;
        } // flew past it
        const cx = dx - ux, cy = dy - uy, cz = dz - uz, chord = Math.sqrt(cx * cx + cy * cy + cz * cz);
        const step = this.d.wHoming[this.pWeapon[i]] * this.d.dt;
        const k = chord <= step ? 1 : step / chord;
        let nx = ux + cx * k, ny = uy + cy * k, nz = uz + cz * k;
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx = (nx / nl) * sp;
        ny = (ny / nl) * sp;
        nz = (nz / nl) * sp;
        this.pVX[i] = nx;
        this.pVY[i] = ny;
        this.pVZ[i] = nz;
        this.pX0[i] = px - nx * t0;
        this.pY0[i] = py - ny * t0;
        this.pZ0[i] = pz - nz * t0;
    }
    copyProjectile(from, to) {
        this.pId[to] = this.pId[from];
        this.pX0[to] = this.pX0[from];
        this.pY0[to] = this.pY0[from];
        this.pZ0[to] = this.pZ0[from];
        this.pVX[to] = this.pVX[from];
        this.pVY[to] = this.pVY[from];
        this.pVZ[to] = this.pVZ[from];
        this.pT[to] = this.pT[from];
        this.pLaunch[to] = this.pLaunch[from];
        this.pWeapon[to] = this.pWeapon[from];
        this.pTeam[to] = this.pTeam[from];
        this.pBallistic[to] = this.pBallistic[from];
        this.pShooter[to] = this.pShooter[from];
        this.pSeen[to] = this.pSeen[from];
        this.pPilot[to] = this.pPilot[from];
        this.pTgt[to] = this.pTgt[from];
    }
    /** Projectile position at the current tick (tests and tools; allocates). */
    projectilePosition(i) {
        const t = Math.min((this.tick - this.pLaunch[i]) * this.d.dt, this.pT[i]);
        this.projectileAt(i, t, this.tmpPos);
        return [this.tmpPos[0], this.tmpPos[1], this.tmpPos[2]];
    }
    // ------------------------------------------------------------ deaths
    removeDead() {
        const n = this.nDying;
        if (n === 0)
            return;
        // ascending order (insertion sort; duplicates skipped) so removal and
        // free-list reuse are independent of hit order. No allocation.
        const list = this.dying;
        for (let i = 1; i < n; i++) {
            const v = list[i];
            let j = i - 1;
            while (j >= 0 && list[j] > v) {
                list[j + 1] = list[j];
                j--;
            }
            list[j + 1] = v;
        }
        this.nDying = 0;
        for (let k = 0; k < n; k++) {
            const s = list[k];
            if (k > 0 && list[k - 1] === s)
                continue;
            if (!this.alive[s] || this.hp[s] > 0)
                continue;
            if (this.slotPilot[s] !== 0 && this.kitRules && (0, pilotkit_ts_1.kitTryDown)(this, s, this.outright.has(s)))
                continue; // S12: downed, not dead
            if (this.d.crewOn && this.d.tBunker[this.etype[s]] && this.nOcc[s] > 0 && this.slotsLeft() >= this.nOcc[s])
                this.ejectAll(s, events_ts_1.F_AUTO_EJECT); // B1: a destroyed bunker throws its pilots out (ruling 34)
            if (this.tShelter !== null)
                this.shelterEvict(s, exports.SH_DESTROYED); // ruling 121: a destroyed Citadel / Core throws its pilots out
            if ((this.ctlMask[s] & exports.GUN_SEAT_BIT) !== 0)
                this.gunEvict(s, exports.SH_DESTROYED); // ruling 125: a destroyed sentry throws its gunner out
            this.alive[s] = 0;
            const seen = this.detMask(s); // w2f: deaths in the snapshot stream
            if (s !== this.quietDeath)
                this.events.push(events_ts_1.EV.UNIT_DIED, this.tick, this.team[s], this.eid[s], this.etype[s], seen, 0, this.x[s], this.z[s], 0); // FB1: a quiet removal (a base deploying / packing, packed defences, recalls) is no death: no explosion on screen
            if (this.tCore && this.tCore[this.etype[s]])
                this.match.coreDied = true; // match check at the end of the step
            if (this.airS[s] && this.d.tAir[this.etype[s]]) { // w2c: shot down in flight: a crash (crew already auto-ejected, ruling 34)
                const q = this.sc;
                q[S_GX] = this.x[s];
                q[S_GZ] = this.z[s];
                this.groundAt(S_GX);
                this.events.push(events_ts_1.EV.AIRCRAFT_DOWN, this.tick, this.team[s], this.eid[s], this.etype[s], Math.round(this.y[s] - q[S_GY]), seen, this.x[s], this.z[s], 0); // d: teams that detected it (QA1 fog)
            }
            const id = this.eid[s];
            this.idToSlot.delete(id);
            if (this.tp)
                (0, transport_ts_1.tpGone)(this, id); // w2e: soldiers still aboard die; lifts end
            if (this.d.crewOn) {
                // whoever is still aboard dies with the vehicle (doc 13: miss the window and you go down with it)
                const ns = this.d.tSeatCount[this.etype[s]];
                for (let j = 0; j < ns; j++) {
                    const pid = this.occ[s * data_ts_1.MAX_SEATS + j];
                    if (pid === 0)
                        continue;
                    this.occ[s * data_ts_1.MAX_SEATS + j] = 0;
                    const p = this.pilots.get(pid);
                    if (p)
                        this.pilotDied(p, id, 0, this.x[s], this.z[s]); // seated: where the vehicle died, not where it boarded
                }
                if (this.slotPilot[s] !== 0) {
                    const p = this.pilots.get(this.slotPilot[s]);
                    this.slotPilot[s] = 0;
                    if (p)
                        this.pilotDied(p, 0, id, this.x[s], this.z[s]);
                }
            }
            if (this.prod.size > 0)
                this.prod.delete(id); // a destroyed building's queue is lost
            const sq = this.squads.get(this.squad[s]);
            if (sq) {
                const k = sq.members.indexOf(id);
                if (k >= 0)
                    sq.members.splice(k, 1);
                if (sq.members.length === 0)
                    this.squads.delete(sq.id); // free empty squads
            }
            this.waypoints[s] = null;
            // keep the free list descending (pop() reuses the lowest free slot): insert in place
            const fr = this.free;
            let j = fr.length;
            fr.push(s);
            while (j > 0 && fr[j - 1] < s) {
                fr[j] = fr[j - 1];
                j--;
            }
            fr[j] = s;
        }
        if (this.outright.size)
            this.outright.clear();
    }
    // =================================================================== hash
    /**
     * 64-bit FNV-1a style hash of ALL simulation state, as 16 hex chars:
     * construction options (data fingerprint, planet, seed, map size, capacity,
     * terrain heights, unit-limit settings), counters, PRNG, every per-slot field
     * of live entities (dead slots are overwritten on reuse, so they are not
     * state), the free list, squads, projectiles, pending inputs, the dying list,
     * order events and the stats. Not hashed (not state): snapshot encoders,
     * scratch buffers, instrumentation (phaseClock / phaseMs / phaseN).
     */
    stateHash() {
        let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0;
        const f = new Float64Array(1), u = new Uint32Array(f.buffer);
        const word = (v) => {
            h1 = Math.imul(h1 ^ (v | 0), 0x01000193);
            h2 = Math.imul(h2 ^ (v | 0), 0x5bd1e995) ^ (h2 >>> 15);
        };
        const num = (v) => { f[0] = v; word(u[0]); word(u[1]); };
        const str = (t) => { word(t.length); for (let i = 0; i < t.length; i++)
            word(t.charCodeAt(i)); };
        str(this.d.fingerprint);
        str(this.d.planetId);
        word(this.seed);
        num(this.mapSize);
        word(this.cap);
        word(this.flat ? 1 : 0);
        str(this.terrainHash);
        str(this.mapSizeClass);
        num(this.hostUnitCap);
        num(this.mapUnitCap);
        word(this.tick);
        word(this.nextId);
        word(this.nextSquadId);
        word(this.nextProjId);
        word(this.inputSeq);
        word(this.pN);
        word(this.hi);
        for (let i = 0; i < 4; i++)
            word(this.rng.s[i]);
        for (let s = 0; s < this.hi; s++) {
            if (!this.alive[s])
                continue;
            word(s);
            word(this.eid[s]);
            word(this.etype[s]);
            word(this.team[s]);
            word(this.squad[s]);
            num(this.x[s]);
            num(this.y[s]);
            num(this.z[s]);
            num(this.px[s]);
            num(this.pz[s]);
            num(this.dirX[s]);
            num(this.dirZ[s]);
            num(this.velX[s]);
            num(this.velZ[s]);
            num(this.hp[s]);
            num(this.shield[s]);
            word(this.lastFired[s]);
            word(this.tgtSlot[s]);
            word(this.tgtId[s]);
            word(this.noLos[s]);
            word(this.ramPhase[s]);
            word(this.lastHit[s]);
            word(this.ordType[s]);
            word(this.wpIdx[s]);
            num(this.maxRange[s]);
            word(this.mCount[s]);
            word(this.ctlOn[s]);
            num(this.ctlThrust[s]);
            num(this.ctlStrafe[s]);
            num(this.ctlYaw[s]);
            num(this.ctlPitch[s]);
            word(this.ctlFire[s]);
            word(this.ctlFlags[s]);
            word(this.ctlTool[s]);
            word(this.ctlMask[s]);
            word(this.drv[s]);
            word(this.nOcc[s]);
            word(this.airS[s] | (this.lowFly[s] << 8));
            num(this.flyAlt[s]); // ruling 41: the low-flight flag in the airS word (hash unchanged while it is 0)
            num(this.velY[s]);
            word(this.airborne[s]);
            word(this.slotPilot[s]);
            num(this.energy[s]);
            num(this.jetFuel[s]);
            word(this.critTick[s]);
            word(this.lastShHit[s]);
            word(this.hijacked[s]);
            if (this.stance[s] !== 0 || this.stanceT[s] !== 0) {
                word(0x57a4ce);
                word(this.stance[s]);
                word(this.stanceT[s]);
            } // ruling 42 (standing: as before)
            for (let j = 0; j < data_ts_1.MAX_SEATS; j++) {
                const i = s * data_ts_1.MAX_SEATS + j;
                word(this.occ[i]);
                num(this.gYaw[i]);
                num(this.gPitch[i]);
                word(this.gFire[i]);
            }
            for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) {
                const i = s * data_ts_1.MAX_MOUNTS + m;
                word(this.mWeapon[i]);
                word(this.mFixed[i]);
                num(this.cooldown[i]);
                word(this.mTgtSlot[i]);
                word(this.mTgtId[i]);
                word(this.mOn[i]);
                num(this.mAimMul[i]);
                if (this.mDX[i] !== 0 || this.mDZ[i] !== 0 || this.mLock[i] !== 0 || this.mReady[i] !== 0) {
                    word(0xf1);
                    num(this.mDX[i]);
                    num(this.mDZ[i]);
                    word(this.mLock[i]);
                    word(this.mReady[i]);
                } // F1 (untouched mounts: as before)
                if (this.mChg[i] !== 0 || this.mOvh[i] !== 0 || this.mHeat[i] !== 0) {
                    word(0x91);
                    word(this.mChg[i]);
                    word(this.mOvh[i]);
                    num(this.mHeat[i]);
                } // ruling 91 (other mounts: as before)
                if (this.mRxId[i] !== 0 || this.mRxT[i] !== 0) {
                    word(0x126);
                    word(this.mRxId[i]);
                    word(this.mRxT[i]);
                } // ruling 126 (other mounts: as before)
            }
            for (let k = 0; k < exports.MAX_TEAMS; k++)
                word(this.detExpiry[s * exports.MAX_TEAMS + k]);
            if (this.boostM[s] !== (this.d.tBoostMul[this.etype[s]] > 0 ? 1 : 0) || this.boostOn[s] !== 0) {
                word(0x108);
                num(this.boostM[s]);
                word(this.boostOn[s]);
            }
            if (this.hopH[s] !== 0 || this.hopReady[s] !== 0) {
                word(0x110);
                num(this.hopH[s]);
                word(this.hopReady[s]);
            } // ruling 108 boost, ruling 112 hop: only away from the spawn value (other units: as before)
            const wp = this.waypoints[s];
            if (wp) {
                word(wp.length);
                for (let i = 0; i < wp.length; i++)
                    num(wp[i]);
            }
            else
                word(-1);
            word(this.ordTargetId[s]);
        }
        word(this.free.length);
        for (const s of this.free)
            word(s);
        for (let i = 0; i < this.pN; i++) {
            word(this.pId[i]);
            num(this.pX0[i]);
            num(this.pY0[i]);
            num(this.pZ0[i]);
            num(this.pVX[i]);
            num(this.pVY[i]);
            num(this.pVZ[i]);
            num(this.pT[i]);
            word(this.pLaunch[i]);
            word(this.pWeapon[i]);
            word(this.pTeam[i]);
            word(this.pBallistic[i]);
            word(this.pShooter[i]);
            word(this.pSeen[i]);
            word(this.pPilot[i]);
            if (this.pTgt[i] !== 0) {
                word(0x108);
                word(this.pTgt[i]);
            } // ruling 108 homing target (other projectiles: as before)
        }
        const sqIds = Array.from(this.squads.keys()).sort((a, b) => a - b);
        word(sqIds.length);
        for (const id of sqIds) {
            const sq = this.squads.get(id);
            word(sq.id);
            word(sq.team);
            word(sq.structure ? 1 : 0);
            word(sq.members.length);
            for (const m of sq.members)
                word(m);
        }
        word(this.pending.length);
        for (const p of this.pending) {
            word(p.tick);
            word(p.seq);
            word(p.team);
            word(p.ids.length);
            for (const id of p.ids)
                word(id);
            const nums = orderNumbers(p.order);
            word(nums.length);
            for (const v of nums)
                num(v);
        }
        word(this.pendingCtl.length);
        for (const p of this.pendingCtl) {
            word(p.tick);
            word(p.seq);
            word(p.id);
            word(p.team);
            word(p.on);
            num(p.thrust);
            num(p.strafe);
            num(p.yaw);
            num(p.pitch);
            word(p.fire);
        }
        word(this.nDying);
        for (let i = 0; i < this.nDying; i++)
            word(this.dying[i]);
        // crews, pilots, production, team stockpiles
        word(this.nextPilotId);
        for (let k = 0; k < exports.MAX_TEAMS; k++) {
            num(this.ore[k]);
            num(this.gas[k]);
            word(this.suppliedPoints[k]);
        }
        word(this.pilots.size);
        for (const p of this.pilots.values())
            for (const v of pilotNumbers(p))
                num(v);
        word(this.prod.size);
        for (const q of this.prod.values())
            for (const v of queueNumbers(q))
                num(v);
        word(this.pendingAct.length);
        for (const a of this.pendingAct) {
            word(a.tick);
            word(a.seq);
            word(a.team);
            word(a.kind);
            num(a.a);
            num(a.b);
            num(a.c);
            num(a.x);
            num(a.z);
        }
        word(this.pendingPilotCtl.length);
        for (const p of this.pendingPilotCtl) {
            word(p.tick);
            word(p.seq);
            word(p.pilot);
            word(p.team);
            word(p.on);
            num(p.move);
            num(p.strafe);
            num(p.yaw);
            num(p.pitch);
            word(p.flags);
            word(p.fire);
            word(p.tool);
        }
        word(this.orderEvents.length);
        for (const e of this.orderEvents) {
            word(e.tick);
            word(e.seq);
            word(e.id);
            word(reasonCode(e.reason));
        }
        const st = this.stats;
        for (const k of exports.STAT_KEYS) {
            const v = st[k];
            if (typeof v === "number")
                num(v);
            else {
                word(v.length);
                for (const x of v)
                    num(x);
            }
        }
        if (this.pts)
            this.pts.hash(word, num, str); // strategic points (absent: the hash is unchanged)
        if (this.mine)
            this.mine.hash(word, num, str); // mining (absent: the hash is unchanged)
        if (this.con && this.con.used())
            this.con.hash(word, num); // s8 construction (never placed: the hash is unchanged)
        if (this.ord.ext.size || this.ord.hold.size)
            this.ord.hash(word, num); // s5 orders (none: the hash is unchanged)
        if (this.match && this.match.hashed())
            this.match.hash(word, str); // s7 match (no AI team and running: the hash is unchanged)
        if (this.calls)
            this.calls.hash(word, num); // s10 support calls (never called: the hash is unchanged)
        if (this.prog)
            this.prog.hash(word, num, str); // w2e progression (no player involved: the hash is unchanged)
        if (this.tp)
            this.tp.hash(word, num); // w2e transports (never used: the hash is unchanged)
        if (this.sp)
            this.sp.hash(word); // fix-qa2 strong points
        if (this.res)
            this.res.hash(word, num); // fix-qa2 reserve (absent until first used)
        if (this.bfx && this.bfx.used())
            this.bfx.hash(word, num); // fix-qa2 building effects (nothing until used)
        if (this.bg)
            this.bg.hash(word, num); // w3b battle groups (never used: the hash is unchanged)
        if (this.kit)
            this.kit.hash(word, num); // S12 pilot kit (never used: the hash is unchanged)
        if (this.eco2)
            this.eco2.hash(word, num); // w2b economy depth (maps with points)
        if (this.stl)
            this.stl.hash(word, num); // w2f stealth tools
        if (this.s15)
            this.s15.hash(word, num);
        if (this.dispatch && this.dispatch.to.size)
            this.dispatch.hash(word); // C1 crew dispatch (none on the way: the hash is unchanged)
        if (this.cheat)
            this.cheat.hash(word); // D1 test cheats (absent until used: the hash is unchanged) // S15 rulings (absent until first used: the hash is unchanged)
        if (this.tlayer)
            this.tlayer.hash(word, num, str); // wave 2 D terrain layer (none: the hash is unchanged)
        if (this.weather)
            this.weather.hash(word, num, str); // wave 2 D weather (none: the hash is unchanged)
        if (this.pool)
            this.pool.hash(word); // S14 pilot reserve
        const hex = (v) => (v >>> 0).toString(16).padStart(8, "0");
        return hex(h1) + hex(h2);
    }
    // =================================================================== snapshots
    /**
     * Snapshot bytes for one viewer (guest). Change-only: encoded against the
     * newest snapshot this viewer has acknowledged (ackSnapshot), with a periodic
     * keyframe; a viewer that never acks gets keyframes only. See netsnap.ts.
     */
    snapshot(viewer) {
        let enc = this.encoders.get(viewer.id);
        if (!enc) {
            enc = new netsnap_ts_1.SnapshotEncoder(this);
            this.encoders.set(viewer.id, enc);
        }
        return enc.encode(viewer).slice();
    }
    /** The guest decoded snapshot seq (of stream epoch `epoch`, SnapshotView.epoch: an ack of another epoch is ignored). */
    ackSnapshot(viewerId, seq, epoch) { this.encoders.get(viewerId)?.ack(seq, epoch); }
    /** Drops per-viewer snapshot baselines (guest left or reconnects: next snapshot is a keyframe). */
    resetViewer(viewerId) { this.encoders.delete(viewerId); }
}
exports.Sim = Sim;
function newStats(weaponCount = 0) {
    return {
        shots: 0, projectilesSpawned: 0, hits: 0, misses: 0, groundHits: 0, friendlyHits: 0, heldFire: 0, heldTerrain: 0, heldFriendly: 0,
        meleeHits: 0, splashHits: 0, kills: [0, 0, 0, 0], damage: [0, 0, 0, 0],
        weaponShots: new Array(exports.MAX_TEAMS * weaponCount).fill(0), weaponHits: new Array(exports.MAX_TEAMS * weaponCount).fill(0),
        ejections: 0, snipes: 0, hijacks: 0, criticalDestroyed: 0, pilotDeaths: [0, 0, 0, 0], pilotsReturned: [0, 0, 0, 0],
        respawns: 0, unitsProduced: 0, torchRepair: 0, fallDamage: 0,
    };
}
/** The stats keys in hash / export order (every key of SimStats). */
exports.STAT_KEYS = ["shots", "projectilesSpawned", "hits", "misses", "groundHits", "friendlyHits", "heldFire", "heldTerrain", "heldFriendly", "meleeHits", "splashHits", "kills", "damage", "weaponShots", "weaponHits",
    "ejections", "snipes", "hijacks", "criticalDestroyed", "pilotDeaths", "pilotsReturned", "respawns", "unitsProduced", "torchRepair", "fallDamage"];
/** Reason codes (wire and state). Stable: new reasons are appended. */
const REASON_CODES = { unknownUnit: 1, structure: 2, notOwner: 3, noWaypoints: 4, unknownTarget: 5, friendlyTarget: 6, targetNotDetected: 7, cannotDamageTarget: 8, targetDestroyed: 9, targetLost: 10,
    noDriver: 11, playerDriven: 12, unknownPilot: 13, pilotNotOnFoot: 14, notPlayerPilot: 15, enemyPilot: 16, notCrewable: 17, hullCritical: 18, notSeated: 19, unknownVehicle: 20,
    tooFar: 21, seatOccupied: 22, noFreeSeat: 23, enemyOccupied: 24, badSeat: 25, unknownBuilding: 26, notProducer: 27, tierLocked: 28, queueFull: 29, productionOff: 30,
    badQueueIndex: 31, unknownUnitType: 32, pickupEnded: 33, notController: 34, entityCapacity: 35, hijackInterrupted: 36, notControllable: 37, cannotAfford: 38, notHarvester: 39, unknownDeposit: 40,
    notFriendly: 41, selfTarget: 42, orderTargetGone: 43, noRetreatPoint: 44, matchOver: 45,
    unknownBuildingType: 46, notBuildable: 47, unknownPoint: 48, pointNotOwned: 49, pointUnsupplied: 50, wrongPointType: 51, noFreeSlot: 52,
    noGeyser: 53, badPosition: 54, notOnPoint: 55, noConstructor: 56, notConstructor: 57, unknownSite: 58, underConstruction: 59,
    unknownCall: 60, notInLoadout: 61, callCooldown: 62, callInProgress: 63, callRequirement: 64, callOutOfRange: 65, notImplemented: 66, callerDown: 67, badLoadout: 68,
    callOverBudget: 69, callBlocked: 70, noCharges: 71, loadoutNotAtBase: 80, badCallOption: 81,
    fortifyInProgress: 90, maxFortification: 91, notForwardBaseVehicle: 92, forwardBaseSite: 93, forwardBaseLimit: 94, notForwardBase: 95, baseBusy: 96,
    noAtmosphere: 100,
    notTransport: 101, transportFull: 102, notInfantry: 103, noCargo: 104, cannotLift: 105, notLicensed: 106,
    weatherGrounded: 111, weatherOrbital: 112, terrainUnbuildable: 113,
    playerExists: 120, noDropPoint: 121, notJoinable: 122, notRelayTower: 123, noDecoy: 124, notScoutBike: 125, pulseCooldown: 126, callJammed: 127,
    noBattleGroups: 140, groupUnknown: 141, groupFull: 142, notGroupable: 143, groupBadOrder: 144, badInput: 150,
    garrisoned: 155, noGarrisonSlot: 156, notGarrisonable: 157, notGarrisoned: 158, reserveFull: 159, notInCallInZone: 160, notDroppable: 161, reserveEmpty: 162, notUnderAttack: 163, reinforceCooldown: 164,
    pilotProne: 165,
    noPilotsAvailable: 175, crewNotAtBase: 176, vehicleCrewed: 177, barracksCap: 178,
    callHidden: 180, noFreePilot: 190, pilotBusy: 191, crewEnRoute: 192, notMannable: 193, callNotOnFoot: 195, callNotSeated: 196 , vehicleAlive: 197 };
/** Reason names by code - 1 (sparse: codes are reserved in ranges per work package, so there are gaps). */
exports.ORDER_REASONS = (() => { const a = []; for (const [k, v] of Object.entries(REASON_CODES))
    a[v - 1] = k; return a; })();
function reasonCode(r) { return REASON_CODES[r]; }
function cloneOrder(o) { return orderFromNumbers(orderNumbers(o)); }
/** Flat numeric encoding of a pilot record (hash and state export; order fixed). */
exports.PILOT_FIELDS = ["id", "team", "player", "expert", "state", "vehicle", "seat", "entity", "hp", "shield", "energy", "jet", "lastHit", "readyTick", "respawnTick", "deaths", "aliveSince", "lastX", "lastZ", "task", "hackVehicle", "hackStart", "hackSeat", "hackSeq"];
function pilotNumbers(p) { return exports.PILOT_FIELDS.map((k) => p[k]); }
function pilotFromNumbers(a) { const p = {}; exports.PILOT_FIELDS.forEach((k, i) => { p[k] = a[i]; }); return p; }
/** Flat numeric encoding of a production queue: [building, progress, started, hold, rally, rallyX, rallyZ, n, (type, by) x n]. */
function queueNumbers(q) {
    const out = [q.building, q.progress, q.started ? 1 : 0, q.hold, q.rally ? 1 : 0, q.rallyX, q.rallyZ, q.items.length];
    for (const it of q.items)
        out.push(it.type, it.by);
    return out;
}
function queueFromNumbers(a) {
    const items = [];
    for (let i = 0; i < a[7]; i++)
        items.push({ type: a[8 + 2 * i], by: a[9 + 2 * i] });
    return { building: a[0], progress: a[1], started: a[2] === 1, hold: a[3], rally: a[4] === 1, rallyX: a[5], rallyZ: a[6], items };
}
/** Flat numeric encoding of an order: [kind, ...payload]. Used by the hash and state export. */
function orderNumbers(o) {
    const lf = o.lowFlight;
    if (lf !== undefined) {
        const inner = { ...o };
        delete inner.lowFlight;
        return [20, lf ? 1 : 0, ...orderNumbers(inner)];
    } // ruling 41: [20, flag, order]
    switch (o.type) {
        case "stop": return [0];
        case "attack": return o.ground ? [1, 0, o.ground.x, o.ground.z] : [1, o.targetId]; // ruling 40: [1, 0, x, z] attack-ground
        case "pickup": return [6, o.pilotId];
        // s5 (orders.ts)
        case "guard": return [7, o.targetId ?? 0, o.pilotId ?? 0];
        case "defend": return [8, o.x, o.z];
        case "attackMyTarget": return [9, o.pilotId, o.targetId];
        case "follow": return [10, o.pilotId, (0, orders_ts_1.formationIndex)(o.formation)];
        case "holdFire": return [11, o.on ? 1 : 0];
        case "retreat": {
            if (!o.points)
                return [12, -1];
            const out = [12, o.points.length];
            for (const [x, z] of o.points)
                out.push(x, z);
            return out;
        }
        case "move":
        case "attackMove": {
            const k = o.type === "move" ? 2 : 3;
            const fm = (0, orders_ts_1.formationIndex)(o.formation);
            if (fm !== orders_ts_1.FM_NONE) { // s5: [13, formation, 0 move / 1 attackMove, n, (x, z) x n]
                const ws = "waypoints" in o ? o.waypoints : [[o.x, o.z]];
                const out = [13, fm, k - 2, ws.length];
                for (const [x, z] of ws)
                    out.push(x, z);
                return out;
            }
            if ("waypoints" in o) {
                const out = [k + 2, o.waypoints.length];
                for (const [x, z] of o.waypoints)
                    out.push(x, z);
                return out;
            }
            return [k, o.x, o.z];
        }
    }
}
function orderFromNumbers(a) {
    if (a[0] === 20) {
        const o = orderFromNumbers(a.slice(2));
        o.lowFlight = a[1] === 1;
        return o;
    } // ruling 41
    switch (a[0]) {
        case 0: return { type: "stop" };
        case 1: return a.length >= 4 ? { type: "attack", targetId: 0, ground: { x: a[2], z: a[3] } } : { type: "attack", targetId: a[1] };
        case 6: return { type: "pickup", pilotId: a[1] };
        case 2: return { type: "move", x: a[1], z: a[2] };
        case 3: return { type: "attackMove", x: a[1], z: a[2] };
        case 7: {
            const g = { type: "guard" };
            if (a[1])
                g.targetId = a[1];
            if (a[2])
                g.pilotId = a[2];
            return g;
        }
        case 8: return { type: "defend", x: a[1], z: a[2] };
        case 9: return { type: "attackMyTarget", pilotId: a[1], targetId: a[2] };
        case 10: return { type: "follow", pilotId: a[1], formation: orders_ts_1.FORMATIONS[a[2]] };
        case 11: return { type: "holdFire", on: a[1] === 1 };
        case 12: {
            if (a[1] < 0)
                return { type: "retreat" };
            const pts = [];
            for (let i = 0; i < a[1]; i++)
                pts.push([a[2 + i * 2], a[3 + i * 2]]);
            return { type: "retreat", points: pts };
        }
        case 13: {
            const wps = [];
            for (let i = 0; i < a[3]; i++)
                wps.push([a[4 + i * 2], a[5 + i * 2]]);
            const formation = orders_ts_1.FORMATIONS[a[1]];
            return a[2] === 0 ? { type: "move", waypoints: wps, formation } : { type: "attackMove", waypoints: wps, formation };
        }
        case 4:
        case 5: {
            const wps = [];
            for (let i = 0; i < a[1]; i++)
                wps.push([a[2 + i * 2], a[3 + i * 2]]);
            return a[0] === 4 ? { type: "move", waypoints: wps } : { type: "attackMove", waypoints: wps };
        }
        default: throw new Error(`bad order kind ${a[0]}`);
    }
}
/** Damage of one hit of weapon w on entity type t before shields (rear / backstab bonuses as flags). */
function hitDamage(d, w, t, rear, backstab = false) {
    const c = d.constants;
    let bonus = 1;
    if (rear && c.rearOn && d.tVehicle[t])
        bonus += c.rearDamageBonus;
    if (backstab && c.backstabOn && !d.tStructure[t])
        bonus += c.backstabDamageBonus;
    return d.wDamage[w] * d.matrix[d.wDamageType[w] * data_ts_1.N_AC + d.tArmour[t]] * bonus;
}
/**
 * Low-arc launch solution for an unpowered shell: horizontal distance hd, height
 * difference dy (target minus muzzle), launch speed v, gravity g (m/s^2).
 * Uses only + - * / sqrt.
 */
function ballisticSolve(hd, dy, v, g) {
    if (hd < 1e-6)
        return null;
    const v2 = v * v;
    const disc = v2 * v2 - g * (g * hd * hd + 2 * dy * v2);
    if (disc < 0)
        return null;
    const tan = (v2 - Math.sqrt(disc)) / (g * hd);
    const cos = 1 / Math.sqrt(1 + tan * tan);
    const vh = v * cos;
    return { vh, vy: vh * tan, t: hd / vh };
}
function createSim(o) { return new Sim(o); }
/** Hash of a float array plus a tag (terrain heights), 16 hex chars. */
function hashFloats(a, tag) {
    let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0;
    const u = new Uint32Array(a.buffer, a.byteOffset, a.length * 2);
    for (let i = 0; i < u.length; i++) {
        const v = u[i];
        h1 = Math.imul(h1 ^ v, 0x01000193);
        h2 = Math.imul(h2 ^ v, 0x5bd1e995) ^ (h2 >>> 15);
    }
    return (0, data_ts_2.hashString)(tag + ":" + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16));
}
/** Squared distance between 2D segments P0-P1 and Q0-Q1 (w2a smoke screen). */
function segSegDist2(px, pz, p1x, p1z, qx, qz, q1x, q1z) {
    const ux = p1x - px, uz = p1z - pz, vx = q1x - qx, vz = q1z - qz, wx = px - qx, wz = pz - qz;
    const d = ux * vz - uz * vx;
    if (d !== 0) {
        const s = (vx * wz - vz * wx) / d, t = (ux * wz - uz * wx) / d;
        if (s >= 0 && s <= 1 && t >= 0 && t <= 1)
            return 0; // they cross
    }
    const pd = (ax, az, bx, bz, cx, cz) => {
        const ex = bx - ax, ez = bz - az, l = ex * ex + ez * ez;
        let k = l > 0 ? ((cx - ax) * ex + (cz - az) * ez) / l : 0;
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        const fx = ax + ex * k - cx, fz = az + ez * k - cz;
        return fx * fx + fz * fz;
    };
    return Math.min(pd(px, pz, p1x, p1z, qx, qz), pd(px, pz, p1x, p1z, q1x, q1z), pd(qx, qz, q1x, q1z, px, pz), pd(qx, qz, q1x, q1z, p1x, p1z));
}
/** B2: a yaw in radians as a build facing step (0..BUILD_YAW_STEPS-1), -1 when absent or not finite. */
function buildYawStep(yaw) {
    if (yaw === undefined || typeof yaw !== "number" || !Number.isFinite(yaw))
        return -1;
    const q = Math.round((yaw / (2 * Math.PI)) * construction_ts_1.BUILD_YAW_STEPS);
    return ((q % construction_ts_1.BUILD_YAW_STEPS) + construction_ts_1.BUILD_YAW_STEPS) % construction_ts_1.BUILD_YAW_STEPS;
}
/** ACT_CALL c (w2a): 0 none; option + 1 (1-7: Heavy weapon pod weapon choice); aim yaw (radians, [0, 2 pi)) + 8 for line calls. */
/** QA1 bug 8: an entity / pilot / squad id a queue function can store (an integer that fits the i32 the state writes). */
function isId(v) { return typeof v === "number" && Number.isInteger(v) && v >= -2147483648 && v <= 2147483647; }
/** QA1 bug 8: a team argument (0 .. MAX_TEAMS - 1). */
function isTeam(v) { return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < exports.MAX_TEAMS; }
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isPts = (v, min) => Array.isArray(v) && v.length >= min && v.every((p) => Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1]));
const isForm = (f) => f === undefined || (typeof f === "string" && orders_ts_1.FORMATIONS.includes(f));
/** QA1 bug 8: the order has a known type and every field it needs, with the right types (else badInput at queue time). */
function orderWellFormed(o) {
    if (typeof o !== "object" || o === null)
        return false;
    const r = o;
    if (r.lowFlight !== undefined && (typeof r.lowFlight !== "boolean" || !(r.type === "move" || r.type === "attackMove" || r.type === "attack")))
        return false; // ruling 41
    switch (r.type) {
        case "stop": return true;
        case "attack": {
            const g = r.ground;
            return isId(r.targetId) && (g === undefined || (typeof g === "object" && g !== null && isNum(g.x) && isNum(g.z)));
        } // ruling 40 ground
        case "pickup": return isId(r.pilotId);
        case "guard": return (r.targetId === undefined || isId(r.targetId)) && (r.pilotId === undefined || isId(r.pilotId));
        case "defend": return isNum(r.x) && isNum(r.z);
        case "attackMyTarget": return isId(r.pilotId) && isId(r.targetId);
        case "follow": return isId(r.pilotId) && isForm(r.formation);
        case "holdFire": return typeof r.on === "boolean";
        case "retreat": return r.points === undefined || isPts(r.points, 0);
        case "move":
        case "attackMove": return isForm(r.formation) && ("waypoints" in r ? isPts(r.waypoints, 0) : isNum(r.x) && isNum(r.z));
        default: return false;
    }
}
function callOptionCode(o) {
    if (!o || typeof o !== "object")
        return 0;
    if (o.aimYaw !== undefined && Number.isFinite(o.aimYaw)) {
        const t = 2 * Math.PI;
        return 8 + (((o.aimYaw % t) + t) % t);
    }
    if (o.option !== undefined && Number.isInteger(o.option) && o.option >= 0 && o.option < 7)
        return o.option + 1;
    return 0;
}
