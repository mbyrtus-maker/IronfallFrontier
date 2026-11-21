"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Sim worker (host side). Runs the authoritative sim at the data's tick rate with a fixed-step accumulator,
// applies the page's pilot control, crew / production actions and orders as tick-stamped inputs, and posts one
// delta snapshot per tick (the same encoder and wire format, v4, a guest would receive, with the player's pilot as
// the viewer: own-pilot block, stockpile, queues, team players, events, projectile shooters with muzzle launch
// points and the hitscan shots). The page acknowledges each snapshot with (seq, epoch) exactly as a guest does.
// C7b: the host-only sidecar (turret aim, deaths) is gone: the snapshot carries both since w2f (AIM records,
// UNIT_DIED). What is left of HostInfo is test aids (the station's shot count) and the control flag.
// Nothing here changes the sim except the test aids in debugOp.
const index_ts_1 = require("../../sim/src/index.js");
const sim_ts_1 = require("../../sim/src/sim.js");
const data_ts_1 = require("../../sim/src/data.js");
const netcore_ts_1 = require("./netcore.js");
const scenario_ts_1 = require("./scenario.js");
const scenario_ts_2 = require("../../sim/src/scenario.js");
const battles_ts_1 = require("./battles.js");
const pilotkit_ts_1 = require("../../sim/src/pilotkit.js");
const weather_ts_1 = require("../../sim/src/weather.js");
const c7a_host_ts_1 = require("./c7a-host.js"); // C7a hook
const c9_host_ts_1 = require("./c9-host.js");
const reserve_ts_1 = require("../../sim/src/reserve.js");
const c7aHost = new c7a_host_ts_1.C7aHost(); // C7a hook
const ctx = self;
let sim = null;
let scen = null;
let enc = null;
let gameData = null;
/** C7b: the page's heightmap (checkpoints carry only its hash: exportState terrain false; the receiver has the same one). */
let pageHm = null;
let capped = false;
let tickMs = 50;
let paused = false;
/** Test aid: sim seconds per real second (the scenario-tuning check runs the default battle at 4x). */
let timeScale = 1;
let viewer = { x: 0, z: 0 };
let cineReveal = false; // Frontline: the opening cinematic's view of the whole map
let ctl = null;
let ctlDirty = false;
let ctlPlace = ""; // where the pilot was when control was last queued (a place change releases control in the sim)
let pendingOrderReplies = [];
// timing
let recent = []; // [time, ms] pairs of the last second
let allTicks = [];
let snapBytesWindow = []; // [time, bytes]
let projPeak = 0, snapBytesTotal = 0, snapCount = 0, acksSeen = 0;
// per-step "before" copies of the sim state the sidecar compares against
let prevEid = new Int32Array(0);
let prevCd = new Float64Array(0);
let lastLoop = 0, acc = 0;
let stationShots = 0;
/** Test aid: per-mount shot counts (cooldown re-arms) of watched entities, by entity id. */
let fireWatch = new Map();
let lastOrderEvent = new Map(); // id -> latest order event (rejection or end), for query()
let timer = 0;
const guests = new Map();
/** (Re)queues pilot control when it changed or the pilot changed place (enter / exit / eject / seat / respawn). */
function pumpControl(s, pid, c) {
    const p = s.pilot(pid);
    if (p && p.state !== 2) {
        const place = `${p.state}:${p.vehicle}:${p.seat}:${p.entity}`;
        if (c.ctlDirty || place !== c.ctlPlace) {
            s.queuePilotControl(s.tick + 1, pid, c.ctl, 0);
            c.ctlPlace = place;
            c.ctlDirty = false;
        }
    }
    else
        c.ctlPlace = "";
}
function guestEncoder(s) { return new index_ts_1.SnapshotEncoder(s); } // the data's rate and byte cap per snapshot
/** The pilot of player slot `slot` on the player team (a returning guest gets its own pilot back), else a new one at the Command Core. */
/** C6: the battle being played (pilot start of a new or returning player); Classic until an init names one. */
let battleNow = (0, battles_ts_1.battleOf)("classic");
const startPos = () => (0, battles_ts_1.battleLayout)(battleNow).pilotStart;
function pilotForSlot(s, slot) {
    for (const id of s.pilotIds(0)) {
        const p = s.pilot(id);
        if (p.player === slot)
            return id;
    }
    return s.spawnPilot(0, startPos().x + 4 * slot, startPos().z - 6, { player: slot });
}
/**
 * C7b item 2: a joining player comes in through the sim's join input (w2f coopJoin, its immediate form, so the welcome
 * can name the pilot): a new player pilot in the drop pod, landing in front of the Command Core after
 * coop.dropPodSeconds (PLAYER_JOINED to every viewer). The enemy scaling follows the player count. A player whose
 * pilot is still in the sim (after a handover) gets it back; without a Core to drop at (test range) a pilot is spawned.
 */
function joinPilot(s, slot) {
    for (const id of s.pilotIds(0)) {
        const p = s.pilot(id);
        if (p.player === slot)
            return id;
    }
    const r = s.match ? s.addPlayer(0, slot) : { ok: false, ids: [] };
    if (r.ok && r.ids && r.ids.length)
        return r.ids[0];
    return pilotForSlot(s, slot);
}
function guestJoin(slot) {
    const s = sim;
    const pilotId = joinPilot(s, slot);
    c7aHost.joined(s, slot); // C7a hook
    const every = Math.max(1, Math.round(1 / (s.d.constants.snapshotRate * s.d.dt)));
    const p = s.pilot(pilotId), e = s.entity(p.state === sim_ts_1.P_FOOT ? p.entity : p.vehicle);
    guests.set(slot, { slot, pilotId, enc: guestEncoder(s), viewer: { x: e ? e.x : startPos().x, z: e ? e.z : startPos().z }, viewerSet: false, ctl: null, ctlDirty: true, ctlPlace: "", every, n: every, orders: [], snaps: [] });
    ctx.postMessage({ t: "gjoined", slot, pilotId });
}
function guestLeave(slot) {
    const g = guests.get(slot);
    if (!g)
        return;
    guests.delete(slot);
    // C7b item 2: the sim's leave input (w2f coopLeave, mode 0): the pilot passes to the AI (seated it stays as AI crew,
    // on foot it walks home; the vehicle it drove joins a battle group, w3b); PLAYER_LEFT to every viewer. The player
    // count, and with it the enemy scaling, drops. A returning player joins again through the drop pod.
    const s = sim, p = s.pilot(g.pilotId);
    if (p && p.player >= 0) {
        if (s.match)
            s.queueLeave(s.tick + 1, g.pilotId, 0, 0);
        else if (p.state !== 2)
            s.queuePilotControl(s.tick + 1, g.pilotId, null, 0);
    }
}
/** The guest's own entity position (its viewer when it has not sent one). */
function guestBody(s, g) {
    const p = s.pilot(g.pilotId);
    const e = p ? s.entity(p.state === sim_ts_1.P_FOOT ? p.entity : p.vehicle) : undefined;
    return e ? { x: e.x, z: e.z } : g.viewer;
}
function guestMsg(slot, m) {
    const g = guests.get(slot), s = sim;
    if (!g)
        return;
    switch (m.t) {
        case "pctl":
            g.ctl = m.input;
            g.ctlDirty = true;
            break;
        case "ack":
            g.enc.ack(m.seq, m.epoch);
            break;
        case "viewer":
            g.viewer = { x: m.x, z: m.z };
            g.viewerSet = true;
            break;
        case "act": {
            const seq = queueAction(m.action, g.pilotId);
            ctx.postMessage({ t: "gout", slot, m: { t: "act", reqId: m.reqId, seq, tick: s.tick + 1 } });
            break;
        }
        case "order": {
            const o = { ...m.order };
            if (netcore_ts_1.OWN_PILOT_ORDERS.has(String(o.type)))
                o.pilotId = g.pilotId; // the issuing player is always the guest itself
            let seq = 0;
            try {
                seq = s.queueOrder(s.tick + 1, m.ids, o, 0);
            }
            catch {
                seq = 0;
            }
            if (seq)
                g.orders.push({ reqId: m.reqId, seq });
            else
                ctx.postMessage({ t: "gout", slot, m: { t: "order", reqId: m.reqId, seq: 0, tick: s.tick, rejected: m.ids.map((id) => ({ id, reason: "invalid" })) } });
            break;
        }
        case "query":
            ctx.postMessage({ t: "gout", slot, m: { t: "query", reqId: m.reqId, units: queryUnits(m.ids) } });
            break;
        case "ping": break; // pings are relayed by the page
    }
}
function guestSnapshots() {
    const s = sim;
    for (const g of guests.values()) {
        if (++g.n < g.every)
            continue;
        g.n = 0;
        const v = g.viewerSet ? g.viewer : guestBody(s, g);
        const bytes = g.enc.encode({ id: 100 + g.slot, team: 0, x: v.x, z: v.z, pilotId: g.pilotId });
        g.snaps.push(bytes.slice());
        // C7b item 1: turret aim and deaths are in the snapshot itself (w2f AIM records, UNIT_DIED): no side channel
        const p = s.pilot(g.pilotId);
        const vs = p && p.state === sim_ts_1.P_SEATED ? s.idToSlot.get(p.vehicle) : p ? s.idToSlot.get(p.entity) : undefined;
        const frame = (0, netcore_ts_1.encodeSnapFrame)({ tick: s.tick, epoch: g.enc.epoch, pilotId: g.pilotId, controlled: vs !== undefined && (s.ctlOn[vs] === 1 || s.ctlMask[vs] !== 0), snaps: g.snaps.splice(0), aimIds: new Int32Array(0), aimYaw: new Float32Array(0), deaths: new Float32Array(0) });
        const buf = frame.buffer;
        ctx.postMessage({ t: "gsnap", slot: g.slot, frame: buf }, [buf]);
    }
}
function newEncoder(s) {
    // Local render stream: uncapped unless asked (the page is not a network guest; see the report).
    return new index_ts_1.SnapshotEncoder(s, capped ? { rateHz: 1 / s.d.dt } : { maxBytes: Infinity, local: true }); // m1: local (exact, no far holding)
}
/** (Re)initialises the worker: a new sim and scenario. A second init (start-overlay scenario buttons) replaces the first. */
function init(m) {
    if (timer)
        clearInterval(timer);
    gameData = m.data;
    capped = m.capped;
    guests.clear();
    pageHm = m.heightmap;
    if ((0, scenario_ts_1.isSkirmish)(m.scenario, m.units)) {
        // C3 / C6: the battle's scenario (battles.ts: the sim's fixtures), built as createScenarioSim does (map with its
        // additions, match rules and objectives, the spawns in file order with their tags, supply refreshed), but on the
        // page's shared heightmap instead of the fixture's flat terrain (the page draws and aims against that heightmap)
        const b = (0, battles_ts_1.battleOf)(m.battle ?? "classic"), sc = b.scenario;
        battleNow = b;
        const teams = (0, scenario_ts_2.scenarioTeams)(sc, { seed: m.seed, difficulty: m.difficulty });
        sim = (0, index_ts_1.createSim)({ data: m.data, seed: m.seed, planetId: sc.planetId, mapSize: sc.mapSize, heightmap: m.heightmap, capacity: 2048, map: (0, scenario_ts_1.skirmishMap)(b.id), match: { teams, objectives: sc.objectives, players: Math.max(1, 1 + guests.size) }, terrainLayer: sc.terrainLayer, weather: sc.weather, lanes: sc.lanes });
        const tags = new Map();
        for (const sp of sc.spawns) {
            const id = sim.spawnUnit(sp.type, sp.team, sp.x, sp.z);
            if (sp.tag)
                tags.set(sp.tag, id);
        }
        sim.match?.objectives?.bind(sim, tags);
        sim.refreshPoints();
        scen = (0, scenario_ts_1.setupSkirmish)(sim, (0, battles_ts_1.battleLayout)(b).pilotStart);
        // Frontline: the player starts in a Dart scout (the scenario's tagged start-dart, parked beside the pilot start)
        if (sim.fkit && m.kit) // Frontline: the player's kit (role, guns, grenade, armour), applied to every body on foot
            sim.fkit.setKit(sim, 0, m.kit);
        if (sc.lanes && tags.has("start-dart"))
            sim.enter(scen.pilotId, tags.get("start-dart"), undefined, 0);
    }
    else {
        sim = (0, index_ts_1.createSim)({ data: m.data, seed: m.seed, planetId: m.planetId, mapSize: m.mapSize, heightmap: m.heightmap, capacity: Math.max(2048, m.units * 3 + 768) });
        scen = (0, scenario_ts_1.setupScenario)(sim, m.units, m.seed, m.scenario, m.showcaseFire);
    }
    enc = newEncoder(sim);
    tickMs = sim.d.dt * 1000;
    const pl = sim.pilot(scen.pilotId), e = sim.entity(pl.entity) ?? (pl.vehicle ? sim.entity(pl.vehicle) : undefined) ?? startPos(); // Frontline: the pilot may start seated
    viewer = { x: e.x, z: e.z };
    prevEid = new Int32Array(sim.cap);
    prevCd = new Float64Array(sim.cap * data_ts_1.MAX_MOUNTS);
    ctl = null;
    ctlDirty = false;
    ctlPlace = "";
    pendingOrderReplies = [];
    recent = [];
    allTicks = [];
    snapBytesWindow = [];
    projPeak = 0;
    snapBytesTotal = 0;
    snapCount = 0;
    acksSeen = 0;
    stationShots = 0;
    fireWatch = new Map();
    lastOrderEvent = new Map();
    acc = 0;
    ctx.postMessage({ t: "ready", pilotId: scen.pilotId, typeIds: sim.d.typeIds, scenario: m.scenario, units: m.units, seed: m.seed, difficulty: m.difficulty });
    lastLoop = performance.now();
    timer = setInterval(loop, 4);
}
/**
 * N1: a new host after a handover: the sim from the last checkpoint (createSimFromState bumps the stream epoch, so
 * every guest's decoder starts the new epoch with a keyframe), this browser's own pilot by its player slot. The
 * scripted scenario state (waves) is not in the checkpoint: the skirmish has none (the enemy commander is in the sim).
 */
function initState(m) {
    if (timer)
        clearInterval(timer);
    gameData = m.data;
    capped = false;
    guests.clear();
    if (m.heightmap)
        pageHm = m.heightmap;
    sim = (0, index_ts_1.createSimFromState)(new Uint8Array(m.state), m.data, pageHm ? { heightmap: pageHm } : {});
    const s = sim, held = new Set();
    const pilotId = pilotForSlot(s, m.localSlot);
    scen = { pilotId, wave: 0, ticksToWave: 1e9, held, rebind: (ns) => { void ns; }, maintain: () => { } };
    enc = newEncoder(s);
    tickMs = s.d.dt * 1000;
    const p = s.pilot(pilotId), e = s.entity(p.state === sim_ts_1.P_FOOT ? p.entity : p.vehicle);
    viewer = { x: e ? e.x : startPos().x, z: e ? e.z : startPos().z };
    prevEid = new Int32Array(s.cap);
    prevCd = new Float64Array(s.cap * data_ts_1.MAX_MOUNTS);
    ctl = null;
    ctlDirty = true;
    ctlPlace = "";
    pendingOrderReplies = [];
    recent = [];
    allTicks = [];
    snapBytesWindow = [];
    projPeak = 0;
    snapBytesTotal = 0;
    snapCount = 0;
    acksSeen = 0;
    stationShots = 0;
    fireWatch = new Map();
    lastOrderEvent = new Map();
    acc = 0;
    ctx.postMessage({ t: "ready", pilotId, typeIds: s.d.typeIds, scenario: "default", units: 0, seed: s.seed, difficulty: s.match ? String(s.match.difficulty[1] ?? "normal") : "normal" });
    lastLoop = performance.now();
    timer = setInterval(loop, 4);
}
/** Empty gunner seats' mounts of a vehicle slot (the weapons a driver may take over with gunnerWeapon). */
function emptyGunnerMounts(s, slot) {
    const d = s.d, t = s.etype[slot], out = [];
    for (let m = 0; m < s.mCount[slot]; m++) {
        const j = d.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + m];
        if (j >= 0 && j !== d.tDriverSeat[t] && d.tSeatRole[t * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_GUNNER && s.occ[slot * data_ts_1.MAX_SEATS + j] === 0)
            out.push(m);
    }
    return out;
}
/**
 * The player's station: the slot whose weapons the player triggers and its two fire groups (mount lists). On foot:
 * the pilot entity (group 0 the carbine, group 1 the long rifle). Driver seat: group 0 the LIVE weapon (its own
 * weapons, or with gunnerWeapon the weapons of the empty gunner seats; CONTRACTS rev 4: never both), group 1 the
 * other. Gunner seat: group 0 that seat's weapons.
 */
function station(s) {
    const p = s.pilot(scen.pilotId);
    if (!p)
        return null;
    if (p.state === sim_ts_1.P_FOOT) {
        const slot = s.idToSlot.get(p.entity);
        return slot === undefined ? null : { slot, groups: [[0], [1]], gunnerAvail: false, gunnerLive: false };
    }
    if (p.state !== sim_ts_1.P_SEATED)
        return null;
    const slot = s.idToSlot.get(p.vehicle);
    if (slot === undefined)
        return null;
    const d = s.d, t = s.etype[slot], own = [];
    const drv = p.seat === d.tDriverSeat[t];
    for (let m = 0; m < s.mCount[slot]; m++) {
        const j = d.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + m];
        if (j === p.seat || (drv && j < 0))
            own.push(m);
    }
    const gun = drv ? emptyGunnerMounts(s, slot) : [];
    const live = drv && gun.length > 0 && !!ctl?.gunnerWeapon;
    return { slot, groups: live ? [gun, own] : [own, gun], gunnerAvail: gun.length > 0, gunnerLive: live };
}
function stepOnce() {
    const s = sim, sc = scen;
    // pilot control: (re)queue when it changed, or when the pilot changed place (enter / exit / eject / seat / respawn)
    const local = { ctl, ctlDirty, ctlPlace };
    pumpControl(s, sc.pilotId, local);
    ctlDirty = local.ctlDirty;
    ctlPlace = local.ctlPlace;
    for (const g of guests.values())
        pumpControl(s, g.pilotId, g);
    const prevHi = s.hi;
    if (prevEid.length < s.cap) {
        prevEid = new Int32Array(s.cap);
        prevCd = new Float64Array(s.cap * data_ts_1.MAX_MOUNTS);
    } // the sim's storage grew
    for (let i = 0; i < prevHi; i++)
        prevEid[i] = s.alive[i] ? s.eid[i] : 0;
    prevCd.set(s.cooldown.subarray(0, prevHi * data_ts_1.MAX_MOUNTS));
    const st0 = station(s);
    const t0 = performance.now();
    s.step();
    const ms = performance.now() - t0;
    // watched entities: a shot per mount whose cooldown re-armed this step
    for (const [id, counts] of fireWatch) {
        const k = s.idToSlot.get(id);
        if (k === undefined || !s.alive[k] || k >= prevHi)
            continue;
        for (let m = 0; m < s.mCount[k]; m++) {
            const ci = k * data_ts_1.MAX_MOUNTS + m;
            if (s.cooldown[ci] > prevCd[ci] + 1e-9 && s.cooldown[ci] < 1e8)
                counts[m]++;
        }
    }
    // shots of the player's station this tick (a cooldown re-armed)
    if (st0 && s.alive[st0.slot])
        for (const g of st0.groups)
            for (const m of g) {
                const ci = st0.slot * data_ts_1.MAX_MOUNTS + m;
                if (s.cooldown[ci] > prevCd[ci] + 1e-9)
                    stationShots++;
            }
    sc.maintain(s); // scripted spawns and held weapons: not counted as sim tick time
    const now = performance.now();
    recent.push(now, ms);
    if (allTicks.length < 200000)
        allTicks.push(ms);
    for (const e of s.orderEvents)
        lastOrderEvent.set(e.id, { tick: e.tick, reason: e.reason });
    // order replies: rejections of this tick's inputs
    if (pendingOrderReplies.length) {
        for (const r of pendingOrderReplies.splice(0)) {
            const rejected = s.orderEvents.filter((e) => e.seq === r.seq).map((e) => ({ id: e.id, reason: e.reason }));
            ctx.postMessage({ t: "order", reqId: r.reqId, seq: r.seq, tick: s.tick, rejected });
        }
    }
    for (const g of guests.values())
        if (g.orders.length) {
            for (const r of g.orders.splice(0)) {
                const rejected = s.orderEvents.filter((e) => e.seq === r.seq).map((e) => ({ id: e.id, reason: e.reason }));
                ctx.postMessage({ t: "gout", slot: g.slot, m: { t: "order", reqId: r.reqId, seq: r.seq, tick: s.tick, rejected } });
            }
        }
}
function loop() {
    const s = sim;
    if (!s)
        return;
    const now = performance.now();
    if (paused) {
        lastLoop = now;
        return;
    }
    acc += Math.min(now - lastLoop, 250) * timeScale; // a long stall is not caught up in full
    lastLoop = now;
    const snaps = [];
    let n = 0;
    while (acc >= tickMs && n < 5 * timeScale && !paused) {
        stepOnce();
        acc -= tickMs;
        n++;
        const bytes = enc.encode({ id: 1, team: 0, x: viewer.x, z: viewer.z, pilotId: scen.pilotId, reveal: cineReveal });
        const copy = bytes.slice().buffer;
        snaps.push(copy);
        snapBytesWindow.push(now, copy.byteLength);
        snapBytesTotal += copy.byteLength;
        snapCount++;
        if (guests.size)
            guestSnapshots();
    }
    if (acc > tickMs * 5 * timeScale)
        acc = tickMs; // fell far behind: drop the backlog
    if (n === 0)
        return;
    if (sim.pN > projPeak)
        projPeak = sim.pN;
    postSnap(snaps);
    c7aHost.poll(sim, (x) => ctx.postMessage(x)); // C7a hook
    // C9: the fix-qa2 host-side state (reserve, garrisons, domes, upgrades, manned towers, building hacks) for the page
    // (4 a second) and every guest (2 a second); the snapshot does not carry it
    if (s.tick - c9Last >= 5 || s.tick < c9Last) {
        c9Last = s.tick;
        const side = (0, c9_host_ts_1.c9Side)(s, 0);
        ctx.postMessage(side);
        if (guests.size && (c9Guest = (c9Guest + 1) % 2) === 0)
            for (const g of guests.values())
                ctx.postMessage({ t: "gout", slot: g.slot, m: side });
    }
}
let c9Last = -99, c9Guest = 0;
function hostInfo() {
    const s = sim, sc = scen, st = station(s);
    return { pilotId: sc.pilotId, shots: stationShots, controlled: !!st && (s.ctlOn[st.slot] === 1 || s.ctlMask[st.slot] !== 0), epoch: enc.epoch };
}
function postSnap(snaps) {
    const s = sim;
    const now = performance.now();
    while (recent.length && recent[0] < now - 1000)
        recent.splice(0, 2);
    while (snapBytesWindow.length && snapBytesWindow[0] < now - 1000)
        snapBytesWindow.splice(0, 2);
    let sum = 0, max = 0;
    for (let i = 1; i < recent.length; i += 2) {
        sum += recent[i];
        if (recent[i] > max)
            max = recent[i];
    }
    let bytes = 0;
    for (let i = 1; i < snapBytesWindow.length; i += 2)
        bytes += snapBytesWindow[i];
    // C7b item 1: no side channel (turret aim: SnapshotView.aims; deaths: UNIT_DIED events)
    const aimIds = new Int32Array(0), aimYaw = new Float32Array(0), d = new Float32Array(0);
    const msg = {
        t: "snap", tick: s.tick, snaps, aimIds, aimYaw, deaths: d, host: hostInfo(),
        perf: { tickMsMean: recent.length ? sum / (recent.length / 2) : 0, tickMsMax: max, ticksPerSec: recent.length / 2, snapBytesPerSec: bytes, entities: s.nLive, projectiles: s.pN },
        wave: scen.wave, secondsToWave: scen.ticksToWave * s.d.dt,
        fl: s.fkit ? { pods: s.fkit.pods.map((q) => [q.x, q.z, q.team, q.left]), locks: flLocks(s), pings: s.fkit.pingsOf(s, 0).map((q) => [Math.round(q.x), Math.round(q.z), q.kind, q.who, Math.ceil((q.until - s.tick) / s.d.constants.tickRate)]), wave: flWave(s), bots: s.fkit.bots ? s.fkit.bots.status(s).map((q) => [q.id, q.name, q.team, q.role, q.lane, q.state, q.mode, q.eid, q.hp, q.deaths, q.down, q.rev]) : [] } : null, // Frontline: resupply pods on the ground, the own vehicle's missile locks
    };
    ctx.postMessage(msg, [...snaps, aimIds.buffer, aimYaw.buffer, d.buffer]);
}
function pct(a, p) { if (!a.length)
    return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; }
/** The page's crew / production action as the sim's tick-stamped input (team 0: the player's side). Returns the seq. */
function queueAction(a, pilot) {
    const s = sim, t = s.tick + 1, pid = pilot ?? scen.pilotId;
    switch (a.kind) {
        case "enter": return s.queueEnter(t, pid, a.vehicle, a.seat, 0);
        case "exit": return s.queueExit(t, pid, 0);
        case "switch": return s.queueSwitchSeat(t, pid, a.seat, 0);
        case "eject": return s.queueEject(t, pid, 0);
        case "queue": return s.queueProduction(t, a.building, a.unit, 0, c7aHost.by(s, pid)); // C7a hook (was by = 0: licence gating per player)
        case "cancel": return s.queueCancelProduction(t, a.building, a.index, 0);
        case "rally": return s.queueRallyPoint(t, a.building, a.point, 0);
        case "harvest": return s.queueHarvest(t, a.harvester, a.deposit, 0);
        case "build": return a.at ? s.queueBuild(t, 0, a.type, a.at, a.constructor, a.yaw) : s.queueBuild(t, 0, a.type, a.point, a.constructor); // B2: exact spot + yaw
        case "cancelBuild": return s.queueCancelBuild(t, a.site, 0);
        case "fireCall": return s.queueFireCall(t, pid, a.call, a.x, a.z, 0, a.option !== undefined ? { option: a.option } : undefined); // ruling 129
        case "throwCall": return s.queueThrowCall(t, pid, a.call, a.yaw, a.pitch, 0, a.option !== undefined ? { option: a.option } : undefined); // ruling 128
        case "call": return s.queueCall(t, pid, a.call, a.x, a.z, 0, a.aimYaw !== undefined || a.option !== undefined ? { aimYaw: a.aimYaw, option: a.option } : undefined);
        // C6
        case "loadout": return s.queueSetLoadout(t, pid, a.calls, 0);
        case "charge": return s.queuePlantCharge(t, pid, a.target, 0);
        case "fortify": return s.queueFortify(t, 0, a.point, a.constructor);
        case "deployBase": return s.queueDeployBase(t, a.vehicle, 0);
        case "packBase": return s.queuePackBase(t, a.depot, 0);
        // C7b item 3: the sim boards whole squads (ACT_LOAD takes a squad id, which is not on the wire): each unit's squad, once
        case "load": {
            const sq = new Set();
            for (const id of a.units) {
                const k = s.idToSlot.get(id);
                if (k !== undefined && s.alive[k] && s.team[k] === 0 && s.squad[k])
                    sq.add(s.squad[k]);
            }
            let first = 0;
            for (const q of sq) {
                const seq = s.queueLoad(t, q, a.vehicle, 0);
                if (!first)
                    first = seq;
            }
            return first || s.queueLoad(t, 0, a.vehicle, 0);
        }
        case "unload": return s.queueUnload(t, a.vehicle, a.x, a.z, 0);
        case "lift": return s.queueAirlift(t, a.lifter, a.target, 0);
        case "jammer": return s.queueJammer(t, a.relay, a.on, 0);
        case "decoy": return s.queueDecoy(t, pid, 0);
        case "pulse": return s.queueScoutPulse(t, pid, 0);
        // C7b item 5: battle groups (the player team's)
        case "groupSet": {
            let first = 0;
            for (const id of a.ids) {
                const q = s.queueGroupSet(t, 0, a.label, id, a.add ? 1 : 0);
                if (!first)
                    first = q;
            }
            return first;
        }
        case "groupOrder": return s.queueGroupOrder(t, 0, a.label, a.order, a.x, a.z, a.target);
        case "groupWaypoint": return s.queueGroupWaypoint(t, 0, a.label, a.x, a.z);
        case "groupReinforce": return s.queueGroupReinforce(t, 0, a.label, a.on);
        case "autoDefend": return s.queueAutoDefend(t, 0, a.on);
        // C9 (fix-qa2)
        case "garrison": { // one input per squad (a squad garrisons as a whole)
            const seen = new Set();
            let first = 0;
            for (const id of a.units) {
                const sl = s.idToSlot.get(id);
                const q = sl !== undefined ? s.squad[sl] : -id;
                if (seen.has(q))
                    continue;
                seen.add(q);
                const r = s.queueGarrison(t, 0, a.point, id, a.on);
                if (!first)
                    first = r;
            }
            return first;
        }
        case "reserveDeploy": return s.queueReserveDeploy(t, 0, a.k, a.x, a.z);
        case "recall": { // one input per squad (a squad returns as a whole)
            const seen = new Set();
            let first = 0;
            for (const id of a.units) {
                const sl = s.idToSlot.get(id);
                const q = sl !== undefined ? s.squad[sl] : -id;
                if (seen.has(q))
                    continue;
                seen.add(q);
                const r = s.queueRecall(t, 0, id);
                if (!first)
                    first = r;
            }
            return first;
        }
        case "rapid": return s.queueRapidReinforce(t, 0, a.point, 1);
        case "reserveMode": return s.queueReserveMode(t, 0, a.building, a.on);
        case "upgrade": return s.queueBuyUpgrade(t, 0, a.lab, a.u);
        case "manTower": return s.queueManTower(t, 0, pid, a.tower);
        case "shelter": return s.queueShelter(t, 0, pid, a.building, a.enter); // ruling 121
        case "manGun": return s.queueManGun(t, 0, pid, a.turret); // ruling 125: man a sentry's gun seat (leave: shelter with enter false)
        case "dispatch": {
            if (!a.pilots.length)
                return s.queueDispatch(t, 0, a.vehicle, 0, a.n);
            let first = 0;
            for (const b of a.pilots) {
                const r = s.queueDispatch(t, 0, a.vehicle, b, 1);
                if (!first)
                    first = r;
            }
            return first;
        } // ruling 124
        // the sim has no public queueLeaveTower: ACT 59 sub-command 3 (b = pilot id) through its tick-stamped input (sim gap, see the C9 report)
        case "leaveTower": return s.queueAct(t, reserve_ts_1.ACT_RESERVE_MODE, 0, 3, pid, 0);
        case "exportCargo": return s.queueExportCargo(t, 0, a.uplink, a.ore, a.gas);
        // C11: crew order (S14) and the dome gas floor (S15 ruling 86)
        case "crew": {
            let first = 0;
            for (const id of a.vehicles) {
                const r = s.queueCrew(t, 0, id);
                if (!first)
                    first = r;
            }
            return first;
        }
        case "gasFloor": return s.queueDomeGasFloor(t, 0, a.gas);
        case "cheat": return pilot !== undefined ? s.queueCheat(t, 0, 0, 0, 0) /* a guest: refused (badInput); netcore never passes one */ : a.sub === 5 ? s.queueCheat(t, 0, 5, pid, a.b) : a.sub === 6 ? s.queueCheat(t, 0, 6, pid, a.b) : s.queueCheat(t, 0, a.sub, a.b, a.c); // D1 test cheats
    }
}
/** C7b item 1: a room checkpoint: live slots only, packed, the heightmap as its hash (every page has it: w2f). */
function exportCk(s) { return s.exportState({ terrain: !pageHm }); }
/** Test aid: host handover in place. The state (with its network section) moves to a new sim; the stream continues in the next epoch. */
function handover() {
    const old = sim;
    const bytes = exportCk(old);
    const hashBefore = old.tick;
    const ns = (0, index_ts_1.createSimFromState)(bytes, gameData, pageHm ? { heightmap: pageHm } : {});
    sim = ns;
    scen.rebind(ns);
    enc = newEncoder(ns);
    prevEid = new Int32Array(ns.cap);
    prevCd = new Float64Array(ns.cap * data_ts_1.MAX_MOUNTS);
    ctlPlace = ""; // control is requeued on the new host
    for (const g of guests.values()) {
        g.enc = guestEncoder(ns);
        g.ctlPlace = "";
    }
    return { epoch: enc.epoch, tick: ns.tick, oldTick: hashBefore, bytes: bytes.length };
}
/** Test aids (debug hook): spawn a unit (optionally with its weapons held or without a crew), exact state, a few writes. */
function debugOp(m) {
    const s = sim, sc = scen;
    const view = (id) => {
        const e = s.entity(id);
        if (!e)
            return { id, alive: false };
        return { id, alive: true, typeId: e.typeId, team: e.team, hp: e.hp, shield: e.shield, x: e.x, y: e.y, z: e.z, occupants: e.occupants, hullCritical: e.hullCritical, altitude: e.altitude, pilotId: e.pilotId, energy: s.energy[e.slot], jet: s.jetFuel[e.slot], airborne: s.airborne[e.slot], ordType: s.ordType[e.slot], velY: s.velY[e.slot] };
    };
    switch (m.op) {
        case "spawn": {
            const t = s.d.typeIds.indexOf(m.typeId);
            if (t < 0)
                return { error: `unknown type ${m.typeId}` };
            const ids = s.d.tSquadSize[t] > 1 ? s.spawnSquad(m.typeId, m.team, m.x, m.z, undefined, undefined, undefined, m.crew).ids : [s.spawnUnit(m.typeId, m.team, m.x, m.z, m.crew ? { crew: m.crew } : undefined)];
            const l = Math.hypot(m.faceX, m.faceZ) || 1;
            for (const id of ids) {
                const e = s.entity(id);
                s.dirX[e.slot] = m.faceX / l;
                s.dirZ[e.slot] = m.faceZ / l;
                if (m.hold) {
                    sc.held.add(id);
                    for (let k = 0; k < data_ts_1.MAX_MOUNTS; k++)
                        s.cooldown[e.slot * data_ts_1.MAX_MOUNTS + k] = 1e9;
                } // held from its first tick
            }
            return { ids };
        }
        case "hold": {
            if (m.on)
                sc.held.add(m.id);
            else {
                sc.held.delete(m.id);
                const e = s.entity(m.id);
                if (e)
                    for (let k = 0; k < data_ts_1.MAX_MOUNTS; k++)
                        s.cooldown[e.slot * data_ts_1.MAX_MOUNTS + k] = 0;
            }
            return true;
        }
        case "downPilot": {
            const p = s.pilot(m.pilot ?? scen?.pilotId ?? 0);
            const sl = p ? s.idToSlot.get(p.entity) : undefined;
            return sl !== undefined ? (0, pilotkit_ts_1.kitTryDown)(s, sl, false) : false;
        }
        case "weatherSoon": {
            const o = s;
            o.weather = new weather_ts_1.Weather({ entries: [{ weather: m.weather, startSeconds: s.tick * s.d.dt + m.inSeconds, durationSeconds: m.durationSeconds, jitterSeconds: 0 }] }, gameData, s.d.planetId ?? o.planetId ?? "halcyon", s.seed, Math.round(1 / s.d.dt));
            o.weather.update(s.tick);
            o.envOn = true;
            return true;
        }
        case "spawnPlayer": {
            const id = s.spawnPilot(0, m.x, m.z, { player: m.slot });
            return { pilot: id, body: s.pilot(id).entity };
        }
        case "setHull": {
            const e = s.entity(m.id);
            if (!e)
                return false;
            s.hp[e.slot] = Math.max(1, m.hp);
            return true;
        } // test aid (hull-critical, torch)
        case "setShield": {
            const e = s.entity(m.id);
            if (!e)
                return false;
            s.shield[e.slot] = Math.max(0, m.frac) * s.d.tShield[e.type];
            return true;
        }
        case "setResources":
            s.setResources(m.team, m.ore, m.gas);
            return s.resources(m.team);
        case "destroy": return s.destroy(m.id);
        case "info": return m.ids.map(view);
        case "pilot": {
            const p = s.pilot(sc.pilotId);
            return p ? { ...p, body: view(p.state === 1 ? p.entity : p.vehicle) } : null;
        }
        case "handover": return handover();
        case "timeScale":
            timeScale = Math.max(0.1, Math.min(8, m.k));
            return timeScale;
        case "watchFire": {
            if (m.on)
                fireWatch.set(m.id, new Array(data_ts_1.MAX_MOUNTS).fill(0));
            else
                fireWatch.delete(m.id);
            return true;
        }
        case "mounts": {
            const e = s.entity(m.id);
            if (!e)
                return null;
            const t = s.etype[e.slot], c = fireWatch.get(m.id);
            const mounts = [];
            for (let k = 0; k < s.mCount[e.slot]; k++) {
                const ci = e.slot * data_ts_1.MAX_MOUNTS + k;
                mounts.push({ mount: k, weapon: s.d.weaponIds[s.mWeapon[ci]], seat: s.d.tMountCrewSeat[t * data_ts_1.MAX_MOUNTS + k], cooldown: s.cooldown[ci], target: s.mTgtId[ci], shots: c ? c[k] : 0 });
            }
            return { id: m.id, occupants: e.occupants, seats: s.seatZones(m.id), mounts };
        }
        case "order": {
            const r = s.order(m.ids, m.order, m.team);
            return { rejected: r.rejected.length };
        }
        case "setEnergy": {
            // on foot the energy lives on the pilot's body (entity slot); the pilot record keeps it while seated
            const p = s.pilot(sc.pilotId);
            if (!p || !s.d.crew)
                return false;
            const v = Math.max(0, Math.min(1, m.frac)) * s.d.crew.energyMax;
            p.energy = v;
            const e = p.entity ? s.entity(p.entity) : null;
            if (e)
                s.energy[e.slot] = v;
            return !!e;
        }
        case "match": {
            const v = s.matchState();
            return v ? { ...v, difficulty: s.match ? [...s.match.difficulty] : [], seed: s.seed } : null;
        }
        case "find": {
            const out = [];
            for (let k = 0; k < s.hi; k++)
                if (s.alive[k] && s.team[k] === m.team && s.d.typeIds[s.etype[k]] === m.typeId)
                    out.push(s.eid[k]);
            return out;
        }
        case "census": return { tick: s.tick, wave: sc.wave, units: [0, 1].map((t) => s.unitCount(t)), ticksToWave: sc.ticksToWave };
    }
}
/** Exact state of entities (tests and the page's query; guests' queries too). */
/** C6 item 9: the path still ahead per unit (s6 nav.route); a unit moving in formation shows its group anchor's route. */
function unitRoutes(ids) {
    const s = sim, nav = s.nav;
    const ord = s.ord;
    return ids.slice(0, 64).map((id) => {
        if (!nav)
            return { id, group: -1, path: null };
        const e = ord?.ext.get(id), grp = e && e.form !== 0 && ord.groups.has(e.tgt) ? e.tgt : -1;
        const own = nav.route(id), path = own ?? (grp >= 0 ? nav.route(-(grp + 1)) : null);
        return { id, group: own ? -1 : grp, path: path ? path.map(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10]) : null };
    });
}
function queryUnits(ids) {
    const s = sim;
    return ids.map((id) => {
        const e = s.entity(id);
        if (!e)
            return { id, alive: false, x: 0, z: 0, team: -1, typeId: "", ordType: 0, waypoint: null, ordTargetId: 0, lastEvent: lastOrderEvent.get(id) ?? null, hp: 0, shield: 0 };
        const wp = s.waypoints[e.slot];
        const i = s.wpIdx[e.slot];
        return { id, alive: true, x: e.x, z: e.z, team: e.team, typeId: e.typeId, ordType: s.ordType[e.slot], waypoint: wp && i * 2 < wp.length ? [wp[i * 2], wp[i * 2 + 1]] : null, ordTargetId: s.ordTargetId[e.slot], lastEvent: lastOrderEvent.get(id) ?? null, hp: e.hp, shield: e.shield };
    });
}
/** Frontline: is the pilot (on foot or seated) within 140 m of its team's Command Core? Kit changes only happen there. */
function flAtCore(s, pilotId) {
    const p = s.pilot(pilotId);
    if (!p)
        return false;
    const e = s.entity(p.state === 0 ? p.vehicle : p.entity);
    if (!e)
        return false;
    for (let o = 0; o < s.hi; o++)
        if (s.alive[o] && s.team[o] === p.team && s.tCore && s.tCore[s.etype[o]] && Math.hypot(s.x[o] - e.x, s.z[o] - e.z) < 140)
            return true;
    return false;
}
ctx.onmessage = (ev) => {
    const m = ev.data;
    try {
        if (c7aHost.onMsg(sim, m))
            return; // C7a hook
        switch (m.t) {
            case "init":
                init(m);
                break;
            case "flTestCall": { // Frontline test aid: the player's call m.call lands m.dx / m.dz from its pilot
                const p = sim ? sim.pilot(scen.pilotId) : undefined, e = p ? sim.entity(p.state === 0 ? p.vehicle : p.entity) : undefined;
                if (e && m.x !== undefined && p.state === 1) { // absolute: the pilot is moved 30 m short of the point first
                    const s = sim.idToSlot.get(p.entity);
                    sim.x[s] = m.x - 30;
                    sim.z[s] = m.z;
                    e.x = m.x - 30;
                    e.z = m.z;
                }
                if (e && m.ax !== undefined) { // absolute, the pilot left where it is (the gunship drop test: in front of the camera)
                    const cs = sim.callState(), id = sim.callRules.ids.indexOf(m.call), c = cs.caller(scen.pilotId);
                    if (id >= 0 && !c.loadout.includes(id))
                        c.loadout = [id, ...c.loadout].slice(0, 4);
                    sim.queueCall(sim.tick + 1, scen.pilotId, m.call, sim.clampMap(Number(m.ax)), sim.clampMap(Number(m.az)), 0);
                }
                else if (e)
                    sim.queueCall(sim.tick + 1, scen.pilotId, m.call, sim.clampMap(m.x ?? e.x + (m.dx ?? 20)), sim.clampMap(m.z ?? e.z + (m.dz ?? 0)), 0);
                break;
            }
            case "flTestSlot3": { // Frontline test aid: put slot 3 weapon m.weapon in the player's hands
                const p = sim ? sim.pilot(scen.pilotId) : undefined, s = p ? sim.idToSlot.get(p.entity) : undefined, w = sim ? sim.d.weaponIds.indexOf(m.weapon) : -1;
                if (s !== undefined && w >= 0 && sim.fkit) {
                    sim.callState().caller(scen.pilotId).heavy = w;
                    sim.applyHeavy(scen.pilotId, s);
                }
                break;
            }
            case "flTestBoard": { // Frontline test aid: the player's pilot boards its last dropped vehicle
                const p = sim ? sim.pilot(scen.pilotId) : undefined, v = sim && sim.fkit ? sim.fkit.dropped.get(scen.pilotId) : undefined;
                const s = p ? sim.idToSlot.get(p.entity) : undefined, vs = v !== undefined ? sim.idToSlot.get(v) : undefined;
                if (s !== undefined && vs !== undefined && p.state === 1) {
                    sim.x[s] = sim.x[vs] - sim.d.tRadius[sim.etype[vs]] - 1;
                    sim.z[s] = sim.z[vs];
                    sim.y[s] = sim.y[vs];
                    if (!m.moveOnly)
                        sim.enter(scen.pilotId, v, undefined, 0);
                }
                break;
            }
            case "flTestKill": { // Frontline test aid: the player's pilot on foot dies at once (respawn ride checks)
                const p = sim ? sim.pilot(scen.pilotId) : undefined, s = p ? sim.idToSlot.get(p.entity) : undefined;
                if (s !== undefined && p.state === 1) {
                    sim.hp[s] = 0;
                    sim.dying[sim.nDying++] = s;
                }
                break;
            }
            case "flSwap": { // Frontline: swap the laser cell (on foot: the kit gun in hand, mount m.mount; seated: the seat's lasers)
                const p = sim && sim.fkit ? sim.pilot(scen.pilotId) : undefined;
                if (p) {
                    const s = sim.idToSlot.get(p.state === 1 ? p.entity : p.vehicle);
                    if (s !== undefined)
                        sim.fkit.swapCell(sim, s, p.state === 1 ? (Number.isInteger(m.mount) ? m.mount : -1) : -1);
                }
                break;
            }
            case "flPriority": // Frontline 4a: the team's ore / gas priority for its AI commander
                if (sim && sim.fkit)
                    sim.fkit.setPriority(0, String(m.p));
                break;
            case "flTestDown": // test aid: down an AI pilot by name (on foot first)
                if (sim && sim.fkit && sim.fkit.bots)
                    sim.fkit.bots.testDown(sim, String(m.name), m.x === undefined ? undefined : Number(m.x), Number(m.z));
                break;
            case "flPing": // Frontline 4b: a map ping for the team's AI pilots
                if (sim && sim.fkit)
                    sim.fkit.addPing(sim, 0, Number(m.x), Number(m.z), String(m.kind), Number(m.who) || scen.pilotId);
                break;
            case "flRequest": // Frontline 4a: a lane support request
                if (sim && sim.fkit && Number.isInteger(m.lane))
                    sim.fkit.requestLane(sim, 0, m.lane, scen.pilotId);
                break;
            case "flGiveUp": // Frontline: the downed pilot gives up (bleeds out now: the respawn timer starts)
                if (sim && sim.kit)
                    (0, pilotkit_ts_1.kitGiveUp)(sim, scen.pilotId);
                break;
            case "flLane": // Frontline: the lane the Mule takes the pilot to after a respawn
                if (sim && sim.fkit && Number.isInteger(m.lane))
                    sim.fkit.lane = Math.max(0, Math.min(3, m.lane)); // 3: respawn at the Core, no Mule
                break;
            case "flKit": // Frontline: the player changed the kit (start card)
                if (sim && sim.fkit && m.kit && flAtCore(sim, scen.pilotId))
                    sim.fkit.setKit(sim, 0, m.kit);
                break;
            case "pctl":
                ctl = m.input;
                ctlDirty = true;
                break;
            case "viewer":
                viewer = { x: m.x, z: m.z };
                break;
            case "ack":
                enc?.ack(m.seq, m.epoch);
                acksSeen++;
                break;
            case "pause":
                paused = m.on;
                break;
            case "cineReveal": // Frontline: the opening cinematic sees the whole map (the host's own view only, not the sim)
                cineReveal = !!m.on;
                break;
            case "debug":
                ctx.postMessage({ t: "debug", reqId: m.reqId, result: debugOp(m) });
                break;
            case "act": {
                const seq = queueAction(m.action);
                ctx.postMessage({ t: "act", reqId: m.reqId, seq, tick: sim.tick + 1 });
                break;
            }
            case "order": {
                const s = sim;
                const seq = s.queueOrder(s.tick + 1, m.ids, m.order, 0);
                pendingOrderReplies.push({ reqId: m.reqId, seq });
                break;
            }
            case "query":
                ctx.postMessage({ t: "query", reqId: m.reqId, units: queryUnits(m.ids) });
                break;
            case "routes":
                ctx.postMessage({ t: "routes", reqId: m.reqId, routes: unitRoutes(m.ids) });
                break;
            case "initState":
                initState(m);
                break;
            case "gjoin":
                guestJoin(m.slot);
                break;
            case "gleave":
                guestLeave(m.slot);
                break;
            case "g":
                guestMsg(m.slot, m.m);
                break;
            case "export": {
                const b = exportCk(sim);
                const buf = b.slice().buffer;
                ctx.postMessage({ t: "export", reqId: m.reqId, state: buf, tick: sim.tick }, [buf]);
                break;
            }
            case "stats": {
                const s = sim;
                const mean = allTicks.length ? allTicks.reduce((a, b) => a + b, 0) / allTicks.length : 0;
                ctx.postMessage({
                    t: "stats", reqId: m.reqId, ticks: allTicks.length, tickMsMean: mean, tickMsP50: pct(allTicks, 0.5), tickMsP95: pct(allTicks, 0.95), tickMsP99: pct(allTicks, 0.99),
                    tickMsMax: allTicks.length ? Math.max(...allTicks) : 0, units: s.unitCount(0) + s.unitCount(1), structures: s.countAlive(0, true) + s.countAlive(1, true) - s.countAlive(0) - s.countAlive(1),
                    projectilesPeak: projPeak, snapBytesMean: snapCount ? snapBytesTotal / snapCount : 0, acks: acksSeen, epoch: enc?.epoch ?? 0,
                });
                if (m.reset) {
                    allTicks.length = 0;
                    projPeak = 0;
                    snapBytesTotal = 0;
                    snapCount = 0;
                }
                break;
            }
        }
    }
    catch (err) {
        ctx.postMessage({ t: "error", message: String(err?.stack ?? err) });
    }
};
void timer;

/** Frontline 4b: team 0's lane state for the map: seconds to the next wave, the focus lane and its requests' seconds left, the resource priority, units per lane. */
function flWave(s) {
    const L = s.lanes, F = s.fkit;
    if (!L)
        return null;
    const dt = 1 / s.d.constants.tickRate, focus = F.focusOf(s, 0), req = F.requests[0].filter((r) => s.tick < r.until);
    const P = F.R.pace, Pt = s.pts, held = [0, 0], tc = s.coreTypes(), cores = [0, 0];
    if (Pt)
        for (let p = 0; p < Pt.n; p++)
            if (Pt.owner[p] === 0 || Pt.owner[p] === 1)
                held[Pt.owner[p]]++;
    for (let q = 0; q < s.hi; q++)
        if (s.alive[q] && s.hp[q] > 0 && tc[s.etype[q]] && s.team[q] < 2)
            cores[s.team[q]] = Math.max(cores[s.team[q]], Math.round(s.hp[q] / s.d.tHp[s.etype[q]] * 100));
    const toS = (t) => Math.max(0, Math.ceil((t - s.tick) * dt));
    return { phase: L.phase(s), bleeding: F.bleeding, held, cores, toFast: toS(P.fastTicks), toPush: toS(P.pushTicks), toBleed: toS(P.bleedTicks), toSudden: toS(P.suddenTicks),
        next: Math.max(0, Math.ceil((L.lastWave[0] + L.waveTicksNow(s) - s.tick) * dt)), focus, left: req.length ? Math.ceil((Math.max(...req.map((r) => r.until)) - s.tick) * dt) : 0, prio: F.priority[0], lanes: L.counts(s, 0) };
}
/** Frontline: the missile locks of the vehicle the player's pilot sits in (entity ids). */
function flLocks(s) {
    const p = s.pilot(scen.pilotId);
    return p && p.state === 0 && p.vehicle ? s.fkit.lockedOf(p.vehicle) : [];
}
