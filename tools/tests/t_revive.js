const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js"), PK = req("packages/sim/src/pilotkit.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const me = sim.spawnPilot(0, 600, 2300, { player: 0 });
for (let i = 0; i < 3; i++) sim.step();
const b = sim.fkit.bots.bots.find((q) => q.r.name === "Okoro"), bp = sim.pilot(b.pid);
sim.exit(b.pid, 0); for (let i = 0; i < 2; i++) sim.step();
const bs = sim.idToSlot.get(bp.entity), ms = sim.idToSlot.get(sim.pilot(me).entity);
sim.x[bs] = 603; sim.z[bs] = 2300; sim.x[ms] = 600; sim.z[ms] = 2300;
sim.hp[bs] = 0;
console.log("downed?", PK.kitTryDown(sim, bs, false), "state", bp.state, "status", JSON.stringify(sim.fkit.bots.status(sim).find((q) => q.name === "Okoro")));
for (let i = 0; i < 20 * 6; i++) { sim.queuePilotControl(sim.tick + 1, me, { move: 0, strafe: 0, aimYaw: 0, aimPitch: 0, fire: 0, interact: true }, 0); sim.step(); }
console.log("after holding E 6 s: state", bp.state, "(1 = back on its feet)");
