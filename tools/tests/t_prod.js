const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 470, 2530, { player: 0 });
const tr = sim.d.constants.tickRate;
for (const m of [9, 11, 13]) {
  while (sim.tick < m * 60 * tr) sim.step();
  for (const team of [0, 1]) {
    const prod = {}; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && sim.d.tStructure[sim.etype[s]]) { const id = sim.d.typeIds[sim.etype[s]]; prod[id] = (prod[id] || 0) + 1; }
    const q = []; for (const [eid, qq] of sim.prod) { const s = sim.idToSlot.get(eid); if (s !== undefined && sim.team[s] === team) q.push(sim.d.typeIds[sim.etype[s]] + ":" + qq.items.length); }
    console.log(m + "m team" + team, "ore", sim.ore[team].toFixed(0), "slotsLeft", sim.slotsLeft?.(), JSON.stringify(prod), "queues", q.join(","));
  }
}
