const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 600, 2400, { player: 0 });
const B = sim.fkit.bots;
let last = new Map();
for (let i = 0; i < 20 * 200; i++) {
  sim.step();
  for (const b of B.bots) {
    const p = sim.pilot(b.pid), k = `${p.state}:${p.vehicle}:${p.seat}`;
    if (last.get(b.pid) !== k) {
      if (i > 20 * 60 && i < 20 * 200) console.log((i / 20).toFixed(1), b.r.name, last.get(b.pid), "->", k, p.vehicle ? sim.d.typeIds[sim.etype[sim.idToSlot.get(p.vehicle)] ?? 0] : "");
      last.set(b.pid, k);
    }
  }
}
