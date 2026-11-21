"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fortRise = exports.FJ_CUT_OFF = exports.FJ_ON_THE_WAY = exports.FJ_BUILDING = void 0;
exports.levelTitle = levelTitle;
exports.levelLabel = levelLabel;
exports.fortJobView = fortJobView;
exports.fortSpots = fortSpots;
/** economy2 FJ_* (the wire's stage). */
exports.FJ_BUILDING = 0, exports.FJ_ON_THE_WAY = 1, exports.FJ_CUT_OFF = 2;
/** "Level 2 · Fortified". */
function levelTitle(levels, L) {
    const d = levels.find((l) => l.level === L);
    return `Level ${L} · ${d?.name ?? "?"}`;
}
/** "Level 2 · Fortified: Bunker with HMG + autocannon ..." (what the level gives, in the data's plain words). */
function levelLabel(levels, L) {
    const d = levels.find((l) => l.level === L);
    return `${levelTitle(levels, L)}${d?.adds ? `: ${d.adds}` : ""}`;
}
/** The job as shown: "FORTIFYING → Level 2 · Fortified · 45%" and what is happening ("Constructor building · 25 s left"). */
function fortJobView(j, levels, dt, team) {
    const pct = Math.floor(j.progress * 100), secs = Math.ceil(j.ticksLeft * dt);
    const status = j.stage === exports.FJ_BUILDING ? `Constructor building · ${secs} s left`
        : j.stage === exports.FJ_CUT_OFF ? `paused: the point is cut off from supply · ${secs} s of work left`
            : `Constructor on the way · work starts when it reaches the point · ${secs} s of work`;
    return { point: j.point, own: j.team === team, level: j.level, progress: j.progress, pct, stage: j.stage, secondsLeft: secs,
        title: `FORTIFYING → ${levelTitle(levels, j.level)} · ${pct}%`, status, label: levelLabel(levels, j.level) };
}
/**
 * Where level L's new structures go at point p (the sim's strongpoints.ts layout before its nudge around standing
 * structures): walls `segs` segments across each approach at the area's edge, the bunker inside the ring, a minefield
 * outside the area toward the nearest link the owner does not hold, the node (level 3 armour) at the centre. Only what L adds over L - 1.
 */
function fortSpots(levels, L, p, all, wallRadius, segs, mineRadius, notOurs = () => true) {
    const cum = (k) => { let w = false, b = false, m = 0, a = false; for (const l of levels)
        if (l.level <= k) {
            if (l.barricadeWalls)
                w = true;
            if ((l.garrisonSlots ?? 0) > 0)
                b = true;
            m = Math.max(m, l.minefieldApproaches ?? 0);
            if (l.armouredControlNode)
                a = true;
        } return { w, b, m, a }; };
    const now = cum(L), before = cum(L - 1), out = [];
    const links = p.links.slice().sort((a, b) => a - b);
    if (now.w && !before.w) {
        const edge = Math.max(p.ring + wallRadius * 2, p.radius - wallRadius);
        for (const q of links) {
            const o = all[q];
            if (!o)
                continue;
            const dx = o.x - p.x, dz = o.z - p.z, l = Math.hypot(dx, dz);
            if (l < 1e-9)
                continue;
            const fx = dx / l, fz = dz / l;
            for (let k = 0; k < segs; k++) {
                const off = (k - (segs - 1) / 2) * wallRadius * 2;
                out.push({ kind: "wall", x: p.x + fx * edge - fz * off, z: p.z + fz * edge + fx * off, yaw: Math.atan2(fz, fx) });
            }
        }
    }
    if (now.b && !before.b) {
        const r = Math.min(p.ring * 0.6, p.radius * 0.3);
        out.push({ kind: "bunker", x: p.x - r, z: p.z + r, yaw: Math.atan2(p.z - (p.z + r), p.x - (p.x - r)) });
    }
    if (now.m > before.m && links.length) {
        const pool = links.some(notOurs) ? links.filter(notOurs) : links; // the sim's order: the nearest link the owner does not hold
        const near = pool.slice().sort((a, b) => Math.hypot(all[a].x - p.x, all[a].z - p.z) - Math.hypot(all[b].x - p.x, all[b].z - p.z))[0], o = all[near];
        const l = Math.hypot(o.x - p.x, o.z - p.z) || 1, dd = p.radius + mineRadius;
        out.push({ kind: "mines", x: p.x + ((o.x - p.x) / l) * dd, z: p.z + ((o.z - p.z) / l) * dd, yaw: 0 });
    }
    if (now.a && !before.a)
        out.push({ kind: "node", x: p.x, z: p.z, yaw: 0 });
    return out;
}
/** Height fraction a structure under fortification is drawn at: it rises with the work (a little stub from the start). */
const fortRise = (progress) => Math.min(0.999, Math.max(0.06, progress));
exports.fortRise = fortRise;
