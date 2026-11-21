import bpy, bmesh, math
from mathutils import Vector, Matrix

# A new scene, so the open file's own scene is left as it was
scn = bpy.data.scenes.get("Mech") or bpy.data.scenes.new("Mech")
for o in list(scn.collection.all_objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.context.window.scene = scn

# ---------- materials ----------
def mat(name, base, metal=0.0, rough=0.5, emit=None, emit_str=0.0, wear=False, coat=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    P = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(P.outputs[0], out.inputs[0])
    P.inputs["Base Color"].default_value = (*base, 1)
    P.inputs["Metallic"].default_value = metal
    P.inputs["Roughness"].default_value = rough
    if coat:
        P.inputs["Coat Weight"].default_value = coat
    if emit:
        P.inputs["Emission Color"].default_value = (*emit, 1)
        P.inputs["Emission Strength"].default_value = emit_str
    if wear:
        # edge wear: convex edges (pointiness) scuff through to bare metal, broken up by noise; noisy paint roughness
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].position = 0.52
        ramp.color_ramp.elements[1].position = 0.6
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 22
        noise.inputs["Detail"].default_value = 10
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(geo.outputs["Pointiness"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], mul.inputs[0])
        nt.links.new(noise.outputs["Fac"], mul.inputs[1])
        k = nt.nodes.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.use_clamp = True
        k.inputs[1].default_value = 1.8
        nt.links.new(mul.outputs[0], k.inputs[0])
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
        mix.inputs[6].default_value = (*base, 1)
        mix.inputs[7].default_value = (0.5, 0.5, 0.5, 1)
        nt.links.new(k.outputs[0], mix.inputs[0])
        nt.links.new(mix.outputs[2], P.inputs["Base Color"])
        mm = nt.nodes.new("ShaderNodeMix"); mm.data_type = "FLOAT"
        mm.inputs[2].default_value = metal; mm.inputs[3].default_value = 1.0
        nt.links.new(k.outputs[0], mm.inputs[0]); nt.links.new(mm.outputs[0], P.inputs["Metallic"])
        rr = nt.nodes.new("ShaderNodeMapRange")
        rr.inputs[3].default_value = rough - 0.1
        rr.inputs[4].default_value = rough + 0.12
        nt.links.new(noise.outputs["Fac"], rr.inputs[0])
        nt.links.new(rr.outputs[0], P.inputs["Roughness"])
    return m

M = {
    "P1": mat("Armour light", (0.50, 0.52, 0.50), 0.1, 0.42, wear=True, coat=0.2),
    "P2": mat("Armour slate", (0.075, 0.095, 0.11), 0.25, 0.45, wear=True, coat=0.1),
    "TEAM": mat("Team cyan", (0.01, 0.36, 0.48), 0.15, 0.38, wear=True, coat=0.25),
    "DKH": mat("Frame gunmetal", (0.06, 0.065, 0.07), 0.85, 0.36),
    "STEEL": mat("Steel", (0.34, 0.35, 0.36), 1.0, 0.26),
    "GUN": mat("Gun black", (0.03, 0.031, 0.033), 0.7, 0.4),
    "DARK": mat("Dark rubber", (0.018, 0.018, 0.02), 0.2, 0.6),
    "GLASS": mat("Canopy", (0.004, 0.015, 0.02), 0.0, 0.04, emit=(0.1, 0.7, 0.95), emit_str=0.35),
    "HAZARD": mat("Hazard", (0.7, 0.36, 0.03), 0.1, 0.5, wear=True),
    "ARC": mat("Arc glow", (0.2, 0.9, 1.0), 0, 0.3, emit=(0.25, 0.9, 1.0), emit_str=18),
    "AMBER": mat("Amber glow", (1.0, 0.55, 0.15), 0, 0.3, emit=(1.0, 0.45, 0.1), emit_str=12),
}

# ---------- builders (game coordinates: x forward, y up, z right -> Blender (x, -z, y)) ----------
parts = {k: [] for k in M}
XF = [Matrix.Identity(4)]

def G(p):
    v = XF[-1] @ Vector((p[0], p[1], p[2], 1.0))
    return (v[0], -v[2], v[1])

def add(m, verts, faces):
    parts[m].append(([G(v) for v in verts], faces))

def loft(m, st, cz=0.0):
    rings = []
    for x, r in st:
        rings.append([(x, y, cz + z) for y, z in r] + [(x, y, cz - z) for y, z in reversed(r)])
    n = len(rings[0]); verts = [p for r in rings for p in r]; faces = []
    for s in range(len(rings) - 1):
        for j in range(n):
            k = (j + 1) % n
            faces.append((s * n + j, s * n + k, (s + 1) * n + k, (s + 1) * n + j))
    faces.append(tuple(range(n)))
    faces.append(tuple(range((len(rings) - 1) * n, len(rings) * n))[::-1])
    add(m, verts, faces)

def hsec(yb, ym, yt, wb, wm, wt, c):
    return [(yb, wb), (ym, wm), (yt - c, wt), (yt, wt - c)]

def hull(m, prof, hwb, hwt, cz=0.0, cy=0.0):
    ys = [y for _, y in prof]; y0, y1 = min(ys), max(ys)
    hw = lambda y: hwb + (hwt - hwb) * ((y - y0) / ((y1 - y0) or 1))
    L = [(x, cy + y, cz - hw(y)) for x, y in prof]; R = [(x, cy + y, cz + hw(y)) for x, y in prof]
    n = len(prof)
    faces = [tuple(range(n)), tuple(range(n, 2 * n))[::-1]]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, n + i, n + j, j))
    add(m, L + R, faces)

def box(m, cx, cy, cz, hx, hy, hz):
    v = [(cx + sx * hx, cy + sy * hy, cz + sz * hz) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    add(m, v, f)

def cyl(m, cx, cy, cz, r0, r1, ln, axis="y", caps=True, n=32):
    def pt(r, a, h):
        u, w = math.cos(a) * r, math.sin(a) * r
        if axis == "y":
            return (cx + u, cy + h, cz + w)
        if axis == "x":
            return (cx + h, cy + u, cz + w)
        return (cx + u, cy + w, cz + h)
    verts = [pt(r0, 2 * math.pi * i / n, 0) for i in range(n)] + [pt(r1, 2 * math.pi * i / n, ln) for i in range(n)]
    faces = [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
    if caps:
        faces.append(tuple(range(n)))
        faces.append(tuple(range(n, 2 * n))[::-1])
    add(m, verts, faces)

def ball(m, cx, cy, cz, r):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=16, radius=r)
    verts = [(v.co.x + cx, v.co.y + cy, v.co.z + cz) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    add(m, verts, faces)

def mirrored(fn):
    for s in (1, -1):
        fn(s)

# ---------- the mech body (meshes.ts mech(), ported) ----------
HX, HY = 0.2, 6.3
loft("DKH", [(-1.05, hsec(5.95, 6.4, 6.95, 0.6, 0.85, 0.7, 0.15)), (-0.55, hsec(5.55, 6.3, 7.15, 0.85, 1.08, 0.9, 0.2)),
             (0.95, hsec(5.55, 6.3, 7.15, 0.85, 1.08, 0.9, 0.2)), (1.4, hsec(5.95, 6.4, 6.95, 0.6, 0.8, 0.65, 0.15))])
hull("P2", [(0.9, 5.7), (1.5, 6.05), (1.56, 6.9), (0.9, 7.1)], 0.5, 0.66)
hull("P2", [(-0.6, 5.7), (-1.15, 6.05), (-1.2, 6.9), (-0.6, 7.1)], 0.5, 0.66)
def hips(s):
    cyl("STEEL", HX, HY, 1.0 if s > 0 else -1.24, 0.76, 0.76, 0.24, "z")
    hull("P1", [(-0.95, 6.98), (1.15, 6.98), (1.5, 7.2), (1.15, 7.52), (-0.85, 7.52), (-1.2, 7.2)], 0.56, 0.46, s * 1.56)
    box("HAZARD", 0.1, 7.0, s * 2.09, 0.9, 0.035, 0.03)
mirrored(hips)
cyl("STEEL", 0.05, 7.05, 0, 1.12, 1.02, 0.5, "y", False)
# torso core
loft("DKH", [(-1.75, hsec(7.95, 8.6, 9.5, 0.9, 1.2, 1.0, 0.2)), (-1.2, hsec(7.45, 8.5, 9.85, 1.25, 1.62, 1.4, 0.3)),
             (0.9, hsec(7.4, 8.4, 9.85, 1.25, 1.66, 1.42, 0.3)), (1.55, hsec(7.7, 8.4, 9.5, 0.95, 1.3, 1.1, 0.25))])
# cockpit glass nose, brow, jaw
loft("GLASS", [(1.2, [(8.35, 0.9), (8.85, 0.95), (9.32, 0.8)]), (1.9, [(8.4, 0.64), (8.85, 0.68), (9.25, 0.52)]),
               (2.28, [(8.55, 0.3), (8.85, 0.34), (9.1, 0.24)])])
hull("P1", [(0.2, 9.3), (1.75, 9.22), (2.08, 9.36), (1.85, 9.62), (0.2, 10.0)], 1.02, 0.85)
hull("P2", [(0.5, 7.5), (1.6, 7.78), (2.12, 8.25), (2.06, 8.42), (0.5, 8.42)], 0.82, 0.96)
def cheeks(s):
    hull("P1", [(0.8, 7.9), (1.55, 8.0), (1.82, 8.5), (1.7, 9.22), (0.8, 9.45)], 0.14, 0.14, s * 1.16)
    hull("TEAM", [(-1.3, 7.55), (0.7, 7.55), (1.05, 8.0), (0.95, 9.35), (-1.25, 9.55), (-1.55, 8.3)], 0.14, 0.14, s * 1.79)
    # canopy frame rods
    for a, b in (((1.2, 9.32, s * 0.8), (1.9, 9.25, s * 0.52)), ((1.9, 9.25, s * 0.52), (2.28, 9.1, s * 0.24))):
        rod("GUN", a, b, 0.035)
    # smoke dischargers on the collar's front corners
    for i in range(3):
        cyl("DARK", 0.55, 10.09, s * (0.82 + i * 0.22), 0.085, 0.085, 0.45, "x", True, 16)
def rod(m, a, b, r, n=12):
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    z = d.normalized(); x = z.orthogonal().normalized(); y = z.cross(x)
    ring = lambda c: [c + (x * math.cos(2 * math.pi * i / n) + y * math.sin(2 * math.pi * i / n)) * r for i in range(n)]
    v = ring(a) + ring(b)
    f = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    add(m, [tuple(p) for p in v], f)
mirrored(cheeks)
# amber strip under the canopy, a lamp
box("AMBER", 2.1, 8.36, 0, 0.02, 0.035, 0.7)
# shoulder collar
loft("P2", [(-1.45, hsec(9.5, 9.7, 9.9, 1.3, 1.4, 1.2, 0.1)), (-1.0, hsec(9.5, 9.75, 10.0, 1.5, 1.62, 1.35, 0.12)),
            (0.9, hsec(9.5, 9.75, 10.0, 1.5, 1.62, 1.35, 0.12)), (1.3, hsec(9.5, 9.62, 9.8, 1.2, 1.3, 1.1, 0.08))])
# missile pods
for s in (1, -1):
    pz = s * 2.3
    box("STEEL", -0.1, 9.9, s * 1.62, 0.6, 0.2, 0.14)
    loft("P1", [(-1.15, hsec(9.86, 10.3, 10.8, 0.5, 0.6, 0.5, 0.12)), (-0.85, hsec(9.72, 10.3, 10.92, 0.6, 0.7, 0.6, 0.14)),
                (0.95, hsec(9.72, 10.3, 10.92, 0.6, 0.7, 0.6, 0.14))], pz)
    loft("HAZARD", [(-0.8, hsec(9.705, 10.3, 10.935, 0.615, 0.715, 0.615, 0.14)), (-0.66, hsec(9.705, 10.3, 10.935, 0.615, 0.715, 0.615, 0.14))], pz)
    box("DARK", 0.97, 10.3, pz, 0.03, 0.52, 0.56)
    for ty in (10.05, 10.55):
        for tz in (-0.35, 0, 0.35):
            cyl("GUN", 0.93, ty, pz + tz, 0.16, 0.15, 0.12, "x", False, 20)
            cyl("AMBER", 0.98, ty, pz + tz, 0.1, 0.03, 0.06, "x", True, 12)
# arms: shoulder joint, pauldron, upper arm, elbow
for s in (1, -1):
    az = s * 2.6
    cyl("STEEL", -0.05, 9.15, 1.6 if s > 0 else -2.3, 0.5, 0.5, 0.7, "z")
    loft("TEAM", [(-0.78, [(8.75, 0.38), (8.95, 0.5), (9.3, 0.5), (9.58, 0.34)]), (0.0, [(8.6, 0.46), (8.85, 0.6), (9.35, 0.6), (9.68, 0.4)]),
                  (0.78, [(8.75, 0.38), (8.95, 0.5), (9.3, 0.5), (9.58, 0.34)])], az)
    box("DKH", -0.05, 8.25, az, 0.34, 0.5, 0.3)
    cyl("STEEL", -0.05, 7.72, 2.12 if s > 0 else -3.08, 0.4, 0.4, 0.96, "z")
# right forearm: twin autocannon
loft("DKH", [(-1.0, hsec(7.12, 7.45, 7.78, 0.3, 0.36, 0.3, 0.08)), (-0.7, hsec(6.98, 7.45, 7.95, 0.42, 0.5, 0.42, 0.12)),
             (1.3, hsec(6.98, 7.45, 7.95, 0.42, 0.5, 0.42, 0.12)), (1.75, hsec(7.14, 7.42, 7.7, 0.36, 0.42, 0.36, 0.08))], 2.6)
hull("P1", [(-0.6, 7.93), (1.2, 7.93), (1.42, 8.0), (1.2, 8.13), (-0.6, 8.13)], 0.42, 0.36, 2.6)
cyl("DARK", -1.6, 7.42, 2.6, 0.4, 0.44, 0.62, "x")
cyl("HAZARD", -1.35, 7.42, 2.6, 0.445, 0.45, 0.12, "x", False)
for tz in (2.45, 2.75):
    cyl("GUN", 1.7, 7.4, tz, 0.15, 0.14, 0.7, "x", False, 20)
    cyl("STEEL", 2.4, 7.4, tz, 0.09, 0.085, 0.95, "x", False, 20)
    cyl("DARK", 3.3, 7.4, tz, 0.14, 0.14, 0.3, "x", True, 20)
box("STEEL", 2.72, 7.4, 2.6, 0.06, 0.13, 0.3)
box("DARK", 0.2, 8.22, 2.82, 0.3, 0.09, 0.09)
# left forearm: the arc lance
loft("DKH", [(-1.1, hsec(7.15, 7.45, 7.75, 0.26, 0.32, 0.26, 0.07)), (-0.7, hsec(7.0, 7.45, 7.92, 0.38, 0.46, 0.38, 0.1)),
             (1.0, hsec(7.0, 7.45, 7.92, 0.38, 0.46, 0.38, 0.1)), (1.3, hsec(7.15, 7.45, 7.75, 0.26, 0.32, 0.26, 0.07))], -2.6)
hull("P1", [(-0.6, 7.9), (0.9, 7.9), (1.08, 7.97), (0.9, 8.1), (-0.6, 8.1)], 0.38, 0.32, -2.6)
cyl("STEEL", 1.3, 7.45, -2.6, 0.11, 0.09, 1.3, "x", False, 16)
for tx in (1.5, 1.85, 2.2):
    cyl("ARC", tx, 7.45, -2.6, 0.25, 0.25, 0.12, "x")
ball("ARC", 2.75, 7.45, -2.6, 0.13)
for u in (1, -1):
    Y = lambda y: 7.45 + u * (y - 7.45)
    loft("DARK", [(1.2, [(Y(7.7) if u > 0 else Y(7.93), 0.09), (Y(7.93) if u > 0 else Y(7.7), 0.09)]),
                  (3.1, [(Y(7.6) if u > 0 else Y(7.69), 0.04), (Y(7.69) if u > 0 else Y(7.6), 0.04)])], -2.6)
# back: power pack, exhaust stacks, jump-jet bells
loft("DKH", [(-2.5, hsec(7.95, 8.6, 9.4, 0.7, 0.9, 0.75, 0.15)), (-2.15, hsec(7.65, 8.6, 9.7, 0.95, 1.2, 1.0, 0.2)),
             (-1.6, hsec(7.65, 8.6, 9.7, 0.95, 1.2, 1.0, 0.2))])
for s in (1, -1):
    cyl("STEEL", -2.0, 9.6, s * 0.72, 0.2, 0.17, 0.75, "y", False, 20)
    cyl("DARK", -2.0, 10.25, s * 0.72, 0.23, 0.23, 0.22, "y", True, 20)
    cyl("STEEL", -2.05, 7.0, s * 0.68, 0.36, 0.24, 0.7, "y", False, 24)
    cyl("AMBER", -2.05, 6.99, s * 0.68, 0.3, 0.3, 0.02, "y", True, 24)
rod("GUN", (-1.2, 9.9, -1.0), (-1.2, 11.6, -1.0), 0.02, 6)

# ---------- legs (meshes.ts mechLeg at MECH_WALKER.legScale; w1-walker legPose, knee forward) ----------
SC = 0.8
L1, L2 = 5.0, 4.2
def leg_pose(d, dy):
    l1, l2 = L1 * SC, L2 * SC
    D0 = math.hypot(d, dy); D = min(l1 + l2 - 0.01, max(abs(l1 - l2) + 0.01, D0))
    base = math.atan2(dy, d); ca = (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D)
    hip = base + math.acos(max(-1, min(1, ca)))
    kx, ky = l1 * math.cos(hip), l1 * math.sin(hip)
    sa = math.atan2(dy - ky, d - kx)
    return hip, kx, ky, sa

def frame(origin, ang):
    # a bone frame in the leg plane (x, y): +x along the bone, +y its front (the knee side), z the game's z
    c, s = math.cos(ang), math.sin(ang)
    R = Matrix(((c, -s, 0, 0), (s, c, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)))
    return Matrix.Translation(Vector(origin)) @ R @ Matrix.Scale(SC, 4)

def leg(zh, foot_dx, foot_lift):
    hipP = (HX, HY, zh)
    ankle_h = 0.0  # the shin ends at the sole (as in game)
    d, dy = foot_dx, -(HY - ankle_h - foot_lift)
    hip, kx, ky, sa = leg_pose(d, dy)
    # thigh: frame rotated so its +x runs hip -> knee and +y points forward-ish (game x forward)
    XF.append(frame(hipP, hip))
    cyl("STEEL", 0, 0, -0.7, 0.68, 0.68, 1.4, "z")
    cyl("DARK", 0, 0, -0.78, 0.4, 0.4, 1.56, "z")
    loft("P1", [(-0.35, hsec(-0.5, 0.0, 0.55, 0.36, 0.5, 0.4, 0.14)), (0.7, hsec(-0.72, 0.05, 0.8, 0.48, 0.64, 0.5, 0.2)),
                (2.6, hsec(-0.62, 0.05, 0.72, 0.44, 0.58, 0.46, 0.18)), (L1 - 0.75, hsec(-0.46, 0.0, 0.52, 0.36, 0.46, 0.38, 0.14)),
                (L1 - 0.2, hsec(-0.36, 0.0, 0.4, 0.3, 0.4, 0.3, 0.1))])
    hull("TEAM", [(0.3, 0.78), (L1 - 1.3, 0.6), (L1 - 0.95, 0.84), (0.75, 1.1)], 0.5, 0.4)
    rod("STEEL", (0.5, -0.86, 0), (L1 - 1.9, -0.66, 0), 0.15, 16)
    cyl("STEEL", L1, 0, -0.6, 0.6, 0.6, 1.2, "z")
    cyl("DARK", L1, 0, -0.78, 0.3, 0.3, 1.56, "z")
    XF.pop()
    knee = (HX + kx, HY + ky, zh)
    XF.append(frame(knee, sa))
    for s2 in (1, -1):
        cyl("DARK", 0, 0, 0.6 if s2 > 0 else -0.74, 0.5, 0.5, 0.14, "z")
    loft("P2", [(-0.1, hsec(-0.45, 0.0, 0.5, 0.36, 0.46, 0.38, 0.14)), (0.9, hsec(-0.76, 0.0, 0.62, 0.46, 0.58, 0.46, 0.18)),
                (2.2, hsec(-0.6, 0.0, 0.52, 0.4, 0.5, 0.4, 0.15)), (L2 - 1.0, hsec(-0.36, 0.0, 0.38, 0.3, 0.38, 0.3, 0.1))])
    hull("P1", [(-0.55, 0.42), (1.2, 0.6), (1.55, 0.86), (0.3, 1.08), (-0.45, 0.96)], 0.54, 0.4)
    hull("P1", [(1.55, 0.5), (L2 - 1.1, 0.36), (L2 - 1.3, 0.6), (1.75, 0.82)], 0.44, 0.34)
    rod("STEEL", (0.3, -0.7, 0), (L2 - 1.2, -0.45, 0), 0.11, 16)
    cyl("STEEL", L2 - 1.1, 0, 0, 0.3, 0.26, 0.4, "x", False)
    ball("STEEL", L2 - 0.7, 0, 0, 0.42)
    XF.pop()
    # foot: flat on the ground under the ankle, pointing forward (game +x)
    fx = HX + kx + L2 * SC * math.cos(sa) - 0.7 * SC * math.cos(sa) * 0
    footO = (HX + d + 0.05, foot_lift, zh)
    XF.append(Matrix.Translation(Vector(footO)) @ Matrix.Scale(SC, 4))
    loft("DARK", [(-1.15, [(0.0, 0.4), (0.2, 0.46), (0.32, 0.36)]), (-0.75, [(0.0, 0.66), (0.24, 0.72), (0.42, 0.6)]),
                  (0.95, [(0.0, 0.8), (0.24, 0.86), (0.42, 0.72)]), (1.3, [(0.0, 0.74), (0.2, 0.78), (0.3, 0.66)])])
    hull("P1", [(-0.85, 0.42), (1.2, 0.42), (1.12, 0.62), (0.25, 0.76), (-0.62, 0.72)], 0.62, 0.48)
    for s2 in (1, -1):
        cyl("STEEL", 0.38, 0.62, 0.44 if s2 > 0 else -0.6, 0.46, 0.46, 0.16, "z")
        a = s2 * 0.14
        cx, cz = 1.62, s2 * 0.44
        box("P2", cx + 0.2, 0.22, cz, 0.45, 0.2, 0.26)
        box("GUN", cx + 0.75, 0.13, cz + s2 * 0.05, 0.22, 0.12, 0.17)
    box("P2", -1.45, 0.2, 0, 0.3, 0.18, 0.28)
    XF.pop()

leg(1.75, 1.1, 0.0)     # right leg forward
leg(-1.75, -0.9, 0.0)   # left leg back

# ---------- meshes: one object per material, bevelled and smooth shaded ----------
coll = scn.collection
mech_objs = []
for key, lst in parts.items():
    if not lst:
        continue
    me = bpy.data.meshes.new("mech_" + key)
    verts, faces = [], []
    for vs, fs in lst:
        o = len(verts)
        verts += vs
        faces += [tuple(i + o for i in f) for f in fs]
    me.from_pydata(verts, [], faces)
    me.validate()
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(M[key])
    ob = bpy.data.objects.new("Mech " + key, me)
    coll.objects.link(ob)
    bev = ob.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.045 if key in ("P1", "P2", "TEAM", "DKH", "HAZARD") else 0.018
    bev.segments = 4
    bev.limit_method = "ANGLE"
    bev.angle_limit = math.radians(32)
    bev.harden_normals = True
    bev.miter_outer = "MITER_ARC"
    wn = ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
    wn.keep_sharp = True
    mech_objs.append(ob)

# ---------- stage: ground, world, lights, camera ----------
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
ground = bpy.context.active_object
ground.name = "Ground"
gm = mat("Ground concrete", (0.11, 0.115, 0.11), 0.0, 0.85)
gnt = gm.node_tree
gn = gnt.nodes.new("ShaderNodeTexNoise"); gn.inputs["Scale"].default_value = 0.6; gn.inputs["Detail"].default_value = 12
gr = gnt.nodes.new("ShaderNodeValToRGB")
gr.color_ramp.elements[0].color = (0.06, 0.062, 0.06, 1); gr.color_ramp.elements[1].color = (0.16, 0.165, 0.155, 1)
gnt.links.new(gn.outputs["Fac"], gr.inputs["Fac"])
gnt.links.new(gr.outputs["Color"], gnt.nodes["Principled BSDF"].inputs["Base Color"])
ground.data.materials.append(gm)

world = bpy.data.worlds.get("Mech world") or bpy.data.worlds.new("Mech world")
scn.world = world
world.use_nodes = True
wn_ = world.node_tree
bg = wn_.nodes.get("Background") or wn_.nodes.new("ShaderNodeBackground")
grad = wn_.nodes.new("ShaderNodeTexGradient")
mp = wn_.nodes.new("ShaderNodeMapping"); tc = wn_.nodes.new("ShaderNodeTexCoord")
mp.inputs["Rotation"].default_value = (0, math.radians(-90), 0)
wr = wn_.nodes.new("ShaderNodeValToRGB")
wr.color_ramp.elements[0].color = (0.30, 0.33, 0.36, 1)
wr.color_ramp.elements[1].color = (0.035, 0.05, 0.07, 1)
wn_.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
wn_.links.new(mp.outputs["Vector"], grad.inputs["Vector"])
wn_.links.new(grad.outputs["Fac"], wr.inputs["Fac"])
wn_.links.new(wr.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.9
wout = wn_.nodes.get("World Output") or wn_.nodes.new("ShaderNodeOutputWorld")
wn_.links.new(bg.outputs[0], wout.inputs[0])

def light(name, kind, loc, rot, energy, color, size=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    if size is not None:
        if kind == "AREA":
            ld.size = size
        else:
            ld.angle = size
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    lo.rotation_euler = rot
    coll.objects.link(lo)
    return lo

light("Key sun", "SUN", (10, -10, 20), (math.radians(50), 0, math.radians(35)), 3.2, (1.0, 0.93, 0.84), math.radians(2.5))
light("Rim", "AREA", (-12, 9, 12), (math.radians(-60), math.radians(-35), math.radians(-140)), 9000, (0.45, 0.78, 1.0), 6)
light("Fill", "AREA", (14, 10, 4), (math.radians(80), 0, math.radians(125)), 1500, (0.9, 0.95, 1.0), 10)

cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 42
cam = bpy.data.objects.new("Camera", cam_d)
coll.objects.link(cam)
cam.location = (13.5, -12.5, 3.2)
target = Vector((0.4, 0.0, 6.0))
d = target - cam.location
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
scn.camera = cam
cam_d.dof.use_dof = False

r = scn.render
r.engine = "CYCLES"
scn.cycles.device = "GPU"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX"
    prefs.get_devices()
    for dv in prefs.devices:
        dv.use = dv.type != "CPU"
except Exception:
    pass
scn.cycles.samples = 256
scn.cycles.use_denoising = True
r.resolution_x, r.resolution_y = 1600, 1000
r.resolution_percentage = 100
scn.view_settings.view_transform = "AgX"
scn.view_settings.look = "AgX - Medium High Contrast"

result = {"objects": [o.name for o in mech_objs], "faces": sum(len(o.data.polygons) for o in mech_objs)}
