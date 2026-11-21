// average damage per blast vs a standing pilot, by distance (Frontline guns)
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const gun = process.argv[2] || "shotgun", laser = process.argv[3] === "laser";
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
sim.fkit.bots = null; // no AI pilots in the range
const X = +(process.env.X || 1500), Z = +(process.env.Z || 300);
const pid = sim.spawnPilot(0, X, Z, { player: 0 });
sim.fkit.setKit(sim, 0, { role: "assault", gun, laser, grenade: "he", armour: "medium" });
const p = sim.pilot(pid);
const ctl = (fire) => sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0, aimPitch: 0, fire }, 0);
for (let i = 0; i < 10; i++) { ctl(0); sim.step(); }
const s = sim.idToSlot.get(p.entity), fx = sim.dirX[s], fz = sim.dirZ[s];
const out = [];
for (const D of [5, 10, 20, 30, 45, 60]) {
  const tid = sim.spawnPilot(1, X + fx * D, Z + fz * D, {});
  const tp = sim.pilot(tid);
  let tot = 0, n = 0;
  for (let k = 0; k < 20; k++) {
    const ts = sim.idToSlot.get(tp.entity);
    if (ts === undefined) break;
    sim.hp[ts] = 50000; sim.x[ts] = X + fx * D; sim.z[ts] = Z + fz * D;
    const ss = sim.idToSlot.get(p.entity); sim.x[ss] = X; sim.z[ss] = Z;
    const am = sim.s15.ammo.get(p.entity); if (am) for (let m = 0; m < am.length; m++) if (am[m] >= 0) am[m] = 999;
    sim.mHeat && (sim.mHeat[ss * 12] = 0);
    const h0 = sim.hp[ts], E = sim.events, from = E.next;
    const dy = (sim.y[ts] + 1.0) - (sim.y[ss] + 1.6), pitch = Math.atan2(dy, D);
    sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0, aimPitch: pitch, fire: 1 }, 0); sim.step();
    sim.queuePilotControl(sim.tick + 1, pid, { move: 0, strafe: 0, aimYaw: 0, aimPitch: pitch, fire: 0 }, 0);
    for (let i = 0; i < 24; i++) { sim.step(); const t2 = sim.idToSlot.get(tp.entity); if (t2 !== undefined) sim.x[t2] = X + fx * D, sim.z[t2] = Z + fz * D; }
    let shots = 0, hits = 0;
    for (let q = Math.max(from, E.first()); q < E.next; q++) { const k = E.at(q); if (E.kind[k] === 14 && E.a[k] === sim.eid[ss]) { shots++; if (E.b[k] === tp.entity) hits++; } }
    tot += hits; n += shots;
  }
  out.push(`${D}m ${(100 * tot / Math.max(1, n)).toFixed(0)}% of ${n}`);
  const t4 = sim.idToSlot.get(tp.entity); if (t4 !== undefined) sim.despawn(t4); sim.pilots.delete(tid);
}
const w = sim.d.weaponIds.indexOf(laser ? (gun === "shotgun" ? "scatter-laser" : gun) : gun);
console.log(`${gun}${laser ? " (laser)" : ""} hit rate ->`, out.join("  "));
