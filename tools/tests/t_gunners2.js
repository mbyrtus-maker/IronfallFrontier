const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const occOf = (id) => { const s = sim.idToSlot.get(id), t = sim.etype[s], o = []; for (let j = 0; j < sim.d.tSeatCount[t]; j++) o.push([["D", "G", "P"][sim.d.tSeatRole[t * 12 + j]], sim.occ[s * 12 + j]]); return o; };
const id = sim.spawnUnit("gunship", 0, 700, 2300, { crew: "none" });
{ const ns = sim.idToSlot.get(id); sim.flyAlt[ns] = 0; sim.airS[ns] = 0; sim.y[ns] = sim.groundY ? sim.groundY(700, 2300) : sim.y[ns]; }
for (const dx of [3, 5, 7, 9, 12]) {
  const pid = sim.spawnPilot(0, 700 + dx, 2300, { player: 0 });
  for (let i = 0; i < 3; i++) sim.step();
  const r = sim.enter(pid, id, undefined, 0);
  if (r.ok) { for (let i = 0; i < 30; i++) sim.step(); console.log("dx", dx, JSON.stringify(r), JSON.stringify(occOf(id)), "added", sim.fkit.gunnersAdded); break; }
  else console.log("dx", dx, r.reason);
}
