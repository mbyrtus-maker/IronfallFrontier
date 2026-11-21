"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lanes = void 0;
exports.laneRules = laneRules;
// Frontline stage 1: lane waves. A scenario with `lanes` turns the AI commander into a quartermaster for every team
// (the human team's base included): it still harvests, builds and produces (enemy-ai.ts steps 1-3), but its free combat
// units no longer expand or attack the Core on their own. They gather at their Core and leave in waves, one squad per
// lane in turn, attack-moving along the lane's waypoints to the enemy Command Core. A unit that went idle part way down
// a lane (it fought, or its order ended) picks the lane up again from the nearest waypoint ahead.
//
// Lane paths are written from team 0's Core to team 1's Core; team 1 walks them backwards.
// State (laneOf, lastWave) is page-local: Frontline stage 1 is solo only (not part of the hash or the exported state).
function laneRules(def, tickRate) {
    if (!def || !Array.isArray(def.paths) || def.paths.length === 0)
        throw new Error("lanes: scenario field lanes.paths must list at least one lane");
    const paths = def.paths.map((p, i) => {
        if (!Array.isArray(p.points) || p.points.length < 2)
            throw new Error(`lanes: lane ${i} needs at least 2 points`);
        return { name: String(p.name ?? `lane ${i}`), points: p.points.map(([x, z]) => [Number(x), Number(z)]) };
    });
    return {
        paths,
        waveTicks: Math.max(1, Math.round((def.waveSeconds ?? 45) * tickRate)),
        firstWaveTicks: Math.max(0, Math.round((def.firstWaveSeconds ?? 20) * tickRate)),
        gatherRadius: def.gatherRadiusMetres ?? 260,
        minWave: Math.max(1, def.minWaveUnits ?? 2),
        quartermasterTeams: Array.isArray(def.quartermasterTeams) ? def.quartermasterTeams : [0],
        difficulty: def.quartermasterDifficulty ?? "normal",
        techAfterTicks: Math.round((def.techAfterSeconds ?? 240) * tickRate),
    };
}
class Lanes {
    rules;
    /** eid -> lane index the unit was sent down. */
    laneOf = new Map();
    /** Per team: tick of the last wave sent. */
    lastWave = [-1e9, -1e9, -1e9, -1e9];
    /** Per team: next lane in turn. */
    turn = [0, 0, 0, 0];
    /** Per team and lane: a lane the team's players asked support for (stage 4); -1 none. */
    focus = [-1, -1, -1, -1];
    constructor(sim, def) {
        this.rules = laneRules(def, sim.d.constants.tickRate);
    }
    /**
     * The route a unit of `team` takes from waypoint list `wps`: up to and including the first strategic point on it that
     * the team does not hold (the wave stops in its ring until the point is taken: enemy-ai.ts keeps units capturing a
     * point out of `free`), else the whole list.
     */
    route(sim, team, wps) {
        const P = sim.pts;
        if (!P || !P.n || this.phase(sim) >= 2)
            return wps; // Frontline 4d: from the push on, waves march past the points to the Core
        return this.routeStop(sim, team, wps);
    }
    /** Frontline 4d pace (constants.frontline.pace): 0 opening, 1 faster waves, 2 the push (waves skip the points), 3 sudden
     *  death (Command Cores take more damage). */
    phase(sim) {
        const R = sim.fkit ? sim.fkit.R.pace : null;
        if (!R)
            return 0;
        const t = sim.tick;
        return t >= R.suddenTicks ? 3 : t >= R.pushTicks ? 2 : t >= R.fastTicks ? 1 : 0;
    }
    waveTicksNow(sim) {
        const R = sim.fkit ? sim.fkit.R.pace : null;
        return R && this.phase(sim) >= 1 ? R.lateWaveTicks : this.rules.waveTicks;
    }
    routeStop(sim, team, wps) {
        const P = sim.pts;
        for (let k = 0; k < wps.length; k++) {
            const [x, z] = wps[k];
            for (let p = 0; p < P.n; p++) {
                const dx = P.px[p] - x, dz = P.pz[p] - z;
                if (dx * dx + dz * dz < 30 * 30 && P.owner[p] !== team && !this.isCoreAt(sim, P.px[p], P.pz[p]))
                    return wps.slice(0, k + 1);
            }
        }
        return wps;
    }
    /** Is there a standing Command Core within 200 m of (x, z) (the citadels at the lane ends are attacked, not captured)? */
    isCoreAt(sim, x, z) {
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.tCore && sim.tCore[sim.etype[s]] && (sim.x[s] - x) ** 2 + (sim.z[s] - z) ** 2 < 200 * 200)
                return true;
        return false;
    }
    /** Team `team`'s waypoints for lane i (team 1 walks the lane backwards). */
    path(team, i) {
        const p = this.rules.paths[i].points;
        return team === 0 ? p : p.slice().reverse();
    }
    /** Units of `team` alive and assigned to each lane. */
    counts(sim, team) {
        const n = new Array(this.rules.paths.length).fill(0);
        for (const [eid, lane] of [...this.laneOf]) {
            const s = sim.idToSlot.get(eid);
            if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0) {
                this.laneOf.delete(eid);
                continue;
            }
            if (sim.team[s] === team)
                n[lane]++;
        }
        return n;
    }
    /** The rest of lane i for a unit at (x, z): from the first waypoint ahead of the nearest one. */
    restOf(team, i, x, z) {
        const p = this.path(team, i);
        let best = 0, bd = Infinity;
        p.forEach(([px, pz], k) => { const d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) {
            bd = d;
            best = k;
        } });
        // the nearest waypoint counts as passed once the unit is within 80 m of it, or further along than it
        const nextK = Math.min(p.length - 1, bd < 80 * 80 ? best + 1 : best);
        return p.slice(nextK);
    }
    /** Nearest lane to (x, z) for `team` (by distance to the lane's waypoints). */
    nearestLane(team, x, z) {
        let best = 0, bd = Infinity;
        this.rules.paths.forEach((_, i) => {
            for (const [px, pz] of this.path(team, i)) {
                const d = (px - x) ** 2 + (pz - z) ** 2;
                if (d < bd) {
                    bd = d;
                    best = i;
                }
            }
        });
        return best;
    }
    /**
     * Called by the commander (enemy-ai.ts decide) in place of its attack and expansion steps. `free` holds the team's idle
     * combat units the commander may assign; units driven by a player are never ordered.
     */
    dispatch(sim, team, next, df, free, busy, ownCore) {
        const R = this.rules;
        const units = [...free].filter((s) => !busy.has(s) && !sim.playerAboard(s)).sort((a, b) => sim.eid[a] - sim.eid[b]);
        if (!units.length)
            return;
        const ox = ownCore >= 0 ? sim.x[ownCore] : NaN, oz = ownCore >= 0 ? sim.z[ownCore] : NaN;
        const home = [], away = [];
        for (const s of units) {
            const dx = sim.x[s] - ox, dz = sim.z[s] - oz;
            if (ownCore >= 0 && dx * dx + dz * dz <= R.gatherRadius * R.gatherRadius)
                home.push(s);
            else
                away.push(s);
        }
        // Frontline 4a: raiders on their way to (or holding) a resource point keep at it until it is held
        const FK = sim.fkit;
        if (FK)
            for (const [eid, tm] of [...FK.raiders]) {
                const s = sim.idToSlot.get(eid);
                if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0 || tm.team !== team)
                    continue;
                if (sim.pts && sim.pts.owner[tm.p] === team) {
                    FK.raiders.delete(eid); // taken: back to the lanes
                    continue;
                }
                const i = away.indexOf(s);
                if (i >= 0) {
                    away.splice(i, 1);
                    busy.add(s);
                    sim.queueOrder(next, [eid], { type: "attackMove", waypoints: [[sim.pts.px[tm.p], sim.pts.pz[tm.p]]] }, team);
                }
            }
        // stragglers pick their lane up again
        for (const s of away) {
            const eid = sim.eid[s];
            const lane = this.laneOf.has(eid) ? this.laneOf.get(eid) : this.nearestLane(team, sim.x[s], sim.z[s]);
            this.laneOf.set(eid, lane);
            const rest = this.restOf(team, lane, sim.x[s], sim.z[s]);
            sim.queueOrder(next, [eid], { type: "attackMove", waypoints: this.route(sim, team, rest) }, team);
            busy.add(s);
        }
        // a wave leaves home when the timer comes round (and enough have gathered), or when a full squad per lane waits
        const due = sim.tick >= R.firstWaveTicks && sim.tick - this.lastWave[team] >= this.waveTicksNow(sim);
        const full = home.length >= df.squadSize * R.paths.length;
        if (!home.length || !(full || (due && home.length >= R.minWave)))
            return;
        this.lastWave[team] = sim.tick;
        const n = this.counts(sim, team);
        const focus = FK ? FK.focusOf(sim, team) : this.focus[team];
        // Frontline 4a: the ore / gas priority sends one squad to take the nearest unheld resource point first
        if (FK && home.length > 1) {
            let raiding = 0;
            for (const [eid, tm] of FK.raiders)
                if (tm.team === team && sim.idToSlot.has(eid))
                    raiding++;
            const rp = raiding ? -1 : FK.resourceTarget(sim, team, ox, oz);
            if (rp >= 0) {
                const grp = home.splice(0, Math.min(home.length - 1, df.squadSize));
                for (const s of grp) {
                    FK.raiders.set(sim.eid[s], { team, p: rp });
                    busy.add(s);
                }
                sim.queueOrder(next, grp.map((s) => sim.eid[s]), { type: "attackMove", waypoints: [[sim.pts.px[rp], sim.pts.pz[rp]]] }, team);
            }
        }
        // split the home units over the lanes: a requested lane (stage 4) first, then the emptiest lanes, in turn
        const order = R.paths.map((_, i) => i).sort((a, b) => (a === focus ? -1 : 0) - (b === focus ? -1 : 0) || n[a] - n[b] || ((a - this.turn[team] + R.paths.length) % R.paths.length) - ((b - this.turn[team] + R.paths.length) % R.paths.length));
        this.turn[team] = (this.turn[team] + 1) % R.paths.length;
        const per = Math.max(1, Math.ceil(home.length / R.paths.length));
        let k = 0;
        for (const lane of order) {
            // a requested lane takes half the wave; the rest is split over the other lanes
            const share = focus >= 0 ? (lane === focus ? Math.ceil(home.length / 2) : Math.max(1, Math.ceil((home.length - Math.ceil(home.length / 2)) / Math.max(1, R.paths.length - 1)))) : per;
            const grp = home.slice(k, k + share);
            k += share;
            if (!grp.length)
                break;
            const p = this.path(team, lane);
            for (const s of grp) {
                this.laneOf.set(sim.eid[s], lane);
                busy.add(s);
            }
            sim.queueOrder(next, grp.map((s) => sim.eid[s]), { type: "attackMove", waypoints: this.route(sim, team, p.slice(1)) }, team);
        }
    }
}
exports.Lanes = Lanes;
