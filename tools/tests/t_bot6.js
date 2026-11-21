const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const me = sim.spawnPilot(0, 600, 2400, { player: 0 });
const B = sim.fkit.bots;
for (let i = 0; i < 20 * 40; i++) sim.step();
sim.fkit.addPing(sim, 0, 900, 2100, "attack", me);
console.log("ping at 900,2100");
for (let t = 0; t < 6; t++) {
  for (let i = 0; i < 20 * 5; i++) sim.step();
  console.log((40 + t * 5 + 5) + "s", B.status(sim).filter((q) => q.team === 0).map((q) => { const p = sim.pilot(q.id), e = sim.entity(p.state === 1 ? p.entity : p.vehicle); return `${q.name} ${q.state}/${q.mode} ${e ? e.x.toFixed(0) + "," + e.z.toFixed(0) : ""}`; }).join(" | "));
}
// shots by bot bodies: count SHOT events? use stats per shooter if present
const byShooter = new Map();
const ev = sim.events; 
console.log("pings answered", B.stats.pings);
