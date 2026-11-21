"use strict";
// Seeded PRNG: sfc32 (Small Fast Counting, 128-bit state). Integer-only ops, so
// output is bit-identical on every conforming JS engine.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prng = void 0;
class Prng {
    s;
    constructor(seed, stream = 0) {
        this.s = new Uint32Array(4);
        this.s[0] = 0x9e3779b9 ^ stream;
        this.s[1] = seed >>> 0;
        this.s[2] = Math.floor(seed / 4294967296) >>> 0;
        this.s[3] = 1;
        for (let i = 0; i < 16; i++)
            this.nextU32();
    }
    nextU32() {
        const s = this.s;
        let a = s[0], b = s[1], c = s[2], d = s[3];
        const t = (((a + b) >>> 0) + d) >>> 0;
        d = (d + 1) >>> 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) >>> 0;
        c = ((c << 21) | (c >>> 11)) >>> 0;
        c = (c + t) >>> 0;
        s[0] = a;
        s[1] = b;
        s[2] = c;
        s[3] = d;
        return t;
    }
    /** Uniform in [0, 1). Exact: integer / 2^32. */
    next() {
        return this.nextU32() / 4294967296;
    }
    /** Uniform in [-1, 1). */
    signed() {
        return this.next() * 2 - 1;
    }
    /** out[i] = signed(); same stream as signed(), but no boxed double return (hot paths). */
    signedTo(out, i) {
        const s = this.s;
        const a = s[0], b = s[1], c = s[2], d = s[3];
        const t = (((a + b) >>> 0) + d) >>> 0;
        s[0] = b ^ (b >>> 9);
        s[1] = (c + (c << 3)) >>> 0;
        s[2] = ((((c << 21) | (c >>> 11)) >>> 0) + t) >>> 0;
        s[3] = (d + 1) >>> 0;
        out[i] = (t / 4294967296) * 2 - 1;
    }
}
exports.Prng = Prng;
