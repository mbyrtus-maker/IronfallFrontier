const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
console.log(JSON.stringify(sim.d.constants.frontline?.slot3RechargeSeconds), typeof sim.fkit.slot3Recharge);
const pid = sim.spawnPilot(0, 600, 2300, { player: 0 });
console.log("player", sim.fkit.playerOf(sim, pid), sim.fkit.slot3Recharge(sim, pid));
