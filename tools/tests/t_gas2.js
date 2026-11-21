const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.fkit.setPriority(0, "gas");
const tr = sim.d.constants.tickRate, P = sim.pts, EX = sim.d.typeIds.indexOf("gas-extractor");
const name = (p) => P.ids ? P.ids[p] : p;
let lastJ = "";
for (let t = 0; t < 14 * 60; t += 10) {
  for (let i = 0; i < 10 * tr; i++) sim.step();
  const jw = [...Array(P.n).keys()].filter((p) => String(name(p)).startsWith("jungle-gas"));
  const st = jw.map((p) => `${name(p)} own${P.owner[p]} f${P.flags[p]} ref:${sim.con.refusal(sim, 0, EX, p)} blk:${sim.fkit.siteBlocked(sim, p, EX)}`).join(" | ");
  const sites = [...sim.con.sites.values()].filter((x) => x.team === 0).map((x) => `${sim.d.typeIds[x.type]}@${name(x.point)}:${x.progress}`).join(",");
  const line = st + " || sites " + sites;
  if (line !== lastJ) { console.log(`${(t / 60).toFixed(1)}m`, line); lastJ = line; }
}
