"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MM_STEEP_TAN = exports.MM_COL = exports.MM_CLUSTER_MIN = exports.MM_CLUSTER_PX = exports.MM_SIZE = void 0;
exports.bakeTerrain = bakeTerrain;
exports.clusterMarks = clusterMarks;
// H1 (designer playtest 15 Nov: "minimap too hard to read"): the minimap's terrain base (baked once: a few flat height
// bands with thin contour lines and a soft hillshade, so the shape of the ground reads without noise), its colours, and
// the grouping of dense unit clusters into one counted mark. Drawing itself is in main.ts (drawMinimap).
const terrain_gen_ts_1 = require("./terrain-gen.js");
/** Minimap size on screen (CSS px). */
exports.MM_SIZE = 224;
/** Marks of one side closer than this (CSS px) merge into one counted cluster mark when there are at least MM_CLUSTER_MIN. */
exports.MM_CLUSTER_PX = 12;
exports.MM_CLUSTER_MIN = 4;
exports.MM_COL = {
    own: "#3ec9ff", ownPilot: "#c8f6ff", ally: "#9dff5a", enemy: "#ff4a2e", empty: "#b4bcba", you: "#ffffff",
    ore: "#ffb83c", gas: "#5dff8a", spent: "#7a7a72", outline: "rgba(8,10,10,0.9)", rally: "#ffd23c",
};
/** Height-band ramps (low to high): field view and the dark tactical display. */
const BANDS_FIELD = [[30, 40, 33], [44, 58, 44], [62, 76, 54], [88, 96, 66], [122, 124, 92]];
const BANDS_TAC = [[8, 26, 30], [12, 38, 42], [18, 52, 56], [26, 68, 70], [38, 88, 88]];
/**
 * Bakes the terrain base at `res` x `res` pixels (ImageData), smoothed so small bumps do not show. relief (T1, ruling
 * 116): a planet with mountains: a stronger hillshade, and ground too steep for vehicles (steeper than MM_STEEP_TAN)
 * drawn as dark rock so the corridors and passes read.
 */
exports.MM_STEEP_TAN = 0.58;
function bakeTerrain(hm, mapSize, res, tactical, relief = false) {
    const N = res, h = new Float32Array(N * N);
    for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++)
            h[j * N + i] = (0, terrain_gen_ts_1.sampleHeight)(hm, ((i + 0.5) / N) * mapSize, ((j + 0.5) / N) * mapSize);
    const steep = new Uint8Array(N * N);
    if (relief)
        for (let j = 0; j < N; j++)
            for (let i = 0; i < N; i++) {
                const x = ((i + 0.5) / N) * mapSize, z = ((j + 0.5) / N) * mapSize, e = 4;
                const gx = ((0, terrain_gen_ts_1.sampleHeight)(hm, x + e, z) - (0, terrain_gen_ts_1.sampleHeight)(hm, x - e, z)) / (2 * e), gz = ((0, terrain_gen_ts_1.sampleHeight)(hm, x, z + e) - (0, terrain_gen_ts_1.sampleHeight)(hm, x, z - e)) / (2 * e);
                steep[j * N + i] = gx * gx + gz * gz > exports.MM_STEEP_TAN * exports.MM_STEEP_TAN ? 1 : 0;
            }
    // two passes of a 3x3 box blur: broad shapes only
    const tmp = new Float32Array(N * N);
    for (let pass = 0; pass < (relief ? 1 : 2); pass++) {
        for (let j = 0; j < N; j++)
            for (let i = 0; i < N; i++) {
                let s = 0, n = 0;
                for (let dj = -1; dj <= 1; dj++)
                    for (let di = -1; di <= 1; di++) {
                        const x = i + di, y = j + dj;
                        if (x >= 0 && y >= 0 && x < N && y < N) {
                            s += h[y * N + x];
                            n++;
                        }
                    }
                tmp[j * N + i] = s / n;
            }
        h.set(tmp);
    }
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < h.length; k++) {
        if (h[k] < lo)
            lo = h[k];
        if (h[k] > hi)
            hi = h[k];
    }
    const ramp = tactical ? BANDS_TAC : BANDS_FIELD, nb = ramp.length, span = Math.max(1e-6, hi - lo);
    const band = new Uint8Array(N * N);
    for (let k = 0; k < h.length; k++)
        band[k] = Math.min(nb - 1, Math.floor(((h[k] - lo) / span) * nb));
    const px = new Uint8ClampedArray(N * N * 4);
    const cell = mapSize / N;
    for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
            const k = j * N + i, c = ramp[band[k]];
            // soft hillshade from the north-west (a few percent): slopes read, flat ground stays flat
            const hx = h[j * N + Math.min(N - 1, i + 1)] - h[j * N + Math.max(0, i - 1)], hz = h[Math.min(N - 1, j + 1) * N + i] - h[Math.max(0, j - 1) * N + i];
            const sk = relief ? 0.38 : 0.14, shade = Math.max(-sk, Math.min(sk, -(hx + hz) / (cell * 2) * (relief ? 0.9 : 0.6)));
            // contour: the edge of a band (darker line)
            const edge = (i + 1 < N && band[k + 1] !== band[k]) || (j + 1 < N && band[k + N] !== band[k]);
            const m = (edge ? 0.62 : 1 + shade) * (steep[k] ? 0.62 : 1);
            px[k * 4] = c[0] * m;
            px[k * 4 + 1] = c[1] * m;
            px[k * 4 + 2] = c[2] * m;
            px[k * 4 + 3] = 255;
        }
    return typeof ImageData === "function" ? new ImageData(px, N, N) : { width: N, height: N, data: px };
}
/** Groups marks of the same key within MM_CLUSTER_PX: groups of MM_CLUSTER_MIN or more come back as clusters (centre, count),
 *  the rest as single marks (their indices). */
function clusterMarks(marks, cellPx = exports.MM_CLUSTER_PX, min = exports.MM_CLUSTER_MIN) {
    const cells = new Map();
    marks.forEach((m, i) => { const c = `${m.key}|${Math.floor(m.x / cellPx)}|${Math.floor(m.y / cellPx)}`; const a = cells.get(c); if (a)
        a.push(i);
    else
        cells.set(c, [i]); });
    const singles = [], clusters = [];
    for (const ids of cells.values()) {
        if (ids.length < min) {
            singles.push(...ids);
            continue;
        }
        let sx = 0, sy = 0;
        for (const i of ids) {
            sx += marks[i].x;
            sy += marks[i].y;
        }
        clusters.push({ x: sx / ids.length, y: sy / ids.length, key: marks[ids[0]].key, n: ids.length });
    }
    return { singles, clusters };
}
