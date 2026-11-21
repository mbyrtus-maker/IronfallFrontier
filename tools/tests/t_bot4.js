const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 600, 2400, { player: 0 });
const B = sim.fkit.bots;
const name = process.argv[2] || "Okoro";
for (let i = 0; i < 3; i++) sim.step();
const b = B.bots.find((q) => q.r.name === name), p = sim.pilot(b.pid);
for (let t = 0; t < 16; t++) {
  for (let i = 0; i < 40; i++) sim.step();
  const s = p.state === 1 ? sim.idToSlot.get(p.entity) : sim.idToSlot.get(p.vehicle);
  const vid = sim.fkit.dropped.get(b.pid), vs = vid !== undefined ? sim.idToSlot.get(vid) : undefined;
  console.log(t * 2, "st", p.state, "pos", sim.x[s].toFixed(0), sim.z[s].toFixed(0), "ord", sim.ordType[s], "goal", b.goal, "wp", b.wp, "veh", vs !== undefined ? `${sim.d.typeIds[sim.etype[vs]]} ${sim.x[vs].toFixed(0)},${sim.z[vs].toFixed(0)} hp${sim.hp[vs].toFixed(0)} drv${sim.drv[vs]}` : "-", "rej", JSON.stringify(sim.orderEvents.filter((e) => e.id === sim.eid[s]).slice(-1)));
}
const vid = sim.fkit.dropped.get(b.pid), vs = sim.idToSlot.get(vid);
console.log("enter ->", JSON.stringify(sim.enter(b.pid, vid, sim.d.tDriverSeat[sim.etype[vs]], p.team)), "radius", sim.d.tRadius[sim.etype[vs]]);
console.log("enter any seat ->", JSON.stringify(sim.enter(b.pid, vid, undefined, p.team)));
