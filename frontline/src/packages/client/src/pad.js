"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAD_BINDINGS = exports.Pad = void 0;
// Controller support (designer 21 Nov: "also add controller support"). Gamepad API, standard mapping (Xbox / PlayStation
// layouts). The pad drives the game through the same inputs the keyboard and mouse do: buttons become key and mouse
// button presses (so every action, panel and mode works unchanged), the left stick becomes W A S D, the right stick turns
// the view (the page applies it: Pad.look). Lessons taken from Ace of the Airways' controller bugs:
//  * a stick's rest point is learned from steady readings over the first 3 s, not the first frame, and re-learned after
//    2 s untouched; an axis parked at +-1 at rest (triggers reported as axes on some layouts) is ignored;
//  * a round dead zone (0.21 by default);
//  * every keyboard action has a pad binding, through the View button as a modifier where the face buttons run out;
//  * a pad press is not a browser gesture: sound cannot start from it, so the page is told once (onNeedGesture).
/** Standard-mapping button indices. */
const A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7, VIEW = 8, MENU = 9, L3 = 10, R3 = 11, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
/**
 * The bindings (shown in the controls panel). key: a KeyboardEvent code; mouse: a mouse button; wheel: a wheel step.
 * mod: only with View held (View tapped alone: Tab). lb: only with LB held (LB holds Z: the call code on the D-pad).
 */
exports.PAD_BINDINGS = [
    { b: RT, mouse: 0, what: "fire (LMB)" },
    { b: LT, mouse: 2, what: "scope / alt fire / cancel a call (RMB)" },
    { b: A, key: "Space", what: "jump · jetpack (hold) · hop · low flight" },
    { b: B, key: "KeyC", what: "crouch (hold) · land (aircraft)" },
    { b: X, key: "KeyF", what: "enter / leave a vehicle · use" },
    { b: Y, key: "KeyE", what: "interact (hold): revive, hack · eject" },
    { b: RB, key: "KeyG", what: "grenade · demo charge" },
    { b: LB, key: "KeyZ", what: "support calls (hold) + D-pad: the call code" },
    { b: L3, key: "ShiftLeft", what: "sprint · boost (on until the stick is let go)", latch: true },
    { b: R3, key: "KeyQ", what: "quick-command wheel (hold; the right stick picks)" },
    { b: LEFT, wheel: -1, what: "previous weapon" },
    { b: RIGHT, wheel: 1, what: "next weapon" },
    { b: UP, key: "KeyV", what: "call a ride" },
    { b: DOWN, key: "KeyT", what: "prone · swap to the gunner weapon" },
    { b: UP, key: "ArrowUp", lb: true, what: "call code ↑" },
    { b: DOWN, key: "ArrowDown", lb: true, what: "call code ↓" },
    { b: LEFT, key: "ArrowLeft", lb: true, what: "call code ←" },
    { b: RIGHT, key: "ArrowRight", lb: true, what: "call code →" },
    { b: VIEW, key: "Tab", tap: true, what: "map / command view (tap)" },
    { b: MENU, key: "Escape", what: "pause menu · close panels (start screen: deploy)" },
    { b: X, key: "KeyX", mod: true, what: "View + X: next seat / mount" },
    { b: Y, key: "KeyR", mod: true, what: "View + Y: cloak (hold) · rotate a building" },
    { b: B, key: "KeyN", mod: true, what: "View + B: decoy · scout pulse" },
    { b: A, key: "KeyK", mod: true, what: "View + A: call loadout" },
    { b: RB, key: "KeyP", mod: true, what: "View + RB: ping the squad" },
    { b: LB, key: "KeyY", mod: true, what: "View + LB: crew this (an AI pilot takes the vehicle)" },
    { b: UP, key: "KeyJ", mod: true, what: "View + ↑: production" },
    { b: DOWN, key: "KeyB", mod: true, what: "View + ↓: the building in reach" },
    { b: LEFT, key: "KeyH", mod: true, what: "View + ←: controls panel" },
    { b: RIGHT, key: "KeyM", mod: true, what: "View + →: mute" },
];
const KEY_NAMES = { Space: " ", Tab: "Tab", Escape: "Escape", ShiftLeft: "Shift", ArrowUp: "ArrowUp", ArrowDown: "ArrowDown", ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight" };
const keyOf = (code) => KEY_NAMES[code] ?? (code.startsWith("Key") ? code.slice(3).toLowerCase() : code);
class Pad {
    /** Round dead zone of the sticks (0..0.6). */
    deadzone = 0.21;
    /** Look speed (rad/s at full deflection). */
    lookSpeed = 2.8;
    invertY = false;
    connected = false;
    id = "";
    /** The pad was used last (input arrived from it after the mouse / keyboard's last input). */
    active = false;
    lastUse = 0;
    /** Per axis: rest point, learning (steady readings), ignored (parked at +-1), touched. */
    rest = [];
    ignored = [];
    steady = [];
    prev = [];
    touched = [];
    quiet = [];
    t0 = 0;
    down = new Set(); // bindings held now (index into PAD_BINDINGS)
    held = []; // buttons held now (raw)
    viewUsed = false; // View pressed with another button (no Tab on release)
    latched = new Set();
    moveKeys = new Set();
    /** The right stick this frame (after the dead zone, curved): the page turns the view by look.x / look.y * lookSpeed * dt. */
    look = { x: 0, y: 0 };
    /** The left stick (after the dead zone). */
    move = { x: 0, y: 0 };
    stats = { frames: 0, presses: 0, ignoredAxes: 0 };
    hooks;
    gestureTold = false;
    constructor(hooks) { this.hooks = hooks; }
    /** Reads the first connected pad; call once a frame. */
    poll(now) {
        const nav = globalThis.navigator;
        const pads = nav && nav.getGamepads ? nav.getGamepads() : [];
        let gp = null;
        for (const p of pads ?? [])
            if (p && p.connected) {
                gp = p;
                break;
            }
        if (!gp) {
            if (this.connected) {
                this.connected = false;
                this.releaseAll();
                this.hooks.notify?.("Controller disconnected.", "warn");
            }
            return;
        }
        if (!this.connected || this.id !== gp.id) {
            this.connected = true;
            this.id = gp.id;
            this.t0 = now;
            this.rest = [];
            this.ignored = [];
            this.steady = [];
            this.prev = [];
            this.touched = [];
            this.quiet = [];
            this.hooks.notify?.(`Controller connected: ${gp.id.slice(0, 40)}${gp.mapping === "standard" ? "" : " (non-standard layout: buttons may differ)"}. CONTROLS on the start screen lists the buttons.`, "info");
        }
        this.stats.frames++;
        const ax = this.axes(gp, now);
        // sticks: left = move, right = look
        const dz = (x, y) => {
            const m = Math.hypot(x, y);
            if (m < this.deadzone)
                return { x: 0, y: 0, m: 0 };
            const k = (Math.min(1, m) - this.deadzone) / (1 - this.deadzone) / m;
            return { x: x * k, y: y * k, m: Math.min(1, m) };
        };
        const L = dz(ax[0] ?? 0, ax[1] ?? 0), R = dz(ax[2] ?? 0, ax[3] ?? 0);
        this.move = { x: L.x, y: L.y };
        const curve = (v) => Math.sign(v) * v * v; // fine aim near the centre
        this.look = { x: curve(R.x), y: curve(R.y) * (this.invertY ? -1 : 1) };
        if (L.m > 0 || R.m > 0)
            this.used(now);
        this.moveKeysFrame(L);
        // buttons
        const pressed = (i) => {
            const b = gp.buttons[i];
            if (!b)
                return false;
            const v = typeof b === "object" ? b.value : b;
            const was = !!this.held[i];
            return i === LT || i === RT ? (was ? v > 0.35 : v > 0.55) : (typeof b === "object" ? b.pressed : v > 0.5); // trigger hysteresis
        };
        const now_ = [];
        for (let i = 0; i < Math.max(16, gp.buttons.length); i++)
            now_[i] = pressed(i);
        const view = !!now_[VIEW], lb = !!now_[LB];
        for (let i = 0; i < now_.length; i++) {
            if (now_[i] && !this.held[i]) {
                this.used(now);
                this.stats.presses++;
                this.press(i, view, lb);
            }
            else if (!now_[i] && this.held[i])
                this.release(i);
        }
        this.held = now_;
        // latch (sprint): let go when the left stick returns to the centre
        if (L.m === 0)
            for (const k of [...this.latched]) {
                this.latched.delete(k);
                this.key(k, false);
            }
    }
    /** Axis values with the learnt rest point taken off; parked axes read 0. */
    axes(gp, now) {
        const out = [];
        const learning = now - this.t0 < 3000;
        for (let i = 0; i < gp.axes.length; i++) {
            const v = gp.axes[i];
            const p = this.prev[i] ?? v;
            this.prev[i] = v;
            if (learning) {
                if (Math.abs(v - p) < 0.02) // steady reading
                    this.steady[i] = (this.steady[i] ?? 0) + 1;
                else
                    this.steady[i] = 0;
                if ((this.steady[i] ?? 0) >= 10) {
                    this.rest[i] = v;
                    if (Math.abs(v) > 0.9 && !this.ignored[i]) { // parked at +-1 at rest: a trigger on a non-standard layout
                        this.ignored[i] = true;
                        this.stats.ignoredAxes++;
                    }
                }
            }
            if (this.ignored[i]) {
                out[i] = 0;
                continue;
            }
            const r = this.rest[i] ?? 0, d = v - r;
            if (Math.abs(d) > 0.3)
                this.touched[i] = true;
            if (!this.touched[i]) { // untouched: 0 (a stick that reports a small offset before it is ever moved)
                out[i] = 0;
                continue;
            }
            // re-centre after 2 s at a steady small offset
            if (Math.abs(d) < 0.15 && Math.abs(v - p) < 0.01) {
                this.quiet[i] = (this.quiet[i] ?? now);
                if (now - this.quiet[i] > 2000)
                    this.rest[i] = v;
            }
            else
                this.quiet[i] = undefined;
            out[i] = Math.max(-1, Math.min(1, d));
        }
        return out;
    }
    used(now) {
        this.lastUse = now;
        if (!this.active) {
            this.active = true;
            this.hooks.activeChanged?.(true);
        }
        if (!this.gestureTold && this.hooks.needGesture?.()) {
            this.gestureTold = true;
            this.hooks.notify?.("Sound needs one click or key press in the page (the browser does not count a controller press).", "warn");
        }
    }
    /** The mouse or keyboard was used: the pad is not the active device (it still works at once). */
    otherInput() { if (this.active) {
        this.active = false;
        this.hooks.activeChanged?.(false);
    } }
    press(i, view, lb) {
        if (i === VIEW) {
            this.viewUsed = false;
            return;
        }
        if (view)
            this.viewUsed = true;
        if (i === MENU && this.hooks.onMenu?.())
            return; // the page used it (start screen: deploy)
        const bi = exports.PAD_BINDINGS.findIndex((x) => x.b === i && !x.tap && !!x.mod === view && (x.lb ? lb && !view : !(lb && !view && exports.PAD_BINDINGS.some((y) => y.b === i && y.lb))));
        if (bi < 0)
            return;
        const bd = exports.PAD_BINDINGS[bi];
        if (bd.latch && this.latched.has(bd.key)) { // the latch pressed again: off
            this.latched.delete(bd.key);
            this.key(bd.key, false);
            return;
        }
        this.down.add(bi);
        if (bd.mouse !== undefined)
            this.hooks.mouse(bd.mouse, true);
        else if (bd.wheel !== undefined)
            this.hooks.wheel(bd.wheel);
        else if (bd.key)
            this.key(bd.key, true);
        if (bd.latch) {
            this.latched.add(bd.key);
            this.down.delete(bi); // stays down until the stick is let go
        }
    }
    release(i) {
        if (i === VIEW) {
            if (!this.viewUsed) { // View tapped alone: Tab
                this.key("Tab", true);
                this.key("Tab", false);
            }
            return;
        }
        for (const bi of [...this.down]) {
            const bd = exports.PAD_BINDINGS[bi];
            if (bd.b !== i)
                continue;
            this.down.delete(bi);
            if (bd.mouse !== undefined)
                this.hooks.mouse(bd.mouse, false);
            else if (bd.key)
                this.key(bd.key, false);
        }
    }
    key(code, down) { this.hooks.key(code, keyOf(code), down); }
    /** Left stick -> W A S D (on at 0.5 of full deflection, off below 0.35). */
    moveKeysFrame(L) {
        const want = new Set();
        const on = (k, v) => { if (v > (this.moveKeys.has(k) ? 0.35 : 0.5))
            want.add(k); };
        on("KeyW", -L.y);
        on("KeyS", L.y);
        on("KeyA", -L.x);
        on("KeyD", L.x);
        for (const k of this.moveKeys)
            if (!want.has(k))
                this.key(k, false);
        for (const k of want)
            if (!this.moveKeys.has(k))
                this.key(k, true);
        this.moveKeys = want;
    }
    releaseAll() {
        for (const k of this.moveKeys)
            this.key(k, false);
        this.moveKeys.clear();
        for (const i of this.held.keys())
            if (this.held[i])
                this.release(i);
        for (const k of this.latched)
            this.key(k, false);
        this.latched.clear();
        this.held = [];
        this.look = { x: 0, y: 0 };
        this.move = { x: 0, y: 0 };
    }
}
exports.Pad = Pad;
