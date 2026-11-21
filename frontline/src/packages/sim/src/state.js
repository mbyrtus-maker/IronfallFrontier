"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packState = packState;
exports.unpackState = unpackState;
exports.exportState = exportState;
exports.createSimFromState = createSimFromState;
const data_ts_1 = require("./data.js");
const snapshot_ts_1 = require("./snapshot.js");
const sim_ts_1 = require("./sim.js");
const terrain_ts_1 = require("./terrain.js");
const events_ts_1 = require("./events.js");
const MAGIC = 0x53464649; // "IFFS"
const STATE_VERSION = 42; // 42: FB1 forward base defences (economy2 section: owner entity -> defence ids, after the depot timers); 41: ruling 129 beacons fired from a vehicle (per beacon in flight: source entity, fired flag); 40: ruling 128 thrown call beacons (calls section: per beacon height, carrier entity and offset; the list of beacons in flight); 39: ruling 126 AI reaction to small targets per mount (mRxId, mRxT) after mHeat; 38: C1 crew dispatch section (dispatch.ts: pilot id -> vehicle id; absent until used) after the cheats section, pilot task 3 (sent to a vehicle), the gun seat of a manned turret (ruling 125: pilot state 4 with seat 0, the turret's ctlMask bit 15, occ / gYaw / gPitch / gFire of its seat 0); 37: ruling 121 pilot state 4 (P_SHELTER: inside an own Citadel / Command Core; vehicle = the structure) and input ACT_SHELTER 62; 36: W1 walker (the Strider): movement classes (data.ts tMove) in the path agents and group classes, walker 5 (NAV_CLASSES 6; combined classes renumbered), walker velocity along the hull; 35: q1 refinery dock queue (per harvester record: dock, queue ticket, exit point, exit tick) merged with D1 cheats; 34: D1 test cheats section (cheats.ts: instant / reveal team masks, god pilots) after the S15 section; 33: ruling 112 hover hop per slot (hopH, hopReady) after boostOn (velX / velZ now carry hover momentum); 32: B2 construction site yaw (i16 after idle); 31: ruling 108 boost meter / flag per slot (boostM, boostOn) after mHeat, homing target per projectile (pTgt) after pPilot; 30: ruling 106 salvage removed (economy2 section without wrecks); 29: ruling 91 laser charge / overheat lockout / heat per mount (mChg, mOvh, mHeat) after mReady; 28: F1 turret traverse (per mount barrel direction mDX / mDZ, wind-up target mLock and ready tick mReady) after mAimMul; 27: S15 rulings section (s15.ts: aircraft ammunition, ash fall, EMP falls, idle pilots, AI revive helpers, dome gas floor) after the pilot reserve, escort convoy ids in the objectives, the construction site idle tick; 26: S14 pilot reserve section (initial / gained / available / lost per team, per point the teams that had its citadel pilots, member pilot ids, vehicles waiting for crew) after the stealth section; the Command Points budgets are gone from the header; 25: fix-qa2 strong points (control nodes, prebuilt, fortification structures, garrisons), the unit reserve, building effects, per-team building-hack counts and the building flag of hack records; 24: fix-qa3 QA3-7 progression tally gains the team at leave (T_TEAM); ruling 42 pilot stances (stance, stanceT per slot; ctlFlags and pending pilot-control flags 16 bits); 23: ruling 41 per-slot low-flight flag (after flyAlt), order kind 20 (lowFlight wrapper); 22: w3b battle groups (groups, auto-defend flags); 21: w2f match player count (drop-in / drop-out), live slots only + zero-run packing + heightmap by hash (terrain mode 3), stealth tools section; 20: w2e MAX_MOUNTS 12 per slot, transport cargo, progression; 19: w2a call options (beacon option, carried heavy weapon, loadout slots); 18: wave 2 D terrain layer (definition, lava timers) and weather schedule; 17: w2b economy depth (economy2.ts: fortify jobs, held-since, forward base jobs, depot timers, wrecks); 16: S12 pilot kit (downed / revive records, charges, cloak); 15: s13 match reason, objectives, Director state; 14: s11 call effects, beacon direction, air-call uses; 13: s6 pathfinding (stamped structures, path agents, request queue); 12: s10 support calls (callers, cooldowns, beacons); 11: s8 construction (sites, constructors taken off by orders); 10: s7 match (definition, phase, winner); 9: s5 orders (extension records, hold fire); 8: mining (deposit / harvester / extractor definition and state); 7: strategic points (map definition + point state); 2: unit limits; 3: dying list, ram phase, last-hit tick, order events, injected terrain, per-weapon stats; 4: direct control; 5: crews, pilots, production, stockpiles; 6: max capacity, control pilot, hijack fields, network continuation (epoch, event log tail)
/** Events older than this many ticks are never resent (netsnap EVENT_RESEND_TICKS); the export keeps one tick more. */
const EVENT_TAIL_TICKS = 65;
const PACK_MAGIC = 0x5a464649; // "IFFZ"
/**
 * w2f zero-run packing: varint original length, then pairs (varint literal length, literal bytes, varint zero-run length)
 * until the original length is reached. Runs of 4+ zero bytes are folded (sparse per-slot arrays, i32 / f64 zeros).
 */
function packState(b) {
    const w = new snapshot_ts_1.ByteWriter(Math.max(1024, b.length >> 2));
    w.u32(PACK_MAGIC);
    w.varint(b.length);
    const n = b.length;
    let i = 0;
    while (i < n) {
        let j = i;
        while (j < n) {
            if (b[j] === 0 && j + 3 < n && b[j + 1] === 0 && b[j + 2] === 0 && b[j + 3] === 0)
                break;
            j++;
        }
        w.varint(j - i);
        w.raw(b.subarray(i, j));
        let z = j;
        while (z < n && b[z] === 0)
            z++;
        w.varint(z - j);
        i = z;
    }
    return w.bytes();
}
function unpackState(p) {
    const r = new snapshot_ts_1.ByteReader(p);
    if (r.u32() !== PACK_MAGIC)
        return p;
    const n = r.varint(), out = new Uint8Array(n);
    let o = 0;
    while (o < n) {
        const lit = r.varint();
        out.set(r.u8s(lit), o);
        o += lit;
        o += r.varint();
    }
    if (o !== n || !r.done())
        throw new Error("bad packed state");
    return out;
}
function exportState(sim, opts = {}) {
    const w = new snapshot_ts_1.ByteWriter(64 * 1024);
    w.u32(MAGIC);
    w.u16(STATE_VERSION);
    w.str(sim.d.fingerprint);
    w.str(sim.d.planetId);
    w.u32(sim.seed);
    w.f64(sim.mapSize);
    w.u32(sim.cap);
    w.u32(sim.maxCap);
    // terrain: 0 generated from the seed, 1 flat, 2 injected heightmap (written in full)
    const ter = sim.terrain instanceof terrain_ts_1.Terrain ? sim.terrain : null;
    const full = opts.terrain ?? true;
    w.u8(sim.flat ? 1 : ter && ter.injected ? (full ? 2 : 3) : 0);
    if (ter && ter.injected) {
        if (full) {
            w.f64(ter.cell);
            w.u32(ter.cols);
            w.u32(ter.rows);
            w.typed(ter.h, ter.h.length);
        }
        else
            w.str(sim.terrainHash);
    }
    w.f64(sim.hostUnitCap);
    w.str(sim.mapSizeClass);
    w.str(sim.pts ? sim.pts.defJson : ""); // strategic points: the normalised map definition ("" = none)
    w.str(sim.mine ? sim.mine.defJson : ""); // mining: the normalised deposit definition ("" = none)
    w.str(sim.match ? sim.match.defJson : ""); // s7 match: teams and AI teams ("" = no match rules)
    w.str(sim.tlayer ? sim.tlayer.defJson : ""); // wave 2 D terrain layer ("" = none)
    w.str(sim.weather ? sim.weather.defJson : ""); // wave 2 D weather schedule ("" = none)
    w.i32(sim.tick);
    w.i32(sim.nextId);
    w.i32(sim.nextSquadId);
    w.i32(sim.nextProjId);
    w.i32(sim.inputSeq);
    for (let i = 0; i < 4; i++)
        w.u32(sim.rng.s[i]);
    // w2f (state v18): per-slot arrays for LIVE slots only (dead slots are never read: spawnUnit sets every field
    // written here, and the hash covers live slots only), as a bitmask of live slots up to the high-water mark
    const hi = sim.hi;
    w.u32(hi);
    const live = [];
    for (let s = 0; s < hi; s++)
        if (sim.alive[s])
            live.push(s);
    {
        const m = new Uint8Array((hi + 7) >> 3);
        for (const s of live)
            m[s >> 3] |= 1 << (s & 7);
        w.typed(m, m.length);
    }
    const ws = (a, k) => { const g = new a.constructor(live.length * k); let j = 0; for (const s of live)
        for (let q = 0; q < k; q++)
            g[j++] = a[s * k + q]; w.typed(g, g.length); };
    ws(sim.alive, 1);
    ws(sim.eid, 1);
    ws(sim.etype, 1);
    ws(sim.team, 1);
    ws(sim.squad, 1);
    ws(sim.x, 1);
    ws(sim.y, 1);
    ws(sim.z, 1);
    ws(sim.px, 1);
    ws(sim.pz, 1);
    ws(sim.dirX, 1);
    ws(sim.dirZ, 1);
    ws(sim.velX, 1);
    ws(sim.velZ, 1);
    ws(sim.hp, 1);
    ws(sim.shield, 1);
    ws(sim.lastFired, 1);
    ws(sim.tgtSlot, 1);
    ws(sim.tgtId, 1);
    ws(sim.noLos, 1);
    ws(sim.ramPhase, 1);
    ws(sim.lastHit, 1);
    ws(sim.maxRange, 1);
    ws(sim.mCount, 1);
    ws(sim.mWeapon, data_ts_1.MAX_MOUNTS);
    ws(sim.mFixed, data_ts_1.MAX_MOUNTS);
    ws(sim.cooldown, data_ts_1.MAX_MOUNTS);
    ws(sim.mTgtSlot, data_ts_1.MAX_MOUNTS);
    ws(sim.mTgtId, data_ts_1.MAX_MOUNTS);
    ws(sim.detExpiry, sim_ts_1.MAX_TEAMS);
    ws(sim.ordType, 1);
    ws(sim.ordTargetId, 1);
    ws(sim.wpIdx, 1);
    ws(sim.ctlOn, 1);
    ws(sim.ctlThrust, 1);
    ws(sim.ctlStrafe, 1);
    ws(sim.ctlYaw, 1);
    ws(sim.ctlPitch, 1);
    ws(sim.ctlFire, 1);
    // crews and pilots: per slot, per seat, per mount
    ws(sim.ctlFlags, 1);
    ws(sim.ctlTool, 1);
    ws(sim.ctlMask, 1);
    ws(sim.drv, 1);
    ws(sim.nOcc, 1);
    ws(sim.airS, 1);
    ws(sim.flyAlt, 1);
    ws(sim.lowFly, 1); // v23 ruling 41 low flight
    ws(sim.velY, 1);
    ws(sim.airborne, 1);
    ws(sim.slotPilot, 1);
    ws(sim.energy, 1);
    ws(sim.jetFuel, 1);
    ws(sim.critTick, 1);
    ws(sim.lastShHit, 1);
    ws(sim.hijacked, 1);
    ws(sim.stance, 1);
    ws(sim.stanceT, 1); // v23: ruling 42 stances
    ws(sim.occ, data_ts_1.MAX_SEATS);
    ws(sim.gYaw, data_ts_1.MAX_SEATS);
    ws(sim.gPitch, data_ts_1.MAX_SEATS);
    ws(sim.gFire, data_ts_1.MAX_SEATS);
    ws(sim.mOn, data_ts_1.MAX_MOUNTS);
    ws(sim.mAimMul, data_ts_1.MAX_MOUNTS);
    ws(sim.mDX, data_ts_1.MAX_MOUNTS);
    ws(sim.mDZ, data_ts_1.MAX_MOUNTS);
    ws(sim.mLock, data_ts_1.MAX_MOUNTS);
    ws(sim.mReady, data_ts_1.MAX_MOUNTS); // v28 F1
    ws(sim.mChg, data_ts_1.MAX_MOUNTS);
    ws(sim.mOvh, data_ts_1.MAX_MOUNTS);
    ws(sim.mHeat, data_ts_1.MAX_MOUNTS); // v29 ruling 91
    ws(sim.mRxId, data_ts_1.MAX_MOUNTS);
    ws(sim.mRxT, data_ts_1.MAX_MOUNTS); // v39 ruling 126
    ws(sim.boostM, 1);
    ws(sim.boostOn, 1); // v30 ruling 108
    ws(sim.hopH, 1);
    ws(sim.hopReady, 1); // v33 ruling 112
    // waypoints
    let nwp = 0;
    for (let s = 0; s < hi; s++)
        if (sim.waypoints[s])
            nwp++;
    w.u32(nwp);
    for (let s = 0; s < hi; s++) {
        const wp = sim.waypoints[s];
        if (wp) {
            w.u32(s);
            w.u32(wp.length);
            w.typed(wp, wp.length);
        }
    }
    // free list (order matters for slot reuse)
    w.u32(sim.free.length);
    for (const s of sim.free)
        w.u32(s);
    // squads, ascending id
    const sqIds = Array.from(sim.squads.keys()).sort((a, b) => a - b);
    w.u32(sqIds.length);
    for (const id of sqIds) {
        const sq = sim.squads.get(id);
        w.i32(sq.id);
        w.u8(sq.team);
        w.u8(sq.structure ? 1 : 0);
        w.u32(sq.members.length);
        for (const m of sq.members)
            w.i32(m);
    }
    // projectiles
    const pn = sim.pN;
    w.u32(pn);
    w.typed(sim.pId, pn);
    w.typed(sim.pX0, pn);
    w.typed(sim.pY0, pn);
    w.typed(sim.pZ0, pn);
    w.typed(sim.pVX, pn);
    w.typed(sim.pVY, pn);
    w.typed(sim.pVZ, pn);
    w.typed(sim.pT, pn);
    w.typed(sim.pLaunch, pn);
    w.typed(sim.pWeapon, pn);
    w.typed(sim.pTeam, pn);
    w.typed(sim.pBallistic, pn);
    w.typed(sim.pShooter, pn);
    w.typed(sim.pSeen, pn);
    w.typed(sim.pPilot, pn);
    w.typed(sim.pTgt, pn);
    // pending inputs
    w.u32(sim.pending.length);
    for (const p of sim.pending) {
        w.i32(p.tick);
        w.i32(p.seq);
        w.u8(p.team);
        w.u32(p.ids.length);
        for (const id of p.ids)
            w.i32(id);
        const nums = (0, sim_ts_1.orderNumbers)(p.order);
        w.u32(nums.length);
        for (const v of nums)
            w.f64(v);
    }
    // pending direct-control inputs
    w.u32(sim.pendingCtl.length);
    for (const p of sim.pendingCtl) {
        w.i32(p.tick);
        w.i32(p.seq);
        w.i32(p.id);
        w.u8(p.team);
        w.u8(p.on);
        w.f64(p.thrust);
        w.f64(p.strafe);
        w.f64(p.yaw);
        w.f64(p.pitch);
        w.u8(p.fire);
        w.i32(p.pilot);
    }
    // pilots, production queues, stockpiles, pending crew / production / pilot-control inputs
    w.i32(sim.nextPilotId);
    w.typed(sim.ore, sim_ts_1.MAX_TEAMS);
    w.typed(sim.gas, sim_ts_1.MAX_TEAMS);
    w.typed(sim.suppliedPoints, sim_ts_1.MAX_TEAMS);
    w.u32(sim.pilots.size);
    for (const p of sim.pilots.values())
        for (const v of (0, sim_ts_1.pilotNumbers)(p))
            w.f64(v);
    w.u32(sim.prod.size);
    for (const q of sim.prod.values()) {
        const nums = (0, sim_ts_1.queueNumbers)(q);
        w.u32(nums.length);
        for (const v of nums)
            w.f64(v);
    }
    w.u32(sim.pendingAct.length);
    for (const a of sim.pendingAct) {
        w.i32(a.tick);
        w.i32(a.seq);
        w.u8(a.team);
        w.u8(a.kind);
        w.f64(a.a);
        w.f64(a.b);
        w.f64(a.c);
        w.f64(a.x);
        w.f64(a.z);
    }
    w.u32(sim.pendingPilotCtl.length);
    for (const p of sim.pendingPilotCtl) {
        w.i32(p.tick);
        w.i32(p.seq);
        w.i32(p.pilot);
        w.u8(p.team);
        w.u8(p.on);
        w.f64(p.move);
        w.f64(p.strafe);
        w.f64(p.yaw);
        w.f64(p.pitch);
        w.u16(p.flags);
        w.u8(p.fire);
        w.u8(p.tool);
    }
    // dying list (order kept), order events
    w.u32(sim.nDying);
    w.typed(sim.dying, sim.nDying);
    w.u32(sim.orderEvents.length);
    for (const e of sim.orderEvents) {
        w.i32(e.tick);
        w.i32(e.seq);
        w.i32(e.id);
        w.u8((0, sim_ts_1.reasonCode)(e.reason));
    }
    w.str(JSON.stringify(sim.stats));
    // strategic points: rules hash, then the point state
    if (sim.pts) {
        const P = sim.pts;
        w.str(P.rulesHash);
        for (let i = 0; i < P.n; i++) {
            w.u8(P.owner[i] & 255);
            w.u8(P.capTeam[i] & 255);
            w.f64(P.capProg[i]);
            w.u8(P.flags[i]);
            w.u8(P.fort[i]);
            w.i32(P.cutTicks[i]);
            w.i32(P.hackPilot[i]);
            w.i32(P.hackTicks[i]);
        }
        w.typed(P.momentum, sim_ts_1.MAX_TEAMS);
        const cl = P.coreList(); // Command Core hacks / disables (ruling 29)
        w.u32(cl.length);
        for (const [id, c] of cl) {
            w.i32(id);
            w.i32(c.until);
            w.i32(c.pilot);
            w.i32(c.ticks);
            w.u8(c.bld ?? 0);
        }
        for (let t = 0; t < sim_ts_1.MAX_TEAMS; t++)
            w.i32(P.hacksDone[t]); // fix-qa2 (v23): building / Core disables per hacking team
    }
    if (sim.mine)
        sim.mine.exportTo(w);
    if (sim.con)
        sim.con.exportTo(w); // s8 construction
    sim.ord.exportTo(w); // s5 orders
    w.u8(sim.nav ? 1 : 0);
    if (sim.nav)
        sim.nav.exportTo(w); // s6 pathfinding
    if (sim.match)
        sim.match.exportTo(w); // s7 match state (the enemy commander keeps no state of its own)
    w.u8(sim.calls ? 1 : 0);
    if (sim.calls)
        sim.calls.exportTo(w); // s10 support calls (absent until the first call input)
    w.u8(sim.kit ? 1 : 0);
    if (sim.kit)
        sim.kit.exportTo(w); // S12 pilot kit (absent until first used)
    w.u8(sim.eco2 ? 1 : 0);
    if (sim.eco2)
        sim.eco2.exportTo(w); // w2b economy depth (maps with points)
    if (sim.tlayer)
        sim.tlayer.exportTo(w); // wave 2 D lava timers (the definition is in the header)
    w.u8(sim.tp ? 1 : 0);
    if (sim.tp)
        sim.tp.exportTo(w); // w2e transports (absent until first used)
    w.u8(sim.bg ? 1 : 0);
    if (sim.bg)
        sim.bg.exportTo(w); // w3b battle groups (absent until first used)
    w.u8(sim.sp ? 1 : 0);
    if (sim.sp)
        sim.sp.exportTo(w); // fix-qa2 strong points
    w.u8(sim.res ? 1 : 0);
    if (sim.res)
        sim.res.exportTo(w); // fix-qa2 reserve (absent until first used)
    w.u8(sim.bfx && sim.bfx.used() ? 1 : 0);
    if (sim.bfx && sim.bfx.used())
        sim.bfx.exportTo(w); // fix-qa2 building effects
    w.u8(sim.prog ? 1 : 0);
    if (sim.prog)
        sim.prog.exportTo(w); // w2e progression (absent until a player is involved)
    w.u8(sim.stl ? 1 : 0);
    if (sim.stl)
        sim.stl.exportTo(w); // w2f stealth tools (state v21)
    w.u8(sim.pool ? 1 : 0);
    if (sim.pool)
        sim.pool.exportTo(w); // S14 pilot reserve (state v26)
    w.u8(sim.s15 ? 1 : 0);
    if (sim.s15)
        sim.s15.exportTo(w); // S15 rulings (state v26; absent until first used)
    w.u8(sim.cheat ? 1 : 0);
    if (sim.cheat)
        sim.cheat.exportTo(w); // D1 test cheats (state v34; absent until used)
    w.u8(sim.dispatch ? 1 : 0);
    if (sim.dispatch)
        sim.dispatch.exportTo(w); // C1 crew dispatch (state v38; absent until used)
    // network continuation (not sim state: never hashed)
    const net = opts.net ?? true;
    w.u8(net ? 1 : 0);
    if (net) {
        const log = sim.events;
        w.u32(sim.streamEpoch);
        w.u32(log.next);
        let first = log.next;
        for (let k = log.next - 1; k >= log.first(); k--) {
            if (sim.tick - log.tick[log.at(k)] > EVENT_TAIL_TICKS)
                break;
            first = k;
        }
        let n = 0;
        for (let k = first; k < log.next; k++)
            if (log.kind[log.at(k)] !== events_ts_1.EV.SHOT)
                n++;
        w.u32(first);
        w.u32(n);
        for (let k = first; k < log.next; k++) {
            const i = log.at(k);
            if (log.kind[i] === events_ts_1.EV.SHOT)
                continue;
            w.u32(k);
            w.u8(log.kind[i]);
            w.i32(log.tick[i]);
            w.u8(log.team[i]);
            w.u8(log.flags[i]);
            w.i32(log.a[i]);
            w.i32(log.b[i]);
            w.i32(log.c[i]);
            w.i32(log.d[i]);
            w.f64(log.v1[i]);
            w.f64(log.v2[i]);
        }
    }
    return opts.pack ?? true ? packState(w.bytes()) : w.bytes();
}
function createSimFromState(bytes, data, ro = {}) {
    const r = new snapshot_ts_1.ByteReader(unpackState(bytes));
    if (r.u32() !== MAGIC)
        throw new Error("not an Ironfall sim state");
    const ver = r.u16();
    if (ver !== STATE_VERSION)
        throw new Error(`sim state version ${ver}, expected ${STATE_VERSION}`);
    const fingerprint = r.str(), planetId = r.str();
    const seed = r.u32(), mapSize = r.f64(), cap = r.u32(), maxCap = r.u32(), tmode = r.u8();
    if (tmode > 3)
        throw new Error(`bad state: terrain mode ${tmode}`);
    let heightmap;
    if (tmode === 2) {
        const cellSize = r.f64(), cols = r.u32(), rows = r.u32();
        heightmap = { cellSize, cols, rows, heights: r.f64s(cols * rows) };
    }
    let wantHash = "";
    if (tmode === 3) {
        wantHash = r.str();
        if (!ro.heightmap)
            throw new Error("createSimFromState: this checkpoint was written without its heightmap (terrain: false); pass opts.heightmap");
        heightmap = { ...ro.heightmap, heights: Float64Array.from(ro.heightmap.heights) };
    }
    const hostCap = r.f64(), mapSizeClass = r.str(), mapJson = r.str(), mineJson = r.str(), matchJson = r.str(), tlJson = r.str(), wxJson = r.str();
    let map = mapJson ? JSON.parse(mapJson) : undefined;
    if (mineJson)
        map = { ...(map ?? { points: [] }), ...JSON.parse(mineJson) };
    const sim = new sim_ts_1.Sim({ data, seed, planetId, mapSize, capacity: cap, maxCapacity: maxCap, flatTerrain: tmode === 1, heightmap,
        hostUnitCap: Number.isFinite(hostCap) ? hostCap : undefined, mapSizeClass: mapSizeClass || undefined, map,
        match: matchJson ? JSON.parse(matchJson) : undefined, terrainLayer: tlJson ? JSON.parse(tlJson) : undefined, weather: wxJson ? JSON.parse(wxJson) : undefined });
    if (tmode === 3 && sim.terrainHash !== wantHash)
        throw new Error(`createSimFromState: heightmap hash ${sim.terrainHash} is not the checkpoint's ${wantHash}`);
    if (sim.d.fingerprint !== fingerprint)
        throw new Error(`sim state was saved with different game data (fingerprint ${fingerprint}, this data ${sim.d.fingerprint})`);
    sim.tick = r.i32();
    sim.nextId = r.i32();
    sim.nextSquadId = r.i32();
    sim.nextProjId = r.i32();
    sim.inputSeq = r.i32();
    for (let i = 0; i < 4; i++)
        sim.rng.s[i] = r.u32();
    const hi = r.u32();
    if (hi > cap)
        throw new Error("bad state: hi > capacity");
    sim.hi = hi;
    const lm = r.u8s((hi + 7) >> 3), live = [];
    for (let s = 0; s < hi; s++)
        if (lm[s >> 3] & (1 << (s & 7)))
            live.push(s);
    const L = live.length;
    const rs = (a, g, k) => { let j = 0; for (const s of live)
        for (let q = 0; q < k; q++)
            a[s * k + q] = g[j++]; };
    rs(sim.alive, r.u8s(L * 1), 1);
    rs(sim.eid, r.i32s(L * 1), 1);
    rs(sim.etype, r.i16s(L * 1), 1);
    rs(sim.team, r.u8s(L * 1), 1);
    rs(sim.squad, r.i32s(L * 1), 1);
    rs(sim.x, r.f64s(L * 1), 1);
    rs(sim.y, r.f64s(L * 1), 1);
    rs(sim.z, r.f64s(L * 1), 1);
    rs(sim.px, r.f64s(L * 1), 1);
    rs(sim.pz, r.f64s(L * 1), 1);
    rs(sim.dirX, r.f64s(L * 1), 1);
    rs(sim.dirZ, r.f64s(L * 1), 1);
    rs(sim.velX, r.f64s(L * 1), 1);
    rs(sim.velZ, r.f64s(L * 1), 1);
    rs(sim.hp, r.f64s(L * 1), 1);
    rs(sim.shield, r.f64s(L * 1), 1);
    rs(sim.lastFired, r.i32s(L * 1), 1);
    rs(sim.tgtSlot, r.i32s(L * 1), 1);
    rs(sim.tgtId, r.i32s(L * 1), 1);
    rs(sim.noLos, r.u8s(L * 1), 1);
    rs(sim.ramPhase, r.u8s(L * 1), 1);
    rs(sim.lastHit, r.i32s(L * 1), 1);
    rs(sim.maxRange, r.f64s(L * 1), 1);
    rs(sim.mCount, r.u8s(L * 1), 1);
    rs(sim.mWeapon, r.i16s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mFixed, r.u8s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.cooldown, r.f64s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mTgtSlot, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mTgtId, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.detExpiry, r.i32s(L * sim_ts_1.MAX_TEAMS), sim_ts_1.MAX_TEAMS);
    rs(sim.ordType, r.u8s(L * 1), 1);
    rs(sim.ordTargetId, r.i32s(L * 1), 1);
    rs(sim.wpIdx, r.i32s(L * 1), 1);
    rs(sim.ctlOn, r.u8s(L * 1), 1);
    rs(sim.ctlThrust, r.f64s(L * 1), 1);
    rs(sim.ctlStrafe, r.f64s(L * 1), 1);
    rs(sim.ctlYaw, r.f64s(L * 1), 1);
    rs(sim.ctlPitch, r.f64s(L * 1), 1);
    rs(sim.ctlFire, r.u8s(L * 1), 1);
    rs(sim.ctlFlags, r.u16s(L * 1), 1);
    rs(sim.ctlTool, r.u8s(L * 1), 1);
    rs(sim.ctlMask, r.u16s(L * 1), 1);
    rs(sim.drv, r.u8s(L * 1), 1);
    rs(sim.nOcc, r.u8s(L * 1), 1);
    rs(sim.airS, r.u8s(L * 1), 1);
    rs(sim.flyAlt, r.f64s(L * 1), 1);
    rs(sim.lowFly, r.u8s(L * 1), 1);
    rs(sim.velY, r.f64s(L * 1), 1);
    rs(sim.airborne, r.u8s(L * 1), 1);
    rs(sim.slotPilot, r.i32s(L * 1), 1);
    rs(sim.energy, r.f64s(L * 1), 1);
    rs(sim.jetFuel, r.f64s(L * 1), 1);
    rs(sim.critTick, r.i32s(L * 1), 1);
    rs(sim.lastShHit, r.i32s(L * 1), 1);
    rs(sim.hijacked, r.u8s(L * 1), 1);
    rs(sim.stance, r.u8s(L * 1), 1);
    rs(sim.stanceT, r.i32s(L * 1), 1);
    rs(sim.occ, r.i32s(L * data_ts_1.MAX_SEATS), data_ts_1.MAX_SEATS);
    rs(sim.gYaw, r.f64s(L * data_ts_1.MAX_SEATS), data_ts_1.MAX_SEATS);
    rs(sim.gPitch, r.f64s(L * data_ts_1.MAX_SEATS), data_ts_1.MAX_SEATS);
    rs(sim.gFire, r.u8s(L * data_ts_1.MAX_SEATS), data_ts_1.MAX_SEATS);
    rs(sim.mOn, r.u8s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mAimMul, r.f64s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mDX, r.f64s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mDZ, r.f64s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mLock, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mReady, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mChg, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mOvh, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mHeat, r.f64s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mRxId, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.mRxT, r.i32s(L * data_ts_1.MAX_MOUNTS), data_ts_1.MAX_MOUNTS);
    rs(sim.boostM, r.f64s(L * 1), 1);
    rs(sim.boostOn, r.u8s(L * 1), 1);
    rs(sim.hopH, r.f64s(L * 1), 1);
    rs(sim.hopReady, r.i32s(L * 1), 1);
    const nwp = r.u32();
    for (let i = 0; i < nwp; i++) {
        const s = r.u32(), len = r.u32();
        sim.waypoints[s] = r.f64s(len);
    }
    const nfree = r.u32();
    sim.free = [];
    for (let i = 0; i < nfree; i++)
        sim.free.push(r.u32());
    sim.idToSlot.clear();
    for (let s = 0; s < hi; s++)
        if (sim.alive[s])
            sim.idToSlot.set(sim.eid[s], s);
    const nsq = r.u32();
    sim.squads.clear();
    for (let i = 0; i < nsq; i++) {
        const id = r.i32(), team = r.u8(), structure = r.u8() === 1, nm = r.u32();
        const members = [];
        for (let k = 0; k < nm; k++)
            members.push(r.i32());
        sim.squads.set(id, { id, team, structure, members });
    }
    const pn = r.u32();
    if (pn > sim.pCap) {
        let c = sim.pCap;
        while (c < pn)
            c *= 2;
        sim.growProjectiles(c);
    }
    sim.pN = pn;
    sim.pId.set(r.i32s(pn));
    sim.pX0.set(r.f64s(pn));
    sim.pY0.set(r.f64s(pn));
    sim.pZ0.set(r.f64s(pn));
    sim.pVX.set(r.f64s(pn));
    sim.pVY.set(r.f64s(pn));
    sim.pVZ.set(r.f64s(pn));
    sim.pT.set(r.f64s(pn));
    sim.pLaunch.set(r.i32s(pn));
    sim.pWeapon.set(r.i16s(pn));
    sim.pTeam.set(r.u8s(pn));
    sim.pBallistic.set(r.u8s(pn));
    sim.pShooter.set(r.i32s(pn));
    sim.pSeen.set(r.u8s(pn));
    sim.pPilot.set(r.i32s(pn));
    sim.pTgt.set(r.i32s(pn));
    const np = r.u32();
    sim.pending = [];
    for (let i = 0; i < np; i++) {
        const tick = r.i32(), seq = r.i32(), team = r.u8(), nid = r.u32();
        const ids = [];
        for (let k = 0; k < nid; k++)
            ids.push(r.i32());
        const nn = r.u32(), nums = [];
        for (let k = 0; k < nn; k++)
            nums.push(r.f64());
        sim.pending.push({ tick, seq, team, ids, order: (0, sim_ts_1.orderFromNumbers)(nums) });
    }
    const npc = r.u32();
    sim.pendingCtl = [];
    for (let i = 0; i < npc; i++) {
        const tick = r.i32(), seq = r.i32(), id = r.i32(), team = r.u8(), on = r.u8();
        const thrust = r.f64(), strafe = r.f64(), yaw = r.f64(), pitch = r.f64(), fire = r.u8(), pilot = r.i32();
        sim.pendingCtl.push({ tick, seq, id, team, on, thrust, strafe, yaw, pitch, fire, pilot });
    }
    sim.nextPilotId = r.i32();
    sim.ore.set(r.f64s(sim_ts_1.MAX_TEAMS));
    sim.gas.set(r.f64s(sim_ts_1.MAX_TEAMS));
    sim.suppliedPoints.set(r.i32s(sim_ts_1.MAX_TEAMS));
    const npl = r.u32();
    sim.pilots.clear();
    for (let i = 0; i < npl; i++) {
        const nums = [];
        for (let k = 0; k < sim_ts_1.PILOT_FIELDS.length; k++)
            nums.push(r.f64());
        const p = (0, sim_ts_1.pilotFromNumbers)(nums);
        sim.pilots.set(p.id, p);
    }
    const nq = r.u32();
    sim.prod.clear();
    for (let i = 0; i < nq; i++) {
        const len = r.u32(), nums = [];
        for (let k = 0; k < len; k++)
            nums.push(r.f64());
        const q = (0, sim_ts_1.queueFromNumbers)(nums);
        sim.prod.set(q.building, q);
    }
    const na = r.u32();
    sim.pendingAct = [];
    for (let i = 0; i < na; i++) {
        const tick = r.i32(), seq = r.i32(), team = r.u8(), kind = r.u8();
        const a = r.f64(), b = r.f64(), c = r.f64(), x = r.f64(), z = r.f64();
        sim.pendingAct.push({ tick, seq, team, kind, a, b, c, x, z });
    }
    const npp = r.u32();
    sim.pendingPilotCtl = [];
    for (let i = 0; i < npp; i++) {
        const tick = r.i32(), seq = r.i32(), pilot = r.i32(), team = r.u8(), on = r.u8();
        const move = r.f64(), strafe = r.f64(), yaw = r.f64(), pitch = r.f64(), flags = r.u16(), fire = r.u8(), tool = r.u8();
        sim.pendingPilotCtl.push({ tick, seq, pilot, team, on, move, strafe, yaw, pitch, flags, fire, tool });
    }
    const nd = r.u32();
    if (nd > cap)
        throw new Error("bad state: dying list longer than capacity");
    sim.dying.set(r.i32s(nd));
    sim.nDying = nd;
    const ne = r.u32();
    sim.orderEvents = [];
    for (let i = 0; i < ne; i++) {
        const tick = r.i32(), seq = r.i32(), id = r.i32(), code = r.u8();
        const reason = sim_ts_1.ORDER_REASONS[code - 1];
        if (!reason)
            throw new Error(`bad state: order event reason ${code}`);
        sim.orderEvents.push({ tick, seq, id, reason });
    }
    sim.stats = JSON.parse(r.str());
    if (sim.pts) {
        const P = sim.pts, rh = r.str();
        if (rh !== P.rulesHash)
            throw new Error(`sim state was saved with different strategic point rules (data/points.json): ${rh} vs ${P.rulesHash}`);
        const i8 = (v) => (v << 24) >> 24;
        for (let i = 0; i < P.n; i++) {
            P.owner[i] = i8(r.u8());
            P.capTeam[i] = i8(r.u8());
            P.capProg[i] = r.f64();
            P.flags[i] = r.u8();
            P.fort[i] = r.u8();
            P.cutTicks[i] = r.i32();
            P.hackPilot[i] = r.i32();
            P.hackTicks[i] = r.i32();
        }
        P.momentum.set(r.f64s(sim_ts_1.MAX_TEAMS));
        P.cores.clear();
        for (let i = 0, nc = r.u32(); i < nc; i++) {
            const id = r.i32();
            const c = { until: r.i32(), pilot: r.i32(), ticks: r.i32(), bld: r.u8() };
            if (!c.bld)
                delete c.bld;
            P.cores.set(id, c);
        }
        for (let t = 0; t < sim_ts_1.MAX_TEAMS; t++)
            P.hacksDone[t] = r.i32();
    }
    if (sim.mine)
        sim.mine.restoreFrom(r);
    if (sim.con)
        sim.con.restoreFrom(r);
    sim.ord.restoreFrom(r);
    if (r.u8() === 1) {
        if (!sim.nav)
            throw new Error("bad state: pathfinding state but the data has no constants.pathfinding");
        sim.nav.restoreFrom(r);
    }
    if (sim.match)
        sim.match.restoreFrom(r);
    if (r.u8() === 1)
        sim.callState().restoreFrom(r); // s10 support calls
    if (r.u8() === 1)
        sim.kitState().restoreFrom(r); // S12 pilot kit
    if (r.u8() === 1) {
        if (!sim.eco2)
            throw new Error("bad state: economy2 section on a map without points");
        sim.eco2.restoreFrom(r);
        sim.eco2.powerStep(sim);
    } // w2b economy depth (power is derived)
    if (sim.tlayer)
        sim.tlayer.restoreFrom(r); // wave 2 D lava timers
    if (r.u8() === 1)
        sim.tpState().restoreFrom(r); // w2e transports
    if (r.u8() === 1)
        sim.bgState().restoreFrom(r); // w3b battle groups
    if (r.u8() === 1) {
        if (!sim.sp)
            throw new Error("bad state: strong points section but the sim has none");
        sim.sp.restoreFrom(r);
    } // fix-qa2 strong points
    if (r.u8() === 1) {
        if (!sim.resRules)
            throw new Error("bad state: reserve section but the data has no production.reserveSize");
        sim.resState().restoreFrom(r);
    } // fix-qa2 reserve
    if (r.u8() === 1)
        sim.bfx.restoreFrom(r); // fix-qa2 building effects
    if (r.u8() === 1)
        sim.progState().restoreFrom(sim, r); // w2e progression
    if (r.u8() === 1)
        sim.stealthState().restoreFrom(r); // w2f stealth tools
    if (r.u8() === 1) {
        if (!sim.pool)
            throw new Error("bad state: pilot reserve section but the data has no constants.pilotReserve");
        sim.pool.restoreFrom(r);
    } // S14 pilot reserve
    if (r.u8() === 1)
        sim.s15State().restoreFrom(r); // S15 rulings (state v26)
    if (r.u8() === 1)
        sim.cheatState().restoreFrom(r); // D1 test cheats (state v34)
    if (r.u8() === 1)
        sim.dispatchState().restoreFrom(r); // C1 crew dispatch (state v38)
    if (r.u8() === 1) {
        // network continuation: the next stream epoch, event serials continue, the unacknowledged tail is resendable
        const epoch = r.u32(), next = r.u32(), first = r.u32(), n = r.u32();
        sim.streamEpoch = (epoch + 1) >>> 0;
        const evs = [];
        for (let i = 0; i < n; i++)
            evs.push([r.u32(), r.u8(), r.i32(), r.u8(), r.u8(), r.i32(), r.i32(), r.i32(), r.i32(), r.f64(), r.f64()]);
        sim.events.restoreTail(next, first, evs);
        sim.handoverSerial = next;
    }
    if (!r.done())
        throw new Error("bad state: trailing bytes");
    if (sim.weather)
        sim.weather.update(sim.tick); // wave 2 D: the weather in force is a function of the tick
    if (sim.bfx)
        sim.bfx.derive(sim); // fix-qa2: domes and manned towers in force
    return sim;
}
