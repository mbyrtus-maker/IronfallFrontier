const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const gun = process.argv[2] || "carbine";
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const me = sim.spawnPilot(0, 1500, 1500, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun, laser: false, grenade: "he", armour: "medium" });
for (let i = 0; i < 3; i++) sim.step();
const b = sim.fkit.bots.bots.find((q) => q.r.name === "Kade"), bp = sim.pilot(b.pid);
sim.exit(b.pid, 1); for (let i = 0; i < 2; i++) sim.step();
const pin = () => { const bs = sim.idToSlot.get(bp.entity), ms = sim.idToSlot.get(sim.pilot(me).entity); if (bs !== undefined) { sim.x[bs] = 1500; sim.z[bs] = 1512; } if (ms !== undefined) { sim.x[ms] = 1500; sim.z[ms] = 1500; } };
pin(); sim.step();
const ms = sim.idToSlot.get(sim.pilot(me).entity), bs0 = sim.idToSlot.get(bp.entity);
const yaw = Math.atan2(sim.z[bs0] - sim.z[ms], sim.x[bs0] - sim.x[ms]);
let prev = bp.state;
for (let i = 0; i < 20 * 15; i++) {
  pin();
  sim.queuePilotControl(sim.tick + 1, me, { move: 0, strafe: 0, aimYaw: yaw, aimPitch: -0.03, fire: bp.state === 1 ? 1 : 0 }, 0);
  sim.step();
  if (bp.state !== prev) { const bs = sim.idToSlot.get(bp.entity); console.log(`${(i / 20).toFixed(1)}s Kade ${prev} -> ${bp.state}`, bs !== undefined ? `hp ${sim.hp[bs].toFixed(0)}` : ""); prev = bp.state; }
}
console.log("final state", bp.state, "(3 downed, 2 dead)");
