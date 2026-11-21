const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const tr = sim.d.constants.tickRate;
for (const [tx, tz] of [[1760, 2010], [1240, 990], [1350, 1650]]) {
  const r = sim.trySpawnUnit("constructor", 0, 600, 2400, { crew: "expert" }), id = r.ids[0], s = sim.idToSlot.get(id);
  sim.lanes && (sim.fkit.held.set(id, 1e9));
  console.log("move", sim.queueOrder(sim.tick + 1, [id], { type: "move", x: tx, z: tz }, 0));
  for (let i = 0; i < 90 * tr; i++) sim.step();
  console.log(`to ${tx},${tz}: at ${sim.x[s].toFixed(0)},${sim.z[s].toFixed(0)} ord ${sim.ordType[s]} drv ${sim.drv[s]} moveClass ${sim.d.tMove[sim.etype[s]]}`);
}
