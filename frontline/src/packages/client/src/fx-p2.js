"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.p2Fx = void 0;
// P2 effects pass: the glue between the page (main.ts) and the effects (fx-particles.ts, fx-effects.ts, fx-table.ts,
// fx-screen.ts). main.ts calls it from one-line hooks marked `// P2 hook`: install (once), event (each event), proj (each
// drawn projectile, each frame), shot (each hitscan tracer when it is first drawn), frame (each frame, after the
// sound), drawDecals (after the blob shadows), draw (after the puffs) and state (the debug hook). It also hangs itself on
// fx.ts (Fx.ext), so the explosions, impacts and muzzle flashes main.ts already asks for get the new layers without
// touching those call sites. Nothing here changes what main.ts does.
const s2_pod_ts_1 = require("./s2-pod.js");
const fx_particles_ts_1 = require("./fx-particles.js");
const fx_effects_ts_1 = require("./fx-effects.js");
const fx_table_ts_1 = require("./fx-table.js");
const calls_ts_1 = require("../../sim/src/calls.js");
const render_ts_1 = require("./render.js");
const fx_particles_ts_2 = require("./fx-particles.js");
const sound_table_ts_1 = require("./sound-table.js");
const fx_screen_ts_1 = require("./fx-screen.js");
// event kinds (sim/src/events.ts EV; numbers, so this module needs no sim import)
const K = { HIT: 1, PILOT_DEATH: 6, ENTER: 3, EXIT: 4, EJECT: 5, PRODUCED: 7, RESPAWN: 8, CRITICAL: 9, HIJACK: 15, DAMAGE_TAKEN: 16, POINT: 17, CORE: 18, DEPOSIT_EXHAUSTED: 19, HARVEST_DELIVERED: 20,
    BUILD_STARTED: 23, BUILD_DONE: 24, BUILD_ENDED: 25, CALL_QUEUED: 26, CALL_IMPACT: 27, CALL_EFFECT: 29, DOWNED: 33, REVIVED: 34, CHARGE: 35, CLOAK: 36,
    FORTIFY: 50, FORWARD_BASE: 51, AIRCRAFT_DOWN: 60, AIRCRAFT_LANDING: 62, CARGO: 63, WEATHER: 70, PLAYER_JOINED: 80, UNIT_DIED: 82, JAMMER: 83, DECOY: 84, SCAN: 85 };
class P2Fx {
    ctx = null;
    P = new fx_particles_ts_1.Particles();
    screen = new fx_screen_ts_1.ScreenFx();
    stats = { events: 0, frames: 0, explosions: 0, impacts: 0, muzzles: 0, shots: 0, projectiles: 0, byEffect: {}, frameMs: 0 };
    fam = [];
    bufA = new Float32Array(1024 * fx_particles_ts_1.P2_FLOATS);
    bufAdd = new Float32Array(1024 * fx_particles_ts_1.P2_FLOATS);
    bufDec = new Float32Array(256 * fx_particles_ts_1.P2_FLOATS);
    nA = 0;
    nAdd = 0;
    nDec = 0;
    filledFrame = -1;
    frameNo = 0;
    nowMs = 0;
    ext = null;
    /** QA aid: effect time scale (screenshots under a software renderer at ~1 fps slow the effects so they are seen). */
    timeScale = 1;
    camR = [1, 0, 0];
    camU = [0, 1, 0];
    /** projectiles drawn (id -> last drawn head, weapon); `frame` = the frame it was last drawn in */
    projs = new Map();
    /** hitscan ends drawn this frame or the last (main.ts's impact spark at the same point learns its weapon here) */
    shotEnds = [];
    install(c) {
        // a fresh state per page (the logic tests open several pages in one process; this module is loaded once)
        const fresh = new P2Fx(), self = this;
        for (const k of Object.keys(fresh))
            self[k] = fresh[k];
        this.ctx = c;
        try {
            const W = c.data.weapons, list = (Array.isArray(W) ? W : W?.weapons ?? []);
            const dmg = new Map(list.map((w) => [w.id, w.damageType ?? ""]));
            this.fam = c.cd.weaponIds.map((id) => (0, sound_table_ts_1.familyOf)(id, dmg.get(id) ?? ""));
            const calls = (c.data.supportCalls?.calls ?? []);
            this.callIds = calls.map((x) => x.id);
            this.callR = calls.map((x) => x.params?.radius ?? 0);
            this.callLen = calls.map((x) => x.params?.lineLength ?? 0);
        }
        catch {
            this.fam = [];
        }
        this.ext = { explosion: (x, y, z, size, team) => this.onExplosion(x, y, z, size, team), spark: (x, y, z, glow, k) => this.onImpact(x, y, z, glow, k), muzzle: () => { this.stats.muzzles++; } };
        c.fx().ext = this.ext;
        globalThis.__p2fx = this; // QA aid (test/qa/p2-screens.mjs): run effects, slow time
        let store = null;
        try {
            store = typeof localStorage !== "undefined" ? localStorage : null;
        }
        catch {
            store = null;
        }
        this.screen.install(typeof document !== "undefined" ? document : null, store);
        this.P.flashK = this.screen.reduceFlashes ? 0.35 : 1;
    }
    /** Runs an effect by id (counted). */
    run(id, a) { const f = fx_effects_ts_1.EFFECTS[id]; if (!f)
        return; f(this.P, a); this.stats.byEffect[id] = (this.stats.byEffect[id] ?? 0) + 1; }
    family(w) { const f = this.fam[w]; return f && fx_table_ts_1.WEAPON_FX[f] ? f : "kinetic-medium"; } // a sound family without its own look draws as kinetic-medium
    /** The surface at (x, z): the terrain layer's type, else the planet's ground (fx-table PLANET_DUST). */
    surfaceAt(x, z) {
        const c = this.ctx;
        const t = c.layerAt(x, z);
        if (t === "lava")
            return "lava";
        return (t && sound_table_ts_1.LAYER_SURFACE[t]) || fx_table_ts_1.PLANET_DUST[c.planet] || "dirt";
    }
    event(e, v, now) {
        const c = this.ctx;
        if (!c)
            return;
        this.stats.events++;
        const at = (x, z, up = 0) => { const g = c.height(x, z); return { x, y: g + up, z, ground: g }; };
        const ent = (id) => {
            const r = c.rendered().find((q) => q.id === id);
            if (r)
                return { x: r.x, z: r.z, y: r.cy, type: r.type, team: r.team };
            const q = v?.entities.get(id);
            return q ? { x: q.x, z: q.z, y: c.height(q.x, q.z) + 1, type: q.type, team: q.team } : null;
        };
        switch (e.kind) {
            case K.DAMAGE_TAKEN:
                this.hitTaken(e, v);
                break;
            case K.CRITICAL: {
                const p = ent(e.a);
                if (p) {
                    this.run("critical-sparks", { x: p.x, y: p.y, z: p.z });
                    this.run("damage-smoke", { x: p.x, y: p.y, z: p.z, f: 1, k: c.cd.tRadius[p.type] || 2 });
                }
                break;
            }
            case K.CALL_IMPACT:
                if (this.callIds[e.c] === "emp-burst")
                    this.emps.push({ x: e.v1, z: e.v2, r: this.callR[e.c] || 40, until: now + 8000 });
                this.callEvent(e, now);
                break;
            case K.CALL_QUEUED:
            case K.CALL_EFFECT:
                this.callEvent(e, now);
                break;
            case K.PLAYER_JOINED:
                if (e.v1 || e.v2)
                    this.joins.push({ x: e.v1, z: e.v2, land: now + e.d * c.dt * 1000 });
                break;
            case K.UNIT_DIED:
                if (e.b >= 0 && c.cd.tStructure[e.b])
                    this.run("collapse", { ...at(e.v1, e.v2), k: Math.max(6, c.cd.tRadius[e.b] * 1.4) });
                break;
            case K.EJECT: {
                const p = ent(e.c) ?? ent(e.b);
                if (p)
                    this.run("eject-trail", { ...at(p.x, p.z, 2), team: p.team });
                break;
            }
            case K.AIRCRAFT_DOWN:
                this.run("crash-trail", { ...at(e.v1, e.v2), k: Math.max(10, e.c) });
                break;
            case K.BUILD_ENDED: {
                const s = this.sitePos.get(e.a);
                if (s && e.d === 1)
                    this.run("collapse", { ...at(s.x, s.z), k: 6 });
                break;
            }
            default: break;
        }
        this.worldEvent(e, v, now);
        this.cmdEvent(e, v);
    }
    /** The own pilot on foot in first person: its weapon's flash is the viewmodel's (main.ts), not a world effect. */
    fpFoot() { const c = this.ctx, me = c.me(); return c.mode() === "fp" && !!me && me.state === 1; }
    // ---------------------------------------------------------------- 1. weapons
    /** A projectile drawn this frame at p (direction d, unit). First sight: the muzzle flash; then its trail by class. */
    proj(id, w, team, p, dx, dy, dz, own) {
        const c = this.ctx;
        if (!c)
            return;
        this.stats.projectiles++;
        const fam = this.family(w), W = fx_table_ts_1.WEAPON_FX[fam], F = this.frameNo + 1;
        let r = this.projs.get(id);
        if (!r) {
            r = { w, team, x: p[0], y: p[1], z: p[2], dx, dy, dz, frame: F, arc: F };
            this.projs.set(id, r);
            if (!(own && this.fpFoot()) && this.P.dist(p[0], p[1], p[2]) < 900) {
                this.run("muzzle", { x: p[0] - dx * 0.4, y: p[1] - dy * 0.4, z: p[2] - dz * 0.4, dx, dy, dz, family: fam, team, band: own ? fx_particles_ts_2.BAND_CRIT : undefined, k: own ? 0.8 : 1 });
                this.stats.muzzles++;
            }
        }
        const d = this.P.dist(p[0], p[1], p[2]);
        // V1 (designer playtest 15 Nov): a glowing streak behind the round, from where it was drawn last frame (a shell's arc stays visible)
        const mv = Math.hypot(p[0] - r.x, p[1] - r.y, p[2] - r.z);
        if ((W.trailW ?? 0) > 0 && mv > 0.05 && mv < 120 && d < 2000)
            this.P.add({ x: p[0], y: p[1], z: p[2], ax: (p[0] - r.x) / mv, ay: (p[1] - r.y) / mv, az: (p[2] - r.z) / mv, len: mv, s0: W.trailW, s1: W.trailW * 0.35, life: W.trailLife ?? 0.2, c0: fx_table_ts_1.PAL.shell, c1: fx_table_ts_1.PAL.ember, a: 0.85, shape: fx_particles_ts_2.SH.streak, geom: fx_particles_ts_2.GEOM_STREAK, pass: fx_particles_ts_2.PASS_ADD, band: fx_particles_ts_2.BAND_NORMAL, fpow: 1.3, far: 2000 });
        r.x = p[0];
        r.y = p[1];
        r.z = p[2];
        r.dx = dx;
        r.dy = dy;
        r.dz = dz;
        r.frame = F;
        switch (W.tracer) {
            case "rocket":
            case "missile":
                if (d < 1500)
                    this.run("rocket-trail", { x: p[0], y: p[1], z: p[2], dx, dy, dz, family: fam });
                break;
            case "shell": {
                const lay = F - r.arc >= 3;
                if (lay)
                    r.arc = F;
                if (d < 2000)
                    this.run("shell-glow", { x: p[0], y: p[1], z: p[2], family: fam, n: lay ? 1 : 0 });
                break;
            }
            case "bolt":
                this.run("bolt-glow", { x: p[0], y: p[1], z: p[2], team, k: W.glow });
                break;
            case "autocannon":
            case "heavy":
            case "flak":
                if (d < 1600)
                    this.P.once(fx_particles_ts_2.PASS_ADD, p[0], p[1], p[2], W.glow, fam === "flak" ? [1, 0.7, 0.4] : [1, 0.82, 0.5], 0.8, fx_particles_ts_2.SH.glow);
                break;
            default: break;
        }
    }
    /** A hitscan tracer (or a short flight drawn as one) first drawn, from -> to: muzzle by weapon, tracer by class, casings. */
    shot(w, team, from, to, own, hit) {
        const c = this.ctx;
        if (!c)
            return;
        this.stats.shots++;
        const fam = this.family(w), W = fx_table_ts_1.WEAPON_FX[fam] ?? fx_table_ts_1.WEAPON_FX["kinetic-medium"] ?? fx_table_ts_1.WEAPON_FX["kinetic-heavy"]; // a family without its own look must never break the frame
        const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], L = Math.hypot(dx, dy, dz) || 1;
        const a = { x: from[0], y: from[1], z: from[2], dx: dx / L, dy: dy / L, dz: dz / L, x1: to[0], y1: to[1], z1: to[2], family: fam, team, own, band: own ? fx_particles_ts_2.BAND_CRIT : undefined };
        const foot = own && this.fpFoot();
        if (!foot && this.P.dist(from[0], from[1], from[2]) < 900) {
            this.run("muzzle", { ...a, own: false, k: own ? 0.7 : 1 });
            this.stats.muzzles++;
        }
        this.run(W.tracer === "beam" ? "beam" : "tracer", W.scorch ? { ...a, ground: c.height(to[0], to[2]) } : a); // F2: a scorching beam needs the ground under its end
        if (W.casings && !foot)
            this.run("casing", { ...a, ground: c.height(from[0], from[2]) });
        this.shotEnds.push({ w, x: to[0], y: to[1], z: to[2], frame: this.frameNo + 1, hit });
        if (this.shotEnds.length > 256)
            this.shotEnds.splice(0, this.shotEnds.length - 256);
    }
    // ---------------------------------------------------------------- 2. impacts
    /** Entities by 16 m cell, rebuilt once per frame (impacts look for the hull they struck). */
    grid = new Map();
    gridFrame = -1;
    nearestHull(x, y, z) {
        const c = this.ctx;
        if (this.gridFrame !== this.frameNo) {
            this.gridFrame = this.frameNo;
            this.grid.clear();
            for (const e of c.rendered()) {
                const k = (Math.floor(e.x / 16) & 0xffff) * 65536 + (Math.floor(e.z / 16) & 0xffff);
                let b = this.grid.get(k);
                if (!b)
                    this.grid.set(k, (b = []));
                b.push(e);
            }
        }
        let best = null, bd = 1e9;
        const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
        for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++) {
                const b = this.grid.get((((cx + i) & 0xffff) * 65536) + ((cz + j) & 0xffff));
                if (b)
                    for (const e of b) {
                        const r = c.cd.tRadius[e.type] + 1.2, d = Math.hypot(e.x - x, e.cy - y, e.z - z);
                        if (d < r && d < bd) {
                            bd = d;
                            best = e;
                        }
                    }
            }
        return best;
    }
    /**
     * main.ts's impact spark (fx.spark): where a round ended. Its weapon comes from the hitscan end at that point or the
     * projectile last drawn near it; what it struck from the hulls near it: a shielded hull ripples at the hit point, a
     * bare hull sparks, the ground throws dust in its surface's colour (liquid splashes, lava spits), sometimes a
     * ricochet. Splash weapons also burst (a small explosion). EMP sparks (blue) become arcs.
     */
    onImpact(x, y, z, glow, k) {
        const c = this.ctx;
        if (!c)
            return;
        this.stats.impacts++;
        if (glow[2] > 0.9 && glow[0] < 0.6) {
            this.run("emp-arcs", { x, y, z, k: 1.5 });
            return;
        } // the EMP's sparks on vehicles
        let w = -1, hitscanHit = null;
        for (const s of this.shotEnds)
            if (Math.abs(s.x - x) < 0.05 && Math.abs(s.z - z) < 0.05) {
                w = s.w;
                hitscanHit = s.hit;
                break;
            }
        if (w < 0) {
            let bd = 30, bid = -1;
            for (const [id, r] of this.projs) {
                if (r.frame > this.frameNo)
                    continue;
                const d = Math.hypot(r.x - x, r.y - y, r.z - z);
                if (d < bd) {
                    bd = d;
                    bid = id;
                }
            }
            if (bid >= 0) {
                w = this.projs.get(bid).w;
                this.projs.delete(bid);
            }
        }
        const fam = w >= 0 ? this.family(w) : null, W = fam ? fx_table_ts_1.WEAPON_FX[fam] : null;
        const kk = W ? W.impact : Math.min(1.6, k);
        const g = c.height(x, z);
        if (fam && W?.tracer === "flak" && y > g + 3) {
            this.run("flak-burst", { x, y, z, family: fam });
            return;
        }
        const hull = hitscanHit === false ? null : this.nearestHull(x, y, z);
        const splash = w >= 0 ? (c.cd.wSplash[w] ?? 0) : k > 1.5 ? 4 : 0;
        if (splash > 0)
            this.run("explosion", { x, y: Math.max(y, g), z, ground: g, k: Math.min(4, 1.2 + splash * 0.35), air: y > g + 3 });
        if (hull && !c.cd.tPilot[hull.type] && c.cd.tArmour[hull.type] !== 0) {
            const nx = x - hull.x, ny = y - hull.cy, nz = z - hull.z, nl = Math.hypot(nx, ny, nz) || 1;
            if (hull.shield > 0.05)
                this.run("shield-hit", { x, y, z, dx: nx / nl, dy: ny / nl, dz: nz / nl, k: 0.8 + kk * 0.4, col: hull.team === 0 ? [0.45, 0.85, 1] : [1, 0.6, 0.35] });
            else {
                this.run("impact-metal", { x, y, z, k: kk, dx: nx / nl, dy: ny / nl, dz: nz / nl, ground: g });
                if (this.P.r() < 0.12)
                    this.run("ricochet", { x, y, z, dx: nx / nl, dz: nz / nl });
            }
            return;
        }
        if (hull) {
            this.run("impact-dust", { x, y, z, k: kk * 0.5, surface: "dirt", ground: g });
            return;
        } // infantry: a small puff
        const surface = this.surfaceAt(x, z);
        this.run("impact-dust", { x, y: Math.max(y, g), z, k: kk, surface, ground: g });
        if ((surface === "rock" || surface === "glass" || surface === "rubble") && this.P.r() < 0.15)
            this.run("ricochet", { x, y: Math.max(y, g) + 0.2, z, dx: this.P.s(), dz: this.P.s() });
    }
    // ---------------------------------------------------------------- 3. explosions
    /** main.ts's explosion (deaths, call strikes, shells, charges, pods): the full effect, a flash and a shake near the player. */
    onExplosion(x, y, z, size, team) {
        const c = this.ctx;
        if (!c)
            return;
        this.stats.explosions++;
        const g = c.height(x, z);
        this.run("explosion", { x, y, z, k: size, ground: g, air: y > g + 3, team });
        if (c.mode() === "fp" && c.wire() < 0.5) {
            const k = this.screen.blast(this.P.dist(x, y, z), size);
            if (k > 0.01)
                c.shake(k * 0.8);
        }
    }
    // ---------------------------------------------------------------- 4. vehicles
    shieldPrev = new Map();
    emps = [];
    callIds = [];
    callR = [];
    callLen = [];
    joins = [];
    /** Per frame: hover glow and dust, aircraft engines and low-flight wake, damage smoke, critical sparks, shield breaks, EMP arcs. */
    vehicleFrame(now) {
        const c = this.ctx, cd = c.cd, E = this.P.eye;
        this.emps = this.emps.filter((w) => now < w.until);
        let dusty = 0;
        for (const e of c.rendered()) {
            if (cd.tPilot[e.type])
                continue;
            const d = Math.hypot(e.x - E[0], e.cy - E[1], e.z - E[2]), rad = cd.tRadius[e.type] || 2, st = !!cd.tStructure[e.type];
            // shield broken: it was up last frame and is gone now
            const sp = this.shieldPrev.get(e.id) ?? 0;
            if (sp > 0.08 && e.shield < 0.01 && d < 900)
                this.run("shield-break", { x: e.x, y: e.cy, z: e.z, r: rad * 1.3, team: e.team });
            this.shieldPrev.set(e.id, e.shield);
            const hp = e.hp > 1.001 ? e.hp / 100 : e.hp;
            if ((hp < 0.35 || e.critical) && d < 700) {
                this.run("damage-smoke", { x: e.x, y: e.cy + rad * 0.4, z: e.z, k: Math.min(4, rad), f: e.critical ? 1 : 1 - hp / 0.35 });
                if (e.critical && this.P.r() < 0.06)
                    this.run("critical-sparks", { x: e.x, y: e.cy, z: e.z });
            }
            if (st)
                continue;
            for (const w of this.emps)
                if (Math.hypot(e.x - w.x, e.z - w.z) <= w.r && d < 500)
                    this.run("emp-arcs", { x: e.x, y: e.cy - rad * 0.3, z: e.z, k: rad });
            if (d > 1200)
                continue;
            const fx = Math.cos(e.yaw), fz = Math.sin(e.yaw), speed = Math.hypot(e.vx, e.vz), f = Math.min(1, speed / 22);
            const g = c.height(e.x, e.z);
            if (cd.tAir[e.type]) {
                const up = (e.y - g) / 40;
                if (cd.typeIds[e.type] !== "gunship") // Frontline: the gunship's flames come from its tilting wing engines, not the tail
                    this.run("jet-glow", { x: e.x - fx * rad * 0.9, y: e.cy, z: e.z - fz * rad * 0.9, dx: fx, dy: 0, dz: fz, k: Math.min(1.6, rad * 0.4), f: 0.4 + 0.6 * f });
                if (e.y - g < 18 && d < 400 && dusty < 24) {
                    dusty++;
                    this.run("lowflight-wake", { x: e.x, y: g, z: e.z, ground: g, k: rad * 1.4, f: Math.max(0.3, f) * (1 - Math.max(0, up)), dx: fx, dz: fz, surface: this.surfaceAt(e.x, e.z) });
                }
                continue;
            }
            if (d > 400)
                continue;
            const hov = c.hoverOf(e.type);
            if (hov > 0) {
                this.run("hover-glow", { x: e.x, y: g + Math.max(0.15, hov * 0.5), z: e.z, k: rad * 0.8, team: e.team, f });
                if (d < 300 && dusty < 40) {
                    dusty++;
                    this.run("hover-dust", { x: e.x, y: g, z: e.z, ground: g, k: rad, f, dx: fx * (speed > 1 ? 1 : 0), dz: fz * (speed > 1 ? 1 : 0), surface: this.surfaceAt(e.x, e.z) });
                }
            }
        }
        if (this.shieldPrev.size > 2000)
            this.shieldPrev.clear();
    }
    // ---------------------------------------------------------------- 5. call-downs
    beacons = new Map();
    passes = [];
    zonesSeen = new Map();
    domeBuf = new Float32Array(16 * render_ts_1.SHIELD_FLOATS);
    nDome = 0;
    callDef(i) { return { id: this.callIds[i] ?? "", r: this.callR[i] || 10, len: this.callLen[i] || 40 }; }
    myTeam(v) { const me = this.ctx.me(); const e = me && v ? v.entities.get(me.entity) : undefined; return e ? e.team : 0; }
    /** Per frame: beacons (beams; falling pods; the precision strike's targeting beam), aircraft passes, lasting zones. */
    callFrame(now) {
        const c = this.ctx, v = c.view();
        this.nDome = 0;
        const team = this.myTeam(v);
        for (const b of v?.calls?.beacons ?? []) {
            this.beacons.set(b.id, { x: b.x, z: b.z, call: b.call });
            const D = this.callDef(b.call), CF = fx_table_ts_1.CALL_FX[D.id];
            if (!CF || Math.hypot(b.x - this.P.eye[0], b.z - this.P.eye[2]) > 2500)
                continue;
            const secs = b.ticksToImpact * c.dt, g = c.height(b.x, b.z);
            this.run("beacon-beam", { x: b.x, y: g, z: b.z, ground: g, f: Math.max(0, Math.min(1, 1 - secs / 6)), t: now / 1000, col: fx_table_ts_1.PAL[CF.beacon] });
            const ps = c.renderTick && b.impactTick !== undefined ? (b.impactTick - c.renderTick()) * c.dt : secs;
            if (D.id === "sentry-gun" && ps <= s2_pod_ts_1.POD_FALL_S && ps >= 0) { // ruling 130: the drop pod (its mesh: main.ts) streaks in, the retros fire, dust blasts up
                const h = (0, s2_pod_ts_1.podFallHeight)(ps), rf = (0, s2_pod_ts_1.podRetro)(ps), df = (0, s2_pod_ts_1.podDust)(h);
                if (h > 25)
                    this.run("pod-trail", { x: b.x, y: g + h + 6.5, z: b.z });
                if (rf > 0)
                    this.run("pod-retro", { x: b.x, y: g + h + 0.5, z: b.z, f: rf });
                if (df > 0 && rf > 0)
                    this.run("pod-dust", { x: b.x, y: g, z: b.z, ground: g, f: df });
            }
            else if (CF.incoming === "pod-trail" && secs <= 2.5 && secs >= 0) {
                const k = secs / 2.5;
                this.run("pod-trail", { x: b.x, y: g + 320 * k * k + 1.2, z: b.z });
            }
            if (CF.incoming === "strike-beam" && secs <= 1.0) // designer 20 Nov: the strike lands 1 s after the beacon (was 4)
                this.run("strike-beam", { x: b.x, y: g, z: b.z, ground: g, f: 1 - secs / 1.0, r: D.r });
        }
        if (this.beacons.size > 128)
            this.beacons.clear();
        // strafing / bomb runs: the same line and timing as main.ts's aircraft (from 120 m before the beacon to 120 m past the end, 1.8 s)
        this.passes = this.passes.filter((p) => now - p.start < 2200);
        for (const p of this.passes) {
            const L = Math.hypot(p.x1 - p.x0, p.z1 - p.z0) || 1, ux = (p.x1 - p.x0) / L, uz = (p.z1 - p.z0) / L, f = Math.min(1, (now - p.start) / 1800), along = -120 + f * (L + 240);
            const ax = p.x0 + ux * along, az = p.z0 + uz * along, ay = c.height(ax, az) + (p.bomb ? 70 : 45);
            this.run("jet-pass", { x: ax - ux * 4, y: ay, z: az - uz * 4, dx: ux, dy: 0, dz: uz });
        }
        // lasting zones (the snapshot's call zones)
        const seen = new Set(), mp = [0, 0];
        for (const z of v?.calls?.zones ?? []) {
            const D = this.callDef(z.call), g = c.height(z.x, z.z);
            seen.add(z.beacon);
            this.zonesSeen.set(z.beacon, { x: z.x, z: z.z, call: z.call, r: D.r });
            if (Math.hypot(z.x - this.P.eye[0], z.z - this.P.eye[2]) > 1500)
                continue;
            if (D.id === "shield-bubble") {
                this.run("dome-surface", { x: z.x, y: g, z: z.z, ground: g, r: D.r });
                if (this.nDome < 16) {
                    const o = this.nDome++ * render_ts_1.SHIELD_FLOATS, B = this.domeBuf;
                    B[o] = z.x;
                    B[o + 1] = g;
                    B[o + 2] = z.z;
                    B[o + 3] = D.r;
                    B[o + 4] = D.r * 0.85;
                    B[o + 5] = z.team === team ? 0 : 1;
                    B[o + 6] = 0.5 + 0.1 * Math.sin(now / 300);
                    B[o + 7] = 0;
                    B[o + 8] = 0;
                    B[o + 9] = 1;
                    B[o + 10] = 0;
                    B[o + 11] = 0;
                }
            }
            else if (D.id === "smoke-screen")
                this.run("smoke-wall", { x: z.x, y: g, z: z.z, ground: g, r: D.len, dx: Math.cos(z.dirYaw), dz: Math.sin(z.dirYaw) });
            else if (D.id === "minefield" && z.team === team) {
                for (let k = 0; k < 31; k++)
                    if (z.value & (1 << k)) {
                        (0, calls_ts_1.minePoint)(z.beacon, k, z.x, z.z, D.r, c.mapSize, mp);
                        this.run("mine-blink", { x: mp[0], y: c.height(mp[0], mp[1]), z: mp[1], f: 0.5 + 0.5 * Math.sin(now / 300 + k) });
                    }
            }
        }
        for (const id of this.zonesSeen.keys())
            if (!seen.has(id) && this.zonesSeen.size > 64)
                this.zonesSeen.delete(id);
    }
    /** CALL_IMPACT: one effect per call (CALL_FX); CALL_EFFECT: shells streak in, a pass starts, the dome breaks. */
    callEvent(e, now) {
        const c = this.ctx, D = this.callDef(e.c), CF = fx_table_ts_1.CALL_FX[D.id], g = c.height(e.v1, e.v2), at = { x: e.v1, y: g, z: e.v2, ground: g, r: D.r, team: e.team ?? 0 };
        if (e.kind === K.CALL_QUEUED) {
            this.beacons.set(e.a, { x: e.v1, z: e.v2, call: e.c });
            return;
        }
        if (e.kind === K.CALL_IMPACT) {
            if (!CF)
                return;
            if (D.id === "barrage" || D.id === "strafing-run" || D.id === "bomb-run")
                return; // the shells and the pass follow as CALL_EFFECT
            this.run(CF.impact, at);
            return;
        }
        const sub = e.flags & 15;
        if (sub === 0)
            this.run("shell-trail", at);
        else if (sub === 1) {
            const b = this.beacons.get(e.a) ?? { x: e.v1, z: e.v2 };
            this.passes.push({ x0: b.x, z0: b.z, x1: e.v1, z1: e.v2, start: now, bomb: D.id === "bomb-run" });
        }
        else if (sub === 3 && D.id === "shield-bubble") {
            const z = this.zonesSeen.get(e.a);
            if (z)
                this.run("dome-down", { x: z.x, y: c.height(z.x, z.z), z: z.z, ground: c.height(z.x, z.z), r: z.r });
        }
    }
    // ---------------------------------------------------------------- 6. world
    downed = new Map(); // body entity -> pilot
    cloaked = new Set(); // body entities of own-team cloaked pilots
    charges = new Map(); // charge id -> target entity
    forts = new Map(); // point index -> ms the upgrade started
    hijack = 0;
    wasProne = false;
    typeIdx(id) { return this.ctx.cd.typeIds.indexOf(id); }
    worldFrame(now) {
        const c = this.ctx, v = c.view(), E = this.P.eye, team = this.myTeam(v), t = now / 1000;
        const pos = (id) => { const r = c.rendered().find((q) => q.id === id); if (r)
            return { x: r.x, y: r.y, z: r.z, type: r.type }; const q = v?.entities.get(id); return q ? { x: q.x, y: c.height(q.x, q.z), z: q.z, type: q.type } : null; };
        const near = (x, z, m) => Math.hypot(x - E[0], z - E[2]) < m;
        const teamCol = (tm) => (tm === team ? fx_table_ts_1.PAL.own : tm < 0 ? fx_table_ts_1.PAL.capture : fx_table_ts_1.PAL.enemy);
        // strategic points: a pulse while a capture runs, sparks while hacked
        for (const p of v?.points?.points ?? []) {
            const P = c.pointPos(p.index);
            if (!P || !near(P[0], P[1], 1500))
                continue;
            const g = c.height(P[0], P[1]);
            if (p.captureTeam >= 0 && p.captureProgress > 0 && p.captureProgress < 1)
                this.run("capture-pulse", { x: P[0], y: g, z: P[1], ground: g, r: c.ringR, f: p.captureProgress, t, col: teamCol(p.captureTeam) });
            if (p.hacking)
                this.run("hack-sparks", { x: P[0], y: g + 2, z: P[1] });
        }
        for (const k of v?.points?.cores ?? []) {
            if (!near(k.x, k.z, 900))
                continue;
            const g = c.height(k.x, k.z);
            if (k.hackProgress > 0 && !k.disabled)
                this.run("hack-sparks", { x: k.x + this.P.s() * 3, y: g + 3 + this.P.r() * 3, z: k.z + this.P.s() * 3 });
            if (k.disabled)
                this.run("emp-arcs", { x: k.x, y: g + 3, z: k.z, k: 6 });
        }
        // construction: the rising frame and welding sparks on unfinished sites
        for (const st of v?.construction?.sites ?? []) {
            if (st.progress >= 1 || st.progress <= 0 || !near(st.x, st.z, 500))
                continue;
            const g = c.height(st.x, st.z), r = c.cd.tRadius[st.type] || 6;
            this.run("build-frame", { x: st.x, y: g, z: st.z, ground: g, r, f: st.progress, k: r * 1.4 });
            this.run("weld-sparks", { x: st.x, y: g, z: st.z, ground: g, r, f: st.progress, k: r * 1.4 });
        }
        for (const [pt, t0] of this.forts) {
            const P = c.pointPos(pt);
            if (!P || now - t0 > 120000) {
                this.forts.delete(pt);
                continue;
            }
            if (near(P[0], P[1], 500)) {
                const g = c.height(P[0], P[1]);
                this.run("fortify", { x: P[0], y: g, z: P[1], ground: g, r: 12 });
            }
        }
        // harvesters loading at a deposit: sparks at the cutter and ore running up into the hopper; gas extractors vent
        const harv = new Set((v?.mining?.harvesters ?? []).filter((h) => h.phase === 2).map((h) => h.id)), gasT = this.typeIdx("gas-extractor");
        for (const e of c.rendered()) {
            if (Math.hypot(e.x - E[0], e.z - E[2]) > 600)
                continue;
            if (harv.has(e.id)) {
                const fx = Math.cos(e.yaw), fz = Math.sin(e.yaw), r = c.cd.tRadius[e.type] || 3, g = c.height(e.x, e.z);
                const hx = e.x + fx * r * 1.1, hz = e.z + fz * r * 1.1;
                this.run("mining-sparks", { x: hx, y: g + 0.4, z: hz, ground: g });
                this.run("ore-stream", { x: hx, y: g + 0.3, z: hz, x1: e.x, y1: e.cy + r * 0.6, z1: e.z });
            }
            else if (e.type === gasT)
                this.run("gas-vent", { x: e.x, y: e.cy + (c.cd.tRadius[e.type] || 4) * 0.8, z: e.z });
        }
        // pilots: downed markers, own-team cloak shimmer, charge fuse lights, the own hijack, going prone
        for (const [body] of this.downed) {
            const p = pos(body);
            if (!p) {
                this.downed.delete(body);
                continue;
            }
            if (near(p.x, p.z, 400))
                this.run("downed-marker", { x: p.x, y: p.y, z: p.z, ground: c.height(p.x, p.z), t });
        }
        for (const body of this.cloaked) {
            const p = pos(body);
            if (!p) {
                this.cloaked.delete(body);
                continue;
            }
            if (near(p.x, p.z, 200))
                this.run("cloak-shimmer", { x: p.x, y: p.y, z: p.z });
        }
        for (const [, tgt] of this.charges) {
            const p = pos(tgt);
            if (p && near(p.x, p.z, 300))
                this.run("charge-blink", { x: p.x, y: p.y + 1.5, z: p.z, f: Math.floor(now / 250) % 2 });
        }
        if (this.hijack) {
            const p = pos(this.hijack);
            if (p)
                this.run("hack-sparks", { x: p.x + this.P.s(), y: p.y + 1.5, z: p.z + this.P.s() });
        }
        const me = c.me(), body = me && me.state === 1 ? v?.entities.get(me.entity) : undefined;
        if (body) {
            if (body.prone && !this.wasProne)
                this.run("prone-dust", { x: body.x, y: c.height(body.x, body.z), z: body.z, ground: c.height(body.x, body.z), surface: this.surfaceAt(body.x, body.z) });
            this.wasProne = body.prone;
        }
    }
    worldEvent(e, v, now) {
        const c = this.ctx, team = this.myTeam(v);
        const at = (x, z, up = 0) => { const g = c.height(x, z); return { x, y: g + up, z, ground: g }; };
        const posOf = (id) => { const r = c.rendered().find((q) => q.id === id); if (r)
            return { x: r.x, y: r.y, z: r.z, ground: c.height(r.x, r.z), team: r.team === team ? 0 : 1 }; const q = v?.entities.get(id); return q ? { ...at(q.x, q.z), team: q.team === team ? 0 : 1 } : null; };
        const site = (id) => v?.construction?.sites.find((s) => s.id === id) ?? this.sitePos.get(id) ?? null;
        switch (e.kind) {
            case K.POINT: {
                const P = c.pointPos(e.a);
                if (P && e.b === 2)
                    this.run("capture-flip", { ...at(P[0], P[1]), r: c.ringR, col: e.c === team ? fx_table_ts_1.PAL.own : fx_table_ts_1.PAL.enemy });
                if (P && e.b === 3)
                    this.run("build-cancel", at(P[0], P[1]));
                break;
            }
            case K.CORE:
                if (e.b === 3) {
                    const k = v?.points?.cores.find((q) => q.id === e.a);
                    if (k)
                        this.run("capture-flip", { ...at(k.x, k.z), r: 20, col: e.c === team ? fx_table_ts_1.PAL.own : fx_table_ts_1.PAL.enemy });
                }
                break;
            case K.BUILD_STARTED: {
                const s = site(e.a);
                if (s)
                    this.run("build-start", { ...at(s.x, s.z), r: c.cd.tRadius[e.b] || 6 });
                break;
            }
            case K.BUILD_DONE: {
                const p = posOf(e.d) ?? (site(e.a) ? at(site(e.a).x, site(e.a).z) : null);
                if (p)
                    this.run("build-done", { ...p, y: p.ground ?? p.y, r: c.cd.tRadius[e.b] || 6, k: (c.cd.tRadius[e.b] || 6) * 1.4 });
                break;
            }
            case K.BUILD_ENDED: {
                const s = site(e.a);
                if (s && e.d !== 1)
                    this.run("build-cancel", at(s.x, s.z));
                break;
            }
            case K.FORTIFY: {
                if (e.b === 1) {
                    this.forts.delete(e.a);
                    const P = c.pointPos(e.a);
                    if (P)
                        this.run("fortify", { ...at(P[0], P[1]), f: 1 });
                }
                else
                    this.forts.set(e.a, now);
                break;
            }
            case K.FORWARD_BASE: {
                const p = posOf(e.a);
                if (p)
                    this.run("deploy-dust", { ...p, surface: this.surfaceAt(p.x, p.z) });
                break;
            }
            case K.HARVEST_DELIVERED: {
                const a = posOf(e.a), b = posOf(e.b);
                if (a && b)
                    this.run("ore-unload", { x: a.x, y: (a.ground ?? a.y) + 2, z: a.z, ground: a.ground, x1: b.x, y1: (b.ground ?? b.y) + 1, z1: b.z });
                break;
            }
            case K.PRODUCED: {
                const p = posOf(e.b);
                if (p)
                    this.run("rollout-dust", p);
                break;
            }
            case K.RESPAWN: {
                const p = posOf(e.b);
                if (p)
                    this.run("respawn-glow", p);
                break;
            }
            case K.DOWNED:
                this.downed.set(e.b, e.a);
                break;
            case K.PILOT_DEATH:
                this.downed.delete(e.c);
                break;
            case K.REVIVED: {
                this.downed.delete(e.c);
                const p = posOf(e.c);
                if (p)
                    this.run("revive-glow", p);
                break;
            }
            case K.CLOAK: {
                if (e.flags & 1)
                    this.cloaked.add(e.b);
                else {
                    this.cloaked.delete(e.b);
                    const p = posOf(e.b);
                    if (p)
                        this.run("decloak", p);
                }
                break;
            }
            case K.CHARGE:
                if (e.flags & 1)
                    this.charges.set(e.a, e.c);
                else
                    this.charges.delete(e.a);
                if (this.charges.size > 32)
                    this.charges.clear();
                break;
            case K.HIJACK:
                if (e.a === c.pilotId())
                    this.hijack = e.d === 0 ? e.b : 0;
                break;
            case K.ENTER:
            case K.EXIT: {
                const p = posOf(e.b);
                if (p)
                    this.run("hatch-puff", p);
                break;
            }
            case K.CARGO: {
                const p = posOf(e.a);
                if (p)
                    this.run("hatch-puff", p);
                break;
            }
            case K.AIRCRAFT_LANDING:
                this.run("landing-dust", { ...at(e.v1, e.v2), surface: this.surfaceAt(e.v1, e.v2) });
                break;
            case K.JAMMER:
                if (e.b === 1)
                    this.run("jammer-pulse", { ...at(e.v1, e.v2), r: e.c || 80 });
                break;
            case K.DECOY:
                this.run("decoy-pop", at(e.v1, e.v2));
                break;
            case K.SCAN:
                this.run("sweep-ring", { ...at(e.v1, e.v2), r: 150 });
                break;
            default: break;
        }
    }
    // ---------------------------------------------------------------- 7. weather and planets
    wxAcc = 0;
    moteAcc = 0;
    flashWas = false;
    nextBolt = 0;
    /** Camera-attached particle volumes: rain, dust sheets, ash, fog banks with depth, lightning, flare glare; planet motes. */
    weatherFrame(now, dt) {
        const c = this.ctx, E = this.P.eye;
        if (c.mode() === "cmd" || c.wire() > 0.5)
            return;
        const g = c.height(E[0], E[2]), id = c.weather(), W = id ? fx_table_ts_1.WEATHER_FX[id] : undefined, k = Math.max(0, Math.min(1, c.weatherK()));
        const at = { x: E[0], y: E[1], z: E[2], ground: g };
        if (W && W.kind !== "none" && k > 0.02) {
            this.wxAcc += W.rate * dt * k;
            const n = Math.floor(this.wxAcc);
            this.wxAcc -= n;
            const col = fx_table_ts_1.PAL[W.col];
            if (n > 0)
                for (const eff of W.effects) {
                    if (eff === "rain")
                        this.run("rain", { ...at, n, col, dx: W.wind, dy: W.fall });
                    else if (eff === "dust-sheet")
                        this.run("dust-sheet", { ...at, n: Math.max(1, n >> 2), dx: W.wind });
                    else if (eff === "ash")
                        this.run("ash", { ...at, n });
                    else if (eff === "fog-bank")
                        this.run("fog-bank", { ...at, n });
                    else if (eff === "motes")
                        this.run("motes", { ...at, n, col, k: W.size, dy: W.fall });
                }
            if (W.effects.includes("flare-glare")) {
                const sd = c.sunDir();
                this.run("flare-glare", { ...at, dx: sd[0], dy: sd[1], dz: sd[2], f: k });
            }
            if (W.effects.includes("lightning")) {
                // in step with main.ts's lightning flash (body.wx-flash), else every 5-12 s
                const flash = typeof document !== "undefined" && !!document.body?.classList?.contains("wx-flash");
                if ((flash && !this.flashWas) || now > this.nextBolt) {
                    this.nextBolt = now + 5000 + this.P.r() * 7000;
                    const ang = this.P.r() * 6.283, d = 250 + this.P.r() * 450, x = E[0] + Math.cos(ang) * d, z = E[2] + Math.sin(ang) * d;
                    this.run("lightning", { x, y: c.height(x, z), z, ground: c.height(x, z) });
                }
                this.flashWas = flash;
            }
        }
        const PF = fx_table_ts_1.PLANET_FX[c.planet];
        if (PF) {
            this.moteAcc += PF.moteRate * dt;
            const n = Math.floor(this.moteAcc);
            this.moteAcc -= n;
            if (n > 0)
                this.run("motes", { ...at, n, col: fx_table_ts_1.PAL[PF.motes], k: PF.moteSize, dy: PF.rise, f: PF.motes === "ashEmber" ? 1 : 0 });
        }
    }
    // ---------------------------------------------------------------- 8. screen effects
    /** DAMAGE_TAKEN: the hit vignette from the shooter's side (relative to the view), stronger for bigger hits. */
    hitTaken(e, v) {
        const c = this.ctx, s = c.rendered().find((q) => q.id === e.b) ?? v?.entities.get(e.b);
        const k = Math.max(0.25, Math.min(1, (e.v1 + e.v2 * 0.5) / 40));
        if (!s) {
            this.screen.hit(0, k * 0.7);
            return;
        }
        const E = this.P.eye, dx = s.x - E[0], dz = s.z - E[2], R = this.camR, F = this.P.fwd;
        this.screen.hit(Math.atan2(dx * R[0] + dz * R[2], dx * F[0] + dz * F[2]), k);
    }
    screenFrame(now, dt) {
        const c = this.ctx, v = c.view(), me = c.me();
        this.P.flashK = this.screen.reduceFlashes ? 0.35 : 1;
        const veh = me && me.state === 0 && v ? v.entities.get(me.entity) : undefined;
        const hp = veh ? veh.hullFraction : me ? me.hp : 1;
        const emp = !!veh && this.emps.some((w) => Math.hypot(veh.x - w.x, veh.z - w.z) <= w.r);
        this.screen.update(now, dt, { started: c.started(), alive: !!me && me.state !== 2, hp, downed: !!me && me.state === 3, emp, scoped: c.scoped(), cmd: c.mode() === "cmd" || c.wire() > 0.5 });
        this.screen.apply();
    }
    // ---------------------------------------------------------------- 9. command view markers
    /** A marker ring for the tactical display (fx.ts rings: drawn there only; line colour 0 own, 1 enemy, 3 effects). */
    cmdMark(id, x, z, r0, r1, life, team, a0 = 1) {
        const c = this.ctx;
        c.fx().ring(x, c.height(x, z) + 0.5, z, r0, r1, life, team, a0);
        this.stats.byEffect[id] = (this.stats.byEffect[id] ?? 0) + 1;
    }
    cmdT = new Map();
    every(key, ms, now) { const t = this.cmdT.get(key) ?? 0; if (now - t < ms)
        return false; this.cmdT.set(key, now); return true; }
    cmdFrame(now) {
        const c = this.ctx, v = c.view(), team = this.myTeam(v);
        if (c.wire() <= 0.01 && c.mode() !== "cmd")
            return; // only while the tactical display shows
        for (const b of v?.calls?.beacons ?? [])
            if (this.every(`b${b.id}`, 1000, now))
                this.cmdMark("cmd-pip", b.x, b.z, 1, 7, 0.8, b.team === team ? 0 : 1, 0.9);
        for (const p of v?.points?.points ?? []) {
            if (!(p.captureTeam >= 0 && p.captureProgress > 0 && p.captureProgress < 1))
                continue;
            const P = c.pointPos(p.index);
            if (P && this.every(`p${p.index}`, 1500, now))
                this.cmdMark("cmd-ring", P[0], P[1], c.ringR, c.ringR * 0.25, 1.2, p.captureTeam === team ? 0 : 1, 0.8);
        }
        for (const p of this.passes) {
            const L = Math.hypot(p.x1 - p.x0, p.z1 - p.z0) || 1, f = Math.min(1, (now - p.start) / 1800), along = -120 + f * (L + 240);
            if (this.every(`l${p.start}`, 150, now))
                this.cmdMark("cmd-line", p.x0 + ((p.x1 - p.x0) / L) * along, p.z0 + ((p.z1 - p.z0) / L) * along, 1.5, 3, 1.4, 3, 0.9);
        }
        if (this.cmdT.size > 256)
            this.cmdT.clear();
    }
    /** Event markers: call impacts ring out to their radius, captures flash a ring, deaths are fx.ts's explosion rings. */
    cmdEvent(e, v) {
        const c = this.ctx, team = this.myTeam(v);
        if (e.kind === K.CALL_IMPACT) {
            const D = this.callDef(e.c);
            this.cmdMark("cmd-ring", e.v1, e.v2, 1, Math.max(8, D.r), 1.4, (e.team ?? team) === team ? 0 : 1, 1);
        }
        else if (e.kind === K.POINT && e.b === 2) {
            const P = c.pointPos(e.a);
            if (P) {
                this.cmdMark("cmd-ring", P[0], P[1], 4, c.ringR * 1.4, 1.6, e.c === team ? 0 : 1, 1);
            }
        }
        else if (e.kind === K.CALL_EFFECT && (e.flags & 15) === 0)
            this.cmdMark("cmd-pip", e.v1, e.v2, 0.5, 6, 0.6, 3, 0.9);
        else if (e.kind === K.SCAN)
            this.cmdMark("cmd-ring", e.v1, e.v2, 2, 150, 1.5, 0, 0.8);
    }
    /** Site positions (BUILD_ENDED names the site, which is gone from the snapshot by then). */
    sitePos = new Map();
    /** Ruling 106: burnt hulls burn hard for the first seconds, then smoulder while they sink away (nearest 8). */
    wreckFrame(_now) {
        const c = this.ctx, hs = c.hulks ? c.hulks() : [];
        if (!hs.length)
            return;
        const near = hs.map((h) => ({ h, d: Math.hypot(h.x - this.P.eye[0], h.z - this.P.eye[2]) })).filter((x) => x.d < 900).sort((a, b) => a.d - b.d).slice(0, 8);
        for (const { h } of near) {
            const f = h.age < 1.6 ? 1 : Math.max(0, 1 - (h.age - 1.6) / 3);
            if (f > 0.02)
                this.run("wreck-fire", { x: h.x, y: c.height(h.x, h.z), z: h.z, k: Math.min(4, 1.2 + c.cd.tRadius[h.type] * 0.6), f });
        }
    }
    /** Projectiles not drawn this frame have ended: a flak shell bursts in the air (if main.ts's impact did not claim it). */
    endProjectiles() {
        for (const [id, r] of this.projs) {
            if (r.frame >= this.frameNo)
                continue;
            this.projs.delete(id);
            if (fx_table_ts_1.WEAPON_FX[this.family(r.w)].tracer === "flak")
                this.run("flak-burst", { x: r.x, y: r.y, z: r.z, family: this.family(r.w), team: r.team });
        }
        this.shotEnds = this.shotEnds.filter((s) => s.frame >= this.frameNo - 1);
    }
    frame(now, dt) {
        const c = this.ctx;
        if (!c)
            return;
        const t0 = typeof performance !== "undefined" ? performance.now() : 0;
        this.frameNo++;
        this.nowMs = now;
        this.stats.frames++;
        const F = c.fx();
        if (F.ext !== this.ext)
            F.ext = this.ext; // a new match made a new Fx
        const e = c.eye(), m = c.viewM();
        this.P.eye = [e[0], e[1], e[2]];
        this.camR = [m[0], m[4], m[8]];
        this.camU = [m[1], m[5], m[9]];
        this.P.fwd = [-m[2], -m[6], -m[10]];
        this.P.update(dt * this.timeScale);
        this.endProjectiles();
        const v = c.view();
        if (v?.construction)
            for (const st of v.construction.sites)
                this.sitePos.set(st.id, { x: st.x, z: st.z, type: st.type });
        if (this.sitePos.size > 300)
            this.sitePos.clear();
        // the attached / state effects are not drawn in the tactical display: skip them there (events still spawn)
        const shaded = c.wire() < 0.99;
        if (shaded) {
            this.wreckFrame(now);
            this.vehicleFrame(now);
        }
        this.callFrame(now);
        if (shaded)
            this.worldFrame(now);
        this.weatherFrame(now, dt);
        this.screenFrame(now, dt);
        this.cmdFrame(now);
        // drop-in pods (PLAYER_JOINED): the re-entry trail over the Core, then the landing burst
        this.joins = this.joins.filter((j) => {
            const left = (j.land - now) / 1000, g = c.height(j.x, j.z);
            if (left <= 0) {
                this.run("pod-land", { x: j.x, y: g, z: j.z, ground: g });
                return false;
            }
            if (left <= 2.5) {
                const k = left / 2.5;
                this.run("pod-trail", { x: j.x, y: g + 320 * k * k + 1.2, z: j.z });
            }
            return true;
        });
        this.stats.frameMs = (typeof performance !== "undefined" ? performance.now() : 0) - t0;
    }
    fill() {
        if (this.filledFrame === this.frameNo)
            return;
        this.filledFrame = this.frameNo;
        const need = Math.min(this.P.alive + 4096, 8192) * fx_particles_ts_1.P2_FLOATS;
        if (this.bufA.length < need) {
            this.bufA = new Float32Array(need);
            this.bufAdd = new Float32Array(need);
        }
        const r = this.P.fill(this.bufA, this.bufAdd, this.bufDec);
        this.nA = r.a;
        this.nAdd = r.add;
        this.nDec = r.dec;
    }
    /** Ground decals (scorch, rings): drawn after the blob shadows, before the transparent passes. */
    drawDecals() {
        const c = this.ctx;
        if (!c || c.wire() >= 1)
            return;
        this.fill();
        c.R.drawP2(fx_particles_ts_1.PASS_DECAL, this.bufDec, this.nDec, this.camR, this.camU);
    }
    /** The alpha pass (smoke, dust, debris) then the additive pass (flash, fire, sparks, glows, tracers, beams). */
    draw() {
        const c = this.ctx;
        if (!c || c.wire() >= 1)
            return;
        this.fill();
        c.R.drawP2(fx_particles_ts_1.PASS_ALPHA, this.bufA, this.nA, this.camR, this.camU);
        c.R.drawP2(fx_particles_ts_1.PASS_ADD, this.bufAdd, this.nAdd, this.camR, this.camU);
        if (this.nDome)
            c.R.drawShields(this.domeBuf, this.nDome); // the shield bubble's faceted dome (render.ts shield shader)
    }
    state() {
        const s = this.P.stats;
        return { ...this.stats, byEffect: { ...this.stats.byEffect }, alive: s.alive, decals: s.decals, once: s.once, spawned: s.spawned, refused: s.refused, stolen: s.stolen, culled: s.culled, peak: s.peak,
            nearFaded: s.nearFaded, drawn: { alpha: s.drawnAlpha, add: s.drawnAdd, decal: s.drawnDecal }, byBand: s.byBand.slice(), reduceFlashes: this.screen.reduceFlashes,
            screen: { vig: this.screen.vig, low: this.screen.low, downed: this.screen.downed, emp: this.screen.emp, scope: this.screen.scope, flash: this.screen.flash, ...this.screen.stats } };
    }
}
exports.p2Fx = new P2Fx();
