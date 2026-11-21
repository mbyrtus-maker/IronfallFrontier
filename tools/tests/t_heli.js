const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
for (const lowFirst of [false, true]) {
  const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
  const pid = sim.spawnPilot(0, 900, 2200, { player: 0 });
  const r = sim.spawnUnit("gunship", 0, 905, 2200), v = typeof r === "number" ? r : r.ids[0], vs = sim.idToSlot.get(v), ps = sim.idToSlot.get(sim.pilot(pid).entity);
  sim.flyAlt[vs] = 0; sim.airS[vs] = 0; sim.y[vs] = sim.y[ps]; sim.x[ps] = sim.x[vs] - 6; sim.z[ps] = sim.z[vs]; sim.stance[ps] = 0; sim.stanceT[ps] = 0;
  console.log("enter", JSON.stringify(sim.enter(pid, v, 0, 0)));
  const C = (o) => { sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0, aimPitch: 0, ...o }, 0); sim.step(); };
  for (let i = 0; i < 100; i++) C({}); C({ move: 1 }); console.log("ctlOn", sim.ctlOn[vs], "thrust", sim.ctlThrust[vs], "mask", sim.ctlMask[vs], "pilot state", sim.pilot(pid).state, "air", sim.airS[vs]);
  // speed: full thrust 4 s, then let go 2 s (drift)
  let x0 = sim.x[vs]; for (let i = 0; i < 80; i++) C({ move: 1 });
  const vMax = Math.hypot(sim.velX[vs], sim.velZ[vs]); x0 = sim.x[vs];
  for (let i = 0; i < 40; i++) C({});
  console.log("alt", sim.flyAlt[vs].toFixed(1), "top speed", vMax.toFixed(1), "drift after release (2 s)", Math.hypot(sim.x[vs] - x0).toFixed(1));
  if (lowFirst) { C({ jump: true }); for (let i = 0; i < 120; i++) C({}); console.log("low alt", sim.flyAlt[vs].toFixed(1)); }
  for (let i = 0; i < 300 && sim.flyAlt[vs] > 0 && sim.alive[vs]; i++) C({ crouch: true });
  console.log(lowFirst ? "land from low flight" : "dive from 60 m", "hp", sim.hp[vs].toFixed(0), "alive", sim.alive[vs], "alt", sim.flyAlt[vs].toFixed(1));
}
