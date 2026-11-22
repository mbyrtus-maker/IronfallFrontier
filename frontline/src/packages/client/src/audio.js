"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sound = void 0;
// Synthesised sound (client slice 2; P1 sound pass): Web Audio API only, no files. Every sound is built from
// oscillators and generated noise buffers. The context is created on the start click (a user gesture) and never
// before; if the browser has no Web Audio, or anything here throws, the game carries on silently (every entry point is
// a no-op without a context).
//
// P1 sound pass (designer: "a little robotic but works"):
//  * Mixer: buses weapons / explosions / vehicles / ambience / ui / music. The world buses go through the command-view
//    muffle filter; all effect buses through the effects gain (slider), then a glue compressor, the master gain
//    (slider, mute) and a brick-wall limiter, so a 300-unit battle does not clip. A crowded weapons bus is ducked.
//  * Voices: a hard cap with priority (importance over distance; own sounds, hits on the player, stingers and near
//    explosions are critical and never dropped) and a share cap per bus; a voice is checked against the cap BEFORE
//    any node is made (before this pass a dropped voice still built its output chain). Each voice plays through a
//    pooled channel strip (gain, distance low-pass, pan, reverb send) that is reused, never rebuilt; the sources of
//    a stolen voice are stopped at once. Far voices drop their smallest layers (level of detail).
//  * Distance model (sound-table.ts distanceModel): level and low-pass with range, a ground slap-back and more reverb
//    far away, and for heavy and supersonic guns the crack heard before the thump (the gap grows with range). The
//    planet's atmosphere scales it (Pale, airless: almost nothing carries; Brume / Cinder: the lows carry).
//  * Reverb without a convolver: four damped feedback combs (two left, two right); open ground is long and sparse,
//    indoors (caves) short and dense, a vehicle cabin very short.
//  * Weapons by family (16; sound-table.ts FAMILIES), layered transient + body + thump + tail + mechanical action +
//    crack / motor whoosh / zap, with per-shot variation of pitch, level, filter and timing.
//  * Cues (sound-table.ts CUES): stingers, call-downs, capture, construction, pilot kit, transports, UI, chirps.
//  * Loops: engines per vehicle class (own and the nearest others, Doppler from the range rate), weather and planet
//    beds, call zones, heartbeat, fuse; capped and released when silent.
const sound_table_ts_1 = require("./sound-table.js");
/** Bus levels (trim before the effects gain). */
const BUS_TRIM = { weapons: 0.9, explosions: 1, vehicles: 0.85, ambience: 0.8, ui: 0.9, music: 1 };
/** Share of the ordinary voice cap each bus may hold. */
const BUS_SHARE = { weapons: 24, explosions: 14, vehicles: 10, ambience: 6, ui: 10, music: 0 };
const SPACES = {
    open: { d: [0.131, 0.173, 0.211, 0.263], fb: 0.32, damp: 2200, ret: 0.32 },
    indoor: { d: [0.0231, 0.0293, 0.0371, 0.0413], fb: 0.7, damp: 4500, ret: 0.4 },
    cabin: { d: [0.0097, 0.0127, 0.0163, 0.0187], fb: 0.45, damp: 3000, ret: 0.18 },
};
const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** Weather bed loops (made once). */
const BED_DEFS = {
    wind: { bus: "ambience", ref: 100, layers: [{ src: "noise", ft: "bandpass", f: 420, q: 0.9, gain: 1, lfo: 0.21, lfoDepth: 0.7 }, { src: "noise", ft: "bandpass", f: 1500, q: 2, gain: 0.25, lfo: 0.33, lfoDepth: 0.8 }] },
    rain: { bus: "ambience", ref: 100, layers: [{ src: "noise", ft: "highpass", f: 3500, gain: 0.7 }, { src: "noise", ft: "bandpass", f: 1100, q: 1.2, gain: 0.35, lfo: 0.5, lfoDepth: 0.3 }] },
    rumble: { bus: "ambience", ref: 100, layers: [{ src: "noise", ft: "lowpass", f: 110, gain: 1, lfo: 0.07, lfoDepth: 0.7 }] },
    ash: { bus: "ambience", ref: 100, layers: [{ src: "noise", ft: "bandpass", f: 2600, q: 1.2, gain: 0.6, lfo: 1.9, lfoDepth: 0.5 }], pulse: { every: 0.25, cue: "fire-crackle", jitter: 0.9 } },
    staticNoise: { bus: "ambience", ref: 100, layers: [{ src: "noise", ft: "bandpass", f: 5200, q: 2, gain: 0.5, lfo: 6.3, lfoDepth: 0.8 }, { src: "square", f: 50, gain: 0.03 }] },
    still: { bus: "ambience", ref: 100, layers: [{ src: "sine", f: 62, gain: 0.6, lfo: 0.05, lfoDepth: 0.5 }] },
};
class Sound {
    ctx = null;
    available = false;
    /** 0..1 master, effects and music volumes and mute; persisted in localStorage when it is available. */
    volume = 0.7;
    effects = 1;
    music = 0.6;
    /** 0..1 ambient level (weather and planet beds, the ambience bus): its own slider, apart from the effects (designer 19 Nov). */
    ambient = 1;
    muted = false;
    /** Cap on simultaneous ordinary one-shot voices; critical voices are never refused below HARD_CAP. */
    maxVoices = 40;
    static HARD_CAP = 96;
    /** Persistent loops at once (engines, beds, fires, zones); the quietest beyond it is released. */
    static MAX_LOOPS = 16;
    /** dropped: refused at the cap; stolen: live voices cut short for a more important one; critical: never-dropped voices played. */
    counters = { created: 0, dropped: 0, stolen: 0, critical: 0, droppedCritical: 0, byKind: {}, droppedByKind: {}, nodes: 0, strips: 0, loops: 0, loopsReleased: 0, lod: 0 };
    master = null;
    fxGain = null;
    glue = null;
    limiter = null;
    busFilter = null; // world sounds muffled in the command view
    ambFilter = null; // the same for the ambience bus, which has its own level (ambGain) instead of the effects gain
    ambGain = null;
    buses = {};
    reverbIn = null;
    combs = [];
    reverbOut = null;
    noise = null;
    voices = []; // live one-shot voices
    strips = [];
    cur = null; // the voice whose sources are being made
    eye = [0, 0, 0];
    right = [1, 0, 0];
    air = sound_table_ts_1.AIR.normal;
    space = "open";
    engine = null;
    engineClass = "tank";
    loops = new Map();
    lastAlarm = 0;
    jet = null;
    /** Sources the jetpack voice is made of (tests: the whoosh only, no tone or hum layer); jetNodes: the node factories it used. */
    jetLayers = [];
    jetNodes = [];
    torchV = null;
    /** Footing (set each frame by p1-sound.ts): surface id (SURFACES) and stance 0 stand, 1 crouch, 2 prone. */
    surface = "dirt";
    stance = 0;
    /** Replacements for the next sting / ui / blip of a kind (p1-sound.ts sets them just before main.ts plays the old sound). */
    replace = new Map();
    /** The next blip's voice (ORDER_ACK: unit class and order kind). */
    nextChirp = null;
    /** Ground under an impact (set by p1-sound.ts): "hull" (a vehicle there), a SURFACES id, or null. */
    impactSurface = null;
    /** Times (ms, performance clock) of weapon fire and explosions near the listener (music: combat by nearby fire). */
    nearFire = [];
    /** Cues played, by id (tests); C6 stingers by kind. */
    cueCounts = {};
    stingCounts = {};
    constructor() {
        try {
            const v = localStorage.getItem("ironfall.volume"), m = localStorage.getItem("ironfall.muted"), e = localStorage.getItem("ironfall.effects"), mu = localStorage.getItem("ironfall.music"), am = localStorage.getItem("ironfall.ambient");
            if (am !== null && isFinite(Number(am)))
                this.ambient = clamp01(Number(am));
            if (v !== null && isFinite(Number(v)))
                this.volume = clamp01(Number(v));
            if (e !== null && isFinite(Number(e)))
                this.effects = clamp01(Number(e));
            if (mu !== null && isFinite(Number(mu)))
                this.music = clamp01(Number(mu));
            if (m !== null)
                this.muted = m === "1";
        }
        catch { /* no storage (sandboxed page): defaults */ }
    }
    /** Creates and resumes the context. Call from a user gesture (the start click). Never throws. */
    start() {
        if (this.ctx) {
            this.ctx.resume?.().catch(() => { });
            return;
        }
        try {
            const W = globalThis;
            const Ctor = W.AudioContext ?? W.webkitAudioContext;
            if (!Ctor)
                return;
            const ctx = new Ctor();
            this.ctx = ctx;
            // master chain: effects gain -> glue compressor -> master gain -> limiter -> out
            const lim = ctx.createDynamicsCompressor();
            lim.threshold.value = -3;
            lim.knee.value = 0;
            lim.ratio.value = 20;
            lim.attack.value = 0.001;
            lim.release.value = 0.12;
            this.limiter = lim;
            lim.connect(ctx.destination);
            this.master = ctx.createGain();
            this.master.gain.value = this.muted ? 0 : this.volume;
            this.master.connect(lim);
            const glue = ctx.createDynamicsCompressor();
            glue.threshold.value = -18;
            glue.knee.value = 10;
            glue.ratio.value = 3;
            glue.attack.value = 0.005;
            glue.release.value = 0.25;
            this.glue = glue;
            glue.connect(this.master);
            this.fxGain = ctx.createGain();
            this.fxGain.gain.value = this.effects;
            this.fxGain.connect(glue);
            this.busFilter = ctx.createBiquadFilter();
            this.busFilter.type = "lowpass";
            this.busFilter.frequency.value = 20000;
            // Frontline soundscape pass: one shared colour for everything in the world (weapons, explosions, vehicles,
            // ambience, the reverb; not the UI), so the synthesized sounds and the designer recordings (re-mastered to
            // the same house tone offline: tools/master_samples.py) sit in one palette: a little low body, the harsh
            // 2.5-5 kHz band and the fizz above 7 kHz eased, and a very light saturation that only touches the loud peaks
            const body = ctx.createBiquadFilter(), harsh = ctx.createBiquadFilter(), air = ctx.createBiquadFilter(), sat = ctx.createWaveShaper();
            body.type = "lowshelf";
            body.frequency.value = 160;
            body.gain.value = 1.5;
            harsh.type = "peaking";
            harsh.frequency.value = 3400;
            harsh.Q.value = 1.1;
            harsh.gain.value = -2;
            air.type = "highshelf";
            air.frequency.value = 7500;
            air.gain.value = -2.5;
            const curve = new Float32Array(1024), drive = 1.6, norm = Math.tanh(drive);
            for (let i = 0; i < curve.length; i++) {
                const x = (i / (curve.length - 1)) * 2 - 1;
                // linear below 0.5, a soft tanh knee above it (quiet sounds pass untouched)
                const ax = Math.abs(x);
                curve[i] = ax < 0.5 ? x : Math.sign(x) * (0.5 + 0.5 * Math.tanh(((ax - 0.5) / 0.5) * drive) / norm);
            }
            sat.curve = curve;
            sat.oversample = "2x";
            this.busFilter.connect(body);
            body.connect(harsh);
            harsh.connect(air);
            air.connect(sat);
            sat.connect(this.fxGain);
            this.colour = { body, harsh, air, sat };
            // ambience: its own muffle filter and level (the ambient slider), not under the effects slider
            this.ambGain = ctx.createGain();
            this.ambGain.gain.value = this.ambient;
            this.ambGain.connect(glue);
            this.ambFilter = ctx.createBiquadFilter();
            this.ambFilter.type = "lowpass";
            this.ambFilter.frequency.value = 20000;
            this.ambFilter.connect(this.ambGain);
            for (const b of sound_table_ts_1.BUSES) {
                const g = ctx.createGain();
                g.gain.value = BUS_TRIM[b];
                g.connect(b === "music" ? this.master : b === "ui" ? this.fxGain : b === "ambience" ? this.ambFilter : this.busFilter);
                this.buses[b] = g;
            }
            // reverb: four damped feedback combs, two panned left, two right
            this.reverbIn = ctx.createGain();
            this.reverbIn.gain.value = 1;
            this.reverbOut = ctx.createGain();
            this.reverbOut.gain.value = SPACES.open.ret;
            this.reverbOut.connect(this.busFilter);
            for (let i = 0; i < 4; i++) {
                const d = ctx.createDelay(1), fb = ctx.createGain(), damp = ctx.createBiquadFilter();
                damp.type = "lowpass";
                damp.frequency.value = SPACES.open.damp;
                d.delayTime.value = SPACES.open.d[i];
                fb.gain.value = SPACES.open.fb;
                this.reverbIn.connect(d);
                d.connect(damp);
                damp.connect(fb);
                fb.connect(d);
                let o = damp;
                if (ctx.createStereoPanner) {
                    const p = ctx.createStereoPanner();
                    p.pan.value = i % 2 ? 0.6 : -0.6;
                    damp.connect(p);
                    o = p;
                }
                o.connect(this.reverbOut);
                this.combs.push({ d, fb, damp });
            }
            // noise: one second of white noise, generated once
            const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = n.getChannelData(0);
            let s = 22222;
            for (let i = 0; i < d.length; i++) {
                s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
                d[i] = s / 2147483648 - 1;
            }
            this.noise = n;
            this.available = true;
            this.loadSamples(ctx);
            ctx.resume?.().catch(() => { });
        }
        catch {
            this.ctx = null;
            this.available = false;
        }
    }
    get state() { return this.ctx ? this.ctx.state : "none"; }
    // ---------------------------------------------------------------- volumes and listener
    setVolume(v) { this.volume = clamp01(v); this.applyGain(); this.store("ironfall.volume", String(this.volume)); }
    setMuted(m) { this.muted = m; this.applyGain(); this.store("ironfall.muted", m ? "1" : "0"); }
    setEffects(v) { this.effects = clamp01(v); this.applyGain(); this.store("ironfall.effects", String(this.effects)); }
    setMusic(v) { this.music = clamp01(v); this.store("ironfall.music", String(this.music)); this.onMusic?.(this.music); }
    setAmbient(v) { this.ambient = clamp01(v); this.applyGain(); this.store("ironfall.ambient", String(this.ambient)); }
    /** Called when the music level changes (the opening cinematic's music follows it). */
    onMusic = null;
    /** Level for the music player's elements (master x music, 0 when muted). */
    musicLevel() { return this.muted ? 0 : this.volume * this.music; }
    store(k, v) { try {
        localStorage.setItem(k, v);
    }
    catch { /* no storage */ } }
    applyGain() {
        if (!this.ctx || !this.master || !this.fxGain)
            return;
        try {
            const t = this.ctx.currentTime;
            this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, t, 0.03);
            this.fxGain.gain.setTargetAtTime(this.effects, t, 0.03);
            this.ambGain?.gain.setTargetAtTime(this.ambient, t, 0.03);
        }
        catch { /* ignore */ }
    }
    /** Listener pose (camera), and whether world sounds are muffled (command view: the player is off the front line). */
    setListener(eye, right, muffled) {
        this.eye = eye;
        this.right = right;
        if (this.ctx && this.busFilter)
            try {
                this.busFilter.frequency.setTargetAtTime(muffled ? 1400 : 20000, this.ctx.currentTime, 0.15);
                this.ambFilter?.frequency.setTargetAtTime(muffled ? 1400 : 20000, this.ctx.currentTime, 0.15);
            }
            catch { /* ignore */ }
    }
    /** The planet's atmosphere (planets.json: normal, thin, none, dense): the distance model's reach and the reverb. */
    setAir(atmosphere) { this.air = sound_table_ts_1.AIR[atmosphere] ?? sound_table_ts_1.AIR.normal; }
    /** Reverb space: open ground, indoors (caves), a vehicle cabin. */
    setSpace(sp) {
        if (sp === this.space)
            return;
        this.space = sp;
        if (!this.ctx || !this.reverbOut)
            return;
        try {
            const S = SPACES[sp], t = this.ctx.currentTime;
            this.combs.forEach((c, i) => { c.d.delayTime.setTargetAtTime(S.d[i], t, 0.2); c.fb.gain.setTargetAtTime(S.fb, t, 0.2); c.damp.frequency.setTargetAtTime(S.damp, t, 0.2); });
            this.reverbOut.gain.setTargetAtTime(S.ret * this.air.reverb, t, 0.3);
        }
        catch { /* ignore */ }
    }
    /** Duck the ambience bus (fog stillness) and the weapons bus when crowded; call once a frame. */
    mixFrame(ambienceDuck = 1) {
        if (!this.ctx)
            return;
        try {
            const t = this.ctx.currentTime, w = this.voices.filter((v) => v.bus === "weapons" && v.end > t).length;
            this.buses.weapons.gain.setTargetAtTime(BUS_TRIM.weapons / Math.sqrt(1 + Math.max(0, w - 10) / 10), t, 0.1);
            this.buses.ambience.gain.setTargetAtTime(BUS_TRIM.ambience * ambienceDuck, t, 0.5);
            // loops faded to 0 and no longer updated by anyone: release them after 2 s
            for (const L of [...this.loops.values()])
                if (L.quietSince >= 0 && t - L.quietSince > 2)
                    this.release(L);
        }
        catch { /* ignore */ }
    }
    // ---------------------------------------------------------------- voices
    /**
     * Admits a voice of `dur` seconds on a bus. prio: importance (0-1) over distance; crit: never dropped (own weapon,
     * hits on the player, hit markers, stingers, nearby explosions). At the cap (or the bus's share) an ordinary voice
     * replaces the least important live ordinary voice if it matters more (its sources are stopped, its strip faded in
     * 10 ms), else it is dropped (counted). No node is made before this answers.
     */
    admit(kind, bus, dur, prio, crit) {
        const ctx = this.ctx, t = ctx.currentTime;
        let w = 0;
        for (const e of this.voices)
            if (e.end > t)
                this.voices[w++] = e;
        this.voices.length = w;
        let ordinary = 0, onBus = 0;
        for (const v of this.voices) {
            if (!v.crit)
                ordinary++;
            if (v.bus === bus && !v.crit)
                onBus++;
        }
        const full = crit ? this.voices.length >= Sound.HARD_CAP : ordinary >= this.maxVoices || onBus >= BUS_SHARE[bus];
        if (full) {
            const sameBus = !crit && ordinary < this.maxVoices; // only the bus share is full: steal within the bus
            let low = -1;
            for (let i = 0; i < this.voices.length; i++) {
                const v = this.voices[i];
                if (v.crit || (sameBus && v.bus !== bus))
                    continue;
                if (low < 0 || v.prio < this.voices[low].prio)
                    low = i;
            }
            if (low >= 0 && (crit || this.voices[low].prio < prio)) {
                this.kill(this.voices[low], t);
                this.voices.splice(low, 1);
                this.counters.stolen++;
            }
            else {
                if (crit)
                    this.counters.droppedCritical++;
                this.counters.dropped++;
                this.counters.droppedByKind[kind] = (this.counters.droppedByKind[kind] ?? 0) + 1;
                return null;
            }
        }
        const v = { end: t + dur, prio, crit, bus, kind, strip: null, srcs: [] };
        this.voices.push(v);
        this.counters.created++;
        if (crit)
            this.counters.critical++;
        this.counters.byKind[kind] = (this.counters.byKind[kind] ?? 0) + 1;
        return v;
    }
    kill(v, t) {
        try {
            if (v.strip) {
                v.strip.g.gain.cancelScheduledValues(t);
                v.strip.g.gain.setTargetAtTime(0, t, 0.01);
                v.strip.free = t + 0.06;
            }
            for (const s of v.srcs)
                s.stop(t + 0.05);
        }
        catch { /* ignore */ }
    }
    get activeVoices() { const t = this.ctx?.currentTime ?? 0; return this.voices.filter((e) => e.end > t).length; }
    /** Voices live per bus (tests, debug). */
    busVoices() { const t = this.ctx?.currentTime ?? 0, r = {}; for (const v of this.voices)
        if (v.end > t)
            r[v.bus] = (r[v.bus] ?? 0) + 1; return r; }
    /** Importance over distance (m): what survives at the cap. */
    static prio(importance, dist) { return importance / (1 + dist / 120); }
    mk(n) { this.counters.nodes += n; }
    /** A free channel strip on a bus (reused; created up to HARD_CAP + 8). */
    strip(bus, t) {
        for (const s of this.strips)
            if (s.bus === bus && s.free <= t)
                return s;
        if (this.strips.length >= Sound.HARD_CAP + 8) {
            // reassign a free strip of another bus
            const s = this.strips.find((x) => x.free <= t);
            if (!s)
                return null;
            try {
                s.p ? s.p.disconnect() : s.f.disconnect();
                (s.p ?? s.f).connect(this.buses[bus]);
                s.f.connect(s.s);
            }
            catch { /* ignore */ }
            s.bus = bus;
            return s;
        }
        const ctx = this.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter(), sg = ctx.createGain();
        f.type = "lowpass";
        f.Q.value = 0.5;
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        g.connect(f);
        if (p) {
            f.connect(p);
            p.connect(this.buses[bus]);
        }
        else
            f.connect(this.buses[bus]);
        f.connect(sg);
        sg.connect(this.reverbIn);
        this.mk(p ? 4 : 3);
        const s = { g, f, p, s: sg, bus, free: 0 };
        this.strips.push(s);
        this.counters.strips = this.strips.length;
        return s;
    }
    /**
     * Places a sound: distance, gain, cutoff, pan, then admits the voice and sets up a strip. pos null: centred, full
     * level. Returns null (no node made) if it is too far, too quiet or refused at the cap.
     */
    place(kind, bus, pos, level, size, dur, importance, crit, verb) {
        const ctx = this.ctx;
        let dist = 0, pan = 0;
        if (pos) {
            const dx = pos[0] - this.eye[0], dy = pos[1] - this.eye[1], dz = pos[2] - this.eye[2];
            dist = Math.hypot(dx, dy, dz);
            if (dist > 2400 * this.air.reach)
                return null;
            pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * this.right[0] + dy * this.right[1] + dz * this.right[2]) / dist)) * 0.85 : 0;
        }
        const dm = pos ? (0, sound_table_ts_1.distanceModel)(dist, size, this.air) : { gain: 1, cutoff: 20000, gap: 0, tail: 0.7, slap: 0 };
        const gain = level * dm.gain;
        if (gain < 0.004)
            return null;
        const v = this.admit(kind, bus, dur + (pos ? dm.gap : 0), Sound.prio(importance, dist), crit);
        if (!v)
            return null;
        const t = ctx.currentTime, s = this.strip(bus, t);
        if (!s)
            return null;
        v.strip = s;
        s.free = v.end + 0.05;
        try {
            s.g.gain.cancelScheduledValues(t);
            s.g.gain.setValueAtTime(gain, t);
            s.f.frequency.cancelScheduledValues(t);
            s.f.frequency.setValueAtTime(dm.cutoff, t);
            if (s.p)
                s.p.pan.setValueAtTime(pan, t);
            s.s.gain.setValueAtTime(Math.min(1, verb * (0.4 + dm.slap * 2) * this.air.reverb), t);
        }
        catch { /* ignore */ }
        this.cur = v;
        if (dist > 450)
            this.counters.lod++;
        return { node: s.g, dist, dm, v };
    }
    /** Small random variation: a factor 1 +- k. */
    static vary(k) { return 1 + (Math.random() * 2 - 1) * k; }
    noiseSrc(t, dur) {
        const ctx = this.ctx, s = ctx.createBufferSource();
        s.buffer = this.noise;
        s.loop = true;
        s.start(t, Math.random() * 0.9);
        s.stop(t + dur + 0.05);
        this.cur?.srcs.push(s);
        return s;
    }
    env(g, t, peak, attack, decay) {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + Math.max(0.0005, attack));
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    filtered(t, dur, type, f0, f1, q, peak, attack, dest) {
        const ctx = this.ctx, src = this.noiseSrc(t, dur + attack), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = type;
        f.Q.value = q;
        f.frequency.setValueAtTime(Math.max(20, f0), t);
        f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + attack + dur);
        src.connect(f);
        f.connect(g);
        g.connect(dest);
        this.env(g, t, peak, attack, dur);
        this.mk(3);
    }
    tone(t, dur, type, f0, f1, peak, attack, dest) {
        const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(Math.max(10, f0), t);
        o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + attack + dur);
        o.connect(g);
        g.connect(dest);
        this.env(g, t, peak, attack, dur);
        o.start(t);
        o.stop(t + attack + dur + 0.05);
        this.cur?.srcs.push(o);
        this.mk(2);
    }
    /**
     * One family's shot at distance: a transient, a body, a low thump, a tail (slap-back far away), the mechanical action
     * near, the supersonic crack before the thump, a rocket motor's whoosh, an energy zap. dist from the listener.
     */
    shot(t, d, o, dist, dm, own) {
        const v = Sound.vary(0.06), fv = Sound.vary(0.12), lv = () => Sound.vary(0.15);
        const far = Math.min(1, dist / 600), lod = dist > 450;
        // supersonic / heavy: the crack arrives first, the boom after the gap (own: together, plus a sub layer)
        const boom = own ? t : t + (o.crack > 0 ? dm.gap : 0);
        if (o.crack > 0 && (own || dist > 30))
            this.filtered(t, 0.008 + Math.random() * 0.004, "highpass", 3800 * v, 5200, 0.8, o.crack * (own ? 0.5 : 0.9), 0.0005, d);
        if (o.click > 0 && !lod)
            this.filtered(boom, 0.01 + Math.random() * 0.006, "highpass", o.clickF * v, o.clickF * 1.4, 0.7, o.click * (1 - 0.6 * far), 0.0006, d);
        if (o.body > 0)
            this.filtered(boom + Math.random() * 0.004, o.bodyDur * Sound.vary(0.12), "bandpass", o.bodyF0 * v * fv, o.bodyF1 * Sound.vary(0.1), o.bodyQ, o.body * lv(), 0.0015, d);
        if (o.thump > 0)
            this.tone(boom, o.thumpDur * Sound.vary(0.1), "sine", o.thumpF0 * v, o.thumpF1, o.thump * lv() * (0.8 + 0.4 * this.air.lowCarry * far), 0.002, d);
        if (o.tail > 0)
            this.filtered(boom + 0.01, o.tailDur * (1 + far * 0.6) * Sound.vary(0.15), "lowpass", o.tailF * fv * (1 - 0.5 * far), 90, 0.5, o.tail * dm.tail, 0.02, d);
        if ((o.punch ?? 0) > 0)
            this.filtered(boom, (o.punchDur ?? 0.08) * Sound.vary(0.12), "lowpass", 420 * v, 110, 0.9, o.punch * lv(), 0.001, d); // P1g: low body
        if ((o.roll ?? 0) > 0)
            this.filtered(boom + 0.1 + far * 0.15 + Math.random() * 0.03, (o.rollDur ?? 1) * Sound.vary(0.15), "lowpass", 380 * fv, 55, 0.6, o.roll * dm.tail * lv(), 0.09, d); // P1g: rolling tail
        if (dm.slap > 0.05 && !own)
            this.filtered(boom + 0.09 + far * 0.18 + Math.random() * 0.04, o.tailDur * 0.8, "lowpass", 700 * fv, 120, 0.6, o.tail * dm.slap, 0.01, d); // the ground slap-back
        if (o.mech > 0 && (own || dist < 60))
            this.filtered(boom + 0.035 + Math.random() * 0.02, 0.025, "bandpass", 3200 * v, 2600, 6, o.mech * lv(), 0.001, d);
        if (o.whoosh > 0)
            this.filtered(boom + 0.01, 0.35 + o.whoosh * 0.4, "bandpass", 500 * v, 2400 * fv, 1.4, o.whoosh * lv(), 0.04, d);
        if (o.zap) {
            const z = o.zap;
            this.filtered(boom, 0.16 * Sound.vary(0.1), "bandpass", z.f0 * v * fv, z.f1, z.q, 0.7 * lv(), 0.002, d);
            if (z.tone > 0)
                this.tone(boom, 0.14 * Sound.vary(0.1), "triangle", z.toneF0 * v, z.toneF1, z.tone, 0.002, d);
            if (z.buzz > 0 && !lod)
                this.tone(boom, 0.28, "sawtooth", 95 * v, 90, z.buzz * 0.4, 0.004, d);
        }
    }
    /** Pitch factor of the last fire sound made (tests). Last family fired (tests). */
    lastFirePitch = 1;
    lastFamily = "";
    /** Weapon fire by family (or the old damage class). `own`: the player's own shot (centred, louder, never dropped). pitch: per weapon (FIRE_PITCH). */
    fire(cls, pos, own = false, rapid = false, pitch = 1, mg = 0) {
        if (!this.ctx || !this.available)
            return;
        try {
            if (mg > 0 && this.mgShot(pos, own, mg))
                return; // the M249 sample (machine guns); the synth when it is not decoded
            if (cls === "laser-cannon" && this.lancerShot(pos, own))
                return; // Frontline: the Lancer main gun recording
            const fam = (sound_table_ts_1.CLASS_FAMILY[cls] ?? cls);
            if ((fam === "rocket" || fam === "missile") && this.weaponSample({ n: "rocket", rate: Math.max(0.7, Math.min(1.4, pitch)) }, pos, own))
                return; // Frontline: the designer's rocket launch for every rocket and missile without a cut of its own
            if (fam === "laser-rapid" && this.laserGunShot(pos, own, pitch, rapid))
                return; // Frontline: the designer's laser gun recording
            if (fam === "shotgun" && this.shotgunShot(pos, own, pitch))
                return; // Frontline: the designer's shotgun recording
            if (fam === "tank-cannon")
                this.tankCannonShot(pos, own); // Frontline: the Bastion's main gun: the explosion recording under the synth below
            let o = sound_table_ts_1.FAMILIES[fam] ?? sound_table_ts_1.FAMILIES["kinetic-medium"];
            if (o.level <= 0)
                return;
            if (rapid)
                o = (0, sound_table_ts_1.rapidOf)(o);
            if (pitch !== 1)
                o = { ...o, clickF: o.clickF * pitch, bodyF0: o.bodyF0 * pitch, bodyF1: o.bodyF1 * pitch, thumpF0: o.thumpF0 * pitch, thumpF1: o.thumpF1 * pitch, tailF: o.tailF * pitch, zap: o.zap ? { ...o.zap, f0: o.zap.f0 * pitch, f1: o.zap.f1 * pitch, toneF0: o.zap.toneF0 * pitch, toneF1: o.zap.toneF1 * pitch } : undefined };
            const lvl = (own ? o.level * 1.1 : o.level) * Sound.vary(0.1);
            const p = this.place(`fire-${fam}`, "weapons", own ? null : pos, lvl, o.size, o.dur, o.prio, own, 0.25 + o.size * 0.4);
            if (!p)
                return;
            this.lastFirePitch = pitch;
            this.lastFamily = fam;
            if (!own && p.dist < 300)
                this.markNear();
            this.shot(this.ctx.currentTime + 0.004 + Math.random() * 0.006, p.node, o, p.dist, p.dm, own);
        }
        catch { /* never let sound break a frame */ }
        finally {
            this.cur = null;
        }
    }
    /** The decoded machine-gun shot (designer's M249 recording; null until decoded, or when decoding failed: the synth plays). */
    mgBuf = null;
    /** Machine-gun shots played from the sample (tests). */
    mgPlayed = 0;
    /** Decodes the embedded machine-gun shot (build.mjs: __IRONFALL_SAMPLES.mg, base64 WAV) once. */
    loadSamples(ctx) {
        try { // Frontline: other designer recordings by name (__IRONFALL_SAMPLES.<name>, base64 MP3): afterburner, ...
            for (const name of ["rocket", "rocket2", "machinePistol", "rifle", "carbine", "grenadeLauncher", "grenadeBoom", "minigun", "laserGun", "shotgun", "explosion", "gunshipEngine", "afterburner", "step1", "step2", "step3", "footwalk1", "footwalk2", "footwalk3", "footwalk4", "footrun1", "footrun2", "footrun3", "footrun4"]) {
                const b64 = globalThis.__IRONFALL_SAMPLES?.[name];
                if (!b64 || typeof atob !== "function")
                    continue;
                const bin = atob(b64), u = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++)
                    u[i] = bin.charCodeAt(i);
                const pr = ctx.decodeAudioData(u.buffer);
                if (pr && typeof pr.then === "function")
                    pr.then((b) => { this.samples.set(name, b); }, () => { });
            }
        }
        catch { /* the synth cues stay */ }
        try { // Frontline: the designer's Lancer main gun recording (__IRONFALL_SAMPLES.lancer, base64 MP3)
            const b64 = globalThis.__IRONFALL_SAMPLES?.lancer;
            if (b64 && typeof atob === "function") {
                const bin = atob(b64), u = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++)
                    u[i] = bin.charCodeAt(i);
                const pr = ctx.decodeAudioData(u.buffer);
                if (pr && typeof pr.then === "function")
                    pr.then((b) => { this.lancerBuf = b; }, () => { });
            }
        }
        catch { /* the synth stays */ }
        try {
            const b64 = globalThis.__IRONFALL_SAMPLES?.mg;
            if (!b64 || typeof atob !== "function")
                return;
            const bin = atob(b64), u = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++)
                u[i] = bin.charCodeAt(i);
            const pr = ctx.decodeAudioData(u.buffer);
            if (pr && typeof pr.then === "function")
                pr.then((b) => { this.mgBuf = b; }, () => { });
        }
        catch { /* the synth stays */ }
    }
    /**
     * A machine-gun shot from the sample: rate = pitch per weapon (lighter guns higher), small pitch and level variation,
     * placed like the synth shots (distance gain and low-pass, pan, reverb send, the voice cap). False: not played.
     */
    mgShot(pos, own, rate) {
        const ctx = this.ctx, buf = this.mgBuf;
        if (!ctx || !buf)
            return false;
        const lvl = (own ? sound_table_ts_1.MG_LEVEL * 1.4 : sound_table_ts_1.MG_LEVEL) * Sound.vary(0.12); // own: clear over engines and blasts
        const p = this.place("fire-mg", "weapons", own ? null : pos, lvl, 0.25, Math.min(buf.duration, own ? 0.45 : 0.5), 0.4, own, 0.35);
        if (!p)
            return true; // culled (far, or the voice cap): no synth in its place
        if (!own && p.dist < 300)
            this.markNear();
        const t = ctx.currentTime + 0.002 + Math.random() * 0.006, src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = buf;
        src.playbackRate.value = rate * Sound.vary(0.035);
        const far = Math.min(1, p.dist / 600);
        // own: up front (it sat under the engine and the blasts), but a fast gun (the gunship's 30 rounds/s nose guns)
        // stacks many shots at once: the level scales with the own fire rate over the last half second
        let dens = 1;
        if (own) {
            const now = ctx.currentTime;
            this.ownMgTimes = (this.ownMgTimes ?? []).filter((x) => now - x < 0.5);
            this.ownMgTimes.push(now);
            const rate = this.ownMgTimes.length * 2; // shots per second
            dens = rate > 12 ? Math.sqrt(12 / rate) : 1;
        }
        const trim = sound_table_ts_1.MG_TRIM * (own ? 1.6 * dens : 1);
        g.gain.setValueAtTime(trim, t);
        g.gain.setValueAtTime(trim, t + 0.06 + 0.25 * far);
        const heavy = rate < 0.7; // Frontline: the mech autocannon, slowed down, a longer tail and a low boom under it
        g.gain.exponentialRampToValueAtTime(trim * 0.001, t + (heavy ? 0.85 : own ? 0.32 : 0.48)); // own: a shorter tail (fast guns don't smear)
        src.connect(g);
        g.connect(p.node);
        src.start(t);
        src.stop(t + (heavy ? 0.9 : 0.5));
        if (own && !heavy && (dens >= 0.99 || (this.ownMgTimes.length & 1) === 0)) // Frontline: a short low thump under the player's own shots (the weight of a vehicle gun; every other one on a fast gun)
            this.filtered(t, 0.09, "lowpass", 260, 70, 0.9, 0.55 * dens, 0.002, p.node);
        if (!heavy && rate < 0.85) { // designer 21 Nov: a heavy calibre (the pilot's HMG): a chest punch and a short crack over the slowed shot
            this.filtered(t, 0.14, "lowpass", 200, 60, 0.9, own ? 1.0 : 0.7, 0.002, p.node);
            this.filtered(t, 0.035, "bandpass", 2600, 1500, 1.4, own ? 0.32 : 0.2, 0.0008, p.node);
        }
        if (heavy) {
            this.filtered(t, 0.32, "lowpass", 220, 55, 0.8, 1.1, 0.004, p.node);
            this.filtered(t, 0.06, "bandpass", 900, 400, 1.2, 0.35, 0.001, p.node);
        }
        this.cur?.srcs.push(src);
        this.mgPlayed++;
        this.lastFamily = "kinetic-small";
        return true;
    }
    /** Frontline: per-recording settings for weaponSample: level, voice size, pitch (heavy launcher a touch lower is main.ts's call). */
    static WSAMPLE_OPT = { rocket: { lvl: 0.55, size: 0.45, rate: 1 }, machinePistol: { lvl: 0.5, size: 0.15, rate: 1 }, rifle: { lvl: 0.62, size: 0.35, rate: 1 }, carbine: { lvl: 0.6, size: 0.2, rate: 1 }, grenadeLauncher: { lvl: 0.68, size: 0.35, rate: 1 } };
    weaponSamplesPlayed = 0;
    /** Frontline: a weapon's own designer recording, placed like the other samples. False: not decoded (play the synth). */
    weaponSample(spec, pos, own) {
        const name = typeof spec === "string" ? spec : spec.n, rate = typeof spec === "string" ? 1 : spec.rate ?? 1, cut = typeof spec === "string" ? 0 : spec.len ?? 0, lm = typeof spec === "string" ? 1 : spec.lvl ?? 1;
        const alt = this.samples.has(name + "2") && Math.random() < 0.5 ? name + "2" : name; // a second take, picked at random
        const ctx = this.ctx, buf = this.samples.get(alt), o = Sound.WSAMPLE_OPT[name] ?? { lvl: 0.7, size: 0.3, rate: 1 };
        if (!ctx || !buf || !this.available)
            return false;
        try {
            const r = o.rate * rate, len = cut > 0 ? Math.min(cut, buf.duration / r) : buf.duration / r;
            const p = this.place("fire-" + name, "weapons", own ? null : pos, (own ? o.lvl * 1.1 : o.lvl) * lm * Sound.vary(0.1), o.size, len, 0.45, own, 0.3);
            if (!p)
                return true;
            if (!own && p.dist < 300)
                this.markNear();
            const t = ctx.currentTime + 0.002, src = ctx.createBufferSource(), g = ctx.createGain();
            src.buffer = buf;
            src.playbackRate.value = r * Sound.vary(0.04);
            g.gain.setValueAtTime(1, t);
            if (cut > 0) { // a shortened tail for faster-firing guns
                g.gain.setValueAtTime(1, t + len * 0.5);
                g.gain.exponentialRampToValueAtTime(0.001, t + len);
            }
            src.connect(g);
            g.connect(p.node);
            src.start(t);
            if (cut > 0)
                src.stop(t + len + 0.02);
            if (name === "rocket")
                this.lastSample = { src, g, v: p.v }; // main.ts ties it to the rocket and cuts it on impact
            this.cur?.srcs.push(src);
            this.weaponSamplesPlayed++;
            this.lastFamily = name;
            return true;
        }
        catch {
            return false;
        }
        finally {
            this.cur = null;
        }
    }
    /** Frontline: fade a playing sample out fast (a rocket that hit before its launch recording ended). */
    lastSample = null;
    sampleCuts = 0;
    cutSample(h) {
        const ctx = this.ctx;
        if (!ctx || !h)
            return;
        try {
            const t = ctx.currentTime;
            h.g.gain.cancelScheduledValues(t);
            h.g.gain.setValueAtTime(h.g.gain.value, t);
            h.g.gain.linearRampToValueAtTime(0.0001, t + 0.09);
            h.src.stop(t + 0.1);
            if (h.v)
                h.v.end = Math.min(h.v.end, t + 0.12); // the voice slot frees early too
            this.sampleCuts++;
        }
        catch { /* already stopped */ }
    }
    /** Frontline: a laser shot from the designer's recording; rapid fire gets a short clipped cut so shots don't pile up. */
    laserGunPlayed = 0;
    laserGunShot(pos, own, pitch = 1, rapid = false) {
        const ctx = this.ctx, buf = this.samples.get("laserGun");
        if (!ctx || !buf)
            return false;
        const len = Math.min(buf.duration, rapid ? 0.26 : 0.75);
        const p = this.place("fire-laser", "weapons", own ? null : pos, (own ? 0.42 : 0.38) * Sound.vary(0.1), 0.25, len, 0.4, own, 0.3); // designer 19 Nov: was 0.7 / 0.6
        if (!p)
            return true;
        const t = ctx.currentTime + 0.002, src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = buf;
        src.playbackRate.value = Math.max(0.6, Math.min(1.6, pitch)) * (rapid ? 1.12 : 1) * Sound.vary(0.05);
        g.gain.setValueAtTime(1, t);
        g.gain.setValueAtTime(1, t + len * 0.55);
        g.gain.exponentialRampToValueAtTime(0.001, t + len);
        src.connect(g);
        g.connect(p.node);
        src.start(t);
        src.stop(t + len + 0.02);
        this.cur?.srcs.push(src);
        this.laserGunPlayed++;
        this.lastFamily = "laser-rapid";
        return true;
    }
    /** Frontline: a shotgun blast from the designer's recording, placed like the machine-gun sample. False: not decoded. */
    shotgunPlayed = 0;
    /** Frontline: the boom layer of a tank cannon: the explosion recording, pitched down and darkened, placed like a shot. */
    tankCannonShot(pos, own) {
        const ctx = this.ctx, buf = this.samples.get("explosion");
        if (!ctx || !buf)
            return false;
        const p = this.place("fire-tank-boom", "weapons", own ? null : pos, (own ? 0.9 : 0.85) * Sound.vary(0.06), 1.0, Math.min(2.6, buf.duration / 0.72), 0.85, own, 0.6);
        if (!p)
            return true;
        const t = ctx.currentTime + 0.002, src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = buf;
        src.playbackRate.value = 0.72 * Sound.vary(0.03);
        lp.type = "lowpass";
        lp.frequency.value = 2200;
        g.gain.setValueAtTime(1, t);
        g.gain.setTargetAtTime(0, t + 1.4, 0.35);
        src.connect(lp);
        lp.connect(g);
        g.connect(p.node);
        src.start(t);
        src.stop(t + 2.6);
        this.cur?.srcs.push(src);
        this.mk(3);
        this.tankShots = (this.tankShots ?? 0) + 1;
        return true;
    }
    shotgunShot(pos, own, pitch = 1) {
        const ctx = this.ctx, buf = this.samples.get("shotgun");
        if (!ctx || !buf)
            return false;
        const p = this.place("fire-shotgun", "weapons", own ? null : pos, (own ? 0.48 : 0.45) * Sound.vary(0.1), 0.45, buf.duration, 0.5, own, 0.45); // designer 19 Nov: was 0.95 / 0.85, louder than the vehicle guns
        if (!p)
            return true;
        if (!own && p.dist < 300)
            this.markNear();
        const t = ctx.currentTime + 0.002, src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = buf;
        src.playbackRate.value = Math.max(0.6, Math.min(1.4, pitch)) * Sound.vary(0.04);
        g.gain.setValueAtTime(1, t);
        src.connect(g);
        g.connect(p.node);
        src.start(t);
        this.cur?.srcs.push(src);
        this.shotgunPlayed++;
        this.lastFamily = "shotgun";
        return true;
    }
    /** Frontline: decoded designer recordings by name. */
    samples = new Map();
    /** Frontline: the player's own sample `name` (centred, not placed); false when it is not decoded (play the synth cue). */
    ownSample(name, level = 1) {
        const ctx = this.ctx, buf = this.samples.get(name);
        if (!ctx || !buf || !this.available)
            return false;
        try {
            const p = this.place(name, "weapons", null, level, 0.3, buf.duration, 0.6, true, 0.2);
            if (!p)
                return true;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.value = Sound.vary(0.02);
            src.connect(p.node);
            src.start(ctx.currentTime + 0.002);
            this.cur?.srcs.push(src);
            return true;
        }
        catch {
            return false;
        }
        finally {
            this.cur = null;
        }
    }
    /**
     * Frontline: the Dart Scout's boost: the gunship turbine recording pitched up (x1.75) and band-passed thinner, looped
     * while the boost is on: a fast swell in, a short fall-off when it ends.
     */
    boostSrc = null;
    boostLoop(on) {
        const ctx = this.ctx;
        if (!ctx || !this.available)
            return;
        const t = ctx.currentTime;
        if (on && !this.boostSrc) {
            const buf = this.samples.get("gunshipEngine");
            if (!buf)
                return;
            try {
                const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
                src.buffer = buf;
                src.loop = true;
                src.loopStart = 0.06;
                src.loopEnd = Math.min(buf.duration, 2.88);
                // a soft, darker layer under the Dart's own engine (which revs up itself: setEngine), faded in, so the
                // boost sounds like the same engine pushed harder rather than a second, jarring roar
                src.playbackRate.setValueAtTime(1.05, t);
                src.playbackRate.linearRampToValueAtTime(1.22, t + 0.6); // spools up
                f.type = "lowpass";
                f.frequency.value = 2600;
                hp.type = "highpass";
                hp.frequency.value = 110;
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(0.34, t + 0.45);
                src.connect(hp);
                hp.connect(f);
                f.connect(g);
                g.connect(this.buses.vehicles ?? this.buses.weapons);
                src.start(t, 0.06 + Math.random() * 0.5);
                this.boostSrc = { src, g };
            }
            catch { /* ignore */ }
        }
        else if (!on && this.boostSrc) {
            const B = this.boostSrc;
            this.boostSrc = null;
            try {
                B.g.gain.cancelScheduledValues(t);
                B.g.gain.setValueAtTime(B.g.gain.value, t);
                B.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
                B.src.playbackRate.cancelScheduledValues(t);
                B.src.playbackRate.setValueAtTime(B.src.playbackRate.value, t);
                B.src.playbackRate.linearRampToValueAtTime(1.2, t + 0.35); // spools down
                B.src.stop(t + 0.4);
            }
            catch { /* ignore */ }
        }
    }
    /** Frontline: a soldier's footstep from the recordings (four walk and four run takes); own: centred, the player's own. */
    soldierStep(pos, run, own) {
        const ctx = this.ctx;
        if (!ctx || !this.available)
            return false;
        const k = run ? "footrun" : "footwalk", bufs = [1, 2, 3, 4].map((i) => this.samples.get(k + i)).filter((b) => !!b);
        if (!bufs.length)
            return false;
        try {
            const st = own ? this.stance : 0, lvl = (own ? 0.55 : 0.5) * (run ? 1.1 : 0.9) * (st === 1 ? 0.6 : st === 2 ? 0.4 : 1) * Sound.vary(0.12);
            const p = this.place("step", own ? "ui" : "weapons", own ? null : pos, lvl, 0.1, 0.35, own ? 0.9 : 0.2, own, 0.05);
            if (!p)
                return true;
            const src = ctx.createBufferSource();
            src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
            src.playbackRate.value = Sound.vary(0.06);
            src.connect(p.node);
            src.start(ctx.currentTime + 0.002);
            this.cur?.srcs.push(src);
            return true;
        }
        catch {
            return false;
        }
        finally {
            this.cur = null;
        }
    }
    /**
     * Frontline: the mech's jump-jet booster, timed to the jump: a short ignition thump, then the afterburner recording's
     * roar from its loud part, held for the flight time `dur` (s) and cut off just before touchdown, with a rumble under it.
     */
    walkerJet(pos, own, dur = 1.8) {
        const ctx = this.ctx, buf = this.samples.get("afterburner");
        if (!ctx || !this.available)
            return;
        try {
            const p = this.place("mech-jet", "weapons", own ? null : pos, own ? 1.0 : 0.9, 0.7, dur + 0.2, 0.7, own, 0.4);
            if (!p)
                return;
            const t = ctx.currentTime + 0.002, end = t + Math.max(0.5, dur - 0.08);
            this.filtered(t, 0.22, "lowpass", 300, 70, 0.8, 1.0, 0.002, p.node); // ignition
            if (buf) {
                const src = ctx.createBufferSource(), g = ctx.createGain();
                src.buffer = buf;
                src.loop = true;
                src.loopStart = Math.min(0.5, buf.duration * 0.2);
                src.loopEnd = Math.max(src.loopStart + 0.3, buf.duration - 0.6);
                src.playbackRate.value = 0.85 * Sound.vary(0.03);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(1, t + 0.05);
                g.gain.setValueAtTime(1, end - 0.3);
                g.gain.exponentialRampToValueAtTime(0.001, end);
                src.connect(g);
                g.connect(p.node);
                src.start(t, src.loopStart * 0.5);
                src.stop(end + 0.02);
                this.cur?.srcs.push(src);
            }
            this.filtered(t, Math.max(0.4, dur - 0.2), "lowpass", 200, 120, 0.7, 0.55, 0.06, p.node);
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** Frontline: the mech landing from a jump: two heavy step takes at once, slowed, and a deep thump. */
    walkerLand(pos, own) {
        const ctx = this.ctx, bufs = ["step1", "step2", "step3"].map((n) => this.samples.get(n)).filter((b) => !!b);
        if (!ctx || !this.available)
            return;
        try {
            const p = this.place("mech-land", "weapons", own ? null : pos, own ? 1.15 : 1.0, 0.9, 1.2, 0.8, own, 0.5);
            if (!p)
                return;
            const t = ctx.currentTime + 0.002;
            for (let i = 0; i < Math.min(2, bufs.length); i++) {
                const src = ctx.createBufferSource();
                src.buffer = bufs[i];
                src.playbackRate.value = (0.7 + i * 0.08) * Sound.vary(0.03);
                src.connect(p.node);
                src.start(t + i * 0.012);
                this.cur?.srcs.push(src);
            }
            this.filtered(t, 0.45, "lowpass", 160, 40, 0.9, 1.4, 0.003, p.node);
            this.filtered(t, 0.12, "bandpass", 500, 180, 1.0, 0.5, 0.002, p.node);
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** Frontline: a walker footfall from the recorded steps (three takes); the Strider deeper and louder than the mech. */
    stompSample(pos, foot, amp, mech) {
        const ctx = this.ctx, bufs = ["step1", "step2", "step3"].map((n) => this.samples.get(n)).filter((b) => !!b);
        if (!ctx || !bufs.length || !this.available)
            return false;
        try {
            const buf = bufs[(foot + Math.floor(Math.random() * bufs.length)) % bufs.length];
            const p = this.place("stomp", "weapons", pos, (mech ? 0.75 : 1.0) * (0.6 + 0.4 * Math.min(1, amp)) * Sound.vary(0.1), mech ? 0.5 : 0.8, buf.duration, 0.5, false, 0.3);
            if (!p)
                return true;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.value = (mech ? 1.05 : 0.82) * Sound.vary(0.04);
            src.connect(p.node);
            src.start(ctx.currentTime + 0.002);
            this.cur?.srcs.push(src);
            return true;
        }
        catch {
            return false;
        }
        finally {
            this.cur = null;
        }
    }
    /** Frontline: the decoded Lancer main gun shot (null: the synth laser cannon plays). */
    lancerBuf = null;
    lancerPlayed = 0;
    /** The Lancer main gun from the sample (whoosh and low reverb tail, about 1.5 s), placed like the other shots. */
    lancerShot(pos, own) {
        const ctx = this.ctx, buf = this.lancerBuf;
        if (!ctx || !buf)
            return false;
        const p = this.place("fire-lancer", "weapons", own ? null : pos, (own ? 0.95 : 0.85) * Sound.vary(0.08), 0.3, buf.duration, 0.5, own, 0.5);
        if (!p)
            return true;
        if (!own && p.dist < 300)
            this.markNear();
        const t = ctx.currentTime + 0.002, src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = Sound.vary(0.03);
        src.connect(p.node);
        src.start(t);
        this.cur?.srcs.push(src);
        this.lancerPlayed++;
        this.lastFamily = "laser-cannon";
        return true;
    }
    /**
     * Frontline: the shoulder laser cannon's held beam, the Lancer recording held: the shot's attack plays once, its loud
     * body (BEAM_LOOP) loops while shots keep coming (each shot refreshes the hold), and when they stop the loop is
     * released so the recording plays on into its own tail. One voice per shooter (key).
     */
    beamHolds = new Map();
    beamTimer = 0;
    beamStats = { calls: 0, starts: 0, noPlace: 0 };
    beamHold(key, pos, own) {
        this.beamStats.calls++;
        const ctx = this.ctx, buf = this.lancerBuf;
        if (!ctx || !buf || !this.available)
            return false;
        const now = ctx.currentTime, h = this.beamHolds.get(key);
        if (h) {
            h.until = now + 0.45;
            if (h.v) { // keep the voice and its mixer strip reserved for the hold and the tail after it
                h.v.end = Math.max(h.v.end, now + 1.6);
                if (h.v.strip)
                    h.v.strip.free = h.v.end + 0.05;
            }
            return true;
        }
        try {
            const p = this.place("fire-beam", "weapons", own ? null : pos, (own ? 0.9 : 0.8), 0.3, 3, 0.5, own, 0.5);
            if (!p) {
                this.beamStats.noPlace++;
                return true;
            }
            this.beamStats.starts++;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            src.loopStart = 0.14;
            src.loopEnd = 0.29;
            src.connect(p.node);
            src.start(now + 0.002);
            this.cur?.srcs.push(src);
            this.beamHolds.set(key, { src, until: now + 0.45, v: p.v });
            this.lastFamily = "laser-cannon";
            if (!this.beamTimer)
                this.beamTimer = setInterval(() => this.beamRelease(), 50);
        }
        catch {
            return false;
        }
        finally {
            this.cur = null;
        }
        return true;
    }
    /**
     * Frontline: the minigun recording (spin-up 0-1.2 s, firing 1.3-3.4 s, spin-down after) held while the shots keep
     * coming: the last of the spin-up into the firing loop; when the shots stop the loop fades out fast and the spin-down
     * plays. key: shooter and weapon.
     */
    miniHolds = new Map();
    miniTimer = 0;
    miniStarts = 0;
    minigunHold(key, pos, own) {
        const ctx = this.ctx, buf = this.samples.get("minigun");
        if (!ctx || !buf || !this.available)
            return false;
        const now = ctx.currentTime, h = this.miniHolds.get(key);
        if (h) {
            h.until = now + 0.22;
            h.pos = pos;
            if (h.v) {
                h.v.end = Math.max(h.v.end, now + 3.6);
                if (h.v.strip)
                    h.v.strip.free = h.v.end + 0.05;
            }
            return true;
        }
        try {
            const p = this.place("fire-minigun", "weapons", own ? null : pos, (own ? 0.42 : 0.6) * Sound.vary(0.06), 0.35, 4, 0.5, own, 0.4); // own: the gunship's door guns (AI-manned beside you) sat too loud
            if (!p)
                return true;
            const src = ctx.createBufferSource(), g = ctx.createGain(), rate = Sound.vary(0.03);
            src.buffer = buf;
            src.loop = true;
            src.loopStart = 1.5;
            src.loopEnd = 3.25;
            src.playbackRate.value = rate;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(1, now + 0.04);
            src.connect(g);
            g.connect(p.node);
            src.start(now + 0.002, 1.05);
            this.cur?.srcs.push(src);
            this.miniHolds.set(key, { src, g, node: p.node, rate, until: now + 0.22, v: p.v });
            this.miniStarts++;
            this.lastFamily = "minigun";
            if (!this.miniTimer)
                this.miniTimer = setInterval(() => this.minigunRelease(), 40);
        }
        catch {
            return false;
        }
        finally {
            this.cur = null;
        }
        return true;
    }
    minigunRelease() {
        const ctx = this.ctx, now = ctx ? ctx.currentTime : Infinity, buf = this.samples.get("minigun");
        for (const [k, h] of this.miniHolds)
            if (now >= h.until) {
                this.miniHolds.delete(k);
                try {
                    h.g.gain.setValueAtTime(h.g.gain.value, now);
                    h.g.gain.linearRampToValueAtTime(0.0001, now + 0.08);
                    h.src.stop(now + 0.1);
                    if (ctx && buf) { // the spin-down
                        const s2 = ctx.createBufferSource(), g2 = ctx.createGain();
                        s2.buffer = buf;
                        s2.playbackRate.value = h.rate;
                        g2.gain.setValueAtTime(0.0001, now);
                        g2.gain.linearRampToValueAtTime(0.8, now + 0.06);
                        s2.connect(g2);
                        g2.connect(h.node);
                        s2.start(now, 3.42);
                    }
                }
                catch { /* ignore */ }
            }
        if (!this.miniHolds.size && this.miniTimer) {
            clearInterval(this.miniTimer);
            this.miniTimer = 0;
        }
    }
    /** Release the beam holds whose shots stopped (the recording plays out its tail). */
    beamRelease() {
        const now = this.ctx ? this.ctx.currentTime : Infinity;
        for (const [k, h] of this.beamHolds)
            if (now >= h.until) {
                try { h.src.loop = false; } catch { /* ignore */ }
                this.beamHolds.delete(k);
            }
        if (!this.beamHolds.size && this.beamTimer) {
            clearInterval(this.beamTimer);
            this.beamTimer = 0;
        }
    }
    /** The player's own pilot weapons and other pilots': carbine and long rifle. */
    pilotFire(kind, pos, own) { this.fire(kind, pos, own); }
    /** A supersonic round passing the listener (a near miss): a sharp crack and a short whip; pos: the closest point. */
    flyby(pos, heavy) {
        if (!this.ctx || !this.available)
            return;
        try {
            const p = this.place("flyby", "weapons", pos, heavy ? 0.5 : 0.35, 0.1, 0.2, 0.6, false, 0.1);
            if (!p)
                return;
            const t = this.ctx.currentTime + 0.002, v = Sound.vary(0.1);
            this.filtered(t, 0.006, "highpass", 4500 * v, 6000, 0.8, 0.9, 0.0004, p.node);
            this.filtered(t + 0.004, heavy ? 0.12 : 0.07, "bandpass", 2600 * v, 900, 2, 0.4, 0.004, p.node);
            this.markNear();
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    markNear() {
        const n = performance.now();
        this.nearFire.push(n);
        if (this.nearFire.length > 64)
            this.nearFire.splice(0, this.nearFire.length - 64);
    }
    /** Shots near the listener in the last `ms` (music: combat). */
    nearFireCount(ms, now = performance.now()) { let n = 0; for (const t of this.nearFire)
        if (now - t < ms)
            n++; return n; }
    /** Shot impact: small for kinetic and energy rounds (by surface: hull clank, ricochet, dirt, rock, splash), a short boom for explosive and flak. */
    impact(pos, big) {
        if (!this.ctx || !this.available)
            return;
        try {
            const surf = this.impactSurface ? this.impactSurface(pos) : null;
            if (big) {
                this.explosion(pos, 1.8, "impact-big");
                return;
            }
            const p = this.place("impact", "weapons", pos, 0.3 * Sound.vary(0.15), 0.1, 0.25, 0.15, false, 0.15);
            if (!p)
                return;
            const t = this.ctx.currentTime + 0.004 + Math.random() * 0.01, d = p.node, v = Sound.vary(0.2), lod = p.dist > 450;
            if (surf === "hull") { // metal: a ringing clank
                this.filtered(t, 0.04, "bandpass", 3400 * v, 2600, 8, 0.7, 0.0008, d);
                if (!lod)
                    this.tone(t, 0.12, "triangle", 1250 * v, 1180, 0.18, 0.001, d);
                this.filtered(t + 0.005, 0.05, "lowpass", 1200 * v, 300, 0.7, 0.3, 0.002, d);
                return;
            }
            const s = sound_table_ts_1.SURFACES[surf ?? "dirt"] ?? sound_table_ts_1.SURFACES.dirt;
            if (s.splash > 0) {
                this.filtered(t, 0.18, "bandpass", 1400 * v, 500, 1.2, 0.6 * s.splash + 0.2, 0.004, d);
                this.filtered(t + 0.04, 0.25, "highpass", 3000, 1800, 0.7, 0.2, 0.02, d);
                return;
            }
            this.filtered(t, 0.05, "bandpass", (2400 + s.ring * 2000) * v, 1300, 1.4, 0.7, 0.0008, d);
            this.filtered(t + 0.008, 0.07 + s.dur * 0.4, "lowpass", s.thudF * v, 180, 0.7, 0.35, 0.003, d);
            if (!lod && s.grit > 0)
                this.filtered(t + 0.015, 0.1, "highpass", s.gritF * v, s.gritF * 0.7, 0.7, s.grit * 0.4, 0.004, d); // grit falling back
            if (!lod && Math.random() < 0.12 + s.ring * 0.6)
                this.tone(t + 0.01, 0.22, "sine", 3600 * v, 1400, 0.16, 0.001, d); // ricochet whine
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** A ricochet on its own (cue). */
    ricochet(pos) { this.cue("ricochet", pos); }
    /**
     * Explosion by size 1 (soldier) .. 9 (structure): small (< 2.5) a sharp crack and a short body; medium a longer body
     * and a sub thump; large a deep sub (lower, longer), a rolling tail and more debris. Far away: the thump arrives
     * after the crack and the tail is relatively louder. Critical within 120 m.
     */
    explosion(pos, size, kind = "explosion") {
        if (!this.ctx || !this.available)
            return;
        try {
            const k = Math.max(0.5, Math.min(size, 9)), s01 = k / 9;
            const dur = (0.6 + k * 0.17) * Sound.vary(0.1);
            const xb0 = this.samples.get(k < 3.5 && this.samples.get("grenadeBoom") ? "grenadeBoom" : "explosion"), xlen = xb0 ? Math.min(xb0.duration / (1.55 - 0.7 * s01), 0.7 + k * 0.38) + 0.6 : 0;
            const p = this.place(kind, "explosions", pos, (0.45 + k * 0.07) * Sound.vary(0.1), 0.35 + 0.65 * s01, Math.max(dur, xlen), 0.6 + k * 0.04, false, 0.4 + 0.5 * s01);
            if (!p)
                return;
            // near explosions are critical: re-mark the voice (admit gave it ordinary priority)
            if (p.dist < 120) {
                p.v.crit = true;
                this.counters.critical++;
            }
            if (p.dist < 400)
                this.markNear();
            const t = this.ctx.currentTime + 0.005, d = p.node, v = Sound.vary(0.1), far = Math.min(1, p.dist / 700), gap = p.dm.gap * 0.6, lod = p.dist > 450;
            const gb = k < 3.5 ? this.samples.get("grenadeBoom") : null;
            if (gb) { // Frontline: the designer's grenade explosion for small blasts (grenades, launcher rounds, rocket hits)
                const src = this.ctx.createBufferSource(), gg = this.ctx.createGain();
                src.buffer = gb;
                src.playbackRate.value = (1.08 - 0.06 * k) * v;
                gg.gain.value = 0.6; // hot recording: kept from pumping the mix (and the guns) down
                gg.connect(d);
                if (far > 0.25) {
                    const lp = this.ctx.createBiquadFilter();
                    lp.type = "lowpass";
                    lp.frequency.value = 9000 * (1.15 - far);
                    src.connect(lp).connect(gg);
                }
                else
                    src.connect(gg);
                src.start(t + gap * 0.5);
                this.cur?.srcs.push(src);
                this.explSamples = (this.explSamples ?? 0) + 1;
                this.grenadeBooms = (this.grenadeBooms ?? 0) + 1;
                return;
            }
            const xb = this.samples.get("explosion");
            if (xb) { // Frontline: the designer's explosion recording; small blasts pitched up and cut short, big ones full and deep
                const src = this.ctx.createBufferSource(), g = this.ctx.createGain(), rate = (1.55 - 0.7 * s01) * v, len = Math.min(xb.duration / rate, 0.7 + k * 0.38);
                src.buffer = xb;
                src.playbackRate.value = rate;
                g.gain.setValueAtTime(0.55, t + gap * 0.5); // the recording is hot (peaks over full scale): it pumped the mix down
                g.gain.setValueAtTime(0.55, t + gap * 0.5 + len * 0.6);
                g.gain.linearRampToValueAtTime(0.0001, t + gap * 0.5 + len);
                if (far > 0.25) { // distance takes the top off
                    const lp = this.ctx.createBiquadFilter();
                    lp.type = "lowpass";
                    lp.frequency.value = 9000 * (1.15 - far);
                    src.connect(lp).connect(g);
                }
                else
                    src.connect(g);
                g.connect(d);
                src.start(t + gap * 0.5);
                src.stop(t + gap * 0.5 + len + 0.05);
                this.cur?.srcs.push(src);
                this.explSamples = (this.explSamples ?? 0) + 1;
                if (k >= 5) // extra sub weight under the big ones
                    this.tone(t + gap, dur * 0.7, "sine", (70 - 30 * s01) * v, 22, 0.5 * s01, 0.006, d);
                return;
            }
            this.filtered(t, 0.025 + 0.01 * s01, "highpass", 2200 * v, 3200, 0.7, (0.6 + 0.3 * s01) * (1 - 0.7 * far), 0.0008, d); // crack
            this.filtered(t + 0.004 + gap, dur * 0.8, "lowpass", (3000 - 1400 * s01) * v * (1 - 0.5 * far), 90, 0.6, 0.9 + 0.1 * s01, 0.005, d); // body, filter falling
            this.tone(t + gap, dur * (0.45 + 0.4 * s01), "sine", (85 - 35 * s01) * v, 18 + 10 * (1 - s01), (0.6 + 0.4 * s01) * (0.8 + 0.3 * this.air.lowCarry), 0.006, d); // sub thump
            if (k >= 3)
                this.filtered(t + 0.06 + gap, dur * 1.3 * (1 + far * 0.5), "lowpass", 400 * v, 50, 0.6, 0.35 + 0.25 * s01 + 0.2 * far, 0.08, d); // rolling tail
            if (!lod) {
                // debris: short band-passed bursts scattered over the tail (more and later for larger blasts), then grit
                const n = 2 + Math.floor(k * 0.8);
                for (let i = 0; i < n; i++)
                    this.filtered(t + 0.1 + gap + Math.random() * dur * (0.4 + 0.4 * s01), 0.03 + Math.random() * 0.06, "bandpass", 800 + Math.random() * 2200, 500, 3, 0.12 + Math.random() * 0.15, 0.002, d);
                if (k >= 2)
                    this.filtered(t + 0.15 + gap, dur * 0.7, "highpass", 3500 * v, 2000, 0.7, 0.1 + 0.08 * s01, 0.1, d);
            }
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** C5: a support-call impact: the biggest explosion plus a long sub-bass boom with a rolling tail, heard far away. */
    callImpacts = 0;
    callImpact(pos) {
        this.callImpacts++;
        this.explosion(pos, 9);
        if (!this.ctx || !this.available)
            return;
        try {
            const p = this.place("callImpact", "explosions", pos, 1.0, 1, 2.4, 1, true, 0.8);
            if (!p)
                return;
            const t = this.ctx.currentTime + 0.01 + p.dm.gap * 0.5, d = p.node;
            this.tone(t, 1.6, "sine", 48, 18, 1.0, 0.01, d);
            this.filtered(t + 0.02, 2.0, "lowpass", 900, 60, 0.7, 0.9, 0.01, d);
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** A hit on the player (DAMAGE_TAKEN): a dull thud and a short ring; shield hits shimmer instead. Critical. */
    hurt(shield) {
        if (!this.ctx || !this.available)
            return;
        try {
            const p = this.place("hurt", "ui", null, 0.4, 0, 0.3, 1, true, 0);
            if (!p)
                return;
            const t = this.ctx.currentTime + 0.003, v = Sound.vary(0.08), d = p.node;
            if (shield) {
                this.filtered(t, 0.12, "bandpass", 2400 * v, 3600, 3, 0.35, 0.002, d);
                this.tone(t, 0.16, "sine", 1400 * v, 1000, 0.15, 0.003, d);
            }
            else {
                this.tone(t, 0.14, "sine", 120 * v, 60, 0.8, 0.002, d);
                this.filtered(t, 0.1, "lowpass", 1200 * v, 200, 0.7, 0.6, 0.002, d);
                this.filtered(t + 0.02, 0.18, "bandpass", 800, 500, 6, 0.12, 0.01, d);
            }
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** Shield absorbing a hit: a bright shimmering ring (FM). */
    shield(pos, own = false) {
        if (!this.ctx || !this.available)
            return;
        try {
            const p = this.place("shield", "explosions", own ? null : pos, (own ? 0.35 : 0.3) * Sound.vary(0.1), 0.2, 0.3, 0.35, own, 0.2);
            if (!p)
                return;
            const ctx = this.ctx, t = ctx.currentTime + 0.005;
            const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
            const fv = Sound.vary(0.08);
            car.type = "sine";
            car.frequency.setValueAtTime(1750 * fv, t);
            car.frequency.exponentialRampToValueAtTime(1100 * fv, t + 0.25);
            mod.type = "sine";
            mod.frequency.value = 37 * Sound.vary(0.2);
            mg.gain.value = 260;
            mod.connect(mg);
            mg.connect(car.frequency);
            car.connect(g);
            g.connect(p.node);
            this.env(g, t, 0.35, 0.004, 0.26);
            car.start(t);
            mod.start(t);
            car.stop(t + 0.32);
            mod.stop(t + 0.32);
            p.v.srcs.push(car, mod);
            this.mk(4);
            if (p.dist < 300)
                this.filtered(t, 0.14, "highpass", 4000, 7000, 0.7, 0.18, 0.002, p.node);
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** Hit-marker tick (kill: a lower double tick). */
    hit(kill) {
        if (!this.ctx || !this.available)
            return;
        try {
            const p = this.place(kill ? "kill" : "hit", "ui", null, 0.32, 0, 0.15, 1, true, 0);
            if (!p)
                return;
            const t = this.ctx.currentTime + 0.003;
            this.tone(t, 0.03, "triangle", kill ? 1700 : 2700, kill ? 1500 : 2500, 0.5, 0.001, p.node);
            if (kill)
                this.tone(t + 0.07, 0.05, "triangle", 1300, 1100, 0.5, 0.001, p.node);
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** Hull-critical alarm: two square beeps; call every frame while critical (it repeats itself every 1.1 s). */
    alarm(now) {
        if (!this.ctx || !this.available || now - this.lastAlarm < 1100)
            return;
        this.lastAlarm = now;
        try {
            const p = this.place("alarm", "ui", null, 0.18, 0, 0.4, 1, true, 0);
            if (!p)
                return;
            const t = this.ctx.currentTime + 0.005;
            this.tone(t, 0.12, "square", 880, 870, 0.5, 0.004, p.node);
            this.tone(t + 0.17, 0.12, "square", 660, 650, 0.5, 0.004, p.node);
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** Unit acknowledgement (C2, ORDER_ACK): a voice-like radio chirp of the unit's class (nextChirp, set by p1-sound.ts) or a light one. */
    blipCount = 0;
    lastChirp = null;
    blip() {
        const c = this.nextChirp;
        this.nextChirp = null;
        this.blipCount++;
        if (this.takeReplace("blip"))
            return;
        if (c)
            this.chirp(c.cls, c.order);
        else
            this.cue("blip"); // no unit behind it (call code steps): the old radio blip
    }
    /**
     * A synthesized "voice-like" acknowledgement (not speech): a buzz at the class's pitch through two formant band-passes
     * that move between syllables (vowel-like), gated per syllable, band-limited like a radio, with a key-up click.
     */
    chirp(cls, order) {
        if (!this.ctx || !this.available)
            return;
        try {
            const V = sound_table_ts_1.VOICES[cls] ?? sound_table_ts_1.VOICES.light, c = (0, sound_table_ts_1.ackContour)(order);
            const n = V.syll, dur = n * V.step + 0.08;
            const p = this.place("chirp", "ui", null, V.level * c.accent, 0, dur + 0.05, 1, true, 0);
            if (!p)
                return;
            this.lastChirp = { cls, order };
            const ctx = this.ctx, t = ctx.currentTime + 0.004, pv = Sound.vary(0.05);
            const o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain();
            o.type = V.wave;
            f1.type = "bandpass";
            f2.type = "bandpass";
            f1.Q.value = 6;
            f2.Q.value = 8;
            g2.gain.value = 0.6;
            o.connect(f1);
            o.connect(f2);
            f1.connect(g);
            f2.connect(g2);
            g2.connect(g);
            g.connect(p.node);
            g.gain.setValueAtTime(0.0001, t);
            for (let i = 0; i < n; i++) {
                const ts = t + i * V.step, k = i / Math.max(1, n - 1), pitch = V.pitch * pv * (1 + (c.glide - 1) * k) * (i === 0 ? 1.04 : 1);
                o.frequency.setValueAtTime(pitch, ts);
                o.frequency.linearRampToValueAtTime(pitch * (i % 2 ? 0.96 : 1.03), ts + V.step * 0.8);
                const vow = i % 2 ? 0.8 : 1.15; // alternate vowels
                f1.frequency.setValueAtTime(V.f1 * vow * pv, ts);
                f2.frequency.setValueAtTime(V.f2 / vow * pv, ts);
                g.gain.setTargetAtTime(0.9, ts, 0.006);
                g.gain.setTargetAtTime(0.0001, ts + V.step * 0.75, 0.012);
            }
            o.start(t);
            o.stop(t + dur);
            p.v.srcs.push(o);
            this.mk(5);
            this.filtered(t - 0.002, 0.012, "bandpass", 2500, 2200, 1.5, 0.25, 0.0005, p.node); // key-up
            this.filtered(t + n * V.step, 0.02, "bandpass", 2000, 1800, 1.5, 0.15, 0.0005, p.node); // key-down
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    ui(kind) {
        if (this.takeReplace(`ui:${kind}`))
            return;
        this.cue(kind, null);
    }
    // ---------------------------------------------------------------- cues
    /** Plays a cue of the table (CUES) at pos (null: centred). level / pitch: factors. Returns whether it played. */
    cue(id, pos = null, level = 1, pitch = 1) {
        this.cueCounts[id] = (this.cueCounts[id] ?? 0) + 1;
        if (!this.ctx || !this.available)
            return false;
        const def = sound_table_ts_1.CUES[id];
        if (!def)
            return false;
        try {
            let dur = 0;
            for (const x of def.parts)
                dur = Math.max(dur, x.at + x.a + x.d);
            const size = def.ref ? Math.min(1, def.ref / 250) : 0.3;
            const p = this.place(id, def.bus, pos, def.level * level * Sound.vary(0.06), size, dur + 0.05, def.prio, !!def.crit, def.verb ?? 0);
            if (!p)
                return false;
            const t = this.ctx.currentTime + 0.004, pv = pitch * Sound.vary(0.03);
            for (const x of def.parts)
                this.part(t, x, pv, p.node, p.dist > 450);
            return true;
        }
        catch {
            return false;
        }
        finally {
            this.cur = null;
        }
    }
    part(t, x, pitch, d, lod) {
        if (lod && x.g < 0.15)
            return; // far: the small layers go
        const lv = Sound.vary(0.08);
        if (x.k === "t")
            this.tone(t + x.at, x.d, x.w, x.f0 * pitch, x.f1 * pitch, x.g * lv, x.a, d);
        else
            this.filtered(t + x.at, x.d, x.ft, x.f0 * pitch * Sound.vary(0.05), x.f1 * pitch, x.q, x.g * lv, x.a, d);
    }
    /**
     * Replaces the next sting / ui / blip of a kind within ms (p1-sound.ts calls it just before main.ts plays the old
     * sound for an event, so the call site stays as it was): cue null silences it; pos: where the new cue plays.
     */
    replaceNext(kind, cue, pos = null, ms = 50) { this.replace.set(kind, { cue, pos, until: performance.now() + ms }); }
    /** Drops replacements not used (p1-sound.ts: at every event and frame, so one never outlives its dispatch). */
    clearReplace() { if (this.replace.size)
        this.replace.clear(); }
    takeReplace(kind) {
        const r = this.replace.get(kind);
        if (!r)
            return false;
        this.replace.delete(kind);
        if (performance.now() > r.until)
            return false;
        if (r.cue)
            this.cue(r.cue, r.pos);
        return true;
    }
    /** Crew and game stingers (any CUES id); counted by kind (tests). */
    sting(kind, pos = null) {
        this.stingCounts[kind] = (this.stingCounts[kind] ?? 0) + 1;
        if (this.takeReplace(kind))
            return;
        this.cue(kind, pos);
    }
    // ---------------------------------------------------------------- loops
    /**
     * A persistent loop by key: created on the first call with level > 0, updated every frame (level, pitch, position),
     * released after 2 s at level 0. pos null: centred. At MAX_LOOPS the quietest other loop is released first.
     */
    loop(key, def, level, pitch = 1, pos = null, prio = level) {
        if (!this.ctx || !this.available)
            return;
        try {
            const ctx = this.ctx, t = ctx.currentTime;
            let L = this.loops.get(key);
            if (!L) {
                if (level <= 0.001)
                    return;
                if (this.loops.size >= Sound.MAX_LOOPS) {
                    let q = null;
                    for (const x of this.loops.values())
                        if (!q || x.prio < q.prio)
                            q = x;
                    if (!q || q.prio >= prio)
                        return;
                    this.release(q);
                }
                L = this.makeLoop(key, def);
                this.loops.set(key, L);
            }
            // distance, pan, Doppler (range rate: approaching raises the pitch)
            let g = level, cut = 20000, pan = 0;
            if (pos) {
                const dx = pos[0] - this.eye[0], dy = pos[1] - this.eye[1], dz = pos[2] - this.eye[2], dist = Math.hypot(dx, dy, dz);
                const dm = (0, sound_table_ts_1.distanceModel)(dist, Math.min(1, def.ref / 250), this.air);
                g *= dm.gain;
                cut = dm.cutoff;
                pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * this.right[0] + dy * this.right[1] + dz * this.right[2]) / dist)) * 0.85 : 0;
                const dtl = t - L.lastT;
                if (L.lastT > 0 && dtl > 0.005 && dtl < 0.5) {
                    const vr = (dist - L.lastDist) / dtl;
                    const dop = Math.max(0.75, Math.min(1.3, 343 / (343 + vr)));
                    L.dop += (dop - L.dop) * Math.min(1, dtl * 6);
                }
                L.lastDist = dist;
                L.lastT = t;
                L.pos = pos;
            }
            L.level = level;
            L.pitch = pitch;
            L.prio = level > 0.001 ? prio : 0;
            if (level > 0.001)
                L.quietSince = -1;
            else if (L.quietSince < 0)
                L.quietSince = t;
            // the automation is sent only when a value moved (> 2 %) or every 0.25 s: a loop updated every frame would
            // otherwise queue some 60 events a second on each of its parameters
            const pf = pitch * L.dop, S = L.sent;
            const moved = (a, b) => Math.abs(a - b) > 0.02 * Math.max(Math.abs(a), Math.abs(b), 1e-4);
            if (t - S.t > 0.25 || moved(g, S.g) || moved(cut, S.cut) || Math.abs(pan - S.pan) > 0.03 || moved(pf, S.pf) || (g === 0) !== (S.g === 0)) {
                L.out.gain.setTargetAtTime(g, t, 0.08);
                L.f.frequency.setTargetAtTime(cut, t, 0.1);
                if (L.p)
                    L.p.pan.setTargetAtTime(pan, t, 0.05);
                for (const ly of L.layers) {
                    const fr = ly.osc ? ly.osc.frequency : null;
                    if (ly.rate)
                        ly.rate.setTargetAtTime(pf, t, 0.15);
                    else if (fr)
                        fr.setTargetAtTime(ly.base * pf, t, 0.1);
                    else if (ly.f)
                        ly.f.frequency.setTargetAtTime(Math.min(18000, ly.base * pf), t, 0.1);
                }
                L.sent = { t, g, cut, pan, pf };
            }
            // pulses: periodic cues (Strider footfalls, heartbeat, fuse beeps, fire crackle)
            if (def.pulse && level > 0.05 && t >= L.nextPulse) {
                const every = def.pulse.every / Math.max(0.3, pitch);
                L.nextPulse = t + every * (1 + (Math.random() * 2 - 1) * (def.pulse.jitter ?? 0));
                this.cue(def.pulse.cue, pos, Math.min(1.5, level * 1.5));
            }
            if (L.quietSince >= 0 && t - L.quietSince > 2)
                this.release(L);
        }
        catch { /* ignore */ }
    }
    makeLoop(key, def) {
        const ctx = this.ctx, out = ctx.createGain(), f = ctx.createBiquadFilter(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        out.gain.value = 0;
        f.type = "lowpass";
        f.frequency.value = 20000;
        out.connect(f);
        if (p) {
            f.connect(p);
            p.connect(this.buses[def.bus]);
        }
        else
            f.connect(this.buses[def.bus]);
        this.mk(p ? 3 : 2);
        const layers = [];
        for (const ly of def.layers)
            layers.push(this.loopLayer(ly, out));
        this.counters.loops++;
        return { key, def, layers, out, f, p, level: 0, pitch: 1, prio: 0, quietSince: -1, nextPulse: 0, lastDist: 0, lastT: 0, dop: 1, pos: null, sent: { t: -1, g: -1, cut: -1, pan: 9, pf: -1 } };
    }
    loopLayer(ly, dest) {
        const ctx = this.ctx, g = ctx.createGain();
        g.gain.value = ly.gain;
        let src, f = null, osc = null, rate = null;
        const smp = ly.src === "sample" ? this.samples.get(ly.name) : null;
        if (smp) { // Frontline: a recorded loop (the gunship's turbine); the loop's pitch drives its playback rate
            const s = ctx.createBufferSource();
            s.buffer = smp;
            s.loop = true;
            s.loopStart = ly.loopStart ?? 0;
            s.loopEnd = ly.loopEnd ?? smp.duration;
            src = s;
            rate = s.playbackRate;
            s.connect(g);
            this.mk(2);
            s.start(ctx.currentTime, (ly.loopStart ?? 0) + Math.random() * 0.5);
        }
        else if (ly.src === "noise" || ly.src === "sample") {
            const s = ctx.createBufferSource();
            s.buffer = this.noise;
            s.loop = true;
            src = s;
            f = ctx.createBiquadFilter();
            f.type = ly.ft ?? "bandpass";
            f.frequency.value = ly.f;
            f.Q.value = ly.q ?? 0.8;
            s.connect(f);
            f.connect(g);
            this.mk(3);
            s.start(ctx.currentTime, Math.random() * 0.9);
        }
        else {
            const o = ctx.createOscillator();
            o.type = ly.src;
            o.frequency.value = ly.f;
            if (ly.detune)
                o.detune.value = ly.detune;
            src = o;
            osc = o;
            o.connect(g);
            this.mk(2);
            o.start();
        }
        g.connect(dest);
        let lfo = null;
        if (ly.lfo && ly.lfoDepth) {
            lfo = ctx.createOscillator();
            const lg = ctx.createGain();
            lfo.frequency.value = ly.lfo * Sound.vary(0.2);
            lg.gain.value = ly.gain * ly.lfoDepth * 0.5;
            g.gain.value = ly.gain * (1 - ly.lfoDepth * 0.5);
            lfo.connect(lg);
            lg.connect(g.gain);
            lfo.start();
            this.mk(2);
        }
        return { src, osc, f, g, base: ly.f, gain: ly.gain, lfo, rate };
    }
    release(L) {
        try {
            const t = this.ctx.currentTime;
            L.out.gain.setTargetAtTime(0, t, 0.05);
            for (const ly of L.layers) {
                ly.src.stop(t + 0.3);
                ly.lfo?.stop(t + 0.3);
            }
            setTimeoutSafe(() => { try {
                L.out.disconnect();
            }
            catch { /* ignore */ } }, 400);
        }
        catch { /* ignore */ }
        this.loops.delete(L.key);
        this.counters.loopsReleased++;
    }
    /** Sets the level of every loop whose key starts with prefix and is not in keep to 0 (they release themselves). */
    fadeLoops(prefix, keep) {
        for (const L of [...this.loops.values()])
            if (L.key.startsWith(prefix) && !keep.has(L.key))
                this.loop(L.key, L.def, 0, L.pitch, L.pos);
    }
    get loopCount() { return this.loops.size; }
    loopKeys() { return [...this.loops.keys()]; }
    /** An engine loop definition for a vehicle class at a load (0..1). */
    static engineDef(cls) {
        const E = sound_table_ts_1.ENGINES[cls] ?? sound_table_ts_1.ENGINES.tank;
        const layers = [
            { src: "triangle", f: E.base, gain: 0.5, lfo: 5.3, lfoDepth: 0.15 },
            { src: "triangle", f: E.base * 1.007, gain: 0.35 },
            { src: "sine", f: E.base / 2, gain: 0.45 },
            { src: "noise", ft: "bandpass", f: E.noiseF, q: E.noiseQ, gain: E.noise, lfo: 0.7, lfoDepth: 0.25 },
        ];
        if (cls === "strider") {
            // W1 (designer 16 Nov): the walker has no hover hum: a servo whine that rises with the gait over a low hydraulic
            // rumble; its footfalls are separate cues per foot (footfall)
            return { bus: "vehicles", ref: 120, layers: [
                    { src: "sawtooth", f: E.whineF, gain: E.whine * 0.18, lfo: 2.1, lfoDepth: 0.6 },
                    { src: "sine", f: E.whineF * 1.5, gain: E.whine * 0.22, lfo: 1.3, lfoDepth: 0.5 },
                    { src: "sine", f: E.base, gain: 0.25, lfo: 0.5, lfoDepth: 0.3 },
                    { src: "noise", ft: "bandpass", f: E.noiseF, q: E.noiseQ, gain: E.noise, lfo: 0.9, lfoDepth: 0.4 }, // layer 3: setEngine opens it with the load
                ] };
        }
        if (cls === "jet") {
            // Frontline: the gunship's turbine, the designer's recorded loop (pitch: its playback rate), a low rumble under it;
            // layer 3 is the band setEngine opens with the load (quiet here). Without the recording: a synth roar.
            return { bus: "vehicles", ref: 260, layers: [
                    { src: "sample", name: "gunshipEngine", loopStart: 0.06, loopEnd: 2.88, f: 900, ft: "lowpass", gain: 1.1 },
                    { src: "sine", f: E.base, gain: 0.25, lfo: 0.6, lfoDepth: 0.2 },
                    { src: "sine", f: E.whineF, gain: 0.0001 },
                    { src: "noise", ft: "bandpass", f: E.noiseF, q: E.noiseQ, gain: E.noise, lfo: 0.8, lfoDepth: 0.2 },
                ] };
        }
        if (E.whine > 0)
            layers.push({ src: "sine", f: E.whineF, gain: E.whine * 0.25, lfo: 3.7, lfoDepth: 0.3 });
        return { bus: "vehicles", ref: cls === "aircraft" ? 220 : cls === "heavy" ? 120 : 70, layers, pulse: E.stomp > 0 ? { every: 0.75, cue: "stomp", jitter: 0.05 } : undefined };
    }
    engineDefs = new Map();
    engineDefOf(cls) { let d = this.engineDefs.get(cls); if (!d) {
        d = Sound.engineDef(cls);
        this.engineDefs.set(cls, d);
    } return d; }
    /**
     * Another vehicle's engine (p1-sound.ts: the nearest few moving vehicles): class, speed fraction 0..1, position.
     * Pitch follows speed (and Doppler from the range rate), level the speed.
     */
    vehicle(id, cls, speedFrac, pos, level = 1) {
        if (cls === "none")
            return;
        const E = sound_table_ts_1.ENGINES[cls];
        this.loop(`veh:${id}`, this.engineDefOf(cls), level * E.level * 2.2 * (0.35 + 0.65 * speedFrac), 1 + E.rise * speedFrac, pos);
    }
    /**
     * The player's own engine: follows the thrust (0..1, the load) and the speed fraction (0..1); level 0 silences it.
     * The class (engineClass, set by p1-sound.ts per vehicle) chooses the voice: bike whine, tank drone, Strider, aircraft.
     */
    boostRev = 0;
    setEngine(thrust, speedFrac, level) {
        if (!this.ctx || !this.available)
            return;
        try {
            const cls = this.engineClass === "none" ? "tank" : this.engineClass, E = sound_table_ts_1.ENGINES[cls];
            const key = `engine:${cls}`;
            if (this.engine && this.engine.key !== key) {
                this.loop(this.engine.key, this.engine.def, 0);
                this.engine = null;
            }
            const k = Math.max(thrust, speedFrac), load = thrust;
            if (level <= 0 && !this.engine)
                return;
            this.boostRev += ((this.boostSrc ? 1 : 0) - this.boostRev) * 0.06; // eased in and out over ~0.5 s
            const rev = this.boostRev; // Frontline: the boost revs the engine itself (pitch and level), under the afterburner layer
            this.loop(key, this.engineDefOf(cls), level * E.level * (0.55 + 0.45 * k) * (1 + 0.35 * rev), (1 + E.rise * k * 0.8 + 0.15 * load) * (1 + 0.18 * rev), null, 10);
            this.engine = this.loops.get(key) ?? null;
            if (this.engine) {
                const t = this.ctx.currentTime, nz = this.engine.layers[3];
                if (nz?.f)
                    nz.f.frequency.setTargetAtTime(E.noiseF * (0.6 + E.noiseRise * (0.4 * load + 0.4 * speedFrac)), t, 0.2); // load opens the turbine band
                if (nz)
                    nz.g.gain.setTargetAtTime(E.noise * (0.5 + 0.8 * load), t, 0.2);
                this.counters.byKind.engine = 1;
            }
        }
        catch { /* ignore */ }
    }
    /**
     * W1: one walker footfall at pos (the sole that just landed; foot 0..3 for a slight pitch per leg; amp 0..1 the gait):
     * a heavy low thud ("stomp", distance-attenuated by the world bus) and the leg's servo whine ("walker-servo").
     */
    footfall(pos, foot, amp, mech = false) {
        if (this.stompSample(pos, foot, amp, mech))
            return; // Frontline: the designer's heavy mechanical footsteps
        const pitch = 0.88 + 0.06 * foot + (Math.random() - 0.5) * 0.06;
        this.cue("stomp", pos, 0.55 + 0.45 * Math.min(1, amp), pitch);
        if (amp > 0.15 || foot % 2 === 0)
            this.cue("walker-servo", pos, 0.5 + 0.5 * Math.min(1, amp), 0.9 + 0.08 * foot);
    }
    // ---------------------------------------------------------------- client slice 3: pilot on foot
    /** A footstep (intensity 0..1: walk / sprint), or a landing; by surface and stance. Centred (the player's own). */
    step(intensity, land = false) {
        if (!this.ctx || !this.available)
            return;
        try {
            const s = sound_table_ts_1.SURFACES[this.surface] ?? sound_table_ts_1.SURFACES.dirt, st = this.stance;
            const lvl = (land ? 0.45 : 0.16) * (0.6 + 0.4 * intensity) * (st === 1 ? 0.6 : st === 2 ? 0.45 : 1) * Sound.vary(0.15);
            const p = this.place(land ? "land" : "step", "ui", null, lvl, 0, 0.2, 0.9, land, 0.05);
            if (!p)
                return;
            const t = this.ctx.currentTime + 0.003, v = 1 + (Math.random() - 0.5) * 0.3, d = p.node;
            if (st === 2 && !land) { // prone: a crawl, cloth and gear dragging
                this.filtered(t, 0.18, "bandpass", 700 * v, 400, 1.2, 0.6, 0.03, d);
                this.filtered(t + 0.05, 0.06, "highpass", s.gritF * v, s.gritF * 0.8, 0.7, s.grit * 0.6, 0.01, d);
                return;
            }
            this.filtered(t, land ? 0.18 : s.dur, "lowpass", (land ? s.thudF * 1.3 : s.thudF) * v, 120, 0.8, 1.0, 0.003, d);
            this.filtered(t + 0.004, 0.04 + s.dur * 0.3, "bandpass", s.gritF * v, s.gritF * 0.6, 1.6, s.grit * (0.6 + 0.6 * intensity), 0.001, d); // grit
            if (s.splash > 0)
                this.filtered(t + 0.01, 0.15, "bandpass", 1200 * v, 500, 1.2, s.splash, 0.01, d);
            if (s.ring > 0)
                this.tone(t, 0.06, "triangle", 1800 * v, 1500, s.ring * 0.3, 0.001, d);
            if (st === 0 && intensity > 0.7)
                this.filtered(t + 0.03, 0.03, "bandpass", 3200 * v, 2800, 6, 0.08, 0.001, d); // gear rattle when sprinting
            if (land)
                this.tone(t, 0.14, "sine", 90, 40, 0.8, 0.004, d);
        }
        catch { /* ignore */ }
        finally {
            this.cur = null;
        }
    }
    /** Jetpack: a whoosh only (band-passed noise; the sawtooth thrust hum was removed, playtest); level 0 silences it (persistent voice). */
    setJet(level) {
        if (!this.ctx || !this.available)
            return;
        try {
            const ctx = this.ctx, t = ctx.currentTime;
            if (!this.jet) {
                if (level <= 0)
                    return;
                const src = ctx.createBufferSource();
                src.buffer = this.noise;
                src.loop = true;
                const f = ctx.createBiquadFilter();
                f.type = "bandpass";
                f.Q.value = 0.9;
                f.frequency.value = 1500;
                const g = ctx.createGain();
                g.gain.value = 0;
                src.connect(f);
                f.connect(g);
                g.connect(this.buses.ui);
                src.start();
                this.jet = { src, f, g };
                this.jetLayers = ["noise-bandpass"];
                this.jetNodes = ["BufferSource", "BiquadFilter", "Gain"];
                this.mk(3);
                this.counters.byKind.jet = 1;
            }
            const j = this.jet;
            j.g.gain.setTargetAtTime(level * 0.16, t, level > 0 ? 0.04 : 0.12);
            j.f.frequency.setTargetAtTime(1100 + 900 * level, t, 0.1);
            if (level > 0)
                this.counters.byKind.jetOn = (this.counters.byKind.jetOn ?? 0) + 1;
        }
        catch { /* ignore */ }
    }
    /** Repair torch: a hissing flame with a buzzing arc; level 0 silences it (persistent voice). */
    setTorch(level) {
        if (!this.ctx || !this.available)
            return;
        try {
            const ctx = this.ctx, t = ctx.currentTime;
            if (!this.torchV) {
                if (level <= 0)
                    return;
                const src = ctx.createBufferSource();
                src.buffer = this.noise;
                src.loop = true;
                const f = ctx.createBiquadFilter();
                f.type = "highpass";
                f.frequency.value = 2800;
                const g = ctx.createGain();
                g.gain.value = 0;
                const o = ctx.createOscillator();
                o.type = "square";
                o.frequency.value = 118;
                const og = ctx.createGain();
                og.gain.value = 0;
                src.connect(f);
                f.connect(g);
                g.connect(this.buses.ui);
                o.connect(og);
                og.connect(this.buses.ui);
                src.start();
                o.start();
                this.mk(5);
                this.torchV = { src, f, g, o, og };
                this.counters.byKind.torch = 1;
            }
            const v = this.torchV;
            v.g.gain.setTargetAtTime(level * 0.12, t, 0.05);
            v.og.gain.setTargetAtTime(level * 0.018, t, 0.05);
            v.o.frequency.setTargetAtTime(110 + Math.random() * 20, t, 0.02);
            if (level > 0)
                this.counters.byKind.torchOn = (this.counters.byKind.torchOn ?? 0) + 1;
        }
        catch { /* ignore */ }
    }
    // ---------------------------------------------------------------- beds: weather and planet
    bedKey = "";
    /**
     * Weather and planet beds (sound-table.ts WEATHER_BEDS, PLANET_BEDS): wind with gusts, rain, rumble, ash crackle,
     * static, and a planet floor (wind, drone, occasional small sounds). k 0..1: how far the weather has eased in.
     * Fog (still) ducks the ambience. Thunder comes in rolls at random during an electrical storm.
     */
    beds(weatherId, planet, k, on, dt) {
        const W = sound_table_ts_1.WEATHER_BEDS[weatherId ?? "clear"] ?? sound_table_ts_1.WEATHER_BEDS.clear, P = sound_table_ts_1.PLANET_BEDS[planet] ?? sound_table_ts_1.PLANET_BEDS.halcyon;
        const lv = on ? 1 : 0, key = `${weatherId ?? "clear"}`, rate = Math.min(0.2, Math.max(0, dt));
        if (key !== this.bedKey) {
            this.fadeLoops("wx:", new Set());
            this.bedKey = key;
        }
        const B = BED_DEFS, D = this.planetDefs(P);
        // planet floor
        if (P.wind > 0)
            this.loop("amb:wind", D.wind, lv * P.wind * 0.35 * (1 - 0.5 * W.still), 1, null, 3);
        if (P.drone > 0)
            this.loop("amb:drone", D.drone, lv * P.drone * 0.4, 1, null, 3);
        if (on && P.detail && Math.random() < rate / P.detailEvery && W.still < 0.5) {
            const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 60;
            this.cue(P.detail, [this.eye[0] + Math.cos(a) * r, this.eye[1], this.eye[2] + Math.sin(a) * r], 1, Sound.vary(0.15));
        }
        // weather
        const wk = lv * k;
        if (W.wind > 0)
            this.loop("wx:wind", B.wind, wk * W.wind * 0.45, 1, null, 3);
        if (W.rain > 0)
            this.loop("wx:rain", B.rain, wk * W.rain * 0.4, 1, null, 3);
        if (W.rumble > 0)
            this.loop("wx:rumble", B.rumble, wk * W.rumble * 0.6, 1, null, 3);
        if (W.ash > 0)
            this.loop("wx:ash", B.ash, wk * W.ash * 0.25, 1, null, 3);
        if (W.staticNoise > 0)
            this.loop("wx:static", B.staticNoise, wk * W.staticNoise * 0.25, 1, null, 3);
        if (W.still > 0)
            this.loop("wx:still", B.still, wk * W.still * 0.12, 1, null, 3);
        let thunder = false;
        if (on && W.thunder > 0 && k > 0.5 && Math.random() < rate * W.thunder / 14) {
            thunder = true;
            this.cue("thunder", null, 0.7 + Math.random() * 0.5, Sound.vary(0.15));
        }
        if (on && W.gusts > 0 && k > 0.5 && Math.random() < rate * W.gusts / 6)
            this.cue("weather-gust", null, 0.6 + Math.random() * 0.6, Sound.vary(0.2));
        return { duck: 1 - 0.55 * W.still * k, thunder };
    }
    planetDef = null;
    planetDefs(P) {
        if (this.planetDef?.key !== P)
            this.planetDef = { key: P,
                wind: { bus: "ambience", ref: 100, layers: [{ src: "noise", ft: "bandpass", f: P.windF, q: 0.7, gain: 1, lfo: 0.09, lfoDepth: 0.6 }] },
                drone: { bus: "ambience", ref: 100, layers: [{ src: "sine", f: P.droneF, gain: 1, lfo: 0.13, lfoDepth: 0.4 }, { src: "noise", ft: "lowpass", f: 160, gain: 0.6 }] } };
        return this.planetDef;
    }
    /** Debug / tests: the state of the mixer. */
    mixer() {
        return { volume: this.volume, effects: this.effects, music: this.music, muted: this.muted, voices: this.activeVoices, busVoices: this.busVoices(), loops: this.loopKeys(), strips: this.strips.length, nodes: this.counters.nodes, space: this.space, surface: this.surface, stance: this.stance };
    }
}
exports.Sound = Sound;
/** setTimeout when there is one (Node tests have it too). */
function setTimeoutSafe(f, ms) { try {
    globalThis.setTimeout(f, ms);
}
catch { /* ignore */ } }
