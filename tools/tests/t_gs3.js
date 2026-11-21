const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 530, 2330, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", calls: ["gunship-drop", "tank-drop", "mech-drop", "resupply-pod"] });
console.log("call", sim.queueCall(sim.tick + 1, pid, "gunship-drop", 560, 2330, 0));
let v;
for (let i = 0; i < 20 * 40; i++) {
  sim.step();
  const nv = sim.fkit.dropped.get(pid);
  if (nv !== v) { v = nv; console.log("t", (i / 20).toFixed(1), "dropped", v); }
  if (v !== undefined && i % 20 === 0) { const s = sim.idToSlot.get(v); console.log("t", (i / 20).toFixed(1), s === undefined ? "gone" : `hp ${sim.hp[s].toFixed(0)} sh ${sim.shield[s].toFixed(0)} y ${sim.y[s].toFixed(1)} air ${sim.airS[s]} alive ${sim.alive[s]}`); }
}
// board and fly, then land
const s0 = sim.idToSlot.get(v), ps = sim.idToSlot.get(sim.pilot(pid).entity);
sim.x[ps] = sim.x[s0] - 5; sim.z[ps] = sim.z[s0]; sim.stance[ps] = 0; sim.stanceT[ps] = 0; console.log("air", sim.airborne[ps]);
console.log("enter", JSON.stringify(sim.enter(pid, v, undefined, 0)), "state", sim.pilot(pid).state);
const log = (tag) => { const s = sim.idToSlot.get(v); console.log(tag, s === undefined ? "gone" : `hp ${sim.hp[s].toFixed(0)} sh ${sim.shield[s].toFixed(0)} alt ${sim.flyAlt[s].toFixed(1)} air ${sim.airS[s]}`, "pilot", sim.pilot(pid).state); };
for (let i = 0; i < 20 * 3; i++) { sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0.3, aimPitch: 0 }, 0); sim.step(); if (i % 20 === 0) log("idle"); }
for (let i = 0; i < 20 * 8; i++) { sim.queuePilotControl(sim.tick + 1, pid, { move: 1, strafe: 0, aimYaw: 0.3, aimPitch: 0 }, 0); sim.step(); if (i % 40 === 0) log("fly"); }
for (let i = 0; i < 20 * 4; i++) { const s1 = sim.idToSlot.get(v), x0 = sim.x[s1], z0 = sim.z[s1]; sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0.3, aimPitch: 0 }, 0); sim.step(); if (i % 20 === 0) console.log("coast speed", (Math.hypot(sim.x[s1] - x0, sim.z[s1] - z0) * 20).toFixed(1), "alt", sim.flyAlt[s1].toFixed(1)); }
const ev = []; 
