"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.p1Sound = void 0;
// P1 sound pass: the glue between the page (main.ts) and the sound (audio.ts, sound-table.ts, music.ts). main.ts
// calls it from four one-line hooks (marked `// P1 hook`): install (once), event (each event, before main.ts's own
// handlers), frame (each frame, after the body sounds) and state (the debug hook). Nothing here changes what main.ts
// does; it adds the sounds the game did not make (call-downs, capture and hack, construction, transports, stance,
// low flight, weather and planet beds, other vehicles' engines, wreck fires, chirps per unit class, ...) and, for a
// few events, swaps main.ts's old placeholder sound for the right one (Sound.replaceNext, consumed in the same
// dispatch). It also adds the effects / music sliders and the "now playing" line to the pause menu, and runs music.
const s2_pod_ts_1 = require("./s2-pod.js");
const sound_table_ts_1 = require("./sound-table.js");
const music_ts_1 = require("./music.js");
// event kinds (sim/src/events.ts EV; kept as numbers so this module needs no sim import)
const K = { HIT: 1, REJECT: 2, ENTER: 3, CRITICAL: 9, QUEUE: 13, HIJACK: 15, POINT: 17, CORE: 18, DEPOSIT_EXHAUSTED: 19, HARVEST_DELIVERED: 20, ORDER_ACK: 21, BUILD_STARTED: 23, BUILD_DONE: 24, BUILD_ENDED: 25,
    CALL_QUEUED: 26, CALL_IMPACT: 27, CALL_EFFECT: 29, CHARGE: 35, FORTIFY: 50, FORWARD_BASE: 51, PASSENGER_LOST: 61, CARGO: 63, CARGO_LOST: 64, WEATHER: 70,
    PLAYER_JOINED: 80, PLAYER_LEFT: 81, UNIT_DIED: 82, JAMMER: 83, DECOY: 84, GROUP: 100, AUTO_DEFEND: 101 };
const P_SEATED = 0, P_FOOT = 1, P_DOWNED = 3;
const CE_SHELL = 0, CE_LINE = 1, CE_END = 3, CE_PICKUP = 5, CE_THROW = 6, CE_BOUNCE = 7, CE_STICK = 8, CE_FIRE = 9; // ruling 128: thrown beacon
const FE_DONE = 1, FB_DEPLOYING = 0, FB_PACKING = 3, FB_DEFENCES = 7, FB_FOLDING = 8;
const PASS_LOOP = { bus: "vehicles", ref: 300, layers: [{ src: "noise", ft: "bandpass", f: 700, q: 1.1, gain: 1 }, { src: "noise", ft: "bandpass", f: 2600, q: 2, gain: 0.3 }, { src: "sawtooth", f: 150, gain: 0.04 }] };
class P1Sound {
    ctx = null;
    music = null;
    stats = { events: 0, cues: {}, replaced: 0, vehicles: 0, flybys: 0, shieldBreaks: 0, stance: 0, lowFlight: 0, beaconTicks: 0, beaconThrows: 0, beaconClinks: 0, frames: 0, fbDefences: 0 };
    armour = new Map();
    callIds = [];
    beacons = new Map();
    charges = new Map();
    passes = [];
    fort = new Map();
    pending = [];
    lastPos = new Map();
    shieldPrev = new Map();
    siteProg = new Map();
    coreProg = new Map();
    capProg = -1;
    capPoint = -1;
    stance = -1;
    low = false;
    lowFor = 0;
    myShield = -1;
    revive = 0;
    downedAt = 0;
    lastShotSeq = -1;
    rate = new Map();
    combat = new music_ts_1.CombatDetector();
    nowMs = 0;
    install(c) {
        // a fresh state per page (the logic tests open several pages in one process; this module is loaded once)
        const fresh = new P1Sound(), self = this;
        for (const k of Object.keys(fresh))
            self[k] = fresh[k];
        this.ctx = c;
        try {
            const d = c.data;
            for (const u of d.units ?? [])
                this.armour.set(u.id, u.armourClass ?? "");
            this.callIds = (d.supportCalls?.calls ?? []).map((x) => x.id);
            // weapon families: main.ts's weaponClass array (used only for fire sounds) becomes the family per weapon
            c.cd.weaponIds.forEach((id, w) => { c.weaponClass[w] = (0, sound_table_ts_1.familyOf)(id, String(c.weaponClass[w])); });
            const pl = (d.planets ?? []).find((p) => p.id === c.planet);
            c.snd.setAir(pl?.atmosphere ?? sound_table_ts_1.PLANET_BEDS[c.planet]?.air ?? "normal");
            c.snd.impactSurface = (p) => this.surfaceAt(p);
        }
        catch { /* sound is optional */ }
        try {
            const L = globalThis.location ?? {};
            const served = (0, music_ts_1.isServedPage)(L);
            const G = globalThis;
            this.music = new music_ts_1.MusicPlayer({ served, fetchFn: G.fetch ? (u) => G.fetch(u) : null, makeAudio: G.Audio ? () => new G.Audio() : null });
        }
        catch {
            this.music = null;
        }
        this.settings();
    }
    // ---------------------------------------------------------------- helpers
    typeId(t) { return this.ctx.cd.typeIds[t] ?? ""; }
    entPos(e) {
        const c = this.ctx, air = c.cd.tAir[e.type] ? c.cd.constants.airAltitude + e.altitude : 0;
        return [e.x, c.height(e.x, e.z) + air + (c.cd.tRadius[e.type] ?? 1) * 0.5, e.z];
    }
    at(x, z, up = 1) { return [x, this.ctx.height(x, z) + up, z]; }
    ent(id) { return this.ctx.view()?.entities.get(id); }
    posOf(id) { const e = this.ent(id); return e ? this.entPos(e) : null; }
    cue(id, pos = null, level = 1, pitch = 1) {
        this.stats.cues[id] = (this.stats.cues[id] ?? 0) + 1;
        this.ctx.snd.cue(id, pos, level, pitch);
    }
    /** At most one per `ms` per key. */
    every(key, ms) { const t = this.rate.get(key) ?? -1e9; if (this.nowMs - t < ms)
        return false; this.rate.set(key, this.nowMs); return true; }
    later(ms, id, pos) { this.pending.push({ at: this.nowMs + ms, id, pos }); }
    swap(kind, cue, pos = null) { this.ctx.snd.replaceNext(kind, cue, pos, 1e9); this.stats.replaced++; }
    /** Hulls near the listener this frame (x, z, r, entity), built on the first impact of the frame. */
    hulls = { seq: -1, frame: -1, n: 0, a: new Float64Array(0), ents: [] };
    surfaceAt(p) {
        const c = this.ctx, v = c.view(), H = this.hulls;
        if (v && (H.seq !== v.seq || H.frame !== this.stats.frames)) {
            if (H.a.length < v.entities.size * 3)
                H.a = new Float64Array(v.entities.size * 3 + 48);
            H.n = 0;
            H.ents.length = 0;
            H.seq = v.seq;
            H.frame = this.stats.frames;
            const eye = c.eye();
            for (const e of v.entities.values()) {
                if (c.cd.tPilot[e.type] || Math.abs(e.x - eye[0]) > 1000 || Math.abs(e.z - eye[2]) > 1000)
                    continue;
                H.a[H.n * 3] = e.x;
                H.a[H.n * 3 + 1] = e.z;
                H.a[H.n * 3 + 2] = (c.cd.tRadius[e.type] ?? 2) + 0.8;
                H.ents[H.n++] = e;
            }
        }
        for (let i = 0; i < H.n; i++) {
            const dx = H.a[i * 3] - p[0], dz = H.a[i * 3 + 1] - p[2], r = H.a[i * 3 + 2];
            if (dx * dx + dz * dz < r * r && Math.abs(this.entPos(H.ents[i])[1] - p[1]) < r + 1)
                return "hull";
        }
        return (0, sound_table_ts_1.surfaceOf)(c.layerAt(p[0], p[2]), c.planet);
    }
    // ---------------------------------------------------------------- events (called before main.ts's handlers)
    event(e, _v, now) {
        const c = this.ctx;
        if (!c)
            return;
        this.nowMs = now;
        this.stats.events++;
        try {
            c.snd.clearReplace();
            const me = c.pilotId(), own = (id) => this.ent(id)?.team === 0;
            switch (e.kind) {
                case K.CRITICAL: {
                    const p = this.posOf(e.a);
                    if (p)
                        this.cue("critical", p);
                    break;
                }
                case K.QUEUE:
                    if ((e.flags & 1) && own(e.a) && this.every("queue", 800))
                        this.cue("queued");
                    break;
                case K.HIJACK:
                    if (e.a === me) {
                        if (e.d === 0)
                            this.swap("ui:click", "hack-start");
                        else if (e.d === 1)
                            this.swap("ui:error", "hack-stop");
                    }
                    break;
                case K.POINT: {
                    const pp = c.pointPos(e.a), p = pp ? this.at(pp[0], pp[1], 2) : null;
                    if (e.b === 0)
                        this.cue("capture-start", p);
                    else if (e.b === 1)
                        this.cue("contested", p);
                    else if (e.b === 2) {
                        this.swap("produced", e.c === 0 ? "capture-done" : "capture-lost");
                        this.swap("under-attack", e.c === 0 ? "capture-done" : "capture-lost");
                    }
                    else if (e.b === 3 && e.c === 0)
                        this.cue("supply-lost");
                    else if (e.b === 4 && e.c === 0)
                        this.cue("supply-restored");
                    else if (e.b === 5)
                        this.cue("hack-start", p);
                    else if (e.b === 6)
                        this.cue("hack-stop", p);
                    break;
                }
                case K.CORE: {
                    const core = c.view()?.points?.cores?.find((x) => x.id === e.a), p = core ? this.at(core.x, core.z, 3) : this.posOf(e.a);
                    this.cue(["hack-start", "hack-stop", "hack-done", "core-restored"][e.b] ?? "hack-stop", e.b >= 2 ? null : p);
                    break;
                }
                case K.DEPOSIT_EXHAUSTED:
                    this.cue("deposit-dry");
                    break;
                case K.HARVEST_DELIVERED: {
                    const p = this.posOf(e.a);
                    if (p && own(e.a) && this.every("deliver", 2000))
                        this.cue("delivered", p);
                    break;
                }
                case K.ORDER_ACK: {
                    const x = this.ent(e.a);
                    if (x)
                        c.snd.nextChirp = { cls: (0, sound_table_ts_1.voiceOf)(this.typeId(x.type), this.armour.get(this.typeId(x.type))), order: e.b };
                    break;
                }
                case K.BUILD_STARTED: {
                    const s = c.view()?.construction?.sites.find((x) => x.id === e.a);
                    const pp = c.pointPos(e.c);
                    this.cue("build-start", s ? this.at(s.x, s.z) : pp ? this.at(pp[0], pp[1]) : null);
                    break;
                }
                case K.BUILD_DONE: {
                    const p = this.posOf(e.d);
                    this.swap("produced", "build-done", p);
                    break;
                }
                case K.BUILD_ENDED: {
                    const s = c.view()?.construction?.sites.find((x) => x.id === e.a), p = s ? this.at(s.x, s.z) : null;
                    this.cue(e.d === 1 ? "collapse" : "build-cancel", p);
                    break;
                }
                case K.CALL_QUEUED: {
                    const id = this.callIds[e.c] ?? "", p = this.at(e.v1, e.v2, 1);
                    this.beacons.set(e.a, { call: id, x: e.v1, z: e.v2, lastSec: 99, incoming: false });
                    this.cue((sound_table_ts_1.CALL_SOUNDS[id]?.queued) ?? "beacon", p);
                    if (e.b === me)
                        this.cue("call-radio");
                    break;
                }
                case K.CALL_IMPACT: {
                    const id = this.callIds[e.c] ?? "", S = sound_table_ts_1.CALL_SOUNDS[id], p = this.at(e.v1, e.v2, 1);
                    this.beacons.delete(e.a);
                    if (!S)
                        break;
                    if (S.impact === "pod-land")
                        this.swap("landing", "pod-land", p);
                    else if (S.impact === "sentry-deploy") {
                        this.swap("landing", "pod-land", p);
                        this.cue("pod-thud", p);
                        this.later(250, "sentry-deploy", p);
                        this.later(900, "sentry-deploy", p);
                    } // ruling 130: thud, then the hatch servos and the head rising
                    else if (S.impact === "callImpact" || S.impact === "sweep" || S.impact === "jet-pass") { /* main.ts plays the boom / the ping; the pass is a CALL_EFFECT */ }
                    else if (S.impact === "shell-whistle") {
                        for (let i = 0; i < 3; i++)
                            this.later(i * 450, "shell-whistle", this.at(e.v1 + (Math.random() - 0.5) * 80, e.v2 + (Math.random() - 0.5) * 80, 30));
                    }
                    else
                        this.cue(S.impact, p);
                    break;
                }
                case K.CALL_EFFECT: {
                    const sub = e.flags & 15;
                    if (sub === CE_SHELL) {
                        if (Math.random() < 0.5)
                            this.cue("shell-whistle", this.at(e.v1 + (Math.random() - 0.5) * 60, e.v2 + (Math.random() - 0.5) * 60, 30));
                    }
                    else if (sub === CE_LINE) {
                        const b = this.beacons.get(e.a) ?? this.lastBeacon(e.a) ?? { x: e.v1, z: e.v2 };
                        this.swap("aircraft-down", null);
                        this.passes.push({ id: e.a, x0: b.x, z0: b.z, x1: e.v1, z1: e.v2, start: now, n: Math.max(1, Math.min(40, e.d)), bomb: this.callIds[e.c] === "bomb-run", done: 0 });
                    }
                    else if (sub === CE_END && this.callIds[e.c] === "shield-bubble")
                        this.cue("dome-down", this.at(e.v1, e.v2, 2));
                    else if (sub === CE_PICKUP)
                        this.cue("resupply", this.at(e.v1, e.v2, 1));
                    else if (sub === CE_THROW) {
                        this.cue("beacon-throw", this.at(e.v1, e.v2, 1.5));
                        this.stats.beaconThrows++;
                    } // ruling 128
                    else if (sub === CE_BOUNCE) {
                        const t = c.view()?.calls?.thrown?.find((x) => x.id === e.a);
                        this.cue("beacon-clink", t ? [t.x, t.y, t.z] : this.at(e.v1, e.v2, 0.2), 1, e.d > 1 ? 1.15 : 1);
                        this.stats.beaconClinks++;
                    }
                    else if (sub === CE_FIRE) {
                        this.cue("beacon-launch", this.at(e.v1, e.v2, 2.5));
                        this.stats.beaconThrows++;
                    } // ruling 129: fired from a vehicle
                    else if (sub === CE_STICK)
                        this.cue("beacon-stick", this.at(e.v1, e.v2, 1));
                    break;
                }
                case K.CHARGE: {
                    if (e.flags & 1) {
                        const t = this.ent(e.c);
                        if (t)
                            this.charges.set(e.a, { x: t.x, z: t.z, start: now, fuse: c.fuseS() * 1000 });
                    }
                    else
                        this.charges.delete(e.a);
                    break;
                }
                case K.FORTIFY: {
                    const pp = c.pointPos(e.a);
                    if (e.b === FE_DONE)
                        this.cue("fortify-done", pp ? this.at(pp[0], pp[1]) : null);
                    if (e.b === 0)
                        this.fort.set(e.a, { until: now + e.v1 * 1000 });
                    else
                        this.fort.delete(e.a);
                    break;
                }
                case K.FORWARD_BASE: {
                    const p = this.posOf(e.a);
                    if (e.b === FB_DEPLOYING || e.b === FB_PACKING)
                        this.cue("deploy", p);
                    else if (e.b === FB_DEFENCES || e.b === FB_FOLDING) { // ruling 132: the base's defences unfold / fold: servo whine, clunks as each piece locks
                        this.cue("fb-unfold", p);
                        this.later(1400, "sentry-deploy", p);
                        this.later(2900, "sentry-deploy", p);
                        this.stats.fbDefences++;
                    }
                    break;
                }
                case K.PASSENGER_LOST:
                case K.CARGO_LOST:
                    this.cue("passenger-lost");
                    break;
                case K.CARGO: {
                    const p = this.posOf(e.a);
                    if (!this.every(`cargo:${e.a}:${e.flags}`, 600))
                        break;
                    this.cue(e.flags & 1 ? "cargo-in" : e.flags & 2 ? "cargo-out" : e.flags & 4 ? "sling-hook" : "sling-drop", p);
                    break;
                }
                case K.WEATHER:
                    if (e.b === 0)
                        this.cue("forecast");
                    else if (e.b === 1)
                        this.swap("threat", "weather-start");
                    else if (e.b === 2)
                        this.cue("weather-end");
                    break;
                case K.PLAYER_JOINED: {
                    this.swap("ui:click", "join");
                    if (e.c && e.d > 0) {
                        const p = this.at(e.v1, e.v2, 2), ms = e.d * c.dt * 1000;
                        this.later(Math.max(0, ms - 1500), "pod-whistle", p);
                    }
                    break;
                }
                case K.PLAYER_LEFT:
                    this.cue("leave");
                    break;
                case K.UNIT_DIED:
                    if (c.cd.tStructure[e.b])
                        this.later(250, "collapse", this.at(e.v1, e.v2, 3));
                    break;
                case K.JAMMER:
                    this.cue(e.b ? "jammer-on" : "jammer-off", this.at(e.v1, e.v2, 3));
                    break;
                case K.DECOY:
                    this.cue(e.d === 1 ? "decoy-drop" : "decoy-end", this.at(e.v1, e.v2, 1));
                    break;
                case K.GROUP:
                    if ((e.b === 3 || e.b === 4) && this.every("group", 500))
                        this.cue("group");
                    break;
                case K.AUTO_DEFEND:
                    if (this.every("autodef", 4000))
                        this.cue("auto-defend");
                    break;
            }
        }
        catch { /* sound never breaks the event path */ }
    }
    lastBeacon(id) {
        const b = this.ctx.view()?.calls?.beacons.find((x) => x.id === id);
        return b ? { x: b.x, z: b.z } : null;
    }
    // ---------------------------------------------------------------- frame
    frame(now, frameDt) {
        const c = this.ctx;
        if (!c)
            return;
        this.nowMs = now;
        this.stats.frames++;
        const snd = c.snd;
        try {
            snd.clearReplace();
            snd.nextChirp = null;
            const started = c.started(), over = c.over(), v = c.view(), me = c.me(), eye = c.eye();
            // music (no audio context needed: the player streams elements)
            if (this.music) {
                if (this.music.status === "idle")
                    void this.music.load(); // Frontline: the menu track plays on the start screen too
                this.music.planet = c.planet;
                const combat = this.combat.update(snd.nearFireCount(8000, now), now / 1000);
                const won = v?.match?.over ? v.match.winner === 0 : null;
                this.music.update((0, music_ts_1.musicState)({ started, over: over || !!v?.match?.over, won, combat, cinematic: !!c.cinematic?.() }), frameDt, snd.musicLevel());
                this.nowPlayingLine();
            }
            if (!snd.available || !started || !v)
                return;
            const body = me && me.state !== 2 ? v.entities.get(me.entity) : undefined;
            const foot = !!me && me.state === P_FOOT && c.mode() === "fp";
            const seated = !!me && me.state === P_SEATED;
            // pending (delayed) cues
            if (this.pending.length) {
                const due = this.pending.filter((p) => now >= p.at);
                this.pending = this.pending.filter((p) => now < p.at);
                for (const p of due)
                    this.cue(p.id, p.pos);
            }
            // footing, stance, space
            const lay = c.layerAt(eye[0], eye[2]);
            snd.surface = (0, sound_table_ts_1.surfaceOf)(body ? c.layerAt(body.x, body.z) : lay, c.planet);
            const st = body && foot ? (body.prone ? 2 : body.crouched ? 1 : 0) : -1;
            if (st >= 0 && this.stance >= 0 && st !== this.stance) {
                this.cue(st === 2 ? "stance-prone" : st > this.stance ? "stance-down" : "stance-up");
                this.stats.stance++;
            }
            this.stance = st;
            snd.stance = Math.max(0, st);
            const ownType = seated && body ? this.typeId(body.type) : "";
            const ownCls = seated && body ? (0, sound_table_ts_1.engineOf)(ownType, this.armour.get(ownType)) : "none";
            snd.engineClass = ownCls === "none" ? "tank" : ownCls;
            snd.setSpace((0, sound_table_ts_1.spaceOf)(lay, seated && c.mode() === "fp" && ownCls !== "bike" && ownCls !== "none" && !!me && me.seat > 0));
            // low flight: the own aircraft well below its normal altitude, held 1 s
            if (seated && body && c.cd.tAir[body.type]) {
                const isLow = body.altitude < -(c.cd.constants.airAltitude * 0.6);
                this.lowFor = isLow === this.low ? 0 : this.lowFor + frameDt;
                if (this.lowFor > 1) {
                    this.low = isLow;
                    this.lowFor = 0;
                    this.cue(isLow ? "lowflight-on" : "lowflight-off");
                    this.stats.lowFlight++;
                }
            }
            else {
                this.low = false;
                this.lowFor = 0;
            }
            // own shield break (the player's pilot or vehicle)
            const sh = me ? me.shield : -1;
            if (this.myShield > 0.03 && sh >= 0 && sh <= 0.001) {
                this.cue("shield-break");
                this.stats.shieldBreaks++;
            }
            this.myShield = sh;
            // other vehicles' engines (nearest 4 moving within 180 m; aircraft 320 m), shield breaks nearby
            const near = [];
            const t = now / 1000;
            let breaks = 0;
            for (const e of v.entities.values()) {
                if (c.cd.tPilot[e.type] || c.cd.tStructure[e.type])
                    continue;
                const dx = e.x - eye[0], dz = e.z - eye[2], d2 = dx * dx + dz * dz;
                if (d2 > 320 * 320) {
                    this.lastPos.delete(e.id);
                    this.shieldPrev.delete(e.id);
                    continue;
                }
                const lp = this.lastPos.get(e.id);
                let sp = lp ? lp.sp : 0;
                if (lp && t - lp.t > 0.05) {
                    sp = lp.sp * 0.6 + 0.4 * Math.hypot(e.x - lp.x, e.z - lp.z) / (t - lp.t);
                    this.lastPos.set(e.id, { x: e.x, z: e.z, t, sp });
                }
                else if (!lp)
                    this.lastPos.set(e.id, { x: e.x, z: e.z, t, sp: 0 });
                const prevSh = this.shieldPrev.get(e.id);
                if (prevSh !== undefined && prevSh > 0.03 && e.shield <= 0.001 && d2 < 150 * 150 && breaks < 2) {
                    this.cue("shield-break", this.entPos(e));
                    breaks++;
                    this.stats.shieldBreaks++;
                }
                this.shieldPrev.set(e.id, e.shield);
                if (body && e.id === body.id)
                    continue;
                const id = this.typeId(e.type), cls = (0, sound_table_ts_1.engineOf)(id, this.armour.get(id));
                if (cls === "none")
                    continue;
                const reach = cls === "aircraft" ? 320 : 180;
                if (d2 > reach * reach || sp < 0.8)
                    continue;
                near.push({ e, d: Math.sqrt(d2), cls, sf: Math.min(1, sp / (c.cd.tSpeed[e.type] || 20)) });
            }
            near.sort((a, b) => a.d - b.d);
            const keep = new Set();
            for (const n of near.slice(0, 4)) {
                snd.vehicle(n.e.id, n.cls, n.sf, this.entPos(n.e));
                keep.add(`veh:${n.e.id}`);
            }
            snd.fadeLoops("veh:", keep);
            this.stats.vehicles = keep.size;
            // wreck fires: none (ruling 106: no wrecks; burnt hulls are visual only and silent)
            const wk = new Set();
            snd.fadeLoops("wreck:", wk);
            // call zones: shield dome hum, smoke hiss (nearest 2 within 200 m)
            const zk = new Set();
            if (v.calls) {
                const zs = v.calls.zones.map((z) => ({ z, d: Math.hypot(z.x - eye[0], z.z - eye[2]), loop: sound_table_ts_1.CALL_SOUNDS[this.callIds[z.call] ?? ""]?.zone })).filter((x) => x.loop && x.d < 200).sort((a, b) => a.d - b.d).slice(0, 2);
                for (const { z, loop } of zs) {
                    snd.loop(`zone:${z.beacon}`, sound_table_ts_1.LOOPS[loop], 1, 1, this.at(z.x, z.z, 3), 2);
                    zk.add(`zone:${z.beacon}`);
                }
                // beacon countdowns: ticks the last 5 s, the incoming whistle / whine before impact
                for (const b of v.calls.beacons) {
                    const secs = b.ticksToImpact * c.dt, rec = this.beacons.get(b.id) ?? { call: this.callIds[b.call] ?? "", x: b.x, z: b.z, lastSec: 99, incoming: false };
                    this.beacons.set(b.id, rec);
                    const ownCall = b.caller === c.pilotId(), d = Math.hypot(b.x - eye[0], b.z - eye[2]);
                    if (ownCall || d < 400) {
                        const s = Math.ceil(secs);
                        if (s <= 5 && s >= 1 && s < rec.lastSec) {
                            this.cue(s === 1 ? "beacon-last" : "beacon-tick", this.at(b.x, b.z, 1));
                            this.stats.beaconTicks++;
                        }
                        else if (b.thrown && s > 5 && s < rec.lastSec && d < 150) {
                            this.cue("beacon-ping", b.y !== null && b.y !== undefined ? [b.x, b.y + 0.2, b.z] : this.at(b.x, b.z, 0.2));
                            this.stats.beaconTicks++;
                        } // ruling 128: a thrown beacon ticks while it sits there
                        rec.lastSec = Math.min(rec.lastSec, s);
                    }
                    const inc = sound_table_ts_1.CALL_SOUNDS[rec.call]?.incoming, lead = inc === "pod-whistle" || inc === "pod-reentry" ? 2.5 : 1.4;
                    if (inc && !rec.incoming && secs <= lead) {
                        rec.incoming = true;
                        this.cue(inc, this.at(b.x, b.z, inc === "pod-whistle" ? 120 : inc === "pod-reentry" ? 160 : 40));
                    }
                    if (inc === "pod-reentry" && !rec.retro && secs <= s2_pod_ts_1.POD_RETRO_S) {
                        rec.retro = true;
                        this.cue("pod-retro", this.at(b.x, b.z, 12));
                    } // ruling 130: the retro burn
                }
                if (this.beacons.size > 64)
                    this.beacons.clear();
            }
            snd.fadeLoops("zone:", zk);
            // aircraft passes (strafing / bomb runs): the aircraft flies the line (as main.ts draws it), Doppler, rounds raking the line
            const pk = new Set();
            this.passes = this.passes.filter((p) => now - p.start < 2200);
            for (const p of this.passes) {
                const L = Math.hypot(p.x1 - p.x0, p.z1 - p.z0) || 1, ux = (p.x1 - p.x0) / L, uz = (p.z1 - p.z0) / L;
                const f = Math.min(1, (now - p.start) / 1800), along = -120 + f * (L + 240);
                const ax = p.x0 + ux * along, az = p.z0 + uz * along;
                snd.loop(`pass:${p.id}`, PASS_LOOP, f < 1 ? 0.9 : 0, 1, [ax, c.height(ax, az) + (p.bomb ? 70 : 45), az], 4);
                pk.add(`pass:${p.id}`);
                while (!p.bomb && p.done < p.n && along >= (p.done / Math.max(1, p.n - 1)) * L) {
                    const tt = p.n > 1 ? p.done / (p.n - 1) : 0;
                    if (p.done % 2 === 0)
                        this.cue("strafe-hit", this.at(p.x0 + (p.x1 - p.x0) * tt, p.z0 + (p.z1 - p.z0) * tt, 0.5));
                    p.done++;
                }
            }
            snd.fadeLoops("pass:", pk);
            // construction sites and fortify jobs: clatter near the player (nearest one within 120 m that is progressing)
            let build = null, bd = 120;
            for (const s of v.construction?.sites ?? []) {
                const prev = this.siteProg.get(s.id) ?? s.progress;
                this.siteProg.set(s.id, s.progress);
                const d = Math.hypot(s.x - eye[0], s.z - eye[2]);
                if (s.progress > prev && s.progress < 1 && d < bd) {
                    bd = d;
                    build = this.at(s.x, s.z);
                }
            }
            if (this.siteProg.size > 200)
                this.siteProg.clear();
            for (const [pt, j] of this.fort) {
                if (now > j.until) {
                    this.fort.delete(pt);
                    continue;
                }
                const pp = c.pointPos(pt);
                if (pp) {
                    const d = Math.hypot(pp[0] - eye[0], pp[1] - eye[2]);
                    if (d < bd) {
                        bd = d;
                        build = this.at(pp[0], pp[1]);
                    }
                }
            }
            snd.loop("construct", sound_table_ts_1.LOOPS.construct, build ? 1 : 0, 1, build);
            // capture progress: the player inside a ring while it moves (a hum rising with progress, a tick each tenth)
            let capLevel = 0, capPitch = 1;
            if (body && v.points) {
                for (const pt of v.points.points) {
                    const pp = c.pointPos(pt.index);
                    if (!pp || Math.hypot(pp[0] - body.x, pp[1] - body.z) > c.ringR)
                        continue;
                    if (pt.index === this.capPoint && pt.captureProgress !== this.capProg && pt.captureProgress > 0 && pt.captureProgress < 1) {
                        capLevel = 1;
                        capPitch = 1 + pt.captureProgress;
                        if (Math.floor(pt.captureProgress * 10) !== Math.floor(this.capProg * 10))
                            this.cue("capture-tick", null, 1, 1 + pt.captureProgress * 0.5);
                    }
                    this.capPoint = pt.index;
                    this.capProg = pt.captureProgress;
                    break;
                }
            }
            snd.loop("capture", sound_table_ts_1.LOOPS.capture, capLevel, capPitch, null, 5);
            // hacking: a Core being hacked within 150 m, or the player's own hijack
            let hackAt = null, hackLvl = 0, hackPitch = 1;
            for (const core of v.points?.cores ?? []) {
                const prev = this.coreProg.get(core.id) ?? core.hackProgress;
                this.coreProg.set(core.id, core.hackProgress);
                if (core.hackProgress > 0 && core.hackProgress !== prev && Math.hypot(core.x - eye[0], core.z - eye[2]) < 150) {
                    hackAt = this.at(core.x, core.z, 3);
                    hackLvl = 1;
                    hackPitch = 1 + core.hackProgress;
                }
            }
            if (me && me.hijackProgress > 0) {
                hackAt = null;
                hackLvl = 1;
                hackPitch = 1 + me.hijackProgress;
            }
            snd.loop("hack", sound_table_ts_1.LOOPS.hack, hackLvl, hackPitch, hackAt, 5);
            // downed: a heartbeat that slows; revive progress ticks; cloak hum; demo charge fuses
            if (me && me.state === P_DOWNED) {
                if (!this.downedAt)
                    this.downedAt = now;
            }
            else
                this.downedAt = 0;
            snd.loop("heartbeat", sound_table_ts_1.LOOPS.heartbeat, this.downedAt ? 1 : 0, this.downedAt ? Math.max(0.55, 1.15 - (now - this.downedAt) / 40000) : 1, null, 6);
            const rp = me?.kit?.reviveProgress ?? 0;
            if (rp > 0 && Math.floor(rp * 10) > Math.floor(this.revive * 10))
                this.cue("revive-tick", null, 1, 1 + rp * 0.6);
            this.revive = rp;
            snd.loop("cloak", sound_table_ts_1.LOOPS["cloak-hum"], foot && me?.kit?.cloak === 1 ? 1 : 0, 1, null, 5);
            const fk = new Set();
            for (const [id, ch] of this.charges) {
                const k = (now - ch.start) / Math.max(500, ch.fuse);
                if (k > 1.3) {
                    this.charges.delete(id);
                    continue;
                }
                snd.loop(`fuse:${id}`, sound_table_ts_1.LOOPS.fuse, 1, 1 + k * 3, this.at(ch.x, ch.z, 1), 6);
                fk.add(`fuse:${id}`);
            }
            snd.fadeLoops("fuse:", fk);
            // supersonic rounds passing the listener (near misses from others' guns)
            if (v.seq !== this.lastShotSeq) {
                this.lastShotSeq = v.seq;
                let n = 0;
                for (const s of v.shots ?? []) {
                    if (n >= 2)
                        break;
                    if (body && s.shooter === body.id)
                        continue;
                    const q = closest(s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, eye);
                    if (q.d < 6 && Math.hypot(s.x0 - eye[0], s.z0 - eye[2]) > 30 && q.t > 0.05 && q.t < 0.98) {
                        snd.flyby(q.p, (c.cd.weaponIds[s.weapon] ?? "").includes("rifle") || (c.cd.weaponIds[s.weapon] ?? "").includes("cannon"));
                        n++;
                        this.stats.flybys++;
                    }
                }
            }
            // weather and planet beds; the mix
            const bed = snd.beds(c.weather(), c.planet, c.weatherK(), !over, frameDt);
            snd.mixFrame(bed.duck);
        }
        catch { /* never let sound break a frame */ }
    }
    // ---------------------------------------------------------------- pause menu: effects and music sliders, now playing
    nowEl = null;
    /**
     * The mix sliders (designer 19 Nov: "three volume sliders, ambient noise, sound effects, music"), under the master
     * volume in the pause menu and on the start screen; the two copies stay in step.
     */
    settings() {
        try {
            const D = globalThis.document;
            if (!D)
                return;
            const snd = this.ctx.snd;
            const rows = [
                { key: "ambient", label: "Ambient", get: () => snd.ambient, set: (v) => snd.setAmbient(v) },
                { key: "fx", label: "Sound effects", get: () => snd.effects, set: (v) => snd.setEffects(v) },
                { key: "music", label: "Music", get: () => snd.music, set: (v) => snd.setMusic(v) },
            ];
            const inputs = new Map();
            const place = (cardSel, suffix, withNow) => {
                const card = D.querySelector(cardSel);
                if (!card)
                    return;
                const box = D.createElement("div");
                box.id = `p1Mix${suffix}`;
                box.className = "p1Mix";
                box.innerHTML = rows.map((r) => `<div class="audioRow"><span class="label">${r.label}</span><input id="p1${r.key}${suffix}" type="range" min="0" max="100" value="${Math.round(r.get() * 100)}"></div>`).join("")
                    + (withNow ? `<div class="note2" id="p1Now">Music: off</div>` : "");
                const vol = card.querySelector(`#vol${suffix}`)?.closest(".audioRow");
                if (vol && vol.parentNode && typeof vol.parentNode.insertBefore === "function")
                    vol.parentNode.insertBefore(box, vol.nextSibling);
                else
                    card.appendChild(box);
                for (const r of rows) {
                    const el = D.getElementById(`p1${r.key}${suffix}`);
                    if (!el)
                        continue;
                    inputs.set(`${r.key}${suffix}`, el);
                    el.addEventListener("input", () => {
                        const v = Number(el.value) / 100;
                        r.set(v);
                        for (const [k, other] of inputs)
                            if (k.startsWith(r.key) && other !== el)
                                other.value = el.value; // keep the other copy in step
                    });
                }
            };
            place("#pause .card", "Pause", true);
            place("#start .card", "Start", false);
            this.nowEl = D.getElementById("p1Now");
        }
        catch { /* the sliders are optional */ }
    }
    nowPlayingLine() {
        if (!this.nowEl || !this.music)
            return;
        const t = this.music.nowPlaying();
        if (this.nowEl.textContent !== t)
            this.nowEl.textContent = t;
    }
    /** Debug hook / tests. */
    state() {
        const s = this.ctx?.snd;
        return { ...this.stats, cues: { ...this.stats.cues }, mixer: s?.mixer() ?? null, music: this.music?.info() ?? null, nowPlaying: this.music?.nowPlaying() ?? "", stingCounts: { ...(s?.stingCounts ?? {}) }, cueCounts: { ...(s?.cueCounts ?? {}) }, lastChirp: s?.lastChirp ?? null, lastFamily: s?.lastFamily ?? "", jetNodes: s?.jetNodes.slice() ?? [] };
    }
}
/** Closest point of the segment a -> b to p: distance, parameter, point. */
function closest(x0, y0, z0, x1, y1, z1, p) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L2 = dx * dx + dy * dy + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - x0) * dx + (p[1] - y0) * dy + (p[2] - z0) * dz) / L2));
    const q = [x0 + dx * t, y0 + dy * t, z0 + dz * t];
    return { d: Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), t, p: q };
}
exports.p1Sound = new P1Sound();
