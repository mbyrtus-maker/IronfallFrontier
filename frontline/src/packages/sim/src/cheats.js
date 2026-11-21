"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cheats = exports.CHEAT_SPAWN = exports.CHEAT_GOD = exports.CHEAT_REVEAL = exports.CHEAT_INSTANT = exports.CHEAT_RESERVE = exports.CHEAT_RESOURCES = exports.ACT_CHEAT = void 0;
exports.applyCheat = applyCheat;
exports.cheatGod = cheatGod;
exports.cheatStep = cheatStep;
exports.ACT_CHEAT = 61;
exports.CHEAT_RESOURCES = 1, exports.CHEAT_RESERVE = 2, exports.CHEAT_INSTANT = 3, exports.CHEAT_REVEAL = 4, exports.CHEAT_GOD = 5, exports.CHEAT_SPAWN = 6;
class Cheats {
    /** Bit t: team t builds and produces instantly. */
    instant = 0;
    /** Bit t: team t sees the whole map. */
    reveal = 0;
    /** Player pilot ids in god mode (ascending). */
    god = [];
    hash(word) { word(0xd1c4ea7); word(this.instant); word(this.reveal); word(this.god.length); for (const p of this.god)
        word(p); }
    exportTo(w) { w.i32(this.instant); w.i32(this.reveal); w.i32(this.god.length); for (const p of this.god)
        w.i32(p); }
    restoreFrom(r) { this.instant = r.i32(); this.reveal = r.i32(); this.god = []; for (let i = 0, n = r.i32(); i < n; i++)
        this.god.push(r.i32()); }
}
exports.Cheats = Cheats;
const bit = (m, t, on) => (on ? m | (1 << t) : m & ~(1 << t));
/** ACT_CHEAT for `team`. Refusals: notOwner (no team / god on another team's or an AI pilot), badInput. */
function applyCheat(sim, team, sub, b, c) {
    if (team === undefined)
        return { ok: false, reason: "notOwner" };
    switch (sub) {
        case exports.CHEAT_RESOURCES:
            sim.addResources(team, b, c);
            return { ok: true };
        case exports.CHEAT_RESERVE: {
            const P = sim.pool;
            if (!P)
                return { ok: true };
            const k = P.counts(sim, team);
            P.avail[team] = Math.max(0, P.initial[team] + P.gained[team] - k.assigned - k.onFoot);
            P.lost[team] = 0;
            return { ok: true };
        }
        case exports.CHEAT_INSTANT: {
            const C = sim.cheatState();
            C.instant = bit(C.instant, team, b === 1);
            return { ok: true };
        }
        case exports.CHEAT_REVEAL: {
            const C = sim.cheatState();
            C.reveal = bit(C.reveal, team, b === 1);
            return { ok: true };
        }
        case exports.CHEAT_GOD: {
            const p = sim.pilots.get(b);
            if (!p || p.player < 0 || p.team !== team)
                return { ok: false, reason: "notOwner" };
            const C = sim.cheatState(), g = C.god.filter((x) => x !== b);
            if (c === 1)
                g.push(b);
            C.god = g.sort((x, y) => x - y);
            return { ok: true };
        }
        // designer 16 Nov: spawn any friendly vehicle, empty, 14 m in front of the player's pilot (b pilot id, c type index)
        case exports.CHEAT_SPAWN: {
            const p = sim.pilots.get(b), d = sim.d;
            if (!p || p.player < 0 || p.team !== team)
                return { ok: false, reason: "notOwner" };
            if (!(c >= 0 && c < d.typeIds.length) || d.tSeatCount[c] <= 0 || d.tStructure[c])
                return { ok: false, reason: "badInput" };
            const at = sim.entity(p.vehicle > 0 ? p.vehicle : p.entity);
            if (!at)
                return { ok: false, reason: "badInput" };
            const dl = Math.hypot(at.dirX, at.dirZ) || 1, fx = at.dirX / dl, fz = at.dirZ / dl, r = 10 + d.tRadius[c] * 1.5;
            sim.spawnUnit(d.typeIds[c], team, at.x + fx * r, at.z + fz * r, { crew: "none" });
            return { ok: true };
        }
        default: return { ok: false, reason: "badInput" };
    }
}
/** Slots god mode protects: the god pilots' bodies on foot and the vehicles they sit in. */
function godSlots(sim, out) {
    out.length = 0;
    const C = sim.cheat;
    if (!C)
        return out;
    for (const pid of C.god) {
        const p = sim.pilots.get(pid);
        if (!p)
            continue;
        const id = p.entity || p.vehicle;
        const s = id ? sim.idToSlot.get(id) : undefined;
        if (s !== undefined && sim.alive[s])
            out.push(s);
    }
    return out;
}
const tmp = [];
/** Is slot e protected by god mode (applyDamage takes no damage on it)? */
function cheatGod(sim, e) {
    if (!sim.cheat || sim.cheat.god.length === 0)
        return false;
    return godSlots(sim, tmp).includes(e);
}
/** Once per tick after the detection sweeps: revealed teams detect every enemy; god pilots' slots back to full. */
function cheatStep(sim, expiry) {
    const C = sim.cheat;
    if (C.reveal) {
        const T = 4; // MAX_TEAMS (data.ts): detExpiry is slot * MAX_TEAMS + team
        for (let s = 0; s < sim.hi; s++) {
            if (!sim.alive[s])
                continue;
            for (let t = 0; t < T; t++)
                if ((C.reveal >> t) & 1 && sim.team[s] !== t && sim.detExpiry[s * T + t] < expiry)
                    sim.detExpiry[s * T + t] = expiry;
        }
    }
    if (C.god.length)
        for (const s of godSlots(sim, tmp)) {
            const t = sim.etype[s];
            if (sim.hp[s] > 0 && sim.hp[s] < sim.d.tHp[t])
                sim.hp[s] = sim.d.tHp[t];
            if (sim.shield[s] < sim.d.tShield[t])
                sim.shield[s] = sim.d.tShield[t];
        }
}
