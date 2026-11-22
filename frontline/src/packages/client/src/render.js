"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = exports.kindFootprint = exports.ICON_PX = exports.HALCYON = exports.WIRE_PROD = exports.P2_INST = exports.WIRE_TEAM = exports.WIRE_BG = exports.SHIELD_FLOATS = exports.ICON_FLOATS = exports.FX_FLOATS = exports.PROJ_FLOATS = exports.DISC_FLOATS = exports.INST_FLOATS = void 0;
exports.projCode = projCode;
// Raw WebGL2 renderer: sky, terrain, instanced unit kinds, props, blob shadows,
// selection rings, tracers and effect puffs. One draw call per mesh kind; every
// per-unit value is an instance attribute. Counts draw calls and triangles.
const meshes_ts_1 = require("./meshes.js");
const terrain_gen_ts_1 = require("./terrain-gen.js");
const w1_walker_ts_1 = require("./w1-walker.js");
exports.INST_FLOATS = 12; // unit / prop instance: x, y, z, hullYaw, turretYaw, team, phase, scale, walkPhase, walkAmp, recoil, build (C4: 0 = finished, else the built fraction 0..1)
exports.DISC_FLOATS = 8; // shadow / ring instance: x, y, z, radius, nx, ny, nz, alpha
/** P1g: vertices of the tracer ribbon (two quads). */
const PROJ_VERTS = 12;
exports.PROJ_FLOATS = 8; // tracer: x, y, z, length, dirX, dirY, dirZ, code (projCode)
/**
 * V1 (designer playtest 15 Nov): the projectile record's last float packs team (bit 0), thin hitscan tracer (2), calibre
 * class 0..7 (x4: small arms .. siege shell; a beam's brightness instead) and beam (x32: a laser held along its whole length).
 */
function projCode(team, thin, cal, beam = false) {
    return (team === 0 ? 0 : 1) + (thin ? 2 : 0) + Math.max(0, Math.min(7, Math.round(cal))) * 4 + (beam ? 32 : 0);
}
exports.FX_FLOATS = 9; // puff: x, y, z, radius, r, g, b, alpha, emissive
exports.ICON_FLOATS = 12; // tactical icon segment: x, y, z, width (css px), ax, ay, bx, by (css px, y up), team, alpha, selected, 0
exports.SHIELD_FLOATS = 12; // shield flash: x, y, z, radius xz, radius y, team, alpha, down (0/1), hit dir xyz, 0
/** Command view (tactical display) colours: dark ground, line colours by team index (0 own side, 1 enemy, 2 neutral, 3 effects). */
exports.WIRE_BG = [0.016, 0.036, 0.038];
exports.WIRE_TEAM = [[0.3, 0.9, 1.0], [1.0, 0.4, 0.14], [0.78, 0.8, 0.8], [1.0, 0.86, 0.55], [0.45, 1.0, 0.62]]; // G1: index 3 ore fields (amber), 4 gas geysers (green)
/** P2: effect instance floats (fx-particles.ts P2_FLOATS). */
exports.P2_INST = 16; // P2
const TEAM_GLSL = exports.WIRE_TEAM.map((c) => `vec3(${c.join(", ")})`).join(", ");
/** G1: the command view's hue for production buildings (Core, Foundry, Barracks, Air Pad): own periwinkle, enemy rose. */
exports.WIRE_PROD = [[0.56, 0.66, 1.0], [1.0, 0.3, 0.46]];
const PROD_GLSL = `const vec3 PROD[2] = vec3[2](${exports.WIRE_PROD.map((c) => `vec3(${c.join(", ")})`).join(", ")});`;
exports.HALCYON = (() => {
    const s = [-0.55, 0.42, 0.72];
    const l = Math.hypot(s[0], s[1], s[2]);
    // G1: the concept's light: a warm sun, a blue sky ambient, a warm ground bounce; a deep blue zenith over a cream haze
    const m = [-0.35, 0.18, 0.92];
    const ml = Math.hypot(m[0], m[1], m[2]);
    return {
        sunDir: [s[0] / l, s[1] / l, s[2] / l], sunCol: [1.16, 0.98, 0.74],
        skyAmb: [0.48, 0.54, 0.64], groundAmb: [0.34, 0.31, 0.25],
        horizon: [0.8, 0.77, 0.68], zenith: [0.25, 0.42, 0.6], sunHaze: [0.97, 0.87, 0.68],
        hullA: [0.5, 0.54, 0.45], hullB: [0.52, 0.38, 0.29],
        glowA: [0.25, 0.92, 1.0], glowB: [1.0, 0.36, 0.1],
        mount: [0.33, 0.39, 0.44], mountP: [0.8, 0.085, 1.0],
        moonDir: [m[0] / ml, m[1] / ml, m[2] / ml], moonCol: [0.92, 0.82, 0.7], moonP: [0.1, 1.0, 0.0],
        cloud: [0.9, 0.88, 0.83], cloudP: [0.45, 0.16, 0.0],
    };
})();
const COMMON = `
uniform vec3 uSunDir, uSunCol, uSkyAmb, uGroundAmb, uHorizon, uZenith, uSunHaze, uEye;
uniform float uFogDensity, uFogStart;
vec3 fogColor(vec3 d) { float s = pow(max(dot(d, uSunDir), 0.0), 5.0); return mix(uHorizon, uSunHaze, s * 0.55); }
float fogAmount(vec3 wp) { float dist = length(wp - uEye); return clamp(1.0 - exp(-max(dist - uFogStart, 0.0) * uFogDensity), 0.0, 1.0); }
vec3 applyFog(vec3 c, vec3 wp, float k) { vec3 v = wp - uEye; return mix(c, fogColor(normalize(v)), fogAmount(wp) * k); }
vec3 lit(vec3 albedo, vec3 n, float ao) {
  float d = max(dot(n, uSunDir), 0.0);
  float hemi = n.y * 0.5 + 0.5;
  vec3 amb = mix(uGroundAmb, uSkyAmb, hemi);
  return albedo * (amb * ao + uSunCol * d * mix(0.55, 1.0, ao));
}
// G1: the concept's grade: a soft shoulder, saturation 0.92, gentle contrast
vec3 grade(vec3 c) {
  c = c / (1.0 + 0.12 * c) * 1.1;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.92);
  return clamp((c - 0.5) * 1.1 + 0.49, 0.0, 1.0);
}
uniform float uWire; // 0 shaded scene .. 1 tactical display (command view), driven by the camera blend
const vec3 WBG = vec3(${exports.WIRE_BG.join(", ")});
`;
// instance: iA = (x, y, z, hullYaw), iB = (turretYaw, team (+10 if selected), phase, scale). Shared by the
// shaded mesh and its edges, so the outline sits exactly on the mesh.
const XFORM = `
uniform mat4 uVP; uniform vec3 uPivot; uniform float uHover, uBob, uTime, uSink, uRecoil;
vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(v.x * c - v.y * s, v.x * s + v.y * c); }
// F3 (designer 16 Nov: "aircraft propellers are not animated"): rotors. Parts 10-13 rotor r's blades, 14-17 its blur
// disc; uRotor[r] = (hub x, y, z, spin sign), turned about the local y axis by the instance's rotor angle (iC.x);
// iC.y = spin 0 (stopped) .. 1 (full power). uRotorN = 0: no rotors (walk phase / tilt as before).
uniform vec4 uRotor[4]; uniform float uRotorN;
vec4 rotorOf(float part) { int r = int(mod(part - 10.0, 4.0) + 0.5); return r == 0 ? uRotor[0] : r == 1 ? uRotor[1] : r == 2 ? uRotor[2] : uRotor[3]; }
vec3 rotorLocal(vec3 p, float part, vec4 iC) { vec4 R = rotorOf(part); vec3 q = p - R.xyz; q.xz = rot(q.xz, iC.x * R.w); return q + R.xyz; }
// infantry walk cycle (parts 3-6): legs swing about the hip, arms about the shoulder, opposite sides in antiphase;
// iC.x = walk phase (radians, advances with distance walked), iC.y = amplitude (0 still .. 1 full stride)
float limbAngle(float part, vec4 iC) {
  if (iC.x > 99.5) return 0.0; // a packed tilt (ruling 112), not a walk phase
  float side = (part < 3.5 || (part > 4.5 && part < 5.5)) ? 1.0 : -1.0;
  float sw = sin(iC.x) * iC.y * side;
  return part < 4.5 ? sw * 0.55 : -sw * 0.38;
}
vec3 limbPivot(float part) { return part < 4.5 ? vec3(0.0, 0.9, 0.0) : vec3(0.08, 1.38, 0.0); }
// Frontline: knees and elbows. A leg's shin (below the knee, y < 0.485) folds back while that leg swings forward; the
// left forearm (the right one holds the rifle) bends at the elbow with the arm swing. Applied in the limb's own frame,
// before the hip / shoulder swing.
float kneeAngle(float part, vec4 iC) {
  if (iC.x > 99.5) return 0.0;
  float side = part < 3.5 ? 1.0 : -1.0;
  return -iC.y * (0.05 + 0.95 * max(0.0, cos(iC.x) * side));
}
float elbowAngle(vec4 iC) {
  if (iC.x > 99.5) return 0.0;
  return iC.y * (0.12 + 0.3 * (0.5 + 0.5 * sin(iC.x)));
}
vec3 limbBend(vec3 p, float part, vec4 iC) {
  if (part < 4.5 && p.y < 0.485) { vec2 k = vec2(0.0, 0.485); p.xy = rot(p.xy - k, kneeAngle(part, iC)) + k; }
  else if (part > 4.5 && part < 5.5 && p.x > 0.15 && p.y < 1.21) { vec2 e = vec2(0.13, 1.13); p.xy = rot(p.xy - e, elbowAngle(iC)) + e; }
  return p;
}
// C8 (ruling 42): a pilot's stance in the build slot (iC.w): -1 crouched (lower), -2 prone (lying face down along its
// facing). Applied after the limbs, so the walk cycle becomes a crawl.
vec3 stanceLocal(vec3 p, float st) {
  if (st > -0.5) return p;
  if (st > -1.5) return vec3(p.x + 0.12 * p.y, p.y * 0.64, p.z);
  if (st > -2.5) return vec3(p.y * 0.95 - 0.75, 0.16 - p.x * 0.55, p.z);
  return vec3(0.75 - p.y * 0.95, 0.16 + p.x * 0.55, p.z); // Frontline: -3 downed, on its back (face up, head behind)
}
vec3 stanceNormal(vec3 n, float st) { return st > -1.5 ? n : st > -2.5 ? vec3(n.y, -n.x, n.z) : vec3(-n.y, n.x, n.z); }
// W1 (walker legs, meshes.ts sleg kind): parts 7 thigh, 8 shin, 9 sole; the instance sits on the hip, yawed into the
// leg's plane, with the sole's horizontal reach in iC.x and its drop in iC.z (w1-walker.ts legPose: two bones, knee up)
const float WL1 = ${w1_walker_ts_1.WALKER.L1.toFixed(3)}, WL2 = ${w1_walker_ts_1.WALKER.L2.toFixed(3)};
vec4 walkerLeg(vec4 iC) { // (hip pitch, shin pitch, knee x, knee y)
  float d = iC.x, dy = iC.z, D = clamp(length(vec2(d, dy)), abs(WL1 - WL2) + 0.01, WL1 + WL2 - 0.01);
  float hip = atan(dy, d) + acos(clamp((WL1 * WL1 + D * D - WL2 * WL2) / (2.0 * WL1 * D), -1.0, 1.0));
  vec2 k = WL1 * vec2(cos(hip), sin(hip));
  return vec4(hip, atan(dy - k.y, d - k.x), k);
}
// W2: the sole keeps its own heading (iB.x: the foot's yaw, fixed while planted), not the leg's (iA.w)
vec3 legLocal(vec3 p, float part, vec4 iA, vec4 iB, vec4 iC) {
  vec4 L = walkerLeg(iC);
  if (part < 7.5) { p.xy = rot(p.xy, L.x); return p; }
  if (part < 8.5) { p.xy = rot(p.xy, L.y) + L.zw; return p; }
  p.xz = rot(p.xz, iB.x - iA.w);
  return p + vec3(L.z + WL2 * cos(L.y), L.w + WL2 * sin(L.y), 0.0);
}
// ruling 130: the drop pod sentry's hatch. uPod = (petal hinge x, hinge y, head rise, open angle); iC.x = deploy 0..1:
// petals 18-21 (petal k faces yaw k x 90 deg) fold out about their rim edge, then the head (parts 1-2) rises out.
uniform vec4 uPod;
float podPetals(vec4 iC) { return smoothstep(0.08, 0.55, clamp(iC.x, 0.0, 1.0)); }
float podHead(vec4 iC) { return smoothstep(0.4, 1.0, clamp(iC.x, 0.0, 1.0)); }
vec3 podPetal(vec3 p, float part, vec4 iC, bool pos) {
  float a = (part - 18.0) * 1.5707963;
  vec2 xz = rot(p.xz, -a); vec3 q = vec3(xz.x, p.y, xz.y);
  if (pos) { q.x -= uPod.x; q.y -= uPod.y; }
  q.xy = rot(q.xy, -podPetals(iC) * uPod.w);
  if (pos) { q.x += uPod.x; q.y += uPod.y; }
  vec2 b2 = rot(q.xz, a); return vec3(b2.x, q.y, b2.y);
}
vec3 unitLocal0(vec3 p, float part, vec4 iA, vec4 iB, vec4 iC) {
  if (uPod.w > 0.0) {
    if (part > 17.5) return podPetal(p, part, iC, true);
    if (part > 0.5 && part < 2.5) p.y -= (1.0 - podHead(iC)) * uPod.z;
  }
  if (part > 21.5 && part < 22.5) { vec2 P = vec2(-1.9, 1.3); p.xy = rot(p.xy - P, iC.y) + P; return p; } // Frontline: the gunship's tilting wing engines (angle in iC.y)
  if (part > 22.5 && part < 23.5) { p.xy = rot(p.xy, -iC.y); return p; } // Frontline: a drop crate wall falling outward about its bottom outer edge (iC.y: 0 standing .. pi/2 flat)
  if (part > 9.5) return rotorLocal(p, part, iC);
  if (part > 6.5) return legLocal(p, part, iA, iB, iC);
  if (part > 2.5) { vec3 pv = limbPivot(part); vec3 q = limbBend(p, part, iC) - pv; q.xy = rot(q.xy, limbAngle(part, iC)); return q + pv; }
  if (part > 0.5) {
    if (part > 1.5) p.x -= uRecoil * iC.z; // barrel recoil along the gun
    vec3 q = p - uPivot; q.xz = rot(q.xz, iB.x - iA.w); p = q + uPivot;
  }
  return p;
}
vec3 unitLocal(vec3 p, float part, vec4 iA, vec4 iB, vec4 iC) { return stanceLocal(unitLocal0(p, part, iA, iB, iC), iC.w); }
vec3 unitNormal(vec3 n, float part, vec4 iA, vec4 iB, vec4 iC) {
  if (uPod.w > 0.0 && part > 17.5) n = podPetal(n, part, iC, false);
  else if (part > 21.5 && part < 22.5) n.xy = rot(n.xy, iC.y);
  else if (part > 22.5 && part < 23.5) n.xy = rot(n.xy, -iC.y);
  else if (part > 9.5) n.xz = rot(n.xz, iC.x * rotorOf(part).w);
  else if (part > 8.5) n.xz = rot(n.xz, iB.x - iA.w);
  else if (part > 6.5) { vec4 L = walkerLeg(iC); n.xy = rot(n.xy, part < 7.5 ? L.x : L.y); }
  else if (part > 2.5) n.xy = rot(n.xy, limbAngle(part, iC));
  else if (part > 0.5) n.xz = rot(n.xz, iB.x - iA.w);
  return stanceNormal(n, iC.w);
}
// ruling 112 (hover handling): a hover vehicle's lean packed in the walk-phase slot (iC.x = 100 + pitch code * 1024 +
// roll code, codes 0..1023 over -0.4..0.4 rad; tilt.ts packTilt). Pitch lifts the nose (local +x), roll drops the right
// side (local +z), about a point 1 m up.
vec2 tiltOf(vec4 iC) {
  if (iC.x < 99.5) return vec2(0.0);
  float v = iC.x - 100.0, ip = floor(v / 1024.0), ir = v - ip * 1024.0;
  return (vec2(ip, ir) / 1023.0 - 0.5) * 0.8;
}
vec3 tiltLocal(vec3 p, vec2 t, float pivot) { p.y -= pivot; p.xy = rot(p.xy, t.x); p.zy = rot(p.zy, -t.y); p.y += pivot; return p; }
vec3 unitWorld(vec3 p, vec4 iA, vec4 iB, vec4 iC) {
  p *= iB.w;
  vec2 tl = tiltOf(iC);
  if (tl.x != 0.0 || tl.y != 0.0) p = tiltLocal(p, tl, 1.0);
  p.xz = rot(p.xz, iA.w);
  // wrecks (walk amplitude -1): no hover and no bob, they lie on the ground (designer playtest 15 Nov: floating Dart wrecks)
  float live = iC.y < -0.5 ? 0.0 : 1.0;
  float walkBob = iC.x > 99.5 || uRotorN > 0.5 ? 0.0 : abs(cos(iC.x)) * 0.05 * max(iC.y, 0.0);
  return iA.xyz + p + vec3(0.0, (uHover * iB.w + uBob * sin(uTime * 2.3 + iB.z)) * live + walkBob - uSink, 0.0);
}`;
const UNIT_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in vec2 aPM;
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB; layout(location=6) in vec4 iC;
${XFORM}
out vec3 vWP; out vec3 vN; out vec3 vCol; out float vLY; flat out float vMat; flat out float vTeam; flat out float vBuild; flat out float vPhase; flat out float vPart; flat out float vSpin;
void main() {
  vec3 p = unitLocal(aPos, aPM.x, iA, iB, iC), n = unitNormal(aNor, aPM.x, iA, iB, iC);
  vPart = aPM.x; vSpin = uRotorN > 0.5 ? clamp(iC.y, 0.0, 1.0) : 0.0; // F3 rotors
  vLY = aPM.x > 6.5 && aPM.x < 9.5 ? p.y - iC.z : p.y; vBuild = iC.w; vPhase = iB.z; // W2: a walker leg's height over the ground (iC.z: the hip-to-sole drop), not below its hip: no ground shade on the whole leg
  { vec2 tl = tiltOf(iC); if (tl.x != 0.0 || tl.y != 0.0) n = tiltLocal(n, tl, 0.0); }
  n.xz = rot(n.xz, iA.w);
  vec3 wp = unitWorld(p, iA, iB, iC);
  vWP = wp; vN = n; vCol = aCol; vMat = aPM.y; vTeam = mod(iB.y, 10.0);
  gl_Position = uVP * vec4(wp, 1.0);
}`;
const UNIT_FS = `#version 300 es
precision highp float;
${COMMON}
uniform vec3 uHullA, uHullB, uGlowA, uGlowB;
uniform float uTime;
uniform float uHeight; // the kind's top (local y), for a structure under construction (C4)
uniform vec4 uGhost; // B2: placement ghost / waiting site: translucent tint (rgb) and alpha (0 = a normal draw)
in vec3 vWP; in vec3 vN; in vec3 vCol; in float vLY; flat in float vMat; flat in float vTeam; flat in float vBuild; flat in float vPhase; flat in float vPart; flat in float vSpin;
uniform float uBlur; // F3: 1 = the rotor blur pass (only the blur discs, blended), 0 = the normal pass (no blur discs)
out vec4 o;
void main() {
  // F3 rotors: the blur disc only in the blur pass; the blades fade out (screen-door) as they speed up
  bool disc = vPart > 13.5 && vPart < 17.5, blade = vPart > 9.5 && vPart < 13.5;
  if (uBlur > 0.5 ? !disc : disc) discard;
  if (blade && vSpin > 0.45) { float h = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453); if (h < 0.8 * smoothstep(0.45, 1.0, vSpin)) discard; }
  // C4: a structure under construction fills from the ground up to its built fraction, with a glowing build line
  float buildY = vBuild * uHeight;
  if (vBuild > 0.0 && vLY > buildY) discard;
  // team 2 (neutral / an empty crewed vehicle, client slice 3): a dark grey hull with its team lights off
  bool dark = vTeam > 1.5 && vTeam < 2.5;
  // ruling 106: team 3 = a burnt hull (client-only destruction effect): charred black, its lights become embers that
  // cool with the phase (heat 1 -> 0)
  bool burnt = vTeam > 2.5 && vTeam < 3.5;
  // 21 Nov: team 4 = another human player of the own side (co-op squadmate): green lights and a green-tinted hull
  bool mate = vTeam > 3.5 && vTeam < 4.5;
  float heat = clamp(vPhase, 0.0, 1.0);
  vec3 glow = mate ? vec3(0.35, 1.25, 0.5) : burnt ? mix(vec3(0.05, 0.04, 0.035), vec3(1.6, 0.55, 0.12), heat * (0.75 + 0.25 * sin(uTime * 9.0 + vWP.x))) : dark ? vec3(0.07, 0.075, 0.08) : vTeam < 0.5 ? uGlowA : uGlowB;
  vec3 c;
  // G1: material 4, self-lit vertex colour (ore crystals, gas, lamps, lava): half lit, half emissive, a slow pulse
  // G2: material 5, a blinking beacon (off on an empty or burnt hull)
  if (vMat > 4.5) { float on = dark || burnt ? 0.0 : step(0.55, fract(uTime * 0.7 + vPhase * 0.37)); c = applyFog(vCol * (0.22 + 1.5 * on), vWP, 0.6); }
  else if (vMat > 3.5) { float pul = 0.88 + 0.12 * sin(uTime * 1.6 + vPhase * 6.0); c = applyFog(mix(lit(vCol, normalize(vN), 1.0), vCol * pul, 0.5), vWP, 0.75); }
  else if (vMat > 2.5) { c = applyFog(glow * 1.05, vWP, 0.8); }
  else if (vMat > 1.5) { c = applyFog(glow * 1.5, vWP, 0.55); }
  else {
    vec3 hull = mate ? uHullA * vec3(0.62, 1.12, 0.7) : dark ? vec3(0.3, 0.31, 0.31) : vTeam < 0.5 ? uHullA : uHullB;
    vec3 albedo = burnt ? vCol * vec3(0.1, 0.09, 0.085) + vec3(0.02, 0.017, 0.015) : vMat > 0.5 ? vCol * hull : vCol;
    float ao = 0.5 + 0.5 * smoothstep(0.0, 1.4, vLY);
    c = applyFog(lit(albedo, normalize(vN), ao), vWP, 1.0);
  }
  if (vBuild > 0.0 && vLY > buildY - 0.25) c = (vTeam < 0.5 ? uGlowA : uGlowB) * 1.6;
  if (burnt) c += vec3(0.9, 0.28, 0.05) * heat * heat * 0.35 * smoothstep(1.2, 0.0, vLY);
  // B2: a ghost: the team-shaded mesh tinted towards uGhost.rgb, translucent, brighter at grazing angles (also on the tactical display)
  if (uGhost.a > 0.0) {
    float fr = pow(1.0 - abs(dot(normalize(vN), normalize(uEye - vWP))), 2.0);
    vec3 g = mix(mix(grade(c), WBG, uWire * 0.6), uGhost.rgb, 0.55) + uGhost.rgb * fr * 0.7;
    o = vec4(g, clamp(uGhost.a * (0.7 + 0.8 * fr), 0.0, 1.0));
    return;
  }
  if (uBlur > 0.5) { // F3: a translucent disc where the blades turn
    float a = (0.08 + 0.34 * smoothstep(0.2, 1.0, vSpin)) * (1.0 - uWire);
    o = vec4(grade(c) * 1.1 + 0.05, a); return;
  }
  // tactical display: the mesh becomes a fill in the ground colour (hidden-line removal for its edges)
  o = vec4(mix(grade(c), WBG, uWire), 1.0);
}`;
// G1: aFx = terrain-layer surface weights (lava, liquid, ice); vColF = the triangle's own colour (flat: the provoking
// vertex's, so each triangle gets the small colour step of the concept's faceted ground)
const TERRAIN_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aCol; layout(location=3) in vec3 aFx;
uniform mat4 uVP;
out vec3 vWP; out vec3 vN; out vec3 vCol; out vec3 vFx; flat out vec3 vColF;
void main() { vWP = aPos; vN = aNor; vCol = aCol; vColF = aCol; vFx = aFx; gl_Position = uVP * vec4(aPos, 1.0); }`;
const TERRAIN_FS = `#version 300 es
precision highp float;
${COMMON}
in vec3 vWP; in vec3 vN; in vec3 vCol; in vec3 vFx; flat in vec3 vColF;
uniform float uTime;
out vec4 o;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
uniform float uMapSize, uDpr, uContour;
// a line at every integer of v, halfPx pixels wide (screen-space derivatives: constant width at any slope or zoom),
// faded out where the lines would crowd closer than a few pixels
float isoLine(float v, float halfPx) {
  float fw = max(fwidth(v), 1e-6);
  float d = abs(fract(v + 0.5) - 0.5) / fw;
  halfPx *= uDpr;
  return (1.0 - smoothstep(halfPx - 0.5, halfPx + 0.5, d)) * (1.0 - smoothstep(0.1, 0.3, fw));
}
// tactical ground: dark, contours every 2 m (every 5th, 10 m, brighter), faint 100 m grid, map border; dimmer beyond the map
vec3 tactical(vec3 wp) {
  // T1 (ruling 116): on a relief planet (uContour > 1) the contours are wider apart, the minor ones fade on steep ground,
  // and ground too steep to drive is a darker hatched fill, so the corridors and passes read
  float cs = max(uContour, 1.0), sl = 1.0 - normalize(vN).y;
  float minor = isoLine(wp.y / (2.0 * cs), 0.55) * (cs > 1.0 ? 1.0 - smoothstep(0.08, 0.2, sl) : 1.0), major = isoLine(wp.y / (10.0 * cs), 0.8);
  float grid = max(isoLine(wp.x / 100.0, 0.5), isoLine(wp.z / 100.0, 0.5));
  float e = min(min(wp.x, uMapSize - wp.x), min(wp.z, uMapSize - wp.z));
  float border = 1.0 - smoothstep(0.6, 1.6, abs(e) / max(fwidth(e), 1e-6));
  float inside = step(0.0, e);
  vec3 c = vec3(0.05, 0.12, 0.13) * grid + vec3(0.1, 0.3, 0.23) * minor * (1.0 - major);
  c += vec3(0.17, 0.46, 0.34) * major;
  c = WBG + c * mix(0.4, 1.0, inside);
  if (cs > 1.0) {
    // drivable ground (below ~30 degrees) a lit floor; steeper: a dark fill with a faint hatch and only its major contours, dimmed
    float steep = smoothstep(0.11, 0.17, sl), hatch = isoLine((wp.x + wp.z) / 16.0, 0.4);
    vec3 rockc = WBG * 0.7 + vec3(0.02, 0.06, 0.07) * hatch + vec3(0.05, 0.16, 0.13) * major * 0.45;
    c = mix(c + vec3(0.025, 0.06, 0.055) * inside, rockc, steep);
  }
  return mix(c, vec3(0.3, 0.55, 0.55), border * 0.8);
}
// ---- procedural ground (client slice 2): no textures. Multi-octave value noise picks grass / dry grass / dirt /
// rock by slope and height on top of the vertex colour (which keeps the map-scale layout: mud along the battle
// axis, worn base areas, scorch); a small detail-normal perturbation and a per-pixel dither against banding.
// Each octave fades out where it would alias (its cell shrinks under ~1.5 px), so distant ground stays calm.
float fbm3(vec2 p) { return vn(p) * 0.5 + vn(p * 2.03 + 17.1) * 0.3 + vn(p * 4.11 + 41.7) * 0.2; }
float octFade(vec2 p) { vec2 fw = fwidth(p); return 1.0 - smoothstep(0.45, 0.95, max(fw.x, fw.y)); }
const vec3 GRASS = vec3(0.34, 0.39, 0.19), DRYGRASS = vec3(0.56, 0.5, 0.29), DIRT = vec3(0.43, 0.35, 0.24), ROCK = vec3(0.46, 0.47, 0.45);
void main() {
  vec3 N = normalize(vN);
  float dist = length(vWP - uEye);
  vec3 shaded;
  if (uWire >= 1.0) shaded = vec3(0.0);
  else {
    vec2 q = vWP.xz;
    // G1: the concept's ground: the triangle's own flat colour (map-scale layout from the vertex colours: grass bands,
    // dry patches, worn tracks, base aprons, scorch, layer tints), a calm large-scale variation and a light near grain;
    // faceted normals (face normal mixed into the smooth one) so the low-poly ground reads as in the concept
    float big = fbm3(q / 55.0), mid = fbm3(q / 13.0);
    float slope = 1.0 - N.y;
    vec3 albedo = mix(vCol, vColF, 0.7 * (1.0 - smoothstep(700.0, 1600.0, dist)));
    albedo *= 0.94 + 0.12 * big;
    float dry = smoothstep(0.62, 0.8, mid * 0.6 + big * 0.4) * (1.0 - smoothstep(0.1, 0.2, slope));
    albedo = mix(albedo, albedo * vec3(1.12, 1.06, 0.86), dry * 0.4);
    float rock = smoothstep(0.1, 0.22, slope + (mid - 0.5) * 0.06);
    float vl = dot(vCol, vec3(0.333));
    albedo = mix(albedo, mix(ROCK, vColF, uContour > 1.0 ? 0.88 : 0.35) * (0.85 + 0.3 * mid), rock * 0.75); // T1: a relief planet's own rock colour on its walls
    vec2 qr = mat2(0.8, -0.6, 0.6, 0.8) * q; // rotated, so no octave lines up with the world axes
    float f1 = octFade(q / 3.1), f2 = octFade(q / 0.9), f3 = octFade(qr / 0.28);
    float grain = (vn(q / 3.1) - 0.5) * 0.06 * f1 + (vn(qr / 0.9 + 7.3) - 0.5) * 0.06 * f2 + (vn(qr / 0.28 + 3.1) - 0.5) * 0.1 * f3;
    albedo *= 1.0 + grain * (1.0 - smoothstep(120.0, 400.0, dist));
    float fleck = smoothstep(0.76, 0.84, vn(qr / 0.33 + 11.0)) * f3 * (1.0 - rock) * (1.0 - smoothstep(60.0, 200.0, dist));
    albedo = mix(albedo, albedo * vec3(1.3, 1.2, 0.85), fleck * 0.3);
    vec3 Nf = normalize(cross(dFdx(vWP), dFdy(vWP)));
    if (Nf.y < 0.0) Nf = -Nf;
    vec3 n = normalize(mix(N, Nf, (0.35 + 0.35 * rock) * (1.0 - smoothstep(500.0, 1500.0, dist))));
    float dn = (1.0 - smoothstep(25.0, 110.0, dist)) * octFade(q / 1.4);
    if (dn > 0.0) {
      vec2 e = vec2(0.3, 0.0), bq = q / 1.4;
      float h0 = vn(bq), hx = vn(bq + e.xy), hz = vn(bq + e.yx);
      n = normalize(n + vec3(h0 - hx, 0.0, h0 - hz) * (0.15 + 0.45 * rock) * dn);
    }
    // terrain-layer surfaces: ice (pale, a sun glint), liquid (dark, sky in it at grazing angles), lava (self-lit, slow flow)
    vec3 V = normalize(uEye - vWP), Hh = normalize(V + uSunDir);
    float ice = vFx.z, liq = vFx.y, lava = vFx.x;
    if (ice > 0.01) { albedo = mix(albedo, vec3(0.78, 0.86, 0.92) * (0.92 + 0.12 * mid), ice); n = normalize(mix(n, Nf, ice * 0.6)); }
    if (liq > 0.01) { albedo = mix(albedo, vColF * 0.8, liq); n = normalize(mix(n, vec3(0.0, 1.0, 0.0), liq)); }
    vec3 c = lit(albedo, n, 1.0);
    if (ice > 0.01) c += uSunCol * pow(max(dot(n, Hh), 0.0), 60.0) * 0.6 * ice;
    if (liq > 0.01) { float fr = pow(1.0 - max(V.y, 0.0), 4.0); c = mix(c, fogColor(reflect(-V, vec3(0.0, 1.0, 0.0))) * 0.8, fr * 0.7 * liq) + uSunCol * pow(max(dot(vec3(0.0, 1.0, 0.0), Hh), 0.0), 120.0) * 0.8 * liq; }
    if (lava > 0.01) {
      float fl = fbm3(q / 6.0 + vec2(uTime * 0.05, uTime * 0.03)), crust = smoothstep(0.4, 0.56, fl);
      vec3 hot = mix(vec3(1.0, 0.42, 0.06), vec3(1.0, 0.78, 0.3), smoothstep(0.2, 0.0, fl)) * (1.25 + 0.15 * sin(uTime * 1.3 + q.x * 0.05));
      c = mix(c, mix(hot, vec3(0.12, 0.08, 0.07), crust * 0.85), lava);
    }
    // softer horizon haze: a second, gentler haze term that thickens slowly from ~900 m, so far hills fade into the
    // sky instead of ending on a hard fog line
    c = applyFog(c, vWP, 1.0);
    c = mix(c, fogColor(normalize(vWP - uEye)), smoothstep(900.0, 3400.0, dist) * 0.45);
    shaded = grade(c);
    shaded += (h2(gl_FragCoord.xy + fract(uEye.xz)) - 0.5) / 255.0; // dither: no 8-bit banding in the sky-coloured haze
  }
  o = vec4(uWire > 0.0 ? mix(shaded, tactical(vWP), uWire) : shaded, 1.0);
}`;
const DISC_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB;
uniform mat4 uVP; uniform float uLift;
out vec2 vC; out float vA; out vec3 vWP;
void main() {
  vec3 n = iB.xyz;
  vec3 t = normalize(cross(n, vec3(0.0, 0.0, 1.0)));
  vec3 b = cross(t, n);
  vec3 wp = iA.xyz + (t * aPos.x + b * aPos.z) * iA.w + n * uLift;
  vC = aPos.xz; vA = iB.w; vWP = wp;
  gl_Position = uVP * vec4(wp, 1.0);
}`;
const SHADOW_FS = `#version 300 es
precision highp float;
${COMMON}
in vec2 vC; in float vA; in vec3 vWP;
out vec4 o;
void main() { float d = length(vC); float a = vA * (1.0 - smoothstep(0.25, 1.0, d)) * (1.0 - fogAmount(vWP)) * (1.0 - uWire); o = vec4(0.06, 0.07, 0.09, a); }`;
// far-zoom tactical icons (client slice 2): per-type outline symbols built from line segments in CSS pixels around
// the unit's projected position (icons.ts holds the shapes), constant pixel width, AA in the fragment shader
const ICON_VS = `#version 300 es
layout(location=0) in vec3 aPos; // x: t (0 at a, 1 at b), y: side
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB; layout(location=6) in vec4 iC;
uniform mat4 uVP; uniform vec2 uView; uniform float uDpr;
out float vD; flat out vec3 vCol; flat out float vA; flat out float vSel; flat out float vW;
const vec3 TEAM[${exports.WIRE_TEAM.length}] = vec3[${exports.WIRE_TEAM.length}](${TEAM_GLSL});
${PROD_GLSL}
void main() {
  vec4 c = uVP * vec4(iA.xyz, 1.0);
  if (c.w < 0.05) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
  vec2 s = c.xy / c.w * uView * 0.5;                      // drawing-buffer px from the centre (y up)
  vec2 a = s + iB.xy * uDpr, b = s + iB.zw * uDpr;
  vec2 d = b - a; float L = length(d); d = L > 1e-3 ? d / L : vec2(1.0, 0.0);
  float sel = iC.z;
  float w = iA.w * uDpr * (sel > 0.5 ? 1.5 : 1.0);
  float hw = w * 0.5 + (sel > 0.5 ? 3.0 : 1.0) * uDpr;
  vec2 p = (aPos.x < 0.5 ? a - d * hw * 0.6 : b + d * hw * 0.6) + vec2(-d.y, d.x) * aPos.y * hw;
  gl_Position = vec4(p / (uView * 0.5), 0.0, 1.0);
  vD = aPos.y * hw; vW = w;
  vCol = (iC.w > 0.5 && iC.x < 1.5 ? PROD[int(iC.x)] : TEAM[int(clamp(iC.x, 0.0, 4.0))]) * (sel > 0.5 ? 1.3 : 1.0);
  vA = iC.y; vSel = sel;
}`;
const ICON_FS = `#version 300 es
precision highp float;
uniform float uDpr;
in float vD; flat in vec3 vCol; flat in float vA; flat in float vSel; flat in float vW;
out vec4 o;
void main() {
  float d = abs(vD), core = vW * 0.5;
  float a = 1.0 - smoothstep(core - 0.6, core + 0.6, d);
  if (vSel > 0.5) a = max(a, 0.3 * (1.0 - smoothstep(core, core + 3.0 * uDpr, d)));
  o = vec4(min(vCol, vec3(1.0)), a * vA);
}`;
// shield flash (client slice 2): a faceted translucent dome around a unit, team-tinted, brightest on the side that
// was hit and at the rim; additive, depth-tested, no depth writes. iC.x: 1 = the shield just went down (a red-shifted,
// larger flash). The facets come from flat triangle normals (the dome is an icosahedron subdivided once).
const SHIELD_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB; layout(location=6) in vec4 iC;
uniform mat4 uVP;
out vec3 vN; out vec3 vWP; flat out vec3 vHit; flat out float vTeam; flat out float vA; flat out float vDown;
void main() {
  vec3 wp = iA.xyz + aPos * vec3(iA.w, iB.x, iA.w);
  vN = normalize(aNor * vec3(1.0 / iA.w, 1.0 / iB.x, 1.0 / iA.w));
  vWP = wp; vHit = iC.xyz; vTeam = iB.y; vA = iB.z; vDown = iB.w;
  gl_Position = uVP * vec4(wp, 1.0);
}`;
const SHIELD_FS = `#version 300 es
precision highp float;
${COMMON}
in vec3 vN; in vec3 vWP; flat in vec3 vHit; flat in float vTeam; flat in float vA; flat in float vDown;
out vec4 o;
const vec3 TEAMC[${exports.WIRE_TEAM.length}] = vec3[${exports.WIRE_TEAM.length}](${TEAM_GLSL});
void main() {
  vec3 n = normalize(vN), v = normalize(uEye - vWP);
  float rim = pow(1.0 - abs(dot(n, v)), 2.0);
  float spot = pow(max(dot(n, vHit), 0.0), 4.0);
  vec3 col = TEAMC[int(clamp(vTeam, 0.0, 3.0))];
  if (vDown > 0.5) col = mix(col, vec3(1.0, 0.35, 0.2), 0.6);
  float facet = 0.55 + 0.45 * fract(sin(dot(floor(n * 6.0), vec3(12.9, 78.2, 37.7))) * 43758.5);
  float a = vA * (0.1 + 0.55 * rim + 1.1 * spot) * facet;
  o = vec4(col * a * (1.0 - fogAmount(vWP) * 0.7) * (1.0 - uWire), 1.0);
}`;
const RING_FS = `#version 300 es
precision highp float;
uniform vec3 uColor;
in vec2 vC; in float vA; in vec3 vWP;
out vec4 o;
void main() { o = vec4(uColor * 1.4, vA); }`;
// P1g (designer playtest 15 Nov 18:34: "still firing pixelated blocks"): rounds are camera-facing ribbons, not boxes. The
// ribbon runs from the tail (aPos.x -1) to the head (0) and on past it by a rounded cap (aPos.z 1); across it (aPos.y)
// a white-hot core inside a soft additive glow. Width by calibre, a few pixels at most near the eye (an own tracer
// starts 0.9 m in front of it), growing with distance so a far round stays visible; the tail tapers and cools.
const PROJ_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB;
uniform mat4 uVP; uniform vec3 uEye;
out float vTeam; out float vAcross; out float vHead; out float vCap; flat out float vBeam; flat out float vCal; flat out float vThin;
const float CALW[8] = float[8](0.05, 0.075, 0.16, 0.24, 0.3, 0.36, 0.5, 0.7);
// angular cap (half-width / distance): near the eye a round is a thin line, not a slab across the screen
const float CALA[8] = float[8](0.0022, 0.0026, 0.0032, 0.0038, 0.0044, 0.005, 0.006, 0.007);
const float HALO = 3.0; // the quad is HALO core half-widths wide each side: room for the soft glow
void main() {
  vec3 f = iB.xyz;
  float code = iB.w, thin = mod(floor(code / 2.0), 2.0), cal = mod(floor(code / 4.0), 8.0), beam = floor(code / 32.0);
  float trail = beam > 0.5 && thin > 0.5 ? 1.0 : 0.0;
  float t = aPos.x + 1.0; // 0 tail .. 1 head
  vec3 c = iA.xyz + f * (aPos.x * iA.w);
  float d = max(length(c - uEye), 0.05);
  float base = trail > 0.5 ? 0.03 : beam > 0.5 ? 0.3 + cal * 0.03 : CALW[int(cal)] * (thin > 0.5 ? 0.8 : 1.0);
  float ang = trail > 0.5 ? 0.0009 : beam > 0.5 ? 0.004 : CALA[int(cal)];
  float w = max(min(base * (1.0 + 0.006 * d), ang * d), (trail > 0.5 ? 0.0008 : 0.0017) * d); // never under ~1 px
  if (beam < 0.5) w *= mix(0.4, 1.0, t); // tapered tail
  vec3 toEye = normalize(uEye - c);
  vec3 s = cross(f, toEye);
  s = length(s) < 1e-4 ? normalize(cross(f, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0)) : normalize(s);
  float capLen = beam > 0.5 ? 0.0 : w * HALO;
  vec3 wp = c + f * (aPos.z * capLen) + s * (aPos.y * w * HALO);
  vTeam = mod(code, 2.0); vAcross = aPos.y; vHead = t; vCap = aPos.z; vBeam = beam; vCal = cal; vThin = trail;
  gl_Position = uVP * vec4(wp, 1.0);
}`;
const PROJ_FS = `#version 300 es
precision highp float;
uniform vec3 uGlowA, uGlowB;
in float vTeam; in float vAcross; in float vHead; in float vCap; flat in float vBeam; flat in float vCal; flat in float vThin;
out vec4 o;
uniform float uFade;
void main() {
  vec3 g = vTeam < 0.5 ? uGlowA : uGlowB;
  // across: r in core half-widths (0 centre, 3 quad edge), elliptical round cap past the head
  float r = length(vec2(vAcross * 3.0, vCap * 3.0));
  float core = exp(-r * r * 1.6), halo = exp(-r * r * 0.32) * (1.0 - smoothstep(2.2, 3.0, r));
  if (vThin > 0.5) { // P1g: the long rifle's lingering trail: a faint pale line, the calibre field its brightness (7 = just fired)
    float k = vCal / 7.0;
    o = vec4((vec3(0.85, 0.9, 1.0) * core * 0.9 + g * halo * 0.25) * k * (0.35 + 0.65 * vHead) * uFade, 1.0);
    return;
  }
  if (vBeam > 0.5) { // V1: a laser beam held along its length; the calibre field is its brightness (7 = just fired)
    float k = vCal / 7.0;
    o = vec4((mix(g * 1.3, vec3(1.0, 0.98, 0.95), 0.6) * core * 1.4 + g * halo * 0.7) * (0.35 + 1.1 * k) * uFade, 1.0);
    return;
  }
  // a hot round: white at the head, the team's glow cooling and fading down the tail
  float h = clamp(vHead, 0.0, 1.0), along = pow(h, 1.6);
  vec3 hot = vec3(1.0, 0.94, 0.78);
  vec3 coreC = mix(g * 0.8 + vec3(0.35, 0.25, 0.1), hot, 0.4 + 0.6 * h);
  vec3 c = (coreC * core * 1.5 + mix(g, vec3(1.0, 0.7, 0.35), 0.25) * halo * 0.55) * along;
  c += hot * core * smoothstep(0.82, 1.0, h) * 0.8; // the head's hot spot
  o = vec4(c * (1.0 + vCal * 0.06) * uFade, 1.0);
}`;
const FX_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB; layout(location=6) in float iC;
uniform mat4 uVP;
out vec3 vN; out vec4 vCol; out float vE; out vec3 vWP;
void main() { vec3 wp = iA.xyz + aPos * iA.w; vN = aNor; vCol = iB; vE = iC; vWP = wp; gl_Position = uVP * vec4(wp, 1.0); }`;
const FX_FS = `#version 300 es
precision highp float;
${COMMON}
in vec3 vN; in vec4 vCol; in float vE; in vec3 vWP;
out vec4 o;
void main() {
  // fire glows; smoke is lit softly (half its own colour) so it does not read as solid rock
  vec3 c = vE > 0.5 ? vCol.rgb : mix(lit(vCol.rgb, normalize(vN), 1.0), vCol.rgb * (uSkyAmb + uSunCol) * 0.55, 0.5);
  o = vec4(grade(applyFog(c, vWP, vE > 0.5 ? 0.5 : 1.0)), vCol.a * (1.0 - uWire));
}`;
// ---- tactical display lines: every segment is a screen-space quad (constant pixel width, any DPR), AA in the fragment shader
const LINE = `
uniform vec2 uView; // drawing buffer size in pixels
uniform float uCap; // square-cap length in half widths (0 for rings: overlapping caps would double the alpha at every joint)
// clip-space corner of the quad for segment ca-cb: t picks the end, side the edge; hw = half width in pixels (with square caps)
float lineLenPx; // on-screen length of the last segment passed to lineCorner
vec4 lineCorner(vec4 ca, vec4 cb, float t, float side, float hw) {
  lineLenPx = 0.0;
  const float E = 0.02;
  if (ca.w < E && cb.w < E) return vec4(0.0, 0.0, -2.0, 1.0);
  if (ca.w < E) ca = mix(ca, cb, (E - ca.w) / (cb.w - ca.w));
  if (cb.w < E) cb = mix(cb, ca, (E - cb.w) / (ca.w - cb.w));
  vec2 sa = ca.xy / ca.w * uView * 0.5, sb = cb.xy / cb.w * uView * 0.5;
  vec2 d = sb - sa; float L = length(d);
  lineLenPx = L;
  d = L > 1e-3 ? d / L : vec2(1.0, 0.0);
  vec4 c = t < 0.5 ? ca : cb;
  vec2 off = vec2(-d.y, d.x) * side * hw + d * (t < 0.5 ? -uCap : uCap) * hw;
  c.xy += off / (uView * 0.5) * c.w;
  return c;
}`;
const EDGE_VS = `#version 300 es
layout(location=0) in vec3 aA; layout(location=1) in vec3 aB; layout(location=2) in vec4 aC; // t, side, part, bright
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB; layout(location=6) in vec4 iC;
${XFORM}
${LINE}
uniform float uWidth, uPhaseAlpha, uSizeM, uFocalPx, uHeight;
uniform vec2 uIconPx; // outline -> icon cross-fade range (drawing-buffer px of the footprint)
const vec3 TEAM[${exports.WIRE_TEAM.length}] = vec3[${exports.WIRE_TEAM.length}](${TEAM_GLSL});
${PROD_GLSL}
out float vD; flat out vec3 vCol; flat out float vSel; flat out float vA; flat out float vWidth;
void main() {
  vec3 a = unitWorld(unitLocal(aA, aC.z, iA, iB, iC), iA, iB, iC), b = unitWorld(unitLocal(aB, aC.z, iA, iB, iC), iA, iB, iC);
  float sel = iB.y > 9.5 ? 1.0 : 0.0;
  // the unit's footprint on screen (drawing-buffer px); small units get thinner lines and only their larger edges
  float fpx = uPhaseAlpha > 0.5 ? 1e4 : uSizeM * iB.w * uFocalPx / max((uVP * vec4(iA.xyz, 1.0)).w, 0.01);
  float small = 1.0 - smoothstep(uIconPx.y, uIconPx.y * 3.0, fpx);
  vWidth = uWidth * (1.0 - 0.33 * small);
  float hw = vWidth * 0.5 + (sel > 0.5 ? 2.5 : 1.0) * (uWidth / 1.5);
  gl_Position = lineCorner(uVP * vec4(a, 1.0), uVP * vec4(b, 1.0), aC.x, aC.y, hw);
  vD = aC.y * hw;
  float tm = mod(iB.y, 10.0);
  vec3 tc = iC.z < -0.5 && tm < 1.5 ? PROD[int(tm + 0.5)] : TEAM[int(clamp(tm, 0.0, 4.0))]; // G1: production buildings
  vCol = min(tc * (1.0 + aC.w * 0.3) * (sel > 0.5 ? 1.25 : 1.0) + (sel > 0.5 ? 0.12 : 0.0), vec3(1.0));
  vSel = sel;
  // distance LOD: edges shorter than a few pixels (bolts, louvres, stripes on a far unit) fade to 30 %, so a
  // small unit keeps its long outline edges instead of merging into a solid blob; rings are exempt
  if (uPhaseAlpha > 0.5) vA = iB.z;
  else {
    // distance LOD: edges a few pixels long (bolts, louvres, stripes on a far unit) fade, and on a small unit every
    // edge under ~1/5 of its footprint fades, so the unit keeps its main outline instead of merging into a blob
    float lod = smoothstep(2.0 * uWidth / 1.5, 6.0 * uWidth / 1.5, lineLenPx);
    lod *= mix(1.0, smoothstep(0.08, 0.22, lineLenPx / fpx), small);
    vA = mix(0.12, 1.0, lod);
    // a unit too small on screen for a readable outline is shown as an icon instead (same rule as the CPU icon pass)
    vA *= smoothstep(uIconPx.x, uIconPx.y, fpx);
    // C4: under construction, the outline of the finished structure is drawn faint above the built part
    if (iC.w > 0.0 && max(aA.y, aB.y) > iC.w * uHeight + 0.05) vA *= 0.3;
  }
}`;
const EDGE_FS = `#version 300 es
precision highp float;
uniform float uWidth, uAlpha;
in float vD; flat in vec3 vCol; flat in float vSel; flat in float vA; flat in float vWidth;
out vec4 o;
void main() {
  float d = abs(vD), core = vWidth * 0.5;
  float a = 1.0 - smoothstep(core - 0.6, core + 0.6, d);
  if (vSel > 0.5) a = max(a, 0.22 * (1.0 - smoothstep(core, core + 2.5 * uWidth / 1.5, d)));
  o = vec4(vCol, a * vA * uAlpha);
}`;
// projectiles in the tactical display: short bright segments in team colour (additive)
const PLINE_VS = `#version 300 es
layout(location=0) in vec3 aPos; // x: t, y: side
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB;
uniform mat4 uVP; uniform float uWidth;
${LINE}
const vec3 TEAM[${exports.WIRE_TEAM.length}] = vec3[${exports.WIRE_TEAM.length}](${TEAM_GLSL});
out float vD; flat out vec3 vCol; flat out float vW; out float vT;
void main() {
  // V1: the command view draws rounds by calibre (wider lines for shells) and lasers as wide bright lines that fade
  float code = iB.w, cal = mod(floor(code / 4.0), 8.0), beam = floor(code / 32.0);
  float wk = beam > 0.5 ? 1.6 + cal * 0.25 : 1.2 + cal * 0.45;
  vW = uWidth * wk;
  float hw = vW * 0.5 + 1.0;
  vec3 b = iA.xyz, a = iA.xyz - iB.xyz * iA.w * (beam > 0.5 ? 1.0 : 1.6);
  gl_Position = lineCorner(uVP * vec4(a, 1.0), uVP * vec4(b, 1.0), aPos.x, aPos.y, hw);
  vD = aPos.y * hw; vT = aPos.x;
  vec3 tc = TEAM[int(clamp(mod(code, 2.0), 0.0, 1.0))];
  vCol = beam > 0.5 ? mix(tc, vec3(1.0), 0.45) * (0.4 + 1.2 * cal / 7.0) : mix(tc, vec3(1.0, 0.95, 0.75), 0.35) * 1.3;
}`;
const PLINE_FS = `#version 300 es
precision highp float;
uniform float uWidth, uAlpha;
in float vD; flat in vec3 vCol; flat in float vW; in float vT;
out vec4 o;
void main() { float a = 1.0 - smoothstep(vW * 0.5 - 0.6, vW * 0.5 + 0.6, abs(vD)); o = vec4(vCol * a * uAlpha * (0.35 + 0.65 * vT), 1.0); }`;
const SKY_VS = `#version 300 es
out vec2 vNdc;
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0; vNdc = p; gl_Position = vec4(p, 0.9999, 1.0); }`;
const SKY_FS = `#version 300 es
precision highp float;
${COMMON}
uniform mat4 uInvVP;
uniform vec3 uMount, uMountP, uMoonDir, uMoonCol, uMoonP, uCloud, uCloudP;
in vec2 vNdc;
out vec4 o;
float hs(float n) { return fract(sin(n * 127.1 + uMountP.z * 31.7) * 43758.5453); }
// G1: low-poly mountain ranges round the horizon, drawn per pixel as faceted solids. One range = k peaks per turn
// (k a multiple of 5), each a pyramid: straight silhouette edges down to a saddle on either side, a fan of flat
// facets from the summit (a spur splits the sunlit from the shadow side), a valley line below each saddle.
float plw(float t, float n, float salt) { float i = floor(t); return mix(hs(mod(i, n) + salt), hs(mod(i + 1.0, n) + salt), t - i); }
float peakH(float j, float k, float salt) {
  float h = hs(j + salt), g = j / 5.0, gi = floor(g);
  float env = mix(hs(gi + salt + 77.0), hs(mod(gi + 1.0, k / 5.0) + salt + 77.0), g - gi); // massifs and gaps
  return (0.25 + 0.75 * pow(h, 1.5)) * (0.5 + 0.5 * env);
}
// returns the range's colour (before haze) and its coverage; yn out: height in the range, 0 foot .. 1 highest summit
vec4 range(float az, float y, float k, float off, float hgt, vec3 sunL, float fw, out float yn) {
  float salt = off * 13.0, t = az / 6.2832 * k + off, i = floor(t), f = t - i;
  float i0 = mod(i, k), i1 = mod(i + 1.0, k);
  float A = peakH(i0, k, salt), B = peakH(i1, k, salt);
  float fs = 0.3 + 0.4 * hs(i0 + salt + 211.0), S = min(A, B) * (0.3 + 0.45 * hs(i0 + salt + 307.0));
  float sil = f < fs ? mix(A, S, f / fs) : mix(S, B, (f - fs) / (1.0 - fs));
  // two smaller octaves of straight segments: shoulders, notches and crags on the skyline
  sil += (plw(t * 4.0, k * 4.0, salt + 500.0) - 0.5) * 0.24 * (0.25 + sil) + (plw(t * 11.0, k * 11.0, salt + 900.0) - 0.5) * 0.07 * (0.2 + sil);
  sil = max(sil, 0.015);
  yn = max((y - 0.004) / hgt, 0.0);
  float cov = smoothstep(-fw, fw, 0.004 + sil * hgt - y);
  if (cov <= 0.0) return vec4(0.0);
  // which summit this pixel belongs to: the valley line runs down from the saddle at a slant
  float xv = clamp(fs + (S - yn) * (hs(i0 + salt + 401.0) - 0.5) * 0.9, 0.12, 0.88);
  bool left = f < xv;
  float pk = left ? i0 : i1, H = left ? A : B, dx = left ? f : f - 1.0, w = left ? fs : 1.0 - fs;
  float ps = pk * 3.7 + salt;
  // fan coordinate round the summit: 0 straight below it, +-1 on the skyline edges
  float gs = dx / w * (H - S) / max(H - yn, 0.06);
  float u = gs - (hs(ps + 601.0) - 0.5) * 0.9, side = u < 0.0 ? -1.0 : 1.0;
  float q = floor(u * 3.0), q2 = floor(u * 9.0 + 3.0 * hs(ps + 650.0));
  // the facet's normal: leaning to its side of the spur, towards the viewer and up
  float tx = side * 0.8 + (hs(ps + q * 3.1 + 811.0) - 0.5) * 0.8, uy = 0.4 + 0.45 * hs(ps + q * 1.7 + 907.0);
  // the lower tier: buttresses below a break line that steps from one narrow facet to the next
  if (yn < H * (0.22 + 0.3 * hs(ps + q2 * 4.3 + 950.0))) { tx += (hs(ps + q2 * 2.1 + 977.0) - 0.5) * 1.3; uy += 0.25; }
  vec3 n = normalize(vec3(-sin(az), 0.0, cos(az)) * tx - vec3(cos(az), 0.0, sin(az)) * 0.55 + vec3(0.0, uy, 0.0));
  float sl = smoothstep(-0.05, 0.5, dot(n, sunL));
  float lit = 0.52 + 0.78 * sl;
  lit *= 0.955 + 0.09 * hs(ps + q2 * 1.3 + 1201.0); // gullies: narrow facets within a face
  float sy = yn + u * 0.3 * (hs(ps + q * 2.3 + 1009.0) - 0.5);
  lit *= 1.0 - 0.045 * step(0.6, fract(sy * 5.0 + hs(ps + 1103.0))); // strata, tilted with the face
  lit *= mix(0.84, 1.0, smoothstep(0.0, 0.2, yn)); // a darker foot
  vec3 mc = uMount * lit;
  // snow: on the higher faces, lower on the sunlit ones, with a ragged (stepped and zigzag) lower edge
  float line = mix(0.95, 0.22, uMountP.x) + 0.13 * (1.0 - sl) + 0.1 * (hs(ps + q2 * 2.9 + 1301.0) - 0.5) + 0.1 * abs(fract(u * 4.0 + hs(ps + 1400.0)) - 0.5);
  float snow = smoothstep(0.0, 0.5, uMountP.x) * step(line, yn);
  mc = mix(mc, vec3(0.88, 0.89, 0.9) * mix(vec3(0.8, 0.87, 0.97), vec3(1.0), sl) * (0.72 + 0.4 * sl), snow);
  return vec4(mc, cov);
}
float vn1(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5), b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5), d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
void main() {
  vec4 p = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(p.xyz / p.w - uEye);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 sky = mix(fogColor(d), uZenith, pow(h, 0.5));
  if (d.y < 0.0) sky = mix(fogColor(d), uGroundAmb * 1.6, clamp(-d.y * 3.0, 0.0, 0.5));
  float s = max(dot(d, uSunDir), 0.0);
  // stars on airless worlds
  if (uMoonP.z > 0.0 && d.y > 0.02) { vec2 g = floor(vec2(atan(d.z, d.x) * 300.0, d.y * 300.0)); float st = step(0.997, fract(sin(dot(g, vec2(12.9898, 78.233))) * 43758.5)); sky += vec3(0.8) * st * uMoonP.z * smoothstep(0.02, 0.2, d.y); }
  // the moon (a ringed planet on Halcyon): lit on its sun side, with its ring
  vec3 md = uMoonDir; float r = uMoonP.x;
  vec3 mu = normalize(cross(md, vec3(0.0, 1.0, 0.0))), mv = cross(mu, md);
  vec2 q = vec2(dot(d, mu), dot(d, mv)) / r; float front = dot(d, md);
  if (front > 0.0) {
    float rr = dot(q, q);
    vec2 rq = vec2(q.x * 0.94 + q.y * 0.34, (q.y * 0.94 - q.x * 0.34) / 0.3); float ring = length(rq);
    bool ringHit = uMoonP.y > 0.5 && ring > 1.35 && ring < 1.95 && (rr > 1.0 || rq.y < 0.0);
    if (rr < 1.0) {
      vec3 n = normalize(q.x * mu + q.y * mv - sqrt(1.0 - rr) * md);
      float li = 0.3 + 0.75 * max(dot(n, uSunDir) + 0.15, 0.0);
      float band = 0.92 + 0.08 * sin(q.y * 9.0 + q.x * 1.5);
      sky = mix(sky, uMoonCol * li * band, 0.62);
    }
    if (ringHit) sky = mix(sky, uMoonCol * 1.08, 0.5 * smoothstep(1.35, 1.45, ring) * (1.0 - smoothstep(1.85, 1.95, ring)));
  }
  // low clouds: soft banks near the horizon
  if (uCloudP.x > 0.0 && d.y > 0.0) {
    float az = atan(d.z, d.x), el = d.y;
    float n = vn1(vec2(az * 7.0, el * 26.0)) * 0.6 + vn1(vec2(az * 17.0 + 3.0, el * 60.0)) * 0.4;
    float band = smoothstep(0.02, 0.07, el) * (1.0 - smoothstep(uCloudP.y * 0.6, uCloudP.y, el));
    float c = smoothstep(1.0 - uCloudP.x, 1.08 - uCloudP.x, n) * band;
    vec3 cc = uCloud * (0.9 + 0.2 * smoothstep(0.3, 1.0, n)) + uSunCol * pow(s, 4.0) * 0.15;
    sky = mix(sky, mix(cc, fogColor(d), 0.25), c * 0.85);
  }
  // mountains: three ranges, far (pale, deep in the haze) to near; faceted solids with snow, see range()
  float mfw = fwidth(d.y) * 1.2;
  if (d.y < uMountP.y * 1.25 + 0.02 && d.y > -0.03) {
    float az = atan(d.z, d.x);
    vec3 sunL = normalize(uSunDir * vec3(1.0, 0.55, 1.0));
    for (int L = 0; L < 3; L++) {
      float k = L == 0 ? 45.0 : L == 1 ? 35.0 : 25.0, off = L == 0 ? 0.0 : L == 1 ? 0.37 : 0.71;
      float hgt = uMountP.y * (L == 0 ? 1.0 : L == 1 ? 0.8 : 0.55), yn;
      vec4 m = range(az, d.y, k, off, hgt, sunL, mfw, yn);
      float hz = L == 0 ? 0.52 : L == 1 ? 0.32 : 0.14;
      hz += (1.0 - hz) * 0.3 * (1.0 - smoothstep(0.0, 0.3, yn)); // ground haze at the foot
      hz = mix(hz, 0.9, smoothstep(0.004, -0.012, d.y)); // below the horizon the ranges sink into the haze
      sky = mix(sky, mix(m.rgb, fogColor(d), hz), m.a);
    }
  }
  sky += uSunCol * (smoothstep(0.9985, 0.9993, s) * 0.9 + pow(s, 60.0) * 0.18);
  o = vec4(mix(grade(sky), WBG * 0.7, uWire), 1.0);
}`;
// ---- P2 (effects pass): billboard / streak / ground-decal particles (fx-particles.ts layout P2_FLOATS = 16:
// iA x y z size, iB axis xyz length (flat: normal xyz rotation), iC rgba, iD shape geom lifeFraction seed). Shapes are
// drawn procedurally in the fragment shader (no textures). One draw per pass: decals and alpha (smoke, dust, debris)
// alpha-blended, additive (flash, fire, sparks, glows, tracers, beams) ONE / ONE; depth-tested, no depth writes.
const P2_VS = `#version 300 es
layout(location=0) in vec2 aQ;
layout(location=4) in vec4 iA; layout(location=5) in vec4 iB; layout(location=6) in vec4 iC; layout(location=7) in vec4 iD;
uniform mat4 uVP; uniform vec3 uEye, uCamR, uCamU;
out vec2 vQ; out vec4 vCol; flat out float vShape; out float vT; flat out float vSeed; out vec3 vWP;
void main() {
  vec2 q = aQ; float geom = iD.y; vec3 wp;
  if (geom < 0.5) {
    float an = iD.w * 6.2831853 + iD.z * (fract(iD.w * 7.31) - 0.5) * 2.0; // a random angle and a slow spin over the life
    float c = cos(an), s = sin(an); vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
    wp = iA.xyz + (uCamR * r.x + uCamU * r.y) * iA.w;
  } else if (geom < 1.5) {
    vec3 ax = iB.xyz, toE = uEye - iA.xyz;
    vec3 side = cross(ax, toE); float l = length(side); side = l > 1e-4 ? side / l : uCamR;
    wp = iA.xyz + ax * (q.y * 0.5 - 0.5) * iB.w + side * q.x * iA.w; // q.y -1 tail .. 1 head (at iA)
  } else {
    vec3 n = iB.xyz; vec3 t = abs(n.y) < 0.95 ? normalize(cross(n, vec3(0.0, 1.0, 0.0))) : normalize(cross(n, vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(n, t); float c = cos(iB.w), s = sin(iB.w);
    wp = iA.xyz + ((t * c + b * s) * q.x + (b * c - t * s) * q.y) * iA.w + n * 0.08;
  }
  vQ = q; vCol = iC; vShape = iD.x; vT = iD.z; vSeed = iD.w; vWP = wp;
  gl_Position = uVP * vec4(wp, 1.0);
}`;
const P2_FS = `#version 300 es
precision highp float;
${COMMON}
uniform float uPass;
in vec2 vQ; in vec4 vCol; flat in float vShape; in float vT; flat in float vSeed; in vec3 vWP;
out vec4 o;
float p2h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float p2n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(p2h(i), p2h(i + vec2(1, 0)), f.x), mix(p2h(i + vec2(0, 1)), p2h(i + vec2(1, 1)), f.x), f.y); }
vec2 p2rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(v.x * c - v.y * s, v.x * s + v.y * c); }
void main() {
  vec2 q = vQ; float r = length(q), a = 0.0; vec3 col = vCol.rgb; int sh = int(vShape + 0.5);
  if (sh == 0) a = max(0.0, exp(-r * r * 3.2) - 0.04);                                   // soft glow
  else if (sh == 1) {                                                                       // smoke / dust puff, gritty edge, soft light
    float n = p2n(q * 2.3 + vSeed * 31.0) * 0.6 + p2n(q * 5.1 - vSeed * 17.0) * 0.4;
    a = (1.0 - smoothstep(0.3, 1.0, r + (n - 0.5) * 0.6)) * (0.65 + 0.35 * n);
    float lk = 0.6 + 0.4 * clamp(0.5 + q.y * 0.55, 0.0, 1.0);
    col = col * (uSkyAmb * 0.75 + uSunCol * 0.5) * lk;
  }
  else if (sh == 2) a = exp(-q.x * q.x * 6.0) * (0.2 + 0.8 * (q.y * 0.5 + 0.5)) * (1.0 - smoothstep(0.8, 1.0, q.y)); // spark streak
  else if (sh == 3) { float d = (r - 0.8) / 0.13; a = exp(-d * d); }                      // ring
  else if (sh == 4) {                                                                       // star flash
    vec2 s = p2rot(q, vSeed * 6.2831853);
    float rays = exp(-abs(s.x) * 16.0) * exp(-abs(s.y) * 2.2) + exp(-abs(s.y) * 16.0) * exp(-abs(s.x) * 2.2);
    a = (exp(-r * r * 9.0) + rays * 0.75) * (1.0 - smoothstep(0.75, 1.0, r));
    col = mix(col, vec3(1.0, 0.97, 0.9), exp(-r * r * 30.0) * 0.8);
  }
  else if (sh == 5) {                                                                       // scorch decal
    float n = p2n(q * 3.1 + vSeed * 13.0) * 0.7 + p2n(q * 9.0 + vSeed * 7.0) * 0.3;
    a = (1.0 - smoothstep(0.25, 1.0, r + (n - 0.5) * 0.55)) * (0.75 + 0.25 * n);
  }
  else if (sh == 6) { float d = (r - 0.9) / 0.05, w = (r - 0.9) / 0.3; a = (exp(-d * d) + 0.3 * exp(-w * w) * step(r, 0.9)) * step(r, 1.0); } // shockwave ring
  else if (sh == 7) {                                                                       // beam (streak geometry): bright core
    a = exp(-q.x * q.x * 5.0) * smoothstep(-1.0, -0.9, q.y) * (1.0 - smoothstep(0.96, 1.0, q.y));
    col = mix(col, vec3(1.0), exp(-q.x * q.x * 40.0) * 0.65);
  }
  else if (sh == 8) {                                                                       // shield ripple: an expanding hex-broken ring
    float rr = 0.2 + 0.75 * vT, d = (r - rr) / 0.14;
    vec2 h = q * 5.0; float hex = abs(fract(h.x + 0.5 * floor(h.y)) - 0.5) + abs(fract(h.y) - 0.5);
    a = exp(-d * d) * (0.55 + 0.45 * smoothstep(0.2, 0.45, hex)) + exp(-r * r * 6.0) * (1.0 - vT) * 0.6;
  }
  else if (sh == 9) {                                                                       // debris chunk: a hard dark shard, lit flat
    vec2 s = p2rot(q, vSeed * 6.2831853 + vT * 9.0);
    a = 1.0 - smoothstep(0.55, 0.7, max(abs(s.x) * 1.3, abs(s.y)) + abs(s.x * s.y) * 0.4);
    col = col * (uSkyAmb + uSunCol * 0.6);
  }
  else if (sh == 10) a = exp(-q.x * q.x * 4.0) * (0.15 + 0.85 * (q.y * 0.5 + 0.5));      // streak (rain, tracer glow)
  else if (sh == 11) {                                                                      // holo / hex patch
    vec2 h = q * 3.0; float hex = abs(fract(h.x + 0.5 * floor(h.y)) - 0.5) + abs(fract(h.y) - 0.5);
    a = (1.0 - smoothstep(0.7, 1.0, r)) * (0.25 + 0.75 * (1.0 - smoothstep(0.03, 0.1, abs(hex - 0.5))));
  }
  else if (sh == 12) {                                                                      // flame tongue
    float w = 0.55 + 0.45 * (1.0 - q.y);
    float n = p2n(vec2(q.x * 3.0, q.y * 2.0 - vT * 6.0) + vSeed * 9.0);
    a = (1.0 - smoothstep(0.3, 1.0, length(vec2(q.x / w, q.y * 0.9)) + (n - 0.5) * 0.5));
    col = mix(col, vec3(1.0, 0.92, 0.6), clamp(0.6 - q.y * 0.6, 0.0, 1.0) * 0.7);
  }
  a *= vCol.a * (1.0 - uWire);
  a *= clamp((length(uEye - vWP) - 0.2) / 0.8, 0.0, 1.0); // nothing drawn on the near plane
  if (a <= 0.002) discard;
  if (uPass > 0.5 && uPass < 1.5) { o = vec4(min(col * a * (1.0 - fogAmount(vWP) * 0.85), vec3(1.5)), 1.0); }
  else { o = vec4(grade(applyFog(col, vWP, uPass > 1.5 ? 1.0 : 0.85)), min(a, 1.0)); }
}`;
/** Outline -> icon cross-fade by a unit's on-screen size (CSS px of its footprint): icon below ICON_PX[0], outline above ICON_PX[1]. */
exports.ICON_PX = [12, 24];
/** Footprint size (m) a kind is judged by for the cross-fade: its mesh diameter, clamped to 3.5 m (a squad's spread) .. 12 m. */
const kindFootprint = (m) => Math.min(12, Math.max(2 * m.radius, 3.5));
exports.kindFootprint = kindFootprint;
class Renderer {
    gl;
    look;
    drawCalls = 0;
    triangles = 0;
    /** Line segments (edges, tracer segments, rings) and vertices submitted this frame. */
    lines = 0;
    vertices = 0;
    /** 0 shaded scene .. 1 tactical display; set per frame from the camera blend. */
    wire = 0;
    /** Line width in drawing-buffer pixels (CSS px x DPR) and the DPR, for the tactical display. */
    lineWidth = 1.5;
    dpr = 1;
    mapSize = 2000;
    /** T1: contour spacing factor of the tactical display (1; a relief planet: wider, steep ground hatched). */
    contour = 1;
    unit;
    terrain;
    shadow;
    ring;
    icon;
    proj;
    fx;
    sky;
    edge;
    pline;
    shieldP;
    iconK;
    plineK;
    circleK;
    shieldK = null;
    viewW = 1;
    viewH = 1;
    kinds = new Map();
    terrainVao = null;
    terrainCount = 0;
    outerVao = null;
    outerCount = 0;
    disc;
    ringK;
    projK;
    fxK;
    skyVao;
    vp = new Float32Array(16);
    invVP = new Float32Array(16);
    eye = [0, 0, 0];
    fogDensity = 0.0008;
    fogStart = 0;
    time = 0;
    constructor(gl, look) {
        this.gl = gl;
        this.look = look;
        this.unit = this.program(UNIT_VS, UNIT_FS);
        this.terrain = this.program(TERRAIN_VS, TERRAIN_FS);
        this.shadow = this.program(DISC_VS, SHADOW_FS);
        this.ring = this.program(DISC_VS, RING_FS);
        this.icon = this.program(ICON_VS, ICON_FS);
        this.edge = this.program(EDGE_VS, EDGE_FS);
        this.pline = this.program(PLINE_VS, PLINE_FS);
        this.proj = this.program(PROJ_VS, PROJ_FS);
        this.fx = this.program(FX_VS, FX_FS);
        this.sky = this.program(SKY_VS, SKY_FS);
        this.shieldP = this.program(SHIELD_VS, SHIELD_FS);
        this.skyVao = gl.createVertexArray();
        // disc (shadow) quad, tracer box
        const quad = new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1]);
        this.disc = this.instanced({ verts: quad, count: 6, pivot: [0, 0, 0], hover: 0, bob: 0, height: 0, radius: 1, minY: 0, midY: 0, recoil: 0 }, 3, 2, exports.DISC_FLOATS);
        // P1g: tracer ribbon (tail quad + rounded head cap; aPos = along -1..0, across -1..1, cap 0..1)
        const bx = [];
        const rq = (a, b, c2, d) => bx.push(...a, ...b, ...c2, ...a, ...c2, ...d);
        rq([-1, -1, 0], [0, -1, 0], [0, 1, 0], [-1, 1, 0]);
        rq([0, -1, 0], [0, -1, 1], [0, 1, 1], [0, 1, 0]);
        this.projK = this.instanced({ verts: new Float32Array(bx), count: PROJ_VERTS, pivot: [0, 0, 0], hover: 0, bob: 0, height: 0, radius: 1, minY: 0, midY: 0, recoil: 0 }, 3, 2, exports.PROJ_FLOATS);
        const seg = new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, -1, 0, 1, 1, 0, 0, 1, 0]);
        this.iconK = this.instanced({ verts: seg, count: 6, pivot: [0, 0, 0], hover: 0, bob: 0, height: 0, radius: 1, minY: 0, midY: 0, recoil: 0 }, 3, 2, exports.ICON_FLOATS);
        this.plineK = this.instanced({ verts: seg, count: 6, pivot: [0, 0, 0], hover: 0, bob: 0, height: 0, radius: 1, minY: 0, midY: 0, recoil: 0 }, 3, 2, exports.PROJ_FLOATS);
        this.circleK = this.instanced({ verts: new Float32Array(0), count: 0, pivot: [0, 0, 0], hover: 0, bob: 0, height: 0, radius: 1, minY: 0, midY: 0, recoil: 0 }, 3, 2, exports.INST_FLOATS);
        this.attachEdges(this.circleK, (0, meshes_ts_1.circleEdges)(40));
        this.ringK = this.disc; // placeholder, replaced by setRingMesh
        this.fxK = this.disc;
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }
    shader(type, src) {
        const gl = this.gl, s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            throw new Error(`shader compile failed: ${gl.getShaderInfoLog(s)}\n${src.split("\n").slice(0, 3).join("\n")}`);
        return s;
    }
    program(vs, fs) {
        const gl = this.gl, p = gl.createProgram();
        gl.attachShader(p, this.shader(gl.VERTEX_SHADER, vs));
        gl.attachShader(p, this.shader(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS))
            throw new Error(`program link failed: ${gl.getProgramInfoLog(p)}`);
        const u = {};
        const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
            const info = gl.getActiveUniform(p, i);
            u[info.name] = gl.getUniformLocation(p, info.name);
        }
        return { p, u };
    }
    /**
     * VAO for a mesh plus an instance buffer. layout: "full" vertex (11 floats:
     * pos, normal, colour, part+material at locations 0-3) or position-only (3
     * floats); instance attributes at locations 4 (vec4), 5 (vec4) and, for 9-float
     * instances, 6 (float).
     */
    instanced(mesh, stride, _unused, instFloats) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
        const S = stride * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
        if (stride === meshes_ts_1.VERTEX_FLOATS) {
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
            gl.enableVertexAttribArray(3);
            gl.vertexAttribPointer(3, 2, gl.FLOAT, false, S, 36);
        }
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ib);
        gl.bufferData(gl.ARRAY_BUFFER, 4 * instFloats * 64, gl.DYNAMIC_DRAW);
        const IS = instFloats * 4;
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, false, IS, 0);
        gl.vertexAttribDivisor(4, 1);
        gl.enableVertexAttribArray(5);
        gl.vertexAttribPointer(5, 4, gl.FLOAT, false, IS, 16);
        gl.vertexAttribDivisor(5, 1);
        if (instFloats > 8) {
            gl.enableVertexAttribArray(6);
            gl.vertexAttribPointer(6, instFloats - 8 >= 4 ? 4 : 1, gl.FLOAT, false, IS, 32);
            gl.vertexAttribDivisor(6, 1);
        }
        gl.bindVertexArray(null);
        return { vao, inst: ib, cap: 64, mesh, size: (0, exports.kindFootprint)(mesh) };
    }
    /** A unit / prop kind; `edges`: also build its outline (real mesh edges) for the tactical display. */
    addKind(name, mesh, edges = false, edgeMesh = mesh) {
        const k = this.instanced(mesh, meshes_ts_1.VERTEX_FLOATS, 0, exports.INST_FLOATS);
        if (edges)
            this.attachEdges(k, (0, meshes_ts_1.buildEdges)(edgeMesh)); // G2: outlines come from the base mesh (edgeMesh), not the detail
        this.kinds.set(name, k);
    }
    /** Edge VAO sharing the kind's instance buffer (so one upload serves the fill and the outline). */
    attachEdges(k, e) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, e.verts, gl.STATIC_DRAW);
        const S = meshes_ts_1.EDGE_FLOATS * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 24);
        gl.bindBuffer(gl.ARRAY_BUFFER, k.inst);
        const IS = exports.INST_FLOATS * 4;
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 4, gl.FLOAT, false, IS, 0);
        gl.vertexAttribDivisor(4, 1);
        gl.enableVertexAttribArray(5);
        gl.vertexAttribPointer(5, 4, gl.FLOAT, false, IS, 16);
        gl.vertexAttribDivisor(5, 1);
        gl.enableVertexAttribArray(6);
        gl.vertexAttribPointer(6, 4, gl.FLOAT, false, IS, 32);
        gl.vertexAttribDivisor(6, 1);
        gl.bindVertexArray(null);
        k.edgeVao = vao;
        k.edges = e;
    }
    /** Edge count of a kind's outline (tests, report). */
    kindEdges(name) { return this.kinds.get(name)?.edges?.edges ?? 0; }
    /** Footprint (m) used for the outline / icon cross-fade. */
    kindSize(name) { return this.kinds.get(name)?.size ?? 4; }
    /** Projection focal length in drawing-buffer pixels (P[1][1] x height / 2), for screen-size tests in shaders. */
    focalPx = 1;
    setRingMesh(mesh) {
        const pos = new Float32Array((mesh.verts.length / meshes_ts_1.VERTEX_FLOATS) * 3);
        for (let i = 0, j = 0; i < mesh.verts.length; i += meshes_ts_1.VERTEX_FLOATS, j += 3) {
            pos[j] = mesh.verts[i];
            pos[j + 1] = mesh.verts[i + 1];
            pos[j + 2] = mesh.verts[i + 2];
        }
        this.ringK = this.instanced({ ...mesh, verts: pos }, 3, 0, exports.DISC_FLOATS);
    }
    setPuffMesh(mesh) { this.fxK = this.instanced(mesh, meshes_ts_1.VERTEX_FLOATS, 0, exports.FX_FLOATS); }
    setShieldMesh(mesh) { this.shieldK = this.instanced(mesh, meshes_ts_1.VERTEX_FLOATS, 0, exports.SHIELD_FLOATS); }
    kindMesh(name) { return this.kinds.get(name)?.mesh; }
    /** Terrain mesh from the shared heightmap: smooth normals, vertex colours from `colour(x, z, h, slope)`. */
    setTerrain(hm, colour) {
        const r = this.gridMesh(hm.cols, hm.rows, hm.cellSize, 0, 0, (i, j) => hm.heights[j * hm.cols + i], colour, () => true);
        this.terrainVao = r.vao;
        this.terrainCount = r.count;
    }
    /**
     * Coarse scenery beyond the playable map (the heightfield continued with the
     * same function), so the edge of the map is hidden in haze instead of ending
     * in a cliff. Cells inside the map are left out except a one-cell ring sunk
     * 3 m under the real terrain, which hides the seam.
     */
    setOuterTerrain(mapSize, extent, cell, height, colour) {
        const n = Math.round((mapSize + 2 * extent) / cell) + 1, o = -extent;
        const inside = (x, z) => x > 0 && x < mapSize && z > 0 && z < mapSize;
        const hs = new Float64Array(n * n);
        for (let j = 0; j < n; j++)
            for (let i = 0; i < n; i++) {
                const x = o + i * cell, z = o + j * cell;
                hs[j * n + i] = height(x, z) - (inside(x, z) ? 4 : 0);
            }
        const keep = (i, j) => { const x0 = o + i * cell, z0 = o + j * cell; return !(x0 >= cell && x0 + cell <= mapSize - cell && z0 >= cell && z0 + cell <= mapSize - cell); };
        const r = this.gridMesh(n, n, cell, o, o, (i, j) => hs[j * n + i], colour, keep);
        this.outerVao = r.vao;
        this.outerCount = r.count;
    }
    gridMesh(nx, nz, cs, ox, oz, H, colour, keep) {
        const gl = this.gl;
        const v = new Float32Array(nx * nz * 12);
        const c = [0, 0, 0, 0, 0, 0];
        for (let j = 0; j < nz; j++)
            for (let i = 0; i < nx; i++) {
                const k = (j * nx + i) * 12, x = ox + i * cs, z = oz + j * cs, h = H(i, j);
                const hl = H(Math.max(0, i - 1), j), hr = H(Math.min(nx - 1, i + 1), j);
                const hd = H(i, Math.max(0, j - 1)), hu = H(i, Math.min(nz - 1, j + 1));
                let n0 = hl - hr, n1 = 2 * cs, n2 = hd - hu;
                const l = Math.hypot(n0, n1, n2);
                n0 /= l;
                n1 /= l;
                n2 /= l;
                c[3] = 0;
                c[4] = 0;
                c[5] = 0;
                colour(x, z, h, n1, c);
                v[k] = x;
                v[k + 1] = h;
                v[k + 2] = z;
                v[k + 3] = n0;
                v[k + 4] = n1;
                v[k + 5] = n2;
                v[k + 6] = c[0];
                v[k + 7] = c[1];
                v[k + 8] = c[2];
                v[k + 9] = c[3];
                v[k + 10] = c[4];
                v[k + 11] = c[5];
            }
        const tmp = [];
        for (let j = 0; j < nz - 1; j++)
            for (let i = 0; i < nx - 1; i++) {
                if (!keep(i, j))
                    continue;
                const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1;
                // counter-clockwise seen from above (+y): a, d, b and b, d, e
                tmp.push(a, d, b, b, d, e);
            }
        const idx = new Uint32Array(tmp);
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 48, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 48, 12);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 48, 24);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 48, 36);
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        return { vao, count: idx.length };
    }
    setCommon(pr) {
        const gl = this.gl, L = this.look, u = pr.u;
        gl.useProgram(pr.p);
        if (u.uVP)
            gl.uniformMatrix4fv(u.uVP, false, this.vp);
        const v3 = (n, a) => { if (u[n])
            gl.uniform3fv(u[n], a); };
        v3("uSunDir", L.sunDir);
        v3("uSunCol", L.sunCol);
        v3("uSkyAmb", L.skyAmb);
        v3("uGroundAmb", L.groundAmb);
        v3("uHorizon", L.horizon);
        v3("uZenith", L.zenith);
        v3("uSunHaze", L.sunHaze);
        v3("uEye", this.eye);
        v3("uHullA", L.hullA);
        v3("uHullB", L.hullB);
        v3("uGlowA", L.glowA);
        v3("uGlowB", L.glowB);
        v3("uMount", L.mount);
        v3("uMountP", L.mountP);
        v3("uMoonDir", L.moonDir);
        v3("uMoonCol", L.moonCol);
        v3("uMoonP", L.moonP);
        v3("uCloud", L.cloud);
        v3("uCloudP", L.cloudP);
        if (u.uFogDensity)
            gl.uniform1f(u.uFogDensity, this.fogDensity);
        if (u.uFogStart)
            gl.uniform1f(u.uFogStart, this.fogStart);
        if (u.uTime)
            gl.uniform1f(u.uTime, this.time);
        if (u.uWire)
            gl.uniform1f(u.uWire, this.wire);
        if (u.uView)
            gl.uniform2f(u.uView, this.viewW, this.viewH);
        if (u.uWidth)
            gl.uniform1f(u.uWidth, this.lineWidth);
        if (u.uDpr)
            gl.uniform1f(u.uDpr, this.dpr);
        if (u.uMapSize)
            gl.uniform1f(u.uMapSize, this.mapSize);
        if (u.uContour)
            gl.uniform1f(u.uContour, this.contour);
        if (u.uSink)
            gl.uniform1f(u.uSink, 0);
        if (u.uBlur)
            gl.uniform1f(u.uBlur, 0);
        if (u.uRotorN)
            gl.uniform1f(u.uRotorN, 0);
        if (u.uPod)
            gl.uniform4f(u.uPod, 0, 0, 0, 0);
        if (u.uRecoil)
            gl.uniform1f(u.uRecoil, 0);
        if (u.uGhost)
            gl.uniform4f(u.uGhost, 0, 0, 0, 0);
    }
    begin(vp, invVP, eye, fogDensity, fogStart, w, h) {
        const gl = this.gl;
        this.vp.set(vp);
        this.invVP.set(invVP);
        this.eye = eye;
        this.fogDensity = fogDensity;
        this.fogStart = fogStart;
        this.drawCalls = 0;
        this.triangles = 0;
        this.lines = 0;
        this.vertices = 0;
        this.viewW = w;
        this.viewH = h;
        gl.viewport(0, 0, w, h);
        gl.depthMask(true);
        const H = this.look.horizon, k = this.wire;
        gl.clearColor(H[0] + (exports.WIRE_BG[0] * 0.7 - H[0]) * k, H[1] + (exports.WIRE_BG[1] * 0.7 - H[1]) * k, H[2] + (exports.WIRE_BG[2] * 0.7 - H[2]) * k, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    /**
     * First-person viewmodel (slice 3b, item 13): meshes in camera space drawn after the world with their own
     * view-projection (narrower field of view, near 0.02 m) into a cleared depth range, so they never clip into world
     * geometry. No fog, no tactical-display blend.
     */
    drawViewModel(parts, vpVM) {
        const gl = this.gl;
        const saveVP = this.vp.slice(), saveEye = this.eye, saveFog = this.fogDensity, saveWire = this.wire;
        this.vp.set(vpVM);
        this.eye = [0, 0, 0];
        this.fogDensity = 0;
        this.wire = 0;
        gl.depthMask(true);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        for (const p of parts)
            this.drawKind(p.name, p.inst, 1);
        this.vp.set(saveVP);
        this.eye = saveEye;
        this.fogDensity = saveFog;
        this.wire = saveWire;
    }
    drawSky() {
        const gl = this.gl;
        this.setCommon(this.sky);
        gl.uniformMatrix4fv(this.sky.u.uInvVP, false, this.invVP);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);
        gl.bindVertexArray(this.skyVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.depthMask(true);
        gl.depthFunc(gl.LESS);
        this.drawCalls++;
        this.triangles += 1;
        this.vertices += 3;
    }
    drawTerrain() {
        if (!this.terrainVao)
            return;
        const gl = this.gl;
        this.setCommon(this.terrain);
        gl.bindVertexArray(this.terrainVao);
        gl.drawElements(gl.TRIANGLES, this.terrainCount, gl.UNSIGNED_INT, 0);
        this.drawCalls++;
        this.triangles += this.terrainCount / 3;
        this.vertices += this.terrainCount;
        if (this.outerVao) {
            gl.bindVertexArray(this.outerVao);
            gl.drawElements(gl.TRIANGLES, this.outerCount, gl.UNSIGNED_INT, 0);
            this.drawCalls++;
            this.triangles += this.outerCount / 3;
            this.vertices += this.outerCount;
        }
    }
    upload(k, data, n, floats) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, k.inst);
        if (n > k.cap) {
            let c = k.cap;
            while (c < n)
                c *= 2;
            k.cap = c;
            gl.bufferData(gl.ARRAY_BUFFER, 4 * floats * c, gl.DYNAMIC_DRAW);
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, n * floats);
    }
    /**
     * One instanced draw of a unit / prop kind. In the tactical display (wire > 0)
     * the same draw is the hidden-line fill: the shader fades the colour to the
     * ground colour and the depth is pushed back by a polygon offset so the
     * mesh's own edges pass the depth test while edges behind it do not.
     * `sink` lowers the instances into the ground (props leaving the display).
     */
    /** F3: draws of the rotor blur pass (stats). */
    rotorDraws = 0;
    rotorBuf = new Float32Array(16);
    /** F3: a kind's rotor hubs into uRotor / uRotorN (0 when it has none); returns the rotor count. */
    setRotors(u, mesh) {
        const gl = this.gl, r = mesh.rotors ?? [], n = Math.min(4, r.length);
        if (u.uRotorN)
            gl.uniform1f(u.uRotorN, n);
        if (u.uPod) {
            const q = mesh.pod;
            gl.uniform4f(u.uPod, q ? q[0] : 0, q ? q[1] : 0, q ? q[2] : 0, q ? q[3] : 0);
        } // ruling 130
        const loc = u["uRotor[0]"] ?? u.uRotor;
        if (n > 0 && loc) {
            this.rotorBuf.fill(0);
            for (let i = 0; i < n; i++)
                this.rotorBuf.set(r[i], i * 4);
            gl.uniform4fv(loc, this.rotorBuf);
        }
        return n;
    }
    drawKind(name, inst, n, hoverScale = 1, sink = 0) {
        const k = this.kinds.get(name);
        if (!k || n === 0)
            return;
        const gl = this.gl;
        this.setCommon(this.unit);
        gl.uniform3fv(this.unit.u.uPivot, k.mesh.pivot);
        gl.uniform1f(this.unit.u.uHover, k.mesh.hover * hoverScale);
        gl.uniform1f(this.unit.u.uBob, k.mesh.bob * hoverScale);
        gl.uniform1f(this.unit.u.uRecoil, k.mesh.recoil);
        gl.uniform1f(this.unit.u.uHeight, k.mesh.height);
        if (sink)
            gl.uniform1f(this.unit.u.uSink, sink);
        const nr = this.setRotors(this.unit.u, k.mesh);
        this.upload(k, inst, n, exports.INST_FLOATS);
        if (this.wire > 0) {
            gl.enable(gl.POLYGON_OFFSET_FILL);
            gl.polygonOffset(1, 2);
        }
        gl.bindVertexArray(k.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, k.mesh.count, n);
        if (this.wire > 0)
            gl.disable(gl.POLYGON_OFFSET_FILL);
        this.drawCalls++;
        this.triangles += (k.mesh.count / 3) * n;
        this.vertices += k.mesh.count * n;
        if (nr > 0 && this.wire < 0.6) { // F3: the rotor blur discs, blended over (depth-tested, not written)
            gl.uniform1f(this.unit.u.uBlur, 1);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthMask(false);
            gl.disable(gl.CULL_FACE);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, k.mesh.count, n);
            gl.depthMask(true);
            gl.disable(gl.BLEND);
            gl.enable(gl.CULL_FACE);
            gl.uniform1f(this.unit.u.uBlur, 0);
            this.drawCalls++;
            this.rotorDraws++;
        }
    }
    /**
     * B2: translucent ghosts of a kind (the placement ghost, waiting building sites): the unit mesh tinted towards
     * rgb at alpha, blended, depth-tested but not depth-writing. Uploads the instances (drawKindEdges may follow).
     */
    drawGhost(name, inst, n, rgb, alpha) {
        const k = this.kinds.get(name);
        if (!k || n === 0)
            return;
        const gl = this.gl;
        this.setCommon(this.unit);
        gl.uniform3fv(this.unit.u.uPivot, k.mesh.pivot);
        gl.uniform1f(this.unit.u.uHover, k.mesh.hover);
        gl.uniform1f(this.unit.u.uBob, 0);
        gl.uniform1f(this.unit.u.uRecoil, 0);
        gl.uniform1f(this.unit.u.uHeight, k.mesh.height);
        gl.uniform4f(this.unit.u.uGhost, rgb[0], rgb[1], rgb[2], Math.max(0.01, alpha));
        this.setRotors(this.unit.u, k.mesh);
        this.upload(k, inst, n, exports.INST_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.bindVertexArray(k.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, k.mesh.count, n);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.uniform4f(this.unit.u.uGhost, 0, 0, 0, 0);
        this.drawCalls++;
        this.triangles += (k.mesh.count / 3) * n;
        this.vertices += k.mesh.count * n;
    }
    /**
     * Outline of a kind, after drawKind uploaded the same instances: one
     * instanced draw of its edge quads, depth-tested (LEQUAL) against the fills
     * and the terrain, not depth-writing, alpha-blended.
     */
    drawKindEdges(name, n, alpha, hoverScale = 1) {
        const k = this.kinds.get(name);
        if (!k || !k.edgeVao || !k.edges || n === 0 || alpha <= 0.003)
            return;
        this.edgeDraw(k, n, alpha, hoverScale, false);
    }
    edgeDraw(k, n, alpha, hoverScale, phaseAlpha) {
        const gl = this.gl, u = this.edge.u;
        this.setCommon(this.edge);
        gl.uniform3fv(u.uPivot, k.mesh.pivot);
        gl.uniform1f(u.uHover, k.mesh.hover * hoverScale);
        gl.uniform1f(u.uBob, k.mesh.bob * hoverScale);
        gl.uniform1f(u.uRecoil, k.mesh.recoil);
        gl.uniform1f(u.uHeight, k.mesh.height);
        gl.uniform1f(u.uAlpha, alpha);
        this.setRotors(u, k.mesh);
        gl.uniform1f(u.uPhaseAlpha, phaseAlpha ? 1 : 0);
        gl.uniform1f(u.uCap, phaseAlpha ? 0 : 0.5);
        gl.uniform1f(u.uSizeM, k.size);
        gl.uniform1f(u.uFocalPx, this.focalPx);
        gl.uniform2f(u.uIconPx, exports.ICON_PX[0] * this.dpr, exports.ICON_PX[1] * this.dpr);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);
        if (phaseAlpha)
            gl.disable(gl.DEPTH_TEST);
        gl.bindVertexArray(k.edgeVao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, k.edges.count, n);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.lines += k.edges.edges * n;
        this.vertices += k.edges.count * n;
        this.triangles += (k.edges.count / 3) * n;
    }
    /** Explosion rings (tactical display): unit-instance layout, phase = alpha, scale = radius, drawn over the ground. */
    drawFxRings(inst, n, alpha) {
        if (n === 0 || alpha <= 0.003)
            return;
        this.upload(this.circleK, inst, n, exports.INST_FLOATS);
        this.edgeDraw(this.circleK, n, alpha, 0, true);
    }
    /** Projectiles as short bright segments (tactical display), additive. */
    drawProjectileLines(inst, n, alpha) {
        if (n === 0 || alpha <= 0.003)
            return;
        const gl = this.gl;
        this.setCommon(this.pline);
        gl.uniform1f(this.pline.u.uAlpha, alpha);
        gl.uniform1f(this.pline.u.uCap, 0.5);
        this.upload(this.plineK, inst, n, exports.PROJ_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(this.plineK.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
        gl.enable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.lines += n;
        this.vertices += 6 * n;
        this.triangles += 2 * n;
    }
    drawShadows(inst, n) {
        if (n === 0 || this.wire >= 1)
            return;
        const gl = this.gl;
        this.setCommon(this.shadow);
        gl.uniform1f(this.shadow.u.uLift, 0.15);
        this.upload(this.disc, inst, n, exports.DISC_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-2, -4);
        gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(this.disc.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.triangles += 2 * n;
        this.vertices += 6 * n;
    }
    drawRings(inst, n, color) {
        if (n === 0)
            return;
        const gl = this.gl;
        this.setCommon(this.ring);
        gl.uniform1f(this.ring.u.uLift, 0.35);
        gl.uniform3fv(this.ring.u.uColor, color);
        this.upload(this.ringK, inst, n, exports.DISC_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-2, -8);
        gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(this.ringK.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.ringK.mesh.count, n);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.triangles += (this.ringK.mesh.count / 3) * n;
        this.vertices += this.ringK.mesh.count * n;
    }
    /** Far-zoom tactical icons: one instance per icon line segment (ICON_FLOATS layout), drawn over everything. One draw call. */
    drawIcons(inst, n) {
        if (n === 0)
            return;
        const gl = this.gl;
        this.setCommon(this.icon);
        this.upload(this.iconK, inst, n, exports.ICON_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(this.iconK.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.triangles += 2 * n;
        this.vertices += 6 * n;
        this.lines += n;
    }
    /** Shield flashes (SHIELD_FLOATS layout), additive. One draw call. */
    drawShields(inst, n) {
        if (n === 0 || !this.shieldK || this.wire >= 1)
            return;
        const gl = this.gl;
        this.setCommon(this.shieldP);
        this.upload(this.shieldK, inst, n, exports.SHIELD_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
        gl.bindVertexArray(this.shieldK.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.shieldK.mesh.count, n);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.triangles += (this.shieldK.mesh.count / 3) * n;
        this.vertices += this.shieldK.mesh.count * n;
    }
    drawProjectiles(inst, n) {
        if (n === 0 || this.wire >= 1)
            return;
        const gl = this.gl;
        this.setCommon(this.proj);
        gl.uniform1f(this.proj.u.uFade, 1 - this.wire);
        this.upload(this.projK, inst, n, exports.PROJ_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(this.projK.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, PROJ_VERTS, n);
        gl.enable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.triangles += (PROJ_VERTS / 3) * n;
        this.vertices += PROJ_VERTS * n;
    }
    drawFx(inst, n) {
        if (n === 0 || this.wire >= 1)
            return;
        const gl = this.gl;
        this.setCommon(this.fx);
        this.upload(this.fxK, inst, n, exports.FX_FLOATS);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.bindVertexArray(this.fxK.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.fxK.mesh.count, n);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.triangles += (this.fxK.mesh.count / 3) * n;
        this.vertices += this.fxK.mesh.count * n;
    }
    // ---- P2 (effects pass): one instanced quad draw per pass (decals, alpha, additive); fx-p2.ts calls these
    p2Prog = null;
    p2K = [];
    p2Init() {
        const gl = this.gl;
        this.p2Prog = this.program(P2_VS, P2_FS);
        const quad = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
        for (let i = 0; i < 3; i++) {
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            const vb = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vb);
            gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
            const ib = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, ib);
            gl.bufferData(gl.ARRAY_BUFFER, 4 * exports.P2_INST * 256, gl.DYNAMIC_DRAW);
            for (let k = 0; k < 4; k++) {
                gl.enableVertexAttribArray(4 + k);
                gl.vertexAttribPointer(4 + k, 4, gl.FLOAT, false, exports.P2_INST * 4, k * 16);
                gl.vertexAttribDivisor(4 + k, 1);
            }
            gl.bindVertexArray(null);
            this.p2K.push({ vao, inst: ib, cap: 256 });
        }
    }
    /** P2: one pass of effect instances (pass 0 alpha, 1 additive, 2 ground decals); camR / camU: the camera's right and up. */
    drawP2(pass, inst, n, camR, camU) {
        if (n === 0 || this.wire >= 1)
            return;
        if (!this.p2Prog)
            this.p2Init();
        const gl = this.gl, pr = this.p2Prog, k = this.p2K[pass];
        this.setCommon(pr);
        gl.uniform1f(pr.u.uPass, pass);
        gl.uniform3f(pr.u.uCamR, camR[0], camR[1], camR[2]);
        gl.uniform3f(pr.u.uCamU, camU[0], camU[1], camU[2]);
        gl.bindBuffer(gl.ARRAY_BUFFER, k.inst);
        if (n > k.cap) {
            let c = k.cap;
            while (c < n)
                c *= 2;
            k.cap = c;
            gl.bufferData(gl.ARRAY_BUFFER, 4 * exports.P2_INST * c, gl.DYNAMIC_DRAW);
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, n * exports.P2_INST);
        gl.enable(gl.BLEND);
        if (pass === 1)
            gl.blendFunc(gl.ONE, gl.ONE);
        else
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        if (pass === 2) {
            gl.enable(gl.POLYGON_OFFSET_FILL);
            gl.polygonOffset(-2, -8);
        }
        gl.bindVertexArray(k.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
        if (pass === 2)
            gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        this.drawCalls++;
        this.triangles += 2 * n;
        this.vertices += 6 * n;
    }
    // ---- end P2
    /** Ray (origin o, direction d) against the terrain: distance, or -1. */
    static rayTerrain(hm, o, d, maxDist) {
        let t = 0, step = 4, prev = o[1] - (0, terrain_gen_ts_1.sampleHeight)(hm, o[0], o[2]);
        if (prev < 0)
            return 0;
        while (t < maxDist) {
            const nt = t + step;
            const x = o[0] + d[0] * nt, y = o[1] + d[1] * nt, z = o[2] + d[2] * nt;
            const gap = y - (0, terrain_gen_ts_1.sampleHeight)(hm, x, z);
            if (gap <= 0) {
                // refine by bisection
                let a = t, b = nt;
                for (let i = 0; i < 12; i++) {
                    const m = (a + b) / 2;
                    const g = o[1] + d[1] * m - (0, terrain_gen_ts_1.sampleHeight)(hm, o[0] + d[0] * m, o[2] + d[2] * m);
                    if (g > 0)
                        a = m;
                    else
                        b = m;
                }
                return (a + b) / 2;
            }
            prev = gap;
            t = nt;
            step = Math.min(24, Math.max(2, gap * 0.5));
        }
        return -1;
    }
}
exports.Renderer = Renderer;
