"use strict";
// Frontline: the loadout picker (designer 19 Nov: "eliminate Role, have people choose their slot 1 and 2, type,
// grenades, armor, slot 3 calldown and then their calls, add graphic icons for those and group those so you feel like
// you're going through a list in logical order and making decisions rather than the word wrap mess we have now").
// Pure HTML: numbered steps in three groups (weapons, gear, support), each a row of icon cards. The cards keep the old
// buttons' data-k / data-v, so main.ts's click handler is unchanged. Slot 2 is the kit's `role` key underneath (the
// role only ever chose the slot 2 weapon; the AI medic keys off it), shown as the weapon now.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOADOUT_ICONS = void 0;
exports.loadoutHtml = loadoutHtml;
// Loadout pictograms v2 (designer 20 Nov: "the icons are pretty basic, take another pass"): side-profile silhouettes
// with a tinted body (.f), solid details (.s) and a crisp outline, 64 x 36, all in currentColor.
const S = (body) => `<svg viewBox="0 0 64 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const F = 'class="f"', D = 'class="s"';
const vents = (x0, y, n, step = 3) => Array.from({ length: n }, (_, i) => `<path ${D} d="M${x0 + i * step} ${y}h1.6v2.4h-1.6z"/>`).join("");
// a soldier: helmet, shoulders, rifle across
const trooper = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path ${F} d="M-4 -9a4.4 4.4 0 018.8 0v1.6H-4z"/><path d="M-5 -7.4h10.6"/><path ${D} d="M-2 -6.4h4.6v1.4h-4.6z"/><path ${F} d="M-6.5 8V1.5Q-6.5 -3 0.4 -3T7.3 1.5V8z"/><path d="M-5 3l11 -4"/></g>`;
exports.LOADOUT_ICONS = {
    // ---- slot 1
    carbine: S(`<path ${F} d="M3 14.5l9-1 2.5 1.5v5.5l-2.5 1.5H6l-3-2.5z"/><path d="M6 16.5h5"/>`
        + `<path ${F} d="M14.5 12.5h29l1.5 1.5v6.5H14.5z"/><path ${F} d="M45 13.5h11v6H45z"/>${vents(47, 15.3, 3)}`
        + `<path d="M56 15.5h5.5M56 17.5h5.5"/><path ${D} d="M60 14.5h2v4h-2z"/>`
        + `<path d="M21 12.5v-3h11v3M23 9.5V8h2v1.5M29 9.5V8h2v1.5"/>`
        + `<path ${F} d="M29 20.5h6l1.5 8-6 1.5z"/><path ${F} d="M18.5 20.5h5l-2.5 8.5h-5z"/><path d="M24 20.5q1 3 3.5 3"/>`),
    dual: S(`<g><path ${F} d="M5 8h23l1.5 1.5v4H5z"/><path ${D} d="M8 9.5h2v2.5H8zM12 9.5h2v2.5h-2z"/><path d="M29.5 10.5h3"/>`
        + `<path ${F} d="M8 13.5h11l-2.5 10.5h-5.5l1.5-6.5H8z"/><path ${D} d="M12.5 24h4v4.5h-4z"/><path d="M18 13.5q0 4 3 4"/></g>`
        + `<g transform="translate(25 7)"><path ${F} d="M5 8h23l1.5 1.5v4H5z"/><path ${D} d="M8 9.5h2v2.5H8zM12 9.5h2v2.5h-2z"/><path d="M29.5 10.5h3"/>`
        + `<path ${F} d="M8 13.5h11l-2.5 10.5h-5.5l1.5-6.5H8z"/><path ${D} d="M12.5 24h4v2.5h-4z"/><path d="M18 13.5q0 4 3 4"/></g>`),
    shotgun: S(`<path ${F} d="M2 15l11-1 2.5 1.5v5L13 22H5l-3-3z"/><path ${F} d="M15.5 13.5h14v7h-14z"/>`
        + `<path ${F} d="M29.5 13.5h31v3h-31z"/><path d="M29.5 18.2h24"/><path ${D} d="M33 17h11v4.5H33z"/>`
        + `<path d="M35 17v4.5M38 17v4.5M41 17v4.5" stroke="#000" stroke-opacity="0.35" stroke-width="0.8"/>`
        + `<path ${D} d="M58.5 12.3h1.6v1.2h-1.6z"/><path ${F} d="M17.5 20.5h5l-2.5 8h-5z"/><path d="M22.5 20.5q1 3 3.5 3"/>`),
    marksman: S(`<path ${F} d="M2 16.5l11-1.5 2.5 1.5v5.5l-3 1.5H5l-3-2.5z"/><path ${F} d="M15.5 15h22v6.5h-22z"/>`
        + `<path ${F} d="M37.5 16h14v4.5h-14z"/>${vents(40, 17.2, 3, 3.5)}<path d="M51.5 18.2h7"/><path ${D} d="M58.5 16.5h3.5v3.4h-3.5z"/>`
        + `<path ${F} d="M19.5 8.5h16v4.5h-16z"/><path ${F} d="M16 7.5h4v6.5h-4zM35 7.5h4v6.5h-4z"/><path d="M23 13v2M32 13v2M27.5 8.5V6.5"/>`
        + `<path ${F} d="M28.5 21.5h5l1 6.5h-5z"/><path ${F} d="M18 21.5h4.5l-2.5 7.5h-4.5z"/>`),
    launcher: S(`<path ${F} d="M2 15.5h10v7H5l-3-3z"/><circle ${F} cx="20" cy="18.5" r="7"/>`
        + `<circle ${D} cx="20" cy="14.5" r="1.4"/><circle ${D} cx="23.8" cy="17.3" r="1.4"/><circle ${D} cx="22.4" cy="21.8" r="1.4"/><circle ${D} cx="17.6" cy="21.8" r="1.4"/><circle ${D} cx="16.2" cy="17.3" r="1.4"/><circle cx="20" cy="18.5" r="1"/>`
        + `<path ${F} d="M27 14h29v8H27z"/><path ${D} d="M55 13h4v10h-4z"/><path d="M33 14v8M36 14v8"/>`
        + `<path d="M31 14v-3.5h8V14"/><path ${F} d="M12 22h5l-2.5 7.5H10z"/><path ${F} d="M42 22h4l-1 5.5h-4z"/>`),
    // ---- slot 2 (the kit's role key)
    sniper: S(`<path ${F} d="M1.5 15l13-1 2.5 2v6l-3 2H7l-5.5-4z"/><path ${F} d="M3 21.5h6v4H4z"/><path ${F} d="M17 15h18v6.5H17z"/>`
        + `<path ${F} d="M35 16.6h21v3.2H35z"/><path ${D} d="M55.5 14.8h6v6.8h-6z"/><path d="M57.5 14.8v6.8M59.5 14.8v6.8" stroke="#000" stroke-opacity="0.4" stroke-width="0.8"/>`
        + `<path ${F} d="M19.5 7h17v5h-17z"/><path ${F} d="M15.5 6h4.5v7h-4.5zM36 5.5h5v8h-5z"/><path d="M24 12v3M32 12v3"/>`
        + `<path ${F} d="M27 21.5h5.5v6.5H27z"/><path ${F} d="M19 21.5h4.5l-2.5 7.5h-4.5z"/><path d="M45 19.8l-4 10M47 19.8l4 10"/>`),
    assault: S(`<path ${F} d="M2 14h7v8H3.5L2 20z"/><path ${F} d="M9 12h26v10H9z"/><path d="M9 15h26" stroke-opacity="0.5"/>`
        + `<path ${F} d="M35 13.5h19v7H35z"/>${Array.from({ length: 5 }, (_, i) => `<circle ${D} cx="${37.5 + i * 3.5}" cy="17" r="1"/>`).join("")}`
        + `<path ${D} d="M54 14.8h7v4.4h-7z"/><path d="M17 12V8h12v4"/><path ${F} d="M18 22h11v7H18z"/><path ${D} d="M20 24h7v1.4h-7z"/>`
        + `<path d="M29 25.5q5 0 6 5"/><path d="M31.5 26.5v2M33.5 27.5v2"/><path ${F} d="M11 22h4.5l-2 7h-4.5z"/><path d="M48 20.5l-3 8M50 20.5l3 8"/>`),
    heavy: S(`<path ${F} d="M6 12h43v10H6z"/><path ${F} d="M49 11l8-2.5v17l-8-2.5z"/><path ${F} d="M6 12l-4-2.5v15L6 22z"/>`
        + `<path ${D} d="M58 14.5l4.5 2.5-4.5 2.5z"/><path d="M14 12v10M41 12v10" stroke-opacity="0.6"/><path ${D} d="M22 13.5h12v1.6H22z"/>`
        + `<path ${F} d="M24 12V7h9v5"/><path ${D} d="M30 8h2v2.5h-2z"/><path ${F} d="M19 22h5l-1.5 7h-5z"/><path ${F} d="M32 22h4l-1 5h-4z"/>`),
    medic: S(`<path ${F} d="M8 13h28q4 0 4 4v3q0 4-4 4H8z"/><path ${F} d="M40 15.5h10l7-2.5v10l-7-2.5H40z"/><path d="M57 18h4" stroke-dasharray="1 1.5"/>`
        + `<path ${F} d="M13 4h15q2 0 2 2v7H11V6q0-2 2-2z"/><path ${D} d="M19.3 5.5h2.4v2h2v2.4h-2v2h-2.4v-2h-2V7.5h2z"/>`
        + `<path ${D} d="M8 16h3v5H8z"/><path d="M14 18h20" stroke-opacity="0.5"/><path ${F} d="M15 24h5l-2.5 7h-5z"/><path ${D} d="M30 24h3l1 5h-3z"/>`),
    // ---- type
    kinetic: S(`${[17, 27.5, 38].map((x) => `<path ${F} d="M${x} 31V16q0-6 4.5-10q4.5 4 4.5 10v15z"/><path ${D} d="M${x - 0.6} 29.5h10.2V32h-10.2z"/><path d="M${x} 17h9"/>`).join("")}`
        + `<path d="M6 32h52" stroke-opacity="0.5"/>`),
    laser: S(`<path ${F} d="M4 10h21q2 0 2 2v12q0 2-2 2H4q-2 0-2-2V12q0-2 2-2z"/><path ${D} d="M27 14.5h3v7h-3z"/>`
        + `<path ${D} d="M16 11.5l-6.5 7.5h5l-2.5 5.5 8-8h-5l3-5z"/>`
        + `<path d="M34 18h26" stroke-width="2.6"/><path d="M34 14.5h22M34 21.5h22" stroke-opacity="0.45" stroke-dasharray="2 3"/><circle ${D} cx="60" cy="18" r="2"/>`),
    // ---- grenades
    area: S(`<circle cx="32" cy="18" r="15" stroke-dasharray="2.5 3" stroke-opacity="0.55"/><circle ${F} cx="32" cy="18" r="5.5"/><path ${D} d="M30 11h4v2h-4z"/>`
        + `${[0, 60, 120, 180, 240, 300].map((a) => { const r = 10.5, x = 32 + r * Math.cos(a * Math.PI / 180), y = 18 + r * Math.sin(a * Math.PI / 180); return `<circle ${D} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.9"/>`; }).join("")}`),
    he: S(`<path ${F} d="M24 14q8-5 16 0q3 4 3 9q0 9-11 10q-11-1-11-10q0-5 3-9z"/>`
        + `<path d="M22.5 20h19M22 26h20M27 13v19M37 13v19" stroke-opacity="0.65"/><path ${D} d="M27.5 8h9v4.5h-9z"/>`
        + `<path ${F} d="M36.5 9l6.5-1q3 1 3 6v9l-2 1"/><circle cx="24" cy="7" r="3.2"/><path d="M27 7.5h1"/>`),
    sticky: S(`<path ${F} d="M22.5 11q9.5-4 19 0q3 4 3 9q0 9-12.5 10q-12.5-1-12.5-10q0-5 3-9z"/><path ${D} d="M27.5 6h9v4.5h-9z"/>`
        + `<path d="M27 15l10 0M25 20h14" stroke-opacity="0.5"/>`
        + `<path ${D} d="M22 26q-3 4-2 7q1.2 1.5 2.4 0q.2-3 1.8-5zM31 30q-.5 3 0 5q1.3 1.2 2.6 0q.5-2-.2-5zM40 27q2 3 1.5 6q1 1.4 2.3.2q.5-3-1.4-6.5z"/>`
        + `<circle ${D} cx="48" cy="13" r="1.2"/><circle ${D} cx="51" cy="18" r="0.9"/>`),
    seeker: S(`<path ${F} d="M10 14h12q4 0 6 4q-2 4-6 4H10z"/><path ${F} d="M10 14l-5-4v4zM10 22l-5 4v-4z"/><path ${D} d="M26.5 16.5h3v3h-3z"/>`
        + `<path d="M31 18q8-12 17-6" stroke-dasharray="2 2.5"/><circle ${F} cx="51" cy="18" r="7"/><circle cx="51" cy="18" r="2.5"/>`
        + `<path d="M51 8.5v4M51 23.5v4M41.5 18h4M56.5 18h4"/>`),
    // ---- armour: vests, heavier = more plates
    light: S(`<path ${F} d="M23 4h5l4 4 4-4h5l5 4v20l-4 4H22l-4-4V8z"/><path ${F} d="M25 13h14v10H25z"/><path d="M28 8v4M36 8v4" stroke-opacity="0.5"/>`),
    medium: S(`<path ${F} d="M23 4h5l4 4 4-4h5l5 4v20l-4 4H22l-4-4V8z"/><path ${F} d="M24.5 11h15v8h-15zM24.5 20.5h15v7h-15z"/>`
        + `<path ${F} d="M14 8l4 0v9l-5-2zM50 8l-4 0v9l5-2z"/><path ${D} d="M30 23h4v1.6h-4z"/>`),
    heavyArmour: S(`<path ${F} d="M22 3h6l4 3 4-3h6l6 5v21l-5 4H21l-5-4V8z"/><path ${D} d="M26 3.5l6 4.5 6-4.5v2L32 10l-6-4.5z"/>`
        + `<path ${F} d="M24 11h16v6H24zM24 18.5h16v6H24zM24 26h16v4H24z"/>`
        + `<path ${F} d="M9 7q4-3 8 0v11l-8-2zM55 7q-4-3-8 0v11l8-2z"/><path d="M10 11h6M48 11h6" stroke-opacity="0.6"/>`),
    // ---- slot 3 (pod weapons)
    "heavy-grenade-launcher": S(`<path ${F} d="M2 14h9v8H5l-3-3z"/><circle ${F} cx="21" cy="18" r="9"/>`
        + `${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = i * Math.PI / 4, x = 21 + 5.6 * Math.cos(a), y = 18 + 5.6 * Math.sin(a); return `<circle ${D} cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5"/>`; }).join("")}`
        + `<path ${F} d="M30 13h26v10H30z"/><path ${D} d="M55 12h5v12h-5z"/><path d="M36 13v10M40 13v10"/><path ${F} d="M44 23h4l-1 6h-4z"/><path d="M15 9V5h11v4"/>`),
    "rocket-tube": null, // same weapon as the Heavy slot 2 option: drawn from `heavy`
    "flak-gun": S(`<path ${F} d="M8 32l4-9h20l4 9z"/><path ${F} d="M14 23l2-5h12l2 5z"/>`
        + `<path ${F} d="M19 19L39 3.5l2.2 2.6L22 21z"/><path ${F} d="M24 20.5L43.5 8l2 2.8L27 22.5z"/>`
        + `<circle cx="52" cy="6" r="3.2" stroke-dasharray="1.5 1.5"/><circle ${D} cx="52" cy="6" r="1.3"/><circle cx="57" cy="14" r="2.4" stroke-dasharray="1.2 1.4"/><circle ${D} cx="47" cy="2.5" r="0.9"/>`),
    "pilot-laser-cannon": S(`<path ${F} d="M3 14h8v8H5l-2-2z"/><path ${F} d="M11 11h24q3 0 3 3v8q0 3-3 3H11z"/>`
        + `<path ${D} d="M15 12.5h2v11h-2zM20 12.5h2v11h-2zM25 12.5h2v11h-2z"/><path ${F} d="M38 14h9l3 2v4l-3 2h-9z"/>`
        + `<path d="M50 18h12" stroke-width="2.8"/><path d="M50 14.5l10-2M50 21.5l10 2" stroke-opacity="0.4"/><path ${F} d="M16 25h5l-2 6h-5z"/><path d="M20 11V7h10v4"/>`),
    "guided-missile-launcher": S(`<path ${F} d="M4 13h28v11H4z"/><circle cx="32" cy="18.5" r="3.5"/><path ${D} d="M6 15h3v2H6zM6 19.5h3v2H6z"/>`
        + `<path ${F} d="M12 24h5l-2 7h-5z"/><path d="M14 13v-4h8v4"/>`
        + `<path d="M37 16q8-10 14-5" stroke-dasharray="2 2"/><path ${D} d="M50 8.5l6 2.5-5 3.5z"/><circle cx="56" cy="24" r="4.5"/><path d="M56 17.5v2.5M56 28v2.5M49.5 24h2.5M60 24h2.5"/>`),
    "silo-targeter": S(`<path ${F} d="M6 9h20q2 0 2 2v16q0 2-2 2H6q-2 0-2-2V11q0-2 2-2z"/><path d="M8 13h16v9H8z" stroke-opacity="0.6"/>`
        + `<circle cx="16" cy="17.5" r="2.6"/><path d="M16 13.5v1.5M16 20v1.5M12 17.5h1.5M18.5 17.5h1.5"/><path ${D} d="M9 24.5h5v2H9zM18 24.5h5v2h-5z"/>`
        + `<path ${F} d="M47 2l4 5v15h-8V7z"/><path ${D} d="M43 18l-3 4h3zM51 18l3 4h-3z"/><path d="M45 25l-1 3M47 25v4M49 25l1 3" stroke-opacity="0.7"/>`
        + `<path d="M31 18h7" stroke-dasharray="1.5 2"/>`),
    // ---- call-downs
    "flak-turret": S(`<path ${F} d="M18 32l4-12h20l4 12z"/><path ${F} d="M24 14h16v6H24z"/><path d="M38 15l14-11M38 18l14-11" stroke-width="2"/>`
        + `<circle cx="54" cy="5" r="1.5"/><circle cx="58" cy="10" r="1.2"/><circle cx="50" cy="2" r="1"/><path d="M26 14q-6-6 0-10" stroke-opacity="0.7"/>`),
    "shield-bubble": S(`<path ${F} d="M8 32a24 24 0 0 1 48 0z" fill-opacity="0.18"/><path d="M8 32a24 24 0 0 1 48 0"/><path d="M14 32a18 18 0 0 1 36 0" stroke-opacity="0.45"/>`
        + `<path ${F} d="M28 32v-8h8v8z"/><path d="M32 24v-4"/><circle ${D} cx="32" cy="19" r="2"/><path d="M2 33h60" stroke-opacity="0.5"/>`),
    "repair-resupply": S(`<path ${F} d="M22 12h20l3 5v15H19V17z"/><path d="M19 17h26"/><path ${D} d="M29 20h6v10h-6z"/><path ${D} d="M27 23h10v4H27z"/>`
        + `<path d="M50 4l6 6-12 12-4 1 1-4z"/><circle cx="53" cy="7" r="3"/><path d="M8 26v6M5 29h6" stroke-width="1.6"/><path d="M27 12l-3-8M37 12l3-8" stroke-opacity="0.55"/>`),
    "sentry-gun": S(`<path d="M24 32l7-10M40 32l-7-10M32 22v10" stroke-width="1.8"/><path ${F} d="M27 21h10l1 2H26z"/>`
        + `<path ${F} d="M22 10h18q3 0 3 3v5q0 3-3 3H22z"/><path ${D} d="M25 12.5h5v3h-5z"/>`
        + `<path ${F} d="M43 12h15v2.5H43zM43 16.5h15V19H43z"/><path d="M60 13.2h2M60 17.7h2" stroke-dasharray="0.8 1"/><path d="M27 10V7h8v3"/>`),
    "precision-strike": S(`<ellipse cx="28" cy="26" rx="18" ry="6" stroke-opacity="0.5"/><ellipse ${F} cx="28" cy="26" rx="9" ry="3"/><circle ${D} cx="28" cy="26" r="1.5"/>`
        + `<path d="M28 17v4M28 31v3M8 26h5M43 26h5"/><path d="M58 1L30 24" stroke-width="2.4"/><path d="M60 5L36 23M54 0L32 19" stroke-opacity="0.35"/>`),
    barrage: S(`${[[12, 3], [28, 1], [44, 4]].map(([x, y]) => `<path ${F} d="M${x} ${y}h4v8l-2 3-2-3z"/><path d="M${x + 2} ${y - 3}v2.5" stroke-opacity="0.5"/>`).join("")}`
        + `<path ${F} d="M2 33q3-9 9-7q2-6 7-4q4-5 9 0q4-4 8 0q5-3 8 3q6-2 8 3q5 0 7 5z"/><path d="M0 33.5h64"/>`),
    reinforcements: S(`${trooper(14, 22, 0.95)}${trooper(50, 22, 0.95)}${trooper(32, 19, 1.15)}<path d="M4 33h56" stroke-opacity="0.5"/>`),
    "resupply-pod": S(`<path ${F} d="M24 10h16l4 6v14H20V16z"/><path d="M20 16h24"/><path ${F} d="M27 19h10v8H27z"/><path d="M27 23h10M32 19v8" stroke-opacity="0.6"/>`
        + `<path ${D} d="M22 30h4v3h-4zM38 30h4v3h-4z"/><path d="M28 10l-4-8M36 10l4-8M32 10V2" stroke-opacity="0.55"/><path ${D} d="M20 1h24v2H20z"/>`
        + `<path d="M10 8v10M7 15l3 3 3-3M54 8v10M51 15l3 3 3-3"/>`),
    // designer 22 Nov, batch 1: the new call-downs
    "smoke-screen": S(`<path ${D} d="M6 30h52v3H6z"/><path ${D} d="M30 24h4v6h-4z"/>`
        + `<path ${F} d="M8 22q-2-6 4-7q0-6 7-5q3-5 8-1q5-4 9 1q6-2 7 4q6 0 6 6q4 2 2 6H8q-4-2 0-4z" fill-opacity="0.35"/><path d="M14 16q3-2 6 0M30 12q3-2 6 0M44 17q3-2 6 0" stroke-opacity="0.55"/>`),
    "sensor-sweep": S(`<circle cx="32" cy="20" r="14" stroke-opacity="0.45"/><circle cx="32" cy="20" r="8" stroke-opacity="0.7"/><path ${F} d="M32 20L44 11a15 15 0 0 1 2 9z" fill-opacity="0.45"/>`
        + `<circle ${D} cx="32" cy="20" r="1.6"/><circle ${D} cx="41" cy="15" r="1.3"/><circle ${D} cx="23" cy="26" r="1.3"/><path d="M14 34h36" stroke-opacity="0.5"/>`),
    "recon-drone": S(`<ellipse cx="32" cy="29" rx="20" ry="4" stroke-dasharray="2 2" stroke-opacity="0.6"/><path ${F} d="M26 10h12l3 4H23z"/><path d="M14 8h14M36 8h14" stroke-width="1.8"/>`
        + `<path d="M21 8v3M43 8v3"/><circle ${D} cx="32" cy="16" r="2"/><path d="M32 18l-8 10M32 18l8 10" stroke-opacity="0.4"/>`),
    minefield: S(`${[[12, 26], [30, 30], [48, 25], [22, 18], [42, 15]].map(([x, y]) => `<path ${F} d="M${x - 5} ${y}h10l-2-3h-6z"/><circle ${D} cx="${x}" cy="${y - 4}" r="1.2"/>`).join("")}<path d="M2 33h60" stroke-opacity="0.5"/>`),
    "emp-burst": S(`<circle cx="32" cy="18" r="15" stroke-opacity="0.35"/><circle cx="32" cy="18" r="9" stroke-opacity="0.6"/><path ${D} d="M34 7l-8 12h6l-3 10 9-13h-6z"/>`
        + `<path d="M10 10l4 3-3 2 4 3M54 10l-4 3 3 2-4 3" stroke-opacity="0.7"/>`),
    "strafing-run": S(`<path ${F} d="M40 6l14 3-14 3-6 6h-4l3-6-11-1-3 2h-3l2-4-2-4h3l3 2 11-1-3-6h4z"/>`
        + `${[8, 18, 28, 38, 48].map((x) => `<path d="M${x} 30l2-5" stroke-width="1.6"/><circle cx="${x}" cy="31" r="1" stroke-opacity="0.6"/>`).join("")}<path d="M4 33h56" stroke-opacity="0.5"/>`),
    "bomb-run": S(`<path ${F} d="M40 4l14 3-14 3-6 6h-4l3-6-11-1-3 2h-3l2-4-2-4h3l3 2 11-1-3-6h4z"/>`
        + `${[[14, 18], [24, 22], [34, 26]].map(([x, y]) => `<path ${F} d="M${x} ${y}q-2-3 0-6q2 3 0 6z"/>`).join("")}<path ${F} d="M40 33q2-6 6-5q3-4 6 0q4-1 5 5z"/><path d="M2 33.5h60" stroke-opacity="0.5"/>`),
    "scout-drop": S(`<path ${F} d="M14 22h30l8 4-2 4H12l-2-4z"/><path ${F} d="M22 22l3-5h12l3 5z"/><circle ${D} cx="18" cy="30" r="2.4"/><circle ${D} cx="44" cy="30" r="2.4"/><path d="M40 18h14" stroke-width="1.8"/>`
        + `<path d="M26 3l5 4 5-4M26 8l5 4 5-4" stroke-opacity="0.6"/>`),
    "wasp-drop": S(`<path ${F} d="M8 16h22l10-6h8l6 4-6 4 6 4-6 4h-8l-10-6H8l-4-2z"/><path ${D} d="M40 14h6v4h-6z"/><path d="M14 26h16M18 22v4" stroke-opacity="0.6"/><path d="M50 3l4 4 4-4M50 8l4 4 4-4" stroke-opacity="0.6"/>`),
    "hammer-drop": S(`<path ${F} d="M4 22h46l-3 9H8z"/><path ${F} d="M10 22l4-8h28l4 8z"/><path ${F} d="M20 14v-4h14v4z"/><path d="M34 11h12" stroke-width="2"/><circle ${D} cx="14" cy="27" r="1.6"/><circle ${D} cx="40" cy="27" r="1.6"/><path d="M50 3l4 4 4-4M50 8l4 4 4-4" stroke-opacity="0.6"/>`),
    "salvo-drop": S(`<path ${F} d="M4 24h44l-3 7H8z"/><path ${F} d="M10 24l2-5h30l2 5z"/><path ${F} d="M16 19l16-10 4 4-16 9z"/><path d="M22 14l14-8M26 17l14-8" stroke-opacity="0.7"/><circle ${D} cx="14" cy="28" r="1.5"/><circle ${D} cx="38" cy="28" r="1.5"/><path d="M50 3l4 4 4-4M50 8l4 4 4-4" stroke-opacity="0.6"/>`),
    "flak-drop": S(`<path ${F} d="M4 24h44l-3 7H8z"/><path ${F} d="M12 24l3-6h22l3 6z"/><path d="M28 18l14-12M31 19l14-12" stroke-width="1.8"/><circle cx="45" cy="4" r="1.2"/><circle ${D} cx="14" cy="28" r="1.5"/><circle ${D} cx="38" cy="28" r="1.5"/><path d="M50 3l4 4 4-4M50 8l4 4 4-4" stroke-opacity="0.6"/>`),
    "strider-drop": S(`<path ${F} d="M14 8h24l3 8H11z"/><path ${D} d="M40 10h8v3h-8z"/><path d="M16 16l-6 8 4 9M36 16l6 8-4 9M24 16l-2 17M30 16l2 17" stroke-width="1.6"/><path d="M50 3l4 4 4-4M50 8l4 4 4-4" stroke-opacity="0.6"/>`),
    "lancer-drop": S(`<path ${F} d="M4 24h44l-3 7H8z"/><path ${F} d="M12 24l3-6h22l3 6z"/><path ${F} d="M18 18l2-4h12l2 4z"/><path d="M32 15h16" stroke-width="2.2"/><path d="M48 15h3" stroke-opacity="0.6" stroke-dasharray="1 1"/><circle ${D} cx="14" cy="28" r="1.5"/><circle ${D} cx="38" cy="28" r="1.5"/><path d="M50 3l4 4 4-4M50 8l4 4 4-4" stroke-opacity="0.6"/>`),
    "carrier-drop": S(`<path ${F} d="M4 14h42l4 6v10H4z"/><path d="M4 20h46" stroke-opacity="0.6"/><path ${D} d="M10 16h6v3h-6zM20 16h6v3h-6zM30 16h6v3h-6z"/><circle ${D} cx="11" cy="31" r="2.4"/><circle ${D} cx="25" cy="31" r="2.4"/><circle ${D} cx="39" cy="31" r="2.4"/><path d="M50 3l4 4 4-4M50 8l4 4 4-4" stroke-opacity="0.6"/>`),
    "tank-drop": S(`<path ${F} d="M6 24h50l-4 8H10z"/><circle ${D} cx="14" cy="28" r="1.4"/><circle ${D} cx="22" cy="28" r="1.4"/><circle ${D} cx="30" cy="28" r="1.4"/><circle ${D} cx="38" cy="28" r="1.4"/><circle ${D} cx="46" cy="28" r="1.4"/>`
        + `<path ${F} d="M10 24l3-6h34l4 6z"/><path ${F} d="M20 18l2-5h16l3 5z"/><path ${F} d="M40 14h20v2.6H40z"/><path ${D} d="M58 13h4v4.6h-4z"/>`
        + `<path d="M25 3l5 4 5-4M25 7l5 4 5-4" stroke-opacity="0.6"/>`),
    "gunship-drop": S(`<path ${F} d="M6 15h28l8-5h10l9 3-7 5 7 5-9 3H42l-8-5H6l-3-3z"/><path ${D} d="M44 12.5h7v4h-7z"/>`
        + `<path d="M3 9h34" stroke-width="1.8"/><path d="M20 9v6"/><path ${F} d="M12 21v4h8v-4"/><path d="M14 25l-3 6M18 25l3 6"/>`
        + `<path ${F} d="M34 20h8v3h-8z"/><path d="M42 21.5h6" stroke-dasharray="1 1"/>`),
    "mech-drop": S(`<path ${F} d="M22 6h20q3 0 3 3v9H19V9q0-3 3-3z"/><path d="M26 10h12" stroke-opacity="0.5"/>`
        + `<path ${F} d="M12 8h7v8h-7zM45 8h7v8h-7z"/><path ${D} d="M12 10h-8v2.5h8zM52 10h8v2.5h-8z"/>`
        + `<path ${F} d="M24 18h16l-1 3H25z"/><path ${F} d="M25 21h4l-3 6 2 4h-6l-1-4zM39 21h-4l3 6-2 4h6l1-4z"/><path ${D} d="M20 31h9v2h-9zM35 31h9v2h-9z"/>`),
};
exports.LOADOUT_ICONS["rocket-tube"] = exports.LOADOUT_ICONS.heavy;
/** Short stats for a weapon id (weapons.json): damage, fire rate, range. */
function weaponLine(data, id) {
    const w = data.weapons.find((x) => x.id === id);
    if (!w)
        return "";
    if (w.damage < 0.1)
        return id === "medic-gun" ? `heals · revives · ${w.range} m` : `marks targets · ${w.range >= 1000 ? `${w.range / 1000} km` : `${w.range} m`}`;
    if (w.ballistic && w.ammo && w.ammo <= 4) // grenades: blast and how many you carry
        return `${w.damage} dmg · ${w.splashRadius ?? 0} m blast · ×${w.ammo}`;
    const rate = w.shotsPerSecond >= 1 ? `${+w.shotsPerSecond.toFixed(1)}/s` : `${+(1 / w.shotsPerSecond).toFixed(1)} s`;
    const dmg = w.pellets ? `${w.pellets}×${w.damage}` : `${w.damage}`;
    const rng = w.range >= 1000 ? `${w.range / 1000} km` : `${w.range} m`;
    return `${dmg} dmg · ${rate} · ${rng}`;
}
const LOCK_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const title = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());
/**
 * The picker. FL: constants.frontline; kit: the current kit; data: the game data (weapons, support calls).
 * Returns the HTML of the three groups and their numbered steps.
 */
function loadoutHtml(FL, kit, data, lock = null) {
    let hidden = 0;
    const card = (k, v, on, icon, name, line, badge = "") => {
        // token unlocks (designer 19 Nov): a locked card shows its cost; armed (clicked once) it asks for the second click
        const locked = lock && !lock.owns(k, k === "laser" ? v === "1" : v), cost = locked ? lock.cost(k, k === "laser" ? v === "1" : v) : 0;
        if (locked && lock.hide && !on) { // designer 22 Nov: the "hide locked" filter (on by default)
            hidden++;
            return "";
        }
        const armed = locked && lock.armed === lock.pool(k, k === "laser" ? v === "1" : v);
        const lockLine = armed ? (lock.tokens >= cost ? `click again: ${cost} token${cost === 1 ? "" : "s"}` : `need ${cost} · have ${lock.tokens}`) : `locked · ${cost} token${cost === 1 ? "" : "s"}`;
        return `<button data-k="${k}" data-v="${esc(v)}" class="lo-card${on ? " on" : ""}${locked ? " locked" : ""}${armed ? " armed" : ""}" title="${esc(name)}${line ? ` · ${esc(line)}` : ""}">`
            + `${badge ? `<b class="lo-badge">${badge}</b>` : ""}${locked ? `<b class="lo-lock">${LOCK_SVG}</b>` : ""}<span class="lo-ic">${exports.LOADOUT_ICONS[icon] ?? ""}</span><span class="lo-n">${esc(name)}</span><span class="lo-s">${esc(locked ? lockLine : line)}</span></button>`;
    };
    const step = (n, label, chosen, cards, hint = "", extra = "") => `<div class="lo-step"><div class="lo-h"><span class="lo-l">${label}</span><span class="lo-c">${esc(chosen)}</span>${hint ? `<span class="lo-hint">${hint}</span>` : ""}${extra}</div><div class="lo-row">${cards}</div></div>`;
    const group = (name, steps) => `<div class="lo-group"><div class="lo-g">${name}</div>${steps}</div>`;
    const gun = FL.guns[kit.gun], laser = !!kit.laser;
    const slot1 = Object.entries(FL.guns).map(([k, g]) => card("gun", k, kit.gun === k, k, g.name, weaponLine(data, laser ? g.laser : g.kinetic))).join("");
    // designer 20 Nov (condense): the type is a two-way switch under the slot 1 heading, not a row of its own
    const seg = (v, on, icon, name, line) => {
        const locked = lock && !lock.owns("laser", v === "1"), cost = locked ? lock.cost("laser", v === "1") : 0;
        return `<button data-k="laser" data-v="${v}" class="lo-seg${on ? " on" : ""}${locked ? " locked" : ""}" title="${name} · ${locked ? `locked · ${cost} token${cost === 1 ? "" : "s"}` : line}">${locked ? `<b class="lo-lock">${LOCK_SVG}</b>` : ""}<span class="lo-ic">${exports.LOADOUT_ICONS[icon]}</span>${name}</button>`;
    };
    const type = `<span class="lo-segs">${seg("0", !laser, "kinetic", "Kinetic", "magazines")}${seg("1", laser, "laser", "Laser", "heat cells")}</span>`;
    const slot2 = Object.entries(FL.roles).map(([k, r]) => { const w = data.weapons.find((x) => x.id === r.weapon); return card("role", k, kit.role === k, k, w ? title(w.name.replace(/^Pilot /, "")) : r.name, weaponLine(data, r.weapon)); }).join("");
    const nades = Object.entries(FL.grenades).map(([k, g]) => card("grenade", k, kit.grenade === k, k, g.name.replace(/ grenade$/, ""), weaponLine(data, g.weapon))).join("");
    const arm = Object.entries(FL.armour).map(([k, a]) => card("armour", k, kit.armour === k, k === "heavy" ? "heavyArmour" : k, a.name, `${Math.round(a.damageMul * 100)}% dmg · ×${a.speedMul} speed`)).join("");
    const s3line = (k) => { // designer 19 Nov: rounds and the call's recharge (fewer rounds, a quicker recharge)
        const w = data.weapons.find((x) => x.id === k), rc = FL.slot3RechargeSeconds?.[k];
        const rounds = w?.ammo > 0 ? `${w.ammo} rounds` : k === "pilot-laser-cannon" ? "heat cells" : "unlimited";
        return rc ? `${rounds} · recharge ${rc} s` : weaponLine(data, k);
    };
    const s3 = Object.entries(FL.slot3 ?? {}).map(([k, n]) => card("slot3", k, kit.slot3 === k, k, n, s3line(k))).join("");
    const callName = (id) => data.supportCalls.calls.find((c) => c.id === id)?.name ?? id;
    const calls = (FL.frontlineCalls ?? []).map((id) => {
        const c = data.supportCalls.calls.find((x) => x.id === id), i = kit.calls.indexOf(id);
        return card("calls", id, i >= 0, id, callName(id), (c?.frontline?.cooldownSeconds ?? c?.cooldownSeconds) ? `cooldown ${c?.frontline?.cooldownSeconds ?? c.cooldownSeconds} s` : "", i >= 0 ? "✓" : ""); // designer 21 Nov: a plain select / deselect tick, no pick-order numbers
    }).join("");
    const roleW = data.weapons.find((x) => x.id === FL.roles[kit.role]?.weapon);
    return `<div class="lo">`
        + group("Weapons", step(1, "Slot 1 · primary", `${gun?.name ?? ""}${laser ? " · laser" : ""}`, slot1, "", type)
            + step(2, "Slot 2 · secondary", roleW ? title(roleW.name.replace(/^Pilot /, "")) : "", slot2))
        + group("Gear", step(3, "Grenade", FL.grenades[kit.grenade]?.name ?? "", nades)
            + step(4, "Armour", `${FL.armour[kit.armour]?.name ?? ""} armour`, arm))
        + group("Support", step(5, "Slot 3 · call-down weapon", FL.slot3?.[kit.slot3] ?? "", s3, "dropped in a pod when you call it")
            + step(6, `Call-downs`, `${kit.calls.length} of 4 selected`, calls, "click to select or deselect · up to four"))
        + (lock ? `<div class="lo-tokens"><button data-k="ui" data-v="hideLocked" class="lo-filter${lock.hide ? " on" : ""}" title="show or hide the options you have not unlocked yet">${lock.hide ? "☑" : "☐"} Hide locked${lock.hide && hidden ? ` (${hidden})` : ""}</button> <b>${lock.tokens}</b> unlock token${lock.tokens === 1 ? "" : "s"} · three per rank (four at every fifth)${lock.hide ? "" : " · click a locked option twice to unlock it"}</div>` : "")
        + `</div>`;
}
