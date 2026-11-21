const { load, makeRequire } = require("../srcmap.js");
const { SRC, DATA } = load(require("path").join(__dirname, "../..", "frontline")); const req = makeRequire(SRC);
const data = req("data/load.mjs").loadDataSync((n) => DATA[n]);
const P = req("packages/sim/src/progression.js"), PF = req("packages/client/src/profile.js");
const R = P.progressionRules(data.progression ? data : (data.raw ?? data));
const prof = {"version": 1, "xp": 7600, "rank": 6, "tokens": 5, "unlocks": {"vehicleWeapons": [], "pilotWeapons": [], "pilotGear": [], "calls": ["precision-strike", "resupply-pod", "sensor-sweep", "sentry-gun", "smoke-screen", "shield-bubble", "scout-drop"], "flGuns": ["shotgun"]}, "mastery": {}, "salvage": 0, "golds": [], "blueprints": []};
console.log(!!R.fl, PF.checkProfile ? PF.checkProfile(R, prof) : Object.keys(PF));
try { console.log(P.validateLoadout(R, { player: 0, profile: prof }, "pilot-carbine")); } catch (e) { console.log("validate threw", e.message); }
