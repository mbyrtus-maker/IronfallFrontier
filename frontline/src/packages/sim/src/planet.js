"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANET_FIELD_READS = exports.GRAVITY_CLASS_NAMES = exports.GRAVITY_HIGH = exports.GRAVITY_NORMAL = exports.GRAVITY_LOW = void 0;
exports.compilePlanetRules = compilePlanetRules;
exports.GRAVITY_LOW = 0, exports.GRAVITY_NORMAL = 1, exports.GRAVITY_HIGH = 2;
exports.GRAVITY_CLASS_NAMES = ["low", "normal", "high"];
function compilePlanetRules(data, planetId) {
    const p = data.planets.find((x) => x.id === planetId);
    const c = data.constants;
    const g = typeof p?.gravity === "number" ? p.gravity : 1;
    const atm = typeof p?.atmosphere === "string" ? p.atmosphere : "normal";
    const th = c.gravityThresholds;
    let cls = exports.GRAVITY_NORMAL;
    if (th && typeof th.lowBelow === "number" && g < th.lowBelow)
        cls = exports.GRAVITY_LOW;
    else if (th && typeof th.highAbove === "number" && g > th.highAbove)
        cls = exports.GRAVITY_HIGH;
    const ar = c.atmosphereRules?.[atm];
    const name = exports.GRAVITY_CLASS_NAMES[cls];
    const hl = cls === exports.GRAVITY_NORMAL ? 1 : c.haulerLoadModifier?.[name];
    const hv = c.gravityHandling?.[name]?.hoverTopSpeedMultiplier;
    return {
        id: planetId, gravityG: g, atmosphere: atm, gravityClass: cls,
        aircraftAllowed: ar?.aircraftAllowed !== false,
        aircraftPayload: typeof ar?.aircraftPayloadMultiplier === "number" ? ar.aircraftPayloadMultiplier : 1,
        haulerLoad: typeof hl === "number" && hl > 0 ? hl : 1,
        hoverSpeed: typeof hv === "number" && hv > 0 ? hv : 1,
        hazardWeather: typeof p?.hazard?.weather === "string" ? p.hazard.weather : null,
        typeSpeed: new Float64Array(0),
    };
}
/**
 * Every field of data/planets.json and where the sim reads it. "unread" entries are also in packages/sim/UNREAD_FIELDS.json
 * (sim-relevant, not read yet) or are presentation / campaign text (UNREAD_FIELDS.json notSimFields).
 */
exports.PLANET_FIELD_READS = {
    id: { read: true, where: "data.ts compileData (planet lookup), state, hash" },
    name: { read: false, where: "presentation (client)" },
    gravity: { read: true, where: "data.ts gravity (ballistic range, shell flight, jump, jetpack burn, fall damage, ejection); planet.ts gravityClass (hauler load, hover speed)" },
    atmosphere: { read: true, where: "data.ts airless + fog cap + aircraftAllowed (w2c: production of aircraft); calls.ts air payload" },
    atmosphereLabel: { read: false, where: "presentation (client)" },
    character: { read: false, where: "presentation (client)" },
    economyQuirk: { read: false, where: "presentation; the quirks themselves are map-authored (deposits, geysers) or rules elsewhere (haulerLoadModifier)" },
    look: { read: false, where: "presentation (client)" },
    hazard: { read: true, where: "hazard.weather: weather.ts (a scenario schedule may only use weather allowed on the planet; the hazard is the default storm of the planet fixtures); hazard.name: presentation" },
    deepGasVents: { read: false, where: "map-authored: UNREAD_FIELDS.json (Pale's two deep vents are geysers placed by the map)" },
    geysersPerVent: { read: false, where: "map-authored: UNREAD_FIELDS.json (Brume's vents are placed by the map)" },
};
