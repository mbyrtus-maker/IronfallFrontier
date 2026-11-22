// Two-process co-op test (after Ace of the Airways' co-op lessons, section 6): the real sim worker and the real Mp glue
// (mp.js: RemotePort, host relay, validation) on both sides, joined by a local TCP socket in place of WebRTC.
//   node tools/coop/coop_test.js host PORT     (background)
//   node tools/coop/coop_test.js guest PORT
// Each prints RESULT lines; the host also prints CHECK lines judged on its sim.
const net = require("net");
const { load, makeRequire } = require("../srcmap.js");
const ROOT = require("path").join(__dirname, "../../frontline");
const [, , role, portArg] = process.argv, PORT = Number(portArg || 47123);
const { SRC, DATA } = load(ROOT);
// --- page-ish globals the client modules touch
global.self = global;
global.localStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } };
global.document = { hidden: false, getElementById: () => null, createElement: () => ({ style: {}, classList: { add() { }, remove() { } }, appendChild() { } }), body: { dataset: {}, classList: { add() { }, remove() { } } } };
const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const result = (k, v) => console.log(`RESULT ${role} ${k} ${typeof v === "string" ? v : JSON.stringify(v)}`);
const check = (k, ok, v) => console.log(`CHECK ${ok ? "PASS" : "FAIL"} ${k}${v !== undefined ? " " + JSON.stringify(v) : ""}`);
// --- a Link over a socket: sendR (JSON + optional binary), sendU (binary), onr / onu
function socketLink(sock) {
    const L = { open: true, dead: false, ping: 12, stats: { sentR: 0, sentU: 0, recvR: 0, recvU: 0, since: performance.now() }, onr: null, onu: null, ondown: null,
        sendR(msg, bin) { if (!this.open) return; const line = JSON.stringify({ r: msg, b: bin ? Buffer.from(bin).toString("base64") : null }); this.stats.sentR += line.length; sock.write(line + "\n"); },
        sendU(b) { if (!this.open) return; const line = JSON.stringify({ u: Buffer.from(b).toString("base64") }); this.stats.sentU += line.length; sock.write(line + "\n"); },
        close() { this.open = false; sock.end(); }, down() { this.open = false; this.dead = true; this.ondown?.(); sock.end(); } };
    let buf = "";
    sock.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); const j = JSON.parse(line);
        if (j.u) L.onu?.(new Uint8Array(Buffer.from(j.u, "base64"))); else L.onr?.(j.r, j.b ? new Uint8Array(Buffer.from(j.b, "base64")) : undefined); } });
    sock.on("error", () => { }); // the other side finished first: the test ending, not a bug
    sock.on("close", () => { if (L.open) { L.open = false; L.ondown?.(); } });
    return L;
}
const { Mp } = req("packages/client/src/mp.js");
const B = req("packages/client/src/battles.js").battleOf("frontline");
const KIT = { role: "sniper", gun: "marksman", laser: false, grenade: "sticky", armour: "heavy", slot3: "flak-gun", calls: ["sentry-gun", "barrage"] };
function flatInit(kit) {
    const mapSize = B.scenario.mapSize, cell = 8, cols = Math.ceil(mapSize / cell) + 1, rows = cols;
    return { t: "init", data, planetId: B.planet, mapSize, seed: 11, heightmap: { cellSize: cell, cols, rows, heights: new Float64Array(cols * rows) }, units: 60, capped: false, scenario: "default", showcaseFire: false, difficulty: "normal", battle: "frontline", kit };
}
const exit = (code = 0) => setTimeout(() => process.exit(code), 200);
if (role === "host") {
    // the real worker in this process: its ctx is `self`
    const toPage = [];
    self.postMessage = (m) => toPage.push(m);
    req("packages/client/src/worker.js");
    const W = (m) => self.onmessage({ data: m });
    let mp, hostPilot = 0, ready = false, readyN = 0;
    const roster = [];
    mp = new Mp({ ice: [] }, { send: (m) => W(m), status: () => { }, notify: (t) => result("notify", t), roster: () => { }, ping: () => { }, startHosting: async () => hostPilot, welcomeInfo: () => ({ terrainSeed: 7, simSeed: 11, difficulty: "normal", cfg: { units: 60, scenario: "default", battle: "frontline" } }) });
    mp.role = "host"; mp.mySlot = 0; mp.pid = "hostpid"; mp.name = "Host"; mp.code = "test";
    mp.roster = [{ slot: 0, pid: "hostpid", name: "Host", online: true, host: true, pilotId: 0 }];
    setInterval(() => mp.sendLags(), 1000); // onHosting starts this timer in the game
    setInterval(() => { for (const m of toPage.splice(0)) {
        if (m.t === "ready") { ready = true; readyN++; hostPilot = m.pilotId; mp.roster[0].pilotId = m.pilotId; if (readyN === 2) mp.rejoinAll(); }
        else if (m.t === "gjoined" || m.t === "gsnap" || m.t === "gout" || m.t === "export") mp.fromWorker(m);
        else if (m.t === "error") { result("workerError", m.message.slice(0, 300)); }
    } }, 5);
    W(flatInit({ ...KIT, gun: "carbine", role: "assault", armour: "light" })); // the host's own kit differs from the guest's
    const srv = net.createServer((sock) => {
        const L = socketLink(sock);
        mp.guestUp(L);
        L.ondown = () => mp.guestDown(L);
    });
    srv.listen(PORT, () => result("listening", PORT));
    const sim = () => { let s = null; W({ t: "debug", reqId: 1, op: "__noop" }); return s; };
    // the sim itself, for the checks: the worker keeps it in a module variable; reach it through a debug export hook
    const inspect = () => { const m = req("packages/client/src/worker.js"); return m.__sim ? m.__sim() : null; };
    let phase = 0;
    setTimeout(() => {
        const s = inspect();
        if (!s) { result("noSimHook", "worker.js exports no __sim()"); exit(1); return; }
        const players = [...s.pilots.values()].filter((p) => p.player >= 0).map((p) => ({ id: p.id, player: p.player, state: p.state }));
        result("players", players);
        const g = players.find((p) => p.player === 1), h = players.find((p) => p.player === 0);
        check("guest has a pilot", !!g);
        if (g) { const gp = s.pilot(g.id), vs = gp.state === 0 ? s.idToSlot.get(gp.vehicle) : undefined;
            check("guest starts seated in its own Dart scout", vs !== undefined && s.d.typeIds[s.etype[vs]] === "dart" && gp.vehicle !== s.pilot(h.id).vehicle, { state: gp.state, type: vs !== undefined ? s.d.typeIds[s.etype[vs]] : null }); }
        if (g) {
            const k = s.fkit.kitOf(1), hk = s.fkit.kitOf(0);
            check("guest kit reached the host (marksman / sniper / heavy)", k.gun === "marksman" && k.role === "sniper" && k.armour === "heavy", k);
            check("host kit kept its own (carbine / assault / light)", hk.gun === "carbine" && hk.role === "assault" && hk.armour === "light", hk);
            check("guest lane choice is the guest's own (2), the host's untouched", s.fkit.laneOf.get(g.id) === 2 && s.fkit.laneOf.get(h.id) === undefined, { guest: s.fkit.laneOf.get(g.id), host: s.fkit.laneOf.get(h.id) });
            const eh = s.entity(h.state === 1 ? s.pilot(h.id).entity : s.pilot(h.id).vehicle), eg = s.entity(g.state === 1 ? s.pilot(g.id).entity : s.pilot(g.id).vehicle);
            const d = eh && eg ? Math.hypot(eh.x - eg.x, eh.z - eg.z) : -1;
            check("players do not start inside each other (> 2 m apart)", d > 2, { metres: Math.round(d * 10) / 10 });
            check("no validation refusals", mp.refused === 0, { refused: mp.refused });
            const lt = s.lagTicks?.get(g.id);
            check("the host judges the guest's shots with its lag (ping 12 ms: about 4 ticks)", lt >= 3 && lt <= 6, { lagTicks: lt });
            check("guest's resource priority reached the team", s.fkit.priority[0] === "gas", s.fkit.priority[0]);
            check("guest's lane request reached the team", s.fkit.requests[0].some((r) => r.lane === 0), s.fkit.requests[0].map((r) => r.lane));
        }
        // a new match (Play again): the host's page sends init again; the guest must join the new sim with its kit
        W(flatInit({ ...KIT, gun: "carbine", role: "assault", armour: "light" }));
        setTimeout(() => {
            const s2 = inspect();
            const g2 = [...s2.pilots.values()].find((p) => p.player === 1);
            check("after Play again the guest is in the new match", !!g2 && s2 !== s);
            if (g2) check("after Play again the guest kept its kit", s2.fkit.kitOf(1).gun === "marksman", s2.fkit.kitOf(1));
            setTimeout(() => exit(0), 6000);
        }, 6000);
    }, 9000);
}
else {
    let port = null, frames = 0, flSeen = 0, welcomes = 0, restarted = 0, pilotIds = new Set(), lastPilot = 0;
    const mp = new Mp({ ice: [] }, { send: () => { }, status: () => { }, notify: (t) => result("notify", t), roster: () => { }, ping: () => { },
        beginGuest: (p, w) => { port = p; welcomes++; result("welcome", { slot: w.slot, pilotId: w.pilotId });
            p.onmessage = (e) => { const m = e.data; if (m.t === "snap") { frames++; lastPilot = m.host.pilotId; pilotIds.add(m.host.pilotId); if (m.fl) flSeen++; } };
            p.postMessage(flatInit(KIT)); // the page's sendInit: the start card's kit rides along
            setTimeout(() => p.postMessage({ t: "flLane", lane: 2 }), 1500); // respawn lane choice
            setTimeout(() => { p.postMessage({ t: "flPriority", p: "gas" }); p.postMessage({ t: "flRequest", lane: 0 }); p.postMessage({ t: "flGiveUp" }); p.postMessage({ t: "flSwap", mount: 0 }); }, 2500); // team asks, give-up, cell swap
        },
        guestRestart: (w) => { restarted++; result("restart", { pilotId: w.pilotId }); } });
    mp.role = "connecting"; mp.pid = "guestpid"; mp.name = "Guest"; mp.code = "test";
    const sock = net.connect(PORT, "127.0.0.1", () => { const L = socketLink(sock); mp.hostUp(L); });
    setTimeout(() => { result("frames", frames); result("flFrames", flSeen); check("guest receives snapshots", frames > 20, frames); check("guest gets the Frontline HUD state", flSeen > 5, flSeen); }, 9000);
    setTimeout(() => { result("restarts", restarted); check("guest followed the host's Play again", restarted === 1, restarted); check("frames on the new pilot", pilotIds.size >= 2, [...pilotIds]); exit(0); }, 15500);
}
