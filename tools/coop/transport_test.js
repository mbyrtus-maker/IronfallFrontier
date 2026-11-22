// Designer 21 Nov (Frontline): the AI's Carriers and Mules carry infantry squads to the front and never go out empty.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 5, difficulty: "normal", players: 1 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
let core = -1; for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === 1 && sim.d.typeIds[sim.etype[o]] === "command-core") core = o;
const cx = sim.x[core], cz = sim.z[core];
for (let i = 0; i < 3; i++) sim.step();
const mk = (id, dx, dz) => { const r = sim.spawnUnit(id, 1, cx + dx, cz + dz); return typeof r === "number" ? r : r.ids[0]; };
const car = mk("carrier", 40, 40), mule = mk("mule", -40, 40);
mk("trooper-squad", 30, 55); mk("trooper-squad", -30, 55); mk("sapper-team", 50, -30);
const slot = (id) => sim.idToSlot.get(id);
let emptyAway = 0, carried = 0, maxAboard = { [car]: 0, [mule]: 0 }, dropped = 0; const lastN = {}, dropAt = [];
for (let k = 0; k < 20 * 150; k++) {
    sim.step();
    for (const v of [car, mule]) {
        const s = slot(v); if (s === undefined) continue;
        const n = sim.tp ? sim.tp.cargo.filter((c) => c.vehicle === v).length : 0;
        maxAboard[v] = Math.max(maxAboard[v], n);
        if ((lastN[v] ?? 0) > 0 && n === 0) dropAt.push(Math.round(Math.hypot(sim.x[s] - cx, sim.z[s] - cz)));
        lastN[v] = n;
        const away = Math.hypot(sim.x[s] - cx, sim.z[s] - cz);
        const returning = sim.tp && (sim.tp.unloads.some((u) => u.vehicle === v));
        if (away > 400 && n === 0 && !returning && maxAboard[v] === 0) emptyAway++;
    }
}
check("the Carrier took troops aboard", maxAboard[car] > 0, maxAboard);
check("the Mule took troops aboard", maxAboard[mule] > 0, maxAboard);
check("neither went to the front before carrying anyone", emptyAway === 0, { emptyAway });
check("they unloaded the troops well forward of the Core", dropAt.length >= 2 && dropAt.every((d) => d > 300), { dropAt });
process.exit(0);
