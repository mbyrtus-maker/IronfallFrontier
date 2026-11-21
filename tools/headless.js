// Headless run of a fixture scenario through the sim (createScenarioSim), with a lane/army report.
const { load, makeRequire } = require("./srcmap.js");
const root = process.argv[2], scId = process.argv[3] ?? "frontline", secs = Number(process.argv[4] ?? 600);
const { SRC, DATA } = load(root);
const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const sim_ = req("packages/sim/src/index.js");
const sc = req(`packages/sim/fixtures/scenarios/${scId}.json`), map = req(sc.map.replace("../", "packages/sim/fixtures/"));
const sim = sim_.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 447, 2576, { player: 0 });
const tr = sim.d.constants.tickRate;
const t0 = Date.now();
for (let t = 0; t < secs * tr; t++) {
  sim.step();
  if (t % (60 * tr) === 0 || t === secs * tr - 1) {
    const cnt = [{}, {}];
    for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] < 2) { const id = sim.d.typeIds[sim.etype[s]]; cnt[sim.team[s]][id] = (cnt[sim.team[s]][id] ?? 0) + 1; }
    const st = [0, 1].map((tm) => sim.stock ? JSON.stringify(sim.stock(tm)) : "");
    console.log(`t=${Math.round(t / tr)}s lanes0=${sim.lanes ? sim.lanes.counts(sim, 0) : "-"} lanes1=${sim.lanes ? sim.lanes.counts(sim, 1) : "-"} over=${sim.match.over} winner=${sim.match.winner}`);
    if (sim.pts) console.log("  points", Array.from({ length: sim.pts.n }, (_, p) => `${sim.pts.ids ? sim.pts.ids[p] : p}:${sim.pts.owner[p]}`).join(" "));
    console.log("  W", JSON.stringify(cnt[0])); console.log("  E", JSON.stringify(cnt[1]));
    if (sim.match.over) break;
  }
}
console.log("ms", Date.now() - t0);
