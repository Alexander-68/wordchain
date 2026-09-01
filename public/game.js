import { buildIndex, validate, pickMove, available, nearest, longestChain, TIERS, MIN_LENGTH } from './rules.js';

const $ = (id) => document.getElementById(id);
const DATA = 'sen-2026-09-01.csv';                 // the word list; its date is the SEN version
const MODES = {
  hh: ['Player 1', 'Player 2'],
  hc: ['You', 'Computer'],
  cc: ['Computer 1', 'Computer 2'],
  cl: ['Computer', 'LLM'],
};

let index, mode = 'hc', maxTierIdx = 2, difficulty = 'normal', game;

const chosen = (box) => $(box).querySelector('.is-on').firstChild.textContent.trim();

const state = () => ({ index, lastLetter: game.chain.at(-1)?.at(-1) ?? null, used: game.used });
const isComp = (i) => mode === 'cc' || (mode === 'hc' && i === 1) || (mode === 'cl' && i === 0);
const isLLM = (i) => mode === 'cl' && i === 1;

function say(text, cls = '') {
  if (!text) return;
  const line = document.createElement('p');
  line.className = 'msg ' + cls;
  line.textContent = text;
  $('log').append(line);
  $('log').scrollTop = $('log').scrollHeight;
}

const showCount = () =>
  ($('count').textContent = `${game.chain.length.toLocaleString()} word${game.chain.length === 1 ? '' : 's'}`);

function render() {
  const shown = Math.max(0, game.chain.length - 400);
  $('chain').innerHTML = game.chain.slice(shown)
    .map((w, i) => `<li tabindex="0" data-i="${i + shown}">${w.slice(0, -1)}<b>${w.at(-1)}</b></li>`).join('');
  hideTip();
  $('chain').lastElementChild?.scrollIntoView({ block: 'nearest' });
  showCount();
  const letter = game.chain.length ? game.chain.at(-1).at(-1) : null;
  $('letter').textContent = letter || '?';
  const left = available(index, letter, game.used);
  $('avail').textContent = left.toLocaleString();
  $('avail').title = `${left.toLocaleString()} unplayed words start with this letter`;
  $('hint').classList.toggle('is-hint', canHint());
  // the player who opens sits on the left, so the board reads in play order
  seats().forEach((i, slot) => {
    const el = $('p' + slot);
    el.querySelector('.name').textContent = MODES[mode][i];
    const dots = el.querySelector('.strikes');
    dots.innerHTML = '<i></i><i></i><i></i>';
    [...dots.children].forEach((d, n) => d.classList.toggle('on', n < game.strikes[i]));
    dots.title = `${game.strikes[i]} of 3 strikes`;
    el.classList.toggle('is-turn', !game.over && i === game.turn);
    el.classList.toggle('is-out', game.over && game.loser === i);
  });
  const human = !game.over && !isComp(game.turn) && !isLLM(game.turn);
  const auto = mode === 'cc' || mode === 'cl';
  // the row keeps its shape while the computer thinks — controls dim instead of moving
  $('play').hidden = game.over;
  $('word').hidden = $('submit').hidden = auto;
  $('word').disabled = $('submit').disabled = !human && !auto;
  $('pause').disabled = game.ff || (!human && !auto);
  $('resign').disabled = !game.ff && !human && !auto;   // during a fast-forward it is the stop button
  $('word').placeholder = human ? 'your noun (3+ letters)' : 'thinking…';
  $('pause').hidden = !auto;
  $('pause').textContent = game.paused ? 'Play' : 'Pause';
  $('resign').textContent = game.ff ? 'Stop' : mode === 'cc' ? 'Fast-forward' : auto ? 'Stop game' : 'I lose';
  $('again').hidden = !game.over;
  if (human) $('word').focus();
}

/** The opener plays chain word 0, and from there the turn alternates. */
const seats = () => (game?.opener ? [1, 0] : [0, 1]);
const playedBy = (i) => MODES[mode][(game.opener + i) % 2];
const describe = (word, i) =>
  `${playedBy(i)} played "${word}" — ${index.words.get(word)?.definition || 'no definition'}`;

const hideTip = () => ($('tip').hidden = true);

function showTip(anchor, text) {
  const tip = $('tip');
  tip.textContent = text;
  tip.hidden = false;
  const pill = anchor.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  const below = pill.bottom + 8 + box.height < innerHeight;
  tip.style.top = `${below ? pill.bottom + 8 : pill.top - box.height - 8}px`;
  tip.style.left = `${Math.max(8, Math.min(pill.left, innerWidth - box.width - 8))}px`;
}

for (const ev of ['pointerover', 'click', 'focusin']) {
  $('chain').addEventListener(ev, (e) => {
    const li = e.target.closest('li');
    if (li) showTip(li, describe(game.chain[+li.dataset.i], +li.dataset.i));
  });
}
for (const ev of ['pointerleave', 'focusout']) $('chain').addEventListener(ev, hideTip);
$('chain').addEventListener('scroll', hideTip);
addEventListener('pointerdown', (e) => !e.target.closest('#chain') && hideTip());

// the setup buttons explain themselves in the same tooltip: word counts, strategies
for (const box of ['level', 'difficulty']) {
  for (const ev of ['pointerover', 'focusin']) $(box).addEventListener(ev, (e) => {
    const btn = e.target.closest('.opt');
    if (btn?.dataset.tip) showTip(btn, btn.dataset.tip);
  });
  for (const ev of ['pointerleave', 'focusout']) $(box).addEventListener(ev, hideTip);
}

// three hints per game, human vs computer only: the letter pill becomes a button
const canHint = () => mode === 'hc' && !game.over && game.turn === 0 && game.hints > 0;

const hintTip = () => canHint()
  ? `Click to get a hint — ${game.hints} hint${game.hints === 1 ? '' : 's'} left.`
  : (mode === 'hc' && !game.over && game.turn === 0 ? 'No hints left. ' : '')
    + `${available(index, game.chain.at(-1)?.at(-1) ?? null, game.used).toLocaleString()} unplayed words start with this letter.`;

for (const ev of ['pointerover', 'focusin']) $('hint').addEventListener(ev, () => showTip($('hint'), hintTip()));
for (const ev of ['pointerleave', 'focusout']) $('hint').addEventListener(ev, hideTip);

$('hint').addEventListener('click', () => {
  if (!canHint()) return;
  const word = pickMove(index, { ...state(), maxTierIdx, difficulty: 'hard' });
  if (!word) return say('No hint available — no unplayed word starts with this letter.', 'warn');
  game.hints--;
  $('word').value = word;
  say(`Hint: "${word}". ${game.hints} hint${game.hints === 1 ? '' : 's'} left.`, 'warn');
  render();
  showTip($('hint'), hintTip());
});

function end(loser, why) {
  if (game.over) return;
  inflight?.abort();                        // stop paying for a move nobody will play
  setBusy(null);
  game.over = true;
  game.loser = loser;
  say(`${MODES[mode][loser]} loses — ${why}. ${MODES[mode][1 - loser]} wins with ${game.chain.length} words.`, 'big');
  render();
}

function accept(word) {
  game.chain.push(word);
  game.used.add(word);
  game.strikes[game.turn] = 0;
  game.lastReject = null;
  game.turn = 1 - game.turn;
  render();
  schedule();
}

// ---- "thinking" badge: one seat at a time, counting up or counting down ----
let busy = null, busyTimer = 0;             // { i, since } while working, { i, until } while waiting out a gap

function setBusy(next) {
  busy = next;
  clearInterval(busyTimer);
  busyTimer = next ? setInterval(paintBusy, 100) : 0;
  paintBusy();
}

function paintBusy() {
  if (!game) return;
  seats().forEach((i, slot) => {
    const el = $('p' + slot).querySelector('.think');
    const on = busy && busy.i === i && !game.over && !game.paused;
    el.hidden = !on;
    if (on) el.textContent = busy.until
      ? `${Math.max(0, Math.ceil((busy.until - Date.now()) / 1000))}s`
      : `${((Date.now() - busy.since) / 1000).toFixed(1)}s`;
  });
}

/** Hand the turn to the computer, unless a computer-vs-computer game is paused. */
function schedule() {
  setBusy(null);
  if (game.paused || game.over) return;
  if (isComp(game.turn)) {
    // the LLM's pacing gap is dead time either way — spend it on the computer's move instead,
    // so the wait shows as the computer thinking and the LLM can ask the moment its turn opens
    const wait = Math.max(700, mode === 'cl' ? nextAt - Date.now() : 0);
    setBusy({ i: game.turn, until: Date.now() + wait });
    setTimeout(computerTurn, wait);
  } else if (isLLM(game.turn)) {
    setBusy({ i: game.turn, since: Date.now() });
    setTimeout(llmTurn, 200);
  }
}

function reject(reason) {
  const i = game.turn;
  game.strikes[i]++;
  say(`Rejected: ${reason}. Strike ${game.strikes[i]} of 3.`, 'bad');
  if (game.strikes[i] >= 3) return end(i, 'three rejected words in a row');
  render();
  schedule();
}

function computerTurn() {
  if (game.over || game.paused) return;
  const word = pickMove(index, { ...state(), maxTierIdx, difficulty });
  if (!word) return end(game.turn, 'no word found');
  say(describe(word, game.chain.length), 'good');
  accept(word);
}

$('play').addEventListener('submit', (e) => {
  e.preventDefault();
  const typed = $('word').value.trim();
  if (!typed) return;
  const res = validate(typed, state());
  $('word').value = '';
  if (res.ok) {
    say(describe(res.word, game.chain.length), 'good');
    return accept(res.word);
  }
  // a misspelling, a typo or a British spelling costs nothing — it gets the right word back
  const hint = res.suggest || nearest(index, typed, state());
  if (hint) {
    say(`${res.reason} — did you mean "${hint}"? Play it, no strike.`, 'warn');
    $('word').value = hint;
    return render();
  }
  reject(res.reason);
});

$('pause').addEventListener('click', () => {
  game.paused = !game.paused;
  say(game.paused ? 'Paused.' : 'Resumed.');
  render();
  schedule();
});

$('resign').addEventListener('click', () => {
  if (game.over) return;
  if (game.ff) return (game.ff = false);        // stop fast-forwarding, play on from here
  if (mode === 'cc') return fastForward();
  end(game.turn, mode === 'cl' ? 'the game was stopped' : 'gave up');
});

// ---- LLM player: any OpenAI-compatible /chat/completions endpoint ----------

const llm = JSON.parse(localStorage.getItem('llm') || 'null') || {};
let llmFirst = false;        // fairness option: let the LLM play the opening word
let effort = llm.effort || 'medium';   // reasoning_effort, the one knob most providers agree on
const RULES = `You are a player in WordChain. Rules:
- Each word must be a single common English noun, singular, at least 3 letters, letters only.
- Your word must start with the last letter of the previous word.
- No word may be played twice in a game.
Reply with ONE word and nothing else. If you cannot find a word, reply exactly: I lose.
Never explain, never apologise, never add punctuation or quotes.

Your opponent is a strong engine. It picks the word whose last letter leaves you the
fewest answers, so it will keep handing you Y, X, Z, K, U, J and the like until you run
out. An obvious word such as "table" gives it a free "e" and hands it the initiative.
Play the same way: prefer a word that ends on a scarce letter, keep a few of your own
answers to those letters in reserve, and do not spend them on an easy ending.`;

/** Some providers return content as an array of parts, not a string. */
const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((p) => p?.text || '').join('') : '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The provider's shared pool throttles us every few words, so pace the calls: widen the
// gap between requests whenever we are refused, and let it decay back while we are not.
let gap = 0, nextAt = 0;
const widen = (ms) => { gap = Math.min(Math.max(ms, gap * 2, 1500), 30000); };

let inflight = null;         // the LLM request in flight, so ending the game can drop it
let lastReasoning = 0;       // reasoning tokens the last reply burned, when the provider reports them

async function ask(messages, max_tokens = 4096, signal) {
  const url = `${llm.url.replace(/\/+$/, '')}/chat/completions`;
  const req = { model: llm.model, messages, max_tokens, temperature: 0.7 };
  if (effort !== 'auto') req.reasoning_effort = effort;
  // 429 here is usually the provider's shared pool, not our quota — it clears in a second or two
  for (let attempt = 0; ; attempt++) {
    if (game && !game.over && nextAt > Date.now()) setBusy({ i: game.turn, until: nextAt });
    await sleep(Math.max(0, nextAt - Date.now()));
    nextAt = Date.now() + gap;
    if (game && !game.over) setBusy({ i: game.turn, since: Date.now() });
    console.log('[llm] request', url, req, gap ? `(gap ${gap}ms)` : '');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.key}` },
      body: JSON.stringify(req),
      signal,
    });
    const raw = await res.text();
    const body = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
    // a reasoning model's encrypted blob is kilobytes of nothing to read — log the rest
    console.log('[llm] response', res.status, Object.fromEntries(res.headers),
      raw.replace(/"data":"[^"]*"/g, '"data":"<encrypted>"'));
    // OpenRouter reports an upstream failure as HTTP 200 with an error body, so trust the body first
    const code = body.error?.code || res.status;
    if (code === 429 || code === 502 || code === 503) {
      widen(Number(res.headers.get('retry-after')) * 1000 || 0);
      if (attempt < 6) {
        console.log(`[llm] ${code}, gap now ${gap}ms, retrying`);
        say(`${code === 429 ? 'Rate-limited' : 'Upstream busy'} — waiting ${Math.round(gap / 1000)}s…`);
        nextAt = Date.now() + gap;
        if (game && !game.over) setBusy({ i: game.turn, until: nextAt });
        continue;
      }
    }
    // not every gateway knows reasoning_effort — drop it and ask again rather than lose the turn
    if (code === 400 && 'reasoning_effort' in req && /reasoning|effort|parameter|unknown|unsupported/i.test(raw)) {
      delete req.reasoning_effort;
      console.log('[llm] provider rejected reasoning_effort, retrying without it');
      continue;
    }
    // every good call takes a bite out of the gap, so a settled pace keeps creeping faster
    // until the pool refuses again — the refusal is the only signal we get about the limit
    if (res.ok && !body.error) gap = gap < 400 ? 0 : Math.round(gap * 0.7);
    if (!res.ok || body.error)
      throw new Error(`${body.error?.message || raw.slice(0, 200) || 'no body'} (${code})`);
    lastReasoning = body.usage?.completion_tokens_details?.reasoning_tokens || 0;
    const choice = body.choices?.[0] || {};
    const text = textOf(choice.message?.content).trim();
    // a reasoning model can spend the whole budget thinking and hand back empty content —
    // that is overthinking, not a lost game, so buy it more room and ask once more
    if (!text) {
      if (choice.finish_reason === 'length' && req.max_tokens < 32768) {
        req.max_tokens *= 2;
        say(`It spent the whole budget thinking — retrying with ${req.max_tokens} tokens.`, 'warn');
        continue;
      }
      throw new Error(`empty reply (finish_reason: ${choice.finish_reason || 'none'})`);
    }
    return text;
  }
}

function prompt() {
  const last = game.chain.at(-1);
  // a rejected word is only useful to the model if it hears why, and what a third strike costs
  const strikes = game.strikes[1];
  const feedback = game.lastReject
    ? `\nYour last answer "${game.lastReject.word}" was rejected: ${game.lastReject.reason}.`
      + ` That is strike ${strikes} of 3 — ${3 - strikes} more and you lose. Answer with a different word.`
    : '';
  if (!last) return [{ role: 'system', content: RULES },
    { role: 'user', content: 'You open the game. Play any singular English noun of 3 or more letters.' + feedback }];
  // only words starting with the letter it must play can collide, so the rest is dead prompt weight
  const letter = last.at(-1);
  const taken = game.chain.filter((w) => w[0] === letter);
  return [
    { role: 'system', content: RULES },
    { role: 'user', content: `Previous word: "${last}". Your word must start with "${letter}".`
      + (taken.length ? `\nAlready played, do not repeat: ${taken.join(', ')}` : '') + feedback },
  ];
}

async function llmTurn() {
  if (game.over || game.paused || !isLLM(game.turn)) return;
  const turnId = game.chain.length + ':' + game.strikes[1];
  let reply;
  inflight = new AbortController();
  try {
    reply = await ask(prompt(), 4096, inflight.signal);
  } catch (e) {
    if (game.over) return;                  // the game was stopped under us; the abort is not a loss
    return end(1, `the API call failed: ${e.message}`);
  } finally {
    inflight = null;
  }
  if (game.over || game.paused || turnId !== game.chain.length + ':' + game.strikes[1]) return;
  if (/^i lose\b/i.test(reply)) return end(1, 'it gave up');
  const word = (reply.toLowerCase().match(/[a-z][a-z'-]*/) || [''])[0];
  const res = validate(word, state());
  if (!res.ok) {
    game.lastReject = { word: reply, reason: res.reason };
    return reject(`"${reply}" — ${res.reason}`);
  }
  say(describe(res.word, game.chain.length) + (lastReasoning ? `. Reasoning tokens: ${lastReasoning}` : ''), 'good');
  accept(res.word);
}

$('llmtest').addEventListener('click', async () => {
  readLLM();
  $('llmout').textContent = 'Testing…';
  try {
    const reply = await ask([{ role: 'user', content: 'Reply with the word: ok' }]);
    $('llmout').textContent = `Works — the model replied "${reply}".`;
  } catch (e) {
    $('llmout').textContent = `Failed: ${e.message}`;
  }
});

function readLLM() {
  Object.assign(llm, { url: $('llmurl').value.trim(), model: $('llmmodel').value.trim(), key: $('llmkey').value.trim(), effort });
  localStorage.setItem('llm', JSON.stringify(llm));
}

for (const [id, first] of [['llmplay', false], ['llmplayfirst', true]])
  $(id).addEventListener('click', () => {
    readLLM();
    if (!llm.url || !llm.model || !llm.key) return ($('llmout').textContent = 'Fill in URL, model and key.');
    llmFirst = first;
    $('llmbox').close();
    begin();
  });

/** Play out the rest of a computer game — no move delay, no per-move log, count ticking. */
function fastForward() {
  const from = game.chain.length;
  game.paused = game.ff = true;             // keep any pending turn from replaying a move
  let guard = 20000;
  const done = (why) => {
    game.paused = game.ff = false;
    say(`Fast-forwarded ${(game.chain.length - from).toLocaleString()} moves${why ? '' : ' — still going'}.`);
    if (why) return end(game.turn, why);
    render();
    schedule();
  };
  const step = () => {
    if (!game.ff) return done('');            // Stop was tapped — keep the chain, hand the turn back
    const until = performance.now() + 8;      // one frame's worth of moves, then paint the count
    while (guard > 0 && performance.now() < until) {
      guard--;
      const word = pickMove(index, { ...state(), maxTierIdx, difficulty });
      if (!word) return done('no word found');
      game.chain.push(word);
      game.used.add(word);
      game.turn = 1 - game.turn;
    }
    showCount();
    guard > 0 ? setTimeout(step) : done('');   // a task, not a frame: keeps running in a hidden tab
  };
  render();
  setTimeout(step);
}

const wordsFromInput = (text) => text.toLowerCase().match(/[a-z][a-z'-]*/g) || [];
// a file is one word per line: whatever follows the first separator is a definition, a count, a note
const wordsFromFile = (text) =>
  text.split(/\r?\n/).map((line) => wordsFromInput(line)[0]).filter(Boolean);

/** Many words at once: how many are known, how many playable, which ones are missing. */
function checkList(words, out) {
  const unique = [...new Set(words)];
  const absent = [], unplayable = [];
  for (const word of unique) {
    const entry = index.words.get(word);
    if (!entry) absent.push(word);
    else if (!entry.allowed || word.length < MIN_LENGTH) unplayable.push(word);
  }
  $(out).textContent =
    `${unique.length.toLocaleString()} word${unique.length === 1 ? '' : 's'} checked`
    + `${words.length > unique.length ? ` (${words.length.toLocaleString()} read, duplicates dropped)` : ''} — `
    + `${(unique.length - absent.length).toLocaleString()} in the word list, `
    + `${(unique.length - absent.length - unplayable.length).toLocaleString()} playable, `
    + `${absent.length.toLocaleString()} absent.`
    + (absent.length ? `\nAbsent: ${absent.join(', ')}` : '');
}

/** Look a word up: is it in the list, what does it mean, may it be played. */
function checkOne(word) {
  const entry = index.words.get(word);
  if (!entry) {
    const hint = nearest(index, word, { lastLetter: null, used: new Set() });
    const singular = [word.replace(/ies$/, 'y'), word.replace(/(ch|sh|s|x|z)es$/, '$1'), word.replace(/s$/, '')]
      .find((w) => w !== word && index.words.get(w));
    $('checkout').textContent = `"${word}" is not in the word list.`
      + (singular ? ` It looks like the plural of "${singular}" — the list holds singular nouns only.`
        : hint ? ` Probably a misspelling — did you mean "${hint}"?`
        : ` The list holds singular common English nouns, so it is probably not a noun`
          + ` (an adjective, verb, adverb or pronoun), a proper name or a word derived from one ("american"),`
          + ` or a plural form or spelling the list does not carry.`);
    return;
  }
  const why = word.length < MIN_LENGTH ? `shorter than ${MIN_LENGTH} letters`
    : !entry.allowed ? entry.reason
    : null;
  $('checkout').textContent = `"${word}" — ${entry.definition || 'no definition'}`
    + `\n[${TIERS[entry.tierIdx].toLowerCase()}] `
    + (why ? `Not playable: ${why}.` : 'Playable.')
    + (!why && entry.tierIdx > maxTierIdx ? ` Outside the ${chosen('level')} vocabulary, so the computer never plays it.` : '');
}

$('check').addEventListener('click', () => {
  const words = wordsFromInput($('checkword').value);
  if (!words.length) return ($('checkout').textContent = '');
  words.length === 1 ? checkOne(words[0]) : checkList(words, 'checkout');
});

$('checkfilebtn').addEventListener('click', async () => {
  const file = $('checkfile').files[0];
  if (!file) return ($('filecheckout').textContent = 'Pick a text file first.');
  const words = wordsFromFile(await file.text());
  $('filecheckout').textContent = words.length ? 'Checking…' : 'No words found in that file.';
  if (words.length) checkList(words, 'filecheckout');
});
$('checkword').addEventListener('keydown', (e) => e.key === 'Enter' && $('check').click());

// the × in each field wipes the field and the report under it
for (const btn of document.querySelectorAll('.clear')) btn.addEventListener('click', () => {
  const field = $(btn.dataset.clear);
  field.value = '';
  $(field.type === 'file' ? 'filecheckout' : 'checkout').textContent = '';
  if (field.type !== 'file') field.focus();
});

/** The longest chain the word list allows, from a chosen word or from wherever it runs longest. */
$('solve').addEventListener('click', () => {
  const first = $('startword').value.trim().toLowerCase();
  const entry = first ? index.words.get(first) : null;
  if (first && (!entry?.allowed || first.length < 3)) {
    $('solveout').textContent = `"${first}" cannot open a chain — pick a playable noun, or leave it blank.`;
    return;
  }
  if (entry && entry.tierIdx > maxTierIdx) {
    $('solveout').textContent = `"${first}" is outside the ${chosen('level')} vocabulary — widen it, or pick another noun.`;
    return;
  }
  $('solve').disabled = true;
  $('solve').textContent = 'Building…';
  setTimeout(() => {                                  // let the button repaint before the walk
    const chain = longestChain(index, first || null, maxTierIdx);   // the vocabulary setting, no fallback
    $('solveout').textContent =
      `${chain.length.toLocaleString()} words in the ${chosen('level')} vocabulary, ${chain[0]} → ${chain.at(-1)} — `;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([chain.join('\n') + '\n'], { type: 'text/plain' }));
    link.download = `wordchain-${chain[0]}-${chain.length}.txt`;
    link.textContent = 'download';
    $('solveout').append(link);
    $('solve').disabled = false;
    $('solve').textContent = 'Build';
  });
});

$('again').addEventListener('click', () => { $('board').hidden = true; $('setup').hidden = false; });

for (const [box, key, set] of [
  ['mode', 'mode', (v) => (mode = v)],
  ['level', 'tier', (v) => (maxTierIdx = +v)],
  ['difficulty', 'diff', (v) => (difficulty = v)],
  ['effort', 'effort', (v) => (effort = v)],
]) {
  $(box).addEventListener('click', (e) => {
    const btn = e.target.closest('.opt');
    if (!btn) return;
    [...$(box).children].forEach((b) => b.classList.toggle('is-on', b === btn));
    set(btn.dataset[key]);
  });
}

$('start').addEventListener('click', () => {
  if (mode === 'cl') {
    $('llmurl').value = llm.url || $('llmurl').value;
    $('llmmodel').value = llm.model || '';
    $('llmkey').value = llm.key || '';
    $('llmout').textContent = '';
    for (const b of $('effort').children) b.classList.toggle('is-on', b.dataset.effort === effort);
    return $('llmbox').showModal();
  }
  begin();
});

function begin() {
  const opener = mode === 'cl' && llmFirst ? 1 : 0;
  game = { chain: [], used: new Set(), strikes: [0, 0], hints: 3, turn: opener, opener, lastReject: null, over: false, paused: false, ff: false, loser: null };
  $('setup').hidden = true;
  $('board').hidden = false;
  $('log').innerHTML = '';
  nextAt = 0;                               // a new game asks straight away, whatever the last one learned
  say(`${chosen('mode')} · ${chosen('level')} vocabulary · ${chosen('difficulty')} difficulty`);
  if (mode === 'cl') say(`${MODES[mode][game.opener]} opens.`);
  else if (mode !== 'cc') say('Open with any singular English noun — 3 letters or more.');
  render();
  schedule();
}

/** Just enough Markdown for ABOUT.md: headings, lists, bold, inline code. */
const markdown = (src) => src
  .replace(/\r\n?/g, '\n')                  // git hands the file back with CRLF on Windows
  .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  .split(/\n{2,}/)
  .map((block) => {
    const head = block.match(/^(#{1,3}) (.*)$/);
    if (head) return `<h${head[1].length}>${head[2]}</h${head[1].length}>`;
    if (/^ {4}/.test(block)) return `<pre>${block.replace(/^ {4}/gm, '')}</pre>`;
    if (/^[-*] /.test(block))
      return `<ul>${block.split('\n').map((l) => `<li>${l.replace(/^[-*] /, '')}</li>`).join('')}</ul>`;
    return `<p>${block}</p>`;
  })
  .join('')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

$('about').addEventListener('click', async () => {
  if (!$('aboutbox').dataset.loaded) {
    $('aboutmd').innerHTML = markdown(await (await fetch('ABOUT.md')).text());
    $('aboutbox').dataset.loaded = '1';
  }
  $('aboutbox').showModal();
});

const csv = await (await fetch(`/data/${DATA}`)).text();
index = buildIndex(csv);
$('start').disabled = $('solve').disabled = $('check').disabled = $('checkfilebtn').disabled = false;
$('start').textContent = 'Start game';

// each vocabulary button says how many playable words it draws from, tiers being cumulative
const playable = [...index.byStart.values()].flat().filter((w) => w.length >= 3).map((w) => index.words.get(w).tierIdx);
$('stats').textContent = `${playable.length.toLocaleString()} playable nouns loaded.`;
$('wordlist').textContent =
  `Word list: SEN ${DATA.slice(4, -4)} — ${playable.length.toLocaleString()} playable single English nouns.`;
for (const btn of $('level').querySelectorAll('.opt'))
  btn.dataset.tip = `${playable.filter((t) => t <= +btn.dataset.tier).length.toLocaleString()} words`
    + ` — everything up to and including ${TIERS[+btn.dataset.tier].toLowerCase()} words.`
    + (+btn.dataset.tier >= 4 ? ' Choose it to learn new words: the computer plays the rarest it can.' : '');
