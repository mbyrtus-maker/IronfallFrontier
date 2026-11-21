"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.c9Side = c9Side;
const bldfx_ts_1 = require("../../sim/src/bldfx.js");
const reserve_ts_1 = require("../../sim/src/reserve.js");
const sim_ts_1 = require("../../sim/src/sim.js");
/** The sidecar for team `team` (the page's and the guests' side). */
function c9Side(s, team) {
    const d = s.d, out = { t: "c9", tick: s.tick, team, reserve: null, nodes: [], garrison: [], domes: [], upgrades: [], manned: [], hacks: [], exported: [0, 0], hacksDone: 0, escort: [], ground: [], low: [], squads: { n: 0, cap: -1, per: 0 }, decay: [] };
    const R = s.resRules;
    if (R) {
        const res = s.res, tr = 1 / d.dt;
        const nP = s.pts ? s.pts.n : 0;
        out.reserve = {
            cap: (res ?? new reserve_ts_1.Reserve(R, nP)).capacity(s, team), // a detached Reserve: the sim creates its own on first use (its hash is unchanged until then)
            entries: (res?.entries[team] ?? []).map((e) => {
                const full = d.tHp[e.type] * Math.max(1, d.tSquadSize[e.type]);
                return { type: e.type, hp: full > 0 ? Math.min(1, e.hp.reduce((a, b) => a + b, 0) / full) : 1, droppable: R.droppable[e.type] === 1 };
            }),
            drops: (res?.drops ?? []).filter((dr) => dr.team === team).map((dr) => ({ type: dr.e.type, x: dr.x, z: dr.z, ticks: Math.max(0, dr.tick - s.tick) })),
            recalls: (res?.recalls ?? []).filter((r) => r.team === team).map((r) => ({ id: r.id, ticks: Math.max(0, r.tick - s.tick) })),
            mode: res ? [...res.mode].filter((id) => { const sl = s.idToSlot.get(id); return sl !== undefined && s.team[sl] === team; }).sort((a, b) => a - b) : [],
            rapid: Array.from({ length: nP }, (_, p) => (res && res.rapid[p] > s.tick ? res.rapid[p] - s.tick : 0)),
            vehicle: s.reserveVehicle(team),
            rules: { dropS: R.dropTicks / tr, depotDropS: R.depotDropTicks / tr, recallS: R.recallTicks / tr, rapidS: R.rapidDropTicks / tr, cooldownS: R.rapidCooldownTicks / tr, zone: R.zone },
        };
    }
    const sp = s.sp;
    if (sp)
        for (const id of sp.node) {
            if (id <= 0)
                continue;
            const sl = s.idToSlot.get(id);
            if (sl !== undefined && s.alive[sl])
                out.nodes.push({ id, shield: s.shield[sl], armoured: sp.armoured.has(id) });
        }
    if (sp)
        for (const [q, p] of sp.garrison) {
            const sq = s.squads.get(q);
            const ids = sq ? sq.members.filter((id) => { const sl = s.idToSlot.get(id); return sl !== undefined && s.alive[sl] && s.team[sl] === team; }) : [];
            if (ids.length)
                out.garrison.push({ point: p, squad: q, ids });
        }
    const bfx = s.bfx;
    if (bfx) {
        for (const [id, [left, last]] of bfx.domes) {
            const sl = s.idToSlot.get(id);
            if (sl === undefined || !s.alive[sl])
                continue;
            out.domes.push({ id, left, max: bfx.R.domeS[s.etype[sl]], absorbing: last > 0 && s.tick - last < 1 / d.dt });
        }
        out.upgrades = bldfx_ts_1.UPGRADE_NAMES.filter((_, i) => bfx.has(team, i));
        for (const [tw, pl] of bfx.manned)
            if (s.towerManned(tw))
                out.manned.push([tw, pl]);
        out.exported = [bfx.exported[2 * team], bfx.exported[2 * team + 1]];
    }
    const P = s.pts;
    if (P) {
        const ht = P.rules.hackTicks || 1;
        for (const [id, c] of P.coreList())
            if (c.bld === 1)
                out.hacks.push({ id, progress: Math.min(1, c.ticks / ht), until: c.until > s.tick ? c.until : 0 });
        out.hacksDone = P.hacksDone[team & 3];
    }
    for (let sl = 0; sl < s.hi; sl++) {
        if (!s.alive[sl] || s.team[sl] !== team)
            continue;
        if (s.ordType[sl] === sim_ts_1.ORD_ATTACK_GROUND) {
            const w = s.waypoints[sl];
            if (w && w.length >= 2)
                out.ground.push([s.eid[sl], w[0], w[1]]);
        }
        if (s.lowFly[sl] === 1 && d.tAir[s.etype[sl]])
            out.low.push(s.eid[sl]);
    }
    const ob = s.match?.objectives;
    if (ob)
        for (const o of ob.list)
            if (o.def.type === "escort" && o.team === team) {
                const live = o.convoy.filter((id) => { const cs = s.idToSlot.get(id); return cs !== undefined && s.alive[cs] && s.hp[cs] > 0; });
                const last = o.route[o.route.length - 1];
                const arrived = P && last !== undefined ? live.filter((id) => { const cs = s.idToSlot.get(id); return P.pointAt(s.x[cs], s.z[cs]) === last; }).length : 0;
                out.escort.push({ target: o.target, route: o.route.slice(), leg: o.value, convoy: live, alive: live.length, need: o.convNeed, arrived });
            }
    // C11: the Barracks cap (ruling 65) and site decay (ruling 69)
    const cap = s.infantryCap(team);
    out.squads = { n: s.infantrySquads(team), cap: Number.isFinite(cap) ? cap : -1, per: s.squadsPerBarracks ?? 0 };
    const con = s.con;
    if (con && con.decayTicks >= 0)
        for (const st of con.sites.values())
            if (st.team === team && st.idle >= 0)
                out.decay.push({ id: st.id, idle: s.tick - st.idle, wait: Math.max(0, con.decayTicks - (s.tick - st.idle)) });
    return out;
}
