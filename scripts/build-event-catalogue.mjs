import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../VAULTBOUND_EVENTS.md', import.meta.url), 'utf8');
const groups = { G: 'general', A: 'assassins', U: 'undead', D: 'demons', O: 'orcs' };
const events = [...source.matchAll(/^### ([GAUDO]\d\d) · (.+)\n\n(.+?)\n\n- \*\*Compassionate — (.+?)\*\* Favourable: (.+?) \*\*(.+?)\.\*\* Unfavourable: (.+?) \*\*(.+?)\.\*\*\n- \*\*Selfish — (.+?)\*\* Favourable: (.+?) \*\*(.+?)\.\*\* Unfavourable: (.+?) \*\*(.+?)\.\*\*/gm)].map(m => ({
  id: m[1], title: m[2], pool: groups[m[1][0]], description: m[3],
  choices: [{ label: m[4], kind: 'compassionate', good: { text: m[5], effect: m[6] }, bad: { text: m[7], effect: m[8] } },
    { label: m[9], kind: 'selfish', good: { text: m[10], effect: m[11] }, bad: { text: m[12], effect: m[13] } }],
}));
if (events.length !== 40) throw new Error(`Expected 40 events; parsed ${events.length}`);
await writeFile(new URL('../src/event-catalogue.js', import.meta.url), '// Authored in VAULTBOUND_EVENTS.md. Rebuild with node scripts/build-event-catalogue.mjs.\nexport const ENCOUNTERS = ' + JSON.stringify(events, null, 2) + ';\n');
console.log(`Built ${events.length} encounters.`);
