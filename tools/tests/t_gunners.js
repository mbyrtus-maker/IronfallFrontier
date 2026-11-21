const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 600, 2300, { player: 0 });
const occOf = (id) => { const s = sim.idToSlot.get(id), t = sim.etype[s], o = []; for (let j = 0; j < sim.d.tSeatCount[t]; j++) o.push([["D", "G", "P"][sim.d.tSeatRole[t * 12 + j]], sim.occ[s * 12 + j]]); return o; };
for (const type of ["bastion", "gunship", "mech", "dart"]) {
  if (sim.d.typeIds.indexOf(type) < 0) { console.log(type, "no such type"); continue; }
  const id = sim.spawnUnit(type, 0, 604, 2300, { crew: "none" });
  console.log(type, "empty", JSON.stringify(occOf(id)));
  const r = sim.enter(pid, id, undefined, 0);
  for (let i = 0; i < 30; i++) sim.step();
  console.log("  entered", JSON.stringify(r), "pilot state", sim.pilot(pid).state, "seat", sim.pilot(pid).seat, "->", JSON.stringify(occOf(id)), "added", sim.fkit.gunnersAdded ?? 0);
  // climb out for the next one
  sim.exit?.(pid); for (let i = 0; i < 20; i++) sim.step();
  const p = sim.pilot(pid); if (p.state !== 1) { console.log("  still seated", p.state); }
  const ps = sim.idToSlot.get(p.entity); if (ps !== undefined) { sim.x[ps] = 600; sim.z[ps] = 2300; }
}
