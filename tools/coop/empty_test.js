// Designer 22 Nov, empty vehicles: AI pilots of both sides man an empty vehicle near them (before running back to base);
// a player-tagged vehicle (summoned by / recently driven by a player) is left alone until the tag lapses.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
const tr = sim.d.constants.tickRate, F = sim.fkit;
const footBot = (team, not = []) => { for (const b of F.bots.bots) { if (b.r.team !== team || not.includes(b.pid)) continue; const p = sim.pilots.get(b.pid); if (p && p.state === 1 && !F.dropped.has(b.pid)) return b; } return null; };
let b1 = null, b0 = null;
for (let k = 0; k < 400 * tr && !(b1 && b0); k++) { sim.step(); if (k % 20 === 0) { b1 = footBot(1); b0 = footBot(0); } }
check("an AI pilot of each side on foot", !!b1 && !!b0, { t: sim.tick });
// both moved to the back of their own base (out of the fighting: a test of the choice, not of surviving the lane)
const coreOf = (team) => { for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === team && sim.tCore && sim.tCore[sim.etype[o]]) return o; return -1; };
const park = (b) => { const s = sim.idToSlot.get(sim.pilots.get(b.pid).entity), c = coreOf(b.r.team); const back = b.r.team === 0 ? -1 : 1; sim.x[s] = sim.x[c] + back * 60; sim.z[s] = sim.z[c] + back * 60; sim.px[s] = sim.x[s]; sim.pz[s] = sim.z[s]; };
const spawnNear = (b, type) => { park(b); const s = sim.idToSlot.get(sim.pilots.get(b.pid).entity); const r = sim.spawnUnit(type, b.r.team, sim.x[s] + 25, sim.z[s] + 10, { crew: "none" }); return typeof r === "number" ? r : r.ids[0]; };
const seatedIn = (pid, v) => { const p = sim.pilots.get(pid); return !!p && p.state === 0 && p.vehicle === v; };
// 1: out on its lane, the enemy pilot mans an empty enemy tank 25 m away (kept on its feet: a test of the choice)
const s1 = sim.idToSlot.get(sim.pilots.get(b1.pid).entity), r1 = sim.spawnUnit("bastion", 1, sim.x[s1] + 25, sim.z[s1] + 10, { crew: "none" }), v1 = typeof r1 === "number" ? r1 : r1.ids[0];
let t1 = -1;
for (let k = 0; k < 40 * tr && t1 < 0; k++) { const p = sim.pilots.get(b1.pid), s = p.state === 1 ? sim.idToSlot.get(p.entity) : undefined; if (s !== undefined) sim.hp[s] = sim.pilotMaxHp(p) || sim.hp[s]; sim.step(); if (seatedIn(b1.pid, v1)) t1 = k; }
check("an enemy AI pilot on its lane climbed into the empty tank near it", t1 >= 0, { seconds: t1 / tr });
// 2: a player-tagged vehicle near a friendly AI pilot is left alone, then taken once the tag lapses
const v0 = spawnNear(b0, "bastion");
F.playerTag(sim, v0);
let early = false;
for (let k = 0; k < 30 * tr; k++) { sim.step(); if (sim.nOcc[sim.idToSlot.get(v0)] > 0 && !early) { early = true; const vs = sim.idToSlot.get(v0); const pid = sim.occ[vs * 8]; const q = sim.pilots.get(pid) ?? [...sim.pilots.values()].find((x) => x.vehicle === v0); console.log("early by", q && { id: q.id, player: q.player, task: q.task, bot: sim.isBotPilot(q.id) }, "k", k); } if (k % 100 === 0) F.playerTag(sim, v0); } // (as if the player were still nearby / just out)
check("a player-tagged vehicle is left alone", !early);
let t2 = -1;
const tagEnds = (F.ptag.get(v0) - sim.tick) / tr;
for (let k = 0; k < (tagEnds + 60) * tr && t2 < 0; k++) { sim.step(); if (sim.nOcc[sim.idToSlot.get(v0)] > 0) t2 = k; }
check("once the tag lapsed an AI pilot took it", t2 >= 0 && t2 / tr >= tagEnds - 1, { tagLeft: tagEnds, seconds: t2 / tr });
// 4: a crew pilot out of its vehicle (walking back to base) mans an empty vehicle on the way instead
{
  const sb = sim.idToSlot.get(sim.pilots.get(b1.pid).entity) ?? sim.idToSlot.get(v1);
  const x = sim.x[sb] - 200, z = sim.z[sb] + 150;
  const rc = sim.spawnUnit("lancer", 1, x, z, { crew: "full" }), vc = typeof rc === "number" ? rc : rc.ids[0], vcs = sim.idToSlot.get(vc);
  for (let k = 0; k < 3; k++) sim.step();
  const crew = [...sim.pilots.values()].filter((p) => p.state === 0 && p.vehicle === vc && p.player < 0);
  const re = sim.spawnUnit("bastion", 1, x + 60, z - 30, { crew: "none" }), ve = typeof re === "number" ? re : re.ids[0];
  for (const p of crew) sim.exit(p.id, 1);
  for (let k = 0; k < 2; k++) sim.step();
  const walkers = crew.filter((p) => p.state === 1);
  check("the crew got out and walks home", walkers.length > 0 && walkers.every((p) => p.task === 1 || p.state === 0), { n: walkers.length, tasks: walkers.map((p) => p.task) });
  // the empty Lancer they left is right there: take it out of the picture
  sim.hp[vcs] = 0;
  let tc = -1;
  for (let k = 0; k < 40 * tr && tc < 0; k++) { for (const p of crew) { const s = p.state === 1 ? sim.idToSlot.get(p.entity) : undefined; if (s !== undefined) sim.hp[s] = sim.pilotMaxHp(p) || sim.hp[s]; } sim.step(); if (crew.some((p) => p.state === 0 && p.vehicle === ve)) tc = k; }
  check("a crew pilot walking home climbed into the empty tank 60 m off", tc >= 0, { seconds: tc / tr });
}
// 3: a player in a vehicle tags it; out of it, the tag runs playerVehicleTagSeconds
const hp = [...sim.pilots.values()].find((p) => p.player >= 0 && !sim.isBotPilot(p.id));
if (!hp) console.log("(no player pilot in a headless sim: the tag-while-aboard checks are skipped)");
if (hp) {
  if (hp.state === 1) { const hs = sim.idToSlot.get(hp.entity); const r = sim.spawnUnit("dart", hp.team, sim.x[hs] + 6, sim.z[hs], { crew: "none" }); const v = typeof r === "number" ? r : r.ids[0]; sim.enter(hp.id, v); }
  for (let k = 0; k < 2 * tr; k++) sim.step();
  const pv = hp.state === 0 ? hp.vehicle : 0;
  check("the player's vehicle carries a tag while they are aboard", pv !== 0 && F.isPlayerTagged(sim, pv), { state: hp.state });
  if (pv) { sim.exit(hp.id, hp.team); for (let k = 0; k < 20 * tr; k++) sim.step();
    check("still tagged 20 s after the player got out", F.isPlayerTagged(sim, pv) && sim.nOcc[sim.idToSlot.get(pv)] === 0);
    for (let k = 0; k < 30 * tr; k++) sim.step();
    check("the tag lapsed after 45 s", !F.isPlayerTagged(sim, pv)); }
}
console.log("bot grabs", F.bots.stats.grabs ?? 0, "boards", F.bots.stats.boards);
process.exit(0);
