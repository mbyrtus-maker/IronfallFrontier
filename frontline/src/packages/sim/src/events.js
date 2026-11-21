"use strict";
// Event log: what happened during the recent steps, for clients and the snapshot stream (hit markers,
// shield hits, rejections, enter / exit / eject, deaths, production). A bounded ring with a global serial
// number per event: readers keep the last serial they consumed. It is OUTPUT, not simulation state: the
// sim never reads it, so it is neither hashed nor exported (like per-guest snapshot baselines). After a
// restore the log starts empty; the restored sim then logs exactly the events the original would have.
// No allocation per event (struct of arrays, grown only when the ring is too small for one step).
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventLog = exports.F_SHOT_GROUND = exports.F_SHOT_HIT = exports.F_RIDER = exports.F_CRITICAL = exports.F_PLAYER = exports.F_HIJACK = exports.F_SHIELD = exports.F_FRIENDLY = exports.F_PILOT_KILL = exports.F_KILLED = exports.F_AUTO_EJECT = exports.EV = void 0;
/** Event kinds. Field meaning per kind (team is always the team the event concerns). */
exports.EV = {
    /** a shooter entity, b target entity, c shooter pilot id (0 = AI / no pilot), d weapon index, v1 hull damage, v2 shield damage; flags F_* */
    HIT: 1,
    /** a input seq, b subject id (pilot, building or entity), c reason code (reasonCode), d input kind (ACT_* or 0 for orders / controls) */
    REJECT: 2,
    /** a pilot, b vehicle, c seat, flags F_HIJACK when the vehicle changed team */
    ENTER: 3,
    /** a pilot, b vehicle, c new on-foot entity */
    EXIT: 4,
    /** a pilot, b vehicle, c new on-foot entity (one event per occupant thrown out); flags F_PLAYER, F_AUTO_EJECT (ruling 34: the vehicle was destroyed) */
    EJECT: 5,
    /** a pilot, b vehicle it died in (0 = on foot), c entity it died as (0 = seated); flags F_PLAYER */
    PILOT_DEATH: 6,
    /** a building, b first new entity, c unit type index, d squad id */
    PRODUCED: 7,
    /** a pilot, b new entity, c building */
    RESPAWN: 8,
    /** a vehicle: hull reached zero, critical window started (d = ticks until destruction) */
    CRITICAL: 9,
    /** a vehicle destroyed at the end of its critical window */
    DESTROYED: 10,
    /** a AI pilot, b home building it despawned into */
    RETURNED: 11,
    /** a pilot, b vehicle, c from seat, d to seat */
    SEAT: 12,
    /** a building, b unit type index, c queue length after; flags 1 = started (cost paid), 2 = cancelled (refund v1 ore, v2 gas) */
    QUEUE: 13,
    /**
     * A hitscan shot (CONTRACTS rev 4 / client slice 2: guests draw them): a shooter entity, b entity hit (0 = none),
     * c shooter pilot id, d weapon index; flags F_SHOT_HIT / F_SHOT_GROUND; x0..z0 the muzzle, x1..z1 where the ray ended.
     */
    SHOT: 14,
    /**
     * Hijack of an empty enemy vehicle (CONTRACTS rev 4, 5 s of contact): a pilot, b vehicle, c ticks (needed when
     * started; of contact so far when interrupted), d phase 0 started / 1 interrupted / 2 completed (an ENTER with
     * F_HIJACK follows); flags: started / completed F_PLAYER; interrupted: 1 out of reach, 2 damaged, 4 vehicle
     * boarded / changed team / critical / gone, 8 no seat.
     */
    HIJACK: 15,
    /** Snapshot wire / decoder only (never in the log): a HIT whose target is the viewer's own pilot or the vehicle it sits in (payload as HIT). */
    DAMAGE_TAKEN: 16,
    /**
     * Strategic points (points.ts): a point index, b phase (PE_*: 0 capture started, 1 contested, 2 captured, 3 supply lost,
     * 4 supply restored, 5 hack started, 6 hack stopped, 7 capture progress fully decayed), c team (the capturing / new /
     * supplied team; -1 none), d other team (previous owner; -1 neutral / none), v1 pilot id (hack phases; 0 otherwise).
     * Sent to every viewer.
     */
    POINT: 17,
    /**
     * Command Core hack (ruling 29; points.ts CE_*): a Core entity id, b phase (0 hack started, 1 hack stopped, 2 disabled,
     * 3 restored), c the Core's team, d the hacking team (-1 none), v1 pilot id (0 for restored). Sent to every viewer.
     */
    CORE: 18,
    /** Mining (mining.ts): a deposit index ran dry. Sent to every viewer. */
    DEPOSIT_EXHAUSTED: 19,
    /** Mining: a harvester finished unloading. a harvester entity, b drop-off building, c deposit index (-1 none), v1 ore delivered. Viewer's team. */
    HARVEST_DELIVERED: 20,
    /**
     * Order acknowledgement (s5): one per unit that accepted an order. a unit entity id, b order kind (orders.ts OK_*:
     * 1 stop, 2 move, 3 attackMove, 4 attack, 5 pickup, 6 guard, 7 defend, 8 attackMyTarget, 9 follow, 10 holdFire, 11 retreat),
     * c target (attack / attackMyTarget target entity, guard entity or pilot id, follow / pickup pilot id; holdFire 1 on / 0 off;
     * else 0), d formation (FM_*). Viewer's team.
     */
    ORDER_ACK: 21,
    /**
     * Match over (s7, match.ts; ruling 30): the last Command Core of every team but one (or of all) was destroyed. a winner
     * team (-1 none: the last Cores died in the same tick), b bitmask of eliminated teams, c reason (s13, objectives.ts
     * MR_*: 1 coreDestroyed, 2 objectiveDone, 3 objectiveFailed). Sent to every viewer.
     */
    MATCH_OVER: 22,
    /** Construction (s8, construction.ts): a site was placed and paid. a site id, b building type index, c point index, d constructor id (0 none), v1 ore, v2 gas paid. Every viewer. */
    BUILD_STARTED: 23,
    /** Construction: a building was finished. a site id, b building type index, c point index, d the building's entity id. Every viewer. */
    BUILD_DONE: 24,
    /** Construction: a site ended unfinished. a site id, b type index, c point index, d reason (BE_*: 0 cancelled, 1 destroyed, 2 point lost), v1 / v2 ore / gas refunded. Every viewer. */
    BUILD_ENDED: 25,
    /**
     * Support call marked (s10, calls.ts): a beacon id, b calling pilot id, c call index (supportCalls.calls order), d ticks
     * until impact, v1 x, v2 z; flags CF_MERGED (1) when it merged with a pending beacon of the same call. Every viewer
     * (beacons are visible light pillars, doc 15).
     */
    CALL_QUEUED: 26,
    /** Support call landed: a beacon id, b calling pilot id, c call index, d entities hit, v1 x, v2 z, flags as CALL_QUEUED. Every viewer. */
    CALL_IMPACT: 27,
    /** Support call refused: a input seq, b calling pilot id, c reason code (reasonCode), d call index (-1 unknown). Viewer's team. */
    CALL_REFUSED: 28,
    /**
     * s11: part of a support call's effect after impact: a beacon id, b calling pilot id, c call index, d index within the
     * effect (shell number, ...), v1 x, v2 z; flags & 15 = CE_* sub-kind (calls.ts), flags & 128 (CEF_TEAM) = only the
     * calling team sees it; team the calling team. Every viewer otherwise.
     */
    CALL_EFFECT: 29,
    /**
     * Objectives (s13, objectives.ts): progress crossed a tenth or a timer restarted. a objective index, b type code
     * (OBJ_TYPES), c team it is for, d progress permille, v1 value, v2 goal. Every viewer.
     */
    OBJECTIVE_PROGRESS: 30,
    /** An objective was completed: a index, b type code, c team, d permille, v1 value, v2 goal. Every viewer. */
    OBJECTIVE_DONE: 31,
    /** An objective failed: a index, b type code, c team, d permille, v1 value, v2 goal. Every viewer. */
    OBJECTIVE_FAILED: 32,
    /**
     * S12 pilot kit (pilotkit.ts): a player pilot on foot reached zero health and is DOWNED (doc 13), not dead. a pilot,
     * b its body entity (stays on the ground, hp 0, not targetable), c ticks until it bleeds out; flags F_PLAYER. Viewer's team.
     */
    DOWNED: 33,
    /** S12: a downed pilot was revived. a pilot, b reviving pilot (S15 rulings 79 / 88: 0 when an AI soldier revived him), c body entity, d (S15) the AI helper's entity (0: a player revived him; not on the wire); flags F_PLAYER. Viewer's team. */
    REVIVED: 34,
    /** S12: demolition charge. a charge id, b planting pilot, c target entity; flags KF_* (1 planted, 2 detonated, 4 fizzled: target gone). Viewer's team. */
    CHARGE: 35,
    /** S12: pilot cloak. a pilot, b body entity, c ticks (on: ticks it can last; off: ticks until it can be used again); flags 1 on, 2 off, 4 broken by firing. Viewer's team. */
    CLOAK: 36,
    /** w2b (economy2.ts; reserved 50-59). FORTIFY: a point, b phase (FE_*), c team, d level, v1 upgrade seconds. Every viewer. */
    FORTIFY: 50,
    /** FORWARD_BASE: a entity (vehicle or depot), b phase (FB_*), c point, d the other entity (new depot / vehicle), v1 seconds, v2 bitmask of the teams that detected the entity (not on the wire). Snapshot: its team and teams in v2 (QA1). */
    FORWARD_BASE: 51,
    // 52 (WRECK, salvage wrecks) retired by ruling 106: no wrecks in the sim.
    // w2c (wave 2 task C, reserved kinds 60-69)
    /** An aircraft was destroyed in the air (crash). a aircraft id, b type index, c altitude above ground (m, rounded), d bitmask of the teams that detected it (not on the wire), v1 x, v2 z. Snapshot: its team and teams in d (QA1). */
    AIRCRAFT_DOWN: 60,
    /** A passenger of a destroyed enclosed vehicle failed its survival roll (doc 11) and died aboard. a pilot id, b vehicle id, c seat. Viewer's team. */
    PASSENGER_LOST: 61,
    /**
     * An aircraft touched down (flags 1) or lifted off (flags 2). a aircraft id, b Air Pad id it landed at (0 none), d teams
     * that detected the aircraft (bits 0-7) and the pad (bits 8-15; not on the wire), v1 x, v2 z. Snapshot: its team and teams
     * that detected the aircraft; b is 0 for a viewer whose team did not detect the pad (QA1).
     */
    AIRCRAFT_LANDING: 62,
    // w2e (wave 2 task E, reserved kinds 63-69)
    /**
     * Transport cargo (transport.ts): a transport vehicle id, b soldier (or slung vehicle) id, c passenger seat (-1 sling),
     * d squad id; flags 1 boarded, 2 unloaded (also survivors of a destroyed transport), 4 sling picked up, 8 sling dropped. Viewer's team.
     */
    CARGO: 63,
    /** A soldier aboard a destroyed transport failed the survival roll (or had no room) and died aboard. a vehicle id, b soldier id, c seat, d type index. Viewer's team. */
    CARGO_LOST: 64,
    /** Enemy commander ferry (enemy-ai.ts): a transport id, b squad id, v1 x, v2 z of the drop spot. Viewer's team (the AI team's own viewers only). */
    FERRY: 65,
    /**
     * Battle result (progression.ts) at MATCH_OVER, one per player: a player number, b XP award, c grade (0 bronze, 1 silver,
     * 2 gold), d 1 victory, v1 kills (rounded), v2 captures; flags 1 victory. Every viewer. Full record: Sim.battleResults().
     */
    BATTLE_RESULT: 66,
    /**
     * Wave 2 D weather (weather.ts): a weather index (weather.json order), b phase (WX_*: 0 forecast, 1 started, 2 ended),
     * c ticks (forecast: until it starts; started: its duration; ended: 0), d schedule entry index. Every viewer.
     */
    WEATHER: 70,
    // w2f (wave 2 task F, reserved kinds 80-89)
    /** Drop-in (coop.ts): a pilot id, b player number, c Command Core entity the pod lands at, d ticks until it lands, v1 x, v2 z of the Core. Every viewer; c, x, z are 0 for a viewer of another team that does not detect the Core (QA1). */
    PLAYER_JOINED: 80,
    /** Drop-out (coop.ts): a pilot id, b player number, c mode (0 handed to the AI, 1 removed), d entity left behind (vehicle or body, 0 none). Every viewer; d is 0 for a viewer of another team that does not detect that entity (QA1). */
    PLAYER_LEFT: 81,
    /**
     * w2f: an entity was removed by death (not a pilot climbing in or despawning at home). a entity id, b type index, c bitmask
     * of the teams that had it detected, v1 x, v2 z; team = its team. Snapshot: viewers of its team or of a team in c.
     */
    UNIT_DIED: 82,
    /** w2f stealth.ts: a Relay Tower's jammer switched. a relay id, b 1 on / 0 off, c radius m, v1 x, v2 z. Viewer's team. */
    JAMMER: 83,
    /** w2f: decoy beacon. a decoy id, b pilot, c fake unit type index, d 1 dropped / 2 expired, v1 x, v2 z. Viewer's team. */
    DECOY: 84,
    /** w2f: scout ping. a pilot, b the Dart, c enemies revealed, d ticks, v1 x, v2 z. Viewer's team. */
    SCAN: 85,
    /** w2f: an AI team sent a unit to search a lost contact. a searching unit, b contact entity (0: a decoy), v1 x, v2 z (last-known position). Viewer's team. */
    SEARCH: 86,
    /**
     * w3b battle group (battlegroups.ts): a group label, b what (GE_*: 1 added, 2 removed, 3 order, 4 reinforcement queued,
     * 5 member retreating, 6 patrol leg, 7 group gone), c entity id / order kind / unit type / leg; v1 v2 the point (order,
     * patrol leg). Viewer's team.
     */
    GROUP: 100,
    /** w3b auto-defend (battlegroups.ts): the home base alarm went up. a threats, b the Command Core id. Viewer's team. */
    AUTO_DEFEND: 101,
    /** fix-qa2 garrison (strongpoints.ts): a point, b 1 garrisoned / 2 released / 3 ended, c squad id, d entity id. Host-side (not in snapshots). */
    GARRISON: 110,
    /** fix-qa2 reserve (reserve.ts): a phase (1 stored, 2 drop started, 3 arrived, 4 recall started, 5 recalled, 6 recall cancelled, 7 drop returned), b unit type, c entity / building id, d entries in the reserve; v1 v2 the spot. Host-side. */
    RESERVE: 111,
    /** fix-qa2: an enemy building hacked by a pilot (points.ts; doc 13): a building id, b phase (CE_*: 0 hack started, 1 stopped, 2 disabled, 3 restored), c its team, d the hacking team, v1 pilot. Host-side. */
    BUILDING_HACK: 112,
    /** S14 pilot reserve (pilotpool.ts): a reserve pilot died and is lost for the battle. a pilot, b vehicle it died in (0 on foot), c entity it died as (0 seated), d lost so far, v1 available. Viewer's team. */
    PILOT_LOST: 120,
    /** S14: a reserve pilot is available at base again. a pilot, b home building / removed vehicle, c cause (1 walked home, 2 its vehicle was recalled or removed), d available. Viewer's team. */
    PILOT_AVAILABLE: 121,
    /** S14: available pilots took seats of a vehicle. a vehicle, b pilots seated, c operator seats still empty, d available after; flags cause (1 produced, 2 crew order, 4 automatic at a pilot home). Viewer's team. */
    CREWED: 122,
    /** S14 production notice: a vehicle arrived short of pilots. a vehicle, b building (0 none), c operator seats empty, d unit type index. Viewer's team. */
    UNDERCREWED: 123,
    /** S14 (ruling 64): a team's first capture of a citadel added pilots to its reserve. a point index, b pilots added, c available after. Viewer's team. */
    CITADEL_PILOTS: 124,
    // S15 (designer rulings 43-88; reserved kinds 125-129; s15.ts)
    /** Ruling 55 aircraft ammunition: a aircraft id, b phase (AM_*: 1 weapons dry, rearm wanted (AI aircraft), 2 rearmed to full), v1 x, v2 z. Viewer's team. */
    AMMO: 125,
    /** Ruling 67 forecast warning: ash fall (aircraft grounded) is coming. a weather index, b aircraft of the team in the air, c ticks until it starts. The team's viewers. */
    AIR_WARNING: 126,
    /** Ruling 67 ash fall crash landing: a aircraft id, b phase (1 forced down, 2 touched down), c hull lost (phase 2, rounded), v1 x, v2 z. The aircraft's team. */
    ASH_CRASH: 127,
    /** Ruling 121 (F3): a player pilot and a command seat (Citadel control node / Command Core). a pilot id, b structure id, c SH_* (1 went inside, 2 came out, 3 thrown out: destroyed, 4 thrown out: captured), d body entity id (0 when going inside), flags F_PLAYER. The pilot's team. */
    SHELTER: 130,
    /** C1 (ruling 124) crew dispatch: an AI pilot sent to an own vehicle. a pilot id, b vehicle id, c CD_* (1 sent, 2 boarded, 3 gave up), d sent: home building id (0 from the field) / boarded: seat / gave up: reason code, v1 pilot body id, flags 1 from the reserve. The pilot's team. */
    CREW_DISPATCH: 131,
};
/** EJECT (ruling 34): the crew was thrown out automatically because the vehicle was destroyed (not a held-key eject). */
exports.F_AUTO_EJECT = 1;
exports.F_KILLED = 1, exports.F_PILOT_KILL = 2, exports.F_FRIENDLY = 4, exports.F_SHIELD = 8, exports.F_HIJACK = 16, exports.F_PLAYER = 32, exports.F_CRITICAL = 64;
/** HIT: the shot struck a rider's pilot zone (open seat, or a canopyKill through the zone), not the hull (CONTRACTS rev 4); v1 / v2 = the rider's health / shield damage. */
exports.F_RIDER = 128;
/** SHOT: the ray hit an entity (b = its id); without it the ray ended on the ground (F_SHOT_GROUND) or at full range. */
exports.F_SHOT_HIT = 1, exports.F_SHOT_GROUND = 2;
class EventLog {
    cap;
    /** Serial number the next event gets; events [next - count, next) are in the ring. */
    next = 1;
    count = 0;
    kind;
    tick;
    team;
    flags;
    a;
    b;
    c;
    d;
    v1;
    v2;
    /** SHOT events only: muzzle and end point of the ray (other kinds leave them as they were). */
    x0;
    y0;
    z0;
    x1;
    y1;
    z1;
    constructor(cap = 16384) {
        this.cap = cap;
        this.kind = new Uint8Array(cap);
        this.tick = new Int32Array(cap);
        this.team = new Uint8Array(cap);
        this.flags = new Uint8Array(cap);
        this.a = new Int32Array(cap);
        this.b = new Int32Array(cap);
        this.c = new Int32Array(cap);
        this.d = new Int32Array(cap);
        this.v1 = new Float64Array(cap);
        this.v2 = new Float64Array(cap);
        this.x0 = new Float32Array(cap);
        this.y0 = new Float32Array(cap);
        this.z0 = new Float32Array(cap);
        this.x1 = new Float32Array(cap);
        this.y1 = new Float32Array(cap);
        this.z1 = new Float32Array(cap);
    }
    /** Oldest serial still held. */
    first() { return this.next - this.count; }
    /** Ring index of serial n (valid for first() <= n < next). */
    at(n) { return n % this.cap; }
    push(kind, tick, team, a, b, c, d, v1, v2, flags) {
        const n = this.next++, i = n % this.cap;
        this.kind[i] = kind;
        this.tick[i] = tick;
        this.team[i] = team;
        this.flags[i] = flags;
        this.a[i] = a;
        this.b[i] = b;
        this.c[i] = c;
        this.d[i] = d;
        this.v1[i] = v1;
        this.v2[i] = v2;
        if (this.count < this.cap)
            this.count++;
        return n;
    }
    /**
     * Restores the log after a host handover (state.ts): serials continue at `next`; events [first, next) whose
     * records are given are put back at their serials (others in that range read as kind 0, ignored by readers).
     * Records: [serial, kind, tick, team, flags, a, b, c, d, v1, v2].
     */
    restoreTail(next, first, evs) {
        if (next - first > this.cap)
            first = next - this.cap;
        this.next = next;
        this.count = next - first;
        this.kind.fill(0);
        for (const e of evs) {
            if (e[0] < first || e[0] >= next)
                continue;
            const i = e[0] % this.cap;
            this.kind[i] = e[1];
            this.tick[i] = e[2];
            this.team[i] = e[3];
            this.flags[i] = e[4];
            this.a[i] = e[5];
            this.b[i] = e[6];
            this.c[i] = e[7];
            this.d[i] = e[8];
            this.v1[i] = e[9];
            this.v2[i] = e[10];
        }
    }
    /** Events of one tick as plain objects (tools / tests; allocates). */
    list(fromSerial = this.first()) {
        const out = [];
        for (let n = Math.max(fromSerial, this.first()); n < this.next; n++) {
            const i = n % this.cap;
            out.push({ serial: n, kind: this.kind[i], tick: this.tick[i], team: this.team[i], a: this.a[i], b: this.b[i], c: this.c[i], d: this.d[i], v1: this.v1[i], v2: this.v2[i], flags: this.flags[i] });
        }
        return out;
    }
}
exports.EventLog = EventLog;
