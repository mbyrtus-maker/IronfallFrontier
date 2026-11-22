// Frontline respawn ferry (21 Nov): the Mule flies the respawned pilot to its lane, drops it, flies home and is removed.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 2 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
const pid = sim.spawnPilot(0, 470, 2560, { player: 1 });
const muleT = sim.d.typeIds.indexOf("mule");
const mules = () => { let n = 0; for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.etype[o] === muleT && sim.team[o] === 0) n++; return n; };
const m0 = mules();
sim.fkit.laneOf.set(pid, 1);
const body = sim.idToSlot.get(sim.pilot(pid).entity); sim.envDamage(body, 1e6); // killed outright
let rode = false, dropped = false, peak = 0;
for (let k = 0; k < 20 * 260 && !(dropped && mules() === m0); k++) {
    sim.step();
    const p = sim.pilot(pid);
    if (p.state === 0) rode = true;
    if (rode && p.state === 1) dropped = true;
    peak = Math.max(peak, mules());
}
check("the respawned pilot rode a Mule", rode);
check("and was dropped at its lane", dropped);
check("the Mule is gone afterwards", peak > m0 && mules() === m0, { before: m0, peak, after: mules(), seconds: Math.round(sim.tick / 20) });
const T = sim.d.typeIds.indexOf("gun-tower");
check("gun towers are tougher (3600 hp)", sim.d.tHp[T] === 3600, sim.d.tHp[T]);
process.exit(0);
