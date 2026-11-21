"use strict";
// Frontline: the opening cinematic (designer 19 Nov: "ironfall was going to have an opening cinematic", with the track
// "Heroes of the Liberty", 104 BPM, sections at about 12 / 23.5 / 34 / 42.5 / 54 s, the music ends at 61 s).
// In-engine over the real battlefield: the camera is scripted relative to the two Command Cores (P own, E enemy), so it
// fits any map. Pure functions of the cinematic time t (s, the music's clock): the camera, the captions, the letterbox
// and fades, and the scripted drops (pods raining onto the front, vehicle crates at midfield). main.js draws them.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CINE_END = exports.CINE_HANDOFF = exports.CINE_MUSIC_END = void 0;
exports.cineFrame = cineFrame;
exports.cinePods = cinePods;
exports.cineCrates = cineCrates;
exports.cineCaption = cineCaption;
exports.cineGeom = cineGeom;
/** The music's last bar (s); the camera starts handing over to the pilot here and is the pilot's at CINE_END. */
exports.CINE_MUSIC_END = 61.2;
exports.CINE_HANDOFF = 61.2;
exports.CINE_END = 62.8;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** Ease in and out (smootherstep). */
const ease = (x) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
/** The battlefield frame: P own core, E enemy core, u the unit axis P->E, v its left normal, D the distance. */
function cineGeom(P, E) {
    const dx = E.x - P.x, dz = E.z - P.z, D = Math.hypot(dx, dz) || 1, u = { x: dx / D, z: dz / D }, v = { x: -u.z, z: u.x };
    // a point a metres along the axis from P, b metres to the side
    const at = (a, b, from = P) => ({ x: from.x + u.x * a + v.x * b, z: from.z + u.z * a + v.z * b });
    return { P, E, u, v, D, at };
}
/** A camera key: a ground point plus a height above the terrain there. */
function key(g, pt, up, ground) { return [pt.x, ground(pt.x, pt.z) + up, pt.z]; }
function mix3(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
/**
 * The shots. Each: [start, end, (k, g, ground, body) => { eye, target, fov }] with k 0..1 across the shot. Cuts land on the
 * music's section changes.
 */
const SHOTS = [
    // 1. Halcyon from high up: the whole front, drifting down toward our side of the map
    [0, 12, (k, g, gr) => {
            const m = g.at(g.D * 0.5, 0), e0 = g.at(g.D * 0.5, -g.D * 0.42), e1 = g.at(g.D * 0.3, -g.D * 0.3);
            const eye = mix3([e0.x, gr(e0.x, e0.z) + 430, e0.z], [e1.x, gr(e1.x, e1.z) + 230, e1.z], ease(k));
            const t1 = g.at(g.D * 0.3, 0), target = mix3(key(g, m, 0, gr), key(g, t1, 0, gr), ease(k));
            return { eye, target, fov: 46 };
        }],
    // 2. The Hegemony: a slow arc around their Command Core, from our side of it
    [12, 23.5, (k, g, gr) => {
            const a = lerp(-0.7, 0.3, ease(k)), r = lerp(165, 115, ease(k)), back = { x: -g.u.x, z: -g.u.z };
            const dir = { x: back.x * Math.cos(a) - back.z * Math.sin(a), z: back.x * Math.sin(a) + back.z * Math.cos(a) };
            const ep = { x: g.E.x + dir.x * r, z: g.E.z + dir.z * r };
            return { eye: key(g, ep, lerp(48, 24, ease(k)), gr), target: key(g, g.at(-25, 0, g.E), 12, gr), fov: 46 };
        }],
    // 3. The company: low over our base, from the front in toward the Command Core
    [23.5, 33.8, (k, g, gr) => {
            const e0 = g.at(270, 95), e1 = g.at(105, 42), t0 = g.at(0, 0), t1 = g.at(-10, -25);
            const eye = mix3(key(g, e0, 30, gr), key(g, e1, 15, gr), ease(k));
            return { eye, target: mix3(key(g, t0, 12, gr), key(g, t1, 10, gr), ease(k)), fov: 50 };
        }],
    // 4. The drop: on the ground at the front, looking up into the falling pods, tilting down as they land
    [33.8, 42.5, (k, g, gr) => {
            const F = g.at(340, 0), cam = g.at(296, 22), drift = g.at(304, 18);
            const eye = mix3(key(g, cam, 3.2, gr), key(g, drift, 3.6, gr), k);
            const tu = key(g, g.at(20, -6, F), 120, gr), td = key(g, g.at(8, -3, F), 5, gr);
            return { eye, target: mix3(tu, td, ease(clamp01((k - 0.12) / 0.55))), fov: 56 };
        }],
    // 5a. Midfield: vehicle crates braking in on their thrusters, the camera rising beside them
    [42.5, 48.6, (k, g, gr) => {
            const K = g.at(g.D * 0.36, 0), e = g.at(-125, 75, K);
            return { eye: mix3(key(g, e, 22, gr), key(g, g.at(-95, 60, K), 46, gr), ease(k)), target: key(g, g.at(0, 0, K), lerp(30, 6, ease(k * 1.3)), gr), fov: 48 };
        }],
    // 5b. Past the crates, up and on toward the enemy: the valley to their Core
    [48.6, 54, (k, g, gr) => {
            const K = g.at(g.D * 0.36, 0), e0 = g.at(-60, 50, K), e1 = g.at(260, 20, K);
            return { eye: mix3(key(g, e0, 55, gr), key(g, e1, 150, gr), ease(k)), target: mix3(key(g, g.at(120, 0, K), 10, gr), key(g, g.E, 10, gr), ease(k)), fov: 50 };
        }],
    // 6. The title: an orbit round the player (on foot or in the Dart they start in) that ends on their own view
    [54, exports.CINE_END, (k, g, gr, body, fp) => {
            const B = body ?? g.at(17, 6), kk = ease(clamp01((54 + k * (exports.CINE_END - 54) - 54) / (exports.CINE_HANDOFF + 0.8 - 54)));
            const by = gr(B.x, B.z), ua = Math.atan2(g.u.z, g.u.x), a0 = ua + 0.55, r0 = 15, h0 = 4.2;
            let a1 = ua + Math.PI, r1 = 7, h1 = 3, t1 = key(g, g.at(60, 0, B), 3, gr);
            if (fp) {
                a1 = Math.atan2(fp.eye[2] - B.z, fp.eye[0] - B.x);
                r1 = Math.max(0.5, Math.hypot(fp.eye[0] - B.x, fp.eye[2] - B.z));
                h1 = fp.eye[1] - by;
                t1 = fp.target;
            }
            let da = a1 - a0; // round the left side: the long way if needed, never through the vehicle
            while (da < 0)
                da += Math.PI * 2;
            while (da > Math.PI * 2)
                da -= Math.PI * 2;
            const a = a0 + da * kk, r = lerp(r0, r1, kk), h = lerp(h0, h1, kk);
            const eye = [B.x + Math.cos(a) * r, by + h, B.z + Math.sin(a) * r];
            return { eye, target: mix3([B.x, by + 1.6, B.z], t1, ease(clamp01((kk - 0.35) / 0.65))), fov: lerp(40, fp ? fp.fov : 62, kk) };
        }],
];
/**
 * The camera at time t: { eye, target, fov, shot, handoff } (handoff 0..1: how far the view has gone over to the
 * pilot's own eyes, after CINE_HANDOFF). `ground(x, z)`: terrain height; `body`: the own pilot's position, if known.
 */
function cineFrame(t, P, E, ground, body, fp) {
    const g = cineGeom(P, E);
    let i = SHOTS.findIndex((s) => t < s[1]);
    if (i < 0)
        i = SHOTS.length - 1;
    const s = SHOTS[i], k = clamp01((t - s[0]) / (s[1] - s[0]));
    const c = s[2](k, g, ground, body, fp);
    return { ...c, shot: i, handoff: ease(clamp01((t - exports.CINE_HANDOFF) / (exports.CINE_END - exports.CINE_HANDOFF))) };
}
/** Pod landings in shot 4 (on the music's hits): time, and the spot as (along, side) from the drop zone. */
const POD_FALLS = [[35.0, 8, -18], [35.5, 60, 40], [36.0, 26, 10], [36.4, 80, -30], [36.85, -6, 4], [37.2, 52, -48], [37.6, 34, -22], [38.0, 95, 12],
    [38.4, 14, 22], [38.9, 70, 30], [39.6, -14, -24], [40.0, 110, -10], [40.5, 44, 4], [40.9, 88, 46], [41.5, 4, -6], [42.1, 64, -34]];
const POD_FALL_S = 5;
/** Pods of shot 4 at time t: { x, z, h (height above the ground), landed, landedFor (s) }. Falling 3.5 s from 360 m, braking at the end. */
function cinePods(t, P, E) {
    const g = cineGeom(P, E), F = g.at(340, 0), out = [];
    if (t < 31 || t > 48.6)
        return out;
    for (const [land, a, b] of POD_FALLS) {
        const secs = land - t;
        if (secs > POD_FALL_S)
            continue;
        const p = g.at(a, b, F), h = secs <= 0 ? 0 : 420 * Math.pow(secs / POD_FALL_S, 1.6);
        out.push({ x: p.x, z: p.z, h, landed: secs <= 0, landedFor: Math.max(0, -secs), land });
    }
    return out;
}
/** Vehicle crates of shot 5 (thrusters, walls falling away, a gunship inside): time of touchdown and side offset. */
const CRATE_FALLS = [[44.6, 10, -26], [46.0, -18, 30], [47.75, 34, 4]];
/** Crates at time t: { x, z, secs (s to touchdown, < 0 after), yaw, land }. */
function cineCrates(t, P, E) {
    const g = cineGeom(P, E), K = g.at(g.D * 0.36, 0), out = [];
    if (t < 41 || t > 54)
        return out;
    const yaw = Math.atan2(g.u.z, g.u.x);
    CRATE_FALLS.forEach(([land, a, b], i) => {
        const secs = land - t;
        if (secs > 3.5)
            return;
        const p = g.at(a, b, K);
        out.push({ x: p.x, z: p.z, secs, yaw: yaw + i * 0.35, land, i });
    });
    return out;
}
/** Captions on the music's hits: [from, to, big, small]. */
/** The opening caption per planet (planets.json: gravity, atmosphere, look): name, first line, second line. */
const PLANET_LINES = {
    halcyon: ["HALCYON", "World one of five · 1 g", "Ore in the ground. Gas in the vents. Ruins nobody built."],
    rust: ["RUST", "World two of five · 0.44 g", "Ochre under a pink sky. Thin air, dust storms. Shells fly far."],
    pale: ["PALE", "World three of five · 0.24 g · no air", "Grey on black. Sound barely carries. Nothing falls quickly."],
    brume: ["BRUME", "World four of five · 0.22 g", "A teal haze thick enough to swim in. Methane rain, gorges, fog."],
    cinder: ["CINDER", "World five of five · 1.5 g", "Black rock and lava. Ash on the wind. Every shell falls short."],
};
const CAPTIONS = [
    [3.3, 11.4, "@PLANET", "@L1"],
    [6.45, 11.4, "@PLANET", "@L2"],
    [15.0, 22.9, "THE HEGEMONY", "A machine army holds this world."],
    [18.15, 22.9, "THE HEGEMONY", "Its waves do not tire. They do not negotiate."],
    [24.4, 33.2, "IRONFALL DROP COMPANY", "Mercenaries on contract."],
    [27.5, 33.2, "IRONFALL DROP COMPANY", "Paid for every metre of ground we take back."],
    [33.75, 36.6, "DROP IN.", ""],
    [36.85, 38.2, "CLAIM GROUND.", ""],
    [38.4, 41.3, "MINE IT. BUILD ON IT.", ""],
    [41.5, 47.4, "PUSH THE FRONT.", ""],
    [47.75, 53.5, "BREAK THEIR LINE", "Take the points. Hold them. Reach their Command Core."],
];
/**
 * What the overlay shows at t: the caption (big, small, alpha), the title (alpha of IRONFALL, of FRONTLINE), the
 * letterbox (0..1) and the black fade (0..1).
 */
function cineCaption(t, planet = "halcyon") {
    let cap = null;
    const P = PLANET_LINES[planet] ?? PLANET_LINES.halcyon;
    const subst = (x) => x === "@PLANET" ? P[0] : x === "@L1" ? P[1] : x === "@L2" ? P[2] : x;
    for (const c of CAPTIONS)
        if (t >= c[0] && t < c[1])
            cap = [c[0], c[1], subst(c[2]), subst(c[3])];
    let capAlpha = 0;
    if (cap) {
        const first = CAPTIONS.find((c) => subst(c[2]) === cap[2]); // a new small line under the same big line does not re-fade the big one
        capAlpha = Math.min(clamp01((t - first[0]) / 0.5), clamp01((cap[1] - t) / 0.5));
    }
    const smallAlpha = cap ? Math.min(clamp01((t - cap[0]) / 0.6), capAlpha) : 0;
    const title = t < 54.1 ? 0 : Math.min(clamp01((t - 54.1) / 1.2), clamp01((exports.CINE_HANDOFF + 0.6 - t) / 0.8));
    const sub = t < 57.7 ? 0 : Math.min(clamp01((t - 57.7) / 0.9), clamp01((exports.CINE_HANDOFF + 0.6 - t) / 0.8));
    const letterbox = 1 - clamp01((t - exports.CINE_HANDOFF) / (exports.CINE_END - exports.CINE_HANDOFF));
    // fade up from black at the start; a short dip on the cuts that change place completely
    let black = 1 - clamp01((t - 0.8) / 1.8);
    for (const cut of [12, 23.5, 33.8, 42.5, 54])
        black = Math.max(black, 1 - clamp01(Math.abs(t - cut) / 0.18));
    return { big: cap ? cap[2] : "", small: cap ? cap[3] : "", capAlpha, smallAlpha, title, sub, letterbox, black };
}
