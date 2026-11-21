"use strict";
// P1 sound pass: the music player. Tracks are separate files beside the page (a `music/` folder with a small
// `music/tracks.json` manifest, see music/README.md), never inlined into the page. Each track has a role (menu,
// battle, tension, victory, defeat); the player crossfades between roles as the game state changes:
//   menu (start overlay) -> menu; calm (in a battle, no fire nearby) -> tension (or a track with role "calm");
//   combat (several shots / explosions near the player in the last 8 s; held 20 s after the last) -> battle;
//   match over -> victory / defeat.
// Several tracks of one role play in turn. No manifest, an empty one, a missing file or a refused play: silence, no
// error thrown. The page works as one self-contained file too (the published artifact page): there is no folder
// beside it, so the player detects such a page (not served from an http(s) address of its own) and never fetches.
// Streaming HTMLAudioElements (no decoding into memory, no Web Audio dependency); the level is master x music.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicPlayer = exports.CombatDetector = exports.FADE_S = exports.STATE_ROLES = exports.MUSIC_ROLES = void 0;
exports.parseManifest = parseManifest;
exports.isServedPage = isServedPage;
exports.musicState = musicState;
exports.MUSIC_ROLES = ["menu", "battle", "tension", "victory", "defeat"];
/** The roles a state plays, best first ("calm" is accepted as an alias of tension). */
exports.STATE_ROLES = {
    menu: ["menu"], calm: ["tension", "calm"], combat: ["battle"], victory: ["victory"], defeat: ["defeat"], cinematic: [],
};
/** Crossfade time (s) into a state. */
exports.FADE_S = { menu: 3, calm: 4, combat: 1.5, victory: 2, defeat: 2, cinematic: 1.5 }; // cinematic: silence (the opening cinematic plays its own music)
/** Validates a parsed manifest ({ tracks: [...] } or a bare array); entries without an id, a file or a known role are skipped. */
function parseManifest(json) {
    const list = Array.isArray(json) ? json : (json && typeof json === "object" && Array.isArray(json.tracks)) ? json.tracks : [];
    const out = [];
    for (const x of list) {
        if (!x || typeof x !== "object")
            continue;
        const r = x;
        const role = String(r.role ?? "");
        if (typeof r.id !== "string" || !r.id || typeof r.file !== "string" || !r.file)
            continue;
        if (!exports.MUSIC_ROLES.includes(role) && role !== "calm")
            continue;
        if (/^[a-z]+:|^\/\/|\.\.(\/|\\)/i.test(r.file))
            continue; // files beside the page only: no URLs, no parent paths
        out.push({ id: r.id, title: typeof r.title === "string" ? r.title : r.id, file: r.file, role: role, credit: typeof r.credit === "string" ? r.credit : "", licence: typeof r.licence === "string" ? r.licence : "", planets: Array.isArray(r.planets) ? r.planets.filter((x) => typeof x === "string") : [] });
    }
    return out;
}
/** Hosts that serve the page as a single published file (an artifact viewer): no music folder can sit beside it. */
const SINGLE_FILE_HOSTS = []; // Frontline (19 Nov): the published artifact is several files, the music folder among them: every http(s) page tries
/**
 * Whether the page is served from a real address of its own (http or https, a host name, an origin): only then can a
 * `music/` folder be beside it. file:, blob:, data:, about:srcdoc pages and artifact viewer hosts: false.
 * `?music=0` turns it off; `?music=1` forces it on (a local server on an unusual host).
 */
function isServedPage(loc) {
    const q = new URLSearchParams(loc.search ?? "");
    if (q.get("music") === "0")
        return false;
    if (q.get("music") === "1")
        return true;
    if (loc.protocol !== "http:" && loc.protocol !== "https:")
        return false;
    if (/^about:/i.test(loc.href ?? ""))
        return false; // (an opaque-origin sandbox frame still fetches its own files: a missing folder is silence, not an error)
    return !SINGLE_FILE_HOSTS.some((re) => re.test(loc.hostname));
}
/** Combat by nearby fire: in when `enter` shots / explosions fell near the player in the last 8 s, out after `holdS` s with fewer than `stay`. */
class CombatDetector {
    combat = false;
    lastBusy = -1e9;
    enter;
    stay;
    holdS;
    constructor(enter = 6, stay = 2, holdS = 20) { this.enter = enter; this.stay = stay; this.holdS = holdS; }
    update(nearCount8s, nowS) {
        if (nearCount8s >= (this.combat ? this.stay : this.enter))
            this.lastBusy = nowS;
        this.combat = nowS - this.lastBusy < this.holdS && this.lastBusy > -1e9;
        return this.combat;
    }
}
exports.CombatDetector = CombatDetector;
/** The music state from the game state. won: null while running. */
function musicState(g) {
    if (g.cinematic)
        return "cinematic";
    if (!g.started)
        return "menu";
    if (g.over)
        return g.won ? "victory" : "defeat";
    return g.combat ? "combat" : "calm";
}
class MusicPlayer {
    /** off-page: not served from a real address (silent, never fetches); idle: not loaded yet; loading; none: no manifest or no tracks; ready. */
    status = "idle";
    tracks = [];
    state = "menu";
    /** The track playing loudest (null: silence). */
    current = null;
    counters = { fetches: 0, plays: 0, errors: 0, switches: 0 };
    decks = new Map();
    next = {}; // per role: index of the next track in turn
    want = null;
    fetchFn;
    makeAudio;
    nowS = 0;
    constructor(opts) {
        this.base = opts.base ?? "music/";
        this.fetchFn = opts.fetchFn ?? null;
        this.makeAudio = opts.makeAudio ?? null;
        if (!opts.served || !this.fetchFn || !this.makeAudio)
            this.status = "off-page";
    }
    base;
    /** Fetches music/tracks.json once (silent on any failure). */
    async load() {
        if (this.status !== "idle")
            return;
        this.status = "loading";
        this.counters.fetches++;
        try {
            const r = await this.fetchFn(`${this.base}tracks.json`);
            if (!r.ok) {
                this.status = "none";
                return;
            }
            this.tracks = parseManifest(await r.json());
            this.status = this.tracks.length ? "ready" : "none";
        }
        catch {
            this.status = "none";
            this.counters.errors++;
        }
    }
    /** Per frame: the state to play, the frame time (s) and the level (master x music, 0..1). */
    update(state, dt, level) {
        this.nowS += dt;
        if (state !== this.state) {
            this.state = state;
            this.want = null;
            this.counters.switches++;
        }
        if (this.status !== "ready")
            return;
        try {
            if (!this.want || this.want.bad || this.want.ended)
                this.want = this.pick(state);
            const fade = exports.FADE_S[state];
            let loud = null;
            for (const d of this.decks.values()) {
                const target = d === this.want && !d.bad ? 1 : 0;
                d.v += Math.sign(target - d.v) * Math.min(Math.abs(target - d.v), dt / fade);
                try {
                    d.el.volume = Math.max(0, Math.min(1, d.v * level));
                }
                catch { /* ignore */ }
                if (target > 0 && d.el.paused && !d.pending && !d.loading && this.nowS >= d.blockedUntil)
                    this.play(d);
                if (target === 0 && d.v <= 0 && !d.el.paused) {
                    try {
                        d.el.pause();
                    }
                    catch { /* ignore */ }
                }
                if (d.v > 0.01 && (!loud || d.v > loud.v))
                    loud = d;
            }
            this.current = loud ? loud.track : null;
        }
        catch { /* never let music break a frame */ }
    }
    /** The planet being played (planets.json id): its own tracks come first in each role's turn. */
    planet = "";
    pick(state) {
        for (const role of exports.STATE_ROLES[state]) {
            const all = this.tracks.filter((t) => t.role === role && !this.decks.get(t.id)?.bad);
            const mine = all.filter((t) => t.planets?.includes(this.planet)), list = [...mine, ...all.filter((t) => !mine.includes(t))];
            if (!list.length)
                continue;
            const i = (this.next[role] ?? 0) % list.length;
            this.next[role] = i + 1;
            return this.deck(list[i]);
        }
        return null;
    }
    deck(t) {
        let d = this.decks.get(t.id);
        if (d) {
            d.ended = false;
            return d;
        }
        const el = this.makeAudio();
        el.preload = "auto";
        el.loop = false;
        el.volume = 0;
        d = { track: t, el, v: 0, bad: false, pending: false, ended: false, blockedUntil: 0, loading: false };
        const dd = d;
        el.addEventListener("error", () => { dd.bad = true; this.counters.errors++; });
        el.addEventListener("ended", () => { dd.ended = true; try {
            dd.el.currentTime = 0;
        }
        catch { /* ignore */ } });
        // fetched and played from a blob: URL (an artifact page's media policy allows blob: and data: only)
        const U = globalThis.URL;
        if (this.fetchFn && U && typeof U.createObjectURL === "function") {
            dd.loading = true;
            this.fetchFn(`${this.base}${t.file}`).then((r) => { if (!r.ok)
                throw new Error(String(r.status)); return r.blob(); }).then((b) => { el.src = U.createObjectURL(b); dd.loading = false; }, () => { dd.loading = false; dd.bad = true; this.counters.errors++; });
        }
        else
            el.src = `${this.base}${t.file}`;
        this.decks.set(t.id, d);
        return d;
    }
    play(d) {
        d.pending = true;
        try {
            const pr = d.el.play();
            this.counters.plays++;
            if (pr && typeof pr.then === "function")
                pr.then(() => { d.pending = false; }, (err) => {
                    d.pending = false;
                    // autoplay not allowed yet (no user gesture): try again in a second; anything else: the file is unusable
                    if (err?.name === "NotAllowedError")
                        d.blockedUntil = this.nowS + 1;
                    else {
                        d.bad = true;
                        this.counters.errors++;
                    }
                });
            else
                d.pending = false;
        }
        catch {
            d.pending = false;
            d.bad = true;
            this.counters.errors++;
        }
    }
    /** The "now playing" line. */
    nowPlaying() {
        if (this.status === "off-page")
            return "Music: off (single-file page: no music folder beside it)";
        if (this.status === "idle" || this.status === "loading")
            return "Music: loading";
        if (this.status === "none")
            return "Music: no tracks (add them to music/tracks.json)";
        if (!this.current)
            return "Music: silent here";
        const t = this.current;
        return `Now playing: ${t.title}${t.credit ? ` · ${t.credit}` : ""}`;
    }
    /** Debug / tests. */
    info() {
        return { status: this.status, state: this.state, current: this.current?.id ?? null, tracks: this.tracks.length, decks: [...this.decks.values()].map((d) => ({ id: d.track.id, v: +d.v.toFixed(2), bad: d.bad, paused: d.el.paused })), ...this.counters };
    }
}
exports.MusicPlayer = MusicPlayer;
