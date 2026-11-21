"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingFx = exports.UP_RESERVE = exports.UP_HARVEST = exports.UP_RANGE = exports.UP_ARMOUR = exports.UPGRADE_NAMES = void 0;
exports.bfxRules = bfxRules;
// Building effects that existed in data only (fix-qa2; design doc 9 buildings table and rules, doc 10 "Mission
// upgrades", doc 8 transport options). Absent data for a part: that part is off.
//
// 1. Shield Projector (effects.domeRadius, domeShield, gasPerAbsorbedDamage; doc 9 "Energy dome over the point; drains
//    gas while absorbing hits"): each standing own projector that is supplied (on a map with points) and not disabled
//    by a hack holds a dome of domeShield points. Damage from another team to a unit or structure of its team whose
//    body is within domeRadius of the projector is absorbed by the dome first, costing gasPerAbsorbedDamage gas per
//    point from the team stockpile (no gas: nothing absorbed). The dome refills like a vehicle shield
//    (constants.vehicleShield: after rechargeDelaySeconds without absorbing, rechargeFractionPerSecond of domeShield
//    per second; ASSUMPTIONS).
// 2. Tech Lab mission upgrades (effects.missionUpgrades; constants.missionUpgrades): bought at an own standing,
//    supplied Tech Lab with gas, once each per team, for the mission: armourPlating (the team's vehicles take
//    damageTakenMultiplier of their damage), turretRange (the team's armed structures reach rangeMultiplier further),
//    fasterHarvesters (speedMultiplier on units with harvestsDeposits), largerReserve (extraReserveSlots in the reserve).
// 3. Manned towers (buildings.json manned: rangeMultiplier, spreadMultiplier; doc 9 "Players and squads can man Gun
//    Towers ...; a manned tower gains range and accuracy"): a pilot on foot within crew.enterRangeMetres of an own
//    tower with `manned` data mans it (stays beside it, exposed); while the pilot stays alive, on foot and in reach,
//    the tower's weapons reach rangeMultiplier further and its shot dispersion is x spreadMultiplier.
// 4. Mass Driver (effects.podOre, maxPlanetGravity, pairsTwoPoints, podFlightSeconds; doc 8 "100-ore pods between two
//    points; instant, unraidable in flight; only at 0.4 g or below; fixed endpoints"): not buildable on a planet above
//    maxPlanetGravity (construction.ts). A standing own Mass Driver with a second standing own one on another point
//    (the pair) is an ore drop-off for harvesters (mining.ts): the load is shot home as pods, arriving at once
//    (podFlightSeconds 0) in the stockpile, so harvesters at a far ore field need not drive to the Refinery.
// 5. Export (effects.export, the Launch Pad uplink; doc 4 Extraction quota, doc 9 "export"): exportCargo ships ore and
//    gas from the team stockpile off-world at an own standing, supplied uplink; the shipped totals count for the
//    extractionQuota objective (objectives.ts).
// Inputs: action ACT_FIXQA2 (59) sub-commands a = 4 export (b uplink id, c ore, x gas), a = 1 buy upgrade (b Tech Lab id, c upgrade index in UPGRADE_NAMES),
// a = 2 man (b pilot id, c tower id), a = 3 leave the tower (b pilot id). (a = 0 is the reserve mode, reserve.ts.)
// State (hashed, exported): dome pools and last absorb ticks by projector id, upgrades per team, manned towers.
const s15_ts_1 = require("./s15.js");
const data_ts_1 = require("./data.js");
exports.UPGRADE_NAMES = ["armourPlating", "turretRange", "fasterHarvesters", "largerReserve"];
exports.UP_ARMOUR = 0, exports.UP_RANGE = 1, exports.UP_HARVEST = 2, exports.UP_RESERVE = 3;
function bfxRules(data, unitCount, nTypes) {
    const blds = data.buildings;
    const domeR = new Float64Array(nTypes), domeS = new Float64Array(nTypes), domeGas = new Float64Array(nTypes), domeFloor = new Float64Array(nTypes), lab = new Uint8Array(nTypes);
    const manRange = new Float64Array(nTypes), manSpread = new Float64Array(nTypes), driver = new Uint8Array(nTypes), driverMaxG = new Float64Array(nTypes), harvester = new Uint8Array(nTypes), uplink = new Uint8Array(nTypes);
    blds.forEach((b, i) => {
        const t = unitCount + i, e = b.effects ?? {};
        if (typeof e.domeRadius === "number" && typeof e.domeShield === "number") {
            domeR[t] = e.domeRadius;
            domeS[t] = e.domeShield;
            domeGas[t] = typeof e.gasPerAbsorbedDamage === "number" ? e.gasPerAbsorbedDamage : 0;
            domeFloor[t] = typeof e.domeGasFloor === "number" ? e.domeGasFloor : 0;
        }
        if (e.missionUpgrades === true)
            lab[t] = 1;
        if (b.manned && typeof b.manned.rangeMultiplier === "number") {
            manRange[t] = b.manned.rangeMultiplier;
            manSpread[t] = typeof b.manned.spreadMultiplier === "number" ? b.manned.spreadMultiplier : 1;
        }
        if (e.export === true)
            uplink[t] = 1;
        if (e.pairsTwoPoints === true) {
            driver[t] = 1;
            driverMaxG[t] = typeof e.maxPlanetGravity === "number" ? e.maxPlanetGravity : Infinity;
        }
    });
    data.units.forEach((u, i) => { if (u.harvestsDeposits === true)
        harvester[i] = 1; });
    const mu = data.constants.missionUpgrades ?? {};
    const val = (k, f) => (typeof mu[k]?.[f] === "number" ? mu[k][f] : 0);
    const upCost = exports.UPGRADE_NAMES.map((k) => (typeof mu[k]?.gas === "number" ? mu[k].gas : -1));
    const upValue = [val("armourPlating", "damageTakenMultiplier"), val("turretRange", "rangeMultiplier"), val("fasterHarvesters", "speedMultiplier"), val("largerReserve", "extraReserveSlots")];
    return { domeR, domeS, domeGas, domeFloor, lab, upCost, upValue, manRange, manSpread, driver, driverMaxG, harvester, uplink };
}
class BuildingFx {
    R;
    /** projector id -> [pool, last absorb tick]. */
    domes = new Map();
    /** per team: bitmask of UPGRADE_NAMES bought. */
    up = new Uint8Array(4);
    /** tower id -> pilot id manning it. */
    manned = new Map();
    /** per team: ore, gas shipped off-world (extraction quota; [2 t], [2 t + 1]). */
    exported = new Float64Array(8);
    /** Derived each step (not state): live projector slots, manned tower slots in reach. */
    projSlots = [];
    mannedOk = new Set();
    constructor(R) { this.R = R; }
    has(team, u) { return (this.up[team] & (1 << u)) !== 0; }
    /** Buy upgrade u at Tech Lab id for team. */
    buy(sim, team, labId, u) {
        const s = sim.idToSlot.get(labId);
        if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0 || !this.R.lab[sim.etype[s]])
            return "unknownBuilding";
        if (sim.team[s] !== team)
            return "notOwner";
        if (sim.con && sim.con.underConstruction(labId))
            return "underConstruction";
        if (sim.pts && !sim.pts.structureSupplied(sim, s))
            return "pointUnsupplied";
        if (!(u >= 0 && u < exports.UPGRADE_NAMES.length) || this.R.upCost[u] < 0)
            return "unknownUnitType";
        if (this.has(team, u))
            return "queueFull";
        if (sim.gas[team] + 1e-9 < this.R.upCost[u])
            return "cannotAfford";
        sim.gas[team] -= this.R.upCost[u];
        this.up[team] |= 1 << u;
        return null;
    }
    /** Pilot pilotId (on foot) mans tower towerId of his team. */
    man(sim, pilotId, towerId, team) {
        const p = sim.pilots.get(pilotId);
        if (!p || p.state === 2)
            return "unknownPilot";
        if (team !== undefined && p.team !== team)
            return "notOwner";
        if (p.state !== 1)
            return "pilotNotOnFoot";
        const ts = sim.idToSlot.get(towerId), ps = sim.idToSlot.get(p.entity);
        if (ts === undefined || ps === undefined || !sim.alive[ts] || sim.hp[ts] <= 0 || this.R.manRange[sim.etype[ts]] <= 0)
            return "unknownBuilding";
        if (sim.team[ts] !== p.team)
            return "notOwner";
        if (sim.gap(ps, ts) > sim.d.crew.enterRange)
            return "tooFar";
        for (const [tw, pl] of this.manned)
            if (pl === pilotId && tw !== towerId)
                this.manned.delete(tw);
        const cur = this.manned.get(towerId);
        if (cur !== undefined && cur !== pilotId && this.crewOk(sim, towerId, cur))
            return "seatOccupied";
        this.manned.set(towerId, pilotId);
        return null;
    }
    unman(pilotId) {
        for (const [tw, pl] of this.manned)
            if (pl === pilotId) {
                this.manned.delete(tw);
                return null;
            }
        return "unknownPilot";
    }
    crewOk(sim, towerId, pilotId) {
        const p = sim.pilots.get(pilotId), ts = sim.idToSlot.get(towerId);
        if (!p || p.state !== 1 || ts === undefined || !sim.alive[ts] || sim.hp[ts] <= 0 || sim.team[ts] !== p.team)
            return false;
        const ps = sim.idToSlot.get(p.entity);
        return ps !== undefined && sim.hp[ps] > 0 && sim.gap(ps, ts) <= sim.d.crew.enterRange + 1;
    }
    isManned(sim, towerSlot) { return this.mannedOk.has(towerSlot); }
    /** Range multiplier of structure slot s's weapons (manned tower, turret-range upgrade). */
    rangeMul(s, team) {
        let m = 1;
        if (this.mannedOk.size && this.mannedOk.has(s))
            m *= this.R.manRange[this.etypeOf(s)];
        if (this.up[team] & (1 << exports.UP_RANGE))
            m *= this.R.upValue[exports.UP_RANGE] || 1;
        return m;
    }
    et = null;
    etypeOf(s) { return this.et ? this.et[s] : 0; }
    /** Harvester speed multiplier (fasterHarvesters) for slot s. */
    speedMul(sim, s) {
        return this.R.harvester[sim.etype[s]] && (this.up[sim.team[s]] & (1 << exports.UP_HARVEST)) ? this.R.upValue[exports.UP_HARVEST] || 1 : 1;
    }
    /** Extra reserve slots (largerReserve). */
    reserveExtra(team) { return this.has(team, exports.UP_RESERVE) ? Math.round(this.R.upValue[exports.UP_RESERVE]) : 0; }
    /** Mass Driver slot o is a working ore drop-off: a standing own pair on another point, gravity within the limit. */
    driverDrop(sim, o) {
        const t = sim.etype[o];
        if (!this.R.driver[t] || sim.d.gravityG > this.R.driverMaxG[t] + 1e-9)
            return false;
        const P = sim.pts;
        const po = P ? P.pointAt(sim.x[o], sim.z[o]) : -1;
        for (let s = 0; s < sim.hi; s++) {
            if (s === o || !sim.alive[s] || sim.hp[s] <= 0 || sim.etype[s] !== t || sim.team[s] !== sim.team[o])
                continue;
            if (sim.con && sim.con.underConstruction(sim.eid[s]))
                continue;
            if (!P || P.pointAt(sim.x[s], sim.z[s]) !== po)
                return true;
        }
        return false;
    }
    /**
     * Damage dmg about to hit slot e from shooterTeam (sim.applyDamage, before the target's own shield): armour plating,
     * then a covering dome absorbs what it can. Returns the damage left.
     */
    damage(sim, e, dmg, shooterTeam) {
        const team = sim.team[e], d = sim.d;
        if (team === shooterTeam)
            return dmg;
        if (this.up[team] & (1 << exports.UP_ARMOUR) && d.tVehicle[sim.etype[e]])
            dmg *= this.R.upValue[exports.UP_ARMOUR] || 1;
        for (const ps of this.projSlots) {
            if (sim.team[ps] !== team)
                continue;
            const t = sim.etype[ps], r = this.R.domeR[t] + d.tRadius[sim.etype[e]];
            if ((sim.x[e] - sim.x[ps]) ** 2 + (sim.z[e] - sim.z[ps]) ** 2 > r * r)
                continue;
            const rec = this.domes.get(sim.eid[ps]);
            if (!rec || rec[0] <= 0)
                continue;
            const g = this.R.domeGas[t];
            let a = Math.min(dmg, rec[0]);
            if (g > 0)
                a = Math.min(a, sim.gas[team] / g);
            if (a <= 0)
                continue;
            rec[0] -= a;
            rec[1] = sim.tick;
            sim.gas[team] = Math.max(0, sim.gas[team] - a * g);
            dmg -= a;
            if (dmg <= 0)
                return 0;
        }
        return dmg;
    }
    /** True when any state exists (hash / export only then). */
    used() { return this.domes.size > 0 || this.manned.size > 0 || this.up.some((v) => v !== 0) || this.exported.some((v) => v !== 0); }
    /** Ship ore / gas off-world at own Launch Pad uplink upId (doc 4 Extraction quota, doc 9 "export"). */
    exportCargo(sim, team, upId, ore, gas) {
        const s = sim.idToSlot.get(upId);
        if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0 || !this.R.uplink[sim.etype[s]])
            return "unknownBuilding";
        if (sim.team[s] !== team)
            return "notOwner";
        if (sim.con && sim.con.underConstruction(upId))
            return "underConstruction";
        if (sim.pts && (!sim.pts.structureSupplied(sim, s) || (sim.pts.cores.size && sim.pts.coreDisabled(upId, sim.tick))))
            return "pointUnsupplied";
        if (!(ore >= 0) || !(gas >= 0) || !Number.isFinite(ore) || !Number.isFinite(gas))
            return "cannotAfford";
        if (sim.ore[team] + 1e-9 < ore || sim.gas[team] + 1e-9 < gas)
            return "cannotAfford";
        sim.ore[team] -= ore;
        sim.gas[team] -= gas;
        this.exported[2 * team] += ore;
        this.exported[2 * team + 1] += gas;
        return null;
    }
    /** Rebuilds the derived per-step sets from the state (after a restore, so the next tick matches the original). */
    derive(sim) {
        this.et = sim.etype;
        this.projSlots.length = 0;
        for (let k = 0; k < sim.nLive; k++) {
            const s = sim.live[k];
            if (!sim.alive[s] || sim.hp[s] <= 0 || this.R.domeR[sim.etype[s]] <= 0 || !this.domes.has(sim.eid[s]))
                continue;
            if (sim.con && sim.con.underConstruction(sim.eid[s]))
                continue;
            if (sim.pts && (!sim.pts.structureSupplied(sim, s) || (sim.pts.cores.size && sim.pts.coreDisabled(sim.eid[s], sim.tick))))
                continue;
            if (sim.weather !== null && sim.weather.e.shieldsOff)
                continue; // ruling 68
            if (sim.gas[sim.team[s]] + 1e-9 < (0, s15_ts_1.domeGasFloor)(sim, sim.team[s], this.R.domeFloor[sim.etype[s]]))
                continue; // ruling 86
            this.projSlots.push(s);
        }
        this.mannedOk.clear();
        for (const [tw, pl] of this.manned)
            if (this.crewOk(sim, tw, pl))
                this.mannedOk.add(sim.idToSlot.get(tw));
    }
    step(sim) {
        const d = sim.d, c = d.constants;
        this.et = sim.etype;
        // projectors: live, supplied, not hack-disabled
        this.projSlots.length = 0;
        const seen = new Set();
        for (let k = 0; k < sim.nLive; k++) {
            const s = sim.live[k];
            if (!sim.alive[s] || sim.hp[s] <= 0 || this.R.domeR[sim.etype[s]] <= 0)
                continue;
            const id = sim.eid[s];
            if (sim.con && sim.con.underConstruction(id))
                continue;
            seen.add(id);
            let rec = this.domes.get(id);
            if (!rec) {
                rec = [this.R.domeS[sim.etype[s]], -1 << 30];
                this.domes.set(id, rec);
            }
            if (sim.pts && (!sim.pts.structureSupplied(sim, s) || (sim.pts.cores.size && sim.pts.coreDisabled(id, sim.tick))))
                continue;
            if (sim.weather !== null && sim.weather.e.shieldsOff) {
                rec[0] = 0;
                continue;
            } // ruling 68: a solar flare takes the dome down (it refills after)
            if (sim.gas[sim.team[s]] + 1e-9 < (0, s15_ts_1.domeGasFloor)(sim, sim.team[s], this.R.domeFloor[sim.etype[s]]))
                continue; // ruling 86: below the gas reserve the dome is off
            const max = this.R.domeS[sim.etype[s]];
            if (rec[0] < max && c.vehShieldFracPerTick > 0 && sim.tick - rec[1] >= c.vehShieldDelayTicks)
                rec[0] = Math.min(max, rec[0] + max * c.vehShieldFracPerTick);
            this.projSlots.push(s);
        }
        for (const id of [...this.domes.keys()])
            if (!seen.has(id))
                this.domes.delete(id);
        // manned towers in reach; range and spread of affected structures
        this.mannedOk.clear();
        for (const [tw, pl] of [...this.manned]) {
            if (!this.crewOk(sim, tw, pl)) {
                const p = sim.pilots.get(pl);
                if (!p || p.state !== 1 || !sim.idToSlot.has(tw))
                    this.manned.delete(tw);
                continue;
            }
            this.mannedOk.add(sim.idToSlot.get(tw));
        }
        // every armed structure: weapon reach and dispersion from its manning and the team's turret-range upgrade
        for (let k = 0; k < sim.nLive; k++) {
            const s = sim.live[k];
            if (!sim.alive[s] || !d.tStructure[sim.etype[s]] || sim.mCount[s] === 0)
                continue;
            const man = this.mannedOk.has(s), up = (this.up[sim.team[s]] & (1 << exports.UP_RANGE)) !== 0;
            if (!man && !up && this.R.manRange[sim.etype[s]] <= 0)
                continue; // towers that can be manned are always set (manning can end)
            const mul = this.rangeMul(s, sim.team[s]), spread = man ? this.R.manSpread[sim.etype[s]] : 1;
            let maxR = 0;
            for (let m = 0; m < sim.mCount[s]; m++) {
                const w = sim.mWeapon[s * data_ts_1.MAX_MOUNTS + m];
                if (w >= 0 && d.wRange[w] > maxR)
                    maxR = d.wRange[w];
                sim.mAimMul[s * data_ts_1.MAX_MOUNTS + m] = spread;
            }
            sim.maxRange[s] = maxR * mul;
        }
    }
    hash(word, num) {
        const ds = [...this.domes.keys()].sort((a, b) => a - b);
        word(ds.length);
        for (const id of ds) {
            const r = this.domes.get(id);
            word(id);
            num(r[0]);
            word(r[1]);
        }
        for (let t = 0; t < 4; t++)
            word(this.up[t]);
        const ms = [...this.manned.keys()].sort((a, b) => a - b);
        word(ms.length);
        for (const id of ms) {
            word(id);
            word(this.manned.get(id));
        }
        for (const v of this.exported)
            num(v);
    }
    exportTo(w) {
        const ds = [...this.domes.keys()].sort((a, b) => a - b);
        w.i32(ds.length);
        for (const id of ds) {
            const r = this.domes.get(id);
            w.i32(id);
            w.f64(r[0]);
            w.i32(r[1]);
        }
        for (let t = 0; t < 4; t++)
            w.u8(this.up[t]);
        const ms = [...this.manned.keys()].sort((a, b) => a - b);
        w.i32(ms.length);
        for (const id of ms) {
            w.i32(id);
            w.i32(this.manned.get(id));
        }
        for (const v of this.exported)
            w.f64(v);
    }
    restoreFrom(r) {
        this.domes.clear();
        for (let k = 0, n = r.i32(); k < n; k++) {
            const id = r.i32();
            const pool = r.f64();
            this.domes.set(id, [pool, r.i32()]);
        }
        for (let t = 0; t < 4; t++)
            this.up[t] = r.u8();
        this.manned.clear();
        for (let k = 0, n = r.i32(); k < n; k++) {
            const id = r.i32();
            this.manned.set(id, r.i32());
        }
        for (let k = 0; k < 8; k++)
            this.exported[k] = r.f64();
    }
}
exports.BuildingFx = BuildingFx;
