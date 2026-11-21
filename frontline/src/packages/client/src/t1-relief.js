"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMD_CLEARANCE = exports.RELIEF_FOG_MUL = void 0;
exports.reliefTint = reliefTint;
exports.cmdEyeY = cmdEyeY;
/** Fog density factor on a relief planet (both views): the haze thins so far ranges stay readable. */
exports.RELIEF_FOG_MUL = 0.62;
/** Command camera: the eye keeps at least this far above the ground under it (m). */
exports.CMD_CLEARANCE = 30;
const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const mixc = (c, b, t) => { const k = t < 0 ? 0 : t > 1 ? 1 : t; for (let i = 0; i < 3; i++)
    c[i] += (b[i] - c[i]) * k; };
/** Rock colours per planet: [base, band] (Rust's strata alternate the two by height). */
const ROCK = {
    rust: [[0.55, 0.3, 0.2], [0.7, 0.45, 0.3]],
    pale: [[0.42, 0.44, 0.48], [0.52, 0.54, 0.58]],
    brume: [[0.2, 0.27, 0.25], [0.27, 0.33, 0.3]],
    cinder: [[0.11, 0.1, 0.1], [0.2, 0.15, 0.13]],
};
const SNOW = [0.9, 0.92, 0.96];
/**
 * Relief colouring of a terrain vertex (after the planet's ground colours): c is changed in place. h: height (m), ny:
 * the normal's up component (1 flat, 0 vertical), n: a value-noise sample in [0, 1) for edge breakup.
 * Returns the rock weight (0 open ground .. 1 cliff), for tests.
 */
function reliefTint(planet, def, h, ny, n, c) {
    const R = ROCK[planet];
    if (!R)
        return 0;
    // rock from about 20 degrees (ny 0.94) to full at 35 degrees (ny 0.82), and on all high ground a little
    const above = h - def.floorMetres - (def.levels["relay-ridge"] ?? 80);
    const rock = Math.max(sm((0.95 - ny) / 0.13 + (n - 0.5) * 0.4), sm(above / 120) * 0.55);
    if (rock > 0) {
        const strata = planet === "rust" ? 0.5 + 0.5 * Math.sin(h * 0.21 + n * 1.5) : n;
        const col = [R[0][0], R[0][1], R[0][2]];
        mixc(col, R[1], strata);
        mixc(c, col, rock);
    }
    if (planet === "pale" && def.snowAboveMetres !== undefined) {
        // snow: above the snow line on gentle and moderate slopes, wind-scoured off the steepest faces
        const s = sm((h - def.snowAboveMetres) / 50 + (n - 0.5) * 0.8) * sm((ny - 0.62) / 0.2);
        mixc(c, SNOW, s);
    }
    if (planet === "cinder")
        mixc(c, [0.32, 0.3, 0.29], sm(above / 160) * 0.6 * (1 - rock)); // ash on the high ridges
    if (planet === "brume")
        mixc(c, [0.3, 0.4, 0.36], sm((h - def.floorMetres - 60) / 80) * 0.35 * (1 - rock)); // moorland
    return rock;
}
/** Command camera eye height kept CMD_CLEARANCE above the ground under the eye (mountains between the eye and the focus). */
function cmdEyeY(eyeY, groundUnderEye) {
    return Math.max(eyeY, groundUnderEye + exports.CMD_CLEARANCE);
}
