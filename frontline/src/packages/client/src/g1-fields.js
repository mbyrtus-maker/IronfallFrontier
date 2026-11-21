"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIELD_TEAM = void 0;
exports.outcrops = outcrops;
exports.fieldInstances = fieldInstances;
exports.fieldTint = fieldTint;
exports.fieldGlyph = fieldGlyph;
// G1 (designer playtest note: "ore fields should have a graphic as should gas fields"): the in-world graphics of the
// map's ore deposits and gas geysers, from the deposit models the client already keeps (snapshot mining block against
// the map's initial ore) and the map's geysers. Ore: purple crystal outcrops spread over the deposit's radius, fewer
// and smaller as its ore runs down, grey stumps when spent. Gas: a vent mound with a glowing throat (meshes.ts), a
// plume (fx-effects.ts geyser-plume) and, in the command view, amber / green outlines and a glyph over each field.
const render_ts_1 = require("./render.js");
/** Team slots for the outlines (render.ts WIRE_TEAM): 3 amber (ore), 2 grey (spent ore), 4 green (gas). */
exports.FIELD_TEAM = { ore: 3, spent: 2, gas: 4 };
const put = (a, o, x, y, z, yaw, team, phase, scale) => {
    a[o] = x;
    a[o + 1] = y;
    a[o + 2] = z;
    a[o + 3] = yaw;
    a[o + 4] = yaw;
    a[o + 5] = team;
    a[o + 6] = phase;
    a[o + 7] = scale;
    a[o + 8] = 0;
    a[o + 9] = 0;
    a[o + 10] = 0;
    a[o + 11] = 0;
};
/** Outcrop spots of a deposit: the centre last (it goes last), then a ring at 0.62 of the radius (fixed per index). */
function outcrops(d, i) {
    const n = 1 + Math.round(d.radius / 2), out = [];
    for (let k = 1; k < n; k++) {
        const a = (k / (n - 1)) * Math.PI * 2 + i * 1.7 + Math.sin(k * 3.1 + i) * 0.35, r = d.radius * (0.55 + 0.18 * Math.sin(k * 5.3 + i * 2));
        out.push([d.x + Math.cos(a) * r, d.z + Math.sin(a) * r, a * 2.3]);
    }
    out.push([d.x, d.z, i * 0.9]);
    return out;
}
const bufs = { ore: new Float32Array(64 * render_ts_1.INST_FLOATS), oreN: 0, spent: new Float32Array(64 * render_ts_1.INST_FLOATS), spentN: 0, geyser: new Float32Array(16 * render_ts_1.INST_FLOATS), geyserN: 0 };
const grow = (a, n) => { if (a.length >= n)
    return a; const b = new Float32Array(Math.max(n, a.length * 2)); b.set(a); return b; };
/** This frame's instances: ore outcrops (the first ceil(n x fraction), shrinking to 55 %), spent stumps, geyser vents. */
function fieldInstances(deps, geysers, height) {
    bufs.oreN = 0;
    bufs.spentN = 0;
    bufs.geyserN = 0;
    deps.forEach((d, i) => {
        const spots = outcrops(d, i), base = 1.0 + d.radius / 24;
        if (d.exhausted) {
            for (const [x, z, yaw] of spots) {
                bufs.spent = grow(bufs.spent, (bufs.spentN + 1) * render_ts_1.INST_FLOATS);
                put(bufs.spent, bufs.spentN++ * render_ts_1.INST_FLOATS, x, height(x, z), z, yaw, exports.FIELD_TEAM.spent, i, base * 0.9);
            }
            return;
        }
        const f = Math.max(0, Math.min(1, d.fraction)), keep = Math.max(1, Math.ceil(spots.length * f)), sc = base * (0.55 + 0.45 * f);
        spots.forEach(([x, z, yaw], k) => {
            if (k < spots.length - keep) {
                bufs.spent = grow(bufs.spent, (bufs.spentN + 1) * render_ts_1.INST_FLOATS);
                put(bufs.spent, bufs.spentN++ * render_ts_1.INST_FLOATS, x, height(x, z), z, yaw, exports.FIELD_TEAM.spent, i, base * 0.8);
                return;
            }
            bufs.ore = grow(bufs.ore, (bufs.oreN + 1) * render_ts_1.INST_FLOATS);
            put(bufs.ore, bufs.oreN++ * render_ts_1.INST_FLOATS, x, height(x, z), z, yaw, exports.FIELD_TEAM.ore, i + k * 0.37, sc * (k === spots.length - 1 ? 1.15 : 1));
        });
    });
    geysers.forEach((g, i) => { bufs.geyser = grow(bufs.geyser, (bufs.geyserN + 1) * render_ts_1.INST_FLOATS); put(bufs.geyser, bufs.geyserN++ * render_ts_1.INST_FLOATS, g.x, height(g.x, g.z), g.z, i * 1.3, exports.FIELD_TEAM.gas, i, Math.max(0.8, g.radius / 6)); });
    return bufs;
}
/** Ground tint under the fields (terrain vertex colours, once): crushed violet-grey gravel on ore, pale sinter on gas. */
function fieldTint(x, z, deps, geysers, c) {
    const mix = (b, t) => { for (let i = 0; i < 3; i++)
        c[i] += (b[i] - c[i]) * Math.max(0, Math.min(1, t)); };
    for (const d of deps) {
        const r = Math.hypot(x - d.x, z - d.z) / (d.radius * 1.6);
        if (r < 1)
            mix([0.34, 0.3, 0.34], (1 - r * r) * 0.65);
    }
    for (const g of geysers) {
        const r = Math.hypot(x - g.x, z - g.z) / (g.radius * 2.2);
        if (r < 1)
            mix([0.6, 0.6, 0.5], (1 - r * r) * 0.6);
    }
}
/** Command-view glyphs drawn over a field's ring (2D overlay, CSS px): ore a cluster of three diamonds, gas a vent with rising wavy lines. */
function fieldGlyph(g, kind, x, y, s = 9) {
    g.save();
    g.globalAlpha = kind === "spent" ? 0.45 : 0.95;
    g.lineWidth = 1.6;
    g.lineJoin = "round";
    g.strokeStyle = kind === "gas" ? "#7dffa0" : kind === "ore" ? "#ffdb8c" : "#8a8a8a";
    g.fillStyle = kind === "gas" ? "rgba(125,255,160,0.18)" : kind === "ore" ? "rgba(200,120,255,0.35)" : "rgba(120,120,120,0.2)";
    if (kind !== "gas") {
        for (const [dx, dy, k] of [[0, -0.15, 1], [-0.75, 0.35, 0.7], [0.75, 0.4, 0.6]]) {
            const cx = x + dx * s, cy = y + dy * s, w = 0.42 * s * k, h = 1.0 * s * k;
            g.beginPath();
            g.moveTo(cx, cy - h);
            g.lineTo(cx + w, cy - h * 0.2);
            g.lineTo(cx, cy + h * 0.55);
            g.lineTo(cx - w, cy - h * 0.2);
            g.closePath();
            g.fill();
            g.stroke();
        }
    }
    else {
        g.beginPath();
        g.moveTo(x - s, y + s * 0.7);
        g.lineTo(x - s * 0.45, y + s * 0.15);
        g.lineTo(x + s * 0.45, y + s * 0.15);
        g.lineTo(x + s, y + s * 0.7);
        g.closePath();
        g.fill();
        g.stroke();
        for (const dx of [-0.4, 0, 0.4]) {
            g.beginPath();
            const bx = x + dx * s;
            g.moveTo(bx, y);
            g.bezierCurveTo(bx + 0.35 * s, y - 0.4 * s, bx - 0.35 * s, y - 0.75 * s, bx, y - 1.15 * s);
            g.stroke();
        }
    }
    g.restore();
}
