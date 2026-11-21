"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebriefTracker = exports.ProfileStore = exports.RENAMED_IDS = exports.CODE_PREFIX = exports.STANDARD_WEAPON = exports.STORE_VERSION = exports.STORE_KEY = void 0;
exports.defaultBackend = defaultBackend;
exports.memoryBackend = memoryBackend;
exports.migrateIds = migrateIds;
exports.checkProfile = checkProfile;
exports.defaultLoadout = defaultLoadout;
exports.sanitizeLoadout = sanitizeLoadout;
exports.loadoutOk = loadoutOk;
exports.toggleCall = toggleCall;
exports.dropLicences = dropLicences;
exports.rankProgress = rankProgress;
exports.masteryProgress = masteryProgress;
exports.exportCode = exportCode;
exports.importCode = importCode;
exports.debriefDelta = debriefDelta;
exports.resultFromEvent = resultFromEvent;
exports.joinPayload = joinPayload;
exports.guestLoadout = guestLoadout;
// C7a (progression on screen): the pilot profile in browser storage, validated with the sim's pure profile rules
// (packages/sim/src/progression.ts), plus the pure helpers the progression screens and the hosts use (loadout, the
// ruling-56 licence drop, the debrief's apply-once, the guest's join payload). No DOM here: Node logic tests import this file.
//
// Storage: one key (STORE_KEY) holding the envelope { v, profile, loadout, applied }. localStorage is wrapped in
// try/catch; when it is missing or throws (private mode, quota, sandboxed frame) the store keeps working in memory.
// Nothing read back is trusted: a stored or imported profile is checked by checkProfile (the sim's validateLoadout
// plus the token invariant) and replaced by a new rank-1 profile when it fails.
const progression_ts_1 = require("../../sim/src/progression.js");
exports.STORE_KEY = "ironfall.profile";
/** Envelope version (the profile inside has its own PROFILE_VERSION). */
exports.STORE_VERSION = 1;
exports.STANDARD_WEAPON = "pilot-carbine";
/** Export code prefix: "IFP1." + base64(JSON) + "." + checksum. */
exports.CODE_PREFIX = "IFP1.";
/** Results remembered as applied (apply-once keys). */
const APPLIED_KEEP = 32;
/** localStorage when it works, else memory. Never throws. */
function defaultBackend() {
    const mem = new Map();
    let ls = null;
    try {
        const g = globalThis;
        if (g.localStorage) {
            const k = "__ironfall_probe";
            g.localStorage.setItem(k, "1");
            g.localStorage.removeItem(k);
            ls = g.localStorage;
        }
    }
    catch {
        ls = null;
    }
    return {
        persistent: !!ls,
        get(k) { if (ls) {
            try {
                return ls.getItem(k);
            }
            catch { /* fall through */ }
        } return mem.get(k) ?? null; },
        set(k, v) { mem.set(k, v); if (ls) {
            try {
                ls.setItem(k, v);
            }
            catch { /* memory copy kept */ }
        } },
    };
}
function memoryBackend() { const m = new Map(); return { get: (k) => m.get(k) ?? null, set: (k, v) => { m.set(k, v); } }; }
const isStrArr = (a) => Array.isArray(a) && a.every((x) => typeof x === "string");
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
/** Ids renamed since profiles were first stored (ruling 115: the bike-drop call is the Scout Drop). */
exports.RENAMED_IDS = { "bike-drop": "scout-drop" };
/** Renames old ids in a parsed profile's call unlocks and a loadout's calls, in place (stored, imported and guest profiles). */
function migrateIds(profile, loadout) {
    const fix = (a) => { if (Array.isArray(a))
        for (let i = 0; i < a.length; i++)
            if (typeof a[i] === "string" && exports.RENAMED_IDS[a[i]])
                a[i] = exports.RENAMED_IDS[a[i]]; };
    const p = profile;
    if (p && typeof p === "object" && p.unlocks && typeof p.unlocks === "object")
        fix(p.unlocks.calls);
    const l = loadout;
    if (l && typeof l === "object")
        fix(l.calls);
}
/** Is this a well-formed, rule-consistent profile? Shape, then the sim's validateLoadout, then the token count. */
function checkProfile(R, raw) {
    const p = raw;
    if (!p || typeof p !== "object")
        return { ok: false, reason: "not an object" };
    if (p.version !== progression_ts_1.PROFILE_VERSION)
        return { ok: false, reason: "profile version" };
    if (!isNum(p.xp) || !isNum(p.rank) || !isNum(p.tokens) || !isNum(p.salvage) || p.tokens < 0 || p.salvage < 0 || !Number.isInteger(p.tokens))
        return { ok: false, reason: "numbers" };
    const u = p.unlocks;
    if (!u || typeof u !== "object")
        return { ok: false, reason: "unlocks" };
    const legacy = u.vehicleLicences !== undefined; // ruling 56: a stored profile may still carry its old licences
    for (const pool of [...(legacy ? ["vehicleLicences"] : []), "vehicleWeapons", "pilotWeapons", "pilotGear", "calls"])
        if (!isStrArr(u[pool]) || new Set(u[pool]).size !== u[pool].length)
            return { ok: false, reason: "unlocks" };
    // Frontline (19 Nov): its unlock pools (flGuns, flSlot3, ...) ride along: string lists of the pools' items. Pools no
    // longer in the rules (the unlock list was removed, 19 Nov) are dropped, not held against the profile.
    for (const k of Object.keys(u))
        if (k.startsWith("fl") && (!R.fl || !R.fl.pools[k]))
            delete u[k];
    const flPools = Object.keys(u).filter((k) => k.startsWith("fl"));
    for (const pool of flPools)
        if (!R.fl || !R.fl.pools[pool] || !isStrArr(u[pool]) || new Set(u[pool]).size !== u[pool].length || u[pool].some((id) => !R.fl.pools[pool].includes(id)))
            return { ok: false, reason: "unlocks" };
    if (Object.keys(u).length - flPools.length !== (legacy ? 5 : 4))
        return { ok: false, reason: "unlocks" };
    if (!p.mastery || typeof p.mastery !== "object" || Array.isArray(p.mastery))
        return { ok: false, reason: "mastery" };
    for (const [k, m] of Object.entries(p.mastery)) {
        if (!/^(vehicle|weapon):[\w-]+$/.test(k) || !m || !isNum(m.xp) || m.xp < 0 || !isNum(m.level))
            return { ok: false, reason: "mastery" };
        if (m.choice !== undefined) {
            const veh = k.startsWith("vehicle:");
            if (m.level < 3 || (veh ? m.choice !== "hull" && m.choice !== "speed" : m.choice !== "damage" && m.choice !== "ammo"))
                return { ok: false, reason: "mastery choice" };
        }
    }
    if (!isStrArr(p.golds) || !isStrArr(p.blueprints))
        return { ok: false, reason: "golds" };
    let v;
    try {
        v = (0, progression_ts_1.validateLoadout)(R, { player: 0, profile: p }, exports.STANDARD_WEAPON);
    }
    catch {
        return { ok: false, reason: "badProfile" };
    }
    if (!v.ok)
        return { ok: false, reason: v.reason };
    // tokens: one per rank gained, minus one per unlock beyond the free starting set
    const free = { ...R.starting, vehicleLicences: LEGACY_FREE_LICENCES };
    let spent = 0;
    for (const pool of Object.keys(p.unlocks)) {
        if (pool.startsWith("fl"))
            continue; // Frontline pools: tokens counted from the rank (progression flTokens), not from this ledger
        for (const id of p.unlocks[pool])
            if (!(free[pool] ?? []).includes(id))
                spent += R.tokenCost;
    }
    for (const pool of ["pilotWeapons", "calls"])
        for (const id of free[pool] ?? [])
            if (!p.unlocks[pool].includes(id))
                return { ok: false, reason: "starting unlock missing" };
    // D1 test cheat (ruling 115): tokens granted from the TEST CHEATS screen are counted in bonusTokens
    const bonus = p.bonusTokens ?? 0;
    if (!isNum(bonus) || bonus < 0 || !Number.isInteger(bonus))
        return { ok: false, reason: "numbers" };
    if (R.fl) { // Frontline: what the Frontline unlocks cost must fit in what the rank (and any test bonus) earned
        let flSpent = 0;
        for (const pool of flPools)
            for (const id of u[pool])
                flSpent += (0, progression_ts_1.flCost)(R, pool, id);
        if (flSpent > (0, progression_ts_1.flTokensEarned)(R, p.rank) + bonus)
            return { ok: false, reason: "tokens" };
        return { ok: true };
    }
    if (p.tokens + spent !== (p.rank - 1) * R.tokensPerRank + bonus)
        return { ok: false, reason: "tokens" };
    return { ok: true };
}
/** Default loadout for a profile: the carbine and the first owned calls up to the rank's slots. */
function defaultLoadout(R, p) {
    return { pilotWeapon: exports.STANDARD_WEAPON, calls: p.unlocks.calls.slice(0, (0, progression_ts_1.loadoutSlots)(R, p.rank).calls) };
}
/** Keeps only what the profile allows: an owned weapon (else the carbine), owned calls without repeats, cut to the slots. */
function sanitizeLoadout(R, p, raw) {
    const l = (raw ?? {});
    const pilotWeapon = typeof l.pilotWeapon === "string" && (l.pilotWeapon === exports.STANDARD_WEAPON || p.unlocks.pilotWeapons.includes(l.pilotWeapon)) ? l.pilotWeapon : exports.STANDARD_WEAPON;
    const calls = [];
    if (isStrArr(l.calls))
        for (const c of l.calls)
            if (p.unlocks.calls.includes(c) && !calls.includes(c))
                calls.push(c);
    return { pilotWeapon, calls: calls.slice(0, (0, progression_ts_1.loadoutSlots)(R, p.rank).calls) };
}
/** The sim's own check of a loadout for this profile. */
function loadoutOk(R, p, l) {
    try {
        return (0, progression_ts_1.validateLoadout)(R, { player: 0, profile: p, pilotWeapon: l.pilotWeapon, calls: l.calls }, exports.STANDARD_WEAPON);
    }
    catch {
        return { ok: false, reason: "badProfile" };
    }
}
/** Toggles a call in the loadout (refused when not owned or the slots are full). */
function toggleCall(R, p, l, id) {
    if (l.calls.includes(id))
        return { ok: true, loadout: { ...l, calls: l.calls.filter((c) => c !== id) } };
    if (!p.unlocks.calls.includes(id))
        return { ok: false, loadout: l, reason: "not unlocked" };
    if (l.calls.length >= (0, progression_ts_1.loadoutSlots)(R, p.rank).calls)
        return { ok: false, loadout: l, reason: `slots full (${(0, progression_ts_1.loadoutSlots)(R, p.rank).calls})` };
    return { ok: true, loadout: { ...l, calls: [...l.calls, id] } };
}
/** The free licences every pre-ruling-56 profile had (they cost no token). */
const LEGACY_FREE_LICENCES = ["dart", "tandem", "lancer"]; // historic ids: pre-ruling-56 profiles held these free ("tandem" stays for the refund count after ruling 108 removed the unit)
/**
 * Ruling 56: there are no vehicle licences; every vehicle is open to every player. A stored or imported profile may
 * still hold licences: the field is removed and the bought ones give their tokens back, so the token count stays
 * consistent (checkProfile) and the tokens go to weapons and calls.
 */
function dropLicences(R, p) {
    const own = p.unlocks.vehicleLicences;
    if (!own)
        return { profile: p, refunded: 0 };
    const bought = own.filter((id) => !LEGACY_FREE_LICENCES.includes(id));
    const q = JSON.parse(JSON.stringify(p));
    delete q.unlocks.vehicleLicences;
    q.tokens += bought.length * R.tokenCost;
    return { profile: q, refunded: bought.length * R.tokenCost };
}
const refundText = (n) => `vehicle licences are gone (every vehicle is open to everyone): ${n} token${n === 1 ? "" : "s"} back to spend on weapons and calls`;
/** Rank progress: XP into the current rank and the size of the step (max rank: full bar). */
function rankProgress(R, xp) {
    const rank = (0, progression_ts_1.rankForXp)(R, xp);
    if (rank >= R.maxRank)
        return { rank, into: 0, need: 0, frac: 1 };
    const a = (0, progression_ts_1.xpForRank)(R, rank), b = (0, progression_ts_1.xpForRank)(R, rank + 1);
    return { rank, into: xp - a, need: b - a, frac: (xp - a) / (b - a) };
}
function masteryProgress(R, xp) {
    const level = (0, progression_ts_1.masteryLevel)(R, xp);
    return { level, next: level < R.masteryLevels ? R.masteryXp[level] : null };
}
// ------------------------------------------------------------------ export / import code
function checksum(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
} return h.toString(36); }
const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
const unb64 = (s) => decodeURIComponent(escape(atob(s)));
function exportCode(p) { const j = JSON.stringify(p); return `${exports.CODE_PREFIX}${b64(j)}.${checksum(j)}`; }
function importCode(R, code) {
    const c = String(code ?? "").replace(/\s+/g, "");
    if (!c.startsWith(exports.CODE_PREFIX))
        return { ok: false, reason: "not an Ironfall profile code" };
    const body = c.slice(exports.CODE_PREFIX.length), dot = body.lastIndexOf(".");
    if (dot < 0)
        return { ok: false, reason: "code is cut short" };
    let j, p;
    try {
        j = unb64(body.slice(0, dot));
        p = JSON.parse(j);
    }
    catch {
        return { ok: false, reason: "code is damaged" };
    }
    if (checksum(j) !== body.slice(dot + 1))
        return { ok: false, reason: "code is damaged (checksum)" };
    migrateIds(p); // ruling 115
    const v = checkProfile(R, p);
    if (!v.ok)
        return { ok: false, reason: `profile refused (${v.reason})` };
    return { ok: true, profile: p };
}
// ------------------------------------------------------------------ the store
class ProfileStore {
    env;
    /** Why the stored profile was replaced on load (null: it was fine or there was none). */
    loadNote = null;
    /** Ruling 56: set when bought vehicle licences were dropped and their tokens given back (load or import). */
    refundNote = null;
    R;
    backend;
    constructor(R, backend = defaultBackend()) { this.R = R; this.backend = backend; this.env = this.read(); if (this.refundNote)
        this.save(); }
    get profile() { return this.env.profile; }
    get loadout() { return this.env.loadout; }
    fresh() { const p = (0, progression_ts_1.newProfile)(this.R); return { v: exports.STORE_VERSION, profile: p, loadout: defaultLoadout(this.R, p), applied: [] }; }
    read() {
        const s = this.backend.get(exports.STORE_KEY);
        if (!s)
            return this.fresh();
        let e;
        try {
            e = JSON.parse(s);
        }
        catch {
            this.loadNote = "stored profile unreadable: a new profile was made";
            return this.fresh();
        }
        if (!e || e.v !== exports.STORE_VERSION) {
            this.loadNote = "stored profile has an unknown version: a new profile was made";
            return this.fresh();
        }
        migrateIds(e.profile, e.loadout); // ruling 115
        const v = checkProfile(this.R, e.profile);
        if (!v.ok) {
            this.loadNote = `stored profile refused (${v.reason}): a new profile was made`;
            return this.fresh();
        }
        const d = dropLicences(this.R, e.profile), p = d.profile;
        if (d.refunded)
            this.refundNote = refundText(d.refunded);
        return { v: exports.STORE_VERSION, profile: p, loadout: sanitizeLoadout(this.R, p, e.loadout), applied: isStrArr(e.applied) ? e.applied.slice(-APPLIED_KEEP) : [] };
    }
    save() { this.backend.set(exports.STORE_KEY, JSON.stringify(this.env)); }
    setProfile(p) {
        const d = dropLicences(this.R, p);
        p = d.profile;
        if (d.refunded)
            this.refundNote = refundText(d.refunded);
        this.env.profile = p;
        this.env.loadout = sanitizeLoadout(this.R, p, this.env.loadout);
        this.save();
    }
    setLoadout(l) { this.env.loadout = sanitizeLoadout(this.R, this.env.profile, l); this.save(); }
    reset() { const a = this.env.applied; this.env = this.fresh(); this.env.applied = a; this.save(); }
    import(code) { const r = importCode(this.R, code); if (r.ok)
        this.setProfile(r.profile); return { ok: r.ok, reason: r.reason }; }
    /** Spends tokens on an unlock (the sim's unlock rule). */
    spend(pool, id) {
        const r = (0, progression_ts_1.unlock)(this.R, this.env.profile, pool, id);
        if (r.ok)
            this.setProfile(r.profile);
        return { ok: r.ok, reason: r.reason };
    }
    /** Applies a battle result once per key (apply-once across Play again, re-sent results and reloads of the store). */
    applyOnce(key, result, opts = {}) {
        if (this.env.applied.includes(key))
            return null;
        const before = this.env.profile, after = (0, progression_ts_1.applyBattle)(this.R, before, result, opts);
        this.env.applied = [...this.env.applied, key].slice(-APPLIED_KEEP);
        this.setProfile(after);
        return debriefDelta(this.R, before, after);
    }
}
exports.ProfileStore = ProfileStore;
function debriefDelta(R, before, after) {
    const milestones = R.milestones.filter((m) => m.rank > before.rank && m.rank <= after.rank).map((m) => m.unlocks);
    const mastery = [];
    for (const [k, m] of Object.entries(after.mastery)) {
        const from = before.mastery[k]?.level ?? 1;
        if (m.level > from)
            mastery.push({ key: k, from, to: m.level });
    }
    return { xpGained: after.xp - before.xp, rankBefore: before.rank, rankAfter: after.rank, tokensGained: after.tokens - before.tokens, milestones, mastery,
        blueprints: after.blueprints.filter((b) => !before.blueprints.includes(b)), salvage: after.salvage - before.salvage, before, after };
}
/**
 * A guest's result from the BATTLE_RESULT event (a player, b XP, c grade, d victory, v1 kills, v2 captures): the full
 * record (Sim.battleResults) lives on the host only. Kills go in as one total (class unknown); no mastery, no salvage.
 */
function resultFromEvent(e) {
    return { partial: true, player: e.a, team: 0, victory: e.d === 1, grade: e.c, gradeFactors: { secondaries: false, time: false, pointsHeld: false, vehiclesLost: false },
        objectivesPrimary: 0, objectivesSecondary: 0, secondariesTotal: 0, killsByClass: progression_ts_1.KILL_CLASSES.map((_, i) => (i === 0 ? e.v1 : 0)), captures: e.v2, revives: 0, structuresBuilt: 0,
        structuresDestroyed: 0, hullRepaired: 0, oreHauled: 0, timeSeconds: 0, battleSeconds: 0, pointsHeld: 0, pointsTotal: 0, vehiclesLost: 0, xp: e.b, xpParts: {}, salvage: 0, mastery: {} };
}
function joinPayload(store) { return { profile: store.profile, pilotWeapon: store.loadout.pilotWeapon, calls: store.loadout.calls }; }
/** Host side: a guest's payload as a PlayerLoadout for its slot, or null when it is missing, too big or fails the sim's checks. */
function guestLoadout(R, slot, raw) {
    if (!raw || typeof raw !== "object")
        return null;
    let j;
    try {
        j = JSON.stringify(raw);
    }
    catch {
        return null;
    }
    if (j.length > 16384)
        return null;
    const o = JSON.parse(j);
    migrateIds(o.profile, o); // ruling 115
    if (!checkProfile(R, o.profile).ok)
        return null;
    const l = { player: slot, profile: o.profile, pilotWeapon: typeof o.pilotWeapon === "string" ? o.pilotWeapon : undefined, calls: isStrArr(o.calls) ? o.calls : undefined };
    return (0, progression_ts_1.validateLoadout)(R, l, exports.STANDARD_WEAPON).ok ? l : null;
}
/**
 * Collects BATTLE_RESULT for the current match and applies the player's own result to the store exactly once.
 * A host (or solo) page waits for the worker's full record (c7aResults); a guest uses the event (partial record).
 * The apply-once key is pageNonce:match:player: "Play again" is a new match number; results re-sent for the same
 * match (a host handover re-posts them, duplicate events) find their key in the store and are not applied again.
 */
class DebriefTracker {
    match = 0;
    state = null;
    store;
    nonce;
    constructor(store, nonce) { this.store = store; this.nonce = nonce; }
    /** The match ended (MatchWatch fired). */
    matchOver(me) { this.match++; this.state = { match: this.match, me, rows: [], mine: null, delta: null, partial: false, alreadyApplied: false }; }
    row(r, partial) {
        const st = this.state;
        const i = st.rows.findIndex((x) => x.player === r.player);
        if (i >= 0) {
            if (st.rows[i].partial && !partial)
                st.rows[i] = { player: r.player, result: r, partial };
        }
        else {
            st.rows.push({ player: r.player, result: r, partial });
            st.rows.sort((a, b) => a.player - b.player);
        }
    }
    applyMine(r, partial, squadMaxRank) {
        const st = this.state;
        if (st.mine && !st.partial)
            return;
        if (st.mine && partial)
            return;
        st.mine = r;
        st.partial = partial;
        const d = this.store.applyOnce(`${this.nonce}:${st.match}:${st.me}`, r, { missionId: "skirmish", squadMaxRank });
        if (d)
            st.delta = d;
        else
            st.alreadyApplied = true;
    }
    /** The worker's full record (host). */
    full(results, ranks) {
        if (!this.state)
            this.matchOver(0);
        const st = this.state;
        for (const r of results)
            this.row(r, false);
        const mine = results.find((r) => r.player === st.me);
        const squadMaxRank = Math.max(0, ...Object.values(ranks).filter((x) => Number.isFinite(x)));
        if (mine)
            this.applyMine(mine, false, squadMaxRank || undefined);
    }
    /** A BATTLE_RESULT event; applies the own result only when this page is a guest (no worker record). */
    event(e, guest) {
        if (!this.state)
            return;
        const r = resultFromEvent(e);
        this.row(r, true);
        if (guest && e.a === this.state.me)
            this.applyMine(r, true);
    }
}
exports.DebriefTracker = DebriefTracker;
