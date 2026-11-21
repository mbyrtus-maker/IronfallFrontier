"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioMap = scenarioMap;
exports.scenarioTeams = scenarioTeams;
exports.scenarioHeightmap = scenarioHeightmap;
exports.createScenarioSim = createScenarioSim;
const sim_ts_1 = require("./sim.js");
const relief_ts_1 = require("./relief.js");
/** The scenario's map with its additions. */
function scenarioMap(sc, map) {
    const m = JSON.parse(JSON.stringify(map));
    if (sc.mapAdditions?.deposits?.length)
        m.deposits = [...(m.deposits ?? []), ...sc.mapAdditions.deposits];
    if (sc.mapAdditions?.geysers?.length)
        m.geysers = [...(m.geysers ?? []), ...sc.mapAdditions.geysers];
    return m;
}
/** The scenario's match teams after the options' overrides. */
function scenarioTeams(sc, o) {
    return sc.teams.map((t) => {
        const ai = o.aiTeams ? o.aiTeams.includes(t.team) : t.ai === true;
        return ai ? { team: t.team, ai: true, difficulty: o.difficulty ?? t.difficulty } : { team: t.team };
    });
}
/**
 * T1: the scenario's relief heightmap (cell RELIEF_CELL), or null when it has none (no relief flag, or a planet without
 * relief). The page builds the same one (same data, map, layer and terrain seed) and injects it.
 */
function scenarioHeightmap(data, sc, map, terrainSeed) {
    if (!sc.relief)
        return null;
    const seed = terrainSeed ?? (typeof sc.relief === "object" && typeof sc.relief.seed === "number" ? sc.relief.seed : relief_ts_1.RELIEF_DEFAULT_SEED);
    const R = (0, relief_ts_1.scenarioRelief)(data, sc.planetId, sc.mapSize, map, sc.terrainLayer ?? map.terrainLayer, seed);
    return R ? R.heightmap(relief_ts_1.RELIEF_CELL) : null;
}
/** Builds the sim: map, match rules, starting entities (in file order), supply and Command Points refreshed. */
function createScenarioSim(data, sc, map, o) {
    const hm = scenarioHeightmap(data, sc, map, o.terrainSeed);
    const sim = (0, sim_ts_1.createSim)({ data, seed: o.seed, planetId: sc.planetId, mapSize: sc.mapSize, flatTerrain: !hm && sc.flatTerrain === true, heightmap: hm ?? undefined,
        map: scenarioMap(sc, map), match: { teams: scenarioTeams(sc, o), objectives: sc.objectives, players: o.players },
        terrainLayer: sc.terrainLayer, weather: sc.weather, lanes: sc.lanes });
    const tags = new Map();
    for (const sp of sc.spawns) {
        const id = sim.spawnUnit(sp.type, sp.team, sp.x, sp.z);
        if (sp.tag) {
            if (tags.has(sp.tag))
                throw new Error(`scenario ${sc.id}: spawn tag ${sp.tag} used twice`);
            tags.set(sp.tag, id);
        }
    }
    sim.match.objectives?.bind(sim, tags);
    for (const l of o.loadouts ?? []) {
        const r = sim.applyProfile(l);
        if (!r.ok)
            throw new Error(`scenario ${sc.id}: player ${l.player} loadout refused (${r.reason})`);
    }
    sim.drawStartingCrews(); // S14: the starting AI crews come out of the pilot reserve
    sim.refreshPoints();
    return sim;
}
