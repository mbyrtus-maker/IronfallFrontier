"use strict";
// Client C8: QA4 fixes and the newest sim rules on screen (rulings 40-42). Pure helpers, so the logic tests can call them.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHELL_REFUSED = exports.EYE_HEIGHT = void 0;
exports.hudScale = hudScale;
exports.topColumnMax = topColumnMax;
exports.aircraftHeight = aircraftHeight;
exports.lowFlightRules = lowFlightRules;
exports.flightMode = flightMode;
exports.flightLine = flightLine;
exports.stanceRules = stanceRules;
exports.stanceOf = stanceOf;
exports.stanceLine = stanceLine;
exports.stanceIcon = stanceIcon;
exports.indirectTypes = indirectTypes;
exports.attackGroundOrder = attackGroundOrder;
/** HUD scale from the window size: 1 at 1500 x 820 and above, smaller below (never under 0.4). The side columns,
 * the centre columns and every panel in them scale by it; the panels drawn over the view (help, build, ride menu,
 * prompt) use the panel scale, a little larger, so text stays readable at 1280 x 720. */
function hudScale(w, h) {
    const hs = Math.max(0.4, Math.min(1, w / 1500, h / 820));
    return { hs: Math.round(hs * 100) / 100, hp: Math.round(Math.max(0.45, Math.min(1, hs * 1.12)) * 100) / 100 };
}
/** Max height (column px, before the column's zoom) of a top column so it stops above the bottom column on its side. */
function topColumnMax(viewH, hs, bottomColumnPx) {
    return Math.max(120, Math.floor((viewH - bottomColumnPx - 28 * hs - 8) / hs));
}
/** QA4 bug 5: an aircraft's height above the ground. The snapshot's altitude of an air type is the offset from its
 * flight height (constants.airAltitude): 0 cruising, -airAltitude landed, negative in low flight (ruling 41). */
function aircraftHeight(altitudeOffset, airAltitude) {
    return Math.max(0, airAltitude + altitudeOffset);
}
/** constants.stealth.lowFlight* (all three or none, as the sim reads them); null: low flight is off in this data. */
function lowFlightRules(constants) {
    const st = (constants.stealth ?? {});
    const alt = st.lowFlightAltitudeMetres, sig = st.lowFlightSignatureMultiplier, sp = st.lowFlightSpeedMultiplier;
    return typeof alt === "number" && alt > 0 && typeof sig === "number" && sig > 0 && typeof sp === "number" && sp > 0 ? { alt, sig, speed: sp } : null;
}
/** The flight state from the toggle the pilot last asked for and the height above ground (the snapshot's altitude). */
function flightMode(wantLow, height, normalAlt, r, landing) {
    if (height < 0.5)
        return "LANDED";
    if (!r || landing)
        return height < normalAlt - 1 && !landing ? "CLIMBING" : "NORMAL";
    if (wantLow)
        return height <= r.alt + 1.5 ? "LOW" : "DESCENDING";
    return height < normalAlt - 1 ? "CLIMBING" : "NORMAL";
}
/** The status line for the aircraft pilot: the mode, the key, and the trade-off (ruling 41). */
function flightLine(m, r, normalAlt, key = "Space") {
    if (!r)
        return `FLIGHT ${m === "LANDED" ? "· LANDED" : `NORMAL · ${normalAlt} m`} · low flight is not in this battle's rules`;
    const pct = (k) => `×${k}`;
    if (m === "LOW")
        return `FLIGHT LOW · ${r.alt} m · signature ${pct(r.sig)}, radar needs line of sight · speed ${pct(r.speed)}, every ground weapon reaches you · ${key}: normal`;
    if (m === "DESCENDING")
        return `FLIGHT → LOW · descending to ${r.alt} m · ${key}: back to normal`;
    if (m === "CLIMBING")
        return `FLIGHT → NORMAL · climbing to ${normalAlt} m · ${key}: low`;
    if (m === "LANDED")
        return `FLIGHT · LANDED · ${key} in flight: low (${r.alt} m)`;
    return `FLIGHT NORMAL · ${normalAlt} m · ${key}: fly low (${r.alt} m) for stealth: signature ${pct(r.sig)}, hidden from radar without line of sight, speed ${pct(r.speed)}`;
}
/** constants.pilot.stance and stealth.pilot*Signature (absent: no prone effect, as in the sim); the pilot's standing
 * signature and crouch speed multiplier come from the compiled data. */
function stanceRules(constants, standSig, crouchSpeed) {
    const c = constants;
    const st = c.pilot?.stance ?? {};
    return {
        toProne: st.toProneSeconds ?? 0.6, upFromProne: st.upFromProneSeconds ?? 1.2,
        crouchAcc: st.crouchedAccuracyMultiplier ?? 1, proneAcc: st.proneAccuracyMultiplier ?? 1,
        crouchSig: c.stealth?.pilotCrouchedSignature ?? null, proneSig: c.stealth?.pilotProneSignature ?? null, standSig,
        crawl: st.proneSpeedMultiplier ?? 1, crouchSpeed,
    };
}
/** The own pilot's stance from its snapshot record (crouched flag, prone and changing crew bits: during a change the
 * record keeps the stance it changes from, so "changing and not prone" is going down, "changing and prone" getting up). */
function stanceOf(e) {
    if (!e)
        return "STANDING";
    if (e.stanceChanging)
        return e.prone ? "GETTING UP" : "GOING PRONE";
    return e.prone ? "PRONE" : e.crouched ? "CROUCHED" : "STANDING";
}
/** Eye height above the feet (m) per stance (presentation). */
exports.EYE_HEIGHT = { STANDING: 1.62, CROUCHED: 1.0, PRONE: 0.38 };
/** The HUD line: the stance, its accuracy and stealth, what the key does, the transition (cannot fire). */
function stanceLine(s, r, progress, key = "T") {
    const sig = (v) => (v === null ? "" : ` · signature ${v} (standing ${r.standSig})`);
    switch (s) {
        case "STANDING": return `STANDING · C crouch (hold) · ${key} prone`;
        case "CROUCHED": return `CROUCHED · accuracy ×${r.crouchAcc}${sig(r.crouchSig)} · speed ×${r.crouchSpeed}`;
        case "PRONE": return `PRONE · accuracy ×${r.proneAcc}${sig(r.proneSig)} · crawl ×${r.crawl} · no jump pack · ${key}: get up (${r.upFromProne} s)`;
        case "GOING PRONE": return `GOING PRONE · ${Math.round(progress * 100)}% of ${r.toProne} s · cannot fire`;
        case "GETTING UP": return `GETTING UP · ${Math.round(progress * 100)}% of ${r.upFromProne} s · cannot fire`;
    }
}
/** A small figure for the HUD stance line (inline SVG, 18 px): standing, crouched, lying; an arrow while changing. */
function stanceIcon(s) {
    const fig = {
        STANDING: '<circle cx="9" cy="3" r="2"/><path d="M9 5v6M9 11l-3 6M9 11l3 6M5 8h8"/>',
        CROUCHED: '<circle cx="8" cy="6" r="2"/><path d="M8 8l2 4M10 12l-4 1M6 13l1 4M10 12l2 5M5 10h7"/>',
        PRONE: '<circle cx="15" cy="12" r="2"/><path d="M13 13H4M4 13l-2 2M13 13l2 3M8 15h5"/>',
        "GOING PRONE": '<circle cx="12" cy="8" r="2"/><path d="M11 10l-5 4M6 14l-3 2M2 4l3 3M5 4v3H2"/>',
        "GETTING UP": '<circle cx="12" cy="6" r="2"/><path d="M11 8l-3 6M8 14l-4 2M3 9l3-3M3 6h3v3"/>',
    };
    return `<svg class="stIco" viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${fig[s]}</svg>`;
}
// ------------------------------------------------------------------ ruling 40: attack-ground (indirect fire)
/** Types with an indirect-fire weapon (the sim's rule: a ballistic weapon that can hit the ground, on any mount). */
function indirectTypes(cd, maxMounts) {
    const out = new Set();
    for (let t = 0; t < cd.typeIds.length; t++)
        for (let m = 0; m < cd.tMountCount[t]; m++) {
            const w = cd.tMounts[t * maxMounts + m];
            if (w >= 0 && cd.wBallistic[w] === 1 && cd.wCanHitGround[w]) {
                out.add(t);
                break;
            }
        }
    return out;
}
exports.SHELL_REFUSED = "no indirect-fire weapon: only artillery (mortar, howitzer, siege gun) can shell the ground";
/** The order a ground click gives (ruling 40, types.ts): attack with no target and a ground point. */
function attackGroundOrder(x, z) {
    return { type: "attack", targetId: 0, ground: { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 } };
}
