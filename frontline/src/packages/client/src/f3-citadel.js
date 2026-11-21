"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seatName = void 0;
exports.commandSeatKinds = commandSeatKinds;
exports.shelterTarget = shelterTarget;
exports.shelterNotice = shelterNotice;
/** Kinds of command seat per type index: 1 always (effects.commandSeat: the Command Core), 2 a citadel's control node. */
function commandSeatKinds(data, typeIds) {
    const out = new Uint8Array(typeIds.length);
    const cn = data.points?.controlNode;
    for (const b of data.buildings) {
        const t = typeIds.indexOf(b.id);
        if (t < 0)
            continue;
        if (b.effects?.commandSeat === true)
            out[t] = 1;
        else if (cn?.citadelCommandSeat === true && cn.building === b.id)
            out[t] = 2;
    }
    return out;
}
/**
 * The command seat pilot (x, z) can go inside: the nearest own (team 0 in the view) finished structure of a command
 * seat kind whose wall is within `reach` m (the sim's crew.enterRangeMetres surface gap, a little slack), a control
 * node only inside a citadel site's area. null: none.
 */
function shelterTarget(list, x, z, kinds, radius, points, reach) {
    let best = null, bg = reach;
    for (const e of list) {
        const k = kinds[e.type];
        if (!k || e.team !== 0 || e.built === false)
            continue;
        if (k === 2 && !points.some((p) => p.type === "citadel-site" && Math.hypot(p.x - e.x, p.z - e.z) <= p.radius))
            continue;
        const gap = Math.hypot(e.x - x, e.z - z) - radius[e.type] * (e.scale ?? 1);
        if (gap <= bg) {
            bg = gap;
            best = e;
        }
    }
    return best;
}
/** The building's name in the prompt and notices: "Citadel" for a citadel's node, else its own name. */
const seatName = (kind, typeName) => (kind === 2 ? "Citadel" : typeName);
exports.seatName = seatName;
/** SHELTER event (kind 130: c 1 in, 2 out, 3 thrown out: destroyed, 4 thrown out: captured) as a notice for the own pilot. */
function shelterNotice(c, name) {
    const N = name.toUpperCase();
    if (c === 1)
        return { text: `INSIDE THE ${N} · command view · you cannot be hit here · F / Tab or LEAVE to come out`, kind: "good" };
    if (c === 2)
        return { text: `OUT OF THE ${N} · back on foot at the door`, kind: "info" };
    if (c === 3)
        return { text: `${N} DESTROYED · you were thrown out`, kind: "bad" };
    if (c === 4)
        return { text: `${N} CAPTURED BY THE ENEMY · you were thrown out`, kind: "bad" };
    return null;
}
