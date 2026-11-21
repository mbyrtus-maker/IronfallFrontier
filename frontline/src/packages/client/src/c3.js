"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatWatch = exports.StructureMemory = exports.focalPx = exports.projectedPx = exports.fogAt = exports.FP_FOG_START = exports.DMG_IND_MS = exports.FAR_MARKER_PX = exports.harvesterIdle = exports.ECONOMY_TYPES = exports.MatchWatch = void 0;
exports.fmtTime = fmtTime;
exports.matchSummary = matchSummary;
exports.nextSeed = nextSeed;
exports.boxSelection = boxSelection;
exports.harvestButton = harvestButton;
exports.needsFarMarker = needsFarMarker;
exports.relBearing = relBearing;
exports.shooterPos = shooterPos;
// ------------------------------------------------------------------ match over (item 3)
/** Fires once when the snapshot's match block turns over (running -> over); reset() for a new match. */
class MatchWatch {
    wasOver = false;
    /** True exactly on the first view whose match is over. */
    update(m) { const over = !!m && m.over; const fire = over && !this.wasOver; this.wasOver = over; return fire; }
    get over() { return this.wasOver; }
    reset() { this.wasOver = false; }
}
exports.MatchWatch = MatchWatch;
/** "4:07" (minutes:seconds); hours as "1:02:03". */
function fmtTime(seconds) {
    const s = Math.max(0, Math.floor(seconds)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}
/** The end screen: who won (winner vs the viewer's team), which Core fell (eliminated bitmask), match time, the player's numbers. */
function matchSummary(m, team, tickRate, st) {
    const result = m.winner < 0 ? "draw" : m.winner === team ? "victory" : "defeat";
    const ownFell = (m.eliminated & (1 << team)) !== 0, enemyFell = (m.eliminated & ~(1 << team)) !== 0;
    const cause = ownFell && enemyFell ? "Both Command Cores fell in the same moment" : ownFell ? "Your Command Core was destroyed" : enemyFell ? "The Hegemony Command Core was destroyed" : "The match ended";
    const time = fmtTime(m.overTick / tickRate);
    return {
        result, title: result === "victory" ? "VICTORY" : result === "defeat" ? "DEFEAT" : "DRAW", cause, time,
        lines: [
            ["Match time", time],
            ["Points held", `${st.pointsHeld} / ${st.pointsTotal} (most: ${st.peakPoints})`],
            ["Units built", String(st.unitsBuilt)],
            ["Units lost", String(st.unitsLost)],
            ["Enemy units destroyed", String(st.enemyLost)],
            ...(st.pilots ? [["Pilots lost", `${st.pilots.lost} of ${st.pilots.total} (${st.pilots.alive} came through)`]] : []),
        ],
    };
}
/** A new sim seed for "Play again" (deterministic from the last one, never the same). */
function nextSeed(seed) {
    const n = ((Math.imul(seed >>> 0, 1103515245) + 12345) >>> 0) % 999983 + 1;
    return n === seed ? n + 1 : n;
}
// ------------------------------------------------------------------ designer playtest: box select and Harvesters
/** Economy vehicles (ruling 8: no guns): left out of a box selection that also holds combat units. */
exports.ECONOMY_TYPES = ["harvester", "hauler", "constructor", "forward-base-vehicle"];
/**
 * Box select: the units in the box, without the economy vehicles unless the box holds ONLY economy vehicles (a
 * single click is not a box and keeps whatever it hits; control groups keep what was assigned).
 */
function boxSelection(inBox) {
    const combat = inBox.filter((u) => !u.economy);
    return (combat.length ? combat : inBox).map((u) => u.id);
}
/** An idle Harvester (no trip running, or taken off the loop by a manual order) shows an idle marker. */
const harvesterIdle = (h) => h.manual || h.phase === "idle";
exports.harvesterIdle = harvesterIdle;
/** The command-view Harvest button: shown when a Harvester is selected. */
function harvestButton(selectedHarvesters) { return selectedHarvesters > 0 ? `HARVEST (J) · ${selectedHarvesters}` : null; }
// ------------------------------------------------------------------ designer playtest: fair visibility at range
/** Below this projected height (px) a unit gets a hostile far marker (when the player has line of sight). */
exports.FAR_MARKER_PX = 6;
/** The damage-direction indicator holds each hit this long (ms). */
exports.DMG_IND_MS = 1500;
/** First-person fog: no fog closer than this (m), so nothing inside the longest weapon ranges (~600 m) is hidden. */
exports.FP_FOG_START = 400;
/** Fog fraction at distance d (the shader's fogAmount: 1 - exp(-max(d - start, 0) x density)). */
const fogAt = (d, start, density) => 1 - Math.exp(-Math.max(d - start, 0) * density);
exports.fogAt = fogAt;
/** On-screen size (px) of an object of `sizeM` metres at `dist` m with a vertical focal length of `focalPx` px. */
const projectedPx = (sizeM, dist, focalPx) => (dist > 0 ? (sizeM * focalPx) / dist : Infinity);
exports.projectedPx = projectedPx;
/** Vertical focal length (px) for a viewport `heightPx` tall and a vertical field of view `fovDeg`. */
const focalPx = (heightPx, fovDeg) => heightPx / 2 / Math.tan((fovDeg * Math.PI) / 360);
exports.focalPx = focalPx;
/** The far-marker rule: an enemy smaller than FAR_MARKER_PX on screen, in line of sight. */
function needsFarMarker(sizeM, dist, focal, lineOfSight) {
    return lineOfSight && (0, exports.projectedPx)(sizeM, dist, focal) < exports.FAR_MARKER_PX;
}
/** Bearing of (sx, sz) seen from (ex, ez) facing `yaw` (radians, dir = (cos, sin)): 0 ahead, + to the right, in (-pi, pi]. */
function relBearing(ex, ez, yaw, sx, sz) {
    let a = Math.atan2(sz - ez, sx - ex) - yaw;
    while (a > Math.PI)
        a -= Math.PI * 2;
    while (a <= -Math.PI)
        a += Math.PI * 2;
    return a;
}
/**
 * Where a hit on the player came from: the shooter when it is on the wire, else the launch point of its newest
 * projectile or hitscan ray in the snapshot (projectiles within fullSimRadius are sent whether or not the shooter is
 * detected), else where it was last seen. Null when nothing is known.
 */
function shooterPos(id, entities, projectiles, shots, lastSeen) {
    const e = entities.get(id);
    if (e)
        return { x: e.x, z: e.z, from: "entity" };
    let best = null;
    for (const p of projectiles)
        if (p.shooter === id && (!best || p.launchTick > best.launchTick))
            best = p;
    if (best)
        return { x: best.x0, z: best.z0, from: "projectile" };
    let sh = null;
    for (const s of shots)
        if (s.shooter === id)
            sh = s;
    if (sh)
        return { x: sh.x0, z: sh.z0, from: "shot" };
    const l = lastSeen.get(id);
    return l ? { x: l.x, z: l.z, from: "lastSeen" } : null;
}
/**
 * Enemy structures once seen stay drawn where they stood (they cannot move) after they drop off the wire (out of
 * the team's detection), until a death at that place says they are gone.
 */
class StructureMemory {
    known = new Map();
    see(entities, isStructure, team) {
        for (const e of entities)
            if (e.team !== team && isStructure(e.type)) {
                if (!this.known.has(e.id))
                    for (const [id, k] of this.known)
                        if (id < 0 && k.type === e.type && Math.hypot(k.x - e.x, k.z - e.z) < 4)
                            this.known.delete(id); // the real one replaces a seeded one
                this.known.set(e.id, { id: e.id, type: e.type, team: e.team, x: e.x, z: e.z, yaw: e.heading });
            }
    }
    /** Fixed scenario knowledge (the enemy base layout): seeded with negative ids until the real one is seen. */
    seed(list) { list.forEach((k, i) => this.known.set(-1 - i, { id: -1 - i, ...k })); }
    /** A death (sidecar: position, type, team) removes the structure that stood there. */
    died(type, team, x, z) {
        for (const [id, k] of this.known)
            if (k.type === type && k.team === team && Math.hypot(k.x - x, k.z - z) < 4)
                this.known.delete(id);
    }
    /** Remembered structures not in the current view. */
    ghosts(onWire) { return [...this.known.values()].filter((k) => !onWire.has(k.id)); }
    clear() { this.known.clear(); }
}
exports.StructureMemory = StructureMemory;
/** Feed lines and the alarm for threats to the player's team, each kind and place at most once per `coolMs`. */
class ThreatWatch {
    last = new Map();
    team;
    coolMs;
    constructor(team = 0, coolMs = 8000) { this.team = team; this.coolMs = coolMs; }
    gate(t, now) {
        const l = this.last.get(t.key);
        if (l !== undefined && now - l < this.coolMs)
            return null;
        this.last.set(t.key, now);
        return t;
    }
    /**
     * POINT event (a point, b phase, c team): an enemy starts capturing or hacking one of our points (owner = ours), or
     * takes a point (captured by an enemy). `owner` is the point's owner before the event.
     */
    point(a, b, c, owner, name, now) {
        const enemy = c >= 0 && c !== this.team;
        if (!enemy)
            return null;
        if ((b === 0 || b === 1) && owner === this.team)
            return this.gate({ key: `cap${a}`, text: `${name.toUpperCase()} IS BEING CAPTURED`, kind: "bad", alarm: true }, now);
        if (b === 5 && owner === this.team)
            return this.gate({ key: `hack${a}`, text: `${name.toUpperCase()} IS BEING HACKED`, kind: "bad", alarm: true }, now);
        if (b === 2)
            return this.gate({ key: `took${a}`, text: `THE ENEMY TOOK ${name.toUpperCase()}`, kind: "bad", alarm: true }, now);
        return null;
    }
    /** CORE event (b phase 0 hack started; c the Core's team). */
    core(b, coreTeam, now) {
        if (coreTeam !== this.team || b !== 0)
            return null;
        return this.gate({ key: "corehack", text: "YOUR COMMAND CORE IS BEING HACKED", kind: "bad", alarm: true }, now);
    }
    /** The own Core's hull + shield fraction dropped since the last snapshot: under attack. */
    coreDamage(prev, cur, now) {
        if (!(cur < prev - 1e-4))
            return null;
        return this.gate({ key: "corehit", text: "YOUR COMMAND CORE IS UNDER ATTACK", kind: "bad", alarm: true }, now);
    }
    reset() { this.last.clear(); }
}
exports.ThreatWatch = ThreatWatch;
