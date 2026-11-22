// Perf: run a Frontline match with AI on both sides for N ticks; prints ms/tick per phase window and a state hash.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const N = +(process.argv[2] || 6000);
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const t0 = performance.now(); let w = t0, maxN = 0, worst = 0;
for (let i = 0; i < N; i++) {
  const a = performance.now(); sim.step(); const d = performance.now() - a; worst = Math.max(worst, d);
  if ((i + 1) % 1000 === 0) { let n = 0; for (let o = 0; o < sim.hi; o++) if (sim.alive[o]) n++; maxN = Math.max(maxN, n);
    console.log(`ticks ${i + 1}: ${((performance.now() - w) / 1000).toFixed(3)} ms/tick, entities ${n}, worst ${worst.toFixed(1)} ms`); w = performance.now(); worst = 0; }
}
let h = 0; for (let o = 0; o < sim.hi; o++) if (sim.alive[o]) h = (h * 31 + Math.round(sim.x[o] * 10) + Math.round(sim.z[o] * 10) * 7 + sim.etype[o]) | 0;
console.log("total", ((performance.now() - t0) / N).toFixed(3), "ms/tick", "hash", h, "tick", sim.tick);
