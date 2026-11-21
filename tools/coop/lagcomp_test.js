// Co-op lag compensation: a guest's shot aimed where it saw a moving target (LAG ticks ago) hits; without the rewind it misses.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 2 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
const LAG = 10, X0 = 900, Z0 = 1500;
const guest = sim.spawnPilot(0, X0 - 60, Z0, { player: 1 });
const tid = sim.spawnUnit("dart", 1, X0, Z0, { crew: "none" });
const ts = sim.idToSlot.get(tid);
sim.lagTicks = new Map([[guest, LAG]]);
const path = []; // where the target was at the start of each tick (moved 1.5 m sideways per tick: 30 m/s)
for (let k = 0; k < 30; k++) { sim.x[ts] = X0; sim.z[ts] = Z0 + k * 1.5; sim.step(); path.push([sim.tick, Z0 + k * 1.5]); }
const seenAt = path.find(([t]) => t === sim.tick - LAG)[1], nowAt = sim.z[ts];
const q = sim.sc, y = sim.y[ts] + sim.d.tRadius[sim.etype[ts]];
const shoot = (lag) => { q[0] = X0 - 60; q[1] = y; q[2] = seenAt; q[3] = X0 + 60; q[4] = y; q[5] = seenAt; sim.rayLag = lag; sim.raySeg(-1, 0, 0); sim.rayLag = 0; return sim.raySlot === ts; };
check("a shot where the guest saw the target hits with the rewind", shoot(sim.lagOf(guest)), { seenZ: seenAt, nowZ: Math.round(nowAt * 10) / 10, lagTicks: sim.lagOf(guest) });
check("the same shot misses without it (the old behaviour)", !shoot(0));
// a shot at the target's present position: misses with the rewind (no double benefit) for this guest
q[0] = X0 - 60; q[1] = y; q[2] = nowAt; q[3] = X0 + 60; q[4] = y; q[5] = nowAt; sim.rayLag = sim.lagOf(guest); sim.raySeg(-1, 0, 0); sim.rayLag = 0;
check("aiming at where the host has it (the guest never saw that) misses", sim.raySlot !== ts);
check("the rewind is capped", (() => { sim.lagTicks.set(guest, 999); const l = sim.lagOf(guest); return l <= 15; })(), sim.lagOf(guest));
check("an AI pilot gets no rewind", sim.lagOf(12345) === 0);
process.exit(0);
