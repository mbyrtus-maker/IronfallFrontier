const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 1300, 1700, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", calls: ["gunship-drop", "tank-drop", "mech-drop", "resupply-pod"] });
sim.queueCall(sim.tick + 1, pid, "gunship-drop", 1320, 1700, 0);
for (let i = 0; i < 20 * 14; i++) sim.step();
const v = sim.fkit.dropped.get(pid), vs = sim.idToSlot.get(v), ps = sim.idToSlot.get(sim.pilot(pid).entity);
sim.x[ps] = sim.x[vs] - 6; sim.z[ps] = sim.z[vs]; sim.stance[ps] = 0; sim.stanceT[ps] = 0;
console.log("enter", JSON.stringify(sim.enter(pid, v, 0, 0)));
const W = sim.d.weaponIds, mb = vs * 12;
console.log("mounts", Array.from({ length: sim.mCount[vs] }, (_, m) => `${W[sim.mWeapon[mb + m]]}:on${sim.mOn[mb + m]}`).join(" "));
for (const [dx, dz] of [[60, 40], [70, -40], [-50, 50]]) sim.spawnUnit("trooper-squad", 1, sim.x[vs] + dx, sim.z[vs] + dz);
const doorW = W.indexOf("gunship-door-minigun");
let doorShots = 0;
const origCount = sim.countShot.bind(sim);
for (let i = 0; i < 20 * 6; i++) {
  sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0, aimPitch: 0 }, 0);
  const before = Array.from({ length: 4 }, (_, m) => sim.cooldown[mb + m]);
  sim.step();
  for (const m of [2, 3]) if (sim.cooldown[mb + m] > before[m] + 1e-6) doorShots++;
}
console.log("door gun shots in 6 s (no player gunner):", doorShots);
console.log("door targets", [2, 3].map((m) => `${sim.mTgtSlot[mb + m]}/${sim.mTgtId[mb + m]} ready${sim.mReady[mb + m]} lock${sim.mLock[mb + m]}`).join("  "), "alt", sim.flyAlt[vs].toFixed(1));
let foes = 0; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 1 && Math.hypot(sim.x[s] - sim.x[vs], sim.z[s] - sim.z[vs]) < 250) foes++; console.log("foes within 250", foes, "detected?", (() => { for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 1 && Math.hypot(sim.x[s] - sim.x[vs], sim.z[s] - sim.z[vs]) < 250) return sim.detected(s, 0); })());
