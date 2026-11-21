"use strict";
// Progression (wave 2 task E; design doc 16). Sim-side rules and data only: the client stores profiles and draws the
// debrief.
//
// 1. Battle record (sim side, deterministic, state). While a match runs the sim tallies per PLAYER (pilot.player >= 0):
//    kills by the target's armour class (a kill made from a vehicle is shared evenly across the player pilots aboard it,
//    doc 11 "kill and assist XP is shared evenly across the crew"; friendly kills do not count), points captured while the
//    player was inside the point's area, downed pilots revived, structures finished by a Constructor the player drove
//    when the site was placed, hull repaired with the torch, ore delivered by a harvester the player drove, and per team
//    the objectives done and the vehicles lost. Mastery XP: the kill XP earned with each weapon (the firing pilot) and
//    vehicle (its driver). At MATCH_OVER each player gets a BattleResult (Sim.battleResults()) and an event
//    BATTLE_RESULT (66, every viewer).
// 2. XP and grade (doc 16 "Winning a battle"): xp = sum of the record x progression.xp (+ xp.victory on a win); a defeat
//    pays battle.defeatXpFraction (40%) of it and no salvage. The grade counts the four doc factors (secondaries done
//    >= grading.secondariesFraction, time <= grading.parSeconds, points held at the end >= grading.pointsHeldFraction,
//    vehicles lost <= grading.vehiclesLostAtMost): Gold at goldFactors, Silver at silverFactors, else Bronze; a defeat is
//    Bronze. Salvage = salvage[grade] + salvage.perSecondary per side objective done.
// 3. Profile rules (pure functions, no sim): newProfile, rankForXp, applyBattle (XP, the low-rank bonus, ranks and
//    licence tokens, mastery levels, salvage, the first-Gold blueprint), unlock (spend tokens), chooseMastery (level-3
//    choice), loadoutSlots (rank milestones), validateLoadout, profileEffects (bounded stat changes).
// 4. Applying a profile at match start (Sim.applyProfile / ScenarioDef.players): validated; then (a) ruling 56: there are
//    NO vehicle licences: every vehicle is available to every player (a stored profile's legacy unlocks.vehicleLicences
//    is accepted and ignored), (b) the chosen
//    pilot weapon replaces the carbine on that player's pilot body at every spawn, (c) the call loadout is set on the
//    player's pilots, (d) mastery effects: weapon damage bonus on hits by that player's pilot with that weapon; vehicle
//    hull bonus as damage taken / (1 + bonus) and speed bonus x (1 + bonus) while that player drives that vehicle type.
//    Each item's flat bonus is capped at mastery.flatStatCapPerItem (10%). Ammo bonus: the sim has no ammunition (no effect).
//
// State (created on first use: a sim without players hashes as before): tallies, sites, applied profiles, results.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Progress = exports.KILL_CLASSES = exports.GRADE_NAMES = exports.PROFILE_VERSION = void 0;
exports.progressionRules = progressionRules;
exports.newProfile = newProfile;
exports.xpForRank = xpForRank;
exports.rankForXp = rankForXp;
exports.masteryLevel = masteryLevel;
exports.loadoutSlots = loadoutSlots;
exports.applyBattle = applyBattle;
exports.unlock = unlock;
exports.chooseMastery = chooseMastery;
exports.profileEffects = profileEffects;
exports.validateLoadout = validateLoadout;
exports.progApply = progApply;
exports.progOnPilot = progOnPilot;
exports.progOnBody = progOnBody;
exports.progDamageMul = progDamageMul;
exports.progSpeedMul = progSpeedMul;
exports.progKill = progKill;
exports.progOnLeave = progOnLeave;
exports.progRepair = progRepair;
exports.progStep = progStep;
const events_ts_1 = require("./events.js");
const data_ts_1 = require("./data.js");
const objectives_ts_1 = require("./objectives.js");
exports.PROFILE_VERSION = 1;
exports.GRADE_NAMES = ["bronze", "silver", "gold"];
/** Armour-class order of BattleResult.killsByClass (data ARMOUR_CLASSES). */
exports.KILL_CLASSES = data_ts_1.ARMOUR_CLASSES;
function progressionRules(data) {
    const R = progressionRules0(data);
    if (R.fl)
        R.pools = { ...R.pools, ...R.fl.pools }; // Frontline pools are profile pools too (validated like the others)
    return R;
}
function progressionRules0(data) {
    const p = data.progression, sc = (data.supportCalls ?? {});
    const pr = p.pilotRank, ms = p.mastery;
    const l3v = ms.vehicle["3"], l3w = ms.weapon["3"];
    return {
        maxRank: pr.max, tokensPerRank: pr.licenceTokensPerRank, milestones: pr.milestones, lowRankBelow: pr.lowRankBonus.belowRank, lowRankBonus: pr.lowRankBonus.xpBonus,
        defeatXp: p.battle.defeatXpFraction, defeatSalvage: p.battle.defeatSalvage, firstGoldBlueprint: !!p.battle.firstGoldGrantsBlueprint,
        xp: p.xp, rankFirst: p.rankXp.first, rankGrowth: p.rankXp.growthPerRank,
        masteryLevels: ms.levels, masteryXp: p.masteryXpForLevel, statCap: ms.flatStatCapPerItem,
        vehicleL3: { hull: typeof l3v === "object" ? l3v.hullBonus : 0, speed: typeof l3v === "object" ? l3v.orSpeedBonus : 0 },
        weaponL3: { damage: typeof l3w === "object" ? l3w.damageBonus : 0, ammo: typeof l3w === "object" ? l3w.orAmmoBonus : 0 },
        grading: p.grading, salvage: p.salvage, tokenCost: p.tokenCost,
        pools: { ...p.unlockPools, calls: (sc.calls ?? []).map((c) => c.id).filter((id) => !(sc.sim?.fixedCalls ?? []).includes(id)) }, // ruling 133: fixed calls are never unlocked
        starting: p.startingUnlocks,
        callSlots: { base: sc.startingLoadoutSlots ?? 0, max: sc.loadoutSize ?? 0 },
        fl: flRules(p.frontline),
    };
}
// (progressionRules' pools take the Frontline pools too: validateLoadout / checkProfile accept them; see withFlPools)
/**
 * Frontline (designer 19 Nov: "revise all the token unlocks"): the loadout options as unlock pools. start: owned by
 * everyone; cost: tokens per item. Tokens are counted from the rank (1 per rank + 1 at each bonus rank) less what the
 * Frontline unlocks cost, so tokens spent on the older pools come back.
 */
function flRules(F) {
    if (!F || !F.cost)
        return null; // (an empty cost table: Frontline with no unlocks, every option open)
    const pools = {};
    for (const pool of new Set([...Object.keys(F.start ?? {}), ...Object.keys(F.cost)]))
        pools[pool] = [...(F.start?.[pool] ?? []), ...Object.keys(F.cost[pool] ?? {})];
    return { start: F.start ?? {}, cost: F.cost, pools, bonus: F.bonusTokenRanks ?? [] };
}
/** Frontline: tokens earned by a rank (1 per rank above 1, +1 at each bonus rank reached). */
function flTokensEarned(R, rank) {
    return (rank - 1) * R.tokensPerRank + (R.fl ? R.fl.bonus.filter((r) => rank >= r).length : 0);
}
/** Frontline: does the profile own item id of pool (a starting item, or unlocked)? */
function flOwns(R, profile, pool, id) {
    if (!R.fl)
        return true;
    if (!R.fl.pools[pool]?.includes(id))
        return true; // not a gated item
    return (R.fl.start[pool] ?? []).includes(id) || (profile.unlocks?.[pool] ?? []).includes(id);
}
/** Frontline: the token cost of item id of pool (0 when owned or free). */
function flCost(R, pool, id) { return R.fl?.cost?.[pool]?.[id] ?? 0; }
/** Frontline: tokens left to spend (earned by the rank less the Frontline unlocks bought). */
function flTokens(R, profile) {
    if (!R.fl)
        return profile.tokens;
    let spent = 0;
    for (const pool of Object.keys(R.fl.cost))
        for (const id of profile.unlocks?.[pool] ?? [])
            spent += flCost(R, pool, id);
    return Math.max(0, flTokensEarned(R, profile.rank) + (profile.bonusTokens ?? 0) - spent);
}
exports.flOwns = flOwns;
exports.flCost = flCost;
exports.flTokens = flTokens;
exports.flTokensEarned = flTokensEarned;
function newProfile(R) {
    return { version: exports.PROFILE_VERSION, xp: 0, rank: 1, tokens: 0,
        unlocks: { vehicleWeapons: [], pilotWeapons: [...R.starting.pilotWeapons], pilotGear: [], calls: [...R.starting.calls] },
        mastery: {}, salvage: 0, golds: [], blueprints: [] };
}
/** Total XP needed to reach rank r (rank 1 = 0). XP from rank k to k + 1 = rankXp.first + growthPerRank x (k - 1). */
function xpForRank(R, r) {
    let t = 0;
    for (let k = 1; k < Math.min(r, R.maxRank); k++)
        t += R.rankFirst + R.rankGrowth * (k - 1);
    return t;
}
function rankForXp(R, xp) {
    let r = 1;
    while (r < R.maxRank && xp >= xpForRank(R, r + 1))
        r++;
    return r;
}
function masteryLevel(R, xp) {
    let l = 1;
    for (let k = 1; k < R.masteryLevels; k++)
        if (xp >= R.masteryXp[k])
            l = k + 1;
    return l;
}
/** Loadout capacity at a rank (doc 16 milestones). */
function loadoutSlots(R, rank) {
    const has = (id) => R.milestones.some((m) => m.unlocks === id && rank >= m.rank);
    return { calls: has("support-call-slot-3") ? R.callSlots.max : R.callSlots.base, vehicleMods: 1 + (has("vehicle-mod-slot-2") ? 1 : 0) + (has("vehicle-mod-slot-3") ? 1 : 0), pilotGear: 1 + (has("pilot-gear-slot-2") ? 1 : 0) };
}
const clone = (p) => JSON.parse(JSON.stringify(p));
/** New profile after a battle: XP (low-rank bonus), rank and tokens, mastery XP and levels, salvage, first Gold. Pure. */
function applyBattle(R, profile, result, o = {}) {
    const p = clone(profile);
    let xp = result.xp;
    if (p.rank < R.lowRankBelow && (o.squadMaxRank ?? 0) > p.rank)
        xp = Math.round(xp * (1 + R.lowRankBonus));
    p.xp += xp;
    const rank = rankForXp(R, p.xp);
    if (rank > p.rank)
        p.tokens += (rank - p.rank) * R.tokensPerRank + (R.fl ? R.fl.bonus.filter((r) => r > p.rank && r <= rank).length : 0);
    p.rank = rank;
    const frac = result.victory ? 1 : R.defeatXp;
    for (const [k, v] of Object.entries(result.mastery)) {
        const m = p.mastery[k] ?? { xp: 0, level: 1 };
        m.xp += Math.round(v * frac);
        m.level = masteryLevel(R, m.xp);
        p.mastery[k] = m;
    }
    p.salvage += result.salvage;
    if (result.victory && result.grade === 2 && o.missionId && !p.golds.includes(o.missionId)) {
        p.golds.push(o.missionId);
        if (R.firstGoldBlueprint)
            p.blueprints.push(`blueprint:${o.missionId}`);
    }
    return p;
}
/** Spends tokenCost tokens on an item of a pool. Pure. Reasons: unknownItem, alreadyUnlocked, noTokens. */
function unlock(R, profile, pool, id) {
    if (R.fl && R.fl.pools[pool]) { // Frontline: per-item costs, tokens counted from the rank
        if (!R.fl.pools[pool].includes(id))
            return { ok: false, reason: "unknownItem" };
        if (flOwns(R, profile, pool, id))
            return { ok: false, reason: "alreadyUnlocked" };
        const cost = flCost(R, pool, id);
        if (flTokens(R, profile) < cost)
            return { ok: false, reason: "noTokens" };
        const p = clone(profile);
        p.unlocks[pool] = [...(p.unlocks[pool] ?? []), id];
        p.tokens = flTokens(R, p);
        return { ok: true, profile: p };
    }
    if (!Object.prototype.hasOwnProperty.call(R.pools, pool) || !R.pools[pool].includes(id))
        return { ok: false, reason: "unknownItem" }; // ruling 56: no vehicleLicences pool
    if (profile.unlocks[pool].includes(id))
        return { ok: false, reason: "alreadyUnlocked" };
    if (profile.tokens < R.tokenCost)
        return { ok: false, reason: "noTokens" };
    const p = clone(profile);
    p.tokens -= R.tokenCost;
    p.unlocks[pool].push(id);
    return { ok: true, profile: p };
}
/** The level-3 mastery choice of an item (vehicle: hull or speed; weapon: damage or ammo). Pure. */
function chooseMastery(R, profile, key, choice) {
    const m = profile.mastery[key];
    if (!m || m.level < 3)
        return { ok: false, reason: "levelTooLow" };
    const veh = key.startsWith("vehicle:");
    if (veh ? choice !== "hull" && choice !== "speed" : choice !== "damage" && choice !== "ammo")
        return { ok: false, reason: "badChoice" };
    const p = clone(profile);
    p.mastery[key].choice = choice;
    void R;
    return { ok: true, profile: p };
}
/** Flat stat changes a profile gives (doc 16 mastery level 3), each capped at mastery.flatStatCapPerItem. */
function profileEffects(R, profile) {
    const out = { vehicleHull: {}, vehicleSpeed: {}, weaponDamage: {}, weaponAmmo: {} };
    for (const [k, m] of Object.entries(profile.mastery)) {
        if (m.level < 3 || !m.choice)
            continue;
        const [kind, id] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)];
        const cap = (v) => Math.min(R.statCap, v);
        if (kind === "vehicle" && m.choice === "hull")
            out.vehicleHull[id] = cap(R.vehicleL3.hull);
        if (kind === "vehicle" && m.choice === "speed")
            out.vehicleSpeed[id] = cap(R.vehicleL3.speed);
        if (kind === "weapon" && m.choice === "damage")
            out.weaponDamage[id] = cap(R.weaponL3.damage);
        if (kind === "weapon" && m.choice === "ammo")
            out.weaponAmmo[id] = cap(R.weaponL3.ammo);
    }
    return out;
}
/** Checks a loadout against its profile. Reasons: badProfile, notUnlocked (weapon), badLoadout (calls). */
function validateLoadout(R, l, standardPilotWeapon = "pilot-carbine") {
    const p = l.profile;
    if (!p || p.version !== exports.PROFILE_VERSION || !Number.isFinite(p.xp) || p.xp < 0 || p.rank !== rankForXp(R, p.xp))
        return { ok: false, reason: "badProfile" };
    for (const pool of Object.keys(p.unlocks)) {
        if (pool === "vehicleLicences")
            continue; // ruling 56: a stored profile's legacy licences load and are ignored
        const ids = p.unlocks[pool];
        if (!Array.isArray(ids) || !Object.prototype.hasOwnProperty.call(R.pools, pool))
            return { ok: false, reason: "badProfile" };
        for (const id of ids)
            if (!R.pools[pool].includes(id))
                return { ok: false, reason: "badProfile" };
    }
    for (const m of Object.values(p.mastery))
        if (m.level !== masteryLevel(R, m.xp) || m.level > R.masteryLevels)
            return { ok: false, reason: "badProfile" };
    if (l.pilotWeapon !== undefined && l.pilotWeapon !== standardPilotWeapon && !p.unlocks.pilotWeapons.includes(l.pilotWeapon))
        return { ok: false, reason: "notUnlocked" };
    if (l.calls) {
        if (l.calls.length > loadoutSlots(R, p.rank).calls || new Set(l.calls).size !== l.calls.length)
            return { ok: false, reason: "badLoadout" };
        for (const c of l.calls)
            if (!p.unlocks.calls.includes(c))
                return { ok: false, reason: "notUnlocked" };
    }
    return { ok: true };
}
// tally layout per player (numbers): kills[7], captures, revives, built, repaired, ore, firstTick, team at leave + 1
// (QA3-7: 0 = not left; state v23)
const T_KILLS = 0, T_CAPT = 7, T_REV = 8, T_BUILT = 9, T_REP = 10, T_ORE = 11, T_FIRST = 12, T_TEAM = 13, T_N = 14;
class Progress {
    tally = new Map(); // player -> T_*
    mastery = new Map(); // player -> item code (weapon w, vehicle 100000 + t) -> xp
    teamLost = [0, 0, 0, 0];
    teamPrim = [0, 0, 0, 0];
    teamSide = [0, 0, 0, 0];
    sites = new Map(); // construction site id -> player
    applied = new Map(); // player -> compiled profile (static once applied; its JSON is exported)
    results = null;
    t(player, tick) {
        let a = this.tally.get(player);
        if (!a) {
            a = new Array(T_N).fill(0);
            a[T_FIRST] = tick;
            this.tally.set(player, a);
            const s = [...this.tally.entries()].sort((x, y) => x[0] - y[0]);
            this.tally = new Map(s);
        }
        return a;
    }
    addMastery(player, code, v) {
        let m = this.mastery.get(player);
        if (!m) {
            m = new Map();
            this.mastery.set(player, m);
            this.mastery = new Map([...this.mastery.entries()].sort((x, y) => x[0] - y[0]));
        }
        m.set(code, (m.get(code) ?? 0) + v);
        if (m.size > 1)
            this.mastery.set(player, new Map([...m.entries()].sort((x, y) => x[0] - y[0])));
    }
    hash(word, num, str) {
        word(0x9a0e55);
        word(this.tally.size);
        for (const [p, a] of this.tally) {
            word(p);
            for (const v of a)
                num(v);
        }
        word(this.mastery.size);
        for (const [p, m] of this.mastery) {
            word(p);
            word(m.size);
            for (const [k, v] of m) {
                word(k);
                num(v);
            }
        }
        for (let k = 0; k < 4; k++) {
            word(this.teamLost[k]);
            word(this.teamPrim[k]);
            word(this.teamSide[k]);
        }
        word(this.sites.size);
        for (const [s, p] of this.sites) {
            word(s);
            word(p);
        }
        word(this.applied.size);
        for (const [p, a] of this.applied) {
            word(p);
            str(JSON.stringify(a.loadout));
        }
        word(this.results ? this.results.length : -1);
    }
    exportTo(w) {
        w.i32(this.tally.size);
        for (const [p, a] of this.tally) {
            w.i32(p);
            for (const v of a)
                w.f64(v);
        }
        w.i32(this.mastery.size);
        for (const [p, m] of this.mastery) {
            w.i32(p);
            w.i32(m.size);
            for (const [k, v] of m) {
                w.i32(k);
                w.f64(v);
            }
        }
        for (let k = 0; k < 4; k++) {
            w.i32(this.teamLost[k]);
            w.i32(this.teamPrim[k]);
            w.i32(this.teamSide[k]);
        }
        w.i32(this.sites.size);
        for (const [s, p] of this.sites) {
            w.i32(s);
            w.i32(p);
        }
        w.i32(0); // reserved (was the event-log serial read up to: not sim state, see progStep)
        w.i32(this.applied.size);
        for (const a of this.applied.values())
            w.str(JSON.stringify(a.loadout));
        w.str(this.results ? JSON.stringify(this.results) : "");
    }
    restoreFrom(sim, r) {
        this.tally = new Map();
        this.mastery = new Map();
        this.sites = new Map();
        this.applied = new Map();
        for (let i = 0, n = r.i32(); i < n; i++) {
            const p = r.i32(), a = [];
            for (let k = 0; k < T_N; k++)
                a.push(r.f64());
            this.tally.set(p, a);
        }
        for (let i = 0, n = r.i32(); i < n; i++) {
            const p = r.i32(), m = new Map();
            for (let j = 0, nm = r.i32(); j < nm; j++) {
                const k = r.i32();
                m.set(k, r.f64());
            }
            this.mastery.set(p, m);
        }
        for (let k = 0; k < 4; k++) {
            this.teamLost[k] = r.i32();
            this.teamPrim[k] = r.i32();
            this.teamSide[k] = r.i32();
        }
        for (let i = 0, n = r.i32(); i < n; i++) {
            const s = r.i32();
            this.sites.set(s, r.i32());
        }
        r.i32(); // reserved (old saves: the event-log serial; ignored)
        for (let i = 0, n = r.i32(); i < n; i++) {
            const l = JSON.parse(r.str());
            this.applied.set(l.player, compileApplied(sim, l));
        }
        const res = r.str();
        this.results = res ? JSON.parse(res) : null;
    }
}
exports.Progress = Progress;
function compileApplied(sim, l) {
    const d = sim.d, R = sim.progRules, eff = profileEffects(R, l.profile);
    const wmap = (o) => { const m = new Map(); for (const [k, v] of Object.entries(o)) {
        const w = d.weaponIds.indexOf(k);
        if (w >= 0)
            m.set(w, v);
    } return m; };
    const tmap = (o) => { const m = new Map(); for (const [k, v] of Object.entries(o)) {
        const t = d.typeIds.indexOf(k);
        if (t >= 0)
            m.set(t, v);
    } return m; };
    return { loadout: l, pilotWeapon: l.pilotWeapon ? d.weaponIds.indexOf(l.pilotWeapon) : -1, dmg: wmap(eff.weaponDamage), hull: tmap(eff.vehicleHull), speed: tmap(eff.vehicleSpeed) };
}
// ------------------------------------------------------------------ sim hooks
const playerOf = (sim, pid) => { if (pid <= 0)
    return -1; const p = sim.pilots.get(pid); return p ? p.player : -1; };
/** Sim.applyProfile: validate and apply a player's loadout (match start). */
function progApply(sim, l) {
    const R = sim.progRules;
    if (!R)
        return { ok: false, reason: "badLoadout" };
    if (!Number.isInteger(l.player) || l.player < 0)
        return { ok: false, reason: "unknownPilot" };
    const v = validateLoadout(R, l);
    if (!v.ok)
        return { ok: false, reason: v.reason === "notUnlocked" ? "notLicensed" : "badLoadout" };
    const P = sim.progState();
    P.applied.set(l.player, compileApplied(sim, JSON.parse(JSON.stringify(l))));
    P.applied = new Map([...P.applied.entries()].sort((a, b) => a[0] - b[0]));
    for (const p of sim.pilots.values())
        if (p.player === l.player)
            progOnPilot(sim, p.id);
    return { ok: true };
}
/** A player's pilot record exists (applyProfile, spawnPilot): its call loadout. */
function progOnPilot(sim, pilotId) {
    const a = sim.prog?.applied.get(playerOf(sim, pilotId));
    if (a && a.loadout.calls)
        sim.setCallLoadout(pilotId, a.loadout.calls);
}
/** A player's pilot body was spawned at slot s: the chosen pilot weapon replaces mount 0 (the carbine). */
function progOnBody(sim, pilotId, s) {
    const a = sim.prog?.applied.get(playerOf(sim, pilotId));
    if (a && a.pilotWeapon >= 0 && sim.mCount[s] > 0) {
        sim.mWeapon[s * data_ts_1.MAX_MOUNTS + 0] = a.pilotWeapon; // mount 0: the carbine
    }
}
/** Damage multiplier for a hit by pilot `pid` with weapon w on slot e (mastery: weapon damage up, hull of a player-driven target). */
function progDamageMul(sim, pid, w, e) {
    const P = sim.prog;
    if (!P || P.applied.size === 0)
        return 1;
    let m = 1;
    const a = P.applied.get(playerOf(sim, pid));
    if (a) {
        const b = a.dmg.get(w);
        if (b)
            m *= 1 + b;
    }
    const t = sim.etype[e], dj = sim.d.tDriverSeat[t];
    if (dj >= 0) {
        const ta = P.applied.get(playerOf(sim, sim.occ[e * data_ts_1.MAX_SEATS + dj]));
        if (ta) {
            const h = ta.hull.get(t);
            if (h)
                m /= 1 + h;
        }
    }
    return m;
}
/** Speed multiplier of vehicle slot s (its driver's vehicle mastery). */
function progSpeedMul(sim, s) {
    const P = sim.prog;
    if (!P || P.applied.size === 0)
        return 1;
    const t = sim.etype[s], dj = sim.d.tDriverSeat[t];
    if (dj < 0)
        return 1;
    const a = P.applied.get(playerOf(sim, sim.occ[s * data_ts_1.MAX_SEATS + dj]));
    const b = a ? a.speed.get(t) : undefined;
    return b ? 1 + b : 1;
}
/** A killing hit (logHit): target slot e, shooter entity id, shooter pilot id, weapon w. */
function progKill(sim, e, shooterId, pid, w, shooterTeam) {
    const d = sim.d, t = sim.etype[e], R = sim.progRules;
    if (sim.team[e] === shooterTeam)
        return;
    const lostVeh = t < d.unitCount && d.tVehicle[t] === 1;
    const cls = d.tArmour[t], xp = R.xp.killByClass[data_ts_1.ARMOUR_CLASSES[cls]] ?? 0;
    // who shares: the player pilots aboard the firing vehicle, else the firing player pilot
    const share = [];
    const ss = sim.idToSlot.get(shooterId);
    let driverPlayer = -1;
    if (ss !== undefined && d.tDriverSeat[sim.etype[ss]] >= 0 && sim.slotPilot[ss] === 0) {
        const st = sim.etype[ss];
        for (let j = 0; j < d.tSeatCount[st]; j++) {
            const pl = playerOf(sim, sim.occ[ss * data_ts_1.MAX_SEATS + j]);
            if (pl >= 0 && !share.includes(pl))
                share.push(pl);
        }
        driverPlayer = playerOf(sim, sim.occ[ss * data_ts_1.MAX_SEATS + d.tDriverSeat[st]]);
    }
    else {
        const pl = playerOf(sim, pid);
        if (pl >= 0)
            share.push(pl);
    }
    const firing = playerOf(sim, pid);
    let victimTeamHasPlayers = false;
    if (lostVeh)
        for (const p of sim.pilots.values())
            if (p.player >= 0 && p.team === sim.team[e]) {
                victimTeamHasPlayers = true;
                break;
            }
    if (!share.length && firing < 0 && !victimTeamHasPlayers)
        return; // no player involved: no state
    const P = sim.progState();
    if (lostVeh)
        P.teamLost[sim.team[e]]++;
    for (const pl of share)
        P.t(pl, sim.tick)[T_KILLS + cls] += 1 / share.length;
    if (firing >= 0 && w >= 0)
        P.addMastery(firing, w, xp);
    if (driverPlayer >= 0 && ss !== undefined)
        P.addMastery(driverPlayer, 100000 + sim.etype[ss], xp);
}
/** Torch repair by pilot pid: amount of hull. */
/**
 * QA3-7 (coopLeave): player `player` of `team` leaves. His battle record keeps the team he left from, so the result at
 * the match's end is judged for that team; a leaver with no record yet gets one (from the tick he was alive since).
 */
function progOnLeave(sim, player, team, aliveSince) {
    if (!sim.progRules || !sim.match || sim.prog?.results)
        return;
    sim.progState().t(player, aliveSince > 0 ? Math.min(aliveSince, sim.tick) : 0)[T_TEAM] = team + 1;
}
function progRepair(sim, pid, amount) {
    const pl = playerOf(sim, pid);
    if (pl >= 0 && amount > 0)
        sim.progState().t(pl, sim.tick)[T_REP] += amount;
}
/**
 * End of step: scan this step's events (captures, revives, construction, hauling, objectives, MATCH_OVER).
 * `from` is the event-log serial at the start of the step: the scan depends only on what this step pushed, never on
 * the log's absolute serials (they are network continuation, absent from a `net: false` save), so the progression
 * state is self-contained in every export mode.
 */
function progStep(sim, stepSerial) {
    const log = sim.events;
    const P = sim.prog;
    const from = Math.max(stepSerial, log.first());
    let any = false;
    for (let k = from; k < log.next; k++) {
        const kind = log.kind[log.at(k)];
        if (kind === events_ts_1.EV.POINT || kind === events_ts_1.EV.REVIVED || kind === events_ts_1.EV.BUILD_STARTED || kind === events_ts_1.EV.BUILD_DONE || kind === events_ts_1.EV.HARVEST_DELIVERED || kind === events_ts_1.EV.OBJECTIVE_DONE || kind === events_ts_1.EV.MATCH_OVER) {
            any = true;
            break;
        }
    }
    if (!any)
        return;
    if (!P) {
        let players = false;
        for (const p of sim.pilots.values())
            if (p.player >= 0) {
                players = true;
                break;
            }
        if (!players)
            return;
    } // no player: no state
    const Q = sim.progState(), d = sim.d;
    for (let k = from; k < log.next; k++) {
        const i = log.at(k), kind = log.kind[i];
        if (kind === events_ts_1.EV.POINT && log.b[i] === 2 /* PE_CAPTURED */ && sim.pts) {
            const p = log.a[i], team = log.c[i], Pt = sim.pts;
            for (const pi of sim.pilots.values()) {
                if (pi.player < 0 || pi.team !== team)
                    continue;
                const s = pi.state === 0 ? sim.idToSlot.get(pi.vehicle) : sim.idToSlot.get(pi.entity);
                if (s === undefined)
                    continue;
                if ((sim.x[s] - Pt.px[p]) ** 2 + (sim.z[s] - Pt.pz[p]) ** 2 <= Pt.area[p] ** 2)
                    Q.t(pi.player, sim.tick)[T_CAPT]++;
            }
        }
        else if (kind === events_ts_1.EV.REVIVED) {
            const pl = playerOf(sim, log.b[i]);
            if (pl >= 0)
                Q.t(pl, sim.tick)[T_REV]++;
        }
        else if (kind === events_ts_1.EV.BUILD_STARTED) {
            const cs = sim.idToSlot.get(log.d[i]);
            if (cs !== undefined && d.tDriverSeat[sim.etype[cs]] >= 0) {
                const pl = playerOf(sim, sim.occ[cs * data_ts_1.MAX_SEATS + d.tDriverSeat[sim.etype[cs]]]);
                if (pl >= 0) {
                    Q.sites.set(log.a[i], pl);
                    Q.sites = new Map([...Q.sites.entries()].sort((a, b) => a[0] - b[0]));
                }
            }
        }
        else if (kind === events_ts_1.EV.BUILD_DONE) {
            const pl = Q.sites.get(log.a[i]);
            if (pl !== undefined) {
                Q.t(pl, sim.tick)[T_BUILT]++;
                Q.sites.delete(log.a[i]);
            }
        }
        else if (kind === events_ts_1.EV.HARVEST_DELIVERED) {
            const hs = sim.idToSlot.get(log.a[i]);
            if (hs !== undefined && d.tDriverSeat[sim.etype[hs]] >= 0) {
                const pl = playerOf(sim, sim.occ[hs * data_ts_1.MAX_SEATS + d.tDriverSeat[sim.etype[hs]]]);
                if (pl >= 0)
                    Q.t(pl, sim.tick)[T_ORE] += log.v1[i];
            }
        }
        else if (kind === events_ts_1.EV.OBJECTIVE_DONE) {
            const team = log.c[i];
            if (team >= 0 && team < 4) {
                if (objectives_ts_1.SIDE_TYPES.includes(objectives_ts_1.OBJ_TYPES[log.b[i]]))
                    Q.teamSide[team]++;
                else
                    Q.teamPrim[team]++;
            }
        }
        else if (kind === events_ts_1.EV.MATCH_OVER && !Q.results)
            computeResults(sim, log.a[i]);
    }
}
function computeResults(sim, winner) {
    const Q = sim.progState(), R = sim.progRules, G = R.grading, tr = sim.d.constants.tickRate;
    for (const p of sim.pilots.values())
        if (p.player >= 0)
            Q.t(p.player, p.aliveSince > 0 ? Math.min(p.aliveSince, sim.tick) : 0);
    const out = [];
    const obj = sim.match?.objectives?.view() ?? [];
    const battleSeconds = sim.tick / tr;
    for (const [player, a] of Q.tally) {
        const pilot = [...sim.pilots.values()].find((p) => p.player === player);
        const team = pilot ? pilot.team : a[T_TEAM] > 0 ? a[T_TEAM] - 1 : 0, victory = winner === team; // QA3-7: a leaver's team at leave
        const sideTotal = obj.filter((o) => o.side && o.team === team).length;
        const sideDone = Q.teamSide[team], prim = Q.teamPrim[team];
        let held = 0, total = 0;
        if (sim.pts) {
            total = sim.pts.n;
            for (let p = 0; p < sim.pts.n; p++)
                if (sim.pts.owner[p] === team)
                    held++;
        }
        const f = {
            secondaries: sideTotal === 0 || sideDone / sideTotal >= G.secondariesFraction,
            time: battleSeconds <= G.parSeconds,
            pointsHeld: total === 0 || held / total >= G.pointsHeldFraction,
            vehiclesLost: Q.teamLost[team] <= G.vehiclesLostAtMost,
        };
        const nf = (f.secondaries ? 1 : 0) + (f.time ? 1 : 0) + (f.pointsHeld ? 1 : 0) + (f.vehiclesLost ? 1 : 0);
        const grade = !victory ? 0 : nf >= G.goldFactors ? 2 : nf >= G.silverFactors ? 1 : 0;
        const kills = a.slice(T_KILLS, T_KILLS + 7);
        const X = R.xp;
        const parts = {
            objectives: prim * X.objectivePrimary + sideDone * X.objectiveSecondary,
            kills: kills.reduce((s, v, c) => s + v * (X.killByClass[data_ts_1.ARMOUR_CLASSES[c]] ?? 0), 0),
            captures: a[T_CAPT] * X.capture, revives: a[T_REV] * X.revive, building: a[T_BUILT] * X.structureBuilt,
            repairs: a[T_REP] * X.repairPerHull, hauling: a[T_ORE] * X.haulPerOre, victory: victory ? X.victory : 0,
        };
        const raw = Object.values(parts).reduce((s, v) => s + v, 0);
        const xp = Math.round(raw * (victory ? 1 : R.defeatXp));
        const gradeSalvage = [R.salvage.bronze, R.salvage.silver, R.salvage.gold][grade] + sideDone * R.salvage.perSecondary;
        const mastery = {};
        for (const [code, v] of Q.mastery.get(player) ?? [])
            mastery[code >= 100000 ? `vehicle:${sim.d.typeIds[code - 100000]}` : `weapon:${sim.d.weaponIds[code]}`] = Math.round(v);
        out.push({
            player, team, victory, grade, gradeFactors: f, objectivesPrimary: prim, objectivesSecondary: sideDone, secondariesTotal: sideTotal,
            killsByClass: kills, captures: a[T_CAPT], revives: a[T_REV], structuresBuilt: a[T_BUILT], structuresDestroyed: kills[6],
            hullRepaired: Math.round(a[T_REP]), oreHauled: Math.round(a[T_ORE]), timeSeconds: (sim.tick - a[T_FIRST]) / tr, battleSeconds,
            pointsHeld: held, pointsTotal: total, vehiclesLost: Q.teamLost[team], xp, xpParts: parts,
            salvage: victory ? gradeSalvage : Math.round(gradeSalvage * R.defeatSalvage), mastery,
        });
    }
    Q.results = out;
    for (const r of out) {
        const kills = Math.round(r.killsByClass.reduce((s, v) => s + v, 0));
        sim.events.push(events_ts_1.EV.BATTLE_RESULT, sim.tick, r.team, r.player, r.xp, r.grade, r.victory ? 1 : 0, kills, r.captures, r.victory ? 1 : 0);
    }
}
