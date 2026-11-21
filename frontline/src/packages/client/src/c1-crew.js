"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pilotEnRoute = exports.CREW_LOOK_DEG = exports.CREW_LOOK_M = exports.CREW_KEY = exports.CREW_KEY_CODE = void 0;
exports.crewNeeds = crewNeeds;
exports.crewLookTarget = crewLookTarget;
exports.crewWhy = crewWhy;
exports.dispatchClick = dispatchClick;
exports.enRouteTag = enRouteTag;
exports.dispatchNotice = dispatchNotice;
exports.sentryAt = sentryAt;
exports.gunSeatPrompt = gunSeatPrompt;
exports.gunSeatBar = gunSeatBar;
exports.gunSeatNotice = gunSeatNotice;
// Client C1 (designer playtest 16 Nov 16:21-16:23): ruling 124 crew dispatch ("tell an AI pilot to come take command
// of a vessel") and ruling 125 the sentry gun's gun seat. Pure helpers, so the logic tests can call them; the page
// (main.ts, "C1" sections) sends the actions and draws the tags, lines and the gunner view.
const netsnap_ts_1 = require("../../sim/src/netsnap.js");
const c11_ts_1 = require("./c11.js");
/** First person: send a pilot to the own vehicle under the reticle (also "CREW THIS" on the Q wheel). */
exports.CREW_KEY_CODE = "KeyY", exports.CREW_KEY = "Y";
/** How far (m) and how far off the reticle (degrees) "CREW THIS" looks for the vehicle. */
exports.CREW_LOOK_M = 600, exports.CREW_LOOK_DEG = 5;
/** Own vehicles that can take a pilot now: own, crewable (a driver seat, not a structure), with an empty operator seat. */
function crewNeeds(cd, e) {
    if (e.team !== 0 || cd.tDriverSeat[e.type] < 0 || cd.tStructure[e.type])
        return 0;
    return (0, c11_ts_1.emptyOperatorSeats)(cd, e.type, e.crew);
}
/** Is a pilot on the way to this vehicle (snapshot crew bit 13, vehicles only)? */
const pilotEnRoute = (cd, e) => cd.tDriverSeat[e.type] >= 0 && !cd.tStructure[e.type] && (e.crew & netsnap_ts_1.CREW_EN_ROUTE) !== 0;
exports.pilotEnRoute = pilotEnRoute;
/**
 * The own vehicle the reticle is on for "CREW THIS": the smallest angle off the view ray within CREW_LOOK_DEG (or inside
 * the hull's angular size) and CREW_LOOK_M, skipping `self` (the vehicle the player sits in). null if none.
 */
function crewLookTarget(cd, ents, eye, dir, self = 0) {
    let best = null, ba = Infinity;
    for (const e of ents) {
        if (e.id === self || e.team !== 0 || cd.tDriverSeat[e.type] < 0 || cd.tStructure[e.type])
            continue;
        const vx = e.x - eye[0], vy = e.y - eye[1], vz = e.z - eye[2], l = Math.hypot(vx, vy, vz);
        if (l < 1 || l > exports.CREW_LOOK_M)
            continue;
        const a = (Math.acos(Math.max(-1, Math.min(1, (vx * dir[0] + vy * dir[1] + vz * dir[2]) / l))) * 180) / Math.PI;
        const lim = Math.max(exports.CREW_LOOK_DEG, (Math.atan2(cd.tRadius[e.type] * 1.3, l) * 180) / Math.PI);
        if (a <= lim && a < ba) {
            ba = a;
            best = e;
        }
    }
    return best;
}
/** Why "CREW THIS" cannot go out (null: it can). */
function crewWhy(cd, t) {
    if (!t)
        return "look at an own empty vehicle";
    if (crewNeeds(cd, t) === 0)
        return "it already has its crew";
    if ((0, exports.pilotEnRoute)(cd, t) && crewNeeds(cd, t) <= 1)
        return "a pilot is already on the way";
    return null;
}
/**
 * Command view: what a right-click on an own vehicle does with this selection. Dispatch when the vehicle has an empty
 * operator seat and the selection is empty (the nearest free pilot) or only own AI pilots on foot (those pilots, at most
 * one per empty seat). null: the click is an ordinary order.
 */
function dispatchClick(cd, target, selection) {
    if (!target || crewNeeds(cd, target) === 0)
        return null;
    if (selection.length === 0)
        return { vehicle: target.id, pilots: [], n: 1 };
    if (!selection.every((u) => u.team === 0 && cd.tPilot[u.type] === 1 && u.ai))
        return null;
    const seats = crewNeeds(cd, target);
    return { vehicle: target.id, pilots: selection.slice(0, seats).map((u) => u.id), n: 1 };
}
/** The tag on a vehicle a pilot is walking to. */
function enRouteTag(distance) {
    return `PILOT EN ROUTE${distance !== null ? ` · ${Math.round(distance)} m` : ""}`;
}
/** Feed line of a CREW_DISPATCH event (c: 1 sent, 2 boarded, 3 gave up; reserve: from a building). */
function dispatchNotice(c, vehicle, reserve, why = "") {
    const V = vehicle.toUpperCase();
    if (c === 1)
        return { text: `PILOT EN ROUTE · to the ${V}${reserve ? " · from the reserve" : ""}`, kind: "info" };
    if (c === 2)
        return { text: `PILOT ABOARD · the ${V} is crewed`, kind: "good" };
    if (c === 3)
        return { text: `PILOT GAVE UP · the ${V}${why ? `: ${why}` : ""} · walking home`, kind: "warn" };
    return null;
}
// ---------------------------------------------------------------- ruling 125: the gun seat
/** A call-in sentry stands where its zone is (the sim spawns it on the beacon). */
function sentryAt(zones, x, z) {
    return zones.some((q) => q.kind === "sentry" && q.own && Math.hypot(q.x - x, q.z - z) < 4);
}
/** The prompt next to an own sentry / while manning it. */
function gunSeatPrompt(name, manning) {
    return manning ? `<b>F</b> / <b>E</b> Leave the ${name.toLowerCase()} <small>it goes back to automatic</small>` : `<b>F</b> Man ${name.toLowerCase()} <small>you aim and fire it · protected inside</small>`;
}
/** The bar while manning. */
function gunSeatBar(name, cooldown) {
    return `MANNING THE ${name.toUpperCase()} · mouse aims (the gun turns at its own speed) · LMB fire${cooldown !== null && cooldown > 0.02 ? " · reloading" : ""} · F / E: leave (it goes back to automatic)`;
}
/** Feed line for a SHELTER event of the gun seat (c: 1 in, 2 out, 3 thrown out: destroyed, 4 captured). */
function gunSeatNotice(c, name) {
    const N = name.toUpperCase();
    if (c === 1)
        return { text: `MANNING THE ${N} · mouse aims · LMB guns · RMB rockets · F / E leave`, kind: "good" }; // ruling 130: the drop pod's twin guns and rocket pod
    if (c === 2)
        return { text: `LEFT THE ${N} · it is automatic again`, kind: "info" };
    if (c === 3)
        return { text: `${N} DESTROYED · you were thrown out`, kind: "bad" };
    if (c === 4)
        return { text: `${N} CAPTURED · you were thrown out`, kind: "bad" };
    return null;
}
