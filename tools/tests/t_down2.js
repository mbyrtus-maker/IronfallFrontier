const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 470, 2530, { player: 0 });
const B = sim.fkit.bots, tr = sim.d.constants.tickRate, last = new Map(); let shown = 0;
for (let i = 0; i < 10 * 60 * tr && shown < 4; i++) {
  sim.step();
  for (const b of B.bots) {
    const p = sim.pilot(b.pid); if (!p) continue;
    if (last.get(b.pid) === 1 && p.state === 3) {
      shown++;
      const ds = sim.idToSlot.get(p.entity);
      console.log(`t=${(sim.tick / tr).toFixed(0)}s ${b.r.name} (team ${b.r.team}) DOWN at ${sim.x[ds].toFixed(0)},${sim.z[ds].toFixed(0)}`);
      const mates = B.bots.filter((o) => o !== b && o.r.team === b.r.team).map((o) => { const op = sim.pilot(o.pid), os = op.state === 1 ? sim.idToSlot.get(op.entity) : op.state === 0 ? sim.idToSlot.get(op.vehicle) : undefined; return `${o.r.name} st${op.state} ${os !== undefined ? Math.hypot(sim.x[os] - sim.x[ds], sim.z[os] - sim.z[ds]).toFixed(0) + "m" : "-"}`; });
      console.log("   mates:", mates.join(" | "));
    }
    last.set(b.pid, p.state);
  }
}
