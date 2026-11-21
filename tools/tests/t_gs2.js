const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
for (let i = 0; i < 20 * 60; i++) sim.step(); // let the bases run (AI pilots active)
const pid = sim.spawnPilot(0, 530, 2330, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", calls: ["gunship-drop", "tank-drop", "mech-drop", "resupply-pod"] });
console.log("call", sim.queueCall(sim.tick + 1, pid, "gunship-drop", 560, 2330, 0));
let v;
for (let i = 0; i < 20 * 90; i++) {
  sim.step();
  v = sim.fkit.dropped.get(pid);
  if (v !== undefined && i % 200 === 0) { const s = sim.idToSlot.get(v); console.log("t", (i / 20).toFixed(0), s === undefined ? "gone" : `y ${sim.y[s].toFixed(1)} alt ${sim.flyAlt[s].toFixed(1)} occ ${Array.from({length:5},(_,j)=>sim.occ[s*12+j]).join("")} ctl ${sim.ctlOn[s]} x ${sim.x[s].toFixed(0)} z ${sim.z[s].toFixed(0)}`); }
}
{ const s = sim.idToSlot.get(v); for (let j = 0; j < 12; j++) { const o = sim.occ[s * 12 + j]; if (o) { const p = sim.pilot(o); console.log("seat", j, "pilot", o, "player", p && p.player, "state", p && p.state, "team", p && p.team); } } }
