// Does a checkpoint (exportState -> createSimFromState, the co-op host handover) carry the Frontline state?
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 2 });
console.log("fkit", !!sim.fkit, "lanes", !!sim.lanes, "bots", !!sim.fkit?.bots, "players", [...sim.pilots.values()].filter(p=>p.player>=0).map(p=>[p.id,p.player,p.state]));
for (let i = 0; i < 20 * 60; i++) sim.step();
if (sim.fkit) sim.fkit.setKit(sim, 1, { ...sim.fkit.R.defaultKit, gun: Object.keys(sim.fkit.R.guns)[1] });
const sum = (s) => ({ tick: s.tick, fkit: !!s.fkit, lanes: !!s.lanes, bots: s.fkit?.bots ? s.fkit.bots.status(s).length : null, kits: s.fkit ? [...s.fkit.kits.entries()].map(([k, v]) => k + ":" + v.gun) : null,
  lastWave: s.lanes?.lastWave, alive0: s.unitCount(0), alive1: s.unitCount(1), pods: s.fkit?.pods.length, prio: s.fkit?.priority });
console.log("before", JSON.stringify(sum(sim)));
const b = sim.exportState({});
const s2 = S.createSimFromState(b, data, {});
console.log("after ", JSON.stringify(sum(s2)));
for (let i = 0; i < 20 * 90; i++) { s2.step(); sim.step(); }
console.log("restored +90s", JSON.stringify(sum(s2)));
console.log("original +90s", JSON.stringify(sum(sim)));
const h = (s) => { let a = 0; for (let q = 0; q < s.hi; q++) if (s.alive[q]) a = (a * 31 + Math.round(s.x[q] * 10) + Math.round(s.z[q] * 10) * 7 + s.hp[q]) % 1e9; return a; };
console.log("position hash restored", h(s2), "original", h(sim), h(s2) === h(sim) ? "IDENTICAL" : "DIVERGED");
process.exit(0);
