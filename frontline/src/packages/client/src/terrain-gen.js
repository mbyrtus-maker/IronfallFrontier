"use strict";
// Shared heightmap for client and sim. Generated once on the main thread from a
// seed, injected into the sim with createSim({ heightmap }) and used to build
// the terrain mesh, so both agree on every vertex. Sampling below is the same
// bilinear rule as the sim's Terrain.height (vertex (i, j) at (i*cell, j*cell),
// clamped at the edges).
Object.defineProperty(exports, "__esModule", { value: true });
exports.valueNoise = valueNoise;
exports.rawHeight = rawHeight;
exports.generateHeightmap = generateHeightmap;
exports.sampleHeight = sampleHeight;
exports.sampleNormal = sampleNormal;
/** Small deterministic hash -> [0, 1). */
function hash2(i, j, seed) {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
/** Smooth value noise in [0, 1) (also used for terrain colouring). */
function valueNoise(x, z, seed) {
    const i = Math.floor(x), j = Math.floor(z), fx = smooth(x - i), fz = smooth(z - j);
    const a = hash2(i, j, seed), b = hash2(i + 1, j, seed), c = hash2(i, j + 1, seed), d = hash2(i + 1, j + 1, seed);
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
}
/** Raw height of the rolling hills at (x, z) before the map's offset (defined everywhere, also beyond the map). */
function rawHeight(x, z, mapSize, seed, shape) {
    let v = 36 * valueNoise(x / 650, z / 650, seed) + 11 * valueNoise(x / 210, z / 210, seed + 1) + 2.2 * valueNoise(x / 60, z / 60, seed + 2);
    // long gentle valley along the battle axis (x), so the two bases see each other
    const dz = (z - mapSize / 2) / (mapSize * 0.5);
    v += 26 * dz * dz;
    let keep = 1;
    for (const f of shape.flats) {
        const d = Math.hypot(x - f.x, z - f.z) / f.r;
        if (d < 1)
            keep = Math.min(keep, 0.25 + 0.75 * smooth(d));
    }
    const base = 20; // the level the flats blend toward
    let h = base + (v - base) * keep;
    // Frontline: rock walls (capsules a-b, radius r, height h) that pinch a lane into a pass
    for (const w of shape.walls ?? []) {
        const vx = w.b[0] - w.a[0], vz = w.b[1] - w.a[1], l2 = vx * vx + vz * vz;
        const u = Math.max(0, Math.min(1, ((x - w.a[0]) * vx + (z - w.a[1]) * vz) / l2));
        const d = Math.hypot(x - w.a[0] - u * vx, z - w.a[1] - u * vz) / w.r;
        if (d < 1)
            h += w.h * smooth(Math.min(1, (1 - d) * 1.6)) * (0.85 + 0.3 * valueNoise(x / 18, z / 18, seed + 9));
    }
    return h;
}
/**
 * Gently rolling hills: three octaves of value noise (wavelengths ~650, ~210
 * and ~60 m; amplitudes 36, 11 and 2.2 m), softened inside the flat areas.
 * `offset` is subtracted from rawHeight so the lowest vertex of the map is 0.
 */
function generateHeightmap(mapSize, cellSize, seed, shape) {
    const cols = Math.round(mapSize / cellSize) + 1, rows = cols;
    const h = new Float64Array(cols * rows);
    let min = Infinity;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const v = rawHeight(i * cellSize, j * cellSize, mapSize, seed, shape);
            h[j * cols + i] = v;
            if (v < min)
                min = v;
        }
    }
    for (let k = 0; k < h.length; k++)
        h[k] -= min;
    return { cellSize, cols, rows, heights: h, offset: min };
}
/** Bilinear height, the same rule as the sim (packages/sim/src/terrain.ts). */
function sampleHeight(hm, x, z) {
    const nx = hm.cols, nz = hm.rows;
    let fx = x / hm.cellSize, fz = z / hm.cellSize;
    if (fx < 0)
        fx = 0;
    else if (fx > nx - 1)
        fx = nx - 1;
    if (fz < 0)
        fz = 0;
    else if (fz > nz - 1)
        fz = nz - 1;
    let i = Math.floor(fx), j = Math.floor(fz);
    if (i > nx - 2)
        i = nx - 2;
    if (j > nz - 2)
        j = nz - 2;
    const tx = fx - i, tz = fz - j, h = hm.heights, o = j * nx + i;
    const h0 = h[o] + (h[o + 1] - h[o]) * tx, h1 = h[o + nx] + (h[o + nx + 1] - h[o + nx]) * tx;
    return h0 + (h1 - h0) * tz;
}
/** Smooth normal from central differences of the bilinear surface. */
function sampleNormal(hm, x, z, out) {
    const e = hm.cellSize * 0.5;
    const dx = sampleHeight(hm, x + e, z) - sampleHeight(hm, x - e, z);
    const dz = sampleHeight(hm, x, z + e) - sampleHeight(hm, x, z - e);
    let nx = -dx, ny = 2 * e, nz = -dz;
    const l = Math.hypot(nx, ny, nz);
    nx /= l;
    ny /= l;
    nz /= l;
    out[0] = nx;
    out[1] = ny;
    out[2] = nz;
}
