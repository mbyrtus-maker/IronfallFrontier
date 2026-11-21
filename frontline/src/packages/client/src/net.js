"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = exports.Link = exports.LoopbackSignal = exports.PublicSignal = void 0;
exports.makeSignaller = makeSignaller;
// N1: connections between browsers (Driftgate Beyond's design, adapted; the designer owns that code). Friends type
// the same room code; whoever opens it first claims the host id `ironfall1-<slug>-host` on the PeerJS signalling
// server (raw WebSocket protocol, no PeerJS library) and the others dial it. Offers, answers and candidates also go
// through public MQTT brokers as a second route. Each link is a WebRTC connection with two data channels: 'r'
// reliable and ordered (requests, welcome, roster, checkpoints; large messages chunked) and 'u' unreliable
// (snapshots, pilot control, acks, heartbeats). Signalling sits behind the Signaller interface so tests swap in an
// in-page loopback (BroadcastChannel; ?sig=loopback).
const netcore_ts_1 = require("./netcore.js");
// ------------------------------------------------------------------ PeerJS server protocol (raw WebSocket)
class PeerJsSignal {
    onmessage = null;
    onlost = null;
    ws = null;
    hb = 0;
    done = false;
    cfg;
    constructor(cfg) { this.cfg = cfg; }
    open(id) {
        return new Promise((res) => {
            const c = this.cfg;
            let ws;
            const fin = (r) => { if (!this.done) {
                this.done = true;
                res(r);
            } };
            try {
                ws = new WebSocket(`${c.secure ? "wss" : "ws"}://${c.host}:${c.port}${c.path}peerjs?key=${encodeURIComponent(c.key)}&id=${encodeURIComponent(id)}&token=${(0, netcore_ts_1.rid)(10)}&version=1.5.4`);
            }
            catch {
                res({ err: "Could not reach the matchmaking server." });
                return;
            }
            this.ws = ws;
            this.hb = setInterval(() => { if (ws.readyState === 1)
                ws.send('{"type":"HEARTBEAT"}'); }, 5000);
            ws.onmessage = (ev) => {
                let m;
                try {
                    m = JSON.parse(String(ev.data));
                }
                catch {
                    return;
                }
                if (m.type === "OPEN")
                    fin({ ok: true });
                else if (m.type === "ID-TAKEN") {
                    clearInterval(this.hb);
                    fin({ taken: true });
                    try {
                        ws.close();
                    }
                    catch { /* closed */ }
                }
                else if (m.type === "ERROR" || m.type === "INVALID-KEY") {
                    clearInterval(this.hb);
                    fin({ err: (m.payload?.msg) || "Matchmaking error." });
                }
                else if (this.done)
                    this.onmessage?.(m);
            };
            ws.onerror = () => fin({ err: "Could not reach the matchmaking server." });
            ws.onclose = () => { clearInterval(this.hb); const was = this.done; fin({ err: "The matchmaking server closed the connection." }); if (was && this.ws === ws) {
                this.ws = null;
                this.onlost?.();
            } };
            setTimeout(() => { if (!this.done) {
                fin({ err: "The matchmaking server did not answer." });
                try {
                    ws.close();
                }
                catch { /* closed */ }
            } }, 12000);
        });
    }
    send(m) { if (this.ws && this.ws.readyState === 1)
        this.ws.send(JSON.stringify(m)); }
    close() { clearInterval(this.hb); const ws = this.ws; this.ws = null; if (ws) {
        ws.onclose = null;
        try {
            ws.close();
        }
        catch { /* closed */ }
    } }
}
const B = (b) => b;
// ------------------------------------------------------------------ MQTT 3.1.1 over WebSocket (backup route)
// Each browser listens on topic ironfall1/<its id>; offers / answers / candidates are published to the other side's
// topic as well as sent through PeerJS (the receiver ignores duplicates by the link nonce).
class MqttRoute {
    ok = false;
    dead = false;
    ws = null;
    q = [];
    subs = new Set();
    pid = 1;
    pi = 0;
    url;
    onMsg;
    constructor(url, onMsg) { this.url = url; this.onMsg = onMsg; this.connect(); }
    static str(x) { const b = new TextEncoder().encode(x); return [b.length >> 8, b.length & 255, ...b]; }
    static pkt(h, body) {
        const rl = [];
        let n = body.length;
        do {
            let d = n % 128;
            n = Math.floor(n / 128);
            if (n > 0)
                d |= 128;
            rl.push(d);
        } while (n > 0);
        return new Uint8Array([h, ...rl, ...body]);
    }
    connect() {
        let ws;
        try {
            ws = new WebSocket(this.url, "mqtt");
        }
        catch {
            return;
        }
        ws.binaryType = "arraybuffer";
        this.ws = ws;
        ws.onopen = () => ws.send(B(MqttRoute.pkt(0x10, [...MqttRoute.str("MQTT"), 4, 2, 0, 60, ...MqttRoute.str("if" + (0, netcore_ts_1.rid)(14))])));
        ws.onmessage = (e) => {
            const d = new Uint8Array(e.data), dec = new TextDecoder();
            let i = 0;
            while (i < d.length) {
                const t = d[i] >> 4, qos = (d[i] >> 1) & 3;
                let m = 1, len = 0, j = i + 1, b;
                do {
                    b = d[j++];
                    len += (b & 127) * m;
                    m *= 128;
                } while (b & 128 && j < d.length);
                const body = d.subarray(j, j + len);
                if (t === 2) {
                    this.ok = true;
                    for (const x of this.q)
                        ws.send(B(x));
                    this.q = [];
                    for (const s of this.subs)
                        this.subNow(s);
                    clearInterval(this.pi);
                    this.pi = setInterval(() => { if (ws.readyState === 1)
                        ws.send(B(new Uint8Array([0xc0, 0]))); }, 25000);
                }
                else if (t === 3) {
                    const tl = (body[0] << 8) | body[1], topic = dec.decode(body.subarray(2, 2 + tl));
                    try {
                        const msg = JSON.parse(dec.decode(body.subarray(2 + tl + (qos ? 2 : 0))));
                        if (msg && typeof msg === "object")
                            this.onMsg(topic, msg);
                    }
                    catch { /* not ours */ }
                }
                i = j + len;
            }
        };
        ws.onclose = () => { this.ok = false; clearInterval(this.pi); if (!this.dead)
            setTimeout(() => { if (!this.dead)
                this.connect(); }, 5000); };
    }
    raw(b) { if (this.ws && this.ws.readyState === 1 && this.ok)
        this.ws.send(B(b));
    else if (this.q.length < 200)
        this.q.push(b); }
    subNow(t) { this.pid = (this.pid % 60000) + 1; if (this.ws && this.ws.readyState === 1 && this.ok)
        this.ws.send(B(MqttRoute.pkt(0x82, [this.pid >> 8, this.pid & 255, ...MqttRoute.str(t), 0]))); }
    sub(t) { if (this.subs.has(t))
        return; this.subs.add(t); this.subNow(t); }
    unsub(t) { this.subs.delete(t); }
    pub(t, x) { this.raw(MqttRoute.pkt(0x30, [...MqttRoute.str(t), ...new TextEncoder().encode(x)])); }
    close() { this.dead = true; clearInterval(this.pi); try {
        this.ws?.close();
    }
    catch { /* closed */ } }
}
/** The public route: PeerJS claims the id and relays; every MQTT broker is a second relay. */
class PublicSignal {
    onmessage = null;
    onlost = null;
    pj;
    cfg;
    myId = "";
    static mq = null;
    static inbox = new Map();
    constructor(cfg) {
        this.cfg = cfg;
        this.pj = new PeerJsSignal(cfg.sig);
        this.pj.onmessage = (m) => this.onmessage?.(m);
        this.pj.onlost = () => this.onlost?.();
    }
    async open(id) {
        const r = await this.pj.open(id);
        if ("ok" in r) {
            this.myId = id;
            if (!PublicSignal.mq)
                PublicSignal.mq = this.cfg.mqtt.map((u) => new MqttRoute(u, (topic, m) => {
                    const s = PublicSignal.inbox.get(topic.slice("ironfall1/".length));
                    if (s && m.dst === s.myId)
                        s.onmessage?.(m);
                }));
            PublicSignal.inbox.set(id, this);
            for (const q of PublicSignal.mq)
                q.sub("ironfall1/" + id);
        }
        return r;
    }
    send(m) {
        this.pj.send(m);
        const s = JSON.stringify({ ...m, src: this.myId });
        for (const q of PublicSignal.mq ?? [])
            q.pub("ironfall1/" + m.dst, s);
    }
    close() { this.pj.close(); if (PublicSignal.inbox.get(this.myId) === this)
        PublicSignal.inbox.delete(this.myId); for (const q of PublicSignal.mq ?? [])
        q.unsub("ironfall1/" + this.myId); }
}
exports.PublicSignal = PublicSignal;
// ------------------------------------------------------------------ in-page loopback (tests: BroadcastChannel)
// The same rules as the PeerJS server: an id can be held by one browser at a time (a claim is refused while its
// holder answers), messages are delivered by destination id with the sender's id as src.
class LoopbackSignal {
    onmessage = null;
    onlost = null;
    bc = null;
    id = "";
    open(id) {
        return new Promise((res) => {
            const bc = new BroadcastChannel("ironfall-loopback-sig");
            const nonce = (0, netcore_ts_1.rid)(8);
            let taken = false;
            bc.onmessage = (e) => {
                const m = e.data;
                if (m.type === "CLAIM" && m.claim === this.id && this.id)
                    bc.postMessage({ type: "TAKEN", dst: "", claim: m.claim, nonce: m.nonce });
                else if (m.type === "TAKEN" && m.nonce === nonce)
                    taken = true;
                else if (this.id && m.dst === this.id)
                    this.onmessage?.(m);
            };
            bc.postMessage({ type: "CLAIM", dst: "", claim: id, nonce });
            setTimeout(() => {
                if (taken) {
                    bc.close();
                    res({ taken: true });
                    return;
                }
                this.bc = bc;
                this.id = id;
                res({ ok: true });
            }, 250);
        });
    }
    // JSON as on the real server (session descriptions do not survive a structured clone)
    send(m) { this.bc?.postMessage(JSON.parse(JSON.stringify({ ...m, src: this.id }))); }
    close() { this.id = ""; try {
        this.bc?.close();
    }
    catch { /* closed */ } this.bc = null; }
}
exports.LoopbackSignal = LoopbackSignal;
function makeSignaller(cfg) { return cfg.loopback ? new LoopbackSignal() : new PublicSignal(cfg); }
class Link {
    pc;
    r = null;
    u = null;
    open = false;
    dead = false;
    quiet = false;
    /** The offer's nonce (answers and candidates of an older offer are ignored). */
    n;
    ping = 0;
    lastHeard = 0;
    stats = { sentR: 0, sentU: 0, recvR: 0, recvU: 0, since: 0 };
    cq = [];
    asm = new netcore_ts_1.Reassembler();
    chunkId = 1;
    hb = 0;
    onopen = null;
    ondown = null;
    onr = null;
    onu = null;
    onstate = null;
    peer;
    sig;
    constructor(peer, init, ice, sig) {
        this.peer = peer;
        this.sig = sig;
        this.n = init ? (0, netcore_ts_1.rid)(8) : "";
        const pc = this.pc = new RTCPeerConnection({ iceServers: ice });
        pc.onicecandidate = (e) => { if (e.candidate)
            sig({ type: "CANDIDATE", dst: peer, payload: { c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate, n: this.n } }); };
        let dT = 0;
        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            this.onstate?.(s);
            if (s === "failed" || s === "closed")
                this.down();
            else if (s === "disconnected") {
                clearTimeout(dT);
                dT = setTimeout(() => { if (pc.connectionState !== "connected")
                    this.down(); }, 5000);
            }
        };
        if (init) {
            this.wire(this.r = pc.createDataChannel("r", { ordered: true }));
            this.wire(this.u = pc.createDataChannel("u", { ordered: false, maxRetransmits: 0 }));
            pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => sig({ type: "OFFER", dst: peer, payload: { sdp: pc.localDescription, n: this.n } })).catch((e) => console.warn("offer", e));
        }
        else
            pc.ondatachannel = (e) => { if (e.channel.label === "r")
                this.r = e.channel;
            else
                this.u = e.channel; this.wire(e.channel); };
    }
    wire(ch) {
        ch.binaryType = "arraybuffer";
        ch.onopen = () => {
            if (!this.open && this.r?.readyState === "open" && this.u?.readyState === "open") {
                this.open = true;
                this.lastHeard = performance.now();
                this.stats.since = performance.now();
                this.hb = setInterval(() => this.beat(), netcore_ts_1.HEARTBEAT_MS);
                this.onopen?.();
            }
        };
        ch.onmessage = (e) => {
            if (!(e.data instanceof ArrayBuffer))
                return;
            const b = new Uint8Array(e.data);
            this.lastHeard = performance.now();
            if (ch === this.r) {
                this.stats.recvR += b.length;
                const whole = this.asm.push(b);
                if (!whole)
                    return;
                const m = (0, netcore_ts_1.unpackR)(whole);
                if (m)
                    this.onr?.(m.msg, m.bin);
            }
            else {
                this.stats.recvU += b.length;
                if (b[0] === netcore_ts_1.U_PING) {
                    this.sendU((0, netcore_ts_1.encodePing)(netcore_ts_1.U_PONG, (0, netcore_ts_1.decodePing)(b)));
                    return;
                }
                if (b[0] === netcore_ts_1.U_PONG) {
                    const t = (0, netcore_ts_1.decodePing)(b);
                    if (Number.isFinite(t))
                        this.ping = performance.now() - t;
                    return;
                }
                this.onu?.(b);
            }
        };
        ch.onclose = () => this.down();
    }
    beat() {
        if (!this.open || this.dead)
            return;
        if (performance.now() - this.lastHeard > netcore_ts_1.LINK_TIMEOUT_MS) {
            this.down();
            return;
        }
        this.sendU((0, netcore_ts_1.encodePing)(netcore_ts_1.U_PING, performance.now()));
    }
    async answer(sdp, n) {
        this.n = n;
        await this.pc.setRemoteDescription(sdp);
        const a = await this.pc.createAnswer();
        await this.pc.setLocalDescription(a);
        this.sig({ type: "ANSWER", dst: this.peer, payload: { sdp: this.pc.localDescription, n } });
        this.flush();
    }
    async accept(sdp, n) {
        if (this.pc.remoteDescription || (n && n !== this.n))
            return;
        await this.pc.setRemoteDescription(sdp);
        this.flush();
    }
    candidate(c, n) {
        if (n && this.n && n !== this.n)
            return;
        if (this.pc.remoteDescription)
            this.pc.addIceCandidate(c).catch(() => { });
        else
            this.cq.push(c);
    }
    flush() { for (const c of this.cq)
        this.pc.addIceCandidate(c).catch(() => { }); this.cq = []; }
    /** Reliable, ordered; any size (chunked). */
    sendR(msg, bin) {
        if (!this.open || this.dead || this.r?.readyState !== "open")
            return;
        try {
            for (const f of (0, netcore_ts_1.chunk)((0, netcore_ts_1.packR)(msg, bin), this.chunkId++)) {
                this.r.send(f);
                this.stats.sentR += f.length;
            }
        }
        catch (e) {
            console.warn("sendR", e);
        }
    }
    /** Unreliable (one datagram; dropped if over the limit). */
    sendU(b) {
        if (!this.open || this.dead || this.u?.readyState !== "open" || b.length > 16000)
            return;
        try {
            this.u.send(b);
            this.stats.sentU += b.length;
        }
        catch { /* congested: dropped */ }
    }
    close(quiet = true) { if (quiet)
        this.quiet = true; this.dead = true; clearInterval(this.hb); try {
        this.pc.close();
    }
    catch { /* closed */ } }
    downDone = false;
    down() {
        if (this.downDone)
            return;
        this.downDone = true;
        this.dead = true;
        this.open = false;
        clearInterval(this.hb);
        try {
            this.pc.close();
        }
        catch { /* closed */ }
        if (!this.quiet)
            this.ondown?.();
    }
}
exports.Link = Link;
class Session {
    role = "off";
    sig = null;
    myId = "";
    hostId;
    links = new Map();
    host = null;
    dialTimer = 0;
    stopped = false;
    cfg;
    code;
    myPeerId;
    ev;
    constructor(cfg, code, hostId, myPeerId, ev) { this.cfg = cfg; this.code = code; this.hostId = hostId; this.myPeerId = myPeerId; this.ev = ev; }
    sigSend = (m) => this.sig?.send(m);
    useSig(s, id) {
        this.sig = s;
        this.myId = id;
        s.onmessage = (m) => { void this.onSig(m); };
        s.onlost = () => { if (this.sig === s) {
            this.sig = null;
            if (this.role === "host")
                this.reclaim();
        } };
    }
    /** Claim the host id; if someone holds it, register our own id and dial them. */
    async start() {
        this.role = "connecting";
        this.ev.status("Contacting the matchmaking server…");
        const won = await this.claim();
        if (won === true)
            return;
        if (won === "err")
            return;
        await this.dial();
    }
    /** true: we host now; false: the id is taken; "err": signalling failed (status shown). */
    async claim() {
        const s = makeSignaller(this.cfg);
        const r = await s.open(this.hostId);
        if ("ok" in r) {
            if (this.sig)
                this.sig.close();
            this.useSig(s, this.hostId);
            this.role = "host";
            this.host = null;
            this.ev.hosting();
            return true;
        }
        if ("taken" in r)
            return false;
        this.ev.status(r.err + " Check your connection and try again.", true);
        this.role = "off";
        return "err";
    }
    /** Guest: register our own id (once) and dial the host. */
    async dial() {
        if (!this.sig || this.myId === this.hostId) {
            const s = makeSignaller(this.cfg);
            const r = await s.open(this.myPeerId);
            if (!("ok" in r)) {
                this.ev.status(("err" in r ? r.err : "Could not register with the matchmaking server.") + " Retrying…", true);
                return false;
            }
            this.useSig(s, this.myPeerId);
        }
        this.role = "guest";
        this.ev.status("Found the host. Opening a direct connection…");
        if (this.host)
            this.host.close();
        const L = this.host = this.mkLink(this.hostId, true);
        L.onopen = () => { if (this.host === L)
            this.ev.hostUp(L); };
        L.ondown = () => { if (this.host === L) {
            this.host = null;
            this.ev.hostDown();
        } };
        L.onstate = (s) => { if (this.host === L && !L.open)
            this.ev.status(s === "connecting" ? "Linking your browsers (finding a network path)…" : s === "connected" ? "Linked. Loading the battle…" : s === "failed" ? "Your browsers could not find a network path to each other." : "Opening a direct connection…", s === "failed"); };
        return new Promise((res) => {
            clearTimeout(this.dialTimer);
            const t0 = performance.now();
            const iv = setInterval(() => {
                if (L.open) {
                    clearInterval(iv);
                    res(true);
                }
                else if (L.dead || performance.now() - t0 > 12000 || this.stopped) {
                    clearInterval(iv);
                    if (!L.dead)
                        L.close();
                    if (this.host === L)
                        this.host = null;
                    if (!this.stopped)
                        this.ev.status(L.pc.remoteDescription ? "Couldn't connect to the host: one of your networks may be blocking direct browser connections. Retrying…" : "The host's game isn't answering (its tab must be open in front). Retrying…", true);
                    res(false);
                }
            }, 200);
        });
    }
    mkLink(peer, init) {
        const L = new Link(peer, init, this.cfg.ice, this.sigSend);
        const old = this.links.get(peer);
        if (old && old !== L)
            old.close();
        this.links.set(peer, L);
        return L;
    }
    async onSig(m) {
        const src = m.src ?? "";
        const p = (m.payload ?? {});
        try {
            if (m.type === "OFFER") {
                if (this.role !== "host")
                    return;
                let L = this.links.get(src);
                if (L && L.n && L.n === p.n)
                    return; // the same offer by the second route
                if (L)
                    L.close();
                this.ev.status("A player is connecting…");
                L = this.mkLink(src, false);
                const LL = L;
                L.onopen = () => this.ev.guestUp(LL);
                L.ondown = () => { if (this.links.get(src) === LL)
                    this.links.delete(src); this.ev.guestDown(LL); };
                await L.answer(p.sdp, p.n ?? "");
            }
            else if (m.type === "ANSWER") {
                const L = this.links.get(src);
                if (L) {
                    await L.accept(p.sdp, p.n ?? "");
                    if (L === this.host)
                        this.ev.status("The host answered. Linking your browsers…");
                }
            }
            else if (m.type === "CANDIDATE") {
                const L = this.links.get(src);
                if (L && p.c)
                    L.candidate(p.c, p.n ?? "");
            }
            else if (m.type === "EXPIRE") {
                if (this.role === "guest" && src === this.hostId && this.host && !this.host.open) {
                    this.host.down();
                }
            }
        }
        catch (e) {
            console.warn("signal", e);
        }
    }
    /** Host: the signalling line dropped; claim the id again so new players can still find us. */
    reclaim() {
        setTimeout(async () => {
            if (this.role !== "host" || this.sig || this.stopped)
                return;
            const s = makeSignaller(this.cfg);
            const r = await s.open(this.hostId);
            if ("ok" in r && this.role === "host")
                this.useSig(s, this.hostId);
            else
                this.reclaim();
        }, 4000);
    }
    stop() {
        this.stopped = true;
        this.role = "off";
        for (const L of this.links.values())
            L.close();
        this.links.clear();
        this.host = null;
        this.sig?.close();
        this.sig = null;
    }
}
exports.Session = Session;
