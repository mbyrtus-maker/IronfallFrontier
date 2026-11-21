"use strict";
// B2 (designer 15 Nov 18:46): production from first person, anywhere (on foot or in a vehicle), without the command
// view. Pure: the page passes its production buildings and its own option rules (optionState: tier, queue, cost), and
// draws the rows this returns; the logic test calls it directly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROD_RALLY_MS = exports.PROD_RALLY_MOVE_M = exports.PROD_ANY_KEY_LABEL = exports.PROD_ANY_KEY = void 0;
exports.prodAnyRows = prodAnyRows;
exports.rallyNeedsUpdate = rallyNeedsUpdate;
/** The key that opens the production menu in first person. */
exports.PROD_ANY_KEY = "KeyJ", exports.PROD_ANY_KEY_LABEL = "J";
/** "Rally to me": the rally point follows the pilot when he has moved this far (m), checked every PROD_RALLY_MS. */
exports.PROD_RALLY_MOVE_M = 15, exports.PROD_RALLY_MS = 2000;
/**
 * The rows of the menu: every unit type an own production building can make (only the picked building's when `pick`
 * is a building id), each sent to the picked building or, with pick 0, the NEAREST building that can make it and would
 * accept it now (else the nearest that can make it, greyed with its reason). Ordered by tier, then by type index.
 */
function prodAnyRows(buildings, optionsOf, tierOf, names, state, pick = 0) {
    const pool = (pick ? buildings.filter((b) => b.id === pick) : buildings).slice().sort((a, b) => a.dist - b.dist || a.id - b.id);
    const types = new Set();
    for (const b of pool)
        for (const t of optionsOf(b.type))
            types.add(t);
    const rows = [];
    for (const t of [...types].sort((a, b) => tierOf(a) - tierOf(b) || a - b)) {
        const can = pool.filter((b) => optionsOf(b.type).includes(t));
        let row = null;
        for (const b of can) {
            if (b.building)
                continue;
            const st = state(b.id, t);
            if (st.ok) {
                row = { t, name: names[t], at: b.id, atName: b.name, atDist: b.dist, ok: true, reason: "", warn: st.warn };
                break;
            }
            if (!row)
                row = { t, name: names[t], at: b.id, atName: b.name, atDist: b.dist, ok: false, reason: st.reason, warn: "" };
        }
        if (!row) {
            const b = can[0];
            row = { t, name: names[t], at: 0, atName: b ? b.name : "", atDist: b ? b.dist : 0, ok: false, reason: "its building is still under construction", warn: "" };
        }
        rows.push(row);
    }
    return rows;
}
/** Whether the "rally to me" point should be re-sent: never sent, or the pilot has moved PROD_RALLY_MOVE_M from it. */
function rallyNeedsUpdate(last, x, z) {
    return !last || Math.hypot(last[0] - x, last[1] - z) >= exports.PROD_RALLY_MOVE_M;
}
