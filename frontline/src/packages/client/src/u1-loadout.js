"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOADOUT_KEY_LABEL = exports.LOADOUT_KEY = void 0;
exports.callRequirement = callRequirement;
exports.loadoutModel = loadoutModel;
exports.loadoutHtml = loadoutHtml;
exports.LOADOUT_KEY = "KeyK", exports.LOADOUT_KEY_LABEL = "K";
const callsJson = (data) => (data.supportCalls?.calls ?? []);
const an = (n) => (/^[AEIOU]/i.test(n) ? `an ${n}` : `a ${n}`);
const bname = (data, id) => data.buildings.find((b) => b.id === id)?.name ?? id;
/** A call's requirement, met or not, in words (ruling 94: strike and sweep need nothing; barrage / EMP a Relay Tower; air an Air Pad). */
function callRequirement(data, callId, w) {
    const req = callsJson(data).find((c) => c.id === callId)?.requires ?? [];
    if (!req.length)
        return { met: true, text: "no requirement" };
    const miss = [];
    for (const r of req) {
        if (r === "atmosphere") {
            if (w.airless)
                miss.push("an atmosphere (this world has none)");
            continue;
        }
        if (w.supplied.has(r))
            continue;
        const n = bname(data, r);
        miss.push(w.built.has(r) ? `a supplied ${n} (yours is cut off)` : an(n));
    }
    const all = req.map((r) => (r === "atmosphere" ? "atmosphere" : an(bname(data, r)))).join(" + ");
    return miss.length ? { met: false, text: `needs ${miss.join(" and ")}` } : { met: true, text: `needs ${all}: met` };
}
function loadoutModel(i) {
    const fixedIds = i.fixed ?? [];
    const draft = (i.draft ?? i.now).filter((id) => !fixedIds.includes(id));
    const fixed = fixedIds.map((id) => ({ id, name: callsJson(i.data).find((c) => c.id === id)?.name ?? id, label: "ANTI-ARMOUR" }));
    const rows = callsJson(i.data).filter((c) => !fixedIds.includes(c.id)).map((c) => {
        const r = callRequirement(i.data, c.id, i.world);
        return { id: c.id, name: c.name, category: c.category, owned: i.owned.has(c.id) || i.now.includes(c.id), inNow: i.now.includes(c.id), inDraft: draft.includes(c.id), met: r.met, req: r.text };
    });
    const canChange = i.notHere === null;
    const where = canChange ? `You can change it here${i.atName ? ` (at the ${i.atName})` : ""}: APPLY takes effect at once.`
        : `Not here: ${i.notHere}. The loadout changes only on foot at a supplied Barracks or your Command Core, or while you are down. Pick now: it is applied by itself when you get there or respawn.`;
    return { slots: i.slots, maxSlots: i.maxSlots, slotRank: i.slotRank, now: i.now.slice(), draft, changed: draft.join() !== i.now.join(), pending: i.pending, canChange, where, rows, fixed };
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** The panel's HTML (clicks: data-act lo / loApply / loClose / loProfile on main.ts's panel click handler). */
function loadoutHtml(m, fp) {
    const nm = (id) => esc(m.rows.find((r) => r.id === id)?.name ?? id);
    let h = `<div class="ph">CALL LOADOUT · ${m.draft.length}/${m.slots} slots<span class="x" data-act="loClose">×</span></div>`;
    h += `<div class="where ${m.canChange ? "ok" : "away"}">${esc(m.where)}</div>`;
    h += `<div class="slots">`;
    for (let s = 0; s < m.maxSlots; s++) {
        if (s >= m.slots) {
            h += `<span class="slot lock">SLOT ${s + 1} · locked${m.slotRank ? ` (rank ${m.slotRank})` : ""}</span>`;
            continue;
        }
        const id = m.draft[s];
        h += `<span class="slot${id ? " full" : ""}">SLOT ${s + 1} · ${id ? nm(id) : "empty"}</span>`;
    }
    m.fixed.forEach((f, k) => { h += `<span class="slot full fixed">SLOT ${m.maxSlots + k + 1} · ${esc(f.label)} · ${esc(f.name)} <small>(fixed, every pilot)</small></span>`; });
    if (m.fixed.length)
        h += `</div><div class="note">Slot ${m.maxSlots + 1} is fixed: every pilot carries the ${m.fixed.map((f) => esc(f.name)).join(", ")} (anti-armour: a pod with a rocket tube and spare rockets; walk onto it to pick the tube up) · not changed here<div>`;
    h += `</div><div class="ph2">YOUR CALLS · click to put in or take out</div><div class="lorows">`;
    for (const r of m.rows.filter((x) => x.owned)) {
        h += `<div class="lorow${r.inDraft ? " on" : ""}${r.met ? "" : " unmet"}" data-act="lo" data-k="${r.id}" data-b="0" data-i="0"><span class="n">${r.inDraft ? "■" : "□"} ${esc(r.name)}</span><span class="c">${esc(r.category)}</span><small>${esc(r.req)}${r.met ? "" : " · can be carried, usable once met"}</small></div>`;
    }
    h += `</div>`;
    const locked = m.rows.filter((x) => !x.owned);
    if (locked.length)
        h += `<div class="note">Locked (unlock in PROFILE before a match): ${locked.map((r) => `${esc(r.name)} <span class="dim">(${esc(r.req)})</span>`).join(" · ")}</div>`;
    const label = m.canChange ? "APPLY LOADOUT" : "KEEP FOR NEXT VISIT / RESPAWN";
    h += `<div class="opt${m.changed ? "" : " no"}" data-act="loApply" data-b="0" data-i="0"><span class="n">${label}</span><small>now: ${m.now.map(nm).join(", ") || "none"}${m.pending ? ` · waiting to apply: ${m.draft.map(nm).join(", ") || "no calls"}` : ""}</small></div>`;
    h += `<div class="note">Use a call: ${fp ? "hold Z, type its arrow code, throw the beacon (LMB)" : "go to first person (Tab), hold Z, type its arrow code, throw the beacon (LMB)"} · ${exports.LOADOUT_KEY_LABEL} / Esc close · pilot weapon: PROFILE before the match</div>`;
    return h;
}
