"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FALLBACK_SNAPSHOT_MAX_BYTES = exports.DEFAULT_SNAPSHOT_HEADROOM = exports.OPTIONAL_CONSTANTS = exports.REQUIRED_CONSTANTS = exports.DataError = exports.SEAT_PASSENGER = exports.SEAT_GUNNER = exports.SEAT_DRIVER = exports.MAX_SEATS = exports.MAX_MOUNTS = exports.DT_FLAK = exports.DT_EXPLOSIVE = exports.MOVE_NAMES = exports.MOVE_STRUCTURE = exports.MOVE_AIR = exports.MOVE_WALKER = exports.AC_STRUCTURE = exports.AC_AIR = exports.AC_INFANTRY = exports.N_AC = exports.DAMAGE_TYPES = exports.ARMOUR_CLASSES = void 0;
exports.hashString = hashString;
exports.compileData = compileData;
exports.seatHitZones = seatHitZones;
const fmath_ts_1 = require("./fmath.js");
exports.ARMOUR_CLASSES = ["infantry", "bike", "light", "medium", "heavy", "air", "structure"];
exports.DAMAGE_TYPES = ["kinetic", "explosive", "energy", "flak", "laser"];
exports.N_AC = exports.ARMOUR_CLASSES.length;
exports.AC_INFANTRY = 0;
exports.AC_AIR = 5;
exports.AC_STRUCTURE = 6;
/** W1: movement classes (GameDataCompiled.tMove): the ground armour classes 0..4, then the walker, air and structures. */
exports.MOVE_WALKER = 5, exports.MOVE_AIR = 6, exports.MOVE_STRUCTURE = 7;
/** W1: names of the movement classes 0..6 (terrain.json keys). */
exports.MOVE_NAMES = ["infantry", "bike", "light", "medium", "heavy", "walker", "air"];
exports.DT_EXPLOSIVE = 1;
exports.DT_FLAK = 3;
/** Weapon mounts per entity (seat weapons x count + extra + unit-level weapons + fired kit weapons). */
exports.MAX_MOUNTS = 12;
/** Seats per vehicle after expanding seats[].count (Mule: 1 + 2 + 6 = 9). */
exports.MAX_SEATS = 12;
exports.SEAT_DRIVER = 0, exports.SEAT_GUNNER = 1, exports.SEAT_PASSENGER = 2;
class DataError extends Error {
    problems;
    constructor(problems) {
        super(`sim cannot use this data (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n  - ${problems.join("\n  - ")}`);
        this.name = "DataError";
        this.problems = problems;
    }
}
exports.DataError = DataError;
/**
 * Constants the sim needs. Each entry lists the accepted names (dot paths into
 * constants.json); the first one present wins. Missing required constants make
 * compileData throw a DataError that names all of them.
 */
exports.REQUIRED_CONSTANTS = {
    tickRate: ["tickRate"],
    snapshotRate: ["snapshotRate"],
    fullSimRadius: ["fullSimRadius"],
    standardGravity: ["standardGravity"],
    firingSignatureFactor: ["firingSignatureFactor", "stealth.firingMultiplier"],
    firingSignatureSeconds: ["firingSignatureSeconds", "stealth.firingSeconds"],
    detectionIntervalTicks: ["detectionIntervalTicks"],
    targetingIntervalTicks: ["targetingIntervalTicks"],
    projectileHitRadius: ["projectileHitRadius"],
    projectileSpread: ["projectileSpread"],
    maxProjectileSeconds: ["maxProjectileSeconds"],
    airAltitude: ["airAltitude"],
    arrivalRadius: ["arrivalRadius"],
    formationMaxSpread: ["formationMaxSpread"],
    engageRangeFraction: ["engageRangeFraction"],
    farSnapshotDivisor: ["farSnapshotDivisor"],
    terrainCellSize: ["terrainCellSize"],
    terrainAmplitude: ["terrainAmplitude"],
    terrainSmoothPasses: ["terrainSmoothPasses"],
};
/** Optional rules: absent constant = rule off (listed in warnings). */
exports.OPTIONAL_CONSTANTS = {
    rearDamageBonus: ["rearDamageBonus"],
    rearArcDegrees: ["rearArcDegrees"],
    backstabDamageBonus: ["backstabDamageBonus", "stealth.backstabDamageBonus", "stealth.backstabBonus"],
    friendlyFireDirect: ["friendlyFire.direct"],
    friendlyFireExplosive: ["friendlyFire.explosive"],
    fixedWeaponArcDegrees: ["fixedWeaponArcDegrees"],
    structureSignature: ["structureSignature"],
    // stealth (doc 14): absent = rule off
    idleSignatureFactor: ["stealth.idleMultiplier"],
    airlessSignatureReduction: ["stealth.airlessExtraReduction"],
    lostAfterSeconds: ["stealth.lostAfterSeconds"],
    radarRangeMultiplier: ["stealth.radarRangeMultiplier"],
    muzzleRevealSeconds: ["stealth.muzzleRevealSeconds"],
    pointSensorHeight: ["stealth.pointSensorHeightMetres"],
    pilotShieldRegenDelay: ["pilot.shieldRegenDelaySeconds"],
    pilotShieldRegenPerSecond: ["pilot.shieldRegenPerSecond"],
    // aim error grows with target speed (CONTRACTS ruling 14): absent = factor 0 (base dispersion only)
    aimErrorSpeedFactor: ["combat.aimErrorSpeedFactor", "aimErrorSpeedFactor"],
    aimErrorReferenceSpeed: ["combat.aimErrorReferenceSpeed", "aimErrorReferenceSpeed"],
    // snapshot transport (not balance): hard byte cap per snapshot per guest at snapshotRate
    snapshotMaxBytes: ["network.snapshotMaxBytes"],
    // CONTRACTS rev 4: entities within this radius of the viewer (and its own pilot / vehicle) are never deferred by the byte cap
    snapshotProtectRadius: ["network.snapshotNeverDeferRadiusMetres"],
    hostUploadBytesPerGuest: ["performance.hostUploadKBpsPerGuest"],
};
/**
 * Default snapshot byte cap when constants.network.snapshotMaxBytes is absent:
 * this fraction of performance.hostUploadKBpsPerGuest, divided by snapshotRate
 * (headroom for the transport's own framing). Listed for the Design Keeper.
 */
exports.DEFAULT_SNAPSHOT_HEADROOM = 0.95;
/** Fallback snapshot cap (bytes per snapshot at snapshotRate) when neither constant exists. */
exports.FALLBACK_SNAPSHOT_MAX_BYTES = 3800;
const SHIELD_MULT_NAMES = ["shieldMultiplier"];
const UNIT_RADIUS_NAMES = ["unitRadius"];
function getPath(obj, path) {
    let o = obj;
    for (const k of path.split(".")) {
        if (o === null || typeof o !== "object")
            return undefined;
        o = o[k];
    }
    return o;
}
function lookup(obj, names) {
    for (const n of names) {
        const v = getPath(obj, n);
        if (v !== undefined)
            return { value: v, name: n };
    }
    return undefined;
}
/** Cheap deterministic 64-bit string hash (FNV-1a variant, two lanes). */
function hashString(s) {
    let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ c, 0x5bd1e995) ^ (h2 >>> 15);
    }
    return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}
function compileData(data, planetId) {
    const problems = [];
    const warnings = [];
    for (const k of ["constants", "planets", "damageMatrix", "weapons", "units", "buildings"]) {
        if (data[k] === undefined)
            problems.push(`data.${k} missing (in-memory keys are camelCase of the file names)`);
    }
    if (problems.length)
        throw new DataError(problems);
    const raw = data.constants;
    const num = (names, required) => {
        const r = lookup(raw, names);
        if (!r) {
            if (required)
                problems.push(`constants: ${names.join(" | ")} missing`);
            return undefined;
        }
        if (typeof r.value !== "number" || !Number.isFinite(r.value)) {
            problems.push(`constants.${r.name}: not a finite number`);
            return undefined;
        }
        return r.value;
    };
    const req = {};
    for (const [k, names] of Object.entries(exports.REQUIRED_CONSTANTS))
        req[k] = num(names, true) ?? NaN;
    const opt = {};
    for (const [k, names] of Object.entries(exports.OPTIONAL_CONSTANTS))
        opt[k] = num(names, false);
    const unitRadius = new Float64Array(exports.N_AC);
    const ur = lookup(raw, UNIT_RADIUS_NAMES);
    if (!ur || typeof ur.value !== "object" || ur.value === null)
        problems.push(`constants: unitRadius missing (object keyed by armour class)`);
    else
        exports.ARMOUR_CLASSES.forEach((ac, i) => {
            const v = ur.value[ac];
            if (typeof v !== "number" || !(v > 0))
                problems.push(`constants.unitRadius.${ac} missing or not > 0`);
            else
                unitRadius[i] = v;
        });
    const shieldMultiplier = new Float64Array(exports.DAMAGE_TYPES.length).fill(1);
    const sm = lookup(raw, SHIELD_MULT_NAMES);
    if (!sm)
        warnings.push("rule off: shield multiplier (constants.shieldMultiplier missing): every damage type hits shields at x1");
    else if (typeof sm.value !== "object" || sm.value === null)
        problems.push(`constants.shieldMultiplier: not an object`);
    else
        for (const [k, v] of Object.entries(sm.value)) {
            const i = exports.DAMAGE_TYPES.indexOf(k);
            if (i < 0)
                problems.push(`constants.shieldMultiplier.${k}: unknown damage type`);
            else if (typeof v !== "number" || !(v >= 0))
                problems.push(`constants.shieldMultiplier.${k}: not a number >= 0`);
            else
                shieldMultiplier[i] = v;
        }
    const rearOn = opt.rearDamageBonus !== undefined && opt.rearArcDegrees !== undefined;
    if (!rearOn)
        warnings.push(`rule off: rear-hit bonus (missing ${[opt.rearDamageBonus === undefined ? "rearDamageBonus" : "", opt.rearArcDegrees === undefined ? "rearArcDegrees" : ""].filter(Boolean).join(", ")})`);
    const backstabOn = opt.backstabDamageBonus !== undefined;
    if (!backstabOn)
        warnings.push(`rule off: backstab bonus (missing ${exports.OPTIONAL_CONSTANTS.backstabDamageBonus.join(" | ")})`);
    const friendlyFireOn = opt.friendlyFireDirect !== undefined && opt.friendlyFireExplosive !== undefined;
    if (!friendlyFireOn)
        warnings.push("rule off: friendly-fire damage (missing friendlyFire.direct / friendlyFire.explosive): friendly units still block shots but take no damage");
    const fixedArcOn = opt.fixedWeaponArcDegrees !== undefined;
    if (!fixedArcOn)
        warnings.push("rule off: hull-fixed driver weapons (missing fixedWeaponArcDegrees): driver weapons aim like turrets");
    const c = {
        tickRate: req.tickRate, snapshotRate: req.snapshotRate, fullSimRadius: req.fullSimRadius, standardGravity: req.standardGravity,
        firingSignatureFactor: req.firingSignatureFactor, firingSignatureSeconds: req.firingSignatureSeconds,
        detectionIntervalTicks: req.detectionIntervalTicks, targetingIntervalTicks: req.targetingIntervalTicks,
        projectileHitRadius: req.projectileHitRadius, projectileSpread: req.projectileSpread, maxProjectileSeconds: req.maxProjectileSeconds,
        airAltitude: req.airAltitude, arrivalRadius: req.arrivalRadius, formationMaxSpread: req.formationMaxSpread, engageRangeFraction: req.engageRangeFraction,
        farSnapshotDivisor: req.farSnapshotDivisor, terrainCellSize: req.terrainCellSize, terrainAmplitude: req.terrainAmplitude, terrainSmoothPasses: req.terrainSmoothPasses,
        rearOn, rearDamageBonus: rearOn ? opt.rearDamageBonus : 0, rearArcDegrees: rearOn ? opt.rearArcDegrees : 0,
        backstabOn, backstabDamageBonus: opt.backstabDamageBonus ?? 0,
        friendlyFireOn, friendlyFireDirect: friendlyFireOn ? opt.friendlyFireDirect : 0, friendlyFireExplosive: friendlyFireOn ? opt.friendlyFireExplosive : 0,
        fixedArcOn, fixedWeaponArcDegrees: opt.fixedWeaponArcDegrees ?? 360,
        structureSignature: opt.structureSignature ?? NaN,
        idleSignatureFactor: opt.idleSignatureFactor ?? 1,
        airlessSignatureReduction: opt.airlessSignatureReduction ?? 0,
        lostAfterTicks: 0, // set below (needs tickRate)
        radarRangeMultiplier: opt.radarRangeMultiplier ?? 0,
        muzzleRevealTicks: 0, // set below (needs tickRate)
        armedTargetsFirst: getPath(raw, "combat.armedTargetsFirst") === true,
        pointSensorHeight: opt.pointSensorHeight ?? NaN,
        pilotRegenDelayTicks: Math.round((opt.pilotShieldRegenDelay ?? 0) * req.tickRate),
        pilotRegenPerTick: (opt.pilotShieldRegenPerSecond ?? 0) / req.tickRate,
        snapshotMaxBytes: 0, // set below
        snapshotProtectRadius: opt.snapshotProtectRadius ?? 100,
        aimErrorSpeedFactor: 0, aimErrorReferenceSpeed: 0, aimErrorPerSpeed: 0, // set below
        shieldMultiplier, unitRadius,
        vehShieldDelayTicks: 0, vehShieldFracPerTick: 0, // set below
        bldShieldDelayTicks: 0, bldShieldFracPerTick: 0, // set below
    };
    {
        const vd = getPath(raw, "vehicleShield.rechargeDelaySeconds"), vf = getPath(raw, "vehicleShield.rechargeFractionPerSecond");
        if (vd === undefined || vf === undefined)
            warnings.push("rule off: vehicle shield recharge (constants.vehicleShield.rechargeDelaySeconds / rechargeFractionPerSecond missing)");
        else if (typeof vd !== "number" || !(vd >= 0) || typeof vf !== "number" || !(vf >= 0))
            problems.push("constants.vehicleShield: rechargeDelaySeconds and rechargeFractionPerSecond must be numbers >= 0");
        else {
            c.vehShieldDelayTicks = Math.round(vd * req.tickRate);
            c.vehShieldFracPerTick = vf / req.tickRate;
        }
        const bd = getPath(raw, "buildingShield.rechargeDelaySeconds"), bf = getPath(raw, "buildingShield.rechargeFractionPerSecond");
        if (bd !== undefined && bf !== undefined) {
            if (typeof bd !== "number" || !(bd >= 0) || typeof bf !== "number" || !(bf >= 0))
                problems.push("constants.buildingShield: rechargeDelaySeconds and rechargeFractionPerSecond must be numbers >= 0");
            else {
                c.bldShieldDelayTicks = Math.round(bd * req.tickRate);
                c.bldShieldFracPerTick = bf / req.tickRate;
            }
        }
    }
    if (opt.aimErrorSpeedFactor === undefined || opt.aimErrorReferenceSpeed === undefined) {
        const miss = [opt.aimErrorSpeedFactor === undefined ? "combat.aimErrorSpeedFactor" : "", opt.aimErrorReferenceSpeed === undefined ? "combat.aimErrorReferenceSpeed" : ""].filter(Boolean).join(", ");
        warnings.push(`rule off: speed-dependent aim error (missing ${miss}): aimErrorSpeedFactor is 0, every shot uses its weapon's base dispersionDeg`);
    }
    else if (!(opt.aimErrorSpeedFactor >= 0))
        problems.push("constants.combat.aimErrorSpeedFactor: must be >= 0");
    else if (!(opt.aimErrorReferenceSpeed > 0))
        problems.push("constants.combat.aimErrorReferenceSpeed: must be > 0");
    else {
        c.aimErrorSpeedFactor = opt.aimErrorSpeedFactor;
        c.aimErrorReferenceSpeed = opt.aimErrorReferenceSpeed;
        c.aimErrorPerSpeed = opt.aimErrorSpeedFactor / opt.aimErrorReferenceSpeed;
    }
    if (opt.radarRangeMultiplier !== undefined && !(opt.radarRangeMultiplier >= 0 && opt.radarRangeMultiplier <= 1))
        problems.push("constants.stealth.radarRangeMultiplier: must be in [0, 1]");
    if ((opt.pilotShieldRegenDelay === undefined) !== (opt.pilotShieldRegenPerSecond === undefined))
        problems.push("constants.pilot: shieldRegenDelaySeconds and shieldRegenPerSecond go together");
    if (opt.idleSignatureFactor === undefined)
        warnings.push("rule off: idle signature (stealth.idleMultiplier missing)");
    else if (!(opt.idleSignatureFactor > 0))
        problems.push("constants.stealth.idleMultiplier: must be > 0");
    if (opt.airlessSignatureReduction !== undefined && !(opt.airlessSignatureReduction >= 0 && opt.airlessSignatureReduction < 1))
        problems.push("constants.stealth.airlessExtraReduction: must be in [0, 1)");
    if (opt.lostAfterSeconds === undefined) {
        warnings.push("rule off: detection memory (stealth.lostAfterSeconds missing): contacts drop one detection interval after the last sweep");
        c.lostAfterTicks = c.detectionIntervalTicks;
    }
    else if (!(opt.lostAfterSeconds >= 0))
        problems.push("constants.stealth.lostAfterSeconds: must be >= 0");
    else
        c.lostAfterTicks = Math.max(c.detectionIntervalTicks, Math.round(opt.lostAfterSeconds * c.tickRate));
    if (getPath(raw, "combat.armedTargetsFirst") !== true)
        warnings.push("rule off: armed targets first (combat.armedTargetsFirst not true): automatic targeting takes the nearest enemy");
    if (opt.muzzleRevealSeconds === undefined)
        warnings.push("rule off: muzzle reveal (stealth.muzzleRevealSeconds missing)");
    else if (!(opt.muzzleRevealSeconds >= 0))
        problems.push("constants.stealth.muzzleRevealSeconds: must be >= 0");
    else
        c.muzzleRevealTicks = Math.round(opt.muzzleRevealSeconds * c.tickRate);
    if (opt.pointSensorHeight === undefined)
        warnings.push("rule off: point sensors (stealth.pointSensorHeightMetres missing)");
    else if (!(opt.pointSensorHeight >= 0))
        problems.push("constants.stealth.pointSensorHeightMetres: must be >= 0");
    if (opt.snapshotMaxBytes !== undefined) {
        if (!(Number.isInteger(opt.snapshotMaxBytes) && opt.snapshotMaxBytes >= 64))
            problems.push("constants.network.snapshotMaxBytes: must be an integer >= 64");
        c.snapshotMaxBytes = opt.snapshotMaxBytes;
    }
    else if (opt.hostUploadBytesPerGuest !== undefined && opt.hostUploadBytesPerGuest > 0) {
        c.snapshotMaxBytes = Math.floor((opt.hostUploadBytesPerGuest * 1000 * exports.DEFAULT_SNAPSHOT_HEADROOM) / c.snapshotRate);
    }
    else
        c.snapshotMaxBytes = exports.FALLBACK_SNAPSHOT_MAX_BYTES;
    for (const k of ["tickRate", "snapshotRate", "detectionIntervalTicks", "targetingIntervalTicks", "farSnapshotDivisor"]) {
        if (Number.isFinite(c[k]) && !(Number.isInteger(c[k]) && c[k] > 0))
            problems.push(`constants.${k}: must be a positive integer`);
    }
    const planet = data.planets.find((p) => p.id === planetId);
    if (!planet)
        problems.push(`unknown planet "${planetId}" (data has: ${data.planets.map((p) => p.id).join(", ")})`);
    else if (typeof planet.gravity !== "number" || !(planet.gravity > 0))
        problems.push(`planet ${planetId}: gravity must be > 0`);
    const G0 = c.standardGravity;
    const gravityG = planet?.gravity ?? 1;
    const gravity = gravityG * G0;
    const dt = 1 / c.tickRate;
    const matrix = new Float64Array(exports.DAMAGE_TYPES.length * exports.N_AC);
    for (let d = 0; d < exports.DAMAGE_TYPES.length; d++) {
        const row = data.damageMatrix[exports.DAMAGE_TYPES[d]];
        if (!row && exports.DAMAGE_TYPES[d] === "laser") {
            for (let a = 0; a < exports.N_AC; a++)
                matrix[d * exports.N_AC + a] = 1;
            continue;
        } // ruling 91: optional row (older data sets), flat 1.0
        if (!row) {
            problems.push(`damageMatrix.${exports.DAMAGE_TYPES[d]} missing`);
            continue;
        }
        for (let a = 0; a < exports.N_AC; a++) {
            const v = row[exports.ARMOUR_CLASSES[a]];
            if (typeof v !== "number" || !(v >= 0))
                problems.push(`damageMatrix.${exports.DAMAGE_TYPES[d]}.${exports.ARMOUR_CLASSES[a]} missing or < 0`);
            else
                matrix[d * exports.N_AC + a] = v;
        }
    }
    const nw = data.weapons.length;
    const weaponIds = data.weapons.map((w) => w.id);
    const wDamage = new Float64Array(nw), wPeriod = new Float64Array(nw), wSps = new Float64Array(nw), wGas = new Float64Array(nw);
    const wRange = new Float64Array(nw), wSpeed = new Float64Array(nw);
    const wBallistic = new Uint8Array(nw), wDamageType = new Uint8Array(nw), wCanHitAir = new Uint8Array(nw), wCanHitGround = new Uint8Array(nw), wSkip = new Uint8Array(nw);
    const wMelee = new Uint8Array(nw), wRam = new Uint8Array(nw), wSplash = new Float64Array(nw);
    const wAmmo = new Float64Array(nw), wHoming = new Float64Array(nw), wSalvo = new Uint8Array(nw).fill(1);
    const wTraverse = new Float64Array(nw), wTravCos = new Float64Array(nw).fill(1), wTravSin = new Float64Array(nw), wAcqTicks = new Int32Array(nw);
    const wChargeTicks = new Int32Array(nw), wHeatPerShot = new Float64Array(nw), wHeatDrain = new Float64Array(nw), wLockTicks = new Int32Array(nw), wAiMask = new Uint16Array(nw);
    const wDispersion = new Float64Array(nw), wMinRange = new Float64Array(nw), wCanopyKill = new Uint8Array(nw), wRiderShot = new Uint8Array(nw);
    const riderClasses = getPath(raw, "crew.riderShotWeaponClasses");
    if (riderClasses !== undefined && !(Array.isArray(riderClasses) && riderClasses.every((x) => typeof x === "string")))
        problems.push("constants.crew.riderShotWeaponClasses: must be an array of weapon class names");
    const placed = new Set();
    const isNum = (v, min = 0) => typeof v === "number" && Number.isFinite(v) && v >= min;
    data.weapons.forEach((w, i) => {
        const p = `weapon ${w.id}`;
        if (!isNum(w.damage))
            problems.push(`${p}: damage`);
        if (!isNum(w.shotsPerSecond) || w.shotsPerSecond <= 0)
            problems.push(`${p}: shotsPerSecond must be > 0`);
        if (!isNum(w.range) || w.range <= 0)
            problems.push(`${p}: range must be > 0`);
        wDamage[i] = w.damage;
        wSps[i] = w.shotsPerSecond;
        wPeriod[i] = 1 / w.shotsPerSecond;
        if (w.gasPerShot !== undefined && !isNum(w.gasPerShot))
            problems.push(`${p}: gasPerShot must be >= 0`);
        wGas[i] = w.gasPerShot ?? 0;
        if (w.ammo !== undefined && !(isNum(w.ammo) && w.ammo >= 1))
            problems.push(`${p}: ammo must be >= 1`);
        wAmmo[i] = typeof w.ammo === "number" && w.ammo >= 1 ? Math.floor(w.ammo) : 0;
        const dti = exports.DAMAGE_TYPES.indexOf(w.damageType);
        if (dti < 0)
            problems.push(`${p}: damageType "${w.damageType}" not one of ${exports.DAMAGE_TYPES.join("|")}`);
        wDamageType[i] = Math.max(0, dti);
        wBallistic[i] = w.ballistic ? 1 : 0;
        wCanopyKill[i] = w.canopyKill === true ? 1 : 0;
        wRiderShot[i] = Array.isArray(riderClasses) && typeof w.class === "string" && riderClasses.includes(w.class) ? 1 : 0;
        if (w.canHitAir !== undefined && typeof w.canHitAir !== "boolean")
            problems.push(`${p}: canHitAir must be a boolean`);
        wCanHitAir[i] = w.ballistic || w.canHitAir === false ? 0 : 1;
        if (w.canHitGround !== undefined && typeof w.canHitGround !== "boolean")
            problems.push(`${p}: canHitGround must be a boolean`);
        wCanHitGround[i] = w.canHitGround === false ? 0 : 1;
        if (w.class === "placed-charge")
            placed.add(i);
        if (w.splashRadius !== undefined) {
            if (!isNum(w.splashRadius))
                problems.push(`${p}: splashRadius must be a number >= 0`);
            else
                wSplash[i] = w.splashRadius;
        }
        if (w.dispersionDeg !== undefined) {
            if (!isNum(w.dispersionDeg) || w.dispersionDeg > 45)
                problems.push(`${p}: dispersionDeg must be a number in [0, 45]`);
            else
                wDispersion[i] = (w.dispersionDeg * Math.PI) / 180;
        }
        if (w.traverseDegPerSecond !== undefined) {
            if (!isNum(w.traverseDegPerSecond) || w.traverseDegPerSecond <= 0)
                problems.push(`${p}: traverseDegPerSecond must be > 0`);
            else {
                wTraverse[i] = (w.traverseDegPerSecond * Math.PI) / 180;
                wTravCos[i] = (0, fmath_ts_1.dcos)(wTraverse[i] * dt);
                wTravSin[i] = (0, fmath_ts_1.dsin)(wTraverse[i] * dt);
            }
        }
        if (w.acquireSeconds !== undefined) {
            if (!isNum(w.acquireSeconds))
                problems.push(`${p}: acquireSeconds must be >= 0`);
            else
                wAcqTicks[i] = Math.round(w.acquireSeconds / dt);
        }
        if (w.chargeSeconds !== undefined) { // ruling 91
            if (!isNum(w.chargeSeconds) || w.chargeSeconds <= 0)
                problems.push(`${p}: chargeSeconds must be > 0`);
            else
                wChargeTicks[i] = Math.max(1, Math.round(w.chargeSeconds / dt));
        }
        if (w.aiTargetClasses !== undefined) { // ruling 91
            if (!Array.isArray(w.aiTargetClasses))
                problems.push(`${p}: aiTargetClasses must be an array of armour classes`);
            else
                for (const ac of w.aiTargetClasses) {
                    const k = exports.ARMOUR_CLASSES.indexOf(ac);
                    if (k < 0)
                        problems.push(`${p}: aiTargetClasses: unknown armour class ${String(ac)}`);
                    else
                        wAiMask[i] |= 1 << k;
                }
        }
        if (w.overheatSeconds !== undefined || w.heatDrainSeconds !== undefined) { // ruling 91
            if (!isNum(w.overheatSeconds) || w.overheatSeconds <= 0 || !isNum(w.heatDrainSeconds) || w.heatDrainSeconds <= 0)
                problems.push(`${p}: overheatSeconds and heatDrainSeconds must both be > 0`);
            else {
                wHeatPerShot[i] = 1 / (w.overheatSeconds * w.shotsPerSecond);
                wHeatDrain[i] = dt / w.heatDrainSeconds;
            }
            if (w.overheatLockoutSeconds !== undefined && !isNum(w.overheatLockoutSeconds))
                problems.push(`${p}: overheatLockoutSeconds must be >= 0`);
            else
                wLockTicks[i] = Math.round((w.overheatLockoutSeconds ?? 0) / dt);
        }
        if (w.homingDegPerSecond !== undefined) { // ruling 108
            if (!isNum(w.homingDegPerSecond) || w.ballistic || !((w.projectileSpeed ?? 0) > 0))
                problems.push(`${p}: homingDegPerSecond needs a straight projectile (projectileSpeed > 0, not ballistic)`);
            else
                wHoming[i] = (w.homingDegPerSecond * Math.PI) / 180;
        }
        if (w.salvo !== undefined) { // ruling 108
            if (!(Number.isInteger(w.salvo) && w.salvo >= 1 && w.salvo <= 4) || !(w.ballistic || (w.projectileSpeed ?? 0) > 0))
                problems.push(`${p}: salvo must be 1-4, on a projectile weapon`);
            else
                wSalvo[i] = w.salvo;
        }
        if (w.minRange !== undefined) {
            if (!isNum(w.minRange))
                problems.push(`${p}: minRange must be a number >= 0`);
            else
                wMinRange[i] = w.minRange;
        }
        if (w.ram !== undefined && typeof w.ram !== "boolean")
            problems.push(`${p}: ram must be a boolean`);
        if (w.melee !== undefined && typeof w.melee !== "boolean")
            problems.push(`${p}: melee must be a boolean`);
        if (w.ram === true && w.melee !== true)
            problems.push(`${p}: ram needs melee: true`);
        if (w.melee === true) {
            // Melee tool (CONTRACTS ruling 8): contact range, no projectile, cannot hit aircraft.
            wMelee[i] = 1;
            wRam[i] = w.ram === true ? 1 : 0;
            wCanHitAir[i] = 0;
            wSpeed[i] = 0;
            wRange[i] = w.range;
            if (w.ballistic)
                problems.push(`${p}: a melee weapon cannot be ballistic`);
            if (w.range > 5)
                warnings.push(`${p}: melee range ${w.range} m is over the 5 m the contract allows`);
            if (w.damageType !== "kinetic")
                warnings.push(`${p}: melee damage type is ${w.damageType} (contract: kinetic); used as given`);
            if (wSplash[i] > 0)
                warnings.push(`${p}: splashRadius on a melee weapon is ignored`);
            wSplash[i] = 0;
            wDispersion[i] = 0;
            wMinRange[i] = 0;
            if (w.canHitGround === false)
                problems.push(`${p}: a melee weapon must be able to hit ground targets (canHitGround false)`);
            wSkip[i] = 1;
            return;
        }
        if (w.ballistic) {
            // `range` is the flat-ground maximum range at 1 g and the source of truth.
            // Muzzle speed v = sqrt(range * G0); on a planet with gravity g the same
            // shell reaches v^2 / (g * G0) = range / g.
            if (w.projectileSpeed !== undefined)
                warnings.push(`${p}: ballistic weapon has projectileSpeed ${w.projectileSpeed}; ignored (muzzle speed is derived from range and gravity)`);
            const v = Math.sqrt(w.range * G0);
            wSpeed[i] = v;
            wRange[i] = (v * v) / gravity;
        }
        else {
            if (w.projectileSpeed === undefined)
                warnings.push(`${p}: no projectileSpeed on a non-ballistic weapon; treated as hitscan`);
            else if (!isNum(w.projectileSpeed))
                problems.push(`${p}: projectileSpeed must be >= 0`);
            wSpeed[i] = w.projectileSpeed ?? 0;
            wRange[i] = w.range;
        }
        if (wCanHitAir[i] === 0 && wCanHitGround[i] === 0)
            problems.push(`${p}: canHitGround false and cannot hit aircraft${w.ballistic ? " (ballistic)" : ""}: the weapon can hit nothing`);
        wSkip[i] = (wCanHitAir[i] === 0 ? 1 : 0) | (wCanHitGround[i] === 0 ? 2 : 0);
    });
    const weaponIndex = (wid, owner) => {
        const wi = typeof wid === "string" ? weaponIds.indexOf(wid) : -1;
        if (wi < 0)
            problems.push(`${owner}: unknown weapon ${String(wid)}`);
        return wi;
    };
    const nu = data.units.length, nb = data.buildings.length, nt = nu + nb;
    const typeIds = [...data.units.map((u) => u.id), ...data.buildings.map((b) => b.id)];
    const tArmour = new Uint8Array(nt), tHp = new Float64Array(nt), tShield = new Float64Array(nt);
    const tBoostMul = new Float64Array(nt), tBoostDrain = new Float64Array(nt), tBoostFill = new Float64Array(nt), tBoostMin = new Float64Array(nt);
    const tWalk = new Uint8Array(nt), tWalkAccel = new Float64Array(nt), tWalkBrake = new Float64Array(nt), tWalkCosInPlace = new Float64Array(nt), tWalkReverse = new Float64Array(nt), tMove = new Uint8Array(nt);
    const tHover = new Uint8Array(nt), tAccel = new Float64Array(nt), tDrag = new Float64Array(nt), tJump = new Float64Array(nt), tCrewArmoured = new Uint8Array(nt);
    const tSpeed = new Float64Array(nt), tCosTurn = new Float64Array(nt), tSinTurn = new Float64Array(nt), tTurnRate = new Float64Array(nt);
    const tSignature = new Float64Array(nt), tSensor = new Float64Array(nt), tRadius = new Float64Array(nt);
    const tStructure = new Uint8Array(nt), tAir = new Uint8Array(nt), tVehicle = new Uint8Array(nt), tMountCount = new Uint8Array(nt);
    const tMounts = new Int16Array(nt * exports.MAX_MOUNTS).fill(-1), tMountFixed = new Uint8Array(nt * exports.MAX_MOUNTS);
    const tMountSeat = new Int16Array(nt * exports.MAX_MOUNTS).fill(-1);
    const tSeatChoices = [];
    const tSquadSize = new Uint16Array(nt), tSquadSpacing = new Float64Array(nt), tCp = new Float64Array(nt);
    const tMeleeOnly = new Uint8Array(nt), tRadar = new Uint8Array(nt), tPilot = new Uint8Array(nt);
    const tSeatCount = new Uint8Array(nt), tSeatRole = new Uint8Array(nt * exports.MAX_SEATS), tDriverSeat = new Int8Array(nt).fill(-1), tSeatArmed = new Uint8Array(nt * exports.MAX_SEATS);
    const tMountCrewSeat = new Int8Array(nt * exports.MAX_MOUNTS).fill(-1), tMountManual = new Uint8Array(nt * exports.MAX_MOUNTS), tMountExtra = new Uint8Array(nt * exports.MAX_MOUNTS);
    const tBunker = new Uint8Array(nt), tMountLevel = new Uint8Array(nt * exports.MAX_MOUNTS);
    // ruling 33: the personal weapon a pilot fires from a canFire passenger seat (the on-foot pilot's first unit-level weapon)
    const pilotUnit = data.units.find((u) => u.category === "pilot");
    const passengerWeaponId = pilotUnit && Array.isArray(pilotUnit.weapons) && pilotUnit.weapons.length ? pilotUnit.weapons[0] : undefined;
    const passengerMounts = [], passengerUnmounted = []; // [mount index, seat] (muzzle set from the seat zone below)
    const tMuzzle = new Float64Array(nt * exports.MAX_MOUNTS * 3);
    /** Reads a muzzle point [forward, up, right] (finite numbers within 30 m); null when absent. */
    const muzzlePoint = (v, owner) => {
        if (v === undefined)
            return null;
        if (!Array.isArray(v) || v.length !== 3 || !v.every((x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= 30)) {
            problems.push(`${owner}: muzzle must be [forward, up, right] in metres (|value| <= 30)`);
            return null;
        }
        return v;
    };
    const tTier = new Uint8Array(nt), tCostOre = new Float64Array(nt), tCostGas = new Float64Array(nt);
    const tProduces = [], tProducesTierMask = new Uint8Array(nt);
    const tRespawnPoint = new Uint8Array(nt), tEnergyRefill = new Uint8Array(nt), tPilotHome = new Uint8Array(nt);
    const skippedPlaced = [];
    const addMount = (t, wi, fixed, seat, owner, crewSeat = -1, manual = false, muzzle = null) => {
        if (wi < 0)
            return;
        if (placed.has(wi)) {
            if (!manual)
                skippedPlaced.push(`${owner}: ${weaponIds[wi]}`);
            return;
        } // placed by hand, not fired
        if (tMountCount[t] >= exports.MAX_MOUNTS) {
            problems.push(`${owner}: more than ${exports.MAX_MOUNTS} weapon mounts`);
            return;
        }
        const m = t * exports.MAX_MOUNTS + tMountCount[t]++;
        tMounts[m] = wi;
        tMountFixed[m] = fixed && fixedArcOn ? 1 : 0;
        tMountSeat[m] = seat;
        tMountCrewSeat[m] = crewSeat;
        tMountManual[m] = manual ? 1 : 0;
        if (crewSeat >= 0)
            tSeatArmed[t * exports.MAX_SEATS + crewSeat] = 1;
        if (muzzle) {
            tMuzzle[m * 3] = muzzle[0];
            tMuzzle[m * 3 + 1] = muzzle[1];
            tMuzzle[m * 3 + 2] = muzzle[2];
        }
        else {
            tMuzzle[m * 3] = 0;
            tMuzzle[m * 3 + 1] = tRadius[t];
            tMuzzle[m * 3 + 2] = 0;
        } // the hit-sphere centre (pre-muzzle behaviour)
    };
    const noWeapons = [];
    data.units.forEach((u, t) => {
        const p = `unit ${u.id}`;
        const ac = exports.ARMOUR_CLASSES.indexOf(u.armourClass);
        if (ac < 0 || ac === exports.AC_STRUCTURE)
            problems.push(`${p}: armourClass "${u.armourClass}" not one of infantry|bike|light|medium|heavy|air`);
        for (const k of ["hp", "shield", "speed", "turnRate", "signature", "sensorRange", "squadSize"]) {
            if (!isNum(u[k]))
                problems.push(`${p}: ${k} missing or < 0`);
        }
        if (!(u.hp > 0))
            problems.push(`${p}: hp must be > 0`);
        tArmour[t] = Math.max(0, ac);
        tHp[t] = u.hp;
        tShield[t] = u.shield;
        tSpeed[t] = u.speed;
        if (u.boost !== undefined) { // ruling 108 (Dart Scout boost)
            const b = u.boost;
            if (!isNum(b.speed) || b.speed <= u.speed || !isNum(b.seconds) || !(b.seconds > 0) || !isNum(b.rechargeSeconds) || !(b.rechargeSeconds > 0))
                problems.push(`${p}: boost needs speed (> speed), seconds and rechargeSeconds (> 0)`);
            else {
                tBoostMul[t] = b.speed / u.speed;
                tBoostDrain[t] = dt / b.seconds;
                tBoostFill[t] = dt / b.rechargeSeconds;
                tBoostMin[t] = isNum(b.minStartFraction) ? Math.min(1, b.minStartFraction) : 0.25;
            }
        }
        let turnRate = u.turnRate;
        if (u.handling !== undefined) { // ruling 112 (hover momentum): ground vehicles only
            const h = u.handling;
            if (!isNum(h.accel) || !(h.accel > 0) || !isNum(h.drag) || !(h.drag > 0) || !isNum(h.turn) || !(h.turn > 0) || !isNum(h.jump))
                problems.push(`${p}: handling needs accel, drag, turn (> 0) and jump (>= 0)`);
            else if ((u.armourClass === "air" && h.air !== true) || u.armourClass === "infantry" || u.category === "pilot")
                problems.push(`${p}: handling is for ground vehicles (not air, infantry or the pilot); an aircraft opts in with air: true (Frontline helicopter handling)`);
            else {
                tHover[t] = 1;
                tAccel[t] = h.accel;
                tDrag[t] = h.drag;
                tJump[t] = h.jump;
                turnRate = h.turn;
            }
        }
        tMove[t] = ac === exports.AC_AIR ? exports.MOVE_AIR : ac < 0 || ac === exports.AC_STRUCTURE ? exports.MOVE_STRUCTURE : ac;
        // Frontline: a unit may move as another class than its armour (the Dart: light armour, moves as a bike)
        if (typeof u.moveClass === "string" && exports.MOVE_NAMES.includes(u.moveClass) && u.moveClass !== "walker" && u.moveClass !== "air")
            tMove[t] = exports.MOVE_NAMES.indexOf(u.moveClass);
        if (u.walker !== undefined) { // W1: a legged walker
            const w = u.walker;
            if (!isNum(w.accel) || !(w.accel > 0) || !isNum(w.brake) || !(w.brake > 0) || !isNum(w.turn) || !(w.turn > 0) || !isNum(w.turnInPlaceDegrees) || !isNum(w.reverseFraction))
                problems.push(`${p}: walker needs accel, brake, turn (> 0), turnInPlaceDegrees and reverseFraction (>= 0)`);
            else if (u.armourClass === "air" || u.armourClass === "infantry" || u.category === "pilot")
                problems.push(`${p}: walker is for ground vehicles (not air, infantry or the pilot)`);
            else if (u.handling !== undefined)
                problems.push(`${p}: walker and handling (hover) exclude each other`);
            else {
                tWalk[t] = 1;
                tMove[t] = exports.MOVE_WALKER;
                tWalkAccel[t] = w.accel;
                tWalkBrake[t] = w.brake;
                turnRate = w.turn;
                tWalkCosInPlace[t] = (0, fmath_ts_1.dcos)(Math.min(180, w.turnInPlaceDegrees) * (Math.PI / 180));
                tWalkReverse[t] = Math.min(1, w.reverseFraction);
                if (isNum(w.jump) && w.jump > 0)
                    tJump[t] = w.jump; // Frontline: the mech's jump jets (a hop, as the hover vehicles')
            }
        }
        if (u.crewArmoured === true)
            tCrewArmoured[t] = 1;
        const turn = turnRate * dt;
        tCosTurn[t] = (0, fmath_ts_1.dcos)(turn);
        tSinTurn[t] = (0, fmath_ts_1.dsin)(turn);
        tTurnRate[t] = turnRate;
        tSignature[t] = u.signature;
        tSensor[t] = u.sensorRange;
        tRadius[t] = unitRadius[Math.max(0, ac)];
        // W2 (designer 16 Nov 14:36): a unit may size its own hit sphere and collision body (units.json radiusMetres: the
        // raised Strider); default the armour class's constants.unitRadius
        if (u.radiusMetres !== undefined) {
            if (!isNum(u.radiusMetres) || !(u.radiusMetres > 0))
                problems.push(`${p}: radiusMetres must be > 0`);
            else
                tRadius[t] = u.radiusMetres;
        }
        tAir[t] = ac === exports.AC_AIR ? 1 : 0;
        tVehicle[t] = ac !== exports.AC_INFANTRY && ac !== exports.AC_STRUCTURE ? 1 : 0;
        tSquadSize[t] = Math.max(1, u.squadSize | 0);
        if (u.squadSpacing !== undefined) {
            if (!isNum(u.squadSpacing) || !(u.squadSpacing > 0))
                problems.push(`${p}: squadSpacing must be > 0`);
            else
                tSquadSpacing[t] = u.squadSpacing;
        }
        if (u.cp !== undefined && !isNum(u.cp))
            problems.push(`${p}: cp must be a number >= 0`);
        tCp[t] = typeof u.cp === "number" ? u.cp : 0;
        tPilot[t] = u.category === "pilot" ? 1 : 0;
        tTier[t] = typeof u.tier === "number" ? u.tier : 0;
        const cost = u.cost;
        tCostOre[t] = cost?.ore ?? 0;
        tCostGas[t] = cost?.gas ?? 0;
        const choices = [];
        if (!Array.isArray(u.seats))
            problems.push(`${p}: seats must be an array`);
        // expanded seats (count copies, in data order); the first driver seat drives
        const seatOf = [];
        let nj = 0;
        (u.seats ?? []).forEach((s, si) => {
            const role = s.role === "driver" ? exports.SEAT_DRIVER : s.role === "gunner" ? exports.SEAT_GUNNER : exports.SEAT_PASSENGER;
            seatOf[si] = nj;
            for (let k = 0; k < (s.count ?? 1); k++) {
                if (nj >= exports.MAX_SEATS) {
                    problems.push(`${p}: more than ${exports.MAX_SEATS} seats`);
                    break;
                }
                tSeatRole[t * exports.MAX_SEATS + nj] = role;
                if (role === exports.SEAT_DRIVER && tDriverSeat[t] < 0)
                    tDriverSeat[t] = nj;
                nj++;
            }
        });
        tSeatCount[t] = nj;
        (u.seats ?? []).forEach((s, si) => {
            const fixed = s.role === "driver";
            // seats[].muzzles: one [forward, up, right] per seat copy (count); fewer points than copies: the last one repeats
            const mz = s.muzzles;
            let pts = [];
            if (mz !== undefined) {
                if (!Array.isArray(mz) || mz.length === 0)
                    problems.push(`${p} seat ${si}: muzzles must be a non-empty array of [forward, up, right]`);
                else
                    pts = mz.map((v, k) => muzzlePoint(v, `${p} seat ${si} muzzles[${k}]`));
            }
            const ptOf = (k) => (pts.length ? pts[Math.min(k, pts.length - 1)] : null);
            if (s.weapon !== undefined) {
                const wi = weaponIndex(s.weapon, `${p} seat ${si}`);
                for (let k = 0; k < (s.count ?? 1); k++)
                    addMount(t, wi, fixed, si, p, seatOf[si] + k, false, ptOf(k));
                const alts = [wi, ...(s.altWeapons ?? []).map((a) => weaponIndex(a, `${p} seat ${si} altWeapons`))];
                choices.push(alts);
            }
            else {
                if (s.altWeapons?.length)
                    problems.push(`${p} seat ${si}: altWeapons without a default weapon`);
                choices.push(null);
            }
            (s.extraWeapons ?? []).forEach((x, xi) => {
                const em = s.extraMuzzles?.[xi]; // Frontline: an extra weapon's own launch point [forward, up, right] (else the seat's first)
                addMount(t, weaponIndex(x, `${p} seat ${si} extraWeapons`), fixed, -1, p, seatOf[si], false, em !== undefined ? muzzlePoint(em, `${p} seat ${si} extraMuzzles[${xi}]`) : ptOf(0));
                tMountExtra[t * exports.MAX_MOUNTS + tMountCount[t] - 1] = 1;
            });
        });
        tSeatChoices.push(choices);
        if (u.weapons !== undefined && !Array.isArray(u.weapons))
            problems.push(`${p}: weapons must be an array of weapon ids`);
        // unit-level weapons on a vehicle with a driver belong to the driver (single-seat extras); infantry carry them
        const um = muzzlePoint(u.weaponMuzzle, `${p} weaponMuzzle`);
        for (const x of u.weapons ?? [])
            addMount(t, weaponIndex(x, `${p} weapons`), false, -1, p, tDriverSeat[t], false, um);
        // fired kit weapons (pilot long rifle): manual-only mounts, never auto-targeted; placed charges are not mounted
        const kit = u.kitWeapons;
        if (kit !== undefined && !Array.isArray(kit))
            problems.push(`${p}: kitWeapons must be an array of weapon ids`);
        for (const x of kit ?? [])
            addMount(t, weaponIndex(x, `${p} kitWeapons`), false, -1, p, tDriverSeat[t], true, um);
        // ruling 33: canFire passenger seats fire the pilot's personal weapon from the seat (manual: player-aimed only). Only on
        // a vehicle with room for one mount per such seat (MAX_MOUNTS); otherwise not mounted (warning)
        if (passengerWeaponId !== undefined) {
            let nPass = 0;
            (u.seats ?? []).forEach((st) => { if (st.role === "passenger" && st.canFire === true)
                nPass += st.count ?? 1; });
            if (nPass > 0 && tMountCount[t] + nPass > exports.MAX_MOUNTS)
                passengerUnmounted.push(u.id);
            else if (nPass > 0)
                (u.seats ?? []).forEach((st, si) => {
                    if (st.role !== "passenger" || st.canFire !== true)
                        return;
                    for (let k = 0; k < (st.count ?? 1); k++) {
                        addMount(t, weaponIndex(passengerWeaponId, `${p} seat ${si} canFire`), false, -1, p, seatOf[si] + k, true, null);
                        const m = t * exports.MAX_MOUNTS + tMountCount[t] - 1;
                        tMountExtra[m] = 2;
                        passengerMounts.push([m, t * exports.MAX_SEATS + seatOf[si] + k]);
                    }
                });
        }
        if (tMountCount[t] === 0)
            noWeapons.push(u.id);
        else {
            let allMelee = 1;
            for (let m = 0; m < tMountCount[t]; m++)
                if (!wMelee[tMounts[t * exports.MAX_MOUNTS + m]])
                    allMelee = 0;
            tMeleeOnly[t] = allMelee;
        }
        for (const k of ["weapon", "secondaryWeapons"])
            if (u[k] !== undefined)
                problems.push(`${p}: field "${k}" is not part of contract revision 2 (use weapons[])`);
    });
    if (passengerUnmounted.length)
        warnings.push(`canFire passenger seats not mounted (more than ${exports.MAX_MOUNTS} mounts): ${passengerUnmounted.join(", ")}`);
    if (skippedPlaced.length)
        warnings.push(`placed-charge weapons are not fired by the sim (not mounted): ${skippedPlaced.join(", ")}`);
    if (noWeapons.length)
        warnings.push(`units with no weapons (cannot fire): ${noWeapons.join(", ")}`);
    const sigless = [];
    data.buildings.forEach((b, i) => {
        const t = nu + i, p = `building ${b.id}`;
        tMove[t] = exports.MOVE_STRUCTURE; // W1
        if (!isNum(b.hp) || !(b.hp > 0))
            problems.push(`${p}: hp must be > 0`);
        if (b.shield !== undefined && !isNum(b.shield))
            problems.push(`${p}: shield must be >= 0`);
        if (b.sensorRange !== undefined && !isNum(b.sensorRange))
            problems.push(`${p}: sensorRange must be >= 0`);
        tArmour[t] = exports.AC_STRUCTURE;
        tStructure[t] = 1;
        tHp[t] = b.hp;
        tShield[t] = b.shield ?? 0;
        tSpeed[t] = 0;
        tCosTurn[t] = 1;
        tSinTurn[t] = 0;
        tSensor[t] = b.sensorRange ?? 0; // only buildings the data names as sensors see anything
        const fx = b.effects;
        tRadar[t] = fx && fx.radar === true ? 1 : 0;
        if (b.signature !== undefined)
            tSignature[t] = b.signature;
        else {
            tSignature[t] = c.structureSignature;
            sigless.push(b.id);
        }
        tRadius[t] = unitRadius[exports.AC_STRUCTURE];
        tSquadSize[t] = 1;
        tSeatChoices.push([]);
        tTier[t] = typeof b.tier === "number" ? b.tier : 0;
        const bc = b.cost;
        tCostOre[t] = bc?.ore ?? 0;
        tCostGas[t] = bc?.gas ?? 0;
        tRespawnPoint[t] = fx && (fx.pilotRespawnPoint === true || fx.forwardBaseCore === true) ? 1 : 0; // w2b: the Field Depot is a respawn point (doc 18)
        tEnergyRefill[t] = fx && fx.pilotEnergyRefill === true ? 1 : 0;
        tPilotHome[t] = fx && (fx.pilotRespawnPoint === true || fx.forwardBaseCore === true) ? 1 : 0;
        const pt = fx?.producesTiers;
        tProducesTierMask[t] = Array.isArray(pt) ? pt.reduce((m, x) => m | (typeof x === "number" ? 1 << x : 0), 0) : 0xff;
        const bm = muzzlePoint(b.muzzle, `${p} muzzle`);
        if (b.weapon !== undefined)
            addMount(t, weaponIndex(b.weapon, p), false, -1, p, -1, false, bm);
        const bmz = b.muzzles; // ruling 130: one muzzle per weapon (the last repeats)
        (b.weapons ?? []).forEach((x, k) => addMount(t, weaponIndex(x, `${p} weapons`), false, -1, p, -1, false, Array.isArray(bmz) && bmz.length ? muzzlePoint(bmz[Math.min(k, bmz.length - 1)], `${p} muzzles[${k}]`) : bm));
        // B1: a bunker's mounted weapons: one gunner seat per mount (seat j fires mount j), fitted from a fortification level
        const bms = b.mounts;
        if (bms !== undefined) {
            if (!Array.isArray(bms) || bms.length === 0 || bms.length > exports.MAX_SEATS)
                problems.push(`${p}: mounts must be an array of 1-${exports.MAX_SEATS} mounts`);
            else if (tMountCount[t] > 0)
                problems.push(`${p}: mounts and weapon / weapons together`);
            else {
                let lv = 0;
                bms.forEach((mt, k) => {
                    const fl = typeof mt.fromLevel === "number" ? mt.fromLevel : 0;
                    if (fl < lv)
                        problems.push(`${p}: mounts[${k}].fromLevel below an earlier mount's (mounts are fitted in order)`);
                    lv = Math.max(lv, fl);
                    tSeatRole[t * exports.MAX_SEATS + k] = exports.SEAT_GUNNER;
                    addMount(t, weaponIndex(mt.weapon, `${p} mounts[${k}]`), false, k, p, k, false, muzzlePoint(mt.muzzle, `${p} mounts[${k}].muzzle`));
                    tMountLevel[t * exports.MAX_MOUNTS + k] = fl;
                });
                tSeatCount[t] = bms.length;
                tBunker[t] = 1;
            }
        }
    });
    if (sigless.length && !Number.isFinite(c.structureSignature))
        problems.push(`buildings without a signature (${sigless.join(", ")}) need constants.structureSignature`);
    // squad splash rule needs squadSpacing (SCHEMA: required when squadSize > 1)
    if (wSplash.some((r) => r > 0)) {
        const noSpacing = data.units.filter((u, t) => tSquadSize[t] > 1 && !(tSquadSpacing[t] > 0)).map((u) => u.id);
        if (noSpacing.length)
            warnings.push(`squads without squadSpacing (${noSpacing.join(", ")}): splash hits on them are limited only by the splash radius`);
    }
    // per-side unit ceiling by map size (limit 2 of 3)
    const mapCaps = [];
    const ms = getPath(raw, "mapSizes");
    if (ms && typeof ms === "object") {
        for (const [id, v] of Object.entries(ms)) {
            if (typeof v?.sizeKm !== "number" || typeof v?.maxUnitsPerSide !== "number") {
                problems.push(`constants.mapSizes.${id}: sizeKm and maxUnitsPerSide must be numbers`);
                continue;
            }
            mapCaps.push({ id, sizeM: v.sizeKm * 1000, maxUnitsPerSide: v.maxUnitsPerSide });
        }
        mapCaps.sort((a, b) => a.sizeM - b.sizeM);
    }
    else
        warnings.push("rule off: per-side unit ceiling (constants.mapSizes missing)");
    // ---- production tables (units' producedAt) and crews
    for (let t = 0; t < nt; t++)
        tProduces.push([]);
    data.units.forEach((u, t) => {
        const pa = u.producedAt;
        if (pa === undefined)
            return;
        if (!Array.isArray(pa)) {
            problems.push(`unit ${u.id}: producedAt must be an array of building ids`);
            return;
        }
        for (const bid of pa) {
            const bi = data.buildings.findIndex((b) => b.id === bid);
            if (bi < 0)
                problems.push(`unit ${u.id}: producedAt unknown building ${String(bid)}`);
            else
                tProduces[nu + bi].push(t);
        }
    });
    const pilotTypes = data.units.map((u, t) => (u.category === "pilot" ? t : -1)).filter((t) => t >= 0);
    const pilotType = pilotTypes.length === 1 ? pilotTypes[0] : -1;
    if (pilotTypes.length > 1)
        problems.push(`units: ${pilotTypes.length} units have category pilot (the pilot on foot must be unique)`);
    let crew = null;
    const cnum = (path, min = 0) => {
        const v = getPath(raw, path);
        if (typeof v !== "number" || !Number.isFinite(v) || v < min) {
            problems.push(`constants.${path}: missing or not a number >= ${min} (needed by the crew / pilot rules)`);
            return 0;
        }
        return v;
    };
    if (pilotType < 0 || getPath(raw, "crew") === undefined || getPath(raw, "pilot.energy") === undefined) {
        warnings.push("rule off: crews and pilots (needs one unit with category pilot and constants.crew / constants.pilot.energy): vehicles fire and move without occupants");
    }
    else {
        const zoneF = new Float64Array(exports.N_AC), zoneU = new Float64Array(exports.N_AC), zoneR = new Float64Array(exports.N_AC);
        const zoneArcCos = new Float64Array(exports.N_AC).fill(2), zoneAboveSin = new Float64Array(exports.N_AC).fill(2), zoneOpen = new Uint8Array(exports.N_AC);
        const gzF = new Float64Array(exports.N_AC), gzU = new Float64Array(exports.N_AC), gzR = new Float64Array(exports.N_AC);
        for (let a = 0; a < exports.N_AC; a++) {
            const ac = exports.ARMOUR_CLASSES[a];
            if (ac === "infantry" || ac === "structure")
                continue;
            const zp = `crew.pilotHitZone.${ac}`;
            if (getPath(raw, zp) === undefined)
                continue; // no zone: drivers of this class cannot be sniped
            zoneF[a] = cnum(`${zp}.forwardMetres`, -1e9);
            zoneU[a] = cnum(`${zp}.upMetres`, -1e9);
            zoneR[a] = cnum(`${zp}.radiusMetres`);
            // exposure (CONTRACTS rev 4): absent = exposed from every direction (the stage-1 behaviour), listed as a warning
            const arc = getPath(raw, `${zp}.exposedArcDegrees`), above = getPath(raw, `${zp}.exposedFromAboveDegrees`);
            if (arc === undefined) {
                warnings.push(`${zp}.exposedArcDegrees missing: the ${ac} driver zone is exposed from every direction`);
                zoneArcCos[a] = -1;
            }
            else if (typeof arc !== "number" || !(arc >= 0 && arc <= 360))
                problems.push(`constants.${zp}.exposedArcDegrees: must be a number in [0, 360]`);
            else
                zoneArcCos[a] = arc >= 360 ? -1 : (0, fmath_ts_1.dcos)((arc / 2) * (Math.PI / 180));
            if (above !== undefined) {
                if (typeof above !== "number" || !(above >= 0 && above <= 90))
                    problems.push(`constants.${zp}.exposedFromAboveDegrees: must be a number in [0, 90]`);
                else
                    zoneAboveSin[a] = (0, fmath_ts_1.dsin)(above * (Math.PI / 180));
            }
            const open = getPath(raw, `${zp}.openSeat`);
            if (open !== undefined && typeof open !== "boolean")
                problems.push(`constants.${zp}.openSeat: must be a boolean`);
            zoneOpen[a] = open === true ? 1 : 0;
            if (getPath(raw, `${zp}.gunnerZone`) !== undefined) {
                gzF[a] = cnum(`${zp}.gunnerZone.forwardMetres`, -1e9);
                gzU[a] = cnum(`${zp}.gunnerZone.upMetres`, -1e9);
                gzR[a] = cnum(`${zp}.gunnerZone.radiusMetres`);
            }
        }
        // per-seat zones (ruling 20): class defaults, then units.json seats[].hitZones
        const NS = nt * exports.MAX_SEATS;
        const szF = new Float64Array(NS), szU = new Float64Array(NS), szR = new Float64Array(NS), szRad = new Float64Array(NS);
        const szArcCos = new Float64Array(NS).fill(2), szArcX = new Float64Array(NS).fill(1), szArcZ = new Float64Array(NS), szAboveSin = new Float64Array(NS).fill(2), szOpen = new Uint8Array(NS);
        data.units.forEach((u, t) => {
            const a = tArmour[t], ns = tSeatCount[t];
            if (tDriverSeat[t] < 0)
                return;
            let gunnerDone = false;
            for (let j = 0; j < ns; j++) {
                const k = t * exports.MAX_SEATS + j, role = tSeatRole[k];
                // ruling 33: on an open-seat class (bikes) the first passenger seat (the Tandem's) is exposed like a gunner
                const cls = j === tDriverSeat[t] ? 0 : (role === exports.SEAT_GUNNER || (role === exports.SEAT_PASSENGER && zoneOpen[a] === 1)) && !gunnerDone ? 1 : -1;
                if (cls === 1)
                    gunnerDone = true;
                if (cls === 0 && zoneR[a] > 0) {
                    szF[k] = zoneF[a];
                    szU[k] = zoneU[a];
                    szRad[k] = zoneR[a];
                }
                else if (cls === 1 && gzR[a] > 0 && zoneOpen[a] === 1) {
                    szF[k] = gzF[a];
                    szU[k] = gzU[a];
                    szRad[k] = gzR[a];
                }
                else
                    continue;
                szArcCos[k] = zoneArcCos[a];
                szAboveSin[k] = zoneAboveSin[a];
                szOpen[k] = zoneOpen[a];
            }
            let nj = 0;
            (u.seats ?? []).forEach((st, si) => {
                const cnt = st.count ?? 1, hz = st.hitZones;
                const owner = `unit ${u.id} seat ${si} hitZones`;
                if (hz !== undefined) {
                    if (!Array.isArray(hz) || hz.length === 0)
                        problems.push(`${owner}: must be a non-empty array of zones (one per seat copy; the last repeats)`);
                    else if (st.role !== "driver" && st.role !== "gunner")
                        problems.push(`${owner}: only driver and gunner seats have target zones (ruling 20)`);
                    else
                        for (let c2 = 0; c2 < cnt && nj + c2 < exports.MAX_SEATS; c2++) {
                            const z = hz[Math.min(c2, hz.length - 1)], k = t * exports.MAX_SEATS + nj + c2;
                            const n = (key, lo, hi, def) => {
                                const v = z?.[key];
                                if (v === undefined && def !== undefined)
                                    return def;
                                if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) {
                                    problems.push(`${owner}[${c2}].${key}: must be a number in [${lo}, ${hi}]`);
                                    return def ?? 0;
                                }
                                return v;
                            };
                            szF[k] = n("forwardMetres", -20, 20);
                            szU[k] = n("upMetres", -20, 20);
                            szR[k] = n("rightMetres", -20, 20, 0);
                            szRad[k] = n("radiusMetres", 0.05, 5);
                            const arc = n("exposedArcDegrees", 0, 360), cen = n("exposedArcCentreDegrees", -180, 180, 0) * (Math.PI / 180);
                            szArcCos[k] = arc >= 360 ? -1 : (0, fmath_ts_1.dcos)((arc / 2) * (Math.PI / 180));
                            szArcX[k] = (0, fmath_ts_1.dcos)(cen);
                            szArcZ[k] = (0, fmath_ts_1.dsin)(cen);
                            szAboveSin[k] = z?.exposedFromAboveDegrees === undefined ? 2 : (0, fmath_ts_1.dsin)(n("exposedFromAboveDegrees", 0, 90) * (Math.PI / 180));
                            szOpen[k] = zoneOpen[a];
                            const reach = tRadius[t] + c.projectileHitRadius;
                            if (Math.hypot(szF[k], szU[k], szR[k]) + szRad[k] > reach + 1e-9)
                                problems.push(`${owner}[${c2}]: the zone reaches beyond the ${reach} m hit sphere (body radius + projectileHitRadius)`);
                        }
                }
                nj += cnt;
            });
        });
        // ruling 33: a passenger's personal weapon fires from its seat zone (no zone: the hit-sphere centre, as set by addMount)
        for (const [m, k] of passengerMounts)
            if (szRad[k] > 0) {
                tMuzzle[m * 3] = szF[k];
                tMuzzle[m * 3 + 1] = szU[k] + tRadius[Math.floor(k / exports.MAX_SEATS)]; /* zone: from the hit-sphere centre; muzzle: from the base point */
                tMuzzle[m * 3 + 2] = szR[k];
            }
        // rulings 25-26: which armour classes get the hull-critical window (bikes do not: the rider dies with the bike)
        const critClass = new Uint8Array(exports.N_AC);
        const cwc = getPath(raw, "crew.criticalWindowArmourClasses");
        if (cwc === undefined) {
            critClass.fill(1);
            warnings.push("crew.criticalWindowArmourClasses missing: every crewed vehicle gets the hull-critical window (bikes included)");
        }
        else if (!Array.isArray(cwc))
            problems.push("constants.crew.criticalWindowArmourClasses: must be an array of armour classes");
        else
            for (const x of cwc) {
                const a = exports.ARMOUR_CLASSES.indexOf(x);
                if (a < 0 || a === exports.AC_INFANTRY || a === exports.AC_STRUCTURE)
                    problems.push(`constants.crew.criticalWindowArmourClasses: "${String(x)}" is not one of bike|light|medium|heavy|air`);
                else
                    critClass[a] = 1;
            }
        const hackS = getPath(raw, "pilot.hackVehicleSeconds");
        if (hackS !== undefined && !(typeof hackS === "number" && hackS >= 0 && hackS <= 120))
            problems.push("constants.pilot.hackVehicleSeconds: must be a number in [0, 120]");
        if (hackS === undefined)
            warnings.push("pilot.hackVehicleSeconds missing: empty enemy vehicles are hijacked at once");
        const tr = req.tickRate;
        const settle = cnum("crew.aircraftSettleSeconds");
        crew = {
            aiGunnerAccuracy: cnum("crew.aiGunnerAccuracy"), aiDispersionMultiplier: cnum("crew.aiGunnerDispersionMultiplier", 1),
            ejectSpeed: cnum("crew.ejectLaunchSpeed"), enterRange: cnum("crew.enterRangeMetres"), exitGap: cnum("crew.exitGapMetres"), pickupGap: cnum("crew.pickupStopGapMetres"),
            settlePerTick: settle > 0 ? req.airAltitude / (settle * tr) : req.airAltitude,
            padLandGap: typeof getPath(raw, "crew.aircraftPadLandGapMetres") === "number" ? cnum("crew.aircraftPadLandGapMetres") : 8,
            passengerSurvive: typeof getPath(raw, "crew.carrierPassengerSurviveChance") === "number" ? Math.min(1, cnum("crew.carrierPassengerSurviveChance")) : 1,
            slideTicks: Math.round(cnum("crew.gunnerSlideSeconds") * tr), critClass,
            zoneF, zoneU, zoneR, zoneArcCos, zoneAboveSin, zoneOpen, gzF, gzU, gzR,
            szF, szU, szR, szRad, szArcCos, szArcX, szArcZ, szAboveSin, szOpen,
            hackTicks: typeof hackS === "number" ? Math.round(hackS * tr) : 0,
            energyMax: cnum("pilot.energy.max"), refillRadius: cnum("pilot.energy.refillRadiusMetres"), refillPerTick: cnum("pilot.energy.refillPerSecond") / tr,
            jumpSpeed: cnum("pilot.jumpSpeed"), sprintMul: cnum("pilot.sprintSpeedMultiplier"), crouchMul: cnum("pilot.crouchSpeedMultiplier"),
            jetThrust: cnum("pilot.jetpack.thrustAcceleration"), jetMaxRise: cnum("pilot.jetpack.maxRiseSpeed"),
            jetFreeBurnSeconds: cnum("pilot.jetpackBurnSecondsHalcyon") / gravityG, // doc 12: long burns in low gravity, short in high
            jetRechargePerTick: cnum("pilot.jetpack.freeBurnRechargePerSecond") / tr, jetEnergyPerSecond: cnum("pilot.jetpack.energyPerSecond"),
            fallSafe: cnum("pilot.fallDamage.safeSpeed"), fallPerSpeed: cnum("pilot.fallDamage.perMetrePerSecond"), brakedDescent: cnum("pilot.jetpack.brakedDescentSpeed"),
            torchHullPerTick: cnum("pilot.repairTorch.hullPerSecond") / tr, torchEnergyPerTick: cnum("pilot.repairTorch.energyPerSecond") / tr, torchRange: cnum("pilot.repairTorch.rangeMetres"),
            respawnTicks: Math.round(cnum("pilot.respawnSeconds") * tr), respawnPenaltyTicks: Math.round(cnum("pilot.deathPenaltySeconds") * tr),
            respawnMaxTicks: Math.round(cnum("pilot.respawnMaxSeconds") * tr), respawnResetTicks: Math.round(cnum("pilot.deathPenaltyResetSeconds") * tr),
            crouchedSignature: typeof getPath(raw, "stealth.pilotCrouchedSignature") === "number" ? getPath(raw, "stealth.pilotCrouchedSignature") : tSignature[pilotType],
            proneSignature: 0, proneMul: 0, crouchAcc: 1, proneAcc: 1, toProneTicks: 0, upTicks: 0,
            playerAcc: 1, playerAccSkip: new Uint8Array(weaponIds.length), playerHpMul: 1,
        };
        { // ruling 42 stances
            const c = crew, st = getPath(raw, "pilot.stance") !== undefined;
            const ps = getPath(raw, "stealth.pilotProneSignature");
            c.proneSignature = typeof ps === "number" ? ps : c.crouchedSignature;
            c.proneMul = st ? cnum("pilot.stance.proneSpeedMultiplier") : c.crouchMul;
            c.crouchAcc = st ? cnum("pilot.stance.crouchedAccuracyMultiplier") : 1;
            c.proneAcc = st ? cnum("pilot.stance.proneAccuracyMultiplier") : 1;
            c.toProneTicks = st ? Math.round(cnum("pilot.stance.toProneSeconds") * tr) : 0;
            c.upTicks = st ? Math.round(cnum("pilot.stance.upFromProneSeconds") * tr) : 0;
            // ruling 109: a player's pilot weapons hit where aimed (x playerDispersionMultiplier; the listed weapons keep their spread)
            const pa = getPath(raw, "pilot.playerDispersionMultiplier");
            if (typeof pa === "number")
                c.playerAcc = pa;
            const ph = getPath(raw, "pilot.playerHealthMultiplier");
            if (typeof ph === "number" && ph > 0)
                c.playerHpMul = ph;
            const skip = getPath(raw, "pilot.playerDispersionKeep");
            if (Array.isArray(skip))
                for (const id of skip) {
                    const wi = weaponIds.indexOf(String(id));
                    if (wi >= 0)
                        c.playerAccSkip[wi] = 1;
                }
        }
    }
    let production = null;
    if (getPath(raw, "production.unitBuildSecondsByTier") === undefined || getPath(raw, "production.queueLength") === undefined) {
        warnings.push("rule off: production queues (constants.production.queueLength / unitBuildSecondsByTier missing)");
    }
    else {
        const buildTicks = new Int32Array(4);
        for (let k = 1; k <= 3; k++)
            buildTicks[k] = Math.max(1, Math.round(cnum(`production.unitBuildSecondsByTier.${k}`) * req.tickRate));
        const tierRequires = [[]], tierPoints = new Int32Array(4);
        for (let k = 1; k <= 3; k++) {
            const r = getPath(raw, `techTiers.${k}.requires`);
            const list = [];
            if (Array.isArray(r))
                for (const bid of r) {
                    const bi = data.buildings.findIndex((b) => b.id === bid);
                    if (bi < 0)
                        problems.push(`constants.techTiers.${k}.requires: unknown building ${String(bid)}`);
                    else
                        list.push(nu + bi);
                }
            tierRequires.push(list);
            const sp = getPath(raw, `techTiers.${k}.suppliedPoints`);
            tierPoints[k] = typeof sp === "number" ? sp : 0;
        }
        const ql = cnum("production.queueLength", 1);
        production = {
            queueLength: Math.floor(ql), cancelRefund: typeof getPath(raw, "production.cancelRefund") === "number" ? getPath(raw, "production.cancelRefund") : 1,
            rollOutGap: typeof getPath(raw, "production.rollOutGapMetres") === "number" ? getPath(raw, "production.rollOutGapMetres") : 3,
            buildTicks, startOre: typeof getPath(raw, "economy.startingStock.ore") === "number" ? getPath(raw, "economy.startingStock.ore") : 0,
            startGas: typeof getPath(raw, "economy.startingStock.gas") === "number" ? getPath(raw, "economy.startingStock.gas") : 0,
            tierRequires, tierPoints,
        };
    }
    if (problems.length)
        throw new DataError(problems);
    let maxSig = 0, maxSensor = 0;
    for (let t = 0; t < nt; t++) {
        const s = tSignature[t] * Math.max(1, c.firingSignatureFactor, c.idleSignatureFactor);
        if (s > maxSig)
            maxSig = s;
        if (tSensor[t] > maxSensor)
            maxSensor = tSensor[t];
    }
    // rear arc of total width A: attacker direction within A/2 of the target's back.
    const rearDot = rearOn ? -(0, fmath_ts_1.dcos)((c.rearArcDegrees / 2) * (Math.PI / 180)) : -2;
    const tolDeg = getPath(raw, "combat.turretAimToleranceDegrees");
    const turretAimCos = (0, fmath_ts_1.dcos)(((typeof tolDeg === "number" && tolDeg >= 0 ? tolDeg : 3) * Math.PI) / 180);
    const slf = getPath(raw, "combat.structureLeadFraction");
    const structureLeadFraction = typeof slf === "number" && slf >= 0 && slf <= 1 ? slf : 1;
    const ast = getPath(raw, "combat.aiSmallTargetSpreadMultiplier");
    const aiSmallTargetSpread = typeof ast === "number" && ast >= 1 ? ast : 1;
    const asl = getPath(raw, "combat.aiSmallTargetLeadFraction");
    const aiSmallTargetLead = typeof asl === "number" && asl >= 0 && asl <= 1 ? asl : 1;
    const aiHomingSmall = getPath(raw, "combat.aiHomingLocksSmallTargets") !== false;
    const asr = getPath(raw, "combat.aiSmallTargetReactionSeconds");
    let aiSmallReact = null;
    if (asr !== undefined) {
        if (asr === null || typeof asr !== "object")
            problems.push("constants.combat.aiSmallTargetReactionSeconds: must be an object of difficulty -> seconds");
        else {
            aiSmallReact = {};
            for (const [k, v] of Object.entries(asr)) {
                if (typeof v === "number" && v >= 0 && v <= 30)
                    aiSmallReact[k] = v;
                else
                    problems.push(`constants.combat.aiSmallTargetReactionSeconds.${k}: must be a number in [0, 30]`);
            }
        }
    }
    const psm = getPath(raw, "combat.playerSightMetres");
    const playerSight = typeof psm === "number" && psm > 0 ? psm : 0;
    const crm = getPath(raw, "stealth.cloak.revealMetres");
    const cloakReveal = typeof crm === "number" && crm > 0 ? crm : 0;
    const ahc = getPath(raw, "combat.aiHeatCeiling"), ahr = getPath(raw, "combat.aiHeatResume");
    const aiHeatCeiling = typeof ahc === "number" && ahc > 0 && ahc <= 1 ? ahc : 0.8;
    const aiHeatResume = typeof ahr === "number" && ahr >= 0 && ahr < aiHeatCeiling ? ahr : Math.min(0.25, aiHeatCeiling / 2);
    const fixedCos = fixedArcOn ? (0, fmath_ts_1.dcos)((c.fixedWeaponArcDegrees / 2) * (Math.PI / 180)) : -2;
    let fogVisualRange = Infinity;
    const ar = getPath(raw, `atmosphereRules.${planet?.atmosphere}.fogVisualRangeMetres`);
    if (ar !== undefined) {
        if (typeof ar === "number" && ar > 0)
            fogVisualRange = ar;
        else
            problems.push(`constants.atmosphereRules.${planet?.atmosphere}.fogVisualRangeMetres: must be > 0`);
    }
    const hover = compileHover(raw, tHover, c.tickRate, problems); // ruling 112
    if (problems.length)
        throw new DataError(problems);
    const fingerprint = hashString(JSON.stringify([data.constants, data.planets, data.damageMatrix, data.weapons, data.units, data.buildings]));
    // fix-qa2 d: gas per shot needs the team gas economy (production and economy.startingStock, doc 7); without it energy weapons fire free
    if ((production === null || getPath(raw, "economy.startingStock") === undefined) && wGas.some((g) => g > 0)) {
        wGas.fill(0);
        warnings.push("rule off: energy weapons cost gas (weapons gasPerShot): no gas economy (constants.production / economy.startingStock missing)");
    }
    return {
        constants: c, raw: data, fingerprint, planetId, dt, gravity, gravityG, airless: planet?.atmosphere === "none", aircraftAllowed: getPath(raw, `atmosphereRules.${planet?.atmosphere}.aircraftAllowed`) !== false, fogVisualRange, warnings, matrix,
        weaponIds, wTraverse, wTravCos, wTravSin, wAcqTicks, wChargeTicks, wHeatPerShot, wHeatDrain, wLockTicks, wAiMask, wDamage, wPeriod, wGas, wSps, wRange, wSpeed, wBallistic, wCanHitAir, wCanHitGround, wSkip, wDamageType, wMelee, wRam, wSplash, wDispersion, wMinRange, wAmmo, wHoming, wSalvo, tBoostMul, tBoostDrain, tBoostFill, tBoostMin, tHover, tAccel, tDrag, tJump, tCrewArmoured, tWalk, tWalkAccel, tWalkBrake, tWalkCosInPlace, tWalkReverse, tMove, hover, rearmTicks: typeof getPath(raw, "aircraftRearmSeconds") === "number" ? Math.max(1, Math.round(getPath(raw, "aircraftRearmSeconds") * c.tickRate)) : 0,
        typeIds, unitCount: nu, tArmour, tHp, tShield, tSpeed, tCosTurn, tSinTurn, tTurnRate, tSignature, tSensor,
        tRadius, tStructure, tAir, tVehicle, tMountCount, tMounts, tMountFixed, tMountSeat, tSeatChoices, tSquadSize,
        tSquadSpacing, tCp, tMeleeOnly, tRadar, tPilot, mapCaps,
        crewOn: crew !== null, crew, pilotType, tSeatCount, tSeatRole, tDriverSeat, tSeatArmed, tMountCrewSeat, tMountManual, tMountExtra, tBunker, tMountLevel, wCanopyKill, wRiderShot, tMuzzle,
        productionOn: production !== null, production, tTier, tCostOre, tCostGas, tProduces, tProducesTierMask, tRespawnPoint, tEnergyRefill, tPilotHome,
        maxSignature: maxSig, maxSensor, rearDot, fixedCos, turretAimCos, structureLeadFraction, aiSmallTargetSpread, aiSmallTargetLead, aiHomingSmall, aiSmallReact, playerSight, cloakReveal, aiHeatCeiling, aiHeatResume,
    };
}
function compileHover(raw, tHover, tickRate, problems) {
    if (!tHover.some((v) => v === 1))
        return null;
    const n = (k) => { const v = getPath(raw, `hover.${k}`); if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        problems.push(`constants.hover.${k}: missing or not a number >= 0 (needed by units with handling)`);
        return 0;
    } return v; };
    return { stopSpeed: n("stopSpeed"), overspeedRatio: n("overspeedRatio"), overspeedBrake: n("overspeedBrakeFraction"), aiAccelMul: n("aiAccelMultiplier"), aiBrakeK: n("aiBrakeDistanceFactor"),
        jumpCooldownTicks: Math.max(1, Math.round(n("jumpCooldownSeconds") * tickRate)), jumpClear: n("jumpClearMetres"), bounce: n("bounce") };
}
/**
 * Target zones of the crew seats of unit type `typeId` (seat order, seats without a zone left out), for clients that
 * only have the data and the snapshot (guests): world centre = entity position + up (hit-sphere radius + up) +
 * forward x heading + right x (-dirZ, dirX); a ring per seat whose bit is set in the entity's crew mask.
 */
function seatHitZones(d, typeId) {
    const t = d.typeIds.indexOf(typeId), out = [];
    if (t < 0 || !d.crew || t >= d.unitCount)
        return out;
    const cr = d.crew;
    for (let j = 0; j < d.tSeatCount[t]; j++) {
        const k = t * exports.MAX_SEATS + j;
        if (!(cr.szRad[k] > 0))
            continue;
        const r = d.tSeatRole[k];
        out.push({ seat: j, role: r === exports.SEAT_DRIVER ? "driver" : r === exports.SEAT_GUNNER ? "gunner" : "passenger", forward: cr.szF[k], up: cr.szU[k], right: cr.szR[k], radius: cr.szRad[k] });
    }
    return out;
}
