"use strict";
// Client C9: the fix-qa2 sim features on screen (point structures, garrisons, the reserve, buildings, objectives,
// energy weapons). Pure helpers, so the logic tests can call them.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_GAS_TEXT = exports.UPGRADES = exports.NODE_CAPTURE_NOTE = void 0;
exports.wallYaw = wallYaw;
exports.c9Rules = c9Rules;
exports.nodeTag = nodeTag;
exports.bunkerTag = bunkerTag;
exports.garrisonPlan = garrisonPlan;
exports.callInZones = callInZones;
exports.zoneAt = zoneAt;
exports.reservePanelHtml = reservePanelHtml;
exports.reserveModeHtml = reserveModeHtml;
exports.vehicleDropNote = vehicleDropNote;
exports.bldRules = bldRules;
exports.domeTag = domeTag;
exports.upgradesHtml = upgradesHtml;
exports.driverGravityText = driverGravityText;
exports.driverTag = driverTag;
exports.towerPrompt = towerPrompt;
exports.buildingHackText = buildingHackText;
exports.hackCostNote = hackCostNote;
exports.disabledTag = disabledTag;
exports.objectiveExtra = objectiveExtra;
exports.escortTag = escortTag;
exports.gasPerSecond = gasPerSecond;
exports.energyLine = energyLine;
/** A barricade wall segment is drawn facing away from the point it guards: yaw (the shaders' rot, +x forward) from the
 * nearest point centre to the wall. The sim places the segments side by side across each approach. */
function wallYaw(x, z, points) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < points.length; i++) {
        const d = (points[i].x - x) ** 2 + (points[i].z - z) ** 2;
        if (d < bd) {
            bd = d;
            best = i;
        }
    }
    return best < 0 ? 0 : Math.atan2(z - points[best].z, x - points[best].x);
}
function c9Rules(data) {
    const P = (data.points ?? {});
    const lv = (P.fortification?.levels ?? []).slice().sort((a, b) => a.level - b.level);
    const arm = lv.find((l) => l.armouredControlNode === true);
    const slots = lv.reduce((m, l) => Math.max(m, typeof l.garrisonSlots === "number" ? l.garrisonSlots : 0), 0);
    const lay = P.fortification?.layout ?? {};
    return {
        nodeType: typeof P.controlNode?.building === "string" ? P.controlNode.building : null,
        wallType: typeof lay.wallBuilding === "string" ? lay.wallBuilding : null, bunkerType: typeof lay.bunkerBuilding === "string" ? lay.bunkerBuilding : null,
        armouredFrom: arm ? arm.level : 99, slotsPerBunker: slots || 2,
        garrisonCp: typeof P.garrison?.cpFraction === "number" ? P.garrison.cpFraction : 1, garrisonArmour: typeof P.garrison?.armourBonus === "number" ? P.garrison.armourBonus : 0,
        zone: typeof P.callInZoneRadius === "number" ? P.callInZoneRadius : 150,
    };
}
// ------------------------------------------------------------------ item 1: control nodes, point structures, garrisons
/** The tag over a control node (both views): its hull, shield and armour state. */
function nodeTag(hp, maxHp, shield, armoured, own) {
    const f = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const st = [shield > 0.5 ? `SHIELD ${Math.round(shield)}` : "", armoured ? "ARMOURED · siege guns / artillery do full damage, other weapons a quarter" : ""].filter(Boolean).join(" · ");
    return `CONTROL NODE · ${Math.round(hp)}/${Math.round(maxHp)}${st ? `<small>${st}</small>` : own ? "" : "<small>destroy it to capture by presence</small>"}<i><b style="width:${(f * 100).toFixed(0)}%"></b></i>`;
}
/** The capture bar's note while the player stands in the ring of a point another team holds and its control node stands. */
exports.NODE_CAPTURE_NOTE = "DESTROY THE CONTROL NODE TO CAPTURE · or hack the terminal (hold E)";
/** "BUNKER · GARRISON 1/2": squads garrisoned at the bunker's point, slots there (standing own bunkers x slots each). */
function bunkerTag(garrisoned, slots, own) {
    return own ? `BUNKER · GARRISON ${garrisoned}/${slots}` : "BUNKER";
}
/**
 * The garrison key / button: selected ground units (no aircraft, no structures, not pilots) garrison at a point with an
 * own standing bunker: the point under the cursor if it has one, else the point the units stand at, else the nearest
 * such point. A selection already wholly garrisoned is released instead.
 */
function garrisonPlan(sel, garrisoned, bunkerPoints, cursorPoint, pointAt) {
    const units = sel.filter((u) => u.ok);
    if (!units.length)
        return { ok: false, point: -1, units: [], on: true, text: "GARRISON · select an infantry squad or a ground vehicle (not aircraft)" };
    if (units.every((u) => garrisoned.has(u.id))) {
        const p = garrisoned.get(units[0].id);
        return { ok: true, point: p, units: units.map((u) => u.id), on: false, text: `UNGARRISON · ${units.length} unit${units.length > 1 ? "s" : ""} leave the bunker` };
    }
    if (!bunkerPoints.size)
        return { ok: false, point: -1, units: [], on: true, text: "GARRISON · no own bunker: a chokepoint's prebuilt bunker, or fortify a point to level 2" };
    const cx = units.reduce((a, u) => a + u.x, 0) / units.length, cz = units.reduce((a, u) => a + u.z, 0) / units.length;
    let p = bunkerPoints.has(cursorPoint) ? cursorPoint : pointAt(cx, cz);
    if (!bunkerPoints.has(p)) {
        let bd = Infinity;
        for (const [q, b] of bunkerPoints) {
            const d = Math.hypot(b.x - cx, b.z - cz);
            if (d < bd) {
                bd = d;
                p = q;
            }
        }
    }
    const b = bunkerPoints.get(p), free = Math.max(0, b.slots - b.used);
    return { ok: true, point: p, units: units.filter((u) => !garrisoned.has(u.id)).map((u) => u.id), on: true, text: `GARRISON · ${b.name.toUpperCase()} · ${free} of ${b.slots} slot${b.slots === 1 ? "" : "s"} free (a squad each) · +25% armour, no attack orders` };
}
/** Call-in zones of the team (reserve.ts zoneAt): supplied own points, own Field Depots (2 s drops); on a map without points the own Command Core. */
function callInZones(points, depots, cores, r) {
    const out = depots.map((d) => ({ x: d.x, z: d.z, r, depot: true, name: "Field Depot" }));
    if (points.length)
        for (const p of points) {
            if (p.owned && p.supplied)
                out.push({ x: p.x, z: p.z, r, depot: false, name: p.name });
        }
    else
        for (const c of cores)
            out.push({ x: c.x, z: c.z, r, depot: false, name: "Command Core" });
    return out;
}
/** 2: a depot's zone (the depot's quicker drop), 1: a point's zone, 0: outside every zone. */
function zoneAt(zones, x, z) {
    let best = 0;
    for (const c of zones)
        if (Math.hypot(c.x - x, c.z - z) <= c.r) {
            if (c.depot)
                return 2;
            best = 1;
        }
    return best;
}
/**
 * The reserve panel (command view): capacity, each entry (click to arm its deploy), drops and recalls under way, and a
 * rapid-reinforce button per own point under attack (or its cooldown).
 */
function reservePanelHtml(r, name, dt, attacked, armedK) {
    let h = `<div class="ph">RESERVE ${r.entries.length + r.recalls.length}/${r.cap} · click a unit, then a spot in a call-in zone (${r.rules.dropS.toFixed(0)} s; ${r.rules.depotDropS.toFixed(0)} s at a Field Depot) · C: recall the selection</div>`;
    h += r.entries.length ? r.entries.map((e, k) => e.droppable
        ? `<div class="opt${armedK === k ? " on" : ""}" data-act="c9" data-k="deploy" data-b="0" data-i="${k}"><span class="n">${name(e.type)}</span><span class="c">${Math.round(e.hp * 100)}% hull</span></div>`
        : `<div class="opt no"><span class="n">${name(e.type)}</span><small>cannot be dropped</small></div>`).join("") : `<div class="note">empty · finished units come here when the field is full (unit cap) or a building sends them here</div>`;
    for (const d of r.drops)
        h += `<div class="qi"><span class="n">DROPPING · ${name(d.type)}</span><small>${Math.ceil(d.ticks * dt)} s</small></div>`;
    for (const c of r.recalls)
        h += `<div class="qi"><span class="n">RECALLING · unit ${c.id}</span><small>${Math.ceil(c.ticks * dt)} s</small></div>`;
    for (const p of attacked) {
        const cd = r.rapid[p.index] ?? 0;
        h += cd > 0 ? `<div class="note">RAPID REINFORCE · ${p.name} · cooling down ${Math.ceil(cd * dt)} s</div>`
            : `<button data-act="c9" data-k="rapid" data-b="${p.index}" data-i="0" title="the first droppable reserve unit lands at the point in ${r.rules.rapidS.toFixed(0)} s; then ${r.rules.cooldownS.toFixed(0)} s cooldown">RAPID REINFORCE · ${p.name.toUpperCase()} · ${r.rules.rapidS.toFixed(0)} s</button>`;
    }
    return h;
}
/** The production panel's choice: finished units to the field or into the reserve. */
function reserveModeHtml(building, on) {
    return `<div class="ph2">FINISHED UNITS <span class="lnk${on ? "" : " on"}" data-act="c9" data-k="resMode" data-b="${building}" data-i="0">TO THE FIELD</span> / <span class="lnk${on ? " on" : ""}" data-act="c9" data-k="resMode" data-b="${building}" data-i="1">TO RESERVE</span>${on ? "" : " (the reserve also takes them when the field is full)"}</div>`;
}
/** The Vehicle drop call's line: which reserve vehicle it delivers (ruling 18). */
function vehicleDropNote(r, name, build) {
    if (!r)
        return "";
    const e = r.vehicle >= 0 ? r.entries[r.vehicle] : undefined;
    if (e)
        return `delivers ${name(e.type)} from the reserve (${Math.round(e.hp * 100)}% hull)`;
    // C11 (rulings 57 / 60): none in the reserve: the call builds one at its normal cost (charged when it lands)
    return build ? `builds and drops a ${name(build.type)} · ${build.ore} ore · ${build.gas} gas, paid on landing` : "no ground vehicle in the reserve";
}
exports.UPGRADES = ["armourPlating", "turretRange", "fasterHarvesters", "largerReserve"];
function bldRules(data) {
    const D = data;
    const domes = new Map(), driverMaxG = new Map(), manned = new Map();
    for (const b of D.buildings ?? []) {
        const e = b.effects ?? {};
        if (typeof e.domeRadius === "number" && typeof e.domeShield === "number")
            domes.set(b.id, { r: e.domeRadius, pool: e.domeShield, gas: typeof e.gasPerAbsorbedDamage === "number" ? e.gasPerAbsorbedDamage : 0 });
        if (typeof e.maxPlanetGravity === "number")
            driverMaxG.set(b.id, e.maxPlanetGravity);
        if (b.manned && typeof b.manned.rangeMultiplier === "number")
            manned.set(b.id, { range: b.manned.rangeMultiplier, spread: typeof b.manned.spreadMultiplier === "number" ? b.manned.spreadMultiplier : 1 });
    }
    const C = D.constants ?? {}, mu = C.missionUpgrades ?? {};
    const pct = (m) => `${m < 1 ? "-" : "+"}${Math.round(Math.abs(1 - m) * 100)}%`;
    const what = {
        armourPlating: (u) => `your vehicles take ${pct(u.damageTakenMultiplier ?? 1)} damage`,
        turretRange: (u) => `your turrets reach ${pct(u.rangeMultiplier ?? 1)} further`,
        fasterHarvesters: (u) => `Harvesters drive ${pct(u.speedMultiplier ?? 1)} faster`,
        largerReserve: (u) => `${u.extraReserveSlots ?? 0} more reserve slots`,
    };
    const label = { armourPlating: "Armour plating", turretRange: "Turret range", fasterHarvesters: "Faster harvesters", largerReserve: "Larger reserve" };
    return {
        domes, driverMaxG, manned,
        upgrades: exports.UPGRADES.map((n) => ({ name: n, label: label[n], gas: typeof mu[n]?.gas === "number" ? mu[n].gas : -1, what: mu[n] ? what[n](mu[n]) : "" })),
        reach: typeof C.crew?.enterRangeMetres === "number" ? C.crew.enterRangeMetres : 3,
        hackS: typeof D.points?.capture?.hackSeconds === "number" ? D.points.capture.hackSeconds : 12,
        disableS: typeof C.pilot?.hackBuildingDisableSeconds === "number" ? C.pilot.hackBuildingDisableSeconds : 0,
        hackEnergyPerS: typeof C.pilot?.hackTool?.energyPerSecond === "number" ? C.pilot.hackTool.energyPerSecond : 0,
    };
}
/** The tag over a Shield Projector: the dome's points, its gas cost and whether it is absorbing, empty of gas or off. */
function domeTag(left, max, gasPer, absorbing, teamGas, off, own) {
    const f = max > 0 ? Math.max(0, Math.min(1, left / max)) : 0;
    const st = typeof off === "string" ? off : off ? "OFF · unsupplied or hacked" : own && teamGas < gasPer ? "NO GAS · the dome absorbs nothing" : absorbing ? `ABSORBING · ${gasPer} gas per point of damage` : `${gasPer} gas per point absorbed`;
    return `SHIELD DOME · ${Math.round(left)}/${Math.round(max)}<small>${st}</small><i><b style="width:${(f * 100).toFixed(0)}%"></b></i>`;
}
/** The Tech Lab's panel: each upgrade with its cost and state (owned, buy, not enough gas); keys 1-4 in first person. */
function upgradesHtml(R, owned, gas, lab, fp) {
    return `<div class="ph2">MISSION UPGRADES · once each, for gas</div>` + R.upgrades.filter((u) => u.gas >= 0).map((u, i) => {
        const has = owned.includes(u.name), short = gas + 1e-9 < u.gas;
        return `<div class="opt ${has || short ? "no" : ""}" data-act="c9" data-k="upgrade" data-b="${lab}" data-i="${exports.UPGRADES.indexOf(u.name)}"><span class="k">${i + 1}</span><span class="n">${u.label}</span><span class="c"><span class="${short && !has ? "short" : ""}">${u.gas} gas</span></span><small>${has ? "OWNED · " : short ? "not enough gas · " : ""}${u.what}</small></div>`;
    }).join("") + (fp ? `<div class="note">1-${R.upgrades.filter((u) => u.gas >= 0).length} buy · B / Esc close</div>` : "");
}
/** The build menu's Mass Driver line on a planet above its gravity limit (fix-qa2, doc 8). */
function driverGravityText(maxG, planetG) { return `only on low-gravity worlds (${maxG} g or below; this planet ${planetG} g)`; }
/** The Mass Driver's tag: its pair (an ore drop-off for Harvesters) or what it still needs. */
function driverTag(pairedWith) {
    return pairedWith ? `MASS DRIVER · paired with ${pairedWith}<small>Harvesters drop ore here: 100-ore pods, arrive at once</small>` : `MASS DRIVER · unpaired<small>build a second one on another point</small>`;
}
/** The first-person prompt at an own mannable tower, and the line while manning it. */
function towerPrompt(name, m, manning) {
    return manning ? `MANNING THE ${name.toUpperCase()} · the tower fires with range ×${m.range}, spread ×${m.spread} · your weapon fires from beside it · F leave`
        : `F · MAN THE ${name.toUpperCase()} · range ×${m.range}, spread ×${m.spread} · you stay beside it, exposed`;
}
/** The hold-E prompt at an enemy building (hack: disabled for disableS seconds; ruling 17 hack-tool energy). */
function buildingHackText(name, R, progress, held, energy) {
    const cost = Math.round(R.hackS * R.hackEnergyPerS);
    if (held || progress > 0)
        return `HACKING THE ${name.toUpperCase()} · ${Math.round(progress * 100)}% · ${R.hackEnergyPerS} energy/s${energy <= 0.5 ? " · NO ENERGY: the hack stops" : ""}`;
    return `HOLD E TO HACK THE ${name.toUpperCase()} · ${R.hackS} s, ${cost} energy (you have ${Math.floor(energy)}) · disabled ${R.disableS} s`;
}
/** Hack energy cost appended to the point / Core hack prompt (ruling 17). */
function hackCostNote(R, energy) {
    return R.hackEnergyPerS > 0 ? ` · ${Math.round(R.hackS * R.hackEnergyPerS)} energy (${R.hackEnergyPerS}/s; you have ${Math.floor(energy)})` : "";
}
/** "DISABLED · 42 s" over a hacked building. */
function disabledTag(seconds) { return `DISABLED · ${seconds} s<small>hacked: production, turrets and dome off</small>`; }
// ------------------------------------------------------------------ item 4: the fix-qa2 missions
/** The objectives panel's detail for the new types, with what only the sidecar knows (shipped totals, the escort's hull). */
function objectiveExtra(type, detail, def, constants, side, escortHull, routeName) {
    const O = (constants.objectives ?? {});
    if (type === "extractionQuota") {
        const qo = def?.ore ?? O.extractionQuota?.ore ?? 0, qg = def?.gas ?? O.extractionQuota?.gas ?? 0, ex = side?.exported ?? [0, 0];
        return `shipped ${Math.floor(ex[0])}/${qo} ore · ${Math.floor(ex[1])}/${qg} gas · at the Launch Pad uplink (its panel)`;
    }
    if (type === "escort") {
        const e = side?.escort[0];
        if (!e)
            return detail;
        const next = e.leg < e.route.length ? `next: ${routeName(e.route[e.leg])}` : "route done";
        const conv = e.need !== undefined ? ` · convoy ${e.arrived ?? 0} of ${e.need} arrived (${e.alive ?? 0} left)` : ""; // C11 (ruling 63)
        return `${detail} · ${next}${escortHull !== null ? ` · hull ${Math.round(escortHull * 100)}%` : " · out of sight"}${conv}`;
    }
    return detail;
}
/** The tag over the escorted unit. */
function escortTag(name, hull, next) {
    return `ESCORT · ${name} · ${Math.round(hull * 100)}%${next ? `<small>next: ${next}</small>` : ""}<i><b style="width:${(Math.max(0, Math.min(1, hull)) * 100).toFixed(0)}%"></b></i>`;
}
// ------------------------------------------------------------------ item 5: energy weapons spend gas (fix-qa2 item d)
/** Gas per second while firing the given weapons (gasPerShot x shots per second; weapon period = 1 / shots per second). */
function gasPerSecond(weapons, wGas, wPeriod) {
    let g = 0;
    for (const w of weapons)
        if (w >= 0 && wGas[w] > 0 && wPeriod[w] > 0)
            g += wGas[w] / wPeriod[w];
    return g;
}
exports.NO_GAS_TEXT = "NO GAS: energy weapons offline";
/** The weapons panel's energy line for the vehicle the player fires from (empty: no energy weapon). */
function energyLine(gasPerS, minShot, teamGas) {
    if (gasPerS <= 0)
        return "";
    return teamGas + 1e-9 < minShot ? `<div class="nogas">${exports.NO_GAS_TEXT} · they fire again as soon as the team has gas</div>`
        : `<div class="note gas">ENERGY WEAPONS · ${gasPerS.toFixed(gasPerS < 1 ? 2 : 1)} gas/s while firing · team gas ${Math.floor(teamGas)} (${Math.floor(teamGas / gasPerS)} s of fire)</div>`;
}
