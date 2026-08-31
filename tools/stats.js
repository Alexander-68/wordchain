// Recomputes every number the README and ABOUT.md quote about the word list.
// Run after dropping in a new SEN dataset:  node tools/stats.js
// It prints a markdown report; paste the numbers back into the docs.
import { readFileSync, statSync } from 'node:fs';
import { parseCSV, buildIndex, longestChain, MIN_LENGTH, TIERS } from '../public/rules.js';

const file = process.argv[2] ?? `data/${readFileSync('public/game.js', 'utf8').match(/DATA = '([^']+)'/)[1]}`;
const csv = readFileSync(file, 'utf8');
const rows = parseCSV(csv);
const h = Object.fromEntries(rows[0].map((name, i) => [name, i]));
const data = rows.slice(1).filter((r) => r[h.noun]);
const index = buildIndex(csv);

const n = (x) => x.toLocaleString('en-US');
const tally = (items, key) => {
  const m = new Map();
  for (const it of items) { const k = key(it); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]);
};
const list = (pairs, k = 5) => pairs.slice(0, k).map(([v, c]) => `${v} ${n(c)}`).join(' · ');

// --- the funnel: rows -> allowed -> house rules -> length -> playable
const allowedInCsv = data.filter((r) => r[h.allowed] === 'True').length;
const houseCut = data.filter((r) => r[h.allowed] === 'True' && !index.words.get(r[h.noun]).allowed).length;
const playable = [...index.byStart.values()].flat().filter((w) => w.length >= MIN_LENGTH);
const shortCut = allowedInCsv - houseCut - playable.length;

console.log(`# ${file}  (${(statSync(file).size / 1e6).toFixed(1)} MB)\n`);
console.log(`${n(data.length)} rows in, ${n(allowedInCsv)} marked allowed=True. House rules take out ${n(houseCut)} more,`);
console.log(`the ${MIN_LENGTH}-letter minimum another ${n(shortCut)}, leaving **${n(playable.length)} playable words**.\n`);

// --- tiers, cumulative
let cum = 0;
console.log('| tier | words | cumulative |\n| --- | --- | --- |');
for (const t of TIERS) {
  const c = playable.filter((w) => index.words.get(w).tier === t).length;
  cum += c;
  console.log(`| ${t} | ${n(c)} | ${n(cum)} |`);
}

// --- why words are rejected
const rejected = data.filter((r) => r[h.allowed] !== 'True');
console.log(`\nRejected rows: ${n(rejected.length)} — ${list(tally(rejected, (r) => r[h.reason]), 8)}`);
const houseRows = data.filter((r) => r[h.allowed] === 'True' && !index.words.get(r[h.noun]).allowed);
console.log(`House-rule rejects: ${n(houseCut)} — ${list(tally(houseRows, (r) => index.words.get(r[h.noun]).reason), 3)}`);

// --- shape: length, frequency, letters
const byLen = tally(playable, (w) => Math.min(w.length, 14));
const [peakLen, peakCount] = byLen[0];
console.log(`\nLength ${MIN_LENGTH}–14+, peaking at ${peakLen} (${n(peakCount)} words); ${MIN_LENGTH}-letter words: `
  + n(byLen.find(([l]) => l === MIN_LENGTH)[1]));
const zipf = playable.reduce((s, w) => s + index.words.get(w).zipf, 0) / playable.length;
console.log(`Mean Zipf frequency ${zipf.toFixed(2)}`);
const starts = tally(playable, (w) => w[0]), ends = tally(playable, (w) => index.words.get(w).end);
const bottom = (pairs) => pairs.slice(-5).reverse().map(([v, c]) => `${v} ${n(c)}`).join(' · ');
console.log(`starts | ${list(starts)} | ${bottom(starts)}`);
console.log(`ends   | ${list(ends)} | ${bottom(ends)}`);
const at = (pairs, l) => pairs.find(([v]) => v === l)?.[1] ?? 0;
for (const l of ['c', 'e'])
  console.log(`  ${l}: ${n(at(starts, l))} start with it, ${n(at(ends, l))} end with it`);

// --- longest chain per vocabulary setting, and the optimality bound
console.log('\n| vocabulary | words in the chain | runs |\n| --- | --- | --- |');
for (const [label, tier] of [['Common', 1], ['Familiar', 2], ['Expert', 4], ['Insane', 5]]) {
  const chain = longestChain(index, null, tier);
  console.log(`| ${label} | ${n(chain.length)} | ${chain[0]} → ${chain.at(-1)} |`);
}
const surplus = [...starts].reduce((s, [l, out]) => s + Math.max(0, out - at(ends, l)), 0);
const full = longestChain(index, null, 5).length;
console.log(`\nSurpluses sum to ${n(surplus)}, so the counting bound is ${n(playable.length)} − ${n(surplus - 1)}`
  + ` = **${n(playable.length - surplus + 1)}**; the flow's minimum is ${n(playable.length - full)} deletions,`
  + ` and ${n(playable.length)} − ${n(playable.length - full)} = ${n(full)} is the answer.`);
console.log('Pinned openings: ' + ['cat', 'music', 'zebra', 'xylophone']
  .map((w) => `${w} ${n(longestChain(index, w, 5).length)}`).join(' · '));
