// Designer 22 Nov, batch 1: the eight call-downs and seven vehicle drops are live in Frontline; vehicle drops are player only.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
const tr = sim.d.constants.tickRate, F = sim.fkit, R = sim.callRules;
for (let i = 0; i < 3; i++) sim.step();
const calls = ["smoke-screen", "sensor-sweep", "recon-drone", "minefield", "emp-burst", "strafing-run", "bomb-run", "scout-drop"];
const drops = { "wasp-drop": "wasp", "hammer-drop": "hammer", "salvo-drop": "salvo", "flak-drop": "flak", "strider-drop": "strider", "lancer-drop": "lancer", "carrier-drop": "carrier", "scout-drop": "dart" };
const fc = sim.d.raw.constants.frontline.frontlineCalls;
check("all fifteen are on the Frontline list", [...calls, ...Object.keys(drops)].every((c) => fc.includes(c)));
const bad = [...calls, ...Object.keys(drops)].filter((c) => { const i = R.ids.indexOf(c); return i < 0 || R.calls[i].fx === 0 || R.calls[i].reqTypes.length; });
check("each compiles to a working effect with nothing to hold first", bad.length === 0, bad);
// an AI pilot as the caller (its loadout set by hand: the AI never picks these)
let b = null;
for (let k = 0; k < 120 * tr && !b; k++) { sim.step(); if (k % 20 === 0) b = F.bots.bots.find((q) => q.r.team === 1 && sim.pilots.get(q.pid)?.state === 1); }
const cst = sim.callState(), pid = b.pid, rec = cst.caller(pid);
const EV = req("packages/sim/src/events.js").EV, log = sim.events;
const step = (n) => { for (let k = 0; k < n; k++) { hold(); sim.step(); } };
const impactsOf = (ci, from) => { let n = 0; for (let q = Math.max(from, log.next - log.count); q < log.next; q++) { const i = q % log.cap; if (log.kind[i] === EV.CALL_IMPACT && log.c[i] === ci) n++; } return n; };
// parked behind its own core (out of the fighting) and kept on its feet; the calls go 25 m from it (inside throw range)
const core = (() => { for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === 1 && sim.tCore[sim.etype[o]]) return o; return -1; })();
const bs = () => sim.idToSlot.get(sim.pilots.get(pid).entity);
let HX = null, HZ = null;
const hold = () => { const s = bs(); if (s !== undefined) { sim.x[s] = HX ?? sim.x[core] + 90; sim.z[s] = HZ ?? sim.z[core] + 90; sim.hp[s] = Math.max(sim.hp[s], 200); } };
const fire = (id, x, z) => { b.r.kit.calls = [id]; rec.loadout = [R.ids.indexOf(id)]; rec.cool = rec.cool ?? {}; const why = sim.callRefusal(pid, R.ids.indexOf(id), 1); sim.queueCall(sim.tick + 1, pid, id, x, z, 1); return why; };
const before = (t) => { let n = 0; for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.d.typeIds[sim.etype[o]] === t && sim.team[o] === 1) n++; return n; };
hold(); step(1);
const x0 = sim.x[bs()] + 25, z0 = sim.z[bs()];
// a target pack for the damaging calls: enemy (team 0) vehicles parked on the spot
const tgt = []; for (let k = 0; k < 3; k++) { const r = sim.spawnUnit("lancer", 0, x0 + k * 6 - 6, z0, { crew: "none" }); tgt.push(sim.idToSlot.get(typeof r === "number" ? r : r.ids[0])); }
const hpAll = () => tgt.reduce((a, o) => a + (sim.alive[o] ? sim.hp[o] + sim.shield[o] : 0), 0);
for (const id of calls.filter((c) => c !== "scout-drop")) {
  if (/run$/.test(id)) { for (const o of tgt) if (sim.alive[o]) sim.envDamage(o, 1e7); step(2); tgt.length = 0; for (const t of [10, 30, 50]) { const r = sim.spawnUnit("lancer", 0, x0 + t, z0, { crew: "none" }); tgt.push(sim.idToSlot.get(typeof r === "number" ? r : r.ids[0])); } } // (a run rakes forward of the beacon, away from the thrower)
  else if (tgt.some((o) => !sim.alive[o])) { tgt.length = 0; for (let k = 0; k < 3; k++) { const r = sim.spawnUnit("lancer", 0, x0 + k * 6 - 6, z0, { crew: "none" }); tgt.push(sim.idToSlot.get(typeof r === "number" ? r : r.ids[0])); } }
  const from = log.next, h0 = hpAll(), why = fire(id, x0, z0);
  if (process.env.DBG && /run$/.test(id)) console.log(id, 'before', tgt.map((o) => [Math.round(sim.hp[o]), Math.round(sim.shield[o])]));
  let low = h0;
  for (let k = 0; k < 16 * tr; k++) { step(1); low = Math.min(low, hpAll()); if (process.env.DBG && /run$/.test(id) && k % 20 === 0) console.log('  ', k / tr, tgt.map((o) => [Math.round(sim.hp[o]), Math.round(sim.shield[o]), Math.round(sim.x[o])])); }
  const hit = impactsOf(R.ids.indexOf(id), from) > 0, dmg = h0 - low;
  if (process.env.DBG && /run/.test(id)) { const pts = []; for (let q = Math.max(from, log.next - log.count); q < log.next; q++) { const i = q % log.cap; if (log.kind[i] === EV.CALL_EFFECT && log.c[i] === R.ids.indexOf(id)) pts.push([Math.round(log.v1[i]), Math.round(log.v2[i])]); } console.log(id, 'effects', pts.slice(0, 8), 'targets', tgt.map((o) => [Math.round(sim.x[o]), Math.round(sim.z[o]), sim.alive[o]]), 'beacon at', Math.round(x0), Math.round(z0)); }
  const harm = ["strafing-run", "bomb-run"].includes(id);
  if (harm) { /* fresh targets (the minefield may have killed the first lot) */ }
  check(`${id}: lands${harm ? " and hurts the vehicles under it" : ""}`, why === null && hit && (!harm || dmg > 300), { why, hit, dmg: Math.round(dmg) });
  for (const o of tgt) if (sim.alive[o]) sim.hp[o] = sim.d.tHp[sim.etype[o]];
}
// the drops (on open ground: a vehicle is not dropped onto buildings): one vehicle a caller at a time, so each is cleared before the next
HX = 2250; HZ = 760; step(2);
const dx0 = HX + 12, dz0 = HZ + 22;
for (const [id, t] of Object.entries(drops)) {
  const n0 = before(t), from = log.next, why = fire(id, dx0, dz0);
  step(tr); const why2 = sim.callRefusal(pid, R.ids.indexOf(id), 1), pend = (sim.calls.beacons ?? []).filter((q) => q.caller === pid).length;
  step(29 * tr);
  if (before(t) <= n0) console.log("  later", why2, "pending", pend);
  if (before(t) <= n0) console.log("  drop", id, "impacts", impactsOf(R.ids.indexOf(id), from), "dropped", F.dropped.get(pid), "fx", R.calls[R.ids.indexOf(id)].fx, "unitType", R.calls[R.ids.indexOf(id)].unitType);
  const dv = F.dropped.get(pid), dvs = dv !== undefined ? sim.idToSlot.get(dv) : undefined, got = dvs !== undefined && sim.d.typeIds[sim.etype[dvs]] === t;
  check(`${id}: delivers a ${t}`, why === null && got, { why });
  const v = F.dropped.get(pid); const vs = v !== undefined ? sim.idToSlot.get(v) : undefined;
  if (vs !== undefined) sim.envDamage(vs, 1e7);
  F.dropped.delete(pid); step(2 * tr);
}
// the AI never calls a vehicle drop
const S2 = S.createScenarioSim(data, sc, map, { seed: 11, difficulty: "normal", players: 1 });
for (let k = 0; k < 600 * tr; k++) S2.step();
const kinds = S2.fkit.bots.stats.callsByKind;
check("in ten minutes the AI pilots called no vehicle drop", !Object.keys(kinds).some((k) => /-drop$/.test(k) && k !== "slot3-drop"), kinds);
process.exit(0);
