const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const tr = sim.d.constants.tickRate;
const ids = {};
for (const [k, u] of [["ctor", "constructor"], ["lancer", "lancer"], ["harv", "harvester"], ["bastion", "bastion"]]) {
  const r = sim.trySpawnUnit(u, 0, 600 + Object.keys(ids).length * 15, 2400, { crew: "expert" }); ids[k] = r.ids[0]; sim.fkit.held.set(r.ids[0], 1e9);
  sim.queueOrder(sim.tick + 1, [r.ids[0]], { type: "move", x: 1760, z: 2010 }, 0);
}
for (let t = 0; t < 6; t++) {
  for (let i = 0; i < 30 * tr; i++) sim.step();
  console.log(`t${(t + 1) * 30}s`, Object.entries(ids).map(([k, id]) => { const s = sim.idToSlot.get(id); return `${k}:${sim.x[s].toFixed(0)},${sim.z[s].toFixed(0)} o${sim.ordType[s]}`; }).join("  "));
}
