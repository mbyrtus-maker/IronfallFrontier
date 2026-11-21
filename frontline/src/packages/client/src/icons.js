"use strict";
// Command-view icons per unit TYPE family (client slice 2, playtest item 7): team-coloured outline symbols of a
// fixed size in screen pixels, drawn as line segments (one source of truth for the WebGL icon pass, the HUD
// legend and the minimap). No shape contains a circle. Shape space: half size 1, +x = the unit's facing for
// vehicles (rotated to the on-screen heading), +y = up on screen for structures (not rotated).
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICON_INDEX = exports.ICON_SHAPES = void 0;
exports.iconFamily = iconFamily;
exports.drawIcon2D = drawIcon2D;
function poly(pts, closed = true) {
    const s = [];
    for (let i = 0; i + 1 < pts.length; i++)
        s.push(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (closed && pts.length > 2)
        s.push(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]);
    return s;
}
const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const line = (ax, ay, bx, by) => [ax, ay, bx, by];
exports.ICON_SHAPES = [
    // vehicles: nose at +x
    { family: "bike", label: "Bike", px: 6.5, facing: true, segs: poly([[1, 0], [-0.85, 0.5], [-0.45, 0], [-0.85, -0.5]]) },
    { family: "scout", label: "Scout", px: 6.5, facing: true, segs: [...poly([[1.05, 0], [-0.8, 0.6], [-0.5, 0], [-0.8, -0.6]]), ...line(-0.15, 0.3, -0.15, -0.3)] }, // ruling 108: the Dart Scout
    { family: "rocketTank", label: "Rocket tank", px: 8, facing: true, segs: [...rect(-0.85, -0.55, 0.4, 0.55), ...line(0.4, 0.35, 1.05, 0.35), ...line(0.4, -0.35, 1.05, -0.35), ...line(1.05, 0.5, 1.05, 0.2), ...line(1.05, -0.5, 1.05, -0.2)] }, // ruling 108: the Salvo
    { family: "lightTank", label: "Light tank", px: 7, facing: true, segs: [...rect(-0.8, -0.5, 0.45, 0.5), ...line(0.45, 0, 1.1, 0)] },
    { family: "heavyTank", label: "Heavy tank", px: 9, facing: true, segs: [...rect(-0.85, -0.7, 0.5, 0.7), ...rect(-0.55, -0.38, 0.22, 0.38), ...line(0.5, 0, 1.2, 0)] },
    { family: "artillery", label: "Artillery", px: 8, facing: true, segs: [...rect(-0.85, -0.55, 0.35, 0.55), ...line(0.35, 0, 1.0, 0), ...line(1.0, -0.4, 1.0, 0.4), ...line(-0.5, -0.25, 0.0, 0.25), ...line(-0.5, 0.25, 0.0, -0.25)] },
    { family: "antiAir", label: "Anti-air", px: 8, facing: true, segs: [...rect(-0.85, -0.6, 0.4, 0.6), ...poly([[-0.55, 0.4], [0.15, 0], [-0.55, -0.4]], false), ...line(0.4, 0.3, 1.05, 0.3), ...line(0.4, -0.3, 1.05, -0.3)] },
    { family: "siege", label: "Siege walker", px: 11, facing: true, segs: [...poly([[0.65, 0], [0.35, 0.62], [-0.55, 0.62], [-0.85, 0], [-0.55, -0.62], [0.35, -0.62]]), ...line(0.65, 0, 1.25, 0), ...line(-0.3, -0.3, -0.3, 0.3),
            ...line(0.35, 0.62, 0.75, 1.05), ...line(0.35, -0.62, 0.75, -1.05), ...line(-0.55, 0.62, -0.95, 1.05), ...line(-0.55, -0.62, -0.95, -1.05)] }, // W1: the Strider's four legs
    { family: "transport", label: "Transport", px: 8, facing: true, segs: [...rect(-0.9, -0.55, 0.75, 0.55), ...line(0.25, -0.55, 0.25, 0.55), ...line(-0.9, 0, 0.25, 0)] },
    { family: "economy", label: "Economy vehicle", px: 8, facing: true, segs: [...poly([[0.5, 0.35], [0.5, -0.35], [-0.85, -0.6], [-0.85, 0.6]]), ...line(0.5, 0.35, 1.0, 0.55), ...line(0.5, -0.35, 1.0, -0.55), ...line(1.0, 0.55, 1.0, 0.2), ...line(1.0, -0.55, 1.0, -0.2)] },
    { family: "gunship", label: "Gunship", px: 9, facing: true, segs: [...poly([[1, 0], [-0.8, 0.78], [-0.45, 0], [-0.8, -0.78]]), ...line(1, 0, 1.35, 0)] },
    { family: "dropship", label: "Dropship", px: 10, facing: true, segs: [...rect(-0.75, -0.3, 0.75, 0.3), ...line(0.05, -1.0, 0.05, 1.0), ...line(-0.15, -1.0, 0.25, -1.0), ...line(-0.15, 1.0, 0.25, 1.0), ...line(-0.75, 0, -1.05, 0)] },
    // one small cross per soldier: a squad reads as a cluster of crosses
    { family: "infantry", label: "Infantry (per soldier)", px: 3.2, facing: false, segs: [...line(-1, -1, 1, 1), ...line(-1, 1, 1, -1)] },
    { family: "pilot", label: "Pilot", px: 4.5, facing: false, segs: [...poly([[0, 1], [0.75, 0], [0, -1], [-0.75, 0]]), ...line(0, -0.45, 0, 0.45)] },
    // the player's own body (pilot on foot or the vehicle the player is in): a double diamond with a facing tick
    { family: "you", label: "You (pilot or vehicle)", px: 10.5, facing: true, segs: [...poly([[1, 0], [0, 0.85], [-1, 0], [0, -0.85]]), ...poly([[0.45, 0], [0, 0.38], [-0.45, 0], [0, -0.38]]), ...line(1, 0, 1.45, 0)] },
    // structures: upright
    { family: "core", label: "Command core", px: 11, facing: false, segs: [...rect(-1, -1, 1, 1), ...rect(-0.55, -0.55, 0.55, 0.55), ...line(-1, 1, -0.55, 0.55), ...line(1, 1, 0.55, 0.55), ...line(-1, -1, -0.55, -0.55), ...line(1, -1, 0.55, -0.55)] },
    { family: "production", label: "Production", px: 9, facing: false, segs: [...poly([[-0.85, -0.8], [0.85, -0.8], [0.85, 0.35], [0, 0.95], [-0.85, 0.35]]), ...poly([[-0.32, -0.8], [-0.32, -0.15], [0.32, -0.15], [0.32, -0.8]], false)] },
    { family: "turret", label: "Turret", px: 9, facing: false, segs: [...rect(-0.55, -0.55, 0.55, 0.55), ...line(-1.05, 0, -0.55, 0), ...line(0.55, 0, 1.05, 0), ...line(0, -1.05, 0, -0.55), ...line(0, 0.55, 0, 1.05)] },
    { family: "sensor", label: "Relay / sensor", px: 9, facing: false, segs: [...poly([[0, 0.55], [0.75, -0.9], [-0.75, -0.9]]), ...line(0, 0.55, 0, 0.95), ...poly([[-0.6, 0.75], [0, 1.15], [0.6, 0.75]], false)] },
    { family: "structure", label: "Other structure", px: 8, facing: false, segs: rect(-0.8, -0.8, 0.8, 0.8) },
    // C4: the Constructor and the structures S8 makes buildable
    { family: "builder", label: "Constructor", px: 8, facing: true, segs: [...rect(-0.85, -0.55, 0.45, 0.55), ...line(-0.2, 0.55, 0.6, 1.0), ...line(0.6, 1.0, 1.05, 0.35), ...line(1.05, 0.35, 0.85, 0.1)] },
    { family: "missile", label: "Missile battery", px: 9, facing: false, segs: [...rect(-0.7, -0.7, 0.7, 0.1), ...line(-0.45, 0.1, -0.1, 0.95), ...line(0.1, 0.1, 0.45, 0.95), ...line(-0.25, 0.95, 0.05, 0.95), ...line(0.3, 0.95, 0.6, 0.95)] },
    { family: "storage", label: "Silo / gas tank", px: 8, facing: false, segs: [...rect(-0.6, -0.9, 0.6, 0.6), ...poly([[-0.6, 0.6], [0, 1.0], [0.6, 0.6]], false), ...line(-0.6, -0.4, 0.6, -0.4), ...line(-0.6, 0.1, 0.6, 0.1)] },
    { family: "extractor", label: "Gas extractor", px: 8, facing: false, segs: [...rect(-0.85, -0.9, 0.85, -0.55), ...poly([[-0.6, -0.55], [0, 1.0], [0.6, -0.55]], false), ...line(-0.35, 0.1, 0.35, 0.1)] },
    { family: "power", label: "Reactor", px: 8, facing: false, segs: [...rect(-0.85, -0.85, 0.85, 0.85), ...poly([[0.2, 0.7], [-0.3, 0.0], [0.25, 0.0], [-0.2, -0.7]], false)] },
    // C6 item 7: structures that had the generic square
    { family: "refinery", label: "Refinery", px: 8, facing: false, segs: [...rect(-0.85, -0.85, 0.85, 0.2), ...poly([[-0.85, 0.2], [-0.3, 0.9], [0.3, 0.9], [0.85, 0.2]], false), ...line(-0.4, -0.35, 0.4, -0.35)] },
    { family: "lab", label: "Armoury / Tech Lab", px: 8, facing: false, segs: [...poly([[-0.9, -0.9], [0.9, -0.9], [0.9, 0.5], [-0.9, 0.5]]), ...line(-0.5, 0.5, -0.5, 0.95), ...line(0.5, 0.5, 0.5, 0.95), ...line(-0.5, -0.2, 0.5, -0.2)] },
    { family: "repair", label: "Repair Bay", px: 8, facing: false, segs: [...rect(-0.9, -0.9, 0.9, 0.9), ...line(-0.55, 0, 0.55, 0), ...line(0, -0.55, 0, 0.55)] },
    { family: "shield", label: "Shield Projector", px: 9, facing: false, segs: [...line(-0.9, -0.8, 0.9, -0.8), ...poly([[-0.9, -0.8], [-0.65, 0.2], [0, 0.85], [0.65, 0.2], [0.9, -0.8]], false), ...rect(-0.25, -0.8, 0.25, -0.3)] },
    { family: "depot", label: "Field Depot (forward base)", px: 9, facing: false, segs: [...rect(-0.85, -0.9, 0.85, -0.1), ...line(-0.6, -0.1, -0.6, 1.0), ...poly([[-0.6, 1.0], [0.4, 0.75], [-0.6, 0.5]], false)] },
    { family: "launch", label: "Launch pad / Mass Driver", px: 9, facing: false, segs: [...poly([[0, 1.0], [0.7, -0.2], [0.25, -0.2], [0.25, -0.9], [-0.25, -0.9], [-0.25, -0.2], [-0.7, -0.2]])] },
    // C9: fix-qa2 point structures
    { family: "node", label: "Control node (destroy to capture)", px: 9, facing: false, segs: [...poly([[0, 1], [0.87, 0.5], [0.87, -0.5], [0, -1], [-0.87, -0.5], [-0.87, 0.5]]), ...rect(-0.3, -0.3, 0.3, 0.3), ...line(0.3, 0, 1.1, 0)] },
    { family: "bunker", label: "Bunker (garrison)", px: 9, facing: false, segs: [...poly([[-0.95, -0.7], [0.95, -0.7], [0.6, 0.6], [-0.6, 0.6]]), ...line(-0.45, 0.05, 0.45, 0.05)] },
    { family: "wall", label: "Barricade wall", px: 7, facing: false, segs: [...rect(-1, -0.3, 1, 0.3), ...line(-0.33, -0.3, -0.33, 0.3), ...line(0.33, -0.3, 0.33, 0.3)] },
];
exports.ICON_INDEX = new Map(exports.ICON_SHAPES.map((s, i) => [s.family, i]));
const BY_TYPE = new Map([["dart", "scout"], ["salvo", "rocketTank"], ["lancer", "lightTank"], ["bastion", "heavyTank"], ["hammer", "artillery"], ["flak", "antiAir"], ["strider", "siege"], ["carrier", "transport"], ["harvester", "economy"], ["hauler", "economy"], ["constructor", "builder"], ["forward-base-vehicle", "economy"], ["wasp", "gunship"], ["mule", "dropship"], ["trooper-squad", "infantry"], ["sapper-team", "infantry"], ["pilot", "pilot"], ["command-core", "core"], ["barracks", "production"], ["foundry", "production"], ["air-pad", "production"], ["gun-tower", "turret"], ["missile-battery", "missile"], ["silo", "storage"], ["gas-tank", "storage"], ["gas-extractor", "extractor"], ["reactor", "power"], ["sentry-turret", "turret"], ["relay-tower", "sensor"],
    ["refinery", "refinery"], ["armoury", "lab"], ["tech-lab", "lab"], ["repair-bay", "repair"], ["shield-projector", "shield"], ["field-depot", "depot"], ["launch-pad-uplink", "launch"], ["mass-driver", "launch"],
    ["control-node", "node"], ["bunker", "bunker"], ["barricade", "wall"], ["drop-pod-sentry", "turret"], ["fb-turret", "turret"], ["fb-barricade", "wall"]]); // ruling 130: the drop pod sentry is a turret; ruling 132: a forward base's own turrets and barricades
/** Icon family of a data type: by id, then by armour class / structure flag for types added later. */
function iconFamily(typeId, armourClass, structure, air) {
    const f = BY_TYPE.get(typeId);
    if (f)
        return f;
    if (structure)
        return "structure";
    if (air)
        return "gunship";
    switch (armourClass) {
        case "bike": return "bike";
        case "heavy": return "heavyTank";
        case "infantry": return "infantry";
        default: return "lightTank";
    }
}
/** Draws a shape on a 2D canvas (legend, minimap): centre (x, y) in CSS px, heading in radians (screen, y down). */
function drawIcon2D(g, shape, x, y, heading, px = shape.px) {
    const c = Math.cos(shape.facing ? heading : 0), s = Math.sin(shape.facing ? heading : 0), k = shape.segs;
    g.beginPath();
    for (let i = 0; i < k.length; i += 4) {
        // shape space has y up; the canvas has y down
        const ax = k[i] * px, ay = -k[i + 1] * px, bx = k[i + 2] * px, by = -k[i + 3] * px;
        g.moveTo(x + ax * c - ay * s, y + ax * s + ay * c);
        g.lineTo(x + bx * c - by * s, y + bx * s + by * c);
    }
    g.stroke();
}
