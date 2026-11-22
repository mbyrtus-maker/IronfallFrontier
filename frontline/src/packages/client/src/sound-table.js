"use strict";
// P1 sound pass: what every sound is made of, as data (no Web Audio here, so Node tests read it directly).
//  * WEAPON_FAMILY: weapon id -> family; FAMILIES: the layered recipe of each family (transient, body, low thump, tail,
//    mechanical action, supersonic crack), sized to the weapon: small guns light and fast, heavy guns low and long.
//  * CUES: every one-shot that is not a weapon or an explosion (stingers, call-downs, capture, construction, pilot kit,
//    transports, UI, unit acknowledgement chirps), as a list of tone / filtered-noise parts on a bus.
//  * LOOPS: persistent beds (engines per vehicle class, weather, planet ambience, wreck fires, call zones, heartbeat).
//  * EVENT_SOUNDS: every sim event kind -> what it sounded like before this pass and the cues it plays now (the
//    inventory in reports/stage4-p1-sound.md is generated from the same table; a test checks that every event kind
//    of the sim's EV table is listed and that every cue named exists).
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATE_SOUNDS = exports.EVENT_SOUNDS = exports.BUILTIN = exports.CALL_SOUNDS = exports.PLANET_SURFACE = exports.LAYER_SURFACE = exports.SURFACES = exports.PLANET_BEDS = exports.WEATHER_BEDS = exports.LOOPS = exports.ENGINES = exports.UNIT_ENGINE = exports.ENGINE_CLASSES = exports.UNIT_VOICE = exports.VOICES = exports.VOICE_CLASSES = exports.CUES = exports.AIR = exports.FAMILIES = exports.CLASS_FAMILY = exports.MG_TRIM = exports.MG_LEVEL = exports.MG_SAMPLE = exports.WEAPON_FAMILY = exports.WEAPON_FAMILIES = exports.BUSES = void 0;
exports.familyOf = familyOf;
exports.rapidOf = rapidOf;
exports.distanceModel = distanceModel;
exports.voiceOf = voiceOf;
exports.ackContour = ackContour;
exports.engineOf = engineOf;
exports.surfaceOf = surfaceOf;
exports.spaceOf = spaceOf;
exports.BUSES = ["weapons", "explosions", "vehicles", "ambience", "ui", "music"];
exports.WEAPON_FAMILIES = ["kinetic-small", "kinetic-medium", "kinetic-heavy", "autocannon", "energy", "beam", "rocket", "missile", "mortar", "artillery", "flak", "carbine", "rifle", "turret", "shotgun", "melee", "laser-cannon", "laser-rapid", "tank-cannon", "none"];
/** Every weapon in data/weapons.json. A weapon not listed falls back by damage type (familyOf). */
exports.WEAPON_FAMILY = {
    "sentry-cannon": "tank-cannon", "gun-tower-cannon": "tank-cannon", "fb-turret-cannon": "tank-cannon", // designer 21 Nov: turret cannons
    "pilot-carbine": "carbine", "pilot-long-rifle": "rifle", "pilot-demo-charge": "none", "sapper-demo-charge": "none", "mine-layer": "none",
    "trooper-rifle": "kinetic-small", "marksman-rifle": "kinetic-small", "hammer-machine-gun": "kinetic-small", "carrier-roof-gun": "kinetic-small",
    "mule-door-gun": "kinetic-small", "strider-chin-guns": "kinetic-small", "dart-gun": "kinetic-small",
    "scatter-gun": "shotgun", shotgun: "shotgun", // Frontline: the pilot's shotgun
    "anti-materiel-rifle": "kinetic-heavy", "rail-lance": "kinetic-heavy", "bastion-main-cannon": "tank-cannon", "carrier-hull-gun": "kinetic-medium",
    "lancer-laser-cannon": "laser-cannon", "mech-arc-lance": "laser-cannon", "lancer-rapid-laser": "laser-rapid", "bastion-turret-autocannon": "autocannon", "wasp-nose-cannon": "autocannon",
    "mule-chin-gun": "energy", "arc-lance": "beam", "arc-projector": "beam",
    "sapper-rocket": "rocket", "rocket-tube": "rocket", "dart-shadower": "missile", "salvo-missiles": "missile", "salvo-minigun": "kinetic-small", "wasp-rocket-pods": "rocket",
    "bastion-missile-pod": "missile", "missile-battery-aa": "missile",
    "pilot-mortar": "mortar", "pilot-rail-driver": "kinetic-heavy", "pilot-amr": "kinetic-heavy", "pilot-trooper-rifle": "kinetic-small", // designer 22 Nov: the new Frontline weapons
    "hammer-mortar": "mortar", "strider-siege-gun": "artillery",
    "flak-gun": "flak", "strider-aa-turret": "flak",
    "gun-tower-autocannon": "turret", "sentry-turret-gun": "turret", "sentry-rocket-pod": "rocket", // ruling 130: the drop pod sentry's rocket pod
    "bunker-hmg": "kinetic-medium", "bunker-autocannon": "autocannon", "bunker-at-launcher": "rocket", // B1 bunker mounts
    "mechanical-arm": "melee", "ramming-plow": "melee",
};
const BY_DAMAGE = { kinetic: "kinetic-medium", explosive: "kinetic-heavy", energy: "energy", flak: "flak", laser: "laser-rapid" };
/** A weapon's sound family: the table, else by damage type ("kinetic" | "explosive" | "energy" | "flak"). */
function familyOf(weaponId, damageType) {
    return exports.WEAPON_FAMILY[weaponId] ?? BY_DAMAGE[damageType] ?? "kinetic-medium";
}
/**
 * Machine guns played from the designer's recorded M249 shot (CREDITS.md; embedded by build.mjs) instead of the synth:
 * weapon id -> playback rate (lighter, faster guns a little higher, the heavier bunker gun lower). Other weapons, and
 * these while the sample is not decoded, use the synth families above. The carbine keeps its synth (a semi-auto
 * pilot rifle, not an LMG).
 */
exports.MG_SAMPLE = {
    "hammer-machine-gun": 1.0, "carrier-roof-gun": 0.97, "mule-door-gun": 1.04, "strider-chin-guns": 0.94,
    "dart-gun": 0.9, // Frontline: lower and heavier (it read as a pea shooter at 1.12)
    "salvo-minigun": 1.08, "bunker-hmg": 0.88,
    "sentry-turret-gun": 0.98, "gun-tower-mg": 0.92, // designer 21 Nov: the turrets' machine guns
    "heavy-machine-gun": 0.76, // designer 21 Nov: the pilot's heavy machine gun (slot 2) on the recorded M249, slowed: deep, with a low punch (audio.ts mgShot)
    "gunship-twin-mg": 1.18, "gunship-door-minigun": 1.0, // Frontline gunship
    "mech-autocannon": 0.52, // Frontline: the mech's twin autocannon, low and booming
};
/** The sample's voice level (as the kinetic-small synth: the same distance culling) and its own trim (A-weighted loudness of an own shot ~3 dB over the kinetic-small synth, level with the autocannon). */
exports.MG_LEVEL = 0.42, exports.MG_TRIM = 0.11;
/** Old damage-class names (calls made before the pass) -> a family. */
exports.CLASS_FAMILY = { kinetic: "kinetic-medium", explosive: "kinetic-heavy", energy: "energy", flak: "flak" };
const F = (o) => ({ click: 0.5, clickF: 4000, body: 0.8, bodyF0: 1800, bodyF1: 700, bodyQ: 0.9, bodyDur: 0.09, thump: 0.5, thumpF0: 140, thumpF1: 55, thumpDur: 0.1, tail: 0.25, tailF: 900, tailDur: 0.25, mech: 0, crack: 0, whoosh: 0, size: 0.3, dur: 0.35, prio: 0.5, level: 0.5, ...o });
exports.FAMILIES = {
    "kinetic-small": F({ click: 0.55, clickF: 4600, body: 0.75, bodyF0: 2300, bodyF1: 1000, bodyQ: 1.0, bodyDur: 0.055, thump: 0.3, thumpF0: 190, thumpF1: 90, thumpDur: 0.05, tail: 0.16, tailF: 1300, tailDur: 0.16, mech: 0.12, size: 0.15, dur: 0.22, prio: 0.35, level: 0.42 }),
    "kinetic-medium": F({ click: 0.6, clickF: 3800, body: 0.9, bodyF0: 1800, bodyF1: 650, bodyQ: 0.9, bodyDur: 0.09, thump: 0.6, thumpF0: 140, thumpF1: 55, thumpDur: 0.1, tail: 0.28, tailF: 900, tailDur: 0.3, mech: 0.1, size: 0.35, dur: 0.4, prio: 0.45, level: 0.5 }),
    // designer 19 Nov ("the bastion gun should feel more powerful"): the Bastion's main gun, a heavier, longer synth under
    // the designer's explosion recording pitched down (audio.ts tankCannonShot)
    "tank-cannon": F({ click: 0.8, clickF: 2600, body: 1.1, bodyF0: 900, bodyF1: 160, bodyQ: 0.7, bodyDur: 0.28, thump: 1.6, thumpF0: 70, thumpF1: 24, thumpDur: 0.5, tail: 0.75, tailF: 480, tailDur: 1.6, mech: 0.2, crack: 0.7, size: 1.0, dur: 1.8, prio: 0.85, level: 0.75 }),
    "kinetic-heavy": F({ click: 0.7, clickF: 3000, body: 1.0, bodyF0: 1100, bodyF1: 220, bodyQ: 0.7, bodyDur: 0.22, thump: 1.0, thumpF0: 85, thumpF1: 30, thumpDur: 0.32, tail: 0.5, tailF: 650, tailDur: 0.9, mech: 0.15, crack: 0.6, size: 0.85, dur: 1.1, prio: 0.7, level: 0.62 }),
    autocannon: F({ click: 0.65, clickF: 3600, body: 0.85, bodyF0: 1500, bodyF1: 520, bodyQ: 1.0, bodyDur: 0.07, thump: 0.6, thumpF0: 120, thumpF1: 50, thumpDur: 0.08, tail: 0.2, tailF: 850, tailDur: 0.22, mech: 0.22, crack: 0.25, size: 0.45, dur: 0.3, prio: 0.45, level: 0.5 }),
    energy: F({ click: 0.2, clickF: 6000, body: 0, thump: 0.15, thumpF0: 160, thumpF1: 80, thumpDur: 0.06, tail: 0.1, tailF: 1400, tailDur: 0.15, size: 0.25, dur: 0.26, prio: 0.4, level: 0.45,
        zap: { f0: 2400, f1: 520, q: 4, tone: 0.18, toneF0: 900, toneF1: 240, buzz: 0 } }),
    beam: F({ click: 0.25, clickF: 6500, body: 0, thump: 0.2, thumpF0: 120, thumpF1: 60, thumpDur: 0.1, tail: 0.15, tailF: 1800, tailDur: 0.25, size: 0.4, dur: 0.45, prio: 0.5, level: 0.5,
        zap: { f0: 3600, f1: 900, q: 3, tone: 0.1, toneF0: 220, toneF1: 180, buzz: 0.25 } }),
    rocket: F({ click: 0.35, clickF: 2600, body: 0.7, bodyF0: 900, bodyF1: 300, bodyQ: 0.8, bodyDur: 0.15, thump: 0.6, thumpF0: 100, thumpF1: 45, thumpDur: 0.18, tail: 0.35, tailF: 700, tailDur: 0.5, whoosh: 0.55, size: 0.6, dur: 0.8, prio: 0.55, level: 0.52 }),
    missile: F({ click: 0.3, clickF: 3000, body: 0.55, bodyF0: 1200, bodyF1: 400, bodyQ: 0.8, bodyDur: 0.12, thump: 0.4, thumpF0: 120, thumpF1: 55, thumpDur: 0.12, tail: 0.3, tailF: 900, tailDur: 0.4, whoosh: 0.75, size: 0.5, dur: 0.9, prio: 0.5, level: 0.5 }),
    mortar: F({ click: 0.4, clickF: 2200, body: 0.8, bodyF0: 700, bodyF1: 180, bodyQ: 0.8, bodyDur: 0.2, thump: 0.9, thumpF0: 75, thumpF1: 32, thumpDur: 0.28, tail: 0.45, tailF: 500, tailDur: 0.8, mech: 0.1, size: 0.7, dur: 1.0, prio: 0.6, level: 0.55 }),
    artillery: F({ click: 0.8, clickF: 2400, body: 1.0, bodyF0: 800, bodyF1: 120, bodyQ: 0.6, bodyDur: 0.4, thump: 1.0, thumpF0: 60, thumpF1: 22, thumpDur: 0.6, tail: 0.65, tailF: 450, tailDur: 1.6, mech: 0.12, crack: 0.8, size: 1, dur: 1.9, prio: 0.85, level: 0.7 }),
    flak: F({ click: 0.8, clickF: 4200, body: 0.8, bodyF0: 800, bodyF1: 240, bodyQ: 1.1, bodyDur: 0.18, thump: 0.5, thumpF0: 110, thumpF1: 45, thumpDur: 0.16, tail: 0.35, tailF: 750, tailDur: 0.5, mech: 0.15, crack: 0.35, size: 0.6, dur: 0.6, prio: 0.55, level: 0.52 }),
    // P1g (designer playtest 15 Nov 18:34: carbine "a little tinny still"): body moved down (band 900 -> 380 Hz, a 170 -> 70 Hz
    // thump and a low-passed punch), the high transient quieter and lower (less 3-6 kHz), the action click kept, a short outdoor tail
    carbine: F({ click: 0.32, clickF: 2300, body: 0.72, bodyF0: 950, bodyF1: 380, bodyQ: 0.8, bodyDur: 0.08, thump: 0.6, thumpF0: 170, thumpF1: 70, thumpDur: 0.085, punch: 0.6, punchDur: 0.07, tail: 0.24, tailF: 1000, tailDur: 0.34, mech: 0.2, size: 0.2, dur: 0.38, prio: 0.4, level: 0.37 }),
    // the long rifle: a deep crack and a rolling tail
    rifle: F({ click: 0.6, clickF: 2600, body: 0.85, bodyF0: 800, bodyF1: 220, bodyQ: 0.8, bodyDur: 0.18, thump: 0.95, thumpF0: 115, thumpF1: 38, thumpDur: 0.22, punch: 0.6, punchDur: 0.12, tail: 0.45, tailF: 650, tailDur: 1.0, roll: 0.38, rollDur: 1.5, mech: 0.22, crack: 0.65, size: 0.75, dur: 1.6, prio: 0.6, level: 0.51 }),
    turret: F({ click: 0.6, clickF: 3400, body: 0.9, bodyF0: 1300, bodyF1: 420, bodyQ: 0.9, bodyDur: 0.1, thump: 0.75, thumpF0: 105, thumpF1: 42, thumpDur: 0.14, tail: 0.35, tailF: 750, tailDur: 0.45, mech: 0.3, crack: 0.3, size: 0.55, dur: 0.55, prio: 0.5, level: 0.52 }),
    shotgun: F({ click: 0.35, clickF: 1900, body: 0.9, bodyF0: 650, bodyF1: 150, bodyQ: 0.6, bodyDur: 0.16, thump: 1.25, thumpF0: 95, thumpF1: 34, thumpDur: 0.24, tail: 0.45, tailF: 420, tailDur: 0.55, mech: 0.3, size: 0.45, dur: 0.7, prio: 0.5, level: 0.6 }), // Frontline: a low boom
    melee: F({ click: 0.4, clickF: 2000, body: 0.6, bodyF0: 900, bodyF1: 400, bodyQ: 2.5, bodyDur: 0.12, thump: 0.7, thumpF0: 90, thumpF1: 50, thumpDur: 0.12, tail: 0.1, tailF: 600, tailDur: 0.1, mech: 0.4, size: 0.3, dur: 0.3, prio: 0.35, level: 0.45 }),
    // F2 (ruling 91): the Lancer's laser cannon: a heavy beam discharge (a deep crack-thump under a falling resonant sweep and a
    // buzzing arc, a long tail); its rapid laser: short bright zaps that do not stack into a roar at 8 a second
    "laser-cannon": F({ click: 0.7, clickF: 5200, body: 0.5, bodyF0: 1400, bodyF1: 260, bodyQ: 0.8, bodyDur: 0.2, thump: 1.0, thumpF0: 95, thumpF1: 28, thumpDur: 0.35, tail: 0.45, tailF: 1600, tailDur: 0.9, crack: 0.5, size: 0.8, dur: 1.1, prio: 0.75, level: 0.66,
        zap: { f0: 4200, f1: 300, q: 5, tone: 0.3, toneF0: 1200, toneF1: 90, buzz: 0.4 } }),
    "laser-rapid": F({ click: 0.3, clickF: 7000, body: 0, thump: 0.08, thumpF0: 220, thumpF1: 120, thumpDur: 0.03, tail: 0.06, tailF: 2200, tailDur: 0.08, size: 0.2, dur: 0.14, prio: 0.35, level: 0.4,
        zap: { f0: 3400, f1: 1500, q: 6, tone: 0.14, toneF0: 1900, toneF1: 1100, buzz: 0 } }),
    none: F({ click: 0, body: 0, thump: 0, tail: 0, size: 0, dur: 0.05, prio: 0, level: 0 }),
};
/** Rapid fire (own automatic weapons, several shots a second): a shorter crack whose tail does not stack into a roar. */
function rapidOf(d) {
    return { ...d, bodyDur: d.bodyDur * 0.7, thumpDur: d.thumpDur * 0.7, tail: d.tail * 0.45, tailDur: Math.min(d.tailDur, 0.14), crack: d.crack * 0.4, whoosh: d.whoosh * 0.6, dur: Math.min(d.dur, 0.22), level: d.level * 0.8 };
}
exports.AIR = {
    normal: { reach: 1, hiCut: 1, lowCarry: 1, reverb: 1 },
    thin: { reach: 0.8, hiCut: 1.2, lowCarry: 0.8, reverb: 0.8 },
    none: { reach: 0.35, hiCut: 0.35, lowCarry: 0.5, reverb: 0.15 },
    dense: { reach: 1.1, hiCut: 0.75, lowCarry: 1.3, reverb: 1.25 },
};
/**
 * Level, low-pass cutoff, crack-to-thump gap and tail weight at a distance (m) for a sound of a given size (0..1).
 * Pure: tests check that farther is quieter and duller, and that the gap grows (sound at 340 m/s; the crack of a
 * supersonic round arrives with the round, about 2.5x faster).
 */
function distanceModel(dist, size, air = exports.AIR.normal) {
    const ref = (40 + 160 * size) * air.reach;
    const gain = 1 / (1 + Math.pow(dist / ref, 1.35));
    const cutoff = Math.max(350, Math.min(20000, (18000 * air.hiCut) / (1 + dist / (140 + 220 * size))));
    const gap = Math.max(0, dist / 340 - dist / 850);
    const far = Math.min(1, dist / (500 + 500 * size));
    return { gain, cutoff, gap: Math.min(gap, 1.2), tail: 0.7 + 0.8 * far, slap: dist > 120 ? Math.min(0.5, far * 0.6) * air.reverb : 0 };
}
const T = (w, at, d, f0, f1, g, a = 0.003) => ({ k: "t", w, at, d, f0, f1, g, a });
const N = (ft, at, d, f0, f1, q, g, a = 0.002) => ({ k: "n", ft, at, d, f0, f1, q, g, a });
const ui = (level, parts) => ({ bus: "ui", level, prio: 1, crit: true, parts });
const world = (bus, level, prio, ref, parts, verb = 0.3) => ({ bus, level, prio, ref, verb, parts });
/** Every cue. Durations follow from the parts. Pitches and levels vary a few per cent per play (Sound.cue). */
exports.CUES = {
    // --- UI (softer than the old square beeps)
    click: ui(0.2, [T("sine", 0, 0.025, 1500, 1250, 0.45, 0.001), N("highpass", 0, 0.012, 5000, 6000, 0.7, 0.15, 0.0005)]),
    confirm: ui(0.22, [T("sine", 0, 0.05, 880, 880, 0.4), T("triangle", 0.055, 0.08, 1320, 1330, 0.4)]),
    error: ui(0.24, [T("triangle", 0, 0.08, 330, 300, 0.45, 0.002), T("triangle", 0.1, 0.12, 247, 220, 0.45, 0.002), N("bandpass", 0, 0.06, 900, 600, 2, 0.12)]),
    whoosh: ui(0.3, [N("bandpass", 0, 0.4, 280, 2600, 1.6, 0.8, 0.12)]),
    blip: ui(0.16, [T("sine", 0, 0.04, 1650, 1650, 0.45, 0.002), T("sine", 0.055, 0.05, 2200, 2200, 0.4, 0.002)]),
    // --- stingers kept from before (same ids; small tweaks: fewer raw saw / square tones)
    enter: ui(0.4, [T("triangle", 0, 0.12, 220, 110, 0.7, 0.002), N("bandpass", 0, 0.09, 1800, 900, 3, 0.5, 0.001), T("square", 0.14, 0.04, 900, 850, 0.12, 0.001)]),
    exit: ui(0.4, [T("square", 0, 0.04, 850, 900, 0.12, 0.001), T("triangle", 0.07, 0.14, 160, 240, 0.6), N("bandpass", 0.07, 0.12, 1500, 2400, 3, 0.4)]),
    eject: ui(0.7, [N("lowpass", 0, 0.25, 2400, 200, 0.7, 1.0), T("sine", 0, 0.25, 120, 40, 0.9), N("bandpass", 0.05, 0.7, 400, 3000, 1.2, 0.5, 0.15)]),
    seat: ui(0.35, [N("bandpass", 0, 0.3, 600, 1400, 2, 0.35, 0.05), T("square", 0.25, 0.04, 700, 650, 0.1, 0.001)]),
    produced: ui(0.36, [T("sine", 0, 0.35, 660, 660, 0.35, 0.004), T("sine", 0.12, 0.35, 880, 880, 0.35, 0.004), T("sine", 0.24, 0.4, 1320, 1320, 0.35, 0.004)]),
    "under-attack": ui(0.34, [T("triangle", 0, 0.28, 520, 440, 0.45, 0.01), T("sawtooth", 0, 0.28, 520, 440, 0.08, 0.01), T("triangle", 0.34, 0.4, 440, 330, 0.45, 0.01), T("sawtooth", 0.34, 0.4, 440, 330, 0.08, 0.01)]),
    respawn: ui(0.32, [T("triangle", 0, 0.3, 392, 396, 0.3), T("triangle", 0.09, 0.3, 523, 528, 0.3), T("triangle", 0.18, 0.3, 659, 665, 0.3), T("triangle", 0.27, 0.3, 784, 792, 0.3)]),
    "pilot-kill": ui(0.4, [T("sine", 0, 0.06, 2200, 2100, 0.5, 0.001), T("sine", 0.09, 0.2, 2900, 2800, 0.45, 0.001)]),
    "pilot-down": ui(0.4, [T("triangle", 0, 0.5, 300, 90, 0.5, 0.01), N("lowpass", 0, 0.4, 900, 100, 0.7, 0.5, 0.01)]),
    threat: ui(0.32, [T("square", 0, 0.12, 740, 740, 0.22), T("square", 0.16, 0.12, 554, 554, 0.22), T("square", 0.32, 0.12, 740, 740, 0.22)]),
    victory: ui(0.42, [T("triangle", 0, 0.3, 523, 523, 0.4, 0.006), T("triangle", 0.14, 0.3, 659, 659, 0.4, 0.006), T("triangle", 0.28, 0.3, 784, 784, 0.4, 0.006), T("triangle", 0.42, 1.1, 1047, 1047, 0.4, 0.006), T("sine", 0.42, 1.1, 523, 523, 0.25, 0.02)]),
    defeat: ui(0.38, [T("triangle", 0, 0.35, 440, 431, 0.35, 0.01), T("triangle", 0.22, 0.35, 349, 342, 0.35, 0.01), T("triangle", 0.44, 0.35, 294, 288, 0.35, 0.01), T("triangle", 0.66, 1.1, 220, 214, 0.35, 0.01), T("sine", 0.66, 1.1, 110, 106, 0.3, 0.02)]),
    objective: ui(0.3, [T("sine", 0, 0.08, 880, 880, 0.25), T("sine", 0.1, 0.12, 1175, 1175, 0.22)]),
    "objective-done": ui(0.36, [T("triangle", 0, 0.2, 784, 784, 0.35, 0.004), T("triangle", 0.16, 0.5, 1175, 1175, 0.35, 0.004)]),
    "objective-failed": ui(0.34, [T("triangle", 0, 0.25, 370, 360, 0.4, 0.01), T("triangle", 0.22, 0.45, 262, 240, 0.4, 0.01)]),
    downed: ui(0.45, [T("sine", 0, 0.12, 70, 50, 0.9, 0.004), T("sine", 0.2, 0.14, 64, 44, 0.8, 0.004)]),
    revived: ui(0.35, [N("bandpass", 0, 0.35, 500, 1800, 1.2, 0.35, 0.08), T("sine", 0.25, 0.3, 988, 988, 0.3)]),
    "charge-plant": ui(0.4, [T("square", 0, 0.05, 300, 280, 0.3, 0.001), N("bandpass", 0, 0.05, 2400, 1800, 4, 0.3, 0.001), T("sine", 0.12, 0.08, 1600, 1600, 0.3, 0.001)]),
    "charge-blast": world("explosions", 0.8, 0.9, 120, [N("lowpass", 0, 0.6, 2600, 120, 0.7, 1.0), T("sine", 0, 0.5, 90, 30, 1.0), N("lowpass", 0.08, 1.2, 900, 80, 0.6, 0.4, 0.05)], 0.5),
    "cloak-on": ui(0.32, [N("bandpass", 0, 0.35, 3200, 600, 4, 0.3, 0.02), T("sine", 0, 0.35, 1800, 600, 0.08, 0.02)]),
    "cloak-off": ui(0.32, [N("bandpass", 0, 0.3, 600, 3200, 4, 0.3, 0.02), T("sine", 0, 0.3, 600, 1800, 0.08, 0.02)]),
    fortify: world("vehicles", 0.45, 0.6, 60, [N("bandpass", 0, 0.08, 1400, 900, 3, 0.5, 0.001), T("triangle", 0, 0.06, 420, 300, 0.3, 0.001), N("bandpass", 0.16, 0.1, 1500, 800, 3, 0.5, 0.001), T("triangle", 0.16, 0.06, 400, 280, 0.3, 0.001)]),
    landing: world("vehicles", 0.42, 0.6, 80, [T("triangle", 0, 0.3, 400, 600, 0.15, 0.02), N("bandpass", 0, 0.3, 900, 1500, 2, 0.15, 0.05), T("sine", 0.3, 0.14, 90, 55, 0.7), N("lowpass", 0.3, 0.3, 700, 120, 0.7, 0.4)]),
    "aircraft-down": world("explosions", 0.45, 0.7, 200, [T("sine", 0, 0.9, 1400, 300, 0.25, 0.02), N("bandpass", 0, 0.9, 2500, 500, 3, 0.15, 0.05)], 0.4),
    sweep: world("ui", 0.36, 0.7, 300, [T("sine", 0, 0.5, 1320, 1300, 0.35, 0.002), T("sine", 0.02, 0.8, 660, 640, 0.12, 0.002), N("bandpass", 0, 0.9, 700, 3500, 6, 0.08, 0.2)], 0.6),
    // --- support calls (C5 / w2a: the 14 calls)
    beacon: world("ui", 0.36, 0.8, 200, [N("bandpass", 0, 0.08, 2400, 2000, 3, 0.3), T("sine", 0.06, 0.12, 1760, 1760, 0.3), T("sine", 0.2, 0.25, 2350, 2350, 0.25), N("highpass", 0.2, 0.5, 5000, 5000, 0.7, 0.04, 0.1)], 0.5),
    // ruling 128 thrown call beacon: arm click (in the hand), throw whoosh, metal clinks on the bounces, a hard clack when it sticks, the short tick while it sits
    "beacon-arm": ui(0.26, [T("square", 0, 0.012, 2400, 2300, 0.25, 0.0005), N("highpass", 0, 0.02, 4000, 5000, 0.7, 0.3, 0.0005), T("sine", 0.05, 0.09, 1400, 2100, 0.3, 0.004), T("sine", 0.1, 0.12, 2100, 2100, 0.18, 0.004)]),
    "beacon-throw": world("ui", 0.34, 0.6, 30, [N("bandpass", 0, 0.32, 400, 2200, 1.4, 0.7, 0.06), N("bandpass", 0.03, 0.22, 1200, 3600, 2.5, 0.25, 0.05), T("sine", 0, 0.05, 220, 160, 0.2, 0.003)], 0.2),
    "beacon-launch": world("explosions", 0.5, 0.7, 120, [T("sine", 0, 0.16, 110, 45, 0.9, 0.002), N("lowpass", 0, 0.14, 1600, 200, 0.7, 0.6, 0.001), N("bandpass", 0.02, 0.35, 700, 2600, 1.5, 0.3, 0.05), T("square", 0, 0.015, 900, 700, 0.15, 0.0005)], 0.4), // ruling 129: the launcher's thump
    "beacon-clink": world("ui", 0.3, 0.5, 40, [T("sine", 0, 0.09, 3150, 3100, 0.35, 0.0005), T("sine", 0, 0.14, 4720, 4700, 0.18, 0.0005), T("triangle", 0, 0.04, 1900, 1700, 0.2, 0.0005), N("bandpass", 0, 0.03, 3500, 2500, 3, 0.4, 0.0005)], 0.2),
    "beacon-stick": world("ui", 0.32, 0.6, 50, [N("bandpass", 0, 0.04, 1800, 900, 2, 0.7, 0.0005), T("triangle", 0, 0.06, 600, 400, 0.4, 0.001), T("sine", 0.08, 0.08, 2200, 2200, 0.2, 0.002)], 0.2),
    "beacon-ping": world("ui", 0.13, 0.4, 60, [T("sine", 0, 0.03, 2400, 2400, 0.35, 0.0005), T("sine", 0.035, 0.025, 1800, 1800, 0.25, 0.0005)]),
    "beacon-tick": world("ui", 0.2, 0.6, 180, [T("sine", 0, 0.05, 2000, 2000, 0.35, 0.001)]),
    "beacon-last": world("ui", 0.24, 0.7, 200, [T("sine", 0, 0.12, 2600, 2600, 0.35, 0.001), T("sine", 0, 0.12, 1300, 1300, 0.15, 0.001)]),
    "call-radio": ui(0.22, [N("bandpass", 0, 0.12, 1800, 1400, 2, 0.25), T("square", 0.04, 0.05, 1100, 1050, 0.08), T("square", 0.11, 0.06, 1400, 1350, 0.08), N("bandpass", 0.2, 0.08, 1600, 2200, 2, 0.2)]),
    "pod-whistle": world("explosions", 0.4, 0.7, 260, [T("sine", 0, 1.4, 2600, 700, 0.22, 0.3), N("bandpass", 0, 1.4, 3000, 900, 5, 0.2, 0.3)], 0.4),
    "pod-land": world("explosions", 0.75, 0.85, 160, [N("lowpass", 0, 0.5, 1800, 100, 0.7, 1.0), T("sine", 0, 0.45, 75, 28, 1.0), N("bandpass", 0.05, 0.2, 2600, 1200, 3, 0.35), N("highpass", 0.35, 1.2, 3000, 1500, 0.7, 0.18, 0.1)], 0.6),
    "shell-whistle": world("explosions", 0.4, 0.6, 300, [T("sine", 0, 0.7, 1900, 500, 0.25, 0.08), N("bandpass", 0, 0.7, 2200, 600, 6, 0.15, 0.08)], 0.3),
    "strike-whine": world("explosions", 0.45, 0.8, 300, [T("sine", 0, 1.3, 600, 3400, 0.2, 0.4), N("bandpass", 0, 1.3, 800, 4000, 4, 0.2, 0.4)], 0.4),
    "strafe-hit": world("explosions", 0.35, 0.5, 100, [N("bandpass", 0, 0.05, 2600, 1500, 1.5, 0.8, 0.001), N("lowpass", 0.01, 0.12, 900, 150, 0.7, 0.4), T("sine", 0, 0.06, 140, 60, 0.4)], 0.3),
    "smoke-pop": world("explosions", 0.4, 0.5, 80, [T("sine", 0, 0.06, 220, 90, 0.6), N("bandpass", 0, 0.08, 1200, 600, 2, 0.4, 0.001), N("highpass", 0.05, 1.4, 2500, 4000, 0.7, 0.25, 0.15)]),
    "dome-up": world("vehicles", 0.45, 0.8, 120, [T("sine", 0, 1.0, 110, 220, 0.4, 0.2), T("triangle", 0, 1.0, 440, 880, 0.12, 0.2), N("bandpass", 0, 0.8, 900, 4000, 4, 0.15, 0.2)], 0.5),
    "dome-down": world("vehicles", 0.4, 0.7, 120, [T("sine", 0, 0.8, 220, 90, 0.4, 0.02), T("triangle", 0, 0.6, 880, 300, 0.1, 0.02), N("bandpass", 0, 0.5, 3000, 600, 4, 0.15)], 0.5),
    emp: world("explosions", 0.7, 0.9, 200, [N("highpass", 0, 0.05, 3000, 6000, 0.7, 0.9, 0.0005), T("sawtooth", 0, 0.6, 1800, 40, 0.25, 0.002), T("sine", 0, 0.7, 120, 30, 0.8), N("bandpass", 0.05, 1.2, 4000, 700, 8, 0.3, 0.01), N("bandpass", 0.3, 0.6, 2500, 2400, 12, 0.15, 0.01)], 0.7),
    // ruling 130: the drop pod sentry: re-entry roar (2.5 s, rumble and a rising tearing hiss), retro-thruster burn (a
    // rough low blast), the heavy thud of the touch-down (pod-thud), then sentry-deploy: the hatch servos (whine, clunks)
    "pod-reentry": world("explosions", 0.6, 0.85, 900, [N("lowpass", 0, 2.4, 300, 900, 0.8, 0.55, 0.9), N("bandpass", 0.2, 2.2, 1200, 3800, 1.5, 0.3, 0.8), T("sawtooth", 0, 2.4, 55, 95, 0.08, 0.8)], 0.7),
    "pod-retro": world("explosions", 0.6, 0.8, 500, [N("lowpass", 0, 0.95, 700, 1600, 0.7, 0.85, 0.05), N("bandpass", 0, 0.95, 220, 380, 1.2, 0.5, 0.05), T("sawtooth", 0, 0.95, 48, 40, 0.12, 0.05)], 0.5),
    "pod-thud": world("explosions", 0.8, 0.9, 400, [T("sine", 0, 0.6, 62, 24, 1.0, 0.004), N("lowpass", 0, 0.7, 1400, 90, 0.7, 1.0, 0.003), N("bandpass", 0.02, 0.25, 900, 400, 2, 0.5, 0.002), N("highpass", 0.1, 0.5, 3500, 2000, 0.7, 0.15, 0.05)], 0.6),
    // ruling 132: a forward base unfolding / folding its defences: a long rising hydraulic whine, a low pump rumble, plate clanks
    "fb-unfold": world("vehicles", 0.5, 0.7, 120, [T("sawtooth", 0, 3.6, 180, 420, 0.05, 0.3), N("bandpass", 0, 3.6, 500, 1400, 2.5, 0.18, 0.3), T("sine", 0, 3.8, 55, 70, 0.5, 0.4), T("triangle", 1.2, 0.08, 420, 380, 0.4, 0.001), T("triangle", 2.6, 0.08, 400, 360, 0.4, 0.001), T("sine", 3.7, 0.15, 90, 50, 0.8, 0.002)], 0.5),
    "sentry-deploy": world("vehicles", 0.45, 0.6, 70, [T("sine", 0, 0.12, 80, 50, 0.7), T("sawtooth", 0.15, 0.45, 300, 700, 0.06, 0.05), N("bandpass", 0.15, 0.45, 900, 1800, 3, 0.15, 0.05), T("triangle", 0.62, 0.06, 500, 450, 0.4, 0.001), T("sine", 0.75, 0.08, 1700, 1700, 0.25, 0.001), T("sine", 0.86, 0.12, 2200, 2200, 0.25, 0.001)]),
    "mines-laid": world("vehicles", 0.4, 0.5, 70, [N("bandpass", 0, 0.05, 1800, 1200, 4, 0.5, 0.001), N("bandpass", 0.15, 0.05, 1900, 1300, 4, 0.45, 0.001), N("bandpass", 0.32, 0.05, 1700, 1200, 4, 0.45, 0.001), T("sine", 0.5, 0.06, 1500, 1500, 0.2, 0.001)]),
    "mine-arm": world("ui", 0.25, 0.4, 40, [T("sine", 0, 0.04, 1900, 1900, 0.3, 0.001), T("sine", 0.07, 0.04, 2400, 2400, 0.3, 0.001)]),
    resupply: world("vehicles", 0.4, 0.6, 60, [N("highpass", 0, 0.6, 2500, 1200, 0.7, 0.35, 0.02), T("triangle", 0.5, 0.06, 500, 420, 0.35, 0.001), T("sine", 0.6, 0.2, 1175, 1175, 0.2)]),
    "jet-pass": world("vehicles", 0.6, 0.8, 300, [N("bandpass", 0, 1.8, 600, 300, 1.2, 0.6, 0.7), T("sawtooth", 0, 1.8, 180, 120, 0.05, 0.7)], 0.5),
    // --- strategic points and Core hack
    "capture-start": world("ui", 0.24, 0.6, 120, [T("sine", 0, 0.08, 330, 330, 0.3), T("sine", 0.09, 0.1, 440, 440, 0.3)]),
    "capture-tick": world("ui", 0.15, 0.4, 80, [T("sine", 0, 0.04, 660, 660, 0.3, 0.001)]),
    "capture-done": ui(0.36, [T("triangle", 0, 0.12, 262, 262, 0.35), T("triangle", 0.1, 0.12, 392, 392, 0.35), T("triangle", 0.2, 0.5, 524, 524, 0.35), N("bandpass", 0, 0.5, 1200, 3000, 3, 0.1, 0.1)]),
    "capture-lost": ui(0.34, [T("triangle", 0, 0.18, 311, 300, 0.35), T("triangle", 0.16, 0.45, 208, 196, 0.35)]),
    contested: world("ui", 0.24, 0.6, 120, [T("triangle", 0, 0.08, 700, 700, 0.3), T("triangle", 0.09, 0.08, 620, 620, 0.3), T("triangle", 0.18, 0.08, 700, 700, 0.3)]),
    "supply-lost": ui(0.24, [T("sine", 0, 0.3, 500, 300, 0.3, 0.01)]),
    "supply-restored": ui(0.24, [T("sine", 0, 0.3, 300, 500, 0.3, 0.01)]),
    "hack-start": world("ui", 0.26, 0.7, 80, [N("bandpass", 0, 0.12, 2600, 2600, 8, 0.3), T("square", 0, 0.03, 1800, 1800, 0.08, 0.001), T("square", 0.05, 0.03, 2200, 2200, 0.08, 0.001), T("square", 0.1, 0.03, 1600, 1600, 0.08, 0.001)]),
    "hack-tick": world("ui", 0.13, 0.4, 60, [T("square", 0, 0.02, 2000, 2000, 0.12, 0.001), T("square", 0.03, 0.02, 2600, 2600, 0.1, 0.001)]),
    "hack-stop": world("ui", 0.24, 0.6, 80, [T("square", 0, 0.08, 900, 600, 0.12, 0.002), N("bandpass", 0, 0.1, 1500, 800, 3, 0.2)]),
    "hack-done": ui(0.36, [N("bandpass", 0, 0.4, 3000, 400, 6, 0.3), T("sawtooth", 0, 0.5, 880, 110, 0.12, 0.002), T("sine", 0.4, 0.4, 110, 100, 0.5)]),
    "core-restored": ui(0.32, [T("sine", 0, 0.5, 110, 440, 0.4, 0.05), T("triangle", 0.4, 0.3, 880, 880, 0.25)]),
    // --- construction, production, economy
    "build-start": world("vehicles", 0.36, 0.6, 80, [N("bandpass", 0, 0.5, 600, 3000, 3, 0.25, 0.1), T("sine", 0, 0.5, 220, 440, 0.2, 0.1), T("sine", 0.5, 0.1, 880, 880, 0.2)]),
    "build-done": world("vehicles", 0.5, 0.8, 120, [T("sine", 0, 0.2, 70, 45, 0.8), N("lowpass", 0, 0.3, 1500, 200, 0.7, 0.5), T("sine", 0.2, 0.3, 660, 660, 0.25), T("sine", 0.32, 0.4, 990, 990, 0.25)], 0.4),
    "build-cancel": world("vehicles", 0.36, 0.6, 80, [N("bandpass", 0, 0.4, 3000, 500, 3, 0.25, 0.02), T("sine", 0, 0.4, 440, 200, 0.2, 0.02)]),
    "construct-tick": world("vehicles", 0.25, 0.3, 50, [N("bandpass", 0, 0.05, 2200, 1500, 4, 0.5, 0.001), T("triangle", 0, 0.04, 600, 500, 0.2, 0.001)]),
    "fortify-done": world("vehicles", 0.42, 0.7, 100, [T("sine", 0, 0.2, 80, 50, 0.7), T("triangle", 0.15, 0.4, 587, 587, 0.25), T("triangle", 0.25, 0.4, 880, 880, 0.25)]),
    queued: ui(0.18, [T("sine", 0, 0.04, 990, 990, 0.3), N("bandpass", 0, 0.04, 2000, 2000, 3, 0.1)]),
    delivered: world("vehicles", 0.25, 0.3, 60, [N("bandpass", 0, 0.25, 1800, 900, 2, 0.35, 0.01), N("lowpass", 0.05, 0.3, 600, 150, 0.7, 0.3, 0.02), T("sine", 0.25, 0.1, 1320, 1320, 0.12)]),
    // --- F2 (ruling 91): the Lancer laser (charge whine at the Lancer: enemies hear a shot coming; the rest own crew only)
    "laser-charge": world("weapons", 0.3, 0.7, 110, [T("sawtooth", 0, 1.0, 90, 1100, 0.1, 0.9), T("sine", 0, 1.0, 180, 2200, 0.2, 0.85), N("bandpass", 0.2, 0.8, 450, 2400, 6, 0.15, 0.7)], 0.2), // Frontline: an octave lower, quieter
    "laser-cooldown-tick": ui(0.12, [T("square", 0, 0.012, 2600, 2400, 0.14, 0.001), N("highpass", 0, 0.01, 6000, 6000, 0.7, 0.08, 0.0005)]),
    "laser-ready": ui(0.18, [T("sine", 0, 0.06, 1320, 1320, 0.3, 0.003), T("sine", 0.06, 0.1, 1760, 1760, 0.3, 0.003)]),
    "laser-overheat": ui(0.38, [T("square", 0, 0.12, 1180, 1180, 0.22, 0.002), T("square", 0.16, 0.12, 880, 880, 0.22, 0.002), T("square", 0.32, 0.12, 1180, 1180, 0.22, 0.002), T("square", 0.48, 0.2, 880, 860, 0.22, 0.002)]),
    "laser-vent": world("weapons", 0.34, 0.6, 60, [N("highpass", 0, 1.6, 3500, 1800, 0.7, 0.5, 0.05), N("bandpass", 0, 1.2, 2200, 900, 1.5, 0.3, 0.08), N("lowpass", 0.6, 1.6, 900, 300, 0.7, 0.2, 0.2)], 0.25),
    // --- ruling 108: the Dart Scout boost (own vehicle: the kick-in roar, the meter running dry, the meter full again)
    // designer playtest 16 Nov: "needs a low boost sound, the current whish is too cheap": a deep afterburner kick (sub thump,
    // low rumble swelling and settling, a throaty low saw) with the hiss cut out
    "boost-start": world("vehicles", 0.5, 0.7, 110, [T("sine", 0, 0.35, 42, 30, 0.5, 0.004), T("sine", 0, 1.1, 48, 72, 0.32, 0.06), T("triangle", 0.02, 1.0, 62, 118, 0.18, 0.08), N("lowpass", 0, 1.2, 380, 170, 0.9, 0.5, 0.05), N("lowpass", 0, 0.3, 900, 260, 0.7, 0.22, 0.004)], 0.25),
    "boost-empty": ui(0.22, [T("sine", 0, 0.12, 660, 440, 0.3, 0.004), N("highpass", 0, 0.25, 3000, 1500, 0.7, 0.12, 0.01)]),
    "boost-ready": ui(0.16, [T("sine", 0, 0.05, 1040, 1040, 0.25, 0.003), T("sine", 0.05, 0.08, 1560, 1560, 0.25, 0.003)]),
    "energy-dry": world("weapons", 0.2, 0.4, 50, [N("bandpass", 0, 0.09, 4200, 1800, 5, 0.35, 0.001), T("sawtooth", 0.02, 0.12, 420, 140, 0.08, 0.002), N("bandpass", 0.14, 0.06, 3000, 1500, 4, 0.18, 0.001)]), // C10: an energy gun with no gas
    // --- C11: the pilot reserve (S14) and S15 rulings
    "pilot-lost": ui(0.34, [T("triangle", 0, 0.22, 392, 380, 0.4, 0.006), T("triangle", 0.24, 0.5, 262, 247, 0.4, 0.008), T("sine", 0.24, 0.5, 131, 123, 0.25, 0.01)]),
    "pilot-back": ui(0.26, [T("sine", 0, 0.12, 587, 587, 0.3, 0.004), T("sine", 0.11, 0.2, 880, 880, 0.3, 0.004)]),
    "citadel-pilots": ui(0.34, [T("triangle", 0, 0.18, 523, 523, 0.35, 0.004), T("triangle", 0.12, 0.18, 659, 659, 0.35, 0.004), T("triangle", 0.24, 0.18, 784, 784, 0.35, 0.004), T("triangle", 0.36, 0.5, 1047, 1047, 0.35, 0.004)]),
    "no-crew": ui(0.26, [T("square", 0, 0.1, 196, 196, 0.16, 0.002), T("square", 0.14, 0.16, 165, 160, 0.16, 0.002), N("bandpass", 0, 0.25, 700, 500, 2, 0.12)]),
    crewed: ui(0.3, [N("bandpass", 0, 0.2, 700, 1500, 2, 0.3, 0.03), T("square", 0.18, 0.04, 760, 720, 0.12, 0.001), T("sine", 0.24, 0.14, 988, 988, 0.25, 0.003)]),
    "ammo-dry": ui(0.3, [N("bandpass", 0, 0.03, 3500, 3000, 6, 0.5, 0.001), N("bandpass", 0.12, 0.03, 3300, 2800, 6, 0.45, 0.001), T("triangle", 0.2, 0.25, 300, 220, 0.25, 0.005)]),
    rearmed: ui(0.3, [N("bandpass", 0, 0.08, 1800, 1200, 4, 0.4, 0.001), N("bandpass", 0.1, 0.08, 1900, 1300, 4, 0.4, 0.001), T("sine", 0.2, 0.25, 784, 1047, 0.3, 0.004)]),
    "air-warning": ui(0.4, [T("square", 0, 0.1, 988, 988, 0.22, 0.002), T("square", 0.14, 0.1, 988, 988, 0.22, 0.002), T("square", 0.28, 0.1, 988, 988, 0.22, 0.002), T("triangle", 0.45, 0.35, 659, 494, 0.3, 0.004)]),
    "ash-crash": world("explosions", 0.6, 0.8, 120, [N("lowpass", 0, 0.5, 1800, 150, 0.7, 0.9), T("sine", 0, 0.45, 110, 40, 0.9), N("bandpass", 0.05, 0.4, 2400, 600, 2, 0.4, 0.01), N("highpass", 0.1, 0.3, 4000, 2500, 0.7, 0.25, 0.01)], 0.5),
    "help-coming": ui(0.26, [T("sine", 0, 0.16, 659, 659, 0.28, 0.004), T("sine", 0.16, 0.16, 784, 784, 0.28, 0.004), T("sine", 0.32, 0.3, 988, 988, 0.26, 0.004)]),
    "site-decay": ui(0.22, [T("sawtooth", 0, 0.5, 300, 150, 0.08, 0.02), N("bandpass", 0, 0.45, 900, 300, 2, 0.2, 0.02)]),
    "deposit-dry": ui(0.2, [T("sine", 0, 0.35, 330, 220, 0.3, 0.01)]),
    deploy: world("vehicles", 0.5, 0.7, 100, [T("sawtooth", 0, 0.9, 120, 220, 0.06, 0.1), N("bandpass", 0, 0.9, 400, 1200, 2, 0.25, 0.1), T("sine", 0.9, 0.15, 70, 40, 0.8), N("bandpass", 0.9, 0.08, 1600, 900, 3, 0.4, 0.001), T("sine", 1.1, 0.15, 65, 40, 0.7)]),
    // --- vehicles, units, combat state
    critical: world("explosions", 0.45, 0.6, 80, [N("highpass", 0, 0.5, 3000, 2000, 0.7, 0.3, 0.01), N("bandpass", 0.05, 0.08, 1500, 900, 3, 0.4, 0.001), N("bandpass", 0.25, 0.06, 1700, 900, 3, 0.35, 0.001), T("sine", 0, 0.4, 200, 120, 0.15, 0.02)]),
    "shield-break": world("explosions", 0.5, 0.7, 70, [T("sine", 0, 0.3, 2400, 300, 0.35, 0.001), N("highpass", 0, 0.25, 6000, 2500, 0.7, 0.5, 0.001), N("bandpass", 0.02, 0.4, 3500, 600, 5, 0.3, 0.005), T("triangle", 0, 0.12, 900, 700, 0.15, 0.001)], 0.4),
    collapse: world("explosions", 0.8, 0.9, 200, [T("sine", 0, 1.4, 55, 22, 0.9, 0.02), N("lowpass", 0, 2.2, 1200, 60, 0.6, 0.9, 0.05), N("bandpass", 0.3, 0.12, 900, 500, 4, 0.4, 0.001), N("bandpass", 0.7, 0.12, 700, 400, 4, 0.35, 0.001), N("bandpass", 1.1, 0.12, 800, 400, 4, 0.3, 0.001), N("highpass", 0.4, 1.8, 2500, 1200, 0.7, 0.2, 0.2)], 0.7),
    ricochet: world("weapons", 0.3, 0.2, 40, [T("sine", 0, 0.25, 3400, 1500, 0.22, 0.001), N("bandpass", 0, 0.05, 4000, 3000, 2, 0.4, 0.001)]),
    "passenger-lost": ui(0.24, [T("sine", 0, 0.5, 220, 196, 0.35, 0.02)]),
    // --- transports
    "cargo-in": world("vehicles", 0.36, 0.5, 50, [N("bandpass", 0, 0.08, 1200, 800, 3, 0.4, 0.001), N("lowpass", 0.08, 0.06, 500, 200, 0.7, 0.4), N("lowpass", 0.22, 0.06, 500, 200, 0.7, 0.35), T("triangle", 0.35, 0.08, 260, 200, 0.4, 0.002)]),
    "cargo-out": world("vehicles", 0.36, 0.5, 50, [T("triangle", 0, 0.08, 200, 260, 0.4, 0.002), N("bandpass", 0.05, 0.3, 700, 1600, 2, 0.3, 0.05), N("lowpass", 0.3, 0.06, 500, 200, 0.7, 0.35)]),
    "sling-hook": world("vehicles", 0.38, 0.5, 60, [N("bandpass", 0, 0.06, 3000, 2000, 6, 0.5, 0.001), T("triangle", 0, 0.1, 700, 500, 0.3, 0.001), N("bandpass", 0.1, 0.4, 600, 300, 3, 0.15, 0.05)]),
    "sling-drop": world("vehicles", 0.42, 0.5, 60, [N("bandpass", 0, 0.05, 2600, 1800, 6, 0.4, 0.001), T("sine", 0.1, 0.2, 80, 40, 0.8), N("lowpass", 0.1, 0.25, 900, 150, 0.7, 0.4)]),
    // --- pilot (stance, low flight, cloak, charge, revive)
    "stance-down": ui(0.2, [N("bandpass", 0, 0.14, 900, 500, 1.5, 0.5, 0.01), N("bandpass", 0.08, 0.03, 3000, 2500, 5, 0.2, 0.001)]),
    "stance-prone": ui(0.24, [N("bandpass", 0, 0.25, 700, 350, 1.5, 0.5, 0.02), N("lowpass", 0.2, 0.08, 400, 150, 0.7, 0.5), N("bandpass", 0.22, 0.03, 2800, 2400, 5, 0.2, 0.001)]),
    "stance-up": ui(0.2, [N("bandpass", 0, 0.16, 500, 900, 1.5, 0.5, 0.01), N("bandpass", 0.12, 0.03, 2600, 2900, 5, 0.18, 0.001)]),
    "lowflight-on": ui(0.24, [T("sine", 0, 0.12, 880, 660, 0.3), T("sine", 0.13, 0.15, 660, 440, 0.3), N("bandpass", 0, 0.4, 1200, 400, 2, 0.15, 0.05)]),
    "lowflight-off": ui(0.24, [T("sine", 0, 0.12, 440, 660, 0.3), T("sine", 0.13, 0.15, 660, 880, 0.3)]),
    "fuse-tick": world("ui", 0.22, 0.7, 40, [T("sine", 0, 0.035, 2900, 2900, 0.4, 0.001)]),
    "revive-tick": ui(0.15, [T("sine", 0, 0.06, 700, 760, 0.3, 0.004)]),
    "jammer-on": world("ui", 0.26, 0.5, 100, [N("bandpass", 0, 0.5, 2000, 2000, 1, 0.3, 0.05), T("square", 0, 0.5, 60, 60, 0.05, 0.05)]),
    "jammer-off": world("ui", 0.22, 0.5, 100, [N("bandpass", 0, 0.25, 2000, 600, 1, 0.25, 0.01)]),
    "decoy-drop": world("ui", 0.24, 0.5, 40, [T("triangle", 0, 0.06, 300, 250, 0.4, 0.001), T("sine", 0.12, 0.08, 1500, 1500, 0.25), T("sine", 0.26, 0.08, 1500, 1500, 0.2)]),
    "decoy-end": world("ui", 0.18, 0.4, 40, [T("sine", 0, 0.25, 1500, 600, 0.25, 0.01)]),
    // --- multiplayer, groups, weather, alarms
    join: ui(0.3, [N("bandpass", 0, 0.1, 2000, 1500, 2, 0.2), T("sine", 0.08, 0.1, 587, 587, 0.35), T("sine", 0.18, 0.18, 880, 880, 0.35)]),
    leave: ui(0.28, [N("bandpass", 0, 0.1, 1500, 2000, 2, 0.2), T("sine", 0.08, 0.1, 880, 880, 0.3), T("sine", 0.18, 0.2, 587, 560, 0.3)]),
    group: ui(0.2, [T("sine", 0, 0.05, 1100, 1100, 0.3), T("sine", 0.06, 0.05, 1480, 1480, 0.25)]),
    "auto-defend": ui(0.3, [T("triangle", 0, 0.15, 660, 880, 0.35, 0.01), T("triangle", 0.18, 0.15, 660, 880, 0.35, 0.01)]),
    forecast: ui(0.2, [N("bandpass", 0, 0.12, 1800, 1400, 2, 0.2), T("sine", 0.05, 0.1, 740, 740, 0.25), T("sine", 0.16, 0.14, 622, 622, 0.25)]),
    "weather-start": { bus: "ambience", level: 0.45, prio: 0.8, crit: true, parts: [N("bandpass", 0, 2.5, 200, 900, 0.8, 0.5, 1.0), N("lowpass", 0, 2.5, 300, 120, 0.7, 0.4, 0.8)] },
    "weather-end": { bus: "ambience", level: 0.3, prio: 0.6, crit: true, parts: [N("bandpass", 0, 2.0, 800, 200, 0.8, 0.35, 0.3)] },
    thunder: { bus: "ambience", level: 0.75, prio: 0.8, crit: true, verb: 0.7, parts: [N("highpass", 0, 0.08, 2500, 1500, 0.7, 0.4, 0.002), N("lowpass", 0.05, 3.2, 900, 60, 0.6, 1.0, 0.03), T("sine", 0.05, 2.0, 50, 28, 0.6, 0.05), N("lowpass", 0.6, 1.6, 400, 80, 0.6, 0.5, 0.2)] },
    "weather-gust": { bus: "ambience", level: 0.3, prio: 0.3, parts: [N("bandpass", 0, 2.2, 300, 900, 1.2, 0.6, 0.9)] },
    "ambient-call": { bus: "ambience", level: 0.08, prio: 0.1, parts: [T("sine", 0, 0.06, 3200, 3900, 0.3, 0.005), T("sine", 0.09, 0.06, 3400, 4100, 0.25, 0.005)] },
    "ambient-drip": { bus: "ambience", level: 0.08, prio: 0.1, parts: [T("sine", 0, 0.05, 1200, 2200, 0.3, 0.001)] },
    "ambient-bubble": { bus: "ambience", level: 0.1, prio: 0.1, parts: [T("sine", 0, 0.12, 120, 320, 0.4, 0.005), N("lowpass", 0.08, 0.1, 500, 200, 0.7, 0.2)] },
    "ambient-creak": { bus: "ambience", level: 0.06, prio: 0.1, parts: [N("bandpass", 0, 0.4, 500, 700, 8, 0.3, 0.1)] },
};
exports.VOICE_CLASSES = ["infantry", "bike", "light", "tank", "heavy", "air", "worker"];
exports.VOICES = {
    infantry: { pitch: 170, f1: 700, f2: 1500, syll: 2, step: 0.075, wave: "sawtooth", level: 0.2 },
    bike: { pitch: 230, f1: 850, f2: 2100, syll: 2, step: 0.055, wave: "sawtooth", level: 0.18 },
    light: { pitch: 190, f1: 650, f2: 1700, syll: 2, step: 0.065, wave: "sawtooth", level: 0.19 },
    tank: { pitch: 125, f1: 520, f2: 1250, syll: 2, step: 0.085, wave: "sawtooth", level: 0.21 },
    heavy: { pitch: 90, f1: 420, f2: 1050, syll: 3, step: 0.095, wave: "sawtooth", level: 0.22 },
    air: { pitch: 210, f1: 900, f2: 2400, syll: 2, step: 0.06, wave: "square", level: 0.16 },
    worker: { pitch: 160, f1: 780, f2: 1900, syll: 3, step: 0.06, wave: "triangle", level: 0.2 },
};
/** Per unit id (data/units.json). Not listed: by armour class (voiceOf). */
exports.UNIT_VOICE = {
    dart: "light", salvo: "tank", lancer: "light", hauler: "light", "trooper-squad": "infantry", "sapper-team": "infantry", pilot: "infantry",
    hammer: "tank", flak: "tank", carrier: "tank", bastion: "heavy", strider: "heavy", "forward-base-vehicle": "heavy",
    wasp: "air", mule: "air", harvester: "worker", ["constructor"]: "worker",
};
const ARMOUR_VOICE = { infantry: "infantry", bike: "bike", light: "light", medium: "tank", heavy: "heavy", air: "air" };
function voiceOf(unitId, armour = "") { return (Object.hasOwn(exports.UNIT_VOICE, unitId) ? exports.UNIT_VOICE[unitId] : undefined) ?? ARMOUR_VOICE[armour] ?? "light"; }
/** Pitch contour per order kind (orders.ts OK_*: 1 stop, 2 move, 3 attackMove, 4 attack, 5 pickup, 6 guard, 7 defend, 8 attackMyTarget, 9 follow, 10 holdFire, 11 retreat). */
function ackContour(orderKind) {
    switch (orderKind) {
        case 3:
        case 4:
        case 8: return { glide: 1.25, accent: 1.2 }; // attack: rising, firm
        case 1:
        case 10: return { glide: 0.82, accent: 1 }; // stop / hold fire: falling
        case 11: return { glide: 0.7, accent: 1.1 }; // retreat: fast falling
        case 6:
        case 7: return { glide: 1, accent: 0.9 }; // guard / defend: level
        default: return { glide: 1.08, accent: 1 }; // move, follow, pickup
    }
}
exports.ENGINE_CLASSES = ["bike", "scout", "light", "tank", "heavy", "strider", "aircraft", "jet"];
exports.UNIT_ENGINE = {
    dart: "scout", salvo: "tank", lancer: "light", hauler: "light", hammer: "tank", flak: "tank", carrier: "tank", harvester: "tank", ["constructor"]: "tank",
    bastion: "heavy", "forward-base-vehicle": "heavy", strider: "strider", wasp: "aircraft", mule: "aircraft", gunship: "jet",
};
const ARMOUR_ENGINE = { bike: "bike", light: "light", medium: "tank", heavy: "heavy", air: "aircraft" };
function engineOf(unitId, armour = "") { return (Object.hasOwn(exports.UNIT_ENGINE, unitId) ? exports.UNIT_ENGINE[unitId] : undefined) ?? ARMOUR_ENGINE[armour] ?? "none"; }
exports.ENGINES = {
    bike: { base: 92, rise: 0.9, noiseF: 1400, noiseRise: 1.4, noiseQ: 1.2, whine: 0.35, whineF: 1850, level: 0.1, noise: 0.45, stomp: 0 },
    scout: { base: 70, rise: 1.0, noiseF: 650, noiseRise: 1.3, noiseQ: 0.8, whine: 0.16, whineF: 1500, level: 0.11, noise: 0.6, stomp: 0 }, // ruling 108: the Dart Scout's turbine (rises hard under boost)
    light: { base: 64, rise: 0.6, noiseF: 900, noiseRise: 1.1, noiseQ: 1.0, whine: 0.15, whineF: 1250, level: 0.11, noise: 0.5, stomp: 0 },
    tank: { base: 44, rise: 0.4, noiseF: 520, noiseRise: 0.9, noiseQ: 0.8, whine: 0.05, whineF: 900, level: 0.13, noise: 0.55, stomp: 0 },
    heavy: { base: 34, rise: 0.32, noiseF: 380, noiseRise: 0.8, noiseQ: 0.7, whine: 0.03, whineF: 700, level: 0.14, noise: 0.6, stomp: 0 },
    strider: { base: 34, rise: 0.3, noiseF: 380, noiseRise: 0.6, noiseQ: 0.9, whine: 0.6, whineF: 330, level: 0.1, noise: 0.3, stomp: 0 }, // W1: servo whine, no hover hum; footfalls per foot (Sound.footfall)
    aircraft: { base: 70, rise: 0.5, noiseF: 1100, noiseRise: 1.0, noiseQ: 0.6, whine: 0.2, whineF: 2400, level: 0.13, noise: 0.85, stomp: 0 },
    jet: { base: 48, rise: 0.3, noiseF: 1700, noiseRise: 1.3, noiseQ: 0.6, whine: 0.55, whineF: 3300, level: 0.16, noise: 0.15, stomp: 0 }, // Frontline: the recorded turbine loop (audio.ts engineDef) // Frontline: the gunship's rocket-jets
    none: { base: 0, rise: 0, noiseF: 0, noiseRise: 0, noiseQ: 1, whine: 0, whineF: 0, level: 0, noise: 0, stomp: 0 },
};
exports.LOOPS = {
    "wreck-fire": { bus: "ambience", ref: 30, layers: [{ src: "noise", ft: "lowpass", f: 700, gain: 0.5, lfo: 0.7, lfoDepth: 0.4 }, { src: "noise", ft: "bandpass", f: 2600, q: 2, gain: 0.12, lfo: 3.1, lfoDepth: 0.8 }], pulse: { every: 0.35, cue: "fire-crackle", jitter: 0.8 } },
    "dome-hum": { bus: "ambience", ref: 50, layers: [{ src: "sine", f: 110, gain: 0.35, lfo: 0.5, lfoDepth: 0.2 }, { src: "triangle", f: 220.6, gain: 0.08, lfo: 0.37, lfoDepth: 0.5 }, { src: "noise", ft: "bandpass", f: 3500, q: 6, gain: 0.05, lfo: 0.9, lfoDepth: 0.6 }] },
    "smoke-hiss": { bus: "ambience", ref: 35, layers: [{ src: "noise", ft: "highpass", f: 2400, gain: 0.25, lfo: 0.4, lfoDepth: 0.4 }] },
    "construct": { bus: "vehicles", ref: 40, layers: [{ src: "noise", ft: "bandpass", f: 1200, q: 2, gain: 0.1, lfo: 1.3, lfoDepth: 0.5 }], pulse: { every: 0.55, cue: "construct-tick", jitter: 0.5 } },
    "hack": { bus: "ui", ref: 40, layers: [{ src: "noise", ft: "bandpass", f: 2600, q: 10, gain: 0.12, lfo: 7, lfoDepth: 0.8 }], pulse: { every: 0.3, cue: "hack-tick", jitter: 0.3 } },
    "capture": { bus: "ui", ref: 60, layers: [{ src: "sine", f: 220, gain: 0.05, lfo: 2, lfoDepth: 0.6 }] },
    heartbeat: { bus: "ui", ref: 10, layers: [], pulse: { every: 0.95, cue: "downed" } },
    "cloak-hum": { bus: "ui", ref: 10, layers: [{ src: "noise", ft: "bandpass", f: 3200, q: 8, gain: 0.05, lfo: 0.6, lfoDepth: 0.6 }, { src: "sine", f: 1900, gain: 0.01, lfo: 0.3, lfoDepth: 0.5 }] },
    fuse: { bus: "ui", ref: 40, layers: [], pulse: { every: 0.5, cue: "fuse-tick" } },
};
/** W1: the Strider's footfall (one per foot as it lands, Sound.footfall: a deep thud, the ground's crunch, a metal clank) and the
 *  leg servo's whine with it; the wreck fire's crackle (a loop pulse). */
exports.CUES["walker-servo"] = { bus: "vehicles", level: 0.16, prio: 0.2, ref: 80, parts: [T("sawtooth", 0, 0.32, 210, 380, 0.12, 0.04), T("sine", 0.02, 0.3, 430, 760, 0.16, 0.04), N("bandpass", 0, 0.28, 1400, 2600, 5, 0.12, 0.04)] };
exports.CUES.stomp = { bus: "vehicles", level: 0.62, prio: 0.3, ref: 140, verb: 0.35, parts: [T("sine", 0, 0.32, 52, 26, 1.0, 0.004), T("triangle", 0, 0.12, 95, 48, 0.4, 0.002), N("lowpass", 0, 0.3, 520, 70, 0.7, 0.6, 0.005), N("bandpass", 0.05, 0.08, 1800, 900, 4, 0.12, 0.002)] };
exports.CUES["fire-crackle"] = { bus: "ambience", level: 0.12, prio: 0.1, parts: [N("bandpass", 0, 0.03, 1800, 1200, 3, 0.6, 0.001), N("bandpass", 0.04, 0.02, 2600, 2000, 3, 0.3, 0.001)] };
// F1 (designer playtest 15 Nov): an enemy turret spotted you and is turning (servo whine: a rising saw through a band-pass,
// with gear-chatter noise), then a lock tone when its barrel is on you (two short high pips: the wind-up before its first shot)
exports.CUES["turret-servo"] = { bus: "weapons", level: 0.42, prio: 0.8, ref: 90, parts: [T("sawtooth", 0, 0.7, 180, 420, 0.18, 0.04), N("bandpass", 0, 0.7, 900, 2200, 6, 0.35, 0.05), T("sine", 0, 0.7, 360, 840, 0.22, 0.04)] };
exports.CUES["turret-lock"] = { bus: "weapons", level: 0.5, prio: 0.9, crit: true, ref: 140, parts: [T("square", 0, 0.07, 1760, 1760, 0.22, 0.002), T("square", 0.11, 0.07, 1760, 1760, 0.22, 0.002), T("sine", 0.22, 0.25, 2350, 2350, 0.3, 0.003)] };
const WB = (o) => ({ wind: 0, rain: 0, rumble: 0, thunder: 0, ash: 0, staticNoise: 0, still: 0, gusts: 0, ...o });
exports.WEATHER_BEDS = {
    clear: WB({}),
    night: WB({ wind: 0.1, still: 0.3 }),
    "dust-storm": WB({ wind: 0.95, gusts: 0.8, ash: 0.35 }),
    "fog-bank": WB({ still: 1, wind: 0.05 }),
    "electrical-storm": WB({ wind: 0.5, rain: 0.65, rumble: 0.6, thunder: 1, gusts: 0.4 }),
    "ash-fall": WB({ ash: 0.85, wind: 0.25, rumble: 0.15 }),
    "solar-flare": WB({ staticNoise: 0.8 }),
    "methane-rain": WB({ rain: 0.9, wind: 0.3, rumble: 0.1 }),
};
exports.PLANET_BEDS = {
    halcyon: { wind: 0.07, windF: 500, drone: 0, droneF: 0, detail: "ambient-call", detailEvery: 9, air: "normal" },
    rust: { wind: 0.3, windF: 900, drone: 0.05, droneF: 70, detail: "ambient-creak", detailEvery: 14, air: "thin" },
    pale: { wind: 0, windF: 0, drone: 0.12, droneF: 52, detail: "ambient-creak", detailEvery: 25, air: "none" },
    brume: { wind: 0.18, windF: 350, drone: 0.12, droneF: 46, detail: "ambient-drip", detailEvery: 5, air: "dense" },
    cinder: { wind: 0.15, windF: 300, drone: 0.2, droneF: 38, detail: "ambient-bubble", detailEvery: 4, air: "dense" },
};
exports.SURFACES = {
    dirt: { thudF: 700, gritF: 2600, grit: 0.25, dur: 0.07, splash: 0, ring: 0 },
    grass: { thudF: 600, gritF: 3400, grit: 0.18, dur: 0.08, splash: 0, ring: 0 },
    sand: { thudF: 500, gritF: 4200, grit: 0.35, dur: 0.1, splash: 0, ring: 0 },
    rock: { thudF: 1100, gritF: 2200, grit: 0.3, dur: 0.05, splash: 0, ring: 0.1 },
    mud: { thudF: 420, gritF: 1400, grit: 0.2, dur: 0.13, splash: 0.25, ring: 0 },
    glass: { thudF: 1500, gritF: 5000, grit: 0.25, dur: 0.05, splash: 0, ring: 0.3 },
    liquid: { thudF: 500, gritF: 1800, grit: 0.15, dur: 0.15, splash: 0.6, ring: 0 },
    ash: { thudF: 450, gritF: 3000, grit: 0.15, dur: 0.11, splash: 0, ring: 0 },
    rubble: { thudF: 900, gritF: 2000, grit: 0.4, dur: 0.07, splash: 0, ring: 0.2 },
    regolith: { thudF: 380, gritF: 2500, grit: 0.12, dur: 0.09, splash: 0, ring: 0 },
};
exports.LAYER_SURFACE = {
    "open-plain": "dirt", ridge: "rock", canyon: "rock", "crater-field": "rubble", "soft-ground": "mud", "ice-glass-flats": "glass",
    liquid: "liquid", lava: "ash", cliffs: "rock", "rock-forest-ruins": "rubble", "caves-tunnels": "rock",
};
exports.PLANET_SURFACE = { halcyon: "grass", rust: "sand", pale: "regolith", brume: "mud", cinder: "ash" };
function surfaceOf(layerType, planet) { return (layerType && exports.LAYER_SURFACE[layerType]) || exports.PLANET_SURFACE[planet] || "dirt"; }
function spaceOf(layerType, enclosed) { return enclosed ? "cabin" : layerType === "caves-tunnels" ? "indoor" : "open"; }
exports.CALL_SOUNDS = {
    "resupply-pod": { queued: "beacon", incoming: "pod-whistle", impact: "pod-land" },
    "scout-drop": { queued: "beacon", incoming: "pod-whistle", impact: "pod-land" },
    "heavy-weapon-pod": { queued: "beacon", incoming: "pod-whistle", impact: "pod-land" },
    "vehicle-drop": { queued: "beacon", incoming: "pod-whistle", impact: "pod-land" },
    "flak-turret": { queued: "beacon", incoming: "pod-reentry", impact: "sentry-deploy" }, // designer 21 Nov
    "repair-resupply": { queued: "beacon", incoming: "pod-reentry", impact: "pod-land" }, // designer 21 Nov
    "sentry-gun": { queued: "beacon", incoming: "pod-reentry", impact: "sentry-deploy" }, // ruling 130: + pod-retro (last 0.9 s), pod-thud
    minefield: { queued: "beacon", incoming: "shell-whistle", impact: "mines-laid", zone: "" },
    "shield-bubble": { queued: "beacon", impact: "dome-up", zone: "dome-hum", ends: "dome-down" },
    "smoke-screen": { queued: "beacon", incoming: "shell-whistle", impact: "smoke-pop", zone: "smoke-hiss" },
    "sensor-sweep": { queued: "beacon", impact: "sweep" },
    "precision-strike": { queued: "beacon", incoming: "strike-whine", impact: "callImpact" },
    barrage: { queued: "beacon", incoming: "shell-whistle", impact: "shell-whistle" },
    "emp-burst": { queued: "beacon", impact: "emp" },
    "strafing-run": { queued: "beacon", impact: "jet-pass" },
    "bomb-run": { queued: "beacon", impact: "jet-pass" },
    // ruling 121
    "recon-drone": { queued: "beacon", impact: "sweep" },
    "supply-drop": { queued: "beacon", incoming: "pod-whistle", impact: "pod-land" },
    "rocket-tube-drop": { queued: "beacon", incoming: "pod-whistle", impact: "pod-land" }, // ruling 133
};
exports.BUILTIN = ["fire", "impact", "explosion", "callImpact", "blip", "hit", "hurt", "shield", "alarm", "chirp", "collapse", "debris"];
exports.EVENT_SOUNDS = {
    HIT: { before: "hit / kill tick (own shots), shield shimmer", after: ["hit", "shield", "shield-break"], note: "own hits; a shield taken to zero breaks with a shatter" },
    REJECT: { before: "UI error", after: ["error"], note: "refusals (unchanged path, new error cue)" },
    ENTER: { before: "enter clunk", after: ["enter", "cargo-in"], note: "own pilot; a squad boarding a transport near the player" },
    EXIT: { before: "exit clunk", after: ["exit"], note: "own pilot" },
    EJECT: { before: "eject charge", after: ["eject"], note: "own pilot" },
    PILOT_DEATH: { before: "pilot-down sting (own)", after: ["pilot-down"], note: "own pilot; ends the heartbeat" },
    PRODUCED: { before: "three chimes", after: ["produced"], note: "production complete" },
    RESPAWN: { before: "respawn arpeggio", after: ["respawn"], note: "own pilot" },
    CRITICAL: { before: "none (the hull alarm only on the own vehicle)", after: ["critical", "alarm"], note: "sparks and hiss on any vehicle in earshot; the alarm stays the own vehicle's" },
    DESTROYED: { before: "none (UNIT_DIED makes the explosion)", after: ["explosion"], note: "the explosion comes from UNIT_DIED (one per death)" },
    RETURNED: { before: "none", after: [], note: "an AI pilot despawning into its home building: bookkeeping, nothing to hear" },
    SEAT: { before: "seat slide", after: ["seat"], note: "own pilot" },
    QUEUE: { before: "UI click on the key press only", after: ["queued"], note: "own team: a soft tick when a queued item starts (cost paid)" },
    SHOT: { before: "fire by damage class (4 sounds)", after: ["fire", "impact", "ricochet"], note: "fire by weapon family (16 families), impacts by surface, ricochets" },
    HIJACK: { before: "UI click / error", after: ["hack-start", "hack-stop"], note: "own hijack started / interrupted (completion: ENTER)" },
    DAMAGE_TAKEN: { before: "hurt thud / shield shimmer", after: ["hurt", "shield-break"], note: "hits on the player; shield break when it drops to zero" },
    POINT: { before: "chimes / under-attack at capture only", after: ["capture-start", "contested", "capture-done", "capture-lost", "supply-lost", "supply-restored", "hack-start", "hack-stop", "capture"], note: "every phase; progress ticks and a hum while the player stands in a ring" },
    CORE: { before: "none (threat klaxon via ThreatWatch)", after: ["hack-start", "hack-stop", "hack-done", "core-restored", "hack"], note: "Core hack phases; data chatter while a hack runs within earshot" },
    DEPOSIT_EXHAUSTED: { before: "none", after: ["deposit-dry"], note: "a deposit ran dry" },
    HARVEST_DELIVERED: { before: "none", after: ["delivered"], note: "own harvester unloading within 150 m (at most one every 2 s)" },
    ORDER_ACK: { before: "one two-tone blip for every unit", after: ["chirp"], note: "a voice-like chirp per unit class and order kind (one per order, the first unit's class)" },
    MATCH_OVER: { before: "victory / defeat", after: ["victory", "defeat"], note: "unchanged; the music switches to the victory / defeat role" },
    BUILD_STARTED: { before: "none", after: ["build-start", "construct"], note: "site placed; construction clatter loop near unfinished sites" },
    BUILD_DONE: { before: "production chimes", after: ["build-done"], note: "a building finished (replaces the production chimes)" },
    BUILD_ENDED: { before: "UI error when bad", after: ["build-cancel", "collapse"], note: "cancelled / point lost: a power-down; destroyed: collapse" },
    CALL_QUEUED: { before: "none", after: ["beacon", "call-radio", "beacon-tick", "beacon-last", "pod-whistle", "shell-whistle", "strike-whine"], note: "beacon marked; countdown ticks the last 5 s; incoming whistle / whine before impact" },
    CALL_IMPACT: { before: "callImpact boom (strikes, barrages); landing sting (pods); radar ping (sweep); none for EMP, smoke, shield, mines, sentry, strafing", after: ["callImpact", "pod-land", "sentry-deploy", "mines-laid", "dome-up", "smoke-pop", "sweep", "emp", "jet-pass"], note: "one cue per call kind (CALL_SOUNDS)" },
    CALL_REFUSED: { before: "UI error", after: ["error"], note: "unchanged" },
    CALL_EFFECT: { before: "callImpact per shell / mine / bomb; falling whistle for a pass", after: ["callImpact", "shell-whistle", "jet-pass", "strafe-hit", "mine-arm", "dome-down", "beacon-throw", "beacon-launch", "beacon-clink", "beacon-stick"], note: "shells whistle in, the aircraft pass is a moving Doppler loop, strafing rounds rake the line" },
    OBJECTIVE_PROGRESS: { before: "objective tick (c6)", after: ["objective"], note: "unchanged" },
    OBJECTIVE_DONE: { before: "objective-done", after: ["objective-done"], note: "unchanged" },
    OBJECTIVE_FAILED: { before: "objective-failed", after: ["objective-failed"], note: "unchanged" },
    DOWNED: { before: "two thumps", after: ["downed", "heartbeat"], note: "own pilot: a heartbeat loop that slows while downed" },
    REVIVED: { before: "breath and chime", after: ["revived", "revive-tick"], note: "revive progress ticks while someone holds interact on the player" },
    CHARGE: { before: "clamp beep (plant), boom (blast)", after: ["charge-plant", "fuse", "charge-blast"], note: "fuse beeps speed up until it blows" },
    CLOAK: { before: "falling / rising shimmer", after: ["cloak-on", "cloak-off", "cloak-hum"], note: "a faint hum while cloaked" },
    FORTIFY: { before: "two hammer blows (started)", after: ["fortify", "fortify-done", "construct"], note: "started, done; clatter while the work runs near the player" },
    FORWARD_BASE: { before: "none", after: ["deploy", "fb-unfold", "sentry-deploy"], note: "deploying / packing hydraulics; ruling 132: the defences unfolding / folding (servo whine, clanks)" },
    AIRCRAFT_DOWN: { before: "falling whistle", after: ["aircraft-down"], note: "unchanged; the crash explosion comes from UNIT_DIED" },
    PASSENGER_LOST: { before: "none", after: ["passenger-lost"], note: "a low tone" },
    AIRCRAFT_LANDING: { before: "gear sting on touch-down", after: ["landing"], note: "unchanged" },
    CARGO: { before: "none", after: ["cargo-in", "cargo-out", "sling-hook", "sling-drop"], note: "boarded / unloaded / sling" },
    CARGO_LOST: { before: "none", after: ["passenger-lost"], note: "a soldier lost aboard a destroyed transport" },
    FERRY: { before: "none", after: [], note: "sent only to the AI team's own viewers (enemy commander ferry): no human hears it" },
    BATTLE_RESULT: { before: "none", after: [], note: "follows MATCH_OVER, whose victory / defeat sting and music already play" },
    WEATHER: { before: "threat klaxon when weather starts", after: ["forecast", "weather-start", "weather-end", "thunder", "weather-gust"], note: "forecast radio, a gust when it starts, beds while it lasts (WEATHER_BEDS)" },
    PLAYER_JOINED: { before: "UI click", after: ["join", "pod-whistle", "pod-land"], note: "join tones; the drop pod whistles and lands" },
    PLAYER_LEFT: { before: "none", after: ["leave"], note: "leave tones" },
    UNIT_DIED: { before: "explosion by size (one recipe)", after: ["explosion", "collapse", "debris"], note: "explosion small / medium / large with sub thump and debris tail; structures collapse" },
    JAMMER: { before: "UI click on the key", after: ["jammer-on", "jammer-off"], note: "static burst" },
    DECOY: { before: "UI click on the key", after: ["decoy-drop", "decoy-end"], note: "dropped / expired" },
    SCAN: { before: "radar ping", after: ["sweep"], note: "unchanged (new sweep cue)" },
    SEARCH: { before: "none", after: [], note: "AI bookkeeping, sent to the AI team's viewers only" },
    GROUP: { before: "UI click / confirm on the key", after: ["group"], note: "battle group order / reinforcement queued (own team)" },
    AUTO_DEFEND: { before: "none", after: ["auto-defend"], note: "the home base alarm went up" },
    // C9: fix-qa2 events 110-112 stay on the host (not in snapshots); the page plays these from the C9 host sidecar's changes
    GARRISON: { before: "none (new in fix-qa2)", after: ["cargo-in", "cargo-out"], note: "own squad garrisoned into / released from a bunker (C9 sidecar)" },
    RESERVE: { before: "none (new in fix-qa2)", after: ["queued", "pod-whistle", "pod-land", "deploy"], note: "stored in the reserve, drop started, arrived, recall started / done (C9 sidecar)" },
    BUILDING_HACK: { before: "none (new in fix-qa2)", after: ["hack-start", "hack-stop", "hack-done", "core-restored"], note: "a building hack by or on the player's team: started, stopped, disabled, back on (C9 sidecar)" },
    // C11: S14 pilot reserve (120-124) and S15 (125-127), viewer's team
    PILOT_LOST: { before: "none (new in S14)", after: ["pilot-lost"], note: "a reserve pilot died: lost for the battle (at most one every 1.5 s)" },
    PILOT_AVAILABLE: { before: "none (new in S14)", after: ["pilot-back"], note: "a pilot is back at base (walked home or its vehicle was recalled; at most one every 1.5 s)" },
    CREWED: { before: "none (new in S14)", after: ["crewed"], note: "a crew order or the automatic crewing at a pilot home seated pilots (not at production)" },
    UNDERCREWED: { before: "none (new in S14)", after: ["no-crew"], note: "a vehicle rolled out short of pilots" },
    CITADEL_PILOTS: { before: "none (new in S14)", after: ["citadel-pilots"], note: "the first capture of a citadel added pilots" },
    SHELTER: { before: "none (new in ruling 121)", after: ["whoosh", "seat", "error"], note: "the own pilot goes inside a Citadel / Command Core (whoosh), comes out (seat), is thrown out (error)" },
    CREW_DISPATCH: { before: "none (new in C1)", after: ["crewed"], note: "ruling 124: a pilot sent to a vehicle (the order's confirm click), boarded (the crewed cue); gave up: the notice only" },
    AMMO: { before: "none (new in S15)", after: ["ammo-dry", "rearmed"], note: "an own aircraft ran dry / finished rearming at an Air Pad" },
    AIR_WARNING: { before: "none (new in S15)", after: ["air-warning"], note: "ash fall forecast while own aircraft are in the air" },
    ASH_CRASH: { before: "none (new in S15)", after: ["alarm", "ash-crash"], note: "forced down by ash fall: the alarm, then the impact at touchdown" },
};
/** Sounds driven by the snapshot or by input, not by an event (the inventory's second table). */
exports.STATE_SOUNDS = [
    { what: "own vehicle engine", before: "one hum (two triangles + noise) for every vehicle", after: ["engine:bike", "engine:scout", "engine:light", "engine:tank", "engine:heavy", "engine:strider", "engine:aircraft"] },
    { what: "other vehicles near the player", before: "none", after: ["engine (nearest 4 moving, 160 m, Doppler on fly-bys)"] },
    { what: "footsteps", before: "one step for every surface; landing thump", after: ["step by surface (10) and stance (walk / sprint / crouch / prone)", "land"] },
    { what: "stance change", before: "none", after: ["stance-down", "stance-prone", "stance-up"] },
    { what: "low flight", before: "none", after: ["lowflight-on", "lowflight-off"] },
    { what: "jump pack", before: "whoosh", after: ["whoosh (kept as is)"] },
    { what: "repair torch", before: "hiss and arc", after: ["hiss and arc (unchanged)"] },
    { what: "hull critical alarm", before: "two square beeps", after: ["alarm (unchanged)"] },
    { what: "support-call countdown", before: "none", after: ["beacon-tick", "beacon-last", "incoming whistle"] },
    { what: "call zones (shield bubble, smoke)", before: "none", after: ["dome-hum", "smoke-hiss"] },
    { what: "capture / hack progress", before: "none", after: ["capture", "capture-tick", "hack", "hack-tick"] },
    { what: "construction sites", before: "none", after: ["construct"] },
    { what: "wrecks", before: "none", after: ["wreck-fire"] },
    { what: "weather", before: "none", after: ["weather beds: wind, rain, rumble + thunder, ash, static, fog stillness"] },
    { what: "planet ambience", before: "none", after: ["planet beds: halcyon, rust, pale, brume, cinder"] },
    { what: "music", before: "none", after: ["music.ts: menu / calm / combat / victory / defeat from music/tracks.json"] },
    { what: "UI clicks / refusals", before: "sine click, square error", after: ["click", "confirm", "error"] },
    // C9: fix-qa2 states from the host sidecar / the stockpile
    { what: "Shield Projector dome absorbing (C9)", before: "none", after: ["shield (at most every 1.5 s, at the projector)"] },
    { what: "manning a Gun Tower (C9)", before: "none", after: ["seat"] },
    { what: "NO GAS: energy weapons offline (C9)", before: "none", after: ["error (when the state starts)", "energy-dry (C10: every 2 s at an own energy-weapon unit near the eye)"] },
    { what: "a building hack running near the eye (C10)", before: "none", after: ["hack-tick (every 0.9 s)"] },
    { what: "a pilot leaving a Gun Tower (C10)", before: "none", after: ["exit (at the tower)"] },
    // F2 (ruling 91): the Lancer laser, from the snapshot's EXT_LASER record
    { what: "Lancer laser cannon charging (F2: own, and any Lancer in view: a shot is coming)", before: "none", after: ["laser-charge"] },
    { what: "own Lancer cannon cooldown (F2)", before: "none", after: ["laser-cooldown-tick (every 0.5 s)", "laser-ready"] },
    { what: "own Lancer rapid laser overheated (F2)", before: "none", after: ["laser-overheat", "laser-vent"] },
    // ruling 108: the Dart Scout boost, from the snapshot's EXT_BOOST record
    { what: "own Dart Scout boost (ruling 108)", before: "none", after: ["boost-start", "boost-empty", "boost-ready"] },
];
