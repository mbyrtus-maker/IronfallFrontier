const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 1300, 1700, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: true, grenade: "he", armour: "medium" });
const p = sim.pilot(pid), s = sim.idToSlot.get(p.entity), am = () => sim.s15.ammo.get(p.entity);
console.log("gun", sim.d.weaponIds[sim.mWeapon[s * 12]], "cells", am()[0]);
const fire = (sec) => { for (let i = 0; i < sec * 20; i++) { sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: -0.8, aimPitch: 0.05, fire: 1 }, 0); sim.step(); } };
fire(8);
console.log("after 8 s fire: heat", sim.mHeat[s * 12].toFixed(2), "stuck", sim.mOvh[s * 12] >= 2 ** 30, "cells", am()[0]);
for (let i = 0; i < 100; i++) sim.step();
console.log("5 s idle: heat", sim.mHeat[s * 12].toFixed(2), "still stuck", sim.mOvh[s * 12] >= 2 ** 30);
console.log("swap ->", sim.fkit.swapCell(sim, s, 0), "heat", sim.mHeat[s * 12], "cells", am()[0]);
const b = sim.stats.shots; fire(2); console.log("fires again:", sim.stats.shots - b, "shots");
for (let k = 0; k < 4; k++) { fire(8); console.log("cycle", k, "swap", sim.fkit.swapCell(sim, s, 0), "cells", am()[0]); }
const b2 = sim.stats.shots; fire(2); console.log("dry:", sim.stats.shots - b2, "shots");
