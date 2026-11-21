const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 470, 2530, { player: 0 });
const B = sim.fkit.bots, tr = sim.d.constants.tickRate;
const show = (label) => console.log(label.padEnd(26), "squad:", B.bots.filter((b) => b.r.team === 0).map((b) => b.r.name).join(",") || "-", "| hegemony:", B.bots.filter((b) => b.r.team === 1).length, "| pilots", sim.pilots.size);
const run = (s) => { for (let i = 0; i < s * tr; i++) sim.step(); };
run(150); show("host alone, 150 s");
const g = [];
for (let k = 1; k <= 3; k++) { g.push(sim.addPlayer(0, k)); run(3); show(`guest ${k} joined`); }
console.log("join results", JSON.stringify(g.map((r) => r.ok ?? r)));
const p2 = [...sim.pilots.values()].find((p) => p.player === 2);
sim.removePlayer(p2.id, 0); run(3); show("guest 2 left");
run(60); show("60 s later");
console.log("stats", JSON.stringify({ left: B.stats.left, joined: B.stats.joined }));
const r = B.bots.find((b) => b.r.name === "Okoro"); if (r) { const p = sim.pilot(r.pid); console.log("rejoined Okoro state", p.state, "body", p.entity ? sim.entity(p.entity) && "ok" : "-"); }
