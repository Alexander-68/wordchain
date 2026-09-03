// Self-check: node test.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex, validate, pickMove, nearest, longestChain, mark } from './public/rules.js';

const index = buildIndex(readFileSync('data/sen-2026-09-03.csv', 'utf8'));
const used = new Set(['dog']);
const at = (lastLetter) => ({ index, lastLetter, used });

assert.equal(validate('cat', at(null)).ok, true);
assert.equal(validate('goose', at('g')).ok, true);
assert.equal(validate('goose', at('x')).reason, 'must start with "X"');
assert.equal(validate('dog', at('d')).reason, 'already played in this chain');
assert.equal(validate('zzzqx', at('z')).reason, 'not in the noun list');
assert.equal(validate('  CAT  ', at('c')).ok, true);           // trimmed + lowercased
assert.equal(validate('cat!', at('c')).ok, false);             // letters only
assert.equal(validate('ox', at('o')).reason, 'too short — 3 letters minimum');
assert.equal(validate('colour', at('c')).suggest, 'color');    // UK spelling -> US
assert.equal(validate('run', at('r')).ok, false);              // verb, not a noun
assert.equal(validate('happy', at('h')).ok, false);            // adjective

// spelling variants are one word: either is playable, but only once per chain
assert.equal(validate('whisky', at('w')).ok, true);
assert.equal(validate('whiskey', at('w')).ok, true);
const spelt = new Set();
mark(index, spelt, 'whiskey');
assert.equal(validate('whisky', { index, lastLetter: 'w', used: spelt }).reason, 'already played in this chain');
const spelt2 = new Set();
mark(index, spelt2, 'whisky');
assert.equal(validate('whiskey', { index, lastLetter: 'w', used: spelt2 }).reason, 'already played in this chain');
// only the word pointed at is offered to the computer, so a chain can never hold both
assert.ok(!index.byStart.get('w').includes('whisky'));
assert.ok(index.byStart.get('w').includes('whiskey'));

// a typo answers with the word meant, not a strike
const near = (word, lastLetter) => nearest(index, word, { lastLetter, used });
assert.equal(near('tabel', 't'), 'table');       // transposition beats a one-edit match
assert.equal(near('hosue', 'h'), 'house');
assert.equal(near('bananna', 'b'), 'banana');    // doubled letter
assert.equal(near('zzzqx', 'z'), null);          // nothing close enough
assert.equal(near('cat', 'x'), null);            // wrong starting letter gets no hint

for (const difficulty of ['easy', 'normal', 'hard']) {
  const w = pickMove(index, { lastLetter: 'a', used, maxTierIdx: 2, difficulty });
  assert.equal(w[0], 'a');
  assert.equal(index.words.get(w).allowed, true);
  assert.ok(index.words.get(w).tierIdx <= 2, `${difficulty} stayed in vocabulary`);
  assert.ok(w.length >= 3, `${difficulty} respected the 3-letter minimum`);
}
// among equally good moves it teaches: the rarest tier available wins
const poolB = (max) => index.byStart.get('b')
  .filter((w) => w.length >= 3 && !used.has(w) && index.words.get(w).tierIdx <= max);
assert.equal(index.words.get(pickMove(index, { lastLetter: 'b', used, maxTierIdx: 2 })).tierIdx,
  Math.max(...poolB(2).map((w) => index.words.get(w).tierIdx)), 'normal reached for the rarer word');
for (const difficulty of ['easy', 'hard']) {
  const w = pickMove(index, { lastLetter: 'b', used, maxTierIdx: 2, difficulty });
  const tied = poolB(2).filter((x) => x.at(-1) === w.at(-1));   // same ending = same score
  assert.equal(index.words.get(w).tierIdx, Math.max(...tied.map((x) => index.words.get(x).tierIdx)),
    `${difficulty} broke the tie towards the rarer word`);
}

// easy leaves the opponent more options than hard
const options = (w) => index.byStart.get(w.at(-1)).length;
const easy = pickMove(index, { lastLetter: 'a', used, maxTierIdx: 5, difficulty: 'easy' });
const hard = pickMove(index, { lastLetter: 'a', used, maxTierIdx: 5, difficulty: 'hard' });
assert.ok(options(easy) > options(hard), 'easy should be kinder than hard');

// out of vocabulary words -> fall back to a higher tier instead of resigning
const commonA = new Set(index.byStart.get('a').filter((w) => index.words.get(w).tierIdx <= 1));
const fallback = pickMove(index, { lastLetter: 'a', used: commonA, maxTierIdx: 1 });
assert.ok(fallback && !commonA.has(fallback) && fallback[0] === 'a');
assert.equal(index.words.get(fallback).tierIdx, 2, 'fallback widened by one tier, not to the obscure tail');

// nothing left at all -> resign
assert.equal(pickMove(index, { lastLetter: 'a', used: new Set(index.byStart.get('a')) }), null);

// a full computer-vs-computer game terminates and never repeats a word
const seen = new Set();
let letter = null, turns = 0;
for (; turns < 500; turns++) {
  const move = pickMove(index, { lastLetter: letter, used: seen, maxTierIdx: 5 });
  if (!move) break;
  assert.equal(validate(move, { index, lastLetter: letter, used: seen }).ok, true);
  seen.add(move);
  letter = move.at(-1);
}
assert.ok(turns > 3, 'game should last more than a few moves');

// the longest chain: every word legal, unused, and linked to the one before
const long = longestChain(index);
const chained = new Set();
for (let i = 0; i < long.length; i++) {
  assert.equal(validate(long[i], { index, lastLetter: i ? long[i - 1].at(-1) : null, used: chained }).ok, true,
    `word ${i} of the longest chain is playable`);
  chained.add(long[i]);
}
assert.ok(long.length > 22600, `longest chain should be ~22.7k words, got ${long.length}`);

// a pinned opening word is honoured, and the rest of the chain is still legal
const pinned = longestChain(index, 'music');
assert.equal(pinned[0], 'music');
const after = new Set();
for (let i = 0; i < pinned.length; i++) {
  assert.equal(validate(pinned[i], { index, lastLetter: i ? pinned[i - 1].at(-1) : null, used: after }).ok, true,
    `word ${i} of the pinned chain is playable`);
  after.add(pinned[i]);
}
assert.ok(pinned.length > 22600, `pinned chain should be ~22.7k words, got ${pinned.length}`);
// the vocabulary setting bounds the chain strictly — no borrowing from the full list
const common = longestChain(index, null, 1);
const usedC = new Set();
for (let i = 0; i < common.length; i++) {
  assert.ok(index.words.get(common[i]).tierIdx <= 1, `word ${i} stayed in the Common vocabulary`);
  assert.equal(validate(common[i], { index, lastLetter: i ? common[i - 1].at(-1) : null, used: usedC }).ok, true);
  usedC.add(common[i]);
}
assert.ok(common.length < long.length, 'a smaller vocabulary gives a shorter chain');
assert.equal(longestChain(index, 'abbey', 1), null);   // pinned word outside the vocabulary

assert.equal(longestChain(index, 'zzzqx'), null);      // not a word
assert.equal(longestChain(index, 'run'), null);        // a verb
assert.equal(longestChain(index, 'ox'), null);         // under the 3-letter minimum

console.log(`longest chain: ${long.length} words, ${pinned.length} from "music", ${common.length} in Common`);
console.log(`ok — ${turns} move self-play, ${seen.size} unique words`);
