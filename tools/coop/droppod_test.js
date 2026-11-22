// Frontline drop pod (21 Nov): a pilot inside its own Command Core launches to a controlled spot and lands there;
// ground the team does not control is refused; leaving the Core mid-flight is refused.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
let core = -1;
for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === 0 && sim.d.typeIds[sim.etype[o]] === "command-core") core = o;
const off = sim.d.tRadius[sim.etype[core]] + 1.2;
const pid = sim.spawnPilot(0, sim.x[core] + sim.dirX[core] * off, sim.z[core] + sim.dirZ[core] * off, { player: 0 });
for (let i = 0; i < 3; i++) sim.step();
const r = sim.enterShelter(pid, sim.eid[core], 0);
check("the pilot goes inside the Core", r.ok, r);
check("the enemy's corner is refused", sim.fkit.launchDrop(sim, pid, 2500, 500) === "notControlled");
// an owned tower on the mid lane: land just beside it
let tw = -1;
for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === 0 && sim.d.typeIds[sim.etype[o]] === "gun-tower" && Math.hypot(sim.x[o] - sim.x[core], sim.z[o] - sim.z[core]) > 300) tw = o;
const tx = sim.x[tw] + 60, tz = sim.z[tw];
const why = sim.fkit.launchDrop(sim, pid, tx, tz);
check("a spot 60 m from an own tower is accepted", why === "", why);
const [sx, sz] = sim.fkit.siloAt(sim, core);
check("the rocket leaves from behind the Core", Math.hypot(sx - sim.x[core], sz - sim.z[core]) > 10 && ((sx - sim.x[core]) * sim.dirX[core] + (sz - sim.z[core]) * sim.dirZ[core]) < 0, { sx, sz });
check("leaving the Core mid-flight is refused", !sim.leaveShelter(pid, 0).ok);
let landed = -1;
for (let k = 0; k < 200 && landed < 0; k++) { sim.step(); if (sim.pilot(pid).state === 1) landed = sim.tick; }
const p = sim.pilot(pid), b = sim.idToSlot.get(p.entity);
check("the pod lands about 6.5 s later with the pilot on foot", landed > 0 && p.state === 1, { ticks: landed });
check("at the chosen spot", b !== undefined && Math.hypot(sim.x[b] - tx, sim.z[b] - tz) < 3, b !== undefined ? { x: Math.round(sim.x[b]), z: Math.round(sim.z[b]) } : null);
check("no drops left", sim.fkit.drops.length === 0);
process.exit(0);
