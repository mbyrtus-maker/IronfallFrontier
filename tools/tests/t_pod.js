const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 700, 2300, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", slot3: "guided-missile-launcher", calls: ["reinforcements", "resupply-pod", "tank-drop", "gunship-drop"] });
const p = sim.pilot(pid), b = sim.idToSlot.get(p.entity);
const ci = sim.callIndex("slot3-drop"); console.log("refusal", sim.callRefusal(pid, ci, 0), "fx", sim.callRules.calls[ci].fx, "choices", sim.callRules.calls[ci].choices);
sim.queueCall(sim.tick + 1, pid, "slot3-drop", sim.x[b] + 1, sim.z[b] + 1, 0);
for (let i = 0; i < 200; i++) { sim.step(); if (i % 40 === 0) console.log(i, "beacons", sim.calls.beacons.length, "effects", sim.calls.effects.length, "orderEvents", JSON.stringify(sim.orderEvents?.slice?.(-1) ?? "")); }
const names = () => Array.from({ length: sim.mCount[b] }, (_, m) => sim.d.weaponIds[sim.mWeapon[b * 12 + m]]);
console.log(names(), JSON.stringify(sim.s15.ammo.get(p.entity)));
