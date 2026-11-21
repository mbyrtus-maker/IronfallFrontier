"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELIEF_CELL = exports.RELIEF_DEFAULT_SEED = exports.Relief = void 0;
exports.reliefDef = reliefDef;
exports.reliefPlanet = reliefPlanet;
exports.compileReliefRules = compileReliefRules;
exports.slopeSpeedFactor = slopeSpeedFactor;
exports.highGroundK = highGroundK;
exports.vnoise = vnoise;
exports.scenarioRelief = scenarioRelief;
exports.reliefStepRule = reliefStepRule;
// T1 (designer 15 Nov 23:12, "make the terrain part of the game"; ruling 116): planet relief. Halcyon keeps its rolling
// hills; Rust, Pale, Brume and Cinder get a seeded heightmap built around the map's strategic points:
//
//   pads       every point sits on a flat pad (radius + padMarginMetres) at floorMetres + levels[point type] (+ a
//              mirrored seeded jitter): citadels on mid terraces, ore and gas in the valley floors, chokepoints as passes,
//              the relay ridge on a high plateau
//   corridors  every supply link is a corridor between its two pads, pinched in the middle (the pass: corridor half width
//              x passPinch) and bent like the client's worn tracks (g1-terrain trackSegments); its floor ramps linearly
//              from one pad's height to the other's between the pad edges
//   basins     each blob of special terrain-layer cells (lava, lakes, canyons, craters, soft ground, ice, rock forest)
//              becomes a valley floor basinDepthMetres below the nearest point's pad, reached from that point by a side
//              valley (dead ends: no new route between points)
//   mountains  everywhere else: the planet's style noise (mesa terraces, alpine ridges, rolling highlands cut by
//              gorges, volcanic ridges and cones) mountainMetres above the nearest floor, rising over wallBandMetres from
//              a corridor's edge (walls far steeper than any slope limit: the routes between points are the corridors)
//
// The map's mirror (MapDef.mirror, axis x) is respected exactly: the height at x is the height at the mirrored x.
// Deterministic: integer hashing (Math.imul), + - * /, Math.sqrt, Math.floor and fmath dsin only, so every engine builds
// the same heights from (planet, terrain seed); host and guests build it themselves and the checkpoint carries its hash.
//
// Rules (terrain.json relief; active only on a planet listed in relief.planets, so Halcyon plays exactly as before):
//   slopeSpeed  ground units climbing (grade along their motion) slow linearly from 1 at fromDegrees to
//               multiplierAtLimit at their class's slope limit (terrain.json slopeLimitsDegrees); downhill no change.
//               A* charges the same factor on a cell's steepest grade
//   movement    a ground unit (pilots on foot included) never steps from a cell its class may climb into a too-steep one
//               (the pathfinding grid's slope bits); a hopping hover vehicle passes only where its body is above the
//               ground ahead (ruling 112: the hop clears low ridges, not mountains); aircraft and airborne pilots fly over
//   highGround  a unit higher than its target by more than fromMetres gains up to sightBonus visual range and
//               rangeBonus weapon range (linear up to fullMetres); radar is not affected
//   build       construction refuses a site steeper than buildSlopeDegrees (reason terrainUnbuildable)
const fmath_ts_1 = require("./fmath.js");
const pathfinding_ts_1 = require("./pathfinding.js");
/** The relief section of terrain.json, or null. */
function reliefDef(data) {
    const r = data.terrain?.relief;
    return r && typeof r === "object" && r.planets ? r : null;
}
/** The planet's relief definition, or null (Halcyon: none). */
function reliefPlanet(data, planetId) {
    return reliefDef(data)?.planets?.[planetId] ?? null;
}
// ------------------------------------------------------------------ rules
const CLASS_NAMES = ["infantry", "bike", "light", "medium", "heavy", "walker"]; // W1: movement classes 0..5 (data.ts tMove)
const tanDeg = (deg) => { const a = deg * 3.141592653589793 / 180; return (0, fmath_ts_1.dsin)(a) / (0, fmath_ts_1.dcos)(a); };
/** Rules of the planet's relief, or null when the planet has none (every rule off). */
function compileReliefRules(data, planetId) {
    const R = reliefDef(data);
    if (!R || !R.planets[planetId])
        return null;
    const lim = data.terrain?.slopeLimitsDegrees;
    const tanLim = new Float64Array(CLASS_NAMES.length);
    for (let k = 0; k < CLASS_NAMES.length; k++) {
        const d = lim?.[CLASS_NAMES[k]];
        tanLim[k] = typeof d === "number" && d > 0 && d < 90 ? tanDeg(d) : Infinity;
    }
    const b = tanDeg(R.buildSlopeDegrees);
    return {
        tanFrom: tanDeg(R.slopeSpeed.fromDegrees), tanLim, atLimit: R.slopeSpeed.multiplierAtLimit,
        hgFrom: R.highGround.fromMetres, hgFull: R.highGround.fullMetres, hgSight: R.highGround.sightBonus, hgRange: R.highGround.rangeBonus,
        build2: b * b,
    };
}
/** Speed factor of movement class cls (0..5, data.ts tMove) climbing a grade (tan, rise over run); 1 downhill or below fromDegrees. */
function slopeSpeedFactor(R, cls, grade) {
    if (!(grade > R.tanFrom) || cls < 0 || cls >= R.tanLim.length)
        return 1;
    const lim = R.tanLim[cls];
    if (!(lim > R.tanFrom) || lim === Infinity)
        return 1;
    let k = (grade - R.tanFrom) / (lim - R.tanFrom);
    if (k > 1)
        k = 1;
    return 1 - (1 - R.atLimit) * k;
}
/** High-ground factor 0..1 for a height advantage dh (m). */
function highGroundK(R, dh) {
    if (!(dh > R.hgFrom))
        return 0;
    const k = (dh - R.hgFrom) / (R.hgFull - R.hgFrom);
    return k > 1 ? 1 : k;
}
// ------------------------------------------------------------------ noise (integer hash value noise)
function hash2(i, j, seed) {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
const sm = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
/** Smooth value noise in [0, 1). */
function vnoise(x, z, seed) {
    const i = Math.floor(x), j = Math.floor(z), fx = sm(x - i), fz = sm(z - j);
    const a = hash2(i, j, seed), b = hash2(i + 1, j, seed), c = hash2(i, j + 1, seed), d = hash2(i + 1, j + 1, seed);
    const ab = a + (b - a) * fx, cd = c + (d - c) * fx;
    return ab + (cd - ab) * fz;
}
function fbm(x, z, seed, oct) {
    let s = 0, a = 1, n = 0, f = 1;
    for (let o = 0; o < oct; o++) {
        s += a * vnoise(x * f, z * f, seed + o * 17);
        n += a;
        a *= 0.5;
        f *= 2.03;
    }
    return s / n;
}
/** Ridged noise in [0, 1]: 1 on the ridge lines. */
function ridged(x, z, seed, oct) {
    let s = 0, a = 1, n = 0, f = 1, w = 1;
    for (let o = 0; o < oct; o++) {
        let r = 1 - Math.abs(2 * vnoise(x * f, z * f, seed + o * 31) - 1);
        r = r * r * w;
        w = clamp01(r * 1.6);
        s += a * r;
        n += a;
        a *= 0.5;
        f *= 2.1;
    }
    return s / n;
}
/** Distance beyond a feature's edge at which it stops weighing in the floor blend (m). */
const REACH = 420;
/** Terrain types whose layer blobs become valley-floor basins. */
const BASIN_TYPES = new Set(["liquid", "canyon", "crater-field", "soft-ground", "ice-glass-flats", "rock-forest-ruins"]);
/** A built relief: height(x, z) defined everywhere (also beyond the map), the pads and corridors it was built from. */
class Relief {
    def;
    seed;
    mapSize;
    pads = [];
    corrs = [];
    basins = [];
    mc;
    mirror;
    cellM = 50;
    /** Volcanic cones (centre, radius) in map coordinates (folded side). */
    cones = [];
    constructor(inp) {
        const D = inp.def;
        this.def = D;
        this.mapSize = inp.mapSize;
        this.seed = (Math.imul(inp.seed | 0, 7919) + (D.seed | 0)) | 0;
        this.mirror = !!inp.mirror && inp.mirror.axis === "x";
        this.mc = this.mirror ? inp.mirror.centre : 0;
        const byId = new Map(inp.points.map((p, i) => [p.id, i]));
        // pads: height by point type + a jitter hashed from the folded position (mirror pairs get the same height)
        for (const p of inp.points) {
            const fx = Math.round(this.fold(p.x)), j = (hash2(fx, Math.round(p.z), this.seed ^ 0x51a) - 0.5) * 2 * D.levelJitterMetres;
            this.pads.push({ x: p.x, z: p.z, r: p.radius + D.padMarginMetres, h: D.floorMetres + (D.levels[p.type] ?? 0) + j });
        }
        // corridors along the links, each once, bent like g1-terrain trackSegments (the worn tracks stay in the corridor)
        const seen = new Set();
        inp.points.forEach((p, ia) => {
            for (const l of p.links ?? []) {
                const ib = byId.get(l);
                if (ib === undefined)
                    continue;
                const key = ia < ib ? `${ia}|${ib}` : `${ib}|${ia}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                const q = inp.points[ib];
                this.addCorr(p.x, p.z, q.x, q.z, this.pads[ia], this.pads[ib], D.corridorHalfWidthMetres, D.passPinch, true);
            }
        });
        if (inp.layer)
            this.addBasins(inp.layer);
        if (D.style === "volcanic") {
            // cones in the open quarters (north and south of the point network), mirrored by the fold
            const S = inp.mapSize;
            const cand = [[0.17, 0.12], [0.4, 0.08], [0.1, 0.9], [0.38, 0.93], [0.03, 0.5]];
            for (let k = 0; k < cand.length; k++) {
                const jx = (hash2(k, 3, this.seed) - 0.5) * 0.06, jz = (hash2(k, 5, this.seed) - 0.5) * 0.05;
                this.cones.push([(cand[k][0] + jx) * S, (cand[k][1] + jz) * S, (0.09 + 0.05 * hash2(k, 7, this.seed)) * S]);
            }
        }
    }
    fold(x) { return this.mirror ? (x > this.mc ? 2 * this.mc - x : x) : x; }
    addCorr(ax, az, bx, bz, pa, pb, w, pinch, bend, hb) {
        const dx = bx - ax, dz = bz - az, L = Math.sqrt(dx * dx + dz * dz) || 1;
        const bd = bend ? (0, fmath_ts_1.dsin)(ax * 0.013 + bz * 0.011) * 0.08 * L : 0;
        const mx = (ax + bx) / 2 - (dz / L) * bd, mz = (az + bz) / 2 + (dx / L) * bd;
        const l1 = Math.sqrt((mx - ax) * (mx - ax) + (mz - az) * (mz - az)) || 1, l2 = Math.sqrt((bx - mx) * (bx - mx) + (bz - mz) * (bz - mz)) || 1;
        this.corrs.push({ ax, az, mx, mz, bx, bz, l1, l2, ra: pa.r, rb: pb ? pb.r : 20, ha: pa.h, hb: pb ? pb.h : hb, w, pinch });
    }
    addBasins(L) {
        const D = this.def, cm = L.cellMetres, rows = L.rows.length, cols = L.rows[0]?.length ?? 0;
        const typeOf = (ch) => { const v = L.legend[ch]; return v === undefined ? "" : typeof v === "string" ? v : v.type; };
        const mark = new Int32Array(rows * cols).fill(-1);
        let blobs = 0;
        for (let j = 0; j < rows; j++)
            for (let i = 0; i < cols; i++) {
                const c = j * cols + i;
                if (mark[c] >= 0 || !BASIN_TYPES.has(typeOf(L.rows[j][i])))
                    continue;
                // flood fill (4-connected, same basin-type family)
                const stack = [c], cells = [];
                mark[c] = blobs;
                while (stack.length) {
                    const k = stack.pop(), ki = k % cols, kj = (k - ki) / cols;
                    cells.push(ki, kj);
                    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const ni = ki + di, nj = kj + dj;
                        if (ni < 0 || nj < 0 || ni >= cols || nj >= rows)
                            continue;
                        const n = nj * cols + ni;
                        if (mark[n] >= 0 || !BASIN_TYPES.has(typeOf(L.rows[nj][ni])))
                            continue;
                        mark[n] = blobs;
                        stack.push(n);
                    }
                }
                blobs++;
                // nearest point (pad centre to cell centre) and the nearest cell to it
                let best = -1, bd = Infinity, bcx = 0, bcz = 0;
                for (let k = 0; k < cells.length; k += 2) {
                    const cx = (cells[k] + 0.5) * cm, cz = (cells[k + 1] + 0.5) * cm;
                    for (let p = 0; p < this.pads.length; p++) {
                        const P = this.pads[p], d2 = (P.x - cx) * (P.x - cx) + (P.z - cz) * (P.z - cz);
                        if (d2 < bd) {
                            bd = d2;
                            best = p;
                            bcx = cx;
                            bcz = cz;
                        }
                    }
                }
                if (best < 0)
                    continue;
                const P = this.pads[best];
                // a blob that touches a pad is part of that pad's ground (no basin)
                if (Math.sqrt(bd) < P.r)
                    continue;
                const deep = cells.length > 0 && (typeOf(L.rows[cells[1]][cells[0]]) === "canyon" || typeOf(L.rows[cells[1]][cells[0]]) === "liquid") ? 1.5 : 1;
                const h = P.h - D.basinDepthMetres * deep;
                let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
                const cf = new Float64Array(cells.length);
                for (let k = 0; k < cells.length; k += 2) {
                    cf[k] = cells[k] * cm;
                    cf[k + 1] = cells[k + 1] * cm;
                    if (cf[k] < x0)
                        x0 = cf[k];
                    if (cf[k + 1] < z0)
                        z0 = cf[k + 1];
                    if (cf[k] + cm > x1)
                        x1 = cf[k] + cm;
                    if (cf[k + 1] + cm > z1)
                        z1 = cf[k + 1] + cm;
                }
                this.basins.push({ x0, z0, x1, z1, cells: cf, h });
                // the side valley from the point to the blob (ramp from the pad's height to the basin's)
                this.addCorr(P.x, P.z, bcx, bcz, P, null, D.corridorHalfWidthMetres * 0.8, 1, false, h);
            }
        this.cellM = cm;
    }
    /** Height at (x, z) in metres (defined everywhere). */
    height(x0, z) {
        const D = this.def, x = this.fold(x0), seed = this.seed;
        // floor blend over every feature: weight 1 inside, falling with the distance beyond its edge
        // a faint background floor (mid level) so the blend is defined far from every feature (map corners, beyond the map)
        let wsum = 1e-9, hsum = 1e-9 * (D.floorMetres + (D.levels["chokepoint"] ?? 0)), emin = Infinity, padIn = 0;
        for (let i = 0; i < this.pads.length; i++) {
            const P = this.pads[i], dx = x - P.x, dz = z - P.z, e = Math.sqrt(dx * dx + dz * dz) - P.r;
            const w = this.wgt(e);
            wsum += w;
            hsum += w * P.h;
            if (e < emin)
                emin = e;
            const pin = clamp01(-e / 25); // 1 well inside the pad
            if (pin > padIn)
                padIn = pin;
        }
        for (let i = 0; i < this.corrs.length; i++) {
            const C = this.corrs[i];
            // distance to the two-segment centreline and the arc length there
            let d2 = Infinity, s = 0;
            {
                const ux = C.mx - C.ax, uz = C.mz - C.az;
                let t = ((x - C.ax) * ux + (z - C.az) * uz) / (C.l1 * C.l1);
                t = clamp01(t);
                const ex = C.ax + ux * t - x, ez = C.az + uz * t - z, q = ex * ex + ez * ez;
                if (q < d2) {
                    d2 = q;
                    s = t * C.l1;
                }
            }
            {
                const ux = C.bx - C.mx, uz = C.bz - C.mz;
                let t = ((x - C.mx) * ux + (z - C.mz) * uz) / (C.l2 * C.l2);
                t = clamp01(t);
                const ex = C.mx + ux * t - x, ez = C.mz + uz * t - z, q = ex * ex + ez * ez;
                if (q < d2) {
                    d2 = q;
                    s = C.l1 + t * C.l2;
                }
            }
            const Lt = C.l1 + C.l2, run = Lt - C.ra - C.rb;
            let u = run > 1 ? (s - C.ra) / run : 0.5;
            u = clamp01(u);
            const uu = 0.5 * u + 0.5 * sm(u);
            // the pass: narrowest half-way between the pads
            const mid = 4 * u * (1 - u), w = C.w * (1 - (1 - C.pinch) * mid);
            const e = Math.sqrt(d2) - w;
            const h = C.ha + (C.hb - C.ha) * uu;
            const wt = this.wgt(e);
            wsum += wt;
            hsum += wt * h;
            if (e < emin)
                emin = e;
        }
        if (this.basins.length) {
            // basins: each layer cell a disc (rounded blob edges), the edge wobbling by up to 18 m
            const bxw = x + (vnoise(x / 60, z / 60, seed + 23) - 0.5) * 36, bzw = z + (vnoise(x / 60, z / 60, seed + 29) - 0.5) * 36;
            const cm = this.cellM, h = cm * 0.5, rad = cm * 0.62;
            for (let i = 0; i < this.basins.length; i++) {
                const B = this.basins[i];
                const bx = bxw < B.x0 ? B.x0 - bxw : bxw > B.x1 ? bxw - B.x1 : 0, bz = bzw < B.z0 ? B.z0 - bzw : bzw > B.z1 ? bzw - B.z1 : 0;
                if (bx * bx + bz * bz > REACH * REACH)
                    continue;
                let q = Infinity;
                for (let k = 0; k < B.cells.length; k += 2) {
                    const ex = bxw - B.cells[k] - h, ez = bzw - B.cells[k + 1] - h, r = ex * ex + ez * ez;
                    if (r < q)
                        q = r;
                }
                const e = Math.sqrt(q) - rad - 4;
                const wt = this.wgt(e) * 1.5;
                wsum += wt;
                hsum += wt * B.h;
                if (e < emin)
                    emin = e;
            }
        }
        let floor = hsum / wsum;
        // gentle undulation of corridor floors (none on the pads: buildable)
        floor += (vnoise(x / 70, z / 70, seed + 3) - 0.5) * 3.2 * (1 - padIn);
        // mountains: rise from the corridor edge over the wall band
        const m = sm(clamp01(emin / D.wallBandMetres));
        if (m <= 0)
            return floor;
        const n = this.styleNoise(x, z, emin);
        const lo = D.mountainMetres[0], hi = D.mountainMetres[1];
        return floor + m * (lo + (hi - lo) * n);
    }
    /** Floor weight of a feature e metres beyond its edge: 1 inside, falling fast, exactly 0 from REACH on (continuous). */
    wgt(e) {
        if (e <= 0)
            return 1;
        if (e >= REACH)
            return 0;
        const k = 1 + e / 18, k2 = k * k, c = 1 - e / REACH, c2 = c * c;
        return (c2 * c2) / (k2 * k2);
    }
    /** The planet's mountain shape in [0, 1] (may dip below 0 in Brume's gorges). emin: distance beyond the nearest floor's edge. */
    styleNoise(x, z, emin) {
        const seed = this.seed;
        // domain warp: organic shapes
        const wx = x + (vnoise(x / 380, z / 380, seed + 41) - 0.5) * 220, wz = z + (vnoise(x / 380, z / 380, seed + 43) - 0.5) * 220;
        switch (this.def.style) {
            case "mesa": {
                // Rust: flat-topped mesas in steps with sheer risers, a few buttes, fine grit on the faces
                const b = fbm(wx / 520, wz / 520, seed + 5, 3) * 1.25 - 0.1 + 0.25 * clamp01(emin / 400);
                const steps = 4, v = clamp01(b) * steps, k = Math.floor(v), f = v - k;
                const t = (k + sm(clamp01((f - 0.62) / 0.38))) / steps;
                return 0.08 + 0.92 * t + (vnoise(x / 23, z / 23, seed + 9) - 0.5) * 0.03;
            }
            case "alpine": {
                // Pale: jagged ridged peaks, higher away from the valleys
                const r = ridged(wx / 640, wz / 640, seed + 7, 5);
                const base = fbm(wx / 900, wz / 900, seed + 8, 2);
                return clamp01(0.15 + 0.95 * r * (0.55 + 0.6 * base) * (0.7 + 0.3 * clamp01(emin / 300)) + (vnoise(x / 31, z / 31, seed + 9) - 0.5) * 0.05);
            }
            case "highland": {
                // Brume: rounded rolling highlands, cut by deep narrow gorges
                const roll = fbm(wx / 600, wz / 600, seed + 11, 4);
                const g = 1 - Math.abs(2 * vnoise(wx / 520, wz / 520, seed + 13) - 1);
                const gorge = sm(clamp01((g - 0.86) / 0.14)) * clamp01((emin - 40) / 90);
                return 0.1 + 0.8 * roll - 1.25 * gorge;
            }
            default: {
                // Cinder: long sharp basalt ridges and volcanic cones with summit craters
                const r = ridged(wx / 700, wz / 340, seed + 17, 4);
                let c = 0;
                for (const [cx, cz, cr] of this.cones) {
                    const dx = x - cx, dz = z - cz, d = Math.sqrt(dx * dx + dz * dz) / cr;
                    if (d >= 1)
                        continue;
                    let v = (1 - d) * (1 - d) * 1.6;
                    if (d < 0.16)
                        v -= (0.16 - d) * 4.5; // summit crater
                    if (v > c)
                        c = v;
                }
                return clamp01(0.12 + 0.7 * r + (vnoise(x / 27, z / 27, seed + 19) - 0.5) * 0.06) + c;
            }
        }
    }
    /** The heightmap (vertex (i, j) at (i * cell, j * cell)). */
    heightmap(cell) {
        const n = Math.round(this.mapSize / cell) + 1, h = new Float64Array(n * n);
        for (let j = 0; j < n; j++)
            for (let i = 0; i < n; i++)
                h[j * n + i] = this.height(i * cell, j * cell);
        return { cellSize: cell, cols: n, rows: n, heights: h };
    }
}
exports.Relief = Relief;
/** Terrain seed of the scenario runner and the page (the page's ?seed default). */
exports.RELIEF_DEFAULT_SEED = 7;
/** Heightmap cell of planet relief (the page's terrain mesh cell). */
exports.RELIEF_CELL = 8;
/** The relief of a scenario's planet on its map, or null when the planet has none. */
function scenarioRelief(data, planetId, mapSize, map, layer, seed = exports.RELIEF_DEFAULT_SEED) {
    const def = reliefPlanet(data, planetId);
    if (!def)
        return null;
    return new Relief({ mapSize, def, seed, points: (map.points ?? []), mirror: map.mirror ?? null, layer: layer ?? null });
}
/**
 * T1: the sim's relief step rule (Sim.slopeOk without the hop: Nav.slopeStepOk on the slope bits of the pathfinding
 * grid, computed per cell exactly as the Nav constructor does) for movement class cls, for the client's own-body
 * predictors. Terrain-layer cells are not included (the predictors do not model them). null: no relief on the planet.
 */
function reliefStepRule(data, planetId, mapSize, cls, height) {
    const nr = (0, pathfinding_ts_1.compileNavRules)(data);
    if (!compileReliefRules(data, planetId) || !nr || cls < 0 || cls >= nr.tan2.length)
        return null;
    const c = nr.cell, h = c * 0.5, n = Math.max(1, Math.ceil(mapSize / c)), lim = nr.tan2[cls];
    const memo = new Int8Array(n * n).fill(-1);
    const cellOf = (x, z) => {
        let i = Math.floor(x / c), j = Math.floor(z / c);
        if (i < 0)
            i = 0;
        else if (i >= n)
            i = n - 1;
        if (j < 0)
            j = 0;
        else if (j >= n)
            j = n - 1;
        return j * n + i;
    };
    const steep = (k) => {
        if (memo[k] < 0) {
            const i = k % n, j = (k - i) / n, x = (i + 0.5) * c, z = (j + 0.5) * c;
            const gx = (height(x + h, z) - height(x - h, z)) / c, gz = (height(x, z + h) - height(x, z - h)) / c;
            memo[k] = gx * gx + gz * gz > lim ? 1 : 0;
        }
        return memo[k] === 1;
    };
    return (ox, oz, nx, nz) => !steep(cellOf(nx, nz)) || steep(cellOf(ox, oz));
}
