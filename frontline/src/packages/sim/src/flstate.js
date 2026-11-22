"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFl = exportFl;
exports.restoreFl = restoreFl;
// Co-op host handover (21 Nov, after the Ace of the Airways co-op lessons: "a checkpoint must carry everything the
// game needs to go on"): the Frontline state (lanes, the kit / economy / ferry / pings state of FKit, the AI pilots)
// is not in the binary sections, so a guest that took over from a checkpoint ran a Frontline match with no lanes, no
// waves, no AI pilots and default kits. It travels as one JSON section: plain data (Maps, Sets, typed arrays tagged);
// the rules (FKit.R, refill, Lanes.rules' source, FlBots.opts) are rebuilt from the game data on the receiving side.
const lanes_ts_1 = require("./lanes.js");
const fkit_ts_1 = require("./fkit.js");
const calls_ts_1 = require("./calls.js");
const flbots_ts_1 = require("./flbots.js");
const enemy_ai_ts_1 = require("./enemy-ai.js");
const SKIP_FKIT = new Set(["sim", "R", "refill", "emptyW", "bots"]);
const SKIP_BOTS = new Set(["opts"]);
function ser(v) {
    if (v instanceof Map)
        return { __m: [...v].map(([k, x]) => [ser(k), ser(x)]) };
    if (v instanceof Set)
        return { __s: [...v].map(ser) };
    if (ArrayBuffer.isView(v))
        return { __t: v.constructor.name, a: Array.from(v) };
    if (Array.isArray(v))
        return v.map(ser);
    if (typeof v === "number")
        return Number.isFinite(v) ? v : { __n: String(v) };
    if (v && typeof v === "object") {
        const o = {};
        for (const k of Object.keys(v))
            if (typeof v[k] !== "function")
                o[k] = ser(v[k]);
        return o;
    }
    return v;
}
const TYPED = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array };
function de(v) {
    if (Array.isArray(v))
        return v.map(de);
    if (v && typeof v === "object") {
        if (v.__m)
            return new Map(v.__m.map(([k, x]) => [de(k), de(x)]));
        if (v.__s)
            return new Set(v.__s.map(de));
        if (v.__t)
            return TYPED[v.__t] ? TYPED[v.__t].from(v.a) : v.a;
        if (v.__n !== undefined)
            return Number(v.__n);
        const o = {};
        for (const k of Object.keys(v))
            o[k] = de(v[k]);
        return o;
    }
    return v;
}
function fields(o, skip) {
    const out = {};
    for (const k of Object.keys(o))
        if (!skip.has(k) && typeof o[k] !== "function")
            out[k] = ser(o[k]);
    return out;
}
/** The Frontline section as a string ("" when the sim plays no Frontline match). */
function exportFl(sim) {
    if (!sim.lanes)
        return "";
    return JSON.stringify({
        lanes: fields(sim.lanes, new Set()),
        fkit: sim.fkit ? fields(sim.fkit, SKIP_FKIT) : null,
        bots: sim.fkit?.bots ? fields(sim.fkit.bots, SKIP_BOTS) : null,
    });
}
/** Rebuilds sim.lanes / sim.fkit (and its AI pilots) from exportFl's string. */
function restoreFl(sim, str) {
    if (!str)
        return;
    const j = JSON.parse(str);
    const L = Object.create(lanes_ts_1.Lanes.prototype); // its rules travel in the section (their source, the map definition, does not)
    for (const [k, v] of Object.entries(j.lanes))
        L[k] = de(v);
    sim.lanes = L;
    // designer 22 Nov: the call rules with their Frontline overrides (the restored sim was made without the lanes, so its
    // rules were compiled as for a non-Frontline match: minefield sizes, cooldowns and the like would differ from the host's)
    if (sim.callRules) {
        sim.callRules = (0, calls_ts_1.compileCallRules)(sim.data, sim.d.typeIds, sim.d.constants.tickRate, sim.d.planetId, true);
        if (sim.calls)
            sim.calls.rules = sim.callRules;
    }
    // the commander is set up for the lanes' quartermaster teams when it is made (sim constructor): make it again
    sim.ai = new enemy_ai_ts_1.EnemyAi(sim, sim.data);
    if (j.fkit) {
        const F = new fkit_ts_1.FKit(sim);
        for (const [k, v] of Object.entries(j.fkit))
            F[k] = de(v);
        if (j.bots) {
            if (!F.bots)
                F.bots = new flbots_ts_1.FlBots(sim.d.raw.constants.frontline?.aiPilots ?? {});
            for (const [k, v] of Object.entries(j.bots))
                F.bots[k] = de(v);
        }
        else
            F.bots = null;
        sim.fkit = F;
    }
}
