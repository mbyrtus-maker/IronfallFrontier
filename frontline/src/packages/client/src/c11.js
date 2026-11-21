"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointMemory = exports.CREW_RADIUS = exports.LOW_PILOTS = void 0;
exports.pilotHud = pilotHud;
exports.operatorSeats = operatorSeats;
exports.operatorMask = operatorMask;
exports.emptyOperatorSeats = emptyOperatorSeats;
exports.crewWarning = crewWarning;
exports.ageText = ageText;
exports.downedHelpText = downedHelpText;
exports.ammoHud = ammoHud;
const data_ts_1 = require("../../sim/src/data.js");
/** Available pilots at or below this (or a tenth of the reserve) is "low". */
exports.LOW_PILOTS = 3;
/** The top-bar pilot counter (ruling 48: in place of Command Points). */
function pilotHud(p) {
    if (!p)
        return { text: "", html: "", total: 0, level: "ok", title: "" };
    const total = p.initial + p.gained;
    const level = p.available <= 0 ? "none" : p.available <= Math.max(exports.LOW_PILOTS, Math.ceil(total * 0.1)) ? "low" : "ok";
    const tag = level === "none" ? " · NO PILOTS" : level === "low" ? " · LOW" : "";
    const text = `PILOTS ${p.available} · ${p.assigned} in vehicles · ${p.onFoot} on foot · ${p.lost} lost / ${total}${tag}`;
    const col = level === "none" ? "#ff5a4a" : level === "low" ? "#ffd23c" : "";
    const html = `<span class="pilots"${col ? ` style="color:${col}"` : ""} title="pilot reserve: at base (crews new vehicles) · in vehicles · on foot · lost, of the ${total} this battle">PILOTS <b>${p.available}</b> <small>· ${p.assigned} in veh · ${p.onFoot} on foot · ${p.lost} lost / ${total}</small>${level === "none" ? " <b>NO PILOTS</b>" : level === "low" ? " <b>LOW</b>" : ""}</span>`;
    const title = level === "none" ? "no pilots at base: new vehicles arrive uncrewed" : level === "low" ? "few pilots left at base" : "";
    return { text, html, total, level, title };
}
/** Operator seats a unit type needs from the reserve (driver + gunner seats; passengers take no pilot; infantry none). */
function operatorSeats(cd, t) {
    let n = 0;
    for (let j = 0; j < cd.tSeatCount[t]; j++)
        if (cd.tSeatRole[t * data_ts_1.MAX_SEATS + j] !== data_ts_1.SEAT_PASSENGER)
            n++;
    return n;
}
/** Bit mask of a unit type's operator seats (crew bits: bit j = seat j occupied). */
function operatorMask(cd, t) {
    let m = 0;
    for (let j = 0; j < cd.tSeatCount[t]; j++)
        if (cd.tSeatRole[t * data_ts_1.MAX_SEATS + j] !== data_ts_1.SEAT_PASSENGER)
            m |= 1 << j;
    return m;
}
/** Empty operator seats of a vehicle (crew bits). */
function emptyOperatorSeats(cd, t, crew) {
    let n = 0;
    const m = operatorMask(cd, t) & ~crew;
    for (let j = 0; j < 12; j++)
        if (m & (1 << j))
            n++;
    return n;
}
/** S14: pilots are seated within this distance of a pilot home (constants.pilotReserve.crewRadiusMetres). */
exports.CREW_RADIUS = 150;
/** Production-panel warning for a crewed vehicle the reserve cannot crew (pilots promised to queued vehicles count). */
function crewWarning(seats, available, promised) {
    if (seats <= 0)
        return "";
    const free = available - promised;
    if (free <= 0)
        return "will arrive uncrewed: no pilots";
    if (free < seats)
        return `will arrive short of crew: ${free} of ${seats} pilots`;
    return "";
}
/**
 * Last seen state per point. update() with each new points block; merged() gives the block with every unseen point
 * replaced by its last seen record (still seen: false) or, never seen, the empty record. info(i): known / when.
 */
class PointMemory {
    last = new Map();
    at = new Map();
    src = null;
    out = null;
    update(pv, nowMs) {
        if (!pv || pv === this.src)
            return;
        this.src = pv;
        for (const p of pv.points)
            if (p.seen !== false) {
                this.last.set(p.index, p);
                this.at.set(p.index, nowMs);
            }
        this.out = { ...pv, points: pv.points.map((p) => (p.seen !== false ? p : this.last.has(p.index) ? { ...this.last.get(p.index), seen: false, contested: false, underAttack: false, hacking: false, captureProgress: 0, captureTeam: -1 } : p)) };
    }
    merged() { return this.out; }
    info(i) {
        const p = this.src?.points[i];
        if (!p || p.seen !== false)
            return null;
        return { known: this.last.has(i), seenAtMs: this.at.get(i) ?? 0 };
    }
    clear() { this.last.clear(); this.at.clear(); this.src = null; this.out = null; }
}
exports.PointMemory = PointMemory;
/** "12 s" / "3 min" */
function ageText(ms) { const s = Math.max(0, Math.round(ms / 1000)); return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`; }
// ---- item 5 (rulings 79 / 88): downed with help coming; no downed state when nobody can help
/** The downed overlay's line from the sim's help record (null: no record yet, keep the old text). */
function downedHelpText(h, helperName, helperDist, seconds, revive) {
    if (!h)
        return null;
    if (h.playerReviving || revive > 0)
        return `BEING REVIVED · ${Math.round(revive * 100)}% · bleed-out in ${seconds} s`;
    if (h.aiReviving)
        return `BEING REVIVED by a friendly ${helperName} · hold on · bleed-out in ${seconds} s`;
    if (h.aiHelper)
        return `HELP IS COMING · a friendly ${helperName}${helperDist !== null ? `, ${Math.round(helperDist)} m away` : ""} · bleed-out in ${seconds} s`;
    if (h.playersAlive)
        return `DOWNED · bleeding out in ${seconds} s · a squadmate can revive you: hold E beside your body`;
    return `DOWNED · nobody can reach you · bleed-out in ${seconds} s, then respawn at a Barracks or the Command Core`;
}
/** The aircraft HUD rows: rounds per limited weapon, EMPTY, REARMING with the refill fraction. */
function ammoHud(a, name, atPad) {
    if (!a || !a.mounts.length)
        return { html: "", empty: false, anyEmpty: false, rearming: false, frac: 1 };
    let left = 0, full = 0;
    for (const m of a.mounts) {
        left += m.left;
        full += m.full;
    }
    const frac = full > 0 ? left / full : 1, empty = left <= 0, anyEmpty = a.mounts.some((m) => m.left <= 0);
    const rearming = (a.rearming || atPad) && frac < 1;
    const rows = a.mounts.map((m) => `<div class="am${m.left <= 0 ? " empty" : ""}"><span>${name(m.mount)}</span><b>${m.left <= 0 ? "EMPTY" : `${m.left} / ${m.full}`}</b></div>`).join("");
    const st = rearming ? `<div class="st rearm">REARMING ${Math.round(frac * 100)}%</div><i><b style="width:${(frac * 100).toFixed(0)}%"></b></i>`
        : empty ? `<div class="st empty">EMPTY · land at an Air Pad to rearm</div>` : anyEmpty ? `<div class="st empty">a weapon is empty · rearm at an Air Pad</div>` : "";
    return { html: `<div class="row"><span class="label">Ammunition</span></div>${rows}${st}`, empty, anyEmpty, rearming, frac };
}
