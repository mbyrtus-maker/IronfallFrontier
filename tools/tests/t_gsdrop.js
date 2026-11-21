const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.fkit.bots = null;
const me = sim.spawnPilot(0, 600, 2400, { player: 0 });
for (let i = 0; i < 3; i++) sim.step();
const cs = sim.callState(), id = sim.callRules.ids.indexOf("gunship-drop"); cs.caller(me).loadout = [id];
console.log("queue", JSON.stringify(sim.queueCall(sim.tick + 1, me, "gunship-drop", 625, 2400, 0)));
const GT = sim.d.typeIds.indexOf("gunship");
for (let t = 0; t < 30; t++) {
  for (let i = 0; i < 10; i++) sim.step();
  for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.etype[s] === GT) console.log((sim.tick / 20).toFixed(1), "gunship at", sim.x[s].toFixed(0), sim.z[s].toFixed(0), "y", sim.y[s].toFixed(1), "alt", sim.alt ? sim.alt[s] : "-", "flyAlt", sim.flyAlt ? sim.flyAlt[s] : "-", "airS", sim.airS[s], "hp", sim.hp[s].toFixed(0));
}
