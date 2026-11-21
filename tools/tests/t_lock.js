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
const pc = (fire) => sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0, aimPitch: -0.03, fire }, 0);
const ids = [];
for (const [dx, dz] of [[120, 0], [150, 15], [180, -18], [200, 5], [140, -10]]) { const r = sim.spawnUnit("lancer", 1, sim.x[ms] + dx, sim.z[ms] + dz); ids.push(typeof r === "number" ? r : r.ids[0]); }
for (let i = 0; i < 10; i++) { pc(0); sim.step(); }
const projW = () => { let n = 0; for (let i = 0; i < sim.pN; i++) if (sim.d.weaponIds[sim.pWeapon[i]] === "mech-missile-pods") n++; return n; };
for (let i = 0; i < 2.5 * tr; i++) { pc(2); sim.step(); }
console.log("locked", JSON.stringify(sim.fkit.lockedOf(mech)), "missiles in flight", projW());
const tg = new Set();
for (let i = 0; i < 1.5 * tr; i++) { pc(0); sim.step(); for (let k = 0; k < sim.pN; k++) if (sim.d.weaponIds[sim.pWeapon[k]] === "mech-missile-pods") tg.add(sim.pTgt[k]); }
console.log("after release: targets homed", JSON.stringify([...tg]), "hp", ids.map((id) => { const s = sim.idToSlot.get(id); return s === undefined ? "dead" : Math.round(sim.hp[s] + sim.shield[s]); }).join(","));
