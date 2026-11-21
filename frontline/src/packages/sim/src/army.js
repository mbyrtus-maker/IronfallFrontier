"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combatTypes = combatTypes;
exports.ceilingOrePerPilot = ceilingOrePerPilot;
exports.armyStrength = armyStrength;
const data_ts_1 = require("./data.js");
const combatCache = new WeakMap();
/** Per type: 1 = units.json category "combat" (cached per compiled data). */
function combatTypes(sim) {
    let a = combatCache.get(sim.d);
    if (!a) {
        a = new Uint8Array(sim.d.typeIds.length);
        sim.d.raw.units.forEach((u, t) => { if (u.category === "combat")
            a[t] = 1; });
        combatCache.set(sim.d, a);
    }
    return a;
}
/** Ore per live pilot of the army ceiling (constants.enemyAi.pilots.ceilingOrePerPilot; 0: none). */
function ceilingOrePerPilot(sim) {
    const v = sim.d.raw.constants.enemyAi?.pilots?.ceilingOrePerPilot;
    return typeof v === "number" && v > 0 ? v : 0;
}
/**
 * The team's army strength (see the header). Pure: reads the sim, changes nothing. fix-t1-ai: `of` limits the count to
 * those slots (the commander's rally point, a push, a spent wave; same measure).
 */
function armyStrength(sim, team, of) {
    const d = sim.d, cat = combatTypes(sim), sq = new Set();
    let ore = 0, crewed = 0, infantry = 0;
    const n = of ? of.length : sim.hi;
    for (let i = 0; i < n; i++) {
        const s = of ? of[i] : i;
        if (!sim.alive[s] || sim.hp[s] <= 0 || sim.team[s] !== team)
            continue;
        const t = sim.etype[s];
        if (!cat[t] || !(sim.mCount[s] > 0) || !sim.drv[s] || sim.critTick[s] >= 0)
            continue;
        const inf = d.tArmour[t] === data_ts_1.AC_INFANTRY;
        if (!inf && d.tDriverSeat[t] >= 0)
            crewed++;
        if (sq.has(sim.squad[s]))
            continue;
        sq.add(sim.squad[s]);
        ore += d.tCostOre[t];
        if (inf)
            infantry += d.tCostOre[t];
    }
    const pilots = sim.pool ? sim.pool.alive(sim, team) : Infinity;
    const k = ceilingOrePerPilot(sim);
    const ceiling = sim.pool && k > 0 ? k * pilots + infantry : Infinity;
    return { ore, crewed, infantry, pilots, ceiling };
}
