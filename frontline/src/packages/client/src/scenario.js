"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIFFICULTIES = exports.mapFor = exports.skirmishMap = exports.isSkirmish = exports.BIG_WAVE_SECONDS = exports.WAVE_SECONDS = exports.FIRST_WAVE_SECONDS = exports.RANGE_START = exports.RANGE_BASE = exports.PILOT_START = exports.DEFENCE = exports.FRONT = exports.ENEMY_BASE = exports.BASE = exports.MAP_SIZE = void 0;
exports.scenarioMap = scenarioMap;
exports.setupSkirmish = setupSkirmish;
exports.setupScenario = setupScenario;
const scenario_ts_1 = require("../../sim/src/scenario.js");
const data_ts_1 = require("../../sim/src/data.js");
const refmap_ts_1 = require("./refmap.js");
const skirmish_ts_1 = require("./skirmish.js");
const battles_ts_1 = require("./battles.js");
exports.MAP_SIZE = 2000;
/** The player's Command Core. */
exports.BASE = { x: 300, z: 1000 };
/** The Hegemony's Command Core: on citadel-east, 1.4 km east. */
exports.ENEMY_BASE = { x: 1700, z: 1000 };
/** The ground in front of the base (terrain flattened there too; the command view opens over it). */
exports.FRONT = { x: 450, z: 1000 };
/** The friendly force's defensive arc: between the Gun Towers, about 100 m in front of the Command Core. */
exports.DEFENCE = { x: exports.BASE.x + 100, z: exports.BASE.z };
/** Where the player's pilot starts: on foot, beside the Command Core (its drawn hull is 1.5x the sim radius). */
exports.PILOT_START = { x: exports.BASE.x + 17, z: exports.BASE.z + 6 };
/** Test range: a small base, the pilot starting beyond the energy-refill radius of its buildings. */
exports.RANGE_BASE = { x: 450, z: 1000 };
exports.RANGE_START = { x: 505, z: 1050 };
/** Default battle: the first Hegemony wave after 150 s, then one every 90 s, each larger than the last. */
exports.FIRST_WAVE_SECONDS = 150;
exports.WAVE_SECONDS = 90;
/** The 300-unit performance run keeps the slice-3 pace. */
exports.BIG_WAVE_SECONDS = 60;
/** Map of the default battle: the reference map with the gas vent held by the Hegemony (enemy-held points to take). */
function scenarioMap() {
    const m = JSON.parse(JSON.stringify(refmap_ts_1.REFERENCE_MAP));
    for (const p of m.points)
        if (p.id === "gas-vent")
            p.owner = 1;
    return m;
}
/**
 * Client C3: the default battle is the sim's "skirmish" scenario (player west, enemy commander east, match rules).
 * The 300-unit run (units > 60) keeps the scripted slice-3 battle without a map.
 */
const isSkirmish = (kind, units) => kind === "default" && units <= 60;
exports.isSkirmish = isSkirmish;
/** The skirmish map: the battle's map with the scenario's home deposits appended (the map's own indices unchanged). C6: per battle (default: Classic). */
const skirmishMap = (battle = "classic") => { const b = (0, battles_ts_1.battleOf)(battle); return b.id === "classic" ? (0, scenario_ts_1.scenarioMap)(skirmish_ts_1.SKIRMISH, refmap_ts_1.REFERENCE_MAP) : (0, scenario_ts_1.scenarioMap)(b.scenario, b.map); };
exports.skirmishMap = skirmishMap;
/** Scenarios played on a map (the others have no points, deposits or geysers). */
const mapFor = (kind, units, battle = "classic") => ((0, exports.isSkirmish)(kind, units) ? (0, exports.skirmishMap)(battle) : undefined);
exports.mapFor = mapFor;
/** AI difficulties of the enemy commander (data/constants.json enemyAi.difficulties). */
exports.DIFFICULTIES = ["easy", "normal", "hard"];
/**
 * The skirmish's host side once the sim is built (worker.ts: map, match rules, the scenario's spawns): the player's
 * pilot on foot beside the west Command Core. No scripted waves: the enemy commander plays team 1 inside the sim.
 */
function setupSkirmish(sim0, start = exports.PILOT_START) {
    let sim = sim0;
    const pilotId = sim.spawnPilot(0, start.x, start.z, { player: 0 });
    const e = sim.entity(sim.pilot(pilotId).entity);
    if (e) {
        sim.dirX[e.slot] = 1;
        sim.dirZ[e.slot] = 0;
    }
    const sc = {
        pilotId, wave: 0, ticksToWave: 1e9, held: new Set(),
        rebind: (s) => { sim = s; },
        maintain(s) { holdWeapons(s, sc.held); },
    };
    void sim;
    return sc;
}
function lcg(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function setupScenario(sim0, units, seed, kind = "default", showcaseFire = false) {
    const rnd = lcg(seed * 7919 + 13);
    let sim = sim0; // replaced by rebind (handover test aid)
    const tickRate = 1 / sim.d.dt;
    const has = (id) => sim.d.typeIds.includes(id);
    const spawn = (id, team, x, z) => {
        if (!has(id))
            return [];
        const t = sim.d.typeIds.indexOf(id);
        if (sim.d.tSquadSize[t] > 1)
            return sim.spawnSquad(id, team, x, z).ids;
        return [sim.spawnUnit(id, team, x, z)];
    };
    const faceAll = (ids, dx, dz) => {
        const l = Math.hypot(dx, dz);
        for (const id of ids) {
            const e = sim.entity(id);
            if (e) {
                sim.dirX[e.slot] = dx / l;
                sim.dirZ[e.slot] = dz / l;
            }
        }
    };
    const rebind = (s) => { sim = s; };
    if (kind === "showcase")
        return setupShowcase(sim, spawn, faceAll, showcaseFire, rebind);
    if (kind === "range")
        return setupRange(sim, spawn, faceAll, rebind);
    const perSide = Math.floor(units / 2);
    const big = units > 60;
    // ---- the player's base (team 0), facing east
    const base = [
        ...spawn("command-core", 0, exports.BASE.x, exports.BASE.z),
        ...spawn("barracks", 0, exports.BASE.x, exports.BASE.z + 85),
        ...spawn("foundry", 0, exports.BASE.x, exports.BASE.z - 85),
        ...spawn("gun-tower", 0, exports.BASE.x + 85, exports.BASE.z - 55),
        ...spawn("gun-tower", 0, exports.BASE.x + 85, exports.BASE.z + 55),
        ...spawn("refinery", 0, exports.BASE.x - 60, exports.BASE.z - 70),
        ...spawn("silo", 0, exports.BASE.x - 70, exports.BASE.z + 60), // storage 2,000 ore: the starting 1,000 is not already at the cap
    ];
    faceAll(base, 1, 0);
    // ---- the Hegemony base (team 1), facing west
    const ebase = [
        ...spawn("command-core", 1, exports.ENEMY_BASE.x, exports.ENEMY_BASE.z),
        ...spawn("barracks", 1, exports.ENEMY_BASE.x + 10, exports.ENEMY_BASE.z + 85),
        ...spawn("foundry", 1, exports.ENEMY_BASE.x + 10, exports.ENEMY_BASE.z - 85),
        ...spawn("gun-tower", 1, exports.ENEMY_BASE.x - 85, exports.ENEMY_BASE.z - 40),
        ...spawn("gun-tower", 1, exports.ENEMY_BASE.x - 85, exports.ENEMY_BASE.z + 50),
    ];
    faceAll(ebase, -1, 0);
    // ---- the player's pilot, on foot beside the Command Core
    const pilotId = sim.spawnPilot(0, exports.PILOT_START.x, exports.PILOT_START.z, { player: 0 });
    faceAll([sim.pilot(pilotId).entity], 1, 0);
    // ---- the friendly AI-crewed force. Default battle: a defensive arc between the Gun Towers ~100 m in front of the
    // Command Core (no orders: they hold and return fire, covered by the towers). 300-unit run: the slice-3 line 150 m out.
    const L = big ? { x: exports.FRONT.x, z: exports.FRONT.z } : exports.DEFENCE;
    const friends = [];
    friends.push(...spawn("lancer", 0, L.x, L.z - 40));
    friends.push(...spawn("lancer", 0, L.x, L.z + 40));
    friends.push(...spawn("lancer", 0, L.x - 15, L.z - 95));
    friends.push(...spawn("bastion", 0, L.x + 8, L.z + 2));
    friends.push(...spawn("dart", 0, L.x - 30, L.z - 140));
    friends.push(...spawn("dart", 0, L.x - 30, L.z + 140));
    friends.push(...spawn("trooper-squad", 0, L.x - 10, L.z - 62));
    friends.push(...spawn("trooper-squad", 0, L.x - 10, L.z + 62));
    faceAll(friends, 1, 0);
    // two Harvesters beside the Refinery: they start mining on their own (the nearest deposit)
    const hv = [...spawn("harvester", 0, exports.BASE.x - 30, exports.BASE.z - 110), ...spawn("harvester", 0, exports.BASE.x - 10, exports.BASE.z - 115)];
    faceAll(hv, 1, 0);
    // ---- the Hegemony's opening force in front of its base. 300-unit run: attack-moving on the player's base at once.
    // Default battle: it garrisons its own base and joins the third wave.
    const EX = exports.ENEMY_BASE.x - 160;
    const foes = [];
    foes.push(...spawn("lancer", 1, EX, exports.BASE.z - 50));
    foes.push(...spawn("lancer", 1, EX, exports.BASE.z + 50));
    foes.push(...spawn("bastion", 1, EX + 50, exports.BASE.z - 20));
    foes.push(...spawn("dart", 1, EX - 10, exports.BASE.z - 130));
    foes.push(...spawn("dart", 1, EX - 10, exports.BASE.z + 130));
    foes.push(...spawn("trooper-squad", 1, EX + 70, exports.BASE.z + 40));
    foes.push(...spawn("sapper-team", 1, EX + 70, exports.BASE.z - 60));
    faceAll(foes, -1, 0);
    if (big)
        sim.order(foes, { type: "attackMove", x: exports.BASE.x, z: exports.BASE.z });
    // ---- performance run: top both sides up to `units` in total
    const fillTypes = ["lancer", "trooper-squad", "bastion", "dart", "lancer", "hammer", "flak", "salvo"];
    const unitCount = () => sim.unitCount(0) + sim.unitCount(1);
    const fill = (team, target) => {
        let k = 0;
        while (sim.unitCount(team) < target && k < 400) {
            const id = fillTypes[(k + team * 3) % fillTypes.length];
            const x = team === 0 ? exports.BASE.x + 80 + rnd() * 220 : exports.BASE.x + 480 + rnd() * 300; // (C2: relative to the base, which moved onto citadel-west)
            const z = 520 + rnd() * 960;
            const ids = spawn(id, team, x, z);
            faceAll(ids, team === 0 ? 1 : -1, 0);
            if (team === 1)
                sim.order(ids, { type: "attackMove", x: exports.BASE.x, z: exports.BASE.z });
            else
                sim.order(ids, { type: "attackMove", x: exports.BASE.x + 530, z: z });
            k++;
        }
    };
    if (big) {
        fill(0, perSide);
        fill(1, units - sim.unitCount(0));
    }
    else if (units > unitCount()) {
        fill(0, perSide);
        fill(1, units - sim.unitCount(0));
    }
    /** Composition of default-battle wave n (1-based): it grows with n. */
    const waveUnits = (n) => {
        const u = [];
        for (let i = 0; i < Math.min(2 + Math.floor((n - 1) / 2), 6); i++)
            u.push("lancer");
        for (let i = 0; i < 1 + Math.floor((n - 1) / 3); i++)
            u.push("trooper-squad");
        for (let i = 0; i < Math.min(Math.max(0, n - 1), 3); i++)
            u.push("dart");
        if (n >= 3)
            u.push("bastion");
        if (n >= 4 && n % 2 === 0)
            u.push("wasp");
        if (n >= 5)
            u.push("hammer");
        if (n >= 6 && n % 3 === 0)
            u.push("strider");
        return u;
    };
    let garrison = foes.slice();
    const sc = {
        pilotId,
        wave: 0,
        ticksToWave: (big ? exports.BIG_WAVE_SECONDS : exports.FIRST_WAVE_SECONDS) * tickRate,
        held: new Set(),
        rebind,
        maintain(s) {
            // performance run: keep both sides topped up to `units` (every 5 s)
            if (big && s.tick % (5 * tickRate) === 0) {
                fill(0, perSide);
                fill(1, units - s.unitCount(0));
            }
            holdWeapons(s, sc.held);
            if (--sc.ticksToWave > 0)
                return;
            sc.ticksToWave = (big ? exports.BIG_WAVE_SECONDS : exports.WAVE_SECONDS) * tickRate;
            sc.wave++;
            const cap = big ? perSide : 60;
            if (s.unitCount(1) < cap) {
                const z0 = 760 + rnd() * 480;
                const wave = [];
                if (big) {
                    // the slice-3 waves (performance run)
                    wave.push(...spawn("lancer", 1, 1450, z0 - 40), ...spawn("lancer", 1, 1450, z0 + 40), ...spawn("dart", 1, 1420, z0 + 90));
                    wave.push(...spawn("trooper-squad", 1, 1480, z0));
                    if (sc.wave % 2 === 0)
                        wave.push(...spawn("bastion", 1, 1500, z0 - 70));
                    if (sc.wave % 2 === 1)
                        wave.push(...spawn("wasp", 1, 1550, z0 + 60));
                    if (sc.wave % 3 === 2)
                        wave.push(...spawn("strider", 1, 1560, z0));
                }
                else {
                    // default battle: a growing wave from behind the Hegemony base, spread across its front
                    const list = waveUnits(sc.wave);
                    list.forEach((id, i) => wave.push(...spawn(id, 1, exports.ENEMY_BASE.x + 130 + (i % 3) * 25, z0 + (i - (list.length - 1) / 2) * 32)));
                    // the garrison joins the third wave
                    if (sc.wave === 3) {
                        garrison = garrison.filter((id) => !!s.entity(id));
                        wave.push(...garrison);
                        garrison = [];
                    }
                }
                faceAll(wave, -1, 0);
                s.order(wave, { type: "attackMove", x: exports.BASE.x, z: exports.BASE.z });
            }
            // the 300-unit run keeps its scripted friendly reinforcements (the default battle relies on production instead)
            if (big && s.unitCount(0) < cap) {
                const z0 = 880 + rnd() * 240;
                const rf = [...spawn("lancer", 0, exports.BASE.x + 60, z0), ...spawn("trooper-squad", 0, exports.BASE.x + 40, z0 + 40)];
                faceAll(rf, 1, 0);
                s.order(rf, { type: "attackMove", x: exports.FRONT.x + 100, z: z0 });
            }
        },
    };
    return sc;
}
/** Keeps the weapons of `ids` from firing (cooldowns held high); forgets ids that are gone. */
function holdWeapons(s, ids) {
    for (const id of ids) {
        const e = s.entity(id);
        if (!e) {
            ids.delete(id);
            continue;
        }
        for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++)
            s.cooldown[e.slot * data_ts_1.MAX_MOUNTS + m] = 1e9;
    }
}
/**
 * Test range: a small base (Command Core, Barracks, Foundry) and the player's pilot on foot 60-70 m from it, beyond
 * the 25 m energy-refill radius. No enemy and no waves; targets and vehicles are added through the worker's debug spawn.
 */
function setupRange(sim, spawn, faceAll, rebind) {
    const B = exports.RANGE_BASE;
    faceAll([...spawn("command-core", 0, B.x, B.z), ...spawn("barracks", 0, B.x, B.z + 85), ...spawn("foundry", 0, B.x, B.z - 85)], 1, 0);
    const pilotId = sim.spawnPilot(0, exports.RANGE_START.x, exports.RANGE_START.z, { player: 0 });
    faceAll([sim.pilot(pilotId).entity], 1, 0);
    const sc = {
        pilotId, wave: 0, ticksToWave: 1e9, held: new Set(), rebind,
        maintain(s) { holdWeapons(s, sc.held); },
    };
    return sc;
}
/**
 * ?showcase=1: one of every unit kind per side in two rows in front of the player's pilot (friendly row nearer),
 * structures behind them, weapons held (the worker keeps every cooldown high), so the silhouettes and team colours
 * can be inspected. A Command Core behind the pilot is its respawn point.
 */
function setupShowcase(sim, spawn, faceAll, fire, rebind) {
    const P = { x: 600, z: 1000 };
    faceAll(spawn("command-core", 0, P.x - 120, P.z), 1, 0);
    const pilotId = sim.spawnPilot(0, P.x - 10, P.z, { player: 0 });
    faceAll([sim.pilot(pilotId).entity], 1, 0);
    const row = ["dart", "salvo", "lancer", "bastion", "hammer", "flak", "carrier", "strider", "harvester", "trooper-squad", "sapper-team", "wasp"];
    const gap = (id) => (id === "strider" ? 20 : 7.5); // designer 20 Nov: the Strider stands twice as tall on wider legs
    const zs = [];
    row.reduce((z, id, i) => { const zz = z + (i ? gap(row[i - 1]) + gap(id) : 0); zs.push(zz); return zz; }, 0);
    row.forEach((id, i) => {
        const z = P.z + zs[i] - zs[zs.length - 1] / 2;
        faceAll(spawn(id, 0, P.x + 48, z), -0.3, 1);
        faceAll(spawn(id, 1, P.x + 92, z), -1, -0.4);
    });
    ["gun-tower", "relay-tower", "barracks", "missile-battery"].forEach((id, i) => spawn(id, i % 2, P.x + 150, P.z + (i - 1.5) * 45));
    // weapons held (silhouette inspection), or, with `fire`, a live fight for the shot-origin measurement
    // player pilots (on foot or in whatever they drive or gun) keep their weapons, so sounds can be tried here
    const hold = (s) => { if (fire)
        return;
        const free = new Set();
        for (const p of s.pilots.values())
            if (p.player >= 0 && !(s.isBotPilot && s.isBotPilot(p.id))) {
                for (const id of [p.entity, p.vehicle]) {
                    const sl = id ? s.idToSlot.get(id) : undefined;
                    if (sl !== undefined)
                        free.add(sl);
                }
            }
        for (let sl = 0; sl < s.hi; sl++) {
            if (free.has(sl) || (s.ctlOn && s.ctlOn[sl] === 1)) {
                for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++) // just boarded: release the hold
                    if (s.cooldown[sl * data_ts_1.MAX_MOUNTS + m] > 1e8)
                        s.cooldown[sl * data_ts_1.MAX_MOUNTS + m] = 0;
                continue;
            }
            for (let m = 0; m < data_ts_1.MAX_MOUNTS; m++)
                s.cooldown[sl * data_ts_1.MAX_MOUNTS + m] = 1e9;
        }
    };
    hold(sim);
    const sc = {
        pilotId, wave: 0, ticksToWave: 1e9, held: new Set(), rebind,
        maintain(s) { hold(s); holdWeapons(s, sc.held); },
    };
    return sc;
}
