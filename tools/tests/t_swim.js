const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 470, 2530, { player: 0 });
for (let i = 0; i < 20 * 20; i++) sim.step();
const b = sim.fkit.bots.bots.find((q) => q.r.name === "Kade"), p = sim.pilot(b.pid);
sim.exit(b.pid, 1); for (let i = 0; i < 2; i++) sim.step();
let s = sim.idToSlot.get(p.entity);
sim.queueOrder(sim.tick + 1, [p.entity], { type: "move", x: 2570, z: 430 }, 1); for (let i = 0; i < 5; i++) sim.step(); // heading home, like a retreat
s = sim.idToSlot.get(p.entity); const x0 = sim.x[s], z0 = sim.z[s];
console.log("downed:", sim.fkit.bots.testDown(sim, "Kade"), "ord", sim.ordType[s]);
for (let i = 0; i < 20 * 10; i++) sim.step();
s = sim.idToSlot.get(p.entity);
console.log("state", p.state, "moved while down:", Math.hypot(sim.x[s] - x0, sim.z[s] - z0).toFixed(1), "m in 10 s");
for (let t = 0; t < 4; t++) { for (let i = 0; i < 20; i++) sim.step(); s = sim.idToSlot.get(p.entity); console.log("t", t, "pos", sim.x[s].toFixed(0), sim.z[s].toFixed(0), "ord", sim.ordType[s], "wps", JSON.stringify(sim.waypoints[s]), "ctlOn", sim.ctlOn[s], "vel", sim.velX[s].toFixed(1), sim.velZ[s].toFixed(1), "hp", sim.hp[s]); }
