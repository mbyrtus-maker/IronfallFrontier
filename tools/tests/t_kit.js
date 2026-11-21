const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 700, 2400, { player: 0 });
console.log("fkit", !!sim.fkit, sim.fkit && JSON.stringify(sim.fkit.setKit(sim, 0, { role: process.argv[2] ?? "heavy", gun: process.argv[3] ?? "dual", laser: process.argv[4] === "laser", grenade: "seeker", armour: "heavy" })));
const p = sim.pilot(pid), s = sim.idToSlot.get(p.entity), d = sim.d;
const names = () => Array.from({ length: sim.mCount[s] }, (_, m) => d.weaponIds[sim.mWeapon[s * 12 + m]] ?? sim.mWeapon[s * 12 + m]);
console.log("MAX_MOUNTS?", sim.mWeapon.length / sim.cap, "mounts", names(), "ammo", JSON.stringify(sim.s15.ammo.get(p.entity)));
const ctl = (fire) => sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: -0.8, aimPitch: 0.05, fire }, 0);
for (let i = 0; i < 60; i++) { ctl(1); sim.step(); }
console.log("after 3s fire1", JSON.stringify(sim.s15.ammo.get(p.entity)));
for (let i = 0; i < 40; i++) { ctl(2); sim.step(); }
console.log("after 2s fire2", JSON.stringify(sim.s15.ammo.get(p.entity)));
for (let i = 0; i < 40; i++) { ctl(4); sim.step(); }
console.log("after grenade", JSON.stringify(sim.s15.ammo.get(p.entity)), "stats shots", sim.stats.shots);
