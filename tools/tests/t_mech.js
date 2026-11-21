const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const pid = sim.spawnPilot(0, 700, 2300, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", slot3: "rocket-tube", calls: ["mech-drop", "tank-drop", "sentry-gun", "barrage"] });
const p = sim.pilot(pid), b = sim.idToSlot.get(p.entity), tr = sim.d.constants.tickRate;
console.log("call", sim.queueCall(sim.tick + 1, pid, "mech-drop", sim.x[b] + 12, sim.z[b], 0)); for (let i = 0; i < 14 * tr; i++) sim.step();
let mech = -1; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.d.typeIds[sim.etype[s]] === "mech") mech = sim.eid[s];
console.log("mech", mech, "refusal tank now", sim.callRefusal(pid, sim.callIndex("tank-drop"), 0));
const ms = sim.idToSlot.get(mech); sim.x[b] = sim.x[ms] - 5; sim.z[b] = sim.z[ms];
console.log("enter", JSON.stringify(sim.enter(pid, mech, undefined, 0)));
const ctl = (fire, th) => sim.queueControl(sim.tick + 1, mech, { thrust: th, strafe: 0, aimYaw: 0, aimPitch: 0, firePrimary: fire & 1, fireSecondary: fire & 2 }, 0, pid);
const x0 = sim.x[ms]; for (let i = 0; i < 5 * tr; i++) { ctl(3, 1); sim.step(); }
console.log("moved", (sim.x[ms] - x0).toFixed(1), "shots", sim.stats.shots);
