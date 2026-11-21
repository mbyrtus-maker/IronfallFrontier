const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.spawnPilot(0, 600, 2400, { player: 0 });
const B = sim.fkit.bots, E = sim.events;
const shots = new Map(); // weapon id -> count for bot bodies on foot
let seen = E.next;
for (let i = 0; i < 20 * 400; i++) {
  sim.step();
  const bodies = new Map();
  for (const b of B.bots) { const p = sim.pilot(b.pid); if (p.state === 1) bodies.set(p.entity, b.r.name); }
  for (let n = Math.max(seen, E.first()); n < E.next; n++) {
    const k = E.at(n);
    if (E.kind[k] === 14 && bodies.has(E.a[k])) { const key = bodies.get(E.a[k]) + ":" + sim.d.weaponIds[E.d[k]]; shots.set(key, (shots.get(key) ?? 0) + 1); }
  }
  seen = E.next;
}
console.log([...shots].sort().map(([k, v]) => `${k}=${v}`).join("  "));
console.log("stats", JSON.stringify(B.stats));
