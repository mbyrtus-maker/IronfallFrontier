"use strict";
// Deterministic math helpers. ECMAScript does not specify the precision of
// Math.sin/cos/atan2/pow/exp/hypot, so different engines (V8, SpiderMonkey,
// JavaScriptCore) may return different last bits. The sim uses only + - * /,
// Math.sqrt (correctly rounded per IEEE-754), floor/round/abs/min/max and the
// polynomial sin/cos below, which are built from those operations only.
Object.defineProperty(exports, "__esModule", { value: true });
exports.dsin = dsin;
exports.dcos = dcos;
exports.sinCosTo = sinCosTo;
const TWO_PI = 6.283185307179586;
const HALF_PI = 1.5707963267948966;
function sinPoly(x) {
    // Taylor series to x^15 on [-pi/4, pi/4]; error < 1e-15.
    const x2 = x * x;
    return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 +
        x2 * (-1 / 39916800 + x2 * (1 / 6227020800 + x2 * (-1 / 1307674368000))))))));
}
function cosPoly(x) {
    const x2 = x * x;
    return 1 + x2 * (-1 / 2 + x2 * (1 / 24 + x2 * (-1 / 720 + x2 * (1 / 40320 +
        x2 * (-1 / 3628800 + x2 * (1 / 479001600 + x2 * (-1 / 87178291200)))))));
}
function dsin(x) {
    x = x - Math.round(x / TWO_PI) * TWO_PI; // [-pi, pi]
    const q = Math.round(x / HALF_PI); // -2..2
    const r = x - q * HALF_PI; // [-pi/4, pi/4]
    switch (((q % 4) + 4) % 4) {
        case 0: return sinPoly(r);
        case 1: return cosPoly(r);
        case 2: return -sinPoly(r);
        default: return -cosPoly(r);
    }
}
function dcos(x) {
    return dsin(x + HALF_PI);
}
/**
 * b[i + 1] = dsin(b[i]), b[i + 2] = dcos(b[i]): the same arithmetic as dsin / dcos (bit-identical results), reading and
 * writing a Float64Array so that hot callers pass and receive no boxed doubles.
 */
function sinCosTo(b, i) {
    const x0 = b[i];
    for (let k = 0; k < 2; k++) {
        let x = k === 0 ? x0 : x0 + HALF_PI;
        x = x - Math.round(x / TWO_PI) * TWO_PI;
        const q = Math.round(x / HALF_PI);
        const r = x - q * HALF_PI, r2 = r * r;
        const sp = r * (1 + r2 * (-1 / 6 + r2 * (1 / 120 + r2 * (-1 / 5040 + r2 * (1 / 362880 + r2 * (-1 / 39916800 + r2 * (1 / 6227020800 + r2 * (-1 / 1307674368000))))))));
        const cp = 1 + r2 * (-1 / 2 + r2 * (1 / 24 + r2 * (-1 / 720 + r2 * (1 / 40320 + r2 * (-1 / 3628800 + r2 * (1 / 479001600 + r2 * (-1 / 87178291200)))))));
        const m = ((q % 4) + 4) % 4;
        b[i + 1 + k] = m === 0 ? sp : m === 1 ? cp : m === 2 ? -sp : -cp;
    }
}
