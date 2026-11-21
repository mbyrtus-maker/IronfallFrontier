"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wheelAngle = exports.WHEEL_ICON = exports.WHEEL_DEADZONE_PX = exports.WHEEL = exports.orderButtonForKey = exports.FORMATION_KEY = exports.ORDER_KEYS = exports.nextFormation = exports.FORMATION_CYCLE = exports.ControlGroups = exports.DOUBLE_TAP_MS = exports.HARVESTER_PHASE_TEXT = exports.POINT_PHASE_TEXT = exports.pointName = exports.teamCss = exports.UNKNOWN_CSS = exports.NEUTRAL_CSS = exports.TEAM_CSS = exports.TEAM_NAME = void 0;
exports.pointStatics = pointStatics;
exports.pointModels = pointModels;
exports.linkModels = linkModels;
exports.strategicHud = strategicHud;
exports.hackPrompt = hackPrompt;
exports.coreStatus = coreStatus;
exports.pointEventText = pointEventText;
exports.coreEventText = coreEventText;
exports.ordinal = ordinal;
exports.harvesterPhaseText = harvesterPhaseText;
exports.dockOverlay = dockOverlay;
exports.dockOverlayTargets = dockOverlayTargets;
exports.econHud = econHud;
exports.depositModels = depositModels;
exports.harvesterModels = harvesterModels;
exports.depositEventText = depositEventText;
exports.deliveredEventText = deliveredEventText;
exports.centroid = centroid;
exports.moveOrder = moveOrder;
exports.buildOrder = buildOrder;
exports.ackText = ackText;
exports.wheelSectors = wheelSectors;
exports.wheelTargetText = wheelTargetText;
exports.wheelPick = wheelPick;
exports.wheelRecipients = wheelRecipients;
const mining_ts_1 = require("../../sim/src/mining.js");
// ------------------------------------------------------------------ points (item 2)
exports.TEAM_NAME = ["YOURS", "HEGEMONY", "TEAM 3", "TEAM 4"];
/** Owner colours (CSS): own cyan, enemy red-orange, neutral grey (as the units). */
exports.TEAM_CSS = ["#45e0ff", "#ff6a2a", "#c08aff", "#ffd23c"];
exports.NEUTRAL_CSS = "#9aa5a8";
/** C11 (ruling 87): a point nobody of the team has seen yet. */
exports.UNKNOWN_CSS = "#5f6870";
const teamCss = (t) => (t < 0 ? exports.NEUTRAL_CSS : exports.TEAM_CSS[t] ?? exports.NEUTRAL_CSS);
exports.teamCss = teamCss;
/** "citadel-west" -> "Citadel West". */
const pointName = (id) => id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
exports.pointName = pointName;
/** Static point info from the map JSON (index = order in the file; links made symmetric, as the sim does). */
function pointStatics(map, ringRadius) {
    if (!map || !map.points)
        return [];
    const idx = new Map(map.points.map((p, i) => [p.id, i]));
    const out = map.points.map((p, i) => ({ index: i, id: p.id, name: (0, exports.pointName)(p.id), type: p.type, x: p.x, z: p.z, radius: p.radius, ring: ringRadius, links: [], terminal: p.terminal ? [p.terminal[0], p.terminal[1]] : [p.x, p.z] }));
    map.points.forEach((p, i) => {
        for (const l of p.links ?? []) {
            const j = idx.get(l);
            if (j === undefined || j === i)
                continue;
            if (!out[i].links.includes(j))
                out[i].links.push(j);
            if (!out[j].links.includes(i))
                out[j].links.push(i);
        }
    });
    return out;
}
/** One model per point from the snapshot's points block, seen by `team` standing at (x, z). */
function pointModels(st, pv, x, z, nowMs, team = 0, memo) {
    return st.map((s) => {
        const p = pv?.points[s.index];
        const mi = p && p.seen === false ? (memo?.(s.index) ?? { known: false, seenAtMs: 0 }) : null;
        const unknown = !!mi && !mi.known, stale = !!mi && mi.known, ageMs = stale ? Math.max(0, nowMs - mi.seenAtMs) : 0;
        const owner = p ? p.owner : -1, ct = p ? p.captureTeam : -1, prog = p ? p.captureProgress : 0;
        const supplied = !!p?.supplied, contested = !!p?.contested, underAttack = !!p?.underAttack, hacking = !!p?.hacking;
        const cutOff = owner >= 0 && !supplied;
        const alert = contested || underAttack;
        const dist = Math.hypot(x - s.x, z - s.z);
        const parts = [owner < 0 ? "NEUTRAL" : owner === team ? "HELD" : exports.TEAM_NAME[owner] ?? `TEAM ${owner}`];
        if (cutOff)
            parts.push("CUT OFF");
        if (contested)
            parts.push("CONTESTED");
        else if (underAttack)
            parts.push("UNDER ATTACK");
        if (ct >= 0 && prog > 0)
            parts.push(`${ct === team ? "capturing" : "being taken"} ${Math.round(prog * 100)}%`);
        if (hacking)
            parts.push(`HACK ${Math.round((p?.hackProgress ?? 0) * 100)}%`);
        if (unknown) {
            parts.length = 0;
            parts.push("UNKNOWN · not seen yet");
        }
        else if (stale) {
            parts.length = 0;
            parts.push(`${owner < 0 ? "NEUTRAL" : owner === team ? "HELD" : exports.TEAM_NAME[owner] ?? `TEAM ${owner}`}?`, `LAST SEEN ${Math.max(0, Math.round(ageMs / 1000)) < 90 ? `${Math.max(0, Math.round(ageMs / 1000))} s` : `${Math.round(ageMs / 60000)} min`} AGO`);
        }
        return {
            index: s.index, name: s.name, owner, ownerName: unknown ? "unknown" : owner < 0 ? "neutral" : exports.TEAM_NAME[owner] ?? `team ${owner}`, colour: unknown ? exports.UNKNOWN_CSS : (0, exports.teamCss)(owner), unknown, stale, ageMs,
            captureTeam: ct, progress: prog, progressColour: (0, exports.teamCss)(ct), supplied, cutOff, contested, underAttack, hacking, hackProgress: p?.hackProgress ?? 0,
            alert, flash: alert && Math.floor(nowMs / 250) % 2 === 0, dist, inRing: dist <= s.ring, status: parts.join(" · "),
        };
    });
}
/** Supply links: solid in the owner colour when both ends are the same team's and supplied; dashed when one end is cut off; front line (two teams) dashed grey. */
function linkModels(st, pv) {
    const out = [];
    for (const s of st)
        for (const j of s.links) {
            if (j <= s.index)
                continue;
            const a = pv?.points[s.index], b = pv?.points[j];
            const oa = a ? a.owner : -1, ob = b ? b.owner : -1;
            let state = "none";
            if (oa >= 0 && oa === ob)
                state = a.supplied && b.supplied ? "supplied" : "cut";
            else if (oa >= 0 && ob >= 0)
                state = "front";
            out.push({ a: s.index, b: j, state, dashed: state !== "supplied", colour: state === "supplied" || state === "cut" ? (0, exports.teamCss)(oa) : exports.NEUTRAL_CSS });
        }
    return out;
}
/** Momentum for the HUD (Command Points are gone, ruling 48). */
function strategicHud(pv, team = 0) {
    const m = pv?.teams[team]?.momentum ?? 0;
    let em = 0;
    if (pv)
        pv.teams.forEach((t, i) => { if (i !== team)
            em = Math.max(em, t.momentum); });
    return { momentum: m, enemyMomentum: em, text: `MOMENTUM ${Math.round(m * 100)}% vs ${Math.round(em * 100)}%` };
}
/**
 * The "hold E to hack" prompt on foot: within `reach` m (surface gap) of the terminal of a point the team does not
 * own, or of an enemy Command Core (ruling 29). A point holding a standing enemy Core cannot be hacked from its terminal
 * (the sim refuses it), so the Core takes the prompt there. Progress from the snapshot (point hackProgress / Core record).
 */
function hackPrompt(st, pv, x, z, pilotR, reach, held, cores, team = 0) {
    for (const c of cores) {
        if (c.team === team)
            continue;
        if (Math.hypot(x - c.x, z - c.z) - c.radius - pilotR > reach)
            continue;
        const rec = pv?.cores.find((k) => k.id === c.id);
        if (rec?.disabled)
            return { kind: "core", target: c.id, name: "Command Core", text: "COMMAND CORE DISABLED", progress: 1, active: false };
        const prog = rec?.hackProgress ?? 0;
        return { kind: "core", target: c.id, name: "Command Core", text: held ? `HACKING THE COMMAND CORE · ${Math.round(prog * 100)}%` : "HOLD E TO HACK THE COMMAND CORE", progress: prog, active: held };
    }
    for (const s of st) {
        const p = pv?.points[s.index];
        if (p && p.owner === team)
            continue;
        if (Math.hypot(x - s.terminal[0], z - s.terminal[1]) - pilotR > reach)
            continue;
        const prog = p?.hackProgress ?? 0;
        return { kind: "point", target: s.index, name: s.name, text: held ? `HACKING ${s.name.toUpperCase()} · ${Math.round(prog * 100)}%` : `HOLD E TO HACK ${s.name.toUpperCase()}`, progress: prog, active: held };
    }
    return null;
}
/** "CORE DISABLED · 42 s" for each disabled Core (ruling 29), and the hack progress of one being hacked. */
function coreStatus(cores, tick, tickRate) {
    return (cores ?? []).map((c) => {
        const seconds = c.disabled ? Math.max(0, Math.ceil((c.disabledUntil - tick) / tickRate)) : 0;
        return { id: c.id, disabled: c.disabled, seconds, hackProgress: c.hackProgress, text: c.disabled ? `CORE DISABLED · ${seconds} s` : `CORE HACK ${Math.round(c.hackProgress * 100)}%` };
    });
}
/** Feed line for a POINT event (kind 17: a point, b phase, c team, d other team). */
exports.POINT_PHASE_TEXT = ["capture started", "contested", "captured", "supply lost", "supply restored", "hack started", "hack stopped", "capture reset"];
function pointEventText(st, a, b, c, team = 0) {
    const name = st[a]?.name ?? `point ${a}`;
    const who = c < 0 ? "" : c === team ? "you" : exports.TEAM_NAME[c] ?? `team ${c}`;
    switch (b) {
        case 2: return { text: `${name.toUpperCase()} captured by ${who === "you" ? "your team" : who}`, kind: c === team ? "good" : "bad" };
        case 3: return { text: `${name}: supply lost${c === team ? " · production paused there" : ""}`, kind: c === team ? "bad" : "info" };
        case 4: return { text: `${name}: supply restored`, kind: c === team ? "good" : "info" };
        case 1: return { text: `${name}: contested`, kind: "warn" };
        case 0: return { text: `${name}: ${who === "you" ? "you are capturing" : `${who} capturing`}`, kind: c === team ? "info" : "warn" };
        case 5: return { text: `${name}: hack started${who ? ` (${who})` : ""}`, kind: c === team ? "info" : "warn" };
        case 6: return { text: `${name}: hack stopped`, kind: "info" };
        default: return { text: `${name}: ${exports.POINT_PHASE_TEXT[b] ?? "changed"}`, kind: "info" };
    }
}
/** Feed line for a CORE event (kind 18: a Core id, b phase hackStarted / hackStopped / disabled / restored, c Core team, d hacking team). */
function coreEventText(b, coreTeam, team = 0) {
    const own = coreTeam === team;
    switch (b) {
        case 0: return { text: own ? "YOUR COMMAND CORE IS BEING HACKED" : "Hacking the enemy Command Core", kind: own ? "bad" : "info" };
        case 1: return { text: own ? "Core hack stopped" : "Core hack interrupted", kind: "info" };
        case 2: return { text: own ? "YOUR COMMAND CORE IS DISABLED · production paused" : "ENEMY COMMAND CORE DISABLED", kind: own ? "bad" : "good" };
        default: return { text: own ? "Your Command Core is back online" : "Enemy Command Core back online", kind: own ? "good" : "warn" };
    }
}
// ------------------------------------------------------------------ economy (item 3)
exports.HARVESTER_PHASE_TEXT = ["idle", "to deposit", "loading", "to Refinery", "No Refinery", "unloading", "queued", "docking", "leaving dock"];
/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th, 21st. */
function ordinal(n) { const t = n % 100, u = n % 10; return `${n}${t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"}`; }
/** q1: harvester phase line; a queued one says its place ("queued 2nd"). */
function harvesterPhaseText(phase, queue = 0) {
    if (phase === 6 && queue > 0)
        return `queued ${ordinal(queue)}`;
    return exports.HARVESTER_PHASE_TEXT[phase] ?? "idle";
}
/**
 * Dock points (busy when a harvester of the team docks or unloads there) and a short queue line out from them: at least
 * minSpots places long, one per waiting harvester. building: centre, yaw (radians, x = cos, z = sin), the type's docks
 * (buildings.json effects.docks, null = one in front), its radius; hR harvester radius; reach / gap from
 * constants.economy.mining (dropOffReachMetres, queue.gapMetres).
 */
function dockOverlay(b, hR, reach, gap, mining, minSpots = 2) {
    const L = (0, mining_ts_1.dockLayout)(b.x, b.z, Math.cos(b.yaw), Math.sin(b.yaw), b.docks ? b.docks.flat() : null, b.radius, hR, reach);
    const mine = (mining?.harvesters ?? []).filter((h) => h.dropOff === b.id);
    const docks = L.dx.map((x, k) => ({ x, z: L.dz[k], busy: mine.some((h) => h.dock === k && (h.phase === 5 || h.phase === 7)) }));
    const waiting = mine.filter((h) => h.queue > 0).length, n = Math.max(minSpots, waiting), step = 2 * hR + gap;
    const spots = Array.from({ length: n }, (_, i) => ({ x: L.ox + L.nx * step * (i + 1), z: L.oz + L.nz * step * (i + 1), taken: i < waiting }));
    return { building: b.id, docks, lane: [L.ox + L.nx * step * 0.5, L.oz + L.nz * step * 0.5, L.ox + L.nx * step * (n + 0.5), L.oz + L.nz * step * (n + 0.5)], spots };
}
/** q1: which drop-offs show their docks: the selected building if it is one, and those of the selected harvesters. */
function dockOverlayTargets(selBuilding, isDropOff, selected, mining) {
    const out = new Set();
    if (selBuilding && isDropOff(selBuilding))
        out.add(selBuilding);
    const sel = new Set(selected);
    for (const h of mining?.harvesters ?? [])
        if (sel.has(h.id) && h.dropOff > 0 && isDropOff(h.dropOff))
            out.add(h.dropOff);
    return [...out].sort((a, b) => a - b);
}
/** Stockpile with storage caps: "ORE 840 / 1000", "storage full" when ore reaches its cap. */
function econHud(ore, gas, mining) {
    const o = Math.floor(ore), g = Math.floor(gas);
    if (!mining)
        return { ore: `ORE ${o}`, gas: `GAS ${g}`, oreFull: false, gasFull: false };
    const oreFull = mining.oreCap > 0 && o >= mining.oreCap, gasFull = mining.gasCap > 0 && g >= mining.gasCap;
    return { ore: `ORE ${o} / ${mining.oreCap}${oreFull ? " · storage full" : ""}`, gas: `GAS ${g} / ${mining.gasCap}${gasFull ? " · storage full" : ""}`, oreFull, gasFull };
}
/** Deposits with remaining ore (snapshot) against the map's initial ore. */
function depositModels(map, mining) {
    return (map?.deposits ?? []).map((d, i) => {
        const rem = mining ? mining.deposits[i] ?? 0 : d.ore;
        const f = d.ore > 0 ? rem / d.ore : 0;
        return { index: i, id: d.id, x: d.x, z: d.z, radius: d.radius, initial: d.ore, remaining: rem, fraction: f, exhausted: rem <= 0, text: rem <= 0 ? "ORE · DEPLETED" : `ORE ${rem} · ${Math.round(f * 100)}%` };
    });
}
/** The viewer team's Harvesters: cargo bar 0..1 and a phase line ("No Refinery" while waiting for a drop-off). */
function harvesterModels(mining, cargo) {
    return (mining?.harvesters ?? []).map((h) => {
        const phase = harvesterPhaseText(h.phase, h.queue ?? 0);
        return { id: h.id, load: h.load, phase, manual: h.manual, deposit: h.deposit, text: h.manual ? "not mining (manual orders) · J: harvest" : `${phase} · ${Math.round(h.load * cargo)}/${cargo}` };
    });
}
/** Feed lines for the mining events: 19 DEPOSIT_EXHAUSTED (a deposit), 20 HARVEST_DELIVERED (v1 ore). */
function depositEventText(map, a) { return `Deposit depleted · ${(0, exports.pointName)(map?.deposits?.[a]?.id ?? `deposit ${a}`)}`; }
function deliveredEventText(ore) { return `+${Math.round(ore)} ore delivered`; }
// ------------------------------------------------------------------ control groups (item 4; client only, per player)
exports.DOUBLE_TAP_MS = 350;
class ControlGroups {
    groups = new Map();
    lastTap = { group: 0, at: -1e9 };
    /**
     * Key 1..9 in the command view. ctrl: assign the selection (replaces the group); shift: add the selection to it;
     * plain: select the group (only units still alive); the same digit again within DOUBLE_TAP_MS: centre on it.
     * Returns what happened and the ids now selected (assign / add / select / centre) or in the group.
     */
    key(group, ctrl, shift, selected, now, alive) {
        this.prune(alive);
        if (ctrl) {
            const ids = [...selected].filter(alive);
            if (ids.length)
                this.groups.set(group, ids);
            else
                this.groups.delete(group);
            // a unit is in one group at a time: assigning takes it out of the others
            for (const [g, m] of this.groups)
                if (g !== group) {
                    const f = m.filter((id) => !ids.includes(id));
                    if (f.length)
                        this.groups.set(g, f);
                    else
                        this.groups.delete(g);
                }
            this.lastTap = { group: 0, at: -1e9 };
            return { action: "assign", group, ids };
        }
        if (shift) {
            const add = [...selected].filter(alive), cur = this.groups.get(group) ?? [];
            for (const [g, m] of this.groups)
                if (g !== group) {
                    const f = m.filter((id) => !add.includes(id));
                    if (f.length)
                        this.groups.set(g, f);
                    else
                        this.groups.delete(g);
                }
            const ids = [...cur, ...add.filter((id) => !cur.includes(id))];
            if (ids.length)
                this.groups.set(group, ids);
            return { action: "add", group, ids };
        }
        const ids = this.groups.get(group) ?? [];
        const dbl = this.lastTap.group === group && now - this.lastTap.at <= exports.DOUBLE_TAP_MS;
        this.lastTap = { group, at: now };
        if (!ids.length)
            return { action: "empty", group, ids: [] };
        return { action: dbl ? "centre" : "select", group, ids: ids.slice() };
    }
    /** The group number shown on a unit (0: none). */
    groupOf(id) { for (const [g, m] of this.groups)
        if (m.includes(id))
            return g; return 0; }
    prune(alive) { for (const [g, m] of this.groups) {
        const f = m.filter(alive);
        if (f.length)
            this.groups.set(g, f);
        else
            this.groups.delete(g);
    } }
    clear() { this.groups.clear(); this.lastTap = { group: 0, at: -1e9 }; }
}
exports.ControlGroups = ControlGroups;
/** Centre of a set of positions (the camera target of a double tap). */
function centroid(ps) {
    if (!ps.length)
        return null;
    let x = 0, z = 0;
    for (const p of ps) {
        x += p.x;
        z += p.z;
    }
    return { x: x / ps.length, z: z / ps.length };
}
// ------------------------------------------------------------------ orders (item 5) and the quick-command wheel (item 6)
exports.FORMATION_CYCLE = ["none", "line", "wedge", "column"];
const nextFormation = (f) => exports.FORMATION_CYCLE[(exports.FORMATION_CYCLE.indexOf(f) + 1) % exports.FORMATION_CYCLE.length];
exports.nextFormation = nextFormation;
/** A right-click move: a group of two or more moves in the chosen formation (s5: slots centred on the click point). */
function moveOrder(x, z, n, formation) {
    return n > 1 ? { type: "move", x, z, formation } : { type: "move", x, z };
}
/** Command-view order buttons and their hotkeys (KeyboardEvent.code). */
exports.ORDER_KEYS = [
    { b: "guard", code: "KeyG", key: "G", label: "Guard" },
    { b: "defend", code: "KeyY", key: "Y", label: "Defend here" },
    { b: "follow", code: "KeyF", key: "F", label: "Follow me" },
    { b: "holdFire", code: "KeyX", key: "X", label: "Hold fire" },
    { b: "retreat", code: "KeyR", key: "R", label: "Retreat" },
    { b: "harvest", code: "KeyJ", key: "J", label: "Harvest" },
];
exports.FORMATION_KEY = "KeyZ";
const orderButtonForKey = (code) => exports.ORDER_KEYS.find((k) => k.code === code)?.b ?? null;
exports.orderButtonForKey = orderButtonForKey;
/** The order a button / hotkey / wheel option sends, or null (and why) when it cannot be built. Harvest is an action, not an order. */
function buildOrder(b, c) {
    switch (b) {
        case "guard": return c.friendly > 0 ? { order: { type: "guard", targetId: c.friendly }, why: "" } : c.pilotId > 0 ? { order: { type: "guard", pilotId: c.pilotId }, why: "" } : { order: null, why: "nothing to guard" };
        case "defend": return c.ground ? { order: { type: "defend", x: c.ground[0], z: c.ground[1] }, why: "" } : { order: null, why: "no ground under the cursor" };
        case "follow": return c.pilotId > 0 ? { order: c.formation === "none" ? { type: "follow", pilotId: c.pilotId } : { type: "follow", pilotId: c.pilotId, formation: c.formation }, why: "" } : { order: null, why: "no pilot to follow" };
        case "holdFire": return { order: { type: "holdFire", on: !c.allHolding }, why: "" };
        case "retreat": return { order: c.retreatPoints.length ? { type: "retreat", points: c.retreatPoints.map((p) => [p[0], p[1]]) } : { type: "retreat" }, why: "" };
        case "attackMyTarget": return c.enemy > 0 && c.pilotId > 0 ? { order: { type: "attackMyTarget", pilotId: c.pilotId, targetId: c.enemy }, why: "" } : { order: null, why: "no enemy under the crosshair" };
        default: return { order: null, why: "not an order" };
    }
}
/** Callout text of an ORDER_ACK (b order kind, c target / hold-fire flag). */
function ackText(kind, c) {
    switch (kind) {
        case 1: return "STOPPING";
        case 2: return "MOVING";
        case 3: return "ATTACK-MOVING";
        case 4: return "ATTACKING";
        case 5: return "ON MY WAY";
        case 6: return "GUARDING";
        case 7: return "DEFENDING";
        case 8: return "ON YOUR TARGET";
        case 9: return "FOLLOWING";
        case 10: return c ? "HOLDING FIRE" : "WEAPONS FREE";
        case 11: return "RETREATING";
        default: return "ACK";
    }
}
/** First-person quick-command wheel: five options clockwise from the top. */
exports.WHEEL = [
    { b: "defend", label: "DEFEND HERE" },
    { b: "attackMyTarget", label: "ATTACK MY TARGET" },
    { b: "follow", label: "FOLLOW ME" },
    { b: "holdFire", label: "HOLD FIRE" },
    { b: "retreat", label: "RETREAT" },
    { b: "crewThis", label: "CREW THIS" }, // C1 ruling 124: an AI pilot walks to the own vehicle under the reticle
];
exports.WHEEL_DEADZONE_PX = 18;
/** Short sector labels / glyphs of the drawn wheel (same order as WHEEL). */
exports.WHEEL_ICON = ["◎", "✛", "➜", "✋", "↩", "⛭"];
/** Centre angle (radians, 0 at the top, clockwise) of wheel option k of n. */
const wheelAngle = (k, n = exports.WHEEL.length) => (k / n) * Math.PI * 2;
exports.wheelAngle = wheelAngle;
/** Screen offset (px, y down) of angle a (0 at the top, clockwise) at radius r. */
const polar = (a, r) => [r * Math.sin(a), -r * Math.cos(a)];
/**
 * The drawn wheel: one annular sector per option (SVG path, centre at 0, 0), spanning the angles that wheelPick maps
 * to that option, so the highlighted sector is exactly the one a release would send.
 */
function wheelSectors(pick, rIn = 46, rOut = 132, n = exports.WHEEL.length) {
    const half = Math.PI / n, gap = 0.025, f = (v) => v.toFixed(1);
    return exports.WHEEL.slice(0, n).map((o, k) => {
        const a0 = (0, exports.wheelAngle)(k, n) - half + gap, a1 = (0, exports.wheelAngle)(k, n) + half - gap;
        const [x0, y0] = polar(a0, rOut), [x1, y1] = polar(a1, rOut), [x2, y2] = polar(a1, rIn), [x3, y3] = polar(a0, rIn);
        const path = `M${f(x0)} ${f(y0)}A${rOut} ${rOut} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${rIn} ${rIn} 0 0 0 ${f(x3)} ${f(y3)}Z`;
        const [lx, ly] = polar((0, exports.wheelAngle)(k, n), (rIn + rOut) / 2);
        return { index: k, label: o.label, icon: exports.WHEEL_ICON[k] ?? "", path, labelX: lx, labelY: ly, selected: k === pick };
    });
}
/**
 * The wheel's target line: "to: Group 2" when the live selection is exactly a control group, "to: your selection
 * (3 units)" for another selection, else "to: 6 nearby units" (wheelRecipients' fallback), or nobody.
 */
function wheelTargetText(liveSelected, groups, nearby) {
    if (liveSelected.length) {
        for (const [g, m] of groups)
            if (m.length === liveSelected.length && liveSelected.every((id) => m.includes(id)))
                return `to: Group ${g}`;
        return `to: your selection (${liveSelected.length} unit${liveSelected.length > 1 ? "s" : ""})`;
    }
    return nearby > 0 ? `to: ${nearby} nearby unit${nearby > 1 ? "s" : ""}` : "to: no own units within 120 m";
}
/** Wheel option under a mouse offset (dx right, dy down, px from the wheel centre); -1 inside the dead zone. */
function wheelPick(dx, dy, n = exports.WHEEL.length) {
    if (Math.hypot(dx, dy) < exports.WHEEL_DEADZONE_PX)
        return -1;
    const a = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2); // 0 at the top, clockwise
    return Math.round(a / ((Math.PI * 2) / n)) % n;
}
/**
 * Who a wheel command goes to: the player's selected group if it still has units, else own units (not structures,
 * not pilots, not harvesters) within `radius` m of the player, nearest first, at most `max`.
 */
function wheelRecipients(selected, units, px, pz, team = 0, radius = 120, max = 12) {
    const live = selected.filter((id) => units.some((u) => u.id === id && u.team === team));
    if (live.length)
        return live;
    return units.filter((u) => u.unit && u.team === team && Math.hypot(u.x - px, u.z - pz) <= radius).sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz)).slice(0, max).map((u) => u.id);
}
