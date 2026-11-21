"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.C7aHost = void 0;
const progression_ts_1 = require("../../sim/src/progression.js");
const sim_ts_1 = require("../../sim/src/sim.js");
const profile_ts_1 = require("./profile.js");
class C7aHost {
    /** Loadouts by player slot (validated). */
    loadouts = new Map();
    /** Last apply outcome per player (debug / tests). */
    outcome = new Map();
    posted = new WeakSet();
    /** Handles a C7a message; false for any other message. */
    onMsg(sim, raw) {
        const m = raw;
        if (!m || typeof m !== "object" || (m.t !== "c7aLoadout" && m.t !== "c7aGuest"))
            return false;
        if (!sim?.progRules)
            return true;
        if (m.t === "c7aLoadout") {
            const l = (0, profile_ts_1.guestLoadout)(sim.progRules, m.loadout?.player ?? 0, m.loadout ? { profile: m.loadout.profile, pilotWeapon: m.loadout.pilotWeapon, calls: m.loadout.calls } : null);
            if (l) {
                this.loadouts.set(l.player, l);
                this.apply(sim, l);
            }
            else
                this.outcome.set(m.loadout?.player ?? 0, "refused");
        }
        else {
            const l = (0, profile_ts_1.guestLoadout)(sim.progRules, m.slot, m.payload);
            if (l)
                this.loadouts.set(m.slot, l);
            else {
                this.loadouts.delete(m.slot);
                this.outcome.set(m.slot, m.payload ? "refused" : "none");
            }
        }
        return true;
    }
    /** A guest's pilot exists (guestJoin): its loadout, if it sent one. */
    joined(sim, slot) { const l = this.loadouts.get(slot); if (l)
        this.apply(sim, l); }
    /** applyProfile, then the pilot weapon on a body that already stands (the sim swaps it only at spawn: progOnBody). */
    apply(sim, l) {
        if (sim.fkit) { // Frontline: the kit (fkit.ts) sets the weapons and the call-downs, not the Ironfall profile
            this.outcome.set(l.player, "frontline kit");
            return;
        }
        const r = sim.applyProfile(l);
        this.outcome.set(l.player, r.ok ? "applied" : `refused (${r.reason})`);
        if (!r.ok)
            return;
        for (const p of sim.pilots.values()) {
            if (p.player !== l.player || p.state !== sim_ts_1.P_FOOT)
                continue;
            const s = sim.idToSlot.get(p.entity);
            if (s !== undefined)
                (0, progression_ts_1.progOnBody)(sim, p.id, s);
        }
    }
    /** The production order's player (credit for what it builds; no licence gate since ruling 56). */
    by(sim, pilotId) { return sim.pilot(pilotId)?.player ?? -1; }
    /** After the sim steps: the battle record once, when the match is over. */
    poll(sim, post) {
        if (!sim || this.posted.has(sim))
            return;
        const res = sim.battleResults();
        if (!res)
            return;
        this.posted.add(sim);
        const ranks = {};
        for (const [k, l] of this.loadouts)
            ranks[k] = l.profile.rank;
        post({ t: "c7aResults", results: JSON.parse(JSON.stringify(res)), ranks });
    }
}
exports.C7aHost = C7aHost;
