"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.c7a = void 0;
const progression_ts_1 = require("../../sim/src/progression.js");
const events_ts_1 = require("../../sim/src/events.js");
const profile_ts_1 = require("./profile.js");
let R = null;
let store = null;
let tracker = null;
let hooks = null;
const names = {};
let profileEl = null, debriefEl = null, startLine = null;
let profileCard = null, debriefCard = null;
/** The debrief opens by itself this long after the VICTORY / DEFEAT panel (checked on each snapshot; 0: done). */
let autoDebriefAt = 0;
let profileTab = "overview", profileMsg = "";
/** The profile is used in matches when it persists (localStorage works) or the player used the profile screen in this page. */
let touched = false;
const active = () => !!store && (store.backend.persistent === true || touched);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const nm = (id) => names[id] ?? id;
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const MILESTONE_TEXT = { "support-call-slot-3": "3rd support call slot", "vehicle-mod-slot-2": "2nd vehicle mod slot (no mods yet)", "pilot-gear-slot-2": "2nd pilot gear slot (no gear yet)", "vehicle-mod-slot-3": "3rd vehicle mod slot (no mods yet)" };
const FL_POOL_TEXT = { flGuns: "Slot 1 · primary", flType: "Slot 1 · type", flSlot2: "Slot 2 · secondary", flGrenades: "Grenades", flArmour: "Armour", flSlot3: "Slot 3 · call-down weapon", flCalls: "Call-downs" };
const flNames = {};
/** Frontline item name: pool + id (the loadout's own names). */
const flNm = (pool, id) => flNames[`${pool}:${id}`] ?? nm(id);
let flChanged = null;
let planned = [];
const POOL_TEXT = { vehicleLicences: "Vehicle licences", pilotWeapons: "Pilot weapons", calls: "Support calls", vehicleWeapons: "Vehicle weapons", pilotGear: "Pilot gear" };
const NO_EFFECT = { vehicleWeapons: "stored; no effect in battle yet", pilotGear: "stored; no effect in battle yet" };
const CSS = `
.c7a-ov { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(6,8,8,0.9); z-index: 60; pointer-events: auto; font: 13px var(--sans, sans-serif); color: #d8e0e0; }
.c7a-ov .c7a-card { width: min(980px, 94vw); max-height: 92vh; overflow: auto; overflow-y: scroll; scrollbar-color: #5fe6ff #1c282b; /* C8 (QA4 bug 32): a visible scroll bar on the tall tabs */ background: #0d1416; border: 1px solid #2a3a3e; padding: 18px 22px; }
.c7a-ov h1 { margin: 0 0 4px; font: 700 30px var(--sans, sans-serif); letter-spacing: 0.25em; color: #5fe6ff; }
.c7a-ov h1.defeat { color: #ff6a2a; }
.c7a-ov h2 { margin: 14px 0 6px; font: 700 13px var(--sans, sans-serif); letter-spacing: 0.18em; color: #9fb4b8; }
.c7a-ov table { border-collapse: collapse; font: 12px var(--mono, monospace); width: 100%; }
.c7a-ov td, .c7a-ov th { padding: 3px 8px; text-align: left; border-bottom: 1px solid #1c282b; }
.c7a-ov th { color: #7f9599; font-weight: 600; }
.c7a-ov tr.me td { color: #fff; background: rgba(95,230,255,0.07); }
.c7a-ov .bar { height: 10px; background: #1c282b; position: relative; margin: 4px 0 2px; }
.c7a-ov .bar b { position: absolute; left: 0; top: 0; bottom: 0; background: #5fe6ff; }
.c7a-ov .bar i { position: absolute; top: 0; bottom: 0; background: #ffd23c; }
.c7a-ov .muted { color: #7f9599; } .c7a-ov .gold { color: #ffd23c; } .c7a-ov .bad { color: #ff6a2a; } .c7a-ov .good { color: #7dff9a; }
.c7a-ov button { font: 600 12px var(--sans, sans-serif); letter-spacing: 0.1em; background: #18262a; color: #d8e0e0; border: 1px solid #2f474c; padding: 5px 10px; cursor: pointer; margin: 2px; }
.c7a-ov button:hover { border-color: #5fe6ff; } .c7a-ov button.on { background: #5fe6ff; color: #0b1214; } .c7a-ov button:disabled { opacity: 0.4; cursor: default; }
.c7a-ov .tabs { margin: 10px 0; } .c7a-ov .row { display: flex; gap: 18px; flex-wrap: wrap; }
.c7a-ov .item { display: inline-block; min-width: 200px; padding: 4px 8px; margin: 2px; border: 1px solid #1f2e31; }
.c7a-ov .item.own { border-color: #2f6f7a; } .c7a-ov .item.lock { opacity: 0.75; }
.c7a-ov textarea { width: 100%; height: 60px; background: #071012; color: #d8e0e0; border: 1px solid #2f474c; font: 11px var(--mono, monospace); }
.c7a-ov .close { float: right; }
#c7aStartLine { margin: 8px 0 0; font: 12px var(--mono, monospace); color: #9fb4b8; }
#c7aStartLine button { font: 600 12px var(--sans, sans-serif); letter-spacing: 0.12em; background: #18262a; color: #5fe6ff; border: 1px solid #2f6f7a; padding: 5px 12px; cursor: pointer; margin-right: 10px; }
`;
function el(tag, id, cls) {
    const e = document.createElement(tag);
    e.id = id;
    e.className = cls;
    document.body.appendChild(e);
    return e;
}
/** Click delegation by data-c7a attributes (the overlays are rebuilt from strings). */
function delegate(root, fn) {
    root.addEventListener("click", (ev) => {
        let t = ev.target;
        while (t && t !== root && !t.dataset?.c7a)
            t = t.parentElement;
        if (t && t !== root && t.dataset.c7a) {
            ev.stopPropagation();
            fn(t.dataset.c7a, t.dataset);
        }
    });
}
// ------------------------------------------------------------------ debrief
const XP_PART_TEXT = { objectives: "Objectives", kills: "Kills", captures: "Captures", revives: "Revives", building: "Structures built", repairs: "Repairs", hauling: "Ore hauled", victory: "Victory" };
function playerName(p) { const n = hooks?.names?.()[p]; return n ? esc(n) : `Pilot ${p + 1}`; }
function debriefHtml(st) {
    const Rr = R, mine = st.mine;
    const vic = mine ? mine.victory : false;
    let h = `<button class="close" data-c7a="closeDebrief">CLOSE (Esc)</button>`;
    h += `<h1 class="${vic ? "" : "defeat"}">DEBRIEF · ${mine ? (vic ? "VICTORY" : "DEFEAT") : "…"}</h1>`;
    if (!mine)
        return h + `<div class="muted">Waiting for the battle record…</div>`;
    h += `<div>Grade <b class="gold">${progression_ts_1.GRADE_NAMES[mine.grade]?.toUpperCase() ?? "?"}</b>`;
    if (!st.partial) {
        const f = mine.gradeFactors;
        h += ` <span class="muted">· side objectives ${f.secondaries ? "✓" : "✗"} · time ${f.time ? "✓" : "✗"} · points held ${f.pointsHeld ? "✓" : "✗"} · vehicles lost ${f.vehiclesLost ? "✓" : "✗"}</span>`;
    }
    h += `</div>`;
    // squad table
    h += `<h2>SQUAD</h2><table><tr><th>Pilot</th><th>XP</th><th>Kills</th><th>Captures</th><th>Revives</th><th>Built</th><th>Destroyed</th><th>Repaired</th><th>Ore hauled</th><th>Time</th></tr>`;
    for (const r of st.rows) {
        const x = r.result, k = x.killsByClass.reduce((a, b) => a + b, 0), na = (v) => (r.partial ? `<span class="muted">—</span>` : v);
        h += `<tr class="${r.player === st.me ? "me" : ""}"><td>${playerName(r.player)}${r.player === st.me ? " (you)" : ""}</td><td>${fmt(x.xp)}</td><td>${k.toFixed(k % 1 ? 1 : 0)}</td><td>${x.captures}</td><td>${na(String(x.revives))}</td><td>${na(String(x.structuresBuilt))}</td><td>${na(String(x.structuresDestroyed))}</td><td>${na(fmt(x.hullRepaired))}</td><td>${na(fmt(x.oreHauled))}</td><td>${na(`${Math.floor(x.timeSeconds / 60)}:${String(Math.floor(x.timeSeconds % 60)).padStart(2, "0")}`)}</td></tr>`;
    }
    h += `</table>`;
    if (st.partial)
        h += `<div class="muted">Guest: the host sends the XP, grade, kills and captures of each pilot; the full record (breakdown, mastery, salvage) stays on the host.</div>`;
    // XP breakdown
    h += `<div class="row"><div style="flex:1;min-width:300px"><h2>XP</h2><table>`;
    if (!st.partial) {
        for (const [k, v] of Object.entries(mine.xpParts))
            if (v)
                h += `<tr><td>${XP_PART_TEXT[k] ?? k}</td><td>${fmt(v)}</td></tr>`;
        if (!mine.victory)
            h += `<tr><td>Defeat: ${Math.round(Rr.defeatXp * 100)}% paid</td><td>× ${Rr.defeatXp}</td></tr>`;
        const kc = mine.killsByClass.map((v, i) => (v ? `${progression_ts_1.KILL_CLASSES[i]} ${v % 1 ? v.toFixed(1) : v}` : "")).filter(Boolean).join(" · ");
        if (kc)
            h += `<tr><td colspan="2" class="muted">kills: ${kc}</td></tr>`;
    }
    const d = st.delta;
    if (d && d.xpGained !== mine.xp)
        h += `<tr><td>Low-rank bonus (+${Math.round(Rr.lowRankBonus * 100)}%: higher-ranked squadmate)</td><td>+${fmt(d.xpGained - mine.xp)}</td></tr>`;
    h += `<tr><td><b>XP gained</b></td><td><b>${fmt(d ? d.xpGained : mine.xp)}</b></td></tr>`;
    if (!st.partial)
        h += `<tr><td>Salvage</td><td>${fmt(mine.salvage)}</td></tr>`;
    h += `</table></div><div style="flex:1;min-width:300px"><h2>RANK</h2>`;
    const p = store.profile, rp = (0, profile_ts_1.rankProgress)(Rr, p.xp);
    const beforeXp = d ? d.before.xp : p.xp - mine.xp;
    const lo = (0, progression_ts_1.xpForRank)(Rr, rp.rank), span = rp.need || 1;
    const oldFrac = Math.max(0, Math.min(1, (beforeXp - lo) / span));
    h += `<div>Rank <b>${rp.rank}</b>${d && d.rankAfter > d.rankBefore ? ` <span class="good">▲ from ${d.rankBefore}</span>` : ""} · ${rp.need ? `${fmt(rp.into)} / ${fmt(rp.need)} XP to rank ${rp.rank + 1}` : "max rank"}</div>`;
    h += `<div class="bar"><b style="width:${(oldFrac * 100).toFixed(1)}%"></b><i style="left:${(oldFrac * 100).toFixed(1)}%;width:${(Math.max(0, rp.frac - oldFrac) * 100).toFixed(1)}%"></i></div><div class="muted">cyan: before this battle · gold: gained</div>`;
    h += `<h2>NEW</h2>`;
    const news = [];
    if (d) {
        if (d.tokensGained > 0)
            news.push(`<span class="gold">+${d.tokensGained} unlock token${d.tokensGained > 1 ? "s" : ""}</span>: spend them in PROFILE`);
        for (const m of d.milestones)
            news.push(`Rank milestone: ${MILESTONE_TEXT[m] ?? m}`);
        for (const m of d.mastery)
            news.push(`Mastery: ${nm(m.key.slice(m.key.indexOf(":") + 1))} level ${m.to}${m.to >= 3 && m.from < 3 ? " · choose its level-3 bonus in PROFILE" : ""}`);
        for (const b of d.blueprints)
            news.push(`<span class="gold">Blueprint</span>: ${esc(b)} (first Gold)`);
    }
    if (st.alreadyApplied)
        news.push(`<span class="muted">This result was already added to your profile.</span>`);
    h += news.length ? news.map((x) => `<div>${x}</div>`).join("") : `<div class="muted">nothing new this time</div>`;
    if (!store.backend || !store.backend.persistent)
        h += `<div class="bad">Browser storage is unavailable: progress lasts until the page closes (export a code in PROFILE).</div>`;
    h += `<div style="margin-top:10px"><button data-c7a="openProfile">PROFILE</button></div></div></div>`;
    return h;
}
function showDebrief() {
    if (!debriefEl || !tracker?.state)
        return;
    if (debriefCard)
        debriefCard.innerHTML = debriefHtml(tracker.state);
    debriefEl.style.display = "flex";
}
function hideDebrief() { if (debriefEl)
    debriefEl.style.display = "none"; }
function refreshDebrief() { if (debriefEl && debriefEl.style.display !== "none")
    showDebrief(); }
// ------------------------------------------------------------------ profile screen (item 3) and loadout (item 4)
const TABS_ALL = [["overview", "RANK"], ["unlocks", "UNLOCKS"], ["mastery", "MASTERY"], ["loadout", "LOADOUT"], ["code", "MOVE PROFILE"]];
let TABS = TABS_ALL;
const POOLS = ["pilotWeapons", "calls", "vehicleWeapons", "pilotGear"]; // ruling 56: no vehicle licences
const tok = (p) => R?.fl ? (0, progression_ts_1.flTokens)(R, p) : p.tokens;
function profileHtml() {
    const Rr = R, st = store, p = st.profile, rp = (0, profile_ts_1.rankProgress)(Rr, p.xp), slots = (0, progression_ts_1.loadoutSlots)(Rr, p.rank);
    let h = `<button class="close" data-c7a="closeProfile">CLOSE (Esc)</button><h1>PROFILE</h1>`;
    h += `<div>Rank <b>${p.rank}</b> / ${Rr.maxRank} · ${fmt(p.xp)} XP · <span class="gold">${tok(p)} unlock token${tok(p) === 1 ? "" : "s"}</span> · salvage ${fmt(p.salvage)} · ${p.blueprints.length} blueprint${p.blueprints.length === 1 ? "" : "s"}</div>`;
    h += `<div class="bar"><b style="width:${(rp.frac * 100).toFixed(1)}%"></b></div><div class="muted">${rp.need ? `${fmt(rp.into)} / ${fmt(rp.need)} XP to rank ${rp.rank + 1}` : "max rank"}</div>`;
    if (st.loadNote)
        h += `<div class="bad">${esc(st.loadNote)}</div>`;
    if (st.refundNote)
        h += `<div class="gold">${esc(st.refundNote)}</div>`;
    if (profileMsg)
        h += `<div class="gold">${esc(profileMsg)}</div>`;
    h += `<div class="tabs">${TABS.map(([k, t]) => `<button class="${profileTab === k ? "on" : ""}" data-c7a="tab" data-k="${k}">${t}</button>`).join("")}</div>`;
    if (profileTab === "overview") {
        h += `<h2>RANK TRACK</h2><table><tr><th>Rank</th><th>Total XP</th><th>Gives</th></tr>`;
        for (let r = 1; r <= Rr.maxRank; r++) {
            const ms = Rr.milestones.filter((m) => m.rank === r).map((m) => MILESTONE_TEXT[m.unlocks] ?? m.unlocks);
            const flBonus = Rr.fl && Rr.fl.bonus.includes(r);
            const gives = Rr.fl
                ? (r === 1 ? "start: every loadout option already in the game (new items unlock with tokens)" : `+${(Rr.fl?.perRank ?? Rr.tokensPerRank) + (flBonus ? 1 : 0)} unlock tokens${flBonus ? " (bonus rank)" : ""}`)
                : r === 1 ? `start: every vehicle · ${Rr.starting.calls.map(nm).join(", ")} · ${Rr.callSlots.base} call slots` : [`+${Rr.tokensPerRank} unlock token`, ...ms].join(" · ");
            h += `<tr class="${r === p.rank ? "me" : ""}"><td>${r}${r === p.rank ? " ◀" : ""}</td><td>${fmt((0, progression_ts_1.xpForRank)(Rr, r))}</td><td class="${r <= p.rank ? "" : "muted"}">${gives}</td></tr>`;
        }
        h += `</table><div class="muted">XP per battle: objectives, kills, captures, revives, building, repairs, hauling; a defeat pays ${Math.round(Rr.defeatXp * 100)}%. Pilots under rank ${Rr.lowRankBelow} get +${Math.round(Rr.lowRankBonus * 100)}% with a higher-ranked squadmate.</div>`;
    }
    else if (profileTab === "unlocks" && Rr.fl) {
        if (!Object.keys(Rr.fl.cost).length) { // designer 19 Nov: no unlocks for now; the planned list, coming soon
            h += `<div class="muted">Every loadout option is open to everyone for now. These unlocks are coming: you'll spend the tokens you earn by ranking up on them (one per rank, two at every fifth). Nothing below can be bought yet.</div>`;
            for (const g of planned) {
                h += `<h2>${esc(g.name).toUpperCase()} <span class="muted">· coming soon</span></h2>`;
                for (const it of g.items)
                    h += `<span class="item lock" title="${esc(it.what)}">${esc(it.name)} · ${it.cost} token${it.cost === 1 ? "" : "s"} <span class="muted">· ${esc(it.what)}</span></span>`;
            }
        }
        else {
            // designer 22 Nov: the options that were already in the game stay free; only new items cost tokens. The
            // unlocks available now come first, then the planned list (it had vanished once any item had a price)
            h += `<div class="muted">Spend tokens on new items: three tokens per rank, four at ranks ${Rr.fl.bonus.join(", ")}. Everything that was already in the game stays free. You can also unlock straight from the loadout (click a locked card twice).</div>`;
            h += `<h2>AVAILABLE NOW</h2>`;
            for (const pool of Object.keys(FL_POOL_TEXT))
                for (const id of Rr.fl.pools[pool] ?? []) {
                    if (!Rr.fl.cost[pool] || Rr.fl.cost[pool][id] === undefined)
                        continue;
                    const own = (0, progression_ts_1.flOwns)(Rr, p, pool, id), c = (0, progression_ts_1.flCost)(Rr, pool, id);
                    h += `<span class="item ${own ? "own" : "lock"}">${esc(flNm(pool, id))} <span class="muted">· ${FL_POOL_TEXT[pool].toLowerCase()}</span> · ${own ? "owned" : `${c} token${c === 1 ? "" : "s"} <button data-c7a="unlock" data-pool="${pool}" data-id="${id}" ${tok(p) >= c ? "" : "disabled"}>UNLOCK</button>`}</span>`;
                }
            for (const g of planned) {
                h += `<h2>${esc(g.name).toUpperCase()} <span class="muted">· coming soon</span></h2>`;
                for (const it of g.items)
                    h += `<span class="item lock" title="${esc(it.what)}">${esc(it.name)} · ${it.cost} token${it.cost === 1 ? "" : "s"} <span class="muted">· ${esc(it.what)}</span></span>`;
            }
        }
        for (const pool of Object.keys(FL_POOL_TEXT)) {
            if (!Rr.fl.pools[pool] || Object.keys(Rr.fl.cost).length)
                continue;
            h += `<h2>${FL_POOL_TEXT[pool].toUpperCase()}</h2>`;
            for (const id of Rr.fl.pools[pool]) {
                const own = (0, progression_ts_1.flOwns)(Rr, p, pool, id), free = (Rr.fl.start[pool] ?? []).includes(id), c = (0, progression_ts_1.flCost)(Rr, pool, id);
                h += `<span class="item ${own ? "own" : "lock"}">${esc(flNm(pool, id))} · ${own ? (free ? "standard" : "owned") : `${c} token${c === 1 ? "" : "s"} <button data-c7a="unlock" data-pool="${pool}" data-id="${id}" ${tok(p) >= c ? "" : "disabled"}>UNLOCK</button>`}</span>`;
            }
        }
    }
    else if (profileTab === "unlocks") {
        h += `<div class="muted">Each unlock costs ${Rr.tokenCost} token (one per rank). Every vehicle is open to every player: there are no vehicle licences.</div>`;
        for (const pool of POOLS) {
            h += `<h2>${POOL_TEXT[pool].toUpperCase()}${NO_EFFECT[pool] ? ` <span class="muted">· ${NO_EFFECT[pool]}</span>` : ""}</h2>`;
            if (pool === "pilotWeapons")
                h += `<span class="item own">${nm(profile_ts_1.STANDARD_WEAPON)} · standard</span>`;
            for (const id of Rr.pools[pool]) {
                const own = p.unlocks[pool].includes(id), free = Rr.starting[pool]?.includes(id);
                h += `<span class="item ${own ? "own" : "lock"}">${esc(nm(id))} · ${own ? (free ? "owned (free)" : "owned") : `locked · needs ${Rr.tokenCost} token <button data-c7a="unlock" data-pool="${pool}" data-id="${id}" ${p.tokens >= Rr.tokenCost ? "" : "disabled"}>UNLOCK</button>`}</span>`;
            }
        }
    }
    else if (profileTab === "mastery") {
        const eff = (0, progression_ts_1.profileEffects)(Rr, p);
        h += `<div class="muted">Mastery levels 1-${Rr.masteryLevels} per vehicle and weapon, from the kill XP earned with it (levels at ${Rr.masteryXp.slice(1).map(fmt).join(" / ")} XP). Level 3: vehicle +${Math.round(Rr.vehicleL3.hull * 100)}% hull or +${Math.round(Rr.vehicleL3.speed * 100)}% speed; weapon +${Math.round(Rr.weaponL3.damage * 100)}% damage or +${Math.round(Rr.weaponL3.ammo * 100)}% ammo. Flat bonuses are capped at +${Math.round(Rr.statCap * 100)}% per item. Levels 2, 4, 5 (mods, attachments, perks): nothing to fit yet.</div>`;
        const keys = Object.keys(p.mastery).sort();
        if (!keys.length)
            h += `<div class="muted">No mastery yet: fight with a vehicle or weapon.</div>`;
        else {
            h += `<table><tr><th>Item</th><th>Level</th><th>XP</th><th>Bonus</th><th>Level-3 choice</th></tr>`;
            for (const k of keys) {
                const m = p.mastery[k], veh = k.startsWith("vehicle:"), id = k.slice(k.indexOf(":") + 1), mp = (0, profile_ts_1.masteryProgress)(Rr, m.xp);
                const bonus = veh ? (eff.vehicleHull[id] ? `+${Math.round(eff.vehicleHull[id] * 100)}% hull` : eff.vehicleSpeed[id] ? `+${Math.round(eff.vehicleSpeed[id] * 100)}% speed` : "—")
                    : (eff.weaponDamage[id] ? `+${Math.round(eff.weaponDamage[id] * 100)}% damage` : eff.weaponAmmo[id] ? `+${Math.round(eff.weaponAmmo[id] * 100)}% ammo (no effect: the sim has no ammunition)` : "—");
                const opts = veh ? ["hull", "speed"] : ["damage", "ammo"];
                const choice = m.level >= 3 ? opts.map((c) => `<button class="${m.choice === c ? "on" : ""}" data-c7a="mastery" data-k="${k}" data-c="${c}">${c.toUpperCase()}</button>`).join("") : `<span class="muted">at level 3</span>`;
                h += `<tr><td>${veh ? "Vehicle" : "Weapon"} · ${esc(nm(id))}</td><td>${m.level}</td><td>${fmt(m.xp)}${mp.next !== null ? ` / ${fmt(mp.next)}` : " (max)"}</td><td>${bonus}</td><td>${choice}</td></tr>`;
            }
            h += `</table>`;
        }
    }
    else if (profileTab === "loadout") {
        const l = st.loadout;
        h += `<h2>PILOT WEAPON <span class="muted">· replaces the carbine on your pilot at every spawn</span></h2>`;
        for (const w of [profile_ts_1.STANDARD_WEAPON, ...Rr.pools.pilotWeapons]) {
            const own = w === profile_ts_1.STANDARD_WEAPON || p.unlocks.pilotWeapons.includes(w);
            h += `<button class="${l.pilotWeapon === w ? "on" : ""}" data-c7a="weapon" data-id="${w}" ${own ? "" : "disabled"}>${esc(nm(w))}${own ? "" : " · locked"}</button>`;
        }
        h += `<h2>SUPPORT CALLS · ${l.calls.length} / ${slots.calls} slots${slots.calls < Rr.callSlots.max ? ` <span class="muted">· slot ${Rr.callSlots.max} at rank ${Rr.milestones.find((m) => m.unlocks === "support-call-slot-3")?.rank ?? "?"}</span>` : ""}</h2>`;
        for (const c of Rr.pools.calls) {
            const own = p.unlocks.calls.includes(c);
            if (!own)
                continue;
            h += `<button class="${l.calls.includes(c) ? "on" : ""}" data-c7a="call" data-id="${c}">${esc(nm(c))}</button>`;
        }
        h += `<div class="muted">Only owned calls are listed (unlock more under UNLOCKS). The loadout is used when you deploy or host; as a guest it is sent to the host when you join. In a match, press K (or LOADOUT on the command view's calls bar, or CALL LOADOUT in the pause menu) to see and change the call loadout: changes apply on foot at a supplied Barracks or your Command Core, or while you are down.</div>`;
    }
    else if (profileTab === "code") {
        h += `<h2>EXPORT</h2><div class="muted">Copy this code to move your profile to another browser.</div><textarea id="c7aCodeOut" readonly>${(0, profile_ts_1.exportCode)(p)}</textarea>`;
        h += `<h2>IMPORT</h2><div class="muted">Paste a code: it replaces this browser's profile (checked against the rules first).</div><textarea id="c7aCodeIn"></textarea><button data-c7a="import">IMPORT</button>`;
        h += `<h2>RESET</h2><button data-c7a="reset">NEW RANK-1 PROFILE</button> <span class="muted">click twice</span>`;
    }
    return h;
}
let resetArmed = false;
function onProfileAction(a, d) {
    const st = store;
    profileMsg = "";
    if (a !== "reset")
        resetArmed = false;
    if (a !== "tab" && a !== "closeProfile")
        touched = true;
    if (a === "closeProfile") {
        hideProfile();
        return;
    }
    if (a === "tab")
        profileTab = d.k ?? "overview";
    else if (a === "unlock") {
        const r = st.spend(d.pool, d.id ?? "");
        profileMsg = r.ok ? `Unlocked ${d.pool?.startsWith("fl") ? flNm(d.pool, d.id ?? "") : nm(d.id ?? "")}.` : `Cannot unlock: ${r.reason}`;
        if (r.ok)
            flChanged?.();
    }
    else if (a === "mastery") {
        const r = (0, progression_ts_1.chooseMastery)(R, st.profile, d.k ?? "", d.c);
        if (r.ok)
            st.setProfile(r.profile);
        else
            profileMsg = `Cannot choose: ${r.reason}`;
    }
    else if (a === "weapon")
        st.setLoadout({ ...st.loadout, pilotWeapon: d.id ?? profile_ts_1.STANDARD_WEAPON });
    else if (a === "call") {
        const r = (0, profile_ts_1.toggleCall)(R, st.profile, st.loadout, d.id ?? "");
        if (r.ok)
            st.setLoadout(r.loadout);
        else
            profileMsg = `Cannot add: ${r.reason}`;
    }
    else if (a === "import") {
        const ta = document.getElementById("c7aCodeIn");
        const r = st.import(ta?.value ?? "");
        profileMsg = r.ok ? `Profile imported: rank ${st.profile.rank}.` : `Import refused: ${r.reason}`;
        st.loadNote = null;
    }
    else if (a === "reset") {
        if (resetArmed) {
            st.reset();
            st.loadNote = null;
            profileMsg = "New rank-1 profile.";
            resetArmed = false;
        }
        else {
            resetArmed = true;
            profileMsg = "Click again to replace this profile with a new rank-1 profile.";
        }
    }
    showProfile();
}
function showProfile() { if (!profileEl || !profileCard || !store)
    return; profileCard.innerHTML = profileHtml(); profileEl.style.display = "flex"; }
function hideProfile() { if (profileEl)
    profileEl.style.display = "none"; updateStartLine(); }
/** The start screen line: PROFILE button, rank, loadout. */
function updateStartLine() {
    if (!startLine || !store || !R)
        return;
    const p = store.profile, l = store.loadout;
    const span = startLine.querySelector("span");
    if (span)
        span.innerHTML = document.getElementById("loSlot") // Frontline: the loadout is chosen in its own section, not this old call loadout
            ? (R.fl && !Object.keys(R.fl.cost).length ? `RANK <b>${p.rank}</b> · ${tok(p)} token${tok(p) === 1 ? "" : "s"} saved for the coming unlocks · every loadout option is open` : `RANK <b>${p.rank}</b> · <span class="gold">${tok(p)} unlock token${tok(p) === 1 ? "" : "s"}</span> · spend them on loadout options`)
            : `RANK <b>${p.rank}</b> · ${p.tokens} token${p.tokens === 1 ? "" : "s"} · LOADOUT ${esc(nm(l.pilotWeapon))} · ${l.calls.length ? l.calls.map((c) => esc(nm(c))).join(", ") : "no calls"} (${l.calls.length}/${(0, progression_ts_1.loadoutSlots)(R, p.rank).calls})`;
}
function installStart() {
    const choices = document.getElementById("startBtn")?.parentElement;
    if (!choices?.parentElement)
        return;
    startLine = document.createElement("div");
    startLine.id = "c7aStartLine";
    startLine.innerHTML = `<button id="c7aProfileBtn">PROFILE</button><span></span>`;
    const slot = document.getElementById("c7aSlot"); // Frontline: the start card's Profile section
    if (slot)
        slot.appendChild(startLine);
    else if (typeof choices.parentElement.insertBefore === "function")
        choices.parentElement.insertBefore(startLine, choices.nextSibling);
    else
        choices.parentElement.appendChild(startLine);
    startLine.querySelector("button").addEventListener("click", (ev) => { ev.stopPropagation(); profileTab = "overview"; showProfile(); });
    updateStartLine();
}
// ------------------------------------------------------------------ public hooks
exports.c7a = {
    /** Frontline unlocks (the loadout picker): owned?, cost, tokens left, unlock (spends tokens), a change listener. */
    flOwns(pool, id) { return !R || !store ? true : (0, progression_ts_1.flOwns)(R, store.profile, pool, id); },
    flCost(pool, id) { return R ? (0, progression_ts_1.flCost)(R, pool, id) : 0; },
    /** Are there any Frontline unlocks at all (an empty list: every option open)? */
    flAny() { return !!R?.fl && Object.keys(R.fl.cost).length > 0; },
    flTokens() { return R && store ? tok(store.profile) : 0; },
    flUnlock(pool, id) {
        if (!store)
            return { ok: false, reason: "no profile" };
        touched = true;
        const r = store.spend(pool, id);
        if (r.ok)
            updateStartLine();
        return r;
    },
    /** Test aid: give the profile Frontline unlocks without spending tokens. */
    testGrant(pool, ids) { if (!store) return false; const u = store.profile.unlocks ??= {}; u[pool] = [...new Set([...(u[pool] ?? []), ...ids])]; if (flChanged) flChanged(); return true; },
    onFlChange(fn) { flChanged = fn; },
    /** Called once per page (main.ts). Never throws: progression is optional to the page. */
    install(h) {
        try {
            hooks = h;
            R = (0, progression_ts_1.progressionRules)(h.data);
            if (R.fl)
                TABS = TABS_ALL.filter(([k]) => k !== "loadout"); // Frontline: the loadout is chosen on the start screen
            store = new profile_ts_1.ProfileStore(R);
            tracker = new profile_ts_1.DebriefTracker(store, Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
            const raw = h.data;
            for (const l of [raw.units, raw.weapons, raw.supportCalls?.calls])
                for (const x of l ?? [])
                    names[x.id] = x.name ?? x.id;
            planned = raw.progression?.frontline?.planned?.groups ?? []; // the coming unlocks (listed only)
            const F = raw.constants?.frontline;
            if (F) { // Frontline item names for the unlock lists
                const wn = (id) => (names[id] ?? id).replace(/^Pilot /, "").replace(/^\w/, (c) => c.toUpperCase());
                for (const [k, v] of Object.entries(F.guns ?? {}))
                    flNames[`flGuns:${k}`] = v.name;
                flNames["flType:kinetic"] = "Kinetic";
                flNames["flType:laser"] = "Laser (every slot 1 gun)";
                for (const [k, v] of Object.entries(F.roles ?? {}))
                    flNames[`flSlot2:${k}`] = wn(v.weapon);
                for (const [k, v] of Object.entries(F.grenades ?? {}))
                    flNames[`flGrenades:${k}`] = v.name;
                for (const [k, v] of Object.entries(F.armour ?? {}))
                    flNames[`flArmour:${k}`] = `${v.name} armour`;
                for (const [k, v] of Object.entries(F.slot3 ?? {}))
                    flNames[`flSlot3:${k}`] = v;
            }
            if (typeof document === "undefined" || !document.body)
                return;
            const st = document.createElement("style");
            st.textContent = CSS;
            (document.head ?? document.body).appendChild(st);
            debriefEl = el("div", "c7aDebrief", "c7a-ov");
            debriefCard = debriefEl.appendChild(document.createElement("div"));
            debriefCard.className = "c7a-card";
            profileEl = el("div", "c7aProfile", "c7a-ov");
            profileCard = profileEl.appendChild(document.createElement("div"));
            profileCard.className = "c7a-card";
            delegate(debriefEl, (a) => { if (a === "closeDebrief")
                hideDebrief();
            else if (a === "openProfile") {
                hideDebrief();
                showProfile();
            } });
            delegate(profileEl, (a, d) => onProfileAction(a, d));
            // DEBRIEF on the match-over panel; Play again closes the debrief
            const again = document.getElementById("againBtn");
            if (again?.parentElement) {
                const b = document.createElement("button");
                b.id = "c7aDebriefBtn";
                b.innerHTML = "DEBRIEF<small>XP · rank · unlocks</small>";
                b.addEventListener("click", (ev) => { ev.stopPropagation(); showDebrief(); });
                if (typeof again.parentElement.insertBefore === "function")
                    again.parentElement.insertBefore(b, again);
                else
                    again.parentElement.appendChild(b);
                again.addEventListener("click", () => { hideDebrief(); hideProfile(); });
            }
            // keys while an overlay is open belong to it (Esc closes; typing in the code box reaches the box, not the game)
            window.addEventListener("keydown", (ev) => {
                const pOpen = profileEl?.style.display === "flex", dOpen = debriefEl?.style.display === "flex";
                if (!pOpen && !dOpen)
                    return;
                ev.stopImmediatePropagation();
                if (ev.code === "Escape") {
                    ev.preventDefault();
                    if (pOpen)
                        hideProfile();
                    else
                        hideDebrief();
                }
            }, true);
            installStart();
        }
        catch (err) {
            console.warn("C7a progression UI not installed:", err);
        }
    },
    /** Worker message hook: true when it was a C7a message. */
    workerMsg(m) {
        const x = m;
        if (!x || x.t !== "c7aResults")
            return false;
        if (tracker) {
            tracker.full(x.results, x.ranks ?? {});
            refreshDebrief();
        }
        return true;
    },
    /** The match is over (MatchWatch fired). */
    matchOver() {
        if (!tracker || !hooks)
            return;
        tracker.matchOver(hooks.slot());
        hideProfile();
        autoDebriefAt = performance.now() + 2500; // after the VICTORY / DEFEAT panel
    },
    /** Snapshot events hook (BATTLE_RESULT). */
    events(evs) {
        if (!tracker || !hooks)
            return;
        for (const e of evs)
            if (e.kind === events_ts_1.EV.BATTLE_RESULT) {
                tracker.event(e, hooks.role() === "guest");
                refreshDebrief();
            }
        if (autoDebriefAt && performance.now() >= autoDebriefAt && tracker.state?.mine) {
            autoDebriefAt = 0;
            showDebrief();
        }
    },
    /** Host match start (sendInit): the own profile and loadout go to the worker. */
    beginMatch() {
        if (!store || !hooks)
            return;
        hideDebrief();
        autoDebriefAt = 0;
        if (!active())
            return;
        hooks.send({ t: "c7aLoadout", loadout: { player: hooks.slot(), profile: store.profile, pilotWeapon: store.loadout.pilotWeapon, calls: store.loadout.calls } });
    },
    /** D1 test cheats: the profile changed in a running match: it goes to the host's sim at once (single player / host). */
    resend() {
        touched = true;
        if (!store || !hooks || hooks.role() === "guest")
            return;
        hooks.send({ t: "c7aLoadout", loadout: { player: hooks.slot(), profile: store.profile, pilotWeapon: store.loadout.pilotWeapon, calls: store.loadout.calls } });
    },
    /** Guest join payload (the hello's optional c7a field). */
    hello() { return store && active() ? (0, profile_ts_1.joinPayload)(store) : undefined; },
    /** Debug / tests: the profile is in use from now on (as after a profile-screen action). */
    activate() { touched = true; },
    /** Debug / tests. */
    get store() { return store; },
    get tracker() { return tracker; },
};
