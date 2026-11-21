const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 470, 2530, { player: 0 });
for (let i = 0; i < 3; i++) sim.step();
const B = sim.fkit.bots, pos = [];
for (const b of B.bots) { const p = sim.pilot(b.pid), s = sim.idToSlot.get(p.state === 0 ? p.vehicle : p.entity); pos.push([b.r.name, b.r.team, sim.x[s], sim.z[s], p.state === 0 ? "in " + sim.d.typeIds[sim.etype[s]] : "foot"]); }
for (const q of pos) console.log(q[0].padEnd(7), "team", q[1], q[2].toFixed(0), q[3].toFixed(0), q[4]);
for (const t of [0, 1]) { const m = pos.filter((q) => q[1] === t); let mn = 1e9; for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) mn = Math.min(mn, Math.hypot(m[i][2] - m[j][2], m[i][3] - m[j][3])); console.log("team", t, "closest pair", mn.toFixed(0), "m"); }
