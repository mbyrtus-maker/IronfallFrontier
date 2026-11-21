"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pilotMoveRules = pilotMoveRules;
exports.pilotMoveStep = pilotMoveStep;
exports.vehicleMoveRules = vehicleMoveRules;
exports.vehicleMoveStep = vehicleMoveStep;
// w2f: own-pilot prediction support (design doc 22: a guest predicts its own pilot and reconciles with the host).
//
// pilotMoveStep is the sim's on-foot movement for one tick (Sim.pilotSteer + pilotkit kitPilotVelocity + the jump /
// jetpack / gravity part of Sim.pilotVertical) as a pure function: same order of operations, same deterministic
// trigonometry (fmath dsin / dcos), so on open ground it gives the host's position exactly. Not modelled (the host's
// correction covers them): separation from other bodies and structures, the map edge clamp (applied), fall damage,
// being pushed or hit. The guest keeps its unacknowledged inputs (PilotControlInput.clientSeq), and on each snapshot
// takes the host's own-body position (DecodedPilot.kit.x / z at 1 mm, or the entity record), drops the inputs up to
// DecodedPilot.inputSeq, and replays the rest through pilotMoveStep.
// Browser safe: no Node imports.
const fmath_ts_1 = require("./fmath.js");
const data_ts_1 = require("./data.js");
const pilotkit_ts_1 = require("./pilotkit.js");
/** Movement rules from the game data for a planet (mapSize: the match's map, for the edge clamp). */
function pilotMoveRules(data, planetId, mapSize) {
    const d = (0, data_ts_1.compileData)(data, planetId), c = d.crew;
    if (!c || d.pilotType < 0)
        throw new Error("pilotMoveRules: the data has no pilot / crew rules");
    const k = (0, pilotkit_ts_1.compileKitRules)(d);
    return {
        dt: d.dt, mapSize, speed: d.tSpeed[d.pilotType], sprintMul: c.sprintMul, crouchMul: c.crouchMul, proneMul: c.proneMul, accel: k ? k.accel : 0, decel: k ? k.decel : 0,
        jumpSpeed: c.jumpSpeed, gravity: d.gravity, jetThrust: c.jetThrust, jetMaxRise: c.jetMaxRise, jetFreeBurn: c.jetFreeBurnSeconds,
        jetRechargePerTick: c.jetRechargePerTick, jetEnergyPerSecond: c.jetEnergyPerSecond,
    };
}
/** One tick of the pilot's own movement (pure: returns a new state). ground(x, z): ground height under the body. */
function pilotMoveStep(R, s, inp, ground, canStep) {
    let mv = inp.move < -1 ? -1 : inp.move > 1 ? 1 : inp.move, st = inp.strafe < -1 ? -1 : inp.strafe > 1 ? 1 : inp.strafe;
    const l = Math.sqrt(mv * mv + st * st);
    if (l > 1) {
        mv /= l;
        st /= l;
    }
    const dt = R.dt, fx = (0, fmath_ts_1.dcos)(inp.aimYaw), fz = (0, fmath_ts_1.dsin)(inp.aimYaw);
    let speed = R.speed;
    if (s.airborne === 0)
        speed *= inp.prone ? R.proneMul : inp.crouch ? R.crouchMul : inp.sprint ? R.sprintMul : 1;
    const wx = (fx * mv - fz * st) * speed, wz = (fz * mv + fx * st) * speed;
    let nvx = wx, nvz = wz;
    if (R.accel > 0 && R.decel > 0) {
        const dx = wx - s.vx, dz = wz - s.vz;
        const rate = (wx * wx + wz * wz >= s.vx * s.vx + s.vz * s.vz ? R.accel : R.decel) * dt;
        const l2 = dx * dx + dz * dz;
        if (l2 > rate * rate) {
            const k = rate / Math.sqrt(l2);
            nvx = s.vx + dx * k;
            nvz = s.vz + dz * k;
        }
    }
    let nx = s.x + nvx * dt, nz = s.z + nvz * dt;
    nx = Math.min(R.mapSize, Math.max(0, nx));
    nz = Math.min(R.mapSize, Math.max(0, nz));
    if (canStep && s.airborne === 0 && !canStep(s.x, s.z, nx, nz)) { // T1: relief walls (as the sim: slide on one axis)
        if (canStep(s.x, s.z, nx, s.z))
            nz = s.z;
        else if (canStep(s.x, s.z, s.x, nz))
            nx = s.x;
        else {
            nx = s.x;
            nz = s.z;
        }
    }
    // vertical (Sim.pilotVertical without fall damage)
    const g = ground(nx, nz);
    let air = s.airborne, vy = s.vy, y = s.y, fuel = s.jetFuel, energy = s.energy, burning = false;
    if (air === 0 && !inp.prone) {
        if (inp.jump) {
            vy = R.jumpSpeed;
            air = 1;
        }
        else if (inp.jet && (fuel > 0 || energy > 0)) {
            vy = 0;
            air = 1;
        }
    }
    if (air !== 0) {
        if (inp.jet) {
            if (fuel > 0) {
                fuel = Math.max(0, fuel - dt);
                burning = true;
            }
            else if (energy > 0) {
                energy = Math.max(0, energy - R.jetEnergyPerSecond * dt);
                burning = true;
            }
        }
        const acc = (burning ? R.jetThrust : 0) - R.gravity;
        y = y + vy * dt + 0.5 * acc * dt * dt;
        vy += acc * dt;
        if (burning && vy > R.jetMaxRise)
            vy = R.jetMaxRise;
        if (y <= g) {
            y = g;
            vy = 0;
            air = 0;
        }
    }
    else {
        y = g;
        vy = 0;
    }
    if (!burning && fuel < R.jetFreeBurn) {
        const v = fuel + R.jetRechargePerTick;
        fuel = v > R.jetFreeBurn ? R.jetFreeBurn : v;
    }
    return { x: nx, y, z: nz, vx: (nx - s.x) / dt, vz: (nz - s.z) / dt, vy, airborne: air, jetFuel: fuel, energy };
}
// ------------------------------------------------------------------ ruling 112: the own hover vehicle
//
// vehicleMoveStep is the sim's driven hover-vehicle movement for one tick (Sim.boostStep + controlSteer + turnToward +
// hoverVel + hopStep) as a pure function, same order and arithmetic, so on open ground it gives the host's state exactly.
// Not modelled (the host's correction covers them): separation from other bodies and structures, impassable terrain
// cells, terrain-layer and weather speed factors, the driver's progression speed bonus, EMP. The guest replays its
// unacknowledged inputs from the host's own-vehicle state (DecodedPilot.ride, snapshot v28).
const planet_ts_1 = require("./planet.js");
/** Movement rules of hover vehicle type typeId (units.json handling) or walker (W1: units.json walker) on a planet; null if it has neither. */
function vehicleMoveRules(data, planetId, mapSize, typeId) {
    const d = (0, data_ts_1.compileData)(data, planetId), t = d.typeIds.indexOf(typeId);
    if (t < 0 || t >= d.unitCount)
        return null;
    const walk = d.tWalk[t] === 1;
    if (!walk && (d.tHover[t] !== 1 || !d.hover))
        return null;
    const pl = (0, planet_ts_1.compilePlanetRules)(data, planetId), H = d.hover ?? { stopSpeed: 0, overspeedRatio: 1, overspeedBrake: 0, jumpCooldownTicks: 0, bounce: 0 };
    return {
        dt: d.dt, mapSize, speed: d.tSpeed[t] * (d.tVehicle[t] && !d.tAir[t] ? pl.hoverSpeed : 1), cosTurn: d.tCosTurn[t], sinTurn: d.tSinTurn[t],
        accel: d.tAccel[t], drag: d.tDrag[t], jump: d.tJump[t], gravity: d.gravity,
        boostMul: d.tBoostMul[t], boostDrain: d.tBoostDrain[t], boostFill: d.tBoostFill[t], boostMin: d.tBoostMin[t],
        stopSpeed: H.stopSpeed, overspeedRatio: H.overspeedRatio, overspeedBrake: H.overspeedBrake, jumpCooldownTicks: H.jumpCooldownTicks,
        bounce: H.bounce,
        walk, walkAccel: d.tWalkAccel[t], walkBrake: d.tWalkBrake[t], walkReverse: d.tWalkReverse[t],
    };
}
/** One tick of the own hover vehicle (pure: returns a new state). ground(x, z): ground height. */
function vehicleMoveStep(R, s, inp, ground, canStep) {
    let th = inp.move < -1 ? -1 : inp.move > 1 ? 1 : inp.move, st = inp.strafe < -1 ? -1 : inp.strafe > 1 ? 1 : inp.strafe;
    const l0 = Math.sqrt(th * th + st * st);
    if (l0 > 1) {
        th /= l0;
        st /= l0;
    }
    const dt = R.dt;
    // boost meter (Sim.boostStep)
    let m = s.boostM, on = s.boostOn;
    if (R.boostMul > 0) {
        if (inp.sprint && th > 0 && m > 0 && (on === 1 || m >= R.boostMin)) {
            m -= R.boostDrain;
            on = m > 0 ? 1 : 0;
            if (m < 0)
                m = 0;
        }
        else {
            on = 0;
            m += R.boostFill;
            if (m > 1)
                m = 1;
        }
    }
    // hull turn (Sim.turnToward toward the aim yaw)
    const ax = (0, fmath_ts_1.dcos)(inp.aimYaw), az = (0, fmath_ts_1.dsin)(inp.aimYaw);
    let fx = s.dirX, fz = s.dirZ;
    if (fx * ax + fz * az >= R.cosTurn) {
        fx = ax;
        fz = az;
    }
    else {
        const sn = (fx * az - fz * ax) >= 0 ? R.sinTurn : -R.sinTurn;
        const rx = fx * R.cosTurn - fz * sn, rz = fx * sn + fz * R.cosTurn, l = Math.sqrt(rx * rx + rz * rz);
        fx = rx / l;
        fz = rz / l;
    }
    const step = R.speed * dt * (on ? R.boostMul : 1);
    if (R.walk) { // W1: a walker (Sim.controlSteer projected on the hull, Sim.walkVel; no hop)
        const cx = s.x + (fx * th - fz * st) * step, cz = s.z + (fz * th + fx * st) * step;
        let wF = ((cx - s.x) * fx + (cz - s.z) * fz) / dt;
        if (wF < 0)
            wF *= R.walkReverse;
        let v = Math.sqrt(s.vx * s.vx + s.vz * s.vz);
        if (s.vx * fx + s.vz * fz < 0)
            v = -v;
        const up = (wF > 0 ? wF > v && v >= 0 : wF < v && v <= 0);
        const k = (up ? R.walkAccel : R.walkBrake) * dt, dv = wF - v;
        let wv = dv > k ? v + k : dv < -k ? v - k : wF;
        let nx = s.x + fx * wv * dt, nz = s.z + fz * wv * dt;
        nx = Math.min(R.mapSize, Math.max(0, nx));
        nz = Math.min(R.mapSize, Math.max(0, nz));
        if (canStep && !canStep(s.x, s.z, nx, nz)) {
            if (canStep(s.x, s.z, nx, s.z))
                nz = s.z;
            else if (canStep(s.x, s.z, s.x, nz))
                nx = s.x;
            else {
                nx = s.x;
                nz = s.z;
            }
        }
        const fwd = ((nx - s.x) * fx + (nz - s.z) * fz) / dt;
        if (wv > 0 && fwd < wv)
            wv = fwd > 0 ? fwd : 0;
        else if (wv < 0 && fwd > wv)
            wv = fwd < 0 ? fwd : 0;
        return { x: nx, y: ground(nx, nz), z: nz, dirX: fx, dirZ: fz, vx: fx * wv, vz: fz * wv, hopH: 0, vy: 0, hopLeft: 0, boostM: m, boostOn: on };
    }
    // wanted velocity (Sim.controlSteer, as a position step and back) and momentum (Sim.hoverVel, a player's vehicle)
    const wX = ((s.x + (fx * th - fz * st) * step) - s.x) / dt, wZ = ((s.z + (fz * th + fx * st) * step) - s.z) / dt;
    let vx = s.vx, vz = s.vz;
    const dx = wX - vx, dz = wZ - vz, l2 = dx * dx + dz * dz;
    if (l2 !== 0) {
        const acc = R.accel * dt, w2 = wX * wX + wZ * wZ, l = Math.sqrt(l2);
        let rate = acc;
        if (w2 === 0)
            rate = R.drag * dt * l;
        else if (vx * vx + vz * vz > w2 * R.overspeedRatio * R.overspeedRatio && vx * wX + vz * wZ > 0) {
            const r = R.drag * dt * l + R.overspeedBrake * acc;
            if (r < rate)
                rate = r;
        }
        if (l <= rate || l <= R.stopSpeed) {
            vx = wX;
            vz = wZ;
        }
        else {
            const k = rate / l;
            vx += dx * k;
            vz += dz * k;
        }
    }
    let nx = s.x + vx * dt, nz = s.z + vz * dt;
    nx = Math.min(R.mapSize, Math.max(0, nx));
    nz = Math.min(R.mapSize, Math.max(0, nz));
    if (nx <= 0 || nx >= R.mapSize)
        vx = 0;
    if (nz <= 0 || nz >= R.mapSize)
        vz = 0;
    if (canStep && !(s.hopH > 0 && s.y > ground(nx, nz) + 0.5) && !canStep(s.x, s.z, nx, nz)) { // T1: relief walls (the sim's slide and bounce; a hop clears low lips)
        const b = -R.bounce;
        if (canStep(s.x, s.z, nx, s.z)) {
            nz = s.z;
            vz *= b;
        }
        else if (canStep(s.x, s.z, s.x, nz)) {
            nx = s.x;
            vx *= b;
        }
        else {
            nx = s.x;
            nz = s.z;
            vx *= b;
            vz *= b;
        }
    }
    // hop (Sim.hopStep)
    let h = s.hopH, vy = s.vy, left = s.hopLeft > 0 ? s.hopLeft - 1 : 0;
    if (!(h === 0 && vy === 0) || (inp.jump && R.jump > 0 && s.hopLeft <= 0)) {
        if (h === 0 && vy === 0) {
            vy = R.jump;
            left = R.jumpCooldownTicks - 1;
        }
        h += vy * dt - 0.5 * R.gravity * dt * dt;
        vy -= R.gravity * dt;
        if (h <= 0) {
            h = 0;
            vy = 0;
        }
    }
    return { x: nx, y: ground(nx, nz) + h, z: nz, dirX: fx, dirZ: fz, vx, vz, hopH: h, vy, hopLeft: left, boostM: m, boostOn: on };
}
