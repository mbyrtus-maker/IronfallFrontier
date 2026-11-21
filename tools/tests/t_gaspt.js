const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.fkit.setPriority(0, "gas");
const tr = sim.d.constants.tickRate;
for (let i = 0; i < 12 * 60 * tr; i++) sim.step(); let ex = 0; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0 && sim.d.typeIds[sim.etype[s]] === "gas-extractor") ex++; console.log("extractors at 12 min", ex, "sites", [...sim.con.sites.values()].filter((x) => x.team === 0).map((x) => sim.d.typeIds[x.type]).join(","));
const P = sim.pts, gs = sim.geysersInfo();
console.log("geysers", gs.map((g) => `${g.id}@${g.x},${g.z}`).join(" "));
for (let p = 0; p < P.n; p++) {
  const near = gs.find((g) => (g.x - P.px[p]) ** 2 + (g.z - P.pz[p]) ** 2 < 80 * 80);
  if (!near) continue;
  const why = sim.con ? sim.con.refusal(sim, 0, sim.d.typeIds.indexOf("gas-extractor"), p) : "?";
  console.log("pt", P.ids ? P.ids[p] : p, "type", P.types ? P.types[p] : "?", "owner", P.owner[p], "supplied", (P.flags[p] & 1) !== 0, "flags", P.flags[p], "extractor refusal", why);
}
for (const st of sim.con.sites.values()) if (st.team === 0) console.log("site", JSON.stringify(Object.fromEntries(Object.entries(st).filter(([k, v]) => typeof v !== "object"))));
for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === 0 && sim.d.typeIds[sim.etype[s]] === "constructor") console.log("constructor at", sim.x[s].toFixed(0), sim.z[s].toFixed(0), "ord", sim.ordType[s], "hp", sim.hp[s].toFixed(0), "drv", sim.drv[s]);
