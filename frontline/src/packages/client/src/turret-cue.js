"use strict";
// F1 (designer playtest 15 Nov: "it didn't turn to fire at me ... there should be some type of animation that has to occur
// prior to firing in my direction"). The sim now traverses every AI turret and holds a structure's first shot for a wind-up
// after it picks a new target; the snapshot's AIM records carry the real barrel yaw. This module turns those records into
// the warning a player sees and hears, with no new wire data:
//  * SPOT: an enemy structure's AIM record appears (it has a target, or its barrel left rest), or a turret that sat still
//    starts to slew again: a servo whine at the turret, and the laser-dot line from its muzzle along the barrel starts.
//  * LOCK: the spotted barrel stops turning (two snapshots within LOCK_DEG): a lock tone; the laser burns brighter until
//    LASER_AFTER_LOCK_S after the lock (about the wind-up: the first shot follows).
// Pure logic (no DOM, audio or WebGL) so the Node logic tests read it directly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurretCues = exports.TURRET_CUE = void 0;
exports.TURRET_CUE = {
    /** a barrel that turned less than this between two snapshots is still (degrees; AIM records are 1/256 turn = 1.4 deg) */
    lockDeg: 1.5,
    /** seconds a turret must have been still (or without a record) before a new slew counts as a new spot */
    restS: 1.5,
    /** laser after the lock, and the longest a spot without a lock keeps it (s) */
    laserAfterLockS: 1.0, laserMaxS: 6,
    /** sounds (sound-table.ts CUES) */
    spotCue: "turret-servo", lockCue: "turret-lock",
};
const wrap = (a) => { let d = a % (Math.PI * 2); if (d > Math.PI)
    d -= Math.PI * 2; if (d < -Math.PI)
    d += Math.PI * 2; return d; };
class TurretCues {
    tr = new Map();
    spots = 0;
    locks = 0;
    /**
     * One decoded snapshot at time now (s): aims = its AIM records (id -> yaw), watched(id) = an enemy structure turret the
     * viewer should be warned about. Returns the cues to play.
     */
    update(now, aims, watched) {
        const out = [], C = exports.TURRET_CUE, lock = (C.lockDeg * Math.PI) / 180;
        for (const [id, yaw] of aims) {
            if (!watched(id))
                continue;
            let t = this.tr.get(id);
            if (!t) {
                t = { yaw, stillSince: -1e9, spotAt: -1e9, lockAt: -1e9, seen: -1e9 };
                this.tr.set(id, t);
            } // new: a spot
            const moved = Math.abs(wrap(yaw - t.yaw)) > lock, fresh = now - t.seen > C.restS;
            const resting = fresh || now - t.stillSince > C.restS;
            if (fresh || (moved && resting && !this.active(id, now))) {
                t.spotAt = now;
                t.lockAt = -1e9;
                out.push({ id, kind: "spot" });
                this.spots++;
            }
            if (!moved && t.spotAt > t.lockAt && now - t.spotAt > 0.05) {
                t.lockAt = now;
                out.push({ id, kind: "lock" });
                this.locks++;
            }
            if (moved)
                t.stillSince = now;
            t.yaw = yaw;
            t.seen = now;
        }
        for (const [id, t] of this.tr)
            if (now - t.seen > 30)
                this.tr.delete(id);
        return out;
    }
    /** Laser strength for turret id at time now: 0 none, 0.5 while it slews toward its target, 1 locked (wind-up). */
    laser(id, now) {
        const t = this.tr.get(id), C = exports.TURRET_CUE;
        if (!t || now - t.seen > 0.6)
            return 0;
        if (t.lockAt >= t.spotAt)
            return now - t.lockAt <= C.laserAfterLockS ? 1 : 0;
        return now - t.spotAt <= C.laserMaxS ? 0.5 : 0;
    }
    active(id, now) { return this.laser(id, now) > 0; }
    clear() { this.tr.clear(); }
}
exports.TurretCues = TurretCues;
