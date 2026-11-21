const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 700, 2300, { player: 0 });
console.log("setKit", sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", slot3: "guided-missile-launcher", calls: ["reinforcements", "resupply-pod", "tank-drop", "gunship-drop"] }));
console.log("loadout", sim.callState().caller(pid).loadout.map((i) => sim.callRules.ids[i]), "fixed", sim.callRules.fixed.map((i) => sim.callRules.ids[i]));
const tr = sim.d.constants.tickRate, p = sim.pilot(pid);
const body = () => sim.idToSlot.get(p.entity);
const names = () => Array.from({ length: sim.mCount[body()] }, (_, m) => sim.d.weaponIds[sim.mWeapon[body() * 12 + m]]);
console.log("mounts", names(), JSON.stringify(sim.s15.ammo.get(p.entity)));
const b = body();
for (const call of ["slot3-drop", "reinforcements", "resupply-pod", "tank-drop"]) {
  const r = sim.queueCall(sim.tick + 1, pid, call, sim.x[b] + 4, sim.z[b] + 4, 0);
  sim.step(); console.log(call, JSON.stringify(r), sim.orderEvents ? "" : "");
}
for (let i = 0; i < 40 * tr; i++) sim.step();
console.log("after 40s mounts", names(), JSON.stringify(sim.s15.ammo.get(p.entity)), "reinf", sim.fkit.reinf.length, "pods", JSON.stringify(sim.fkit.pods.map((q) => q.left)));
let cnt = {}; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0 && Math.hypot(sim.x[s] - sim.x[b], sim.z[s] - sim.z[b]) < 60) { const id = sim.d.typeIds[sim.etype[s]]; cnt[id] = (cnt[id] ?? 0) + 1; } console.log("near", JSON.stringify(cnt));
const ctl = (fire) => sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: -0.8, aimPitch: 0.05, fire }, 0);
for (let i = 0; i < 8 * tr; i++) { ctl(8); sim.step(); }
console.log("after slot3 fire", names(), JSON.stringify(sim.s15.ammo.get(p.entity)));
const all = {}; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0) { const id = sim.d.typeIds[sim.etype[s]]; all[id] = (all[id] ?? 0) + 1; } console.log("all", JSON.stringify(all));
const ev = sim.events; console.log("events api", Object.keys(ev).slice(0, 10));
console.log("zones", JSON.stringify(sim.callZones(0)).slice(0, 400));
const bs = body(); sim.x[bs] += 4; sim.z[bs] += 4; for (let i = 0; i < 2 * tr; i++) sim.step();
console.log("after walking to pod", names(), JSON.stringify(sim.s15.ammo.get(p.entity)));
