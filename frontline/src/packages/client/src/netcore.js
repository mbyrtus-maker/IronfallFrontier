"use strict";
// N1: the pure part of the network layer (no DOM, no WebRTC): room ids, message framing, chunking of large
// reliable messages, the binary snapshot frame, validation of what a guest sends, player slots and the host
// election. net.ts (connections) and mp.ts (game glue) build on it; test/logic/n1-net.test.mjs tests it in Node.
// The connection design is Driftgate Beyond's (15_multiplayer_dev.js, the designer's code), with Ironfall's own
// room prefix: friends type the same room code, whoever opens it first claims `ironfall1-<slug>-host`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HANDOVER_STEP_MS = exports.OWN_PILOT_ORDERS = exports.U_PONG = exports.U_PING = exports.U_JSON = exports.U_SNAP = exports.Reassembler = exports.cleanName = exports.peerIdFor = exports.hostIdFor = exports.slug = exports.LINK_TIMEOUT_MS = exports.HEARTBEAT_MS = exports.CONTROL_HZ = exports.CHECKPOINT_SECONDS = exports.CHUNK = exports.MAX_PLAYERS = exports.MPV = exports.ROOM_PREFIX = void 0;
exports.rid = rid;
exports.packR = packR;
exports.unpackR = unpackR;
exports.chunk = chunk;
exports.encodeSnapFrame = encodeSnapFrame;
exports.decodeSnapFrame = decodeSnapFrame;
exports.encodeU = encodeU;
exports.decodeU = decodeU;
exports.encodePing = encodePing;
exports.decodePing = decodePing;
exports.validateGuestMsg = validateGuestMsg;
exports.assignSlot = assignSlot;
exports.electionOrder = electionOrder;
exports.electionRank = electionRank;
exports.netConfig = netConfig;
exports.ROOM_PREFIX = "ironfall1-";
/** Network protocol version (a guest of another version is refused with a message). */
exports.MPV = 6; // 6: ruling 129 fireCall action (beacon fired from a vehicle), snapshot v35; 5: 5: ruling 128 throwCall action (thrown call beacon), snapshot v34; 4: C1 manGun (ruling 125 sentry gun seat) and dispatch (ruling 124 crew dispatch) actions, snapshot v33; 3: ruling 121 shelter action (go inside an own Citadel / Command Core), snapshot v32; 2: B2 build placement (build action at / yaw; snapshot v28 site yaw)
/** Players on the player team (host included). */
exports.MAX_PLAYERS = 4;
/** Reliable messages above this are cut into chunks (data-channel messages stay under 16 kB). */
exports.CHUNK = 15000;
/** Seconds between checkpoints (exportState) the host sends every guest on 'r'. */
exports.CHECKPOINT_SECONDS = 30;
/** Guest pilot control rate (Hz) on 'u'. */
exports.CONTROL_HZ = 20;
/** Heartbeat period and the silence after which a link counts as down (ms). */
exports.HEARTBEAT_MS = 1000;
exports.LINK_TIMEOUT_MS = 6000;
const slug = (c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
exports.slug = slug;
const hostIdFor = (code) => `${exports.ROOM_PREFIX}${(0, exports.slug)(code)}-host`;
exports.hostIdFor = hostIdFor;
const peerIdFor = (code, pid, nonce) => `${exports.ROOM_PREFIX}${(0, exports.slug)(code)}-${pid.slice(0, 8)}-${nonce}`;
exports.peerIdFor = peerIdFor;
const cleanName = (n) => String(n || "").replace(/[^A-Za-z0-9 _.\-']/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
exports.cleanName = cleanName;
function rid(n) { let s = ""; const a = "abcdefghijkmnpqrstuvwxyz23456789"; for (let i = 0; i < n; i++)
    s += a[Math.floor(Math.random() * a.length)]; return s; }
// ------------------------------------------------------------------ reliable messages: JSON header + optional bytes
const te = new TextEncoder(), td = new TextDecoder();
/** A reliable message: [u32 json length][json utf-8][binary payload]. */
function packR(msg, bin) {
    const j = te.encode(JSON.stringify(msg));
    const out = new Uint8Array(4 + j.length + (bin ? bin.length : 0));
    new DataView(out.buffer).setUint32(0, j.length);
    out.set(j, 4);
    if (bin)
        out.set(bin, 4 + j.length);
    return out;
}
function unpackR(b) {
    if (b.length < 4)
        return null;
    const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0);
    if (4 + n > b.length)
        return null;
    let msg;
    try {
        msg = JSON.parse(td.decode(b.subarray(4, 4 + n)));
    }
    catch {
        return null;
    }
    if (!msg || typeof msg !== "object")
        return null;
    return { msg: msg, bin: b.length > 4 + n ? b.slice(4 + n) : null };
}
// ------------------------------------------------------------------ chunking ('r' only: ordered and reliable)
const F_WHOLE = 0xfd, F_PART = 0xfe;
/** Frames for one reliable message: one whole frame, or parts [0xFE][u32 id][u16 i][u16 n][data]. */
function chunk(b, id, size = exports.CHUNK) {
    if (b.length + 1 <= size) {
        const f = new Uint8Array(b.length + 1);
        f[0] = F_WHOLE;
        f.set(b, 1);
        return [f];
    }
    const n = Math.ceil(b.length / size);
    if (n > 0xffff)
        throw new Error("chunk: message too large");
    const out = [];
    for (let i = 0; i < n; i++) {
        const part = b.subarray(i * size, Math.min(b.length, (i + 1) * size));
        const f = new Uint8Array(9 + part.length), v = new DataView(f.buffer);
        f[0] = F_PART;
        v.setUint32(1, id >>> 0);
        v.setUint16(5, i);
        v.setUint16(7, n);
        f.set(part, 9);
        out.push(f);
    }
    return out;
}
/** Puts chunked messages back together (any order; several messages interleaved). Bounded: at most 8 open messages. */
class Reassembler {
    open = new Map();
    dropped = 0;
    push(f) {
        if (f.length < 1)
            return null;
        if (f[0] === F_WHOLE)
            return f.slice(1);
        if (f[0] !== F_PART || f.length < 9) {
            this.dropped++;
            return null;
        }
        const v = new DataView(f.buffer, f.byteOffset, f.byteLength);
        const id = v.getUint32(1), i = v.getUint16(5), n = v.getUint16(7);
        if (n === 0 || i >= n) {
            this.dropped++;
            return null;
        }
        let m = this.open.get(id);
        if (!m) {
            if (this.open.size >= 8) {
                const k = this.open.keys().next().value;
                this.open.delete(k);
                this.dropped++;
            }
            m = { parts: new Array(n), got: 0, bytes: 0 };
            this.open.set(id, m);
        }
        if (m.parts.length !== n) {
            this.dropped++;
            return null;
        }
        if (!m.parts[i]) {
            m.parts[i] = f.slice(9);
            m.got++;
            m.bytes += f.length - 9;
        }
        if (m.got < n)
            return null;
        this.open.delete(id);
        const out = new Uint8Array(m.bytes);
        let o = 0;
        for (const p of m.parts) {
            out.set(p, o);
            o += p.length;
        }
        return out;
    }
}
exports.Reassembler = Reassembler;
// ------------------------------------------------------------------ unreliable frames ('u')
exports.U_SNAP = 1, exports.U_JSON = 2, exports.U_PING = 3, exports.U_PONG = 4;
function encodeSnapFrame(f) {
    let n = 1 + 4 + 4 + 4 + 1 + 1;
    for (const s of f.snaps)
        n += 2 + s.length;
    n += 2 + f.aimIds.length * 6 + 2 + f.deaths.length * 4;
    const out = new Uint8Array(n), v = new DataView(out.buffer);
    let o = 0;
    out[o++] = exports.U_SNAP;
    v.setUint32(o, f.tick >>> 0);
    o += 4;
    v.setUint32(o, f.epoch >>> 0);
    o += 4;
    v.setUint32(o, f.pilotId >>> 0);
    o += 4;
    out[o++] = f.controlled ? 1 : 0;
    out[o++] = f.snaps.length;
    for (const s of f.snaps) {
        v.setUint16(o, s.length);
        o += 2;
        out.set(s, o);
        o += s.length;
    }
    v.setUint16(o, f.aimIds.length);
    o += 2;
    for (let i = 0; i < f.aimIds.length; i++) {
        v.setInt32(o, f.aimIds[i]);
        o += 4;
        // yaw in 1/10000 rad, wrapped to [-pi, pi]
        const a = Math.atan2(Math.sin(f.aimYaw[i]), Math.cos(f.aimYaw[i]));
        v.setInt16(o, Math.round(a * 10000));
        o += 2;
    }
    const nd = f.deaths.length / 5;
    v.setUint16(o, nd);
    o += 2;
    for (let i = 0; i < f.deaths.length; i++) {
        v.setFloat32(o, f.deaths[i]);
        o += 4;
    }
    return out;
}
function decodeSnapFrame(b) {
    try {
        const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
        let o = 0;
        if (b[o++] !== exports.U_SNAP)
            return null;
        const tick = v.getUint32(o);
        o += 4;
        const epoch = v.getUint32(o);
        o += 4;
        const pilotId = v.getUint32(o);
        o += 4;
        const controlled = b[o++] === 1;
        const ns = b[o++], snaps = [];
        for (let i = 0; i < ns; i++) {
            const l = v.getUint16(o);
            o += 2;
            if (o + l > b.length)
                return null;
            snaps.push(b.slice(o, o + l));
            o += l;
        }
        const na = v.getUint16(o);
        o += 2;
        const aimIds = new Int32Array(na), aimYaw = new Float32Array(na);
        for (let i = 0; i < na; i++) {
            aimIds[i] = v.getInt32(o);
            o += 4;
            aimYaw[i] = v.getInt16(o) / 10000;
            o += 2;
        }
        const nd = v.getUint16(o);
        o += 2;
        const deaths = new Float32Array(nd * 5);
        for (let i = 0; i < nd * 5; i++) {
            deaths[i] = v.getFloat32(o);
            o += 4;
        }
        if (o !== b.length)
            return null;
        return { tick, epoch, pilotId, controlled, snaps, aimIds, aimYaw, deaths };
    }
    catch {
        return null;
    }
}
function encodeU(msg) { const j = te.encode(JSON.stringify(msg)); const out = new Uint8Array(j.length + 1); out[0] = exports.U_JSON; out.set(j, 1); return out; }
function decodeU(b) {
    if (b[0] !== exports.U_JSON)
        return null;
    try {
        const m = JSON.parse(td.decode(b.subarray(1)));
        return m && typeof m === "object" ? m : null;
    }
    catch {
        return null;
    }
}
function encodePing(kind, t) { const b = new Uint8Array(9); b[0] = kind; new DataView(b.buffer).setFloat64(1, t); return b; }
function decodePing(b) { return b.length === 9 ? new DataView(b.buffer, b.byteOffset, 9).getFloat64(1) : NaN; }
const fin = (v, lo, hi) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);
const int = (v, lo, hi) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
const str = (v, max) => (typeof v === "string" && v.length > 0 && v.length <= max && /^[A-Za-z0-9_\-]+$/.test(v) ? v : null);
const MAP = 1e5, ID = 0x7fffffff;
const ids = (v, max) => {
    if (!Array.isArray(v) || v.length > max)
        return null;
    const out = [];
    for (const x of v) {
        const i = int(x, 1, ID);
        if (i === null)
            return null;
        out.push(i);
    }
    return out;
};
const ORDER_TYPES = new Set(["move", "attackMove", "attack", "stop", "pickup", "guard", "defend", "attackMyTarget", "follow", "holdFire", "retreat"]);
/** Order types whose pilotId names the ISSUING player: the host puts the guest's own pilot there. */
exports.OWN_PILOT_ORDERS = new Set(["pickup", "attackMyTarget", "follow"]);
/**
 * Checks and normalises one guest message. Anything malformed is refused (null). Numbers are range-checked, ids are
 * positive integers, strings are short identifiers. Who the message acts for is NOT in it: the host uses the guest's
 * own pilot and the player team (a guest can never act for another player or the enemy).
 */
function validateGuestMsg(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const m = raw;
    switch (m.t) {
        case "pctl": {
            if (m.input === null)
                return { t: "pctl", input: null };
            const i = m.input;
            if (!i || typeof i !== "object")
                return null;
            const move = fin(i.move, -1, 1), strafe = fin(i.strafe, -1, 1), aimYaw = fin(i.aimYaw, -1e3, 1e3), aimPitch = i.aimPitch === undefined ? 0 : fin(i.aimPitch, -1.6, 1.6);
            const fire = i.fire === undefined ? 0 : int(i.fire, 0, 255), tool = i.tool === undefined ? 0 : int(i.tool, 0, 255);
            if (move === null || strafe === null || aimYaw === null || aimPitch === null || fire === null || tool === null)
                return null;
            const input = { move, strafe, aimYaw, aimPitch, sprint: !!i.sprint, crouch: !!i.crouch, jump: !!i.jump, jet: !!i.jet, interact: !!i.interact, fire, tool };
            if (i.gunnerWeapon !== undefined)
                input.gunnerWeapon = !!i.gunnerWeapon;
            if (i.cloak !== undefined)
                input.cloak = !!i.cloak;
            if (i.clientSeq !== undefined) {
                const q = int(i.clientSeq, 1, 0x7fffffff);
                if (q === null)
                    return null;
                input.clientSeq = q;
            }
            return { t: "pctl", input };
        }
        case "ack": {
            const seq = int(m.seq, 0, 0xffffffff), epoch = int(m.epoch, 0, 0xffffffff);
            return seq === null || epoch === null ? null : { t: "ack", seq, epoch };
        }
        case "viewer": {
            const x = fin(m.x, -MAP, MAP), z = fin(m.z, -MAP, MAP);
            return x === null || z === null ? null : { t: "viewer", x, z };
        }
        case "ping": {
            const x = fin(m.x, -MAP, MAP), z = fin(m.z, -MAP, MAP), kind = str(m.kind, 16);
            return x === null || z === null || !kind ? null : { t: "ping", x, z, kind };
        }
        // Frontline (21 Nov, Ace of the Airways co-op lessons: "every action a player can take must reach the host"): the
        // kit, the respawn lane, giving up while downed, the laser cell swap, lane requests and the resource priority
        // were page -> worker messages the guest's port dropped, so a guest played the default kit and could not choose
        case "flKit": {
            const k = m.kit;
            if (!k || typeof k !== "object")
                return null;
            const kit = { role: str(k.role, 32), gun: str(k.gun, 32), grenade: str(k.grenade, 32), armour: str(k.armour, 32), laser: !!k.laser };
            if (!kit.role || !kit.gun || !kit.grenade || !kit.armour)
                return null;
            if (k.slot3 !== undefined) {
                const s3 = str(k.slot3, 32);
                if (!s3)
                    return null;
                kit.slot3 = s3;
            }
            if (k.calls !== undefined) {
                if (!Array.isArray(k.calls) || k.calls.length > 8)
                    return null;
                const c = k.calls.map((x) => str(x, 32));
                if (!c.every((x) => !!x))
                    return null;
                kit.calls = c;
            }
            return m.confirm === true ? { t: "flKit", kit, confirm: true } : { t: "flKit", kit }; // confirm: the start card's deploy (21 Nov)
        }
        case "flLane": {
            const lane = int(m.lane, 0, 3);
            return lane === null ? null : { t: "flLane", lane };
        }
        case "flRequest": {
            const lane = int(m.lane, 0, 3);
            return lane === null ? null : { t: "flRequest", lane };
        }
        case "flPriority": {
            const p = str(m.p, 16);
            return p ? { t: "flPriority", p } : null;
        }
        case "flSwap": {
            const mount = m.mount === undefined ? -1 : int(m.mount, -1, 11);
            return mount === null ? null : { t: "flSwap", mount };
        }
        case "flGiveUp":
            return { t: "flGiveUp" };
        case "query": {
            const reqId = int(m.reqId, 0, ID), l = ids(m.ids, 64);
            return reqId === null || !l ? null : { t: "query", reqId, ids: l };
        }
        case "order": {
            const reqId = int(m.reqId, 0, ID), l = ids(m.ids, 200), o = m.order;
            if (reqId === null || !l || !o || typeof o !== "object" || typeof o.type !== "string" || !ORDER_TYPES.has(o.type))
                return null;
            const order = { type: o.type };
            for (const [k, v] of Object.entries(o)) {
                if (k === "type")
                    continue;
                if (k === "target" || k === "pilotId" || k === "targetId") {
                    const i = int(v, 0, ID);
                    if (i === null)
                        return null;
                    order[k] = i;
                }
                else if (k === "x" || k === "z") {
                    const f = fin(v, -MAP, MAP);
                    if (f === null)
                        return null;
                    order[k] = f;
                }
                else if (k === "point" || k === "waypoint") {
                    if (!Array.isArray(v) || v.length !== 2)
                        return null;
                    const a = fin(v[0], -MAP, MAP), b = fin(v[1], -MAP, MAP);
                    if (a === null || b === null)
                        return null;
                    order[k] = [a, b];
                }
                else if (k === "points" || k === "waypoints" || k === "path") {
                    if (!Array.isArray(v) || v.length > 64)
                        return null;
                    const pts = [];
                    for (const p of v) {
                        if (!Array.isArray(p) || p.length !== 2)
                            return null;
                        const a = fin(p[0], -MAP, MAP), b = fin(p[1], -MAP, MAP);
                        if (a === null || b === null)
                            return null;
                        pts.push([a, b]);
                    }
                    order[k] = pts;
                }
                else if (k === "formation" || k === "kind") {
                    const s = str(v, 24);
                    if (!s)
                        return null;
                    order[k] = s;
                }
                else if (k === "on")
                    order[k] = !!v;
                else if (k === "deposit" || k === "facing") {
                    const f = fin(v, -1e6, 1e6);
                    if (f === null)
                        return null;
                    order[k] = f;
                }
                else
                    return null; // an order field the host does not know
            }
            return { t: "order", reqId, ids: l, order };
        }
        case "act": {
            const reqId = int(m.reqId, 0, ID), a = m.action;
            if (reqId === null || !a || typeof a !== "object")
                return null;
            const id = (v) => int(v, 1, ID), small = (v) => int(v, -1, 64);
            let action = null;
            switch (a.kind) {
                case "enter": {
                    const v = id(a.vehicle), s = small(a.seat);
                    if (v !== null && s !== null)
                        action = { kind: "enter", vehicle: v, seat: s };
                    break;
                }
                case "exit":
                    action = { kind: "exit" };
                    break;
                case "eject":
                    action = { kind: "eject" };
                    break;
                case "switch": {
                    const s = small(a.seat);
                    if (s !== null)
                        action = { kind: "switch", seat: s };
                    break;
                }
                case "queue": {
                    const b = id(a.building), u = str(a.unit, 32);
                    if (b !== null && u)
                        action = { kind: "queue", building: b, unit: u };
                    break;
                }
                case "cancel": {
                    const b = id(a.building), i = int(a.index, -1, 64);
                    if (b !== null && i !== null)
                        action = { kind: "cancel", building: b, index: i };
                    break;
                }
                case "rally": {
                    const b = id(a.building);
                    if (b === null)
                        break;
                    if (a.point === null) {
                        action = { kind: "rally", building: b, point: null };
                        break;
                    }
                    if (Array.isArray(a.point) && a.point.length === 2) {
                        const x = fin(a.point[0], -MAP, MAP), z = fin(a.point[1], -MAP, MAP);
                        if (x !== null && z !== null)
                            action = { kind: "rally", building: b, point: [x, z] };
                    }
                    break;
                }
                case "harvest": {
                    const h = id(a.harvester), d = int(a.deposit, -1, 4096);
                    if (h !== null && d !== null)
                        action = { kind: "harvest", harvester: h, deposit: d };
                    break;
                }
                case "build": {
                    const ty = str(a.type, 32), p = int(a.point, 0, 4096), c = int(a.constructor, -1, ID);
                    if (ty && p !== null && c !== null) {
                        action = { kind: "build", type: ty, point: p, constructor: c };
                        // B2: an exact spot (and facing) from the placement ghost; a malformed one drops the whole action
                        if (a.at !== undefined) {
                            const x = Array.isArray(a.at) && a.at.length === 2 ? fin(a.at[0], -MAP, MAP) : null, z = Array.isArray(a.at) && a.at.length === 2 ? fin(a.at[1], -MAP, MAP) : null;
                            const y = a.yaw === undefined ? undefined : fin(a.yaw, -100, 100);
                            action = x !== null && z !== null && y !== null ? { kind: "build", type: ty, point: p, constructor: c, at: [x, z], ...(y !== undefined ? { yaw: y } : {}) } : null;
                        }
                    }
                    break;
                }
                case "cancelBuild": {
                    const s = id(a.site);
                    if (s !== null)
                        action = { kind: "cancelBuild", site: s };
                    break;
                }
                case "call": {
                    const c = str(a.call, 32), x = fin(a.x, -MAP, MAP), z = fin(a.z, -MAP, MAP);
                    if (!c || x === null || z === null)
                        break;
                    const call = { kind: "call", call: c, x, z };
                    if (a.aimYaw !== undefined) {
                        const y = fin(a.aimYaw, -10, 10);
                        if (y === null)
                            break;
                        call.aimYaw = y;
                    }
                    if (a.option !== undefined) {
                        const o = int(a.option, 0, 15);
                        if (o === null)
                            break;
                        call.option = o;
                    }
                    action = call;
                    break;
                }
                case "throwCall": { // ruling 128
                    const c = str(a.call, 32), y = fin(a.yaw, -100, 100), p = fin(a.pitch, -2, 2);
                    if (!c || y === null || p === null)
                        break;
                    const t = { kind: "throwCall", call: c, yaw: y, pitch: p };
                    if (a.option !== undefined) {
                        const o = int(a.option, 0, 15);
                        if (o === null)
                            break;
                        t.option = o;
                    }
                    action = t;
                    break;
                }
                case "fireCall": { // ruling 129
                    const c = str(a.call, 32), x = fin(a.x, -MAP, MAP), z = fin(a.z, -MAP, MAP);
                    if (!c || x === null || z === null)
                        break;
                    const t = { kind: "fireCall", call: c, x, z };
                    if (a.option !== undefined) {
                        const o = int(a.option, 0, 15);
                        if (o === null)
                            break;
                        t.option = o;
                    }
                    action = t;
                    break;
                }
                // C6
                case "loadout": {
                    if (!Array.isArray(a.calls) || a.calls.length > 8)
                        break;
                    const ids = a.calls.map((x) => str(x, 32));
                    if (ids.every((x) => !!x))
                        action = { kind: "loadout", calls: ids };
                    break;
                }
                case "charge": {
                    const t = id(a.target);
                    if (t !== null)
                        action = { kind: "charge", target: t };
                    break;
                }
                case "fortify": {
                    const p = int(a.point, 0, 4096), c = int(a.constructor, -1, ID);
                    if (p !== null && c !== null)
                        action = { kind: "fortify", point: p, constructor: c };
                    break;
                }
                case "deployBase": {
                    const v = id(a.vehicle);
                    if (v !== null)
                        action = { kind: "deployBase", vehicle: v };
                    break;
                }
                case "packBase": {
                    const d = id(a.depot);
                    if (d !== null)
                        action = { kind: "packBase", depot: d };
                    break;
                }
                // C7b
                case "load": {
                    const u = ids(a.units, 64), v = id(a.vehicle);
                    if (u && u.length && v !== null)
                        action = { kind: "load", units: u, vehicle: v };
                    break;
                }
                case "unload": {
                    const v = id(a.vehicle), x = fin(a.x, -MAP, MAP), z = fin(a.z, -MAP, MAP);
                    if (v !== null && x !== null && z !== null)
                        action = { kind: "unload", vehicle: v, x, z };
                    break;
                }
                case "lift": {
                    const l = id(a.lifter), t = id(a.target);
                    if (l !== null && t !== null)
                        action = { kind: "lift", lifter: l, target: t };
                    break;
                }
                case "jammer": {
                    const r = id(a.relay);
                    if (r !== null)
                        action = { kind: "jammer", relay: r, on: !!a.on };
                    break;
                }
                case "decoy":
                    action = { kind: "decoy" };
                    break;
                case "pulse":
                    action = { kind: "pulse" };
                    break;
                case "groupSet": {
                    const l = int(a.label, 1, 16), u = ids(a.ids, 64);
                    if (l !== null && u && u.length)
                        action = { kind: "groupSet", label: l, ids: u, add: a.add !== false };
                    break;
                }
                case "groupOrder": {
                    const l = int(a.label, 1, 16), o = int(a.order, 0, 4), x = fin(a.x, -MAP, MAP), z = fin(a.z, -MAP, MAP), t = int(a.target ?? 0, 0, ID);
                    if (l !== null && o !== null && x !== null && z !== null && t !== null)
                        action = { kind: "groupOrder", label: l, order: o, x, z, target: t };
                    break;
                }
                case "groupWaypoint": {
                    const l = int(a.label, 1, 16), x = fin(a.x, -MAP, MAP), z = fin(a.z, -MAP, MAP);
                    if (l !== null && x !== null && z !== null)
                        action = { kind: "groupWaypoint", label: l, x, z };
                    break;
                }
                case "groupReinforce": {
                    const l = int(a.label, 1, 16);
                    if (l !== null)
                        action = { kind: "groupReinforce", label: l, on: !!a.on };
                    break;
                }
                case "autoDefend":
                    action = { kind: "autoDefend", on: !!a.on };
                    break;
                // C9 (fix-qa2)
                case "garrison": {
                    const p = int(a.point, 0, 4096), u = ids(a.units, 64);
                    if (p !== null && u && u.length)
                        action = { kind: "garrison", point: p, units: u, on: a.on !== false };
                    break;
                }
                case "reserveDeploy": {
                    const k = int(a.k, 0, 255), x = fin(a.x, -MAP, MAP), z = fin(a.z, -MAP, MAP);
                    if (k !== null && x !== null && z !== null)
                        action = { kind: "reserveDeploy", k, x, z };
                    break;
                }
                case "recall": {
                    const u = ids(a.units, 64);
                    if (u && u.length)
                        action = { kind: "recall", units: u };
                    break;
                }
                case "rapid": {
                    const p = int(a.point, 0, 4096);
                    if (p !== null)
                        action = { kind: "rapid", point: p };
                    break;
                }
                case "reserveMode": {
                    const b = id(a.building);
                    if (b !== null)
                        action = { kind: "reserveMode", building: b, on: !!a.on };
                    break;
                }
                case "upgrade": {
                    const l = id(a.lab), u = int(a.u, 0, 15);
                    if (l !== null && u !== null)
                        action = { kind: "upgrade", lab: l, u };
                    break;
                }
                case "manTower": {
                    const t = id(a.tower);
                    if (t !== null)
                        action = { kind: "manTower", tower: t };
                    break;
                }
                case "leaveTower":
                    action = { kind: "leaveTower" };
                    break;
                case "shelter": {
                    const b = a.enter ? id(a.building) : 0;
                    if (b !== null)
                        action = { kind: "shelter", enter: !!a.enter, building: b };
                    break;
                } // ruling 121
                case "manGun": {
                    const t = id(a.turret);
                    if (t !== null)
                        action = { kind: "manGun", turret: t };
                    break;
                } // ruling 125
                case "dispatch": {
                    const v = id(a.vehicle), u = Array.isArray(a.pilots) && a.pilots.length === 0 ? [] : ids(a.pilots, 16), n = int(a.n, 1, 12);
                    if (v !== null && u && n !== null)
                        action = { kind: "dispatch", vehicle: v, pilots: u, n };
                    break;
                } // ruling 124
                case "crew": {
                    const u = ids(a.vehicles, 64);
                    if (u && u.length)
                        action = { kind: "crew", vehicles: u };
                    break;
                } // C11
                case "gasFloor": {
                    const g = int(a.gas, 0, 100000);
                    if (g !== null)
                        action = { kind: "gasFloor", gas: g };
                    break;
                }
                case "exportCargo": {
                    const u = id(a.uplink), o = fin(a.ore, 0, 1e6), g = fin(a.gas, 0, 1e6);
                    if (u !== null && o !== null && g !== null)
                        action = { kind: "exportCargo", uplink: u, ore: o, gas: g };
                    break;
                }
            }
            return action ? { t: "act", reqId, action } : null;
        }
    }
    return null;
}
/**
 * The player slot for browser pid: its old slot if it was here before (rejoin, or after a handover), else the lowest
 * free slot, else -1 (room full: MAX_PLAYERS players already hold a slot online). An offline player's slot is reused
 * only when every other slot is taken (a returning player otherwise gets their own pilot back).
 */
function assignSlot(roster, pid, max = exports.MAX_PLAYERS) {
    const mine = roster.find((r) => r.pid === pid);
    if (mine)
        return mine.slot;
    const used = new Set(roster.map((r) => r.slot));
    for (let s = 0; s < max; s++)
        if (!used.has(s))
            return s;
    const off = roster.filter((r) => !r.online).sort((a, b) => a.slot - b.slot)[0];
    return off ? off.slot : -1;
}
/**
 * Host election after the host link dropped: every guest computes the same order from the last roster the host
 * sent (players still online, the old host left out, lowest player slot first). The first claims the host id; the
 * others wait rank x HANDOVER_STEP_MS before trying to claim it themselves (if the first never shows up), and dial
 * it meanwhile. Returns the ordered candidate slots.
 */
function electionOrder(roster, oldHostSlot) {
    return roster.filter((r) => r.online && r.slot !== oldHostSlot).map((r) => r.slot).sort((a, b) => a - b);
}
exports.HANDOVER_STEP_MS = 4000;
/** My rank in the election (0 = I claim first); -1 if I am not a candidate. */
function electionRank(roster, oldHostSlot, mySlot) {
    return electionOrder(roster, oldHostSlot).indexOf(mySlot);
}
function netConfig(search) {
    const q = new URLSearchParams(search);
    let sig = { host: "0.peerjs.com", port: 443, path: "/", key: "peerjs", secure: true };
    const sg = q.get("sig");
    if (sg) {
        try {
            const u = new URL(sg);
            sig = { host: u.hostname, port: Number(u.port) || (u.protocol === "wss:" ? 443 : 80), path: u.pathname.endsWith("/") ? u.pathname : u.pathname + "/", key: q.get("key") || "peerjs", secure: u.protocol === "wss:" };
        }
        catch { /* keep the default */ }
    }
    const mq = q.get("mqtt");
    const mqtt = (mq === null ? "wss://broker.emqx.io:8084/mqtt,wss://broker.hivemq.com:8884/mqtt" : mq).split(",").filter((s) => s && s !== "none");
    const ice = q.get("ice") === "none" ? [] : [{ urls: "stun:stun.l.google.com:19302" }, { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" }];
    return { sig, mqtt, ice, loopback: q.get("sig") === "loopback" };
}
