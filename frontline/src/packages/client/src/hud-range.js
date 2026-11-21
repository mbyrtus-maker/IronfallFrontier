"use strict";
// H1 (designer playtest 15 Nov: "too many things visible that are too far away"): distance culling and fade for the
// world-space HUD in the first-person / vehicle view. Every world tag, health bar and name tag belongs to one category;
// a category is fully shown up to `full` metres, fades (opacity and size) to `minAlpha` / `minScale` at `max` and is
// hidden beyond `max` (Infinity: never hidden, only faded). At most HUD_MAX_MARKERS tags are on screen at once: higher
// `prio` first, then the nearest. The command view is not affected. Tweak the numbers here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HUD_MAX_MARKERS = exports.HUD_BAR_RANGE = exports.HUD_RANGES = void 0;
exports.hudCat = hudCat;
exports.hudFade = hudFade;
exports.hudOverCap = hudOverCap;
exports.HUD_RANGES = {
    // unit labels: empty / no crew, fresh, cargo, battle-group, firing, last seen, radar contact ...
    unit: { full: 120, max: 200, minAlpha: 0.35, minScale: 0.8, prio: 1 },
    // building / resource labels: production, deposits and gas, sites, nodes, domes, power ...
    info: { full: 120, max: 220, minAlpha: 0.35, minScale: 0.8, prio: 0 },
    // things happening to you or near you that matter: hacks, jammed, decoys, charges, shelling
    alert: { full: 200, max: 400, minAlpha: 0.45, minScale: 0.8, prio: 2 },
    // squad and allies: names, downed squadmates, pilots inbound, own pilots on foot
    squad: { full: 250, max: Infinity, minAlpha: 0.5, minScale: 0.75, prio: 3 },
    // strategic points: near ones labelled, far ones only on the minimap
    point: { full: 300, max: 1200, minAlpha: 0.5, minScale: 0.75, prio: 3 },
    // objectives and orders: the enemy core, the ride, pings, beacons, rally, order markers
    objective: { full: 300, max: Infinity, minAlpha: 0.55, minScale: 0.75, prio: 4 },
    // far hostile diamonds (enemies too small to see)
    far: { full: 250, max: 600, minAlpha: 0.4, minScale: 0.8, prio: 0 },
};
/** Health / shield bars over units: only fairly close (the current target is always shown). */
exports.HUD_BAR_RANGE = { full: 120, max: 200, minAlpha: 0.4 };
/** Most tags on screen at once in first person. */
exports.HUD_MAX_MARKERS = 18;
/** The category of a world tag from its first CSS class. */
const CAT_OF = {
    empty: "unit", nocrew: "unit", walker: "unit", fresh: "unit", tptag: "unit", bgtag: "unit", firing: "unit", lastseen: "unit",
    swept: "unit", blip: "unit", grp: "unit", hold: "unit", hvidle: "unit", contact: "unit", ack: "unit", jamtag: "unit",
    prodtag: "info", coreoff: "alert", lowpow: "info", pad: "info", zone: "info",
    jammed: "alert", decoy: "alert", charge: "alert",
    down: "squad", podtag: "squad", pilotfoot: "squad", nameTag: "squad", pingTag: "objective",
    pt: "point", ecore: "objective", placeghost: "objective", ride: "objective", rally: "objective", beacon: "objective", bgmark: "objective",
    farfoe: "far",
};
function hudCat(cls) {
    const first = cls.split(" ", 1)[0];
    return CAT_OF[first] ?? "info";
}
/** Opacity and scale of a marker `dist` metres away, or null when it is culled. */
function hudFade(r, dist) {
    if (dist > r.max)
        return null;
    if (dist <= r.full)
        return { alpha: 1, scale: 1 };
    const span = Number.isFinite(r.max) ? r.max - r.full : r.full * 3; // Infinity: fade over 3x `full`, then hold
    const k = Math.min(1, (dist - r.full) / span);
    return { alpha: 1 - (1 - r.minAlpha) * k, scale: 1 - (1 - (r.minScale ?? 1)) * k };
}
/** Indices to hide so at most `cap` stay: ranked by prio (high first) then distance (near first). */
function hudOverCap(items, cap) {
    if (items.length <= cap)
        return [];
    const order = items.map((_, i) => i).sort((a, b) => items[b].prio - items[a].prio || items[a].dist - items[b].dist);
    return order.slice(cap);
}
