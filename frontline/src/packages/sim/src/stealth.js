"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stealth = exports.ACT_PULSE = exports.ACT_DECOY = exports.ACT_JAMMER = void 0;
exports.compileStealthRules = compileStealthRules;
exports.stealthSigMul = stealthSigMul;
exports.jammedFromRadar = jammedFromRadar;
exports.jammerCovers = jammerCovers;
exports.orbitalJammed = orbitalJammed;
exports.setJammer = setJammer;
exports.dropDecoy = dropDecoy;
exports.scoutPulse = scoutPulse;
exports.stealthStep = stealthStep;
exports.stealthSearch = stealthSearch;
const events_ts_1 = require("./events.js");
const data_ts_1 = require("./data.js");
exports.ACT_JAMMER = 42, exports.ACT_DECOY = 43, exports.ACT_PULSE = 44;
const AC_BIKE = 1;
/** Decoy per-team sight slots (>= Sim.nTeams). */
const MAXT = 8;
function compileStealthRules(sim) {
    const C = sim.data.constants, st = C.stealth ?? {}, tr = C.tickRate, d = sim.d;
    const relay = sim.data.buildings.findIndex((b) => b.mods?.jammer);
    const rb = relay >= 0 ? sim.data.buildings[relay] : undefined;
    const fake = d.typeIds.indexOf(st.decoyBeacon?.fakeUnit ?? "");
    const n = (v, dflt) => (typeof v === "number" && Number.isFinite(v) ? v : dflt);
    return {
        boostMul: n(st.boostMultiplier, 1), cloakMul: n(st.cloak?.signatureMultiplier, 1), cloakTicks: Math.round(n(st.cloak?.maxSeconds, 0) * tr),
        cloakRecharge: Math.round(n(st.cloak?.rechargeSeconds, 0) * tr), cloakEnergy: n(st.cloak?.gasPerSecond, 0) / tr,
        relayType: rb ? d.typeIds.indexOf(rb.id) : -1, jamRadius: rb ? n(rb.mods.jammer.radarHideRadius, 0) : 0,
        decoyTicks: Math.round(n(st.decoyBeacon?.seconds, 0) * tr), decoyPer: n(st.decoyBeacon?.perResupply, 0), decoyType: fake,
        decoySig: fake >= 0 ? d.tSignature[fake] : 0, decoyRange: n(st.standardSensorRange, 200),
        pingRadius: n(st.scoutPing?.radius, 0), pingTicks: Math.round(n(st.scoutPing?.seconds, 0) * tr), pingCooldown: Math.round(n(st.scoutPing?.cooldownSeconds, 0) * tr),
        scoutType: d.typeIds.indexOf(st.scoutPing?.unit ?? "dart"),
        searchRadius: n(st.search?.radiusMetres, 0), searchMax: n(st.search?.maxPerTeam, 0), searchTicks: Math.round(n(st.search?.memorySeconds, 0) * tr),
        lostTicks: d.constants.lostAfterTicks, di: d.constants.detectionIntervalTicks,
    };
}
/** Stealth state (saved and hashed; created on first use). */
class Stealth {
    jammers = []; // relay entity ids with the jammer on, ascending
    decoys = [];
    nextDecoy = 1;
    decoyUsed = new Map(); // pilot -> decoys used this life
    pingReady = new Map(); // pilot -> tick the next pulse is allowed
    bikeCloak = new Map(); // pilot -> [until (0 off), ready tick, start tick]
    seen = new Map(); // key id * 8 + AI team -> [x, z, tick last seen]
    searching = new Map(); // unit id -> tick its search order was given (AI search)
    hash(word, num) {
        word(0x57e17);
        word(this.nextDecoy);
        word(this.jammers.length);
        for (const j of this.jammers)
            word(j);
        word(this.decoys.length);
        for (const d of this.decoys) {
            word(d.id);
            word(d.team);
            word(d.pilot);
            num(d.x);
            num(d.z);
            word(d.until);
            for (let t = 0; t < MAXT; t++)
                word(d.seen[t]);
        }
        for (const m of [this.decoyUsed, this.pingReady, this.searching]) {
            word(m.size);
            for (const [k, v] of m) {
                word(k);
                word(v);
            }
        }
        word(this.bikeCloak.size);
        for (const [k, v] of this.bikeCloak) {
            word(k);
            word(v[0]);
            word(v[1]);
            word(v[2]);
        }
        word(this.seen.size);
        for (const [k, v] of this.seen) {
            word(k);
            num(v[0]);
            num(v[1]);
            word(v[2]);
        }
    }
    exportTo(w) {
        w.i32(this.nextDecoy);
        w.i32(this.jammers.length);
        for (const j of this.jammers)
            w.i32(j);
        w.i32(this.decoys.length);
        for (const d of this.decoys) {
            w.i32(d.id);
            w.i32(d.team);
            w.i32(d.pilot);
            w.f64(d.x);
            w.f64(d.z);
            w.i32(d.until);
            for (let t = 0; t < MAXT; t++)
                w.i32(d.seen[t]);
        }
        for (const m of [this.decoyUsed, this.pingReady, this.searching]) {
            w.i32(m.size);
            for (const [k, v] of m) {
                w.i32(k);
                w.i32(v);
            }
        }
        w.i32(this.bikeCloak.size);
        for (const [k, v] of this.bikeCloak) {
            w.i32(k);
            w.i32(v[0]);
            w.i32(v[1]);
            w.i32(v[2]);
        }
        w.i32(this.seen.size);
        for (const [k, v] of this.seen) {
            w.i32(k);
            w.f64(v[0]);
            w.f64(v[1]);
            w.i32(v[2]);
        }
    }
    restoreFrom(r) {
        this.nextDecoy = r.i32();
        this.jammers = [];
        for (let i = 0, n = r.i32(); i < n; i++)
            this.jammers.push(r.i32());
        this.decoys = [];
        for (let i = 0, n = r.i32(); i < n; i++) {
            const d = { id: r.i32(), team: r.i32(), pilot: r.i32(), x: r.f64(), z: r.f64(), until: r.i32(), seen: [] };
            for (let t = 0; t < MAXT; t++)
                d.seen.push(r.i32());
            this.decoys.push(d);
        }
        for (const m of [this.decoyUsed, this.pingReady, this.searching]) {
            m.clear();
            for (let i = 0, n = r.i32(); i < n; i++) {
                const k = r.i32();
                m.set(k, r.i32());
            }
        }
        this.bikeCloak.clear();
        for (let i = 0, n = r.i32(); i < n; i++) {
            const k = r.i32();
            this.bikeCloak.set(k, [r.i32(), r.i32(), r.i32()]);
        }
        this.seen.clear();
        for (let i = 0, n = r.i32(); i < n; i++) {
            const k = r.i32();
            this.seen.set(k, [r.f64(), r.f64(), r.i32()]);
        }
    }
}
exports.Stealth = Stealth;
/** Signature multiplier hook (Sim.sweepFrom) for slot o beyond the pilot's own crouch / cloak: jetpack burn, bike cloak. */
function stealthSigMul(sim, o) {
    const R = sim.stlRules;
    let m = 1;
    if (sim.slotPilot[o] !== 0) {
        if (sim.airborne[o] === 1 && sim.ctlOn[o] === 1 && (sim.ctlFlags[o] & 8) !== 0 && (sim.jetFuel[o] > 0 || sim.energy[o] > 0))
            m *= R.boostMul;
    } // PC_JET
    else if (sim.stl && sim.stl.bikeCloak.size && sim.d.tArmour[sim.etype[o]] === AC_BIKE) {
        const pid = sim.occ[o * data_ts_1.MAX_SEATS + sim.d.tDriverSeat[sim.etype[o]]];
        const c = pid ? sim.stl.bikeCloak.get(pid) : undefined;
        if (c && c[0] > 0)
            m *= R.cloakMul;
    }
    return m;
}
/** Is slot o (an entity of some team) inside a radius of its own team's active jammer? (hidden from enemy radar) */
function jammedFromRadar(sim, o) {
    const S = sim.stl;
    if (!S || S.jammers.length === 0)
        return false;
    return jammerCovers(sim, sim.team[o], sim.x[o], sim.z[o]);
}
/** A live jammer of `team` covers (x, z)? */
function jammerCovers(sim, team, x, z) {
    const S = sim.stl, R = sim.stlRules, r2 = R.jamRadius * R.jamRadius;
    if (!S)
        return false;
    for (const id of S.jammers) {
        const s = sim.idToSlot.get(id);
        if (s === undefined || sim.team[s] !== team || sim.hp[s] <= 0 || (sim.con && sim.con.underConstruction(id)))
            continue;
        const dx = sim.x[s] - x, dz = sim.z[s] - z;
        if (dx * dx + dz * dz <= r2)
            return true;
    }
    return false;
}
/** An enemy (of `team`) jammer covers (x, z): orbital calls are blocked there. */
function orbitalJammed(sim, team, x, z) {
    for (let t = 0; t < sim.nTeams; t++)
        if (t !== team && jammerCovers(sim, t, x, z))
            return true;
    return false;
}
function setJammer(sim, relayId, on, team) {
    const R = sim.stlRules, s = sim.idToSlot.get(relayId);
    if (s === undefined || sim.etype[s] !== R.relayType || R.relayType < 0)
        return { ok: false, reason: "notRelayTower" };
    if (team !== undefined && sim.team[s] !== team)
        return { ok: false, reason: "notOwner" };
    const S = sim.stealthState(), i = S.jammers.indexOf(relayId);
    if (on && i < 0) {
        S.jammers.push(relayId);
        S.jammers.sort((a, b) => a - b);
    }
    if (!on && i >= 0)
        S.jammers.splice(i, 1);
    sim.events.push(events_ts_1.EV.JAMMER, sim.tick, sim.team[s], relayId, on ? 1 : 0, Math.round(R.jamRadius), 0, sim.x[s], sim.z[s], 0);
    return { ok: true, ids: [relayId] };
}
function dropDecoy(sim, pilotId, team) {
    const R = sim.stlRules, p = sim.pilots.get(pilotId);
    if (!p)
        return { ok: false, reason: "unknownPilot" };
    if (team !== undefined && p.team !== team)
        return { ok: false, reason: "notOwner" };
    if (p.player < 0)
        return { ok: false, reason: "notPlayerPilot" };
    if (p.state !== 1)
        return { ok: false, reason: "pilotNotOnFoot" };
    const S = sim.stealthState();
    if (R.decoyType < 0 || R.decoyTicks <= 0 || (S.decoyUsed.get(pilotId) ?? 0) >= R.decoyPer)
        return { ok: false, reason: "noDecoy" };
    const s = sim.idToSlot.get(p.entity);
    const d = { id: S.nextDecoy++, team: p.team, pilot: pilotId, x: sim.x[s], z: sim.z[s], until: sim.tick + R.decoyTicks, seen: new Array(MAXT).fill(-1) };
    S.decoys.push(d);
    S.decoyUsed.set(pilotId, (S.decoyUsed.get(pilotId) ?? 0) + 1);
    sim.events.push(events_ts_1.EV.DECOY, sim.tick, p.team, d.id, pilotId, R.decoyType, 1, d.x, d.z, 0);
    return { ok: true, ids: [d.id] };
}
function scoutPulse(sim, pilotId, team) {
    const R = sim.stlRules, p = sim.pilots.get(pilotId);
    if (!p)
        return { ok: false, reason: "unknownPilot" };
    if (team !== undefined && p.team !== team)
        return { ok: false, reason: "notOwner" };
    const vs = p.state === 0 ? sim.idToSlot.get(p.vehicle) : undefined;
    if (vs === undefined || sim.etype[vs] !== R.scoutType || p.seat !== sim.d.tDriverSeat[sim.etype[vs]])
        return { ok: false, reason: "notScoutBike" };
    const S = sim.stealthState();
    if (sim.tick < (S.pingReady.get(pilotId) ?? 0))
        return { ok: false, reason: "pulseCooldown" };
    S.pingReady.set(pilotId, sim.tick + R.pingCooldown);
    const until = sim.tick + R.pingTicks, r2 = R.pingRadius * R.pingRadius, tm = p.team;
    let n = 0;
    for (let o = 0; o < sim.hi; o++) {
        if (!sim.alive[o] || sim.team[o] === tm)
            continue;
        const dx = sim.x[o] - sim.x[vs], dz = sim.z[o] - sim.z[vs];
        if (dx * dx + dz * dz > r2)
            continue;
        const i = o * sim.nTeams + tm;
        if (sim.detExpiry[i] < until)
            sim.detExpiry[i] = until;
        n++;
    }
    for (let t = 0; t < sim.nTeams; t++)
        if (t !== tm) {
            const i = vs * sim.nTeams + t;
            if (sim.detExpiry[i] < until)
                sim.detExpiry[i] = until;
        } // the pulse gives the bike away
    sim.events.push(events_ts_1.EV.SCAN, sim.tick, tm, pilotId, sim.eid[vs], n, R.pingTicks, sim.x[vs], sim.z[vs], 0);
    return { ok: true, ids: [sim.eid[vs]] };
}
/** Step hook (after the pilots' step): bike cloaks, decoys, AI search for lost contacts. */
function stealthStep(sim) {
    const R = sim.stlRules, tick = sim.tick, d = sim.d;
    // bike cloak: a player rider holding the cloak key in a bike's driver seat
    for (const p of sim.pilots.values()) {
        if (p.player < 0 || p.state !== 0)
            continue;
        const vs = sim.idToSlot.get(p.vehicle);
        const bike = vs !== undefined && d.tArmour[sim.etype[vs]] === AC_BIKE && p.seat === d.tDriverSeat[sim.etype[vs]];
        const held = bike && sim.ctlOn[vs] === 1 && (sim.bikeCloakHeld(vs));
        let c = sim.stl ? sim.stl.bikeCloak.get(p.id) : undefined;
        if (!c) {
            if (!held)
                continue;
            c = [0, 0, 0];
            sim.stealthState().bikeCloak.set(p.id, c);
        }
        if (c[0] > 0) {
            let why = 0;
            if (!bike || vs === undefined)
                why = 2;
            else if (sim.lastFired[vs] >= c[2])
                why = 4;
            else if (!held || tick >= c[0] || p.energy <= 0)
                why = 2;
            if (why === 0) {
                p.energy = Math.max(0, p.energy - R.cloakEnergy);
                continue;
            }
            c[0] = 0;
            c[1] = tick + R.cloakRecharge;
            sim.events.push(events_ts_1.EV.CLOAK, tick, p.team, p.id, vs !== undefined ? sim.eid[vs] : 0, R.cloakRecharge, 0, 0, 0, why);
        }
        else if (held && tick >= c[1] && p.energy > 0 && R.cloakTicks > 0) {
            c[2] = tick;
            c[0] = tick + R.cloakTicks;
            sim.events.push(events_ts_1.EV.CLOAK, tick, p.team, p.id, sim.eid[vs], R.cloakTicks, 0, 0, 0, 1);
        }
        else if (!held && tick >= c[1])
            sim.stl.bikeCloak.delete(p.id);
    }
    const S = sim.stl;
    if (!S)
        return;
    // decoys: expire; enemy sensors detect them like the fake unit (every detection interval)
    if (S.decoys.length) {
        S.decoys = S.decoys.filter((x) => { if (tick < x.until)
            return true; sim.events.push(events_ts_1.EV.DECOY, tick, x.team, x.id, x.pilot, R.decoyType, 2, x.x, x.z, 0); return false; });
        if (tick % R.di === 0)
            for (const x of S.decoys) {
                for (let o = 0; o < sim.hi; o++) {
                    if (!sim.alive[o] || sim.team[o] === x.team || sim.hp[o] <= 0)
                        continue;
                    if (d.tSensor[sim.etype[o]] <= 0 || x.seen[sim.team[o]] >= tick + R.lostTicks)
                        continue;
                    if (sim.decoySeenBy(o, x.team, x.x, x.z))
                        x.seen[sim.team[o]] = tick + R.lostTicks; // QA3-3: the fake unit's detection rules
                }
            }
    }
}
/** AI search (enemy-ai side; every detection interval): remember sightings, send a searcher to lost contacts. */
function stealthSearch(sim) {
    const R = sim.stlRules, tick = sim.tick, d = sim.d, M = sim.match;
    if (!M || !M.aiMask || R.searchMax <= 0 || R.searchRadius <= 0 || tick % R.di !== 0)
        return;
    const S = sim.stealthState();
    for (let team = 0; team < sim.nTeams; team++) {
        if (!M.isAi(team) || (M.eliminated >> team) & 1)
            continue; // DQ-8: an eliminated team's commander sends no searches
        // sightings: armed enemies the team sees now (refreshed by a sweep within the last interval)
        for (let o = 0; o < sim.hi; o++) {
            if (!sim.alive[o] || sim.team[o] === team || d.tStructure[sim.etype[o]] || !sim.aiArmed(o))
                continue; // QA1: economy units are not armed
            const e = sim.detExpiry[o * sim.nTeams + team];
            if (e > tick + R.lostTicks - R.di)
                S.seen.set(sim.eid[o] * 8 + team, [sim.x[o], sim.z[o], tick]);
        }
        for (const x of S.decoys)
            if (x.team !== team && x.seen[team] > tick + R.lostTicks - R.di)
                S.seen.set(-x.id * 8 - 8 + team, [x.x, x.z, tick]);
        let active = 0;
        for (const [u, t0] of S.searching) {
            const us = sim.idToSlot.get(u);
            if (us === undefined || tick - t0 > R.searchTicks) {
                S.searching.delete(u);
                continue;
            }
            if (sim.team[us] === team)
                active++;
        }
        for (const [k, v] of S.seen) {
            if ((((k % 8) + 8) % 8) !== team)
                continue;
            const id = Math.floor(k / 8);
            if (tick - v[2] > R.searchTicks) {
                S.seen.delete(k);
                continue;
            }
            const os = id > 0 ? sim.idToSlot.get(id) : undefined;
            const lost = id > 0 ? os === undefined || sim.detExpiry[os * sim.nTeams + team] < tick : !S.decoys.some((x) => -x.id - 1 === id && x.seen[team] >= tick);
            if (!lost && id > 0)
                continue;
            if (id > 0 && os === undefined) {
                S.seen.delete(k);
                continue;
            } // gone (dead): nothing to search
            if (active >= R.searchMax)
                break;
            // nearest idle armed unit of the team within searchRadius of the last-known position
            let best = -1, bd = R.searchRadius * R.searchRadius;
            for (let s = 0; s < sim.hi; s++) {
                if (!sim.alive[s] || sim.team[s] !== team || d.tStructure[sim.etype[s]] || !sim.aiArmed(s) || sim.slotPilot[s] !== 0)
                    continue; // QA1: never a Constructor / Harvester
                if (sim.ordType[s] !== 0 || sim.tgtSlot[s] >= 0 || sim.ctlOn[s] || S.searching.has(sim.eid[s]))
                    continue;
                const dx = sim.x[s] - v[0], dz = sim.z[s] - v[1], d2 = dx * dx + dz * dz;
                if (d2 < bd) {
                    bd = d2;
                    best = s;
                }
            }
            S.seen.delete(k);
            if (best < 0)
                continue;
            sim.aiOrder(sim.eid[best], v[0], v[1]);
            S.searching.set(sim.eid[best], tick);
            active++;
            sim.events.push(events_ts_1.EV.SEARCH, tick, team, sim.eid[best], id > 0 ? id : 0, 0, 0, v[0], v[1], 0);
        }
    }
}
