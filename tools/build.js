// Rebuilds the playable page: the Halcyon page's shell with the Frontline sources, data and samples swapped in.
const fs = require("fs"), { load } = require("./srcmap.js");
const [, , template, root, out, stamp] = process.argv;
const { SRC, DATA, SAMPLES } = load(root);
let lines = fs.readFileSync(template, "utf8").split("\n");
const rep = (name, obj) => { const i = lines.findIndex((l) => l.startsWith(`var ${name} = `)); if (i < 0) throw new Error(name); lines[i] = `var ${name} = ${JSON.stringify(obj).replace(/<\/script/gi, "<\\/script")};`; };
rep("__IRONFALL_SRC", SRC); rep("__IRONFALL_DATA", DATA); rep("__IRONFALL_SAMPLES", SAMPLES);
const bi = lines.findIndex((l) => l.startsWith("var __IRONFALL_BUILD = ")); lines[bi] = `var __IRONFALL_BUILD = ${JSON.stringify(stamp || "frontline")};`;
let html = lines.join("\n");
html = html.replace(/<title>[^<]*<\/title>/, "<title>Ironfall: Frontline (stage 1)</title>")
  .replace("<h1>IRON<span>FALL</span></h1>\n    <div class=\"sub\" id=\"startSubtitle\">", "<h1>FRONT<span>LINE</span></h1>\n    <div class=\"sub\" id=\"startSubtitle\">");
fs.writeFileSync(out, html);
console.log("wrote", out, html.length);
