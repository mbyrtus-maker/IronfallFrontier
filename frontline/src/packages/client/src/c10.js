"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.C10_SOUND = exports.C10_FX = void 0;
exports.sideChanges = sideChanges;
exports.domePoint = domePoint;
exports.dropPhase = dropPhase;
/** What each sidecar change or state shows (effect ids from fx-effects.ts EFFECTS). */
exports.C10_FX = {
    garrisonIn: ["hatch-puff"], // each soldier as it goes into the bunker
    garrisonOut: ["rollout-dust"], // each soldier as it comes out (dust and a team glow)
    dropFalling: ["beacon-beam"], // per frame at the drop spot while a reserve drop is in flight (brighter as it nears)
    dropLanded: ["pod-land"], // the reserve unit arrives
    recalled: ["respawn-glow"], // the unit lifts out to the reserve (team glow where it stood)
    manned: ["respawn-glow"], // a pilot takes the tower's gun (glow on the turret)
    unmanned: ["hatch-puff"],
    hacking: ["hack-sparks"], // per frame on the building while a hack is in progress
    hacked: ["emp-pulse"], // the building goes down
    disabled: ["emp-arcs"], // per frame while it is disabled
    restored: ["dome-up"], // back on (a ring and sparks)
    domeAbsorb: ["shield-hit"], // ripples on the dome while it absorbs (a few per second)
    noGas: ["emp-arcs"], // own energy-weapon units near the eye while the team has no gas (every 2 s)
};
/**
 * Sounds (sound-table.ts CUES) for the C10 kinds C9 left silent; the others already have theirs in main.ts's C9 glue
 * (cargo-in / out, pod-whistle, pod-land, deploy, seat, shield, hack-start / done, core-restored, error).
 * hacking and noGas are states: the page plays them at most every `every` ms near the eye.
 */
exports.C10_SOUND = {
    unmanned: { cue: "exit" }, // a pilot leaves a tower's gun
    hacking: { cue: "hack-tick", every: 900 }, // data chatter while a building hack runs
    noGas: { cue: "energy-dry", every: 2000 }, // the dry fizz of an energy gun with no gas
};
/**
 * The world-effect changes between two sidecars: garrison in / out (unit ids), drops landed (spots), recalls done (unit
 * ids), towers manned / left (tower ids), hacks disabled / restored (building ids). Positions are 0 where the page looks
 * the entity up. A recall or a drop that left the list early (more than 10 ticks to go) was cancelled: no effect.
 */
function sideChanges(a, b) {
    const out = [];
    if (!a)
        return out;
    const ga = new Set(a.garrison.flatMap((g) => g.ids)), gb = new Set(b.garrison.flatMap((g) => g.ids));
    for (const id of gb)
        if (!ga.has(id))
            out.push({ kind: "garrisonIn", id, x: 0, z: 0 });
    for (const id of ga)
        if (!gb.has(id))
            out.push({ kind: "garrisonOut", id, x: 0, z: 0 });
    const ra = a.reserve, rb = b.reserve;
    if (ra && rb) {
        for (const d of ra.drops)
            if (d.ticks <= 10 && !rb.drops.some((x) => x.x === d.x && x.z === d.z && x.type === d.type))
                out.push({ kind: "dropLanded", id: 0, x: d.x, z: d.z });
        for (const c of ra.recalls)
            if (c.ticks <= 10 && !rb.recalls.some((x) => x.id === c.id))
                out.push({ kind: "recalled", id: c.id, x: 0, z: 0 });
    }
    const ma = new Set(a.manned.map(([t]) => t)), mb = new Set(b.manned.map(([t]) => t));
    for (const t of mb)
        if (!ma.has(t))
            out.push({ kind: "manned", id: t, x: 0, z: 0 });
    for (const t of ma)
        if (!mb.has(t))
            out.push({ kind: "unmanned", id: t, x: 0, z: 0 });
    for (const h of b.hacks)
        if (h.until > 0 && !a.hacks.some((o) => o.id === h.id && o.until > 0))
            out.push({ kind: "hacked", id: h.id, x: 0, z: 0 });
    for (const o of a.hacks)
        if (o.until > 0 && !b.hacks.some((h) => h.id === o.id && h.until > 0))
            out.push({ kind: "restored", id: o.id, x: 0, z: 0 });
    return out;
}
/** A point on a dome (centre cx, ground gy, cz, radius r) for u, v in 0..1 (upper part of the hemisphere), with its outward normal. */
function domePoint(cx, gy, cz, r, u, v) {
    const az = u * Math.PI * 2, el = 0.15 + v * 1.2; // 9..78 degrees up: hits land on the shell, not at its foot or its top
    const nx = Math.cos(az) * Math.cos(el), ny = Math.sin(el), nz = Math.sin(az) * Math.cos(el);
    return { x: cx + nx * r, y: gy + ny * r, z: cz + nz * r, nx, ny, nz };
}
/** The reserve drop beam's strength: 0 when just called, 1 at the landing (ticks left of the whole drop time). */
function dropPhase(ticksLeft, dropS, dt) {
    const total = Math.max(1, dropS / dt);
    return Math.min(1, Math.max(0, 1 - ticksLeft / total));
}
