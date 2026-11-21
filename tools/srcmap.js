const fs = require("fs"), path = require("path");
function walk(d, base, out) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, base, out); else out[path.relative(base, p).split(path.sep).join("/")] = fs.readFileSync(p, "utf8"); } return out; }
function load(root) { return { SRC: walk(path.join(root, "src"), path.join(root, "src"), {}), DATA: walk(path.join(root, "data"), path.join(root, "data"), {}), SAMPLES: walk(path.join(root, "samples"), path.join(root, "samples"), {}) }; }
function makeRequire(SRC) {
  const cache = {};
  const norm = (p) => { const out = []; p.split("/").forEach((s) => { if (s === "..") out.pop(); else if (s !== "." && s !== "") out.push(s); }); return out.join("/"); };
  const resolveId = (from, spec) => { const p = norm(from.split("/").slice(0, -1).join("/") + "/" + spec); if (SRC[p] !== undefined) return p; const alt = p.replace(/\.ts$/, ".js"); if (SRC[alt] !== undefined) return alt; if (SRC[p + ".js"] !== undefined) return p + ".js"; throw new Error("module not found: " + spec + " from " + from); };
  const loadM = (id) => { if (cache[id]) return cache[id].exports; const m = { exports: {} }; cache[id] = m; new Function("require", "module", "exports", SRC[id] + "\n//# sourceURL=ironfall:///" + id)((s) => loadM(resolveId(id, s)), m, m.exports); return m.exports; };
  return loadM;
}
module.exports = { load, makeRequire };
