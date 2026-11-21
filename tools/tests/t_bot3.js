const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 600, 2400, { player: 0 });
const B = sim.fkit.bots;
for (let i = 0; i < 3; i++) sim.step();
const b = B.bots[0], p = sim.pilot(b.pid);
for (let t = 0; t < 12; t++) {
  for (let i = 0; i < 20; i++) sim.step();
  const s = sim.idToSlot.get(p.entity);
  console.log(t, "state", p.state, "pos", sim.x[s].toFixed(1), sim.z[s].toFixed(1), "ord", sim.ordType[s], "ctlOn", sim.ctlOn[s], "goal", b.goal, "wps", sim.waypoints[s] ? sim.waypoints[s].length : null, "speed", sim.d.tSpeed?.[sim.etype[s]]);
}
const rej = []; 
console.log("orders", B.stats.orders);
