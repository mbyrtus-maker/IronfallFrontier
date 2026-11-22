"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEWMODEL_AXIS = exports.COCKPITS = exports.MULE_MUZZLES = exports.MUZZLES = exports.EDGE_FLOATS = exports.FBW = exports.FBT = exports.DP = exports.KINDS = exports.UNDER_DARK = exports.EDGE_DARK = exports.GRIT = exports.MeshBuilder = exports.VERTEX_FLOATS = void 0;
exports.buildKind = buildKind;
exports.kindFor = kindFor;
exports.buildEdges = buildEdges;
exports.circleEdges = circleEdges;
exports.puffMesh = puffMesh;
exports.ringMesh = ringMesh;
exports.shieldMesh = shieldMesh;
exports.viewModelMeshes = viewModelMeshes;
exports.oreMesh = oreMesh;
exports.geyserMesh = geyserMesh;
exports.propPalette = propPalette;
exports.rockMesh = rockMesh;
exports.treeMesh = treeMesh;
exports.stumpMesh = stumpMesh;
exports.grassTuftMesh = grassTuftMesh;
exports.bushMesh = bushMesh;
exports.broadleafMesh = broadleafMesh;
exports.pebbleMesh = pebbleMesh;
exports.spireMesh = spireMesh;
exports.dressingMesh = dressingMesh;
const w1_walker_ts_1 = require("./w1-walker.js");
// Procedural low-poly meshes, generated in code (no assets). Flat-shaded: every
// triangle carries its own face normal. Model space: +x forward, +y up, +z to
// the right (the sim's dir (cos yaw, sin yaw) maps model +x to world (dirX, dirZ)).
//
// Vertex layout (11 floats): position 3, normal 3, colour 3, part 1, material 1.
//   part (F3: 10-13 rotor blades, 14-17 rotor blur discs, MeshData.rotors): 0 hull, 1 turret (rotates to the aim about the kind's pivot), 2 gun barrel (turns with the turret and
//         recoils along it when the unit fires), 3 / 4 left / right leg, 5 / 6 left / right arm (infantry walk cycle)
//   material: 0 plain colour, 1 hull (colour x team hull colour), 2 team glow (unlit), 3 engine glow (unlit, dimmer)
exports.VERTEX_FLOATS = 11;
class MeshBuilder {
    d = [];
    part = 0;
    mat = 1;
    col = [1, 1, 1];
    /**
     * P3 (unit graphics pass): per-face wear, 0 off. Each lit face (materials 0 and 1) gets a small fixed brightness
     * variation of up to ±grit (hashed from its centre), and faces turned down are darkened (UNDER_DARK). Vertex
     * colours only: no texture.
     */
    grit = 0;
    set(col, mat = 1, part = this.part) { this.col = col; this.mat = mat; this.part = part; return this; }
    get vertexCount() { return this.d.length / exports.VERTEX_FLOATS; }
    /** Triangle; flipped if needed so its normal points away from `inside`. */
    tri(a, b, c, inside) {
        let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz);
        if (l < 1e-12)
            return;
        nx /= l;
        ny /= l;
        nz /= l;
        if (inside) {
            const cx = (a[0] + b[0] + c[0]) / 3 - inside[0], cy = (a[1] + b[1] + c[1]) / 3 - inside[1], cz = (a[2] + b[2] + c[2]) / 3 - inside[2];
            if (nx * cx + ny * cy + nz * cz < 0) {
                const t = b;
                b = c;
                c = t;
                nx = -nx;
                ny = -ny;
                nz = -nz;
            }
        }
        void ux;
        void uy;
        void uz;
        void vx;
        void vy;
        void vz;
        let col = this.col;
        if (this.grit > 0 && this.mat < 1.5) {
            const h = Math.abs(Math.sin((a[0] + b[0] + c[0]) * 4.31 + (a[1] + b[1] + c[1]) * 7.93 + (a[2] + b[2] + c[2]) * 3.17) * 43758.5453) % 1;
            let f = 1 + this.grit * (h * 2 - 1);
            if (ny < -0.35)
                f *= exports.UNDER_DARK;
            col = [col[0] * f, col[1] * f, col[2] * f];
        }
        for (const p of [a, b, c])
            this.d.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], this.part, this.mat);
    }
    /**
     * P3: a hull lofted along x through cross-sections. Each station is [x, right half of the section as (y, z) points
     * from the bottom up, z > 0]; the left half is mirrored, every station has the same point count and the sections
     * are convex. Both ends are capped. `edge`: indices of right-half segments (k joins point k to k + 1) drawn
     * EDGE_DARK darker on both sides (chamfers read as worn edges). `cz`: centre line z.
     */
    loft(st, edge = [], cz = 0) {
        const m = st[0][1].length, n = m * 2;
        const rings = st.map(([x, r]) => [...r, ...r.slice().reverse().map(([y, z]) => [y, -z])].map(([y, z]) => [x, y, cz + z]));
        const c = [0, 0, 0];
        for (const r of rings)
            for (const p of r) {
                c[0] += p[0] / (rings.length * n);
                c[1] += p[1] / (rings.length * n);
                c[2] += p[2] / (rings.length * n);
            }
        const dark = new Set();
        for (const k of edge) {
            dark.add(k);
            dark.add(n - 2 - k);
        }
        const base = this.col;
        for (let s = 0; s + 1 < rings.length; s++)
            for (let j = 0; j < n; j++) {
                const k = (j + 1) % n;
                if (dark.has(j))
                    this.col = [base[0] * exports.EDGE_DARK, base[1] * exports.EDGE_DARK, base[2] * exports.EDGE_DARK];
                this.poly([rings[s][j], rings[s + 1][j], rings[s + 1][k], rings[s][k]], c);
                this.col = base;
            }
        this.poly(rings[0], c);
        this.poly(rings[rings.length - 1], c);
    }
    /** P3: a one-sided flat quad (decal: panel line, glow plate, lamp) facing away from `inside`. */
    quad(a, b, c, d, inside) { this.poly([a, b, c, d], inside); }
    /** P3: a flat one-sided disc facing along +axis (dir 1) or -axis (dir -1): hover glow plates, exhaust glow, hatches. */
    disc(x, y, z, r, n, axis = "y", dir = 1, rot = 0) {
        const pts = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rot, u = Math.cos(a) * r, v = Math.sin(a) * r;
            pts.push(axis === "y" ? [x + u, y, z + v] : axis === "x" ? [x, y + u, z + v] : [x + u, y + v, z]);
        }
        this.poly(pts, axis === "y" ? [x, y - dir, z] : axis === "x" ? [x - dir, y, z] : [x, y, z - dir]);
    }
    /** Convex planar polygon (fan). */
    poly(pts, inside) { for (let i = 1; i + 1 < pts.length; i++)
        this.tri(pts[0], pts[i], pts[i + 1], inside); }
    /** Axis-aligned box: centre and half sizes. */
    box(cx, cy, cz, hx, hy, hz) {
        const c = [cx, cy, cz];
        const p = (sx, sy, sz) => [cx + sx * hx, cy + sy * hy, cz + sz * hz];
        this.poly([p(-1, -1, -1), p(1, -1, -1), p(1, 1, -1), p(-1, 1, -1)], c);
        this.poly([p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1)], c);
        this.poly([p(-1, -1, -1), p(-1, 1, -1), p(-1, 1, 1), p(-1, -1, 1)], c);
        this.poly([p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), p(1, -1, 1)], c);
        this.poly([p(-1, 1, -1), p(1, 1, -1), p(1, 1, 1), p(-1, 1, 1)], c);
        this.poly([p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1)], c);
    }
    /**
     * Armoured hull: a convex side profile (x forward, y up) extruded across z,
     * with half-width hwBot at the profile's lowest y and hwTop at its highest
     * (sloped sides). Gives chamfered noses, sloped glacis and tapered tops.
     */
    hull(profile, hwBot, hwTop, cz = 0, cy = 0) {
        let y0 = Infinity, y1 = -Infinity, sx = 0, sy = 0;
        for (const [x, y] of profile) {
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
            sx += x;
            sy += y;
        }
        const hw = (y) => hwBot + (hwTop - hwBot) * ((y - y0) / (y1 - y0 || 1));
        const c = [sx / profile.length, cy + sy / profile.length, cz];
        const L = profile.map(([x, y]) => [x, cy + y, cz - hw(y)]), R = profile.map(([x, y]) => [x, cy + y, cz + hw(y)]);
        this.poly(L, c);
        this.poly(R, c);
        for (let i = 0; i < profile.length; i++) {
            const j = (i + 1) % profile.length;
            this.poly([L[i], L[j], R[j], R[i]], c);
        }
    }
    /** Cylinder / frustum along an axis: centre of the base, radii, length, segments. */
    cyl(cx, cy, cz, r0, r1, len, n, axis = "y", caps = true, rot = 0) {
        const pt = (r, a, h) => {
            const u = Math.cos(a + rot) * r, v = Math.sin(a + rot) * r;
            return axis === "y" ? [cx + u, cy + h, cz + v] : axis === "x" ? [cx + h, cy + u, cz + v] : [cx + u, cy + v, cz + h];
        };
        const c = axis === "y" ? [cx, cy + len / 2, cz] : axis === "x" ? [cx + len / 2, cy, cz] : [cx, cy, cz + len / 2];
        const bot = [], top = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            bot.push(pt(r0, a, 0));
            top.push(pt(r1, a, len));
        }
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            this.poly([bot[i], bot[j], top[j], top[i]], c);
        }
        if (caps) {
            this.poly(bot, c);
            if (r1 > 1e-6)
                this.poly(top, c);
        }
    }
    /** Low-poly ball (icosahedron, optionally subdivided once). */
    ball(cx, cy, cz, r, sub = 0, sy = 1) {
        const t = (1 + Math.sqrt(5)) / 2;
        let v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
        let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
        v = v.map((p) => { const l = Math.hypot(...p); return [p[0] / l, p[1] / l, p[2] / l]; });
        for (let s = 0; s < sub; s++) {
            const nf = [], cache = new Map();
            const mid = (a, b) => {
                const k = a < b ? `${a},${b}` : `${b},${a}`;
                let i = cache.get(k);
                if (i === undefined) {
                    const p = [(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2];
                    const l = Math.hypot(...p);
                    v.push([p[0] / l, p[1] / l, p[2] / l]);
                    i = v.length - 1;
                    cache.set(k, i);
                }
                return i;
            };
            for (const [a, b, c] of f) {
                const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
                nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
            }
            f = nf;
        }
        const P = (p) => [cx + p[0] * r, cy + p[1] * r * sy, cz + p[2] * r];
        for (const [a, b, c] of f)
            this.tri(P(v[a]), P(v[b]), P(v[c]), [cx, cy, cz]);
    }
    /** Index to pass to rotZ: everything added after this call. */
    mark() { return this.d.length; }
    /** Pitches the vertices added since `from` about the z axis through (px, py): positive angles raise +x toward +y. */
    rotZ(from, ang, px, py) {
        const c = Math.cos(ang), s = Math.sin(ang), d = this.d;
        for (let i = from; i < d.length; i += exports.VERTEX_FLOATS) {
            const x = d[i] - px, y = d[i + 1] - py, nx = d[i + 3], ny = d[i + 4];
            d[i] = px + x * c - y * s;
            d[i + 1] = py + x * s + y * c;
            d[i + 3] = nx * c - ny * s;
            d[i + 4] = nx * s + ny * c;
        }
    }
    /** Ruling 130: turns the vertices added since `from` about the y axis by ang (model +x toward +z). */
    rotY(from, ang) {
        const c = Math.cos(ang), s = Math.sin(ang), d = this.d;
        for (let i = from; i < d.length; i += exports.VERTEX_FLOATS) {
            const x = d[i], z = d[i + 2], nx = d[i + 3], nz = d[i + 5];
            d[i] = x * c - z * s;
            d[i + 2] = x * s + z * c;
            d[i + 3] = nx * c - nz * s;
            d[i + 5] = nx * s + nz * c;
        }
    }
    /** Mirror of everything added by fn across the z = 0 plane (left/right symmetric details). */
    mirrored(fn) { fn(1); fn(-1); }
    build(pivot, hover, bob, recoil = 0) {
        const verts = new Float32Array(this.d);
        let h = 0, lo = Infinity, r = 0;
        for (let i = 0; i < verts.length; i += exports.VERTEX_FLOATS) {
            h = Math.max(h, verts[i + 1]);
            lo = Math.min(lo, verts[i + 1]);
            r = Math.max(r, Math.hypot(verts[i], verts[i + 2]));
        }
        if (!(lo < Infinity))
            lo = 0;
        return { verts, count: verts.length / exports.VERTEX_FLOATS, pivot, hover, bob, height: h, radius: r, minY: lo, midY: (lo + h) / 2, recoil };
    }
}
exports.MeshBuilder = MeshBuilder;
// ---------------------------------------------------------------- palette (sRGB-ish, multiplied by lighting)
const DARK = [0.16, 0.17, 0.16];
const GUN = [0.24, 0.25, 0.24];
const RUBBER = [0.11, 0.11, 0.1];
const HAZARD = [0.78, 0.62, 0.16];
const CANVAS = [0.42, 0.4, 0.3];
const CONCRETE = [0.56, 0.55, 0.5];
const P1 = [1, 1, 1], P2 = [0.86, 0.86, 0.84], P3 = [0.72, 0.72, 0.7];
// P3 (unit graphics pass): the approved concept's extra colours and the wear settings (designer's choices)
const STEEL = [0.27, 0.3, 0.31]; // engine pods, nacelles, exhausts (the concept's #3d474a, darkened for the lighting)
const OLIVE = [0.46, 0.5, 0.32]; // stowage boxes and panniers
const GLASS = [0.36, 0.52, 0.58]; // canopies and vision blocks (the concept's #9fd9e6 under the scene's lighting)
const PANEL = [0.62, 0.63, 0.6]; // panel lines on a team-tinted hull (multiplied by the hull colour: a darker inset strip)
/** Per-face brightness variation on the reworked units (±). */
exports.GRIT = 0.07;
/** Darkening of chamfer faces (worn edges) and of faces turned down. */
exports.EDGE_DARK = 0.8, exports.UNDER_DARK = 0.62;
// G2 (detail pass): every kind is built twice. The base mesh (the G1 / P3 shape) is the far level of detail and the
// source of the command view's outlines and of every measured size (height, radius, pivot); the near mesh adds the
// detail inside G2(() => ...) blocks. Material 5 (new): a blinking beacon (unlit, on / off with the unit's phase).
let LO = false;
/** Runs fn only for the near (detailed) mesh. */
function G2(fn) { if (!LO)
    fn(); }
function glowStripe(b, x0, x1, y, z, h = 0.12) {
    b.set([1, 1, 1], 2);
    b.box((x0 + x1) / 2, y, z, (x1 - x0) / 2, h, 0.05);
}
/** Hover skirt plates and the engine glow under a vehicle. */
function skirt(b, len, hw, y, h) {
    b.mirrored((s) => { b.set(DARK, 0); b.box(0, y, s * hw, len, h, 0.1); });
    b.set([1, 1, 1], 3);
    b.box(0, 0.06, 0, len * 0.85, 0.04, hw * 0.75); // underside glow pad
}
// ---------------------------------------------------------------- designer 20 Nov: gun builders
// "Make sure the guns look like guns and not sticks with cylinders on them": shared weapon shapes, all pointing +x with
// the muzzle tip at (tx, y, z), drawn in the current b.part. s scales a reference size (s 1: a 7 cm machine-gun bore).
const GBLK = [0.06, 0.06, 0.06];
/** Belt-fed machine gun: a chamfered receiver with a feed cover and a box magazine, a perforated cooling jacket, the
 *  barrel, a front sight and a slotted flash hider. len: tip to receiver back. */
function gunMG(b, tx, y, z, len, s = 1, mag = true) {
    const part = b.part, rx0 = tx - len, rx1 = tx - len * 0.55, jl = (tx - rx1) * 0.55, h = 0.085 * s, w = 0.065 * s;
    b.set(GUN, 0, part);
    b.hull([[rx0, y - h], [rx1, y - h], [rx1 + 0.04 * s, y - h * 0.3], [rx1, y + h], [rx0 + 0.1 * s, y + h * 1.15], [rx0, y + h * 0.4]], w, w * 0.85, z);
    b.set(DARK, 0, part);
    b.box(rx0 + (rx1 - rx0) * 0.55, y + h * 1.2, z, (rx1 - rx0) * 0.32, 0.018 * s, w * 0.8); // feed cover
    b.box(rx0 + 0.02 * s, y - h * 0.2, z, 0.03 * s, h * 0.6, w * 0.7); // butt plate
    if (mag) {
        b.set(OLIVE, 0, part);
        b.box(rx0 + (rx1 - rx0) * 0.45, y - h * 1.9, z + w * 0.2, (rx1 - rx0) * 0.22, h * 0.8, w * 1.3); // ammunition box
    }
    b.set(STEEL, 0, part);
    b.cyl(rx1, y, z, 0.05 * s, 0.05 * s, jl, 8, "x", true, Math.PI / 8); // cooling jacket
    b.set(GBLK, 0, part);
    for (let i = 0; i < 4; i++)
        for (const k of [-1, 1])
            b.box(rx1 + jl * (0.18 + i * 0.2), y + k * 0.032 * s, z + 0.03 * s, 0.025 * s, 0.009 * s, 0.022 * s); // jacket ports
    b.set(GUN, 0, part);
    b.cyl(rx1 + jl, y, z, 0.026 * s, 0.026 * s, tx - rx1 - jl - 0.1 * s, 8, "x", false); // barrel
    b.box(rx1 + jl * 0.95, y + 0.065 * s, z, 0.012 * s, 0.025 * s, 0.006 * s); // front sight
    b.set(DARK, 0, part);
    b.cyl(tx - 0.1 * s, y, z, 0.038 * s, 0.042 * s, 0.1 * s, 8, "x", true, Math.PI / 8); // flash hider
    b.set(GBLK, 0, part);
    b.disc(tx + 0.001, y, z, 0.022 * s, 6, "x", 1);
}
/** Rotary gun: a motor housing, a rotor drum, n barrels round a centre rod, two barrel clamps, a muzzle ring and a feed
 *  chute out of the housing's underside. len: tip to housing back. */
function gunMinigun(b, tx, y, z, len, s = 1, n = 6) {
    const part = b.part, x0 = tx - len, hl = len * 0.26, R = 0.06 * s;
    b.set(GUN, 0, part);
    b.cyl(x0, y, z, R * 1.5, R * 1.7, hl, 8, "x", true, Math.PI / 8); // motor housing
    b.set(DARK, 0, part);
    b.cyl(x0 + hl, y, z, R * 1.45, R * 1.3, len * 0.07, 8, "x", true); // rotor drum
    b.cyl(x0 - 0.02 * s, y, z, R * 0.9, R * 0.9, 0.03 * s, 6, "x", true); // drive cap
    b.set(GUN, 0, part);
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, yy = y + Math.cos(a) * R, zz = z + Math.sin(a) * R;
        b.cyl(x0 + hl + len * 0.07, yy, zz, 0.016 * s, 0.016 * s, tx - (x0 + hl + len * 0.07), 5, "x", false);
    }
    b.set(STEEL, 0, part);
    b.cyl(x0 + hl, y, z, R * 0.4, R * 0.4, tx - x0 - hl - 0.02 * s, 6, "x", false); // centre rod
    b.set(DARK, 0, part);
    for (const f of [0.45, 0.97])
        b.cyl(x0 + hl + (tx - x0 - hl) * f - 0.03 * s, y, z, R * 1.35, R * 1.35, 0.05 * s, 8, "x", true, Math.PI / 8); // clamps
    b.set(OLIVE, 0, part);
    b.box(x0 + hl * 0.5, y - R * 2.2, z, hl * 0.4, R * 0.6, R * 0.9); // feed chute
}
/** Cannon: a stepped thermal sleeve with bands, a fume extractor, the tapering barrel and a box muzzle brake with side
 *  ports; x0 the barrel's base (at the mantlet), r the barrel radius. */
function gunCannon(b, x0, tx, y, z, r, brake = true) {
    const part = b.part, L = tx - x0, bl = brake ? Math.max(r * 2.6, L * 0.07) : 0;
    b.set(GUN, 0, part);
    b.cyl(x0, y, z, r * 1.75, r * 1.6, L * 0.12, 10, "x", true, Math.PI / 10); // sleeve at the mantlet
    b.set(STEEL, 0, part);
    b.cyl(x0 + L * 0.12, y, z, r * 1.2, r * 1.12, L * 0.32, 10, "x", false, Math.PI / 10); // thermal sleeve
    b.set(DARK, 0, part);
    for (const f of [0.22, 0.34])
        b.cyl(x0 + L * f, y, z, r * 1.24, r * 1.24, L * 0.012, 10, "x", false, Math.PI / 10); // sleeve bands
    b.set(GUN, 0, part);
    b.cyl(x0 + L * 0.44, y, z, r * 1.08, r * 1.0, L * 0.1, 10, "x", false, Math.PI / 10);
    b.cyl(x0 + L * 0.5, y, z, r * 1.0, r * 1.55, L * 0.03, 10, "x", false, Math.PI / 10);
    b.cyl(x0 + L * 0.53, y, z, r * 1.55, r * 1.55, L * 0.1, 10, "x", false, Math.PI / 10);
    b.cyl(x0 + L * 0.63, y, z, r * 1.55, r * 0.98, L * 0.03, 10, "x", false, Math.PI / 10); // fume extractor
    b.set(STEEL, 0, part);
    b.cyl(x0 + L * 0.66, y, z, r * 0.98, r * 0.9, tx - bl - x0 - L * 0.66, 10, "x", false, Math.PI / 10);
    if (brake) {
        b.set(DARK, 0, part);
        b.box(tx - bl / 2, y, z, bl / 2, r * 1.25, r * 1.3); // muzzle brake
        b.set(GBLK, 0, part);
        b.mirrored((m) => {
            for (const f of [0.28, 0.68])
                b.quad([tx - bl * (f + 0.14), y - r * 0.8, z + m * r * 1.31], [tx - bl * (f - 0.08), y - r * 0.8, z + m * r * 1.31], [tx - bl * (f - 0.08), y + r * 0.8, z + m * r * 1.31], [tx - bl * (f + 0.14), y + r * 0.8, z + m * r * 1.31], [tx - bl / 2, y, z]); // ports
        });
        b.disc(tx + 0.002, y, z, r * 0.7, 8, "x", 1); // bore
    }
    else {
        b.set(DARK, 0, part);
        b.cyl(tx - r * 1.2, y, z, r * 1.1, r * 1.15, r * 1.2, 10, "x", true, Math.PI / 10);
        b.set(GBLK, 0, part);
        b.disc(tx + 0.002, y, z, r * 0.7, 8, "x", 1);
    }
}
/** Builds fn's gun (pointing +x, at x 0..tip on the axis z 0) turned to point along heading ang and moved by (dx, dz). */
function gunTurned(b, fn, ang, dx, dz) {
    const m = b.mark();
    fn();
    b.rotY(m, ang);
    for (let i = m; i < b.d.length; i += exports.VERTEX_FLOATS) {
        b.d[i] += dx;
        b.d[i + 2] += dz;
    }
}
/** Autocannon: a boxy receiver with a top cover and a side feed, a short jacketed barrel and a pepperpot brake. */
function gunAutocannon(b, tx, y, z, len, s = 1) {
    const part = b.part, x0 = tx - len, rl = len * 0.35, r = 0.07 * s;
    b.set(GUN, 0, part);
    b.hull([[x0, y - r * 2], [x0 + rl, y - r * 2], [x0 + rl + r, y - r], [x0 + rl, y + r * 2], [x0 + r * 1.5, y + r * 2.2], [x0, y + r]], r * 1.6, r * 1.4, z); // receiver
    b.set(DARK, 0, part);
    b.box(x0 + rl * 0.5, y + r * 2.25, z, rl * 0.35, r * 0.15, r * 1.2); // top cover
    b.set(OLIVE, 0, part);
    b.box(x0 + rl * 0.45, y - r * 0.4, z - r * 2.3, rl * 0.25, r * 1.1, r * 0.8); // side feed
    b.set(STEEL, 0, part);
    b.cyl(x0 + rl, y, z, r * 1.3, r * 1.15, len * 0.3, 8, "x", false, Math.PI / 8); // jacket
    b.set(GUN, 0, part);
    b.cyl(x0 + rl + len * 0.3, y, z, r * 0.75, r * 0.7, tx - x0 - rl - len * 0.3 - r * 3, 8, "x", false);
    b.set(DARK, 0, part);
    b.cyl(tx - r * 3, y, z, r * 1.05, r * 1.05, r * 3, 8, "x", true, Math.PI / 8); // pepperpot brake
    b.set(GBLK, 0, part);
    for (let i = 0; i < 3; i++)
        for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
            b.box(tx - r * (2.5 - i * 0.8), y + Math.cos(a) * r * 1.03, z + Math.sin(a) * r * 1.03, r * 0.16, r * 0.16, r * 0.16);
        }
    b.disc(tx + 0.002, y, z, r * 0.5, 6, "x", 1);
}
function tankTurret(b, px, py, r, h, barrelLen, barrelR, gun) {
    // P3: an octagonal frustum with a sloped mantlet, a barrel sleeve, a slotted muzzle brake (sized to the gun),
    // smoke dischargers, a roof MG, a loader's hatch and a team plate on the roof; the driver's cupola on the pivot
    b.part = 1;
    b.set(P2, 1, 1);
    b.cyl(px, py, 0, r, r * 0.82, h, 8, "y", false, Math.PI / 8);
    b.disc(px, py + h, 0, r * 0.82, 8, "y", 1, Math.PI / 8);
    b.set(P1, 1, 1);
    b.hull([[px - r * 0.2, py + h], [px + r * 0.9, py + h], [px + r * 1.15, py + h * 0.45], [px + r * 0.9, py + 0.02], [px - r * 0.2, py + 0.02]], r * 0.7, r * 0.55); // sloped mantlet block
    b.set(PANEL, 1, 1);
    b.quad([px + r * 0.92, py + h * 0.98, -r * 0.5], [px + r * 0.98, py + h * 0.86, -r * 0.5], [px + r * 0.98, py + h * 0.86, r * 0.5], [px + r * 0.92, py + h * 0.98, r * 0.5], [px, py, 0]); // seam
    const gy = py + h * 0.55;
    if (gun)
        gun(b, px + r * 0.9, gy); // F2: a weapon of its own (the Lancer's laser cannon)
    else {
        b.part = 2; // the barrel recoils (part 2); designer 20 Nov: a proper cannon (sleeve, fume extractor, box brake)
        gunCannon(b, px + r * 0.9, px + r * 1.3 + barrelLen * 1.12, gy, 0, barrelR * 1.05);
    }
    b.part = 1;
    // team marker on the rear of the turret roof (reads from above in command view)
    b.set([1, 1, 1], 2, 1);
    b.quad([px - r * 0.86, py + h + 0.02, -r * 0.16], [px - r * 0.38, py + h + 0.02, -r * 0.16], [px - r * 0.38, py + h + 0.02, r * 0.16], [px - r * 0.86, py + h + 0.02, r * 0.16], [px, 0, 0]);
    // bustle with a stowage rack
    b.set(P3, 1, 1);
    b.loft([[px - r * 1.3, [[py + h * 0.2, r * 0.42], [py + h * 0.7, r * 0.5], [py + h * 0.86, r * 0.4]]], [px - r * 0.6, [[py + h * 0.15, r * 0.55], [py + h * 0.75, r * 0.6], [py + h * 0.9, r * 0.5]]]], [1]);
    b.set(OLIVE, 0, 1);
    b.box(px - r * 1.12, py + h * 0.98, 0, r * 0.18, h * 0.12, r * 0.36);
    // smoke dischargers on the cheeks, a roof MG, the loader's hatch
    b.set(DARK, 0, 1);
    b.mirrored((s) => b.box(px + r * 0.35, py + h * 0.7, s * r * 0.86, r * 0.16, h * 0.13, r * 0.09));
    b.set(GUN, 0, 1);
    b.box(px - r * 0.05, py + h + 0.06, -r * 0.45, 0.05, 0.06, 0.05); // roof MG pintle
    gunMG(b, px - r * 0.2 + 0.7 + r * 0.35, py + h + 0.16, -r * 0.45, 0.7 + r * 0.35, 1 + r * 0.25);
    b.set(GUN, 0, 1);
    b.disc(px - r * 0.1, py + h + 0.015, r * 0.42, r * 0.22, 6, "y", 1);
    // slice 3b: the driver's cupola, on the turret pivot (it does not swing with the turret) where the sim's driver hit
    // zone is (constants.crew.pilotHitZone): a dark cupola with a lit vision band, the long rifle's target
    cupola(b, px, py + h, Math.min(0.36, r * 0.3), 1);
    G2(() => turretDetail(b, px, py, r, h, barrelLen, barrelR, !gun));
    b.part = 0;
}
/** Driver's cupola: a dark low cylinder with a glowing vision band all round (team colour). Its centre is COCKPITS[kind]. */
const CUPOLA_H = 0.3;
function cupola(b, x, y, rad, part) {
    b.set(DARK, 0, part);
    b.cyl(x, y, 0, rad, rad * 0.9, CUPOLA_H, 8, "y", false, Math.PI / 8);
    b.set([1, 1, 1], 2, part);
    b.cyl(x, y + CUPOLA_H * 0.45, 0, rad * 1.02, rad * 0.98, CUPOLA_H * 0.22, 8, "y", false, Math.PI / 8);
    b.set(GUN, 0, part);
    b.disc(x, y + CUPOLA_H, 0, rad * 0.9, 8, "y", 1, Math.PI / 8); // hatch lid
    b.box(x - rad * 0.55, y + CUPOLA_H + 0.04, 0, rad * 0.1, 0.04, rad * 0.4); // hinge
}
exports.KINDS = ["bike", "light", "medium", "artillery", "flak", "heavy", "siege", "air", "infantry", "economy", "structure", "tower", "mast", "silo", "extractor", "gastank", "battery", "reactor",
    "core", "factory", "pad", "dome", "bay", "carrier", "dropship", "node", "bunker", "wall", "hauler", "constructor", "fbv",
    "barracks", "armoury", "techlab", "refinery", "uplink", "massdriver", "depot", "bgun0", "bgun1", "bgun2", "bikewreck", "scout", "rockettank", "sleg", "droppod", "fbturret", "fbwall", "mech", "gunship", "mleg", "flpod", "flcrate", "fldrop", "fldropwall", "fldropbase", "flrocket", "rrstation"];
/** P3: a hover hull section (right half, bottom up): chamfered at the top, c the chamfer. */
const hsec = (yb, ym, yt, wb, wm, wt, c) => [[yb, wb], [ym, wm], [yt - c, wt], [yt, wt - c]];
/** P3: a dark hover nacelle along x at side z: tapered ends, round glow plates under it (the concept's hover engines). */
function nacelle(b, x0, x1, z, y0, y1, hw, plates) {
    b.set(STEEL, 0);
    const t = Math.min(0.5, (x1 - x0) * 0.12);
    b.loft([[x0, [[y0 + 0.1, hw * 0.6], [y1 - 0.08, hw * 0.75], [y1, hw * 0.45]]], [x0 + t, [[y0, hw], [y1 - 0.1, hw], [y1, hw * 0.7]]], [x1, [[y0 + 0.12, hw * 0.7], [y1 - 0.1, hw * 0.8], [y1, hw * 0.5]]]], [], z);
    b.set([1, 1, 1], 3);
    for (const x of plates)
        b.disc(x, y0 - 0.01, z, hw * 0.78, 6, "y", -1);
}
/** P3: hull-coloured skirt plates hanging outside a nacelle (one-sided, outward), n plates from x0 to x1. */
function skirtPlates(b, x0, x1, z, y0, y1, n) {
    const w = (x1 - x0) / n, s = Math.sign(z);
    for (let i = 0; i < n; i++) {
        const a = x0 + i * w + 0.04, c = x0 + (i + 1) * w - 0.04;
        b.set(i % 2 ? P2 : P1);
        b.quad([a, y0, z], [c, y0, z], [c, y1, z], [a, y1, z], [(a + c) / 2, (y0 + y1) / 2, z - s]);
    }
}
function lightTank() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // P3: lofted lower hull with chamfered upper edges and a sloped glacis down to a tapered nose (same length and width)
    b.set(P1);
    b.loft([
        [-3.3, hsec(0.45, 0.85, 1.25, 1.42, 1.62, 1.45, 0.16)],
        [-2.9, hsec(0.3, 0.85, 1.3, 1.52, 1.72, 1.5, 0.2)],
        [2.3, hsec(0.3, 0.8, 1.28, 1.52, 1.72, 1.45, 0.2)],
        [3.35, hsec(0.55, 0.74, 0.88, 1.15, 1.32, 1.12, 0.06)],
    ], [2]);
    b.set(PANEL);
    b.quad([2.6, 1.22, -1.25], [2.68, 1.2, -1.25], [2.68, 1.2, 1.25], [2.6, 1.22, 1.25], [2.6, 0, 0]); // glacis seam
    // engine deck with louvres
    b.set(P2);
    b.loft([[-3.25, [[1.24, 1.15], [1.42, 1.05], [1.46, 0.95]]], [-1.5, [[1.27, 1.15], [1.42, 1.05], [1.46, 0.95]]]], [1]);
    b.set(DARK, 0);
    for (let i = 0; i < 3; i++)
        b.quad([-3.0 + i * 0.5, 1.465, -0.75], [-2.8 + i * 0.5, 1.465, -0.75], [-2.8 + i * 0.5, 1.465, 0.75], [-3.0 + i * 0.5, 1.465, 0.75], [-2.9 + i * 0.5, 0, 0]);
    // hover nacelles with skirt plates and glow plates; the team stripe, exhausts, lamps, stowage, antenna
    b.mirrored((s) => {
        nacelle(b, -3.0, 2.4, s * 1.55, 0.12, 0.62, 0.42, [-1.8, 1.4]);
        skirtPlates(b, -2.6, 2.2, s * 1.99, 0.32, 0.82, 3);
        glowStripe(b, -1.6, 1.8, 1.0, s * 1.68, 0.1);
        b.set(STEEL, 0);
        b.cyl(-3.55, 0.85, s * 0.8, 0.2, 0.22, 0.32, 6, "x", false);
        b.set([1, 1, 1], 3);
        b.disc(-3.55, 0.85, s * 0.8, 0.16, 6, "x", -1);
        b.set([1, 1, 1], 2);
        b.disc(3.26, 0.78, s * 0.95, 0.09, 4, "x", 1);
    });
    b.set(OLIVE, 0);
    b.box(-1.0, 1.36, 1.25, 0.55, 0.12, 0.2);
    b.set(DARK, 0);
    b.cyl(-2.9, 1.4, -1.1, 0.03, 0.02, 0.9, 4, "y", false);
    tankTurret(b, 0.1, 1.28, 1.05, 0.62, 2.8, 0.13, lancerLasers);
    G2(() => g2Lancer(b));
    return b.build([0.1, 1.28, 0], 0.85, 0.12, 0.35);
}
/**
 * F2 (ruling 91): the Lancer's weapons from the mantlet at (x, y): a laser cannon (a capacitor housing with copper charge
 * coils, a long emitter barrel with three glowing emitter rings and a lit lens; part 2, so it kicks on the shot) and a
 * small rapid-laser emitter slung under the barrel (coaxial, so both fire from near the data muzzle at 4.6 m forward).
 */
const COPPER = [0.7, 0.44, 0.2];
function lancerLasers(b, x, y) {
    b.set(GUN, 0, 1);
    b.box(x + 0.3, y, 0, 0.36, 0.2, 0.22); // capacitor housing
    b.set(COPPER, 0, 1);
    for (let i = 0; i < 4; i++)
        b.cyl(x + 0.02 + i * 0.16, y, 0, 0.19, 0.19, 0.08, 8, "x"); // charge coils
    b.set(GUN, 0, 2);
    b.cyl(x + 0.66, y, 0, 0.12, 0.1, 2.6, 10, "x"); // emitter barrel
    b.set(STEEL, 0, 2);
    b.cyl(x + 0.66, y, 0, 0.17, 0.15, 0.3, 10, "x"); // barrel collar
    b.set(DARK, 0, 2);
    for (let i = 0; i < 6; i++)
        b.box(x + 1.15 + i * 0.1, y, 0, 0.018, 0.17, 0.17); // heat-sink fins
    for (const k of [-1, 1])
        b.box(x + 2.05, y + k * 0.13, 0, 0.5, 0.025, 0.04); // field rails
    b.set([1, 1, 1], 3, 2);
    for (const t of [1.0, 1.7, 2.4])
        b.cyl(x + t, y, 0, 0.15, 0.15, 0.07, 8, "x", false); // emitter rings
    b.set(DARK, 0, 2);
    b.cyl(x + 3.26, y, 0, 0.17, 0.15, 0.24, 8, "x"); // lens shroud
    b.set([1, 1, 1], 3, 2);
    b.cyl(x + 3.5, y, 0, 0.09, 0.0, 0.05, 8, "x"); // lens (tip at the data muzzle)
    // rapid laser: a thin emitter slung under the barrel, with its own small glowing tip
    b.set(GUN, 0, 1);
    b.box(x + 1.9, y - 0.2, 0, 0.12, 0.06, 0.07); // clamp
    b.box(x + 1.55, y - 0.23, 0, 0.25, 0.08, 0.08); // emitter body
    b.set(STEEL, 0, 1);
    b.cyl(x + 1.8, y - 0.21, 0, 0.055, 0.05, 1.4, 8, "x", false);
    b.set(DARK, 0, 1);
    for (const t of [2.2, 2.6, 3.0])
        b.cyl(x + t, y - 0.21, 0, 0.075, 0.075, 0.05, 8, "x", true); // focusing rings
    b.cyl(x + 3.2, y - 0.21, 0, 0.08, 0.07, 0.15, 8, "x", true);
    b.set([1, 1, 1], 3, 1);
    b.cyl(x + 3.35, y - 0.21, 0, 0.065, 0.065, 0.05, 8, "x", false);
}
function mediumTank(variant = "gun") {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // P3: lofted lower hull with chamfered upper edges and a sloped glacis (same length and width as before)
    b.set(P1);
    b.loft([
        [-3.65, hsec(0.5, 0.95, 1.45, 1.62, 1.85, 1.62, 0.18)],
        [-3.25, hsec(0.3, 0.95, 1.5, 1.75, 1.98, 1.65, 0.22)],
        [2.75, hsec(0.3, 0.9, 1.48, 1.75, 1.98, 1.6, 0.22)],
        [3.85, hsec(0.6, 0.82, 0.98, 1.3, 1.5, 1.25, 0.06)],
    ], [2]);
    b.set(PANEL);
    b.quad([3.05, 1.42, -1.4], [3.13, 1.4, -1.4], [3.13, 1.4, 1.4], [3.05, 1.42, 1.4], [3.0, 0, 0]); // glacis seam
    b.quad([-0.6, 1.505, -1.45], [-0.52, 1.505, -1.45], [-0.52, 1.505, 1.45], [-0.6, 1.505, 1.45], [-0.6, 0, 0]); // deck seam
    // raised engine deck with louvres
    b.set(P2);
    b.loft([[-3.45, [[1.44, 1.4], [1.7, 1.28], [1.76, 1.16]]], [-1.2, [[1.47, 1.4], [1.7, 1.28], [1.76, 1.16]]]], [1]);
    b.set(DARK, 0);
    for (let i = 0; i < 4; i++)
        b.quad([-3.15 + i * 0.5, 1.765, -0.95], [-2.95 + i * 0.5, 1.765, -0.95], [-2.95 + i * 0.5, 1.765, 0.95], [-3.15 + i * 0.5, 1.765, 0.95], [-3.05 + i * 0.5, 0, 0]);
    b.mirrored((s) => {
        nacelle(b, -3.35, 2.9, s * 1.75, 0.12, 0.66, 0.45, [-2.0, 1.8]);
        skirtPlates(b, -2.9, 2.5, s * 2.22, 0.34, 0.88, 3);
        glowStripe(b, -2.0, 2.2, 1.08, s * 1.92);
        b.set(STEEL, 0);
        b.cyl(-3.95, 0.92, s * 1.0, 0.22, 0.24, 0.35, 6, "x", false);
        b.set([1, 1, 1], 3);
        b.disc(-3.95, 0.92, s * 1.0, 0.18, 6, "x", -1);
        b.set([1, 1, 1], 2);
        b.disc(3.73, 0.86, s * 1.12, 0.1, 4, "x", 1);
        b.set(s > 0 ? OLIVE : P3, s > 0 ? 0 : 1);
        b.box(0.2, 1.6, s * 1.5, 1.0, 0.12, 0.28); // stowage boxes
    });
    b.set(DARK, 0);
    b.cyl(-3.1, 1.76, -1.2, 0.03, 0.02, 1.0, 4, "y", false); // antenna
    if (variant === "gun")
        tankTurret(b, 0.3, 1.45, 1.3, 0.72, 3.2, 0.17);
    else if (variant === "artillery") {
        // mortar carrier: a squat ring mount with chamfered trunnion cheeks, one fat tube raised high, recoil cylinders
        b.part = 1;
        b.set(P2, 1, 1);
        b.cyl(0.0, 1.45, 0, 1.35, 1.2, 0.5, 8, "y", false, Math.PI / 8);
        b.disc(0.0, 1.95, 0, 1.2, 8, "y", 1, Math.PI / 8);
        b.set(DARK, 0, 1);
        b.cyl(0.0, 1.45, 0, 1.38, 1.38, 0.1, 8, "y", false, Math.PI / 8); // ring race
        b.set([1, 1, 1], 2, 1);
        b.quad([-1.0, 1.96, -0.18], [-0.3, 1.96, -0.18], [-0.3, 1.96, 0.18], [-1.0, 1.96, 0.18], [0, 0, 0]);
        b.set(P3, 1, 1);
        b.mirrored((s) => b.loft([[-0.4, [[1.95, 0.12], [2.55, 0.12], [2.8, 0.1]]], [0.8, [[1.95, 0.12], [2.45, 0.12], [2.6, 0.1]]]], [1], s * 0.62)); // trunnion cheeks
        b.set(OLIVE, 0, 1);
        b.box(-0.95, 2.15, 0.75, 0.25, 0.2, 0.3);
        b.box(-0.95, 2.15, -0.75, 0.25, 0.2, 0.3); // ready racks
        cupola(b, 0.3, 1.95, 0.3, 1); // driver's cupola on the ring, at the pivot
        const m = b.mark();
        // designer 20 Nov: a heavy mortar tube (12-sided, a stepped breech with a firing mechanism, cradle straps, a swelled
        // muzzle with a blast ring) on a cradle with proper recoil cylinders
        b.set(GUN, 0, 1);
        b.cyl(-0.6, 2.25, 0, 0.42, 0.37, 3.85, 12, "x", false, Math.PI / 12);
        b.set(STEEL, 0, 1);
        b.cyl(-1.05, 2.25, 0, 0.44, 0.52, 0.2, 12, "x", true, Math.PI / 12);
        b.cyl(-0.85, 2.25, 0, 0.52, 0.5, 0.75, 12, "x", false, Math.PI / 12); // breech
        b.set(DARK, 0, 1);
        b.box(-1.12, 2.25, 0, 0.08, 0.16, 0.16); // firing mechanism
        b.cyl(0.35, 2.25, 0, 0.5, 0.5, 0.35, 12, "x", false, Math.PI / 12); // cradle strap
        b.mirrored((s) => {
            b.set(STEEL, 0, 1);
            b.cyl(-0.4, 2.25 + 0.32, s * 0.28, 0.1, 0.1, 1.7, 8, "x", true); // recoil cylinders
            b.set(GUN, 0, 1);
            b.cyl(1.3, 2.25 + 0.32, s * 0.28, 0.05, 0.05, 0.9, 6, "x", false); // piston rods
            b.box(-0.45, 2.25 + 0.32, s * 0.28, 0.06, 0.12, 0.12);
        });
        b.set(GUN, 0, 1);
        b.cyl(3.25, 2.25, 0, 0.37, 0.47, 0.12, 12, "x", false, Math.PI / 12);
        b.cyl(3.37, 2.25, 0, 0.47, 0.47, 0.18, 12, "x", false, Math.PI / 12); // muzzle swell
        b.set(DARK, 0, 1);
        b.cyl(3.55, 2.25, 0, 0.47, 0.5, 0.08, 12, "x", true, Math.PI / 12); // blast ring
        b.set(GBLK, 0, 1);
        b.disc(3.64, 2.25, 0, 0.33, 12, "x", 1, Math.PI / 12); // bore
        b.rotZ(m, 0.95, 0.2, 2.25);
        // the commander's machine gun on a pintle at the ring's front left (the driver's weapon, hammer-machine-gun)
        b.set(GUN, 0, 1);
        b.cyl(0.7, 1.95, -0.85, 0.05, 0.05, 0.12, 6, "y", true);
        gunMG(b, 1.55, 2.12, -0.85, 1.0, 1.25);
        b.part = 0;
    }
    else if (false) {
        b.part = 0;
    }
    else {
        // anti-air: a chamfered mount with four long barrels angled up (flash hiders), ammo drums and a small radar dish
        b.part = 1;
        b.set(P2, 1, 1);
        b.hull([[-1.2, 1.45], [1.0, 1.45], [1.3, 2.0], [0.9, 2.6], [-1.1, 2.6]], 1.0, 0.85);
        b.set(PANEL, 1, 1);
        b.quad([-0.2, 2.605, -0.8], [-0.12, 2.605, -0.8], [-0.12, 2.605, 0.8], [-0.2, 2.605, 0.8], [0, 0, 0]);
        // the crew cab: a glazed band round the mount below the guns, lit at the front (the driver hit zone)
        b.set(GLASS, 0, 1);
        b.hull([[-0.6, 1.72], [1.12, 1.72], [1.24, 1.92], [1.16, 2.08], [-0.6, 2.08]], 1.03, 0.97);
        b.set([1, 1, 1], 2, 1);
        b.box(1.2, 1.9, 0, 0.04, 0.06, 0.55);
        b.set([1, 1, 1], 2, 1);
        b.quad([-0.8, 2.61, -0.15], [-0.2, 2.61, -0.15], [-0.2, 2.61, 0.15], [-0.8, 2.61, 0.15], [0, 0, 0]);
        b.set(OLIVE, 0, 1);
        b.mirrored((s) => b.cyl(-0.4, 2.2, s * 1.0, 0.32, 0.32, 0.22, 6, "z", true)); // ammo drums
        // designer 20 Nov: two twin autocannon: a chamfered receiver per pair, jacketed barrels with port rows, pepperpot
        // muzzle brakes (tips at x 3.4)
        const m = b.mark();
        b.mirrored((s) => {
            b.set(GUN, 0, 1);
            b.hull([[0.3, 1.9], [1.15, 1.9], [1.27, 2.05], [1.15, 2.32], [0.42, 2.34], [0.3, 2.15]], 0.24, 0.2, s * 0.625);
            b.set(DARK, 0, 1);
            b.box(0.72, 2.35, s * 0.625, 0.3, 0.02, 0.17); // top covers
        });
        for (const z of [-0.75, -0.5, 0.5, 0.75]) {
            b.set(STEEL, 0, 1);
            b.cyl(1.15, 2.1, z, 0.1, 0.095, 0.95, 8, "x", true, Math.PI / 8); // jacket
            b.set(GBLK, 0, 1);
            for (let i = 0; i < 4; i++)
                b.box(1.3 + i * 0.2, 2.18, z, 0.05, 0.02, 0.04);
            b.set(GUN, 0, 1);
            b.cyl(2.1, 2.1, z, 0.055, 0.05, 1.0, 8, "x", false);
            b.set(DARK, 0, 1);
            b.cyl(3.1, 2.1, z, 0.085, 0.085, 0.3, 8, "x", true, Math.PI / 8); // pepperpot brake
            b.set(GBLK, 0, 1);
            for (let i = 0; i < 2; i++)
                for (const k of [-1, 1]) {
                    b.box(3.18 + i * 0.12, 2.1 + k * 0.085, z, 0.025, 0.012, 0.025);
                    b.box(3.18 + i * 0.12, 2.1, z + k * 0.085, 0.025, 0.025, 0.012);
                }
            b.disc(3.402, 2.1, z, 0.04, 6, "x", 1);
        }
        b.rotZ(m, 0.6, 0.6, 2.1);
        b.set(CONCRETE, 0, 1);
        b.cyl(-0.9, 2.6, 0, 0.06, 0.06, 0.6, 5, "y", false);
        b.cyl(-0.9, 3.2, 0, 0.1, 0.55, 0.2, 8);
        b.set(DARK, 0, 1);
        b.cyl(-0.9, 3.38, 0, 0.03, 0.03, 0.35, 4, "y", false);
        b.part = 0;
    }
    G2(() => (variant === "artillery" ? g2Hammer(b) : variant === "flak" ? g2Flak(b) : g2Medium(b, 1.75)));
    return b.build([0.3, 1.45, 0], 0.95, 0.12, variant === "gun" ? 0.45 : 0);
}
function heavyTank() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // P3: lofted hull with chamfered, darker upper edges and a sloped glacis; bolted side armour with seams
    b.set(P1);
    b.loft([
        [-4.4, hsec(0.55, 1.1, 1.8, 2.05, 2.3, 2.0, 0.22)],
        [-3.95, hsec(0.35, 1.1, 1.85, 2.2, 2.45, 2.1, 0.28)],
        [3.5, hsec(0.35, 1.05, 1.82, 2.2, 2.45, 2.05, 0.28)],
        [4.65, hsec(0.75, 0.98, 1.15, 1.7, 1.95, 1.6, 0.08)],
    ], [2]);
    b.set(PANEL);
    b.quad([3.8, 1.72, -1.7], [3.9, 1.69, -1.7], [3.9, 1.69, 1.7], [3.8, 1.72, 1.7], [3.8, 0, 0]); // glacis seam
    b.quad([-1.5, 1.855, -1.8], [-1.42, 1.855, -1.8], [-1.42, 1.855, 1.8], [-1.5, 1.855, 1.8], [-1.5, 0, 0]); // deck seam
    b.mirrored((s) => {
        b.set(P2);
        b.hull([[-3.8, 0.35], [3.4, 0.35], [3.9, 0.9], [3.4, 1.45], [-3.6, 1.45], [-4.0, 0.9]], 0.28, 0.22, s * 2.55); // side armour plates
        const z = s * 2.84;
        b.set(PANEL);
        for (const x of [-1.6, 0.8])
            b.quad([x, 0.45, z], [x + 0.08, 0.45, z], [x + 0.08, 1.38, z], [x, 1.38, z], [x, 0.9, 0]); // plate seams
        b.set(DARK, 0);
        for (let i = 0; i < 5; i++) {
            const x = -2.8 + i * 1.4;
            b.quad([x - 0.08, 1.2, z + s * 0.005], [x + 0.08, 1.2, z + s * 0.005], [x + 0.08, 1.33, z + s * 0.005], [x - 0.08, 1.33, z + s * 0.005], [x, 1.25, 0]);
        } // bolts
        nacelle(b, -4.1, 3.6, s * 2.0, 0.14, 0.7, 0.5, [-2.6, 0, 2.4]);
        glowStripe(b, -2.6, 2.8, 1.62, s * 2.18, 0.14);
        b.set(STEEL, 0);
        b.cyl(-4.75, 1.12, s * 1.2, 0.28, 0.3, 0.4, 6, "x", false);
        b.set([1, 1, 1], 3);
        b.disc(-4.75, 1.12, s * 1.2, 0.23, 6, "x", -1);
        b.set([1, 1, 1], 2);
        b.disc(4.52, 1.02, s * 1.35, 0.12, 4, "x", 1);
        b.set(GUN, 0);
        b.box(4.5, 0.62, s * 1.0, 0.18, 0.1, 0.1); // tow hooks
        b.set(DARK, 0);
        b.cyl(-3.6, 1.85, s * 1.5, 0.035, 0.025, 1.2, 4, "y", false); // antennae
    });
    // raised engine deck with louvres; stowage
    b.set(P2);
    b.loft([[-4.15, [[1.84, 1.65], [2.05, 1.52], [2.1, 1.4]]], [-2.0, [[1.86, 1.65], [2.05, 1.52], [2.1, 1.4]]]], [1]);
    b.set(DARK, 0);
    for (let i = 0; i < 5; i++)
        b.quad([-3.85 + i * 0.38, 2.105, -1.2], [-3.68 + i * 0.38, 2.105, -1.2], [-3.68 + i * 0.38, 2.105, 1.2], [-3.85 + i * 0.38, 2.105, 1.2], [-3.75 + i * 0.38, 0, 0]);
    b.set(OLIVE, 0);
    b.box(1.6, 1.97, 1.75, 0.9, 0.13, 0.3);
    b.set(CANVAS, 0);
    b.box(1.6, 1.97, -1.75, 0.8, 0.12, 0.22);
    tankTurret(b, 0.0, 1.85, 1.75, 0.95, 4.6, 0.24);
    // gunner's top turret: a small autocannon behind a shield, with an ammo box (muzzle at x 1.2, y 3.02, z 0.7)
    b.part = 1;
    b.set(P3, 1, 1);
    b.cyl(-0.6, 2.8, 0.7, 0.45, 0.4, 0.4, 6, "y", false);
    b.disc(-0.6, 3.2, 0.7, 0.4, 6, "y", 1);
    b.set(P2, 1, 1);
    b.box(-0.15, 3.0, 0.7, 0.05, 0.2, 0.3); // gun shield
    gunAutocannon(b, 1.2, 3.02, 0.7, 1.6, 1.0); // designer 20 Nov: a real autocannon (receiver, jacket, pepperpot brake)
    b.set(OLIVE, 0, 1);
    b.box(-0.75, 3.05, 1.08, 0.18, 0.1, 0.08);
    b.part = 0;
    G2(() => g2Bastion(b));
    return b.build([0.0, 1.85, 0], 1.0, 0.1, 0.6);
}
/** W2: dark gunmetal of the Strider's hull core (material 1: tinted by the team's hull colour, darker than the armour). */
const DKH = [0.4, 0.42, 0.43];
/** W2: a box turned about the vertical (heading a, rad, from +x toward +z): half length along the heading, half height,
 *  half width; the far end (+l) scaled by tip (a tapered toe, a claw). */
function yawBox(b, cx, cy, cz, a, hl, hy, hw, tip = 1, drop = 0) {
    const c = Math.cos(a), s = Math.sin(a);
    const P = (l, y, w) => { const k = l > 0 ? tip : 1, yy = l > 0 ? y * k - drop : y; return [cx + c * l - s * w * k, cy + yy, cz + s * l + c * w * k]; };
    const v = [P(-hl, -hy, -hw), P(hl, -hy, -hw), P(hl, hy, -hw), P(-hl, hy, -hw), P(-hl, -hy, hw), P(hl, -hy, hw), P(hl, hy, hw), P(-hl, hy, hw)];
    const ins = [cx, cy, cz];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5], [3, 2, 6, 7], [0, 1, 5, 4]])
        b.poly(f.map((i) => v[i]), ins);
}
/** W2: the siege gun turret on the Strider's roof deck (pivot x, deck height y, radius, height, barrel). */
const SG = { px: 0, py: 9.3, r: 2.3, h: 1.45, L: 8.6, R: 0.5 };
/** W2: the chin guns under the head module (barrel tips, model space: from the ground). */
const CHIN = [[10.35, 4.3, 0.55], [10.35, 4.3, -0.55]];
/** W2: the AA mount on the turret roof (barrel tips). */
const AA = [[0.6, 11.4, 0.25], [0.6, 11.4, -0.25]];
/**
 * Frontline: the bipedal mech (player-only call-down). A blocky torso on two Strider legs (w1-walker MECH_WALKER hips at
 * 6.4 m), a cockpit slit, missile pods on both shoulders, a twin autocannon on the right arm and an arc lance on the left.
 * Built from the ground up (stance 0): model y = the sim's up; +x forward, +z right. The driver muzzle: the right-arm guns.
 */
/** Frontline: a hexahedron between two quads with corresponding corners (wings, fins, canted plates, fork tines). */
function prism(b, A, B) {
    const c = [0, 0, 0];
    for (const p of [...A, ...B]) {
        c[0] += p[0] / 8;
        c[1] += p[1] / 8;
        c[2] += p[2] / 8;
    }
    b.poly(A, c);
    b.poly(B, c);
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        b.poly([A[i], A[j], B[j], B[i]], c);
    }
}
/** Frontline: the arc lance's glow (the coils, the emitter). */
const ARC = [0.27, 0.88, 1.0];
function mech() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // Graphics pass: a hunched armoured torso on a narrow pelvis. Dark gunmetal core (team-tinted), team-colour armour
    // plates over it, a glazed cockpit nose under an armoured brow, box launchers on the shoulders, weapon arms.
    const HX = 0.2, HY = 6.3;
    // pelvis: a keel block between the two leg bearings (w1-walker MECH_WALKER hips), bearing bosses, hip guards
    b.set(DKH);
    b.loft([
        [-1.05, hsec(5.95, 6.4, 6.95, 0.6, 0.85, 0.7, 0.15)],
        [-0.55, hsec(5.55, 6.3, 7.15, 0.85, 1.08, 0.9, 0.2)],
        [0.95, hsec(5.55, 6.3, 7.15, 0.85, 1.08, 0.9, 0.2)],
        [1.4, hsec(5.95, 6.4, 6.95, 0.6, 0.8, 0.65, 0.15)],
    ], [2]);
    b.set(P2);
    b.hull([[0.9, 5.7], [1.5, 6.05], [1.56, 6.9], [0.9, 7.1]], 0.5, 0.66); // groin plate
    b.hull([[-0.6, 5.7], [-1.15, 6.05], [-1.2, 6.9], [-0.6, 7.1]], 0.5, 0.66); // rear plate
    b.mirrored((s) => {
        b.set(STEEL, 0);
        b.cyl(HX, HY, s > 0 ? 1.0 : -1.24, 0.76, 0.76, 0.24, 10, "z"); // bearing boss against the leg's hip drum
        b.set(P1);
        b.hull([[-0.95, 6.98], [1.15, 6.98], [1.5, 7.2], [1.15, 7.52], [-0.85, 7.52], [-1.2, 7.2]], 0.56, 0.46, s * 1.56); // hip guard
    });
    // waist: a slewing ring between the pelvis and the torso
    b.set(STEEL, 0);
    b.cyl(0.05, 7.05, 0, 1.12, 1.02, 0.5, 10, "y", false);
    // torso core
    b.set(DKH);
    b.loft([
        [-1.75, hsec(7.95, 8.6, 9.5, 0.9, 1.2, 1.0, 0.2)],
        [-1.2, hsec(7.45, 8.5, 9.85, 1.25, 1.62, 1.4, 0.3)],
        [0.9, hsec(7.4, 8.4, 9.85, 1.25, 1.66, 1.42, 0.3)],
        [1.55, hsec(7.7, 8.4, 9.5, 0.95, 1.3, 1.1, 0.25)],
    ], [2]);
    // cockpit: a faceted glass nose between an armoured brow and a jaw plate, cheek plates either side
    b.set(GLASS, 0);
    b.loft([
        [1.2, [[8.35, 0.9], [8.85, 0.95], [9.32, 0.8]]],
        [1.9, [[8.4, 0.64], [8.85, 0.68], [9.25, 0.52]]],
        [2.28, [[8.55, 0.3], [8.85, 0.34], [9.1, 0.24]]],
    ]);
    b.set(P1);
    b.hull([[0.2, 9.3], [1.75, 9.22], [2.08, 9.36], [1.85, 9.62], [0.2, 10.0]], 1.02, 0.85); // brow hood
    b.set(P2);
    b.hull([[0.5, 7.5], [1.6, 7.78], [2.12, 8.25], [2.06, 8.42], [0.5, 8.42]], 0.82, 0.96); // jaw
    b.mirrored((s) => {
        b.set(P1);
        b.hull([[0.8, 7.9], [1.55, 8.0], [1.82, 8.5], [1.7, 9.22], [0.8, 9.45]], 0.14, 0.14, s * 1.16); // cheek plate
        b.hull([[-1.3, 7.55], [0.7, 7.55], [1.05, 8.0], [0.95, 9.35], [-1.25, 9.55], [-1.55, 8.3]], 0.14, 0.14, s * 1.79); // flank slab
    });
    // shoulder collar carrying the launchers (the sensor head on it removed: designer 19 Nov, "remove the head of the mech")
    b.set(P2);
    b.loft([
        [-1.45, hsec(9.5, 9.7, 9.9, 1.3, 1.4, 1.2, 0.1)],
        [-1.0, hsec(9.5, 9.75, 10.0, 1.5, 1.62, 1.35, 0.12)],
        [0.9, hsec(9.5, 9.75, 10.0, 1.5, 1.62, 1.35, 0.12)],
        [1.3, hsec(9.5, 9.62, 9.8, 1.2, 1.3, 1.1, 0.08)],
    ], [2]);
    // shoulder missile pods: an armoured box launcher each side, a 2 x 3 grid of tubes in a dark front face
    for (const s of [1, -1]) {
        const pz = s * 2.3;
        b.set(STEEL, 0);
        b.box(-0.1, 9.9, s * 1.62, 0.6, 0.2, 0.14); // pylon
        b.set(P1);
        b.loft([
            [-1.15, hsec(9.86, 10.3, 10.8, 0.5, 0.6, 0.5, 0.12)],
            [-0.85, hsec(9.72, 10.3, 10.92, 0.6, 0.7, 0.6, 0.14)],
            [0.95, hsec(9.72, 10.3, 10.92, 0.6, 0.7, 0.6, 0.14)],
        ], [2], pz);
        b.set(DARK, 0);
        b.box(0.97, 10.3, pz, 0.03, 0.52, 0.56);
        for (const ty of [10.05, 10.55])
            for (const tz of [-0.35, 0, 0.35]) {
                b.set(GUN, 0);
                b.cyl(0.93, ty, pz + tz, 0.16, 0.15, 0.12, 6, "x", false);
                b.set(BLACK, 0);
                b.disc(1.045, ty, pz + tz, 0.15, 6, "x", 1);
            }
    }
    // arms: shoulder joint, pauldron, upper arm, elbow
    for (const s of [1, -1]) {
        const az = s * 2.6;
        b.set(STEEL, 0);
        b.cyl(-0.05, 9.15, s > 0 ? 1.6 : -2.3, 0.5, 0.5, 0.7, 10, "z");
        b.set(P1);
        b.loft([
            [-0.78, [[8.75, 0.38], [8.95, 0.5], [9.3, 0.5], [9.58, 0.34]]],
            [0.0, [[8.6, 0.46], [8.85, 0.6], [9.35, 0.6], [9.68, 0.4]]],
            [0.78, [[8.75, 0.38], [8.95, 0.5], [9.3, 0.5], [9.58, 0.34]]],
        ], [2], az);
        b.set(DKH);
        b.box(-0.05, 8.25, az, 0.34, 0.5, 0.3);
        b.set(STEEL, 0);
        b.cyl(-0.05, 7.72, s > 0 ? 2.12 : -3.08, 0.4, 0.4, 0.96, 8, "z");
    }
    // right forearm (+z): the twin autocannon. A receiver, an armoured top cover, a drum magazine behind, two barrels in
    // sleeves with slotted muzzle brakes (MUZZLES.mech: the brake faces at x 3.6)
    b.set(DKH);
    b.loft([
        [-1.0, hsec(7.12, 7.45, 7.78, 0.3, 0.36, 0.3, 0.08)],
        [-0.7, hsec(6.98, 7.45, 7.95, 0.42, 0.5, 0.42, 0.12)],
        [1.3, hsec(6.98, 7.45, 7.95, 0.42, 0.5, 0.42, 0.12)],
        [1.75, hsec(7.14, 7.42, 7.7, 0.36, 0.42, 0.36, 0.08)],
    ], [2], 2.6);
    b.set(P1);
    b.hull([[-0.6, 7.93], [1.2, 7.93], [1.42, 8.0], [1.2, 8.13], [-0.6, 8.13]], 0.42, 0.36, 2.6);
    b.set(DARK, 0);
    b.cyl(-1.6, 7.42, 2.6, 0.4, 0.44, 0.62, 8, "x");
    for (const tz of [2.45, 2.75]) // designer 20 Nov: two proper cannon barrels (sleeve, extractor, box brake)
        gunCannon(b, 1.7, 3.6, 7.4, tz, 0.078);
    b.set(STEEL, 0);
    b.box(2.72, 7.4, 2.6, 0.06, 0.13, 0.3); // barrel clamp
    // left forearm (-z): the arc lance. A capacitor housing, a conductor with three glowing coils, a two-tine emitter fork
    b.set(DKH);
    b.loft([
        [-1.1, hsec(7.15, 7.45, 7.75, 0.26, 0.32, 0.26, 0.07)],
        [-0.7, hsec(7.0, 7.45, 7.92, 0.38, 0.46, 0.38, 0.1)],
        [1.0, hsec(7.0, 7.45, 7.92, 0.38, 0.46, 0.38, 0.1)],
        [1.3, hsec(7.15, 7.45, 7.75, 0.26, 0.32, 0.26, 0.07)],
    ], [2], -2.6);
    b.set(P1);
    b.hull([[-0.6, 7.9], [0.9, 7.9], [1.08, 7.97], [0.9, 8.1], [-0.6, 8.1]], 0.38, 0.32, -2.6);
    b.set(STEEL, 0);
    b.cyl(1.3, 7.45, -2.6, 0.11, 0.09, 1.3, 6, "x", false);
    b.set(ARC, 4);
    for (const tx of [1.5, 1.85, 2.2])
        b.cyl(tx, 7.45, -2.6, 0.25, 0.25, 0.12, 8, "x");
    b.ball(2.75, 7.45, -2.6, 0.13, 0);
    for (const u of [1, -1]) {
        const Y = (y) => 7.45 + u * (y - 7.45);
        b.set(DARK, 0);
        prism(b, [[1.2, Y(7.7), -2.69], [1.2, Y(7.93), -2.69], [1.2, Y(7.93), -2.51], [1.2, Y(7.7), -2.51]], [[3.1, Y(7.6), -2.64], [3.1, Y(7.69), -2.64], [3.1, Y(7.69), -2.56], [3.1, Y(7.6), -2.56]]);
        b.set(ARC, 4);
        b.box(3.08, Y(7.63), -2.6, 0.06, 0.035, 0.055);
    }
    // back: the power pack, two exhaust stacks, two jump-jet bells
    b.set(DKH);
    b.loft([
        [-2.5, hsec(7.95, 8.6, 9.4, 0.7, 0.9, 0.75, 0.15)],
        [-2.15, hsec(7.65, 8.6, 9.7, 0.95, 1.2, 1.0, 0.2)],
        [-1.6, hsec(7.65, 8.6, 9.7, 0.95, 1.2, 1.0, 0.2)],
    ], [2]);
    b.mirrored((s) => {
        b.set(STEEL, 0);
        b.cyl(-2.0, 9.6, s * 0.72, 0.2, 0.17, 0.75, 6, "y", false);
        b.set(DARK, 0);
        b.cyl(-2.0, 10.25, s * 0.72, 0.23, 0.23, 0.22, 6, "y", true);
        b.set(STEEL, 0);
        b.cyl(-2.05, 7.0, s * 0.68, 0.36, 0.24, 0.7, 8, "y", false);
        b.set(AMBER, 4);
        b.disc(-2.05, 7.0, s * 0.68, 0.3, 8, "y", -1);
    });
    G2(() => g2Mech(b));
    return b.build([0, 9, 0], 0, 0, 0.9);
}
/** Graphics pass: the mech's near detail. */
function g2Mech(b) {
    b.mirrored((s) => {
        const z = s * 1.93;
        // flank slabs: seams, a vent, markings, the team stripe, bolts
        b.set(PANEL, 1);
        seam(b, [-0.45, 7.6, z], [-0.45, 8.55, z], [0, 0, s], 0.05);
        seam(b, [-1.45, 8.55, z], [-0.6, 8.55, z], [0, 0, s], 0.05);
        grille(b, qz(z, -1.3, -0.62, 7.82, 8.42, s), 4);
        b.set(P1, 1);
        markings(b, qz(z, 0.15, 0.85, 8.02, 8.26, s));
        b.set([1, 1, 1], 2);
        decal(b, qz(z, -0.3, 0.75, 7.72, 7.82, s), 0.02);
        b.set(GUN, 0);
        bolts(b, [-0.35, 7.63, z], [0.7, 7.63, z], 5, [0, 0, s], 0.045);
        // cheeks: a headlamp, bolts; canopy frame
        lampX(b, 1.84, 8.62, s * 1.16, 0.1);
        b.set(GUN, 0);
        bolts(b, [0.9, 9.2, s * 1.305], [1.6, 9.05, s * 1.305], 3, [0, 0, s], 0.045);
        rod(b, [1.2, 9.32, s * 0.8], [1.9, 9.25, s * 0.52], 0.03, 3);
        rod(b, [1.9, 9.25, s * 0.52], [2.28, 9.1, s * 0.24], 0.03, 3);
        rod(b, [1.9, 8.4, s * 0.64], [1.9, 9.25, s * 0.52], 0.03, 3);
        // smoke dischargers on the collar's front corners
        b.set(DARK, 0);
        for (let i = 0; i < 3; i++)
            b.cyl(0.55, 10.09, s * (0.82 + i * 0.22), 0.085, 0.085, 0.45, 5, "x", true);
        // hip guards: a seam, bolts, a hazard edge
        b.set(GUN, 0);
        bolts(b, [-0.7, 7.54, s * 1.56], [1.0, 7.54, s * 1.56], 5, [0, 1, 0], 0.05);
        b.set(HAZARD, 0);
        b.box(0.1, 7.0, s * 2.09, 0.9, 0.035, 0.03);
        // pelvis: hoses up to the waist ring
        b.set(DARK, 0);
        rod(b, [0.75, 6.55, s * 0.98], [0.6, 7.3, s * 0.92], 0.06, 4);
        rod(b, [-0.45, 6.55, s * 0.98], [-0.4, 7.3, s * 0.98], 0.06, 4);
        // launchers: a hazard band, top covers, a rear vent, warheads in the tubes
        const pz = s * 2.3;
        b.set(HAZARD, 0);
        b.loft([[-0.8, hsec(9.705, 10.3, 10.935, 0.615, 0.715, 0.615, 0.14)], [-0.66, hsec(9.705, 10.3, 10.935, 0.615, 0.715, 0.615, 0.14)]], [], pz);
        b.set(P2, 1);
        panel(b, qy(10.92, -0.5, 0.2, pz - 0.4, pz + 0.4, 1), 0.05, 0.1);
        panel(b, qy(10.92, 0.25, 0.9, pz - 0.4, pz + 0.4, 1), 0.05, 0.1);
        grille(b, qx(-1.15, pz - 0.36, pz + 0.36, 10.0, 10.6, -1), 3);
        b.set([0.7, 0.2, 0.14], 0);
        for (const ty of [10.05, 10.55])
            for (const tz of [-0.35, 0, 0.35])
                b.cyl(0.98, ty, pz + tz, 0.1, 0.03, 0.09, 5, "x", true);
        b.set(PANEL, 1);
        seam(b, [-0.3, 10.0, pz + s * 0.675], [-0.3, 10.7, pz + s * 0.61], [0, 0.1, s], 0.04, 0.03);
        // pauldrons: the team stripe and bolts on the front facet; elbow caps
        b.set([1, 1, 1], 2);
        b.quad([0.1, 9.02, s * (2.6 + 0.6 - 0.1 * 0.1 / 0.78 + 0.015)], [0.6, 9.02, s * (2.6 + 0.6 - 0.1 * 0.6 / 0.78 + 0.015)], [0.6, 9.14, s * (2.6 + 0.6 - 0.1 * 0.6 / 0.78 + 0.015)], [0.1, 9.14, s * (2.6 + 0.6 - 0.1 * 0.1 / 0.78 + 0.015)], [0, 9.1, 0]);
        b.set(DARK, 0);
        b.cyl(-0.05, 7.72, s > 0 ? 3.08 : -3.12, 0.2, 0.2, 0.04, 6, "z");
        b.cyl(-0.05, 9.15, s > 0 ? 3.19 : -3.23, 0.22, 0.22, 0.04, 6, "z");
    });
    // chest: a warm strip under the canopy, the nose bar, a brow seam, chevrons on the groin plate
    b.set(AMBER, 4);
    b.box(2.1, 8.36, 0, 0.02, 0.035, 0.7);
    b.set(GUN, 0);
    rod(b, [2.29, 8.55, 0], [2.29, 9.1, 0], 0.03, 3);
    b.set(PANEL, 1);
    seam(b, [0.3, 9.975, 0], [1.8, 9.635, 0], [0.22, 1, 0], 0.05);
    b.set(GUN, 0);
    bolts(b, [1.95, 9.5, -0.75], [1.95, 9.5, 0.75], 6, [1, 0.7, 0], 0.045);
    chevrons(b, [[[1.507, 6.2, -0.5], [1.507, 6.2, 0.5], [1.55, 6.78, 0.5], [1.55, 6.78, -0.5]], [0, 6.5, 0]], 5);
    b.set(LAMP, 4);
    b.disc(1.92, 8.02, 0, 0.1, 6, "x", 1);
    // an aerial on the collar's back (the head and its aerial, beacon and sensor are gone)
    whip(b, -1.2, 9.9, -1.0, 1.7, null);
    // autocannon: top cover bolts, a sight, a hazard band on the drum, vent slots (the ammunition chute from the pack read as a
    // stray bar across the back of the right arm: removed, designer 19 Nov)
    b.set(GUN, 0);
    bolts(b, [-0.5, 8.13, 2.6], [1.1, 8.13, 2.6], 5, [0, 1, 0], 0.045);
    b.set(DARK, 0);
    b.box(0.2, 8.22, 2.82, 0.3, 0.09, 0.09);
    b.set(GLASS, 0);
    b.disc(0.51, 8.22, 2.82, 0.07, 5, "x", 1);
    b.set(HAZARD, 0);
    b.cyl(-1.35, 7.42, 2.6, 0.445, 0.45, 0.12, 8, "x", false);
    b.set(BLACK, 0);
    for (const x of [-0.3, 0.1, 0.5, 0.9])
        b.quad([x, 7.25, 3.105], [x + 0.2, 7.25, 3.105], [x + 0.26, 7.42, 3.11], [x + 0.06, 7.42, 3.11], [x, 7.3, 2.6]);
    b.set(BLACK, 0);
    // arc lance: capacitor bottles along the housing, feed cables to the fork, a lit strip
    b.set(STEEL, 0);
    for (const x of [-0.45, 0.0, 0.45])
        b.cyl(x, 8.1, -2.6, 0.13, 0.13, 0.3, 6, "x", true);
    b.set(ARC, 4);
    b.box(0.15, 7.45, -3.065, 0.7, 0.04, 0.012);
    b.set(COPPER, 0);
    b.cyl(1.62, 7.45, -2.6, 0.15, 0.15, 0.23, 6, "x", false);
    b.cyl(1.97, 7.45, -2.6, 0.15, 0.15, 0.23, 6, "x", false);
    b.set(DARK, 0);
    rod(b, [0.9, 7.95, -2.45], [1.6, 7.86, -2.52], 0.04, 3);
    rod(b, [0.9, 6.98, -2.75], [1.6, 7.04, -2.68], 0.04, 3);
    // back: pack grille over warm light, tail lamps, stack glow, a ladder
    b.set(AMBER, 4);
    decal(b, qx(-2.5, -0.5, 0.5, 8.2, 9.15, -1), 0.006);
    grille(b, qx(-2.5, -0.55, 0.55, 8.15, 9.2, -1), 5);
    b.mirrored((s) => {
        b.set(RED, 4);
        decal(b, qx(-2.5, s > 0 ? 0.6 : -0.82, s > 0 ? 0.82 : -0.6, 8.3, 8.42, -1), 0.02);
        b.set(AMBER, 4);
        b.disc(-2.0, 10.48, s * 0.72, 0.15, 6, "y", 1);
        b.set(GUN, 0);
        bolts(b, [-2.1, 9.72, s * 0.3], [-1.65, 9.72, s * 0.3], 3, [0, 1, 0], 0.045);
    });
}
function siege() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // W2 (designer 16 Nov 14:36, "massive, off the ground"): a heavy armoured box hull carried high on four thick legs
    // (belly 5 m up), big hip housings at its corners, a head module slung under the nose with the chin guns, the siege gun
    // turret on a raised roof deck and the AA mount on the turret roof. Dark gunmetal core (team-tinted), armour plates in
    // the team colour, warm vent strips. Built from the ground up (stance 0): model y = the sim's up.
    b.set(DKH);
    b.loft([
        [-7.0, hsec(5.4, 6.3, 8.25, 2.85, 3.2, 3.0, 0.35)],
        [-6.5, hsec(5.0, 6.2, 8.6, 3.05, 3.45, 3.25, 0.45)],
        [5.3, hsec(5.0, 6.2, 8.6, 3.05, 3.45, 3.25, 0.45)],
        [6.7, hsec(5.5, 6.3, 7.9, 2.7, 3.15, 2.8, 0.3)],
    ], [2]);
    // raised roof deck the turret sits on
    b.set(P2);
    b.loft([
        [-5.5, hsec(8.5, 8.9, 9.3, 2.45, 2.6, 2.45, 0.2)],
        [3.3, hsec(8.5, 8.9, 9.3, 2.45, 2.6, 2.45, 0.2)],
        [4.1, hsec(8.5, 8.7, 8.95, 2.2, 2.3, 2.1, 0.12)],
    ], [2]);
    // side armour: a thick team-coloured slab on each flank between the hip housings, a vent strip along its top
    b.mirrored((s) => {
        b.set(P1);
        b.hull([[-3.7, 5.35], [3.0, 5.35], [3.35, 5.9], [3.2, 8.05], [-3.5, 8.05], [-3.9, 5.9]], 0.2, 0.2, s * 3.55);
        b.set(AMBER, 4);
        b.box(-0.25, 7.62, s * 3.76, 2.6, 0.07, 0.02);
        b.set(DARK, 0);
        b.box(-0.25, 5.15, s * 3.3, 3.6, 0.18, 0.12); // belly rail
    });
    // hip housings at the four corners (WALKER.hips): armoured towers over the leg bearings
    for (const [x, y0, z] of w1_walker_ts_1.WALKER.hips) {
        const y = y0 - w1_walker_ts_1.WALKER.rise; // built at W2's height, lifted at the end
        const sz = Math.sign(z), cz = sz * 3.15;
        b.set(P1);
        b.loft([
            [x - 1.55, [[5.6, 0.75], [6.2, 1.05], [8.0, 0.95], [8.5, 0.55]]],
            [x - 1.25, [[5.25, 0.95], [6.0, 1.3], [8.2, 1.2], [8.85, 0.75]]],
            [x + 1.25, [[5.25, 0.95], [6.0, 1.3], [8.2, 1.2], [8.85, 0.75]]],
            [x + 1.55, [[5.6, 0.75], [6.2, 1.05], [8.0, 0.95], [8.5, 0.55]]],
        ], [2], cz);
        b.set(STEEL, 0);
        b.cyl(x, y, sz > 0 ? 4.25 : -4.6, 1.0, 1.0, 0.35, 10, "z"); // bearing boss
        b.set(DARK, 0);
        b.cyl(x, y, sz > 0 ? 4.55 : -4.75, 0.55, 0.55, 0.2, 8, "z");
    }
    // head module slung under the nose: the driver's station and the chin guns
    b.set(DARK, 0);
    b.box(5.6, 5.3, 0, 0.9, 0.55, 1.3); // neck yoke
    b.set(P2);
    b.loft([
        [5.0, hsec(4.3, 5.0, 6.9, 1.55, 1.95, 1.8, 0.25)],
        [7.6, hsec(4.0, 4.9, 6.8, 1.65, 2.05, 1.85, 0.3)],
        [8.5, hsec(4.5, 5.1, 6.25, 1.3, 1.6, 1.4, 0.25)],
    ], [2]);
    b.set(GLASS, 0);
    b.quad([8.52, 5.55, -1.05], [8.52, 5.55, 1.05], [8.52, 5.95, 1.05], [8.52, 5.95, -1.05], [8, 5.7, 0]); // vision slit
    b.set(AMBER, 4);
    b.mirrored((s) => b.box(7.2, 6.4, s * 1.88, 0.7, 0.06, 0.02));
    // chin guns: a mount under the head, twin barrels (CHIN: the data's driver muzzle between them)
    b.set(DARK, 0);
    b.box(7.9, 4.3, 0, 0.6, 0.42, 0.95);
    for (const [tx, ty, tz] of CHIN)
        gunAutocannon(b, tx, ty, tz, tx - 7.7, 2.0); // designer 20 Nov: twin autocannon
    // siege gun turret on the roof deck, and the AA mount on its roof (part 1: turns with the aim)
    tankTurret(b, SG.px, SG.py, SG.r, SG.h, SG.L, SG.R);
    b.part = 1;
    b.set(P3, 1, 1);
    b.cyl(-1.3, SG.py + SG.h, 0, 0.6, 0.5, 0.5, 6, "y", false);
    b.disc(-1.3, SG.py + SG.h + 0.5, 0, 0.5, 6, "y", 1);
    b.set(P2, 1, 1);
    b.box(-1.2, AA[0][1], 0, 0.45, 0.3, 0.42);
    for (const [tx, ty, tz] of AA)
        gunMG(b, tx, ty, tz, tx + 1.3, 1.5, false); // designer 20 Nov: twin heavy machine guns
    b.set(GLASS, 0, 1);
    b.box(-1.5, AA[0][1] + 0.4, 0, 0.12, 0.12, 0.3); // sight
    b.part = 0;
    // rear: engine block with a lit vent
    b.set(DKH);
    b.box(-7.2, 6.8, 0, 0.3, 1.0, 2.2);
    G2(() => g2Strider(b));
    const RISE = w1_walker_ts_1.WALKER.rise; // designer 20 Nov: twice as tall (the hull lifted RISE m onto longer legs)
    for (let i = 1; i < b.d.length; i += exports.VERTEX_FLOATS)
        b.d[i] += RISE;
    return b.build([SG.px, SG.py + RISE, 0], w1_walker_ts_1.WALKER.stance, 0, 0.9); // W1: the stance height on the legs (no hover bob)
}
/**
 * W1 (designer 16 Nov): one Strider leg (kind sleg), built in its plane: +x out along the leg's yaw, +y up, from the
 * hip joint at the origin. Parts: 0 the hip yoke (turns with the leg's yaw only), 7 the thigh (hip to knee, WALKER.L1,
 * pitched by the IK), 8 the shin (knee to sole, WALKER.L2), 9 the sole (moved to the foot, kept level; W2: turned to the
 * foot's own heading, +x forward, so it is left-right symmetric). render.ts walkerLeg solves the two bones from the
 * instance's reach and drop. W2: thick plated legs, a big thigh block, an armoured shin and a wide clawed foot;
 * armour in the team colour, steel joints, rams; the far mesh keeps the plates, joints and the foot.
 */
/**
 * Frontline: one leg of the bipedal mech (kind mleg). Same parts and bone lengths as the Strider leg (the shader's IK),
 * drawn at MECH_LEG_SCALE: a slim armoured thigh, a piston-backed shin with a forward knee cap, a flat two-toe foot.
 */
/** Frontline: a call-down drop pod (resupply and weapon pods, also drawn falling): an armoured capsule, four fins, a lit band. */
function flPod() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(DARK, 0);
    b.cyl(0, 0, 0, 1.25, 1.1, 0.35, 10, "y", true); // landing ring
    b.set(P1);
    b.cyl(0, 0.35, 0, 1.1, 1.05, 2.0, 10, "y", true); // body
    b.set(P2);
    b.cyl(0, 2.35, 0, 1.05, 0.35, 1.0, 10, "y", true); // nose cone
    b.set(STEEL, 0);
    b.cyl(0, 3.35, 0, 0.2, 0.12, 0.3, 6, "y", true); // beacon mast
    b.set(AMBER, 4);
    b.cyl(0, 1.75, 0, 1.08, 1.08, 0.12, 10, "y", false); // lit band
    b.set([1, 1, 1], 2);
    b.cyl(0, 1.0, 0, 1.08, 1.08, 0.1, 10, "y", false); // team band
    b.set(DARK, 0);
    for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        yawBox(b, Math.cos(a) * 1.3, 0.9, Math.sin(a) * 1.3, a, 0.35, 0.8, 0.06, 1, 0);
    }
    G2(() => {
        // graphics pass: hazard ring on the landing skirt, plate seams and bolts, an access hatch, retro nozzles, a beacon
        b.set(HAZARD, 0);
        b.cyl(0, 0.3, 0, 1.13, 1.12, 0.07, 10, "y", false);
        for (let k = 0; k < 10; k++) {
            const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2, am = (a0 + a1) / 2, n = [Math.cos(am), 0, Math.sin(am)];
            const P = (a, y, r) => [Math.cos(a) * r, y, Math.sin(a) * r];
            b.set(PANEL, 1);
            seam(b, P(a0, 0.4, 1.1), P(a0, 2.3, 1.05), [Math.cos(a0), 0, Math.sin(a0)], 0.05, 0.01);
            b.set(GUN, 0);
            bolts(b, vlerp(P(a0, 2.2, 1.055), P(a1, 2.2, 1.055), 0.1), vlerp(P(a0, 2.2, 1.055), P(a1, 2.2, 1.055), 0.9), 3, n, 0.04);
            if (k % 5 === 1) {
                b.set(P2, 1);
                panel(b, [[vlerp(P(a0, 0.5, 1.097), P(a1, 0.5, 1.097), 0.15), vlerp(P(a0, 0.5, 1.097), P(a1, 0.5, 1.097), 0.85), vlerp(P(a0, 1.5, 1.07), P(a1, 1.5, 1.07), 0.85), vlerp(P(a0, 1.5, 1.07), P(a1, 1.5, 1.07), 0.15)], [0, 1, 0]], 0.05, 0.08);
            }
        }
        b.set(DARK, 0);
        for (let k = 0; k < 4; k++) {
            const a = k * Math.PI / 2;
            b.cyl(Math.cos(a) * 0.72, 2.75, Math.sin(a) * 0.72, 0.1, 0.14, 0.22, 5, "y", true);
        }
        beacon(b, 0, 3.65, 0, AMBER, 0.09);
    });
    return b.build([0, 0, 0], 0, 0);
}
/** Frontline: one resupply container: an ammo crate with a team band and a lit handle. */
/**
 * Frontline: the vehicle drop crate (unit size: 1 m wide; scaled to the vehicle it carries). Closed while it falls on four
 * corner thrusters; on the ground its four walls fall outward (fldropwall: part 23, hinged at the bottom outer edge, the
 * angle in iC.y) and the floor with its thrusters stays a moment (fldropbase).
 */
const DROP_W = 0.5, DROP_H = 0.78, DROP_T = 0.035;
function dropThrusters(b) {
    for (const sx of [1, -1])
        for (const sz of [1, -1]) {
            b.set(GUN, 0);
            b.box(sx * 0.43, 0.02, sz * 0.43, 0.075, 0.05, 0.075);
            b.set(DARK, 0);
            b.cyl(sx * 0.43, -0.06, sz * 0.43, 0.06, 0.075, 0.08, 8, "y", true);
            b.set([1, 0.72, 0.35], 4); // the nozzle's hot ring
            b.cyl(sx * 0.43, -0.105, sz * 0.43, 0.052, 0.052, 0.012, 8, "y", true);
        }
}
function dropWallFace(b, outward) {
    // one wall: a ribbed panel, hazard band low, the team's stripe high; x from -DROP_T (inside) to 0 (outside)
    b.set(P2, 1, 23);
    b.box(-DROP_T / 2, 0.05 + (DROP_H - 0.05) / 2, 0, DROP_T / 2, (DROP_H - 0.05) / 2, DROP_W);
    b.set(DARK, 0, 23);
    for (const z of [-0.33, 0, 0.33])
        b.box(0.008, 0.05 + (DROP_H - 0.05) / 2, z, 0.008, (DROP_H - 0.07) / 2, 0.025);
    b.set(HAZARD, 0, 23);
    b.box(0.004, 0.13, 0, 0.004, 0.035, DROP_W * 0.96);
    b.set([1, 1, 1], 2, 23);
    b.box(0.004, DROP_H - 0.1, 0, 0.004, 0.025, DROP_W * 0.96);
    b.set(GUN, 0, 23);
    b.box(-DROP_T / 2, 0.06, 0, DROP_T * 0.7, 0.012, DROP_W); // the hinge rail
}
function flDrop() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(GUN, 0);
    b.box(0, 0.025, 0, DROP_W, 0.025, DROP_W); // floor
    for (let i = 0; i < 4; i++) { // four walls, each the wall mesh turned to its side
        const w = new MeshBuilder();
        w.grit = exports.GRIT;
        dropWallFace(w, true);
        const a = (i * Math.PI) / 2, c = Math.cos(a), sn = Math.sin(a), V = w.d, F = exports.VERTEX_FLOATS;
        for (let v = 0; v < V.length; v += F) {
            const x = V[v] + DROP_W, z = V[v + 2], nx = V[v + 3], nz = V[v + 5];
            V[v] = x * c - z * sn;
            V[v + 2] = x * sn + z * c;
            V[v + 3] = nx * c - nz * sn;
            V[v + 5] = nx * sn + nz * c;
            V[v + 9] = 0; // part 0 on the closed crate (only the loose walls hinge)
        }
        for (let v = 0; v < V.length; v++)
            b.d.push(V[v]);
    }
    b.set(P2, 1);
    b.box(0, DROP_H + 0.02, 0, DROP_W + 0.01, 0.025, DROP_W + 0.01); // lid
    b.set(DARK, 0);
    b.box(0, DROP_H + 0.05, 0, 0.32, 0.012, 0.32);
    b.set([1, 0.3, 0.2], 5); // a blinking beacon on the lid
    b.box(0.36, DROP_H + 0.07, 0.36, 0.03, 0.02, 0.03);
    dropThrusters(b);
    return b.build([0, 0, 0], 0, 0);
}
function flDropWall() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    dropWallFace(b, true);
    return b.build([0, 0, 0], 0, 0);
}
function flDropBase() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(GUN, 0);
    b.box(0, 0.025, 0, DROP_W, 0.025, DROP_W);
    b.set(HAZARD, 0);
    for (const s of [1, -1]) {
        b.box(s * (DROP_W - 0.03), 0.052, 0, 0.02, 0.003, DROP_W * 0.9);
        b.box(0, 0.052, s * (DROP_W - 0.03), DROP_W * 0.9, 0.003, 0.02);
    }
    dropThrusters(b);
    return b.build([0, 0, 0], 0, 0);
}
function flCrate() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(P2);
    b.box(0, 0.32, 0, 0.5, 0.32, 0.32);
    b.set(DARK, 0);
    b.box(0, 0.66, 0, 0.52, 0.03, 0.34);
    b.set([1, 1, 1], 2);
    b.box(0, 0.32, 0, 0.51, 0.06, 0.33);
    b.set([0.35, 1, 0.5], 2);
    b.box(0, 0.71, 0, 0.18, 0.025, 0.04);
    G2(() => {
        // graphics pass: corner posts, latches, end grips, stencil bars on the lid
        b.set(GUN, 0);
        for (const sx of [1, -1])
            for (const sz of [1, -1])
                b.box(sx * 0.49, 0.33, sz * 0.31, 0.035, 0.34, 0.035);
        b.mirrored((s) => {
            b.set(DARK, 0);
            b.box(-0.22, 0.6, s * 0.335, 0.05, 0.07, 0.015);
            b.box(0.22, 0.6, s * 0.335, 0.05, 0.07, 0.015);
            b.set(HAZARD, 0);
            b.box(0, 0.12, s * 0.325, 0.4, 0.03, 0.006);
        });
        for (const sx of [1, -1]) {
            b.set(DARK, 0);
            rod(b, [sx * 0.54, 0.42, -0.14], [sx * 0.54, 0.42, 0.14], 0.02, 3);
        }
        markings(b, qy(0.69, -0.42, -0.24, -0.2, 0.2, 1));
    });
    return b.build([0, 0, 0], 0, 0);
}
function mechLeg() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    const L1 = w1_walker_ts_1.WALKER.L1, L2 = w1_walker_ts_1.WALKER.L2;
    // Graphics pass. Drawn at MECH_WALKER.legScale (0.8). In the thigh's and the shin's own frames +y is the front of
    // the leg (the knee points forward), -y the back (the rams).
    // hip: a bearing drum across the leg with dark axle caps, yoke cheeks up into the body's hip guard
    b.set(STEEL, 0, 0);
    b.cyl(0, 0, -0.7, 0.68, 0.68, 1.4, 10, "z", true);
    b.set(DARK, 0, 0);
    b.cyl(0, 0, -0.78, 0.4, 0.4, 1.56, 8, "z", true);
    b.set(DKH, 1, 0);
    b.mirrored((s) => b.box(-0.05, 0.5, s * 0.6, 0.5, 0.36, 0.09));
    // thigh: a plated block, thick under the hip and tapering to the knee, a raised front plate, the knee joint
    b.set(P1, 1, 7);
    b.loft([
        [-0.35, hsec(-0.5, 0.0, 0.55, 0.36, 0.5, 0.4, 0.14)],
        [0.7, hsec(-0.72, 0.05, 0.8, 0.48, 0.64, 0.5, 0.2)],
        [2.6, hsec(-0.62, 0.05, 0.72, 0.44, 0.58, 0.46, 0.18)],
        [L1 - 0.75, hsec(-0.46, 0.0, 0.52, 0.36, 0.46, 0.38, 0.14)],
        [L1 - 0.2, hsec(-0.36, 0.0, 0.4, 0.3, 0.4, 0.3, 0.1)],
    ], [2]);
    b.set(P2, 1, 7);
    b.hull([[0.3, 0.78], [L1 - 1.3, 0.6], [L1 - 0.95, 0.84], [0.75, 1.1]], 0.5, 0.4);
    b.set(STEEL, 0, 7);
    b.cyl(L1, 0, -0.6, 0.6, 0.6, 1.2, 10, "z", true);
    b.set(DARK, 0, 7);
    b.cyl(L1, 0, -0.78, 0.3, 0.3, 1.56, 6, "z", true);
    // shin: clevis discs round the knee, a calf swelling at the back, a forward knee cap and a greave, the ankle
    b.set(DARK, 0, 8);
    b.mirrored((s) => b.cyl(0, 0, s > 0 ? 0.6 : -0.74, 0.5, 0.5, 0.14, 8, "z", true));
    b.set(P2, 1, 8);
    b.loft([
        [-0.1, hsec(-0.45, 0.0, 0.5, 0.36, 0.46, 0.38, 0.14)],
        [0.9, hsec(-0.76, 0.0, 0.62, 0.46, 0.58, 0.46, 0.18)],
        [2.2, hsec(-0.6, 0.0, 0.52, 0.4, 0.5, 0.4, 0.15)],
        [L2 - 1.0, hsec(-0.36, 0.0, 0.38, 0.3, 0.38, 0.3, 0.1)],
    ], [2]);
    b.set(P1, 1, 8);
    b.hull([[-0.55, 0.42], [1.2, 0.6], [1.55, 0.86], [0.3, 1.08], [-0.45, 0.96]], 0.54, 0.4); // knee cap
    b.hull([[1.55, 0.5], [L2 - 1.1, 0.36], [L2 - 1.3, 0.6], [1.75, 0.82]], 0.44, 0.34); // greave
    b.set(STEEL, 0, 8);
    b.cyl(L2 - 1.1, 0, 0, 0.3, 0.26, 0.4, 8, "x", false);
    b.ball(L2 - 0.7, 0, 0, 0.42, 0);
    // foot: a broad sole, an armoured instep, trunnion cheeks round the ankle, two toes with claws and a heel spur
    b.set(DARK, 0, 9);
    b.loft([
        [-1.15, [[0.0, 0.4], [0.2, 0.46], [0.32, 0.36]]],
        [-0.75, [[0.0, 0.66], [0.24, 0.72], [0.42, 0.6]]],
        [0.95, [[0.0, 0.8], [0.24, 0.86], [0.42, 0.72]]],
        [1.3, [[0.0, 0.74], [0.2, 0.78], [0.3, 0.66]]],
    ]);
    b.set(P1, 1, 9);
    b.hull([[-0.85, 0.42], [1.2, 0.42], [1.12, 0.62], [0.25, 0.76], [-0.62, 0.72]], 0.62, 0.48);
    b.set(STEEL, 0, 9);
    b.mirrored((s) => b.cyl(0.38, 0.62, s > 0 ? 0.44 : -0.6, 0.46, 0.46, 0.16, 8, "z", true));
    for (const s of [1, -1]) {
        const a = s * 0.14;
        b.set(P2, 1, 9);
        yawBox(b, 1.62, 0.22, s * 0.44, a, 0.45, 0.22, 0.28, 0.62, 0.06);
        b.set(GUN, 0, 9);
        yawBox(b, 1.62 + Math.cos(a) * 0.62, 0.13, s * 0.44 + Math.sin(a) * 0.62, a, 0.2, 0.13, 0.18, 0.35, 0.06);
    }
    b.set(P2, 1, 9);
    yawBox(b, -1.3, 0.2, 0, Math.PI, 0.3, 0.2, 0.3, 0.55, 0.06);
    G2(() => {
        // thigh: a ram along the back, plate seams, bolts, a warm vent strip, a hazard band above the knee
        b.set(STEEL, 0, 7);
        rod(b, [0.5, -0.86, 0], [L1 - 1.9, -0.66, 0], 0.15, 6);
        b.set(GLASS, 0, 7);
        rod(b, [L1 - 1.9, -0.66, 0], [L1 - 0.6, -0.42, 0], 0.085, 6);
        b.set(DARK, 0, 7);
        b.box(0.5, -0.76, 0, 0.16, 0.14, 0.16);
        b.box(L1 - 0.6, -0.4, 0, 0.13, 0.1, 0.13);
        b.set(HAZARD, 0, 7);
        b.box(L1 - 1.0, 0.03, 0, 0.07, 0.58, 0.5);
        b.mirrored((s) => {
            b.set(PANEL, 1, 7);
            b.box(1.5, 0.05, s * 0.615, 0.025, 0.5, 0.012);
            b.set(GUN, 0, 7);
            bolts(b, [0.4, 0.5, s * 0.62], [2.5, 0.46, s * 0.585], 5, [0, 0.2, s], 0.05);
            b.set(AMBER, 4, 7);
            b.box(2.2, -0.3, s * 0.555, 0.5, 0.045, 0.02);
            b.set(DARK, 0, 7);
            rod(b, [0.3, -0.42, s * 0.58], [L1 - 0.6, -0.28, s * 0.42], 0.04, 3);
        });
        b.set(GUN, 0, 7);
        bolts(b, [0.8, 1.1, 0.25], [L1 - 1.4, 0.66, 0.25], 4, [0.15, 1, 0], 0.045);
        bolts(b, [0.8, 1.1, -0.25], [L1 - 1.4, 0.66, -0.25], 4, [0.15, 1, 0], 0.045);
        // shin: a ram down the calf, seams, bolts, a hazard band at the ankle, a lit strip on the greave
        b.set(STEEL, 0, 8);
        rod(b, [0.7, -0.86, 0], [2.3, -0.66, 0], 0.13, 6);
        b.set(GLASS, 0, 8);
        rod(b, [2.3, -0.66, 0], [L2 - 0.95, -0.36, 0], 0.075, 6);
        b.set(DARK, 0, 8);
        b.box(0.7, -0.78, 0, 0.14, 0.12, 0.14);
        b.set(HAZARD, 0, 8);
        b.cyl(L2 - 1.05, 0, 0, 0.42, 0.4, 0.12, 8, "x", false);
        b.mirrored((s) => {
            b.set(PANEL, 1, 8);
            b.box(1.5, -0.05, s * 0.545, 0.025, 0.42, 0.012);
            b.set(GUN, 0, 8);
            bolts(b, [0.5, -0.3, s * 0.555], [2.2, -0.26, s * 0.47], 4, [0, -0.2, s], 0.045);
            b.set([1, 1, 1], 2, 8);
            b.box(2.1, 0.66, s * 0.36, 0.5, 0.03, 0.02);
            b.set(GUN, 0, 8);
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                b.box(Math.cos(a) * 0.36, Math.sin(a) * 0.36, s * 0.75, 0.05, 0.05, 0.02);
            }
        });
        // foot: toe knuckles, a hazard edge on the instep, bolts
        b.set(STEEL, 0, 9);
        for (const s of [1, -1])
            b.ball(1.2, 0.42, s * 0.42, 0.2, 0);
        b.set(HAZARD, 0, 9);
        b.box(0.18, 0.44, 0, 1.04, 0.03, 0.63);
        b.set(GUN, 0, 9);
        bolts(b, [-0.5, 0.74, 0], [0.2, 0.77, 0], 3, [0, 1, 0], 0.05);
    });
    return b.build([0, 0, 0], 0, 0, 0.9);
}
function striderLeg() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    const L1 = w1_walker_ts_1.WALKER.L1, L2 = w1_walker_ts_1.WALKER.L2;
    // hip yoke: a bearing drum against the housing, clevis cheeks round the thigh's pin
    b.set(STEEL, 0, 0);
    b.cyl(-0.35, -0.85, 0, 0.8, 0.8, 1.7, 10, "y", true);
    b.set(DARK, 0, 0);
    b.mirrored((s) => b.box(0.15, 0, s * 1.1, 0.75, 0.72, 0.12));
    // thigh: a big plated block, the knee joint at its end
    b.set(P1, 1, 7);
    b.loft([
        [-0.55, hsec(-0.75, 0.0, 0.8, 0.64, 0.9, 0.72, 0.22)],
        [0.6, hsec(-0.98, 0.0, 1.02, 0.72, 1.0, 0.8, 0.28)],
        [L1 - 0.9, hsec(-0.86, 0.0, 0.9, 0.67, 0.92, 0.74, 0.24)],
        [L1 - 0.15, hsec(-0.6, 0.0, 0.65, 0.55, 0.76, 0.6, 0.2)],
    ], [2]);
    b.set(P2, 1, 7);
    b.hull([[0.15, 0.92], [L1 - 1.1, 0.84], [L1 - 0.55, 1.12], [0.55, 1.34]], 0.72, 0.58); // dorsal plate
    b.set(STEEL, 0, 7);
    b.cyl(0, 0, -1.2, 0.58, 0.58, 2.4, 8, "z", true);
    b.cyl(L1, 0, -1.02, 0.85, 0.85, 2.04, 10, "z", true);
    b.set(DARK, 0, 7);
    b.cyl(L1, 0, -1.12, 0.45, 0.45, 2.24, 6, "z", true);
    // shin: a thick armoured strut tapering to the ankle
    b.set(P2, 1, 8);
    b.loft([
        [-0.3, hsec(-0.8, 0.0, 0.8, 0.64, 0.8, 0.64, 0.22)],
        [1.0, hsec(-0.92, 0.0, 0.95, 0.72, 0.86, 0.72, 0.26)],
        [L2 - 1.5, hsec(-0.7, 0.0, 0.72, 0.58, 0.68, 0.58, 0.2)],
        [L2 - 0.8, hsec(-0.52, 0.0, 0.54, 0.46, 0.53, 0.46, 0.16)],
    ], [2]);
    b.set(P1, 1, 8);
    b.hull([[-0.2, 0.78], [1.6, 0.95], [1.9, 1.25], [0.2, 1.35]], 0.76, 0.64); // knee guard
    b.set(STEEL, 0, 8);
    b.ball(L2 - 0.6, 0, 0, 0.58, 0);
    // sole: a wide armoured base, three clawed toes forward and a spur behind (underside at the foot point)
    b.set(DARK, 0, 9);
    b.cyl(0, 0, 0, 1.35, 1.2, 0.42, 8, "y", true, Math.PI / 8);
    b.set(P1, 1, 9);
    b.cyl(0, 0.42, 0, 1.2, 0.78, 0.38, 8, "y", true, Math.PI / 8);
    b.set(STEEL, 0, 9);
    b.cyl(0, 0.8, 0, 0.6, 0.5, 0.35, 8, "y", true);
    for (const a of [-0.62, 0, 0.62, Math.PI]) {
        const back = a === Math.PI, r = back ? 1.35 : 1.6;
        b.set(P2, 1, 9);
        yawBox(b, Math.cos(a) * r, 0.27, Math.sin(a) * r, a, back ? 0.5 : 0.75, 0.27, 0.33, 0.7, 0.05);
        b.set(GUN, 0, 9);
        yawBox(b, Math.cos(a) * (r + (back ? 0.6 : 0.88)), 0.16, Math.sin(a) * (r + (back ? 0.6 : 0.88)), a, 0.22, 0.16, 0.24, 0.35, 0.08);
    }
    G2(() => {
        // thigh: a big ram along its underside, armour plate seams, bolt rows, a warm vent and a hazard band at the knee
        b.set(STEEL, 0, 7);
        rod(b, [0.4, -1.12, 0], [L1 - 1.3, -1.04, 0], 0.18, 6);
        b.set(GLASS, 0, 7);
        rod(b, [L1 - 2.0, -1.04, 0], [L1 - 0.8, -0.9, 0], 0.11, 6);
        b.set(DARK, 0, 7);
        b.box(0.4, -0.98, 0, 0.18, 0.14, 0.18);
        b.box(L1 - 0.75, -0.82, 0, 0.16, 0.12, 0.14);
        b.set(HAZARD, 0, 7);
        b.cyl(L1 - 0.85, 0, 0, 0.8, 0.8, 0.16, 8, "x", false);
        b.mirrored((s) => {
            const z = s * 1.0;
            b.set(PANEL, 1, 7);
            for (const x of [0.9, 1.9, 2.8])
                b.box(x, 0.05, z, 0.025, 0.7, 0.012);
            b.set(GUN, 0, 7);
            bolts(b, [0.3, 0.6, z], [L1 - 1.0, 0.55, z], 6, [0, 0, s], 0.06);
            b.set(AMBER, 4, 7);
            b.box(1.9, -0.35, s * 0.985, 0.7, 0.06, 0.02);
            b.set(DARK, 0, 7);
            grille(b, qz(z + s * 0.01, 0.45, 1.5, -0.6, -0.1, s), 3);
            b.set(DARK, 0, 7);
            rod(b, [0.2, -0.45, s * 0.93], [L1 - 0.5, -0.4, s * 0.84], 0.045, 3); // cable loom
        });
        // shin: a ram on its outer face, plate seams, a hazard band and the ankle cowl
        b.set(STEEL, 0, 8);
        rod(b, [0.6, 1.05, 0], [L2 - 1.9, 0.76, 0], 0.15, 6);
        b.set(GLASS, 0, 8);
        rod(b, [L2 - 2.6, 0.8, 0], [L2 - 1.6, 0.7, 0], 0.1, 6);
        b.set(HAZARD, 0, 8);
        b.cyl(L2 - 1.35, 0, 0, 0.68, 0.66, 0.14, 8, "x", false);
        b.mirrored((s) => {
            const z = s * 0.86;
            b.set(PANEL, 1, 8);
            for (const x of [1.3, 2.3])
                b.box(x, 0.0, z, 0.025, 0.7, 0.012);
            b.set(GUN, 0, 8);
            bolts(b, [0.2, -0.55, z], [L2 - 1.8, -0.4, s * 0.68], 5, [0, 0, s], 0.055);
            b.set(DARK, 0, 8);
            rod(b, [0.4, -0.6, s * 0.75], [L2 - 1.0, -0.35, s * 0.47], 0.04, 3);
        });
        b.set(P3, 1, 8);
        b.cyl(L2 - 1.0, 0, 0, 0.62, 0.7, 0.5, 8, "x", false); // ankle cowl
        // sole: bolt ring, toe joints, a lit marker
        b.set(GUN, 0, 9);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
            b.box(Math.cos(a) * 0.95, 0.81, Math.sin(a) * 0.95, 0.07, 0.04, 0.07);
        }
        b.set(STEEL, 0, 9);
        for (const a of [-0.62, 0, 0.62, Math.PI])
            b.ball(Math.cos(a) * 1.05, 0.42, Math.sin(a) * 1.05, 0.26, 0);
        b.set(HAZARD, 0, 9);
        b.cyl(0, 0.36, 0, 1.36, 1.33, 0.08, 8, "y", false, Math.PI / 8);
    });
    // designer 20 Nov: the leg is drawn WALKER.legScale times larger (twice as tall); pre-shrink its cross-sections (the
    // yoke, thigh and shin across their length, the sole all over) so the drawn leg is long but only ~1.2x as thick
    const k = w1_walker_ts_1.WALKER.legScale ?? 1, t = Math.min(1, 1.2 / k), ts = Math.min(1, 1.3 / k), VF = exports.VERTEX_FLOATS;
    if (k !== 1)
        for (let v = 0; v < b.d.length; v += VF) {
            const part = b.d[v + 9], sx = part > 8.5 ? ts : 1, sy = part > 8.5 ? ts : t, sz = part > 8.5 ? ts : t;
            b.d[v] *= sx;
            b.d[v + 1] *= sy;
            b.d[v + 2] *= sz;
            let nx = b.d[v + 3] / sx, ny = b.d[v + 4] / sy, nz = b.d[v + 5] / sz;
            const l = Math.hypot(nx, ny, nz) || 1;
            b.d[v + 3] = nx / l;
            b.d[v + 4] = ny / l;
            b.d[v + 5] = nz / l;
        }
    return b.build([0, 0, 0], 0, 0);
}
/** A rider (torso, arms, legs, helmet with a lit visor) sitting at x on a bike. */
function rider(b, x, armsForward = true, suit = CANVAS, y = 0) {
    // P3: a chamfered torso leaning into the ride, a dark helmet with a wide lit visor
    b.set(suit, 0);
    b.loft([[x - 0.3, [[0.95 + y, 0.2], [1.5 + y, 0.24], [1.66 + y, 0.16]]], [x + 0.2, [[0.95 + y, 0.2], [1.42 + y, 0.24], [1.56 + y, 0.16]]]]);
    if (armsForward)
        b.mirrored((s) => b.box(x + 0.45, 1.35 + y, s * 0.25, 0.4, 0.07, 0.07));
    else
        b.mirrored((s) => b.box(x + 0.1, 1.3 + y, s * 0.3, 0.22, 0.07, 0.07));
    b.set(DARK, 0);
    b.mirrored((s) => b.box(x - 0.1, 0.85 + y, s * 0.33, 0.35, 0.12, 0.08)); // legs
    b.set(GUN, 0);
    b.ball(x, 1.86 + y, 0, 0.2, 0, 1.05);
    b.set([1, 1, 1], 2);
    b.box(x + 0.16, 1.86 + y, 0, 0.06, 0.05, 0.14); // visor glow
}
function bike(wreck = false) {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // P3: a lofted, chamfered body tapering to a pointed nose (rear 1.75 m, nose 2.05 m: the old length)
    b.set(P1);
    const sec = (yb, ym, yt, wb, wm, wt, c) => [[yb, wb], [ym, wm], [yt - c, wt], [yt, wt - c]];
    b.loft([
        [-1.75, sec(0.38, 0.6, 0.84, 0.24, 0.34, 0.26, 0.08)],
        [0.7, sec(0.25, 0.56, 0.95, 0.34, 0.5, 0.36, 0.12)],
        [1.55, sec(0.3, 0.5, 0.74, 0.22, 0.34, 0.22, 0.08)],
        [2.05, sec(0.42, 0.48, 0.55, 0.05, 0.08, 0.06, 0.02)],
    ], [2]);
    b.set(PANEL);
    b.quad([0.72, 0.955, -0.3], [0.78, 0.955, -0.3], [0.78, 0.955, 0.3], [0.72, 0.955, 0.3], [0.75, 0, 0]); // panel seam across the tank
    // cowl, windscreen and bars
    b.set(P3);
    b.hull([[0.55, 0.9], [1.35, 0.88], [0.95, 1.3], [0.62, 1.26]], 0.38, 0.24);
    b.set(GLASS, 0);
    b.hull([[0.66, 1.26], [0.95, 1.3], [0.74, 1.56], [0.6, 1.52]], 0.21, 0.16);
    b.set(GUN, 0);
    b.box(0.42, 1.3, 0, 0.04, 0.04, 0.52);
    // side vanes, panniers, exhausts, hover plates
    b.set(DARK, 0);
    b.mirrored((s) => b.hull([[-1.55, 0.3], [0.3, 0.3], [0.55, 0.42], [-1.45, 0.52]], 0.05, 0.05, s * 0.5));
    b.set(OLIVE, 0);
    b.mirrored((s) => b.box(-1.15, 0.66, s * 0.5, 0.3, 0.15, 0.09));
    b.mirrored((s) => {
        b.set(STEEL, 0);
        b.cyl(-2.0, 0.62, s * 0.16, 0.12, 0.13, 0.4, 6, "x", false);
        b.set([1, 1, 1], 3);
        b.disc(-2.0, 0.62, s * 0.16, 0.1, 6, "x", -1);
    });
    for (const x of [1.0, -1.0]) {
        b.set(STEEL, 0);
        b.cyl(x, 0.17, 0, 0.3, 0.32, 0.12, 6, "y", false);
        b.set([1, 1, 1], 3);
        b.disc(x, 0.17, 0, 0.27, 6, "y", -1);
    }
    b.mirrored((s) => glowStripe(b, -1.3, 0.6, 0.64, s * 0.47, 0.06));
    b.set([1, 1, 1], 2);
    b.disc(1.83, 0.6, 0, 0.07, 4, "x", 1); // running light on the nose
    // forward guns (muzzles stay at x 2.3)
    b.set(GUN, 0);
    b.mirrored((s) => b.cyl(1.0, 0.45, s * 0.42, 0.06, 0.06, 1.3, 5, "x"));
    if (!wreck)
        rider(b, -0.1);
    return b.build([0, 0, 0], 0.55, 0.15);
}
/** P3: a ducted fan: an open duct with a lip ring on top, a lit fan face inside and a hub (axis y). */
function duct(b, x, y, z, r, h, n) {
    b.set(P2);
    b.cyl(x, y, z, r, r * 0.96, h, n, "y", false);
    b.set(STEEL, 0);
    const ri = r * 0.8;
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        b.quad([x + Math.cos(a0) * ri, y + h, z + Math.sin(a0) * ri], [x + Math.cos(a1) * ri, y + h, z + Math.sin(a1) * ri], [x + Math.cos(a1) * r * 0.96, y + h, z + Math.sin(a1) * r * 0.96], [x + Math.cos(a0) * r * 0.96, y + h, z + Math.sin(a0) * r * 0.96], [x, y, z]);
    }
    b.set([1, 1, 1], 3);
    b.disc(x, y + h * 0.5, z, ri, n, "y", 1);
    b.disc(x, y + 0.02, z, r * 0.9, n, "y", -1);
    b.set(DARK, 0);
    b.cyl(x, y + h * 0.5, z, r * 0.18, r * 0.12, h * 0.6, 5, "y", false);
}
function aircraft() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // P3 Wasp: a lofted, chamfered fuselage tapering to a pointed nose and into the tail boom, a glass bubble canopy (on
    // the data's driver zone), airfoil stub wings, ducted fans with lit faces, rocket pods with nose cones, skids
    b.set(P1);
    b.loft([
        [-3.2, hsec(0.5, 0.7, 0.95, 0.3, 0.42, 0.3, 0.1)],
        [-1.5, hsec(0.15, 0.6, 1.3, 0.72, 0.88, 0.6, 0.2)],
        [1.8, hsec(0.05, 0.55, 1.15, 0.72, 0.88, 0.55, 0.2)],
        [3.0, hsec(0.15, 0.45, 0.8, 0.45, 0.55, 0.3, 0.12)],
        [3.7, hsec(0.4, 0.48, 0.58, 0.08, 0.12, 0.06, 0.03)],
    ], [2]);
    b.set(GLASS, 0);
    b.loft([[1.45, [[1.05, 0.48], [1.38, 0.36], [1.52, 0.14]]], [2.25, [[1.0, 0.46], [1.32, 0.34], [1.42, 0.12]]], [2.95, [[0.78, 0.3], [0.86, 0.22], [0.9, 0.08]]]]);
    b.set(PANEL);
    for (const x of [-0.6, 0.9])
        b.quad([x, 1.315, -0.55], [x + 0.08, 1.31, -0.55], [x + 0.08, 1.31, 0.55], [x, 1.315, 0.55], [x, 0, 0]);
    b.set(P2);
    b.loft([[-6.4, [[0.6, 0.12], [0.75, 0.16], [0.86, 0.1]]], [-3.0, [[0.42, 0.26], [0.7, 0.32], [0.92, 0.22]]]]); // tail boom
    b.hull([[-6.4, 0.85], [-5.5, 0.85], [-6.0, 2.3], [-6.5, 2.3]], 0.08, 0.05); // fin
    b.hull([[-6.3, 0.68], [-5.6, 0.68], [-5.7, 0.76], [-6.3, 0.76]], 1.2, 1.2); // tailplane
    b.set(P3);
    b.hull([[-1.1, 0.68], [0.3, 0.66], [0.75, 0.72], [0.3, 0.8], [-1.0, 0.78]], 3.25, 3.25); // stub wings (airfoil section)
    b.mirrored((s) => {
        duct(b, -0.2, 0.2, s * 3.6, 0.85, 1.0, 8);
        // F3: the fan's blur disc (drawn translucent at speed) and, on the far mesh, two simple blades that turn
        const rr = s > 0 ? 0 : 1;
        b.set(STEEL, 0, 14 + rr);
        b.disc(-0.2, 0.97, s * 3.6, 0.66, 12, "y", 1);
        b.disc(-0.2, 0.965, s * 3.6, 0.66, 12, "y", -1);
        if (LO) {
            b.set(GUN, 0, 10 + rr);
            b.box(-0.2, 0.96, s * 3.6, 0.64, 0.02, 0.09);
            b.box(-0.2, 0.96, s * 3.6, 0.09, 0.02, 0.64);
        }
        b.set(GUN, 0, 0);
        b.set(GUN, 0);
        b.cyl(0.2, 0.45, s * 2.3, 0.22, 0.22, 1.3, 8, "x", false, Math.PI / 8); // rocket pods
        b.disc(0.2, 0.45, s * 2.3, 0.22, 8, "x", -1, Math.PI / 8);
        b.set(DARK, 0);
        b.cyl(1.5, 0.45, s * 2.3, 0.22, 0.2, 0.06, 8, "x", true, Math.PI / 8); // front plate
        b.set(GBLK, 0);
        b.disc(1.562, 0.45, s * 2.3, 0.05, 6, "x", 1);
        for (let k = 0; k < 6; k++)
            b.disc(1.562, 0.45 + Math.cos(k * Math.PI / 3) * 0.12, s * 2.3 + Math.sin(k * Math.PI / 3) * 0.12, 0.045, 6, "x", 1); // tube mouths
        b.set(HAZARD, 0);
        b.cyl(1.2, 0.45, s * 2.3, 0.225, 0.225, 0.05, 8, "x", false, Math.PI / 8);
        b.set(DARK, 0);
        b.box(0.4, -0.25, s * 0.55, 1.4, 0.04, 0.05);
        b.box(0.4, -0.08, s * 0.55, 0.04, 0.15, 0.04); // skid
        b.set([1, 1, 1], 2);
        b.disc(-0.2, 0.75, s * 3.26, 0.08, 4, "z", s); // wingtip light
    });
    b.mirrored((s) => glowStripe(b, -2.4, 1.6, 0.85, s * 0.8, 0.08));
    b.set([1, 1, 1], 2);
    b.quad([-2.6, 1.0, -0.12], [-1.6, 1.25, -0.12], [-1.6, 1.25, 0.12], [-2.6, 1.0, 0.12], [-2, 0, 0]); // team spine plate
    b.set([1, 1, 1], 3);
    b.disc(-3.21, 0.72, 0, 0.18, 6, "x", -1);
    b.part = 1;
    b.set(GUN, 0, 1);
    b.ball(3.0, 0.05, 0, 0.32, 0);
    gunMinigun(b, 4.5, 0.0, 0, 1.5, 1.25, 3); // designer 20 Nov: a three-barrel rotary cannon
    b.part = 0;
    G2(() => g2Wasp(b));
    const m = b.build([3.0, 0.05, 0], 0, 0.35);
    m.rotors = [[-0.2, 0.97, 3.6, 1], [-0.2, 0.97, -3.6, -1]]; // F3
    return m;
}
function infantry() {
    // limbs are separate parts so the vertex shader can swing them (walk cycle): legs pivot at the hip (y 0.9),
    // arms at the shoulder (x 0.08, y 1.38); the rifle is carried by the right arm.
    // P3: thighs in the suit colour over dark shins and boots, a chamfered torso, a team-tinted chest plate, pack and
    // shoulder pads (the team colour reads on foot), a belt, the helmet with a lit visor
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.mirrored((s) => {
        const leg = s > 0 ? 4 : 3;
        b.set(CANVAS, 0, leg);
        b.box(0.0, 0.7, s * 0.14, 0.11, 0.21, 0.1); // thigh
        b.set(DARK, 0, leg);
        b.box(0.02, 0.255, s * 0.14, 0.1, 0.225, 0.09);
        b.box(0.08, 0.05, s * 0.14, 0.15, 0.05, 0.1); // shin (top at the knee, y 0.48), boot
        b.ball(0.01, 0.49, s * 0.14, 0.085, 0); // knee joint
    });
    b.part = 0;
    b.set(CANVAS, 0);
    b.loft([[-0.17, [[0.88, 0.25], [1.32, 0.29], [1.48, 0.22]]], [0.17, [[0.88, 0.24], [1.3, 0.28], [1.44, 0.21]]]], [1]); // torso
    b.set(DARK, 0);
    b.box(0.0, 0.92, 0, 0.18, 0.05, 0.26); // belt
    b.set(P2);
    b.box(0.17, 1.22, 0, 0.04, 0.15, 0.18); // chest plate (team)
    b.box(-0.27, 1.25, 0, 0.12, 0.22, 0.2); // pack
    b.mirrored((s) => {
        const arm = s > 0 ? 6 : 5;
        b.set(P3, 1, arm);
        b.box(0.06, 1.42, s * 0.3, 0.1, 0.06, 0.1); // shoulder pad (team)
        b.set(CANVAS, 0, arm);
        b.box(0.12, 1.24, s * 0.3, 0.07, 0.16, 0.07); // upper arm
        b.box(0.28, 1.13, s * 0.27, 0.16, 0.06, 0.06); // forearm, forward to the rifle
        if (s > 0) {
            b.set(GUN, 0, 6);
            b.box(0.45, 1.16, 0.14, 0.45, 0.04, 0.04);
        } // rifle
    });
    b.part = 0;
    b.set(P1);
    b.ball(0.0, 1.68, 0, 0.16, 0, 0.9); // helmet
    b.set([1, 1, 1], 2);
    b.box(0.13, 1.66, 0, 0.04, 0.035, 0.11); // visor
    G2(() => g2Infantry(b));
    return b.build([0, 0, 0], 0, 0);
}
/**
 * P3: the economy vehicles' shared hover body: a lofted hull with darker chamfers and a sloped nose, the raised cab
 * glazed where the data's driver zone is (C8, QA4 bug 10: unchanged), an amber beacon, nacelles with glow plates,
 * skirt plates, team stripes, lamps and hazard chevrons. `rear`: the hull's rear x (the Forward Base Vehicle is longer).
 */
function econBase(b, rear = -3.4) {
    b.grit = exports.GRIT;
    b.set(P1);
    b.loft([[rear, hsec(0.4, 0.9, 1.4, 1.6, 1.78, 1.6, 0.15)], [2.4, hsec(0.25, 0.9, 1.45, 1.65, 1.82, 1.6, 0.15)], [3.05, hsec(0.4, 0.7, 0.95, 1.4, 1.6, 1.35, 0.06)]], [2]);
    b.set(P2);
    b.hull([[-0.25, 1.4], [0.85, 1.4], [0.9, 2.0], [0.75, 2.75], [-0.25, 2.75]], 1.3, 1.2);
    b.set(GLASS, 0);
    b.hull([[0.55, 2.02], [0.92, 2.02], [0.8, 2.6], [0.4, 2.6]], 1.24, 1.14);
    b.set([1, 1, 1], 2);
    b.quad([0.905, 2.05, -1.0], [0.905, 2.05, 1.0], [0.905, 2.15, 1.0], [0.905, 2.15, -1.0], [0, 2.1, 0]);
    b.set(HAZARD, 0);
    b.cyl(0.1, 2.75, 0.7, 0.12, 0.1, 0.2, 6, "y", false);
    b.disc(0.1, 2.95, 0.7, 0.1, 6, "y", 1); // beacon
    b.mirrored((s) => {
        nacelle(b, rear + 0.2, 2.6, s * 1.6, 0.12, 0.6, 0.4, [rear + 1.6, 1.4]);
        skirtPlates(b, rear + 0.6, 2.2, s * 2.02, 0.3, 0.82, 3);
        glowStripe(b, rear + 0.6, 1.6, 1.05, s * 1.75);
        b.set([1, 1, 1], 2);
        b.disc(2.96, 0.84, s * 1.15, 0.1, 4, "x", 1);
        b.set(HAZARD, 0);
        b.quad([3.0, 0.5, s * 0.3], [3.0, 0.5, s * 0.75], [2.96, 0.7, s * 0.75], [2.96, 0.7, s * 0.3], [2, 0.6, s * 0.5]);
    });
}
/** Mechanical arm (part 1: turns to the work): a turntable, a hazard-striped boom, a forearm and a claw (or a tool). */
function econArm(b, tool) {
    b.part = 1;
    b.set(GUN, 0, 1);
    b.cyl(1.9, 1.85, 0, 0.35, 0.3, 0.4, 6, "y", false);
    b.disc(1.9, 2.25, 0, 0.3, 6, "y", 1);
    b.set(HAZARD, 0, 1);
    b.hull([[1.9, 2.1], [2.3, 2.1], [3.9, 3.1], [3.6, 3.4]], 0.18, 0.15);
    b.set(GUN, 0, 1);
    b.hull([[3.6, 3.1], [3.95, 3.2], [4.6, 1.2], [4.3, 1.1]], 0.15, 0.12);
    if (tool === "claw") {
        b.box(4.5, 1.05, 0, 0.3, 0.12, 0.45);
        b.set(DARK, 0, 1);
        b.mirrored((s) => b.box(4.7, 0.85, s * 0.35, 0.08, 0.2, 0.05));
    }
    else {
        b.set(DARK, 0, 1);
        b.cyl(4.3, 1.05, 0, 0.16, 0.08, 0.5, 5, "x", false);
        b.set([1, 1, 1], 3, 1);
        b.disc(4.8, 1.05, 0, 0.08, 5, "x", 1);
    }
    b.part = 0;
}
/** Ramming plow (Hauler, Forward Base Vehicle): a dark wedge blade across the nose with hazard bands, on two arms. */
function plow(b, w) {
    b.set(DARK, 0);
    b.hull([[3.0, 0.12], [3.55, 0.12], [3.75, 0.85], [3.45, 1.1], [3.1, 0.95]], w, w * 0.95);
    b.set(HAZARD, 0);
    for (const z of [-0.7, 0.7])
        b.quad([3.72, 0.4, z * w - 0.25], [3.72, 0.4, z * w + 0.25], [3.76, 0.8, z * w + 0.25], [3.76, 0.8, z * w - 0.25], [3.0, 0.5, z * w]);
    b.set(GUN, 0);
    b.mirrored((s) => b.box(2.9, 0.6, s * w * 0.6, 0.35, 0.1, 0.1));
}
function economy() {
    // Harvester: an open hopper of ore behind the cab and the mechanical arm
    const b = new MeshBuilder();
    econBase(b);
    b.set(P3);
    b.loft([[-3.35, [[1.4, 1.5], [2.3, 1.68], [2.5, 1.74]]], [-0.45, [[1.4, 1.5], [2.3, 1.68], [2.5, 1.74]]]], [1]); // open hopper
    b.set(HAZARD, 0);
    b.mirrored((s) => b.quad([-3.2, 2.32, s * 1.69], [-0.6, 2.32, s * 1.69], [-0.6, 2.46, s * 1.73], [-3.2, 2.46, s * 1.73], [-1.9, 2.3, 0])); // rim bands
    b.set([0.36, 0.28, 0.45], 0);
    b.box(-1.9, 2.45, 0, 1.4, 0.08, 1.5); // ore load
    b.set([0.46, 0.34, 0.6], 0);
    b.ball(-2.0, 2.6, 0.2, 0.5, 0, 0.7);
    econArm(b, "claw");
    G2(() => g2Harvester(b));
    return b.build([1.9, 1.85, 0], 0.8, 0.12);
}
function hauler() {
    // Hauler: a ribbed cargo container and strapped crates on the bed, and a ramming plow
    const b = new MeshBuilder();
    econBase(b);
    b.set(P3);
    b.loft([[-3.3, [[1.4, 1.4], [2.55, 1.4], [2.7, 1.25]]], [-0.45, [[1.4, 1.4], [2.55, 1.4], [2.7, 1.25]]]], [1]); // container
    b.set(PANEL);
    b.mirrored((s) => { for (const x of [-2.6, -1.85, -1.1])
        b.quad([x, 1.5, s * 1.405], [x + 0.08, 1.5, s * 1.405], [x + 0.08, 2.5, s * 1.405], [x, 2.5, s * 1.405], [x, 2, 0]); }); // ribs
    b.set(OLIVE, 0);
    b.box(-2.2, 2.92, 0.5, 0.6, 0.22, 0.4);
    b.box(-1.2, 2.88, -0.4, 0.45, 0.18, 0.45);
    b.set(DARK, 0);
    b.quad([-2.0, 3.145, -1.25], [-1.9, 3.145, -1.25], [-1.9, 3.145, 1.25], [-2.0, 3.145, 1.25], [-2, 0, 0]); // strap
    plow(b, 1.6);
    G2(() => g2Hauler(b));
    return b.build([1.9, 1.85, 0], 0.8, 0.12);
}
function constructorVehicle() {
    // Constructor: girders and crates on a flat deck, a stabiliser leg each side, and the arm with a welding head
    const b = new MeshBuilder();
    econBase(b);
    b.set(P3);
    b.loft([[-3.3, [[1.4, 1.5], [1.6, 1.5], [1.7, 1.4]]], [-0.45, [[1.4, 1.5], [1.6, 1.5], [1.7, 1.4]]]], [1]); // deck
    b.set(GUN, 0);
    b.box(-1.9, 1.85, 0.55, 1.35, 0.13, 0.13);
    b.box(-1.9, 1.85, 0.2, 1.35, 0.13, 0.13); // girders
    b.set(OLIVE, 0);
    b.box(-2.4, 2.0, -0.85, 0.5, 0.3, 0.4);
    b.box(-1.35, 1.92, -0.85, 0.4, 0.22, 0.38);
    b.set(HAZARD, 0);
    b.mirrored((s) => b.box(-2.9, 0.9, s * 1.95, 0.12, 0.6, 0.12)); // stabilisers
    econArm(b, "torch");
    G2(() => g2Constructor(b));
    return b.build([1.9, 1.85, 0], 0.8, 0.12);
}
function forwardBase() {
    // Forward Base Vehicle: a longer hull carrying the packed base module (fold seams, a folded dish, a mast), a plow
    const b = new MeshBuilder();
    econBase(b, -4.6);
    b.set(P2);
    b.loft([[-4.5, hsec(1.4, 2.6, 3.3, 1.5, 1.55, 1.4, 0.25)], [-0.45, hsec(1.4, 2.6, 3.3, 1.5, 1.55, 1.4, 0.25)]], [2]); // base module
    b.set(PANEL);
    b.mirrored((s) => { for (const x of [-3.2, -1.8])
        b.quad([x, 1.5, s * 1.535], [x + 0.08, 1.5, s * 1.535], [x + 0.08, 2.9, s * 1.48], [x, 2.9, s * 1.48], [x, 2.2, 0]); }); // fold seams
    b.set([1, 1, 1], 2);
    b.mirrored((s) => b.box(-2.5, 2.75, s * 1.47, 1.6, 0.08, 0.04)); // team band on the module
    b.set(P1);
    b.cyl(-3.4, 3.3, 0, 1.0, 0.25, 0.3, 8, "y", false); // folded dish
    b.set(DARK, 0);
    b.cyl(-1.2, 3.3, 0.8, 0.06, 0.04, 0.9, 4, "y", false);
    b.set([1, 1, 1], 2);
    b.box(-1.2, 4.22, 0.8, 0.07, 0.07, 0.07); // mast and beacon
    b.set(HAZARD, 0);
    b.quad([-4.51, 1.6, -0.9], [-4.51, 1.6, 0.9], [-4.51, 1.8, 0.9], [-4.51, 1.8, -0.9], [0, 2, 0]);
    plow(b, 1.7);
    G2(() => g2Fbv(b));
    return b.build([1.9, 1.85, 0], 0.8, 0.12);
}
/** P3: the gun tower's turret head (also the control node's): a chamfered head with a seam, a dark mantlet, a glass
 * sensor block, twin barrels with muzzle brakes (tips at x 4.8, y 9.3, z ±0.5, as before) and a team plate. */
function towerHead(b, cannon = false) {
    b.part = 1;
    b.set(P2, 1, 1);
    b.hull([[-1.8, 8.3], [1.4, 8.3], [2.0, 9.2], [1.4, 10.3], [-1.6, 10.3], [-2.0, 9.2]], 1.6, 1.3);
    b.set(PANEL, 1, 1);
    b.quad([-0.2, 10.31, -1.25], [-0.1, 10.31, -1.25], [-0.1, 10.31, 1.25], [-0.2, 10.31, 1.25], [0, 0, 0]);
    b.set(DARK, 0, 1);
    b.box(1.85, 9.3, 0, 0.2, 0.42, 0.85); // mantlet
    b.set(GLASS, 0, 1);
    b.box(0.9, 10.42, -0.85, 0.3, 0.14, 0.22); // sensor block
    if (cannon) { // designer 21 Nov: the Gun Tower: a heavy cannon in the middle, a machine gun either side
        b.set(GUN, 0, 2);
        b.cyl(1.8, 9.3, 0, 0.24, 0.2, 3.5, 12, "x", false); // cannon barrel
        b.set(DARK, 0, 2);
        b.cyl(2.3, 9.3, 0, 0.3, 0.3, 0.5, 12, "x", false); // recoil sleeve
        b.box(5.45, 9.3, 0, 0.18, 0.32, 0.32); // muzzle brake
        b.set([0.08, 0.08, 0.08], 0, 2);
        b.mirrored((sd) => b.box(5.45, 9.3, sd * 0.325, 0.1, 0.14, 0.01)); // its ports
        for (const sd of [-1, 1]) {
            b.set(DARK, 0, 2);
            b.box(1.9, 9.0, sd * 1.85, 0.28, 0.16, 0.16); // MG receiver
            b.cyl(2.1, 9.0, sd * 1.85, 0.11, 0.11, 1.1, 8, "x", false); // perforated jacket
            b.set([0.06, 0.06, 0.06], 0, 2);
            for (let i = 0; i < 5; i++)
                b.box(2.25 + i * 0.2, 9.0 + 0.105, sd * 1.85, 0.04, 0.012, 0.05);
            b.set(GUN, 0, 2);
            b.cyl(3.2, 9.0, sd * 1.85, 0.055, 0.055, 0.45, 6, "x", false); // barrel
            b.set(DARK, 0, 2);
            b.cyl(3.6, 9.0, sd * 1.85, 0.08, 0.07, 0.12, 6, "x"); // flash hider
            b.set(OLIVE, 0, 1);
            b.box(1.6, 8.75, sd * 1.85, 0.2, 0.14, 0.12); // ammo box
            b.set(P2, 1, 1);
            b.box(1.2, 8.95, sd * 1.7, 0.45, 0.22, 0.2); // sponson bracket off the head
        }
    }
    else {
        b.set(GUN, 0, 2);
        b.mirrored((s) => { b.cyl(1.8, 9.3, s * 0.5, 0.15, 0.13, 3.0, 6, "x", false); b.set(DARK, 0, 2); b.cyl(4.35, 9.3, s * 0.5, 0.22, 0.22, 0.45, 6, "x"); b.set(GUN, 0, 2); });
    }
    b.set([1, 1, 1], 2, 1);
    b.quad([-1.95, 9.3, -0.9], [-1.95, 9.3, 0.9], [-1.95, 9.9, 0.9], [-1.95, 9.9, -0.9], [0, 9.6, 0]);
    G2(() => g2TowerHead(b, cannon));
    b.part = 0;
}
// C4: structures the S8 construction makes buildable, each with its own silhouette
/** C6: factory hall (Barracks, Foundry, Armoury, Tech Lab, Refinery): a long saw-tooth roof hall with a chimney. */
// ---------------------------------------------------------------- G1: buildings in the concept's language
// Walls are team-tinted concrete (material 1 x WALL: pale sage for the player, rust for the enemy, as the concept's
// two bases), roofs and plinths neutral concrete, steel for frames, pipes and stacks; chamfered edges darker
// (loft EDGE_DARK), faces turned down darker (grit), team glow bands, hazard posts, dark doors.
const WALL = [1.38, 1.27, 1.24], WALL2 = [1.18, 1.1, 1.08];
const CON = [0.6, 0.59, 0.55], CON2 = [0.49, 0.49, 0.46];
const GASG = [0.45, 1.0, 0.62];
/** Chamfered concrete plinth (x half hx, z half hz), its top at y h, sunk 1 m. */
function plinth(b, hx, hz, h = 0.5) {
    b.set(CON2, 0);
    b.loft([[-hx, [[-1, hz], [h - 0.3, hz], [h, hz - 0.3]]], [-hx + 0.3, [[-1, hz], [h, hz], [h, hz - 0.3]]], [hx - 0.3, [[-1, hz], [h, hz], [h, hz - 0.3]]], [hx, [[-1, hz], [h - 0.3, hz], [h, hz - 0.3]]]], [1]);
}
/** Round plinth. */
function plinthR(b, r, n, h = 0.5, rot = 0) {
    b.set(CON2, 0);
    b.cyl(0, -1, 0, r, r, h + 0.7, n, "y", false, rot);
    b.cyl(0, h - 0.3, 0, r, r - 0.35, 0.3, n, "y", false, rot);
    b.disc(0, h, 0, r - 0.35, n, "y", 1, rot);
}
/** Chamfered hall along x (x0..x1), half width hw, from y0 to y1 (chamfer c): walls team-tinted. */
function hall(b, x0, x1, hw, y0, y1, c, col = WALL, cz = 0) {
    b.set(col);
    const sec = hsec(y0, (y0 + y1) / 2, y1, hw, hw, hw - c * 0.3, c);
    b.loft([[x0, sec], [x1, sec]], [2], cz);
}
/** Flat team-glow (or other material) quad on a horizontal or vertical face: [x, y, z] corners a-d, facing away from `in`. */
function plate(b, col, mat, a, c, d, e, inside) { b.set(col, mat); b.quad(a, c, d, e, inside); }
/** A door on the +x face at x: dark opening z0..z1, y0..y1, hazard posts either side, a glow lintel. */
function doorX(b, x, z0, z1, y0, y1, ribs = 0, s = 1) {
    const i = [x - s, (y0 + y1) / 2, (z0 + z1) / 2];
    plate(b, [0.09, 0.1, 0.1], 0, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], i);
    b.set(GUN, 0);
    for (let k = 1; k <= ribs; k++) {
        const y = y0 + ((y1 - y0) * k) / (ribs + 1);
        b.quad([x + s * 0.01, y - 0.06, z0], [x + s * 0.01, y - 0.06, z1], [x + s * 0.01, y + 0.06, z1], [x + s * 0.01, y + 0.06, z0], i);
    }
    b.set(HAZARD, 0);
    b.box(x, (y0 + y1) / 2, z0 - 0.18, 0.12, (y1 - y0) / 2, 0.16);
    b.box(x, (y0 + y1) / 2, z1 + 0.18, 0.12, (y1 - y0) / 2, 0.16);
    b.set(DARK, 0);
    for (const z of [z0 - 0.18, z1 + 0.18])
        for (const f of [0.3, 0.7])
            b.box(x, y0 + (y1 - y0) * f, z, 0.13, 0.12, 0.17);
    b.set([1, 1, 1], 2);
    b.box(x + s * 0.05, y1 + 0.35, (z0 + z1) / 2, 0.05, 0.12, (z1 - z0) / 2 + 0.3);
}
/** Vertical pipe / stack with a dark cap. */
function stack(b, x, y, z, r, h) {
    b.set(STEEL, 0);
    b.cyl(x, y, z, r, r * 0.88, h, 8, "y", false);
    b.set(CON, 0);
    b.cyl(x, y + h, z, r * 1.15, r * 1.15, 0.3, 8, "y", false);
    b.set(DARK, 0);
    b.disc(x, y + h + 0.3, z, r * 1.15, 8, "y", 1);
}
/** Horizontal pipe between two points on a level (x or z run) with collars. */
function pipe(b, x, y, z, len, axis, r = 0.22) {
    b.set(STEEL, 0);
    b.cyl(x, y, z, r, r, len, 6, axis, false);
    b.set(GUN, 0);
    for (const f of [0.1, 0.9])
        axis === "x" ? b.cyl(x + len * f, y, z, r * 1.35, r * 1.35, 0.14, 6, "x", false) : b.cyl(x, y, z + len * f, r * 1.35, r * 1.35, 0.14, 6, "z", false);
}
/** Ladder up a face (x fixed). */
function ladder(b, x, z, y0, y1) { b.set(GUN, 0); b.box(x, (y0 + y1) / 2, z - 0.25, 0.04, (y1 - y0) / 2, 0.04); b.box(x, (y0 + y1) / 2, z + 0.25, 0.04, (y1 - y0) / 2, 0.04); for (let y = y0 + 0.4; y < y1; y += 0.6)
    b.box(x, y, z, 0.03, 0.03, 0.25); }
/** Low crates: olive / canvas, with a dark band. */
function crates(b, x, z, n) { for (let i = 0; i < n; i++) {
    const c = i % 3 === 0 ? OLIVE : i % 3 === 1 ? CANVAS : CON2;
    b.set(c, 0);
    const dx = x + (i % 2) * 1.1, dz = z + Math.floor(i / 2) * 1.1, s = 0.45 + (i % 2) * 0.08;
    b.box(dx, s, dz, s, s, s);
    b.set(DARK, 0);
    b.box(dx, s, dz, s + 0.01, 0.06, s + 0.01);
} }
/** Generic structure (types without their own shape). */
function structure() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 6.5, 5.5);
    hall(b, -5, 5, 4.5, 0.5, 5.5, 0.5);
    hall(b, -3, 3, 3, 5.5, 6.6, 0.3, CON);
    doorX(b, 5.0, -1.6, 1.6, 0.5, 3.6, 3);
    b.mirrored((s) => { b.set([1, 1, 1], 2); b.box(0, 4.6, s * 4.52, 4.2, 0.16, 0.04); });
    stack(b, -3.5, 5.5, 2.5, 0.4, 3);
    G2(() => g2Structure(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Gun Tower (also the chokepoint gun positions): a tapered octagonal concrete column on a plinth, the P3 head. */
function tower() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinthR(b, 4.2, 8, 0.8, Math.PI / 8);
    b.set(WALL);
    b.cyl(0, 0.8, 0, 2.6, 2.0, 7.5, 8, "y", false, Math.PI / 8);
    b.set(CON);
    b.cyl(0, 7.6, 0, 2.06, 1.7, 0.7, 8, "y", false, Math.PI / 8);
    b.disc(0, 8.3, 0, 1.7, 8, "y", 1, Math.PI / 8);
    b.set(DARK, 0);
    b.cyl(0, 4.0, 0, 2.38, 2.32, 0.3, 8, "y", false, Math.PI / 8);
    b.set([1, 1, 1], 2);
    b.cyl(0, 6.6, 0, 2.12, 2.08, 0.3, 8, "y", false, Math.PI / 8);
    b.set(DARK, 0);
    b.quad([2.42, 0.85, -0.5], [2.42, 0.85, 0.5], [2.3, 2.5, 0.5], [2.3, 2.5, -0.5], [0, 1.6, 0]);
    b.set(HAZARD, 0);
    b.mirrored((s) => b.quad([2.44, 0.85, s * 0.5], [2.44, 0.85, s * 0.68], [2.32, 2.5, s * 0.68], [2.32, 2.5, s * 0.5], [0, 1.6, 0]));
    b.set(GUN, 0);
    b.mirrored((s) => b.box(-2.4 + 0.06, 4.2, s * 0.3, 0.04, 3.3, 0.04));
    b.set(CANVAS, 0);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 1.2 - 0.6 + Math.PI;
        b.ball(Math.cos(a) * 3.6, 1.0, Math.sin(a) * 3.6, 0.55, 0, 0.5);
    } // sandbags behind
    towerHead(b, true);
    G2(() => g2Tower(b));
    return b.build([0, 8.3, 0], 0, 0, 0.4);
}
/** Relay Tower: an equipment hut and a three-legged lattice mast tapering to 21 m, rings, two dishes and a beacon. */
function mast() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 3.4, 3.4);
    hall(b, -3.0, -0.6, 1.1, 0.5, 2.7, 0.25, WALL, 2.0);
    b.set(OLIVE, 0);
    b.box(2.2, 1.1, 1.8, 0.7, 0.6, 0.5);
    const legs = [[-1.3, -1.3], [1.3, -1.3], [0, 1.5]];
    b.set(STEEL, 0);
    for (const [x, z] of legs) {
        const top = [x * 0.12, 21, z * 0.12];
        const n = 4;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            pts.push([x + Math.cos(a) * 0.14, 0.5, z + Math.sin(a) * 0.14]);
        }
        for (let i = 0; i < n; i++)
            b.tri(pts[i], pts[(i + 1) % n], top, [x, 5, z]);
    }
    b.set(GUN, 0);
    for (let k = 0; k < 5; k++) {
        const y = 3.5 + k * 3.6, f = 1 - (y - 0.5) / 20.5 * 0.88;
        b.cyl(0, y, 0, 1.5 * f, 1.5 * f, 0.14, 3, "y", false, Math.PI / 2);
    }
    b.set(CON);
    b.cyl(0.4, 16.5, 0, 0.3, 1.8, 0.5, 10, "x");
    b.set(STEEL, 0);
    b.cyl(0.2, 16.5, 0, 0.12, 0.12, 0.5, 4, "x", false);
    b.set(CON);
    b.cyl(-0.2, 12.0, 0.2, 0.25, 1.4, 0.5, 8, "z");
    b.set([1, 1, 1], 2);
    b.box(0, 21.3, 0, 0.28, 0.28, 0.28);
    b.box(0, 8.0, 0, 0.9, 0.08, 0.9);
    G2(() => g2Mast(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Silo (ore storage): a ribbed bin on a plinth with a domed roof, a catwalk, a ladder and a loading chute. */
function silo() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinthR(b, 4.4, 10, 0.6, Math.PI / 10);
    b.set(WALL);
    b.cyl(0, 0.6, 0, 3.2, 3.2, 8.6, 12, "y", false);
    b.set(DARK, 0);
    for (let k = 0; k < 3; k++)
        b.cyl(0, 2.4 + k * 2.4, 0, 3.27, 3.27, 0.16, 12, "y", false);
    b.set(CON);
    b.ball(0, 9.2, 0, 3.2, 1, 0.45);
    b.set(GUN, 0);
    b.cyl(0, 9.1, 0, 3.6, 3.6, 0.12, 12, "y", true); // catwalk
    ladder(b, -3.25, 0, 0.6, 9.1);
    b.set(STEEL, 0);
    b.box(3.6, 4.6, 0, 0.5, 4.0, 0.6); // chute
    b.set(DARK, 0);
    b.box(3.6, 0.9, 0, 0.8, 0.4, 0.9);
    b.set(HAZARD, 0);
    b.box(3.62, 1.45, 0, 0.82, 0.12, 0.92);
    b.set([1, 1, 1], 2);
    b.cyl(0, 10.7, 0, 0.25, 0.25, 0.3, 6);
    b.mirrored((s) => glowStripe(b, -2.0, 2.0, 7.4, s * 3.25, 0.16));
    G2(() => g2Silo(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Gas Extractor: a wellhead over the geyser throat under a steel derrick, a pump house and an outlet pipe; gas-green lamps. */
function extractor() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 4.2, 4.2, 0.4);
    b.set(STEEL, 0);
    b.cyl(0, 0.4, 0, 1.3, 1.1, 2.2, 8, "y", false);
    b.set(HAZARD, 0);
    b.cyl(0, 2.6, 0, 1.15, 1.15, 0.25, 8, "y", false);
    b.set(DARK, 0);
    b.disc(0, 2.85, 0, 1.15, 8, "y", 1);
    b.set(GASG, 4);
    b.cyl(0, 2.85, 0, 0.7, 0.4, 0.4, 8, "y", false);
    b.set(STEEL, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
        b.cyl(x * 1.7, 0.4, z * 1.7, 0.16, 0.1, 10.2, 4, "y", false);
    b.set(GUN, 0);
    for (let k = 0; k < 4; k++) {
        const y = 3.2 + k * 2.2, w = 1.7;
        b.box(0, y, -w, w, 0.07, 0.07);
        b.box(0, y, w, w, 0.07, 0.07);
        b.box(-w, y, 0, 0.07, 0.07, w);
        b.box(w, y, 0, 0.07, 0.07, w);
    }
    b.set(CON, 0);
    b.box(0, 10.6, 0, 1.9, 0.15, 1.9);
    hall(b, -4.0, -1.9, 1.1, 0.4, 2.6, 0.25, WALL, 2.6);
    b.set([1, 1, 1], 2);
    b.box(-2.95, 2.2, 3.72, 0.9, 0.12, 0.04);
    pipe(b, -1.9, 1.0, 2.6, 4.0, "x", 0.3);
    b.set(GASG, 4);
    b.box(0, 10.85, 0, 0.3, 0.3, 0.3);
    b.box(4.2, 1.0, 2.6, 0.12, 0.35, 0.35);
    G2(() => g2Extractor(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Gas Tank: a pressure sphere on four legs with a team band, a catwalk ring, hazard markings and a feed pipe. */
function gastank() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 4.0, 4.0, 0.4);
    b.set(STEEL, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
        b.cyl(x * 2.2, 0.4, z * 2.2, 0.25, 0.25, 4.2, 6, "y", false);
    b.set(WALL);
    b.ball(0, 5.6, 0, 3.4, 1, 0.92);
    b.set([1, 1, 1], 2);
    b.cyl(0, 5.45, 0, 3.42, 3.42, 0.3, 12, "y", false);
    b.set(GUN, 0);
    b.cyl(0, 4.3, 0, 3.4, 3.4, 0.1, 12, "y", true);
    b.set(HAZARD, 0);
    b.mirrored((s) => b.box(s * 3.0, 3.6, 0, 0.06, 0.4, 1.0));
    b.set(DARK, 0);
    b.cyl(0, 8.6, 0, 0.35, 0.3, 0.8, 6, "y", false);
    pipe(b, -4.0, 0.9, 1.2, 3.0, "x");
    b.set(GASG, 4);
    b.box(0, 9.5, 0, 0.18, 0.18, 0.18);
    G2(() => g2Gastank(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Missile Battery: a hexagonal armoured base with sandbags and a turning box launcher with six lit tubes. */
function battery() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinthR(b, 3.8, 6, 0.6, Math.PI / 6);
    b.set(WALL);
    b.cyl(0, 0.6, 0, 2.4, 2.1, 2.6, 6, "y", false, Math.PI / 6);
    b.set(CON);
    b.disc(0, 3.2, 0, 2.1, 6, "y", 1, Math.PI / 6);
    b.set(HAZARD, 0);
    b.mirrored((s) => b.box(0, 1.4, s * 2.25, 0.5, 0.4, 0.06));
    b.set([1, 1, 1], 2);
    b.cyl(0, 2.7, 0, 2.17, 2.14, 0.2, 6, "y", false, Math.PI / 6);
    crates(b, -3.4, 1.6, 3);
    b.part = 1;
    b.set(GUN, 0, 1);
    b.box(0, 3.6, 0, 0.5, 0.4, 0.5);
    b.set(WALL2, 1, 1);
    b.hull([[-1.6, 3.9], [1.6, 4.4], [1.6, 6.0], [-1.6, 5.5]], 1.4, 1.4);
    b.set(PANEL, 1, 1);
    b.quad([-0.2, 5.66, -1.41], [0.0, 5.69, -1.41], [0.0, 4.2, -1.41], [-0.2, 4.15, -1.41], [0, 5, 0]);
    b.set(DARK, 0, 1);
    for (let r = 0; r < 2; r++)
        for (let c = -1; c <= 1; c++)
            b.cyl(1.62, 4.75 + r * 0.75, c * 0.82, 0.28, 0.28, 0.08, 6, "x");
    b.set([1, 1, 1], 3, 1);
    for (let r = 0; r < 2; r++)
        for (let c = -1; c <= 1; c++)
            b.cyl(1.6, 4.75 + r * 0.75, c * 0.82, 0.2, 0.2, 0.06, 6, "x");
    b.part = 0;
    G2(() => g2Battery(b));
    return b.build([0, 3.6, 0], 0, 0);
}
/** Reactor (the concept's): a steel ring base, a fluted drum with a glowing band, a dome, eight fins and two stacks. */
function reactor() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(STEEL, 0);
    b.cyl(0, -0.8, 0, 6.0, 5.4, 1.8, 10, "y", false);
    b.disc(0, 1.0, 0, 5.4, 10, "y", 1);
    b.set(WALL);
    b.cyl(0, 1.0, 0, 4.3, 3.9, 5.4, 10, "y", false);
    b.set([1, 1, 1], 3);
    b.cyl(0, 3.4, 0, 4.25, 4.2, 0.6, 10, "y", false);
    b.set(STEEL, 0);
    b.cyl(0, 6.4, 0, 4.1, 4.0, 0.35, 10, "y", false);
    b.set(CON);
    b.ball(0, 6.7, 0, 3.8, 1, 0.6);
    b.set(STEEL, 0);
    for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
        b.poly([[c * 4.0, 1.0, s * 4.0], [c * 5.1, 1.0, s * 5.1], [c * 4.4, 5.6, s * 4.4], [c * 4.0, 5.6, s * 4.0]]);
        b.poly([[c * 4.0, 1.0, s * 4.0], [c * 4.0, 5.6, s * 4.0], [c * 4.4, 5.6, s * 4.4], [c * 5.1, 1.0, s * 5.1]]);
    }
    b.mirrored((s) => { stack(b, -1.5, 1.0, s * 5.2, 0.8, 9.0); });
    b.set(DARK, 0);
    b.quad([4.25, 1.0, -0.9], [4.25, 1.0, 0.9], [4.0, 3.0, 0.9], [4.0, 3.0, -0.9], [0, 2, 0]);
    G2(() => g2Reactor(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Command Core (the concept's): a stepped octagonal keep on a steel ring, five sloped buttresses with service pipes,
 * a glowing ring band, a glazed upper keep with dark ring bands, a dish, an antenna with a beacon, gate doors. */
function core() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(STEEL, 0);
    b.cyl(0, -0.8, 0, 8.6, 8.2, 1.6, 8, "y", false, Math.PI / 8);
    b.disc(0, 0.8, 0, 8.2, 8, "y", 1, Math.PI / 8);
    b.set(WALL);
    b.cyl(0, 0.8, 0, 6.6, 5.7, 4.6, 8, "y", false, Math.PI / 8);
    b.set([1, 1, 1], 2);
    b.cyl(0, 5.4, 0, 5.72, 5.66, 0.32, 8, "y", false, Math.PI / 8);
    b.set(CON);
    b.cyl(0, 5.72, 0, 5.66, 4.6, 0.6, 8, "y", false, Math.PI / 8);
    b.disc(0, 6.32, 0, 4.6, 8, "y", 1, Math.PI / 8);
    b.set(WALL2);
    b.cyl(0, 6.3, 0, 3.6, 3.0, 4.8, 8, "y", false, Math.PI / 8);
    b.set(DARK, 0);
    for (const y of [7.4, 8.9])
        b.cyl(0, y, 0, 3.47 - (y - 6.3) * 0.12, 3.44 - (y - 6.3) * 0.12, 0.22, 8, "y", false, Math.PI / 8);
    b.set(GLASS, 0);
    b.cyl(0, 9.6, 0, 3.12, 3.06, 0.7, 8, "y", false, Math.PI / 8);
    b.set(STEEL, 0);
    b.cyl(0, 11.1, 0, 3.0, 3.3, 0.5, 8, "y", false, Math.PI / 8);
    b.set(CON);
    b.disc(0, 11.6, 0, 3.3, 8, "y", 1, Math.PI / 8);
    b.set(CON);
    b.cyl(1.3, 11.6, -0.9, 0.3, 1.9, 0.5, 10, "y");
    b.set(STEEL, 0);
    b.cyl(1.3, 11.6, -0.9, 0.12, 0.12, 0.6, 4, "y", false); // dish
    b.set(GUN, 0);
    b.cyl(-1.0, 11.6, 1.0, 0.18, 0.08, 5.5, 5, "y", false);
    b.set([1, 1, 1], 3);
    b.ball(-1.0, 17.2, 1.0, 0.35, 0);
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a), R0 = 6.1, R1 = 8.0;
        const t = [-s, 0, c];
        const P = (r, y, w) => [c * r + t[0] * w, y, s * r + t[2] * w];
        b.set(WALL2);
        b.poly([P(R1, 0.8, -1.1), P(R1, 0.8, 1.1), P(R0, 4.6, 0.8), P(R0, 4.6, -0.8)], [0, 2, 0]);
        b.set(CON2);
        b.poly([P(R1, 0.8, 1.1), P(R0 - 0.3, 0.8, 1.1), P(R0 - 0.3, 4.6, 0.8), P(R0, 4.6, 0.8)], [c * 7, 2, s * 7]);
        b.poly([P(R1, 0.8, -1.1), P(R0, 4.6, -0.8), P(R0 - 0.3, 4.6, -0.8), P(R0 - 0.3, 0.8, -1.1)], [c * 7, 2, s * 7]);
        b.set(STEEL, 0);
        b.cyl(c * 6.0 + t[0] * 1.6, 0.8, s * 6.0 + t[2] * 1.6, 0.28, 0.28, 4.4, 5, "y", false);
    }
    b.mirrored((sg) => {
        const x = sg * 6.3;
        b.set(DARK, 0);
        b.quad([x + sg * 0.02, 0.8, -1.4], [x + sg * 0.02, 0.8, 1.4], [x - sg * 0.18, 3.3, 1.4], [x - sg * 0.18, 3.3, -1.4], [0, 2, 0]);
        b.set(HAZARD, 0);
        for (const z of [-1, 1])
            b.quad([x + sg * 0.03, 0.8, z * 1.4], [x + sg * 0.03, 0.8, z * 1.75], [x - sg * 0.17, 3.3, z * 1.75], [x - sg * 0.17, 3.3, z * 1.4], [0, 2, 0]);
    });
    G2(() => g2Core(b));
    coreSilo(b);
    return b.build([0, 0, 0], 0, 0);
}
/**
 * Designer 21 Nov: the Frontline drop pod's rocket silo on the back of the Command Core (local -x; the sim's fkit.siloAt
 * puts the launch point there: 1.9 x the Core's radius behind it at the drawn 1.2 scale): a concrete pad, a tall ribbed
 * silo tube with an open hatch and the next rocket's nose showing, a service gantry with walkways, and warning lights.
 */
const SILO_X = -11.1;
function coreSilo(b) {
    const X = SILO_X;
    b.set(CON2);
    b.box(X, 0.25, 0, 3.6, 0.5, 3.6); // pad
    b.set(HAZARD, 0);
    b.mirrored((sg) => b.box(X, 0.76, sg * 3.45, 3.5, 0.02, 0.15));
    b.set(CON);
    b.cyl(X, 0.75, 0, 2.7, 2.5, 16.3, 16, "y", false); // silo tube
    b.set(STEEL, 0);
    for (const y of [3, 6.5, 10, 13.5, 16.6])
        b.cyl(X, y, 0, 2.62, 2.58, 0.45, 16, "y", false); // ribs
    b.set(DARK, 0);
    b.disc(X, 17.06, 0, 2.45, 16, "y", 1); // the open mouth
    b.set(STEEL, 0);
    b.quad([X + 2.5, 17.05, -2.1], [X + 2.5, 17.05, 2.1], [X + 4.7, 19.2, 2.1], [X + 4.7, 19.2, -2.1], [X, 16.8, 0]); // hatch, swung open
    // the next rocket's nose in the tube
    b.set([0.86, 0.87, 0.84], 0);
    b.cyl(X, 16.0, 0, 1.5, 1.5, 1.4, 16, "y", false);
    b.cyl(X, 17.4, 0, 1.5, 0.15, 2.4, 16, "y", true);
    b.set([0.8, 0.25, 0.15], 0);
    b.cyl(X, 17.35, 0, 1.52, 1.52, 0.3, 16, "y", false); // red band
    // gantry: two posts, cross bracing, walkways, a crane arm over the mouth
    b.set(GUN, 0);
    for (const z of [-3.2, -1.6])
        b.cyl(X - 3.0, 0.75, z, 0.22, 0.22, 20, 6, "y", false);
    for (let y = 2.2; y < 20; y += 3.1) {
        b.box(X - 3.0, y, -2.4, 0.18, 0.12, 0.95); // rungs
        b.set(STEEL, 0);
        b.box(X - 1.7, y + 0.9, -2.4, 1.2, 0.06, 0.7); // walkway toward the tube
        b.set(GUN, 0);
    }
    b.box(X - 1.4, 20.4, -2.4, 1.8, 0.18, 0.18); // crane arm
    b.box(X - 0.2, 19.8, -2.4, 0.08, 0.6, 0.08);
    b.set([1, 0.3, 0.15], 5);
    b.ball(X - 3.0, 21.0, -2.4, 0.3, 0); // warning beacon
    b.ball(X + 2.4, 1.2, 2.4, 0.22, 0);
    b.set([1, 1, 1], 2);
    b.cyl(X, 9.0, 0, 2.66, 2.66, 0.18, 16, "y", false); // a lit band
}
/**
 * The launch rocket (Frontline drop pod): a slim white body with a black-and-red band, a capsule nose, four fins and an
 * engine bell; drawn rising out of the silo (main.ts flDropFrame).
 */
function flRocket() {
    const b = new MeshBuilder();
    b.set([0.88, 0.89, 0.86], 0);
    b.cyl(0, 1.2, 0, 1.4, 1.4, 9.5, 16, "y", false);
    b.set([0.16, 0.17, 0.16], 0);
    b.cyl(0, 6.0, 0, 1.42, 1.42, 1.2, 16, "y", false);
    b.set([0.8, 0.25, 0.15], 0);
    b.cyl(0, 10.4, 0, 1.43, 1.43, 0.35, 16, "y", false);
    b.set([0.88, 0.89, 0.86], 0);
    b.cyl(0, 10.7, 0, 1.4, 0.2, 3.4, 16, "y", true); // the capsule nose (it comes down as the pod)
    b.set(STEEL, 0);
    b.cyl(0, 0.0, 0, 0.7, 1.1, 1.2, 12, "y", true); // engine bell
    b.set([0.8, 0.25, 0.15], 0);
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
        const fin = [[c * 1.35, 1.2, sn * 1.35], [c * 2.6, 0.6, sn * 2.6], [c * 2.6, 2.4, sn * 2.6], [c * 1.35, 4.2, sn * 1.35]], tx = -sn, tz = c;
        b.poly(fin, [c * 2 - tx, 2.1, sn * 2 - tz]); // both faces of the flat fin
        b.poly(fin.slice().reverse(), [c * 2 + tx, 2.1, sn * 2 + tz]);
    }
    return b.build([0, 0, 0], 0, 0);
}
/**
 * Designer 21 Nov: the Repair & Resupply call-down: a drop capsule landed on its pad with its four petals folded open,
 * ammo crates and fuel drums stacked on them, a crane arm with a welding lamp, a lit green cross, and a beacon mast.
 */
function rrStation() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    const R8 = Math.PI / 8, WHITE = [0.86, 0.87, 0.85], GREEN = [0.35, 1, 0.45], CRANE = [0.85, 0.66, 0.14], DECK = [0.7, 0.72, 0.71];
    b.set(CON2);
    b.cyl(0, 0, 0, 4.2, 4.2, 0.35, 8, "y", true, R8); // pad
    b.set(HAZARD, 0);
    b.cyl(0, 0.2, 0, 4.25, 4.25, 0.17, 8, "y", false, R8);
    // the capsule's core, left standing once the petals have dropped: heat-shield skirt, equipment column, roof
    b.set(DARK, 0);
    b.cyl(0, 0.3, 0, 2.0, 1.85, 0.6, 8, "y", true, R8);
    b.set(STEEL, 0);
    b.cyl(0, 0.6, 0, 1.25, 1.25, 2.45, 8, "y", false, R8);
    b.set(GUN, 0);
    b.cyl(0, 1.25, 0, 1.29, 1.29, 0.14, 8, "y", false, R8);
    b.set([1, 1, 1], 2);
    b.cyl(0, 2.45, 0, 1.3, 1.3, 0.16, 8, "y", false, R8); // team band
    b.set(P2, 1);
    b.cyl(0, 3.0, 0, 1.72, 1.55, 0.32, 8, "y", true, R8); // roof
    // the sign on the roof (read from the game camera): a white disc with a lit green cross
    b.set(WHITE, 0);
    b.cyl(0, 3.3, 0, 1.3, 1.3, 0.07, 12, "y", true, R12);
    b.set(GREEN, 4);
    b.box(0, 3.4, 0, 0.95, 0.05, 0.27);
    b.mirrored((s) => b.box(0, 3.4, s * 0.61, 0.27, 0.05, 0.34));
    // beacon mast on the roof's rim
    b.set(GUN, 0);
    b.cyl(-1.0, 3.3, -1.0, 0.13, 0.1, 0.25, 6, "y", false);
    b.cyl(-1.0, 3.5, -1.0, 0.045, 0.045, 1.75, 5, "y", false);
    b.set(GREEN, 5);
    b.ball(-1.0, 5.33, -1.0, 0.17, 0);
    for (let k = 0; k < 4; k++) {
        // the fixed ribs between the petals (on the axes): white, each with a lit cross; a marker stripe on the pad
        let m = b.mark();
        b.set(WHITE, 0);
        b.box(1.3, 1.8, 0, 0.14, 1.22, 0.42);
        b.set(GREEN, 4);
        b.box(1.45, 1.85, 0, 0.03, 0.33, 0.1);
        b.mirrored((s) => b.box(1.45, 1.85, s * 0.215, 0.03, 0.1, 0.115));
        b.set(HAZARD, 0);
        b.box(3.45, 0.33, 0, 0.14, 0.05, 0.7);
        b.rotY(m, k * Math.PI / 2);
        // the petals (on the diagonals): hinged on the skirt, dropped onto the pad, held by a pair of struts
        m = b.mark();
        const yT = (x) => 0.86 - 0.18 * (x - 1.75), hw = (x) => 1.05 - 0.2 * (x - 1.75);
        const X0 = 1.75, X1 = 3.95, T = (x, s) => [x, yT(x), s * hw(x)], U = (x, s) => [x, yT(x) - 0.13, s * hw(x)], C = [2.85, yT(2.85) - 0.06, 0];
        b.set(DECK, 0);
        b.poly([T(X0, -1), T(X1, -1), T(X1, 1), T(X0, 1)], C); // the inner face, now the deck
        b.set(P2, 1);
        b.poly([U(X0, -1), U(X1, -1), U(X1, 1), U(X0, 1)], C); // the outer skin, face down
        b.mirrored((s) => b.poly([T(X0, s), T(X1, s), U(X1, s), U(X0, s)], C));
        b.poly([T(X1, -1), T(X1, 1), U(X1, 1), U(X1, -1)], C);
        b.set(HAZARD, 0);
        b.box(3.78, yT(3.78), 0, 0.09, 0.03, 0.56); // tip stripe
        b.set(GUN, 0);
        b.mirrored((s) => {
            b.cyl(1.78, 0.84, s * 0.75 - 0.18, 0.11, 0.11, 0.36, 6, "z", true); // hinge knuckle
            rod(b, [0.95, 2.05, s * 0.72], [2.75, yT(2.75) - 0.03, s * 0.8], 0.05, 4); // strut
        });
        if (k === 0) { // ammunition crates
            b.set(OLIVE, 0);
            b.box(2.95, 0.9, 0, 0.5, 0.34, 0.52);
            b.box(2.9, 1.44, 0.06, 0.4, 0.24, 0.4);
            b.set(HAZARD, 0);
            b.box(2.95, 0.9, 0, 0.52, 0.05, 0.54);
            b.set(DARK, 0);
            b.box(2.9, 1.69, 0.06, 0.3, 0.02, 0.07); // lid handle
            b.set(WHITE, 0);
            b.box(3.31, 1.44, 0.06, 0.02, 0.12, 0.2); // stencil plate
        }
        else if (k === 2) { // a rack of shells
            b.set(DARK, 0);
            b.box(2.95, 0.72, 0, 0.42, 0.22, 0.58);
            for (const x of [2.75, 3.15])
                for (const z of [-0.36, 0, 0.36]) {
                    b.set([0.72, 0.56, 0.22], 0);
                    b.cyl(x, 0.9, z, 0.13, 0.13, 0.55, 6, "y", false);
                    b.set([0.75, 0.2, 0.14], 0);
                    b.cyl(x, 1.45, z, 0.13, 0.02, 0.3, 6, "y", false);
                }
        }
        else if (k === 3) { // fuel drums and a hose to the column
            for (const [x, z] of [[2.7, -0.3], [3.2, 0.25]]) {
                b.set([0.7, 0.18, 0.12], 0);
                b.cyl(x, 0.5, z, 0.3, 0.3, 1.0, 8, "y", true);
                b.set(DARK, 0);
                b.cyl(x, 1.0, z, 0.32, 0.32, 0.07, 8, "y", false);
            }
            b.set(BLACK, 0);
            rod(b, [2.7, 1.5, -0.3], [2.1, 1.9, -0.1], 0.05, 4);
            rod(b, [2.1, 1.9, -0.1], [1.1, 1.6, 0], 0.05, 4);
        }
        else { // the repair arm: pedestal, slewing ring, post, a two-part arm reaching out past the pad, a welding head
            b.set(GUN, 0);
            b.box(2.9, 0.76, 0, 0.42, 0.26, 0.42);
            b.set(DARK, 0);
            b.cyl(2.9, 1.0, 0, 0.34, 0.3, 0.2, 8, "y", true);
            b.set(CRANE, 0);
            b.cyl(2.9, 1.18, 0, 0.17, 0.15, 2.0, 6, "y", false);
            const S = [2.9, 3.2, 0], E = [2.3, 4.85, 0.25], Wr = [3.75, 4.05, 1.55];
            rod(b, S, E, 0.13, 5);
            rod(b, E, Wr, 0.1, 5);
            b.set(DARK, 0);
            b.ball(S[0], S[1], S[2], 0.26, 0);
            b.ball(E[0], E[1], E[2], 0.21, 0);
            rod(b, [2.9, 2.0, 0], [2.6, 4.0, 0.12], 0.05, 4); // ram
            b.cyl(Wr[0], Wr[1] - 0.5, Wr[2], 0.04, 0.04, 0.55, 4, "y", false);
            b.box(Wr[0], Wr[1] - 0.62, Wr[2], 0.17, 0.14, 0.17); // welding head
            b.set([1, 0.82, 0.4], 4);
            b.ball(Wr[0], Wr[1] - 0.8, Wr[2], 0.1, 0);
        }
        b.rotY(m, Math.PI / 4 + k * Math.PI / 2);
    }
    return b.build([0, 0, 0], 0, 0);
}
/** Foundry (the concept's): a chamfered hall with a raised upper block, roof vents, a tall chimney, a big shuttered
 * bay door in hazard posts under a glow lintel, pilasters, and a side annex with a drum. */
function factory() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 8.0, 6.0);
    hall(b, -6.6, 6.6, 4.6, 0.5, 6.4, 0.5);
    hall(b, -4.8, 4.2, 3.3, 6.4, 7.6, 0.35, CON);
    b.set(STEEL, 0);
    for (const x of [-3.2, 0, 3.2]) {
        b.box(x, 8.2, 0.8, 0.9, 0.6, 0.9);
        b.set(DARK, 0);
        b.disc(x, 8.81, 0.8, 0.6, 8, "y", 1);
        b.set(STEEL, 0);
    }
    stack(b, -5.2, 6.4, 3.2, 0.7, 6.5);
    doorX(b, 6.6, -2.8, 2.8, 0.5, 5.0, 4);
    b.set(CON2);
    b.mirrored((s) => { for (const x of [-4.6, -1.5, 1.6, 4.7])
        b.box(x, 3.4, s * 4.62, 0.3, 2.9, 0.12); });
    b.mirrored((s) => { b.set([1, 1, 1], 2); b.box(0, 5.5, s * 4.7, 5.8, 0.16, 0.04); });
    hall(b, -6.2, -1.6, 2.0, 0.5, 4.5, 0.35, WALL2, -6.5);
    b.set(CANVAS, 0);
    b.cyl(-3.9, 4.5, -6.5, 1.3, 1.3, 2.2, 8, "y", false);
    b.set(DARK, 0);
    b.disc(-3.9, 6.7, -6.5, 1.3, 8, "y", 1);
    b.set(DARK, 0);
    b.quad([-1.58, 0.5, -7.2], [-1.58, 0.5, -5.8], [-1.58, 2.8, -5.8], [-1.58, 2.8, -7.2], [-3, 2, -6.5]);
    G2(() => g2Foundry(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Barracks: a long ribbed half-round hut (the only arched roof in the base) with a sandbagged porch, a flagpole with a
 * team banner, side windows, a vent and an antenna. */
function barracks() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 7.4, 4.6);
    b.set(WALL);
    b.cyl(-6.2, 0.5, 0, 3.7, 3.7, 12.4, 12, "x", true);
    b.set(DARK, 0);
    for (const x of [-4.4, -1.4, 1.6, 4.6])
        b.cyl(x, 0.5, 0, 3.77, 3.77, 0.2, 12, "x", false);
    b.set([1, 1, 1], 2);
    b.box(0, 4.22, 0, 5.4, 0.06, 0.18);
    b.set(GLASS, 0);
    b.mirrored((s) => { for (const x of [-3.0, 0.1, 3.1])
        b.quad([x - 0.6, 1.9, s * 3.38], [x + 0.6, 1.9, s * 3.38], [x + 0.6, 2.6, s * 3.15], [x - 0.6, 2.6, s * 3.15], [x, 1.5, 0]); });
    b.set(CON2);
    b.box(6.9, 3.2, 0, 0.9, 0.12, 2.0);
    doorX(b, 6.21, -1.1, 1.1, 0.5, 2.9, 0);
    b.set(CANVAS, 0);
    b.mirrored((s) => { for (let i = 0; i < 3; i++)
        b.ball(7.6, 0.75 + (i === 1 ? 0.4 : 0), s * (2.1 + i * 0.75), 0.55, 0, 0.45); });
    b.set(GUN, 0);
    b.cyl(6.6, 0.5, 3.8, 0.07, 0.06, 8.0, 4, "y", false);
    b.set([1, 1, 1], 2);
    b.quad([6.6, 6.7, 3.85], [6.6, 6.7, 5.6], [6.6, 8.2, 5.6], [6.6, 8.2, 3.85], [6.5, 7.4, 4.6]);
    b.quad([6.6, 6.7, 5.6], [6.6, 6.7, 3.85], [6.6, 8.2, 3.85], [6.6, 8.2, 5.6], [6.7, 7.4, 4.6]);
    stack(b, -4.8, 3.0, 1.4, 0.35, 2.0);
    b.set(DARK, 0);
    b.cyl(-5.5, 3.2, -1.2, 0.03, 0.02, 3.2, 4, "y", false);
    G2(() => g2Barracks(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Armoury: a heavy hall with a sloped armoured roof, a gantry crane over its apron, a door and ammunition crates. */
function armoury() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 9.0, 5.6);
    b.set(WALL);
    b.hull([[-6.2, 0.5], [6.0, 0.5], [6.0, 3.8], [4.4, 5.6], [-4.6, 5.6], [-6.2, 3.8]], 4.6, 3.8);
    b.set(PANEL);
    b.mirrored((s) => { for (const x of [-3, 0, 3])
        b.quad([x - 0.08, 3.9, s * 4.45], [x + 0.08, 3.9, s * 4.45], [x + 0.08, 5.5, s * 3.85], [x - 0.08, 5.5, s * 3.85], [x, 2, 0]); });
    doorX(b, 6.0, -2.2, 2.2, 0.5, 3.4, 3);
    b.set(STEEL, 0);
    b.mirrored((s) => { b.box(8.5, 3.6, s * 3.6, 0.2, 3.1, 0.2); b.box(4.0, 6.6, s * 3.6, 4.7, 0.18, 0.2); });
    b.box(8.5, 6.8, 0, 0.25, 0.25, 3.8);
    b.set(HAZARD, 0);
    b.box(6.5, 6.6, 0, 0.35, 0.3, 3.6);
    b.set(DARK, 0);
    b.cyl(6.5, 4.6, 0, 0.04, 0.04, 2.0, 4, "y", false);
    b.box(6.5, 4.5, 0, 0.3, 0.12, 0.3);
    b.mirrored((s) => { b.set([1, 1, 1], 2); b.box(-0.2, 3.5, s * 4.62, 5.6, 0.14, 0.04); });
    crates(b, -8.0, 2.5, 4);
    crates(b, 7.4, -5.0, 2);
    G2(() => g2Armoury(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Tech Lab: a lab block with a glazed observation dome, a side module, a dish antenna and a lit sensor mast. */
function techlab() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 7.0, 5.0);
    hall(b, -5.6, 3.4, 4.0, 0.5, 4.6, 0.4);
    b.set(CON);
    b.cyl(-1.4, 4.6, 0, 3.3, 3.3, 0.6, 12, "y", false);
    b.set(GLASS, 0);
    b.cyl(-1.4, 5.2, 0, 3.25, 3.0, 0.7, 12, "y", false);
    b.set(CON);
    b.ball(-1.4, 5.85, 0, 3.0, 1, 0.55);
    hall(b, 3.4, 6.2, 2.4, 0.5, 3.2, 0.3, WALL2);
    doorX(b, 6.2, -1.0, 1.0, 0.5, 2.6, 0);
    b.set(STEEL, 0);
    b.cyl(-4.6, 4.6, -2.8, 0.15, 0.12, 3.0, 5, "y", false);
    b.set(CON);
    b.cyl(-4.5, 7.4, -2.8, 0.25, 1.6, 0.45, 10, "x");
    b.set(GUN, 0);
    b.cyl(1.6, 4.6, 2.6, 0.06, 0.04, 4.0, 4, "y", false);
    b.set([1, 1, 1], 2);
    b.box(1.6, 8.7, 2.6, 0.15, 0.15, 0.15);
    b.mirrored((s) => { b.set([1, 1, 1], 2); b.box(-1.1, 3.6, s * 4.02, 4.2, 0.14, 0.04); });
    pipe(b, -5.6, 1.2, 4.3, 9.0, "x", 0.18);
    G2(() => g2Techlab(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Refinery: two tall ore tanks with domed tops and team bands, an intake hopper on legs fed by a conveyor, a purple ore
 * heap at the drop-off, a stack and a control hut. */
function refinery() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 7.5, 5.5);
    for (const [x, z] of [[-3.8, -2.2], [-3.8, 2.4]]) {
        b.set(WALL);
        b.cyl(x, 0.5, z, 2.1, 2.1, 7.2, 10, "y", false);
        b.set(CON);
        b.ball(x, 7.7, z, 2.1, 0, 0.45);
        b.set([1, 1, 1], 2);
        b.cyl(x, 5.6, z, 2.14, 2.14, 0.25, 10, "y", false);
        b.set(DARK, 0);
        b.cyl(x, 2.4, z, 2.14, 2.14, 0.16, 10, "y", false);
    }
    b.set(STEEL, 0);
    for (const [x, z] of [[0.8, -1.3], [3.2, -1.3], [0.8, 1.3], [3.2, 1.3]])
        b.cyl(x, 0.5, z, 0.14, 0.12, 4.5, 4, "y", false);
    b.set(STEEL, 0);
    b.cyl(2.0, 4.5, 0, 1.0, 2.4, 2.4, 8, "y", false, Math.PI / 8);
    b.set(HAZARD, 0);
    b.cyl(2.0, 6.85, 0, 2.42, 2.42, 0.2, 8, "y", false, Math.PI / 8);
    b.set([0.09, 0.08, 0.1], 0);
    b.disc(2.0, 6.8, 0, 2.3, 8, "y", 1, Math.PI / 8);
    b.set(ORE_A, 4);
    b.ball(2.0, 6.6, 0, 1.4, 0, 0.35);
    const m = b.mark();
    b.set(GUN, 0);
    b.box(5.95, 3.5, 0, 3.95, 0.15, 0.7);
    b.set(DARK, 0);
    b.box(5.95, 3.68, 0, 3.95, 0.05, 0.6);
    b.rotZ(m, -0.866, 5.95, 3.5); // conveyor
    b.set(STEEL, 0);
    b.cyl(7.0, 0.5, 0, 0.12, 0.1, 1.6, 4, "y", false);
    b.set(ORE_B, 4);
    crystal(b, 7.0, 1.6, 1.6, 0.5, 0.3, -0.2, 0.4, 5, 0.3);
    crystal(b, 7.6, 2.4, 1.1, 0.4, -0.2, 0.3, 1.2, 5, 0.3);
    b.set(ORE_ROCK, 0);
    b.ball(7.2, 0.4, 2.0, 1.3, 0, 0.4);
    stack(b, -6.4, 0.5, 0, 0.55, 9.5);
    pipe(b, -3.8, 3.0, -0.1, 0.2, "z", 0.3);
    pipe(b, -1.7, 3.6, 0, 2.6, "x", 0.25);
    hall(b, 2.0, 5.6, 1.4, 0.5, 2.7, 0.25, WALL2, 4.0);
    b.set(GLASS, 0);
    b.quad([5.61, 1.6, 3.0], [5.61, 1.6, 5.0], [5.61, 2.3, 5.0], [5.61, 2.3, 3.0], [3.5, 1.5, 4.0]);
    G2(() => g2Refinery(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Landing pad base (Air Pad, Launch Pad Uplink): a round raised pad with a lit edge ring and a team ring. */
function padBase(b) {
    b.set(CON2, 0);
    b.cyl(0, -0.5, 0, 8.4, 8.0, 1.0, 12, "y", false);
    b.set([0.26, 0.27, 0.27], 0);
    b.disc(0, 0.5, 0, 8.0, 12, "y", 1);
    b.set([1, 1, 1], 2);
    b.cyl(0, 0.5, 0, 7.3, 7.3, 0.05, 24, "y", false);
    b.cyl(0, 0.5, 0, 7.15, 7.15, 0.05, 24, "y", false);
    b.set([1, 1, 1], 3);
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        b.box(Math.cos(a) * 7.8, 0.58, Math.sin(a) * 7.8, 0.18, 0.08, 0.18);
    }
}
/** Air Pad: the pad with a big H, a control tower with a glazed cab, fuel tanks and a windsock. */
function pad() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    padBase(b);
    b.set(HAZARD, 0);
    b.box(0, 0.52, -1.9, 0.35, 0.03, 0.35 + 1.25);
    b.box(0, 0.52, 1.9, 0.35, 0.03, 1.6);
    b.box(0, 0.52, 0, 2.2, 0.03, 0.35);
    b.box(2.2, 0.52, 0, 0.35, 0.03, 2.6);
    b.box(-2.2, 0.52, 0, 0.35, 0.03, 2.6);
    b.box(0, 0.51, 0, 0.1, 0.02, 0.1);
    b.set(WALL);
    b.cyl(-10.0, -0.5, 4.0, 1.4, 1.1, 7.0, 8, "y", false, Math.PI / 8);
    b.set(STEEL, 0);
    b.cyl(-10.0, 6.5, 4.0, 1.3, 2.0, 0.4, 8, "y", false, Math.PI / 8);
    b.set(GLASS, 0);
    b.cyl(-10.0, 6.9, 4.0, 2.0, 2.1, 1.2, 8, "y", false, Math.PI / 8);
    b.set(CON);
    b.cyl(-10.0, 8.1, 4.0, 2.3, 1.6, 0.5, 8, "y", true, Math.PI / 8);
    b.set([1, 1, 1], 2);
    b.box(-10.0, 8.9, 4.0, 0.2, 0.2, 0.2);
    b.set(OLIVE, 0);
    b.cyl(-10.4, 0.6, -3.6, 0.8, 0.8, 3.8, 8, "x");
    b.cyl(-10.4, 0.6, -5.4, 0.8, 0.8, 3.8, 8, "x");
    b.set(GUN, 0);
    b.cyl(9.6, 0, -4.4, 0.05, 0.05, 5.0, 4, "y", false);
    b.set(HAZARD, 0);
    b.cyl(9.6, 4.6, -4.4, 0.35, 0.12, 1.6, 6, "z");
    G2(() => g2Pad(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Launch Pad Uplink: the pad with an uplink dish on a lattice gantry and a cable run. */
function uplink() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    padBase(b);
    b.set(STEEL, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
        b.cyl(-11 + x * 1.4, -0.3, z * 1.4, 0.15, 0.1, 9.0, 4, "y", false);
    b.set(GUN, 0);
    for (let k = 0; k < 3; k++) {
        const y = 2 + k * 2.6;
        b.box(-11, y, -1.4, 1.4, 0.06, 0.06);
        b.box(-11, y, 1.4, 1.4, 0.06, 0.06);
        b.box(-12.4, y, 0, 0.06, 0.06, 1.4);
        b.box(-9.6, y, 0, 0.06, 0.06, 1.4);
    }
    b.set(CON);
    b.cyl(-10.6, 9.2, 0, 0.5, 4.0, 1.0, 12, "y");
    b.set(STEEL, 0);
    b.cyl(-10.6, 9.5, 0, 0.12, 0.1, 2.6, 4, "y", false);
    b.set([1, 1, 1], 2);
    b.box(-10.6, 12.2, 0, 0.2, 0.2, 0.2);
    pipe(b, -9.6, 0.7, 0.8, 1.8, "x", 0.15);
    G2(() => g2Uplink(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Mass Driver: a long launch ramp rising to the front with glowing accelerator coils along twin rails and a capacitor block. */
function massdriver() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 11.5, 3.6);
    b.set(WALL);
    b.hull([[-11, 0.5], [10.5, 0.5], [10.5, 6.6], [9.6, 7.2], [-11, 1.6]], 2.4, 1.6);
    // rails and coils built level about the slope's middle (-0.7, 4.4), then pitched onto it
    const ang = Math.atan2(7.2 - 1.6, 9.6 + 11), m = b.mark(), cx = -0.7, cy = 4.45;
    b.set(STEEL, 0);
    b.mirrored((s) => b.box(cx, cy + 0.2, s * 0.8, 10.4, 0.18, 0.16));
    b.set([1, 1, 1], 3);
    for (let i = 0; i < 6; i++)
        b.cyl(cx - 8 + i * 3.2, cy + 0.6, 0, 1.25, 1.25, 0.45, 8, "x", false);
    b.set(GUN, 0);
    for (let i = 0; i < 6; i++)
        b.cyl(cx - 8.3 + i * 3.2, cy + 0.6, 0, 1.35, 1.35, 0.25, 8, "x", false);
    b.rotZ(m, ang, cx, cy);
    b.set(CON);
    b.box(-8.5, 2.2, 0, 2.2, 1.7, 2.6);
    b.set([1, 1, 1], 2);
    b.mirrored((s) => b.box(-8.5, 2.6, s * 2.62, 1.8, 0.14, 0.04));
    b.set(STEEL, 0);
    b.mirrored((s) => b.cyl(-8.5, 3.9, s * 1.2, 0.4, 0.4, 1.0, 6, "y", false));
    G2(() => g2MassDriver(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Repair Bay: an open bay under a pitched roof on steel posts, a crane rail with a hook, tool cabinets and floor markings. */
function bay() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 6.8, 5.2, 0.4);
    b.set(HAZARD, 0);
    b.box(0, 0.42, 3.4, 5.0, 0.03, 0.18);
    b.box(0, 0.42, -3.4, 5.0, 0.03, 0.18);
    b.set([1, 1, 1], 2);
    b.box(0, 0.42, 0, 0.18, 0.03, 1.4);
    b.box(0, 0.42, 0, 1.4, 0.03, 0.18); // repair cross
    b.set(STEEL, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
        b.box(x * 5.8, 2.8, z * 4.4, 0.22, 2.5, 0.22);
    b.set(WALL);
    b.hull([[-6.4, 5.2], [6.4, 5.2], [6.4, 5.6], [-6.4, 5.6]], 5.0, 5.0);
    b.set(CON);
    b.hull([[-6.2, 5.6], [6.2, 5.6], [6.2, 5.8], [0, 6.9], [-6.2, 5.8]], 4.8, 4.8);
    b.set(GUN, 0);
    b.box(0, 4.85, 0, 5.6, 0.14, 0.2);
    b.box(1.6, 4.55, 0, 0.35, 0.18, 0.5);
    b.set(DARK, 0);
    b.cyl(1.6, 2.8, 0, 0.04, 0.04, 1.6, 4, "y", false);
    b.set(HAZARD, 0);
    b.box(1.6, 2.7, 0, 0.25, 0.12, 0.25);
    b.set(OLIVE, 0);
    b.box(-5.2, 1.2, -4.0, 0.8, 0.8, 0.4);
    b.box(-3.4, 1.0, -4.0, 0.8, 0.6, 0.4);
    b.set([1, 1, 1], 2);
    b.mirrored((s) => b.box(0, 5.4, s * 5.02, 6.0, 0.12, 0.04));
    G2(() => g2Bay(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Field Depot: stacked supply containers, a canvas tent, fuel drums and a radio mast with a team flag. */
function depot() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinth(b, 6.4, 4.8, 0.3);
    const box = (x, y, z, col, mat = 0) => { b.set(col, mat); b.box(x, y + 1.2, z, 2.9, 1.2, 1.2); b.set(DARK, 0); for (const d of [-2, -1, 0, 1, 2])
        b.box(x + d * 1.15, y + 1.2, z + 1.21, 0.05, 1.1, 0.02); };
    box(-2.8, 0.3, -2.8, OLIVE);
    box(-2.8, 0.3, -0.3, WALL2, 1);
    box(-2.8, 2.7, -1.6, CANVAS);
    b.set(CANVAS, 0);
    b.hull([[0.8, 0.3], [5.4, 0.3], [5.4, 0.6], [3.1, 3.4], [0.8, 0.6]], 2.4, 2.4, 2.0);
    b.set(DARK, 0);
    b.quad([5.42, 0.3, 1.2], [5.42, 0.3, 2.8], [5.42, 1.8, 2.4], [5.42, 1.8, 1.6], [3, 1, 2]);
    b.set([0.48, 0.24, 0.17], 0);
    for (let i = 0; i < 4; i++)
        b.cyl(1.0 + (i % 2) * 0.95, 0.3, -2.4 - Math.floor(i / 2) * 0.95, 0.42, 0.42, 1.2, 8, "y", true);
    b.set(GUN, 0);
    b.cyl(4.8, 0.3, -3.6, 0.06, 0.05, 8.5, 4, "y", false);
    b.set([1, 1, 1], 2);
    b.quad([4.8, 7.2, -3.55], [6.6, 7.2, -3.55], [6.6, 8.6, -3.55], [4.8, 8.6, -3.55], [5.7, 7.9, -3.7]);
    b.quad([6.6, 7.2, -3.65], [4.8, 7.2, -3.65], [4.8, 8.6, -3.65], [6.6, 8.6, -3.65], [5.7, 7.9, -3.4]);
    G2(() => g2Depot(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Shield Projector: a hexagonal drum with a lit ring, six steel fins round a glowing emitter sphere. */
function dome() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinthR(b, 4.6, 6, 0.5, Math.PI / 6);
    b.set(WALL);
    b.cyl(0, 0.5, 0, 3.4, 2.6, 3.5, 6, "y", false, Math.PI / 6);
    b.set(CON);
    b.disc(0, 4.0, 0, 2.6, 6, "y", 1, Math.PI / 6);
    b.set([1, 1, 1], 2);
    b.cyl(0, 2.6, 0, 3.0, 2.95, 0.25, 6, "y", false, Math.PI / 6);
    b.set(STEEL, 0);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        b.poly([[c * 1.8, 4.0, s * 1.8], [c * 2.7, 4.0, s * 2.7], [c * 2.3, 7.0, s * 2.3], [c * 1.7, 7.0, s * 1.7]]);
        b.poly([[c * 1.8, 4.0, s * 1.8], [c * 1.7, 7.0, s * 1.7], [c * 2.3, 7.0, s * 2.3], [c * 2.7, 4.0, s * 2.7]]);
    }
    b.set([1, 1, 1], 3);
    b.ball(0, 5.6, 0, 1.6, 1);
    G2(() => g2Dome(b));
    return b.build([0, 0, 0], 0, 0);
}
/** Control node (fix-qa2): an armoured hexagonal pylon with buttresses, a lit capture ring and the gun tower's head. */
function controlNode() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    plinthR(b, 4.6, 6, 0.4, Math.PI / 6);
    b.set(WALL);
    b.cyl(0, 0.4, 0, 3.2, 1.9, 7.9, 6, "y", false, Math.PI / 6);
    b.set(CON2);
    b.mirrored((s) => b.hull([[s * 2.4, 0.4], [s * 3.6, 0.4], [s * 2.7, 3.4], [s * 2.2, 3.4]], 0.8, 0.6));
    b.mirrored((s) => b.hull([[-0.8, 0.4], [0.8, 0.4], [0.6, 3.4], [-0.6, 3.4]], 0.6, 0.5, s * 2.9));
    b.set([1, 1, 1], 3);
    b.cyl(0, 3.4, 0, 2.75, 2.65, 0.35, 6, "y", false, Math.PI / 6);
    b.set([1, 1, 1], 2);
    b.cyl(0, 6.2, 0, 2.15, 2.1, 0.3, 6, "y", false, Math.PI / 6);
    b.set(HAZARD, 0);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        b.box(Math.cos(a) * 4.3, 0.42, Math.sin(a) * 4.3, 0.35, 0.05, 0.35);
    }
    towerHead(b);
    b.part = 1;
    b.set(GUN, 0, 1);
    b.cyl(-1.0, 10.3, 0, 0.12, 0.06, 2.6, 4, "y", false);
    b.set([1, 1, 1], 3, 1);
    b.ball(-1.0, 13.0, 0, 0.3, 0);
    b.part = 0;
    G2(() => g2Node(b));
    return b.build([0, 8.3, 0], 0, 0, 0.4);
}
/** Bunker (chokepoint prebuilt, fortification level 2): a sloped concrete pillbox with firing slits, a roof slab in team
 * concrete, sandbags in front, a periscope and a rear door. */
function bunker() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(CON);
    b.hull([[-5.5, -0.6], [5.5, -0.6], [5.0, 1.8], [3.4, 3.4], [-3.4, 3.4], [-5.0, 1.8]], 5.0, 4.2);
    b.set(WALL);
    b.hull([[-3.2, 3.3], [3.2, 3.3], [3.0, 3.75], [-3.0, 3.75]], 3.2, 3.0);
    b.set([0.06, 0.06, 0.06], 0);
    b.box(4.95, 1.9, 0, 0.14, 0.45, 3.8);
    b.mirrored((s) => b.box(0, 1.9, s * 4.45, 3.4, 0.45, 0.14)); // firing slits (the guns are inside)
    b.set(DARK, 0);
    b.box(-5.05, 0.8, 0, 0.1, 1.2, 1.0);
    b.set(HAZARD, 0);
    b.box(-5.1, 2.15, 0, 0.08, 0.15, 1.3);
    b.set(CANVAS, 0);
    for (let i = 0; i < 7; i++)
        b.ball(6.3, 0.35, -3.3 + i * 1.1, 0.6, 0, 0.45);
    for (let i = 0; i < 6; i++)
        b.ball(6.3, 0.8, -2.75 + i * 1.1, 0.58, 0, 0.42);
    b.set(STEEL, 0);
    b.cyl(1.0, 3.75, 1.2, 0.18, 0.18, 0.9, 5, "y", false);
    b.set(GLASS, 0);
    b.box(1.15, 4.6, 1.2, 0.08, 0.12, 0.14);
    b.set([1, 1, 1], 2);
    b.box(0, 3.78, 0, 1.4, 0.04, 1.4);
    G2(() => g2Bunker(b));
    return b.build([0, 0, 0], 0, 0);
}
/**
 * B1: one of a bunker's mounted weapons, in the bunker's model space (drawn at the bunker's position as its own instance).
 * The whole gun is the turret part, turning about the bunker's centre like the sim's muzzle (data buildings.json
 * mounts[].muzzle, which turns with the aim around the hull centre), so the barrel tip is the shot origin. 0: heavy
 * machine gun on a post (front), 1: autocannon in a shielded cradle (right), 2: twin-tube AT launcher (left).
 */
function bunkerGun(m) {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.part = 1;
    if (m === 0) {
        b.set(STEEL, 0, 1);
        b.cyl(2.3, 3.7, 0, 0.12, 0.12, 0.5, 6, "y", true); // post
        b.set(GUN, 0, 1);
        b.box(2.45, 4.3, 0, 0.32, 0.17, 0.2); // receiver
        b.set(DARK, 0, 1);
        b.box(2.55, 4.42, 0, 0.05, 0.3, 0.42); // gun shield
        b.set(OLIVE, 0, 1);
        b.box(2.35, 4.2, 0.28, 0.14, 0.1, 0.09); // ammo box
        b.set(GUN, 0, 2);
        b.cyl(2.75, 4.3, 0, 0.07, 0.06, 1.75, 6, "x", false);
        b.set(DARK, 0, 2);
        b.cyl(4.35, 4.3, 0, 0.1, 0.1, 0.25, 6, "x");
    }
    else if (m === 1) {
        b.set(STEEL, 0, 1);
        b.cyl(1.4, 3.7, 2.2, 0.35, 0.3, 0.4, 8, "y", true); // ring
        b.set(P2, 1, 1);
        b.hull([[1.1, 4.05], [1.85, 4.05], [1.95, 4.45], [1.7, 4.75], [1.1, 4.75]], 0.45, 0.4, 2.2); // cradle (team tint)
        b.set(DARK, 0, 1);
        b.box(1.95, 4.4, 2.2, 0.08, 0.3, 0.4);
        b.set(GUN, 0, 2);
        b.cyl(2.0, 4.4, 2.2, 0.13, 0.11, 1.9, 8, "x", false);
        b.set(DARK, 0, 2);
        b.cyl(3.85, 4.4, 2.2, 0.18, 0.18, 0.35, 8, "x"); // muzzle brake
    }
    else {
        b.set(STEEL, 0, 1);
        b.cyl(1.6, 3.7, -2.2, 0.12, 0.12, 0.75, 6, "y", true); // post
        b.set(OLIVE, 1, 1);
        b.mirrored((sd) => b.cyl(1.3, 4.6 + sd * 0.17, -2.2, 0.15, 0.15, 2.25, 8, "x", true)); // twin tubes
        b.set(DARK, 0, 1);
        b.box(1.7, 4.6, -2.2, 0.14, 0.38, 0.22);
        b.set(HAZARD, 0, 1);
        b.box(3.4, 4.6, -2.2, 0.06, 0.36, 0.17);
    }
    b.part = 0;
    // designer playtest 15 Nov: the guns sit INSIDE the bunker at the firing slit (y 1.9), only the barrel tip
    // poking out at the wall (buildings.json mounts[].muzzle: HMG [5.3, 1.9, 0], autocannon [5.2, 1.9, 1.4], AT [5.2, 1.9, -1.4])
    const md = b.build([0, 0, 0], 0, 0, m === 2 ? 0.1 : 0.25);
    const [dx, dy, dz] = m === 0 ? [0.8, -2.4, 0] : m === 1 ? [1.2, -2.5, -0.8] : [1.65, -2.7, 0.8];
    const v = md.verts;
    let h = -Infinity, lo = Infinity, r = 0;
    for (let i = 0; i < v.length; i += exports.VERTEX_FLOATS) {
        v[i] += dx;
        v[i + 1] += dy;
        v[i + 2] += dz;
        h = Math.max(h, v[i + 1]);
        lo = Math.min(lo, v[i + 1]);
        r = Math.max(r, Math.hypot(v[i], v[i + 2]));
    }
    if (lo < Infinity) {
        md.height = h;
        md.minY = lo;
        md.midY = (lo + h) / 2;
        md.radius = r;
    }
    return md;
}
/** Barricade wall segment (fortification level 1): a 14 m tapered concrete block wall on a footing, block joints,
 * hazard panels, a team stripe, steel tank traps in front. */
function wall() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(CON2);
    b.hull([[-1.4, -0.5], [1.4, -0.5], [1.4, 0.4], [-1.4, 0.4]], 7.0, 7.0);
    b.set(CON);
    b.hull([[-1.0, 0.4], [1.0, 0.4], [0.55, 2.6], [-0.55, 2.6]], 6.9, 6.9);
    b.set(DARK, 0);
    for (const z of [-4.6, -2.3, 0, 2.3, 4.6])
        b.box(0, 1.5, z, 0.9, 1.05, 0.04);
    b.set(HAZARD, 0);
    for (const z of [-3.45, 3.45]) {
        b.quad([0.97, 0.7, z - 0.8], [0.97, 0.7, z + 0.8], [0.6, 1.3, z + 0.8], [0.6, 1.3, z - 0.8], [0, 1, z]);
        b.quad([-0.97, 0.7, z + 0.8], [-0.97, 0.7, z - 0.8], [-0.6, 1.3, z - 0.8], [-0.6, 1.3, z + 0.8], [0, 1, z]);
    }
    b.set([1, 1, 1], 2);
    b.box(0, 2.62, 0, 0.5, 0.04, 6.0);
    b.set(STEEL, 0);
    for (const z of [-5, -1.7, 1.7, 5]) {
        b.box(2.8, 0.5, z, 0.12, 0.12, 0.9);
        b.box(2.8, 0.5, z, 0.9, 0.12, 0.12);
        b.box(2.8, 0.5, z, 0.12, 0.9, 0.12);
    }
    G2(() => g2Wall(b));
    return b.build([0, 0, 0], 0, 0);
}
/** C6: Carrier: a long armoured personnel box (designer 20 Nov: on hover nacelles, no wheels) with a rear ramp and a small roof gun. P3: lofted with a sloped nose, fenders, hubs, doors, vision blocks. */
function carrier() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(P1);
    b.loft([
        [-3.9, hsec(0.55, 1.4, 2.38, 1.55, 1.72, 1.42, 0.25)],
        [3.0, hsec(0.5, 1.4, 2.38, 1.55, 1.75, 1.42, 0.25)],
        [4.05, hsec(0.7, 1.05, 1.52, 1.28, 1.45, 1.18, 0.1)],
    ], [2]);
    b.set(PANEL);
    b.quad([3.2, 2.25, -1.2], [3.28, 2.21, -1.2], [3.28, 2.21, 1.2], [3.2, 2.25, 1.2], [3.0, 0, 0]);
    b.quad([-1.9, 2.385, -1.2], [-1.82, 2.385, -1.2], [-1.82, 2.385, 1.2], [-1.9, 2.385, 1.2], [-1.9, 0, 0]);
    // designer 20 Nov: a hover APC, no wheels: long hover nacelles under the flanks with skirt plates and glow pads
    b.mirrored((s) => {
        nacelle(b, -3.75, 3.45, s * 1.62, 0.12, 0.92, 0.46, [-2.6, -0.9, 0.9, 2.6]);
        skirtPlates(b, -3.4, 3.1, s * 2.1, 0.28, 0.98, 4);
        glowStripe(b, -2.9, 2.6, 1.02, s * 1.9);
        b.set(STEEL, 0);
        b.cyl(-3.98, 0.95, s * 1.15, 0.22, 0.25, 0.3, 6, "x", false); // rear thrusters
        b.set([1, 1, 1], 3);
        b.disc(-3.98, 0.95, s * 1.15, 0.18, 6, "x", -1);
    });
    b.mirrored((s) => { b.set(P2); b.box(0, 1.25, s * 1.92, 3.6, 0.08, 0.3); }); // sponson ledges over the nacelles
    // rear ramp with a hinge, side doors, vision blocks, lamps, tow hook
    b.set(P3);
    b.box(-3.95, 1.2, 0, 0.08, 0.9, 1.2);
    b.set(DARK, 0);
    b.cyl(-4.0, 0.42, -1.1, 0.07, 0.07, 2.2, 5, "z", false);
    b.box(-4.05, 0.6, 0, 0.08, 0.1, 0.25);
    b.mirrored((s) => {
        b.set(PANEL);
        b.quad([-2.7, 1.47, s * 1.73], [-1.5, 1.47, s * 1.73], [-1.5, 2.0, s * 1.51], [-2.7, 2.0, s * 1.51], [-2.1, 1.7, 0]); // side door
        b.set(GLASS, 0);
        b.quad([3.25, 2.0, s * 0.25], [3.25, 2.0, s * 1.1], [3.55, 1.72, s * 1.1], [3.55, 1.72, s * 0.25], [2.5, 1.0, s * 0.6]); // vision blocks
        b.set([1, 1, 1], 2);
        b.disc(3.98, 1.25, s * 0.95, 0.1, 4, "x", 1);
    });
    b.set(OLIVE, 0);
    b.box(-2.6, 2.48, 0.85, 0.7, 0.1, 0.35); // roof stowage
    b.set(GUN, 0);
    b.disc(-1.2, 2.39, -0.75, 0.32, 6, "y", 1);
    b.disc(-2.4, 2.39, -0.75, 0.32, 6, "y", 1); // roof hatches
    b.set(DARK, 0);
    b.cyl(-3.4, 2.38, -1.2, 0.03, 0.02, 1.0, 4, "y", false); // antenna
    // C8 (QA4 bug 10): the driver sits under a raised cupola on the roof, where the data's driver zone is
    b.set(P2);
    b.cyl(0.15, 2.35, 0, 0.3, 0.28, 0.55, 8, "y", false, Math.PI / 8);
    cupola(b, 0.15, 2.9, 0.28, 0);
    // roof gun: a small chamfered mount with a mantlet and a barrel with a muzzle sleeve (muzzle at x 2.4)
    b.part = 1;
    b.set(P2, 1, 1);
    b.cyl(0.8, 2.38, 0, 0.5, 0.42, 0.42, 8, "y", false, Math.PI / 8);
    b.disc(0.8, 2.8, 0, 0.42, 8, "y", 1, Math.PI / 8);
    b.set(GUN, 0, 1);
    b.box(1.0, 2.6, 0, 0.14, 0.14, 0.18); // mantlet
    gunAutocannon(b, 2.4, 2.6, 0, 1.5, 1.05); // designer 20 Nov: a real autocannon
    b.part = 0;
    // bow machine gun in a ball mount on the glacis, between the vision blocks (carrier-hull-gun)
    b.set(DARK, 0);
    b.ball(3.47, 1.97, 0, 0.17, 0);
    gunMG(b, 4.35, 1.97, 0, 1.05, 1.2, false);
    b.set([1, 1, 1], 2);
    b.mirrored((s) => b.box(1.05, 1.62, s * 1.715, 1.75, 0.08, 0.04));
    G2(() => g2Carrier(b));
    return b.build([0.8, 2.6, 0], 0.85, 0.1);
}
/** C6: Mule dropship: a fat fuselage with a cargo bay, stub wings and two rotor discs. P3: lofted, chamfered fuselage,
 * glass cockpit, door openings, rear ramp, engine pods with lit undersides, rotor hubs, a fixed chin gun, skids. */
/**
 * Frontline: the gunship. The Mule's fuselage, slimmer and lower, with no rotors: two rocket engines on the stub wing tips
 * (nacelles with glowing exhaust bells, the nozzles tilted down for lift), a lift rocket under the tail, twin-linked machine
 * guns under the nose and a minigun (six-barrel cluster) at each open side door.
 */
/** Graphics pass: the gunship's fuselage stations (x, right half-section from the bottom up). */
const GS = [
    [-4.7, hsec(1.0, 1.35, 1.8, 0.3, 0.45, 0.32, 0.1)],
    [-3.3, hsec(0.3, 1.0, 2.0, 0.9, 1.15, 0.85, 0.28)],
    [-1.2, hsec(0.0, 0.9, 2.05, 1.12, 1.35, 1.0, 0.3)],
    [1.1, hsec(0.0, 0.85, 1.95, 1.1, 1.3, 0.95, 0.3)],
    [2.5, hsec(0.12, 0.75, 1.5, 0.8, 0.98, 0.66, 0.2)],
    [3.6, hsec(0.3, 0.62, 1.0, 0.46, 0.6, 0.38, 0.12)],
    [4.15, hsec(0.42, 0.62, 0.84, 0.16, 0.26, 0.16, 0.05)],
];
/** The fuselage's half-section at x (interpolated between the stations). */
function gsSec(x) {
    let i = 0;
    while (i + 2 < GS.length && x > GS[i + 1][0])
        i++;
    const t = Math.max(0, Math.min(1, (x - GS[i][0]) / (GS[i + 1][0] - GS[i][0])));
    return GS[i][1].map((p, k) => [p[0] + (GS[i + 1][1][k][0] - p[0]) * t, p[1] + (GS[i + 1][1][k][1] - p[1]) * t]);
}
/** The fuselage's half-width at (x, y). */
function gsZ(x, y) {
    const S = gsSec(x);
    for (let k = 0; k + 1 < S.length; k++)
        if (y <= S[k + 1][0] || k + 2 === S.length) {
            const t = (y - S[k][0]) / (S[k + 1][0] - S[k][0] || 1);
            return S[k][1] + (S[k + 1][1] - S[k][1]) * t;
        }
    return 0;
}
/** Face quads on the fuselage's side (s: 1 right, -1 left) over x0..x1, y0..y1, split along the waist line where they cross it. */
function gsSide(x0, x1, y0, y1, s) {
    const m0 = gsSec(x0)[1][0], m1 = gsSec(x1)[1][0], out = [];
    const P = (x, y) => [x, y, s * gsZ(x, y)], ins = [(x0 + x1) / 2, (y0 + y1) / 2, 0];
    if (y0 < Math.min(m0, m1) && y1 > Math.max(m0, m1)) {
        out.push([[P(x0, y0), P(x1, y0), P(x1, m1), P(x0, m0)], ins]);
        out.push([[P(x0, m0), P(x1, m1), P(x1, y1), P(x0, y1)], ins]);
    }
    else
        out.push([[P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], ins]);
    return out;
}
const ROCKET = [1.0, 0.58, 0.18], ROCKET_CORE = [1.0, 0.86, 0.55];
const GS_NAC = { x0: -2.9, x1: -0.95, y: 1.3, z: 3.45 };
function gunship() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // Graphics pass: an attack VTOL. A narrow chamfered fuselage with a pointed nose, a long faceted canopy over a tandem
    // cockpit, a dorsal spine with shoulder intakes, swept stub wings behind the open gun doors carrying a rocket engine
    // each (exhaust bell aft, lift nozzle under), a slim tail boom with twin canted fins and a lift rocket under its root.
    b.set(P1);
    b.loft(GS, [2]);
    b.set(P2);
    b.loft([
        [-4.4, [[1.7, 0.3], [1.85, 0.26], [1.95, 0.14]]],
        [-3.0, [[1.9, 0.5], [2.15, 0.44], [2.28, 0.26]]],
        [-0.6, [[1.95, 0.62], [2.3, 0.56], [2.46, 0.32]]],
        [0.95, [[1.8, 0.82], [2.24, 0.63], [2.4, 0.3]]],
    ], [1]);
    b.set(GLASS, 0);
    b.loft([
        [0.9, [[1.75, 0.8], [2.2, 0.6], [2.36, 0.28]]],
        [1.7, [[1.62, 0.78], [2.16, 0.58], [2.32, 0.27]]],
        [2.6, [[1.3, 0.64], [1.78, 0.48], [1.92, 0.22]]],
        [3.5, [[0.95, 0.38], [1.18, 0.28], [1.26, 0.12]]],
    ]);
    b.set(P2);
    b.loft([[1.97, [[1.5, 0.77], [2.07, 0.58], [2.235, 0.27]]], [2.13, [[1.44, 0.745], [2.0, 0.56], [2.165, 0.26]]]]); // the hoop between the two seats
    // tail boom, twin canted fins, a ventral fin with the tail skid
    b.set(P2);
    b.loft([[-4.8, hsec(1.1, 1.4, 1.75, 0.26, 0.38, 0.28, 0.1)], [-6.5, hsec(1.42, 1.56, 1.74, 0.1, 0.16, 0.12, 0.04)]], [2]);
    b.set(P1);
    b.mirrored((s) => prism(b, [[-6.45, 1.68, s * 0.08], [-5.4, 1.68, s * 0.08], [-5.4, 1.68, s * 0.2], [-6.45, 1.68, s * 0.2]], [[-6.9, 2.95, s * 0.95], [-6.35, 2.95, s * 0.95], [-6.35, 2.95, s * 1.02], [-6.9, 2.95, s * 1.02]]));
    b.set(P3);
    prism(b, [[-6.4, 1.45, -0.05], [-5.5, 1.45, -0.05], [-5.5, 1.45, 0.05], [-6.4, 1.45, 0.05]], [[-6.5, 0.8, -0.03], [-6.15, 0.8, -0.03], [-6.15, 0.8, 0.03], [-6.5, 0.8, 0.03]]);
    b.mirrored((s) => {
        const N = GS_NAC, nz = s * N.z;
        // open side door (dark interior) with the minigun on its pintle: a receiver and a six-barrel cluster (muzzle z 1.85)
        b.set([0.08, 0.09, 0.09], 0);
        for (const Q of gsSide(-0.6, 0.95, 0.5, 1.5, s))
            decal(b, Q, 0.012);
        b.set(DARK, 0);
        rod(b, [0.65, 0.5, s * 1.3], [0.65, 0.86, s * 1.44], 0.05, 4);
        b.box(0.65, 0.89, s * 1.44, 0.1, 0.05, 0.1);
        gunTurned(b, () => gunMinigun(b, 0.75, 1.0, 0, 0.8, 1.0, 6), s * Math.PI / 2, 0.65, s * 1.1); // door minigun (tip z 1.85)
        // team stripe along the rear fuselage
        b.set([1, 1, 1], 2);
        for (const Q of gsSide(-3.1, -1.35, 1.2, 1.36, s))
            decal(b, Q, 0.03);
        // swept stub wing (slight anhedral) to the engine
        b.set(P2);
        prism(b, [[-2.75, 1.46, s * 1.05], [-0.75, 1.46, s * 1.05], [-0.75, 1.66, s * 1.05], [-2.75, 1.6, s * 1.05]], [[-2.55, 1.22, s * 3.1], [-1.0, 1.22, s * 3.1], [-1.0, 1.38, s * 3.1], [-2.55, 1.36, s * 3.1]]);
        // rocket engine: body, an armoured team-colour collar, a nose cone, the exhaust bell with its glow, a lift nozzle under
        b.set(STEEL, 0);
        b.cyl(N.x0, N.y, nz, 0.46, 0.44, N.x1 - N.x0, 10, "x", false);
        b.cyl(N.x1, N.y, nz, 0.44, 0.16, 0.6, 10, "x", true);
        b.set(P1);
        b.cyl(-2.45, N.y, nz, 0.52, 0.52, 0.95, 10, "x", true);
        b.set(DARK, 0);
        b.cyl(N.x0 - 0.65, N.y, nz, 0.58, 0.38, 0.65, 10, "x", false);
        b.set(ROCKET, 4);
        b.disc(N.x0 - 0.62, N.y, nz, 0.54, 10, "x", -1);
        b.set(ROCKET_CORE, 4);
        b.disc(N.x0 - 0.635, N.y, nz, 0.3, 8, "x", -1);
        b.set(DARK, 0);
        b.cyl(-1.7, 0.48, nz, 0.32, 0.24, 0.45, 8, "y", false);
        b.set(ROCKET, 4);
        b.disc(-1.7, 0.49, nz, 0.29, 8, "y", -1);
        // underwing rocket pod on a pylon
        b.set(DARK, 0);
        b.box(-1.75, 1.2, s * 2.1, 0.4, 0.12, 0.05);
        b.set(STEEL, 0);
        b.cyl(-2.45, 0.9, s * 2.1, 0.2, 0.27, 0.3, 8, "x", true);
        b.cyl(-2.15, 0.9, s * 2.1, 0.27, 0.27, 1.25, 8, "x", true);
        b.set(BLACK, 0);
        b.disc(-0.895, 0.9, s * 2.1, 0.22, 8, "x", 1);
        b.set(GUN, 0); // Frontline: seven rocket tube mouths on the pod's face
        for (let k = 0; k < 7; k++) {
            const a = k * Math.PI / 3, r = k === 6 ? 0 : 0.14;
            b.disc(-0.885, 0.9 + Math.sin(a) * r, s * 2.1 + Math.cos(a) * r, 0.05, 6, "x", 1);
        }
        // skid
        b.set(DARK, 0);
        b.box(0.15, -0.18, s * 1.0, 1.75, 0.05, 0.06);
        b.box(1.2, -0.02, s * 0.95, 0.05, 0.14, 0.05);
        b.box(-0.9, -0.02, s * 0.95, 0.05, 0.14, 0.05);
        // shoulder intake beside the spine
        b.set(STEEL, 0);
        b.loft([[-1.9, [[1.86, 0.1], [2.05, 0.14], [2.15, 0.08]]], [-0.9, [[1.8, 0.26], [2.1, 0.3], [2.3, 0.2]]], [0.55, [[1.74, 0.28], [2.1, 0.32], [2.32, 0.22]]]], [], s * 1.0);
        b.set(BLACK, 0);
        b.quad([0.556, 1.82, s * 0.78], [0.556, 1.82, s * 1.22], [0.556, 2.26, s * 1.18], [0.556, 2.26, s * 0.82], [0, 2, s]);
    });
    // (no tail lift rocket: the wing engines tilt to hover)
    // chin gun pod: twin-linked machine guns in jackets with flash hiders (MUZZLES.gunship: x 4.55), a sensor ball between
    b.set(GUN, 0);
    b.loft([[2.6, [[0.1, 0.3], [0.26, 0.5], [0.4, 0.4]]], [3.3, [[0.04, 0.44], [0.24, 0.56], [0.44, 0.46]]], [3.8, [[0.1, 0.34], [0.24, 0.46], [0.4, 0.36]]]]);
    for (const z of [0.35, -0.35]) // designer 20 Nov: jacketed machine guns out of the pod (tips x 4.55)
        gunMG(b, 4.55, 0.25, z, 1.1, 1.2, false);
    b.set(STEEL, 0);
    b.cyl(4.0, 0.42, 0, 0.2, 0.2, 0.12, 6, "y", false);
    b.set(GLASS, 0);
    b.ball(4.0, 0.34, 0, 0.2, 0);
    G2(() => g2Gunship(b));
    const m = b.build([0, 0, 0], 0, 0);
    // Frontline: the wing engines tilt (part 22, pitched about the wing spar at x -1.9, y 1.3 by the shader): every triangle
    // wholly in an engine's box (|z| past the wing root, aft of the wing's leading edge)
    const V = exports.VERTEX_FLOATS, inNac = (i) => Math.abs(m.verts[i + 2]) > 2.86 && m.verts[i] < 0.2 && m.verts[i] > -4.4 && m.verts[i + 1] > 0.1 && m.verts[i + 1] < 2.1;
    for (let i = 0; i < m.verts.length; i += 3 * V)
        if (inNac(i) && inNac(i + V) && inNac(i + 2 * V))
            for (let k = 0; k < 3; k++)
                m.verts[i + k * V + 9] = 22;
    return m;
}
/** Graphics pass: the gunship's near detail. */
function g2Gunship(b) {
    b.mirrored((s) => {
        const N = GS_NAC, nz = s * N.z;
        // canopy frame
        b.set(GUN, 0);
        const top = [[0.9, 2.36, 0.28], [1.7, 2.32, 0.27], [2.6, 1.92, 0.22], [3.5, 1.26, 0.12]], mid = [[0.9, 2.2, 0.6], [1.7, 2.16, 0.58], [2.6, 1.78, 0.48], [3.5, 1.18, 0.28]], sill = [[0.9, 1.75, 0.8], [1.7, 1.62, 0.78], [2.6, 1.3, 0.64], [3.5, 0.95, 0.38]];
        for (const L of [top, mid, sill])
            for (let i = 0; i + 1 < L.length; i++)
                rod(b, [L[i][0], L[i][1], s * L[i][2]], [L[i + 1][0], L[i + 1][1], s * L[i + 1][2]], 0.028, 3);
        for (const i of [1, 2])
            rod(b, [sill[i][0], sill[i][1], s * sill[i][2]], [mid[i][0], mid[i][1], s * mid[i][2]], 0.028, 3);
        rod(b, [3.5, 0.95, s * 0.38], [3.5, 1.26, s * 0.12], 0.028, 3);
        // door: frame, the slid-back door leaf with a window, a top rail, sill chevrons, a cabin lamp, the ammunition box
        b.set(GUN, 0);
        const zd = (x, y) => s * (gsZ(x, y) + 0.02);
        rod(b, [-2.2, 1.56, zd(-2.2, 1.56)], [1.0, 1.56, zd(1.0, 1.56)], 0.035, 3);
        rod(b, [-0.6, 0.5, zd(-0.6, 0.5)], [-0.6, 0.88, zd(-0.6, 0.88)], 0.03, 3);
        rod(b, [-0.6, 0.88, zd(-0.6, 0.88)], [-0.6, 1.5, zd(-0.6, 1.5)], 0.03, 3);
        rod(b, [0.95, 0.5, zd(0.95, 0.5)], [0.95, 0.86, zd(0.95, 0.86)], 0.03, 3);
        rod(b, [0.95, 0.86, zd(0.95, 0.86)], [0.95, 1.5, zd(0.95, 1.5)], 0.03, 3);
        b.set(P2, 1);
        for (const Q of gsSide(-2.05, -0.68, 0.55, 1.46, s))
            panel(b, Q, 0.05, 0.04);
        b.set(GLASS, 0);
        for (const Q of gsSide(-1.7, -1.05, 1.02, 1.36, s))
            decal(b, Q, 0.065);
        for (const Q of gsSide(-0.6, 0.95, 0.34, 0.48, s))
            chevrons(b, Q, 6);
        b.set(AMBER, 4);
        for (const Q of gsSide(-0.3, 0.3, 1.38, 1.46, s))
            decal(b, Q, 0.02);
        b.set(OLIVE, 0);
        b.box(0.3, 0.68, s * 1.3, 0.16, 0.14, 0.1);
        b.set(DARK, 0);
        rod(b, [0.36, 0.8, s * 1.32], [0.6, 1.0, s * 1.3], 0.04, 3);
        rod(b, [0.6, 1.08, s * 1.2], [0.7, 1.08, s * 1.2], 0.02, 3); // spade grips
        // cockpit armour, seams, markings, a step
        b.set(P2, 1);
        for (const Q of gsSide(1.3, 2.35, 0.92, 1.3, s))
            panel(b, Q, 0.05, 0.08);
        b.set(GUN, 0);
        bolts(b, [1.4, 1.0, s * (gsZ(1.4, 1.0) + 0.05)], [2.25, 1.0, s * (gsZ(2.25, 1.0) + 0.05)], 4, [0, 0.3, s], 0.04);
        b.set(PANEL, 1);
        for (const x of [-2.5, 1.12, 2.9])
            for (const Q of gsSide(x, x + 0.05, 0.2, x > 2 ? 0.95 : 1.7, s))
                decal(b, Q, 0.014);
        for (const Q of gsSide(-3.0, -2.25, 0.55, 0.86, s))
            markings(b, Q);
        b.set(HAZARD, 0);
        for (const Q of gsSide(2.95, 3.4, 0.7, 0.8, s))
            decal(b, Q, 0.016);
        // intake: lip and grille
        grille(b, [[[0.56, 1.84, s * 0.8], [0.56, 1.84, s * 1.2], [0.56, 2.24, s * 1.16], [0.56, 2.24, s * 0.84]], [0, 2, s]], 3);
        b.set(HAZARD, 0);
        b.loft([[0.38, [[1.735, 0.285], [2.1, 0.325], [2.325, 0.225]]], [0.46, [[1.735, 0.285], [2.1, 0.325], [2.325, 0.225]]]], [], s * 1.0);
        // wing: a team flash on top, a brace, a fence
        b.set([1, 1, 1], 2);
        b.quad([-1.9, 1.565, s * 1.6], [-1.3, 1.585, s * 1.6], [-1.42, 1.48, s * 2.5], [-1.95, 1.465, s * 2.5], [-1.6, 0, s * 2]);
        b.set(DARK, 0);
        rod(b, [-1.7, 0.7, s * 1.25], [-1.7, 1.3, s * 2.1], 0.04, 4);
        // engine: bolt ring and hazard band on the collar, a throat ring, struts on the bell, fuel line, nav beacon
        b.set(HAZARD, 0);
        b.cyl(N.x0 + 0.02, N.y, nz, 0.5, 0.5, 0.14, 10, "x", false);
        b.set(GUN, 0);
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + 0.31;
            b.box(-1.62, N.y + Math.cos(a) * 0.5, nz + Math.sin(a) * 0.5, 0.04, 0.04, 0.04);
        }
        b.set(PANEL, 1);
        b.cyl(-2.0, N.y, nz, 0.525, 0.525, 0.05, 10, "x", false);
        b.set(STEEL, 0);
        b.cyl(N.x0 - 0.68, N.y, nz, 0.6, 0.6, 0.07, 10, "x", false);
        b.set(BLACK, 0);
        b.cyl(N.x1 + 0.6, N.y, nz, 0.16, 0.02, 0.22, 6, "x", false);
        b.set(DARK, 0);
        rod(b, [-2.6, N.y + 0.47, nz], [-1.0, N.y + 0.45, nz], 0.035, 3);
        b.set(s > 0 ? [0.2, 1, 0.3] : RED, 5);
        b.box(-1.25, N.y, nz + s * 0.46, 0.06, 0.05, 0.03);
        b.set(STEEL, 0);
        b.cyl(-1.7, 0.9, nz, 0.26, 0.3, 0.1, 8, "y", false);
        // rocket pod: tube mouths, bands
        b.set(GUN, 0);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            b.disc(-0.89, 0.9 + Math.cos(a) * 0.13, s * 2.1 + Math.sin(a) * 0.13, 0.05, 5, "x", 1);
        }
        b.disc(-0.89, 0.9, s * 2.1, 0.05, 5, "x", 1);
        b.set(HAZARD, 0);
        b.cyl(-1.15, 0.9, s * 2.1, 0.275, 0.275, 0.08, 8, "x", false);
        // fin: team flash, a tip beacon
        const F = [[[-6.45, 1.68, s * 0.2], [-5.4, 1.68, s * 0.2], [-6.35, 2.95, s * 1.02], [-6.9, 2.95, s * 1.02]], [-6.2, 2.3, 0]];
        b.set([1, 1, 1], 2);
        decal(b, qsub(F, 0.15, 0.85, 0.55, 0.75), 0.012);
        b.set(HAZARD, 0);
        decal(b, qsub(F, 0.0, 1.0, 0.92, 1.0), 0.012);
        b.set(s > 0 ? [0.2, 1, 0.3] : RED, 5);
        b.box(-6.62, 3.0, s * 0.985, 0.05, 0.05, 0.04);
        // skid: an upturned toe, cross tubes, a step
        b.set(DARK, 0);
        rod(b, [1.9, -0.18, s * 1.0], [2.3, 0.02, s * 1.0], 0.05, 4);
        rod(b, [1.2, 0.1, s * 0.6], [1.2, -0.14, s * 0.95], 0.04, 3);
        rod(b, [-0.9, 0.1, s * 0.6], [-0.9, -0.14, s * 0.95], 0.04, 3);
        // spine: louvres
        b.set(BLACK, 0);
        for (const x of [-2.6, -2.25, -1.9])
            b.quad([x, 2.02, s * 0.5], [x + 0.2, 2.03, s * 0.505], [x + 0.2, 2.2, s * 0.44], [x, 2.19, s * 0.435], [x, 2, 0]);
    });
    // nose: pitot, sensor eye, gun pod bolts; spine: aerials, a beacon; tail: lamp, the skid shoe; belly lamp
    b.set(GUN, 0);
    rod(b, [4.1, 0.78, 0.1], [4.65, 0.78, 0.1], 0.015, 3);
    b.set([1, 1, 1], 2);
    b.box(4.19, 0.33, 0, 0.02, 0.05, 0.07);
    b.set(BLACK, 0);
    for (const z of [0.35, -0.35])
        b.disc(4.555, 0.25, z, 0.04, 5, "x", 1);
    b.set(P3, 1);
    b.hull([[-0.9, 2.44], [-0.2, 2.44], [-0.55, 2.9], [-0.75, 2.9]], 0.025, 0.02);
    whip(b, -3.4, 2.2, 0, 1.2);
    beacon(b, -1.6, 2.4, 0, RED, 0.07);
    b.set(DARK, 0); // Frontline: no lit tail lamp (read as an engine at the tail)
    b.disc(-6.51, 1.6, 0, 0.07, 5, "x", -1);
    b.disc(2.2, 0.09, 0, 0.12, 6, "y", -1);
    b.set(GUN, 0);
    b.box(-6.35, 0.77, 0, 0.2, 0.03, 0.06);
    // lift rocket: a gimbal ring; cockpit: seat backs showing through the glass are left to the glass colour
    b.set(STEEL, 0);
    b.set(HAZARD, 0);
}
function dropship() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(P1);
    b.loft([
        [-4.0, hsec(0.6, 1.2, 1.9, 0.9, 1.1, 0.9, 0.2)],
        [-3.2, hsec(0.0, 1.0, 2.0, 1.3, 1.45, 1.15, 0.3)],
        [2.4, hsec(0.0, 0.9, 1.85, 1.3, 1.45, 1.1, 0.3)],
        [3.85, hsec(0.4, 0.7, 1.05, 0.6, 0.75, 0.5, 0.12)],
        [4.2, hsec(0.52, 0.68, 0.88, 0.28, 0.36, 0.22, 0.06)],
    ], [2]);
    b.set(GLASS, 0);
    b.loft([[2.35, [[1.2, 1.12], [1.65, 0.95], [1.85, 0.6]]], [3.2, [[0.95, 0.75], [1.2, 0.6], [1.3, 0.3]]]]);
    b.set(PANEL);
    b.quad([-0.3, 2.005, -0.9], [-0.22, 2.005, -0.9], [-0.22, 2.005, 0.9], [-0.3, 2.005, 0.9], [0, 0, 0]);
    b.quad([-4.01, 0.7, -0.7], [-4.01, 0.7, 0.7], [-4.01, 1.75, 0.7], [-4.01, 1.75, -0.7], [0, 1, 0]); // rear ramp outline
    b.mirrored((s) => {
        b.set([0.08, 0.09, 0.09], 0);
        b.quad([-0.7, 0.55, s * 1.46], [0.7, 0.55, s * 1.46], [0.7, 1.55, s * 1.39], [-0.7, 1.55, s * 1.39], [0, 1, 0]); // door opening
        gunTurned(b, () => gunMG(b, 0.55, 1.0, 0, 0.75, 0.85), s * Math.PI / 2, 0.3, s * 1.3); // door gun on its pintle (tip z 1.85)
        b.set(GUN, 0);
        b.box(0.3, 0.86, s * 1.5, 0.03, 0.08, 0.03);
        b.set([1, 1, 1], 2);
        b.box(-1.0, 1.0, s * 1.45, 1.8, 0.12, 0.04); // team stripe
        b.set(DARK, 0);
        b.box(0.2, -0.2, s * 1.0, 1.8, 0.05, 0.06);
        b.box(0.2, -0.05, s * 1.0, 0.05, 0.15, 0.05); // skid
        b.set([1, 1, 1], 2);
        b.disc(3.7, 0.85, s * 0.45, 0.08, 4, "x", 1);
    });
    b.set(P2);
    b.hull([[-1.2, 1.32], [0.2, 1.3], [0.5, 1.38], [0.2, 1.48], [-1.2, 1.46]], 3.3, 3.3); // stub wings (airfoil section)
    b.mirrored((s) => {
        b.set(STEEL, 0);
        b.cyl(-0.4, 1.3, s * 3.4, 0.42, 0.36, 1.0, 8, "y", false);
        b.disc(-0.4, 2.3, s * 3.4, 0.36, 8, "y", 1);
        b.set([1, 1, 1], 3);
        b.disc(-0.4, 1.29, s * 3.4, 0.36, 8, "y", -1);
        // F3: the rotor disc is the blur disc (translucent, by spin) and the hub turns; the far mesh gets three plain blades
        const rr = s > 0 ? 0 : 1;
        b.set(DARK, 0, 14 + rr);
        b.disc(-0.4, 2.45, s * 3.4, 2.4, 14, "y", 1);
        b.disc(-0.4, 2.44, s * 3.4, 2.4, 14, "y", -1); // rotor disc
        b.set(GUN, 0, 10 + rr);
        b.cyl(-0.4, 2.3, s * 3.4, 0.16, 0.12, 0.3, 6, "y", false); // hub
        if (LO)
            for (let i = 0; i < 3; i++) {
                const a = i * 2.094 + (s > 0 ? 0.3 : 1.3);
                b.box(-0.4 + Math.cos(a) * 1.25, 2.47, s * 3.4 + Math.sin(a) * 1.25, Math.abs(Math.cos(a)) * 1.1 + 0.08, 0.025, Math.abs(Math.sin(a)) * 1.1 + 0.08);
            }
        b.set(GUN, 0, 0);
    });
    b.set(GUN, 0);
    b.ball(3.55, 0.25, 0, 0.26, 0);
    gunMinigun(b, 4.5, 0.2, 0, 0.95, 1.0, 3); // chin gun (designer 20 Nov: a rotary gun, not a stick)
    G2(() => g2Mule(b));
    G2(() => g3Mule(b));
    const m = b.build([0, 0, 0], 0, 0);
    m.rotors = [[-0.4, 2.45, 3.4, 1], [-0.4, 2.45, -3.4, -1]]; // F3
    return m;
}
/**
 * Ruling 108 (designer 15 Nov: "transform the bike to a scout"): the Dart Scout, an enclosed low hover scout after
 * Battlezone's Razor. A flat arrowhead hull with chamfered edges, a raised glass canopy over the driver (the light-class
 * driver zone, the long rifle's target), two outboard engine pods with lit thrust nozzles (the boost), team stripes,
 * a twin minigun in the nose and a Shadower missile rail on the spine.
 */
function scout() {
    // designer 20 Nov ("do another pass on the scout, it's pretty rough"): a sleek arrowhead hull lofted through six
    // stations, faired engine nacelles joined by swept strakes, a teardrop canopy, cheek gun housings and the Shadower
    // on a spine rail behind the canopy. Same footprint (x -2.6..3.0, half-width 1.75); minigun muzzles at x 2.95.
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(P1);
    b.loft([
        [-2.45, hsec(0.42, 0.6, 0.88, 0.62, 0.74, 0.56, 0.12)],
        [-1.9, hsec(0.32, 0.58, 1.0, 0.8, 0.94, 0.72, 0.16)],
        [0.6, hsec(0.3, 0.56, 1.02, 0.8, 0.93, 0.68, 0.18)],
        [1.9, hsec(0.34, 0.56, 0.86, 0.6, 0.7, 0.46, 0.12)],
        [2.7, hsec(0.45, 0.58, 0.7, 0.28, 0.34, 0.2, 0.06)],
        [3.05, hsec(0.54, 0.6, 0.64, 0.05, 0.07, 0.04, 0.02)],
    ], [2]);
    // the canopy collar and a teardrop glass canopy over the driver
    b.set(P2);
    b.hull([[-1.0, 0.98], [1.75, 0.9], [1.3, 1.08], [-0.85, 1.12]], 0.5, 0.42);
    b.set(GLASS, 0);
    b.loft([
        [-0.8, [[1.05, 0.3], [1.2, 0.25], [1.27, 0.09]]],
        [0.15, [[1.05, 0.42], [1.38, 0.35], [1.52, 0.13]]],
        [0.95, [[1.03, 0.4], [1.24, 0.3], [1.34, 0.11]]],
        [1.62, [[0.98, 0.18], [1.03, 0.11], [1.05, 0.04]]],
    ]);
    b.mirrored((s) => {
        // engine nacelles: lofted, an intake at the front, a lit nozzle with a petal ring at the back
        b.set(P3);
        b.loft([
            [-2.62, [[0.42, 0.12], [0.52, 0.26], [0.8, 0.26], [0.9, 0.12]]],
            [-2.3, [[0.34, 0.14], [0.46, 0.33], [0.86, 0.33], [0.98, 0.14]]],
            [0.1, [[0.34, 0.14], [0.46, 0.33], [0.86, 0.33], [0.98, 0.14]]],
            [0.6, [[0.4, 0.12], [0.5, 0.29], [0.82, 0.29], [0.92, 0.12]]],
        ], [1], s * 1.38);
        b.set(BLACK, 0);
        b.disc(0.61, 0.66, s * 1.38, 0.24, 8, "x", 1, Math.PI / 8); // intake
        b.set(STEEL, 0);
        b.cyl(-2.9, 0.66, s * 1.38, 0.2, 0.27, 0.3, 8, "x", false, Math.PI / 8); // nozzle petals
        b.set([1, 1, 1], 3);
        b.disc(-2.86, 0.66, s * 1.38, 0.19, 8, "x", -1, Math.PI / 8); // thrust glow (the boost)
        b.disc(-1.55, 0.33, s * 1.38, 0.2, 6, "y", -1);
        b.disc(-0.25, 0.33, s * 1.38, 0.2, 6, "y", -1); // hover plates
        // swept strakes from the hull to the nacelles (thin plates, both faces)
        b.set(P2);
        const st = [[1.1, 0.63, s * 0.78], [-0.4, 0.68, s * 1.12], [-2.05, 0.68, s * 1.12], [-1.95, 0.6, s * 0.78]];
        b.poly(st, [0, -1, s]);
        b.poly(st.map(([x, y, z]) => [x, y - 0.06, z]), [0, 2, s]);
        b.poly([st[0], st[1], [st[1][0], st[1][1] - 0.06, st[1][2]], [st[0][0], st[0][1] - 0.06, st[0][2]]], [0, 0.6, 0]);
        // canted tail fins on the nacelles
        b.set(P2);
        b.hull([[-2.55, 0.95], [-1.55, 0.95], [-2.15, 1.72], [-2.58, 1.74]], 0.05, 0.03, s * 1.4);
        glowStripe(b, -2.1, 0.3, 0.66, s * 1.73, 0.08); // team stripe on the nacelle's outer side
        // cheek gun housings, the minigun barrels run out to the muzzle at x 2.95
        b.set(P3);
        b.hull([[1.0, 0.84], [2.15, 0.82], [2.3, 0.94], [2.1, 1.07], [1.1, 1.08]], 0.12, 0.1, s * 0.36);
        gunMinigun(b, 2.95, 0.95, s * 0.36, 0.95, 0.85, 3); // designer 20 Nov: rotary guns out of the housings
    });
    // the Shadower on a rail on the hull's right shoulder, beside the canopy and ahead of the strake (designer 20 Nov: on
    // the spine it looked like it fired into the cockpit)
    b.set(DARK, 0);
    b.box(0.3, 0.95, 0.62, 0.55, 0.06, 0.07); // launch rail on the hull's right shoulder
    b.set(OLIVE, 0);
    b.cyl(-0.3, 1.09, 0.62, 0.11, 0.11, 1.3, 6, "x");
    b.set(HAZARD, 0);
    b.cyl(1.0, 1.09, 0.62, 0.11, 0.015, 0.24, 6, "x", false); // seeker head
    b.set([1, 1, 1], 3);
    b.disc(-2.47, 0.65, 0, 0.16, 6, "x", -1); // centre thruster
    b.disc(1.1, 0.29, 0, 0.22, 6, "y", -1); // nose hover plate
    b.set([1, 1, 1], 2);
    b.disc(3.0, 0.6, 0, 0.05, 4, "x", 1); // nose light
    G2(() => g2Scout(b));
    return b.build([0, 0, 0], 0.9, 0.12);
}
/**
 * Ruling 108: the Salvo rocket tank after Battlezone's Wolverine: a medium hover hull, a low turret carrying two boxed
 * missile pods on its sides (a 2 x 2 grid of lit tube mouths each; the salvo fires one missile from each pod) and a
 * coaxial minigun under the mantlet.
 */
function rocketTank() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(P1);
    b.loft([
        [-3.4, hsec(0.48, 0.9, 1.38, 1.55, 1.78, 1.55, 0.16)],
        [-3.0, hsec(0.3, 0.9, 1.44, 1.68, 1.9, 1.6, 0.2)],
        [2.5, hsec(0.3, 0.86, 1.42, 1.68, 1.9, 1.55, 0.2)],
        [3.6, hsec(0.58, 0.8, 0.95, 1.25, 1.45, 1.2, 0.06)],
    ], [2]);
    b.set(PANEL);
    b.quad([2.85, 1.36, -1.3], [2.93, 1.34, -1.3], [2.93, 1.34, 1.3], [2.85, 1.36, 1.3], [2.8, 0, 0]);
    b.mirrored((s) => {
        nacelle(b, -3.15, 2.7, s * 1.68, 0.12, 0.64, 0.44, [-1.9, 1.6]);
        skirtPlates(b, -2.7, 2.3, s * 2.13, 0.33, 0.86, 3);
        glowStripe(b, -1.8, 2.0, 1.04, s * 1.84);
        b.set(STEEL, 0);
        b.cyl(-3.7, 0.9, s * 0.95, 0.21, 0.23, 0.34, 6, "x", false);
        b.set([1, 1, 1], 3);
        b.disc(-3.7, 0.9, s * 0.95, 0.17, 6, "x", -1);
        b.set([1, 1, 1], 2);
        b.disc(3.48, 0.84, s * 1.08, 0.1, 4, "x", 1);
    });
    b.set(OLIVE, 0);
    b.box(-2.3, 1.55, 0, 0.6, 0.12, 0.9); // rear stowage
    // turret: a low chamfered block with the cupola, the pods on arms either side
    b.part = 1;
    b.set(P2, 1, 1);
    b.hull([[-1.2, 1.42], [1.1, 1.42], [1.4, 1.8], [1.0, 2.45], [-1.1, 2.45]], 0.85, 0.7);
    b.set([1, 1, 1], 2, 1);
    b.quad([-1.0, 2.46, -0.18], [-0.4, 2.46, -0.18], [-0.4, 2.46, 0.18], [-1.0, 2.46, 0.18], [0, 0, 0]);
    cupola(b, 0.2, 2.45, 0.3, 1);
    b.mirrored((s) => {
        b.set(GUN, 0, 1);
        b.box(0.0, 2.3, s * 0.85, 0.35, 0.12, 0.12); // pod arm
        b.set(P3, 1, 1);
        b.box(0.2, 2.75, s * 1.0, 1.5, 0.42, 0.36); // pod box
        b.set(DARK, 0, 1);
        b.box(1.71, 2.75, s * 1.0, 0.03, 0.4, 0.34); // face plate
        b.set([1, 1, 1], 3, 1);
        for (const dy of [-0.18, 0.18])
            for (const dz of [-0.14, 0.14])
                b.disc(1.75, 2.75 + dy, s * 1.0 + dz, 0.1, 6, "x", 1); // tube mouths
        b.set([1, 1, 1], 2, 1);
        b.box(-0.6, 3.18, s * 1.0, 0.6, 0.02, 0.2); // team strip on the pod top
    });
    b.part = 2;
    gunMinigun(b, 2.55, 2.3, 0, 1.45, 1.05, 3); // coaxial minigun (part 2: kicks on the shot)
    b.part = 0;
    G2(() => g2Salvo(b));
    return b.build([0.2, 1.42, 0], 0.95, 0.12, 0.1);
}
// ---------------------------------------------------------------- ruling 130: the drop pod sentry
/** Drop pod sentry dimensions: petal hinge (x from the centre, y), the head's rise, open angle, head pivot height,
 *  gun tips (x, y, z either side), the rocket pod (centre z, tube mouths x). The sim muzzles (buildings.json
 *  drop-pod-sentry muzzles) are the middle of the guns and of the tube pack. */
exports.DP = { hx: 1.42, hy: 4.3, rise: 1.6, ang: 2.6, pivotY: 4.45, gunTip: 2.25, gunY: 5.0, gunZ: 0.3, podZ: -1.08, tubeX: 0.97 };
const DP_TUBES = [[exports.DP.tubeX, 4.88, -0.9], [exports.DP.tubeX, 5.36, -1.26], [exports.DP.tubeX, 4.88, -1.26], [exports.DP.tubeX, 5.36, -0.9]];
const SCORCH = [0.12, 0.1, 0.09], SCORCH2 = [0.24, 0.2, 0.17], ABLATE = [0.33, 0.24, 0.17];
const R12 = Math.PI / 12;
/** Capsule radius at height y (the 12-sided frustum from y 0.7 to 4.0). */
const dpR = (y) => 2.72 - ((y - 0.7) / 3.3) * 0.67;
/**
 * An orbital drop capsule: a scorched heat-shield base, a team-tinted 12-sided capsule with ablative streaks, four
 * retro-thruster bells between four splayed landing legs, four stabiliser fins, a square hatch whose four petals (parts
 * 18-21) fold back, and a weapon head (part 1; guns part 2) that rises out of it: twin rapid guns and a 4-tube rocket
 * pod on its left. Blinking beacons on the head and the shoulder.
 */
function dropPod() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    // heat shield and capsule
    b.set(SCORCH, 0);
    b.cyl(0, 0, 0, 2.95, 2.82, 0.62, 12, "y", true, R12);
    b.set(ABLATE, 0);
    b.cyl(0, 0.6, 0, 2.86, 2.74, 0.12, 12, "y", false, R12);
    b.set(P2, 1);
    b.cyl(0, 0.7, 0, 2.72, 2.05, 3.3, 12, "y", false, R12);
    b.set(SCORCH2, 0);
    for (let i = 0; i < 12; i++) {
        const h = 0.22 + 0.34 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
        decal(b, fq(12, R12, 2.72, 2.05, 0.7, 3.3, i, 0.0, 1.0, 0, h), 0.012);
    }
    b.set([1, 1, 1], 2);
    b.cyl(0, 3.55, 0, dpR(3.55) + 0.02, dpR(3.7) + 0.02, 0.15, 12, "y", false, R12); // team glow band
    // shoulder deck, hatch rim, the dark well
    b.set(GUN, 0);
    b.disc(0, 4.0, 0, 2.05, 12, "y", 1, R12);
    b.mirrored((s) => { b.box(s * (exports.DP.hx + 0.08), 4.15, 0, 0.08, 0.15, exports.DP.hx + 0.16); b.box(0, 4.15, s * (exports.DP.hx + 0.08), exports.DP.hx, 0.15, 0.08); });
    b.set(BLACK, 0);
    b.quad([-exports.DP.hx, 4.012, -exports.DP.hx], [exports.DP.hx, 4.012, -exports.DP.hx], [exports.DP.hx, 4.012, exports.DP.hx], [-exports.DP.hx, 4.012, exports.DP.hx], [0, 3, 0]);
    // retro thrusters (between the legs), fins above them; legs on the diagonals
    for (let k = 0; k < 4; k++) {
        let m = b.mark();
        b.set(GUN, 0);
        b.box(2.55, 1.25, 0, 0.26, 0.32, 0.3);
        b.set(STEEL, 0);
        b.cyl(2.88, 0.5, 0, 0.44, 0.24, 0.62, 8, "y", false);
        b.set(BLACK, 0);
        b.disc(2.88, 0.52, 0, 0.4, 8, "y", -1);
        b.set([1, 0.55, 0.25], 3);
        b.disc(2.88, 0.56, 0, 0.2, 8, "y", -1);
        b.set(P3, 1);
        b.hull([[2.42, 1.9], [3.3, 2.05], [2.95, 3.3], [2.05, 3.95]], 0.05, 0.05);
        b.rotY(m, k * Math.PI / 2);
        m = b.mark();
        b.set(GUN, 0);
        rod(b, [2.4, 1.75, 0], [4.15, 0.22, 0], 0.17, 6);
        rod(b, [2.72, 0.8, 0], [3.95, 0.3, 0], 0.1, 5);
        b.box(2.42, 1.78, 0, 0.24, 0.24, 0.24);
        b.set(DARK, 0);
        b.cyl(4.18, 0.0, 0, 0.52, 0.42, 0.24, 8, "y", true);
        b.rotY(m, Math.PI / 4 + k * Math.PI / 2);
    }
    // the hatch petals: a square pyramid split into four, each hinged on its rim edge
    for (let k = 0; k < 4; k++) {
        const m = b.mark(), B0 = [exports.DP.hx, exports.DP.hy, -exports.DP.hx], B1 = [exports.DP.hx, exports.DP.hy, exports.DP.hx], A = [0.02, 6.05, 0], M = [0.84, 5.2, 0];
        b.part = 18 + k;
        b.set(P1, 1, 18 + k);
        b.tri(B0, B1, M, [0, 4.3, 0]);
        b.tri(B0, M, A, [0, 4.3, 0]);
        b.tri(M, B1, A, [0, 4.3, 0]);
        const inn = (p) => [p[0] - 0.07, p[1] - 0.06, p[2] * 0.97];
        b.set(GUN, 0, 18 + k);
        b.tri(inn(B0), inn(B1), inn(M), [4, 6.5, 0]);
        b.tri(inn(B0), inn(M), inn(A), [4, 6.5, 0]);
        b.tri(inn(M), inn(B1), inn(A), [4, 6.5, 0]);
        G2(() => g2PodPetal(b, B0, B1, A, 18 + k));
        b.rotY(m, k * Math.PI / 2);
        b.part = 0;
    }
    beacon(b, -1.75, 4.0, 1.0, RED, 0.12, 0);
    // the weapon head (rises out of the hatch): column, ring, armoured head, twin guns, rocket pod
    b.part = 1;
    b.set(STEEL, 0, 1);
    b.cyl(0, 2.7, 0, 0.55, 0.5, 1.8, 8, "y", false);
    b.set(GUN, 0, 1);
    b.cyl(0, 4.35, 0, 0.95, 0.9, 0.15, 10, "y", true);
    b.set(P2, 1, 1);
    b.hull([[-1.0, 4.5], [1.05, 4.5], [1.3, 4.95], [1.05, 5.55], [-0.85, 5.6], [-1.1, 5.1]], 0.75, 0.62);
    b.set(DARK, 0, 1);
    b.box(1.32, exports.DP.gunY, 0, 0.12, 0.3, 0.55);
    // designer 21 Nov: a cannon on the left of the head (it replaces the rocket pod): breech housing, barrel, muzzle brake
    b.set(STEEL, 0, 1);
    b.box(0.15, 5.12, exports.DP.podZ, 0.75, 0.32, 0.26);
    b.set(GUN, 0, 2);
    b.cyl(0.9, 5.12, exports.DP.podZ, 0.15, 0.13, 1.85, 12, "x", false);
    b.set(DARK, 0, 2);
    b.cyl(1.0, 5.12, exports.DP.podZ, 0.2, 0.2, 0.3, 12, "x", false);
    b.box(2.85, 5.12, exports.DP.podZ, 0.12, 0.2, 0.2);
    b.set([1, 1, 1], 2, 1);
    b.box(-0.2, 5.45, exports.DP.podZ, 0.55, 0.015, 0.2); // team strip on the housing
    beacon(b, -0.62, 5.58, 0.32, AMBER, 0.11, 1);
    b.set(GUN, 0, 2);
    b.mirrored((s) => { b.cyl(1.3, exports.DP.gunY, s * exports.DP.gunZ, 0.1, 0.09, 0.8, 6, "x", false); b.set(DARK, 0, 2); b.cyl(2.05, exports.DP.gunY, s * exports.DP.gunZ, 0.14, 0.14, 0.2, 6, "x"); b.set(GUN, 0, 2); });
    G2(() => g2DropPod(b));
    b.part = 0;
    const m = b.build([0, exports.DP.pivotY, 0], 0, 0, 0.25);
    m.pod = [exports.DP.hx, exports.DP.hy, exports.DP.rise, exports.DP.ang];
    return m;
}
// ---------------------------------------------------------------- ruling 132 (FB1): forward base defences
/** Forward base turret: petal hinge (half size, height), the head's rise and the petals' open angle, head pivot, gun tip / height / spacing (buildings.json fb-turret muzzle [tip, y, 0]). */
exports.FBT = { hx: 1.45, hy: 2.8, rise: 1.5, ang: 2.5, pivotY: 3.4, gunTip: 2.35, gunY: 3.95, gunZ: 0.3 };
/**
 * A forward base's fold-out turret: a low octagonal armoured casing on a footing with four outrigger feet, hazard
 * bands and a team glow band; a square roof hatch of four petals (parts 18-21) that fold back, and a gun head (part 1,
 * guns part 2) that rises out of it: an armoured head with twin autocannon (the Gun Tower's weapon), a sensor block
 * and a beacon. Uses the drop pod's hatch shader (uPod).
 */
function fbTurret() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    const R8 = Math.PI / 8;
    b.set(CON2, 0);
    b.cyl(0, -0.6, 0, 3.0, 3.0, 1.0, 8, "y", false, R8);
    b.cyl(0, 0.4, 0, 3.0, 2.7, 0.2, 8, "y", false, R8);
    b.set(P2, 1);
    b.cyl(0, 0.6, 0, 2.6, 2.25, 2.2, 8, "y", false, R8);
    b.set(DARK, 0);
    b.cyl(0, 1.25, 0, 2.53, 2.5, 0.12, 8, "y", false, R8);
    b.set([1, 1, 1], 2);
    b.cyl(0, 2.2, 0, 2.33, 2.3, 0.14, 8, "y", false, R8); // team glow band
    b.set(GUN, 0);
    b.disc(0, 2.8, 0, 2.25, 8, "y", 1, R8);
    b.mirrored((s) => { b.box(s * (exports.FBT.hx + 0.07), 2.9, 0, 0.07, 0.12, exports.FBT.hx + 0.14); b.box(0, 2.9, s * (exports.FBT.hx + 0.07), exports.FBT.hx, 0.12, 0.07); });
    b.set(BLACK, 0);
    b.quad([-exports.FBT.hx, 2.812, -exports.FBT.hx], [exports.FBT.hx, 2.812, -exports.FBT.hx], [exports.FBT.hx, 2.812, exports.FBT.hx], [-exports.FBT.hx, 2.812, exports.FBT.hx], [0, 2, 0]);
    // outrigger feet on the diagonals (folded out with the base), hazard bands between them
    for (let k = 0; k < 4; k++) {
        const m = b.mark();
        b.set(GUN, 0);
        rod(b, [2.2, 1.2, 0], [3.55, 0.2, 0], 0.14, 6);
        b.box(2.25, 1.2, 0, 0.22, 0.22, 0.22);
        b.set(DARK, 0);
        b.cyl(3.6, 0.0, 0, 0.45, 0.38, 0.22, 8, "y", true);
        b.rotY(m, Math.PI / 4 + k * Math.PI / 2);
        const h = b.mark();
        b.set(HAZARD, 0);
        b.box(2.47, 0.95, 0, 0.04, 0.22, 0.55);
        b.rotY(h, k * Math.PI / 2);
    }
    // the roof hatch: a low square pyramid split into four petals, each hinged on its rim edge
    for (let k = 0; k < 4; k++) {
        const m = b.mark(), B0 = [exports.FBT.hx, exports.FBT.hy, -exports.FBT.hx], B1 = [exports.FBT.hx, exports.FBT.hy, exports.FBT.hx], A = [0.02, exports.FBT.hy + 1.2, 0], M = [0.75, exports.FBT.hy + 0.72, 0];
        b.part = 18 + k;
        b.set(P1, 1, 18 + k);
        b.tri(B0, B1, M, [0, exports.FBT.hy, 0]);
        b.tri(B0, M, A, [0, exports.FBT.hy, 0]);
        b.tri(M, B1, A, [0, exports.FBT.hy, 0]);
        const inn = (p) => [p[0] - 0.06, p[1] - 0.05, p[2] * 0.97];
        b.set(GUN, 0, 18 + k);
        b.tri(inn(B0), inn(B1), inn(M), [4, 6, 0]);
        b.tri(inn(B0), inn(M), inn(A), [4, 6, 0]);
        b.tri(inn(M), inn(B1), inn(A), [4, 6, 0]);
        G2(() => { b.set(HAZARD, 0, 18 + k); b.quad([exports.FBT.hx + 0.01, exports.FBT.hy + 0.02, -exports.FBT.hx * 0.9], [exports.FBT.hx + 0.01, exports.FBT.hy + 0.02, exports.FBT.hx * 0.9], [exports.FBT.hx - 0.2, exports.FBT.hy + 0.17, exports.FBT.hx * 0.75], [exports.FBT.hx - 0.2, exports.FBT.hy + 0.17, -exports.FBT.hx * 0.75], [0, exports.FBT.hy - 1, 0]); });
        b.rotY(m, k * Math.PI / 2);
        b.part = 0;
    }
    beacon(b, -1.6, 2.8, 1.05, AMBER, 0.1, 0);
    // the gun head (rises out of the hatch): column, ring, armoured head, twin autocannon
    b.part = 1;
    b.set(STEEL, 0, 1);
    b.cyl(0, 1.5, 0, 0.45, 0.42, 1.6, 8, "y", false);
    b.set(GUN, 0, 1);
    b.cyl(0, 3.05, 0, 0.85, 0.8, 0.14, 10, "y", true);
    b.set(P2, 1, 1);
    b.hull([[-0.95, 3.2], [0.95, 3.2], [1.2, 3.65], [0.95, 4.45], [-0.8, 4.5], [-1.05, 3.85]], 0.72, 0.6);
    b.set(DARK, 0, 1);
    b.box(1.2, exports.FBT.gunY, 0, 0.1, 0.28, 0.5); // mantlet
    b.set(GLASS, 0, 1);
    b.box(0.35, 4.56, -0.38, 0.25, 0.1, 0.16); // sensor block
    b.set([1, 1, 1], 2, 1);
    b.quad([-1.06, 3.65, -0.5], [-1.06, 3.65, 0.5], [-1.06, 4.05, 0.5], [-1.06, 4.05, -0.5], [0, 3.85, 0]); // team plate
    beacon(b, -0.55, 4.5, 0.32, RED, 0.09, 1);
    // designer 21 Nov: a real cannon in the middle (recoil sleeve, banded barrel, ported brake) and a machine gun on a
    // pod either side (receiver, perforated jacket, barrel, flash hider, ammo can), like the Gun Tower
    b.set(DARK, 0, 2);
    b.cyl(1.15, exports.FBT.gunY, 0, 0.24, 0.24, 0.45, 12, "x", false); // recoil sleeve
    b.set(GUN, 0, 2);
    b.cyl(1.55, exports.FBT.gunY, 0, 0.16, 0.13, 2.3, 12, "x", false); // barrel
    b.set(DARK, 0, 2);
    for (const x of [2.3, 3.0])
        b.cyl(x, exports.FBT.gunY, 0, 0.175, 0.175, 0.1, 12, "x", false); // bands
    b.box(3.95, exports.FBT.gunY, 0, 0.14, 0.23, 0.23); // muzzle brake
    b.set([0.08, 0.08, 0.08], 0, 2);
    b.mirrored((sd) => b.box(3.95, exports.FBT.gunY, sd * 0.235, 0.08, 0.1, 0.01));
    for (const sd of [-1, 1]) {
        const z = sd * 0.88, y = exports.FBT.gunY - 0.12;
        b.set(P2, 1, 1);
        b.box(0.55, y, sd * 0.78, 0.35, 0.16, 0.14); // pod off the head
        b.set(DARK, 0, 2);
        b.box(1.0, y, z, 0.22, 0.12, 0.1); // receiver
        b.cyl(1.2, y, z, 0.085, 0.085, 0.8, 8, "x", false); // perforated jacket
        b.set([0.06, 0.06, 0.06], 0, 2);
        for (let i = 0; i < 4; i++)
            b.box(1.32 + i * 0.17, y + 0.08, z, 0.035, 0.01, 0.04);
        b.set(GUN, 0, 2);
        b.cyl(2.0, y, z, 0.045, 0.045, 0.62, 6, "x", false); // barrel
        b.set(DARK, 0, 2);
        b.cyl(2.6, y, z, 0.065, 0.055, 0.12, 6, "x"); // flash hider
        b.set(OLIVE, 0, 1);
        b.box(0.75, y - 0.2, z, 0.14, 0.1, 0.09); // ammo can
    }
    b.part = 0;
    const m = b.build([0, exports.FBT.pivotY, 0], 0, 0, 0.3);
    m.pod = [exports.FBT.hx, exports.FBT.hy, exports.FBT.rise, exports.FBT.ang];
    return m;
}
/** Barricade plate hinge (x, y) and fold angle: the plate (part 18) swings up from lying flat outward. */
exports.FBW = { hx: 0.32, hy: 0.35, ang: Math.PI / 2 };
/**
 * A forward base's fold-up barricade segment (14 m, facing +x outward): a steel sled rail on the ground with hinge
 * knuckles, and one armour plate (part 18, the drop pod's petal shader) that swings up from lying flat in front:
 * chamfered top, vertical ribs and two struts behind, a hazard band, firing slits and a team stripe.
 */
function fbWall() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    b.set(STEEL, 0);
    b.hull([[-0.9, -0.3], [0.55, -0.3], [0.45, 0.32], [-0.8, 0.32]], 6.9, 6.9); // sled rail
    b.set(GUN, 0);
    for (const z of [-6, -3, 0, 3, 6])
        b.cyl(exports.FBW.hx, exports.FBW.hy, z - 0.35, 0.16, 0.16, 0.7, 6, "z", true); // hinge knuckles
    b.set(HAZARD, 0);
    b.mirrored((s) => b.box(-0.6, 0.33, s * 6.7, 0.25, 0.02, 0.2));
    b.part = 18;
    b.set(P2, 1, 18);
    b.hull([[-0.12, 0.35], [0.32, 0.35], [0.32, 2.75], [0.12, 3.05], [-0.12, 2.9]], 6.85, 6.75);
    b.set(DARK, 0, 18);
    for (const z of [-4.6, -2.3, 0, 2.3, 4.6])
        b.box(0.33, 1.7, z, 0.02, 1.25, 0.04); // plate joints
    b.set(BLACK, 0, 18);
    for (const z of [-3.45, 1.15, 5.75])
        b.box(0.33, 2.3, z - 0.6, 0.02, 0.07, 0.4); // firing slits
    b.set(HAZARD, 0, 18);
    b.box(0.33, 0.62, 0, 0.015, 0.14, 6.8);
    b.set([1, 1, 1], 2, 18);
    b.box(0.2, 2.93, 0, 0.1, 0.03, 6.0); // team stripe on the top edge
    b.set(GUN, 0, 18);
    for (const z of [-5.2, -1.7, 1.7, 5.2])
        b.box(-0.2, 1.6, z, 0.1, 1.2, 0.08); // ribs behind
    G2(() => { b.set(GUN, 0, 18); for (const z of [-3.5, 3.5])
        rod(b, [-0.15, 2.4, z], [-1.3, 0.35, z], 0.07, 5); });
    b.part = 0;
    const m = b.build([0, 0, 0], 0, 0);
    m.pod = [exports.FBW.hx, exports.FBW.hy, 0, exports.FBW.ang];
    return m;
}
/** A petal's outer face detail: a hazard band along the hinge, a team panel, bolts along the hinge, an inner rib. */
function g2PodPetal(b, B0, B1, A, part) {
    const T = [[vlerp(B0, A, 0.05), vlerp(B1, A, 0.05), vlerp(B1, A, 0.2), vlerp(B0, A, 0.2)], [0, 4.3, 0]];
    b.part = part;
    chevrons(b, T, 6);
    b.set(P3, 1, part);
    panel(b, [[vlerp(B0, A, 0.32), vlerp(B1, A, 0.32), vlerp(vlerp(B1, A, 0.62), vlerp(B0, A, 0.62), 0.15), vlerp(vlerp(B0, A, 0.62), vlerp(B1, A, 0.62), 0.15)], [0, 4.3, 0]], 0.04, 0.1);
    b.set(DARK, 0, part);
    bolts(b, vlerp(B0, B1, 0.08), vlerp(B1, B0, 0.08), 7, [1, 0.6, 0], 0.05);
    b.set(STEEL, 0, part);
    rod(b, [B0[0] - 0.12, B0[1] + 0.02, 0], [A[0] + 0.1, A[1] - 0.12, 0], 0.05, 3);
}
/** Drop pod near detail: scorch streaks, team panels, warning stripes, bolts, vents, hoses, antenna, rotary barrels. */
function g2DropPod(b) {
    const part = b.part;
    b.part = 0;
    for (let i = 0; i < 12; i++) {
        const u = 0.2 + 0.6 * (((Math.sin(i * 7.31) * 9173.1) % 1 + 1) % 1);
        b.set(SCORCH, 0);
        decal(b, fq(12, R12, 2.72, 2.05, 0.7, 3.3, i, u, u + 0.08, 0, 0.55 + 0.25 * (i % 3) / 2), 0.02);
        if (i % 2 === 0) {
            b.set(P1, 1);
            panel(b, fq(12, R12, 2.72, 2.05, 0.7, 3.3, i, 0.12, 0.88, 0.5, 0.78), 0.05, 0.12);
        }
        else
            grille(b, fq(12, R12, 2.72, 2.05, 0.7, 3.3, i, 0.25, 0.75, 0.55, 0.72), 3);
        b.set(DARK, 0);
        bolts(b, fq(12, R12, 2.72, 2.05, 0.7, 3.3, i, 0, 1, 0.9, 0.9)[0][0], fq(12, R12, 2.72, 2.05, 0.7, 3.3, i, 0, 1, 0.9, 0.9)[0][1], 3, [Math.cos(i * Math.PI / 6 + R12 + Math.PI / 12), 0.25, Math.sin(i * Math.PI / 6 + R12 + Math.PI / 12)], 0.045);
    }
    b.mirrored((s) => { chevrons(b, qx(s * (exports.DP.hx + 0.165), -exports.DP.hx, exports.DP.hx, 4.03, 4.27, s), 8); chevrons(b, qz(s * (exports.DP.hx + 0.165), -exports.DP.hx, exports.DP.hx, 4.03, 4.27, s), 8); });
    for (let k = 0; k < 4; k++) {
        const m = b.mark();
        b.set(HAZARD, 0);
        b.box(2.42, 1.78, 0, 0.25, 0.08, 0.25);
        b.set(STEEL, 0);
        rod(b, [2.6, 1.45, 0.16], [3.5, 0.62, 0.16], 0.05, 4);
        rod(b, [2.6, 1.45, -0.16], [3.5, 0.62, -0.16], 0.05, 4); // leg rams
        b.set(DARK, 0);
        b.cyl(4.18, 0.24, 0, 0.2, 0.16, 0.18, 6, "y", false);
        b.rotY(m, Math.PI / 4 + k * Math.PI / 2);
        const n = b.mark();
        b.set(DARK, 0);
        b.cyl(2.88, 1.1, 0, 0.27, 0.27, 0.08, 8, "y", false); // nozzle collar
        b.set(RUBBER, 0);
        rod(b, [2.4, 1.6, 0.2], [2.8, 1.12, 0.22], 0.045, 4); // fuel line
        b.set(MARK, 0);
        decal(b, [[[2.42, 2.4, 0.052], [2.95, 2.45, 0.052], [2.8, 3.0, 0.052], [2.3, 3.0, 0.052]], [2.6, 2.7, -1]], 0.01); // fin marking
        b.rotY(n, k * Math.PI / 2);
    }
    whip(b, 1.6, 4.0, -1.55, 1.9, RED, 0);
    // head: panels, vents, ammo feeds, sensor, rotary barrel clusters, rocket pod frame
    b.part = 1;
    b.mirrored((s) => { b.set(P3, 1, 1); panel(b, [[[-0.7, 4.62, s * 0.752], [0.9, 4.62, s * 0.752], [0.9, 5.35, s * 0.66], [-0.7, 5.35, s * 0.66]], [0, 5, 0]], 0.05, 0.1); });
    grille(b, qx(-1.1, -0.45, 0.45, 4.7, 5.05, -1), 3);
    b.set(OLIVE, 0, 1);
    b.box(-0.55, 5.25, 0.9, 0.35, 0.25, 0.15); // ammo box
    b.set(RUBBER, 0, 1);
    rod(b, [-0.25, 5.25, 0.85], [0.9, 5.0, 0.5], 0.05, 4);
    sensorDome(b, 0.55, 5.57, 0.32, 0.2, 1);
    b.set(GUN, 0, 1);
    b.box(0.15, 5.12, exports.DP.podZ, 0.82, 0.08, 0.32);
    b.box(-0.62, 5.12, exports.DP.podZ, 0.04, 0.52, 0.32);
    chevrons(b, qz(exports.DP.podZ - 0.302, -0.55, 0.85, 4.7, 4.9, -1), 5);
    b.set([1, 1, 1], 2, 1);
    b.box(-1.11, 5.3, 0, 0.012, 0.08, 0.4);
    b.part = 2;
    b.mirrored((s) => { b.set(DARK, 0, 2); for (let j = 0; j < 3; j++) {
        const a = (j / 3) * Math.PI * 2;
        b.cyl(1.35, exports.DP.gunY + Math.cos(a) * 0.07, s * exports.DP.gunZ + Math.sin(a) * 0.07, 0.035, 0.035, 0.75, 4, "x", false);
    } b.set(STEEL, 0, 2); b.cyl(1.5, exports.DP.gunY, s * exports.DP.gunZ, 0.13, 0.13, 0.06, 6, "x", false); });
    b.part = part;
}
const vadd = (a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
const vsub = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
const vcross = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const vnorm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vlerp = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
const qc = (q) => vmul(q.reduce((s, p) => vadd(s, p), [0, 0, 0]), 1 / q.length);
/** Unit normal of a face quad, pointing away from its inside point. */
function qn(Q) { let n = vnorm(vcross(vsub(Q[0][1], Q[0][0]), vsub(Q[0][3], Q[0][0]))); if (vdot(n, vsub(qc(Q[0]), Q[1])) < 0)
    n = vmul(n, -1); return n; }
/** Point (u, v) of a quad (bilinear). */
const qp = (q, u, v) => vlerp(vlerp(q[0], q[1], u), vlerp(q[3], q[2], u), v);
/** Sub-rectangle of a face quad. */
const qsub = (Q, u0, u1, v0, v1) => [[qp(Q[0], u0, v0), qp(Q[0], u1, v0), qp(Q[0], u1, v1), qp(Q[0], u0, v1)], Q[1]];
/** Axis-aligned face quads: a wall facing ±x at x = k, a wall facing ±z at z = k, a floor / roof facing ±y at y = k. */
const qx = (k, z0, z1, y0, y1, s = 1) => [[[k, y0, z0], [k, y0, z1], [k, y1, z1], [k, y1, z0]], [k - s * 2, (y0 + y1) / 2, (z0 + z1) / 2]];
const qz = (k, x0, x1, y0, y1, s = 1) => [[[x0, y0, k], [x1, y0, k], [x1, y1, k], [x0, y1, k]], [(x0 + x1) / 2, (y0 + y1) / 2, k - s * 2]];
const qy = (k, x0, x1, z0, z1, s = 1) => [[[x0, k, z0], [x1, k, z0], [x1, k, z1], [x0, k, z1]], [(x0 + x1) / 2, k - s * 2, (z0 + z1) / 2]];
/** A rectangle (u0..u1 across, v0..v1 up) on face i of an n-sided frustum built by cyl(cx, y0, cz, r0, r1, h, n, "y", ?, rot). */
function fq(n, rot, r0, r1, y0, h, i, u0, u1, v0, v1, cx = 0, cz = 0) {
    const P = (a, v) => { const r = r0 + (r1 - r0) * v; return [cx + Math.cos(a) * r, y0 + v * h, cz + Math.sin(a) * r]; };
    const a0 = (i / n) * Math.PI * 2 + rot, a1 = ((i + 1) / n) * Math.PI * 2 + rot;
    const F = (u, v) => vlerp(P(a0, v), P(a1, v), u);
    return [[F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)], [cx, y0 + h * (v0 + v1) / 2, cz]];
}
const BLACK = [0.07, 0.07, 0.07], MARK = [0.8, 0.8, 0.74], LAMP = [1.0, 0.9, 0.68], RED = [1.0, 0.16, 0.1], AMBER = [1.0, 0.62, 0.12];
const WARMWIN = [1.0, 0.78, 0.42], COOLWIN = [0.55, 0.9, 1.0], SOLAR = [0.1, 0.16, 0.3];
/** A flat decal on a face (lifted a little off it). */
function decal(b, Q, lift = 0.015) { const n = qn(Q), o = vmul(n, lift); b.poly(Q[0].map((p) => vadd(p, o)), vsub(qc(Q[0]), n)); }
/** A raised, bevelled plate on a face (armour block, door, hatch, access panel): 10 triangles. */
function panel(b, Q, th = 0.05, bev = 0.14) {
    const n = qn(Q), c = qc(Q[0]), ins = vsub(c, n);
    const o = Q[0].map((p) => vadd(vadd(c, vmul(vsub(p, c), 1 - bev)), vmul(n, th)));
    b.poly(o, ins);
    for (let i = 0; i < 4; i++)
        b.poly([Q[0][i], Q[0][(i + 1) % 4], o[(i + 1) % 4], o[i]], ins);
}
/** A louvred grille on a face: a black backing and n slats tilted like louvres. */
function grille(b, Q, n, col = [0.34, 0.36, 0.36]) {
    const part = b.part;
    b.set(BLACK, 0, part);
    decal(b, Q, 0.012);
    const nn = qn(Q), ins = vsub(qc(Q[0]), nn);
    b.set(col, 0, part);
    for (let i = 0; i < n; i++) {
        const t0 = (i + 0.12) / n, t1 = (i + 0.62) / n, q = Q[0];
        b.poly([vadd(qp(q, 0.04, t0), vmul(nn, 0.02)), vadd(qp(q, 0.96, t0), vmul(nn, 0.02)), vadd(qp(q, 0.96, t1), vmul(nn, 0.06)), vadd(qp(q, 0.04, t1), vmul(nn, 0.06))], ins);
    }
}
/** Hazard chevrons on a face: a yellow backing with n leaning black bars. */
function chevrons(b, Q, n) {
    const part = b.part;
    b.set(HAZARD, 0, part);
    decal(b, Q, 0.012);
    b.set(BLACK, 0, part);
    for (let i = 0; i < n; i++) {
        const u0 = (i + 0.05) / n, u1 = (i + 0.5) / n, sh = 0.45 / n, q = Q[0];
        decal(b, [[qp(q, u0, 0), qp(q, u1, 0), qp(q, Math.min(1, u1 + sh), 1), qp(q, Math.min(1, u0 + sh), 1)], Q[1]], 0.022);
    }
}
/** A line on a surface from a to c (panel line, strap, marking): width w, the surface normal given. */
function seam(b, a, c, nrm, w = 0.05, lift = 0.014) {
    const n = vnorm(nrm), s = vmul(vnorm(vcross(vsub(c, a), n)), w / 2), o = vmul(n, lift);
    b.poly([vadd(vsub(a, s), o), vadd(vsub(c, s), o), vadd(vadd(c, s), o), vadd(vadd(a, s), o)], vsub(vlerp(a, c, 0.5), n));
}
/** n bolt heads (small diamonds) along a to c on a surface. */
function bolts(b, a, c, n, nrm, s = 0.05) {
    const nn = vnorm(nrm), d = vmul(vnorm(vsub(c, a)), s), e = vmul(vnorm(vcross(vsub(c, a), nn)), s), o = vmul(nn, 0.02);
    for (let i = 0; i < n; i++) {
        const p = vadd(vlerp(a, c, (i + 0.5) / n), o);
        b.poly([vsub(p, d), vsub(p, e), vadd(p, d), vadd(p, e)], vsub(p, nn));
    }
}
/** A thin tube between two points (strut, piston, cable, handrail): n sides, no caps. */
function rod(b, a, c, r = 0.04, n = 3) {
    const d = vsub(c, a), L = Math.hypot(d[0], d[1], d[2]);
    if (L < 1e-6)
        return;
    const ax = vmul(d, 1 / L), up = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], u = vnorm(vcross(ax, up)), v = vcross(ax, u), mid = vlerp(a, c, 0.5);
    const ring = (p) => { const o = []; for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        o.push(vadd(p, vadd(vmul(u, Math.cos(t) * r), vmul(v, Math.sin(t) * r))));
    } return o; };
    const A = ring(a), C = ring(c);
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        b.poly([A[i], A[j], C[j], C[i]], mid);
    }
}
/** A whip antenna on a small base, with a blinking tip beacon (material 5) unless `tip` is null. */
function whip(b, x, y, z, h, tip = RED, part = b.part) {
    b.set(GUN, 0, part);
    b.cyl(x, y, z, 0.07, 0.05, 0.14, 5, "y", false);
    b.set(DARK, 0, part);
    rod(b, [x, y + 0.14, z], [x, y + h, z], 0.018, 3);
    if (tip) {
        b.set(tip, 5, part);
        b.box(x, y + h, z, 0.045, 0.045, 0.045);
    }
}
/** A hatch lid on a deck (facing up): a lid, a hinge and a grab handle. */
function hatch(b, x, y, z, r, part = b.part, col = GUN) {
    b.set(col, col === GUN ? 0 : 1, part);
    b.cyl(x, y, z, r, r * 0.9, 0.05, 6, "y", false);
    b.disc(x, y + 0.05, z, r * 0.9, 6, "y", 1);
    b.set(DARK, 0, part);
    b.box(x - r * 0.85, y + 0.05, z, r * 0.12, 0.04, r * 0.4);
    rod(b, [x + r * 0.35, y + 0.09, z - r * 0.3], [x + r * 0.35, y + 0.09, z + r * 0.3], 0.02, 3);
}
/** A sensor dome: a steel collar, a glass dome and a small lit eye. */
function sensorDome(b, x, y, z, r, part = b.part) {
    b.set(STEEL, 0, part);
    b.cyl(x, y, z, r * 1.1, r, r * 0.35, 6, "y", false);
    b.set(GLASS, 0, part);
    b.ball(x, y + r * 0.35, z, r, 0, 0.8);
    b.set([1, 1, 1], 2, part);
    b.box(x + r * 0.8, y + r * 0.5, z, r * 0.12, r * 0.12, r * 0.2);
}
/** A headlamp looking along +x (dir 1) or -x: a dark housing with a lit lens (material 4). */
function lampX(b, x, y, z, r, dir = 1, col = LAMP, part = b.part) {
    b.set(DARK, 0, part);
    b.box(x - dir * r * 0.6, y, z, r * 0.6, r * 1.15, r * 1.15);
    b.set(col, 4, part);
    b.disc(x + dir * 0.012, y, z, r, 6, "x", dir);
}
/** A rear thruster looking along -x: a steel bell with a dark throat ring and a lit core. */
function thruster(b, x, y, z, r, len, part = b.part) {
    b.set(STEEL, 0, part);
    b.cyl(x - len, y, z, r * 1.15, r * 0.8, len, 8, "x", false);
    b.set(DARK, 0, part);
    b.cyl(x - len - 0.02, y, z, r * 1.22, r * 1.15, 0.1, 8, "x", false);
    b.set(BLACK, 0, part);
    b.cyl(x - len, y, z, r * 1.05, r * 0.5, len * 0.6, 8, "x", false);
    b.set([1, 1, 1], 3, part);
    b.disc(x - len * 0.45, y, z, r * 0.62, 8, "x", -1);
}
/** A rooftop / deck fan: a round housing, a dark well, four blades over a faint glow and a hub. */
function fan(b, x, y, z, r, h = 0.3, part = b.part) {
    b.set(STEEL, 0, part);
    b.cyl(x, y, z, r * 1.08, r, h, 8, "y", false);
    b.set(BLACK, 0, part);
    b.disc(x, y + h * 0.5, z, r, 8, "y", 1);
    b.set([0.9, 0.55, 0.25], 4, part);
    b.disc(x, y + h * 0.52, z, r * 0.45, 6, "y", 1);
    b.set(GUN, 0, part);
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4, c = Math.cos(a), s = Math.sin(a), w = r * 0.26;
        b.poly([[x + c * r * 0.15 - s * w * 0.4, y + h * 0.8, z + s * r * 0.15 + c * w * 0.4], [x + c * r * 0.92 - s * w, y + h * 0.92, z + s * r * 0.92 + c * w], [x + c * r * 0.92 + s * w, y + h * 0.7, z + s * r * 0.92 - c * w], [x + c * r * 0.15 + s * w * 0.4, y + h * 0.72, z + s * r * 0.15 - c * w * 0.4]], [x, y - 1, z]);
    }
    b.set(DARK, 0, part);
    b.cyl(x, y + h * 0.6, z, r * 0.18, r * 0.12, h * 0.45, 5, "y", true);
}
/** Rooftop machinery: a steel cabinet with a fan on top and a grille on one side. */
function acUnit(b, x, y, z, hx, hz, hy = 0.4) {
    b.set(STEEL, 0);
    b.box(x, y + hy, z, hx, hy, hz);
    fan(b, x, y + hy * 2, z, Math.min(hx, hz) * 0.72, 0.14);
    grille(b, qz(z + hz, x - hx * 0.8, x + hx * 0.8, y + hy * 0.35, y + hy * 1.7, 1), 4);
    b.set(HAZARD, 0);
    b.box(x, y + 0.05, z, hx + 0.03, 0.05, hz + 0.03);
}
/** A window on a wall face: a dark frame with glass, or a lit pane (material 4) when `lit` is given. */
function win(b, Q, lit = null) {
    b.set(GUN, 0);
    panel(b, Q, 0.07, 0.03);
    if (lit)
        b.set(lit, 4);
    else
        b.set(GLASS, 0);
    decal(b, qsub(Q, 0.1, 0.9, 0.12, 0.88), 0.085);
}
/** n windows side by side across a face strip; `lit(i)` gives the lit colour of pane i (or null for dark glass). */
function winRow(b, Q, n, lit = () => null, fill = 0.7) {
    for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, w = (fill / n) / 2;
        win(b, qsub(Q, u - w, u + w, 0, 1), lit(i));
    }
}
/** A sign board on a wall face: a dark board, a team-lit plate and dark glyph bars (lettering at a distance). */
function sign(b, Q, glyphs = 4) {
    b.set(DARK, 0);
    panel(b, Q, 0.1, 0.02);
    b.set([1, 1, 1], 2);
    decal(b, qsub(Q, 0.06, 0.94, 0.14, 0.86), 0.115);
    b.set(BLACK, 0);
    for (let i = 0; i < glyphs; i++) {
        const u = 0.14 + (i / glyphs) * 0.74, w = (0.74 / glyphs) * (i % 3 === 1 ? 0.35 : 0.62);
        decal(b, qsub(Q, u, u + w, 0.3, i % 2 ? 0.7 : 0.58), 0.125);
    }
}
/** A personnel door on a wall face: a dark leaf in a steel frame with a lit lamp over it and a handle. */
function door(b, Q) {
    b.set(STEEL, 0);
    panel(b, Q, 0.08, 0.02);
    b.set([0.1, 0.11, 0.11], 0);
    decal(b, qsub(Q, 0.12, 0.88, 0.0, 0.92), 0.095);
    b.set(GUN, 0);
    decal(b, qsub(Q, 0.7, 0.8, 0.42, 0.5), 0.105);
    b.set(HAZARD, 0);
    decal(b, qsub(Q, 0.12, 0.88, 0.0, 0.06), 0.105);
    b.set(LAMP, 4);
    decal(b, qsub(Q, 0.3, 0.7, 1.04, 1.14), 0.06);
}
/** A handrail along a polyline: posts at each point and a top and a mid rail. */
function railing(b, pts, h = 1.0, closed = false, col = GUN, mid = true) {
    b.set(col, 0);
    for (const p of pts)
        rod(b, p, [p[0], p[1] + h, p[2]], 0.035, 3);
    for (let i = 0; i + 1 < pts.length || (closed && i < pts.length); i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        rod(b, [p[0], p[1] + h, p[2]], [q[0], q[1] + h, q[2]], 0.035, 3);
        if (mid)
            rod(b, [p[0], p[1] + h * 0.5, p[2]], [q[0], q[1] + h * 0.5, q[2]], 0.025, 3);
    }
}
const ringPts = (r, y, n, rot = 0, cx = 0, cz = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2 + rot) * r, y, cz + Math.sin((i / n) * Math.PI * 2 + rot) * r]);
/** A ladder from a to c: two stringers `w` apart along the direction `side`, and rungs. */
function ladderAt(b, a, c, side, w = 0.5, step = 0.55) {
    const s = vmul(vnorm(side), w / 2), L = Math.hypot(...vsub(c, a)), n = Math.max(2, Math.floor(L / step));
    b.set(GUN, 0);
    rod(b, vsub(a, s), vsub(c, s), 0.03, 3);
    rod(b, vadd(a, s), vadd(c, s), 0.03, 3);
    for (let i = 1; i < n; i++) {
        const p = vlerp(a, c, i / n);
        rod(b, vsub(p, s), vadd(p, s), 0.022, 3);
    }
}
/** A floodlight on a short arm: a housing and a lit lens (material 4) facing `dir`. */
function flood(b, p, dir) {
    const d = vnorm(dir), c = vadd(p, vmul(d, 0.12));
    b.set(DARK, 0);
    b.box(p[0], p[1], p[2], 0.2, 0.16, 0.2);
    const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], u = vmul(vnorm(vcross(d, up)), 0.17), v = vmul(vnorm(vcross(d, u)), 0.13), f = vadd(c, vmul(d, 0.1));
    b.set(LAMP, 4);
    b.poly([vsub(vsub(f, u), v), vadd(vsub(f, u), v), vadd(vadd(f, u), v), vsub(vadd(f, u), v)], p);
}
/** A blinking beacon (material 5) on a small dark base. */
function beacon(b, x, y, z, col = RED, s = 0.12, part = b.part) {
    b.set(DARK, 0, part);
    b.box(x, y + s * 0.4, z, s * 0.8, s * 0.4, s * 0.8);
    b.set(col, 5, part);
    b.box(x, y + s * 1.6, z, s * 0.62, s * 0.8, s * 0.62);
}
/** Unit markings on a face: two off-white bars and a block (a tactical number at a distance). */
function markings(b, Q) {
    const part = b.part;
    b.set(MARK, 0, part);
    decal(b, qsub(Q, 0, 0.16, 0, 1), 0.02);
    decal(b, qsub(Q, 0.26, 0.42, 0, 1), 0.02);
    decal(b, qsub(Q, 0.6, 1, 0.25, 1), 0.02);
}
/** A valve handwheel on a short stem (axis y). */
function valve(b, x, y, z, r = 0.22) {
    b.set(GUN, 0);
    rod(b, [x, y, z], [x, y + 0.3, z], 0.04, 4);
    b.set(RED, 0);
    b.cyl(x, y + 0.3, z, r, r, 0.05, 6, "y", true);
}
/** A standing gas bottle / small tank with a domed top and a band. */
function bottle(b, x, y, z, r, h, col = OLIVE) {
    b.set(col, 0);
    b.cyl(x, y, z, r, r, h, 6, "y", false);
    b.cyl(x, y + h, z, r, r * 0.4, r * 0.6, 6, "y", true);
    b.set(DARK, 0);
    b.cyl(x, y + h * 0.6, z, r * 1.04, r * 1.04, h * 0.08, 6, "y", false);
}
/** Detail shared by the hover tanks: glacis armour blocks, tow shackles, lamp housings and guards, deck hatches and
 * stowage, the rear plate (grille, chevrons, tail lamps, exhaust collars), hover rings, skirt trim and markings. */
function tankDetail(b, o) {
    const G = [[[o.xf, o.yd, -o.wd], [o.xf, o.yd, o.wd], [o.xn, o.yn, o.wn], [o.xn, o.yn, -o.wn]], [(o.xf + o.xn) / 2 - 0.5, (o.yd + o.yn) / 2 - 3, 0]];
    for (let j = 0; j < o.rows; j++)
        for (let i = 0; i < o.cols; i++) {
            b.set((i + j) % 2 ? P2 : P3, 1);
            panel(b, qsub(G, 0.06 + (i * 0.88) / o.cols + 0.012, 0.06 + ((i + 1) * 0.88) / o.cols - 0.012, 0.38 + (j * 0.58) / o.rows + 0.015, 0.38 + ((j + 1) * 0.58) / o.rows - 0.015), 0.06, 0.12);
        }
    b.mirrored((s) => {
        b.set(GUN, 0);
        b.box(o.xn + 0.05, o.yn - 0.2, s * o.wn * 0.5, 0.09, 0.07, 0.05); // tow shackles
        b.set(DARK, 0);
        b.box(o.lamp[0] - o.lr * 0.9, o.lamp[1], s * o.lamp[2], o.lr * 0.85, o.lr * 1.35, o.lr * 1.35); // lamp housing
        b.set(GUN, 0);
        rod(b, [o.lamp[0] + 0.05, o.lamp[1] - o.lr * 1.4, s * o.lamp[2]], [o.lamp[0] + 0.05, o.lamp[1] + o.lr * 1.4, s * o.lamp[2]], 0.015, 3); // guard bars
        rod(b, [o.lamp[0] + 0.05, o.lamp[1], s * o.lamp[2] - o.lr * 1.4], [o.lamp[0] + 0.05, o.lamp[1], s * o.lamp[2] + o.lr * 1.4], 0.015, 3);
        // exhaust collar; hover rings under the glow plates
        b.set(DARK, 0);
        b.cyl(o.ex[0] - 0.04, o.ex[1], s * o.ex[2], o.er * 1.3, o.er * 1.22, 0.12, 6, "x", false);
        b.set(STEEL, 0);
        for (const x of o.plates)
            b.cyl(x, o.ny0 - 0.1, s * o.nz, o.nhw * 0.95, o.nhw * 0.82, 0.1, 6, "y", false);
        if (o.sk) {
            const [z, y0, y1, x0, x1] = o.sk, zz = s * (z + 0.005);
            b.set(DARK, 0);
            b.box((x0 + x1) / 2, y0 - 0.03, s * z, (x1 - x0) / 2, 0.04, 0.03); // skirt lip
            b.set(GUN, 0);
            bolts(b, [x0 + 0.1, y1 - 0.07, zz], [x1 - 0.1, y1 - 0.07, zz], 9, [0, 0, s], 0.035);
            markings(b, qz(zz, -0.55, 0.35, y0 + 0.1, y1 - 0.18, s));
            chevrons(b, qz(zz, x1 - 0.6, x1 - 0.12, y0 + 0.04, y0 + 0.22, s), 2);
        }
    });
    // front deck: hatches, a rivet row, a tow cable and a shovel along the deck edges
    if (o.xf - o.tf > 0.75) {
        const x = (o.tf + o.xf) / 2 + 0.05, r = Math.min(0.3, (o.xf - o.tf) * 0.3);
        b.mirrored((s) => hatch(b, x, o.yd, s * o.wd * 0.55, r));
    }
    b.set(GUN, 0);
    bolts(b, [o.xf - 0.1, o.yd, -o.wd * 0.9], [o.xf - 0.1, o.yd, o.wd * 0.9], 8, [0, 1, 0], 0.035);
    b.set(STEEL, 0);
    rod(b, [-1.3, o.yd + 0.07, o.wd * 0.93], [o.xf - 0.3, o.yd + 0.05, o.wd * 0.93], 0.035, 3);
    b.set(GUN, 0);
    b.box(-1.3, o.yd + 0.07, o.wd * 0.93, 0.07, 0.05, 0.07);
    b.box(o.xf - 0.3, o.yd + 0.05, o.wd * 0.93, 0.07, 0.05, 0.07);
    b.set([0.4, 0.3, 0.2], 0);
    rod(b, [-1.0, o.yd + 0.06, -o.wd * 0.93], [0.5, o.yd + 0.06, -o.wd * 0.93], 0.025, 3);
    b.set(GUN, 0);
    b.box(0.65, o.yd + 0.06, -o.wd * 0.93, 0.16, 0.02, 0.1);
    // rear plate
    const Qr = qx(o.xr, -o.wr, o.wr, o.ry0, o.ry1, -1), gz = o.ex[2] - o.er - 0.14, u0 = 0.5 + (o.ex[2] + o.er + 0.1) / (2 * o.wr);
    if (gz > 0.15)
        grille(b, qsub(Qr, 0.5 - gz / (2 * o.wr), 0.5 + gz / (2 * o.wr), 0.18, 0.86), 5);
    if (0.97 - u0 > 0.05) {
        chevrons(b, qsub(Qr, u0, 0.97, 0.1, 0.5), 2);
        chevrons(b, qsub(Qr, 0.03, 1 - u0, 0.1, 0.5), 2);
        b.set(RED, 4);
        decal(b, qsub(Qr, u0, 0.97, 0.64, 0.86), 0.02);
        decal(b, qsub(Qr, 0.03, 1 - u0, 0.64, 0.86), 0.02);
    }
    if (o.ant) {
        b.set(GUN, 0);
        b.cyl(o.ant[0], o.ant[1] - 1.0, o.ant[2], 0.07, 0.05, 0.14, 5, "y", false);
        b.set(RED, 5);
        b.box(o.ant[0], o.ant[1], o.ant[2], 0.045, 0.045, 0.045);
    }
}
/** Detail on the shared tank turret: side plates, smoke tubes, a gunner's sight, periscopes, bustle rails, an aerial,
 * lifting eyes; on the plain gun, barrel bands and a fume extractor. */
function turretDetail(b, px, py, r, h, L, R, plain) {
    const P = (deg, f) => { const a = (deg * Math.PI) / 180, rr = r * (1 - 0.18 * f); return [px + Math.cos(a) * rr, py + f * h, Math.sin(a) * rr]; };
    for (const deg of [90, 270]) {
        const F = (u, f) => vlerp(P(deg - 22.5, f), P(deg + 22.5, f), u);
        b.set(P1, 1, 1);
        panel(b, [[F(0.1, 0.14), F(0.9, 0.14), F(0.9, 0.86), F(0.1, 0.86)], [px, py + h / 2, 0]], 0.04 + r * 0.02, 0.1);
        b.set(GUN, 0, 1);
        bolts(b, F(0.16, 0.5), F(0.84, 0.5), 4, vsub(F(0.5, 0.5), [px, py + h / 2, 0]), 0.03 + r * 0.01);
    }
    const tr = 0.035 + r * 0.018;
    b.mirrored((s) => {
        for (let i = 0; i < 3; i++) {
            b.set(GUN, 0, 1);
            b.cyl(px + r * 0.28, py + h * (0.55 + i * 0.16), s * r * (0.99 - i * 0.02), tr, tr, r * 0.3, 5, "x", false);
            b.set(BLACK, 0, 1);
            b.disc(px + r * 0.58, py + h * (0.55 + i * 0.16), s * r * (0.99 - i * 0.02), tr * 0.8, 5, "x", 1);
        } // smoke tubes
        b.set(GUN, 0, 1);
        b.box(px + r * 0.55, py + h + 0.03, s * r * 0.3, 0.05, 0.04, 0.03); // lifting eyes
        rod(b, [px - r * 1.28, py + h * 0.86, s * r * 0.4], [px - r * 1.28, py + h * 1.12, s * r * 0.4], 0.02, 3); // bustle rail posts
        rod(b, [px - r * 1.28, py + h * 1.12, s * r * 0.4], [px - r * 0.7, py + h * 1.12, s * r * 0.52], 0.02, 3);
    });
    b.set(GUN, 0, 1);
    rod(b, [px - r * 1.28, py + h * 1.12, -r * 0.4], [px - r * 1.28, py + h * 1.12, r * 0.4], 0.02, 3);
    // gunner's sight, periscopes round the cupola, an aerial on the bustle
    b.set(GUN, 0, 1);
    b.box(px + r * 0.5, py + h + 0.1, r * 0.52, 0.06 + r * 0.08, 0.1, 0.05 + r * 0.06);
    b.set(GLASS, 0, 1);
    decal(b, qx(px + r * 0.58 + 0.06, r * 0.52 - 0.03 - r * 0.05, r * 0.52 + 0.03 + r * 0.05, py + h + 0.05, py + h + 0.17, 1), 0.006);
    const cr = Math.min(0.36, r * 0.3) + 0.11;
    for (const a of [-0.75, 0, 0.75]) {
        b.set(GLASS, 0, 1);
        b.box(px + Math.cos(a) * cr, py + h + 0.05, Math.sin(a) * cr, 0.035, 0.05, 0.06);
    }
    whip(b, px - r * 1.1, py + h * 1.1, -r * 0.28, 0.9 + r * 0.35, RED, 1);
    if (plain) { // designer 20 Nov: the coaxial MG beside the mantlet (the cannon carries its own sleeve and extractor)
        const gy = py + h * 0.55;
        b.part = 1;
        gunMG(b, px + r * 1.5, gy + R * 0.4, r * 0.34, r * 0.6, 0.8, false);
    }
    b.part = 1;
}
function g2Lancer(b) {
    tankDetail(b, { xr: -3.3, ry0: 0.5, ry1: 1.08, wr: 1.4, ex: [-3.55, 0.85, 0.8], er: 0.2, xf: 2.3, yd: 1.28, wd: 1.25, xn: 3.35, yn: 0.88, wn: 1.06, lamp: [3.26, 0.78, 0.95], lr: 0.09, nz: 1.55, ny0: 0.12, nhw: 0.42, plates: [-1.8, 1.4], sk: [1.99, 0.32, 0.82, -2.6, 2.2], tf: 1.2, rows: 2, cols: 3, ant: [-2.9, 2.3, -1.1] });
    // laser: capacitor cooling fins, power cables, focusing prongs at the lens; heat-sink grilles on the engine deck
    const x = 0.1 + 1.05 * 0.9, y = 1.28 + 0.62 * 0.55;
    b.set(COPPER, 0, 1);
    for (let i = 0; i < 4; i++)
        b.box(x + 0.1 + i * 0.15, y + 0.27, 0, 0.022, 0.08, 0.2);
    b.mirrored((s) => {
        b.part = 0;
        grille(b, [[[-3.1, 1.25, s * 1.15], [-1.65, 1.27, s * 1.15], [-1.65, 1.42, s * 1.05], [-3.1, 1.42, s * 1.05]], [-2.4, 1.2, 0]], 3, COPPER);
        b.set(STEEL, 0, 1);
        rod(b, [0.55, 1.92, s * 0.32], [x + 0.2, y + 0.12, s * 0.24], 0.035, 4);
        b.set(GUN, 0, 2);
        rod(b, [x + 3.2, y, s * 0.2], [x + 3.52, y, s * 0.12], 0.025, 3);
    });
    b.set(GUN, 0, 2);
    rod(b, [x + 3.2, y + 0.2, 0], [x + 3.52, y + 0.12, 0], 0.025, 3);
    rod(b, [x + 3.2, y - 0.2, 0], [x + 3.52, y - 0.12, 0], 0.025, 3);
    b.part = 0;
}
function g2Medium(b, tf) {
    tankDetail(b, { xr: -3.65, ry0: 0.55, ry1: 1.26, wr: 1.6, ex: [-3.95, 0.92, 1.0], er: 0.22, xf: 2.75, yd: 1.48, wd: 1.38, xn: 3.85, yn: 0.98, wn: 1.19, lamp: [3.73, 0.86, 1.12], lr: 0.1, nz: 1.75, ny0: 0.12, nhw: 0.45, plates: [-2.0, 1.8], sk: [2.22, 0.34, 0.88, -2.9, 2.5], tf, rows: 2, cols: 3, ant: [-3.1, 2.76, -1.2] });
}
function g2Hammer(b) {
    g2Medium(b, 1.45);
    // a recoil spade folded at the rear
    b.mirrored((s) => { b.set(GUN, 0); rod(b, [-3.6, 1.3, s * 0.45], [-4.25, 0.8, s * 0.45], 0.07, 4); });
    b.set(DARK, 0);
    b.hull([[-4.5, 0.32], [-4.22, 0.32], [-4.12, 1.0], [-4.36, 1.06]], 0.62, 0.55);
    chevrons(b, qx(-4.47, -0.5, 0.5, 0.45, 0.7, -1), 4);
    b.part = 1;
    // shells in the ready racks, a sight, a loader's rail, an aerial
    b.mirrored((s) => { for (let i = 0; i < 3; i++) {
        b.set(OLIVE, 0, 1);
        b.cyl(-1.1 + i * 0.15, 2.3, s * (0.62 + i * 0.12), 0.065, 0.065, 0.24, 5, "y", false);
        b.set(COPPER, 0, 1);
        b.cyl(-1.1 + i * 0.15, 2.54, s * (0.62 + i * 0.12), 0.065, 0.01, 0.12, 5, "y", false);
    } });
    b.set(GUN, 0, 1);
    b.box(0.5, 2.9, 0.82, 0.14, 0.1, 0.08);
    b.set(GLASS, 0, 1);
    decal(b, qx(0.64, 0.76, 0.88, 2.84, 2.96, 1), 0.006);
    railing(b, [[-1.15, 1.95, -0.45], [-1.28, 1.95, 0], [-1.15, 1.95, 0.45]], 0.5);
    whip(b, -0.55, 1.95, -1.0, 1.5, RED, 1);
    b.mirrored((s) => { b.set(STEEL, 0, 1); rod(b, [1.0, 1.95, s * 0.4], [1.14, 3.3, s * 0.32], 0.06, 4); }); // elevation rams
    // tube: reinforcing bands and a recoil sleeve (pitched with the tube)
    const m = b.mark();
    b.set(DARK, 0, 1);
    for (const x of [1.3, 2.3])
        b.cyl(x, 2.25, 0, 0.44, 0.43, 0.12, 12, "x", false, Math.PI / 12);
    b.rotZ(m, 0.95, 0.2, 2.25);
    b.part = 0;
}
function g2Flak(b) {
    g2Medium(b, 1.35);
    b.part = 1;
    // barrels: cooling jackets, bands and receivers (pitched with the guns); feed chutes from the drums
    const m = b.mark();
    b.set(GUN, 0, 1);
    b.cyl(1.2, 2.55, 0, 0.16, 0.16, 0.03, 8, "x", true);
    rod(b, [1.2, 2.2, 0], [1.2, 2.4, 0], 0.02, 3); // ring sight
    b.rotZ(m, 0.6, 0.6, 2.1);
    b.mirrored((s) => { b.set(GUN, 0, 1); rod(b, [-0.25, 2.35, s * 0.95], [0.7, 2.3, s * 0.7], 0.07, 4); b.set(P3, 1, 1); panel(b, [[[0.0, 2.15, s * 0.909], [0.75, 2.15, s * 0.909], [0.75, 2.5, s * 0.863], [0.0, 2.5, s * 0.863]], [0.4, 2.3, 0]], 0.04, 0.12); });
    // a tracking radar panel on an arm, a feed horn on the dish, an aerial
    b.set(STEEL, 0, 1);
    rod(b, [-0.3, 2.6, -0.8], [-0.3, 3.2, -1.15], 0.05, 4);
    b.set(CON, 0, 1);
    b.box(-0.3, 3.3, -1.2, 0.32, 0.3, 0.04);
    b.set(GUN, 0, 1);
    b.box(-0.3, 3.3, -1.15, 0.2, 0.2, 0.04);
    b.set(GUN, 0, 1);
    rod(b, [-0.9, 3.4, 0], [-0.9, 3.75, 0], 0.03, 3);
    b.box(-0.9, 3.75, 0, 0.05, 0.05, 0.05);
    whip(b, -1.0, 2.6, 0.62, 1.3, RED, 1);
    b.part = 0;
}
function g2Bastion(b) {
    tankDetail(b, { xr: -4.4, ry0: 0.6, ry1: 1.56, wr: 1.95, ex: [-4.75, 1.12, 1.2], er: 0.28, xf: 3.5, yd: 1.82, wd: 1.77, xn: 4.65, yn: 1.15, wn: 1.52, lamp: [4.52, 1.02, 1.35], lr: 0.12, nz: 2.0, ny0: 0.14, nhw: 0.5, plates: [-2.6, 0, 2.4], tf: 1.95, rows: 2, cols: 4 });
    b.mirrored((s) => {
        b.part = 0;
        // side armour: add-on blocks on the bolted plates, markings, a strip of hover glow under them
        const z = s * 2.845;
        for (const [x0, x1] of [[-3.3, -1.75], [-1.42, 0.65], [0.98, 3.2]]) {
            b.set(P3, 1);
            panel(b, qz(z, x0, x1, 0.5, 1.12, s), 0.07, 0.08);
        }
        markings(b, qz(s * 2.92, -0.75, 0.2, 0.64, 0.98, s));
        b.set([1, 1, 1], 3);
        b.box(-0.2, 0.31, s * 2.55, 3.3, 0.025, 0.2);
        // exhaust stacks with heat shields, jerry cans, antenna beacons
        b.set(STEEL, 0);
        b.cyl(-4.02, 2.06, s * 1.3, 0.14, 0.12, 0.8, 6, "y", false);
        b.set(DARK, 0);
        b.cyl(-4.02, 2.25, s * 1.3, 0.19, 0.19, 0.42, 6, "y", false);
        b.set([1, 1, 1], 3);
        b.disc(-4.02, 2.85, s * 1.3, 0.1, 6, "y", 1);
        b.set(OLIVE, 0);
        b.box(-2.3, 2.02, s * 1.66, 0.12, 0.2, 0.09);
        b.box(-2.6, 2.02, s * 1.66, 0.12, 0.2, 0.09);
        b.set(RED, 5);
        b.box(-3.6, 3.05, s * 1.5, 0.045, 0.045, 0.045);
        // turret: wedge armour on the cheeks
        b.set(P1, 1, 1);
        b.hull([[0.95, 1.95], [1.8, 1.95], [2.02, 2.32], [1.75, 2.72], [0.95, 2.72]], 0.26, 0.2, s * 1.38);
        b.set(PANEL, 1, 1);
        seam(b, [1.35, 2.0, s * 1.645], [1.35, 2.7, s * 1.585], [0, 0.08, s], 0.06);
    });
    // gunner's turret: side shields, a sight, an ammunition belt box
    b.set(P2, 1, 1);
    b.mirrored((s) => b.box(-0.3, 3.0, 0.7 + s * 0.38, 0.2, 0.18, 0.03));
    b.set(GLASS, 0, 1);
    b.box(-0.55, 3.26, 0.7, 0.07, 0.06, 0.09);
    b.set(DARK, 0, 1);
    b.cyl(0.3, 3.02, 0.7, 0.085, 0.085, 0.3, 5, "x", false);
    b.part = 0;
}
function g2Strider(b) {
    // W2: detail on the big walker hull
    b.mirrored((s) => {
        const z = s * 3.75;
        // side armour: plate seams, bolt rows, a raised access plate, the unit markings, a team glow stripe, chevrons
        b.set(PANEL, 1);
        for (const x of [-1.6, 0.9])
            seam(b, [x, 5.45, z], [x, 7.45, z], [0, 0, s], 0.06);
        seam(b, [-3.6, 6.7, z], [3.1, 6.7, z], [0, 0, s], 0.05);
        b.set(GUN, 0);
        bolts(b, [-3.5, 7.9, z], [3.0, 7.9, z], 12, [0, 0, s], 0.06);
        bolts(b, [-3.5, 5.5, z], [3.0, 5.5, z], 12, [0, 0, s], 0.06);
        b.set(P2, 1);
        panel(b, qz(z, -3.3, -1.85, 5.6, 6.55, s), 0.07, 0.1);
        markings(b, qz(z, 1.2, 2.8, 6.9, 7.4, s));
        b.set([1, 1, 1], 2);
        decal(b, qz(z, -3.4, 2.9, 5.72, 5.84, s), 0.03);
        chevrons(b, qz(z, -0.95, 0.65, 5.9, 6.35, s), 4);
        // hull flank above the slab: vent grilles over warm light
        grille(b, qz(s * 3.42, -5.9, -4.2, 7.0, 7.9, s), 4);
        grille(b, qz(s * 3.42, 3.6, 5.0, 7.0, 7.9, s), 4);
        // deck: walkway railing along each edge, vent grilles, an exhaust stack at the rear corner
        railing(b, [[-6.3, 8.6, s * 2.95], [-4.4, 8.6, s * 2.95], [-2.4, 8.6, s * 2.95], [-0.4, 8.6, s * 2.95], [1.6, 8.6, s * 2.95], [3.6, 8.6, s * 2.95], [5.2, 8.6, s * 2.9]], 0.7);
        b.set(STEEL, 0);
        b.cyl(-6.3, 8.6, s * 1.9, 0.38, 0.32, 1.9, 6, "y", false);
        b.set(DARK, 0);
        b.cyl(-6.3, 9.1, s * 1.9, 0.45, 0.45, 0.9, 6, "y", false);
        b.cyl(-6.3, 10.5, s * 1.9, 0.36, 0.36, 0.12, 6, "y", false);
        b.set([1, 1, 1], 3);
        b.disc(-6.3, 10.55, s * 1.9, 0.26, 6, "y", 1);
        // roof deck: armour plates either side of the turret ring, smoke dischargers at the front corners
        b.set(P1, 1);
        panel(b, qy(9.3, -5.1, -3.0, s * 0.6, s * 2.2, 1), 0.08, 0.12);
        panel(b, qy(9.3, 2.4, 3.2, s * 0.6, s * 2.2, 1), 0.06, 0.12);
        b.set(DARK, 0);
        for (let i = 0; i < 3; i++)
            b.cyl(3.6, 9.05, s * (1.3 + i * 0.32), 0.12, 0.12, 0.5, 5, "x", false);
        // head module: headlamps by the vision slit, side plates and glow, an aerial
        lampX(b, 8.55, 5.25, s * 1.15, 0.16);
        b.set(P1, 1);
        panel(b, qz(s * 2.03, 5.6, 7.3, 4.6, 5.6, s), 0.07, 0.12);
        b.set([1, 1, 1], 2);
        decal(b, qz(s * 1.98, 5.4, 7.5, 5.95, 6.05, s), 0.08);
        b.set(GUN, 0);
        bolts(b, [5.5, 6.45, s * 1.9], [7.5, 6.45, s * 1.92], 5, [0, 0, s], 0.05);
        // hip housings, front and rear on this side: vent grilles, a hazard band and bolts on the bearing boss, a lamp
        for (const [x, y] of [[w1_walker_ts_1.WALKER.hips[0][0], w1_walker_ts_1.WALKER.hips[0][1] - w1_walker_ts_1.WALKER.rise], [w1_walker_ts_1.WALKER.hips[2][0], w1_walker_ts_1.WALKER.hips[2][1] - w1_walker_ts_1.WALKER.rise]]) {
            const zo = s * 4.45;
            grille(b, qz(zo, x - 0.9, x + 0.9, 7.2, 8.1, s), 3);
            b.set(HAZARD, 0);
            b.cyl(x, y, s > 0 ? 4.6 : -4.62, 1.02, 1.02, 0.02, 10, "z", false);
            b.set(GUN, 0);
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                b.box(x + Math.cos(a) * 0.78, y + Math.sin(a) * 0.78, s * 4.61, 0.06, 0.06, 0.03);
            }
            b.set(P2, 1);
            panel(b, qy(8.85, x - 0.9, x + 0.9, s * 2.5, s * 3.8, 1), 0.06, 0.12);
            b.set(LAMP, 4);
            b.disc(x + Math.sign(x) * 1.56, 6.9, s * 3.6, 0.13, 5, "x", Math.sign(x));
            b.set(AMBER, 4);
            b.box(x, 5.45, zo, 1.0, 0.05, 0.03);
        }
        // rear: tail lamps, engine grilles
        b.set(RED, 4);
        decal(b, qx(-7.0, s > 0 ? 2.2 : -2.75, s > 0 ? 2.75 : -2.2, 7.5, 7.75, -1), 0.02);
        grille(b, qx(-7.5, s > 0 ? 0.3 : -1.9, s > 0 ? 1.9 : -0.3, 6.0, 7.6, -1), 5);
    });
    // nose: armour blocks on the sloped front
    const G = [[[5.3, 8.6 - 0.02, -2.75], [5.3, 8.6 - 0.02, 2.75], [6.7, 7.9, 2.45], [6.7, 7.9, -2.45]], [5, 6, 0]];
    for (let i = 0; i < 4; i++) {
        b.set(i % 2 ? P2 : P1, 1);
        panel(b, qsub(G, 0.04 + i * 0.24, 0.24 + i * 0.24, 0.1, 0.9), 0.1, 0.12);
    }
    b.set(AMBER, 4);
    b.box(6.72, 6.9, 0, 0.02, 0.07, 2.2); // a warm strip across the nose
    // head: a sensor dome on top, a sensor ball and a camera on the chin mount
    sensorDome(b, 6.6, 6.85, 0, 0.42);
    b.set(STEEL, 0);
    b.ball(8.4, 4.0, 0, 0.22, 0);
    // roof: hatches, a vent grille over warm light, the radar mast with a beacon
    hatch(b, -3.9, 9.3, 0, 0.55);
    hatch(b, 2.7, 9.3, 0, 0.45);
    b.set(AMBER, 4);
    b.box(-4.7, 9.31, 0, 0.6, 0.01, 0.9);
    grille(b, qy(9.33, -5.3, -4.1, -0.9, 0.9, 1), 5);
    b.set(STEEL, 0);
    rod(b, [-5.3, 9.3, 1.2], [-5.3, 12.0, 1.2], 0.08, 4);
    b.set(CON, 0);
    b.box(-5.3, 12.1, 1.2, 0.1, 0.22, 1.0);
    b.set(GUN, 0);
    b.box(-5.42, 12.1, 1.2, 0.05, 0.14, 0.7);
    beacon(b, -5.3, 12.3, 1.2, RED, 0.12);
    whip(b, 7.4, 6.85, -1.2, 1.4);
    // belly (seen from below, 5 m up): armour plates, a hatch, downlights, pipe runs
    for (let i = 0; i < 4; i++) {
        b.set(i % 2 ? P3 : P2, 1);
        panel(b, qy(5.0, -5.8 + i * 2.6, -3.6 + i * 2.6, -2.4, 2.4, -1), 0.08, 0.1);
    }
    b.set(LAMP, 4);
    for (const x of [-4.7, 2.9])
        b.mirrored((s) => b.disc(x, 4.9, s * 2.6, 0.18, 6, "y", -1));
    b.set(STEEL, 0);
    b.mirrored((s) => rod(b, [-6.2, 4.85, s * 2.85], [5.0, 4.85, s * 2.85], 0.09, 5));
    b.set(GUN, 0);
    b.disc(-0.4, 4.9, 0, 0.6, 8, "y", -1);
    // rear: a ladder down the engine block
    ladderAt(b, [-7.55, 5.2, 0], [-7.55, 8.5, 0], [0, 0, 1], 0.6);
}
function g2Scout(b) {
    b.mirrored((s) => {
        // canopy frame: bows and the sill
        b.set(DARK, 0);
        // (designer 20 Nov: the bands bled into the glass; they now run on the canopy's own edges, just proud of it)
        const bow = (x, pts) => { for (let i = 0; i + 1 < pts.length; i++) rod(b, [x, pts[i][0] + 0.012, s * (pts[i][1] + 0.012)], [x, pts[i + 1][0] + 0.012, s * (pts[i + 1][1] + 0.012)], 0.02, 4); };
        bow(0.15, [[1.05, 0.42], [1.38, 0.35], [1.52, 0.13], [1.53, 0]]);
        bow(0.95, [[1.03, 0.4], [1.24, 0.3], [1.34, 0.11], [1.35, 0]]);
        const sill = [[-0.8, 1.05, 0.3], [0.15, 1.05, 0.42], [0.95, 1.03, 0.4], [1.62, 0.98, 0.18]];
        for (let i = 0; i + 1 < sill.length; i++)
            rod(b, [sill[i][0], sill[i][1], s * (sill[i][2] + 0.015)], [sill[i + 1][0], sill[i + 1][1], s * (sill[i + 1][2] + 0.015)], 0.022, 4);
        // nacelles: intake lip and splitter, cowling bands, a vent row, exhaust heat streaks, tail flashes
        b.set(GUN, 0);
        b.box(0.62, 0.66, s * 1.38, 0.02, 0.24, 0.015); // intake splitter
        for (let i = 0; i < 4; i++) {
            b.set(BLACK, 0);
            b.box(-1.6 + i * 0.22, 0.99, s * 1.38, 0.07, 0.008, 0.11);
        }
        b.set([1, 1, 1], 2);
        decal(b, qz(s * 1.425, -2.3, -1.95, 1.2, 1.38, s), 0.012);
        b.set(RED, 4);
        decal(b, qx(-2.47, s * 0.3, s * 0.52, 0.66, 0.8, -1), 0.02); // tail lamps
        // skids under the nacelles
        b.set(DARK, 0);
        b.box(-1.0, 0.3, s * 1.38, 0.9, 0.025, 0.05);
        rod(b, [-0.3, 0.31, s * 1.38], [-0.3, 0.4, s * 1.38], 0.025, 3);
        rod(b, [-1.7, 0.31, s * 1.38], [-1.7, 0.4, s * 1.38], 0.025, 3);
    });
    whip(b, -1.9, 1.0, -0.42, 1.0);
    // chin sensor, the missile's fins and rail clamps
    b.set(STEEL, 0);
    b.cyl(2.1, 0.35, 0, 0.12, 0.1, 0.1, 6, "y", false);
    b.set(GLASS, 0);
    b.ball(2.1, 0.33, 0, 0.1, 0);
    b.set(DARK, 0);
    b.box(-0.15, 1.09, 0.62, 0.1, 0.2, 0.012);
    b.box(-0.15, 1.09, 0.62, 0.1, 0.012, 0.2); // missile fins
}
function g2Salvo(b) {
    tankDetail(b, { xr: -3.4, ry0: 0.52, ry1: 1.2, wr: 1.5, ex: [-3.7, 0.9, 0.95], er: 0.21, xf: 2.5, yd: 1.42, wd: 1.35, xn: 3.6, yn: 0.95, wn: 1.14, lamp: [3.48, 0.84, 1.08], lr: 0.1, nz: 1.68, ny0: 0.12, nhw: 0.44, plates: [-1.9, 1.6], sk: [2.13, 0.33, 0.86, -2.7, 2.3], tf: 1.45, rows: 2, cols: 3 });
    b.part = 1;
    b.mirrored((s) => {
        // pods: armoured ribs, rear blast vents, backblast chevrons, tube rims, an elevation ram
        b.set(P2, 1, 1);
        for (const x of [-0.9, 0.2, 1.3])
            b.box(x, 2.75, s * 1.0, 0.06, 0.455, 0.395);
        grille(b, qx(-1.3, s * 1.0 - 0.3, s * 1.0 + 0.3, 2.42, 3.08, -1), 4);
        chevrons(b, qz(s * 1.36, -1.26, -0.98, 2.4, 3.1, s), 2);
        b.set(GUN, 0, 1);
        for (const dy of [-0.18, 0.18])
            for (const dz of [-0.14, 0.14])
                b.cyl(1.72, 2.75 + dy, s * 1.0 + dz, 0.125, 0.125, 0.05, 6, "x", false);
        b.set(STEEL, 0, 1);
        rod(b, [-0.6, 2.0, s * 0.78], [0.7, 2.38, s * 0.98], 0.05, 4);
        b.set(P3, 1, 1);
        panel(b, [[[-0.9, 1.6, s * 0.824], [0.7, 1.6, s * 0.824], [0.7, 2.1, s * 0.751], [-0.9, 2.1, s * 0.751]], [0, 1.9, 0]], 0.04, 0.1);
    });
    // turret: a target designator, a tracking dish, an aerial; minigun barrels
    b.set(GUN, 0, 1);
    b.box(0.85, 2.57, -0.4, 0.2, 0.11, 0.14);
    b.set(GLASS, 0, 1);
    decal(b, qx(1.05, -0.5, -0.3, 2.5, 2.64, 1), 0.006);
    b.set(STEEL, 0, 1);
    rod(b, [-0.85, 2.45, 0.42], [-0.85, 3.3, 0.42], 0.04, 4);
    b.set(CON, 0, 1);
    b.cyl(-0.93, 3.3, 0.42, 0.1, 0.42, 0.16, 8, "x", true);
    whip(b, -1.0, 2.45, -0.5, 1.3, RED, 1);
    b.part = 0;
    hatch(b, -2.3, 1.67, 0.45, 0.24); // on the rear stowage
}
function g2Wasp(b) {
    b.mirrored((s) => {
        // rotor blades, spinner and a band on the ducts
        const dx = -0.2, dy = 0.2, dz = s * 3.6, rp = s > 0 ? 10 : 11; // F3: the fan turns (rotor part)
        b.set(GUN, 0, rp);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + 0.3, c = Math.cos(a), n = Math.sin(a), w = 0.13;
            b.poly([[dx + c * 0.14 - n * w * 0.5, dy + 0.78, dz + n * 0.14 + c * w * 0.5], [dx + c * 0.64 - n * w, dy + 0.8, dz + n * 0.64 + c * w], [dx + c * 0.64 + n * w, dy + 0.72, dz + n * 0.64 - c * w], [dx + c * 0.14 + n * w * 0.5, dy + 0.73, dz + n * 0.14 - c * w * 0.5]], [dx, dy - 1, dz]);
        }
        b.set(DARK, 0, rp);
        b.cyl(dx, dy + 0.62, dz, 0.16, 0.06, 0.28, 5, "y", true);
        b.set(GUN, 0, 0);
        b.cyl(dx, dy + 0.4, dz, 0.88, 0.88, 0.1, 8, "y", false);
        // rocket pods: bands, tail fins, pylons
        b.set(DARK, 0);
        for (const x of [0.5, 1.2])
            b.cyl(x, 0.45, s * 2.3, 0.225, 0.222, 0.07, 6, "x", false);
        b.set(STEEL, 0);
        b.box(0.85, 0.6, s * 2.3, 0.3, 0.07, 0.05);
        b.set(P3);
        b.box(0.28, 0.45, s * 2.3, 0.1, 0.3, 0.012);
        b.box(0.28, 0.45, s * 2.3, 0.1, 0.012, 0.3);
        // engine scoops on the shoulders with dark intakes and lit exhausts
        b.set(STEEL, 0);
        b.hull([[-1.5, 1.0], [-0.1, 1.0], [-0.25, 1.36], [-1.4, 1.3]], 0.22, 0.17, s * 0.52);
        b.set(BLACK, 0);
        decal(b, qsub([[[-0.1, 1.0, s * 0.52 - 0.21], [-0.1, 1.0, s * 0.52 + 0.21], [-0.25, 1.36, s * 0.52 + 0.17], [-0.25, 1.36, s * 0.52 - 0.17]], [-1, 1.1, s * 0.52]], 0.12, 0.88, 0.15, 0.85), 0.012);
        b.set([1, 1, 1], 3);
        decal(b, qx(-1.48, s * 0.52 - 0.14, s * 0.52 + 0.14, 1.06, 1.24, -1), 0.02);
        // skid struts and toes, tailplane endplates, walkway chevrons, markings on the boom, a fuselage seam
        b.set(DARK, 0);
        rod(b, [1.3, 0.12, s * 0.5], [1.3, -0.22, s * 0.55], 0.03, 3);
        rod(b, [-0.5, 0.12, s * 0.5], [-0.5, -0.22, s * 0.55], 0.03, 3);
        rod(b, [1.8, -0.25, s * 0.55], [2.05, -0.08, s * 0.55], 0.03, 3);
        b.set(P2);
        b.hull([[-6.35, 0.5], [-5.6, 0.5], [-5.75, 1.05], [-6.4, 1.05]], 0.03, 0.03, s * 1.2);
        chevrons(b, qy(0.8, -0.9, 0.2, s > 0 ? 1.0 : -1.5, s > 0 ? 1.5 : -1.0, 1), 3);
        markings(b, [[[-4.4, 0.5, s * 0.25], [-3.6, 0.48, s * 0.27], [-3.6, 0.7, s * 0.31], [-4.4, 0.71, s * 0.29]], [-4, 0.6, 0]]);
        b.set(PANEL);
        seam(b, [0.2, 0.6, s * 0.88], [0.2, 1.0, s * 0.6], [0, 0.57, s * 0.82], 0.05);
        // canopy frame
        b.set(DARK, 0);
        rod(b, [2.25, 1.0, s * 0.47], [2.25, 1.32, s * 0.35], 0.025, 3);
        rod(b, [2.25, 1.32, s * 0.35], [2.25, 1.43, s * 0.12], 0.025, 3);
        b.set(s > 0 ? [0.2, 1, 0.3] : RED, 5);
        b.box(-0.2, 0.75, s * 4.5, 0.04, 0.04, 0.03); // navigation lights
    });
    b.set(DARK, 0);
    rod(b, [1.45, 1.53, 0], [2.25, 1.44, 0], 0.03, 3);
    rod(b, [2.25, 1.44, 0], [2.95, 0.92, 0], 0.03, 3);
    b.set(GUN, 0);
    rod(b, [3.65, 0.5, 0], [4.25, 0.5, 0], 0.015, 3); // pitot
    b.set(STEEL, 0);
    b.cyl(2.2, 0.0, 0.3, 0.13, 0.15, 0.1, 6, "y", false);
    b.set(GLASS, 0);
    b.ball(2.2, -0.02, 0.3, 0.12, 0); // chin sensor
    beacon(b, -6.25, 2.3, 0, RED, 0.07);
    b.set(DARK, 0);
    rod(b, [-5.9, 0.62, 0], [-6.2, 0.3, 0], 0.025, 3);
    whip(b, -4.5, 0.9, 0, 0.7, null);
    // chin gun's ammunition box
    b.set(OLIVE, 0, 1);
    b.box(2.78, -0.02, 0.3, 0.14, 0.12, 0.1);
    b.part = 0;
}
function g2Infantry(b) {
    b.mirrored((s) => {
        const leg = s > 0 ? 4 : 3, arm = s > 0 ? 6 : 5;
        b.set(P3, 1, leg);
        b.box(0.12, 0.42, s * 0.14, 0.035, 0.06, 0.085); // knee pad (team, rides the shin)
        b.set(RUBBER, 0, leg);
        b.box(0.09, 0.012, s * 0.14, 0.165, 0.014, 0.105); // sole
        b.set(OLIVE, 0, leg);
        b.box(-0.02, 0.72, s * 0.255, 0.07, 0.09, 0.03); // thigh pouch
        b.set(DARK, 0, arm);
        b.box(0.13, 1.1, s * 0.31, 0.06, 0.04, 0.065);
        b.box(0.43, 1.13, s * 0.255, 0.05, 0.05, 0.05); // elbow pad, glove
    });
    b.part = 0;
    b.set(OLIVE, 0, 0);
    b.box(0.2, 1.0, 0.1, 0.035, 0.07, 0.07);
    b.box(0.2, 1.0, -0.1, 0.035, 0.07, 0.07);
    b.box(-0.2, 0.98, -0.23, 0.05, 0.08, 0.04); // belt pouches, canteen
    b.set(DARK, 0);
    b.box(0.215, 1.3, 0, 0.012, 0.03, 0.15);
    b.box(0.0, 1.5, 0, 0.1, 0.03, 0.13); // chest strap, collar
    b.set([1, 1, 1], 2);
    b.box(0.218, 1.37, 0.1, 0.008, 0.02, 0.03); // chest lamp
    b.set(CANVAS, 0);
    b.cyl(-0.3, 1.53, -0.2, 0.07, 0.07, 0.4, 6, "z", true); // bedroll
    b.set(GUN, 0);
    b.box(-0.4, 1.3, 0, 0.03, 0.14, 0.14); // radio
    b.set(DARK, 0);
    rod(b, [-0.38, 1.44, 0.15], [-0.44, 2.05, 0.15], 0.01, 3);
    b.set(P2, 1);
    b.cyl(0.0, 1.6, 0, 0.178, 0.165, 0.04, 8, "y", false); // helmet brim
    b.set(DARK, 0);
    b.box(0.0, 1.66, 0.165, 0.05, 0.045, 0.02);
    b.box(0.1, 1.57, 0, 0.05, 0.035, 0.09); // comms box, chin guard
    b.set(DARK, 0, 6);
    b.box(0.42, 1.09, 0.14, 0.035, 0.07, 0.025);
    b.box(0.35, 1.225, 0.14, 0.09, 0.022, 0.022);
    b.box(-0.03, 1.15, 0.14, 0.08, 0.05, 0.03);
    b.box(0.87, 1.16, 0.14, 0.03, 0.052, 0.052); // magazine, optic, stock, muzzle
    b.set([1, 1, 1], 2, 6);
    b.box(0.445, 1.225, 0.14, 0.004, 0.016, 0.016);
    b.part = 0;
}
/** Detail shared by the economy vehicles (rear x and whether a plow covers the nose). */
function g2Econ(b, rear, plowed) {
    // cab: light bar, doors with handles and steps, mirrors, a roof hatch, an aerial, a blinking beacon, an exhaust stack
    b.set(DARK, 0);
    b.box(0.55, 2.82, 0, 0.1, 0.07, 0.95);
    b.set(LAMP, 4);
    for (const z of [-0.7, -0.25, 0.25, 0.7])
        decal(b, qx(0.65, z - 0.15, z + 0.15, 2.77, 2.87, 1), 0.006);
    b.mirrored((s) => {
        b.set(P3);
        panel(b, [[[-0.18, 1.5, s * 1.293], [0.36, 1.5, s * 1.293], [0.36, 2.6, s * 1.211], [-0.18, 2.6, s * 1.211]], [0.1, 2, 0]], 0.03, 0.06);
        b.set(GUN, 0);
        decal(b, [[[0.2, 2.0, s * 1.256], [0.3, 2.0, s * 1.256], [0.3, 2.06, s * 1.252], [0.2, 2.06, s * 1.252]], [0.1, 2, 0]], 0.04);
        b.box(0.1, 1.22, s * 1.74, 0.3, 0.03, 0.1);
        rod(b, [0.8, 2.3, s * 1.2], [0.95, 2.35, s * 1.55], 0.02, 3);
        b.set(DARK, 0);
        b.box(0.95, 2.35, s * 1.6, 0.02, 0.14, 0.08);
        // hover rings, skirt trim, markings; rear lamps and mud flaps
        b.set(STEEL, 0);
        for (const x of [rear + 1.6, 1.4])
            b.cyl(x, 0.02, s * 1.6, 0.38, 0.33, 0.1, 6, "y", false);
        b.set(DARK, 0);
        b.box((rear + 0.6 + 2.2) / 2, 0.27, s * 2.02, (2.2 - rear - 0.6) / 2, 0.04, 0.03);
        b.set(GUN, 0);
        bolts(b, [rear + 0.7, 0.75, s * 2.025], [2.1, 0.75, s * 2.025], 8, [0, 0, s], 0.035);
        markings(b, qz(s * 2.025, -0.6, 0.3, 0.4, 0.64, s));
        b.set(RED, 4);
        decal(b, qx(rear, s > 0 ? 1.1 : -1.45, s > 0 ? 1.45 : -1.1, 0.95, 1.15, -1), 0.02);
        b.set(DARK, 0);
        b.box(rear - 0.02, 0.3, s * 1.2, 0.02, 0.16, 0.3);
        b.set(DARK, 0);
        b.box(2.87, 0.84, s * 1.15, 0.09, 0.14, 0.14); // lamp housing
    });
    hatch(b, 0.2, 2.75, -0.5, 0.28);
    whip(b, -0.12, 2.75, -1.0, 1.2, null);
    b.set(AMBER, 5);
    b.box(0.1, 2.92, 0.7, 0.085, 0.07, 0.085);
    b.set(STEEL, 0);
    b.cyl(-0.35, 1.4, 1.12, 0.09, 0.08, 1.75, 6, "y", false);
    b.set(DARK, 0);
    b.cyl(-0.35, 2.7, 1.12, 0.12, 0.12, 0.35, 6, "y", false);
    // nose: a radiator grille between raised plates; a bumper where there is no plow
    const N = [[[2.4, 1.45, -1.45], [2.4, 1.45, 1.45], [3.05, 0.95, 1.29], [3.05, 0.95, -1.29]], [2, -2, 0]];
    grille(b, qsub(N, 0.28, 0.72, 0.2, 0.88), 5);
    b.set(P2);
    panel(b, qsub(N, 0.05, 0.25, 0.2, 0.88), 0.04, 0.1);
    panel(b, qsub(N, 0.75, 0.95, 0.2, 0.88), 0.04, 0.1);
    if (!plowed) {
        b.set(GUN, 0);
        b.box(3.14, 0.52, 0, 0.07, 0.1, 1.45);
        b.set(HAZARD, 0);
        b.mirrored((s) => b.box(3.15, 0.52, s * 1.2, 0.075, 0.105, 0.2));
    }
    // rear: full-width chevrons and a tow hitch
    chevrons(b, qx(rear, -1.45, 1.45, 0.5, 0.82, -1), 9);
    b.set(GUN, 0);
    b.box(rear - 0.1, 0.45, 0, 0.12, 0.06, 0.1);
}
/** Detail on the shared work arm: hydraulic rams, joint pins, a work lamp. */
function g2Arm(b) {
    b.part = 1;
    b.mirrored((s) => { b.set(STEEL, 0, 1); rod(b, [2.0, 2.3, s * 0.24], [3.3, 3.05, s * 0.24], 0.05, 4); rod(b, [3.78, 3.3, s * 0.2], [4.36, 1.8, s * 0.2], 0.04, 4); });
    b.set(GUN, 0, 1);
    b.cyl(3.75, 3.2, -0.25, 0.17, 0.17, 0.5, 6, "z", true);
    b.cyl(2.05, 2.2, -0.26, 0.15, 0.15, 0.52, 6, "z", true);
    b.set(DARK, 0, 1);
    b.box(3.2, 3.2, 0, 0.12, 0.08, 0.12);
    b.set(LAMP, 4, 1);
    decal(b, qx(3.32, -0.09, 0.09, 3.14, 3.26, 1), 0.006);
    beacon(b, 1.9, 2.25, 0.2, AMBER, 0.07, 1);
    b.part = 0;
}
function g2Harvester(b) {
    g2Econ(b, -3.4, false);
    g2Arm(b);
    // hopper: ribs, a rear chute, more ore
    b.mirrored((s) => { b.set(P2); for (const x of [-2.85, -2.1, -1.35, -0.75])
        rod(b, [x, 1.45, s * 1.53], [x, 2.3, s * 1.7], 0.05, 4); });
    b.set(STEEL, 0);
    b.box(-3.5, 1.9, 0, 0.12, 0.42, 0.8);
    chevrons(b, qx(-3.62, -0.7, 0.7, 1.58, 1.84, -1), 5);
    b.set(ORE_A, 4);
    crystal(b, -1.2, -0.6, 1.0, 0.28, 0.3, -0.2, 1.0, 5, 2.4);
    b.set(ORE_C, 4);
    crystal(b, -2.6, 0.7, 0.8, 0.24, -0.3, 0.3, 2.0, 5, 2.4);
    b.set(ORE_B, 4);
    crystal(b, -2.9, -0.6, 0.6, 0.22, 0.2, 0.3, 0.4, 5, 2.4);
    b.set(ORE_ROCK, 0);
    b.ball(-0.9, 2.5, 0.6, 0.35, 0, 0.6);
    b.ball(-1.9, 2.5, -0.9, 0.3, 0, 0.6);
    b.set(DARK, 0, 1);
    for (const z of [-0.35, 0, 0.35])
        b.box(4.82, 0.74, z, 0.04, 0.11, 0.04); // claw teeth
    b.part = 0;
}
function g2Hauler(b) {
    g2Econ(b, -3.4, true);
    // container: raised ribs, a top rail, rear doors with lock rods and handles
    b.mirrored((s) => { b.set(P2); for (const x of [-3.0, -2.25, -1.5, -0.75])
        b.box(x, 2.0, s * 1.41, 0.05, 0.5, 0.03); b.set(GUN, 0); b.box(-1.9, 2.56, s * 1.42, 1.4, 0.035, 0.03); });
    b.set(DARK, 0);
    seam(b, [-3.3, 1.5, 0], [-3.3, 2.5, 0], [-1, 0, 0], 0.05);
    b.set(GUN, 0);
    for (const z of [-0.95, -0.35, 0.35, 0.95])
        rod(b, [-3.36, 1.48, z], [-3.36, 2.52, z], 0.03, 3);
    b.mirrored((s) => { b.set(STEEL, 0); b.box(-3.36, 2.0, s * 0.65, 0.03, 0.04, 0.2); });
    b.set(HAZARD, 0);
    decal(b, qx(-3.3, -1.3, 1.3, 1.42, 1.52, -1), 0.016);
    // roof: a rolled tarpaulin, jerry cans, a second strap; a second exhaust stack; plow: wear edge, rams, lamps
    b.set(CANVAS, 0);
    b.cyl(-0.8, 2.85, -0.8, 0.15, 0.15, 1.6, 6, "z", true);
    b.set(OLIVE, 0);
    for (let i = 0; i < 3; i++)
        b.box(-3.0, 2.9, -0.6 + i * 0.28, 0.1, 0.2, 0.1);
    b.set(DARK, 0);
    seam(b, [-1.3, 3.07, -0.85], [-1.3, 3.07, 0.05], [0, 1, 0], 0.08);
    b.set(STEEL, 0);
    b.cyl(-0.35, 1.4, -1.12, 0.09, 0.08, 1.75, 6, "y", false);
    b.set(DARK, 0);
    b.cyl(-0.35, 2.7, -1.12, 0.12, 0.12, 0.35, 6, "y", false);
    g2Plow(b, 1.6);
}
function g2Plow(b, w) {
    b.set(STEEL, 0);
    b.box(3.6, 0.1, 0, 0.1, 0.05, w);
    b.set(GUN, 0);
    for (const z of [-0.33, 0.33])
        b.box(3.35, 0.7, z * w * 2, 0.22, 0.38, 0.05);
    b.mirrored((s) => { b.set(STEEL, 0); rod(b, [2.6, 0.95, s * w * 0.6], [3.25, 0.75, s * w * 0.6], 0.05, 4); lampX(b, 3.42, 1.2, s * w * 0.62, 0.11); });
}
function g2Constructor(b) {
    g2Econ(b, -3.4, false);
    g2Arm(b);
    // deck: gas bottles in a rack, a cable reel, a generator; stabiliser feet and rams
    bottle(b, -2.9, 1.7, 1.08, 0.14, 0.7, OLIVE);
    bottle(b, -2.55, 1.7, 1.08, 0.14, 0.7, [0.5, 0.2, 0.15]);
    bottle(b, -2.2, 1.7, 1.08, 0.14, 0.7, STEEL);
    b.set(GUN, 0);
    rod(b, [-3.1, 2.2, 1.25], [-2.0, 2.2, 1.25], 0.02, 3);
    b.set(CANVAS, 0);
    b.cyl(-0.95, 2.08, 0.85, 0.3, 0.3, 0.36, 8, "z", true);
    b.set(DARK, 0);
    b.cyl(-0.95, 2.08, 0.82, 0.38, 0.38, 0.03, 8, "z", true);
    b.cyl(-0.95, 2.08, 1.21, 0.38, 0.38, 0.03, 8, "z", true);
    b.set(OLIVE, 0);
    b.box(-0.82, 1.98, -0.16, 0.3, 0.28, 0.24);
    grille(b, qy(2.26, -1.05, -0.6, -0.34, 0.02), 3);
    b.mirrored((s) => { b.set(DARK, 0); b.box(-2.9, 0.28, s * 1.95, 0.26, 0.04, 0.26); b.set(STEEL, 0); rod(b, [-2.9, 1.4, s * 1.5], [-2.9, 1.2, s * 1.9], 0.05, 4); chevrons(b, qz(s * 2.07, -3.02, -2.78, 0.5, 1.4, s), 1); });
}
function g2Fbv(b) {
    g2Econ(b, -4.6, true);
    g2Plow(b, 1.7);
    b.mirrored((s) => {
        // module: a door, windows, corner jacks, aerials
        b.set(P3);
        panel(b, qz(s * 1.545, -2.9, -2.1, 1.5, 2.5, s), 0.04, 0.06);
        b.set(GUN, 0);
        decal(b, qz(s * 1.59, -2.3, -2.2, 1.95, 2.02, s), 0.006);
        win(b, qz(s * 1.55, -1.5, -0.9, 1.95, 2.4, s), WARMWIN);
        win(b, qz(s * 1.55, -4.1, -3.5, 1.95, 2.4, s), null);
        for (const x of [-4.3, -0.7]) {
            b.set(HAZARD, 0);
            b.box(x, 1.9, s * 1.62, 0.09, 0.45, 0.07);
            b.set(DARK, 0);
            b.box(x, 1.42, s * 1.62, 0.15, 0.04, 0.12);
        }
        whip(b, -4.3, 3.3, s * 1.0, 1.6, null);
    });
    // roof: machinery, a hatch, the folded dish's arm; rear: a door and a ladder; a beacon on the mast
    acUnit(b, -1.9, 3.3, -0.45, 0.45, 0.4, 0.25);
    hatch(b, -0.85, 3.3, -0.4, 0.3);
    b.set(GUN, 0);
    rod(b, [-3.4, 3.62, 0], [-2.5, 3.42, 0.5], 0.04, 4);
    b.box(-3.4, 3.64, 0, 0.14, 0.06, 0.14);
    door(b, qx(-4.5, -0.4, 0.4, 1.9, 2.95, -1));
    ladderAt(b, [-4.57, 1.5, 1.0], [-4.57, 3.3, 0.98], [0, 0, 1], 0.4);
    b.set(RED, 5);
    b.box(-1.2, 4.36, 0.8, 0.05, 0.05, 0.05);
}
function g2Carrier(b) {
    const Z = (y) => 1.72 - (y - 1.4) * 0.411;
    const US = (x0, x1, y0, y1, s) => [[[x0, y0, s * Z(y0)], [x1, y0, s * Z(y0)], [x1, y1, s * Z(y1)], [x0, y1, s * Z(y1)]], [(x0 + x1) / 2, (y0 + y1) / 2, 0]];
    b.mirrored((s) => {
        // firing ports, door handle, markings
        for (const x of [-0.95, -0.05, 0.85, 1.75]) {
            b.set(P3);
            panel(b, US(x - 0.2, x + 0.2, 1.8, 2.04, s), 0.035, 0.1);
            b.set(BLACK, 0);
            decal(b, qsub(US(x - 0.2, x + 0.2, 1.8, 2.04, s), 0.28, 0.72, 0.3, 0.7), 0.045);
        }
        b.set(GUN, 0);
        decal(b, US(-1.72, -1.6, 1.7, 1.78, s), 0.05);
        markings(b, US(-3.6, -2.95, 1.62, 1.98, s));
        // hover nacelles: intake grilles at the front, vents along the top
        b.set(DARK, 0);
        b.box(3.42, 0.55, s * 1.62, 0.03, 0.22, 0.3);
        for (const x of [-2.2, -1.4, -0.6, 0.2, 1.0, 1.8])
            b.box(x, 0.93, s * 1.62, 0.18, 0.015, 0.22);
        b.set(OLIVE, 0);
        b.box(1.3, 1.43, s * 1.98, 0.5, 0.1, 0.2); // fender boxes
        // roof: stowage rails, smoke tubes
        railing(b, [[-3.7, 2.38, s * 1.1], [-2.5, 2.38, s * 1.1], [-1.3, 2.38, s * 1.1]], 0.2, false, GUN, false);
        b.set(GUN, 0);
        for (let i = 0; i < 3; i++)
            b.cyl(2.45, 2.46, s * (0.75 + i * 0.13), 0.05, 0.05, 0.3, 5, "x", false);
        // rear: ramp rams, tail lamps; front: lamp housings
        b.set(STEEL, 0);
        rod(b, [-3.9, 2.2, s * 1.27], [-4.05, 1.0, s * 1.27], 0.04, 4);
        b.set(RED, 4);
        decal(b, qx(-3.9, s > 0 ? 1.26 : -1.5, s > 0 ? 1.5 : -1.26, 1.6, 1.82, -1), 0.02);
        b.set(DARK, 0);
        b.box(3.88, 1.25, s * 0.95, 0.1, 0.14, 0.14);
        // roof gun: split shield
        b.set(P2, 1, 1);
        b.box(1.42, 2.66, s * 0.3, 0.03, 0.2, 0.17);
        b.part = 0;
    });
    b.set(OLIVE, 0, 1);
    b.box(0.8, 2.9, 0.42, 0.14, 0.09, 0.1);
    b.set(GLASS, 0, 1);
    b.box(1.0, 2.86, -0.3, 0.06, 0.05, 0.06);
    b.part = 0;
    // glacis: windscreens with wipers, armour plates, an intake grille; a bull bar and a winch
    const G = [[[3.0, 2.38, -1.17], [3.0, 2.38, 1.17], [4.05, 1.52, 1.08], [4.05, 1.52, -1.08]], [3, -1, 0]];
    win(b, qsub(G, 0.07, 0.46, 0.16, 0.48), null);
    win(b, qsub(G, 0.54, 0.93, 0.16, 0.48), null);
    grille(b, qsub(G, 0.32, 0.68, 0.6, 0.9), 4);
    b.set(P2);
    panel(b, qsub(G, 0.05, 0.28, 0.58, 0.92), 0.04, 0.1);
    panel(b, qsub(G, 0.72, 0.95, 0.58, 0.92), 0.04, 0.1);
    b.set(GUN, 0);
    for (const y of [0.85, 1.4])
        rod(b, [4.25, y, -1.25], [4.25, y, 1.25], 0.04, 4);
    for (const z of [-1.25, 0, 1.25])
        rod(b, [4.25, 0.85, z], [4.25, 1.4, z], 0.04, 4);
    b.mirrored((s) => rod(b, [4.25, 0.9, s * 1.2], [3.85, 0.9, s * 1.2], 0.04, 4));
    b.set(STEEL, 0);
    b.cyl(4.12, 0.78, -0.3, 0.12, 0.12, 0.6, 6, "z", true);
    // roof: jerry cans, a rolled tarpaulin; a muffler on the left side; a stowage box and chevrons on the ramp
    b.set(OLIVE, 0);
    for (let i = 0; i < 3; i++)
        b.box(-3.55, 2.56, -0.25 + i * 0.27, 0.1, 0.18, 0.11);
    b.set(CANVAS, 0);
    b.cyl(-1.9, 2.5, 0.0, 0.13, 0.13, 1.5, 6, "x", true);
    b.set(STEEL, 0);
    b.cyl(-3.7, 2.15, -1.53, 0.12, 0.12, 0.8, 6, "x", true);
    b.set(DARK, 0);
    rod(b, [-3.7, 2.15, -1.53], [-4.0, 2.4, -1.53], 0.04, 4);
    b.set(OLIVE, 0);
    b.box(-4.05, 1.5, 0.55, 0.08, 0.32, 0.4); // ramp stowage box (was the spare wheel: a hover APC has none)
    chevrons(b, qx(-4.03, -1.1, 1.1, 0.42, 0.68, -1), 7);
    b.set(RED, 5);
    b.box(-3.4, 3.4, -1.2, 0.04, 0.04, 0.04);
}
/**
 * Designer 20 Nov ("the Mule, add detail there, it's the least detailed flyer"; then "looks a little garbled": the
 * pieces that overlapped g2Mule's are gone): a dorsal engine housing with exhausts, belly sponsons with gear doors, rocket
 * pods and drop tanks on wing pylons, wing fences, cowled wing-tip nacelles with nav lights, a ventral fin, ramp hinges,
 * tail lights and a searchlight.
 */
function g3Mule(b) {
    // dorsal engine / gearbox housing on the roof (between the exhaust grille and the blade aerial): a chamfered hump with
    // a vent on top, twin exhausts out of its back, an access hatch and the anti-collision beacon
    b.set(P2);
    b.hull([[-1.5, 1.84], [0.2, 1.84], [0.05, 2.2], [-0.4, 2.4], [-1.35, 2.36]], 0.6, 0.42);
    b.set(BLACK, 0);
    b.box(-0.85, 2.41, 0, 0.3, 0.012, 0.22);
    b.set(GUN, 0);
    for (let i = 0; i < 4; i++)
        b.box(-1.06 + i * 0.14, 2.425, 0, 0.025, 0.015, 0.2);
    b.mirrored((s) => {
        b.set(STEEL, 0);
        b.cyl(-1.95, 2.12, s * 0.28, 0.12, 0.14, 0.45, 6, "x", false);
        b.set(BLACK, 0);
        b.disc(-1.96, 2.12, s * 0.28, 0.1, 6, "x", -1);
    });
    b.set(RED, 5);
    b.box(-1.25, 2.4, 0, 0.06, 0.04, 0.06); // anti-collision beacon
    // IR jammer on the spine behind the grille
    b.set(DARK, 0);
    b.cyl(-3.0, 1.95, 0, 0.14, 0.11, 0.2, 6, "y", true);
    b.set(GLASS, 0);
    b.ball(-3.0, 2.2, 0, 0.1, 0);
    b.mirrored((s) => {
        // belly sponsons (fuel and the main gear) between the panel seams, with a gear door
        b.set(P3);
        b.hull([[-1.75, 0.08], [0.85, 0.08], [1.05, 0.3], [0.85, 0.5], [-1.75, 0.5], [-1.95, 0.3]], 0.2, 0.16, s * 1.5);
        b.set(DARK, 0);
        decal(b, qz(s * 1.705, 0.2, 0.75, 0.14, 0.42, s), 0.01);
        // wing pylons: a rocket pod outboard, a drop tank inboard
        b.set(GUN, 0);
        b.box(-0.45, 1.18, s * 2.55, 0.32, 0.12, 0.05);
        b.box(-0.45, 1.18, s * 1.95, 0.25, 0.12, 0.05);
        b.set(P3);
        b.cyl(-1.3, 0.92, s * 2.55, 0.22, 0.22, 1.5, 8, "x", true);
        b.set(DARK, 0);
        b.disc(0.21, 0.92, s * 2.55, 0.2, 8, "x", 1);
        b.set(BLACK, 0);
        for (const [dy, dz] of [[0, 0], [0.11, 0.06], [-0.11, 0.06], [0, -0.12], [0.11, -0.06], [-0.11, -0.06]])
            b.disc(0.215, 0.92 + dy, s * 2.55 + dz, 0.04, 5, "x", 1);
        b.set(HAZARD, 0);
        b.cyl(-1.32, 0.92, s * 2.55, 0.225, 0.225, 0.08, 8, "x", false);
        b.set(OLIVE, 0);
        b.cyl(-1.2, 0.95, s * 1.95, 0.05, 0.17, 0.35, 8, "x", false);
        b.cyl(-0.85, 0.95, s * 1.95, 0.17, 0.17, 0.75, 8, "x", false);
        b.cyl(-0.1, 0.95, s * 1.95, 0.17, 0.03, 0.4, 8, "x", false);
        // a wing fence, wing-tip nav lights on the nacelles, cowling bands and the rotor mast fairing
        b.set(P3);
        b.hull([[-1.15, 1.46], [0.4, 1.4], [0.3, 1.62], [-1.0, 1.62]], 0.02, 0.02, s * 2.35);
        b.set(s > 0 ? [0.2, 1, 0.3] : RED, 5);
        b.box(-0.4, 1.75, s * 3.84, 0.04, 0.05, 0.03);
        b.set(GUN, 0);
        for (const y of [1.55, 2.0])
            b.cyl(-0.4, y, s * 3.4, 0.43, 0.43, 0.06, 8, "y", false);
        b.set(P2);
        b.cyl(-0.4, 2.3, s * 3.4, 0.36, 0.2, 0.12, 8, "y", false);
        // ramp hinge knuckles, tail lights
        b.set(STEEL, 0);
        b.cyl(-4.03, 0.62, s * 0.55, 0.06, 0.06, s * 0.2, 6, "z", true);
        b.set(RED, 4);
        b.box(-4.02, 1.6, s * 0.75, 0.02, 0.06, 0.06);
    });
    // designer 20 Nov ("the mule is missing a front central window"): the windscreen on the nose slope (the old glass loft
    // sits under the hull): two centre panes either side of a post on the top face, a side pane on each chamfer
    {
        const A = { x: 2.4, yt: 1.85, zt: 0.8, yc: 1.55, zc: 1.1 }, B = { x: 3.85, yt: 1.05, zt: 0.38, yc: 0.93, zc: 0.5 };
        const at = (x, f) => { const t = (x - A.x) / (B.x - A.x), L = (a, b) => a + (b - a) * t; return { y: L(A.yt, B.yt) + (L(A.yc, B.yc) - L(A.yt, B.yt)) * f, z: L(A.zt, B.zt) + (L(A.zc, B.zc) - L(A.zt, B.zt)) * f }; };
        const top = (x, u) => { const t = (x - A.x) / (B.x - A.x); return [x, A.yt + (B.yt - A.yt) * t, u * (A.zt + (B.zt - A.zt) * t)]; };
        const ch = (x, f, s) => { const q = at(x, f); return [x, q.y, s * q.z]; };
        b.set(GLASS, 0);
        b.mirrored((s) => {
            decal(b, [[top(2.55, s * 0.06), top(3.3, s * 0.06), top(3.3, s * 0.88), top(2.55, s * 0.88)], [2.9, 0.5, 0]], 0.012);
            decal(b, [[ch(2.6, 0.15, s), ch(3.25, 0.15, s), ch(3.25, 0.85, s), ch(2.6, 0.85, s)], [2.9, 0.5, 0]], 0.012);
        });
        b.set(DARK, 0);
        decal(b, [[top(2.5, -0.06), top(3.35, -0.06), top(3.35, 0.06), top(2.5, 0.06)], [2.9, 0.5, 0]], 0.02); // centre post
    }
    // ventral fin under the tail, a searchlight beside the chin gun
    b.set(P2);
    b.hull([[-4.0, 0.62], [-3.3, 0.35], [-3.4, 0.2], [-3.9, 0.3]], 0.04, 0.04);
    b.set(STEEL, 0);
    b.cyl(3.3, 0.18, -0.42, 0.11, 0.13, 0.16, 6, "y", true);
    b.set([1, 0.95, 0.8], 2);
    b.disc(3.3, 0.17, -0.42, 0.1, 6, "y", -1);
}
function g2Mule(b) {
    const blade = (cx, cy, cz, a, len, w) => {
        const c = Math.cos(a), n = Math.sin(a), q = [[cx + c * 0.2 - n * w, cy, cz + n * 0.2 + c * w], [cx + c * len - n * w * 0.7, cy, cz + n * len + c * w * 0.7], [cx + c * len + n * w * 0.7, cy, cz + n * len - c * w * 0.7], [cx + c * 0.2 + n * w, cy, cz + n * 0.2 - c * w]];
        b.poly(q, [cx, cy - 1, cz]);
        b.poly(q, [cx, cy + 1, cz]);
    };
    const Zu = (y) => 1.45 - (y - 1.0) * 0.4286;
    b.mirrored((s) => {
        // rotors: blades over the blur disc, hub caps
        const rp = s > 0 ? 10 : 11; // F3: the blades and hub cap turn (rotor part)
        b.set(GUN, 0, rp);
        for (let i = 0; i < 3; i++)
            blade(-0.4, 2.47, s * 3.4, i * 2.094 + (s > 0 ? 0.3 : 1.3), 2.35, 0.1);
        b.set(DARK, 0, rp);
        b.cyl(-0.4, 2.47, s * 3.4, 0.22, 0.08, 0.2, 6, "y", true);
        b.set(STEEL, 0, 0);
        // engines: intake, exhaust trunk with a lit nozzle, braces to the fuselage
        b.set(STEEL, 0);
        b.cyl(-1.6, 1.75, s * 3.4, 0.2, 0.34, 1.1, 6, "x", true);
        b.cyl(-0.1, 1.75, s * 3.4, 0.34, 0.26, 0.42, 6, "x", true);
        b.set(BLACK, 0);
        b.disc(0.33, 1.75, s * 3.4, 0.2, 6, "x", 1);
        b.set([1, 1, 1], 3);
        b.disc(-1.61, 1.75, s * 3.4, 0.15, 6, "x", -1);
        b.set(STEEL, 0);
        rod(b, [-0.4, 1.95, s * 1.1], [-0.4, 1.95, s * 3.0], 0.05, 4);
        rod(b, [0.1, 0.5, s * 1.4], [0.1, 1.3, s * 2.6], 0.05, 4);
        // twin tail fins with team flashes and navigation beacons
        b.set(P2);
        b.hull([[-4.3, 1.5], [-3.2, 1.5], [-3.9, 3.0], [-4.45, 3.0]], 0.06, 0.04, s * 0.95);
        b.set([1, 1, 1], 2);
        decal(b, qz(s * 1.0, -4.15, -3.75, 2.2, 2.45, s), 0.012);
        b.set(s > 0 ? [0.2, 1, 0.3] : RED, 5);
        b.box(-4.2, 3.05, s * 0.95, 0.05, 0.05, 0.05);
        // sides: door rail, windows, stringers, door sill chevrons, gun ammunition, markings
        b.set(GUN, 0);
        b.box(0, 1.66, s * 1.2, 1.1, 0.04, 0.05);
        for (const x of [-2.6, -1.7])
            win(b, [[[x, 1.15, s * Zu(1.15)], [x + 0.6, 1.15, s * Zu(1.15)], [x + 0.6, 1.5, s * Zu(1.5)], [x, 1.5, s * Zu(1.5)]], [x, 1.3, 0]], null);
        b.set(PANEL);
        for (const x of [-2.9, 1.2, 1.9])
            seam(b, [x, 0.15, s * 1.32], [x, 0.95, s * 1.44], [0, -0.15, s], 0.05);
        chevrons(b, [[[-0.7, 0.36, s * 1.354], [0.7, 0.36, s * 1.354], [0.7, 0.52, s * 1.378], [-0.7, 0.52, s * 1.378]], [0, 0.4, 0]], 5);
        b.set(OLIVE, 0);
        b.box(0.1, 0.8, s * 1.42, 0.12, 0.1, 0.08);
        markings(b, [[[-3.0, 0.3, s * 1.345], [-2.2, 0.3, s * 1.345], [-2.2, 0.7, s * 1.405], [-3.0, 0.7, s * 1.405]], [-2.6, 0.5, 0]]);
        // landing gear struts and pads; cockpit frame
        b.set(DARK, 0);
        rod(b, [1.4, 0.05, s * 1.1], [1.4, -0.18, s * 1.0], 0.035, 3);
        rod(b, [-1.0, 0.05, s * 1.1], [-1.0, -0.18, s * 1.0], 0.035, 3);
        b.box(1.95, -0.22, s * 1.0, 0.12, 0.03, 0.12);
        b.box(-1.55, -0.22, s * 1.0, 0.12, 0.03, 0.12);
        rod(b, [2.35, 1.65, s * 0.95], [3.2, 1.2, s * 0.6], 0.03, 3);
        rod(b, [2.78, 1.43, s * 0.775], [2.78, 1.585, 0], 0.03, 3);
    });
    b.set(P3);
    b.hull([[-4.35, 2.85], [-3.75, 2.85], [-3.85, 2.95], [-4.35, 2.95]], 1.0, 1.0); // tailplane between the fins
    b.set(DARK, 0);
    rod(b, [2.35, 1.86, 0], [3.2, 1.31, 0], 0.03, 3);
    // nose sensor and pitot; roof vents, a blade aerial, a winch boom over the right door
    b.set(GLASS, 0);
    b.ball(3.75, 0.5, 0, 0.14, 0);
    b.set(GUN, 0);
    rod(b, [3.8, 0.9, 0.2], [4.3, 0.9, 0.2], 0.015, 3);
    grille(b, qy(2.0, -2.6, -1.6, -0.5, 0.5), 4);
    b.set(P3);
    b.hull([[0.4, 2.0], [1.0, 2.0], [0.6, 2.42], [0.45, 2.42]], 0.02, 0.02);
    b.set(GUN, 0);
    rod(b, [0.0, 2.0, 0.7], [0.0, 2.12, 1.75], 0.05, 4);
    b.set(DARK, 0);
    rod(b, [0.0, 2.12, 1.7], [0.0, 1.75, 1.7], 0.015, 3);
    b.box(0.0, 1.72, 1.7, 0.04, 0.05, 0.04);
    // rear ramp: chevrons and rams; belly: cargo hook and thrust plates
    chevrons(b, qx(-4.02, -0.65, 0.65, 0.72, 0.95, -1), 5);
    b.mirrored((s) => { b.set(STEEL, 0); rod(b, [-3.9, 1.8, s * 0.8], [-4.05, 0.9, s * 0.78], 0.035, 4); });
    b.set(GUN, 0);
    b.box(0, -0.06, 0, 0.12, 0.06, 0.12);
    b.set([1, 1, 1], 3);
    b.disc(-1.8, -0.012, 0, 0.5, 6, "y", -1);
    b.disc(1.2, -0.012, 0, 0.45, 6, "y", -1);
}
// ---------------------------------------------------------------- G2: building detail
const R8 = Math.PI / 8, R6 = Math.PI / 6;
/** Detail on the gun tower's / control node's turning head (parts 1 and 2). */
function g2TowerHead(b, cannon = false) {
    b.part = 1;
    if (cannon) { // the cannon's sleeve bands
        b.set(STEEL, 0, 1);
        b.cyl(1.9, 9.3, 0, 0.34, 0.3, 0.4, 12, "x", false);
        b.set(DARK, 0, 2);
        for (const x of [3.3, 4.3])
            b.cyl(x, 9.3, 0, 0.235, 0.235, 0.12, 12, "x", false);
    }
    b.mirrored((s) => {
        if (cannon) {
            b.set(P3, 1, 1);
            panel(b, [[[-0.5, 8.6, s * 1.555], [1.1, 8.6, s * 1.555], [1.1, 10.0, s * 1.345], [-0.5, 10.0, s * 1.345]], [0, 9.3, 0]], 0.07, 0.1);
            b.set(OLIVE, 0, 1);
            b.cyl(-1.2, 9.0, s * 1.5, 0.4, 0.4, s * 0.35, 6, "z", true);
            return;
        }
        b.set(P3, 1, 1);
        panel(b, [[[-0.5, 8.6, s * 1.555], [1.1, 8.6, s * 1.555], [1.1, 10.0, s * 1.345], [-0.5, 10.0, s * 1.345]], [0, 9.3, 0]], 0.07, 0.1);
        b.set(OLIVE, 0, 1);
        b.cyl(-1.2, 9.0, s * 1.5, 0.4, 0.4, s * 0.35, 6, "z", true); // ammunition drums
        b.set(STEEL, 0, 1);
        b.cyl(1.9, 9.3, s * 0.5, 0.24, 0.2, 0.5, 6, "x", false); // barrel sleeves
        b.set(DARK, 0, 2);
        b.cyl(2.7, 9.3, s * 0.5, 0.185, 0.185, 0.12, 6, "x", false);
        b.cyl(3.5, 9.3, s * 0.5, 0.175, 0.175, 0.1, 6, "x", false); // barrel bands
    });
    sensorDome(b, -0.6, 10.3, 0.6, 0.32, 1);
    whip(b, -1.4, 10.3, -0.9, 1.6, RED, 1);
    hatch(b, 0.2, 10.3, -0.3, 0.3, 1);
    b.set(DARK, 0, 1);
    b.cyl(0.9, 10.5, 0.75, 0.2, 0.2, 0.35, 6, "x", true);
    b.set(LAMP, 4, 1);
    b.disc(1.26, 10.5, 0.75, 0.17, 6, "x", 1); // searchlight
    b.part = 0;
}
function g2Structure(b) {
    b.mirrored((s) => winRow(b, qz(s * 4.5, -4.4, 4.4, 2.2, 3.4, s), 4, (i) => (i % 2 ? WARMWIN : null)));
    acUnit(b, -1.2, 6.6, 0, 0.7, 0.6);
    sign(b, qx(5.0, -1.4, 1.4, 4.1, 4.7, 1));
    door(b, qx(-5.0, -0.5, 0.5, 0.5, 2.5, -1));
    whip(b, 2.4, 6.6, -2.2, 2.4);
}
function g2Tower(b) {
    const R = (y) => 2.6 - (y - 0.8) * 0.08;
    const F = (i, u0, u1, v0, v1) => fq(8, R8, 2.6, 2.0, 0.8, 7.5, i, u0, u1, v0, v1);
    // catwalk under the head with a rail and braces; ladder rungs; a conduit; door lamp, sign; lit slits; floodlights
    b.set(GUN, 0);
    b.cyl(0, 7.35, 0, 3.0, 3.0, 0.12, 8, "y", true, R8);
    railing(b, ringPts(2.9, 7.47, 8, R8), 0.85, true);
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        b.set(STEEL, 0);
        rod(b, [Math.cos(a) * R(6.2) * 0.95, 6.2, Math.sin(a) * R(6.2) * 0.95], [Math.cos(a) * 2.85, 7.35, Math.sin(a) * 2.85], 0.06, 3);
    }
    b.set(GUN, 0);
    for (let y = 1.3; y < 7.3; y += 0.7)
        rod(b, [-2.36, y, -0.3], [-2.36, y, 0.3], 0.022, 3);
    b.set(STEEL, 0);
    rod(b, [0, 0.9, R(0.9) * 0.94], [0, 7.3, R(7.3) * 0.94], 0.07, 4);
    b.set(OLIVE, 0);
    b.box(0, 1.6, R(1.6) * 0.95, 0.3, 0.4, 0.15);
    sign(b, F(7, 0.28, 0.72, 0.28, 0.36));
    b.set(LAMP, 4);
    decal(b, F(7, 0.4, 0.6, 0.235, 0.255));
    for (const i of [0, 2, 4, 6]) {
        b.set(LAMP, 4);
        decal(b, F(i, 0.43, 0.57, 0.3, 0.4));
        decal(b, F(i, 0.43, 0.57, 0.6, 0.7));
        b.set(CON2, 0);
        panel(b, F(i, 0.2, 0.8, 0.03, 0.12), 0.1, 0.1);
    }
    flood(b, [2.7, 7.2, 1.3], [1, -0.6, 0.4]);
    flood(b, [2.7, 7.2, -1.3], [1, -0.6, -0.4]);
}
function g2Mast(b) {
    const legs = [[-1.3, -1.3], [1.3, -1.3], [0, 1.5]];
    const L = (i, y) => { const f = 1 - ((y - 0.5) / 20.5) * 0.88; return [legs[i][0] * f, y, legs[i][1] * f]; };
    // zigzag bracing between the legs, sector antennas, a drum, a platform rail, a ladder, a cable, beacons
    b.set(GUN, 0);
    for (let k = 0; k < 5; k++)
        for (let i = 0; i < 3; i++)
            rod(b, L(i, k === 0 ? 0.6 : 3.5 + (k - 1) * 3.6), L((i + 1) % 3, 3.5 + k * 3.6), 0.045, 3);
    for (let i = 0; i < 3; i++) {
        const a = i * 2.094 + 0.5;
        b.set(CON, 0);
        b.box(Math.cos(a) * 0.72, 18.6, Math.sin(a) * 0.72, 0.1, 0.7, 0.1);
        b.set(GUN, 0);
        rod(b, [0, 18.6, 0], [Math.cos(a) * 0.72, 18.6, Math.sin(a) * 0.72], 0.03, 3);
    }
    b.set(CON, 0);
    b.cyl(-0.95, 14.2, -0.5, 0.45, 0.45, 0.3, 8, "x", true);
    railing(b, ringPts(1.2, 8.08, 6), 0.8, true);
    ladderAt(b, vadd(L(2, 0.7), [0, 0, 0.14]), vadd(L(2, 7.9), [0, 0, 0.14]), [1, 0, 0], 0.4, 0.8);
    b.set(STEEL, 0);
    rod(b, [-1.8, 2.7, 2.0], L(2, 5.2), 0.05, 3);
    beacon(b, 0, 21.58, 0, RED, 0.14);
    b.set(RED, 5);
    b.box(L(0, 12)[0], 12, L(0, 12)[2], 0.09, 0.09, 0.09);
    // equipment hut: door, window, machinery; generator: grille and exhaust
    door(b, qx(-0.6, 1.6, 2.4, 0.5, 2.15, 1));
    win(b, qz(3.1, -2.4, -1.6, 1.4, 2.0, 1), WARMWIN);
    acUnit(b, -1.9, 2.7, 2.0, 0.5, 0.4, 0.22);
    grille(b, qx(2.9, 1.45, 2.15, 0.75, 1.5, 1), 3);
    b.set(STEEL, 0);
    rod(b, [2.2, 1.7, 1.5], [2.2, 2.4, 1.5], 0.05, 4);
}
function g2Silo(b) {
    const F = (i, u0, u1, v0, v1) => fq(12, 0, 3.2, 3.2, 0.6, 8.6, i, u0, u1, v0, v1);
    railing(b, ringPts(3.5, 9.22, 12), 0.85, true);
    b.set(WALL2, 1);
    for (let i = 0; i < 12; i++) {
        const a = ((i + 0.5) / 12) * Math.PI * 2, c = Math.cos(a) * 3.14, s = Math.sin(a) * 3.14;
        if (i === 5 || i === 6 || i === 11 || i === 0)
            continue;
        rod(b, [c, 0.7, s], [c, 9.0, s], 0.09, 3);
    }
    // ladder cage, roof vent and beacon, level gauge, feed pipe, chute chevrons, control box, door, sign, floodlights
    b.set(GUN, 0);
    for (const y of [3, 5, 7, 8.8]) {
        rod(b, [-3.25, y, -0.35], [-3.8, y, -0.35], 0.025, 3);
        rod(b, [-3.8, y, -0.35], [-3.8, y, 0.35], 0.025, 3);
        rod(b, [-3.8, y, 0.35], [-3.25, y, 0.35], 0.025, 3);
    }
    rod(b, [-3.8, 3, -0.35], [-3.8, 8.8, -0.35], 0.025, 3);
    rod(b, [-3.8, 3, 0.35], [-3.8, 8.8, 0.35], 0.025, 3);
    b.set(STEEL, 0);
    b.cyl(1.2, 10.1, 0.8, 0.25, 0.25, 0.55, 6, "y", false);
    b.set(DARK, 0);
    b.cyl(1.2, 10.65, 0.8, 0.38, 0.3, 0.14, 6, "y", true);
    beacon(b, 0, 11.0, 0, RED, 0.12);
    b.set(DARK, 0);
    panel(b, F(1, 0.3, 0.7, 0.15, 0.85), 0.08, 0.05);
    b.set(ORE_A, 4);
    decal(b, F(1, 0.42, 0.58, 0.18, 0.6), 0.095);
    b.set(STEEL, 0);
    rod(b, [1.6, 10.2, 0], [3.6, 8.7, 0], 0.2, 6);
    chevrons(b, qx(4.1, -0.55, 0.55, 1.7, 2.3, 1), 4);
    b.set(OLIVE, 0);
    b.box(1.6, 1.4, -3.15, 0.4, 0.55, 0.2);
    b.set(COOLWIN, 4);
    decal(b, qz(-3.35, 1.35, 1.85, 1.5, 1.8, -1));
    door(b, F(8, 0.2, 0.8, 0, 0.25));
    sign(b, F(8, 0.12, 0.88, 0.31, 0.39));
    flood(b, [0, 9.0, 3.55], [0, -0.7, 0.7]);
    flood(b, [0, 9.0, -3.55], [0, -0.7, -0.7]);
}
function g2Extractor(b) {
    const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // derrick bracing, crown block and sheave, travelling block and drill string, beacon, ladder
    b.set(GUN, 0);
    for (let f = 0; f < 4; f++)
        for (let k = 0; k < 4; k++) {
            const [x0, z0] = C[f], [x1, z1] = C[(f + 1) % 4], ya = k === 0 ? 0.6 : 3.2 + (k - 1) * 2.2, yb = 3.2 + k * 2.2, fl = k % 2 === 0;
            rod(b, [(fl ? x0 : x1) * 1.7, ya, (fl ? z0 : z1) * 1.7], [(fl ? x1 : x0) * 1.7, yb, (fl ? z1 : z0) * 1.7], 0.05, 3);
        }
    b.set(STEEL, 0);
    b.box(0, 10.95, 0, 0.5, 0.2, 0.35);
    b.set(GUN, 0);
    b.cyl(0, 11.25, -0.1, 0.35, 0.35, 0.2, 8, "z", true);
    b.set(DARK, 0);
    rod(b, [0, 10.75, 0], [0, 7.2, 0], 0.03, 3);
    b.set(HAZARD, 0);
    b.box(0, 6.9, 0, 0.25, 0.3, 0.2);
    b.set(STEEL, 0);
    rod(b, [0, 6.6, 0], [0, 3.2, 0], 0.09, 5);
    beacon(b, 1.5, 10.75, 1.5, [0.3, 1, 0.5], 0.12);
    ladderAt(b, [1.82, 0.5, 0.9], [1.82, 10.6, 0.9], [0, 0, 1], 0.45, 0.9);
    // wellhead valves and a feed to the outlet pipe; a flare stack; the pump hut and its flywheel; plinth chevrons
    valve(b, 0.2, 1.3, 2.6, 0.25);
    valve(b, 1.3, 1.3, 2.6, 0.2);
    b.set(STEEL, 0);
    rod(b, [0.6, 1.3, 1.0], [0.6, 1.0, 2.6], 0.2, 6);
    b.set(STEEL, 0);
    rod(b, [3.6, 0.4, -3.6], [3.6, 8.5, -3.6], 0.1, 5);
    b.set(DARK, 0);
    b.cyl(3.6, 8.5, -3.6, 0.18, 0.14, 0.4, 6, "y", false);
    b.set(GASG, 4);
    b.cyl(3.6, 8.9, -3.6, 0.16, 0, 0.9, 5, "y", false);
    b.set(GUN, 0);
    rod(b, [3.6, 6.0, -3.6], [1.9, 0.4, -3.6], 0.02, 3);
    rod(b, [3.6, 6.0, -3.6], [3.6, 0.4, -1.9], 0.02, 3);
    door(b, qx(-4.0, 2.2, 3.0, 0.4, 2.05, -1));
    grille(b, qz(1.5, -3.6, -2.4, 1.4, 2.1, -1), 4);
    fan(b, -2.95, 2.6, 2.6, 0.45, 0.2);
    b.set(OLIVE, 0);
    b.box(-3.0, 0.9, 0.6, 0.5, 0.5, 0.4);
    b.set(HAZARD, 0);
    b.cyl(-3.0, 1.2, -0.02, 0.6, 0.6, 0.12, 8, "z", true);
    b.set(GUN, 0);
    b.cyl(-3.0, 1.2, -0.06, 0.15, 0.15, 0.2, 6, "z", true);
    chevrons(b, qy(0.4, -3.9, 3.9, 3.6, 3.95), 12);
    chevrons(b, qy(0.4, -3.9, 3.9, -3.95, -3.6), 12);
}
function g2Gastank(b) {
    const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    b.set(GUN, 0);
    for (let f = 0; f < 4; f++) {
        const [x0, z0] = C[f], [x1, z1] = C[(f + 1) % 4];
        rod(b, [x0 * 2.2, 0.6, z0 * 2.2], [x1 * 2.2, 3.8, z1 * 2.2], 0.06, 3);
        rod(b, [x1 * 2.2, 0.6, z1 * 2.2], [x0 * 2.2, 3.8, z0 * 2.2], 0.06, 3);
    }
    // catwalk rail, a ladder to it and on over the sphere, top valves and relief pipe, a beacon
    railing(b, ringPts(3.38, 4.4, 8, R8), 0.8, true);
    ladderAt(b, [3.55, 0.4, 0], [3.55, 4.4, 0], [0, 0, 1], 0.45, 0.7);
    const P = (deg) => { const t = (deg * Math.PI) / 180; return [3.47 * Math.cos(t), 5.6 + 3.47 * 0.92 * Math.sin(t), 0]; };
    for (const [d0, d1] of [[-20, 10], [10, 40], [40, 68], [68, 88]])
        ladderAt(b, P(d0), P(d1), [0, 0, 1], 0.45, 0.75);
    valve(b, 0.75, 8.5, 0, 0.22);
    valve(b, -0.2, 8.5, 0.7, 0.18);
    b.set(STEEL, 0);
    rod(b, [-0.5, 8.5, -0.5], [-0.5, 9.4, -0.5], 0.07, 4);
    rod(b, [-0.5, 9.4, -0.5], [-1.1, 9.4, -0.5], 0.07, 4);
    beacon(b, 0.5, 8.72, -0.6, [0.3, 1, 0.5], 0.1);
    // base: riser and valves, a gauge panel with a lit screen, bottles, a hazard diamond, plinth chevrons
    valve(b, -3.0, 1.12, 1.2, 0.25);
    valve(b, -1.8, 1.12, 1.2, 0.2);
    b.set(STEEL, 0);
    rod(b, [-1.0, 0.9, 1.2], [0, 2.6, 0], 0.2, 6);
    b.set(OLIVE, 0);
    b.box(2.6, 1.3, -3.4, 0.6, 0.9, 0.2);
    b.set([0.4, 1, 0.6], 4);
    decal(b, qz(-3.6, 2.2, 3.0, 1.5, 2.0, -1));
    b.set(DARK, 0);
    decal(b, qz(-3.6, 2.25, 2.5, 0.9, 1.15, -1));
    decal(b, qz(-3.6, 2.7, 2.95, 0.9, 1.15, -1));
    bottle(b, -3.2, 0.4, -3.2, 0.3, 1.5, [0.5, 0.2, 0.15]);
    bottle(b, -2.5, 0.4, -3.3, 0.3, 1.5, OLIVE);
    bottle(b, -3.3, 0.4, -2.5, 0.3, 1.3, STEEL);
    b.set(GUN, 0);
    rod(b, [3.6, 0.4, 3.0], [3.6, 1.7, 3.0], 0.04, 3);
    b.set(HAZARD, 0);
    b.cyl(3.6, 2.0, 2.98, 0.42, 0.42, 0.04, 4, "z", true);
    b.set(BLACK, 0);
    b.cyl(3.6, 2.0, 2.97, 0.2, 0.2, 0.06, 4, "z", true);
    chevrons(b, qy(0.4, -3.7, 3.7, 3.4, 3.75), 12);
    chevrons(b, qy(0.4, -3.7, 3.7, -3.75, -3.4), 12);
}
function g2Battery(b) {
    const F = (i, u0, u1, v0, v1) => fq(6, R6, 2.4, 2.1, 0.6, 2.6, i, u0, u1, v0, v1);
    door(b, F(2, 0.3, 0.7, 0, 0.7));
    grille(b, F(0, 0.25, 0.75, 0.25, 0.6), 4);
    grille(b, F(4, 0.25, 0.75, 0.25, 0.6), 4);
    sign(b, F(5, 0.2, 0.8, 0.3, 0.58));
    b.set(STEEL, 0);
    rod(b, vlerp(F(1, 0.5, 0.5, 0, 0)[0][0], [0, 0.6, 0], -0.03), vlerp(F(1, 0.5, 0.5, 1, 1)[0][0], [0, 3.2, 0], -0.03), 0.07, 4);
    // launcher: yoke arms, rams, side seams and chevrons, a rear blast grille, reload hatches, a tracker dish, an aerial
    b.part = 1;
    b.mirrored((s) => {
        b.set(GUN, 0, 1);
        b.hull([[-0.5, 3.3], [0.5, 3.3], [0.3, 4.6], [-0.3, 4.6]], 0.12, 0.12, s * 1.52);
        b.set(STEEL, 0, 1);
        rod(b, [-0.4, 3.5, s * 1.5], [-1.2, 4.6, s * 1.5], 0.07, 4);
        b.set(PANEL, 1, 1);
        for (const x of [-0.85, 0.95])
            seam(b, [x, 4.05 + (x + 1.6) * 0.156, s * 1.4], [x, 5.4 + (x + 1.6) * 0.156, s * 1.4], [0, 0, s], 0.1, 0.02);
        chevrons(b, qz(s * 1.4, -1.5, -1.0, 4.15, 4.4, s), 3);
        b.set(P3, 1, 1);
        panel(b, [[[-0.2, 5.72, s > 0 ? 0.15 : -1.1], [-0.2, 5.72, s > 0 ? 1.1 : -0.15], [1.3, 5.953, s > 0 ? 1.1 : -0.15], [1.3, 5.953, s > 0 ? 0.15 : -1.1]], [0.5, 4, 0]], 0.05, 0.1);
    });
    grille(b, qx(-1.6, -1.1, 1.1, 4.1, 5.3, -1), 5);
    b.set(STEEL, 0, 1);
    rod(b, [-0.9, 5.6, 0.6], [-0.9, 6.35, 0.6], 0.05, 4);
    b.set(CON, 0, 1);
    b.cyl(-0.97, 6.35, 0.6, 0.08, 0.4, 0.15, 8, "x", true);
    whip(b, -1.2, 5.56, -0.8, 1.2, RED, 1);
    b.part = 0;
}
function g2Reactor(b) {
    // coolant ring main with risers, lit slits in the drum, a dome vent with a hot glow
    const ring = ringPts(4.3, 4.6, 16, Math.PI / 16);
    b.set(STEEL, 0);
    for (let i = 0; i < 16; i++)
        rod(b, ring[i], ring[(i + 1) % 16], 0.14, 4);
    for (let k = 0; k < 8; k += 2) {
        const a = Math.PI / 8 + (k * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
        b.set(STEEL, 0);
        rod(b, [c * 4.55, 1.0, s * 4.55], [c * 4.3, 4.6, s * 4.3], 0.12, 4);
        valve(b, c * 4.9, 1.0, s * 4.9, 0.22);
    }
    for (let i = 1; i < 10; i += 2) {
        b.set(COOLWIN, 4);
        decal(b, fq(10, 0, 4.3, 3.9, 1.0, 5.4, i, 0.35, 0.65, 0.74, 0.84));
    }
    b.set(STEEL, 0);
    b.cyl(0, 8.75, 0, 0.7, 0.55, 0.85, 8, "y", false);
    b.set(DARK, 0);
    b.cyl(0, 9.5, 0, 0.62, 0.62, 0.14, 8, "y", false);
    b.set([0.6, 1, 0.9], 4);
    b.disc(0, 9.58, 0, 0.5, 8, "y", 1);
    // stacks: bands, hazard collars, ladders, beacons
    b.mirrored((s) => {
        b.set(GUN, 0);
        for (const y of [4, 7]) {
            const r = 0.8 - ((y - 1) / 9) * 0.096 + 0.05;
            b.cyl(-1.5, y, s * 5.2, r, r, 0.18, 8, "y", false);
        }
        b.set(HAZARD, 0);
        b.cyl(-1.5, 9.2, s * 5.2, 0.76, 0.75, 0.4, 8, "y", false);
        ladderAt(b, [-1.5, 1.2, s * 6.04], [-1.5, 10.0, s * 5.95], [1, 0, 0], 0.45, 0.9);
        beacon(b, -1.5, 10.32, s * 5.2, RED, 0.14);
        flood(b, [3.2, 6.2, s * 3.0], [0.6, -0.6, s * 0.5]);
    });
    // door frame, lamp and sign, threshold chevrons; a transformer bank with insulators and cables
    b.set(STEEL, 0);
    b.box(4.25, 3.15, 0, 0.18, 0.14, 1.15);
    b.mirrored((s) => b.box(4.3, 2.0, s * 1.02, 0.14, 1.05, 0.12));
    b.set(LAMP, 4);
    b.box(4.45, 3.15, 0, 0.03, 0.06, 0.5);
    sign(b, qx(4.1, -1.0, 1.0, 4.25, 4.85, 1));
    chevrons(b, [[[4.5, 1.0, -1.0], [4.5, 1.0, 1.0], [5.3, 1.0, 1.0], [5.3, 1.0, -1.0]], [4.9, -1, 0]], 5);
    for (const z of [-1.3, 0, 1.3]) {
        b.set(OLIVE, 0);
        b.box(-4.9, 1.45, z, 0.3, 0.45, 0.45);
        grille(b, qx(-5.2, z - 0.36, z + 0.36, 1.12, 1.78, -1), 4);
        b.set(CON, 0);
        b.cyl(-4.9, 1.9, z, 0.09, 0.05, 0.3, 5, "y", false);
        b.set(DARK, 0);
        rod(b, [-4.9, 2.2, z], [-4.15, 3.0, z * 0.8], 0.02, 3);
    }
}
function g2Core(b) {
    const LK = (i, u0, u1, v0, v1) => fq(8, R8, 6.6, 5.7, 0.8, 4.6, i, u0, u1, v0, v1);
    const UK = (i, u0, u1, v0, v1) => fq(8, R8, 3.6, 3.0, 6.3, 4.8, i, u0, u1, v0, v1);
    // lower keep: windows; upper keep: lit window bands, team banners, mullions on the glazed ring, a ladder
    for (let i = 0; i < 8; i++) {
        win(b, LK(i, 0.2, 0.42, 0.6, 0.78), i % 3 === 0 ? null : WARMWIN);
        win(b, LK(i, 0.58, 0.8, 0.6, 0.78), i % 3 === 1 ? null : WARMWIN);
        if (i % 2 === 0) {
            b.set(WARMWIN, 4);
            decal(b, UK(i, 0.18, 0.82, 0.3, 0.44));
            b.set(GUN, 0);
            decal(b, UK(i, 0.48, 0.52, 0.3, 0.44), 0.03);
        }
        else {
            b.set([1, 1, 1], 2);
            decal(b, UK(i, 0.4, 0.6, 0.04, 0.5));
        }
        const a = R8 + (i * Math.PI) / 4;
        b.set(GUN, 0);
        rod(b, [Math.cos(a) * 3.15, 9.6, Math.sin(a) * 3.15], [Math.cos(a) * 3.09, 10.3, Math.sin(a) * 3.09], 0.07, 3);
    }
    ladderAt(b, [-3.4, 6.35, 0], [-2.86, 11.5, 0], [0, 0, 1], 0.5, 0.8);
    // terrace on the lower roof: a rail, machinery, a dish, searchlights
    railing(b, ringPts(4.45, 6.32, 8, R8), 0.9, true);
    acUnit(b, 0, 6.32, 4.0, 0.6, 0.38, 0.3);
    fan(b, 0, 6.32, -4.0, 0.42, 0.25);
    b.set(STEEL, 0);
    rod(b, [-4.0, 6.32, 0.9], [-4.0, 7.2, 0.9], 0.06, 4);
    b.set(CON, 0);
    b.cyl(-4.12, 7.3, 0.9, 0.1, 0.6, 0.2, 8, "x", true);
    b.mirrored((s) => { b.set(STEEL, 0); rod(b, [4.05, 6.32, s * 1.6], [4.05, 6.9, s * 1.6], 0.05, 4); flood(b, [4.05, 7.0, s * 1.6], [1, -0.35, s * 0.4]); });
    // roof: a rail, a radar bar, a fan, a beacon above the aerial
    railing(b, ringPts(3.15, 11.6, 8, R8), 0.7, true, GUN, false);
    b.set(STEEL, 0);
    rod(b, [-1.6, 11.6, -1.4], [-1.6, 12.8, -1.4], 0.07, 4);
    b.set(CON, 0);
    b.box(-1.6, 12.9, -1.4, 0.9, 0.16, 0.1);
    b.set(GUN, 0);
    b.box(-1.6, 12.9, -1.5, 0.6, 0.1, 0.05);
    fan(b, 0.6, 11.6, 1.9, 0.4, 0.25);
    beacon(b, -1.0, 17.55, 1.0, RED, 0.14);
    // gates: portal posts, lintel, sign, lamps, chevrons on the steel ring; team lamps on the buttresses
    b.mirrored((sg) => {
        b.set(STEEL, 0);
        b.box(sg * 6.0, 3.52, 0, 0.42, 0.2, 2.15);
        for (const z of [-1.95, 1.95]) {
            b.set(STEEL, 0);
            b.box(sg * 6.05, 2.05, z, 0.36, 1.25, 0.2);
            b.set(LAMP, 4);
            b.box(sg * 6.43, 3.0, z, 0.04, 0.12, 0.1);
        }
        sign(b, qx(sg * 5.5, -1.5, 1.5, 3.95, 4.5, sg));
        chevrons(b, [[[sg * 6.7, 0.8, -1.4], [sg * 6.7, 0.8, 1.4], [sg * 7.9, 0.8, 1.4], [sg * 7.9, 0.8, -1.4]], [sg * 7.3, -1, 0]], 6);
    });
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        b.set([1, 1, 1], 2);
        b.box(Math.cos(a) * 7.15, 2.6, Math.sin(a) * 7.15, 0.12, 0.12, 0.12);
    }
}
function g2Foundry(b) {
    const FURN = [1, 0.6, 0.25];
    // furnace-lit clerestory, hall windows between the pilasters, a pipe run
    b.mirrored((s) => winRow(b, qz(s * 3.3, -4.4, 3.8, 6.62, 7.12, s), 7, (i) => (i % 4 === 3 ? null : FURN)));
    for (const [x, lit] of [[-3.05, 0], [0.05, 1], [3.15, 0]])
        win(b, qz(4.6, x - 0.9, x + 0.9, 2.6, 3.8, 1), lit ? WARMWIN : null);
    for (const x of [0.05, 3.15])
        win(b, qz(-4.6, x - 0.9, x + 0.9, 2.6, 3.8, -1), x > 1 ? WARMWIN : null);
    b.set(STEEL, 0);
    rod(b, [-6.2, 4.7, 4.95], [4.6, 4.7, 4.95], 0.14, 5);
    rod(b, [4.6, 4.7, 4.95], [4.6, 0.5, 4.95], 0.14, 5);
    b.set(GUN, 0);
    for (const x of [-4.6, -1.5, 1.6])
        b.box(x, 4.7, 4.85, 0.06, 0.2, 0.14);
    // roof: fans in the vent housings, machinery, skylights, a rail
    for (const x of [-3.2, 0, 3.2])
        fan(b, x, 8.8, 0.8, 0.62, 0.12);
    acUnit(b, 2.6, 7.6, -1.8, 0.7, 0.5, 0.3);
    win(b, qy(7.6, -4.0, -2.2, -2.6, -1.4), null);
    win(b, qy(7.6, -1.6, 0.2, -2.6, -1.4), FURN);
    railing(b, [[-6.3, 6.4, 4.3], [-3.1, 6.4, 4.3], [0.1, 6.4, 4.3], [3.3, 6.4, 4.3], [6.3, 6.4, 4.3]], 0.8);
    // stack: bands, a ladder, a hot rim, a beacon; a second flue
    b.set(GUN, 0);
    for (const y of [8.5, 10.8]) {
        const r = 0.7 - ((y - 6.4) / 6.5) * 0.084 + 0.04;
        b.cyl(-5.2, y, 3.2, r, r, 0.18, 8, "y", false);
    }
    ladderAt(b, [-5.2, 6.4, 3.97], [-5.2, 12.8, 3.89], [1, 0, 0], 0.45, 0.9);
    b.set([1, 0.5, 0.15], 4);
    b.disc(-5.2, 13.22, 3.2, 0.5, 8, "y", 1);
    beacon(b, -5.2, 13.2, 2.5, RED, 0.12);
    stack(b, -5.7, 6.4, 1.6, 0.32, 3.0);
    // bay door: a bay sign, warning beacons, threshold chevrons
    sign(b, qx(6.6, -1.6, 1.6, 5.62, 6.22, 1));
    b.mirrored((s) => beacon(b, 6.6, 5.0, s * 2.98, AMBER, 0.12));
    chevrons(b, [[[6.75, 0.5, -2.8], [6.75, 0.5, 2.8], [7.6, 0.5, 2.8], [7.6, 0.5, -2.8]], [7, -1, 0]], 8);
    // back wall: grilles and a door; annex: windows and machinery; drum: a band and a hatch
    grille(b, qx(-6.6, -3.4, -1.4, 3.2, 4.6, -1), 5);
    grille(b, qx(-6.6, 1.2, 3.2, 3.2, 4.6, -1), 5);
    door(b, qx(-6.6, -0.5, 0.5, 0.5, 2.5, -1));
    winRow(b, qz(-8.5, -5.8, -2.0, 2.2, 3.2, -1), 3, (i) => (i === 1 ? WARMWIN : null));
    acUnit(b, -2.2, 4.5, -7.6, 0.45, 0.4, 0.28);
    b.set(GUN, 0);
    b.cyl(-3.9, 5.5, -6.5, 1.33, 1.33, 0.14, 8, "y", false);
    hatch(b, -3.9, 6.7, -6.5, 0.4);
}
function g2Barracks(b) {
    const A = (deg, r = 3.7) => [0.5 + r * Math.sin((deg * Math.PI) / 180), r * Math.cos((deg * Math.PI) / 180)];
    // front wall: lit windows, a sign, porch posts, a step; rear wall: a vent, a door, machinery
    win(b, qx(6.2, 1.7, 2.7, 1.4, 2.3, 1), WARMWIN);
    win(b, qx(6.2, -2.7, -1.7, 1.4, 2.3, 1), WARMWIN);
    sign(b, qx(6.2, -1.3, 1.3, 3.4, 3.9, 1));
    b.mirrored((s) => { b.set(GUN, 0); rod(b, [7.65, 0.5, s * 1.85], [7.65, 3.1, s * 1.85], 0.06, 4); });
    b.set(CON2, 0);
    b.box(7.0, 0.56, 0, 0.7, 0.06, 1.3);
    b.set(STEEL, 0);
    panel(b, qx(-6.2, -0.65, 0.65, 2.35, 3.45, -1), 0.06, 0.06);
    grille(b, qx(-6.26, -0.55, 0.55, 2.45, 3.35, -1), 4);
    door(b, qx(-6.2, 1.2, 2.0, 0.5, 2.3, -1));
    b.set(STEEL, 0);
    b.box(-6.7, 1.0, -1.6, 0.4, 0.5, 0.6);
    grille(b, qx(-7.1, -2.1, -1.1, 0.7, 1.35, -1), 3);
    // roof: ridge vents, skylights, lamps along the base, a dish
    const [y0, z0] = A(55), [y1, z1] = A(68);
    for (const x of [-2.9, 0.1, 3.1]) {
        b.set(STEEL, 0);
        b.box(x, 4.3, 0.9, 0.5, 0.18, 0.35);
        grille(b, qz(1.25, x - 0.4, x + 0.4, 4.16, 4.44, 1), 2);
        b.mirrored((s) => { win(b, [[[x - 0.6, y0 + 0.03, s * (z0 + 0.03)], [x + 0.6, y0 + 0.03, s * (z0 + 0.03)], [x + 0.6, y1 + 0.03, s * (z1 + 0.03)], [x - 0.6, y1 + 0.03, s * (z1 + 0.03)]], [x, 0.5, 0]], x === 0.1 ? WARMWIN : null); });
    }
    b.mirrored((s) => { b.set(LAMP, 4); for (const x of [-4.5, -1.5, 1.5, 4.5])
        decal(b, qz(s * 3.71, x - 0.5, x + 0.5, 0.8, 0.9, s), 0.02); });
    b.set(CON, 0);
    b.cyl(-5.4, 4.7, -1.2, 0.08, 0.45, 0.18, 8, "x", true);
    beacon(b, 6.6, 8.5, 3.8, RED, 0.08);
}
function g2Armoury(b) {
    const Z = (y) => 4.6 - (y - 0.5) * 0.1569;
    const S = (x0, x1, y0, y1, s) => [[[x0, y0, s * Z(y0)], [x1, y0, s * Z(y0)], [x1, y1, s * Z(y1)], [x0, y1, s * Z(y1)]], [(x0 + x1) / 2, (y0 + y1) / 2, 0]];
    b.mirrored((s) => {
        // blast shutters, a hazard band along the base, a vent; gantry: beacons, floodlights, braces
        for (const x0 of [-5.4, -2.6, 0.2, 3.0]) {
            b.set(WALL2, 1);
            panel(b, S(x0, x0 + 2.2, 1.0, 3.0, s), 0.1, 0.06);
            b.set(GUN, 0);
            decal(b, qsub(S(x0, x0 + 2.2, 1.0, 3.0, s), 0.47, 0.53, 0.12, 0.88), 0.11);
        }
        chevrons(b, S(-5.8, 5.6, 0.55, 0.85, s), 16);
        grille(b, S(1.0, 2.0, 4.1, 4.7, s), 3);
        beacon(b, 8.5, 6.7, s * 3.6, AMBER, 0.12);
        flood(b, [7.6, 6.3, s * 3.3], [-0.2, -1, -s * 0.3]);
        b.set(STEEL, 0);
        rod(b, [8.5, 5.0, s * 3.6], [7.2, 6.5, s * 3.6], 0.07, 4);
    });
    // roof: armoured hatches, machinery, an aerial; trolley on the gantry
    b.set(CON2, 0);
    panel(b, qy(5.6, -3.6, -1.6, -1.4, 1.4), 0.12, 0.08);
    panel(b, qy(5.6, 1.0, 3.0, -1.4, 1.4), 0.12, 0.08);
    acUnit(b, -0.3, 5.6, 2.4, 0.6, 0.5, 0.3);
    whip(b, -4.0, 5.6, -3.0, 2.2);
    b.set(GUN, 0);
    b.box(6.5, 6.98, 0, 0.4, 0.14, 0.5);
    b.cyl(6.5, 7.05, -0.4, 0.22, 0.22, 0.8, 6, "z", true);
    // a sign on the front slope; rear: a door and grilles; a rack of shells
    sign(b, [[[5.75, 4.08, -1.6], [5.75, 4.08, 1.6], [5.05, 4.87, 1.6], [5.05, 4.87, -1.6]], [0, 3, 0]]);
    door(b, qx(-6.2, -0.5, 0.5, 0.5, 2.4, -1));
    grille(b, qx(-6.2, 1.5, 3.3, 2.2, 3.2, -1), 4);
    grille(b, qx(-6.2, -3.3, -1.5, 2.2, 3.2, -1), 4);
    for (let i = 0; i < 4; i++) {
        const y = 0.72 + Math.floor(i / 2) * 0.42, z = -3.0 + (i % 2) * 0.45;
        b.set(OLIVE, 0);
        b.cyl(-8.4, y, z, 0.18, 0.18, 1.1, 6, "x", true);
        b.set(HAZARD, 0);
        b.cyl(-7.3, y, z, 0.18, 0.03, 0.3, 6, "x", false);
    }
}
function g2Techlab(b) {
    // dome: meridian ribs, mullions on the glazed ring, an apex sensor, a ring of light
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.26, P = (t) => [-1.4 + Math.cos(a) * 3.04 * Math.cos(t), 5.85 + 3.04 * 0.55 * Math.sin(t), Math.sin(a) * 3.04 * Math.cos(t)];
        b.set(STEEL, 0);
        rod(b, P(0.08), P(0.5), 0.06, 3);
        rod(b, P(0.5), P(0.95), 0.06, 3);
        rod(b, P(0.95), P(1.4), 0.06, 3);
    }
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        b.set(GUN, 0);
        rod(b, [-1.4 + Math.cos(a) * 3.28, 5.2, Math.sin(a) * 3.28], [-1.4 + Math.cos(a) * 3.03, 5.9, Math.sin(a) * 3.03], 0.05, 3);
    }
    sensorDome(b, -1.4, 7.46, 0, 0.35);
    b.set([0.5, 0.9, 1.0], 4);
    b.cyl(-1.4, 4.98, 0, 3.36, 3.36, 0.1, 12, "y", false);
    // hall: cool-lit windows; gas tanks at the back; fume stacks, machinery and aerials on the roof; a solar array on the side module
    b.mirrored((s) => winRow(b, qz(s * 4.0, -5.0, 2.8, 2.0, 3.0, s), 5, (i) => ((i + (s > 0 ? 0 : 1)) % 2 ? COOLWIN : null)));
    bottle(b, -6.3, 0.5, -1.6, 0.5, 2.6, CON);
    bottle(b, -6.3, 0.5, -0.3, 0.5, 2.6, CON);
    b.set(STEEL, 0);
    rod(b, [-6.3, 2.2, -1.6], [-5.6, 2.2, -1.6], 0.1, 4);
    rod(b, [-6.3, 2.2, -0.3], [-5.6, 2.2, -0.3], 0.1, 4);
    valve(b, -6.3, 3.4, -1.6, 0.2);
    door(b, qx(-5.6, 1.4, 2.3, 0.5, 2.4, -1));
    stack(b, 2.6, 4.6, -2.9, 0.2, 1.5);
    stack(b, 2.6, 4.6, -2.1, 0.2, 1.1);
    acUnit(b, 2.6, 4.6, 0.6, 0.55, 0.5, 0.28);
    whip(b, -4.9, 4.6, 3.2, 2.5, null);
    whip(b, -4.3, 4.6, 3.3, 1.8, null);
    beacon(b, 1.6, 8.85, 2.6, RED, 0.1);
    const m = b.mark();
    for (const z of [-1.4, 0, 1.4]) {
        b.set(SOLAR, 0);
        b.box(4.8, 3.8, z, 1.0, 0.03, 0.62);
        b.set(GUN, 0);
        seam(b, [3.8, 3.83, z], [5.8, 3.83, z], [0, 1, 0], 0.04, 0.004);
        seam(b, [4.8, 3.83, z - 0.62], [4.8, 3.83, z + 0.62], [0, 1, 0], 0.04, 0.004);
    }
    b.rotZ(m, 0.3, 4.8, 3.8);
    b.set(GUN, 0);
    for (const z of [-2.0, 2.0]) {
        rod(b, [4.1, 3.2, z], [4.1, 3.6, z], 0.04, 3);
        rod(b, [5.5, 3.2, z], [5.5, 4.0, z], 0.04, 3);
    }
}
function g2Refinery(b) {
    for (const [x, z] of [[-3.8, -2.2], [-3.8, 2.4]]) {
        // tanks: top rail, a level gauge, a ladder, a hatch, a band
        railing(b, ringPts(2.02, 7.7, 6, 0.3, x, z), 0.7, true, GUN, false);
        const Q = fq(10, 0, 2.1, 2.1, 0.5, 7.2, 0, 0.3, 0.7, 0.1, 0.7, x, z);
        b.set(DARK, 0);
        panel(b, Q, 0.08, 0.05);
        b.set(ORE_A, 4);
        decal(b, qsub(Q, 0.3, 0.7, 0.05, z > 0 ? 0.7 : 0.45), 0.095);
        ladderAt(b, [x - 2.18, 0.5, z], [x - 2.18, 7.9, z], [0, 0, 1], 0.45, 0.9);
        hatch(b, x, 8.62, z, 0.4);
        b.set(GUN, 0);
        b.cyl(x, 4.0, z, 2.14, 2.14, 0.12, 10, "y", false);
    }
    // a pipe bridge over the tank tops with a valve; the stack: bands, hot rim, beacon
    b.set(STEEL, 0);
    rod(b, [-3.8, 8.6, -2.2], [-3.8, 9.25, -2.2], 0.14, 5);
    rod(b, [-3.8, 9.25, -2.2], [-3.8, 9.25, 2.4], 0.14, 5);
    rod(b, [-3.8, 9.25, 2.4], [-3.8, 8.6, 2.4], 0.14, 5);
    valve(b, -3.8, 9.3, 0.1, 0.25);
    b.set(GUN, 0);
    for (const y of [4, 7]) {
        const r = 0.55 - ((y - 0.5) / 9.5) * 0.066 + 0.04;
        b.cyl(-6.4, y, 0, r, r, 0.16, 8, "y", false);
    }
    b.set([1, 0.5, 0.15], 4);
    b.disc(-6.4, 10.32, 0, 0.42, 8, "y", 1);
    beacon(b, -6.4, 10.3, 0.55, RED, 0.12);
    // hopper: chevrons, leg braces, a vibrator motor, a downspout
    for (const i of [0, 2, 4, 6])
        chevrons(b, fq(8, R8, 1.0, 2.4, 4.5, 2.4, i, 0.1, 0.9, 0.55, 0.82, 2.0, 0), 3);
    b.set(GUN, 0);
    for (const z of [-1.3, 1.3]) {
        rod(b, [0.8, 0.6, z], [3.2, 3.6, z], 0.05, 3);
        rod(b, [3.2, 0.6, z], [0.8, 3.6, z], 0.05, 3);
    }
    b.set(OLIVE, 0);
    b.box(2.0, 4.2, -1.25, 0.3, 0.25, 0.25);
    b.set(STEEL, 0);
    b.cyl(2.0, 3.3, 0, 0.35, 0.55, 1.2, 6, "y", false);
    // conveyor: side rails and rollers (pitched with the belt), trestle legs
    const m = b.mark();
    b.mirrored((s) => { b.set(HAZARD, 0); b.box(5.95, 3.78, s * 0.72, 3.95, 0.1, 0.03); });
    b.set(GUN, 0);
    for (let i = 0; i < 6; i++)
        b.cyl(2.6 + i * 1.3, 3.36, -0.75, 0.09, 0.09, 1.5, 5, "z", false);
    b.rotZ(m, -0.866, 5.95, 3.5);
    b.set(STEEL, 0);
    b.mirrored((s) => { rod(b, [5.6, 0.5, s * 0.8], [5.95, 3.4, s * 0.7], 0.06, 4); rod(b, [4.6, 0.5, s * 0.8], [4.95, 4.6, s * 0.7], 0.06, 4); });
    // control hut: door, fan, sign; a floodlight; drums
    door(b, qx(2.0, 3.6, 4.4, 0.5, 2.15, -1));
    fan(b, 3.8, 2.7, 4.0, 0.45, 0.2);
    sign(b, qz(5.4, 2.6, 5.0, 1.5, 2.1, 1));
    flood(b, [-1.7, 7.0, 0.1], [1, -0.6, 0]);
    for (let i = 0; i < 3; i++) {
        b.set([0.48, 0.24, 0.17], 0);
        b.cyl(5.6 + i * 0.85, 0.5, -4.5, 0.38, 0.38, 1.1, 6, "y", true);
        b.set(DARK, 0);
        b.cyl(5.6 + i * 0.85, 1.0, -4.5, 0.395, 0.395, 0.08, 6, "y", false);
    }
}
/** Pad surface markings shared by the Air Pad and the Launch Pad Uplink: blinking edge lights and lit radial strips. */
function g2PadBase(b) {
    for (let i = 0; i < 12; i += 2) {
        const a = (i / 12) * Math.PI * 2;
        b.set([0.3, 1, 0.45], 5);
        b.box(Math.cos(a) * 7.8, 0.7, Math.sin(a) * 7.8, 0.1, 0.05, 0.1);
    }
    for (let i = 0; i < 8; i++) {
        const a = R8 + (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
        b.set(LAMP, 4);
        seam(b, [c * 6.2, 0.5, s * 6.2], [c * 7.0, 0.5, s * 7.0], [0, 1, 0], 0.14, 0.02);
    }
}
function g2Pad(b) {
    g2PadBase(b);
    // pad markings: a dashed circle, approach chevrons, a pad number
    const P = (r, a) => [Math.cos(a) * r, 0.5, Math.sin(a) * r];
    b.set(MARK, 0);
    for (let i = 0; i < 12; i++) {
        const a0 = ((i + 0.15) / 12) * Math.PI * 2, a1 = ((i + 0.85) / 12) * Math.PI * 2;
        decal(b, [[P(5.3, a0), P(5.3, a1), P(5.6, a1), P(5.6, a0)], [0, -1, 0]], 0.02);
    }
    chevrons(b, [[[6.0, 0.5, -1.2], [6.0, 0.5, 1.2], [6.9, 0.5, 1.2], [6.9, 0.5, -1.2]], [6.4, -1, 0]], 4);
    chevrons(b, qy(0.5, -1.2, 1.2, 6.0, 6.9), 4);
    chevrons(b, qy(0.5, -1.2, 1.2, -6.9, -6.0), 4);
    markings(b, qy(0.5, -4.4, -3.2, 3.0, 3.7));
    // control tower: gallery with a rail, cab mullions, lit slits, a door, a ladder, floodlights; radar and aerials on the roof
    const T = (i, u0, u1, v0, v1) => fq(8, R8, 1.4, 1.1, -0.5, 7.0, i, u0, u1, v0, v1, -10, 4);
    b.set(GUN, 0);
    b.cyl(-10, 6.82, 4, 2.55, 2.55, 0.08, 8, "y", true, R8);
    railing(b, ringPts(2.45, 6.9, 8, R8, -10, 4), 0.8, true);
    for (let i = 0; i < 8; i++) {
        const a = R8 + (i * Math.PI) / 4;
        b.set(GUN, 0);
        rod(b, [-10 + Math.cos(a) * 2.02, 6.9, 4 + Math.sin(a) * 2.02], [-10 + Math.cos(a) * 2.12, 8.1, 4 + Math.sin(a) * 2.12], 0.06, 3);
    }
    door(b, T(7, 0.22, 0.78, 0.145, 0.42));
    for (const i of [5, 3, 1]) {
        b.set(LAMP, 4);
        decal(b, T(i, 0.4, 0.6, 0.5, 0.6));
        decal(b, T(i, 0.4, 0.6, 0.72, 0.82));
    }
    ladderAt(b, [-10, 0.5, 5.38], [-10, 6.8, 5.14], [1, 0, 0], 0.45, 0.9);
    flood(b, [-8.1, 6.6, 3.2], [1, -0.55, -0.3]);
    flood(b, [-8.1, 6.6, 4.8], [1, -0.55, 0.05]);
    b.set(STEEL, 0);
    rod(b, [-10.6, 8.6, 3.4], [-10.6, 9.4, 3.4], 0.05, 4);
    b.set(CON, 0);
    b.box(-10.6, 9.5, 3.4, 0.7, 0.12, 0.08);
    whip(b, -9.3, 8.6, 4.8, 1.7, RED);
    whip(b, -9.5, 8.6, 3.3, 1.0, null);
    // fuel farm: bands, a valve, a pump with a lit gauge, a hazard diamond; a ground power cart; blast fences; windsock beacon
    for (const z of [-3.6, -5.4]) {
        b.set(DARK, 0);
        for (const x of [-9.6, -7.6])
            b.cyl(x, 0.6, z, 0.83, 0.83, 0.15, 8, "x", false);
    }
    valve(b, -8.5, 1.4, -3.6, 0.22);
    b.set(OLIVE, 0);
    b.box(-10.9, 0.6, -2.0, 0.3, 0.6, 0.4);
    b.set([0.4, 1, 0.6], 4);
    decal(b, qx(-10.6, -2.2, -1.8, 0.7, 1.0, 1));
    b.set(DARK, 0);
    rod(b, [-10.6, 0.5, -2.0], [-8.4, 0.56, -1.6], 0.04, 3);
    b.set(HAZARD, 0);
    b.cyl(-11.0, 1.9, -4.5, 0.45, 0.45, 0.04, 4, "x", true);
    b.set(GUN, 0);
    rod(b, [-11.0, 0, -4.5], [-11.0, 1.5, -4.5], 0.04, 3);
    b.set(OLIVE, 0);
    b.box(3.5, 0.9, -5.4, 0.7, 0.32, 0.45);
    b.set(HAZARD, 0);
    b.box(3.5, 0.75, -5.4, 0.71, 0.05, 0.46);
    b.set(RUBBER, 0);
    for (const x of [3.0, 4.0])
        b.box(x, 0.62, -5.4, 0.16, 0.12, 0.5);
    b.set(DARK, 0);
    rod(b, [2.8, 0.9, -5.2], [1.6, 0.53, -3.6], 0.03, 3);
    for (const z of [-1.5, 1.5]) {
        const m = b.mark();
        b.set(CON2, 0);
        b.box(-8.25, 1.25, z, 0.08, 0.8, 1.3);
        chevrons(b, qx(-8.17, z - 1.2, z + 1.2, 1.5, 1.9, 1), 5);
        b.rotZ(m, -0.3, -8.25, 0.5);
    }
    beacon(b, 9.6, 5.0, -4.4, RED, 0.08);
}
function g2Uplink(b) {
    g2PadBase(b);
    // pad: a ring of light, cross-hairs, four emitter pylons
    const P = (r, a) => [Math.cos(a) * r, 0.5, Math.sin(a) * r];
    b.set([1, 1, 1], 3);
    for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
        decal(b, [[P(2.8, a0), P(2.8, a1), P(3.05, a1), P(3.05, a0)], [0, -1, 0]], 0.02);
    }
    b.set(MARK, 0);
    seam(b, [-2.4, 0.5, 0], [2.4, 0.5, 0], [0, 1, 0], 0.16, 0.02);
    seam(b, [0, 0.5, -2.4], [0, 0.5, 2.4], [0, 1, 0], 0.16, 0.02);
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2, x = Math.cos(a) * 5.2, z = Math.sin(a) * 5.2;
        b.set(STEEL, 0);
        b.cyl(x, 0.5, z, 0.3, 0.18, 1.6, 5, "y", false);
        b.set(DARK, 0);
        b.cyl(x, 1.9, z, 0.24, 0.24, 0.2, 5, "y", false);
        b.set(COOLWIN, 4);
        b.cyl(x, 2.1, z, 0.2, 0.04, 0.5, 5, "y", true);
    }
    // gantry: bracing, a ladder, top beacons, equipment cabinets; dish: ribs, a rim, a shaded bowl, a feed tripod
    const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]], ys = [0.6, 2.0, 4.6, 7.2];
    b.set(GUN, 0);
    for (let f = 0; f < 4; f++)
        for (let k = 0; k < 3; k++) {
            const [x0, z0] = C[f], [x1, z1] = C[(f + 1) % 4], fl = k % 2 === 0;
            rod(b, [-11 + (fl ? x0 : x1) * 1.4, ys[k], (fl ? z0 : z1) * 1.4], [-11 + (fl ? x1 : x0) * 1.4, ys[k + 1], (fl ? z1 : z0) * 1.4], 0.05, 3);
        }
    ladderAt(b, [-9.52, 0.5, 0], [-9.52, 8.6, 0], [0, 0, 1], 0.45, 0.9);
    b.mirrored((s) => beacon(b, -12.4, 8.7, s * 1.4, RED, 0.12));
    b.set(STEEL, 0);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        rod(b, [-10.6 + Math.cos(a) * 0.5, 9.2, Math.sin(a) * 0.5], [-10.6 + Math.cos(a) * 3.98, 10.18, Math.sin(a) * 3.98], 0.06, 3);
    }
    b.set(GUN, 0);
    b.cyl(-10.6, 10.14, 0, 4.03, 4.03, 0.12, 12, "y", false);
    b.set(CON2, 0);
    b.disc(-10.6, 10.215, 0, 3.3, 12, "y", 1);
    b.set([0.42, 0.42, 0.4], 0);
    b.disc(-10.6, 10.23, 0, 1.7, 12, "y", 1);
    b.set(GUN, 0);
    for (let i = 0; i < 3; i++) {
        const a = i * 2.094 + 0.4;
        rod(b, [-10.6 + Math.cos(a) * 3.8, 10.2, Math.sin(a) * 3.8], [-10.6, 12.0, 0], 0.035, 3);
    }
    b.set(OLIVE, 0);
    b.box(-11, 0.8, 2.4, 0.7, 0.9, 0.4);
    b.set(COOLWIN, 4);
    decal(b, qz(2.8, -11.5, -10.9, 1.0, 1.4, 1));
    b.set(STEEL, 0);
    b.box(-11, 0.7, -2.4, 0.6, 0.8, 0.4);
    grille(b, qz(-2.8, -11.45, -10.55, 0.5, 1.3, -1), 4);
}
function g2MassDriver(b) {
    const top = (x) => 1.6 + (x + 11) * (5.6 / 20.6), Z = (y) => 2.4 - (y - 0.5) * (0.8 / 6.7);
    b.mirrored((s) => {
        // side frames: ribs, braces, a strip of light under the rails
        for (const x of [-5, -2, 1, 4, 7, 10]) {
            b.set(CON2, 0);
            const t = top(x) - 0.1;
            panel(b, [[[x - 0.15, 0.5, s * Z(0.5)], [x + 0.15, 0.5, s * Z(0.5)], [x + 0.15, t, s * Z(t)], [x - 0.15, t, s * Z(t)]], [x, 1, 0]], 0.14, 0);
        }
        b.set(GUN, 0);
        for (const x of [-5, -2, 1, 4, 7]) {
            const t = top(x + 3) - 0.35;
            rod(b, [x, 0.65, s * (Z(0.65) + 0.1)], [x + 3, t, s * (Z(t) + 0.1)], 0.05, 3);
        }
        b.set([1, 1, 1], 3);
        {
            const ya = top(-6) - 0.25, yb = top(9.4) - 0.25;
            seam(b, [-6, ya, s * Z(ya)], [9.4, yb, s * Z(yb)], [0, 0.12, s], 0.12, 0.02);
        }
        // capacitor block: lit screens, chevrons; muzzle beacons
        b.set(COOLWIN, 4);
        decal(b, qz(s * 2.6, -9.8, -9.0, 1.5, 2.1, s), 0.02);
        chevrons(b, qz(s * 2.6, -8.2, -6.6, 0.6, 0.9, s), 5);
        beacon(b, 9.9, 7.1, s * 1.3, AMBER, 0.12);
        b.set(STEEL, 0);
        rod(b, [-8.5, 4.9, s * 1.2], [-7.4, 3.6, s * 0.85], 0.09, 4);
    });
    // front: chevrons, a ladder, a sign; capacitor: cooling fins, a door, a grille; a floodlight
    chevrons(b, [[[10.5, 0.6, -2.2], [10.5, 0.6, 2.2], [10.5, 1.4, 2.1], [10.5, 1.4, -2.1]], [9, 1, 0]], 7);
    ladderAt(b, [10.57, 0.5, 1.2], [10.57, 6.9, 1.2], [0, 0, 1], 0.5, 0.9);
    sign(b, qx(10.5, -1.2, 0.6, 4.4, 5.1, 1));
    b.set(STEEL, 0);
    for (let i = 0; i < 5; i++)
        b.box(-10.2 + i * 0.32, 4.2, 0, 0.05, 0.3, 0.65);
    door(b, qx(-10.7, -0.5, 0.5, 0.5, 2.4, -1));
    grille(b, qx(-10.7, 1.0, 2.2, 2.6, 3.5, -1), 4);
    flood(b, [-6.2, 3.9, 2.4], [0.5, -0.7, 0.5]);
    // muzzle guide ring and a payload slug at the breech (pitched with the rails)
    const ang = Math.atan2(7.2 - 1.6, 9.6 + 11), m = b.mark(), cx = -0.7, cy = 4.45;
    b.set(GUN, 0);
    b.cyl(cx + 9.6, cy + 0.6, 0, 1.42, 1.62, 0.5, 8, "x", false);
    b.set(OLIVE, 0);
    b.box(cx - 9.6, cy + 0.6, 0, 0.7, 0.3, 0.45);
    b.set(HAZARD, 0);
    b.box(cx - 9.6, cy + 0.6, 0, 0.12, 0.31, 0.46);
    b.rotZ(m, ang, cx, cy);
}
function g2Bay(b) {
    const Y = (x) => 6.9 - Math.abs(x) * (1.1 / 6.2);
    // roof: skylights, ridge vents, fascia signs, beacons; knee braces on the posts
    for (const sx of [-1, 1])
        for (const [z0, z1] of [[-3.6, -1.0], [1.0, 3.6]])
            win(b, [[[sx * 1.0, Y(1), z0], [sx * 1.0, Y(1), z1], [sx * 4.2, Y(4.2), z1], [sx * 4.2, Y(4.2), z0]], [sx * 2.5, 0, 0]], null);
    b.set(STEEL, 0);
    for (const z of [-2.5, 0, 2.5])
        b.box(0, 7.0, z, 0.35, 0.16, 0.6);
    sign(b, qx(6.4, -1.8, 1.8, 5.22, 5.58, 1));
    sign(b, qx(-6.4, -1.8, 1.8, 5.22, 5.58, -1));
    beacon(b, 6.1, 5.85, 4.5, AMBER, 0.12);
    beacon(b, -6.1, 5.85, -4.5, AMBER, 0.12);
    b.set(GUN, 0);
    for (const x of [-1, 1])
        for (const z of [-1, 1]) {
            rod(b, [x * 5.8, 3.8, z * 4.4], [x * 5.8, 5.15, z * 3.2], 0.07, 4);
            rod(b, [x * 5.8, 3.8, z * 4.4], [x * 4.6, 5.15, z * 4.4], 0.07, 4);
            b.set(HAZARD, 0);
            b.box(x * 5.8, 0.75, z * 4.4, 0.3, 0.35, 0.3);
            b.set(BLACK, 0);
            b.box(x * 5.8, 0.75, z * 4.4, 0.31, 0.08, 0.31);
            b.set(GUN, 0);
        }
    // hanging work lights
    for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) {
        b.set(DARK, 0);
        rod(b, [x, 5.2, z], [x, 4.5, z], 0.02, 3);
        b.cyl(x, 4.3, z, 0.3, 0.12, 0.2, 6, "y", false);
        b.set(LAMP, 4);
        b.disc(x, 4.3, z, 0.26, 6, "y", -1);
    }
    // floor: wheel ramps, threshold chevrons
    b.mirrored((s) => { b.set(GUN, 0); b.hull([[-2.6, 0.4], [2.6, 0.4], [2.2, 0.62], [-2.2, 0.62]], 0.35, 0.35, s * 1.3); });
    for (const sx of [-1, 1])
        chevrons(b, [[[sx * 5.6, 0.4, -3.2], [sx * 5.6, 0.4, 3.2], [sx * 6.5, 0.4, 3.2], [sx * 6.5, 0.4, -3.2]], [sx * 6, -1, 0]], 8);
    // tool board, compressor, bottles, a stack of spares, a diagnostic arm with a lit head
    b.set(STEEL, 0);
    b.box(-1.0, 1.8, -4.3, 1.4, 1.0, 0.05);
    for (const [x, c] of [[-2.0, RED], [-1.4, DARK], [-0.8, HAZARD], [-0.2, DARK], [0.1, RED]]) {
        b.set(c, 0);
        decal(b, qz(-4.25, x - 0.08, x + 0.08, 1.4, 2.4 - (x + 2) * 0.2, 1));
    }
    b.set([0.5, 0.2, 0.15], 0);
    b.cyl(2.2, 0.95, -4.1, 0.4, 0.4, 1.4, 8, "x", true);
    b.set(GUN, 0);
    b.box(2.9, 1.5, -4.1, 0.3, 0.2, 0.25);
    bottle(b, 4.6, 0.4, -4.2, 0.2, 1.3, OLIVE);
    bottle(b, 5.0, 0.4, -4.2, 0.2, 1.3, [0.5, 0.2, 0.15]);
    for (let i = 0; i < 3; i++) {
        b.set(RUBBER, 0);
        b.cyl(4.8, 0.4 + i * 0.32, 4.0, 0.55, 0.55, 0.3, 8, "y", true);
    }
    b.set(STEEL, 0);
    rod(b, [-5.6, 2.6, 4.2], [-4.6, 3.6, 3.2], 0.08, 4);
    rod(b, [-4.6, 3.6, 3.2], [-3.6, 2.8, 2.4], 0.07, 4);
    b.set(GUN, 0);
    b.ball(-4.6, 3.6, 3.2, 0.15, 0);
    b.set([0.6, 0.9, 1], 4);
    b.box(-3.55, 2.75, 2.36, 0.08, 0.08, 0.08);
}
function g2Depot(b) {
    // containers: door seams, lock rods, a hazard sill
    for (const [y0, z] of [[0.3, -2.8], [0.3, -0.3], [2.7, -1.6]]) {
        b.set(DARK, 0);
        seam(b, [0.1, y0 + 0.1, z], [0.1, y0 + 2.3, z], [1, 0, 0], 0.05, 0.02);
        b.set(GUN, 0);
        for (const dz of [-0.6, -0.25, 0.25, 0.6])
            rod(b, [0.16, y0 + 0.15, z + dz], [0.16, y0 + 2.25, z + dz], 0.03, 3);
        b.set(HAZARD, 0);
        decal(b, qx(0.1, z - 1.1, z + 1.1, y0 + 0.05, y0 + 0.2, 1), 0.02);
    }
    // tent: poles and guy ropes, a lantern; stores: jerry cans, crates, a field table with a lit slate, a sign board; mast beacon
    b.set(GUN, 0);
    rod(b, [3.1, 0.3, 4.42], [3.1, 3.6, 4.42], 0.04, 3);
    rod(b, [3.1, 0.3, -0.42], [3.1, 3.6, -0.42], 0.04, 3);
    b.set(CANVAS, 0);
    rod(b, [3.1, 3.4, 4.4], [3.1, 0.3, 4.75], 0.015, 3);
    for (const z of [0.4, 3.6]) {
        rod(b, [0.8, 0.6, z], [0.3, 0.3, z], 0.015, 3);
        rod(b, [5.4, 0.6, z], [5.9, 0.3, z], 0.015, 3);
    }
    b.set(GUN, 0);
    rod(b, [5.7, 0.3, 3.2], [5.7, 2.4, 3.2], 0.035, 3);
    b.set(LAMP, 4);
    b.box(5.7, 2.5, 3.2, 0.1, 0.12, 0.1);
    for (let i = 0; i < 5; i++) {
        b.set(i % 2 ? OLIVE : [0.48, 0.24, 0.17], 0);
        b.box(3.4 + i * 0.32, 0.52, -1.2, 0.12, 0.22, 0.09);
    }
    crates(b, 2.9, -4.3, 2);
    b.set(GUN, 0);
    b.box(5.6, 1.0, -1.6, 0.5, 0.04, 0.35);
    for (const [x, z] of [[5.15, -1.9], [6.05, -1.9], [5.15, -1.3], [6.05, -1.3]])
        rod(b, [x, 0.3, z], [x, 1.0, z], 0.025, 3);
    b.set(COOLWIN, 4);
    decal(b, qy(1.04, 5.3, 5.8, -1.8, -1.45), 0.006);
    b.set(GUN, 0);
    rod(b, [6.25, 0.3, -4.3], [6.25, 1.9, -4.3], 0.04, 3);
    rod(b, [6.25, 0.3, -2.9], [6.25, 1.9, -2.9], 0.04, 3);
    sign(b, qx(6.3, -4.4, -2.8, 1.2, 1.9, 1));
    beacon(b, 4.8, 8.8, -3.6, RED, 0.1);
}
function g2Dome(b) {
    const F = (i, u0, u1, v0, v1) => fq(6, R6, 3.4, 2.6, 0.5, 3.5, i, u0, u1, v0, v1);
    // drum faces: a door and sign, vents, capacitor banks with lit cells
    for (let i = 0; i < 6; i++) {
        if (i === 5) {
            door(b, F(5, 0.36, 0.64, 0, 0.55));
            sign(b, F(5, 0.25, 0.75, 0.74, 0.9));
        }
        else if (i % 2 === 0)
            grille(b, F(i, 0.2, 0.8, 0.12, 0.5), 5);
        else {
            const Q = F(i, 0.15, 0.85, 0.1, 0.52);
            b.set(DARK, 0);
            panel(b, Q, 0.14, 0.05);
            b.set([1, 1, 1], 3);
            for (let k = 0; k < 3; k++)
                decal(b, qsub(Q, 0.1 + k * 0.3, 0.3 + k * 0.3, 0.2, 0.8), 0.155);
        }
    }
    // fins: tip emitters joined by a conductor ring, cables up from the drum; a ring of light round the emitter
    const ring = ringPts(2.0, 7.0, 6);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2, a2 = a + R6;
        b.set([1, 1, 1], 3);
        b.box(ring[i][0], 7.1, ring[i][2], 0.14, 0.14, 0.14);
        b.set(STEEL, 0);
        rod(b, ring[i], ring[(i + 1) % 6], 0.05, 3);
        b.set(DARK, 0);
        rod(b, [Math.cos(a2) * 2.5, 4.0, Math.sin(a2) * 2.5], [Math.cos(a) * 2.45, 5.6, Math.sin(a) * 2.45], 0.04, 3);
    }
    b.set([1, 1, 1], 3);
    b.cyl(0, 5.52, 0, 2.15, 2.15, 0.14, 12, "y", false);
    beacon(b, 2.0, 7.24, 0, RED, 0.09);
    b.set(OLIVE, 0);
    b.box(3.9, 0.95, 1.5, 0.3, 0.45, 0.4);
    b.set(COOLWIN, 4);
    decal(b, qx(4.2, 1.25, 1.75, 1.0, 1.3, 1));
}
function g2Node(b) {
    const F = (i, u0, u1, v0, v1) => fq(6, R6, 3.2, 1.9, 0.4, 7.9, i, u0, u1, v0, v1);
    // the terminal: a console with a lit screen; face plates with lit slits and cable runs on the diagonal faces
    b.set(STEEL, 0);
    b.hull([[3.5, 0.4], [4.3, 0.4], [4.3, 1.1], [3.9, 1.5], [3.5, 1.5]], 0.6, 0.6);
    b.set(COOLWIN, 4);
    decal(b, [[[4.3, 1.1, -0.5], [4.3, 1.1, 0.5], [3.9, 1.5, 0.5], [3.9, 1.5, -0.5]], [3.8, 1.0, 0]], 0.02);
    b.set([1, 1, 1], 2);
    decal(b, qx(4.3, -0.5, 0.5, 0.8, 0.9, 1), 0.01);
    for (const i of [0, 1, 3, 4]) {
        b.set(WALL2, 1);
        panel(b, F(i, 0.2, 0.8, 0.5, 0.72), 0.08, 0.08);
        b.set([1, 1, 1], 2);
        decal(b, F(i, 0.42, 0.58, 0.8, 0.9));
        const q = F(i, 0.1, 0.1, 0.02, 0.76)[0];
        b.set(STEEL, 0);
        rod(b, q[0], q[3], 0.06, 3);
    }
    flood(b, [1.9, 6.3, 1.2], [0.7, -0.6, 0.5]);
    flood(b, [-1.9, 6.3, -1.2], [-0.7, -0.6, -0.5]);
}
function g2Bunker(b) {
    const Z = (y) => 5.0 - (y + 0.6) * 0.2, X = (y) => 5.5 - (y + 0.6) * 0.2083;
    // armoured lintels, sills and mullions round the firing slits (the guns stay inside, at the slit)
    b.set(STEEL, 0);
    b.box(4.75, 2.48, 0, 0.3, 0.1, 4.0);
    b.set(CON2, 0);
    b.box(5.1, 1.38, 0, 0.12, 0.08, 4.0);
    b.set(CON, 0);
    for (const z of [-2.4, -0.7, 0.7, 2.4])
        b.box(4.98, 1.9, z, 0.14, 0.45, 0.18);
    b.mirrored((s) => {
        b.set(STEEL, 0);
        b.box(0, 2.48, s * 4.42, 3.6, 0.08, 0.2);
        b.set(CON, 0);
        for (const x of [-1.2, 1.2])
            b.box(x, 1.9, s * 4.47, 0.18, 0.45, 0.14);
        // pour lines, buttress ribs
        b.set(CON2, 0);
        for (const y of [0.7, 2.9])
            seam(b, [-4.9, y, s * Z(y)], [4.9, y, s * Z(y)], [0, 0.2, s], 0.07);
        for (const x of [-3.6, 3.6])
            b.hull([[x - 0.3, -0.6], [x + 0.3, -0.6], [x + 0.3, 1.2], [x - 0.3, 1.2]], 0.4, 0.12, s * 4.9);
        b.set(STEEL, 0);
        b.box(-5.15, 0.9, s * 1.15, 0.12, 1.2, 0.12);
    });
    b.set(CON2, 0);
    seam(b, [X(0.7), 0.7, -4.6], [X(0.7), 0.7, 4.6], [1, 0.2, 0], 0.07);
    // roof: a hatch, vent cowls, an aerial, sandbags
    hatch(b, -1.9, 3.75, -1.8, 0.45);
    for (const [x, z] of [[-2.2, 1.9], [2.2, -2.2]]) {
        b.set(STEEL, 0);
        b.cyl(x, 3.75, z, 0.2, 0.2, 0.45, 6, "y", false);
        b.cyl(x, 4.2, z, 0.36, 0.3, 0.16, 6, "y", true);
    }
    whip(b, -2.6, 3.75, 0, 1.8);
    b.set(CANVAS, 0);
    for (const z of [-2.0, -1.0, 2.0])
        b.ball(2.7, 3.95, z, 0.5, 0, 0.42);
    // rear: a lamp over the door, a step, a blast wall
    b.set(LAMP, 4);
    b.box(-5.2, 2.45, 0, 0.05, 0.08, 0.3);
    b.set(CON2, 0);
    b.box(-5.8, -0.02, 0, 0.5, 0.1, 1.0);
    b.set(CON, 0);
    b.hull([[-7.4, -0.3], [-6.6, -0.3], [-6.75, 2.0], [-7.25, 2.0]], 1.9, 1.8);
    chevrons(b, qx(-7.4, -1.6, 1.6, 0.2, 0.5, -1), 6);
    // wire obstacle and dragon's teeth beyond the sandbags
    const zs = [-4, -2, 0, 2, 4];
    for (let i = 0; i < 5; i++) {
        b.set(GUN, 0);
        rod(b, [7.6, -0.2, zs[i]], [7.6, 1.1, zs[i]], 0.04, 3);
        if (i < 4) {
            b.set(DARK, 0);
            rod(b, [7.6, 1.0, zs[i]], [7.6, 0.45, zs[i + 1]], 0.015, 3);
            rod(b, [7.6, 0.45, zs[i]], [7.6, 1.0, zs[i + 1]], 0.015, 3);
        }
    }
    b.set(CON2, 0);
    for (const z of [-3, -1, 1, 3])
        b.cyl(8.9, -0.2, z, 0.5, 0.15, 0.95, 4, "y", true, Math.PI / 4);
}
function g2Wall(b) {
    const X = (y) => 1.0 - (y - 0.4) * 0.2045;
    // wire on angled pickets along the top, piers and a firing step behind, bolts on the joints, a lamp, sandbags, a sign
    const zs = [-6.4, -3.2, 0, 3.2, 6.4];
    for (let i = 0; i < 5; i++) {
        b.set(GUN, 0);
        rod(b, [0.3, 2.6, zs[i]], [0.55, 3.25, zs[i]], 0.035, 3);
        if (i < 4) {
            b.set(DARK, 0);
            rod(b, [0.43, 2.95, zs[i]], [0.53, 3.2, zs[i + 1]], 0.012, 3);
            rod(b, [0.53, 3.2, zs[i]], [0.43, 2.95, zs[i + 1]], 0.012, 3);
            rod(b, [0.53, 3.2, zs[i]], [0.53, 3.2, zs[i + 1]], 0.012, 3);
        }
    }
    b.set(CON2, 0);
    for (const z of [-4.6, 0, 4.6])
        b.hull([[-2.1, -0.5], [-0.9, -0.5], [-0.6, 2.0], [-0.9, 2.0]], 0.45, 0.4, z);
    b.box(-1.15, 0.6, 0, 0.25, 0.2, 6.6);
    b.set(GUN, 0);
    for (const z of [-4.6, -2.3, 0, 2.3, 4.6])
        bolts(b, [X(0.8), 0.8, z + 0.14], [X(2.3), 2.3, z + 0.14], 4, [1, 0.2, 0], 0.045);
    b.set(GUN, 0);
    rod(b, [-0.3, 2.6, 0], [-0.3, 3.5, 0], 0.04, 3);
    flood(b, [-0.1, 3.5, 0], [1, -0.5, 0]);
    b.set(CANVAS, 0);
    for (const z of [-6.2, -5.3, 5.3, 6.2])
        b.ball(0, 2.78, z, 0.5, 0, 0.4);
    sign(b, [[[X(1.55), 1.55, 0.5], [X(1.55), 1.55, 1.8], [X(2.2), 2.2, 1.8], [X(2.2), 2.2, 0.5]], [0, 1.9, 1.15]], 3);
    b.set(DARK, 0);
    for (const [z0, z1] of [[-5, -1.7], [-1.7, 1.7], [1.7, 5]])
        rod(b, [2.8, 0.9, z0], [2.8, 0.9, z1], 0.015, 3);
}
/** The near (detailed) mesh of a kind, with the base mesh's measured sizes (the detail never changes a footprint, a
 * height or a pivot); `lo`: the base mesh itself (far level of detail, outlines). */
function buildKind(k, lo = false) {
    LO = true;
    let base;
    try {
        base = buildKindRaw(k);
    }
    finally {
        LO = false;
    }
    if (lo)
        return deFight(base);
    const hi = deFight(buildKindRaw(k));
    return { ...hi, height: base.height, radius: base.radius, minY: base.minY, midY: base.midY };
}
/**
 * Designer 20 Nov ("some of the textures on the buildings are flickering"): z-fighting. A detail drawn flush on a
 * surface (a panel, a stripe, a box face on a wall) shares its plane with the surface and the two flicker in the depth
 * test, worse with distance. Where two differently coloured triangles with the same facing overlap less than DF_OFF
 * apart, the front one (when flush: the later one, as details are drawn after what they sit on) is moved out along its
 * normal until they are DF_OFF apart; repeated so stacked layers separate too. stats in deFightStats.
 */
const DF_OFF = 0.03; // depth resolution near 0.12 m: ~2 cm at 200 m
exports.deFightStats = { meshes: 0, moved: 0 };
function deFight(mesh) {
    const d = mesh.verts, VF = exports.VERTEX_FLOATS, n = Math.floor(d.length / (3 * VF));
    if (!n)
        return mesh;
    const N = new Float64Array(n * 3), D = new Float64Array(n), key = new Array(n), col = new Array(n), ax = new Uint8Array(n);
    const buckets = new Map();
    for (let t = 0; t < n; t++) {
        const o = t * 3 * VF, ux = d[o + VF] - d[o], uy = d[o + VF + 1] - d[o + 1], uz = d[o + VF + 2] - d[o + 2];
        const wx = d[o + 2 * VF] - d[o], wy = d[o + 2 * VF + 1] - d[o + 1], wz = d[o + 2 * VF + 2] - d[o + 2];
        let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        const l = Math.hypot(nx, ny, nz);
        if (l < 1e-9) { key[t] = null; continue; }
        nx /= l; ny /= l; nz /= l;
        N[t * 3] = nx; N[t * 3 + 1] = ny; N[t * 3 + 2] = nz;
        D[t] = nx * d[o] + ny * d[o + 1] + nz * d[o + 2];
        col[t] = `${d[o + 6].toFixed(2)},${d[o + 7].toFixed(2)},${d[o + 8].toFixed(2)},${d[o + 9]},${d[o + 10]}`;
        const ab = [Math.abs(nx), Math.abs(ny), Math.abs(nz)];
        ax[t] = ab[0] > ab[1] && ab[0] > ab[2] ? 0 : ab[1] > ab[2] ? 1 : 2;
        const k = `${Math.round(nx * 40)},${Math.round(ny * 40)},${Math.round(nz * 40)}`;
        key[t] = k;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(t);
    }
    const P = (t, i, a) => { const o = t * 3 * VF + i * VF; return a === 0 ? [d[o + 1], d[o + 2]] : a === 1 ? [d[o], d[o + 2]] : [d[o], d[o + 1]]; };
    const overlap = (a, b, x) => {
        const A = [P(a, 0, x), P(a, 1, x), P(a, 2, x)], B = [P(b, 0, x), P(b, 1, x), P(b, 2, x)];
        for (const T of [A, B])
            for (let i = 0; i < 3; i++) {
                const p = T[i], q = T[(i + 1) % 3], ex = q[1] - p[1], ey = p[0] - q[0], tol = Math.hypot(ex, ey) * 0.003;
                let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
                for (const v of A) { const s = v[0] * ex + v[1] * ey; a0 = Math.min(a0, s); a1 = Math.max(a1, s); }
                for (const v of B) { const s = v[0] * ex + v[1] * ey; b0 = Math.min(b0, s); b1 = Math.max(b1, s); }
                if (a1 <= b0 + tol || b1 <= a0 + tol)
                    return false;
            }
        return true;
    };
    let moved = 0;
    for (let pass = 0; pass < 3; pass++) {
        let any = 0;
        for (const list of buckets.values()) {
            if (list.length < 2)
                continue;
            for (let j = 1; j < list.length; j++) {
                const b = list[j];
                for (let i = 0; i < j; i++) {
                    const a = list[i];
                    const gap = D[b] - D[a];
                    if (Math.abs(gap) >= DF_OFF - 1e-4 || col[a] === col[b] || !overlap(a, b, ax[b]))
                        continue;
                    // the one in front (flush: the later one) is the detail: move it out to DF_OFF clear of the other
                    const f = gap > 0.002 || Math.abs(gap) <= 0.002 ? b : a, by = DF_OFF - Math.abs(gap), o = f * 3 * VF;
                    for (let v = 0; v < 3; v++)
                        for (let c = 0; c < 3; c++)
                            d[o + v * VF + c] += N[f * 3 + c] * by;
                    D[f] += by;
                    moved++;
                    any++;
                    break;
                }
            }
        }
        if (!any)
            break;
    }
    exports.deFightStats.meshes++;
    exports.deFightStats.moved += moved;
    return mesh;
}
function buildKindRaw(k) {
    switch (k) {
        case "bike": return bike();
        case "bikewreck": return bike(true);
        case "scout": return scout();
        case "rockettank": return rocketTank();
        case "light": return lightTank();
        case "medium": return mediumTank();
        case "artillery": return mediumTank("artillery");
        case "flak": return mediumTank("flak");
        case "heavy": return heavyTank();
        case "siege": return siege();
        case "air": return aircraft();
        case "infantry": return infantry();
        case "economy": return economy();
        case "hauler": return hauler();
        case "constructor": return constructorVehicle();
        case "fbv": return forwardBase();
        case "structure": return structure();
        case "tower": return tower();
        case "mast": return mast();
        case "silo": return silo();
        case "extractor": return extractor();
        case "gastank": return gastank();
        case "battery": return battery();
        case "reactor": return reactor();
        case "core": return core();
        case "factory": return factory();
        case "pad": return pad();
        case "dome": return dome();
        case "bay": return bay();
        case "carrier": return carrier();
        case "dropship": return dropship();
        case "node": return controlNode();
        case "bunker": return bunker();
        case "wall": return wall();
        case "bgun0": return bunkerGun(0);
        case "bgun1": return bunkerGun(1);
        case "bgun2": return bunkerGun(2);
        case "sleg": return striderLeg();
        case "mleg": return mechLeg();
        case "flpod": return flPod();
        case "flrocket": return flRocket();
        case "flcrate": return flCrate();
        case "fldrop": return flDrop();
        case "fldropwall": return flDropWall();
        case "fldropbase": return flDropBase();
        case "mech": return mech();
        case "gunship": return gunship();
        case "barracks": return barracks();
        case "armoury": return armoury();
        case "techlab": return techlab();
        case "refinery": return refinery();
        case "uplink": return uplink();
        case "massdriver": return massdriver();
        case "depot": return depot();
        case "droppod": return dropPod();
        case "rrstation": return rrStation();
        case "fbturret": return fbTurret();
        case "fbwall": return fbWall();
    }
}
/** Which mesh a data type uses: a few named ids, then the armour class. */
function kindFor(typeId, armourClass, structure) {
    const named = new Map([
        ["dart", "scout"], ["salvo", "rockettank"], ["hammer", "artillery"], ["flak", "flak"], ["strider", "siege"], ["harvester", "economy"], ["hauler", "hauler"], ["constructor", "constructor"], ["forward-base-vehicle", "fbv"], // P3: own shapes
        ["gun-tower", "tower"], ["missile-battery", "battery"], ["relay-tower", "mast"],
        ["silo", "silo"], ["gas-extractor", "extractor"], ["gas-tank", "gastank"], ["reactor", "reactor"],
        // C6 item 7
        ["command-core", "core"], ["barracks", "barracks"], ["foundry", "factory"], ["armoury", "armoury"], ["tech-lab", "techlab"], ["refinery", "refinery"],
        ["air-pad", "pad"], ["launch-pad-uplink", "uplink"], ["mass-driver", "massdriver"], ["shield-projector", "dome"], ["repair-bay", "bay"], ["field-depot", "depot"],
        ["carrier", "carrier"], ["mule", "dropship"],
        // C9: fix-qa2 point structures
        ["control-node", "node"], ["bunker", "bunker"], ["barricade", "wall"],
        ["drop-pod-sentry", "droppod"], // ruling 130
        ["resupply-station", "rrstation"], // designer 21 Nov: Repair & Resupply call-down
        ["fb-turret", "fbturret"], ["fb-barricade", "fbwall"], // ruling 132
        ["mech", "mech"], // Frontline: the bipedal mech
        ["gunship", "gunship"], // Frontline: the rocket gunship
    ]);
    const n = named.get(typeId);
    if (n)
        return n;
    if (structure)
        return "structure";
    switch (armourClass) {
        case "bike": return "bike";
        case "light": return "light";
        case "medium": return "medium";
        case "heavy": return "heavy";
        case "air": return "air";
        case "infantry": return "infantry";
        default: return "medium";
    }
}
// ---------------------------------------------------------------- props and effects
// ---------------------------------------------------------------- edges (command view wireframe)
/**
 * Edge geometry for the tactical display: every edge is expanded into a quad
 * of 6 vertices, each carrying both endpoints so the vertex shader can build a
 * constant-pixel-width line in screen space.
 * Vertex layout (EDGE_FLOATS): A xyz, B xyz, t (0 at A, 1 at B), side (-1/+1), part, bright.
 */
exports.EDGE_FLOATS = 10;
/**
 * Real mesh edges, deduplicated: triangles are welded by quantised position
 * (and part, so turret edges rotate with the turret); an edge is kept if it
 * borders one triangle (open edge) or if its triangles are not coplanar.
 * Fan diagonals of flat polygons (chamfered hull sides, box faces, cylinder
 * caps) have two coplanar neighbours and are dropped. `crease` is the cosine
 * above which two face normals count as coplanar.
 */
function buildEdges(mesh, crease = 0.996) {
    const v = mesh.verts, F = exports.VERTEX_FLOATS;
    const q = (x) => Math.round(x * 2000);
    const key = (i) => `${q(v[i * F])},${q(v[i * F + 1])},${q(v[i * F + 2])},${v[i * F + 9]}`;
    const edges = new Map();
    for (let t = 0; t + 2 < mesh.count; t += 3) {
        const ks = [key(t), key(t + 1), key(t + 2)];
        const nx = v[t * F + 3], ny = v[t * F + 4], nz = v[t * F + 5], mat = v[t * F + 10];
        const bright = mat > 2.5 ? 0.5 : mat > 1.5 ? 1 : 0;
        for (let e = 0; e < 3; e++) {
            const i = t + e, j = t + ((e + 1) % 3);
            const ki = ks[e], kj = ks[(e + 1) % 3];
            if (ki === kj)
                continue;
            const k = ki < kj ? `${ki}|${kj}` : `${kj}|${ki}`;
            let r = edges.get(k);
            if (!r) {
                r = { a: i, b: j, n: [], bright: 0 };
                edges.set(k, r);
            }
            r.n.push(nx, ny, nz);
            r.bright = Math.max(r.bright, bright);
        }
    }
    const out = [];
    let n = 0;
    for (const r of edges.values()) {
        let keep = r.n.length === 3; // one face: open edge
        for (let f = 3; f < r.n.length && !keep; f += 3)
            if (r.n[0] * r.n[f] + r.n[1] * r.n[f + 1] + r.n[2] * r.n[f + 2] < crease)
                keep = true;
        if (!keep)
            continue;
        const A = [v[r.a * F], v[r.a * F + 1], v[r.a * F + 2]], B = [v[r.b * F], v[r.b * F + 1], v[r.b * F + 2]], part = v[r.a * F + 9];
        for (const [t, s] of [[0, -1], [1, -1], [1, 1], [0, -1], [1, 1], [0, 1]])
            out.push(A[0], A[1], A[2], B[0], B[1], B[2], t, s, part, r.bright);
        n++;
    }
    return { verts: new Float32Array(out), count: out.length / exports.EDGE_FLOATS, edges: n };
}
/** Unit circle in the xz plane as edges (explosion rings). */
function circleEdges(segments = 40) {
    const out = [];
    for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2, a1 = ((i + 1) / segments) * Math.PI * 2;
        const A = [Math.cos(a0), 0, Math.sin(a0)], B = [Math.cos(a1), 0, Math.sin(a1)];
        for (const [t, s] of [[0, -1], [1, -1], [1, 1], [0, -1], [1, 1], [0, 1]])
            out.push(A[0], A[1], A[2], B[0], B[1], B[2], t, s, 0, 0);
    }
    return { verts: new Float32Array(out), count: out.length / exports.EDGE_FLOATS, edges: segments };
}
function puffMesh() { const b = new MeshBuilder(); b.set([1, 1, 1], 0); b.ball(0, 0, 0, 1, 1); return b.build([0, 0, 0], 0, 0); }
function ringMesh() {
    const b = new MeshBuilder();
    b.set([1, 1, 1], 2);
    const n = 32;
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        const p = (r, a) => [Math.cos(a) * r, 0, Math.sin(a) * r];
        b.poly([p(0.86, a0), p(0.86, a1), p(1, a1), p(1, a0)], [0, -1, 0]);
    }
    return b.build([0, 0, 0], 0, 0);
}
const TT = (px, py, r, h, L) => [px + r * 1.3 + L * 1.12, py + h * 0.55, 0]; // tankTurret barrel tip
exports.MUZZLES = {
    fbturret: [{ pts: [[2.72, exports.FBT.gunY - 0.12, 0.88], [2.72, exports.FBT.gunY - 0.12, -0.88]], turret: true }, { pts: [[4.1, exports.FBT.gunY, 0]], turret: true }], fbwall: [], // ruling 132; designer 21 Nov: machine guns, cannon
    rrstation: [],
    droppod: [{ pts: [[exports.DP.gunTip, exports.DP.gunY, exports.DP.gunZ], [exports.DP.gunTip, exports.DP.gunY, -exports.DP.gunZ]], turret: true }, { pts: [[2.98, 5.12, exports.DP.podZ]], turret: true }], // ruling 130: twin guns; designer 21 Nov: a cannon (was 4 rocket tubes)
    bike: [{ pts: [[2.3, 0.45, 0.42], [2.3, 0.45, -0.42]], turret: false }, { pts: [[0.45, 1.4, 0]], turret: false }],
    bikewreck: [], // wrecks: never fire
    mech: [{ pts: [[3.6, 7.4, 2.45], [3.6, 7.4, 2.75]], turret: false }, { pts: [[1.05, 10.05, 2.3], [1.05, 10.55, -2.3], [1.05, 10.05, -1.95], [1.05, 10.55, 2.65]], turret: false }, { pts: [[3.1, 7.45, -2.6]], turret: false }], // Frontline: autocannon, shoulder missile pods
    gunship: [{ pts: [[4.55, 0.25, 0.35], [4.55, 0.25, -0.35]], turret: false }, { pts: [[-0.85, 0.9, 2.1], [-0.85, 0.9, -2.1]], turret: false }, { pts: [[0.65, 1.0, 1.85]], turret: false }, { pts: [[0.65, 1.0, -1.85]], turret: false }], // Frontline: twin MGs, door miniguns
    scout: [{ pts: [[2.95, 0.95, 0.32], [2.95, 0.95, -0.32]], turret: false }, { pts: [[1.55, 1.55, 0]], turret: false }], // ruling 108: twin minigun, Shadower rail
    rockettank: [{ pts: [[1.75, 2.75, 1.0], [1.75, 2.75, -1.0]], turret: true }, { pts: [[2.55, 2.3, 0]], turret: true }], // ruling 108: twin missile pods, coaxial minigun
    light: [{ pts: [TT(0.1, 1.28, 1.05, 0.62, 2.8)], turret: true }, { pts: [[4.44, 1.41, 0]], turret: true }], // F2: Lancer laser cannon, rapid laser (coaxial)
    medium: [{ pts: [TT(0.3, 1.45, 1.3, 0.72, 3.2)], turret: true }, { pts: [[0.2, 2.35, 0]], turret: true }],
    artillery: [{ pts: [[1.4, 2.0, 0]], turret: true }, { pts: [[2.29, 5.19, 0]], turret: true }],
    flak: [{ pts: [[3.24, 3.91, 0.62], [3.24, 3.91, -0.62]], turret: true }],
    heavy: [{ pts: [TT(0, 1.85, 1.75, 0.95, 4.6)], turret: true }, { pts: [[1.2, 3.02, 0.7]], turret: true }, { pts: [[1.2, 3.02, 0.7]], turret: true }],
    siege: [{ pts: CHIN, turret: false }, { pts: [TT(SG.px, SG.py, SG.r, SG.h, SG.L)], turret: true }, { pts: AA, turret: true }], // W2: chin guns, siege gun, AA (the sim muzzles: the middle of each pair)
    air: [{ pts: [[1.8, 0.45, 2.3], [1.8, 0.45, -2.3]], turret: false }, { pts: [[4.5, 0.0, 0]], turret: true }, { pts: [[0.0, 0.6, 0.95], [0.0, 0.6, -0.95]], turret: false }],
    infantry: [{ pts: [[0.9, 1.16, 0.14]], turret: false }],
    economy: [{ pts: [[4.5, 1.05, 0]], turret: true }],
    hauler: [{ pts: [[3.7, 0.6, 0]], turret: false }], constructor: [{ pts: [[4.5, 1.05, 0]], turret: true }], fbv: [{ pts: [[3.7, 0.6, 0]], turret: false }],
    structure: [{ pts: [[0, 6.2, 0]], turret: false }],
    tower: [{ pts: [[3.72, 9.0, 1.85], [3.72, 9.0, -1.85]], turret: true }, { pts: [[5.63, 9.3, 0]], turret: true }], // designer 21 Nov: twin machine guns (LMB when manned), cannon (RMB)
    mast: [{ pts: [[0, 13, 0]], turret: false }],
    silo: [{ pts: [[0, 9, 0]], turret: false }], extractor: [{ pts: [[0, 10, 0]], turret: false }], gastank: [{ pts: [[0, 8, 0]], turret: false }],
    battery: [{ pts: [[1.7, 4.75, -0.82], [1.7, 4.75, 0.82], [1.7, 5.5, -0.82], [1.7, 5.5, 0.82], [1.7, 4.75, 0], [1.7, 5.5, 0]], turret: true }],
    reactor: [{ pts: [[-1.5, 8, 0]], turret: false }],
    core: [{ pts: [[0, 9, 0]], turret: false }], factory: [{ pts: [[0, 6.5, 0]], turret: false }], pad: [{ pts: [[0, 2, 0]], turret: false }],
    dome: [{ pts: [[0, 5.6, 0]], turret: false }], bay: [{ pts: [[0, 6, 0]], turret: false }],
    carrier: [{ pts: [[2.4, 2.6, 0]], turret: true }], dropship: [{ pts: [[3.8, 0.6, 0]], turret: false }],
    barracks: [{ pts: [[0, 4.5, 0]], turret: false }], armoury: [{ pts: [[0, 5.6, 0]], turret: false }], techlab: [{ pts: [[0, 6, 0]], turret: false }], refinery: [{ pts: [[0, 8, 0]], turret: false }],
    uplink: [{ pts: [[-10.6, 10, 0]], turret: false }], massdriver: [{ pts: [[9.6, 7.4, 0]], turret: false }], depot: [{ pts: [[0, 4, 0]], turret: false }],
    sleg: [], // W1: a Strider leg (never fires)
    mleg: [], // Frontline: a mech leg
    flpod: [], flcrate: [], fldrop: [], fldropwall: [], fldropbase: [], flrocket: [], // Frontline: the call-down pod, its containers, the vehicle drop crate
    bgun0: [{ pts: [[4.6, 4.3, 0]], turret: true }], bgun1: [{ pts: [[4.2, 4.4, 2.2]], turret: true }], bgun2: [{ pts: [[3.6, 4.6, -2.2]], turret: true }],
    node: [{ pts: [[4.8, 9.3, 0.5], [4.8, 9.3, -0.5]], turret: true }], bunker: [{ pts: [[4.6, 4.3, 0]], turret: true }, { pts: [[4.2, 4.4, 2.2]], turret: true }, { pts: [[3.6, 4.77, -2.2], [3.6, 4.43, -2.2]], turret: true }], wall: [{ pts: [[0, 2.6, 0]], turret: false }],
};
/** Mule (air kind, dropship): chin gun on the nose turret, then the two door guns. */
exports.MULE_MUZZLES = [{ pts: [[4.5, 0.0, 0]], turret: true }, { pts: [[0.0, 0.6, 0.95]], turret: false }, { pts: [[0.0, 0.6, -0.95]], turret: false }];
// ---------------------------------------------------------------- decorative props (client slice 2): no collision in the sim
/** Faceted dome for shield flashes (icosahedron, subdivided once). */
function shieldMesh() { const b = new MeshBuilder(); b.set([1, 1, 1], 0); b.ball(0, 0, 0, 1, 1); return b.build([0, 0, 0], 0, 0); }
/**
 * Where each kind's driver (and a gunner where it has one) is DRAWN, model space (x forward, y up from the model
 * origin, before the kind's hover): the centre of the cupola / canopy / rider. Slice 3b: the sim's driver hit zones
 * (constants.crew.pilotHitZone) were placed on these points; the debug overlay (O) draws both and the smoke test
 * reports the gap per type.
 */
exports.COCKPITS = {
    bike: { driver: [-0.1, 1.45, 0] },
    bikewreck: { driver: null },
    scout: { driver: [0.1, 2.0, 0] }, // ruling 108: the canopy, on the light-class driver zone
    rockettank: { driver: [0.2, 2.45 + CUPOLA_H / 2, 0] },
    light: { driver: [0.1, 1.28 + 0.62 + CUPOLA_H / 2, 0] },
    medium: { driver: [0.3, 1.45 + 0.72 + CUPOLA_H / 2, 0] },
    artillery: { driver: [0.3, 1.95 + CUPOLA_H / 2, 0] },
    flak: { driver: [0.3, 1.9, 0] },
    heavy: { driver: [0.0, 1.85 + 0.95 + CUPOLA_H / 2, 0] },
    siege: { driver: [6.9, 5.6, 0] }, // W2: in the head module behind its vision slit, on the data's driver zone
    air: { driver: [2.2, 1.22, 0] },
    infantry: { driver: null },
    economy: { driver: [0.3, 2.3, 0] }, // C8: raised cab at the data's driver zone
    hauler: { driver: [0.3, 2.3, 0] }, constructor: { driver: [0.3, 2.3, 0] }, fbv: { driver: [0.3, 2.3, 0] }, // P3: the same cab
    structure: { driver: null }, tower: { driver: null }, mast: { driver: null },
    silo: { driver: null }, extractor: { driver: null }, gastank: { driver: null }, battery: { driver: null }, reactor: { driver: null },
    core: { driver: null }, factory: { driver: null }, pad: { driver: null }, dome: { driver: null }, bay: { driver: null },
    node: { driver: null }, bunker: { driver: null }, wall: { driver: null }, bgun0: { driver: null }, bgun1: { driver: null }, bgun2: { driver: null }, sleg: { driver: null }, mleg: { driver: null }, flpod: { driver: null }, flrocket: { driver: null }, flcrate: { driver: null },
    barracks: { driver: null }, armoury: { driver: null }, techlab: { driver: null }, refinery: { driver: null }, uplink: { driver: null }, massdriver: { driver: null }, depot: { driver: null },
    carrier: { driver: [0.15, 2.9 + CUPOLA_H / 2, 0] }, // C8: roof cupola at the data's driver zone
    dropship: { driver: [2.8, 1.7, 0] },
    droppod: { driver: null }, rrstation: { driver: null }, fbturret: { driver: null }, fbwall: { driver: null },
};
// ---------------------------------------------------------------- first-person viewmodels (slice 3b, item 13)
/**
 * Weapons held in first person, in camera space metres: +x along the barrel, +y up, +z right; origin at the rear of
 * the receiver. Drawn by Renderer.drawViewModel with their own projection and depth range. VIEWMODEL_AXIS gives the
 * rear and muzzle x of each (the on-screen share of the weapon is measured along it).
 */
const VM_DARK = [0.36, 0.37, 0.36], VM_STEEL = [0.68, 0.7, 0.7], VM_OLIVE = [0.66, 0.7, 0.5], VM_TAN = [0.86, 0.76, 0.55];
exports.VIEWMODEL_AXIS = { "vm-carbine": [-0.3, 0.5], "vm-rifle": [-0.36, 0.76], "vm-torch": [-0.25, 0.36], "vm-build": [-0.17, 0.23], "vm-beacon": [-0.02, 0.02], "vm-beacon-supply": [-0.02, 0.02], "vm-beacon-defensive": [-0.02, 0.02], "vm-beacon-recon": [-0.02, 0.02], "vm-beacon-orbital": [-0.02, 0.02], "vm-beacon-air": [-0.02, 0.02], "vm-tube": [-0.42, 0.62], "vm-lance": [-0.3, 0.6], "vm-amr": [-0.4, 0.86], "vm-lcannon": [-0.27, 0.23] };
function vmCarbine() {
    const b = new MeshBuilder();
    b.set(VM_DARK, 0);
    b.hull([[-0.3, -0.07], [-0.08, -0.03], [-0.08, 0.04], [-0.3, 0.03]], 0.022, 0.02); // stock
    b.set(VM_OLIVE, 0);
    b.box(0.07, 0.01, 0, 0.15, 0.042, 0.03); // receiver
    b.set(VM_DARK, 0);
    b.box(0.06, 0.056, 0, 0.13, 0.006, 0.012); // top rail
    b.set(VM_DARK, 0);
    b.box(0.05, 0.075, 0, 0.03, 0.016, 0.018); // red-dot housing
    b.set([1, 1, 1], 2);
    b.box(0.081, 0.077, 0, 0.002, 0.009, 0.011); // lit lens
    b.set(VM_DARK, 0);
    b.hull([[0.04, -0.03], [0.1, -0.03], [0.085, -0.13], [0.035, -0.12]], 0.016, 0.014); // box magazine
    b.set(VM_OLIVE, 0);
    b.cyl(0.22, 0.012, 0, 0.026, 0.024, 0.2, 8, "x"); // handguard
    b.set(VM_DARK, 0);
    b.box(0.32, 0.037, 0, 0.1, 0.004, 0.008); // top rail on the handguard
    b.set(VM_DARK, 0);
    b.box(0.32, -0.04, 0, 0.018, 0.035, 0.014); // fore-grip
    b.set(VM_STEEL, 0);
    b.cyl(0.42, 0.012, 0, 0.01, 0.01, 0.06, 6, "x"); // barrel
    b.set(VM_DARK, 0);
    b.cyl(0.48, 0.012, 0, 0.016, 0.016, 0.02, 6, "x"); // flash hider
    return b.build([0, 0, 0], 0, 0);
}
function vmRifle() {
    const b = new MeshBuilder();
    b.set(VM_TAN, 0);
    b.hull([[-0.36, -0.08], [-0.06, -0.04], [-0.06, 0.03], [-0.36, 0.035]], 0.022, 0.02); // stock
    b.set(VM_TAN, 0);
    b.box(0.07, 0.0, 0, 0.13, 0.038, 0.028); // receiver
    b.set(VM_DARK, 0);
    b.cyl(-0.06, 0.07, 0, 0.016, 0.016, 0.21, 10, "x"); // scope tube
    b.set(VM_DARK, 0);
    b.cyl(0.15, 0.07, 0, 0.016, 0.022, 0.04, 10, "x"); // objective bell
    b.set([1, 1, 1], 2);
    b.cyl(0.19, 0.07, 0, 0.019, 0.019, 0.003, 10, "x"); // lit lens
    b.mirrored((s) => { b.set(VM_DARK, 0); b.box(0.0 + (s > 0 ? 0.1 : 0), 0.048, 0, 0.01, 0.012, 0.012); }); // scope rings
    b.set(VM_TAN, 0);
    b.hull([[0.2, -0.035], [0.46, -0.02], [0.46, 0.022], [0.2, 0.03]], 0.022, 0.018); // slim fore-end
    b.set(VM_STEEL, 0);
    b.cyl(0.2, 0.006, 0, 0.013, 0.011, 0.52, 8, "x"); // long barrel
    b.set(VM_DARK, 0);
    b.cyl(0.72, 0.006, 0, 0.02, 0.02, 0.045, 8, "x"); // muzzle brake
    b.set(VM_DARK, 0);
    b.box(0.06, -0.05, 0, 0.02, 0.025, 0.012); // bolt-action magazine (small)
    return b.build([0, 0, 0], 0, 0);
}
function vmTorch() {
    const b = new MeshBuilder();
    b.set([0.8, 0.64, 0.17], 0);
    b.cyl(-0.25, 0, 0, 0.045, 0.045, 0.38, 10, "x"); // body
    b.set(VM_DARK, 0);
    b.box(-0.05, -0.065, 0, 0.06, 0.03, 0.03); // fuel cell
    b.set(VM_STEEL, 0);
    b.cyl(0.13, 0, 0, 0.03, 0.014, 0.23, 8, "x"); // nozzle
    return b.build([0, 0, 0], 0, 0);
}
/** C4 build tool (BACKLOG 36): a grip, a slate with a glowing screen and a short projector emitter with a lit tip. */
function vmBuild() {
    const b = new MeshBuilder();
    b.set(VM_DARK, 0);
    b.box(-0.12, -0.045, 0, 0.05, 0.03, 0.022); // grip
    b.set(VM_OLIVE, 0);
    b.box(0.0, 0.0, 0, 0.11, 0.026, 0.05); // slate body
    b.set([0.45, 1, 0.9], 2);
    b.box(-0.01, 0.028, 0, 0.08, 0.002, 0.038); // screen
    b.set(VM_DARK, 0);
    b.mirrored((s) => b.box(0.0, 0.03, s * 0.044, 0.09, 0.004, 0.004)); // screen bezel
    b.set(VM_STEEL, 0);
    b.cyl(0.11, 0.0, 0, 0.02, 0.012, 0.1, 8, "x"); // projector emitter
    b.set([1, 1, 1], 2);
    b.cyl(0.21, 0.0, 0, 0.013, 0.013, 0.006, 8, "x"); // lit tip
    return b.build([0, 0, 0], 0, 0);
}
/** C5 call beacon held in the hand: a dark cylinder with a ribbed amber band and a glowing tip (the light pillar's source). */
function vmBeacon(col = [1, 0.7, 0.2]) {
    // ruling 128: the call beacon held upright in the hand: a dark grip cylinder, two lit bands in the call's colour
    // (material 4, pulsing) and a blinking lamp on top (material 5)
    const b = new MeshBuilder(), hi = [Math.min(1, col[0] * 0.6 + 0.4), Math.min(1, col[1] * 0.6 + 0.4), Math.min(1, col[2] * 0.6 + 0.4)];
    b.set(VM_DARK, 0);
    b.cyl(0, -0.07, 0, 0.022, 0.022, 0.12, 14, "y"); // body
    b.set(VM_STEEL, 0);
    b.cyl(0, -0.075, 0, 0.024, 0.024, 0.012, 14, "y"); // base ring
    b.set(col, 4);
    b.cyl(0, -0.03, 0, 0.0235, 0.0235, 0.012, 14, "y"); // lit band
    b.set(col, 4);
    b.cyl(0, 0.0, 0, 0.0235, 0.0235, 0.006, 14, "y"); // second band
    b.set(VM_STEEL, 0);
    b.cyl(0, 0.05, 0, 0.02, 0.016, 0.02, 12, "y"); // cap
    b.set(hi, 5);
    b.cyl(0, 0.07, 0, 0.014, 0.006, 0.025, 12, "y"); // lamp
    return b.build([0, 0, 0], 0, 0);
}
/** Muzzle flash / torch flame: glowing cones at the muzzle (drawn for a moment after a shot, or while repairing). */
function vmFlash() {
    const b = new MeshBuilder();
    b.set([1, 0.85, 0.5], 2);
    b.cyl(0.005, 0, 0, 0.011, 0.001, 0.07, 5, "x", true, 0.3);
    b.set([1, 1, 1], 2);
    b.mirrored((s) => b.box(0.012, 0, s * 0.008, 0.008, 0.002, 0.006)); // side vents of the flash
    return b.build([0, 0, 0], 0, 0);
}
/** F3: the heavy weapon pod's weapons in the hand. Rocket tube: a fat olive launch tube on the shoulder with a sight box,
 * grip and a dark muzzle ring with a lit warhead tip inside. */
function vmTube() {
    const b = new MeshBuilder();
    b.set(VM_OLIVE, 0);
    b.cyl(-0.42, 0.02, 0, 0.055, 0.055, 1.0, 12, "x"); // launch tube
    b.set(VM_DARK, 0);
    b.cyl(-0.44, 0.02, 0, 0.065, 0.06, 0.06, 12, "x");
    b.cyl(0.54, 0.02, 0, 0.062, 0.066, 0.08, 12, "x"); // venturi and muzzle ring
    b.set(VM_DARK, 0);
    b.cyl(-0.1, 0.02, 0, 0.06, 0.06, 0.04, 12, "x");
    b.cyl(0.25, 0.02, 0, 0.06, 0.06, 0.04, 12, "x"); // bands
    b.set([1, 0.55, 0.2], 2);
    b.disc(0.6, 0.02, 0, 0.03, 8, "x", 1); // the warhead inside, lit
    b.set(VM_DARK, 0);
    b.box(0.1, 0.1, -0.045, 0.06, 0.025, 0.02); // sight box
    b.set([1, 1, 1], 2);
    b.box(0.161, 0.1, -0.045, 0.002, 0.012, 0.012); // sight lens
    b.set(VM_DARK, 0);
    b.box(0.05, -0.06, 0, 0.02, 0.045, 0.015);
    b.box(0.22, -0.055, 0, 0.018, 0.04, 0.014); // grip, fore-grip
    b.set([1, 0.8, 0.1], 0);
    b.box(-0.25, 0.02, 0.0, 0.01, 0.0565, 0.0565); // hazard band
    return b.build([0, 0, 0], 0, 0);
}
/**
 * Frontline: the shoulder laser cannon. A big barrel housing carried on the right shoulder: a power cell pack behind with a
 * lit charge strip, cooling fins along the barrel, a wide emitter ring with a glowing lens at the front, a side grip.
 */
function vmLaserCannon() {
    const b = new MeshBuilder();
    b.set(VM_DARK, 0);
    b.box(-0.42, 0.0, 0, 0.13, 0.1, 0.1); // power cell pack
    b.set([0.35, 0.9, 1], 2);
    b.box(-0.42, 0.101, 0, 0.1, 0.004, 0.03); // charge strip
    b.set(VM_STEEL, 0);
    b.cyl(-0.3, 0.0, 0, 0.11, 0.1, 0.62, 12, "x"); // barrel housing
    b.set(VM_DARK, 0);
    for (const x of [-0.18, -0.08, 0.02, 0.12, 0.22])
        b.cyl(x, 0.0, 0, 0.122, 0.122, 0.018, 12, "x"); // cooling fins
    b.set(VM_STEEL, 0);
    b.cyl(0.32, 0.0, 0, 0.1, 0.13, 0.08, 12, "x"); // flared emitter
    b.set(VM_DARK, 0);
    b.cyl(0.4, 0.0, 0, 0.135, 0.13, 0.04, 12, "x"); // emitter ring
    b.set([0.55, 0.95, 1], 2);
    b.disc(0.441, 0.0, 0, 0.085, 12, "x", 1); // lens
    b.set(VM_OLIVE, 0);
    b.box(-0.1, 0.12, 0, 0.16, 0.025, 0.05); // top rail and sight
    b.set([1, 1, 1], 2);
    b.box(0.06, 0.128, 0, 0.002, 0.01, 0.01);
    b.set(VM_DARK, 0);
    b.box(-0.05, -0.12, -0.03, 0.025, 0.06, 0.018); // grip
    b.box(-0.3, -0.1, 0.06, 0.12, 0.02, 0.05); // shoulder pad
    const m = b.build([0, 0, 0], 0, 0);
    for (let i = 0; i < m.verts.length; i += exports.VERTEX_FLOATS) { // drawn at 0.5 of the modelled size
        m.verts[i] *= 0.5;
        m.verts[i + 1] *= 0.5;
        m.verts[i + 2] *= 0.5;
    }
    return m;
}
/** Arc lance: a squat capacitor body, three glowing coils along a fork of two prongs with a lit arc between them. */
function vmLance() {
    const b = new MeshBuilder();
    b.set(VM_DARK, 0);
    b.hull([[-0.3, -0.06], [-0.05, -0.04], [-0.05, 0.05], [-0.3, 0.04]], 0.03, 0.028); // stock / cell
    b.set(VM_STEEL, 0);
    b.box(0.08, 0.0, 0, 0.14, 0.05, 0.04); // body
    b.set([0.45, 0.85, 1], 2);
    for (const x of [0.0, 0.09, 0.18])
        b.cyl(x, 0.0, 0, 0.052, 0.052, 0.018, 10, "x"); // coils
    b.set(VM_DARK, 0);
    b.mirrored((s) => b.box(0.42, 0.0, s * 0.03, 0.18, 0.012, 0.01)); // prongs
    b.set([0.6, 0.9, 1], 2);
    b.box(0.58, 0.0, 0, 0.012, 0.006, 0.03); // the arc between the tips
    b.set(VM_DARK, 0);
    b.box(0.06, -0.07, 0, 0.02, 0.035, 0.014); // grip
    return b.build([0, 0, 0], 0, 0);
}
/** Anti-materiel rifle: a long heavy barrel with a big muzzle brake, a bipod, a box magazine and a fat scope. */
function vmAmr() {
    const b = new MeshBuilder();
    b.set(VM_DARK, 0);
    b.hull([[-0.4, -0.08], [-0.06, -0.045], [-0.06, 0.035], [-0.4, 0.04]], 0.026, 0.024); // stock
    b.set(VM_STEEL, 0);
    b.box(0.08, 0.0, 0, 0.15, 0.045, 0.034); // receiver
    b.set(VM_DARK, 0);
    b.cyl(-0.05, 0.085, 0, 0.022, 0.022, 0.24, 10, "x");
    b.cyl(0.19, 0.085, 0, 0.022, 0.03, 0.05, 10, "x"); // scope
    b.set([1, 1, 1], 2);
    b.cyl(0.24, 0.085, 0, 0.026, 0.026, 0.003, 10, "x");
    b.set(VM_STEEL, 0);
    b.cyl(0.22, 0.004, 0, 0.02, 0.017, 0.56, 8, "x"); // heavy barrel
    b.set(VM_DARK, 0);
    b.box(0.81, 0.004, 0, 0.045, 0.03, 0.03); // muzzle brake
    b.set(VM_DARK, 0);
    b.box(0.08, -0.075, 0, 0.03, 0.04, 0.016); // magazine
    b.set(VM_DARK, 0);
    b.mirrored((s) => rod(b, [0.5, -0.01, 0], [0.47, -0.12, s * 0.04], 0.006, 3)); // bipod (folded down)
    return b.build([0, 0, 0], 0, 0);
}


/**
 * Designer 21 Nov ("smooth out the guns up close, that's where we see them"): a box whose four long edges along x are
 * chamfered (an octagonal section) when it is big enough to show it; tiny parts stay plain boxes.
 */
function vmBox(b, cx, cy, cz, hx, hy, hz) {
    const m = Math.min(hy, hz);
    if (m < 0.006) {
        b.box(cx, cy, cz, hx, hy, hz);
        return;
    }
    const c = m * 0.32, sec = [[-hy + c, -hz], [hy - c, -hz], [hy, -hz + c], [hy, hz - c], [hy - c, hz], [-hy + c, hz], [-hy, hz - c], [-hy, -hz + c]];
    const P = (x, [y, z]) => [x, cy + y, cz + z], ctr = [cx, cy, cz], x0 = cx - hx, x1 = cx + hx;
    for (let k = 0; k < 8; k++) {
        const a = sec[k], d = sec[(k + 1) % 8];
        b.poly([P(x0, a), P(x1, a), P(x1, d), P(x0, d)], ctr);
    }
    b.poly(sec.map((q) => P(x0, q)), ctr);
    b.poly(sec.map((q) => P(x1, q)), ctr);
}
/** Smooth shading for a viewmodel: normals averaged over faces that meet at a vertex within the crease angle. */
function vmSmooth(m, creaseDeg = 38) {
    const V = m.verts, F = exports.VERTEX_FLOATS, cos = Math.cos(creaseDeg * Math.PI / 180), q = (x) => Math.round(x * 20000);
    const at = new Map();
    for (let i = 0; i < V.length; i += F) {
        const k = `${q(V[i])},${q(V[i + 1])},${q(V[i + 2])}`;
        let a = at.get(k);
        if (!a)
            at.set(k, a = []);
        a.push(i);
    }
    const out = new Float32Array(V.length);
    for (const list of at.values())
        for (const i of list) {
            let nx = 0, ny = 0, nz = 0;
            for (const j of list)
                if (V[i + 3] * V[j + 3] + V[i + 4] * V[j + 4] + V[i + 5] * V[j + 5] >= cos) {
                    nx += V[j + 3];
                    ny += V[j + 4];
                    nz += V[j + 5];
                }
            const l = Math.hypot(nx, ny, nz) || 1;
            out[i] = nx / l;
            out[i + 1] = ny / l;
            out[i + 2] = nz / l;
        }
    for (let i = 0; i < V.length; i += F) {
        V[i + 3] = out[i];
        V[i + 4] = out[i + 1];
        V[i + 5] = out[i + 2];
    }
    return m;
}
// ---- designer 21 Nov: "all the player guns need more details": one detailed model per Frontline gun (slot 1 x kinetic /
// laser, slot 2), built from the same kit of parts so they read as one family. Same conventions as above: +x along the
// barrel, origin at the rear of the receiver, barrel axis at y 0.012 (slot 1) / 0.006 (slot 2, main.ts vmMuzzleVm).
const VM_BLK = [0.22, 0.23, 0.23], VM_GUN = [0.44, 0.46, 0.46], VM_GRIP = [0.28, 0.27, 0.25], VM_WHITE = [0.86, 0.87, 0.85];
const VM_LASER = [0.35, 0.9, 1], VM_HOT = [1, 0.62, 0.22];
/** A picatinny rail: a strip with n cross slots, from x0 over len at height y. */
function vmRail(b, x0, len, y, hw = 0.009) {
    b.set(VM_BLK, 0);
    vmBox(b, x0 + len / 2, y, 0, len / 2, 0.004, hw);
    const n = Math.max(2, Math.round(len / 0.014));
    for (let i = 0; i < n; i++)
        vmBox(b, x0 + (i + 0.5) * (len / n), y + 0.005, 0, len / n * 0.28, 0.002, hw * 0.95);
}
/** A pistol grip with finger grooves and a trigger guard + trigger, grip top at (x, y). */
function vmGrip(b, x, y, h = 0.085, rake = 0.03) {
    b.set(VM_GRIP, 0);
    b.hull([[x - 0.018, y], [x + 0.016, y], [x + 0.006 - rake, y - h], [x - 0.03 - rake, y - h + 0.006]], 0.015, 0.014);
    b.set(VM_BLK, 0);
    for (let i = 1; i <= 3; i++)
        vmBox(b, x + 0.012 - rake * i / 4, y - h * i / 4, 0, 0.004, 0.003, 0.0155); // finger grooves
    vmBox(b, x + 0.046, y - 0.026, 0, 0.026, 0.003, 0.012); // trigger guard bottom
    vmBox(b, x + 0.071, y - 0.014, 0, 0.003, 0.013, 0.012); // front of the guard
    b.set(VM_GUN, 0);
    b.hull([[x + 0.03, y - 0.002], [x + 0.038, y - 0.002], [x + 0.034, y - 0.02], [x + 0.028, y - 0.018]], 0.003, 0.003); // trigger
}
/** Laser guns: glowing heat-cell windows along the body and a lit emitter ring at the muzzle. */
function vmLaserBits(b, x0, x1, y, muzzleX, r) {
    b.set(VM_LASER, 2);
    const n = Math.max(2, Math.round((x1 - x0) / 0.04));
    for (let i = 0; i < n; i++)
        b.mirrored((sd) => vmBox(b, x0 + (i + 0.5) * (x1 - x0) / n, y, sd * 0.0215, (x1 - x0) / n * 0.32, 0.007, 0.0008));
    b.cyl(muzzleX, y, 0, r * 1.05, r * 1.05, 0.006, 20, "x");
}
function vmCarbineHD(laser = false) {
    const b = new MeshBuilder();
    const BODY = laser ? [0.78, 0.8, 0.82] : VM_OLIVE;
    // stock: buffer tube, adjustable stock with butt pad and cheek riser, sling loop
    b.set(VM_BLK, 0);
    b.cyl(-0.2, 0.012, 0, 0.012, 0.012, 0.13, 16, "x"); // buffer tube
    b.set(BODY, 0);
    b.hull([[-0.3, -0.055], [-0.2, -0.03], [-0.17, 0.0], [-0.17, 0.026], [-0.3, 0.03]], 0.02, 0.018); // stock body
    b.set(VM_BLK, 0);
    vmBox(b, -0.302, -0.012, 0, 0.004, 0.044, 0.021); // butt pad
    vmBox(b, -0.235, 0.034, 0, 0.05, 0.006, 0.012); // cheek riser
    vmBox(b, -0.24, -0.046, 0, 0.012, 0.003, 0.016); // sling loop
    // lower and upper receiver (two tones), magazine well, ejection port, forward assist, charging handle
    b.set(BODY, 0);
    vmBox(b, 0.04, -0.008, 0, 0.12, 0.02, 0.022); // lower
    b.set(laser ? VM_GUN : VM_DARK, 0);
    vmBox(b, 0.05, 0.03, 0, 0.13, 0.019, 0.021); // upper
    b.set(VM_BLK, 0);
    vmBox(b, 0.07, 0.033, 0.0215, 0.035, 0.008, 0.001); // ejection port
    vmBox(b, 0.13, 0.03, 0.022, 0.008, 0.006, 0.004); // forward assist
    vmBox(b, -0.075, 0.046, 0, 0.012, 0.004, 0.014); // charging handle
    vmBox(b, 0.0, -0.002, -0.0225, 0.006, 0.006, 0.001); // safety selector
    vmGrip(b, -0.035, -0.028);
    // curved magazine with ribs and a base plate
    b.set(VM_BLK, 0);
    vmBox(b, 0.07, -0.034, 0, 0.026, 0.008, 0.019); // magazine well
    b.set(laser ? VM_GUN : VM_DARK, 0);
    b.hull([[0.048, -0.04], [0.092, -0.04], [0.108, -0.135], [0.066, -0.142]], 0.015, 0.015);
    b.set(VM_BLK, 0);
    for (const t of [0.3, 0.55, 0.8])
        vmBox(b, 0.07 + t * 0.03, -0.04 - t * 0.1, 0, 0.022, 0.002, 0.0158); // ribs
    vmBox(b, 0.088, -0.143, 0, 0.026, 0.004, 0.017); // base plate
    // handguard: an octagonal tube with vent slots, a full-length top rail, side rail stubs and an angled fore-grip
    b.set(BODY, 0);
    b.cyl(0.18, 0.012, 0, 0.026, 0.026, 0.23, 16, "x", true, Math.PI / 8);
    b.set(VM_BLK, 0);
    for (let i = 0; i < 6; i++)
        b.mirrored((sd) => vmBox(b, 0.21 + i * 0.033, 0.012, sd * 0.0245, 0.009, 0.0045, 0.002)); // vent slots
    vmRail(b, -0.07, 0.48, 0.052);
    b.mirrored((sd) => vmBox(b, 0.36, 0.012, sd * 0.027, 0.03, 0.004, 0.003)); // side rail stubs
    b.set(VM_GRIP, 0);
    b.hull([[0.3, -0.014], [0.34, -0.014], [0.33, -0.06], [0.305, -0.06]], 0.012, 0.011); // fore-grip
    // optic: a holographic sight with a hood, a lit reticle window and a brightness dial
    b.set(VM_BLK, 0);
    vmBox(b, 0.03, 0.061, 0, 0.03, 0.005, 0.013); // base
    b.mirrored((sd) => vmBox(b, 0.03, 0.074, sd * 0.013, 0.026, 0.009, 0.0015)); // hood sides
    vmBox(b, 0.03, 0.0835, 0, 0.026, 0.0015, 0.0145); // hood top
    b.set([1, 0.3, 0.2], 4);
    vmBox(b, 0.056, 0.074, 0, 0.001, 0.003, 0.003); // reticle
    b.set(VM_GUN, 0);
    b.cyl(0.01, 0.07, 0.0145, 0.005, 0.005, 0.005, 16, "z"); // dial
    // folding front sight, barrel with gas block, flash hider with slots
    b.set(VM_BLK, 0);
    vmBox(b, 0.43, 0.066, 0, 0.006, 0.012, 0.007);
    b.set(VM_STEEL, 0);
    b.cyl(0.41, 0.012, 0, 0.0095, 0.0095, 0.07, 16, "x"); // barrel
    b.set(VM_BLK, 0);
    vmBox(b, 0.425, 0.012, 0, 0.008, 0.013, 0.012); // gas block
    b.cyl(0.475, 0.012, 0, 0.014, 0.014, 0.03, 16, "x"); // flash hider
    b.set([0.08, 0.08, 0.08], 0);
    b.mirrored((sd) => vmBox(b, 0.49, 0.012, sd * 0.0135, 0.008, 0.003, 0.0012)); // its slots
    if (laser)
        vmLaserBits(b, 0.2, 0.4, 0.012, 0.5, 0.014);
    return b.build([0, 0, 0], 0, 0);
}
/** Machine pistol (one of the dual pair, held in each hand): slide with serrations, frame, extended magazine, compensator. */
function vmPistol(laser = false) {
    const b = new MeshBuilder();
    const BODY = laser ? [0.78, 0.8, 0.82] : VM_STEEL;
    b.set(BODY, 0);
    vmBox(b, 0.09, 0.024, 0, 0.13, 0.017, 0.014); // slide
    b.set(VM_BLK, 0);
    for (let i = 0; i < 6; i++)
        b.mirrored((sd) => vmBox(b, -0.025 + i * 0.008, 0.026, sd * 0.0142, 0.0018, 0.012, 0.0008)); // rear serrations
    vmBox(b, 0.07, 0.024, 0.0143, 0.03, 0.007, 0.0008); // ejection port
    vmBox(b, -0.03, 0.044, 0, 0.006, 0.004, 0.008); // rear sight
    vmBox(b, 0.2, 0.043, 0, 0.004, 0.004, 0.003); // front sight
    b.set(VM_GRIP, 0);
    vmBox(b, 0.08, -0.002, 0, 0.11, 0.01, 0.013); // frame
    vmRail(b, 0.11, 0.07, -0.016, 0.008);
    vmGrip(b, 0.0, -0.01, 0.075, 0.02);
    // extended magazine sticking out of the grip, with a grip sleeve
    b.set(VM_BLK, 0);
    // designer 21 Nov: the magazine runs down the grip's own rake (it sat forward of it), seated inside the grip
    b.hull([[-0.0337, -0.06], [-0.0097, -0.06], [-0.055, -0.17], [-0.079, -0.17]], 0.011, 0.011);
    vmBox(b, -0.067, -0.173, 0, 0.016, 0.004, 0.0125);
    // threaded barrel with a ported compensator
    b.set(VM_STEEL, 0);
    b.cyl(0.215, 0.024, 0, 0.0065, 0.0065, 0.012, 16, "x");
    b.set(VM_BLK, 0);
    vmBox(b, 0.245, 0.026, 0, 0.018, 0.013, 0.0125);
    b.set([0.08, 0.08, 0.08], 0);
    for (const x of [0.236, 0.25])
        vmBox(b, x, 0.039, 0, 0.003, 0.0015, 0.007); // ports on top
    if (laser) {
        b.set(VM_LASER, 2);
        b.mirrored((sd) => vmBox(b, 0.11, 0.024, sd * 0.0145, 0.05, 0.004, 0.0008));
        b.cyl(0.262, 0.026, 0, 0.0085, 0.0085, 0.004, 16, "x");
    }
    return b.build([0, 0, 0], 0, 0);
}
/** Pump shotgun: stock, receiver with a side shell carrier, pump with grooves, tube magazine under the barrel, bead sight. */
function vmShotgun(laser = false) {
    const b = new MeshBuilder();
    const BODY = laser ? [0.78, 0.8, 0.82] : VM_DARK, WOOD = laser ? VM_GUN : [0.48, 0.32, 0.2];
    b.set(WOOD, 0);
    b.hull([[-0.32, -0.07], [-0.07, -0.03], [-0.07, 0.022], [-0.32, 0.03]], 0.022, 0.02); // stock
    b.set(VM_BLK, 0);
    vmBox(b, -0.322, -0.02, 0, 0.004, 0.05, 0.023); // recoil pad
    b.set(BODY, 0);
    vmBox(b, 0.03, 0.01, 0, 0.1, 0.03, 0.024); // receiver
    b.set(VM_BLK, 0);
    vmBox(b, 0.03, -0.021, 0, 0.05, 0.004, 0.016); // loading port
    vmBox(b, 0.03, 0.042, 0, 0.09, 0.003, 0.008); // top rib
    vmGrip(b, -0.05, -0.016, 0.07, 0.025);
    // side saddle with four shells
    b.set(VM_BLK, 0);
    vmBox(b, 0.03, 0.01, -0.027, 0.045, 0.022, 0.003);
    b.set(laser ? VM_LASER : [0.75, 0.12, 0.1], laser ? 2 : 0);
    for (let i = 0; i < 4; i++)
        b.cyl(0.0 + i * 0.02, -0.012, -0.033, 0.0075, 0.0075, 0.044, 16, "y");
    b.set([0.82, 0.66, 0.3], 0);
    for (let i = 0; i < 4; i++)
        b.cyl(0.0 + i * 0.02, -0.016, -0.033, 0.008, 0.008, 0.006, 16, "y"); // brass bases
    // tube magazine and barrel
    b.set(VM_STEEL, 0);
    b.cyl(0.13, 0.022, 0, 0.013, 0.013, 0.48, 20, "x"); // barrel
    b.set(BODY, 0);
    b.cyl(0.13, -0.008, 0, 0.011, 0.011, 0.42, 20, "x"); // magazine tube
    vmBox(b, 0.55, 0.006, 0, 0.012, 0.022, 0.012); // barrel clamp
    // pump with grooves
    b.set(WOOD, 0);
    b.cyl(0.2, -0.004, 0, 0.022, 0.022, 0.14, 20, "x");
    b.set(VM_BLK, 0);
    for (let i = 0; i < 6; i++)
        b.cyl(0.21 + i * 0.022, -0.004, 0, 0.0232, 0.0232, 0.004, 20, "x");
    b.set([0.9, 0.85, 0.6], 0);
    vmBox(b, 0.6, 0.037, 0, 0.003, 0.003, 0.003); // bead
    if (laser)
        vmLaserBits(b, 0.15, 0.55, 0.022, 0.61, 0.014);
    const m = b.build([0, 0, 0], 0, 0);
    for (let i = 0; i < m.verts.length; i += exports.VERTEX_FLOATS)
        m.verts[i + 1] -= 0.01; // barrel axis at 0.012
    return m;
}
/** Marksman rifle: tan furniture, long free-float handguard, variable scope with turrets, folded bipod, 20-round magazine. */
function vmMarksman(laser = false) {
    const b = new MeshBuilder();
    const BODY = laser ? [0.78, 0.8, 0.82] : VM_TAN;
    b.set(BODY, 0);
    b.hull([[-0.36, -0.07], [-0.2, -0.045], [-0.08, -0.03], [-0.08, 0.03], [-0.36, 0.036]], 0.022, 0.019); // stock
    b.set(VM_BLK, 0);
    vmBox(b, -0.362, -0.016, 0, 0.004, 0.052, 0.023);
    vmBox(b, -0.25, 0.042, 0, 0.06, 0.007, 0.013); // cheek piece
    b.set(laser ? VM_GUN : VM_DARK, 0);
    vmBox(b, 0.05, 0.01, 0, 0.13, 0.03, 0.022); // receiver
    b.set(VM_BLK, 0);
    vmBox(b, 0.07, 0.02, 0.0222, 0.035, 0.009, 0.001); // ejection port
    vmGrip(b, -0.045, -0.02);
    b.set(laser ? VM_GUN : VM_DARK, 0);
    vmBox(b, 0.08, -0.07, 0, 0.022, 0.05, 0.016); // straight magazine
    b.set(VM_BLK, 0);
    vmBox(b, 0.08, -0.121, 0, 0.024, 0.004, 0.017);
    // handguard and barrel
    b.set(BODY, 0);
    b.cyl(0.18, 0.012, 0, 0.024, 0.024, 0.34, 16, "x", true, Math.PI / 8);
    b.set(VM_BLK, 0);
    for (let i = 0; i < 7; i++)
        b.mirrored((sd) => vmBox(b, 0.21 + i * 0.042, 0.012, sd * 0.0225, 0.012, 0.004, 0.002));
    vmRail(b, -0.06, 0.26, 0.044);
    b.set(VM_STEEL, 0);
    b.cyl(0.52, 0.012, 0, 0.0095, 0.009, 0.14, 16, "x");
    b.set(VM_BLK, 0);
    vmBox(b, 0.675, 0.012, 0, 0.022, 0.014, 0.014); // muzzle brake
    b.set([0.08, 0.08, 0.08], 0);
    b.mirrored((sd) => vmBox(b, 0.675, 0.012, sd * 0.0142, 0.012, 0.006, 0.0008));
    // scope: tube, eyepiece, objective, elevation / windage turrets, rings
    b.set(VM_BLK, 0);
    b.cyl(-0.05, 0.08, 0, 0.017, 0.015, 0.06, 20, "x"); // eyepiece
    b.cyl(0.01, 0.08, 0, 0.013, 0.013, 0.14, 20, "x");
    b.cyl(0.15, 0.08, 0, 0.014, 0.022, 0.05, 20, "x"); // objective bell
    b.cyl(0.06, 0.093, 0, 0.009, 0.009, 0.016, 16, "y"); // elevation turret
    b.cyl(0.06, 0.08, 0.012, 0.009, 0.009, 0.014, 16, "z"); // windage turret
    b.mirrored((sd) => vmBox(b, 0.06 + sd * 0.05, 0.06, 0, 0.007, 0.016, 0.014)); // rings
    b.set([0.6, 0.85, 1], 4);
    b.disc(0.2, 0.08, 0, 0.019, 20, "x", 1);
    // bipod folded under the handguard
    b.set(VM_BLK, 0);
    vmBox(b, 0.44, -0.016, 0, 0.012, 0.006, 0.012);
    b.mirrored((sd) => rod(b, [0.44, -0.02, sd * 0.01], [0.3, -0.03, sd * 0.016], 0.004, 4));
    if (laser)
        vmLaserBits(b, 0.2, 0.5, 0.012, 0.695, 0.015);
    return b.build([0, 0, 0], 0, 0);
}
/** Revolver grenade launcher: folding stock, a six-chamber cylinder with its spring housing, a fat short barrel, leaf sight. */
function vmLauncher(laser = false) {
    const b = new MeshBuilder();
    const BODY = laser ? [0.78, 0.8, 0.82] : VM_OLIVE;
    b.set(VM_BLK, 0);
    b.hull([[-0.3, -0.06], [-0.27, -0.06], [-0.12, -0.012], [-0.12, 0.012], [-0.3, 0.02]], 0.016, 0.016); // skeleton stock
    vmBox(b, -0.302, -0.02, 0, 0.004, 0.042, 0.02);
    b.set(BODY, 0);
    vmBox(b, -0.06, 0.006, 0, 0.07, 0.03, 0.026); // frame
    vmGrip(b, -0.07, -0.024, 0.075);
    // cylinder with chambers, flutes and the spring housing at the front
    b.set(laser ? VM_GUN : VM_DARK, 0);
    b.cyl(0.01, 0.0, 0, 0.055, 0.055, 0.14, 24, "x");
    b.set(VM_BLK, 0);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        vmBox(b, 0.08, Math.sin(a) * 0.056, Math.cos(a) * 0.056, 0.06, 0.004, 0.004); // flutes
    }
    b.set(laser ? VM_LASER : VM_HOT, laser ? 2 : 4);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.disc(0.009, Math.sin(a) * 0.033, Math.cos(a) * 0.033, 0.014, 16, "x", -1); // rounds in the chambers (rear face)
    }
    b.set(BODY, 0);
    b.cyl(0.15, 0.0, 0, 0.03, 0.03, 0.04, 20, "x"); // spring housing
    // barrel with the rail over it and a vertical fore-grip
    b.set(VM_DARK, 0);
    b.cyl(0.15, 0.012, 0, 0.027, 0.027, 0.26, 24, "x");
    b.set(VM_BLK, 0);
    b.cyl(0.4, 0.012, 0, 0.031, 0.031, 0.018, 24, "x"); // muzzle ring
    b.set([0.06, 0.06, 0.06], 0);
    b.disc(0.419, 0.012, 0, 0.021, 20, "x", 1); // bore
    vmRail(b, -0.1, 0.48, 0.062, 0.008);
    b.mirrored((sd) => vmBox(b, 0.0, 0.05, sd * 0.008, 0.004, 0.012, 0.0015)); // rail risers
    b.set(VM_BLK, 0);
    vmBox(b, 0.16, 0.085, 0, 0.004, 0.02, 0.012); // leaf sight
    b.set([1, 0.82, 0.3], 4);
    vmBox(b, 0.164, 0.098, 0, 0.0012, 0.0025, 0.0025);
    b.set(VM_GRIP, 0);
    b.hull([[0.28, -0.015], [0.31, -0.015], [0.305, -0.075], [0.282, -0.075]], 0.012, 0.012);
    if (laser)
        vmLaserBits(b, 0.17, 0.39, 0.012, 0.42, 0.03);
    return b.build([0, 0, 0], 0, 0);
}
/** Long rifle (slot 2): bolt action, chassis stock with an adjustable cheek and monopod, big thermal scope, fluted barrel, brake. */
function vmLongRifle() {
    const b = new MeshBuilder();
    b.set(VM_TAN, 0);
    b.hull([[-0.38, -0.08], [-0.22, -0.05], [-0.06, -0.04], [-0.06, 0.03], [-0.38, 0.035]], 0.023, 0.02); // chassis stock
    b.set(VM_BLK, 0);
    vmBox(b, -0.382, -0.022, 0, 0.004, 0.058, 0.024); // butt pad
    vmBox(b, -0.26, 0.044, 0, 0.07, 0.007, 0.014); // cheek piece
    b.mirrored((sd) => vmBox(b, -0.26, 0.026, sd * 0.016, 0.004, 0.012, 0.002)); // its posts
    b.cyl(-0.31, -0.07, 0, 0.005, 0.005, 0.04, 16, "y"); // monopod
    b.set(VM_TAN, 0);
    vmBox(b, 0.07, 0.0, 0, 0.13, 0.034, 0.026); // receiver chassis
    b.set(VM_DARK, 0);
    b.cyl(-0.05, 0.03, 0, 0.016, 0.016, 0.2, 20, "x"); // action / bolt body
    b.set(VM_STEEL, 0);
    rod(b, [-0.02, 0.03, 0.016], [-0.02, 0.012, 0.05], 0.004, 5); // bolt handle
    b.cyl(-0.02, 0.012, 0.05, 0.009, 0.009, 0.012, 16, "z"); // bolt knob
    vmGrip(b, -0.045, -0.028, 0.085, 0.035);
    b.set(VM_DARK, 0);
    vmBox(b, 0.07, -0.048, 0, 0.022, 0.018, 0.016); // detachable magazine
    // thermal scope: housing, display eyepiece, lens and a lit battery cap
    b.set(VM_DARK, 0);
    b.cyl(-0.07, 0.072, 0, 0.018, 0.016, 0.06, 20, "x");
    vmBox(b, 0.04, 0.072, 0, 0.08, 0.02, 0.02);
    b.cyl(0.12, 0.072, 0, 0.02, 0.026, 0.05, 20, "x");
    b.set(VM_BLK, 0);
    b.cyl(0.03, 0.096, 0, 0.008, 0.008, 0.01, 16, "y"); // focus knob
    b.mirrored((sd) => vmBox(b, 0.04 + sd * 0.055, 0.05, 0, 0.008, 0.012, 0.014)); // rings
    b.set([1, 0.55, 0.25], 4);
    b.disc(0.171, 0.072, 0, 0.022, 20, "x", 1);
    b.set([0.35, 1, 0.45], 4);
    vmBox(b, 0.0, 0.072, 0.0205, 0.006, 0.004, 0.0008); // status LED
    // fore-end and a fluted barrel
    b.set(VM_TAN, 0);
    b.hull([[0.2, -0.034], [0.48, -0.022], [0.48, 0.022], [0.2, 0.034]], 0.022, 0.018);
    b.set(VM_BLK, 0);
    for (let i = 0; i < 5; i++)
        b.mirrored((sd) => vmBox(b, 0.24 + i * 0.05, 0.0, sd * 0.021, 0.014, 0.006, 0.001));
    b.set(VM_STEEL, 0);
    b.cyl(0.2, 0.006, 0, 0.014, 0.011, 0.53, 16, "x");
    b.set([0.4, 0.42, 0.42], 0);
    for (let i = 0; i < 4; i++)
        vmBox(b, 0.52 + i * 0.045, 0.006, 0, 0.018, 0.0122, 0.0122); // flutes (darker bands)
    b.set(VM_BLK, 0);
    vmBox(b, 0.745, 0.006, 0, 0.03, 0.02, 0.02); // brake
    b.set([0.08, 0.08, 0.08], 0);
    for (const x of [0.73, 0.75, 0.77])
        b.mirrored((sd) => vmBox(b, x, 0.006, sd * 0.0202, 0.005, 0.01, 0.0008));
    return b.build([0, 0, 0], 0, 0);
}
/** Heavy machine gun (slot 2): perforated barrel shroud, top cover with a carry handle, belt feed from a side box, bipod. */
function vmHmg() {
    const b = new MeshBuilder();
    b.set(VM_DARK, 0);
    b.hull([[-0.34, -0.07], [-0.12, -0.04], [-0.12, 0.03], [-0.34, 0.035]], 0.024, 0.022); // stock
    b.set(VM_BLK, 0);
    vmBox(b, -0.342, -0.018, 0, 0.004, 0.054, 0.025);
    b.set(VM_GUN, 0);
    vmBox(b, 0.03, 0.006, 0, 0.15, 0.04, 0.032); // receiver
    b.set(VM_DARK, 0);
    vmBox(b, 0.03, 0.05, 0, 0.13, 0.006, 0.03); // feed cover
    b.set(VM_BLK, 0);
    vmBox(b, -0.06, 0.06, 0, 0.012, 0.006, 0.012); // cover latch
    for (let i = 0; i < 5; i++)
        b.mirrored((sd) => vmBox(b, -0.08 + i * 0.03, 0.006, sd * 0.0325, 0.008, 0.026, 0.001)); // side panel ribs
    vmGrip(b, -0.07, -0.034, 0.085);
    // carry handle
    b.set(VM_BLK, 0);
    rod(b, [0.06, 0.056, 0], [0.09, 0.1, 0], 0.006, 5);
    rod(b, [0.2, 0.056, 0], [0.17, 0.1, 0], 0.006, 5);
    vmBox(b, 0.13, 0.102, 0, 0.045, 0.007, 0.01);
    // belt box on the left with a belt of rounds into the feed tray
    b.set(VM_OLIVE, 0);
    vmBox(b, 0.04, -0.07, -0.03, 0.06, 0.045, 0.03);
    b.set(VM_BLK, 0);
    vmBox(b, 0.04, -0.07, -0.061, 0.05, 0.035, 0.001); // lid
    b.set([0.82, 0.66, 0.3], 0);
    for (let i = 0; i < 6; i++)
        b.cyl(-0.02 + i * 0.016, -0.02 + i * 0.006, -0.036 + i * 0.004, 0.0045, 0.0045, 0.03, 16, "z"); // rounds
    // shroud with holes, the barrel inside and a big flash hider
    b.set(VM_DARK, 0);
    b.cyl(0.18, 0.006, 0, 0.03, 0.03, 0.42, 24, "x");
    b.set([0.14, 0.14, 0.14], 0);
    for (let i = 0; i < 8; i++)
        for (const a of [0.6, 1.57, 2.55, -0.6, -1.57, -2.55])
            vmBox(b, 0.2 + i * 0.05, 0.006 + Math.sin(a) * 0.0302, Math.cos(a) * 0.0302, 0.0055, 0.0032, 0.0032); // cooling holes
    b.set(VM_STEEL, 0);
    b.cyl(0.6, 0.006, 0, 0.014, 0.014, 0.12, 16, "x");
    b.set(VM_BLK, 0);
    b.cyl(0.72, 0.006, 0, 0.022, 0.02, 0.05, 16, "x"); // flash hider
    vmBox(b, 0.6, 0.046, 0, 0.005, 0.012, 0.006); // front sight post
    vmBox(b, 0.0, 0.07, 0, 0.012, 0.008, 0.012); // rear sight
    // bipod folded forward
    b.set(VM_BLK, 0);
    vmBox(b, 0.55, -0.026, 0, 0.012, 0.006, 0.016);
    b.mirrored((sd) => rod(b, [0.55, -0.03, sd * 0.012], [0.7, -0.03, sd * 0.02], 0.005, 4));
    return b.build([0, 0, 0], 0, 0);
}
/** Medic gun (slot 2): white body, a glass canister of glowing medi-gel, a hose, a cross, and a ring emitter. */
function vmMedic() {
    const b = new MeshBuilder();
    b.set(VM_WHITE, 0);
    b.hull([[-0.25, -0.05], [-0.06, -0.03], [-0.06, 0.035], [-0.25, 0.03]], 0.022, 0.02); // stock
    vmBox(b, 0.06, 0.006, 0, 0.12, 0.035, 0.028); // body
    b.set([0.85, 0.15, 0.15], 0);
    vmBox(b, 0.06, 0.006, 0.0285, 0.018, 0.006, 0.001);
    vmBox(b, 0.06, 0.006, 0.0285, 0.006, 0.018, 0.001); // red cross
    b.set(VM_BLK, 0);
    vmBox(b, 0.06, 0.042, 0, 0.1, 0.004, 0.02); // top strip
    vmGrip(b, -0.04, -0.028);
    // canister on top: metal caps, glowing gel
    b.set(VM_GUN, 0);
    b.cyl(-0.02, 0.07, 0, 0.022, 0.022, 0.012, 20, "x");
    b.cyl(0.13, 0.07, 0, 0.022, 0.022, 0.012, 20, "x");
    b.set([0.35, 1, 0.55], 4);
    b.cyl(-0.008, 0.07, 0, 0.018, 0.018, 0.138, 20, "x");
    b.set(VM_BLK, 0);
    b.mirrored((sd) => vmBox(b, 0.06, 0.05, sd * 0.012, 0.07, 0.004, 0.002)); // cage bars
    rod(b, [0.14, 0.06, 0.012], [0.2, 0.02, 0.026], 0.005, 5); // hose
    // nozzle with emitter rings
    b.set(VM_WHITE, 0);
    b.cyl(0.18, 0.006, 0, 0.02, 0.016, 0.14, 20, "x");
    b.set(VM_GUN, 0);
    for (const x of [0.25, 0.29])
        b.cyl(x, 0.006, 0, 0.022, 0.022, 0.008, 20, "x");
    b.set([0.35, 1, 0.55], 4);
    b.cyl(0.32, 0.006, 0, 0.018, 0.018, 0.006, 20, "x");
    return b.build([0, 0, 0], 0, 0);
}
function flViewModels() {
    const o = {};
    for (const [k, f] of [["carbine", vmCarbineHD], ["pistol", vmPistol], ["shotgun", vmShotgun], ["marksman", vmMarksman], ["launcher", vmLauncher]]) {
        o[`vm-${k}-k`] = vmSmooth(f(false));
        o[`vm-${k}-l`] = vmSmooth(f(true));
    }
    o["vm-longrifle"] = vmSmooth(vmLongRifle());
    o["vm-hmg"] = vmSmooth(vmHmg());
    o["vm-medic"] = vmSmooth(vmMedic());
    return o;
}
Object.assign(exports.VIEWMODEL_AXIS, { "vm-carbine-k": [-0.3, 0.505], "vm-carbine-l": [-0.3, 0.505], "vm-pistol-k": [-0.04, 0.263], "vm-pistol-l": [-0.04, 0.266],
    "vm-shotgun-k": [-0.32, 0.61], "vm-shotgun-l": [-0.32, 0.615], "vm-marksman-k": [-0.36, 0.697], "vm-marksman-l": [-0.36, 0.7], "vm-launcher-k": [-0.3, 0.42], "vm-launcher-l": [-0.3, 0.42],
    "vm-longrifle": [-0.38, 0.775], "vm-hmg": [-0.34, 0.77], "vm-medic": [-0.25, 0.326] });
function viewModelMeshes() {
    return { ...flViewModels(), "vm-carbine": vmSmooth(vmCarbine()), "vm-rifle": vmSmooth(vmRifle()), "vm-torch": vmTorch(), "vm-build": vmBuild(), "vm-beacon": vmBeacon(),
        "vm-beacon-supply": vmBeacon([0.35, 1, 0.45]), "vm-beacon-defensive": vmBeacon([0.3, 0.75, 1]), "vm-beacon-recon": vmBeacon([1, 0.9, 0.3]), "vm-beacon-orbital": vmBeacon([1, 0.32, 0.18]), "vm-beacon-air": vmBeacon([1, 0.6, 0.15]), "vm-flash": vmFlash(), "vm-tube": vmSmooth(vmTube()), "vm-lance": vmSmooth(vmLance()), "vm-amr": vmSmooth(vmAmr()), "vm-lcannon": vmSmooth(vmLaserCannon()) };
}
// ---------------------------------------------------------------- G1: resource fields (ore deposits, gas geysers)
/** A rotated crystal: an n-sided prism from the ground with a pointed tip, tilted by (tx, tz) and turned by yaw. */
function crystal(b, x, z, h, r, tx, tz, yaw, n = 5, y0 = -0.4) {
    const ct = Math.cos(tx), st = Math.sin(tx), cz = Math.cos(tz), sz = Math.sin(tz), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const P = (u, v, w) => {
        // local: v up the crystal axis; tilt about x then z, then yaw, then translate
        let X = u, Y = v * ct - w * st, Z = v * st + w * ct;
        const X2 = X * cz - Y * sz;
        Y = X * sz + Y * cz;
        X = X2;
        return [x + X * cy - Z * sy, y0 + Y, z + X * sy + Z * cy];
    };
    const bot = [], mid = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        bot.push(P(Math.cos(a) * r, 0, Math.sin(a) * r));
        mid.push(P(Math.cos(a) * r * 0.86, h * 0.72, Math.sin(a) * r * 0.86));
    }
    const tip = P(0, h, 0), c = P(0, h * 0.4, 0), base = b.col;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        b.col = [base[0] * (i % 2 ? 0.86 : 1), base[1] * (i % 2 ? 0.86 : 1), base[2] * (i % 2 ? 0.86 : 1)];
        b.poly([bot[i], bot[j], mid[j], mid[i]], c);
        b.col = [Math.min(1, base[0] * 1.25), Math.min(1, base[1] * 1.25), Math.min(1, base[2] * 1.25)];
        b.tri(mid[i], mid[j], tip, c);
    }
    b.col = base;
}
const ORE_A = [0.62, 0.34, 0.86], ORE_B = [0.5, 0.28, 0.78], ORE_C = [0.74, 0.46, 0.95], ORE_ROCK = [0.36, 0.33, 0.36];
/** G1: one ore outcrop (about 3 m across, crystals to 5.5 m): purple crystals in a cracked rock bed, faintly self-lit
 * (material 4). Several are placed over each deposit; they shrink and thin out as its ore runs down. */
function oreMesh(spent = false) {
    const b = new MeshBuilder();
    b.grit = exports.GRIT * 1.5;
    b.set(spent ? [0.3, 0.3, 0.3] : ORE_ROCK, 0);
    b.ball(0, -0.1, 0, 2.4, 0, 0.32);
    b.ball(1.4, -0.1, 0.9, 1.3, 0, 0.45);
    b.ball(-1.2, -0.1, -1.0, 1.1, 0, 0.5);
    const C = [
        [0, 0, 5.4, 0.62, 0.05, -0.08, ORE_A], [0.9, 0.5, 3.6, 0.46, 0.35, -0.3, ORE_C], [-0.8, 0.6, 3.0, 0.42, 0.3, 0.35, ORE_B],
        [0.3, -1.0, 2.6, 0.4, -0.45, -0.1, ORE_C], [-0.9, -0.6, 4.0, 0.5, -0.25, 0.3, ORE_A], [1.6, -0.3, 1.8, 0.32, -0.1, -0.6, ORE_B], [-1.7, 0.2, 1.5, 0.3, 0.2, 0.6, ORE_C],
    ];
    for (const [x, z, h, r, tx, tz, col] of C) {
        if (spent) {
            b.set([0.36, 0.35, 0.37], 0);
            crystal(b, x, z, h * 0.28, r * 1.05, tx * 0.6, tz * 0.6, x * 3 + z);
            continue;
        }
        b.set(col, 4);
        crystal(b, x, z, h, r, tx, tz, x * 3 + z);
    }
    if (!spent) {
        b.set([0.86, 0.66, 1.0], 4);
        b.ball(0.5, 0.15, 0.2, 0.35, 0, 0.6);
        b.ball(-0.4, 0.15, -0.3, 0.3, 0, 0.6);
    } // loose shards
    return b.build([0, 0, 0], 0, 0);
}
/** G1: a gas geyser vent: a mineral-crusted mound with a glowing throat (material 4, pulsing), fumaroles and four
 * survey stakes with green lamps. The Gas Extractor, when built, sits over the throat. Radius about 6 m. */
function geyserMesh() {
    const b = new MeshBuilder();
    b.grit = exports.GRIT * 1.6;
    const CRUST = [0.66, 0.64, 0.55], CRUST2 = [0.56, 0.58, 0.5], SINTER = [0.78, 0.76, 0.66], GAS = [0.45, 1.0, 0.62];
    b.set(CRUST2, 0);
    b.cyl(0, -0.6, 0, 6.4, 4.4, 1.3, 9, "y", false, 0.2);
    b.set(CRUST, 0);
    b.cyl(0, 0.7, 0, 4.4, 2.2, 1.5, 9, "y", false, 0.55);
    b.set(SINTER, 0);
    b.cyl(0, 2.2, 0, 2.2, 1.7, 0.35, 9, "y", false, 0.9); // rim
    b.set([0.12, 0.13, 0.12], 0);
    b.disc(0, 2.56, 0, 1.7, 9, "y", 1, 0.9); // throat
    b.set(GAS, 4);
    b.disc(0, 2.58, 0, 1.1, 9, "y", 1, 0.9); // glowing gas in the throat
    for (const [x, z, s] of [[4.2, 2.6, 1], [-3.6, 3.4, 0.8], [-1.4, -4.6, 0.9]]) {
        b.set(CRUST, 0);
        b.cyl(x, -0.3, z, 1.3 * s, 0.4 * s, 1.6 * s, 6);
        b.set(GAS, 4);
        b.disc(x, -0.3 + 1.62 * s, z, 0.32 * s, 6, "y", 1);
    }
    b.set([0.42, 0.4, 0.36], 0);
    b.ball(5.0, 0, -2.2, 0.9, 0, 0.6);
    b.ball(-5.2, 0, -0.8, 0.7, 0, 0.6);
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4, x = Math.cos(a) * 7.2, z = Math.sin(a) * 7.2;
        b.set(GUN, 0);
        b.cyl(x, -0.3, z, 0.09, 0.07, 2.6, 4, "y", false);
        b.set(HAZARD, 0);
        b.box(x, 1.6, z, 0.11, 0.3, 0.11);
        b.set(GAS, 4);
        b.box(x, 2.4, z, 0.16, 0.16, 0.16);
    }
    return b.build([0, 0, 0], 0, 0);
}
function propPalette(planet) {
    switch (planet) {
        case "rust": return { rock: [0.56, 0.36, 0.25], rock2: [0.44, 0.27, 0.19], g: [[0.42, 0.36, 0.2], [0.48, 0.4, 0.22], [0.38, 0.3, 0.18], [0.52, 0.44, 0.26]], trunk: [0.3, 0.22, 0.16], tuft: [[0.62, 0.48, 0.3], [0.7, 0.55, 0.34], [0.55, 0.4, 0.26]] };
        case "pale": return { rock: [0.55, 0.56, 0.58], rock2: [0.4, 0.41, 0.44], g: [[0.5, 0.52, 0.55], [0.58, 0.6, 0.63], [0.45, 0.46, 0.5], [0.62, 0.66, 0.7]], trunk: [0.3, 0.3, 0.32], tuft: [[0.6, 0.64, 0.68], [0.7, 0.74, 0.78], [0.5, 0.52, 0.56]] };
        case "brume": return { rock: [0.36, 0.42, 0.41], rock2: [0.27, 0.32, 0.32], g: [[0.2, 0.34, 0.3], [0.24, 0.4, 0.34], [0.17, 0.29, 0.27], [0.28, 0.44, 0.37]], trunk: [0.22, 0.2, 0.18], tuft: [[0.32, 0.46, 0.4], [0.4, 0.52, 0.44], [0.26, 0.38, 0.34]] };
        case "cinder": return { rock: [0.25, 0.23, 0.23], rock2: [0.16, 0.15, 0.15], g: [[0.2, 0.18, 0.17], [0.24, 0.2, 0.18], [0.18, 0.16, 0.15], [0.3, 0.24, 0.2]], trunk: [0.12, 0.1, 0.09], tuft: [[0.32, 0.28, 0.25], [0.38, 0.3, 0.25], [0.28, 0.25, 0.23]] };
    }
    return { rock: [0.48, 0.47, 0.43], rock2: [0.4, 0.39, 0.36], g: [[0.18, 0.35, 0.24], [0.2, 0.4, 0.25], [0.24, 0.45, 0.27], [0.28, 0.5, 0.3]], trunk: [0.31, 0.23, 0.16], tuft: [[0.5, 0.56, 0.28], [0.62, 0.62, 0.34], [0.42, 0.52, 0.24]] };
}
/** A jittered, squashed icosahedron (fixed jitter from a seed). */
function boulder(b, x, y, z, r, sq, seed) {
    const m = b.mark();
    b.ball(x, y, z, r, 0, 1);
    const d = b.d;
    const off = new Map();
    for (let i = m; i < d.length; i += exports.VERTEX_FLOATS) {
        const k = `${d[i].toFixed(3)},${d[i + 1].toFixed(3)},${d[i + 2].toFixed(3)}`;
        let j = off.get(k);
        if (j === undefined) {
            j = 1 + 0.22 * (Math.abs(Math.sin(off.size * 12.9 + seed * 7.3) * 43758.5) % 1 - 0.5);
            off.set(k, j);
        }
        d[i] = x + (d[i] - x) * j * sq[0];
        d[i + 1] = y + (d[i + 1] - y) * j * sq[1];
        d[i + 2] = z + (d[i + 2] - z) * j * sq[2];
    }
    // re-derive the face normals after the jitter
    for (let i = m; i < d.length; i += exports.VERTEX_FLOATS * 3) {
        const a = [d[i], d[i + 1], d[i + 2]], bb = [d[i + 11], d[i + 12], d[i + 13]], c = [d[i + 22], d[i + 23], d[i + 24]];
        const ux = bb[0] - a[0], uy = bb[1] - a[1], uz = bb[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        const sh = ny < -0.35 ? exports.UNDER_DARK : 1 + 0.1 * ((Math.abs(Math.sin((a[0] + bb[0]) * 9.1 + c[2] * 5.3) * 437.5) % 1) - 0.5) + 0.08 * ny;
        for (let k = 0; k < 3; k++) {
            const o = i + k * exports.VERTEX_FLOATS;
            d[o + 3] = nx;
            d[o + 4] = ny;
            d[o + 5] = nz;
            d[o + 6] *= sh;
            d[o + 7] *= sh;
            d[o + 8] *= sh;
        }
    }
}
/** Rock: a main faceted boulder and a smaller one leaning on it (the concept's grey rocks). */
function rockMesh(planet = "halcyon") {
    const b = new MeshBuilder(), P = propPalette(planet);
    b.set(P.rock, 0);
    boulder(b, 0, 0.25, 0, 1.0, [1.25, 0.68, 1.0], 1);
    b.set(P.rock2, 0);
    boulder(b, 0.85, 0.1, 0.45, 0.55, [1.1, 0.75, 1.0], 2);
    return b.build([0, 0, 0], 0, 0);
}
/** Conifer (the concept's): a trunk and four stacked cones in alternating greens, each slightly offset. Off Halcyon the
 * same shape is a dead, bare snag in the planet's colours. */
function treeMesh(planet = "halcyon") {
    const b = new MeshBuilder(), P = propPalette(planet);
    b.set(P.trunk, 0);
    b.cyl(0, -0.3, 0, 0.3, 0.2, 2.4, 6, "y", false);
    let r = 2.1, y = 1.2;
    for (let i = 0; i < 4; i++) {
        b.set(P.g[i], 0);
        b.cyl(Math.sin(i * 2.1) * 0.1, y, Math.cos(i * 1.7) * 0.1, r, 0, 2.1, 7, "y", true, i * 0.7);
        r *= 0.76;
        y += 1.2;
    }
    return b.build([0, 0, 0], 0, 0);
}
function stumpMesh(planet = "halcyon") {
    const b = new MeshBuilder(), P = propPalette(planet);
    b.set([P.trunk[0] * 0.85, P.trunk[1] * 0.85, P.trunk[2] * 0.85], 0);
    b.cyl(0, -0.2, 0, 0.38, 0.26, 1.6, 5, "y", false);
    b.set([0.14, 0.12, 0.1], 0);
    b.cyl(0, 1.4, 0, 0.26, 0.06, 0.6, 5, "y", false);
    b.set(P.trunk, 0);
    b.cyl(0.2, 0.9, 0, 0.08, 0.04, 0.9, 4, "x", false);
    return b.build([0, 0, 0], 0, 0);
}
function grassTuftMesh(planet = "halcyon") {
    // a clump of broad leaning blades, both faces; 20 triangles
    const b = new MeshBuilder(), P = propPalette(planet);
    const blade = (a, lean, h, w, col) => {
        b.set(col, 0);
        const c = Math.cos(a), s = Math.sin(a), px = -s * w, pz = c * w;
        const tip = [c * lean, h, s * lean];
        b.tri([px, 0, pz], [-px, 0, -pz], tip);
        b.tri([-px, 0, -pz], [px, 0, pz], tip);
    };
    const [G1, G2, G3] = P.tuft;
    blade(0.2, 0.35, 0.7, 0.16, G1);
    blade(1.4, 0.4, 0.55, 0.15, G2);
    blade(2.5, 0.3, 0.8, 0.16, G3);
    blade(3.6, 0.45, 0.5, 0.15, G2);
    blade(4.6, 0.38, 0.65, 0.15, G1);
    blade(5.5, 0.25, 0.6, 0.16, G2);
    blade(0.9, 0.15, 0.85, 0.12, G3);
    blade(3.0, 0.2, 0.8, 0.12, G1);
    blade(2.0, 0.5, 0.45, 0.14, G2);
    blade(5.0, 0.5, 0.5, 0.14, G3);
    return b.build([0, 0, 0], 0, 0);
}
function bushMesh(planet = "halcyon") {
    const b = new MeshBuilder(), P = propPalette(planet);
    b.set(P.g[2], 0);
    boulder(b, 0, 0.45, 0, 0.85, [1.2, 0.72, 1.0], 3);
    b.set(P.g[3], 0);
    boulder(b, 0.5, 0.4, 0.3, 0.55, [1.1, 0.8, 1.0], 4);
    b.set(P.g[1], 0);
    boulder(b, -0.4, 0.35, -0.35, 0.5, [1.1, 0.75, 1.0], 5);
    return b.build([0, 0, 0], 0, 0);
}
function broadleafMesh(planet = "halcyon") {
    const b = new MeshBuilder(), P = propPalette(planet);
    b.set(P.trunk, 0);
    b.cyl(0, -0.3, 0, 0.24, 0.15, 3.4, 5, "y", false);
    b.set(P.g[2], 0);
    boulder(b, 0, 3.9, 0, 1.9, [1, 0.8, 1], 6);
    b.set(P.g[3], 0);
    boulder(b, 0.8, 3.3, 0.5, 1.2, [1, 0.8, 1], 7);
    b.set(P.g[1], 0);
    boulder(b, -0.7, 3.4, -0.6, 1.1, [1, 0.85, 1], 8);
    return b.build([0, 0, 0], 0, 0);
}
function pebbleMesh(planet = "halcyon") { const b = new MeshBuilder(), P = propPalette(planet); b.set(P.rock, 0); boulder(b, 0, 0.1, 0, 1, [1, 0.45, 1], 9); return b.build([0, 0, 0], 0, 0); }
/** Rock spire for the rock-forest / ruins cells off Halcyon: rust sandstone stacks, pale glass shards, brume ruined
 * pillars, cinder basalt columns. */
function spireMesh(planet = "halcyon") {
    const b = new MeshBuilder(), P = propPalette(planet);
    if (planet === "cinder") {
        for (const [x, z, h] of [[0, 0, 7], [1.3, 0.4, 5], [-0.9, 1.0, 4], [0.4, -1.3, 3.2], [-1.2, -0.6, 2.2]]) {
            b.set(h > 4 ? P.rock : P.rock2, 0);
            b.cyl(x, -0.5, z, 0.75, 0.7, h, 6, "y", true, x);
        }
        return b.build([0, 0, 0], 0, 0);
    }
    if (planet === "pale") {
        b.set(GLASS, 0);
        crystal(b, 0, 0, 6, 0.9, 0.12, -0.1, 0.3, 5);
        crystal(b, 1.1, 0.6, 3.5, 0.6, 0.4, -0.3, 1.0, 5);
        crystal(b, -0.8, -0.6, 3, 0.5, -0.3, 0.35, 2.0, 5);
        b.set(P.rock2, 0);
        boulder(b, 0, 0, 0, 1.6, [1.2, 0.4, 1], 10);
        return b.build([0, 0, 0], 0, 0);
    }
    if (planet === "brume") {
        b.set(CON2, 0);
        b.cyl(0, -0.5, 0, 0.8, 0.7, 6, 6, "y", false);
        b.set(P.rock, 0);
        b.box(0.2, 5.6, 0, 1.2, 0.3, 0.9);
        b.set(CON2, 0);
        b.cyl(2.6, -0.5, 0.4, 0.8, 0.75, 2.6, 6, "y", true, 0.4);
        b.set(P.rock2, 0);
        boulder(b, 1.4, 0.1, -1.0, 0.9, [1.3, 0.5, 1], 11);
        return b.build([0, 0, 0], 0, 0);
    }
    b.set(P.rock, 0);
    b.cyl(0, -0.5, 0, 1.8, 1.2, 4.0, 7, "y", false);
    b.set(P.rock2, 0);
    b.cyl(0, 3.5, 0, 1.3, 1.5, 1.2, 7, "y", false, 0.3);
    b.set(P.rock, 0);
    b.cyl(0, 4.7, 0, 1.5, 1.0, 1.4, 7, "y", true, 0.6);
    b.set(P.rock2, 0);
    boulder(b, 1.8, 0.1, 0.6, 0.9, [1.2, 0.6, 1], 12);
    return b.build([0, 0, 0], 0, 0);
}
/** Base dressing (placed round structures): crate stacks with a barrel, a sandbag line, a lamp post, a pipe run. */
function dressingMesh(kind) {
    const b = new MeshBuilder();
    b.grit = exports.GRIT;
    if (kind === "crates") {
        crates(b, 0, 0, 3);
        b.set(OLIVE, 0);
        b.box(0.55, 1.35, 0, 0.42, 0.42, 0.42);
        b.set([0.48, 0.24, 0.17], 0);
        b.cyl(-1.0, 0, -0.3, 0.4, 0.4, 1.1, 8);
        b.cyl(-1.1, 0, 0.6, 0.4, 0.4, 1.1, 8);
        b.set(STEEL, 0);
        b.cyl(-1.0, 0.5, -0.3, 0.42, 0.42, 0.08, 8, "y", false);
    }
    else if (kind === "sandbags") {
        const C = [[0.6, 0.55, 0.42], [0.55, 0.5, 0.38], [0.64, 0.58, 0.45]];
        for (let i = 0; i < 6; i++) {
            b.set(C[i % 3], 0);
            b.ball(-2.6 + i * 1.05, 0.22, 0, 0.58, 0, 0.42);
        }
        for (let i = 0; i < 5; i++) {
            b.set(C[(i + 1) % 3], 0);
            b.ball(-2.1 + i * 1.05, 0.6, 0, 0.56, 0, 0.4);
        }
    }
    else if (kind === "lamp") {
        b.set(STEEL, 0);
        b.cyl(0, -0.2, 0, 0.12, 0.09, 5.6, 5, "y", false);
        b.box(0.35, 5.4, 0, 0.45, 0.08, 0.15);
        b.set([1.0, 0.92, 0.7], 4);
        b.box(0.6, 5.28, 0, 0.25, 0.05, 0.12);
        b.set(CON2, 0);
        b.box(0, 0.1, 0, 0.35, 0.3, 0.35);
    }
    else {
        b.set(DARK, 0);
        b.hull([[-1.4, 0], [1.2, 0], [1.6, 0.3], [-0.6, 0.6]], 0.8, 0.5);
        b.set(GUN, 0);
        b.box(0.4, 0.2, 1.2, 1.0, 0.08, 0.3);
        b.set([0.32, 0.2, 0.14], 0);
        b.cyl(-1.2, 0.1, -1.0, 0.25, 0.25, 1.4, 6, "x", false);
        b.set(DARK, 0);
        boulder(b, 1.6, 0, -0.8, 0.4, [1.3, 0.5, 1], 13);
    }
    return b.build([0, 0, 0], 0, 0);
}
