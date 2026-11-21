const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid0 = sim.spawnPilot(0, 600, 2400, { player: 0 });
const B = sim.fkit.bots;
const secs = +(process.argv[2] || 300);
for (let t = 0; t <= secs; t += 30) {
  if (B && B.bots.length) {
    const st = B.status(sim).map((q) => { const p = sim.pilot(q.id), e = p.state === 1 ? sim.entity(p.entity) : p.state === 0 ? sim.entity(p.vehicle) : null; return `${q.name}(${q.team}) ${q.state}/${q.mode} ${e ? `${e.x.toFixed(0)},${e.z.toFixed(0)}${p.state === 0 ? " in " + sim.d.typeIds[sim.etype[sim.idToSlot.get(p.vehicle)]] : ""}` : ""} d${q.deaths}`; });
    console.log(`t=${t}`, st.join(" | "));
  }
  for (let i = 0; i < 600; i++) sim.step();
}
console.log("stats", JSON.stringify(B.stats));
console.log("over", sim.match?.over, "phase", sim.match?.phase);
