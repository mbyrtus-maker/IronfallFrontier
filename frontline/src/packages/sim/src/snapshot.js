"use strict";
// Byte-level helpers shared by the snapshot protocol (netsnap.ts) and the
// state export (state.ts). Little endian throughout, on any host: typed-array
// blocks are copied raw on little-endian hosts (fast path) and element by
// element through a DataView on big-endian hosts (byteOrder.portable).
Object.defineProperty(exports, "__esModule", { value: true });
exports.ByteReader = exports.ByteWriter = exports.byteOrder = void 0;
exports.posQuantum = posQuantum;
exports.quantPos = quantPos;
exports.quantY = quantY;
exports.quantVel = quantVel;
const HOST_LE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
/** portable: write / read typed blocks element by element (forced on big-endian hosts; tests may set it). */
exports.byteOrder = { hostLittleEndian: HOST_LE, portable: !HOST_LE };
class ByteWriter {
    buf;
    view;
    pos = 0;
    constructor(initial = 4096) {
        this.buf = new Uint8Array(initial);
        this.view = new DataView(this.buf.buffer);
    }
    reset() { this.pos = 0; }
    ensure(n) {
        if (this.pos + n <= this.buf.length)
            return;
        let size = this.buf.length * 2;
        while (size < this.pos + n)
            size *= 2;
        const nb = new Uint8Array(size);
        nb.set(this.buf.subarray(0, this.pos));
        this.buf = nb;
        this.view = new DataView(nb.buffer);
    }
    u8(v) { this.ensure(1); this.buf[this.pos++] = v; }
    u16(v) { this.ensure(2); this.view.setUint16(this.pos, v, true); this.pos += 2; }
    i16(v) { this.ensure(2); this.view.setInt16(this.pos, v, true); this.pos += 2; }
    u32(v) { this.ensure(4); this.view.setUint32(this.pos, v >>> 0, true); this.pos += 4; }
    i32(v) { this.ensure(4); this.view.setInt32(this.pos, v | 0, true); this.pos += 4; }
    f64(v) { this.ensure(8); this.view.setFloat64(this.pos, v, true); this.pos += 8; }
    varint(v) {
        this.ensure(5);
        v >>>= 0;
        while (v >= 0x80) {
            this.buf[this.pos++] = (v & 0x7f) | 0x80;
            v >>>= 7;
        }
        this.buf[this.pos++] = v;
    }
    /** Signed varint (zigzag). |v| < 2^30. */
    svarint(v) { this.varint(v >= 0 ? v * 2 : -v * 2 - 1); }
    /** String as UTF-16 code units (varint each); lossless, no TextEncoder needed. */
    str(s) { this.varint(s.length); for (let i = 0; i < s.length; i++)
        this.varint(s.charCodeAt(i)); }
    raw(b) { this.ensure(b.length); this.buf.set(b, this.pos); this.pos += b.length; }
    /** First n elements of a typed array, little endian. */
    typed(a, n) {
        if (!exports.byteOrder.portable || a.BYTES_PER_ELEMENT === 1) {
            this.raw(new Uint8Array(a.buffer, a.byteOffset, n * a.BYTES_PER_ELEMENT));
            return;
        }
        this.ensure(n * a.BYTES_PER_ELEMENT);
        const v = this.view;
        let p = this.pos;
        if (a instanceof Float64Array)
            for (let i = 0; i < n; i++, p += 8)
                v.setFloat64(p, a[i], true);
        else if (a instanceof Int32Array)
            for (let i = 0; i < n; i++, p += 4)
                v.setInt32(p, a[i], true);
        else if (a instanceof Uint32Array)
            for (let i = 0; i < n; i++, p += 4)
                v.setUint32(p, a[i], true);
        else if (a instanceof Int16Array)
            for (let i = 0; i < n; i++, p += 2)
                v.setInt16(p, a[i], true);
        else
            for (let i = 0; i < n; i++, p += 2)
                v.setUint16(p, a[i], true);
        this.pos = p;
    }
    /** View of the written bytes (valid until the next write or reset). */
    view_() { return this.buf.subarray(0, this.pos); }
    bytes() { return this.buf.slice(0, this.pos); }
}
exports.ByteWriter = ByteWriter;
class ByteReader {
    bytes;
    view;
    pos = 0;
    constructor(bytes) {
        this.bytes = bytes;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    need(n) { if (this.pos + n > this.bytes.length)
        throw new Error(`truncated data at byte ${this.pos}`); }
    u8() { this.need(1); return this.bytes[this.pos++]; }
    u16() { this.need(2); const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
    i16() { this.need(2); const v = this.view.getInt16(this.pos, true); this.pos += 2; return v; }
    u32() { this.need(4); const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
    i32() { this.need(4); const v = this.view.getInt32(this.pos, true); this.pos += 4; return v; }
    f64() { this.need(8); const v = this.view.getFloat64(this.pos, true); this.pos += 8; return v; }
    varint() {
        let v = 0, s = 0, b;
        do {
            b = this.u8();
            v += (b & 0x7f) * 2 ** s;
            s += 7;
        } while (b & 0x80);
        return v;
    }
    svarint() { const z = this.varint(); return z % 2 === 0 ? z / 2 : -(z + 1) / 2; }
    str() { const n = this.varint(); let s = ""; for (let i = 0; i < n; i++)
        s += String.fromCharCode(this.varint()); return s; }
    /** Copies n little-endian elements out of the stream (aligned copy). */
    f64s(n) {
        if (!exports.byteOrder.portable)
            return new Float64Array(this.take(n * 8).buffer);
        const a = new Float64Array(n);
        for (let i = 0; i < n; i++)
            a[i] = this.f64();
        return a;
    }
    i32s(n) {
        if (!exports.byteOrder.portable)
            return new Int32Array(this.take(n * 4).buffer);
        const a = new Int32Array(n);
        for (let i = 0; i < n; i++)
            a[i] = this.i32();
        return a;
    }
    u16s(n) {
        if (!exports.byteOrder.portable)
            return new Uint16Array(this.take(n * 2).buffer);
        const a = new Uint16Array(n);
        for (let i = 0; i < n; i++)
            a[i] = this.u16();
        return a;
    }
    i16s(n) {
        if (!exports.byteOrder.portable)
            return new Int16Array(this.take(n * 2).buffer);
        const a = new Int16Array(n);
        for (let i = 0; i < n; i++)
            a[i] = this.i16();
        return a;
    }
    u8s(n) { return this.take(n); }
    take(n) { this.need(n); const b = this.bytes.slice(this.pos, this.pos + n); this.pos += n; return b; }
    done() { return this.pos === this.bytes.length; }
}
exports.ByteReader = ByteReader;
/**
 * Position quantum of the snapshot protocol (v4): 0.1 m, or mapSize / 65535 on maps over 6.5 km (u16 range).
 * (v3 used mapSize / 65535 on every map: 3 cm steps on a 2 km map made position deltas twice as large on the wire.)
 */
function posQuantum(mapSize) { return Math.max(0.1, mapSize / 65535); }
function quantPos(v, mapSize) {
    let q = Math.round(v / posQuantum(mapSize));
    if (q < 0)
        q = 0;
    else if (q > 65535)
        q = 65535;
    return q;
}
function quantY(y) {
    let q = Math.round(y * 4);
    if (q < -32768)
        q = -32768;
    else if (q > 32767)
        q = 32767;
    return q;
}
function quantVel(v) {
    let q = Math.round(v * 10);
    if (q < -32768)
        q = -32768;
    else if (q > 32767)
        q = 32767;
    return q;
}
