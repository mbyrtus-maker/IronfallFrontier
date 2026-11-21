// Offline software preview of mesh kinds (iteration aid): node tools/fb_preview.js <mech|gunship|flpod|flcrate|siege|dropship> out.png [lo]
const path = require("path"), zlib = require("zlib"), fs = require("fs");
const M = require(path.resolve(__dirname, "../frontline/src/packages/client/src/meshes.js"));
const WK = require(path.resolve(__dirname, "../frontline/src/packages/client/src/w1-walker.js"));
const kind = process.argv[2], out = process.argv[3], lo = process.argv[4] === "lo";
const VF = M.VERTEX_FLOATS;
const HULL = [0.5, 0.54, 0.45], GLOW = [0.25, 0.8, 1.0];
// gather triangles: [p0,p1,p2,n,col,mat]
function tris(mesh, xf) {
    const o = [], v = mesh.verts;
    for (let i = 0; i < v.length; i += VF * 3) {
        const P = [], part = v[i + 9], mat = v[i + 10];
        for (let k = 0; k < 3; k++) { const j = i + k * VF; P.push(xf ? xf([v[j], v[j + 1], v[j + 2]], part) : [v[j], v[j + 1], v[j + 2]]); }
        o.push({ P, col: [v[i + 6], v[i + 7], v[i + 8]], mat });
    }
    return o;
}
function legXf(hip, reach, drop, k) {
    const L1 = WK.WALKER.L1, L2 = WK.WALKER.L2, po = WK.legPose(reach / k, drop / k);
    const sa = Math.atan2(drop / k - po.ky, reach / k - po.kx);
    const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
    return (p, part) => {
        let q = p;
        if (part > 6.5 && part < 7.5) q = rot(p, po.hip);
        else if (part > 7.5 && part < 8.5) { q = rot(p, sa); q = [q[0] + po.kx, q[1] + po.ky, q[2]]; }
        else if (part > 8.5) q = [p[0] + po.kx + L2 * Math.cos(sa), p[1] + po.ky + L2 * Math.sin(sa), p[2]];
        return [hip[0] + q[0] * k, hip[1] + q[1] * k, hip[2] + q[2] * k];
    };
}
function legXfY(hip, reach, drop, k, yaw) {
    const f = legXf([0, 0, 0], reach, drop, k), c = Math.cos(yaw), sn = Math.sin(yaw);
    return (p, part) => { const q = f(p, part); return [hip[0] + q[0] * c - q[2] * sn, hip[1] + q[1], hip[2] + q[0] * sn + q[2] * c]; };
}
let T = [];
if (kind === "mech" || kind === "mechwalk") {
    T = tris(M.buildKind("mech", lo));
    const leg = M.buildKind("mleg", lo), W = WK.MECH_WALKER;
    W.hips.forEach((h, i) => {
        const walk = kind === "mechwalk";
        const reach = walk ? (i ? -1.6 : 1.9) : 0.15, drop = walk ? (i ? -6.3 : -5.7) : -6.3;
        T.push(...tris(leg, legXf(h, reach, drop, W.legScale)));
    });
}
else if (kind === "siege") {
    T = tris(M.buildKind("siege", lo));
    const leg = M.buildKind("sleg", lo), W = WK.WALKER, k = W.legScale ?? 1;
    W.hips.forEach((h, i) => { const f = W.feet[i], dx = f[0] - h[0], dz = f[1] - h[2]; T.push(...tris(leg, legXfY(h, Math.hypot(dx, dz), -h[1], k, Math.atan2(dz, dx)))); });
}
else T = tris(M.buildKind(kind, lo));
console.log(kind, "triangles", T.length);
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (const t of T) for (const p of t.P) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
console.log("bounds", mn.map((v) => v.toFixed(2)), mx.map((v) => v.toFixed(2)));
const ctr = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], R = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2;
const views = (process.argv[5] ? JSON.parse(process.argv[5]) : [[35, 18], [-40, 15], [90, 5], [0, 5], [145, 22], [-150, 20], [60, 55], [30, -25]]);
const CW = 1400, CH = 1000, SS = 2, cols = 1, rows = Math.ceil(views.length / cols);
const W = CW * cols, H = CH * rows, img = Buffer.alloc(W * H * 3);
const sun = (() => { const v = [0.45, 0.8, 0.35], l = Math.hypot(...v); return v.map((x) => x / l); })();
views.forEach(([yawD, pitD], vi) => {
    const w = CW * SS, h = CH * SS, col = new Float32Array(w * h * 3), zb = new Float32Array(w * h).fill(-1e9);
    for (let i = 0; i < w * h; i++) { col[i * 3] = 0.55; col[i * 3 + 1] = 0.62; col[i * 3 + 2] = 0.68; }
    const ya = yawD * Math.PI / 180, pa = pitD * Math.PI / 180;
    // camera looks from direction (cos ya cos pa, sin pa, sin ya cos pa)
    const f = [Math.cos(ya) * Math.cos(pa), Math.sin(pa), Math.sin(ya) * Math.cos(pa)];
    const r = [Math.sin(ya), 0, -Math.cos(ya)], g = [-f[0], -f[1], -f[2]], u = [r[1] * g[2] - r[2] * g[1], r[2] * g[0] - r[0] * g[2], r[0] * g[1] - r[1] * g[0]];
    const sc = Math.min(w, h) / (2 * R * 0.62);
    const pr = (p) => { const d = [p[0] - ctr[0], p[1] - ctr[1], p[2] - ctr[2]]; return [w / 2 + (d[0] * r[0] + d[2] * r[2]) * sc, h / 2 + (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) * sc, d[0] * f[0] + d[1] * f[1] + d[2] * f[2]]; };
    for (const t of T) {
        const [a, b, c] = t.P.map(pr);
        const e1 = [t.P[1][0] - t.P[0][0], t.P[1][1] - t.P[0][1], t.P[1][2] - t.P[0][2]], e2 = [t.P[2][0] - t.P[0][0], t.P[2][1] - t.P[0][1], t.P[2][2] - t.P[0][2]];
        let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const nl = Math.hypot(...n) || 1; n = n.map((x) => x / nl);
        if (n[0] * f[0] + n[1] * f[1] + n[2] * f[2] <= 0) continue; // back-face cull (meshes are one-sided)
        let cc;
        if (t.mat > 4.5) cc = t.col.map((x) => x * 1.2);
        else if (t.mat > 3.5) cc = t.col.map((x) => x * 0.95);
        else if (t.mat > 1.5) cc = GLOW.map((x) => x * (t.mat > 2.5 ? 1.05 : 1.3));
        else { const alb = t.mat > 0.5 ? t.col.map((x, k) => x * HULL[k]) : t.col; const d = Math.max(0, n[0] * sun[0] + n[1] * sun[1] + n[2] * sun[2]); const li = 0.42 + 0.2 * (n[1] * 0.5 + 0.5) + 0.75 * d; cc = alb.map((x) => x * li); }
        const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
        const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
        const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
        if (Math.abs(den) < 1e-9) continue;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const px = x + 0.5, py = y + 0.5;
            const l0 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den, l1 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den, l2 = 1 - l0 - l1;
            if (l0 < 0 || l1 < 0 || l2 < 0) continue;
            const z = l0 * a[2] + l1 * b[2] + l2 * c[2], i = (h - 1 - y) * w + x;
            if (z > zb[i]) { zb[i] = z; col[i * 3] = cc[0]; col[i * 3 + 1] = cc[1]; col[i * 3 + 2] = cc[2]; }
        }
    }
    const ox = (vi % cols) * CW, oy = Math.floor(vi / cols) * CH;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        let s = [0, 0, 0];
        for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) { const i = ((y * SS + dy) * w + x * SS + dx) * 3; s[0] += col[i]; s[1] += col[i + 1]; s[2] += col[i + 2]; }
        const o = ((oy + y) * W + ox + x) * 3;
        for (let k = 0; k < 3; k++) img[o + k] = Math.max(0, Math.min(255, Math.round(Math.pow(Math.min(1, s[k] / (SS * SS)), 1 / 1.6) * 255)));
    }
});
// PNG
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]); };
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; img.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
