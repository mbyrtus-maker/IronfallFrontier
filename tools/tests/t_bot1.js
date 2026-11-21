const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
console.log("lanes", sc.lanes.paths.map((p) => p.name + ":" + JSON.stringify(p.points[0]) + "->" + JSON.stringify(p.points[p.points.length - 1])));
const pid0 = sim.spawnPilot(0, 1300, 1700, { player: 0 });
const mid = sc.lanes.paths[1].points;
const bots = [];
for (const [team, player, at] of [[0, 10, mid[0]], [1, 20, mid[mid.length - 1]]]) {
  const id = sim.spawnPilot(team, at[0] + 10, at[1] + 10, { player });
  sim.fkit.setKit(sim, player, { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium" });
  bots.push(id);
  const p = sim.pilot(id), e = sim.entity(p.entity);
  const way = team === 0 ? mid.slice(1) : mid.slice(0, -1).reverse();
  sim.queueOrder(sim.tick + 1, [p.entity], { type: "attackMove", waypoints: way }, team);
}
const shots0 = sim.stats.shots;
for (let t = 0; t <= 90; t += 10) {
  const out = bots.map((id) => { const p = sim.pilot(id), e = p.entity ? sim.entity(p.entity) : null; return `team${p.team} st${p.state} ${e ? `(${e.x.toFixed(0)},${e.z.toFixed(0)}) hp ${e.hp?.toFixed?.(0)}` : "-"} deaths ${p.deaths}`; });
  console.log(`t=${t}s`, out.join(" | "));
  for (let i = 0; i < 200; i++) sim.step();
}
const evs = sim.lastRejections ? sim.lastRejections : null;
console.log("rejections", JSON.stringify(sim.rejections?.slice?.(-5) ?? null));
console.log("mid points", JSON.stringify(mid));
for (const id of bots) { const p = sim.pilot(id), s = sim.idToSlot.get(p.entity); console.log("ord", sim.ordType[s], "wps", JSON.stringify(sim.waypoints[s]), "ctlOn", sim.ctlOn[s], "tgt", sim.tgtId[s]); }
