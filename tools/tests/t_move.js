const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const d = sim.d, ti = (id) => d.typeIds.indexOf(id);
const fx = 800, fz = 1500; // jungle cell
console.log("type at", sim.tlayer.typeIds[sim.tlayer.typeAt(fx, fz)]);
for (const id of ["dart", "lancer", "bastion", "pilot", "trooper-squad"]) console.log(id, "move", d.tMove[ti(id)], "speed", sim.tlayer.speedAt(fx, fz, d.tMove[ti(id)]));
