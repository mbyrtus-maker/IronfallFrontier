"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.battleOf = exports.battleById = exports.DEFAULT_BATTLE = exports.pageKey = exports.BATTLES = exports.SKIRMISH_CLASSIC = exports.REFERENCE_MAP_FIXTURE = exports.SYMMETRIC_MAP = void 0;
exports.battleLayout = battleLayout;
exports.pageGeo = pageGeo;
// Client C6 item 2: the battles on the start screen, read from the scenario and map fixtures the sim ships
// (packages/sim/fixtures). The build inlines the JSON files as modules (build.mjs); Node imports them as JSON
// modules. No hand copies: "classic" is the old skirmish on the 7-point reference map, every other battle is on the
// 11-point symmetric map (3 km).
// @ts-ignore TS2823 in the CommonJS build only (import attributes); the emitted require() is what the page loader resolves
const skirmish_2_json_1 = __importDefault(require("../../sim/fixtures/scenarios/skirmish-2.json"));
// @ts-ignore see above
const s2_conquest_json_1 = __importDefault(require("../../sim/fixtures/scenarios/s2-conquest.json"));
// @ts-ignore see above
const s2_hold_json_1 = __importDefault(require("../../sim/fixtures/scenarios/s2-hold.json"));
// @ts-ignore see above
const s2_destroy_json_1 = __importDefault(require("../../sim/fixtures/scenarios/s2-destroy.json"));
// @ts-ignore see above
const s2_survive_json_1 = __importDefault(require("../../sim/fixtures/scenarios/s2-survive.json"));
// @ts-ignore see above
const s2_extract_json_1 = __importDefault(require("../../sim/fixtures/scenarios/s2-extract.json"));
// @ts-ignore see above
const skirmish_json_1 = __importDefault(require("../../sim/fixtures/scenarios/skirmish.json"));
// @ts-ignore see above
const symmetric_11_json_1 = __importDefault(require("../../sim/fixtures/maps/symmetric-11.json"));
// @ts-ignore see above
const reference_7_json_1 = __importDefault(require("../../sim/fixtures/maps/reference-7.json"));
// @ts-ignore see above
const skirmish_halcyon_json_1 = __importDefault(require("../../sim/fixtures/scenarios/skirmish-halcyon.json"));
// @ts-ignore see above
const skirmish_rust_json_1 = __importDefault(require("../../sim/fixtures/scenarios/skirmish-rust.json"));
// @ts-ignore see above
const skirmish_pale_json_1 = __importDefault(require("../../sim/fixtures/scenarios/skirmish-pale.json"));
// @ts-ignore see above
const skirmish_brume_json_1 = __importDefault(require("../../sim/fixtures/scenarios/skirmish-brume.json"));
// @ts-ignore see above
const skirmish_cinder_json_1 = __importDefault(require("../../sim/fixtures/scenarios/skirmish-cinder.json"));
// Frontline stage 1: the three-lane map and its scenario (lanes.ts)
// @ts-ignore see above
const frontline_json_1 = __importDefault(require("../../sim/fixtures/scenarios/frontline.json"));
// @ts-ignore see above
const frontline_3_json_1 = __importDefault(require("../../sim/fixtures/maps/frontline-3.json"));
exports.SYMMETRIC_MAP = symmetric_11_json_1.default;
exports.REFERENCE_MAP_FIXTURE = reference_7_json_1.default;
exports.SKIRMISH_CLASSIC = skirmish_json_1.default;
const mk = (id, label, mission, sub, sc, geo, kind = "mission", mapOf = null) => ({ id, label, mission, sub, scenario: sc, map: mapOf ?? (geo === "sym" ? exports.SYMMETRIC_MAP : exports.REFERENCE_MAP_FIXTURE), geo, planet: sc.planetId, kind });
/**
 * C9: the fix-qa2 mission types (objectives.ts codes 8-11) as client battles: the symmetric skirmish (skirmish-2's map,
 * spawns and teams) with one new primary objective each. The sim has no fixture scenarios for them; the numbers left out
 * come from constants.objectives (extraction 5,000 ore / 2,000 gas, escort 4 points, infiltration 3 hacks, holdout 10
 * waves). Extraction adds a Launch Pad uplink at the west Citadel (the export building); escort (C11, ruling 63) a Forward
 * Base Vehicle leading three Haulers.
 */
const c9Mission = (id, name, primary, extra = []) => {
    const base = skirmish_2_json_1.default;
    return { ...base, id, name, spawns: [...base.spawns, ...extra], objectives: { primary } };
};
const C9_EXTRACTION = c9Mission("c9-extraction", "Extraction quota on the symmetric map (C9, fix-qa2)", { type: "extractionQuota", name: "Ship 5,000 ore and 2,000 gas off-world" }, [{ type: "launch-pad-uplink", team: 0, x: 380, z: 1420 }]);
const C9_ESCORT = c9Mission("c9-escort", "Escort on the symmetric map (C9, fix-qa2; C11 ruling 63)", { type: "escort", target: "escort", convoy: ["convoy-1", "convoy-2", "convoy-3"], route: ["choke-sw", "relay-ridge", "choke-ne", "ore-east"], name: "Escort the convoy through 4 points" }, [{ type: "forward-base-vehicle", team: 0, x: 600, z: 1560, tag: "escort" }, { type: "hauler", team: 0, x: 580, z: 1580, tag: "convoy-1" }, { type: "hauler", team: 0, x: 560, z: 1600, tag: "convoy-2" }, { type: "hauler", team: 0, x: 540, z: 1620, tag: "convoy-3" }]);
const C9_INFILTRATION = c9Mission("c9-infiltration", "Infiltration on the symmetric map (C9, fix-qa2)", { type: "infiltration", name: "Hack 3 enemy buildings or Cores" });
const C9_HOLDOUT = c9Mission("c9-holdout", "Holdout on the symmetric map (C9, fix-qa2)", { type: "holdout", name: "Hold out against 10 waves" });
/**
 * Frontline on each planet (designer 19 Nov: "build frontline on the other planets and remove the other types of
 * battles"): the three-lane map, lanes, walls and forest patches unchanged; the planet's world (gravity, atmosphere, sky,
 * ground, mountains) and its weather schedule (from its W2d skirmish). Halcyon keeps the original (no weather).
 */
const flOn = (planet, from) => ({ ...frontline_json_1.default, id: `frontline-${planet}`, name: `Frontline on ${planet}`, planetId: planet, ...(from?.weather ? { weather: from.weather } : {}) });
const FL_SUB = "three lanes · AI waves on both sides · destroy the Hegemony Command Core";
/** Start-screen order: Frontline on the five planets (Halcyon first: the default). The other battle types are retired. */
exports.BATTLES = [
    mk("frontline", "HALCYON", "skirmish", FL_SUB, frontline_json_1.default, "sym", "planet", frontline_3_json_1.default),
    mk("frontline-rust", "RUST", "skirmish", FL_SUB, flOn("rust", skirmish_rust_json_1.default), "sym", "planet", frontline_3_json_1.default),
    mk("frontline-pale", "PALE", "skirmish", FL_SUB, flOn("pale", skirmish_pale_json_1.default), "sym", "planet", frontline_3_json_1.default),
    mk("frontline-brume", "BRUME", "skirmish", FL_SUB, flOn("brume", skirmish_brume_json_1.default), "sym", "planet", frontline_3_json_1.default),
    mk("frontline-cinder", "CINDER", "skirmish", FL_SUB, flOn("cinder", skirmish_cinder_json_1.default), "sym", "planet", frontline_3_json_1.default),
];
/** Retired battle types (kept for old links and tests: battleById finds them, the start screen no longer lists them). */
exports.RETIRED_BATTLES = [
    mk("skirmish-2", "SKIRMISH", "skirmish", "11 points · last Command Core standing", skirmish_2_json_1.default, "sym"),
    mk("s2-conquest", "CONQUEST", "conquest", "destroy the Hegemony Command Core", s2_conquest_json_1.default, "sym"),
    mk("s2-hold", "HOLD", "hold", "hold 7 supplied points for 3 minutes", s2_hold_json_1.default, "sym"),
    mk("s2-destroy", "DESTROY", "destroy", "destroy the Hegemony Foundry", s2_destroy_json_1.default, "sym"),
    mk("s2-survive", "SURVIVE", "survive", "keep your Core standing for 15 minutes", s2_survive_json_1.default, "sym"),
    mk("s2-extract", "EXTRACT", "extract", "take the relay ridge and hold it for extraction", s2_extract_json_1.default, "sym"),
    mk("c9-extraction", "EXTRACTION", "extraction", "ship 5,000 ore and 2,000 gas off-world at the Launch Pad uplink", C9_EXTRACTION, "sym"),
    mk("c9-escort", "ESCORT", "escort", "a Forward Base Vehicle leads 3 Haulers through 4 points: keep them alive", C9_ESCORT, "sym"),
    mk("c9-infiltration", "INFILTRATION", "infiltration", "hack 3 enemy buildings or Cores (hold E at a wall)", C9_INFILTRATION, "sym"),
    mk("c9-holdout", "HOLDOUT", "holdout", "survive 10 enemy waves; the Core falling loses", C9_HOLDOUT, "sym"),
    mk("classic", "CLASSIC", "classic", "the old 7-point skirmish on the 2 km map", skirmish_json_1.default, "ref"),
    mk("skirmish-halcyon", "HALCYON SKIRMISH", "skirmish", "rock forest, snow, a ridge · fog bank, electrical storm", skirmish_halcyon_json_1.default, "sym"),
    mk("skirmish-rust", "RUST SKIRMISH", "skirmish", "mesas and canyons, passes between the points · dust storms", skirmish_rust_json_1.default, "sym"),
    mk("skirmish-pale", "PALE SKIRMISH", "skirmish", "jagged icy peaks, glacial valleys, no air · solar flares", skirmish_pale_json_1.default, "sym"),
    mk("skirmish-brume", "BRUME SKIRMISH", "skirmish", "misty highlands cut by gorges, methane lakes · fog, rain, storms", skirmish_brume_json_1.default, "sym"),
    mk("skirmish-cinder", "CINDER SKIRMISH", "skirmish", "volcanic ridges and cones, lava basins · ash fall, dust", skirmish_cinder_json_1.default, "sym"),
];
/**
 * The page's terrain key: map family and planet (both are fixed per page: the terrain mesh and the compiled data for
 * the planet). A battle with another key needs a page reload.
 */
const pageKey = (b, scripted) => (scripted ? "ref:halcyon" : `${b.geo}:${b.planet}:${b.map.id}`);
exports.pageKey = pageKey;
exports.DEFAULT_BATTLE = "frontline";
const battleById = (id) => exports.BATTLES.find((b) => b.id === id) ?? exports.RETIRED_BATTLES.find((b) => b.id === id) ?? null;
exports.battleById = battleById;
const battleOf = (id) => (0, exports.battleById)(id) ?? (0, exports.battleById)(exports.DEFAULT_BATTLE);
exports.battleOf = battleOf;
function battleLayout(b) {
    const core = (team) => b.scenario.spawns.find((s) => s.type === "command-core" && s.team === team);
    const c0 = core(0) ?? { x: b.scenario.mapSize * 0.15, z: b.scenario.mapSize / 2 }, c1 = core(1) ?? { x: b.scenario.mapSize * 0.85, z: b.scenario.mapSize / 2 };
    // the front (terrain flattened, the command view opens over it): the classic map keeps its old one (150 m east of the
    // west Core); on the symmetric map the ground 300 m east of the west Core
    const front = b.geo === "ref" ? { x: 450, z: 1000 } : { x: c0.x + 300, z: c0.z };
    return { mapSize: b.scenario.mapSize, base: { x: c0.x, z: c0.z }, enemyBase: { x: c1.x, z: c1.z }, front, pilotStart: { x: c0.x + 17, z: c0.z + 6 } };
}
/**
 * The terrain family a page loads (URL): the scripted battles (showcase, test range, the 300-unit run) are on the
 * reference terrain; otherwise the chosen battle's map.
 */
function pageGeo(battle, scripted) { return scripted ? "ref" : battle.geo; }
