"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Weather = exports.WX_PHASE_NAMES = exports.WX_ENDED = exports.WX_STARTED = exports.WX_FORECAST = void 0;
const prng_ts_1 = require("./prng.js");
/** WEATHER event phases (EV.WEATHER b). */
exports.WX_FORECAST = 0, exports.WX_STARTED = 1, exports.WX_ENDED = 2;
exports.WX_PHASE_NAMES = ["forecast", "started", "ended"];
class Weather {
    def;
    defJson;
    ids;
    sched;
    forecastTicks;
    fx;
    clearFx;
    /** Entry in force at the last update (-1 clear) and its effects. Derived from the tick (not state). */
    cur = -1;
    e;
    constructor(def, data, planetId, seed, tickRate) {
        const wj = data.weather;
        if (!wj || !Array.isArray(wj.weather))
            throw new Error("weather: the data has no weather.json");
        if (!def || !Array.isArray(def.entries))
            throw new Error("weather: schedule needs entries");
        this.def = def;
        this.defJson = JSON.stringify(def);
        const list = wj.weather;
        this.ids = list.map((w) => w.id);
        const mk = (ef) => ({
            det: num(ef.detectionMultiplier, 1), vis: num(ef.visualDetectionMultiplier, 1), cap: num(ef.sightRangeMetres, Infinity),
            radarBlind: ef.radarBlind === true, air: num(ef.aircraftSpeedMultiplier, 1), soft: ef.softGroundEverywhere === true,
            grounded: ef.aircraftGrounded === true, hide: num(ef.hidesSignaturesBelow, 0), shieldsOff: ef.shieldsOffline === true,
            shieldRegen: num(ef.shieldRechargeMultiplier, 1), orbitalOff: ef.orbitalCallsUnavailable === true,
            pilotDps: num(ef.pilotsOutsideDamagePerSecond, 0), explosive: 1 + num(ef.fireAndExplosiveDamageBonus, 0),
        });
        this.fx = list.map((w) => mk(w.effects ?? {}));
        this.clearFx = mk({});
        this.e = this.clearFx;
        this.forecastTicks = Math.round(num(wj.forecastWarningSeconds, 0) * tickRate);
        const rng = new prng_ts_1.Prng(seed, 0x3ea7e2);
        const sched = [];
        let prevEnd = 0;
        def.entries.forEach((en, i) => {
            const w = this.ids.indexOf(en.weather);
            if (w < 0)
                throw new Error(`weather entry ${i}: unknown weather ${en.weather} (weather.json has ${this.ids.join(", ")})`);
            const pl = list[w].planets;
            if (Array.isArray(pl) && !pl.includes(planetId))
                throw new Error(`weather entry ${i}: ${en.weather} does not occur on ${planetId} (weather.json planets: ${pl.join(", ")})`);
            if (!(en.startSeconds >= 0))
                throw new Error(`weather entry ${i}: startSeconds must be >= 0`);
            const jit = en.jitterSeconds ?? 0, r1 = rng.next(), r2 = rng.next(); // two draws per entry, always (stable stream)
            let dur = en.durationSeconds ?? NaN;
            if (en.durationSeconds === undefined) {
                const range = list[w].durationSeconds;
                if (!Array.isArray(range))
                    throw new Error(`weather entry ${i}: ${en.weather} has no duration range; give durationSeconds`);
                dur = range[0] + (range[1] - range[0]) * r2;
            }
            if (!(dur > 0))
                throw new Error(`weather entry ${i}: duration must be > 0`);
            let start = Math.round((en.startSeconds + jit * r1) * tickRate);
            if (start < prevEnd)
                start = prevEnd;
            const end = start + Math.max(1, Math.round(dur * tickRate));
            sched.push({ w, start, end, forecast: Math.max(prevEnd, start - this.forecastTicks) });
            prevEnd = end;
        });
        this.sched = sched;
    }
    /** Sets the entry in force at `tick` (call before the tick's rules read the weather). */
    update(tick) {
        let c = -1;
        for (let i = 0; i < this.sched.length; i++) {
            const s = this.sched[i];
            if (tick >= s.start && tick < s.end) {
                c = i;
                break;
            }
            if (s.start > tick)
                break;
        }
        this.cur = c;
        this.e = c < 0 ? this.clearFx : this.fx[this.sched[c].w];
    }
    /** Events due at `tick`: calls emit(weatherIndex, phase, ticks, entry). */
    events(tick, emit) {
        for (let i = 0; i < this.sched.length; i++) {
            const s = this.sched[i];
            if (s.forecast === tick && s.forecast < s.start)
                emit(s.w, exports.WX_FORECAST, s.start - tick, i);
            if (s.start === tick)
                emit(s.w, exports.WX_STARTED, s.end - s.start, i);
            if (s.end === tick)
                emit(s.w, exports.WX_ENDED, 0, i);
        }
    }
    soft() { return this.e.soft; }
    aircraftSpeed() { return this.e.air; }
    /** Visual sensor range under the current weather. */
    visual(r) { const v = r * this.e.det * this.e.vis; return v < this.e.cap ? v : this.e.cap; }
    radar(r) { return this.e.radarBlind ? 0 : r * this.e.det; }
    view(tick) {
        let index = this.ids.indexOf("clear"), ticksLeft = 0, next = null, nextIndex = -1, ticksUntil = 0;
        for (let i = 0; i < this.sched.length; i++) {
            const s = this.sched[i];
            if (tick >= s.start && tick < s.end) {
                index = s.w;
                ticksLeft = s.end - tick;
            }
            else if (s.start > tick) {
                if (tick >= s.forecast) {
                    next = this.ids[s.w];
                    nextIndex = s.w;
                    ticksUntil = s.start - tick;
                }
                break;
            }
        }
        return { current: index >= 0 ? this.ids[index] : "clear", index, ticksLeft, next, nextIndex, ticksUntil };
    }
    hash(_word, _num, str) { str(this.defJson); }
}
exports.Weather = Weather;
function num(v, d) { return typeof v === "number" ? v : d; }
