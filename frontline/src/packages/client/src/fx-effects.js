"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BAND_CRIT = exports.BAND_HIGH = exports.BAND_NORMAL = exports.BAND_AMBIENT = exports.EFFECTS = void 0;
// P2 effects pass: the emitters. Every effect the event table (fx-table.ts EVENT_FX / STATE_FX) names is a function
// here that spawns particles into a Particles pool (fx-particles.ts) or adds this frame's attached instances. No WebGL
// and no page state: positions, sizes, colours and surfaces come in the arguments, so Node tests call every one.
// Counts go through P.count (LOD by distance and budget pressure); bands: ambient 0, normal 1, important 2, critical 3.
const fx_particles_ts_1 = require("./fx-particles.js");
Object.defineProperty(exports, "BAND_AMBIENT", { enumerable: true, get: function () { return fx_particles_ts_1.BAND_AMBIENT; } });
Object.defineProperty(exports, "BAND_NORMAL", { enumerable: true, get: function () { return fx_particles_ts_1.BAND_NORMAL; } });
Object.defineProperty(exports, "BAND_HIGH", { enumerable: true, get: function () { return fx_particles_ts_1.BAND_HIGH; } });
Object.defineProperty(exports, "BAND_CRIT", { enumerable: true, get: function () { return fx_particles_ts_1.BAND_CRIT; } });
const fx_table_ts_1 = require("./fx-table.js");
const teamCol = (team = 0) => (team === 0 ? fx_table_ts_1.PAL.own : team === 1 ? fx_table_ts_1.PAL.enemy : fx_table_ts_1.PAL.neutral);
const energyCol = (team = 0) => (team === 0 ? fx_table_ts_1.PAL.energyOwn : fx_table_ts_1.PAL.energyEnemy);
const gy = (a) => a.ground ?? a.y;
function bandOf(P, a, base = fx_particles_ts_1.BAND_NORMAL, nearM = 60) { return a.band ?? (a.own ? fx_particles_ts_1.BAND_CRIT : P.dist(a.x, a.y, a.z) < nearM ? Math.max(base, fx_particles_ts_1.BAND_HIGH) : base); }
/** n soft puffs around (x, y, z): smoke, dust, steam. */
function puffs(P, n, a, o) {
    for (let i = 0; i < n; i++) {
        const ang = P.r() * Math.PI * 2, rr = Math.sqrt(P.r()) * o.spread, out = (o.out ?? 0) * (0.6 + 0.4 * P.r());
        P.add({ x: a.x + Math.cos(ang) * rr, y: a.y + (o.yOff ?? 0) + P.r() * o.spread * 0.3, z: a.z + Math.sin(ang) * rr,
            vx: Math.cos(ang) * out + P.s() * 0.4, vy: o.up * (0.6 + 0.6 * P.r()), vz: Math.sin(ang) * out + P.s() * 0.4,
            s0: o.s0 * (0.8 + 0.4 * P.r()), s1: o.s1 * (0.8 + 0.4 * P.r()), life: o.life * (0.75 + 0.5 * P.r()), delay: (o.delay ?? 0) * P.r(),
            c0: o.c0, c1: o.c1, a: o.al, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: o.band, drag: o.drag ?? 1.2, grav: o.grav ?? -0.3, far: o.far, fin: o.fin ?? 0.12, fpow: o.fpow ?? 0.8 });
    }
}
/** n spark streaks flying out (additive, gravity, stretched along the velocity). */
function sparks(P, n, a, o) {
    for (let i = 0; i < n; i++) {
        let vx = P.s(), vy = P.s() * 0.6 + (o.up ?? 0.5), vz = P.s();
        if (o.dir) {
            const c = o.cone ?? 0.6;
            vx = o.dir[0] + P.s() * c;
            vy = o.dir[1] + P.s() * c + (o.up ?? 0);
            vz = o.dir[2] + P.s() * c;
        }
        const l = Math.hypot(vx, vy, vz) || 1, sp = o.speed * (0.5 + 0.7 * P.r());
        P.add({ x: a.x, y: a.y, z: a.z, vx: (vx / l) * sp, vy: (vy / l) * sp, vz: (vz / l) * sp, s0: o.size, s1: o.size * 0.5, life: o.life * (0.6 + 0.6 * P.r()),
            c0: o.c0, c1: o.c1 ?? fx_table_ts_1.PAL.ember, a: 1, shape: fx_particles_ts_1.SH.spark, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band: o.band, grav: o.grav ?? 12, drag: 1.5, stretch: o.stretch ?? 0.035, far: o.far ?? 500, fpow: 1.3 });
    }
}
/** n hard chunks (debris, dirt clods, casings) thrown up, bouncing on the ground. */
function chunks(P, n, a, o) {
    for (let i = 0; i < n; i++) {
        const ang = P.r() * Math.PI * 2, h = o.speed * (0.3 + 0.7 * P.r());
        P.add({ x: a.x, y: a.y + 0.2, z: a.z, vx: Math.cos(ang) * h, vy: o.up * (0.5 + 0.8 * P.r()), vz: Math.sin(ang) * h, s0: o.size * (0.6 + 0.8 * P.r()), life: o.life * (0.7 + 0.6 * P.r()),
            c0: o.hot ? fx_table_ts_1.PAL.debrisHot : o.c, c1: o.c, a: 1, shape: fx_particles_ts_1.SH.chunk, pass: fx_particles_ts_1.PASS_ALPHA, band: o.band, grav: 14, drag: 0.3, floor: gy(a) + 0.1, far: o.far ?? 350, fpow: 0.25 });
    }
}
function glow(P, a, s, life, c0, c1, al, band, shape = fx_particles_ts_1.SH.glow, noNear = false, far) {
    P.add({ x: a.x, y: a.y, z: a.z, s0: s, s1: s * 1.25, life, c0, c1, a: al * P.flashK, shape, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 2, noNear, far, seed: P.r() });
}
/** A ground decal (flat on the terrain normal, here up): scorch, shockwave, ring, ripple. */
function decal(P, a, shape, s0, s1, life, c, al, fpow = 1, band = fx_particles_ts_1.BAND_NORMAL) {
    P.add({ x: a.x, y: gy(a) + 0.05, z: a.z, ax: 0, ay: 1, az: 0, len: P.r() * 6.28, s0, s1, life, c0: c, a: al, shape, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_DECAL, band, fpow });
}
function surfaceOf(a) { return fx_table_ts_1.SURFACE_FX[a.surface ?? "dirt"] ?? fx_table_ts_1.SURFACE_FX.dirt; }
// ------------------------------------------------------------------ weapons
/** Muzzle flash sized to the weapon (a.family): a star or round glow, a little smoke, sparks forward. */
function muzzle(P, a) {
    const W = fx_table_ts_1.WEAPON_FX[a.family ?? "kinetic-medium"] ?? fx_table_ts_1.WEAPON_FX["kinetic-medium"];
    if (W.muzzle <= 0)
        return;
    const s = W.muzzle * (a.k ?? 1), band = bandOf(P, a), col = W.tracer === "bolt" || W.tracer === "beam" ? energyCol(a.team) : fx_table_ts_1.PAL.flash;
    const d = [a.dx ?? 0, a.dy ?? 0, a.dz ?? 0];
    if (W.star > 0)
        glow(P, { ...a, x: a.x + d[0] * s * 0.5, y: a.y + d[1] * s * 0.5, z: a.z + d[2] * s * 0.5 }, s, 0.06, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.fire, 1, band, fx_particles_ts_1.SH.star, a.own);
    glow(P, a, s * 0.8, 0.09, col, fx_table_ts_1.PAL.ember, 0.8, band, fx_particles_ts_1.SH.glow, a.own);
    if (W.smoke > 0 && P.dist(a.x, a.y, a.z) < 300)
        puffs(P, P.count(W.smoke, a.x, a.y, a.z, 300, fx_particles_ts_1.BAND_NORMAL), { ...a, x: a.x + d[0] * s, y: a.y + d[1] * s, z: a.z + d[2] * s }, { spread: s * 0.4, up: 0.8, out: 1.2, s0: s * 0.35, s1: s * 1.4, life: 0.9, c0: fx_table_ts_1.PAL.smokeLight, c1: fx_table_ts_1.PAL.smoke, al: 0.28, band: fx_particles_ts_1.BAND_NORMAL, drag: 2.5 });
    if (W.star >= 6 && P.dist(a.x, a.y, a.z) < 200)
        sparks(P, P.count(3, a.x, a.y, a.z, 200), a, { speed: 30, life: 0.15, size: 0.05, c0: fx_table_ts_1.PAL.sparkHot, band, dir: d, cone: 0.25, grav: 4 });
}
/** A spent casing ejected to the side (near only: within 35 m). */
function casing(P, a) {
    if (P.dist(a.x, a.y, a.z) > 35)
        return;
    const sx = -(a.dz ?? 0), sz = a.dx ?? 1;
    P.add({ x: a.x, y: a.y, z: a.z, vx: sx * 3 + P.s(), vy: 2.5 + P.r() * 1.5, vz: sz * 3 + P.s(), s0: 0.035, life: 0.9, c0: fx_table_ts_1.PAL.brass, a: 1, shape: fx_particles_ts_1.SH.chunk, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, grav: 12, floor: gy(a) + 0.03, far: 35, fpow: 0.3 });
}
/** A tracer by class (from the muzzle to x1..z1): a hot streak flying at the tracer speed, sized by the weapon. */
function tracer(P, a) {
    const W = fx_table_ts_1.WEAPON_FX[a.family ?? "kinetic-medium"] ?? fx_table_ts_1.WEAPON_FX["kinetic-medium"], speed = 1100;
    const dx = (a.x1 ?? a.x) - a.x, dy = (a.y1 ?? a.y) - a.y, dz = (a.z1 ?? a.z) - a.z, L = Math.hypot(dx, dy, dz);
    if (L < 2)
        return;
    const ux = dx / L, uy = dy / L, uz = dz / L, band = a.own ? fx_particles_ts_1.BAND_HIGH : fx_particles_ts_1.BAND_NORMAL;
    const one = (w, c, al, stretch, off = 0, spread = 0) => P.add({ x: a.x + ux * off, y: a.y + uy * off, z: a.z + uz * off,
        vx: ux * speed + P.s() * spread, vy: uy * speed + P.s() * spread, vz: uz * speed + P.s() * spread, s0: w, life: Math.max(0.02, (L - off) / speed), c0: c, a: al, shape: fx_particles_ts_1.SH.streak, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band, stretch, fpow: 0, far: 1200 });
    switch (W.tracer) {
        case "streak":
            one(0.06, fx_table_ts_1.PAL.spark, 0.55, 0.008);
            break;
        case "heavy":
            one(0.12 + W.glow * 0.1, fx_table_ts_1.PAL.sparkHot, 0.8, 0.012);
            break;
        case "autocannon":
            one(0.16, fx_table_ts_1.PAL.metal, 0.9, 0.01);
            one(0.35, fx_table_ts_1.PAL.fire, 0.25, 0.006);
            break;
        case "bolt": {
            const g = W.glow / 0.8;
            one(0.22 * g, g > 1.2 ? fx_table_ts_1.PAL.white : energyCol(a.team), 1, 0.009);
            one(0.6 * g, energyCol(a.team), 0.4, 0.007);
            break;
        } // V1: the rapid laser's bolts by glow
        case "pellets":
            for (let i = 0; i < 5; i++)
                one(0.05, fx_table_ts_1.PAL.spark, 0.5, 0.006, 0, 40);
            break;
        case "beam":
            beam(P, a);
            break;
        default: break;
    }
}
/** An energy beam from (x, y, z) to (x1, y1, z1): a bright core held briefly, a wider glow, a hot spot at the end. */
function beam(P, a) {
    const W = fx_table_ts_1.WEAPON_FX[a.family ?? "beam"] ?? fx_table_ts_1.WEAPON_FX.beam;
    const x1 = a.x1 ?? a.x, y1 = a.y1 ?? a.y, z1 = a.z1 ?? a.z, dx = x1 - a.x, dy = y1 - a.y, dz = z1 - a.z, L = Math.hypot(dx, dy, dz);
    if (L < 0.5)
        return;
    const c = energyCol(a.team), w = W.beamW ?? 0.3, band = a.own ? fx_particles_ts_1.BAND_CRIT : fx_particles_ts_1.BAND_NORMAL, ag = W.afterglow ?? 0;
    P.add({ x: x1, y: y1, z: z1, ax: dx / L, ay: dy / L, az: dz / L, len: L, s0: w, s1: w * 0.4, life: 0.16 + ag * 0.3, c0: fx_table_ts_1.PAL.white, c1: c, a: 1, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 1.5, far: 1200 });
    P.add({ x: x1, y: y1, z: z1, ax: dx / L, ay: dy / L, az: dz / L, len: L, s0: w * 3, s1: w * 4, life: 0.22 + ag * 0.5, c0: c, a: 0.35, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 2, far: 1200 });
    if (ag > 0)
        P.add({ x: x1, y: y1, z: z1, ax: dx / L, ay: dy / L, az: dz / L, len: L, s0: w * 0.6, s1: w * 1.8, life: ag, c0: c, c1: fx_table_ts_1.PAL.ember, a: 0.5, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 0.7, far: 1200 }); // F2: afterglow
    glow(P, { ...a, x: x1, y: y1, z: z1 }, w * 4, 0.18 + ag * 0.4, fx_table_ts_1.PAL.white, c, 0.8, band);
    if ((W.scorch ?? 0) > 0 && a.ground !== undefined && y1 - a.ground < 1.5) { // F2: the cannon scorches the ground it hits, with a wisp of smoke
        decal(P, { ...a, x: x1, y: y1, z: z1 }, fx_particles_ts_1.SH.scorch, W.scorch, W.scorch * 1.2, 20, fx_table_ts_1.PAL.scorch, 0.75, 0.45, band);
        puffs(P, P.count(3, x1, y1, z1, 400, band), { ...a, x: x1, y: y1, z: z1 }, { spread: 0.4, up: 1.2, s0: 0.3, s1: 1.4, life: 1.6, c0: fx_table_ts_1.PAL.smokeDark, c1: fx_table_ts_1.PAL.smoke, al: 0.4, band, far: 400 });
    }
}
/** Per-frame decorations of a projectile in flight (the glue calls these with the drawn head position). */
function rocketTrail(P, a) {
    const W = fx_table_ts_1.WEAPON_FX[a.family ?? "rocket"] ?? fx_table_ts_1.WEAPON_FX.rocket;
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, W.glow * (0.8 + 0.3 * P.r()), fx_table_ts_1.PAL.rocketFlame, 0.9, fx_particles_ts_1.SH.glow);
    P.once(fx_particles_ts_1.PASS_ADD, a.x - (a.dx ?? 0) * 0.6, a.y - (a.dy ?? 0) * 0.6, a.z - (a.dz ?? 0) * 0.6, W.glow * 0.5, fx_table_ts_1.PAL.rocketFlame, 0.9, fx_particles_ts_1.SH.flame, fx_particles_ts_1.GEOM_STREAK, -(a.dx ?? 0), -(a.dy ?? 0), -(a.dz ?? 0), W.glow * 2.2, P.r());
    if (P.count(1, a.x, a.y, a.z, 700, fx_particles_ts_1.BAND_NORMAL) > 0)
        P.add({ x: a.x, y: a.y, z: a.z, vx: P.s() * 0.5, vy: 0.4 + P.r() * 0.4, vz: P.s() * 0.5, s0: W.trail * 0.35, s1: W.trail * 1.8, life: 1.6 + P.r(), c0: fx_table_ts_1.PAL.smokeLight, c1: fx_table_ts_1.PAL.smoke, a: 0.42, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_NORMAL, drag: 1.5, grav: -0.2, fin: 0.05, fpow: 0.8, far: 700 });
}
/** Mortar / artillery shell: a hot glow and a faint arc left behind (one fading glow every few metres). */
function shellGlow(P, a) {
    const W = fx_table_ts_1.WEAPON_FX[a.family ?? "mortar"] ?? fx_table_ts_1.WEAPON_FX.mortar;
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, W.glow, fx_table_ts_1.PAL.shell, 0.9, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 1500);
    if ((a.n ?? 1) > 0)
        P.add({ x: a.x, y: a.y, z: a.z, s0: W.glow * 0.45, s1: W.glow * 0.2, life: 0.9, c0: fx_table_ts_1.PAL.shell, c1: fx_table_ts_1.PAL.ember, a: 0.45, shape: fx_particles_ts_1.SH.glow, pass: fx_particles_ts_1.PASS_ADD, band: fx_particles_ts_1.BAND_NORMAL, far: 1500, fpow: 1.2 });
    if (W.trail > 0 && (a.n ?? 1) > 0 && P.count(1, a.x, a.y, a.z, 500) > 0)
        P.add({ x: a.x, y: a.y, z: a.z, s0: W.trail, s1: W.trail * 3, life: 1.4, c0: fx_table_ts_1.PAL.smokeLight, a: 0.18, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, drag: 1, far: 500 });
}
/** Energy bolt in flight (projectile energy weapons): a glow around the head. */
function boltGlow(P, a) { P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, (a.k ?? 0.6), energyCol(a.team), 0.7, fx_particles_ts_1.SH.glow); }
/** Flak airburst: a black puff, a flash, a ring of fragments. */
function flakBurst(P, a) {
    const s = (fx_table_ts_1.WEAPON_FX[a.family ?? "flak"]?.burst ?? 3) * (a.k ?? 1), band = bandOf(P, a);
    glow(P, a, s * 0.8, 0.1, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.fire, 1, band, fx_particles_ts_1.SH.star);
    glow(P, a, s * 0.6, 0.25, fx_table_ts_1.PAL.fireHot, fx_table_ts_1.PAL.ember, 0.6, band);
    puffs(P, P.count(4, a.x, a.y, a.z, 1200, band), a, { spread: s * 0.4, up: 0.3, out: s * 0.6, s0: s * 0.4, s1: s * 1.1, life: 2.6, c0: fx_table_ts_1.PAL.smokeBlack, c1: fx_table_ts_1.PAL.flak, al: 0.7, band, grav: 0, drag: 2, far: 1200 });
    sparks(P, P.count(8, a.x, a.y, a.z, 600, band), a, { speed: 40, up: 0, life: 0.35, size: 0.06, c0: fx_table_ts_1.PAL.sparkHot, band, grav: 6 });
}
// ------------------------------------------------------------------ impacts
function impactMetal(P, a) {
    const k = a.k ?? 1, band = bandOf(P, a);
    glow(P, a, 0.6 * k, 0.07, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.metal, 1, band, fx_particles_ts_1.SH.star);
    sparks(P, P.count(Math.round(6 * k) + 2, a.x, a.y, a.z, 500, band), a, { speed: 14 * Math.sqrt(k), up: 0.6, life: 0.5, size: 0.045, c0: fx_table_ts_1.PAL.sparkHot, c1: fx_table_ts_1.PAL.metal, band, dir: a.dx !== undefined ? [a.dx, a.dy ?? 0, a.dz ?? 0] : undefined, cone: 1.1 });
    puffs(P, P.count(1, a.x, a.y, a.z, 400, band), a, { spread: 0.3 * k, up: 0.8, s0: 0.3 * k, s1: 1.1 * k, life: 0.9, c0: fx_table_ts_1.PAL.smokeDark, c1: fx_table_ts_1.PAL.smoke, al: 0.35, band });
}
/** Shield ripple at the hit point, flat on the shield surface (normal = from the shield's centre to the hit). */
function shieldHit(P, a) {
    const c = a.col ?? fx_table_ts_1.PAL.shield, k = a.k ?? 1, band = bandOf(P, a);
    const nx = a.dx ?? 0, ny = a.dy ?? 1, nz = a.dz ?? 0;
    P.add({ x: a.x, y: a.y, z: a.z, ax: nx, ay: ny, az: nz, len: P.r() * 6.28, s0: 0.6 * k, s1: 1.5 * k, life: 0.4, c0: c, c1: c, a: 0.75, shape: fx_particles_ts_1.SH.ripple, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 1.2 });
    glow(P, a, 0.5 * k, 0.12, fx_table_ts_1.PAL.white, c, 0.7, band);
}
function shieldBreak(P, a) {
    const r = a.r ?? 3, band = bandOf(P, a, fx_particles_ts_1.BAND_HIGH);
    glow(P, a, r * 1.2, 0.2, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.shieldBreak, 0.8, band, fx_particles_ts_1.SH.glow);
    P.add({ x: a.x, y: a.y, z: a.z, s0: r * 0.7, s1: r * 1.5, life: 0.35, c0: fx_table_ts_1.PAL.shield, c1: fx_table_ts_1.PAL.shieldBreak, a: 0.6, shape: fx_particles_ts_1.SH.ring, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 1 });
    sparks(P, P.count(16, a.x, a.y, a.z, 600, band), a, { speed: 12, up: 0.2, life: 0.6, size: 0.07, c0: fx_table_ts_1.PAL.shield, c1: fx_table_ts_1.PAL.shieldBreak, band, grav: 3 });
}
/** Ground hit: dust in the surface's colour, clods or chips, a faint flash; liquids splash, lava spits embers. */
function impactDust(P, a) {
    const S = surfaceOf(a), k = a.k ?? 1, band = bandOf(P, a);
    if (S.splash)
        return impactSplash(P, a);
    glow(P, a, 0.4 * k, 0.06, fx_table_ts_1.PAL.flash, fx_table_ts_1.PAL.fire, 0.5, band);
    puffs(P, P.count(Math.round(2 * k) + 1, a.x, a.y, a.z, 600, band), a, { spread: 0.4 * k, up: 1.6 * k, out: 0.8, s0: 0.35 * k, s1: 1.5 * k, life: 1.4, c0: S.dust, c1: S.dust, al: 0.5, band, grav: S.heavy ? 0.4 : -0.1, drag: 1.8, far: 600 });
    chunks(P, P.count(Math.round(3 * k), a.x, a.y, a.z, 150, band), a, { speed: 3 * k, up: 5 * Math.sqrt(k), size: S.chips ? 0.05 : 0.07, life: 0.9, c: S.chips ? S.dust : fx_table_ts_1.PAL.debris, band, far: 150 });
    if (S.chips && P.dist(a.x, a.y, a.z) < 200)
        sparks(P, P.count(3, a.x, a.y, a.z, 200, band), a, { speed: 10, up: 0.8, life: 0.25, size: 0.04, c0: fx_table_ts_1.PAL.sparkHot, band });
}
function impactSplash(P, a) {
    const S = surfaceOf(a), k = a.k ?? 1, band = bandOf(P, a);
    const lava = !!S.glow;
    for (let i = 0, n = P.count(Math.round(8 * k), a.x, a.y, a.z, 400, band); i < n; i++) {
        const ang = P.r() * Math.PI * 2, h = 1.5 + P.r() * 2.5 * k;
        P.add({ x: a.x, y: gy(a) + 0.1, z: a.z, vx: Math.cos(ang) * h * 0.5, vy: 4 + P.r() * 5 * Math.sqrt(k), vz: Math.sin(ang) * h * 0.5, s0: 0.07 + 0.05 * k, s1: 0.04, life: 0.9,
            c0: lava ? fx_table_ts_1.PAL.fireHot : fx_table_ts_1.PAL.steam, c1: lava ? fx_table_ts_1.PAL.ember : S.dust, a: lava ? 1 : 0.6, shape: fx_particles_ts_1.SH.streak, geom: fx_particles_ts_1.GEOM_STREAK, pass: lava ? fx_particles_ts_1.PASS_ADD : fx_particles_ts_1.PASS_ALPHA, band, grav: 12, stretch: 0.05, floor: gy(a), far: 400 });
    }
    decal(P, a, fx_particles_ts_1.SH.ring, 0.4 * k, 2.4 * k, 0.8, lava ? fx_table_ts_1.PAL.fire : fx_table_ts_1.PAL.steam, 0.6, 1.2, band);
    if (lava)
        glow(P, a, 1.2 * k, 0.4, fx_table_ts_1.PAL.fireHot, fx_table_ts_1.PAL.ember, 0.7, band);
    else
        puffs(P, P.count(1, a.x, a.y, a.z, 300, band), a, { spread: 0.3, up: 1.2, s0: 0.4 * k, s1: 1.4 * k, life: 0.9, c0: fx_table_ts_1.PAL.steam, al: 0.3, band });
}
/** A ricochet: one hot spark glancing off along the reflected direction. */
function ricochet(P, a) {
    const dx = a.dx ?? P.s(), dz = a.dz ?? P.s();
    P.add({ x: a.x, y: a.y, z: a.z, vx: dx * 60 + P.s() * 10, vy: 8 + P.r() * 14, vz: dz * 60 + P.s() * 10, s0: 0.05, life: 0.25, c0: fx_table_ts_1.PAL.sparkHot, c1: fx_table_ts_1.PAL.spark, a: 1, shape: fx_particles_ts_1.SH.spark, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band: fx_particles_ts_1.BAND_NORMAL, grav: 8, stretch: 0.02, far: 300 });
}
// ------------------------------------------------------------------ explosions
/**
 * Explosion of size k (m; 1.4 infantry pop, 2.5 bike, 4 vehicle, 7 siege, 9 structure, call strikes larger): a flash,
 * a fireball, a smoke column, debris chunks and hot fragments, a ground shockwave ring and a scorch decal that fades
 * (on the ground only; a.air: in the air, no ring or scorch).
 */
function explosion(P, a) {
    const s = Math.max(0.8, a.k ?? 4), band = bandOf(P, a, fx_particles_ts_1.BAND_NORMAL, 90), far = 1400 + s * 60;
    const big = s >= 6, small = s < 2.5;
    glow(P, { ...a, y: a.y + s * 0.3 }, s * 1.5, 0.14 + s * 0.008, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.fireHot, 1, band, fx_particles_ts_1.SH.star, false, far);
    glow(P, { ...a, y: a.y + s * 0.3 }, s * 2.2, 0.3, fx_table_ts_1.PAL.fireHot, fx_table_ts_1.PAL.fireDeep, 0.45, band, fx_particles_ts_1.SH.glow, false, far);
    // fireball: rising flame puffs
    for (let i = 0, n = P.count(small ? 2 : big ? 7 : 4, a.x, a.y, a.z, far, band); i < n; i++) {
        P.add({ x: a.x + P.s() * s * 0.35, y: a.y + s * (0.2 + 0.3 * P.r()), z: a.z + P.s() * s * 0.35, vx: P.s() * s * 0.5, vy: s * (0.5 + 0.5 * P.r()), vz: P.s() * s * 0.5,
            s0: s * 0.45, s1: s * (0.9 + 0.3 * P.r()), life: 0.45 + 0.25 * P.r() + s * 0.02, delay: P.r() * 0.08, c0: fx_table_ts_1.PAL.fireHot, c1: fx_table_ts_1.PAL.fireDeep, a: 0.95, shape: fx_particles_ts_1.SH.flame, pass: fx_particles_ts_1.PASS_ADD, band, drag: 2.5, fpow: 1.4, far });
    }
    // smoke column: dark at the base, lighter as it rises and spreads
    puffs(P, P.count(small ? 2 : big ? 10 : 5, a.x, a.y, a.z, far, band), a, { spread: s * 0.45, up: 1.4 + s * 0.45, out: s * 0.15, s0: s * 0.45, s1: s * (1.6 + (big ? 0.8 : 0.3)), life: small ? 2 : big ? 6.5 : 4,
        c0: fx_table_ts_1.PAL.smokeDark, c1: fx_table_ts_1.PAL.smokeLight, al: 0.48, band, delay: 0.5, drag: 0.6, grav: -0.35, yOff: s * 0.3, far, fin: 0.2, fpow: 0.8 });
    // debris
    if (P.dist(a.x, a.y, a.z) < 450) {
        chunks(P, P.count(small ? 2 : big ? 10 : 6, a.x, a.y, a.z, 450, band), a, { speed: s * 2.2, up: 5 + s * 1.6, size: 0.12 + s * 0.04, life: 2.4, c: fx_table_ts_1.PAL.debris, band, far: 450, hot: true });
        sparks(P, P.count(small ? 3 : big ? 12 : 7, a.x, a.y, a.z, 450, band), { ...a, y: a.y + s * 0.3 }, { speed: 9 + s * 3.5, up: 0.7, life: 0.9 + s * 0.05, size: 0.08 + s * 0.012, c0: fx_table_ts_1.PAL.fireHot, c1: fx_table_ts_1.PAL.ember, band, grav: 9.8, far: 450, stretch: 0.05 });
    }
    if (!a.air) {
        decal(P, a, fx_particles_ts_1.SH.shock, s * 0.4, s * (big ? 4.5 : 3.2), 0.45 + s * 0.02, fx_table_ts_1.PAL.flash, 0.6 * P.flashK + 0.2, 1, band);
        decal(P, a, fx_particles_ts_1.SH.scorch, s * 0.9, s * 1.15, 20 + s * 2.5, fx_table_ts_1.PAL.scorch, 0.85, 0.45, band);
        // a ring of ground dust thrown out
        if (!small)
            puffs(P, P.count(big ? 8 : 5, a.x, a.y, a.z, 700, band), a, { spread: s * 0.3, up: 0.4, out: s * 1.4, s0: s * 0.3, s1: s * 1.1, life: 2.2, c0: fx_table_ts_1.PAL.dust, c1: fx_table_ts_1.PAL.smokeLight, al: 0.38, band, drag: 1.8, grav: -0.05, far: 700 });
    }
}
/** A building coming down: a wide low dust cloud rolling out, chunks, a smoke column, a dull flash. */
function collapse(P, a) {
    const s = Math.max(4, a.k ?? 9), band = bandOf(P, a, fx_particles_ts_1.BAND_NORMAL, 120);
    glow(P, { ...a, y: a.y + s * 0.4 }, s, 0.35, fx_table_ts_1.PAL.fireHot, fx_table_ts_1.PAL.fireDeep, 0.5, band);
    puffs(P, P.count(14, a.x, a.y, a.z, 1500, band), a, { spread: s * 0.6, up: 0.6, out: s * 0.9, s0: s * 0.5, s1: s * 1.6, life: 6, c0: fx_table_ts_1.PAL.dust, c1: fx_table_ts_1.PAL.smokeLight, al: 0.55, band, delay: 0.8, drag: 0.9, grav: -0.08, far: 1500 });
    puffs(P, P.count(6, a.x, a.y, a.z, 1500, band), a, { spread: s * 0.4, up: 2.5, s0: s * 0.6, s1: s * 2.2, life: 8, c0: fx_table_ts_1.PAL.smokeDark, c1: fx_table_ts_1.PAL.smoke, al: 0.5, band, delay: 1.2, drag: 0.5, grav: -0.3, yOff: s * 0.4, far: 1500 });
    chunks(P, P.count(12, a.x, a.y, a.z, 500, band), a, { speed: s * 0.8, up: s * 1.2, size: 0.25 + s * 0.03, life: 2.6, c: fx_table_ts_1.PAL.debris, band, far: 500 });
    decal(P, a, fx_particles_ts_1.SH.scorch, s * 1.3, s * 1.5, 40, fx_table_ts_1.PAL.scorch, 0.7, 0.45, band);
}
/** A wreck burning (per frame, attached): flame tongues and a smoke plume; f = strength 0..1 (dies down over time). */
function wreckFire(P, a) {
    const f = a.f ?? 1, s = (a.k ?? 2) * (0.5 + 0.5 * f);
    if (f > 0.25)
        for (let i = 0; i < 2; i++)
            P.once(fx_particles_ts_1.PASS_ADD, a.x + P.s() * s * 0.4, a.y + s * 0.35, a.z + P.s() * s * 0.4, s * (0.35 + 0.15 * P.r()), fx_table_ts_1.PAL.fire, 0.75 * f, fx_particles_ts_1.SH.flame, 0, 0, 0, 0, 0, P.r(), P.r());
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + s * 0.2, a.z, s * 1.2, fx_table_ts_1.PAL.ember, 0.3 * f, fx_particles_ts_1.SH.glow);
    if (P.r() < 0.35 && P.count(1, a.x, a.y, a.z, 900) > 0)
        P.add({ x: a.x + P.s() * s * 0.3, y: a.y + s * 0.5, z: a.z + P.s() * s * 0.3, vx: P.s() * 0.4 + 0.8, vy: 2.2 + P.r(), vz: P.s() * 0.4, s0: s * 0.4, s1: s * 2.2, life: 4.5, c0: f > 0.4 ? fx_table_ts_1.PAL.smokeBlack : fx_table_ts_1.PAL.smokeDark, c1: fx_table_ts_1.PAL.smoke, a: 0.45, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, drag: 0.5, grav: -0.2, fin: 0.15, fpow: 0.8, far: 900 });
}
/** The auto-eject launch: a flash at the seat and a smoke trail arcing up (puffs laid along the arc with delays). */
function ejectTrail(P, a) {
    const band = bandOf(P, a, fx_particles_ts_1.BAND_NORMAL, 100);
    glow(P, a, 1.2, 0.15, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.fire, 1, band, fx_particles_ts_1.SH.star);
    const ang = P.r() * 6.283, vx = Math.cos(ang) * 6, vz = Math.sin(ang) * 6, vy = 20;
    for (let i = 0; i < 12; i++) {
        const t = i * 0.08, x = a.x + vx * t, y = a.y + vy * t - 4.9 * t * t, z = a.z + vz * t;
        P.add({ x, y, z, vx: P.s() * 0.3, vy: 0.3, vz: P.s() * 0.3, delay: t, s0: 0.3, s1: 1.4, life: 2.2, c0: fx_table_ts_1.PAL.smokeLight, c1: fx_table_ts_1.PAL.smoke, a: 0.55, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band, drag: 1, fin: 0.05 });
        if (i < 6)
            P.add({ x, y, z, delay: t, s0: 0.5, s1: 0.2, life: 0.2, c0: fx_table_ts_1.PAL.rocketFlame, a: 0.9, shape: fx_particles_ts_1.SH.glow, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 1.5 });
    }
}
/** A falling aircraft's smoke trail (laid in the air above the crash point). */
function crashTrail(P, a) {
    const h = a.k ?? 30, band = bandOf(P, a);
    for (let i = 0; i < 10; i++)
        P.add({ x: a.x + P.s() * 4 - i * 1.5, y: a.y + h * (i / 10), z: a.z + P.s() * 4, s0: 1.4, s1: 4, life: 4, delay: (10 - i) * 0.05, c0: fx_table_ts_1.PAL.smokeBlack, c1: fx_table_ts_1.PAL.smoke, a: 0.5, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band, drag: 0.6, grav: -0.2, fin: 0.1 });
}
// ------------------------------------------------------------------ vehicles (attached, per frame)
function hoverGlow(P, a) { P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, (a.k ?? 2) * (0.8 + 0.15 * Math.sin(P.r() * 6)), teamCol(a.team), 0.32 + 0.2 * (a.f ?? 0), fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 600); }
/** Dust kicked up under a hover vehicle (or a low-flying aircraft), more with speed (f 0..1); the surface's colour. */
function hoverDust(P, a) {
    const S = surfaceOf(a), f = a.f ?? 0, k = a.k ?? 2;
    if (S.splash) {
        if (P.r() < f)
            P.add({ x: a.x + P.s() * k, y: gy(a) + 0.1, z: a.z + P.s() * k, vy: 2 + P.r() * 2, s0: 0.3 * k, s1: 0.9 * k, life: 0.8, c0: S.glow ? fx_table_ts_1.PAL.fire : fx_table_ts_1.PAL.steam, a: 0.35, shape: fx_particles_ts_1.SH.smoke, pass: S.glow ? fx_particles_ts_1.PASS_ADD : fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, drag: 2, far: 300 });
        return;
    }
    const n = P.count(0.2 + 1.3 * f, a.x, a.y, a.z, 350, fx_particles_ts_1.BAND_AMBIENT);
    for (let i = 0; i < n; i++) {
        const ang = P.r() * Math.PI * 2;
        P.add({ x: a.x + Math.cos(ang) * k * 0.6, y: gy(a) + 0.3, z: a.z + Math.sin(ang) * k * 0.6, vx: Math.cos(ang) * (2 + 4 * f) - (a.dx ?? 0) * 4 * f, vy: 0.6 + P.r(), vz: Math.sin(ang) * (2 + 4 * f) - (a.dz ?? 0) * 4 * f,
            s0: 0.4 * k, s1: (0.9 + f) * k, life: 1.2 + f, c0: S.dust, a: 0.22 + 0.2 * f, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, drag: 1.6, grav: -0.05, fin: 0.15, far: 350 });
    }
}
function jetGlow(P, a) {
    const k = a.k ?? 1;
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, 0.8 * k, fx_table_ts_1.PAL.rocketFlame, 0.75, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 1500);
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, 0.35 * k, fx_table_ts_1.PAL.rocketFlame, 0.7, fx_particles_ts_1.SH.flame, fx_particles_ts_1.GEOM_STREAK, -(a.dx ?? 1), -(a.dy ?? 0), -(a.dz ?? 0), 2.5 * k * (0.6 + (a.f ?? 0.5)), 0, P.r(), false, 1200);
}
/** Black smoke from a damaged vehicle (f: damage 0..1, 1 = about to go); flames under 15 % hull. */
function damageSmoke(P, a) {
    const f = a.f ?? 0.5, k = a.k ?? 2;
    if (P.r() < 0.15 + 0.5 * f && P.count(1, a.x, a.y, a.z, 700) > 0)
        P.add({ x: a.x + P.s() * k * 0.3, y: a.y, z: a.z + P.s() * k * 0.3, vx: P.s() * 0.5, vy: 1.5 + P.r() * 1.5, vz: P.s() * 0.5, s0: 0.3 * k, s1: (0.8 + f) * k, life: 2.5, c0: f > 0.6 ? fx_table_ts_1.PAL.smokeBlack : fx_table_ts_1.PAL.smokeDark, c1: fx_table_ts_1.PAL.smoke, a: 0.35 + 0.25 * f, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_NORMAL, drag: 0.8, grav: -0.25, fin: 0.1, far: 700 });
    if (f > 0.7)
        P.once(fx_particles_ts_1.PASS_ADD, a.x + P.s() * 0.3, a.y + 0.2, a.z + P.s() * 0.3, 0.35 * k, fx_table_ts_1.PAL.fire, 0.7, fx_particles_ts_1.SH.flame, 0, 0, 0, 0, 0, P.r(), P.r());
}
/** EMP arcs crawling over a disabled vehicle: short jagged bright segments, flickering. */
function empArcs(P, a) {
    const k = a.k ?? 2;
    for (let i = 0; i < 2; i++) {
        if (P.r() > 0.55)
            continue;
        const x = a.x + P.s() * k, y = a.y + P.r() * k * 0.8, z = a.z + P.s() * k;
        let dx = P.s(), dy = P.s(), dz = P.s();
        const l = Math.hypot(dx, dy, dz) || 1;
        dx /= l;
        dy /= l;
        dz /= l;
        P.once(fx_particles_ts_1.PASS_ADD, x, y, z, 0.06, fx_table_ts_1.PAL.white, 1, fx_particles_ts_1.SH.beam, fx_particles_ts_1.GEOM_STREAK, dx, dy, dz, k * (0.4 + 0.5 * P.r()), 0, 0, false, 400);
        P.once(fx_particles_ts_1.PASS_ADD, x, y, z, 0.45, fx_table_ts_1.PAL.emp, 0.5, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 400);
    }
}
function criticalSparks(P, a) {
    const band = bandOf(P, a);
    sparks(P, P.count(10, a.x, a.y, a.z, 500, band), a, { speed: 10, up: 0.9, life: 0.7, size: 0.06, c0: fx_table_ts_1.PAL.sparkHot, c1: fx_table_ts_1.PAL.metal, band });
    glow(P, a, 1, 0.15, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.metal, 0.8, band, fx_particles_ts_1.SH.star);
}
// ------------------------------------------------------------------ call-downs
/** Beacon: a beam of light up from the ground in the call's colour (a.col), brighter and pulsing faster near impact (f 0..1). */
function beaconBeam(P, a) {
    const f = a.f ?? 0, c = a.col ?? fx_table_ts_1.PAL.beacon, pulse = 0.75 + 0.25 * Math.sin((a.t ?? 0) * (4 + 14 * f));
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 120, a.z, 0.35 + 0.3 * f, c, (0.45 + 0.4 * f) * pulse, fx_particles_ts_1.SH.beam, fx_particles_ts_1.GEOM_STREAK, 0, 1, 0, 120, 0, 0, false, 2500);
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 60, a.z, 1.4, c, 0.15 * pulse, fx_particles_ts_1.SH.beam, fx_particles_ts_1.GEOM_STREAK, 0, 1, 0, 60, 0, 0, false, 2500);
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 0.4, a.z, 1.6 + f, c, 0.6 * pulse, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 1500);
    P.once(fx_particles_ts_1.PASS_DECAL, a.x, a.y, a.z, 3 + 2 * f, c, 0.5 * pulse, fx_particles_ts_1.SH.ring, fx_particles_ts_1.GEOM_FLAT, 0, 1, 0, (a.t ?? 0) * 0.5, 0, 0, false, 900);
}
/** A drop pod falling (a.y = its height): a re-entry flame at the head and a smoke trail above it. */
function podTrail(P, a) {
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, 2.4, fx_table_ts_1.PAL.fireHot, 0.9, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 2500);
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 0.5, a.z, 1.1, fx_table_ts_1.PAL.fire, 0.9, fx_particles_ts_1.SH.flame, fx_particles_ts_1.GEOM_STREAK, 0, 1, 0, 9, 0, P.r(), false, 2500);
    if (P.count(1, a.x, a.y, a.z, 2000, fx_particles_ts_1.BAND_HIGH) > 0)
        P.add({ x: a.x + P.s() * 0.5, y: a.y + 2, z: a.z + P.s() * 0.5, vy: 1, s0: 1.2, s1: 4, life: 3, c0: fx_table_ts_1.PAL.smokeLight, c1: fx_table_ts_1.PAL.smoke, a: 0.45, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_HIGH, drag: 1, fin: 0.05, far: 2000 });
}
function podLand(P, a) {
    // a delivery touching down, not a blast (designer 19 Nov: call-ins should not explode): no fire flash or scorch,
    // a dust wall rolling out, thrown clods and a dust-coloured shock ring
    const band = bandOf(P, a, fx_particles_ts_1.BAND_HIGH, 120);
    puffs(P, P.count(12, a.x, a.y, a.z, 1200, band), a, { spread: 1, up: 0.8, out: 9, s0: 1.2, s1: 4.5, life: 3, c0: fx_table_ts_1.PAL.dust, c1: fx_table_ts_1.PAL.smokeLight, al: 0.5, band, drag: 2, grav: -0.1, far: 1200 });
    chunks(P, P.count(8, a.x, a.y, a.z, 300, band), a, { speed: 6, up: 6, size: 0.15, life: 1.6, c: fx_table_ts_1.PAL.debris, band });
    decal(P, a, fx_particles_ts_1.SH.shock, 1.5, 10, 0.5, fx_table_ts_1.PAL.dust, 0.45, 1, band);
}
/**
 * Ruling 130: the drop pod sentry's touch-down: a heavy thud (shock ring, a dust wall rolling out, thrown clods), a
 * smoke column rising off the hot shell, then the hatch venting steam as the petals open and sparks round the rim.
 */
function sentryDeploy(P, a) {
    podLand(P, a);
    const band = bandOf(P, a, fx_particles_ts_1.BAND_HIGH, 160), g = gy(a);
    decal(P, a, fx_particles_ts_1.SH.shock, 2, 16, 0.6, fx_table_ts_1.PAL.dust, 0.45, 1, band); // dust, not a flash
    puffs(P, P.count(14, a.x, a.y, a.z, 1400, band), { ...a, y: g }, { spread: 2.5, up: 0.5, out: 14, s0: 1.5, s1: 6, life: 3.5, c0: fx_table_ts_1.PAL.dust, c1: fx_table_ts_1.PAL.smokeLight, al: 0.55, band, drag: 2.2, grav: -0.05, far: 1400 });
    puffs(P, P.count(10, a.x, a.y, a.z, 1600, band), { ...a, y: g + 2 }, { spread: 1.5, up: 3.5, s0: 1.2, s1: 5, life: 5, c0: fx_table_ts_1.PAL.smokeDark, c1: fx_table_ts_1.PAL.smoke, al: 0.5, band, drag: 0.8, grav: -0.25, delay: 0.6, far: 1600 });
    chunks(P, P.count(10, a.x, a.y, a.z, 300, band), a, { speed: 9, up: 8, size: 0.2, life: 2, c: fx_table_ts_1.PAL.debris, band });
    puffs(P, P.count(8, a.x, a.y, a.z, 500, band), { ...a, y: g + 4.3 }, { spread: 1.3, up: 2.2, out: 1.5, s0: 0.5, s1: 2.4, life: 1.6, c0: fx_table_ts_1.PAL.steam, c1: fx_table_ts_1.PAL.smokeLight, al: 0.5, band, drag: 1.5, grav: -0.4, delay: 0.5, far: 500 });
    sparks(P, P.count(10, a.x, a.y, a.z, 400, band), { ...a, y: g + 4.3 }, { speed: 5, up: 1.2, life: 0.6, size: 0.05, c0: fx_table_ts_1.PAL.spark, c1: fx_table_ts_1.PAL.fire, band, grav: 8 });
    P.add({ x: a.x, y: g + 0.05, z: a.z, ax: 0, ay: 1, az: 0, s0: 1, s1: 7, life: 0.9, c0: teamCol(a.team), a: 0.7, shape: fx_particles_ts_1.SH.ring, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band });
}
/** Ruling 130: retro-thruster burn of a falling drop pod (a.y: the pod's base, f 0..1 the burn): a flame and a hot glow under each of the four bells. */
function podRetroFx(P, a) {
    const f = a.f ?? 1, band = bandOf(P, a, fx_particles_ts_1.BAND_HIGH, 200);
    for (let k = 0; k < 4; k++) {
        const ang = k * Math.PI / 2, x = a.x + Math.cos(ang) * 2.88, z = a.z + Math.sin(ang) * 2.88;
        P.once(fx_particles_ts_1.PASS_ADD, x, a.y + 0.2, z, 0.9 + 0.5 * f, fx_table_ts_1.PAL.fireHot, 0.9, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 2500);
        P.once(fx_particles_ts_1.PASS_ADD, x, a.y - 0.4, z, 0.7 + 0.4 * f, fx_table_ts_1.PAL.rocketFlame, 0.85, fx_particles_ts_1.SH.flame, fx_particles_ts_1.GEOM_STREAK, 0, -1, 0, 3 + 5 * f, 0, P.r(), false, 2500);
    }
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y - 1, a.z, 5 * f, fx_table_ts_1.PAL.fire, 0.35 * f, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 2500);
    if (P.count(1, a.x, a.y, a.z, 1500, band) > 0)
        P.add({ x: a.x + P.s() * 2, y: a.y - 1, z: a.z + P.s() * 2, vy: -3, s0: 1, s1: 3.5, life: 1.2, c0: fx_table_ts_1.PAL.smokeLight, c1: fx_table_ts_1.PAL.smoke, a: 0.4, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band, drag: 1.5, fin: 0.05, far: 1500 });
}
/** Ruling 130: dust blasted off the ground by the retros (f 0..1: the closer, the more). */
function podDustFx(P, a) {
    const f = a.f ?? 1, band = bandOf(P, a, fx_particles_ts_1.BAND_HIGH, 200), g = gy(a);
    puffs(P, P.count(Math.ceil(3 * f), a.x, g, a.z, 1200, band), { ...a, y: g }, { spread: 3, up: 0.6, out: 10 + 8 * f, s0: 1, s1: 4.5, life: 2.2, c0: fx_table_ts_1.PAL.dust, c1: fx_table_ts_1.PAL.smokeLight, al: 0.45 * f, band, drag: 2, grav: -0.1, far: 1200 });
}
function minesLaid(P, a) {
    const r = a.r ?? 20, band = bandOf(P, a);
    for (let i = 0; i < 12; i++) {
        const ang = P.r() * 6.28, rr = Math.sqrt(P.r()) * r;
        puffs(P, 1, { ...a, x: a.x + Math.cos(ang) * rr, z: a.z + Math.sin(ang) * rr }, { spread: 0.5, up: 1, s0: 0.5, s1: 2, life: 1.5, c0: fx_table_ts_1.PAL.dust, al: 0.45, band, delay: 0.6 });
    }
}
/** A mine of the own team, blinking where it lies (attached). */
function mineBlink(P, a) { P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 0.2, a.z, 0.35, fx_table_ts_1.PAL.mine, 0.4 + 0.5 * (a.f ?? 0), fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 250); }
function minePop(P, a) { explosion(P, { ...a, k: 3 }); }
function domeUp(P, a) {
    const r = a.r ?? 10, band = bandOf(P, a);
    P.add({ x: a.x, y: gy(a) + 0.05, z: a.z, ax: 0, ay: 1, az: 0, s0: 0.5, s1: r * 1.05, life: 0.6, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.dome, a: 0.8, shape: fx_particles_ts_1.SH.shock, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band });
    sparks(P, P.count(14, a.x, a.y, a.z, 600, band), { ...a, y: gy(a) + 0.5 }, { speed: 9, up: 1.2, life: 0.8, size: 0.06, c0: fx_table_ts_1.PAL.dome, c1: fx_table_ts_1.PAL.holo, band, grav: 2 });
}
/** The dome's ground ring (the surface itself is the faceted shield mesh, render.ts drawShields, from the glue). */
function domeSurface(P, a) { P.once(fx_particles_ts_1.PASS_DECAL, a.x, gy(a), a.z, (a.r ?? 10) * 1.02, fx_table_ts_1.PAL.dome, 0.45, fx_particles_ts_1.SH.ring, fx_particles_ts_1.GEOM_FLAT, 0, 1, 0, 0, 0, 0, false, 900); }
function domeDown(P, a) { shieldBreak(P, { ...a, y: gy(a) + (a.r ?? 10) * 0.5, r: (a.r ?? 10) * 0.8 }); }
function smokePop(P, a) { const band = bandOf(P, a); puffs(P, P.count(8, a.x, a.y, a.z, 1200, band), a, { spread: 2, up: 1.5, out: 4, s0: 1.5, s1: 4.5, life: 3, c0: fx_table_ts_1.PAL.smokeWall, al: 0.55, band, drag: 1.5, far: 1200 }); }
/** The smoke wall (attached, per frame): keeps a few slow grey puffs alive along the line (a.r = length, dx / dz direction). */
function smokeWall(P, a) {
    const L = a.r ?? 40, ux = a.dx ?? 1, uz = a.dz ?? 0;
    for (let i = 0, n = P.count(2.5, a.x, a.y, a.z, 1500, fx_particles_ts_1.BAND_NORMAL); i < n; i++) {
        const s = P.s() * L * 0.5, w = P.s() * 3;
        puffs(P, 1, { ...a, x: a.x + ux * s - uz * w, z: a.z + uz * s + ux * w, y: gy(a) + 1 }, { spread: 1, up: 0.5, s0: 3, s1: 6, life: 5, c0: fx_table_ts_1.PAL.smokeWall, c1: fx_table_ts_1.PAL.smokeLight, al: 0.5, band: fx_particles_ts_1.BAND_NORMAL, drag: 0.4, grav: -0.05, far: 1500, fin: 0.3, fpow: 0.6 });
    }
}
function sweepRing(P, a) {
    const r = a.r ?? 200, band = bandOf(P, a);
    P.add({ x: a.x, y: gy(a) + 0.5, z: a.z, ax: 0, ay: 1, az: 0, s0: 2, s1: r, life: 1.5, c0: fx_table_ts_1.PAL.sweep, a: 0.8, shape: fx_particles_ts_1.SH.shock, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 0.8, far: 3000 });
    glow(P, { ...a, y: gy(a) + 2 }, 4, 0.5, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.sweep, 0.8, band);
}
/** Precision strike incoming: a red targeting beam narrowing onto the point (f 0..1 towards impact). */
function strikeBeam(P, a) {
    const f = a.f ?? 0;
    P.once(fx_particles_ts_1.PASS_ADD, a.x, gy(a) + 400, a.z, 0.2 + 1.6 * (1 - f), fx_table_ts_1.PAL.strike, 0.3 + 0.6 * f, fx_particles_ts_1.SH.beam, fx_particles_ts_1.GEOM_STREAK, 0, 1, 0, 400, 0, 0, false, 3000);
    P.once(fx_particles_ts_1.PASS_DECAL, a.x, gy(a), a.z, (a.r ?? 8) * (1.6 - f * 0.6), fx_table_ts_1.PAL.strike, 0.6, fx_particles_ts_1.SH.ring, fx_particles_ts_1.GEOM_FLAT, 0, 1, 0, f * 4, 0, 0, false, 1500);
}
function strikeBlast(P, a) {
    const r = a.r ?? 8, band = bandOf(P, a, fx_particles_ts_1.BAND_HIGH, 200);
    P.add({ x: a.x, y: gy(a) + 300, z: a.z, ax: 0, ay: 1, az: 0, len: 300, s0: r * 0.5, s1: r * 0.1, life: 0.35, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.strike, a: 1 * P.flashK + 0.2, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 1.5, far: 3000 });
    // the blasts themselves come from main.ts's explosions (one at the centre, six around): only the heavy dust ring here
    puffs(P, P.count(10, a.x, a.y, a.z, 1500, band), a, { spread: r * 0.5, up: 0.5, out: r * 2.5, s0: r * 0.4, s1: r * 1.2, life: 3, c0: fx_table_ts_1.PAL.dust, c1: fx_table_ts_1.PAL.smokeLight, al: 0.45, band, drag: 1.5, far: 1500 });
}
/** A barrage shell streaking down onto (x, z) from high and to one side, then bursting. */
function shellTrail(P, a) {
    const g = gy(a), sx = 30 + P.r() * 20, h = 90, life = 0.22;
    P.add({ x: a.x + sx, y: g + h, z: a.z + P.s() * 10, vx: -sx / life, vy: -h / life, vz: 0, s0: 0.25, life, c0: fx_table_ts_1.PAL.sparkHot, c1: fx_table_ts_1.PAL.shell, a: 1, shape: fx_particles_ts_1.SH.streak, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band: fx_particles_ts_1.BAND_NORMAL, stretch: 0.03, fpow: 0, far: 2000 });
}
function barrageShell(P, a) { shellTrail(P, a); explosion(P, { ...a, k: a.k ?? 3.5 }); }
function strafeHit(P, a) {
    impactDust(P, { ...a, k: 1.4 });
    if (P.count(1, a.x, a.y, a.z, 900) > 0)
        P.add({ x: a.x, y: gy(a) + 0.5, z: a.z, vy: 6, s0: 0.6, s1: 2.2, life: 1.2, c0: (fx_table_ts_1.SURFACE_FX[a.surface ?? "dirt"] ?? fx_table_ts_1.SURFACE_FX.dirt).dust, a: 0.5, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_NORMAL, drag: 2.2, far: 900 });
}
function bomb(P, a) { explosion(P, { ...a, k: a.k ?? 4.5 }); }
/** The strafing / bomb-run aircraft (attached): engine glows and a short contrail. */
function jetPass(P, a) {
    jetGlow(P, { ...a, k: 1.4, f: 1 });
    if (P.count(1, a.x, a.y, a.z, 2500, fx_particles_ts_1.BAND_NORMAL) > 0)
        P.add({ x: a.x, y: a.y, z: a.z, s0: 0.5, s1: 2.5, life: 1.8, c0: fx_table_ts_1.PAL.steam, a: 0.25, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_NORMAL, drag: 0.5, far: 2500 });
}
function empPulse(P, a) {
    const r = a.r ?? 40, band = bandOf(P, a, fx_particles_ts_1.BAND_HIGH);
    glow(P, { ...a, y: gy(a) + 2 }, r * 0.4, 0.35, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.emp, 0.9, band);
    P.add({ x: a.x, y: gy(a) + 0.5, z: a.z, ax: 0, ay: 1, az: 0, s0: 1, s1: r, life: 0.6, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.emp, a: 0.9, shape: fx_particles_ts_1.SH.shock, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band, fpow: 0.8, far: 2000 });
    sparks(P, P.count(16, a.x, a.y, a.z, 800, band), { ...a, y: gy(a) + 1.5 }, { speed: 25, up: 0.2, life: 0.4, size: 0.05, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.emp, band, grav: 0 });
}
// ------------------------------------------------------------------ world
/** Capture ring pulse (attached; f = progress 0..1, col = the capturing team, r = ring radius): a ground ring sweeping inward. */
function capturePulse(P, a) {
    const r = a.r ?? 40, ph = ((a.t ?? 0) * 0.6) % 1;
    P.once(fx_particles_ts_1.PASS_DECAL, a.x, gy(a), a.z, r * (1 - ph * 0.85), a.col ?? fx_table_ts_1.PAL.capture, 0.35 * (1 - ph) + 0.1, fx_particles_ts_1.SH.ring, fx_particles_ts_1.GEOM_FLAT, 0, 1, 0, 0, 0, 0, false, 1500);
    P.once(fx_particles_ts_1.PASS_DECAL, a.x, gy(a), a.z, r * Math.max(0.05, a.f ?? 0), a.col ?? fx_table_ts_1.PAL.capture, 0.16, fx_particles_ts_1.SH.hex, fx_particles_ts_1.GEOM_FLAT, 0, 1, 0, 0, 0, 0, false, 1200);
}
function captureFlip(P, a) {
    const r = a.r ?? 40, c = a.col ?? fx_table_ts_1.PAL.capture, band = bandOf(P, a);
    P.add({ x: a.x, y: gy(a) + 0.3, z: a.z, ax: 0, ay: 1, az: 0, s0: 2, s1: r, life: 1, c0: fx_table_ts_1.PAL.white, c1: c, a: 0.9, shape: fx_particles_ts_1.SH.shock, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band, far: 2500 });
    P.add({ x: a.x, y: gy(a) + 40, z: a.z, ax: 0, ay: 1, az: 0, len: 40, s0: 1.5, s1: 0.3, life: 1.2, c0: c, a: 0.8, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band, far: 2500 });
}
function hackSparks(P, a) { if (P.r() < 0.4)
    sparks(P, P.count(2, a.x, a.y, a.z, 400), a, { speed: 5, up: 1, life: 0.4, size: 0.04, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.hack, band: fx_particles_ts_1.BAND_NORMAL, grav: 4 }); P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, 0.8, fx_table_ts_1.PAL.hack, 0.3 + 0.3 * P.r(), fx_particles_ts_1.SH.glow); }
function buildStart(P, a) {
    const r = a.r ?? 6, band = bandOf(P, a);
    P.add({ x: a.x, y: gy(a) + 0.05, z: a.z, ax: 0, ay: 1, az: 0, s0: 0.5, s1: r, life: 0.8, c0: fx_table_ts_1.PAL.holo, a: 0.7, shape: fx_particles_ts_1.SH.ring, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band });
    puffs(P, P.count(5, a.x, a.y, a.z, 800, band), a, { spread: r * 0.5, up: 0.5, out: 1.5, s0: 1, s1: 2.5, life: 2, c0: fx_table_ts_1.PAL.dust, al: 0.35, band });
}
/** A rising construction frame (attached): the build line glowing at the built height f x r, with welding sparks. */
function buildFrame(P, a) {
    const r = a.r ?? 6, h = Math.max(0.5, (a.f ?? 0) * (a.k ?? 8)), c = fx_table_ts_1.PAL.holo;
    for (let i = 0; i < 4; i++) {
        const ang = i * Math.PI / 2 + 0.785, x = a.x + Math.cos(ang) * r * 0.6, z = a.z + Math.sin(ang) * r * 0.6;
        P.once(fx_particles_ts_1.PASS_ADD, x, gy(a) + h, z, 0.08, c, 0.55, fx_particles_ts_1.SH.beam, fx_particles_ts_1.GEOM_STREAK, 0, 1, 0, h, 0, 0, false, 700);
    }
    P.once(fx_particles_ts_1.PASS_DECAL, a.x, gy(a), a.z, r * 0.9, c, 0.3, fx_particles_ts_1.SH.hex, fx_particles_ts_1.GEOM_FLAT, 0, 1, 0, 0, 0, 0, false, 700);
}
function weldSparks(P, a) {
    if (P.r() > 0.3)
        return;
    const r = a.r ?? 6, ang = P.r() * 6.28, h = Math.max(0.5, (a.f ?? 0) * (a.k ?? 8));
    const p = { ...a, x: a.x + Math.cos(ang) * r * 0.5, y: gy(a) + h, z: a.z + Math.sin(ang) * r * 0.5 };
    P.once(fx_particles_ts_1.PASS_ADD, p.x, p.y, p.z, 0.5, fx_table_ts_1.PAL.weld, 0.9, fx_particles_ts_1.SH.star, 0, 0, 0, 0, 0, 0, P.r(), false, 400);
    sparks(P, P.count(3, p.x, p.y, p.z, 300), p, { speed: 4, up: 0.5, life: 0.6, size: 0.035, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.spark, band: fx_particles_ts_1.BAND_AMBIENT, grav: 9 });
}
function buildDone(P, a) {
    const r = a.r ?? 6, h = a.k ?? 8, band = bandOf(P, a);
    P.add({ x: a.x, y: gy(a) + h, z: a.z, ax: 0, ay: 1, az: 0, len: h, s0: r * 0.6, s1: r * 0.2, life: 0.6, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.holo, a: 0.6, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band });
    puffs(P, P.count(6, a.x, a.y, a.z, 800, band), a, { spread: r * 0.6, up: 0.3, out: 2, s0: 1, s1: 3, life: 2, c0: fx_table_ts_1.PAL.dust, al: 0.3, band });
}
function buildCancel(P, a) { const band = bandOf(P, a); sparks(P, P.count(10, a.x, a.y, a.z, 500, band), { ...a, y: gy(a) + 1 }, { speed: 4, up: 1, life: 0.7, size: 0.05, c0: fx_table_ts_1.PAL.holo, c1: fx_table_ts_1.PAL.own, band, grav: -1 }); }
function fortify(P, a) { weldSparks(P, { ...a, r: a.r ?? 12, f: 0.4, k: 4 }); if ((a.f ?? 0) >= 1)
    captureFlip(P, { ...a, r: 15 }); }
function miningSparks(P, a) {
    if (P.r() < 0.25)
        sparks(P, P.count(3, a.x, a.y, a.z, 300), a, { speed: 6, up: 1, life: 0.5, size: 0.045, c0: fx_table_ts_1.PAL.sparkHot, c1: fx_table_ts_1.PAL.ore, band: fx_particles_ts_1.BAND_AMBIENT, grav: 9 });
    if (P.r() < 0.1)
        puffs(P, P.count(1, a.x, a.y, a.z, 400, fx_particles_ts_1.BAND_AMBIENT), a, { spread: 1, up: 0.8, s0: 0.6, s1: 2, life: 1.5, c0: fx_table_ts_1.PAL.dust, al: 0.3, band: fx_particles_ts_1.BAND_AMBIENT });
}
/** Ore stream: glowing grains running from (x, y, z) to (x1, y1, z1) (harvester loading at a deposit, or unloading). */
function oreStream(P, a) {
    if (P.r() > 0.5)
        return;
    const x1 = a.x1 ?? a.x, y1 = a.y1 ?? a.y + 2, z1 = a.z1 ?? a.z, life = 0.6;
    P.add({ x: a.x, y: a.y, z: a.z, vx: (x1 - a.x) / life, vy: (y1 - a.y) / life + 4.9 * life * 0.5, vz: (z1 - a.z) / life, grav: 4.9, s0: 0.08, life, c0: fx_table_ts_1.PAL.ore, a: 0.9, shape: fx_particles_ts_1.SH.streak, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band: fx_particles_ts_1.BAND_AMBIENT, stretch: 0.05, far: 300 });
}
function oreUnload(P, a) { for (let i = 0; i < 10; i++)
    oreStream(P, a); puffs(P, P.count(3, a.x, a.y, a.z, 400), a, { spread: 1.5, up: 0.6, s0: 0.8, s1: 2.2, life: 1.8, c0: fx_table_ts_1.PAL.dust, al: 0.3, band: fx_particles_ts_1.BAND_NORMAL }); }
function depositDust(P, a) { puffs(P, P.count(6, a.x, a.y, a.z, 1200), a, { spread: 4, up: 0.8, out: 2, s0: 1.5, s1: 4, life: 3, c0: fx_table_ts_1.PAL.dust, al: 0.4, band: fx_particles_ts_1.BAND_NORMAL }); }
function gasVent(P, a) { if (P.r() < 0.12 && P.count(1, a.x, a.y, a.z, 600, fx_particles_ts_1.BAND_AMBIENT) > 0)
    P.add({ x: a.x + P.s() * 0.5, y: a.y, z: a.z + P.s() * 0.5, vx: 0.6, vy: 2.5 + P.r(), vz: P.s() * 0.3, s0: 0.6, s1: 3, life: 3, c0: fx_table_ts_1.PAL.gas, c1: fx_table_ts_1.PAL.steam, a: 0.3, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, drag: 0.8, grav: -0.2, fin: 0.2, far: 600 }); }
/** G1: a gas geyser's plume (per frame): a tall, slow, pale-green column that swells and thins on a ~7 s pulse, with a
 * faint glow over the throat. a.t: seconds, a.k: the geyser's index (phase). Seen to 1600 m. */
function geyserPlume(P, a) {
    const t = a.t ?? 0, pulse = 0.5 + 0.5 * Math.sin(t * 0.9 + (a.k ?? 0) * 2.1), d = P.dist(a.x, a.y, a.z);
    const rate = (0.4 + 0.6 * pulse) * (d < 400 ? 1 : 0.7);
    if (P.r() < rate)
        P.add({ x: a.x + P.s() * 0.6, y: a.y, z: a.z + P.s() * 0.6, vx: P.s() * 0.4 + 0.5, vy: 4 + 3 * pulse + P.r() * 1.5, vz: P.s() * 0.4,
            s0: 1.2, s1: 8 + 4 * pulse, life: 7 + P.r() * 2, c0: fx_table_ts_1.PAL.gas, c1: fx_table_ts_1.PAL.steam, a: 0.36 + 0.14 * pulse, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, drag: 0.35, grav: -0.15, fin: 0.12, fpow: 0.9, far: 1600 });
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 0.8, a.z, 2.2 + pulse, fx_table_ts_1.PAL.gas, 0.12 + 0.12 * pulse, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 1600);
}
/** Cloak shimmer around an own-team cloaked pilot (attached): faint refracting glints. */
function cloakShimmer(P, a) { for (let i = 0; i < 2; i++)
    P.once(fx_particles_ts_1.PASS_ADD, a.x + P.s() * 0.4, a.y + 0.3 + P.r() * 1.5, a.z + P.s() * 0.4, 0.15 + P.r() * 0.2, fx_table_ts_1.PAL.cloak, 0.08 + 0.1 * P.r(), fx_particles_ts_1.SH.ring, 0, 0, 0, 0, 0, 0, P.r(), false, 200); }
function decloak(P, a) { const band = bandOf(P, a); glow(P, { ...a, y: a.y + 1 }, 1.5, 0.25, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.cloak, 0.8, band); P.add({ x: a.x, y: a.y + 1, z: a.z, s0: 0.4, s1: 2.5, life: 0.4, c0: fx_table_ts_1.PAL.cloak, a: 0.8, shape: fx_particles_ts_1.SH.ring, pass: fx_particles_ts_1.PASS_ADD, band }); }
function downedMarker(P, a) { P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 0.5, a.z, 0.9, fx_table_ts_1.PAL.downed, 0.35 + 0.3 * Math.max(0, Math.sin((a.t ?? 0) * 5)), fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 400); P.once(fx_particles_ts_1.PASS_DECAL, a.x, gy(a), a.z, 1.6, fx_table_ts_1.PAL.downed, 0.45, fx_particles_ts_1.SH.ring, fx_particles_ts_1.GEOM_FLAT, 0, 1, 0, 0, 0, 0, false, 300); }
function reviveGlow(P, a) { const band = bandOf(P, a); P.add({ x: a.x, y: a.y + 4, z: a.z, ax: 0, ay: 1, az: 0, len: 4, s0: 0.8, s1: 0.2, life: 0.8, c0: fx_table_ts_1.PAL.heal, a: 0.7, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band }); sparks(P, P.count(8, a.x, a.y, a.z, 300, band), { ...a, y: a.y + 0.5 }, { speed: 3, up: 2, life: 0.8, size: 0.04, c0: fx_table_ts_1.PAL.heal, c1: fx_table_ts_1.PAL.white, band, grav: -2 }); }
function respawnGlow(P, a) { reviveGlow(P, { ...a, col: teamCol(a.team) }); glow(P, { ...a, y: a.y + 1 }, 2, 0.4, fx_table_ts_1.PAL.white, teamCol(a.team), 0.6, bandOf(P, a)); }
/** A ring of dust as the own pilot drops prone, or under an aircraft landing / lifting off (k = radius). */
function proneDust(P, a) { const S = surfaceOf(a), k = a.k ?? 0.8; puffs(P, P.count(4, a.x, a.y, a.z, 200, fx_particles_ts_1.BAND_NORMAL), a, { spread: k * 0.5, up: 0.2, out: 1 + k, s0: 0.2 * k + 0.1, s1: 0.7 * k + 0.3, life: 1.2, c0: S.dust, al: 0.35, band: fx_particles_ts_1.BAND_NORMAL, drag: 2.5, grav: -0.02 }); }
function landingDust(P, a) { const S = surfaceOf(a); puffs(P, P.count(12, a.x, a.y, a.z, 900, fx_particles_ts_1.BAND_NORMAL), a, { spread: 2, up: 0.3, out: 10, s0: 1.2, s1: 4, life: 2.5, c0: S.dust, al: 0.45, band: fx_particles_ts_1.BAND_NORMAL, drag: 1.6, grav: -0.03, far: 900 }); }
function hatchPuff(P, a) { if (P.dist(a.x, a.y, a.z) < 120)
    puffs(P, P.count(3, a.x, a.y, a.z, 120), a, { spread: 0.5, up: 0.8, out: 1, s0: 0.3, s1: 1, life: 1, c0: fx_table_ts_1.PAL.dust, al: 0.3, band: fx_particles_ts_1.BAND_NORMAL }); }
function rolloutDust(P, a) { hatchPuff(P, a); P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y + 2, a.z, 2, teamCol(a.team), 0.4, fx_particles_ts_1.SH.glow); }
function deployDust(P, a) { landingDust(P, { ...a }); puffs(P, P.count(4, a.x, a.y, a.z, 600), { ...a, y: a.y + 2 }, { spread: 2, up: 3, s0: 0.5, s1: 2, life: 1.6, c0: fx_table_ts_1.PAL.steam, al: 0.4, band: fx_particles_ts_1.BAND_NORMAL }); }
function chargeBlink(P, a) { P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, 0.4, fx_table_ts_1.PAL.mine, (a.f ?? 1) > 0.5 ? 1 : 0.2, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, 300); }
function jammerPulse(P, a) { P.add({ x: a.x, y: gy(a) + 1, z: a.z, ax: 0, ay: 1, az: 0, s0: 2, s1: a.r ?? 80, life: 1.4, c0: fx_table_ts_1.PAL.hack, a: 0.6, shape: fx_particles_ts_1.SH.shock, geom: fx_particles_ts_1.GEOM_FLAT, pass: fx_particles_ts_1.PASS_ADD, band: fx_particles_ts_1.BAND_NORMAL, far: 2500 }); }
function decoyPop(P, a) { glow(P, { ...a, y: a.y + 1 }, 1.5, 0.3, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.hack, 0.7, fx_particles_ts_1.BAND_NORMAL); hatchPuff(P, a); }
function scorch(P, a) { decal(P, a, fx_particles_ts_1.SH.scorch, a.k ?? 3, (a.k ?? 3) * 1.1, 30, fx_table_ts_1.PAL.scorch, 0.8, 0.45); }
// ------------------------------------------------------------------ weather and planets (camera-attached volumes)
/** Rain (and methane rain): streaks falling around the camera (a = the camera), wind-slanted; n per frame by rate. */
function rain(P, a) {
    const n = a.n ?? 3, c = a.col ?? fx_table_ts_1.PAL.rain, wind = a.dx ?? 3, fall = a.dy ?? 20, g = a.ground ?? a.y - 1.6;
    for (let i = 0; i < n; i++) {
        const r = 3 + Math.sqrt(P.r()) * 22, ang = P.r() * 6.283, x = a.x + Math.cos(ang) * r - wind * 0.3, z = a.z + Math.sin(ang) * r, y = a.y + 2 + P.r() * 14;
        // dies where it meets the ground (no bounce)
        P.add({ x, y, z, vx: wind, vy: -fall, vz: wind * 0.3, s0: 0.03, life: Math.max(0.1, (y - g) / fall), c0: c, a: 0.7, shape: fx_particles_ts_1.SH.streak, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, stretch: 0.07, fpow: 0, far: 60 });
    }
}
function dustSheet(P, a) {
    const n = a.n ?? 1, wind = a.dx ?? 14;
    for (let i = 0; i < n; i++)
        P.add({ x: a.x - wind * 1.5 + P.s() * 40, y: (a.ground ?? a.y - 1.6) + 0.5 + P.r() * 6, z: a.z + P.s() * 40, vx: wind * (0.8 + 0.4 * P.r()), vy: P.s() * 0.4, vz: P.s() * 2,
            s0: 2 + P.r() * 2, s1: 4 + P.r() * 3, life: 3.5, c0: fx_table_ts_1.PAL.dust, c1: fx_table_ts_1.PAL.smokeLight, a: 0.22, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, fin: 0.3, fpow: 0.8, far: 90 });
    for (let i = 0; i < n * 2; i++)
        P.add({ x: a.x + P.s() * 20, y: a.y + P.s() * 3, z: a.z + P.s() * 20, vx: wind * 1.6, vy: P.s(), vz: P.s() * 2, s0: 0.02, life: 1, c0: fx_table_ts_1.PAL.dust, a: 0.5, shape: fx_particles_ts_1.SH.streak, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, stretch: 0.03, far: 40 });
}
function ash(P, a) {
    const n = a.n ?? 2;
    for (let i = 0; i < n; i++) {
        const ember = P.r() < 0.12;
        P.add({ x: a.x + P.s() * 25, y: a.y + 3 + P.r() * 10, z: a.z + P.s() * 25, vx: 1.5 + P.s(), vy: -1.2 - P.r(), vz: P.s() * 0.8, s0: ember ? 0.05 : 0.09, life: 6, c0: ember ? fx_table_ts_1.PAL.ashEmber : fx_table_ts_1.PAL.ash, a: ember ? 0.9 : 0.7, shape: ember ? fx_particles_ts_1.SH.glow : fx_particles_ts_1.SH.chunk, pass: ember ? fx_particles_ts_1.PASS_ADD : fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, drag: 0.2, floor: (a.ground ?? a.y - 1.6), fin: 0.1, fpow: 0.5, far: 50 });
    }
}
/** Fog banks with depth: large slow puffs at several distances around the camera (they fade near it). */
function fogBank(P, a) {
    const n = a.n ?? 1;
    for (let i = 0; i < n; i++) {
        const ang = P.r() * 6.28, d = 45 + P.r() * 170;
        P.add({ x: a.x + Math.cos(ang) * d, y: (a.ground ?? a.y - 1.6) + 1 + P.r() * 3, z: a.z + Math.sin(ang) * d, vx: 1 + P.s() * 0.4, vz: P.s() * 0.4, s0: 7 + P.r() * 5, s1: 12 + P.r() * 6, life: 12, c0: fx_table_ts_1.PAL.fog, a: 0.55, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, fin: 0.3, fpow: 0.6, far: 260 });
    }
}
/** A lightning bolt: a jagged bright line from the cloud base to the ground far from the camera (a = the strike point). */
function lightning(P, a) {
    let x = a.x, y = gy(a) + 260, z = a.z;
    const g = gy(a);
    for (let i = 0; i < 8; i++) {
        const nx = a.x + P.s() * 12 * (1 - i / 8), ny = y - (y - g) / (8 - i), nz = a.z + P.s() * 12 * (1 - i / 8);
        const dx = x - nx, dy = y - ny, dz = z - nz, L = Math.hypot(dx, dy, dz) || 1;
        P.add({ x, y, z, ax: dx / L, ay: dy / L, az: dz / L, len: L, s0: 0.7, s1: 0.3, life: 0.22, c0: fx_table_ts_1.PAL.white, c1: fx_table_ts_1.PAL.lightning, a: P.flashK * 0.8 + 0.2, shape: fx_particles_ts_1.SH.beam, geom: fx_particles_ts_1.GEOM_STREAK, pass: fx_particles_ts_1.PASS_ADD, band: fx_particles_ts_1.BAND_HIGH, fpow: 2, far: 4000 });
        x = nx;
        y = ny;
        z = nz;
    }
    glow(P, { ...a, y: g + 2 }, 18, 0.25, fx_table_ts_1.PAL.white, fx_table_ts_1.PAL.lightning, 0.5, fx_particles_ts_1.BAND_HIGH, fx_particles_ts_1.SH.glow, false, 4000);
}
/** Solar flare: a glare at the sun's direction from the camera (a.dx..dz = the sun direction), attached. */
function flareGlare(P, a) {
    const d = 400, x = a.x + (a.dx ?? 0) * d, y = a.y + (a.dy ?? 1) * d, z = a.z + (a.dz ?? 0) * d, f = a.f ?? 1;
    P.once(fx_particles_ts_1.PASS_ADD, x, y, z, 160, fx_table_ts_1.PAL.flare, 0.35 * f * P.flashK + 0.05, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, true, 2000);
    P.once(fx_particles_ts_1.PASS_ADD, x, y, z, 70, fx_table_ts_1.PAL.white, 0.25 * f * P.flashK + 0.05, fx_particles_ts_1.SH.star, 0, 0, 0, 0, 0, 0, 0.13, true, 2000);
}
/** Ambient motes drifting near the camera (planet: pollen, grit, regolith glints, damp specks, embers). */
function motes(P, a) {
    const n = a.n ?? 1, c = a.col ?? fx_table_ts_1.PAL.smokeLight, rise = a.dy ?? 0.1, s = a.k ?? 0.05, add = a.f === 1;
    for (let i = 0; i < n; i++)
        P.add({ x: a.x + P.s() * 18, y: a.y + P.s() * 5, z: a.z + P.s() * 18, vx: 0.4 + P.s() * 0.4, vy: rise + P.s() * 0.2, vz: P.s() * 0.4, s0: s, life: 5, c0: c, a: add ? 0.8 : 0.5, shape: add ? fx_particles_ts_1.SH.glow : fx_particles_ts_1.SH.chunk, pass: add ? fx_particles_ts_1.PASS_ADD : fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_AMBIENT, fin: 0.25, fpow: 0.6, far: 30 });
}
// ------------------------------------------------------------------ F2 (ruling 91): the Lancer laser (attached, per frame)
/** The cannon charging at its muzzle (f = charge 0..1, team): a glow growing with the charge and rings drawn in. */
function laserCharge(P, a) {
    const f = Math.max(0, Math.min(1, a.f ?? 0)), C = fx_table_ts_1.LASER_FX.charge, c = energyCol(a.team), far = 900;
    if (f <= 0)
        return;
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, C.r0 + (C.r1 - C.r0) * f, fx_table_ts_1.PAL.white, 0.5 + 0.5 * f, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, far);
    P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, (C.r0 + (C.r1 - C.r0) * f) * 2.2, c, 0.25 + 0.45 * f, fx_particles_ts_1.SH.glow, 0, 0, 0, 0, 0, 0, 0, false, far);
    for (let i = 0; i < C.rings; i++) {
        const ph = ((a.t ?? 0) * 2.5 + i / C.rings) % 1;
        P.once(fx_particles_ts_1.PASS_ADD, a.x, a.y, a.z, C.rMax * (1 - ph) * (0.4 + 0.6 * f) + 0.1, c, 0.2 + 0.4 * f * ph, fx_particles_ts_1.SH.ring, 0, 0, 0, 0, 0, 0, P.r(), false, far);
    }
    if (f > 0.5 && P.dist(a.x, a.y, a.z) < 150 && P.r() < f * 0.6)
        sparks(P, 1, a, { speed: 2, up: 0, life: 0.2, size: 0.03, c0: fx_table_ts_1.PAL.white, c1: c, band: fx_particles_ts_1.BAND_NORMAL, grav: 0, far: 150 });
}
/** Heat shimmer over the rapid laser (f = heat 0..1): faint refracting glints rising off the emitter. */
function laserHeat(P, a) {
    const f = a.f ?? 0, k = (f - fx_table_ts_1.LASER_FX.heat.from) / (1 - fx_table_ts_1.LASER_FX.heat.from);
    if (k <= 0)
        return;
    for (let i = 0; i < 2; i++)
        P.once(fx_particles_ts_1.PASS_ADD, a.x + P.s() * 0.3, a.y + 0.15 + P.r() * 0.6 * k, a.z + P.s() * 0.3, 0.12 + P.r() * 0.2, k > 0.8 ? fx_table_ts_1.PAL.fire : fx_table_ts_1.PAL.fireHot, 0.06 + 0.14 * k * P.r(), fx_particles_ts_1.SH.ring, 0, 0, 0, 0, 0, 0, P.r(), false, 200);
}
/** Overheated: steam venting from the rapid laser (puffs; call every frame with n = puffs this frame). */
function laserVent(P, a) {
    const n = P.count(a.n ?? 1, a.x, a.y, a.z, 300, fx_particles_ts_1.BAND_NORMAL);
    for (let i = 0; i < n; i++)
        P.add({ x: a.x + P.s() * 0.2, y: a.y + 0.1, z: a.z + P.s() * 0.2, vx: P.s() * 1.2, vy: 1.8 + P.r() * 1.5, vz: P.s() * 1.2, s0: 0.15, s1: 1.2, life: 1.1 + P.r() * 0.6, c0: fx_table_ts_1.PAL.steam, c1: fx_table_ts_1.PAL.smokeLight, a: 0.45, shape: fx_particles_ts_1.SH.smoke, pass: fx_particles_ts_1.PASS_ALPHA, band: fx_particles_ts_1.BAND_NORMAL, drag: 1.6, grav: -0.6, fin: 0.05, far: 300 });
}
/** Every effect by id (the event table and the glue name these). */
exports.EFFECTS = {
    muzzle, casing, tracer, beam, "rocket-trail": rocketTrail, "shell-glow": shellGlow, "bolt-glow": boltGlow, "flak-burst": flakBurst,
    "impact-metal": impactMetal, "shield-hit": shieldHit, "shield-break": shieldBreak, "impact-dust": impactDust, "impact-splash": impactSplash, ricochet,
    explosion, collapse, "wreck-fire": wreckFire, "eject-trail": ejectTrail, "crash-trail": crashTrail, scorch,
    "hover-glow": hoverGlow, "hover-dust": hoverDust, "jet-glow": jetGlow, "lowflight-wake": hoverDust, "damage-smoke": damageSmoke, "emp-arcs": empArcs, "critical-sparks": criticalSparks,
    "beacon-beam": beaconBeam, "pod-trail": podTrail, "pod-land": podLand, "sentry-deploy": sentryDeploy, "pod-retro": podRetroFx, "pod-dust": podDustFx, "mines-laid": minesLaid, "mine-blink": mineBlink, "mine-pop": minePop,
    "dome-up": domeUp, "dome-surface": domeSurface, "dome-down": domeDown, "smoke-pop": smokePop, "smoke-wall": smokeWall, "sweep-ring": sweepRing,
    "strike-beam": strikeBeam, "strike-blast": strikeBlast, "shell-trail": shellTrail, "barrage-shell": barrageShell, "strafe-hit": strafeHit, bomb, "jet-pass": jetPass, "emp-pulse": empPulse,
    "capture-pulse": capturePulse, "capture-flip": captureFlip, "hack-sparks": hackSparks, "build-start": buildStart, "build-frame": buildFrame, "weld-sparks": weldSparks, "build-done": buildDone, "build-cancel": buildCancel,
    fortify, "mining-sparks": miningSparks, "ore-stream": oreStream, "ore-unload": oreUnload, "deposit-dust": depositDust, "gas-vent": gasVent, "geyser-plume": geyserPlume,
    "cloak-shimmer": cloakShimmer, decloak, "downed-marker": downedMarker, "revive-glow": reviveGlow, "respawn-glow": respawnGlow, "prone-dust": proneDust, "landing-dust": landingDust,
    "hatch-puff": hatchPuff, "rollout-dust": rolloutDust, "deploy-dust": deployDust, "charge-blink": chargeBlink, "jammer-pulse": jammerPulse, "decoy-pop": decoyPop,
    rain, "dust-sheet": dustSheet, ash, "fog-bank": fogBank, lightning, "flare-glare": flareGlare, motes,
    "laser-charge": laserCharge, "laser-heat": laserHeat, "laser-vent": laserVent,
};
