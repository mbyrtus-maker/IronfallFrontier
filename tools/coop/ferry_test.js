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
// an AI teammate drop-pods to the most forward ground its side holds on its lane
const bot = [...sim.pilots.values()].find((q) => q.team === 0 && q.player >= 100);
let launched = null, landedAt = null;
if (bot) {
    if (bot.state === 0)
        sim.exit(bot.id, bot.team); // the bot starts in a Dart: out first
    const b = sim.idToSlot.get(bot.entity);
    if (b !== undefined) sim.envDamage(b, 1e6);
    for (let k = 0; k < 20 * 90 && !landedAt; k++) {
        sim.step();
        const d = sim.fkit.drops.find((q) => q.pid === bot.id);
        if (d && !launched) launched = { x: d.x, z: d.z };
        if (launched && !d && bot.state === 1) { const s2 = sim.idToSlot.get(bot.entity); landedAt = { x: sim.x[s2], z: sim.z[s2] }; }
    }
}
const lane = sim.fkit.laneOf.get(bot?.id) ?? sim.fkit.lane, fwd = bot ? sim.fkit.forwardDrop(sim, 0, lane) : null;
check("an AI teammate drop-pods instead of riding a Mule", !!launched && !!landedAt, { launched, landedAt });
const core = (() => { for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === 0 && sim.d.typeIds[sim.etype[o]] === "command-core") return o; return -1; })();
check("it lands well forward of the Core, on ground its side holds", !!landedAt && Math.hypot(landedAt.x - sim.x[core], landedAt.z - sim.z[core]) > 300 && sim.fkit.dropOk(sim, 0, landedAt.x, landedAt.z), landedAt && { fromCore: Math.round(Math.hypot(landedAt.x - sim.x[core], landedAt.z - sim.z[core])) });
const T = sim.d.typeIds.indexOf("gun-tower");
check("gun towers are tougher (3600 hp)", sim.d.tHp[T] === 3600, sim.d.tHp[T]);
process.exit(0);
