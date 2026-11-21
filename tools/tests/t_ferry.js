const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 447, 2576, { player: 0 });
const tr = sim.d.constants.tickRate;
for (let i = 0; i < 150 * tr; i++) sim.step();
sim.fkit.lane = Number(process.argv[2] ?? 1);
const p = sim.pilot(pid); const s = sim.idToSlot.get(p.entity);
sim.hp[s] = 0; sim.dying[sim.nDying++] = s; // kill the pilot
for (let i = 0; i < 90 * tr; i++) { sim.step(); if (i % (5 * tr) === 0) { const pp = sim.pilot(pid); const e = sim.entity(pp.state === 0 ? pp.vehicle : pp.entity); console.log(`t+${i / tr}s state ${pp.state} ${pp.state === 0 ? sim.d.typeIds[sim.etype[sim.idToSlot.get(pp.vehicle)]] : ""} at ${e ? Math.round(e.x) + "," + Math.round(e.z) : "-"} ferry ${sim.fkit.ferry.size} pending ${sim.fkit.pending.size}`); } }
