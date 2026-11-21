"use strict";
// First-person aim (client slice 2, playtest item 8): aim assist and convergence. Pure functions, no DOM.
//
// Aim assist: of the enemies in front, the one whose direction from the camera is nearest the reticle ray wins if
// it lies inside a small cone: ASSIST_BASE_DEG plus the target's own angular radius (so near and large targets get
// a wider cone), at most ASSIST_MAX_DEG. The turret then aims at that unit's centre with first-order lead for the
// weapon's projectile speed (and the low ballistic arc for shells). Without a target the turret converges on the
// terrain / sky point under the reticle, never nearer than MIN_CONVERGENCE_M, and never below the line from the
// muzzle to the horizon point ahead (so a vehicle's shots do not go into the ground just in front of it).
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOOR_LOOK_DOWN_DEG = exports.FOOT_ASSIST_MAX_DEG = exports.FOOT_ASSIST_BASE_DEG = exports.MIN_CONVERGENCE_M = exports.ASSIST_MAX_DEG = exports.ASSIST_BASE_DEG = void 0;
exports.pickAssistTarget = pickAssistTarget;
exports.leadAim = leadAim;
exports.convergeAim = convergeAim;
exports.arcPitch = arcPitch;
exports.ASSIST_BASE_DEG = 3;
exports.ASSIST_MAX_DEG = 12;
exports.MIN_CONVERGENCE_M = 25; // ruling 109 (was 90: a nearer reticle point was missed)
/** Client slice 3: the pilot on foot gets a smaller cone (and none while scoped). */
exports.FOOT_ASSIST_BASE_DEG = 1.2;
exports.FOOT_ASSIST_MAX_DEG = 5;
/** The assist target for the reticle ray (eye, unit dir d), or null. `maxDist`: beyond it nothing is assisted. */
function pickAssistTarget(eye, d, cands, maxDist, baseDeg = exports.ASSIST_BASE_DEG, maxDeg = exports.ASSIST_MAX_DEG, minDist = 12) {
    let best = null, bestScore = 1;
    for (const c of cands) {
        const vx = c.x - eye[0], vy = c.y - eye[1], vz = c.z - eye[2];
        const dist = Math.hypot(vx, vy, vz);
        if (dist < minDist || dist > maxDist)
            continue;
        const cos = (vx * d[0] + vy * d[1] + vz * d[2]) / dist;
        if (cos <= 0)
            continue;
        const ang = (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
        const cone = Math.min(maxDeg, baseDeg + (Math.atan2(c.radius, dist) * 180) / Math.PI);
        const score = ang / cone;
        if (score < bestScore) {
            bestScore = score;
            best = { id: c.id, angleDeg: ang, coneDeg: cone, dist };
        }
    }
    return best;
}
/**
 * Yaw / pitch from the muzzle m to hit a target at p moving with horizontal velocity (vx, vz): first-order
 * intercept for a straight shot of `speed` (hitscan: speed <= 0, no lead), or the low arc to the intercept point
 * for a ballistic shell (iterated three times). Null if no solution (out of reach).
 */
function leadAim(m, p, vx, vz, speed, ballistic, gravity) {
    let ax = p[0], ay = p[1], az = p[2], t = 0;
    if (speed > 0 && !ballistic) {
        const rx = ax - m[0], ry = ay - m[1], rz = az - m[2];
        const a = vx * vx + vz * vz - speed * speed, b = 2 * (rx * vx + rz * vz), c = rx * rx + ry * ry + rz * rz;
        if (Math.abs(a) < 1e-9)
            t = b < 0 ? -c / b : -1;
        else {
            const disc = b * b - 4 * a * c;
            if (disc < 0)
                return null;
            const sq = Math.sqrt(disc), t1 = (-b - sq) / (2 * a), t2 = (-b + sq) / (2 * a);
            t = t1 > 0 && (t2 <= 0 || t1 < t2) ? t1 : t2;
        }
        if (!(t > 0))
            return null;
        ax += vx * t;
        az += vz * t;
    }
    if (ballistic && speed > 0) {
        let yaw = 0, pitch = 0;
        for (let it = 0; it < 3; it++) {
            const dx = ax - m[0], dz = az - m[2], hd = Math.hypot(dx, dz), dy = ay - m[1];
            const v2 = speed * speed, disc = v2 * v2 - gravity * (gravity * hd * hd + 2 * dy * v2);
            if (disc < 0 || hd < 1e-6)
                return null;
            const tan = (v2 - Math.sqrt(disc)) / (gravity * hd);
            pitch = Math.atan(tan);
            yaw = Math.atan2(dz, dx);
            t = hd / (speed * Math.cos(pitch));
            ax = p[0] + vx * t;
            az = p[2] + vz * t;
        }
        return { yaw, pitch, t, point: [ax, ay, az] };
    }
    const dx = ax - m[0], dy = ay - m[1], dz = az - m[2];
    return { yaw: Math.atan2(dz, dx), pitch: Math.atan2(dy, Math.hypot(dx, dz)), t, point: [ax, ay, az] };
}
/** Ruling 131: looking down more than this (the reticle deliberately on the ground) lifts the horizon floor. */
exports.FLOOR_LOOK_DOWN_DEG = 6;
/**
 * No assist target: aim from the muzzle m at the reticle point (eye + d * dist, dist clamped to
 * [MIN_CONVERGENCE_M, maxDist]), with the pitch kept at or above the line to the horizon point: the terrain a
 * weapon range ahead along the camera's yaw, 1.5 m up. `groundAt(x, z)`: terrain height.
 * Ruling 131: the floor applies only while the view looks down less than FLOOR_LOOK_DOWN_DEG (a tall walker's chin guns
 * must reach the ground the player looks down at, close in); a shell (`shell`: muzzle speed, gravity) gets the low arc
 * to the reticle point (45 degrees, its longest reach, beyond it), never the straight line (it fell far short) or the floor.
 */
function convergeAim(m, eye, d, hitDist, maxDist, range, groundAt, shell) {
    const t = Math.max(exports.MIN_CONVERGENCE_M, Math.min(maxDist, hitDist > 0 ? hitDist : maxDist));
    const P = [eye[0] + d[0] * t, eye[1] + d[1] * t, eye[2] + d[2] * t];
    const dx = P[0] - m[0], dz = P[2] - m[2];
    const yaw = Math.atan2(dz, dx);
    if (shell)
        return { yaw, pitch: arcPitch(m, P, shell.speed, shell.gravity), point: P, floored: false };
    let pitch = Math.atan2(P[1] - m[1], Math.hypot(dx, dz));
    const hl = Math.hypot(d[0], d[2]) || 1, hx = m[0] + (d[0] / hl) * range, hz = m[2] + (d[2] / hl) * range;
    const floor = Math.atan2(groundAt(hx, hz) + 1.5 - m[1], range);
    const lookingDown = d[1] < -Math.sin((exports.FLOOR_LOOK_DOWN_DEG * Math.PI) / 180);
    const floored = !lookingDown && pitch < floor;
    if (floored)
        pitch = floor;
    return { yaw, pitch, point: P, floored };
}
/** Ruling 131: launch pitch of the low arc from m to the point p for a shell of `speed` (45 degrees when out of reach). */
function arcPitch(m, p, speed, gravity) {
    const sol = leadAim(m, p, 0, 0, speed, true, gravity);
    return sol ? sol.pitch : Math.PI / 4;
}
