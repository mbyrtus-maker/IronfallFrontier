const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
for (const pr of ["balanced", "ore", "gas"]) {
  const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
  sim.fkit.setPriority(0, pr);
  const tr = sim.d.constants.tickRate;
  let oreIn = 0, gasIn = 0, po = sim.ore[0], pg = sim.gas[0];
  // income: count positive deltas only (spending is negative)
  for (let i = 0; i < 6 * 60 * tr; i++) { sim.step(); const dO = sim.ore[0] - po, dG = sim.gas[0] - pg; if (dO > 0) oreIn += dO; if (dG > 0) gasIn += dG; po = sim.ore[0]; pg = sim.gas[0]; }
  console.log(pr.padEnd(9), "6 min income: ore", Math.round(oreIn), "gas", Math.round(gasIn));
}
