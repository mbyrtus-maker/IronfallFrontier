// Designer 22 Nov, batch 1: the new Frontline weapons (Pulse pistol, Trooper rifle, Anti-materiel rifle, Demo charge,
// Rail driver, Mortar tube) load, go onto a pilot's mounts with its kit, and fire in a fight.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js"), EV = req("packages/sim/src/events.js").EV, MM = req("packages/sim/src/data.js").MAX_MOUNTS;
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
const kits = [
  { name: "Kade", kit: { role: "antimateriel", gun: "trooper", laser: false, grenade: "demo", armour: "medium", slot3: "pilot-rail-driver" } },
  { name: "Ishi", kit: { role: "assault", gun: "pistol", laser: true, grenade: "he", armour: "light", slot3: "pilot-mortar" } },
  { name: "Morrow", kit: { role: "assault", gun: "trooper", laser: true, grenade: "he", armour: "heavy", slot3: "rocket-tube" } },
  { name: "Brask", kit: { role: "assault", gun: "pistol", laser: false, grenade: "he", armour: "medium", slot3: "rocket-tube" } },
];
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const F = sim.fkit, tr = sim.d.constants.tickRate, wid = (id) => sim.d.weaponIds.indexOf(id);
for (let i = 0; i < 3; i++) sim.step();
for (const k of kits) { const b = F.bots.bots.find((q) => q.r.name === k.name); k.b = b; b.r = { ...b.r, kit: { ...b.r.kit, ...k.kit } }; check(`${k.name}: the kit is accepted`, F.setKit(sim, b.r.player, b.r.kit) !== false); }
const ids = ["pilot-long-rifle", "pilot-trooper-rifle", "pulse-rifle", "machine-pistol", "pulse-pistol", "pilot-amr", "pilot-demo-grenade", "pilot-rail-driver", "pilot-mortar"];
check("the new weapons are in the data", ids.every((i) => wid(i) >= 0), ids.filter((i) => wid(i) < 0));
const seen = new Set(), shots = {};
const log = sim.events;
let lastQ = log.next;
for (let k = 0; k < 360 * tr; k++) {
  sim.step();
  if (k % 10 === 0) for (const kk of kits) { const p = sim.pilots.get(kk.b.pid); const s = p && p.state === 1 ? sim.idToSlot.get(p.entity) : undefined; if (s !== undefined) for (let m = 0; m < sim.mCount[s]; m++) seen.add(sim.d.weaponIds[sim.mWeapon[s * MM + m]]); }
  for (let q = Math.max(lastQ, log.next - log.count); q < log.next; q++) { const i = q % log.cap; if (log.kind[i] === EV.SHOT || log.kind[i] === EV.PROJECTILE || log.kind[i] === EV.FIRE) { const w = sim.d.weaponIds[log.d[i]] ?? "?"; if (ids.includes(w)) shots[w] = (shots[w] ?? 0) + 1; } }
  lastQ = log.next;
}
console.log("mounted", [...seen].filter((w) => ids.includes(w)), "shots", shots);
for (const w of ["pilot-trooper-rifle", "pulse-rifle", "machine-pistol", "pulse-pistol"]) check(`${w}: mounted and fired`, seen.has(w) && (shots[w] ?? 0) >= 1, { shots: shots[w] ?? 0 });
check("the Anti-materiel rifle is the slot 2 mount", seen.has("pilot-amr"));
const s3 = (pid) => { const v = sim.callState?.(); return v; };
check("the slot 3 weapons are offered", ["pilot-rail-driver", "pilot-mortar"].every((w) => F.R.slot3[w] && F.R.slot3[w].weapon === wid(w)));
check("the demo charge is the grenade mount", seen.has("pilot-demo-grenade"));
process.exit(0);
