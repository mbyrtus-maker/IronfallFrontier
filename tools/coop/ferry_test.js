// Frontline respawns (21 Nov): a player respawns inside the Command Core (loadout, then the drop pod); an AI teammate
// rides a Mule to its lane, which drops it, flies home and is removed.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 2 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
const pid = sim.spawnPilot(0, 900, 2200, { player: 1 });
for (let i = 0; i < 3; i++) sim.step();
sim.envDamage(sim.idToSlot.get(sim.pilot(pid).entity), 1e6);
let inCore = false;
for (let k = 0; k < 20 * 60 && !inCore; k++) { sim.step(); const p = sim.pilot(pid); if (p.state === 4) inCore = true; }
const p = sim.pilot(pid), cs = sim.idToSlot.get(p.vehicle);
check("a player respawns inside the Command Core", inCore && cs !== undefined && sim.d.typeIds[sim.etype[cs]] === "command-core", { state: p.state });
// an AI teammate still rides the Mule
const muleT = sim.d.typeIds.indexOf("mule");
const mules = () => { let n = 0; for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.etype[o] === muleT && sim.team[o] === 0) n++; return n; };
const bot = [...sim.pilots.values()].find((q) => q.team === 0 && q.player >= 100);
let rode = false, dropped = false, peak = 0, m0 = mules();
if (bot) {
    for (let k = 0; k < 400 && bot.state !== 1; k++) sim.step();
    const b = sim.idToSlot.get(bot.entity);
    if (b !== undefined) sim.envDamage(b, 1e6);
    for (let k = 0; k < 20 * 260 && !(dropped && mules() === m0); k++) {
        sim.step();
        if (bot.state === 0 && sim.etype[sim.idToSlot.get(bot.vehicle)] === muleT) rode = true;
        if (rode && bot.state === 1) dropped = true;
        peak = Math.max(peak, mules());
    }
}
check("an AI teammate rides a Mule to its lane", !!bot && rode && dropped);
check("the Mule is gone afterwards", peak > m0 && mules() === m0, { before: m0, peak, after: mules() });
const T = sim.d.typeIds.indexOf("gun-tower");
check("gun towers are tougher (3600 hp)", sim.d.tHp[T] === 3600, sim.d.tHp[T]);
process.exit(0);
