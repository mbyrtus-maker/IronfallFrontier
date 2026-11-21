const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 700, 2300, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", slot3: "silo-targeter", calls: ["sentry-gun"] });
const p = sim.pilot(pid), b = sim.idToSlot.get(p.entity), tr = sim.d.constants.tickRate;
sim.queueCall(sim.tick + 1, pid, "slot3-drop", sim.x[b] + 1, sim.z[b] + 1, 0); for (let i = 0; i < 8 * tr; i++) sim.step();
console.log("carried", sim.d.weaponIds[sim.fkit.carried.get(pid)], "silos", JSON.stringify([...sim.fkit.silos]));
// a target: spawn an enemy trooper squad 300 m north-east
const tgt = sim.spawnSquad ? sim.spawnSquad("trooper-squad", 1, sim.x[b] + 200, sim.z[b] - 200).ids : [];
const ang = Math.atan2(-200, 200), dist = 283;
const ctl = (fire) => sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: ang, aimPitch: -Math.atan2(1.2, dist), fire }, 0);
for (let i = 0; i < 10; i++) { ctl(8); sim.step(); } ctl(0); sim.step();
console.log("strikes", JSON.stringify(sim.fkit.strikes.map((k) => [Math.round(k.x), Math.round(k.z), k.impact - sim.tick])));
for (let i = 0; i < 12 * tr; i++) sim.step();
console.log("troopers alive", tgt.filter((id) => { const s = sim.idToSlot.get(id); return s !== undefined && sim.alive[s] && sim.hp[s] > 0; }).length, "of", tgt.length, "strikes left", sim.fkit.strikes.length);
