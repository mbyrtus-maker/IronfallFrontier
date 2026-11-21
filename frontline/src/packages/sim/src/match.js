"use strict";
// Match state (stage 2 s7; CONTRACTS ruling 30, design doc 3 fail conditions): a team whose last Command Core is
// destroyed loses; when one team (or none) is left standing the match is over. Active only when createSim gets
// `match` (SimOptions.match: a scenario that declares its teams); a sim without it never creates this object and
// behaves (and hashes) exactly as before, so sandbox tests that destroy a Core keep running.
//
// Model:
//   config  teams in the match (bitmask), and per team whether a sim-side enemy commander (enemy-ai.ts) plays it and
//           at which difficulty (a constants.enemyAi.difficulties key). Static, from the scenario.
//   state   phase (MP_RUNNING / MP_OVER), winner (team, or -1 = nobody: every remaining Core died in the same tick),
//           overTick (tick the match ended, 0 while running), eliminated (bitmask of teams that lost their last Core).
// Check: removeDead marks `coreDied` when a structure with effects.supplySource leaves the world (scratch: set and
// cleared inside one step). At the end of that step every team of the match that has no live Core is eliminated;
// when at most one team is left the match is over: MATCH_OVER event (a winner, b loser bitmask), phase in every
// viewer's snapshot. A team that never had a Core is only judged when some Core dies. After the match is over the
// sim keeps stepping but refuses orders, production, rally and harvest inputs ("matchOver") and the enemy commander
// stops thinking.
// Hash: the match section enters the state hash only when a team is AI-controlled or the match is over, so a scenario
// with no AI team hashes exactly as a sim without match rules while it runs.
// s13: `objectives` (objectives.ts: one primary, optional side objectives) and the enemy Director's state (enemy-ai.ts
// Director: phase, phase start, waves sent, per AI team) live here too; a match with objectives is always hashed.
// `reason` (objectives.ts MR_*) says why the match ended; `players` (human players, 1-4, default 2 = the neutral row of
// constants.coop.scaling) scales the Director.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Match = exports.MATCH_PHASE_NAMES = exports.MP_OVER = exports.MP_RUNNING = void 0;
const objectives_ts_1 = require("./objectives.js");
exports.MP_RUNNING = 0, exports.MP_OVER = 1;
exports.MATCH_PHASE_NAMES = ["running", "over"];
const MAXT = 4; // = MAX_TEAMS (sim.ts)
class Match {
    def;
    defJson;
    /** Bitmask of teams in the match. */
    teamMask;
    /** Bitmask of AI-controlled teams. */
    aiMask;
    /** Difficulty key per team ("" for human teams). */
    difficulty;
    phase = exports.MP_RUNNING;
    winner = -1;
    overTick = 0;
    eliminated = 0;
    /** Scratch (never between steps): a Command Core was removed this step. */
    coreDied = false;
    /** s13: why the match ended (MR_*). */
    reason = objectives_ts_1.MR_NONE;
    /** s13: mission objectives (null without). Created by initObjectives once the sim's points exist. */
    objectives = null;
    /** s13: human players (Director scaling). w2f: changed by drop-in / drop-out (coop.ts) or Sim.setPlayerCount. */
    players;
    /** w2f: the player count given at creation (hashed only once players differs from it). */
    players0;
    /** s13: per type 1 = Command Core (set by the sim). */
    coreType = new Uint8Array(0);
    /** s13 Director state per team (enemy-ai.ts): phase index, tick the phase started, pressure waves sent. */
    dirPhase = new Int32Array(MAXT).fill(-1);
    dirStart = new Int32Array(MAXT);
    dirWaves = new Int32Array(MAXT);
    constructor(def, defaultDifficulty, difficulties) {
        if (!def || !Array.isArray(def.teams) || def.teams.length < 2)
            throw new Error("match: give at least two teams");
        let tm = 0, am = 0;
        const diff = new Array(MAXT).fill("");
        const teams = [];
        for (const t of def.teams) {
            if (!Number.isInteger(t.team) || t.team < 0 || t.team >= MAXT)
                throw new Error(`match: team ${t.team} out of range`);
            if (tm & (1 << t.team))
                throw new Error(`match: team ${t.team} listed twice`);
            tm |= 1 << t.team;
            const ai = t.ai === true;
            if (ai) {
                am |= 1 << t.team;
                const dk = t.difficulty ?? defaultDifficulty;
                if (!difficulties.includes(dk))
                    throw new Error(`match: unknown difficulty ${dk} (data has: ${difficulties.join(", ")})`);
                diff[t.team] = dk;
            }
            teams.push(ai ? { team: t.team, ai: true, difficulty: diff[t.team] } : { team: t.team });
        }
        teams.sort((a, b) => a.team - b.team);
        const players = def.players ?? 2;
        if (!Number.isInteger(players) || players < 1 || players > 4)
            throw new Error(`match: players ${def.players} must be 1-4`);
        this.players = players;
        this.players0 = players;
        this.def = { teams };
        if (def.players !== undefined)
            this.def.players = players;
        if (def.objectives)
            this.def.objectives = def.objectives;
        this.defJson = JSON.stringify(this.def);
        this.teamMask = tm;
        this.aiMask = am;
        this.difficulty = diff;
    }
    /** w2f: sets the player count (1-4) the Director and the enemy income use. */
    setPlayers(n) {
        if (!Number.isInteger(n) || n < 1 || n > 4)
            throw new Error(`match: players ${n} must be 1-4`);
        this.players = n;
    }
    get over() { return this.phase === exports.MP_OVER; }
    isAi(team) { return (this.aiMask & (1 << team)) !== 0; }
    inMatch(team) { return (this.teamMask & (1 << team)) !== 0; }
    /** s13: builds the objectives (needs the sim's points); default team = the first human team, else the first team. */
    initObjectives(sim) {
        if (!this.def.objectives)
            return;
        const human = this.teams().find((t) => !this.isAi(t));
        this.objectives = new objectives_ts_1.Objectives(this.def.objectives, sim, human ?? this.teams()[0]);
    }
    /** s13: ends the match by an objective (winner -1 = nobody). */
    endBy(reason, winner, tick) {
        if (this.phase !== exports.MP_RUNNING)
            return;
        this.phase = exports.MP_OVER;
        this.winner = winner;
        this.overTick = tick;
        this.reason = reason;
    }
    /** s13: the objectives' once-per-second evaluation; returns the MR_* reason when it ended the match. */
    evaluateObjectives(sim, emit) {
        const O = this.objectives;
        if (!O || this.phase !== exports.MP_RUNNING)
            return objectives_ts_1.MR_NONE;
        const r = O.evaluate(sim, emit);
        if (r === objectives_ts_1.MR_NONE)
            return r;
        const team = O.primary.team;
        let winner = team;
        if (r !== objectives_ts_1.MR_OBJECTIVE_DONE) {
            const others = this.teams().filter((t) => t !== team);
            winner = others.length === 1 ? others[0] : -1;
        }
        this.endBy(r, winner, sim.tick);
        return r;
    }
    teams() { const r = []; for (let t = 0; t < MAXT; t++)
        if (this.teamMask & (1 << t))
            r.push(t); return r; }
    /**
     * End-of-step check after a Core died: coreTeams = bitmask of teams that still have a live Core. Returns true when
     * the match ended in this call.
     */
    judge(coreTeams, tick) {
        this.coreDied = false;
        if (this.phase !== exports.MP_RUNNING)
            return false;
        this.eliminated |= this.teamMask & ~coreTeams;
        const left = this.teamMask & ~this.eliminated;
        let n = 0, last = -1;
        for (let t = 0; t < MAXT; t++)
            if (left & (1 << t)) {
                n++;
                last = t;
            }
        if (n > 1)
            return false;
        this.phase = exports.MP_OVER;
        this.winner = n === 1 ? last : -1;
        this.overTick = tick;
        this.reason = objectives_ts_1.MR_CORE;
        return true;
    }
    /** The match section of the state hash is written only while this is true. */
    hashed() { return this.aiMask !== 0 || this.phase !== exports.MP_RUNNING || this.eliminated !== 0 || this.objectives !== null || this.players !== this.players0; }
    hash(word, str) {
        str(this.defJson);
        word(this.phase);
        word(this.winner);
        word(this.overTick);
        word(this.eliminated);
        // s13 (only when used, so s7 hashes are unchanged): reason, objectives, Director
        if (this.objectives || this.reason > objectives_ts_1.MR_CORE) {
            word(this.reason);
            this.objectives?.hash(word);
        }
        if (this.players !== this.players0)
            word(0x9a7e00 + this.players); // w2f (only when changed, so earlier hashes stand)
        if (this.dirPhase.some((v) => v >= 0))
            for (let t = 0; t < MAXT; t++) {
                word(this.dirPhase[t]);
                word(this.dirStart[t]);
                word(this.dirWaves[t]);
            }
    }
    exportTo(w) {
        w.u8(this.phase);
        w.i32(this.winner);
        w.i32(this.overTick);
        w.u8(this.eliminated);
        w.u8(this.reason);
        for (let t = 0; t < MAXT; t++) {
            w.i32(this.dirPhase[t]);
            w.i32(this.dirStart[t]);
            w.i32(this.dirWaves[t]);
        }
        w.u8(this.players); // w2f (state v18)
        this.objectives?.exportTo(w);
    }
    restoreFrom(r) {
        this.phase = r.u8();
        this.winner = r.i32();
        this.overTick = r.i32();
        this.eliminated = r.u8();
        this.reason = r.u8();
        for (let t = 0; t < MAXT; t++) {
            this.dirPhase[t] = r.i32();
            this.dirStart[t] = r.i32();
            this.dirWaves[t] = r.i32();
        }
        this.players = r.u8(); // w2f
        this.objectives?.restoreFrom(r);
    }
    view() {
        const ai = [];
        for (let t = 0; t < MAXT; t++)
            if (this.aiMask & (1 << t))
                ai.push(t);
        return { phase: this.phase, phaseName: exports.MATCH_PHASE_NAMES[this.phase], winner: this.winner, overTick: this.overTick, eliminated: this.eliminated, teams: this.teams(), aiTeams: ai,
            reason: this.reason, reasonName: objectives_ts_1.MATCH_REASON_NAMES[this.reason], objectives: this.objectives ? this.objectives.view() : [], director: Array.from(this.dirPhase) };
    }
}
exports.Match = Match;
