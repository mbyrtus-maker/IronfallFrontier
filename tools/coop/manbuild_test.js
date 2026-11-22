// Designer 21 Nov: a player can man every own building: a Gun Tower fires its cannon (RMB) and machine guns (LMB) under
// the player's aim; an unarmed building (Barracks) fires the player's own slot 1 / slot 2 weapons from its roof.
const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../../frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const S = req("packages/sim/src/index.js"), MM = req("packages/sim/src/data.js").MAX_MOUNTS, MS = req("packages/sim/src/data.js").MAX_SEATS;
const sc = req("packages/sim/fixtures/scenarios/frontline.json"), map = req("packages/sim/fixtures/maps/frontline-3.json");
const sim = S.createScenarioSim(data, sc, map, { seed: 7, difficulty: "normal", players: 1 });
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
const find = (id) => { for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === 0 && sim.d.typeIds[sim.etype[o]] === id) return o; return -1; };
function man(b) {
    const off = sim.d.tRadius[sim.etype[b]] + 1.2;
    const pid = sim.spawnPilot(0, sim.x[b] + off, sim.z[b], { player: 0 });
    for (let i = 0; i < 2; i++) sim.step();
    return [pid, sim.manGun(pid, sim.eid[b], 0)];
}
function shoot(b, bits, ticks = 60) {
    const i = b * MS; let shots = 0;
    const before = sim.stats ? JSON.stringify(sim.stats).length : 0;
    for (let k = 0; k < ticks; k++) { sim.gYaw[i] = 0; sim.gPitch[i] = 0; sim.gFire[i] = bits; const p0 = sim.pN; sim.step(); }
    return before;
}
const bar = find("barracks");
const [pb, rb] = man(bar);
check("a Barracks can be manned", rb.ok, rb);
let fired = 0; const i = bar * MS;
for (let k = 0; k < 60; k++) { sim.gYaw[i] = 0; sim.gFire[i] = 1; const cd0 = sim.cooldown[bar * MM]; sim.step(); if (sim.cooldown[bar * MM] > cd0 + 1e-6) fired++; }
check("from its roof the pilot fires its own slot 1 (LMB)", fired > 3, { shots: fired });
let fired2 = 0;
for (let k = 0; k < 100; k++) { sim.gFire[i] = 2; const cd0 = sim.cooldown[bar * MM + 1]; sim.step(); if (sim.cooldown[bar * MM + 1] > cd0 + 1e-6) fired2++; }
check("and slot 2 (RMB)", fired2 >= 1, { shots: fired2 });
check("leaving works", sim.leaveShelter(pb, 0).ok && sim.pilot(pb).state === 1);
const core = find("command-core");
const pc = sim.spawnPilot(0, sim.x[core] + 9, sim.z[core], { player: 0 }); sim.step(); sim.step();
check("the Command Core is entered, not manned", !sim.manGun(pc, sim.eid[core], 0).ok);
// a Gun Tower: LMB the machine guns, RMB the cannon
let tw = -1; for (let o = 0; o < sim.hi; o++) if (sim.alive[o] && sim.team[o] === 0 && sim.d.typeIds[sim.etype[o]] === "gun-tower") tw = o;
const [pt, rt] = man(tw);
check("a Gun Tower can be manned", rt.ok, rt);
const wn = (m) => sim.d.raw.weapons[sim.mWeapon[tw * MM + m]].id, it = tw * MS;
let mg = 0, cn = 0;
for (let k = 0; k < 80; k++) { sim.gYaw[it] = sim.gYaw[it]; sim.gFire[it] = k < 40 ? 1 : 2; const a = sim.cooldown[tw * MM], b2 = sim.cooldown[tw * MM + 1]; sim.step(); if (sim.cooldown[tw * MM] > a + 1e-6) mg++; if (sim.cooldown[tw * MM + 1] > b2 + 1e-6) cn++; }
check("LMB the machine guns, RMB the cannon", wn(0) === "gun-tower-mg" && wn(1) === "gun-tower-cannon" && mg > 5 && cn >= 1, { mg, cn });
process.exit(0);
