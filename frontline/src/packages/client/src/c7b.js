"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_HELP = exports.GROUP_KEY_LABEL = exports.GROUP_KEY = exports.GO_ESCORT = exports.GO_PATROL = exports.GO_HOLD = exports.GO_ASSAULT = exports.StealthState = exports.TOOL_KEY_LABEL = exports.TOOL_KEY = exports.CargoTracker = exports.CG_DROP = exports.CG_LIFT = exports.CG_UNLOAD = exports.CG_BOARD = exports.OwnPredictor = void 0;
exports.shotsChanged = shotsChanged;
exports.unitDied = unitDied;
exports.landingEventText = landingEventText;
exports.playerCount = playerCount;
exports.scalingText = scalingText;
exports.dropPodOf = dropPodOf;
exports.coopEventText = coopEventText;
exports.cargoEventText = cargoEventText;
exports.passengerLine = passengerLine;
exports.loadPlan = loadPlan;
exports.unloadPlan = unloadPlan;
exports.transportTag = transportTag;
exports.stealthEventText = stealthEventText;
exports.toolText = toolText;
exports.weatherSensing = weatherSensing;
exports.radarOnly = radarOnly;
exports.nextGroupLabel = nextGroupLabel;
exports.groupRow = groupRow;
exports.groupEventText = groupEventText;
exports.toggleDraft = toggleDraft;
exports.podChoiceText = podChoiceText;
exports.domeStop = domeStop;
// Client C7b: the rest of the sim's features on screen and the multiplayer client side. Pure helpers (no DOM, no
// WebGL): main.ts draws what these return, the logic tests (test/logic/c7b-*.test.mjs) call them directly.
//
// Item 1: own-pilot prediction and reconciliation (w2f predict.ts) for a guest walking. The page steps its own pilot
// once per sim tick with the sim's pure pilotMoveStep and sends each input with a rising clientSeq. Each snapshot
// carries the host's own-body position (kit x / z at 1 mm) and the clientSeq of the last input the host applied
// (DecodedPilot.inputSeq): the predictor drops the inputs up to it and replays the rest from the host's position. The
// difference between the old and the new prediction is kept as a visual offset that fades out (a correction of a few
// cm is never seen as a jump); a large one (a push, a respawn) snaps.
const predict_ts_1 = require("../../sim/src/predict.js");
const events_ts_1 = require("../../sim/src/events.js");
const smooth_ts_1 = require("./smooth.js");
const battlegroups_ts_1 = require("../../sim/src/battlegroups.js");
Object.defineProperty(exports, "GO_ASSAULT", { enumerable: true, get: function () { return battlegroups_ts_1.GO_ASSAULT; } });
Object.defineProperty(exports, "GO_HOLD", { enumerable: true, get: function () { return battlegroups_ts_1.GO_HOLD; } });
Object.defineProperty(exports, "GO_PATROL", { enumerable: true, get: function () { return battlegroups_ts_1.GO_PATROL; } });
Object.defineProperty(exports, "GO_ESCORT", { enumerable: true, get: function () { return battlegroups_ts_1.GO_ESCORT; } });
class OwnPredictor {
    R;
    ground;
    /** Inputs not yet acknowledged by the host, with the state predicted after each. */
    hist = [];
    /** Predicted state now (after the newest input) and the one before it (drawn between the two). */
    state = null;
    prev = null;
    seq = 0;
    stepAt = 0;
    /** Visual offset (old prediction - new prediction), fading. */
    err = { x: 0, y: 0, z: 0 };
    stats = { steps: 0, reconciles: 0, snaps: 0, maxCorrection: 0, lastCorrection: 0, acked: 0, pending: 0 };
    /** Offset beyond which the predictor snaps instead of smoothing (m). */
    static SNAP_M = 3;
    /** T1: relief walls (relief.ts reliefStepRule; null: none). */
    canStep;
    constructor(R, ground, canStep) { this.R = R; this.ground = ground; this.canStep = canStep ?? undefined; }
    reset() { this.hist = []; this.state = null; this.prev = null; this.err = { x: 0, y: 0, z: 0 }; }
    /** One tick of the own input. Returns its clientSeq (send it with the input); null before the first host position. */
    step(inp, now) {
        if (!this.state)
            return null;
        const s = ++this.seq;
        this.prev = this.state;
        this.state = (0, predict_ts_1.pilotMoveStep)(this.R, this.state, inp, this.ground, this.canStep);
        this.hist.push({ seq: s, inp, after: this.state });
        if (this.hist.length > 120)
            this.hist.shift(); // 6 s unacknowledged: the oldest are replayed no more
        this.stepAt = now;
        this.stats.steps++;
        this.stats.pending = this.hist.length;
        return s;
    }
    /** A snapshot's own body and the last clientSeq the host applied (0: none of ours yet). */
    reconcile(h, inputSeq) {
        this.stats.reconciles++;
        this.stats.acked = inputSeq;
        const ack = this.hist.find((x) => x.seq === inputSeq);
        while (this.hist.length && this.hist[0].seq <= inputSeq)
            this.hist.shift();
        // velocity is not on the wire: the predicted velocity after the acknowledged input (none: at rest)
        const base = { x: h.x, y: h.y, z: h.z, vx: ack ? ack.after.vx : this.state ? this.state.vx : 0, vz: ack ? ack.after.vz : this.state ? this.state.vz : 0, vy: ack ? ack.after.vy : 0, airborne: h.airborne === 1 ? 1 : 0, jetFuel: h.jetFuel, energy: h.energy };
        if (!this.state) {
            this.state = base;
            this.prev = base;
            return;
        }
        let s = base, p = base;
        for (const x of this.hist) {
            p = s;
            s = (0, predict_ts_1.pilotMoveStep)(this.R, s, x.inp, this.ground, this.canStep);
            x.after = s;
        }
        const dx = this.state.x - s.x, dy = this.state.y - s.y, dz = this.state.z - s.z, d = Math.hypot(dx, dz);
        this.stats.lastCorrection = d;
        if (d > this.stats.maxCorrection)
            this.stats.maxCorrection = d;
        if (d > OwnPredictor.SNAP_M) {
            this.err = { x: 0, y: 0, z: 0 };
            this.stats.snaps++;
        }
        else {
            this.err.x += dx;
            this.err.y += dy;
            this.err.z += dz;
        }
        this.state = s;
        this.prev = this.hist.length ? p : s;
        this.stats.pending = this.hist.length;
    }
    /** The drawn body: between the last two predicted ticks by the time since the last step, plus the fading offset. */
    pos(now, tickMs, frameDt) {
        const s = this.state, p = this.prev ?? s;
        if (!s || !p)
            return null;
        const f = Math.max(0, Math.min(1, (now - this.stepAt) / tickMs));
        const k = Math.exp(-frameDt * 10); // the offset fades with a ~0.1 s time constant
        this.err.x *= k;
        this.err.y *= k;
        this.err.z *= k;
        // j1: in the air the height between ticks follows the jump / jetpack / fall arc (Hermite with both vertical speeds), not a line
        const y = p.airborne || s.airborne ? (0, smooth_ts_1.altAt)(p.y, p.vy * this.R.dt, s.y, s.vy * this.R.dt, 1, f) : p.y + (s.y - p.y) * f;
        return { x: p.x + (s.x - p.x) * f + this.err.x, y: y + this.err.y, z: p.z + (s.z - p.z) * f + this.err.z, vx: s.vx, vz: s.vz };
    }
}
exports.OwnPredictor = OwnPredictor;
/** A recoil kick when the own station's shot count (DecodedPilot.shots, mod 65536) changed. */
function shotsChanged(prev, now) { return prev !== null && prev !== now; }
// ------------------------------------------------------------------ item 1: sim-sent data instead of the host side channel
/** UNIT_DIED (82): entity, type, position, team. */
function unitDied(e) {
    return e.kind === events_ts_1.EV.UNIT_DIED ? { id: e.a, type: e.b, x: e.v1, z: e.v2, team: e.team ?? 0 } : null;
}
/** The own aircraft's landing line (AIRCRAFT_LANDING 62: flags 1 touched down, 2 lifted off; b the Air Pad, 0 none). */
function landingEventText(e, ownVehicle) {
    if (e.kind !== events_ts_1.EV.AIRCRAFT_LANDING || e.a !== ownVehicle || !ownVehicle)
        return null;
    if (e.flags & 1)
        return { text: e.b ? "LANDED AT THE AIR PAD · rearming · hold C to stay down" : "LANDED · hold C to stay down · near an Air Pad: rearm", landed: true };
    return { text: "LIFTED OFF", landed: false };
}
/** The sim's player count rule: player pilots on the human team, clamped 1-4. */
function playerCount(players) {
    let n = 0;
    for (const p of players)
        if (p.player >= 0)
            n++;
    return Math.max(1, Math.min(4, n));
}
/** Roster line: how hard the enemy commander plays for this many players. */
function scalingText(n, rows) {
    const r = rows?.[String(n)];
    if (!r)
        return `${n} player${n === 1 ? "" : "s"}`;
    return `ENEMY SCALING · ${n} player${n === 1 ? "" : "s"} · income ×${r.enemyIncome} · waves ×${r.waveSize} · ${r.raidsAtOnce} raid${r.raidsAtOnce === 1 ? "" : "s"} at once`;
}
function dropPodOf(e, now, dt, name) {
    if (e.kind !== events_ts_1.EV.PLAYER_JOINED)
        return null;
    return { pilot: e.a, player: e.b, x: e.v1, z: e.v2, landAt: now + e.d * dt * 1000, name, landed: false };
}
/** Feed lines for PLAYER_JOINED / PLAYER_LEFT. */
function coopEventText(e, me, name, dt) {
    if (e.kind === events_ts_1.EV.PLAYER_JOINED) {
        const s = Math.max(0, Math.round(e.d * dt));
        return e.a === me ? { text: `PILOT INBOUND · your drop pod lands at the Command Core in ${s} s`, kind: "good" } : { text: `PILOT INBOUND · ${name} · drop pod lands at the Command Core in ${s} s`, kind: "good" };
    }
    if (e.kind === events_ts_1.EV.PLAYER_LEFT)
        return { text: e.c === 1 ? `${name} LEFT · pilot removed` : `${name} LEFT · the pilot is AI now · the units stay with the squad`, kind: "info" };
    return null;
}
// ------------------------------------------------------------------ item 3: transports (w2e transport.ts)
/** CARGO flags (events.ts): 1 boarded, 2 unloaded, 4 sling picked up, 8 sling dropped. */
exports.CG_BOARD = 1, exports.CG_UNLOAD = 2, exports.CG_LIFT = 4, exports.CG_DROP = 8;
/**
 * What each own transport carries, from the CARGO / CARGO_LOST events (the viewer's team; soldiers aboard have no
 * entity and no crew bit, so the stream's events are the only source). A page that joins mid-match starts empty.
 */
class CargoTracker {
    soldiers = new Map();
    slung = new Map();
    onEvent(e) {
        if (e.kind === events_ts_1.EV.CARGO) {
            const set = (m) => { let s = m.get(e.a); if (!s)
                m.set(e.a, (s = new Set())); return s; };
            if (e.flags & exports.CG_BOARD)
                set(this.soldiers).add(e.b);
            if (e.flags & exports.CG_UNLOAD)
                this.soldiers.get(e.a)?.delete(e.b);
            if (e.flags & exports.CG_LIFT)
                set(this.slung).add(e.b);
            if (e.flags & exports.CG_DROP)
                this.slung.get(e.a)?.delete(e.b);
            return true;
        }
        if (e.kind === events_ts_1.EV.CARGO_LOST) {
            this.soldiers.get(e.a)?.delete(e.b);
            return true;
        }
        return false;
    }
    aboard(vehicle) { return this.soldiers.get(vehicle)?.size ?? 0; }
    sling(vehicle) { return [...(this.slung.get(vehicle) ?? [])]; }
    /** The transport gone (destroyed or off the wire for good): forget it. */
    drop(vehicle) { this.soldiers.delete(vehicle); this.slung.delete(vehicle); }
    clear() { this.soldiers.clear(); this.slung.clear(); }
}
exports.CargoTracker = CargoTracker;
/** Feed lines for CARGO / CARGO_LOST / FERRY (own team). */
function cargoEventText(e, typeOf, aboard) {
    const v = typeOf(e.a);
    if (e.kind === events_ts_1.EV.CARGO) {
        if (e.flags & exports.CG_BOARD)
            return { text: `CARGO · ${typeOf(e.b)} aboard the ${v} (${aboard} aboard)`, kind: "info" };
        if (e.flags & exports.CG_UNLOAD)
            return { text: `CARGO · ${typeOf(e.b)} out of the ${v} (${aboard} aboard)`, kind: "info" };
        if (e.flags & exports.CG_LIFT)
            return { text: `CARGO · the ${v} lifted the ${typeOf(e.b)}`, kind: "good" };
        if (e.flags & exports.CG_DROP)
            return { text: `CARGO · the ${v} dropped the ${typeOf(e.b)}`, kind: "good" };
    }
    if (e.kind === events_ts_1.EV.CARGO_LOST)
        return { text: `CARGO LOST · a soldier died aboard the ${v}`, kind: "bad" };
    if (e.kind === events_ts_1.EV.FERRY)
        return { text: `FERRY · the enemy commander ferries a squad by ${v}`, kind: "warn" };
    return null;
}
/** A PASSENGER line: a squadmate (or the own pilot, already said by the ENTER line) took a passenger seat. */
function passengerLine(name, vehicle) { return `PASSENGER · ${name} rides the ${vehicle}`; }
/**
 * K in the command view (LOAD / LIFT), cursor on `target` (own entity under it, or null): selected infantry board
 * the Carrier / Mule under the cursor; a selected Mule lifts the friendly ground vehicle under the cursor.
 */
function loadPlan(sel, target, R) {
    const inf = sel.filter((u) => R.infantry(u.type)), lifters = sel.filter((u) => R.lifter(u.type));
    if (!target)
        return { kind: "none", why: inf.length ? "put the cursor on a Carrier or Mule" : lifters.length ? "put the cursor on a vehicle to lift" : "select infantry (or a Mule)" };
    if (inf.length && R.carrier(target.type))
        return { kind: "load", units: inf.map((u) => u.id), vehicle: target.id };
    if (lifters.length && R.liftable(target.type) && !lifters.some((l) => l.id === target.id))
        return { kind: "lift", lifter: lifters[0].id, target: target.id };
    if (inf.length)
        return { kind: "none", why: "only a Carrier or a Mule carries infantry" };
    if (lifters.length)
        return { kind: "none", why: "a Mule lifts friendly ground vehicles" };
    return { kind: "none", why: "select infantry (or a Mule)" };
}
/** U in the command view (UNLOAD): every selected transport unloads / drops its sling load at the cursor. */
function unloadPlan(sel, R) {
    const v = sel.filter((u) => R.carrier(u.type) || R.lifter(u.type)).map((u) => u.id);
    return v.length ? { kind: "unload", vehicles: v } : { kind: "none", why: "select a Carrier or Mule" };
}
/** Label over an own transport: soldiers + passenger pilots aboard of the seats, and the sling load. */
function transportTag(aboard, pilots, seats, sling) {
    const n = aboard + pilots;
    return `${n}/${seats} ABOARD${sling.length ? ` · SLUNG ${sling.join(", ")}` : ""}`;
}
// ------------------------------------------------------------------ item 4: stealth tools (w2f stealth.ts)
exports.TOOL_KEY = "KeyN", exports.TOOL_KEY_LABEL = "N";
/** What the page knows of the stealth tools, from JAMMER / DECOY / SCAN events (own team) and refusals. */
class StealthState {
    jammers = new Map();
    /** Own team's decoys (the enemy's come as SnapshotView.decoys records, drawn as contacts). */
    decoys = new Map();
    /** Spots where an orbital call was refused by an enemy jammer (callJammed): a JAMMED marker for a while. */
    jammedSpots = [];
    decoyUsed = false;
    scanAt = -1e9;
    /** The own bike's cloak (CLOAK events with b = the bike): active until, or recharging until (ms). */
    bikeCloak = null;
    /** CLOAK (36) of the own pilot on a bike: flags 1 on (c = ticks it can last), 2 / 4 off (c = ticks to recharge). */
    onCloak(e, me, bike, now, dt) {
        if (e.kind !== events_ts_1.EV.CLOAK || e.a !== me || !bike || e.b !== bike)
            return;
        this.bikeCloak = { on: (e.flags & 1) !== 0, until: now + e.c * dt * 1000 };
    }
    bikeCloakText(now) {
        const c = this.bikeCloak, s = c ? Math.ceil((c.until - now) / 1000) : 0;
        if (c && s > 0)
            return c.on ? `CLOAKED ${s} s` : `cloak recharging ${s} s`;
        return "cloak ready (hold R)";
    }
    stats = { jammerEvents: 0, decoyEvents: 0, scans: 0 };
    onEvent(e, me, now, dt, decoySeconds) {
        if (e.kind === events_ts_1.EV.JAMMER) {
            this.jammers.set(e.a, { on: e.b === 1, radius: e.c, x: e.v1, z: e.v2 });
            this.stats.jammerEvents++;
        }
        else if (e.kind === events_ts_1.EV.DECOY) {
            this.stats.decoyEvents++;
            if (e.d === 1) {
                this.decoys.set(e.a, { x: e.v1, z: e.v2, until: now + decoySeconds * 1000, type: e.c, pilot: e.b });
                if (e.b === me)
                    this.decoyUsed = true;
            }
            else
                this.decoys.delete(e.a);
        }
        else if (e.kind === events_ts_1.EV.SCAN) {
            if (e.a === me)
                this.scanAt = now;
            this.stats.scans++;
            void dt;
        }
    }
    jammedAt(x, z, now) { this.jammedSpots.push({ x, z, until: now + 12000 }); if (this.jammedSpots.length > 8)
        this.jammedSpots.shift(); }
    prune(now) { for (const [id, d] of this.decoys)
        if (now > d.until + 2000)
            this.decoys.delete(id); this.jammedSpots = this.jammedSpots.filter((j) => j.until > now); }
    /** Seconds until the scout pulse is ready again (0 ready). */
    pulseLeft(now, cooldownS) { return Math.max(0, Math.ceil(cooldownS - (now - this.scanAt) / 1000)); }
    clear() { this.jammers.clear(); this.decoys.clear(); this.jammedSpots = []; this.decoyUsed = false; this.scanAt = -1e9; this.bikeCloak = null; }
}
exports.StealthState = StealthState;
function stealthEventText(e, me, name, typeName, dt) {
    if (e.kind === events_ts_1.EV.JAMMER)
        return e.b === 1 ? { text: `JAMMER ON · units within ${e.c} m of the Relay Tower are hidden from enemy radar · enemy orbital calls blocked there`, kind: "good" } : { text: "JAMMER OFF", kind: "info" };
    if (e.kind === events_ts_1.EV.DECOY) {
        if (e.d !== 1)
            return e.b === me ? { text: "DECOY EXPIRED", kind: "info" } : null;
        return { text: e.b === me ? `DECOY BEACON DROPPED · enemy sensors see a ${typeName(e.c)} here` : `DECOY · ${name(e.b) || "a squadmate"} dropped a decoy beacon`, kind: "good" };
    }
    if (e.kind === events_ts_1.EV.SCAN)
        return e.a === me ? { text: `SCOUT PULSE · ${e.c} enem${e.c === 1 ? "y" : "ies"} revealed for ${Math.round(e.d * dt)} s · the enemy sees your Dart too`, kind: "good" } : { text: `SCOUT PULSE · ${name(e.a) || "a squadmate"} revealed ${e.c} enem${e.c === 1 ? "y" : "ies"}`, kind: "info" };
    return null;
}
/** The tools line of the kit HUD (on foot: decoy; on a Dart: scout pulse; on a bike: its cloak). */
function toolText(o) {
    const parts = [];
    if (o.foot)
        parts.push(o.decoyUsed ? "DECOY used (one per life)" : `DECOY ready (${exports.TOOL_KEY_LABEL})`);
    if (o.dart)
        parts.push(o.pulseLeft > 0 ? `SCOUT PULSE ${o.pulseLeft} s` : `SCOUT PULSE ready (${exports.TOOL_KEY_LABEL})`);
    if (o.bike && o.cloak)
        parts.push(`BIKE ${o.cloak}`);
    return parts.join(" · ");
}
/** Detection factors of the current weather (weather.json effects): visual and radar multipliers, radar blind. */
function weatherSensing(fx) {
    const n = (k, d) => (typeof fx?.[k] === "number" ? fx[k] : d);
    const det = n("detectionMultiplier", 1), vis = n("sightMultiplier", 1) * n("visualDetectionMultiplier", 1);
    const blind = fx?.radarBlind === true;
    return { visual: det * vis, radar: blind ? 0 : det, blind, sightCap: n("sightRangeMetres", Infinity) };
}
/**
 * Enemy contacts the team sees only by radar (the Relay Tower: 0.7 x its sensor range, ignoring sight lines and fog)
 * and no own unit or building sees by sight (sensor range capped by the atmosphere's fog and the weather's sight
 * range, times the target's signature and the weather's detection factors; the Relay's own sight counts). The wire
 * does not say how a contact was detected; this is the client's estimate (line of sight not modelled, so it matters
 * where fog caps sight below the radar range: dense atmospheres, fog banks). They are drawn as blips, not as units.
 */
function radarOnly(contacts, own, R, w) {
    const out = new Set();
    const radars = own.filter((o) => R.radar(o.type));
    if (!radars.length || w.radar <= 0)
        return out;
    for (const c of contacts) {
        const sig = R.signature(c.type);
        const byRadar = radars.some((r) => Math.hypot(r.x - c.x, r.z - c.z) <= R.sensor(r.type) * R.radarMul * w.radar * sig);
        if (!byRadar)
            continue;
        const cap = Math.min(R.fogCap, w.sightCap ?? Infinity);
        const bySight = own.some((o) => Math.hypot(o.x - c.x, o.z - c.z) <= Math.min(R.sensor(o.type) * w.visual, cap) * sig);
        if (!bySight)
            out.add(c.id);
    }
    return out;
}
exports.GROUP_KEY = "KeyV", exports.GROUP_KEY_LABEL = "V";
/** The lowest battle group label (1..max) not in use, or 0 when all are taken. */
function nextGroupLabel(groups, max = 9) {
    const used = new Set((groups ?? []).map((g) => g.label));
    for (let l = 1; l <= max; l++)
        if (!used.has(l))
            return l;
    return 0;
}
/** One row of the side list: label, size, order and what it is doing. */
function groupRow(g, typeName) {
    const n = g.members.length;
    const order = g.order === "patrol" ? `PATROL · leg ${g.leg + 1}/${Math.max(1, g.route.length)}` : g.order === "escort" ? `ESCORT · ${g.target ? typeName(g.target) : "the harvesters"}` : g.order === "none" ? "no standing order" : g.order.toUpperCase();
    return { label: g.label, title: `BATTLE GROUP ${g.label} · ${n} unit${n === 1 ? "" : "s"}${g.peak > n ? ` (of ${g.peak})` : ""}`, detail: `${order}${g.reinforce ? " · REINFORCE on" : ""}` };
}
/** Feed lines for GROUP (100) and AUTO_DEFEND (101), own team. */
function groupEventText(e, typeOf, typeName) {
    if (e.kind === events_ts_1.EV.AUTO_DEFEND)
        return { text: `AUTO-DEFEND · ${e.a} threat${e.a === 1 ? "" : "s"} at the Command Core · idle units respond`, kind: "warn" };
    if (e.kind !== events_ts_1.EV.GROUP)
        return null;
    const g = `GROUP ${e.a}`;
    switch (e.b) {
        case battlegroups_ts_1.GE_ADDED: return { text: `${g} · ${typeOf(e.c)} joined`, kind: "info" };
        case battlegroups_ts_1.GE_REMOVED: return { text: `${g} · ${typeOf(e.c)} left`, kind: "info" };
        case battlegroups_ts_1.GE_ORDER: return { text: `${g} · standing order: ${(battlegroups_ts_1.GROUP_ORDER_NAMES[e.c] ?? "none").toUpperCase()}`, kind: "good" };
        case battlegroups_ts_1.GE_REINFORCE: return { text: `${g} · reinforcement on its way (${typeName(e.c)})`, kind: "info" };
        case battlegroups_ts_1.GE_RETREAT: return { text: `${g} · a damaged ${typeOf(e.c)} falls back to repair`, kind: "warn" };
        case battlegroups_ts_1.GE_PATROL_LEG: return { text: `${g} · patrol leg ${e.c + 1}`, kind: "info" };
        case battlegroups_ts_1.GE_EMPTY: return { text: `${g} · gone (no units left)`, kind: "bad" };
    }
    return null;
}
exports.GROUP_HELP = "Control groups (Ctrl+1..9, then 1..9) are selections you command yourself. Battle groups are standing orders: an AI lieutenant keeps the group on its order (hold, assault, patrol, escort), pulls damaged units back to repair and, with REINFORCE on, tops it up.";
// ------------------------------------------------------------------ item 6: loadout in the match, heavy weapon choice, shield dome hits
/** Toggling a call in the in-match loadout draft (at most `slots`; order kept). */
function toggleDraft(draft, id, slots) {
    if (draft.includes(id))
        return { draft: draft.filter((x) => x !== id), full: false };
    if (draft.length >= slots)
        return { draft: draft.slice(), full: true };
    return { draft: [...draft, id], full: false };
}
/** The heavy weapon pod's choice line while it is armed (digits pick; the sim's option is the index). */
function podChoiceText(names, pick) {
    return names.map((n, i) => `${i + 1} ${n}${i === pick ? " ◀" : ""}`).join(" · ") + (names.length > 1 ? ` · 1-${names.length} choose` : "");
}
/** A hitscan ray that ended on a shield dome (w2a: SHOT rays stop on the bubble): the dome it hit, or null. */
function domeStop(end, start, domes, tol = 1.5) {
    for (const d of domes) {
        const de = Math.hypot(end[0] - d.x, end[1] - d.y, end[2] - d.z), ds = Math.hypot(start[0] - d.x, start[1] - d.y, start[2] - d.z);
        if (Math.abs(de - d.r) <= tol && Math.abs(ds - d.r) > tol)
            return d;
    }
    return null;
}
