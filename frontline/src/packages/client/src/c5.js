"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THROW_PITCH_BIAS = exports.beaconVmName = exports.CALL_CATEGORY_COLOUR = exports.reasonName = exports.CALL_REASON_TEXT = exports.moveKeysWhileCalling = exports.codeText = exports.CALL_CODES = exports.DIR_ARROW = exports.CALL_KEY_LABEL = exports.CALL_KEY = void 0;
exports.dirFromKey = dirFromKey;
exports.requirementText = requirementText;
exports.callReasonText = callReasonText;
exports.effectRadius = effectRadius;
exports.harmful = harmful;
exports.callCtx = callCtx;
exports.callRows = callRows;
exports.codeInput = codeInput;
exports.armRow = armRow;
exports.litSteps = litSteps;
exports.callTarget = callTarget;
exports.callAction = callAction;
exports.throwArc = throwArc;
exports.beaconModels = beaconModels;
exports.beaconColour = beaconColour;
exports.dangerClose = dangerClose;
exports.impactShake = impactShake;
exports.callEventText = callEventText;
exports.callColour = callColour;
exports.armedHint = armedHint;
exports.fireAction = fireAction;
exports.fireRefusal = fireRefusal;
exports.throwAction = throwAction;
exports.throwPreview = throwPreview;
exports.thrownAt = thrownAt;
const calls_ts_1 = require("../../sim/src/calls.js");
const sim_ts_1 = require("../../sim/src/sim.js");
const events_ts_1 = require("../../sim/src/events.js");
/** The call menu key (first person, hold). Free in first person: not H, Q, E, V, B, X, Tab (Z is the formation key only in the command view). */
exports.CALL_KEY = "KeyZ", exports.CALL_KEY_LABEL = "Z";
exports.DIR_ARROW = { U: "↑", D: "↓", L: "←", R: "→" };
/**
 * Direction codes, one per call (doc 15: 3-5 steps; fixed per call; no code is the start of another). The first steps
 * name the category: supply D D, defensive D U, recon U U, orbital R, air U R.
 */
exports.CALL_CODES = {
    "resupply-pod": ["D", "D", "U", "R"],
    "scout-drop": ["D", "D", "L", "R"],
    "heavy-weapon-pod": ["D", "D", "L", "U", "R"],
    "vehicle-drop": ["D", "D", "R", "U", "L"],
    "sentry-gun": ["D", "U", "R", "L"],
    "minefield": ["D", "U", "L", "D"],
    "shield-bubble": ["D", "U", "L", "R", "U"],
    "smoke-screen": ["D", "U", "D"],
    "sensor-sweep": ["U", "U", "D"],
    "precision-strike": ["R", "R", "U"],
    "barrage": ["R", "D", "L", "U", "U"],
    "emp-burst": ["R", "U", "D", "D"],
    "strafing-run": ["U", "R", "R"],
    "bomb-run": ["U", "R", "D", "D"],
    // ruling 121 (designer 16 Nov): new calls
    "recon-drone": ["U", "U", "L", "R"],
    "supply-drop": ["D", "D", "U", "U"],
    // ruling 133: slot 5 ANTI-ARMOUR, every pilot's fixed call
    "rocket-tube-drop": ["D", "D", "R", "R"],
    // Frontline call-downs
    "reinforcements": ["U", "D", "R", "R"],
    "tank-drop": ["D", "L", "D", "R"],
    "gunship-drop": ["U", "L", "U", "R"],
    "mech-drop": ["D", "R", "D", "L", "U"],
    "slot3-drop": ["D", "D", "L", "L"],
    "repair-resupply": ["D", "D", "R", "L"], // designer 21 Nov
    "flak-turret": ["D", "U", "R", "R"], // designer 21 Nov
    // designer 22 Nov: the vehicle drops (supply: D D ...)
    "wasp-drop": ["D", "D", "U", "D"],
    "hammer-drop": ["D", "D", "U", "L"],
    "salvo-drop": ["D", "D", "D", "U"],
    "flak-drop": ["D", "D", "D", "D"],
    "strider-drop": ["D", "D", "D", "L"],
    "lancer-drop": ["D", "D", "D", "R"],
    "carrier-drop": ["D", "D", "L", "D"],
};
const codeText = (c) => c.map((d) => exports.DIR_ARROW[d]).join(" ");
exports.codeText = codeText;
/**
 * The arrow keys as code steps while the call key is held (designer ruling: arrow keys only; W A S D keep moving the
 * pilot, so a code can be entered on the run).
 */
function dirFromKey(code) {
    switch (code) {
        case "ArrowUp": return "U";
        case "ArrowDown": return "D";
        case "ArrowLeft": return "L";
        case "ArrowRight": return "R";
    }
    return null;
}
/** Movement keys that still move the pilot while the call menu is held (the arrow keys type the code instead). */
const moveKeysWhileCalling = (code) => code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD";
exports.moveKeysWhileCalling = moveKeysWhileCalling;
/** Texts of the sim's call refusals (reason codes 60-70, and the shared ones that apply to calls). */
exports.CALL_REASON_TEXT = {
    unknownCall: "unknown call", notInLoadout: "not in your loadout", vehicleAlive: "your dropped vehicle is still alive", callCooldown: "cooling down", callInProgress: "beacon down · inbound",
    callRequirement: "requirement not met", callOutOfRange: "out of range", notImplemented: "not in the sim yet",
    callerDown: "you are down", badLoadout: "bad loadout", matchOver: "the match is over", unknownPilot: "no such pilot",
    notPlayerPilot: "not a player pilot", notOwner: "not your pilot",
    // s11 (69, 70)
    callOverBudget: "no room for the drop: unit cap reached", callBlocked: "an enemy Missile Battery covers that spot",
    // w2a (80, 81), w2d weather (111, 112)
    loadoutNotAtBase: "change the loadout at a Barracks or the Command Core, or while down", badCallOption: "no such option for that call",
    weatherGrounded: "grounded by the weather (ash fall)", weatherOrbital: "orbital calls blocked by the weather (solar flare)",
    callNotOnFoot: "throw the beacon on foot", // ruling 128
    callNotSeated: "fire the beacon from a vehicle seat", // ruling 129
};
const reasonName = (code) => (code > 0 ? sim_ts_1.ORDER_REASONS[code - 1] ?? `code ${code}` : "");
exports.reasonName = reasonName;
const callsJson = (data) => (data.supportCalls?.calls ?? []);
/** What a call's requirement is, in words (doc 15: "Relay held"; air calls: atmosphere and an Air Pad). */
function requirementText(data, callId) {
    const c = callsJson(data).find((x) => x.id === callId);
    if (!c || !c.requires?.length)
        return "requirement not met";
    const bname = (id) => data.buildings.find((b) => b.id === id)?.name ?? id;
    const parts = c.requires.map((r) => (r === "atmosphere" ? "atmosphere" : `a supplied ${bname(r)}`));
    return `needs ${parts.join(" and ")}`;
}
/** A refusal in words; range refusals name the range that applies (on foot: throw, in a vehicle: designator). */
function callReasonText(data, rules, reason, callId, seated = false) {
    if (reason === "callRequirement")
        return requirementText(data, callId);
    if (reason === "callOutOfRange" && rules)
        return seated ? `out of range: designate within ${rules.designatorRange} m of your vehicle` : `out of range: throw within ${rules.throwRange} m`;
    return exports.CALL_REASON_TEXT[reason] ?? reason;
}
/** Radius drawn for a call's effect (params.radius; line calls: half the line; others 5 m). */
function effectRadius(data, callId) {
    const p = callsJson(data).find((x) => x.id === callId)?.params ?? {};
    if (typeof p.radius === "number")
        return p.radius;
    if (typeof p.lineLength === "number")
        return p.lineLength / 2;
    return 5;
}
/** A call that hurts what stands in its area (DANGER CLOSE applies). */
function harmful(data, callId) {
    const p = callsJson(data).find((x) => x.id === callId)?.params ?? {};
    return ["damage", "shellDamage", "roundDamage", "bombDamage", "mineDamage"].some((k) => typeof p[k] === "number");
}
function callCtx(data, typeIds, tickRate) { return (0, calls_ts_1.compileCallRules)(data, typeIds, tickRate); }
/**
 * The pilot's calls (menu rows and the command view's calls bar). Without a calls block (nobody has called yet) the
 * loadout is the data default, all ready; calls the sim does not implement are greyed from the compiled rules.
 */
function callRows(c, block) {
    const R = c.rules;
    if (!R)
        return [];
    const js = callsJson(c.data);
    const own = block ? block.own : [...R.defaultLoadout, ...(R.fixed ?? []).filter((f) => !R.defaultLoadout.includes(f))].map((call) => ({ call, readyTick: 0, cooldownTicks: 0, available: R.calls[call].fx !== calls_ts_1.CALL_FX_NONE, reason: 0 }));
    return own.map((o) => {
        const def = R.calls[o.call], j = js[o.call];
        const id = def?.id ?? `call ${o.call}`;
        let reason = block ? (0, exports.reasonName)(o.reason) : def && def.fx === calls_ts_1.CALL_FX_NONE ? "notImplemented" : "";
        const cdTicks = Math.max(0, o.readyTick - c.tick);
        if (reason === "callCooldown" && cdTicks <= 0)
            reason = ""; // the block lags a tick behind the clock
        const available = reason === "";
        const cooldownS = cdTicks * c.dt;
        // C6 (w2a own[].usesLeft): air calls with several uses before the rearm say how many are left
        const uses = def?.uses ?? 0, left = o.usesLeft ?? 0;
        const usesTxt = uses > 1 && left > 0 ? ` · ${left} of ${uses} left` : "";
        const status = (available ? "READY" : reason === "callCooldown" ? `COOLDOWN ${Math.ceil(cooldownS)} s` : reason === "callInProgress" ? "INBOUND" : "NOT AVAILABLE") + usesTxt;
        const code = exports.CALL_CODES[id] ?? [];
        return { call: o.call, id, name: j?.name ?? id, category: j?.category ?? "", code, codeText: (0, exports.codeText)(code), delayS: j?.delaySeconds ?? 0, cooldownS: reason === "callCooldown" ? cooldownS : 0,
            radius: effectRadius(c.data, id), available, reason, reasonText: available ? "" : callReasonText(c.data, R, reason, id, c.seated), status };
    });
}
/**
 * One step typed while the menu is open. A step that no listed code continues resets the entry ("wrong"); a code typed
 * to the end arms its call, or is refused with the reason when the call is not available.
 */
function codeInput(st, dir, rows) {
    const steps = [...st.steps, dir];
    const cands = rows.filter((r) => r.code.length >= steps.length && steps.every((s, i) => r.code[i] === s));
    if (!cands.length) {
        st.steps = [];
        return { kind: "wrong", steps: [] };
    }
    const done = cands.find((r) => r.code.length === steps.length);
    if (done) {
        st.steps = [];
        return armRow(done);
    }
    st.steps = steps;
    return { kind: "step", steps };
}
/** A completed code: arms an available call, else refused with the reason. */
function armRow(row) {
    return row.available ? { kind: "armed", call: row.call, row } : { kind: "refused", call: row.call, row, text: `${row.name.toUpperCase()} · ${row.reasonText}` };
}
/** Steps of a row lit by the current entry (0 when the entry does not match the row's code). */
function litSteps(row, steps) {
    return steps.length <= row.code.length && steps.every((s, i) => row.code[i] === s) ? steps.length : 0;
}
// ------------------------------------------------------------------ targeting and the input sent
/**
 * Where an armed call will land: the aimed ground point, pulled back to the range (throw on foot, designator in a
 * vehicle) from the caller. No ground under the reticle: straight ahead at the full range. A small margin keeps the
 * sim's own range check (measured from the same body) on the inside.
 */
function callTarget(fromX, fromZ, aim, yaw, range) {
    const lim = range * 0.97;
    let dx, dz;
    if (aim) {
        dx = aim[0] - fromX;
        dz = aim[1] - fromZ;
    }
    else {
        dx = Math.cos(yaw) * lim;
        dz = Math.sin(yaw) * lim;
    }
    const d = Math.hypot(dx, dz);
    if (d > lim) {
        const k = lim / d;
        return { x: fromX + dx * k, z: fromZ + dz * k, dist: lim, clamped: true };
    }
    return { x: fromX + dx, z: fromZ + dz, dist: d, clamped: !aim };
}
/** The page's action for a call (the worker sends sim.queueCall(tick, pilot, call, x, z, team 0): ACT_CALL). */
function callAction(callId, x, z) {
    return { kind: "call", call: callId, x, z };
}
/** Points of the throw arc from the hand to the landing point (a parabola, apex height grows with the distance). */
function throwArc(from, to, n = 16) {
    const d = Math.hypot(to[0] - from[0], to[2] - from[2]), h = Math.max(1.5, d * 0.3), out = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        out.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + 4 * h * t * (1 - t), from[2] + (to[2] - from[2]) * t]);
    }
    return out;
}
/** Pending beacons for drawing: the countdown from the current tick (the block repeats from its base while unchanged). */
function beaconModels(c, block, team) {
    if (!block || !c.rules)
        return [];
    const js = callsJson(c.data);
    return block.beacons.map((b) => {
        const id = c.rules.calls[b.call]?.id ?? `call ${b.call}`, seconds = Math.max(0, (b.impactTick - c.tick) * c.dt);
        return { id: b.id, call: b.call, callId: id, name: js[b.call]?.name ?? id, team: b.team, friendly: b.team === team, x: b.x, z: b.z,
            radius: effectRadius(c.data, id), harmful: harmful(c.data, id), seconds, countdown: seconds.toFixed(1), merged: b.merged };
    });
}
/** Beacon colour: the caller's own beacons amber, the rest of its team the team colour, the enemy's red. */
function beaconColour(own, friendly) {
    return own ? [1, 0.72, 0.2] : friendly ? [0.3, 0.9, 1] : [1, 0.3, 0.16];
}
/**
 * DANGER CLOSE: the player stands inside (or within 2 m of) the area of a friendly call that hurts. Returns the
 * nearest such beacon, or null. Enemy beacons are not "danger close" (they say INCOMING).
 */
function dangerClose(beacons, x, z) {
    let best = null, bs = Infinity;
    for (const b of beacons) {
        if (!b.friendly || !b.harmful)
            continue;
        if (Math.hypot(x - b.x, z - b.z) <= b.radius + 2 && b.seconds < bs) {
            bs = b.seconds;
            best = b;
        }
    }
    return best;
}
/** Screen shake from an impact: strong within the blast, falling off with the square of the distance to 0 at 250 m. */
function impactShake(dist, radius = 8) {
    if (dist <= radius)
        return 1;
    const k = 1 - (dist - radius) / (250 - radius);
    return k <= 0 ? 0 : k * k;
}
/** Feed lines for CALL_QUEUED / CALL_IMPACT / CALL_REFUSED (a beacon / seq, b pilot, c call or reason, d ticks / hits / call). */
function callEventText(c, e, pilotId, team) {
    const js = callsJson(c.data), nm = (i) => (js[i]?.name ?? `call ${i}`).toUpperCase();
    const who = e.b === pilotId ? "YOU" : (e.team ?? -1) === team ? "ALLY" : "ENEMY";
    const merged = (e.flags & calls_ts_1.CF_MERGED) !== 0;
    if (e.kind === events_ts_1.EV.CALL_QUEUED) {
        const s = Math.max(0, e.d * c.dt).toFixed(0);
        return { text: `${nm(e.c)} INBOUND · ${s} s · ${who === "YOU" ? "your beacon" : who === "ALLY" ? "ally beacon" : "ENEMY BEACON"}${merged ? " · merged" : ""}`, kind: who === "ENEMY" ? "bad" : "info" };
    }
    if (e.kind === events_ts_1.EV.CALL_IMPACT)
        return { text: `${nm(e.c)} IMPACT · ${e.d} hit${e.d === 1 ? "" : "s"}${who === "YOU" ? "" : who === "ALLY" ? " · ally call" : " · enemy call"}`, kind: who === "ENEMY" ? "bad" : "good" };
    if (e.kind === events_ts_1.EV.CALL_REFUSED) {
        if (e.b !== pilotId)
            return null;
        const id = c.rules?.calls[e.d]?.id ?? "", reason = (0, exports.reasonName)(e.c);
        return { text: `CALL REFUSED · ${e.d >= 0 ? nm(e.d) : "CALL"} · ${callReasonText(c.data, c.rules, reason, id, c.seated)}`, kind: "warn" };
    }
    return null;
}
// ------------------------------------------------------------------ ruling 128: the thrown call beacon
/** Light colour of a call by its category (the beacon in the hand, its trail and its light column). */
exports.CALL_CATEGORY_COLOUR = {
    supply: [0.35, 1, 0.45], defensive: [0.3, 0.75, 1], recon: [1, 0.9, 0.3], orbital: [1, 0.32, 0.18], air: [1, 0.6, 0.15],
};
function callColour(data, call) {
    return exports.CALL_CATEGORY_COLOUR[callsJson(data)[call]?.category ?? ""] ?? [1, 0.72, 0.2];
}
/** The viewmodel mesh of the beacon in the hand (one per category colour; meshes.ts vm-beacon-*). */
const beaconVmName = (data, call) => {
    const c = callsJson(data)[call]?.category ?? "";
    return exports.CALL_CATEGORY_COLOUR[c] ? `vm-beacon-${c}` : "vm-beacon";
};
exports.beaconVmName = beaconVmName;
/** Upward bias of the throw over the camera's pitch (rad): looking level throws a useful ~30 m lob. */
exports.THROW_PITCH_BIAS = 0.1;
/** The armed-call line on foot (thrown beacons) and in a vehicle (designator). */
function armedHint(name, seated, throwing) {
    if (seated)
        return throwing ? `${name.toUpperCase()} · BEACON LOADED · LMB fire it at the crosshair · RMB / Esc cancel` : `${name.toUpperCase()} · LMB designate · RMB / Esc cancel`; // ruling 129
    if (!throwing)
        return `${name.toUpperCase()} · LMB throw the beacon · RMB / Esc cancel`;
    return `${name.toUpperCase()} · CALL BEACON IN HAND · LMB throw · RMB / Esc cancel`;
}
/** Ruling 129: the page's action for a beacon fired from the vehicle at the designated point (worker: sim.queueFireCall). */
function fireAction(callId, x, z, option) {
    const a = { kind: "fireCall", call: callId, x, z };
    if (option !== undefined)
        a.option = option;
    return a;
}
/** Ruling 129: why a beacon cannot be fired at the designated point (null: it can). dist: from the vehicle; aim: ground under the crosshair. */
function fireRefusal(aim, dist, range) {
    if (!aim)
        return "NO GROUND UNDER THE CROSSHAIR";
    if (dist > range)
        return `OUT OF RANGE · ${Math.round(dist)} m · fire within ${range} m of your vehicle`;
    return null;
}
/** The page's action for a thrown beacon (worker: sim.queueThrowCall: ACT_THROW_CALL). */
function throwAction(callId, camYaw, camPitch, option) {
    const a = { kind: "throwCall", call: callId, yaw: camYaw, pitch: Math.max(-1.5, Math.min(1.5, camPitch + exports.THROW_PITCH_BIAS)) };
    if (option !== undefined)
        a.option = option;
    return a;
}
/**
 * The flight the sim will give a beacon thrown now (sim.ts throwCall / thrownStep, before the first bounce): points from
 * the hand to the first touchdown, and the touchdown. height(x, z): the ground.
 */
function throwPreview(x, feetY, z, yaw, pitch, vx, vz, P, height, maxPts = 40) {
    const hx = Math.cos(yaw), hz = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    let px = x + hx * 0.3, pz = z + hz * 0.3, py = feetY + P.hand;
    let ux = hx * cp * P.speed + vx * P.inherit, uy = sp * P.speed, uz = hz * cp * P.speed + vz * P.inherit;
    const pts = [[px, py, pz]], h = 0.05;
    for (let i = 0; i < 400; i++) {
        uy -= P.g * h;
        px += ux * h;
        py += uy * h;
        pz += uz * h;
        const gy = height(px, pz);
        if (py <= gy) {
            py = gy;
            pts.push([px, py, pz]);
            break;
        }
        if (i % Math.max(1, Math.ceil(400 / maxPts / 4)) === 0)
            pts.push([px, py, pz]);
    }
    const land = pts[pts.length - 1];
    return { pts, land, dist: Math.hypot(land[0] - x, land[2] - z) };
}
/** Where a beacon in flight is `t` seconds after its snapshot sample (gravity unless rolling; never under the ground). */
function thrownAt(b, t, g, height) {
    const tt = Math.max(0, Math.min(0.25, t));
    const x = b.x + b.vx * tt, z = b.z + b.vz * tt, y = b.y + b.vy * tt - (b.rolling ? 0 : 0.5 * g * tt * tt);
    return [x, Math.max(y, height(x, z) + 0.1), z];
}
