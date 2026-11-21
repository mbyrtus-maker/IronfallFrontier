"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIPS = exports.KEYS = exports.KEY_GROUPS = void 0;
exports.nextTip = nextTip;
exports.keyNames = keyNames;
exports.keyCollisions = keyCollisions;
exports.keysByMode = keysByMode;
exports.helpHtml = helpHtml;
const SEATS = ["vehicle", "aircraft", "gunner"], ALL = ["foot", "vehicle", "aircraft", "gunner", "cmd"];
/** Group titles, in panel order. */
exports.KEY_GROUPS = [
    ["foot", "On foot (pilot)"], ["vehicle", "In a vehicle (driver)"], ["aircraft", "Aircraft (pilot seat)"], ["gunner", "Gunner and passenger seats"],
    ["cmd", "Command view (Tab)"], ["calls", "Support calls"], ["tools", "Tools"], ["any", "Anywhere"],
];
exports.KEYS = [
    // ---- on foot
    { mode: "foot", key: "W A S D", what: "move (the arrow keys too, except while Z is held)" },
    { mode: "foot", key: "Shift", what: "sprint (hold)" },
    { mode: "foot", key: "C", what: "crouch (hold)" },
    { mode: "foot", key: "T", what: "prone on / off: going down 0.6 s, getting up 1.2 s, no firing meanwhile · crawl, no jump pack · best accuracy and stealth" },
    { mode: "foot", key: "Space", what: "jump · hold: jetpack (3 s free, then energy) · hold while falling: brake" },
    { mode: "foot", key: "LMB", what: "fire the kit item · build tool: the point's build menu · torch: hold at a hull" },
    { mode: "foot", key: "RMB", what: "long rifle: scope (shoot a seat's zone)" },
    { mode: "foot", key: "1 2 3 4 / wheel", what: "carbine · long rifle · repair torch · build tool", when: "a panel open: its options; heavy weapon pod armed: its weapon" },
    { mode: "foot", key: "F", what: "enter the vehicle in reach (hijack an empty enemy: 5 s contact) · at an own Bunker's door: climb in and fire its mounted weapons (X next mount; level 2 and 3 fit more) · at an own Gun Tower: man it (range ×1.2, spread ×0.5; the view from its turret) · at an own sentry gun: get in and fire it yourself (mouse aims at the gun's own speed, LMB fires; protected inside; it is automatic again when you leave) · F again: leave · else open the building in reach" },
    { mode: "foot", key: "Y", what: "CREW THIS: the nearest free AI pilot (on foot, or from the reserve at a building) walks to the own vehicle under the reticle and takes its driver seat (also on the Q wheel)", in: ["foot", "vehicle"] },
    { mode: "foot", key: "X", what: "pick another seat of the vehicle in reach (before F)" },
    { mode: "foot", key: "E (hold)", what: "interact: hack a terminal, the enemy Core or an enemy building (12 s, hack-tool energy; the building is disabled 60 s), revive a downed squadmate" },
    { mode: "foot", key: "LMB · R", when: "build tool, placing a building", what: "the building picked in the tool's menu follows the aim (70 m): LMB places it, Shift+LMB several, R / Q E / wheel turn it, RMB or Esc cancel" },
    { mode: "foot", key: "J", what: "production anywhere: every own Foundry / Barracks / Air Pad / Core, 1-9 queue at the nearest that can (or a picked one), queues and cancel, rally to me", in: ["foot", "vehicle"] },
    { mode: "foot", key: "B", what: "production at a building in reach · B again closes (the call loadout: K)" },
    { mode: "foot", key: "V", what: "call a ride: a friendly AI vehicle comes" },
    { mode: "foot", key: "Q (hold)", what: "quick-command wheel: move the mouse, release Q to send" },
    { mode: "foot", key: "G", what: "plant a demo charge on the enemy vehicle or structure in reach" },
    { mode: "foot", key: "R (hold)", what: "cloak (12 s; moving drains energy; firing breaks it)" },
    { mode: "foot", key: "N", what: "drop a decoy beacon: enemy sensors see a Lancer for 20 s (one per life)" },
    // ---- driver
    { mode: "vehicle", key: "W S · A D", what: "thrust · strafe" },
    { mode: "vehicle", key: "LMB · RMB", what: "fire the live weapon · Dart Scout: RMB fires the homing Shadower (locks on to a seen enemy within 10° of the aim) · Salvo: LMB the twin missiles, RMB the minigun · Lancer: hold LMB to charge the laser cannon (1 s, fires when full; release early cancels; 2.5 s cooldown), hold RMB for the rapid laser (overheats after 3 s: 3 s lockout)" },
    { mode: "vehicle", key: "Space", what: "hop: a short jump to dodge shots and clear ridges (2.5 s cooldown; light vehicles hop highest, the Bastion low; the Strider walks and economy vehicles cannot)" },
    { mode: "vehicle", key: "Shift (hold)", what: "Dart Scout: boost to 60 m/s with W (3 s of meter, 8 s to refill; needs a quarter to start); the speed carries: it takes a while to bleed off" },
    { mode: "vehicle", key: "T", what: "swap to an empty gunner seat's weapon (yours goes silent)" },
    { mode: "vehicle", key: "F", what: "climb out" },
    { mode: "vehicle", key: "X", what: "next free seat (2 s into the driver seat)" },
    { mode: "vehicle", key: "E (hold)", what: "eject early (automatic at hull zero)" },
    { mode: "vehicle", key: "N", what: "Dart: scout pulse (reveals enemies within 120 m for 5 s; 20 s cooldown)" },
    { mode: "vehicle", key: "Q (hold)", what: "quick-command wheel" },
    // ---- aircraft
    { mode: "aircraft", key: "W S · A D", what: "fly: thrust · strafe" },
    { mode: "aircraft", key: "C (hold)", what: "land and stay landed · release to lift off (near an Air Pad: rearm)" },
    { mode: "aircraft", key: "Space", what: "low flight on / off: a few metres up, half the signature, radar needs line of sight · slower, every ground weapon reaches you" },
    { mode: "aircraft", key: "LMB", what: "fire" },
    { mode: "aircraft", key: "F · X · E (hold)", what: "climb out (landed) · next seat · eject" },
    // ---- gunner / passenger
    { mode: "gunner", key: "LMB", what: "gunner: fire the seat's weapon · passenger: your personal weapon where the seat mounts it (Mule doors)" },
    { mode: "gunner", key: "RMB (hold)", what: "gunner: zoomed sight" },
    { mode: "gunner", key: "G / MMB", what: "gunner: send your AI driver to the reticle" },
    { mode: "gunner", key: "X · F · E (hold)", what: "next seat · climb out · eject" },
    { mode: "gunner", key: "LMB · RMB · F / E", what: "drop pod sentry: twin guns · 4-rocket salvo (6 s reload; the head turns toward the mouse at its traverse speed) · leave (automatic again)", when: "manning a sentry gun" },
    // ---- command view
    { mode: "cmd", key: "W A S D / edges", what: "pan · mouse wheel zoom · MMB drag rotate" },
    { mode: "cmd", key: "LMB", what: "select (drag a box; Shift adds) · click a building: its panel · click a point: build menu", when: "an order button armed: its map click" },
    { mode: "cmd", key: "RMB", what: "move / attack · with a building: rally point · on an own vehicle with an empty seat, with nothing or only own AI pilots selected: send a pilot (those pilots, or the nearest free one) to crew it", when: "an order button armed: cancel it" },
    { mode: "cmd", key: "1 … 9", what: "select control group · Ctrl+n assign · Shift+n add · double tap: centre (control groups are selections)" },
    { mode: "cmd", key: "G", what: "guard the unit under the cursor" },
    { mode: "cmd", key: "Y", what: "defend here" },
    { mode: "cmd", key: "F", what: "follow me" },
    { mode: "cmd", key: "X", what: "hold fire on / off" },
    { mode: "cmd", key: "R", what: "retreat to a supplied point" },
    { mode: "cmd", key: "J · Shift+J", what: "Harvesters to the deposit at the cursor · all back to work" },
    { mode: "cmd", key: "Z", what: "next formation for group moves (line, wedge, column)" },
    { mode: "cmd", key: "B", what: "build menu of the point (or the selected Constructor's)" },
    { mode: "cmd", key: "LMB · R", when: "placing a building", what: "a building picked in the build menu follows the cursor (green: can go there, red: why not): LMB places it (a Constructor builds it), Shift+LMB several, R / wheel turn it 45°, RMB or Esc cancel" },
    { mode: "cmd", key: "K", what: "LOAD: selected infantry board the Carrier / Mule under the cursor · LIFT: a selected Mule picks up the vehicle under the cursor" },
    { mode: "cmd", key: "U", what: "UNLOAD: selected transports unload and drop their sling load at the cursor" },
    { mode: "cmd", key: "V", what: "new battle group from the selection (standing orders in the side list)" },
    { mode: "cmd", key: "N", what: "switch the selected Relay Tower's jammer" },
    { mode: "cmd", key: "T", what: "SHELL GROUND: selected artillery fires on the spot you click next, no target needed, until another order" },
    { mode: "cmd", key: "C", what: "RECALL: the selected units return to the reserve in 10 s if they stay in a supplied point's call-in zone · the reserve panel: click a unit, then a spot in a call-in zone to deploy it" },
    { mode: "cmd", key: "I", what: "GARRISON: the selected squads go into the own bunker at the point under the cursor (or where they stand) · +25% armour, no attack orders · I again: UNGARRISON" },
    { mode: "cmd", key: "E", what: "CREW: the selected empty vehicles: at base (150 m of the Command Core, a supplied Barracks or a Field Depot) reserve pilots are seated at once; elsewhere the nearest free AI pilot walks to each (PILOT EN ROUTE on the vehicle)" },
    { mode: "cmd", key: "Enter", what: "end a patrol route", when: "the match is over: play again" },
    // ---- calls
    { mode: "calls", key: "Z (hold) + arrows", what: "support calls: type the call's code with the arrow keys (W A S D keep moving you)", in: ["foot", ...SEATS], when: "the arrows type the code only while Z is held" },
    { mode: "calls", key: "LMB", what: "on foot: throw the CALL BEACON in your hand (it flies ~45 m at 45°, bounces and rolls; the call lands where it stops, or on the vehicle / building it sticks to; strafing and bomb runs fly along the throw) · in a vehicle: the vehicle FIRES the beacon at the point under the crosshair (within 300 m; it lands there, bounces a little or sticks)", in: ["foot", ...SEATS], when: "a call armed" },
    { mode: "calls", key: "RMB / Esc / Z", what: "cancel the armed call: the beacon goes back, nothing is spent", in: ["foot", ...SEATS], when: "a call armed" },
    { mode: "calls", key: "K", what: "CALL LOADOUT panel: your call slots, owned calls and what each needs (also LOADOUT on the command view's calls bar and CALL LOADOUT in the pause menu) · changes apply on foot at a supplied Barracks / your Command Core, or while down; picked elsewhere, they apply there by themselves", in: ["foot", ...SEATS] },
    { mode: "calls", key: "Z + ↓ ↓ → →", what: "slot 5 ANTI-ARMOUR (every pilot, fixed): Rocket tube drop: a pod lands at the beacon with a rocket tube and spare rockets; walk onto it to take the tube (weapon slot 2, key 2; 700 explosive, a Lancer in 3 hits) · 90 s cooldown, needs no building", in: ["foot", ...SEATS] },
    { mode: "calls", key: "1 2 3", what: "heavy weapon pod armed: choose its weapon", in: ["foot"], when: "the heavy weapon pod armed" },
    // ---- tools
    { mode: "tools", key: "G", what: "on foot: plant a demo charge on the enemy vehicle or structure in reach", dup: true },
    { mode: "tools", key: "R (hold)", what: "on foot: cloak", dup: true },
    { mode: "tools", key: "N", what: "on foot: drop a decoy beacon (one per life) · on a Dart: scout pulse · command view: a Relay Tower's jammer", dup: true },
    { mode: "tools", key: "E (hold)", what: "revive · hack (on foot) · eject (seated)", dup: true },
    // ---- anywhere
    { mode: "any", key: "Tab", what: "first person ⇄ command view", in: ALL },
    { mode: "any", key: "H", what: "this panel", in: ALL },
    { mode: "any", key: "L · M · O", what: "icon legend · mute · hit-zone debug overlay", in: ALL },
    { mode: "any", key: "P · Shift+P", what: "multiplayer: ping the squad (look / attack here) · need help", in: ALL },
    { mode: "any", key: "Esc", what: "close panels · pause menu", in: ALL },
    { mode: "any", key: "Ctrl+Alt+D", what: "TEST CHEATS (single player / host only): unlock everything, tokens, ore and gas, pilot reserve, instant build, reveal map, god mode, reset progression", in: ALL, when: "with Ctrl and Alt held (plain D moves)" },
];
exports.TIPS = [
    { id: "pilots", mode: "cmd", key: "E", text: "E: crew · pilots are limited" }, // C11 (rulings 47 / 48)
    { id: "calls", mode: "foot", key: "Z (hold) + arrows", text: "Z + arrows, LMB: call beacon" },
    { id: "build", mode: "foot", key: "1 2 3 4 / wheel", text: "4: build tool, LMB opens menu" },
    { id: "prone", mode: "foot", key: "T", text: "T: prone (steady aim, stealth)" },
    { id: "low", mode: "aircraft", key: "Space", text: "Space: low flight, under radar" },
    { id: "garrison", mode: "cmd", key: "I", text: "I: garrison squad in a bunker" },
    { id: "recall", mode: "cmd", key: "C", text: "C: recall units to reserve" },
    { id: "groups", mode: "cmd", key: "V", text: "V: battle group from selection" },
    { id: "transports", mode: "cmd", key: "K", text: "K / U: load · unload transport" },
];
/** The next tip for this mode that has not been shown, or null. */
function nextTip(mode, seen) {
    return mode ? exports.TIPS.find((t) => t.mode === mode && !seen.has(t.id)) ?? null : null;
}
/** The key names a row binds ("F · X · E (hold)" -> F, X, E; modifiers Shift / Ctrl left out). */
function keyNames(k) {
    const parts = k.replace(/\(hold\)/g, "").split(/[·/+,]/).flatMap((x) => x.trim().split(/\s+/));
    return [...new Set(parts.map((x) => x.trim()).filter((x) => x && x !== "…" && !/^(Shift|Ctrl|Alt|and|or|edges|wheel|arrows)$/.test(x)))];
}
/** Per mode (calls / tools / anywhere rows counted in the modes they are live in): keys bound by more than one row. A
 * pair is a real conflict unless one of the rows says when it takes the key over. */
function keyCollisions(rows) {
    const out = [];
    const by = new Map();
    for (const r of rows) {
        if (r.dup)
            continue;
        for (const m of r.in ?? [r.mode])
            for (const k of keyNames(r.key)) {
                const id = `${m}|${k}`;
                (by.get(id) ?? by.set(id, []).get(id)).push(r);
            }
    }
    for (const [id, rs] of by)
        if (rs.length > 1 && rs.filter((r) => !r.when).length > 1) {
            const [mode, key] = id.split("|");
            out.push({ mode: mode, key, rows: rs.map((r) => r.what) });
        }
    return out;
}
/** Per mode, every key and what it does there (the report's table). */
function keysByMode(rows = exports.KEYS) {
    const out = {};
    for (const r of rows) {
        if (r.dup)
            continue;
        for (const m of r.in ?? [r.mode])
            (out[m] ??= []).push({ key: r.key, what: r.what + (r.when ? ` (${r.when})` : "") });
    }
    return out;
}
/** The help panel's HTML: one table per group. */
function helpHtml(rows = exports.KEYS) {
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    return `<div class="label" style="margin-bottom:8px">Controls · H to close</div><div class="cols keys">` + exports.KEY_GROUPS.map(([m, title]) => `<div><h3>${title}</h3><table>${rows.filter((r) => r.mode === m).map((r) => `<tr><td>${esc(r.key)}</td><td>${esc(r.what)}${r.when ? ` <small>(${esc(r.when)})</small>` : ""}</td></tr>`).join("")}</table></div>`).join("") + `</div>`;
}
