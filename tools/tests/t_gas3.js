const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.fkit.setPriority(0, "gas");
const tr = sim.d.constants.tickRate, CT = sim.d.typeIds.indexOf("constructor");
while (sim.tick < 8.4 * 60 * tr) sim.step();
for (let t = 0; t < 26; t++) {
  for (let i = 0; i < 5 * tr; i++) sim.step();
  const cons = []; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0 && sim.etype[s] === CT) cons.push(`eid${sim.eid[s]}(${sim.x[s].toFixed(0)},${sim.z[s].toFixed(0)}) ord${sim.ordType[s]} drv${sim.drv[s]} wp${sim.waypoints[s] ? sim.waypoints[s].length / 2 : 0} hp${sim.hp[s].toFixed(0)}`);
  const st = [...sim.con.sites.values()].filter((x) => x.team === 0).map((x) => `${sim.d.typeIds[x.type]} b${x.builder} (${x.x.toFixed(0)},${x.z.toFixed(0)}) p${x.progress} idle${x.idle}`);
  console.log(((sim.tick / tr) / 60).toFixed(2), cons.join(" "), "|", st.join(","));
}
