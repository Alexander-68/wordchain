// Dataset loading + game rules. Shared by the browser UI and test.js.

export const MIN_LENGTH = 3;

export const TIERS = ['CORE', 'COMMON', 'FAMILIAR', 'UNCOMMON', 'RARE', 'OBSCURE'];

/**
 * House rule on top of the dataset's `allowed`. The dataset deliberately leaves these
 * calls to the game: a word that a tagged corpus almost always uses as a verb, adjective
 * or name is not played here, even though it has a noun sense ("run", "federal", "bill").
 */
const HOUSE_REJECT = [
  [/usually a verb \(corpus\)/, 'used as a verb, not as a noun'],
  [/usually an adjective \(corpus\)/, 'used as an adjective, not as a noun'],
  [/usually a name \(corpus\)/, 'used as a name, not as a common noun'],
];

/** Minimal RFC4180 CSV reader — the dataset's definitions contain commas and quotes. */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * Index of the SEN dataset:
 *   words   Map word -> { allowed, reason, suggest, tier, tierIdx, definition, end, same }
 *   byStart Map letter -> allowed words starting with it, best (most common) first
 *   variants Map word -> every spelling of it, itself included
 *
 * `same_word_as` points a spelling at the one the dataset treats as the same word ("whisky" ->
 * "whiskey"). Both are playable, but only one of them per chain, so only the word pointed at is
 * offered to the computer and counted in the chain, and playing either marks the whole group
 * used (see `mark`).
 */
export function buildIndex(csvText) {
  const rows = parseCSV(csvText);
  const h = Object.fromEntries(rows[0].map((name, i) => [name, i]));
  const words = new Map(), byStart = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const word = r[h.noun];
    if (!word) continue;
    const house = r[h.allowed] === 'True' && HOUSE_REJECT.find(([re]) => re.test(r[h.marks]));
    const allowed = r[h.allowed] === 'True' && !house;
    const entry = {
      allowed,
      reason: house ? house[1] : r[h.reason],
      suggest: r[h.suggest_instead],
      tier: r[h.tier],
      tierIdx: TIERS.indexOf(r[h.tier]),
      zipf: parseFloat(r[h.zipf]) || 0,
      definition: r[h.definition],
      end: word[word.length - 1],
      same: r[h.same_word_as] || word,
    };
    words.set(word, entry);
    if (allowed && !r[h.same_word_as]) {
      if (!byStart.has(word[0])) byStart.set(word[0], []);
      byStart.get(word[0]).push(word);
    }
  }
  for (const list of byStart.values()) list.sort((a, b) => words.get(b).zipf - words.get(a).zipf);
  const variants = new Map();
  for (const [word, entry] of words) {
    if (!entry.allowed) continue;
    const group = variants.get(entry.same) ?? [];
    variants.set(entry.same, group);
    group.push(word);
  }
  for (const group of [...variants.values()]) for (const w of group) variants.set(w, group);
  return { words, byStart, variants };
}

/** Record a played word — and every other spelling of it, which is now played too. */
export function mark(index, used, word) {
  for (const w of index.variants.get(word) ?? [word]) used.add(w);
  used.add(word);
}

/**
 * Referee. `lastLetter` is null on the opening move.
 * Returns { ok } or { ok: false, reason, suggest }.
 */
export function validate(raw, { index, lastLetter, used }) {
  const word = String(raw).trim().toLowerCase();
  if (!/^[a-z][a-z-]*$/.test(word)) return { ok: false, reason: 'not a word — letters only' };
  if (word.length < MIN_LENGTH) return { ok: false, reason: `too short — ${MIN_LENGTH} letters minimum` };
  if (lastLetter && word[0] !== lastLetter)
    return { ok: false, reason: `must start with "${lastLetter.toUpperCase()}"` };
  if (used.has(word)) return { ok: false, reason: 'already played in this chain' };
  const entry = index.words.get(word);
  if (!entry) return { ok: false, reason: 'not in the noun list' };
  if (!entry.allowed) return { ok: false, reason: entry.reason, suggest: entry.suggest };
  return { ok: true, word, entry };
}

/** Words the computer may play at this level, for a given starting letter. */
function candidates(index, letter, used, maxTierIdx) {
  return (index.byStart.get(letter) || [])
    .filter((w) => w.length >= MIN_LENGTH && !used.has(w) && index.words.get(w).tierIdx <= maxTierIdx);
}

/** True when `a` becomes `b` with one insertion, deletion or substitution. */
function oneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0, j = 0, edits = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (short.length === long.length) i++;
    j++;
  }
  return edits + (long.length - j) <= 1;
}

/**
 * The most common legal word one typo away from what was typed, or null.
 * Used to answer a misspelling with a hint instead of a strike.
 */
export function nearest(index, raw, { lastLetter, used }) {
  const word = String(raw).trim().toLowerCase();
  if (!/^[a-z-]{2,}$/.test(word)) return null;
  const pool = index.byStart.get(lastLetter || word[0]) || [];   // sorted by frequency
  const legal = (w) => w && w.length >= MIN_LENGTH && !used.has(w) && index.words.get(w)?.allowed
    && w[0] === (lastLetter || word[0]);
  // swapped letters first — "tabel" is table, not tael
  for (let i = 0; i < word.length - 1; i++) {
    const swap = word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
    if (swap !== word && legal(swap)) return swap;
  }
  return pool.find((w) => w.length >= MIN_LENGTH && !used.has(w) && oneEdit(word, w)) || null;
}

/** How many legal words are still available for a starting letter. */
export function available(index, lastLetter, used, maxTierIdx = 5) {
  return lastLetter ? candidates(index, lastLetter, used, maxTierIdx).length
    : [...index.byStart.keys()].reduce((n, l) => n + candidates(index, l, used, maxTierIdx).length, 0);
}

/** Of equally good moves, the rarest words — the computer teaches while it plays. */
function richest(index, pool, rng) {
  const best = Math.max(...pool.map((w) => index.words.get(w).tierIdx));
  const top = pool.filter((w) => index.words.get(w).tierIdx === best);
  return top[Math.floor(rng() * top.length)];
}

/**
 * Computer move.
 *   hard   — play the word whose ending leaves the opponent the fewest unused answers
 *   easy   — the opposite: leave the opponent the most
 *   normal — any word from the vocabulary, at random
 * Among moves the strategy rates equally it plays the highest tier available, so the
 * chain keeps showing the human words they may not know yet.
 * The vocabulary limit is the computer's own handicap; when it runs dry at `maxTierIdx`
 * it falls back to the full list rather than resigning. Opponent options are always
 * counted over the full list, minus what has been played.
 * Returns null only when no unused word starts with `lastLetter`.
 */
export function pickMove(index, { lastLetter, used, maxTierIdx = 5, difficulty = 'normal', rng = Math.random }) {
  const at = (tierIdx) => lastLetter
    ? candidates(index, lastLetter, used, tierIdx)
    : [...index.byStart.keys()].flatMap((l) => candidates(index, l, used, tierIdx));
  let pool = at(maxTierIdx);
  // out of vocabulary: widen one tier at a time, so a Common game borrows a familiar word,
  // not an obscure one — OBSCURE alone is a third of the list
  for (let t = maxTierIdx + 1; !pool.length && t <= 5; t++) pool = at(t);
  if (!pool.length) return null;
  if (difficulty === 'normal') return richest(index, pool, rng);

  const replies = new Map(); // end letter -> answers the opponent still has
  const scored = pool.map((w) => {
    const end = index.words.get(w).end;
    if (!replies.has(end)) replies.set(end, candidates(index, end, used, 5).length);
    return { w, score: replies.get(end) };
  });
  const tier = (w) => index.words.get(w).tierIdx;
  scored.sort((a, b) => (difficulty === 'easy' ? b.score - a.score : a.score - b.score)
    || tier(b.w) - tier(a.w));   // equal scores: the rarer word, to teach it
  const top = scored.slice(0, Math.min(5, scored.length));
  return richest(index, top.map((s) => s.w), rng);
}

/**
 * Longest possible chain over the whole word list.
 *
 * A chain is a trail in the multigraph whose 26 nodes are letters and whose edges are
 * words (start letter -> end letter). Longest trail is hard in general, but this graph is
 * nearly Eulerian, so:
 *   1. keep the largest connected clump of letters,
 *   2. delete the fewest edges that leave every letter balanced (in-degree == out-degree),
 *      except one +1 start and one -1 end,
 *   3. Hierholzer walks every remaining edge exactly once.
 * Step 2 is a min-cost flow over the letters (see `deletions`), so the deletions are the
 * fewest possible: the answer is the longest chain the word list allows, up to the one
 * caveat that a deletion can in principle strand a letter, which Hierholzer then skips.
 *
 * `first` pins the opening word: it is taken out of the graph up front and the cutting is
 * told to leave the spare exit on the letter it ends with, so the trail resumes from there.
 * `maxTierIdx` limits the words the chain may use — the vocabulary setting, applied strictly:
 * there is no fall back to the full list here, so a smaller vocabulary means a shorter chain.
 * Returns null when `first` is not a playable word at that vocabulary.
 */
/** Min-cost max-flow, successive shortest paths with SPFA. The graph is 29 nodes wide. */
function mcmf(n) {
  const to = [], cap = [], cost = [], at = Array.from({ length: n }, () => []);
  const add = (u, v, c, w) => {
    at[u].push(to.length); to.push(v); cap.push(c); cost.push(w);
    at[v].push(to.length); to.push(u); cap.push(0); cost.push(-w);
    return to.length - 2;                      // arc and its twin sit next to each other
  };
  const run = (s, t) => {
    for (;;) {
      const dist = new Array(n).fill(Infinity), via = new Array(n).fill(-1), queued = new Array(n).fill(false);
      dist[s] = 0;
      for (const queue = [s]; queue.length; ) {
        const u = queue.shift();
        queued[u] = false;
        for (const e of at[u])
          if (cap[e] > 0 && dist[u] + cost[e] < dist[to[e]]) {
            dist[to[e]] = dist[u] + cost[e];
            via[to[e]] = e;
            if (!queued[to[e]]) { queued[to[e]] = true; queue.push(to[e]); }
          }
      }
      if (dist[t] === Infinity) return;        // no cheaper path left: the flow is maximal
      let push = Infinity;
      for (let v = t; v !== s; v = to[via[v] ^ 1]) push = Math.min(push, cap[via[v]]);
      for (let v = t; v !== s; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
    }
  };
  return { add, run, sent: (e) => cap[e ^ 1] };
}

/**
 * The fewest words to delete so that every letter is left balanced — as many words out as in —
 * except `target`, which keeps one spare exit for the chain to start on.
 *
 * One unit of flow from a letter with a surplus exit to a letter short of one, along an arc per
 * letter pair capped by how many words join them and costing one word per hop. Minimum cost is
 * therefore the minimum number of deleted words, and its decomposition into paths is the deletion
 * itself. The pair of nodes in the middle carries a single free unit: that is the chain's two open
 * ends, the surplus at the start letter and the deficit at the end letter, which cost nothing.
 * Returns a Map of "ab" -> how many words to drop from that letter pair.
 */
function deletions(letters, count, d, target) {
  const id = new Map(letters.map((a, i) => [a, i]));
  const open = letters.length, shut = open + 1, src = open + 2, sink = open + 3;
  const net = mcmf(sink + 1);
  const arcs = [];
  for (const a of letters)
    for (const b of letters)
      if (count(a, b)) arcs.push([a, b, net.add(id.get(a), id.get(b), count(a, b), 1)]);
  for (const a of letters) {
    if (d.get(a) > 0) net.add(src, id.get(a), d.get(a), 0);
    if (d.get(a) < 0) net.add(id.get(a), sink, -d.get(a), 0);
    net.add(open, id.get(a), 1, 0);
  }
  for (const a of target ? [target] : letters) net.add(id.get(a), shut, 1, 0);
  net.add(shut, open, 1, 0);                   // exactly one free unit: the trail's two loose ends
  net.run(src, sink);
  return new Map(arcs.map(([a, b, e]) => [a + b, net.sent(e)]).filter(([, n]) => n));
}

export function longestChain(index, first = null, maxTierIdx = 5) {
  const inTier = (w) => w.length >= MIN_LENGTH && index.words.get(w).tierIdx <= maxTierIdx;
  const adj = new Map();                       // a -> Map(b -> [words])
  const edge = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Map());
    if (!adj.get(a).has(b)) adj.get(a).set(b, []);
    return adj.get(a).get(b);
  };
  for (const [start, list] of index.byStart)
    for (const w of list) if (inTier(w)) edge(start, index.words.get(w).end).push(w);

  let target = null;                           // letter the trail has to start from
  if (first) {
    first = String(first).trim().toLowerCase();
    const entry = index.words.get(first);
    if (!entry?.allowed || !inTier(first)) return null;
    const bundle = adj.get(first[0]).get(entry.end);
    bundle.splice(bundle.indexOf(first), 1);   // the opening word is spent before the walk
    target = entry.end;
  }

  const nodes = new Set(adj.keys());
  for (const outs of adj.values()) for (const b of outs.keys()) nodes.add(b);
  const live = (a, b) => (adj.get(a)?.get(b)?.length ?? 0) > 0;
  const outs = (a) => [...(adj.get(a) ?? new Map())].filter(([, ws]) => ws.length);

  // 1. largest clump, ignoring edge direction — the rest is unreachable from it
  const clump = (from) => {
    const seen = new Set([from]), queue = [from];
    for (const v of queue)
      for (const u of nodes)
        if (!seen.has(u) && (live(v, u) || live(u, v))) { seen.add(u); queue.push(u); }
    return seen;
  };
  let best = new Set();
  const weight = (set) => [...set].reduce((n, a) => n + outs(a).reduce((m, [, ws]) => m + ws.length, 0), 0);
  if (target) best = clump(target);            // a pinned start fixes which clump is reachable
  else for (const v of nodes) if (!best.has(v) && weight(clump(v)) > weight(best)) best = clump(v);
  for (const a of nodes) if (!best.has(a)) adj.delete(a);

  // 2. delete the fewest words that leave the letters balanced — min-cost flow, so this is
  //    the step that makes the chain as long as the word list allows
  const d = new Map([...best].map((a) => [a, 0]));
  for (const a of best)
    for (const [b, ws] of outs(a)) { d.set(a, d.get(a) + ws.length); d.set(b, d.get(b) - ws.length); }
  const letters = [...best];
  const cuts = deletions(letters, (a, b) => adj.get(a)?.get(b)?.length ?? 0, d, target);
  for (const [pair, n] of cuts) {
    const [a, b] = pair;
    for (let i = 0; i < n; i++) { adj.get(a).get(b).pop(); d.set(a, d.get(a) - 1); d.set(b, d.get(b) + 1); }
  }

  // 3. Hierholzer — the trail starts at the one letter with an unmatched exit, else anywhere
  const start = target ?? [...best].find((v) => d.get(v) > 0) ?? [...best].find((v) => outs(v).length);
  if (start === undefined) return [];
  const stack = [start], order = [];
  while (stack.length) {
    const v = stack.at(-1);
    const next = outs(v)[0];
    if (!next) { order.push(stack.pop()); continue; }
    adj.get(v).get(next[0]).pop();
    stack.push(next[0]);
  }
  order.reverse();

  // vertex walk -> the actual words, re-drawn from a fresh copy of each edge's word list
  const pool = new Map();
  for (const [a, list] of index.byStart)
    for (const w of list) if (inTier(w) && w !== first) {
      const k = a + index.words.get(w).end;
      (pool.get(k) ?? pool.set(k, []).get(k)).push(w);
    }
  const chain = order.slice(1).map((b, i) => pool.get(order[i] + b).pop());
  return first ? [first, ...chain] : chain;
}
