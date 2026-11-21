const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
for (const w of ["guided-missile-launcher", "rocket-tube", "heavy-grenade-launcher", "flak-gun", "pilot-laser-cannon", "silo-targeter"]) {
  const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
  const pid = sim.spawnPilot(0, 600, 2300, { player: 0 });
  sim.fkit.setKit?.(sim, 0, { ...sim.fkit.kitOf(0), slot3: w });
  if (sim.fkit.kitOf(0).slot3 !== w) sim.fkit.kits.set(0, { ...sim.fkit.kitOf(0), slot3: w });
  const ci = sim.callRules.calls.findIndex((c) => c.id === "slot3-drop");
  const r = sim.callIn ? null : null;
  const res = sim.callIn(pid, ci, 610, 2300, 0);
  let t0 = sim.tick, landed = -1;
  for (let i = 0; i < 30 * 20 && landed < 0; i++) { sim.step(); const cs = sim.calls.callers.get(pid); if (cs && cs.ready[ci] > sim.tick) landed = (cs.ready[ci] - sim.tick) / 30; }
  console.log(w.padEnd(26), "kit", sim.fkit.kitOf(0).slot3 === w, "recharge s", landed * 30 / 20);
}
