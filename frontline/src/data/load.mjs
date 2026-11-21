"use strict";
// Shared data loader (CONTRACTS.md revision 2). Pure: no Node imports, so it also runs in a browser.
//
//   import { loadData } from "./load.mjs";
//   const data = await loadData((name) => fs.promises.readFile(new URL(name, dirUrl), "utf8"));
//   // or synchronously: loadDataSync((name) => fs.readFileSync(path.join(dir, name), "utf8"))
//
// `readFile(name)` receives a bare file name such as "units.json" and returns its text (or a Promise of it).
// The result has the camelCase keys of the file names. Light structural checks only; the full checks
// (closed schema, references, doc values, balance) live in validate.mjs.

const DATA_FILES = Object.freeze({
  constants: "constants.json",
  planets: "planets.json",
  damageMatrix: "damage-matrix.json",
  weapons: "weapons.json",
  units: "units.json",
  buildings: "buildings.json",
  points: "points.json",
  supportCalls: "support-calls.json",
  progression: "progression.json",
  weather: "weather.json",
  terrain: "terrain.json",
});

const ARRAY_FILES = new Set(["planets", "weapons", "units", "buildings"]);

class DataLoadError extends Error {
  constructor(problems) {
    super(`data/ failed to load (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n  - ${problems.join("\n  - ")}`);
    this.name = "DataLoadError";
    this.problems = problems;
  }
}

function parseAll(texts) {
  const problems = [];
  const data = {};
  for (const [key, file] of Object.entries(DATA_FILES)) {
    const text = texts[key];
    if (typeof text !== "string") { problems.push(`${file}: readFile did not return text`); continue; }
    try { data[key] = JSON.parse(text); } catch (e) { problems.push(`${file}: invalid JSON (${e.message})`); }
  }
  if (!problems.length) problems.push(...structuralProblems(data));
  if (problems.length) throw new DataLoadError(problems);
  return data;
}

/** Light structural checks: right top-level shapes, unique ids, ids that resolve. */
function structuralProblems(data) {
  const p = [];
  for (const [key, file] of Object.entries(DATA_FILES)) {
    const v = data[key];
    if (ARRAY_FILES.has(key)) { if (!Array.isArray(v)) p.push(`${file}: top level must be an array`); }
    else if (v === null || typeof v !== "object" || Array.isArray(v)) p.push(`${file}: top level must be an object`);
  }
  if (p.length) return p;
  for (const key of ARRAY_FILES) {
    const seen = new Set();
    data[key].forEach((o, i) => {
      if (!o || typeof o.id !== "string") p.push(`${DATA_FILES[key]}[${i}]: missing string id`);
      else if (seen.has(o.id)) p.push(`${DATA_FILES[key]}: duplicate id "${o.id}"`);
      else seen.add(o.id);
    });
  }
  const weaponIds = new Set(data.weapons.map((w) => w && w.id));
  const refW = (wid, where) => { if (!weaponIds.has(wid)) p.push(`${where}: unknown weapon "${wid}"`); };
  for (const u of data.units) {
    if (!Array.isArray(u.seats)) p.push(`units.json ${u.id}: seats must be an array`);
    if (!Array.isArray(u.weapons)) p.push(`units.json ${u.id}: weapons must be an array`);
    for (const s of u.seats ?? []) {
      if (s.weapon !== undefined) refW(s.weapon, `units.json ${u.id} seat ${s.role}`);
      for (const a of s.altWeapons ?? []) refW(a, `units.json ${u.id} seat ${s.role} altWeapons`);
      for (const a of s.extraWeapons ?? []) refW(a, `units.json ${u.id} seat ${s.role} extraWeapons`);
    }
    for (const w of u.weapons ?? []) refW(w, `units.json ${u.id} weapons`);
  }
  for (const b of data.buildings) {
    if (b.weapon !== undefined) refW(b.weapon, `buildings.json ${b.id} weapon`);
    for (const w of b.weapons ?? []) refW(w, `buildings.json ${b.id} weapons`);
  }
  for (const t of Object.keys(data.damageMatrix)) {
    if (!data.damageMatrix[t] || typeof data.damageMatrix[t] !== "object") p.push(`damage-matrix.json: row "${t}" must be an object`);
  }
  return p;
}

/** Async loader: readFile may return a string or a Promise of a string. */
async function loadData(readFile) {
  const entries = await Promise.all(Object.entries(DATA_FILES).map(async ([k, f]) => [k, await readFile(f)]));
  return parseAll(Object.fromEntries(entries));
}

/** Synchronous loader: readFile must return a string. */
function loadDataSync(readFile) {
  return parseAll(Object.fromEntries(Object.entries(DATA_FILES).map(([k, f]) => [k, readFile(f)])));
}

exports.DATA_FILES = DATA_FILES;
exports.DataLoadError = DataLoadError;
exports.structuralProblems = structuralProblems;
exports.loadData = loadData;
exports.loadDataSync = loadDataSync;
