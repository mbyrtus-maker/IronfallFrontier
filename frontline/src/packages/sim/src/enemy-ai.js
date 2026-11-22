"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnemyAi = exports.SEEN_INFANTRY = exports.SEEN_HEAVY = exports.SEEN_TOWER = exports.SEEN_AIR = exports.DIRECTOR_PHASES = exports.DP_LULL = exports.DP_PRESSURE = exports.DP_PROBE = exports.DP_BUILD_UP = void 0;
exports.aiRules = aiRules;
// Sim-side enemy commander (stage 2 s7; design doc 17 "an AI opponent that plays by the same strategic rules").
// Plays each team flagged `ai` in SimOptions.match. It is a pure function of the sim state: it keeps NO state of its
// own (nothing to hash or export beyond the match definition), and it acts only through the same tick-stamped input
// queues a player uses (queueOrder, queueProduction, queueHarvest, all stamped for the next tick), so a restore
// mid-match continues identically and every decision is visible as ordinary inputs, ORDER_ACK and QUEUE events.
//
// It thinks on a slow tick: every constants.enemyAi.difficulties.<d>.decisionSeconds, staggered by team; never every tick.
// One decision, in order:
//   1. Harvesters: any of its harvesters that left the mining loop (manual, or idle while ore is left) gets a harvest order.
//   2. Production: harvesters below `harvestersWanted` (alive + queued) are queued first; then every production
//      building whose queue holds fewer than `maxQueuedPerBuilding` items gets the next build-list item it can make
//      (producer, tier open, affordable now; S14: pilots for its operator seats left after everything already queued,
//      combat vehicles keeping pilots.reservePilots back for economy vehicles; ruling 65: an infantry squad only under
//      the Barracks cap), the list read from
//      an offset that rotates with the force size so the mix varies; `fallbackUnits` only when the stock cannot pay
//      the gas of any build-list item.
//   3. Defence: a held point flagged under attack draws up to `defendSquads` x `squadSize` of the nearest free combat
//      units (idle ones first, then ones on capture runs), attack-moving to its centre.
//   4. Attack: with combat squads worth at least `attackThreshold` ore alive (army.ts armyStrength; S14: was Command
//      Points) (or the unit count within one
//      squad of the per-side cap, s8), every combat unit but the home guard (s8)
//      unit not already heading for it attack-moves on the enemy Command Core (the nearest one standing).
//   5. Expansion: otherwise idle combat units (no order; not sitting in the ring of a point its team is capturing) are
//      grouped by id into squads of `squadSize`; each squad attack-moves to the nearest point its team does not own
//      that is linked to one of its supplied points and holds no enemy Core (repeat picks of one point cost 400 m), in a
//      wedge centred on the point. Defence also uses a wedge; the Core attack orders units one by one onto the Core.
// Units drive straight (no pathfinding).
//
// S14 pilots (enemyAi.pilots; rulings 47-48, 64-65): every crewOrderSeconds an own vehicle with empty operator seats at a
// pilot home gets a crew order (ACT_CREW); with no pilot available and at most lastCrews alive, crewed vehicles stay out
// of raids, capture runs and Core attacks (infantry still go; they still defend held points); on huntPilots difficulties
// idle combat units attack detected enemy pilots on foot within huntRadiusMetres; a citadel never captured costs
// citadelValueMetres less as a capture target; with its infantry squads at the Barracks cap it builds another Barracks
// (up to maxBarracks). Its own pilots on foot walk home or re-board a near empty vehicle by the unit rules (sim.ts
// sendHome, pilotkit.ts kitAiReboard).
//
// s13 Director (design doc 17 layer 1; constants.enemyAi.director; absent: the commander alone, as before). It paces
// each AI team on a slow tick (director.decisionSeconds, rounded to whole commander decisions, run just before the
// commander's decision on the same tick). Its state is in Match (dirPhase / dirStart / dirWaves: hashed, exported).
//   phases  buildUp (once, buildUpSeconds) -> probe (probeSeconds) -> pressure (pressureSeconds) -> lull (lullSeconds x
//           the difficulty's lullScale) -> probe -> ... The commander attacks the enemy Core ONLY in pressure; in build-up
//           and lull it expands, defends and builds. Momentum: a pressure phase whose wave is spent (combat force below
//           spentFraction of the wave) ends early in a lull.
//   waves   wave (ore) = attackThreshold x waveSize(players) x (1 + waveGrowth x waves sent), at most maxWaveBudgetFraction
//           of the team's army ceiling (army.ts: pilots.ceilingOrePerPilot x live pilots + its infantry; S14: was the CP
//           budget), so it stays reachable; after commitFraction of the pressure phase it goes with
//           whatever reaches commitWaveFraction of the wave. waveSize / raidsAtOnce from constants.coop.scaling[players].
//   raids   in probe, on each Director tick, up to raidsAtOnce squads of idle combat units go for the weakest enemy target:
//           a detected enemy Harvester or an enemy-held point; cost = distance + raidDefenderMetres x detected enemy
//           combat units within raidDefenceRadiusMetres of it.
//   retreat a combat unit below retreatHullFraction of its hull, away from its Core, gets a retreat order (to the Core);
//           at home it is not sent out again (it stays as home guard; vehicles are repaired only by pilot torches today).
const transport_ts_1 = require("./transport.js");
const data_ts_1 = require("./data.js");
const points_ts_1 = require("./points.js");
const calls_ts_1 = require("./calls.js");
const objectives_ts_1 = require("./objectives.js");
const orders_ts_1 = require("./orders.js");
const army_ts_1 = require("./army.js");
/**
 * w2a enemy-commander support calls (supportCalls.sim.commanderCalls; absent, or no entry for the team's difficulty: no
 * calls). The commander has its own caller record (Sim.commanderCaller), so its calls have cooldowns, requirements (a
 * supplied Relay Tower for strikes, barrages and sweeps) and beacons like a pilot's, and it acts through the
 * tick-stamped ACT_CMD_CALL input. On a decision tick at least intervalSeconds[difficulty] after its last call (its
 * latest beacon, or impact as read from the cooldowns), at most one call, first of:
 *   1. barrage (barrageMinUnits) or precision strike (strikeMinUnits) on the densest detected enemy cluster (enemy units
 *      within clusterRadiusMetres of one of them), never with its own units inside the call's radius;
 *   2. sentry gun at a held point under attack, or beside its Command Core when a detected enemy is within
 *      sentryThreatRadiusMetres of it;
 *   3. sensor sweep on the enemy Command Core when it is about to attack (Director pressure phase; without a Director,
 *      combat force at the attack threshold).
 */
/** = Sim.commanderCaller (not imported: sim.ts imports this module). */
const Sim_commanderCaller = (team) => -1 - team;
function commanderCallRules(data, tickRate) {
    const r = data.supportCalls?.sim?.commanderCalls;
    if (!r)
        return null;
    const interval = new Map();
    for (const [k, v] of Object.entries(r.intervalSeconds ?? {}))
        if (typeof v === "number" && v > 0)
            interval.set(k, Math.round(v * tickRate));
    return { loadout: r.loadout ?? [], interval, clusterRadius: r.clusterRadiusMetres ?? 0, strikeMin: r.strikeMinUnits ?? 0, barrageMin: r.barrageMinUnits ?? 0, sentryThreat: r.sentryThreatRadiusMetres ?? 0 };
}
const MAXT = 4;
const ORD_NONE = 0, ORD_MOVE = 1, ORD_ATTACK_MOVE = 2; // = sim.ts ORD_*
/** Distance penalty (m) per squad already sent to a point in the same decision (spreads squads over targets). */
const SPREAD_PENALTY = 400;
/** w3b: distance penalty (m) for a capture target the group cannot drive into (impassable terrain cell). */
const TERRAIN_PENALTY = 100000;
/** Director phases (Match.dirPhase). */
exports.DP_BUILD_UP = 0, exports.DP_PROBE = 1, exports.DP_PRESSURE = 2, exports.DP_LULL = 3;
exports.DIRECTOR_PHASES = ["buildUp", "probe", "pressure", "lull"];
/** w3b counter classes (bit per class). */
exports.SEEN_AIR = 1, exports.SEEN_TOWER = 2, exports.SEEN_HEAVY = 4, exports.SEEN_INFANTRY = 8;
const SEEN_NAMES = { air: exports.SEEN_AIR, tower: exports.SEEN_TOWER, heavy: exports.SEEN_HEAVY, infantry: exports.SEEN_INFANTRY };
function need(v, path, min = 0) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min)
        throw new Error(`enemy AI: data field constants.enemyAi.${path} missing or not a number >= ${min}`);
    return v;
}
/** Reads constants.enemyAi (error names the missing field). */
function aiRules(data, tickRate) {
    const e = data.constants.enemyAi;
    if (!e || typeof e !== "object")
        throw new Error("enemy AI: the scenario has an AI team but the data has no constants.enemyAi");
    const ids = data.units.map((u) => u.id);
    const unitList = (v, path) => {
        if (!Array.isArray(v))
            throw new Error(`enemy AI: constants.enemyAi.${path} must be a list of unit ids`);
        return v.map((id) => { const t = ids.indexOf(id); if (t < 0)
            throw new Error(`enemy AI: constants.enemyAi.${path}: unknown unit ${id}`); return t; });
    };
    const difficulties = new Map();
    for (const [k, d] of Object.entries(e.difficulties ?? {})) {
        difficulties.set(k, {
            decisionTicks: Math.max(1, Math.round(need(d.decisionSeconds, `difficulties.${k}.decisionSeconds`) * tickRate)),
            squadSize: Math.max(1, Math.round(need(d.squadSize, `difficulties.${k}.squadSize`, 1))),
            attackThreshold: Math.max(1, Math.round(need(d.attackThreshold, `difficulties.${k}.attackThreshold`, 1))),
            homeGuardSquads: Math.round(need(d.homeGuardSquads, `difficulties.${k}.homeGuardSquads`)),
            coreTowers: Math.round(need(d.coreTowers, `difficulties.${k}.coreTowers`)),
            towersPerPoint: Math.round(need(d.towersPerPoint, `difficulties.${k}.towersPerPoint`)),
            lullScale: e.director ? need(d.lullScale, `difficulties.${k}.lullScale`) : 1,
            huntPilots: d.huntPilots === true,
            tierLists: d.buildLists ? [0, 1, 2, 3].map((j) => (j === 0 ? [] : unitList(d.buildLists[String(j)] ?? [], `difficulties.${k}.buildLists.${j}`))) : null,
            saveForCounters: d.saveForCounters === true, saveForListItem: d.saveForListItem === true,
            ferry: {
                chance: d.ferryChance === undefined ? null : need(d.ferryChance, `difficulties.${k}.ferryChance`),
                cooldownTicks: d.ferryCooldownSeconds === undefined ? null : Math.round(need(d.ferryCooldownSeconds, `difficulties.${k}.ferryCooldownSeconds`) * tickRate),
                minDistance: d.ferryMinDistanceMetres === undefined ? null : need(d.ferryMinDistanceMetres, `difficulties.${k}.ferryMinDistanceMetres`),
            },
        });
    }
    return {
        difficulties, buildList: unitList(e.buildList, "buildList"), fallback: unitList(e.fallbackUnits ?? [], "fallbackUnits"),
        tierLists: e.tierBuildListsEnabled === true && e.tierBuildLists ? [0, 1, 2, 3].map((k) => (k === 0 ? [] : unitList(e.tierBuildLists[String(k)] ?? [], `tierBuildLists.${k}`))) : null,
        harvestersWanted: Math.round(need(e.harvestersWanted, "harvestersWanted")), maxQueued: Math.max(1, Math.round(need(e.maxQueuedPerBuilding, "maxQueuedPerBuilding", 1))),
        defendSquads: Math.round(need(e.defendSquads, "defendSquads")),
        constructorsWanted: Math.round(need(e.constructorsWanted, "constructorsWanted")),
        storageFullFraction: need(e.storageFullFraction, "storageFullFraction"), guardRadius: need(e.homeGuardRadiusMetres, "homeGuardRadiusMetres"),
        maxStorageBuildings: Math.round(need(e.maxStorageBuildings, "maxStorageBuildings")),
        director: e.director ? directorRules(data, e.director, tickRate) : null,
        counters: (Array.isArray(e.counters) ? e.counters : []).map((c, i) => {
            const seen = SEEN_NAMES[c.seen];
            if (!seen)
                throw new Error(`enemy AI: constants.enemyAi.counters.${i}.seen must be one of ${Object.keys(SEEN_NAMES).join(", ")}`);
            return { seen, minSeen: Math.max(1, Math.round(need(c.minSeen, `counters.${i}.minSeen`, 1))), units: unitList(c.units, `counters.${i}.units`), perSeen: need(c.perSeen, `counters.${i}.perSeen`) };
        }),
        systems: e.systems ? {
            reactorBelowPower: typeof e.systems.reactorBelowPower === "number" ? e.systems.reactorBelowPower : 0,
            forwardBasesWanted: Math.round(need(e.systems.forwardBasesWanted, "systems.forwardBasesWanted")), repairBaysWanted: Math.round(need(e.systems.repairBaysWanted, "systems.repairBaysWanted")),
            airliftMinDistance: need(e.systems.airliftMinDistanceMetres, "systems.airliftMinDistanceMetres"), airStrikeRadius: need(e.systems.airStrikeRadiusMetres, "systems.airStrikeRadiusMetres"),
            airReturnHull: need(e.systems.airReturnHullFraction, "systems.airReturnHullFraction"),
        } : null,
        baseProduction: e.baseBuildOrder?.production ?? [], baseTech: e.baseBuildOrder?.tech ?? ["armoury", "tech-lab"],
        pilots: e.pilots ? {
            reservePilots: Math.round(need(e.pilots.reservePilots, "pilots.reservePilots")), lastCrews: Math.round(need(e.pilots.lastCrews, "pilots.lastCrews")),
            huntRadius: need(e.pilots.huntRadiusMetres, "pilots.huntRadiusMetres"), crewTicks: Math.max(1, Math.round(need(e.pilots.crewOrderSeconds, "pilots.crewOrderSeconds", 0.05) * tickRate)),
            citadelValue: typeof e.pilots.citadelValueMetres === "number" ? e.pilots.citadelValueMetres : 0,
        } : null,
        maxBarracks: typeof e.maxBarracks === "number" ? Math.round(e.maxBarracks) : 0,
        waves: e.waves ? waveRules(e.waves, tickRate) : null,
    };
}
function waveRules(w, tickRate) {
    const n = (k, min = 0) => need(w[k], `waves.${k}`, min);
    const formation = w.formation ?? "wedge";
    if (!orders_ts_1.FORMATIONS.includes(formation) || formation === "none")
        throw new Error(`enemy AI: constants.enemyAi.waves.formation must be one of ${orders_ts_1.FORMATIONS.filter((f) => f !== "none").join(", ")}`);
    return {
        rallyFraction: n("rallyFraction"), minRallyFraction: n("minRallyFraction"), rallyClearance: n("rallyClearanceMetres"), rallyRadius: n("rallyRadiusMetres"),
        gatherFraction: n("gatherFraction"), formation: formation, coreRadius: n("coreRadiusMetres"), pointAttackFraction: n("pointAttackFraction"),
        counterWindowTicks: Math.round(n("counterWindowSeconds") * tickRate), counterRadius: n("counterRadiusMetres"), counterMinHits: Math.round(n("counterMinHits", 1)),
        counterForceRatio: n("counterForceRatio"), rebuildFraction: n("rebuildFraction"), rebuildMaxTicks: Math.round(n("rebuildMaxSeconds") * tickRate), pushGroupSize: Math.max(1, Math.round(n("pushGroupSize", 1))),
    };
}
function directorRules(data, r, tickRate) {
    const n = (k, min = 0) => need(r[k], `director.${k}`, min);
    const sc = (data.constants.coop ?? {}).scaling ?? {};
    const waveSize = [], raids = [];
    for (let p = 1; p <= 4; p++) {
        const row = sc[String(p)];
        if (!row)
            throw new Error(`enemy AI: the Director needs constants.coop.scaling.${p}`);
        waveSize.push(need(row.waveSize, `coop.scaling.${p}.waveSize`));
        raids.push(Math.round(need(row.raidsAtOnce, `coop.scaling.${p}.raidsAtOnce`)));
    }
    return {
        decisionSeconds: n("decisionSeconds", 0.25),
        phaseTicks: ["buildUpSeconds", "probeSeconds", "pressureSeconds", "lullSeconds"].map((k) => Math.round(n(k) * tickRate)), phaseJitter: n("phaseJitterFraction"),
        waveGrowth: n("waveGrowth"), maxWaveBudgetFraction: n("maxWaveBudgetFraction"), commitFraction: n("commitFraction"),
        commitWaveFraction: n("commitWaveFraction"), spentFraction: n("spentFraction"), raidDefenderMetres: n("raidDefenderMetres"),
        raidDefenceRadius: n("raidDefenceRadiusMetres"), retreatHullFraction: n("retreatHullFraction"), waveSize, raidsAtOnce: raids,
    };
}
class EnemyAi {
    rules;
    /** Per type: 1 combat unit (units.json category "combat"), 2 harvester (mining loop), 0 other. */
    role;
    /** w3b per type: SEEN_* class bits (air, armed structure, heavy class, infantry combat unit). */
    seenClass;
    /** Per type: 1 = a Command Core (effects.supplySource). */
    core;
    /** Per team: difficulty (null for human teams). */
    diff;
    /** Lowest gas cost on the build list (fallback units are used below it). */
    minListGas;
    /** Decisions taken (instrumentation only; not state, not hashed). */
    decisions = 0;
    /** w2a commander calls (null: none). */
    callRules;
    constructor(sim, data) {
        this.rules = aiRules(data, sim.d.constants.tickRate);
        const nt = sim.d.typeIds.length;
        this.role = new Uint8Array(nt);
        const units = data.units;
        units.forEach((u, t) => { this.role[t] = u.harvestsDeposits ? 2 : u.category === "combat" ? 1 : 0; });
        this.seenClass = new Uint8Array(nt);
        data.units.forEach((u, t) => {
            this.seenClass[t] = (sim.d.tAir[t] ? exports.SEEN_AIR : 0) | (u.class === "heavy" ? exports.SEEN_HEAVY : 0) | (u.class === "infantry" && u.category === "combat" ? exports.SEEN_INFANTRY : 0);
        });
        for (let t = units.length; t < nt; t++)
            if (sim.d.tMountCount[t] > 0)
                this.seenClass[t] |= exports.SEEN_TOWER;
        this.core = new Uint8Array(nt);
        data.buildings.forEach((b, i) => { if (b.effects?.supplySource === true)
            this.core[units.length + i] = 1; });
        this.minListGas = Math.min(...(this.rules.tierLists ? this.rules.tierLists.flat() : this.rules.buildList).map((t) => sim.d.tCostGas[t]));
        this.diff = [];
        for (let t = 0; t < MAXT; t++)
            this.diff.push(sim.match.isAi(t) ? this.rules.difficulties.get(sim.match.difficulty[t])
                : sim.lanes && sim.match.inMatch(t) && sim.lanes.rules.quartermasterTeams.includes(t) ? this.rules.difficulties.get(sim.lanes.rules.difficulty) ?? null : null);
        this.callRules = sim.callRules ? commanderCallRules(data, sim.d.constants.tickRate) : null;
        // QA5-4: the buildings the commander's call loadout requires (a supplied Relay Tower for strikes, barrages and sweeps)
        const req = new Set();
        if (this.callRules && sim.callRules)
            for (const id of this.callRules.loadout) {
                const ci = sim.callIndex(id);
                if (ci >= 0)
                    for (const bt of sim.callRules.calls[ci].reqTypes)
                        req.add(sim.d.typeIds[bt]);
            }
        this.callBuildings = [...req].sort();
    }
    /** QA5-4: building type ids the commander's support-call loadout requires, built after the tech buildings. */
    callBuildings;
    /** Called at the end of every step; decides only on each AI team's decision tick. */
    step(sim) {
        const DR = this.rules.director;
        for (let team = 0; team < MAXT; team++) {
            const df = this.diff[team];
            if (!df || (sim.tick + team * 7) % df.decisionTicks !== 0)
                continue;
            if ((sim.match.eliminated >> team) & 1)
                continue; // DQ-8 (minimal): an eliminated team's commander issues nothing more
            // s13 Director: on every k-th decision tick, just before the decision
            const dirTick = !!DR && ((sim.tick + team * 7) / df.decisionTicks) % Math.max(1, Math.round(DR.decisionSeconds * sim.d.constants.tickRate / df.decisionTicks)) === 0;
            if (dirTick)
                this.directorPhase(sim, team, df);
            this.decide(sim, team, df, dirTick);
            if (this.callRules)
                this.commanderCalls(sim, team, df);
        }
    }
    /** w2a: at most one support call (see CommanderCallRules), on the decision tick where the interval comes round. */
    commanderCalls(sim, team, df) {
        const CR = this.callRules, iv = CR.interval.get(sim.match.difficulty[team]);
        if (!iv)
            return;
        // rate from state (the AI keeps none): the commander's last call is its latest beacon or impact (ready - cooldown)
        const cr = sim.calls?.callers.get(Sim_commanderCaller(team));
        if (cr && sim.calls) {
            let last = -Infinity;
            for (let i = 0; i < cr.ready.length; i++)
                if (cr.ready[i] > 0)
                    last = Math.max(last, cr.ready[i] - sim.callRules.calls[i].cooldownTicks);
            for (const b of sim.calls.beacons)
                if (b.caller === Sim_commanderCaller(team))
                    last = Math.max(last, b.queuedTick);
            if (sim.tick - last < iv)
                return;
        }
        const d = sim.d, M = sim.match, next = sim.tick + 1;
        const ok = (id) => CR.loadout.includes(id) && sim.callIndex(id) >= 0 && sim.callRules.calls[sim.callIndex(id)].fx !== calls_ts_1.CALL_FX_NONE && sim.commanderCallRefusal(team, sim.callIndex(id)) === null;
        const ownWithin = (x, z, r) => {
            for (let s = 0; s < sim.hi; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && !d.tStructure[sim.etype[s]]) {
                    const dx = sim.x[s] - x, dz = sim.z[s] - z;
                    if (dx * dx + dz * dz <= r * r)
                        return true;
                }
            return false;
        };
        // 1. densest detected enemy cluster
        const foes = [];
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] !== team && M.inMatch(sim.team[s]) && !d.tStructure[sim.etype[s]] && sim.detected(s, team))
                foes.push(s);
        let best = -1, bestN = 0;
        const r2 = CR.clusterRadius * CR.clusterRadius;
        for (const a of foes) {
            let n = 0;
            for (const b of foes) {
                const dx = sim.x[a] - sim.x[b], dz = sim.z[a] - sim.z[b];
                if (dx * dx + dz * dz <= r2)
                    n++;
            }
            if (n > bestN) {
                bestN = n;
                best = a;
            }
        }
        if (best >= 0) {
            const x = sim.x[best], z = sim.z[best];
            for (const [id, min] of [["barrage", CR.barrageMin], ["precision-strike", CR.strikeMin]]) {
                if (min > 0 && bestN >= min && ok(id) && sim.callTargetRefusal(team, sim.callIndex(id), x, z) === null && !ownWithin(x, z, sim.callRules.calls[sim.callIndex(id)].radius)) {
                    sim.queueCommanderCall(next, team, id, x, z);
                    return;
                }
            }
        }
        // 2. sentry at a threatened point (a held point under attack), else beside the Core with an enemy close
        if (ok("sentry-gun")) {
            const P = sim.pts;
            if (P)
                for (let p = 0; p < P.n; p++)
                    if (P.owner[p] === team && (P.flags[p] & points_ts_1.PT_UNDER_ATTACK)) {
                        sim.queueCommanderCall(next, team, "sentry-gun", P.px[p], P.pz[p]);
                        return;
                    }
            const t2 = CR.sentryThreat * CR.sentryThreat;
            for (let s = 0; s < sim.hi; s++) {
                if (!sim.alive[s] || sim.team[s] !== team || !this.core[sim.etype[s]] || sim.hp[s] <= 0)
                    continue;
                for (const f of foes) {
                    const dx = sim.x[f] - sim.x[s], dz = sim.z[f] - sim.z[s], dd = dx * dx + dz * dz;
                    if (dd > t2)
                        continue;
                    const l = Math.sqrt(dd) || 1, off = d.tRadius[sim.etype[s]] + 8; // between the Core and the threat
                    sim.queueCommanderCall(next, team, "sentry-gun", sim.x[s] + dx / l * off, sim.z[s] + dz / l * off);
                    return;
                }
            }
        }
        // 3. sensor sweep on the enemy Core before an attack
        if (ok("sensor-sweep")) {
            const attacking = this.rules.director ? M.dirPhase[team] === exports.DP_PRESSURE : (0, army_ts_1.armyStrength)(sim, team).ore >= df.attackThreshold;
            if (!attacking)
                return;
            let tx = -1, tz = 0, bd = Infinity, own = -1;
            for (let s = 0; s < sim.hi; s++)
                if (sim.alive[s] && sim.team[s] === team && this.core[sim.etype[s]]) {
                    own = s;
                    break;
                }
            for (let s = 0; s < sim.hi; s++) {
                if (!sim.alive[s] || sim.team[s] === team || !this.core[sim.etype[s]] || sim.hp[s] <= 0 || !M.inMatch(sim.team[s]))
                    continue;
                const dd = own >= 0 ? (sim.x[s] - sim.x[own]) ** 2 + (sim.z[s] - sim.z[own]) ** 2 : 0;
                if (dd < bd) {
                    bd = dd;
                    tx = sim.x[s];
                    tz = sim.z[s];
                }
            }
            if (tx >= 0)
                sim.queueCommanderCall(next, team, "sensor-sweep", tx, tz);
        }
    }
    /**
     * s13: the wave the Director asks for now, in ore (S14: was Command Points): attackThreshold x waveSize(players) x
     * (1 + waveGrowth x waves sent), at most maxWaveBudgetFraction of the team's army ceiling (army.ts: what its live
     * pilots can crew, plus its infantry), so it stays reachable as pilots are lost.
     */
    waveOre(sim, team, df) {
        const DR = this.rules.director, M = sim.match;
        const w = Math.min(df.attackThreshold * DR.waveSize[M.players - 1] * (1 + DR.waveGrowth * M.dirWaves[team]), DR.maxWaveBudgetFraction * (0, army_ts_1.armyStrength)(sim, team).ceiling);
        return Math.max(1, Math.round(w));
    }
    /** Old name of waveOre (tools, tests). */
    waveCp(sim, team, df) { return this.waveOre(sim, team, df); }
    /** s13: Director phase step (state in Match). */
    directorPhase(sim, team, df) {
        const DR = this.rules.director, M = sim.match;
        if (M.dirPhase[team] < 0) {
            M.dirPhase[team] = exports.DP_BUILD_UP;
            M.dirStart[team] = sim.tick;
        }
        const ph = M.dirPhase[team];
        // phase length x (1 +- phaseJitterFraction), from a hash of (seed, team, waves sent, phase): AI teams of one match
        // fall out of step, so their pressure phases do not always meet head-on in the middle of the map
        const u = hash01(sim.seed, team, M.dirWaves[team], ph);
        const dur = Math.round((ph === exports.DP_LULL ? DR.phaseTicks[ph] * df.lullScale : DR.phaseTicks[ph]) * (1 + DR.phaseJitter * (2 * u - 1)));
        let spent = false;
        if (ph === exports.DP_PRESSURE && sim.tick - M.dirStart[team] >= DR.commitFraction * dur)
            spent = (0, army_ts_1.armyStrength)(sim, team).ore < DR.spentFraction * this.waveOre(sim, team, df);
        const W = this.rules.waves;
        // fix-t1-ai item 5: a counter-attack starts pressure now, already committed (see WaveRules counter*)
        if (W && ph !== exports.DP_PRESSURE && this.counterNow(sim, team, df)) {
            M.dirPhase[team] = exports.DP_PRESSURE;
            M.dirStart[team] = Math.max(0, sim.tick - Math.ceil(DR.commitFraction * DR.phaseTicks[exports.DP_PRESSURE]));
            return;
        }
        if (sim.tick - M.dirStart[team] < dur && !spent)
            return;
        // fix-t1-ai item 5: after probe, pressure waits until the army is rebuilt (rebuildFraction x the wave, or at the unit cap)
        // (at most rebuildMaxSeconds past the probe's length: a pilot-limited army may never reach it; the soak's directorStuck)
        if (W && ph === exports.DP_PROBE && sim.tick - M.dirStart[team] < dur + W.rebuildMaxTicks && this.forceCp(sim, team) < W.rebuildFraction * this.waveOre(sim, team, df) && sim.unitCount(team) + df.squadSize <= Math.min(sim.mapUnitCap, sim.hostUnitCap))
            return;
        if (ph === exports.DP_PRESSURE)
            M.dirWaves[team]++;
        M.dirPhase[team] = ph === exports.DP_PRESSURE ? exports.DP_LULL : ph === exports.DP_PROBE ? exports.DP_PRESSURE : exports.DP_PROBE;
        M.dirStart[team] = sim.tick;
    }
    /**
     * fix-t1-ai item 5: counter-attack now? An enemy wave was just beaten near the own Core (at least counterMinHits own
     * entities within counterRadiusMetres of it hit in the last counterWindowSeconds, no detected enemy combat unit within
     * that radius now), and the own strength is at least commitWaveFraction x the wave and above counterForceRatio x the
     * detected enemy strength within counterRadiusMetres of the nearest enemy Core. Detected units only (no fog cheating).
     */
    counterNow(sim, team, df) {
        const W = this.rules.waves, DR = this.rules.director, M = sim.match, d = sim.d;
        let own = -1;
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && this.core[sim.etype[s]]) {
                own = s;
                break;
            }
        if (own < 0)
            return false;
        const ox = sim.x[own], oz = sim.z[own], R2 = W.counterRadius * W.counterRadius, since = sim.tick - W.counterWindowTicks;
        let hits = 0, ec = -1, ecd = Infinity;
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0)
                continue;
            const near = (sim.x[s] - ox) ** 2 + (sim.z[s] - oz) ** 2 <= R2;
            if (sim.team[s] === team) {
                if (near && sim.lastHit[s] >= since)
                    hits++;
                continue;
            }
            if (!M.inMatch(sim.team[s]))
                continue;
            if (this.core[sim.etype[s]]) {
                const dd = (sim.x[s] - ox) ** 2 + (sim.z[s] - oz) ** 2;
                if (dd < ecd) {
                    ecd = dd;
                    ec = s;
                }
                continue;
            }
            if (near && this.role[sim.etype[s]] === 1 && !d.tStructure[sim.etype[s]] && sim.detected(s, team))
                return false; // still fighting at home
        }
        if (hits < W.counterMinHits || ec < 0)
            return false;
        const mine = this.forceCp(sim, team);
        if (mine < DR.commitWaveFraction * this.waveOre(sim, team, df))
            return false;
        const et = sim.team[ec], seen = [];
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.team[s] === et && (sim.x[s] - sim.x[ec]) ** 2 + (sim.z[s] - sim.z[ec]) ** 2 <= R2 && sim.detected(s, team))
                seen.push(s);
        return mine > W.counterForceRatio * (0, army_ts_1.armyStrength)(sim, et, seen).ore;
    }
    /** Strength of the team's live combat squads (army.ts armyStrength: ore). */
    forceCp(sim, team) { return (0, army_ts_1.armyStrength)(sim, team).ore; }
    /** One decision for `team`. Emits inputs stamped for the next tick only. */
    decide(sim, team, df, dirTick = false) {
        this.decisions++;
        const d = sim.d, next = sim.tick + 1, P = sim.pts, M = sim.mine;
        // ---- survey (one pass over the entities)
        const combat = [], harvesters = [], producers = [], air = [], carriers = [];
        const ferryOn = !!sim.tpRules && (df.ferry.chance ?? sim.tpRules.ferryChance) > 0 && !!this.rules.waves;
        const C = sim.con, ctorType = C ? C.builderType : -1;
        let nCtor = 0;
        let enemyCore = -1, enemyCoreD = Infinity, ownCore = -1;
        const coreAt = []; // [team, x, z] of standing Cores
        const squads = new Set();
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0)
                continue;
            const t = sim.etype[s];
            if (d.tStructure[t]) {
                const isCore = this.core[t] === 1;
                if (isCore)
                    coreAt.push([sim.team[s], sim.x[s], sim.z[s]]);
                if (sim.team[s] !== team)
                    continue;
                if (isCore)
                    ownCore = s;
                if (d.tProduces[t].length)
                    producers.push(s);
                continue;
            }
            if (sim.team[s] !== team)
                continue;
            if (t === ctorType)
                nCtor++;
            const r = this.role[t];
            if (r === 2)
                harvesters.push(s);
            else if (r === 1 && sim.mCount[s] > 0 && sim.drv[s] && sim.critTick[s] < 0) {
                if (this.airAttacker(sim, t)) {
                    air.push(s);
                    squads.add(sim.squad[s]);
                    continue;
                }
                // fix-t1-ai ruling 85: with ferries on, a ground Carrier is a ferry, not a line unit: it waits by the Core for a squad
                if (ferryOn && sim.tpRules.carrier[t] && !d.tAir[t]) {
                    carriers.push(s);
                    squads.add(sim.squad[s]);
                    continue;
                }
                if (!(sim.fkit && sim.fkit.isHeld(sim, s))) // Frontline: reinforcements hold where they were flown in
                    combat.push(s);
                squads.add(sim.squad[s]);
            }
        }
        const army = (0, army_ts_1.armyStrength)(sim, team), force = army.ore; // S14: ore of the live combat squads (was Command Points)
        const ox = ownCore >= 0 ? sim.x[ownCore] : 0, oz = ownCore >= 0 ? sim.z[ownCore] : 0;
        // fix-t1-ai ruling 85: an idle, empty ferry away from the Core drives back beside it (where the Barracks' squads appear)
        if (ownCore >= 0)
            for (const s of carriers)
                if (this.idle(sim, s) && !this.ferryBusy(sim, s) && dist2(sim, s, ox, oz) > (2 * this.rules.guardRadius) ** 2) {
                    let ux = sim.x[s] - ox, uz = sim.z[s] - oz;
                    const l = Math.sqrt(ux * ux + uz * uz) || 1;
                    ux /= l;
                    uz /= l;
                    const r = this.rules.guardRadius;
                    sim.queueOrder(next, [sim.eid[s]], { type: "move", x: sim.clampMap(ox + ux * r), z: sim.clampMap(oz + uz * r) }, team);
                }
        coreAt.forEach(([ct, x, z], i) => {
            if (ct === team)
                return;
            const dd = (x - ox) * (x - ox) + (z - oz) * (z - oz);
            if (dd < enemyCoreD) {
                enemyCoreD = dd;
                enemyCore = i;
            }
        });
        // ---- 1. harvesters
        if (M) {
            let oreLeft = false;
            for (let i = 0; i < M.nd; i++)
                if (M.remaining[i] > 0)
                    oreLeft = true;
            if (oreLeft)
                for (const s of harvesters) {
                    const h = M.harv.get(sim.eid[s]);
                    if (h && (h.mode === 1 || h.phase === 0) && sim.drv[s])
                        sim.queueHarvest(next, sim.eid[s], -1, team);
                }
        }
        // ---- 2a. construction (s8): extractor, storage, towers; one open site at a time
        const spent = this.construct(sim, team, next, df, ownCore);
        // ---- w3b: aircraft (strikes, home when damaged or grounded), forward base vehicles, Mule sling loads
        if (this.rules.systems) {
            this.aircraft(sim, team, next, air, ownCore);
            this.forwardBases(sim, team, next, ownCore);
            this.slingLoads(sim, team, next);
        }
        // ---- 2. production
        this.produce(sim, team, next, harvesters.length, squads.size, nCtor, spent);
        this.crewEmpty(sim, team, next, df); // S14: crew orders for own vehicles with empty seats at a pilot home
        // ---- points: targets, defence
        const free = new Set(); // combat units the commander may (re)assign
        const busy = new Set(); // already assigned in this decision
        const ring = P ? P.rules.ring : 0;
        const holding = (s) => {
            if (!P)
                return false;
            for (let p = 0; p < P.n; p++) {
                const dx = sim.x[s] - P.px[p], dz = sim.z[s] - P.pz[p];
                if (dx * dx + dz * dz > ring * ring)
                    continue;
                if (P.owner[p] !== team)
                    return true; // capturing (or contesting) it
                if (P.flags[p] & points_ts_1.PT_UNDER_ATTACK)
                    return true; // defending it
            }
            return false;
        };
        // home guard (s8): the newest homeGuardSquads x squadSize combat units stay at the own Core (the defence step may
        // still send them to a held point under attack); idle ones away from it attack-move back
        const guard = new Set();
        if (ownCore >= 0 && df.homeGuardSquads > 0) {
            const byNew = combat.slice().sort((a, b) => sim.eid[b] - sim.eid[a]).slice(0, df.homeGuardSquads * df.squadSize);
            const back = [];
            for (const s of byNew) {
                guard.add(s);
                if (this.idle(sim, s) && dist2(sim, s, ox, oz) > this.rules.guardRadius ** 2)
                    back.push(s);
            }
            // QA1 bug 6: each to a clear spot beside the Core on its own side (Core radius + structure clearance + its radius +
            // arrival radius out from the centre, then the nearest free cell), not the Core's centre, so it arrives and is idle
            const cr = d.tRadius[sim.etype[ownCore]] + (sim.nav ? sim.nav.R.clearance : 0) + d.constants.arrivalRadius;
            for (const s of back.sort((a, b) => sim.eid[a] - sim.eid[b])) {
                let ux = sim.x[s] - ox, uz = sim.z[s] - oz;
                const l = Math.sqrt(ux * ux + uz * uz);
                if (l > 1e-6) {
                    ux /= l;
                    uz /= l;
                }
                else {
                    ux = 1;
                    uz = 0;
                }
                const r = cr + d.tRadius[sim.etype[s]];
                sim.queueOrder(next, [sim.eid[s]], { type: "attackMove", x: sim.clampMap(ox + ux * r), z: sim.clampMap(oz + uz * r) }, team);
            }
            for (const s of back)
                busy.add(s);
        }
        // s13 Director: badly damaged units away from home retreat (on Director ticks); at home they stay (not free)
        const DR = this.rules.director, MT = sim.match;
        const hurt = (s) => !!DR && sim.hp[s] < DR.retreatHullFraction * d.tHp[sim.etype[s]];
        if (DR && dirTick && ownCore >= 0) {
            let back = combat.filter((s) => !busy.has(s) && !guard.has(s) && hurt(s) && !sim.ord.ext.has(sim.eid[s]) && dist2(sim, s, ox, oz) > this.rules.guardRadius ** 2);
            // QA5-3: a hurt lifter first drops its sling load where it is (retreating with it ended the unload's move and the
            // vehicle stayed slung under it for good); it retreats on a later decision
            if (sim.tp && sim.tp.lifts.length)
                back = back.filter((s) => !this.dropSling(sim, team, next, s, busy));
            // w2b: to the nearest own Repair Bay when there is one (it repairs in a radius), else home
            const rb = sim.eco2 && back.length ? sim.eco2.nearestRepair(sim, team, sim.x[back[0]], sim.z[back[0]]) : -1;
            if (back.length) {
                sim.queueOrder(next, back.map((s) => sim.eid[s]), rb >= 0 ? { type: "retreat", points: [[sim.x[rb], sim.z[rb]]] } : { type: "retreat" }, team);
                for (const s of back)
                    busy.add(s);
            }
        }
        for (const s of combat)
            if (!guard.has(s) && !busy.has(s) && this.idle(sim, s) && !holding(s) && !hurt(s))
                free.add(s);
        // ---- 3. defence
        if (P && this.rules.defendSquads > 0) {
            const want = this.rules.defendSquads * df.squadSize;
            for (let p = 0; p < P.n; p++) {
                if (P.owner[p] !== team || !(P.flags[p] & points_ts_1.PT_UNDER_ATTACK))
                    continue;
                const px = P.px[p], pz = P.pz[p];
                // nearest units not already in the ring, idle ones first, then those on capture runs (not on the Core attack)
                const cand = combat.filter((s) => !busy.has(s) && !this.headingTo(sim, s, enemyCore >= 0 ? coreAt[enemyCore] : null) && (free.has(s) || sim.ordType[s] === ORD_ATTACK_MOVE))
                    .filter((s) => { const dx = sim.x[s] - px, dz = sim.z[s] - pz; return dx * dx + dz * dz > ring * ring; })
                    .sort((a, b) => (free.has(b) ? 1 : 0) - (free.has(a) ? 1 : 0) || dist2(sim, a, px, pz) - dist2(sim, b, px, pz) || a - b)
                    .slice(0, want);
                if (!cand.length)
                    continue;
                for (const s of cand) {
                    busy.add(s);
                    free.delete(s);
                }
                sim.queueOrder(next, cand.map((s) => sim.eid[s]), { type: "attackMove", x: px, z: pz, formation: "wedge" }, team);
            }
        }
        // ---- S14: the last crews (no pilot available, at most lastCrews alive) stay out of raids, capture runs and the Core
        // attack (they still defend held points); hard: idle combat units hunt detected enemy pilots on foot nearby
        const lastCrews = this.lastCrews(sim, team);
        if (lastCrews)
            for (const s of [...free])
                if (this.crewedVehicle(sim, s))
                    free.delete(s);
        if (sim.fkit) // Frontline: reinforcements hold the point they were flown to
            for (const s of [...free])
                if (sim.fkit.isHeld(sim, s)) {
                    free.delete(s);
                    busy.add(s);
                }
        this.huntPilots(sim, team, next, df, free, busy);
        // Frontline (lanes.ts): free units leave in lane waves instead of the mission, Core attack and expansion steps
        if (sim.lanes) {
            if (sim.tpRules)
                this.flTransports(sim, team, next, free, busy, ownCore); // designer 21 Nov: Carriers and Mules carry troops, never go out empty
            sim.lanes.dispatch(sim, team, next, df, free, busy, ownCore);
            return;
        }
        // ---- 3b. QA1 bug 10: the mission's primary objective (both roles: the team it is for, and its opponent)
        const ms = this.mission(sim, team);
        if (ms && (ms.type === "destroyStructure" || ms.type === "captureExtract") && !(ms.type === "destroyStructure" && ms.mine)) {
            // a squad posted at the named structure (its defender) or at the extraction point (both sides: take / hold it,
            // or contest it): units within guardRadius of the structure (the capture ring of the point) stay; free ones top
            // the post up to squadSize
            const R2 = (ms.type === "captureExtract" && P ? P.rules.ring : this.rules.guardRadius) ** 2, posted = [];
            for (const s of combat)
                if (dist2(sim, s, ms.x, ms.z) <= R2 && !hurt(s) && (free.has(s) || this.idle(sim, s)))
                    posted.push(s);
            for (const s of posted.slice(0, df.squadSize)) {
                free.delete(s);
                busy.add(s);
            }
            const lack = df.squadSize - Math.min(posted.length, df.squadSize);
            if (lack > 0) {
                const send = [...free].filter((s) => !busy.has(s)).sort((a, b) => dist2(sim, a, ms.x, ms.z) - dist2(sim, b, ms.x, ms.z) || sim.eid[a] - sim.eid[b]).slice(0, lack);
                for (const s of send) {
                    free.delete(s);
                    busy.add(s);
                }
                if (send.length) {
                    if (ms.type === "captureExtract")
                        sim.queueOrder(next, send.map((s) => sim.eid[s]), { type: "attackMove", x: ms.x, z: ms.z, formation: "wedge" }, team);
                    else
                        for (const s of send) { // beside the structure on the unit's side (as the home guard)
                            let ux = sim.x[s] - ms.x, uz = sim.z[s] - ms.z;
                            const l = Math.sqrt(ux * ux + uz * uz);
                            if (l > 1e-6) {
                                ux /= l;
                                uz /= l;
                            }
                            else {
                                ux = 1;
                                uz = 0;
                            }
                            const r = ms.radius + (sim.nav ? sim.nav.R.clearance : 0) + d.constants.arrivalRadius + d.tRadius[sim.etype[s]];
                            sim.queueOrder(next, [sim.eid[s]], { type: "attackMove", x: sim.clampMap(ms.x + ux * r), z: sim.clampMap(ms.z + uz * r) }, team);
                        }
                }
            }
        }
        // ---- 4. attack the enemy Core
        // s8: also when the army cannot grow any more (its unit count within one squad of the per-side cap): a trooper-heavy
        // army (1 CP per squad of 5) reaches the cap long before attackThreshold Command Points
        const capped = sim.unitCount(team) + df.squadSize > Math.min(sim.mapUnitCap, sim.hostUnitCap);
        // s13 Director: Core attacks only in pressure, with the Director's wave; raids in probe
        let threshold = df.attackThreshold, mayAttack = true;
        if (DR) {
            const ph = MT.dirPhase[team];
            mayAttack = ph === exports.DP_PRESSURE;
            threshold = this.waveOre(sim, team, df);
            if (mayAttack && sim.tick - MT.dirStart[team] >= DR.commitFraction * DR.phaseTicks[exports.DP_PRESSURE])
                threshold = Math.max(1, Math.round(threshold * DR.commitWaveFraction));
            if (ph === exports.DP_PROBE && dirTick)
                this.raid(sim, team, next, df, [...free].filter((s) => !busy.has(s)), busy, free);
            if (ms && (ms.type === "survive" || ms.type === "holdout") && !ms.mine)
                mayAttack = true; // QA1 bug 10: a holdout is attacked in waves, whatever the phase (fix-qa2: the wave-counted holdout too)
        }
        // QA1 bug 10: the team that must destroy a structure attacks it instead of the Core
        const strike = ms && ms.type === "destroyStructure" && ms.mine ? [ms.owner, ms.x, ms.z] : enemyCore >= 0 ? coreAt[enemyCore] : null;
        const W = this.rules.waves;
        const rally = W && strike && ownCore >= 0 ? this.rallyPoint(sim, team, ox, oz, strike[1], strike[2]) : null;
        if (W && rally && strike) {
            // fix-t1-ai: a Core wave gathers at the rally point and pushes as one group; outside pressure a spent wave holds
            if (mayAttack) {
                if (this.coreWave(sim, team, next, df, combat, busy, guard, hurt, strike, rally, threshold, force, capped, ferryOn, carriers))
                    return;
            }
            else
                this.holdSpent(sim, team, next, df, combat, busy, strike, rally);
        }
        else if (mayAttack && strike && (force >= threshold || capped)) {
            const c = strike;
            const go = combat.filter((s) => !busy.has(s) && !guard.has(s) && !hurt(s) && !this.headingTo(sim, s, c) && !(lastCrews && this.crewedVehicle(sim, s)));
            // a capped army goes in waves: it waits until at least half its combat units are free to go together (no trickle)
            if (go.length && (force >= threshold || 2 * go.length >= combat.length)) {
                for (const s of go)
                    sim.queueOrder(next, [sim.eid[s]], { type: "attackMove", x: c[1], z: c[2] }, team); // one by one: all converge on the Core
                return;
            }
        }
        // ---- 5. expansion: squads of idle units to the nearest capturable point linked to the supply chain
        if (!P)
            return;
        const targets = [];
        for (let p = 0; p < P.n; p++) {
            if (P.owner[p] === team)
                continue;
            let linked = false;
            for (const q of P.adj[p])
                if (P.owner[q] === team && (P.flags[q] & points_ts_1.PT_SUPPLIED))
                    linked = true;
            if (!linked)
                continue;
            let enemyCoreHere = false;
            for (const [ct, x, z] of coreAt)
                if (ct !== team && (x - P.px[p]) ** 2 + (z - P.pz[p]) ** 2 <= P.area[p] * P.area[p])
                    enemyCoreHere = true;
            if (!enemyCoreHere)
                targets.push(p);
        }
        // QA1 bug 10: against a holdPoints mission the opponent contests the points the mission's team holds (linked or not);
        // the extraction point is always a target of both sides until held
        if (ms && ms.type === "holdPoints" && !ms.mine)
            for (let p = 0; p < P.n; p++)
                if (P.owner[p] === ms.team && !targets.includes(p)) {
                    let core = false;
                    for (const [ct, x, z] of coreAt)
                        if (ct !== team && (x - P.px[p]) ** 2 + (z - P.pz[p]) ** 2 <= P.area[p] * P.area[p])
                            core = true;
                    if (!core)
                        targets.push(p);
                }
        if (ms && ms.type === "captureExtract" && ms.point >= 0 && P.owner[ms.point] !== team && !targets.includes(ms.point))
            targets.push(ms.point);
        const priority = (p) => !!ms && ((ms.type === "holdPoints" && !ms.mine && P.owner[p] === ms.team) || (ms.type === "captureExtract" && p === ms.point));
        // fix-t1-ai (waves): squads go only to unowned points (and mission points); an enemy-held point is contested only by
        // a wave-sized force gathered at the rally point; every other free unit gathers there
        const enemyHeld = (p) => P.owner[p] >= 0 && P.owner[p] !== team && !priority(p);
        const fortified = W && rally ? targets.filter(enemyHeld) : [];
        if (W && rally)
            for (let i = targets.length - 1; i >= 0; i--)
                if (enemyHeld(targets[i]))
                    targets.splice(i, 1);
        // fix-t1-ai ruling 85: a whole free infantry squad rides a ferry to its nearest unowned target, else to the rally point
        if (ferryOn && carriers.length && rally)
            this.ferryPass(sim, team, df, [...free].filter((s) => !busy.has(s)), busy, (x, z) => {
                let best = -1, bd = Infinity;
                for (const p of targets) {
                    const dd = (P.px[p] - x) ** 2 + (P.pz[p] - z) ** 2;
                    if (dd < bd) {
                        bd = dd;
                        best = p;
                    }
                }
                return best >= 0 ? [P.px[best], P.pz[best]] : rally;
            }, free);
        if (!targets.length) {
            if (W && rally) {
                this.gatherOrStorm(sim, team, next, df, [...free].filter((s) => !busy.has(s)), fortified, rally, busy);
                return;
            }
            // nothing left to take: an idle force with an enemy Core standing goes for it
            if (mayAttack && enemyCore >= 0 && free.size >= df.squadSize) {
                const c = coreAt[enemyCore];
                for (const s of free)
                    sim.queueOrder(next, [sim.eid[s]], { type: "attackMove", x: c[1], z: c[2] }, team);
            }
            return;
        }
        const idle = [...free].filter((s) => !busy.has(s)).sort((a, b) => sim.eid[a] - sim.eid[b]);
        const sent = new Map();
        const citVal = this.rules.pilots ? this.rules.pilots.citadelValue : 0;
        for (let i = 0; i + df.squadSize <= idle.length; i += df.squadSize) {
            const grp = idle.slice(i, i + df.squadSize);
            let cx = 0, cz = 0;
            for (const s of grp) {
                cx += sim.x[s];
                cz += sim.z[s];
            }
            cx /= grp.length;
            cz /= grp.length;
            let best = -1, bestCost = Infinity, bestPr = false;
            // w3b terrain: a point whose centre the group's ground units cannot enter costs TERRAIN_PENALTY more
            const gcls = grp.some((s) => !d.tAir[sim.etype[s]]) ? d.tMove[sim.etype[grp.find((s) => !d.tAir[sim.etype[s]])]] : -1; // W1: movement class
            for (const p of targets) {
                const cost = Math.sqrt((P.px[p] - cx) ** 2 + (P.pz[p] - cz) ** 2) + SPREAD_PENALTY * (sent.get(p) ?? 0)
                    + (gcls >= 0 && sim.tlayer && !sim.tlayer.passableAt(P.px[p], P.pz[p], gcls) ? TERRAIN_PENALTY : 0)
                    - (citVal > 0 && sim.pool && sim.pool.citadelOpen(sim, p, team) ? citVal : 0); // ruling 64: a first citadel brings pilots
                const pr = priority(p); // QA1 bug 10: mission points first, then the cheapest
                if ((pr && !bestPr) || (pr === bestPr && cost < bestCost)) {
                    bestCost = cost;
                    best = p;
                    bestPr = pr;
                }
            }
            sent.set(best, (sent.get(best) ?? 0) + 1);
            // w2e: a far target may get one infantry squad of the group ferried there by an idle Carrier (transport.ts)
            if (sim.tpRules) {
                const ferried = (0, transport_ts_1.tpTryFerry)(sim, team, grp, P.px[best], P.pz[best], busy, df.ferry);
                if (ferried.length) {
                    for (const s of ferried) {
                        busy.add(s);
                        free.delete(s);
                    }
                    const rest = grp.filter((s) => !ferried.includes(s));
                    if (rest.length)
                        sim.queueOrder(next, rest.map((s) => sim.eid[s]), { type: "attackMove", x: P.px[best], z: P.pz[best], formation: "wedge" }, team);
                    continue;
                }
            }
            // w3b: a far target lifts one ground vehicle of the group with an idle Mule (it unloads at the nearest target later)
            if (this.rules.systems && sim.tpRules) {
                const lifted = this.tryAirlift(sim, team, next, grp, P.px[best], P.pz[best], busy);
                if (lifted >= 0) {
                    busy.add(lifted);
                    free.delete(lifted);
                    const rest = grp.filter((s) => s !== lifted);
                    if (rest.length)
                        sim.queueOrder(next, rest.map((s) => sim.eid[s]), { type: "attackMove", x: P.px[best], z: P.pz[best], formation: "wedge" }, team);
                    continue;
                }
            }
            // wedge: every member gets its own slot inside the capture ring, so each one arrives (and counts as idle again)
            sim.queueOrder(next, grp.map((s) => sim.eid[s]), { type: "attackMove", x: P.px[best], z: P.pz[best], formation: "wedge" }, team);
        }
        // fix-t1-ai (waves): the units left over (fewer than a squad) gather; a wave-sized gathering storms an enemy point
        if (W && rally)
            this.gatherOrStorm(sim, team, next, df, idle.slice(Math.floor(idle.length / df.squadSize) * df.squadSize).filter((s) => !busy.has(s)), fortified, rally, busy);
    }
    /**
     * fix-t1-ai ruling 85: the first infantry squad with a member among `units` (the whole squad goes: none busy) whose destination
     * dest(centroid) lies at least transport.ferry.minDistanceMetres away boards the nearest idle ferry (tpTryFerry: the
     * difficulty's chance and cooldown). At most one ferry per decision; the slots taken go into busy (and out of free).
     */
    ferryPass(sim, team, df, units, busy, dest, free) {
        const set = new Set(units), tried = new Set();
        for (const s of units) {
            const sq = sim.squads.get(sim.squad[s]);
            if (!sq || tried.has(sq.id) || busy.has(s) || !(0, transport_ts_1.isSoldier)(sim, s))
                continue;
            tried.add(sq.id);
            const mem = sq.members.map((id) => sim.idToSlot.get(id)).filter((m) => m !== undefined);
            // the whole squad is gathered for the ferry: one member offered is enough, none may be taken already this decision
            if (mem.length !== sq.members.length || mem.some((m) => busy.has(m) || sim.hp[m] <= 0))
                continue;
            let cx = 0, cz = 0;
            for (const m of mem) {
                cx += sim.x[m];
                cz += sim.z[m];
            }
            cx /= mem.length;
            cz /= mem.length;
            const [x, z] = dest(cx, cz);
            const got = (0, transport_ts_1.tpTryFerry)(sim, team, mem, x, z, busy, df.ferry);
            if (!got.length)
                continue;
            for (const m of got) {
                busy.add(m);
                free?.delete(m);
            }
            return;
        }
    }
    /** fix-t1-ai: vehicle slot s has a transport job (cargo, boarding, unloading, a ferry). */
    ferryBusy(sim, s) {
        const T = sim.tp, id = sim.eid[s];
        return !!T && (T.cargo.some((c) => c.vehicle === id) || T.loads.some((l) => l.vehicle === id) || T.unloads.some((u) => u.vehicle === id) || T.ferries.some((f) => f.vehicle === id));
    }
    /** fix-t1-ai: the wave the Director asks for now (strength), or the difficulty's attack threshold without a Director. */
    waveNow(sim, team, df) { return this.rules.director ? this.waveOre(sim, team, df) : df.attackThreshold; }
    /**
     * fix-t1-ai rally point (WaveRules): on the line from the own Core (ox, oz) to the enemy Core (ex, ez) at rallyFraction,
     * stepped back by 0.05 of the line (not below minRallyFraction) while within an enemy-held point's area +
     * rallyClearanceMetres, or within 2 x the capture ring of any other point's centre (its control node stands there).
     * A pure function of the state (the commander keeps none).
     */
    rallyPoint(sim, team, ox, oz, ex, ez) {
        const W = this.rules.waves, P = sim.pts;
        let f = W.rallyFraction;
        for (;;) {
            const x = ox + (ex - ox) * f, z = oz + (ez - oz) * f;
            let clear = true;
            if (P)
                for (let p = 0; p < P.n && clear; p++) {
                    // any point: not on its centre structures (within 2 x the capture ring: the soak's blockedNearGoal at the node)
                    const r = P.owner[p] >= 0 && P.owner[p] !== team ? P.area[p] + W.rallyClearance : 2 * P.rules.ring;
                    if ((P.px[p] - x) ** 2 + (P.pz[p] - z) ** 2 <= r * r)
                        clear = false;
                }
            if (clear || f - 0.05 < W.minRallyFraction - 1e-9)
                return [sim.clampMap(x), sim.clampMap(z)];
            f -= 0.05;
        }
    }
    /** fix-t1-ai: the unit's order is an attack-move (or move) whose last waypoint is within r of (x, z), not yet reached. */
    headingNear(sim, s, x, z, r) {
        if (sim.ordType[s] !== ORD_ATTACK_MOVE && sim.ordType[s] !== ORD_MOVE)
            return false;
        const wp = sim.waypoints[s];
        return !!wp && (wp[wp.length - 2] - x) ** 2 + (wp[wp.length - 1] - z) ** 2 <= r * r;
    }
    /** fix-t1-ai: rally circle radius (rallyRadiusMetres + formationMaxSpread: a gather order keeps each unit's offset up to that). */
    rallyR(sim) { return this.rules.waves.rallyRadius + sim.d.constants.formationMaxSpread; }
    /**
     * fix-t1-ai item 3, a Core wave (pressure): every combat unit that is not guarding, hurt, busy, pushing or already in
     * the fight at the enemy Core attack-moves to the rally point; when the strength gathered there reaches gatherFraction
     * x the wave (or nothing more is on the way and the wave is committed or already pushing) the gathered units attack-
     * move on the enemy Core as ONE formation group (formation cohesion: the slowest member's speed). Returns true while a
     * wave is gathering or pushing (the expansion step then leaves the army alone), false when there is no wave yet.
     */
    coreWave(sim, team, next, df, combat, busy, guard, hurt, c, rally, threshold, force, capped, ferryOn = false, carriers = []) {
        const W = this.rules.waves, DR = this.rules.director, M = sim.match, rr = this.rallyR(sim);
        const pushing = [], enRoute = [], at = [], others = [];
        for (const s of combat) {
            if (busy.has(s) || guard.has(s) || hurt(s))
                continue;
            if (this.headingNear(sim, s, c[1], c[2], W.coreRadius))
                pushing.push(s);
            else if (dist2(sim, s, c[1], c[2]) <= W.coreRadius * W.coreRadius)
                pushing.push(s); // in the fight at the Core
            else if (dist2(sim, s, rally[0], rally[1]) <= rr * rr)
                at.push(s);
            else if (this.headingNear(sim, s, rally[0], rally[1], rr))
                enRoute.push(s);
            else
                others.push(s);
        }
        const active = pushing.length + enRoute.length + at.length > 0;
        // as before: a wave starts at the threshold; a capped army waits until at least half its combat units can go together
        if (!active && force < threshold && !(capped && 2 * others.length >= combat.length))
            return false;
        if (ferryOn && carriers.length) {
            this.ferryPass(sim, team, df, others, busy, () => rally);
            for (let i = others.length - 1; i >= 0; i--)
                if (busy.has(others[i]))
                    others.splice(i, 1);
        }
        if (others.length) {
            sim.queueOrder(next, others.map((s) => sim.eid[s]), { type: "attackMove", x: rally[0], z: rally[1] }, team);
            for (const s of others)
                busy.add(s);
        }
        if (at.length) {
            const gathered = (0, army_ts_1.armyStrength)(sim, team, at).ore;
            const committed = !DR || sim.tick - M.dirStart[team] >= DR.commitFraction * DR.phaseTicks[exports.DP_PRESSURE];
            if (gathered >= W.gatherFraction * threshold || (!enRoute.length && !others.length && (pushing.length > 0 || committed || capped))) {
                this.push(sim, team, next, at, c[1], c[2]);
                for (const s of at)
                    busy.add(s);
            }
        }
        return true;
    }
    /** fix-t1-ai: the gathered units attack-move to (x, z) in formation groups (WaveRules pushGroupSize). */
    push(sim, team, next, units, x, z) {
        const W = this.rules.waves, d = sim.d;
        const us = units.slice().sort((a, b) => sim.eid[a] - sim.eid[b]);
        const vmin = Math.min(...us.map((s) => d.tSpeed[sim.etype[s]]));
        const slow = us.filter((s) => d.tSpeed[sim.etype[s]] <= vmin * 1.05), rest = us.filter((s) => d.tSpeed[sim.etype[s]] > vmin * 1.05);
        const k = Math.max(1, Math.min(Math.ceil(us.length / W.pushGroupSize), slow.length));
        const groups = Array.from({ length: k }, () => []);
        [...slow, ...rest].forEach((s, i) => groups[i % k].push(s));
        for (const g of groups)
            sim.queueOrder(next, g.map((s) => sim.eid[s]), { type: "attackMove", x, z, formation: W.formation }, team);
    }
    /**
     * fix-t1-ai item 5, a spent wave holds: outside pressure, units still heading for the enemy Core (not yet in the fight
     * there) with less than spentFraction x the wave between them fall back to the rally point.
     */
    holdSpent(sim, team, next, df, combat, busy, c, rally) {
        const W = this.rules.waves, DR = this.rules.director;
        if (!DR)
            return;
        const go = combat.filter((s) => !busy.has(s) && this.headingNear(sim, s, c[1], c[2], W.coreRadius) && dist2(sim, s, c[1], c[2]) > W.coreRadius * W.coreRadius);
        if (!go.length || (0, army_ts_1.armyStrength)(sim, team, go).ore >= DR.spentFraction * this.waveOre(sim, team, df))
            return;
        sim.queueOrder(next, go.map((s) => sim.eid[s]), { type: "attackMove", x: rally[0], z: rally[1] }, team);
        for (const s of go)
            busy.add(s);
    }
    /**
     * fix-t1-ai item 4: free units (not enough for a squad, or nothing unowned left to take) gather at the rally point;
     * when the strength gathered there is at least pointAttackFraction x the wave, the gathered units storm the nearest
     * enemy-held target point (linked to the own supply chain, no Core on it) as one formation group.
     */
    gatherOrStorm(sim, team, next, df, free, fortified, rally, busy) {
        const W = this.rules.waves, P = sim.pts, rr = this.rallyR(sim);
        const go = free.filter((s) => dist2(sim, s, rally[0], rally[1]) > rr * rr && !this.headingNear(sim, s, rally[0], rally[1], rr));
        if (go.length) {
            sim.queueOrder(next, go.map((s) => sim.eid[s]), { type: "attackMove", x: rally[0], z: rally[1] }, team);
            for (const s of go)
                busy.add(s);
        }
        if (!fortified.length)
            return;
        const at = free.filter((s) => dist2(sim, s, rally[0], rally[1]) <= rr * rr);
        if (!at.length || (0, army_ts_1.armyStrength)(sim, team, at).ore < W.pointAttackFraction * this.waveNow(sim, team, df))
            return;
        let best = -1, bd = Infinity;
        for (const p of fortified) {
            const dd = (P.px[p] - rally[0]) ** 2 + (P.pz[p] - rally[1]) ** 2;
            if (dd < bd) {
                bd = dd;
                best = p;
            }
        }
        this.push(sim, team, next, at, P.px[best], P.pz[best]);
        for (const s of at)
            busy.add(s);
    }
    /**
     * s13 Director raid: up to raidsAtOnce squads of the idle units attack-move to the weakest enemy target (a detected
     * Harvester or an enemy-held point), cost = distance + raidDefenderMetres x detected enemy combat units near it.
     */
    raid(sim, team, next, df, idle, busy, free) {
        const DR = this.rules.director, P = sim.pts, M = sim.match;
        const n = DR.raidsAtOnce[M.players - 1];
        if (n <= 0 || idle.length < df.squadSize)
            return;
        const targets = [];
        const enemies = [];
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] === team || !M.inMatch(sim.team[s]) || !sim.detected(s, team))
                continue;
            const r = this.role[sim.etype[s]];
            if (r === 2)
                targets.push([sim.x[s], sim.z[s]]);
            else if (r === 1)
                enemies.push(s);
        }
        if (P)
            for (let p = 0; p < P.n; p++) {
                const o = P.owner[p];
                if (o < 0 || o === team || !M.inMatch(o))
                    continue;
                let core = false;
                for (let s = 0; s < sim.hi && !core; s++)
                    if (sim.alive[s] && this.core[sim.etype[s]] && sim.team[s] === o && P.pointAt(sim.x[s], sim.z[s]) === p)
                        core = true;
                // fix-t1-ai item 4 (waves): a raid squad does not go for a point with an armed enemy structure (control node, bunker,
                // tower): that takes a wave-sized force (gatherOrStorm)
                if (!core && this.rules.waves)
                    for (let s = 0; s < sim.hi && !core; s++)
                        if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === o && sim.d.tStructure[sim.etype[s]] && sim.mCount[s] > 0 && P.pointAt(sim.x[s], sim.z[s]) === p)
                            core = true;
                if (!core)
                    targets.push([P.px[p], P.pz[p]]);
            }
        if (!targets.length)
            return;
        const R2 = DR.raidDefenceRadius ** 2;
        const defenders = targets.map(([x, z]) => { let k = 0; for (const s of enemies)
            if ((sim.x[s] - x) ** 2 + (sim.z[s] - z) ** 2 <= R2)
                k++; return k; });
        idle.sort((a, b) => sim.eid[a] - sim.eid[b]);
        const used = new Set();
        for (let g = 0; g < n && (g + 1) * df.squadSize <= idle.length; g++) {
            const grp = idle.slice(g * df.squadSize, (g + 1) * df.squadSize);
            let cx = 0, cz = 0;
            for (const s of grp) {
                cx += sim.x[s];
                cz += sim.z[s];
            }
            cx /= grp.length;
            cz /= grp.length;
            let best = -1, bc = Infinity;
            targets.forEach(([x, z], i) => { if (used.has(i))
                return; const c = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2) + DR.raidDefenderMetres * defenders[i]; if (c < bc) {
                bc = c;
                best = i;
            } });
            if (best < 0)
                break;
            used.add(best);
            sim.queueOrder(next, grp.map((s) => sim.eid[s]), { type: "attackMove", x: targets[best][0], z: targets[best][1], formation: "wedge" }, team);
            for (const s of grp) {
                busy.add(s);
                free.delete(s);
            }
        }
    }
    /**
     * QA1 bug 6: the unit has no order left: none, or an attack-move whose last waypoint it reached (the sim keeps
     * ordType attackMove after arrival so the unit keeps engaging; for the commander it is free again), and no s5 order.
     */
    idle(sim, s) {
        return (sim.ordType[s] === ORD_NONE || (sim.ordType[s] === ORD_ATTACK_MOVE && !sim.waypoints[s])) && !sim.ord.ext.has(sim.eid[s]);
    }
    /**
     * QA1 bug 10: the mission's active primary objective as the commander of `team` sees it: type, whether it is the
     * team's own (mine) or its opponent's, the team it is for, and the spot it is about (named structure / extraction
     * point; owner = that structure's team). Null without a mission, once decided, or when its structure is gone.
     */
    mission(sim, team) {
        const O = sim.match?.objectives;
        if (!O || !O.list.length)
            return null;
        const ob = O.primary;
        if (ob.status !== objectives_ts_1.OS_ACTIVE)
            return null;
        const type = objectives_ts_1.OBJ_TYPES[ob.type], P = sim.pts;
        const out = { type, mine: ob.team === team, team: ob.team, x: 0, z: 0, radius: 0, owner: -1, point: -1 };
        if (type === "destroyStructure") {
            const s = sim.idToSlot.get(ob.target);
            if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
                return null;
            out.x = sim.x[s];
            out.z = sim.z[s];
            out.radius = sim.d.tRadius[sim.etype[s]];
            out.owner = sim.team[s];
        }
        else if (type === "captureExtract" && P && ob.point >= 0) {
            out.x = P.px[ob.point];
            out.z = P.pz[ob.point];
            out.point = ob.point;
            out.owner = P.owner[ob.point];
        }
        return out;
    }
    /** The unit's current order is an attack-move ending at Core c. */
    headingTo(sim, s, c) {
        if (!c || sim.ordType[s] !== ORD_ATTACK_MOVE)
            return false;
        const wp = sim.waypoints[s];
        return !!wp && wp[wp.length - 2] === sim.clampMap(c[1]) && wp[wp.length - 1] === sim.clampMap(c[2]);
    }
    /**
     * s8 construction, at most one open site per team: a Gas Extractor on a held, supplied geyser point; a Silo / Gas Tank
     * when the stock is at storageFullFraction of its cap; Gun Towers at the own Core's point up to coreTowers, then at
     * other held points up to towersPerPoint (front-line points first). Returns the ore / gas it committed this decision.
     */
    construct(sim, team, next, df, ownCore) {
        const C = sim.con, P = sim.pts, d = sim.d;
        if (!C || !P || C.builderType < 0)
            return [0, 0];
        for (const st of C.sites.values())
            if (st.team === team) {
                // fix-t1-ai (QA5-4 test): a site on a point that is no longer the team's and supplied cannot be built (doc 6) and
                // held the team's one construction job for good (skirmish-2 seed 2 team 1: its Relay Tower site for 10+ min): cancel it
                if (P.owner[st.point] !== team || !(P.flags[st.point] & points_ts_1.PT_SUPPLIED))
                    sim.queueCancelBuild(next, st.id, team);
                return [0, 0];
            }
        // QA1 bug 7: a fortification in progress is the team's one construction job too (its builder only walks to the point
        // while it has no site to build, so new sites starved it for good)
        if (sim.eco2)
            for (const j of sim.eco2.jobs.values())
                if (j.team === team)
                    return [0, 0];
        const ti = (id) => d.typeIds.indexOf(id);
        let reserve = null; // a priority build only short of ore / gas: its cost is held back from production
        const home = ownCore >= 0 ? P.pointAt(sim.x[ownCore], sim.z[ownCore]) : -1;
        // Frontline (lanes.ts): after lanes.techAfterSeconds the tech buildings come first (Armoury, Air Pad, Tech Lab at the
        // Core's point), their cost held back from production, so the waves move up to tier 2 and 3 units
        if (sim.lanes && sim.tick >= sim.lanes.rules.techAfterTicks && home >= 0) {
            const tech = this.baseList(sim, team, next, home, [], this.rules.baseTech);
            if (tech)
                return tech;
        }
        // QA1 bug 7: base slots at the Core's point are kept for the tech / air buildings of the build order the team still
        // lacks (baseBuildOrder.tech): any other building there must leave that many normal slots free (a defence building
        // going into a free defence-only slot takes none)
        const techMissing = this.techMissing(sim, team);
        const homeRoom = (t) => {
            if (home < 0 || techMissing === 0)
                return true;
            const sl = C.slotsOf(sim, home);
            if (C.tDefence[t] && sl.freeDefence > sl.free)
                return true;
            return sl.free - 1 >= techMissing;
        };
        // fix-t1-ai (QA5-4 test): a missing call building (the Relay Tower: a citadel site, the relay ridge or a forward base)
        // is kept a slot too. A full Core point left it only the relay ridge and forward bases, whose slots the storage,
        // Reactor and tower steps (all before the call buildings) filled first, so the tower waited until the contested ridge
        // was held with ore to spare (skirmish-2 seed 2 team 1: Tech Lab 13.6 min, Relay Tower 23.2). While a call building
        // is missing, the last free normal slot of a held point that takes it is used for nothing else.
        const callOn = !!(this.callRules && this.callRules.interval.get(sim.match.difficulty[team]));
        const callMiss = [];
        if (callOn)
            for (const id of this.callBuildings) {
                const t = ti(id);
                if (t >= 0 && !this.hasOrSite(sim, team, t))
                    callMiss.push(t);
            }
        const takes = (cb, p) => sim.eco2 && sim.eco2.isForward(p) ? sim.eco2.buildAllowedAt(p, cb) : C.tPointTypes[cb].includes(P.types[p]); // as C.refusal
        const callRoom = (t, p) => {
            if (!callMiss.length || callMiss.includes(t) || C.tGeyser[t])
                return true;
            const sl = C.slotsOf(sim, p);
            if (C.tDefence[t] && sl.freeDefence > sl.free)
                return true;
            for (const cb of callMiss)
                if (takes(cb, p) && sl.free - 1 < 1)
                    return false;
            return true;
        };
        const tryBuild = (id, p, hold = false) => {
            const t = ti(id);
            if (t < 0)
                return false;
            if (sim.fkit && sim.fkit.siteBlocked(sim, p, t))
                return false; // Frontline 4a: a site here stalled (its builder could not reach it): try elsewhere for a while
            if (p === home && !homeRoom(t))
                return false;
            if (!callRoom(t, p))
                return false;
            const why = C.refusal(sim, team, t, p);
            if (why === "cannotAfford" && hold && !reserve)
                reserve = [d.tCostOre[t], d.tCostGas[t]];
            if (why !== null)
                return false;
            sim.queueBuild(next, team, id, p);
            return true;
        };
        const cost = (id) => { const t = ti(id); return [d.tCostOre[t], d.tCostGas[t]]; };
        const held = [];
        for (let p = 0; p < P.n; p++)
            if (P.owner[p] === team && (P.flags[p] & points_ts_1.PT_SUPPLIED))
                held.push(p);
        // 1. gas
        for (const p of held)
            if (tryBuild("gas-extractor", p, true))
                return cost("gas-extractor");
        // Frontline 4a: a full stockpile is wasted income: storage first (before saving for a unit), then more producers
        const FS = sim.fkit ? sim.fkit.R.spend : null;
        if (FS) {
            const capF = sim.storageCap(team), ownedF = (id) => { const t = ti(id); let n = 0; for (let s = 0; s < sim.hi; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === t && sim.team[s] === team)
                    n++; for (const st of C.sites.values())
                if (st.team === team && st.type === t && !st.entity)
                    n++; return n; };
            const oreF = sim.ore[team] / Math.max(1, capF.ore), gasF = sim.gas[team] / Math.max(1, capF.gas);
            if (oreF >= FS.storageAt && ownedF("silo") < FS.maxStorage)
                for (const p of held)
                    if (tryBuild("silo", p, true))
                        return cost("silo");
            if (gasF >= FS.storageAt && ownedF("gas-tank") < FS.maxStorage)
                for (const p of held)
                    if (tryBuild("gas-tank", p, true))
                        return cost("gas-tank");
            if (Math.max(oreF, gasF) >= FS.producersAt)
                for (const [id, max] of Object.entries(FS.producers))
                    if (ti(id) >= 0 && ownedF(id) < max)
                        for (const p of held)
                            if (tryBuild(id, p, true))
                                return cost(id);
        }
        if (reserve)
            return reserve;
        // QA1 bug 7: tech still missing and no slot for it at the Core's point: fortify that point first (its defence-only
        // slots take the towers standing in normal slots, which frees those), before Reactors, storage and towers elsewhere
        if (techMissing > 0 && home >= 0 && sim.eco2 && C.slotsOf(sim, home).free === 0) {
            const f = this.fortifyOne(sim, team, next, home, new Set(), home);
            if (f[0] || f[1])
                return f;
        }
        // 1b. w3b power: a Reactor at a held point below systems.reactorBelowPower (doc 7)
        const SY = this.rules.systems;
        if (SY && sim.eco2)
            for (const p of held)
                if (sim.eco2.power[p] < SY.reactorBelowPower && tryBuild("reactor", p, true))
                    return cost("reactor");
        if (reserve)
            return reserve;
        // 2. storage when capped
        const cap = sim.storageCap(team), f = this.rules.storageFullFraction;
        const owned = (id) => { const t = ti(id); let n = 0; for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === t && sim.team[s] === team)
                n++; for (const st of C.sites.values())
            if (st.team === team && st.type === t && !st.entity)
                n++; return n; };
        const maxS = this.rules.maxStorageBuildings;
        if (sim.ore[team] >= cap.ore * f && owned("silo") < maxS)
            for (const p of held)
                if (tryBuild("silo", p, true))
                    return cost("silo");
        if (sim.gas[team] >= cap.gas * f && owned("gas-tank") < maxS)
            for (const p of held)
                if (tryBuild("gas-tank", p, true))
                    return cost("gas-tank");
        if (reserve)
            return reserve;
        // 3. towers
        const tower = ti("gun-tower");
        if (tower < 0)
            return [0, 0];
        const towersAt = (p) => {
            let n = 0;
            for (let s = 0; s < sim.hi; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === tower && sim.team[s] === team && P.pointAt(sim.x[s], sim.z[s]) === p)
                    n++;
            return n;
        };
        // w3b production phase: a missing producer of the base build order (one each), before the defence phase
        const prod = this.baseList(sim, team, next, home, held, this.rules.baseProduction);
        if (prod)
            return prod;
        // ruling 65: infantry squads at the Barracks cap: another Barracks, up to maxBarracks
        if (this.rules.maxBarracks > 0 && ti("barracks") >= 0 && sim.infantryCap(team) !== Infinity && sim.infantrySquads(team) >= sim.infantryCap(team) && owned("barracks") < this.rules.maxBarracks) {
            for (const p of [home, ...held.filter((q) => q !== home)])
                if (p >= 0 && tryBuild("barracks", p))
                    return cost("barracks");
        }
        if (home >= 0 && towersAt(home) < df.coreTowers && tryBuild("gun-tower", home))
            return cost("gun-tower");
        const front = new Set();
        for (const [a, b] of sim.frontLine()) {
            front.add(a);
            front.add(b);
        }
        const order = held.filter((p) => p !== home).sort((a, b) => (front.has(b) ? 1 : 0) - (front.has(a) ? 1 : 0) || towersAt(a) - towersAt(b) || a - b);
        // 4. w2b / w3b: tech and air buildings (baseBuildOrder.tech: Armoury, Air Pad, Tech Lab). QA1 bug 7: before the towers
        // at other points (they cap at towersPerPoint, but each also wants a Reactor there), so the slots and the ore go to
        // tech first
        const tech = this.baseList(sim, team, next, home, held, this.rules.baseTech);
        if (tech)
            return tech;
        // QA5-4: what the support-call loadout needs (without it only the sentry gun could ever be called)
        if (this.callRules && this.callRules.interval.get(sim.match.difficulty[team])) {
            const cb = this.baseList(sim, team, next, home, held, this.callBuildings);
            if (cb)
                return cb;
        }
        for (const p of order)
            if (towersAt(p) < df.towersPerPoint && tryBuild("gun-tower", p))
                return cost("gun-tower");
        // 5. w3b: Repair Bays on front-line points (else at home), up to systems.repairBaysWanted
        if (SY && owned("repair-bay") < SY.repairBaysWanted) {
            for (const p of [...order.filter((q) => front.has(q)), home])
                if (p >= 0 && tryBuild("repair-bay", p, true))
                    return cost("repair-bay");
            if (reserve)
                return reserve;
        }
        return this.fortifyOne(sim, team, next, home, front);
    }
    /** The team has a live building of type t or a site of it. */
    hasOrSite(sim, team, t) {
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === t && sim.team[s] === team)
                return true;
        for (const st of sim.con.sites.values())
            if (st.team === team && st.type === t)
                return true;
        return false;
    }
    /** QA1 bug 7: buildings of baseBuildOrder.tech the team has none of (live or site); the Air Pad only where aircraft fly. */
    techMissing(sim, team) {
        const C = sim.con, d = sim.d;
        let n = 0;
        for (const id of this.rules.baseTech) {
            const t = d.typeIds.indexOf(id);
            if (t < 0 || (id === "air-pad" && !d.aircraftAllowed))
                continue;
            let have = false;
            for (let s = 0; s < sim.hi && !have; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === t && sim.team[s] === team)
                    have = true;
            for (const st of C.sites.values())
                if (st.team === team && st.type === t)
                    have = true;
            if (!have)
                n++;
        }
        return n;
    }
    /**
     * w2b / w3b: the first building of `ids` the team has none of (live or site), at the Core's point, else at another held
     * point with room; one at a time. Short of ore / gas: its cost is held back (returned) and nothing later is built.
     * A building the data or planet forbids everywhere (tier locked, no air) is skipped.
     */
    baseList(sim, team, next, home, held, ids) {
        const C = sim.con, d = sim.d;
        if (home < 0)
            return null;
        for (const id of ids) {
            const t = d.typeIds.indexOf(id);
            if (t < 0)
                continue;
            if (id === "air-pad" && !d.aircraftAllowed)
                continue;
            let have = false;
            for (let s = 0; s < sim.hi && !have; s++)
                if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === t && sim.team[s] === team)
                    have = true;
            for (const st of C.sites.values())
                if (st.team === team && st.type === t)
                    have = true;
            if (have)
                continue;
            const at = [home, ...held.filter((p) => p !== home)];
            let why = "noFreeSlot";
            for (const p of at) {
                why = C.refusal(sim, team, t, p);
                if (why === null) {
                    sim.queueBuild(next, team, id, p);
                    return [d.tCostOre[t], d.tCostGas[t]];
                }
                if (why !== "noFreeSlot" && why !== "wrongPointType" && why !== "notBuildable")
                    break;
            }
            if (why === "cannotAfford")
                return [d.tCostOre[t], d.tCostGas[t]];
            if (why === "tierLocked")
                continue;
            if (why !== "noFreeSlot" && why !== "wrongPointType" && why !== "notBuildable")
                return null;
        }
        return null;
    }
    /** w2b (doc 6 "Both sides"): fortify one held, supplied point held for hegemonyFortifyAfterSeconds (front line first), one upgrade at a time. */
    fortifyOne(sim, team, next, home, front, only = -1) {
        const E = sim.eco2, P = sim.pts;
        if (!E)
            return [0, 0];
        for (const j of E.jobs.values())
            if (j.team === team)
                return [0, 0];
        const cand = [];
        for (let p = 0; p < P.n; p++)
            if ((only < 0 || p === only) && E.heldTicks(sim, p, team) >= E.R.hegemonyTicks && E.fortifyRefusal(sim, team, p) === null)
                cand.push(p);
        if (!cand.length)
            return [0, 0];
        cand.sort((a, b) => (front.has(b) ? 1 : 0) - (front.has(a) ? 1 : 0) || (a === home ? 1 : 0) - (b === home ? 1 : 0) || P.fort[a] - P.fort[b] || a - b);
        const p = cand[0], L = E.R.levels[P.fort[p] + 1];
        sim.queueFortify(next, team, p);
        return [L.ore, L.gas];
    }
    /** S14: slot s is a crewed vehicle (takes pilots; not infantry). */
    crewedVehicle(sim, s) { const t = sim.etype[s]; return sim.d.tArmour[t] !== data_ts_1.AC_INFANTRY && sim.crewable(s); }
    /** S14: no pilot available and at most pilots.lastCrews alive: the last crews are kept out of attacks. */
    lastCrews(sim, team) {
        const PR = this.rules.pilots, pool = sim.pool;
        if (!PR || !pool)
            return false;
        const c = pool.counts(sim, team);
        return c.available === 0 && c.assigned + c.onFoot <= PR.lastCrews;
    }
    /** S14: every pilots.crewOrderSeconds, a crew order for each own vehicle with empty operator seats at a pilot home (not on the auto-crew list). */
    crewEmpty(sim, team, next, df) {
        const PR = this.rules.pilots, pool = sim.pool, d = sim.d;
        if (!PR || !pool)
            return;
        const k = sim.tick + team * 7;
        if (Math.floor(k / PR.crewTicks) === Math.floor((k - df.decisionTicks) / PR.crewTicks))
            return;
        let avail = pool.avail[team];
        for (let s = 0; s < sim.hi && avail > 0; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== team || d.tStructure[sim.etype[s]] || sim.critTick[s] >= 0 || !sim.crewable(s))
                continue;
            if (pool.waiting.has(sim.eid[s]) || (sim.fkit && sim.fkit.isPlayerTagged(sim, sim.eid[s])))
                continue; // (designer 22 Nov: not a player-tagged vehicle until its tag lapses)
            const n = pool.emptySeats(sim, s).length;
            if (n === 0 || !pool.atHome(sim, s))
                continue;
            sim.queueCrew(next, team, sim.eid[s]);
            avail -= n;
        }
    }
    /** S14 (difficulties.*.huntPilots): each idle combat unit attacks the nearest detected enemy pilot on foot within pilots.huntRadiusMetres (one hunter per pilot). */
    huntPilots(sim, team, next, df, free, busy) {
        const PR = this.rules.pilots, d = sim.d, pt = d.pilotType;
        if (!PR || !df.huntPilots || PR.huntRadius <= 0 || pt < 0 || free.size === 0)
            return;
        const foes = [];
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.etype[s] === pt && sim.team[s] !== team && sim.match.inMatch(sim.team[s]) && sim.detected(s, team))
                foes.push(s);
        if (!foes.length)
            return;
        const r2 = PR.huntRadius * PR.huntRadius, taken = new Set();
        for (const s of [...free].sort((a, b) => sim.eid[a] - sim.eid[b])) {
            if (busy.has(s))
                continue;
            let best = -1, bd = r2;
            for (const f of foes) {
                if (taken.has(f))
                    continue;
                const dd = dist2(sim, s, sim.x[f], sim.z[f]);
                if (dd > bd)
                    continue;
                let can = false;
                for (let m = 0; m < sim.mCount[s]; m++)
                    if (sim.canHit(sim.mWeapon[s * data_ts_1.MAX_MOUNTS + m], f))
                        can = true;
                if (can) {
                    bd = dd;
                    best = f;
                }
            }
            if (best < 0)
                continue;
            taken.add(best);
            busy.add(s);
            free.delete(s);
            sim.queueOrder(next, [sim.eid[s]], { type: "attack", targetId: sim.eid[best] }, team);
            if (taken.size === foes.length)
                return;
        }
    }
    produce(sim, team, next, nHarv, nForce, nCtor = 0, spent = [0, 0]) {
        const d = sim.d, R = this.rules;
        const prodIds = new Set();
        // committed: what is already queued (ore / gas not yet paid for unstarted items; CP of every queued item)
        // S14: pilots the queued items will take at roll-out; ruling 65: infantry squads already queued
        let qOre = 0, qGas = 0, qSeats = 0, qInf = 0, qHarv = 0;
        const pool = sim.pool, PR = this.rules.pilots;
        const queued = new Map();
        for (const q of sim.prod.values()) {
            const bs = sim.idToSlot.get(q.building);
            if (bs === undefined || sim.team[bs] !== team)
                continue;
            queued.set(q.building, q.items.length);
            q.items.forEach((it, i) => {
                if (!(i === 0 && q.started)) {
                    qOre += d.tCostOre[it.type];
                    qGas += d.tCostGas[it.type];
                }
                if (pool)
                    qSeats += pool.seatsOf(sim, it.type);
                if (sim.isInfantrySquad(it.type))
                    qInf++;
                if (this.role[it.type] === 2)
                    qHarv++;
            });
        }
        let ore = sim.ore[team] - qOre - spent[0], gas = sim.gas[team] - qGas - spent[1];
        // available pilots not yet promised to a queued item (combat vehicles also leave pilots.reservePilots for economy
        // vehicles); infantry squads left under the Barracks cap
        let pilotsFree = pool ? pool.avail[team] - qSeats : Infinity;
        let infLeft = sim.infantryCap(team) - sim.infantrySquads(team) - qInf;
        const seatsOf = (t) => (pool ? pool.seatsOf(sim, t) : 0);
        const pilotOk = (t) => {
            const n = seatsOf(t);
            if (n > 0 && pilotsFree - (this.role[t] === 1 && PR ? PR.reservePilots : 0) < n)
                return false;
            return !sim.isInfantrySquad(t) || infLeft >= 1;
        };
        const blds = [];
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && d.tStructure[sim.etype[s]] && d.tProduces[sim.etype[s]].length)
                blds.push(s);
        const fits = (bs, t) => {
            const bt = sim.etype[bs];
            return d.tProduces[bt].includes(t) && (d.tProducesTierMask[bt] & (1 << d.tTier[t])) !== 0 && sim.tierOpen(team, d.tTier[t]) && (!d.tAir[t] || d.aircraftAllowed)
                && ore + 1e-9 >= d.tCostOre[t] && gas + 1e-9 >= d.tCostGas[t] && pilotOk(t);
        };
        const take = (bs, t) => {
            sim.queueProduction(next, sim.eid[bs], d.typeIds[t], team);
            ore -= d.tCostOre[t];
            gas -= d.tCostGas[t];
            pilotsFree -= seatsOf(t);
            if (sim.isInfantrySquad(t))
                infLeft--;
            queued.set(sim.eid[bs], (queued.get(sim.eid[bs]) ?? 0) + 1);
            prodIds.add(sim.eid[bs]);
        };
        // harvesters first
        let harvNeed = R.harvestersWanted + (sim.fkit ? sim.fkit.harvestersBonus(team) : 0) - nHarv - qHarv; // Frontline 4a: ore priority
        for (const bs of blds) {
            if (harvNeed <= 0)
                break;
            if ((queued.get(sim.eid[bs]) ?? 0) >= R.maxQueued)
                continue;
            const t = this.role.findIndex((r, i) => r === 2 && d.tProduces[sim.etype[bs]].includes(i));
            if (t >= 0 && fits(bs, t)) {
                take(bs, t);
                harvNeed--;
            }
        }
        // constructors (s8) next
        const ct = sim.con ? sim.con.builderType : -1;
        let ctorNeed = ct >= 0 ? R.constructorsWanted - nCtor : 0;
        if (ctorNeed > 0)
            for (const q of sim.prod.values()) {
                const bs = sim.idToSlot.get(q.building);
                if (bs !== undefined && sim.team[bs] === team)
                    for (const it of q.items)
                        if (it.type === ct)
                            ctorNeed--;
            }
        for (const bs of blds) {
            if (ctorNeed <= 0)
                break;
            if ((queued.get(sim.eid[bs]) ?? 0) >= R.maxQueued)
                continue;
            if (fits(bs, ct)) {
                take(bs, ct);
                ctorNeed--;
            }
        }
        // build list, rotating offset (fix-t1-ai ruling 83: the difficulty's own tier lists when it has them)
        const df = this.diff[team], TL = R.tierLists ? (df && df.tierLists) ?? R.tierLists : null;
        let L = R.buildList;
        if (TL) {
            L = [];
            for (let k = 3; k >= 1; k--)
                if (sim.tierOpen(team, k))
                    for (const t of TL[k])
                        L.push(t);
            if (!L.length)
                L = R.buildList;
        }
        const n = L.length;
        const pri = this.counterUnits(sim, team);
        const fb = this.wantForwardBaseVehicle(sim, team);
        if (fb >= 0)
            pri.unshift(fb);
        // QA1 bug 7: with a higher tier open and none of its units alive or queued, the commander saves for one: the first
        // unit of that tier's list a building of the team can produce is queued as soon as it is affordable, and until then
        // its cost is held back from cheaper picks (cheap tier-1 units otherwise took every ore and tier 3 never appeared)
        if (TL)
            for (let k = 3; k >= 2; k--) {
                if (!sim.tierOpen(team, k) || !TL[k]?.length)
                    continue;
                let have = false;
                for (let s = 0; s < sim.hi && !have; s++)
                    if (sim.alive[s] && sim.team[s] === team && s < sim.hi && !d.tStructure[sim.etype[s]] && d.tTier[sim.etype[s]] === k && sim.etype[s] < d.unitCount)
                        have = true;
                for (const q of sim.prod.values()) {
                    const bs = sim.idToSlot.get(q.building);
                    if (bs !== undefined && sim.team[bs] === team)
                        for (const it of q.items)
                            if (d.tTier[it.type] === k)
                                have = true;
                }
                if (have)
                    break;
                let goal = -1, at = -1;
                for (const t of TL[k]) {
                    for (const bs of blds) {
                        const bt = sim.etype[bs];
                        if (d.tProduces[bt].includes(t) && (d.tProducesTierMask[bt] & (1 << k)) !== 0 && (!d.tAir[t] || d.aircraftAllowed) && (queued.get(sim.eid[bs]) ?? 0) < R.maxQueued) {
                            goal = t;
                            at = bs;
                            break;
                        }
                    }
                    if (goal >= 0)
                        break;
                }
                if (goal < 0 || !pilotOk(goal))
                    break; // S14: no saving for a unit the team has no pilots for
                if (fits(at, goal))
                    take(at, goal);
                else {
                    ore -= d.tCostOre[goal];
                    gas -= d.tCostGas[goal];
                }
                break;
            }
        // fix-t1-ai ruling 83 (hard): save for a counter unit: the first wanted one a building with queue room makes but the
        // stock cannot pay has its cost held back (once), unless another wanted counter unit can be paid now
        const makes = (bs, t) => { const bt = sim.etype[bs]; return d.tProduces[bt].includes(t) && (d.tProducesTierMask[bt] & (1 << d.tTier[t])) !== 0 && sim.tierOpen(team, d.tTier[t]) && (!d.tAir[t] || d.aircraftAllowed); };
        const room = (bs) => !prodIds.has(sim.eid[bs]) && (queued.get(sim.eid[bs]) ?? 0) < R.maxQueued;
        if (df && df.saveForCounters && pri.length) {
            let payable = false, hold = -1;
            for (const t of pri)
                for (const bs of blds)
                    if (room(bs) && makes(bs, t)) {
                        if (fits(bs, t))
                            payable = true;
                        else if (hold < 0)
                            hold = t;
                    }
            if (!payable && hold >= 0) {
                ore -= d.tCostOre[hold];
                gas -= d.tCostGas[hold];
            }
        }
        for (const bs of blds) {
            if (prodIds.has(sim.eid[bs]) || (queued.get(sim.eid[bs]) ?? 0) >= R.maxQueued)
                continue;
            let pick = -1;
            for (let k = 0; k < pri.length && pick < 0; k++)
                if (fits(bs, pri[k]))
                    pick = pri[k];
            // fix-t1-ai ruling 83 (hard): saveForListItem: the first list item this building makes is the one it waits for
            for (let k = 0; k < n && pick < 0; k++) {
                const t = L[(nForce + k) % n];
                if (fits(bs, t))
                    pick = t;
                else if (df && df.saveForListItem && makes(bs, t))
                    break;
            }
            // fallback (gas-free units) only when the stock cannot pay the gas of any build-list item
            // fix-t1-ai: the lowest gas cost of the difficulty's own lists (hard's lists hold no gas-free unit: with the shared
            // value 0 it never fell back, built nothing, took no gas point and stayed at 3 gas for good)
            const mg = df && df.tierLists ? Math.min(...df.tierLists.flat().map((t) => d.tCostGas[t])) : this.minListGas;
            if (pick < 0 && gas + 1e-9 < mg)
                for (let k = 0; k < R.fallback.length && pick < 0; k++)
                    if (fits(bs, R.fallback[k]))
                        pick = R.fallback[k];
            if (pick >= 0)
                take(bs, pick);
            if (pick >= 0 && pick === fb)
                pri.shift(); // one Forward Base Vehicle per decision
        }
    }
    /**
     * Designer 21 Nov (Frontline): the AI's troop transports (Carrier, Mule) never join the lane waves on their own. An empty
     * one waits by its Core and takes on a whole free infantry squad that is there; loaded, it carries it to the most
     * forward ground its side holds on a lane (fkit.forwardDrop) and unloads it, then comes back for the next.
     */
    flTransports(sim, team, next, free, busy, ownCore) {
        const R = sim.tpRules, T = sim.tp, d = sim.d;
        if (ownCore < 0)
            return;
        const ox = sim.x[ownCore], oz = sim.z[ownCore], near = 140;
        const claimed = new Set();
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.team[s] !== team || sim.hp[s] <= 0 || !R.carrier[sim.etype[s]] || sim.etype[s] >= d.unitCount || d.tStructure[sim.etype[s]])
                continue;
            if (!sim.drv[s] || sim.driverIsPlayer(s) || sim.playerAboard(s))
                continue; // a player's transport is the player's
            free.delete(s);
            busy.add(s); // never sent out empty with a wave
            const id = sim.eid[s];
            if (T && (T.loads.some((l) => l.vehicle === id) || T.unloads.some((u) => u.vehicle === id) || T.ferries.some((f) => f.vehicle === id) || T.lifts.some((l) => l.lifter === id)))
                continue; // boarding, under way or unloading
            const aboard = T ? T.cargo.filter((c) => c.vehicle === id).length : 0;
            if (aboard > 0) { // loaded (e.g. its load just finished): to the front
                const lane = (id + sim.tick / 1200 | 0) % sim.lanes.rules.paths.length;
                const at = sim.fkit ? sim.fkit.forwardDrop(sim, team, lane) : null;
                if (at)
                    (0, transport_ts_1.tpUnload)(sim, id, at[0], at[1], team);
                continue;
            }
            const dHome = Math.hypot(sim.x[s] - ox, sim.z[s] - oz);
            if (dHome > near) { // empty and away: back to the Core for the next squad
                if (this.idle(sim, s) || sim.tick % 200 === (id % 200))
                    sim.queueOrder(next, [id], { type: "move", x: ox + 40, z: oz + 30 }, team);
                continue;
            }
            // empty at home: a whole free infantry squad by the Core boards (the transport then takes it forward)
            for (const sq of sim.squads.values()) {
                if (sq.team !== team || claimed.has(sq.id) || !sq.members.length)
                    continue;
                const ms = sq.members.map((m) => sim.idToSlot.get(m));
                if (ms.some((m) => m === undefined || !sim.alive[m] || !free.has(m) || busy.has(m) || !(d.tArmour[sim.etype[m]] === data_ts_1.AC_INFANTRY && !d.tPilot[sim.etype[m]])))
                    continue;
                if (ms.some((m) => Math.hypot(sim.x[m] - ox, sim.z[m] - oz) > near * 1.6))
                    continue;
                const r = (0, transport_ts_1.tpLoad)(sim, sq.id, id, team);
                if (!r.ok)
                    continue;
                claimed.add(sq.id);
                for (const m of ms) {
                    free.delete(m);
                    busy.add(m);
                }
                const lane = (id + sim.tick / 1200 | 0) % sim.lanes.rules.paths.length;
                const at = sim.fkit ? sim.fkit.forwardDrop(sim, team, lane) : null;
                if (at)
                    sim.tpState().ferries.push({ vehicle: id, squad: sq.id, x: at[0], z: at[1] }); // unload there once aboard
                break;
            }
        }
    }
    /** w3b: an armed aircraft that is not a transport (Wasp; not the Mule): flies strikes, not capture runs. */
    airAttacker(sim, t) { return !!this.rules.systems && sim.d.tAir[t] === 1 && !(sim.tpRules && sim.tpRules.carrier[t]); }
    /** w3b: is the weather grounding aircraft now? */
    grounded(sim) { return !!sim.weather && sim.weather.e.grounded; }
    /** w3b: nearest own Repair Bay, else Air Pad, else the Core (slot), from (x, z). */
    homeFor(sim, team, x, z, ownCore) {
        const rb = sim.eco2 ? sim.eco2.nearestRepair(sim, team, x, z) : -1;
        if (rb >= 0)
            return rb;
        const pad = sim.d.typeIds.indexOf("air-pad");
        let best = -1, bd = Infinity;
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && sim.etype[s] === pad) {
                const dd = (sim.x[s] - x) ** 2 + (sim.z[s] - z) ** 2;
                if (dd < bd) {
                    bd = dd;
                    best = s;
                }
            }
        return best >= 0 ? best : ownCore;
    }
    /** w3b aircraft: damaged or grounded ones fly home; idle healthy ones strike the nearest detected enemy ground unit in reach (harvesters first). */
    aircraft(sim, team, next, air, ownCore) {
        const SY = this.rules.systems, d = sim.d, gr = this.grounded(sim), M = sim.match;
        const R2 = SY.airStrikeRadius * SY.airStrikeRadius;
        const taken = new Set();
        // ruling 41: every own AI-flown aircraft flies low within (anti-air range + its own sensor range) of a detected enemy
        // anti-air unit or structure (a weapon that can hit aircraft and is flak or air-only), and at normal height elsewhere
        if (sim.lowRules) {
            const aa = [], MM = data_ts_1.MAX_MOUNTS;
            for (let o = 0; o < sim.hi; o++) {
                if (!sim.alive[o] || sim.hp[o] <= 0 || sim.team[o] === team || !M.inMatch(sim.team[o]) || !sim.detected(o, team))
                    continue;
                for (let m = 0; m < sim.mCount[o]; m++) {
                    const w = sim.mWeapon[o * MM + m];
                    if (w >= 0 && d.wCanHitAir[w] && (!d.wCanHitGround[w] || data_ts_1.DAMAGE_TYPES[d.wDamageType[w]] === "flak")) {
                        aa.push(o);
                        break;
                    }
                }
            }
            for (let s = 0; s < sim.hi; s++) {
                if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== team || !d.tAir[sim.etype[s]] || sim.driverIsPlayer(s))
                    continue;
                const reach = d.tSensor[sim.etype[s]];
                let low = false;
                for (const o of aa) {
                    const r = sim.maxRange[o] + reach;
                    if (dist2(sim, s, sim.x[o], sim.z[o]) <= r * r) {
                        low = true;
                        break;
                    }
                }
                if ((sim.lowFly[s] === 1) !== low)
                    sim.setLowFlight(sim.eid[s], low);
            }
        }
        for (const s of air) {
            const hurt = sim.hp[s] < SY.airReturnHull * d.tHp[sim.etype[s]];
            if (hurt || gr) {
                const h = this.homeFor(sim, team, sim.x[s], sim.z[s], ownCore);
                if (h >= 0 && sim.ordType[s] !== ORD_MOVE && dist2(sim, s, sim.x[h], sim.z[h]) > (d.tRadius[sim.etype[h]] + 20) ** 2)
                    sim.queueOrder(next, [sim.eid[s]], { type: "move", x: sim.x[h], z: sim.z[h] }, team);
                continue;
            }
            if (sim.ordType[s] !== ORD_NONE || sim.ord.ext.has(sim.eid[s]))
                continue;
            let best = -1, bk = Infinity;
            for (let o = 0; o < sim.hi; o++) {
                if (!sim.alive[o] || sim.hp[o] <= 0 || sim.team[o] === team || !M.inMatch(sim.team[o]) || d.tStructure[sim.etype[o]] || d.tAir[sim.etype[o]] || taken.has(o))
                    continue;
                const dd = dist2(sim, s, sim.x[o], sim.z[o]);
                if (dd > R2 || !sim.detected(o, team))
                    continue;
                const k = dd + (this.role[sim.etype[o]] === 2 ? 0 : R2); // harvesters first
                if (k < bk) {
                    bk = k;
                    best = o;
                }
            }
            if (best >= 0) {
                taken.add(best);
                sim.queueOrder(next, [sim.eid[s]], { type: "attack", targetId: sim.eid[best] }, team);
            }
        }
    }
    /** w3b: the Forward Base Vehicle type to queue first, or -1 (enough deployed, deploying or alive / queued). */
    wantForwardBaseVehicle(sim, team) {
        const SY = this.rules.systems, E = sim.eco2;
        if (!SY || !E || SY.forwardBasesWanted <= 0 || E.R.fbvType < 0)
            return -1;
        if (E.baseCount(sim, team) >= Math.min(SY.forwardBasesWanted, E.baseLimit(sim)))
            return -1;
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && sim.etype[s] === E.R.fbvType)
                return -1;
        for (const q of sim.prod.values()) {
            const bs = sim.idToSlot.get(q.building);
            if (bs !== undefined && sim.team[bs] === team && q.items.some((it) => it.type === E.R.fbvType))
                return -1;
        }
        return E.R.fbvType;
    }
    /** w3b: idle Forward Base Vehicles drive to the best site (held, supplied, not a citadel, no base; front line first, not home) and deploy there. */
    forwardBases(sim, team, next, ownCore) {
        const E = sim.eco2, P = sim.pts;
        if (!E || !P || E.R.fbvType < 0)
            return;
        const home = ownCore >= 0 ? P.pointAt(sim.x[ownCore], sim.z[ownCore]) : -1;
        const front = new Set();
        for (const [a, b] of sim.frontLine()) {
            front.add(a);
            front.add(b);
        }
        const site = (p) => p >= 0 && p !== home && P.owner[p] === team && (P.flags[p] & points_ts_1.PT_SUPPLIED) !== 0 && P.types[p] !== "citadel-site" && !E.isForward(p);
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== team || sim.etype[s] !== E.R.fbvType || !sim.drv[s] || sim.driverIsPlayer(s))
                continue;
            if (E.baseJobs.has(sim.eid[s]))
                continue;
            const here = P.pointAt(sim.x[s], sim.z[s]);
            if (site(here) && (front.has(here) || sim.ordType[s] === ORD_NONE)) {
                sim.queueDeployBase(next, sim.eid[s], team);
                continue;
            }
            if (sim.ordType[s] !== ORD_NONE)
                continue;
            let best = -1, bc = Infinity;
            for (let p = 0; p < P.n; p++)
                if (site(p)) {
                    const c = Math.sqrt(dist2(sim, s, P.px[p], P.pz[p])) - (front.has(p) ? 100000 : 0);
                    if (c < bc) {
                        bc = c;
                        best = p;
                    }
                }
            if (best >= 0)
                sim.queueOrder(next, [sim.eid[s]], { type: "move", x: P.px[best], z: P.pz[best] }, team);
        }
    }
    /** w3b: lift one ground vehicle of grp with the nearest idle AI Mule when the target is far; returns the lifted slot or -1. */
    tryAirlift(sim, team, next, grp, x, z, busy) {
        const SY = this.rules.systems, R = sim.tpRules, d = sim.d, T = sim.tp;
        if (this.grounded(sim))
            return -1;
        let cx = 0, cz = 0;
        for (const s of grp) {
            cx += sim.x[s];
            cz += sim.z[s];
        }
        cx /= grp.length;
        cz /= grp.length;
        if ((x - cx) ** 2 + (z - cz) ** 2 < SY.airliftMinDistance ** 2)
            return -1;
        const veh = grp.find((s) => d.tVehicle[sim.etype[s]] && !d.tAir[sim.etype[s]] && !(T && T.lifts.some((l) => l.target === sim.eid[s])));
        if (veh === undefined)
            return -1;
        let mule = -1, bd = Infinity;
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== team || !d.tAir[sim.etype[s]] || !(R.liftVehicles[sim.etype[s]] > 0) || busy.has(s))
                continue;
            if (!sim.drv[s] || sim.driverIsPlayer(s) || sim.ordType[s] !== ORD_NONE)
                continue;
            if (this.rules.director && sim.hp[s] < this.rules.director.retreatHullFraction * d.tHp[sim.etype[s]])
                continue; // QA5-3: a hurt Mule is not sent to lift
            const id = sim.eid[s];
            if (T && (T.lifts.some((l) => l.lifter === id) || T.cargo.some((c) => c.vehicle === id) || T.unloads.some((u) => u.vehicle === id)))
                continue;
            const dd = dist2(sim, s, sim.x[veh], sim.z[veh]);
            if (dd < bd) {
                bd = dd;
                mule = s;
            }
        }
        if (mule < 0)
            return -1;
        sim.queueAirlift(next, sim.eid[mule], sim.eid[veh], team);
        busy.add(mule);
        return veh;
    }
    /** QA5-3: lifter slot s has a sling load: unload it at its own position (unless an unload there is under way); true if so. */
    dropSling(sim, team, next, s, busy) {
        const T = sim.tp, id = sim.eid[s];
        if (!T.lifts.some((l) => l.lifter === id && l.slung))
            return false;
        const u = T.unloads.find((q) => q.vehicle === id), r = sim.tpRules.unloadRadius;
        if (!u || (u.x - sim.x[s]) ** 2 + (u.z - sim.z[s]) ** 2 > r * r)
            sim.queueUnload(next, id, sim.x[s], sim.z[s], team);
        busy.add(s);
        return true;
    }
    /** w3b: a Mule with a slung vehicle and no unload under way flies it to the nearest point its team does not own and drops it there. */
    slingLoads(sim, team, next) {
        const T = sim.tp, P = sim.pts;
        if (!T || !P || !T.lifts.length)
            return;
        const done = new Set();
        for (const l of T.lifts) {
            if (!l.slung || done.has(l.lifter) || T.unloads.some((u) => u.vehicle === l.lifter))
                continue;
            const ls = sim.idToSlot.get(l.lifter);
            if (ls === undefined || sim.team[ls] !== team || sim.driverIsPlayer(ls))
                continue;
            done.add(l.lifter);
            let best = -1, bd = Infinity;
            for (let p = 0; p < P.n; p++)
                if (P.owner[p] !== team) {
                    const dd = dist2(sim, ls, P.px[p], P.pz[p]);
                    if (dd < bd) {
                        bd = dd;
                        best = p;
                    }
                }
            if (best >= 0)
                sim.queueUnload(next, l.lifter, P.px[best], P.pz[best], team);
        }
    }
    /** w3b: the counter units production should try first now (enemyAi.counters; see AiRules.counters). */
    counterUnits(sim, team) {
        const R = this.rules.counters;
        if (!R.length)
            return [];
        const seen = [0, 0, 0, 0], own = new Map();
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s] || sim.hp[s] <= 0)
                continue;
            const t = sim.etype[s];
            if (sim.team[s] === team) {
                own.set(t, (own.get(t) ?? 0) + 1);
                continue;
            }
            const c = this.seenClass[t];
            if (!c || !sim.match.inMatch(sim.team[s]) || !sim.detected(s, team))
                continue;
            for (let k = 0; k < 4; k++)
                if (c & (1 << k))
                    seen[k]++;
        }
        for (const q of sim.prod.values()) {
            const bs = sim.idToSlot.get(q.building);
            if (bs !== undefined && sim.team[bs] === team)
                for (const it of q.items)
                    own.set(it.type, (own.get(it.type) ?? 0) + 1);
        }
        const out = [];
        for (const r of R) {
            const k = Math.log2(r.seen), n = seen[k];
            if (n < r.minSeen)
                continue;
            let have = 0;
            for (const u of new Set(r.units))
                have += own.get(u) ?? 0;
            if (have < Math.ceil(r.perSeen * n))
                for (const u of r.units)
                    if (!out.includes(u))
                        out.push(u);
        }
        return out;
    }
}
exports.EnemyAi = EnemyAi;
/** Deterministic hash of four integers to [0, 1) (Director phase jitter; not the sim PRNG, so no draw is consumed). */
function hash01(a, b, c, d) {
    let h = 0x9e3779b9 ^ (a | 0);
    for (const v of [b, c, d]) {
        h = Math.imul(h ^ (v | 0), 0x85ebca6b);
        h ^= h >>> 13;
        h = Math.imul(h, 0xc2b2ae35);
        h ^= h >>> 16;
    }
    return (h >>> 0) / 4294967296;
}
function dist2(sim, s, x, z) { const dx = sim.x[s] - x, dz = sim.z[s] - z; return dx * dx + dz * dz; }
