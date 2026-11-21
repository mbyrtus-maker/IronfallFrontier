"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenFx = exports.SCREEN_IDS = void 0;
// P2 effects pass: screen effects, as one DOM layer between the canvas and the HUD (CSS gradients only, no images; the
// EMP static is a small noise tile drawn into a 2D canvas at install). The state is plain numbers updated by update(),
// so Node tests drive it without a DOM; apply() writes the styles, and only when a value changed.
//  * hit vignette with direction: red at the screen edge the hit came from (DAMAGE_TAKEN), fading in ~0.6 s;
//  * low-health pulse: red edges pulsing faster as health falls under 35 %;
//  * downed: the view greyed and darkened (backdrop filter, only while downed);
//  * EMP static: noise and scan bands flickering while the own vehicle sits in an EMP;
//  * scope vignette: a soft inner shadow and lens tint inside the long rifle's scope;
//  * near-explosion flash and shake: a warm flash and a camera shake by distance and size.
// "Reduce flashes" (pause menu checkbox, remembered per browser): no screen flash, lightning dimmed, shake x0.3,
// effect flashes (fx-particles flashK) x0.35.
const fx_table_ts_1 = require("./fx-table.js");
exports.SCREEN_IDS = ["hit-vignette", "low-health", "downed-screen", "emp-static", "scope-vignette", "near-flash", "shake"];
class ScreenFx {
    reduceFlashes = false;
    /** outputs (0..1), read by apply() and the tests */
    vig = 0;
    vigX = 50;
    vigY = 50;
    low = 0;
    downed = 0;
    emp = 0;
    scope = 0;
    flash = 0;
    hits = [];
    flashV = 0;
    now = 0;
    stats = { hits: 0, flashes: 0, shakes: 0, maxVig: 0, maxFlash: 0 };
    /** A hit on the player: ang = direction of the shooter relative to the view (radians, 0 ahead, +pi/2 to the right); k 0..1 strength. */
    hit(ang, k) { this.hits.push({ ang, k: Math.min(1, Math.max(0.2, k)), t: this.now }); if (this.hits.length > 8)
        this.hits.shift(); this.stats.hits++; }
    /** An explosion at distance d (m) of size s (m): sets the flash, returns the camera shake (0..1). */
    blast(d, s) {
        const reach = 12 + s * 7;
        if (d > reach * 2.5)
            return 0;
        const k = Math.min(1, (s / 6) * Math.max(0, 1 - d / (reach * 2.5)) ** 2 * 2.2);
        if (!this.reduceFlashes && d < reach) {
            this.flashV = Math.max(this.flashV, Math.min(fx_table_ts_1.CAPS.flashMax, k * 0.5));
            this.stats.flashes++;
        }
        if (k > 0.02)
            this.stats.shakes++;
        return k * (this.reduceFlashes ? 0.3 : 1);
    }
    update(nowMs, dt, I) {
        this.now = nowMs;
        const on = I.started && !I.cmd;
        // hit vignette: the strongest recent hit sets the direction; strength fades over 600 ms
        let best = null, bk = 0;
        this.hits = this.hits.filter((h) => nowMs - h.t < 700);
        for (const h of this.hits) {
            const k = h.k * Math.max(0, 1 - (nowMs - h.t) / 650);
            if (k > bk) {
                bk = k;
                best = h;
            }
        }
        this.vig = on && best ? Math.min(fx_table_ts_1.CAPS.vignetteMax, bk * fx_table_ts_1.CAPS.vignetteMax) : 0;
        if (best) {
            this.vigX = 50 - Math.sin(best.ang) * 32;
            this.vigY = 50 + Math.cos(best.ang) * 32;
        }
        // low health: under 35 %, pulsing (faster when lower); not while downed (that has its own look)
        const lowK = I.alive && !I.downed && I.hp < 0.35 ? (0.35 - I.hp) / 0.35 : 0;
        const rate = 1.2 + 2.2 * lowK;
        this.low = on ? lowK * (0.55 + 0.45 * Math.sin((nowMs / 1000) * rate * Math.PI * 2)) * 0.5 : 0;
        this.downed += ((on && I.downed ? 1 : 0) - this.downed) * Math.min(1, dt * 3);
        this.emp = on && I.emp ? 0.5 + 0.5 * Math.random() : 0;
        this.scope = on && I.scoped ? 1 : 0;
        this.flash = on ? this.flashV : 0;
        this.flashV *= Math.exp(-dt * 9);
        if (this.flashV < 0.004)
            this.flashV = 0;
        this.stats.maxVig = Math.max(this.stats.maxVig, this.vig);
        this.stats.maxFlash = Math.max(this.stats.maxFlash, this.flash);
    }
    // ---------------------------------------------------------------- DOM
    root = null;
    L = {};
    last = {};
    noise = "";
    /** Creates the layer (between the canvas and the HUD), the style rules and the pause-menu checkbox. */
    install(D, store) {
        try {
            this.reduceFlashes = store?.getItem("ironfall.reduceFlashes") === "1";
        }
        catch { /* sandboxed */ }
        if (!D)
            return;
        try {
            const st = D.createElement("style");
            st.textContent = `#p2screen, #p2screen > div { position: fixed; inset: 0; pointer-events: none; }
#p2screen > div { opacity: 0; }
#p2screen .p2low { background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(150,14,8,0.85) 100%); }
#p2screen .p2down { background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.15) 30%, rgba(10,0,0,0.75) 100%); backdrop-filter: grayscale(0.85) brightness(0.7); -webkit-backdrop-filter: grayscale(0.85) brightness(0.7); display: none; }
#p2screen .p2emp { background-blend-mode: screen; mix-blend-mode: screen; }
#p2screen .p2scope { background: radial-gradient(circle at center, rgba(20,40,30,0.0) 0, rgba(20,40,30,0.0) 28vh, rgba(0,0,0,0.55) 37vh); }
#p2screen .p2flash { background: radial-gradient(ellipse at 50% 55%, rgba(255,236,200,0.9) 0%, rgba(255,190,120,0.5) 60%, rgba(255,160,90,0.2) 100%); }
body.p2-noflash.wx-flash #view { filter: brightness(1.2) !important; }
body.wx-dust #hud::before, body.wx-ash #hud::before, body.wx-rain #hud::before { display: none; } /* P2: world particles replace the CSS stripes */`;
            D.body.appendChild(st);
            const root = D.createElement("div");
            root.id = "p2screen";
            for (const k of ["vig", "low", "down", "emp", "scope", "flash"]) {
                const d = D.createElement("div");
                d.className = `p2${k}`;
                root.appendChild(d);
                this.L[k] = d;
            }
            const view = D.getElementById("view");
            const par = view?.parentElement;
            if (view && par?.insertBefore && view.nextSibling !== undefined)
                par.insertBefore(root, view.nextSibling);
            else {
                root.style.zIndex = "1";
                D.body.appendChild(root);
            }
            this.root = root;
            // the EMP static: a 96 px noise tile drawn once
            const c = D.createElement("canvas");
            c.width = 96;
            c.height = 96;
            const g = c.getContext("2d");
            if (g && typeof g.createImageData === "function") {
                const im = g.createImageData(96, 96);
                for (let i = 0; i < im.data.length; i += 4) {
                    const v = Math.random() < 0.5 ? 0 : 140 + Math.random() * 115;
                    im.data[i] = v * 0.8;
                    im.data[i + 1] = v * 0.9;
                    im.data[i + 2] = v;
                    im.data[i + 3] = 255;
                }
                g.putImageData(im, 0, 0);
                this.noise = typeof c.toDataURL === "function" ? c.toDataURL() : "";
            }
            if (this.noise)
                this.L.emp.style.backgroundImage = `url(${this.noise}), repeating-linear-gradient(0deg, rgba(120,160,255,0.18) 0 2px, rgba(0,0,0,0) 2px 7px)`;
            D.body.classList.toggle("p2-noflash", this.reduceFlashes);
            // the pause-menu checkbox (its own small block in the pause card)
            const card = D.getElementById("pause")?.querySelector(".card");
            if (card && typeof card.appendChild === "function") {
                const row = D.createElement("label");
                row.id = "p2flashes";
                row.style.cssText = "display:block;margin-top:8px;font-size:13px;opacity:0.9;cursor:pointer;pointer-events:auto";
                const box = D.createElement("input");
                box.type = "checkbox";
                box.checked = this.reduceFlashes;
                box.id = "p2flashBox";
                box.addEventListener("change", () => this.setReduce(!!box.checked, D, store));
                row.appendChild(box);
                const t = D.createElement("span");
                t.textContent = " Reduce flashes (screen flash, lightning, shake)";
                row.appendChild(t);
                card.appendChild(row);
            }
        }
        catch { /* the page keeps working without the layer */ }
    }
    setReduce(on, D, store) {
        this.reduceFlashes = on;
        try {
            store?.setItem("ironfall.reduceFlashes", on ? "1" : "0");
        }
        catch { /* sandboxed */ }
        D?.body.classList.toggle("p2-noflash", on);
    }
    set(k, prop, v) { const key = k + prop; if (this.last[key] === v)
        return; this.last[key] = v; const el = this.L[k]; if (el)
        el.style[prop] = v; }
    apply() {
        if (!this.root)
            return;
        const o = (v) => (v < 0.01 ? "0" : v.toFixed(2));
        this.set("vig", "opacity", o(this.vig));
        if (this.vig > 0.01)
            this.set("vig", "background", `radial-gradient(ellipse at ${this.vigX.toFixed(0)}% ${this.vigY.toFixed(0)}%, rgba(0,0,0,0) 45%, rgba(170,16,10,0.95) 100%)`);
        this.set("low", "opacity", o(this.low));
        this.set("down", "display", this.downed > 0.02 ? "block" : "none");
        this.set("down", "opacity", o(this.downed));
        this.set("emp", "opacity", o(this.emp * 0.3));
        if (this.emp > 0)
            this.set("emp", "backgroundPosition", `${Math.floor(Math.random() * 96)}px ${Math.floor(Math.random() * 96)}px, 0 ${Math.floor(Math.random() * 7)}px`);
        this.set("scope", "opacity", o(this.scope));
        this.set("flash", "opacity", o(this.flash));
    }
}
exports.ScreenFx = ScreenFx;
