const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
for (const pr of ["balanced", "gas", "ore"]) {
  const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
  sim.fkit.setPriority(0, pr);
  const d = sim.d, tr = d.constants.tickRate;
  const n = (id) => { let k = 0; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0 && d.typeIds[sim.etype[s]] === id) k++; return k; };
  let gasSum = 0, oreSum = 0, lastO = sim.ore[0], lastG = sim.gas[0];
  for (let i = 0; i < 8 * 60 * tr; i++) { sim.step(); }
  const held = []; for (let p = 0; p < sim.pts.n; p++) if (sim.pts.owner[p] === 0) held.push(sim.pts.ids ? sim.pts.ids[p] : p);
  console.log(pr.padEnd(9), "8 min: extractors", n("gas-extractor"), "harvesters", n("harvester"), "points held", held.length, "raiders", [...sim.fkit.raiders].length);
}
{
  const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
  const tr = sim.d.constants.tickRate;
  for (let i = 0; i < 90 * tr; i++) sim.step();
  const before = sim.lanes.counts(sim, 0);
  sim.fkit.requestLane(sim, 0, 0, 8);
  for (let i = 0; i < 60 * tr; i++) sim.step();
  const after = sim.lanes.counts(sim, 0);
  console.log("lane counts before request", before, "60 s after a TOP request", after, "focus", sim.fkit.focusOf(sim, 0));
}
