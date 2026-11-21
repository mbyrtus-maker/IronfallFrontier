"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotDecoder = exports.SnapshotEncoder = exports.ViewState = exports.VY_Q = exports.ALT_Q = exports.DEFAULT_KEYFRAME_INTERVAL = exports.EPOCH_SEQ_SPAN = exports.SNAPSHOT_RING = exports.CREW_BUNKER_SHIFT = exports.CREW_EN_ROUTE = exports.CREW_WAITING = exports.CREW_STANCE_CHANGING = exports.CREW_PRONE = exports.CREW_BUILDING = exports.EVENT_RESEND_TICKS = exports.SHIELD_HIT_TICKS = exports.FLAG_CROUCHED = exports.FLAG_DRIVERLESS = exports.FLAG_CRITICAL = exports.FLAG_SHIELD_HIT = exports.FLAG_FIRED = exports.SNAPSHOT_VERSION = void 0;
exports.decodeSnapshot = decodeSnapshot;
exports.projectileAtTick = projectileAtTick;
const snapshot_ts_1 = require("./snapshot.js");
const data_ts_1 = require("./data.js");
const events_ts_1 = require("./events.js");
const objectives_ts_1 = require("./objectives.js");
const battlegroups_ts_1 = require("./battlegroups.js");
const pilotkit_ts_1 = require("./pilotkit.js");
const s15_ts_1 = require("./s15.js");
exports.SNAPSHOT_VERSION = 36; // 36: ruling 133 fortify jobs after the points block's Cores (point, team, level, progress, stage, ticks left); 35: ruling 129 beacons fired from a vehicle (thrown record flags bit 7, bounces in bits 2-6; CALL_EFFECT sub-kind 9); 34: ruling 128 thrown call beacons (calls block: beacon height and carrier for thrown beacons, the list of beacons in flight; CALL_EFFECT sub-kinds 6-8); 33: C1 crew bit 13 on a vehicle (CREW_EN_ROUTE: a pilot is on the way, ruling 124), CREW_DISPATCH events (kind 131, the pilot's team, the S14 event layout), SHELTER flag 1 = a turret's gun seat (ruling 125: pilot state 4 with seat 0); 32: ruling 121 pilot state 4 (inside an own Citadel / Command Core: the pilot records carry the structure id as for a vehicle), SHELTER events (kind 130, the pilot's team, the S14 event layout); 31: j1 entity altitude in 1/128 m (was 0.25 m) and vertical speed after it (smooth jump / hop arcs on screen); 30: q1 mining block per harvester: drop-off entity, dock + 1, queue place; 29: ruling 112 pilot block ride tail (own driven hover vehicle: position, hull, momentum, hop, boost at full precision); entity altitude of a hopping hover vehicle; 28: B2 build site record + varint (placed yaw step + 1); 27: ruling 108 EXT_BOOST ext records (Dart Scout boost meter); 26: ruling 106 salvage removed (no WRECK keyed records, no WRECK events); 25: ruling 91 EXT_LASER ext records and B1 bunker crew field (merged 15 Nov); see below
// 24: ruling 91 EXT_LASER ext records (s15.ts: Lancer laser charge to every viewer that sees it, cooldown / heat / overheat to its team); 23: S15 ext keyed records after the decoys (s15.ts EXT_*: aircraft ammunition, downed help, dome gas floor), unseen points (ruling 87: a point record of the single byte 255), POINT / FORTIFY events by sight, S15 events 125-129 (viewer's team, UNIT_DIED layout); 22: S14 (rulings 47, 48, 64, 65): Command Points removed from the wire (team block: the pilot reserve counts in place of CP used / budget; points block: no CP budget per team, momentum only; decoders give cpUsed = cpBudget = 0), crew bit 12 (CREW_WAITING) on a vehicle waiting for pilots, PILOT_LOST / PILOT_AVAILABLE / CREWED / UNDERCREWED / CITADEL_PILOTS events (kinds 120-124, viewer's team: varint a b c d, u8 flags, varint v1); 21: ruling 42 pilot stance in the entity record (flags bit 7 crouched or prone, crew bit 14 prone, bit 13 changing stance; pilot bodies, every viewer that sees them); 20: 20: w3b battle groups block after the weather block (viewer's team), GROUP / AUTO_DEFEND events (kinds 100-101, viewer's team, a b c flags x z); 19: w2f aim records, wrecks, decoys, Core list, under-construction crew bit, own shot count and input seq, fog-filtered sites / BUILD events, UNIT_DIED / PLAYER_* / JAMMER / DECOY / SCAN / SEARCH events, CRITICAL / DESTROYED / RETURNED / QUEUE to the team; 18: w2e events BATTLE_RESULT (every viewer), AIRCRAFT_DOWN / AIRCRAFT_LANDING (every viewer, + x z), PASSENGER_LOST, CARGO, CARGO_LOST, FERRY (viewer's team); 17: w2a calls (uses left, slots, heavy weapon, beacon caller, lasting call zones); 16: wave 2 D weather block after the match block, WEATHER events (kind 70); 15: w2b FORTIFY / FORWARD_BASE / WRECK events (kinds 50-52); 14: S12 pilot kit tail of the pilot block, pilot state 3 downed, DOWNED / REVIVED / CHARGE / CLOAK events; 13: s13 match reason and objectives; 12: s11 CALL_EFFECT events
// 24: B1 bunker crew field (occupied mounts, fitted mount count in bits 8-11: CREW_BUNKER_SHIFT); 23: S15 ext keyed records after the decoys (s15.ts EXT_*: aircraft ammunition, downed help, dome gas floor), unseen points (ruling 87: a point record of the single byte 255), POINT / FORTIFY events by sight, S15 events 125-129 (viewer's team, UNIT_DIED layout); 22: S14 (rulings 47, 48, 64, 65): Command Points removed from the wire (team block: the pilot reserve counts in place of CP used / budget; points block: no CP budget per team, momentum only; decoders give cpUsed = cpBudget = 0), crew bit 12 (CREW_WAITING) on a vehicle waiting for pilots, PILOT_LOST / PILOT_AVAILABLE / CREWED / UNDERCREWED / CITADEL_PILOTS events (kinds 120-124, viewer's team: varint a b c d, u8 flags, varint v1); 21: ruling 42 pilot stance in the entity record (flags bit 7 crouched or prone, crew bit 14 prone, bit 13 changing stance; pilot bodies, every viewer that sees them); 20: 20: w3b battle groups block after the weather block (viewer's team), GROUP / AUTO_DEFEND events (kinds 100-101, viewer's team, a b c flags x z); 19: w2f aim records, wrecks, decoys, Core list, under-construction crew bit, own shot count and input seq, fog-filtered sites / BUILD events, UNIT_DIED / PLAYER_* / JAMMER / DECOY / SCAN / SEARCH events, CRITICAL / DESTROYED / RETURNED / QUEUE to the team; 18: w2e events BATTLE_RESULT (every viewer), AIRCRAFT_DOWN / AIRCRAFT_LANDING (every viewer, + x z), PASSENGER_LOST, CARGO, CARGO_LOST, FERRY (viewer's team); 17: w2a calls (uses left, slots, heavy weapon, beacon caller, lasting call zones); 16: wave 2 D weather block after the match block, WEATHER events (kind 70); 15: w2b FORTIFY / FORWARD_BASE / WRECK events (kinds 50-52); 14: S12 pilot kit tail of the pilot block, pilot state 3 downed, DOWNED / REVIVED / CHARGE / CLOAK events; 13: s13 match reason and objectives; 12: s11 CALL_EFFECT events
exports.FLAG_FIRED = 8, exports.FLAG_SHIELD_HIT = 16, exports.FLAG_CRITICAL = 32, exports.FLAG_DRIVERLESS = 64, exports.FLAG_CROUCHED = 128;
/** Ticks after a shield hit during which the entity carries FLAG_SHIELD_HIT (presentation; transport constant). */
exports.SHIELD_HIT_TICKS = 4;
/** Unacknowledged events are resent for at most this many ticks (then dropped). */
exports.EVENT_RESEND_TICKS = 64;
/** Share of the byte budget the event list may use when the snapshot is full. */
const EVENT_BUDGET_SHARE = 0.25;
/** v16: share of the byte budget the aim records may use (presentation: turrets catch up later). */
const AIM_BUDGET_SHARE = 0.1;
/** v16: crew bit 15 on a structure: under construction. */
exports.CREW_BUILDING = 0x8000;
/** v21 (ruling 42), pilot bodies only (they have no seats): bit 14 prone (the crouched flag is set too), bit 13 changing stance (going prone / getting up: cannot fire). */
exports.CREW_PRONE = 0x4000, exports.CREW_STANCE_CHANGING = 0x2000;
/** v22 (S14), vehicles only: bit 12 = produced short of pilots, waiting to be crewed at a pilot home (pilotpool.ts). Seats use bits 0-11. */
exports.CREW_WAITING = 0x1000;
/** v33 (C1, ruling 124), vehicles only (bit 13 is the stance bit on pilot bodies): an AI pilot is on its way to crew it. */
exports.CREW_EN_ROUTE = 0x2000;
/** v24 B1: on a bunker (buildings.json mounts) bits 8-11 of the crew field are the mounts fitted at its point's level; bits 0-7 the occupied mounts. */
exports.CREW_BUNKER_SHIFT = 8;
const M_NEW = 1, M_FLAGS = 2, M_POS = 4, M_HEAD = 8, M_HP = 16, M_SH = 32, M_CREW = 64, M_ALT = 128;
/** Baselines kept per guest (snapshots). An ack older than this forces a keyframe. */
exports.SNAPSHOT_RING = 32;
/** Snapshot seqs of stream epoch E start at (E mod 4096) x this (about 14 hours of snapshots at 20 Hz per epoch). */
exports.EPOCH_SEQ_SPAN = 1048576;
/**
 * Default forced keyframe interval in snapshots: 0 = none (keyframes only when
 * there is no usable baseline). Under a byte budget a forced keyframe would
 * make the guest drop what did not fit, so it is off by default.
 */
exports.DEFAULT_KEYFRAME_INTERVAL = 0;
/** Score weights (see the header comment). Transport tuning, not game balance. */
const W_REMOVE = 6, W_OWN = 7, W_ENEMY = 4, W_STRUCT = 2, W_NEW = 1.5, W_PROJ = 1;
/**
 * Deadbands (protocol v4, stage-1 fix 4): a heading or altitude change smaller than this is not a change worth a record
 * (the guest keeps its value): heading in 1/256 turns, altitude in 0.25 m, by distance from the viewer: exact for the
 * viewer's own pilot / vehicle and within snapshotProtectRadius, then MID within fullSimRadius, FAR beyond. In the
 * stage-1 fast scene heading changes (stationary units turning to face moving targets) were in 70% of all records.
 */
const HEAD_BAND_MID = 3, HEAD_BAND_FAR = 8;
/** v31 (j1, designer playtest 16 Nov: jumps and hops not smooth): altitude steps per metre and vertical speed steps per m/s on the wire. */
exports.ALT_Q = 128, exports.VY_Q = 16;
const ALT_BAND_MID = 0.5 * exports.ALT_Q, ALT_BAND_FAR = 2 * exports.ALT_Q;
/** Position deadband (m) beyond snapshotProtectRadius: MID within fullSimRadius, FAR beyond (exact for own and near). */
const POS_BAND_MID = 0.5, POS_BAND_FAR = 2;
/** Score per tick of staleness: 2 per second at 20 Hz, so a deferred far entity outranks a fresh own unit within ~2.5 s. */
const AGE_WEIGHT = 0.1;
const K_EREM = 0, K_ENEW = 1, K_EUPD = 2, K_PREM = 3, K_PNEW = 4;
/**
 * In-place insertion sort of a[0..n) by key[a[i]] (keys unique). Allocation-free;
 * the inputs are nearly sorted already (slots and pool order roughly follow id order).
 */
function sortByKey(a, n, key) {
    for (let i = 1; i < n; i++) {
        const v = a[i], kv = key[v];
        let j = i - 1;
        while (j >= 0 && key[a[j]] > kv) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = v;
    }
}
function vsize(v) { return v < 0x80 ? 1 : v < 0x4000 ? 2 : v < 0x200000 ? 3 : v < 0x10000000 ? 4 : 5; }
function svsize(v) { return vsize(v >= 0 ? v * 2 : -v * 2 - 1); }
/** What the guest holds after decoding one snapshot (the encoder's exact model of it). */
class ViewState {
    seq = -1;
    tick = 0;
    n = 0;
    pn = 0;
    ids = new Int32Array(256);
    type = new Uint8Array(256);
    flags = new Uint8Array(256);
    qx = new Uint16Array(256);
    qz = new Uint16Array(256);
    head = new Uint8Array(256);
    hp = new Uint8Array(256);
    sh = new Uint8Array(256);
    crew = new Uint16Array(256);
    alt = new Int32Array(256);
    vy = new Int32Array(256);
    /** Tick at which each entity's values were the true (quantised) state. */
    stamp = new Int32Array(256);
    pids = new Int32Array(256);
    /** Serialized side blocks the guest holds (own pilot, team, per-building queues, per-pilot player records). */
    pilotBlock = null;
    teamBlock = null;
    pointsBlock = null;
    mineBlock = null;
    matchBlock = null;
    weatherBlock = null;
    groupsBlock = null;
    buildBlock = null;
    callsBlock = null;
    queues = new Map();
    players = new Map();
    /** v8: per-unit order records of the viewer's team. */
    orders = new Map();
    /** v16: aim and wreck keyed records. */
    aims = new Map();
    decoys = new Map();
    /** v22: S15 ext keyed records (s15.ts). */
    ext = new Map();
    /** Every log event with serial <= evMax was sent in this snapshot or an earlier one, or does not concern the viewer. */
    evMax = 0;
    ensure(n) {
        if (n <= this.ids.length)
            return;
        let c = this.ids.length;
        while (c < n)
            c *= 2;
        const g32 = (a) => { const b = new Int32Array(c); b.set(a); return b; };
        const g16 = (a) => { const b = new Uint16Array(c); b.set(a); return b; };
        const g8 = (a) => { const b = new Uint8Array(c); b.set(a); return b; };
        this.ids = g32(this.ids);
        this.type = g8(this.type);
        this.flags = g8(this.flags);
        this.qx = g16(this.qx);
        this.qz = g16(this.qz);
        this.head = g8(this.head);
        this.hp = g8(this.hp);
        this.sh = g8(this.sh);
        this.crew = g16(this.crew);
        this.alt = g32(this.alt);
        this.vy = g32(this.vy);
        this.stamp = g32(this.stamp);
    }
    ensureP(n) {
        if (n <= this.pids.length)
            return;
        let c = this.pids.length;
        while (c < n)
            c *= 2;
        const b = new Int32Array(c);
        b.set(this.pids);
        this.pids = b;
    }
    /** Index of entity id, or -1 (binary search). */
    indexOf(id) {
        let lo = 0, hi = this.n - 1;
        while (lo <= hi) {
            const m = (lo + hi) >> 1, v = this.ids[m];
            if (v === id)
                return m;
            if (v < id)
                lo = m + 1;
            else
                hi = m - 1;
        }
        return -1;
    }
}
exports.ViewState = ViewState;
/** Smallest budget that can always hold a header with empty lists. */
const MIN_BUDGET = 128;
class SnapshotEncoder {
    sim;
    keyframeInterval;
    /** Hard byte cap per snapshot. */
    maxBytes;
    /** EncoderOptions.exact. */
    exact;
    /** EncoderOptions.local. */
    local;
    ring = [];
    seq = 0;
    ackSeq = -1;
    lastKey = -1e9;
    w = new snapshot_ts_1.ByteWriter(16384);
    /** New entities deferred by the budget: id -> tick first deferred (ages them for the ranking). Not sim state. */
    pendingSince = new Map();
    /** Removals (entity / projectile ids still in the baseline but gone from view): id -> tick first seen gone. Not sim state. */
    removedSince = new Map();
    pRemovedSince = new Map();
    pPendingSince = new Map();
    // scratch (grown, never shrunk)
    cap = 0;
    slots = new Int32Array(0);
    tFlags = new Uint8Array(0);
    tQx = new Uint16Array(0);
    tQz = new Uint16Array(0);
    tHead = new Uint8Array(0);
    tHp = new Uint8Array(0);
    tSh = new Uint8Array(0);
    tStamp = new Int32Array(0);
    tDist = new Float64Array(0);
    tW = new Float64Array(0);
    tType = new Uint8Array(0);
    tIds = new Int32Array(0);
    tCrew = new Uint16Array(0);
    tAlt = new Int32Array(0);
    tVy = new Int32Array(0);
    tBand = new Uint8Array(0);
    tVel = new Uint8Array(0);
    /** Highest event serial covered by a snapshot the guest acknowledged. Not sim state. */
    evAcked = 0;
    aw = new snapshot_ts_1.ByteWriter(256);
    sw = new snapshot_ts_1.ByteWriter(1024);
    ew = new snapshot_ts_1.ByteWriter(1024);
    xw = new snapshot_ts_1.ByteWriter(1024);
    /** Stream epoch stamped on every snapshot (sim.streamEpoch at construction; CONTRACTS rev 4 handover rule). */
    epoch;
    /** Next SHOT event serial not yet considered (hitscan shots are sent once, best effort). Not sim state. */
    shotFrom = 0;
    /** Per-snapshot counts of the shot section (bench): shots sent / shots in view left out for lack of room. */
    shotsSent = 0;
    shotsDropped = 0;
    /** Scratch: mount indices of the viewer's station (pilotBytes). */
    stationMounts = [];
    // merged events (ascending id): kind, truth index, base index, candidate index
    evK = new Int32Array(0);
    evT = new Int32Array(0);
    evB = new Int32Array(0);
    evC = new Int32Array(0);
    // candidates
    cKind = new Uint8Array(0);
    cCost = new Int32Array(0);
    cScore = new Float64Array(0);
    cSel = new Uint8Array(0);
    cMask = new Uint8Array(0);
    cRef = new Int32Array(0);
    cProt = new Uint8Array(0);
    pIdx = new Int32Array(256);
    pTruthIds = new Int32Array(256);
    pCand = new Int32Array(256);
    last = { seq: 0, keyframe: true, bytes: 0, entities: 0, records: 0, projectiles: 0, newProjectiles: 0, deferred: 0, budget: 0, baseAge: 0 };
    constructor(sim, opts = {}) {
        this.sim = sim;
        const o = typeof opts === "number" ? { keyframeInterval: opts } : opts;
        this.keyframeInterval = o.keyframeInterval ?? exports.DEFAULT_KEYFRAME_INTERVAL;
        const c = sim.d.constants;
        const rate = o.rateHz ?? c.snapshotRate;
        if (!(rate > 0))
            throw new Error("SnapshotEncoder: rateHz must be > 0");
        const mb = o.maxBytes ?? Math.floor((c.snapshotMaxBytes * c.snapshotRate) / rate);
        if (!(mb >= MIN_BUDGET))
            throw new Error(`SnapshotEncoder: maxBytes must be >= ${MIN_BUDGET}`);
        this.maxBytes = mb;
        this.local = !!o.local;
        this.exact = !!o.exact || this.local;
        for (let i = 0; i < exports.SNAPSHOT_RING; i++)
            this.ring.push(new ViewState());
        // the epoch's sequence numbers start at epoch x 2^20: an ack left over from an older epoch never names a live snapshot
        this.epoch = sim.streamEpoch >>> 0;
        this.seq = (this.epoch % 4096) * exports.EPOCH_SEQ_SPAN;
        this.shotFrom = sim.events.next;
    }
    /**
     * The guest decoded snapshot `seq` (of stream `epoch`, from SnapshotView.epoch): it may now serve as the baseline.
     * An ack of another epoch is ignored (guests should always pass it; without it a stale ack still cannot match).
     */
    ack(seq, epoch) {
        if (epoch !== undefined && (epoch >>> 0) !== this.epoch)
            return;
        if (seq <= this.seq && seq > this.ackSeq)
            this.ackSeq = seq;
        const v = this.ring[seq % exports.SNAPSHOT_RING];
        if (v.seq === seq && v.evMax > this.evAcked)
            this.evAcked = v.evMax;
    }
    /** The exact view the guest holds after decoding snapshot `seq` (while it is in the ring), else null. Read-only. */
    known(seq) {
        const v = this.ring[seq % exports.SNAPSHOT_RING];
        return v.seq === seq ? v : null;
    }
    grow(n) {
        if (n <= this.cap)
            return;
        let c = Math.max(256, this.cap);
        while (c < n)
            c *= 2;
        this.cap = c;
        this.slots = new Int32Array(c);
        this.tFlags = new Uint8Array(c);
        this.tQx = new Uint16Array(c);
        this.tQz = new Uint16Array(c);
        this.tHead = new Uint8Array(c);
        this.tHp = new Uint8Array(c);
        this.tSh = new Uint8Array(c);
        this.tStamp = new Int32Array(c);
        this.tDist = new Float64Array(c);
        this.tW = new Float64Array(c);
        this.tType = new Uint8Array(c);
        this.tIds = new Int32Array(c);
        this.tCrew = new Uint16Array(c);
        this.tAlt = new Int32Array(c);
        this.tVy = new Int32Array(c);
        this.tBand = new Uint8Array(c);
        this.tVel = new Uint8Array(c);
        const c2 = 2 * c;
        this.evK = new Int32Array(c2);
        this.evT = new Int32Array(c2);
        this.evB = new Int32Array(c2);
        this.evC = new Int32Array(c2);
    }
    growCand(n) {
        if (n <= this.cKind.length)
            return;
        let c = Math.max(512, this.cKind.length);
        while (c < n)
            c *= 2;
        this.cKind = new Uint8Array(c);
        this.cCost = new Int32Array(c);
        this.cScore = new Float64Array(c);
        this.cSel = new Uint8Array(c);
        this.cMask = new Uint8Array(c);
        this.cRef = new Int32Array(c);
        this.cProt = new Uint8Array(c);
    }
    growP(n) {
        if (n <= this.pIdx.length)
            return;
        let c = this.pIdx.length;
        while (c < n)
            c *= 2;
        this.pIdx = new Int32Array(c);
        this.pTruthIds = new Int32Array(c);
        this.pCand = new Int32Array(c);
    }
    /** Encodes the next snapshot. The returned bytes are a view, valid until the next encode(). */
    encode(viewer) {
        const sim = this.sim, d = sim.d, c = d.constants;
        const seq = ++this.seq;
        const kfi = this.keyframeInterval;
        const useBase = this.ackSeq > 0 && seq - this.ackSeq < exports.SNAPSHOT_RING && (kfi <= 0 || seq - this.lastKey < kfi);
        const base = useBase ? this.ring[this.ackSeq % exports.SNAPSHOT_RING] : null;
        if (base && base.seq !== this.ackSeq)
            throw new Error("snapshot ring corrupted");
        if (!useBase)
            this.lastKey = seq;
        const cur = this.ring[seq % exports.SNAPSHOT_RING];
        const prevState = this.ring[(seq - 1) % exports.SNAPSHOT_RING];
        const prev = prevState.seq === seq - 1 && prevState !== cur ? prevState : null;
        const tick = sim.tick;
        const ms = sim.mapSize, pq = (0, snapshot_ts_1.posQuantum)(ms), R = c.fullSimRadius, R2 = R * R, div = Math.max(1, c.farSnapshotDivisor | 0);
        const vteam = viewer.team, vx = viewer.x, vz = viewer.z;
        // CONTRACTS rev 4: the viewer's own pilot body / vehicle and everything within snapshotProtectRadius are never deferred
        const PR = c.snapshotProtectRadius, PR2 = PR * PR;
        let ownA = -1, ownB = -1;
        if (viewer.pilotId !== undefined && d.crewOn) {
            const vp = sim.pilots.get(viewer.pilotId);
            if (vp) {
                ownA = vp.entity || -1;
                ownB = vp.vehicle || -1;
            }
        }
        // ---- 1. target values of the true view (own team + detected enemies), ascending id
        this.grow(sim.hi + 1);
        let n = 0;
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s])
                continue;
            if (sim.team[s] !== vteam && !viewer.reveal && !sim.detected(s, vteam)) // viewer.reveal: the opening cinematic shows the enemy base
                continue;
            this.slots[n++] = s;
        }
        sortByKey(this.slots, n, sim.eid);
        const firingTicks = Math.round(c.firingSignatureSeconds * c.tickRate);
        const crewOn = d.crewOn;
        let building = null; // v16: entities of unfinished construction sites
        if (sim.con && sim.con.sites.size) {
            building = new Set();
            for (const st of sim.con.sites.values())
                if (st.entity)
                    building.add(st.entity);
        }
        const tIds = this.tIds;
        let pj = 0;
        for (let k = 0; k < n; k++) {
            const s = this.slots[k], t = sim.etype[s], id = sim.eid[s];
            tIds[k] = id;
            this.tType[k] = t;
            const dx = sim.x[s] - vx, dz = sim.z[s] - vz, dd2 = dx * dx + dz * dz;
            this.tDist[k] = Math.sqrt(dd2);
            this.tW[k] = d.tStructure[t] ? W_STRUCT : sim.team[s] === vteam ? W_OWN : W_ENEMY;
            this.tVel[k] = sim.velX[s] !== 0 || sim.velZ[s] !== 0 ? 1 : 0;
            // m1: a moving entity within fullSimRadius has no position / heading deadband (a slow mover, infantry at 5 m/s
            // at 10 Hz, was held every other snapshot and drew stop-start); the deadbands still spare the ones standing still
            this.tBand[k] = this.exact || id === ownA || id === ownB || dd2 <= PR2 ? 0 : dd2 <= R2 ? (this.tVel[k] ? 0 : 1) : 2;
            // far entities not scheduled this snapshot keep the values of the previous snapshot
            // (so a lost snapshot never makes them older than farSnapshotDivisor snapshots)
            if (prev && !this.local && dd2 > R2 && (seq + id) % div !== 0 && id !== ownA && id !== ownB) { // the viewer's own body is never held back
                while (pj < prev.n && prev.ids[pj] < id)
                    pj++;
                if (pj < prev.n && prev.ids[pj] === id) {
                    this.tFlags[k] = prev.flags[pj];
                    this.tQx[k] = prev.qx[pj];
                    this.tQz[k] = prev.qz[pj];
                    this.tHead[k] = prev.head[pj];
                    this.tHp[k] = prev.hp[pj];
                    this.tSh[k] = prev.sh[pj];
                    this.tStamp[k] = prev.stamp[pj];
                    this.tCrew[k] = prev.crew[pj];
                    this.tAlt[k] = prev.alt[pj];
                    this.tVy[k] = prev.vy[pj];
                    continue;
                }
            }
            let f = sim.team[s] & 7;
            if (tick - sim.lastFired[s] < firingTicks)
                f |= exports.FLAG_FIRED;
            if (tick - sim.lastShHit[s] < exports.SHIELD_HIT_TICKS)
                f |= exports.FLAG_SHIELD_HIT;
            let crew = 0;
            if (crewOn && d.tDriverSeat[t] >= 0) {
                if (sim.critTick[s] >= 0)
                    f |= exports.FLAG_CRITICAL;
                if (!sim.drv[s])
                    f |= exports.FLAG_DRIVERLESS;
                const ns = d.tSeatCount[t], sb = s * data_ts_1.MAX_SEATS;
                for (let j = 0; j < ns; j++)
                    if (sim.occ[sb + j] !== 0)
                        crew |= 1 << j;
                if (sim.pool !== null && sim.pool.waiting.size !== 0 && sim.pool.waiting.has(id))
                    crew |= exports.CREW_WAITING; // v22 S14
                if (sim.dispatch !== null && sim.dispatch.count.size !== 0 && sim.dispatch.count.has(id))
                    crew |= exports.CREW_EN_ROUTE; // v33 C1
            }
            else if (crewOn && d.tBunker[t]) { // v24 B1: a bunker: occupied mounts (bits 0-7) and the mounts fitted at its point's level (bits 8-11)
                const ns = d.tSeatCount[t], sb = s * data_ts_1.MAX_SEATS;
                for (let j = 0; j < ns && j < 8; j++)
                    if (sim.occ[sb + j] !== 0)
                        crew |= 1 << j;
                crew |= Math.min(15, sim.bunkerMounts(s)) << exports.CREW_BUNKER_SHIFT;
            }
            if (sim.slotPilot[s] !== 0 && (sim.stance[s] & 3) !== 0) {
                f |= exports.FLAG_CROUCHED;
                if ((sim.stance[s] & 3) === 2)
                    crew |= exports.CREW_PRONE;
            } // v21 ruling 42: prone = crouched flag + crew bit 14
            if (sim.slotPilot[s] !== 0 && sim.stanceChanging(s))
                crew |= exports.CREW_STANCE_CHANGING;
            if (building !== null && d.tStructure[t] && building.has(id))
                crew |= exports.CREW_BUILDING; // v16: under construction
            this.tFlags[k] = f;
            this.tCrew[k] = crew;
            // height above the type's normal height (ground, or airAltitude for aircraft), 1/ALT_Q m, and (v31) the vertical
            // speed (pilots' jump / jetpack / fall, hover hop) so the guest draws the arc between snapshots as the sim flies it
            const alt = sim.y[s] - sim.terrain.height(sim.x[s], sim.z[s]) - (d.tAir[t] ? c.airAltitude : 0);
            this.tAlt[k] = d.tStructure[t] ? 0 : Math.round(alt * exports.ALT_Q);
            this.tVy[k] = d.tStructure[t] || d.tAir[t] ? 0 : Math.round(sim.velY[s] * exports.VY_Q);
            this.tQx[k] = (0, snapshot_ts_1.quantPos)(sim.x[s], ms);
            this.tQz[k] = (0, snapshot_ts_1.quantPos)(sim.z[s], ms);
            // presentation only (not gameplay state), so engine-specific atan2 is acceptable here
            let a = Math.atan2(sim.dirZ[s], sim.dirX[s]);
            if (a < 0)
                a += Math.PI * 2;
            this.tHead[k] = Math.round((a / (Math.PI * 2)) * 256) & 255;
            this.tHp[k] = Math.min(255, Math.ceil((Math.max(0, sim.hp[s]) / (sim.slotPilot[s] !== 0 ? sim.bodyMaxHp(s) : d.tHp[t])) * 255)); // ruling 121 item 5: a player pilot's fraction of its doubled health
            this.tSh[k] = d.tShield[t] > 0 ? Math.ceil((Math.max(0, sim.shield[s]) / d.tShield[t]) * 255) : 0;
            this.tStamp[k] = tick;
        }
        // ---- 2. projectiles in view (current position within fullSimRadius), ascending id
        this.growP(sim.pN + 1);
        let pn = 0;
        const out = sim.tmpPos, dt = d.dt;
        for (let i = 0; i < sim.pN; i++) {
            const age = (tick - sim.pLaunch[i]) * dt;
            sim.projectileAt(i, age < sim.pT[i] ? age : sim.pT[i], out);
            const dx = out[0] - vx, dz = out[2] - vz;
            if (dx * dx + dz * dz <= R2)
                this.pIdx[pn++] = i;
        }
        sortByKey(this.pIdx, pn, sim.pId);
        for (let k = 0; k < pn; k++)
            this.pTruthIds[k] = sim.pId[this.pIdx[k]];
        // ---- 3. merge with the baseline: events in ascending id, candidates with cost and score
        const bn = base ? base.n : 0, bpn = base ? base.pn : 0;
        this.growCand(n + bn + pn + bpn + 1);
        let nEv = 0, nC = 0, costAll = 0, maxScore = 0;
        {
            let k = 0, j = 0;
            while (k < n || j < bn) {
                const tid = k < n ? tIds[k] : 0x7fffffff, bid = j < bn ? base.ids[j] : 0x7fffffff;
                let kind, ci = -1;
                if (bid < tid) {
                    kind = K_EREM;
                    ci = nC++;
                    this.cKind[ci] = K_EREM;
                    this.cCost[ci] = vsize(bid);
                    const bx = base.qx[j] * pq - vx, bz = base.qz[j] * pq - vz;
                    this.cProt[ci] = bx * bx + bz * bz <= PR2 || bid === ownA || bid === ownB ? 1 : 0;
                    let since = this.removedSince.get(bid);
                    if (since === undefined) {
                        since = tick;
                        this.removedSince.set(bid, tick);
                    }
                    this.cScore[ci] = W_REMOVE * (R / (R + Math.sqrt(bx * bx + bz * bz))) + AGE_WEIGHT * (tick - since);
                    this.evT[nEv] = -1;
                    this.evB[nEv] = j++;
                }
                else if (tid < bid) {
                    kind = K_ENEW;
                    ci = nC++;
                    this.cKind[ci] = K_ENEW;
                    this.cCost[ci] = vsize(tid) + 10 + (this.tCrew[k] ? 2 : 0) + (this.tAlt[k] || this.tVy[k] ? svsize(this.tAlt[k]) + svsize(this.tVy[k]) : 0);
                    this.cProt[ci] = this.tDist[k] <= PR || tid === ownA || tid === ownB ? 1 : 0;
                    let since = this.pendingSince.get(tid);
                    if (since === undefined)
                        since = tick;
                    this.cScore[ci] = this.tW[k] * W_NEW * (R / (R + this.tDist[k])) + AGE_WEIGHT * (tick - since);
                    this.evT[nEv] = k++;
                    this.evB[nEv] = -1;
                }
                else {
                    if (this.pendingSince.size > 0)
                        this.pendingSince.delete(tid); // the guest has it now
                    let m = 0, cost = 0;
                    if (this.tFlags[k] !== base.flags[j]) {
                        m |= M_FLAGS;
                        cost++;
                    }
                    const ddx = this.tQx[k] - base.qx[j], ddz = this.tQz[k] - base.qz[j];
                    const pb = this.tBand[k] === 0 ? 0 : (this.tBand[k] === 1 ? POS_BAND_MID : POS_BAND_FAR) / pq;
                    if (ddx > pb || ddx < -pb || ddz > pb || ddz < -pb || ((ddx !== 0 || ddz !== 0) && this.tVel[k] === 0)) {
                        m |= M_POS;
                        cost += svsize(ddx) + svsize(ddz);
                    } // a unit that stopped gets its exact position
                    const band = this.tBand[k];
                    let dh = (this.tHead[k] - base.head[j]) & 255;
                    if (dh > 128)
                        dh = 256 - dh;
                    if (dh > (band === 0 ? 0 : band === 1 ? HEAD_BAND_MID : HEAD_BAND_FAR)) {
                        m |= M_HEAD;
                        cost++;
                    }
                    if (this.tHp[k] !== base.hp[j]) {
                        m |= M_HP;
                        cost++;
                    }
                    if (this.tSh[k] !== base.sh[j]) {
                        m |= M_SH;
                        cost++;
                    }
                    if (this.tCrew[k] !== base.crew[j]) {
                        m |= M_CREW;
                        cost += 2;
                    }
                    const da = this.tAlt[k] - base.alt[j];
                    const dv = this.tVy[k] - base.vy[j];
                    if ((band === 0 && (da !== 0 || dv !== 0)) || (da !== 0 && ((this.tAlt[k] === 0) !== (base.alt[j] === 0) || Math.abs(da) > (band === 1 ? ALT_BAND_MID : ALT_BAND_FAR)))) {
                        m |= M_ALT;
                        cost += svsize(this.tAlt[k]) + svsize(this.tVy[k]);
                    }
                    if (m) {
                        kind = K_EUPD;
                        ci = nC++;
                        this.cKind[ci] = K_EUPD;
                        this.cCost[ci] = vsize(tid) + 1 + cost;
                        this.cMask[ci] = m;
                        this.cProt[ci] = this.tDist[k] <= PR || tid === ownA || tid === ownB ? 1 : 0;
                        this.cScore[ci] = this.tW[k] * (R / (R + this.tDist[k])) + AGE_WEIGHT * (tick - base.stamp[j]);
                    }
                    else
                        kind = -1; // unchanged
                    this.evT[nEv] = k++;
                    this.evB[nEv] = j++;
                }
                this.evK[nEv] = kind;
                this.evC[nEv] = ci;
                nEv++;
                if (ci >= 0) {
                    costAll += this.cCost[ci];
                    if (this.cScore[ci] > maxScore)
                        maxScore = this.cScore[ci];
                }
            }
        }
        const nEntC = nC;
        // projectiles: removals (in the baseline, gone from view) and new ones (in view, not in the baseline)
        {
            let k = 0, j = 0;
            while (k < pn || j < bpn) {
                const tid = k < pn ? this.pTruthIds[k] : 0x7fffffff, bid = j < bpn ? base.pids[j] : 0x7fffffff;
                if (bid < tid) {
                    const ci = nC++;
                    this.cKind[ci] = K_PREM;
                    this.cCost[ci] = vsize(bid);
                    this.cRef[ci] = j++;
                    this.cProt[ci] = 0;
                    let since = this.pRemovedSince.get(bid);
                    if (since === undefined) {
                        since = tick;
                        this.pRemovedSince.set(bid, tick);
                    }
                    this.cScore[ci] = W_REMOVE + AGE_WEIGHT * (tick - since);
                    costAll += this.cCost[ci];
                    if (this.cScore[ci] > maxScore)
                        maxScore = this.cScore[ci];
                }
                else if (tid < bid) {
                    const i = this.pIdx[k];
                    const ci = nC++;
                    this.cKind[ci] = K_PNEW;
                    this.cRef[ci] = k;
                    this.pCand[k] = ci;
                    this.cProt[ci] = 0;
                    const age = tick - sim.pLaunch[i];
                    this.cCost[ci] = vsize(tid) + 2 + vsize(age) + 12 + vsize(sim.pShooter[i]);
                    const age2 = age * dt;
                    sim.projectileAt(i, age2 < sim.pT[i] ? age2 : sim.pT[i], out);
                    const dx = out[0] - vx, dz = out[2] - vz;
                    // age = ticks since first deferred (not since launch: after a keyframe old shells must not crowd out entities)
                    let since = this.pPendingSince.get(tid);
                    if (since === undefined) {
                        since = tick;
                        this.pPendingSince.set(tid, tick);
                    }
                    this.cScore[ci] = W_PROJ * (R / (R + Math.sqrt(dx * dx + dz * dz))) + AGE_WEIGHT * (tick - since);
                    costAll += this.cCost[ci];
                    if (this.cScore[ci] > maxScore)
                        maxScore = this.cScore[ci];
                    k++;
                }
                else {
                    this.pCand[k] = -1;
                    if (this.pPendingSince.size > 0)
                        this.pPendingSince.delete(tid);
                    k++;
                    j++;
                }
            }
        }
        // ---- 3b. side sections (own pilot, team, queues, players, events): small and high priority, so they are
        // sized first and the entity / projectile selection gets what is left
        const header = 10 + (base ? 4 : 0) + 4 * vsize(nC + 1) + 5 + (base ? 0 : 5) + 5; // + epoch, epoch serial (keyframes), shot count
        // v16: the protected candidates (own pilot / vehicle, within snapshotProtectRadius) are reserved before the keyed side
        // records (orders, queues, ...) may use the budget, so a large order list can never push them out
        let protCost = 0;
        for (let i = 0; i < nC; i++)
            if (this.cProt[i])
                protCost += this.cCost[i];
        const side = this.buildSide(viewer, base, cur, Math.max(MIN_BUDGET >> 2, this.maxBytes - header - 8 - 2 - Math.min(protCost, this.maxBytes >> 1)), costAll);
        const room = this.maxBytes - header - side - 2; // v16: 2 for the (possibly empty) aim section
        const sel = this.cSel;
        let deferred = 0, usedAll = costAll;
        if (costAll <= room)
            for (let i = 0; i < nC; i++)
                sel[i] = 1;
        else {
            // protected candidates first (own pilot / vehicle, within snapshotProtectRadius): all of them when they fit,
            // else the best of them; then the rest by score: largest score threshold whose selection fits (bisection),
            // then whatever else fits, in id order
            let pc = 0;
            for (let i = 0; i < nC; i++) {
                sel[i] = 0;
                if (this.cProt[i])
                    pc += this.cCost[i];
            }
            let used = 0;
            if (pc <= room) {
                for (let i = 0; i < nC; i++)
                    if (this.cProt[i])
                        sel[i] = 1;
                used = pc;
                used = this.pickByScore(nC, maxScore, room, used, 0);
            }
            else
                used = this.pickByScore(nC, maxScore, room, 0, 1);
            for (let i = 0; i < nC; i++)
                if (!sel[i])
                    deferred++;
            usedAll = used;
        }
        // ---- 5. the view the guest will hold (cur) and the bytes
        cur.seq = seq;
        cur.tick = tick;
        cur.ensure(n + bn + 1);
        let cn = 0, nRem = 0, nRec = 0;
        for (let e = 0; e < nEv; e++) {
            const kind = this.evK[e], k = this.evT[e], j = this.evB[e], ci = this.evC[e];
            const take = ci >= 0 && sel[ci] === 1;
            if (kind === K_EREM) {
                if (take) {
                    nRem++;
                    continue;
                }
                copyEntry(cur, cn++, base, j); // deferred removal: the guest still has it
            }
            else if (kind === K_ENEW) {
                // age counts from the first deferral until the guest acks a snapshot that has it (sent but lost keeps ageing)
                if (!this.pendingSince.has(tIds[k]))
                    this.pendingSince.set(tIds[k], tick);
                if (!take)
                    continue;
                this.setTarget(cur, cn++, k);
                nRec++;
            }
            else if (kind === K_EUPD) {
                if (take) {
                    this.setTarget(cur, cn, k);
                    const m = this.cMask[ci];
                    if (!(m & M_HEAD))
                        cur.head[cn] = base.head[j]; // within the deadband: the guest keeps its value
                    if (!(m & M_ALT)) {
                        cur.alt[cn] = base.alt[j];
                        cur.vy[cn] = base.vy[j];
                    }
                    if (!(m & M_POS)) {
                        cur.qx[cn] = base.qx[j];
                        cur.qz[cn] = base.qz[j];
                    }
                    cn++;
                    nRec++;
                }
                else
                    copyEntry(cur, cn++, base, j); // deferred: the guest keeps its baseline value
            }
            else {
                // unchanged: the guest's value equals the target; stamp it with the fresher of the two
                copyEntry(cur, cn, base, j);
                if (this.tStamp[k] > cur.stamp[cn])
                    cur.stamp[cn] = this.tStamp[k];
                cn++;
            }
        }
        cur.n = cn;
        // forget ids that left (pending) or that the guest no longer has (removals): bounded maps
        if (this.pendingSince.size > 4 * (n + 64))
            this.pendingSince.clear();
        if (this.removedSince.size > 4 * (bn + 64))
            this.removedSince.clear();
        if (this.pRemovedSince.size > 4 * (bpn + 64))
            this.pRemovedSince.clear();
        if (this.pPendingSince.size > 4 * (pn + 64))
            this.pPendingSince.clear();
        const w = this.w;
        w.reset();
        w.u8(exports.SNAPSHOT_VERSION);
        w.u8(base ? 1 : 0);
        w.u32(tick);
        w.u32(seq);
        if (base)
            w.u32(base.seq);
        w.varint(this.epoch);
        if (!base)
            w.varint(sim.handoverSerial);
        w.varint(nRem);
        let prevId = 0;
        for (let e = 0; e < nEv; e++) {
            if (this.evK[e] !== K_EREM || !sel[this.evC[e]])
                continue;
            const id = base.ids[this.evB[e]];
            w.varint(id - prevId);
            prevId = id;
        }
        w.varint(nRec);
        prevId = 0;
        for (let e = 0; e < nEv; e++) {
            const kind = this.evK[e], ci = this.evC[e];
            if ((kind !== K_ENEW && kind !== K_EUPD) || !sel[ci])
                continue;
            const k = this.evT[e], id = tIds[k];
            w.varint(id - prevId);
            prevId = id;
            if (kind === K_ENEW) {
                w.u8(M_NEW | (this.tCrew[k] ? M_CREW : 0) | (this.tAlt[k] || this.tVy[k] ? M_ALT : 0));
                w.u8(this.tType[k]);
                w.u8(this.tFlags[k]);
                w.u16(this.tQx[k]);
                w.u16(this.tQz[k]);
                w.u8(this.tHead[k]);
                w.u8(this.tHp[k]);
                w.u8(this.tSh[k]);
                if (this.tCrew[k])
                    w.u16(this.tCrew[k]);
                if (this.tAlt[k] || this.tVy[k]) {
                    w.svarint(this.tAlt[k]);
                    w.svarint(this.tVy[k]);
                }
                continue;
            }
            const m = this.cMask[ci], j = this.evB[e];
            w.u8(m);
            if (m & M_FLAGS)
                w.u8(this.tFlags[k]);
            if (m & M_POS) {
                w.svarint(this.tQx[k] - base.qx[j]);
                w.svarint(this.tQz[k] - base.qz[j]);
            }
            if (m & M_HEAD)
                w.u8(this.tHead[k]);
            if (m & M_HP)
                w.u8(this.tHp[k]);
            if (m & M_SH)
                w.u8(this.tSh[k]);
            if (m & M_CREW)
                w.u16(this.tCrew[k]);
            if (m & M_ALT) {
                w.svarint(this.tAlt[k]);
                w.svarint(this.tVy[k]);
            }
        }
        // projectiles: removals written, then new ones; cur.pids = baseline - written removals + written new
        let pRem = 0, pNew = 0;
        for (let i = nEntC; i < nC; i++)
            if (sel[i]) {
                if (this.cKind[i] === K_PREM)
                    pRem++;
                else
                    pNew++;
            }
        w.varint(pRem);
        prevId = 0;
        for (let i = nEntC; i < nC; i++) {
            if (!sel[i] || this.cKind[i] !== K_PREM)
                continue;
            const id = base.pids[this.cRef[i]];
            w.varint(id - prevId);
            prevId = id;
        }
        w.varint(pNew);
        prevId = 0;
        for (let i = nEntC; i < nC; i++) {
            if (!sel[i] || this.cKind[i] !== K_PNEW)
                continue;
            const k = this.cRef[i], pi = this.pIdx[k], id = this.pTruthIds[k];
            w.varint(id - prevId);
            prevId = id;
            w.u8(sim.pWeapon[pi]);
            w.u8(sim.pTeam[pi]);
            w.varint(tick - sim.pLaunch[pi]);
            w.u16((0, snapshot_ts_1.quantPos)(sim.pX0[pi], ms));
            w.u16((0, snapshot_ts_1.quantPos)(sim.pZ0[pi], ms));
            w.i16((0, snapshot_ts_1.quantY)(sim.pY0[pi]));
            w.i16((0, snapshot_ts_1.quantVel)(sim.pVX[pi]));
            w.i16((0, snapshot_ts_1.quantVel)(sim.pVY[pi]));
            w.i16((0, snapshot_ts_1.quantVel)(sim.pVZ[pi]));
            w.varint(sim.pShooter[pi]);
        }
        w.raw(this.sw.view_());
        w.varint(this.evCount);
        w.raw(this.ew.view_());
        // hitscan shots since the last snapshot (best effort, never resent): what is left of the cap after everything else
        this.buildShots(viewer, room - usedAll);
        w.varint(this.shotCount);
        w.raw(this.xw.view_());
        this.buildAims(viewer, base, cur, room - usedAll - this.xw.pos - vsize(this.shotCount)); // v16: last, in what is left
        w.raw(this.aw.view_());
        cur.ensureP(bpn + pn + 1);
        {
            let k = 0, j = 0, cp = 0;
            // removal candidates are in ascending baseline order: walk them alongside
            let ri = nEntC;
            while (k < pn || j < bpn) {
                const tid = k < pn ? this.pTruthIds[k] : 0x7fffffff, bid = j < bpn ? base.pids[j] : 0x7fffffff;
                if (bid < tid) {
                    while (ri < nC && !(this.cKind[ri] === K_PREM && this.cRef[ri] === j))
                        ri++;
                    if (!(ri < nC && sel[ri]))
                        cur.pids[cp++] = bid; // deferred removal: the guest still has it
                    j++;
                }
                else if (tid < bid) {
                    if (sel[this.pCand[k]])
                        cur.pids[cp++] = tid;
                    k++;
                }
                else {
                    cur.pids[cp++] = tid;
                    k++;
                    j++;
                }
            }
            cur.pn = cp;
        }
        if (w.pos > this.maxBytes)
            throw new Error(`snapshot budget overrun: ${w.pos} > ${this.maxBytes}`); // cannot happen: costs are upper bounds
        this.last = { seq, keyframe: !base, bytes: w.pos, entities: n, records: nRec, projectiles: pn, newProjectiles: pNew, deferred, budget: this.maxBytes, baseAge: base ? seq - base.seq : 0 };
        return w.view_();
    }
    /**
     * Adds candidates (only protected ones if prot = 1, only unprotected if 0) to the selection by score: the largest
     * threshold whose candidates fit in room - used (bisection), then any smaller ones that still fit, in id order.
     * Returns the bytes used.
     */
    pickByScore(nC, maxScore, room, used0, prot) {
        const sel = this.cSel, sc = this.cScore, cost = this.cCost, pr = this.cProt;
        let lo = 0, hi = maxScore * 1.000001 + 1e-9;
        for (let it = 0; it < 40; it++) {
            const mid = 0.5 * (lo + hi);
            let used = used0;
            for (let i = 0; i < nC; i++)
                if (pr[i] === prot && sc[i] >= mid)
                    used += cost[i];
            if (used <= room)
                hi = mid;
            else
                lo = mid;
        }
        let used = used0;
        for (let i = 0; i < nC; i++)
            if (pr[i] === prot && sc[i] >= hi) {
                sel[i] = 1;
                used += cost[i];
            }
        for (let i = 0; i < nC; i++)
            if (pr[i] === prot && !sel[i] && used + cost[i] <= room) {
                sel[i] = 1;
                used += cost[i];
            }
        return used;
    }
    evCount = 0;
    /**
     * Builds the side sections into sw (own pilot, team, queues, players) and ew (event records, evCount of
     * them), and sets cur's copies of them (what the guest will hold). limit: bytes they may use at most;
     * entityCost: the entity / projectile candidates' total (events are capped at EVENT_BUDGET_SHARE of the
     * budget only when everything does not fit). Returns the bytes used (event count varint included).
     */
    buildSide(viewer, base, cur, limit, entityCost) {
        const sim = this.sim, d = sim.d, vteam = viewer.team, sw = this.sw;
        sw.reset();
        // own pilot block
        const p = viewer.pilotId !== undefined && d.crewOn ? sim.pilots.get(viewer.pilotId) : undefined;
        const pb = p ? this.pilotBytes(p) : null, bpb = base ? base.pilotBlock : null;
        if (pb && !(bpb && sameBytes(pb, bpb))) {
            sw.u8(1);
            sw.raw(pb);
            cur.pilotBlock = pb;
        }
        else {
            sw.u8(0);
            cur.pilotBlock = bpb;
        }
        // team block
        const tb = new snapshot_ts_1.ByteWriter(24);
        tb.varint(Math.floor(sim.ore[vteam]));
        tb.varint(Math.floor(sim.gas[vteam]));
        {
            const pc = sim.pilotPool(vteam);
            tb.varint(pc.available);
            tb.varint(pc.assigned);
            tb.varint(pc.onFoot);
            tb.varint(pc.lost);
            tb.varint(pc.initial);
            tb.varint(pc.gained);
        } // v22 S14: the pilot reserve
        const tbb = tb.bytes(), btb = base ? base.teamBlock : null;
        if (!(btb && sameBytes(tbb, btb))) {
            sw.u8(1);
            sw.raw(tbb);
            cur.teamBlock = tbb;
        }
        else {
            sw.u8(0);
            cur.teamBlock = btb;
        }
        // strategic points block (v6): public to every viewer (ownership, capture, supply, momentum are on every HUD)
        const P = sim.pts;
        if (P) {
            const pb2 = new snapshot_ts_1.ByteWriter(16 + P.n * 6);
            pb2.varint(P.n);
            for (let i = 0; i < P.n; i++) {
                if (!sim.pointSeenBy(i, vteam)) {
                    pb2.u8(255);
                    continue;
                } // v22 ruling 87: an enemy / neutral point nobody of the team sees: nothing
                const cp = P.capProg[i];
                pb2.u8(P.owner[i] + 1);
                pb2.u8(P.capTeam[i] + 1);
                pb2.u8(cp <= 0 ? 0 : Math.min(255, Math.ceil(cp * 255)));
                pb2.u8(P.flags[i]);
                pb2.u8(P.fort[i]);
                pb2.u8(Math.min(255, Math.round((P.hackTicks[i] / P.rules.hackTicks) * 255)));
            }
            pb2.u8(P.momentum.length);
            for (let t = 0; t < P.momentum.length; t++)
                pb2.u8(Math.round(P.momentum[t] * 255)); // v22: no CP budget
            // v7 (ruling 29): Command Cores being hacked or disabled
            // v16: every Core of the viewer's team, every detected Core, and every one being hacked or disabled
            const hacked = new Map(P.coreList());
            const tc = sim.coreTypes(), cores = [];
            for (let s = 0; s < sim.hi; s++) {
                if (!sim.alive[s] || !tc[sim.etype[s]])
                    continue;
                const id = sim.eid[s];
                if (sim.team[s] === vteam || sim.detected(s, vteam) || hacked.has(id))
                    cores.push(s);
            }
            cores.sort((a, b) => sim.eid[a] - sim.eid[b]);
            pb2.varint(cores.length);
            for (const s of cores) {
                const id = sim.eid[s], c = hacked.get(id);
                pb2.varint(id);
                pb2.varint(c && c.until > sim.tick ? c.until : 0);
                pb2.u8(c ? Math.min(255, Math.round((c.ticks / P.rules.hackTicks) * 255)) : 0);
                pb2.u8(sim.team[s]);
                pb2.u16((0, snapshot_ts_1.quantPos)(sim.x[s], sim.mapSize));
                pb2.u16((0, snapshot_ts_1.quantPos)(sim.z[s], sim.mapSize));
            }
            // v36 (ruling 133): fortify jobs at the viewer's own points and at points it sees now (progress, stage, time left)
            const E2 = sim.eco2, jobs = E2 ? [...E2.jobs.values()].filter((j) => j.team === vteam || sim.pointSeenBy(j.point, vteam)).sort((a, b) => a.point - b.point) : [];
            pb2.varint(jobs.length);
            for (const j of jobs) {
                pb2.varint(j.point);
                pb2.u8(j.team);
                pb2.u8(j.level);
                pb2.u8(j.progress <= 0 ? 0 : Math.min(255, Math.max(1, Math.floor((j.progress / Math.max(1, j.ticks)) * 255))));
                pb2.u8(E2.jobStage(sim, j));
                pb2.varint(Math.max(0, j.ticks - j.progress));
            }
            const pbb = pb2.bytes(), bpp = base ? base.pointsBlock : null;
            if (!(bpp && sameBytes(pbb, bpp))) {
                sw.u8(1);
                sw.raw(pbb);
                cur.pointsBlock = pbb;
            }
            else {
                sw.u8(0);
                cur.pointsBlock = bpp;
            }
        }
        else {
            sw.u8(0);
            cur.pointsBlock = null;
        }
        // mining block (v7): deposits' remaining ore (every viewer), the viewer team's storage caps and its harvesters' loads
        const M = sim.mine;
        if (M) {
            M.caps(sim);
            const mb = new snapshot_ts_1.ByteWriter(16 + M.nd * 3 + M.harv.size * 6);
            mb.varint(M.nd);
            for (let i = 0; i < M.nd; i++)
                mb.varint(Math.max(0, Math.ceil(M.remaining[i] - 1e-9)));
            mb.varint(Math.floor(M.oreCap[vteam]));
            mb.varint(Math.floor(M.gasCap[vteam]));
            const own = M.harvList().filter((h) => { const hs = sim.idToSlot.get(h.id); return hs !== undefined && sim.team[hs] === vteam; });
            mb.varint(own.length);
            for (const h of own) {
                const cap = M.tCap[sim.etype[sim.idToSlot.get(h.id)]];
                mb.varint(h.id);
                mb.u8(h.phase | (h.mode === 1 ? 128 : 0));
                mb.u8(h.load <= 0 || cap <= 0 ? 0 : Math.min(255, Math.ceil((h.load / cap) * 255 - 1e-9)));
                mb.varint(h.dep + 1);
                mb.varint(h.drop);
                mb.u8(h.dock + 1);
                mb.u8(Math.min(255, M.queuePlace(h))); // v30 (q1): drop-off, dock + 1, queue place (0 not queued)
            }
            const mbb = mb.bytes(), bmb = base ? base.mineBlock : null;
            if (!(bmb && sameBytes(mbb, bmb))) {
                sw.u8(1);
                sw.raw(mbb);
                cur.mineBlock = mbb;
            }
            else {
                sw.u8(0);
                cur.mineBlock = bmb;
            }
        }
        else {
            sw.u8(0);
            cur.mineBlock = null;
        }
        // match block (v9): phase and winner, public to every viewer
        const MT = sim.match;
        if (MT) {
            const xb = new snapshot_ts_1.ByteWriter(12);
            xb.u8(MT.phase);
            xb.u8((MT.winner + 1) & 255);
            xb.varint(MT.overTick);
            xb.u8(MT.eliminated);
            const OV = MT.objectives ? MT.objectives.view() : [];
            xb.u8(MT.reason);
            xb.u8(OV.length);
            for (const o of OV) {
                xb.u8(objectives_ts_1.OBJ_TYPES.indexOf(o.type));
                xb.u8(o.status | (o.side ? 128 : 0));
                xb.u8(o.team);
                xb.u16(Math.round(o.progress * 1000));
                xb.varint(Math.max(0, o.value));
                xb.varint(Math.max(0, o.goal));
                xb.varint(o.timerSeconds);
            }
            const xbb = xb.bytes(), bxb = base ? base.matchBlock : null;
            if (!(bxb && sameBytes(xbb, bxb))) {
                sw.u8(1);
                sw.raw(xbb);
                cur.matchBlock = xbb;
            }
            else {
                sw.u8(0);
                cur.matchBlock = bxb;
            }
        }
        else {
            sw.u8(0);
            cur.matchBlock = null;
        }
        // weather block (v15, wave 2 D): current weather and the forecast, every viewer
        const WX = sim.weather;
        if (WX) {
            const v = WX.view(sim.tick), wb = new snapshot_ts_1.ByteWriter(12);
            wb.u8(v.ticksLeft > 0 ? v.index + 1 : 0);
            wb.varint(v.ticksLeft > 0 ? sim.tick + v.ticksLeft : 0);
            wb.u8(v.next !== null ? v.nextIndex + 1 : 0);
            wb.varint(v.next !== null ? sim.tick + v.ticksUntil : 0);
            const wbb = wb.bytes(), bwb = base ? base.weatherBlock : null;
            if (!(bwb && sameBytes(wbb, bwb))) {
                sw.u8(1);
                sw.raw(wbb);
                cur.weatherBlock = wbb;
            }
            else {
                sw.u8(0);
                cur.weatherBlock = bwb;
            }
        }
        else {
            sw.u8(0);
            cur.weatherBlock = null;
        }
        // battle groups block (v19, w3b): the viewer team's groups
        if (sim.bg) {
            const GV = sim.battleGroups(viewer.team), gb = new snapshot_ts_1.ByteWriter(16 + GV.length * 32), pq = (0, snapshot_ts_1.posQuantum)(sim.mapSize);
            gb.u8(GV.length);
            for (const g of GV) {
                gb.u8(g.label);
                gb.u8(battlegroups_ts_1.GROUP_ORDER_NAMES.indexOf(g.order));
                gb.u8(g.reinforce ? 1 : 0);
                gb.u8(g.leg);
                gb.varint(g.target);
                gb.varint(g.peak);
                gb.u8(g.members.length);
                for (const id of g.members)
                    gb.varint(id);
                gb.u8(g.route.length);
                for (const [x, z] of g.route) {
                    gb.u16(Math.max(0, Math.min(65535, Math.round(x / pq))));
                    gb.u16(Math.max(0, Math.min(65535, Math.round(z / pq))));
                }
            }
            const gbb = gb.bytes(), bgb = base ? base.groupsBlock : null;
            if (!(bgb && sameBytes(gbb, bgb))) {
                sw.u8(1);
                sw.raw(gbb);
                cur.groupsBlock = gbb;
            }
            else {
                sw.u8(0);
                cur.groupsBlock = bgb;
            }
        }
        else {
            sw.u8(0);
            cur.groupsBlock = null;
        }
        // construction block (v10): sites (own team's and detected ones) and build slots (usage for the viewer team's points only)
        const CN = sim.con;
        if (CN && sim.pts) {
            const cb = new snapshot_ts_1.ByteWriter(16 + CN.sites.size * 14 + sim.pts.n * 6);
            const sl = CN.siteList().filter((st) => { if (st.team === vteam)
                return true; const es = st.entity ? sim.idToSlot.get(st.entity) : undefined; return es !== undefined && sim.detected(es, vteam); }); // v16: no fog leak
            cb.varint(sl.length);
            for (const st of sl) {
                cb.varint(st.id);
                cb.u8(st.team);
                cb.varint(st.type);
                cb.u8(st.point);
                cb.u16((0, snapshot_ts_1.quantPos)(st.x, sim.mapSize));
                cb.u16((0, snapshot_ts_1.quantPos)(st.z, sim.mapSize));
                cb.u8(Math.min(255, Math.floor((st.progress / CN.tTicks[st.type]) * 255)));
                cb.varint(st.entity);
                cb.varint(st.builder);
                cb.varint(st.yaw + 1); // v28 (B2): placed facing step + 1 (0 none)
            }
            cb.varint(sim.pts.n);
            // QA5-6: slot usage (used / free / free geysers) counts every structure and site at the point, seen or not, so it
            // goes only to the point owner's team; other viewers get the capacity with the usage fields 0 (layout unchanged)
            for (let p = 0; p < sim.pts.n; p++) {
                const q = CN.slotsOf(sim, p), mine = sim.pts.owner[p] === vteam;
                cb.u8(q.slots);
                cb.u8(q.defenceSlots);
                cb.u8(mine ? q.used : 0);
                cb.u8(mine ? q.free : 0);
                cb.u8(mine ? q.freeDefence : 0);
                cb.u8(mine ? q.freeGeysers.length : 0);
            }
            const cbb = cb.bytes(), bcb = base ? base.buildBlock : null;
            if (!(bcb && sameBytes(cbb, bcb))) {
                sw.u8(1);
                sw.raw(cbb);
                cur.buildBlock = cbb;
            }
            else {
                sw.u8(0);
                cur.buildBlock = bcb;
            }
        }
        else {
            sw.u8(0);
            cur.buildBlock = null;
        }
        // support calls block (v11): the viewer pilot's calls, and every pending beacon
        if (sim.calls) {
            const cb = new snapshot_ts_1.ByteWriter(32);
            const vp = viewer.pilotId !== undefined ? sim.pilots.get(viewer.pilotId) : undefined;
            const own = vp && vp.player >= 0 ? sim.callLoadout(vp.id) : [];
            cb.u8(own.length);
            for (const ci of own) {
                cb.u8(ci);
                cb.varint(Math.max(0, sim.callReadyTick(vp.id, ci)));
                cb.u8(sim.callRefusalCode(vp.id, ci));
                cb.u8(Math.min(255, sim.callUsesLeft(vp.id, ci)));
            }
            cb.u8(vp && vp.player >= 0 ? Math.min(255, sim.callSlots(vp.id)) : 0);
            cb.u8(vp ? Math.min(255, sim.heavyWeapon(vp.id) + 1) : 0);
            const bl = sim.calls ? sim.calls.beacons : [], pq = (0, snapshot_ts_1.posQuantum)(sim.mapSize);
            cb.varint(bl.length);
            for (const b of bl) {
                cb.varint(b.id);
                cb.u8(b.call);
                cb.u8(b.team);
                cb.u16(Math.min(65535, Math.round(b.x / pq)));
                cb.u16(Math.min(65535, Math.round(b.z / pq)));
                cb.varint(b.impactTick);
                cb.u8(b.flags);
                cb.varint(Math.max(0, b.caller));
                if (b.flags & 2) {
                    cb.i16(Math.max(-32768, Math.min(32767, Math.round(b.y * 8))));
                    cb.varint(b.att);
                }
            }
            const zs = sim.callZones(vteam);
            cb.varint(zs.length);
            for (const z of zs) {
                cb.varint(z.key > 0 ? z.key : z.beacon);
                cb.u8(z.call);
                cb.u8(z.team);
                cb.u16(Math.min(65535, Math.round(z.x / pq)));
                cb.u16(Math.min(65535, Math.round(z.z / pq)));
                cb.u8(z.dir);
                cb.varint(z.end);
                cb.varint(z.value);
            }
            // v34 (ruling 128): beacons in flight or rolling (every viewer: it glows)
            const th = sim.calls ? sim.calls.thrown : [], i16 = (v) => cb.i16(Math.max(-32768, Math.min(32767, Math.round(v))));
            cb.varint(th.length);
            for (const t of th) {
                cb.varint(t.id);
                cb.u8(t.call);
                cb.u8(t.team);
                cb.varint(Math.max(0, t.caller));
                cb.u16(Math.min(65535, Math.round(t.x / pq)));
                cb.u16(Math.min(65535, Math.round(t.z / pq)));
                i16(t.y * 8);
                i16(t.vx * 32);
                i16(t.vy * 32);
                i16(t.vz * 32);
                cb.u8((t.st & 3) | (Math.min(31, t.bounces) << 2) | (t.fired ? 128 : 0));
            }
            const cbb = cb.bytes(), bcb = base ? base.callsBlock : null;
            if (!(bcb && sameBytes(cbb, bcb))) {
                sw.u8(1);
                sw.raw(cbb);
                cur.callsBlock = cbb;
            }
            else {
                sw.u8(0);
                cur.callsBlock = bcb;
            }
        }
        else {
            sw.u8(0);
            cur.callsBlock = null;
        }
        // production queues of the viewer's team, then the team's player pilots: keyed records, delta against the baseline
        const qs = new Map();
        for (const q of sim.prod.values()) {
            const bs = sim.idToSlot.get(q.building);
            if (bs === undefined || sim.team[bs] !== vteam || (q.items.length === 0 && !q.rally))
                continue;
            qs.set(q.building, this.queueBytes(q));
        }
        this.keyed(qs, base ? base.queues : null, cur.queues = new Map(), limit);
        const ps = new Map();
        if (d.crewOn)
            for (const pl of sim.pilots.values()) {
                if (pl.player < 0 || pl.team !== vteam)
                    continue;
                const b = new snapshot_ts_1.ByteWriter(16);
                b.varint(pl.id);
                b.u8(pl.player & 255);
                b.u8(pl.state);
                b.varint(pl.state === 0 || pl.state === 4 ? pl.vehicle : pl.state === 1 || pl.state === 3 ? pl.entity : 0); /* v32 ruling 121: state 4 inside a command seat (the structure) */
                b.u8(pl.seat >= 0 ? pl.seat : 255);
                ps.set(pl.id, b.bytes());
            }
        this.keyed(ps, base ? base.players : null, cur.players = new Map(), limit);
        // v8: current order of each of the viewer team's units (kind, formation, hold fire, guard / follow / attack target)
        const os = new Map();
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.team[s] !== vteam || d.tStructure[sim.etype[s]])
                continue;
            const o = sim.orderState(s);
            if (o.kind === 0 && !o.holdFire)
                continue;
            const b = new snapshot_ts_1.ByteWriter(12);
            b.varint(sim.eid[s]);
            b.u8(o.kind);
            b.u8((o.formation & 63) | (o.targetIsPilot ? 64 : 0) | (o.holdFire ? 128 : 0));
            b.varint(Math.max(0, o.target));
            os.set(sim.eid[s], b.bytes());
        }
        this.keyed(os, base ? base.orders : null, cur.orders = new Map(), limit);
        // v16: decoy beacons (stealth.ts): the viewer team's own, and enemy decoys its sensors pick up (shown as contacts)
        const dm = new Map();
        if (sim.stl)
            for (const x of sim.stl.decoys) {
                if (x.team !== vteam && x.seen[vteam] < sim.tick)
                    continue;
                const b = new snapshot_ts_1.ByteWriter(12);
                b.varint(x.id);
                b.u8(x.team);
                b.u8(sim.stlRules.decoyType & 255);
                b.u16((0, snapshot_ts_1.quantPos)(x.x, sim.mapSize));
                b.u16((0, snapshot_ts_1.quantPos)(x.z, sim.mapSize));
                dm.set(x.id, b.bytes());
            }
        this.keyed(dm, base ? base.decoys : null, cur.decoys = new Map(), limit);
        // v22: S15 ext records (s15.ts: aircraft ammunition of the viewer's team, ...)
        const xm = new Map();
        (0, s15_ts_1.extRecords)(sim, vteam, xm, () => new snapshot_ts_1.ByteWriter(16));
        this.keyed(xm, base ? base.ext : null, cur.ext = new Map(), limit);
        // events not yet acknowledged that concern this viewer (resent until acked, at most EVENT_RESEND_TICKS old)
        const log = sim.events, ew = this.ew, tick = sim.tick;
        ew.reset();
        // the viewer's own body: its pilot entity on foot, or the vehicle it sits in (DAMAGE_TAKEN events)
        let body = -1, ride = -1;
        if (p) {
            if (p.state === 1 || p.state === 3)
                body = p.entity;
            else if (p.state === 0)
                ride = p.vehicle;
        }
        let n = 0, prev = 0, evMax = log.next - 1;
        const all = sw.pos + 5 + entityCost <= limit;
        const evLimit = Math.max(0, Math.min(limit - sw.pos - 5, all ? Infinity : Math.floor(this.maxBytes * EVENT_BUDGET_SHARE)));
        for (let k = Math.max(this.evAcked + 1, log.first()); k < log.next; k++) {
            const i = log.at(k);
            if (tick - log.tick[i] > exports.EVENT_RESEND_TICKS)
                continue;
            let kind = log.kind[i];
            let mine;
            if (kind === events_ts_1.EV.HIT) {
                // hit markers: the viewer pilot's own shots; DAMAGE_TAKEN: hits on the viewer's body or the vehicle it rides
                mine = viewer.pilotId !== undefined && log.c[i] === viewer.pilotId;
                if (!mine && (log.b[i] === body || log.b[i] === ride)) {
                    mine = true;
                    kind = events_ts_1.EV.DAMAGE_TAKEN;
                }
            }
            else if (kind === events_ts_1.EV.BUILD_STARTED || kind === events_ts_1.EV.BUILD_ENDED)
                mine = log.team[i] === vteam; // w2f: no fog leak
            else if (kind === events_ts_1.EV.BUILD_DONE) {
                const bs = sim.idToSlot.get(log.d[i]);
                mine = log.team[i] === vteam || (bs !== undefined && sim.detected(bs, vteam));
            }
            else if (kind === events_ts_1.EV.UNIT_DIED)
                mine = log.team[i] === vteam || (log.c[i] & (1 << vteam)) !== 0;
            // QA1 fog audit (reports/qa/fix-qa1.md table): events about an entity go to its team and to teams that detected it
            // when the event happened (mask in a field that is not on the wire)
            else if (kind === events_ts_1.EV.AIRCRAFT_DOWN || kind === events_ts_1.EV.AIRCRAFT_LANDING)
                mine = log.team[i] === vteam || (log.d[i] & (1 << vteam)) !== 0;
            else if (kind === events_ts_1.EV.FORWARD_BASE)
                mine = log.team[i] === vteam || (log.v2[i] & (1 << vteam)) !== 0;
            else if (kind === events_ts_1.EV.POINT)
                mine = log.c[i] === vteam || log.d[i] === vteam || sim.pointSeenBy(log.a[i], vteam); // v22 ruling 87: a point's events only to its teams or teams that see it
            else if (kind === events_ts_1.EV.FORTIFY)
                mine = log.team[i] === vteam || sim.pointSeenBy(log.a[i], vteam); // v22 ruling 87
            else if (kind === events_ts_1.EV.POINT || kind === events_ts_1.EV.CORE || kind === events_ts_1.EV.DEPOSIT_EXHAUSTED || kind === events_ts_1.EV.MATCH_OVER || kind === events_ts_1.EV.OBJECTIVE_PROGRESS || kind === events_ts_1.EV.OBJECTIVE_DONE || kind === events_ts_1.EV.OBJECTIVE_FAILED || kind === events_ts_1.EV.CALL_QUEUED || kind === events_ts_1.EV.CALL_IMPACT || (kind === events_ts_1.EV.CALL_EFFECT && !(log.flags[i] & 128)) || kind === events_ts_1.EV.FORTIFY || kind === events_ts_1.EV.WEATHER || kind === events_ts_1.EV.BATTLE_RESULT || kind === events_ts_1.EV.PLAYER_JOINED || kind === events_ts_1.EV.PLAYER_LEFT)
                mine = true;
            else
                mine = log.team[i] === vteam && (kind === events_ts_1.EV.REJECT || kind === events_ts_1.EV.ENTER || kind === events_ts_1.EV.EXIT || kind === events_ts_1.EV.EJECT || kind === events_ts_1.EV.SEAT || kind === events_ts_1.EV.PILOT_DEATH || kind === events_ts_1.EV.RESPAWN || kind === events_ts_1.EV.PRODUCED || kind === events_ts_1.EV.HIJACK || kind === events_ts_1.EV.HARVEST_DELIVERED || kind === events_ts_1.EV.ORDER_ACK || kind === events_ts_1.EV.CALL_REFUSED || kind === events_ts_1.EV.CALL_EFFECT || kind === events_ts_1.EV.DOWNED || kind === events_ts_1.EV.REVIVED || kind === events_ts_1.EV.CHARGE || kind === events_ts_1.EV.CLOAK || kind === events_ts_1.EV.PASSENGER_LOST || kind === events_ts_1.EV.CARGO || kind === events_ts_1.EV.CARGO_LOST || kind === events_ts_1.EV.FERRY || kind === events_ts_1.EV.GROUP || kind === events_ts_1.EV.AUTO_DEFEND || kind === events_ts_1.EV.CRITICAL || kind === events_ts_1.EV.DESTROYED || kind === events_ts_1.EV.RETURNED || kind === events_ts_1.EV.QUEUE || kind === events_ts_1.EV.JAMMER || kind === events_ts_1.EV.DECOY || kind === events_ts_1.EV.SCAN || kind === events_ts_1.EV.SEARCH
                    || kind === events_ts_1.EV.PILOT_LOST || kind === events_ts_1.EV.PILOT_AVAILABLE || kind === events_ts_1.EV.CREWED || kind === events_ts_1.EV.UNDERCREWED || kind === events_ts_1.EV.CITADEL_PILOTS || kind === events_ts_1.EV.SHELTER || kind === events_ts_1.EV.CREW_DISPATCH || kind === events_ts_1.EV.AMMO || kind === events_ts_1.EV.AIR_WARNING || kind === events_ts_1.EV.ASH_CRASH); // v22 S14
            if (!mine)
                continue;
            const at = ew.pos;
            ew.varint(n === 0 ? k : k - prev);
            ew.u8(kind);
            if (kind === events_ts_1.EV.HIT || kind === events_ts_1.EV.DAMAGE_TAKEN) {
                ew.varint(log.b[i]);
                ew.u16(Math.min(65535, Math.round(log.v1[i])));
                ew.u16(Math.min(65535, Math.round(log.v2[i])));
                ew.u8(log.flags[i]);
                ew.u8(log.d[i] & 255);
                ew.varint(Math.max(0, log.a[i]));
            }
            else if (kind === events_ts_1.EV.REJECT) {
                ew.varint(log.a[i]);
                ew.varint(Math.max(0, log.b[i]));
                ew.u8(log.c[i]);
            }
            else if (kind === events_ts_1.EV.HIJACK) {
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.varint(Math.max(0, log.c[i]));
                ew.u8(log.d[i] & 255);
                ew.u8(log.flags[i]);
            }
            else if (kind === events_ts_1.EV.DEPOSIT_EXHAUSTED)
                ew.varint(Math.max(0, log.a[i]));
            else if (kind === events_ts_1.EV.MATCH_OVER) {
                ew.u8((log.a[i] + 1) & 255);
                ew.u8(log.b[i] & 255);
                ew.u8(log.c[i] & 255);
            }
            else if (kind === events_ts_1.EV.OBJECTIVE_PROGRESS || kind === events_ts_1.EV.OBJECTIVE_DONE || kind === events_ts_1.EV.OBJECTIVE_FAILED) {
                ew.u8(log.a[i] & 255);
                ew.u8(log.b[i] & 255);
                ew.u8(log.c[i] & 255);
                ew.u16(Math.max(0, Math.min(1000, log.d[i])));
                ew.varint(Math.max(0, Math.round(log.v1[i])));
                ew.varint(Math.max(0, Math.round(log.v2[i])));
            }
            else if (kind === events_ts_1.EV.BUILD_STARTED || kind === events_ts_1.EV.BUILD_DONE || kind === events_ts_1.EV.BUILD_ENDED) {
                ew.varint(Math.max(0, log.a[i]));
                ew.u8(log.team[i]);
                ew.varint(Math.max(0, log.b[i]));
                ew.u8(log.c[i] & 255);
                ew.varint(Math.max(0, log.d[i]));
                ew.varint(Math.max(0, Math.round(log.v1[i])));
                ew.varint(Math.max(0, Math.round(log.v2[i])));
            }
            else if (kind === events_ts_1.EV.CALL_QUEUED || kind === events_ts_1.EV.CALL_IMPACT || kind === events_ts_1.EV.CALL_EFFECT) {
                const pq = (0, snapshot_ts_1.posQuantum)(sim.mapSize);
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.u8(log.c[i] & 255);
                ew.varint(Math.max(0, log.d[i]));
                ew.u16(Math.min(65535, Math.round(log.v1[i] / pq)));
                ew.u16(Math.min(65535, Math.round(log.v2[i] / pq)));
                ew.u8(log.flags[i]);
                ew.u8(log.team[i]);
            }
            else if (kind === events_ts_1.EV.CALL_REFUSED) {
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.u8(log.c[i] & 255);
                ew.u8((log.d[i] + 1) & 255);
            }
            else if (kind === events_ts_1.EV.HARVEST_DELIVERED) {
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.varint(log.c[i] + 1);
                ew.varint(Math.max(0, Math.round(log.v1[i])));
            }
            else if (kind === events_ts_1.EV.POINT || kind === events_ts_1.EV.CORE) {
                ew.varint(Math.max(0, log.a[i]));
                ew.u8(log.b[i] & 255);
                ew.u8((log.c[i] + 1) & 255);
                ew.u8((log.d[i] + 1) & 255);
                ew.varint(Math.max(0, log.v1[i]));
            }
            else if (kind === events_ts_1.EV.PLAYER_JOINED || kind === events_ts_1.EV.PLAYER_LEFT) {
                // QA1 fog: every viewer learns who joined / left; the Core the pod lands at (c, x, z) and the entity left behind (d)
                // only the player's team and teams that detect it
                const pq = (0, snapshot_ts_1.posQuantum)(sim.mapSize), own = log.team[i] === vteam;
                const ent = kind === events_ts_1.EV.PLAYER_JOINED ? log.c[i] : log.d[i], see = own || (ent > 0 && sim.isDetectedBy(ent, vteam));
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                if (kind === events_ts_1.EV.PLAYER_JOINED) {
                    ew.svarint(see ? log.c[i] | 0 : 0);
                    ew.svarint(log.d[i] | 0);
                }
                else {
                    ew.svarint(log.c[i] | 0);
                    ew.svarint(see ? log.d[i] | 0 : 0);
                }
                ew.u16(see ? Math.max(0, Math.min(65535, Math.round(log.v1[i] / pq))) : 0);
                ew.u16(see ? Math.max(0, Math.min(65535, Math.round(log.v2[i] / pq))) : 0);
                ew.u8(log.flags[i]);
                ew.u8(log.team[i]);
            }
            else if (kind === events_ts_1.EV.UNIT_DIED || kind === events_ts_1.EV.JAMMER || kind === events_ts_1.EV.DECOY || kind === events_ts_1.EV.SCAN || kind === events_ts_1.EV.SEARCH || (kind >= 125 && kind <= 129)) { /* v22: S15 kinds 125-129 (s15.ts) use this layout */
                const pq = (0, snapshot_ts_1.posQuantum)(sim.mapSize);
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.svarint(log.c[i] | 0);
                ew.svarint(log.d[i] | 0);
                ew.u16(Math.max(0, Math.min(65535, Math.round(log.v1[i] / pq))));
                ew.u16(Math.max(0, Math.min(65535, Math.round(log.v2[i] / pq))));
                ew.u8(log.flags[i]);
                ew.u8(log.team[i]);
            }
            else if (kind === events_ts_1.EV.FORTIFY || kind === events_ts_1.EV.FORWARD_BASE) {
                ew.varint(Math.max(0, log.a[i]));
                ew.u8(log.b[i] & 255);
                ew.u8(log.team[i]);
                ew.varint(log.c[i] + 1);
                ew.varint(log.d[i] + 1);
                ew.varint(Math.max(0, Math.round(log.v1[i])));
            }
            else if (kind === events_ts_1.EV.AIRCRAFT_DOWN || kind === events_ts_1.EV.AIRCRAFT_LANDING || kind === events_ts_1.EV.FERRY || kind === events_ts_1.EV.GROUP || kind === events_ts_1.EV.AUTO_DEFEND) {
                const pq = (0, snapshot_ts_1.posQuantum)(sim.mapSize);
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(kind === events_ts_1.EV.AIRCRAFT_LANDING && log.team[i] !== vteam && !((log.d[i] >> 8) & (1 << vteam)) ? 0 : Math.max(0, log.b[i])); /* QA1: the pad id only to teams that detect the pad */
                ew.varint(Math.max(0, log.c[i]));
                ew.u8(log.flags[i]);
                ew.u16(Math.max(0, Math.min(65535, Math.round(log.v1[i] / pq))));
                ew.u16(Math.max(0, Math.min(65535, Math.round(log.v2[i] / pq))));
            }
            else if (kind === events_ts_1.EV.PILOT_LOST || kind === events_ts_1.EV.PILOT_AVAILABLE || kind === events_ts_1.EV.CREWED || kind === events_ts_1.EV.UNDERCREWED || kind === events_ts_1.EV.CITADEL_PILOTS || kind === events_ts_1.EV.SHELTER || kind === events_ts_1.EV.CREW_DISPATCH) {
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.varint(Math.max(0, log.c[i]));
                ew.varint(Math.max(0, log.d[i]));
                ew.u8(log.flags[i]);
                ew.varint(Math.max(0, Math.round(log.v1[i])));
            } // v22 S14
            else if (kind === events_ts_1.EV.BATTLE_RESULT) {
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.u8(log.c[i] & 255);
                ew.u8(log.d[i] & 255);
                ew.varint(Math.max(0, Math.round(log.v1[i])));
                ew.varint(Math.max(0, Math.round(log.v2[i])));
            }
            else if (kind === events_ts_1.EV.CARGO || kind === events_ts_1.EV.CARGO_LOST) {
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.varint(log.c[i] + 1);
                ew.varint(Math.max(0, log.d[i]));
                ew.u8(log.flags[i]);
            }
            else {
                ew.varint(Math.max(0, log.a[i]));
                ew.varint(Math.max(0, log.b[i]));
                ew.varint(Math.max(0, log.c[i]));
                ew.u8(log.flags[i]);
            }
            if (ew.pos + vsize(n + 1) > evLimit) {
                ew.pos = at;
                evMax = k - 1;
                break;
            } // the rest waits for a later snapshot
            n++;
            prev = k;
        }
        this.evCount = n;
        cur.evMax = evMax;
        return sw.pos + vsize(n) + ew.pos;
    }
    /** v16: AIM keyed records into aw (after the shots on the wire: presentation, only what is left of the cap). */
    buildAims(viewer, base, cur, limit) {
        const sim = this.sim, d = sim.d, vteam = viewer.team;
        this.aw.reset();
        // v16: turret aim (entities in the view within fullSimRadius whose mounts aim at a live target, or a player-aimed seat)
        const as = new Map(), R2 = d.constants.fullSimRadius ** 2;
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.mCount[s] === 0)
                continue;
            const dx = sim.x[s] - viewer.x, dz = sim.z[s] - viewer.z;
            if (dx * dx + dz * dz > R2 || (sim.team[s] !== vteam && !sim.detected(s, vteam)))
                continue;
            let yaw = NaN;
            const cm = sim.ctlMask[s];
            if (cm !== 0) {
                for (let j = 0; j < data_ts_1.MAX_SEATS; j++)
                    if ((cm >> j) & 1) {
                        yaw = j === d.tDriverSeat[sim.etype[s]] ? sim.ctlYaw[s] : sim.gYaw[s * data_ts_1.MAX_SEATS + j];
                        break;
                    }
            }
            else if (sim.ctlOn[s])
                yaw = sim.ctlYaw[s]; // a pilot on foot under direct control
            else if ((yaw = sim.turretYaw(s)) === yaw) { /* F1: the traversing barrel's own yaw */ }
            else {
                let ts = -1;
                for (let m = 0; m < sim.mCount[s]; m++) {
                    const i = s * data_ts_1.MAX_MOUNTS + m;
                    if (sim.mTgtSlot[i] >= 0 && (ts < 0 || !sim.mFixed[i]))
                        ts = sim.mTgtSlot[i];
                }
                if (ts >= 0 && sim.alive[ts])
                    yaw = Math.atan2(sim.z[ts] - sim.z[s], sim.x[ts] - sim.x[s]); // presentation only
            }
            if (yaw !== yaw)
                continue;
            let a = yaw % (Math.PI * 2);
            if (a < 0)
                a += Math.PI * 2;
            const b = new snapshot_ts_1.ByteWriter(6);
            b.varint(sim.eid[s]);
            b.u8(Math.round((a / (Math.PI * 2)) * 256) & 255);
            as.set(sim.eid[s], b.bytes());
        }
        const cap = Math.min(limit + 2, 5 + Math.floor(this.maxBytes * AIM_BUDGET_SHARE));
        let remCost = 2;
        if (base)
            for (const [k] of base.aims)
                if (!as.has(k))
                    remCost += vsize(k);
        if (remCost > cap) {
            this.aw.varint(0);
            this.aw.varint(0);
            cur.aims = new Map(base ? base.aims : []);
            return;
        } // no room: the guest keeps what it has
        this.keyed(as, base ? base.aims : null, cur.aims = new Map(), cap, this.aw); // what is left of the cap, at most a tenth of it
    }
    shotCount = 0;
    /**
     * SHOT events (hitscan rays) logged since the previous snapshot, into xw: those whose muzzle is within
     * fullSimRadius of the viewer and whose shooter the viewer's team can see (own team or detected), oldest first,
     * while they fit in `room` bytes. Each shot is considered once; the rest is dropped (presentation only).
     */
    buildShots(viewer, room) {
        const sim = this.sim, log = sim.events, xw = this.xw, ms = sim.mapSize, R2 = sim.d.constants.fullSimRadius ** 2;
        xw.reset();
        let n = 0, dropped = 0;
        const from = Math.max(this.shotFrom, log.first());
        for (let k = from; k < log.next; k++) {
            const i = log.at(k);
            if (log.kind[i] !== events_ts_1.EV.SHOT)
                continue;
            const dx = log.x0[i] - viewer.x, dz = log.z0[i] - viewer.z;
            if (dx * dx + dz * dz > R2)
                continue;
            if (log.team[i] !== viewer.team) {
                const ss = sim.idToSlot.get(log.a[i]);
                if (ss === undefined || !sim.detected(ss, viewer.team))
                    continue;
            }
            const at = xw.pos;
            xw.varint(log.a[i]);
            xw.u8(log.d[i] & 255);
            xw.u8(log.flags[i]);
            xw.varint(log.b[i]);
            xw.u16((0, snapshot_ts_1.quantPos)(log.x0[i], ms));
            xw.u16((0, snapshot_ts_1.quantPos)(log.z0[i], ms));
            xw.i16((0, snapshot_ts_1.quantY)(log.y0[i]));
            xw.u16((0, snapshot_ts_1.quantPos)(log.x1[i], ms));
            xw.u16((0, snapshot_ts_1.quantPos)(log.z1[i], ms));
            xw.i16((0, snapshot_ts_1.quantY)(log.y1[i]));
            if (xw.pos + vsize(n + 1) > room) {
                xw.pos = at;
                dropped++;
                continue;
            }
            n++;
        }
        this.shotFrom = log.next;
        this.shotCount = n;
        this.shotsSent = n;
        this.shotsDropped = dropped;
    }
    /** Writes a keyed record delta (removals, then changed records while they fit) into sw; fills `hold` with what the guest will have. */
    keyed(now, base, hold, limit, sw = this.sw) {
        const removed = [];
        if (base)
            for (const k of base.keys())
                if (!now.has(k))
                    removed.push(k);
        removed.sort((a, b) => a - b);
        sw.varint(removed.length);
        for (const k of removed)
            sw.varint(k);
        const keys = Array.from(now.keys()).sort((a, b) => a - b);
        const changed = [];
        for (const k of keys) {
            const b = base?.get(k);
            if (!(b && sameBytes(b, now.get(k))))
                changed.push(k);
            else
                hold.set(k, b);
        }
        // records that do not fit stay as the guest has them (sent later)
        let used = sw.pos + 5;
        const send = [];
        for (const k of changed) {
            const len = now.get(k).length;
            if (used + len <= limit) {
                used += len;
                send.push(k);
            }
            else {
                const b = base?.get(k);
                if (b)
                    hold.set(k, b);
            }
        }
        sw.varint(send.length);
        for (const k of send) {
            sw.raw(now.get(k));
            hold.set(k, now.get(k));
        }
    }
    pilotBytes(p) {
        const sim = this.sim, d = sim.d, cr = d.crew, pt = d.pilotType, w = new snapshot_ts_1.ByteWriter(24);
        const s = p.state === 1 || p.state === 3 ? sim.idToSlot.get(p.entity) : undefined;
        const hp = s !== undefined ? sim.hp[s] : p.state === 0 || p.state === 4 ? p.hp : 0, sh = s !== undefined ? sim.shield[s] : p.state === 0 || p.state === 4 ? p.shield : 0; // v32: ruling 121 sheltered (state 4)
        const en = s !== undefined ? sim.energy[s] : p.energy, jet = s !== undefined ? sim.jetFuel[s] : p.jet;
        w.varint(p.id);
        w.u8(p.state);
        w.varint(p.state === 0 || p.state === 4 ? p.vehicle : p.state === 1 || p.state === 3 ? p.entity : 0);
        w.u8(p.seat >= 0 ? p.seat : 255);
        w.u8(Math.min(255, Math.ceil((Math.max(0, hp) / sim.pilotMaxHp(sim.pilots.get(p.id) ?? { player: -1 })) * 255)));
        w.u8(d.tShield[pt] > 0 ? Math.ceil((Math.max(0, sh) / d.tShield[pt]) * 255) : 0);
        w.u8(cr.energyMax > 0 ? Math.ceil((Math.max(0, en) / cr.energyMax) * 255) : 0);
        w.u8(cr.jetFreeBurnSeconds > 0 ? Math.min(255, Math.round((jet / cr.jetFreeBurnSeconds) * 255)) : 0);
        w.varint(p.state === 2 ? Math.max(0, p.respawnTick - sim.tick) : p.state === 3 ? (0, pilotkit_ts_1.kitDownedLeft)(sim, p.id) : 0);
        w.u8(s !== undefined ? sim.airborne[s] : 0);
        // hijack in progress (CONTRACTS rev 4): vehicle id (0 none) and progress, 1/255 of pilot.hackVehicleSeconds
        const ht = cr.hackTicks;
        w.varint(p.hackVehicle);
        w.u8(p.hackVehicle !== 0 && ht > 0 ? Math.min(255, Math.floor(((sim.tick - p.hackStart) / ht) * 255)) : 0);
        // v5 (client slice 3b): cooldowns of the viewer's own station's weapons
        const vs = p.state === 1 ? s : p.state === 0 ? sim.idToSlot.get(p.vehicle) : undefined;
        const list = this.stationMounts;
        list.length = 0;
        if (vs !== undefined) {
            const t = sim.etype[vs], tb = t * data_ts_1.MAX_MOUNTS, mc = sim.mCount[vs], drv = p.state === 0 && p.seat === d.tDriverSeat[t];
            for (let m = 0; m < mc; m++) {
                const j = d.tMountCrewSeat[tb + m];
                const mine = p.state === 1 || j === p.seat || (drv && j >= 0 && d.tSeatRole[t * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_GUNNER && sim.occ[vs * data_ts_1.MAX_SEATS + j] === 0);
                if (mine)
                    list.push(m);
            }
        }
        w.u8(list.length);
        for (const m of list) {
            const ci = vs * data_ts_1.MAX_MOUNTS + m, wi = sim.mWeapon[ci], per = d.wPeriod[wi], cd = sim.cooldown[ci];
            w.u8(m);
            w.varint(wi);
            w.u8(p.state === 1 ? 255 : d.tMountCrewSeat[sim.etype[vs] * data_ts_1.MAX_MOUNTS + m] & 255);
            w.u8(per > 0 && cd > 0 ? Math.min(255, Math.ceil((cd / per) * 255)) : 0);
        }
        (0, pilotkit_ts_1.kitPilotBytes)(sim, p.id, s, w); // v14: S12 pilot kit tail (pilotkit.ts)
        w.u16(sim.pilotShotCount(p.id)); // v16: own station's shots (recoil)
        const li = sim.lastControlInput(p.id);
        w.varint(li ? li.clientSeq : 0);
        w.varint(li ? li.tick : 0); // v16: own-pilot prediction
        // v29 (ruling 112): the own driven hover vehicle, exact (the guest's prediction replays its inputs from it)
        if (vs !== undefined && p.state === 0 && p.seat === d.tDriverSeat[sim.etype[vs]] && (d.tHover[sim.etype[vs]] === 1 || d.tWalk[sim.etype[vs]] === 1) && d.tAir[sim.etype[vs]] !== 1) { // W1: walkers too; Frontline: not the helicopter-handling gunship
            w.u8(1);
            w.f64(sim.x[vs]);
            w.f64(sim.z[vs]);
            w.f64(sim.dirX[vs]);
            w.f64(sim.dirZ[vs]);
            w.f64(sim.velX[vs]);
            w.f64(sim.velZ[vs]);
            w.f64(sim.hopH[vs]);
            w.f64(sim.velY[vs]);
            w.varint(Math.max(0, sim.hopReady[vs] - (sim.tick + 1)));
            w.f64(sim.boostM[vs]);
            w.u8(sim.boostOn[vs]);
        }
        else
            w.u8(0);
        return w.bytes();
    }
    queueBytes(q) {
        const sim = this.sim, w = new snapshot_ts_1.ByteWriter(32);
        w.varint(q.building);
        w.u8(q.items.length);
        for (const it of q.items)
            w.u8(it.type);
        const bt = q.items.length ? sim.buildTicks(q.items[0].type) : 0;
        w.u8(q.started && bt > 0 ? Math.min(255, Math.floor((q.progress / bt) * 255)) : 0);
        w.u8(q.hold);
        w.u8((q.started ? 1 : 0) | (q.rally ? 2 : 0));
        if (q.rally) {
            w.u16((0, snapshot_ts_1.quantPos)(q.rallyX, sim.mapSize));
            w.u16((0, snapshot_ts_1.quantPos)(q.rallyZ, sim.mapSize));
        }
        return w.bytes();
    }
    setTarget(cur, i, k) {
        cur.ids[i] = this.tIds[k];
        cur.type[i] = this.tType[k];
        cur.flags[i] = this.tFlags[k];
        cur.qx[i] = this.tQx[k];
        cur.qz[i] = this.tQz[k];
        cur.head[i] = this.tHead[k];
        cur.hp[i] = this.tHp[k];
        cur.sh[i] = this.tSh[k];
        cur.stamp[i] = this.tStamp[k];
        cur.crew[i] = this.tCrew[k];
        cur.alt[i] = this.tAlt[k];
        cur.vy[i] = this.tVy[k];
    }
}
exports.SnapshotEncoder = SnapshotEncoder;
function sameBytes(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (a[i] !== b[i])
            return false;
    return true;
}
function copyEntry(dst, i, src, j) {
    dst.ids[i] = src.ids[j];
    dst.type[i] = src.type[j];
    dst.flags[i] = src.flags[j];
    dst.qx[i] = src.qx[j];
    dst.qz[i] = src.qz[j];
    dst.head[i] = src.head[j];
    dst.hp[i] = src.hp[j];
    dst.sh[i] = src.sh[j];
    dst.stamp[i] = src.stamp[j];
    dst.crew[i] = src.crew[j];
    dst.alt[i] = src.alt[j];
    dst.vy[i] = src.vy[j];
}
function makeEntity(id, type, qflags, qx, qz, qhead, qhp, qsh, ms, crew = 0, qalt = 0, qvy = 0) {
    return {
        id, type, team: qflags & 7, flags: qflags & ~7, x: qx * (0, snapshot_ts_1.posQuantum)(ms), z: qz * (0, snapshot_ts_1.posQuantum)(ms),
        heading: (qhead / 256) * Math.PI * 2, hp: qhp / 255, shield: qsh / 255, qx, qz, qhead, qhp, qsh, qflags,
        hullFraction: qhp / 255, hullCritical: (qflags & exports.FLAG_CRITICAL) !== 0, driverless: (qflags & exports.FLAG_DRIVERLESS) !== 0,
        shieldHit: (qflags & exports.FLAG_SHIELD_HIT) !== 0, crouched: (qflags & exports.FLAG_CROUCHED) !== 0,
        prone: (crew & exports.CREW_PRONE) !== 0, stanceChanging: (crew & exports.CREW_STANCE_CHANGING) !== 0, crew, underConstruction: (crew & exports.CREW_BUILDING) !== 0, altitude: qalt / exports.ALT_Q, qalt, vy: qvy / exports.VY_Q, qvy,
    };
}
/**
 * Guest-side decoder. apply() returns the decoded view, or null if it cannot be used: a delta whose baseline is
 * unknown (wait for a keyframe), or a snapshot of an older stream epoch (`stale` counts them).
 *
 * Host handover rule (CONTRACTS rev 4; part of the API): every snapshot carries the stream epoch; the new host's
 * stream has a higher epoch and starts with keyframes. On the first keyframe of a newer epoch the decoder drops
 * every baseline view (seqs restart in the new epoch's range), keeps the event dedupe set except serials at or
 * after the keyframe's epoch serial (the first event the new host generated itself: events the guest saw from an
 * abandoned timeline after the saved state may be replaced), and continues. Deltas of a newer epoch before its first
 * keyframe, and anything of an older epoch, return null. A guest keeps ONE decoder across a handover: it then gets
 * every unacknowledged event exactly once (serials continue across the handover). Acks must carry SnapshotView.epoch.
 */
class SnapshotDecoder {
    mapSize;
    views = new Map();
    newest = 0;
    /** Current stream epoch (-1 before the first snapshot); epoch changes seen; snapshots of older epochs refused. */
    epoch = -1;
    epochChanges = 0;
    stale = 0;
    /** Event serials already delivered (dedupe of resent events); pruned below the newest serial - 65536. */
    seen = new Set();
    maxSerial = 0;
    constructor(mapSize) { this.mapSize = mapSize; }
    apply(bytes) {
        const r = new snapshot_ts_1.ByteReader(bytes), ms = this.mapSize, pq = (0, snapshot_ts_1.posQuantum)(ms);
        const version = r.u8();
        if (version !== exports.SNAPSHOT_VERSION)
            throw new Error(`snapshot version ${version}`);
        const kind = r.u8(), tick = r.u32(), seq = r.u32();
        let ents, projs;
        let base;
        const baseSeq = kind === 1 ? r.u32() : 0;
        const epoch = r.varint(), epochSerial = kind === 1 ? 0 : r.varint();
        if (this.epoch >= 0 && epoch !== this.epoch) {
            if (((epoch - this.epoch) >>> 0) >= 0x80000000) {
                this.stale++;
                return null;
            } // an older stream (in flight from the old host)
            if (kind !== 0)
                return null; // a newer stream: wait for its keyframe
            this.views.clear();
            this.newest = 0;
            this.epochChanges++;
            for (const v of Array.from(this.seen))
                if (v >= epochSerial)
                    this.seen.delete(v);
            this.maxSerial = 0;
            for (const v of this.seen)
                if (v > this.maxSerial)
                    this.maxSerial = v;
        }
        this.epoch = epoch;
        if (kind === 1) {
            base = this.views.get(baseSeq);
            if (!base)
                return null;
            ents = new Map(base.entities);
            projs = new Map(base.projectiles);
        }
        else {
            ents = new Map();
            projs = new Map();
        }
        let id = 0;
        const nRem = r.varint();
        for (let i = 0; i < nRem; i++) {
            id += r.varint();
            ents.delete(id);
        }
        const nRec = r.varint();
        id = 0;
        for (let i = 0; i < nRec; i++) {
            id += r.varint();
            const m = r.u8();
            if (m & M_NEW) {
                const type = r.u8(), f = r.u8(), qx = r.u16(), qz = r.u16(), qh = r.u8(), qhp = r.u8(), qsh = r.u8();
                const crew = m & M_CREW ? r.u16() : 0, qalt = m & M_ALT ? r.svarint() : 0, qvy = m & M_ALT ? r.svarint() : 0;
                ents.set(id, makeEntity(id, type, f, qx, qz, qh, qhp, qsh, ms, crew, qalt, qvy));
                continue;
            }
            const b = ents.get(id);
            if (!b)
                throw new Error(`delta for unknown entity ${id}`);
            let f = b.qflags, qx = b.qx, qz = b.qz, qh = b.qhead, qhp = b.qhp, qsh = b.qsh, crew = b.crew, qalt = b.qalt, qvy = b.qvy;
            if (m & M_FLAGS)
                f = r.u8();
            if (m & M_POS) {
                qx += r.svarint();
                qz += r.svarint();
            }
            if (m & M_HEAD)
                qh = r.u8();
            if (m & M_HP)
                qhp = r.u8();
            if (m & M_SH)
                qsh = r.u8();
            if (m & M_CREW)
                crew = r.u16();
            if (m & M_ALT) {
                qalt = r.svarint();
                qvy = r.svarint();
            }
            ents.set(id, makeEntity(id, b.type, f, qx, qz, qh, qhp, qsh, ms, crew, qalt, qvy));
        }
        id = 0;
        const pRem = r.varint();
        for (let i = 0; i < pRem; i++) {
            id += r.varint();
            projs.delete(id);
        }
        const pNew = r.varint();
        id = 0;
        for (let i = 0; i < pNew; i++) {
            id += r.varint();
            const weapon = r.u8(), team = r.u8(), age = r.varint();
            const x0 = r.u16() * pq, z0 = r.u16() * pq, y0 = r.i16() / 4;
            const vx = r.i16() / 10, vy = r.i16() / 10, vz = r.i16() / 10, shooter = r.varint();
            projs.set(id, { id, weapon, team, launchTick: tick - age, x0, y0, z0, vx, vy, vz, shooter });
        }
        // side sections
        let pilot = base ? base.pilot : null, team = base ? base.team : null;
        if (r.u8() === 1) {
            pilot = { id: r.varint(), state: r.u8(), entity: r.varint(), seat: ((s) => (s === 255 ? -1 : s))(r.u8()), hp: r.u8() / 255, shield: r.u8() / 255, energy: r.u8() / 255, jet: r.u8() / 255, respawnTicks: r.varint(), airborne: r.u8(), hijackVehicle: r.varint(), hijackProgress: r.u8() / 255, weapons: [], kit: null, shots: 0, inputSeq: 0, inputTick: 0, ride: null };
            for (let i = 0, n = r.u8(); i < n; i++) {
                const mount = r.u8(), weapon = r.varint(), seat = r.u8();
                pilot.weapons.push({ mount, weapon, seat: seat === 255 ? -1 : seat, cooldown: r.u8() / 255 });
            }
            pilot.kit = (0, pilotkit_ts_1.kitPilotDecode)(r);
            pilot.shots = r.u16();
            pilot.inputSeq = r.varint();
            pilot.inputTick = r.varint();
            pilot.ride = r.u8() === 1 ? { x: r.f64(), z: r.f64(), dirX: r.f64(), dirZ: r.f64(), vx: r.f64(), vz: r.f64(), hopH: r.f64(), vy: r.f64(), hopLeft: r.varint(), boostM: r.f64(), boostOn: r.u8() } : null;
        }
        if (r.u8() === 1) {
            const ore = r.varint(), gas = r.varint();
            team = { ore, gas, cpUsed: 0, cpBudget: 0, pilots: { available: r.varint(), assigned: r.varint(), onFoot: r.varint(), lost: r.varint(), initial: r.varint(), gained: r.varint() } };
        }
        let points = base ? base.points : null;
        if (r.u8() === 1) {
            const pl = [];
            for (let i = 0, n = r.varint(); i < n; i++) {
                const o1 = r.u8();
                if (o1 === 255) {
                    pl.push({ index: i, seen: false, owner: -1, captureTeam: -1, captureProgress: 0, flags: 0, supplied: false, contested: false, underAttack: false, hacking: false, fortification: 0, hackProgress: 0 });
                    continue;
                } // v22 ruling 87: not seen now (the client shows its last-known state)
                const owner = o1 - 1, captureTeam = r.u8() - 1, captureProgress = r.u8() / 255, flags = r.u8(), fortification = r.u8(), hackProgress = r.u8() / 255;
                pl.push({ index: i, seen: true, owner, captureTeam, captureProgress, flags, supplied: (flags & 1) !== 0, contested: (flags & 2) !== 0, underAttack: (flags & 4) !== 0, hacking: (flags & 8) !== 0, fortification, hackProgress });
            }
            const teams = [];
            for (let t = 0, nt = r.u8(); t < nt; t++)
                teams.push({ cpBudget: 0, momentum: r.u8() / 255 }); // v22: cpBudget always 0
            const cores = [];
            for (let i = 0, nc = r.varint(); i < nc; i++) {
                const id = r.varint(), disabledUntil = r.varint(), hackProgress = r.u8() / 255, team = r.u8(), x = r.u16() * pq, z = r.u16() * pq;
                cores.push({ id, disabledUntil, disabled: disabledUntil > tick, hackProgress, team, x, z });
            }
            const fortify = [];
            for (let i = 0, nj = r.varint(); i < nj; i++) {
                const point = r.varint(), team = r.u8(), level = r.u8(), progress = r.u8() / 255, stage = r.u8(), ticksLeft = r.varint();
                fortify.push({ point, team, level, progress, stage, ticksLeft });
            }
            points = { points: pl, teams, cores, fortify };
        }
        let mining = base ? base.mining : null;
        if (r.u8() === 1) {
            const deposits = [];
            for (let i = 0, n = r.varint(); i < n; i++)
                deposits.push(r.varint());
            const oreCap = r.varint(), gasCap = r.varint();
            const harvesters = [];
            for (let i = 0, n = r.varint(); i < n; i++) {
                const id = r.varint(), ph = r.u8(), load = r.u8() / 255, deposit = r.varint() - 1, dropOff = r.varint(), dock = r.u8() - 1, queue = r.u8();
                harvesters.push({ id, phase: ph & 127, manual: (ph & 128) !== 0, load, deposit, dropOff, dock, queue });
            }
            mining = { deposits, oreCap, gasCap, harvesters };
        }
        let match = base ? base.match : null;
        if (r.u8() === 1) {
            const phase = r.u8(), winner = r.u8() - 1, overTick = r.varint(), eliminated = r.u8();
            const reason = r.u8(), objectives = [];
            for (let i = 0, n = r.u8(); i < n; i++) {
                const type = r.u8(), st = r.u8(), team = r.u8(), progress = r.u16() / 1000, value = r.varint(), goal = r.varint(), timerSeconds = r.varint();
                objectives.push({ type: objectives_ts_1.OBJ_TYPES[type], status: st & 127, side: (st & 128) !== 0, team, progress, value, goal, timerSeconds });
            }
            match = { phase, over: phase === 1, winner, overTick, eliminated, reason, objectives };
        }
        let weather = base ? base.weather : null;
        if (r.u8() === 1) {
            const cw = r.u8() - 1, endsTick = r.varint(), nw = r.u8() - 1, startsTick = r.varint();
            weather = { current: cw, endsTick, next: nw, startsTick };
        }
        let groups = base ? base.groups : null;
        if (r.u8() === 1) {
            const gq = (0, snapshot_ts_1.posQuantum)(this.mapSize);
            groups = [];
            for (let i = 0, n = r.u8(); i < n; i++) {
                const label = r.u8(), order = battlegroups_ts_1.GROUP_ORDER_NAMES[r.u8()] ?? "none", reinforce = r.u8() === 1, leg = r.u8(), target = r.varint(), peak = r.varint();
                const members = [];
                for (let j = 0, m = r.u8(); j < m; j++)
                    members.push(r.varint());
                const route = [];
                for (let j = 0, m = r.u8(); j < m; j++)
                    route.push([r.u16() * gq, r.u16() * gq]);
                groups.push({ label, order, reinforce, leg, target, peak, members, route });
            }
        }
        let construction = base ? base.construction : null;
        if (r.u8() === 1) {
            const sites = [], points = [];
            for (let i = 0, n = r.varint(); i < n; i++) {
                const id = r.varint(), team = r.u8(), type = r.varint(), point = r.u8(), x = r.u16() * pq, z = r.u16() * pq, progress = r.u8() / 255, entity = r.varint(), builder = r.varint(), yaw = r.varint() - 1;
                sites.push({ id, team, type, point, x, z, progress, entity, builder, yaw });
            }
            for (let i = 0, n = r.varint(); i < n; i++)
                points.push({ slots: r.u8(), defenceSlots: r.u8(), used: r.u8(), free: r.u8(), freeDefence: r.u8(), freeGeysers: r.u8() });
            construction = { sites, points };
        }
        let calls = base ? base.calls : null;
        if (r.u8() === 1) {
            const own = [], beacons = [];
            for (let i = 0, n = r.u8(); i < n; i++) {
                const call = r.u8(), readyTick = r.varint(), reason = r.u8(), usesLeft = r.u8();
                own.push({ call, readyTick, cooldownTicks: Math.max(0, readyTick - tick), available: reason === 0, reason, usesLeft });
            }
            const slots = r.u8(), heavyWeapon = r.u8() - 1;
            for (let i = 0, n = r.varint(); i < n; i++) {
                const id = r.varint(), call = r.u8(), team = r.u8(), x = r.u16() * pq, z = r.u16() * pq, impactTick = r.varint(), f = r.u8(), caller = r.varint();
                const thrown = (f & 2) !== 0, y = thrown ? r.i16() / 8 : null, att = thrown ? r.varint() : 0;
                beacons.push({ id, call, team, x, z, impactTick, ticksToImpact: Math.max(0, impactTick - tick), merged: (f & 1) !== 0, caller, thrown, y, att });
            }
            const zones = [];
            for (let i = 0, n = r.varint(); i < n; i++) {
                const beacon = r.varint(), call = r.u8(), team = r.u8(), x = r.u16() * pq, z = r.u16() * pq, dirYaw = r.u8() * (2 * Math.PI / 256), endTick = r.varint(), value = r.varint();
                zones.push({ beacon, call, team, x, z, dirYaw, endTick, value });
            }
            const thrown = [];
            for (let i = 0, n = r.varint(); i < n; i++) {
                const id = r.varint(), call = r.u8(), team = r.u8(), caller = r.varint(), x = r.u16() * pq, z = r.u16() * pq, y = r.i16() / 8, vx = r.i16() / 32, vy = r.i16() / 32, vz = r.i16() / 32, f = r.u8();
                thrown.push({ id, call, team, caller, x, y, z, vx, vy, vz, rolling: (f & 3) === 1, bounces: (f >> 2) & 31, fired: (f & 128) !== 0 });
            }
            calls = { own, beacons, slots, heavyWeapon, zones, thrown };
        }
        const queues = new Map(base ? base.queues : []);
        for (let i = 0, nr = r.varint(); i < nr; i++)
            queues.delete(r.varint());
        for (let i = 0, nc = r.varint(); i < nc; i++) {
            const building = r.varint(), ni = r.u8(), items = [];
            for (let k = 0; k < ni; k++)
                items.push(r.u8());
            const progress = r.u8() / 255, hold = r.u8(), bits = r.u8();
            const rally = bits & 2 ? [r.u16() * pq, r.u16() * pq] : null;
            queues.set(building, { building, items, progress, hold, started: (bits & 1) !== 0, rally });
        }
        const players = new Map(base ? base.players : []);
        for (let i = 0, nr = r.varint(); i < nr; i++)
            players.delete(r.varint());
        for (let i = 0, nc = r.varint(); i < nc; i++) {
            const pilotId = r.varint(), player = r.u8(), state = r.u8(), entity = r.varint(), seat = r.u8();
            players.set(pilotId, { pilotId, player, state, entity, seat: seat === 255 ? -1 : seat });
        }
        const orders = new Map(base ? base.orders : []);
        for (let i = 0, nr = r.varint(); i < nr; i++)
            orders.delete(r.varint());
        for (let i = 0, nc = r.varint(); i < nc; i++) {
            const id = r.varint(), kind = r.u8(), f = r.u8(), target = r.varint();
            orders.set(id, { id, kind, formation: f & 63, holdFire: (f & 128) !== 0, target, targetIsPilot: (f & 64) !== 0 });
        }
        const decoys = new Map(base ? base.decoys : []);
        for (let i = 0, nr = r.varint(); i < nr; i++)
            decoys.delete(r.varint());
        for (let i = 0, nc = r.varint(); i < nc; i++) {
            const id = r.varint(), team = r.u8(), type = r.u8(), x = r.u16() * pq, z = r.u16() * pq;
            decoys.set(id, { id, team, type, x, z });
        }
        const ammo = new Map(base ? base.ammo : []), downed = new Map(base ? base.downed : []), gasFloor = new Map(base ? base.gasFloor : []), lasers = new Map(base ? base.lasers : []), boosts = new Map(base ? base.boosts : []);
        for (let i = 0, nr = r.varint(); i < nr; i++)
            (0, s15_ts_1.extRemove)(r.varint(), ammo, downed, gasFloor, lasers, boosts);
        for (let i = 0, nc = r.varint(); i < nc; i++)
            (0, s15_ts_1.extDecode)(r.varint(), r, ammo, downed, gasFloor, lasers, boosts);
        const events = [];
        let serial = 0;
        for (let i = 0, ne = r.varint(); i < ne; i++) {
            serial = i === 0 ? r.varint() : serial + r.varint();
            const k = r.u8();
            const e = { serial, kind: k, a: 0, b: 0, c: 0, d: 0, v1: 0, v2: 0, flags: 0 };
            if (k === events_ts_1.EV.HIT || k === events_ts_1.EV.DAMAGE_TAKEN) {
                e.a = r.varint();
                e.v1 = r.u16();
                e.v2 = r.u16();
                e.flags = r.u8();
                e.d = r.u8();
                e.b = r.varint();
            }
            else if (k === events_ts_1.EV.REJECT) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.u8();
            }
            else if (k === events_ts_1.EV.HIJACK) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.varint();
                e.d = r.u8();
                e.flags = r.u8();
            }
            else if (k === events_ts_1.EV.DEPOSIT_EXHAUSTED)
                e.a = r.varint();
            else if (k === events_ts_1.EV.MATCH_OVER) {
                e.a = r.u8() - 1;
                e.b = r.u8();
                e.c = r.u8();
            }
            else if (k === events_ts_1.EV.OBJECTIVE_PROGRESS || k === events_ts_1.EV.OBJECTIVE_DONE || k === events_ts_1.EV.OBJECTIVE_FAILED) {
                e.a = r.u8();
                e.b = r.u8();
                e.c = r.u8();
                e.d = r.u16();
                e.v1 = r.varint();
                e.v2 = r.varint();
            }
            else if (k === events_ts_1.EV.BUILD_STARTED || k === events_ts_1.EV.BUILD_DONE || k === events_ts_1.EV.BUILD_ENDED) {
                e.a = r.varint();
                e.flags = r.u8();
                e.b = r.varint();
                e.c = r.u8();
                e.d = r.varint();
                e.v1 = r.varint();
                e.v2 = r.varint();
            }
            else if (k === events_ts_1.EV.CALL_QUEUED || k === events_ts_1.EV.CALL_IMPACT || k === events_ts_1.EV.CALL_EFFECT) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.u8();
                e.d = r.varint();
                e.v1 = r.u16() * pq;
                e.v2 = r.u16() * pq;
                e.flags = r.u8();
                e.team = r.u8();
            }
            else if (k === events_ts_1.EV.CALL_REFUSED) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.u8();
                e.d = r.u8() - 1;
            }
            else if (k === events_ts_1.EV.HARVEST_DELIVERED) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.varint() - 1;
                e.v1 = r.varint();
            }
            else if (k === events_ts_1.EV.POINT || k === events_ts_1.EV.CORE) {
                e.a = r.varint();
                e.b = r.u8();
                e.c = r.u8() - 1;
                e.d = r.u8() - 1;
                e.v1 = r.varint();
            }
            else if (k === events_ts_1.EV.UNIT_DIED || k === events_ts_1.EV.PLAYER_JOINED || k === events_ts_1.EV.PLAYER_LEFT || k === events_ts_1.EV.JAMMER || k === events_ts_1.EV.DECOY || k === events_ts_1.EV.SCAN || k === events_ts_1.EV.SEARCH || (k >= 125 && k <= 129)) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.svarint();
                e.d = r.svarint();
                e.v1 = r.u16() * pq;
                e.v2 = r.u16() * pq;
                e.flags = r.u8();
                e.team = r.u8();
            }
            else if (k === events_ts_1.EV.FORTIFY || k === events_ts_1.EV.FORWARD_BASE) {
                e.a = r.varint();
                e.b = r.u8();
                e.team = r.u8();
                e.c = r.varint() - 1;
                e.d = r.varint() - 1;
                e.v1 = r.varint();
            }
            else if (k === events_ts_1.EV.AIRCRAFT_DOWN || k === events_ts_1.EV.AIRCRAFT_LANDING || k === events_ts_1.EV.FERRY || k === events_ts_1.EV.GROUP || k === events_ts_1.EV.AUTO_DEFEND) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.varint();
                e.flags = r.u8();
                e.v1 = r.u16() * pq;
                e.v2 = r.u16() * pq;
            }
            else if (k === events_ts_1.EV.PILOT_LOST || k === events_ts_1.EV.PILOT_AVAILABLE || k === events_ts_1.EV.CREWED || k === events_ts_1.EV.UNDERCREWED || k === events_ts_1.EV.CITADEL_PILOTS || k === events_ts_1.EV.SHELTER || k === events_ts_1.EV.CREW_DISPATCH) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.varint();
                e.d = r.varint();
                e.flags = r.u8();
                e.v1 = r.varint();
            } // v22 S14
            else if (k === events_ts_1.EV.BATTLE_RESULT) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.u8();
                e.d = r.u8();
                e.v1 = r.varint();
                e.v2 = r.varint();
                e.flags = e.d;
            }
            else if (k === events_ts_1.EV.CARGO || k === events_ts_1.EV.CARGO_LOST) {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.varint() - 1;
                e.d = r.varint();
                e.flags = r.u8();
            }
            else {
                e.a = r.varint();
                e.b = r.varint();
                e.c = r.varint();
                e.flags = r.u8();
            }
            if (this.seen.has(serial))
                continue;
            this.seen.add(serial);
            if (serial > this.maxSerial)
                this.maxSerial = serial;
            events.push(e);
        }
        if (this.seen.size > 4096)
            for (const v of Array.from(this.seen))
                if (v < this.maxSerial - 65536)
                    this.seen.delete(v);
        const shots = [];
        for (let i = 0, ns = r.varint(); i < ns; i++) {
            const shooter = r.varint(), weapon = r.u8(), flags = r.u8(), target = r.varint();
            const x0 = r.u16() * pq, z0 = r.u16() * pq, y0 = r.i16() / 4, x1 = r.u16() * pq, z1 = r.u16() * pq, y1 = r.i16() / 4;
            shots.push({ shooter, weapon, flags, target, x0, y0, z0, x1, y1, z1 });
        }
        const aims = new Map(base ? base.aims : []);
        for (let i = 0, nr = r.varint(); i < nr; i++)
            aims.delete(r.varint());
        for (let i = 0, nc = r.varint(); i < nc; i++) {
            const id = r.varint();
            aims.set(id, (r.u8() / 256) * Math.PI * 2);
        }
        if (!r.done())
            throw new Error(`snapshot trailing bytes: read ${r.pos} of ${bytes.length}`);
        const view = { seq, tick, keyframe: kind === 0, bytes: bytes.length, epoch, shots, entities: ents, projectiles: projs, pilot, team, points, mining, match, weather, groups, construction, calls, queues, players, orders, aims, decoys, ammo, downed, gasFloor, lasers, boosts, events };
        this.views.set(seq, view);
        if (seq > this.newest)
            this.newest = seq;
        for (const k of Array.from(this.views.keys()))
            if (k <= this.newest - exports.SNAPSHOT_RING)
                this.views.delete(k);
        return view;
    }
}
exports.SnapshotDecoder = SnapshotDecoder;
/** Decodes a single keyframe without any history (tools / tests). */
function decodeSnapshot(bytes, mapSize) {
    const v = new SnapshotDecoder(mapSize).apply(bytes);
    if (!v)
        throw new Error("decodeSnapshot: not a keyframe (delta needs its baseline; use SnapshotDecoder)");
    return v;
}
/** Projectile position at a tick, as the client computes it from the launch record. */
function projectileAtTick(p, tick, dt, gravity, ballistic) {
    const t = (tick - p.launchTick) * dt;
    return [p.x0 + p.vx * t, p.y0 + p.vy * t - (ballistic ? 0.5 * gravity * t * t : 0), p.z0 + p.vz * t];
}
