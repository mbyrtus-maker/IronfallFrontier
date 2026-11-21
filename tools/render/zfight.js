// Finds z-fighting in a mesh kind: pairs of triangles lying in the same plane (same facing, within EPS) whose areas
// overlap, drawn in different colours/materials. Usage: node tools/zfight.js <kind> [kind...]
const M = require(require("path").join(__dirname, "../..", "frontline/src/packages/client/src/meshes.js"));
const VF = M.VERTEX_FLOATS, EPS = +(process.env.EPS || 0.006);
function tris(mesh) {
    const d = mesh.data ?? mesh.d ?? mesh.verts ?? mesh, out = [];
    for (let i = 0; i + 3 * VF <= d.length; i += 3 * VF) {
        const P = [0, 1, 2].map((k) => [d[i + k * VF], d[i + k * VF + 1], d[i + k * VF + 2]]);
        const col = [d[i + 6], d[i + 7], d[i + 8], d[i + 10], d[i + 9]].map((v) => Math.round(v * 100) / 100).join(",");
        const u = P[1].map((v, j) => v - P[0][j]), w = P[2].map((v, j) => v - P[0][j]);
        const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        const l = Math.hypot(...n); if (l < 1e-9) continue;
        const N = n.map((v) => v / l); out.push({ P, N, dist: N[0] * P[0][0] + N[1] * P[0][1] + N[2] * P[0][2], col, area: l / 2 });
    }
    return out;
}
function proj(t, ax) { return t.P.map((p) => [p[ax[0]], p[ax[1]]]); }
function triOverlap(a, b) { // separating axis test on 2D triangles (strict interior overlap)
    for (const T of [a, b]) for (let i = 0; i < 3; i++) {
        const p = T[i], q = T[(i + 1) % 3], nx = q[1] - p[1], ny = p[0] - q[0];
        const pa = a.map((v) => v[0] * nx + v[1] * ny), pb = b.map((v) => v[0] * nx + v[1] * ny);
        const l = Math.hypot(nx, ny) * 0.004;
        if (Math.max(...pa) <= Math.min(...pb) + l || Math.max(...pb) <= Math.min(...pa) + l) return false;
    }
    return true;
}
const findings = {};
for (const kind of process.argv.slice(2)) {
    let mesh; try { mesh = M.buildKind(kind, false); } catch (e) { console.log(kind, "ERR", e.message); continue; }
    const T = tris(mesh), buckets = new Map();
    for (const t of T) {
        const key = t.N.map((v) => Math.round(v * 50)).join(",") ;
        if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(t);
    }
    const hits = [];
    for (const list of buckets.values()) {
        list.sort((a, b) => a.dist - b.dist);
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && list[j].dist - list[i].dist < EPS; j++) {
            const a = list[i], b = list[j]; if (a.col === b.col) continue;
            const ab = a.N.map(Math.abs), ax = ab[0] > ab[1] && ab[0] > ab[2] ? [1, 2] : ab[1] > ab[2] ? [0, 2] : [0, 1];
            if (triOverlap(proj(a, ax), proj(b, ax))) hits.push([a, b]);
        }
    }
    const spots = new Map();
    for (const [a, b] of hits) { const c = a.P[0].map((v) => Math.round(v * 2) / 2).join(","), k = `${c} n=${a.N.map((v) => v.toFixed(1))} ${a.col} | ${b.col}`; spots.set(k, (spots.get(k) ?? 0) + 1); }
    findings[kind] = hits.length;
    console.log(`${kind}: ${T.length} tris, ${hits.length} z-fighting pairs`);
    [...spots.entries()].slice(0, 25).forEach(([k, n]) => console.log("   ", n, k));
}
