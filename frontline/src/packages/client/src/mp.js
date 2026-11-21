"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mp = exports.RemotePort = void 0;
// N1: host + guest play (up to 4 players on the player team, co-op). The game glue on top of net.ts:
//   host: keeps running the sim worker; each connected guest gets a player slot (1-3), its own pilot and its own
//     snapshot stream (the data's rate and byte cap, sent on 'u'); the guest's inputs are validated (netcore) and
//     queued into the sim for the guest's own pilot; join in progress: welcome (scenario, slot, pilot id), then the
//     stream starts with a keyframe; a checkpoint (exportState) goes to every guest on 'r' every N seconds.
//   guest: no local sim; the page's sim port is a RemotePort that turns the page's worker messages into network
//     messages and the host's frames back into the page's snapshot messages (the page renders as before).
//   handover: when the host link drops, the guests agree on the new host (lowest player slot still online), it
//     starts a sim worker from its checkpoint (the stream epoch is bumped by createSimFromState), claims the host
//     id, and the others re-dial it.
const net_ts_1 = require("./net.js");
const netcore_ts_1 = require("./netcore.js");
const progression_ui_ts_1 = require("./progression-ui.js"); // C7a hook
/** Checkpoints go deflate-compressed (CompressionStream; null where the browser has none: sent raw). */
async function pipe(b, s) {
    const out = new Response(new Blob([b]).stream().pipeThrough(s));
    return new Uint8Array(await out.arrayBuffer());
}
async function deflate(b) { try {
    return typeof CompressionStream === "undefined" ? null : await pipe(b, new CompressionStream("deflate-raw"));
}
catch {
    return null;
} }
async function inflate(b) { try {
    return await pipe(b, new DecompressionStream("deflate-raw"));
}
catch {
    return null;
} }
// ------------------------------------------------------------------ guest: the page's sim port over the network
class RemotePort {
    onmessage = null;
    link = null;
    pilotId = 0;
    ctl = null;
    viewer = null;
    timer = 0;
    n = 0;
    frames = 0;
    badFrames = 0;
    constructor() {
        this.timer = setInterval(() => {
            // pilot control at CONTROL_HZ on 'u' (resent: a lost datagram is replaced 50 ms later); the viewer at 5 Hz
            if (!this.link)
                return;
            this.link.sendU((0, netcore_ts_1.encodeU)({ t: "pctl", input: this.ctl }));
            if (this.viewer && ++this.n % 4 === 0)
                this.link.sendU((0, netcore_ts_1.encodeU)({ t: "viewer", ...this.viewer }));
        }, 1000 / netcore_ts_1.CONTROL_HZ);
    }
    deliver(m) { this.onmessage?.({ data: m }); }
    postMessage(m) {
        switch (m.t) {
            // C7b item 1: a predicted input (with its clientSeq) goes out at once, one per tick; the 20 Hz resend covers losses
            case "pctl":
                this.ctl = m.input;
                if (m.input && m.input.clientSeq !== undefined)
                    this.link?.sendU((0, netcore_ts_1.encodeU)({ t: "pctl", input: m.input }));
                break;
            case "viewer":
                this.viewer = { x: m.x, z: m.z };
                break;
            case "ack":
                this.link?.sendU((0, netcore_ts_1.encodeU)({ t: "ack", seq: m.seq, epoch: m.epoch }));
                break;
            case "act":
            case "order":
            case "query":
                this.link?.sendR({ t: "g", m });
                break;
            case "init":
                setTimeout(() => this.deliver({ t: "ready", pilotId: this.pilotId, typeIds: [], scenario: m.scenario, units: m.units, seed: m.seed, difficulty: m.difficulty }), 0);
                break;
            case "stats":
                setTimeout(() => this.deliver({ t: "stats", reqId: m.reqId, ticks: 0, tickMsMean: 0, tickMsP50: 0, tickMsP95: 0, tickMsP99: 0, tickMsMax: 0, units: 0, structures: 0, projectilesPeak: 0, snapBytesMean: 0, acks: 0, epoch: 0 }), 0);
                break;
            case "debug":
                setTimeout(() => this.deliver({ t: "debug", reqId: m.reqId, result: null }), 0);
                break; // test aids act on the host only
            default: break; // pause and the host's own messages: not a guest's
        }
    }
    /** A 'u' frame from the host: the snapshots of one interval as the page's snapshot message. */
    frame(b) {
        const f = (0, netcore_ts_1.decodeSnapFrame)(b);
        if (!f) {
            this.badFrames++;
            return;
        }
        this.frames++;
        this.pilotId = f.pilotId;
        const m = {
            t: "snap", tick: f.tick, snaps: f.snaps.map((s) => s.buffer), aimIds: f.aimIds, aimYaw: f.aimYaw, deaths: f.deaths,
            host: { pilotId: f.pilotId, shots: 0, controlled: f.controlled, epoch: f.epoch },
            perf: { tickMsMean: 0, tickMsMax: 0, ticksPerSec: 0, snapBytesPerSec: 0, entities: 0, projectiles: 0 }, wave: 0, secondsToWave: 0,
        };
        this.deliver(m);
    }
    reply(m) { this.deliver(m); }
    terminate() { clearInterval(this.timer); this.link = null; }
}
exports.RemotePort = RemotePort;
class Mp {
    role = "off";
    session = null;
    code = "";
    name = "";
    pid = "";
    mySlot = 0;
    roster = [];
    /** Host: link -> slot. */
    slots = new Map();
    ckTimer = 0;
    ckReq = 0;
    /** Guest: the latest checkpoint from the host (kept to take over), and its tick. */
    ckpt = null;
    ckTick = 0;
    /** Host: the last checkpoint's raw and compressed sizes (bytes). */
    ckRaw = 0;
    ckZ = 0;
    port = null;
    playing = false;
    electing = false;
    handovers = 0;
    lastStatus = "";
    cfg;
    hooks;
    retry = 0;
    constructor(cfg, hooks) { this.cfg = cfg; this.hooks = hooks; }
    status(t, bad = false) { this.lastStatus = t; this.hooks.status(t, bad); }
    get active() { return this.role !== "off"; }
    /** Host with at least one guest online (the battle is shared: the pause menu does not stop it). */
    shared() { return this.role === "host" && this.roster.some((r) => r.online && r.slot !== this.mySlot); }
    /** Host / Join (one button, as in Driftgate): first in the room hosts, the others join. */
    async join(code, name, pid) {
        if (this.session)
            return;
        this.code = code.trim().slice(0, 24);
        this.name = (0, netcore_ts_1.cleanName)(name) || "Pilot";
        this.pid = pid;
        if (!(0, netcore_ts_1.slug)(this.code)) {
            this.status("Enter a room code (letters and numbers).", true);
            return;
        }
        if (typeof RTCPeerConnection === "undefined") {
            this.status("This browser cannot make peer-to-peer connections.", true);
            return;
        }
        this.role = "connecting";
        this.session = new net_ts_1.Session(this.cfg, this.code, (0, netcore_ts_1.hostIdFor)(this.code), (0, netcore_ts_1.peerIdFor)(this.code, pid, (0, netcore_ts_1.rid)(4)), {
            status: (t, bad) => this.status(t, bad),
            hosting: () => { void this.onHosting(); },
            guestUp: (L) => this.guestUp(L),
            guestDown: (L) => this.guestDown(L),
            hostUp: (L) => this.hostUp(L),
            hostDown: () => this.hostDown(),
        });
        await this.session.start();
        if (this.session.role === "guest" && !this.session.host?.open)
            this.redialLater();
        if (this.session.role === "off") {
            this.session = null;
            this.role = "off";
        }
    }
    redialLater() {
        if (this.retry++ > 20 || !this.session)
            return;
        setTimeout(async () => {
            const s = this.session;
            if (!s || this.playing || s.host?.open || this.role === "host")
                return;
            const c = await s.claim(); // the host may have left before we got in: then we host
            if (c === false && !(await s.dial()))
                this.redialLater();
        }, 2500);
    }
    // ---------------------------------------------------------------- host
    async onHosting() {
        const first = this.role !== "guest";
        this.role = "host";
        if (first) {
            this.mySlot = 0;
            const pilotId = await this.hooks.startHosting();
            this.roster = [{ slot: 0, pid: this.pid, name: this.name, online: true, host: true, pilotId }];
            this.status(`You are hosting “${this.code}”. Friends who enter the same room code join you.`);
        }
        else {
            // handover: this browser takes over from its checkpoint
            this.handovers++;
            const old = this.roster.find((r) => r.host);
            for (const r of this.roster) {
                if (r === old)
                    r.online = false;
                r.host = r.slot === this.mySlot;
                if (r.slot !== this.mySlot && r !== old)
                    r.online = false;
            }
            this.port?.terminate();
            this.port = null;
            this.hooks.becomeHostFrom({ t: "initState", state: this.ckpt.slice().buffer, localSlot: this.mySlot });
            this.hooks.notify(`The host left. You are now hosting “${this.code}” (from the checkpoint at tick ${this.ckTick}).`, "warn");
            this.status(`You are hosting “${this.code}” (the previous host left).`);
        }
        clearInterval(this.ckTimer);
        this.ckTimer = setInterval(() => this.checkpoint(), netcore_ts_1.CHECKPOINT_SECONDS * 1000);
        this.pushRoster();
    }
    checkpoint() {
        if (this.role !== "host" || this.slots.size === 0)
            return;
        this.ckReq = 1e9 + Math.floor(Math.random() * 1e6);
        this.hooks.send({ t: "export", reqId: this.ckReq });
    }
    linkOf(slot) { for (const [L, s] of this.slots)
        if (s === slot && L.open)
            return L; return null; }
    guestUp(L) {
        L.onr = (msg) => this.hostR(L, msg);
        L.onu = (b) => this.hostU(L, b);
    }
    guestDown(L) {
        const slot = this.slots.get(L);
        this.slots.delete(L);
        if (slot === undefined || this.linkOf(slot))
            return;
        const r = this.roster.find((x) => x.slot === slot);
        if (r) {
            r.online = false;
            this.hooks.notify(`${r.name} left.`, "info");
        }
        this.hooks.send({ t: "gleave", slot });
        this.pushRoster();
    }
    hostR(L, msg) {
        if (msg.t === "hello") {
            if (msg.v !== netcore_ts_1.MPV) {
                L.sendR({ t: "refused", why: "This room runs a different version of Ironfall. Reload the page." });
                setTimeout(() => L.close(), 300);
                return;
            }
            const pid = String(msg.pid ?? "").slice(0, 24), name = (0, netcore_ts_1.cleanName)(String(msg.name ?? "")) || "Pilot";
            if (!pid || pid === this.pid) {
                L.sendR({ t: "refused", why: "This browser is already in the room (another tab?)." });
                setTimeout(() => L.close(), 300);
                return;
            }
            const slot = (0, netcore_ts_1.assignSlot)(this.roster, pid, netcore_ts_1.MAX_PLAYERS);
            if (slot < 0) {
                L.sendR({ t: "refused", why: `The room is full (${netcore_ts_1.MAX_PLAYERS} players).` });
                setTimeout(() => L.close(), 300);
                return;
            }
            for (const [o, s] of this.slots)
                if (s === slot && o !== L) {
                    this.slots.delete(o);
                    o.close();
                } // the same player from a new tab
            this.slots.set(L, slot);
            let r = this.roster.find((x) => x.slot === slot);
            if (!r) {
                r = { slot, pid, name, online: true, host: false, pilotId: 0 };
                this.roster.push(r);
                this.roster.sort((a, b) => a.slot - b.slot);
            }
            r.pid = pid;
            r.name = name;
            r.online = true;
            r.host = false;
            this.hooks.send({ t: "c7aGuest", slot, payload: msg.c7a ?? null }); // C7a hook: validated in the worker
            this.hooks.send({ t: "gjoin", slot });
            return;
        }
        const slot = this.slots.get(L);
        if (slot === undefined)
            return;
        if (msg.t === "g")
            this.guestInput(slot, msg.m);
        else if (msg.t === "bye")
            L.down();
    }
    hostU(L, b) {
        const slot = this.slots.get(L);
        if (slot === undefined || b[0] !== netcore_ts_1.U_JSON)
            return;
        const m = (0, netcore_ts_1.decodeU)(b);
        if (m)
            this.guestInput(slot, m);
    }
    refused = 0;
    guestInput(slot, raw) {
        const v = (0, netcore_ts_1.validateGuestMsg)(raw);
        if (!v) {
            this.refused++;
            return;
        }
        if (v.t === "ping") {
            this.relayPing(slot, v.x, v.z, v.kind);
            return;
        }
        this.hooks.send({ t: "g", slot, m: v });
    }
    relayPing(slot, x, z, kind) {
        const name = this.roster.find((r) => r.slot === slot)?.name ?? "?";
        this.hooks.ping(name, x, z, kind);
        for (const L of this.slots.keys())
            if (L.open)
                L.sendR({ t: "ping", name, x, z, kind });
    }
    /** The page sends a ping or quick command to the squad. */
    ping(x, z, kind) {
        if (this.role === "host")
            this.relayPing(this.mySlot, x, z, kind);
        else if (this.role === "guest")
            this.session?.host?.sendR({ t: "g", m: { t: "ping", x, z, kind } });
    }
    /** Worker messages for guests (host). */
    fromWorker(m) {
        switch (m.t) {
            case "gjoined": {
                const r = this.roster.find((x) => x.slot === m.slot);
                if (r)
                    r.pilotId = m.pilotId;
                const L = this.linkOf(m.slot);
                if (!L)
                    return;
                const w = { t: "welcome", v: netcore_ts_1.MPV, slot: m.slot, pilotId: m.pilotId, ...this.hooks.welcomeInfo(), roster: this.roster, tick: 0 };
                L.sendR(w);
                this.hooks.notify(`${r?.name ?? "A player"} joined.`, "good");
                this.pushRoster();
                this.checkpoint(); // the new guest holds a checkpoint from the start
                break;
            }
            case "gsnap":
                this.linkOf(m.slot)?.sendU(new Uint8Array(m.frame));
                break;
            case "gout":
                this.linkOf(m.slot)?.sendR({ t: "gout", m: m.m });
                break;
            case "export": {
                if (m.reqId !== this.ckReq)
                    return;
                const b = new Uint8Array(m.state), tick = m.tick;
                this.ckpt = b;
                this.ckTick = tick;
                void deflate(b).then((z) => {
                    this.ckRaw = b.length;
                    this.ckZ = z ? z.length : b.length;
                    for (const L of this.slots.keys())
                        if (L.open)
                            L.sendR({ t: "ckpt", tick, z: !!z, raw: b.length }, z ?? b);
                });
                break;
            }
        }
    }
    pushRoster() {
        for (const r of this.roster) {
            const L = this.linkOf(r.slot);
            if (L)
                r.ping = Math.round(L.ping);
        }
        for (const L of this.slots.keys())
            if (L.open)
                L.sendR({ t: "roster", roster: this.roster });
        this.hooks.roster(this.roster, this.mySlot, this.role);
    }
    /** The host closes the page: guests start the handover at once instead of waiting for the link timeout. */
    leaving() { if (this.role === "host")
        for (const L of this.slots.keys())
            L.sendR({ t: "bye" });
    else
        this.session?.host?.sendR({ t: "bye" }); }
    // ---------------------------------------------------------------- guest
    hostUp(L) {
        L.onr = (msg, bin) => this.guestR(L, msg, bin);
        L.onu = (b) => { if (b[0] === netcore_ts_1.U_SNAP)
            this.port?.frame(b); };
        L.sendR({ t: "hello", v: netcore_ts_1.MPV, pid: this.pid, name: this.name, c7a: progression_ui_ts_1.c7a.hello() }); // C7a hook: optional profile + loadout
        this.status(this.playing ? "Reconnected to the new host." : "Connected. Loading the battle…");
    }
    guestR(L, msg, bin) {
        switch (msg.t) {
            case "welcome": {
                const w = msg;
                this.mySlot = w.slot;
                this.roster = w.roster;
                if (!this.playing) {
                    this.port = new RemotePort();
                    this.port.link = L;
                    this.port.pilotId = w.pilotId;
                    this.playing = true;
                    this.role = "guest";
                    this.hooks.beginGuest(this.port, w);
                }
                else if (this.port) {
                    this.port.link = L;
                    this.port.pilotId = w.pilotId;
                }
                this.status(`In “${this.code}” as player ${w.slot + 1}.`);
                this.hooks.roster(this.roster, this.mySlot, this.role);
                break;
            }
            case "ckpt":
                if (bin) {
                    const tick = Number(msg.tick) || 0;
                    void (msg.z ? inflate(bin) : Promise.resolve(bin)).then((b) => { if (b && tick >= this.ckTick) {
                        this.ckpt = b;
                        this.ckTick = tick;
                    } });
                }
                break;
            case "roster":
                this.roster = msg.roster ?? [];
                this.hooks.roster(this.roster, this.mySlot, this.role);
                break;
            case "gout":
                this.port?.reply(msg.m);
                break;
            case "ping":
                this.hooks.ping(String(msg.name), Number(msg.x), Number(msg.z), String(msg.kind));
                break;
            case "refused":
                this.status(String(msg.why), true);
                this.stop();
                break;
            case "bye":
                L.down();
                break;
        }
    }
    hostDown() {
        if (this.port)
            this.port.link = null;
        if (!this.playing) {
            this.redialLater();
            return;
        }
        void this.elect();
    }
    /** Host election (netcore.electionOrder): lowest slot still online claims first; the others dial, and claim after rank x step. */
    async elect() {
        if (this.electing || !this.session)
            return;
        this.electing = true;
        const old = this.roster.find((r) => r.host)?.slot ?? 0;
        const rank = (0, netcore_ts_1.electionRank)(this.roster, old, this.mySlot);
        this.status("The host left. Choosing a new host…", true);
        const t0 = performance.now();
        for (let attempt = 0; attempt < 30 && this.session && this.role !== "host"; attempt++) {
            await new Promise((r) => setTimeout(r, attempt === 0 ? (rank <= 0 ? 200 : 1200) : 1000));
            if (!this.session)
                break;
            const mayClaim = !!this.ckpt && (rank <= 0 || performance.now() - t0 > rank * netcore_ts_1.HANDOVER_STEP_MS);
            if (mayClaim) {
                const c = await this.session.claim();
                if (c === true)
                    break;
            }
            this.status("Reconnecting to the new host…");
            if (await this.session.dial())
                break;
        }
        this.electing = false;
    }
    stop() {
        clearInterval(this.ckTimer);
        this.session?.stop();
        this.session = null;
        this.role = "off";
    }
    stats() {
        const now = performance.now();
        const perGuest = [...this.slots].map(([L, slot]) => { const sec = Math.max(0.001, (now - L.stats.since) / 1000); return { slot, sentU: L.stats.sentU, sentR: L.stats.sentR, seconds: sec, bytesPerSec: (L.stats.sentU + L.stats.sentR) / sec, ping: L.ping }; });
        return { role: this.role, slot: this.mySlot, code: this.code, roster: this.roster, perGuest, checkpointTick: this.ckTick, checkpointBytes: this.ckpt?.length ?? 0, checkpointWire: this.ckZ, handovers: this.handovers, frames: this.port?.frames ?? 0, status: this.lastStatus };
    }
}
exports.Mp = Mp;
