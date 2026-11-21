const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, +process.argv[2] || 1300, +process.argv[3] || 1700, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: true, grenade: "he", armour: "medium" });
const p = sim.pilot(pid), s = sim.idToSlot.get(p.entity), d = sim.d;
sim.callState().caller(pid).heavy = d.weaponIds.indexOf("pilot-laser-cannon"); sim.applyHeavy(pid, s);
const out = [];
for (let i = 0; i < 200; i++) {
  sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: -0.8, aimPitch: 0.05, fire: 8 }, 0);
  sim.step();
  if (i % 20 === 0) out.push([+sim.mHeat[s * 12 + 2].toFixed(2), sim.mOvh[s * 12 + 2]]);
}
console.log(JSON.stringify(out), sim.stats.shots);
