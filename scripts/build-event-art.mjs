import { mkdir, writeFile } from 'node:fs/promises';
import { EVENTS } from '../src/campaign-events.js';
const shapes = {
 scroll: '<path d="M43 30h48v66H43z M43 30c-13-8-17 6-9 11h9 M91 96c13 8 17-6 9-11h-9 M54 47h25 M54 58h21 M54 69h25 M54 80h16"/>',
 cross: '<path d="M61 34h18v19h19v18H79v25H61V71H42V53h19z"/>',
 drop: '<path d="M70 28c-6 16-27 34-27 49a27 27 0 0054 0c0-15-21-33-27-49z M54 79c0 9 7 15 14 15"/>',
 coins: '<ellipse cx="62" cy="78" rx="27" ry="10"/><path d="M35 78v13c0 13 54 13 54 0V78 M35 85c0 13 54 13 54 0"/><ellipse cx="80" cy="53" rx="25" ry="9"/><path d="M55 53v12c0 12 50 12 50 0V53 M70 47l14 12 M85 47L72 59"/>',
 grave: '<path d="M44 104V53c0-33 49-33 49 0v51 M33 104h73 M58 53h22 M69 42v32 M54 88h29"/>',
 rope: '<path d="M48 35c40-16 61 17 47 39S43 96 43 72s40-19 38 0-34 17-22 39 M42 43l7 10 M57 37l5 11 M76 38l-2 10 M90 49l-8 6"/>',
 chest: '<path d="M32 61h77v43H32z M32 61V49c0-25 77-25 77 0v12 M32 80h77 M60 68h19v23H60z M69 76v7 M41 50h11 M89 50h11"/>',
 beam: '<path d="M26 89l73-57 13 17-73 57z M43 83l9 9 M62 68l9 9 M80 53l9 9 M42 39l51 67"/>',
 bowl: '<path d="M32 64h78c0 47-78 47-78 0z M32 62h78 M58 48c-13-11 10-13 0-25 M77 48c-13-11 10-13 0-25 M95 48c-13-11 10-13 0-25"/>',
 shrine: '<path d="M27 64l43-39 43 39 M37 60v44h66V60 M27 104h86 M65 49l-5 19 12 10-8 26 M82 66h10v25H82z"/>',
 shield: '<path d="M70 29l37 14-5 36c-3 14-20 25-32 31-12-6-29-17-32-31l-5-36z M70 43v49 M49 65h42"/>',
 gate: '<path d="M31 107V42h18v65 M91 107V42h18v65 M49 48c0-28 42-28 42 0 M60 50v56 M79 50v56 M49 75h42 M25 107h90"/>',
 lamp: '<path d="M48 48h43l-4 49H52z M45 48h49 M48 99h43 M56 48V36c0-17 26-17 26 0v12 M71 83c-16-13 0-20 0-29 15 16 14 23 0 29z"/>',
 blade: '<path d="M94 26l14 14-45 47-15-15z M44 68l24 24 M48 84l-19 20 10 10 20-20 M67 63l25-25"/>',
 bottle: '<path d="M57 26h26v13H57z M60 39v19c-32 17-33 51 10 51s42-34 10-51V39 M43 80h54 M63 90h15 M70 83v15"/>',
 raven: '<path d="M27 72l27-25 14 7 13-24 13 14 21 5-18 12-8 30-24 7-16-15-22-11z M55 66l23 16 M96 45h1 M64 98l-6 12 M81 97l-2 13"/>',
 cart: '<path d="M31 55h77l-10 39H41z M24 43h11l6 51 M45 63h49 M50 76h38"/><circle cx="48" cy="105" r="8"/><circle cx="92" cy="105" r="8"/>',
 flame: '<path d="M72 24c10 26-5 26 12 42 3-8 10-9 11-20 29 38 12 66-25 66-37 0-49-31-24-54-2 16 9 16 12 24 8-21-8-26 14-58z"/>',
 leaf: '<path d="M31 99c0-49 29-66 75-66 1 45-19 72-64 72 M35 108l58-58 M52 90l1-23 M68 75l22 1 M82 62l1-17"/>',
 bridge: '<path d="M25 104h15V55H25 M100 55v49h15 M40 62c24 20 36 20 60 0 M40 86c24 20 36 20 60 0 M52 71v21 M69 76v21 M87 71v21"/>',
 bell: '<path d="M44 80c3-8 4-18 4-25 0-29 44-29 44 0 0 7 1 17 4 25l10 13H34z M60 97c0 17 20 17 20 0 M66 28v-7h9v7 M40 101h60"/>',
 cage: '<path d="M32 106V45c0-28 76-28 76 0v61z M32 45h76 M32 91h76 M47 40v66 M62 34v72 M78 34v72 M94 40v66"/>',
 mask: '<path d="M28 45c28-18 56-18 84 0l-5 36-37 27-37-27z M43 58l19 4-8 13-15-4z M98 58l-19 4 8 13 15-4z M60 91h20"/>',
 key: '<circle cx="57" cy="46" r="22"/><circle cx="57" cy="46" r="8"/><path d="M72 61l37 37-8 8-12-12-9 9-9-9 9-9-18-18"/>',
 bone: '<path d="M43 48c-27 4-17-24-5-18 2-19 26-12 18 6l32 43c27-4 17 24 5 18-2 19-26 12-18-6z"/>',
 chain: '<path d="M48 44l8-9c19-18 40 7 21 24l-8 8 M62 75l-8 9c-19 18-40-7-21-24l8-8 M53 63l22-23 M88 83l9 9c18 19-7 40-24 21l-9-9 M80 77l-3-3"/>',
 flag: '<path d="M43 111V26 M43 30c17-17 36 17 57 0v43c-21 17-40-17-57 0 M32 111h26"/>',
 pack: '<path d="M42 49c0-26 56-26 56 0v56H42z M56 33V23h28v10 M42 59h56 M55 72h30v23H55z M35 62v31 M105 62v31"/>',
 drum: '<ellipse cx="70" cy="50" rx="35" ry="14"/><path d="M35 50v44c0 19 70 19 70 0V50 M38 61l16 31 16-28 16 28 16-31 M45 22l51 11 M43 30l52-13"/>',
 wheat: '<path d="M69 113V30 M69 84c-24 0-26-14-26-14 24 0 26 14 26 14z M69 68c-24 0-26-14-26-14 24 0 26 14 26 14z M69 52c-20 0-20-16-20-16 20 0 20 16 20 16z M69 92c24 0 26-14 26-14-24 0-26 14-26 14z M69 76c24 0 26-14 26-14-24 0-26 14-26 14z M69 60c20 0 20-16 20-16-20 0-20 16-20 16z"/>',
 eye: '<path d="M27 69c27-38 59-38 86 0-27 38-59 38-86 0z"/><circle cx="70" cy="69" r="17"/><circle cx="70" cy="69" r="5"/>',
};
const motifs = [
 ['scroll','cross'],['drop','bowl'],['grave','coins'],['rope','pack'],['chest','key'],['beam','pack'],['bowl','cross'],['shrine','flame'],['shield','scroll'],['gate','key'],['lamp','drop'],['blade','flame'],['pack','cross'],['raven','scroll'],['cart','grave'],['shield','flame'],['leaf','cross'],['bridge','rope'],['bell','blade'],['scroll','wheat'],
 ['cage','key'],['scroll','eye'],['mask','eye'],['bottle','blade'],['gate','mask'],
 ['grave','scroll'],['bell','grave'],['bone','chain'],['gate','grave'],['lamp','bone'],
 ['chain','flame'],['shrine','flame'],['mask','flame'],['cross','chain'],['scroll','flame'],
 ['flag','shield'],['pack','coins'],['drum','bone'],['wheat','shield'],['eye','rope'], ['chest','coins'],['bottle','cross'],
];
await mkdir('assets/events', { recursive: true });
for (let i = 0; i < EVENTS.length; i++) {
 const event = EVENTS[i], [main, secondary] = motifs[i];
 const tint = { general: '#314137', assassins: '#263d4a', undead: '#403451', demons: '#55392c', orcs: '#3d492a', windfall: '#55492c' }[event.pool];
 const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144"><defs><radialGradient id="bg"><stop stop-color="${tint}"/><stop offset="1" stop-color="#111f28"/></radialGradient><linearGradient id="ink" x2="0.4" y2="1"><stop stop-color="#f4df9d"/><stop offset="1" stop-color="#a08454"/></linearGradient></defs><circle cx="72" cy="72" r="69" fill="url(#bg)" stroke="#8e7851"/><circle cx="72" cy="72" r="63" fill="none" stroke="#9b8653" stroke-opacity=".3" stroke-dasharray="2 5"/><g fill="none" stroke="url(#ink)" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" transform="translate(5 2) scale(.88)">${shapes[main]}</g><circle cx="109" cy="108" r="24" fill="#14242a" stroke="#8e7851"/><g fill="none" stroke="#d3ba7f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" transform="translate(88 87) scale(.3)">${shapes[secondary]}</g></svg>`;
 await writeFile(`assets/events/${event.id}.svg`, art);
}
console.log(`Created ${EVENTS.length} small engraved SVG emblems.`);
