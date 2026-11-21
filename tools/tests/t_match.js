// Frontline 4d: a whole match headless (AI pilots both sides, the player's pilot parked at the base): the pace report
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js");
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const seed = +(process.argv[3] || 7), diff = process.argv[4] || "normal";
const sim = S.createScenarioSim(data, sc, map, { seed, difficulty: diff, players: 1 });
sim.spawnPilot(0, 470, 2530, { player: 0 });
const mins = +(process.argv[2] || 30), tr = sim.d.constants.tickRate;
const core = (team) => { const tc = sim.coreTypes(); for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === team && tc[sim.etype[s]] && sim.hp[s] > 0) return Math.round(sim.hp[s] / sim.d.tHp[sim.etype[s]] * 100); return 0; };
const army = (team) => { let n = 0; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.hp[s] > 0 && sim.team[s] === team && !sim.d.tStructure[sim.etype[s]] && sim.etype[s] !== sim.d.pilotType) n++; return n; };
const nearCore = (team) => { const tc = sim.coreTypes(); let cs = -1; for (let s = 0; s < sim.hi; s++) if (sim.alive[s] && sim.team[s] === team && tc[sim.etype[s]] && sim.hp[s] > 0) cs = s; if (cs < 0) return "-"; let foe = 0, tw = 0; for (let s = 0; s < sim.hi; s++) { if (!sim.alive[s] || sim.hp[s] <= 0) continue; const d = Math.hypot(sim.x[s] - sim.x[cs], sim.z[s] - sim.z[cs]); if (d > 400) continue; if (sim.team[s] !== team && sim.team[s] < 4 && !sim.d.tStructure[sim.etype[s]]) foe++; if (sim.team[s] === team && sim.d.typeIds[sim.etype[s]] === "gun-tower") tw++; } return `foes${foe}/towers${tw}/hp${sim.hp[cs].toFixed(0)}`; };
const pts = (team) => { const P = sim.pts; let n = 0; for (let p = 0; p < P.n; p++) if (P.owner[p] === team) n++; return n; };
// front: the farthest own unit along each lane (fraction 0 own Core .. 1 enemy Core) for team 0
const front = (team) => sim.lanes.rules.paths.map((pth, i) => { const w = sim.lanes.path(team, i), a = w[0], b = w[w.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let best = 0; for (const [eid, ln] of sim.lanes.laneOf) { if (ln !== i) continue; const s = sim.idToSlot.get(eid); if (s === undefined || sim.team[s] !== team) continue; const f = ((sim.x[s] - a[0]) * (b[0] - a[0]) + (sim.z[s] - a[1]) * (b[1] - a[1])) / (L * L); best = Math.max(best, f); } return best.toFixed(2); }).join("/");
let ended = -1;
for (let m = 0; m <= mins; m += 2) {
  console.log(`${String(m).padStart(2)}m  pts ${pts(0)}-${pts(1)}  core ${core(0)}%-${core(1)}%  army ${army(0)}-${army(1)}  ore ${sim.ore[0].toFixed(0)}/${sim.ore[1].toFixed(0)} gas ${sim.gas[0].toFixed(0)}/${sim.gas[1].toFixed(0)}  front0 ${front(0)} front1 ${front(1)}  botDeaths ${sim.fkit.bots.stats.deaths}  core0[${nearCore(0)}] core1[${nearCore(1)}] ph${sim.lanes.phase(sim)}`);
  if (sim.match?.over) { ended = m; break; }
  for (let i = 0; i < 120 * tr && !sim.match?.over; i++) sim.step();
}
console.log("over", sim.match?.over, "winner", sim.match?.winner, "at ~", sim.match?.over ? (sim.tick / tr / 60).toFixed(1) + " min" : "-", "bot stats", JSON.stringify(sim.fkit.bots.stats));
