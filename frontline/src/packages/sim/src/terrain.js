"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlatTerrain = exports.Terrain = void 0;
// Grid heightfield with bilinear interpolation. Map coordinates are metres in
// [0, mapSize] on x and z; y is up. Either generated from a seeded PRNG stream
// that is independent of gameplay randomness (using only + - * /, so it is
// bit-identical everywhere), or injected by the caller (an authored heightmap).
const prng_ts_1 = require("./prng.js");
class Terrain {
    size;
    cell;
    cols; // vertices along x
    rows; // vertices along z
    h;
    maxHeight; // highest vertex (bilinear patches never exceed their vertices)
    /** true: caller-provided heightmap (exported with the state); false: generated from the seed. */
    injected;
    constructor(size, cell, cols, rows, h, injected) {
        this.size = size;
        this.cell = cell;
        this.cols = cols;
        this.rows = rows;
        this.h = h;
        this.injected = injected;
        let top = -Infinity;
        for (let i = 0; i < h.length; i++)
            if (h[i] > top)
                top = h[i];
        this.maxHeight = top;
    }
    /** Seeded synthetic terrain (stage-0 stand-in for the authored map). */
    static generate(mapSize, cellSize, amplitude, smoothPasses, seed) {
        const n = Math.ceil(mapSize / cellSize) + 1;
        let a = new Float64Array(n * n);
        const rng = new prng_ts_1.Prng(seed, 0x7e44a1);
        for (let i = 0; i < a.length; i++)
            a[i] = rng.signed();
        let b = new Float64Array(n * n);
        for (let p = 0; p < smoothPasses; p++) {
            for (let j = 0; j < n; j++) {
                for (let i = 0; i < n; i++) {
                    let s = 0, c = 0;
                    for (let dj = -1; dj <= 1; dj++) {
                        const jj = j + dj;
                        if (jj < 0 || jj >= n)
                            continue;
                        for (let di = -1; di <= 1; di++) {
                            const ii = i + di;
                            if (ii < 0 || ii >= n)
                                continue;
                            s += a[jj * n + ii];
                            c++;
                        }
                    }
                    b[j * n + i] = s / c;
                }
            }
            const t = a;
            a = b;
            b = t;
        }
        let max = 0;
        for (let i = 0; i < a.length; i++) {
            const v = Math.abs(a[i]);
            if (v > max)
                max = v;
        }
        const k = max > 0 ? amplitude / max : 0;
        for (let i = 0; i < a.length; i++)
            a[i] = a[i] * k;
        return new Terrain(mapSize, cellSize, n, n, a, false);
    }
    /** Caller-provided heightmap (copied). Throws on a malformed grid. */
    static fromHeightmap(mapSize, hm) {
        const { cellSize, cols, rows } = hm;
        if (!(cellSize > 0) || !Number.isFinite(cellSize))
            throw new Error("heightmap.cellSize must be a finite number > 0");
        if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2)
            throw new Error("heightmap.cols and rows must be integers >= 2");
        if (!hm.heights || hm.heights.length !== cols * rows)
            throw new Error(`heightmap.heights must have cols x rows = ${cols * rows} values (got ${hm.heights?.length})`);
        const h = new Float64Array(cols * rows);
        for (let i = 0; i < h.length; i++) {
            const v = hm.heights[i];
            if (typeof v !== "number" || !Number.isFinite(v))
                throw new Error(`heightmap.heights[${i}] is not a finite number`);
            h[i] = v;
        }
        return new Terrain(mapSize, cellSize, cols, rows, h, true);
    }
    height(x, z) {
        const nx = this.cols, nz = this.rows;
        let fx = x / this.cell, fz = z / this.cell;
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
        const tx = fx - i, tz = fz - j;
        const h = this.h, o = j * nx + i;
        const h0 = h[o] + (h[o + 1] - h[o]) * tx;
        const h1 = h[o + nx] + (h[o + nx + 1] - h[o + nx]) * tx;
        return h0 + (h1 - h0) * tz;
    }
}
exports.Terrain = Terrain;
/** Flat terrain (used by tests that need exact geometry). */
class FlatTerrain {
    size;
    maxHeight = 0;
    cell = 0;
    constructor(mapSize) { this.size = mapSize; }
    height(_x, _z) { return 0; }
}
exports.FlatTerrain = FlatTerrain;
