"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PilotPool = exports.PC_START = exports.PC_AUTO = exports.PC_ORDER = exports.PC_PRODUCED = exports.PA_VEHICLE_REMOVED = exports.PA_WALKED_HOME = exports.EV_CITADEL_PILOTS = exports.EV_UNDERCREWED = exports.EV_CREWED = exports.EV_PILOT_AVAILABLE = exports.EV_PILOT_LOST = exports.ACT_CREW = void 0;
exports.poolRules = poolRules;
const data_ts_1 = require("./data.js");
exports.ACT_CREW = 60;
exports.EV_PILOT_LOST = 120, exports.EV_PILOT_AVAILABLE = 121, exports.EV_CREWED = 122, exports.EV_UNDERCREWED = 123, exports.EV_CITADEL_PILOTS = 124;
/** PILOT_AVAILABLE causes. */
exports.PA_WALKED_HOME = 1, exports.PA_VEHICLE_REMOVED = 2;
/** CREWED causes. */
exports.PC_PRODUCED = 1, exports.PC_ORDER = 2, exports.PC_AUTO = 4, exports.PC_START = 8;
const MAXT = 4;
/** Rules from constants.pilotReserve (null: absent). Team sizes from the map size class and the match. */
function poolRules(data, sizeClass, tickRate, team) {
    const R = data.constants.pilotReserve;
    if (!R || typeof R !== "object" || !R.size)
        return null;
    const base = typeof R.size[sizeClass] === "number" ? R.size[sizeClass] : typeof R.size.small === "number" ? R.size.small : 0;
    const size = [];
    for (let t = 0; t < MAXT; t++) {
        const m = team(t);
        let k = 1;
        // an AI team: difficultyScale[its difficulty] (easy / normal / hard); a human team: playerScale[match players 1-4]
        if (m)
            k = m.ai ? (R.difficultyScale?.[m.difficulty] ?? 1) : (R.playerScale?.[String(m.players)] ?? 1);
        size.push(Math.max(0, Math.round(base * k)));
    }
    const n = (v, def) => (typeof v === "number" && v > 0 ? v : def);
    return { size, crewRadius: n(R.crewRadiusMetres, 150), autoTicks: Math.max(1, Math.round(n(R.autoCrewSeconds, 1) * tickRate)), citadelPilots: typeof R.citadelPilots === "number" && R.citadelPilots > 0 ? Math.round(R.citadelPilots) : 0 };
}
class PilotPool {
    R;
    initial = new Int32Array(MAXT);
    avail = new Int32Array(MAXT);
    lost = new Int32Array(MAXT);
    /** Pilots gained from citadels (ruling 64). */
    gained = new Int32Array(MAXT);
    /** Per strategic point: bit t = team t has had (or never gets: home) its citadel bonus. */
    claimed;
    /** Pilot ids drawn from the pool and alive (seated or on foot). */
    members = new Set();
    /** Vehicle entity ids produced short of pilots (crewed automatically at a pilot home). */
    waiting = new Set();
    constructor(R, owners) {
        this.R = R;
        for (let t = 0; t < MAXT; t++) {
            this.initial[t] = R.size[t];
            this.avail[t] = R.size[t];
        }
        // a citadel owned at battle start is its owner's home: no bonus for it
        this.claimed = new Uint8Array(owners ? owners.length : 0);
        if (owners)
            for (let p = 0; p < owners.length; p++)
                if (owners[p] >= 0)
                    this.claimed[p] = 1 << owners[p];
    }
    counts(sim, team) {
        let assigned = 0, onFoot = 0;
        for (const id of this.members) {
            const p = sim.pilots.get(id);
            if (!p || p.team !== team)
                continue;
            if (p.state === 0)
                assigned++;
            else
                onFoot++;
        }
        return { initial: this.initial[team], gained: this.gained[team], available: this.avail[team], assigned, onFoot, lost: this.lost[team] };
    }
    /** Live pool pilots of a team (available + assigned + on foot). */
    alive(sim, team) { const c = this.counts(sim, team); return c.available + c.assigned + c.onFoot; }
    /** A pilot died (Sim.pilotDied): a member is lost for the battle. */
    onDeath(sim, pilotId, team, vehicleId, entityId) {
        if (!this.members.delete(pilotId))
            return;
        this.lost[team]++;
        sim.events.push(exports.EV_PILOT_LOST, sim.tick, team, pilotId, vehicleId, entityId, this.lost[team], this.avail[team], 0, 0);
    }
    /** A member left the field into the pool (walked home, or its vehicle was removed without a death). True if it was a member. */
    onReturn(sim, pilotId, team, where, cause) {
        if (!this.members.delete(pilotId))
            return false;
        this.avail[team]++;
        sim.events.push(exports.EV_PILOT_AVAILABLE, sim.tick, team, pilotId, where, cause, this.avail[team], 0, 0, 0);
        return true;
    }
    /** Empty operator seats of vehicle slot vs (driver first, then the seats in order). Transport-held seats are skipped. */
    emptySeats(sim, vs) {
        const d = sim.d, t = sim.etype[vs], ns = d.tSeatCount[t], dj = d.tDriverSeat[t], out = [];
        if (dj < 0 || d.raw.units[t]?.playerOnly || (sim.fkit && sim.fkit.reservedFor(sim.eid[vs]) !== 0))
            return out; // Frontline: the mech, and every vehicle a player called down, is never crewed by the AI
        const free = (j) => sim.occ[vs * data_ts_1.MAX_SEATS + j] === 0 && !(sim.tp !== null && sim.tp.held(sim.eid[vs], j));
        if (free(dj))
            out.push(dj);
        for (let j = 0; j < ns; j++) {
            if (j === dj)
                continue;
            const role = d.tSeatRole[t * data_ts_1.MAX_SEATS + j];
            if ((role === data_ts_1.SEAT_DRIVER || role === data_ts_1.SEAT_GUNNER) && free(j))
                out.push(j);
        }
        return out;
    }
    /** Operator seats of type t (driver and gunner seats). */
    seatsOf(sim, t) {
        const d = sim.d;
        if (!d.crewOn || d.tDriverSeat[t] < 0)
            return 0;
        let n = 0;
        for (let j = 0; j < d.tSeatCount[t]; j++) {
            const r = d.tSeatRole[t * data_ts_1.MAX_SEATS + j];
            if (r === data_ts_1.SEAT_DRIVER || r === data_ts_1.SEAT_GUNNER)
                n++;
        }
        return n;
    }
    /** Seats up to `max` available pilots of the vehicle's team in its empty operator seats. Returns how many were seated. */
    fill(sim, vs, expert, cause, max = Infinity) {
        const team = sim.team[vs], seats = this.emptySeats(sim, vs);
        let n = 0;
        for (const j of seats) {
            if (this.avail[team] <= 0 || n >= max)
                break;
            const p = sim.newPilot(team, -1, expert);
            p.state = 0;
            p.vehicle = sim.eid[vs];
            p.seat = j;
            sim.occ[vs * data_ts_1.MAX_SEATS + j] = p.id;
            this.members.add(p.id);
            this.avail[team]--;
            n++;
        }
        if (n > 0) {
            sim.recomputeCrew(vs);
            const left = this.emptySeats(sim, vs).length;
            if (left === 0)
                this.waiting.delete(sim.eid[vs]);
            sim.events.push(exports.EV_CREWED, sim.tick, team, sim.eid[vs], n, left, this.avail[team], 0, 0, cause);
        }
        return n;
    }
    /** The checked spawn produced vehicle slot vs with no crew: crew it from the pool (short: UNDERCREWED, waiting list). */
    crewNew(sim, vs, expert, building) {
        this.fill(sim, vs, expert, exports.PC_PRODUCED);
        const left = this.emptySeats(sim, vs).length;
        if (left > 0) {
            this.waiting.add(sim.eid[vs]);
            sim.events.push(exports.EV_UNDERCREWED, sim.tick, sim.team[vs], sim.eid[vs], building, left, sim.etype[vs], 0, 0, 0);
        }
    }
    /** Is slot vs within crewRadius of a friendly pilot home (Command Core, supplied Barracks, running Field Depot)? */
    atHome(sim, vs) {
        const d = sim.d, team = sim.team[vs], r = this.R.crewRadius;
        for (let o = 0; o < sim.hi; o++) {
            if (!sim.alive[o] || sim.team[o] !== team || sim.hp[o] <= 0 || !d.tPilotHome[sim.etype[o]] || !sim.homeServes(o))
                continue;
            if (sim.gap(vs, o) <= r)
                return true;
        }
        return false;
    }
    /** Crew order (Sim.crewVehicle): null on success (seats filled), else the refusal reason. */
    crewOrder(sim, team, vehicleId) {
        const vs = sim.idToSlot.get(vehicleId);
        if (vs === undefined || !sim.alive[vs] || sim.hp[vs] <= 0)
            return "unknownVehicle";
        if (sim.team[vs] !== team)
            return "notOwner";
        if (!sim.crewable(vs))
            return "notCrewable";
        if (sim.critTick[vs] >= 0)
            return "hullCritical";
        if (this.emptySeats(sim, vs).length === 0)
            return "vehicleCrewed";
        if (this.avail[team] <= 0)
            return "noPilotsAvailable";
        if (!this.atHome(sim, vs))
            return "crewNotAtBase";
        this.fill(sim, vs, 0, exports.PC_ORDER);
        return null;
    }
    /** Ruling 64: would team's first capture of point p (a citadel) still add pilots? */
    citadelOpen(sim, p, team) {
        return this.R.citadelPilots > 0 && !!sim.pts && p >= 0 && p < this.claimed.length && sim.pts.citadel[p] === 1 && (this.claimed[p] & (1 << team)) === 0;
    }
    /** Ruling 64, every tick: a team that owns a citadel for the first time gains citadelPilots. */
    citadels(sim) {
        const P = sim.pts, k = this.R.citadelPilots;
        if (!P || k <= 0)
            return;
        for (let p = 0; p < P.n; p++) {
            const o = P.owner[p];
            if (!P.citadel[p] || o < 0 || (this.claimed[p] & (1 << o)) !== 0)
                continue;
            this.claimed[p] |= 1 << o;
            this.avail[o] += k;
            this.gained[o] += k;
            sim.events.push(exports.EV_CITADEL_PILOTS, sim.tick, o, p, k, this.avail[o], 0, 0, 0, 0);
        }
    }
    /** Every autoTicks: waiting vehicles at a pilot home with no player aboard are crewed from the available pilots. */
    step(sim) {
        this.citadels(sim);
        if (this.waiting.size === 0 || sim.tick % this.R.autoTicks !== 0)
            return;
        for (const id of [...this.waiting].sort((a, b) => a - b)) {
            const vs = sim.idToSlot.get(id);
            if (vs === undefined || !sim.alive[vs] || sim.hp[vs] <= 0 || !sim.crewable(vs)) {
                this.waiting.delete(id);
                continue;
            }
            if (this.emptySeats(sim, vs).length === 0) {
                this.waiting.delete(id);
                continue;
            }
            if (this.avail[sim.team[vs]] <= 0 || sim.critTick[vs] >= 0 || sim.playerAboard(vs) || !this.atHome(sim, vs))
                continue;
            this.fill(sim, vs, 0, exports.PC_AUTO);
        }
    }
    /** Scenario start: the AI crews already seated are drawn from their team's pool (at most what it holds). */
    drawStarting(sim) {
        for (const p of sim.pilots.values()) {
            if (p.player >= 0 || p.state !== 0 || this.members.has(p.id) || this.avail[p.team] <= 0)
                continue;
            this.avail[p.team]--;
            this.members.add(p.id);
        }
    }
    hash(word) {
        for (let t = 0; t < MAXT; t++) {
            word(this.initial[t]);
            word(this.gained[t]);
            word(this.avail[t]);
            word(this.lost[t]);
        }
        word(this.claimed.length);
        for (const v of this.claimed)
            word(v);
        const m = [...this.members].sort((a, b) => a - b);
        word(m.length);
        for (const v of m)
            word(v);
        const w = [...this.waiting].sort((a, b) => a - b);
        word(w.length);
        for (const v of w)
            word(v);
    }
    exportTo(w) {
        for (let t = 0; t < MAXT; t++) {
            w.i32(this.initial[t]);
            w.i32(this.gained[t]);
            w.i32(this.avail[t]);
            w.i32(this.lost[t]);
        }
        w.i32(this.claimed.length);
        for (const v of this.claimed)
            w.u8(v);
        const m = [...this.members].sort((a, b) => a - b);
        w.i32(m.length);
        for (const v of m)
            w.i32(v);
        const q = [...this.waiting].sort((a, b) => a - b);
        w.i32(q.length);
        for (const v of q)
            w.i32(v);
    }
    restoreFrom(r) {
        for (let t = 0; t < MAXT; t++) {
            this.initial[t] = r.i32();
            this.gained[t] = r.i32();
            this.avail[t] = r.i32();
            this.lost[t] = r.i32();
        }
        {
            const n = r.i32();
            if (n !== this.claimed.length)
                throw new Error(`pilot reserve: state has ${n} points, map has ${this.claimed.length}`);
            for (let p = 0; p < n; p++)
                this.claimed[p] = r.u8();
        }
        this.members = new Set();
        for (let k = 0, n = r.i32(); k < n; k++)
            this.members.add(r.i32());
        this.waiting = new Set();
        for (let k = 0, n = r.i32(); k < n; k++)
            this.waiting.add(r.i32());
    }
}
exports.PilotPool = PilotPool;
