"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerrainLayer = exports.TL_CLASSES = void 0;
/** Movement classes (data.ts tMove): infantry 0, bike 1, light 2, medium 3, heavy 4, walker 5 (W1), air 6. */
exports.TL_CLASSES = 7;
const CLASS_NAMES = ["infantry", "bike", "light", "medium", "heavy", "walker", "air"];
const TL_AIR = 6, TL_GROUND = 6;
class TerrainLayer {
    def;
    defJson;
    cell;
    cols;
    rows;
    /** Per cell: index into typeIds. */
    cellType;
    /** Per cell: 1 lava (liquid with lava: true). */
    lava;
    typeIds;
    /** [type * TL_CLASSES + class] speed factor and passability. */
    speed;
    pass;
    /** Per type: signature factor in the cell; plume factor while moving; breaks line of sight; blocks radar from outside; buildable. */
    sig;
    plume;
    losBreak;
    radarBlock;
    build;
    softType;
    openType;
    lavaDps;
    lavaAfter;
    /** Lava linger: entity id -> seconds spent in lava (state). */
    linger = new Map();
    constructor(def, data) {
        const tj = data.terrain;
        if (!tj || !Array.isArray(tj.types))
            throw new Error("terrainLayer: the data has no terrain.json types");
        if (!(def.cellMetres > 0) || !Array.isArray(def.rows) || def.rows.length === 0)
            throw new Error("terrainLayer: cellMetres > 0 and rows required");
        this.def = def;
        this.defJson = JSON.stringify(def);
        const types = tj.types;
        this.typeIds = types.map((t) => t.id);
        const nt = types.length;
        this.speed = new Float64Array(nt * exports.TL_CLASSES).fill(1);
        this.pass = new Uint8Array(nt * exports.TL_CLASSES).fill(1);
        this.sig = new Float64Array(nt).fill(1);
        this.plume = new Float64Array(nt).fill(1);
        this.losBreak = new Uint8Array(nt);
        this.radarBlock = new Uint8Array(nt);
        this.build = new Uint8Array(nt).fill(1);
        let lavaDps = 0, lavaAfter = 0;
        types.forEach((t, i) => {
            for (let k = 0; k < exports.TL_CLASSES; k++) {
                const name = CLASS_NAMES[k], j = i * exports.TL_CLASSES + k;
                if (k === TL_AIR)
                    continue; // aircraft fly over every terrain at full speed
                if (typeof t.speedMultiplier?.[name] === "number")
                    this.speed[j] *= t.speedMultiplier[name];
                if (Array.isArray(t.slowClimb) && t.slowClimb.includes(name) && typeof t.slowClimbSpeedMultiplier === "number")
                    this.speed[j] *= t.slowClimbSpeedMultiplier;
                if (typeof t.vehicleSpeedMultiplier === "number" && k !== 0 && !(Array.isArray(t.passableFreelyBy) && t.passableFreelyBy.includes(name)))
                    this.speed[j] *= t.vehicleSpeedMultiplier;
                if (Array.isArray(t.passableBy) && !t.passableBy.includes(name))
                    this.pass[j] = 0;
            }
            if (typeof t.signatureMultiplier === "number")
                this.sig[i] = t.signatureMultiplier;
            if (t.raisesSignature === true && typeof t.plumeSignatureMultiplier === "number")
                this.plume[i] = t.plumeSignatureMultiplier;
            if (t.breaksLineOfSight === true)
                this.losBreak[i] = 1;
            if (t.blocksRadarFromOutside === true)
                this.radarBlock[i] = 1;
            if (t.buildable === false)
                this.build[i] = 0;
            if (typeof t.lavaDamagePerSecond === "number") {
                lavaDps = t.lavaDamagePerSecond;
                lavaAfter = t.lavaDamageAfterSeconds ?? 0;
            }
        });
        this.lavaDps = lavaDps;
        this.lavaAfter = lavaAfter;
        this.softType = this.typeIds.indexOf("soft-ground");
        this.openType = this.typeIds.indexOf("open-plain");
        // legend
        const code = new Map();
        for (const [ch, v] of Object.entries(def.legend)) {
            if (ch.length !== 1)
                throw new Error(`terrainLayer legend key "${ch}" must be one character`);
            const id = typeof v === "string" ? v : v.type, lava = typeof v === "string" ? false : v.lava === true;
            const ti = this.typeIds.indexOf(id);
            if (ti < 0)
                throw new Error(`terrainLayer legend "${ch}": unknown terrain type ${id} (terrain.json has ${this.typeIds.join(", ")})`);
            if (lava && id !== "liquid")
                throw new Error(`terrainLayer legend "${ch}": lava only on liquid`);
            code.set(ch, [ti, lava ? 1 : 0]);
        }
        this.cell = def.cellMetres;
        this.rows = def.rows.length;
        this.cols = def.rows[0].length;
        this.cellType = new Uint8Array(this.cols * this.rows);
        this.lava = new Uint8Array(this.cols * this.rows);
        def.rows.forEach((row, j) => {
            if (row.length !== this.cols)
                throw new Error(`terrainLayer row ${j}: ${row.length} cells, expected ${this.cols}`);
            for (let i = 0; i < this.cols; i++) {
                const c = code.get(row[i]);
                if (!c)
                    throw new Error(`terrainLayer row ${j} col ${i}: "${row[i]}" is not in the legend`);
                this.cellType[j * this.cols + i] = c[0];
                this.lava[j * this.cols + i] = c[1];
            }
        });
    }
    /** Cell index at (x, z), clamped to the layer. */
    cellAt(x, z) {
        let i = Math.floor(x / this.cell), j = Math.floor(z / this.cell);
        if (i < 0)
            i = 0;
        else if (i >= this.cols)
            i = this.cols - 1;
        if (j < 0)
            j = 0;
        else if (j >= this.rows)
            j = this.rows - 1;
        return j * this.cols + i;
    }
    /** Terrain type index at (x, z); soft: ash fall (soft ground everywhere) turns open plain into soft ground. */
    typeAt(x, z, soft = false) {
        const t = this.cellType[this.cellAt(x, z)];
        return soft && t === this.openType && this.softType >= 0 ? this.softType : t;
    }
    speedAt(x, z, cls, soft = false) { return cls >= exports.TL_CLASSES ? 1 : this.speed[this.typeAt(x, z, soft) * exports.TL_CLASSES + cls]; }
    passableAt(x, z, cls) { return cls >= exports.TL_CLASSES || this.pass[this.cellType[this.cellAt(x, z)] * exports.TL_CLASSES + cls] === 1; }
    buildableAt(x, z) { return this.build[this.cellType[this.cellAt(x, z)]] === 1; }
    /**
     * Visual sight line from (ax, az) to (bx, bz) crosses a breaksLineOfSight cell other than the two end cells. Sampled
     * every half cell.
     */
    sightBlocked(ax, az, bx, bz) {
        const ca = this.cellAt(ax, az), cb = this.cellAt(bx, bz);
        const dx = bx - ax, dz = bz - az, len = Math.sqrt(dx * dx + dz * dz);
        const n = Math.ceil(len / (this.cell * 0.5));
        for (let k = 1; k < n; k++) {
            const c = this.cellAt(ax + dx * k / n, az + dz * k / n);
            if (c !== ca && c !== cb && this.losBreak[this.cellType[c]] === 1)
                return true;
        }
        return false;
    }
    /** Radar from (ax, az) reaches a target at (bx, bz): not into a blocksRadarFromOutside cell from outside it. */
    radarReaches(ax, az, bx, bz) {
        const tb = this.cellType[this.cellAt(bx, bz)];
        return this.radarBlock[tb] === 0 || this.cellType[this.cellAt(ax, az)] === tb;
    }
    /**
     * Per-class pathfinding grid of nav cells (n x n of size navCell): blocked bit per class (bits 0..5, W1: walker 5) where
     * the cell centre is impassable, and the extra A* cost in tenths per class (round(10 / speed) - 10, at most 250).
     */
    navGrid(n, navCell) {
        const blocked = new Uint8Array(n * n), cost = new Uint8Array(n * n * TL_GROUND);
        for (let j = 0; j < n; j++)
            for (let i = 0; i < n; i++) {
                const x = (i + 0.5) * navCell, z = (j + 0.5) * navCell, c = j * n + i, t = this.cellType[this.cellAt(x, z)];
                let m = 0;
                for (let k = 0; k < TL_GROUND; k++) {
                    if (this.pass[t * exports.TL_CLASSES + k] === 0)
                        m |= 1 << k;
                    const sp = this.speed[t * exports.TL_CLASSES + k];
                    cost[c * TL_GROUND + k] = sp > 0 && sp < 1 ? Math.min(250, Math.round(10 / sp) - 10) : 0;
                }
                blocked[c] = m;
            }
        return { blocked, cost };
    }
    exportTo(w) {
        const ids = Array.from(this.linger.keys()).sort((a, b) => a - b);
        w.u32(ids.length);
        for (const id of ids) {
            w.i32(id);
            w.f64(this.linger.get(id));
        }
    }
    restoreFrom(r) {
        this.linger.clear();
        for (let i = 0, n = r.u32(); i < n; i++) {
            const id = r.i32();
            this.linger.set(id, r.f64());
        }
    }
    hash(word, num, str) {
        str(this.defJson);
        const ids = Array.from(this.linger.keys()).sort((a, b) => a - b);
        word(ids.length);
        for (const id of ids) {
            word(id);
            num(this.linger.get(id));
        }
    }
}
exports.TerrainLayer = TerrainLayer;
