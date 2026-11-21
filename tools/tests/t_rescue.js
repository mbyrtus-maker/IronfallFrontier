const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js"), PK = req("packages/sim/src/pilotkit.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const me = sim.spawnPilot(0, 600, 2300, { player: 0 });
for (let i = 0; i < 3; i++) sim.step();
const B = sim.fkit.bots, mp = sim.pilot(me), ms = sim.idToSlot.get(mp.entity);
const b = B.bots.find((q) => q.r.name === "Okoro"), bp = sim.pilot(b.pid);
const vs = sim.idToSlot.get(bp.vehicle); sim.x[vs] = 700; sim.z[vs] = 2300; // its Dart 100 m away
sim.hp[ms] = 0; console.log("player downed?", PK.kitTryDown(sim, ms, false));
for (let t = 0; t < 30; t += 3) {
  for (let i = 0; i < 60; i++) sim.step();
  const at = bp.state === 1 ? sim.idToSlot.get(bp.entity) : bp.state === 0 ? sim.idToSlot.get(bp.vehicle) : undefined;
  console.log(`${t + 3}s player state ${mp.state} | Okoro st${bp.state} ${b.state} ${at !== undefined ? Math.hypot(sim.x[at] - sim.x[ms], sim.z[at] - sim.z[ms]).toFixed(0) + "m" : ""}`);
  if (mp.state === 1) break;
}
