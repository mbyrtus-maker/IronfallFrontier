"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLACE_GEYSER_SNAP_M = exports.PLACE_MAX_SLOPE_DEG = exports.PLACE_YAW_STEP = exports.BUILD_REASON_TEXT = void 0;
exports.buildMenu = buildMenu;
exports.pointAt = pointAt;
exports.defaultBuildPoint = defaultBuildPoint;
exports.buildToolState = buildToolState;
exports.siteModels = siteModels;
exports.riseFraction = riseFraction;
exports.buildEventText = buildEventText;
exports.snapYaw = snapYaw;
exports.defaultPlaceYaw = defaultPlaceYaw;
exports.placementCheck = placementCheck;
const c9_ts_1 = require("./c9.js");
const construction_ts_1 = require("../../sim/src/construction.js");
const events_ts_1 = require("../../sim/src/events.js");
/** Texts of the sim's construction refusals (REJECT reason codes 46-59, s8 report section 6). */
exports.BUILD_REASON_TEXT = {
    unknownBuildingType: "unknown building type", notBuildable: "this cannot be built", unknownPoint: "no such point",
    pointNotOwned: "not your point: capture it first", pointUnsupplied: "the point is cut off from supply",
    wrongPointType: "not on this kind of point", noFreeSlot: "no free build slot", noGeyser: "no free geyser here",
    badPosition: "no clear spot for it", notOnPoint: "not inside a strategic point", noConstructor: "no Constructor: queue one at the Command Core",
    notConstructor: "that unit is not a Constructor", unknownSite: "the site is gone", underConstruction: "still under construction",
};
const bdef = (data, id) => data.buildings.find((b) => b.id === id);
/** The build menu for one point (same content in the command view and on the pilot's build tool). */
function buildMenu(c, point) {
    const st = c.statics[point], pv = c.points?.points[point], slots = c.construction?.points[point];
    const owner = pv?.owner ?? -1, supplied = !!pv?.supplied;
    const owned = owner === c.team;
    let blocked = null;
    if (!c.construction || !slots)
        blocked = "no construction on this map";
    else if (!owned)
        blocked = owner < 0 ? "neutral point: capture it first" : "enemy point: capture it first";
    else if (!supplied)
        blocked = "cut off from supply: reconnect it to the Command Core";
    const pts = c.statics.map((s) => s.type);
    const owners = c.statics.map((_, i) => c.points?.points[i]?.owner ?? -1);
    const sup = c.statics.map((_, i) => !!c.points?.points[i]?.supplied);
    const fits = c.construction ? (0, construction_ts_1.buildableFromSnapshot)(c.data, pts, owners, sup, c.construction.points, c.team)[point]?.types ?? [] : [];
    const noConstructor = c.constructors <= 0;
    const items = (st ? (0, construction_ts_1.buildTypesForPoint)(c.data, st.type) : []).map((id) => {
        const t = c.typeIds.indexOf(id), d = bdef(c.data, id) ?? {};
        const ore = t >= 0 ? c.costOre[t] : 0, gas = t >= 0 ? c.costGas[t] : 0;
        const defence = d.defence === true, geyser = d.effects?.requiresGeyser === true;
        let reason = "";
        if (blocked)
            reason = blocked;
        else if (typeof d.effects?.maxPlanetGravity === "number" && (c.gravity ?? 0) > d.effects.maxPlanetGravity + 1e-9)
            reason = (0, c9_ts_1.driverGravityText)(d.effects.maxPlanetGravity, c.gravity ?? 0); // C9
        else if (!fits.includes(id))
            reason = geyser ? "no free geyser" : defence ? "no free slot (defence)" : "no free build slot";
        else if (c.tierReason((0, construction_ts_1.placeTier)(c.data, id)))
            reason = c.tierReason((0, construction_ts_1.placeTier)(c.data, id)); // U1: the sim's placement tier (an Armoury needs tier 1, not "tier 2 needs the Armoury")
        else if (c.ore + 1e-9 < ore || c.gas + 1e-9 < gas)
            reason = `not enough ${c.ore + 1e-9 < ore && c.gas + 1e-9 < gas ? "ore and gas" : c.ore + 1e-9 < ore ? "ore" : "gas"} (stock ${Math.floor(c.ore)} ore · ${Math.floor(c.gas)} gas)`;
        else if (noConstructor)
            reason = "no Constructor";
        return { type: id, t, name: t >= 0 ? c.names[t] : id, ore, gas, seconds: Number(d.buildTime ?? 0), defence, geyser, ok: reason === "", reason };
    });
    const free = slots?.free ?? 0, freeDefence = slots?.freeDefence ?? 0, freeGeysers = slots?.freeGeysers ?? 0;
    const slotText = slots ? `slots ${free}/${slots.slots} free${slots.defenceSlots ? ` · defence +${Math.max(0, freeDefence - free)}/${slots.defenceSlots}` : ""}${freeGeysers ? ` · free geysers ${freeGeysers}` : ""}` : "no build slots";
    const canQueueConstructor = noConstructor && c.factory > 0;
    const constructorText = noConstructor ? (canQueueConstructor ? "No Constructor · a building order waits for one" : "No Constructor · and no building that can make one") : null;
    return { point, name: st?.name ?? `point ${point}`, pointType: st?.type ?? "", owned, supplied, slotText, free, freeDefence, freeGeysers, blocked, items, noConstructor, constructorText, canQueueConstructor };
}
/** The point whose area holds (x, z) (the sim's pointAt: the nearest centre within its radius), or -1. */
function pointAt(st, x, z) {
    let best = -1, bd = Infinity;
    for (const s of st) {
        const d = Math.hypot(x - s.x, z - s.z);
        if (d <= s.radius && d < bd) {
            bd = d;
            best = s.index;
        }
    }
    return best;
}
/** The default point for the command-view build menu: the point holding (x, z) if any, else the nearest own supplied point, else the nearest own point, else -1. */
function defaultBuildPoint(st, points, team, x, z) {
    const at = pointAt(st, x, z);
    if (at >= 0)
        return at;
    let best = -1, bd = Infinity, rank = 3;
    for (const s of st) {
        const p = points?.points[s.index];
        if (!p || p.owner !== team)
            continue;
        const r = p.supplied ? 0 : 1, d = Math.hypot(x - s.x, z - s.z);
        if (r < rank || (r === rank && d < bd)) {
            rank = r;
            bd = d;
            best = s.index;
        }
    }
    return best;
}
/**
 * The pilot's build tool (BACKLOG 36 / 37): the point the pilot stands in, and what the tool says. ok: the menu may
 * open (an own, supplied point); otherwise `text` says why it cannot build here.
 */
function buildToolState(st, points, construction, team, x, z) {
    if (!construction)
        return { point: -1, ok: false, text: "BUILD TOOL · no construction on this map" };
    const p = pointAt(st, x, z);
    if (p < 0)
        return { point: -1, ok: false, text: "BUILD TOOL · stand inside one of your points to build" };
    const pv = points?.points[p], name = st[p].name;
    if (!pv || pv.owner !== team)
        return { point: p, ok: false, text: `BUILD TOOL · ${name} is ${!pv || pv.owner < 0 ? "neutral" : "the enemy's"}: capture it first` };
    if (!pv.supplied)
        return { point: p, ok: false, text: `BUILD TOOL · ${name} is cut off from supply: no building` };
    return { point: p, ok: true, text: `BUILD TOOL · ${name} · LMB opens the build menu` };
}
/** Building sites from the construction block: a hologram waits for its Constructor (entity 0), then the structure rises. */
function siteModels(con, team, names) {
    if (!con)
        return [];
    return con.sites.map((s) => {
        const waiting = s.entity === 0, name = names[s.type] ?? `type ${s.type}`;
        const label = waiting ? `${name} · ${s.builder ? "Constructor on the way" : "waiting for a Constructor"}` : `${name} · building ${Math.round(s.progress * 100)}%`;
        return { id: s.id, team: s.team, own: s.team === team, t: s.type, name, point: s.point, x: s.x, z: s.z, progress: s.progress, waiting, entity: s.entity, builder: s.builder, label };
    });
}
/** Build fraction for drawing the structure rising from the ground (0 = not under construction). */
function riseFraction(progress) { return Math.min(0.999, Math.max(0.03, progress)); }
/** Feed lines for BUILD_STARTED / BUILD_DONE / BUILD_ENDED (flags = team; a site, b type, c point, d, v1 / v2 ore / gas). Own team only. */
function buildEventText(e, team, names, st) {
    if (e.flags !== team)
        return null;
    const name = names[e.b] ?? "building", at = st[e.c]?.name ?? `point ${e.c}`;
    const cost = (o, g) => `${o} ore${g ? ` · ${g} gas` : ""}`;
    if (e.kind === events_ts_1.EV.BUILD_STARTED)
        return { text: `BUILD STARTED · ${name} at ${at} · paid ${cost(e.v1, e.v2)}`, kind: "info" };
    if (e.kind === events_ts_1.EV.BUILD_DONE)
        return { text: `BUILD DONE · ${name} at ${at}`, kind: "good" };
    if (e.kind === events_ts_1.EV.BUILD_ENDED) {
        if (e.d === construction_ts_1.BE_CANCELLED)
            return { text: `BUILD CANCELLED · ${name} at ${at} · refunded ${cost(e.v1, e.v2)}`, kind: "info" };
        if (e.d === construction_ts_1.BE_DESTROYED)
            return { text: `SITE DESTROYED · ${name} at ${at} · no refund`, kind: "bad" };
        if (e.d === construction_ts_1.BE_POINT_LOST)
            return { text: `SITE LOST · ${at} changed hands · ${name} removed, no refund`, kind: "bad" };
        if (e.d === construction_ts_1.BE_DECAYED)
            return { text: `SITE DECAYED · ${name} at ${at} · no Constructor came · refunded ${cost(Math.round(e.v1), Math.round(e.v2))}`, kind: "warn" }; // C11 (ruling 69)
    }
    return null;
}
// ------------------------------------------------------------------ B2: placement mode (designer 15 Nov 18:38)
/** Rotation step of the placement ghost (R / wheel / Q E): 45 degrees. */
exports.PLACE_YAW_STEP = Math.PI / 4;
/** Steepest ground a building may stand on: rise across its footprint over its diameter, in degrees. */
exports.PLACE_MAX_SLOPE_DEG = 14;
/** How far (m) from the cursor an Extractor snaps onto a free geyser. */
exports.PLACE_GEYSER_SNAP_M = 60;
/** Snaps a yaw to the placement step (0 .. 2 pi). */
function snapYaw(yaw) {
    const s = Math.round(yaw / exports.PLACE_YAW_STEP) * exports.PLACE_YAW_STEP, tau = Math.PI * 2;
    return ((s % tau) + tau) % tau;
}
/** The default facing at a spot: towards the map centre (the sim's own default), snapped. */
function defaultPlaceYaw(x, z, mapSize) { return snapYaw(Math.atan2(mapSize / 2 - z, mapSize / 2 - x)); }
/**
 * Can `type` be placed at (x, z) now: the point that holds it (own, supplied, the right kind, a free slot or geyser),
 * a clear footprint (map edge, buildings and sites with the sim's spacing, units), buildable flat ground, tier,
 * resources and a Constructor. Mirrors the sim's place() checks plus slope and units (the client is the stricter).
 */
function placementCheck(c, w, type, x, z) {
    const t = c.typeIds.indexOf(type), d = bdef(c.data, type) ?? {};
    const geyserType = d.effects?.requiresGeyser === true;
    let geyser = -1;
    const bad = (reason, point = pointAt(c.statics, x, z)) => ({ x, z, point, ok: false, reason, geyser });
    if (t < 0)
        return bad("unknown building");
    const r = w.radius[t] ?? 5;
    if (geyserType) {
        // snap onto the nearest free geyser near the cursor
        let bd = exports.PLACE_GEYSER_SNAP_M;
        w.geysers.forEach((g, i) => {
            const dd = Math.hypot(g.x - x, g.z - z);
            if (dd >= bd)
                return;
            const taken = w.structures.some((s) => Math.hypot(s.x - g.x, s.z - g.z) <= g.radius && bdef(c.data, c.typeIds[s.t] ?? "")?.effects?.requiresGeyser === true);
            if (!taken) {
                bd = dd;
                geyser = i;
            }
        });
        if (geyser < 0)
            return bad("needs a free gas geyser: move it onto one");
        x = w.geysers[geyser].x;
        z = w.geysers[geyser].z;
    }
    const point = pointAt(c.statics, x, z);
    if (point < 0)
        return bad("outside your points: place it inside one", -1);
    const m = buildMenu(c, point), it = m.items.find((i) => i.type === type);
    if (m.blocked)
        return bad(m.blocked, point);
    if (!it)
        return bad(`not on a ${c.statics[point]?.type.replace(/-/g, " ") ?? "point"} like ${m.name}`, point);
    // footprint (the sim: inside the map, clear of every structure and site by spacingMetres; an Extractor only needs its geyser)
    if (!geyserType) {
        if (x - r < 0 || z - r < 0 || x + r > w.mapSize || z + r > w.mapSize)
            return bad("off the map edge", point);
        for (const s of w.structures)
            if (Math.hypot(s.x - x, s.z - z) < r + (w.radius[s.t] ?? 5) + w.spacing)
                return bad("too close to a building", point);
    }
    for (const u of w.units)
        if (Math.hypot(u.x - x, u.z - z) < r + u.r)
            return bad("units in the way", point);
    if (w.layerAt) {
        for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
            const ty = w.layerAt(x + ox * 0.8, z + oz * 0.8);
            if (ty === "lava")
                return bad("lava: cannot build here", point);
            if (ty && w.unbuildable?.has(ty))
                return bad(ty === "liquid" ? "water: cannot build here" : `${ty.replace(/-/g, " ")}: cannot build here`, point);
        }
    }
    if (!geyserType) {
        let lo = Infinity, hi = -Infinity;
        for (let k = 0; k <= 8; k++) {
            const a = (k * Math.PI) / 4, px = k === 8 ? x : x + Math.cos(a) * r, pz = k === 8 ? z : z + Math.sin(a) * r, h = w.height(px, pz);
            if (h < lo)
                lo = h;
            if (h > hi)
                hi = h;
        }
        if (Math.atan2(hi - lo, 2 * r) * 180 / Math.PI > exports.PLACE_MAX_SLOPE_DEG)
            return bad("ground too steep", point);
    }
    if (!it.ok)
        return bad(it.reason === "no Constructor" ? (m.constructorText ?? "No Constructor") : it.reason, point);
    return { x, z, point, ok: true, reason: "", geyser };
}
