"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATE_FX = exports.EVENT_FX = exports.PLANET_FX = exports.WEATHER_FX = exports.CALL_FX = exports.PLANET_DUST = exports.SURFACE_FX = exports.LASER_FX = exports.WEAPON_FX = exports.TURRET_LASER_FX = exports.CAPS = exports.PAL = void 0;
// ------------------------------------------------------------------ palette
exports.PAL = {
    white: [1, 0.97, 0.9], flash: [1, 0.9, 0.66],
    fireHot: [1, 0.86, 0.5], fire: [1, 0.55, 0.18], ember: [0.9, 0.3, 0.07], fireDeep: [0.6, 0.16, 0.04],
    smokeBlack: [0.1, 0.095, 0.09], smokeDark: [0.19, 0.175, 0.16], smoke: [0.31, 0.29, 0.26], smokeLight: [0.5, 0.47, 0.42], // G1: warmer, darker smoke against the cream haze
    steam: [0.78, 0.79, 0.76], debris: [0.13, 0.12, 0.11], debrisHot: [0.55, 0.22, 0.06], scorch: [0.045, 0.04, 0.035],
    spark: [1, 0.82, 0.45], sparkHot: [1, 0.95, 0.78], metal: [1, 0.7, 0.32], brass: [0.78, 0.6, 0.28],
    own: [0.25, 0.92, 1], enemy: [1, 0.36, 0.1], neutral: [0.85, 0.85, 0.8],
    energyOwn: [0.45, 0.95, 1], energyEnemy: [1, 0.5, 0.25], arc: [0.6, 0.8, 1],
    shield: [0.45, 0.8, 1], shieldBreak: [1, 0.45, 0.25], emp: [0.55, 0.72, 1], cloak: [0.6, 0.85, 1],
    rocketFlame: [1, 0.7, 0.3], shell: [1, 0.62, 0.3], flak: [0.28, 0.26, 0.24],
    beacon: [1, 0.8, 0.35], strike: [1, 0.35, 0.2], sweep: [0.3, 1, 0.75], dome: [0.4, 0.75, 1],
    smokeWall: [0.6, 0.6, 0.58], mine: [1, 0.3, 0.15], heal: [0.4, 1, 0.55],
    capture: [1, 0.86, 0.5], hack: [0.75, 0.5, 1], weld: [0.7, 0.9, 1], ore: [0.78, 0.52, 1.0], gas: [0.55, 0.95, 0.68], // G1: the purple ore crystals, the geysers' green
    holo: [0.35, 0.9, 1], downed: [1, 0.3, 0.2],
    rain: [0.62, 0.74, 0.76], methane: [0.55, 0.74, 0.62], dust: [0.66, 0.57, 0.42], ash: [0.36, 0.34, 0.33], ashEmber: [1, 0.45, 0.15],
    fog: [0.8, 0.82, 0.82], lightning: [0.85, 0.9, 1], flare: [1, 0.92, 0.7],
};
// ------------------------------------------------------------------ budget, LOD, fades
exports.CAPS = {
    /** simulated particles alive (alpha + additive), and ground decals alive */
    particles: 4096, decals: 192,
    /** per-frame instances handed to the renderer per pass (pool + this frame's attached effects) */
    frameAlpha: 2600, frameAdd: 3200, frameDecal: 256, once: 2400,
    /** fill fractions above which a band is refused (0 ambient, 1 normal, 2 important); band 3 (critical) always gets
     *  in, stealing a lower band's particle when the pool is full */
    bandLimit: [0.6, 0.85, 0.97, 1],
    /** most ambient particles (weather, motes, dust) at once, as a share of `particles` */
    ambientShare: 0.3,
    /** LOD: full counts within lodNear m, then counts fall as 1 / (1 + (d - lodNear) / lodFall), never under lodMin */
    lodNear: 80, lodFall: 220, lodMin: 0.15,
    /** near fade (size on screen = radius / distance): alpha (smoke, dust) and additive (flash, fire) particles */
    nearAlpha: [0.16, 0.36], nearAdd: [0.12, 0.3],
    /** default far distance (m) an effect is drawn to; the last quarter fades */
    far: 900,
    /** screen effects: the most the hit vignette and flashes cover / brighten */
    vignetteMax: 0.55, flashMax: 0.35,
};
// ------------------------------------------------------------------ weapons
/**
 * F1 (designer playtest 15 Nov): an enemy turret that spotted you (turret-cue.ts). While it slews: a faint laser-dot line from
 * its muzzle along the barrel (toward you once it is on target) and a muzzle glow; locked (its wind-up before the first
 * shot): brighter and pulsing. spacing / r: dot spacing and radius (m); a: alpha slewing / locked; glow: muzzle glow radius.
 */
exports.TURRET_LASER_FX = { col: "enemy", spacing: 2.2, r: 0.16, a: [0.35, 0.85], glow: 0.9, maxLen: 320, pulseMs: 90 };
exports.WEAPON_FX = {
    "kinetic-small": { muzzle: 0.45, star: 4, smoke: 0, tracer: "streak", glow: 0, trail: 0, impact: 0.6, casings: true },
    "kinetic-medium": { muzzle: 0.8, star: 4, smoke: 1, tracer: "heavy", glow: 0.5, trail: 0, impact: 1.1, casings: false, trailW: 0.18, trailLife: 0.18 },
    "tank-cannon": { muzzle: 2.6, star: 8, smoke: 7, tracer: "heavy", glow: 1.4, trail: 0, impact: 2.4, casings: false, trailW: 0.5, trailLife: 0.36 }, // Frontline: the Bastion main gun
    "kinetic-heavy": { muzzle: 1.8, star: 6, smoke: 4, tracer: "heavy", glow: 1.1, trail: 0, impact: 2, casings: false, trailW: 0.42, trailLife: 0.32 },
    autocannon: { muzzle: 0.9, star: 4, smoke: 1, tracer: "autocannon", glow: 0.6, trail: 0, impact: 1.2, casings: true, trailW: 0.22, trailLife: 0.16 },
    energy: { muzzle: 0.7, star: 0, smoke: 0, tracer: "bolt", glow: 0.8, trail: 0, impact: 0.9, casings: false },
    beam: { muzzle: 0.9, star: 0, smoke: 0, tracer: "beam", glow: 0.9, trail: 0, impact: 1, casings: false, beamW: 0.35 },
    rocket: { muzzle: 1.1, star: 0, smoke: 4, tracer: "rocket", glow: 1.0, trail: 1.1, impact: 1.8, casings: false, trailW: 0.3, trailLife: 0.25 },
    missile: { muzzle: 1.0, star: 0, smoke: 3, tracer: "missile", glow: 0.9, trail: 0.9, impact: 1.5, casings: false, trailW: 0.26, trailLife: 0.22 },
    mortar: { muzzle: 1.4, star: 4, smoke: 4, tracer: "shell", glow: 1.0, trail: 0.35, impact: 2, casings: false, trailW: 0.4, trailLife: 0.7 },
    artillery: { muzzle: 2.4, star: 6, smoke: 6, tracer: "shell", glow: 1.4, trail: 0.45, impact: 2.6, casings: false, trailW: 0.6, trailLife: 0.8 },
    flak: { muzzle: 1.0, star: 4, smoke: 2, tracer: "flak", glow: 0.6, trail: 0, impact: 1.2, casings: true, burst: 4, trailW: 0.24, trailLife: 0.18 },
    carbine: { muzzle: 0.4, star: 4, smoke: 0, tracer: "streak", glow: 0, trail: 0, impact: 0.55, casings: true },
    rifle: { muzzle: 0.7, star: 6, smoke: 1, tracer: "heavy", glow: 0.25, trail: 0, impact: 0.9, casings: true },
    turret: { muzzle: 0.9, star: 4, smoke: 1, tracer: "autocannon", glow: 0.6, trail: 0, impact: 1.2, casings: true, trailW: 0.22, trailLife: 0.16 },
    shotgun: { muzzle: 0.8, star: 6, smoke: 2, tracer: "pellets", glow: 0, trail: 0, impact: 0.7, casings: false },
    melee: { muzzle: 0, star: 0, smoke: 0, tracer: "melee", glow: 0, trail: 0, impact: 0.8, casings: false },
    // F2 (ruling 91): the Lancer laser cannon (a thick bright beam, a short afterglow, a scorch where it lands) and its rapid laser;
    // V1 (designer playtest 15 Nov): a thicker cannon beam with a longer afterglow, the rapid laser as short bright bolts
    "laser-cannon": { muzzle: 2, star: 0, smoke: 1, tracer: "beam", glow: 1.4, trail: 0, impact: 2, casings: false, beamW: 1.0, afterglow: 0.8, scorch: 1.8 },
    "laser-rapid": { muzzle: 0.7, star: 0, smoke: 0, tracer: "bolt", glow: 1.3, trail: 0, impact: 0.8, casings: false, beamW: 0.2, afterglow: 0 },
    none: { muzzle: 0, star: 0, smoke: 0, tracer: "none", glow: 0, trail: 0, impact: 0, casings: false },
};
/**
 * F2 (ruling 91): Lancer laser state effects (EXT_LASER). charge: the glow building at the muzzle while the cannon charges,
 * every viewer that sees the Lancer (r0 -> r1 m radius with the charge, rings drawn in from rMax); heat: shimmer over the
 * rapid laser above `from` of full heat; vent: steam venting while overheated (puffs a second).
 */
exports.LASER_FX = { charge: { r0: 0.15, r1: 1.1, rMax: 2.4, rings: 2 }, heat: { from: 0.6 }, vent: { rate: 14 } };
exports.SURFACE_FX = {
    dirt: { dust: [0.5, 0.42, 0.3] }, grass: { dust: [0.44, 0.42, 0.28] }, sand: { dust: [0.74, 0.6, 0.42] },
    rock: { dust: [0.52, 0.51, 0.49], chips: true }, mud: { dust: [0.32, 0.27, 0.2], heavy: true }, glass: { dust: [0.72, 0.82, 0.84], chips: true },
    liquid: { dust: [0.62, 0.76, 0.78], splash: true }, ash: { dust: [0.3, 0.29, 0.28] }, rubble: { dust: [0.48, 0.46, 0.43], chips: true },
    regolith: { dust: [0.64, 0.64, 0.65] }, lava: { dust: [1, 0.45, 0.1], splash: true, glow: true },
};
/** Ground dust colour per planet when the terrain layer says nothing (sound-table PLANET_SURFACE). */
exports.PLANET_DUST = { halcyon: "dirt", rust: "sand", pale: "regolith", brume: "mud", cinder: "ash" };
exports.CALL_FX = {
    "resupply-pod": { beacon: "beacon", incoming: "pod-trail", impact: "pod-land", cmd: "pip" },
    "scout-drop": { beacon: "beacon", incoming: "pod-trail", impact: "pod-land", cmd: "pip" },
    "heavy-weapon-pod": { beacon: "beacon", incoming: "pod-trail", impact: "pod-land", cmd: "pip" },
    "vehicle-drop": { beacon: "beacon", incoming: "pod-trail", impact: "pod-land", cmd: "pip" },
    "sentry-gun": { beacon: "beacon", incoming: "pod-trail", impact: "sentry-deploy", cmd: "pip" },
    "flak-turret": { beacon: "beacon", incoming: "pod-trail", impact: "sentry-deploy", cmd: "pip" }, // designer 21 Nov
    "repair-resupply": { beacon: "beacon", incoming: "pod-trail", impact: "pod-land", cmd: "pip" }, // designer 21 Nov
    minefield: { beacon: "mine", impact: "mines-laid", zone: "mine-blink", cmd: "ring" },
    "shield-bubble": { beacon: "dome", impact: "dome-up", zone: "dome-surface", cmd: "ring" },
    "smoke-screen": { beacon: "smokeWall", impact: "smoke-pop", zone: "smoke-wall", cmd: "ring" },
    "sensor-sweep": { beacon: "sweep", impact: "sweep-ring", cmd: "ring" },
    "precision-strike": { beacon: "strike", incoming: "strike-beam", impact: "strike-blast", cmd: "ring" },
    barrage: { beacon: "strike", incoming: "shell-trail", impact: "barrage-shell", cmd: "ring" },
    "emp-burst": { beacon: "emp", impact: "emp-pulse", zone: "emp-arcs", cmd: "ring" },
    "strafing-run": { beacon: "strike", incoming: "jet-pass", impact: "strafe-hit", cmd: "line" },
    "bomb-run": { beacon: "strike", incoming: "jet-pass", impact: "bomb", cmd: "line" },
    // ruling 121
    "recon-drone": { beacon: "sweep", impact: "sweep-ring", cmd: "ring" },
    "supply-drop": { beacon: "beacon", incoming: "pod-trail", impact: "pod-land", cmd: "pip" },
    "rocket-tube-drop": { beacon: "beacon", incoming: "pod-trail", impact: "pod-land", cmd: "pip" }, // ruling 133
};
exports.WEATHER_FX = {
    clear: { kind: "none", rate: 0, col: "smokeLight", fall: 0, wind: 0, size: 0, effects: [] },
    night: { kind: "night", rate: 6, col: "holo", fall: 0.2, wind: 0.5, size: 0.06, effects: ["motes"] },
    "dust-storm": { kind: "dust", rate: 60, col: "dust", fall: 0.6, wind: 14, size: 2.6, effects: ["dust-sheet"] },
    "fog-bank": { kind: "fog", rate: 8, col: "fog", fall: 0, wind: 1.2, size: 14, effects: ["fog-bank"] },
    "electrical-storm": { kind: "storm", rate: 700, col: "rain", fall: 24, wind: 4, size: 0.04, effects: ["rain", "lightning"] },
    "ash-fall": { kind: "ash", rate: 80, col: "ash", fall: 1.4, wind: 2, size: 0.12, effects: ["ash"] },
    "solar-flare": { kind: "flare", rate: 8, col: "flare", fall: 0, wind: 0, size: 0.1, effects: ["flare-glare", "motes"] },
    "methane-rain": { kind: "rain", rate: 900, col: "methane", fall: 18, wind: 3, size: 0.035, effects: ["rain"] },
};
exports.PLANET_FX = {
    halcyon: { motes: "smokeLight", moteRate: 4, moteSize: 0.05, rise: 0.15, sky: [0.95, 0.85, 0.65], skyK: 0.1 },
    rust: { motes: "dust", moteRate: 6, moteSize: 0.06, rise: 0.05, sky: [0.9, 0.55, 0.3], skyK: 0.16 },
    pale: { motes: "neutral", moteRate: 2, moteSize: 0.04, rise: 0, sky: [0.75, 0.8, 0.9], skyK: 0.08 },
    brume: { motes: "gas", moteRate: 5, moteSize: 0.05, rise: -0.1, sky: [0.6, 0.75, 0.7], skyK: 0.14 },
    cinder: { motes: "ashEmber", moteRate: 7, moteSize: 0.06, rise: 0.6, sky: [1, 0.45, 0.2], skyK: 0.2 },
};
exports.EVENT_FX = {
    HIT: { before: "hit marker (HUD); spark at the tracer end", after: ["impact-metal", "shield-hit"], note: "own hits: the hull sparks at the hit point, a shielded target ripples where it was struck" },
    REJECT: { before: "none (HUD text)", after: [], note: "a refused input: HUD text only, nothing in the world to show" },
    ENTER: { before: "none", after: ["hatch-puff"], note: "a small puff of dust at the hatch of a vehicle boarded near the camera" },
    EXIT: { before: "none", after: ["hatch-puff"], note: "the same puff when a pilot climbs out" },
    EJECT: { before: "none", after: ["eject-trail"], note: "a launch flash and a smoke trail arcing up from the seat (auto-eject too)" },
    PILOT_DEATH: { before: "none (UNIT_DIED makes the pop)", after: [], note: "the body's death is drawn by UNIT_DIED; this one is bookkeeping for the HUD" },
    PRODUCED: { before: "none", after: ["rollout-dust"], note: "dust and a door glow at the building that produced the unit" },
    RESPAWN: { before: "none", after: ["respawn-glow"], note: "a column of light where the pilot respawns" },
    CRITICAL: { before: "red hull bar (own vehicle only)", after: ["critical-sparks", "damage-smoke"], note: "sparks burst and black smoke pours from a vehicle at zero hull (until it blows)" },
    DESTROYED: { before: "none (UNIT_DIED makes the explosion)", after: [], note: "the explosion comes from UNIT_DIED (one per death)" },
    RETURNED: { before: "none", after: [], note: "an AI pilot despawning into its home building: bookkeeping, nothing to see" },
    SEAT: { before: "none", after: [], note: "a seat change inside a vehicle: nothing outside changes" },
    QUEUE: { before: "none", after: [], note: "production queue bookkeeping (HUD)" },
    SHOT: { before: "thin tracer box; spark at the end; one muzzle ball for every weapon", after: ["muzzle", "tracer", "beam", "casing", "impact-dust", "ricochet"], note: "muzzle flash sized to the weapon, tracer by class, impacts by surface, ricochets" },
    HIJACK: { before: "hijack ring (HUD)", after: ["hack-sparks"], note: "sparks at the hull while a hijack runs (own)" },
    DAMAGE_TAKEN: { before: "damage direction arrows (HUD), shield flash dome", after: ["hit-vignette", "shield-hit"], note: "a red vignette from the side the hit came from; a shield ripple on the own vehicle" },
    POINT: { before: "point ring dots", after: ["capture-pulse", "capture-flip", "hack-sparks"], note: "pulses while a capture runs, a flash and ring when it changes hands, sparks while a point is hacked" },
    CORE: { before: "none", after: ["hack-sparks", "emp-arcs", "capture-flip"], note: "sparks while a Core is hacked, arcs while it is disabled, a flash when it is restored" },
    DEPOSIT_EXHAUSTED: { before: "none", after: ["deposit-dust"], note: "a last puff of dust over the deposit" },
    HARVEST_DELIVERED: { before: "none", after: ["ore-unload"], note: "an ore stream and dust at the drop-off (own team, near)" },
    ORDER_ACK: { before: "order marker dots (HUD)", after: [], note: "the order markers are HUD; nothing in the world" },
    MATCH_OVER: { before: "match-over card", after: [], note: "the destroyed Core's own explosion is UNIT_DIED; the card is HUD" },
    BUILD_STARTED: { before: "hologram", after: ["build-start"], note: "a holo ring and dust where the site is placed; frame and welding sparks while it rises (STATE_FX)" },
    BUILD_DONE: { before: "none", after: ["build-done"], note: "a flash up the finished building and a dust ring" },
    BUILD_ENDED: { before: "none", after: ["collapse", "build-cancel"], note: "destroyed: the site collapses in dust; cancelled / point lost: the hologram fizzles" },
    CALL_QUEUED: { before: "beacon pillar dots", after: ["beacon-beam"], note: "a beam of light at the beacon (CALL_FX beacon colour), countdown rings" },
    CALL_IMPACT: { before: "explosion puffs (strikes, pods, EMP, smoke, shield, mines); sweep / EMP dot rings", after: ["pod-land", "sentry-deploy", "mines-laid", "dome-up", "smoke-pop", "sweep-ring", "strike-blast", "emp-pulse", "barrage-shell", "strafe-hit", "bomb"], note: "one effect per call (CALL_FX impact)" },
    CALL_REFUSED: { before: "none (HUD text)", after: [], note: "a refused call: HUD text only, nothing in the world" },
    CALL_EFFECT: { before: "explosion puffs per shell / mine / bomb; aircraft dots; spark per strafing round", after: ["barrage-shell", "shell-trail", "strafe-hit", "bomb", "mine-pop", "dome-down", "jet-pass"], note: "shells streak in and burst, strafing rounds rake the line, bombs fall, mines pop, the dome breaks" },
    OBJECTIVE_PROGRESS: { before: "objective line (HUD)", after: [], note: "the objective line is HUD only, nothing in the world" },
    OBJECTIVE_DONE: { before: "objective line (HUD)", after: [], note: "the objective line is HUD only, nothing in the world" },
    OBJECTIVE_FAILED: { before: "objective line (HUD)", after: [], note: "the objective line is HUD only, nothing in the world" },
    DOWNED: { before: "downed overlay (HUD)", after: ["downed-marker", "downed-screen"], note: "a red pulse over a downed pilot; the own view goes grey and dark" },
    REVIVED: { before: "none", after: ["revive-glow"], note: "a green column where the pilot gets up" },
    CHARGE: { before: "blinking dot; explosion puffs at the blast", after: ["charge-blink", "explosion"], note: "the fuse light; the blast is a medium explosion" },
    CLOAK: { before: "faint dot over the cloaked pilot", after: ["cloak-shimmer", "decloak"], note: "a shimmer while it cloaks; a flash and ring when the cloak drops" },
    FORTIFY: { before: "none", after: ["fortify"], note: "welding sparks around the point while the upgrade runs; a flash when done" },
    FORWARD_BASE: { before: "none", after: ["deploy-dust"], note: "dust and steam vents when the forward base deploys or packs" },
    AIRCRAFT_DOWN: { before: "none (UNIT_DIED makes the explosion)", after: ["crash-trail"], note: "a smoke trail from the falling aircraft; the crash explosion comes from UNIT_DIED" },
    PASSENGER_LOST: { before: "none", after: [], note: "a passenger dying inside a vehicle: nothing outside to see" },
    AIRCRAFT_LANDING: { before: "none", after: ["landing-dust"], note: "a ring of dust under an aircraft touching down or lifting off" },
    CARGO: { before: "sling cable dots", after: ["hatch-puff"], note: "a puff at the hatch on boarding / unloading near the camera" },
    CARGO_LOST: { before: "none", after: [], note: "a soldier lost aboard a destroyed transport: inside the vehicle" },
    FERRY: { before: "none", after: [], note: "sent only to the AI team's own viewers: no human sees it" },
    BATTLE_RESULT: { before: "none", after: [], note: "follows MATCH_OVER: a card, nothing in the world" },
    WEATHER: { before: "fog and tint; CSS stripes over the view; lightning brightness flash", after: ["rain", "dust-sheet", "ash", "fog-bank", "lightning", "flare-glare"], note: "camera-attached particle volumes while it lasts (WEATHER_FX)" },
    PLAYER_JOINED: { before: "pod dots", after: ["pod-trail", "pod-land"], note: "the drop pod's re-entry trail and landing burst at the Core" },
    PLAYER_LEFT: { before: "none", after: [], note: "a player leaving: roster (HUD)" },
    UNIT_DIED: { before: "puff balls (fireball, smoke, debris) and a ring in the command view", after: ["explosion", "collapse", "wreck-fire", "scorch"], note: "explosions by size (flash, fireball, smoke column, debris, shockwave, scorch); structures collapse; vehicles leave a burning wreck" },
    JAMMER: { before: "none", after: ["jammer-pulse"], note: "a violet pulse ring at the relay tower" },
    DECOY: { before: "blinking dot", after: ["decoy-pop"], note: "a puff when dropped / expired" },
    SCAN: { before: "none", after: ["sweep-ring"], note: "the Dart's scout ping sweeps a ring" },
    SEARCH: { before: "none", after: [], note: "AI bookkeeping, sent to the AI team's viewers only" },
    GROUP: { before: "none", after: [], note: "battle group bookkeeping (HUD)" },
    AUTO_DEFEND: { before: "none", after: [], note: "the base alarm is HUD and sound" },
    GARRISON: { before: "none", after: [], note: "host-side only (not in snapshots): never reaches the page" },
    RESERVE: { before: "none", after: [], note: "host-side only (not in snapshots): the deploy-from-reserve drop cannot be drawn until it is sent" },
    BUILDING_HACK: { before: "none", after: [], note: "host-side only (not in snapshots); a hacked building shows no effect until it is sent" },
    // C11: S14 pilot reserve and S15
    PILOT_LOST: { before: "none", after: [], note: "a pilot's death is drawn by UNIT_DIED (on foot) or inside a vehicle; the reserve change is HUD" },
    PILOT_AVAILABLE: { before: "none", after: ["respawn-glow"], note: "a team glow at the home building the pilot walked into" },
    CREWED: { before: "none", after: ["hatch-puff"], note: "a puff at the hatch of the vehicle that took its crew" },
    UNDERCREWED: { before: "none", after: [], note: "the NO CREW tag over the vehicle is HUD (both views)" },
    CITADEL_PILOTS: { before: "none", after: ["capture-flip"], note: "a flash and ring at the citadel" },
    SHELTER: { before: "none", after: [], note: "ruling 121: a notice and the switch to / from the command view; the body vanishes / reappears with the snapshot" },
    CREW_DISPATCH: { before: "none (new in C1)", after: ["hatch-puff"], note: "ruling 124: a notice; while a pilot walks the page draws a dotted line from it to the vehicle and a ring on it; boarded: the hatch puff" },
    AMMO: { before: "none", after: ["respawn-glow"], note: "rearmed: a team glow over the aircraft (dry: the HUD only)" },
    AIR_WARNING: { before: "none", after: [], note: "a forecast: HUD warning and countdown only" },
    ASH_CRASH: { before: "none", after: ["crash-trail", "landing-dust"], note: "smoke from the forced-down aircraft; a dust ring at touchdown" },
};
/** Effects driven by the snapshot or by input, not by an event (the inventory's second table). */
exports.STATE_FX = [
    { what: "hover vehicles", before: "none", after: ["hover-glow", "hover-dust"] },
    { what: "aircraft", before: "none", after: ["jet-glow", "lowflight-wake"] },
    { what: "damaged vehicles (hull under 35 %)", before: "none", after: ["damage-smoke"] },
    { what: "vehicle shields", before: "shield flash dome on a hit", after: ["shield-hit", "shield-break"] },
    { what: "EMP-disabled vehicles", before: "spark puffs in the EMP radius", after: ["emp-arcs"] },
    { what: "projectiles in flight", before: "tracer box", after: ["rocket-trail", "shell-glow", "bolt-glow", "flak-burst"] },
    { what: "construction sites", before: "hologram fill", after: ["build-frame", "weld-sparks"] },
    { what: "harvesters mining", before: "none", after: ["mining-sparks", "ore-stream"] },
    { what: "gas extractors", before: "none", after: ["gas-vent"] },
    { what: "strategic points", before: "point ring dots", after: ["capture-pulse"] },
    { what: "burnt hulls (ruling 106)", before: "salvage wrecks", after: ["wreck-fire"] },
    { what: "beacons", before: "pillar dots", after: ["beacon-beam"] },
    { what: "call zones", before: "dot rings", after: ["dome-surface", "smoke-wall", "mine-blink", "emp-arcs"] },
    { what: "stance (own pilot going prone)", before: "none", after: ["prone-dust"] },
    { what: "cloaked own-team pilots", before: "faint dot", after: ["cloak-shimmer"] },
    { what: "weather", before: "CSS stripes, tint, fog", after: ["rain", "dust-sheet", "ash", "fog-bank", "lightning", "flare-glare"] },
    { what: "planet ambience", before: "none", after: ["motes"] },
    { what: "screen", before: "damage arrows; lightning flash; shake on call impacts", after: ["hit-vignette", "low-health", "downed-screen", "emp-static", "scope-vignette", "near-flash", "shake"] },
    { what: "command view", before: "explosion rings, tracer lines", after: ["cmd-pip", "cmd-ring", "cmd-line"] },
    { what: "Lancer laser (F2, ruling 91): cannon charging (every viewer), rapid laser hot / overheated (own)", before: "none", after: ["laser-charge", "laser-heat", "laser-vent"] },
];
