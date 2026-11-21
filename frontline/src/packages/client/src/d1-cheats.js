"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.d1 = exports.isOpen = exports.cheatsAllowed = exports.isCheatChord = exports.CHEAT_TOKENS = exports.CHEAT_GAS = exports.CHEAT_ORE = exports.CH_SPAWN = exports.CH_GOD = exports.CH_REVEAL = exports.CH_INSTANT = exports.CH_RESERVE = exports.CH_RESOURCES = exports.CHEAT_KEY_LABEL = exports.CHEAT_KEY = void 0;
exports.maxedProfile = maxedProfile;
exports.grantTokens = grantTokens;
exports.cheatAction = cheatAction;
exports.spawnableVehicles = spawnableVehicles;
exports.cheatHtml = cheatHtml;
exports.open = open;
exports.close = close;
const progression_ts_1 = require("../../sim/src/progression.js");
exports.CHEAT_KEY = "KeyD", exports.CHEAT_KEY_LABEL = "Ctrl+Alt+D";
/** cheats.ts sub-commands (kept in step with the sim). */
exports.CH_RESOURCES = 1, exports.CH_RESERVE = 2, exports.CH_INSTANT = 3, exports.CH_REVEAL = 4, exports.CH_GOD = 5, exports.CH_SPAWN = 6;
exports.CHEAT_ORE = 5000, exports.CHEAT_GAS = 2000, exports.CHEAT_TOKENS = 10;
/** Is the key event the cheat chord (Ctrl+Alt+D; AltGr+D on layouts where AltGr is Ctrl+Alt)? */
const isCheatChord = (e) => e.code === exports.CHEAT_KEY && e.ctrlKey && e.altKey;
exports.isCheatChord = isCheatChord;
/** Cheats are for single player and the host only. */
const cheatsAllowed = (role) => role !== "guest" && role !== "connecting";
exports.cheatsAllowed = cheatsAllowed;
const clone = (p) => JSON.parse(JSON.stringify(p));
/** Tokens a profile has spent on unlocks beyond the free starting set. */
function spentTokens(R, p) {
    let n = 0;
    for (const pool of ["vehicleWeapons", "pilotWeapons", "pilotGear", "calls"])
        for (const id of p.unlocks[pool])
            if (!R.starting[pool]?.includes(id))
                n += R.tokenCost;
    return n;
}
/** The vehicle ids mastery is kept for (units with seats). */
const vehicleIds = (data) => (data.units ?? []).filter((u) => (u.seats?.length ?? 0) > 0).map((u) => u.id);
/** UNLOCK EVERYTHING: max rank, every pool item, every vehicle and pool weapon at the top mastery level. Pure. */
function maxedProfile(R, data, p0) {
    const p = clone(p0);
    p.xp = Math.max(p.xp, (0, progression_ts_1.xpForRank)(R, R.maxRank));
    p.rank = R.maxRank;
    for (const pool of ["vehicleWeapons", "pilotWeapons", "pilotGear", "calls"])
        for (const id of R.pools[pool])
            if (!p.unlocks[pool].includes(id))
                p.unlocks[pool].push(id);
    const top = R.masteryXp[R.masteryLevels - 1] ?? 0;
    const keys = [...vehicleIds(data).map((id) => `vehicle:${id}`), ...[...R.pools.vehicleWeapons, ...R.pools.pilotWeapons, "pilot-carbine"].map((id) => `weapon:${id}`)];
    for (const k of keys) {
        const m = p.mastery[k] ?? { xp: 0, level: 1 };
        m.xp = Math.max(m.xp, top);
        m.level = (0, progression_ts_1.masteryLevel)(R, m.xp);
        p.mastery[k] = m;
    }
    // token invariant (profile.ts checkProfile): tokens + spent = (rank - 1) x tokensPerRank + bonusTokens
    const bonus = p.bonusTokens ?? 0, left = (p.rank - 1) * R.tokensPerRank + bonus - spentTokens(R, p);
    if (left < 0) {
        p.bonusTokens = bonus - left;
        p.tokens = 0;
    }
    else
        p.tokens = left;
    return p;
}
/** +n licence tokens (bonusTokens keeps the token check consistent). Pure. */
function grantTokens(p0, n) { const p = clone(p0); p.tokens += n; p.bonusTokens = (p.bonusTokens ?? 0) + n; return p; }
/** The match cheat as the page's action (worker.ts fills the own pilot for god mode). */
function cheatAction(sub, b = 0, c = 0) { return { kind: "cheat", sub, b, c }; }
/** Vehicles the cheat can spawn: every unit with seats (index into data.units = the sim's type index). */
function spawnableVehicles(data) {
    const us = data.units ?? [];
    return us.map((u, t) => ({ id: u.id, name: u.name ?? u.id, t })).filter((v) => (us[v.t].seats?.length ?? 0) > 0);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** The screen's HTML (data-act on each button). */
function cheatHtml(m) {
    let h = `<div class="d1h">TEST CHEATS<span class="x" data-act="close">×</span></div><div class="d1warn">For testing only · ${esc(exports.CHEAT_KEY_LABEL)} / Esc close</div>`;
    if (!m.allowed)
        return h + `<div class="d1note">Cheats are for single player and the host only: a guest cannot use them in multiplayer.</div>`;
    const btn = (act, label, sub, on = false, off = false) => `<div class="d1b${on ? " on" : ""}${off ? " no" : ""}" data-act="${act}"><b>${esc(label)}</b><small>${esc(sub)}</small></div>`;
    h += `<div class="d1s">PROGRESSION · rank ${m.rank}/${m.maxRank} · ${m.tokens} tokens · ${m.calls}/${m.callsTotal} calls · ${m.callSlots} call slots · ${m.persistent ? "saved in this browser" : "this session only (no browser storage)"}</div>`;
    h += btn("unlockAll", "UNLOCK EVERYTHING", "rank 30 with every slot (4 support-call slots, vehicle mods 3, gear 2), every call, pilot weapon, vehicle weapon, gear and mastery level");
    h += btn("tokens", `+${exports.CHEAT_TOKENS} LICENCE TOKENS`, "spend them in PROFILE");
    h += btn("reset", "RESET PROGRESSION", "a new rank 1 profile (the starting calls only)");
    const off = !m.inMatch, why = m.inMatch ? "" : " · start a match first";
    h += `<div class="d1s">MATCH · this match only${why}</div>`;
    h += btn("res", `+${exports.CHEAT_ORE} ORE +${exports.CHEAT_GAS} GAS`, "to your team's stockpile", false, off);
    h += btn("reserve", "REFILL PILOT RESERVE", "every lost pilot is available again", false, off);
    h += btn("instant", `INSTANT BUILD / PRODUCTION · ${m.flags.instant ? "ON" : "OFF"}`, "sites finish when the Constructor arrives, units when they start (costs still paid)", m.flags.instant, off);
    h += btn("reveal", `REVEAL MAP · ${m.flags.reveal ? "ON" : "OFF"}`, "your team sees every enemy", m.flags.reveal, off);
    h += btn("god", `GOD MODE · ${m.flags.god ? "ON" : "OFF"}`, "your pilot and the vehicle you are in take no damage", m.flags.god, off);
    if (m.vehicles?.length) {
        h += `<div class="d1s">SPAWN A FRIENDLY VEHICLE · empty, in front of you (F to board)${why}</div><div class="d1grid">`;
        for (const v of m.vehicles)
            h += `<div class="d1v${off ? " no" : ""}" data-act="spawn:${v.t}">${esc(v.name)}</div>`;
        h += `</div>`;
    }
    return h;
}
const CSS = `
#d1Cheats { position: fixed; top: 60px; right: 16px; width: 380px; max-height: 86vh; overflow: auto; display: none; z-index: 70; pointer-events: auto; background: rgba(28,8,8,0.95); border: 2px solid #ff4a3a; padding: 10px 12px; font: 12px var(--sans, sans-serif); color: #f2dede; box-shadow: 0 0 24px rgba(255,60,40,0.35); }
#d1Cheats .d1h { font: 700 18px var(--sans, sans-serif); letter-spacing: 0.3em; color: #ff5a46; }
#d1Cheats .d1h .x { float: right; cursor: pointer; color: #f2dede; letter-spacing: 0; }
#d1Cheats .d1warn { color: #ffb0a0; margin: 2px 0 8px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
#d1Cheats .d1s { margin: 10px 0 4px; color: #ff9a80; font: 700 11px var(--mono, monospace); letter-spacing: 0.06em; }
#d1Cheats .d1b { border: 1px solid #6a2a26; background: #2a1010; padding: 6px 8px; margin: 4px 0; cursor: pointer; }
#d1Cheats .d1b:hover { border-color: #ff5a46; }
#d1Cheats .d1b.on { border-color: #ff5a46; background: #4a1612; }
#d1Cheats .d1b.on b { color: #ffd04a; }
#d1Cheats .d1b.no { opacity: 0.4; pointer-events: none; }
#d1Cheats .d1b b { display: block; font-weight: 700; letter-spacing: 0.06em; }
#d1Cheats .d1b small { color: #c8a8a0; }
#d1Cheats .d1grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
#d1Cheats .d1v { border: 1px solid #6a2a26; background: #2a1010; padding: 5px 4px; text-align: center; cursor: pointer; font-weight: 600; font-size: 11px; }
#d1Cheats .d1v:hover { border-color: #ff5a46; }
#d1Cheats .d1v.no { opacity: 0.4; pointer-events: none; }
#d1Cheats .d1note { color: #ffd0c0; margin-top: 8px; }
#d1Badge { position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 69; display: none; pointer-events: none; background: rgba(120,16,10,0.85); color: #fff; font: 700 11px var(--mono, monospace); letter-spacing: 0.2em; padding: 2px 10px; border: 1px solid #ff5a46; }
`;
let H = null, el = null, badge = null;
const flags = { instant: false, reveal: false, god: false };
let usedThisMatch = false;
function model() {
    const R = H.R(), st = H.store(), p = st?.profile;
    return { vehicles: spawnableVehicles(H.data), allowed: (0, exports.cheatsAllowed)(H.role()), inMatch: H.inMatch(), rank: p?.rank ?? 1, maxRank: R?.maxRank ?? 30, tokens: p?.tokens ?? 0, callSlots: R && p ? (0, progression_ts_1.loadoutSlots)(R, p.rank).calls : 0,
        calls: p?.unlocks.calls.length ?? 0, callsTotal: R?.pools.calls.length ?? 0, flags: { ...flags }, persistent: st?.backend?.persistent !== false };
}
function render() { if (el && H)
    el.innerHTML = cheatHtml(model()); if (badge) {
    badge.style.display = usedThisMatch && H?.inMatch() ? "block" : "none";
    badge.textContent = `TEST CHEATS${flags.god ? " · GOD" : ""}${flags.reveal ? " · REVEAL" : ""}${flags.instant ? " · INSTANT" : ""}`;
} }
function onAct(a) {
    if (!H)
        return;
    if (a === "close") {
        close();
        return;
    }
    if (!(0, exports.cheatsAllowed)(H.role()))
        return;
    const R = H.R(), st = H.store();
    const prof = (f, msg) => { if (!R || !st) {
        H.notify("TEST CHEATS: no progression in this build", "warn");
        return;
    } st.setProfile(f(st.profile)); H.profileChanged(); H.notify(`TEST CHEATS: ${msg}`, "good"); };
    const sim = (sub, b, c, msg) => { if (!H.inMatch())
        return; H.act(cheatAction(sub, b, c)); usedThisMatch = true; H.notify(`TEST CHEATS: ${msg}`, "good"); };
    if (a.startsWith("spawn:")) {
        const t = Number(a.slice(6)), v = spawnableVehicles(H.data).find((x) => x.t === t);
        if (v)
            sim(exports.CH_SPAWN, t, 0, `${v.name} spawned in front of you`);
        render();
        return;
    }
    switch (a) {
        case "unlockAll":
            prof((p) => maxedProfile(R, H.data, p), `everything unlocked · rank ${R?.maxRank} · ${R ? (0, progression_ts_1.loadoutSlots)(R, R.maxRank).calls : 3} call slots (K: call loadout)`);
            break;
        case "tokens":
            prof((p) => grantTokens(p, exports.CHEAT_TOKENS), `+${exports.CHEAT_TOKENS} licence tokens`);
            break;
        case "reset":
            if (!st)
                break;
            st.reset();
            H.profileChanged();
            H.notify("TEST CHEATS: progression reset (rank 1)", "warn");
            break;
        case "res":
            sim(exports.CH_RESOURCES, exports.CHEAT_ORE, exports.CHEAT_GAS, `+${exports.CHEAT_ORE} ore +${exports.CHEAT_GAS} gas`);
            break;
        case "reserve":
            sim(exports.CH_RESERVE, 0, 0, "pilot reserve refilled");
            break;
        case "instant":
            if (!H.inMatch())
                break;
            flags.instant = !flags.instant;
            sim(exports.CH_INSTANT, flags.instant ? 1 : 0, 0, `instant build / production ${flags.instant ? "ON" : "OFF"}`);
            break;
        case "reveal":
            if (!H.inMatch())
                break;
            flags.reveal = !flags.reveal;
            sim(exports.CH_REVEAL, flags.reveal ? 1 : 0, 0, `map ${flags.reveal ? "revealed" : "fog back"}`);
            break;
        case "god":
            if (!H.inMatch())
                break;
            flags.god = !flags.god;
            sim(exports.CH_GOD, flags.god ? 1 : 0, 0, `god mode ${flags.god ? "ON" : "OFF"}`);
            break;
    }
    render();
}
const isOpen = () => !!el && el.style.display === "block";
exports.isOpen = isOpen;
function open() { if (!el || !H)
    return; render(); el.style.display = "block"; H.unlockPointer(); if (!(0, exports.cheatsAllowed)(H.role()))
    H.notify("TEST CHEATS: single player / host only", "warn"); }
function close() { if (el)
    el.style.display = "none"; }
exports.d1 = {
    install(h) {
        H = h;
        if (typeof document === "undefined" || !document.body)
            return;
        const st = document.createElement("style");
        st.textContent = CSS;
        (document.head ?? document.body).appendChild(st);
        el = document.createElement("div");
        el.id = "d1Cheats";
        document.body.appendChild(el);
        badge = document.createElement("div");
        badge.id = "d1Badge";
        document.body.appendChild(badge);
        el.addEventListener("click", (ev) => { ev.stopPropagation(); let t = ev.target; while (t && t !== el && !t.dataset?.act)
            t = t.parentElement; if (t && t.dataset?.act)
            onAct(t.dataset.act); });
        el.addEventListener("mousedown", (ev) => ev.stopPropagation());
        // Esc closes the screen first (before the pause menu)
        window.addEventListener("keydown", (ev) => { if ((0, exports.isOpen)() && ev.code === "Escape") {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            close();
        } }, true);
    },
    /** main.ts keydown: true when the event was the cheat chord (handled: the browser's default is prevented). */
    key(e) {
        if (!(0, exports.isCheatChord)(e))
            return false;
        e.preventDefault();
        e.stopPropagation?.();
        if (!e.repeat) {
            if ((0, exports.isOpen)())
                close();
            else
                open();
        }
        return true;
    },
    /** A new match (sendInit): the sim starts without cheats. */
    newMatch() { flags.instant = flags.reveal = flags.god = false; usedThisMatch = false; render(); },
    isOpen: exports.isOpen,
    open, close, act: onAct,
    /** The screen's current HTML (tests). */
    html: () => (el ? el.innerHTML : ""),
    get flags() { return { ...flags }; },
};
