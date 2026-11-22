"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Ironfall browser client: page entry. Loads the inline data, builds the shared heightmap, starts the sim worker
// (from a Blob of the inline sources), decodes its delta snapshots, interpolates and renders them with raw
// WebGL2, and turns keyboard / mouse into pilot control (first person) or orders (command view).
// Client slice 2: aim assist and convergence (aim.ts), hit / shield / reload feedback, shot origins at the drawn
// muzzles, synthesised sound (audio.ts), procedural ground detail and props, infantry walk cycle and barrel recoil,
// per-type command icons (icons.ts), order-refusal messages and in-page scenario buttons.
// Client slice 3 (sim stage 1, CONTRACTS rulings 11 and 15-19): the player is a pilot on foot (true first-person
// camera, sprint, crouch, jump, jetpack, carbine, long rifle with scope, repair torch, energy), enters, exits and
// switches seats in vehicles (taking a friendly AI seat sends that AI pilot home on foot), ejects with a hold of E,
// snipes enemy drivers out of their vehicles and hijacks empty ones, calls a ride, queues production at buildings,
// and respawns on foot. The player's pilot, the stockpile, the queues and the events come from the snapshot stream.
// Debug hook: window.__ironfall.
const load_mjs_1 = require("../../../data/load.mjs");
const data_ts_1 = require("../../sim/src/data.js");
const netsnap_ts_1 = require("../../sim/src/netsnap.js");
const c5_ts_1 = require("./c5.js");
const c6_ts_1 = require("./c6.js");
const cine_ts_1 = require("./cinematic.js"); // Frontline: the opening cinematic
const loadout_ui_ts_1 = require("./loadout-ui.js"); // Frontline: the grouped loadout picker
const pilotkit_ts_1 = require("../../sim/src/pilotkit.js");
const c6_ts_2 = require("./c6.js");
const c6_ts_3 = require("./c6.js");
const c7b_ts_1 = require("./c7b.js");
const c7b_ts_2 = require("./c7b.js");
const data_ts_2 = require("../../sim/src/data.js");
const c7b_ts_3 = require("./c7b.js");
const c7b_ts_4 = require("./c7b.js");
const c7b_ts_5 = require("./c7b.js");
const u1_loadout_ts_1 = require("./u1-loadout.js");
const progression_ts_1 = require("../../sim/src/progression.js");
const keys_ts_1 = require("./keys.js");
const pad_ts_1 = require("./pad.js");
const c8_ts_1 = require("./c8.js");
const objectives_ts_1 = require("../../sim/src/objectives.js");
const predict_ts_1 = require("../../sim/src/predict.js");
const tilt_ts_1 = require("./tilt.js");
const w1_walker_ts_1 = require("./w1-walker.js");
const smooth_ts_1 = require("./smooth.js");
const h2_ride_ts_1 = require("./h2-ride.js");
const predict_ts_2 = require("../../sim/src/predict.js");
const c6_ts_4 = require("./c6.js");
const economy2_ts_1 = require("../../sim/src/economy2.js");
const fb1_ts_1 = require("./fb1.js");
const fort1_ts_1 = require("./fort1.js"); // ruling 133
const c6_ts_5 = require("./c6.js");
const c6_ts_6 = require("./c6.js");
const calls_ts_1 = require("../../sim/src/calls.js");
const b2_prod_ts_1 = require("./b2-prod.js");
const c4_ts_1 = require("./c4.js");
const events_ts_1 = require("../../sim/src/events.js");
const sim_ts_1 = require("../../sim/src/sim.js");
const f3_citadel_ts_1 = require("./f3-citadel.js");
const s2_pod_ts_1 = require("./s2-pod.js");
const c1_crew_ts_1 = require("./c1-crew.js");
const terrain_gen_ts_1 = require("./terrain-gen.js");
const relief_ts_1 = require("../../sim/src/relief.js");
const t1_relief_ts_1 = require("./t1-relief.js");
const render_ts_1 = require("./render.js");
const sound_table_ts_1 = require("./sound-table.js");
const meshes_ts_1 = require("./meshes.js");
const math_ts_1 = require("./math.js");
const fx_ts_1 = require("./fx.js");
const audio_ts_1 = require("./audio.js");
const turret_cue_ts_1 = require("./turret-cue.js");
const fx_table_ts_1 = require("./fx-table.js");
const p1_sound_ts_1 = require("./p1-sound.js"); // P1 hook
const fx_p2_ts_1 = require("./fx-p2.js"); // P2 hook
const g1_fields_ts_1 = require("./g1-fields.js");
const minimap_ts_1 = require("./minimap.js");
const hud_range_ts_1 = require("./hud-range.js");
const g1_terrain_ts_1 = require("./g1-terrain.js");
const icons_ts_1 = require("./icons.js");
const aim_ts_1 = require("./aim.js");
const scenario_ts_1 = require("./scenario.js");
const battles_ts_1 = require("./battles.js");
const c2_ts_1 = require("./c2.js");
const c3_ts_1 = require("./c3.js");
const mp_ts_1 = require("./mp.js");
const netcore_ts_1 = require("./netcore.js");
const c10_ts_1 = require("./c10.js");
const c11_ts_1 = require("./c11.js");
const f2_laser_ts_1 = require("./f2-laser.js");
const boost_hud_ts_1 = require("./boost-hud.js");
const c9_ts_1 = require("./c9.js");
const progression_ui_ts_1 = require("./progression-ui.js"); // C7a hook
const d1_cheats_ts_1 = require("./d1-cheats.js"); // D1 test cheats (ruling 115)
const G = globalThis;
const $ = (id) => document.getElementById(id);
// URL options still work (?units=N, ?showcase=1, ?seed=N, ?cap=1; test aids ?scenario=range, ?showcase=1&fire=1,
// ?lite=1: no props and no haze, for the fast headless smoke run);
// the start overlay's buttons pick the large battle or the showcase without them (the published page has no URL options)
const params = new URLSearchParams(location.search);
const SEED = Number(params.get("seed") ?? 7) || 7;
const CAPPED = params.get("cap") === "1";
/** C8: the developer readout (fps, frame, sim tick, draws) is shown with ?dev=1 or while the O overlay is on. */
const DEV_READOUT = params.get("dev") === "1";
/** Test aid: skip decorative props and the distance haze (headless functional runs; screenshots turn it off). */
let LITE = params.get("lite") === "1";
const URL_CONFIG = {
    units: (0, math_ts_1.clamp)(Number(params.get("units") ?? 0) || 0, 0, 1000),
    scenario: params.get("scenario") === "range" ? "range" : params.get("showcase") === "1" ? "showcase" : "default",
    showcaseFire: params.get("fire") === "1",
    // C6: ?battle=skirmish-2 | s2-conquest | ... | classic (start screen); the default battle is the symmetric skirmish
    battle: (0, battles_ts_1.battleById)(params.get("battle"))?.id ?? battles_ts_1.DEFAULT_BATTLE,
};
/** C6: the page's terrain (built once per page): the battle's map, or the reference terrain for the scripted runs. */
const GEO = (0, battles_ts_1.pageGeo)((0, battles_ts_1.battleOf)(URL_CONFIG.battle), URL_CONFIG.scenario !== "default" || URL_CONFIG.units > 60);
const GEO_LAYOUT = (0, battles_ts_1.battleLayout)(GEO === "ref" ? (0, battles_ts_1.battleOf)("classic") : (0, battles_ts_1.battleOf)(URL_CONFIG.battle));
const MAP_SIZE = GEO_LAYOUT.mapSize, BASE = GEO_LAYOUT.base, ENEMY_BASE = GEO_LAYOUT.enemyBase, FRONT = GEO_LAYOUT.front, PILOT_START = GEO_LAYOUT.pilotStart;
let config = { ...URL_CONFIG };
/** C3: the sim seed of the running battle (Play again picks a new one; the terrain keeps the page's SEED) and the enemy commander's difficulty (?difficulty=, start / pause menu; applied at the next start or restart). */
let simSeed = SEED;
let difficulty = scenario_ts_1.DIFFICULTIES.includes(params.get("difficulty") ?? "") ? params.get("difficulty") : "normal";
let runningDifficulty = difficulty;
/** C6: the planet of the page's battle (W2d planet skirmishes); the scripted runs and the missions are on Halcyon. */
const PLANET = GEO === "ref" ? "halcyon" : (0, battles_ts_1.battleOf)(URL_CONFIG.battle).planet;
const PAGE_KEY = (0, battles_ts_1.pageKey)((0, battles_ts_1.battleOf)(URL_CONFIG.battle), URL_CONFIG.scenario !== "default" || URL_CONFIG.units > 60);
const TERRAIN_CELL = 8;
const errors = [];
function fail(msg) {
    errors.push(msg);
    try { console.error("FAIL " + msg); } catch { /* no console */ }
    const el = $("err");
    if (el) {
        el.textContent = msg.split("\n")[0];
        el.style.display = "block";
    }
}
window.addEventListener("error", (e) => fail(String(e.error?.stack ?? e.message)));
window.addEventListener("unhandledrejection", (e) => fail(String(e.reason?.stack ?? e.reason)));
// ------------------------------------------------------------------ data, terrain
const data = (0, load_mjs_1.loadDataSync)((name) => {
    const t = G.__IRONFALL_DATA[name];
    if (typeof t !== "string")
        throw new Error(`data file ${name} is not in the page`);
    return t;
});
const cd = (0, data_ts_1.compileData)(data, PLANET);
const dt = cd.dt, tickMs = dt * 1000;
// C6: on the symmetric map every strategic point is kept gentle too (the classic terrain is unchanged)
const SHAPE = { flats: [{ x: BASE.x, z: BASE.z, r: 240 }, { x: ENEMY_BASE.x, z: ENEMY_BASE.z, r: 200 }, { x: FRONT.x, z: FRONT.z, r: 150 },
        ...(GEO === "sym" ? (0, battles_ts_1.battleOf)(URL_CONFIG.battle).map.points.map((p) => ({ x: p.x, z: p.z, r: Math.min(160, p.radius) })) : [])],
    walls: GEO === "sym" ? ((0, battles_ts_1.battleOf)(URL_CONFIG.battle).scenario.walls ?? []) : [] }; // Frontline: the outer lanes' passes
/**
 * T1 (ruling 116): a planet battle whose scenario has relief (Rust, Pale, Brume, Cinder) is built by the sim's own
 * generator from the page's ?seed (default 7, the sim's RELIEF_DEFAULT_SEED): host and guests build the same heights and
 * the worker injects them. Every other page keeps the rolling hills.
 */
const RELIEF = GEO === "sym" && (0, battles_ts_1.battleOf)(URL_CONFIG.battle).scenario.relief && relief_ts_1.RELIEF_CELL === TERRAIN_CELL
    ? (0, relief_ts_1.scenarioRelief)(data, PLANET, MAP_SIZE, (0, battles_ts_1.battleOf)(URL_CONFIG.battle).map, (0, battles_ts_1.battleOf)(URL_CONFIG.battle).scenario.terrainLayer, SEED) : null;
const RELIEF_DEF = RELIEF ? (0, relief_ts_1.reliefPlanet)(data, PLANET) : null;
const hmGen = RELIEF ? { ...RELIEF.heightmap(TERRAIN_CELL), offset: 0 } : (0, terrain_gen_ts_1.generateHeightmap)(MAP_SIZE, TERRAIN_CELL, SEED, SHAPE);
const hm = hmGen;
const unitDef = (id) => data.units.find((x) => x.id === id);
/** C4: defence buildings (buildings.json defence: Gun Tower, Missile Battery, Shield Projector). */
const DEFENCE = new Set(data.buildings.filter((b) => b.defence === true).map((b) => b.id));
const kindOfType = cd.typeIds.map((id, t) => (0, meshes_ts_1.kindFor)(id, unitDef(id)?.armourClass ?? "structure", cd.tStructure[t] === 1));
/** G1 (designer: "buildings that produce should be in a slightly different hue"): Command Core, Foundry, Barracks, Air Pad. */
const PROD_TYPE = cd.typeIds.map((id) => ["command-core", "foundry", "barracks", "air-pad"].includes(id));
const familyOfType = cd.typeIds.map((id, t) => (0, icons_ts_1.iconFamily)(id, unitDef(id)?.armourClass ?? "structure", cd.tStructure[t] === 1, cd.tAir[t] === 1));
const typeName = cd.typeIds.map((id) => (data.units.find((u) => u.id === id) ?? data.buildings.find((b) => b.id === id))?.name ?? id);
const weaponName = cd.weaponIds.map((id) => data.weapons.find((w) => w.id === id)?.name ?? id);
const weaponClass = cd.weaponIds.map((_, w) => data_ts_1.DAMAGE_TYPES[cd.wDamageType[w]]);
const W_CARBINE = cd.weaponIds.indexOf("pilot-carbine"), W_RIFLE = cd.weaponIds.indexOf("pilot-long-rifle");
const PILOT_TYPE = cd.pilotType;
const CREW = cd.crew;
/** Ruling 34 (amends 25-26): vehicle type t ejects its crew automatically when destroyed (bikes do not: the rider and the passenger die with the bike). */
const autoEjects = (t) => CREW.critClass[cd.tArmour[t]] === 1;
/**
 * Automatic weapons (ruling 21: light and bike guns fire streams; the carbine too): 2 or more shots per second. While
 * the trigger is held their HUD shows a steady FIRING state instead of a reload ring refilling between shots, their
 * hit markers merge into a lighter stream marker, the player's own muzzle flash is a sustained, smaller glow and their
 * own fire sound is a short crack (no long tail stacking up).
 */
const AUTO_PERIOD_S = 0.5; // 2 or more shots a second (playtest: a swivel gun at 2.25 / s read as "reloading")
/** Fire-sound pitch per weapon (empty since ruling 108 removed the Tandem, whose guns played lower). */
const FIRE_PITCH = {};
const firePitch = cd.weaponIds.map((id) => FIRE_PITCH[id] ?? 1);
/** Machine guns played from the recorded M249 shot: playback rate per weapon (0: synth). */
const mgRate = cd.weaponIds.map((id) => sound_table_ts_1.MG_SAMPLE[id] ?? 0);
const isAuto = (w) => w >= 0 && cd.wPeriod[w] <= AUTO_PERIOD_S;
/**
 * V1 (designer playtest 15 Nov: "shells and lasers need graphics"): each weapon's drawn calibre class (render.ts projCode:
 * 0 small arms .. 7 siege shell; width and brightness of the round in both views) by its effects family, and the laser
 * cannon's held beam (BEAM_S seconds, brightest at the shot).
 */
const WFAM = cd.weaponIds.map((id, w) => (0, sound_table_ts_1.familyOf)(id, data_ts_1.DAMAGE_TYPES[cd.wDamageType[w]] ?? ""));
const CAL_OF = { "kinetic-small": 0, carbine: 0, shotgun: 0, rifle: 1, "kinetic-medium": 2, energy: 2, turret: 2, autocannon: 2, flak: 3, rocket: 3, missile: 3, "laser-rapid": 3, "kinetic-heavy": 5, mortar: 5, artillery: 7, beam: 2 };
const projCal = WFAM.map((f) => CAL_OF[f] ?? 1);
const BEAM_S = 0.75;
const CONT_BEAM = cd.weaponIds.indexOf("pilot-laser-cannon"), CONT_BEAM_S = 0.16; // Frontline: the shoulder laser cannon's held beam
const PELLETS = cd.weaponIds.map((id) => data.weapons.find((w) => w.id === id)?.pellets ?? 1), pelletSnd = new Map();
/** Frontline: weapons fired with a designer recording of their own (audio.ts weaponSample; the synth while not decoded). */
const WSAMPLE = cd.weaponIds.map((id) => ({ "pilot-carbine": "carbine", "grenade-launcher": "grenadeLauncher", "heavy-grenade-launcher": { n: "grenadeLauncher", rate: 0.9 },
    "marksman-rifle": { n: "rifle", rate: 1.06, len: 0.9 }, "pilot-long-rifle": "rifle", "trooper-rifle": { n: "rifle", rate: 1.04, len: 1.4 }, "anti-materiel-rifle": { n: "rifle", rate: 0.78 },
    "machine-pistol": "machinePistol", "machine-pistol-dual": { n: "machinePistol", rate: 1.04 },
    "rocket-tube": "rocket", "guided-missile-launcher": { n: "rocket", rate: 0.94 }, "gunship-rocket-pods": { n: "rocket", rate: 1.18, len: 0.32, lvl: 0.5 }, "mech-missile-pods": { n: "rocket", rate: 1.08, len: 0.6 } })[id]);
const MINIGUN_W = new Set(["gunship-door-minigun", "salvo-minigun"].map((id) => cd.weaponIds.indexOf(id)).filter((w) => w >= 0));
const isBeamW = (w) => WFAM[w] === "laser-cannon" || w === CONT_BEAM;
/** P1g: hitscan rifles whose path lingers as a faint line (RIFLE_TRAIL_S). */
const LINGER_W = new Set(["pilot-long-rifle", "anti-materiel-rifle", "marksman-rifle"].map((id) => cd.weaponIds.indexOf(id)).filter((w) => w >= 0));
const RIFLE_TRAIL_S = 0.35;
let muzzleGlows = [];
let rifleTrails = [];
let beams = [];
const PROD = cd.production;
const PILOT_HP = cd.tHp[PILOT_TYPE] * (cd.crew?.playerHpMul ?? 1) /* ruling 121 item 5: the own (player) pilot */, PILOT_SH = cd.tShield[PILOT_TYPE], PILOT_R = cd.tRadius[PILOT_TYPE];
const EJECT_HOLD_S = (data.constants.crew?.ejectHoldSeconds) ?? 0.5;
const ARMOUR = ["infantry", "bike", "light", "medium", "heavy", "air", "structure"];
/** Head height of the pilot's eye above its feet (m): standing, crouched. Presentation, not a sim value. */
const EYE_STAND = 1.62, EYE_CROUCH = 1.0;
const crewable = (t) => cd.tDriverSeat[t] >= 0 && !cd.tStructure[t];
/** B1 (ruling 99): a bunker (buildings.json mounts): a friendly player pilot climbs in and fires its mounts (one seat per mount). */
const isBunker = (t) => cd.tBunker[t] === 1;
/** B1: mounts fitted on a bunker at its point's level (snapshot v24 crew bits 8-11; bits 0-7: occupied mounts). */
const bunkerFitted = (crew) => (crew >> 8) & 15;
/** B1: the weapon of mount m of bunker type t. */
const bunkerWeapon = (t, m) => cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
/** B1 presentation counters (logic tests). */
const b1Stats = { gunsDrawn: 0, bunkerCam: false, mount: -1, mounts: 0, prompt: "" };
const SEAT_ROLE_NAME = ["driver", "gunner", "passenger"];
// C2: strategic points of the scenario's map (none on the range or showcase); capture ring and terminal reach from data
const PT_RULES = data.points?.capture ?? {};
const RING_R = PT_RULES.ringRadius ?? 40, REACH_M = PT_RULES.terminalReachMetres ?? 3;
let ptStatics = (0, c2_ts_1.pointStatics)((0, scenario_ts_1.mapFor)(config.scenario, config.units, config.battle), RING_R);
let ptModels = [], ptLinks = [], hackUi = null;
const T_CORE = cd.typeIds.indexOf("command-core");
const HV_CARGO = unitDef("harvester")?.cargoCapacity?.ore ?? 100;
// q1: dock queue drawing (docks per drop-off type; reach and queue gap from constants.economy.mining)
const MINING_C = (data.constants.economy?.mining ?? {});
const DOCKS_BY_TYPE = new Map();
for (const b of data.buildings)
    if (b.effects?.oreDropOff || b.effects?.podOre)
        DOCKS_BY_TYPE.set(cd.typeIds.indexOf(b.id), b.effects.docks ?? null);
let scenMap = (0, scenario_ts_1.mapFor)(config.scenario, config.units, config.battle);
let depModels = [], hvModels = [];
const groups = new c2_ts_1.ControlGroups();
let formation = "line";
const callouts = new Map();
let ackCount = 0, lastBlipAt = -1e9, lastAck = "";
const T_HARVESTER = cd.typeIds.indexOf("harvester");
const isEconomy = (t) => c3_ts_1.ECONOMY_TYPES.includes(cd.typeIds[t]);
let lastGroupAction = "";
// ------------------------------------------------------------------ WebGL2
const canvas = $("view");
const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
if (!gl) {
    $("nogl").style.display = "flex";
    $("start").style.display = "none";
    throw new Error("WebGL2 is not available in this browser");
}
const glInfo = (() => {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return { version: gl.getParameter(gl.VERSION), renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) };
})();
// C6 item 5b: the sky per planet (planets.json look), kept as the base the weather tints from. G1 area 4: each planet's
// own light, haze, mountains, clouds and moon, in the concept's style (Halcyon is the concept itself: render.ts)
{
    const sky = {
        rust: { horizon: [0.9, 0.68, 0.55], zenith: [0.56, 0.38, 0.36], sunHaze: [1, 0.8, 0.6], skyAmb: [0.55, 0.43, 0.4], groundAmb: [0.36, 0.25, 0.18], sunCol: [1.22, 0.98, 0.72],
            mount: [0.46, 0.26, 0.19], mountP: [0, 0.075, 3], moonCol: [0.86, 0.8, 0.74], moonP: [0.045, 0, 0], cloud: [0.92, 0.76, 0.64], cloudP: [0.25, 0.12, 0] },
        pale: { horizon: [0.34, 0.35, 0.39], zenith: [0.02, 0.02, 0.04], sunHaze: [0.9, 0.9, 0.95], skyAmb: [0.24, 0.26, 0.32], groundAmb: [0.16, 0.16, 0.18], sunCol: [1.42, 1.4, 1.34],
            mount: [0.42, 0.43, 0.46], mountP: [0, 0.05, 5], moonDir: [0.4, 0.32, 0.86], moonCol: [0.45, 0.66, 0.9], moonP: [0.16, 1, 1], cloud: [0, 0, 0], cloudP: [0, 0.1, 0] },
        brume: { horizon: [0.52, 0.66, 0.63], zenith: [0.27, 0.43, 0.44], sunHaze: [0.78, 0.88, 0.8], skyAmb: [0.36, 0.5, 0.5], groundAmb: [0.2, 0.26, 0.24], sunCol: [0.98, 1.0, 0.9],
            mount: [0.2, 0.3, 0.31], mountP: [0.3, 0.055, 7], moonCol: [0.75, 0.86, 0.8], moonP: [0.07, 0, 0], cloud: [0.66, 0.76, 0.73], cloudP: [0.38, 0.14, 0] },
        cinder: { horizon: [0.48, 0.3, 0.22], zenith: [0.13, 0.09, 0.09], sunHaze: [1, 0.52, 0.24], skyAmb: [0.4, 0.29, 0.25], groundAmb: [0.36, 0.2, 0.12], sunCol: [1.16, 0.82, 0.58],
            mount: [0.13, 0.11, 0.11], mountP: [0, 0.085, 9], moonCol: [0.95, 0.45, 0.25], moonP: [0.06, 0, 0.3], cloud: [0.3, 0.25, 0.23], cloudP: [0.5, 0.14, 0] },
    };
    for (const [k, v] of Object.entries(sky[PLANET] ?? {}))
        render_ts_1.HALCYON[k].splice(0, 3, ...v);
}
const LOOK_BASE = JSON.parse(JSON.stringify(render_ts_1.HALCYON));
const R = new render_ts_1.Renderer(gl, render_ts_1.HALCYON);
const MESH = new Map();
// G2: the detailed mesh near the camera, the base mesh beyond lodDist (and in the tactical display); outlines from the base
const LOD_KIND = new Map();
for (const k of meshes_ts_1.KINDS) {
    const m = (0, meshes_ts_1.buildKind)(k), lo = (0, meshes_ts_1.buildKind)(k, true);
    MESH.set(k, m);
    R.addKind(k, m, true, lo); // with outlines for the command view
    if (lo.count < m.count) {
        R.addKind(`${k}~lo`, lo, true);
        LOD_KIND.set(k, `${k}~lo`);
    }
}
const lodScratch = { hi: new Float32Array(render_ts_1.INST_FLOATS * 64), lo: new Float32Array(render_ts_1.INST_FLOATS * 64) };
const lodStats = { hi: 0, lo: 0 };
/** Draws a kind's instances: detailed within the distance at which its detail still covers pixels, the base mesh beyond. */
function drawKindLod(k, a, n, edges) {
    const lk = LOD_KIND.get(k);
    if (!lk) {
        R.drawKind(k, a, n);
        return;
    }
    if (edges) {
        R.drawKind(lk, a, n);
        lodStats.lo += n;
        return;
    } // tactical display: the base mesh under its own outlines
    if (n === 0)
        return;
    if (lodScratch.hi.length < n * render_ts_1.INST_FLOATS) {
        lodScratch.hi = new Float32Array(n * render_ts_1.INST_FLOATS * 2);
        lodScratch.lo = new Float32Array(n * render_ts_1.INST_FLOATS * 2);
    }
    const lim = (Math.max(2, R.kindSize(k)) * R.focalPx) / LOD_PX;
    let nh = 0, nl = 0;
    for (let i = 0; i < n; i++) {
        const o = i * render_ts_1.INST_FLOATS, d = Math.hypot(a[o] - eye[0], a[o + 1] - eye[1], a[o + 2] - eye[2]);
        if (d < lim * a[o + 7])
            lodScratch.hi.set(a.subarray(o, o + render_ts_1.INST_FLOATS), nh++ * render_ts_1.INST_FLOATS);
        else
            lodScratch.lo.set(a.subarray(o, o + render_ts_1.INST_FLOATS), nl++ * render_ts_1.INST_FLOATS);
    }
    R.drawKind(k, lodScratch.hi, nh);
    R.drawKind(lk, lodScratch.lo, nl);
    lodStats.hi += nh;
    lodStats.lo += nl;
}
/** G2: a kind shows its detail while its footprint is wider than this many drawing-buffer pixels. */
const LOD_PX = 36;
const PROP_KINDS = ["rock", "tree", "stump", "broadleaf", "bush", "tuft", "pebble", "spire", "debris"];
// G1 area 3: props per planet (palette and shapes), base dressing round structures
R.addKind("rock", (0, meshes_ts_1.rockMesh)(PLANET));
R.addKind("tree", (0, meshes_ts_1.treeMesh)(PLANET));
R.addKind("stump", (0, meshes_ts_1.stumpMesh)(PLANET));
R.addKind("spire", (0, meshes_ts_1.spireMesh)(PLANET));
R.addKind("broadleaf", (0, meshes_ts_1.broadleafMesh)(PLANET));
R.addKind("bush", (0, meshes_ts_1.bushMesh)(PLANET));
R.addKind("tuft", (0, meshes_ts_1.grassTuftMesh)(PLANET));
R.addKind("pebble", (0, meshes_ts_1.pebbleMesh)(PLANET));
for (const k of ["crates", "sandbags", "lamp", "debris"])
    R.addKind(k, (0, meshes_ts_1.dressingMesh)(k));
R.addKind("ore", (0, meshes_ts_1.oreMesh)(), true);
R.addKind("ore-spent", (0, meshes_ts_1.oreMesh)(true), true);
R.addKind("geyser", (0, meshes_ts_1.geyserMesh)(), true); // G1: resource fields
const VM_MESH = (0, meshes_ts_1.viewModelMeshes)();
for (const [k, m] of Object.entries(VM_MESH))
    R.addKind(k, m);
R.setRingMesh((0, meshes_ts_1.ringMesh)());
R.setPuffMesh((0, meshes_ts_1.puffMesh)());
R.setShieldMesh((0, meshes_ts_1.shieldMesh)());
/** Aircraft are drawn with their body centred on the sim's hit-sphere centre (y + radius), where the sim launches their shots and takes their hits (slice-2 report, item 3). */
const drawLift = cd.typeIds.map((_, t) => (cd.tAir[t] ? cd.tRadius[t] - MESH.get(kindOfType[t]).midY : 0));
// terrain colours: olive and ochre ground, slate on slopes, worn mud along the battle axis, scorch patches
// C6 item 5b: ground colours per planet (Halcyon unchanged) and the scenario's terrain layer (W2d) tinted in
const PAL = (0, c6_ts_5.planetPalette)(PLANET);
const OLIVE = PAL.olive, OCHRE = PAL.ochre, DKGREEN = PAL.dark, MUD = PAL.mud, SLATE = PAL.slate, SCORCH = [0.17, 0.16, 0.14];
const TLAYER = GEO === "sym" ? (0, c6_ts_5.terrainLayerOf)((0, battles_ts_1.battleOf)(URL_CONFIG.battle).scenario, (0, battles_ts_1.battleOf)(URL_CONFIG.battle).map) : null;
const TRACKS = (0, g1_terrain_ts_1.trackSegments)(scenMap?.points); // G1: worn tracks along the supply links
function terrainColour(x, z, h, ny, out, detail = 1) {
    const n1 = (0, terrain_gen_ts_1.valueNoise)(x / 260, z / 260, 11), n2 = (0, terrain_gen_ts_1.valueNoise)(x / 85, z / 85, 12), n3 = (0, terrain_gen_ts_1.valueNoise)(x / 24, z / 24, 13);
    const c = OLIVE.slice();
    const mix = (b, t) => { for (let i = 0; i < 3; i++)
        c[i] += (b[i] - c[i]) * (0, math_ts_1.clamp)(t, 0, 1); };
    mix(OCHRE, (0, math_ts_1.smoothstep)((n1 - 0.5) / 0.35) * 0.5 + (RELIEF_DEF ? 0 : Math.max(0, (h - 45) / 70)));
    mix(DKGREEN, (0, math_ts_1.smoothstep)((n2 - 0.5) / 0.35) * 0.38);
    mix(DKGREEN, (0.5 + 0.5 * Math.sin(x * 0.012 + z * 0.008) * Math.cos(z * 0.013 - x * 0.005)) * 0.35); // G1: the concept's soft banding
    const axis = Math.abs(z - BASE.z + 60 * Math.sin(x / 210)) / 70;
    if (!RELIEF_DEF && axis < 1 && x > BASE.x + 50 && x < ENEMY_BASE.x - 60)
        mix(MUD, (1 - axis) * 0.55 * (0.6 + 0.4 * n3)); // T1: the links' tracks only on relief
    const nearBase = Math.min(Math.hypot(x - BASE.x, z - BASE.z) / 170, Math.hypot(x - ENEMY_BASE.x, z - ENEMY_BASE.z) / 150);
    if (nearBase < 1)
        mix(MUD, (1 - nearBase) * 0.22);
    // G1: packed apron round each core (the concept's light base ground) and worn tracks along the supply links
    const apron = Math.min(Math.hypot(x - BASE.x, z - BASE.z), Math.hypot(x - ENEMY_BASE.x, z - ENEMY_BASE.z)) / (42 + 18 * n3);
    if (apron < 1)
        mix([0.5, 0.47, 0.39].map((v, i) => v * 0.5 + MUD[i] * 0.6), (1 - apron * apron) * 0.8);
    if (detail > 0 && TRACKS.length) {
        const tw = (0, g1_terrain_ts_1.trackWeight)(TRACKS, x, z, n3 - 0.5);
        if (tw > 0)
            mix([MUD[0] * 1.18, MUD[1] * 1.08, MUD[2] * 0.98], tw * (0.55 + 0.25 * n3));
    }
    const sc = (0, terrain_gen_ts_1.valueNoise)(x / 38, z / 38, 21);
    if (detail > 0 && sc > 0.86 && x > BASE.x + 200 && x < ENEMY_BASE.x - 100)
        mix(SCORCH, (sc - 0.86) * 3);
    // G1: the layer's tint averaged over five noise-jittered spots: organic edges instead of its 50 m squares
    if (TLAYER) {
        const jx = ((0, terrain_gen_ts_1.valueNoise)(x / 60, z / 60, 51) - 0.5) * 70, jz = ((0, terrain_gen_ts_1.valueNoise)(x / 60, z / 60, 52) - 0.5) * 70, acc = [0, 0, 0];
        let k = 0, n = 0;
        for (const [ox, oz] of [[0, 0], [28, 10], [-14, 26], [10, -28], [-26, -12]]) {
            const t = (0, c6_ts_5.terrainTint)((0, c6_ts_5.layerTypeAt)(TLAYER, x + ox + jx, z + oz + jz), PLANET);
            if (t) {
                for (let i = 0; i < 3; i++)
                    acc[i] += t.c[i] * t.k;
                k += t.k;
                n++;
            }
        }
        if (n > 0) {
            const cov = n / 5, sm = cov <= 0.3 ? 0 : cov >= 0.7 ? 1 : (cov - 0.3) / 0.4;
            mix([acc[0] / k, acc[1] / k, acc[2] / k], sm * (k / n));
        }
    }
    (0, g1_fields_ts_1.fieldTint)(x, z, scenMap?.deposits ?? [], scenMap?.geysers ?? [], c); // G1: ground under the ore and gas fields
    if (RELIEF_DEF)
        (0, t1_relief_ts_1.reliefTint)(PLANET, RELIEF_DEF, h, ny, n2, c); // T1: rock walls, strata, snow, ash
    else
        mix(SLATE, (0.97 - ny) * 9);
    const hj = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1; // G1: per-vertex step: each triangle its own shade (flat colour)
    const grit = 1 + detail * (0.12 * (0, terrain_gen_ts_1.valueNoise)(x / 9, z / 9, 31) - 0.06 + (hj - 0.5) * 0.07);
    out[0] = c[0] * grit;
    out[1] = c[1] * grit;
    out[2] = c[2] * grit;
    if (TLAYER)
        (0, g1_terrain_ts_1.layerFx)(TLAYER, c6_ts_5.layerTypeAt, x, z, (0, terrain_gen_ts_1.valueNoise)(x / 60, z / 60, 51) - 0.5, (0, terrain_gen_ts_1.valueNoise)(x / 60, z / 60, 52) - 0.5, out); // G1: lava / liquid / ice
}
R.setTerrain(hm, terrainColour);
R.mapSize = MAP_SIZE;
if (RELIEF)
    R.contour = 2.5; // T1: tactical contours every 5 m / 25 m on the mountains
R.setOuterTerrain(MAP_SIZE, 2600, 50, RELIEF ? (x, z) => RELIEF.height(x, z) : (x, z) => (0, terrain_gen_ts_1.rawHeight)(x, z, MAP_SIZE, SEED, SHAPE) - hmGen.offset, (x, z, h, ny, out) => terrainColour(x, z, h, ny, out, 0));
// ------------------------------------------------------------------ decorative props (no collision: the sim does not know them)
/** Writes one unit / prop instance (INST_FLOATS layout). */
function putInst(a, o, x, y, z, yaw, tur, team, phase, scale, walk = 0, walkAmp = 0, recoil = 0) {
    a[o] = x;
    a[o + 1] = y;
    a[o + 2] = z;
    a[o + 3] = yaw;
    a[o + 4] = tur;
    a[o + 5] = team;
    a[o + 6] = phase;
    a[o + 7] = scale;
    a[o + 8] = walk;
    a[o + 9] = walkAmp;
    a[o + 10] = recoil;
    a[o + 11] = 0;
}
const TUFT_CELL = 100, TUFT_RADIUS = 260;
/**
 * Placed once from the map seed (deterministic), kept off the bases, the friendly line and the open battle valley
 * (trees and bushes on the flanks only; tufts and pebbles are ankle-high and go everywhere but the bases).
 * Tufts and pebbles are bucketed in 100 m cells and only the cells near the camera are drawn.
 */
let forestProps = 0;
function scatterProps() {
    let s = (SEED * 2654435761) >>> 0;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const L = { rock: [], tree: [], stump: [], broadleaf: [], bush: [], spire: [], debris: [] };
    const push = (k, x, y, z, yaw, scale, tilt = 0) => { const a = L[k], o = a.length; a.length += render_ts_1.INST_FLOATS; a.fill(0, o); a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = yaw; a[o + 4] = tilt; a[o + 7] = scale; };
    const wet = (x, z) => { const t = (0, c6_ts_5.layerTypeAt)(TLAYER, x, z); return t === "lava" || t === "liquid"; }; // G1: nothing stands in lava or a lake
    const clear0 = (x, z, m = 1) => Math.hypot(x - BASE.x, z - BASE.z) > 110 * m && Math.hypot(x - ENEMY_BASE.x, z - ENEMY_BASE.z) > 110 * m && Math.hypot(x - FRONT.x, z - FRONT.z) > 90 * m;
    const clear = (x, z, m = 1) => clear0(x, z, m) && !wet(x, z);
    for (let i = 0; i < 1400; i++) {
        const x = rnd() * MAP_SIZE, z = rnd() * MAP_SIZE;
        if (!clear(x, z))
            continue;
        const sc = 0.4 + rnd() * rnd() * 3.0;
        push("rock", x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) - 0.2 * sc, z, rnd() * 6.28, sc, rnd() * 6.28);
    }
    // C6 item 5b: the terrain layer's rock forest / ruins: trees (Halcyon) or rock stacks (elsewhere) in every such cell
    if (TLAYER)
        for (let j = 0; j < TLAYER.rows.length; j++)
            for (let i = 0; i < TLAYER.rows[j].length; i++) {
                const cm = TLAYER.cellMetres;
                if ((0, c6_ts_5.layerTypeAt)(TLAYER, (i + 0.5) * cm, (j + 0.5) * cm) !== "rock-forest-ruins")
                    continue;
                for (let n = 0; n < 4; n++) {
                    const x = (i + rnd()) * cm, z = (j + rnd()) * cm, y = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
                    if (!clear(x, z, 0.6))
                        continue;
                    if (PLANET === "halcyon")
                        push(rnd() < 0.7 ? "tree" : "broadleaf", x, y, z, rnd() * 6.28, 0.9 + rnd() * 0.6);
                    else if (rnd() < 0.6)
                        push("spire", x, y - 0.3, z, rnd() * 6.28, 0.8 + rnd() * 0.9); // G1: the planet's rock stacks
                    else
                        push("rock", x, y - 0.3, z, rnd() * 6.28, 1.6 + rnd() * 2.2, rnd() * 6.28);
                    forestProps++;
                }
            }
    for (let i = 0; i < 1100; i++) {
        const x = rnd() * MAP_SIZE, z = rnd() * MAP_SIZE;
        if (PLANET !== "halcyon")
            break; // no trees off Halcyon
        const flank = Math.abs(z - BASE.z) / 1000;
        if (!clear(x, z) || rnd() > flank * 1.4 - 0.15 || (0, terrain_gen_ts_1.valueNoise)(x / 150, z / 150, 5) < 0.45)
            continue;
        const y = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), sc = 0.8 + rnd() * 0.7, r = rnd();
        if (x > 800 && x < 1100 && r < 0.45)
            push("stump", x, y, z, rnd() * 6.28, sc);
        else if (r < 0.72)
            push("tree", x, y, z, rnd() * 6.28, sc);
        else
            push("broadleaf", x, y, z, rnd() * 6.28, sc * 0.95);
    }
    for (let i = 0; i < 900; i++) {
        const x = rnd() * MAP_SIZE, z = rnd() * MAP_SIZE;
        if (!clear(x, z) || Math.abs(z - BASE.z) < 120 * rnd() + 60)
            continue; // the battle valley stays open
        push("bush", x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) - 0.1, z, rnd() * 6.28, 0.6 + rnd() * 0.9);
    }
    // G1: more rocks and bushes round the bases (the concept's foreground), 70-450 m out
    for (const B0 of [BASE, ENEMY_BASE])
        for (let i = 0; i < 260; i++) {
            const a = rnd() * 6.283, d = 70 + rnd() * rnd() * 380, x = B0.x + Math.cos(a) * d, z = B0.z + Math.sin(a) * d;
            if (!clear(x, z, 0.6) || x < 0 || z < 0 || x > MAP_SIZE || z > MAP_SIZE)
                continue;
            const sc = 0.3 + rnd() * rnd() * 2.2;
            if (rnd() < 0.6)
                push("rock", x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) - 0.2 * sc, z, rnd() * 6.28, sc, rnd() * 6.28);
            else
                push("bush", x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) - 0.1, z, rnd() * 6.28, 0.6 + rnd() * 0.9);
        }
    // G1: battle debris in the valley between the bases (wreckage plates, scrap, a scorched boulder)
    for (let i = 0; i < 260; i++) {
        const x = BASE.x + 150 + rnd() * (ENEMY_BASE.x - BASE.x - 300), z = BASE.z + (rnd() - 0.5) * 520;
        if (!clear(x, z, 0.6))
            continue;
        push("debris", x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) - 0.1, z, rnd() * 6.28, 0.7 + rnd() * 0.8);
    }
    const cells = new Map();
    const nc = Math.ceil(MAP_SIZE / TUFT_CELL);
    for (let i = 0; i < 26000; i++) {
        const x = rnd() * MAP_SIZE, z = rnd() * MAP_SIZE;
        if (!clear(x, z, 0.4))
            continue;
        const dry = (0, terrain_gen_ts_1.valueNoise)(x / 90, z / 90, 44);
        const k = Math.floor(x / TUFT_CELL) + Math.floor(z / TUFT_CELL) * nc;
        let c = cells.get(k);
        if (!c) {
            c = { tuft: [], pebble: [] };
            cells.set(k, c);
        }
        const y = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
        if (rnd() < 0.82) {
            if (rnd() < 0.35 + dry * 0.6)
                c.tuft.push(x, y - 0.05, z, rnd() * 6.28, 0.7 + rnd() * 0.8);
        }
        else
            c.pebble.push(x, y - 0.05, z, rnd() * 6.28, 0.15 + rnd() * rnd() * 0.5);
    }
    const big = {};
    for (const k of Object.keys(L))
        big[k] = new Float32Array(L[k]);
    return { big, cells };
}
const props = scatterProps();
let tuftBuf = new Float32Array(render_ts_1.INST_FLOATS * 1024), pebbleBuf = new Float32Array(render_ts_1.INST_FLOATS * 256);
let tuftN = 0, pebbleN = 0;
/** Rocks and bushes are drawn within these distances of the camera (the haze hides them beyond); trees always. */
const PROP_RADIUS = { rock: 850, bush: 600, debris: 500 };
const nearBuf = { rock: { a: new Float32Array(render_ts_1.INST_FLOATS * 512), n: 0 }, bush: { a: new Float32Array(render_ts_1.INST_FLOATS * 256), n: 0 }, debris: { a: new Float32Array(render_ts_1.INST_FLOATS * 128), n: 0 } };
function gatherNearProps() {
    for (const k of Object.keys(nearBuf)) {
        const src = props.big[k], nb = nearBuf[k], r2 = PROP_RADIUS[k] ** 2;
        nb.n = 0;
        for (let o = 0; o < src.length; o += render_ts_1.INST_FLOATS) {
            const dx = src[o] - eye[0], dz = src[o + 2] - eye[2];
            if (dx * dx + dz * dz > r2)
                continue;
            nb.a = grow(nb.a, (nb.n + 1) * render_ts_1.INST_FLOATS);
            nb.a.set(src.subarray(o, o + render_ts_1.INST_FLOATS), nb.n++ * render_ts_1.INST_FLOATS);
        }
    }
    tuftN = 0;
    pebbleN = 0;
    const nc = Math.ceil(MAP_SIZE / TUFT_CELL), cx = eye[0], cz = eye[2], r2 = TUFT_RADIUS * TUFT_RADIUS;
    const i0 = Math.max(0, Math.floor((cx - TUFT_RADIUS) / TUFT_CELL)), i1 = Math.min(nc - 1, Math.floor((cx + TUFT_RADIUS) / TUFT_CELL));
    const j0 = Math.max(0, Math.floor((cz - TUFT_RADIUS) / TUFT_CELL)), j1 = Math.min(nc - 1, Math.floor((cz + TUFT_RADIUS) / TUFT_CELL));
    for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
            const c = props.cells.get(i + j * nc);
            if (!c)
                continue;
            for (let k = 0; k < c.tuft.length; k += 5) {
                const dx = c.tuft[k] - cx, dz = c.tuft[k + 2] - cz;
                if (dx * dx + dz * dz > r2)
                    continue;
                tuftBuf = grow(tuftBuf, (tuftN + 1) * render_ts_1.INST_FLOATS);
                putInst(tuftBuf, tuftN++ * render_ts_1.INST_FLOATS, c.tuft[k], c.tuft[k + 1], c.tuft[k + 2], c.tuft[k + 3], c.tuft[k + 3], 0, 0, c.tuft[k + 4]);
            }
            for (let k = 0; k < c.pebble.length; k += 5) {
                const dx = c.pebble[k] - cx, dz = c.pebble[k + 2] - cz;
                if (dx * dx + dz * dz > r2)
                    continue;
                pebbleBuf = grow(pebbleBuf, (pebbleN + 1) * render_ts_1.INST_FLOATS);
                putInst(pebbleBuf, pebbleN++ * render_ts_1.INST_FLOATS, c.pebble[k], c.pebble[k + 1], c.pebble[k + 2], c.pebble[k + 3], c.pebble[k + 3], 0, 0, c.pebble[k + 4]);
            }
        }
}
// ------------------------------------------------------------------ worker
function makeWorker() {
    const src = `${G.__IRONFALL_LOADER}\nvar __IRONFALL_SRC = ${JSON.stringify(G.__IRONFALL_SRC)};\n__ironfallRequire(__IRONFALL_SRC, "packages/client/src/worker.js");\n`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const w = new Worker(url, { name: "ironfall-sim" });
    w.onerror = (e) => fail(`worker error: ${e.message}`);
    return w;
}
/** The page's sim connection: the local sim worker (single player, host), or N1's RemotePort (guest). */
let worker = makeWorker();
const send = (m, transfer) => worker.postMessage(m, transfer ?? []);
/** N1: replace the sim connection (guest join, handover); the snapshot decoder and the page state are kept. */
function swapPort(p) { try {
    worker.terminate?.();
}
catch { /* gone */ } worker = p; worker.onmessage = onWorkerMsg; }
function sendInit() {
    const heights = new Float64Array(hm.heights);
    runningDifficulty = difficulty;
    structMem.clear();
    // C4: the enemy's defences (Gun Towers, ...) are not part of the known layout: they show once seen
    if ((0, scenario_ts_1.isSkirmish)(config.scenario, config.units))
        structMem.seed((0, battles_ts_1.battleOf)(config.battle).scenario.spawns.filter((sp) => sp.team !== 0 && cd.typeIds.includes(sp.type) && cd.tStructure[cd.typeIds.indexOf(sp.type)] && !DEFENCE.has(sp.type)).map((sp) => ({ type: cd.typeIds.indexOf(sp.type), team: sp.team, x: sp.x, z: sp.z, yaw: Math.PI })));
    send({ t: "init", data, planetId: PLANET, mapSize: MAP_SIZE, seed: simSeed, heightmap: { cellSize: hm.cellSize, cols: hm.cols, rows: hm.rows, heights }, units: config.units, capped: CAPPED, scenario: config.scenario, showcaseFire: config.showcaseFire, difficulty, battle: config.battle, kit: isFrontline() ? flKit : null }, [heights.buffer]);
    flApplyNames(); // Frontline: keys 1 and 2 show the kit's weapons
    progression_ui_ts_1.c7a.beginMatch(); // C7a hook
    d1_cheats_ts_1.d1.newMatch(); // D1 hook
}
// ------------------------------------------------------------------ sound
const snd = new audio_ts_1.Sound();
// C11 state (declared early: resets run before the C11 section at the end of the file)
const c11Stats = {};
const c11SndAt = {};
const CREW_WAITING_BIT = 0x1000;
const c11Waiting = new Map(); // C11: vehicles waiting for pilots (CREW_WAITING) -> their seat bits
let c11AshWarnUntil = 0, c11AshWarnAircraft = 0, c11WasDowned = false, c11HelpWas = false;
const c11PtMem = new c11_ts_1.PointMemory();
// ------------------------------------------------------------------ snapshot state (reset when the scenario changes)
let decoder = new netsnap_ts_1.SnapshotDecoder(MAP_SIZE);
const views = [];
/** m1: per-entity motion tracks (smooth.ts): entities are drawn from the snapshots in which they changed, each late by its own update gap. */
const motion = new smooth_ts_1.Tracks(), motionOut = new Float64Array(6);
let motionSmooth = true;
let lastTick = 0, lastArrive = 0, gotFirst = false, ready = false, started = false;
let pilotId = 0;
/** The player's pilot (snapshot PILOT block), the team stockpile and the host sidecar. */
let me = null;
let teamRes = null;
let host = { pilotId: 0, shots: 0, controlled: false, epoch: 0 };
/** Snapshot stream bookkeeping (protocol v4): acks sent, epochs seen, undecodable / stale snapshots. */
const stream = { acks: 0, epochs: new Set(), nulls: 0, lastSeq: 0, lastEpoch: 0, eventsSeen: new Set(), dupEvents: 0 };
let perf = { tickMsMean: 0, tickMsMax: 0, ticksPerSec: 0, snapBytesPerSec: 0, entities: 0, projectiles: 0 };
let wave = 0, secondsToWave = 60;
const aim = new Map(); // id -> target turret yaw
const turret = new Map(); // id -> displayed turret yaw
/** F1: enemy structure turrets that spotted / locked on (servo whine, lock tone, laser-dot line). */
const turretCues = new turret_cue_ts_1.TurretCues();
let fx = new fx_ts_1.Fx();
let playerShotsSeen = 0, projectilesSeen = 0, deathsSeen = 0;
const seenProj = new Map();
let tracers = [];
/**
 * Projectiles seen in a snapshot but not drawn yet, with the newest snapshot tick that held them. A fast round fired
 * at close range (a Dart's gun at 35 m: 700 m/s, one tick of flight) is gone from the snapshot the page interpolates
 * toward before the render time reaches its launch, so it was never drawn: no muzzle flash, no fire sound, no bolt.
 * Such a round is drawn as a short bolt from its muzzle to where it was one tick later (its end, a hit or the ground).
 */
const pendingProj = new Map();
let shortFlights = 0;
/** Where impact effects were drawn (tests: none at the shooter itself). */
const impactLog = [];
/**
 * Where a round flying from a to b (one tick of flight) ends: the first point (12 steps) under the ground or inside a
 * drawn body other than its shooter's; else b. ground: it ended on the terrain.
 */
function pathEnd(a, b, shooter) {
    for (let i = 1; i <= 12; i++) {
        const t = i / 12, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
        if (y <= (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.05)
            return { p: [x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.2, z], ground: true };
        for (const e of rendered)
            if (e.id !== shooter && Math.hypot(e.x - x, e.cy - y, e.z - z) < cd.tRadius[e.type])
                return { p: [x, y, z], ground: false };
    }
    return { p: b, ground: b[1] <= (0, terrain_gen_ts_1.sampleHeight)(hm, b[0], b[2]) + 0.4 };
}
const tracks = new Map();
/** Ruling 112: per hover vehicle, its lean and landing settle (tilt.ts); ownTilt: the player's own vehicle this frame. */
const tilts = new Map();
let ownTilt = null, rtClockFrame = 0;
const tiltStats = { drawn: 0 };
/** W1: per walker (the Strider), its gait (w1-walker.ts); drawn walkers, legs and footfalls (debug / tests). */
const gaits = new Map();
const walkerStats = { drawn: 0, legs: 0, footfalls: 0, footSounds: 0, own: null };
/** W1: lean of a walker's hull from acceleration (tilt.ts weight; the gait adds its own sway). */
const WALK_LEAN = 0.25;
const walkGround = (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
const recentImpacts = [];
const pending = new Map();
let reqSeq = 1;
function request(m) { return new Promise((res) => { pending.set(m.reqId, res); send(m); }); }
let readyWaiters = [];
const combat = { hitMarkers: 0, kills: 0, pilotKills: 0, lastHits: [], shieldFlashes: 0, shieldDowns: 0, playerShieldFlashes: 0, barsShown: 0, maxBars: 0 };
let hitMarkUntil = 0, hitMarkKill = false, hitMarkPilot = false, hitMarkRider = false, riderMsgUntil = 0;
let hitStreak = 0, lastHitAt = -1e9, hitMarkStream = false, hitMarkStreamFrames = 0;
/** Test aid: stretches the hit-marker and shield-flash durations so headless screenshots (2-5 fps) can catch them. */
let feedbackScale = 1;
let playerShieldFlashUntil = 0;
let originLog = [];
/** Events seen (debug hook counters) and the event-driven HUD state. */
const evCount = {};
const evLog = [];
/** Pending tick-stamped actions: seq -> what it was (a REJECT event with that seq names the reason). */
const pendingActs = new Map();
const actReplies = new Map();
/** AI pilots that climbed out for the player, tracked on their walk home: entity id -> since, vehicle type. */
const walkers = new Map();
/** Units produced recently (a tag over them): entity id -> time. */
const fresh = new Map();
/** The ride the player called (ruling 19). */
let ride = null;
let lastUnderAttack = 0;
let lastFeedMsg = "";
// C3 item 3: match over (the snapshot's match block, s7) and the player's numbers for the end screen
const matchWatch = new c3_ts_1.MatchWatch();
let matchEnd = null;
const c3Stats = { unitsBuilt: 0, unitsLost: 0, enemyLost: 0, peakPoints: 0 };
let matchesPlayed = 0;
// designer playtest (visibility at range): enemy positions last seen, remembered enemy structures, far markers
const lastSeen = new Map();
const structMem = new c3_ts_1.StructureMemory();
let farMarkers = 0, ghostsDrawn = 0, lastDmgSource = "";
/** Designer playtest 15 Nov 21:21 (kill cam): the last thing that hit the player's pilot / vehicle, for a short zoom on it after death. */
let lastAttacker = null, killCam = null, killCamFov = 0;
const KILLCAM_MS = 2600;
// C3 item 4: threat awareness
const threats = new c3_ts_1.ThreatWatch(0);
const threatLog = [];
let threatAlarms = 0, ownCoreHealth = -1, enemyCoreMarks = { cmd: 0, fp: 0 };
function raiseThreat(t) {
    if (!t)
        return;
    notify(`⚠ ${t.text}`, t.kind);
    threatLog.push(t.text);
    if (threatLog.length > 40)
        threatLog.shift();
    if (t.alarm && !matchWatch.over) {
        snd.sting("threat");
        threatAlarms++;
    }
}
/** The match is over: input is released and the end screen is up (until Play again). */
const matchLocked = () => matchWatch.over;
function resetClientState() {
    c6Reset();
    c11Reset();
    lastSeen.clear();
    structMem.clear();
    threats.reset();
    threatLog.length = 0;
    threatAlarms = 0;
    ownCoreHealth = -1;
    matchWatch.reset();
    matchEnd = null;
    c3Stats.unitsBuilt = 0;
    c3Stats.unitsLost = 0;
    c3Stats.enemyLost = 0;
    c3Stats.peakPoints = 0;
    producedCount = 0;
    boardedOnce = false;
    ptModels = [];
    ptLinks = [];
    hackUi = null;
    depModels = [];
    hvModels = [];
    prodRefusal = null;
    orderMarker = null;
    wheel = { open: false, dx: 0, dy: 0, pick: -1 };
    decoder = new netsnap_ts_1.SnapshotDecoder(MAP_SIZE);
    views.length = 0;
    motion.clear();
    lastTick = 0;
    lastArrive = 0;
    gotFirst = false;
    me = null;
    teamRes = null;
    pilotId = 0;
    aim.clear();
    turret.clear();
    turretCues.clear();
    seenProj.clear();
    tracks.clear();
    tracers = [];
    recentImpacts.length = 0;
    stream.acks = 0;
    stream.epochs.clear();
    stream.nulls = 0;
    stream.eventsSeen.clear();
    stream.dupEvents = 0;
    dmgDirs.length = 0;
    gunnerMode = false;
    hijack = null;
    tracersFromSim = 0;
    tracerHits = 0;
    tracerMisses = 0;
    selected.clear();
    selBuilding = 0;
    groups.clear();
    callouts.clear();
    fx = new fx_ts_1.Fx();
    rendered = [];
    bodyRender = null;
    aimPick = null;
    deadSince = 0;
    playerShotsSeen = 0;
    projectilesSeen = 0;
    deathsSeen = 0;
    originLog = [];
    lastPilotShots = null;
    pilotShotKicks = 0;
    predictor?.reset();
    predAcc = 0;
    pods = [];
    cargo.clear();
    armedCmd = null;
    stl.clear();
    pulseRings = [];
    autoDefendOn = false;
    loDraft = null;
    domeFlashes = [];
    loOpen = false;
    loPending = null; // C7b, U1
    c9 = null;
    c9Garrisoned = new Map();
    c9ResHtml = ""; // C9
    pendingActs.clear();
    walkers.clear();
    fresh.clear();
    ride = null;
    feed.length = 0;
    seatKillPending = [];
    lastSeatKill = null;
    firedBy.clear();
    drawnBy.clear();
    projCounted.clear();
}
function onWorkerMsg(ev) {
    const m = ev.data;
    if (progression_ui_ts_1.c7a.workerMsg(m))
        return; // C7a hook
    switch (m.t) {
        case "gjoined":
        case "gsnap":
        case "gout":
        case "export":
            mp.fromWorker(m);
            break;
        case "ready":
            ready = true;
            pilotId = m.pilotId;
            for (const f of readyWaiters.splice(0))
                f();
            break;
        case "error":
            fail(`sim worker: ${m.message}`);
            break;
        case "snap":
            flGroundPods = m.fl ? m.fl.pods : [];
            if (m.fl && m.fl.locks.length > flLocksNow.length)
                snd.ui("confirm"); // a new missile lock: a tone
            flLocksNow = m.fl ? m.fl.locks : [];
            flSimPings = m.fl?.pings ?? [];
            flWaveNow = m.fl?.wave ?? null;
            flBotsNow = m.fl?.bots ?? [];
            flSquadNotice();
            flDownedEnts = new Set(flBotsNow.filter((q) => q[5] === "downed" && q[7]).map((q) => q[7])); // + downed human squadmates (flDownedFrame)
            onSnap(m);
            flDownedFrame(views[views.length - 1]);
            break;
        case "c9":
            c9OnSide(m, performance.now());
            break; // C9: the fix-qa2 host sidecar
        case "act": {
            const r = actReplies.get(m.reqId);
            if (r) {
                actReplies.delete(m.reqId);
                r(m.seq);
            }
            break;
        }
        case "query":
        case "routes":
        case "order":
        case "stats":
        case "debug": {
            const id = m.reqId;
            const r = pending.get(id);
            if (r) {
                pending.delete(id);
                r(m);
            }
            if (m.t === "order") {
                if (m.reqId === lastOrder.reqId)
                    lastOrder.reply = m;
                if (ride && m.reqId === ride.reqId) {
                    if (m.rejected.length) {
                        notify(`RIDE REFUSED · ${(0, c6_ts_1.reasonText)(m.rejected[0].reason)}`, "warn");
                        snd.ui("error");
                        ride = null;
                    }
                    else
                        ride.status = "inbound";
                }
                else if (m.rejected.length && m.reqId === lastOrder.reqId)
                    showOrderRefusal(m);
            }
            break;
        }
    }
}
worker.onmessage = onWorkerMsg;
progression_ui_ts_1.c7a.install({ data, slot: () => mp.mySlot, role: () => mp.role, send: (x) => worker.postMessage(x), names: () => Object.fromEntries(mp.roster.map((r) => [r.slot, r.name])) }); // C7a hook
progression_ui_ts_1.c7a.onFlChange(() => { try {
    flRenderPicker();
}
catch { /* before the picker exists */ } });
d1_cheats_ts_1.d1.install({ data, R: () => (progression_ui_ts_1.c7a.store ? progression_ui_ts_1.c7a.store.R : null), role: () => mp.role, inMatch: () => started && !matchEnd, store: () => progression_ui_ts_1.c7a.store, profileChanged: () => { progression_ui_ts_1.c7a.resend(); }, act: (a) => act(a, "test cheat"), notify: (t, k) => notify(t, k), unlockPointer: () => unlock() }); // D1 hook
/** C3: the match just ended. Input is released (control dropped, pointer unlocked, panels closed); the end screen is built on the next HUD frame, after this message's deaths are counted. */
function onMatchOver(m, now) {
    matchEnd = { m, pending: true, summary: null, at: now };
    progression_ui_ts_1.c7a.matchOver(); // C7a hook
    keys.clear();
    lmb = rmb = false;
    scoped = false;
    spaceDown = 0;
    drag = null;
    wheel = { open: false, dx: 0, dy: 0, pick: -1 };
    send({ t: "pctl", input: null });
    lastCtl = "null";
    closePanels();
    selected.clear();
    selBuilding = 0;
    helpOn = false;
    if (pauseOn) {
        pauseOn = false;
        $("pause").style.display = "none";
    }
    unlock();
    const win = m.winner === 0;
    snd.sting(m.winner < 0 ? "defeat" : win ? "victory" : "defeat");
    notify(m.winner < 0 ? "MATCH OVER · draw" : win ? "MATCH OVER · VICTORY" : "MATCH OVER · DEFEAT", win ? "good" : "bad");
}
/** C3: Play again: the same scenario with a new sim seed and the difficulty chosen now (the terrain stays). */
function restartMatch() {
    if (!started)
        return;
    if (mp.role === "guest") { // the host runs the battle: only the host starts a new one (21 Nov)
        notify("The host starts the next match.", "info");
        return;
    }
    snd.ui("click");
    $("matchOver").style.display = "none";
    if (mode !== "fp")
        setMode("fp");
    resetClientState();
    simSeed = (0, c3_ts_1.nextSeed)(simSeed);
    matchesPlayed++;
    started = false;
    ready = false;
    camYaw = 0;
    camPitch = -0.05;
    readyWaiters.push(() => {
        started = true;
        document.body.dataset.mode = mode;
        mp.rejoinAll(); // co-op: the guests join the new match (the new sim starts without them)
        send({ t: "pause", on: (document.hidden && !mp.shared()) });
        notify(`NEW MATCH · seed ${simSeed} · enemy commander: ${runningDifficulty.toUpperCase()}`, "info");
    });
    sendInit();
    lockPointer();
}
/** The end screen (built once per match, after the deaths of the final message are counted). */
function updateMatchOver() {
    const el = $("matchOver");
    if (!matchEnd || !started) {
        if (el.style.display !== "none")
            el.style.display = "none";
        return;
    }
    if (matchEnd.pending) {
        matchEnd.pending = false;
        const held = ptModels.filter((p) => p.owner === 0).length;
        matchEnd.summary = (0, c3_ts_1.matchSummary)(matchEnd.m, 0, 1 / dt, { ...c3Stats, pointsHeld: held, pointsTotal: ptStatics.length, peakPoints: Math.max(c3Stats.peakPoints, held), pilots: teamRes?.pilots ? { lost: teamRes.pilots.lost, total: teamRes.pilots.initial + teamRes.pilots.gained, alive: teamRes.pilots.available + teamRes.pilots.assigned + teamRes.pilots.onFoot } : undefined });
        const s = matchEnd.summary;
        el.className = `overlay ${s.result}`;
        const why = (0, c6_ts_1.matchReasonText)(matchEnd.m.reason, matchEnd.m.winner, 0, objDefs());
        $("moTitle").textContent = s.title;
        $("moCause").textContent = why && why !== s.cause && matchEnd.m.reason !== objectives_ts_1.MR_CORE ? `${why} · ${s.cause}` : s.cause; // C8 (QA4 bug 30): a Core kill is said once
        $("moStats").innerHTML = s.lines.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
        $("againSub").textContent = mp.role === "guest" ? "the host starts the next match" : `same scenario · new seed · enemy ${difficulty.toUpperCase()}`;
        $("againBtn").disabled = mp.role === "guest";
        el.style.display = "flex";
    }
}
/** Sends a crew / production action as the sim's tick-stamped input; `what` names it in a refusal message. */
function act(action, what, prod, build) {
    const reqId = reqSeq++;
    actReplies.set(reqId, (seq) => { pendingActs.set(seq, { what, at: performance.now(), prod, build }); });
    send({ t: "act", reqId, action });
}
function onSnap(m) {
    const now = performance.now();
    host = m.host;
    let ackSeq = -1, ackEpoch = 0;
    for (const b of m.snaps) {
        const v = decoder.apply(new Uint8Array(b));
        if (!v) {
            stream.nulls++;
            continue;
        }
        ackSeq = v.seq;
        ackEpoch = v.epoch;
        stream.epochs.add(v.epoch);
        c11StripWaiting(v); // C11: crew bit 12 (CREW_WAITING) off the seat bits, kept in c11Waiting
        const pv = views.length ? views[views.length - 1] : null;
        if (pv && v.tick > pv.tick)
            motion.base += (Math.min(4, v.tick - pv.tick) - motion.base) * 0.2; // the stream's snapshot spacing (1 host, 2 guest)
        views.push(v);
        if (views.length > 10)
            views.shift(); // ~0.5 s: walk speeds are measured over it (protocol v4 deadbands)
        for (const e of v.entities.values())
            motion.push(e.id, v.tick, e.x, e.z, e.heading, e.altitude, cd.tAir[e.type] ? NaN : e.vy * dt, cd.tHover[e.type] === 1); // j1: altitude + vertical speed (Hermite arcs)
        if ((v.tick & 63) === 0)
            motion.prune(v.tick);
        trackDamage(v, now);
        if (v.pilot) {
            applyPilot(v.pilot, now);
            station = stationOf(v.pilot);
            ownShotsFrame(v.pilot, now);
            predictSnap(v);
        }
        if (v.team)
            teamRes = v.team;
        if (matchWatch.update(v.match))
            onMatchOver(v.match, now);
        for (const e of v.entities.values())
            if (e.team !== 0)
                lastSeen.set(e.id, { x: e.x, z: e.z, t: now });
        visionSnap(v, now);
        structMem.see(v.entities.values(), (t) => cd.tStructure[t] === 1, 0);
        for (const e of v.entities.values())
            if (e.type === T_CORE && e.team === 0) {
                const hpNow = e.hp + e.shield;
                if (ownCoreHealth >= 0)
                    raiseThreat(threats.coreDamage(ownCoreHealth, hpNow, now));
                ownCoreHealth = hpNow;
                break;
            }
        for (const e of v.events) {
            if (stream.eventsSeen.has(e.serial))
                stream.dupEvents++;
            stream.eventsSeen.add(e.serial);
            onEvent(e, v, now);
        }
        progression_ui_ts_1.c7a.events(v.events); // C7a hook
        resolveSeatKills(v, now);
        for (const p of v.projectiles.values()) {
            if (!projCounted.has(p.id)) {
                projCounted.add(p.id);
                countShot(firedBy, p.shooter, p.weapon);
            }
            if (!seenProj.has(p.id))
                pendingProj.set(p.id, { p, tick: v.tick });
        }
        if (projCounted.size > 20000)
            projCounted.clear();
        for (const sh of v.shots) {
            countShot(firedBy, sh.shooter, sh.weapon);
            // hitscan shots from the sim (protocol v4): muzzle and the ray's real end point, hit or miss
            tracers.push({ shooter: sh.shooter, weapon: sh.weapon, team: v.entities.get(sh.shooter)?.team ?? 1, sim0: [sh.x0, sh.y0, sh.z0], from: [sh.x0, sh.y0, sh.z0], to: [sh.x1, sh.y1, sh.z1], age: 0, drawn: false, hit: (sh.flags & events_ts_1.F_SHOT_HIT) !== 0, ground: (sh.flags & events_ts_1.F_SHOT_GROUND) !== 0, target: sh.target });
            tracersFromSim++;
            if (sh.flags & events_ts_1.F_SHOT_HIT)
                tracerHits++;
            else
                tracerMisses++;
            domeShot(sh, now); // C7b item 6
        }
    }
    // protocol v4 guest rule: acknowledge the newest decoded snapshot with its stream epoch (the host may then delta against it)
    if (ackSeq >= 0) {
        send({ t: "ack", seq: ackSeq, epoch: ackEpoch });
        stream.acks++;
        stream.lastSeq = ackSeq;
        stream.lastEpoch = ackEpoch;
    }
    if (stream.eventsSeen.size > 8192) {
        const keep = [...stream.eventsSeen].sort((a, b) => a - b).slice(-4096);
        stream.eventsSeen = new Set(keep);
    }
    // C7b item 1: turret aim from the snapshot's AIM records (w2f), not the host side channel
    {
        const lv = views[views.length - 1];
        if (lv) {
            aim.clear();
            for (const [id, y] of lv.aims)
                aim.set(id, y);
            turretAlerts(lv, now);
        }
    }
    if (tracers.length > 400)
        tracers.splice(0, tracers.length - 400);
    // C7b item 1: recoil from the own station's shot count in the PILOT block (guests too); the host count stays a test aid
    if (host.shots > lastHostShots) {
        recoilAt = now;
        ownShotAt = now;
        lastHostShots = host.shots;
    }
    perf = m.perf;
    wave = m.wave;
    secondsToWave = m.secondsToWave;
    lastTick = m.tick;
    lastArrive = now;
    gotFirst = true;
}
let tracersFromSim = 0, tracerHits = 0, tracerMisses = 0, ownTracers = 0, ownTracerHits = 0;
/** Test aid (dead-seat firing check): per shooter id and weapon, shots in the snapshots and shots drawn (muzzle flash / fire sound). */
const projCounted = new Set();
const firedBy = new Map(), drawnBy = new Map();
function countShot(m, shooter, w) { let r = m.get(shooter); if (!r)
    m.set(shooter, (r = {})); const k = cd.weaponIds[w] ?? String(w); r[k] = (r[k] ?? 0) + 1; }
/** The player's own shots drawn, by weapon index (projectiles by their shooter, hitscan shots by view.shots). */
const ownShotsW = {};
let lastHostShots = 0, recoilAt = -1e9;
// ---- C7b item 1: own-pilot prediction (a guest walking; the test aid setPredict on a host) and recoil from the PILOT block
let predictOn = false, predictor = null, predAcc = 0, predLast = 0;
let ridePred = null; // ruling 112: the own driven hover vehicle
let lastPilotShots = null, pilotShotKicks = 0;
/** A change of the own station's shot count (DecodedPilot.shots, w2f; guests too) is a recoil kick. */
function ownShotsFrame(p, now) {
    if (lastPilotShots !== null && p.shots !== lastPilotShots && p.state !== sim_ts_1.P_DEAD) {
        recoilAt = now;
        ownShotAt = now;
        pilotShotKicks++;
    }
    lastPilotShots = p.shots;
}
/** Reconcile the own pilot's prediction with this snapshot (host body at 1 mm, the last clientSeq the host applied). */
function predictSnap(v) {
    const p = v.pilot;
    // ruling 112: driving a hover vehicle, the vehicle is predicted from the exact ride tail (h2-ride.ts)
    if (predictOn && p.ride && p.state === sim_ts_1.P_SEATED) {
        const ve = v.entities.get(p.entity) ?? null, t = ve ? ve.type : -1;
        if (t >= 0 && (!ridePred || ridePred.type !== t)) {
            const R = (0, predict_ts_2.vehicleMoveRules)(data, PLANET, MAP_SIZE, cd.typeIds[t]);
            ridePred = R ? new h2_ride_ts_1.RidePredictor(R, t, (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), Math.max(p.inputSeq, predictor?.seq ?? 0, ridePred?.seq ?? 0), (0, relief_ts_1.reliefStepRule)(data, PLANET, MAP_SIZE, cd.tMove[t], (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z))) : null;
        }
        ridePred?.reconcile(p.ride, p.inputSeq);
        predictor?.reset();
        return;
    }
    ridePred?.reset();
    if (!predictOn || p.state !== sim_ts_1.P_FOOT || !p.kit || p.kit.x === null || p.kit.z === null || p.airborne === sim_ts_1.AIR_EJECTING) {
        predictor?.reset();
        return;
    }
    if (!predictor)
        predictor = new c7b_ts_1.OwnPredictor((0, predict_ts_1.pilotMoveRules)(data, PLANET, MAP_SIZE), (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), (0, relief_ts_1.reliefStepRule)(data, PLANET, MAP_SIZE, cd.tArmour[PILOT_TYPE], (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z)));
    if (isFrontline() && flKit && !predictor.flArmour) { // Frontline: the kit's armour moves the pilot faster or slower
        const am = FL.armour[flKit.armour];
        predictor.R.speed *= am.speedMul;
        predictor.R.jumpSpeed *= am.jumpMul;
        predictor.flArmour = true;
    }
    const R = predictor.R, x = p.kit.x, z = p.kit.z, e = v.entities.get(p.entity);
    predictor.reconcile({ x, y: (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + Math.max(0, e ? e.altitude : 0), z, airborne: p.airborne, jetFuel: p.jet * R.jetFreeBurn, energy: p.energy * CREW.energyMax }, p.inputSeq);
}
/** When the player's own last shot was seen (host count or a drawn projectile / tracer); own muzzle-flash glow state. */
let ownShotAt = -1e9, ownFlashUntil = 0, ownFlashOn = false, ownFlashToggles = 0;
/** The player's pilot block changed: shield flash, death, respawn, place changes. */
function applyPilot(p, now) {
    const prev = me;
    me = p;
    if (prev && prev.state !== sim_ts_1.P_DEAD && p.state !== sim_ts_1.P_DEAD && p.shield < prev.shield - 0.5 / 255 && prev.entity === p.entity) {
        playerShieldFlashUntil = now + 280;
        combat.playerShieldFlashes++;
        snd.shield(null, true);
    }
    if (prev && prev.state !== sim_ts_1.P_DEAD && p.state === sim_ts_1.P_DEAD) {
        deadSince = now;
        deadAt = bodyRender ? { x: bodyRender.x, z: bodyRender.z } : deadAt;
        specFocus = null;
        killCam = null;
        if (isFrontline())
            send({ t: "flLane", lane: flLane }); // 21 Nov: the host rides this pilot to the lane its own screen shows (a guest's choice was the host's lane until a key was pressed)
        if (lastAttacker && now - lastAttacker.t < 4000) {
            const fy = (0, terrain_gen_ts_1.sampleHeight)(hm, deadAt.x, deadAt.z) + 5;
            killCam = { id: lastAttacker.id, type: lastAttacker.type, x: lastAttacker.x, z: lastAttacker.z, from: [deadAt.x, fy, deadAt.z] };
            notify(`KILLED BY ${lastAttacker.type >= 0 ? (typeName[lastAttacker.type] ?? "enemy").toUpperCase() : "ENEMY FIRE"}`, "bad");
        }
    }
    if (prev && prev.state === sim_ts_1.P_DEAD && p.state !== sim_ts_1.P_DEAD) {
        deadSince = 0;
        lastCtl = "";
        camPitch = -0.05;
        stl.decoyUsed = false;
    } // C7b: a decoy per life
    // hijack in progress (protocol v4 own-pilot block): the vehicle and 0-1 progress of the 5 s contact
    if (p.hijackVehicle) {
        if (!hijack || hijack.vehicle !== p.hijackVehicle)
            hijack = { vehicle: p.hijackVehicle, since: now, progress: p.hijackProgress };
        else
            hijack.progress = p.hijackProgress;
    }
    else
        hijack = null;
    if (!prev || prev.state !== p.state || prev.entity !== p.entity || prev.seat !== p.seat) {
        lastCtl = ""; // the sim drops control when the pilot changes place: resend
        gunnerMode = false; // the driver's own weapon is live again after any place change
        if (prev && prev.state === sim_ts_1.P_FOOT && p.state === sim_ts_1.P_SEATED)
            camPitch = -0.06;
        // Space held through an eject (or an exit in the air) brakes at once: the key went down while seated, where it does nothing
        if (p.state === sim_ts_1.P_FOOT && prev && prev.state !== sim_ts_1.P_FOOT && keys.has("Space")) {
            spaceDown = now;
            spaceOnGround = false;
        }
        if (prev && prev.state === sim_ts_1.P_SEATED && p.state === sim_ts_1.P_SEATED && prev.entity === p.entity && prev.seat !== p.seat) {
            const ve = views[views.length - 1]?.entities.get(p.entity);
            if (ve)
                notify(`SEAT · ${seatLabel(ve.type, p.seat)}${p.seat === cd.tDriverSeat[ve.type] ? " · 2 s to slide into the driver seat" : ""}`, "info");
        }
        seatChoice = null;
    }
}
function stationOf(p) {
    const st = { weapon: [-1, -1], cooldown: [0, 0], gunnerAvail: false, gunnerLive: false, secondary: false };
    if (!p || p.state === sim_ts_1.P_DEAD)
        return st;
    const ws = p.weapons ?? [];
    const groups = [[], []];
    if (p.state === sim_ts_1.P_FOOT) {
        for (const w of ws) {
            if (w.weapon === W_CARBINE)
                groups[0].push(w);
            else if (w.weapon === W_RIFLE || w.weapon === heavyNow())
                groups[1].push(w);
        }
    } // F3: or the pod's heavy weapon
    else {
        const e = ent(p.entity), driver = !!e && p.seat === cd.tDriverSeat[e.type];
        const own = ws.filter((w) => w.seat === p.seat || (driver && w.seat < 0)), gun = driver ? ws.filter((w) => w.seat >= 0 && w.seat !== p.seat) : [];
        st.gunnerAvail = gun.length > 0;
        st.gunnerLive = st.gunnerAvail && gunnerMode;
        groups[0] = st.gunnerLive ? gun : own;
        groups[1] = st.gunnerLive ? own : gun;
        // ruling 32-33: a driver seat with two hull-fixed weapons and no gunner seat (Dart Scout: minigun, Shadower; Salvo: missiles, minigun) fires
        // the first with LMB (fire bit 0) and the second with RMB (bit 1)
        if (driver && own.length && (!gun.length || (isFrontline() && !st.gunnerLive))) { // Frontline: the gunship's rocket pods on RMB too (T still takes a door gun)
            const w0 = own[0].weapon, second = own.filter((w) => w.weapon !== w0);
            if (second.length) {
                groups[0] = own.filter((w) => w.weapon === w0);
                groups[1] = second;
                st.secondary = true;
            }
        }
    }
    for (let g = 0; g < 2; g++)
        if (groups[g].length) {
            st.weapon[g] = groups[g][0].weapon;
            st.cooldown[g] = Math.min(...groups[g].map((w) => w.cooldown));
        }
    return st;
}
let station = stationOf(null);
/** Hijack of an empty enemy vehicle in progress (5 s of contact, CONTRACTS rev 4), from the own-pilot block. */
let hijack = null;
/** Driver seat: the empty gunner seats' weapons are live instead of the driver's own (T; PilotControlInput.gunnerWeapon). */
let gunnerMode = false;
/** Directional damage indicator: recent hits on the player (DAMAGE_TAKEN), the shooter's position when known. */
const dmgDirs = [];
let damageTakenCount = 0, riderHitsTaken = 0, riderHitsDealt = 0;
/** Why a hijack was interrupted (HIJACK event flags). */
const HIJACK_CAUSE = [[1, "you left contact with the hull"], [2, "you took damage"], [4, "the vehicle was boarded, changed side, went critical or is gone"], [8, "no free seat"]];
/** Plain words for the sim's reason codes: c6.ts (every code the sim has). */
const HOLD_TEXT = { none: "", resources: "waiting for ore / gas", mapCap: "map unit cap reached", hostCap: "host unit cap reached", tierLocked: "tech tier lost", unsupplied: "Point cut off - production paused", coreDisabled: "Command Core disabled - production paused", barracksCap: "Barracks full: build or rebuild a Barracks (4 squads each)" };
/**
 * A muzzle flash. The player's own automatic weapon: a smaller flash whose glow lasts one shot period, so a held
 * trigger reads as one sustained, flickering glow instead of a full-size flash strobing at the rate of fire.
 */
function ownMuzzle(x, y, z, glow, k, own, w, now) {
    if (own && isAuto(w)) {
        const sustain = cd.wPeriod[w] + 0.04;
        fx.muzzle(x, y, z, glow, k * 0.6 * (0.85 + Math.random() * 0.3), sustain);
        ownFlashUntil = Math.max(ownFlashUntil, now + sustain * 1000);
    }
    else {
        fx.muzzle(x, y, z, glow, k);
        if (own)
            ownFlashUntil = Math.max(ownFlashUntil, now + 140);
    }
}
function onEvent(e, v, now) {
    const name = Object.keys(events_ts_1.EV).find((k) => events_ts_1.EV[k] === e.kind) ?? String(e.kind);
    evCount[name] = (evCount[name] ?? 0) + 1;
    evLog.push({ kind: e.kind, a: e.a, b: e.b, c: e.c, flags: e.flags, t: now });
    if (evLog.length > 200)
        evLog.shift();
    p1_sound_ts_1.p1Sound.event(e, v, now); // P1 hook
    fx_p2_ts_1.p2Fx.event(e, v, now); // P2 hook
    c6Event(e, v, now);
    c11Event(e, v, now); // C11
    const vt = (id) => { const x = v.entities.get(id); return x ? typeName[x.type] : "vehicle"; };
    switch (e.kind) {
        case events_ts_1.EV.HIT: { // the player's own shots (hit markers); a = target, b = shooter (protocol v4)
            const killed = (e.flags & events_ts_1.F_KILLED) !== 0, pk = (e.flags & events_ts_1.F_PILOT_KILL) !== 0, rider = (e.flags & events_ts_1.F_RIDER) !== 0;
            combat.hitMarkers++;
            if (killed)
                combat.kills++;
            if (pk)
                combat.pilotKills++;
            if (rider)
                riderHitsDealt++;
            combat.lastHits.push({ id: e.a, hull: e.v1, shield: e.v2, killed, pilotKill: pk, shield0: (e.flags & events_ts_1.F_SHIELD) !== 0, t: now });
            if (combat.lastHits.length > 50)
                combat.lastHits.shift();
            // a stream of hits (automatic weapons): one lighter marker held while the hits keep coming, not a full tick per hit
            hitStreak = now - lastHitAt < 350 ? hitStreak + 1 : 1;
            lastHitAt = now;
            hitMarkStream = hitStreak >= 3 && !killed && !pk;
            hitMarkUntil = Math.max(hitMarkUntil, now + (killed || pk ? 600 : hitMarkStream ? 200 : 250) * feedbackScale);
            hitMarkKill = killed && !pk;
            hitMarkPilot = pk;
            hitMarkRider = rider && !pk;
            const tr = tracks.get(e.a);
            if (tr)
                tr.damagedAt = now;
            if (pk) {
                // which seat was emptied: the crew mask before (previous snapshot) vs now / the next snapshots (resolveSeatKills)
                const prevV = views.length > 1 ? views[views.length - 2] : null, pe = prevV?.entities.get(e.a), ce = v.entities.get(e.a);
                seatKillPending.push({ id: e.a, mask: pe ? pe.crew : ce ? ce.crew | 0xff : 0xff, at: now, rider: rider && e.d !== W_RIFLE });
                snd.sting("pilot-kill");
            }
            else if (rider) {
                snd.hit(false);
                riderMsgUntil = now + 900 * feedbackScale;
            }
            else if (!hitMarkStream || hitStreak % 2 === 1)
                snd.hit(killed); // a stream: every other tick
            break;
        }
        case events_ts_1.EV.DAMAGE_TAKEN: { // a hit on the player's pilot or the vehicle it rides (protocol v4): a = target, b = shooter
            const sh = v.entities.get(e.b), rider = (e.flags & events_ts_1.F_RIDER) !== 0;
            damageTakenCount++;
            if (rider)
                riderHitsTaken++;
            // playtest: the shooter may be off the wire (not yet detected by the team): its projectile or ray still says where it fired from
            const src = (0, c3_ts_1.shooterPos)(e.b, v.entities, [...views.slice(-6).flatMap((w) => [...w.projectiles.values()])], views.slice(-6).flatMap((w) => w.shots), lastSeen);
            lastDmgSource = src ? src.from : "unknown";
            if (src)
                lastAttacker = { id: e.b, type: sh ? sh.type : lastAttacker?.id === e.b ? lastAttacker.type : -1, x: src.x, z: src.z, t: now };
            dmgDirs.push({ x: src ? src.x : 0, z: src ? src.z : 0, known: !!src, t: now, amount: e.v1 + e.v2, shield: e.v1 === 0 && e.v2 > 0, rider });
            if (dmgDirs.length > 8)
                dmgDirs.shift();
            snd.hurt(e.v1 === 0 && e.v2 > 0);
            if (rider && (e.flags & events_ts_1.F_KILLED) === 0)
                notify(`RIDER HIT · you are exposed on the ${vt(e.a)}${sh ? ` · ${typeName[sh.type]}` : ""}`, "bad");
            break;
        }
        case events_ts_1.EV.HIJACK: {
            if (e.a !== pilotId)
                break;
            if (e.d === 0) {
                notify(`HIJACKING THE ${vt(e.b).toUpperCase()} · stay in contact for ${(e.c * dt).toFixed(0)} s`, "warn");
                snd.ui("click");
                hijackStarted++;
            }
            else if (e.d === 1) {
                const why = HIJACK_CAUSE.filter(([f]) => e.flags & f).map(([, t]) => t).join(", ") || "interrupted";
                notify(`HIJACK INTERRUPTED · ${why}`, "bad");
                snd.ui("error");
                hijackInterrupted++;
                lastHijackCause = why;
                hijack = null;
            }
            break;
        }
        case events_ts_1.EV.REJECT: {
            const reason = sim_ts_1.ORDER_REASONS[e.c - 1] ?? `code ${e.c}`;
            if (reason === "pickupEnded") {
                if (ride && ride.vehicle === e.b) {
                    if (me?.state === sim_ts_1.P_FOOT)
                        notify("RIDE ENDED", "warn");
                    ride = null;
                }
                break;
            }
            if (reason === "hijackInterrupted") {
                pendingActs.delete(e.a);
                break;
            } // the HIJACK event names the cause
            const pa = pendingActs.get(e.a);
            if (pa) {
                pendingActs.delete(e.a);
                if (pa.prod)
                    productionRefused(pa.prod.type, reason);
                else if (pa.build)
                    buildRefused(pa.build.type, reason);
                else {
                    notify(`${pa.what} REFUSED · ${(0, c6_ts_1.reasonText)(reason)}`, "warn");
                    snd.ui("error");
                }
            }
            break;
        }
        case events_ts_1.EV.ENTER: {
            if (e.a === pilotId) {
                const hij = (e.flags & events_ts_1.F_HIJACK) !== 0;
                const ent = v.entities.get(e.b), seatName = ent ? seatLabel(ent.type, e.c) : "seat";
                notify(hij ? `HIJACKED · the ${vt(e.b)} is yours` : `IN THE ${vt(e.b).toUpperCase()} · ${seatName}`, "good");
                boardedOnce = true;
                hijack = null;
                snd.sting("enter");
                if (ride && ride.vehicle === e.b) {
                    notify("RIDE ARRIVED · its AI pilot heads home", "good");
                    ride = null;
                }
                else if (ride)
                    ride = null;
            }
            else {
                // C7b item 3: a squadmate took a passenger seat of a transport
                const ve = v.entities.get(e.b), nm = playerName(e.a);
                if (ve && nm && cd.tSeatRole[ve.type * data_ts_1.MAX_SEATS + e.c] === data_ts_2.SEAT_PASSENGER) {
                    notify((0, c7b_ts_2.passengerLine)(nm, typeName[ve.type]), "info");
                    tpStats.passengerLines++;
                }
            }
            break;
        }
        case events_ts_1.EV.EXIT: {
            if (e.a === pilotId) {
                notify("ON FOOT", "info");
                snd.sting("exit");
                break;
            }
            // an AI pilot climbing out of a vehicle the player is taking (ruling 19): it walks home
            const ent = v.entities.get(e.b);
            walkers.set(e.c, { since: now, from: ent ? typeName[ent.type] : "vehicle", x0: 0, z0: 0 });
            notify(`AI pilot climbs out of the ${vt(e.b)} and walks to the nearest base`, "info");
            break;
        }
        case events_ts_1.EV.EJECT: {
            if (e.a === pilotId) {
                const auto = (e.flags & events_ts_1.F_AUTO_EJECT) !== 0;
                notify(auto ? `EJECTED AUTOMATICALLY · the ${typeName[lastRideType] ?? "vehicle"} was destroyed · steer the descent with the jetpack (Space)` : "EJECTED · steer the descent with the jetpack (Space)", auto ? "warn" : "good");
                snd.sting("eject");
                ejectHeld = 0;
                if (auto) {
                    ejectedUntil = now + EJECTED_NOTICE_MS;
                    ejectedNotices++;
                }
            }
            break;
        }
        // the new seat is not on the wire (the SEAT event carries a, b, c = from seat): the message comes from the pilot block (applyPilot)
        case events_ts_1.EV.SEAT:
            if (e.a === pilotId)
                snd.sting("seat");
            break;
        case events_ts_1.EV.PILOT_DEATH:
            if (e.a === pilotId) {
                // ruling 26: a bike destroyed by fire takes its rider with it (b = the vehicle the pilot died in, 0 on foot)
                const bike = e.b !== 0 && lastRideType >= 0 && !autoEjects(lastRideType);
                notify(bike ? `PILOT DOWN · went down with the ${typeName[lastRideType]} (a bike does not eject)` : e.b === 0 && !c11WasDowned ? "PILOT DOWN · nobody could reach you to revive you (rulings 79 / 88)" : "PILOT DOWN", "bad");
                snd.sting("pilot-down"); // C11: no downed state when nobody can help
            }
            break;
        case events_ts_1.EV.CALL_REFUSED:
            callRefused(e);
            break;
        case events_ts_1.EV.CALL_QUEUED:
        case events_ts_1.EV.CALL_IMPACT:
            onCallEvent(e);
            break;
        case events_ts_1.EV.BUILD_STARTED:
        case events_ts_1.EV.BUILD_DONE:
        case events_ts_1.EV.BUILD_ENDED: {
            const t = (0, c4_ts_1.buildEventText)(e, 0, typeName, ptStatics);
            if (t) {
                notify(t.text, t.kind);
                if (e.kind === events_ts_1.EV.BUILD_DONE)
                    snd.sting("produced");
                else if (t.kind === "bad")
                    snd.ui("error");
            }
            break;
        }
        case events_ts_1.EV.RESPAWN:
            if (e.a === pilotId) {
                const b = v.entities.get(e.c);
                notify(`RESPAWNED ON FOOT${b ? ` AT THE ${typeName[b.type].toUpperCase()}` : ""}`, "good");
                snd.sting("respawn");
            }
            break;
        case events_ts_1.EV.POINT: {
            const t = (0, c2_ts_1.pointEventText)(ptStatics, e.a, e.b, e.c);
            const owner = ptModels[e.a]?.owner ?? -1; // the owner the page last drew (before this event)
            const th = threats.point(e.a, e.b, e.c, owner, ptStatics[e.a]?.name ?? `point ${e.a}`, now);
            if (th)
                raiseThreat(th);
            else
                notify(t.text, t.kind);
            if (e.b === 2 && !th)
                snd.sting(e.c === 0 ? "produced" : "under-attack");
            break;
        }
        case events_ts_1.EV.ORDER_ACK: {
            const text = (0, c2_ts_1.ackText)(e.b, e.c);
            callouts.set(e.a, { text, until: now + 1600 });
            ackCount++;
            lastAck = text;
            if (now - lastBlipAt > 150) {
                snd.blip();
                lastBlipAt = now;
            }
            break;
        }
        case events_ts_1.EV.DEPOSIT_EXHAUSTED:
            notify((0, c2_ts_1.depositEventText)(scenMap, e.a), "warn");
            break;
        case events_ts_1.EV.HARVEST_DELIVERED:
            if (v.entities.get(e.a)?.team === 0 || v.mining?.harvesters.some((x) => x.id === e.a))
                notify((0, c2_ts_1.deliveredEventText)(e.v1), "good");
            break;
        case events_ts_1.EV.CORE: {
            const th = threats.core(e.b, e.c, now);
            if (th)
                raiseThreat(th);
            else {
                const t = (0, c2_ts_1.coreEventText)(e.b, e.c);
                notify(t.text, t.kind);
            }
            break;
        }
        case events_ts_1.EV.PRODUCED: {
            const b = v.entities.get(e.a);
            notify(`${typeName[e.c]} rolled out of the ${b ? typeName[b.type] : "building"}${crewable(e.c) ? " with an AI crew" : ""}`, "good");
            snd.sting("produced");
            fresh.set(e.b, now);
            producedCount++;
            if (b && b.team === 0 && !matchWatch.over)
                c3Stats.unitsBuilt++;
            break;
        }
    }
}
let producedCount = 0, hijackStarted = 0, hijackInterrupted = 0, lastHijackCause = "";
/** Short ring label of a seat: DRIVER, GUNNER (GUNNER 2 ... when there are several), PASSENGER. */
function seatRoleLabel(t, j) {
    const role = cd.tSeatRole[t * data_ts_1.MAX_SEATS + j];
    if (role !== data_ts_1.SEAT_GUNNER)
        return role === data_ts_1.SEAT_DRIVER ? "DRIVER" : "PASSENGER";
    let n = 0, k = 0;
    for (let q = 0; q < cd.tSeatCount[t]; q++)
        if (cd.tSeatRole[t * data_ts_1.MAX_SEATS + q] === data_ts_1.SEAT_GUNNER) {
            n++;
            if (q <= j)
                k++;
        }
    return n > 1 ? `GUNNER ${k}` : "GUNNER";
}
/** Weapon indices fired from seat j of type t (the driver also fires the unseated mounts). */
function seatWeapons(t, j) {
    const out = [], drv = cd.tDriverSeat[t];
    for (let m = 0; m < cd.tMountCount[t]; m++) {
        const q = cd.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + m];
        if (q === j || (j === drv && q < 0)) {
            const w = cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
            if (!out.includes(w))
                out.push(w);
        }
    }
    return out;
}
/** The player's pilot kill on a crewed vehicle (ruling 20): the crew mask before the kill; resolved when the bit clears. */
let seatKillPending = [];
let lastSeatKill = null;
let seatKills = [];
function resolveSeatKills(v, now) {
    if (!seatKillPending.length)
        return;
    seatKillPending = seatKillPending.filter((k) => {
        const e = v.entities.get(k.id);
        if (!e)
            return false;
        const lost = k.mask & ~e.crew;
        if (!lost)
            return now - k.at < 3000;
        for (let j = 0; j < cd.tSeatCount[e.type]; j++) {
            if (!(lost & (1 << j)))
                continue;
            const role = seatRoleLabel(e.type, j), ws = seatWeapons(e.type, j).map((w) => weaponName[w]), name = typeName[e.type];
            const drv = j === cd.tDriverSeat[e.type];
            const text = e.crew === 0
                ? `${role} DOWN — the ${name} is empty and intact${ws.length ? ` · ${ws.join(", ")} silent` : ""}`
                : `${role} DOWN — ${ws.length ? `${ws.join(", ")} silent` : "no weapon at that seat"}${drv ? ` · the ${name} cannot move` : ""} · ${crewLeftText(e.type, e.crew)}`;
            lastSeatKill = { id: k.id, seat: j, role, weapons: ws, crewLeft: e.crew, text, until: now + 3500 * feedbackScale };
            seatKills.push({ id: k.id, seat: j, role, weapons: ws, crewLeft: e.crew, text });
            if (e.crew !== 0)
                notify(text, "good");
            else if (k.rider)
                notify(`RIDER SHOT OFF · the ${name} is empty: board it (F)`, "good");
            else
                notify(`PILOT KILLED · the ${name} is empty and intact: board it (F)`, "good");
        }
        return false;
    });
}
function crewLeftText(t, mask) {
    const left = [];
    for (let j = 0; j < cd.tSeatCount[t]; j++)
        if (mask & (1 << j))
            left.push(seatRoleLabel(t, j).toLowerCase());
    return `${left.join(" and ")} still aboard`;
}
/** Seat name for a type and seat index: driver, gunner (1, 2...), passenger. */
function seatLabel(t, j) {
    if (isBunker(t))
        return `mount ${j + 1} · ${weaponName[bunkerWeapon(t, j)] ?? "gun"}`; // B1
    const role = cd.tSeatRole[t * data_ts_1.MAX_SEATS + j];
    if (role === data_ts_1.SEAT_DRIVER)
        return "driver seat";
    let n = 0;
    for (let k = 0; k <= j; k++)
        if (cd.tSeatRole[t * data_ts_1.MAX_SEATS + k] === role)
            n++;
    let tot = 0;
    for (let k = 0; k < cd.tSeatCount[t]; k++)
        if (cd.tSeatRole[t * data_ts_1.MAX_SEATS + k] === role)
            tot++;
    return `${SEAT_ROLE_NAME[role]} seat${tot > 1 ? ` ${n}` : ""}`;
}
/** Hull and shield changes seen in the snapshot stream (what a guest sees too): damage, shield hits (the sim's flag), recharge, base under attack. */
function trackDamage(v, now) {
    for (const e of v.entities.values()) {
        let tr = tracks.get(e.id);
        if (!tr) {
            tracks.set(e.id, { ...gait(e.id), spd: 0, hp: e.hp, sh: e.shield, damagedAt: 0, damagedTick: 0, shieldHitAt: 0, shieldDownAt: 0, shieldUpAt: 0, hitDir: [0, 1, 0], walk: gaitPhase(e.id), walkAmp: 0, recoilAt: -1e9, flagHit: e.shieldHit });
            continue;
        }
        // shield hit: the sim's FLAG_SHIELD_HIT (set for 4 ticks after a shield took damage), on its rising edge; a drop in the quantised shield as well
        const flagEdge = e.shieldHit && !tr.flagHit;
        const shHit = flagEdge || e.shield < tr.sh - 0.5 / 255, hpHit = e.hp < tr.hp - 0.5 / 255;
        if (shHit || hpHit) {
            tr.damagedAt = now;
            tr.damagedTick = v.tick;
        }
        if (shHit) {
            tr.shieldHitAt = now;
            combat.shieldFlashes++;
            if (e.shield <= 0 && tr.sh > 0) {
                tr.shieldDownAt = now;
                combat.shieldDowns++;
            }
            tr.hitDir = shieldHitDir(e, now);
            const own = me && e.id === me.entity;
            // C10: far shield shimmers at most one per 120 ms (a 300-unit fight made ~1300 a run, refused at the voice cap)
            if (!own && (Math.hypot(e.x - eye[0], e.z - eye[2]) < 60 || now - shieldSndAt > 120)) {
                shieldSndAt = now;
                const y = (0, terrain_gen_ts_1.sampleHeight)(hm, e.x, e.z) + (cd.tAir[e.type] ? cd.constants.airAltitude + e.altitude : 0) + cd.tRadius[e.type];
                snd.shield([e.x, y, e.z]);
            }
        }
        if (e.shield > tr.sh + 0.5 / 255)
            tr.shieldUpAt = now; // vehicle shield recharge (ruling 15)
        if (hpHit && e.team === 0 && cd.tStructure[e.type] && now - lastUnderAttack > 20000 && started) {
            lastUnderAttack = now;
            snd.sting("under-attack");
            notify(`BASE UNDER ATTACK · ${typeName[e.type]}`, "bad");
            underAttackCount++;
        }
        tr.hp = e.hp;
        tr.sh = e.shield;
        tr.flagHit = e.shieldHit;
    }
}
let underAttackCount = 0;
/** Ruling 34: the short "EJECTED" notice after an automatic eject (until when, and how many were shown). */
const EJECTED_NOTICE_MS = 1800;
let ejectedUntil = 0, ejectedNotices = 0;
/** Per-soldier gait from a hash of the entity id: a start phase spread over the whole cycle, stride length x0.85-1.15, swing x0.85-1.1. */
function hashId(id, k) { let h = Math.imul(id ^ (k * 0x9e3779b9), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function gaitPhase(id) { return hashId(id, 1) * Math.PI * 2; }
function gait(id) { return { strideK: 0.85 + 0.3 * hashId(id, 2), ampK: 0.85 + 0.25 * hashId(id, 3) }; }
/** Direction from a unit's centre to the most recent nearby impact (the side that was hit), else toward the camera. */
function shieldHitDir(e, now) {
    const cy = (0, terrain_gen_ts_1.sampleHeight)(hm, e.x, e.z) + (cd.tAir[e.type] ? cd.constants.airAltitude + e.altitude : 0) + cd.tRadius[e.type]; // C8: low flight draws at the real height
    let best = null, bd = (cd.tRadius[e.type] + 8) ** 2;
    for (const p of recentImpacts) {
        if (now - p.t > 400)
            continue;
        const d2 = (p.x - e.x) ** 2 + (p.y - cy) ** 2 + (p.z - e.z) ** 2;
        if (d2 < bd) {
            bd = d2;
            best = [p.x - e.x, p.y - cy, p.z - e.z];
        }
    }
    const v = best ?? [eye[0] - e.x, eye[1] - cy, eye[2] - e.z];
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}
/** Line-colour index of a sim team: 0 own side (cyan), 1 enemy (red-orange), 2 neutral / empty (grey). */
function teamIndex(team) { return team === 0 ? 0 : team === 1 ? 1 : 2; }
/** 21 Nov: entities carrying another human player (their body on foot, or the vehicle they sit in): drawn in the squad colour (shader team 4). */
let mateCacheView = null, mateCache = new Set();
function mateEntities() {
    const v = views[views.length - 1];
    if (v === mateCacheView)
        return mateCache;
    mateCacheView = v;
    mateCache = new Set();
    if (v && v.players)
        for (const p of v.players.values())
            if (p.pilotId !== pilotId && p.player >= 0 && p.state !== sim_ts_1.P_DEAD && p.entity)
                mateCache.add(p.entity);
    return mateCache;
}
function unitTeamIndex(eb) { return eb.team === 0 && mateEntities().has(eb.id) ? 4 : teamIndex(eb.team); }
// ------------------------------------------------------------------ HUD message feed
const feed = [];
function notify(text, kind = "info") {
    const now = performance.now();
    lastFeedMsg = text;
    feed.push({ text, kind, until: now + 5500 });
    if (feed.length > 5)
        feed.shift();
    feedLog.push(text);
    if (feedLog.length > 100)
        feedLog.shift();
}
const feedLog = [];
let shieldSndAt = -1e9;
let mode = "fp";
let transFrom = "fp", transT = 1; // 0..1 progress of the 0.4 s transition
let transStart = 0, transFrames = 0, lastTransition = null;
const TRANSITION_S = 0.4;
let camYaw = 0, camPitch = -0.05; // first person aim (radians)
const cmd = { x: FRONT.x, z: FRONT.z, dist: 420, rot: 0 };
const keys = new Set();
let lmb = false, rmb = false, lmbThrow = false; // lmbThrow: the held click threw a call-down (no trigger)
let mouseX = 0, mouseY = 0, mouseIn = false;
let drag = null;
let midDrag = null;
const selected = new Set();
/** The friendly building selected in command view (production panel), 0 = none. */
let selBuilding = 0;
const lastOrder = { ids: [], order: null, reply: null, reqId: 0, at: [0, 0] };
let alarmUntil = 0;
let lastCtl = "";
let deadSince = 0, deadAt = { x: PILOT_START.x, z: PILOT_START.z };
let legendOn = false, helpOn = false; // C8 (QA4 bug 27): the icon legend opens with L (it was open by default and cut off)
let freeCam = null; // test aid: a fixed or following camera (close-up screenshots)
/**
 * Frontline: the opening cinematic (cinematic.ts has the shots, captions and drops, timed to the intro music). Played on
 * the first deploy of a page load; Space, Enter or Esc skips it. While it runs the camera is scripted, the HUD hidden,
 * the input held back, and the host's snapshots show the whole map (worker "cineReveal"); the sim runs on.
 */
let cine = null, cineDone = false, cineMusicBuf = null, cineMusicLoading = false;
const cineStats = { started: 0, ended: 0, skipped: 0, lastT: 0, shots: new Set(), pods: 0, crates: 0, music: "none" };
function cineWanted() {
    if (cineDone || !isFrontline() || config.scenario !== "default")
        return false;
    if (mp.role === "guest") // 21 Nov (co-op lessons): a guest joins a battle already running on the host; no intro to sit through
        return false;
    try {
        if (new URLSearchParams(location.search).get("intro") === "0")
            return false;
    }
    catch { /* no location */ }
    return true;
}
/** Decodes the intro music (inlined base64 MP3) once the audio context exists; the cinematic waits briefly for it. */
function cineLoadMusic() {
    if (cineMusicBuf || cineMusicLoading || !snd.ctx)
        return;
    const b64 = globalThis.__IRONFALL_SAMPLES?.introMusic;
    if (!b64)
        return;
    cineMusicLoading = true;
    try {
        const bin = atob(b64), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++)
            u[i] = bin.charCodeAt(i);
        snd.ctx.decodeAudioData(u.buffer).then((b) => { cineMusicBuf = b; cineMusicLoading = false; }, () => { cineMusicLoading = false; cineStats.music = "decode failed"; });
    }
    catch {
        cineMusicLoading = false;
    }
}
snd.onMusic = (v) => { // the cinematic's music follows the music slider
    try {
        if (cine?.gain && snd.ctx)
            cine.gain.gain.setTargetAtTime(v, snd.ctx.currentTime, 0.05);
    }
    catch { /* ignore */ }
};
function cineStart() {
    cineLoadMusic();
    cine = { t0: performance.now(), clock: null, src: null, gain: null, P: null, E: null, landed: new Set(), crates: new Map(), lastT: -1 };
    cineStats.started++;
    document.body.classList.add("cine");
    keys.clear();
    send({ t: "cineReveal", on: true });
}
/** The cinematic's clock (s): the music's own clock once it plays (picture and music stay together); -1 while waiting for it. */
function cineTime(now) {
    if (!cine)
        return -1;
    if (cine.clock === null) {
        const waited = (now - cine.t0) / 1000;
        if (cineMusicBuf && snd.ctx) {
            try {
                const ctx = snd.ctx, src = ctx.createBufferSource(), g = ctx.createGain();
                src.buffer = cineMusicBuf;
                g.gain.value = snd.muted ? 0 : snd.music; // mastered to the same loudness as the music folder's tracks
                src.connect(g);
                g.connect(snd.buses.music ?? snd.master ?? ctx.destination);
                const at = ctx.currentTime + 0.05;
                src.start(at);
                cine.src = src;
                cine.gain = g;
                cine.clock = { ctx: true, at };
                cineStats.music = "playing";
            }
            catch {
                cine.clock = { ctx: false, at: now };
            }
        }
        else if (waited > 4 || (!cineMusicLoading && !cineMusicBuf)) {
            cine.clock = { ctx: false, at: now }; // no music (no audio, or slow to decode): run on the frame clock
            cineStats.music = cineStats.music === "none" ? "silent" : cineStats.music;
        }
        else
            return -1;
    }
    return cine.clock.ctx ? Math.max(0, snd.ctx.currentTime - cine.clock.at) * cineTimeK : ((now - cine.clock.at) / 1000) * cineTimeK;
}
let cineTimeK = 1; // test aid: the cinematic's clock speed (seek: cineSeek)
let cineOffset = 0;
/** The two Command Cores the shots are laid out from: ours (team 0) and theirs (revealed; else the map's mirror image). */
function cineCores() {
    if (!cine)
        return;
    const ct = cd.typeIds.indexOf("command-core");
    for (const e of rendered) {
        if (e.type !== ct)
            continue;
        if (e.team === 0 && !cine.P)
            cine.P = { x: e.x, z: e.z };
        if (e.team === 1 && !cine.Ereal)
            cine.Ereal = { x: e.x, z: e.z };
    }
    if (!cine.P)
        cine.P = { x: PILOT_START.x - 17, z: PILOT_START.z - 6 };
    cine.E = cine.Ereal ?? { x: MAP_SIZE - cine.P.x, z: MAP_SIZE - cine.P.z };
}
const cineGround = (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
/** The camera for this frame (null when the cinematic has ended). fpEye / fpTarget: the pilot's own view, for the hand-over. */
function cineCamera(now, fpEye, fpTarget) {
    cineHoldCheck(now);
    if (!cine)
        return null;
    // designer 19 Nov ("the AI shouldn't be moving during the cinematic"): the match is paused while it plays, once one
    // snapshot with the whole map revealed has arrived (the paused world stays drawn as it was)
    if (!cine.paused && (cine.Ereal || now - cine.t0 > 1500)) {
        cine.paused = true;
        if (!mp.shared()) // with squadmates online the battle is theirs too: it runs on (21 Nov co-op lessons)
            send({ t: "pause", on: true });
    }
    let t = cineTime(now);
    cineCores();
    const el = $("cine");
    if (t < 0) { // waiting for the music: black, letterboxed
        cineOverlay({ big: "", small: "", capAlpha: 0, smallAlpha: 0, title: 0, sub: 0, letterbox: 1, black: 1 }, 0);
        return { eye: fpEye, target: fpTarget, fov: 50 };
    }
    t += cineOffset;
    cine.lastT = t;
    cineStats.lastT = t;
    if (t >= cine_ts_1.CINE_END) {
        cineEnd(false);
        return null;
    }
    const body = bodyRender ? { x: bodyRender.x, z: bodyRender.z } : null;
    if (cine.handYaw === undefined && cine.P) { // the pilot will face the front when the camera hands over
        cine.handYaw = Math.atan2(cine.E.z - cine.P.z, cine.E.x - cine.P.x);
        camYaw = cine.handYaw;
        camPitch = -0.04;
    }
    const f = (0, cine_ts_1.cineFrame)(t, cine.P, cine.E, cineGround, body, { eye: fpEye, target: fpTarget, fov: onFoot() ? 70 : 62 });
    cineStats.shots.add(f.shot);
    cineOverlay((0, cine_ts_1.cineCaption)(t, PLANET), t);
    void el;
    if (f.handoff > 0) {
        const k = f.handoff;
        return { eye: [0, 1, 2].map((i) => f.eye[i] + (fpEye[i] - f.eye[i]) * k), target: [0, 1, 2].map((i) => f.target[i] + (fpTarget[i] - f.target[i]) * k), fov: f.fov + ((onFoot() ? 70 : 62) - f.fov) * k };
    }
    return { eye: f.eye, target: f.target, fov: f.fov };
}
let cineOverlayLast = "";
function cineOverlay(c, t) {
    const key = `${c.big}|${c.small}`;
    if (key !== cineOverlayLast) {
        cineOverlayLast = key;
        $("cineBig").textContent = c.big;
        $("cineSmall").textContent = c.small;
    }
    $("cineBig").style.opacity = String(c.capAlpha);
    $("cineSmall").style.opacity = String(c.smallAlpha);
    $("cineTitle").style.opacity = String(c.title);
    $("cineTitle").style.transform = `translate(-50%, -50%) scale(${(1.06 - 0.06 * Math.min(1, Math.max(0, (t - 54.1) / 6))).toFixed(4)})`;
    $("cineSub").style.opacity = String(c.sub);
    $("cineFade").style.opacity = String(c.black);
    document.body.style.setProperty("--cine-lb", `${(c.letterbox * 11).toFixed(2)}vh`);
    $("cineSkip").style.opacity = t < cine_ts_1.CINE_HANDOFF ? (cine?.holdSince ? "0.9" : "0.55") : "0";
}
/** The scripted drops: pods raining onto the front (shot 4), vehicle crates braking in at midfield (shot 5). */
function cineMeshes(now) {
    if (!cine || cine.lastT < 0 || !cine.P)
        return;
    const t = cine.lastT, team = 0;
    for (const p of (0, cine_ts_1.cinePods)(t, cine.P, cine.E)) {
        const gy = cineGround(p.x, p.z);
        flInst("flpod", p.x, gy + p.h, p.z, 0.4, team);
        cineStats.pods++;
        if (!p.landed) { // retro rockets under the pod, brightest in the last 90 m
            const burn = p.h < 90 ? 1 : 0.45;
            fx.dot(p.x, gy + p.h - 0.3, p.z, 1.3 * burn + 0.4, [1, 0.62, 0.22], 1);
            for (let i = 1; i < 6; i++)
                fx.dot(p.x, gy + p.h - 0.3 - i * 1.6, p.z, (1.1 - i * 0.15) * burn, [1, 0.5 - i * 0.05, 0.18], 0.75 - i * 0.12);
        }
        else if (!cine.landed.has(p.land)) {
            cine.landed.add(p.land);
            flDust(p.x, gy, p.z, 3);
            snd.sting("landing", [p.x, gy, p.z]);
            const d = Math.hypot(p.x - eye[0], p.z - eye[2]);
            shakeAmp = Math.max(shakeAmp, Math.max(0, 0.5 - d / 160));
        }
    }
    const gt = cd.typeIds.indexOf("gunship"), S = gt >= 0 ? flDropSize(gt) : 8;
    for (const c of (0, cine_ts_1.cineCrates)(t, cine.P, cine.E)) {
        const gy = cineGround(c.x, c.z);
        if (c.secs > 0) {
            const h = flDropHeight(c.secs), y = gy + h + 0.11 * S;
            flInst("fldrop", c.x, y, c.z, c.yaw, team, S);
            flDropThrusters(c.x, y, c.z, c.yaw, c.secs < FL_DROP_RETRO ? 1 : 0.25, gy);
            cineStats.crates++;
            continue;
        }
        let la = cine.crates.get(c.i);
        if (!la) {
            la = { x: c.x, z: c.z, S, yaw: c.yaw, team, landedAt: now - (-c.secs) * 1000 };
            cine.crates.set(c.i, la);
            snd.sting("landing", [c.x, gy, c.z]);
        }
        if ((now - la.landedAt) / 1000 > 0.45 && gt >= 0)
            flInst(kindOfType[gt], c.x, gy, c.z, c.yaw, team); // the gunship stands in the open crate
        try {
            flDropOpen(la, now);
        }
        catch { /* drawing only */ }
    }
}
/** Ends the cinematic: control back to the player. `skipped`: the music fades out quickly instead of playing out. */
function cineEnd(skipped) {
    if (!cine)
        return;
    const c = cine;
    cine = null;
    cineDone = true;
    cineStats.ended++;
    if (skipped)
        cineStats.skipped++;
    document.body.classList.remove("cine");
    document.body.style.removeProperty("--cine-lb");
    send({ t: "cineReveal", on: false });
    send({ t: "pause", on: (pauseOn && !mp.shared()) || (document.hidden && !mp.shared()) }); // the match starts now (co-op: the pause menu does not stop a shared battle)
    keys.clear();
    if (c.src && c.gain && snd.ctx)
        try {
            const tt = snd.ctx.currentTime;
            if (skipped) {
                c.gain.gain.setTargetAtTime(0, tt, 0.35);
                c.src.stop(tt + 2);
            }
        }
        catch { /* ignore */ }
    if (c.handYaw !== undefined && skipped) {
        camYaw = c.handYaw;
        camPitch = -0.04;
    }
    notify("ON FOOT beside the Command Core · F: enter a vehicle · V: call a ride · B: production · H: controls", "info");
}
// while the cinematic runs the game's input is held back; Space, Enter or Esc skips it
for (const ev of ["keydown", "keyup", "mousedown", "mouseup", "mousemove", "wheel", "contextmenu", "click"])
    window.addEventListener(ev, (e) => {
        if (!cine)
            return;
        e.stopImmediatePropagation();
        if (ev !== "mousemove")
            e.preventDefault();
        const skipKey = e.code === "Space" || e.code === "Enter";
        if (ev === "keydown" && e.code === "Escape" && !e.repeat && performance.now() - cine.t0 > 1000)
            cineEnd(true);
        else if (ev === "keydown" && skipKey && !e.repeat)
            cine.holdSince = performance.now();
        else if (ev === "keyup" && skipKey)
            cine.holdSince = null;
    }, { capture: true, passive: false });
const CINE_HOLD_MS = 800; // held this long, Space or Enter skips the cinematic (a reflex jump after Deploy does not)
function cineHoldCheck(now) {
    if (!cine)
        return;
    const k = cine.holdSince ? Math.min(1, (now - cine.holdSince) / CINE_HOLD_MS) : 0;
    $("cineSkipBar").style.width = `${(k * 100).toFixed(0)}%`;
    if (k >= 1)
        cineEnd(true);
}
/** On-foot kit: 0 carbine, 1 long rifle, 2 repair torch, 3 build tool (keys 1 / 2 / 3 / 4, or the mouse wheel; C4). */
let kit = 0;
const KIT_COUNT = 4, KIT_BUILD = 3;
let buildToolUses = 0, lastToolText = "";
/** C4: the build tool's primary fire: the build menu for the point the pilot stands in, or why it cannot build there. */
function useBuildTool() {
    const b = bodyRender, v = views[views.length - 1];
    if (!b)
        return;
    const st = (0, c4_ts_1.buildToolState)(ptStatics, v?.points, v?.construction, 0, b.x, b.z);
    buildToolUses++;
    lastToolText = st.text;
    if (st.ok)
        openBuild(st.point, -1, "tool");
    else {
        notify(st.text, "warn");
        snd.ui("error");
    }
}
function setKit(k) { if (k === kit)
    return; kit = k; if (kit !== 1 || rifleHeavy() || flScopeKind() !== "thermal")
    scoped = false;
else if (onFoot() && mode === "fp") {
    scoped = true;
    thermalStats.raised++;
} /* ruling 112: switching to the long rifle crouches and raises the thermal scope */ /* ruling 112: switching to the long rifle crouches and raises the thermal scope */ if (kit !== KIT_BUILD && buildPanel?.src === "tool")
    buildPanel = null; snd.ui("click"); }
const KIT_NAMES = ["Carbine", "Long rifle", "Repair torch", "Build tool"];
// ------------------------------------------------------------------ Frontline stage 2: the pilot kit (sim fkit.ts)
const FL = data.constants.frontline ?? null;
const FL_DEFAULT = FL ? FL.defaultKit : null;
let flKit = (() => { try {
    const k = JSON.parse(localStorage.getItem("frontline.kit") ?? "null");
    if (FL && k && FL.roles[k.role] && FL.guns[k.gun] && FL.grenades[k.grenade] && FL.armour[k.armour])
        return { ...FL.defaultKit, ...k, slot3: FL.slot3?.[k.slot3] ? k.slot3 : FL.defaultKit.slot3, calls: Array.isArray(k.calls) ? k.calls : FL.defaultKit.calls };
}
catch { /* no storage */ } return FL_DEFAULT ? { ...FL_DEFAULT } : null; })();
/**
 * Frontline unlocks (designer 19 Nov: "revise all the token unlocks"): the kit's choices map onto the profile's unlock
 * pools. A choice that is not owned falls back to the standard kit's.
 */
const FL_POOL = { gun: "flGuns", laser: "flType", role: "flSlot2", grenade: "flGrenades", armour: "flArmour", slot3: "flSlot3", calls: "flCalls" };
const flPoolId = (key, val) => key === "laser" ? (val === "1" || val === true ? "laser" : "kinetic") : val;
const flOwns = (key, val) => progression_ui_ts_1.c7a.flOwns(FL_POOL[key], flPoolId(key, val));
function flKitSanitize() {
    if (!FL || !flKit)
        return;
    const D = FL.defaultKit;
    for (const key of ["gun", "role", "grenade", "armour", "slot3"])
        if (!flOwns(key, flKit[key]))
            flKit[key] = D[key];
    if (flKit.laser && !flOwns("laser", true))
        flKit.laser = false;
    flKit.calls = (flKit.calls ?? []).filter((c) => flOwns("calls", c));
    for (const c of D.calls)
        if (flKit.calls.length < 4 && !flKit.calls.includes(c))
            flKit.calls.push(c);
}
let flUnlockArmed = "";
/** Weapon index of the kit's slot 1 gun, slot 2 role weapon and grenade. */
function flWeapons(k = flKit) {
    if (!FL || !k)
        return null;
    const g = FL.guns[k.gun];
    return { gun: cd.weaponIds.indexOf(k.laser ? g.laser : g.kinetic), role: cd.weaponIds.indexOf(FL.roles[k.role].weapon), grenade: cd.weaponIds.indexOf(FL.grenades[k.grenade].weapon) };
}
/** Shots per heat cell of a laser kit gun (0: not one). */
function flCellShots(w) {
    if (!FL || w < 0)
        return 0;
    const raw = data.weapons[w];
    return Object.values(FL.guns).some((g) => g.laser === raw.id) || (FL.laserGuns ?? []).includes(raw.id) ? 1 : 0; // a laser's rounds are its cells
}
let flGrenadeUntil = 0;
/** The scope of the weapon in hand: "thermal" (the long rifle: Ironfall, and Frontline's Sniper), "plain" (Frontline's marksman rifle, slot 1), or null (no scope). */
function flScopeKind() {
    if (!isFrontline())
        return kit === 1 ? "thermal" : null;
    if (kit === 1 && flKit && flKit.role === "sniper")
        return "thermal";
    if (kit === 0 && flKit && flKit.gun === "marksman")
        return "plain";
    return null;
}
/** Lane the Mule takes the pilot to after a respawn (0 top, 1 mid, 2 bottom). */
let flLane = 1;
const flName = (w) => (w >= 0 && data.weapons[w] ? data.weapons[w].name : "?");
function flApplyNames() {
    const w = flWeapons();
    if (!w || !isFrontline())
        return;
    KIT_NAMES[0] = flName(w.gun);
    KIT_NAMES[1] = flName(w.role);
}
function isFrontline() { return !!(0, battles_ts_1.battleOf)(config.battle).scenario.lanes && (0, scenario_ts_1.isSkirmish)(config.scenario, config.units); }
function flSave() { try {
    localStorage.setItem("frontline.kit", JSON.stringify(flKit));
}
catch { /* no storage */ } }
/** Frontline: rounds (kinetic) or heat cells (laser) of the pilot's slot 1, slot 2 and grenade, from the body's ammo record. */
/**
 * Frontline: the heat of the own laser gun (slot 1 laser versions; the sim's ruling 91 heat on the body's first heat
 * mount, sent as the body's laser record): a bar under the reticle while it is warm, red from 75 %, and the lock-out
 * countdown when it overheated. Also a HEAT line for the weapons panel.
 */
let flHeatEl = null;
function flHeatNow(v, p) {
    const w = flWeapons();
    if (!v || !p || !w || !onFoot() || flCellShots(w.gun) <= 0)
        return null;
    const L = v.lasers?.get(p.entity);
    return { heat: L ? L.heat : 0, over: L ? L.overheated : false, lockS: L ? L.lockTicks * dt : 0 };
}
function flHeatHud(v, p) {
    if (!flHeatEl) {
        flHeatEl = document.createElement("div");
        flHeatEl.style.cssText = "position:fixed;left:50%;top:calc(50% + 34px);transform:translateX(-50%);width:120px;pointer-events:none;font:600 10px/1.2 system-ui,sans-serif;letter-spacing:.08em;color:#bfe9ff;text-align:center;text-shadow:0 1px 2px #000;z-index:5;display:none";
        flHeatEl.innerHTML = '<div class="t"></div><div style="height:5px;background:rgba(0,0,0,.45);border:1px solid rgba(160,220,255,.5);margin-top:2px"><b style="display:block;height:100%;width:0;background:#5fd0ff"></b></div>';
        document.body.appendChild(flHeatEl);
    }
    // the shoulder laser cannon (slot 3): a long power meter, one segment per cell, while it is in hand
    const lc = isFrontline() && kit === 2 && onFoot() && heavyNow() === CONT_BEAM && v && p ? v.ammo?.get(p.entity)?.mounts.find((x) => x.mount === 2) : undefined;
    if (lc) { // a long heat bar; the power (cells left) in its caption
        const full = lc.full || 1, f = Math.max(0, Math.min(1, lc.left / full)), cells = FL?.heatCells ?? 4;
        const L = v.lasers?.get(p.entity), heat = L ? L.heat : 0, over = L ? L.overheated : false, lockS = L ? L.lockTicks * dt : 0, red = over || heat >= 0.75;
        flHeatEl.style.display = "block";
        flHeatEl.style.width = "340px";
        const bar = flHeatEl.querySelector("b"), t = flHeatEl.querySelector(".t");
        bar.style.width = `${Math.round((over ? 1 : heat) * 100)}%`;
        bar.style.background = over ? "#ff5a3c" : red ? "#ff9a3c" : "#5fd0ff";
        bar.parentElement.style.height = "9px";
        bar.parentElement.style.backgroundImage = "none";
        const pw = lc.left < 1 ? "NO CELLS" : `${Math.round(lc.left)} / ${Math.round(full)} cells`;
        t.textContent = over ? `LASER CANNON OVERHEATED · tap R: swap cell · ${pw}` : `LASER CANNON HEAT ${Math.round(heat * 100)}% · ${pw}`;
        t.style.color = over || f <= 0 ? "#ff8a6a" : red ? "#ffc08a" : "#bfe9ff";
        return;
    }
    flHeatEl.style.width = "120px";
    flHeatEl.querySelector("b").parentElement.style.height = "5px";
    flHeatEl.querySelector("b").parentElement.style.backgroundImage = "none";
    const h = isFrontline() && kit === 0 ? flHeatNow(v, p) : null;
    if (!h || (!h.over && h.heat <= 0.01)) {
        flHeatEl.style.display = "none";
        return;
    }
    flHeatEl.style.display = "block";
    const red = h.over || h.heat >= 0.75, bar = flHeatEl.querySelector("b"), t = flHeatEl.querySelector(".t");
    bar.style.width = `${Math.round((h.over ? 1 : h.heat) * 100)}%`;
    bar.style.background = h.over ? "#ff5a3c" : red ? "#ff9a3c" : "#5fd0ff";
    t.textContent = h.over ? `OVERHEATED · tap R: swap cell (${flCellsLeft(v, p, 0)} left)` : `HEAT ${Math.round(h.heat * 100)}%`;
    t.style.color = h.over ? "#ff8a6a" : red ? "#ffc08a" : "#bfe9ff";
}
function flCellsLeft(v, p, m) { const r = v && p ? v.ammo?.get(p.entity)?.mounts.find((x) => x.mount === m) : undefined; return r ? Math.max(0, Math.round(r.left)) : 0; }
function flAmmoHtml(v, p) {
    const a = v && p ? v.ammo?.get(p.entity) : undefined, w = flWeapons();
    if (!w)
        return "";
    const hn = flHeatNow(v, p), heatRow = hn ? `<div style="display:flex;justify-content:space-between;gap:8px${hn.over ? ";color:#ff8a6a" : hn.heat >= 0.75 ? ";color:#ffc08a" : ""}"><span>1 heat</span><b>${hn.over ? "OVERHEATED · R: swap cell" : `${Math.round(hn.heat * 100)}%`}</b></div>` : "";
    const line = (label, wi, m) => {
        const r = a?.mounts.find((x) => x.mount === m), cs = flCellShots(wi);
        if (!r)
            return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${label}</span><b>∞</b></div>`;
        const txt = cs > 0 ? `${Math.ceil(r.left / cs)} / ${Math.round((r.full || cs * (FL.heatCells ?? 4)) / cs)} cells` : r.left <= 0 ? "EMPTY" : `${r.left} / ${r.full}`;
        return `<div style="display:flex;justify-content:space-between;gap:8px${r.left <= 0 ? ";color:#ff8a6a" : ""}"><span>${label}</span><b>${txt}</b></div>`;
    };
    const nm = a?.mounts.length ? Math.max(...a.mounts.map((x) => x.mount)) : 2;
    const h3 = heavyNow();
    return `<div class="note" style="margin-top:4px">${line("1 " + flName(w.gun), w.gun, 0)}${heatRow}${line("2 " + flName(w.role), w.role, 1)}${h3 >= 0 ? line("3 " + flName(h3), h3, 2) : ""}${line("G " + flName(w.grenade), w.grenade, nm)}<div>refill: stand by your Command Core or Barracks</div></div>`;
}
/** Frontline: is the player's pilot (on foot or in a vehicle) within 120 m of its own Command Core? */
function flAtCore() {
    const b = bodyRender;
    if (!b)
        return false;
    for (const e of rendered)
        if (e.team === 0 && cd.typeIds[e.type] === "command-core" && Math.hypot(e.x - b.x, e.z - b.z) < 120)
            return true;
    return false;
}
/** A kit button was clicked (start card or the in-game panel). */
function flPickerClick(e) {
    const b = e.target.closest("button[data-k]");
    if (!b)
        return;
    e.stopPropagation();
    if (started && !flAtCore()) {
        notify("LOADOUT · return to your Command Core to change it", "warn");
        snd.ui("error");
        return;
    }
    const key = b.dataset.k, val = b.dataset.v;
    if (!flOwns(key, val)) { // a locked option: the first click arms the unlock, the second spends the tokens
        const pool = FL_POOL[key], id = flPoolId(key, val), tag = `${pool}:${id}`, cost = progression_ui_ts_1.c7a.flCost(pool, id);
        if (flUnlockArmed !== tag) {
            flUnlockArmed = tag;
            if (progression_ui_ts_1.c7a.flTokens() < cost) {
                notify(`LOCKED · ${cost} token${cost === 1 ? "" : "s"} to unlock · you have ${progression_ui_ts_1.c7a.flTokens()} · earn them by ranking up`, "warn");
                snd.ui("error");
            }
            else
                snd.ui("click");
            flRenderPicker();
            return;
        }
        const r = progression_ui_ts_1.c7a.flUnlock(pool, id);
        flUnlockArmed = "";
        if (!r.ok) {
            notify(r.reason === "noTokens" ? `Not enough tokens (${cost} needed)` : `Cannot unlock: ${r.reason}`, "warn");
            snd.ui("error");
            flRenderPicker();
            return;
        }
        notify(`UNLOCKED · ${b.querySelector(".lo-n")?.textContent ?? id}`, "info");
    }
    flUnlockArmed = "";
    if (key === "calls") { // pick up to 4 call-downs (a fifth replaces the oldest pick)
        const c = flKit.calls.slice(), i = c.indexOf(val);
        if (i >= 0)
            c.splice(i, 1);
        else {
            c.push(val);
            if (c.length > 4)
                c.shift();
        }
        flKit.calls = c;
    }
    else
        flKit[key] = key === "laser" ? val === "1" : val;
    flSave();
    send({ t: "flKit", kit: flKit }); // the running sim re-arms the pilot (at the Core)
    flApplyNames();
    flRenderPicker();
    snd.ui("click");
}
function flPickerHtml() {
    const w = flWeapons();
    flKitSanitize();
    const lock = !progression_ui_ts_1.c7a.flAny() ? null : { owns: flOwns, cost: (key, val) => progression_ui_ts_1.c7a.flCost(FL_POOL[key], flPoolId(key, val)), tokens: progression_ui_ts_1.c7a.flTokens(), armed: flUnlockArmed, pool: (key, val) => `${FL_POOL[key]}:${flPoolId(key, val)}` };
    return (0, loadout_ui_ts_1.loadoutHtml)(FL, flKit, data, lock) // designer 19 Nov: numbered steps in groups, icon cards (no Role: slot 2 is chosen); locked cards: token unlocks
        + (started ? `<div class="battleSub">1 ${flName(w.gun)} · 2 ${flName(w.role)} · G ${flName(w.grenade)} · ${FL.armour[flKit.armour].name} armour</div>` : ""); // designer 20 Nov: the start card's picker already shows the kit
}
/** 4c / 4d: who fights beside and against you at the chosen difficulty (start card). */
function flSquadLine() {
    const AP = FL.aiPilots, by = AP?.byDifficulty?.[difficulty] ?? AP ?? {}, e = by.enemies ?? 4, guests = (() => { try { return mp.active ? Math.max(0, roster.length - 1) : 0; } catch { return 0; } })(), a = Math.max(0, (by.allies ?? 3) - guests);
    if (!AP)
        return "";
    const names = ["Vance (Sniper)", "Okoro (Heavy)", "Reyes (Medic)"].slice(0, a).join(", ");
    return `<div class="battleSub">SQUAD · you${guests ? ` + ${guests} player${guests > 1 ? "s" : ""}` : ""}${a ? ` + ${names}` : ""} against ${e} Hegemony pilots · a player who joins takes an AI teammate's place</div>`;
}
/** The loadout picker on the start card and, while open, the in-game loadout panel (K at the Command Core). */
function flRenderPicker() {
    let el = $("flKit");
    if (!FL || !flKit) {
        if (el)
            el.remove();
        return;
    }
    if (!el) {
        el = document.createElement("div");
        el.id = "flKit";
        el.style.cssText = "margin:2px 0";
        const slot = $("loSlot"); // the start card's Loadout section
        if (slot)
            slot.appendChild(el);
        else
            $("battleSub").after(el);
        el.addEventListener("click", flPickerClick);
    }
    el.innerHTML = flPickerHtml();
    { const sq = document.getElementById("stSquad"); if (sq) sq.innerHTML = started ? "" : flSquadLine(); } // designer 20 Nov: the squad line sits under Pilot
    flRenderPanel();
}
let flPanelOpen = false;
/**
 * Frontline 4a: the AI support panel (O): the team's ore / gas priority and a lane support request (90 s; the lane most of
 * the team asked for gets half of every wave, and the next wave leaves at once).
 */
let flSupOpen = false, flPrio = "balanced", flReq = null;
const FL_LANES = ["TOP", "MID", "BOTTOM"];
function flRenderSupport() {
    let el = $("flSupPanel");
    if (!flSupOpen) {
        if (el)
            el.style.display = "none";
        return;
    }
    if (!el) {
        el = document.createElement("div");
        el.id = "flSupPanel";
        el.className = "panel card";
        el.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:23;pointer-events:auto;padding:14px 18px;max-width:94vw;text-align:center;min-width:420px";
        document.body.appendChild(el);
        el.addEventListener("click", (ev) => {
            const b = ev.target.closest("button[data-sup]");
            if (!b)
                return;
            const k = b.dataset.sup, v = b.dataset.v;
            if (k === "prio") {
                flPrio = v;
                send({ t: "flPriority", p: v });
                notify(`AI PRIORITY · ${v.toUpperCase()}${v === "ore" ? " · more harvesters, squads take ore fields" : v === "gas" ? " · extractors pump harder, squads take gas vents" : " · ore and gas as needed"}`, "good");
            }
            else if (k === "lane") {
                const lane = +v;
                flReq = { lane, until: performance.now() + 90000 };
                send({ t: "flRequest", lane });
                notify(`SUPPORT REQUESTED · ${FL_LANES[lane]} lane · the next wave leaves now and half of each wave goes there (90 s)`, "good");
            }
            snd.ui("click");
            flRenderSupport();
        });
    }
    const left = flReq ? Math.ceil((flReq.until - performance.now()) / 1000) : 0;
    if (left <= 0)
        flReq = null;
    const btn = (k, v, label, on) => `<button data-sup="${k}" data-v="${v}" class="${on ? "on" : ""}" style="margin:3px">${label}</button>`;
    el.style.display = "block";
    el.innerHTML = `<div class="where" style="margin:0 0 8px;padding:4px 8px;font-size:12px;border-left:3px solid #7dc8ff;text-align:left">AI COMMANDER · your base builds and sends the waves; tell it what you need</div>`
        + `<div class="diffRow" style="margin:6px 0"><span class="label" style="min-width:110px">Resources</span>${btn("prio", "balanced", "BALANCED", flPrio === "balanced")}${btn("prio", "ore", "ORE FIRST", flPrio === "ore")}${btn("prio", "gas", "GAS FIRST", flPrio === "gas")}</div>`
        + `<div class="diffRow" style="margin:6px 0"><span class="label" style="min-width:110px">Request support</span>${FL_LANES.map((n, i) => btn("lane", i, `${n} LANE`, flReq?.lane === i)).join("")}</div>`
        + `<div class="note2">${flReq ? `${FL_LANES[flReq.lane]} lane support · ${left} s left · ` : ""}O or Esc to close</div>`;
}
function flToggleSupport() {
    if (isFrontline()) { // Frontline 4b: the support controls live on the Tab command map now
        if (started && !pauseOn && !matchLocked())
            setMode(mode === "cmd" ? "fp" : "cmd");
        return;
    }
    flSupOpen = !flSupOpen;
    snd.ui("click");
    flRenderSupport();
    if (flSupOpen) {
        fpBuilding = 0;
        rideMenu = false;
        unlock();
    }
    else if (mode === "fp")
        lockPointer();
}
/**
 * Frontline 4b: the Tab command map. View only: the AI commander runs the base, so there is no selection, order or
 * production here. LMB drops an ATTACK ping, RMB a DEFEND ping, Shift+click a DANGER ping (P / Shift+P in first person:
 * look / need help). Pings go to the sim (30 s; the team's AI pilots answer them) and show in the world for everyone.
 * The lanes are drawn with their unit counts; click a lane's label (or 1-3) to request support there. The side panel
 * holds the ore / gas priority, the requests and the wave clock.
 */
let flSimPings = [], flWaveNow = null, flLaneScreen = [], flBotsNow = [], flDownedEnts = new Set(), flDownDrawn = 0;
const flMapStats = { pings: 0, requests: 0, laneDots: 0, pingDots: 0, iconSegs: 0, panel: "" };
const FL_PING = {
    attack: { label: "ATTACK HERE", col: [1, 0.36, 0.26], css: "#ff6a50" },
    defend: { label: "DEFEND HERE", col: [0.36, 0.8, 1], css: "#5ac8ff" },
    look: { label: "DANGER", col: [1, 0.82, 0.2], css: "#ffd23c" },
    help: { label: "NEED HELP", col: [0.5, 1, 0.55], css: "#7dff9a" },
};
function flLanePaths() { return (0, battles_ts_1.battleOf)(config.battle).scenario.lanes?.paths ?? []; }
function flPing(x, z, kind) {
    if (!FL_PING[kind])
        return;
    flMapStats.pings++;
    if (mp.active)
        mp.ping(x, z, kind); // comes back to every page (and to the host's sim) through the relay
    else {
        send({ t: "flPing", x, z, kind });
        notify(`PING · ${FL_PING[kind].label} (${Math.round(x)}, ${Math.round(z)})`, "info");
        snd.ui("click");
    }
}
function flRequestLane(lane) {
    if (!(lane >= 0 && lane < flLanePaths().length))
        return;
    flMapStats.requests++;
    flReq = { lane, until: performance.now() + 90000 };
    send({ t: "flRequest", lane });
    notify(`SUPPORT REQUESTED · ${FL_LANES[lane] ?? lane} lane · the next wave leaves now and half of each wave goes there (90 s)`, "good");
    snd.ui("click");
}
function flSetPriority(v) {
    flPrio = v;
    send({ t: "flPriority", p: v });
    notify(`AI PRIORITY · ${v.toUpperCase()}${v === "ore" ? " · more harvesters, squads take ore fields" : v === "gas" ? " · extractors pump harder, squads take gas vents" : " · ore and gas as needed"}`, "good");
    snd.ui("click");
}
/** A click on the map (command view, Frontline): a lane label requests support, else a ping. */
function flMapClick(e) {
    if (e.button === 1) {
        midDrag = { x: e.clientX };
        e.preventDefault();
        return;
    }
    for (let i = 0; i < flLaneScreen.length; i++) {
        const q = flLaneScreen[i];
        if (q && Math.abs(e.clientX - q[0]) < 70 && Math.abs(e.clientY - q[1]) < 18) {
            flRequestLane(i);
            return;
        }
    }
    const g = groundAt(e.clientX, e.clientY);
    if (!g)
        return;
    flPing(g[0], g[2], e.shiftKey ? "look" : e.button === 2 ? "defend" : "attack");
}
/** Keys on the Frontline map: 1-3 request a lane; WASD / wheel / MMB move the camera as before. */
function flMapKey(code) {
    const d = /^Digit([1-3])$/.exec(code);
    if (d)
        flRequestLane(Number(d[1]) - 1);
}
/** Lanes (command view) and pings (both views), drawn as dots on the ground. */
function flMapDraw(now) {
    flMapStats.laneDots = flMapStats.pingDots = 0;
    if (!isFrontline() || !started)
        return;
    const cmdV = mode === "cmd", k = cmdV ? Math.max(1.5, cmd.dist * 0.009) : 1;
    if (cmdV) {
        const W = flWaveNow, paths = flLanePaths();
        paths.forEach((pth, i) => {
            const pts = pth.points, focus = W && W.focus === i, col = focus ? [1, 0.82, 0.25] : [0.55, 0.9, 1], step = Math.max(8, k * 3.2);
            let carry = 0;
            for (let j = 0; j + 1 < pts.length; j++) {
                const [x0, z0] = pts[j], [x1, z1] = pts[j + 1], L = Math.hypot(x1 - x0, z1 - z0);
                for (let d = carry; d < L; d += step) {
                    const x = x0 + (x1 - x0) * d / L, z = z0 + (z1 - z0) * d / L, ph = ((d + j * 97) / step + now / 260) % 6 < 1 ? 1.5 : 1;
                    fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1, z, k * 0.9 * ph, col, focus ? 0.9 : 0.55);
                    flMapStats.laneDots++;
                }
                carry = 0;
            }
        });
    }
    for (const [x, z, kind, , left] of flSimPings) {
        const P = FL_PING[kind];
        if (!P)
            continue;
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), pulse = 0.6 + 0.4 * Math.sin(now / 180), r = cmdV ? Math.max(8, k * 3.5) : 5;
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2 + now / 1200, rx = x + Math.cos(a) * r * (0.85 + 0.15 * pulse), rz = z + Math.sin(a) * r * (0.85 + 0.15 * pulse);
            fx.dot(rx, (0, terrain_gen_ts_1.sampleHeight)(hm, rx, rz) + 0.5, rz, cmdV ? k * 0.8 : 0.35, P.col, 0.85);
            flMapStats.pingDots++;
        }
        if (!cmdV) // a pillar so it can be seen across the map
            for (let i = 0; i < 14; i++) {
                fx.dotKeep(x, gy + 1 + i * 2.2, z, 0.5 - i * 0.022, P.col, (0.75 - i * 0.04) * pulse);
                flMapStats.pingDots++;
            }
    }
}
/** The lane labels (command view; click one to request support) and the ping labels, in the tag pass. */
function flMapTags() {
    flLaneScreen = [];
    if (!isFrontline() || !started)
        return;
    const cmdV = mode === "cmd", W = flWaveNow;
    if (cmdV)
        flLanePaths().forEach((pth, i) => {
            const pts = pth.points, mid = pts[Math.floor(pts.length / 2)], y = (0, terrain_gen_ts_1.sampleHeight)(hm, mid[0], mid[1]) + 4, focus = W && W.focus === i;
            const n = W?.lanes?.[i] ?? 0, name = `${FL_LANES[i] ?? pth.name} LANE`;
            if (tag(mid[0], y, mid[1], `${name} · ${n} unit${n === 1 ? "" : "s"}${focus ? ` · SUPPORT ${W.left} s` : " · click: request support"}`, focus ? "flLaneTag on" : "flLaneTag"))
                flLaneScreen[i] = toScreen(mid[0], y, mid[1]);
        });
    for (const [x, z, kind, , left] of flSimPings) {
        const P = FL_PING[kind];
        if (!P)
            continue;
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), dist = Math.round(Math.hypot(x - eye[0], z - eye[2]));
        tag(x, gy + (cmdV ? Math.max(8, cmd.dist * 0.035) : 32), z, `<b style="color:${P.css}">◆ ${P.label}</b>${cmdV ? "" : ` · ${dist} m`} · ${left} s`, "pingTag");
    }
}
/** Frontline 4b: the lanes (grey dashes, the support lane amber) and the pings (diamonds) as tactical icon segments. */
const FL_PING_TEAM = { attack: 1, defend: 0, look: 3, help: 4 };
function flMapIcons() {
    flMapStats.iconSegs = 0;
    if (!isFrontline() || !started || wire <= 0.01)
        return;
    const A = [0, 0, 0], B = [0, 0, 0];
    const seg = (x, y, z, ax, ay, bx, by, team, a, w = 2) => {
        iconBuf = grow(iconBuf, (iconSegs + 1) * render_ts_1.ICON_FLOATS);
        const o = iconSegs++ * render_ts_1.ICON_FLOATS;
        iconBuf[o] = x;
        iconBuf[o + 1] = y;
        iconBuf[o + 2] = z;
        iconBuf[o + 3] = w;
        iconBuf[o + 4] = ax;
        iconBuf[o + 5] = ay;
        iconBuf[o + 6] = bx;
        iconBuf[o + 7] = by;
        iconBuf[o + 8] = team;
        iconBuf[o + 9] = a;
        iconBuf[o + 10] = 0;
        iconBuf[o + 11] = 0;
        flMapStats.iconSegs++;
    };
    const W = flWaveNow, now = performance.now();
    flLanePaths().forEach((pth, i) => {
        const pts = pth.points, focus = W && W.focus === i, step = 40;
        for (let j = 0; j + 1 < pts.length; j++) {
            const [x0, z0] = pts[j], [x1, z1] = pts[j + 1], L = Math.hypot(x1 - x0, z1 - z0);
            for (let d = 0; d < L; d += step) {
                const e = Math.min(L, d + step * 0.6), xa = x0 + (x1 - x0) * d / L, za = z0 + (z1 - z0) * d / L, xb = x0 + (x1 - x0) * e / L, zb = z0 + (z1 - z0) * e / L;
                const ya = (0, terrain_gen_ts_1.sampleHeight)(hm, xa, za) + 1, yb = (0, terrain_gen_ts_1.sampleHeight)(hm, xb, zb) + 1;
                (0, math_ts_1.project)(vp, xa, ya, za, A);
                (0, math_ts_1.project)(vp, xb, yb, zb, B);
                if (A[2] <= 0.05 || B[2] <= 0.05)
                    continue;
                seg(xa, ya, za, 0, 0, (B[0] - A[0]) * cssW / 2, (B[1] - A[1]) * cssH / 2, focus ? 3 : 2, wire * (focus ? 0.95 : 0.6), focus ? 3.2 : 2);
            }
        }
    });
    for (const [x, z, kind] of flSimPings) {
        const t = FL_PING_TEAM[kind];
        if (t === undefined)
            continue;
        const y = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1, r = 13 + 4 * Math.sin(now / 160);
        (0, math_ts_1.project)(vp, x, y, z, A);
        if (A[2] <= 0.05)
            continue;
        const d = [[0, r], [r, 0], [0, -r], [-r, 0]];
        for (let i = 0; i < 4; i++)
            seg(x, y, z, d[i][0], d[i][1], d[(i + 1) % 4][0], d[(i + 1) % 4][1], t, wire, 2.6);
        seg(x, y, z, 0, r * 0.35, 0, -r * 0.35, t, wire, 2.6);
        seg(x, y, z, -r * 0.35, 0, r * 0.35, 0, t, wire, 2.6);
    }
}
/**
 * Frontline 4d: the match's pace in the top line: points held, the next escalation, and the Core bleed (from 16 min the
 * side holding fewer points loses Core hull; in sudden death a tie bleeds both). A notice at each change of phase.
 */
let flPhaseSeen = 0, flBleedSeen = -1;
const flMinSec = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
function flPaceHtml() {
    const W = flWaveNow;
    if (!isFrontline() || !W || W.phase === undefined)
        return "";
    if (W.phase > flPhaseSeen) {
        flPhaseSeen = W.phase;
        notify(W.phase === 1 ? "THE WAVES SPEED UP · a wave every 30 s" : W.phase === 2 ? "THE PUSH · waves now march past the points straight at the Cores" : "SUDDEN DEATH · Command Cores take double damage", "warn");
        snd.sting("threat");
    }
    if (W.bleeding !== flBleedSeen) {
        if (W.bleeding === 0)
            notify("YOUR CORE IS BLEEDING · the Hegemony holds more points: take them back", "warn");
        else if (W.bleeding === 1)
            notify("THE HEGEMONY CORE IS BLEEDING · you hold more points: keep them", "good");
        flBleedSeen = W.bleeding;
    }
    const [a, b] = W.held, next = W.phase === 0 ? `waves speed up in ${flMinSec(W.toFast)}` : W.phase === 1 ? `the push in ${flMinSec(W.toPush)}` : W.toBleed > 0 ? `Core bleed in ${flMinSec(W.toBleed)}` : W.phase === 2 ? `sudden death in ${flMinSec(W.toSudden)}` : "SUDDEN DEATH";
    const bleed = W.toBleed > 0 ? "" : W.bleeding === 0 ? ` · <b style="color:#ff6a50">YOUR CORE ${W.cores[0]}% · BLEEDING</b>` : W.bleeding === 1 ? ` · <b style="color:#7dff9a">HEGEMONY CORE ${W.cores[1]}% · BLEEDING</b>` : W.bleeding === 2 ? ` · <b style="color:#ffd23c">BOTH CORES BLEEDING ${W.cores[0]}% / ${W.cores[1]}%</b>` : ` · Cores ${W.cores[0]}% / ${W.cores[1]}%`;
    return `<div class="flPace" style="font-size:12px;opacity:0.9;margin-top:2px">POINTS <b style="color:#7dc8ff">${a}</b> – <b style="color:#ff7a5a">${b}</b> · ${next}${bleed}</div>`;
}
/** The side panel of the Frontline map: the AI commander's controls and state. */
function flMapPanel() {
    let el = $("flMapPanel");
    const on = isFrontline() && started && mode === "cmd";
    if (!on) {
        if (el && el.style.display !== "none")
            el.style.display = "none";
        return;
    }
    if (!el) {
        el = document.createElement("div");
        el.id = "flMapPanel";
        el.className = "panel";
        document.body.appendChild(el);
        el.addEventListener("mousedown", (ev) => ev.stopPropagation());
        el.addEventListener("click", (ev) => {
            const b = ev.target.closest("button[data-sup]");
            if (!b)
                return;
            if (b.dataset.sup === "prio")
                flSetPriority(b.dataset.v);
            else if (b.dataset.sup === "lane")
                flRequestLane(+b.dataset.v);
        });
    }
    const W = flWaveNow, prio = W?.prio ?? flPrio, btn = (k, v, label, on2) => `<button data-sup="${k}" data-v="${v}" class="${on2 ? "on" : ""}">${label}</button>`;
    const pingRows = flSimPings.map(([x, z, kind, , left]) => `<div class="pr"><b style="color:${FL_PING[kind]?.css ?? "#fff"}">◆ ${FL_PING[kind]?.label ?? kind}</b> <span>${Math.round(x)}, ${Math.round(z)} · ${left} s</span></div>`).join("");
    const h = `<div class="ph">COMMAND MAP · view only</div><div class="pn">Your AI commander builds the base and sends the waves. Ping the map and tell it what you need.</div>`
        + `<div class="ps">WAVES</div><div class="pn">${W ? `next wave in <b>${W.next} s</b> · ${FL_LANES.map((n, i) => `${n} ${W.lanes?.[i] ?? 0}`).join(" · ")}` : "—"}</div>`
        + `<div class="ps">REQUEST SUPPORT <small>(1-3)</small></div><div class="pb">${FL_LANES.map((n, i) => btn("lane", i, n, W?.focus === i)).join("")}</div>`
        + `${W && W.focus >= 0 ? `<div class="pn">${FL_LANES[W.focus]} gets half of each wave · ${W.left} s left</div>` : ""}`
        + `<div class="ps">RESOURCES</div><div class="pb">${btn("prio", "balanced", "BALANCED", prio === "balanced")}${btn("prio", "ore", "ORE", prio === "ore")}${btn("prio", "gas", "GAS", prio === "gas")}</div>`
        + `<div class="ps">PINGS</div><div class="pn"><b>LMB</b> attack · <b>RMB</b> defend · <b>Shift+click</b> danger · in first person <b>P</b> look, <b>Shift+P</b> need help</div>${pingRows}`
        + (flTeamRows ? flTeamRows() : "");
    if (el.dataset.h !== h) {
        el.innerHTML = h;
        el.dataset.h = h;
        flMapStats.panel = el.textContent ?? "";
    }
    el.style.display = "block";
}
/** 4c: the AI pilots in the map panel: your squad (name, role, lane, what it is doing) and the Hegemony's pilots. */
const FL_ROLE = { sniper: "Sniper", assault: "Assault", heavy: "Heavy", medic: "Medic" };
function flBotDoing(st, mode) {
    if (st === "dead")
        return "respawning";
    if (st === "downed")
        return "DOWN · revive them";
    if (st === "riding")
        return "riding to the lane";
    if (mode.startsWith("ping:"))
        return `answering your ping`;
    if (mode === "retreat")
        return "falling back";
    return st === "driving" ? "driving the lane" : "pushing the lane";
}
let flTeamRows = () => {
    if (!flBotsNow.length)
        return "";
    const row = (q) => `<div class="tm"><span><b>${q[1]}</b> ${FL_ROLE[q[3]] ?? q[3]} · ${FL_LANES[q[4]] ?? ""}</span><span>${flBotDoing(q[5], q[6])}${q[8] >= 0 ? ` · ${q[8]}%` : ""}</span></div>`;
    const mine = flBotsNow.filter((q) => q[2] === 0), foe = flBotsNow.filter((q) => q[2] !== 0);
    return `<div class="ps">YOUR SQUAD</div>${mine.map(row).join("")}<div class="ps">HEGEMONY PILOTS</div><div class="pn">${foe.map((q) => `${q[1]} (${FL_ROLE[q[3]] ?? q[3]}${q[5] === "dead" ? ", down" : ""})`).join(" · ")}</div>`;
};
/** A live player past the host takes an AI teammate's place (sim: flbots seats): say who stepped out or came back. */
let flSquadSeen = null;
let flDownSeen = new Set();
function flSquadNotice() {
    const down = new Set(flBotsNow.filter((q) => q[2] === 0 && q[5] === "downed").map((q) => q[1]));
    for (const n of down)
        if (!flDownSeen.has(n)) {
            const q = flBotsNow.find((r) => r[1] === n), e = q && q[7] ? renderedById.get(q[7]) : undefined;
            notify(`${n.toUpperCase()} IS DOWN${e ? ` · ${Math.round(Math.hypot(e.x - eye[0], e.z - eye[2]))} m` : ""} · revive within ${q?.[10] ?? 30} s (hold E beside them)`, "warn");
        }
    flDownSeen = down;
    const now = flBotsNow.filter((q) => q[2] === 0).map((q) => q[1]);
    if (flSquadSeen && flBotsNow.length) {
        for (const n of flSquadSeen)
            if (!now.includes(n))
                notify(`${n.toUpperCase()} (AI) STEPS OUT · a player has taken the place`, "info");
        for (const n of now)
            if (!flSquadSeen.includes(n))
                notify(`${n.toUpperCase()} (AI) JOINS THE SQUAD · a player's place is free`, "info");
    }
    if (flBotsNow.length)
        flSquadSeen = now;
}
/** 4c: name tags over the AI pilots (and their vehicles). */
function flBotTags() {
    if (!isFrontline() || !started)
        return;
    for (const q of flBotsNow) {
        const e = q[7] ? renderedById.get(q[7]) : undefined;
        if (!e)
            continue;
        if (q[5] === "downed" && q[2] === 0) { // a downed team-mate: where, how long, and that you can bring them back
            const dist = Math.round(Math.hypot(e.x - eye[0], e.z - eye[2]));
            tag(e.x, e.cy + 2.4, e.z, `<b>✚ ${q[1]} DOWN</b> · ${q[10]} s · ${dist} m${q[11] > 0 ? ` · reviving ${q[11]}%` : " · hold <b>E</b> to revive"}`, "pingTag flBot downed");
            continue;
        }
        if (q[5] === "downed") { // a downed Hegemony pilot: lying there for its bleed-out (or a Hegemony reviver)
            tag(e.x, e.cy + 1.4, e.z, `◆ ${q[1]} DOWN · ${q[10]} s${q[11] > 0 ? ` · being revived ${q[11]}%` : ""}`, "nameTag flBot enemy");
            continue;
        }
        tag(e.x, e.cy + cd.tRadius[e.type] + 1.6, e.z, `${q[2] === 0 ? "" : "◆ "}${q[1]} <small>${FL_ROLE[q[3]] ?? ""}</small>`, q[2] === 0 ? "nameTag flBot" : "nameTag flBot enemy");
    }
}
{
    const st = document.createElement("style");
    st.textContent = `body.flMap #orderBar, body.flMap #selInfo, body.flMap #callBar, body.flMap #resPanel, body.flMap #bgPanel, body.flMap #prod, body.flMap #c6Panel, body.flMap #build, body.flMap #hint .cmdOnly, body.flMap #selbox, body.flMap #orderMark { display: none !important; }
.flMapOnly { display: none; } body.flMap #hint .flMapOnly { display: initial; }
#flMapPanel { position: fixed; right: 12px; top: 112px; width: 290px; z-index: 22; padding: 10px 12px; pointer-events: auto; font-size: 12px; display: none; }
#flMapPanel .ph { font-weight: 700; letter-spacing: 0.08em; color: #7dc8ff; margin-bottom: 4px; }
#flMapPanel .ps { margin: 9px 0 3px; font-weight: 700; letter-spacing: 0.06em; opacity: 0.85; }
#flMapPanel .pn { opacity: 0.85; line-height: 1.35; }
#flMapPanel .pb button { margin: 2px 4px 2px 0; padding: 3px 8px; }
#flMapPanel .pb button.on { background: rgba(125, 200, 255, 0.35); border-color: #7dc8ff; }
#flMapPanel .pr { display: flex; justify-content: space-between; gap: 6px; margin-top: 2px; }
#flMapPanel .tm { display: flex; justify-content: space-between; gap: 6px; margin-top: 2px; }
.wtag.flBot { color: #7dff9a; border-color: rgba(125, 255, 154, 0.5); font-weight: 700; }
.wtag.flBot.enemy { color: #ff7a5a; border-color: rgba(255, 122, 90, 0.5); }
.wtag.flBot.downed { color: #ffd23c; border-color: #ffd23c; background: rgba(60, 40, 0, 0.75); animation: flDownPulse 0.9s ease-in-out infinite alternate; }
@keyframes flDownPulse { from { opacity: 0.75; } to { opacity: 1; } }
.wtag.flLaneTag { font-weight: 700; letter-spacing: 0.06em; color: #9fe2ff; border-color: rgba(125, 200, 255, 0.6); }
.wtag.flLaneTag.on { color: #ffd23c; border-color: #ffd23c; }`;
    document.head.appendChild(st);
    const hint = $("hint");
    if (hint) {
        const sp = document.createElement("span");
        sp.className = "flMapOnly";
        sp.innerHTML = "<b>WASD</b>/edge pan · <b>wheel</b> zoom · <b>MMB-drag</b> rotate · <b>LMB</b> ping attack · <b>RMB</b> ping defend · <b>Shift+click</b> danger · click a lane label or <b>1-3</b>: request support · <b>TAB</b> back";
        hint.appendChild(sp);
    }
}
function flRenderPanel() {
    let el = $("flKitPanel");
    if (!flPanelOpen) {
        if (el)
            el.style.display = "none";
        return;
    }
    if (!el) {
        el = document.createElement("div");
        el.id = "flKitPanel";
        el.className = "panel card";
        el.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:23;pointer-events:auto;padding:14px 18px;width:min(1080px,94vw);max-height:92vh;overflow-y:auto;text-align:center";
        document.body.appendChild(el);
        el.addEventListener("click", flPickerClick);
    }
    const here = flAtCore();
    el.style.display = "block";
    el.innerHTML = `<div class="where" style="margin:0 0 8px;padding:4px 8px;font-size:12px;border-left:3px solid ${here ? "#7dff9a" : "#ffd23c"};text-align:left">${here ? "AT THE COMMAND CORE · changes apply at once" : "AWAY FROM BASE · you can look, but changes need your Command Core"}</div>`
        + flPickerHtml() + `<div class="note2">K or Esc to close</div>`;
}
function flTogglePanel() {
    flPanelOpen = !flPanelOpen;
    snd.ui("click");
    flRenderPanel();
    if (flPanelOpen) {
        fpBuilding = 0;
        rideMenu = false;
        unlock();
    }
    else if (mode === "fp")
        lockPointer();
}
let scoped = false;
/** Space: pressed time (ms) and whether it started on the ground (tap = jump, hold = jetpack; in the air the jet starts at once). */
let spaceDown = 0, spaceOnGround = false;
/** Hold-E eject: seconds held, when the key went down. */
let ejectHeld = 0, ejectSent = false, eDown = 0;
/** Seat chosen with X before entering (on foot near a vehicle). */
let seatChoice = null;
/** First-person production panel at a building in reach (B), and the ride menu (C / Q). */
let fpBuilding = 0, rideMenu = false;
let rideCands = [];
const vp = (0, math_ts_1.mat4)(), view = (0, math_ts_1.mat4)(), proj = (0, math_ts_1.mat4)(), invVP = (0, math_ts_1.mat4)();
let eye = [0, 50, 0], target = [1, 50, 0];
let cssW = 1, cssH = 1, dpr = 1;
let fovDeg = 62;
function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cssW = Math.max(1, window.innerWidth);
    cssH = Math.max(1, window.innerHeight);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    // C8: the HUD columns scale with the window (QA4 bugs 2, 9, 23)
    const sc = (0, c8_ts_1.hudScale)(cssW, cssH);
    hudHs = sc.hs;
    hudHp = sc.hp;
    const bs = document.body.style;
    bs.setProperty?.("--hs", String(sc.hs));
    bs.setProperty?.("--hp", String(sc.hp));
    hudLayoutAt = 0;
}
let hudHs = 1, hudHp = 1, hudLayoutAt = 0;
/** C8: keep each top column clear of the bottom column on its side, and the vehicle prompt above the hint line (5 times a second). */
function layoutHud(now) {
    if (now - hudLayoutAt < 200)
        return;
    hudLayoutAt = now;
    const h = (id) => $(id).getBoundingClientRect().height;
    const tl = $("hudTL").style, tr = $("hudTR").style;
    tl.setProperty?.("--tlMax", (0, c8_ts_1.topColumnMax)(cssH, hudHs, h("hudBL")) + "px");
    tr.setProperty?.("--trMax", (0, c8_ts_1.topColumnMax)(cssH, hudHs, h("hudBR")) + "px");
    // the prompt is zoomed by the panel scale, so its offset is in its own (zoomed) pixels
    $("prompt").style.bottom = document.body.classList.contains("inVehicle") ? Math.round((h("hudBC") + 14 * hudHs + 8) / hudHp) + "px" : "";
}
window.addEventListener("resize", resize);
resize();
/** Pointer Lock (first person). A refusal (e.g. no user gesture, headless) is not an error: aiming then needs a lock later. */
function lockPointer() {
    if (document.pointerLockElement === canvas || !canvas.requestPointerLock || panelOpen())
        return;
    try {
        const r = canvas.requestPointerLock();
        if (r && typeof r.catch === "function")
            r.catch(() => { });
    }
    catch { /* old API without a promise */ }
}
document.addEventListener("pointerlockerror", () => { });
const panelOpen = () => fpBuilding !== 0 || rideMenu || helpOn || pauseOn || !!buildPanel || loOpen || prodAny.open || flPanelOpen || flSupOpen;
/** Our own pointer-lock releases (panels, command view) are expected; any other loss of the lock (Esc in the browser) pauses. */
let expectUnlock = 0;
function unlock() { if (document.pointerLockElement) {
    expectUnlock = performance.now();
    unlockPending = true;
    document.exitPointerLock();
} }
/**
 * C7b item 7 (the smoke test's "H toggles the controls panel", failing since C5): the page's own releases (H, a
 * building panel, the ride menu) were told apart from Esc only by time: an unlock seen more than 400 ms after unlock()
 * paused the game, and the pause menu cleared the help panel. On a slow frame (software rendering, a busy machine) the
 * pointerlockchange event arrives later than that. Now the release the page asked for is a flag, and with a panel open
 * the loss of the lock never pauses (Esc reaches the page then: the pointer is free).
 */
let unlockPending = false;
// Esc in pointer lock: the browser releases the lock (the key itself never reaches the page): pause to the small menu
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement)
        return;
    const asked = unlockPending;
    unlockPending = false;
    if (asked || panelOpen())
        return;
    if (cine) // the lock lost during the opening cinematic: no pause menu; Esc (now reaching the page) or holding Space skips
        return;
    if (started && mode === "fp" && !pauseOn && !matchLocked() && performance.now() - expectUnlock > 400)
        setPause(true);
});
/** Pause menu (Esc): resume / controls / volume. Single player hosts the sim, so the sim pauses with it. */
let pauseOn = false, pauseCount = 0;
function setPause(on) {
    if (on === pauseOn || !started || (on && matchLocked()))
        return;
    pauseOn = on;
    if (on) {
        pauseCount++;
        keys.clear();
        lmb = rmb = false;
        scoped = false;
        spaceDown = 0;
        send({ t: "pctl", input: null });
        lastCtl = "null";
        unlock();
        helpOn = false;
        closePanels();
    }
    else {
        lastCtl = "";
        helpOn = false;
        $("pause").querySelector(".card").style.display = "";
        if (mode === "fp")
            lockPointer();
    }
    // N1: with guests in the room the pause menu does not stop the shared battle (a hidden tab still does)
    send({ t: "pause", on: (on && !mp.shared()) || (document.hidden && !mp.shared()) });
    $("pause").style.display = on ? "flex" : "none";
    snd.ui("click");
}
const onFoot = () => !!me && me.state === sim_ts_1.P_FOOT;
const seated = () => !!me && me.state === sim_ts_1.P_SEATED;
const dead = () => !!me && me.state === sim_ts_1.P_DEAD;
/** Ruling 121: the own pilot is inside an own Citadel / Command Core (command view only, cannot be hit). */
const sheltered = () => !!me && me.state === sim_ts_1.P_SHELTER && me.seat < 0;
/** Ruling 125: the own pilot mans a turret's gun seat (a call-in sentry): first person from the gun, mouse aims, LMB fires. */
const gunSeated = () => !!me && me.state === sim_ts_1.P_SHELTER && me.seat >= 0;
const SENTRY_NAME = "Sentry gun";
const c1Stats = { manSent: 0, leaveSent: 0, entered: 0, left: 0, thrown: 0, prompt: "", crewSent: 0, crewRefused: 0, lastWhy: "", sent: 0, boarded: 0, gaveUp: 0, tags: 0, lines: 0, bar: false };
/** Ruling 125: the own call-in sentry the pilot on foot could man now (F), or null. */
function sentryNear() {
    if (!bodyRender || !onFoot())
        return null;
    let best = null, bd = Infinity;
    for (const e of rendered) {
        if (e.team !== 0 || !cd.tStructure[e.type] || e.hp <= 0 || !(0, c1_crew_ts_1.sentryAt)(zonesNow, e.x, e.z))
            continue;
        const d = Math.hypot(e.x - bodyRender.x, e.z - bodyRender.z) - cd.tRadius[e.type] - PILOT_R;
        if (d <= SHELTER_REACH && d < bd) {
            bd = d;
            best = e;
        }
    }
    return best;
}
function gunSeatEnter(t) { act({ kind: "manGun", turret: t.id }, "MAN SENTRY"); c1Stats.manSent++; snd.cue("seat"); }
function gunSeatLeave() { act({ kind: "shelter", enter: false, building: 0 }, "LEAVE SENTRY"); c1Stats.leaveSent++; snd.ui("click"); lmb = false; }
/** Ruling 125: the eye inside the gun head (as the manned Gun Tower's view), turning with the aim. */
function gunSeatEye() {
    if (!gunSeated() || !me)
        return null;
    const t = renderedById.get(me.entity);
    if (t && kindOfType[t.type] === "droppod")
        return [t.x + Math.cos(camYaw) * 1.45, t.y + 5.55, t.z + Math.sin(camYaw) * 1.45]; // ruling 130: in the drop pod's head, behind the mantlet
    return t ? [t.x - Math.cos(camYaw) * 0.5, t.y + 9.5, t.z - Math.sin(camYaw) * 0.5] : null;
}
/** Ruling 124: "CREW THIS": the nearest free AI pilot (on foot or from the reserve) walks to the own vehicle under the reticle. */
function crewThis() {
    const dir = viewDir();
    const cands = rendered.map((e) => ({ id: e.id, type: e.type, team: e.team, x: e.x, y: e.cy, z: e.z, crew: e.crew }));
    const t = (0, c1_crew_ts_1.crewLookTarget)(cd, cands, eye, dir, seated() && me ? me.entity : 0), why = (0, c1_crew_ts_1.crewWhy)(cd, t);
    if (why || !t) {
        c1Stats.crewRefused++;
        c1Stats.lastWhy = why ?? "";
        notify(`CREW THIS · ${why}`, "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "dispatch", vehicle: t.id, pilots: [], n: 1 }, "CREW THIS");
    c1Stats.crewSent++;
    snd.ui("confirm");
    notify(`CREW THIS · sending the nearest free pilot to the ${typeName[t.type]}`, "info");
}
/** C1 ruling 124: pilots on the way (CREW_DISPATCH events): pilot id -> body and vehicle. Dropped when the vehicle has no en-route bit. */
const c1Dispatch = new Map();
/** The order line: dots on the ground from each walking pilot to its vehicle, and a ring on the vehicle (both views). */
function c1Lines(now) {
    c1Stats.lines = 0;
    for (const [pid, q] of c1Dispatch) {
        const v = renderedById.get(q.vehicle), b = renderedById.get(q.body);
        if (v && !(0, c1_crew_ts_1.pilotEnRoute)(cd, v)) {
            c1Dispatch.delete(pid);
            continue;
        }
        if (!v || !b)
            continue;
        const L = Math.hypot(v.x - b.x, v.z - b.z), n = Math.min(80, Math.max(2, Math.round(L / 3))), ph = (now / 400) % 1, col = [0.35, 0.95, 1];
        for (let i = 1; i < n; i++) {
            const f = (i - ph) / n, x = b.x + (v.x - b.x) * f, z = b.z + (v.z - b.z) * f;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.35, z, mode === "cmd" ? 0.7 : 0.22, col, 0.75);
        }
        const r = cd.tRadius[v.type] + 1.2;
        for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2 + now / 900, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.35, z, mode === "cmd" ? 0.6 : 0.25, col, 0.8);
        }
        c1Stats.lines++;
    }
}
/** Distance (m) from the nearest pilot walking to vehicle id, or null if unknown. */
function c1EnRouteDist(id) {
    let best = null;
    const v = renderedById.get(id);
    if (!v)
        return null;
    for (const q of c1Dispatch.values()) {
        if (q.vehicle !== id)
            continue;
        const b = renderedById.get(q.body);
        if (b) {
            const d = Math.hypot(b.x - v.x, b.z - v.z);
            if (best === null || d < best)
                best = d;
        }
    }
    return best;
}
/** Command view: CREW for selected own vehicles that are not at base (or with no pilots at base): the nearest free pilot walks to each. */
function c1DispatchSelected(ids) {
    let n = 0;
    for (const id of ids) {
        const e = renderedById.get(id);
        if (!e || (0, c1_crew_ts_1.crewNeeds)(cd, e) === 0)
            continue;
        act({ kind: "dispatch", vehicle: id, pilots: [], n: (0, c1_crew_ts_1.crewNeeds)(cd, e) }, "CREW");
        n++;
    }
    c1Stats.crewSent += n;
    return n;
}
/** Is entity id a player's pilot body (the snapshot's player list)? */
function c1PlayerBody(id) { const v = views[views.length - 1]; if (!v)
    return false; for (const p of v.players.values())
    if (p.entity === id)
        return true; return id === bodyId(); }
const SEAT_KINDS = (0, f3_citadel_ts_1.commandSeatKinds)(data, cd.typeIds);
const SHELTER_REACH = Number(data.constants.crew?.enterRangeMetres ?? 3) + 0.6;
const shelterStats = { entered: 0, left: 0, thrown: 0, sent: 0, leaveSent: 0, prompt: 0 };
/** The own command seat the pilot on foot could go inside now (F), or null. */
function shelterNear() {
    if (!bodyRender || !onFoot())
        return null;
    return (0, f3_citadel_ts_1.shelterTarget)(rendered, bodyRender.x, bodyRender.z, SEAT_KINDS, cd.tRadius, ptStatics, SHELTER_REACH);
}
function shelterEnter(b) { act({ kind: "shelter", enter: true, building: b.id }, "ENTER CITADEL"); shelterStats.sent++; snd.cue("seat"); }
function shelterLeave() { act({ kind: "shelter", enter: false, building: 0 }, "LEAVE CITADEL"); shelterStats.leaveSent++; snd.ui("click"); }
let shelterName = "Citadel", wasSheltered = false;
/** Per frame: inside, the command view is forced and the LEAVE bar shows; coming out goes back to first person. */
function shelterFrame() {
    const inside = sheltered() && started;
    if (inside && mode === "fp")
        setMode("cmd");
    if (!inside && wasSheltered && onFoot() && mode === "cmd")
        setMode("fp");
    wasSheltered = inside;
    let bar = document.getElementById("shelterBar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "shelterBar";
        bar.style.cssText = "position:fixed;left:50%;top:128px;transform:translateX(-50%);z-index:30;display:none;padding:7px 14px;font:600 13px/1.3 var(--mono, monospace);letter-spacing:.06em;color:#bff;background:rgba(6,30,34,.88);border:1px solid #39c8d0;border-radius:4px;pointer-events:auto;white-space:nowrap";
        bar.innerHTML = `<span class="t"></span> <button data-sh="leave" style="margin-left:10px;font:inherit;color:#062024;background:#5fe3ea;border:0;border-radius:3px;padding:3px 10px;cursor:pointer">LEAVE ${"CITADEL"}</button>`;
        bar.addEventListener("click", (e) => { if (e.target.dataset.sh === "leave")
            shelterLeave(); });
        document.body.appendChild(bar);
    }
    const show = inside && mode === "cmd";
    bar.style.display = show ? "block" : "none";
    if (show) {
        const v = me ? ent(me.entity) : undefined;
        if (v)
            shelterName = (0, f3_citadel_ts_1.seatName)(SEAT_KINDS[v.type], typeName[v.type]);
        const t = `INSIDE THE ${shelterName.toUpperCase()} · protected · F / Tab: leave`;
        const el = bar.querySelector(".t");
        if (el.textContent !== t)
            el.textContent = t;
        const btn = bar.querySelector("button"), bt = `LEAVE ${shelterName.toUpperCase()}`;
        if (btn.textContent !== bt)
            btn.textContent = bt;
    }
}
/** The entity the player is: the pilot on foot, or the vehicle it sits in (snapshot PILOT entity). 0 while dead. */
const bodyId = () => (me && me.state !== sim_ts_1.P_DEAD ? me.entity : 0);
function setMode(m) {
    if (m === mode)
        return;
    transFrom = mode;
    mode = m;
    transT = 0;
    transStart = performance.now();
    transFrames = 0;
    snd.ui("whoosh");
    closePanels();
    if (m === "cmd") {
        // the pilot (or the player's seat) is released to its AI: it holds position and returns fire
        send({ t: "pctl", input: null });
        lastCtl = "null";
        keys.clear();
        lmb = rmb = false;
        scoped = false;
        unlock();
        const p = bodyRender ?? (dead() ? { x: deadAt.x, z: deadAt.z } : lastBodyPos);
        cmd.x = p.x + Math.cos(camYaw) * 50;
        cmd.z = p.z + Math.sin(camYaw) * 50;
        cmd.rot = camYaw;
        cmd.dist = isFrontline() ? 1100 : 380; // Frontline 4b: the map opens wide enough to see the lanes
    }
    else {
        lastCtl = "";
        selBuilding = 0;
        if (started)
            lockPointer();
    }
    document.body.dataset.mode = m;
    document.body.classList.toggle("flMap", m === "cmd" && isFrontline());
    if (m === "cmd" && isFrontline()) {
        selected.clear();
        selBuilding = 0;
        armedCmd = null;
    }
}
function closePanels() { fpBuilding = 0; rideMenu = false; loOpen = false; prodAny.open = false; if (buildPanel)
    closeBuild(); }
function setMuted(mu) {
    snd.setMuted(mu);
    $("muteStart").checked = mu;
    $("mutePause").checked = mu;
    $("muteBtn").textContent = mu ? "MUTED" : "SOUND ON";
}
function setVolume(v) {
    snd.setVolume(v);
    for (const id of ["volStart", "volHud", "volPause"])
        $(id).value = String(Math.round(v * 100));
}
/**
 * Browser shortcuts that could lose the page (slice 3b, item 8): the game binds no Ctrl / Alt / Meta combination, and
 * while a battle runs the page swallows the ones it can (Ctrl+S / P / F / R / D / U / H / J..., F1-F10, Alt, Backspace,
 * Tab). Ctrl+W / Ctrl+T / Ctrl+N / Ctrl+Shift+W cannot be intercepted by any page in a normal window: no game key uses
 * Ctrl any more, and a beforeunload confirmation asks before the tab closes or reloads during a battle.
 */
function swallowBrowserKey(e) {
    if (!started)
        return false;
    const c = e.code;
    if (e.ctrlKey || e.metaKey || e.altKey)
        return true;
    if (/^F([1-9]|10)$/.test(c))
        return true; // F11 (fullscreen) and F12 (developer tools) stay with the browser
    return c === "Backspace" || c === "Tab" || c === "AltLeft" || c === "AltRight" || c === "ContextMenu" || c === "Space" || c.startsWith("Arrow") || c === "Slash" || c === "Quote";
}
window.addEventListener("beforeunload", (e) => { mp.leaving(); if (started && !G.__noUnloadPrompt) {
    e.preventDefault();
    e.returnValue = "";
} });
window.addEventListener("keydown", (e) => {
    if (d1_cheats_ts_1.d1.key(e))
        return; // D1: Ctrl+Alt+D, the TEST CHEATS screen (before the browser's own Ctrl+Alt+D)
    if (swallowBrowserKey(e)) {
        e.preventDefault();
        browserKeysBlocked++;
    }
    // C2: control groups in the command view (Ctrl+1..9 assign, Shift+1..9 add, 1..9 select, double tap: centre)
    if (started && mode === "cmd" && !isFrontline() && !pauseOn && !matchLocked() && !e.repeat && !e.altKey && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        groupKey(Number(e.code.slice(5)), e.ctrlKey || e.metaKey, e.shiftKey, e.timeStamp > 0 ? e.timeStamp : performance.now());
        return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey)
        return; // no game action on modified keys
    if (e.code === "Tab") {
        e.preventDefault();
        if (started && !e.repeat && !pauseOn && !matchLocked()) {
            if (sheltered())
                shelterLeave(); /* ruling 121: Tab out of the Citadel */
            else
                setMode(mode === "fp" ? "cmd" : "fp");
        }
        return;
    }
    if (e.code === "KeyM" && !e.repeat) {
        setMuted(!snd.muted);
        return;
    }
    if (!started)
        return;
    if (matchLocked()) {
        if (e.code === "Enter" && !e.repeat)
            restartMatch();
        return;
    } // C3: the end screen holds the input
    if (e.code === "Escape" && placing && !pauseOn) {
        if (!e.repeat)
            cancelPlacement();
        return;
    } // B2
    if (e.code === "Escape") {
        if (e.repeat)
            return;
        // Esc: close what is open, else the pause menu (also opens when the browser's Esc releases the pointer lock)
        if (flPanelOpen && !pauseOn) {
            flTogglePanel();
            return;
        } // Frontline: the kit loadout panel
        if (flSupOpen && !pauseOn) {
            flToggleSupport();
            return;
        } // Frontline 4a: the AI support panel
        if (armedCall && !pauseOn) {
            cancelArmed();
            return;
        } // ruling 128: Esc puts the beacon away (nothing is spent)
        if (pauseOn && helpOn) {
            helpOn = false;
            $("pause").querySelector(".card").style.display = "";
        }
        else if (pauseOn)
            setPause(false);
        else if (panelOpen() || helpOn || debugOverlay === 2) {
            closePanels();
            helpOn = false;
        }
        else
            setPause(true);
        return;
    }
    // 21 Nov: dead or downed in Frontline, 1-4 always choose the respawn lane (also with the pause menu open or in the map view)
    if (isFrontline() && !e.repeat && (dead() || flDownedNow()) && /^(Digit|Numpad)[1-4]$/.test(e.code)) {
        flLane = Number(e.code.slice(-1)) - 1;
        send({ t: "flLane", lane: flLane });
        snd.ui("click");
        return;
    }
    if (pauseOn)
        return;
    if (e.repeat) {
        keys.add(e.code);
        return;
    }
    if (e.code === "KeyH") {
        helpOn = !helpOn;
        snd.ui("click");
        if (helpOn)
            unlock();
        return;
    }
    if (e.code === "KeyL") {
        legendOn = !legendOn;
        snd.ui("click");
    }
    if (e.code === "KeyO" && isFrontline() && !e.shiftKey && !e.repeat) { // Frontline 4a: the AI support panel (Shift+O: debug overlay)
        flToggleSupport();
        return;
    }
    if (e.code === "KeyO") {
        debugOverlay = debugOverlay ? 0 : 1;
        snd.ui("click");
        notify(debugOverlay ? "DEBUG OVERLAY · sim hit spheres (cyan) and pilot zones (gold) over the models · O to hide" : "debug overlay off", "info");
        return;
    }
    // C5: hold the call key for the call menu (first person); pressed with a call armed, it cancels the call
    if (mode === "fp" && e.code === c5_ts_1.CALL_KEY) {
        if (armedCall)
            cancelArmed();
        else
            openCallMenu();
        keys.add(e.code);
        return;
    }
    if (mode === "fp" && callMenu.open) {
        const d = (0, c5_ts_1.dirFromKey)(e.code);
        if (d) {
            callCodeStep(d);
            keys.add(e.code);
            return;
        }
    }
    // N1: P pings the squad (command view: the ground under the cursor; first person: where the reticle points), Shift+P: need help
    if (e.code === "KeyP" && (mp.active || isFrontline()) && !e.repeat) {
        const g = mode === "cmd" ? groundAt(mouseX, mouseY) : groundAt(cssW / 2, cssH / 2);
        const help = e.shiftKey && mode === "fp" && bodyRender; // need help: where the pilot stands
        const at = help ? [bodyRender.x, 0, bodyRender.z] : g ?? (bodyRender ? [bodyRender.x, 0, bodyRender.z] : null);
        if (at) {
            const kind = e.shiftKey ? "help" : mode === "cmd" ? "attack" : "look";
            if (isFrontline())
                flPing(at[0], at[2], kind);
            else
                mp.ping(at[0], at[2], kind);
        }
        return;
    }
    if (placing && (e.code === "KeyR" || e.code === "KeyQ" || e.code === "KeyE")) {
        rotatePlacement(e.code === "KeyQ" || (e.code === "KeyR" && e.shiftKey) ? -1 : 1);
        return;
    } // B2: R / Q E turn the ghost (not the cloak, wheel or interact)
    if (mode === "fp")
        fpKey(e.code);
    else if (isFrontline()) {
        if (!e.repeat)
            flMapKey(e.code);
    } // Frontline 4b: no RTS hotkeys on the map
    else
        cmdKey(e.code, e.shiftKey);
    keys.add(e.code);
});
let browserKeysBlocked = 0;
window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
    if (e.code === c5_ts_1.CALL_KEY && callMenu.open)
        closeCallMenu();
    if (e.code === "KeyQ" && wheel.open) {
        const i = wheel.pick;
        wheel = { open: false, dx: 0, dy: 0, pick: -1 };
        if (i >= 0 && mode === "fp")
            wheelCommand(i);
        else
            wheelCancels++;
    }
    if (e.code === "Space")
        spaceDown = 0;
    if (e.code === "KeyE") {
        // a hold that ended between two frames (low frame rates) still counts
        if (eDown > 0 && !ejectSent && seated() && mode === "fp" && performance.now() - eDown >= EJECT_HOLD_S * 1000)
            act({ kind: "eject" }, "EJECT");
        ejectHeld = 0;
        ejectSent = false;
        eDown = 0;
    }
});
window.addEventListener("blur", () => { keys.clear(); lmb = rmb = false; spaceDown = 0; ejectHeld = 0; });
/** Crouch is C (slice 3b: Ctrl collided with the browser's Ctrl+W). */
const crouchHeld = () => keys.has("KeyC") || (scoped && kit === 1 && onFoot() && flScopeKind() === "thermal"); // ruling 112: the raised thermal scope crouches the pilot
/** First-person key presses (not repeats). */
function fpKey(code) {
    const digit = code.startsWith("Digit") ? Number(code.slice(5)) : 0;
    // C7b item 6: with the heavy weapon pod armed the number keys choose its weapon
    if (armedCall && digit > 0 && podChoices().length > 1 && digit <= podChoices().length) {
        podPick = digit - 1;
        snd.ui("click");
        return;
    }
    // panels take the number keys
    if (code === b2_prod_ts_1.PROD_ANY_KEY) {
        toggleProdAny();
        return;
    } // B2: production from first person, anywhere
    if (prodAny.open && digit > 0) {
        prodAnyQueue(digit - 1);
        return;
    }
    if (fpBuilding && digit > 0) {
        if (c9IsLab(fpBuilding))
            c9BuyUpgrade(fpBuilding, digit - 1, true);
        else
            queueOption(fpBuilding, digit - 1);
        return;
    } // C9: Tech Lab upgrades
    if (buildPanel && buildPanel.src === "tool" && digit > 0) {
        placeBuild(digit - 1);
        return;
    }
    if (rideMenu && digit > 0) {
        const c = rideCands[digit - 1];
        if (c)
            callRide(c.id);
        rideMenu = false;
        return;
    }
    if (code === "KeyB" && buildPanel) {
        closeBuild();
        lockPointer();
        snd.ui("click");
        return;
    }
    if (code === "KeyB") {
        if (fpBuilding)
            fpBuilding = 0;
        else {
            const b = nearBuilding();
            if (b) {
                fpBuilding = b.id;
                rideMenu = false;
                prodAny.open = false;
                unlock();
                snd.ui("click");
            }
            else
                notify("No production building within 15 m", "warn");
        }
        return;
    }
    // V: call a ride (Q: the command-wheel stand-in opens the same menu)
    // C2: hold Q for the quick-command wheel (V calls a ride)
    if (code === "KeyQ") {
        if (!dead()) {
            wheel = { open: true, dx: 0, dy: 0, pick: -1 };
            fpBuilding = 0;
            rideMenu = false;
            snd.ui("click");
        }
        return;
    }
    if (code === u1_loadout_ts_1.LOADOUT_KEY) {
        if (isFrontline())
            flTogglePanel(); // Frontline: the kit loadout (changed at the Command Core)
        else
            toggleLoadoutPanel();
        return;
    } // U1: the call loadout panel (also while down)
    if (code === "KeyV") {
        if (rideMenu)
            rideMenu = false;
        else if (onFoot()) {
            rideCands = rideCandidates();
            rideMenu = true;
            fpBuilding = 0;
            snd.ui("click");
        }
        else
            notify("Call a ride on foot", "warn");
        return;
    }
    if ((dead() || flDownedNow()) && isFrontline() && digit >= 1 && digit <= 4) { // Frontline: respawn lane (4: at the Core), also while downed
        flLane = digit - 1;
        send({ t: "flLane", lane: flLane });
        snd.ui("click");
        return;
    }
    if (dead())
        return;
    if (onFoot()) {
        if (digit >= 1 && digit <= KIT_COUNT) {
            setKit(digit - 1);
            return;
        }
        if (code === "KeyG" && isFrontline()) { // Frontline: throw the kit's grenade (fire bit 4)
            flGrenadeUntil = performance.now() + 120;
            return;
        }
        if (code === "Space") {
            spaceDown = performance.now();
            spaceOnGround = me.airborne === sim_ts_1.AIR_GROUND;
            return;
        }
        if (code === PRONE_KEY) {
            proneOn = !proneOn;
            stanceStats.toggles++;
            snd.ui("click");
            return;
        } // C8 (ruling 42): prone on / off
        if (code === c1_crew_ts_1.CREW_KEY_CODE) {
            crewThis();
            return;
        } // C1 ruling 124
        if (code === "KeyF") {
            const sg = sentryNear(); // C1 ruling 125: man an own sentry gun
            if (sg && !nearVehicle()) {
                gunSeatEnter(sg);
                return;
            }
            if (c9TowerKey())
                return; // C9: man / leave an own Gun Tower
            const v = nearVehicle();
            if (v) {
                enterVehicle(v);
                return;
            }
            const sh = shelterNear(); // ruling 121: go inside an own Citadel / Command Core
            if (sh) {
                shelterEnter(sh);
                return;
            }
            const b = nearBuilding();
            if (b) {
                fpBuilding = b.id;
                unlock();
                snd.ui("click");
                return;
            }
            notify("Nothing to enter within reach", "warn");
            return;
        }
        if (code === "KeyX") {
            const v = nearVehicle();
            if (v)
                cycleSeat(v);
            return;
        }
        if (code === c6_ts_1.CHARGE_KEY) {
            plantCharge();
            return;
        }
        if (code === c7b_ts_3.TOOL_KEY) {
            dropDecoy();
            return;
        } // C7b item 4
    }
    else if (gunSeated()) { // C1 ruling 125
        if (code === "KeyF" || code === "KeyE") {
            gunSeatLeave();
            return;
        }
    }
    else if (seated()) {
        if (code === c1_crew_ts_1.CREW_KEY_CODE) {
            crewThis();
            return;
        } // C1 ruling 124
        if (code === "KeyF") {
            act({ kind: "exit" }, "EXIT");
            return;
        }
        if (code === "KeyX") {
            act({ kind: "switch", seat: -1 }, "SEAT SWITCH");
            return;
        }
        if (code === "KeyG") {
            pingDriver();
            return;
        }
        if (code === "KeyT") {
            toggleGunner();
            return;
        }
        if (code === LOW_FLIGHT_KEY && airDriver()) {
            toggleLowFlight();
            return;
        } // C8 (ruling 41): the jump bit toggles low flight
        if (code === c7b_ts_3.TOOL_KEY) {
            scoutPulse();
            return;
        } // C7b item 4: the Dart's scout pulse
        if (code === "KeyE") {
            eDown = performance.now();
            ejectSent = false;
            return;
        }
    }
}
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
    if (!started || matchLocked())
        return;
    if (mode === "fp") {
        if (!document.pointerLockElement)
            lockPointer();
        if (placing && placing.src === "tool" && e.button !== 1) {
            if (e.button === 0)
                confirmPlacement(e.shiftKey);
            else
                cancelPlacement();
            return;
        } // B2: the build tool's ghost
        if (e.button === 0 && armedCall) {
            lmb = true;
            lmbThrow = true; // this click throws the call: no shot with it (the gun stays holstered until the button is let go)
            throwCall();
            return;
        }
        if (e.button === 2 && armedCall) {
            rmb = true;
            cancelArmed();
            return;
        }
        if (e.button === 0) {
            lmb = true;
            if (onFoot() && kit === KIT_BUILD && !panelOpen() && !dead())
                useBuildTool();
        }
        if (e.button === 2) {
            rmb = true;
            if (onFoot() && flScopeKind() !== null && !rifleHeavy())
                scoped = !scoped; /* ruling 112: RMB lowers / raises the scope (Frontline: the sniper rifle and the marksman rifle only) */
            if (seatRoleNow() === data_ts_1.SEAT_GUNNER) {
                gunZoom = true;
                unitStats.zooms++;
            }
        }
        if (e.button === 1) {
            e.preventDefault();
            if (seated())
                pingDriver();
        }
        return;
    }
    if (isFrontline()) {
        flMapClick(e);
        return;
    } // Frontline 4b: the map is view only (pings, lane requests)
    if (placing && e.button !== 1) {
        if (e.button === 0)
            confirmPlacement(e.shiftKey);
        else
            cancelPlacement();
        return;
    } // B2
    if (e.button === 0 && armedCmd) {
        runArmed(e.clientX, e.clientY);
        return;
    } // C7b: an order button waiting for its map click
    if (e.button === 2 && armedCmd) {
        armedCmd = null;
        snd.ui("click");
        return;
    }
    if (e.button === 0)
        drag = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, shift: e.shiftKey };
    else if (e.button === 1) {
        midDrag = { x: e.clientX };
        e.preventDefault();
    }
    else if (e.button === 2)
        commandRightClick(e.clientX, e.clientY);
});
window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        lmb = false;
        lmbThrow = false;
        if (drag && mode === "cmd")
            finishBox();
        drag = null;
    }
    if (e.button === 2) {
        rmb = false;
        if (kit !== 1)
            scoped = false;
        gunZoom = false;
    }
    if (e.button === 1)
        midDrag = null;
});
window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseIn = true;
    if (wheel.open) {
        wheelMove(e.movementX ?? 0, e.movementY ?? 0);
        return;
    }
    if (mode === "fp" && document.pointerLockElement === canvas) {
        const k = 0.0022 * (scoped || gunZoom ? fovDeg / 62 : 1); // slower turning through the scope (C6: and the gunner's sight)
        camYaw += e.movementX * k;
        camPitch = (0, math_ts_1.clamp)(camPitch - e.movementY * k, onFoot() ? -1.45 : -0.55, onFoot() ? 1.45 : 0.45);
    }
    if (drag) {
        drag.x1 = e.clientX;
        drag.y1 = e.clientY;
    }
    if (midDrag) {
        cmd.rot += (e.clientX - midDrag.x) * 0.006;
        midDrag.x = e.clientX;
    }
});
document.addEventListener("mouseleave", () => { mouseIn = false; });
canvas.addEventListener("wheel", (e) => {
    if (placing && started && e.deltaY !== 0) {
        rotatePlacement(e.deltaY > 0 ? 1 : -1);
        e.preventDefault();
        return;
    } // B2: the wheel turns the ghost
    if (mode === "cmd") {
        cmd.dist = (0, math_ts_1.clamp)(cmd.dist * Math.exp(e.deltaY * 0.0012), 50, 2000);
        e.preventDefault();
        return;
    }
    // C4: on foot the wheel steps through the kit (carbine, long rifle, repair torch, build tool)
    if (started && mode === "fp" && onFoot() && !panelOpen() && !matchLocked() && e.deltaY !== 0) {
        setKit((kit + (e.deltaY > 0 ? 1 : KIT_COUNT - 1)) % KIT_COUNT);
        e.preventDefault();
    }
}, { passive: false });
document.addEventListener("visibilitychange", () => send({ t: "pause", on: (document.hidden && !mp.shared()) || !started || (pauseOn && !mp.shared()) }));
// start overlay: deploy (URL options), the 300-unit battle, the showcase; sound settings
function sameConfig(a, b) { return a.units === b.units && a.scenario === b.scenario && a.showcaseFire === b.showcaseFire && a.battle === b.battle; }
function startWith(c) {
    if (!ready || started)
        return;
    snd.start();
    cineLoadMusic(); // Frontline: the opening cinematic's music decodes while the battle loads
    snd.ui("click"); // the click is the user gesture that lets audio start
    lockPointer();
    const go = () => {
        started = true;
        $("start").style.display = "none";
        document.body.dataset.mode = mode;
        send({ t: "pause", on: (document.hidden && !mp.shared()) });
        if (cineWanted())
            cineStart();
        else
            notify("ON FOOT beside the Command Core · F: enter a vehicle · V: call a ride · B: production · H: controls", "info"); // C7b item 7: V calls a ride (C is crouch)
    };
    if (sameConfig(c, config) && difficulty === runningDifficulty) {
        go();
        return;
    }
    resetClientState();
    config = { ...c };
    ready = false;
    scenMap = (0, scenario_ts_1.mapFor)(config.scenario, config.units, config.battle);
    ptStatics = (0, c2_ts_1.pointStatics)(scenMap, RING_R);
    readyWaiters.push(() => { go(); if (mp.role === "host") mp.rejoinAll(); }); // 21 Nov: squadmates who joined while the host was still on the start card join the battle it loaded
    sendInit();
}
/**
 * 21 Nov: a squad match starts only once the player confirms the loadout on the start card (hosting or joining used to
 * drop the player straight in with whatever kit the card last held). pendingStart: what the deploy button does then.
 */
let pendingStart = null;
function awaitLoadout(label, sub, fn) {
    pendingStart = fn;
    const b = $("startBtn");
    if (!b.dataset.label)
        b.dataset.label = b.innerHTML;
    b.innerHTML = `${label}<small>${sub}</small>`;
    b.classList.add("confirmPulse");
    $("start").style.display = "";
    notify("Check your loadout, then press the deploy button to confirm it", "info");
}
$("startBtn").addEventListener("click", () => {
    const f = pendingStart;
    if (f) {
        pendingStart = null;
        const b = $("startBtn");
        if (b.dataset.label)
            b.innerHTML = b.dataset.label;
        b.classList.remove("confirmPulse");
        f();
        return;
    }
    startWith({ ...URL_CONFIG, battle: chosenBattle });
});
// the scripted runs are on the reference terrain: from a page on the symmetric map they reload with their URL option
$("bigBtn").addEventListener("click", () => (GEO === "ref" ? startWith({ ...URL_CONFIG, units: 300, scenario: "default", showcaseFire: false }) : reloadWith({ units: "300", battle: null })));
{ // designer 20 Nov: the controls open over the start card (it no longer scrolls past the window)
    const show = (on) => { const p = document.getElementById("ctlPanel"); if (p) p.hidden = !on; };
    document.getElementById("ctlBtn")?.addEventListener("click", () => show(true));
    document.getElementById("ctlClose")?.addEventListener("click", () => show(false));
    document.getElementById("ctlPanel")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) show(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.getElementById("ctlPanel")?.hidden) { show(false); e.stopPropagation(); } }, true);
}
$("showBtn").addEventListener("click", () => (GEO === "ref" ? startWith({ ...URL_CONFIG, units: 0, scenario: "showcase", showcaseFire: false }) : reloadWith({ showcase: "1", battle: null })));
/** C6 item 2: the battle picked on the start screen (Skirmish, the five missions, Classic). */
let chosenBattle = URL_CONFIG.battle;
/** Reloads the page with URL options changed (the terrain is built once per page: another map needs a new page). */
function reloadWith(set) {
    const q = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(set)) {
        if (v === null)
            q.delete(k);
        else
            q.set(k, v);
    }
    G.__noUnloadPrompt = true;
    battleReloads++;
    location.search = q.toString();
}
let battleReloads = 0;
// C8 (QA4 bug 12): the minimap label names the page's planet and map size from the start (not only after a pick)
$("mmLabel").textContent = `${data.planets.find((x) => x.id === PLANET)?.name ?? PLANET} · ${MAP_SIZE / 1000} km`;
function chooseBattle(id) {
    const b = (0, battles_ts_1.battleOf)(id);
    snd.ui("click");
    if ((0, battles_ts_1.pageKey)(b, false) !== PAGE_KEY || URL_CONFIG.scenario !== "default" || URL_CONFIG.units > 60) {
        reloadWith({ battle: id, units: null, showcase: null, scenario: null });
        return;
    }
    chosenBattle = id;
    showBattleChoice();
    $("mmLabel").textContent = `${data.planets.find((x) => x.id === PLANET)?.name ?? PLANET} · ${MAP_SIZE / 1000} km`;
}
function showBattleChoice() {
    const scripted = URL_CONFIG.scenario !== "default" || URL_CONFIG.units > 60;
    const b = (0, battles_ts_1.battleOf)(chosenBattle);
    const btn = (x) => `<button data-battle="${x.id}" class="${!scripted && x.id === chosenBattle ? "on" : ""}" title="${x.sub}">${x.label}</button>`;
    $("battleRow").innerHTML = `<span class="label">Planet</span>` + battles_ts_1.BATTLES.map(btn).join(""); // Frontline on each planet (the other battle types are retired)
    const pl = data.planets.find((x) => x.id === b.planet);
    // C8 (QA4 bug 20): the start screen's subtitle names the chosen battle's planet
    const subPl = data.planets.find((x) => x.id === (scripted ? PLANET : b.planet))?.name ?? "Halcyon";
    if (b.scenario.lanes)
        flRenderPicker();
    else
        $("flKit")?.remove();
    $("startSubtitle").textContent = b.scenario.lanes ? `${subPl} · three lanes: you start in a Dart at your Command Core; the Hegemony holds the far corner. Both bases send AI waves down the lanes.`
        : `${subPl} · pick a battle below: you start on foot at your Command Core in the west; the enemy commander holds the east`;
    $("battleSub").textContent = scripted ? "" : `${b.label} · ${b.sub.replace(/^\d+ points · /, "")}${b.scenario.lanes ? " · 3 lanes, 3 km" : b.geo === "sym" ? " · 11 points, 3 km" : " · 7 points, 2 km"}${b.kind === "planet" && pl ? ` · ${pl.name}: ${pl.look ?? ""}, atmosphere ${pl.atmosphereLabel ?? "?"}` : ""}`;
    if (!scripted)
        $("startSub").textContent = `${b.scenario.lanes ? "in a Dart" : "on foot"} at the Command Core · ${b.label.toLowerCase()}`;
}
document.addEventListener("click", (e) => {
    const el = e.target.closest?.("[data-battle]");
    if (!el || started)
        return;
    const b = (0, battles_ts_1.battleById)(el.dataset.battle);
    if (b)
        chooseBattle(b.id);
});
$("startSub").textContent = URL_CONFIG.scenario === "showcase" ? "showcase (URL option)" : URL_CONFIG.scenario === "range" ? "test range (URL option)" : URL_CONFIG.units ? `${URL_CONFIG.units} units (URL option)` : "on foot at the Command Core · default battle";
showBattleChoice();
for (const id of ["volStart", "volHud", "volPause"])
    $(id).addEventListener("input", (e) => setVolume(Number(e.target.value) / 100));
$("mutePause").addEventListener("change", (e) => setMuted(e.target.checked));
$("resumeBtn").addEventListener("click", () => setPause(false));
$("introBtn").addEventListener("click", () => { // Frontline: replay the opening cinematic
    if (!isFrontline())
        return;
    setPause(false);
    cineDone = false;
    if (!cine)
        cineStart();
    lockPointer();
});
$("againBtn").addEventListener("click", () => restartMatch());
$("restartBtn").addEventListener("click", () => { if (pauseOn)
    setPause(false); restartMatch(); });
/** C3 item 5: the enemy commander's difficulty (start, pause and end screens); it applies at the next start or restart. */
function setDifficulty(d) {
    difficulty = d;
    document.querySelectorAll("[data-diff]").forEach((b) => b.classList.toggle("on", b.dataset.diff === d));
    const pend = started && d !== runningDifficulty;
    $("restartSub").textContent = pend ? `new seed · enemy ${d.toUpperCase()} (now ${runningDifficulty.toUpperCase()})` : `new seed · enemy ${d.toUpperCase()}`;
    $("againSub").textContent = `same scenario · new seed · enemy ${d.toUpperCase()}`;
    if (isFrontline() && !started)
        flRenderPicker(); // 4d: the squad line follows the difficulty
}
document.addEventListener("click", (e) => {
    const el = e.target.closest?.("[data-diff]");
    if (!el)
        return;
    const d = el.dataset.diff;
    if (scenario_ts_1.DIFFICULTIES.includes(d)) {
        setDifficulty(d);
        snd.ui("click");
        if (started && d !== runningDifficulty)
            notify(`Enemy commander: ${d.toUpperCase()} from the next restart`, "info");
    }
});
setDifficulty(difficulty);
$("help").innerHTML = (0, keys_ts_1.helpHtml)(); // C7b item 7: every key, grouped by mode (keys.ts)
$("pauseLoadoutBtn").addEventListener("click", () => { setPause(false); if (!loOpen)
    toggleLoadoutPanel(); }); // U1
$("pauseHelpBtn").addEventListener("click", () => { helpOn = true; $("pause").querySelector(".card").style.display = "none"; snd.ui("click"); });
$("muteStart").addEventListener("change", (e) => setMuted(e.target.checked));
$("muteBtn").addEventListener("click", () => { setMuted(!snd.muted); snd.ui("click"); });
setVolume(snd.volume);
setMuted(snd.muted);
/** Screen position (CSS px) of a world point, or null if behind the camera. */
const tmp4 = [0, 0, 0];
function toScreen(x, y, z) {
    (0, math_ts_1.project)(vp, x, y, z, tmp4);
    if (tmp4[2] <= 0)
        return null;
    return [(tmp4[0] * 0.5 + 0.5) * cssW, (1 - (tmp4[1] * 0.5 + 0.5)) * cssH];
}
/** World ray through a screen point. */
function screenRay(sx, sy) {
    const nx = (sx / cssW) * 2 - 1, ny = 1 - (sy / cssH) * 2;
    const p = (z) => {
        const v = [nx, ny, z, 1];
        const o = [0, 0, 0, 0];
        for (let r = 0; r < 4; r++)
            o[r] = invVP[r] * v[0] + invVP[4 + r] * v[1] + invVP[8 + r] * v[2] + invVP[12 + r] * v[3];
        return [o[0] / o[3], o[1] / o[3], o[2] / o[3]];
    };
    const a = p(-1), b = p(1);
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]);
    return { o: a, d: [d[0] / l, d[1] / l, d[2] / l] };
}
function groundAt(sx, sy) {
    const r = screenRay(sx, sy);
    const t = render_ts_1.Renderer.rayTerrain(hm, r.o, r.d, 6000);
    return t < 0 ? null : [r.o[0] + r.d[0] * t, r.o[1] + r.d[1] * t, r.o[2] + r.d[2] * t];
}
/** Command view left click / box: units (box or click), or a friendly building (click) for its production panel. */
function finishBox() {
    const d = drag;
    const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
    if (!d.shift)
        selected.clear();
    const click = x1 - x0 < 5 && y1 - y0 < 5;
    let best = -1, bestD = 22;
    const inBox = [];
    for (const e of rendered) {
        if (e.team !== 0 || cd.tStructure[e.type] || e.id === bodyId())
            continue;
        const s = toScreen(e.x, e.cy, e.z);
        if (!s)
            continue;
        if (click) {
            const dd = Math.hypot(s[0] - d.x0, s[1] - d.y0);
            if (dd < bestD) {
                bestD = dd;
                best = e.id;
            }
        }
        else if (s[0] >= x0 && s[0] <= x1 && s[1] >= y0 && s[1] <= y1)
            inBox.push({ id: e.id, economy: isEconomy(e.type) });
    }
    // designer playtest: a box skips Harvesters and other economy vehicles unless it holds nothing else
    for (const id of (0, c3_ts_1.boxSelection)(inBox))
        selected.add(id);
    lastBox = { inBox: inBox.length, kept: selected.size };
    if (click && best >= 0)
        selected.add(best);
    selBuilding = 0;
    if (click && best < 0) {
        // a friendly building under the cursor: select it (its production panel opens)
        const b = pickBuilding(d.x0, d.y0);
        if (b) {
            selBuilding = b.id;
            selected.clear();
            buildPanel = null;
            snd.ui("click");
            return;
        }
        // C4: a click on the ground inside a strategic point opens that point's panel (its build menu)
        const g = groundAt(d.x0, d.y0), p = g ? (0, c4_ts_1.pointAt)(ptStatics, g[0], g[2]) : -1;
        if (p >= 0) {
            buildDismissed = "";
            openBuild(p, -1, "cmd");
            return;
        }
        if (buildPanel && buildPanel.ctor < 0)
            buildPanel = null;
    }
    if (selected.size)
        snd.ui("click");
}
let lastBox = { inBox: 0, kept: 0 };
/** Shift+J: every own Harvester back to the mining loop (nearest deposit), with nothing selected. */
function allHarvestersToWork() {
    const ids = hvModels.map((h) => h.id);
    if (!ids.length) {
        notify("HARVEST · you have no Harvesters", "warn");
        snd.ui("error");
        return;
    }
    for (const id of ids)
        act({ kind: "harvest", harvester: id, deposit: -1 }, "HARVEST");
    lastHarvest = { ids, deposit: -1 };
    allHarvestCount++;
    notify(`ALL HARVESTERS BACK TO WORK · ${ids.length}`, "info");
    snd.ui("confirm");
}
let allHarvestCount = 0;
/** The friendly structure under a screen point (its drawn footprint), or null. */
function pickBuilding(sx, sy) {
    let best = null, bd = Infinity;
    const focal = proj[5] * cssH / 2;
    for (const e of rendered) {
        if (e.team !== 0 || !cd.tStructure[e.type])
            continue;
        (0, math_ts_1.project)(vp, e.x, e.y + 3, e.z, tmp4);
        if (tmp4[2] <= 0)
            continue;
        const s = toScreen(e.x, e.y + 3, e.z);
        const rpx = Math.max(16, (R.kindSize(kindOfType[e.type]) * e.scale * 0.6 * focal) / tmp4[2]);
        const dd = Math.hypot(s[0] - sx, s[1] - sy);
        if (dd < rpx && dd < bd) {
            bd = dd;
            best = e;
        }
    }
    return best;
}
/** Command-view key presses (C2): formation (Z) and the order hotkeys (ORDER_KEYS). */
function cmdKey(code, shift = false) {
    if (code === "KeyF" && sheltered()) {
        shelterLeave();
        return;
    } // ruling 121: F out of the Citadel
    if (code === "KeyJ" && shift) {
        allHarvestersToWork();
        return;
    }
    if (code === LOAD_KEY) {
        transportLoad(mouseX, mouseY);
        return;
    } // C7b item 3
    if (code === GROUND_KEY) {
        armShellGround();
        return;
    } // C8 (ruling 40): attack-ground
    if (code === UNLOAD_KEY) {
        transportUnload(mouseX, mouseY);
        return;
    }
    if (code === c7b_ts_3.TOOL_KEY) {
        toggleJammer(selBuilding);
        return;
    } // C7b item 4: a selected Relay Tower's jammer
    if (code === c7b_ts_4.GROUP_KEY) {
        newBattleGroup();
        return;
    } // C7b item 5
    if (code === "Enter" && armedCmd?.kind === "bgPatrol") {
        armedCmd = null;
        notify("PATROL ROUTE SET", "info");
        snd.ui("click");
        return;
    }
    if (code === "KeyB") {
        cmdBuildKey();
        return;
    }
    if (code === GARRISON_KEY) {
        c9Garrison(mouseX, mouseY);
        return;
    } // C9
    if (code === RECALL_KEY) {
        c9Recall();
        return;
    } // C9
    if (code === C11_CREW_CODE) {
        c11Crew();
        return;
    } // C11: crew order (S14)
    if (code === c2_ts_1.FORMATION_KEY) {
        formation = (0, c2_ts_1.nextFormation)(formation);
        notify(`FORMATION · ${formation.toUpperCase()} (group move orders)`, "info");
        snd.ui("click");
        return;
    }
    const b = (0, c2_ts_1.orderButtonForKey)(code);
    if (b)
        cmdOrder(b, mouseX, mouseY);
}
/** B in the command view: the build menu for the selected Constructor's point, else the point under the cursor, else the nearest own point. */
function cmdBuildKey() {
    if (placing) {
        placing = null;
        placeStats.cancelled++;
    }
    if (buildPanel) {
        closeBuild();
        snd.ui("click");
        return;
    }
    buildDismissed = "";
    const c = selectedConstructors()[0], ce = c !== undefined ? renderedById.get(c) : undefined;
    if (ce) {
        openBuild((0, c4_ts_1.defaultBuildPoint)(ptStatics, views[views.length - 1]?.points, 0, ce.x, ce.z), ce.id, "cmd");
        return;
    }
    const g = groundAt(mouseX, mouseY);
    const at = g ? (0, c4_ts_1.pointAt)(ptStatics, g[0], g[2]) : -1;
    openBuild(at >= 0 ? at : (0, c4_ts_1.defaultBuildPoint)(ptStatics, views[views.length - 1]?.points, 0, g ? g[0] : cmd.x, g ? g[2] : cmd.z), -1, "cmd");
}
/** Units the command view addresses: the selection, alive, not structures. */
function selectedUnits() { return Array.from(selected).filter((id) => { const e = renderedById.get(id); return !!e && !cd.tStructure[e.type]; }); }
/** The entity under a screen point: team filter (0 own, 1 enemy); own excludes the selection. */
function pickAt(sx, sy, own, maxPx = 26) {
    let best = 0, bd = maxPx;
    for (const e of rendered) {
        if ((e.team === 0) !== own || e.id === bodyId() || (own && selected.has(e.id)) || cd.tPilot[e.type])
            continue;
        const s2 = toScreen(e.x, e.cy, e.z);
        if (!s2)
            continue;
        const d = Math.hypot(s2[0] - sx, s2[1] - sy);
        if (d < bd) {
            bd = d;
            best = e.id;
        }
    }
    if (!best && own) {
        const b = pickBuilding(sx, sy);
        if (b)
            best = b.id;
    }
    return best;
}
/** Retreat destinations: the centres of the team's supplied points. */
function retreatPoints() { return ptModels.filter((m) => m.owner === 0 && m.supplied).map((m) => [ptStatics[m.index].x, ptStatics[m.index].z]); }
function allHolding(ids) {
    const v = views[views.length - 1];
    return ids.length > 0 && !!v && ids.every((id) => v.orders.get(id)?.holdFire);
}
/** An order button / hotkey in the command view, at the cursor (sx, sy). */
function cmdOrder(b, sx, sy) {
    const ids = selectedUnits();
    if (!ids.length) {
        notify("Select units first (drag a box, or 1..9 for a group)", "warn");
        snd.ui("error");
        return;
    }
    if (b === "harvest") {
        const hv = ids.filter((id) => renderedById.get(id)?.type === T_HARVESTER);
        if (!hv.length) {
            notify("HARVEST · select Harvesters", "warn");
            snd.ui("error");
            return;
        }
        const g = groundAt(sx, sy);
        const dep = g ? depModels.findIndex((d) => !d.exhausted && Math.hypot(d.x - g[0], d.z - g[2]) < d.radius + 25) : -1;
        for (const id of hv)
            act({ kind: "harvest", harvester: id, deposit: dep }, "HARVEST");
        lastOrder.ids = hv;
        lastOrder.order = null;
        lastOrder.reply = null;
        lastHarvest = { ids: hv, deposit: dep };
        notify(`HARVEST · ${hv.length} Harvester${hv.length > 1 ? "s" : ""} → ${dep >= 0 ? depModels[dep].id : "nearest deposit"}`, "info");
        snd.ui("click");
        return;
    }
    const g = groundAt(sx, sy);
    const r = (0, c2_ts_1.buildOrder)(b, { pilotId, ground: g ? [g[0], g[2]] : null, friendly: b === "guard" ? pickAt(sx, sy, true) : 0, enemy: pickAt(sx, sy, false), allHolding: allHolding(ids), formation, retreatPoints: retreatPoints() });
    if (!r.order) {
        notify(`ORDER · ${r.why}`, "warn");
        snd.ui("error");
        return;
    }
    issueOrder(ids, r.order, sx, sy);
}
let lastHarvest = null;
// ---- C2 item 6: the first-person quick-command wheel (hold Q, move the mouse, release)
let wheel = { open: false, dx: 0, dy: 0, pick: -1 };
let lastWheel = null;
function wheelMove(mx, my) {
    wheel.dx = (0, math_ts_1.clamp)(wheel.dx + mx, -120, 120);
    wheel.dy = (0, math_ts_1.clamp)(wheel.dy + my, -120, 120);
    wheel.pick = (0, c2_ts_1.wheelPick)(wheel.dx, wheel.dy);
}
/** The enemy nearest the crosshair: the aim-assist pick, else the smallest angle within 4 degrees and 800 m. */
function crosshairEnemy() {
    if (aimPick) {
        const e = renderedById.get(aimPick.id);
        if (e && e.team !== 0)
            return e.id;
    }
    const d = viewDir();
    let best = 0, ba = (4 * Math.PI) / 180;
    for (const e of rendered) {
        if (e.team === 0 || e.crew === 0 && crewable(e.type))
            continue;
        const vx = e.x - eye[0], vy = e.cy - eye[1], vz = e.z - eye[2], l = Math.hypot(vx, vy, vz);
        if (l > 800 || l < 1)
            continue;
        const a = Math.acos((0, math_ts_1.clamp)((vx * d[0] + vy * d[1] + vz * d[2]) / l, -1, 1));
        if (a < ba) {
            ba = a;
            best = e.id;
        }
    }
    return best;
}
function wheelCommand(i) {
    const opt = c2_ts_1.WHEEL[i];
    if (!opt)
        return;
    if (opt.b === "crewThis") {
        crewThis();
        lastWheel = { option: opt.label, ids: [], order: null, why: c1Stats.lastWhy };
        wheelConfirms++;
        return;
    } // C1 ruling 124
    const px = bodyRender ? bodyRender.x : eye[0], pz = bodyRender ? bodyRender.z : eye[2];
    const units = rendered.map((e) => ({ id: e.id, x: e.x, z: e.z, team: e.team, unit: !cd.tStructure[e.type] && !cd.tPilot[e.type] && e.type !== T_HARVESTER && e.id !== bodyId() }));
    const ids = (0, c2_ts_1.wheelRecipients)(Array.from(selected), units, px, pz);
    if (!ids.length) {
        lastWheel = { option: opt.label, ids, order: null, why: "no own units nearby" };
        notify(`${opt.label} · no own units within 120 m (or select a group in the command view)`, "warn");
        snd.ui("error");
        return;
    }
    const d = viewDir(), t = render_ts_1.Renderer.rayTerrain(hm, eye, d, 1500);
    const ground = t > 0 ? [eye[0] + d[0] * t, eye[2] + d[2] * t] : [px, pz];
    const r = (0, c2_ts_1.buildOrder)(opt.b, { pilotId, ground, friendly: 0, enemy: crosshairEnemy(), allHolding: allHolding(ids), formation, retreatPoints: retreatPoints() });
    lastWheel = { option: opt.label, ids, order: r.order, why: r.why };
    if (!r.order) {
        notify(`${opt.label} · ${r.why}`, "warn");
        snd.ui("error");
        return;
    }
    issueOrder(ids, r.order, cssW / 2, cssH / 2);
    snd.ui("confirm");
    wheelConfirms++;
    notify(`${opt.label} · ${ids.length} unit${ids.length > 1 ? "s" : ""}`, "info");
}
let lastWheelHtml = "", wheelTarget = "", wheelCancels = 0, wheelConfirms = 0;
/** Wheel recipients as wheelCommand would pick them now (for the target line). */
function wheelUnits() {
    const px = bodyRender ? bodyRender.x : eye[0], pz = bodyRender ? bodyRender.z : eye[2];
    const units = rendered.map((e) => ({ id: e.id, x: e.x, z: e.z, team: e.team, unit: !cd.tStructure[e.type] && !cd.tPilot[e.type] && e.type !== T_HARVESTER && e.id !== bodyId() }));
    const live = Array.from(selected).filter((id) => units.some((u) => u.id === id && u.team === 0));
    return { live, nearby: live.length ? 0 : (0, c2_ts_1.wheelRecipients)([], units, px, pz).length };
}
/** C3 (designer playtest): a real radial wheel while Q is held: one sector per command, the picked one lit, the dead zone, a pointer line, the target line. */
function updateWheel() {
    const w = $("wheel");
    if (!wheel.open || mode !== "fp") {
        w.style.display = "none";
        return;
    }
    w.style.display = "block";
    const wu = wheelUnits();
    wheelTarget = (0, c2_ts_1.wheelTargetText)(wu.live, groups.groups, wu.nearby);
    const secs = (0, c2_ts_1.wheelSectors)(wheel.pick), R = 150;
    const sel = wheel.pick >= 0 ? c2_ts_1.WHEEL[wheel.pick].label : "release to cancel";
    const html = `<svg width="${R * 2}" height="${R * 2 + 40}" viewBox="${-R} ${-R} ${R * 2} ${R * 2 + 40}">` +
        secs.map((s) => `<path class="sec${s.selected ? " sel" : ""}" d="${s.path}"/><text class="ic" x="${s.labelX.toFixed(0)}" y="${(s.labelY - 6).toFixed(0)}">${s.icon}</text><text class="lb" x="${s.labelX.toFixed(0)}" y="${(s.labelY + 12).toFixed(0)}">${s.label}</text>`).join("") +
        `<circle class="dz${wheel.pick < 0 ? " sel" : ""}" r="${c2_ts_1.WHEEL_DEADZONE_PX}"/>` +
        `<line class="ptr" x1="0" y1="0" x2="${wheel.dx.toFixed(0)}" y2="${wheel.dy.toFixed(0)}"/><circle class="tip" cx="${wheel.dx.toFixed(0)}" cy="${wheel.dy.toFixed(0)}" r="3"/>` +
        `<text class="cur" x="0" y="${R + 4}">${sel}</text><text class="tgt" x="0" y="${R + 22}">${wheelTarget}</text></svg>`;
    if (html !== lastWheelHtml) {
        w.innerHTML = html;
        lastWheelHtml = html;
    }
}
function groupKey(n, ctrl, shift, at = performance.now()) {
    const alive = (id) => renderedById.has(id) || (views.length > 0 && views[views.length - 1].entities.has(id));
    const r = groups.key(n, ctrl, shift, selected, at, alive); // C10: the key's own time (a long frame between two taps no longer breaks the double tap)
    lastGroupAction = `${r.action} ${n}`;
    // C7b item 5: control groups are selections (the name says so, next to battle groups' standing orders)
    if (r.action === "assign") {
        notify(r.ids.length ? `CONTROL GROUP ${n} · ${r.ids.length} units · a selection (press ${n}); ${c7b_ts_4.GROUP_KEY_LABEL} makes a battle group` : `CONTROL GROUP ${n} cleared`, "info");
        snd.ui("click");
        return;
    }
    if (r.action === "add") {
        notify(`CONTROL GROUP ${n} · ${r.ids.length} units`, "info");
        snd.ui("click");
        return;
    }
    if (r.action === "empty") {
        notify(`CONTROL GROUP ${n} is empty · Ctrl+${n} assigns the selection`, "warn");
        return;
    }
    selected.clear();
    selBuilding = 0;
    for (const id of r.ids)
        selected.add(id);
    snd.ui("click");
    if (r.action === "centre") {
        const c = (0, c2_ts_1.centroid)(r.ids.map((id) => renderedById.get(id)).filter((x) => !!x));
        if (c) {
            cmd.x = c.x;
            cmd.z = c.z;
        }
    }
}
function commandRightClick(sx, sy) {
    // a building selected: right-click on the ground sets its rally point
    if (selBuilding) {
        const g = groundAt(sx, sy);
        if (g) {
            act({ kind: "rally", building: selBuilding, point: [g[0], g[2]] }, "RALLY POINT");
            orderMarker = { x: g[0], z: g[2], t: performance.now(), attack: 0 };
            snd.ui("click");
        }
        return;
    }
    const ids = Array.from(selected).filter((id) => rendered.some((e) => e.id === id));
    { // C1 ruling 124: right-click on an own vehicle with an empty seat, with nothing or only own AI pilots selected: send a pilot
        let veh = null, vd = 30;
        for (const e of rendered) {
            if (e.team !== 0 || !crewable(e.type))
                continue;
            const sc = toScreen(e.x, e.cy, e.z);
            if (!sc)
                continue;
            const dd = Math.hypot(sc[0] - sx, sc[1] - sy);
            if (dd < vd) {
                vd = dd;
                veh = e;
            }
        }
        const sel = ids.map((id) => renderedById.get(id)).map((e) => ({ id: e.id, type: e.type, team: e.team, ai: !c1PlayerBody(e.id) }));
        const plan = veh ? (0, c1_crew_ts_1.dispatchClick)(cd, { id: veh.id, type: veh.type, team: veh.team, x: veh.x, y: veh.cy, z: veh.z, crew: veh.crew }, sel) : null;
        if (plan && veh) {
            act({ kind: "dispatch", vehicle: plan.vehicle, pilots: plan.pilots, n: plan.n }, "CREW");
            c1Stats.crewSent++;
            notify(`CREW · ${plan.pilots.length ? `${plan.pilots.length} pilot${plan.pilots.length === 1 ? "" : "s"}` : "the nearest free pilot"} to the ${typeName[veh.type]}`, "info");
            snd.ui("confirm");
            orderMarker = { x: veh.x, z: veh.z, t: performance.now(), attack: 0 };
            return;
        }
    }
    if (ids.length === 0)
        return;
    // an enemy under the cursor: attack; otherwise move to the ground point
    let foe = -1, bestD = 26;
    for (const e of rendered) {
        if (e.team === 0)
            continue;
        const s = toScreen(e.x, e.cy, e.z);
        if (!s)
            continue;
        const dd = Math.hypot(s[0] - sx, s[1] - sy);
        if (dd < bestD) {
            bestD = dd;
            foe = e.id;
        }
    }
    let order = null;
    if (foe >= 0)
        order = { type: "attack", targetId: foe };
    else {
        // ruling 131: a remembered enemy structure (a ghost: the enemy Citadel seen earlier or known from the start, not in
        // sight now) cannot take an attack order (the sim needs it detected): attack-move onto it, so the units engage it
        // and everything there as soon as they see it (it was a plain move to the ground under it)
        let gh = null, gd = 26;
        for (const k of structMem.ghosts(renderedById)) {
            if (k.team === 0)
                continue;
            const sc = toScreen(k.x, (0, terrain_gen_ts_1.sampleHeight)(hm, k.x, k.z) + cd.tRadius[k.type], k.z);
            if (!sc)
                continue;
            const dd = Math.hypot(sc[0] - sx, sc[1] - sy);
            if (dd < gd) {
                gd = dd;
                gh = k;
            }
        }
        if (gh)
            order = { type: "attackMove", x: gh.x, z: gh.z };
        else {
            const g = groundAt(sx, sy);
            if (g)
                order = (0, c2_ts_1.moveOrder)(g[0], g[2], ids.length, formation);
        }
    }
    if (!order)
        return;
    issueOrder(ids, order, sx, sy);
}
function issueOrder(ids, order, sx, sy) {
    const reqId = reqSeq++;
    lastOrder.ids = ids;
    lastOrder.order = order;
    lastOrder.reply = null;
    lastOrder.reqId = reqId;
    lastOrder.at = [sx, sy];
    send({ t: "order", reqId, ids, order });
    const mv = order.type === "move" && "x" in order ? order : null;
    orderMarker = { x: mv ? mv.x : 0, z: mv ? mv.z : 0, t: performance.now(), attack: order.type === "attack" ? order.targetId : 0 };
    snd.ui("click");
    return reqId;
}
let orderMarker = null;
// order refusals: a short message near the cursor with the sim's reason
let orderMsg = null;
function showOrderRefusal(r) {
    const counts = new Map();
    for (const x of r.rejected)
        counts.set(x.reason, (counts.get(x.reason) ?? 0) + 1);
    const [reason, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const total = lastOrder.ids.length;
    const ground = !!lastOrder.order?.ground && reason === "cannotDamageTarget"; // C8 (ruling 40)
    const text = `ORDER REFUSED · ${ground ? c8_ts_1.SHELL_REFUSED : (0, c6_ts_1.reasonText)(reason)}${total > 1 ? ` (${n} of ${total} units)` : ""}`;
    orderMsg = { text, x: mode === "cmd" ? lastOrder.at[0] : cssW / 2 + 40, y: mode === "cmd" ? lastOrder.at[1] : cssH / 2 + 60, until: performance.now() + 2600 };
    snd.ui("error");
}
// ------------------------------------------------------------------ crew actions, rides, production (first person and command view)
/** Snapshot view of an entity (the newest). */
const ent = (id) => views[views.length - 1]?.entities.get(id);
/** Player pilots of the team in a vehicle seat (snapshot PLAYERS): vehicle id -> seat -> pilot id. */
function playerSeats() {
    const m = new Map();
    const v = views[views.length - 1];
    if (!v)
        return m;
    for (const p of v.players.values())
        if (p.state === sim_ts_1.P_SEATED) {
            let s = m.get(p.entity);
            if (!s) {
                s = new Map();
                m.set(p.entity, s);
            }
            s.set(p.seat, p.pilotId);
        }
    return m;
}
/** Seats of a vehicle as the player sees them: role, occupied, by a player, takeable by the player (ruling 19: a friendly AI seat is). */
function seatsOf(e) {
    const out = [], ps = playerSeats().get(e.id);
    const enemy = e.team !== 0, bunker = isBunker(e.type);
    const n = bunker ? Math.min(cd.tSeatCount[e.type], bunkerFitted(e.crew)) : cd.tSeatCount[e.type]; // B1: the bunker's fitted mounts
    for (let j = 0; j < n; j++) {
        const occ = (e.crew & (1 << j)) !== 0, pl = !!ps && ps.has(j), mine = !!ps && ps.get(j) === pilotId;
        out.push({ j, role: cd.tSeatRole[e.type * data_ts_1.MAX_SEATS + j], occ, player: pl, me: mine, takeable: bunker ? !enemy && !occ : enemy ? e.crew === 0 : !occ || !pl });
    }
    return out;
}
/**
 * The sim's default seat for the player (CONTRACTS rev 4): a FREE seat first (the driver seat if free, else the first
 * free seat in seat order), else the driver seat if a friendly AI holds it (that AI walks home), else none.
 */
function defaultSeat(e) {
    const s = seatsOf(e), dj = cd.tDriverSeat[e.type];
    if (s[dj] && !s[dj].occ)
        return dj;
    const f = s.find((x) => !x.occ);
    if (f)
        return f.j;
    return s[dj]?.takeable ? dj : -1;
}
/** The nearest crewable vehicle whose hull is within reach of the pilot on foot (crew.enterRangeMetres). */
function nearVehicle() {
    if (!bodyRender || !onFoot())
        return null;
    const b = bodyRender;
    let best = null, bg = Infinity;
    for (const e of rendered) {
        if ((!crewable(e.type) && !(isBunker(e.type) && e.team === 0 && bunkerFitted(e.crew) > 0)) || e.id === b.id)
            continue; // B1: an own bunker too
        const r = cd.tRadius[e.type];
        const gap = Math.hypot(e.x - b.x, e.z - b.z) - r - PILOT_R;
        if (gap > CREW.enterRange - 0.1 || Math.abs(e.simY - b.simY) > 2 * r + CREW.enterRange)
            continue;
        if (gap < bg) {
            bg = gap;
            best = e;
        }
    }
    return best;
}
/** A friendly production building within 15 m of the pilot (first-person production panel). */
function nearBuilding() {
    if (!bodyRender)
        return null;
    let best = null, bg = 15;
    for (const e of rendered) {
        if (e.team !== 0 || !cd.tStructure[e.type] || cd.tProduces[e.type].length === 0)
            continue;
        const gap = Math.hypot(e.x - bodyRender.x, e.z - bodyRender.z) - cd.tRadius[e.type] * e.scale;
        if (gap < bg) {
            bg = gap;
            best = e;
        }
    }
    return best;
}
function chosenSeat(v) {
    const e = ent(v.id);
    if (!e)
        return -1;
    if (seatChoice && seatChoice.vehicle === v.id && seatsOf(e)[seatChoice.seat]?.takeable)
        return seatChoice.seat;
    return defaultSeat(e);
}
function cycleSeat(v) {
    const e = ent(v.id);
    if (!e)
        return;
    const s = seatsOf(e).filter((x) => x.takeable);
    if (!s.length) {
        notify("No seat you can take", "warn");
        return;
    }
    const cur = chosenSeat(v), i = s.findIndex((x) => x.j === cur);
    seatChoice = { vehicle: v.id, seat: s[(i + 1) % s.length].j };
    snd.ui("click");
}
function enterVehicle(v) {
    const e = ent(v.id);
    if (!e)
        return;
    const seat = chosenSeat(v);
    act({ kind: "enter", vehicle: v.id, seat: seat === defaultSeat(e) ? -1 : seat }, "ENTER");
}
/** Driver with an empty gunner seat: T makes the gunner weapon live instead of the driver's own (never both). */
function toggleGunner() {
    if (!seated() || !me)
        return;
    const e = ent(me.entity);
    if (!e || me.seat !== cd.tDriverSeat[e.type]) {
        notify("T: only the driver can take over an empty gunner seat's weapon", "warn");
        return;
    }
    if (!station.gunnerAvail && !gunnerMode) {
        notify("No empty gunner seat with a weapon in this vehicle", "warn");
        snd.ui("error");
        return;
    }
    gunnerMode = !gunnerMode;
    lastCtl = "";
    snd.ui("click");
    gunnerToggles++;
    notify(gunnerMode ? `GUNNER WEAPON LIVE · ${weaponName[gunnerWeaponOf(e.type)] ?? "turret"} · your own weapon is silent (T to switch back)` : `OWN WEAPON LIVE · ${weaponName[driverWeaponOf(e.type)] ?? "main gun"}`, "info");
}
let gunnerToggles = 0;
/** The driver's own weapon and the first gunner-seat weapon of a vehicle type (data). */
function driverWeaponOf(t) { const d = cd.tDriverSeat[t]; for (let m = 0; m < cd.tMountCount[t]; m++) {
    const j = cd.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + m];
    if (j === d || j < 0)
        return cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
} return -1; }
function gunnerWeaponOf(t) { const d = cd.tDriverSeat[t]; for (let m = 0; m < cd.tMountCount[t]; m++) {
    const j = cd.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + m];
    if (j >= 0 && j !== d && cd.tSeatRole[t * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_GUNNER)
        return cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
} return -1; }
/**
 * The enter prompt: exactly which seat F takes (the sim's default rule, or the seat picked with X) and what happens
 * (a free seat; the AI in that seat walks home; a 5 s hijack of an empty enemy), and what X offers instead.
 */
function enterPrompt(nv, de) {
    const name = typeName[nv.type], seats = seatsOf(de), s = chosenSeat(nv);
    if (isBunker(nv.type)) { // B1: the bunker's door: which mount F takes, how many this level fits
        const n = bunkerFitted(de.crew);
        if (s < 0)
            return `${name} · <span>every mount is manned</span>`;
        const alts = seats.filter((x) => x.takeable && x.j !== s);
        return `<b>F</b> Enter ${name} · <b>${seatLabel(nv.type, s)}</b> <span>(${n} mount${n > 1 ? "s" : ""} at this level · inside you are protected)</span>${alts.length ? ` · <b>X</b> ${seatLabel(nv.type, alts[0].j)}` : ""}`;
    }
    if (de.team !== 0 && de.crew !== 0)
        return `${name} · <span>ENEMY CREW ABOARD · snipe the driver (long rifle) to empty it</span>`;
    if (s < 0)
        return `${name} · <span>no seat you can take</span>`;
    const st = seats[s];
    const what = de.team !== 0 ? `EMPTY ENEMY · hijack: stay in contact ${HACK_S.toFixed(0)} s` : de.crew === 0 ? "empty" : st.occ ? "the AI in that seat will climb out and walk home" : "free seat";
    const verb = de.team !== 0 ? "Hijack" : "Enter";
    // what X would pick next (a different takeable seat), so the player can take the driver seat from an AI on purpose
    const alts = seats.filter((x) => x.takeable && x.j !== s);
    const alt = alts.length && de.team === 0 ? ` · <b>X</b> ${seatLabel(nv.type, alts[0].j)}${alts[0].occ ? " (AI walks home)" : ""}` : "";
    return `<b>F</b> ${verb} ${name} · <b>${seatLabel(nv.type, s)}</b> <span>(${what})</span>${alt}`;
}
const HACK_S = (data.constants.pilot?.hackVehicleSeconds) ?? 5;
/** As a gunner (or passenger) with an AI driver: a move order to the spot under the reticle. */
function pingDriver() {
    if (!seated() || !me)
        return;
    const e = ent(me.entity);
    if (!e)
        return;
    if (isBunker(e.type)) {
        notify("A bunker does not move", "warn");
        return;
    } // B1
    if (me.seat === cd.tDriverSeat[e.type]) {
        notify("You are driving: ping orders go to an AI driver", "warn");
        return;
    }
    const g = groundAt(cssW / 2, cssH / 2);
    if (!g)
        return;
    issueOrder([me.entity], { type: "move", x: g[0], z: g[2] }, cssW / 2, cssH / 2);
    pingMark = { x: g[0], z: g[2], t: performance.now() };
    notify("DRIVER · moving to your ping", "info");
}
let pingMark = null;
/** Friendly vehicles with an AI driver near the pilot (ruling 19), nearest first. */
function rideCandidates() {
    const out = [];
    if (!bodyRender)
        return out;
    const ps = playerSeats();
    for (const e of rendered) {
        const de = ent(e.id);
        if (!de || e.team !== 0 || !crewable(e.type) || de.driverless || de.hullCritical)
            continue;
        const dj = cd.tDriverSeat[e.type];
        if (!(de.crew & (1 << dj)) || ps.get(e.id)?.has(dj))
            continue;
        const dist = Math.hypot(e.x - bodyRender.x, e.z - bodyRender.z);
        if (dist < 1500)
            out.push({ id: e.id, type: e.type, dist });
    }
    return out.sort((a, b) => a.dist - b.dist).slice(0, 6);
}
function callRide(vehicle) {
    const e = ent(vehicle);
    if (!e)
        return;
    const reqId = reqSeq++;
    ride = { vehicle, since: performance.now(), typeName: typeName[e.type], reqId, status: "ordered" };
    send({ t: "order", reqId, ids: [vehicle], order: { type: "pickup", pilotId } });
    notify(`RIDE CALLED · ${typeName[e.type]} on its way`, "good");
    snd.ui("click");
}
/** Production options of a building type: units whose producedAt lists it and whose tier the building allows. */
const buildOptions = (bt) => cd.tProduces[bt].filter((t) => (cd.tProducesTierMask[bt] & (1 << cd.tTier[t])) !== 0);
/** Tier check from what the page sees: the team's own structures, and (C3) its supplied points from the points block. */
function tierReason(tier) {
    const busy = underConstruction();
    const held = ptModels.filter((m) => m.owner === 0 && m.supplied).length;
    for (let k = 1; k <= tier && k <= 3; k++) {
        if (PROD.tierPoints[k] > held)
            return `tier ${tier} needs ${PROD.tierPoints[k]} supplied points (you hold ${held})`;
        for (const bt of PROD.tierRequires[k])
            if (!rendered.some((e) => e.team === 0 && e.type === bt && !busy.has(e.id)))
                return `tier ${tier} needs the ${typeName[bt]}${rendered.some((e) => e.team === 0 && e.type === bt) ? " finished" : ""}`; // U1: as the sim, a building still under construction does not count
    }
    return null;
}
/** Ore and gas not yet committed: the stockpile minus the costs of queued items that have not started (costs are paid at start). */
function uncommitted() {
    let ore = teamRes?.ore ?? 0, gas = teamRes?.gas ?? 0, pilotsQueued = 0;
    const v = views[views.length - 1];
    if (v)
        for (const q of v.queues.values())
            q.items.forEach((t, i) => { pilotsQueued += (0, c11_ts_1.operatorSeats)(cd, t); if (i === 0 && q.started)
                return; ore -= cd.tCostOre[t]; gas -= cd.tCostGas[t]; });
    return { ore, gas, pilotsQueued };
}
/**
 * Whether the sim will accept an option now, and why not (the panel's greyed-out state; the sim itself refuses, ruling
 * 24: tier locked, queue full, and "cannotAfford" when the stockpile is below the cost now). An accepted item is paid
 * when it starts: when the queue ahead will spend the stock first, a warning says it will wait for resources.
 */
function optionState(building, t) {
    const q = views[views.length - 1]?.queues.get(building);
    const ore = teamRes?.ore ?? 0, gas = teamRes?.gas ?? 0;
    const shortOre = ore + 1e-9 < cd.tCostOre[t], shortGas = gas + 1e-9 < cd.tCostGas[t];
    const tr = tierReason(cd.tTier[t]);
    if (tr)
        return { ok: false, reason: tr, warn: "", shortOre, shortGas };
    // C7a hook: no vehicle licence gate here any more (ruling 56: every vehicle is open to every player)
    if (q && q.items.length >= PROD.queueLength)
        return { ok: false, reason: `queue full (${PROD.queueLength})`, warn: "", shortOre, shortGas };
    if (shortOre || shortGas)
        return { ok: false, reason: `not enough ${shortOre && shortGas ? "ore and gas" : shortOre ? "ore" : "gas"} (stock ${Math.floor(ore)} ore · ${Math.floor(gas)} gas)`, warn: "", shortOre, shortGas };
    const u = uncommitted();
    const warn = u.ore + 1e-9 < cd.tCostOre[t] || u.gas + 1e-9 < cd.tCostGas[t] ? "the queue ahead spends the stock first: it will wait for resources"
        : teamRes?.pilots ? (0, c11_ts_1.crewWarning)((0, c11_ts_1.operatorSeats)(cd, t), teamRes.pilots.available, u.pilotsQueued) : ""; // C11: the pilot reserve (ruling 48)
    return { ok: true, reason: "", warn, shortOre, shortGas };
}
/** "Not enough ore / gas" with the numbers (the sim's cannotAfford). */
function affordText(t) {
    const ore = Math.floor(teamRes?.ore ?? 0), gas = Math.floor(teamRes?.gas ?? 0), lo = ore < cd.tCostOre[t], lg = gas < cd.tCostGas[t];
    const what = lo && lg ? "ore and gas" : lo ? "ore" : "gas";
    return `not enough ${what}: needs ${cd.tCostOre[t]} ore · ${cd.tCostGas[t]} gas, stock ${ore} ore · ${gas} gas`;
}
let refusedCount = 0;
/** Queues an option: always sent to the sim, which accepts or refuses it with a reason (REJECT event; ruling 24). */
function queueOption(building, i) {
    const b = ent(building);
    if (!b)
        return;
    const t = buildOptions(b.type)[i];
    if (t === undefined)
        return;
    act({ kind: "queue", building, unit: cd.typeIds[t] }, `QUEUE ${typeName[t].toUpperCase()}`, { building, type: t });
    snd.ui("click");
}
/** The sim refused a production order: the reason in the feed and on the panel. */
function productionRefused(type, reason) {
    const text = reason === "cannotAfford" ? affordText(type) : reason === "tierLocked" ? `${(0, c6_ts_1.reasonText)(reason)}${tierReason(cd.tTier[type]) ? " · " + tierReason(cd.tTier[type]) : ""}` : (0, c6_ts_1.reasonText)(reason);
    notify(`CANNOT QUEUE ${typeName[type].toUpperCase()} · ${text}`, "warn");
    snd.ui("error");
    refusedCount++;
    prodRefusal = { text, until: performance.now() + 3500 * feedbackScale, reason };
}
let prodRefusal = null;
function cancelItem(building, index) {
    const q = views[views.length - 1]?.queues.get(building);
    const t = q?.items[index];
    act({ kind: "cancel", building, index }, "CANCEL");
    if (t !== undefined)
        notify(`Cancelled ${typeName[t]}${index === 0 && q.started ? ` · refunded ${cd.tCostOre[t]} ore, ${cd.tCostGas[t]} gas` : ""}`, "info");
    snd.ui("click");
}
// ------------------------------------------------------------------ B2: production from first person, anywhere (designer 15 Nov 18:46)
/** J in first person (on foot or seated): every own production building's options, queued at the nearest that can (or a picked one). */
const prodAny = { open: false, pick: 0, rallyMe: false, queued: 0, opened: 0, lastAt: 0, lastType: -1 };
/** Buildings whose rally point follows the pilot ("rally to me"), with the last point sent. */
const rallyMe = new Map();
let rallyCheckAt = 0, lastProdRows = [];
function prodBuildings() {
    const me0 = bodyRender, busy = underConstruction(), out = [];
    for (const e of rendered) {
        if (e.team !== 0 || !cd.tStructure[e.type] || buildOptions(e.type).length === 0)
            continue;
        out.push({ id: e.id, type: e.type, name: typeName[e.type], dist: me0 ? Math.hypot(e.x - me0.x, e.z - me0.z) : 0, building: busy.has(e.id) });
    }
    return out;
}
/** Designer 17 Nov: the unit's role, shown next to its name in the production menus (not on screen). */
const UNIT_ROLE = {
    dart: "scout", lancer: "light tank", bastion: "heavy tank", hammer: "artillery tank", salvo: "rocket tank", flak: "anti-air tank",
    carrier: "troop carrier", strider: "siege walker", wasp: "gunship", mule: "transport aircraft",
    harvester: "ore harvester", hauler: "supply hauler", constructor: "builder", "forward-base-vehicle": "mobile base",
    "trooper-squad": "infantry", "sapper-team": "demolition infantry",
};
const roleOf = (t) => UNIT_ROLE[cd.typeIds[t]] ?? "";
const roleSpan = (t) => { const r = roleOf(t); return r ? ` <small class="role">${r}</small>` : ""; };
function prodRowsNow() {
    const bs = prodBuildings();
    if (prodAny.pick && !bs.some((b) => b.id === prodAny.pick))
        prodAny.pick = 0;
    return lastProdRows = (0, b2_prod_ts_1.prodAnyRows)(bs, buildOptions, (t) => cd.tTier[t], typeName, (b, t) => optionState(b, t), prodAny.pick);
}
function toggleProdAny() {
    if (prodAny.open) {
        prodAny.open = false;
        lockPointer();
        snd.ui("click");
        return;
    }
    if (dead())
        return;
    prodAny.open = true;
    prodAny.opened++;
    fpBuilding = 0;
    rideMenu = false;
    if (buildPanel?.src === "tool")
        buildPanel = null;
    placing = null;
    unlock();
    snd.ui("click");
}
function prodAnyQueue(i) {
    const r = prodRowsNow()[i];
    if (!r)
        return;
    if (!r.at) {
        notify(`CANNOT QUEUE ${r.name.toUpperCase()} · ${r.reason}`, "warn");
        snd.ui("error");
        return;
    }
    const b = ent(r.at);
    if (!b)
        return;
    queueOption(r.at, buildOptions(b.type).indexOf(r.t));
    prodAny.queued++;
    prodAny.lastAt = r.at;
    prodAny.lastType = r.t;
    if (prodAny.rallyMe) {
        rallyMe.set(r.at, null);
        prodAnyRally(performance.now(), true);
    }
    notify(`QUEUED ${r.name.toUpperCase()} at the ${r.atName} · ${Math.round(r.atDist)} m${prodAny.rallyMe ? " · it comes to you" : ""}`, "info");
}
function prodAnyToggleRally() {
    prodAny.rallyMe = !prodAny.rallyMe;
    snd.ui("click");
    if (!prodAny.rallyMe) {
        for (const id of rallyMe.keys())
            if (ent(id))
                act({ kind: "rally", building: id, point: null }, "RALLY POINT");
        rallyMe.clear();
    }
}
/** "Rally to me": every 2 s, the rally point of the buildings ordered from this menu follows the pilot (or his vehicle). */
function prodAnyRally(now, force = false) {
    if (!rallyMe.size || !bodyRender || mode !== "fp" || dead())
        return;
    if (!force && now - rallyCheckAt < b2_prod_ts_1.PROD_RALLY_MS)
        return;
    rallyCheckAt = now;
    const x = bodyRender.x, z = bodyRender.z;
    for (const [id, last] of rallyMe) {
        if (!ent(id)) {
            rallyMe.delete(id);
            continue;
        }
        if (!(0, b2_prod_ts_1.rallyNeedsUpdate)(last, x, z))
            continue;
        const pt = [Math.round(x), Math.round(z)];
        act({ kind: "rally", building: id, point: pt }, "RALLY POINT");
        rallyMe.set(id, pt);
    }
}
function prodAnyHtml(v, now) {
    const rows = prodRowsNow(), bs = prodBuildings().sort((a, b) => a.dist - b.dist);
    let h = `<div class="ph">PRODUCTION · J<span class="x" data-act="close">×</span></div>`;
    if (!bs.length)
        return h + `<div class="refused">You have no production building (Command Core, Foundry, Barracks, Air Pad)</div><div class="note">J / Esc close</div>`;
    h += `<div class="note">queue at: <span class="pa ${prodAny.pick ? "" : "on"}" data-act="paAt" data-b="0">NEAREST THAT CAN</span>${bs.map((b) => `<span class="pa ${prodAny.pick === b.id ? "on" : ""}" data-act="paAt" data-b="${b.id}">${b.name} · ${Math.round(b.dist)} m${b.building ? " · building" : ""}</span>`).join("")}</div>`;
    h += `<div class="opts">` + rows.slice(0, 18).map((r, i) => `<div class="opt ${r.ok ? "" : "no"}" data-act="pa" data-b="0" data-i="${i}"><span class="k">${i < 9 ? i + 1 : ""}</span><span class="n">${r.name}${roleSpan(r.t)}</span><span class="c">${cd.tCostOre[r.t]} ore · ${cd.tCostGas[r.t]} gas · ${(PROD.buildTicks[cd.tTier[r.t]] * dt).toFixed(0)} s · T${cd.tTier[r.t]}${r.at ? ` · ${r.atName} ${Math.round(r.atDist)} m` : ""}</span>${r.ok ? (r.warn ? `<small class="w">${r.warn}</small>` : "") : `<small>${r.reason}</small>`}</div>`).join("") + `</div>`;
    const qs = bs.filter((b) => (v.queues.get(b.id)?.items.length ?? 0) > 0);
    h += `<div class="ph2">QUEUES${qs.length ? " · click an item to cancel (refund)" : " · none"}</div>`;
    for (const b of qs) {
        const q = v.queues.get(b.id);
        h += `<div class="note">${b.name} · ${Math.round(b.dist)} m${rallyMe.has(b.id) ? " · rally: you" : ""}</div>`;
        h += q.items.map((t, i) => `<div class="qi" data-act="cancel" data-b="${b.id}" data-i="${i}"><span class="n">${typeName[t]}</span><small>${i === 0 ? (q.started ? `${Math.floor(q.progress * 20) * 5}%${q.hold ? " · held" : ""}` : "starting") : "waiting"}</small></div>`).join("");
    }
    h += `<div class="note"><span class="pa ${prodAny.rallyMe ? "on" : ""}" data-act="paRally" data-b="0">RALLY TO ME ${prodAny.rallyMe ? "ON" : "OFF"}</span> new vehicles come to where you are</div>`;
    if (prodRefusal && now < prodRefusal.until)
        h += `<div class="refused">CANNOT QUEUE · ${prodRefusal.text}</div>`;
    h += `<div class="note">1-${Math.min(9, rows.length)} or click: queue · keep moving (W A S D) · J / Esc close</div>`;
    return h;
}
// ------------------------------------------------------------------ C4: construction (command view and the pilot's build tool)
const T_CONSTRUCTOR = cd.typeIds.indexOf("constructor");
/**
 * The open build menu: the point it is for, the Constructor named in the order (-1: the sim sends the team's nearest),
 * and where it was opened (the command view's panel, or the pilot's build tool in first person; same content).
 */
let buildPanel = null;
/** The Constructor selection the player closed the menu for (it does not reopen until the selection changes). */
let buildDismissed = "";
let buildRefusal = null;
let lastBuildHtml = "", buildPlaced = 0, buildCancels = 0, ctorQueued = 0, lastBuildMenu = null;
let lastBuildOrder = null;
function ownConstructors() { return rendered.filter((e) => e.team === 0 && e.type === T_CONSTRUCTOR); }
function selectedConstructors() { return Array.from(selected).filter((id) => renderedById.get(id)?.type === T_CONSTRUCTOR).sort((a, b) => a - b); }
/** Entity ids of structures still under construction (they produce nothing until done). */
function underConstruction() {
    // C7b item 1: the snapshot's under-construction flag (w2f crew bit 15) on every structure in view, enemy ones too; the own sites list as before
    const v = views[views.length - 1], out = new Set();
    if (!v)
        return out;
    for (const e of v.entities.values())
        if (e.underConstruction)
            out.add(e.id);
    for (const st of v.construction?.sites ?? [])
        if (st.entity)
            out.add(st.entity);
    return out;
}
/** An own, finished building that can produce a Constructor (0: none). */
function constructorFactory() {
    if (T_CONSTRUCTOR < 0)
        return 0;
    const busy = underConstruction();
    for (const e of rendered)
        if (e.team === 0 && cd.tStructure[e.type] && !busy.has(e.id) && buildOptions(e.type).includes(T_CONSTRUCTOR))
            return e.id;
    return 0;
}
function buildCtx() {
    const v = views[views.length - 1];
    return {
        data, typeIds: cd.typeIds, names: typeName, costOre: cd.tCostOre, costGas: cd.tCostGas, tier: cd.tTier, statics: ptStatics,
        points: v?.points, construction: v?.construction, team: 0, ore: teamRes?.ore ?? 0, gas: teamRes?.gas ?? 0,
        tierReason, constructors: ownConstructors().length, factory: constructorFactory(), gravity: PLANET_GRAVITY, // C9: Mass Driver
    };
}
function openBuild(point, ctor, src) {
    if (point < 0) {
        notify("BUILD · you hold no point to build at", "warn");
        snd.ui("error");
        return;
    }
    buildPanel = { point, ctor, src };
    buildRefusal = null;
    fpBuilding = 0;
    rideMenu = false;
    if (src === "tool")
        unlock();
    snd.ui("click");
}
function closeBuild() { if (buildPanel?.src === "cmd")
    buildDismissed = selectedConstructors().join(","); buildPanel = null; }
/**
 * B2 (designer 15 Nov 18:38): picking a building in the menu enters PLACEMENT MODE: its ghost follows the cursor (command
 * view) or the aim (build tool); LMB sends the order at that spot and facing (queueBuild with a position and yaw), and
 * the nearest Constructor (or the selected one) drives over and builds it (BACKLOG 37). Shift+LMB keeps placing.
 */
function placeBuild(i) {
    if (!buildPanel)
        return;
    const m = (0, c4_ts_1.buildMenu)(buildCtx(), buildPanel.point), it = m.items[i];
    if (!it)
        return;
    const ctor = buildPanel.ctor >= 0 && renderedById.get(buildPanel.ctor)?.type === T_CONSTRUCTOR ? buildPanel.ctor : -1;
    placing = { type: it.type, t: it.t, name: it.name, ctor, src: buildPanel.src, yaw: NaN, check: null, placed: 0, point: m.point };
    placeStats.entered++;
    snd.ui("click");
    if (buildPanel.src === "tool") {
        buildPanel = null;
        lockPointer();
    } // the tool's menu closes; the ghost follows the aim
}
/** B2: the placement in progress (null: none). yaw NaN until first shown (then the default facing towards the map centre). */
let placing = null;
const placeStats = { entered: 0, placed: 0, refused: 0, cancelled: 0, rotated: 0, ghostsDrawn: 0, siteGhosts: 0, lastText: "" };
/** Orders sent but not yet on the wire as sites: they block the footprint for a moment (Shift+LMB rows). */
let recentPlaced = [];
const PLACE_RANGE_FP = 70; // m: the build tool places within this distance of the pilot
const UNBUILDABLE = new Set((data.terrain?.types ?? []).filter((t) => t.buildable === false).map((t) => t.id));
const BUILD_SPACING = Number((cd.constants.construction ?? {}).spacingMetres ?? 4);
function placeWorld() {
    const v = views[views.length - 1], now = performance.now();
    recentPlaced = recentPlaced.filter((r) => r.until > now);
    const structures = [];
    for (const e of rendered)
        if (cd.tStructure[e.type])
            structures.push({ x: e.x, z: e.z, t: e.type });
    for (const gh of structMem.ghosts(v ? v.entities : new Map()))
        structures.push({ x: gh.x, z: gh.z, t: gh.type });
    for (const st of v?.construction?.sites ?? [])
        if (!st.entity)
            structures.push({ x: st.x, z: st.z, t: st.type });
    for (const r of recentPlaced)
        structures.push({ x: r.x, z: r.z, t: r.t });
    const units = [];
    for (const e of rendered)
        if (!cd.tStructure[e.type] && !cd.tAir[e.type] && e.alt < 2)
            units.push({ x: e.x, z: e.z, r: kindOfType[e.type] === "infantry" ? 0.6 : cd.tRadius[e.type] });
    return { mapSize: MAP_SIZE, spacing: BUILD_SPACING, radius: cd.tRadius, structures, units, geysers: scenMap?.geysers ?? [], height: (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), layerAt: TLAYER ? (x, z) => (0, c6_ts_5.layerTypeAt)(TLAYER, x, z) : undefined, unbuildable: UNBUILDABLE };
}
/** B2: where the ghost is this frame (cursor / aim on the ground) and whether it may be placed there. */
function updatePlacement() {
    if (!placing)
        return;
    // the tool's placement ends when the pilot leaves his feet or the first person; the command view's when the view changes
    if (placing.src === "tool" ? mode !== "fp" || !onFoot() || kit !== KIT_BUILD || dead() : mode !== "cmd") {
        placing = null;
        return;
    }
    let g = mode === "cmd" ? groundAt(mouseX, mouseY) : groundAt(cssW / 2, cssH / 2);
    if (mode === "fp" && bodyRender) {
        // the build tool reaches PLACE_RANGE_FP: past it (or at the sky) the ghost stops at the range along the aim
        const b = bodyRender, d = g ? Math.hypot(g[0] - b.x, g[2] - b.z) : Infinity;
        if (!g || d > PLACE_RANGE_FP) {
            const x = b.x + Math.cos(camYaw) * PLACE_RANGE_FP, z = b.z + Math.sin(camYaw) * PLACE_RANGE_FP;
            g = [x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), z];
        }
    }
    if (!g) {
        placing.check = null;
        return;
    }
    const chk = (0, c4_ts_1.placementCheck)(buildCtx(), placeWorld(), placing.type, g[0], g[2]);
    if (!Number.isFinite(placing.yaw))
        placing.yaw = (0, c4_ts_1.defaultPlaceYaw)(chk.x, chk.z, MAP_SIZE);
    placing.check = chk;
    placeStats.lastText = chk.ok ? "ok" : chk.reason;
}
function rotatePlacement(dir) { if (!placing)
    return; if (!Number.isFinite(placing.yaw))
    placing.yaw = 0; placing.yaw = (0, c4_ts_1.snapYaw)(placing.yaw + dir * c4_ts_1.PLACE_YAW_STEP); placeStats.rotated++; snd.ui("click"); }
function cancelPlacement() { if (!placing)
    return; placing = null; placeStats.cancelled++; snd.ui("click"); }
/** LMB in placement: the order at the ghost's spot and facing (Shift: stay in placement for the next one). */
function confirmPlacement(keep) {
    if (!placing)
        return;
    updatePlacement();
    const c = placing?.check;
    if (!placing || !c) {
        notify("BUILD · no ground there", "warn");
        snd.ui("error");
        return;
    }
    if (!c.ok) {
        notify(`CANNOT BUILD ${placing.name.toUpperCase()} HERE · ${c.reason}`, "warn");
        snd.ui("error");
        placeStats.refused++;
        return;
    }
    const yaw = (0, c4_ts_1.snapYaw)(placing.yaw), at = [Math.round(c.x * 100) / 100, Math.round(c.z * 100) / 100];
    lastBuildOrder = { type: placing.type, point: c.point, constructor: placing.ctor, at, yaw };
    act({ kind: "build", type: placing.type, point: c.point, constructor: placing.ctor, at, yaw }, `BUILD ${placing.name.toUpperCase()}`, undefined, { type: placing.t });
    recentPlaced.push({ x: at[0], z: at[1], t: placing.t, until: performance.now() + 2500 });
    buildPlaced++;
    placing.placed++;
    placeStats.placed++;
    snd.ui("confirm");
    if (!keep)
        placing = null;
}
/** Footprint, facing arrow (glowing dots) and the reason tag of the ghost; the own sites still waiting for a Constructor get a footprint too. */
function placementDots(now) {
    const p = placing, c = p?.check;
    if (p && c) {
        const r = cd.tRadius[p.t], col = c.ok ? [0.35, 1, 0.45] : [1, 0.3, 0.22], pulse = 0.75 + 0.25 * Math.sin(now / 140);
        const n = Math.max(20, Math.min(64, Math.round(r * 4)));
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.35, z, 0.24, col, 0.9 * pulse);
        }
        // facing: a line of dots from the centre past the footprint and an arrow head
        const fx0 = Math.cos(p.yaw), fz0 = Math.sin(p.yaw), len = r + 4;
        for (let k = 0; k <= Math.ceil(len); k++) {
            const d = Math.min(len, k), x = c.x + fx0 * d, z = c.z + fz0 * d;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.4, z, k === 0 ? 0.4 : 0.26, col, 0.95);
        }
        for (const sd of [-1, 1]) {
            const a = p.yaw + Math.PI + sd * 0.55, ex = c.x + fx0 * len, ez = c.z + fz0 * len;
            for (let j = 1; j <= 3; j++) {
                const x = ex + Math.cos(a) * j * 0.9, z = ez + Math.sin(a) * j * 0.9;
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.4, z, 0.26, col, 0.95);
            }
        }
    }
}
/** The ghost's tag: the building and, red, why it cannot go there (or the keys when it can). Called from the tag pass. */
const placeInfoEl = document.getElementById("placeInfo");
function placementTag() {
    const p = placing, c = p?.check;
    // designer playtest 15 Nov 21:19: in the command view only the outline follows the cursor; the name, keys and
    // reason sit in a fixed line above the hint bar
    if (placeInfoEl) {
        const show = !!p && mode === "cmd";
        placeInfoEl.style.display = show ? "" : "none";
        if (show && p) {
            const h = `<b>${p.name.toUpperCase()}</b> · ${!c ? "" : c.ok ? "LMB place · Shift+LMB several · R / wheel rotate · RMB cancel" : `<span class="bad">${c.reason}</span>`}`;
            if (placeInfoEl.innerHTML !== h)
                placeInfoEl.innerHTML = h;
        }
    }
    if (!p || !c || mode === "cmd")
        return;
    const top = (0, terrain_gen_ts_1.sampleHeight)(hm, c.x, c.z) + (R.kindMesh(kindOfType[p.t])?.height ?? 6) + 3;
    const keys = "LMB place · Shift+LMB several · R / Q E / wheel rotate · RMB cancel";
    tag(c.x, top, c.z, `${p.name.toUpperCase()}<small>${c.ok ? keys : c.reason}</small>`, `placeghost ${c.ok ? "ok" : "bad"}`);
}
/** The ghost (translucent real mesh, green / red) and the own sites still waiting for their Constructor (team-tinted outline ghosts). */
let ghostBuf = new Float32Array(render_ts_1.INST_FLOATS * 4);
const ghostRing = new Float32Array(render_ts_1.DISC_FLOATS);
function drawPlacementGhosts(edges) {
    placeStats.ghostsDrawn = 0;
    placeStats.siteGhosts = 0;
    const v = views[views.length - 1];
    const byKind = new Map();
    for (const st of v?.construction?.sites ?? []) {
        if (st.team !== 0 || st.entity !== 0 || st.type < 0 || st.type >= cd.typeIds.length)
            continue;
        const yaw = st.yaw >= 0 ? (st.yaw * Math.PI * 2) / 256 : Math.atan2(MAP_SIZE / 2 - st.z, MAP_SIZE / 2 - st.x);
        const k = kindOfType[st.type];
        if (!byKind.has(k))
            byKind.set(k, []);
        byKind.get(k).push(st.x, (0, terrain_gen_ts_1.sampleHeight)(hm, st.x, st.z) + drawLift[st.type], st.z, yaw);
    }
    for (const [k, a] of byKind) {
        const n = a.length / 4;
        ghostBuf = grow(ghostBuf, n * render_ts_1.INST_FLOATS);
        for (let i = 0; i < n; i++)
            putInst(ghostBuf, i * render_ts_1.INST_FLOATS, a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3], a[i * 4 + 3], 0, 0, 1);
        R.drawGhost(k, ghostBuf, n, render_ts_1.HALCYON.glowA, 0.2);
        if (edges)
            R.drawKindEdges(k, n, wire);
        placeStats.siteGhosts += n;
    }
    const p = placing, c = p?.check;
    if (p && c) {
        const k = kindOfType[p.t];
        putInst(ghostBuf, 0, c.x, (0, terrain_gen_ts_1.sampleHeight)(hm, c.x, c.z) + drawLift[p.t], c.z, p.yaw, p.yaw, 0, 0, 1);
        const col = c.ok ? [0.3, 1, 0.42] : [1, 0.25, 0.18];
        R.drawGhost(k, ghostBuf, 1, col, 0.42 + 0.25 * wire);
        // the footprint as a ground ring in the ghost's colour (both views; the tactical display hides the glowing dots)
        (0, terrain_gen_ts_1.sampleNormal)(hm, c.x, c.z, nrm);
        for (const [rr, al] of [[cd.tRadius[p.t], 0.95], [cd.tRadius[p.t] + BUILD_SPACING, 0.3]]) {
            ghostRing[0] = c.x;
            ghostRing[1] = (0, terrain_gen_ts_1.sampleHeight)(hm, c.x, c.z);
            ghostRing[2] = c.z;
            ghostRing[3] = rr;
            ghostRing[4] = nrm[0];
            ghostRing[5] = nrm[1];
            ghostRing[6] = nrm[2];
            ghostRing[7] = al;
            R.drawRings(ghostRing, 1, col);
        }
        placeStats.ghostsDrawn = 1;
    }
}
function cancelSite(site) {
    act({ kind: "cancelBuild", site }, "CANCEL BUILD");
    buildCancels++;
    snd.ui("click");
}
function queueConstructor() {
    const f = constructorFactory();
    if (!f) {
        notify("No building can make a Constructor", "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "queue", building: f, unit: "constructor" }, "QUEUE CONSTRUCTOR", { building: f, type: T_CONSTRUCTOR });
    ctorQueued++;
    notify(`CONSTRUCTOR QUEUED at the ${typeName[ent(f)?.type ?? 0]}`, "info");
    snd.ui("click");
}
/** The sim refused a building order: the reason in the feed and on the menu. */
function buildRefused(type, reason) {
    const text = reason === "cannotAfford" ? affordText(type) : reason === "tierLocked" ? `${(0, c6_ts_1.reasonText)(reason)}${tierReason(cd.tTier[type]) ? " · " + tierReason(cd.tTier[type]) : ""}` : (0, c6_ts_1.reasonText)(reason);
    notify(`CANNOT BUILD ${typeName[type].toUpperCase()} · ${text}`, "warn");
    snd.ui("error");
    refusedCount++;
    buildRefusal = { text, until: performance.now() + 3500 * feedbackScale, reason };
}
/** The build menu HTML (rebuilt only when its structure changes; site progress bars are updated in place). */
function buildPanelHtml(m, sites, now) {
    const src = buildPanel.src;
    const ctorName = buildPanel.ctor >= 0 && renderedById.has(buildPanel.ctor) ? `selected Constructor #${buildPanel.ctor} builds it` : "the nearest Constructor builds it";
    let h = `<div class="ph">BUILD · ${m.name.toUpperCase()}<span class="x" data-act="bclose">×</span></div>`;
    h += `<div class="note">${m.slotText}${m.blocked || m.noConstructor ? "" : ` · ${ctorName}`}</div>`;
    if (m.noConstructor)
        h += `<div class="refused nocon">${m.constructorText}${m.canQueueConstructor ? ` <button class="btn" data-act="bctor" data-b="0">QUEUE A CONSTRUCTOR</button>` : ""}</div>`;
    if (m.blocked)
        h += `<div class="refused">${m.blocked}</div>`;
    h += econSectionHtml(m.point, m.owned);
    h += `<div class="opts">` + m.items.map((it, i) => { const un = (0, c6_ts_4.tierUnlocks)(data, it.type); return `<div class="opt ${it.ok ? "" : "no"}" data-act="build" data-b="${m.point}" data-i="${i}"><span class="k">${i + 1}</span><span class="n">${it.name}</span><span class="c">${it.ore} ore · ${it.gas} gas · ${it.seconds} s${it.defence ? " · defence" : ""}${it.geyser ? " · on a geyser" : ""}</span>${un ? `<small class="unl">${un}</small>` : ""}${it.ok ? "" : `<small>${it.reason}</small>`}</div>`; }).join("") + `</div>`;
    const here = sites.filter((st) => st.own && st.point === m.point);
    h += `<div class="ph2">SITES HERE ${here.length}${here.length ? " · click one to cancel (full refund)" : ""}</div>`;
    h += here.length ? here.map((st) => `<div class="qi" data-act="bcancel" data-b="${st.id}" data-site="${st.id}"><span class="n">${st.name}</span><i><b></b></i><small class="hd"></small></div>`).join("") : `<div class="note">none</div>`;
    if (src === "cmd") {
        const own = ptModels.filter((p) => p.owner === 0 && p.index !== m.point);
        if (own.length)
            h += `<div class="note">other points: ${own.map((p) => `<span class="lnk" data-act="bpt" data-b="${p.index}">${ptStatics[p.index].name}</span>`).join("")}</div>`;
    }
    if (buildRefusal && now < buildRefusal.until)
        h += `<div class="refused">CANNOT BUILD · ${buildRefusal.text}</div>`;
    h += `<div class="note">${src === "cmd" ? "click a structure, then place it on the map (LMB · Shift+LMB several · R / wheel rotate · RMB cancel) · a Constructor builds it · B / Esc close" : `1-${m.items.length} or click: pick a structure, then place it where you aim (LMB) · a Constructor drives over and builds it · B / Esc close`}</div>`;
    return h;
}
function updateBuildPanel(now) {
    const el = $("build"), v = views[views.length - 1];
    // command view: a selected Constructor opens the menu for the point it stands in (or the nearest own point)
    if (mode === "cmd" && started && !matchLocked()) {
        const ctors = selectedConstructors(), key = ctors.join(",");
        if (!ctors.length && buildDismissed)
            buildDismissed = "";
        if (ctors.length && key !== buildDismissed && (!buildPanel || buildPanel.ctor < 0 || !ctors.includes(buildPanel.ctor))) {
            const c = renderedById.get(ctors[0]);
            buildPanel = { point: (0, c4_ts_1.defaultBuildPoint)(ptStatics, v?.points, 0, c.x, c.z), ctor: c.id, src: "cmd" };
            if (buildPanel.point < 0)
                buildPanel = null;
        }
        else if (buildPanel && buildPanel.ctor >= 0 && !ctors.includes(buildPanel.ctor) && buildPanel.src === "cmd")
            buildPanel = null;
    }
    const show = !!buildPanel && started && !matchLocked() && !placing && (buildPanel.src === "cmd" ? mode === "cmd" : mode === "fp" && onFoot()); // B2: hidden while placing
    if (!show) {
        if (buildPanel && buildPanel.src === "tool" && (mode !== "fp" || !onFoot()))
            buildPanel = null;
        el.style.display = "none";
        lastBuildMenu = null;
        return;
    }
    const m = (0, c4_ts_1.buildMenu)(buildCtx(), buildPanel.point), sites = (0, c4_ts_1.siteModels)(v?.construction, 0, typeName);
    lastBuildMenu = m;
    const html = buildPanelHtml(m, sites, now);
    if (html !== lastBuildHtml) {
        el.innerHTML = html;
        lastBuildHtml = html;
    }
    for (const st of sites) {
        const row = el.querySelector(`.qi[data-site="${st.id}"]`);
        if (!row)
            continue;
        const bar = row.querySelector("i b"), hd = row.querySelector(".hd");
        if (bar)
            bar.style.width = (st.progress * 100).toFixed(0) + "%";
        const t = st.waiting ? (st.builder ? "Constructor on the way" : "waiting for a Constructor") : `${Math.round(st.progress * 100)}%`;
        if (hd && hd.textContent !== t)
            hd.textContent = t;
    }
    el.style.display = "block";
}
// panel clicks (production options, queue items, rally, pick-me-up)
document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !started)
        return;
    const a = el.dataset.act, b = Number(el.dataset.b), i = Number(el.dataset.i);
    if (a === "queue")
        queueOption(b, i);
    else if (a === "cancel")
        cancelItem(b, i);
    else if (a === "rallyClear")
        act({ kind: "rally", building: b, point: null }, "RALLY POINT");
    else if (a === "close") {
        closePanels();
        selBuilding = 0;
    }
    else if (a === "pickup") {
        if (onFoot())
            callRide(b);
        else
            notify("You are not on foot", "warn");
    }
    else if (a === "ride") {
        callRide(b);
        rideMenu = false;
    }
    else if (a === "c2o") {
        // C8 (QA4 bug 19): an order that needs a spot or a unit (guard, defend here, harvest) is armed by its button and
        // given by the next map click (as the hotkeys use the cursor); the others go at once
        const k = c2_ts_1.ORDER_KEYS[i];
        if (k && POINTED_ORDERS[k.b]) {
            armedCmd = { kind: `c2:${k.b}`, label: `${k.label.toUpperCase()} · ${POINTED_ORDERS[k.b]}` };
            snd.ui("click");
        }
        else if (k)
            cmdOrder(k.b, cssW / 2, cssH / 2);
    }
    else if (a === "c2f") {
        cmdKey(c2_ts_1.FORMATION_KEY);
    }
    else if (a === "jammer")
        toggleJammer(b);
    else if (a === "bg")
        groupButton(el.dataset.k ?? "", b);
    else if (a === "lo")
        loadoutToggle(el.dataset.k ?? "");
    else if (a === "loApply")
        loadoutApply();
    else if (a === "loOpen") {
        if (!loOpen)
            toggleLoadoutPanel();
    }
    else if (a === "loClose") {
        if (loOpen)
            toggleLoadoutPanel();
    }
    else if (a === "shellGround")
        armShellGround(); // C8 (ruling 40)
    else if (a === "c9")
        c9Click(el.dataset.k ?? "", b, i); // C9
    else if (a === "c11crew")
        c11Crew(); // C11
    else if (a === "tpArm") {
        armedCmd = el.dataset.k === "unload" ? { kind: "unload", label: "UNLOAD · click the drop spot" } : { kind: "load", label: "LOAD / LIFT · click the transport (or the vehicle to lift)" };
        snd.ui("click");
    }
    else if (a === "hvAll") {
        allHarvestersToWork();
    }
    else if (a === "build")
        placeBuild(i);
    else if (a === "pa")
        prodAnyQueue(i); // B2: production anywhere
    else if (a === "paAt") {
        prodAny.pick = b;
        snd.ui("click");
    }
    else if (a === "paRally")
        prodAnyToggleRally();
    else if (a === "bcancel")
        cancelSite(b);
    else if (a === "bpt") {
        if (buildPanel) {
            buildPanel.point = b;
            buildRefusal = null;
            snd.ui("click");
        }
    }
    else if (a === "bctor")
        queueConstructor();
    else if (a === "bclose")
        closeBuild();
    // C6 item 6: fortify a point, deploy / pack a forward base
    else if (a === "fortify") {
        act({ kind: "fortify", point: b, constructor: -1 }, "FORTIFY");
        econStats.fortifyClicks++;
        snd.ui("click");
    }
    else if (a === "fbdeploy") {
        act({ kind: "deployBase", vehicle: b }, "DEPLOY BASE");
        econStats.deployClicks++;
        snd.ui("click");
    }
    else if (a === "fbpack") {
        act({ kind: "packBase", depot: b }, "PACK BASE");
        econStats.packClicks++;
        snd.ui("click");
    }
    e.stopPropagation();
});
// ------------------------------------------------------------------ C5: support calls (first person menu and codes, armed call, beacons, command view bar)
const callRules = (0, c5_ts_1.callCtx)(data, cd.typeIds, Math.round(1 / dt));
/** The call menu (hold CALL_KEY in first person): open, and the arrow-code steps typed so far. */
const callMenu = { open: false, code: { steps: [] } };
/** The armed call (first person only): the beacon in hand on foot, the designator in a vehicle. Armed only by its code. */
let armedCall = null;
let callMsg = null;
const callStats = { opened: 0, steps: 0, wrong: 0, armed: 0, refusedLocal: 0, thrown: 0, cancelled: 0, refusedSim: 0, queued: 0, impacts: 0, lastAction: null, lastResult: "", beaconsThrown: 0, thrownDrawn: 0, trailDots: 0, columnsDrawn: 0, previewPts: 0 };
let lastCallHtml = "", lastCallRows = [];
const callTick = () => views.length ? views[views.length - 1].tick : 0;
function callCtxNow() { return { data, rules: callRules, tick: callTick(), dt, seated: seated() }; }
function currentCallRows() { return (0, c5_ts_1.callRows)(callCtxNow(), views.length ? views[views.length - 1].calls : null).filter((r) => r.reason !== "callHidden" && !(r.id === "vehicle-drop" && !views[views.length - 1]?.calls && c11DropHidden(r.call))).map(c9CallRow); } // C11 (rulings 57 / 60): a hidden call is not listed at all
function callNotice(text, bad) { callMsg = { text, until: performance.now() + 2600 * feedbackScale, bad }; }
function openCallMenu() {
    if (!callRules) {
        notify("No support calls in this battle", "warn");
        return;
    }
    if (dead()) {
        callNotice("CALLS · you are down", true);
        snd.ui("error");
        return;
    }
    callMenu.open = true;
    callMenu.code.steps = [];
    callStats.opened++;
    fpBuilding = 0;
    rideMenu = false;
    if (buildPanel?.src === "tool")
        buildPanel = null;
    snd.ui("click");
}
function closeCallMenu() { callMenu.open = false; callMenu.code.steps = []; }
function cancelArmed(why = "CALL CANCELLED") { if (!armedCall)
    return; armedCall = null; callStats.cancelled++; callNotice(why, false); snd.ui("click"); }
/** A code result: arm the call, or say why it cannot be armed. */
function applyCallResult(r) {
    if (r.kind === "step") {
        callStats.steps++;
        snd.blip();
        return;
    }
    if (r.kind === "wrong") {
        callStats.wrong++;
        snd.ui("error");
        return;
    }
    if (r.kind === "refused") {
        callStats.refusedLocal++;
        callNotice(`CANNOT CALL ${r.text}`, true);
        notify(`CANNOT CALL ${r.text}`, "warn");
        snd.ui("error");
        return;
    }
    armedCall = { call: r.call, id: r.row.id, name: r.row.name, at: performance.now() };
    callStats.armed++;
    podPick = 0;
    closeCallMenu();
    callNotice(`${r.row.name.toUpperCase()} ARMED`, false);
    if (throwsBeacon() || firesBeacon())
        snd.cue("beacon-arm");
    else
        snd.ui("confirm"); // ruling 128: the beacon comes out of the pouch with a click (129: loaded into the vehicle's launcher)
}
/** Ruling 128: on foot the armed call is a beacon in the hand, thrown physically (the sim's ACT_THROW_CALL). */
function throwsBeacon() { return !!callRules?.throwing && onFoot() && !seated(); }
/** Ruling 129: in a vehicle seat the armed call's beacon is fired from the vehicle at the designated point (ACT_FIRE_CALL). */
function firesBeacon() { return !!callRules?.throwing && seated(); }
function callCodeStep(d) { applyCallResult((0, c5_ts_1.codeInput)(callMenu.code, d, currentCallRows())); }
// C5 item 3: beacons in the world (light pillar in the caller's colour, countdown, radius), DANGER CLOSE, impacts
/** Beacon id -> calling pilot (from CALL_QUEUED: the snapshot's beacon list does not name the caller). */
const beaconCaller = new Map();
let beaconsDrawn = 0, beaconTags = 0, dangerShown = null, dangerAlarms = 0, shakeAmp = 0, lastShake = 0;
const impactsSeen = [];
let lastDangerBeacon = -1;
function currentBeacons() { return (0, c5_ts_1.beaconModels)(callCtxNow(), views.length ? views[views.length - 1].calls : null, 0); }
function onCallEvent(e) {
    const t = (0, c5_ts_1.callEventText)(callCtxNow(), e, pilotId, 0);
    if (e.kind === events_ts_1.EV.CALL_QUEUED) {
        beaconCaller.set(e.a, e.b);
        callStats.queued++;
        if (e.b === pilotId)
            pendingActs.forEach((pa, seq) => { if (pa.what.startsWith("CALL "))
                pendingActs.delete(seq); });
    }
    if (e.kind === events_ts_1.EV.CALL_IMPACT) {
        callStats.impacts++;
        beaconCaller.delete(e.a);
        const id = callRules?.calls[e.c]?.id ?? "", rad = (0, c5_ts_1.effectRadius)(data, id), y = (0, terrain_gen_ts_1.sampleHeight)(hm, e.v1, e.v2);
        const kind = (0, c6_ts_6.callFxKind)(callRules, e.c);
        let k = 0;
        if (id === "reinforcements") { // Frontline: no blast; the Mule is on its way from the base's side
            if (e.team === 0)
                notify("REINFORCEMENTS INBOUND · a Mule is flying a trooper squad and a sapper team to your beacon", "good");
        }
        else if (kind === "strike" || kind === "none") {
            // the big explosion: a central fireball, a ring of blasts at the radius, debris; a strong boom; a shake that falls off with distance
            fx.explosion(e.v1, y, e.v2, Math.max(6, rad * 0.9), 3);
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + 0.4;
                fx.explosion(e.v1 + Math.cos(a) * rad * 0.6, y, e.v2 + Math.sin(a) * rad * 0.6, rad * 0.45, 3);
            }
            snd.callImpact([e.v1, y, e.v2]);
            const d = Math.hypot(e.v1 - eye[0], y - eye[1], e.v2 - eye[2]);
            k = (0, c5_ts_1.impactShake)(d, rad);
        }
        else
            callImpactFx(kind, e, y);
        shakeAmp = Math.max(shakeAmp, k);
        lastShake = k;
        impactsSeen.push({ x: e.v1, z: e.v2, call: e.c, hits: e.d, shake: k });
        if (impactsSeen.length > 20)
            impactsSeen.shift();
    }
    if (t)
        notify(t.text, t.kind);
}
/**
 * Pillars of light (dots up to ~90 m), a dotted ring at the radius in first person, and a countdown tag. Ruling 128:
 * a thrown beacon is a small dark cylinder with a blinking lamp in the call's colour; its column is bright for its own
 * team and faint red for the enemy; beacons in flight glow and leave a trail.
 */
let vmThrowAt = 0, beaconViewTick = -1, beaconViewAt = 0;
const beaconTrails = new Map();
function drawBeacon(x, y, z, col, lit, up = 1) {
    const dark = [0.08, 0.09, 0.1];
    for (let i = 0; i < 3; i++)
        fx.dot(x, y + 0.04 + i * 0.07 * up, z, 0.055, dark, 1, 0); // body
    fx.dot(x, y + 0.25 * up, z, 0.05, col, 0.6 + 0.4 * lit); // lamp
    if (lit > 0.5)
        fx.dot(x, y + 0.25 * up, z, 0.35, col, 0.35 * lit); // glow
}
function drawBeacons(now) {
    beaconsDrawn = 0;
    callStats.thrownDrawn = 0;
    callStats.trailDots = 0;
    callStats.columnsDrawn = 0;
    const v = views.length ? views[views.length - 1] : null;
    if (v && v.tick !== beaconViewTick) {
        beaconViewTick = v.tick;
        beaconViewAt = now;
    }
    // ruling 128: beacons in flight or rolling (extrapolated from the snapshot), with a fading trail
    const H = (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
    for (const t of v?.calls?.thrown ?? []) {
        const col = (0, c5_ts_1.callColour)(data, t.call), p = (0, c5_ts_1.thrownAt)(t, (now - beaconViewAt) / 1000, cd.gravity, H);
        let tr = beaconTrails.get(t.id);
        if (!tr) {
            tr = { pts: [], seen: now };
            beaconTrails.set(t.id, tr);
        }
        tr.seen = now;
        const n = tr.pts.length;
        if (!n || Math.hypot(p[0] - tr.pts[n - 3], p[1] - tr.pts[n - 2], p[2] - tr.pts[n - 1]) > 0.35) {
            tr.pts.push(p[0], p[1], p[2]);
            if (tr.pts.length > 3 * 24)
                tr.pts.splice(0, 3);
        }
        for (let i = 0, m = tr.pts.length / 3; i < m; i++) {
            fx.dot(tr.pts[3 * i], tr.pts[3 * i + 1], tr.pts[3 * i + 2], 0.05 + 0.05 * (i / m), col, 0.55 * (i / m));
            callStats.trailDots++;
        }
        drawBeacon(p[0], p[1] - 0.12, p[2], col, 1);
        fx.dot(p[0], p[1], p[2], 0.5, col, 0.45);
        callStats.thrownDrawn++;
    }
    for (const [id, tr] of beaconTrails)
        if (now - tr.seen > 800)
            beaconTrails.delete(id);
    for (const b of currentBeacons()) {
        const own = beaconCaller.get(b.id) === pilotId, raw = v?.calls?.beacons.find((x) => x.id === b.id), thrown = !!raw?.thrown;
        const col = thrown ? (b.friendly ? (0, c5_ts_1.callColour)(data, b.call) : [1, 0.3, 0.16]) : (0, c5_ts_1.beaconColour)(own, b.friendly), gy = thrown && raw.y !== null ? raw.y : (0, terrain_gen_ts_1.sampleHeight)(hm, b.x, b.z);
        const flick = 0.75 + 0.25 * Math.sin(now / 90 + b.id), dim = thrown && !b.friendly ? 0.35 : 1; // ruling 128: a faint column for the enemy
        const blink = thrown ? ((now + b.id * 137) % (b.seconds < 5 ? 250 : 600) < (b.seconds < 5 ? 120 : 160) ? 1 : 0.15) : 1;
        for (let i = 0; i < 30; i++) {
            const h = i * i * 0.1;
            fx.dot(b.x, gy + 0.4 + h, b.z, (thrown ? 0.42 : 0.55) - i * 0.008, col, (1 - i / 34) * flick * dim);
        }
        callStats.columnsDrawn++;
        if (thrown) {
            drawBeacon(b.x, gy, b.z, col, blink);
            fx.dot(b.x, gy + 0.3, b.z, 1.1, col, 0.5 * blink * dim);
        }
        else
            fx.dot(b.x, gy + 0.3, b.z, 1.4, col, 0.9);
        if (wire < 0.5 && dim === 1) {
            const n = Math.max(16, Math.min(48, Math.round(b.radius * 3)));
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + now / 3000, x = b.x + Math.cos(a) * b.radius, z = b.z + Math.sin(a) * b.radius;
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.3, z, 0.2, col, 0.6);
            }
        }
        beaconsDrawn++;
    }
    // the beacon in the hand glows in the world too (a soft light just in front of the viewmodel)
    if (armedCall && throwsBeacon() && mode === "fp") {
        const cc = (0, c5_ts_1.callColour)(data, armedCall.call), cp = Math.cos(camPitch), fwx = Math.cos(camYaw) * cp, fwz = Math.sin(camYaw) * cp, rx = -Math.sin(camYaw), rz = Math.cos(camYaw);
        const pul = 0.55 + 0.25 * Math.sin(now / 160);
        fx.dot(eye[0] + fwx * 0.55 + rx * 0.2, eye[1] - 0.2 + Math.sin(camPitch) * 0.55, eye[2] + fwz * 0.55 + rz * 0.2, 0.05, cc, pul * 0.5);
    }
}
/** Command view: a marked circle with the damage radius per beacon (tactical rings, the team's line colour; own: amber). */
function beaconRings() {
    const bs = currentBeacons();
    if (!bs.length)
        return;
    fxRingBuf = grow(fxRingBuf, (fxRingCount + bs.length * 2 + 1) * render_ts_1.INST_FLOATS);
    for (const b of bs)
        for (const r of [b.radius, Math.max(1, b.radius * 0.15)]) {
            const k = fxRingCount * render_ts_1.INST_FLOATS, own = beaconCaller.get(b.id) === pilotId;
            fxRingBuf.fill(0, k, k + render_ts_1.INST_FLOATS);
            fxRingBuf[k] = b.x;
            fxRingBuf[k + 1] = (0, terrain_gen_ts_1.sampleHeight)(hm, b.x, b.z) + 0.5;
            fxRingBuf[k + 2] = b.z;
            fxRingBuf[k + 5] = own ? 3 : b.friendly ? 0 : 1;
            fxRingBuf[k + 6] = 0.95;
            fxRingBuf[k + 7] = r;
            fxRingCount++;
        }
}
function beaconTagsHtml() {
    beaconTags = 0;
    for (const b of currentBeacons()) {
        const own = beaconCaller.get(b.id) === pilotId;
        const lbl = `${b.name.toUpperCase()} ${b.countdown} s<small>${own ? "your beacon" : b.friendly ? "ally" : "ENEMY"}${b.harmful ? ` · ${b.radius} m` : ""}${b.merged ? " · merged" : ""}</small>`;
        if (tag(b.x, (0, terrain_gen_ts_1.sampleHeight)(hm, b.x, b.z) + 6, b.z, lbl, `beacon${own ? "" : b.friendly ? " ally" : " enemy"}`))
            beaconTags++;
    }
}
/** DANGER CLOSE over the reticle while the player stands in a friendly strike's area (an alarm when it starts). */
function updateDanger(now) {
    const el = $("danger"), b = bodyRender;
    const d = b && !dead() ? (0, c5_ts_1.dangerClose)(currentBeacons(), b.x, b.z) : null;
    dangerShown = d ? `DANGER CLOSE · ${d.name.toUpperCase()} · ${d.countdown} s` : null;
    if (d && d.id !== lastDangerBeacon) {
        dangerAlarms++;
        snd.alarm(now);
    }
    lastDangerBeacon = d ? d.id : -1;
    el.style.display = dangerShown ? "block" : "none";
    if (dangerShown && el.textContent !== dangerShown)
        el.textContent = dangerShown;
}
/** Where the armed call would land now (first person: the reticle's ground point within the throw / designator range; command view: the cursor). */
let callAim = null;
/** Ruling 128: the preview of the throw's flight (hand to first touchdown), or null. */
let throwPts = null;
function updateCallAim() {
    callAim = null;
    if (!armedCall || !callRules)
        return;
    const b = bodyRender;
    if (!b)
        return;
    if (throwsBeacon()) { // ruling 128: where the throw would first touch down (the sim's flight before any bounce)
        const T = callRules.throwing, pr = (0, c5_ts_1.throwPreview)(b.x, b.y, b.z, camYaw, Math.max(-1.5, Math.min(1.5, camPitch + c5_ts_1.THROW_PITCH_BIAS)), b.vx, b.vz, { speed: T.speed, inherit: T.inherit, hand: T.hand, g: cd.gravity }, (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z));
        throwPts = pr.pts;
        callStats.previewPts = pr.pts.length;
        callAim = { x: pr.land[0], z: pr.land[2], dist: pr.dist, clamped: false, range: 0, fromX: b.x, fromZ: b.z };
        return;
    }
    throwPts = null;
    const range = seated() ? callRules.designatorRange : callRules.throwRange;
    const g = groundAt(cssW / 2, cssH / 2);
    const t = (0, c5_ts_1.callTarget)(b.x, b.z, g ? [g[0], g[2]] : null, camYaw, range);
    callAim = { ...t, range, fromX: b.x, fromZ: b.z, ground: !!g, rawDist: g ? Math.hypot(g[0] - b.x, g[2] - b.z) : Infinity };
}
/** Sends the armed call to the sim at (x, z) (ACT_CALL); the beacon and CALL_QUEUED, or CALL_REFUSED, come back. */
function sendCall(x, z) {
    if (!armedCall)
        return;
    const a = { ...(0, c5_ts_1.callAction)(armedCall.id, x, z) };
    // C6: line calls (strafing / bomb run, smoke screen) run along the throw / aim direction (ACT_CALL aimYaw)
    if ((0, c6_ts_6.lineCall)((0, c6_ts_6.callFxKind)(callRules, armedCall.call)) && a.kind === "call")
        a.aimYaw = camYaw;
    // C7b item 6: the heavy weapon pod brings the chosen weapon (ACT_CALL option = its index in weaponChoices)
    if (a.kind === "call" && podChoices().length > 1) {
        a.option = podPick;
        loStats.podOption = podPick;
    }
    callStats.lastAction = a;
    callStats.thrown++;
    act(a, `CALL ${armedCall.name.toUpperCase()}`);
    callNotice(onFoot() ? `BEACON THROWN · ${armedCall.name.toUpperCase()}` : `${armedCall.name.toUpperCase()} DESIGNATED`, false);
    armedCall = null;
    snd.ui("confirm");
}
/** Primary fire with a call armed: throw the beacon (on foot) or confirm the designator (in a vehicle). */
function throwCall() {
    if (armedCall && throwsBeacon()) { // ruling 128: the beacon leaves the hand along the camera (the sim flies it)
        const a = (0, c5_ts_1.throwAction)(armedCall.id, camYaw, camPitch, podChoices().length > 1 ? podPick : undefined);
        if (a.option !== undefined)
            loStats.podOption = a.option;
        callStats.lastAction = a;
        callStats.thrown++;
        callStats.beaconsThrown++;
        act(a, `CALL ${armedCall.name.toUpperCase()}`);
        callNotice(`BEACON THROWN · ${armedCall.name.toUpperCase()} · lands where it stops`, false);
        armedCall = null;
        throwPts = null;
        vmThrowAt = performance.now();
        return;
    }
    if (armedCall && firesBeacon()) { // ruling 129: the vehicle fires the beacon at the point under the crosshair (the sim flies it)
        updateCallAim();
        const why = callAim ? (0, c5_ts_1.fireRefusal)(!!callAim.ground, callAim.rawDist ?? Infinity, callAim.range) : (0, c5_ts_1.fireRefusal)(false, 0, callRules.designatorRange);
        if (why || !callAim) {
            callStats.refusedLocal++;
            callNotice(`${armedCall.name.toUpperCase()} · ${why}`, true);
            snd.ui("error");
            return;
        }
        const a = (0, c5_ts_1.fireAction)(armedCall.id, callAim.x, callAim.z, podChoices().length > 1 ? podPick : undefined);
        if (a.option !== undefined)
            loStats.podOption = a.option;
        callStats.lastAction = a;
        callStats.thrown++;
        callStats.beaconsThrown++;
        act(a, `CALL ${armedCall.name.toUpperCase()}`);
        callNotice(`BEACON FIRED · ${armedCall.name.toUpperCase()} · ${Math.round(callAim.dist)} m`, false);
        armedCall = null;
        return;
    }
    updateCallAim();
    if (callAim)
        sendCall(callAim.x, callAim.z);
    else {
        callNotice("NO GROUND IN REACH", true);
        snd.ui("error");
    }
}
/** The sim refused a call (CALL_REFUSED): the reason as a short message and in the feed. */
function callRefused(e) {
    pendingActs.delete(e.a);
    callStats.refusedSim++;
    // C7b item 4: an enemy jammer blocked an orbital call: a JAMMED marker where it was aimed
    {
        const la = callStats.lastAction;
        if (sim_ts_1.ORDER_REASONS[e.c - 1] === "callJammed" && la && typeof la.x === "number" && typeof la.z === "number")
            stl.jammedAt(la.x, la.z, performance.now());
    }
    const t = (0, c5_ts_1.callEventText)(callCtxNow(), e, pilotId, 0);
    if (!t)
        return;
    callStats.lastResult = t.text;
    callNotice(t.text, true);
    notify(t.text, t.kind);
    snd.ui("error");
}
/** First person: the target ring, the throw arc (on foot) or the designator reticle (vehicle); command view: the placement ring. */
let aimDots = 0;
function drawCallAim(now) {
    const d0 = fx.dots;
    aimDots = 0;
    drawCallAim2(now);
    aimDots = fx.dots - d0;
}
function drawCallAim2(now) {
    if (!callAim || !armedCall || !callRules)
        return;
    const row = currentCallRows().find((r) => r.call === armedCall.call), rad = row ? row.radius : 6;
    const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, callAim.x, callAim.z) + 0.3, col = throwPts || firesBeacon() ? (firesBeacon() && (0, c5_ts_1.fireRefusal)(!!callAim.ground, callAim.rawDist ?? Infinity, callAim.range) ? [1, 0.25, 0.15] : (0, c5_ts_1.callColour)(data, armedCall.call)) : [1, 0.72, 0.2], pulse = (throwPts ? 0.35 : 0.6) + (throwPts ? 0.2 : 0.4) * Math.sin(now / 120);
    const c = col;
    const n = Math.max(16, Math.min(48, Math.round(rad * 3)));
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = callAim.x + Math.cos(a) * rad, z = callAim.z + Math.sin(a) * rad;
        fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.3, z, 0.22, c, 0.85 * pulse);
    }
    // C6: a line call shows its direction (the camera's yaw, sent as aimYaw) and length before the throw
    const kind = (0, c6_ts_6.callFxKind)(callRules, armedCall.call), def = callRules.calls[armedCall.call];
    if ((0, c6_ts_6.lineCall)(kind) && def) {
        const len = kind === "smoke" ? def.lineLength || 40 : def.lineLength || 80;
        const pts = (0, c6_ts_6.linePoints)(callAim.x, callAim.z, camYaw, len, Math.round(len / 2));
        pts.forEach(([x, z], i) => fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.35, z, i === pts.length - 1 ? 0.6 : 0.26, c, 0.9 * pulse));
        for (const s2 of [-1, 1]) {
            const a = camYaw + Math.PI + s2 * 0.5, [ex, ez] = pts[pts.length - 1];
            for (let j = 1; j <= 3; j++) {
                const x = ex + Math.cos(a) * j * 1.2, z = ez + Math.sin(a) * j * 1.2;
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.35, z, 0.26, c, 0.9 * pulse);
            }
        }
        aimLines++;
    }
    fx.dot(callAim.x, gy, callAim.z, 0.5, c, 0.9);
    if (throwPts) { // ruling 128: the beacon's flight as faint dots in its colour, to the first touchdown
        const cc = (0, c5_ts_1.callColour)(data, armedCall.call);
        for (let i = 1; i < throwPts.length; i++) {
            const q = throwPts[i];
            if (Math.hypot(q[0] - eye[0], q[1] - eye[1], q[2] - eye[2]) > 4)
                fx.dot(q[0], q[1], q[2], 0.07, cc, 0.25 + 0.35 * (i / throwPts.length));
        }
    }
    else if (onFoot() && bodyRender) {
        const hand = [bodyRender.x + Math.cos(camYaw) * 0.6, eye[1] - 0.25, bodyRender.z + Math.sin(camYaw) * 0.6];
        const pts = (0, c5_ts_1.throwArc)(hand, [callAim.x, gy, callAim.z], 18);
        for (let i = 2; i < pts.length; i++)
            fx.dot(pts[i][0], pts[i][1], pts[i][2], 0.09, col, 0.7);
    }
    else {
        // designator: a cross on the ground
        for (let k = -4; k <= 4; k++) {
            fx.dot(callAim.x + k * 0.9, gy, callAim.z, 0.18, col, 0.9);
            fx.dot(callAim.x, gy, callAim.z + k * 0.9, 0.18, col, 0.9);
        }
    }
}
function callMenuHtml(rows) {
    let h = `<div class="ph">SUPPORT CALLS · hold ${c5_ts_1.CALL_KEY_LABEL}</div>`;
    if (!rows.length)
        h += `<div class="note">no calls in your loadout</div>`;
    h += rows.map((r) => {
        const lit = (0, c5_ts_1.litSteps)(r, callMenu.code.steps);
        const code = r.code.map((d, k) => (k < lit ? `<b>${c5_ts_1.DIR_ARROW[d]}</b>` : c5_ts_1.DIR_ARROW[d])).join("");
        const aa = (callRules?.fixed ?? []).includes(r.call); // ruling 133: slot 5, the fixed anti-armour call
        return `<div class="crow${r.available ? "" : r.reason === "callCooldown" || r.reason === "callInProgress" ? " cd no" : " no"}${lit > 0 ? " hi" : ""}${aa ? " aa" : ""}"><span class="n">${aa ? `<i class="aa">5 · ${isFrontline() ? "SLOT 3" : "ANTI-ARMOUR"}</i> ` : ""}${r.name}</span><span class="s">${r.status}</span><span class="code">${code}</span><span class="s">${r.delayS} s</span>${r.available || r.reason === "callCooldown" ? "" : `<small>${r.reasonText}</small>`}</div>`;
    }).join("");
    h += `<div class="note">type a code with the arrow keys (W A S D still move you) · ${throwsBeacon() ? "the call becomes a beacon in your hand: <b>LMB</b> throws it, it lands where the beacon stops" : seated() ? "then <b>LMB</b> designates the spot" : "then <b>LMB</b> places it"} · release ${c5_ts_1.CALL_KEY_LABEL} to close · <b>${u1_loadout_ts_1.LOADOUT_KEY_LABEL}: change the loadout</b></div>`;
    return h;
}
/** C5 item 4 (designer ruling: read only): the command view's calls bar, the pilot's loadout and cooldowns. */
let lastCallBar = "";
function updateCallBar() {
    const el = $("callBar");
    if (mode !== "cmd" || !started || !callRules) {
        el.style.display = "none";
        return;
    }
    const rows = currentCallRows();
    const html = `<span class="label">CALLS</span>` + rows.map((r) => `<span class="cb${r.available ? " ready" : " no"}">${(callRules?.fixed ?? []).includes(r.call) ? (isFrontline() ? "SLOT 3: " : "ANTI-ARMOUR: ") : ""}${r.name} · ${r.status}<small>${r.codeText}${r.available || r.reason === "callCooldown" ? "" : ` · ${r.reasonText}`}</small></span>`).join("") + `<span class="label"> · call in first person: hold ${c5_ts_1.CALL_KEY_LABEL}</span><button class="btn lobtn" data-act="loOpen" data-b="0">LOADOUT (${u1_loadout_ts_1.LOADOUT_KEY_LABEL} in first person)</button>`;
    if (html !== lastCallBar) {
        el.innerHTML = html;
        lastCallBar = html;
    }
    el.style.display = "block";
}
function updateCallHud(now) {
    updateCallBar();
    updateLoadoutPanel(now); // U1
    const el = $("calls"), show = callMenu.open && mode === "fp" && started && !dead() && !matchLocked();
    if (callMenu.open && !show)
        closeCallMenu();
    if (show) {
        const rows = currentCallRows();
        lastCallRows = rows;
        const html = callMenuHtml(rows);
        if (html !== lastCallHtml) {
            el.innerHTML = html;
            lastCallHtml = html;
        }
        el.style.display = "block";
    }
    else
        el.style.display = "none";
    // armed call line (and short call messages: armed, cancelled, refused)
    if (armedCall && (dead() || matchLocked() || mode !== "fp"))
        armedCall = null;
    const ar = $("callArmed");
    let text = "", bad = false;
    if (callMsg && now < callMsg.until) {
        text = callMsg.text;
        bad = callMsg.bad;
    }
    if (armedCall) {
        const thr = throwsBeacon();
        const fir = firesBeacon(), fw = fir && callAim ? (0, c5_ts_1.fireRefusal)(!!callAim.ground, callAim.rawDist ?? Infinity, callAim.range) : null;
        const rng = callAim ? (thr ? ` · ~${Math.round(callAim.dist)} m` : fir ? (fw ? ` · ${fw}` : ` · ${Math.round(callAim.dist)} / ${callAim.range} m`) : ` · ${Math.round(callAim.dist)} / ${callAim.range} m${callAim.clamped ? " (max)" : ""}`) : "";
        const pc = podChoices(); // C7b item 6
        text = `${(0, c5_ts_1.armedHint)(armedCall.name, seated(), !!callRules?.throwing)}${rng}${pc.length > 1 ? ` · ${(0, c7b_ts_5.podChoiceText)(pc.map(wName), podPick)}` : ""}${text && !text.endsWith("ARMED") ? ` · ${text}` : ""}`;
    }
    ar.style.display = text ? "block" : "none";
    if (text && ar.textContent !== text)
        ar.textContent = text;
    ar.classList.toggle("bad", bad);
}
let rendered = [];
let predDrawn = false, predGap = 0;
const renderedById = new Map();
let bodyRender = null;
const kindBuf = new Map();
/** F3: kinds with rotors (meshes.ts MeshData.rotors) and their per-entity rotor angle / spin (0 stopped .. 1 full power). */
const ROTOR_KIND = new Set(["air", "dropship"]);
const ROTOR_IDLE = 0.35, ROTOR_REV_S = 9;
const rotorState = new Map();
const rotorStats = { drawn: 0, maxSpin: 0 };
for (const k of meshes_ts_1.KINDS)
    kindBuf.set(k, { a: new Float32Array(render_ts_1.INST_FLOATS * 64), n: 0 });
/** Ruling 130: the sentry call's drop pod (deploy after the thud, rocket salvos and reload, the falling pod). */
const podTr = new s2_pod_ts_1.PodTracker();
const fbTr = new fb1_ts_1.FbDefenceTracker(); // ruling 132
globalThis.__fb1 = fbTr; // QA screenshots: slow motion (fb1-screens.mjs)
const fb1Stats = { drawn: 0, moving: 0, lastOpen: 1, minimap: 0, unfolds: 0, folds: 0 };
const POD_ROCKET_W = cd.weaponIds.indexOf("sentry-rocket-pod");
const POD_RELOAD_S = (() => { const w = data.weapons.find((x) => x.id === "sentry-rocket-pod"); return w && w.shotsPerSecond ? 1 / w.shotsPerSecond : 6; })();
const POD_SALVO = data.weapons.find((x) => x.id === "sentry-rocket-pod")?.salvo ?? 4;
const SENTRY_CALL = (data.supportCalls?.calls ?? []).findIndex((c) => c.id === "sentry-gun");
const podRocketN = new Map();
const podStats = { falling: 0, drawn: 0, deploy: -1, salvos: 0, rockets: 0, whooshes: 0, bar: "" };
/** Ruling 130: seconds until the manned pod's rocket pod is loaded (the station's mount cooldown, else the client's own count). */
function podReloadLeft(id, now) {
    const pw = me?.weapons?.find((w) => w.weapon === POD_ROCKET_W);
    return pw ? pw.cooldown * POD_RELOAD_S : podTr.reload(id, now, POD_RELOAD_S);
}
let shadowBuf = new Float32Array(render_ts_1.DISC_FLOATS * 256), ringBuf = new Float32Array(render_ts_1.DISC_FLOATS * 64);
let iconBuf = new Float32Array(render_ts_1.ICON_FLOATS * 1024), iconSegs = 0, iconCount = 0;
let fxRingBuf = new Float32Array(render_ts_1.INST_FLOATS * 64), fxRingCount = 0;
let shieldBuf = new Float32Array(render_ts_1.SHIELD_FLOATS * 32), shieldCount = 0;
/**
 * Command-view blend (0 shaded .. 1 tactical display), set per frame. Each unit cross-fades from its outline to an
 * icon by its own on-screen size (ICON_PX, the same rule as the edge shader), so zooming out collapses units into
 * icons and a tilted view turns the far units into icons first. iconMix: mean icon weight over the units drawn;
 * outlineMax: the largest outline weight (0: the outline pass is skipped).
 */
let wire = 0, iconMix = 0, outlineMax = 0;
let projBuf = new Float32Array(render_ts_1.PROJ_FLOATS * 256), fxBuf = new Float32Array(render_ts_1.FX_FLOATS * 1024);
const nrm = [0, 1, 0];
function grow(a, need) { if (need <= a.length)
    return a; let c = a.length; while (c < need)
    c *= 2; const b = new Float32Array(c); b.set(a); return b; }
/**
 * The render clock (in sim ticks), one smooth monotonic clock for everything interpolated (the pilot's body, so the
 * first-person camera, and every entity). Before, it was recomputed per frame as "newest snapshot tick + time since it
 * arrived, capped at one tick, minus one": whenever a snapshot came a little late the estimate sat at the cap (the
 * camera stood still for a frame) and when it then arrived it jumped on, and an early one made it step back. With
 * 16 ms frames and 50 ms ticks that is a stall every few hundred ms: the drawn pilot advanced 0.10, 0.10, 0.01, 0.18 m
 * in successive frames, the "weapon glitch" while walking (the weapon is fixed on screen, the world under it judders).
 * Now the clock advances by real frame time and is steered gently (at most ±8 % speed) toward a target delay of
 * RENDER_DELAY ticks behind the newest snapshot's expected time; it is never allowed to go back, and it is reset only
 * when it is far off (a pause, a hidden tab, the first snapshot).
 */
/** Render delay in ticks behind the newest snapshot: 1.25 on the host (a snapshot every tick), 3 for a guest (10 Hz over the network, jitter). */
let RENDER_DELAY = 1.25;
let rtClock = -1, rtLastNow = -1, rtResets = 0;
function renderTick(now) {
    const target = lastTick + (now - lastArrive) / tickMs - RENDER_DELAY;
    if (rtClock < 0 || rtLastNow < 0 || Math.abs(target - rtClock) > 3) {
        rtClock = target;
        rtResets++;
    }
    else {
        const adv = Math.max(0, now - rtLastNow) / tickMs;
        const err = target - rtClock; // > 0: behind the target, run a little faster
        rtClock += adv * (0, math_ts_1.clamp)(1 + err * 0.08, 0.92, 1.08);
    }
    rtLastNow = now;
    rtClock = Math.min(rtClock, lastTick); // never past the newest snapshot (no extrapolation)
    return rtClock;
}
/** Rotation of (x, z) by a (the shaders' rot()). */
function rot2(x, z, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c]; }
/** World position of a mount's muzzle on the drawn model (the same transform as the unit vertex shader, without recoil). */
function muzzleWorld(e, mount, alt) {
    const kind = kindOfType[e.type], mesh = MESH.get(kind);
    const list = cd.typeIds[e.type] === "mule" ? meshes_ts_1.MULE_MUZZLES : meshes_ts_1.MUZZLES[kind];
    if (!list || !list.length)
        return [e.x, e.y + (mesh ? mesh.height * e.scale * 0.6 : 1), e.z]; // Frontline: a kind with no muzzle table never crashes the frame
    const mu = list[Math.min(mount, list.length - 1)], pt = mu.pts[Math.abs(alt) % mu.pts.length];
    let x = pt[0], y = pt[1], z = pt[2];
    if (mu.turret) {
        const p = mesh.pivot;
        const [qx, qz] = rot2(x - p[0], z - p[2], e.turret - e.yaw);
        x = qx + p[0];
        z = qz + p[2];
    }
    x *= e.scale;
    y *= e.scale;
    z *= e.scale;
    const [wx, wz] = rot2(x, z, e.yaw);
    return [e.x + wx, e.y + y + mesh.hover * e.scale + mesh.bob * Math.sin(R.time * 2.3 + e.phase), e.z + wz];
}
/**
 * Slice 3b: the sim launches shots at the data muzzles (protocol v4), so the remaining visual offset is only the
 * drawn model's interpolation / turret lag (a few decimetres): it fades over 0.12 s or 40 m (slice 3: 0.35 s / 120 m,
 * when the sim launched from the hit-sphere centre).
 */
const MUZZLE_CONVERGE_S = 0.12, MUZZLE_CONVERGE_M = 40;
/** Weight of the visual muzzle offset on a shot that has flown `age` seconds at `speed` (1 at launch .. 0). */
function muzzleFade(age, speed) { return 1 - (0, math_ts_1.smoothstep)(Math.min(1, Math.max(age / MUZZLE_CONVERGE_S, (age * speed) / MUZZLE_CONVERGE_M))); }
/** The drawn muzzle (of any mount and barrel of the shooter) nearest to the sim's launch point: the shot's mount is not on the wire, the point is. */
function nearestMuzzle(e, sim0, _alt) {
    const kind = kindOfType[e.type], list = cd.typeIds[e.type] === "mule" ? meshes_ts_1.MULE_MUZZLES : (meshes_ts_1.MUZZLES[kind] || []);
    let best = sim0, bm = 0, bd = Infinity;
    for (let m = 0; m < list.length; m++)
        for (let k = 0; k < list[m].pts.length; k++) {
            const p = muzzleWorld(e, m, k), d = (p[0] - sim0[0]) ** 2 + (p[1] - sim0[1]) ** 2 + (p[2] - sim0[2]) ** 2;
            if (d < bd) {
                bd = d;
                best = p;
                bm = m;
            }
        }
    return { p: best, mount: bm };
}
/** F1: an enemy structure turret's AIM record appeared / started slewing (spot) or settled (lock): play the cue at the turret. */
function turretAlerts(v, now) {
    const watched = (id) => { const e = v.entities.get(id); return !!e && cd.tStructure[e.type] === 1 && e.team !== 0; };
    for (const ev of turretCues.update(now / 1000, v.aims, watched)) {
        const e = v.entities.get(ev.id);
        if (!e)
            continue;
        snd.cue(ev.kind === "spot" ? turret_cue_ts_1.TURRET_CUE.spotCue : turret_cue_ts_1.TURRET_CUE.lockCue, [e.x, (0, terrain_gen_ts_1.sampleHeight)(hm, e.x, e.z) + 8, e.z]);
    }
}
/** F1: laser-dot line from a spotting enemy turret's muzzle along its drawn barrel, to the player's range (k: 0.5 slewing, 1 locked). */
function turretLaser(e, k, now) {
    const L = fx_table_ts_1.TURRET_LASER_FX, m = muzzleWorld(e, 0, 0), b = bodyRender;
    const dx = Math.cos(e.turret), dz = Math.sin(e.turret);
    const hd = b ? Math.hypot(b.x - m[0], b.z - m[2]) : 60, len = (0, math_ts_1.clamp)(hd, 4, L.maxLen), ty = b ? b.cy : m[1];
    const col = fx_table_ts_1.PAL[L.col], pulse = k >= 1 ? 0.75 + 0.25 * Math.sin(now / L.pulseMs) : 1, a = (k >= 1 ? L.a[1] : L.a[0]) * pulse;
    fx.dot(m[0], m[1], m[2], L.glow * (k >= 1 ? 1.4 : 1), col, a);
    for (let s = L.spacing; s < len; s += L.spacing) {
        const f = s / len;
        fx.dot(m[0] + dx * s, m[1] + (ty - m[1]) * f, m[2] + dz * s, L.r, col, a * (1 - 0.5 * f));
    }
    turretLasersDrawn++;
}
let turretLasersDrawn = 0;
function assemble(now, frameDt) {
    flStepBudget = 4; // Frontline: soldier footsteps per frame
    const rt = renderTick(now);
    let A = null, B = null;
    for (const v of views) {
        if (v.tick <= rt)
            A = v;
        else if (!B)
            B = v;
    }
    if (!B) {
        B = A;
    }
    if (!A)
        A = B;
    rendered = [];
    laserQ.length = 0;
    rtClockFrame++;
    tiltStats.drawn = 0;
    ownTilt = null;
    if (tilts.size > 400)
        for (const [id, tl] of tilts)
            if (rtClockFrame - (tl.seen ?? 0) > 120)
                tilts.delete(id);
    if (rotorState.size > 200)
        for (const [id, rs] of rotorState)
            if (rtClockFrame - rs.seen > 120)
                rotorState.delete(id); // F3
    walkerStats.drawn = 0;
    walkerStats.legs = 0;
    rotorStats.drawn = 0;
    if (gaits.size > 100)
        for (const [id, g] of gaits)
            if (rtClockFrame - (g.seen ?? 0) > 120)
                gaits.delete(id);
    renderedById.clear();
    bodyRender = null;
    for (const k of kindBuf.values())
        k.n = 0;
    stanceStats.drawn = 0;
    let ns = 0;
    shieldCount = 0;
    if (!B || !A) {
        projCount = 0;
        ringCount = 0;
        shadowCount = 0;
        return { rt };
    }
    const f = B.tick > A.tick ? (0, math_ts_1.clamp)((rt - A.tick) / (B.tick - A.tick), 0, 1) : 1;
    const span = Math.max(1, B.tick - A.tick) * dt;
    const alpha = 1 - Math.exp(-frameDt * 8);
    const myBody = bodyId(), fpFoot = mode === "fp" && onFoot() && wire < 0.5 && !freeCam && !cine;
    // C4: structures under construction (entity id -> built fraction) rise from the ground
    const rising = new Map();
    for (const st of B.construction?.sites ?? [])
        if (st.entity)
            rising.set(st.entity, st.progress);
    sitesDrawn = 0;
    risingDrawn = 0;
    b1Stats.gunsDrawn = 0;
    // C7b item 1: the own pilot on foot is drawn where the prediction has it now (not 3 ticks behind the host)
    const pred = predictOn && fpFoot && predictor ? predictor.pos(now, tickMs, frameDt) : null;
    const ridePos = predictOn && !onFoot() && ridePred ? ridePred.pos(now, tickMs, frameDt) : null; // ruling 112
    predDrawn = false;
    for (const eb of B.entities.values()) {
        const ea = A.entities.get(eb.id);
        let x = ea ? (0, math_ts_1.lerp)(ea.x, eb.x, f) : eb.x, z = ea ? (0, math_ts_1.lerp)(ea.z, eb.z, f) : eb.z;
        let vx = ea ? (eb.x - ea.x) / span : 0, vz = ea ? (eb.z - ea.z) / span : 0;
        let yaw = kindOfType[eb.type] === "wall" ? (0, c9_ts_1.wallYaw)(eb.x, eb.z, ptStatics) : ea ? (0, math_ts_1.lerpAngle)(ea.heading, eb.heading, f) : eb.heading; // C9: walls face their approach
        let alt = ea ? (0, math_ts_1.lerp)(ea.altitude, eb.altitude, f) : eb.altitude;
        if (motionSmooth && cd.tStructure[eb.type] !== 1 && motion.sample(eb.id, rt, motionOut, math_ts_1.lerpAngle)) {
            x = motionOut[0];
            z = motionOut[1];
            vx = motionOut[3] / dt;
            vz = motionOut[4] / dt;
            yaw = motionOut[2];
            alt = motionOut[5];
        } // m1; j1: the altitude arc from the same track
        if (ridePos && eb.id === myBody) {
            x = ridePos.x;
            z = ridePos.z;
            vx = ridePos.vx;
            vz = ridePos.vz;
            alt = ridePos.hop;
            yaw = ridePos.yaw;
            predDrawn = true;
        }
        if (pred && eb.id === myBody) {
            predGap = Math.hypot(pred.x - x, pred.z - z);
            x = pred.x;
            z = pred.z;
            vx = pred.vx;
            vz = pred.vz;
            alt = Math.max(0, pred.y - (0, terrain_gen_ts_1.sampleHeight)(hm, x, z));
            predDrawn = true;
        }
        const t = eb.type;
        const simY = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + (cd.tAir[t] ? cd.constants.airAltitude : 0) + alt;
        const y = simY + drawLift[t];
        let ty = aim.get(eb.id) ?? yaw;
        if (eb.id === myBody && mode === "fp" && host.controlled)
            ty = playerAimYaw;
        const prev = turret.get(eb.id);
        const shown = prev === undefined ? ty : (0, math_ts_1.lerpAngle)(prev, ty, eb.id === myBody && mode === "fp" ? 1 : alpha);
        turret.set(eb.id, shown);
        const scale = cd.typeIds[t] === "command-core" ? 1.2 : 1;
        const phase = (eb.id * 1.7) % 6.28;
        const e = { id: eb.id, type: t, team: eb.team, x, y, z, yaw, turret: shown, cy: simY + cd.tRadius[t], vx, vz, scale, phase, simY, alt, crew: eb.crew, driverless: eb.driverless, critical: eb.hullCritical, hp: eb.hp, shield: eb.shield };
        rendered.push(e);
        renderedById.set(e.id, e);
        if (eb.id === myBody)
            bodyRender = e;
        if (cd.tStructure[t] === 1 && eb.team !== 0) {
            const lk = turretCues.laser(eb.id, now / 1000);
            if (lk > 0)
                laserQ.push([e, lk]);
        }
        if (eb.id === myBody && fpFoot)
            continue; // true first person: the player's own body is not drawn
        if (radarBlips.has(eb.id))
            continue; // C7b item 4: a radar-only contact is a blip (stealthFrame), not a model
        const kind = kindOfType[t];
        if (kind === "gunship") { // Frontline: the wing engines tilt from aft (cruise) to straight down (hover) as it slows; the plumes follow
            const sf = Math.min(1, Math.hypot(vx, vz) / ((cd.tSpeed[t] || 80) * 0.6)), want = (Math.PI / 2) * (1 - sf);
            let th = gsTilt.get(eb.id) ?? want;
            th += (want - th) * Math.min(1, frameDt * 2.5);
            gsTilt.set(eb.id, th);
            if ((0, c8_ts_1.aircraftHeight)(alt, cd.constants.airAltitude) > 0.8 && wire < 0.5 && Math.hypot(x - eye[0], z - eye[2]) < 900) { // flying (parked: no flames)
                const back = 3 + sf * 9, cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(th), st = Math.sin(th);
                const W2 = (mx, my, mz) => [x + mx * cy - mz * sy, y + my, z + mx * sy + mz * cy];
                for (const sd of [1, -1]) {
                    for (let i = 0; i <= 14; i++) { // out of each engine's bell (1.7 m aft of the spar), along the engine's axis
                        const k = i / 14, L = 1.75 + k * back * (0.9 + 0.2 * Math.random()), p = W2(-1.9 - ct * L, 1.3 - st * L, sd * 3.45);
                        fx.dot(p[0], p[1], p[2], 0.62 - 0.45 * k, [1, 0.9 - 0.5 * k, 0.55 - 0.4 * k], (1 - k) * 0.95);
                        if (i < 4)
                            fx.dot(p[0], p[1], p[2], 0.28 - 0.05 * i, [1, 1, 0.9], 1);
                    }
                }
            }
        }
        const kb = kindBuf.get(kind);
        kb.a = grow(kb.a, (kb.n + 1) * render_ts_1.INST_FLOATS);
        // walk cycle (infantry, pilots on foot): the phase advances with the distance walked, the stride amplitude follows the speed
        const tr = tracks.get(eb.id);
        let walk = 0, walkAmp = 0, recoil = 0;
        if (tr) {
            // protocol v4 deadbands: beyond 100 m positions move in 0.5 m steps, so the raw speed flickers between 0 and
            // large; the walk cycle follows a smoothed speed (~0.7 s)
            let ground = Math.hypot(vx, vz);
            if (kind === "infantry") {
                const old = views[0]?.entities.get(eb.id);
                if (old && B.tick > views[0].tick)
                    ground = Math.hypot(eb.x - old.x, eb.z - old.z) / ((B.tick - views[0].tick) * dt);
            }
            tr.spd += ((alt > 0.3 ? 0 : ground) - tr.spd) * Math.min(1, frameDt * 3);
            const sp = tr.spd;
            if (kind === "infantry") {
                // each soldier has its own phase, stride length and swing (playtest: squads marched exactly in step)
                tr.walk = (tr.walk + (sp * frameDt / (1.5 * tr.strideK)) * Math.PI) % (Math.PI * 2);
                tr.walkAmp += ((0, math_ts_1.clamp)(sp / 4.5, 0, 1) * tr.ampK - tr.walkAmp) * Math.min(1, frameDt * 6);
                walk = tr.walk;
                walkAmp = tr.walkAmp;
            }
            const k = (now - tr.recoilAt) / 200;
            recoil = k >= 0 && k < 1 ? (1 - k) * (1 - k) : 0;
        }
        // team: line-colour index (the shaded view only tells 0 from the rest), +10 when selected (outline glow).
        // An empty crewed vehicle (nobody aboard: abandoned, sniped, ejected from) is drawn dark in the neutral colour.
        const empty = crewable(t) && eb.crew === 0;
        // C6: a cloaked squadmate (CLOAK events of the own team) is drawn faint: neutral grey with a shimmer
        const faint = cloakedBodies.has(eb.id);
        if (faint) {
            cloakedDrawn++;
            fx.dot(x, y + 1.0 + 0.3 * Math.sin(now / 90 + eb.id), z, 0.9, [0.55, 0.85, 1], 0.1);
        }
        // ruling 112: hover vehicles lean into turns, strafes and braking and settle after a hop (tilt.ts)
        let liftY = 0;
        if (cd.tHover[t] === 1) {
            let tl = tilts.get(eb.id);
            if (!tl) {
                tl = (0, tilt_ts_1.newTilt)();
                tilts.set(eb.id, tl);
            }
            (0, tilt_ts_1.tiltStep)(tl, vx, vz, yaw, alt, frameDt, cd.typeIds[t] === "strider" ? 0.4 : 1);
            tl.seen = rtClockFrame;
            const hs = cd.tAir[t] === 1 && cd.constants.airAltitude + alt > 0.8 ? now / 1000 + eb.id : 0; // Frontline: a hovering gunship sways a little
            walk = (0, tilt_ts_1.packTilt)(tl.pitch + (hs ? 0.018 * Math.sin(hs * 1.1) + 0.008 * Math.sin(hs * 2.7) : 0), tl.roll + (hs ? 0.026 * Math.sin(hs * 0.83) + 0.01 * Math.sin(hs * 2.3) : 0));
            walkAmp = gsTilt.has(eb.id) ? gsTilt.get(eb.id) : 0; // Frontline: the gunship engines' tilt (shader part 22)
            liftY = tl.lift;
            tiltStats.drawn++;
            if (eb.id === myBody)
                ownTilt = tl;
        }
        // W1: a walker (the Strider) stands on its legs: the gait plants the feet on the terrain, bobs and sways the hull;
        // a slight lean from acceleration replaces the hover tilt
        let gaitG, gPitch = 0, gRoll = 0;
        if (cd.tWalk[t] === 1) {
            gaitG = gaits.get(eb.id);
            if (!gaitG) {
                gaitG = (0, w1_walker_ts_1.newGait)(cd.typeIds[t] === "mech" ? w1_walker_ts_1.MECH_WALKER : w1_walker_ts_1.WALKER); // Frontline: the bipedal mech
                gaits.set(eb.id, gaitG);
            }
            let tl = tilts.get(eb.id);
            if (!tl) {
                tl = (0, tilt_ts_1.newTilt)();
                tilts.set(eb.id, tl);
            }
            (0, tilt_ts_1.tiltStep)(tl, vx, vz, yaw, 0, frameDt, WALK_LEAN);
            tl.seen = rtClockFrame;
            gaitG.seen = rtClockFrame;
            // Frontline: the mech's jump jets. In the air the legs stop walking and hang tucked under the hips; the two jet
            // bells on the back burn (a flickering core, a flame cone and smoke); a booster burst on take-off and a heavy
            // thud with a dust ring on landing.
            const hop = cd.tJump[t] > 0 ? Math.max(0, y - walkGround(x, z)) : 0, hopWas = flHopWas.get(eb.id) ?? 0;
            flHopWas.set(eb.id, hop);
            let gf;
            if (hop > 0.15) {
                const W = gaitG.W;
                for (let i = 0; i < W.feet.length; i++) {
                    const [fx2, fz2] = (0, w1_walker_ts_1.modelToWorld)(W.feet[i][0] + 0.6, W.feet[i][1], x, z, yaw), ft = gaitG.feet[i];
                    ft.x = fx2;
                    ft.z = fz2;
                    ft.y = y + 1.1; // knees bent, feet drawn up
                    ft.yaw = yaw;
                }
                gf = { pitch: 0, roll: 0, dy: 0, landed: [] };
                if (wire < 0.5)
                    for (const sd of [1, -1]) {
                        const [jx, jz] = (0, w1_walker_ts_1.modelToWorld)(-2.05, sd * 0.68, x, z, yaw), jy = y + 6.95, fl = 0.85 + 0.3 * Math.random();
                        fx.dot(jx, jy, jz, 0.38, [1, 0.95, 0.8], 1);
                        for (let i = 1; i <= 9; i++) {
                            const k = i / 9;
                            fx.dot(jx + (Math.random() - 0.5) * 0.1 * i, jy - i * 0.45 * fl, jz + (Math.random() - 0.5) * 0.1 * i, 0.42 + 0.2 * k, [1, 0.72 - 0.35 * k, 0.25 - 0.15 * k], (1 - k) * 0.95);
                        }
                        if (Math.random() < 0.35)
                            fx.puff?.(jx, jy - 4.5, jz, 1.2, [0.45, 0.43, 0.42]);
                    }
            }
            else
                gf = (0, w1_walker_ts_1.gaitStep)(gaitG, x, z, yaw, frameDt, walkGround, cd.tSpeed[t]);
            if (hop > 0.15 && hopWas <= 0.15 && !(eb.id === myVehId() && performance.now() - flJetAt < 600))
                snd.walkerJet([x, y + 6, z], eb.id === myVehId(), flJumpAir(t)); // others' jumps (the own one starts on the key press)
            if (hop <= 0.15 && hopWas > 0.6) {
                snd.walkerLand([x, y, z], eb.id === myVehId());
                fx.explosion(x, walkGround(x, z) + 0.3, z, 2.2, 3);
            }
            gPitch = gf.pitch + tl.pitch;
            gRoll = gf.roll + tl.roll;
            liftY = gf.dy;
            walk = (0, tilt_ts_1.packTilt)(gPitch, gRoll);
            walkAmp = 0;
            walkerStats.drawn++;
            for (const i of gf.landed) {
                const ft = gaitG.feet[i];
                walkerStats.footfalls++;
                const dd = Math.hypot(ft.x - eye[0], ft.y - eye[1], ft.z - eye[2]);
                if (dd < 320 && wire < 0.5) {
                    fx_p2_ts_1.p2Fx.run("hover-dust", { x: ft.x, y: ft.y, z: ft.z, ground: ft.y, k: 1.3, f: 0.7, surface: fx_p2_ts_1.p2Fx.surfaceAt(ft.x, ft.z) });
                }
                if (dd < 400) {
                    snd.footfall([ft.x, ft.y, ft.z], i, gaitG.amp, gaitG.W.hips.length === 2); // Frontline: the mech steps lighter
                    walkerStats.footSounds++;
                }
            }
            if (eb.id === myBody)
                walkerStats.own = { rate: gf.rate, amp: gaitG.amp, pitch: gPitch, roll: gRoll };
        }
        // designer playtest 15 Nov 21:36: a boosting vehicle shows it: afterburner glow and a hot exhaust trail behind the hull
        {
            const bst = views[views.length - 1]?.boosts?.get(eb.id);
            if (bst && bst.boosting && kind !== "gunship") { // Frontline: the gunship has no afterburner at the tail
                const r = cd.tRadius[t], bx = x - Math.cos(yaw) * r * 0.95, bz = z - Math.sin(yaw) * r * 0.95, by = y + liftY + r * 0.35;
                fx.muzzle(bx, by, bz, [1, 0.6, 0.25], 0.9 + 0.3 * Math.sin(now / 37 + eb.id), 0.05);
                fx.dot(bx - Math.cos(yaw) * 1.2, by, bz - Math.sin(yaw) * 1.2, 0.7, [0.5, 0.8, 1], 0.6);
                if ((rtClockFrame + eb.id) % 2 === 0)
                    fx.spark(bx - Math.cos(yaw) * 0.8, by, bz - Math.sin(yaw) * 0.8, [1, 0.7, 0.35], 0.5);
                boostFxDrawn++;
            }
        }
        // F3 (designer 16 Nov: "aircraft propellers are not animated"): rotors spin up to full power in flight, idle on the
        // ground with a crew, run down when the aircraft is empty; the angle goes to the shader in the walk-phase slot
        if (ROTOR_KIND.has(kind)) {
            const flying = cd.constants.airAltitude + alt > 2; // aircraft altitude: airAltitude + alt (landed: alt = -airAltitude)
            let rs = rotorState.get(eb.id);
            if (!rs) {
                rs = { ang: (eb.id * 1.3) % 6.28, spin: flying && !empty ? 1 : 0, seen: 0 };
                rotorState.set(eb.id, rs);
            }
            const want = empty ? 0 : flying ? 1 : ROTOR_IDLE;
            rs.spin += (want - rs.spin) * Math.min(1, frameDt * (want > rs.spin ? 0.9 : 0.35));
            if (rs.spin < 0.003)
                rs.spin = 0;
            rs.ang = (rs.ang + rs.spin * ROTOR_REV_S * 2 * Math.PI * frameDt) % (2 * Math.PI);
            rs.seen = rtClockFrame;
            walk = rs.ang;
            walkAmp = rs.spin;
            rotorStats.drawn++;
            rotorStats.maxSpin = Math.max(rotorStats.maxSpin, rs.spin);
        }
        if (kind === "droppod") {
            walk = podTr.progress(eb.id, x, z, now);
            walkAmp = 0;
            podStats.drawn++;
            podStats.deploy = walk;
        } // ruling 130: petals open, the head rises
        if (kind === "fbturret" || kind === "fbwall") { // ruling 132: a forward base's defences unfold (petals back, head up; plates swing up) and fold
            const u = fbTr.open(x, z, now);
            walkAmp = 0;
            walk = kind === "fbturret" ? (0, fb1_ts_1.turretDeploy)(u) : (0, fb1_ts_1.wallDeploy)(u, eb.id % 4, 4);
            fb1Stats.drawn++;
            if (u < 1)
                fb1Stats.moving++;
            fb1Stats.lastOpen = u;
        }
        putInst(kb.a, kb.n * render_ts_1.INST_FLOATS, x, y + liftY, z, yaw, shown, (empty || faint ? 2 : unitTeamIndex(eb)) + (selected.has(eb.id) || eb.id === selBuilding ? 10 : 0), phase, scale, walk, walkAmp, recoil);
        if (gaitG) { // W1: the four legs, hip (on the tilted hull) to the planted / swinging sole (render.ts walkerLeg IK)
            const W = gaitG.W, lb = kindBuf.get(W.biped ? "mleg" : "sleg"), team = (empty || faint ? 2 : unitTeamIndex(eb)) + (selected.has(eb.id) ? 10 : 0);
            const NL = W.hips.length;
            lb.a = grow(lb.a, (lb.n + NL) * render_ts_1.INST_FLOATS);
            for (let i = 0; i < NL; i++) {
                const H = W.hips[i], hp = (0, w1_walker_ts_1.bodyPoint)(H[0], H[1], H[2], x, y + liftY, z, yaw, gPitch, gRoll), ft = gaitG.feet[i];
                if (W.biped) { // Frontline mech: the leg plane is the body's facing (knee forward), the reach signed along it
                    const k = W.legScale, fx = Math.cos(yaw), fz = Math.sin(yaw), reach = (ft.x - hp[0]) * fx + (ft.z - hp[2]) * fz;
                    putInst(lb.a, lb.n * render_ts_1.INST_FLOATS, hp[0], hp[1], hp[2], yaw, ft.yaw, team, phase, k, reach / k, 0, (ft.y - hp[1]) / k);
                }
                else {
                const lyaw = Math.atan2(ft.z - hp[2], ft.x - hp[0]), k = W.legScale ?? 1; // designer 20 Nov: the Strider's legs drawn k x longer
                putInst(lb.a, lb.n * render_ts_1.INST_FLOATS, hp[0], hp[1], hp[2], lyaw, ft.yaw, team, phase, k, Math.hypot(ft.x - hp[0], ft.z - hp[2]) / k, 0, (ft.y - hp[1]) / k);
                }
                lb.n++;
                walkerStats.legs++;
                // a small contact shadow under each foot
                shadowBuf = grow(shadowBuf, (ns + 1) * render_ts_1.DISC_FLOATS);
                (0, terrain_gen_ts_1.sampleNormal)(hm, ft.x, ft.z, nrm);
                const so = ns * render_ts_1.DISC_FLOATS, gy = walkGround(ft.x, ft.z), up = Math.max(0, ft.y - gy);
                shadowBuf[so] = ft.x;
                shadowBuf[so + 1] = gy;
                shadowBuf[so + 2] = ft.z;
                shadowBuf[so + 3] = 1.0 + up * 0.25;
                shadowBuf[so + 4] = nrm[0];
                shadowBuf[so + 5] = nrm[1];
                shadowBuf[so + 6] = nrm[2];
                shadowBuf[so + 7] = 0.5 / (1 + up);
                ns++;
            }
        }
        const rise = rising.get(eb.id);
        if (PROD_TYPE[t])
            kb.a[kb.n * render_ts_1.INST_FLOATS + 10] = -1; // G1: production hue in the command view (no barrel on these kinds)
        if (rise !== undefined) {
            kb.a[kb.n * render_ts_1.INST_FLOATS + 11] = (0, c4_ts_1.riseFraction)(rise);
            risingDrawn++;
        }
        else if (t === PILOT_TYPE && flDownedEnts.has(eb.id)) {
            kb.a[kb.n * render_ts_1.INST_FLOATS + 11] = -3; // Frontline: a downed pilot lies on its back (it stood, and looked unhurt)
            flDownDrawn++;
        }
        else if (t === PILOT_TYPE && eb.crouched) {
            kb.a[kb.n * render_ts_1.INST_FLOATS + 11] = eb.prone ? -2 : -1;
            stanceStats.drawn++;
        } // C8 (ruling 42): other pilots' stance
        kb.n++;
        if (isBunker(t)) { // B1: the mounts fitted at the bunker's level on its roof; a manned mount turns with the aim and recoils
            const nm = Math.min(3, bunkerFitted(eb.crew));
            for (let m = 0; m < nm; m++) {
                const manned = (eb.crew & (1 << m)) !== 0, gb = kindBuf.get(`bgun${m}`);
                gb.a = grow(gb.a, (gb.n + 1) * render_ts_1.INST_FLOATS);
                putInst(gb.a, gb.n * render_ts_1.INST_FLOATS, x, y, z, yaw, manned ? shown : yaw, teamIndex(eb.team) + (selected.has(eb.id) || eb.id === selBuilding ? 10 : 0), phase, scale, 0, 0, manned ? recoil : 0);
                gb.n++;
                b1Stats.gunsDrawn++;
            }
        }
        // blob shadow on the ground (air units and airborne pilots: fainter, under them)
        const r = (kind === "infantry" ? 0.8 : kind === "structure" ? 9 : kind === "tower" ? 5 : kind === "mast" ? 3.5 : cd.tRadius[t] * 1.25) * scale;
        const airborne = cd.tAir[t] ? cd.constants.airAltitude + alt > 2 : alt > 0.5;
        const rShadow = cd.tAir[t] ? MESH.get(kind).radius * 0.7 : r;
        shadowBuf = grow(shadowBuf, (ns + 1) * render_ts_1.DISC_FLOATS);
        (0, terrain_gen_ts_1.sampleNormal)(hm, x, z, nrm);
        const so = ns * render_ts_1.DISC_FLOATS;
        // G1: the blob is cast away from the sun (a simple projected shadow): offset by the kind's height along the light
        const sd = render_ts_1.HALCYON.sunDir, sh = airborne ? 0 : Math.min(rShadow * 0.7, (MESH.get(kind)?.height ?? 2) * scale * 0.45 / Math.max(0.25, sd[1]) * Math.hypot(sd[0], sd[2])), sl = Math.hypot(sd[0], sd[2]) || 1;
        shadowBuf[so] = x - (sd[0] / sl) * sh;
        shadowBuf[so + 1] = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
        shadowBuf[so + 2] = z - (sd[2] / sl) * sh;
        shadowBuf[so + 3] = rShadow * (1 + 0.25 * sh / Math.max(1, rShadow));
        shadowBuf[so + 4] = nrm[0];
        shadowBuf[so + 5] = nrm[1];
        shadowBuf[so + 6] = nrm[2];
        shadowBuf[so + 7] = airborne ? 0.25 : kind === "infantry" ? 0.45 : 0.62;
        ns++;
        // shield flash: a faceted dome for 0.45 s after the shield took a hit (0.7 s, larger and red-shifted, when it went down)
        if (tr && cd.tShield[t] > 0 && wire < 1 && kind !== "infantry") {
            const age = (now - tr.shieldHitAt) / 1000 / feedbackScale, down = now - tr.shieldDownAt < 700 * feedbackScale;
            const life = down ? 0.7 : 0.45;
            if (age < life) {
                const mesh = MESH.get(kind), k = 1 - age / life;
                const rx = (mesh.radius * 1.05 + 0.5) * scale * (down ? 1 + 0.25 * (1 - k) : 1), ry = Math.max((mesh.height - mesh.minY) * 0.8, rx * 0.55);
                shieldBuf = grow(shieldBuf, (shieldCount + 1) * render_ts_1.SHIELD_FLOATS);
                const o = shieldCount++ * render_ts_1.SHIELD_FLOATS;
                shieldBuf[o] = x;
                shieldBuf[o + 1] = y + (mesh.minY + mesh.height) * 0.5 * scale;
                shieldBuf[o + 2] = z;
                shieldBuf[o + 3] = rx;
                // the player's own vehicle in the chase view: a fainter dome (the HUD shield bar flashes too)
                const own = eb.id === myBody && mode === "fp" ? 0.3 : 1;
                shieldBuf[o + 4] = ry;
                shieldBuf[o + 5] = teamIndex(eb.team);
                shieldBuf[o + 6] = k * k * (down ? 1.6 : 1) * own;
                shieldBuf[o + 7] = down ? 1 : 0;
                shieldBuf[o + 8] = tr.hitDir[0];
                shieldBuf[o + 9] = tr.hitDir[1];
                shieldBuf[o + 10] = tr.hitDir[2];
                shieldBuf[o + 11] = 0;
            }
        }
    }
    // C4: own building sites still waiting for their Constructor: the outline of the finished structure (command view;
    // the fill is clipped to nothing) and a ground ring in both views. Enemy sites are drawn only once their structure is seen.
    siteRings.length = 0;
    for (const st of B.construction?.sites ?? []) {
        if (st.team !== 0)
            continue;
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, st.x, st.z);
        siteRings.push({ x: st.x, y: gy, z: st.z, r: cd.tRadius[st.type] * 1.3 + 1, waiting: st.entity === 0 });
        if (st.entity !== 0)
            continue;
        sitesDrawn++; // B2: drawn as a team-tinted ghost at its placed facing (drawPlacementGhosts)
    }
    // C7b item 4: an enemy decoy beacon is a contact like any other (DECOY records): drawn as its fake unit type
    for (const d of B.decoys.values()) {
        if (d.team === 0 || d.type < 0 || d.type >= cd.typeIds.length)
            continue;
        const kind = kindOfType[d.type], kb = kindBuf.get(kind);
        if (!kb)
            continue;
        kb.a = grow(kb.a, (kb.n + 1) * render_ts_1.INST_FLOATS);
        putInst(kb.a, kb.n * render_ts_1.INST_FLOATS, d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + drawLift[d.type], d.z, Math.PI, Math.PI, teamIndex(d.team), (d.id * 1.7) % 6.28, 1);
        kb.n++;
    }
    // ruling 133: a point being fortified: the new level's barricades and bunker rise where they will stand, with the work
    fortStats.rising = 0;
    for (const fs of fortSpotsNow()) {
        const t = fs.spot.kind === "wall" ? T_BARRICADE : fs.spot.kind === "bunker" ? T_BUNKER_T : -1;
        if (t < 0)
            continue;
        const kb = kindBuf.get(kindOfType[t]);
        if (!kb)
            continue;
        kb.a = grow(kb.a, (kb.n + 1) * render_ts_1.INST_FLOATS);
        putInst(kb.a, kb.n * render_ts_1.INST_FLOATS, fs.spot.x, (0, terrain_gen_ts_1.sampleHeight)(hm, fs.spot.x, fs.spot.z) + drawLift[t], fs.spot.z, fs.spot.yaw, fs.spot.yaw, teamIndex(fs.job.own ? 0 : 1), 0, 1);
        kb.a[kb.n * render_ts_1.INST_FLOATS + 11] = (0, fort1_ts_1.fortRise)(fs.job.progress);
        kb.n++;
        fortStats.rising++;
    }
    // ruling 130: a sentry call's drop pod falls closed for its last POD_FALL_S seconds (retros and dust: fx-p2.ts)
    podStats.falling = 0;
    {
        const kb = kindBuf.get("droppod");
        if (kb && SENTRY_CALL >= 0)
            for (const b of B.calls?.beacons ?? []) {
                if (b.call !== SENTRY_CALL)
                    continue;
                const secs = (b.impactTick - rt) * dt;
                if (secs < 0 || secs > s2_pod_ts_1.POD_FALL_S)
                    continue;
                kb.a = grow(kb.a, (kb.n + 1) * render_ts_1.INST_FLOATS);
                putInst(kb.a, kb.n * render_ts_1.INST_FLOATS, b.x, (0, terrain_gen_ts_1.sampleHeight)(hm, b.x, b.z) + (0, s2_pod_ts_1.podFallHeight)(secs), b.z, 0, 0, teamIndex(b.team), (b.id * 1.7) % 6.28, 1, 0, 0, 0);
                kb.n++;
                podStats.falling++;
            }
    }
    // playtest: remembered enemy structures off the wire are still drawn where they stand (not pickable: not in `rendered`)
    ghostsDrawn = 0;
    for (const gh of structMem.ghosts(B.entities)) {
        const kind = kindOfType[gh.type], kb = kindBuf.get(kind);
        if (!kb)
            continue;
        kb.a = grow(kb.a, (kb.n + 1) * render_ts_1.INST_FLOATS);
        putInst(kb.a, kb.n * render_ts_1.INST_FLOATS, gh.x, (0, terrain_gen_ts_1.sampleHeight)(hm, gh.x, gh.z) + drawLift[gh.type], gh.z, gh.yaw, gh.yaw, teamIndex(gh.team), 0, cd.typeIds[gh.type] === "command-core" ? 1.2 : 1, 0, 0, PROD_TYPE[gh.type] ? -1 : 0);
        kb.n++;
        ghostsDrawn++;
    }
    // ruling 106: burnt hulls (client only, no gameplay): the destroyed vehicle's hull, charred with cooling embers, lies
    // where it died, then sinks into the ground and is gone (HULK_BURN_S + HULK_SINK_S)
    wrecksDrawn = 0;
    const hNow = performance.now();
    const hAge = (h) => (hNow - h.t0) / 1000 / feedbackScale; // test aid: slowFeedback stretches the hull's life too
    hulks = hulks.filter((h) => hAge(h) < HULK_BURN_S + HULK_SINK_S);
    for (const h of hulks) {
        const k0 = kindOfType[h.type], kind = k0 === "bike" ? "bikewreck" : k0, kb = kindBuf.get(kind); // bikes: no riders on the wreck
        if (!kb || kind === "infantry")
            continue;
        const age = hAge(h), sinkF = Math.max(0, age - HULK_BURN_S) / HULK_SINK_S;
        const sink = 0.3 + sinkF * sinkF * (cd.tRadius[h.type] * 1.6 + 1.5), heat = Math.max(0, 1 - age / (HULK_BURN_S + HULK_SINK_S * 0.6));
        kb.a = grow(kb.a, (kb.n + 1) * render_ts_1.INST_FLOATS);
        putInst(kb.a, kb.n * render_ts_1.INST_FLOATS, h.x, (0, terrain_gen_ts_1.sampleHeight)(hm, h.x, h.z) - sink, h.z, h.yaw, h.yaw + h.tw, 3, heat, 1, 0, -1); // the shader drops hover and bob for wrecks (walk amplitude -1)
        kb.n++;
        wrecksDrawn++;
    }
    for (const id of turret.keys())
        if (!B.entities.has(id))
            turret.delete(id);
    for (const id of tracks.keys())
        if (!B.entities.has(id) && !(A.entities.has(id)))
            tracks.delete(id);
    shadowCount = ns;
    // projectiles: flown analytically from their launch record. Protocol v4: the record names the shooter and starts at
    // the firing mount's muzzle (data muzzles = the barrel tips drawn here), so the bolt is drawn from the sim's own
    // point; the remaining offset (drawn model interpolated ~1 tick behind the launch, the drawn turret still turning)
    // is a few decimetres and fades out over the first 0.12 s / 40 m
    let np = 0;
    const live = new Set();
    let fireSounds = 0, impactSounds = 0;
    for (let p of B.projectiles.values()) {
        { // 21 Nov: a homing shot's record is re-based when resent (co-op guest snapshots against older baselines): keep the newest, never flip back to an older one (the guest's zig-zag)
            const q = seenProj.get(p.id);
            if (q && q.rec && q.rec !== p && (q.rec.at ?? 0) > (p.at ?? 0))
                p = q.rec;
        }
        const ballistic = cd.wBallistic[p.weapon] === 1;
        if (rt < p.launchTick)
            continue;
        const pos = (0, netsnap_ts_1.projectileAtTick)(p, rt, dt, cd.gravity, ballistic);
        const age = (rt - p.launchTick) * dt;
        let vx = p.vx, vy = p.vy - (ballistic ? cd.gravity * age : 0), vz = p.vz;
        const sp = Math.hypot(vx, vy, vz) || 1;
        vx /= sp;
        vy /= sp;
        vz /= sp;
        live.add(p.id);
        let pv = seenProj.get(p.id);
        if (!pv) {
            projectilesSeen++;
            pendingProj.delete(p.id);
            const shooter = renderedById.get(p.shooter);
            const sim0 = [p.x0, p.y0, p.z0];
            let off = [0, 0, 0], M = sim0;
            const vmz = p.shooter === myBody && myBody !== 0 && fpFoot ? vmMuzzleWorld(VM_TRACER_DEPTH) : null;
            if (vmz) {
                M = vmz;
                off = [M[0] - p.x0, M[1] - p.y0, M[2] - p.z0];
                muzzleGlows.push({ p: vmz, to: [p.x0 + p.vx, p.y0 + p.vy, p.z0 + p.vz], team: p.team, t0: now });
            } // P1g: the own rocket leaves the drawn tube
            else if (shooter) {
                const nm = nearestMuzzle(shooter, sim0, p.id);
                M = nm.p;
                off = [M[0] - p.x0, M[1] - p.y0, M[2] - p.z0];
                const tr = tracks.get(shooter.id);
                if (tr)
                    tr.recoilAt = now;
                logOrigin(shooter, nm.mount, false, sim0, M, (rt - p.launchTick) * dt, muzzleFade(age, Math.hypot(p.vx, p.vy, p.vz)), Math.hypot(p.vx, p.vy, p.vz));
            }
            countShot(drawnBy, p.shooter, p.weapon);
            pv = { pos, off, weapon: p.weapon, team: p.team, rec: p, lastTick: B.tick, shooter: p.shooter };
            seenProj.set(p.id, pv);
            const glow = p.team === 0 ? render_ts_1.HALCYON.glowA : render_ts_1.HALCYON.glowB, own = p.shooter === myBody && myBody !== 0;
            const rapid = own && isAuto(p.weapon);
            if (Math.hypot(M[0] - eye[0], M[2] - eye[2]) < 700)
                ownMuzzle(M[0] + vx * 0.6, M[1] + vy * 0.6, M[2] + vz * 0.6, glow, own ? (b1Stats.bunkerCam ? 0.5 : 1.8) : 1, own, p.weapon, now); // B1: the bunker gun's flash is just ahead of the eye
            let podK = 0;
            if (p.weapon === POD_ROCKET_W && POD_ROCKET_W >= 0) { // ruling 130: a salvo's rockets whoosh one after another
                if (podTr.rocket(p.shooter, now))
                    podStats.salvos++;
                const key = `${p.shooter}:${p.launchTick}`;
                podK = podRocketN.get(key) ?? 0;
                podRocketN.set(key, podK + 1);
                podStats.rockets++;
                if (podRocketN.size > 64)
                    podRocketN.clear();
            }
            if (own || (fireSounds < 6 && Math.hypot(M[0] - eye[0], M[2] - eye[2]) < 1400)) {
                const loud = own || (gunSeated() && me?.entity === p.shooter), wc = weaponClass[p.weapon], fp = firePitch[p.weapon], mg = mgRate[p.weapon];
                if (podK > 0) {
                    const Mc = [M[0], M[1], M[2]];
                    setTimeout(() => { snd.fire(wc, Mc, loud, false, fp * (1 + podK * 0.03), mg); podStats.whooshes++; }, podK * 85);
                }
                else {
                    snd.lastSample = null;
                    if (!(WSAMPLE[p.weapon] && snd.weaponSample(WSAMPLE[p.weapon], M, loud)))
                        snd.fire(wc, M, loud, rapid, fp, mg);
                    pv.snd = snd.lastSample; // the launch roar (rocket recording) rides with this rocket
                    if (p.weapon === POD_ROCKET_W)
                        podStats.whooshes++;
                }
                fireSounds++;
            }
            if (own) {
                playerShotsSeen++;
                ownShotsW[p.weapon] = (ownShotsW[p.weapon] ?? 0) + 1;
                ownShotAt = now;
            }
        }
        pv.lastTick = B.tick;
        const k = muzzleFade(age, Math.hypot(p.vx, p.vy, p.vz));
        if (pv.rec !== p) { // a newer record (homing re-base): glide from where it is drawn to the new path over 0.2 s instead of jumping
            if (pv.pos)
                pv.blend = { d: [pv.pos[0] - pos[0] - pv.off[0] * k, pv.pos[1] - pos[1] - pv.off[1] * k, pv.pos[2] - pos[2] - pv.off[2] * k], t: now };
            pv.rec = p;
        }
        const bk = pv.blend ? Math.max(0, 1 - (now - pv.blend.t) / 200) : 0, bd = pv.blend ? pv.blend.d : null;
        if (pv.blend && bk <= 0)
            pv.blend = null;
        const dp = [pos[0] + pv.off[0] * k + (bd ? bd[0] * bk : 0), pos[1] + pv.off[1] * k + (bd ? bd[1] * bk : 0), pos[2] + pv.off[2] * k + (bd ? bd[2] * bk : 0)];
        pv.pos = dp;
        fx_p2_ts_1.p2Fx.proj(p.id, p.weapon, p.team, dp, vx, vy, vz, p.shooter === myBody && myBody !== 0 && !b1Stats.bunkerCam); // P2 hook (B1: the bunker's own shots as seen from beside the gun)
        projBuf = grow(projBuf, (np + 1) * render_ts_1.PROJ_FLOATS);
        const o = np * render_ts_1.PROJ_FLOATS;
        const cal = projCal[p.weapon] ?? 1, rk = WFAM[p.weapon] === "rocket" || WFAM[p.weapon] === "missile";
        const len = rk ? 1.6 + cal * 0.2 : Math.min(Math.max(sp * 0.035, 2 + cal * 0.9), 16 + cal * 2); // V1: longer streaks for bigger rounds; P1g: a rocket's is its motor's flame (P2 draws the smoke)
        projBuf[o] = dp[0];
        projBuf[o + 1] = dp[1];
        projBuf[o + 2] = dp[2];
        projBuf[o + 3] = Math.min(len, Math.max(0.5, age * sp));
        projBuf[o + 4] = vx;
        projBuf[o + 5] = vy;
        projBuf[o + 6] = vz;
        projBuf[o + 7] = (0, render_ts_1.projCode)(p.team, false, cal);
        np++;
    }
    for (const [id, pv] of seenProj) {
        if (live.has(id))
            continue;
        seenProj.delete(id);
        if (pv.snd) { // a rocket's launch roar stops when the rocket is gone (it hit inside the recording's length)
            snd.cutSample(pv.snd);
            pv.snd = null;
        }
        // the round is gone from the snapshot: it ended within the tick after the last snapshot that held it. Its impact is
        // where its path meets the ground or a body in that tick, not where it was last drawn: a round drawn once at its
        // muzzle (fired at close range or into the ground) used to burst AT THE SHOOTER (an "explosion" at the player's
        // own Dart on the first shots). A gap of more than 1.5 m is flown as a short bolt that bursts at the end.
        {
            const e = pathEnd(pv.pos, (0, netsnap_ts_1.projectileAtTick)(pv.rec, pv.lastTick + 1, dt, cd.gravity, cd.wBallistic[pv.weapon] === 1), pv.shooter);
            if (Math.hypot(e.p[0] - pv.pos[0], e.p[1] - pv.pos[1], e.p[2] - pv.pos[2]) > 1.5) {
                tracers.push({ shooter: pv.shooter, weapon: pv.weapon, team: pv.team, sim0: pv.pos, from: pv.pos, to: e.p, age: 0, drawn: true, hit: !e.ground, ground: e.ground, target: 0 });
                continue;
            }
        }
        const p = pv.pos, y = Math.max(p[1], (0, terrain_gen_ts_1.sampleHeight)(hm, p[0], p[2]) + 0.3);
        impactLog.push({ x: p[0], y, z: p[2], shooter: pv.shooter });
        if (impactLog.length > 200)
            impactLog.shift();
        recentImpacts.push({ x: p[0], y, z: p[2], t: now });
        const d = Math.hypot(p[0] - eye[0], p[2] - eye[2]);
        if (d < 900)
            fx.spark(p[0], y, p[2], [1, 0.75, 0.35], cd.wSplash[pv.weapon] > 0 ? 1.8 : 1);
        if (d < 900 && impactSounds < 4) {
            snd.impact([p[0], y, p[2]], cd.wSplash[pv.weapon] > 0);
            impactSounds++;
        }
    }
    while (recentImpacts.length && now - recentImpacts[0].t > 600)
        recentImpacts.shift();
    // short flights: rounds that flew and landed between two snapshots the page draws (see pendingProj)
    for (const [id, q] of pendingProj) {
        if (B.projectiles.has(id) || B.tick <= q.tick)
            continue; // still to be drawn from a snapshot
        pendingProj.delete(id);
        if (seenProj.has(id))
            continue;
        const p = q.p, e = pathEnd([p.x0, p.y0, p.z0], (0, netsnap_ts_1.projectileAtTick)(p, Math.max(q.tick, p.launchTick) + 1, dt, cd.gravity, cd.wBallistic[p.weapon] === 1), p.shooter);
        tracers.push({ shooter: p.shooter, weapon: p.weapon, team: p.team, sim0: [p.x0, p.y0, p.z0], from: [p.x0, p.y0, p.z0], to: e.p, age: 0, drawn: false, hit: !e.ground, ground: e.ground, target: 0 });
        shortFlights++;
    }
    if (pendingProj.size > 4000)
        pendingProj.clear();
    // hitscan shots (protocol v4 view.shots): a fast bolt from the muzzle to where the sim's ray really ended; a bright
    // spark on a hit, a dust spark on the ground, nothing for a miss that flew to full range
    const TRACER_SPEED = 1100;
    let w = 0;
    for (const tr of tracers) {
        if (!tr.drawn) {
            tr.drawn = true;
            const s = renderedById.get(tr.shooter), own = tr.shooter === myBody && myBody !== 0;
            const vmz = own && fpFoot ? vmMuzzleWorld(VM_TRACER_DEPTH) : null;
            if (own && tr.weapon === CONT_BEAM) { // Frontline: the own shoulder laser is one held beam (flBigBeams), no per-shot visuals
                flOwnBeamUntil = now + 220;
                flOwnBeamLen = Math.hypot(tr.to[0] - eye[0], tr.to[1] - eye[1], tr.to[2] - eye[2]);
                if (vmz)
                    tr.from = vmz;
            }
            else if (vmz) {
                tr.from = vmz;
                muzzleGlows.push({ p: vmz, to: tr.to, team: tr.team, t0: now });
            } // P1g: from the drawn barrel tip, converging on the hit point; a soft glow on the flash
            else if (own && fpFoot) {
                // first person on foot, scoped (no viewmodel): the sim's muzzle is 0.5 m below the eye; the first metres are
                // skipped (a bolt drawn from beside the eye fills the screen)
                const m0 = tr.sim0, ux = tr.to[0] - m0[0], uy = tr.to[1] - m0[1], uz = tr.to[2] - m0[2], ul = Math.hypot(ux, uy, uz) || 1, k = Math.min(6, ul * 0.5) / ul;
                tr.from = [m0[0] + ux * k, m0[1] + uy * k, m0[2] + uz * k];
            }
            else if (s) {
                const nm = nearestMuzzle(s, tr.sim0, Math.floor(Math.random() * 2));
                tr.from = nm.p;
                const t2 = tracks.get(s.id);
                if (t2)
                    t2.recoilAt = now;
                logOrigin(s, nm.mount, true, tr.sim0, tr.from, 0, 1, 0);
            }
            countShot(drawnBy, tr.shooter, tr.weapon);
            const glow = tr.team === 0 ? render_ts_1.HALCYON.glowA : render_ts_1.HALCYON.glowB;
            if (Math.hypot(tr.from[0] - eye[0], tr.from[2] - eye[2]) < 700 && !(own && fpFoot) && tr.weapon !== CONT_BEAM)
                ownMuzzle(tr.from[0], tr.from[1], tr.from[2], glow, own ? (b1Stats.bunkerCam ? 0.5 : 1.6) : 0.8, own, tr.weapon, now); // B1: smaller beside the eye
            if (tr.weapon !== CONT_BEAM)
                fx_p2_ts_1.p2Fx.shot(tr.weapon, tr.team, tr.from, tr.to, own && !b1Stats.bunkerCam, tr.hit); // P2 hook
            const pilotGun = tr.weapon === W_CARBINE ? "carbine" : tr.weapon === W_RIFLE ? "rifle" : null;
            const pelletDup = PELLETS[tr.weapon] > 1 && pelletSnd.get(tr.shooter) === `${tr.weapon}@${tr.tick ?? Math.round(now / 40)}`; // Frontline: one sound per shotgun blast, not per pellet
            pelletSnd.set(tr.shooter, `${tr.weapon}@${tr.tick ?? Math.round(now / 40)}`);
            if (!pelletDup && (own || (fireSounds < 6 && Math.hypot(tr.from[0] - eye[0], tr.from[2] - eye[2]) < 1400))) {
                snd.lastSample = null;
                if (WSAMPLE[tr.weapon] && snd.weaponSample(WSAMPLE[tr.weapon], tr.from, own)) { /* Frontline: a designer recording */ }
                else if (pilotGun)
                    snd.pilotFire(pilotGun, tr.from, own);
                else if (tr.weapon === CONT_BEAM && snd.beamHold(tr.shooter, tr.from, own)) { /* Frontline: the held Lancer sound */ }
                else if (MINIGUN_W.has(tr.weapon) && snd.minigunHold(tr.shooter * 1000 + tr.weapon, tr.from, own)) { /* Frontline: the held minigun recording */ }
                else
                    snd.fire(weaponClass[tr.weapon], tr.from, own, own && isAuto(tr.weapon), firePitch[tr.weapon], mgRate[tr.weapon]);
                tr.snd = snd.lastSample; // a rocket's launch roar: cut when this round lands
                fireSounds++;
            }
            if (own) {
                playerShotsSeen++;
                ownShotsW[tr.weapon] = (ownShotsW[tr.weapon] ?? 0) + 1;
                ownTracers++;
                if (tr.hit)
                    ownTracerHits++;
                ownShotAt = now;
            }
            if (LINGER_W.has(tr.weapon) && Math.hypot(tr.from[0] - eye[0], tr.from[2] - eye[2]) < 1200) {
                rifleTrails.push({ from: [...tr.from], to: [...tr.to], team: tr.team, t0: now });
                if (rifleTrails.length > 32)
                    rifleTrails.shift();
            } // P1g
            if (isBeamW(tr.weapon)) {
                beams.push({ from: [...tr.from], to: [...tr.to], team: tr.team, t0: now, life: tr.weapon === CONT_BEAM ? CONT_BEAM_S : BEAM_S, shooter: tr.shooter, own: tr.shooter === bodyId() });
                if (beams.length > 64)
                    beams.shift();
            } // V1: the laser cannon's beam is held
        }
        else
            tr.age += frameDt;
        const dx = tr.to[0] - tr.from[0], dy = tr.to[1] - tr.from[1], dz = tr.to[2] - tr.from[2], L = Math.hypot(dx, dy, dz) || 1;
        const along = isBeamW(tr.weapon) ? L : tr.age * TRACER_SPEED; // V1: a laser cannon shot lands at once
        if (along >= L) {
            if (tr.snd) { // Frontline: a rocket that landed between two snapshots: its launch roar stops with it
                snd.cutSample(tr.snd);
                tr.snd = null;
            }
            const d = Math.hypot(tr.to[0] - eye[0], tr.to[2] - eye[2]);
            if (tr.hit || tr.ground) {
                recentImpacts.push({ x: tr.to[0], y: tr.to[1], z: tr.to[2], t: now });
                impactLog.push({ x: tr.to[0], y: tr.to[1], z: tr.to[2], shooter: tr.shooter });
                if (impactLog.length > 200)
                    impactLog.shift();
            }
            if (d < 700 && tr.hit)
                fx.spark(tr.to[0], tr.to[1], tr.to[2], [1, 0.85, 0.5], 0.8);
            else if (d < 700 && tr.ground)
                fx.spark(tr.to[0], tr.to[1] + 0.2, tr.to[2], [0.72, 0.62, 0.46], 0.6);
            if (d < 600 && impactSounds < 4 && (tr.hit || tr.ground)) {
                snd.impact(tr.to, false);
                impactSounds++;
            }
            continue;
        }
        tracers[w++] = tr;
        projBuf = grow(projBuf, (np + 1) * render_ts_1.PROJ_FLOATS);
        const o = np * render_ts_1.PROJ_FLOATS, a = Math.max(along, 2), tc = projCal[tr.weapon] ?? 1, bolt = WFAM[tr.weapon] === "laser-rapid";
        projBuf[o] = tr.from[0] + dx / L * a;
        projBuf[o + 1] = tr.from[1] + dy / L * a;
        projBuf[o + 2] = tr.from[2] + dz / L * a;
        projBuf[o + 3] = Math.min(bolt ? 9 : tc === 0 ? 7 : 14, a); // P1g: small arms a short quick streak
        projBuf[o + 4] = dx / L;
        projBuf[o + 5] = dy / L;
        projBuf[o + 6] = dz / L;
        projBuf[o + 7] = (0, render_ts_1.projCode)(tr.team, !bolt && tc < 3, tc); // thin hitscan tracer; V1: the rapid laser's bolts full width
        np++;
    }
    tracers.length = w;
    // V1: laser cannon beams held along their length, brightest at the shot, fading over BEAM_S
    beams = beams.filter((b) => now - b.t0 < b.life * 1000);
    for (const b of beams) {
        if (b.life === CONT_BEAM_S && b.own)
            continue; // Frontline: the own beam is the cone (flBigBeams)
        const k = b.life < BEAM_S ? 1 : 1 - (now - b.t0) / (b.life * 1000), dx = b.to[0] - b.from[0], dy = b.to[1] - b.from[1], dz = b.to[2] - b.from[2], L = Math.hypot(dx, dy, dz) || 1;
        projBuf = grow(projBuf, (np + 1) * render_ts_1.PROJ_FLOATS);
        const o = np * render_ts_1.PROJ_FLOATS;
        projBuf[o] = b.to[0];
        projBuf[o + 1] = b.to[1];
        projBuf[o + 2] = b.to[2];
        projBuf[o + 3] = L;
        projBuf[o + 4] = dx / L;
        projBuf[o + 5] = dy / L;
        projBuf[o + 6] = dz / L;
        projBuf[o + 7] = (0, render_ts_1.projCode)(b.team, false, Math.round(7 * k * k), true);
        np++;
    }
    // P1g: the long rifle's (and the anti-materiel rifle's) path lingers as a faint line for a moment
    rifleTrails = rifleTrails.filter((b) => now - b.t0 < RIFLE_TRAIL_S * 1000);
    for (const b of rifleTrails) {
        const k = 1 - (now - b.t0) / (RIFLE_TRAIL_S * 1000), dx = b.to[0] - b.from[0], dy = b.to[1] - b.from[1], dz = b.to[2] - b.from[2], L = Math.hypot(dx, dy, dz) || 1;
        projBuf = grow(projBuf, (np + 1) * render_ts_1.PROJ_FLOATS);
        const o = np * render_ts_1.PROJ_FLOATS;
        projBuf[o] = b.to[0];
        projBuf[o + 1] = b.to[1];
        projBuf[o + 2] = b.to[2];
        projBuf[o + 3] = L;
        projBuf[o + 4] = dx / L;
        projBuf[o + 5] = dy / L;
        projBuf[o + 6] = dz / L;
        projBuf[o + 7] = (0, render_ts_1.projCode)(b.team, true, Math.round(7 * k * k), true);
        np++;
    }
    // P1g: the own shot's flash glow at the drawn barrel tip (a short soft ribbon, ~60 ms)
    muzzleGlows = muzzleGlows.filter((g) => now - g.t0 < 60);
    for (const g of muzzleGlows) {
        const dx = g.to[0] - g.p[0], dy = g.to[1] - g.p[1], dz = g.to[2] - g.p[2], L = Math.hypot(dx, dy, dz) || 1;
        projBuf = grow(projBuf, (np + 1) * render_ts_1.PROJ_FLOATS);
        const o = np * render_ts_1.PROJ_FLOATS;
        projBuf[o] = g.p[0] + dx / L * 0.05;
        projBuf[o + 1] = g.p[1] + dy / L * 0.05;
        projBuf[o + 2] = g.p[2] + dz / L * 0.05;
        projBuf[o + 3] = 0.07;
        projBuf[o + 4] = dx / L;
        projBuf[o + 5] = dy / L;
        projBuf[o + 6] = dz / L;
        projBuf[o + 7] = (0, render_ts_1.projCode)(g.team, false, 7);
        np++;
    }
    projCount = np;
    // selection rings (units, and the selected building)
    let nr = 0;
    for (const e of rendered) {
        if (!selected.has(e.id) && e.id !== selBuilding)
            continue;
        ringBuf = grow(ringBuf, (nr + 1) * render_ts_1.DISC_FLOATS);
        (0, terrain_gen_ts_1.sampleNormal)(hm, e.x, e.z, nrm);
        const o = nr * render_ts_1.DISC_FLOATS;
        ringBuf[o] = e.x;
        ringBuf[o + 1] = (0, terrain_gen_ts_1.sampleHeight)(hm, e.x, e.z);
        ringBuf[o + 2] = e.z;
        ringBuf[o + 3] = kindOfType[e.type] === "infantry" ? 1.6 : cd.tStructure[e.type] ? cd.tRadius[e.type] * e.scale * 1.6 : cd.tRadius[e.type] * 1.5 + 1;
        ringBuf[o + 4] = nrm[0];
        ringBuf[o + 5] = nrm[1];
        ringBuf[o + 6] = nrm[2];
        ringBuf[o + 7] = 0.9;
        nr++;
    }
    // C4: building sites (a faint ring while waiting for the Constructor, brighter while building)
    for (const sr of siteRings) {
        ringBuf = grow(ringBuf, (nr + 1) * render_ts_1.DISC_FLOATS);
        (0, terrain_gen_ts_1.sampleNormal)(hm, sr.x, sr.z, nrm);
        const o = nr * render_ts_1.DISC_FLOATS;
        ringBuf[o] = sr.x;
        ringBuf[o + 1] = sr.y;
        ringBuf[o + 2] = sr.z;
        ringBuf[o + 3] = sr.r;
        ringBuf[o + 4] = nrm[0];
        ringBuf[o + 5] = nrm[1];
        ringBuf[o + 6] = nrm[2];
        ringBuf[o + 7] = sr.waiting ? 0.45 : 0.75;
        nr++;
    }
    for (const id of Array.from(selected))
        if (!B.entities.has(id))
            selected.delete(id);
    if (selBuilding && !B.entities.has(selBuilding))
        selBuilding = 0;
    ringCount = nr;
    flCallMeshes(now, B, rt);
    if (cine)
        cineMeshes(now);
    turretLasersDrawn = 0;
    for (const [e, k] of laserQ)
        turretLaser(e, k, now); // F1: after the loop (bodyRender is set)
    return { rt };
}
const laserQ = [];
let shadowCount = 0, projCount = 0, ringCount = 0;
/** C4: site rings this frame, holograms and rising structures drawn (tests). */
const siteRings = [];
let sitesDrawn = 0, risingDrawn = 0, siteTags = 0;
/**
 * One shot-origin measurement (slice 2 item 3, re-run in slice 3b): the sim's launch point (protocol v4: the data
 * muzzle) vs the shooter's drawn muzzle at the render time. rawOld: the drawn muzzle vs the shooter's hit-sphere
 * centre, where the sim launched shots before protocol v4 (what the slice-3 correction had to bridge).
 */
function logOrigin(s, mount, hitscan, sim0, M, sinceLaunch, fadeAtFirstDraw, speed) {
    if (originLog.length >= 5000)
        return;
    const dx = M[0] - sim0[0], dy = M[1] - sim0[1], dz = M[2] - sim0[2];
    const raw = Math.hypot(dx, dy, dz), rawOld = Math.hypot(M[0] - s.x, M[1] - s.cy, M[2] - s.z);
    // the drawn bolt's start at its first frame: sim point + offset * fade -> residual distance from the muzzle
    // (hitscan tracers are drawn from the muzzle itself: residual 0). drawn60: the same at 60 fps, where a shot is first
    // drawn on average 1/120 s after launch (computed with the same fade; headless frame rates are 2-5 fps)
    const drawn = raw * (1 - fadeAtFirstDraw), drawn60 = hitscan ? 0 : raw * (1 - muzzleFade(1 / 120, speed));
    originLog.push({ typeId: cd.typeIds[s.type], kind: kindOfType[s.type], mount, hitscan, raw, rawOld, dy, dh: Math.hypot(dx, dz), delay: Math.hypot(s.vx, s.vz) * sinceLaunch, drawn, drawn60, speed });
}
/** Far zoom in command view: units collapse into per-type outline icons, a fixed size in screen pixels. Needs this frame's vp. */
let iconFamiliesDrawn = new Map(), ghostIcons = 0;
function buildIcons() {
    iconCount = 0;
    iconSegs = 0;
    iconMix = 0;
    outlineMax = 0;
    iconFamiliesDrawn = new Map();
    if (wire <= 0 || rendered.length === 0)
        return;
    const focal = proj[5] * cssH / 2; // CSS px per metre at view depth 1
    const p2 = [0, 0, 0];
    let mix = 0;
    const myBody = bodyId();
    for (const e of rendered) {
        const kind = kindOfType[e.type];
        (0, math_ts_1.project)(vp, e.x, e.y, e.z, tmp4);
        const w = Math.max(tmp4[2], 0.01);
        const outline = e.id === myBody ? 0 : (0, math_ts_1.smoothstep)((R.kindSize(kind) * e.scale * focal / w - render_ts_1.ICON_PX[0]) / (render_ts_1.ICON_PX[1] - render_ts_1.ICON_PX[0]));
        mix += 1 - outline;
        outlineMax = Math.max(outlineMax, outline);
        const a = wire * (1 - outline);
        if (a < 0.01 || tmp4[2] <= 0.05)
            continue;
        const fam = e.id === myBody ? "you" : familyOfType[e.type];
        const shape = icons_ts_1.ICON_SHAPES[icons_ts_1.ICON_INDEX.get(fam)];
        iconFamiliesDrawn.set(e.id, fam);
        // on-screen heading (y up) for vehicles: project a point 6 m ahead
        let c = 1, s = 0;
        if (shape.facing) {
            (0, math_ts_1.project)(vp, e.x + Math.cos(e.yaw) * 6, e.y, e.z + Math.sin(e.yaw) * 6, p2);
            const hx = (p2[0] - tmp4[0]) * cssW, hy = (p2[1] - tmp4[1]) * cssH, l = Math.hypot(hx, hy);
            if (l > 1e-6) {
                c = hx / l;
                s = hy / l;
            }
        }
        const px = shape.px, sel = selected.has(e.id) || e.id === selBuilding || e.id === myBody ? 1 : 0, team = e.id === myBody ? 3 : crewable(e.type) && e.crew === 0 ? 2 : teamIndex(e.team), k = shape.segs;
        iconBuf = grow(iconBuf, (iconSegs + k.length / 4) * render_ts_1.ICON_FLOATS);
        for (let i = 0; i < k.length; i += 4) {
            const o = iconSegs++ * render_ts_1.ICON_FLOATS;
            const ax = k[i] * px, ay = k[i + 1] * px, bx = k[i + 2] * px, by = k[i + 3] * px;
            iconBuf[o] = e.x;
            iconBuf[o + 1] = e.y + 1;
            iconBuf[o + 2] = e.z;
            iconBuf[o + 3] = 1.35;
            iconBuf[o + 4] = ax * c - ay * s;
            iconBuf[o + 5] = ax * s + ay * c;
            iconBuf[o + 6] = bx * c - by * s;
            iconBuf[o + 7] = bx * s + by * c;
            iconBuf[o + 8] = team;
            iconBuf[o + 9] = a;
            iconBuf[o + 10] = sel;
            iconBuf[o + 11] = PROD_TYPE[e.type] && team < 2 ? 1 : 0;
        }
        iconCount++;
    }
    // C4: remembered enemy structures off the wire (towers once seen, the known base layout) keep their icon, dimmer
    ghostIcons = 0;
    const onWire = views.length ? views[views.length - 1].entities : new Map();
    for (const gh of structMem.ghosts(onWire)) {
        const shape = icons_ts_1.ICON_SHAPES[icons_ts_1.ICON_INDEX.get(familyOfType[gh.type])], gy = (0, terrain_gen_ts_1.sampleHeight)(hm, gh.x, gh.z);
        (0, math_ts_1.project)(vp, gh.x, gy, gh.z, tmp4);
        const w = Math.max(tmp4[2], 0.01);
        if (tmp4[2] <= 0.05)
            continue;
        const outline = (0, math_ts_1.smoothstep)((R.kindSize(kindOfType[gh.type]) * focal / w - render_ts_1.ICON_PX[0]) / (render_ts_1.ICON_PX[1] - render_ts_1.ICON_PX[0]));
        const a = wire * (1 - outline) * 0.65;
        if (a < 0.01)
            continue;
        const px = shape.px, k = shape.segs;
        iconBuf = grow(iconBuf, (iconSegs + k.length / 4) * render_ts_1.ICON_FLOATS);
        for (let i = 0; i < k.length; i += 4) {
            const o = iconSegs++ * render_ts_1.ICON_FLOATS;
            iconBuf[o] = gh.x;
            iconBuf[o + 1] = gy + 1;
            iconBuf[o + 2] = gh.z;
            iconBuf[o + 3] = 1.35;
            iconBuf[o + 4] = k[i] * px;
            iconBuf[o + 5] = k[i + 1] * px;
            iconBuf[o + 6] = k[i + 2] * px;
            iconBuf[o + 7] = k[i + 3] * px;
            iconBuf[o + 8] = teamIndex(gh.team);
            iconBuf[o + 9] = a;
            iconBuf[o + 10] = 0;
            iconBuf[o + 11] = PROD_TYPE[gh.type] ? 1 : 0;
        }
        ghostIcons++;
    }
    iconMix = mix / rendered.length;
}
// ------------------------------------------------------------------ cameras
let lastBodyPos = { x: PILOT_START.x, y: 0, z: PILOT_START.z };
/**
 * Walk bob (camera and held weapon): the phase is a continuous function of the distance the DRAWN body has walked
 * (one step per BOB_STRIDE m, carried across frames, never reset), so it neither restarts on a speed change nor jumps
 * at snapshot / tick boundaries; the amplitude follows the walked speed through an ease (about 0.15 s) so starting and
 * stopping fade the bob in and out. (Before: phase advanced by the snapshot speed only above 1 m/s, and the amplitude
 * was the instantaneous snapshot speed, which steps at every sim tick: a stutter that read as a repeating glitch.)
 */
const BOB_STRIDE = 1.6;
const PILOT_SPEED = cd.tSpeed[PILOT_TYPE];
/** Sprint pose target from the input (eased in drawViewModel with a smooth, critically damped follow). */
let vmSprintTarget = 0, vmSprintVel = 0;
let bobT = 0, bobAmp = 0, bobSpeed = 0, bobJumps = 0;
/** Smoothed first-person eye position (x, z) on foot; null: follow the body directly (seated, dead, first frame). */
let fpSmooth = null;
const FP_SMOOTH_S = 0.05;
function updateFpSmooth(frameDt) {
    const b = bodyRender;
    if (!b || !onFoot() || dead()) {
        fpSmooth = null;
        return;
    }
    if (!fpSmooth || Math.hypot(b.x - fpSmooth.x, b.z - fpSmooth.z) > 2) {
        fpSmooth = { x: b.x, z: b.z };
        return;
    } // a respawn / teleport
    const k = 1 - Math.exp(-Math.max(0, frameDt) / FP_SMOOTH_S);
    fpSmooth.x += (b.x - fpSmooth.x) * k;
    fpSmooth.z += (b.z - fpSmooth.z) * k;
}
function updateBob(frameDt) {
    // driven by render-frame time and the LOCAL move input (no snapshot value: those step at 20 Hz): the speed the held
    // keys ask for (data: pilot speed, sprint / crouch multipliers), eased over ~0.15 s; the phase integrates it
    const b = bodyRender, foot = onFoot() && mode === "fp" && !!b && !panelOpen();
    const grounded = foot && !!me && me.airborne === sim_ts_1.AIR_GROUND;
    const mvKeys = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0), stKeys = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const moving = grounded && (mvKeys !== 0 || stKeys !== 0);
    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const crawl = stanceNow !== "STANDING" && stanceNow !== "CROUCHED";
    const wantSpeed = moving ? PILOT_SPEED * (crawl ? STANCE.crawl : crouchHeld() ? CREW.crouchMul : sprint && mvKeys > 0 ? CREW.sprintMul : 1) : 0;
    bobSpeed += (wantSpeed - bobSpeed) * Math.min(1, frameDt / 0.15);
    if (bobSpeed > 0.01)
        bobT += ((bobSpeed * frameDt) / BOB_STRIDE) * Math.PI; // sin(bobT): one up-down per stride; the weapon sway (bobT / 2) one per two strides
    vmSprintTarget = (moving && sprint && mvKeys > 0 && !crouchHeld() && !crawl) || stanceNow === "GOING PRONE" || stanceNow === "GETTING UP" ? 1 : 0; // C8: lowered while changing stance (cannot fire)
    const want = grounded && !scoped ? (0, math_ts_1.clamp)(bobSpeed / PILOT_SPEED, 0, 1.3) : 0;
    bobAmp += (want - bobAmp) * Math.min(1, frameDt / 0.15);
}
function fpPose(now) {
    if (bodyRender)
        lastBodyPos = { x: bodyRender.x, y: bodyRender.y, z: bodyRender.z };
    b1Stats.bunkerCam = false;
    if (dead() || (!bodyRender && !me))
        return spectatorPose(now);
    const cp = Math.cos(camPitch), dir = [Math.cos(camYaw) * cp, Math.sin(camPitch), Math.sin(camYaw) * cp];
    {
        const g = gunSeatEye();
        if (g)
            return { eye: g, target: [g[0] + dir[0] * 50, g[1] + dir[1] * 50, g[2] + dir[2] * 50] };
    } // C1 ruling 125: inside the sentry's gun
    if (onFoot()) {
        // true first person at head height (crouched lower), a little walk bob
        const p = bodyRender ?? { x: lastBodyPos.x, simY: (0, terrain_gen_ts_1.sampleHeight)(hm, lastBodyPos.x, lastBodyPos.z), z: lastBodyPos.z, vx: 0, vz: 0, alt: 0 };
        const crouch = crouchHeld();
        const bob = Math.sin(bobT) * 0.035 * bobAmp;
        // the eye follows the drawn body through a short low-pass (fpSmooth): the snapshot quantises x / z to 0.1 m, so at
        // 9 m/s the body steps 0.40 / 0.50 m on alternate ticks, a ±5 cm judder of the whole view at 10 Hz
        const sx = fpSmooth ? fpSmooth.x : p.x, sz = fpSmooth ? fpSmooth.z : p.z;
        void crouch; // C8 (ruling 42): the eye height follows the stance (stanceFrame), prone at 0.38 m
        const e = [sx, p.simY - (0, terrain_gen_ts_1.sampleHeight)(hm, p.x, p.z) + (0, terrain_gen_ts_1.sampleHeight)(hm, sx, sz) + eyeH + bob * (stanceNow === "PRONE" ? 0.3 : 1), sz];
        const tw = c9TowerEye();
        if (tw) {
            e[0] = tw[0];
            e[1] = tw[1];
            e[2] = tw[2];
        } // C9: manning a tower: the view from its turret
        return { eye: e, target: [e[0] + dir[0] * 50, e[1] + dir[1] * 50, e[2] + dir[2] * 50] };
    }
    // B1: in a bunker the view is the firing position of the pilot's mount: just behind its gun, turning with the aim
    if (bodyRender && me && seated() && isBunker(bodyRender.type)) {
        const b = bodyRender, k = (b.type * data_ts_1.MAX_MOUNTS + Math.max(0, me.seat)) * 3, f = cd.tMuzzle[k], u = cd.tMuzzle[k + 1], rt = cd.tMuzzle[k + 2];
        const hl = Math.hypot(dir[0], dir[2]) || 1, ax = dir[0] / hl, az = dir[2] / hl, back = f - 3.6;
        const e = [b.x + ax * back - az * rt, b.simY + u + 0.8, b.z + az * back + ax * rt];
        b1Stats.bunkerCam = true;
        return { eye: e, target: [e[0] + dir[0] * 50, e[1] + dir[1] * 50, e[2] + dir[2] * 50] };
    }
    // C7b item 3: a passenger of a transport (Carrier, Mule) looks out from its seat on the hull (free look all round)
    tpStats.passengerCam = false;
    if (bodyRender && me && seatRoleNow() === data_ts_2.SEAT_PASSENGER && (TP_RULES.carrier(bodyRender.type) || TP_RULES.lifter(bodyRender.type)) && !(isFrontline() && cd.tAir[bodyRender.type])) { // Frontline: Mule passengers get the outside chase view
        const b = bodyRender, t = b.type, k = t * data_ts_1.MAX_SEATS + me.seat, hx = Math.cos(b.yaw), hz = Math.sin(b.yaw);
        const zoned = CREW.szRad[k] > 0;
        const F = zoned ? CREW.szF[k] : 0, U = zoned ? CREW.szU[k] : cd.tRadius[t] * 0.6, Rt = zoned ? CREW.szR[k] : 0;
        const e = [b.x + hx * F - hz * Rt, b.simY + cd.tRadius[t] + U + 1.1, b.z + hz * F + hx * Rt];
        e[1] = Math.max(e[1], (0, terrain_gen_ts_1.sampleHeight)(hm, e[0], e[2]) + 1.6);
        tpStats.passengerCam = true;
        return { eye: e, target: [e[0] + dir[0] * 50, e[1] + dir[1] * 50, e[2] + dir[2] * 50] };
    }
    // in a vehicle: the chase view, distance by the vehicle's size
    const p = bodyRender ?? { x: lastBodyPos.x, y: (0, terrain_gen_ts_1.sampleHeight)(hm, lastBodyPos.x, lastBodyPos.z), z: lastBodyPos.z, type: 0 };
    const r = bodyRender ? cd.tRadius[bodyRender.type] : 2.5;
    const back = 6 + r * 2.4, up = bodyRender && cd.tWalk[bodyRender.type] === 1 ? Math.max(2.4 + r * 1.1, MESH.get(kindOfType[bodyRender.type]).height + 1.2) : 2.4 + r * 1.1; // W2: over the raised walker's roof
    const e = [p.x - dir[0] * back, p.y + up - dir[1] * back, p.z - dir[2] * back];
    e[1] = Math.max(e[1], (0, terrain_gen_ts_1.sampleHeight)(hm, e[0], e[2]) + 1.8);
    // ruling 112: the view follows a softened copy of the hull's lean (seen along the look direction) and its landing settle
    camRollNow = 0;
    if (ownTilt && bodyRender) {
        const dYaw = camYaw - bodyRender.yaw, cs = Math.cos(dYaw), sn = Math.sin(dYaw);
        camRollNow = CAM_TILT * (ownTilt.roll * cs + ownTilt.pitch * sn);
        const camP = CAM_TILT * (ownTilt.pitch * cs - ownTilt.roll * sn);
        return { eye: e, target: [e[0] + dir[0] * 50, e[1] + dir[1] * 50 + Math.tan(camP) * 50, e[2] + dir[2] * 50] };
    }
    return { eye: e, target: [e[0] + dir[0] * 50, e[1] + dir[1] * 50, e[2] + dir[2] * 50] };
}
/**
 * Ruling 112: the long rifle's THERMAL scope. The world is drawn cold (CSS filter on the view while scoped) and this
 * overlay paints the heat: pilots on foot and infantry as bright white-hot dots, vehicle hulls as a dull glow with each
 * occupied crew zone (the sim's seat zones) a hot dot; the driver's cockpit is ringed red on an enemy that can be
 * sniped, green on a friend; an enemy with armoured crew zones (units crewArmoured: Bastion, Strider, Carrier, Salvo,
 * Harvester) gets no red cockpit, only a grey ARMOURED mark.
 */
const thermalStats = { raised: 0, pilots: 0, crews: 0, red: 0, green: 0, armoured: 0 };
let thermalCv = null;
function thermalFrame(on) {
    if (!thermalCv)
        thermalCv = document.getElementById("thermal");
    const cv = thermalCv;
    if (!cv)
        return;
    cv.style.display = on ? "block" : "none";
    if (!on)
        return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
    }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cssW, cssH);
    const focal = proj[5] * cssH / 2, myTeam = 0, body = bodyId(); // team 0: the player's side (as the zone pick)
    let np = 0, nc = 0, nr = 0, ng = 0, na = 0;
    const blob = (sx, sy, r, core, mid, a = 1) => {
        const gr = g.createRadialGradient(sx, sy, 0, sx, sy, r);
        gr.addColorStop(0, core);
        gr.addColorStop(0.35, mid);
        gr.addColorStop(1, "rgba(255,80,0,0)");
        g.globalAlpha = a;
        g.fillStyle = gr;
        g.beginPath();
        g.arc(sx, sy, r, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
    };
    g.globalCompositeOperation = "lighter";
    for (const e of rendered) {
        if (e.id === body || cd.tStructure[e.type] === 1)
            continue;
        const dist = Math.hypot(e.x - eye[0], e.cy - eye[1], e.z - eye[2]);
        if (dist > 2200 || dist < 12)
            continue; // beyond the fog, or so close it fills the sight
        const c = toScreen(e.x, e.cy, e.z);
        if (!c || tmp4[2] <= 0)
            continue;
        const pr = (cd.tRadius[e.type] * focal) / tmp4[2];
        if (c[0] < -pr || c[0] > cssW + pr || c[1] < -pr || c[1] > cssH + pr)
            continue;
        if (!crewable(e.type)) { // a pilot on foot or a soldier: a white-hot body
            blob(c[0], c[1], (0, math_ts_1.clamp)(pr * 2.2, 4, 60), "rgba(255,255,240,1)", "rgba(255,190,80,0.75)");
            np++;
            continue;
        }
        blob(c[0], c[1], (0, math_ts_1.clamp)(pr * 1.3, 5, 140), "rgba(255,150,60,0.35)", "rgba(200,80,20,0.18)", 0.9); // the hull's engines, dull
        const friend = e.team === myTeam, armoured = cd.tCrewArmoured[e.type] === 1;
        for (const q of seatZonesOf(e, eye)) {
            if (!q.occ)
                continue;
            const s = toScreen(q.c[0], q.c[1], q.c[2]);
            if (!s || tmp4[2] <= 0)
                continue;
            const zr = Math.max(3, (q.r * focal) / tmp4[2]);
            if (armoured && !friend)
                blob(s[0], s[1], zr * 1.6, "rgba(190,190,190,0.55)", "rgba(120,120,120,0.25)"); // heat through armour: faint
            else
                blob(s[0], s[1], zr * 2, "rgba(255,255,235,1)", "rgba(255,200,90,0.8)");
            nc++;
            if (q.seat !== cd.tDriverSeat[e.type])
                continue;
            g.globalCompositeOperation = "source-over";
            g.lineWidth = 2;
            g.beginPath();
            g.arc(s[0], s[1], zr * 1.9 + 3, 0, Math.PI * 2);
            if (friend) {
                g.strokeStyle = "rgba(60,255,110,0.95)";
                g.stroke();
                ng++;
            }
            else if (!armoured) {
                g.strokeStyle = "rgba(255,40,30,0.95)";
                g.stroke();
                nr++;
            }
            else {
                g.strokeStyle = "rgba(170,170,170,0.6)";
                g.setLineDash([3, 3]);
                g.stroke();
                g.setLineDash([]);
                g.fillStyle = "rgba(200,200,200,0.8)";
                g.font = "10px monospace";
                g.fillText("ARMOURED", s[0] + zr * 2 + 6, s[1] + 3);
                na++;
            }
            g.globalCompositeOperation = "lighter";
        }
    }
    g.globalCompositeOperation = "source-over";
    thermalStats.pilots = np;
    thermalStats.crews = nc;
    thermalStats.red = nr;
    thermalStats.green = ng;
    thermalStats.armoured = na;
}
/** Ruling 112: the chase view takes this fraction of the hull's lean; the roll of the view this frame. */
const CAM_TILT = 0; // designer playtest 15 Nov 21:15: the view wobbled; the hull still leans, the camera stays level
let camRollNow = 0, eyeYSmooth = NaN, boostFov = 0;
/** While the pilot is down: a slow orbit over the battle around where it fell, looking at the nearest fighting. */
let specFocus = null;
function spectatorPose(now) {
    // kill cam: from where the pilot fell, zoom in on what killed it (live position if still on the wire), then the orbit
    killCamFov = 0;
    if (killCam && now - deadSince < KILLCAM_MS) {
        const live = renderedById.get(killCam.id);
        if (live) {
            killCam.x = live.x;
            killCam.z = live.z;
            if (killCam.type < 0)
                killCam.type = live.type;
        }
        const ty = (0, terrain_gen_ts_1.sampleHeight)(hm, killCam.x, killCam.z) + (killCam.type >= 0 ? cd.tRadius[killCam.type] : 2);
        const u = Math.min(1, (now - deadSince) / 700), ease = u * u * (3 - 2 * u);
        const dist = Math.hypot(killCam.x - killCam.from[0], killCam.z - killCam.from[2]);
        killCamFov = (0, math_ts_1.lerp)(62, Math.max(8, Math.min(40, 2 * Math.atan2(14, Math.max(dist, 1)) * 180 / Math.PI)), ease);
        return { eye: killCam.from, target: [killCam.x, ty, killCam.z] };
    }
    let sx = 0, sz = 0, n = 0;
    for (const e of rendered) {
        if (cd.tStructure[e.type] || Math.hypot(e.x - deadAt.x, e.z - deadAt.z) > 450)
            continue;
        sx += e.x;
        sz += e.z;
        n++;
    }
    const fx_ = n ? sx / n : deadAt.x, fz = n ? sz / n : deadAt.z;
    const goal = [fx_, (0, terrain_gen_ts_1.sampleHeight)(hm, fx_, fz) + 4, fz];
    if (!specFocus)
        specFocus = [deadAt.x, goal[1], deadAt.z];
    const k = 0.02;
    specFocus = [(0, math_ts_1.lerp)(specFocus[0], goal[0], k), (0, math_ts_1.lerp)(specFocus[1], goal[1], k), (0, math_ts_1.lerp)(specFocus[2], goal[2], k)];
    const a = camYaw + Math.PI + (now - deadSince) * 0.00006, r = 150;
    const e = [specFocus[0] + Math.cos(a) * r, 0, specFocus[2] + Math.sin(a) * r];
    e[1] = Math.max(specFocus[1] + 70, (0, terrain_gen_ts_1.sampleHeight)(hm, e[0], e[2]) + 20);
    return { eye: e, target: specFocus };
}
const CMD_PITCH = 55 * Math.PI / 180;
function cmdPose() {
    const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, cmd.x, cmd.z);
    const h = Math.cos(CMD_PITCH) * cmd.dist, ex = cmd.x - Math.cos(cmd.rot) * h, ez = cmd.z - Math.sin(cmd.rot) * h;
    return { eye: [ex, RELIEF ? (0, t1_relief_ts_1.cmdEyeY)(gy + Math.sin(CMD_PITCH) * cmd.dist, (0, terrain_gen_ts_1.sampleHeight)(hm, ex, ez)) : gy + Math.sin(CMD_PITCH) * cmd.dist, ez], target: [cmd.x, gy, cmd.z] }; // T1: above the mountains
}
// ------------------------------------------------------------------ aiming
/** Driver hit zone (ruling 11) of a crewed vehicle in sim coordinates: centre and radius (constants.crew.pilotHitZone). */
function zoneOf(e) {
    if (!crewable(e.type))
        return null;
    const z = seatZonesOf(e, null).find((q) => q.seat === cd.tDriverSeat[e.type]);
    return z ? { c: z.c, r: z.r } : null;
}
/**
 * Target zones of every crew seat of a vehicle in sim coordinates: hull frame (forward, up from the hit-sphere centre,
 * right), the seat's occupancy from the snapshot crew mask, and the sim's exposure rule seen from `from` (the arc
 * round the seat's facing, or from above): a covered zone cannot be hit from there.
 */
function seatZonesOf(e, from) {
    const t = e.type, out = [];
    const hx = Math.cos(e.yaw), hz = Math.sin(e.yaw);
    for (let j = 0; j < cd.tSeatCount[t]; j++) {
        const k = t * data_ts_1.MAX_SEATS + j, r = CREW.szRad[k];
        if (!(r > 0))
            continue;
        const F = CREW.szF[k], U = CREW.szU[k], Rt = CREW.szR[k];
        const c = [e.x + hx * F - hz * Rt, e.simY + cd.tRadius[t] + U, e.z + hz * F + hx * Rt];
        let exposed = true;
        if (from) {
            let ux = from[0] - c[0], uy = from[1] - c[1], uz = from[2] - c[2];
            const L = Math.hypot(ux, uy, uz) || 1;
            ux /= L;
            uy /= L;
            uz /= L;
            const hh = Math.hypot(ux, uz);
            const cx = hx * CREW.szArcX[k] - hz * CREW.szArcZ[k], cz = hz * CREW.szArcX[k] + hx * CREW.szArcZ[k];
            const cosA = hh > 1e-9 ? (cx * ux + cz * uz) / hh : 1;
            exposed = cosA >= CREW.szArcCos[k] || uy >= CREW.szAboveSin[k];
        }
        out.push({ seat: j, role: cd.tSeatRole[k], c, r, occ: (e.crew & (1 << j)) !== 0, exposed });
    }
    return out;
}
/** Ray / sphere: distance along the unit ray (o, d) to the sphere's front surface, or -1. */
function raySphere(o, d, c, r) {
    const fx_ = o[0] - c[0], fy = o[1] - c[1], fz = o[2] - c[2];
    const b = fx_ * d[0] + fy * d[1] + fz * d[2], cc = fx_ * fx_ + fy * fy + fz * fz - r * r;
    const disc = b * b - cc;
    if (disc < 0)
        return -1;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : -b + Math.sqrt(disc) > 0 ? 0 : -1;
}
/** First person: aim assist toward the enemy nearest the reticle, else convergence on the reticle point (aim.ts). */
let aimPoint = [0, 0, 0];
let aimPick = null, aimFloored = false;
let playerAimYaw = 0;
let zoneTarget = null;
function viewDir() { const cp = Math.cos(camPitch); return [Math.cos(camYaw) * cp, Math.sin(camPitch), Math.sin(camYaw) * cp]; }
function updateAim(rt) {
    const d = viewDir();
    aimPick = null;
    aimFloored = false;
    zoneTarget = null;
    if (!bodyRender || gunSeated())
        return { yaw: camYaw, pitch: camPitch }; // C1 ruling 125: the gun's muzzle sits on the view ray
    const lat = Math.max(0, (lastTick + 1.5 - rt) * dt); // the shot leaves when the sim applies this input (next tick), while the picture is ~1 tick behind
    if (onFoot()) {
        const b = bodyRender;
        if (kit >= 2)
            return { yaw: camYaw, pitch: camPitch };
        // ruling 109: the sim fires from the mount's data muzzle (weaponMuzzle: forward / up / right of the body, turned to
        // the aim yaw), so the aim sent is the direction from THAT point to the point under the reticle (no parallax)
        const mk = (PILOT_TYPE * data_ts_1.MAX_MOUNTS + (kit === 1 ? 1 : 0)) * 3, mf = cd.tMuzzle[mk], mu = cd.tMuzzle[mk + 1], mr = cd.tMuzzle[mk + 2];
        const toward = (P) => {
            let yaw = Math.atan2(P[2] - b.z, P[0] - b.x), mx = b.x, mz = b.z;
            const my = b.simY + mu;
            for (let i = 0; i < 4; i++) {
                const hx = Math.cos(yaw), hz = Math.sin(yaw);
                mx = b.x + hx * mf - hz * mr;
                mz = b.z + hz * mf + hx * mr;
                yaw = Math.atan2(P[2] - mz, P[0] - mx);
            }
            return { yaw, pitch: Math.atan2(P[1] - my, Math.hypot(P[0] - mx, P[2] - mz)) };
        };
        const w = kit === 1 ? (heavyNow() >= 0 ? heavyNow() : W_RIFLE) : W_CARBINE, range = cd.wRange[w];
        const foes = [];
        for (const e of rendered)
            if (e.team !== 0 && e.id !== b.id)
                foes.push({ id: e.id, x: e.x + e.vx * lat, y: e.cy, z: e.z + e.vz * lat, vx: e.vx, vz: e.vz, radius: cd.tRadius[e.type] });
        // the long rifle: the driver zone under the reticle (ruling 11). A vehicle with a driver aboard, the zone ray-tested.
        if (kit === 1 && heavyNow() < 0) {
            let best = null;
            for (const e of rendered) {
                if (e.team === 0 || !crewable(e.type) || e.crew === 0)
                    continue;
                const zs = seatZonesOf(e, eye).filter((q) => q.occ);
                if (!zs.length)
                    continue;
                for (const q of zs)
                    q.c = [q.c[0] + e.vx * lat, q.c[1], q.c[2] + e.vz * lat];
                const cx = e.x + e.vx * lat, cz = e.z + e.vz * lat, vx = cx - eye[0], vy = e.cy - eye[1], vz = cz - eye[2], dist = Math.hypot(vx, vy, vz);
                if (dist > range * 1.05)
                    continue;
                const ang = Math.acos((0, math_ts_1.clamp)((vx * d[0] + vy * d[1] + vz * d[2]) / dist, -1, 1)) * 180 / Math.PI;
                const hull = (Math.atan2(cd.tRadius[e.type] * 1.6, dist) * 180) / Math.PI;
                if (ang > Math.max(hull, 1.5))
                    continue;
                if (best && dist >= best.dist)
                    continue;
                // the exposed occupied zone the reticle ray enters first (the sim takes the zone nearest along the shot)
                let hitZ = null, hitT = Infinity;
                for (const q of zs) {
                    if (!q.exposed)
                        continue;
                    const tt = raySphere(eye, d, q.c, q.r);
                    if (tt >= 0 && tt < hitT) {
                        hitT = tt;
                        hitZ = q;
                    }
                }
                const near = hitZ ?? zs.reduce((a, b) => (Math.hypot(a.c[0] - eye[0], a.c[1] - eye[1], a.c[2] - eye[2]) <= Math.hypot(b.c[0] - eye[0], b.c[1] - eye[1], b.c[2] - eye[2]) ? a : b));
                best = { id: e.id, inside: !!hitZ, c: near.c, r: near.r, dist, seat: hitZ ? hitZ.seat : -1, zones: zs };
            }
            zoneTarget = best;
        }
        // aim assist on foot: a smaller cone than in a vehicle, none while scoped
        if (!scoped) {
            const pick = (0, aim_ts_1.pickAssistTarget)(eye, d, foes, range * 1.05, aim_ts_1.FOOT_ASSIST_BASE_DEG, aim_ts_1.FOOT_ASSIST_MAX_DEG, 3);
            if (pick) {
                const e = renderedById.get(pick.id);
                const p = [e.x + e.vx * lat, e.cy, e.z + e.vz * lat];
                aimPick = pick;
                aimPoint = p;
                return toward(p);
            }
        }
        // no assist: the point under the reticle (the zone, a unit, the ground), aimed at from the muzzle
        let hit = render_ts_1.Renderer.rayTerrain(hm, eye, d, range);
        const zt = zoneTarget;
        if (zt && zt.inside) {
            // the reticle is on the driver zone: aim from the muzzle at the point of the reticle ray nearest the zone centre
            const t = (zt.c[0] - eye[0]) * d[0] + (zt.c[1] - eye[1]) * d[1] + (zt.c[2] - eye[2]) * d[2];
            const P = [eye[0] + d[0] * t, eye[1] + d[1] * t, eye[2] + d[2] * t];
            aimPoint = P;
            return toward(P);
        }
        for (const e of rendered) {
            if (e.id === b.id)
                continue;
            const t = raySphere(eye, d, [e.x + e.vx * lat, e.cy, e.z + e.vz * lat], cd.tRadius[e.type]);
            if (t > 0.5 && (hit < 0 || t < hit))
                hit = t;
        }
        const dist = hit > 0 ? hit : range;
        const P = [eye[0] + d[0] * dist, eye[1] + d[1] * dist, eye[2] + d[2] * dist];
        aimPoint = P;
        return toward(P);
    }
    // in a vehicle (driver or gunner): the station's primary weapon from the vehicle's hit-sphere centre (slice 2 rules)
    const w = station.weapon[0] >= 0 ? station.weapon[0] : station.weapon[1];
    if (w < 0)
        return { yaw: camYaw, pitch: 0 };
    const range = cd.wRange[w], speed = cd.wSpeed[w], ballistic = cd.wBallistic[w] === 1;
    // ruling 109: aimed from the station's first mount of that weapon at its data muzzle (as the sim's setMuzzle: turned
    // to the aim yaw, or with the hull for a hull-fixed mount), so the round goes to the point under the reticle
    const bt = bodyRender.type, br = bodyRender;
    let mi = -1;
    for (let k = 0; k < cd.tMountCount[bt]; k++)
        if (cd.tMounts[bt * data_ts_1.MAX_MOUNTS + k] === w) {
            mi = k;
            break;
        }
    const mountAt = (yaw) => {
        if (mi < 0)
            return [br.x, br.cy, br.z];
        const k = (bt * data_ts_1.MAX_MOUNTS + mi) * 3, f = cd.tMuzzle[k], u = cd.tMuzzle[k + 1], r = cd.tMuzzle[k + 2];
        const hy = cd.tMountFixed[bt * data_ts_1.MAX_MOUNTS + mi] === 1 ? br.yaw : yaw, hx = Math.cos(hy), hz = Math.sin(hy);
        return [br.x + hx * f - hz * r, br.simY + u, br.z + hz * f + hx * r];
    };
    const toward = (P) => {
        let yaw = camYaw, m2 = mountAt(yaw);
        for (let i = 0; i < 4; i++) {
            yaw = Math.atan2(P[2] - m2[2], P[0] - m2[0]);
            m2 = mountAt(yaw);
        }
        // ruling 131: a shell takes the low arc from the muzzle to the point (the straight line fell far short)
        return { yaw, pitch: ballistic ? (0, aim_ts_1.arcPitch)(m2, P, speed, cd.gravity) : Math.atan2(P[1] - m2[1], Math.hypot(P[0] - m2[0], P[2] - m2[2])) };
    };
    const m = mountAt(camYaw);
    const cands = [];
    for (const e of rendered)
        if (e.team !== 0 && e.id !== bodyRender.id)
            cands.push({ id: e.id, x: e.x, y: e.cy, z: e.z, vx: e.vx, vz: e.vz, radius: cd.tRadius[e.type] });
    const pick = (0, aim_ts_1.pickAssistTarget)(eye, d, cands, range * 1.15);
    if (pick) {
        const e = renderedById.get(pick.id);
        const p = [e.x + e.vx * lat, e.cy, e.z + e.vz * lat];
        const sol = (0, aim_ts_1.leadAim)(m, p, e.vx, e.vz, speed, ballistic, cd.gravity);
        if (sol) {
            aimPick = pick;
            aimPoint = sol.point;
            return { yaw: sol.yaw, pitch: sol.pitch };
        }
    }
    let hit = render_ts_1.Renderer.rayTerrain(hm, eye, d, ballistic ? Math.max(1200, range) : 1200);
    // a unit under the reticle that is not an assist target (a friendly, or beyond the cone rules) still stops the ray
    for (const e of rendered) {
        if (e.id === bodyRender.id)
            continue;
        const t = raySphere(eye, d, [e.x, e.cy, e.z], cd.tRadius[e.type] + 1);
        if (t > 14 && (hit < 0 || t < hit))
            hit = t;
    }
    const cv = (0, aim_ts_1.convergeAim)(m, eye, d, hit, ballistic ? Math.max(1200, range) : 1200, range, (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), ballistic ? { speed, gravity: cd.gravity } : undefined);
    aimPoint = cv.point;
    aimFloored = cv.floored;
    if (!cv.floored)
        return toward(cv.point);
    return { yaw: cv.yaw, pitch: cv.pitch };
}
/** The torch target: the nearest damaged friendly vehicle or structure within the torch range of the pilot (the sim's rule, from the snapshot). */
function torchTarget() {
    if (!bodyRender || !onFoot())
        return null;
    let best = null, bg = Infinity;
    for (const e of rendered) {
        if (e.team !== 0 || e.id === bodyRender.id || e.critical || e.hp >= 1 || (!cd.tStructure[e.type] && !cd.tVehicle[e.type]))
            continue;
        if (cd.tStructure[e.type] && zonesNow.some((z) => z.kind === "sentry" && Math.hypot(z.x - e.x, z.z - e.z) < 4))
            continue; // C11 (ruling 78): call-in sentries cannot be repaired
        const gap = Math.hypot(e.x - bodyRender.x, e.z - bodyRender.z) - cd.tRadius[e.type] - PILOT_R;
        if (gap <= CREW.torchRange + 0.3 && gap < bg) {
            bg = gap;
            best = e;
        }
    }
    return best;
}
function sendControl(rt, now) {
    if (mode !== "fp" || !started || !me || me.state === sim_ts_1.P_DEAD || me.state === c6_ts_1.PILOT_DOWNED || pauseOn || matchLocked())
        return;
    const a = updateAim(rt);
    if (!Number.isFinite(a.yaw) || !Number.isFinite(a.pitch))
        return; // never hand the sim a non-finite aim (it throws)
    playerAimYaw = a.yaw;
    let fwd = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    let str = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const panel = panelOpen() || !!armedCall || !!placing; // B2: no shot, cloak or interact while placing
    if (callMenu.open) { // C5 (designer ruling): the arrow keys type the call code; W A S D keep moving the pilot
        fwd = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
        str = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    }
    let input;
    if (gunSeated())
        input = { move: 0, strafe: 0, aimYaw: a.yaw, aimPitch: a.pitch, fire: panel ? 0 : (lmb ? 1 : 0) | (rmb ? 2 : 0) }; // C1 ruling 125: the sentry follows the mouse; ruling 130: RMB the rocket salvo
    else if (onFoot()) {
        const held = spaceDown > 0 ? now - spaceDown : 0;
        // Space: a tap on the ground jumps; held 0.2 s (or pressed in the air) the jetpack burns
        const jump = spaceDown > 0 && spaceOnGround && held < 150;
        const jet = spaceDown > 0 && (!spaceOnGround || held >= 200);
        const trig = lmb && !lmbThrow && !armedCall; // a call-down in hand (or the click that threw it): the gun is holstered
        const fire = (!panel && trig && kit < 2 ? (kit === 0 ? 1 : 2) : 0) | (now < flGrenadeUntil ? 4 : 0) | (!panel && trig && kit === 2 && isFrontline() ? 8 : 0); // Frontline: G grenade, 3 the slot 3 weapon
        const manning = c9Manning(); // C9: a pilot manning a tower stays beside it
        input = { move: manning ? 0 : fwd, strafe: manning ? 0 : str, aimYaw: a.yaw, aimPitch: a.pitch, sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"), crouch: crouchHeld(), prone: proneOn, jump, jet, fire, tool: !panel && lmb && kit === 2 && !isFrontline() ? 1 : 0, gunnerWeapon: false, interact: !panel && keys.has("KeyE"), cloak: !panel && keys.has(c6_ts_1.CLOAK_KEY) && (!isFrontline() || (!flRSwapped && performance.now() - flRDown > 300)) }; // Frontline: tap R swaps a laser cell, hold R cloaks
    }
    else {
        const e = ent(me.entity);
        const driver = !!e && me.seat === cd.tDriverSeat[e.type];
        const role = e ? cd.tSeatRole[e.type * data_ts_1.MAX_SEATS + me.seat] : 2;
        // CONTRACTS rev 4: fire bit 0 only; the gunnerWeapon flag (always sent) picks the driver's own weapon or the empty
        // gunner seats' weapons (T), never both. The slice-3 RMB "both at once" default is gone.
        // ruling 33: a passenger fires its own carbine from the seat (bit 0); a rider's second hull weapon is RMB (bit 1)
        const fire = panel ? 0 : ((driver || role === data_ts_1.SEAT_GUNNER || station.weapon[0] >= 0) && lmb && !lmbThrow && !armedCall ? 1 : 0) | (driver && station.secondary && rmb ? 2 : 0) | (driver && !!e && isFrontline() && FL_THIRD_TYPES.has(e.type) && keys.has("KeyR") ? 4 : 0); // Frontline: R the mech's arc lance
        if (!driver)
            gunnerMode = false;
        // C6 item 7 (w2c): an aircraft's pilot holds C to land and stay landed
        input = { move: driver ? fwd : 0, strafe: driver ? str : 0, aimYaw: a.yaw, aimPitch: a.pitch, fire, gunnerWeapon: driver && gunnerMode, crouch: driver && !!e && cd.tAir[e.type] === 1 && crouchHeld(), jump: driver && !!e && !panel && (cd.tAir[e.type] === 1 ? keys.has(LOW_FLIGHT_KEY) /* C8: ruling 41, the sim toggles on the press */ : cd.tJump[e.type] > 0 && keys.has(HOP_KEY) /* ruling 112: hover hop */), cloak: driver && !!e && isBike(e.type) && !panel && keys.has(c6_ts_1.CLOAK_KEY), sprint: driver && !!e && cd.tBoostMul[e.type] > 0 && !panel && (keys.has("ShiftLeft") || keys.has("ShiftRight")) }; // C7b item 4: bike cloak; ruling 108: Shift boosts a Dart Scout
    }
    const key = JSON.stringify([input.move, input.strafe, +a.yaw.toFixed(3), +a.pitch.toFixed(3), input.sprint, input.crouch, input.jump, input.jet, input.fire, input.tool, input.gunnerWeapon, input.interact, input.cloak, input.prone]);
    lastInteract = !!input.interact;
    // C7b item 1: predicting, the own pilot steps once per sim tick (pilotMoveStep) and every step goes out with its clientSeq
    if (predictOn && !onFoot() && ridePred?.state && input.move !== undefined) { // ruling 112: the driven hover vehicle, one step per sim tick
        predAcc += Math.min(250, Math.max(0, now - predLast));
        predLast = now;
        for (let n = 0; predAcc >= tickMs && n < 4; n++) {
            predAcc -= tickMs;
            const seq = ridePred.step({ move: input.move, strafe: input.strafe, aimYaw: input.aimYaw, sprint: !!input.sprint, jump: !!input.jump }, now);
            if (seq !== null) {
                if (predictor)
                    predictor.seq = Math.max(predictor.seq, seq);
                lastCtl = key;
                send({ t: "pctl", input: { ...input, clientSeq: seq } });
            }
        }
        if (predAcc > tickMs * 4)
            predAcc = 0;
        return;
    }
    if (predictOn && onFoot() && predictor?.state) {
        predAcc += Math.min(250, Math.max(0, now - predLast));
        predLast = now;
        for (let n = 0; predAcc >= tickMs && n < 4; n++) {
            predAcc -= tickMs;
            const seq = predictor.step({ move: input.move, strafe: input.strafe, aimYaw: input.aimYaw, sprint: input.sprint, crouch: input.crouch, jump: input.jump, jet: input.jet, prone: stanceNow !== "STANDING" && stanceNow !== "CROUCHED" }, now); // C8: crawl while prone or changing
            if (seq !== null) {
                lastCtl = key;
                send({ t: "pctl", input: { ...input, clientSeq: seq } });
            }
        }
        if (predAcc > tickMs * 4)
            predAcc = 0;
        return;
    }
    predLast = now;
    // H1 (ruling 73 reading): on foot, an unchanged input is re-sent every CTL_KEEPALIVE_MS so the sim knows the player is
    // present (standing still is not idle); only a stalled stream (a leaver, a lost connection) drops the pilot prone
    if (key !== lastCtl || (onFoot() && now - lastCtlSent > CTL_KEEPALIVE_MS)) {
        lastCtl = key;
        lastCtlSent = now;
        send({ t: "pctl", input });
    }
}
const CTL_KEEPALIVE_MS = 2000;
let lastCtlSent = 0;
let lastInteract = false;
function updateCommandCamera(frameDt) {
    if (mode !== "cmd")
        return;
    const sp = cmd.dist * 1.1 * frameDt;
    const fx_ = Math.cos(cmd.rot), fz = Math.sin(cmd.rot);
    let mx = 0, mz = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
        mx += fx_;
        mz += fz;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
        mx -= fx_;
        mz -= fz;
    }
    if (keys.has("KeyD") || keys.has("ArrowRight")) {
        mx += -fz;
        mz += fx_;
    }
    if (keys.has("KeyA") || keys.has("ArrowLeft")) {
        mx -= -fz;
        mz -= fx_;
    }
    if (mouseIn && !drag && !midDrag && started && !overPanel()) {
        const edge = 10;
        if (mouseX < edge) {
            mx -= -fz;
            mz -= fx_;
        }
        else if (mouseX > cssW - edge) {
            mx += -fz;
            mz += fx_;
        }
        if (mouseY < edge) {
            mx += fx_;
            mz += fz;
        }
        else if (mouseY > cssH - edge) {
            mx -= fx_;
            mz -= fz;
        }
    }
    cmd.x = (0, math_ts_1.clamp)(cmd.x + mx * sp, 0, MAP_SIZE);
    cmd.z = (0, math_ts_1.clamp)(cmd.z + mz * sp, 0, MAP_SIZE);
}
const overPanel = () => { const el = document.elementFromPoint(mouseX, mouseY); return !!el && !!el.closest?.("#prod, #selInfo, #orderBar, #loadoutPanel, #callBar"); };
// ------------------------------------------------------------------ HUD
const mm = $("minimap");
// designer playtest 16 Nov 13:03: in the command view, click (or drag) on the minimap to move the camera there
{
    let mmDrag = false;
    const mmGo = (ev) => {
        const r = mm.getBoundingClientRect(), u = (ev.clientX - r.left) / r.width, v = (ev.clientY - r.top) / r.height;
        cmd.x = Math.max(0, Math.min(MAP_SIZE, u * MAP_SIZE));
        cmd.z = Math.max(0, Math.min(MAP_SIZE, v * MAP_SIZE));
    };
    mm.addEventListener("mousedown", (ev) => { if (mode !== "cmd" || ev.button !== 0)
        return; ev.preventDefault(); ev.stopPropagation(); mmDrag = true; mmGo(ev); });
    window.addEventListener("mousemove", (ev) => { if (mmDrag) {
        if (mode !== "cmd" || (ev.buttons & 1) === 0)
            mmDrag = false;
        else
            mmGo(ev);
    } });
    window.addEventListener("mouseup", () => { mmDrag = false; });
    mm.addEventListener("contextmenu", (ev) => ev.preventDefault());
}
const mmx = mm.getContext("2d");
let lastMinimap = 0;
const css = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(",")})`;
/** H1 minimap: a baked terrain base (height bands, contours), resource fields in the command view's colours (ore amber,
 *  gas green), strategic points, structures (production buildings with a notch, the Core larger), units as bigger
 *  outlined marks (dense groups merge into one counted mark), squadmates as green diamonds, the player's arrow and view cone. */
const MM_DPR = Math.min(2, Math.max(1, globalThis.devicePixelRatio ?? 1));
mm.width = mm.height = Math.round(minimap_ts_1.MM_SIZE * MM_DPR);
let mmTerrain = null;
const mmStats = { singles: 0, clusters: 0, structures: 0, fields: 0 };
function mmTerrainCanvas(tac) {
    if (mmTerrain && mmTerrain.tac === tac)
        return mmTerrain.canvas;
    const c = document.createElement("canvas"), res = 256;
    c.width = c.height = res;
    const img = (0, minimap_ts_1.bakeTerrain)(hm, MAP_SIZE, res, tac, RELIEF !== null); // T1: relief shading, steep ground dark
    c.getContext("2d")?.putImageData(img, 0, 0);
    mmTerrain = { canvas: c, tac };
    return c;
}
function drawMinimap() {
    const S = minimap_ts_1.MM_SIZE, k = S / MAP_SIZE, g = mmx;
    g.setTransform(MM_DPR, 0, 0, MM_DPR, 0, 0);
    g.clearRect(0, 0, S, S);
    const tac = wire > 0.5; // tactical display: the minimap goes dark with it
    g.imageSmoothingEnabled = true;
    g.drawImage(mmTerrainCanvas(tac), 0, 0, S, S);
    g.lineJoin = "round";
    g.lineCap = "round";
    const O = minimap_ts_1.MM_COL.outline;
    // Frontline: the three lanes, pale bands under everything else
    const lanesDef = (0, battles_ts_1.battleOf)(config.battle).scenario.lanes;
    if (lanesDef && (0, scenario_ts_1.isSkirmish)(config.scenario, config.units)) {
        g.strokeStyle = tac ? "rgba(120,220,235,0.22)" : "rgba(235,225,190,0.32)";
        g.lineWidth = 5;
        for (const L of lanesDef.paths) {
            g.beginPath();
            L.points.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k)));
            g.stroke();
        }
    }
    // resource fields: ore a cluster of amber diamonds, gas a green vent ring (as in the command view)
    mmStats.fields = 0;
    for (const d of depModels) {
        const x = d.x * k, y = d.z * k, s = Math.max(4, Math.min(6, d.radius * k * 0.9));
        g.fillStyle = d.exhausted ? minimap_ts_1.MM_COL.spent : minimap_ts_1.MM_COL.ore;
        g.strokeStyle = O;
        g.lineWidth = 1.2;
        for (const [dx, dy] of [[0, -0.7], [-0.9, 0.5], [0.9, 0.5]]) {
            const cx = x + dx * s, cy = y + dy * s;
            g.beginPath();
            g.moveTo(cx, cy - s * 0.75);
            g.lineTo(cx + s * 0.5, cy);
            g.lineTo(cx, cy + s * 0.75);
            g.lineTo(cx - s * 0.5, cy);
            g.closePath();
            g.fill();
            g.stroke();
        }
        mmStats.fields++;
    }
    for (const gy of scenMap?.geysers ?? []) {
        const x = gy.x * k, y = gy.z * k;
        g.lineWidth = 3.6;
        g.strokeStyle = O;
        g.beginPath();
        g.arc(x, y, 4.2, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 2;
        g.strokeStyle = minimap_ts_1.MM_COL.gas;
        g.beginPath();
        g.arc(x, y, 4.2, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = minimap_ts_1.MM_COL.gas;
        g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
        mmStats.fields++;
    }
    // strategic points: rings in the owner colour; unknown "?" grey; last seen dashed and faint (C11, ruling 87)
    for (const m of ptModels) {
        const s = ptStatics[m.index], x = s.x * k, y = s.z * k, r = Math.max(5, s.ring * k);
        g.globalAlpha = m.unknown ? 0.6 : m.stale ? 0.65 : 1;
        g.lineWidth = 3.4;
        g.strokeStyle = O;
        g.setLineDash([]);
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 1.8;
        g.strokeStyle = m.unknown ? "#c4cbc4" : m.colour;
        g.setLineDash(m.unknown || m.stale ? [3, 3] : []);
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
        if (m.unknown) {
            g.fillStyle = "#c4cbc4";
            g.font = "bold 10px monospace";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText("?", x, y + 0.5);
        }
        g.globalAlpha = 1;
    }
    const myBody = bodyId();
    const v = views[views.length - 1];
    const mates = new Set();
    for (const p of v?.players.values() ?? [])
        if (p.entity && p.entity !== myBody)
            mates.add(p.entity);
    const colOf = (e) => (crewable(e.type) && e.crew === 0 ? minimap_ts_1.MM_COL.empty : e.team === 0 ? (familyOfType[e.type] === "pilot" ? minimap_ts_1.MM_COL.ownPilot : minimap_ts_1.MM_COL.own) : minimap_ts_1.MM_COL.enemy); // C11: own reserve pilots on foot stand out
    // structures first (under the units): a square with a dark rim; production buildings with a light notch; the Core larger
    mmStats.structures = 0;
    const units = [], marks = [];
    for (const e of rendered) {
        if (e.id === myBody)
            continue;
        if (!cd.tStructure[e.type]) {
            if (!mates.has(e.id)) {
                units.push(e);
                marks.push({ x: e.x * k, y: e.z * k, key: colOf(e) });
            }
            continue;
        }
        if (e.type === T_FB_TURRET || e.type === T_FB_WALL) { // ruling 132: a forward base's own defences: small diamonds (turrets) and a short wall stroke
            const x = e.x * k, y = e.z * k;
            g.fillStyle = colOf(e);
            g.strokeStyle = O;
            g.lineWidth = 1.2;
            if (e.type === T_FB_WALL) {
                const tx = -Math.sin(e.yaw) * 3, ty = Math.cos(e.yaw) * 3;
                g.lineWidth = 3.4;
                g.beginPath();
                g.moveTo(x - tx, y - ty);
                g.lineTo(x + tx, y + ty);
                g.stroke();
                g.strokeStyle = colOf(e);
                g.lineWidth = 1.6;
                g.stroke();
            }
            else {
                g.beginPath();
                g.moveTo(x, y - 2.6);
                g.lineTo(x + 2.6, y);
                g.lineTo(x, y + 2.6);
                g.lineTo(x - 2.6, y);
                g.closePath();
                g.fill();
                g.stroke();
            }
            fb1Stats.minimap++;
            continue;
        }
        const fam = familyOfType[e.type], x = e.x * k, y = e.z * k, h = fam === "core" ? 5.5 : fam === "production" ? 4.2 : 3.2;
        g.fillStyle = colOf(e);
        g.strokeStyle = O;
        g.lineWidth = 1.5;
        g.fillRect(x - h, y - h, 2 * h, 2 * h);
        g.strokeRect(x - h, y - h, 2 * h, 2 * h);
        if (fam === "production" || fam === "core") {
            g.fillStyle = O;
            const q = fam === "core" ? 2.6 : 1.8;
            g.fillRect(x - q, y - q, 2 * q, 2 * q);
        }
        if (fam === "core") {
            g.strokeStyle = colOf(e);
            g.lineWidth = 1;
            g.strokeRect(x - h - 2.5, y - h - 2.5, 2 * h + 5, 2 * h + 5);
        }
        mmStats.structures++;
    }
    // units: dense groups of one side become one counted mark; the rest are outlined arrowheads (vehicles), hollow
    // triangles (aircraft) and dots (soldiers, pilots)
    const cl = (0, minimap_ts_1.clusterMarks)(marks);
    mmStats.singles = cl.singles.length;
    mmStats.clusters = cl.clusters.length;
    for (const i of cl.singles) {
        const e = units[i], x = marks[i].x, y = marks[i].y, col = marks[i].key, fam = familyOfType[e.type];
        g.fillStyle = col;
        g.strokeStyle = O;
        g.lineWidth = 1.4;
        if (fam === "infantry" || fam === "pilot") {
            g.beginPath();
            g.arc(x, y, fam === "pilot" ? 2.4 : 2, 0, Math.PI * 2);
            g.fill();
            g.stroke();
            continue;
        }
        const a = e.yaw, air = !!cd.tAir[e.type], r = air ? 5.6 : 4.8;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        g.lineTo(x + Math.cos(a + 2.45) * r, y + Math.sin(a + 2.45) * r);
        g.lineTo(x + Math.cos(a + Math.PI) * r * 0.35, y + Math.sin(a + Math.PI) * r * 0.35);
        g.lineTo(x + Math.cos(a - 2.45) * r, y + Math.sin(a - 2.45) * r);
        g.closePath();
        if (air) {
            g.lineWidth = 3.2;
            g.stroke();
            g.strokeStyle = col;
            g.lineWidth = 1.6;
            g.stroke();
        }
        else {
            g.fill();
            g.stroke();
        }
    }
    g.font = "bold 9px ui-monospace, Menlo, Consolas, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const c of cl.clusters) {
        const r = Math.min(9, 4.5 + Math.sqrt(c.n));
        g.fillStyle = c.key;
        g.strokeStyle = O;
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(c.x, c.y, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = O;
        g.fillText(String(c.n), c.x, c.y + 0.5);
    }
    // squadmates (other players): green diamonds, larger
    for (const id of mates) {
        const e = renderedById.get(id);
        if (!e)
            continue;
        const x = e.x * k, y = e.z * k;
        g.fillStyle = minimap_ts_1.MM_COL.ally;
        g.strokeStyle = O;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x, y - 5.5);
        g.lineTo(x + 4.5, y);
        g.lineTo(x, y + 5.5);
        g.lineTo(x - 4.5, y);
        g.closePath();
        g.fill();
        g.stroke();
    }
    // rally points of the team's queues
    if (v)
        for (const q of v.queues.values())
            if (q.rally) {
                const x = q.rally[0] * k, y = q.rally[1] * k;
                for (const [w, c] of [[3.4, O], [1.6, minimap_ts_1.MM_COL.rally]]) {
                    g.strokeStyle = c;
                    g.lineWidth = w;
                    g.beginPath();
                    g.moveTo(x - 3.5, y - 3.5);
                    g.lineTo(x + 3.5, y + 3.5);
                    g.moveTo(x + 3.5, y - 3.5);
                    g.lineTo(x - 3.5, y + 3.5);
                    g.stroke();
                }
            }
    // the called ride: a dashed line from it to the player
    const rv = ride ? renderedById.get(ride.vehicle) : undefined;
    if (rv && bodyRender) {
        g.strokeStyle = minimap_ts_1.MM_COL.rally;
        g.setLineDash([3, 3]);
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(rv.x * k, rv.z * k);
        g.lineTo(bodyRender.x * k, bodyRender.z * k);
        g.stroke();
        g.setLineDash([]);
        g.strokeRect(rv.x * k - 5, rv.z * k - 5, 10, 10);
    }
    // camera: the ground footprint (command view) or the view cone (first person)
    if (mode === "cmd") {
        const pts = [[0, 0], [cssW, 0], [cssW, cssH], [0, cssH]].map(([sx, sy]) => groundAt(sx, sy)).filter((p) => !!p);
        if (pts.length >= 3) {
            g.strokeStyle = "rgba(255,255,255,0.9)";
            g.lineWidth = 1.4;
            g.beginPath();
            pts.forEach((p, i) => (i ? g.lineTo(p[0] * k, p[2] * k) : g.moveTo(p[0] * k, p[2] * k)));
            g.closePath();
            g.stroke();
        }
    }
    else {
        const cx = (bodyRender?.x ?? eye[0]) * k, cy = (bodyRender?.z ?? eye[2]) * k, L = 34, half = Math.atan(Math.tan(((fovDeg * Math.PI) / 180) * 0.5) * Math.max(1, cssW / Math.max(1, cssH)));
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, L);
        grd.addColorStop(0, "rgba(255,255,255,0.38)");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, L, camYaw - half, camYaw + half);
        g.closePath();
        g.fill();
    }
    if (bodyRender) {
        const x = bodyRender.x * k, y = bodyRender.z * k, a = onFoot() ? camYaw : bodyRender.yaw;
        g.fillStyle = minimap_ts_1.MM_COL.you;
        g.strokeStyle = "#000";
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
        g.lineTo(x + Math.cos(a + 2.5) * 6, y + Math.sin(a + 2.5) * 6);
        g.lineTo(x + Math.cos(a + Math.PI) * 2.5, y + Math.sin(a + Math.PI) * 2.5);
        g.lineTo(x + Math.cos(a - 2.5) * 6, y + Math.sin(a - 2.5) * 6);
        g.closePath();
        g.fill();
        g.stroke();
    }
    // a clean frame
    g.strokeStyle = tac ? "rgba(90,200,190,0.55)" : "rgba(220,225,200,0.5)";
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, S - 1, S - 1);
}
/** Icon legend (command view): every family's shape, drawn from the same segment lists as the WebGL icons. */
function drawLegend() {
    const c = $("legendCanvas"), g = c.getContext("2d");
    const rows = icons_ts_1.ICON_SHAPES.length, rh = 23;
    c.width = 190;
    c.height = rows * rh + 4;
    g.clearRect(0, 0, c.width, c.height);
    g.lineWidth = 1.4;
    g.lineCap = "round";
    icons_ts_1.ICON_SHAPES.forEach((s, i) => {
        const y = 12 + i * rh;
        g.strokeStyle = s.family === "you" ? css(render_ts_1.WIRE_TEAM[3]) : css(render_ts_1.WIRE_TEAM[0]);
        if (s.family === "infantry") {
            for (const [dx, dy] of [[-6, -3], [0, 3], [6, -3]])
                (0, icons_ts_1.drawIcon2D)(g, s, 18 + dx, y + dy, 0);
        }
        else
            (0, icons_ts_1.drawIcon2D)(g, s, 18, y, -0.6);
        g.fillStyle = "#b9d7d4";
        g.font = "11px ui-monospace, Menlo, Consolas, monospace";
        g.textBaseline = "middle";
        g.fillText(s.label, 40, y);
    });
}
drawLegend();
// pooled DOM bars over enemies (targeted, or damaged in the last 4 s)
const ebarPool = [];
function ebar(i) {
    while (ebarPool.length <= i) {
        const d = document.createElement("div");
        d.className = "ebar";
        d.innerHTML = `<div class="h"><b></b></div><div class="s"><b></b></div>`;
        $("ebars").appendChild(d);
        ebarPool.push(d);
    }
    return ebarPool[i];
}
// pooled DOM tags over world points (empty vehicles, AI pilots walking home, the ride, fresh units, production over buildings)
const tagPool = [];
let tagN = 0;
// H1: per-tag rank for the on-screen cap (first person), and what the distance rules did this frame
const tagRank = [];
const hudStats = { culled: 0, faded: 0, capped: 0, shown: 0, bars: 0 };
function tag(x, y, z, html, cls) {
    let alpha = 1, scale = 1, prio = 9, dist = 0;
    if (mode === "fp") { // H1: distance culling and fade (hud-range.ts)
        const r = hud_range_ts_1.HUD_RANGES[(0, hud_range_ts_1.hudCat)(cls)];
        dist = Math.hypot(x - eye[0], z - eye[2]);
        const f = (0, hud_range_ts_1.hudFade)(r, dist);
        if (!f) {
            hudStats.culled++;
            return false;
        }
        alpha = f.alpha;
        scale = f.scale;
        prio = r.prio;
    }
    const s = toScreen(x, y, z);
    if (!s || s[0] < -60 || s[0] > cssW + 60 || s[1] < -30 || s[1] > cssH + 30)
        return false;
    while (tagPool.length <= tagN) {
        const d = document.createElement("div");
        $("tags").appendChild(d);
        tagPool.push(d);
    }
    tagRank[tagN] = { prio, dist };
    const d = tagPool[tagN++];
    if (d.dataset.h !== html) {
        d.innerHTML = html;
        d.dataset.h = html;
    }
    d.className = "wtag " + cls;
    d.style.display = "block";
    d.style.left = s[0] + "px";
    d.style.top = s[1] + "px";
    d.style.opacity = alpha < 1 ? alpha.toFixed(2) : "";
    d.style.scale = scale < 1 ? scale.toFixed(2) : "";
    if (alpha < 1)
        hudStats.faded++;
    return true;
}
/** H1: in first person at most HUD_MAX_MARKERS tags stay: objectives and squad first, then the nearest. */
function capTags() {
    if (mode !== "fp")
        return;
    const over = (0, hud_range_ts_1.hudOverCap)(tagRank.slice(0, tagN), hud_range_ts_1.HUD_MAX_MARKERS);
    for (const i of over)
        tagPool[i].style.display = "none";
    hudStats.capped = over.length;
    hudStats.shown = tagN - over.length;
}
const tagStats = { empty: 0, walkers: 0, ride: 0, fresh: 0, prod: 0, zone: 0 };
const zoneRingPool = [];
let zoneRingInfo = [];
function zoneRing(i) {
    while (zoneRingPool.length <= i) {
        const d = document.createElement("div");
        d.className = "zring";
        d.innerHTML = "<span></span><em></em>";
        $("zoneRings").appendChild(d);
        zoneRingPool.push(d);
    }
    return zoneRingPool[i];
}
function updateTags(now) {
    tagN = 0;
    hudStats.culled = 0;
    hudStats.faded = 0;
    hudStats.capped = 0;
    hudStats.shown = 0;
    for (const k of Object.keys(tagStats))
        tagStats[k] = 0;
    if (!started) {
        for (const d of tagPool)
            d.style.display = "none";
        return;
    }
    const myBody = bodyId(), lim = mode === "cmd" ? 2000 : 260;
    // empty vehicles (boardable; an enemy one is a hijack) and vehicles without a driver
    let ne = 0;
    for (const e of rendered) {
        if (!crewable(e.type) || e.id === myBody || ne >= 10)
            continue;
        const dist = Math.hypot(e.x - eye[0], e.z - eye[2]);
        if (dist > lim)
            continue;
        const top = e.cy + cd.tRadius[e.type] + 2;
        if (e.team === 0 && (0, c1_crew_ts_1.pilotEnRoute)(cd, e)) {
            if (tag(e.x, top, e.z, `${(0, c1_crew_ts_1.enRouteTag)(c1EnRouteDist(e.id))}<small>an AI pilot is walking to it</small>`, "nocrew enroute")) {
                ne++;
                c1Stats.tags++;
            }
        } // C1 ruling 124
        else if (e.team === 0 && c11NoCrew(e)) {
            if (tag(e.x, top, e.z, `NO CREW${c11Waiting.has(e.id) ? " · no pilots" : ""}<small>${mode === "cmd" ? `select · ${C11_CREW_KEY} crew · RMB send a pilot` : `F to board · ${c1_crew_ts_1.CREW_KEY} send a pilot`}</small>`, "nocrew")) {
                ne++;
                tagStats.empty++;
                c11Stats.noCrewTags = (c11Stats.noCrewTags ?? 0) + 1;
            }
        } // C11
        else if (e.crew === 0) {
            if (tag(e.x, top, e.z, e.team === 0 ? "EMPTY · F to board" : "EMPTY · F to hijack", e.team === 0 ? "empty" : "empty enemy")) {
                ne++;
                tagStats.empty++;
            }
        }
        else if (e.driverless && e.team !== 0) {
            if (tag(e.x, top, e.z, "NO DRIVER · gunner aboard", "empty enemy"))
                ne++;
        }
    }
    c11PilotTags(); // C11: own reserve pilots on foot (worth rescuing)
    c11AmmoTags(); // C11: aircraft out of ammunition, rearming; the nearest Air Pad
    f2LaserWorld(now); // F2 (ruling 91): Lancer cannons charging (every Lancer in view), hot / venting rapid lasers
    // AI pilots walking home after giving their seat to the player (ruling 19)
    for (const [id, w] of walkers) {
        const e = renderedById.get(id);
        if (!e) {
            if (now - w.since > 3000)
                walkers.delete(id);
            continue;
        }
        if (now - w.since > 30000) {
            walkers.delete(id);
            continue;
        }
        if (tag(e.x, e.simY + 2.6, e.z, `AI PILOT → BASE<small>left the ${w.from}</small>`, "walker"))
            tagStats.walkers++;
    }
    // the ride
    const rv = ride ? renderedById.get(ride.vehicle) : undefined;
    if (ride && !rv && now - ride.since > 3000)
        ride = null;
    if (rv && bodyRender) {
        const d = Math.hypot(rv.x - bodyRender.x, rv.z - bodyRender.z);
        if (tag(rv.x, rv.cy + cd.tRadius[rv.type] + 3, rv.z, `YOUR RIDE · ${Math.round(d)} m`, "ride"))
            tagStats.ride++;
    }
    // freshly produced units
    for (const [id, t] of fresh) {
        const e = renderedById.get(id);
        if (!e || now - t > 8000) {
            if (now - t > 8000)
                fresh.delete(id);
            continue;
        }
        if (tag(e.x, e.cy + cd.tRadius[e.type] + 2.5, e.z, `NEW · ${typeName[e.type]}`, "fresh"))
            tagStats.fresh++;
    }
    // production progress over the team's buildings
    const v = views[views.length - 1];
    if (v)
        for (const q of v.queues.values()) {
            if (!q.items.length)
                continue;
            const b = renderedById.get(q.building);
            if (!b)
                continue;
            const hold = sim_ts_1.HOLD_NAMES[q.hold] ?? "none";
            if (tag(b.x, b.y + 16 * b.scale, b.z, `${typeName[q.items[0]]}${q.items.length > 1 ? ` +${q.items.length - 1}` : ""}<i><b style="width:${(q.progress * 100).toFixed(0)}%"></b></i>${hold !== "none" ? `<small>${HOLD_TEXT[hold]}</small>` : ""}`, "prodtag"))
                tagStats.prod++;
            if (q.rally && mode === "cmd" && q.building === selBuilding)
                tag(q.rally[0], (0, terrain_gen_ts_1.sampleHeight)(hm, q.rally[0], q.rally[1]) + 1, q.rally[1], "RALLY", "rally");
        }
    if (pingMark && now - pingMark.t < 2500)
        tag(pingMark.x, (0, terrain_gen_ts_1.sampleHeight)(hm, pingMark.x, pingMark.z) + 1, pingMark.z, "PING", "rally");
    beaconTagsHtml();
    placementTag(); // B2
    // C4: building sites: own ones always, an enemy one while its structure is on the wire
    siteTags = 0;
    for (const st of visibleSites(v?.construction)) {
        const d = Math.hypot(st.x - eye[0], st.z - eye[2]);
        if (d > lim)
            continue;
        const top = (0, terrain_gen_ts_1.sampleHeight)(hm, st.x, st.z) + (MESH.get(kindOfType[st.t])?.height ?? 8) + 3;
        if (tag(st.x, top, st.z, `${st.own ? "" : "ENEMY · "}${st.label}<i><b style="width:${(st.progress * 100).toFixed(0)}%"></b></i>`, `prodtag site${st.waiting ? " waiting" : ""}`))
            siteTags++;
    }
    strategicTags(now);
    farMarkerTags();
    kitTags(now);
    callTags();
    econTags(now);
    visionTags(now);
    podTags(now); // C7b item 2
    transportTags(); // C7b item 3
    stealthTags(now); // C7b item 4
    groupTags(); // C7b item 5
    groundFrame(now); // C8 (ruling 40): shelled spots
    capTags(); // H1: on-screen cap
    declutterTags(); // C8 (QA4 bug 22)
    flMapTags(); // Frontline 4b: lane and ping labels, never decluttered away
    flBotTags(); // 4c: the AI pilots' names
    for (let i = tagN; i < tagPool.length; i++)
        tagPool[i].style.display = "none";
}
/** C8 (QA4 bug 22): tags placed later (deposits, far markers) that would cover an earlier one move up above it (at most
 * three steps), so neighbouring tags at the horizon or in the far command view stack instead of overlapping. The size
 * is estimated from the text (no layout read per tag). */
let tagsMoved = 0;
function declutterTags() {
    const boxes = [];
    tagsMoved = 0;
    for (let i = 0; i < tagN; i++) {
        if (tagPool[i].style.display === "none")
            continue; // H1: over the cap
        const d = tagPool[i], h = d.dataset.h ?? "", parts = h.split("<small>");
        const plain = (t) => t.replace(/<[^>]*>/g, "").length;
        const w = Math.max(plain(parts[0]) * 6.6, parts[1] ? plain(parts[1]) * 5.6 : 0) + 14, ht = parts[1] ? 26 : 16;
        const cx = parseFloat(d.style.left), by = parseFloat(d.style.top);
        let x0 = cx - w / 2, y1 = by, y0 = by - ht, moved = false;
        for (let step = 0; step < 3; step++) {
            const hit = boxes.find((b) => x0 < b[2] && x0 + w > b[0] && y0 < b[3] && y1 > b[1]);
            if (!hit)
                break;
            const dy = y1 - hit[1] + 1;
            y0 -= dy;
            y1 -= dy;
            moved = true;
        }
        if (moved) {
            d.style.top = y1 + "px";
            tagsMoved++;
        }
        boxes.push([x0, y0, x0 + w, y1]);
    }
}
function updateCombatHud(now) {
    // target bracket
    const br = $("bracket");
    const tgt = aimPick && mode === "fp" ? renderedById.get(aimPick.id) : undefined;
    if (tgt) {
        (0, math_ts_1.project)(vp, tgt.x, tgt.cy, tgt.z, tmp4);
        const s = toScreen(tgt.x, tgt.cy, tgt.z);
        if (s && tmp4[2] > 0) {
            const focal = proj[5] * cssH / 2, pr = (cd.tRadius[tgt.type] * 1.1 * focal) / tmp4[2], size = (0, math_ts_1.clamp)(pr * 2, 22, 160);
            br.style.display = "block";
            br.style.left = (s[0] - size / 2) + "px";
            br.style.top = (s[1] - size / 2) + "px";
            br.style.width = size + "px";
            br.style.height = size + "px";
            br.querySelector("span").textContent = `${typeName[tgt.type]} · ${Math.round(aimPick.dist)} m`;
        }
        else
            br.style.display = "none";
    }
    else
        br.style.display = "none";
    // per-seat rings (ruling 20; long rifle, scoped): one ring per OCCUPIED seat of the vehicle under the scope, at the
    // sim's seat zone, labelled DRIVER / GUNNER; bright when the reticle is inside an exposed zone, dimmed when the hull
    // covers that seat from the player's side
    const zv = zoneTarget && scoped && mode === "fp" ? renderedById.get(zoneTarget.id) : undefined;
    let nz = 0;
    zoneRingInfo = [];
    if (zv && zoneTarget) {
        const focal = proj[5] * cssH / 2;
        // rings on screen, top to bottom; labels to the right of each ring, pushed apart when rings sit close together;
        // the vehicle and its distance under the lowest ring
        const onScreen = [];
        for (const q of zoneTarget.zones) {
            (0, math_ts_1.project)(vp, q.c[0], q.c[1], q.c[2], tmp4);
            const s = toScreen(q.c[0], q.c[1], q.c[2]);
            if (s && tmp4[2] > 0)
                onScreen.push({ q, s, pr: Math.max(7, (q.r * focal) / tmp4[2]) });
        }
        onScreen.sort((a1, a2) => a1.s[1] - a2.s[1]);
        let lastLabelY = -1e9;
        onScreen.forEach(({ q, s, pr }, i) => {
            const arm = cd.tCrewArmoured[zv.type] === 1; // ruling 112: armoured crew zones cannot be sniped
            const el = zoneRing(nz++), on = !arm && zoneTarget.inside && zoneTarget.seat === q.seat;
            const role = seatRoleLabel(zv.type, q.seat);
            const label = arm ? `${role} · ARMOURED` : on ? `${role} · FIRE` : !q.exposed ? `${role} · COVERED` : role;
            const ly = Math.max(s[1], lastLabelY + 19);
            lastLabelY = ly;
            el.style.display = "block";
            el.style.left = s[0] + "px";
            el.style.top = s[1] + "px";
            el.style.width = el.style.height = (pr * 2) + "px";
            el.className = "zring" + (on ? " on" : "") + (!q.exposed || arm ? " dim" : "");
            const sp = el.firstChild, cap = el.lastChild;
            sp.textContent = label;
            sp.style.top = `calc(50% + ${(ly - s[1]).toFixed(0)}px)`;
            cap.textContent = i === onScreen.length - 1 ? `${typeName[zv.type]} · ${Math.round(zoneTarget.dist)} m` : "";
            zoneRingInfo.push({ seat: q.seat, role, exposed: q.exposed, on, label, x: s[0], y: s[1], r: pr });
        });
        if (nz)
            tagStats.zone++;
    }
    for (let i = nz; i < zoneRingPool.length; i++)
        zoneRingPool[i].style.display = "none";
    // seat emptied by the player's shot (ruling 20): which seat and which weapon went silent
    const sk = $("seatKill");
    sk.style.display = lastSeatKill && now < lastSeatKill.until && mode === "fp" ? "block" : "none";
    if (lastSeatKill && now < lastSeatKill.until)
        sk.textContent = lastSeatKill.text;
    // health + shield bars
    const list = [];
    if (tgt)
        list.push(tgt);
    for (const e of rendered) {
        if (e.team === 0 || e === tgt || list.length >= 6)
            continue;
        const tr = tracks.get(e.id);
        if (!tr || now - tr.damagedAt > 4000)
            continue;
        if (Math.hypot(e.x - eye[0], e.z - eye[2]) > (mode === "cmd" ? 1500 : hud_range_ts_1.HUD_BAR_RANGE.max))
            continue; // H1: bars only fairly close
        list.push(e);
    }
    // the torch target: its hull rising
    const tt = onFoot() && kit === 2 ? torchTarget() : null;
    if (tt && !list.includes(tt))
        list.push(tt);
    let n = 0;
    for (const e of list) {
        const s = toScreen(e.x, e.cy + cd.tRadius[e.type] + 1.2, e.z);
        if (!s || s[0] < -40 || s[0] > cssW + 40 || s[1] < -20 || s[1] > cssH + 20)
            continue;
        const el = ebar(n++), tr = tracks.get(e.id);
        el.style.display = "block";
        el.style.left = s[0] + "px";
        el.style.top = s[1] + "px";
        {
            const f = mode === "fp" && e !== tgt ? (0, hud_range_ts_1.hudFade)(hud_range_ts_1.HUD_BAR_RANGE, Math.hypot(e.x - eye[0], e.z - eye[2])) : null;
            el.style.opacity = f && f.alpha < 1 ? f.alpha.toFixed(2) : "";
        } // H1: fade
        const h = el.children[0], sh = el.children[1];
        h.firstChild.style.width = (e.hp * 100).toFixed(0) + "%";
        h.className = "h" + (e.hp < 0.25 ? " low" : e.hp < 0.5 ? " mid" : "");
        const hasShield = cd.tShield[e.type] > 0;
        sh.style.display = hasShield ? "block" : "none";
        sh.firstChild.style.width = (e.shield * 100).toFixed(0) + "%";
        sh.className = "s" + (hasShield && c11ShieldsOff() ? " off" : hasShield && e.shield <= 0 ? " down" : "") + (tr && now - tr.shieldUpAt < 600 ? " up" : ""); // C11: flare = offline
        el.classList.toggle("flash", !!tr && now - tr.shieldHitAt < 250);
        el.classList.toggle("friend", e.team === 0);
    }
    combat.barsShown = n;
    hudStats.bars = n;
    combat.maxBars = Math.max(combat.maxBars, n);
    for (let i = n; i < ebarPool.length; i++)
        ebarPool[i].style.display = "none";
    // hit marker
    const hmk = $("hitmark");
    hmk.classList.toggle("on", now < hitMarkUntil && mode === "fp");
    hmk.classList.toggle("kill", hitMarkKill);
    hmk.classList.toggle("pilot", hitMarkPilot);
    hmk.classList.toggle("stream", hitMarkStream && !hitMarkKill && !hitMarkPilot);
    if (hitMarkStream && now < hitMarkUntil)
        hitMarkStreamFrames++;
    // own muzzle glow on / off transitions (tests: a held automatic trigger must not strobe)
    const flashOn = now < ownFlashUntil;
    if (flashOn !== ownFlashOn) {
        ownFlashOn = flashOn;
        ownFlashToggles++;
    }
}
let fpsFrames = 0, fpsT0 = 0, fps = 0, cpuMsAcc = 0, cpuMs = 0, frameGapAcc = 0, frameGap = 0;
const frameLog = [];
let hullCritical = false;
/** The type of the vehicle the player last sat in (bike deaths); the low-hull warning text. */
let lastRideType = -1, critText = "HULL CRITICAL";
/** Reticle state (ready / reloading / firing) and how often it changed (tests: no flicker at high rates of fire). */
let reticleState = "ready", lastReticleState = "ready", reticleToggles = 0;
const hudSeen = { ejected: 0, critWarn: 0, dead: 0, refill: 0, prompt: "", hijackRing: 0, dmgIndicator: 0 };
const pct0 = (v) => ((0, math_ts_1.clamp)(v, 0, 1) * 100).toFixed(1) + "%";
function setBar(id, f, text, cls = "") {
    $(id + "Fill").style.width = pct0(f);
    $(id + "Text").textContent = text;
    $(id + "Bar").className = "bar" + (cls ? " " + cls : "");
}
let liveWeapon = "";
// ------------------------------------------------------------------ first-person viewmodel (slice 3b, item 13)
/** Field of view (vertical, degrees) and near plane of the viewmodel's own projection. */
const VM_FOV = 50, VM_NEAR = 0.02;
/** P1g: how far in front of the eye the own tracer starts, along the ray through the drawn barrel tip (m). */
const VM_TRACER_DEPTH = 0.9;
let vmProne = 0;
let vmVisible = false, vmSprint = 0, vmInfo = { kind: "", onScreen: 0, roll: 0, yawDeg: 0, pos: [0, 0, 0], lowered: 0, recoil: 0, flash: false };
const vmProj = (0, math_ts_1.mat4)(), vmView = (0, math_ts_1.mat4)(), vmVP = (0, math_ts_1.mat4)();
const vmInst = new Float32Array(render_ts_1.INST_FLOATS), vmFlashInst = new Float32Array(render_ts_1.INST_FLOATS);
// Frontline: the second gun of dual machine pistols (left hand) and its muzzle flash
const vmInst2 = new Float32Array(render_ts_1.INST_FLOATS), vmFlashInst2 = new Float32Array(render_ts_1.INST_FLOATS);
/** Frontline: the slot 1 gun drawn as a pistol (0.62 scale): "single" one, "dual" one in each hand; null: the usual carbine. */
function flPistols() {
    if (kit !== 0 || !isFrontline() || !flKit)
        return null;
    return flKit.gun === "dual" ? "dual" : null;
}
let lastCamYaw = 0, vmSwayZ = 0;
/** P1g (designer playtest 15 Nov 18:34: "shots don't come out of the barrel"): the drawn barrel tip in viewmodel space (null: no gun drawn). */
let vmMuzzleVm = null;
/** Frontline: the left pistol's barrel tip (dual machine pistols; null otherwise) and which hand the next tracer leaves. */
let vmMuzzleVm2 = null, vmLeftNext = false;
const vmT4 = [0, 0, 0];
/**
 * The world point that is drawn exactly over the viewmodel's barrel tip: the tip projected with the viewmodel's own
 * camera, unprojected through the world camera at `depth` metres in front of the eye. A tracer drawn from here leaves
 * the on-screen muzzle and converges on the hit point (crouched, prone and sprinting poses included: the drawn pose).
 */
function vmMuzzleWorld(depth) {
    if (!vmMuzzleVm || !vmInfo.kind)
        return null;
    let tip = vmMuzzleVm;
    if (vmMuzzleVm2) { // dual pistols: the tracers leave each barrel in turn
        if (vmLeftNext)
            tip = vmMuzzleVm2;
        vmLeftNext = !vmLeftNext;
    }
    (0, math_ts_1.project)(vmVP, tip[0], tip[1], tip[2], vmT4);
    if (vmT4[2] <= 0)
        return null;
    const nx = (0, math_ts_1.clamp)(vmT4[0], -1.2, 1.2), ny = (0, math_ts_1.clamp)(vmT4[1], -1.2, 1.2), m = invVP;
    const un = (z) => { const w = m[3] * nx + m[7] * ny + m[11] * z + m[15]; return [(m[0] * nx + m[4] * ny + m[8] * z + m[12]) / w, (m[1] * nx + m[5] * ny + m[9] * z + m[13]) / w, (m[2] * nx + m[6] * ny + m[10] * z + m[14]) / w]; };
    const a = un(-1), b = un(0.5);
    let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz) || 1;
    dx /= L;
    dy /= L;
    dz /= L;
    const fx0 = target[0] - eye[0], fy0 = target[1] - eye[1], fz0 = target[2] - eye[2], fl = Math.hypot(fx0, fy0, fz0) || 1;
    const cos = (dx * fx0 + dy * fy0 + dz * fz0) / fl, t = depth / Math.max(0.3, cos);
    return [eye[0] + dx * t, eye[1] + dy * t, eye[2] + dz * t];
}
/**
 * Places and draws the held weapon: camera space (looking down +x, level: no roll or pitch), anchored lower right so
 * only the front of the weapon (barrel, fore-end, top of the receiver) is in the frame; yawed so the barrel points at
 * the reticle's convergence point; bob and sway while walking, lowered while sprinting, a short kick on each shot.
 */
/** Frontline: last frame the camera was inside a Mule's cabin (the cabin frame overlay shows while recent). */
let flCabinAt = -1e9, flCabinOn = false;
function flCabinFrame(now) {
    const on = now - flCabinAt < 150;
    if (on === flCabinOn)
        return;
    flCabinOn = on;
    if (!$("flCabinCss")) {
        const st = document.createElement("style");
        st.id = "flCabinCss";
        st.textContent = `body.muleCabin #hud::after { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 1;
  background:
    linear-gradient(to bottom, rgba(34,40,36,0.97) 0%, rgba(48,56,50,0.95) 13%, rgba(80,92,84,0.9) 14.2%, rgba(0,0,0,0) 15.5%, rgba(0,0,0,0) 76%, rgba(80,92,84,0.9) 77.3%, rgba(44,50,46,0.96) 78.5%, rgba(30,34,31,0.98) 100%),
    linear-gradient(to right, rgba(36,42,38,0.97) 0%, rgba(52,60,54,0.95) 9%, rgba(84,96,88,0.9) 10.2%, rgba(0,0,0,0) 11.5%, rgba(0,0,0,0) 88.5%, rgba(84,96,88,0.9) 89.8%, rgba(52,60,54,0.95) 91%, rgba(36,42,38,0.97) 100%); }
body.muleCabin #hud::before { content: ""; position: fixed; left: 11.5%; right: 11.5%; top: 15.5%; height: 3px; pointer-events: none; z-index: 1; background: rgba(69,224,255,0.55); box-shadow: 0 0 8px rgba(69,224,255,0.5); }`;
        document.head.appendChild(st);
    }
    document.body.classList.toggle("muleCabin", on);
}
function drawViewModel(now, frameDt) {
    flCabinFrame(now);
    if (!vmVisible) {
        vmInfo.kind = "";
        vmMuzzleVm = null;
        return;
    }
    const beacon = !!armedCall && onFoot();
    const name = beacon ? (0, c5_ts_1.beaconVmName)(data, armedCall.call) : heavyHeld() ? heavyVm(heavyNow()) : kit === 0 ? (flScopeKind() === "plain" ? "vm-rifle" : "vm-carbine") /* the marksman rifle carries its scope */ : kit === 1 ? (heavyHeld() ? heavyVm(heavyNow()) : "vm-rifle") : kit === KIT_BUILD ? "vm-build" : "vm-torch";
    const sp = bodyRender && bodyRender.alt < 0.3 ? Math.hypot(bodyRender.vx, bodyRender.vz) : 0;
    // sprint pose: a critically damped follow of the input target (~0.2 s, starts and ends at zero speed: the old
    // exponential ease moved the weapon 2.2 deg in the first frame of a sprint)
    {
        const w = 12, h2 = Math.min(frameDt, 0.05);
        vmSprintVel += (w * w * (vmSprintTarget - vmSprint) - 2 * w * vmSprintVel) * h2;
        vmSprint += vmSprintVel * h2;
    }
    const mv = bobAmp;
    // turn sway: the weapon lags a little behind fast mouse turns
    let dyaw = camYaw - lastCamYaw;
    lastCamYaw = camYaw;
    if (Math.abs(dyaw) > 1)
        dyaw = 0;
    vmSwayZ += ((0, math_ts_1.clamp)(-dyaw * 0.6, -0.02, 0.02) - vmSwayZ) * Math.min(1, frameDt * 10);
    const kick = (0, math_ts_1.clamp)(1 - (now - recoilAt) / (kit === 1 ? 220 : 90), 0, 1);
    const base = beacon ? [0.62, -0.16, 0.21] : name === "vm-lcannon" ? [0.26, -0.095, 0.12] : heavyHeld() ? [0.0, -0.17, 0.25] : kit === 1 ? [-0.02, -0.175, 0.22] : kit === 2 ? [0.1, -0.16, 0.22] : kit === KIT_BUILD ? [0.17, -0.125, 0.13] : [0.08, -0.16, 0.235];
    let x = base[0] - kick * (kit === 1 ? 0.07 : 0.035) - vmSprint * 0.03;
    // vertical: one smooth dip per stride (0.5 + 0.5 cos: the old |cos| had a sharp corner at every footfall)
    let y = base[1] + (0.5 + 0.5 * Math.cos(bobT)) * 0.008 * mv + kick * (kit === 1 ? 0.012 : 0.005) - vmSprint * 0.025 - vmProne * 0.03; // C8: prone, the weapon rests lower
    let z = base[2] + Math.sin(bobT * 0.5) * 0.006 * mv + vmSwayZ - vmSprint * 0.05;
    // converge on the point under the reticle (yaw only: the vertical offset is under 0.4 deg at 30 m)
    const D = (0, math_ts_1.clamp)(Math.hypot(aimPoint[0] - eye[0], aimPoint[1] - eye[1], aimPoint[2] - eye[2]) || 40, 6, 300);
    let yaw = Math.atan2(-z, D - x) - vmSprint * 0.3; // sprinting: lowered and turned in across the body
    const pist = beacon || heavyHeld() ? null : flPistols(), psc = pist ? 0.62 : 1;
    if (pist) { // pistols are held higher and closer in, one in each hand for the dual pair
        x += 0.07;
        y += 0.045;
        z = pist === "dual" ? z - 0.09 : z - 0.05;
        yaw = Math.atan2(-z, D - x) - vmSprint * 0.3;
    }
    putInst(vmInst, 0, x, y, z, yaw, yaw, 0, 0, psc);
    const parts = [{ name, inst: vmInst }];
    // Frontline: dual machine pistols, the second one in the left hand (mirrored across the view axis), kicking in turn
    const z2 = -z - 0.03, yaw2 = Math.atan2(-z2, D - x) + vmSprint * 0.3;
    if (pist === "dual") {
        putInst(vmInst2, 0, x, y + 0.004, z2, yaw2, yaw2, 0, 0, psc);
        parts.push({ name, inst: vmInst2 });
    }
    const flash = beacon || kit === KIT_BUILD ? false : kit < 2 ? now - recoilAt < 50 && recoilAt > 0 : lmb && !!torchTarget() && !!me && me.energy > 0;
    {
        const ax = meshes_ts_1.VIEWMODEL_AXIS[name], mz = ax[1] + 0.01, my = kit === 1 ? 0.006 : kit === 0 ? 0.012 : 0;
        vmMuzzleVm = beacon || (kit >= 2 && !heavyHeld()) ? null : [x + Math.cos(yaw) * mz * psc, y + my, z + Math.sin(yaw) * mz * psc];
        vmMuzzleVm2 = pist === "dual" ? [x + Math.cos(yaw2) * mz * psc, y + 0.004 + my, z2 + Math.sin(yaw2) * mz * psc] : null;
    } // P1g: the barrel tip, for the own tracers
    if (flash) {
        const ax = meshes_ts_1.VIEWMODEL_AXIS[name], mz = ax[1], my = kit === 1 ? 0.006 : kit === 0 ? 0.012 : 0;
        const m2 = mz * psc;
        putInst(vmFlashInst, 0, x + Math.cos(yaw) * m2, y + my, z + Math.sin(yaw) * m2, yaw, yaw, 0, 0, kit === 2 ? 1.6 : psc);
        parts.push({ name: "vm-flash", inst: vmFlashInst });
        if (pist === "dual") {
            putInst(vmFlashInst2, 0, x + Math.cos(yaw2) * m2, y + 0.004 + my, z2 + Math.sin(yaw2) * m2, yaw2, yaw2, 0, 0, psc);
            parts.push({ name: "vm-flash", inst: vmFlashInst2 });
        }
    }
    (0, math_ts_1.perspective)(vmProj, (VM_FOV * Math.PI) / 180, cssW / cssH, VM_NEAR, 10);
    (0, math_ts_1.lookAt)(vmView, [0, 0, 0], [1, 0, 0], [0, 1, 0]);
    (0, math_ts_1.multiply)(vmVP, vmProj, vmView);
    R.drawViewModel(parts, vmVP);
    // the on-screen share of the weapon's length (test and report): samples along its axis through the VM projection
    const ax = meshes_ts_1.VIEWMODEL_AXIS[name];
    let on = 0;
    const N = 60, t4 = [0, 0, 0];
    for (let i = 0; i <= N; i++) {
        const m = ax[0] + ((ax[1] - ax[0]) * i) / N, px = x + Math.cos(yaw) * m, pz = z + Math.sin(yaw) * m;
        (0, math_ts_1.project)(vmVP, px, y, pz, t4);
        if (t4[2] > 0 && Math.abs(t4[0]) <= 1 && Math.abs(t4[1]) <= 1 && px > VM_NEAR)
            on++;
    }
    vmInfo = { kind: name, onScreen: on / (N + 1), roll: 0, yawDeg: (yaw * 180) / Math.PI, pos: [x, y, z], lowered: vmSprint, recoil: kick, flash };
}
let prodHeld = "";
let lastWpnHtml = "", lastSeatHtml = "", lastProdHtml = "", lastRideHtml = "", lastSelHtml = "", lastRideMenu = "";
// ------------------------------------------------------------------ C2: strategic layer (points, Cores)
const stratCanvas = $("strat");
const stratCtx = stratCanvas.getContext("2d");
let stratInfo = { rings: 0, links: 0, dashed: 0, arcs: 0, flashing: 0 };
/** The newest points block with unseen points at their last seen state (C11, ruling 87). */
function latestPoints() { const pv = views.length ? views[views.length - 1].points : null; if (!pv)
    return null; c11PtMem.update(pv, performance.now()); return c11PtMem.merged(); }
function coresAround() {
    const out = [];
    for (const e of rendered)
        if (e.type === T_CORE)
            out.push({ id: e.id, team: e.team, x: e.x, z: e.z, radius: cd.tRadius[e.type] * 1.5 });
    return out;
}
/**
 * C3: the enemy Command Core: its position is the scenario's fixed spawn (fixed scenario knowledge, as the enemy
 * commander's; s7), refined while it is rendered; standing while the match block has not eliminated team 1. (The
 * points block lists only Cores being hacked or disabled, so the id is known only while it is in view.)
 */
let coreSource = "";
function enemyCore() {
    if (!(0, scenario_ts_1.isSkirmish)(config.scenario, config.units))
        return null;
    const sp = (0, battles_ts_1.battleOf)(config.battle).scenario.spawns.find((x) => x.type === "command-core" && x.team === 1);
    if (!sp)
        return null;
    const m = views.length ? views[views.length - 1].match : null;
    // C7b item 1: the points block's Core list (w2f: own, detected and hacked / disabled Cores with team and position)
    const listed = latestPoints()?.cores.find((c) => c.team !== 0 && c.team !== 255 && (c.x !== 0 || c.z !== 0));
    const seen = rendered.find((e) => e.type === T_CORE && e.team !== 0);
    coreSource = seen ? "drawn" : listed ? "snapshot" : "scenario";
    return { id: seen ? seen.id : listed ? listed.id : 0, x: seen ? seen.x : listed ? listed.x : sp.x, z: seen ? seen.z : listed ? listed.z : sp.z, alive: !!m && (m.eliminated & 2) === 0 };
}
function stratTopbar() {
    const pv = latestPoints();
    if (!pv || !teamRes)
        return "";
    const h = (0, c2_ts_1.strategicHud)(pv);
    const tot = h.momentum + h.enemyMomentum, f = tot > 0 ? h.momentum / tot : 0.5;
    return `<span>MOMENTUM <i class="mom"><b style="width:${(f * 100).toFixed(0)}%"></b></i> <b>${Math.round(h.momentum * 100)}</b>/<b>${Math.round(h.enemyMomentum * 100)}</b></span>`;
}
/** Per frame: point models from the newest snapshot, the hack prompt, the overlay (rings, arcs, links) and the bars. */
function updateStrategic(now) {
    const pv = latestPoints();
    const px = bodyRender ? bodyRender.x : eye[0], pz = bodyRender ? bodyRender.z : eye[2];
    ptModels = (0, c2_ts_1.pointModels)(ptStatics, pv, px, pz, now, 0, (i) => c11PtMem.info(i)); // C11: unknown / last seen
    ptLinks = (0, c2_ts_1.linkModels)(ptStatics, pv);
    const mv = views.length ? views[views.length - 1].mining : null;
    depModels = (0, c2_ts_1.depositModels)(scenMap, mv);
    hvModels = (0, c2_ts_1.harvesterModels)(mv, HV_CARGO);
    const foot = onFoot() && mode === "fp" && started;
    hackUi = foot ? (0, c2_ts_1.hackPrompt)(ptStatics, pv, px, pz, PILOT_R, REACH_M, keys.has("KeyE"), coresAround()) : null;
    if (hackUi && !hackUi.text.includes("DISABLED"))
        hackUi = { ...hackUi, text: hackUi.text + (0, c9_ts_1.hackCostNote)(BLD, me?.energy ?? 0) }; // C9 (ruling 17): the hack's energy cost
    const hb = $("hackBar");
    const c9p = foot && !hackUi ? c9FootPrompt(px, pz) : null; // C9: building hack / man a tower
    if (c9p) {
        const html = `${c9p.text}${c9p.progress > 0 ? `<i><b style="width:${(c9p.progress * 100).toFixed(0)}%"></b></i>` : ""}`;
        hb.style.display = "block";
        if (hb.dataset.h !== html) {
            hb.innerHTML = html;
            hb.dataset.h = html;
        }
    }
    else if (hackUi) {
        const html = `${hackUi.text}${hackUi.progress > 0 || hackUi.active ? `<i><b style="width:${(hackUi.progress * 100).toFixed(0)}%"></b></i>` : ""}`;
        hb.style.display = "block";
        if (hb.dataset.h !== html) {
            hb.innerHTML = html;
            hb.dataset.h = html;
        }
    }
    else
        hb.style.display = "none";
    // first person: capture bar while inside a ring
    const sb = $("stratBar");
    // (a quiet point the team already holds shows no bar: the base sits inside one)
    const inside = mode === "fp" && started && !dead() ? ptModels.find((m) => m.inRing && (m.owner !== 0 || m.progress > 0 || m.alert)) : undefined;
    if (inside) {
        const prog = inside.captureTeam >= 0 ? inside.progress : inside.owner === 0 ? 1 : 0;
        const html = `${inside.name.toUpperCase()} · ${inside.status}${c9NodeAt(inside.index, inside.owner) ? `<small class="node">${c9_ts_1.NODE_CAPTURE_NOTE}</small>` : ""}<i><b style="width:${(prog * 100).toFixed(0)}%"></b></i>`; // C9: the control node blocks a ring capture
        sb.style.display = "block";
        sb.classList.toggle("enemy", inside.captureTeam > 0 || (inside.captureTeam < 0 && inside.owner > 0));
        if (sb.dataset.h !== html) {
            sb.innerHTML = html;
            sb.dataset.h = html;
        }
    }
    else
        sb.style.display = "none";
    drawStrategicOverlay(now);
}
/** World circle on the ground as a screen polyline (null points behind the camera break it). */
function groundPoly(x, z, r, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n, wx = x + Math.cos(a) * r, wz = z + Math.sin(a) * r;
        out.push(toScreen(wx, (0, terrain_gen_ts_1.sampleHeight)(hm, wx, wz) + 0.6, wz));
    }
    return out;
}
function strokePoly(g, pts) {
    g.beginPath();
    let pen = false;
    for (const p of pts) {
        if (!p) {
            pen = false;
            continue;
        }
        if (pen)
            g.lineTo(p[0], p[1]);
        else {
            g.moveTo(p[0], p[1]);
            pen = true;
        }
    }
    g.stroke();
}
function drawStrategicOverlay(now) {
    stratInfo = { rings: 0, links: 0, dashed: 0, arcs: 0, flashing: 0 };
    const g = stratCtx;
    if (!g)
        return;
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (stratCanvas.width !== w || stratCanvas.height !== h) {
        stratCanvas.width = w;
        stratCanvas.height = h;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!started || mode !== "cmd" || !ptStatics.length)
        return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = "round";
    // supply links between point centres
    for (const l of ptLinks) {
        const a = ptStatics[l.a], b = ptStatics[l.b], n = 16, pts = [];
        for (let i = 0; i <= n; i++) {
            const x = a.x + ((b.x - a.x) * i) / n, z = a.z + ((b.z - a.z) * i) / n;
            pts.push(toScreen(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.6, z));
        }
        g.strokeStyle = l.colour;
        g.globalAlpha = l.state === "none" ? 0.35 : 0.85;
        g.lineWidth = l.state === "supplied" ? 2.5 : 1.5;
        g.setLineDash(l.dashed ? [8, 6] : []);
        strokePoly(g, pts);
        stratInfo.links++;
        if (l.dashed)
            stratInfo.dashed++;
    }
    g.setLineDash([]);
    for (const m of ptModels) {
        const s = ptStatics[m.index];
        // area (thin), capture ring (owner colour; flashing red while contested / under attack)
        const fog = m.unknown ? 0.45 : m.stale ? 0.6 : 1; // C11 (ruling 87): unknown and last-seen points are drawn faint and dashed
        if (m.unknown || m.stale)
            g.setLineDash(m.unknown ? [3, 7] : [10, 5]);
        g.globalAlpha = 0.35 * fog;
        g.lineWidth = 1;
        g.strokeStyle = m.colour;
        strokePoly(g, groundPoly(s.x, s.z, s.radius, 0, Math.PI * 2, 48));
        g.globalAlpha = 0.95 * fog;
        g.lineWidth = 2.5;
        g.strokeStyle = m.flash ? "#ff2a1a" : m.colour;
        strokePoly(g, groundPoly(s.x, s.z, s.ring, 0, Math.PI * 2, 40));
        stratInfo.rings++;
        g.setLineDash([]);
        if (m.alert)
            stratInfo.flashing++;
        if (m.progress > 0 && m.captureTeam >= 0) {
            g.lineWidth = 5;
            g.strokeStyle = m.progressColour;
            strokePoly(g, groundPoly(s.x, s.z, s.ring + 4, -Math.PI / 2, -Math.PI / 2 + m.progress * Math.PI * 2, 32));
            stratInfo.arcs++;
        }
        {
            const fj = fortViewsNow().find((j) => j.point === m.index); // ruling 133: fortifying: a dashed full ring and the work done as an amber arc
            if (fj) {
                g.globalAlpha = 0.5;
                g.lineWidth = 3;
                g.setLineDash([4, 6]);
                g.strokeStyle = "#ffb347";
                strokePoly(g, groundPoly(s.x, s.z, s.ring + 9, 0, Math.PI * 2, 48));
                g.setLineDash([]);
                g.globalAlpha = 1;
                g.lineWidth = 6;
                strokePoly(g, groundPoly(s.x, s.z, s.ring + 9, -Math.PI / 2, -Math.PI / 2 + Math.max(0.01, fj.progress) * Math.PI * 2, 48));
                g.globalAlpha = 0.95 * fog;
                fortStats.arcs++;
            }
        }
        if (m.hacking) {
            g.lineWidth = 3;
            g.strokeStyle = "#ffd23c";
            strokePoly(g, groundPoly(s.terminal[0], s.terminal[1], 6, -Math.PI / 2, -Math.PI / 2 + m.hackProgress * Math.PI * 2, 16));
        }
        // terminal
        const t = toScreen(s.terminal[0], (0, terrain_gen_ts_1.sampleHeight)(hm, s.terminal[0], s.terminal[1]) + 0.6, s.terminal[1]);
        if (t) {
            g.fillStyle = m.colour;
            g.globalAlpha = 0.9;
            g.fillRect(t[0] - 2.5, t[1] - 2.5, 5, 5);
        }
    }
    // ore deposits (grey when depleted) and geysers
    for (const d of depModels) {
        g.globalAlpha = d.exhausted ? 0.4 : 0.9;
        g.lineWidth = 2;
        g.strokeStyle = d.exhausted ? "#666" : "#e8c25a";
        strokePoly(g, groundPoly(d.x, d.z, d.radius + 3, 0, Math.PI * 2, 24));
        const c = toScreen(d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + 0.5, d.z);
        if (c)
            (0, g1_fields_ts_1.fieldGlyph)(g, d.exhausted ? "spent" : "ore", c[0], c[1]); // G1
    }
    for (const gy of scenMap?.geysers ?? []) {
        g.globalAlpha = 0.9;
        g.lineWidth = 2;
        g.strokeStyle = "#7ddc8a";
        strokePoly(g, groundPoly(gy.x, gy.z, gy.radius + 3, 0, Math.PI * 2, 16));
        const c = toScreen(gy.x, (0, terrain_gen_ts_1.sampleHeight)(hm, gy.x, gy.z) + 0.5, gy.z);
        if (c)
            (0, g1_fields_ts_1.fieldGlyph)(g, "gas", c[0], c[1]); // G1
    }
    if (mode === "cmd")
        dockOverlayDraw(g);
    c9Overlay(g, now); // C9: call-in zones, drops
    // C3: the enemy Command Core: a red target reticle (two rings and four ticks) at its position
    const ec = enemyCore();
    if (ec && ec.alive) {
        const pulse = 0.6 + 0.4 * Math.sin(now / 300);
        g.globalAlpha = 0.95;
        g.strokeStyle = "#ff3a1a";
        g.lineWidth = 2.5;
        strokePoly(g, groundPoly(ec.x, ec.z, 28, 0, Math.PI * 2, 32));
        g.globalAlpha = pulse;
        g.lineWidth = 1.5;
        strokePoly(g, groundPoly(ec.x, ec.z, 40, 0, Math.PI * 2, 32));
        for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2;
            strokePoly(g, [toScreen(ec.x + Math.cos(a) * 44, (0, terrain_gen_ts_1.sampleHeight)(hm, ec.x, ec.z) + 0.6, ec.z + Math.sin(a) * 44), toScreen(ec.x + Math.cos(a) * 58, (0, terrain_gen_ts_1.sampleHeight)(hm, ec.x, ec.z) + 0.6, ec.z + Math.sin(a) * 58)]);
        }
        enemyCoreMarks.cmd++;
    }
    g.globalAlpha = 1;
}
/** q1: a selected Refinery's (or selected harvester's drop-off's) dock points and a faint queue line, command view only. */
function dockOverlayDraw(g) {
    const mv = views.length ? views[views.length - 1].mining : null;
    const ids = (0, c2_ts_1.dockOverlayTargets)(selBuilding, (id) => { const e = renderedById.get(id); return !!e && DOCKS_BY_TYPE.has(e.type); }, selected, mv);
    if (!ids.length)
        return;
    const hR = T_HARVESTER >= 0 ? cd.tRadius[T_HARVESTER] : 2.5, reach = MINING_C.dropOffReachMetres ?? 6, gap = MINING_C.queue?.gapMetres ?? 2;
    const at = (x, z) => toScreen(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.5, z);
    for (const id of ids) {
        const e = renderedById.get(id);
        const o = (0, c2_ts_1.dockOverlay)({ id, x: e.x, z: e.z, yaw: e.yaw, docks: DOCKS_BY_TYPE.get(e.type) ?? null, radius: cd.tRadius[e.type] }, hR, reach, gap, mv);
        g.globalAlpha = 0.45;
        g.strokeStyle = "#e8c25a";
        g.lineWidth = 1.5;
        g.setLineDash([5, 6]);
        strokePoly(g, [at(o.lane[0], o.lane[1]), at(o.lane[2], o.lane[3])]);
        g.setLineDash([]);
        for (const sp of o.spots) {
            g.globalAlpha = sp.taken ? 0.6 : 0.3;
            strokePoly(g, groundPoly(sp.x, sp.z, 1.2, 0, Math.PI * 2, 10));
        }
        for (const d of o.docks) {
            g.globalAlpha = 0.85;
            g.strokeStyle = d.busy ? "#ffb347" : "#7ddc8a";
            g.lineWidth = 2;
            strokePoly(g, groundPoly(d.x, d.z, hR + 0.4, 0, Math.PI * 2, 16));
            const c = at(d.x, d.z);
            if (c) {
                g.fillStyle = g.strokeStyle;
                g.fillRect(c[0] - 2, c[1] - 2, 4, 4);
            }
        }
    }
    g.globalAlpha = 1;
}
/** Point labels (both views: name, distance in first person, status) and the disabled-Core countdown. */
function strategicTags(now) {
    void now;
    c9Tags(now); // C9
    for (const m of ptModels) {
        const s = ptStatics[m.index];
        const y = (0, terrain_gen_ts_1.sampleHeight)(hm, s.x, s.z) + (mode === "cmd" ? 6 : 14);
        const html = mode === "cmd" ? `<span style="color:${m.colour}">${m.name.toUpperCase()}</span><small>${m.status}</small>` : `<span style="color:${m.colour}">${m.name.toUpperCase()}</span> ${Math.round(m.dist)} m${m.alert || m.cutOff || m.progress > 0 ? `<small>${m.status}</small>` : ""}`;
        tag(s.x, y, s.z, html, `pt${m.flash ? " flash" : ""}`);
    }
    for (const [id, c] of callouts) {
        if (now > c.until) {
            callouts.delete(id);
            continue;
        }
        const e = renderedById.get(id);
        if (e && (mode === "cmd" || Math.hypot(e.x - eye[0], e.z - eye[2]) < 250))
            tag(e.x, e.cy + cd.tRadius[e.type] + 4, e.z, c.text, "ack");
    }
    const vo = views[views.length - 1];
    if (mode === "cmd" && vo)
        for (const o of vo.orders.values()) {
            if (!o.holdFire)
                continue;
            const e = renderedById.get(o.id);
            if (e)
                tag(e.x, e.cy - 1, e.z, "HOLD FIRE", "hold");
        }
    if (mode === "cmd")
        for (const [g, ids] of groups.groups)
            for (const id of ids) {
                const e = renderedById.get(id);
                if (e)
                    tag(e.x, e.cy + cd.tRadius[e.type] + 1.5, e.z, String(g), "grp");
            }
    const near = (x, z) => mode === "cmd" || Math.hypot(x - eye[0], z - eye[2]) < 300;
    for (const d of depModels)
        if (near(d.x, d.z))
            tag(d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + 4, d.z, `${d.text}<i><b style="width:${(d.fraction * 100).toFixed(0)}%"></b></i>`, `prodtag${d.exhausted ? " dep0" : ""}`);
    for (const gy of scenMap?.geysers ?? [])
        if (near(gy.x, gy.z))
            tag(gy.x, (0, terrain_gen_ts_1.sampleHeight)(hm, gy.x, gy.z) + 4, gy.z, `GAS ${gy.gasPerSecond}/s`, "prodtag");
    for (const hv of hvModels) {
        const e = renderedById.get(hv.id);
        if (!e || !near(e.x, e.z))
            continue;
        tag(e.x, e.cy + cd.tRadius[e.type] + 2.5, e.z, `${hv.text}<i><b style="width:${(hv.load * 100).toFixed(0)}%"></b></i>`, "prodtag");
        if (mode === "cmd" && (0, c3_ts_1.harvesterIdle)(hv)) {
            tag(e.x, e.cy + cd.tRadius[e.type] + 7, e.z, "IDLE · J", "hvidle");
            idleMarkers++;
        }
    }
    const v = views[views.length - 1];
    if (!v)
        return;
    for (const c of (0, c2_ts_1.coreStatus)(v.points?.cores, v.tick, 1 / dt)) {
        const e = renderedById.get(c.id);
        if (!e || (!c.disabled && c.hackProgress <= 0))
            continue; // C8 (QA4 bug 24): no "CORE HACK 0%" while nobody hacks
        tag(e.x, e.y + 22 * e.scale, e.z, c.disabled ? `${c.text}<small>production paused</small>` : c.text, "coreoff");
    }
}
let lastOrderBar = "", idleMarkers = 0;
function updateOrderBar() {
    const ids = selectedUnits(), hold = allHolding(ids);
    const hvSel = ids.filter((id) => renderedById.get(id)?.type === T_HARVESTER).length, hvBtn = (0, c3_ts_1.harvestButton)(hvSel);
    const html = `<button data-act="c2f" data-b="0" data-i="0" title="Z">FORMATION <b>${formation.toUpperCase()}</b> · Z</button>` + c2_ts_1.ORDER_KEYS.map((k, i) => k.b === "harvest"
        ? (hvBtn ? `<button data-act="c2o" data-b="0" data-i="${i}" class="hv">${hvBtn}</button>` : "")
        : `<button data-act="c2o" data-b="0" data-i="${i}" class="${(k.b === "holdFire" && hold) || armedCmd?.kind === `c2:${k.b}` ? "on" : ""}">${k.b === "holdFire" && hold ? "HOLD FIRE ON" : k.label.toUpperCase()} · <b>${k.key}</b></button>`).join("")
        + (hvBtn ? `<button data-act="hvAll" data-b="0" data-i="0">ALL HARVESTERS · <b>Shift+J</b></button>` : "")
        + (ids.some((id) => { const e = renderedById.get(id); return !!e && INDIRECT.has(e.type); }) ? `<button data-act="shellGround" data-b="0" data-i="0" class="${armedCmd?.kind === "ground" ? "on" : ""}" title="indirect fire on a spot (ruling 40)">SHELL GROUND · <b>${GROUND_KEY_LABEL}</b></button>` : "") // C8
        + transportButtons(ids)
        + c9OrderButtons(ids) // C9: garrison
        + c11CrewButton(ids) // C11: crew order
        // C7b item 5: battle groups next to the control-group keys: a standing-order squad from the selection; auto-defend
        + (ids.length ? `<button data-act="bg" data-k="new" data-b="0" data-i="0" title="control groups are selections; a battle group keeps a standing order">NEW BATTLE GROUP · <b>${c7b_ts_4.GROUP_KEY_LABEL}</b></button>` : "")
        + `<button data-act="bg" data-k="auto" data-b="0" data-i="0" class="${autoDefendOn ? "on" : ""}">AUTO-DEFEND HOME ${autoDefendOn ? "ON" : "OFF"}</button>`;
    if (html !== lastOrderBar) {
        $("orderBar").innerHTML = html;
        lastOrderBar = html;
    }
}
/** N1: squadmates' names over their pilot or vehicle, and the squad's pings (8 s). */
let netTagPool = [];
function drawNetTags(now) {
    const box = $("nameTags");
    if (!box)
        return;
    let n = 0;
    const tag = (text, cls, x, y, z) => {
        const p = toScreen(x, y, z);
        if (!p)
            return;
        let el = netTagPool[n];
        if (!el) {
            el = document.createElement("div");
            box.appendChild(el);
            netTagPool.push(el);
        }
        el.className = cls;
        el.textContent = text;
        el.style.left = `${p[0].toFixed(0)}px`;
        el.style.top = `${p[1].toFixed(0)}px`;
        el.style.display = "";
        const f = mode === "fp" ? (0, hud_range_ts_1.hudFade)(hud_range_ts_1.HUD_RANGES[(0, hud_range_ts_1.hudCat)(cls)], Math.hypot(x - eye[0], z - eye[2])) : null; // H1: squad names and pings fade with distance
        el.style.opacity = f && f.alpha < 1 ? f.alpha.toFixed(2) : "";
        el.style.scale = f && f.scale < 1 ? f.scale.toFixed(2) : "";
        n++;
    };
    if (started && roster.length > 1) {
        const v = views[views.length - 1];
        if (v)
            for (const pl of v.players.values()) {
                const name = playerName(pl.pilotId);
                if (!name || !pl.entity)
                    continue;
                const e = renderedById.get(pl.entity);
                if (e)
                    tag(name, "nameTag", e.x, e.cy + cd.tRadius[e.type] + 1.2, e.z);
            }
        for (let i = pings.length - 1; i >= 0; i--) {
            const pg = pings[i];
            if (isFrontline()) {
                pings.splice(i, 1);
                continue;
            } // Frontline 4b: the sim's pings are drawn (flMapDraw)
            if (pg.until < now) {
                pings.splice(i, 1);
                continue;
            }
            tag(`◆ ${pg.name}: ${pg.kind.toUpperCase()}`, "pingTag", pg.x, (0, terrain_gen_ts_1.sampleHeight)(hm, pg.x, pg.z) + 2, pg.z);
        }
    }
    for (let i = n; i < netTagPool.length; i++)
        netTagPool[i].style.display = "none";
}
// ---- C7b item 3: transports (w2e): load / unload / airlift orders in the command view, passengers, sling loads
const LOAD_KEY = "KeyK", UNLOAD_KEY = "KeyU";
const CARRIER_IDS = new Set(data.constants.transport?.infantryCarriers ?? ["carrier", "mule"]);
const LIFTERS = new Set(data.units.filter((u) => (u.liftCapacity?.vehicles ?? 0) + (u.liftCapacity?.heavy ?? 0) > 0).map((u) => u.id));
const TP_RULES = {
    infantry: (t) => cd.tArmour[t] === data_ts_2.AC_INFANTRY && !cd.tPilot[t] && !cd.tStructure[t],
    carrier: (t) => CARRIER_IDS.has(cd.typeIds[t]),
    lifter: (t) => LIFTERS.has(cd.typeIds[t]),
    liftable: (t) => !!cd.tVehicle[t] && !cd.tAir[t] && !cd.tStructure[t],
};
const cargo = new c7b_ts_2.CargoTracker();
let armedCmd = null;
/** C8 (ruling 40): attack-ground. In the command view, T (or the SHELL GROUND button) arms it; the next map click sends
 * `{ type: "attack", targetId: 0, ground }` to the selection. Units without an indirect-fire weapon are refused by the
 * sim (cannotDamageTarget), shown as SHELL_REFUSED. A marker stays on the spot while a unit's order is still it. */
const GROUND_KEY = "KeyT", GROUND_KEY_LABEL = "T";
const INDIRECT = (0, c8_ts_1.indirectTypes)(cd, data_ts_1.MAX_MOUNTS);
const groundTargets = new Map();
let groundStats = { arms: 0, sent: 0, markers: 0, refused: 0 };
function armShellGround() {
    const ids = selectedUnits();
    if (!ids.length) {
        notify("Select units first (drag a box, or 1..9 for a group)", "warn");
        snd.ui("error");
        return;
    }
    const n = ids.filter((id) => { const e = renderedById.get(id); return !!e && INDIRECT.has(e.type); }).length;
    if (!n) {
        notify(`SHELL GROUND · ${c8_ts_1.SHELL_REFUSED}`, "warn");
        snd.ui("error");
        groundStats.refused++;
        return;
    }
    armedCmd = { kind: "ground", label: `SHELL GROUND · ${n} artillery unit${n > 1 ? "s" : ""} · click the spot` };
    groundStats.arms++;
    snd.ui("click");
}
function shellGround(sx, sy) {
    const ids = selectedUnits(), g = groundAt(sx, sy);
    if (!g) {
        notify("SHELL GROUND · put the cursor on the ground", "warn");
        snd.ui("error");
        return;
    }
    const o = (0, c8_ts_1.attackGroundOrder)(g[0], g[2]);
    issueOrder(ids, o, sx, sy);
    groundStats.sent++;
    for (const id of ids) {
        const e = renderedById.get(id);
        if (e && INDIRECT.has(e.type))
            groundTargets.set(id, { x: o.ground.x, z: o.ground.z });
    }
    notify(`SHELL GROUND · ${ids.filter((id) => groundTargets.has(id)).length} unit${ids.length > 1 ? "s" : ""} fire on the spot until given another order`, "info");
}
/** Per frame: drop targets whose unit has another order now; draw a marker on each spot still shelled. */
function groundFrame(now) {
    const v = views[views.length - 1];
    groundStats.markers = 0;
    if (!v)
        return;
    const spots = new Map();
    for (const [id, p] of groundTargets) {
        const o = v.orders.get(id);
        if (!renderedById.has(id) || (o && !(o.kind === 4 && o.target === 0))) {
            if (o || !renderedById.has(id))
                groundTargets.delete(id);
            continue;
        }
        const k = `${p.x},${p.z}`, sp = spots.get(k);
        if (sp)
            sp.n++;
        else
            spots.set(k, { ...p, n: 1 });
    }
    for (const sp of spots.values()) {
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, sp.x, sp.z), pulse = 0.6 + 0.4 * Math.sin(now / 160), r = mode === "cmd" ? 12 : 6;
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            fx.dot(sp.x + Math.cos(a) * r, gy + 0.6, sp.z + Math.sin(a) * r, mode === "cmd" ? 1.2 : 0.35, [1, 0.35, 0.15], 0.8 * pulse);
        }
        for (let k = -3; k <= 3; k++) {
            fx.dot(sp.x + k * r / 3, gy + 0.6, sp.z, mode === "cmd" ? 0.9 : 0.3, [1, 0.35, 0.15], 0.9);
            fx.dot(sp.x, gy + 0.6, sp.z + k * r / 3, mode === "cmd" ? 0.9 : 0.3, [1, 0.35, 0.15], 0.9);
        }
        if (tag(sp.x, gy + 4, sp.z, `SHELLING<small>${sp.n} unit${sp.n > 1 ? "s" : ""}</small>`, "firing"))
            groundStats.markers++;
    }
}
/** C8: order-bar buttons whose order is given by a map click (what to click). */
const POINTED_ORDERS = { guard: "click the unit to guard", defend: "click the spot to defend", harvest: "click the deposit" };
const tpStats = { loads: 0, unloads: 0, lifts: 0, refusals: "", lines: 0, passengerLines: 0, tags: 0, cables: 0, passengerCam: false, passengerWeapon: "" };
function cargoEvent(e, v) {
    cargo.onEvent(e);
    const typeOf = (id) => { const x = v.entities.get(id) ?? renderedById.get(id); return x ? typeName[x.type] : "unit"; };
    const t = (0, c7b_ts_2.cargoEventText)(e, typeOf, cargo.aboard(e.a));
    if (t) {
        notify(t.text, t.kind);
        tpStats.lines++;
    }
}
function runPlan(p, x, z) {
    if (p.kind === "none") {
        notify(`TRANSPORT · ${p.why}`, "warn");
        snd.ui("error");
        tpStats.refusals = p.why;
        return;
    }
    if (p.kind === "load") {
        act({ kind: "load", units: p.units, vehicle: p.vehicle }, "LOAD");
        tpStats.loads++;
        notify(`LOAD · ${p.units.length} soldier${p.units.length === 1 ? "" : "s"} board the ${typeName[renderedById.get(p.vehicle)?.type ?? 0]}`, "info");
    }
    else if (p.kind === "lift") {
        act({ kind: "lift", lifter: p.lifter, target: p.target }, "AIRLIFT");
        tpStats.lifts++;
        notify(`AIRLIFT · the Mule picks up the ${typeName[renderedById.get(p.target)?.type ?? 0]}`, "info");
    }
    else {
        for (const id of p.vehicles)
            act({ kind: "unload", vehicle: id, x, z }, "UNLOAD");
        tpStats.unloads++;
        notify(`UNLOAD · ${p.vehicles.length === 1 ? "the transport drops off" : `${p.vehicles.length} transports drop off`} at (${Math.round(x)}, ${Math.round(z)})`, "info");
    }
    snd.ui("click");
}
/** K: selected infantry board the transport under the cursor; a selected Mule lifts the vehicle under the cursor. */
function transportLoad(sx, sy) {
    const sel = selectedUnits().map((id) => renderedById.get(id)).filter((e) => !!e).map((e) => ({ id: e.id, type: e.type }));
    if (!sel.length) {
        notify("Select units first (drag a box, or 1..9 for a group)", "warn");
        snd.ui("error");
        return;
    }
    const tid = pickAt(sx, sy, true), te = tid ? renderedById.get(tid) : undefined;
    runPlan((0, c7b_ts_2.loadPlan)(sel, te && !cd.tStructure[te.type] ? { id: te.id, type: te.type } : null, TP_RULES), 0, 0);
}
/** U: selected transports unload (and drop their sling load) at the ground under the cursor. */
function transportUnload(sx, sy) {
    const sel = selectedUnits().map((id) => renderedById.get(id)).filter((e) => !!e).map((e) => ({ id: e.id, type: e.type }));
    const g = groundAt(sx, sy);
    if (!g) {
        notify("UNLOAD · put the cursor on the ground", "warn");
        snd.ui("error");
        return;
    }
    runPlan((0, c7b_ts_2.unloadPlan)(sel, TP_RULES), g[0], g[2]);
}
/** A command-view button armed an order: this click gives its target. */
function runArmed(sx, sy) {
    const a = armedCmd;
    armedCmd = null;
    if (!a)
        return;
    if (a.kind.startsWith("c2:"))
        cmdOrder(a.kind.slice(3), sx, sy);
    else if (a.kind === "ground")
        shellGround(sx, sy);
    else if (a.kind === "load")
        transportLoad(sx, sy);
    else if (a.kind === "unload")
        transportUnload(sx, sy);
    else if (a.kind === "c9deploy")
        c9Deploy(a.data ?? 0, sx, sy); // C9
    else
        armedGroupClick(a, sx, sy);
}
function transportButtons(ids) {
    const types = ids.map((id) => renderedById.get(id)?.type ?? -1).filter((t) => t >= 0);
    const inf = types.some(TP_RULES.infantry), mule = types.some(TP_RULES.lifter), carrier = types.some((t) => TP_RULES.carrier(t) || TP_RULES.lifter(t));
    let h = "";
    if (inf || mule)
        h += `<button data-act="tpArm" data-k="load" data-b="0" data-i="0" class="${armedCmd?.kind === "load" ? "on" : ""}">${inf ? "LOAD" : "LIFT"} · <b>K</b></button>`;
    if (carrier)
        h += `<button data-act="tpArm" data-k="unload" data-b="0" data-i="0" class="${armedCmd?.kind === "unload" ? "on" : ""}">UNLOAD · <b>U</b></button>`;
    if (armedCmd)
        h += `<span class="armed">${armedCmd.label} · right click cancels</span>`;
    return h;
}
/** Per frame: the "n/6 ABOARD · SLUNG" tag over own transports, and the sling cables. */
function transportTags() {
    tpStats.tags = 0;
    tpStats.cables = 0;
    const lim = mode === "cmd" ? 2500 : 300;
    for (const e of rendered) {
        if (e.team !== 0 || !(TP_RULES.carrier(e.type) || TP_RULES.lifter(e.type)))
            continue;
        if (Math.hypot(e.x - eye[0], e.z - eye[2]) > lim)
            continue;
        let seats = 0, pilots = 0;
        for (let j = 0; j < cd.tSeatCount[e.type]; j++)
            if (cd.tSeatRole[e.type * data_ts_1.MAX_SEATS + j] === data_ts_2.SEAT_PASSENGER) {
                seats++;
                if (e.crew & (1 << j))
                    pilots++;
            }
        const sl = cargo.sling(e.id).map((id) => renderedById.get(id)).filter((x) => !!x);
        for (const t of sl) {
            tpStats.cables++;
            for (let k = 1; k < 8; k++) {
                const f = k / 8;
                fx.dot((0, math_ts_1.lerp)(e.x, t.x, f), (0, math_ts_1.lerp)(e.y, t.cy + cd.tRadius[t.type], f), (0, math_ts_1.lerp)(e.z, t.z, f), 0.25, [0.9, 0.85, 0.6], 0.8);
            }
        }
        const n = cargo.aboard(e.id) + pilots;
        if (!n && !sl.length && !selected.has(e.id))
            continue;
        if (tag(e.x, e.cy + cd.tRadius[e.type] + 4, e.z, (0, c7b_ts_2.transportTag)(cargo.aboard(e.id), pilots, seats, sl.map((t) => typeName[t.type])), "tptag"))
            tpStats.tags++;
    }
}
// ---- C7b item 4: stealth tools (w2f): jammer, decoy beacon, bike cloak, the Dart's scout pulse; radar blips; dust storm
const STL = data.constants.stealth ?? {};
const RADAR_MUL = STL.radarRangeMultiplier ?? 0.7, DECOY_S = STL.decoyBeacon?.seconds ?? 20, PULSE_R = STL.scoutPing?.radius ?? 120, PULSE_CD = STL.scoutPing?.cooldownSeconds ?? 20;
const T_RELAY = cd.typeIds.indexOf("relay-tower"), T_DART = cd.typeIds.indexOf("dart");
const JAM_R = Number((data.buildings.find((b) => b.id === "relay-tower")?.mods?.jammer?.radarHideRadius) ?? 150);
const AC_BIKE_CLASS = 1; // data.ts ARMOUR_CLASSES order: infantry, bike, ...
const isBike = (t) => cd.tArmour[t] === AC_BIKE_CLASS && !!cd.tVehicle[t];
const stl = new c7b_ts_3.StealthState();
let radarBlips = new Set(), stlStats = { decoys: 0, pulses: 0, jammerToggles: 0, blips: 0, blipTags: 0, decoyTags: 0, jamRings: 0, jammedTags: 0, enemyDecoys: 0, toolLine: "", radarBlind: false };
let pulseRings = [];
function stealthEvent(e, now) {
    stl.onEvent(e, pilotId, now, dt, DECOY_S);
    if (e.kind === events_ts_1.EV.SCAN) {
        pulseRings.push({ x: e.v1, z: e.v2, start: now });
        snd.sting("sweep", [e.v1, (0, terrain_gen_ts_1.sampleHeight)(hm, e.v1, e.v2), e.v2]);
    }
    const t = (0, c7b_ts_3.stealthEventText)(e, pilotId, (id) => playerName(id), (ty) => typeName[ty] ?? "unit", dt);
    if (t)
        notify(t.text, t.kind);
}
function dropDecoy() { act({ kind: "decoy" }, "DECOY"); stlStats.decoys++; snd.ui("click"); }
function scoutPulse() {
    const e = me ? ent(me.entity) : undefined;
    if (!e || e.type !== T_DART || me.seat !== cd.tDriverSeat[e.type]) {
        notify(`${c7b_ts_3.TOOL_KEY_LABEL} · the scout pulse is the Dart rider's (on foot: decoy beacon)`, "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "pulse" }, "SCOUT PULSE");
    stlStats.pulses++;
    snd.ui("click");
}
function toggleJammer(id) {
    const e = id ? renderedById.get(id) : undefined;
    if (!e || e.type !== T_RELAY || e.team !== 0) {
        notify(`${c7b_ts_3.TOOL_KEY_LABEL} · select one of your Relay Towers to switch its jammer`, "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "jammer", relay: id, on: !stl.jammers.get(id)?.on }, "JAMMER");
    stlStats.jammerToggles++;
    snd.ui("click");
}
/** Per snapshot frame: which enemy contacts are radar-only (drawn as blips), from the newest view and the weather. */
function radarFrame() {
    const v = views[views.length - 1];
    if (!v)
        return;
    const wx = v.weather && v.weather.current >= 0 ? WX_DEFS[v.weather.current] : undefined, w = (0, c7b_ts_3.weatherSensing)(wx?.effects);
    if (w.blind !== stlStats.radarBlind && started)
        notify(w.blind ? "RADAR BLIND · dust storm: radar contacts are lost, only what your units see is shown" : "RADAR BACK · the dust storm is over", w.blind ? "warn" : "info");
    stlStats.radarBlind = w.blind;
    const own = [], foes = [];
    for (const e of v.entities.values()) {
        if (e.team === 0)
            own.push(e);
        else if (e.team !== 255 && !cd.tStructure[e.type])
            foes.push(e);
    }
    radarBlips = (0, c7b_ts_3.radarOnly)(foes, own, { sensor: (t) => cd.tSensor[t], radar: (t) => cd.tRadar[t] === 1, signature: (t) => cd.tSignature[t] || 1, fogCap: cd.fogVisualRange, radarMul: RADAR_MUL }, w);
    stlStats.blips = radarBlips.size;
}
/** Per frame: jammer rings, own decoys, JAMMED spots, scout pulse rings, enemy decoy contacts. */
function stealthFrame(now) {
    stl.prune(now);
    radarFrame();
    stlStats.jamRings = 0;
    for (const [id, j] of stl.jammers) {
        const r = renderedById.get(id);
        if (!j.on || !r)
            continue;
        stlStats.jamRings++;
        const n = 60, pulse = 0.5 + 0.3 * Math.sin(now / 400);
        for (let i = 0; i < n; i++) {
            if (i % 2)
                continue;
            const a = (i / n) * Math.PI * 2, x = r.x + Math.cos(a) * j.radius, z = r.z + Math.sin(a) * j.radius;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.8, z, mode === "cmd" ? 1.6 : 0.6, [0.75, 0.5, 1], pulse);
        }
    }
    pulseRings = pulseRings.filter((p) => now - p.start < 1500);
    for (const p of pulseRings) {
        const f = (now - p.start) / 1200, r = PULSE_R * Math.min(1, f);
        for (let i = 0; i < 64; i++) {
            const a = (i / 64) * Math.PI * 2, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1, z, 1, [1, 0.85, 0.3], Math.max(0, 1 - f));
        }
    }
    for (const d of stl.decoys.values())
        if (now < d.until)
            fx.dot(d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + 1.2, d.z, 0.7, [0.75, 0.5, 1], Math.sin(now / 150) > 0 ? 1 : 0.2);
    // blips: a pulsing dot where the radar has a contact
    for (const id of radarBlips) {
        const e = renderedById.get(id);
        if (e)
            fx.dot(e.x, e.cy + 2, e.z, mode === "cmd" ? 4 : 1.5, [1, 0.35, 0.25], 0.55 + 0.45 * Math.sin(now / 200));
    }
    // the tools line of the kit HUD
    const p = me, ve = p && seated() ? ent(p.entity) : undefined, driver = !!ve && p.seat === cd.tDriverSeat[ve.type];
    stlStats.toolLine = started && p && !dead() ? (0, c7b_ts_3.toolText)({ foot: onFoot(), dart: driver && ve.type === T_DART, bike: driver && isBike(ve.type), decoyUsed: stl.decoyUsed, pulseLeft: stl.pulseLeft(now, PULSE_CD), cloak: stl.bikeCloakText(now) }) : "";
}
function stealthTags(now) {
    stlStats.blipTags = 0;
    stlStats.decoyTags = 0;
    stlStats.jammedTags = 0;
    stlStats.enemyDecoys = 0;
    for (const id of radarBlips) {
        const e = renderedById.get(id);
        if (e && tag(e.x, e.cy + cd.tRadius[e.type] + 4, e.z, "RADAR CONTACT", "blip"))
            stlStats.blipTags++;
    }
    for (const d of stl.decoys.values()) {
        const left = Math.ceil((d.until - now) / 1000);
        if (left > 0 && tag(d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + 4, d.z, `DECOY · ${left} s`, "decoy"))
            stlStats.decoyTags++;
    }
    for (const j of stl.jammedSpots)
        if (tag(j.x, (0, terrain_gen_ts_1.sampleHeight)(hm, j.x, j.z) + 6, j.z, "JAMMED · enemy jammer", "jammed"))
            stlStats.jammedTags++;
    for (const [id, j] of stl.jammers) {
        const r = renderedById.get(id);
        if (j.on && r)
            tag(r.x, r.cy + 26, r.z, `JAMMER ON · ${j.radius} m`, "jamtag");
    }
    // the enemy's decoys come as contacts (DECOY records): the page cannot tell them from a real unit, so they are drawn as one
    const v = views[views.length - 1];
    for (const d of v?.decoys.values() ?? [])
        if (d.team !== 0) {
            stlStats.enemyDecoys++;
            tag(d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + 6, d.z, typeName[d.type] ?? "contact", "contact");
        }
}
// ---- C7b item 6: the call loadout in the match (at a Barracks / Command Core), the heavy weapon pod's weapon, dome hits
const T_BARRACKS = cd.typeIds.indexOf("barracks");
let loDraft = null, podPick = 0, domeFlashes = [];
const loStats = { applied: 0, toggles: 0, full: 0, podOption: -1, domeHits: 0, section: "" };
const CALL_IDS = callRules ? callRules.ids : [];
/** The calls the pilot has now (the snapshot's calls block, else the data default), as call ids. */
function loadoutNow() { const own = views.length ? views[views.length - 1].calls?.own : null, fx = callRules?.fixed ?? []; return own && own.length ? own.filter((c) => !fx.includes(c.call)).map((c) => CALL_IDS[c.call]).filter(Boolean) : (callRules?.defaultLoadout ?? []).map((i) => CALL_IDS[i]); } // ruling 133: the fixed slot 5 is not part of the chosen loadout
/** Weapons the armed call's pod can bring (heavy weapon pod: weaponChoices; else none). */
function podChoices() { if (!armedCall || !callRules)
    return []; const d = callRules.calls[armedCall.call]; return (0, c6_ts_6.callFxKind)(callRules, armedCall.call) === "pod" && d ? d.choices : []; }
/** The loadout block of the production panel: on foot at an own Barracks or Command Core, a draft of the call loadout and APPLY. */
function loadoutSection(b) {
    loStats.section = "";
    if (mode !== "fp" || b.team !== 0 || (b.type !== T_BARRACKS && b.type !== T_CORE) || !callRules)
        return "";
    const slots = loadoutSlots(), now = loadoutNow(), draft = loDraft ?? now;
    const owned = new Set(progression_ui_ts_1.c7a.store?.profile.unlocks.calls ?? CALL_IDS);
    let h = `<div class="ph2">CALL LOADOUT · ${draft.length}/${slots} · changed here, at a supplied Barracks or the Command Core</div><div class="lo">`;
    h += CALL_IDS.filter((id) => (owned.has(id) || now.includes(id)) && !(callRules?.fixed ?? []).includes(CALL_IDS.indexOf(id))).map((id) => `<span class="lo ${draft.includes(id) ? "on" : ""}" data-act="lo" data-k="${id}" data-b="0" data-i="0">${CALL_NAMES[CALL_IDS.indexOf(id)] ?? id}</span>`).join("");
    h += `</div><div class="opt${loDraft && loDraft.join() !== now.join() ? "" : " no"}" data-act="loApply" data-b="0" data-i="0"><span class="n">APPLY LOADOUT</span><small>now: ${now.map((id) => CALL_NAMES[CALL_IDS.indexOf(id)] ?? id).join(", ") || "none"} · pilot weapon: chosen in PROFILE before the match</small></div>`;
    loStats.section = h;
    return h;
}
function loadoutToggle(id) {
    const r = (0, c7b_ts_5.toggleDraft)(loDraft ?? loadoutNow(), id, loadoutSlots());
    loStats.toggles++;
    if (r.full) {
        loStats.full++;
        notify(`LOADOUT FULL · ${loadoutSlots()} slots: take a call out first`, "warn");
        snd.ui("error");
        return;
    }
    loDraft = r.draft;
    snd.ui("click");
}
function loadoutApply() {
    if (!loDraft)
        return;
    if (loOpen && loadoutNotHere()) { // U1: not at a base: kept and sent by itself at the next visit or respawn
        loPending = loDraft.slice();
        loTry = 0;
        loDraft = null;
        notify(`LOADOUT SAVED · ${loPending.map((id) => CALL_NAMES[CALL_IDS.indexOf(id)] ?? id).join(", ") || "no calls"} · applied at a Barracks / your Command Core, or when you respawn`, "info");
        snd.ui("confirm");
        return;
    }
    loPending = null;
    act({ kind: "loadout", calls: loDraft }, "LOADOUT");
    loStats.applied++;
    notify(`LOADOUT · ${loDraft.map((id) => CALL_NAMES[CALL_IDS.indexOf(id)] ?? id).join(", ") || "no calls"}`, "good");
    snd.ui("confirm");
    loDraft = null;
}
// ---- U1: the call loadout panel (K in first person, LOADOUT on the command view's calls bar, CALL LOADOUT in the pause menu)
let loOpen = false, loPending = null, loTry = 0, lastLoHtml = "", lastLoModel = null;
const loStatsU1 = { opened: 0, autoSent: 0, autoApplied: 0 };
const LO_SLOT_RANK = (() => { try {
    return (0, progression_ts_1.progressionRules)(data).milestones.find((m) => m.unlocks === "support-call-slot-3")?.rank ?? null;
}
catch {
    return null;
} })();
/** Is the own structure entity on a supplied point (or on no point: the Core's own ground)? */
function structureSupplied(e) { const p = (0, c4_ts_1.pointAt)(ptStatics, e.x, e.z); return p < 0 || !!ptModels.find((m) => m.index === p)?.supplied; }
/** The own respawn building (Barracks / Command Core) in loadout reach of the pilot on foot, or null. */
function loadoutBase() {
    if (!onFoot() || !bodyRender)
        return null;
    const busy = underConstruction();
    for (const e of rendered) {
        if (e.team !== 0 || (e.type !== T_BARRACKS && e.type !== T_CORE) || busy.has(e.id) || !structureSupplied(e))
            continue;
        if (Math.hypot(e.x - bodyRender.x, e.z - bodyRender.z) <= CREW.refillRadius + cd.tRadius[e.type])
            return e;
    }
    return null;
}
/** Why the loadout cannot be changed now (the sim's rule, w2a loadoutAtBase), or null when it can. */
function loadoutNotHere() {
    if (!me)
        return "no pilot";
    if (dead())
        return null;
    if (!onFoot())
        return "you are in a vehicle";
    return loadoutBase() ? null : "you are away from a Barracks / your Command Core";
}
function toggleLoadoutPanel() {
    if (!callRules) {
        notify("No support calls in this battle", "warn");
        return;
    }
    loOpen = !loOpen;
    snd.ui("click");
    if (loOpen) {
        loStatsU1.opened++;
        fpBuilding = 0;
        rideMenu = false;
        if (buildPanel?.src === "tool")
            buildPanel = null;
        closeCallMenu();
        unlock();
        loDraft = loPending ? loPending.slice() : null;
    }
    else if (mode === "fp")
        lockPointer();
}
function loadoutModelNow() {
    const busy = underConstruction(), supplied = new Set(), built = new Set();
    for (const e of rendered)
        if (e.team === 0 && cd.tStructure[e.type] && !busy.has(e.id)) {
            built.add(cd.typeIds[e.type]);
            if (structureSupplied(e))
                supplied.add(cd.typeIds[e.type]);
        }
    const owned = new Set(progression_ui_ts_1.c7a.store?.profile.unlocks.calls ?? CALL_IDS);
    const nh = loadoutNotHere(), base = nh === null && !dead() ? loadoutBase() : null;
    return (0, u1_loadout_ts_1.loadoutModel)({ data, owned, now: loadoutNow(), draft: loDraft, pending: !!loPending, slots: loadoutSlots(), maxSlots: callRules?.loadoutSize ?? 3, slotRank: LO_SLOT_RANK,
        world: { supplied, built, airless: cd.airless }, fixed: (callRules?.fixed ?? []).map((i) => CALL_IDS[i]), notHere: nh, atName: base ? typeName[base.type] : dead() ? null : null });
}
function updateLoadoutPanel(now) {
    const el = $("loadoutPanel");
    // a saved change goes to the sim by itself once the pilot may change it (down, or at a base); retried every 2 s
    if (loPending && started && !matchLocked()) {
        const cur = loadoutNow();
        if (cur.join() === loPending.join()) {
            loPending = null;
            loStatsU1.autoApplied++;
            notify(`LOADOUT APPLIED · ${cur.map((id) => CALL_NAMES[CALL_IDS.indexOf(id)] ?? id).join(", ") || "no calls"}`, "good");
        }
        else if (loadoutNotHere() === null && now - loTry > 2000) {
            loTry = now;
            loStatsU1.autoSent++;
            act({ kind: "loadout", calls: loPending }, "LOADOUT");
        }
    }
    const show = loOpen && started && !matchLocked() && !pauseOn && !!callRules;
    if (!show) {
        el.style.display = "none";
        lastLoModel = null;
        return;
    }
    const m = loadoutModelNow();
    lastLoModel = m;
    const html = (0, u1_loadout_ts_1.loadoutHtml)(m, mode === "fp");
    if (html !== lastLoHtml) {
        el.innerHTML = html;
        lastLoHtml = html;
    }
    el.style.display = "block";
}
/** A hitscan ray that stopped on a shield dome: a blue flash at the dome's skin. */
function domeShot(sh, now) {
    const domes = zonesNow.filter((z) => z.kind === "shield").map((z) => ({ x: z.x, y: (0, terrain_gen_ts_1.sampleHeight)(hm, z.x, z.z), z: z.z, r: z.radius || 10 }));
    if (!domes.length)
        return;
    if ((0, c7b_ts_5.domeStop)([sh.x1, sh.y1, sh.z1], [sh.x0, sh.y0, sh.z0], domes)) {
        domeFlashes.push({ x: sh.x1, y: sh.y1, z: sh.z1, t: now });
        loStats.domeHits++;
        if (domeFlashes.length > 48)
            domeFlashes.shift();
    }
}
function domeFrame(now) {
    domeFlashes = domeFlashes.filter((f) => now - f.t < 350);
    for (const f of domeFlashes) {
        const k = 1 - (now - f.t) / 350;
        fx.dot(f.x, f.y, f.z, 1.6 * (1.5 - k * 0.5), [0.5, 0.8, 1], k);
        fx.dot(f.x, f.y, f.z, 0.7, [1, 1, 1], k);
    }
}
// ---- C7b item 5: battle groups (w3b): the player's AI squads with a lieutenant, standing orders, auto-defend
let autoDefendOn = false, bgPanelHtml = "", patrolPoints = 0;
const bgStats = { created: 0, orders: 0, waypoints: 0, reinforce: 0, autoDefend: 0, lines: 0, memberTags: 0, markers: 0 };
function latestGroups() { return views.length ? views[views.length - 1].groups ?? [] : []; }
function groupEvent(e, v) {
    const typeOf = (id) => { const x = v.entities.get(id) ?? renderedById.get(id); return x ? typeName[x.type] : "unit"; };
    const t = (0, c7b_ts_4.groupEventText)(e, typeOf, (ty) => typeName[ty] ?? "unit");
    if (t) {
        notify(t.text, t.kind);
        bgStats.lines++;
    }
}
/** V in the command view: a new battle group of the selected units (the next free label). */
function newBattleGroup() {
    const ids = selectedUnits().filter((id) => { const e = renderedById.get(id); return !!e && e.team === 0 && !cd.tPilot[e.type]; });
    if (!ids.length) {
        notify(`BATTLE GROUP · select units first, then ${c7b_ts_4.GROUP_KEY_LABEL}`, "warn");
        snd.ui("error");
        return;
    }
    const label = (0, c7b_ts_4.nextGroupLabel)(latestGroups(), 9);
    if (!label) {
        notify("BATTLE GROUP · all 9 battle groups are in use", "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "groupSet", label, ids, add: true }, "BATTLE GROUP");
    bgStats.created++;
    notify(`BATTLE GROUP ${label} · ${ids.length} unit${ids.length === 1 ? "" : "s"} · give it a standing order in the list`, "good");
    snd.ui("confirm");
}
/** A side-list button: order (arms a map click for a point), reinforce, select, auto-defend. */
function groupButton(k, label) {
    const g = latestGroups().find((x) => x.label === label);
    if (k === "new") {
        newBattleGroup();
        return;
    }
    if (k === "auto") {
        autoDefendOn = !autoDefendOn;
        act({ kind: "autoDefend", on: autoDefendOn }, "AUTO-DEFEND");
        bgStats.autoDefend++;
        notify(`AUTO-DEFEND ${autoDefendOn ? "ON · idle units defend the Command Core" : "OFF"}`, "info");
        snd.ui("click");
        return;
    }
    if (!g)
        return;
    if (k === "hold")
        armedCmd = { kind: "bgHold", label: `GROUP ${label} HOLD · click the point to hold`, data: label };
    else if (k === "assault")
        armedCmd = { kind: "bgAssault", label: `GROUP ${label} ASSAULT · click the target point`, data: label };
    else if (k === "patrol") {
        armedCmd = { kind: "bgPatrol", label: `GROUP ${label} PATROL · click the points in order · Enter or right click ends`, data: label };
        patrolPoints = 0;
    }
    else if (k === "escort") {
        act({ kind: "groupOrder", label, order: c7b_ts_4.GO_ESCORT, x: 0, z: 0, target: 0 }, "GROUP ORDER");
        bgStats.orders++;
    }
    else if (k === "reinforce") {
        act({ kind: "groupReinforce", label, on: !g.reinforce }, "REINFORCE");
        bgStats.reinforce++;
    }
    else if (k === "select") {
        selected.clear();
        selBuilding = 0;
        for (const id of g.members)
            selected.add(id);
    }
    else if (k === "disband") {
        act({ kind: "groupSet", label, ids: g.members.slice(0, 64), add: false }, "BATTLE GROUP");
    }
    snd.ui("click");
}
/** The map click of an armed group order. */
function armedGroupClick(a, sx, sy) {
    const g = groundAt(sx, sy), label = a.data ?? 0;
    if (!g || !label) {
        notify("put the cursor on the ground", "warn");
        return;
    }
    if (a.kind === "bgHold" || a.kind === "bgAssault") {
        act({ kind: "groupOrder", label, order: a.kind === "bgHold" ? c7b_ts_4.GO_HOLD : c7b_ts_4.GO_ASSAULT, x: g[0], z: g[2], target: 0 }, "GROUP ORDER");
        bgStats.orders++;
    }
    else if (a.kind === "bgPatrol") {
        if (patrolPoints === 0) {
            act({ kind: "groupOrder", label, order: c7b_ts_4.GO_PATROL, x: g[0], z: g[2], target: 0 }, "GROUP ORDER");
            bgStats.orders++;
        }
        else {
            act({ kind: "groupWaypoint", label, x: g[0], z: g[2] }, "PATROL POINT");
            bgStats.waypoints++;
        }
        patrolPoints++;
        armedCmd = { kind: "bgPatrol", label: `GROUP ${label} PATROL · ${patrolPoints} point${patrolPoints === 1 ? "" : "s"} · click the next · Enter or right click ends`, data: label }; // keeps collecting points
    }
    snd.ui("click");
}
/** The side list (command view): every battle group with its status and buttons, auto-defend, the difference to control groups. */
function groupPanel() {
    const el = $("bgPanel");
    let h = "";
    // shown only while battle groups exist (it must not cover the map otherwise); V and AUTO-DEFEND are on the order bar
    if (started && mode === "cmd" && latestGroups().length) {
        const tn = (id) => { const e = renderedById.get(id); return e ? typeName[e.type] : "unit"; };
        h = `<div class="ph">BATTLE GROUPS · ${c7b_ts_4.GROUP_KEY_LABEL}: new from the selection</div>`;
        for (const g of latestGroups()) {
            const r = (0, c7b_ts_4.groupRow)(g, tn);
            h += `<div class="bg"><span class="n">${r.title}</span><small>${r.detail}</small><span class="b">`
                + ["hold", "assault", "patrol", "escort"].map((k) => `<button data-act="bg" data-k="${k}" data-b="${g.label}" data-i="0" class="${g.order === k ? "on" : ""}">${k.toUpperCase()}</button>`).join("")
                + `<button data-act="bg" data-k="reinforce" data-b="${g.label}" data-i="0" class="${g.reinforce ? "on" : ""}">REINFORCE ${g.reinforce ? "ON" : "OFF"}</button><button data-act="bg" data-k="select" data-b="${g.label}" data-i="0">SELECT</button></span></div>`;
        }
        h += `<small class="help">${c7b_ts_4.GROUP_HELP}</small>`;
    }
    if (h !== bgPanelHtml) {
        bgPanelHtml = h;
        el.innerHTML = h;
        el.style.display = h ? "block" : "none";
    }
}
/** Map markers: a group's hold / assault point, its patrol route, "G1" over its members (command view). */
function groupTags() {
    bgStats.memberTags = 0;
    bgStats.markers = 0;
    if (mode !== "cmd")
        return;
    for (const g of latestGroups()) {
        for (const id of g.members) {
            const e = renderedById.get(id);
            if (e && tag(e.x, e.cy + cd.tRadius[e.type] + 6, e.z, `G${g.label}`, "bgtag"))
                bgStats.memberTags++;
        }
        const pts = g.route.length ? g.route : [];
        pts.forEach(([x, z], i) => { if (tag(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 4, z, `G${g.label} ${g.order.toUpperCase()}${g.order === "patrol" ? ` ${i + 1}${i === g.leg ? " ◀" : ""}` : ""}`, "bgmark"))
            bgStats.markers++; });
    }
}
function groupFrame(now) {
    void now;
    groupPanel();
    c9ReservePanel(); // C9
    if (mode !== "cmd")
        return;
    for (const g of latestGroups()) {
        const pts = g.route;
        for (let i = 0; i < pts.length; i++) {
            const [x0, z0] = pts[i], [x1, z1] = g.order === "patrol" ? pts[(i + 1) % pts.length] : pts[i];
            for (let k = 0; k < 24; k++) {
                const f = k / 24, x = (0, math_ts_1.lerp)(x0, x1, f), z = (0, math_ts_1.lerp)(z0, z1, f);
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1, z, 1.6, [1, 0.8, 0.3], 0.7);
            }
            for (let k = 0; k < 24; k++) {
                const a = (k / 24) * Math.PI * 2;
                fx.dot(x0 + Math.cos(a) * 12, (0, terrain_gen_ts_1.sampleHeight)(hm, x0, z0) + 1, z0 + Math.sin(a) * 12, 1.4, [1, 0.8, 0.3], 0.8);
            }
        }
    }
}
// ---- C7b item 2: join (drop pod) and leave; the enemy scaling in the roster
const SCALING = data.constants.coop?.scaling;
let pods = [], coopStats = { joined: 0, left: 0, podsFalling: 0, podsLanded: 0, podTags: 0, scaling: "" };
const slotName = (player) => roster.find((r) => r.slot === player)?.name ?? `Player ${player + 1}`;
function coopEvent(e, now) {
    const t = (0, c7b_ts_1.coopEventText)(e, pilotId, slotName(e.b), dt);
    if (t)
        notify(t.text, t.kind);
    setTimeout(showRoster, 0); // the scaling line follows the player count
    if (e.kind === events_ts_1.EV.PLAYER_JOINED) {
        coopStats.joined++;
        const p = (0, c7b_ts_1.dropPodOf)(e, now, dt, e.a === pilotId ? "you" : slotName(e.b));
        if (p) {
            pods.push(p);
            if (pods.length > 8)
                pods.shift();
        }
        snd.ui("click");
    }
    else {
        coopStats.left++;
        pods = pods.filter((p) => p.pilot !== e.a);
    }
}
/** Per frame: drop pods falling onto the Command Core in the last 2.5 s, the landing burst, the countdown tags. */
function podFrame(now) {
    coopStats.podsFalling = 0;
    for (const p of pods) {
        const left = (p.landAt - now) / 1000, gy = (0, terrain_gen_ts_1.sampleHeight)(hm, p.x, p.z), h = (0, c6_ts_6.podHeight)(left);
        if (h !== null) {
            coopStats.podsFalling++;
            fx.dot(p.x, gy + h + 1.6, p.z, 1.8, [0.6, 0.85, 1], 1);
            fx.dot(p.x, gy + h + 1.6, p.z, 1.1, [1, 1, 1], 1);
            for (let i = 1; i < 12; i++)
                fx.dot(p.x, gy + h + 1.6 + i * 4, p.z, 1 - i * 0.07, [0.5, 0.75, 1], 0.6 - i * 0.045);
        }
        if (!p.landed && left <= 0) {
            p.landed = true;
            coopStats.podsLanded++;
            if (isFrontline())
                flDust(p.x, gy, p.z, 3);
            else
                fx.explosion(p.x, gy, p.z, 3, 0);
            snd.sting("landing", [p.x, gy, p.z]);
        }
    }
    pods = pods.filter((p) => now - p.landAt < 5000);
}
function podTags(now) {
    coopStats.podTags = 0;
    for (const p of pods) {
        const left = (p.landAt - now) / 1000, gy = (0, terrain_gen_ts_1.sampleHeight)(hm, p.x, p.z);
        if (tag(p.x, gy + 30, p.z, left > 0 ? `PILOT INBOUND · ${escHtml(p.name)}<small>drop pod · ${Math.ceil(left)} s</small>` : `PILOT LANDED · ${escHtml(p.name)}`, "podtag"))
            coopStats.podTags++;
    }
}
function updateHud(now, frameDt) {
    layoutHud(now);
    stanceFrame(now, frameDt);
    tipFrame(now);
    c6Frame(now, frameDt);
    podFrame(now);
    stealthFrame(now);
    groupFrame(now);
    domeFrame(now);
    drawNetTags(now);
    hullCritical = false;
    updateCallHud(now);
    updateDanger(now);
    const p = me, foot = onFoot(), seat = seated(), isDead = dead();
    const v = views[views.length - 1];
    const veh = seat && p ? v?.entities.get(p.entity) : undefined;
    // ---- status panel: pilot on foot or the vehicle and seat
    if (p) {
        const vt = veh ? veh.type : -1;
        $("stName").textContent = isDead ? "PILOT DOWN" : gunSeated() ? `PILOT · ${SENTRY_NAME.toUpperCase()} GUNNER` : sheltered() ? `PILOT · IN THE ${shelterName.toUpperCase()}` : foot ? "PILOT · ON FOOT" : veh ? `${typeName[vt]} · ${seatLabel(vt, p.seat)}` : "PILOT";
        $("stState").textContent = isDead ? (p.respawnTicks > 0 ? `${pods.some((q) => q.pilot === pilotId && !q.landed) ? "PILOT INBOUND · drop pod lands" : "respawn"} in ${Math.ceil(p.respawnTicks * dt)} s` : "waiting for a Barracks or Command Core") : gunSeated() ? (me && kindOfType[renderedById.get(me.entity)?.type ?? -1] === "droppod" ? s2_pod_ts_1.POD_STATUS : "inside the gun · mouse aims, LMB fires · F / E leave") : sheltered() ? `inside the ${shelterName} · cannot be hit` : mode === "cmd" ? (foot ? "holding position · returning fire" : "seat on autopilot · holding, returning fire") : foot ? (p.airborne === 2 ? "EJECTED · descending" : p.airborne === 1 ? "airborne" : crouchHeld() ? "crouched" : "on the ground") : veh && veh.driverless && p.seat === cd.tDriverSeat[vt] ? "sliding into the driver seat…" : seatRoleNow() === data_ts_2.SEAT_PASSENGER ? "passenger · your personal weapon where the seat mounts it" : "direct control";
        document.body.classList.toggle("inVehicle", !!veh);
        if (veh)
            lastRideType = vt;
        else if (!isDead)
            lastRideType = -1;
        if (veh) {
            const hullF = veh.hullFraction, shF = veh.shield, tr = tracks.get(veh.id);
            hullCritical = hullF < 0.25;
            setBar("vHull", hullF, `${Math.ceil(hullF * cd.tHp[vt])} / ${cd.tHp[vt]}`, hullCritical ? "crit" : "");
            // ruling 15 recharge: 5 s after the last damage (sim ticks since the last hit or shield-hit flag seen on the
            // vehicle), then rechargeFractionPerSecond of the full shield per second until full
            const recharging = !!tr && now - tr.shieldUpAt < 700 && shF < 0.999;
            const sinceHit = tr && tr.damagedTick > 0 ? (lastTick - tr.damagedTick) * dt : 1e9;
            const waitS = Math.max(0, SHIELD_DELAY_S - sinceHit);
            const delayEl = $("shDelay");
            shieldHud = { waiting: false, wait: 0, recharging, text: "" };
            if (cd.tShield[vt] > 0) {
                const maxSh = cd.tShield[vt], cur = Math.ceil(shF * maxSh);
                let note = "";
                if (shF < 0.999 && waitS > 0.05 && sinceHit < SHIELD_DELAY_S + 0.5) {
                    note = `<span class="shnote wait">recharge in ${waitS.toFixed(1)} s</span>`;
                    shieldHud.waiting = true;
                    shieldHud.wait = waitS;
                }
                else if (recharging)
                    note = `<span class="shnote go">RECHARGING +${Math.round(SHIELD_RATE * maxSh)}/s</span>`;
                const html = `${shF <= 0 ? "DOWN" : `${cur} / ${maxSh}`}${note ? " · " + note : ""}`;
                $("vShieldFill").style.width = pct0(shF);
                if ($("vShieldText").dataset.h !== html) {
                    $("vShieldText").innerHTML = html;
                    $("vShieldText").dataset.h = html;
                }
                $("vShieldBar").className = "bar" + (shF <= 0 ? " down" : "") + (tr && now - tr.shieldHitAt < 280 ? " flash" : "") + (recharging ? " up" : "");
                shieldHud.text = $("vShieldText").textContent ?? "";
                delayEl.classList.toggle("on", shieldHud.waiting);
                if (shieldHud.waiting)
                    delayEl.firstChild.style.width = pct0(1 - waitS / SHIELD_DELAY_S);
            }
            else {
                setBar("vShield", 0, "none", "nosh");
                delayEl.classList.remove("on");
            } // C11 (ruling 43 / 90): bikes have no shield: no bar
            $("vShieldRow").classList.toggle("nosh", !(cd.tShield[vt] > 0));
            if (cd.tShield[vt] > 0 && c11ShieldsOff()) {
                $("vShieldBar").className = "bar off";
                const t = "OFFLINE · solar flare";
                if ($("vShieldText").dataset.h !== t) {
                    $("vShieldText").textContent = t;
                    $("vShieldText").dataset.h = t;
                }
            } // C11 (ruling 68)
            // seat diagram: who is in which seat
            const seats = seatsOf(veh);
            const html = seats.map((s) => `<span class="seat ${s.me ? "me" : s.player ? "pl" : s.occ ? "ai" : "free"}" title="${seatLabel(vt, s.j)}">${s.role === data_ts_1.SEAT_DRIVER ? "D" : s.role === data_ts_1.SEAT_GUNNER ? "G" : "P"}<small>${s.me ? "YOU" : s.player ? "P" : s.occ ? "AI" : "—"}</small></span>`).join("");
            if (html !== lastSeatHtml) {
                $("seatDiag").innerHTML = html;
                lastSeatHtml = html;
            }
            c11AmmoFrame(veh.id, vt); // C11 (ruling 55): aircraft ammunition
            f2LaserFrame(veh.id, vt, me?.seat === cd.tDriverSeat[vt]); // F2 (ruling 91): Lancer laser charge / cooldown / heat
            boostFrame(veh.id, vt, me?.seat === cd.tDriverSeat[vt]); // ruling 108: Dart Scout boost meter
        }
        // the pilot's own bars (kept while seated)
        const shDown = !isDead && p.shield <= 0;
        setBar("pHealth", p.hp, `${Math.ceil(p.hp * PILOT_HP)} / ${PILOT_HP}`, p.hp < 0.35 ? "low" : "");
        setBar("pShield", p.shield, shDown ? "DOWN" : `${Math.ceil(p.shield * PILOT_SH)} / ${PILOT_SH}`, (shDown ? "down" : "") + (now < playerShieldFlashUntil ? " flash" : ""));
        setBar("pEnergy", p.energy, `${Math.round(p.energy * CREW.energyMax)} / ${CREW.energyMax}`, p.energy < 0.2 ? "low" : "");
        setBar("pJet", p.jet, p.jet >= 0.999 ? "free burn full" : `${(p.jet * CREW.jetFreeBurnSeconds).toFixed(1)} s free${p.jet <= 0.001 ? " · energy" : ""}`, p.jet <= 0.001 ? "low" : "");
        // energy refills here: within the refill radius of a friendly Barracks / Command Core / Field Depot (ruling 17)
        let refill = null;
        if (foot && bodyRender)
            for (const e of rendered)
                if (e.team === 0 && cd.tEnergyRefill[e.type] && Math.hypot(e.x - bodyRender.x, e.z - bodyRender.z) - cd.tRadius[e.type] - PILOT_R <= CREW.refillRadius) {
                    refill = e;
                    break;
                }
        const rf = $("refill");
        rf.style.display = refill ? "block" : "none";
        if (refill) {
            rf.textContent = `ENERGY REFILLS HERE · ${typeName[refill.type]}${p.energy < 0.999 ? " · +" + Math.round(CREW.refillPerTick / dt) + "/s" : " · full"}`;
            hudSeen.refill++;
        }
    }
    document.body.classList.toggle("onFoot", foot);
    document.body.classList.toggle("inBunker", !foot && !!veh && isBunker(veh.type)); // B1: the bunker's key line
    document.body.classList.toggle("pilotDowned", !!p && p.state === c6_ts_1.PILOT_DOWNED); // C8 (QA4 bug 15): the downed hint, not the vehicle one
    document.body.classList.toggle("isDead", isDead);
    document.body.classList.toggle("pilotDead", isDead && started);
    if (isDead) {
        aimPick = null;
        scoped = false;
    }
    // ---- weapons panel
    {
        let html = "";
        station = stationOf(me); // gunnerMode (T) may have changed since the last snapshot
        b1Stats.mount = -1;
        b1Stats.mounts = 0;
        const cdFrac0 = (g) => station.cooldown[g] <= 0.002 ? 1 : (0, math_ts_1.clamp)(1 - station.cooldown[g], 0, 1);
        // automatic weapons: no reload ring between shots (it would refill several times a second); FIRING while held
        const auto = (g) => isAuto(station.weapon[g]);
        const firing = (g) => auto(g) && lmb && !panelOpen() && now - ownShotAt < cd.wPeriod[station.weapon[g]] * 1000 + 250;
        const cdFrac = (g) => auto(g) ? 1 : cdFrac0(g);
        const stText = (g, idle) => firing(g) ? "FIRING" : cdFrac(g) >= 1 ? "READY" : idle;
        if (foot) {
            const rows = [[W_CARBINE, 0], [W_RIFLE, 1], [-1, -1], [-1, -2]];
            if (isFrontline()) { // Frontline: 1 slot 1 gun · 2 role weapon · 3 slot 3 weapon (from its pod) · G grenade
                const hv3 = heavyNow(), w = flWeapons();
                const r3 = hv3 >= 0 ? `${wName(hv3)} <small>from the pod</small>` : `<span style="opacity:0.6">Slot 3 empty <small>call the pod: Z</small></span>`;
                const names = [flName(w.gun), flName(w.role), r3];
                html = names.map((n, i) => `<div class="wrow ${kit === i ? "sel" : ""}"><span class="k">${i + 1}</span><span class="n">${n}</span><span class="st">${i < 2 ? stText(i, "CYCLING") : hv3 >= 0 ? "READY" : ""}</span></div>`).join("") + flAmmoHtml(v, me);
            }
            else {
            const bt = bodyRender ? (0, c4_ts_1.buildToolState)(ptStatics, v?.points, v?.construction, 0, bodyRender.x, bodyRender.z) : null;
            const hv = heavyNow();
            html = rows.map(([w, g], i) => `<div class="wrow ${kit === i ? "sel" : ""}${i === 1 && hv >= 0 ? " heavy" : ""}"><span class="k">${i + 1}</span><span class="n">${i === 1 && hv >= 0 ? `${wName(hv)} <small>HEAVY · from the pod</small>` : KIT_NAMES[i]}${i === 1 && hv >= 0 ? "" : i === 1 && isFrontline() ? "" : i === 1 ? " <small>RMB scope</small>" : i === 2 ? " <small>hold LMB at a hull</small>" : i === 3 ? " <small>LMB: build menu</small>" : ""}</span><span class="st">${g >= 0 ? stText(g, "CYCLING") : g === -2 ? (bt?.ok ? "READY" : "NOT HERE") : (p && p.energy > 0 ? `${Math.round(p.energy * CREW.energyMax)} energy` : "NO ENERGY")}</span>${g >= 0 ? `<i><b style="width:${(cdFrac(g) * 100).toFixed(0)}%"></b></i>` : ""}</div>`).join("") + `${isFrontline() ? flAmmoHtml(v, me) : `<div class="note">no ammunition in the sim yet: no reload · wheel / 1-4 switch</div>`}`;
            }
        }
        else if (veh && p) {
            // group 0 is the LIVE weapon (LMB); a driver with an empty gunner seat sees the other one, silent, and T
            const rows = [];
            const driver = p.seat === cd.tDriverSeat[veh.type];
            for (let g = 0; g < 2; g++) {
                if (station.weapon[g] < 0)
                    continue;
                const gunnerSide = driver && station.gunnerAvail && !station.secondary && (g === 0) === station.gunnerLive; // C8 (QA4 bug 13): no "gunner seat" without one
                const tagHtml = g === 0 ? `<span class="live">LIVE</span>` : station.secondary ? `<span class="live">LIVE</span>` : `<span class="off">silent · T</span>`;
                rows.push(`<div class="wrow ${g === 0 ? "sel" : ""}"><span class="k">${g === 0 ? "LMB" : station.secondary ? "RMB" : "T"}</span><span class="n">${weaponName[station.weapon[g]]}${tagHtml}${gunnerSide ? " <small>empty gunner seat</small>" : driver && station.gunnerAvail ? " <small>your own</small>" : ""}</span><span class="st">${g === 0 ? stText(g, "RELOAD") : ""}</span>${g === 0 ? `<i><b style="width:${(cdFrac(g) * 100).toFixed(0)}%"></b></i>` : ""}</div>`);
            }
            if (driver && isFrontline() && FL_THIRD_TYPES.has(veh.type)) { // Frontline: the mech's arc lance on R
                const lw = cd.weaponIds.indexOf((data.constants.frontline?.vehicleThirdFire ?? [])[0] ?? "");
                if (lw >= 0)
                    rows.push(`<div class="wrow"><span class="k">R</span><span class="n">${weaponName[lw]}<span class="live">LIVE</span> <small>hold: charge</small></span><span class="st"></span></div><div class="note">RMB hold: lock up to 4 targets (${flLocksNow.length} locked) · release: fire · Space: jump jets</div>`);
            }
            if (driver && station.gunnerAvail)
                rows.push(`<div class="note">T: ${station.gunnerLive ? "back to your own weapon" : "take the empty gunner seat's weapon"} (never both)</div>`);
            if (isBunker(veh.type)) { // B1: which mount of how many
                const ve = ent(veh.id), n = ve ? bunkerFitted(ve.crew) : 1;
                b1Stats.mount = p.seat;
                b1Stats.mounts = n;
                rows.unshift(`<div class="note"><b>BUNKER · MOUNT ${p.seat + 1}/${n}</b>${n > 1 ? " · X next mount" : " · more mounts at fortification level 2 and 3"}</div>`);
            }
            { // C9 (fix-qa2 item d): energy weapons spend team gas per shot
                const live = [station.weapon[0], station.secondary ? station.weapon[1] : -1].filter((w) => w >= 0), gps = (0, c9_ts_1.gasPerSecond)(live, cd.wGas, cd.wPeriod);
                const minShot = Math.min(...live.filter((w) => cd.wGas[w] > 0).map((w) => cd.wGas[w]), Infinity);
                const el = (0, c9_ts_1.energyLine)(gps, minShot, teamRes?.gas ?? 0);
                if (el)
                    rows.push(el);
                c9Stats.gasPerS = gps;
                c9Stats.noGasHud = el.includes(c9_ts_1.NO_GAS_TEXT);
            }
            html = rows.join("") || `<div class="note">this seat has no weapon</div>`;
            liveWeapon = station.weapon[0] >= 0 ? weaponName[station.weapon[0]] : "";
        }
        else if (p && p.state === c6_ts_1.PILOT_DOWNED)
            html = `<div class="note">DOWNED · no weapon until revived</div>`; // C8 (QA4 bug 15)
        if (html !== lastWpnHtml) {
            $("wpnList").innerHTML = html;
            lastWpnHtml = html;
        }
        // reload ring around the reticle (the active fire group)
        const g = foot ? (kit === 1 ? 1 : 0) : 0, frac = cdFrac(g), rdy = frac >= 1 || (foot && kit >= 2);
        const ret = $("reticle"), ring = ret.querySelector(".reload");
        ring.style.strokeDashoffset = String(rdy || !p || isDead ? 94.25 : 94.25 * (1 - frac));
        ret.classList.toggle("reloading", !rdy && !isDead);
        const fir = !isDead && (!foot || kit < 2) && firing(g);
        ret.classList.toggle("firing", fir);
        $("reloadTag").classList.toggle("on", !rdy && !isDead && !foot);
        reticleState = isDead ? "dead" : fir ? "firing" : rdy ? "ready" : "reloading";
        if (reticleState !== lastReticleState) {
            reticleToggles++;
            lastReticleState = reticleState;
        }
    }
    // ---- first-person prompts: enter (vehicle and seat), production, torch
    let prompt = "";
    if (mode === "fp" && foot && started) {
        const nv = nearVehicle();
        const de = nv ? ent(nv.id) : undefined;
        if (nv && de && !hijack)
            prompt = enterPrompt(nv, de); // during a hijack the ring and its banner say it all
        else {
            const sg = sentryNear();
            if (sg) {
                prompt = (0, c1_crew_ts_1.gunSeatPrompt)(SENTRY_NAME, false);
                c1Stats.prompt = prompt;
            }
            else {
                const sh = shelterNear();
                if (sh) {
                    shelterStats.prompt++;
                    prompt = `<b>F</b> Enter ${(0, f3_citadel_ts_1.seatName)(SEAT_KINDS[sh.type], typeName[sh.type])} <small>command view · cannot be hit</small>`;
                }
            }
        } // ruling 121; C1 ruling 125
        const nb = nearBuilding();
        if (nb)
            prompt += `${prompt ? " · " : ""}<b>B</b> ${typeName[nb.type]} production`;
        if (bodyRender) { // F3: a heavy weapon pod close by: walk onto it to take its weapon
            const pz = zonesNow.find((z) => z.kind === "pod" && z.own !== false && Math.hypot(z.x - bodyRender.x, z.z - bodyRender.z) < 14);
            if (pz) {
                heavyStats.near++;
                prompt += `${prompt ? " · " : ""}${(callRules?.fixed ?? []).includes(pz.call) ? "ROCKET TUBE DROP" : "HEAVY WEAPON POD"} · <b>walk onto it</b> to take the ${pz.label.split(" · ")[1] ?? "weapon"}${heavyNow() >= 0 ? " (replaces yours)" : ""}`;
            }
        }
        if (kit === KIT_BUILD && placing && placing.src === "tool")
            prompt += `${prompt ? " · " : ""}PLACING ${placing.name.toUpperCase()} · <b>LMB</b> place · <b>Shift+LMB</b> several · <b>R</b> / <b>Q E</b> / wheel rotate · <b>RMB</b> cancel`;
        else if (kit === KIT_BUILD && bodyRender && !buildPanel) {
            const bt = (0, c4_ts_1.buildToolState)(ptStatics, v?.points, v?.construction, 0, bodyRender.x, bodyRender.z);
            prompt += `${prompt ? " · " : ""}${bt.ok ? bt.text.replace("LMB", "<b>LMB</b>") : bt.text}`;
        }
        if (kit === 2 && !isFrontline()) { // Frontline: key 3 is the slot 3 weapon, never the torch
            const tt = torchTarget();
            if (tt)
                prompt += `${prompt ? " · " : ""}<b>LMB</b> repair ${typeName[tt.type]} · hull ${Math.round(tt.hp * cd.tHp[tt.type])}/${cd.tHp[tt.type]}`;
            else if (!prompt)
                prompt = `Repair torch · get within ${CREW.torchRange} m of a damaged friendly hull`;
        }
    }
    else if (mode === "fp" && seat && veh && started && isBunker(veh.type)) {
        const ve = ent(veh.id), n = ve ? bunkerFitted(ve.crew) : 1;
        prompt = `<b>F</b> climb out · ${n > 1 ? `<b>X</b> next mount (${n}) · ` : ""}hold <b>E</b> eject`; // B1
    }
    else if (mode === "fp" && seat && veh && started) {
        const driver = p.seat === cd.tDriverSeat[veh.type];
        prompt = `<b>F</b> climb out · <b>X</b> next seat · hold <b>E</b> eject${driver && station.gunnerAvail ? ` · <b>T</b> ${station.gunnerLive ? "own weapon" : "gunner weapon"}` : ""}${!driver && seatRoleNow() === data_ts_1.SEAT_GUNNER ? " · <b>G</b>/<b>MMB</b> ping: your AI driver goes there" : ""}`; // C8 (QA4 bug 13): gunners only
    }
    prompt = unitPrompt(kitPrompt(prompt));
    const pe = $("prompt");
    pe.style.display = prompt ? "block" : "none";
    if (pe.dataset.h !== prompt) {
        pe.innerHTML = prompt;
        pe.dataset.h = prompt;
    }
    hudSeen.prompt = pe.textContent ?? "";
    b1Stats.prompt = hudSeen.prompt;
    // ---- eject: hold E (ring); ruling 34: at hull zero the sim ejects the crew itself (the "EJECTED" notice)
    // (real time since the key went down: at low frame rates a per-frame sum would stretch the hold)
    if (seat && mode === "fp" && keys.has("KeyE") && !ejectSent && eDown > 0) {
        ejectHeld = (now - eDown) / 1000;
        if (ejectHeld >= EJECT_HOLD_S) {
            act({ kind: "eject" }, "EJECT");
            ejectSent = true;
        }
    }
    else if (!keys.has("KeyE"))
        ejectHeld = 0;
    const ring = $("ejectRing");
    ring.style.display = seat && ejectHeld > 0 && !ejectSent ? "block" : "none";
    ring.querySelector(".prog").style.strokeDashoffset = String(150.8 * (1 - (0, math_ts_1.clamp)(ejectHeld / EJECT_HOLD_S, 0, 1)));
    const ejShow = now < ejectedUntil && started && !isDead;
    $("ejected").style.display = ejShow ? "flex" : "none";
    if (ejShow)
        hudSeen.ejected++;
    $("crit").style.display = hullCritical && started && seat ? "block" : "none";
    // a bike has no window at hull zero (ruling 26): the low-hull warning says so, and how to get off in time
    critText = hullCritical && veh && !autoEjects(veh.type) ? "HULL CRITICAL · A BIKE DOES NOT EJECT YOU · GET OFF NOW (F)" : "HULL CRITICAL";
    if ($("crit").textContent !== critText)
        $("crit").textContent = critText;
    if (hullCritical && started && seat) {
        snd.alarm(now);
        hudSeen.critWarn++;
    }
    const alarm = now < alarmUntil && !hullCritical;
    const al = $("alert");
    al.style.display = alarm && !isDead ? "block" : "none";
    al.textContent = "UNDER FIRE · TAB TO RETURN";
    c11AshFrame(now, veh ? veh.type : -1); // C11 (ruling 67): ash fall: LAND NOW
    // ---- pilot down: overlay with the sim's respawn countdown
    const deadEl = $("dead");
    deadEl.style.display = isDead && started ? "flex" : "none";
    if (isDead && started && p) {
        hudSeen.dead++;
        $("deadText").innerHTML = p.respawnTicks > 0 ? `Respawn on foot in <b>${Math.ceil(p.respawnTicks * dt)} s</b> at the nearest Barracks or Command Core · spectating` : `Waiting for a Barracks or Command Core to respawn at`;
        if (isFrontline()) // Frontline: the Mule ride to the chosen lane
            $("deadText").innerHTML += `<br>${flLane === 3 ? "You respawn at the <b>COMMAND CORE</b> (no ride)" : `A Mule flies you to the <b>${["TOP", "MID", "BOTTOM"][flLane]}</b> lane front`} · press <b>1</b> top · <b>2</b> mid · <b>3</b> bottom · <b>4</b> stay at the Core`;
    }
    // ---- top bar: stockpile, pilot reserve (C11: in place of Command Points), units (both views)
    const units = rendered.filter((e) => e.team === 0 && !cd.tStructure[e.type] && !cd.tPilot[e.type]).length;
    const eh = teamRes ? (0, c2_ts_1.econHud)(teamRes.ore, teamRes.gas, views.length ? views[views.length - 1].mining : null) : null;
    const tb = teamRes && eh ? `<span${eh.oreFull ? ' style="color:#ffd23c"' : ""}>${eh.ore.replace(/^ORE (\d+)/, "ORE <b>$1</b>")}</span><span${eh.gasFull ? ' style="color:#ffd23c"' : ""}>${eh.gas.replace(/^GAS (\d+)/, "GAS <b>$1</b>")}</span>${(0, c11_ts_1.pilotHud)(teamRes.pilots).html}<span>UNITS <b>${units}</b></span>${c9NoGasTop()}${stratTopbar()}` : "";
    if ($("topbar").dataset.h !== tb) {
        $("topbar").innerHTML = tb;
        $("topbar").dataset.h = tb;
    }
    const obj = objectiveText() + flPaceHtml();
    if ($("objective").dataset.h !== obj) {
        $("objective").innerHTML = obj;
        $("objective").dataset.h = obj;
    }
    // ---- ride status
    const rv = ride ? renderedById.get(ride.vehicle) : undefined;
    const rideHtml = ride && bodyRender ? `RIDE · ${ride.typeName}${rv ? ` · ${Math.round(Math.hypot(rv.x - bodyRender.x, rv.z - bodyRender.z))} m` : ""} · ${ride.status === "ordered" ? "ordering…" : rv && Math.hypot(rv.x - bodyRender.x, rv.z - bodyRender.z) < cd.tRadius[rv.type] + 6 ? "ARRIVED · F to board" : "inbound"}` : "";
    if (rideHtml !== lastRideHtml) {
        $("rideStatus").textContent = rideHtml;
        $("rideStatus").style.display = rideHtml ? "block" : "none";
        lastRideHtml = rideHtml;
    }
    // ---- ride menu (C / Q)
    const rm = $("rideMenu");
    rm.style.display = rideMenu && mode === "fp" ? "block" : "none";
    if (rideMenu) {
        // the list is taken when the menu opens (stable for clicks); distances are updated in place
        const h = `<div class="ph">CALL A RIDE · a friendly AI-driven vehicle drives to you; its pilot walks home when you take the seat</div>` + (rideCands.length ? rideCands.map((c, i) => `<div class="opt" data-act="ride" data-b="${c.id}"><span class="k">${i + 1}</span>${typeName[c.type]}<span class="r"></span></div>`).join("") : `<div class="note">no friendly vehicle with an AI driver</div>`) + `<div class="note">1-6 choose · C / Esc close</div>`;
        if (h !== lastRideMenu) {
            rm.innerHTML = h;
            lastRideMenu = h;
        }
        rm.querySelectorAll(".opt").forEach((el) => { const e = renderedById.get(Number(el.dataset.b)); const r = el.querySelector(".r"); if (r)
            r.textContent = e && bodyRender ? `${Math.round(Math.hypot(e.x - bodyRender.x, e.z - bodyRender.z))} m` : "gone"; });
    }
    // ---- production panel (command view: the selected building; first person: the building in reach)
    const pb = mode === "cmd" ? selBuilding : fpBuilding;
    const prodEl = $("prod");
    if (prodAny.open && (mode !== "fp" || dead()))
        prodAny.open = false;
    prodAnyRally(now);
    if (prodAny.open && v) { // B2: the first-person production menu (anywhere)
        const html = prodAnyHtml(v, now);
        if (html !== lastProdHtml) {
            prodEl.innerHTML = html;
            lastProdHtml = html;
        }
        prodHeld = "";
        prodEl.style.display = "block";
    }
    else if (pb && v && v.entities.get(pb)) {
        const b = v.entities.get(pb), q = v.queues.get(pb), opts = buildOptions(b.type);
        const head = `<div class="ph">${typeName[b.type].toUpperCase()}<span class="x" data-act="close">×</span></div>`;
        let body = "";
        if (!opts.length)
            body = c9BuildingBody(b, pb) || `<div class="note">This building produces nothing.</div>`; // C9: Tech Lab upgrades, uplink export, Mass Driver pair
        else {
            body += `<div class="opts">` + opts.map((t, i) => {
                const st = optionState(pb, t);
                return `<div class="opt ${st.ok ? "" : "no"}" data-act="queue" data-b="${pb}" data-i="${i}"><span class="k">${i + 1}</span><span class="n">${typeName[t]}${roleSpan(t)}</span><span class="c"><span class="${st.shortOre ? "short" : ""}">${cd.tCostOre[t]} ore</span> · <span class="${st.shortGas ? "short" : ""}">${cd.tCostGas[t]} gas</span> · ${(PROD.buildTicks[cd.tTier[t]] * dt).toFixed(0)} s${(0, c11_ts_1.operatorSeats)(cd, t) ? ` · ${(0, c11_ts_1.operatorSeats)(cd, t)} pilot${(0, c11_ts_1.operatorSeats)(cd, t) > 1 ? "s" : ""}` : ""}</span>${st.ok ? (st.warn ? `<small class="w">${st.warn}</small>` : "") : `<small>${st.reason}</small>`}</div>`;
            }).join("") + `</div>`;
            const items = q ? q.items : [];
            body += `<div class="ph2">QUEUE ${items.length}/${PROD.queueLength}${items.length ? " · click an item to cancel (refund)" : ""}</div>`;
            body += items.length ? items.map((t, i) => `<div class="qi" data-act="cancel" data-b="${pb}" data-i="${i}"><span class="n">${typeName[t]}</span>${i === 0 ? `<i><b></b></i><small class="hd"></small>` : "<small>waiting</small>"}</div>`).join("") : `<div class="note">empty</div>`;
            if (c9?.reserve)
                body += (0, c9_ts_1.reserveModeHtml)(pb, c9.reserve.mode.includes(pb)); // C9: to the field / to the reserve
            if (b.type === T_BARRACKS)
                body += c11SquadLine(); // C11: the squad cap per Barracks (ruling 65)
            body += `<div class="note">${q?.rally ? `rally point set <span class="lnk" data-act="rallyClear" data-b="${pb}">clear</span>` : "no rally point"}${mode === "cmd" ? " · right-click the ground to set it" : ""}</div>`;
            if (prodRefusal && now < prodRefusal.until)
                body += `<div class="refused">CANNOT QUEUE · ${prodRefusal.text}</div>`;
            if (mode === "fp")
                body += `<div class="note">1-${opts.length} queue · B / Esc close</div>`;
        }
        body += loadoutSection(b); // C7b item 6
        // the structure is rebuilt only when it changes (a rebuild between mouse-down and mouse-up would lose the click);
        // the head item's progress and hold are updated in place
        const html = head + body;
        if (html !== lastProdHtml) {
            prodEl.innerHTML = html;
            lastProdHtml = html;
        }
        prodHeld = "";
        if (q && q.items.length) {
            const bar = prodEl.querySelector('.qi[data-i="0"] i b'), hd = prodEl.querySelector('.qi[data-i="0"] .hd');
            if (bar)
                bar.style.width = (q.progress * 100).toFixed(0) + "%";
            const held = sim_ts_1.HOLD_NAMES[q.hold] === "resources" ? `HELD · waiting for resources (${cd.tCostOre[q.items[0]]} ore · ${cd.tCostGas[q.items[0]]} gas)` : HOLD_TEXT[sim_ts_1.HOLD_NAMES[q.hold]];
            if (hd)
                hd.textContent = q.started ? `${Math.round(q.progress * 100)}%${q.hold ? " · " + held : ""}` : held || "starting";
            prodEl.querySelector('.qi[data-i="0"]')?.classList.toggle("held", q.hold !== 0);
            prodHeld = q.hold ? (hd?.textContent ?? held) : "";
        }
        prodEl.style.display = "block";
    }
    else {
        prodEl.style.display = "none";
        if (mode === "fp")
            fpBuilding = 0;
    }
    updateBuildPanel(now);
    document.body.classList.toggle("prodOpen", prodEl.style.display !== "none" || $("build").style.display !== "none");
    // ---- command-view selection line (and the pick-me-up button)
    let sel = "";
    if (mode === "cmd") {
        if (selBuilding)
            sel = `${typeName[ent(selBuilding)?.type ?? 0]} selected · click an option to queue · right-click the ground: rally point`;
        else if (selected.size) {
            sel = `${selected.size} unit${selected.size > 1 ? "s" : ""} selected · right-click ground: move · right-click enemy: attack`;
            if (selected.size === 1) {
                const id = [...selected][0], c = rideCandidates().find((x) => x.id === id);
                if (c && onFoot())
                    sel += ` <button class="btn" data-act="pickup" data-b="${id}">PICK ME UP</button>`;
            }
        }
        else
            sel = "drag to box-select friendly units · click a building for production · Shift+J: all Harvesters back to work";
    }
    flMapPanel();
    if (sel !== lastSelHtml) {
        $("selInfo").innerHTML = sel;
        lastSelHtml = sel;
    }
    // ---- feed
    const live = feed.filter((f) => f.until > now);
    const fh = live.map((f) => `<div class="${f.kind}">${f.text}</div>`).join("");
    if ($("feed").dataset.h !== fh) {
        $("feed").innerHTML = fh;
        $("feed").dataset.h = fh;
    }
    // ---- help, scope, viewmodel
    $("help").style.display = helpOn ? "block" : "none";
    if (scoped && flScopeKind() === null)
        scoped = false; // Frontline: the weapon in hand has no scope
    const scopeOn = scoped && mode === "fp" && foot && wire < 0.5, thermalOn = scopeOn && flScopeKind() === "thermal";
    $("scope").style.display = scopeOn ? "block" : "none";
    document.body.classList.toggle("scoped", thermalOn); // the thermal look; the marksman's plain scope only zooms
    thermalFrame(thermalOn);
    const showVm = mode === "fp" && foot && !scopeOn && wire < 0.5 && !freeCam && !cine && started && !isDead;
    vmVisible = showVm;
    // ---- misc
    document.body.classList.toggle("devReadout", DEV_READOUT || debugOverlay > 0); // C8 (QA4 bug 33): fps / tick readout only with O or ?dev=1
    $("debug").textContent =
        `fps ${fps.toFixed(0)} · frame ${frameGap.toFixed(1)} ms (cpu ${cpuMs.toFixed(1)}) · sim tick ${perf.tickMsMean.toFixed(2)} ms (max ${perf.tickMsMax.toFixed(1)}) · ` +
            `${perf.ticksPerSec} t/s · entities ${perf.entities} · proj ${perf.projectiles} · snap ${(perf.snapBytesPerSec / 1000).toFixed(1)} kB/s · draws ${R.drawCalls} · tris ${(R.triangles / 1000).toFixed(0)}k${wire > 0 ? ` · lines ${(R.lines / 1000).toFixed(1)}k` : ""}`;
    const sb = $("selbox");
    if (drag && mode === "cmd" && (Math.abs(drag.x1 - drag.x0) > 4 || Math.abs(drag.y1 - drag.y0) > 4)) {
        sb.style.display = "block";
        sb.style.left = Math.min(drag.x0, drag.x1) + "px";
        sb.style.top = Math.min(drag.y0, drag.y1) + "px";
        sb.style.width = Math.abs(drag.x1 - drag.x0) + "px";
        sb.style.height = Math.abs(drag.y1 - drag.y0) + "px";
    }
    else
        sb.style.display = "none";
    // world-space order marker
    const om = $("orderMark");
    if (orderMarker && now - orderMarker.t < 1200 && mode === "cmd") {
        let pt = null;
        if (orderMarker.attack) {
            const e = renderedById.get(orderMarker.attack);
            if (e)
                pt = toScreen(e.x, e.y + 3, e.z);
        }
        else
            pt = toScreen(orderMarker.x, (0, terrain_gen_ts_1.sampleHeight)(hm, orderMarker.x, orderMarker.z), orderMarker.z);
        if (pt) {
            om.style.display = "block";
            om.style.left = pt[0] + "px";
            om.style.top = pt[1] + "px";
            om.classList.toggle("attack", !!orderMarker.attack);
        }
    }
    else
        om.style.display = "none";
    const omsg = $("orderMsg");
    if (orderMsg && now < orderMsg.until) {
        omsg.style.display = "block";
        omsg.textContent = orderMsg.text;
        omsg.style.left = Math.min(orderMsg.x, cssW - 420) + "px";
        omsg.style.top = orderMsg.y + "px";
        omsg.style.opacity = String((0, math_ts_1.clamp)((orderMsg.until - now) / 500, 0, 1));
    }
    else
        omsg.style.display = "none";
    $("legend").classList.toggle("on", legendOn && iconMix > 0.05);
    updateSlice3bHud(now, foot);
    updateCombatHud(now);
    updateStrategic(now);
    if (!matchWatch.over)
        c3Stats.peakPoints = Math.max(c3Stats.peakPoints, ptModels.filter((p) => p.owner === 0).length);
    updateMatchOver();
    if (mode === "cmd")
        updateOrderBar();
    updateWheel();
    updateTags(now);
    if (now - lastMinimap > 100) {
        drawMinimap();
        lastMinimap = now;
    }
}
/** Vehicle shield recharge (constants.vehicleShield, ruling 15): delay after the last damage, fraction of the full shield per second. */
const VSH = data.constants.vehicleShield ?? {};
const SHIELD_DELAY_S = VSH.rechargeDelaySeconds ?? 5, SHIELD_RATE = VSH.rechargeFractionPerSecond ?? 0.05;
let shieldHud = { waiting: false, wait: 0, recharging: false, text: "" };
/** Fall damage (pilot.fallDamage): impact speed above safeSpeed costs perMetrePerSecond health per m/s. */
// fall damage thresholds come from the compiled data (pilot.fallDamage.*, pilot.jetpack.brakedDescentSpeed; ruling 23)
const FALL_SAFE = CREW.fallSafe, FALL_PER = CREW.fallPerSpeed, FALL_BRAKED = CREW.brakedDescent;
/**
 * Predicted landing speed and health loss from the altitude and vertical speed (exact free fall under the planet's
 * gravity, the sim's rule: loss = (impact - safeSpeed) x perMetrePerSecond above safeSpeed). A jet held while ejecting
 * (or any held jet with fuel / energy) brakes: the sim's braked descent lands at about brakedDescentSpeed.
 */
function predictLanding(h, vy, ejecting, braking) {
    let impact = Math.sqrt(vy * vy + 2 * cd.gravity * h);
    if (braking)
        impact = Math.min(impact, ejecting ? FALL_BRAKED : Math.max(0, -vy));
    return { impact, loss: impact > FALL_SAFE ? (impact - FALL_SAFE) * FALL_PER : 0 };
}
let fallHud = { shown: false, impact: 0, hard: false, text: "" }, fallPrev = null, fallWarnings = 0;
/**
 * The objective line (slice 3b, item 9): what a new player should do first. Build a Lancer, then board it, then
 * hold the base; the wave timer is always shown.
 */
/** C8: test-hook state (effects faded near the camera; low flight, stances and attack-ground are added by their items). */
function c8State() { return { hud: { ...hudStats }, minimap: { ...mmStats }, fxNearFaded: fx.nearFaded, tagsMoved, stance: { now: stanceNow, proneOn, eye: +eyeH.toFixed(2), ...stanceStats }, ground: { ...groundStats, armed: armedCmd?.kind === "ground", targets: Object.fromEntries([...groundTargets].map(([k, v]) => [k, { ...v }])) }, flight: flightNow ? { mode: flightNow, wantLow, toggles: lowToggles, line: $("flightLine").textContent } : null }; }
function objectiveText() {
    if (config.scenario === "showcase")
        return `HALCYON · showcase · ${config.showcaseFire ? "live fire" : "your weapons only"}`;
    if (config.scenario === "range")
        return "HALCYON · test range";
    if ((0, scenario_ts_1.isSkirmish)(config.scenario, config.units)) {
        const b = (0, battles_ts_1.battleOf)(config.battle), prim = objRows.find((r) => !r.side);
        const goal = prim ? `${b.label} · ${runningDifficulty.toUpperCase()} · ${prim.name}${prim.timer ? ` · ${prim.timer}` : ""} · keep your Core`
            : b.scenario.lanes ? `FRONTLINE · ${runningDifficulty.toUpperCase()} · push the lanes and destroy the Hegemony Core (north-east) · keep yours`
            : `SKIRMISH · ${runningDifficulty.toUpperCase()} · destroy the enemy Command Core (east) · keep yours`;
        const queued = views.length ? [...views[views.length - 1].queues.values()].some((q) => q.items.length > 0) : false;
        if (producedCount === 0 && !queued && !b.scenario.lanes)
            return `<b>FIRST:</b> build an army · <b>TAB</b> command view, click the Foundry or Barracks · ${goal}`;
        return goal;
    }
    const waveTxt = wave === 0 ? `first enemy wave in ${Math.ceil(secondsToWave)} s` : `enemy wave ${wave + 1} in ${Math.ceil(secondsToWave)} s`;
    const queued = views.length ? [...views[views.length - 1].queues.values()].some((q) => q.items.length > 0) : false;
    if (producedCount === 0 && !queued && !seated())
        return `<b>FIRST:</b> Build a Lancer at the Foundry — press <b>B</b> at a building or <b>TAB</b> for command view · ${waveTxt}`;
    if (producedCount === 0 && !seated())
        return `<b>BUILDING:</b> your vehicle is in production · meanwhile board one of the line's vehicles (<b>F</b>) or call a ride (<b>V</b>) · ${waveTxt}`;
    if (!seated() && !boardedOnce)
        return `<b>NEXT:</b> board your new vehicle (<b>F</b> at its hull) or call it to you (<b>V</b>) · ${waveTxt}`;
    return `HALCYON · hold the base · ${waveTxt}`;
}
let boardedOnce = false;
/**
 * Playtest (visibility at range): in first person, an enemy whose drawn height falls under FAR_MARKER_PX on screen
 * gets a small hostile diamond over it, only while the player has a line of sight to it over the terrain.
 */
function farMarkerTags() {
    farMarkers = 0;
    // C3 item 4: the enemy Command Core's marker (both views), with the distance in first person
    const ec = enemyCore();
    if (ec && ec.alive && started) {
        const y = (0, terrain_gen_ts_1.sampleHeight)(hm, ec.x, ec.z) + 30;
        const dist = Math.hypot(ec.x - eye[0], ec.z - eye[2]);
        if (tag(ec.x, y, ec.z, mode === "fp" ? `ENEMY CORE<small>${Math.round(dist)} m</small>` : "ENEMY COMMAND CORE", "ecore")) {
            if (mode === "fp")
                enemyCoreMarks.fp++;
        }
    }
    if (mode !== "fp" || wire > 0.5)
        return;
    const focal = (0, c3_ts_1.focalPx)(cssH, fovDeg);
    for (const e of rendered) {
        if (e.team === 0 || e.id === bodyId())
            continue;
        const dx = e.x - eye[0], dy = e.cy - eye[1], dz = e.z - eye[2], dist = Math.hypot(dx, dy, dz);
        if (dist < 30)
            continue;
        const m = MESH.get(kindOfType[e.type]);
        const size = m ? (m.height - m.minY) * e.scale : 2;
        const t = render_ts_1.Renderer.rayTerrain(hm, eye, [dx / dist, dy / dist, dz / dist], dist);
        if (!(0, c3_ts_1.needsFarMarker)(size, dist, focal, t < 0 || t > dist - 3))
            continue;
        if (tag(e.x, e.cy + size, e.z, "◆", "farfoe"))
            farMarkers++;
    }
}
/** Hijack ring, directional damage indicator, rider-hit tag, fall warning (slice 3b items 2, 4, 7). */
function updateSlice3bHud(now, foot) {
    // ---- hijack in progress: a ring that fills over the 5 s of contact, "HIJACKING — stay in contact"
    const hr = $("hijackRing"), ht = $("hijackText");
    const hjOn = !!hijack && foot && mode === "fp" && started;
    hr.style.display = hjOn ? "block" : "none";
    ht.style.display = hjOn ? "block" : "none";
    if (hjOn && hijack) {
        const v = renderedById.get(hijack.vehicle);
        hr.querySelector(".prog").style.strokeDashoffset = String(157.08 * (1 - (0, math_ts_1.clamp)(hijack.progress, 0, 1)));
        hr.querySelector(".sec").textContent = `${Math.max(0, (1 - hijack.progress) * HACK_S).toFixed(1)}`;
        const gap = v && bodyRender ? Math.hypot(v.x - bodyRender.x, v.z - bodyRender.z) - cd.tRadius[v.type] - PILOT_R : 0;
        ht.querySelector("small").textContent = `${v ? typeName[v.type] : "vehicle"} · ${Math.round(hijack.progress * 100)}% · contact ${gap.toFixed(1)} / ${CREW.enterRange} m · moving away or taking damage breaks it`;
        hudSeen.hijackRing++;
        hijackMax = Math.max(hijackMax, hijack.progress);
    }
    // ---- rider hit by the player's small arms (F_RIDER): an amber marker and tag
    $("hitmark").classList.toggle("rider", hitMarkRider && now < hitMarkUntil);
    $("riderTag").style.display = now < riderMsgUntil && mode === "fp" ? "block" : "none";
    // ---- directional damage indicator (DAMAGE_TAKEN events): red arcs toward the shooter, 1.5 s each
    const c = $("dmgInd"), g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    let shown = 0;
    if (mode === "fp" && !dead())
        for (const d of dmgDirs) {
            const age = (now - d.t) / (c3_ts_1.DMG_IND_MS * feedbackScale);
            if (age >= 1)
                continue;
            const a = 1 - age, R0 = 150;
            g.lineCap = "round";
            if (d.known) {
                const rel = (0, c3_ts_1.relBearing)(eye[0], eye[2], camYaw, d.x, d.z); // 0 = ahead, + = to the right
                const ang = rel - Math.PI / 2; // canvas angle (0 = right, clockwise)
                const w = d.rider ? 0.5 : 0.36 + Math.min(0.3, d.amount / 400);
                g.strokeStyle = d.shield ? `rgba(80,220,255,${(0.85 * a).toFixed(3)})` : `rgba(255,60,30,${(0.9 * a).toFixed(3)})`;
                g.lineWidth = 9;
                g.beginPath();
                g.arc(180, 180, R0, ang - w, ang + w);
                g.stroke();
                g.lineWidth = 3;
                g.beginPath();
                g.moveTo(180 + Math.cos(ang) * (R0 + 10), 180 + Math.sin(ang) * (R0 + 10));
                g.lineTo(180 + Math.cos(ang - 0.08) * (R0 - 4), 180 + Math.sin(ang - 0.08) * (R0 - 4));
                g.lineTo(180 + Math.cos(ang + 0.08) * (R0 - 4), 180 + Math.sin(ang + 0.08) * (R0 - 4));
                g.closePath();
                g.fillStyle = g.strokeStyle;
                g.fill();
            }
            else {
                g.strokeStyle = `rgba(255,60,30,${(0.35 * a).toFixed(3)})`;
                g.lineWidth = 4;
                g.beginPath();
                g.arc(180, 180, R0, 0, Math.PI * 2);
                g.stroke();
            }
            shown++;
        }
    dmgShown = shown;
    if (shown)
        hudSeen.dmgIndicator++;
    // ---- fall warning (pilot.fallDamage): predicted landing speed from the snapshot altitude; hold Space to brake
    const fw = $("fallWarn");
    fallHud = { shown: false, impact: 0, hard: false, text: "" };
    const me2 = me, bodyE = me2 && me2.state === sim_ts_1.P_FOOT ? views[views.length - 1]?.entities.get(me2.entity) : undefined;
    if (bodyE && me2 && me2.airborne !== sim_ts_1.AIR_GROUND && mode === "fp") {
        const vB = views[views.length - 1], vA = views.length > 1 ? views[views.length - 2] : null, eA = vA?.entities.get(me2.entity);
        const vy = eA && vA && vB.tick > vA.tick ? (bodyE.altitude - eA.altitude) / ((vB.tick - vA.tick) * dt) : 0;
        const pred = predictLanding(Math.max(0, bodyE.altitude), vy, me2.airborne === sim_ts_1.AIR_EJECTING, keys.has("Space") && (me2.jet > 0 || me2.energy > 0));
        // only a landing the sim will actually punish is announced (ruling 23: a full free-burn hop at 1 g lands safely)
        if (pred.loss > 0) {
            fallHud = { shown: true, impact: pred.impact, hard: true, text: `LANDING ${pred.impact.toFixed(0)} m/s · −${Math.round(pred.loss)} HEALTH · HOLD SPACE TO BRAKE` };
            fallWarnings++;
        }
    }
    fw.style.display = fallHud.shown ? "block" : "none";
    if (fallHud.shown) {
        fw.textContent = fallHud.text;
        fw.className = "panel " + (fallHud.hard ? "hard" : "ok");
    }
}
let hijackMax = 0, dmgShown = 0;
/** World position of a model-space point of an entity's drawn mesh (hull part: no turret turn, no recoil). */
function modelWorld(e, pt) {
    const mesh = MESH.get(kindOfType[e.type]);
    const [wx, wz] = rot2(pt[0] * e.scale, pt[2] * e.scale, e.yaw);
    return [e.x + wx, e.y + pt[1] * e.scale + mesh.hover * e.scale + mesh.bob * Math.sin(R.time * 2.3 + e.phase), e.z + wz];
}
/** Pilot zones of a crewed vehicle in sim coordinates (driver, and the open-seat gunner zone), with the drawn cockpit points. */
function zonesOf(e) {
    const out = [];
    const z = zoneOf(e);
    if (!z)
        return out;
    const ck = meshes_ts_1.COCKPITS[kindOfType[e.type]];
    out.push({ seat: "driver", c: z.c, r: z.r, drawn: ck?.driver ? modelWorld(e, ck.driver) : null });
    const ac = cd.tArmour[e.type];
    if (CREW.gzR[ac] > 0 && CREW.zoneOpen[ac] === 1 && cd.tSeatCount[e.type] > 1) {
        const cx = Math.cos(e.yaw), cz = Math.sin(e.yaw);
        out.push({ seat: "gunner", c: [e.x + cx * CREW.gzF[ac], e.simY + cd.tRadius[e.type] + CREW.gzU[ac], e.z + cz * CREW.gzF[ac]], r: CREW.gzR[ac], drawn: ck?.gunner ? modelWorld(e, ck.gunner) : null });
    }
    return out;
}
/** Debug overlay (O): the sim's hit sphere (cyan: body radius; dashed: + projectileHitRadius) and pilot zones (gold), the drawn cockpit (magenta) and the gap. */
let debugOverlay = 0, overlayOnly = 0;
const HIT_PAD = cd.constants.projectileHitRadius ?? 0;
function drawDebugOverlay() {
    const c = $("dbg");
    const on = debugOverlay > 0 && started && wire < 0.5;
    c.style.display = on ? "block" : "none";
    if (!on)
        return;
    if (c.width !== Math.round(cssW * dpr) || c.height !== Math.round(cssH * dpr)) {
        c.width = Math.round(cssW * dpr);
        c.height = Math.round(cssH * dpr);
        c.style.width = cssW + "px";
        c.style.height = cssH + "px";
    }
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cssW, cssH);
    const sphere = (cx, r, col, dash = [], lw = 1.3) => {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.setLineDash(dash);
        for (const axis of [0, 1, 2]) {
            g.beginPath();
            let first = true;
            for (let i = 0; i <= 32; i++) {
                const a = (i / 32) * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r;
                const p = axis === 0 ? [cx[0] + u, cx[1], cx[2] + v] : axis === 1 ? [cx[0] + u, cx[1] + v, cx[2]] : [cx[0], cx[1] + v, cx[2] + u];
                const sp = toScreen(p[0], p[1], p[2]);
                if (!sp) {
                    first = true;
                    continue;
                }
                if (first) {
                    g.moveTo(sp[0], sp[1]);
                    first = false;
                }
                else
                    g.lineTo(sp[0], sp[1]);
            }
            g.stroke();
        }
        g.setLineDash([]);
    };
    g.font = "11px ui-monospace, Menlo, Consolas, monospace";
    overlayGaps = [];
    for (const e of rendered) {
        if (!crewable(e.type) || e.id === bodyId() || (overlayOnly && e.id !== overlayOnly))
            continue;
        if (Math.hypot(e.x - eye[0], e.z - eye[2]) > 260)
            continue;
        const R0 = cd.tRadius[e.type], cc = [e.x, e.simY + R0, e.z];
        if (!toScreen(cc[0], cc[1], cc[2]))
            continue;
        sphere(cc, R0, "rgba(69,224,255,0.75)");
        if (debugOverlay > 1)
            sphere(cc, R0 + HIT_PAD, "rgba(69,224,255,0.3)", [4, 4], 1);
        for (const z of zonesOf(e)) {
            sphere(z.c, z.r, "rgba(255,210,60,0.95)", [], 1.8);
            if (z.drawn) {
                const a = toScreen(z.drawn[0], z.drawn[1], z.drawn[2]), b = toScreen(z.c[0], z.c[1], z.c[2]);
                const gap = Math.hypot(z.drawn[0] - z.c[0], z.drawn[1] - z.c[1], z.drawn[2] - z.c[2]);
                const fx2 = Math.cos(e.yaw), fz2 = Math.sin(e.yaw), dxw = z.drawn[0] - z.c[0], dzw = z.drawn[2] - z.c[2], along = dxw * fx2 + dzw * fz2;
                const frontal = Math.hypot(z.drawn[1] - z.c[1], dxw - along * fx2, dzw - along * fz2);
                overlayGaps.push({ id: e.id, typeId: cd.typeIds[e.type], seat: z.seat, gap, frontal });
                if (a) {
                    g.strokeStyle = "#ff4fd8";
                    g.lineWidth = 2;
                    g.beginPath();
                    g.moveTo(a[0] - 5, a[1]);
                    g.lineTo(a[0] + 5, a[1]);
                    g.moveTo(a[0], a[1] - 5);
                    g.lineTo(a[0], a[1] + 5);
                    g.stroke();
                }
                if (a && b) {
                    g.strokeStyle = "rgba(255,79,216,0.7)";
                    g.lineWidth = 1;
                    g.beginPath();
                    g.moveTo(a[0], a[1]);
                    g.lineTo(b[0], b[1]);
                    g.stroke();
                }
                const top = toScreen(cc[0], cc[1] + R0 + 0.6, cc[2]);
                if (top && z.seat === "driver") {
                    const label = `${typeName[e.type]} · zone ${gap.toFixed(2)} m from cockpit${frontal + 0.01 < gap ? ` (front view ${frontal.toFixed(2)})` : ""}`;
                    g.fillStyle = "rgba(0,0,0,0.65)";
                    g.fillRect(top[0] - g.measureText(label).width / 2 - 4, top[1] - 14, g.measureText(label).width + 8, 16);
                    g.fillStyle = "#ffe08a";
                    g.textAlign = "center";
                    g.fillText(label, top[0], top[1] - 2);
                    g.textAlign = "start";
                }
            }
        }
    }
}
let overlayGaps = [];
/** Footsteps, jetpack, torch and the vehicle engine (sound), from what the pilot is doing. */
let stepAcc = 0, wasAir = false;
function updateBodySound(frameDt) {
    if (!started)
        return;
    if (!seated() || dead())
        snd.boostLoop(false); // Frontline: out of the Dart (or dead): no boost roar
    const foot = onFoot() && mode === "fp", b = bodyRender, p = me;
    const air = !!p && p.airborne !== sim_ts_1.AIR_GROUND;
    const sp = b ? Math.hypot(b.vx, b.vz) : 0;
    if (foot && b && !air && sp > 1) {
        // Frontline: a steady cadence (a step every 0.5 s walking, 0.33 s sprinting) instead of the distance walked, whose
        // speed estimate jitters with the snapshots; the first step lands on the start of the move
        const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || sp > cd.tSpeed[PILOT_TYPE] * 1.25, iv = sprint ? 0.32 : 0.45;
        if (stepAcc <= 0)
            stepAcc = iv;
        else
            stepAcc += frameDt;
        if (stepAcc >= iv) {
            stepAcc = 1e-6;
            if (!snd.soldierStep(null, sprint, true)) // Frontline: the recorded soldier steps
                snd.step((0, math_ts_1.clamp)(sp / 9, 0, 1));
            stepsHeard++;
        }
    }
    else
        stepAcc = 0; // stopped: the next move starts with a step
    if (foot && wasAir && !air)
        snd.step(1, true);
    wasAir = air;
    const jetting = foot && air && spaceDown > 0 && !!p && (p.jet > 0 || p.energy > 0);
    snd.setJet(jetting ? 1 : 0);
    if (jetting)
        jetFrames++;
    const torching = foot && kit === 2 && !isFrontline() && lmb && !!torchTarget() && !!p && p.energy > 0;
    snd.setTorch(torching ? 1 : 0);
    if (torching)
        torchFrames++;
    // engine hum: in a vehicle, following the thrust keys and the speed
    const inV = seated() && !!b && mode === "fp";
    const th = inV ? Math.min(1, Math.abs((keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0)) + 0.6 * Math.abs((keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0))) : 0;
    snd.setEngine(th, inV ? (0, math_ts_1.clamp)(sp / (cd.tSpeed[b.type] || 20), 0, 1) : 0, seated() ? (mode === "fp" ? 1 : 0.3) : 0);
}
let stepsHeard = 0, jetFrames = 0, torchFrames = 0;
// ------------------------------------------------------------------ test aids: transition hold, pixel sampling
let holdT = null;
let pixelReq = null;
/** RGB (0-255) at CSS-pixel points of the frame just drawn (read before it is presented). */
function readPixels(points) {
    const px = new Uint8Array(4);
    return points.map(([x, y]) => {
        gl.readPixels(Math.round(x * dpr), canvas.height - 1 - Math.round(y * dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return [px[0], px[1], px[2]];
    });
}
/** G1 area 3: base dressing round each structure on the wire (fixed per structure id): crate stacks, sandbag lines,
 * lamp posts, placed just outside its footprint; within 500 m of the camera. */
const dressBufs = { crates: { a: new Float32Array(render_ts_1.INST_FLOATS * 64), n: 0 }, sandbags: { a: new Float32Array(render_ts_1.INST_FLOATS * 64), n: 0 }, lamp: { a: new Float32Array(render_ts_1.INST_FLOATS * 64), n: 0 } };
let dressingDrawn = 0;
function drawDressing(sink) {
    for (const k in dressBufs)
        dressBufs[k].n = 0;
    for (const e of rendered) {
        if (!cd.tStructure[e.type] || Math.hypot(e.x - eye[0], e.z - eye[2]) > 500)
            continue;
        const kind = kindOfType[e.type];
        if (kind === "wall" || kind === "node" || kind === "tower" || kind === "fbturret" || kind === "fbwall")
            continue; // ruling 132: no dressing round the forward base's own defences
        const r = (R.kindMesh(kind)?.radius ?? 6) + 2.5;
        for (let i = 0; i < 3; i++) {
            const h = Math.abs(Math.sin(e.id * 12.9898 + i * 78.233) * 43758.5453) % 1, a = h * 6.283 + i * 2.1;
            const k = i === 0 ? "lamp" : h < 0.55 ? "crates" : "sandbags";
            const x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r, d = dressBufs[k];
            d.a = grow(d.a, (d.n + 1) * render_ts_1.INST_FLOATS);
            putInst(d.a, d.n++ * render_ts_1.INST_FLOATS, x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), z, k === "sandbags" ? a + Math.PI / 2 : a, 0, 0, 0, 1);
        }
    }
    dressingDrawn = 0;
    for (const k in dressBufs) {
        R.drawKind(k, dressBufs[k].a, dressBufs[k].n, 1, sink);
        dressingDrawn += dressBufs[k].n;
    }
}
/** G1: the ore and gas fields: outcrops, spent stumps and geyser vents (shaded, and outlined in the command view), the plumes. */
let fieldStats = { ore: 0, spent: 0, geysers: 0, plumes: 0 };
function drawFields(now, edges) {
    const deps = depModels.length ? depModels : (scenMap?.deposits ?? []).map((d) => ({ x: d.x, z: d.z, radius: d.radius, fraction: 1, exhausted: false }));
    const gs = scenMap?.geysers ?? [];
    if (!deps.length && !gs.length)
        return;
    const f = (0, g1_fields_ts_1.fieldInstances)(deps, gs, (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z));
    fieldStats = { ore: f.oreN, spent: f.spentN, geysers: f.geyserN, plumes: 0 };
    const draw = [["ore", f.ore, f.oreN], ["ore-spent", f.spent, f.spentN], ["geyser", f.geyser, f.geyserN]];
    for (const [k, a, n] of draw) {
        R.drawKind(k, a, n);
        if (edges)
            R.drawKindEdges(k, n, wire * (k === "geyser" ? 1 : 0.45));
    } // crystal edges are many: drawn fainter
    if (wire < 1)
        gs.forEach((g, i) => { if (Math.hypot(g.x - eye[0], g.z - eye[2]) < 1600) {
            fx_p2_ts_1.p2Fx.run("geyser-plume", { x: g.x, y: (0, terrain_gen_ts_1.sampleHeight)(hm, g.x, g.z) + 2.6 * Math.max(0.8, g.radius / 6), z: g.z, t: now / 1000, k: i });
            fieldStats.plumes++;
        } });
}
// ------------------------------------------------------------------ frame
let lastFrame = performance.now();
let propsDrawn = false;
// ------------------------------------------------------------------ controller (designer 21 Nov: pad.ts)
/** The controller: its buttons press the game's own keys and mouse buttons; the right stick turns the view here. */
const pad = new pad_ts_1.Pad({
    key: (code, key, down) => { try {
        window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key, bubbles: true, cancelable: true }));
    }
    catch { /* no KeyboardEvent */ } },
    mouse: (button, down) => { try {
        (down ? canvas : window).dispatchEvent(new MouseEvent(down ? "mousedown" : "mouseup", { button, bubbles: true, cancelable: true }));
    }
    catch { /* no MouseEvent */ } },
    wheel: (dir) => { try {
        canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: dir * 100, bubbles: true, cancelable: true }));
    }
    catch { /* no WheelEvent */ } },
    onMenu: () => {
        if (!started && document.body.dataset.mode === "start" && !$("startBtn").disabled) { // the start screen: Menu deploys
            $("startBtn").click();
            return true;
        }
        return false;
    },
    needGesture: () => !snd.ctx || snd.state !== "running",
    notify: (t, k) => notify(t, k),
    activeChanged: (on) => { document.body.classList.toggle("pad", on); },
});
const padStats = { looks: 0 };
// the controller's buttons and settings in the controls panel (start card CONTROLS); settings kept in localStorage
try {
    const st = JSON.parse(localStorage.getItem("ironfall.pad") ?? "{}");
    if (st.dz >= 0.05 && st.dz <= 0.6)
        pad.deadzone = st.dz;
    if (st.look >= 0.8 && st.look <= 6)
        pad.lookSpeed = st.look;
    pad.invertY = !!st.inv;
}
catch { /* no storage */ }
{
    const host = document.querySelector("#ctlPanel .ctlIn");
    if (host) {
        const NAMES = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "View", "Menu", "L3", "R3", "D-pad ↑", "D-pad ↓", "D-pad ←", "D-pad →"];
        const rows = pad_ts_1.PAD_BINDINGS.map((b) => `<div class="eg"><b>${b.mod ? "View + " : b.lb ? "LB + " : ""}${NAMES[b.b]}</b><span>${b.what.replace(/^View \+ [^:]+: /, "")}</span></div>`).join("");
        const box = document.createElement("div");
        box.className = "padCtl";
        box.innerHTML = `<div class="stH" style="margin-top:14px">Controller</div><div class="padNote">Xbox or PlayStation layout (PlayStation: Cross = A, Circle = B, Square = X, Triangle = Y). Left stick moves, right stick looks. Plug it in and press a button; the page notices it.</div>
<div class="padSet"><label>Dead zone <input id="padDz" type="range" min="5" max="60" value="${Math.round(pad.deadzone * 100)}"> <span id="padDzV">${pad.deadzone.toFixed(2)}</span></label>
<label>Look speed <input id="padLook" type="range" min="8" max="60" value="${Math.round(pad.lookSpeed * 10)}"></label>
<label><input id="padInv" type="checkbox" ${pad.invertY ? "checked" : ""}> invert look up / down</label> <span id="padLive" class="padNote"></span></div>
<div class="padGrid">${rows}</div>`;
        host.appendChild(box);
        const save = () => { try {
            localStorage.setItem("ironfall.pad", JSON.stringify({ dz: pad.deadzone, look: pad.lookSpeed, inv: pad.invertY }));
        }
        catch { /* no storage */ } };
        $("padDz").addEventListener("input", (e) => { pad.deadzone = Number(e.target.value) / 100; $("padDzV").textContent = pad.deadzone.toFixed(2); save(); });
        $("padLook").addEventListener("input", (e) => { pad.lookSpeed = Number(e.target.value) / 10; save(); });
        $("padInv").addEventListener("change", (e) => { pad.invertY = e.target.checked; save(); });
        // live readout of the pad (Ace of the Airways: show the raw axes so a drifting stick is visible)
        setInterval(() => { const el = $("padLive"); if (!el || document.getElementById("ctlPanel")?.hidden)
            return; el.textContent = pad.connected ? `${pad.id.slice(0, 32)} · move ${pad.move.x.toFixed(2)}, ${pad.move.y.toFixed(2)} · look ${pad.look.x.toFixed(2)}, ${pad.look.y.toFixed(2)}${pad.stats.ignoredAxes ? ` · ${pad.stats.ignoredAxes} parked axes ignored` : ""}` : "no controller seen yet"; }, 200);
    }
}
function padFrame(now, dt) {
    pad.poll(now);
    if (!pad.connected)
        return;
    const lx = pad.look.x, ly = pad.look.y;
    if ((lx === 0 && ly === 0) || !started || pauseOn || matchLocked() || panelOpen())
        return;
    padStats.looks++;
    if (wheel.open) { // the quick-command wheel: the stick points at an option
        wheelMove(lx * 900 * dt, ly * 900 * dt);
        return;
    }
    if (mode === "fp") {
        const k = pad.lookSpeed * dt * (scoped || gunZoom ? fovDeg / 62 : 1);
        camYaw += lx * k;
        camPitch = (0, math_ts_1.clamp)(camPitch - ly * k * 0.75, onFoot() ? -1.45 : -0.55, onFoot() ? 1.45 : 0.45);
    }
    else if (mode === "cmd")
        cmd.rot += lx * 1.6 * dt; // the command view: the right stick turns the map
}
for (const ev of ["mousemove", "mousedown", "keydown"])
    window.addEventListener(ev, (e) => { if (e.isTrusted)
        pad.otherInput(); }, true);
function frame(now) {
    const t0 = performance.now();
    const frameDt = Math.min(0.1, (now - lastFrame) / 1000);
    frameGapAcc += now - lastFrame;
    lastFrame = now;
    try {
        padFrame(now, frameDt);
        if (holdT !== null)
            transT = holdT; // test aid: transition frozen (mid-blend screenshots)
        else if (transT < 1) {
            transT = Math.min(1, Math.max(0, now - transStart) / (TRANSITION_S * 1000)); // real time since the key press, also at low frame rates
            transFrames++;
            if (transT >= 1)
                lastTransition = { from: transFrom, to: mode, ms: now - transStart, frames: transFrames };
        }
        updateCommandCamera(frameDt);
        // the tactical display follows the same eased blend parameter as the camera
        const s = (0, math_ts_1.smoothstep)(transT);
        wire = mode === "cmd" ? s : 1 - s;
        R.time = now / 1000;
        if (!onFoot() || flScopeKind() === null || rifleHeavy())
            scoped = false; // Frontline: the marksman rifle (slot 1) has a scope too
        const { rt } = assemble(now, frameDt);
        updateBob(frameDt);
        updateFpSmooth(frameDt);
        if (!dead())
            specFocus = null;
        // camera pose, blended through the transition
        const a = transFrom === "fp" ? fpPose(now) : cmdPose(), b = mode === "fp" ? fpPose(now) : cmdPose();
        eye = [(0, math_ts_1.lerp)(a.eye[0], b.eye[0], s), (0, math_ts_1.lerp)(a.eye[1], b.eye[1], s), (0, math_ts_1.lerp)(a.eye[2], b.eye[2], s)];
        target = [(0, math_ts_1.lerp)(a.target[0], b.target[0], s), (0, math_ts_1.lerp)(a.target[1], b.target[1], s), (0, math_ts_1.lerp)(a.target[2], b.target[2], s)];
        if (freeCam) {
            const f = freeCam.follow ? renderedById.get(freeCam.follow) : undefined, o = f ? [f.x, f.y, f.z] : [0, 0, 0];
            eye = [o[0] + freeCam.eye[0], o[1] + freeCam.eye[1], o[2] + freeCam.eye[2]];
            target = [o[0] + freeCam.target[0], o[1] + freeCam.target[1], o[2] + freeCam.target[2]];
        }
        let cinePose = null; // Frontline: the opening cinematic's camera
        if (cine)
            try {
                cinePose = cineCamera(now, eye, target);
            }
            catch (err) {
                cineStats.error = String(err);
                cineEnd(true);
            }
        if (cinePose) {
            eye = cinePose.eye;
            target = cinePose.target;
        }
        const cmdness = mode === "cmd" ? s : 1 - s;
        const footCam = onFoot() && !freeCam && !cinePose && !dead();
        if (seatRoleNow() !== data_ts_1.SEAT_GUNNER)
            gunZoom = false;
        const fpFov = footCam ? (scoped ? (flScopeKind() === "plain" ? 22 : 11) : 70) : gunZoom && mode === "fp" ? c6_ts_3.GUNNER_ZOOM_FOV : 62;
        boostFov += ((boostWas?.boosting && !footCam ? 8 : 0) - boostFov) * (1 - Math.exp(-frameDt * 5)); // a speed kick while the own vehicle boosts
        fovDeg = killCamFov > 0 && mode === "fp" ? killCamFov : (0, math_ts_1.lerp)(fpFov + boostFov, 50, cmdness); // kill cam zoom
        if (cinePose)
            fovDeg = cinePose.fov;
        (0, math_ts_1.perspective)(proj, (fovDeg * Math.PI) / 180, cssW / cssH, footCam && cmdness < 0.5 ? 0.12 : (0, math_ts_1.lerp)(0.5, 2, cmdness), 9000);
        // designer playtest 15 Nov 21:15 (screen wobbles driving / on the jump pack): the first-person eye height is
        // smoothed (snapshot height steps, hover bob, hop and jet thrust jitter); big jumps (respawn, boarding) snap
        // j1 (designer playtest 16 Nov 13:02): only the ground part is smoothed. The body's own jump / jetpack / hop arc is
        // already smooth (snapshot v31 Hermite arcs, own prediction) and is added back unfiltered: through the low-pass it
        // lagged 0.12 s behind the take-off and caught up after the landing (a soft, late, then hurried camera)
        if (mode === "fp" && !freeCam && !cinePose) {
            const arc = bodyRender && !cd.tAir[bodyRender.type] ? Math.max(0, bodyRender.alt) : 0;
            const dy = eye[1] - arc - eyeYSmooth;
            if (!Number.isFinite(eyeYSmooth) || Math.abs(dy) > 6)
                eyeYSmooth = eye[1] - arc;
            else
                eyeYSmooth += dy * (1 - Math.exp(-frameDt / 0.12));
            const off = eyeYSmooth + arc - eye[1];
            eye = [eye[0], eyeYSmooth + arc, eye[2]];
            target = [target[0], target[1] + off, target[2]];
        }
        else
            eyeYSmooth = NaN;
        // C5: screen shake from a call impact (falls off with distance; decays in ~0.8 s)
        if (shakeAmp > 0.002) {
            const k = shakeAmp * (1 - cmdness * 0.7) * 0.35, sx = (Math.random() * 2 - 1) * k, sy = (Math.random() * 2 - 1) * k;
            eye = [eye[0], eye[1] + sy, eye[2]];
            target = [target[0] + sx * 6, target[1] + sy * 6, target[2] + sx * 6];
            shakeAmp *= Math.exp(-frameDt * 4.5);
        }
        else
            shakeAmp = 0;
        {
            const rr = mode === "fp" && !onFoot() ? camRollNow : 0, rx = -Math.sin(camYaw), rz = Math.cos(camYaw);
            (0, math_ts_1.lookAt)(view, eye, target, [Math.sin(rr) * rx, Math.cos(rr), Math.sin(rr) * rz]);
        } // ruling 112: chase-view roll
        (0, math_ts_1.multiply)(vp, proj, view);
        (0, math_ts_1.invert)(invVP, vp);
        buildIcons();
        flMapIcons(); // Frontline 4b: lanes and pings on the tactical map
        sendControl(rt, now);
        if (cinePose)
            send({ t: "viewer", x: target[0], z: target[2] }); // the snapshot's detail follows what the cinematic looks at
        else if (mode === "cmd")
            send({ t: "viewer", x: cmd.x, z: cmd.z });
        else if (bodyRender)
            send({ t: "viewer", x: bodyRender.x, z: bodyRender.z });
        else
            send({ t: "viewer", x: eye[0], z: eye[2] });
        fx.update(frameDt);
        fxRingCount = fx.fillRings(fxRingBuf = grow(fxRingBuf, (fx.ringCount + 1) * render_ts_1.INST_FLOATS));
        beaconRings();
        snd.setListener(eye, [view[0], view[4], view[8]], mode === "cmd");
        updateBodySound(frameDt);
        p1_sound_ts_1.p1Sound.frame(now, frameDt); // P1 hook
        fx_p2_ts_1.p2Fx.frame(now, frameDt); // P2 hook
        // draw
        R.wire = wire;
        R.dpr = dpr;
        R.lineWidth = 1.5 * dpr;
        R.focalPx = proj[5] * canvas.height / 2;
        const fogD = LITE ? 1e-7 : (0, math_ts_1.lerp)(1 / 2100, 1 / (1800 + cmd.dist * 1.2), cmdness) * (0, math_ts_1.lerp)(wxFog.mul, 1 + (wxFog.mul - 1) * 0.15, cmdness) * (RELIEF ? t1_relief_ts_1.RELIEF_FOG_MUL : 1), fogS = Math.min((0, math_ts_1.lerp)(c3_ts_1.FP_FOG_START, cmd.dist * 0.6, cmdness), wxFog.start ?? Infinity); // playtest: no fog inside FP_FOG_START (was 60 m); T1: thinner haze over the mountains (RELIEF_FOG_MUL)
        R.begin(vp, invVP, eye, fogD, fogS, canvas.width, canvas.height);
        if (wire < 1)
            R.drawSky(); // the tactical display is a flat dark background (the clear colour)
        R.drawTerrain();
        propsDrawn = wire < 1 && !LITE;
        if (wire < 1 && !LITE) {
            // props have no place on the tactical display: they sink into the ground during the blend
            const sink = wire * 12;
            gatherNearProps();
            for (const k of ["tree", "stump", "broadleaf", "spire"])
                R.drawKind(k, props.big[k], props.big[k].length / render_ts_1.INST_FLOATS, 1, sink);
            for (const k of ["rock", "bush", "debris"])
                R.drawKind(k, nearBuf[k].a, nearBuf[k].n, 1, sink);
            drawDressing(sink); // G1: crates, sandbags and lamps round the structures
            R.drawKind("tuft", tuftBuf, tuftN, 1, sink);
            R.drawKind("pebble", pebbleBuf, pebbleN, 1, sink);
        }
        // units: shaded meshes, or in the tactical display ground-coloured fills (hidden-line removal) then their edges
        const edges = wire > 0.003 && outlineMax > 0.003;
        lodStats.hi = 0;
        lodStats.lo = 0;
        if (wire < 1 || edges)
            for (const [k, b2] of kindBuf)
                drawKindLod(k, b2.a, b2.n, edges);
        if (edges)
            for (const [k, b2] of kindBuf)
                R.drawKindEdges(LOD_KIND.get(k) ?? k, b2.n, wire);
        drawFields(now, edges); // G1: ore deposits and gas geysers
        updatePlacement();
        drawPlacementGhosts(edges); // B2: the placement ghost and waiting sites (translucent, after the opaque pass)
        R.drawShadows(shadowBuf, shadowCount);
        fx_p2_ts_1.p2Fx.drawDecals(); // P2 hook
        R.drawRings(ringBuf, ringCount, render_ts_1.HALCYON.glowA);
        R.drawProjectiles(projBuf, projCount);
        R.drawProjectileLines(projBuf, projCount, wire);
        updateCallAim();
        drawCallAim(now);
        placementDots(now);
        drawBeacons(now);
        callFxFrame(now);
        flBigBeams(beams); // Frontline: the shoulder laser cone, with this frame's camera
        flSiloAim(); // Frontline: the silo targeter's red dot and strike circle
        c9Fx(now);
        c1Lines(now);
        flMapDraw(now); // Frontline 4b: lanes and pings
        const nf = fx.fill(fxBuf = grow(fxBuf, (fx.count + 1) * render_ts_1.FX_FLOATS), mode === "fp" ? eye : null); // C8 (QA4 bug 7): near effects fade
        R.drawFx(fxBuf, nf);
        fx_p2_ts_1.p2Fx.draw(); // P2 hook
        R.drawShields(shieldBuf, shieldCount);
        R.drawFxRings(fxRingBuf, fxRingCount, wire);
        R.drawIcons(iconBuf, iconSegs);
        drawViewModel(now, frameDt);
        if (pixelReq) {
            const r = pixelReq;
            pixelReq = null;
            r.resolve(readPixels(r.points));
        }
        updateHud(now, frameDt);
        flHeatHud(views.length ? views[views.length - 1] : null, me); // Frontline: the laser gun heat meter
        drawDebugOverlay();
    }
    catch (err) {
        fail(String(err?.stack ?? err));
    }
    const cpu = performance.now() - t0;
    cpuMsAcc += cpu;
    fpsFrames++;
    if (started && frameLog.length < 100000)
        frameLog.push(now, cpu);
    if (now - fpsT0 >= 1000) {
        fps = (fpsFrames * 1000) / (now - fpsT0);
        cpuMs = cpuMsAcc / fpsFrames;
        frameGap = frameGapAcc / fpsFrames;
        fpsFrames = 0;
        cpuMsAcc = 0;
        frameGapAcc = 0;
        fpsT0 = now;
    }
    requestAnimationFrame(frame);
}
// ------------------------------------------------------------------ N1: host + guest (lobby on the start screen)
const NETCFG = (0, netcore_ts_1.netConfig)(location.search);
let roster = [];
let mySlotNow = 0;
const pings = [];
function browserPid() {
    let id = params.get("pid") ?? "";
    if (id)
        return id;
    try {
        id = localStorage.getItem("ironfall.pid") ?? "";
        if (!id) {
            id = (0, netcore_ts_1.rid)(12);
            localStorage.setItem("ironfall.pid", id);
        }
    }
    catch {
        id = (0, netcore_ts_1.rid)(12);
    }
    return id;
}
function mpStatus(t, bad = false) { const el = $("mpStat"); if (el) {
    el.textContent = t;
    el.style.color = bad ? "#ff8a6a" : "";
} }
function showRoster() {
    // C7b item 2: the enemy scaling for the players in the battle (the sim's count: player pilots on the team, 1-4)
    const v = views[views.length - 1];
    const n = v && v.players.size ? (0, c7b_ts_1.playerCount)(v.players.values()) : Math.max(1, roster.filter((r) => r.online).length);
    coopStats.scaling = (0, c7b_ts_1.scalingText)(n, SCALING);
    const html = roster.map((r) => `<span class="${r.online ? "on" : "off"}">${r.slot + 1}. ${escHtml(r.name)}${r.host ? " ★host" : ""}${r.slot === mySlotNow ? " (you)" : ""}${r.online ? "" : " · left"}${r.ping ? ` · ${r.ping} ms` : ""}</span>`).join("") + `<span class="scale">${coopStats.scaling}</span>`;
    for (const id of ["mpList", "mpRoster"]) {
        const el = $(id);
        if (el)
            el.innerHTML = html;
    }
    const box = $("mpRoster");
    if (box)
        box.style.display = mp.active && roster.length ? "block" : "none"; // C8 (QA4 bug 3): "" fell back to the stylesheet's display: none
}
function escHtml(t) { return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
/** Name of the player whose pilot is `pilotId` (squadmates' name tags), or "". */
function playerName(pilotId) { const r = roster.find((x) => x.pilotId === pilotId && x.slot !== mySlotNow); return r ? r.name : ""; }
const mp = new mp_ts_1.Mp(NETCFG, {
    send: (m, t) => send(m, t),
    startHosting: () => new Promise((res) => {
        if (started) {
            res(pilotId);
            return;
        }
        readyWaiters.push(() => res(pilotId));
        awaitLoadout("CONFIRM LOADOUT · HOST", "your squad joins you in the battle", () => { // 21 Nov: the host confirms the kit first
            const before = ready;
            startWith({ ...URL_CONFIG, battle: chosenBattle });
            if (started && before && sameConfig({ ...URL_CONFIG, battle: chosenBattle }, config))
                res(pilotId); // same battle already loaded: started at once
        });
    }),
    welcomeInfo: () => ({ terrainSeed: SEED, simSeed, difficulty: runningDifficulty, cfg: { ...config } }),
    beginGuest: (port, w) => {
        const hostBattle = (0, battles_ts_1.battleOf)(w.cfg.battle ?? "classic");
        const hostKey = (0, battles_ts_1.pageKey)(hostBattle, w.cfg.scenario !== "default" || w.cfg.units > 60);
        if (w.terrainSeed !== SEED || hostKey !== PAGE_KEY) {
            // the host's terrain (seed and map): reload with them and join again (the terrain is built once per page)
            const q = new URLSearchParams(location.search);
            q.set("seed", String(w.terrainSeed));
            q.set("room", mp.code);
            q.set("name", mp.name);
            q.set("battle", hostBattle.id);
            G.__noUnloadPrompt = true;
            mp.stop();
            location.search = q.toString();
            return;
        }
        swapPort(port);
        RENDER_DELAY = 3;
        predictOn = new URLSearchParams(location.search).get("predict") !== "0"; // C7b item 1: a guest predicts its own pilot (walking)
        resetClientState();
        config = { units: w.cfg.units, scenario: w.cfg.scenario, showcaseFire: w.cfg.showcaseFire, battle: hostBattle.id };
        scenMap = (0, scenario_ts_1.mapFor)(config.scenario, config.units, config.battle);
        ptStatics = (0, c2_ts_1.pointStatics)(scenMap, RING_R);
        simSeed = w.simSeed;
        difficulty = runningDifficulty = scenario_ts_1.DIFFICULTIES.includes(w.difficulty) ? w.difficulty : "normal";
        pilotId = w.pilotId;
        ready = true;
        started = false;
        notify(`Joined “${mp.code}” as player ${w.slot + 1}. The host runs the battle.`, "good");
        if (isFrontline()) // 21 Nov: the guest confirms its loadout before it drops in
            awaitLoadout("CONFIRM LOADOUT · JOIN", `player ${w.slot + 1} in “${mp.code}” · in a Dart at the Command Core`, () => { send({ t: "flKit", kit: flKit, confirm: true }); startWith(config); });
        else
            startWith(config);
    },
    becomeHostFrom: (init) => {
        const w = makeWorker();
        swapPort(w);
        RENDER_DELAY = 1.25;
        predictOn = false;
        predictor?.reset(); // C7b: the new host runs the sim itself
        ready = false;
        readyWaiters.push(() => send({ t: "pause", on: false }));
        const heights = new Float64Array(hm.heights); // C7b item 1: checkpoints carry only the heightmap's hash (terrain: false)
        send({ ...init, data, heightmap: { cellSize: hm.cellSize, cols: hm.cols, rows: hm.rows, heights } }, [init.state, heights.buffer]);
    },
    status: mpStatus,
    roster: (r, slot) => { roster = r; mySlotNow = slot; showRoster(); if (mp.role === "host" && started)
        send({ t: "pause", on: (pauseOn && !mp.shared()) || (document.hidden && !mp.shared()) }); },
    ping: (name, x, z, kind) => { if (isFrontline() && mp.role === "host")
        send({ t: "flPing", x, z, kind, who: 1000 + (roster.find((r) => r.name === name)?.slot ?? 0) }); pings.push({ name, x, z, kind, until: performance.now() + 8000 }); if (pings.length > 8)
        pings.shift(); notify(`${name}: ${kind === "help" ? "NEED HELP" : kind === "attack" ? "ATTACK HERE" : kind === "defend" ? "DEFEND HERE" : "LOOK HERE"} (${Math.round(x)}, ${Math.round(z)})`, "info"); snd.ui("click"); },
    notify: (t, k) => notify(t, k),
    // 21 Nov (co-op lessons): the host's Play again reaches the guests: a fresh client state on the new match's pilot
    guestRestart: (w) => {
        resetClientState();
        pilotId = w.pilotId;
        simSeed = w.simSeed;
        $("matchOver").style.display = "none";
        if (mode !== "fp")
            setMode("fp");
        notify(`NEW MATCH · the host started it · enemy commander: ${String(w.difficulty ?? runningDifficulty).toUpperCase()}`, "info");
    },
});
{
    const nameEl = $("mpName"), codeEl = $("mpCode");
    // the callsign and room code are saved as they are typed (picking another planet reloads the page); restored below
    nameEl.addEventListener("input", () => { try {
        localStorage.setItem("ironfall.mpname", nameEl.value);
    }
    catch { /* no storage */ } });
    codeEl.addEventListener("input", () => { try {
        localStorage.setItem("ironfall.mpcode", codeEl.value);
    }
    catch { /* no storage */ } });
    try {
        nameEl.value = params.get("name") ?? localStorage.getItem("ironfall.mpname") ?? "";
        codeEl.value = params.get("room") ?? localStorage.getItem("ironfall.mpcode") ?? "";
    }
    catch { /* no storage */ }
    const go = () => {
        const name = (0, netcore_ts_1.cleanName)(nameEl.value), code = codeEl.value.trim();
        if (name.length < 2) {
            mpStatus("Choose a name first (at least 2 letters).", true);
            nameEl.focus();
            return;
        }
        if (!code) {
            mpStatus("Enter a room code: friends who type the same code play together.", true);
            codeEl.focus();
            return;
        }
        try {
            localStorage.setItem("ironfall.mpname", name);
            localStorage.setItem("ironfall.mpcode", code);
        }
        catch { /* no storage */ }
        if (location.protocol === "file:" || location.hostname.endsWith("claude.ai") || location.hostname.endsWith("claudeusercontent.com"))
            mpStatus("Note: playing together needs the page opened from a real web address (GitHub Pages, localhost); this page may block browser-to-browser connections.", true);
        snd.start();
        $("mpBtn").disabled = true;
        void mp.join(code, name, browserPid()).then(() => { if (!mp.active)
            $("mpBtn").disabled = false; });
    };
    $("mpBtn").addEventListener("click", go);
    codeEl.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter")
        go(); });
    nameEl.addEventListener("keydown", (e) => e.stopPropagation());
    if (params.get("room") && params.get("name") && params.get("autojoin") !== "0")
        setTimeout(go, 50);
}
// ------------------------------------------------------------------ start
sendInit();
send({ t: "pause", on: true });
document.body.dataset.mode = "start";
$("buildStamp").textContent = G.__IRONFALL_BUILD; // C8 (QA4 bug 21): the stamp had the build panel's id
requestAnimationFrame(frame);
// ------------------------------------------------------------------ C6: what the sim gained in stages 2 / 3 (c6.ts logic)
/** Item 3: the mission's objective definitions (names, hold seconds, mission timers) of the battle being played. */
const objDefs = () => ((0, scenario_ts_1.isSkirmish)(config.scenario, config.units) ? (0, c6_ts_1.objectiveDefs)((0, battles_ts_1.battleOf)(config.battle).scenario.objectives) : []);
let objRows = [], objHull = new Map(), objPermille = new Map(), objFeed = 0, objPanelHtml = "";
/** Item 5: the call loadout comes from C7a (profile loadout before deploy); the call menu reads it from the snapshot. */
const loadoutSlots = () => (views.length ? views[views.length - 1].calls?.slots : 0) || callRules?.loadoutSize || 3;
/**
 * Item 9: routes (s6 nav.route) of the selected units in the command view. Host only: the route is not in the
 * snapshot, so a guest has no route to draw .
 */
let routesNow = [], routeAsked = 0, routeBusy = false, routeStats = { asked: 0, drawn: 0, dots: 0, guest: false };
function routesFrame(now) {
    routeStats.drawn = 0;
    routeStats.dots = 0;
    const guest = mp.role === "guest";
    routeStats.guest = guest;
    if (!started || mode !== "cmd" || guest) {
        routesNow = [];
        return;
    }
    const ids = selectedUnits();
    if (!ids.length) {
        routesNow = [];
        return;
    }
    if (!routeBusy && now - routeAsked > 500) {
        routeAsked = now;
        routeBusy = true;
        routeStats.asked++;
        void request({ t: "routes", reqId: reqSeq++, ids }).then((r) => { routesNow = r.routes; routeBusy = false; });
    }
    const groupsDrawn = new Set();
    for (const r of routesNow) {
        const u = renderedById.get(r.id);
        if (!u || !r.path || !r.path.length || !selected.has(r.id))
            continue;
        if (r.group >= 0) {
            if (groupsDrawn.has(r.group))
                continue;
            groupsDrawn.add(r.group);
        }
        // dotted line from the unit through the waypoints, a ring at the goal
        let px = u.x, pz = u.z;
        for (const [x, z] of r.path) {
            const L = Math.hypot(x - px, z - pz), n = Math.max(1, Math.floor(L / 6));
            for (let i = 1; i <= n; i++) {
                const t = i / n, xx = px + (x - px) * t, zz = pz + (z - pz) * t;
                fx.dot(xx, (0, terrain_gen_ts_1.sampleHeight)(hm, xx, zz) + 0.6, zz, 0.9, [0.35, 0.95, 1], 0.75);
                routeStats.dots++;
            }
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.8, z, 1.6, [0.35, 0.95, 1], 0.9);
            px = x;
            pz = z;
        }
        routeStats.drawn++;
    }
}
/** Item 8: vision (S9). Enemy units remembered after they leave the wire; shooters revealed by their fire. */
let unitMem = new c6_ts_2.UnitMemory(30000);
const firingAt = new Map();
let visionStats = { ghostTags: 0, firingTags: 0, firingFlashes: 0, hiddenSites: 0 };
function visionSnap(v, now) {
    unitMem.update([...v.entities.values()].filter((e) => e.team !== 0 && e.team !== 255 && !cd.tStructure[e.type] && !(crewable(e.type) && e.crew === 0)), now, recentDeaths);
    for (const id of (0, c6_ts_2.recentShooters)(v.shots, [...v.projectiles.values()], (id) => v.entities.get(id)?.team ?? -1, 0))
        firingAt.set(id, now);
    for (const [id, t] of firingAt)
        if (now - t > 4000)
            firingAt.delete(id);
}
const visibleSites = (con) => (0, c4_ts_1.siteModels)(con, 0, typeName).filter((st) => (0, c6_ts_2.siteVisible)(st, (id) => renderedById.has(id) || !!ent(id)));
/** Tags: "?" ghosts where enemy units were last seen (fading over 30 s); a FIRING flash on revealed shooters. */
function visionTags(now) {
    visionStats.ghostTags = 0;
    visionStats.firingTags = 0;
    if (!started)
        return;
    for (const g of unitMem.ghosts(now, recentDeaths)) {
        if (mode === "fp" && Math.hypot(g.x - eye[0], g.z - eye[2]) > 700)
            continue;
        if (tag(g.x, (0, terrain_gen_ts_1.sampleHeight)(hm, g.x, g.z) + cd.tRadius[g.type] * 2 + 1.5, g.z, `? ${typeName[g.type]}<small>last seen ${Math.round(g.age)} s</small>`, `lastseen${g.age > 15 ? " old" : ""}`))
            visionStats.ghostTags++;
    }
    for (const [id, t] of firingAt) {
        const e = renderedById.get(id);
        if (!e || now - t > 4000)
            continue;
        const on = Math.floor(now / 180) % 2 === 0;
        if (on) {
            fx.dot(e.x, e.y + cd.tRadius[e.type] + 0.8, e.z, Math.max(0.8, cd.tRadius[e.type] * 0.5), [1, 0.25, 0.1], 0.85);
            visionStats.firingFlashes++;
        }
        if (tag(e.x, e.y + cd.tRadius[e.type] * 2 + 2.5, e.z, "FIRING", `firing${on ? " on" : ""}`))
            visionStats.firingTags++;
    }
}
/** Item 7: units (W2c). The gunner's zoomed sight (RMB in a gunner seat), aircraft landing (C), passengers. */
let gunZoom = false, unitStats = { zooms: 0, landed: 0, lifted: 0, airDown: 0, passView: "", airPrompt: "" };
let ownAlt = null, lastAirDownAt = -1e9;
function seatRoleNow() { if (!seated() || !me)
    return -1; const e = ent(me.entity); return e ? cd.tSeatRole[e.type * data_ts_1.MAX_SEATS + me.seat] : -1; }
/**
 * C7b item 1: a death from the snapshot stream (UNIT_DIED, w2f; every viewer that had it detected, guests too): the
 * explosion, the sound, the counters, the structure memory and the wreck / ghost matching. An aircraft's height comes
 * from its last drawn altitude (the event has x / z only).
 */
function deathFx(d, v) {
    const t = d.type, k = kindOfType[t];
    if (t < 0 || t >= cd.typeIds.length)
        return;
    recentDeaths.push({ id: d.id, type: t, x: d.x, z: d.z, t: performance.now() });
    if (recentDeaths.length > 64)
        recentDeaths.shift();
    // ruling 106: a destroyed vehicle leaves a burnt hull for a few seconds (drawn only; the sim keeps no wreck)
    if (!cd.tStructure[t] && !cd.tPilot[t] && k !== "infantry") {
        const lastR = renderedById.get(d.id);
        hulks.push({ id: d.id, type: t, x: d.x, z: d.z, yaw: lastR ? lastR.yaw : (d.id * 2.399) % 6.283, tw: lastR ? lastR.turret - lastR.yaw + 0.5 : 0.7, t0: performance.now() });
        if (hulks.length > HULK_MAX)
            hulks.shift();
    }
    const size = cd.tStructure[t] ? 9 : k === "infantry" ? 1.4 : k === "siege" ? 7 : k === "bike" || k === "scout" ? 2.5 : 4;
    const x = d.x, z = d.z, last = renderedById.get(d.id);
    const y = cd.tAir[t] ? (last ? last.y : (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + cd.constants.airAltitude) + cd.tRadius[t] : (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
    fx.explosion(x, y, z, size, teamIndex(d.team));
    if (cd.tStructure[t])
        structMem.died(t, d.team, x, z);
    if (!cd.tStructure[t] && !cd.tPilot[t] && !matchWatch.over) {
        if (d.team === 0)
            c3Stats.unitsLost++;
        else
            c3Stats.enemyLost++;
    }
    // a pilot on foot dying (ejected AI crews in large battles) is a small pop, heard only nearby
    if (!cd.tPilot[t] || Math.hypot(x - eye[0], z - eye[2]) < 150)
        snd.explosion([x, y, z], size);
    deathsSeen++;
    void v;
}
/** AIRCRAFT_DOWN / AIRCRAFT_LANDING / PASSENGER_LOST (C7b item 1: on the wire for every viewer since w2f; no fallback from deaths or altitude). */
function unitEvent(e, v) {
    if (e.kind === events_ts_1.EV.AIRCRAFT_LANDING) {
        const own = seated() && me && seatRoleNow() === data_ts_1.SEAT_DRIVER ? me.entity : 0, l = (0, c7b_ts_1.landingEventText)(e, own);
        if (l) {
            notify(l.text, l.landed ? "good" : "info");
            if (l.landed) {
                snd.sting("landing");
                unitStats.landed++;
            }
            else
                unitStats.lifted++;
        }
        return;
    }
    if (e.kind === events_ts_1.EV.AIRCRAFT_DOWN) {
        lastAirDownAt = performance.now();
        unitStats.airDown++;
        snd.sting("aircraft-down");
    }
    const t = (0, c6_ts_3.unitEventText)(e, pilotId, 0, (ty) => typeName[ty] ?? "aircraft", (id) => v.entities.get(id)?.team ?? (renderedById.get(id)?.team ?? -1));
    if (t)
        notify(t.text, t.kind);
}
/** Seated lines: the aircraft pilot's landing line, the gunner's sight, the passenger view. */
function unitPrompt(prompt) {
    unitStats.airPrompt = "";
    unitStats.passView = "";
    const pv = $("passView");
    let pass = "";
    if (started && mode === "fp" && seated() && me) {
        const mine = me, e = ent(mine.entity), r = renderedById.get(mine.entity);
        if (e && r) {
            const role = seatRoleNow(), air = cd.tAir[e.type] === 1;
            if (role === data_ts_1.SEAT_DRIVER && air) {
                const hH = (0, c8_ts_1.aircraftHeight)(r.alt, cd.constants.airAltitude);
                const t = isFrontline() && cd.tHover[e.type] === 1 ? `ALT ${Math.round(hH)} m · hold Space climb · hold C descend · let go: holds height · land gently (over 9 m/s damages)` // Frontline: the gunship's helicopter controls
                    : (flightNow === "LOW" ? "LOW · " : flightNow === "DESCENDING" ? "→ LOW · " : flightNow === "NORMAL" ? "NORMAL · " : "") + (0, c6_ts_3.aircraftPrompt)(hH, crouchHeld());
                unitStats.airPrompt = t;
                prompt = `${t} · ${prompt}`;
            }
            if (role === data_ts_1.SEAT_GUNNER)
                prompt = `<b>RMB</b> ${gunZoom ? "zoomed sight on" : "zoomed sight"} · ${prompt}`;
            if (role !== data_ts_1.SEAT_DRIVER && role !== data_ts_1.SEAT_GUNNER) {
                const seats = cd.tSeatCount[e.type], riders = [0, 1, 2, 3, 4, 5, 6, 7].filter((j) => j < seats && (e.crew & (1 << j))).length;
                const drv = cd.tDriverSeat[e.type], pl = [...(views[views.length - 1]?.players.values() ?? [])].find((p) => p.entity === mine.entity && p.seat === drv);
                pass = (0, c6_ts_3.passengerText)({ name: typeName[e.type], hull: e.hp, alt: air ? (0, c8_ts_1.aircraftHeight)(r.alt, cd.constants.airAltitude) : r.alt, speed: Math.hypot(r.vx, r.vz), air, driver: pl ? (pl.pilotId === pilotId ? "you" : playerName(pl.pilotId) || "a squadmate") : drv >= 0 && e.crew & (1 << drv) ? "AI" : "nobody", riders, seats });
                // C7b item 3: soldiers aboard (CARGO events) and the personal weapon where the sim mounts it (Mule doors)
                const aboard = cargo.aboard(e.id);
                tpStats.passengerWeapon = station.weapon[0] >= 0 ? `LMB fires your ${wName(station.weapon[0])} from the seat` : "no weapon from this seat (enclosed)";
                pass += `${aboard ? ` · ${aboard} soldier${aboard === 1 ? "" : "s"} aboard` : ""} · ${tpStats.passengerWeapon} · F to climb out`;
            }
        }
    }
    unitStats.passView = pass;
    if (pv.textContent !== pass)
        pv.textContent = pass;
    pv.style.display = pass ? "block" : "none";
    document.body.classList.toggle("gunzoom", gunZoom && mode === "fp");
    document.body.classList.toggle("towerslit", mode === "fp" && (c9Manning() || gunSeated())); // C1: the sentry gunner looks out through the same slit frame
    if (mode === "fp" && gunSeated() && started) {
        const gt = me ? renderedById.get(me.entity) : undefined;
        prompt = gt && kindOfType[gt.type] === "droppod" ? (0, s2_pod_ts_1.podGunnerBar)(podReloadLeft(gt.id, performance.now()), POD_RELOAD_S, POD_SALVO) : (0, c1_crew_ts_1.gunSeatBar)(SENTRY_NAME, null); // ruling 130: both weapons and the rocket reload
        c1Stats.prompt = prompt;
        podStats.bar = prompt;
    }
    return prompt;
}
/** Per frame: the own aircraft's altitude (the landing lines come from AIRCRAFT_LANDING events since C7b). */
function unitFrame() {
    const e = seated() && me ? renderedById.get(me.entity) : undefined;
    ownAlt = !e || !cd.tAir[e.type] || seatRoleNow() !== data_ts_1.SEAT_DRIVER ? null : e.alt;
    // C8 (ruling 41): a newly boarded aircraft: is it already low? (the sim keeps the toggle per aircraft; it is not on the wire)
    if (e && ownAlt !== null && e.id !== lowVeh) {
        lowVeh = e.id;
        const hgt = (0, c8_ts_1.aircraftHeight)(ownAlt, cd.constants.airAltitude);
        wantLow = !!LOW_RULES && hgt > 0.5 && hgt <= LOW_RULES.alt + 1.5;
    }
    if (!e || ownAlt === null)
        lowVeh = 0;
    const m = ownAlt === null ? null : (0, c8_ts_1.flightMode)(wantLow, (0, c8_ts_1.aircraftHeight)(ownAlt, cd.constants.airAltitude), cd.constants.airAltitude, LOW_RULES, crouchHeld());
    flightNow = m;
    const fl = $("flightLine"), txt = m && !(isFrontline() && e && cd.tHover[e.type] === 1) ? (0, c8_ts_1.flightLine)(m, LOW_RULES, cd.constants.airAltitude, LOW_FLIGHT_KEY_LABEL) : ""; // Frontline: no low/normal flight bands on the gunship
    if (fl.textContent !== txt)
        fl.textContent = txt;
    fl.style.display = txt ? "block" : "none";
    fl.classList.toggle("low", m === "LOW" || m === "DESCENDING");
}
/** C8 (ruling 41): low flight. Space (the jump bit) in an aircraft's pilot seat toggles it; the sim flies the aircraft
 * at stealth.lowFlightAltitudeMetres. The client keeps what was asked for and reads the height from the snapshot. */
const LOW_FLIGHT_KEY = "Space", LOW_FLIGHT_KEY_LABEL = "Space";
/** Ruling 112: the hover hop of a ground vehicle's driver (Space; held: hops again when the cooldown is over). */
const HOP_KEY = "Space";
/** Frontline: vehicle types whose driver has a third weapon on R (fire bit 4: the mech's arc lance). */
const FL_THIRD_TYPES = new Set(cd.typeIds.map((id, t) => (data.units.find((u) => u.id === id)?.seats?.[0]?.extraWeapons ?? []).some((w) => (data.constants.frontline?.vehicleThirdFire ?? []).includes(w)) ? t : -1).filter((t) => t >= 0));
const LOW_RULES = (0, c8_ts_1.lowFlightRules)(data.constants);
let wantLow = false, lowVeh = 0, flightNow = null, lowToggles = 0;
const airDriver = () => { const e = seated() && me ? ent(me.entity) : undefined; return !!e && cd.tAir[e.type] === 1 && me.seat === cd.tDriverSeat[e.type]; };
/** C8 (ruling 42): stances. C (hold) crouches as before; T toggles prone (the sim's prone control flag, held while on).
 * The own stance comes from the snapshot (crouched flag, prone and changing crew bits); the eye height, the crawl bob,
 * the lowered viewmodel while changing and the HUD line follow it. */
const PRONE_KEY = "KeyT", PRONE_KEY_LABEL = "T";
const STANCE = (0, c8_ts_1.stanceRules)(data.constants, cd.tSignature[PILOT_TYPE], CREW.crouchMul);
let proneOn = false, stanceNow = "STANDING", stanceSince = 0, eyeH = c8_ts_1.EYE_HEIGHT.STANDING, stanceStats = { toggles: 0, changes: 0, drawn: 0, line: "" };
/** C10 item 5: first-time tips (keys.ts TIPS), one feed line at a time, 6 s apart, each shown once (kept in storage). */
const TIP_KEY = "ironfall.tips", tipSeen = new Set();
try {
    for (const id of JSON.parse(localStorage.getItem(TIP_KEY) ?? "[]"))
        tipSeen.add(id);
}
catch { /* no storage: once per page */ }
let tipAt = 0;
const tipStats = { shown: [] };
function tipFrame(now) {
    if (!started || pauseOn || (config.scenario !== "default" && !(0, scenario_ts_1.isSkirmish)(config.scenario, config.units))) {
        tipAt = Math.max(tipAt, now + 7000);
        return;
    }
    if (now < tipAt)
        return;
    const t = (0, keys_ts_1.nextTip)(mode === "cmd" ? "cmd" : airDriver() ? "aircraft" : onFoot() ? "foot" : null, tipSeen);
    if (!t)
        return;
    tipSeen.add(t.id);
    tipStats.shown.push(t.id);
    tipAt = now + 6000;
    notify(`TIP · ${t.text}`, "info");
    try {
        localStorage.setItem(TIP_KEY, JSON.stringify([...tipSeen]));
    }
    catch { /* no storage */ }
}
function stanceFrame(now, frameDt) {
    const foot = onFoot() && !!me;
    if (!foot)
        proneOn = false;
    const own = foot ? ent(me.entity) : undefined;
    const st = foot ? (0, c8_ts_1.stanceOf)(own) : "STANDING";
    if (st !== stanceNow) {
        stanceNow = st;
        stanceSince = now;
        stanceStats.changes++;
    }
    // eye: down over the 0.6 s, up over the 1.2 s; standing <-> crouched is immediate in the sim (eased over 0.12 s)
    const tgt = st === "PRONE" || st === "GOING PRONE" ? c8_ts_1.EYE_HEIGHT.PRONE : crouchHeld() || st === "CROUCHED" ? c8_ts_1.EYE_HEIGHT.CROUCHED : c8_ts_1.EYE_HEIGHT.STANDING;
    const span = c8_ts_1.EYE_HEIGHT.STANDING - c8_ts_1.EYE_HEIGHT.PRONE;
    const rate = st === "GOING PRONE" ? span / STANCE.toProne : st === "GETTING UP" ? span / STANCE.upFromProne : span / 0.12;
    const dtS = Math.min(0.1, Math.max(0, frameDt));
    eyeH += (0, math_ts_1.clamp)(tgt - eyeH, -rate * dtS, rate * dtS);
    if (!foot)
        eyeH = c8_ts_1.EYE_HEIGHT.STANDING;
    vmProne += ((st === "PRONE" ? 1 : 0) - vmProne) * Math.min(1, dtS * 6);
    const busy = st === "GOING PRONE" || st === "GETTING UP";
    document.body.classList.toggle("stanceBusy", busy && mode === "fp");
    const dur = st === "GOING PRONE" ? STANCE.toProne : STANCE.upFromProne;
    const line = foot ? (0, c8_ts_1.stanceLine)(st, STANCE, busy ? (0, math_ts_1.clamp)((now - stanceSince) / 1000 / dur, 0, 1) : 0, PRONE_KEY_LABEL) : "";
    stanceStats.line = line;
    const el = $("stanceLine"), html = line ? `${(0, c8_ts_1.stanceIcon)(st)}<span>${line}</span>` : "";
    if (el.dataset.h !== html) {
        el.innerHTML = html;
        el.dataset.h = html;
    }
    el.style.display = line ? "flex" : "none";
    el.classList.toggle("busy", busy);
}
function toggleLowFlight() {
    if (!LOW_RULES) {
        notify("Low flight is not in this battle's rules", "warn");
        snd.ui("error");
        return;
    }
    wantLow = !wantLow;
    lowToggles++;
    notify(wantLow ? `LOW FLIGHT · down to ${LOW_RULES.alt} m: signature ×${LOW_RULES.sig}, radar needs line of sight · speed ×${LOW_RULES.speed}, in reach of every ground weapon` : `NORMAL FLIGHT · climbing to ${cd.constants.airAltitude} m`, "info");
    snd.ui("click");
}
/** Item 6: economy and bases (W2b). */
const FORT_LEVELS = (data.points?.fortification?.levels ?? []);
const T_POWER = cd.typeIds.map((id) => Number(data.buildings.find((b) => b.id === id)?.power ?? 0));
const T_FBV = cd.typeIds.indexOf("forward-base-vehicle"), T_DEPOT = cd.typeIds.indexOf("field-depot"), T_REPAIR = cd.typeIds.indexOf("repair-bay");
const T_FB_TURRET = cd.typeIds.indexOf(fb1_ts_1.FB_TURRET), T_FB_WALL = cd.typeIds.indexOf(fb1_ts_1.FB_WALL); // ruling 132
const REPAIR_R = Number((data.buildings.find((b) => b.id === "repair-bay")?.effects?.repairRadius) ?? 40);
const REPAIR_RATE = Number((data.buildings.find((b) => b.id === "repair-bay")?.effects?.repairPerSecond) ?? 20);
/** Ruling 106: burnt hulls (client only): seconds burning in place, seconds sinking away, most kept. */
const HULK_BURN_S = 2.2, HULK_SINK_S = 2.8, HULK_MAX = 24;
let fortJobs = new Map(), baseJobs = new Map();
let wrecksDrawn = 0;
let hulks = [], recentDeaths = [];
let econStats = { fortifyClicks: 0, deployClicks: 0, packClicks: 0, events: 0, powerTags: 0, fortTags: 0, repairRing: 0 };
let powerNow = [];
function computePower() {
    const under = underConstruction();
    powerNow = (0, c6_ts_4.pointPower)(ptStatics, ptStatics.map((p) => ptModels[p.index]?.owner ?? -1), rendered.filter((e) => cd.tStructure[e.type] && e.team >= 0).map((e) => ({ type: e.type, team: e.team, x: e.x, z: e.z, building: under.has(e.id) })), T_POWER);
}
/** The point panel's economy lines: fortification (level, next cost, button or timer) and the point's power. */
function econSectionHtml(point, owned) {
    const pv = latestPoints()?.points[point];
    if (!pv)
        return "";
    const f = (0, c6_ts_4.fortifyInfo)(FORT_LEVELS, pv.fortification), job = fortViewsNow().find((j) => j.point === point);
    let h = `<div class="ph2">FORTIFICATION · ${(0, fort1_ts_1.levelTitle)(FORT_DEFS, f.level)} (of ${FORT_LEVELS.length - 1})</div>`;
    h += `<div class="note">${esc(f.level > 0 ? `has: ${FORT_DEFS.filter((l) => l.level > 0 && l.level <= f.level).map((l) => l.adds ?? l.name).join("; ")}` : (0, fort1_ts_1.levelLabel)(FORT_DEFS, 0))}</div>`; // ruling 133: what it has, in plain words
    if (job)
        h += `<div class="fortjob${job.stage === fort1_ts_1.FJ_BUILDING ? "" : " wait"}"><b>${esc(job.title)}</b><i><b style="width:${job.pct}%"></b></i><small>${esc(job.status)}</small><small>gives ${esc(job.label)}</small></div>`;
    else if (f.next && owned)
        h += `<div class="opt fort" data-act="fortify" data-b="${point}"><span class="n">FORTIFY → ${esc((0, fort1_ts_1.levelTitle)(FORT_DEFS, f.next.level))}</span><span class="c">${f.next.ore} ore · ${f.next.gas} gas · ${Math.round(fortUpgradeS(f.next.level))} s of work by a Constructor at the point</span><small>gives: ${esc(f.next.adds)}</small></div>`;
    else if (!f.next)
        h += `<div class="note">highest level</div>`;
    if (owned) {
        const p = powerNow[point];
        if (p)
            h += `<div class="${p.net < 0 ? "refused" : "note"}">${(0, c6_ts_4.powerText)(p)}</div>`;
    }
    return h;
}
function econEvent(e) {
    const lv = (l) => (0, fort1_ts_1.levelTitle)(FORT_DEFS, l); // ruling 133: "Level 2 · Fortified"
    const t = (0, c6_ts_4.economyEventText)(e, 0, (i) => ptStatics[i]?.name ?? `point ${i}`, lv, (ty) => typeName[ty] ?? "vehicle");
    if (t && e.kind === events_ts_1.EV.FORTIFY && e.b === economy2_ts_1.FE_DONE && e.c === 0) { // ruling 133: what the level gives, a chime and a flash at the point
        t.text = `FORTIFIED ${ptStatics[e.a]?.name ?? `point ${e.a}`} · ${(0, fort1_ts_1.levelLabel)(FORT_DEFS, e.d)}`;
        snd.ui("confirm");
        fortDone.push({ point: e.a, t: performance.now() });
        fortStats.done++;
    }
    if (t) {
        notify(t.text, t.kind);
        econStats.events++;
    }
    const now = performance.now();
    if (e.kind === events_ts_1.EV.FORTIFY) {
        if (e.b === economy2_ts_1.FE_STARTED) {
            fortJobs.set(e.a, { until: now + e.v1 * 1000, level: e.d, team: e.c });
            if (e.c === 0)
                snd.sting("fortify");
        }
        else
            fortJobs.delete(e.a);
    }
    else if (e.kind === events_ts_1.EV.FORWARD_BASE && (e.b === economy2_ts_1.FB_DEFENCES || e.b === economy2_ts_1.FB_FOLDING)) { // ruling 132: the base's own defences unfold / fold (the deploy / pack-up timer goes on)
        const p = ent(e.a);
        if (p)
            fbTr.note(p.x, p.z, now, e.v1, e.b === economy2_ts_1.FB_FOLDING); // dust and steam: fx-p2 (every FORWARD_BASE event)
        if (e.b === economy2_ts_1.FB_DEFENCES)
            fb1Stats.unfolds++;
        else
            fb1Stats.folds++;
    }
    else if (e.kind === events_ts_1.EV.FORWARD_BASE) {
        if (e.b === economy2_ts_1.FB_DEPLOYING || e.b === economy2_ts_1.FB_PACKING)
            baseJobs.set(e.a, { until: now + e.v1 * 1000, text: e.b === economy2_ts_1.FB_DEPLOYING ? "DEPLOYING" : "PACKING" });
        else
            baseJobs.delete(e.a);
    }
}
/** Command view: the forward base / Repair Bay panel for the selection. */
function econPanel() {
    const el = $("c6Panel");
    let h = "";
    econStats.repairRing = 0;
    if (started && mode === "cmd") {
        const sel = selectedUnits(), fbv = sel.length === 1 ? renderedById.get(sel[0]) : undefined;
        const sb = selBuilding ? renderedById.get(selBuilding) : undefined;
        if (fbv && fbv.type === T_FBV && fbv.team === 0) {
            const job = baseJobs.get(fbv.id);
            h = `<div class="ph">FORWARD BASE VEHICLE</div>` + (job ? `<div class="note">${job.text} · ${Math.max(0, Math.ceil((job.until - performance.now()) / 1000))} s</div>` : `<div class="opt" data-act="fbdeploy" data-b="${fbv.id}"><span class="n">DEPLOY FORWARD BASE</span><small>on a held, supplied point that is not a citadel · becomes a Field Depot with 3 slots</small></div>`);
        }
        else if (sb && sb.type === T_DEPOT && sb.team === 0) {
            const job = baseJobs.get(sb.id);
            h = `<div class="ph">FIELD DEPOT</div>` + (job ? `<div class="note">${job.text} · ${Math.max(0, Math.ceil((job.until - performance.now()) / 1000))} s</div>` : `<div class="opt" data-act="fbpack" data-b="${sb.id}"><span class="n">PACK UP</span><small>back into a Forward Base Vehicle</small></div>`);
        }
        else if (sb && sb.type === T_RELAY && sb.team === 0) {
            // C7b item 4: the Relay Tower's jammer (state from the JAMMER events)
            const j = stl.jammers.get(sb.id), on = !!j?.on;
            h = `<div class="ph">RELAY TOWER · radar ${Math.round(cd.tSensor[sb.type] * RADAR_MUL)} m</div><div class="opt${on ? " on" : ""}" data-act="jammer" data-b="${sb.id}"><span class="n">JAMMER ${on ? "ON → switch off" : "OFF → switch on"} · ${c7b_ts_3.TOOL_KEY_LABEL}</span><small>hides our units within ${JAM_R} m from enemy radar (not from sight) · blocks enemy orbital calls there</small></div>`;
        }
        else if (sb && sb.type === T_REPAIR) {
            h = `<div class="ph">REPAIR BAY</div><div class="note">repairs ${REPAIR_RATE} hull / s to friendly vehicles within ${REPAIR_R} m</div>`;
        }
    }
    // the Repair Bay's radius (selected, either view's selection)
    const rb = selBuilding ? renderedById.get(selBuilding) : undefined;
    if (rb && rb.type === T_REPAIR) {
        for (let i = 0; i < 72; i++) {
            const a = (i / 72) * Math.PI * 2, x = rb.x + Math.cos(a) * REPAIR_R, z = rb.z + Math.sin(a) * REPAIR_R;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.5, z, mode === "cmd" ? 1.2 : 0.3, [0.4, 1, 0.55], 0.8);
        }
        econStats.repairRing = 1;
    }
    if (el.dataset.h !== h) {
        el.innerHTML = h;
        el.dataset.h = h;
        el.style.display = h ? "block" : "none";
    }
}
// ---- ruling 133: fortification on screen (the snapshot's fortify jobs: real progress and stage)
const FORT_DEFS = FORT_LEVELS;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const T_BARRICADE = cd.typeIds.indexOf("barricade"), T_BUNKER_T = cd.typeIds.indexOf("bunker");
const FORT_LAYOUT = (data.points?.fortification ?? {});
const FORT_SEGS = Math.max(1, Math.round(FORT_LAYOUT.layout?.wallSegmentsPerApproach ?? 1));
const MINE_R = Number((data.supportCalls?.calls ?? []).find((c) => c.id === "minefield")?.params?.radius ?? 15);
/** Seconds of work for level L (the sim's upgradeSecondsPerLevel interpolation). */
function fortUpgradeS(L) { const s = FORT_LAYOUT.upgradeSecondsPerLevel ?? [30, 60], top = FORT_LEVELS.length - 1, f = top <= 1 ? 0 : (L - 1) / (top - 1); return s[0] + (s[s.length - 1] - s[0]) * f; }
const fortStats = { rising: 0, ring: 0, arcs: 0, done: 0, scaffold: 0, views: [], spots: [] };
let fortDone = [];
function fortViewsNow() {
    const pv = views.length ? views[views.length - 1].points : null;
    const out = (pv?.fortify ?? []).map((j) => (0, fort1_ts_1.fortJobView)(j, FORT_DEFS, dt, 0));
    fortStats.views = out;
    return out;
}
/** Where the jobs' new structures stand (rising instances, scaffolds). */
function fortSpotsNow() {
    const out = [];
    for (const j of fortViewsNow()) {
        const p = ptStatics[j.point];
        if (!p)
            continue;
        const owner = j.own ? 0 : 1;
        for (const spot of (0, fort1_ts_1.fortSpots)(FORT_DEFS, j.level, p, ptStatics, T_BARRICADE >= 0 ? cd.tRadius[T_BARRICADE] : 3, FORT_SEGS, MINE_R, (q) => (ptModels[q]?.owner ?? -1) !== owner))
            out.push({ job: j, spot });
    }
    fortStats.spots = out.map((o) => ({ kind: o.spot.kind, x: o.spot.x, z: o.spot.z }));
    return out;
}
/** Per frame: the progress ring on the ground around the point, scaffold poles at each new structure, sparks while the work runs, the finish flash. */
function fortFrame(now) {
    fortStats.ring = 0;
    fortStats.scaffold = 0;
    if (!started)
        return;
    if (mode === "cmd")
        fortStats.arcs = 0;
    const big = mode === "cmd" ? 3 : 1;
    for (const j of fortViewsNow()) {
        const s = ptStatics[j.point];
        if (!s)
            continue;
        const col = j.own ? [1, 0.78, 0.25] : [1, 0.35, 0.25], dim = [0.45, 0.4, 0.3];
        const N = 96, r = s.ring + 2;
        for (let i = 0; i < N; i++) {
            const a = -Math.PI / 2 + (i / N) * Math.PI * 2, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r, on = i / N < j.progress;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.4, z, (on ? 0.32 : 0.16) * big, on ? col : dim, on ? 0.95 : 0.35);
            fortStats.ring++;
        }
    }
    for (const { job, spot } of fortSpotsNow()) {
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, spot.x, spot.z), col = [1, 0.8, 0.3];
        if (spot.kind === "mines") {
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2, rr = MINE_R * 0.6 * job.progress;
                fx.dot(spot.x + Math.cos(a) * rr, gy + 0.2, spot.z + Math.sin(a) * rr, 0.25 * big, [1, 0.35, 0.15], 0.5 + 0.4 * Math.sin(now / 250 + i));
            }
            continue;
        }
        const t = spot.kind === "wall" ? T_BARRICADE : spot.kind === "bunker" ? T_BUNKER_T : -1;
        const rr = t >= 0 ? cd.tRadius[t] : 4, hgt = spot.kind === "bunker" ? 4.5 : spot.kind === "node" ? 7 : 3.2;
        // the scaffold: four poles at the corners to the full height, a rail at the height built so far
        for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const px = spot.x + cx * rr * 0.8, pz = spot.z + cz * rr * 0.8;
            for (let k = 0; k <= 6; k++)
                fx.dot(px, gy + (k / 6) * hgt, pz, 0.12 * big, [0.85, 0.7, 0.35], 0.75);
            fx.dot(px, gy + hgt * (0, fort1_ts_1.fortRise)(job.progress), pz, 0.22 * big, col, 0.95);
        }
        fortStats.scaffold++;
        if (job.stage === fort1_ts_1.FJ_BUILDING && Math.random() < 0.25)
            fx.spark(spot.x + (Math.random() - 0.5) * rr, gy + hgt * (0, fort1_ts_1.fortRise)(job.progress), spot.z + (Math.random() - 0.5) * rr, [1, 0.85, 0.4], 0.5);
    }
    fortDone = fortDone.filter((d) => now - d.t < 1600);
    for (const d of fortDone) { // a ring of light rising off the finished point
        const s = ptStatics[d.point];
        if (!s)
            continue;
        const u = (now - d.t) / 1600, r = s.ring + 2 + u * 12;
        for (let i = 0; i < 64; i++) {
            const a = (i / 64) * Math.PI * 2, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.5 + u * 6, z, 0.4 * big, [0.5, 1, 0.6], 1 - u);
        }
    }
}
/** Tags: fortify timers, low power points (command view). */
function econTags(now) {
    econStats.powerTags = 0;
    econStats.fortTags = 0;
    if (!started)
        return;
    computePower();
    void now;
    for (const j of fortViewsNow()) { // ruling 133: over the point in both views: what it becomes, the work done, what is happening
        const s = ptStatics[j.point];
        if (!s)
            continue;
        if (tag(s.x, (0, terrain_gen_ts_1.sampleHeight)(hm, s.x, s.z) + 14, s.z, `${j.title}<i><b style="width:${j.pct}%"></b></i><small>${j.status}</small>`, j.own ? "zone fort" : "zone en fort"))
            econStats.fortTags++;
    }
    if (mode === "cmd")
        powerNow.forEach((p, i) => { const s = ptStatics[i]; if (s && p.net < 0 && ptModels[i]?.owner === 0 && tag(s.x, (0, terrain_gen_ts_1.sampleHeight)(hm, s.x, s.z) + 6, s.z, `LOW POWER ${p.net}`, "lowpow"))
            econStats.powerTags++; });
}
/** Item 5b: weather (W2d snapshot block, WEATHER events): HUD line, feed, fog and sky tint, screen overlay. */
const WX_DEFS = (data.weather?.weather ?? []);
let wxFog = { mul: 1, start: null }, wxNow = { id: null, text: "", tintK: 0, flashes: 0, overlay: "", feed: 0 };
let wxFlashUntil = 0, wxTint = 0;
function weatherFrame(now, frameDt) {
    const v = views.length ? views[views.length - 1] : null;
    const h = (0, c6_ts_5.weatherHud)(v?.weather, WX_DEFS, v ? v.tick : 0, dt), L = (0, c6_ts_5.weatherLook)(h.currentId);
    wxNow.id = h.currentId;
    wxNow.text = h.text;
    const el = $("wxTag");
    const show = started && !!v?.weather;
    el.style.display = show ? "block" : "none";
    if (show && el.textContent !== `WEATHER · ${h.text}`)
        el.textContent = `WEATHER · ${h.text}`;
    // fog and the sky ease towards the weather's look over ~3 s
    wxTint += ((L.tintK > 0 ? 1 : 0) - wxTint) * Math.min(1, frameDt / 3);
    wxFog = { mul: 1 + (L.fogMul - 1) * wxTint, start: L.fogStart !== null && wxTint > 0.3 ? L.fogStart + (1 - wxTint) * 400 : null };
    const look = render_ts_1.HALCYON, base = LOOK_BASE;
    for (const k of ["horizon", "zenith", "sunHaze", "skyAmb"])
        for (let i = 0; i < 3; i++)
            look[k][i] = base[k][i] + (L.tint[i] * (k === "zenith" ? 0.8 : 1) - base[k][i]) * L.tintK * wxTint;
    for (let i = 0; i < 3; i++)
        look.sunCol[i] = base.sunCol[i] * (1 + (L.light - 1) * wxTint);
    wxNow.tintK = L.tintK * wxTint;
    // screen overlay per weather; electrical storm: lightning flashes
    if (L.overlay !== wxNow.overlay) {
        if (wxNow.overlay)
            document.body.classList.remove(wxNow.overlay);
        if (L.overlay)
            document.body.classList.add(L.overlay);
        wxNow.overlay = L.overlay;
    }
    if (h.currentId === "electrical-storm" && now > wxFlashUntil + 2500 && Math.random() < frameDt * 0.25) {
        wxFlashUntil = now + 140;
        wxNow.flashes++;
    }
    document.body.classList.toggle("wx-flash", now < wxFlashUntil);
    // liquid surfaces of the terrain layer near the camera: lava glows and bubbles, other liquids glint
    if (TLAYER && started)
        for (let i = 0; i < 40; i++) {
            const x = eye[0] + (Math.random() - 0.5) * 240, z = eye[2] + (Math.random() - 0.5) * 240, t = (0, c6_ts_5.layerTypeAt)(TLAYER, x, z);
            if (t === "lava") {
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.15, z, 1.2 + Math.random(), [1, 0.45 + Math.random() * 0.2, 0.08], 0.7);
                liquidDots++;
            }
            else if (t === "liquid") {
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 0.1, z, 0.5, [0.5, 0.8, 0.85], 0.25, 0.5);
                liquidDots++;
            }
        }
}
let liquidDots = 0;
/** Item 5: call-down effects (client side only, from events and the snapshot's zones). */
const CALL_NAMES = (data.supportCalls?.calls ?? []).map((c) => c.name);
let passes = [];
let sweeps = [], emps = [];
let landed = [];
const beaconPos = new Map();
const heavyStats = { pickups: 0, near: 0 };
/** F3: the held viewmodel of a pod heavy weapon. */
const HEAVY_VM = { "rocket-tube": "vm-tube", "arc-lance": "vm-lance", "anti-materiel-rifle": "vm-amr", "pilot-laser-cannon": "vm-lcannon" };
function heavyVm(w) { return HEAVY_VM[cd.weaponIds[w]] ?? "vm-tube"; }
let aimLines = 0, callFxStats = { shells: 0, lines: 0, sweeps: 0, emps: 0, mines: 0, pods: 0, podsFalling: 0, zones: 0, zoneDots: 0, sweptTags: 0, zoneTags: 0, pickups: 0 };
let zonesNow = [];
const wName = (w) => (w >= 0 && w < weaponName.length ? weaponName[w] : "weapon");
/** F3 (designer 16 Nov: "heavy weapon pod does not appear to work"): the heavy weapon the own pilot carries (-1 none). */
function heavyNow() { const v = views.length ? views[views.length - 1] : null; return v?.calls?.heavyWeapon ?? -1; }
/** Kit slot 2 holds the pod's heavy weapon (it replaces the long rifle until the pilot dies). */
/** Ironfall only: the pod's heavy weapon replaces the long rifle in slot 2 (Frontline keeps it in slot 3, so the scoped guns stay scoped). */
function rifleHeavy() { return !isFrontline() && kit === 1 && heavyNow() >= 0; }
const heavyHeld = () => (isFrontline() ? kit === 2 : kit === 1) && heavyNow() >= 0; // Frontline: the pod's weapon is slot 3 (key 3)
/** Frontline: a delivery touching down (no explosion): a ring of dust kicked out, radius r. */
function flDust(x, y, z, r = 2.4) {
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, rr = r * (0.65 + (i % 3) * 0.35);
        fx.spark(x + Math.cos(a) * rr, y + 0.4, z + Math.sin(a) * rr, [0.6, 0.55, 0.46], 1.1);
    }
    callFxStats.dust = (callFxStats.dust ?? 0) + 1;
}
function callImpactFx(kind, e, y) {
    const now = performance.now();
    if (kind === "sentry")
        podTr.noteImpact(e.v1, e.v2, now); // ruling 130: the pod opens from the thud
    if ((0, c6_ts_6.podCall)(kind)) {
        if (!isFrontline())
            fx.explosion(e.v1, y, e.v2, 2.5, 3);
        else if (kind !== "drop") // Frontline: a delivery lands, it does not blow up (the vehicle crate has its own dust: flDropOpen)
            flDust(e.v1, y, e.v2);
        snd.sting("landing", [e.v1, y, e.v2]);
        callFxStats.pods++;
        landed.push({ x: e.v1, z: e.v2, until: now + 8000, label: kind === "resupply" ? `RESUPPLY · ${e.d} pilot${e.d === 1 ? "" : "s"}` : kind === "drop" ? (e.d ? "DROP LANDED" : "DROP FAILED · no room") : kind === "supply" ? (e.d > 0 ? `SUPPLY DROP · +${e.d} ore / gas` : "SUPPLY DROP · storage full") : kind === "repair" ? "REPAIR BEACON ONLINE" : "" });
        if (kind === "supply" && e.team === 0)
            notify(e.d > 0 ? `SUPPLY DROP LANDED · +${e.d} ore and gas to the stockpile` : "SUPPLY DROP LANDED · storage full: nothing added", e.d > 0 ? "good" : "warn");
    } // ruling 121
    else if (kind === "sweep") {
        sweeps.push({ x: e.v1, z: e.v2, start: now, until: now + Math.max(10000, (callRules?.calls[e.c]?.durTicks ?? 0) * dt * 1000) /* ruling 121: the recon drone spots for 30 s */, r: callRules?.calls[e.c]?.radius || 200 });
        snd.sting("sweep", [e.v1, y, e.v2]);
        callFxStats.sweeps++;
    }
    else if (kind === "emp") {
        emps.push({ x: e.v1, z: e.v2, start: now, until: now + 8000, r: callRules?.calls[e.c]?.radius || 40 });
        fx.explosion(e.v1, y + 1, e.v2, 3, 0);
        callFxStats.emps++;
    }
    else if (kind === "smoke" || kind === "shield" || kind === "mines") {
        if (isFrontline())
            flDust(e.v1, y, e.v2, 1.6); // a canister landing, not a blast
        else
            fx.explosion(e.v1, y, e.v2, 1.5, 3);
    }
    // barrage (shells follow as CALL_EFFECT), line calls (the pass is a CALL_EFFECT): nothing at the beacon itself
}
/** CALL_EFFECT (29): barrage shells, the line calls' aircraft pass, mines going off, lasting effects starting / ending, pod pickups. */
function onCallEffect(e) {
    const sub = e.flags & 15, now = performance.now();
    if (sub === 7 && isFrontline()) { // Frontline: the reinforcement Mule landed its troops
        if (e.team === 0)
            notify("REINFORCEMENTS LANDED · they hold this point for a minute", "good");
        flDust(e.v1, (0, terrain_gen_ts_1.sampleHeight)(hm, e.v1, e.v2), e.v2, 5); // the Mule's touchdown
        return;
    }
    const t = (0, c6_ts_6.callEffectText)(e, callRules, CALL_NAMES, pilotId, wName);
    if (t)
        notify(t.text, t.kind);
    if (sub === calls_ts_1.CE_SHELL) {
        const y = (0, terrain_gen_ts_1.sampleHeight)(hm, e.v1, e.v2);
        fx.explosion(e.v1, y, e.v2, 3.5, 3);
        snd.callImpact([e.v1, y, e.v2]);
        callFxStats.shells++;
    }
    else if (sub === calls_ts_1.CE_LINE) {
        const b = beaconPos.get(e.a) ?? { x: e.v1, z: e.v2 };
        passes.push({ x0: b.x, z0: b.z, x1: e.v1, z1: e.v2, start: now, dur: 1800, n: Math.max(1, Math.min(40, e.d)), bomb: callRules?.calls[e.c]?.id === "bomb-run", done: 0 });
        snd.sting("aircraft-down", [b.x, 60, b.z]);
        callFxStats.lines++;
    }
    else if (sub === calls_ts_1.CE_MINE) {
        const y = (0, terrain_gen_ts_1.sampleHeight)(hm, e.v1, e.v2);
        fx.explosion(e.v1, y, e.v2, 3, 3);
        snd.callImpact([e.v1, y, e.v2]);
        callFxStats.mines++;
    }
    else if (sub === calls_ts_1.CE_PICKUP) {
        callFxStats.pickups++;
        // F3: the pod's weapon goes straight into the hand (slot 2), with a clear cue
        if (e.d === pilotId) {
            setKit(isFrontline() ? 2 : 1); // Frontline: the pod's weapon is slot 3 (designer 20 Nov: switching to slot 2 raised the long rifle's scope)
            heavyStats.pickups++;
            snd.ui("confirm");
            const zn = (views.length ? views[views.length - 1].calls?.zones ?? [] : []).find((z) => z.beacon === e.a);
            notify(`HEAVY WEAPON IN HAND · ${zn ? wName(zn.value) : "pod weapon"} · slot ${isFrontline() ? 3 : 2} · LMB fire`, "good");
        }
        if (!isFrontline()) // Frontline: taking a pod's contents is not a blast
            fx.explosion(e.v1, (0, terrain_gen_ts_1.sampleHeight)(hm, e.v1, e.v2) + 0.5, e.v2, 1, 1);
    }
    else if (sub === calls_ts_1.CE_START || sub === calls_ts_1.CE_END) { /* the zone comes and goes with the snapshot */ }
}
/**
 * Frontline: call-downs drawn as objects. In the last seconds before impact a pod call's pod (or a vehicle drop's vehicle,
 * under retro-rocket flames) comes down onto the beacon; on the ground the resupply pods stand with one container per
 * charge left beside them, and a weapon pod stands at its pickup zone.
 */
let flGroundPods = [];
const flPodLand = new Map();
const flCallStats = { falling: 0, ground: 0, crates: 0 };
function flInst(kind, x, y, z, yaw, team, scale = 1, amp = 0) {
    const kb = kindBuf.get(kind);
    if (!kb)
        return;
    kb.a = grow(kb.a, (kb.n + 1) * render_ts_1.INST_FLOATS);
    putInst(kb.a, kb.n * render_ts_1.INST_FLOATS, x, y, z, yaw, yaw, team, 0, scale, 0, amp);
    kb.n++;
}
/**
 * Frontline: the vehicle drop. A crate sized to the vehicle falls fast, its four corner thrusters fire about 70 m up and
 * brake it to a soft touchdown (dust); then the lid's bolts pop, the four walls fall outward and the vehicle (already
 * spawned by the sim inside it) sits there; the floor and walls sink away after a few seconds.
 */
const FL_DROP_RETRO = 1.6, FL_DROP_RETRO_H = 70; // the burn: the last 1.6 s, from 70 m
function flDropHeight(secs) {
    if (secs <= 0)
        return 0;
    if (secs < FL_DROP_RETRO)
        return FL_DROP_RETRO_H * (secs / FL_DROP_RETRO) ** 2; // braking to a stop at the ground
    return FL_DROP_RETRO_H + (360 - FL_DROP_RETRO_H) * Math.min(1, (secs - FL_DROP_RETRO) / (3.5 - FL_DROP_RETRO)); // falling fast
}
function flDropSize(t) {
    const mesh = MESH.get(kindOfType[t]);
    return Math.max(5, (cd.tRadius[t] ?? 3) * 2.2, mesh ? (mesh.height + 0.6) / DROP_H_K : 0);
}
const DROP_H_K = 0.78; // the crate's height for a 1 m width (meshes.ts DROP_H)
function flDropThrusters(x, y, z, yaw, S, power, gy) {
    for (let k = 0; k < 4; k++) {
        const a = yaw + k * Math.PI / 2 + Math.PI / 4, r = 0.43 * Math.SQRT2 * S, fx0 = x + Math.cos(a) * r, fz0 = z + Math.sin(a) * r, y0 = y - 0.11 * S;
        if (power <= 0.02)
            continue;
        fx.dotKeep(fx0, y0, fz0, S * 0.07 * (0.8 + power), [1, 0.85, 0.55], 1);
        const len = 2 + power * S * 0.9;
        for (let i = 1; i < 8; i++) {
            const yy = y0 - (i / 8) * len;
            if (yy < gy - 0.2)
                break;
            fx.dotKeep(fx0, yy, fz0, S * 0.06 * power * (1 - i / 10), [1, 0.62 - i * 0.04, 0.2], (0.85 - i * 0.09) * power);
        }
        if (y0 - len < gy + 2) // the jets reach the ground: dust thrown out
            for (let i = 0; i < 3; i++) {
                const da = a + (performance.now() / 300 + i * 2.1), dr = S * (0.6 + 0.3 * i);
                fx.dot(x + Math.cos(da) * dr, gy + 0.6, z + Math.sin(da) * dr, S * 0.12, [0.62, 0.56, 0.46], 0.35 * power);
            }
    }
}
let flDropTimeK = 1; // test aid: slow motion for the crate opening
function flDropOpen(la, now) {
    const t = (now - la.landedAt) / 1000 / flDropTimeK, gy = (0, terrain_gen_ts_1.sampleHeight)(hm, la.x, la.z), S = la.S, team = teamIndex(la.team);
    const sink = t > 6 ? Math.min(1, (t - 6) / 2) * 0.9 * S : 0, y = gy - sink;
    if (t < 0.45) { // closed, settling; the thrusters die off; dust ring
        flInst("fldrop", la.x, y, la.z, la.yaw, team, S);
        flDropThrusters(la.x, y + 0.11 * S, la.z, la.yaw, Math.max(0, 1 - t / 0.3) * 0.6, gy);
    }
    else {
        const f = Math.min(1, (t - 0.45) / 0.85), ang = f * f * Math.PI / 2; // falling like a plank: slow, then fast
        flInst("fldropbase", la.x, y, la.z, la.yaw, team, S);
        for (let i = 0; i < 4; i++) {
            const a = la.yaw + i * Math.PI / 2;
            flInst("fldropwall", la.x + Math.cos(a) * 0.5 * S, y, la.z + Math.sin(a) * 0.5 * S, a, team, S, ang);
        }
        if (!la.popped) { // the lid's bolts: a puff, and it is gone
            la.popped = true;
            for (let i = 0; i < 14; i++)
                fx.spark(la.x + (Math.random() - 0.5) * S * 0.8, gy + DROP_H_K * S, la.z + (Math.random() - 0.5) * S * 0.8, [0.75, 0.75, 0.72], 0.9);
            snd.sting("landing", [la.x, gy, la.z]);
        }
        if (f >= 1 && !la.clunk) {
            la.clunk = true;
            snd.walkerLand?.([la.x, gy, la.z], false);
        }
    }
    if (t < 1.6) { // the dust ring from the touchdown
        const R = S * (0.7 + t * 1.6), al = 0.5 * (1 - t / 1.6);
        for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2;
            fx.dot(la.x + Math.cos(a) * R, gy + 0.5 + t * 1.2, la.z + Math.sin(a) * R, S * 0.16, [0.6, 0.55, 0.46], al);
        }
    }
    flCallStats.opening = (flCallStats.opening ?? 0) + 1;
    return t < 8;
}
function flCallMeshes(now, B, rt) {
    flCallStats.falling = flCallStats.ground = flCallStats.crates = 0;
    if (!isFrontline())
        return;
    const js = data.supportCalls?.calls ?? [];
    for (const b of currentBeacons()) {
        const kind = (0, c6_ts_6.callFxKind)(callRules, b.call);
        if (!(0, c6_ts_6.podCall)(kind) || kind === "sentry")
            continue; // the sentry has its own pod
        // the countdown arrives once per snapshot, so the pod would fall in steps: fall along the interpolated render tick
        // (as the sentry pod does) from the beacon's impact tick
        const raw = (B.calls?.beacons ?? []).find((q) => q.id === b.id), secs = raw && raw.impactTick !== undefined ? (raw.impactTick - rt) * dt : b.seconds;
        const la = flPodLand.get(b.id) ?? {};
        la.seen = now; la.x = b.x; la.z = b.z; la.team = b.team; la.call = b.call;
        flPodLand.set(b.id, la);
        if (kind === "drop") { // the vehicle crate (flDropHeight: falls fast, the thrusters brake the last 70 m)
            const unit = js.find((c) => c.id === b.callId)?.params?.deliversUnit, t = unit ? cd.typeIds.indexOf(unit) : -1;
            if (secs > 3.5)
                continue;
            const S = t >= 0 ? flDropSize(t) : 8, yaw = (b.id * 2.39996) % (Math.PI * 2), gy = (0, terrain_gen_ts_1.sampleHeight)(hm, b.x, b.z);
            const h = flDropHeight(Math.max(0, secs)), y = gy + h + 0.11 * S;
            la.S = S;
            la.yaw = yaw;
            la.drop = true;
            flInst("fldrop", b.x, y, b.z, yaw, teamIndex(b.team), S);
            flDropThrusters(b.x, y, b.z, yaw, secs < FL_DROP_RETRO ? 1 : 0.25, gy);
            flCallStats.falling++;
            flCallStats.h = h;
            continue;
        }
        const h = (0, c6_ts_6.podHeight)(Math.max(0, secs), 3.5, 360);
        if (h === null)
            continue;
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, b.x, b.z), unit = kind === "drop" ? js.find((c) => c.id === b.callId)?.params?.deliversUnit : undefined;
        const t = unit ? cd.typeIds.indexOf(unit) : -1, mk = t >= 0 ? kindOfType[t] : "flpod", yaw = mk === "flpod" ? 0.4 : (b.id * 2.39996) % (Math.PI * 2);
        flInst(mk, b.x, gy + h, b.z, yaw, teamIndex(b.team));
        flCallStats.falling++;
        flCallStats.h = h;
        // retro rockets: flames under the load, brightest in the last 80 m
        const burn = h < 90 ? 1 : 0.45, n = mk === "flpod" ? 1 : 4, r = mk === "flpod" ? 0 : Math.max(1.2, (cd.tRadius[t] ?? 2) * 0.6);
        for (let k = 0; k < n; k++) {
            const a = yaw + k * Math.PI / 2 + Math.PI / 4, fx0 = b.x + Math.cos(a) * r, fz0 = b.z + Math.sin(a) * r;
            fx.dot(fx0, gy + h - 0.3, fz0, 1.3 * burn + 0.4, [1, 0.62, 0.22], 1);
            for (let i = 1; i < 6; i++)
                fx.dot(fx0, gy + h - 0.3 - i * 1.6, fz0, (1.1 - i * 0.15) * burn, [1, 0.5 - i * 0.05, 0.18], 0.75 - i * 0.12);
        }
    }
    // a pod that has just touched down stays on the ground until its pickup zone (or resupply pod) shows up
    const live = new Set(currentBeacons().map((b) => b.id));
    for (const [id, la] of flPodLand) {
        if (live.has(id))
            continue;
        const kind = (0, c6_ts_6.callFxKind)(callRules, la.call), drop = kind === "drop";
        if (drop && la.drop) { // the crate opens (walls fall), then sinks away
            la.landedAt ??= now;
            let keep = true;
            try {
                keep = flDropOpen(la, now);
            }
            catch (err) {
                flCallStats.dropErr = String(err);
            }
            if (!keep) {
                flCallStats.dropGone = `t=${((now - la.landedAt) / 1000).toFixed(1)}`;
                flPodLand.delete(id);
            }
            continue;
        }
        const taken = zonesNow.some((z) => z.kind === "pod" && Math.hypot(z.x - la.x, z.z - la.z) < 12) || flGroundPods.some((g) => Math.hypot(g[0] - la.x, g[1] - la.z) < 12);
        if (drop || taken || now - la.seen > 2500) {
            if (drop)
                flCallStats.dropGone2 = `drop ${la.drop} kind ${kind}`;
            flPodLand.delete(id);
            continue;
        }
        flInst("flpod", la.x, (0, terrain_gen_ts_1.sampleHeight)(hm, la.x, la.z), la.z, 0.4, teamIndex(la.team));
        flCallStats.ground++;
    }
    for (const [x, z, team, left] of flGroundPods) {
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
        flInst("flpod", x, gy, z, 0.4, teamIndex(team));
        flCallStats.ground++;
        for (let k = 0; k < Math.min(4, left); k++) {
            const a = 0.4 + k * Math.PI / 2, cx = x + Math.cos(a) * 2.4, cz = z + Math.sin(a) * 2.4;
            flInst("flcrate", cx, (0, terrain_gen_ts_1.sampleHeight)(hm, cx, cz), cz, a, teamIndex(team));
            flCallStats.crates++;
        }
    }
    for (const z of zonesNow)
        if (z.kind === "pod") {
            flInst("flpod", z.x, (0, terrain_gen_ts_1.sampleHeight)(hm, z.x, z.z), z.z, 0.4, z.own === false ? 1 : 0);
            flCallStats.ground++;
        }
}
/**
 * Frontline: the shoulder laser cannon's beam is a thick glowing cone, as wide as the emitter at the muzzle and narrowing
 * to a point where it hits. The own beam keeps the emitter's on-screen width at the muzzle (its radius is an angle seen
 * from the eye); another pilot's beam is 0.6 m across at its muzzle. Only the newest beam per shooter is drawn.
 */
/**
 * Frontline: with the silo targeter in hand (slot 3), a red dot on the ground where the reticle ray meets it (the point the
 * targeter will mark, same ray as the sim's) and a red circle of the strike's radius, with the range in a tag.
 */
const SILO_W = cd.weaponIds.indexOf("silo-targeter"), SILO_R = data.constants.frontline?.silo?.radiusMetres ?? 40;
let flSiloPt = null;
function flSiloAim() {
    flSiloPt = null;
    if (!isFrontline() || SILO_W < 0 || kit !== 2 || !onFoot() || heavyNow() !== SILO_W || wire >= 0.5)
        return;
    const ax = target[0] - eye[0], ay = target[1] - eye[1], az = target[2] - eye[2], al = Math.hypot(ax, ay, az) || 1, d = [ax / al, ay / al, az / al];
    const t = render_ts_1.Renderer.rayTerrain(hm, eye, d, 3000);
    if (!(t > 0))
        return;
    const x = eye[0] + d[0] * t, z = eye[2] + d[2] * t, y = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
    flSiloPt = [x, y, z, t];
    const k = Math.max(0.4, t * 0.006), pulse = 0.75 + 0.25 * Math.sin(performance.now() / 160);
    fx.dot(x, y + k * 0.6, z, k * 1.4, [1, 0.12, 0.08], 0.55 * pulse);
    fx.dot(x, y + k * 0.6, z, k * 0.6, [1, 0.35, 0.3], 1);
    const n = 64;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, rx = x + Math.cos(a) * SILO_R, rz = z + Math.sin(a) * SILO_R;
        fx.dot(rx, (0, terrain_gen_ts_1.sampleHeight)(hm, rx, rz) + 0.6, rz, Math.max(0.35, t * 0.0025), [1, 0.15, 0.1], 0.75);
    }
}
const flBeamStats = { beams: 0, dots: 0 };
let flOwnBeamUntil = 0, flOwnBeamLen = 300;
function flBigBeams(list) {
    flBeamStats.beams = flBeamStats.dots = 0;
    const newest = new Map(), now = performance.now();
    for (const b of list)
        if (b.life === CONT_BEAM_S && !b.own && (!newest.has(b.shooter) || newest.get(b.shooter).t0 < b.t0))
            newest.set(b.shooter, b);
    const draw = [...newest.values()];
    // own beam: while the shots keep coming, drawn every frame from the drawn cannon (first person) or the body's shoulder
    // to the point under the reticle, so it follows every move, jump and turn
    const myB = bodyId(), me3 = myB ? renderedById.get(myB) : undefined;
    if (now < flOwnBeamUntil && me3) {
        const fp = mode === "fp" && onFoot() && !freeCam && !cine, m = fp ? vmMuzzleWorld(VM_TRACER_DEPTH) : null;
        // along the camera's view (the reticle), as far as the last shot reached
        const ax = target[0] - eye[0], ay = target[1] - eye[1], az = target[2] - eye[2], al = Math.hypot(ax, ay, az);
        const R = Math.max(2, flOwnBeamLen), ux = al > 1e-6 ? ax / al : Math.cos(me3.yaw), uy = al > 1e-6 ? ay / al : 0, uz = al > 1e-6 ? az / al : Math.sin(me3.yaw);
        flBeamStats.vm = !!m;
        flBeamStats.fp = fp;
        const from = m ?? [me3.x + Math.cos(me3.yaw) * 0.4 - Math.sin(me3.yaw) * 0.35, me3.y + 1.55, me3.z + Math.sin(me3.yaw) * 0.4 + Math.cos(me3.yaw) * 0.35];
        draw.push({ from, to: [eye[0] + ux * R, eye[1] + uy * R, eye[2] + uz * R], team: me3.team, own: !!m, shooter: myB });
    }
    for (const b of draw) {
        const dx = b.to[0] - b.from[0], dy = b.to[1] - b.from[1], dz = b.to[2] - b.from[2], L = Math.hypot(dx, dy, dz) || 1;
        const col = b.team === 0 ? [0.35, 0.85, 1] : [1, 0.4, 0.25];
        let sd = 0, n = 0;
        // own beam: seen from the eye it runs from the emitter to the aim point; its radius (as an angle) shrinks with the
        // angle left between the point and the hit, so on screen it is a wedge from the emitter's width to a point
        const tx = b.to[0] - eye[0], ty = b.to[1] - eye[1], tz = b.to[2] - eye[2], tl = Math.hypot(tx, ty, tz) || 1;
        const angTo = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return Math.acos(Math.max(-1, Math.min(1, (x * tx + y * ty + z * tz) / (l * tl)))); };
        const ang0 = Math.max(0.02, angTo(b.from[0] - eye[0], b.from[1] - eye[1], b.from[2] - eye[2]));
        while (sd < L && n < 600) {
            const t = sd / L, px = b.from[0] + dx * t, py = b.from[1] + dy * t, pz = b.from[2] + dz * t, flick = 0.9 + 0.1 * Math.sin(performance.now() / 23 + sd);
            let r;
            if (b.own) {
                const ex = px - eye[0], ey = py - eye[1], ez = pz - eye[2], dist = Math.hypot(ex, ey, ez);
                r = 0.22 * Math.min(1, angTo(ex, ey, ez) / ang0) * dist * flick;
            }
            else
                r = 0.3 * Math.pow(1 - t, 0.8) * flick;
            if (r < 0.012 && b.own)
                break; // reached the point
            fx.dotKeep(px, py, pz, r, col, 0.5, 1);
            fx.dotKeep(px, py, pz, r * 0.5, [0.92, 0.98, 1], 0.95, 1);
            n++;
            sd += Math.max(r * 0.6, 0.02);
        }
        fx.dot(b.to[0], b.to[1], b.to[2], 0.9, col, 0.9, 1); // the burn at the hit point
        fx.dot(b.to[0], b.to[1], b.to[2], 0.4, [1, 1, 1], 1, 1);
        flBeamStats.beams++;
        flBeamStats.L = L;
        flBeamStats.d0 = Math.hypot(b.from[0] - eye[0], b.from[1] - eye[1], b.from[2] - eye[2]);
        flBeamStats.own = b.own;
        flBeamStats.dots += n;
    }
}
/** Per frame (drawn with the beacons): falling pods, aircraft passes, sweep rings, EMP sparks, lasting zones. */
function callFxFrame(now) {
    const v = views.length ? views[views.length - 1] : null;
    callFxStats.podsFalling = 0;
    for (const b of currentBeacons()) {
        beaconPos.set(b.id, { x: b.x, z: b.z });
        const kind = (0, c6_ts_6.callFxKind)(callRules, b.call), h = (0, c6_ts_6.podCall)(kind) && !(isFrontline() && kind !== "sentry") ? (0, c6_ts_6.podHeight)(b.seconds) : null;
        if (h === null)
            continue;
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, b.x, b.z);
        callFxStats.podsFalling++;
        fx.dot(b.x, gy + h + 1.2, b.z, 1.4, [1, 0.6, 0.25], 1);
        fx.dot(b.x, gy + h + 1.2, b.z, 0.9, [1, 0.95, 0.8], 1);
        for (let i = 1; i < 10; i++)
            fx.dot(b.x, gy + h + 1.2 + i * 4, b.z, 0.8 - i * 0.06, [1, 0.5, 0.2], 0.55 - i * 0.05);
    }
    if (beaconPos.size > 64)
        beaconPos.clear();
    // strafing / bomb run: the aircraft flies the line (from 120 m before the beacon to 120 m past the end), hits follow it
    passes = passes.filter((p) => now - p.start < p.dur + 400);
    for (const p of passes) {
        const L = Math.hypot(p.x1 - p.x0, p.z1 - p.z0) || 1, ux = (p.x1 - p.x0) / L, uz = (p.z1 - p.z0) / L;
        const total = L + 240, f = (0, math_ts_1.clamp)((now - p.start) / p.dur, 0, 1), along = -120 + f * total;
        const ax = p.x0 + ux * along, az = p.z0 + uz * along, ay = (0, terrain_gen_ts_1.sampleHeight)(hm, ax, az) + (p.bomb ? 70 : 45);
        for (let i = -3; i <= 3; i++)
            fx.dot(ax - uz * i * 1.6, ay, az + ux * i * 1.6, 0.7, [0.85, 0.9, 1], 0.9, 0.6); // wings
        for (let i = 0; i < 4; i++)
            fx.dot(ax - ux * i * 1.8, ay, az - uz * i * 1.8, 0.8, [0.85, 0.9, 1], 0.9, 0.6); // fuselage
        for (let i = 1; i < 8; i++)
            fx.dot(ax - ux * (6 + i * 4), ay, az - uz * (6 + i * 4), 0.4, [1, 0.7, 0.4], 0.4 - i * 0.04);
        // impacts along the line as the aircraft passes over them
        while (p.done < p.n && along >= (p.done / Math.max(1, p.n - 1)) * L) {
            const tt = p.n > 1 ? p.done / (p.n - 1) : 0, x = p.x0 + (p.x1 - p.x0) * tt, z = p.z0 + (p.z1 - p.z0) * tt, y = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
            if (p.bomb) {
                fx.explosion(x, y, z, 4, 3);
                snd.callImpact([x, y, z]);
            }
            else
                fx.spark(x, y + 0.2, z, [1, 0.8, 0.4], 1.4);
            p.done++;
        }
    }
    // sensor sweep: a ring running out to its radius in 1.5 s
    sweeps = sweeps.filter((w) => now < w.until);
    for (const w of sweeps) {
        const f = (now - w.start) / 1500;
        if (f > 1.2)
            continue;
        const r = w.r * Math.min(1, f), n = 96, a0 = Math.max(0, 1 - f) * 0.9 + 0.1;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2, x = w.x + Math.cos(a) * r, z = w.z + Math.sin(a) * r;
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1, z, 1.1, [0.3, 1, 0.75], a0);
        }
    }
    // EMP: a blue pulse to its radius, then sparks on vehicles and structures inside for 8 s
    emps = emps.filter((w) => now < w.until);
    for (const w of emps) {
        const f = (now - w.start) / 600;
        if (f < 1)
            for (let i = 0; i < 64; i++) {
                const a = (i / 64) * Math.PI * 2, x = w.x + Math.cos(a) * w.r * f, z = w.z + Math.sin(a) * w.r * f;
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1, z, 1, [0.45, 0.65, 1], 1 - f);
            }
        for (const e of rendered)
            if (!cd.tPilot[e.type] && ARMOUR[cd.tArmour[e.type]] !== "infantry" && Math.hypot(e.x - w.x, e.z - w.z) <= w.r && Math.random() < 0.12)
                fx.spark(e.x + (Math.random() - 0.5) * 3, e.y + 1 + Math.random() * 2, e.z + (Math.random() - 0.5) * 3, [0.5, 0.7, 1], 0.6);
    }
    landed = landed.filter((l) => now < l.until);
    // lasting zones from the snapshot (w2a)
    zonesNow = (0, c6_ts_6.zoneModels)(v?.calls, callRules, v ? v.tick : 0, dt, 0, MAP_SIZE, wName, CALL_NAMES);
    callFxStats.zones = zonesNow.length;
    const d0 = fx.dots;
    for (const z of zonesNow) {
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, z.x, z.z);
        if (z.kind === "smoke") {
            // a wall of slow grey puffs along the throw direction, len x width
            for (const [x, zz] of (0, c6_ts_6.linePoints)(z.x, z.z, z.yaw, z.len, Math.round(z.len / 2)))
                for (let j = -1; j <= 1; j++) {
                    const ox = -Math.sin(z.yaw) * j * z.width / 3, oz = Math.cos(z.yaw) * j * z.width / 3, wob = Math.sin(now / 700 + x * 0.3 + j) * 0.6;
                    fx.dot(x + ox, (0, terrain_gen_ts_1.sampleHeight)(hm, x, zz) + 1.5 + wob, zz + oz, 2.6, [0.55, 0.56, 0.55], 0.45, 0);
                }
        }
        else if (z.kind === "shield") {
            for (let i = 0; i < 10; i++)
                for (let j = 0; j < 20; j++) {
                    const el = (i / 10) * Math.PI / 2, az = (j / 20) * Math.PI * 2 + i * 0.15;
                    fx.dot(z.x + Math.cos(az) * Math.cos(el) * z.radius, gy + Math.sin(el) * z.radius, z.z + Math.sin(az) * Math.cos(el) * z.radius, 0.25, [0.4, 0.85, 1], 0.35 + 0.1 * Math.sin(now / 200 + i + j));
                }
        }
        else if (z.kind === "mines") {
            for (const [x, zz] of z.mines)
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, zz) + 0.15, zz, 0.3, [1, 0.3, 0.15], 0.5 + 0.4 * Math.sin(now / 300 + x));
        }
        else if (z.kind === "repair") { // ruling 121: a green ring and rising sparks over what it repairs
            for (let i = 0; i < 32; i++) {
                const a = (i / 32) * Math.PI * 2 + now / 1500, x = z.x + Math.cos(a) * z.radius, zz = z.z + Math.sin(a) * z.radius;
                fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, zz) + 0.3, zz, 0.3, [0.35, 1, 0.5], 0.6);
            }
            fx.dot(z.x, gy + 1.2 + 0.3 * Math.sin(now / 250), z.z, 0.9, [0.35, 1, 0.5], 0.9);
            for (const e of rendered)
                if (e.team === 0 && !cd.tPilot[e.type] && Math.hypot(e.x - z.x, e.z - z.z) <= z.radius + cd.tRadius[e.type] && Math.random() < 0.15)
                    fx.spark(e.x + (Math.random() - 0.5) * 2, e.y + 1 + Math.random() * 2, e.z + (Math.random() - 0.5) * 2, [0.4, 1, 0.55], 0.5);
        }
        else if (z.kind === "pod") {
            fx.dot(z.x, gy + 1, z.z, 1, [1, 0.8, 0.3], 0.8);
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2 + now / 900;
                fx.dot(z.x + Math.cos(a) * 3, gy + 0.2, z.z + Math.sin(a) * 3, 0.18, [1, 0.8, 0.3], 0.7);
            }
        }
    }
    callFxStats.zoneDots = fx.dots - d0;
}
/** Tags: lasting zones (sentry timer, minefield, pod), landed pods, enemies revealed by an own sensor sweep. */
let flLocksNow = [];
const flHopWas = new Map();
let flStepBudget = 4, flJetAt = 0, flRDown = 0, flRDownTs = 0;
// Frontline: R tapped (under 0.3 s) swaps the laser cell of the weapon in hand (or of the seat's lasers); held, it cloaks
/** Frontline: the laser in hand (or the seat's laser) is overheated. */
function flHandOverheated() {
    const v = views.length ? views[views.length - 1] : null;
    if (!v || !me)
        return false;
    const L = v.lasers?.get(me.entity);
    return !!L && L.overheated && (me.state === 0 || kit === 0 || kit === 2);
}
function flSwapNow() {
    const e = me.state === 0 ? renderedById.get(me.entity) : null;
    if (e && FL_THIRD_TYPES.has(e.type))
        return false; // the mech: R is the arc lance
    send({ t: "flSwap", mount: kit === 0 ? 0 : kit === 1 ? 1 : 2 });
    notify("CELL SWAP · a fresh cell, heat to zero", "info");
    return true;
}
let flRSwapped = false;
window.addEventListener("keydown", (ev) => {
    if (ev.code !== "KeyR" || ev.repeat)
        return;
    flRDown = performance.now();
    flRDownTs = ev.timeStamp;
    flRSwapped = false;
    // an overheated laser swaps on the press itself (no cloak for this press)
    if (started && isFrontline() && me && !dead() && !panelOpen() && flHandOverheated())
        flRSwapped = flSwapNow();
}, true);
window.addEventListener("keyup", (ev) => {
    if (ev.code !== "KeyR" || !started || !isFrontline() || !me || dead() || panelOpen() || flRSwapped)
        return;
    if (ev.timeStamp - flRDownTs > 300)
        return; // held: that was the cloak (timed by the events themselves)
    flSwapNow(); // a tap: a fresh cell before it overheats
}, true);
const gsTilt = new Map(); // Frontline: each gunship's wing-engine tilt (rad, 0 aft .. pi/2 down)
/** Frontline: a walker's jump flight time (s): up and down at the planet's gravity. */
function flJumpAir(t) { return 2 * cd.tJump[t] / (cd.gravity || 9.81); }
// Frontline: the own mech's jump jets sound on the Space press itself (the hop is a tick away; the drawn body later still)
window.addEventListener("keydown", (ev) => {
    if (ev.code !== "Space" || ev.repeat || !started || !me || me.state !== 0 || !isFrontline())
        return;
    const e = renderedById.get(me.entity);
    if (!e || !(cd.tJump[e.type] > 0) || cd.tWalk[e.type] !== 1 || me.seat !== cd.tDriverSeat[e.type])
        return;
    const now = performance.now(), hop = e.y - walkGround(e.x, e.z), cdMs = (cd.hover?.jumpCooldownTicks ?? 0) * dt * 1000;
    if (hop > 0.3 || now - flJetAt < Math.max(cdMs, flJumpAir(e.type) * 1000))
        return;
    flJetAt = now;
    snd.walkerJet([e.x, e.y + 6, e.z], true, flJumpAir(e.type));
});
function myVehId() { return me && me.state === 0 ? me.entity : -1; }
function callTags() {
    if (flSiloPt) // Frontline: the silo targeter's aim point
        tag(flSiloPt[0], flSiloPt[1] + 4, flSiloPt[2], `<b style="color:#ff5a4a">◉ SILO TARGET · ${Math.round(flSiloPt[3])} m</b><small>LMB: lock (3 s) and launch</small>`, "zone en");
    for (let i = 0; i < flLocksNow.length; i++) { // Frontline: missile locks (hold RMB in the mech)
        const e = renderedById.get(flLocksNow[i]);
        if (e)
            tag(e.x, e.y + cd.tRadius[e.type] * 2 + 2, e.z, `<b style="color:#ff6a4a">◆ LOCK ${i + 1}</b>`, "zone en");
    }
    callFxStats.zoneTags = 0;
    callFxStats.sweptTags = 0;
    if (!started)
        return;
    for (const z of zonesNow)
        if (z.kind === "sentry" || z.kind === "repair" || z.kind === "pod" || z.kind === "mines" || z.kind === "smoke" || z.kind === "shield") {
            if (tag(z.x, (0, terrain_gen_ts_1.sampleHeight)(hm, z.x, z.z) + (z.kind === "sentry" ? 9 : 3), z.z, z.kind === "shield" && c11ShieldsOff() ? `${z.label}<small>OFFLINE · solar flare</small>` : z.label, z.own ? "zone" : "zone en"))
                callFxStats.zoneTags++;
        } // C11 (ruling 68)
    for (const l of landed)
        if (l.label)
            tag(l.x, (0, terrain_gen_ts_1.sampleHeight)(hm, l.x, l.z) + 3, l.z, l.label, "zone");
    const now = performance.now();
    for (const w of sweeps)
        if (now < w.until)
            for (const e of rendered)
                if (e.team !== 0 && e.team >= 0 && Math.hypot(e.x - w.x, e.z - w.z) <= w.r) {
                    if (tag(e.x, e.y + cd.tRadius[e.type] * 2 + 2, e.z, "◎", "swept"))
                        callFxStats.sweptTags++;
                }
}
/** Item 4: the pilot kit (S12). Rules from the compiled data (reach, fuse, revive time). */
const KIT = (0, pilotkit_ts_1.compileKitRules)(cd);
const REVIVE_REACH = (KIT?.reach ?? 3) + 2 * PILOT_R;
/** Squadmates' bleed-out (DOWNED c ticks), cloaked squadmates' bodies (CLOAK), own planted charges (CHARGE). */
let downedUntil = new Map(), cloakedBodies = new Set(), plantedCharges = new Map();
let reviveHold = null, kitStats = { charges: 0, chargeKeys: 0, revives: 0, downed: 0, cloaks: 0, blasts: 0 }, cloakedDrawn = 0, downedTags = 0, chargeTags = 0;
let lastChargeTarget = null, lastRevive = null;
function c6Reset() {
    objRows = [];
    objHull = new Map();
    objPermille = new Map();
    objPanelHtml = "";
    downedUntil = new Map();
    cloakedBodies = new Set();
    plantedCharges = new Map();
    reviveHold = null;
    passes = [];
    sweeps = [];
    emps = [];
    landed = [];
    zonesNow = [];
    fortJobs = new Map();
    baseJobs = new Map();
    hulks = [];
    beams = [];
    recentDeaths = [];
    unitMem = new c6_ts_2.UnitMemory(30000);
    firingAt.clear();
}
function c6Event(e, v, now) {
    const o = (0, c6_ts_1.objectiveEventText)(e, objDefs(), 0, objPermille);
    if (o) {
        notify(o.text, o.kind);
        snd.sting(o.sound);
        objFeed++;
    }
    // item 4: pilot kit events (own team)
    const k = (0, c6_ts_1.kitEventText)(e, pilotId, (id) => playerName(id), (id) => { const x = v.entities.get(id) ?? ent(id); return x ? typeName[x.type] : "target"; });
    if (k)
        notify(k.text, k.kind);
    switch (e.kind) {
        case events_ts_1.EV.DOWNED:
            downedUntil.set(e.a, v.tick + e.c);
            kitStats.downed++;
            snd.sting("downed");
            if (e.a === pilotId)
                snd.sting("pilot-down");
            break;
        case events_ts_1.EV.REVIVED:
            downedUntil.delete(e.a);
            if (reviveHold?.pilot === e.a)
                reviveHold = null;
            kitStats.revives++;
            snd.sting("revived");
            break;
        case events_ts_1.EV.PILOT_DEATH:
            downedUntil.delete(e.a);
            break;
        case events_ts_1.EV.CHARGE: {
            const tgt = renderedById.get(e.c) ?? null;
            if (e.flags & c6_ts_1.CH_PLANTED) {
                if (tgt)
                    plantedCharges.set(e.a, { target: e.c, until: now + (KIT ? KIT.fuseTicks * dt * 1000 : 5000), x: tgt.x, z: tgt.z });
                if (e.b === pilotId)
                    snd.sting("charge-plant");
            }
            else if (e.flags & (c6_ts_1.CH_DETONATED | c6_ts_1.CH_FIZZLED)) {
                const pc = plantedCharges.get(e.a);
                plantedCharges.delete(e.a);
                if (e.flags & c6_ts_1.CH_DETONATED) {
                    const x = tgt ? tgt.x : pc?.x, z = tgt ? tgt.z : pc?.z;
                    if (x !== undefined && z !== undefined) {
                        fx.explosion(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1.2, z, 2.2);
                        snd.sting("charge-blast", [x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), z]);
                        kitStats.blasts++;
                    }
                }
            }
            break;
        }
        case events_ts_1.EV.CALL_EFFECT:
            onCallEffect(e);
            break;
        case events_ts_1.EV.FORTIFY:
        case events_ts_1.EV.FORWARD_BASE:
            econEvent(e);
            break;
        case events_ts_1.EV.AIRCRAFT_DOWN:
        case events_ts_1.EV.PASSENGER_LOST:
        case events_ts_1.EV.AIRCRAFT_LANDING:
            unitEvent(e, v);
            break;
        case events_ts_1.EV.UNIT_DIED: {
            const d = (0, c7b_ts_1.unitDied)(e);
            if (d)
                deathFx(d, v);
            break;
        }
        case events_ts_1.EV.PLAYER_JOINED:
        case events_ts_1.EV.PLAYER_LEFT:
            coopEvent(e, now);
            break; // C7b item 2
        case events_ts_1.EV.CARGO:
        case events_ts_1.EV.CARGO_LOST:
        case events_ts_1.EV.FERRY:
            cargoEvent(e, v);
            break; // C7b item 3
        case events_ts_1.EV.JAMMER:
        case events_ts_1.EV.DECOY:
        case events_ts_1.EV.SCAN:
            stealthEvent(e, now);
            break; // C7b item 4
        case events_ts_1.EV.GROUP:
        case events_ts_1.EV.AUTO_DEFEND:
            groupEvent(e, v);
            break; // C7b item 5
        case events_ts_1.EV.CLOAK:
            stl.onCloak(e, pilotId, seated() && me ? me.entity : 0, now, dt);
            break; // C7b item 4: the bike cloak (the line is C6's) // C7b item 1: deaths from the stream (w2f), not the side channel
        case events_ts_1.EV.WEATHER: {
            const w = (0, c6_ts_5.weatherEventText)(e, WX_DEFS, dt);
            if (w) {
                notify(w.text, w.kind);
                wxNow.feed++;
                if (e.b === 1)
                    snd.sting("threat");
            }
            break;
        }
        case events_ts_1.EV.CLOAK:
            if (e.flags & c6_ts_1.CL_ON) {
                cloakedBodies.add(e.b);
                if (e.a === pilotId) {
                    snd.sting("cloak-on");
                    kitStats.cloaks++;
                }
            }
            else {
                cloakedBodies.delete(e.b);
                if (e.a === pilotId)
                    snd.sting("cloak-off");
            }
            break;
    }
}
/** G on foot: plant a demo charge on the vehicle / structure in reach (s12 ACT_CHARGE, input path shared with guests). */
function plantCharge() {
    kitStats.chargeKeys++;
    const t = currentChargeTarget();
    if (!me?.kit || me.kit.charges <= 0) {
        notify("NO DEMO CHARGES LEFT · refill at a Barracks, the Command Core or a Field Depot", "warn");
        snd.ui("error");
        return;
    }
    if (!t) {
        notify(`DEMO CHARGE · get within ${KIT?.chargeReach ?? 3} m of an enemy vehicle or structure`, "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "charge", target: t.id }, "DEMO CHARGE");
    kitStats.charges++;
}
function currentChargeTarget() {
    if (!onFoot() || !bodyRender)
        return null;
    const list = rendered.map((e) => ({ id: e.id, team: e.team, x: e.x, z: e.z, radius: cd.tRadius[e.type], plantable: !cd.tPilot[e.type] && ARMOUR[cd.tArmour[e.type]] !== "infantry" }));
    return (0, c6_ts_1.chargeTarget)(list, 0, bodyRender.x, bodyRender.z, camYaw, KIT?.chargeReach ?? 3);
}
function currentMates() {
    const v = views.length ? views[views.length - 1] : null, b = bodyRender;
    return (0, c6_ts_1.downedMates)(v?.players, renderedById, pilotId, b ? b.x : eye[0], b ? b.z : eye[2]);
}
/** The prompt line on foot: revive (hold E) and the demo charge (G); downed: nothing to do but wait. */
function kitPrompt(prompt) {
    lastChargeTarget = null;
    lastRevive = null;
    if (!started || mode !== "fp" || !me)
        return prompt;
    if (me.state === c6_ts_1.PILOT_DOWNED)
        return "";
    if (!onFoot())
        return prompt;
    const add = (t) => { prompt = prompt ? `${t} · ${prompt}` : t; };
    const ct = currentChargeTarget();
    if (ct && me.kit && me.kit.charges > 0) {
        lastChargeTarget = ct;
        add(`<b>${c6_ts_1.CHARGE_KEY_LABEL}</b> plant demo charge on the ${typeName[renderedById.get(ct.id)?.type ?? 0]} (${me.kit.charges} left)`);
    }
    const rv = (0, c6_ts_1.reviveCandidate)(currentMates(), REVIVE_REACH);
    if (rv) {
        lastRevive = rv;
        const name = playerName(rv.pilotId) || "squadmate";
        const held = keys.has("KeyE");
        if (held && (!reviveHold || reviveHold.pilot !== rv.pilotId))
            reviveHold = { pilot: rv.pilotId, since: performance.now() };
        if (!held)
            reviveHold = null;
        const f = reviveHold && KIT ? (0, math_ts_1.clamp)((performance.now() - reviveHold.since) / (KIT.reviveTicks * dt * 1000), 0, 1) : 0;
        add(held ? `REVIVING ${name.toUpperCase()} · ${Math.round(f * 100)}% · keep holding <b>E</b>` : `hold <b>E</b> · revive ${name}`);
    }
    else
        reviveHold = null;
    return prompt;
}
/** Frontline: downed human pilots' bodies (any team) join the prone set (the bots' come with the snapshot). */
function flDownedFrame(v) {
    if (!v?.players)
        return;
    for (const p of v.players.values())
        if (p.state === c6_ts_1.PILOT_DOWNED && p.entity)
            flDownedEnts.add(p.entity);
}
/** World markers: downed squadmates (with the bleed-out time) and own planted charges (fuse countdown). */
function kitTags(now) {
    downedTags = 0;
    chargeTags = 0;
    if (!started)
        return;
    const tick = views.length ? views[views.length - 1].tick : 0;
    for (const m of currentMates()) {
        if (flBotsNow.some((q) => q[0] === m.pilotId))
            continue; // Frontline: an AI team-mate has its own DOWN marker (name, time, revive: flBotTags)
        const end = downedUntil.get(m.pilotId), left = end !== undefined ? Math.max(0, (end - tick) * dt) : null;
        const prog = reviveHold?.pilot === m.pilotId && KIT ? (0, math_ts_1.clamp)((performance.now() - reviveHold.since) / (KIT.reviveTicks * dt * 1000), 0, 1) : 0;
        if (tag(m.x, (0, terrain_gen_ts_1.sampleHeight)(hm, m.x, m.z) + 1.4, m.z, `▼ DOWN${playerName(m.pilotId) ? ` · ${escHtml(playerName(m.pilotId))}` : ""}<small>${left !== null ? `${Math.ceil(left)} s` : ""}${prog > 0 ? ` · revive ${Math.round(prog * 100)}%` : ` · ${Math.round(m.dist)} m`}</small>`, "down"))
            downedTags++;
    }
    for (const [, c] of plantedCharges) {
        const t = renderedById.get(c.target), x = t ? t.x : c.x, z = t ? t.z : c.z, left = Math.max(0, (c.until - now) / 1000);
        if (Math.floor(now / 250) % 2 === 0)
            fx.dot(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 1.0, z, 0.35, [1, 0.25, 0.1], 0.9);
        if (tag(x, (0, terrain_gen_ts_1.sampleHeight)(hm, x, z) + 2.2, z, `CHARGE<small>${left.toFixed(1)} s</small>`, "charge"))
            chargeTags++;
    }
}
/**
 * Frontline (designer 19 Nov: "the pilot down selection comes after the timer · add a give up option"): while downed,
 * the respawn lane can be picked already (1-4) and holding Space for a second gives up (bleeds out now).
 */
const FL_GIVEUP_MS = 1000;
let flGiveUpSince = 0, flGaveUp = false;
const flDownedNow = () => !!me && me.state === c6_ts_1.PILOT_DOWNED;
function flDownedExtras(show) {
    let el = $("downedFl");
    if (!show || !isFrontline()) {
        if (el)
            el.style.display = "none";
        flGiveUpSince = 0;
        flGaveUp = false;
        return;
    }
    if (!el) {
        el = document.createElement("div");
        el.id = "downedFl";
        el.style.cssText = "margin-top:14px;text-align:center;font:13px var(--mono);color:#d9e4e2;text-shadow:0 1px 4px #000";
        $("downed").appendChild(el);
    }
    el.style.display = "block";
    const held = keys.has("Space") && !pauseOn;
    if (held && !flGiveUpSince)
        flGiveUpSince = performance.now();
    if (!held)
        flGiveUpSince = 0;
    const k = flGiveUpSince ? Math.min(1, (performance.now() - flGiveUpSince) / FL_GIVEUP_MS) : 0;
    if (k >= 1 && !flGaveUp) {
        flGaveUp = true;
        send({ t: "flGiveUp" });
        snd.ui("click");
    }
    const lane = flLane === 3 ? "the <b>COMMAND CORE</b>" : `the <b>${["TOP", "MID", "BOTTOM"][flLane]}</b> lane (Mule ride)`;
    const html = `Respawn at ${lane} · <b>1</b> top · <b>2</b> mid · <b>3</b> bottom · <b>4</b> Core<br>`
        + `<span style="color:${flGaveUp ? "#ff9a6a" : "#ffd23c"}">${flGaveUp ? "GIVING UP…" : "HOLD <b>SPACE</b> TO GIVE UP"}</span>`
        + `<div style="width:200px;height:3px;margin:6px auto 0;background:rgba(255,255,255,0.15)"><div style="height:3px;width:${Math.round(k * 100)}%;background:#ffd23c"></div></div>`;
    if (el.dataset.h !== html) {
        el.dataset.h = html;
        el.innerHTML = html;
    }
}
/** Per frame: the downed overlay, the kit line (charges, cloak), the cloak shimmer. */
function kitFrame() {
    const d = me ? (0, c6_ts_1.downedText)(me, dt, !mp.active) : (0, c6_ts_1.downedText)({ state: 0, respawnTicks: 0, kit: null }, dt);
    const el = $("downed");
    el.style.display = d.down && started ? "flex" : "none";
    if (d.down && started) {
        $("downedText").textContent = c11DownedText(d.seconds, d.revive) ?? d.text;
        $("downedFill").style.width = `${Math.round(d.revive * 100)}%`;
    }
    flDownedExtras(d.down && started);
    c11DownedFrame(d.down);
    const kl = $("kitLine");
    const hw = views.length ? views[views.length - 1].calls?.heavyWeapon ?? -1 : -1;
    const tools = stlStats.toolLine; // C7b item 4: decoy, scout pulse, bike cloak
    const txt = me && me.kit && onFoot() ? `${isFrontline() ? `${FL.armour[flKit.armour].name.toUpperCase()} ARMOUR · G grenade` : `DEMO CHARGES ${me.kit.charges} (${c6_ts_1.CHARGE_KEY_LABEL})`} · ${(0, c6_ts_1.cloakText)(me.kit, dt)}${hw >= 0 ? ` · HEAVY: ${wName(hw)} (${isFrontline() ? 3 : 2})` : ""}${tools ? ` · ${tools}` : ""}` : tools;
    if (kl.textContent !== txt)
        kl.textContent = txt;
    document.body.classList.toggle("cloaked", (!!me?.kit && me.kit.cloak === 1 && onFoot()) || (seated() && /^BIKE CLOAKED/.test(stlStats.toolLine.split(" · ").find((x) => x.startsWith("BIKE")) ?? "")));
}
function c6Frame(now, frameDt) {
    shelterFrame(); // ruling 121
    kitFrame();
    routesFrame(now);
    unitFrame();
    econPanel();
    fortFrame(performance.now()); // ruling 133
    weatherFrame(now, frameDt);
    const v = views.length ? views[views.length - 1] : null;
    objRows = (0, c6_ts_1.objectiveRows)(v?.match, objDefs(), v ? v.tick : 0, dt, 0, objHull).map((row) => ({ ...row, detail: c9ObjDetail(row.type, row.detail, row.index) })); // C9: fix-qa2 mission details
    const el = $("objPanel");
    const html = objRows.length && started ? `<div class="oh">${(0, battles_ts_1.battleOf)(config.battle).label} · OBJECTIVES</div>` + objRows.map((r) => `<div class="ob ${r.status}"><span class="n">${r.side ? "◇ " : "◆ "}${r.name}${r.status === "done" ? " · DONE" : r.status === "failed" ? " · FAILED" : ""}</span><small>${r.detail}${r.timer ? ` · <span class="t">${r.timer}</span>` : ""}${r.own ? "" : " · enemy objective"}</small><i><b style="width:${(r.progress * 100).toFixed(0)}%"></b></i></div>`).join("") : "";
    if (html !== objPanelHtml) {
        objPanelHtml = html;
        el.innerHTML = html;
        el.style.display = html ? "block" : "none";
    }
}
void c6_ts_1.clock;
// ------------------------------------------------------------------ C9: the fix-qa2 sim features on screen
// The snapshot does not carry the reserve, garrisons, domes, upgrades, manned towers or building hacks: the worker's
// sidecar (c9-host.ts) does, 4 times a second here and twice a second on a guest (forwarded by the host).
const C9R = (0, c9_ts_1.c9Rules)(data);
const T_NODE = C9R.nodeType ? cd.typeIds.indexOf(C9R.nodeType) : -1, T_BUNKER = C9R.bunkerType ? cd.typeIds.indexOf(C9R.bunkerType) : -1;
const GARRISON_KEY = "KeyI", GARRISON_KEY_LABEL = "I";
let c9 = null, c9At = 0;
const c9Stats = { nodeTagText: "", sides: 0, garrisonSent: 0, garrisonRefusedLocal: 0, nodeTags: 0, bunkerTags: 0, garrisonTags: 0, captureNotes: 0, lastPlan: "",
    upgradesBought: 0, exportsSent: 0, domeTags: 0, domeDots: 0, driverTags: 0, disabledTags: 0, mannedTags: 0, manSent: 0, leaveSent: 0, towerEye: false, prompt: "", hackStarted: 0, hackDisabled: 0,
    escortMarks: 0, escortTags: 0, groundFromSide: 0, lowFromSide: 0, gasPerS: 0, noGasHud: false, noGasTop: false,
    deployArmed: 0, deploySent: 0, deployRefusedLocal: 0, recallSent: 0, rapidSent: 0, modeSent: 0, zonesDrawn: 0, dropTags: 0, recallTags: 0, stored: 0, arrived: 0, recalled: 0 };
const RECALL_KEY = "KeyC", RECALL_KEY_LABEL = "C";
let c9ResHtml = "", c9LowSeen = 0, c9LowAt = 0;
let c9DomeSoundAt = 0;
/** Garrisoned own unit id -> point index (from the sidecar). */
let c9Garrisoned = new Map();
function c9OnSide(m, now) {
    const old = c9Garrisoned, prevSide = c9;
    c9 = m;
    c9At = now;
    c9Stats.sides++;
    c9Garrisoned = new Map(m.garrison.flatMap((g) => g.ids.map((id) => [id, g.point])));
    // GARRISON (event 110 stays on the host): the change is heard and said here
    const ins = [...c9Garrisoned.keys()].filter((id) => !old.has(id)), outs = [...old.keys()].filter((id) => !c9Garrisoned.has(id) && renderedById.has(id));
    if (c9Stats.sides > 1 && ins.length) {
        const p = c9Garrisoned.get(ins[0]);
        notify(`GARRISONED · ${ptStatics[p]?.name ?? "point"} · +${Math.round(C9R.garrisonArmour * 100)}% armour, no attack orders`, "good");
        const e = renderedById.get(ins[0]);
        snd.cue("cargo-in", e ? [e.x, e.y, e.z] : null);
    }
    if (c9Stats.sides > 1 && outs.length) {
        notify("GARRISON RELEASED · the squad takes orders again", "info");
        const e = renderedById.get(outs[0]);
        snd.cue("cargo-out", e ? [e.x, e.y, e.z] : null);
    }
    c9ReserveDiff(prevSide, m);
    c9HackDiff(prevSide, m);
    c10OnSide(prevSide, m);
    // C8 gaps through the sidecar: attack-ground spots this page did not order (a squadmate's, after a rejoin) get their
    // marker; the own aircraft's low-flight toggle follows the sim's flag (after a local toggle has had a second to land)
    for (const [id, x, z] of m.ground)
        if (!groundTargets.has(id)) {
            groundTargets.set(id, { x, z });
            c9Stats.groundFromSide++;
        }
    if (lowToggles !== c9LowSeen) {
        c9LowSeen = lowToggles;
        c9LowAt = now;
    }
    const veh = me && me.state !== sim_ts_1.P_FOOT ? me.entity : 0; // seated: the entity is the vehicle
    if (veh && cd.tAir[renderedById.get(veh)?.type ?? 0] && now - c9LowAt > 1000) {
        const low = m.low.includes(veh);
        if (low !== wantLow) {
            wantLow = low;
            c9Stats.lowFromSide++;
        }
        lowVeh = veh;
    }
}
/** The standing control node of point p held by `owner` (a rendered entity of the owner's team inside the ring). */
function c9NodeAt(p, owner) {
    if (T_NODE < 0 || owner < 0 || owner === 0)
        return null;
    const s = ptStatics[p];
    if (!s)
        return null;
    for (const e of rendered)
        if (e.type === T_NODE && e.team === owner && Math.hypot(e.x - s.x, e.z - s.z) <= s.ring + 2) {
            c9Stats.captureNotes++;
            return e;
        }
    return null;
}
/** Own points with standing bunkers: slots and squads garrisoned there. */
function c9BunkerPoints() {
    const out = new Map();
    if (T_BUNKER < 0)
        return out;
    for (const e of rendered) {
        if (e.type !== T_BUNKER || e.team !== 0)
            continue;
        const p = (0, c4_ts_1.pointAt)(ptStatics, e.x, e.z);
        if (p < 0)
            continue;
        const o = out.get(p) ?? { x: ptStatics[p].x, z: ptStatics[p].z, slots: 0, used: (c9?.garrison ?? []).filter((g) => g.point === p).length, name: ptStatics[p].name };
        o.slots += C9R.slotsPerBunker;
        out.set(p, o);
    }
    return out;
}
function c9Garrisonable(t) { return !cd.tStructure[t] && !cd.tAir[t] && !cd.tPilot[t]; }
function c9Garrison(sx, sy) {
    const ids = selectedUnits(), g = groundAt(sx, sy);
    const sel = ids.map((id) => { const e = renderedById.get(id); return { id, x: e.x, z: e.z, ok: c9Garrisonable(e.type) }; });
    const plan = (0, c9_ts_1.garrisonPlan)(sel, c9Garrisoned, c9BunkerPoints(), g ? (0, c4_ts_1.pointAt)(ptStatics, g[0], g[2]) : -1, (x, z) => (0, c4_ts_1.pointAt)(ptStatics, x, z));
    c9Stats.lastPlan = plan.text;
    if (!plan.ok || !plan.units.length) {
        notify(plan.text, "warn");
        snd.ui("error");
        c9Stats.garrisonRefusedLocal++;
        return;
    }
    act({ kind: "garrison", point: plan.point, units: plan.units, on: plan.on }, plan.on ? "GARRISON" : "UNGARRISON");
    c9Stats.garrisonSent++;
    notify(plan.text, "info");
    snd.ui("confirm");
}
function c9OrderButtons(ids) {
    if (T_BUNKER < 0 || !ids.some((id) => { const e = renderedById.get(id); return !!e && c9Garrisonable(e.type); }))
        return "";
    const all = ids.length > 0 && ids.every((id) => c9Garrisoned.has(id));
    return `<button data-act="c9" data-k="garrison" data-b="0" data-i="0" title="a squad per bunker slot: +25% armour, stays in the point, no attack orders">${all ? "UNGARRISON" : "GARRISON"} · <b>${GARRISON_KEY_LABEL}</b></button>`;
}
function c9Click(k, b, i) {
    if (k === "gasFloor") {
        c11SetGasFloor(i);
        return;
    } // C11
    if (k === "garrison")
        c9Garrison(cssW / 2, cssH / 2);
    else if (k === "deploy") {
        const e = c9?.reserve?.entries[i];
        if (e) {
            armedCmd = { kind: "c9deploy", label: `DEPLOY ${typeName[e.type].toUpperCase()} · click a spot inside a call-in zone`, data: i };
            c9Stats.deployArmed++;
            snd.ui("click");
        }
    }
    else if (k === "rapid") {
        act({ kind: "rapid", point: b }, "RAPID REINFORCE");
        c9Stats.rapidSent++;
        notify(`RAPID REINFORCE · ${ptStatics[b]?.name ?? "point"} · the reserve drops in ${c9?.reserve?.rules.rapidS.toFixed(0) ?? 2} s`, "info");
        snd.ui("confirm");
    }
    else if (k === "upgrade")
        c9BuyUpgrade(b, i, false);
    else if (k === "export")
        c9Export(b, i);
    else if (k === "resMode") {
        act({ kind: "reserveMode", building: b, on: i === 1 }, "RESERVE MODE");
        c9Stats.modeSent++;
        notify(i === 1 ? `${typeName[ent(b)?.type ?? 0]} · finished units go into the reserve` : `${typeName[ent(b)?.type ?? 0]} · finished units go to the field (the reserve when it is full)`, "info");
        snd.ui("click");
    }
}
/** Tags: control node state, bunker garrison count, garrisoned units (command view). */
function c9Tags(_now) {
    const near = (x, z) => mode === "cmd" || Math.hypot(x - eye[0], z - eye[2]) < 260;
    const pv = latestPoints();
    const bp = c9BunkerPoints();
    for (const e of rendered) {
        if (e.type === T_NODE && near(e.x, e.z)) {
            const p = (0, c4_ts_1.pointAt)(ptStatics, e.x, e.z), lvl = p >= 0 ? pv?.points[p]?.fortification ?? 0 : 0, nd = c9?.nodes.find((n) => n.id === e.id);
            // the snapshot's hull is a fraction; the node's shield and armour come from the sidecar (its data shield is 0)
            const html = (0, c9_ts_1.nodeTag)(e.hp * cd.tHp[e.type], cd.tHp[e.type], nd?.shield ?? 0, nd ? nd.armoured : lvl >= C9R.armouredFrom, e.team === 0);
            if (tag(e.x, e.y + 15, e.z, html, `prodtag node${e.team === 0 ? "" : " en"}`)) {
                c9Stats.nodeTags++;
                c9Stats.nodeTagText = html;
            }
        }
        else if (e.type === T_BUNKER && near(e.x, e.z)) {
            const p = (0, c4_ts_1.pointAt)(ptStatics, e.x, e.z), b = bp.get(p);
            if (tag(e.x, e.y + 6, e.z, (0, c9_ts_1.bunkerTag)(b?.used ?? 0, b?.slots ?? 0, e.team === 0), "prodtag"))
                c9Stats.bunkerTags++;
        }
    }
    c9ReserveTags();
    c9BuildingTags();
    c9EscortTags();
    if (mode === "cmd")
        for (const id of c9Garrisoned.keys()) {
            const e = renderedById.get(id);
            if (e && tag(e.x, e.cy - 2, e.z, "GARRISONED", "hold"))
                c9Stats.garrisonTags++;
        }
}
// ---- C9 item 2: the reserve
/** The team's call-in zones now (supplied own points, own Field Depots; without points the own Core). */
function c9Zones() {
    const pv = latestPoints();
    const pts = ptStatics.map((s) => ({ x: s.x, z: s.z, name: s.name, owned: pv?.points[s.index]?.owner === 0, supplied: !!pv?.points[s.index]?.supplied }));
    const own = (t) => rendered.filter((e) => e.type === t && e.team === 0).map((e) => ({ x: e.x, z: e.z }));
    return (0, c9_ts_1.callInZones)(pts, T_DEPOT >= 0 ? own(T_DEPOT) : [], own(T_CORE), c9?.reserve?.rules.zone ?? C9R.zone);
}
function c9Deploy(k, sx, sy) {
    const r = c9?.reserve, e = r?.entries[k], g = groundAt(sx, sy);
    if (!r || !e) {
        notify("DEPLOY · that reserve unit is gone", "warn");
        snd.ui("error");
        return;
    }
    if (!g) {
        notify("DEPLOY · put the cursor on the ground", "warn");
        snd.ui("error");
        return;
    }
    const z = (0, c9_ts_1.zoneAt)(c9Zones(), g[0], g[2]);
    if (!z) {
        notify(`DEPLOY REFUSED · ${(0, c6_ts_1.reasonText)("notInCallInZone")}`, "warn");
        snd.ui("error");
        c9Stats.deployRefusedLocal++;
        return;
    }
    act({ kind: "reserveDeploy", k, x: g[0], z: g[2] }, "DEPLOY");
    c9Stats.deploySent++;
    notify(`DEPLOY · ${typeName[e.type]} arrives in ${(z === 2 ? r.rules.depotDropS : r.rules.dropS).toFixed(0)} s${z === 2 ? " (Field Depot)" : ""}`, "info");
    snd.ui("confirm");
}
function c9Recall() {
    const ids = selectedUnits().filter((id) => { const e = renderedById.get(id); return !!e && !cd.tStructure[e.type] && !cd.tPilot[e.type]; });
    if (!c9?.reserve) {
        notify("RECALL · no reserve in this battle", "warn");
        snd.ui("error");
        return;
    }
    if (!ids.length) {
        notify("RECALL · select the units to send back to the reserve", "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "recall", units: ids }, "RECALL");
    c9Stats.recallSent++;
    notify(`RECALL · back to the reserve in ${c9.reserve.rules.recallS.toFixed(0)} s if they stay in a supplied point's call-in zone`, "info");
    snd.ui("confirm");
}
function c9ReservePanel() {
    const el = $("resPanel");
    let h = "";
    const r = c9?.reserve;
    if (started && mode === "cmd" && r) {
        const pv = latestPoints();
        const attacked = ptStatics.filter((s) => pv?.points[s.index]?.owner === 0 && pv.points[s.index].underAttack).map((s) => ({ index: s.index, name: s.name }));
        h = (0, c9_ts_1.reservePanelHtml)(r, (t) => typeName[t], dt, attacked, armedCmd?.kind === "c9deploy" ? armedCmd.data ?? -1 : -1);
    }
    if (h !== c9ResHtml) {
        c9ResHtml = h;
        el.innerHTML = h;
        el.style.display = h ? "block" : "none";
    }
}
function c9CallRow(r) {
    if (r.id !== "vehicle-drop" || !c9?.reserve)
        return r;
    const ut = callRules?.calls[r.call]?.unitType ?? -1;
    return { ...r, status: `${r.status} · ${(0, c9_ts_1.vehicleDropNote)(c9.reserve, (t) => typeName[t], ut >= 0 ? { type: ut, ore: cd.tCostOre[ut], gas: cd.tCostGas[ut] } : null)}` };
}
/** Call-in zones (faint; bright while a deploy is armed) and the drops on their way (command view). */
function c9Overlay(g, now) {
    // Mass Driver pairs: a line between the own drivers on different points (the pods fly along it)
    const drv = rendered.filter((e) => e.type === T_DRIVER && e.team === 0);
    for (let i = 0; i < drv.length; i++)
        for (let j = i + 1; j < drv.length; j++) {
            if ((0, c4_ts_1.pointAt)(ptStatics, drv[i].x, drv[i].z) === (0, c4_ts_1.pointAt)(ptStatics, drv[j].x, drv[j].z))
                continue;
            g.globalAlpha = 0.8;
            g.lineWidth = 2;
            g.strokeStyle = "#e8c25a";
            g.setLineDash([4, 6]);
            strokePoly(g, [toScreen(drv[i].x, drv[i].y + 4, drv[i].z), toScreen(drv[j].x, drv[j].y + 4, drv[j].z)]);
            g.setLineDash([]);
        }
    // escort: the route still ahead of the escorted unit
    for (const es of c9?.escort ?? []) {
        const e = renderedById.get(es.target);
        let px = e?.x, pz = e?.z;
        for (let k = es.leg; k < es.route.length; k++) {
            const s = ptStatics[es.route[k]];
            if (!s)
                continue;
            if (px !== undefined && pz !== undefined) {
                g.globalAlpha = 0.85;
                g.lineWidth = 2;
                g.strokeStyle = "#7ddc8a";
                g.setLineDash([12, 6]);
                strokePoly(g, [toScreen(px, (0, terrain_gen_ts_1.sampleHeight)(hm, px, pz) + 1, pz), toScreen(s.x, (0, terrain_gen_ts_1.sampleHeight)(hm, s.x, s.z) + 1, s.z)]);
                g.setLineDash([]);
            }
            px = s.x;
            pz = s.z;
        }
        if (e) {
            g.globalAlpha = 0.95;
            g.lineWidth = 2.5;
            g.strokeStyle = "#7ddc8a";
            strokePoly(g, groundPoly(e.x, e.z, 14, 0, Math.PI * 2, 24));
            c9Stats.escortMarks++;
        }
        for (const id of es.convoy ?? []) {
            const h2 = renderedById.get(id);
            if (h2) {
                g.globalAlpha = 0.9;
                g.lineWidth = 1.5;
                g.strokeStyle = "#7ddc8a";
                g.setLineDash([4, 4]);
                strokePoly(g, groundPoly(h2.x, h2.z, 9, 0, Math.PI * 2, 20));
                g.setLineDash([]);
                c9Stats.escortMarks++;
            }
        } // C11: the convoy's Haulers
    }
    if (!c9?.reserve)
        return;
    const armed = armedCmd?.kind === "c9deploy";
    for (const z of c9Zones()) {
        g.globalAlpha = armed ? 0.9 : 0.35;
        g.lineWidth = armed ? 2 : 1;
        g.strokeStyle = z.depot ? "#7ddc8a" : "#45e0ff";
        g.setLineDash([10, 8]);
        strokePoly(g, groundPoly(z.x, z.z, z.r, 0, Math.PI * 2, 48));
        g.setLineDash([]);
        c9Stats.zonesDrawn++;
    }
    for (const d of c9.reserve.drops) {
        g.globalAlpha = 0.6 + 0.4 * Math.sin(now / 150);
        g.lineWidth = 2.5;
        g.strokeStyle = "#ffd27a";
        strokePoly(g, groundPoly(d.x, d.z, 8, 0, Math.PI * 2, 16));
    }
}
/** Tags: a drop's countdown at its spot, a recall's countdown over the unit, zone names while a deploy is armed. */
function c9ReserveTags() {
    const r = c9?.reserve;
    if (!r)
        return;
    const age = (performance.now() - c9At) / 1000;
    for (const d of r.drops)
        if (tag(d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + 4, d.z, `DROP · ${typeName[d.type]} · ${Math.max(0, Math.ceil(d.ticks * dt - age))} s`, "prodtag"))
            c9Stats.dropTags++;
    for (const c of r.recalls) {
        const e = renderedById.get(c.id);
        if (e && tag(e.x, e.cy + cd.tRadius[e.type] + 4, e.z, `RECALL · ${Math.max(0, Math.ceil(c.ticks * dt - age))} s`, "prodtag"))
            c9Stats.recallTags++;
    }
    if (mode === "cmd" && armedCmd?.kind === "c9deploy")
        for (const z of c9Zones())
            tag(z.x, (0, terrain_gen_ts_1.sampleHeight)(hm, z.x, z.z) + 10, z.z, `CALL-IN ZONE · ${z.depot ? `${r.rules.depotDropS.toFixed(0)} s` : `${r.rules.dropS.toFixed(0)} s`}`, "zone");
}
/** RESERVE (event 111) stays on the host: stored / dropping / arrived / recalled are said and heard from the sidecar's change. */
function c9ReserveDiff(a, b) {
    const ra = a?.reserve, rb = b.reserve;
    if (!ra || !rb)
        return;
    if (rb.entries.length > ra.entries.length && rb.recalls.length >= ra.recalls.length) {
        const t = rb.entries[rb.entries.length - 1].type;
        notify(`RESERVE · ${typeName[t]} stored (${rb.entries.length}/${rb.cap})`, "info");
        snd.cue("queued");
        c9Stats.stored++;
    }
    for (const d of rb.drops)
        if (!ra.drops.some((x) => x.x === d.x && x.z === d.z && x.type === d.type))
            snd.cue("pod-whistle", [d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z) + 30, d.z]);
    for (const d of ra.drops)
        if (!rb.drops.some((x) => x.x === d.x && x.z === d.z && x.type === d.type) && d.ticks <= 10) {
            notify(`RESERVE · ${typeName[d.type]} arrived`, "good");
            snd.cue("pod-land", [d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z), d.z]);
            c9Stats.arrived++;
        }
    for (const c of ra.recalls)
        if (!rb.recalls.some((x) => x.id === c.id) && c.ticks <= 10) {
            notify(`RESERVE · unit recalled (${rb.entries.length}/${rb.cap})`, "good");
            snd.cue("deploy");
            c9Stats.recalled++;
        }
}
// ---- C9 item 3: Shield Projector, Tech Lab, Mass Driver, manned towers, building hacks
const BLD = (0, c9_ts_1.bldRules)(data);
const PLANET_GRAVITY = (data.planets.find((p) => p.id === PLANET)?.gravity) ?? 1;
const T_LAB = cd.typeIds.indexOf("tech-lab"), T_UPLINK = cd.typeIds.indexOf("launch-pad-uplink"), T_DRIVER = cd.typeIds.indexOf("mass-driver");
const DOME_T = new Map([...BLD.domes].map(([id, d]) => [cd.typeIds.indexOf(id), d]));
const MANNED_T = new Map([...BLD.manned].map(([id, m]) => [cd.typeIds.indexOf(id), m]));
/** Building types a pilot can hack (points.ts: not a supply source, not a point structure). */
const HACKABLE = new Set(cd.typeIds.map((_, t) => t).filter((t) => { if (!cd.tStructure[t] || t === T_CORE || BLD.disableS <= 0)
    return false; const b = data.buildings.find((x) => x.id === cd.typeIds[t]); return !!b && b.effects?.supplySource !== true && b.effects?.pointStructure !== true; }));
const c9IsLab = (id) => { const e = renderedById.get(id); return !!e && e.type === T_LAB; };
function c9BuyUpgrade(lab, i, byDigit) {
    const list = BLD.upgrades.filter((u) => u.gas >= 0), u = byDigit ? list[i] : BLD.upgrades[i];
    if (!u)
        return;
    if (c9?.upgrades.includes(u.name)) {
        notify(`${u.label.toUpperCase()} · already owned`, "warn");
        snd.ui("error");
        return;
    }
    act({ kind: "upgrade", lab, u: c9_ts_1.UPGRADES.indexOf(u.name) }, `UPGRADE ${u.label.toUpperCase()}`);
    c9Stats.upgradesBought++;
    notify(`UPGRADE · ${u.label} for ${u.gas} gas · ${u.what}`, "info");
    snd.ui("confirm");
}
function c9Export(uplink, i) {
    const ore = i === 0 ? 500 : 0, gas = i === 1 ? 200 : 0;
    act({ kind: "exportCargo", uplink, ore, gas }, "SHIP CARGO");
    c9Stats.exportsSent++;
    notify(`SHIP CARGO · ${ore ? `${ore} ore` : `${gas} gas`} off-world from the stockpile`, "info");
    snd.ui("confirm");
}
/** The panel body of a building that produces nothing but has a fix-qa2 use (empty: none). */
function c9BuildingBody(b, id) {
    const tp = b.team === 0 ? (0, c6_ts_4.tierPanelHtml)(data, cd.typeIds[b.type], tierOfBuilding(b.type) > 0 ? tierReason(tierOfBuilding(b.type)) : null, underConstruction().has(id)) : ""; // U1: Armoury / Tech Lab say what they open
    return tp + c9BuildingUse(b, id);
}
/** The tier a tier-requirement building opens (0: none). */
function tierOfBuilding(t) { for (let k = 1; k <= 3; k++)
    if (PROD.tierRequires[k]?.includes(t))
        return k; return 0; }
function c9BuildingUse(b, id) {
    if (b.type === T_LAB)
        return (0, c9_ts_1.upgradesHtml)(BLD, c9?.upgrades ?? [], teamRes?.gas ?? 0, id, mode === "fp");
    if (b.type === T_UPLINK) {
        const ex = c9?.exported ?? [0, 0];
        return `<div class="ph2">SHIP CARGO OFF-WORLD · from the team stockpile (extraction quota)</div><div class="opt" data-act="c9" data-k="export" data-b="${id}" data-i="0"><span class="n">Ship 500 ore</span></div><div class="opt" data-act="c9" data-k="export" data-b="${id}" data-i="1"><span class="n">Ship 200 gas</span></div><div class="note">shipped ${Math.floor(ex[0])} ore · ${Math.floor(ex[1])} gas</div>`;
    }
    if (b.type === T_DRIVER)
        return `<div class="note">${(0, c9_ts_1.driverTag)(c9DriverPair(id))}</div>`;
    if (DOME_T.has(b.type) && b.team === 0)
        return c11GasFloorHtml(); // C11 (ruling 86)
    return "";
}
/** The other end of a Mass Driver pair (an own Mass Driver at another point): its point name, or null. */
function c9DriverPair(id) {
    const e = renderedById.get(id);
    if (!e)
        return null;
    const p = (0, c4_ts_1.pointAt)(ptStatics, e.x, e.z);
    for (const o of rendered)
        if (o.type === T_DRIVER && o.team === e.team && o.id !== id) {
            const q = (0, c4_ts_1.pointAt)(ptStatics, o.x, o.z);
            if (q !== p)
                return ptStatics[q]?.name ?? "another point";
        }
    return null;
}
/** The own tower this page's pilot mans now (sidecar), or null. */
function c9MannedTower() {
    const m = c9?.manned.find(([, pl]) => pl === pilotId);
    return m ? renderedById.get(m[0]) ?? null : null;
}
const c9Manning = () => onFoot() && !!c9MannedTower();
function c9TowerEye() {
    const t = c9Manning() ? c9MannedTower() : null;
    c9Stats.towerEye = !!t;
    // designer playtest 16 Nov 14:55: the gunner sits INSIDE the turret head (y 8.3-10.3), just behind the mantlet, looking
    // out through a vision slit (the #towerSlit frame), not on its roof
    return t ? [t.x - Math.cos(camYaw) * 0.5, t.y + 9.5, t.z - Math.sin(camYaw) * 0.5] : null;
}
/** The own mannable tower in reach of the pilot (surface gap within crew.enterRangeMetres + a little), or null. */
function c9TowerInReach(px, pz) {
    let best = null, bd = Infinity;
    for (const e of rendered) {
        if (e.team !== 0 || !MANNED_T.has(e.type) || (0, c1_crew_ts_1.sentryAt)(zonesNow, e.x, e.z))
            continue;
        const d = Math.hypot(e.x - px, e.z - pz) - cd.tRadius[e.type] - PILOT_R;
        if (d <= BLD.reach && d < bd) {
            bd = d;
            best = e;
        }
    } // C1: a call-in sentry has its own gun seat
    return best;
}
/** F on foot: leave the manned tower, or man the one in reach. True when F was used. */
function c9TowerKey() {
    if (c9Manning()) {
        act({ kind: "leaveTower" }, "LEAVE TOWER");
        c9Stats.leaveSent++;
        notify("LEFT THE TOWER", "info");
        snd.ui("click");
        return true;
    }
    const b = bodyRender, t = b ? c9TowerInReach(b.x, b.z) : null;
    if (!t || nearVehicle())
        return false;
    act({ kind: "manTower", tower: t.id }, "MAN TOWER");
    c9Stats.manSent++;
    notify(`MANNING THE ${typeName[t.type].toUpperCase()} · F to leave`, "good");
    snd.cue("seat");
    return true;
}
/** The enemy hackable building whose wall is in reach (points.ts building hacks), or null. */
function c9HackTarget(px, pz) {
    let best = null, bd = Infinity;
    for (const e of rendered) {
        if (e.team === 0 || !HACKABLE.has(e.type))
            continue;
        const d = Math.hypot(e.x - px, e.z - pz) - cd.tRadius[e.type] - PILOT_R;
        if (d <= REACH_M && d < bd) {
            bd = d;
            best = e;
        }
    }
    return best;
}
/** First-person prompt when no point / Core hack prompt shows: hacking an enemy building, else manning an own tower. */
function c9FootPrompt(px, pz) {
    const h = c9HackTarget(px, pz);
    let out = null;
    if (h) {
        const rec = c9?.hacks.find((x) => x.id === h.id);
        if (rec && rec.until > 0)
            out = { text: `${typeName[h.type].toUpperCase()} DISABLED · ${c9Seconds(rec.until)} s`, progress: 0 };
        else
            out = { text: (0, c9_ts_1.buildingHackText)(typeName[h.type], BLD, rec?.progress ?? 0, keys.has("KeyE"), me?.energy ?? 0), progress: rec?.progress ?? 0 };
    }
    else {
        const t = c9Manning() ? c9MannedTower() : c9TowerInReach(px, pz);
        if (t)
            out = { text: (0, c9_ts_1.towerPrompt)(typeName[t.type], MANNED_T.get(t.type), c9Manning()), progress: 0 };
    }
    c9Stats.prompt = out?.text ?? "";
    return out;
}
/** Seconds left to sidecar tick `until` (the sidecar's age taken off). */
function c9Seconds(until) { return c9 ? Math.max(0, Math.ceil((until - c9.tick) * dt - (performance.now() - c9At) / 1000)) : 0; }
/** Domes: a lattice of dots over each projector's radius, bright while absorbing, faint without gas or when off. */
function c9Fx(now) {
    if (!c9)
        return;
    const d0 = fx.dots;
    for (const d of c9.domes) {
        const e = renderedById.get(d.id), def = e ? DOME_T.get(e.type) : undefined;
        if (!e || !def)
            continue;
        const off = c9.hacks.some((h) => h.id === d.id && h.until > 0) || !!c11DomeOff(e.team), noGas = e.team === 0 && (teamRes?.gas ?? 0) < def.gas; // C11: flare, gas floor
        const a = off ? 0.05 : noGas ? 0.1 : d.absorbing ? 0.55 : 0.22 * Math.max(0.3, d.left / Math.max(1, d.max));
        const gy = (0, terrain_gen_ts_1.sampleHeight)(hm, e.x, e.z);
        for (let i = 0; i < 9; i++)
            for (let j = 0; j < 28; j++) {
                const el = (i / 9) * Math.PI / 2, az = (j / 28) * Math.PI * 2 + i * 0.11;
                fx.dot(e.x + Math.cos(az) * Math.cos(el) * def.r, gy + Math.sin(el) * def.r, e.z + Math.sin(az) * Math.cos(el) * def.r, 0.45, d.absorbing ? [0.7, 0.95, 1] : [0.4, 0.85, 1], a + 0.06 * Math.sin(now / 260 + i + j));
            }
    }
    c9Stats.domeDots = fx.dots - d0;
    c10Frame(now);
    c11Frame(now);
}
/** Tags: dome state, Mass Driver pair, DISABLED countdown, MANNED. */
function c9BuildingTags() {
    if (!c9)
        return;
    const near = (x, z) => mode === "cmd" || Math.hypot(x - eye[0], z - eye[2]) < 320;
    for (const d of c9.domes) {
        const e = renderedById.get(d.id), def = e ? DOME_T.get(e.type) : undefined;
        if (!e || !def || !near(e.x, e.z))
            continue;
        const off = c11DomeOff(e.team) || c9.hacks.some((h) => h.id === d.id && h.until > 0); // C11: flare / gas floor
        if (d.absorbing && performance.now() - c9DomeSoundAt > 1500 && Math.hypot(e.x - eye[0], e.z - eye[2]) < 250) {
            c9DomeSoundAt = performance.now();
            snd.cue("shield", [e.x, e.y + 8, e.z]);
        }
        if (tag(e.x, e.y + 11, e.z, (0, c9_ts_1.domeTag)(d.left, d.max, def.gas, d.absorbing, teamRes?.gas ?? 0, off, e.team === 0), "prodtag"))
            c9Stats.domeTags++;
    }
    for (const e of rendered)
        if (e.type === T_DRIVER && e.team === 0 && near(e.x, e.z) && tag(e.x, e.y + 6, e.z, (0, c9_ts_1.driverTag)(c9DriverPair(e.id)), "prodtag"))
            c9Stats.driverTags++;
    for (const h of c9.hacks) {
        const e = renderedById.get(h.id);
        if (!e || !near(e.x, e.z))
            continue;
        if (h.until > 0) {
            if (tag(e.x, e.y + 14, e.z, (0, c9_ts_1.disabledTag)(c9Seconds(h.until)), "coreoff"))
                c9Stats.disabledTags++;
        }
        else if (h.progress > 0)
            tag(e.x, e.y + 14, e.z, `HACK ${Math.round(h.progress * 100)}%`, "coreoff");
    }
    for (const [tw] of c9.manned) {
        const e = renderedById.get(tw);
        if (e && near(e.x, e.z) && tag(e.x, e.y + 13, e.z, "MANNED · range and accuracy up", "prodtag"))
            c9Stats.mannedTags++;
    }
}
/** BUILDING_HACK (event 112) stays on the host: started / disabled / back on, heard and said from the sidecar's change. */
function c9HackDiff(a, b) {
    if (!a)
        return;
    for (const h of b.hacks) {
        const o = a.hacks.find((x) => x.id === h.id), e = renderedById.get(h.id), pos = e ? [e.x, e.y, e.z] : null, nm = e ? typeName[e.type] : "building";
        if (h.progress > 0 && (!o || o.progress <= 0) && !(h.until > 0)) {
            snd.cue("hack-start", pos);
            c9Stats.hackStarted++;
            if (e && e.team === 0)
                notify(`${nm.toUpperCase()} · an enemy pilot is hacking it`, "bad");
        }
        if (h.until > 0 && !(o && o.until > 0)) {
            snd.cue("hack-done", pos);
            c9Stats.hackDisabled++;
            notify(e && e.team === 0 ? `${nm.toUpperCase()} DISABLED by a hack · ${BLD.disableS} s` : `${nm.toUpperCase()} DISABLED · ${BLD.disableS} s: production, turrets and dome off`, e && e.team === 0 ? "bad" : "good");
        }
    }
    for (const o of a.hacks)
        if (o.until > 0 && !b.hacks.some((h) => h.id === o.id && h.until > 0)) {
            const e = renderedById.get(o.id);
            snd.cue("core-restored", e ? [e.x, e.y, e.z] : null);
        }
}
// ---- C9 item 4: the fix-qa2 missions (extraction quota, escort, infiltration, holdout)
function c9EscortHull() {
    const es = c9?.escort[0], e = es ? renderedById.get(es.target) : undefined;
    return e ? (e.hp * cd.tHp[e.type] + e.shield * cd.tShield[e.type]) / Math.max(1, cd.tHp[e.type] + cd.tShield[e.type]) : null; // snapshot fractions
}
function c9ObjDetail(type, detail, index) {
    if (type !== "extractionQuota" && type !== "escort")
        return detail;
    return (0, c9_ts_1.objectiveExtra)(type, detail, objDefs()[index], data.constants, c9, c9EscortHull(), (p) => ptStatics[p]?.name ?? `point ${p}`);
}
function c9EscortTags() {
    for (const es of c9?.escort ?? []) {
        const e = renderedById.get(es.target);
        if (!e)
            continue;
        const next = es.leg < es.route.length ? ptStatics[es.route[es.leg]]?.name ?? null : null;
        if (tag(e.x, e.cy + cd.tRadius[e.type] + 5, e.z, (0, c9_ts_1.escortTag)(typeName[e.type], c9EscortHull() ?? 0, next), "prodtag"))
            c9Stats.escortTags++;
        for (const [i, id] of (es.convoy ?? []).entries()) {
            const h2 = renderedById.get(id);
            if (h2 && tag(h2.x, h2.cy + cd.tRadius[h2.type] + 4, h2.z, `CONVOY ${i + 1} · ${Math.round(h2.hp * 100)}%`, "prodtag"))
                c9Stats.escortTags++;
        } // C11
    }
}
// ---- C9 item 5: energy weapons spend gas
/** Per type: the smallest gasPerShot among its mounts' weapons (Infinity: no energy weapon). */
const ENERGY_MIN = cd.typeIds.map((_, t) => { let m = Infinity; for (let k = 0; k < data_ts_1.MAX_MOUNTS; k++) {
    const w = cd.tMounts[t * data_ts_1.MAX_MOUNTS + k];
    if (w >= 0 && cd.wGas[w] > 0)
        m = Math.min(m, cd.wGas[w]);
} return m; });
/** The top bar's NO GAS state (both views): own fielded units with energy weapons and too little team gas for a shot. */
function c9NoGasTop() {
    const gas = teamRes?.gas ?? 0;
    let n = 0;
    for (const e of rendered)
        if (e.team === 0 && ENERGY_MIN[e.type] < Infinity && gas + 1e-9 < ENERGY_MIN[e.type])
            n++;
    if (n > 0 && !c9Stats.noGasTop && started) {
        snd.cue("error");
        notify(`${c9_ts_1.NO_GAS_TEXT} · each energy weapon shot costs team gas`, "bad");
    }
    c9Stats.noGasTop = n > 0;
    return n ? `<span class="nogas">${c9_ts_1.NO_GAS_TEXT} (${n} unit${n > 1 ? "s" : ""})</span>` : "";
}
// ---- C10 item 3: effects and sounds for the C9 sidecar's changes and states (c10.ts names the effects; p2Fx runs them)
const c10Stats = {};
/** Last seen positions of units that may leave the field before the sidecar says so (recalls, garrisons). */
const c10Pos = new Map();
let c10DomeAt = 0, c10NoGasAt = 0;
function c10Run(kind, x, y, z, o = {}) {
    const g = (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
    for (const id of c10_ts_1.C10_FX[kind])
        fx_p2_ts_1.p2Fx.run(id, { x, y, z, ground: g, ...o });
    c10Stats[kind] = (c10Stats[kind] ?? 0) + 1;
    const s = c10_ts_1.C10_SOUND[kind], now = performance.now();
    if (s && (!s.every || now - (c10SndAt[kind] ?? -1e9) >= s.every) && Math.hypot(x - eye[0], z - eye[2]) < 160) {
        c10SndAt[kind] = now;
        snd.cue(s.cue, [x, y, z]);
        c10Stats.sounds = (c10Stats.sounds ?? 0) + 1;
    }
}
const c10SndAt = {};
function c10OnSide(a, b) {
    for (const ch of (0, c10_ts_1.sideChanges)(a, b)) {
        const e = ch.id ? renderedById.get(ch.id) : undefined, p = e ? [e.x, e.cy, e.z] : ch.id ? c10Pos.get(ch.id) : [ch.x, (0, terrain_gen_ts_1.sampleHeight)(hm, ch.x, ch.z), ch.z];
        if (!p)
            continue;
        const team = e?.team ?? 0;
        if (ch.kind === "manned" || ch.kind === "unmanned")
            c10Run(ch.kind, p[0], (e ? e.y : p[1]) + 10.6, p[2], { team });
        else if (ch.kind === "hacked" || ch.kind === "restored")
            c10Run(ch.kind, p[0], p[1], p[2], { team, r: Math.max(8, (e ? cd.tRadius[e.type] : 6) * 2.5) });
        else
            c10Run(ch.kind, p[0], p[1], p[2], { team });
    }
    c10Pos.clear();
    for (const id of [...b.garrison.flatMap((g) => g.ids), ...(b.reserve?.recalls.map((r) => r.id) ?? [])]) {
        const e = renderedById.get(id);
        if (e)
            c10Pos.set(id, [e.x, e.cy, e.z]);
    }
}
/** Per frame: reserve drop beams, hack sparks, disabled arcs, dome ripples while absorbing, no-gas arcs. */
function c10Frame(now) {
    if (!c9)
        return;
    const near = (x, z, m) => mode === "cmd" || Math.hypot(x - eye[0], z - eye[2]) < m;
    const rs = c9.reserve;
    if (rs)
        for (const d of rs.drops)
            c10Run("dropFalling", d.x, (0, terrain_gen_ts_1.sampleHeight)(hm, d.x, d.z), d.z, { f: (0, c10_ts_1.dropPhase)(d.ticks, rs.rules.dropS, dt), t: now / 1000 });
    for (const h of c9.hacks) {
        const e = renderedById.get(h.id);
        if (!e || !near(e.x, e.z, 400))
            continue;
        const r = cd.tRadius[e.type] || 4;
        if (h.until > 0)
            c10Run("disabled", e.x, e.y + r * 0.6, e.z, { k: r });
        else if (h.progress > 0)
            c10Run("hacking", e.x, e.y + 1.5, e.z);
    }
    if (now - c10DomeAt > 220) {
        c10DomeAt = now;
        for (const d of c9.domes) {
            const e = renderedById.get(d.id), def = e ? DOME_T.get(e.type) : undefined;
            if (!d.absorbing || !e || !def || !near(e.x, e.z, 600))
                continue;
            const q = (0, c10_ts_1.domePoint)(e.x, (0, terrain_gen_ts_1.sampleHeight)(hm, e.x, e.z), e.z, def.r, Math.random(), Math.random());
            c10Run("domeAbsorb", q.x, q.y, q.z, { dx: q.nx, dy: q.ny, dz: q.nz, k: 4 });
        }
    }
    if (c9Stats.noGasTop && now - c10NoGasAt > 2000) {
        c10NoGasAt = now;
        let n = 0;
        for (const e of rendered)
            if (n < 6 && e.team === 0 && ENERGY_MIN[e.type] < Infinity && near(e.x, e.z, 200)) {
                c10Run("noGas", e.x, e.cy, e.z, { k: cd.tRadius[e.type] || 2 });
                n++;
            }
    }
}
function c9State() {
    return { ...c9Stats, fx: { ...c10Stats }, side: c9 ? { ...c9, age: performance.now() - c9At } : null, resPanel: $("resPanel").textContent, objectives: objRows.map((o) => ({ name: o.name, type: o.type, detail: o.detail, status: o.status })), battleRow: $("battleRow").textContent, zones: c9Zones().length, prod: $("prod").style.display !== "none" ? $("prod").textContent : null, callBar: $("callBar").textContent, garrisoned: Object.fromEntries(c9Garrisoned), bunkers: Object.fromEntries(c9BunkerPoints()), orderBar: $("orderBar").textContent };
}
// ------------------------------------------------------------------ C6 test state
/** C7b state for the tests. */
function c7bState() {
    return {
        predict: { on: predictOn, drawn: predDrawn, gap: predGap, seq: predictor?.seq ?? 0, state: predictor?.state ? { ...predictor.state } : null, ...(predictor?.stats ?? {}) },
        ride: ridePred ? { type: cd.typeIds[ridePred.type], seq: ridePred.seq, state: ridePred.state ? { ...ridePred.state } : null, ...ridePred.stats } : null, // ruling 112
        thermal: { ...thermalStats }, // ruling 112
        walker: { ...walkerStats }, // W1
        tilt: { drawn: tiltStats.drawn, own: ownTilt ? { pitch: ownTilt.pitch, roll: ownTilt.roll, lift: ownTilt.lift } : null, camRoll: camRollNow }, // ruling 112
        shots: { pilot: lastPilotShots, kicks: pilotShotKicks }, coreSource, aims: aim.size, turretCues: { spots: turretCues.spots, locks: turretCues.locks, lasers: turretLasersDrawn }, deaths: deathsSeen,
        coop: { ...coopStats, pods: pods.map((p) => ({ ...p })), roster: $("mpRoster").innerHTML },
        stealth: { ...stlStats, jammers: Object.fromEntries([...stl.jammers].map(([k, j]) => [k, { ...j }])), decoyUsed: stl.decoyUsed, ownDecoys: stl.decoys.size, jammedSpots: stl.jammedSpots.length, pulseLeft: stl.pulseLeft(performance.now(), PULSE_CD), blipIds: [...radarBlips] },
        loadout: { ...loStats, now: loadoutNow(), draft: loDraft, podPick, podChoices: podChoices().map(wName), panel: { open: loOpen, shown: $("loadoutPanel").style.display === "block", pending: loPending, model: lastLoModel, ...loStatsU1, text: $("loadoutPanel").textContent ?? "" } }, // U1
        groups: { ...bgStats, autoDefendOn, armed: armedCmd?.kind ?? null, list: latestGroups().map((g) => ({ ...g })), panel: $("bgPanel").textContent },
        transport: { ...tpStats, armed: armedCmd?.kind ?? null, aboard: Object.fromEntries([...cargo.soldiers].map(([k, v]) => [k, v.size])), slung: Object.fromEntries([...cargo.slung].map(([k, v]) => [k, [...v]])), orderBar: $("orderBar").textContent },
    };
}
function c6State() {
    return {
        battle: config.battle, chosen: chosenBattle, geo: GEO, planet: PLANET, pageKey: PAGE_KEY, mapSize: MAP_SIZE, reloads: battleReloads, search: location.search,
        battleRow: $("battleRow").textContent, battleSub: $("battleSub").textContent, points: ptStatics.length,
        routes: { ...routeStats, routes: routesNow.map((r) => ({ id: r.id, group: r.group, n: r.path ? r.path.length : 0 })) },
        vision: { ...visionStats, ghosts: unitMem.ghosts(performance.now(), recentDeaths).map((g) => ({ ...g, typeId: cd.typeIds[g.type] })), firing: [...firingAt.keys()] },
        units: { ...unitStats, gunZoom, fov: fovDeg, role: seatRoleNow(), kinds: Object.fromEntries(cd.typeIds.map((id, t) => [id, kindOfType[t]])), icons: Object.fromEntries(cd.typeIds.map((id, t) => [id, familyOfType[t]])) },
        econ: { ...econStats, power: powerNow.map((p) => ({ ...p })), fortJobs: [...fortJobs.keys()], fort: { ...fortStats, views: fortStats.views.map((v) => ({ ...v })) }, baseJobs: [...baseJobs.keys()], hulks: hulks.map((h) => ({ ...h, age: (performance.now() - h.t0) / 1000 })), hulksDrawn: wrecksDrawn, panel: $("c6Panel").style.display !== "none" ? $("c6Panel").textContent : null },
        weather: { ...wxNow, fog: { ...wxFog }, tag: $("wxTag").style.display !== "none" ? $("wxTag").textContent : null, horizon: [...render_ts_1.HALCYON.horizon], forestProps, liquidDots, layer: !!TLAYER, overlayOn: wxNow.overlay ? document.body.classList.contains(wxNow.overlay) : false },
        calls: { ...callFxStats, aimLines, zones: zonesNow.map((z) => ({ ...z, mines: z.mines.length })), passes: passes.length, sweeps: sweeps.length, emps: emps.length, heavy: views.length ? views[views.length - 1].calls?.heavyWeapon ?? -1 : -1, heavyStats, shelter: { ...shelterStats, inside: sheltered() }, slots: views.length ? views[views.length - 1].calls?.slots ?? null : null, loadoutSlots: loadoutSlots() },
        kit: { ...kitStats, own: me?.kit ? { ...me.kit } : null, state: me ? STATE_NAME[me.state] : null, downed: $("downed").style.display !== "none" ? $("downedText").textContent : null, kitLine: $("kitLine").textContent, cloakedBodies: [...cloakedBodies], cloakedDrawn, downedTags, chargeTags, charges: [...plantedCharges.values()].map((c) => ({ ...c })), chargeTarget: lastChargeTarget ? lastChargeTarget.id : 0, revive: lastRevive ? lastRevive.pilotId : 0, cloakFx: document.body.classList.contains("cloaked") },
        objectives: objRows.map((r) => ({ ...r })), objPanel: $("objPanel").style.display !== "none" ? $("objPanel").textContent : null, objFeed, stings: { ...snd.stingCounts },
    };
}
p1_sound_ts_1.p1Sound.install({ snd, cd, data, planet: PLANET, weaponClass, dt, height: (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), layerAt: (x, z) => (0, c6_ts_5.layerTypeAt)(TLAYER, x, z), pointPos: (i) => (ptStatics[i] ? [ptStatics[i].x, ptStatics[i].z] : null), ringR: RING_R, pilotId: () => pilotId, me: () => me, view: () => views[views.length - 1] ?? null, eye: () => eye, mode: () => mode, started: () => started, over: () => matchWatch.over, cinematic: () => !!cine, weather: () => wxNow.id, weatherK: () => wxTint, fuseS: () => (KIT ? KIT.fuseTicks * dt : 5) }); // P1 hook
fx_p2_ts_1.p2Fx.install({ fx: () => fx, R, cd, data, planet: PLANET, dt, height: (x, z) => (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), layerAt: (x, z) => (0, c6_ts_5.layerTypeAt)(TLAYER, x, z), view: () => views[views.length - 1] ?? null, rendered: () => rendered, me: () => me, pilotId: () => pilotId, eye: () => eye, viewM: () => view, mode: () => mode, wire: () => wire, started: () => started, scoped: () => scoped, weather: () => wxNow.id, weatherK: () => wxTint, hoverOf: (t) => (cd.tWalk[t] ? 0 : R.kindMesh(kindOfType[t])?.hover ?? 0) /* W1: a walker has no hover glow or dust */, shake: (k) => { shakeAmp = Math.max(shakeAmp, k); }, pointPos: (i) => (ptStatics[i] ? [ptStatics[i].x, ptStatics[i].z] : null), ringR: RING_R, sunDir: () => render_ts_1.HALCYON.sunDir, mapSize: MAP_SIZE, hulks: () => hulks.map((h) => ({ id: h.id, type: h.type, x: h.x, z: h.z, age: (performance.now() - h.t0) / 1000 / feedbackScale })), renderTick: () => renderTick(performance.now()) }); // P2 hook (ruling 130: the render tick for the falling pod)
// ------------------------------------------------------------------ debug hook (tests, tools)
/** Prop instances drawn this frame (rocks, bushes, tufts and pebbles: only those near the camera). */
const PROPS_INFO = () => Object.fromEntries([...PROP_KINDS].map((k) => [k, k === "tuft" ? tuftN : k === "pebble" ? pebbleN : nearBuf[k] ? nearBuf[k].n : props.big[k].length / render_ts_1.INST_FLOATS]));
const STATE_NAME = ["seated", "foot", "dead", "downed"];
G.__ironfall = {
    errors,
    webgl: glInfo,
    getState() {
        const b = bodyRender;
        const veh = seated() && me ? ent(me.entity) : undefined;
        return {
            ready, started, gotFirst, tick: lastTick, mode, transitioning: transT < 1, lastTransition, scenario: { ...config },
            camera: { eye: [...eye], target: [...target], yaw: camYaw, pitch: camPitch, fov: fovDeg, cmd: { ...cmd } },
            pad: { connected: pad.connected, active: pad.active, presses: pad.stats.presses, looks: padStats.looks, ignoredAxes: pad.stats.ignoredAxes, keys: [...keys].filter((k) => /^Key[WASD]$|Shift/.test(k)) },
            // the player's pilot from the snapshot (fractions converted to values) and the body it is (pilot entity or vehicle) as drawn
            player: me ? {
                pilotId, state: STATE_NAME[me.state], entity: me.entity, seat: me.seat, seatName: veh ? seatLabel(veh.type, me.seat) : null, vehicleType: veh ? cd.typeIds[veh.type] : null,
                hp: me.hp * PILOT_HP, shield: me.shield * PILOT_SH, energy: me.energy * CREW.energyMax, jet: me.jet * CREW.jetFreeBurnSeconds, respawnIn: me.respawnTicks * dt, airborne: me.airborne,
                controlled: host.controlled, shots: host.shots, kit, scoped,
                x: b?.x ?? 0, y: b?.simY ?? 0, z: b?.z ?? 0, alt: b?.alt ?? 0, team: b?.team ?? -1,
                vehicleHull: veh ? veh.hullFraction * cd.tHp[veh.type] : null, vehicleShield: veh ? veh.shield * cd.tShield[veh.type] : null, hullCritical: veh ? veh.hullCritical : false,
            } : null,
            team: teamRes ? { ...teamRes } : null,
            queues: views.length ? [...views[views.length - 1].queues.values()].map((q) => ({ ...q, items: q.items.map((t) => cd.typeIds[t]) })) : [],
            body: b ? { ...b } : null,
            entitiesRendered: rendered.length, friendlies: rendered.filter((e) => e.team === 0).length, enemies: rendered.filter((e) => e.team !== 0).length,
            projectilesRendered: projCount, projectilesSeen, playerShotsSeen, deathsSeen, fxLive: fx.count, tracersLive: tracers.length,
            selected: Array.from(selected), selBuilding, lastOrder: { ids: lastOrder.ids, order: lastOrder.order, reply: lastOrder.reply },
            fps, frameMs: frameGap, cpuMs, drawCalls: R.drawCalls, triangles: R.triangles, lod: { ...lodStats }, lines: R.lines, vertices: R.vertices, worker: { ...perf },
            // command view drawing style: wire 0 = shaded scene, 1 = tactical display (wireframe); iconMix = far-zoom icons
            view: { wire, iconMix, renderMode: wire >= 1 ? "wire" : wire <= 0 ? "shaded" : "blend", icons: iconCount, iconSegments: iconSegs, outlineMax, transT },
            viewport: { cssW, cssH, dpr, canvasW: canvas.width, canvasH: canvas.height },
            hud: {
                dead: $("dead").style.display !== "none", deadText: $("deadText").textContent, hullCritical, ejectedShown: $("ejected").style.display !== "none", ejectedNotices, reticle: reticleState, reticleToggles, reloadTag: $("reloadTag").classList.contains("on"), ownFlashToggles, ownFlashOn, hitMarkStreamFrames, critShown: $("crit").style.display !== "none", critText: $("crit").style.display !== "none" ? critText : null,
                ejectHeld, orderMsg: $("orderMsg").style.display !== "none" ? $("orderMsg").textContent : null, legend: $("legend").classList.contains("on"), prompt: $("prompt").style.display !== "none" ? $("prompt").textContent : null,
                refill: $("refill").style.display !== "none" ? $("refill").textContent : null, prod: $("prod").style.display !== "none" ? $("prod").textContent : null, prodHeld, prodRefusal: prodRefusal && performance.now() < prodRefusal.until ? { ...prodRefusal } : null, rideMenu: $("rideMenu").style.display !== "none" ? $("rideMenu").textContent : null,
                rideStatus: $("rideStatus").style.display !== "none" ? $("rideStatus").textContent : null, topbar: $("topbar").textContent, feed: feedLog.slice(-12), lastFeed: lastFeedMsg, help: $("help").style.display !== "none",
                scope: $("scope").style.display !== "none", viewmodel: vmVisible, vm: { ...vmInfo }, zoneMark: zoneRingInfo.length ? zoneRingInfo.map((z) => z.label).join(" | ") : null, zoneRings: zoneRingInfo.map((z) => ({ ...z })),
                seatKill: lastSeatKill && performance.now() < lastSeatKill.until ? lastSeatKill.text : null, seatKills: seatKills.slice(-6), seen: { ...hudSeen }, tags: { ...tagStats },
                // slice 3b
                objective: $("objective").textContent, hijack: hijack ? { ...hijack, ring: $("hijackRing").style.display !== "none", text: $("hijackText").textContent } : null, hijackMax, hijackStarted, hijackInterrupted, lastHijackCause,
                gunnerMode, gunnerLive: station.gunnerLive, gunnerAvail: station.gunnerAvail, station: { ...station, weapon: station.weapon.map((w) => (w >= 0 ? cd.weaponIds[w] : null)) }, liveWeapon, weapons: $("wpnList").textContent, gunnerToggles,
                shield: { ...shieldHud, delayBar: $("shDelay").classList.contains("on") }, fall: { ...fallHud }, fallWarnings,
                pause: pauseOn, pauseShown: $("pause").style.display !== "none", pauseCount, pauseText: $("pause").textContent,
                dmgIndicator: dmgShown, damageTaken: damageTakenCount, riderHitsTaken, riderHitsDealt, riderTag: $("riderTag").style.display !== "none",
                debugOverlay, hint: $("hint").textContent, browserKeysBlocked,
            },
            // C6: what the sim gained in stages 2 / 3, on screen
            c6: c6State(),
            c7b: c7bState(),
            c8: c8State(), tips: [...tipStats.shown], // C10 item 5
            c11: c11State(),
            s2: { ...podStats }, // ruling 130: the drop pod sentry
            fb1: { ...fb1Stats, tracked: fbTr.size, points: ptStatics.map((p) => ({ name: p.name, x: p.x, z: p.z })) }, // ruling 132: forward base defences
            c1: { ...c1Stats, gunSeated: gunSeated(), dispatch: [...c1Dispatch.entries()].map(([p, q]) => ({ pilot: p, ...q })) },
            f2: { ...f2Stats, html: f2Html ? ($("laserRow").textContent ?? "") : "" },
            boost: { ...boostStats, html: boostHtml ? ($("boostRow").textContent ?? "") : "" },
            c9: c9State(),
            b1: { ...b1Stats },
            // C5: support calls on screen
            c5: {
                menu: { open: callMenu.open, steps: callMenu.code.steps.slice(), shown: $("calls").style.display !== "none", text: $("calls").style.display !== "none" ? $("calls").textContent : null },
                rows: currentCallRows(), armed: armedCall ? { ...armedCall } : null, armedText: $("callArmed").style.display !== "none" ? $("callArmed").textContent : null,
                beacons: currentBeacons().map((b) => ({ ...b, own: beaconCaller.get(b.id) === pilotId })), beaconsDrawn, beaconTags, danger: dangerShown, dangerAlarms, shake: shakeAmp, lastShake, impacts: impactsSeen.slice(), impactSounds: snd.callImpacts,
                aim: callAim ? { ...callAim } : null, vm: vmInfo.kind, aimDots,
                bar: $("callBar").style.display !== "none" ? $("callBar").textContent : null,
                stats: { ...callStats, lastAction: callStats.lastAction ? { ...callStats.lastAction } : null }, block: views.length ? views[views.length - 1].calls : null, key: c5_ts_1.CALL_KEY,
            },
            b2prod: { open: prodAny.open, pick: prodAny.pick, rallyMe: prodAny.rallyMe, queued: prodAny.queued, opened: prodAny.opened, lastAt: prodAny.lastAt, rows: lastProdRows.map((r) => ({ ...r })), rallyBuildings: [...rallyMe.keys()], text: prodAny.open ? $("prod").textContent : null },
            // C4: construction on screen
            c4: {
                panel: buildPanel ? { ...buildPanel } : null, shown: $("build").style.display !== "none", text: $("build").style.display !== "none" ? $("build").textContent : null,
                menu: lastBuildMenu ? { ...lastBuildMenu, items: lastBuildMenu.items.map((it) => ({ ...it })) } : null,
                // C6 item 8: the sites the page shows (own, and enemy ones whose structure is on the wire)
                sites: visibleSites(views.length ? views[views.length - 1].construction : null), allSites: (0, c4_ts_1.siteModels)(views.length ? views[views.length - 1].construction : null, 0, typeName).length, slots: views.length ? views[views.length - 1].construction?.points ?? null : null,
                placed: buildPlaced, cancels: buildCancels, ctorQueued, lastOrder: lastBuildOrder ? { ...lastBuildOrder } : null,
                placing: placing ? { type: placing.type, src: placing.src, yaw: placing.yaw, placed: placing.placed, check: placing.check ? { ...placing.check } : null } : null, placeStats: { ...placeStats }, refusal: buildRefusal ? buildRefusal.text : null,
                sitesDrawn, risingDrawn, siteTags, dismissed: buildDismissed, toolUses: buildToolUses, toolText: lastToolText, ghostIcons, remembered: [...structMem.known.values()].map((k) => ({ id: k.id, typeId: cd.typeIds[k.type], team: k.team, x: k.x, z: k.z })), kit, kitName: KIT_NAMES[kit], vm: vmInfo.kind,
            },
            // C2: the strategic layer as drawn this frame
            c3: {
                diffButtons: Array.from(document.querySelectorAll("[data-diff].on")).map((b) => b.dataset.diff), restartSub: $("restartSub").textContent,
                match: views.length ? views[views.length - 1].match : null, enemyCore: enemyCore(), locked: matchLocked(), seed: simSeed, difficulty, runningDifficulty, matchesPlayed,
                stats: { ...c3Stats }, threats: threatLog.slice(), threatAlarms, enemyCoreMarks: { ...enemyCoreMarks }, farMarkers, ghostsDrawn, ghosts: structMem.ghosts(views.length ? views[views.length - 1].entities : new Map()).length, lastDmgSource, fogStart: c3_ts_1.FP_FOG_START, lastBox: { ...lastBox }, allHarvestCount, idleMarkers, orderBar: $("orderBar").textContent, summary: matchEnd?.summary ?? null, panel: $("matchOver").style.display !== "none" ? $("matchOver").textContent : null,
            },
            c2: {
                wheel: { ...wheel, shown: $("wheel").style.display !== "none", options: c2_ts_1.WHEEL.map((o) => o.label), last: lastWheel ? { ...lastWheel } : null, target: wheelTarget, cancels: wheelCancels, confirms: wheelConfirms, sectors: (lastWheelHtml.match(/class="sec/g) ?? []).length, lit: (lastWheelHtml.match(/class="sec sel"/g) ?? []).length, pointer: /class="ptr"/.test(lastWheelHtml), camYaw },
                formation, callouts: [...callouts].map(([id, c]) => ({ id, text: c.text })), ackCount, lastAck, blips: snd.blipCount, orderBar: $("orderBar").textContent, lastHarvest,
                groups: Object.fromEntries([...groups.groups].map(([g, m]) => [g, m.slice()])), lastGroupAction,
                points: ptModels.map((m) => ({ ...m })), deposits: depModels.map((d) => ({ ...d })), harvesters: hvModels.map((x) => ({ ...x })), links: ptLinks.map((l) => ({ ...l })), overlay: { ...stratInfo }, hack: hackUi ? { ...hackUi } : null, interact: lastInteract,
                stratBar: $("stratBar").style.display !== "none" ? $("stratBar").textContent : null, hackBar: $("hackBar").style.display !== "none" ? $("hackBar").textContent : null,
            },
            bob: { phase: bobT, amp: bobAmp, speed: bobSpeed, jumps: bobJumps }, renderClock: { tick: rtClock, resets: rtResets }, shortFlights, ownShots: Object.fromEntries(Object.entries(ownShotsW).map(([w, n]) => [cd.weaponIds[Number(w)], n])), ownTracers, ownTracerHits,
            stream: { acks: stream.acks, epochs: [...stream.epochs], nulls: stream.nulls, stale: decoder.stale, epochChanges: decoder.epochChanges, decoderEpoch: decoder.epoch, lastSeq: stream.lastSeq, dupEvents: stream.dupEvents, tracersFromSim, tracerHits, tracerMisses },
            ride: ride ? { ...ride } : null, walkers: [...walkers.keys()], rotors: { ...rotorStats, blurDraws: R.rotorDraws, states: [...rotorState.entries()].map(([id, r]) => ({ id, spin: +r.spin.toFixed(2) })) }, producedCount, refusedCount, underAttackCount,
            events: { ...evCount }, sounds: { steps: stepsHeard, jetFrames, torchFrames },
            props: PROPS_INFO(), propsDrawn,
        };
    },
    /** Recent events (kind, a, b, c, flags) as delivered by the snapshot stream. */
    eventLog() { return evLog.slice(); },
    /** Test aid: centre the command camera (x, z) at a distance. */
    focus(x, z, dist) { cmd.x = x; cmd.z = z; if (dist)
        cmd.dist = dist; },
    /** Aim without pointer lock (headless tests): camera yaw / pitch in radians. */
    setAim(yaw, pitch) { camYaw = yaw; camPitch = pitch; },
    /**
     * Test aid: point the reticle (the camera ray) through a world point, then turn it by the given offsets in degrees.
     * The chase camera depends on the aim, so this iterates a few times.
     */
    aimAtWorld(x, y, z, offYawDeg = 0, offPitchDeg = 0) {
        if (![x, y, z, offYawDeg, offPitchDeg].every(Number.isFinite))
            return null;
        for (let i = 0; i < 6; i++) {
            const p = fpPose(performance.now());
            const dx = x - p.eye[0], dy = y - p.eye[1], dz = z - p.eye[2];
            camYaw = Math.atan2(dz, dx);
            camPitch = Math.atan2(dy, Math.hypot(dx, dz));
        }
        camYaw += offYawDeg * Math.PI / 180;
        camPitch += offPitchDeg * Math.PI / 180;
        return { yaw: camYaw, pitch: camPitch };
    },
    aimInfo() { return { target: aimPick ? { ...aimPick } : null, yaw: playerAimYaw, point: [...aimPoint], floored: aimFloored, zone: zoneTarget ? { ...zoneTarget } : null }; },
    /** Cancels production item `index` at a building through the page's own path (the panel click). */
    cancelItem(building, index) { cancelItem(building, index); },
    /** Queues production option i of a building through the page's own path (the panel click / number key). */
    queueOption(building, i) { queueOption(building, i); },
    /** Seat zones of an entity as the page computes them (sim coordinates, exposure seen from the camera). */
    seatZones(id) { const e = renderedById.get(id); return e ? seatZonesOf(e, eye) : null; },
    /** Impact effects drawn (the last 200): position and the shooter of the round. */
    impacts() { return impactLog.map((x) => ({ ...x })); },
    /** Shots of a shooter per weapon id: in the snapshots (fired) and drawn by the page (muzzle flash / sound / tracer). */
    shotsBy(id) { return { fired: { ...(firedBy.get(id) ?? {}) }, drawn: { ...(drawnBy.get(id) ?? {}) } }; },
    /** The driver hit zone of an entity as the page computes it (sim coordinates), or null. */
    zoneOf(id) { const e = renderedById.get(id); return e ? zoneOf(e) : null; },
    toScreen(x, y, z) { return toScreen(x, y, z); },
    /** Entities as rendered: id, type id, team, position, centre height, crew mask, flags and screen position. */
    entities() { return rendered.map((e) => ({ id: e.id, typeId: cd.typeIds[e.type], team: e.team, x: e.x, y: e.y, z: e.z, cy: e.cy, simY: e.simY, alt: e.alt, yaw: e.yaw, turret: e.turret, crew: e.crew, driverless: e.driverless, critical: e.critical, hp: e.hp, shield: e.shield, crouched: !!ent(e.id)?.crouched, screen: toScreen(e.x, e.cy, e.z) })); },
    query(ids) { return request({ t: "query", reqId: reqSeq++, ids }); },
    workerStats(reset = false) { return request({ t: "stats", reqId: reqSeq++, reset }); },
    /** Worker test aids: spawn, info, pilot, setHull, setResources, destroy, hold. */
    debug(op) { return request({ t: "debug", reqId: reqSeq++, ...op }).then((r) => r.result); },
    /** An order through the page's own path (refusal messages included), as if right-clicked at (sx, sy). */
    sendOrder(ids, order, sx = cssW / 2, sy = cssH / 2) { return issueOrder(ids, order, sx, sy); },
    combat() { return { ...combat, lastHits: combat.lastHits.slice(-10), shieldsDrawn: shieldCount, bracket: $("bracket").style.display !== "none" ? (aimPick?.id ?? null) : null, hitMarkerOn: $("hitmark").classList.contains("on"), hitMarkerStream: $("hitmark").classList.contains("stream") }; },
    /** Shot-origin measurements per type (slice 2 item 3). */
    shotOrigins() { return originLog.slice(); },
    resetShotOrigins() { originLog = []; },
    p1: () => p1_sound_ts_1.p1Sound.state(), // P1 hook
    p2: () => fx_p2_ts_1.p2Fx.state(), // P2 hook
    audio() { return { lastFirePitch: snd.lastFirePitch, mgSample: !!snd.mgBuf, mgPlayed: snd.mgPlayed, cuts: snd.sampleCuts ?? 0, jetLayers: snd.jetLayers.slice(), available: snd.available, state: snd.state, created: snd.counters.created, dropped: snd.counters.dropped, stolen: snd.counters.stolen, critical: snd.counters.critical, droppedCritical: snd.counters.droppedCritical, droppedByKind: { ...snd.counters.droppedByKind }, active: snd.activeVoices, maxVoices: snd.maxVoices, byKind: { ...snd.counters.byKind }, cues: { ...snd.cueCounts }, volume: snd.volume, muted: snd.muted }; },
    /** Icon family per entity drawn as an icon this frame, and the shape table (segments only: no circles). */
    icons() { return { drawn: [...iconFamiliesDrawn.entries()].map(([id, f]) => ({ id, typeId: cd.typeIds[renderedById.get(id)?.type ?? 0], family: f })), shapes: icons_ts_1.ICON_SHAPES.map((s) => ({ family: s.family, segments: s.segs.length / 4, px: s.px })), familyOfType: Object.fromEntries(cd.typeIds.map((id, t) => [id, familyOfType[t]])), you: bodyId() }; },
    /** Test aid: a fixed camera (eye, target), or with `follow` an entity id, offsets from that entity; null releases it. */
    freeCam(e, t, follow = 0) { freeCam = e && t ? { eye: e, target: t, follow } : null; },
    flTestMinigun(on) { if (on) snd.minigunHold(424242, [0, 0, 0], true); return snd.miniHolds.size; },
    flMap() { return { ...flMapStats, downDrawn: flDownDrawn, downEnts: [...flDownedEnts], bots: flBotsNow, mode, dist: cmd.dist, tagN, wave: flWaveNow, pings: flSimPings, lanes: flLaneScreen.length, cls: document.body.className, orderBar: getComputedStyle($("orderBar")).display }; },
    flDropDbg() { const gt = cd.typeIds.indexOf("gunship"), out = [...flPodLand.entries()].map(([id, la]) => ({ id, drop: !!la.drop, S: la.S, landedAt: la.landedAt ? Math.round(performance.now() - la.landedAt) : null, x: Math.round(la.x), z: Math.round(la.z) })); const g = [...renderedById.values()].filter((e) => e.type === gt).map((e) => [Math.round(e.x), Math.round(e.y), Math.round(e.z)]); return { land: out, gunships: g, eye: eye.map(Math.round) }; },
    flTestArm(callId) { const ci = callRules ? callRules.ids.indexOf(callId) : -1; if (ci < 0) return false; armedCall = { call: ci, id: callId, name: callId, at: performance.now() }; return true; },
    flShots() { return { own: playerShotsSeen, armed: !!armedCall, vm: vmInfo.kind }; },
    flDropSlow(k) { flDropTimeK = k; return k; },
    /** Opening cinematic: state; seek to t (s, the music's clock: an offset added); clock speed; skip. */
    cine() { return { paused: !!cine?.paused, error: cineStats.error ?? null, on: !!cine, t: cine ? cine.lastT : -1, P: cine?.P ?? null, E: cine?.E ?? null, revealed: !!cine?.Ereal, started: cineStats.started, ended: cineStats.ended, skipped: cineStats.skipped, shots: [...cineStats.shots], pods: cineStats.pods, crates: cineStats.crates, music: cineStats.music, hud: getComputedStyle($("hud")).visibility }; },
    cineSeek(t) { if (cine && cine.lastT >= 0) cineOffset += t - cine.lastT; return t; },
    cineSpeed(k) { cineTimeK = k; return k; },
    cineSkip() { cineEnd(true); },
    cinePlay() { cineDone = false; if (!cine) cineStart(); },
    flTestCallAhead(call, k = 0.6) { const g = groundAt(cssW / 2, cssH * k); if (!g) return null; send({ t: "flTestCall", call, ax: g[0], az: g[2] }); return [Math.round(g[0]), Math.round(g[2])]; },
    flTestDown(name, near) { const g = near ? groundAt(cssW / 2, cssH * (near === 2 ? 0.74 : 0.62)) : null; send(g ? { t: "flTestDown", name, x: g[0], z: g[2] } : { t: "flTestDown", name }); return g ? [Math.round(g[0]), Math.round(g[2])] : true; },
    flTestBoom(k) { const a = snd.grenadeBooms ?? 0, b = snd.explSamples ?? 0; snd.explosion([eye[0] + 8, eye[1], eye[2]], k); return [(snd.grenadeBooms ?? 0) - a, (snd.explSamples ?? 0) - b]; },
    flTestWeapon(id) { const w = cd.weaponIds.indexOf(id), a = snd.weaponSamplesPlayed; return [JSON.stringify(WSAMPLE[w] ?? null), snd.weaponSample(WSAMPLE[w], [0, 0, 0], true), snd.weaponSamplesPlayed - a]; },
    flTestRocketCut() { snd.lastSample = null; snd.weaponSample("rocket", [0, 0, 0], true); const h = snd.lastSample; snd.cutSample(h); return [!!h, snd.sampleCuts]; },
    flTestSample(n) { return snd.weaponSample(n, [0, 0, 0], true); },
    flTestSound(cls) { snd.fire(cls, [0, 0, 0], true, false, 1, 0); return snd.lastFamily; },
    flCalls() { return { ...flCallStats, ...flBeamStats, beamHolds: snd.beamHolds ? snd.beamHolds.size : -1, boostOn: !!snd.boostSrc, explSamples: snd.explSamples ?? 0, sgPlayed: snd.shotgunPlayed, lzPlayed: snd.laserGunPlayed, mgHolds: snd.miniHolds ? snd.miniHolds.size : -1, mgStarts: snd.miniStarts ?? 0, beac: currentBeacons().map((b) => [b.callId, (0, c6_ts_6.callFxKind)(callRules, b.call), Math.round(b.seconds * 10) / 10]), explBuf: !!(snd.samples && snd.samples.get("explosion")), samples: snd.samples ? [...snd.samples.keys()].join(",") : "", stepsHeard, bs: snd.beamStats, ctxT: snd.ctx ? snd.ctx.currentTime : -1, ctxS: snd.ctx ? snd.ctx.state : 'none', lb: !!snd.lancerBuf, mgBuf: snd.mgBuf ? Math.round(snd.mgBuf.duration * 1000) : 0, mgPlayed: snd.mgPlayed, lastFamily: snd.lastFamily }; },
    /** G1 test aid: ground height (screenshots of terrain features). */
    groundY(x, z) { return (0, terrain_gen_ts_1.sampleHeight)(hm, x, z); },
    fields() { return { ...fieldStats }; },
    /** Test aid: stretch hit-marker and shield-flash durations by k (1 = normal) for headless screenshots. */
    slowFeedback(k) { feedbackScale = Math.max(1, k); },
    /** Walk-cycle state of an entity (infantry). */
    walk(id) { const t = tracks.get(id); return t ? { phase: t.walk, amp: t.walkAmp } : null; },
    /** W1: a walker's gait (feet in world space, on the ground or swinging; cycle phase, amplitude, steps taken). */
    walkerGait(id) { const g = gaits.get(id); return g ? { p: g.p, amp: g.amp, steps: g.steps, dy: g.dy, feet: g.feet.map((f) => ({ x: f.x, y: f.y, z: f.z, swing: f.swing, ground: (0, terrain_gen_ts_1.sampleHeight)(hm, f.x, f.z) })) } : null; },
    /** Screen position of a building (command-view clicks in tests). */
    buildingScreen(id) { const e = renderedById.get(id); return e ? toScreen(e.x, e.y + 3, e.z) : null; },
    frameStats(sinceMs = 0) {
        const gaps = [], cpu = [];
        let prev = -1;
        for (let i = 0; i < frameLog.length; i += 2) {
            if (frameLog[i] < sinceMs) {
                prev = frameLog[i];
                continue;
            }
            if (prev >= 0)
                gaps.push(frameLog[i] - prev);
            prev = frameLog[i];
            cpu.push(frameLog[i + 1]);
        }
        const pct = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : 0; };
        const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
        return { frames: gaps.length, fps: gaps.length ? 1000 / mean(gaps) : 0, frameMsMean: mean(gaps), frameMsP50: pct(gaps, 0.5), frameMsP95: pct(gaps, 0.95), frameMsMax: gaps.length ? Math.max(...gaps) : 0, cpuMsMean: mean(cpu), cpuMsP95: pct(cpu, 0.95) };
    },
    now() { return performance.now(); },
    /** Test aid: freeze the Tab transition at progress t (0..1; the blend is smoothstep(t)), or null to release. */
    holdTransition(t) { holdT = t === null ? null : (0, math_ts_1.clamp)(t, 0, 1); if (t === null && transT < 1)
        transStart = performance.now() - transT * TRANSITION_S * 1000; },
    /** RGB at CSS-pixel points of the next frame drawn. */
    samplePixels(points) { return new Promise((resolve) => { pixelReq = { points, resolve }; }); },
    /** Outline edge counts per mesh kind. */
    edgeCounts() { return Object.fromEntries(meshes_ts_1.KINDS.map((k) => [k, R.kindEdges(k)])); },
    /** The vehicle in reach of the pilot on foot (enter prompt), or null. */
    nearVehicle() { const v = nearVehicle(); return v ? { id: v.id, typeId: cd.typeIds[v.type], seat: chosenSeat(v) } : null; },
    /** Test aid: pause / resume the sim worker (the page keeps drawing). */
    pauseSim(on) { send({ t: "pause", on }); },
    /** Seat list of a vehicle as the page sees it. */
    seats(id) { const e = ent(id); return e ? seatsOf(e) : null; },
    /** Test aid: props and haze off (fast functional runs) or on (screenshots). */
    setLite(on) { LITE = on; },
    /** Test aid: no beforeunload confirmation (the harness closes pages). */
    noUnloadPrompt(on = true) { G.__noUnloadPrompt = on; },
    /** C2 test aid: set the command-view selection (as a box select would). */
    /** C2 test aid: the mouse moved by (dx, dy) while the wheel is open (pointer-lock movement). */
    wheelAim(dx, dy) { if (wheel.open)
        wheelMove(dx, dy); },
    select(ids) { selected.clear(); selBuilding = 0; for (const id of ids)
        selected.add(id); },
    /** Test aid (C6): an action through the page's own input path (as the page's keys and panels send it). */
    act(a, what = "TEST") { act(a, what); },
    /** Test aid (C7b): a host-side room message to the worker as the room code sends it (gjoin / gleave of a slot). */
    roomMsg(m) { send(m); },
    /** Test aid (C7b): rebuild the roster box now (the room code does it on every roster change). */
    showRoster(r) { if (r)
        roster = r; showRoster(); return $("mpRoster").innerHTML; },
    /** Test aid (C7b): own-pilot prediction on / off (a guest has it on; on a host the local stream is used the same way). */
    setPredict(on) { predictOn = on; predictor?.reset(); },
    /** Test aid (C6): select a building (as a click on it in the command view does). */
    selectBuilding(id) { selected.clear(); selBuilding = id; },
    /** Debug overlay (O) on / off (2: also the + projectileHitRadius sphere). */
    setOverlay(n, only = 0) { debugOverlay = n; overlayOnly = only; },
    /** Pilot zones vs drawn cockpits of every crewed vehicle drawn: 3D gap and the gap seen from straight ahead (m). Computed without the overlay. */
    zoneGaps() {
        const out = [];
        for (const e of rendered) {
            if (!crewable(e.type))
                continue;
            for (const z of zonesOf(e)) {
                if (!z.drawn) {
                    out.push({ id: e.id, typeId: cd.typeIds[e.type], seat: z.seat, gap: NaN, frontal: NaN, zone: z.c, drawn: null });
                    continue;
                }
                const fx2 = Math.cos(e.yaw), fz2 = Math.sin(e.yaw), dxw = z.drawn[0] - z.c[0], dzw = z.drawn[2] - z.c[2], along = dxw * fx2 + dzw * fz2;
                out.push({ id: e.id, typeId: cd.typeIds[e.type], seat: z.seat, gap: Math.hypot(dxw, z.drawn[1] - z.c[1], dzw), frontal: Math.hypot(z.drawn[1] - z.c[1], dxw - along * fx2, dzw - along * fz2), zone: z.c, drawn: z.drawn });
            }
        }
        return out;
    },
    /** The page's direct-damage directions (DAMAGE_TAKEN) currently drawn. */
    dmgDirs() { return dmgDirs.map((d) => ({ ...d })); },
    /** Pause menu (Esc) state, and a direct toggle for tests. */
    setPause(on) { setPause(on); },
    armour: ARMOUR,
    /** N1: the room (role, slot, roster, bytes per guest, checkpoint, handovers). */
    net() { return { ...mp.stats(), port: worker === null ? "" : worker.link !== undefined ? "remote" : "worker", renderDelay: RENDER_DELAY, pings: pings.length }; },
    /** m1: per-entity motion tracks on / off (A/B of the drawing) and their state. */
    motion(on) { if (on !== undefined)
        motionSmooth = on; return { on: motionSmooth, base: motion.base, tracked: motion.map.size }; },
    /** N1 test aid: send a ping to the squad. */
    netPing(x, z, kind) { mp.ping(x, z, kind); },
    /** N1 test aid: the decoded entities the page holds (id, type, team, x, z). */
    netEntities() { const v = views[views.length - 1]; return v ? [...v.entities.values()].map((e) => ({ id: e.id, typeId: cd.typeIds[e.type], team: e.team, x: e.x, z: e.z })) : []; },
    netPlayers() { const v = views[views.length - 1]; return v ? [...v.players.values()] : []; },
};
// ---- C11: the pilot reserve (S14) and the S15 rulings on screen (c11.ts helpers; cues in sound-table.ts, effects in fx-effects.ts)
function c11Cue(id, pos = null, every = 0) {
    const now = performance.now();
    if (every && now - (c11SndAt[id] ?? -1e9) < every)
        return;
    c11SndAt[id] = now;
    snd.cue(id, pos);
    c11Stats["snd:" + id] = (c11Stats["snd:" + id] ?? 0) + 1;
}
function c11Fx(id, x, y, z, o = {}) {
    fx_p2_ts_1.p2Fx.run(id, { x, y, z, ground: (0, terrain_gen_ts_1.sampleHeight)(hm, x, z), ...o });
    c11Stats["fx:" + id] = (c11Stats["fx:" + id] ?? 0) + 1;
}
function c11Reset() { c11PtMem.clear(); c11AshWarnUntil = 0; c11AshWarnAircraft = 0; for (const k of Object.keys(c11Stats))
    delete c11Stats[k]; }
function c11Event(e, v, now) {
    const at = (id) => renderedById.get(id);
    const nm = (id, t = -1) => { const x = v.entities.get(id); return x ? typeName[x.type] : t >= 0 ? typeName[t] : "vehicle"; };
    const pl = teamRes?.pilots;
    switch (e.kind) {
        case events_ts_1.EV.PILOT_LOST:
            notify(`PILOT LOST · ${e.v1} at base · ${e.d} lost this battle`, "bad");
            c11Cue("pilot-lost", null, 1500);
            break;
        case events_ts_1.EV.PILOT_AVAILABLE: {
            notify(`PILOT BACK · ${e.d} at base${e.c === 2 ? " (vehicle recalled)" : ""}`, "good");
            c11Cue("pilot-back", null, 1500);
            const b = at(e.b);
            if (b)
                c11Fx("respawn-glow", b.x, b.y, b.z, { team: 0 });
            break;
        }
        case events_ts_1.EV.CREWED: {
            if (e.flags & 1)
                break; // crewed at production: the roll-out is its own notice
            notify(`CREWED · the ${nm(e.a)} took ${e.b} pilot${e.b === 1 ? "" : "s"}${e.c ? ` · ${e.c} seat${e.c === 1 ? "" : "s"} still empty` : ""} · ${e.d} at base`, "good");
            const x = at(e.a);
            c11Cue("crewed", x ? [x.x, x.y, x.z] : null, 600);
            if (x)
                c11Fx("hatch-puff", x.x, x.cy, x.z);
            break;
        }
        case events_ts_1.EV.UNDERCREWED: {
            notify(`NO CREW · the ${nm(e.a, e.d)} rolled out ${e.c ? `with ${e.c} empty seat${e.c === 1 ? "" : "s"}` : "uncrewed"}: no pilots at base · select it at base and press ${C11_CREW_KEY} when pilots are back`, "warn");
            c11Cue("no-crew", null, 1200);
            break;
        }
        case events_ts_1.EV.SHELTER: { // ruling 121
            if (e.a !== pilotId)
                break;
            if (e.flags & 1) { // C1 ruling 125: the sentry's gun seat
                const n = (0, c1_crew_ts_1.gunSeatNotice)(e.c, SENTRY_NAME);
                if (n)
                    notify(n.text, n.kind);
                if (e.c === 1) {
                    c1Stats.entered++;
                    snd.ui("whoosh");
                    if (mode !== "fp")
                        setMode("fp");
                }
                else if (e.c === 2) {
                    c1Stats.left++;
                    snd.cue("seat");
                }
                else {
                    c1Stats.thrown++;
                    snd.ui("error");
                }
                break;
            }
            const v = ent(e.b), nm = v ? (0, f3_citadel_ts_1.seatName)(SEAT_KINDS[v.type], typeName[v.type]) : shelterName;
            if (v)
                shelterName = nm;
            const n = (0, f3_citadel_ts_1.shelterNotice)(e.c, nm);
            if (n)
                notify(n.text, n.kind);
            if (e.c === 1) {
                shelterStats.entered++;
                snd.ui("whoosh");
            }
            else if (e.c === 2) {
                shelterStats.left++;
                snd.cue("seat");
            }
            else {
                shelterStats.thrown++;
                snd.ui("error");
            }
            break;
        }
        case events_ts_1.EV.CREW_DISPATCH: { // C1 ruling 124
            const n = (0, c1_crew_ts_1.dispatchNotice)(e.c, nm(e.b), (e.flags & 1) !== 0, e.c === 3 ? (0, c6_ts_1.reasonText)(sim_ts_1.ORDER_REASONS[e.d - 1] ?? "") : "");
            if (e.c === 1) {
                c1Dispatch.set(e.a, { body: e.v1, vehicle: e.b });
                c1Stats.sent++;
            }
            else {
                c1Dispatch.delete(e.a);
                if (e.c === 2) {
                    c1Stats.boarded++;
                    const x = at(e.b);
                    if (x)
                        c11Fx("hatch-puff", x.x, x.cy, x.z);
                    c11Cue("crewed", x ? [x.x, x.y, x.z] : null, 600);
                }
                else
                    c1Stats.gaveUp++;
            }
            if (n)
                notify(n.text, n.kind);
            break;
        }
        case events_ts_1.EV.CITADEL_PILOTS: {
            notify(`CITADEL PILOTS · +${e.b} pilots from ${ptStatics[e.a]?.name ?? "the citadel"} · ${e.c} at base`, "good");
            c11Cue("citadel-pilots");
            const p = ptStatics[e.a];
            if (p)
                c11Fx("capture-flip", p.x, (0, terrain_gen_ts_1.sampleHeight)(hm, p.x, p.z), p.z, { team: 0, r: p.radius });
            break;
        }
        case events_ts_1.EV.AMMO: {
            const x = at(e.a);
            if (me && seated() && me.entity === e.a)
                break; // the own aircraft: the HUD's own transitions say it
            if (e.b === 1) {
                notify(`${nm(e.a).toUpperCase()} OUT OF AMMO · land at an Air Pad to rearm`, "warn");
                c11Cue("ammo-dry", null, 1000);
            }
            else if (e.b === 2) {
                notify(`${nm(e.a).toUpperCase()} REARMED`, "good");
                c11Cue("rearmed", x ? [x.x, x.y, x.z] : null);
                if (x)
                    c11Fx("respawn-glow", x.x, x.y, x.z, { team: 0 });
            }
            break;
        }
        case events_ts_1.EV.AIR_WARNING: {
            c11AshWarnUntil = now + e.c * dt * 1000;
            c11AshWarnAircraft = e.b;
            notify(`ASH FALL IN ${Math.ceil(e.c * dt)} s · ${e.b} aircraft in the air · LAND NOW or crash-land`, "bad");
            c11Cue("air-warning");
            break;
        }
        case events_ts_1.EV.WEATHER: { // C11 (ruling 68): a solar flare takes every shield down
            const w = WX_DEFS[e.a];
            if (w?.effects?.shieldsOffline && e.b === 1) {
                notify("SHIELDS OFFLINE · solar flare: vehicle shields, pilot shields, bubbles and domes are down", "bad");
                c11Cue("shield-break");
            }
            if (w?.effects?.shieldsOffline && e.b === 2)
                notify("SHIELDS BACK · recharging", "good");
            break;
        }
        case events_ts_1.EV.ASH_CRASH: {
            const x = at(e.a), mine = !!me && seated() && me.entity === e.a;
            if (e.b === 1) {
                notify(`${mine ? "ASH FALL · YOU ARE GOING DOWN" : `ASH FALL · the ${nm(e.a)} is forced down`}`, "bad");
                if (mine)
                    snd.alarm(now);
                if (x)
                    c11Fx("crash-trail", x.x, x.y, x.z);
            }
            else {
                notify(`CRASH LANDED · the ${nm(e.a)} lost ${e.c} hull · grounded until the ash ends`, "warn");
                c11Cue("ash-crash", x ? [x.x, x.y, x.z] : null);
                if (x)
                    c11Fx("landing-dust", x.x, x.y, x.z, { r: cd.tRadius[x.type] * 2 });
            }
            break;
        }
    }
    void pl;
}
function c11State() { return { stats: { ...c11Stats }, pilots: teamRes?.pilots ? { ...teamRes.pilots } : null, pilotHud: (0, c11_ts_1.pilotHud)(teamRes?.pilots).text, ashWarn: Math.max(0, c11AshWarnUntil - performance.now()) }; }
// C11 item 1: the crew order (S14 ACT 60) for selected own vehicles with empty operator seats
const C11_CREW_CODE = "KeyE", C11_CREW_KEY = "E";
const c11Homes = () => rendered.filter((b) => b.team === 0 && (b.type === T_CORE || b.type === T_BARRACKS || (T_DEPOT >= 0 && b.type === T_DEPOT)) && b.hp > 0);
function c11AtHome(e) { return c11Homes().some((b) => Math.hypot(b.x - e.x, b.z - e.z) <= c11_ts_1.CREW_RADIUS); }
function c11Uncrewed(ids) {
    const out = [];
    for (const id of ids) {
        const e = renderedById.get(id);
        if (e && e.team === 0 && crewable(e.type) && (0, c11_ts_1.emptyOperatorSeats)(cd, e.type, e.crew) > 0)
            out.push(e);
    }
    return out;
}
function c11CrewButton(ids) {
    const u = c11Uncrewed(ids);
    if (!u.length)
        return "";
    const home = u.filter(c11AtHome).length, av = teamRes?.pilots?.available ?? 0;
    const why = home && av > 0 ? `${av} pilot${av === 1 ? "" : "s"} at base: seated at once` : "the nearest free pilot (on foot, or from the reserve at a building) walks to it"; // C1 ruling 124
    const going = u.filter((e) => (0, c1_crew_ts_1.pilotEnRoute)(cd, e)).length;
    return `<button data-act="c11crew" data-b="0" data-i="0" title="${why}">CREW ${u.length} · <b>${C11_CREW_KEY}</b>${going ? ` <small>· ${going} pilot${going === 1 ? "" : "s"} en route</small>` : ""}</button>`;
}
function c11Crew() {
    const u = c11Uncrewed(selectedUnits());
    if (!u.length) {
        notify("CREW · select own vehicles with empty seats", "warn");
        snd.ui("error");
        return;
    }
    const av = teamRes?.pilots?.available ?? 0, home = av > 0 ? u.filter(c11AtHome) : [];
    // C1 ruling 124: away from base (or nobody at base) the nearest free pilot walks to each vehicle
    const away = u.filter((e) => !home.includes(e));
    if (away.length) {
        const n = c1DispatchSelected(away.map((e) => e.id));
        if (!home.length) {
            notify(`CREW · sending pilots to ${n} vehicle${n === 1 ? "" : "s"}`, "info");
            snd.ui("confirm");
            return;
        }
    }
    act({ kind: "crew", vehicles: home.map((e) => e.id) }, "CREW");
    c11Stats.crewSent = (c11Stats.crewSent ?? 0) + 1;
    notify(`CREW ORDER · ${home.length} vehicle${home.length === 1 ? "" : "s"}${home.length < u.length ? ` (${u.length - home.length} not at base)` : ""}`, "info");
    snd.ui("confirm");
}
// C11 item 1: the infantry squad cap per Barracks (ruling 65; the counts come from the host sidecar)
function c11SquadLine() {
    const q = c9?.squads;
    if (!q || q.cap < 0)
        return "";
    const full = q.n >= q.cap;
    return `<div class="note${full ? " w" : ""}">SQUADS <b>${q.n} / ${q.cap}</b> · ${q.per} per Barracks${full ? " · <b>FULL</b>: build or rebuild a Barracks for more" : ""}</div>`;
}
// C11 item 5: the downed overlay says whether help is coming (rulings 79 / 88: the sim's EXT_DOWNED record)
function c11DownedRec() { const v = views[views.length - 1]; return v && pilotId ? v.downed?.get(pilotId) : undefined; }
function c11DownedText(seconds, revive) {
    const h = c11DownedRec();
    if (!h)
        return null;
    const he = h.helper ? renderedById.get(h.helper) : undefined;
    const dist = he && bodyRender ? Math.hypot(he.x - bodyRender.x, he.z - bodyRender.z) : null;
    return (0, c11_ts_1.downedHelpText)(h, he ? typeName[he.type] : "soldier", dist, seconds, revive);
}
function c11DownedFrame(down) {
    if (down && !c11WasDowned)
        c11HelpWas = false;
    if (down)
        c11WasDowned = true;
    else if (me && (me.state === sim_ts_1.P_FOOT || me.state === sim_ts_1.P_SEATED))
        c11WasDowned = false;
    if (!down)
        return;
    const h = c11DownedRec(), coming = !!h && h.aiHelper;
    if (coming && !c11HelpWas) {
        c11Cue("help-coming");
        notify("HELP IS COMING · a friendly soldier is on the way to revive you", "good");
    }
    c11HelpWas = coming;
    const he = h?.helper ? renderedById.get(h.helper) : undefined;
    if (he)
        tag(he.x, he.cy + cd.tRadius[he.type] + 3, he.z, "COMING TO REVIVE", "prodtag");
}
// C11 item 1: vehicles waiting for a crew (S14 crew bit 12) and own vehicles with no crew
function c11StripWaiting(v) {
    for (const e of v.entities.values()) {
        if (e.crew & CREW_WAITING_BIT) {
            e.crew &= ~CREW_WAITING_BIT;
            c11Waiting.set(e.id, e.crew);
        }
        else if (c11Waiting.has(e.id) && c11Waiting.get(e.id) !== e.crew)
            c11Waiting.delete(e.id);
    }
    for (const id of c11Waiting.keys())
        if (!v.entities.has(id))
            c11Waiting.delete(id);
}
/** An own vehicle that needs pilots: waiting (produced short of pilots) or with every operator seat empty. */
function c11NoCrew(e) { return crewable(e.type) && !cd.tStructure[e.type] && (c11Waiting.has(e.id) || (e.crew === 0 && (0, c11_ts_1.operatorSeats)(cd, e.type) > 0)); }
// C11 item 1: own AI pilots on foot (reserve pilots: each one crews a vehicle again once home)
function c11PilotTags() {
    const v = views[views.length - 1];
    if (!v || cd.pilotType < 0)
        return;
    const players = new Set();
    for (const p of v.players.values())
        players.add(p.entity);
    let n = 0;
    for (const e of rendered) {
        if (n >= 12 || e.team !== 0 || e.type !== cd.pilotType || players.has(e.id) || walkers.has(e.id))
            continue;
        if (mode !== "cmd" && Math.hypot(e.x - eye[0], e.z - eye[2]) > 120)
            continue;
        if (tag(e.x, e.simY + 2.6, e.z, mode === "cmd" ? `PILOT ON FOOT<small>escort home: back in the reserve at the Core / a Barracks / a Depot</small>` : "OWN PILOT", "pilotfoot"))
            n++;
    }
    c11Stats.pilotTags = n;
}
// C11 items 7 / 4: shields offline in a solar flare (ruling 68: vehicles, pilots, bubbles, domes); a dome off by its gas floor (ruling 86)
function c11ShieldsOff() { const w = WX_DEFS.find((x) => x.id === wxNow.id); return !!w?.effects?.shieldsOffline; }
function c11DomeOff(team) {
    if (c11ShieldsOff())
        return "OFF · solar flare: every shield is down";
    const g = team === 0 ? views[views.length - 1]?.gasFloor?.get(0) : undefined;
    return g?.domeOff ? `OFF · gas below the floor (${g.floor}): set the floor in the panel` : "";
}
// C11 item 2 (ruling 55): aircraft ammunition on the HUD, the command view tags, the nearest Air Pad when empty
const T_AIRPAD = cd.typeIds.indexOf("air-pad");
let c11AmmoHtml = "", c11AmmoEmptyId = 0;
const c11AmmoWas = new Map();
function c11Pads() { return T_AIRPAD < 0 ? [] : rendered.filter((b) => b.team === 0 && b.type === T_AIRPAD && b.hp > 0); }
function c11NearestPad(x, z) {
    let best = null, bd = Infinity;
    for (const p of c11Pads()) {
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < bd) {
            bd = d;
            best = p;
        }
    }
    return best ? { pad: best, d: bd } : null;
}
function c11AmmoName(t) { return (m) => wName(cd.tMounts[t * data_ts_1.MAX_MOUNTS + m]); }
function c11AmmoFrame(vehId, vt) {
    const v = views[views.length - 1], a = v?.ammo?.get(vehId), e = renderedById.get(vehId);
    const np = e ? c11NearestPad(e.x, e.z) : null;
    const atPad = !!np && !!e && np.d < cd.tRadius[np.pad.type] + cd.tRadius[vt] + 6 && (0, c8_ts_1.aircraftHeight)(e.alt, cd.constants.airAltitude) < 2;
    const h = (0, c11_ts_1.ammoHud)(a, c11AmmoName(vt), atPad);
    let html = isFrontline() ? h.html.replace("land at an Air Pad to rearm", "rearm at your base").replace("rearm at an Air Pad", "rearm at your base") : h.html;
    if (h.anyEmpty && !h.rearming)
        html += isFrontline() ? `<div class="am empty"><span>rearm: hover by your Command Core, Barracks or a forward base</span></div>` : np ? `<div class="am"><span>nearest Air Pad</span><b>${Math.round(np.d)} m</b></div>` : `<div class="am empty"><span>no Air Pad: build one to rearm</span></div>`;
    if (html !== c11AmmoHtml) {
        $("ammoRow").innerHTML = html;
        c11AmmoHtml = html;
    }
    c11AmmoEmptyId = h.anyEmpty && !h.rearming ? vehId : 0;
    // the player's own aircraft: dry / full transitions (the AMMO event is for AI rearm runs)
    if (a) {
        const was = c11AmmoWas.get(vehId);
        if (was && !was.anyEmpty && h.anyEmpty) {
            notify(`${h.empty ? "OUT OF AMMO" : "A WEAPON IS EMPTY"} · land at an Air Pad to rearm${np ? ` (${Math.round(np.d)} m)` : ""}`, "warn");
            c11Cue("ammo-dry", null, 1000);
        }
        if (was && was.frac < 1 && h.frac >= 1) {
            notify("REARMED · full load", "good");
            c11Cue("rearmed");
            if (e)
                c11Fx("respawn-glow", e.x, e.y, e.z, { team: 0 });
        }
        c11AmmoWas.set(vehId, { anyEmpty: h.anyEmpty, frac: h.frac });
    }
    c11Stats.ammoRows = a ? a.mounts.length : 0;
}
function c11AmmoTags() {
    const v = views[views.length - 1];
    if (!v?.ammo)
        return;
    const myVeh = seated() && me ? me.entity : 0;
    if (!myVeh && c11AmmoHtml) {
        $("ammoRow").innerHTML = "";
        c11AmmoHtml = "";
        c11AmmoEmptyId = 0;
    }
    for (const a of v.ammo.values()) {
        const e = renderedById.get(a.id);
        if (!e || (mode !== "cmd" && a.id !== myVeh))
            continue;
        const h = (0, c11_ts_1.ammoHud)(a, c11AmmoName(e.type), false);
        if (mode === "cmd" && (h.anyEmpty || h.rearming))
            tag(e.x, e.cy + cd.tRadius[e.type] + 4, e.z, h.rearming ? `REARMING ${Math.round(h.frac * 100)}%` : "NO AMMO · to an Air Pad", h.rearming ? "pad" : "nocrew");
    }
    if (c11AmmoEmptyId) { // the nearest pad, marked for the pilot of an empty aircraft
        const e = renderedById.get(c11AmmoEmptyId), np = e ? c11NearestPad(e.x, e.z) : null;
        if (np && tag(np.pad.x, np.pad.y + 8, np.pad.z, `AIR PAD · REARM HERE<small>${Math.round(np.d)} m · land on it (C)</small>`, "pad"))
            c11Stats.padMarks = (c11Stats.padMarks ?? 0) + 1;
    }
}
// C11 (rulings 57 / 60): before the first call of the battle the sim sends no calls block, so the page applies the
// hidden rule itself: no ground vehicle in the reserve and no finished own producer of the drop's unit with its cost
function c11DropHidden(call) {
    const ut = callRules?.calls[call]?.unitType ?? -1;
    if (!c9?.reserve || ut < 0)
        return false;
    if (c9.reserve.vehicle >= 0)
        return false;
    const busy = underConstruction();
    const producer = rendered.some((b) => b.team === 0 && cd.tStructure[b.type] && b.hp > 0 && !busy.has(b.id) && buildOptions(b.type).includes(ut));
    const rich = (teamRes?.ore ?? 0) + 1e-9 >= cd.tCostOre[ut] && (teamRes?.gas ?? 0) + 1e-9 >= cd.tCostGas[ut];
    return !(producer && rich);
}
// C11 (ruling 67): ash fall grounds every aircraft: a countdown for a pilot in the air (forecast from the weather block
// or the AIR_WARNING event), then GROUNDED while it lasts; the last 5 s tick
let c11AshTick = -1, c11AshHtml = "";
function c11AshFrame(now, vt) {
    const el = $("ashWarn"), v = views[views.length - 1], wb = v?.weather;
    const air = vt >= 0 && !!cd.tAir[vt] && started && !dead();
    const grounding = (i) => i >= 0 && !!WX_DEFS[i]?.effects?.aircraftGrounded;
    let secs = -1;
    if (wb && grounding(wb.next) && wb.startsTick > v.tick)
        secs = (wb.startsTick - v.tick) * dt;
    else if (now < c11AshWarnUntil)
        secs = (c11AshWarnUntil - now) / 1000;
    const inAsh = !!wb && grounding(wb.current);
    const me2 = renderedById.get(me?.entity ?? 0), aloft = !!me2 && (0, c8_ts_1.aircraftHeight)(me2.alt, cd.constants.airAltitude) > 1.5;
    let html = "";
    if (air && secs >= 0 && secs < 60 && aloft)
        html = `ASH FALL IN ${Math.ceil(secs)} s · LAND NOW<small>hold C to land · aircraft still in the air crash-land and lose half their hull</small>`;
    else if (air && inAsh)
        html = `GROUNDED · ASH FALL<small>no aircraft can fly until it ends</small>`;
    if (html !== c11AshHtml) {
        el.innerHTML = html;
        c11AshHtml = html;
        el.style.display = html ? "block" : "none";
    }
    el.classList.toggle("now", !!html && secs >= 0 && secs < 10);
    if (html && secs >= 0 && secs <= 5 && Math.ceil(secs) !== c11AshTick) {
        c11AshTick = Math.ceil(secs);
        c11Cue("beacon-tick");
    }
    c11Stats.ashWarn = html ? 1 : 0;
}
// C11 (ruling 86): the Shield Projector's gas floor: the dome switches off while the team's gas is below it
const C11_FLOOR_STEPS = [0, 100, 200, 400, 800];
const C11_FLOOR_DEFAULT = (() => { for (const b of data.buildings)
    if (typeof b.effects?.domeGasFloor === "number")
        return b.effects.domeGasFloor; return 0; })();
function c11GasFloorHtml() {
    const g = views[views.length - 1]?.gasFloor?.get(0), floor = g?.floor ?? C11_FLOOR_DEFAULT;
    const btn = (v, i) => `<span class="lnk${v === floor ? " on" : ""}" data-act="c9" data-k="gasFloor" data-b="0" data-i="${i}">${v}</span>`;
    return `<div class="ph2">GAS FLOOR · the dome switches off below <b>${floor}</b> gas${g?.domeOff ? ` · <b style="color:#ff5a4a">DOME OFF: gas ${Math.floor(teamRes?.gas ?? 0)}</b>` : ""}</div>`
        + `<div class="note">keep this much gas for other uses: ${C11_FLOOR_STEPS.map(btn).join(" · ")}${C11_FLOOR_STEPS.includes(C11_FLOOR_DEFAULT) ? "" : ` · default ${C11_FLOOR_DEFAULT}`}</div>`;
}
function c11SetGasFloor(i) {
    const v = C11_FLOOR_STEPS[i] ?? C11_FLOOR_DEFAULT;
    act({ kind: "gasFloor", gas: v }, "GAS FLOOR");
    c11Stats.floorSent = (c11Stats.floorSent ?? 0) + 1;
    notify(`SHIELD DOME · gas floor ${v}: the dome switches off below ${v} gas`, "info");
    snd.ui("click");
}
// C11 per frame: a dome off by its gas floor (feed + cue), building sites decaying (ruling 69), the idle-prone notice (ruling 73)
let c11DomeWasOff = false, c11IdleShown = false;
const c11DecayWas = new Set();
function c11Frame(now) {
    void now;
    const v = views[views.length - 1];
    const g = v?.gasFloor?.get(0), off = !!g?.domeOff;
    if (off && !c11DomeWasOff) {
        notify(`SHIELD DOME OFF · team gas below the floor (${g.floor}): lower it in the Projector's panel`, "warn");
        c11Cue("shield-break");
    }
    else if (!off && c11DomeWasOff && g)
        notify("SHIELD DOME BACK ON", "good");
    c11DomeWasOff = off;
    // ruling 69: sites with no Constructor
    const decaying = new Set();
    for (const d of c9?.decay ?? []) {
        const st = v?.construction?.sites.find((x) => x.id === d.id);
        if (!st)
            continue;
        if (d.wait <= 0) {
            decaying.add(d.id);
            if (!c11DecayWas.has(d.id)) {
                notify(`SITE DECAYING · ${typeName[st.type]} at ${ptStatics[st.point]?.name ?? "a point"}: no Constructor · half the cost back if it reaches zero`, "warn");
                c11Cue("site-decay", [st.x, (0, terrain_gen_ts_1.sampleHeight)(hm, st.x, st.z), st.z]);
            }
        }
        const near = mode === "cmd" || Math.hypot(st.x - eye[0], st.z - eye[2]) < 300;
        if (near)
            tag(st.x, (0, terrain_gen_ts_1.sampleHeight)(hm, st.x, st.z) + 7, st.z, d.wait > 0 ? `NO CONSTRUCTOR<small>decays in ${Math.ceil(d.wait * dt)} s · send a Constructor</small>` : `DECAYING · ${Math.round(st.progress * 100)}%<small>no Constructor · half the cost back at zero</small>`, "nocrew");
    }
    c11DecayWas.clear();
    for (const id of decaying)
        c11DecayWas.add(id);
    c11Stats.decaySites = (c9?.decay ?? []).length;
    // ruling 73: no input for 15 s on foot: the sim lays the pilot prone (and it does not auto-fire)
    const body = onFoot() && me ? renderedById.get(me.entity) : undefined;
    const idle = !!body && (body.crew & CREW_PRONE_BIT) !== 0 && !proneOn;
    if (idle && !c11IdleShown) {
        notify("IDLE · your pilot went prone (15 s without input) and holds fire · move to get up", "info");
        c11Stats.idleProne = (c11Stats.idleProne ?? 0) + 1;
    }
    c11IdleShown = idle;
}
const CREW_PRONE_BIT = 0x4000;
// ---- ruling 108 (designer 15 Nov): the Dart Scout boost (boost-hud.ts helpers; cues in sound-table.ts)
let boostHtml = "", boostWas, boostFxDrawn = 0;
const boostStats = {};
/** The scout driver's BOOST row and own cues (kick-in roar, meter dry, meter full). */
function boostFrame(vehId, vt, driver) {
    if (!driver || !(cd.tBoostMul[vt] > 0)) {
        if (boostHtml) {
            $("boostRow").innerHTML = "";
            boostHtml = "";
        }
        boostWas = undefined;
        snd.boostLoop(false);
        return;
    }
    const v = views[views.length - 1], B = (0, boost_hud_ts_1.boostView)(v?.boosts?.get(vehId)), ed = (0, boost_hud_ts_1.boostEdges)(boostWas, B);
    boostWas = B;
    snd.boostLoop(!!B.boosting); // Frontline: the boost roar, held while boosting
    const h = (0, boost_hud_ts_1.boostHud)(B);
    if (h.html !== boostHtml) {
        $("boostRow").innerHTML = h.html;
        boostHtml = h.html;
    }
    if (ed.started) {
        if (!snd.samples.get("gunshipEngine")) // Frontline: the boost roar (snd.boostLoop); the synth cue only without the recording
            snd.cue("boost-start", null);
        boostStats.start = (boostStats.start ?? 0) + 1;
    }
    if (ed.emptied)
        c11Cue("boost-empty");
    if (ed.ready)
        c11Cue("boost-ready");
}
// ---- F2 (designer playtest 15 Nov, ruling 91): the Lancer laser (f2-laser.ts helpers; cues in sound-table.ts, effects in fx-effects.ts)
const f2Stats = {};
let f2Html = "";
const f2Was = new Map();
const f2LaserType = (t) => { for (let m = 0; m < cd.tMountCount[t]; m++) {
    const w = cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
    if (w >= 0 && (cd.wChargeTicks[w] > 0 || cd.wHeatPerShot[w] > 0))
        return true;
} return false; };
const f2Cannon = (t) => { for (let m = 0; m < cd.tMountCount[t]; m++) {
    const w = cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
    if (w >= 0 && cd.wChargeTicks[w] > 0)
        return wName(w);
} return isFrontline() ? null : "cannon"; };
const f2Rapid = (t) => { for (let m = 0; m < cd.tMountCount[t]; m++) {
    const w = cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
    if (w >= 0 && cd.wHeatPerShot[w] > 0)
        return wName(w);
} return isFrontline() ? null : "rapid laser"; };
/** Frontline: the type's first heat weapon is a laser (it overheats into a spent cell, swapped with R). */
const f2RapidIsLaser = (t) => { for (let m = 0; m < cd.tMountCount[t]; m++) {
    const w = cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
    if (w >= 0 && cd.wHeatPerShot[w] > 0)
        return data_ts_1.DAMAGE_TYPES[cd.wDamageType[w]] === "laser";
} return false; };
/** Frontline: the key that fires the first charge (charge) or heat (!charge) weapon of type t: the driver's main gun LMB, an extra RMB, the third weapon R. */
const f2Key = (t, charge) => { for (let m = 0; m < cd.tMountCount[t]; m++) {
    const w = cd.tMounts[t * data_ts_1.MAX_MOUNTS + m];
    if (w >= 0 && (charge ? cd.wChargeTicks[w] > 0 : cd.wHeatPerShot[w] > 0))
        return m === 0 ? "LMB" : (data.constants.frontline?.vehicleThirdFire ?? []).includes(cd.weaponIds[w]) ? "R" : "RMB";
} return charge ? "LMB" : "RMB"; };
function f2Count(k) { f2Stats[k] = (f2Stats[k] ?? 0) + 1; }
/** The Lancer driver's HUD rows and own-crew cues (charge whine, cooldown ticks, ready, overheat alarm, vent hiss). */
function f2LaserFrame(vehId, vt, driver) {
    const show = driver && f2LaserType(vt);
    if (!show) {
        if (f2Html) {
            $("laserRow").innerHTML = "";
            f2Html = "";
        }
        return;
    }
    const v = views[views.length - 1], L = (0, f2_laser_ts_1.laserView)(v?.lasers?.get(vehId), dt);
    const h = (0, f2_laser_ts_1.laserHud)(L, f2Cannon(vt), f2Rapid(vt), isFrontline() ? f2Key(vt, true) : "LMB", isFrontline() ? f2Key(vt, false) : "RMB");
    if (isFrontline() && L.overheated && f2RapidIsLaser(vt))
        h.html = h.html.replace(/OVERHEATED [0-9.]+ s/, "OVERHEATED · tap R: swap cell");
    if (h.html !== f2Html) {
        $("laserRow").innerHTML = h.html;
        f2Html = h.html;
    }
    f2Stats.frames = (f2Stats.frames ?? 0) + 1;
    if (L.cooldownS > 0)
        c11Cue("laser-cooldown-tick", null, 500);
    if (L.overheated)
        c11Cue("laser-vent", null, 1500);
}
/** Every Lancer in view: the cannon's charge glow at the muzzle (enemies see a shot coming) and its whine; heat shimmer and venting steam on hot / overheated rapid lasers. */
function f2LaserWorld(now) {
    const v = views[views.length - 1];
    if (!v?.lasers)
        return;
    const myVeh = seated() && me ? me.entity : 0;
    for (const [id, rec] of v.lasers) {
        const e = renderedById.get(id), L = (0, f2_laser_ts_1.laserView)(rec, dt), was = f2Was.get(id), ed = (0, f2_laser_ts_1.laserEdges)(was, L), own = id === myVeh;
        f2Was.set(id, L);
        if (!e)
            continue;
        const d = Math.hypot(e.x - eye[0], e.z - eye[2]);
        if (L.charge > 0 && d < 900) {
            const m = muzzleWorld(e, 0, 0);
            fx_p2_ts_1.p2Fx.run("laser-charge", { x: m[0], y: m[1], z: m[2], f: L.charge, team: e.team, t: now / 1000, own });
            f2Count("chargeFx");
        }
        if (ed.chargeStart && (own || d < 500)) {
            snd.cue("laser-charge", own ? null : [e.x, e.cy, e.z]);
            f2Count(own ? "chargeCueOwn" : "chargeCue");
        }
        if (own && ed.ready) {
            c11Cue("laser-ready");
            f2Count("readyCue");
        }
        if (ed.overheat) {
            if (own) {
                notify("RAPID LASER OVERHEATED · disabled while it cools", "warn");
                c11Cue("laser-overheat");
                f2Count("overheatCue");
            }
            if (d < 400)
                snd.cue("laser-vent", own ? null : [e.x, e.cy, e.z]);
        }
        if (d < 300 && (L.overheated || L.heat > 0)) {
            const m = muzzleWorld(e, 1, 0);
            if (L.overheated) {
                fx_p2_ts_1.p2Fx.run("laser-vent", { x: m[0], y: m[1], z: m[2], n: Math.random() < 0.25 ? 1 : 0 });
                fx_p2_ts_1.p2Fx.run("laser-heat", { x: m[0], y: m[1], z: m[2], f: 1 });
                f2Count("ventFx");
            }
            else
                fx_p2_ts_1.p2Fx.run("laser-heat", { x: m[0], y: m[1], z: m[2], f: L.heat });
        }
    }
    for (const id of f2Was.keys())
        if (!v.lasers.has(id)) {
            const was = f2Was.get(id);
            if (id === myVeh && was.cooldownS > 0)
                c11Cue("laser-ready");
            f2Was.delete(id);
        } // record gone: at rest
}
