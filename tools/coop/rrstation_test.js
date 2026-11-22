// Designer 21 Nov: the Repair & Resupply call-down: a station lands, repairs friendly vehicles near it, and is gone when its time is up.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
void 0;
for (let i = 0; i < 3; i++) sim.step();
const r = sim.spawnUnit("bastion", 1, 2312, 700, { crew: "none" }), v = typeof r === "number" ? r : r.ids[0], vs = sim.idToSlot.get(v);
sim.hp[vs] = 400;
const ci = sim.calls.rules.calls.findIndex((c) => c.id === "repair-resupply");
check("the call compiles as a station call", ci >= 0 && sim.calls.rules.calls[ci].fx === 15 && sim.calls.rules.calls[ci].profile >= 0);
const ok = sim.queueCommanderCall ? sim.queueCommanderCall(sim.tick + 1, 1, "repair-resupply", 2305, 710) : null;
let st = -1, hpAfter = 0;
for (let k = 0; k < 20 * 30; k++) { sim.step(); if (st < 0) for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.d.typeIds[sim.etype[o]] === "resupply-station") st = o; }
hpAfter = sim.hp[vs];
check("a station landed", st >= 0);
check("it repaired the damaged Bastion nearby", hpAfter > 400 + 500, { hp: Math.round(hpAfter) });
for (let k = 0; k < 20 * 70; k++) sim.step();
let left = false; for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.d.typeIds[sim.etype[o]] === "resupply-station") left = true;
check("it is gone after its 90 s", !left);
process.exit(0);
