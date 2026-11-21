const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const d = sim.d, tr = d.constants.tickRate;
const mins = +process.argv[2] || 12;
const count = (team) => { const c = {}; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team) { const id = d.typeIds[sim.etype[s]]; c[id] = (c[id] || 0) + 1; } return c; };
for (let m = 1; m <= mins; m++) {
  for (let i = 0; i < 60 * tr; i++) sim.step();
  for (const team of [0, 1]) {
    const cap = sim.storageCap(team), c = count(team);
    const units = Object.entries(c).filter(([k]) => !d.tStructure[d.typeIds.indexOf(k)]).map(([k, v]) => `${k}:${v}`).join(" ");
    const bld = Object.entries(c).filter(([k]) => d.tStructure[d.typeIds.indexOf(k)]).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(`m${m} T${team} ore ${Math.round(sim.ore[team])}/${cap.ore} gas ${Math.round(sim.gas[team])}/${cap.gas} | units ${sim.unitCount(team)}/${sim.mapUnitCap} ${units}`);
    if (m % 4 === 0) console.log(`      buildings ${bld}`);
  }
}
