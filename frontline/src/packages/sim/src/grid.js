"use strict";
// Spatial hash over a bounded map. Rebuilt from scratch every tick with a counting
// sort over buckets (cells hash into a power-of-two table). Each entry stores its
// exact cell key so a query never returns entries of a colliding cell, and never
// returns an entry twice. Insertion is in ascending slot order, so query results
// are in a deterministic order.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialGrid = void 0;
class SpatialGrid {
    cellSize;
    cellsPerSide;
    mask;
    bucketStart;
    bucketFill;
    entries; // slot indices, grouped by bucket
    entryKey; // cell key of each entry
    slotKey;
    count = 0;
    constructor(mapSize, cellSize, buckets, capacity) {
        this.cellSize = cellSize;
        this.cellsPerSide = Math.ceil(mapSize / cellSize) + 1;
        let b = 1;
        while (b < buckets)
            b <<= 1;
        this.mask = b - 1;
        this.bucketStart = new Int32Array(b + 1);
        this.bucketFill = new Int32Array(b);
        this.entries = new Int32Array(capacity);
        this.entryKey = new Int32Array(capacity);
        this.slotKey = new Int32Array(capacity);
    }
    cellOf(v) {
        let c = Math.floor(v / this.cellSize);
        if (c < 0)
            c = 0;
        else if (c >= this.cellsPerSide)
            c = this.cellsPerSide - 1;
        return c;
    }
    bucketOf(key) {
        // integer hash (Knuth multiplicative) of the cell key
        return (Math.imul(key, 0x9e3779b1) >>> 16) & this.mask;
    }
    /** slots: list of live slots in ascending order (length n). */
    rebuild(slots, n, xs, zs) {
        if (this.entries.length < xs.length) {
            this.entries = new Int32Array(xs.length);
            this.entryKey = new Int32Array(xs.length);
            this.slotKey = new Int32Array(xs.length);
        }
        const start = this.bucketStart, fill = this.bucketFill;
        start.fill(0);
        const side = this.cellsPerSide;
        for (let k = 0; k < n; k++) {
            const s = slots[k];
            const key = this.cellOf(zs[s]) * side + this.cellOf(xs[s]);
            this.slotKey[s] = key;
            start[this.bucketOf(key) + 1]++;
        }
        for (let i = 1; i < start.length; i++)
            start[i] += start[i - 1];
        for (let i = 0; i < fill.length; i++)
            fill[i] = start[i]; // (no subarray view: no allocation)
        for (let k = 0; k < n; k++) {
            const s = slots[k];
            const key = this.slotKey[s];
            const p = fill[this.bucketOf(key)]++;
            this.entries[p] = s;
            this.entryKey[p] = key;
        }
        this.count = n;
    }
    /**
     * Visit every entry whose cell overlaps the square [x-r, x+r] x [z-r, z+r].
     * The callback receives the slot; return true to stop early.
     */
    query(x, z, r, visit) {
        const side = this.cellsPerSide;
        const c0 = this.cellOf(x - r), c1 = this.cellOf(x + r);
        const r0 = this.cellOf(z - r), r1 = this.cellOf(z + r);
        const start = this.bucketStart, entries = this.entries, ek = this.entryKey;
        for (let cz = r0; cz <= r1; cz++) {
            for (let cx = c0; cx <= c1; cx++) {
                const key = cz * side + cx;
                const b = this.bucketOf(key);
                const e = start[b + 1];
                for (let p = start[b]; p < e; p++) {
                    if (ek[p] !== key)
                        continue;
                    if (visit(entries[p]) === true)
                        return;
                }
            }
        }
    }
}
exports.SpatialGrid = SpatialGrid;
