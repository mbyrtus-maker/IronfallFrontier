const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: +(process.argv[2] || 7), difficulty: "normal", players: 1 });
sim.spawnPilot(0, 470, 2530, { player: 0 });
const B = sim.fkit.bots, tr = sim.d.constants.tickRate, last = new Map(), tally = {};
for (let i = 0; i < 10 * 60 * tr; i++) {
  sim.step();
  for (const b of B.bots) {
    const p = sim.pilot(b.pid); if (!p) continue;
    const was = last.get(b.pid);
    if (was !== undefined && was !== p.state) { const k = `team${b.r.team} ${was}->${p.state}`; tally[k] = (tally[k] || 0) + 1; }
    last.set(b.pid, p.state);
  }
}
console.log("states: 0 seated, 1 foot, 2 dead, 3 downed");
console.log(Object.entries(tally).sort().map(([k, v]) => `${k}: ${v}`).join("\n"));
