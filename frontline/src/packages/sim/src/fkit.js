"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FKit = void 0;
exports.fkitRules = fkitRules;
const data_ts_1 = require("./data.js");
const events_ts_1 = require("./events.js");
const flbots_ts_1 = require("./flbots.js");
const MM = data_ts_1.MAX_MOUNTS;
// Frontline stage 2: the pilot kit (design doc 4 "Player roles, loadouts and weapons").
//
// A player picks a kit before deploying: role (sniper, assault, heavy, medic), slot 1 gun (machine pistol, dual machine
// pistols, shotgun, marksman rifle, grenade launcher; each in a kinetic or a laser version), grenade type (area, high
// explosive, sticky, seeker) and armour (light, medium, heavy). Every time the player's pilot gets a body on foot the kit
// is applied to it (Sim.spawnPilotEntity):
//   mount 0  the slot 1 gun (fired with fire bit 1: key 1)
//   mount 1  the role's slot 2 weapon (fire bit 2: key 2)
//   last     the grenade (fire bit 4: key G; the pilot unit's last kit weapon)
// Ammo: every kit weapon with an `ammo` count gets that many rounds (s15 ammo records, also used by aircraft); kinetic guns
// and grenades run dry, laser guns never run out of rounds but overheat (ruling 91 heat) and burn heat cells: their ammo
// count is the shots of `cells` heat cells, shown as cells. Refilled on foot within refillRadius of a friendly Command
// Core, Barracks or forward base structure, and by resupply pods (stage 3).
// Armour: damage taken by the pilot's body x damageMul, its run speed x speedMul and its jump / jetpack x jumpMul.
// Small arms against armour: weapons listed in smallArms strip shields from anything, but do hullMul[armour class] of their
// damage to the hull once the shield is down (heavy armour and structures: none).
// The medic gun (heals: true) never damages: its hitscan picks the friendly pilot, soldier or downed pilot nearest the aim
// ray within its range; it heals healPerShot, and a downed pilot it keeps hitting for reviveShots shots stands up.
//
// State lives on this object only (solo play: not hashed or exported).
function fkitRules(d) {
    const F = d.raw.constants.frontline;
    if (!F)
        return null;
    const wi = (id) => { const i = d.weaponIds.indexOf(id); if (i < 0)
        throw new Error(`frontline kit: unknown weapon ${id}`); return i; };
    const roles = {}, guns = {}, grenades = {}, armour = {};
    for (const [k, v] of Object.entries(F.roles))
        roles[k] = { name: v.name, weapon: wi(v.weapon) };
    for (const [k, v] of Object.entries(F.guns))
        guns[k] = { name: v.name, kinetic: wi(v.kinetic), laser: wi(v.laser) };
    for (const [k, v] of Object.entries(F.grenades))
        grenades[k] = { name: v.name, weapon: wi(v.weapon) };
    for (const [k, v] of Object.entries(F.armour))
        armour[k] = { name: v.name, damageMul: v.damageMul, speedMul: v.speedMul, jumpMul: v.jumpMul };
    const heal = new Map();
    for (const [id, v] of Object.entries(F.healing ?? {}))
        heal.set(wi(id), v);
    const cellShots = new Map();
    for (const id of F.laserGuns ?? Object.values(F.guns).map((g) => g.laser)) {
        const w = wi(id);
        cellShots.set(w, 1); // Frontline: a laser's rounds are whole cells (one cell lasts until the gun overheats)
    }
    const slot3 = {};
    for (const [id, name] of Object.entries(F.slot3 ?? {}))
        slot3[id] = { name, weapon: wi(id) };
    const small = new Uint8Array(d.weaponIds.length);
    for (const id of F.smallArms)
        small[wi(id)] = 1;
    const hullMul = new Float64Array(8).fill(1);
    for (const [k, v] of Object.entries(F.smallArmsHullMul ?? {})) {
        const ac = ["infantry", "bike", "light", "medium", "heavy", "air", "structure"].indexOf(k);
        if (ac >= 0)
            hullMul[ac] = v;
    }
    const silo = F.silo ? { ...F.silo, targeter: d.weaponIds.indexOf("silo-targeter") } : null;
    const LO = F.lockOn ?? null, tr = d.constants.tickRate;
    const lock = LO ? { w: new Set((LO.weapons ?? []).map(wi)), max: LO.max ?? 4, ticks: Math.max(1, Math.round((LO.lockSeconds ?? 0.35) * tr)), cos: Math.cos(((LO.coneDegrees ?? 14) * Math.PI) / 180), gap: LO.salvoGapSeconds ?? 0.15 } : null;
    const thirdW = new Set((F.vehicleThirdFire ?? []).map(wi)); // driver extra weapons on fire bit 4 (the mech's arc lance: R)
    const SP = F.aiSpend ?? null;
    const spend = SP ? { storageAt: SP.storageAtFraction ?? 0.8, maxStorage: SP.maxStorageBuildings ?? 3, producersAt: SP.extraProducersAtFraction ?? 0.6, producers: SP.producers ?? { foundry: 3, barracks: 2 } } : null;
    const HL = F.heli ?? {};
    const heli = { boardHover: HL.boardHoverMetres ?? 20, climb: HL.climbSpeed ?? 12, climbAccel: HL.climbAccel ?? 10, brake: HL.verticalBrake ?? 10, ceiling: HL.ceilingMetres ?? 90, startDescent: HL.startDescentSpeed ?? 2, descentAccel: HL.descentAccel ?? 4, maxDescent: HL.maxDescentSpeed ?? 24, safeLanding: HL.safeLandingSpeed ?? 7, wreckLanding: HL.wreckLandingSpeed ?? 17, damagePerSpeed: HL.damagePerSpeed ?? 220 };
    const PC = F.pace ?? {}, tr0 = d.constants.tickRate, mins = (m, dflt) => Math.round((m ?? dflt) * 60 * tr0);
    const pace = { fastTicks: mins(PC.fasterWavesAfterMinutes, 8), lateWaveTicks: Math.round((PC.lateWaveSeconds ?? 30) * tr0), pushTicks: mins(PC.pushAfterMinutes, 14), suddenTicks: mins(PC.suddenDeathAfterMinutes, 22), coreDamageMul: PC.suddenDeathCoreDamageMul ?? 2,
        exchangeAt: PC.gasExchangeAbove ?? 0.6, exchangeRate: PC.gasToOre ?? 0.5, exchangePer5s: PC.gasExchangePer5s ?? 120,
        bleedTicks: mins(PC.coreBleedAfterMinutes, 18), bleedPerPoint: PC.coreBleedPerPointPer5s ?? 0.004 };
    const PF = F.pelletFalloff ?? {}, pellet = { full: PF.fullMetres ?? 20, minMul: PF.minMul ?? 0.4 };
    return { pellet, pace, swapSeconds: F.cellSwapSeconds ?? 1, spend, heli, lock, thirdW, jetEnergyMul: F.jetEnergyMul ?? 1, podNeed: F.podNeedFraction ?? 1, silo, roles, guns, grenades, armour, heal, cellShots, slot3, empty: F.slot3Empty ? wi(F.slot3Empty) : -1, calls: F.frontlineCalls ?? [], cells: F.heatCells ?? 4, small, hullMul, refillRadius: F.refillRadiusMetres ?? 40,
        refillTicks: Math.round((F.refillSeconds ?? 4) * d.constants.tickRate), defaultKit: F.defaultKit };
}
/** Frontline: mOvh value of a laser locked by overheating until its cell is swapped. */
exports.CELL_STUCK = 2 ** 30;
class FKit {
    R;
    /** player -> kit {role, gun, laser, grenade, armour} */
    kits = new Map();
    /** pilot id -> medic shots taken while downed */
    revive = new Map();
    /** Per type: 1 = a building that refills pilots on foot (effects.pilotEnergyRefill: Barracks, Command Core, Field Depot). */
    refill;
    /** Weapon index of the empty slot 3 mount. */
    emptyW = -1;
    /** pilot id -> slot 3 weapon carried (from the pod; until its rounds run out or the pilot dies). */
    carried = new Map();
    /** Per team: the live missile silo {eid, reloadUntil} (one per team). */
    silos = new Map();
    /** Silo strikes on their way: {team, x, z, launch, impact, pilot}. */
    strikes = [];
    /** pilot id -> entity id of its last dropped vehicle (one alive at a time). */
    dropped = new Map();
    /** Resupply pods on the ground: {x, z, team, left, until}. */
    pods = [];
    /** Reinforcement flights: {mule, x, z, team, until}. */
    reinf = [];
    constructor(sim) {
        this.sim = sim;
        this.R = fkitRules(sim.d);
        const AP = sim.d.raw.constants.frontline?.aiPilots; // 4c: AI teammates and Hegemony pilots (allies, enemies; off when both 0)
        this.bots = AP && (AP.allies > 0 || AP.enemies > 0) && !sim.noFlBots ? new flbots_ts_1.FlBots(AP) : null;
        this.emptyW = this.R.empty;
        const d = sim.d, nu = d.unitCount;
        this.refill = new Uint8Array(d.typeIds.length);
        d.raw.buildings.forEach((b, i) => { if (b.effects?.pilotEnergyRefill)
            this.refill[nu + i] = 1; });
    }
    /** The player's kit (the default kit until one is set). */
    kitOf(player) { return this.kits.get(player) ?? this.R.defaultKit; }
    /** Sets player's kit; a body on foot gets it at once. Returns false for an unknown choice. */
    setKit(sim, player, k) {
        const R = this.R;
        const prev = this.kitOf(player);
        const kit = { role: k.role, gun: k.gun, laser: !!k.laser, grenade: k.grenade, armour: k.armour, slot3: R.slot3[k.slot3] ? k.slot3 : prev.slot3,
            calls: Array.isArray(k.calls) ? k.calls.filter((c, i, a) => R.calls.includes(c) && a.indexOf(c) === i).slice(0, 4) : prev.calls };
        if (!R.roles[kit.role] || !R.guns[kit.gun] || !R.grenades[kit.grenade] || !R.armour[kit.armour])
            return false;
        this.kits.set(player, kit);
        // the call-down loadout: the 4 picks (the slot 3 pod is the fixed slot)
        if (sim.callRules && kit.calls)
            for (const p of sim.pilots.values())
                if (p.player === player) {
                    const idx = kit.calls.map((id) => sim.callRules.ids.indexOf(id)).filter((i) => i >= 0 && !sim.callRules.fixed.includes(i));
                    sim.callState().caller(p.id).loadout = idx;
                }
        for (const p of sim.pilots.values())
            if (p.player === player && p.state === 1) {
                const s = sim.idToSlot.get(p.entity);
                if (s !== undefined)
                    this.onBody(sim, p.id, s);
            }
        return true;
    }
    playerOf(sim, pilotId) { const p = sim.pilots.get(pilotId); return p ? p.player : -1; }
    /** A player pilot's body on foot at slot s: kit weapons on mounts 0, 1 and 3, full ammo. */
    onBody(sim, pilotId, s) {
        const pl = this.playerOf(sim, pilotId);
        if (pl < 0)
            return;
        const R = this.R, k = this.kitOf(pl), b = s * MM;
        const gun = R.guns[k.gun];
        sim.mWeapon[b + 0] = k.laser ? gun.laser : gun.kinetic;
        if (sim.mCount[s] > 1)
            sim.mWeapon[b + 1] = R.roles[k.role].weapon;
        if (sim.mCount[s] > 2) // the last mount: the grenade (the demo charge is planted, not a mount)
            sim.mWeapon[b + sim.mCount[s] - 1] = R.grenades[k.grenade].weapon;
        if (sim.mCount[s] > 3) // mount 2: the slot 3 weapon while one is carried
            sim.mWeapon[b + 2] = this.carried.get(pilotId) ?? this.emptyW;
        for (let m = 0; m < sim.mCount[s]; m++) {
            sim.cooldown[b + m] = 0;
            sim.mHeat[b + m] = 0;
        }
        // the rounds left carry over while the pilot lives (in and out of vehicles); a new life or a new kit fills them
        const sig = `${k.role}/${k.gun}/${k.laser}/${k.grenade}/${this.carried.get(pilotId) ?? -1}`, kept = this.pAmmo.get(pilotId);
        if (kept && kept.sig === sig && kept.life === this.lifeOf(sim, pilotId))
            sim.s15State().ammo.set(sim.eid[s], kept.am);
        else {
            this.fill(sim, s);
            const am = sim.s15State().ammo.get(sim.eid[s]);
            if (am)
                this.pAmmo.set(pilotId, { sig, life: this.lifeOf(sim, pilotId), am });
        }
    }
    /** pilot id -> {sig, life, am}: the rounds of the pilot's kit (the same array as its body's s15 ammo record). */
    pAmmo = new Map();
    /** Deaths of a pilot so far (a respawn is a new life). */
    deaths = new Map();
    lifeOf(sim, pilotId) { return this.deaths.get(pilotId) ?? 0; }
    /** A pilot died (Sim pilot death): its next body gets full rounds. */
    onDeath(pilotId) { this.deaths.set(pilotId, (this.deaths.get(pilotId) ?? 0) + 1); this.revive.delete(pilotId); this.pending.add(pilotId); this.carried.delete(pilotId); }
    /** The slot 3 weapon a pod gives pilot pilotId (its kit's choice; `dflt` for a pilot without a kit). */
    /**
     * Designer 19 Nov ("slot 3 weapons should have a recharge time; the lowest ammo counts the shortest, the highest the
     * most"): the slot 3 call's recharge (ticks) for the pilot's chosen weapon (constants.frontline.slot3RechargeSeconds),
     * or null to keep the call's own cooldown.
     */
    slot3Recharge(sim, pilotId) {
        const T = sim.d.raw.constants.frontline?.slot3RechargeSeconds, pl = this.playerOf(sim, pilotId), k = pl >= 0 ? this.kitOf(pl) : null;
        const sec = T && k ? T[k.slot3] : undefined;
        return typeof sec === "number" ? Math.round(sec * sim.d.constants.tickRate) : null;
    }
    slot3Of(sim, pilotId, dflt) {
        const pl = this.playerOf(sim, pilotId);
        const k = pl >= 0 ? this.kitOf(pl) : null;
        return k && this.R.slot3[k.slot3] ? this.R.slot3[k.slot3].weapon : dflt;
    }
    /** A pod's slot 3 weapon w goes on mount 2 of body s, with full rounds (lasers: heat cells). */
    giveSlot3(sim, pilotId, s, w) {
        const SR = this.R.silo;
        if (SR && w === SR.targeter) { // the missile silo: it sits in the ground where the pod dropped; the pilot keeps the targeter
            const team = sim.team[s], cur = this.silos.get(team), cs = cur ? sim.idToSlot.get(cur.eid) : undefined;
            if (cs === undefined || !sim.alive[cs] || sim.hp[cs] <= 0) {
                let id = 0;
                try {
                    const r = sim.spawnUnit(SR.structure, team, sim.clampMap(sim.x[s] + 8), sim.clampMap(sim.z[s] + 8));
                    id = typeof r === "number" ? r : r && r.ids ? r.ids[0] : 0;
                }
                catch { /* no room: no silo */ }
                if (id)
                    this.silos.set(team, { eid: id, reloadUntil: 0 });
            }
        }
        this.carried.set(pilotId, w);
        const b = s * MM;
        sim.mWeapon[b + 2] = w;
        sim.cooldown[b + 2] = 0;
        sim.mHeat[b + 2] = 0;
        const am = sim.s15State().ammo.get(sim.eid[s]);
        if (am && am.length > 2) {
            const f = this.full(sim.d, w);
            am[2] = f > 0 ? f : -1;
            const kept = this.pAmmo.get(pilotId);
            if (kept) {
                kept.sig = kept.sig.replace(/\/[-0-9]+$/, `/${w}`);
                kept.am = am;
            }
        }
        else
            this.onBody(sim, pilotId, s);
    }
    // ---- resupply pods: each container refills one pilot's rounds, heat cells, energy and jetpack
    addPod(sim, x, z, count, team) {
        this.pods.push({ x, z, team, left: count, until: sim.tick + 150 * sim.d.constants.tickRate });
        return count;
    }
    podStep(sim) {
        if (!this.pods.length)
            return;
        const c = sim.d.crew, S = sim.s15State();
        for (const pod of this.pods) {
            for (const p of sim.pilots.values()) {
                if (pod.left <= 0 || p.team !== pod.team || p.state !== 1)
                    continue;
                const s = sim.idToSlot.get(p.entity);
                if (s === undefined || sim.hp[s] <= 0)
                    continue;
                const dx = sim.x[s] - pod.x, dz = sim.z[s] - pod.z;
                if (dx * dx + dz * dz > 6 * 6)
                    continue;
                const am = S.ammo.get(sim.eid[s]);
                // a container opens only for a pilot who is properly low on something (podNeed of full): firing a weapon
                // beside the pod no longer burns a container (and refills the jetpack) on every shot
                const k = this.R.podNeed;
                let need = c && (sim.energy[s] < c.energyMax * k || sim.jetFuel[s] < c.jetFreeBurnSeconds * k);
                if (am)
                    for (let m = 0; m < am.length; m++)
                        if (am[m] >= 0 && am[m] < this.full(sim.d, sim.mWeapon[s * MM + m]) * k)
                            need = true;
                if (!need)
                    continue;
                if (am)
                    for (let m = 0; m < am.length; m++)
                        if (am[m] >= 0)
                            am[m] = this.full(sim.d, sim.mWeapon[s * MM + m]);
                if (c) {
                    sim.energy[s] = c.energyMax;
                    sim.jetFuel[s] = c.jetFreeBurnSeconds;
                }
                pod.left--;
                sim.events.push(events_ts_1.EV.CALL_EFFECT, sim.tick, pod.team, 0, p.id, 0, pod.left, pod.x, pod.z, 5);
            }
        }
        this.pods = this.pods.filter((q) => q.left > 0 && sim.tick < q.until);
    }
    // ---- reinforcements: a Mule from the base flies AI troops to the beacon
    reinforce(sim, team, x, z) {
        let core = -1;
        for (let o = 0; o < sim.hi; o++)
            if (sim.alive[o] && sim.hp[o] > 0 && sim.team[o] === team && sim.tCore && sim.tCore[sim.etype[o]])
                core = o;
        if (core < 0)
            return 0;
        // the Mule comes in from the base's side, at most 450 m out (the flight from the Core itself took up to a minute)
        const hx = sim.x[core] + 30, hz = sim.z[core] - 30, dx = x - hx, dz = z - hz, L = Math.hypot(dx, dz) || 1, k = Math.min(L, 450) / L;
        const r = sim.spawnUnit("mule", team, sim.clampMap(x - dx * k), sim.clampMap(z - dz * k));
        const mule = typeof r === "number" ? r : r && r.ids ? r.ids[0] : 0;
        if (!mule)
            return 0;
        sim.queueOrder(sim.tick + 1, [mule], { type: "move", x, z }, team);
        this.reinf.push({ mule, x, z, team, home: [hx, hz], until: sim.tick + 60 * sim.d.constants.tickRate });
        return mule;
    }
    reinfStep(sim) {
        if (!this.reinf.length)
            return;
        const keep = [], tr = sim.d.constants.tickRate;
        for (const f of this.reinf) {
            const ms = sim.idToSlot.get(f.mule);
            if (ms === undefined || !sim.alive[ms] || sim.hp[ms] <= 0) {
                this.parked.delete(f.mule);
                continue; // shot down: the troops are lost
            }
            const dx = sim.x[ms] - f.x, dz = sim.z[ms] - f.z;
            if (!f.phase) { // inbound: once over the drop point (or out of time), it comes down
                if (dx * dx + dz * dz > 30 * 30 && sim.tick < f.until) {
                    keep.push(f);
                    continue;
                }
                f.phase = "land";
                f.lx = sim.x[ms];
                f.lz = sim.z[ms];
                this.parked.add(f.mule); // the air movement brings it down to the ground and keeps it there
                sim.queueOrder(sim.tick + 1, [f.mule], { type: "move", x: sim.x[ms], z: sim.z[ms] }, f.team);
                keep.push(f);
                continue;
            }
            sim.x[ms] = f.lx; // held over / on its landing spot until it leaves
            sim.z[ms] = f.lz;
            sim.velX[ms] = 0;
            sim.velZ[ms] = 0;
            if (f.phase === "land") { // on the ground: the troops come out of both side doors and walk clear
                if (sim.flyAlt[ms] > 0.05 && sim.tick < f.until + 20 * tr) {
                    keep.push(f);
                    continue;
                }
                const c = sim.dirX[ms], sn = sim.dirZ[ms];
                for (const [k, id] of ["trooper-squad", "sapper-team"].entries()) {
                    const side = k ? -1 : 1, ex = sim.x[ms] - sn * side * 3.2, ez = sim.z[ms] + c * side * 3.2;
                    const r = sim.trySpawnUnit(id, f.team, sim.clampMap(ex), sim.clampMap(ez), { crew: "none" });
                    const ids = (r && r.ok && r.ids) || [];
                    for (const u of ids)
                        this.held.set(u, sim.tick + 60 * tr); // they hold the drop point for a minute (not sent down a lane)
                    if (ids.length)
                        sim.queueOrder(sim.tick + 1, ids, { type: "move", x: sim.clampMap(sim.x[ms] - sn * side * 14), z: sim.clampMap(sim.z[ms] + c * side * 14) }, f.team);
                }
                sim.events.push(events_ts_1.EV.CALL_EFFECT, sim.tick, f.team, 0, 0, 0, 0, sim.x[ms], sim.z[ms], 7); // landed (sub 7)
                f.phase = "unload";
                f.leaveAt = sim.tick + 5 * tr;
                keep.push(f);
                continue;
            }
            if (sim.tick < f.leaveAt) {
                keep.push(f);
                continue;
            }
            this.parked.delete(f.mule); // lifts off and flies home
            sim.queueOrder(sim.tick + 1, [f.mule], { type: "move", x: f.home[0], z: f.home[1] }, f.team);
        }
        this.reinf = keep;
    }
    // ---- respawn by air: a respawned player pilot is flown by an AI Mule to the front of the lane it chose
    /** Lane chosen for the next respawn (0 top, 1 mid, 2 bottom). */
    lane = 1;
    /** Pilots that died and still need a ride once they respawn. */
    pending = new Set();
    /** 4c: pilot id -> the lane its Mule takes it to (AI pilots); the player's choice is `lane`. */
    laneOf = new Map();
    /** pilot id -> {mule, drop: [x, z], until} */
    ferry = new Map();
    /** The drop point on lane i for team 0: the furthest waypoint with own units near and no enemy within 260 m. */
    dropPoint(sim, team, lane) {
        const L = sim.lanes, wps = L.path(team, lane);
        let best = 1;
        for (let k = 1; k < wps.length - 1; k++) {
            const [x, z] = wps[k];
            let own = 0, foe = 0;
            for (let o = 0; o < sim.hi; o++) {
                if (!sim.alive[o] || sim.hp[o] <= 0 || sim.d.tStructure[sim.etype[o]] && sim.team[o] === team)
                    continue;
                const dx = sim.x[o] - x, dz = sim.z[o] - z, d2 = dx * dx + dz * dz;
                if (sim.team[o] === team && d2 < 220 * 220)
                    own++;
                else if (sim.team[o] !== team && sim.team[o] < 4 && d2 < 260 * 260)
                    foe++;
            }
            if (foe > 0)
                break;
            if (own > 0)
                best = k;
        }
        return wps[best];
    }
    ferryStep(sim) {
        if (!sim.lanes)
            return;
        for (const pid of [...this.pending]) {
            const p = sim.pilots.get(pid);
            if (!p || p.player < 0) {
                this.pending.delete(pid);
                continue;
            }
            if (p.state !== 1)
                continue; // still dead (or already in a seat)
            this.pending.delete(pid);
            if (p.player < 100 && this.respawnInCore(sim, p))
                continue; // designer 21 Nov: a player respawns inside the Command Core (loadout, then the drop pod), no lane ride
            const lane = this.laneOf.get(pid) ?? this.lane; // 4c: an AI pilot rides to its own lane
            if (lane === 3)
                continue; // lane 3: the player chose to stay at the Command Core (no ride)
            const s = sim.idToSlot.get(p.entity);
            if (s === undefined)
                continue;
            const r = sim.spawnUnit("mule", p.team, sim.x[s] + 9, sim.z[s]);
            const mule = typeof r === "number" ? r : r && r.ids ? r.ids[0] : 0;
            if (!mule)
                continue;
            const ms0 = sim.idToSlot.get(mule); // the pilot steps up to the Mule's door
            if (ms0 !== undefined) {
                sim.x[s] = sim.x[ms0];
                sim.z[s] = sim.z[ms0] + sim.d.tRadius[sim.etype[ms0]] + sim.d.tRadius[sim.etype[s]] + 0.5;
                sim.y[s] = sim.y[ms0];
            }
            // a passenger seat inside the cabin (not a door gun)
            let seat;
            const mt = sim.etype[sim.idToSlot.get(mule)];
            for (let j = 0; j < sim.d.tSeatCount[mt] && seat === undefined; j++)
                if (sim.d.tSeatRole[mt * data_ts_1.MAX_SEATS + j] === data_ts_1.SEAT_PASSENGER)
                    seat = j;
            const e = sim.enter(pid, mule, seat, p.team);
            if (!e.ok) {
                const ms = sim.idToSlot.get(mule);
                if (ms !== undefined)
                    sim.hp[ms] = 0;
                continue;
            }
            const drop = this.dropPoint(sim, p.team, lane), tr = sim.d.constants.tickRate;
            // designer 21 Nov: a player's Mule waits at the Core while the loadout screen is up (ferryGo on its confirm, or 20 s)
            const wait = false; // (21 Nov, later) the loadout is changed inside the Core now (its drop pod): the Mule leaves at once
            this.ferry.set(pid, { mule, drop, until: sim.tick + 120 * tr, go: !wait, waitUntil: sim.tick + 20 * tr });
            if (!wait)
                sim.queueOrder(sim.tick + 1, [mule], { type: "move", x: drop[0], z: drop[1] }, p.team);
                    }
        for (const [pid, f] of [...this.ferry]) {
            const p = sim.pilots.get(pid), ms = sim.idToSlot.get(f.mule);
            if (!p || ms === undefined || !sim.alive[ms] || p.state !== 0 || p.vehicle !== f.mule) {
                this.ferry.delete(pid);
                if (ms !== undefined && sim.alive[ms])
                    this.sendHome(sim, f.mule, p ? p.team : sim.team[ms]); // the rider got out early: the Mule still leaves
                continue;
            }
            if (!f.go) {
                if (sim.tick < f.waitUntil && !this.goNow.has(pid))
                    continue;
                this.goNow.delete(pid);
                f.go = true;
                f.until = sim.tick + 120 * sim.d.constants.tickRate;
                sim.queueOrder(sim.tick + 1, [f.mule], { type: "move", x: f.drop[0], z: f.drop[1] }, p.team);
                continue;
            }
            const dx = sim.x[ms] - f.drop[0], dz = sim.z[ms] - f.drop[1];
            if (dx * dx + dz * dz > 70 * 70 && sim.tick < f.until)
                continue;
            this.ferry.delete(pid);
            if (!sim.exit(pid, p.team).ok)
                continue;
            const bs = sim.idToSlot.get(p.entity); // set down on the ground beside the Mule (no fall)
            if (bs !== undefined) {
                sim.y[bs] = sim.terrain.height(sim.x[bs], sim.z[bs]);
                sim.velY[bs] = 0;
                sim.airborne[bs] = 0;
            }
            this.sendHome(sim, f.mule, p.team); // the Mule flies home and is gone (designer 21 Nov: no empty Mules piling up)
        }
        // homebound ferry Mules: removed (quietly, no wreck) once home or after HOME_SECONDS; one a player took over stays
        for (const [mule, h] of [...this.homebound]) {
            const ms = sim.idToSlot.get(mule);
            if (ms === undefined || !sim.alive[ms] || sim.hp[ms] <= 0) {
                this.homebound.delete(mule);
                continue;
            }
            let player = false;
            for (let j = 0; j < sim.d.tSeatCount[sim.etype[ms]]; j++) {
                const q = sim.pilots.get(sim.occ[ms * data_ts_1.MAX_SEATS + j]);
                if (q && q.player >= 0)
                    player = true;
            }
            if (player) {
                this.homebound.delete(mule);
                continue;
            }
            const dx = sim.x[ms] - h.x, dz = sim.z[ms] - h.z;
            if (dx * dx + dz * dz > 60 * 60 && sim.tick < h.until)
                continue;
            this.homebound.delete(mule);
            sim.quietRemove(ms);
        }
    }
    /**
     * Designer 21 Nov: the Command Core's drop pod. A player pilot inside its own Core (sheltered) picks a spot on ground
     * its team controls (within DROP_REACH m of an owned strategic point's area or of one of its structures); a rocket leaves
     * the silo on the back of the Core, and DROP_TICKS later the pod lands there and lets the pilot out.
     * drops: {pid, team, sx, sz (silo), x, z, launch, land}.
     */
    drops = [];
    static DROP_REACH = 100;
    static DROP_SECONDS = 6.5;
    /** The silo on the back of Core slot cs (world x, z): the meshes put it there too (meshes.ts command-core). */
    siloAt(sim, cs) {
        const back = sim.d.tRadius[sim.etype[cs]] * 1.9;
        return [sim.x[cs] - sim.dirX[cs] * back, sim.z[cs] - sim.dirZ[cs] * back];
    }
    /** May `team` drop a pod at (x, z)? */
    dropOk(sim, team, x, z) {
        if (!(x >= 0 && z >= 0 && x <= sim.mapSize && z <= sim.mapSize))
            return false;
        const R = FKit.DROP_REACH, P = sim.pts;
        if (P)
            for (let i = 0; i < P.n; i++)
                if (P.owner[i] === team && Math.hypot(P.px[i] - x, P.pz[i] - z) <= P.area[i] + R)
                    return true;
        for (let o = 0; o < sim.hi; o++)
            if (sim.alive[o] && sim.hp[o] > 0 && sim.team[o] === team && sim.d.tStructure[sim.etype[o]] && Math.hypot(sim.x[o] - x, sim.z[o] - z) <= sim.d.tRadius[sim.etype[o]] + R)
                return true;
        return false;
    }
    dropping(pilotId) { return this.drops.some((q) => q.pid === pilotId); }
    /** Launch: pilot inside its own Command Core, a valid spot. Returns a reject reason or "". */
    launchDrop(sim, pilotId, x, z) {
        const p = sim.pilots.get(pilotId);
        if (!p || p.player < 0 || p.state !== 4 || p.seat >= 0)
            return "notSheltered";
        const cs = sim.idToSlot.get(p.vehicle);
        if (cs === undefined || !sim.alive[cs] || !(sim.tCore && sim.tCore[sim.etype[cs]]))
            return "notAtCore";
        if (this.dropping(pilotId))
            return "dropping";
        if (!this.dropOk(sim, p.team, x, z))
            return "notControlled";
        const [sx, sz] = this.siloAt(sim, cs), tr = sim.d.constants.tickRate;
        this.drops.push({ pid: pilotId, team: p.team, sx, sz, x, z, launch: sim.tick, land: sim.tick + Math.round(FKit.DROP_SECONDS * tr) });
        return "";
    }
    dropStep(sim) {
        if (!this.drops.length)
            return;
        this.drops = this.drops.filter((q) => {
            if (sim.tick < q.land)
                return true;
            const p = sim.pilots.get(q.pid);
            if (p && p.state === 4)
                sim.dropOut(p, q.x, q.z);
            return false;
        });
    }
    /** A respawned player pilot goes straight inside its team's Command Core. */
    respawnInCore(sim, p) {
        const b = sim.idToSlot.get(p.entity);
        if (b === undefined)
            return false;
        let core = -1, best = Infinity;
        for (let o = 0; o < sim.hi; o++)
            if (sim.alive[o] && sim.hp[o] > 0 && sim.team[o] === p.team && sim.tCore && sim.tCore[sim.etype[o]]) {
                const d = Math.hypot(sim.x[o] - sim.x[b], sim.z[o] - sim.z[b]);
                if (d < best) {
                    best = d;
                    core = o;
                }
            }
        if (core < 0)
            return false;
        const off = sim.d.tRadius[sim.etype[core]] + sim.d.tRadius[sim.etype[b]] + 0.5;
        sim.x[b] = sim.x[core] + sim.dirX[core] * off;
        sim.z[b] = sim.z[core] + sim.dirZ[core] * off;
        sim.y[b] = sim.terrain.height(sim.x[b], sim.z[b]);
        return sim.enterShelter(p.id, sim.eid[core], p.team).ok;
    }
    /** Pilots whose loadout was confirmed at the Core: their waiting ferry Mule takes off on the next step (21 Nov). */
    goNow = new Set();
    ferryGo(pilotId) { if (this.ferry.has(pilotId) && !this.ferry.get(pilotId).go)
        this.goNow.add(pilotId); }
    /** mule id -> {x, z, until}: ferry Mules on their way back to the Core, removed there (21 Nov). */
    homebound = new Map();
    sendHome(sim, mule, team) {
        let core = -1;
        for (let o = 0; o < sim.hi; o++)
            if (sim.alive[o] && sim.team[o] === team && sim.tCore && sim.tCore[sim.etype[o]])
                core = o;
        const tr = sim.d.constants.tickRate;
        if (core < 0) { // no Core to fly to: it lifts off and is gone shortly
            const ms = sim.idToSlot.get(mule);
            this.homebound.set(mule, { x: ms !== undefined ? sim.x[ms] : 0, z: ms !== undefined ? sim.z[ms] : 0, until: sim.tick + 8 * tr });
            return;
        }
        const x = sim.x[core] + 40, z = sim.z[core] - 40;
        sim.queueOrder(sim.tick + 1, [mule], { type: "move", x, z }, team);
        this.homebound.set(mule, { x, z, until: sim.tick + 75 * tr });
    }
    /** Full rounds on every limited mount of body s (ammo record created when missing). */
    fill(sim, s) {
        const d = sim.d, b = s * MM, v = [];
        let any = false;
        for (let m = 0; m < sim.mCount[s]; m++) {
            const w = sim.mWeapon[b + m];
            const a = w >= 0 ? this.full(d, w) : 0;
            v.push(a > 0 ? a : -1);
            if (a > 0)
                any = true;
        }
        if (any)
            sim.s15State().ammo.set(sim.eid[s], v);
    }
    /** Rounds in a full load of weapon w (lasers: the shots of R.cells heat cells; 0 unlimited). */
    full(d, w) {
        const c = this.R.cellShots.get(w);
        if (c !== undefined)
            return c * this.R.cells;
        return d.wAmmo[w] > 0 ? d.wAmmo[w] : 0;
    }
    /** Shots per heat cell of laser weapon w (0: not a laser gun of the kit). */
    cellShots(w) { return this.R.cellShots.get(w) ?? 0; }
    /** Armour of the player pilot whose body is slot s (null: not a kit body). */
    armourOf(sim, s) {
        const pid = sim.slotPilot[s];
        if (pid === 0 || sim.etype[s] !== sim.d.pilotType)
            return null;
        const pl = this.playerOf(sim, pid);
        return pl < 0 ? null : this.R.armour[this.kitOf(pl).armour];
    }
    damageMul(sim, s) {
        if (sim.tCore && sim.tCore[sim.etype[s]] && sim.lanes && sim.lanes.phase(sim) >= 3)
            return this.R.pace.coreDamageMul; // 4d: sudden death
        const a = this.armourOf(sim, s);
        return a ? a.damageMul : 1;
    }
    speedMul(sim, s) { const a = this.armourOf(sim, s); return a ? a.speedMul : 1; }
    jumpMul(sim, s) { const a = this.armourOf(sim, s); return a ? a.jumpMul : 1; }
    /** Hull damage fraction of small-arms weapon w on slot e once its shield is down (1: not small arms). */
    hullMul(sim, e, w) {
        if (!this.R.small[w])
            return 1;
        const d = sim.d, t = sim.etype[e];
        return this.R.hullMul[d.tStructure[t] ? 6 : d.tArmour[t]];
    }
    isHeal(w) { return this.R.heal.has(w); }
    isTargeter(w) { return !!this.R.silo && w === this.R.silo.targeter; }
    /** The silo targeter: marks the ground under the aim ray; the team's silo launches after the lock time. */
    fireTargeter(sim, s, sx, sy, sz, dx, dy, dz) {
        const SR = this.R.silo, team = sim.team[s], tr = sim.d.constants.tickRate;
        sim.lastFired[s] = sim.tick;
        const silo = this.silos.get(team), ss = silo ? sim.idToSlot.get(silo.eid) : undefined;
        if (!silo || ss === undefined || !sim.alive[ss] || sim.hp[ss] <= 0 || sim.tick < silo.reloadUntil || this.strikes.some((k) => k.team === team))
            return 1; // no silo, reloading, or one already on its way
        let hx = NaN, hz = NaN;
        for (let t = 5; t <= 3000; t += 4) {
            const x = sx + dx * t, y = sy + dy * t, z = sz + dz * t;
            if (x < 0 || z < 0 || x > sim.mapSize || z > sim.mapSize)
                break;
            if (y <= sim.terrain.height(x, z)) {
                hx = x;
                hz = z;
                break;
            }
        }
        if (!Number.isFinite(hx))
            return 1; // aimed at the sky
        const launch = sim.tick + Math.round(SR.lockSeconds * tr), impact = launch + Math.round(SR.flightSeconds * tr);
        this.strikes.push({ team, x: hx, z: hz, launch, impact, pilot: sim.slotPilot[s], warned: false });
        silo.reloadUntil = impact + Math.round(SR.reloadSeconds * tr);
        // the beacon the client draws (the precision strike's marker) shows where it will land
        const ci = sim.callRules ? sim.callRules.ids.indexOf("precision-strike") : -1;
        sim.events.push(events_ts_1.EV.CALL_QUEUED, sim.tick, team, 0, sim.slotPilot[s], ci, impact - sim.tick, hx, hz, 0);
        return 1;
    }
    strikeStep(sim) {
        if (!this.strikes.length)
            return;
        const SR = this.R.silo, keep = [];
        for (const k of this.strikes) {
            if (sim.tick < k.impact) {
                keep.push(k);
                continue;
            }
            const ci = sim.callRules ? sim.callRules.ids.indexOf("precision-strike") : -1;
            const n = sim.callArea(k.x, k.z, SR.radiusMetres, SR.damage, "explosive", k.team, k.pilot);
            sim.events.push(events_ts_1.EV.CALL_IMPACT, sim.tick, k.team, 0, k.pilot, ci, n, k.x, k.z, 0);
        }
        this.strikes = keep;
    }
    /** Medic gun shot from slot s along (dx, dy, dz) from (sx, sy, sz). Returns 1 (a shot was spent). */
    fireHeal(sim, s, w, sx, sy, sz, dx, dy, dz) {
        const H = this.R.heal.get(w), d = sim.d, team = sim.team[s], range = d.wRange[w];
        let best = -1, bt = Infinity;
        for (let o = 0; o < sim.hi; o++) {
            if (o === s || !sim.alive[o] || sim.team[o] !== team)
                continue;
            const t = sim.etype[o];
            if (d.tArmour[t] !== 0 || d.tStructure[t])
                continue; // pilots and soldiers only
            const r = d.tRadius[t] + 1.5;
            const cx = sim.x[o] - sx, cy = sim.y[o] + d.tRadius[t] - sy, cz = sim.z[o] - sz;
            const along = cx * dx + cy * dy + cz * dz;
            if (along < 0 || along > range)
                continue;
            const px = cx - dx * along, py = cy - dy * along, pz = cz - dz * along;
            if (px * px + py * py + pz * pz > r * r)
                continue;
            if (along < bt) {
                bt = along;
                best = o;
            }
        }
        sim.lastFired[s] = sim.tick;
        if (best < 0)
            return 1;
        const pid = sim.slotPilot[best], p = pid ? sim.pilots.get(pid) : undefined;
        if (p && p.state === 3) { // downed: revive after reviveShots hits
            const n = (this.revive.get(pid) ?? 0) + 1;
            if (n < H.reviveShots) {
                this.revive.set(pid, n);
                return 1;
            }
            this.revive.delete(pid);
            p.state = 1;
            sim.hp[best] = sim.bodyMaxHp(best) * (sim.kitRules ? sim.kitRules.reviveHpFrac : 0.5);
            sim.shield[best] = 0;
            sim.lastHit[best] = sim.tick;
            const k = sim.kit ? sim.kit.pilots.get(pid) : undefined;
            if (k) {
                k.downedUntil = 0;
                k.reviver = 0;
                k.reviveStart = 0;
            }
            sim.events.push(events_ts_1.EV.REVIVED, sim.tick, p.team, p.id, sim.slotPilot[s], sim.eid[best], 0, 0, 0, events_ts_1.F_PLAYER);
            return 1;
        }
        if (sim.hp[best] <= 0)
            return 1;
        const max = sim.slotPilot[best] ? sim.bodyMaxHp(best) : d.tHp[sim.etype[best]];
        sim.hp[best] = Math.min(max, sim.hp[best] + H.healPerShot);
        return 1;
    }
    /** Per tick: ammo refill on foot beside a friendly refill building. */
    /**
     * Designer 19 Nov ("for all ships with multiple positions a default AI gunner should occupy the empty slot"): a vehicle
     * driven by a player or an AI teammate / Hegemony pilot gets an AI gunner in each empty gunner seat (twice a second).
     * They are ordinary seated AI pilots (ruling 19): a player can still take a gunner seat from one (X).
     */
    gunnerStep(sim) {
        const d = sim.d, M = data_ts_1.MAX_SEATS;
        if (!d.crewOn)
            return;
        for (const p of sim.pilots.values()) {
            if (p.player < 0 || p.state !== 0 || p.vehicle === 0 || p.seat < 0)
                continue; // a player's or an AI teammate's / Hegemony pilot's own seat (P_SEATED)
            const s = sim.idToSlot.get(p.vehicle);
            if (s === undefined || !sim.alive[s] || sim.hp[s] <= 0)
                continue;
            const t = sim.etype[s];
            if (d.tDriverSeat[t] !== p.seat)
                continue; // only the driver's vehicle gets gunners (a player in a gunner seat keeps the vehicle as it is)
            let added = 0;
            for (let j = 0; j < d.tSeatCount[t]; j++) {
                if (d.tSeatRole[t * M + j] !== data_ts_1.SEAT_GUNNER || sim.occ[s * M + j] !== 0)
                    continue;
                const g = sim.newPilot(sim.team[s], -1, 0);
                g.state = 0; // P_SEATED
                g.vehicle = p.vehicle;
                g.seat = j;
                sim.occ[s * M + j] = g.id;
                added++;
            }
            if (added) {
                sim.recomputeCrew(s);
                this.gunnersAdded = (this.gunnersAdded ?? 0) + added;
            }
        }
    }
    step(sim) {
        if (this.bots)
            this.bots.step(sim); // Frontline 4c: the AI pilots' brains
        if (sim.tick % (5 * sim.d.constants.tickRate) === 0)
            this.exchangeStep(sim);
        this.ferryStep(sim);
        this.dropStep(sim);
        this.podStep(sim);
        this.reinfStep(sim);
        this.siteStep(sim);
        this.slot3Step(sim);
        this.strikeStep(sim);
        if (sim.tick % 10 === 5)
            this.gunnerStep(sim);
        const R = this.R, S = sim.s15;
        if (S === null || (sim.tick % 10) !== 0)
            return;
        for (const p of sim.pilots.values()) {
            if (p.player < 0 || p.state !== 1)
                continue;
            const s = sim.idToSlot.get(p.entity);
            const am = s === undefined ? undefined : S.ammo.get(sim.eid[s]);
            if (!am)
                continue;
            if (!this.nearRefill(sim, s))
                continue;
            for (let m = 0; m < am.length; m++) {
                if (am[m] < 0)
                    continue;
                const f = this.full(sim.d, sim.mWeapon[s * MM + m]);
                am[m] = Math.min(f, am[m] + (f * 10) / R.refillTicks);
            }
        }
        // a called-down vehicle (the gunship's rocket pods) rearms the same way beside a refill building
        for (const vid of this.dropped.values()) {
            const vs = sim.idToSlot.get(vid), am = vs === undefined ? undefined : S.ammo.get(vid);
            if (!am || !sim.alive[vs] || !this.nearRefill(sim, vs))
                continue;
            for (let m = 0; m < am.length; m++) {
                if (am[m] < 0)
                    continue;
                const f = sim.d.wAmmo[sim.mWeapon[vs * MM + m]];
                if (f > 0)
                    am[m] = Math.min(f, am[m] + (f * 10) / R.refillTicks);
            }
        }
    }
    /** A slot 3 weapon whose rounds ran out is gone (the mount goes back to empty). */
    slot3Step(sim) {
        if (!this.carried.size || sim.tick % 10 !== 0)
            return;
        for (const [pid, w] of [...this.carried]) {
            const p = sim.pilots.get(pid);
            if (!p || p.state !== 1)
                continue;
            const s = sim.idToSlot.get(p.entity), am = s === undefined ? undefined : sim.s15State().ammo.get(sim.eid[s]);
            if (am && am[2] !== undefined && am[2] >= 0 && am[2] < 1) {
                this.carried.delete(pid);
                sim.mWeapon[s * MM + 2] = this.emptyW;
                am[2] = -1;
                const c = sim.calls?.callers.get(pid);
                if (c)
                    c.heavy = -1;
            }
        }
    }
    // ---- lock-on (the mech's missile pods): hold the button to lock up to lock.max targets in a cone along the aim, one per
    // lock.ticks; release to fire one homing missile at each (a salvo, lock.gap apart). Released with no lock: one
    // missile along the aim (the usual homing lock). State per vehicle entity id.
    locks = new Map();
    /** Frontline: dropped aircraft waiting on the ground for their pilot's first move (entity ids). */
    parked = new Set();
    /** Frontline: units held where they were flown in (entity id -> until tick): the lane AI leaves them be. */
    held = new Map();
    isHeld(sim, s) {
        const u = this.held.get(sim.eid[s]);
        if (u === undefined)
            return false;
        if (sim.tick >= u) {
            this.held.delete(sim.eid[s]);
            return false;
        }
        return true;
    }
    /** Frontline: the helicopter-handling aircraft's vertical speed (entity id -> m/s, negative: down). */
    heliVy = new Map();
    /** Frontline: gunships with a pilot aboard (boarding lifts them to a hover once), and the hover height they climb to. */
    heliCrewed = new Set();
    heliAuto = new Map();
    isLockW(w) { return !!this.R.lock && this.R.lock.w.has(w); }
    /** Fire decision for lock-on weapon w of vehicle slot s this tick (button held or not). Sets sim.forceTgt for a salvo shot. */
    lockFire(sim, s, w, held) {
        const L = this.R.lock, id = sim.eid[s];
        let st = this.locks.get(id);
        if (!st) {
            st = { tgts: [], next: 0, salvo: [], was: false };
            this.locks.set(id, st);
        }
        const wasHeld = st.was;
        st.was = held;
        st.tgts = st.tgts.filter((t) => { const o = sim.idToSlot.get(t); return o !== undefined && sim.alive[o] && sim.hp[o] > 0; });
        if (st.salvo.length) { // a salvo in flight finishes first
            const t = st.salvo.shift();
            sim.forceTgt = t;
            return true;
        }
        if (held) {
            if (sim.tick >= st.next && st.tgts.length < L.max) {
                const t = this.lockTarget(sim, s, w, st.tgts);
                if (t) {
                    st.tgts.push(t);
                    st.next = sim.tick + L.ticks;
                    sim.events.push(events_ts_1.EV.CALL_EFFECT, sim.tick, sim.team[s], 0, sim.slotPilot[s], 0, st.tgts.length, sim.x[sim.idToSlot.get(t)], sim.z[sim.idToSlot.get(t)], 6); // lock tone (sub 6)
                }
            }
            return false;
        }
        if (wasHeld && st.tgts.length) {
            st.salvo = st.tgts.slice(1);
            sim.forceTgt = st.tgts[0];
            st.tgts = [];
            return true;
        }
        if (wasHeld)
            return true; // a tap: one missile along the aim
        return false;
    }
    /** Salvo shots left for vehicle slot s (the gap between them replaces the weapon period). */
    salvoLeft(sim, s) { const st = this.locks.get(sim.eid[s]); return st ? st.salvo.length : 0; }
    /** The locked targets (entity ids) of vehicle id. */
    lockedOf(id) { const st = this.locks.get(id); return st ? [...st.tgts, ...st.salvo] : []; }
    lockTarget(sim, s, w, have) {
        const d = sim.d, L = this.R.lock, yaw = sim.ctlYaw[s], pitch = sim.ctlPitch[s];
        const ux = Math.cos(pitch) * Math.cos(yaw), uy = Math.sin(pitch), uz = Math.cos(pitch) * Math.sin(yaw);
        const ox = sim.x[s], oy = sim.y[s] + 8, oz = sim.z[s], R = d.wRange[w], tm = sim.team[s];
        let best = 0, bs = -Infinity;
        for (let k = 0; k < sim.nLive; k++) {
            const o = sim.live[k];
            if (!sim.alive[o] || sim.hp[o] <= 0 || sim.team[o] === tm || have.includes(sim.eid[o]) || !sim.detected(o, tm))
                continue;
            if (d.tAir[sim.etype[o]] && !d.wCanHitAir[w])
                continue;
            const dx = sim.x[o] - ox, dy = sim.y[o] + d.tRadius[sim.etype[o]] - oy, dz = sim.z[o] - oz, l = Math.hypot(dx, dy, dz);
            if (l > R || l < 3)
                continue;
            const c = (dx * ux + dy * uy + dz * uz) / l;
            if (c < L.cos)
                continue;
            const score = c - l / (R * 20) + (d.tStructure[sim.etype[o]] ? -0.05 : 0); // nearest the aim first, units before structures
            if (score > bs) {
                bs = score;
                best = sim.eid[o];
            }
        }
        return best;
    }
    /** A vehicle a player called down: only that player's pilots board it (the AI never crews it). */
    reservedFor(id) {
        for (const [pid, v] of this.dropped)
            if (v === id)
                return pid;
        return 0;
    }
    // ---- Frontline 4a: the players' requests to their AI commander. Ore / gas priority per team ("balanced", "ore", "gas"):
    // ore: more harvesters and a squad from each wave takes the nearest unheld point with ore; gas: the squad takes the
    // nearest unheld point with a geyser (the commander then builds an extractor there). Lane support: each request lasts
    // 90 s; the lane most players asked for gets half of every wave, and the next wave leaves at once.
    priority = ["balanced", "balanced", "balanced", "balanced"];
    requests = [[], [], [], []];
    raiders = new Map(); // eid -> team: units sent to take a resource point
    setPriority(team, p) {
        if (["balanced", "ore", "gas"].includes(p))
            this.priority[team & 3] = p;
    }
    requestLane(sim, team, lane, who) {
        const L = sim.lanes;
        if (!L || !(lane >= 0 && lane < L.rules.paths.length))
            return false;
        const tr = sim.d.constants.tickRate, list = this.requests[team & 3].filter((r) => r.who !== who && sim.tick < r.until);
        list.push({ lane, who, until: sim.tick + 90 * tr });
        this.requests[team & 3] = list;
        L.lastWave[team & 3] = -1e9; // the next wave leaves at the next decision
        return true;
    }
    // ---- Frontline 4b: map pings (the Tab map, P in first person): attack / defend / look / help at (x, z), 30 s; the
    // team's AI pilots (4c) answer the newest ones
    pings = [[], [], [], []];
    addPing(sim, team, x, z, kind, who) {
        if (!["attack", "defend", "look", "help"].includes(kind) || !isFinite(x) || !isFinite(z))
            return false;
        const tr = sim.d.constants.tickRate, list = this.pings[team & 3].filter((q) => sim.tick < q.until && !(q.who === who && q.kind === kind));
        list.push({ x: sim.clampMap(x), z: sim.clampMap(z), kind, who, at: sim.tick, until: sim.tick + 30 * tr });
        this.pings[team & 3] = list.slice(-6);
        return true;
    }
    pingsOf(sim, team) { return (this.pings[team & 3] = this.pings[team & 3].filter((q) => sim.tick < q.until)); }
    /** Pellet weapons (shotgun, scatter laser): damage scale of a hit at dist metres: full to pelletFalloff.fullMetres, easing
     *  to minMul at the weapon's range (it reaches out now, but does not one-shot at the end of it). */
    pelletFalloff(sim, w, dist) {
        const pel = sim.d.raw.weapons[w]?.pellets ?? 1;
        if (pel <= 1)
            return 1;
        const P = this.R.pellet, range = sim.d.wRange[w];
        if (dist <= P.full || range <= P.full)
            return 1;
        return 1 - (1 - P.minMul) * Math.min(1, (dist - P.full) / (range - P.full));
    }
    /** Frontline 4d: surplus gas (above pace.exchangeAt of storage) is traded at the Refinery for ore, every 5 s. Units cost
     *  about six times as much ore as gas, so gas otherwise piles up at the cap while production waits for ore. */
    exchanged = [0, 0, 0, 0];
    exchangeStep(sim) {
        const P = this.R.pace;
        for (let team = 0; team < 2; team++) {
            const cap = sim.storageCap(team), over = sim.gas[team] - cap.gas * P.exchangeAt;
            if (over > 0 && sim.ore[team] < cap.ore * 0.9) { // surplus gas buys ore
                const g = Math.min(over, P.exchangePer5s);
                sim.gas[team] -= g;
                sim.ore[team] = Math.min(cap.ore, sim.ore[team] + g * P.exchangeRate);
                this.exchanged[team] += g;
                continue;
            }
            const oreOver = sim.ore[team] - cap.ore * 0.75; // and a full ore store buys gas when gas runs dry (units need some)
            if (oreOver > 0 && sim.gas[team] < cap.gas * 0.15) {
                const o = Math.min(oreOver, P.exchangePer5s * 2);
                sim.ore[team] -= o;
                sim.gas[team] = Math.min(cap.gas, sim.gas[team] + o * P.exchangeRate * 0.5);
                this.exchanged[team] -= o;
            }
        }
        this.bleedStep(sim);
    }
    /** Frontline 4d: from pace.bleed minutes the side holding fewer strategic points loses Command Core hull every 5 s:
     *  bleedPerPointPer5s of its full hull per point behind (the match ends on held ground, not a stalemate). */
    bleed = [0, 0, 0, 0];
    bleeding = -1; // the team losing hull now (2: both, a tie in sudden death)
    bleedStep(sim) {
        const P = this.R.pace, Pt = sim.pts;
        this.bleeding = -1;
        if (!Pt || !sim.lanes || sim.tick < P.bleedTicks)
            return;
        const held = [0, 0];
        for (let p = 0; p < Pt.n; p++)
            if (Pt.owner[p] === 0 || Pt.owner[p] === 1)
                held[Pt.owner[p]]++;
        const lag = held[0] === held[1] ? -1 : held[0] < held[1] ? 0 : 1, gap = Math.abs(held[0] - held[1]);
        const tie = lag < 0 && sim.lanes.phase(sim) >= 3; // sudden death: a tie bleeds both Cores slowly
        this.bleeding = tie ? 2 : lag;
        if (lag < 0 && !tie)
            return;
        const tc = sim.coreTypes();
        for (let s = 0; s < sim.hi; s++)
            if (sim.alive[s] && (tie ? sim.team[s] < 2 : sim.team[s] === lag) && tc[sim.etype[s]] && sim.hp[s] > 0) {
                const dmg = sim.d.tHp[sim.etype[s]] * P.bleedPerPoint * (tie ? 1 : gap * (sim.lanes.phase(sim) >= 3 ? 2 : 1)); // sudden death bleeds twice as fast
                sim.hp[s] = Math.max(1, sim.hp[s] - dmg); // never to 0 here: the last blow is a real one (or the bleed's floor below)
                this.bleed[sim.team[s]] += dmg;
                if (sim.hp[s] <= sim.d.tHp[sim.etype[s]] * 0.02)
                    sim.destroy(sim.eid[s]); // bled out: the death step removes it and the match ends as for any Core kill
            }
    }
    /** The lane most of the team's live requests ask for (-1 none) and its requests' remaining seconds. */
    focusOf(sim, team) {
        const list = (this.requests[team & 3] = this.requests[team & 3].filter((r) => sim.tick < r.until));
        if (!list.length)
            return -1;
        const n = {};
        for (const r of list)
            n[r.lane] = (n[r.lane] ?? 0) + 1;
        let best = -1, bn = 0;
        for (const [l, c] of Object.entries(n))
            if (c > bn) {
                bn = c;
                best = +l;
            }
        return best;
    }
    /** Construction watchdog: an AI site untouched for 75 s (its builder cannot get there) is cancelled; the point refuses
     *  that type for 5 minutes. */
    siteSeen = new Map();
    siteBlock = new Map();
    siteBlocked(sim, p, t) { const u = this.siteBlock.get(`${p}:${t}`); return u !== undefined && sim.tick < u; }
    siteStep(sim) {
        const C = sim.con, tr = sim.d.constants.tickRate;
        if (!C || sim.tick % tr !== 0)
            return;
        for (const st of [...C.sites.values()]) {
            const pl = [...sim.pilots.values()].some((q) => q.team === st.team && q.player >= 0) && false; // AI and player sites alike
            if (st.entity || st.progress > 0) {
                this.siteSeen.delete(st.id);
                continue;
            }
            // 4d: plus the time to drive there, from where the builder was when the site appeared (a jungle extractor is
            // 1.4 km from the base: the plain 75 s cancelled every one on the way)
            let seen = this.siteSeen.get(st.id);
            if (!seen) {
                const bs = st.builder ? sim.idToSlot.get(st.builder) : undefined;
                const travel = bs !== undefined && sim.alive[bs] ? Math.hypot(sim.x[bs] - st.x, sim.z[bs] - st.z) / Math.max(2, sim.d.tSpeed[sim.etype[bs]] || 6) * 2.5 : 0;
                seen = [sim.tick, travel];
                this.siteSeen.set(st.id, seen);
            }
            const [first, travel] = seen;
            if (sim.tick - first > (75 + travel) * tr && !pl) {
                this.siteSeen.delete(st.id);
                this.siteBlock.set(`${st.point}:${st.type}`, sim.tick + 300 * tr);
                sim.cancelBuild(st.id, st.team);
            }
        }
    }
    /** A laser weapon (damage type laser, with heat): it overheats into a spent cell. */
    isLaser(w) {
        if (!this.laserW) {
            const d = this.sim.d, L = data_ts_1.DAMAGE_TYPES.indexOf("laser");
            this.laserW = d.weaponIds.map((_, i) => d.wDamageType[i] === L && d.wHeatPerShot[i] > 0);
        }
        return w >= 0 && this.laserW[w];
    }
    /**
     * Swap the cell of laser mount m of slot s (-1: every laser mount of s). A kit gun takes its next cell from the body's
     * cells (its rounds: the spent cell is gone; none left: the gun stays dry); vehicles carry cells enough. The heat drops
     * to zero at once; the swap takes swapSeconds. Returns how many mounts were swapped.
     */
    swapCell(sim, s, m = -1) {
        const d = sim.d, mc = sim.mCount[s], am = sim.s15 ? sim.s15.ammo.get(sim.eid[s]) : undefined;
        let n = 0;
        for (let k = 0; k < mc; k++) {
            if (m >= 0 && k !== m)
                continue;
            const ci = s * MM + k, w = sim.mWeapon[ci];
            if (!this.isLaser(w) || (sim.mHeat[ci] <= 0 && sim.mOvh[ci] < exports.CELL_STUCK))
                continue;
            if (am && am[k] >= 0) {
                if (am[k] < 1)
                    continue; // dry
                am[k] -= 1;
                if (am[k] < 1)
                    continue; // that was the last cell
            }
            sim.mHeat[ci] = 0;
            sim.mOvh[ci] = 0;
            sim.cooldown[ci] = Math.max(sim.cooldown[ci], this.R.swapSeconds);
            n++;
        }
        return n;
    }
    harvestersBonus(team) { const p = this.priority[team & 3]; return p === "ore" ? 3 : p === "gas" ? -2 : 0; }
    /** Extractor output multiplier: the gas priority puts more crews on the pumps, the ore priority fewer. */
    gasMul(team) { const p = this.priority[team & 3]; return p === "gas" ? 1.5 : p === "ore" ? 0.75 : 1; }
    /**
     * The point the team's priority wants taken next: along the link graph from the team's supplied points, the first
     * point not yet held on the shortest way to a point with ore / a geyser within 80 m that the team does not hold supplied
     * (a captured point is only useful supplied: the Constructor builds extractors there). -1: nothing to take.
     */
    resourceTarget(sim, team, ox, oz) {
        const pr = this.priority[team & 3], P = sim.pts;
        if (pr === "balanced" || !P || !P.n || !P.adj)
            return -1;
        const spots = pr === "gas" ? sim.geysersInfo().map((g) => [g.x, g.z]) : (sim.depositsInfo ? sim.depositsInfo() : []).map((d) => [d.x, d.z]);
        const SUP = 1; // points.ts PT_SUPPLIED
        const mine = (p) => P.owner[p] === team && (P.flags[p] & SUP) !== 0;
        const core = (p) => !!sim.lanes && sim.lanes.isCoreAt(sim, P.px[p], P.pz[p]);
        const want = (p) => !mine(p) && !core(p) && spots.some(([x, z]) => (x - P.px[p]) ** 2 + (z - P.pz[p]) ** 2 < 80 * 80);
        const prev = new Array(P.n).fill(-2), q = [];
        for (let p = 0; p < P.n; p++)
            if (mine(p)) {
                prev[p] = -1;
                q.push(p);
            }
        for (let i = 0; i < q.length; i++) {
            const p = q[i];
            for (const n of P.adj[p]) {
                if (prev[n] !== -2 || core(n))
                    continue;
                prev[n] = p;
                if (want(n)) { // walk back to the first step out of the supplied area
                    let c = n;
                    while (prev[c] >= 0 && !mine(prev[c]))
                        c = prev[c];
                    return P.owner[c] === team ? -1 : c;
                }
                q.push(n);
            }
        }
        return -1;
    }
    /** Is body s within refillRadius of a friendly building that refills pilots (Command Core, Barracks, Field Depot)? */
    nearRefill(sim, s) {
        const d = sim.d, r = this.R.refillRadius, team = sim.team[s];
        for (let o = 0; o < sim.hi; o++) {
            if (!sim.alive[o] || sim.hp[o] <= 0 || sim.team[o] !== team || !d.tStructure[sim.etype[o]])
                continue;
            if (!this.refill[sim.etype[o]])
                continue;
            const dx = sim.x[o] - sim.x[s], dz = sim.z[o] - sim.z[s], rr = r + d.tRadius[sim.etype[o]];
            if (dx * dx + dz * dz <= rr * rr)
                return true;
        }
        return false;
    }
}
exports.FKit = FKit;
