"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlBots = exports.BOT_PLAYER_MIN = void 0;
exports.isBotPlayer = isBotPlayer;
const coop_ts_1 = require("./coop.js");
const pilotkit_ts_1 = require("./pilotkit.js");
// Frontline 4c: AI pilots. Three teammates join the player's squad and four Hegemony pilots fight for the enemy, so a
// solo match is a 4v4. Each is a player-style pilot (a player id from BOT_PLAYER_MIN up): it carries a kit (role, gun,
// grenade, armour) and a call-down loadout, respawns at the Command Core and rides the Mule to its lane like the player.
// The body runs on the unit AI (it moves on orders and picks its own targets with every weapon it carries); this file is
// its brain, once a second:
//   * lane: attack-move down its lane from the nearest waypoint ahead, stopping to take each unheld point (Lanes.route);
//   * pings (team 0): the nearest free teammate answers the newest ping (attack / defend / danger: go and fight there;
//     need help: go to the pilot who asked);
//   * retreat: below 30 % health it falls back to its Command Core until healed (or 25 s);
//   * calls: strikes on enemy groups 20-40 m away with no friends under them, a resupply pod when low on rounds, a
//     sentry at a held lane point under threat, reinforcements when its lane is pushed, and a ground vehicle drop (tank or
//     mech) that it climbs into and drives down its lane.
// Deterministic: decisions read only sim state and the tick (no Math.random).
exports.BOT_PLAYER_MIN = 100;
function isBotPlayer(player) { return player >= exports.BOT_PLAYER_MIN; }
const ROSTER = [
    { team: 0, player: 100, name: "Vance", lane: 0, kit: { role: "sniper", gun: "marksman", laser: false, grenade: "sticky", armour: "light", calls: ["precision-strike", "repair-resupply", "sentry-gun", "tank-drop"] } },
    { team: 0, player: 101, name: "Okoro", lane: 1, kit: { role: "heavy", gun: "shotgun", laser: false, grenade: "he", armour: "heavy", calls: ["barrage", "shield-bubble", "mech-drop", "reinforcements"] } },
    { team: 0, player: 102, name: "Reyes", lane: 2, kit: { role: "medic", gun: "carbine", laser: true, grenade: "area", armour: "medium", calls: ["repair-resupply", "sentry-gun", "precision-strike", "flak-turret"] } },
    { team: 1, player: 110, name: "Kade", lane: 0, kit: { role: "assault", gun: "carbine", laser: false, grenade: "he", armour: "medium", calls: ["precision-strike", "repair-resupply", "sentry-gun", "tank-drop"] } },
    { team: 1, player: 111, name: "Morrow", lane: 1, kit: { role: "heavy", gun: "shotgun", laser: false, grenade: "sticky", armour: "heavy", calls: ["barrage", "shield-bubble", "mech-drop", "reinforcements"] } },
    { team: 1, player: 112, name: "Ishi", lane: 2, kit: { role: "sniper", gun: "marksman", laser: true, grenade: "seeker", armour: "light", calls: ["precision-strike", "sentry-gun", "repair-resupply", "tank-drop"] } },
    { team: 1, player: 113, name: "Brask", lane: 1, kit: { role: "medic", gun: "carbine", laser: false, grenade: "area", armour: "medium", calls: ["repair-resupply", "barrage", "flak-turret", "mech-drop"] } },
];
const THINK = 20; // ticks between decisions per bot (staggered)
class FlBots {
    /** One record per AI pilot: roster entry, pilot id, current goal. */
    bots = [];
    /** pilot ids of AI pilots (sim checks: idle rule, ferry lane). */
    ids = new Set();
    spawned = false;
    stats = { orders: 0, calls: 0, callsByKind: {}, boards: 0, retreats: 0, pings: 0, deaths: 0 };
    constructor(opts = {}) {
        this.opts = opts;
        this.teamSize = { 0: opts.allies ?? 3, 1: opts.enemies ?? 4 };
    }
    /** 4d: the Hegemony's edge by difficulty (aiPilots.byDifficulty: easy 3 v 3 + you, normal 3 + you v 4, hard 2 + you v 4). */
    sizeFor(sim) {
        const dk = sim.match?.difficulty?.[1] ?? "normal", by = this.opts.byDifficulty?.[dk];
        if (by)
            this.teamSize = { 0: by.allies ?? this.teamSize[0], 1: by.enemies ?? this.teamSize[1] };
    }
    rosterFor() {
        const n = { 0: 0, 1: 0 };
        return ROSTER.filter((r) => n[r.team]++ < this.teamSize[r.team]);
    }
    /** Spawns the AI pilots at their Command Cores (first tick the cores exist). */
    spawn(sim) {
        this.spawned = true;
        this.sizeFor(sim);
        const want = Math.max(0, this.teamSize[0] - this.guests(sim));
        let mine = 0;
        for (const r of this.rosterFor())
            if (r.team !== 0 || mine++ < want) // guests already in take their places from the start
                this.spawnBot(sim, r);
    }
    /** One AI pilot at its Command Core, kitted, queued for the Mule to its lane. */
    nextI = 0;
    spawnBot(sim, r) {
        const F = sim.fkit, cs = coreSlot(sim, r.team);
        if (cs < 0)
            return false;
        const k = this.nextI++, a = k * 1.3;
        const at = this.startSpot(sim, r, cs);
        const id = sim.spawnPilot(r.team, at.px, at.pz, { player: r.player });
        F.setKit(sim, r.player, { ...F.kitOf(r.player), ...r.kit });
        const cst = sim.callState?.();
        if (cst && sim.callRules) // the call-down loadout (setKit applies it to pilots it finds; make sure)
            cst.caller(id).loadout = r.kit.calls.map((c) => sim.callRules.ids.indexOf(c)).filter((i) => i >= 0 && !sim.callRules.fixed.includes(i));
        F.laneOf.set(id, r.lane);
        this.ids.add(id);
        // it starts in a Dart scout like the player (parked beside it, then boarded); the Mule ride only if that fails
        let inDart = false;
        try {
            const p = sim.pilots.get(id), ps = p ? sim.idToSlot.get(p.entity) : undefined;
            if (ps !== undefined) {
                const dx = at.x, dz = at.z;
                const dart = sim.spawnUnit("dart", r.team, dx, dz, { crew: "none" });
                const ds = sim.idToSlot.get(dart);
                if (ds !== undefined) {
                    const er = sim.enter(id, dart, sim.d.tDriverSeat[sim.etype[ds]], r.team);
                    inDart = !!er.ok;
                    if (!inDart)
                        sim.destroy(dart);
                }
            }
        }
        catch { /* no Dart in this data: walk / ride */ }
        if (!inDart)
            F.pending.add(id); // the first ride out, as after a respawn (the Mule to its lane)
        this.stats.darts = (this.stats.darts ?? 0) + (inDart ? 1 : 0);
        this.bots.push({ r, pid: id, i: k, goal: "", goalAt: -1e9, mode: "lane", modeUntil: 0, ping: null, lastCall: -1e9, body: 0, vehicle: 0, state: "" });
        return true;
    }
    /**
     * Where an AI pilot starts: ~60 m out from its Command Core towards its own lane, side by side with any team-mate on
     * the same lane (24 m apart), nudged to the nearest clear ground. {x, z}: the Dart; {px, pz}: the pilot beside it.
     */
    startSpot(sim, r, cs) {
        const wps = sim.lanes.path(r.team, r.lane), cx = sim.x[cs], cz = sim.z[cs];
        let tx = wps[Math.min(1, wps.length - 1)][0] - cx, tz = wps[Math.min(1, wps.length - 1)][1] - cz;
        const l = Math.hypot(tx, tz) || 1;
        tx /= l;
        tz /= l;
        const nx = -tz, nz = tx; // sideways
        const same = this.bots.filter((b) => b.r.team === r.team && b.r.lane === r.lane).length;
        const side = same === 0 ? 0 : (same % 2 ? 1 : -1) * 24 * Math.ceil(same / 2);
        const dt = sim.d.typeIds.indexOf("dart"), rad = (dt >= 0 ? sim.d.tRadius[dt] : 3) + 2.5;
        let best = null;
        for (let ring = 0; ring < 10 && !best; ring++)
            for (let k = 0; k < 8 && !best; k++) {
                const ang = (k / 8) * Math.PI * 2, rr = ring * 7;
                const x = sim.clampMap(cx + tx * 60 + nx * side + Math.cos(ang) * rr), z = sim.clampMap(cz + tz * 60 + nz * side + Math.sin(ang) * rr);
                if (sim.spotFree(x, z, rad, -1) && sim.spotFree(x + nx * 4.5, z + nz * 4.5, 1.5, -1))
                    best = { x, z, px: sim.clampMap(x + nx * 4.5), pz: sim.clampMap(z + nz * 4.5) };
            }
        if (!best) {
            const x = sim.clampMap(cx + tx * 60 + nx * side), z = sim.clampMap(cz + tz * 60 + nz * side);
            best = { x, z, px: sim.clampMap(x + nx * 4.5), pz: sim.clampMap(z + nz * 4.5) };
        }
        return best;
    }
    /** Takes AI pilot b out of the match the way a leaving player goes (its body or seat is cleared; a vehicle it drove
     *  stays, crewless). */
    disconnect(sim, b) {
        const F = sim.fkit;
        sim.removePlayer(b.pid, coop_ts_1.LEAVE_REMOVE);
        sim.pilots.delete(b.pid); // whatever state it was in (dead, riding: coopLeave keeps some)
        F.pending.delete(b.pid);
        F.laneOf.delete(b.pid);
        F.dropped.delete(b.pid);
        this.ids.delete(b.pid);
        this.bots.splice(this.bots.indexOf(b), 1);
    }
    /** Live players past the host (player 0) on the squad's team: each one takes an AI teammate's place. */
    guests(sim) {
        let n = 0;
        for (const p of sim.pilots.values())
            if (p.team === 0 && p.player >= 1 && !isBotPlayer(p.player))
                n++;
        return n;
    }
    /** Once a second: one AI teammate out per guest (the last of the roster first), back in when a guest leaves. */
    seats(sim) {
        const want = Math.max(0, this.teamSize[0] - this.guests(sim)), mine = this.bots.filter((b) => b.r.team === 0);
        if (mine.length > want) {
            const b = mine[mine.length - 1];
            this.disconnect(sim, b);
            this.stats.left = (this.stats.left ?? 0) + 1;
        }
        else if (mine.length < want) {
            const r = this.rosterFor().find((q) => q.team === 0 && !mine.some((b) => b.r === q));
            if (r && this.spawnBot(sim, r))
                this.stats.joined = (this.stats.joined ?? 0) + 1;
        }
    }
    step(sim) {
        if (!sim.lanes)
            return;
        if (!this.spawned) {
            if (sim.tick >= 1)
                this.spawn(sim);
            return;
        }
        if (sim.tick % THINK === 0)
            this.seats(sim);
        for (const b of [...this.bots])
            if ((sim.tick + b.i * 3) % THINK === 0)
                this.think(sim, b);
    }
    think(sim, b) {
        const p = sim.pilots.get(b.pid);
        if (!p)
            return;
        const team = p.team;
        if (p.state === 2) { // dead: respawns at the Core and rides the Mule to its lane (fkit.ferryStep)
            if (b.state !== "dead")
                this.stats.deaths++;
            b.state = "dead";
            b.goal = "";
            b.mode = "lane";
            b.wpReset = true;
            return;
        }
        if (p.state === 0) { // seated: a Mule passenger waits; a driver drives its vehicle down the lane
            const vs = sim.idToSlot.get(p.vehicle);
            if (vs === undefined)
                return;
            const vt = sim.etype[vs];
            if (p.seat !== sim.d.tDriverSeat[vt]) {
                b.state = "riding";
                return;
            }
            b.state = "driving";
            if (sim.ctlOn[vs])
                sim.queuePilotControl(sim.tick + 1, b.pid, null, team);
            const low = sim.hp[vs] < sim.d.tHp[vt] * 0.2;
            if (low) { // a wreck in waiting: bail out before it blows
                sim.exit(b.pid, team);
                return;
            }
            // its dropped tank / mech has landed close by: out of the light vehicle and over to it (the foot branch boards)
            const F = sim.fkit, did = F.dropped.get(b.pid), dsl = did !== undefined && did !== sim.eid[vs] ? sim.idToSlot.get(did) : undefined;
            if (dsl !== undefined && sim.alive[dsl] && sim.d.tAir[sim.etype[dsl]] === 0 && sim.hp[dsl] > sim.d.tHp[sim.etype[dsl]] * 0.3
                && sim.drv[dsl] === 0 && Math.hypot(sim.x[dsl] - sim.x[vs], sim.z[dsl] - sim.z[vs]) < 60 && sim.d.tHp[sim.etype[dsl]] > sim.d.tHp[vt]) {
                if (sim.exit(b.pid, team).ok) {
                    b.goal = "";
                    this.stats.swaps = (this.stats.swaps ?? 0) + 1;
                    return;
                }
            }
            const rs = this.rescueFor(sim, b, vs, team);
            if (rs && sim.d.tAir[vt] === 0) { // a downed team-mate: drive over, then out to revive (the foot branch helps)
                const d = Math.hypot(sim.x[rs] - sim.x[vs], sim.z[rs] - sim.z[vs]);
                if (d < 35 && sim.exit(b.pid, team).ok) {
                    b.goal = "";
                    return;
                }
                this.order(sim, b, vs, team, `rescue:${sim.eid[rs]}`, { type: "move", x: sim.x[rs], z: sim.z[rs] });
                return;
            }
            this.tryCalls(sim, b, sim.pilots.get(b.pid), vs, team); // call-downs from the seat too (it starts in a Dart)
            if (!this.followPing(sim, b, vs, team))
                this.laneOrder(sim, b, vs, team, "v");
            return;
        }
        if (p.state !== 1) {
            b.state = p.state === 3 ? "downed" : "other";
            return;
        }
        const s = sim.idToSlot.get(p.entity);
        if (s === undefined)
            return;
        b.state = "foot";
        if (sim.eid[s] !== b.body) { // a new body: hand it to the unit AI
            b.body = sim.eid[s];
            b.retreated = false;
            b.goal = "";
            b.mode = "lane";
            b.wpReset = true;
        }
        if (sim.ctlOn[s])
            sim.queuePilotControl(sim.tick + 1, b.pid, null, team);
        if (isReviving(sim, sim.eid[s])) { // the revive (s15 aiReviveStep) walks it to the downed pilot and holds: no orders now
            b.goal = "";
            b.state = "reviving";
            this.stats.revives = (this.stats.revives ?? 0) + 1;
            return;
        }
        const rs = this.rescueFor(sim, b, s, team);
        if (rs) {
            this.order(sim, b, s, team, `rescue:${sim.eid[rs]}`, { type: "move", x: sim.x[rs], z: sim.z[rs] });
            b.state = "rescue";
            return;
        }
        const hpMax = sim.pilotMaxHp(p) || sim.d.tHp[sim.etype[s]] || 1, hpF = sim.hp[s] / hpMax;
        // a vehicle it dropped: go and climb in. Else (designer 22 Nov) an empty vehicle near by: man it rather than run
        // back to base or slog down the lane on foot (not a player-tagged one, nor one another AI pilot is going for)
        const F = sim.fkit, own = F.dropped.get(b.pid), os = own !== undefined ? sim.idToSlot.get(own) : undefined;
        const ownOk = os !== undefined && sim.alive[os] && sim.hp[os] > sim.d.tHp[sim.etype[os]] * 0.3 && sim.team[os] === team && sim.d.tAir[sim.etype[os]] === 0 && (sim.nOcc[os] === 0 || sim.drv[os] === 0);
        let vid = ownOk ? own : undefined, vs = ownOk ? os : undefined;
        if (!ownOk) {
            const gs = b.grab !== undefined ? sim.idToSlot.get(b.grab) : undefined;
            if (gs !== undefined && F.freeForAi(sim, gs, team, b.pid, true) && sim.gap(s, gs) <= F.R.emptyRadius * 1.5) {
                vs = gs;
                vid = b.grab;
            }
            else {
                const o = F.emptyFor(sim, s, team, b.pid, true);
                b.grab = o >= 0 ? sim.eid[o] : undefined;
                if (o >= 0) {
                    vs = o;
                    vid = b.grab;
                    this.stats.grabs = (this.stats.grabs ?? 0) + 1;
                }
            }
        }
        if (vs !== undefined && sim.alive[vs] && sim.hp[vs] > sim.d.tHp[sim.etype[vs]] * 0.3 && sim.team[vs] === team && sim.d.tAir[sim.etype[vs]] === 0) { // not one about to blow (it bailed out of it)
            const dx = sim.x[s] - sim.x[vs], dz = sim.z[s] - sim.z[vs], d = Math.hypot(dx, dz) || 1;
            if (!sim.inReach(s, vs) && d < sim.d.tRadius[sim.etype[vs]] + 8) { // the last few metres (a move order counts as arrived short of the hull)
                const rr = sim.d.tRadius[sim.etype[vs]] + 0.8;
                sim.x[s] = sim.x[vs] + dx / d * rr;
                sim.z[s] = sim.z[vs] + dz / d * rr;
            }
            if (sim.inReach(s, vs)) {
                const r = sim.enter(b.pid, vid, sim.d.tDriverSeat[sim.etype[vs]], team);
                if (r.ok) {
                    this.stats.boards++;
                    b.grab = undefined;
                    F.claims.delete(vid);
                    b.goal = "";
                    b.wpReset = true;
                    return;
                }
            }
            if (d < 400) { // walk up to the hull on this side (an order to its centre stops short of the reach)
                const rr = sim.d.tRadius[sim.etype[vs]] + 1.2;
                this.order(sim, b, s, team, `board:${vid}:${d < 20 ? "near" : "far"}`, { type: "move", x: sim.x[vs] + dx / d * rr, z: sim.z[vs] + dz / d * rr });
                return;
            }
        }
        // a medic heals and revives the squad's pilots near it (the medic gun's rate), and goes to a downed one close by
        if (b.r.kit.role === "medic" && this.medic(sim, b, s, team))
            return;
        // retreat when badly hurt (once per life: nothing heals it at the base, so it would only come back hurt)
        if (b.mode !== "retreat" && hpF < 0.3 && !b.retreated) {
            b.retreated = true;
            b.mode = "retreat";
            b.modeUntil = sim.tick + 25 * sim.d.constants.tickRate;
            this.stats.retreats++;
        }
        if (b.mode === "retreat") {
            if (hpF > 0.7 || sim.tick > b.modeUntil) {
                b.mode = "lane";
                b.wpReset = true;
            }
            else {
                const cs = coreSlot(sim, team);
                if (cs >= 0) {
                    this.order(sim, b, s, team, "retreat", { type: "move", x: sim.x[cs] + 20, z: sim.z[cs] + 20 });
                    return;
                }
            }
        }
        this.tryCalls(sim, b, p, s, team);
        if (this.followPing(sim, b, s, team))
            return;
        this.laneOrder(sim, b, s, team, "f");
    }
    /** The body slot of a downed team-mate (the player too) within 150 m that this bot is the nearest free helper for
     *  (one rescuer per downed pilot), or undefined. */
    rescueFor(sim, b, s, team) {
        let best, bd = 150;
        for (const p of sim.pilots.values()) {
            if (p.team !== team || p.state !== 3 || p.id === b.pid)
                continue;
            const ds = sim.idToSlot.get(p.entity);
            if (ds === undefined)
                continue;
            const d = Math.hypot(sim.x[ds] - sim.x[s], sim.z[ds] - sim.z[s]);
            if (d >= bd)
                continue;
            // nearest of the team's bots that are up (on foot or seated)
            let mine = true;
            for (const o of this.bots) {
                if (o === b || o.r.team !== team)
                    continue;
                const os = placeOf(sim, o.pid);
                if (os !== undefined && Math.hypot(sim.x[ds] - sim.x[os], sim.z[ds] - sim.z[os]) < d - 0.01) {
                    mine = false;
                    break;
                }
            }
            if (mine) {
                bd = d;
                best = ds;
            }
        }
        return best;
    }
    /** Medic: heal shots at hurt or downed friendly pilots within 30 m (shotsPerSecond per think); a downed one within 90 m
     *  is walked to first. True if it is busy with that (no lane order this think). */
    medic(sim, b, s, team) {
        const F = sim.fkit, W = sim.d.weaponIds.indexOf("medic-gun");
        if (W < 0 || !F.R.heal.get(W))
            return false;
        let heal = -1, hd = Infinity, downed = -1, dd = Infinity;
        for (const p of sim.pilots.values()) {
            if (p.team !== team || p.id === b.pid || (p.state !== 1 && p.state !== 3))
                continue;
            const o = sim.idToSlot.get(p.entity);
            if (o === undefined || !sim.alive[o])
                continue;
            const d = Math.hypot(sim.x[o] - sim.x[s], sim.z[o] - sim.z[s]);
            if (p.state === 3 && d < 90 && d < dd) {
                dd = d;
                downed = o;
            }
            const hurt = p.state === 3 || sim.hp[o] < sim.bodyMaxHp(o) * 0.85;
            if (hurt && d < 30 && d < hd) {
                hd = d;
                heal = o;
            }
        }
        if (heal >= 0) {
            const sx = sim.x[s], sy = sim.y[s] + 1.4, sz = sim.z[s], tx = sim.x[heal] - sx, ty = sim.y[heal] + sim.d.tRadius[sim.etype[heal]] - sy, tz = sim.z[heal] - sz, l = Math.hypot(tx, ty, tz) || 1;
            const n = Math.max(1, Math.round(sim.d.wSps ? sim.d.wSps[W] : 4));
            for (let k = 0; k < n; k++)
                F.fireHeal(sim, s, W, sx, sy, sz, tx / l, ty / l, tz / l);
            this.stats.heals = (this.stats.heals ?? 0) + 1;
        }
        if (downed >= 0 && dd > 12) {
            this.order(sim, b, s, team, `revive:${sim.eid[downed]}`, { type: "move", x: sim.x[downed], z: sim.z[downed] });
            return true;
        }
        return heal >= 0 && heal === downed; // stay on a revive
    }
    /** Team 0: answer a ping (see pingFor) with slot s (body or vehicle). True if it did. */
    followPing(sim, b, s, team) {
        if (team !== 0)
            return false;
        const pg = this.pingFor(sim, b, s);
        if (!pg) {
            if (b.ping)
                b.wpReset = true;
            b.ping = null;
            return false;
        }
        if (b.ping !== pg) {
            b.ping = pg;
            this.stats.pings++;
        }
        let x = pg.x, z = pg.z;
        if (pg.kind === "help") { // to the pilot who asked
            const ae = placeOf(sim, pg.who);
            if (ae !== undefined) {
                x = sim.x[ae];
                z = sim.z[ae];
            }
        }
        const d = Math.hypot(x - sim.x[s], z - sim.z[s]);
        if (d > 25 || pg.kind === "help")
            this.order(sim, b, s, team, `ping:${pg.at}:${Math.round(x / 20)}:${Math.round(z / 20)}`, { type: "attackMove", waypoints: [[x, z]] });
        return true; // there: hold and fight (the unit AI picks targets)
    }
    /** The newest ping this bot answers: it is the nearest of the live, free bots to that ping (one bot per ping; help: two). */
    pingFor(sim, b, s) {
        const list = sim.fkit.pingsOf(sim, 0);
        if (!list.length)
            return null;
        const tr = sim.d.constants.tickRate;
        for (let k = list.length - 1; k >= 0; k--) {
            const pg = list[k];
            if (sim.tick - pg.at > 25 * tr)
                continue;
            const ranked = this.bots.filter((o) => o.r.team === 0).map((o) => { const os = placeOf(sim, o.pid); return { o, d: os === undefined ? Infinity : Math.hypot(sim.x[os] - pg.x, sim.z[os] - pg.z) }; }).filter((q) => q.d < Infinity).sort((a, c) => a.d - c.d || a.o.i - c.o.i);
            const n = pg.kind === "help" ? 2 : 1;
            if (ranked.slice(0, n).some((q) => q.o === b))
                return pg;
        }
        return null;
    }
    /** Attack-move down the bot's lane from its next waypoint (team 1 walks it backwards). Progress only goes forward:
     *  wp is reset to the nearest waypoint ahead after a respawn, a ping or a retreat. */
    laneOrder(sim, b, s, team, tag) {
        const L = sim.lanes, wps = L.path(team, b.r.lane), x = sim.x[s], z = sim.z[s];
        if (b.wp === undefined || b.wpReset) {
            let k = 0, best = Infinity;
            for (let j = 0; j < wps.length; j++) {
                const d = Math.hypot(wps[j][0] - x, wps[j][1] - z);
                if (d < best) {
                    best = d;
                    k = j;
                }
            }
            // ahead: the next one if the nearest is behind (closer to the own end than we are)
            if (k + 1 < wps.length && Math.hypot(wps[k + 1][0] - x, wps[k + 1][1] - z) < Math.hypot(wps[k + 1][0] - wps[k][0], wps[k + 1][1] - wps[k][1]))
                k++;
            b.wp = k;
            b.wpReset = false;
        }
        while (b.wp < wps.length - 1 && Math.hypot(wps[b.wp][0] - x, wps[b.wp][1] - z) < 45)
            b.wp++;
        const route = L.route(sim, team, wps.slice(b.wp)), end = route[route.length - 1];
        this.order(sim, b, s, team, `${tag}lane:${b.r.lane}:${Math.round(end[0])}:${Math.round(end[1])}`, { type: "attackMove", waypoints: route });
    }
    /** Queues order o for slot s unless the same goal is running (re-issued when the unit went idle, at most every 4 s). */
    order(sim, b, s, team, goal, o) {
        const idle = sim.ordType[s] === 0, tr = sim.d.constants.tickRate;
        if (goal === b.goal && !(idle && sim.tick - b.goalAt > 4 * tr))
            return;
        b.goal = goal;
        b.goalAt = sim.tick;
        const ow = o.waypoints ? { ...o, waypoints: o.waypoints.map(([x, z]) => [sim.clampMap(x), sim.clampMap(z)]) } : o.x !== undefined ? { ...o, x: sim.clampMap(o.x), z: sim.clampMap(o.z) } : o;
        sim.queueOrder(sim.tick + 1, [sim.eid[s]], ow, team);
        this.stats.orders++;
    }
    /** Call-downs, at most one every 6 s per bot. */
    tryCalls(sim, b, p, s, team) {
        const tr = sim.d.constants.tickRate;
        if (!sim.callRules || sim.tick - b.lastCall < 6 * tr)
            return;
        const R = sim.callRules, x = sim.x[s], z = sim.z[s], range = (R.throwRange ?? 40) - 3;
        const ready = (id) => { const ci = R.ids.indexOf(id); return ci >= 0 && sim.callRefusal(b.pid, ci, team) === null ? ci : -1; };
        const call = (id, cx, cz) => {
            sim.queueCall(sim.tick + 1, b.pid, id, sim.clampMap(cx), sim.clampMap(cz), team);
            b.lastCall = sim.tick;
            this.stats.calls++;
            this.stats.callsByKind[id] = (this.stats.callsByKind[id] ?? 0) + 1;
        };
        const kitCalls = b.r.kit.calls;
        // a strike on an enemy group 20 m - throw range away with no friend within 22 m of it
        for (const id of ["precision-strike", "barrage"]) {
            if (!kitCalls.includes(id) || ready(id) < 0)
                continue;
            const tgt = enemyGroup(sim, team, x, z, 20, range);
            if (tgt) {
                call(id, tgt[0], tgt[1]);
                return;
            }
        }
        // designer 21 Nov: a Repair & Resupply station when a weapon is under a third
        if (kitCalls.includes("repair-resupply") && ready("repair-resupply") >= 0 && lowAmmo(sim, s)) {
            call("repair-resupply", x + 6, z + 4);
            return;
        }
        const foes = countFoes(sim, team, x, z, 140);
        // a Flak turret when enemy aircraft are about; a Shield barrier when pressed by several foes
        if (kitCalls.includes("flak-turret") && ready("flak-turret") >= 0) {
            let air = false;
            for (let o = 0; o < sim.hi && !air; o++)
                if (sim.alive[o] && sim.hp[o] > 0 && sim.team[o] !== team && sim.team[o] < 4 && sim.d.tAir[sim.etype[o]] && Math.hypot(sim.x[o] - x, sim.z[o] - z) < 420)
                    air = true;
            if (air) {
                call("flak-turret", x - 6, z + 6);
                return;
            }
        }
        if (kitCalls.includes("shield-bubble") && ready("shield-bubble") >= 0 && foes >= 3) {
            call("shield-bubble", x, z);
            return;
        }
        // a ground vehicle (never more than one alive: callRefusal)
        const early = sim.tick < (90 + b.i * 25) * tr; // pacing: no armour in the opening minute and a half, then staggered
        for (const id of ["tank-drop", "mech-drop"])
            if (!early && sim.d.raw.constants.frontline?.aiVehicleDrops !== false && kitCalls.includes(id) && ready(id) >= 0 && b.mode !== "retreat") { // (designer 22 Nov: vehicle drops are player only)
                const a = (b.i * 1.7 + sim.tick * 0.001) % (Math.PI * 2);
                call(id, x + Math.cos(a) * 16, z + Math.sin(a) * 16);
                return;
            }
        if (kitCalls.includes("sentry-gun") && ready("sentry-gun") >= 0 && foes >= 2) {
            call("sentry-gun", x + 8, z - 6);
            return;
        }
        if (kitCalls.includes("reinforcements") && ready("reinforcements") >= 0 && foes >= 4) {
            call("reinforcements", x + 10, z + 10);
            return;
        }
    }
    /** Test aid: AI pilot `name` out of any vehicle and down (as at zero health). */
    testDown(sim, name, x, z) {
        const b = this.bots.find((q) => q.r.name === name), p = b ? sim.pilots.get(b.pid) : undefined;
        if (!p)
            return false;
        if (p.state === 0)
            sim.exit(b.pid, p.team);
        const s = sim.idToSlot.get(p.entity);
        if (s === undefined || p.state !== 1)
            return false;
        if (x !== undefined && isFinite(x)) {
            sim.x[s] = x;
            sim.z[s] = z;
        }
        sim.hp[s] = 0;
        return (0, pilotkit_ts_1.kitTryDown)(sim, s, false);
    }
    /** For the map panel and tests: name, team, role, what it is doing. */
    status(sim) {
        return this.bots.map((b) => { const p = sim.pilots.get(b.pid), ps = placeOf(sim, b.pid) ?? (p && p.state === 3 ? sim.idToSlot.get(p.entity) : undefined); return { id: b.pid, name: b.r.name, team: b.r.team, role: b.r.kit.role, lane: b.r.lane, state: p && p.state === 3 ? "downed" : p && p.state === 2 ? "dead" : b.state, mode: b.ping ? `ping:${b.ping.kind}` : b.mode, deaths: p ? p.deaths : 0, down: p && p.state === 3 ? Math.ceil((0, pilotkit_ts_1.kitDownedLeft)(sim, b.pid) / sim.d.constants.tickRate) : 0, rev: p && p.state === 3 ? Math.round((0, pilotkit_ts_1.kitReviveProgress)(sim, b.pid) * 100) : 0, eid: ps !== undefined ? sim.eid[ps] : 0, hp: ps !== undefined && p && p.state === 1 ? Math.round(sim.hp[ps] / (sim.pilotMaxHp(p) || 1) * 100) : -1 }; });
    }
}
exports.FlBots = FlBots;
/** Is entity eid an assigned AI reviver (s15 helper map) right now? */
function isReviving(sim, eid) {
    const H = sim.s15 ? sim.s15.helper : null;
    if (!H || !H.size)
        return false;
    for (const r of H.values())
        if (r && r[0] === eid)
            return true;
    return false;
}
/** A downed pilot of `team` (not `except`) within r metres of (x, z)? */
function downedNear(sim, team, x, z, r, except) {
    for (const p of sim.pilots.values()) {
        if (p.team !== team || p.state !== 3 || p.id === except)
            continue;
        const s = sim.idToSlot.get(p.entity);
        if (s !== undefined && Math.hypot(sim.x[s] - x, sim.z[s] - z) < r)
            return true;
    }
    return false;
}
/** The slot pilot pid is in: its body on foot, its vehicle when seated (undefined: dead / unknown). */
function placeOf(sim, pid) {
    const p = sim.pilots.get(pid);
    if (!p || (p.state !== 0 && p.state !== 1))
        return undefined;
    return sim.idToSlot.get(p.state === 1 ? p.entity : p.vehicle);
}
function coreSlot(sim, team) {
    const tc = sim.coreTypes();
    let best = -1;
    for (let s = 0; s < sim.hi; s++)
        if (sim.alive[s] && sim.team[s] === team && tc[sim.etype[s]] && sim.hp[s] > 0 && (best < 0 || sim.eid[s] < sim.eid[best]))
            best = s;
    return best;
}
function countFoes(sim, team, x, z, r) {
    let n = 0;
    for (let o = 0; o < sim.hi; o++)
        if (sim.alive[o] && sim.hp[o] > 0 && sim.team[o] !== team && sim.team[o] < 4 && !sim.d.tStructure[sim.etype[o]] && (sim.x[o] - x) ** 2 + (sim.z[o] - z) ** 2 < r * r)
            n++;
    return n;
}
/** An enemy group (3+ units within 15 m, or a structure) between rMin and rMax of (x, z) with no own unit within 22 m. */
function enemyGroup(sim, team, x, z, rMin, rMax) {
    let best = null, bestN = 0;
    for (let o = 0; o < sim.hi; o++) {
        if (!sim.alive[o] || sim.hp[o] <= 0 || sim.team[o] === team || sim.team[o] >= 4)
            continue;
        const d = Math.hypot(sim.x[o] - x, sim.z[o] - z);
        if (d < rMin || d > rMax)
            continue;
        let n = sim.d.tStructure[sim.etype[o]] ? 3 : 0, mine = 0;
        for (let q = 0; q < sim.hi; q++) {
            if (!sim.alive[q] || sim.hp[q] <= 0)
                continue;
            const dd = (sim.x[q] - sim.x[o]) ** 2 + (sim.z[q] - sim.z[o]) ** 2;
            if (sim.team[q] === team && dd < 22 * 22)
                mine++;
            else if (sim.team[q] !== team && sim.team[q] < 4 && dd < 15 * 15)
                n++;
        }
        if (mine === 0 && n >= 3 && n > bestN) {
            bestN = n;
            best = [sim.x[o], sim.z[o]];
        }
    }
    return best;
}
function lowAmmo(sim, s) {
    const S = sim.s15, am = S ? S.ammo.get(sim.eid[s]) : undefined, F = sim.fkit;
    if (!am)
        return false;
    for (let m = 0; m < am.length; m++) {
        if (am[m] < 0)
            continue;
        const f = F.full(sim.d, sim.mWeapon[s * 12 + m]);
        if (f > 0 && am[m] < f / 3)
            return true;
    }
    return false;
}
