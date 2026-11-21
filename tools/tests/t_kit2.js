const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 447, 2576, { player: 0 });
let dart = -1; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0 && sim.d.typeIds[sim.etype[s]] === "dart") dart = sim.eid[s];
console.log(JSON.stringify(sim.enter(pid, dart, undefined, 0)));
sim.fkit.setKit(sim, 0, { role: "heavy", gun: "dual", laser: false, grenade: "area", armour: "light" });
for (let i = 0; i < 20; i++) sim.step();
sim.queueExit(sim.tick + 1, pid, 0); for (let i = 0; i < 20; i++) sim.step();
const p = sim.pilot(pid); console.log("state", p.state, "entity", p.entity, "ammo", JSON.stringify(sim.s15.ammo.get(p.entity)));
const ctl = (fire) => sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: -0.8, aimPitch: 0.05, fire }, 0);
for (let i = 0; i < 40; i++) { ctl(1); sim.step(); }
console.log("after fire1", JSON.stringify(sim.s15.ammo.get(p.entity)));
for (let i = 0; i < 20; i++) { ctl(4); sim.step(); }
console.log("after G", JSON.stringify(sim.s15.ammo.get(p.entity)));
