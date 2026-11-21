const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
for (let i = 0; i < 200; i++) sim.step();
const pid = sim.spawnPilot(0, 900, 2000, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", calls: ["reinforcements", "tank-drop", "mech-drop", "resupply-pod"] });
const count = () => { let n = 0; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0 && ["trooper-squad", "sapper-team"].includes(sim.d.typeIds[sim.etype[s]]) && Math.hypot(sim.x[s] - 920, sim.z[s] - 2000) < 80) n++; return n; };
console.log("call", sim.queueCall(sim.tick + 1, pid, "reinforcements", 920, 2000, 0), "refusal?", sim.callRefusal(pid, sim.callIndex("reinforcements"), 0));
const held = () => [...sim.fkit.held.keys()].map((id) => { const s = sim.idToSlot.get(id); return s === undefined ? "gone" : `${sim.d.typeIds[sim.etype[s]]}@${sim.x[s].toFixed(0)},${sim.z[s].toFixed(0)} ord${sim.ordType[s]}`; }).join(" | ");
for (let i = 0; i < 20 * 70; i++) {
  sim.step();
  if (false) console.log("   held:", held());
  if (i % 40 === 0 && i < 600) { const f = sim.fkit.reinf[0], ms = f ? sim.idToSlot.get(f.mule) : undefined; console.log("t", (i / 20).toFixed(0), "reinf", sim.fkit.reinf.length, ms !== undefined ? `mule at ${sim.x[ms].toFixed(0)},${sim.z[ms].toFixed(0)} alt ${sim.flyAlt[ms].toFixed(1)} phase ${f.phase}` : "", "troops near drop", count()); }
}
