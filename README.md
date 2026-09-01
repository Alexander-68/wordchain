# WordChain

A word-chain game in the browser. Each player names a **singular English noun** starting with the
last letter of the previous word — `cat → tiger → river → ...`. Three letters or more, no repeats. The computer referees
every move and says *why* a word is rejected.

Plain JavaScript, plain HTML, no build step, no dependencies. Node only serves the files.

```bash
npm start        # http://localhost:8080
npm test         # rule + strategy self-check
```

## Modes

| mode                 | who plays                | referee      |
| -------------------- | ------------------------ | ------------ |
| Human vs Human       | two people at one screen | the computer |
| Human vs Computer    | you and the computer     | the computer |
| Computer vs Computer | it plays itself          | the computer |

Defaults: human vs computer, Familiar vocabulary, Normal difficulty.

**Computer vocabulary** picks the tier the computer draws from — Common, Familiar, Expert, Insane.
Hovering or focusing a button says how many playable words it draws on, counted from the loaded
dataset; the difficulty buttons explain their strategy the same way. Tiers are cumulative: Familiar means
CORE + COMMON + FAMILIAR, not familiar words alone, and Insane is Expert plus the obscure tail. It handicaps the computer only — a human may play any legal word at any
setting — and the tier is a preference, not a wall: the computer plays inside it while it can, and
only when nothing unused is left there for the current letter does it widen by one tier at a time,
rather than resigning — one step, not a jump to the obscure tail.

Inside that tier it reaches for the far end. Among moves its difficulty rates equally the computer
plays the rarest one available, so the chain keeps putting words in front of you that you may not
know — the game grows your vocabulary while you play. On Normal, where every legal word scores the
same, that means the highest tier the setting allows on every turn; on Hard and Easy it only breaks
ties between endings that leave the opponent the same number of answers.

**Computer difficulty** picks how it chooses among those words:

|        |                                                               |
| ------ | ------------------------------------------------------------- |
| Hard   | the ending that leaves the opponent the fewest unused answers |
| Normal | any word starting with the right letter, at random            |
| Easy   | the ending that leaves the opponent the most answers          |

Options are counted over the full word list minus everything already played, so the count tightens
as the chain grows.

In computer vs computer the input is replaced by **Pause/Play** and **Fast-forward** — the latter
plays the rest of the game with no move delay and no per-move log line, running the word count up as
it goes, and stops at the loss. While it runs the same button reads **Stop**: tapping it keeps the
chain as it stands and hands the turn back to the normal move-by-move game. A full game on the default Familiar vocabulary is about 400 words on Hard, 1,700 on Normal and
4,700 on Easy, so the counter is the only thing worth watching; the chain redraws once at the end (last 400
words).

Every game opens with a log line naming the mode, vocabulary and difficulty.

The letter badge carries the number of unplayed words that start with it — counted over the whole
list, not the computer's tier. Hover, tap or focus a word in the chain to see who played it and
what it means.

Spelling costs nothing. A British spelling, a dataset-known variant or a plain typo comes back in
yellow with the word you meant — filled into the input, ready to play — and no strike. Strikes are
for words that are wrong, not for words that are misspelled. `nearest()` finds the fix: swapped
letters first (`tabel` is `table`, not `tael`), then any legal word one insertion, deletion or
substitution away, most common first.

## Word check

The start page is two panels: the game setup down to **Start game**, and below it the lookups.
**Word check** takes any word and answers with its definition on one line, then its tier and whether
it may be played — with the dataset's reason when it may not, and the nearest word when it is not in
the list at all. **About** beside the subtitle opens `public/ABOUT.md` in a dialog: the same rules,
written for the player.

## Losing

- Tapping **I lose**.
- **Three rejected words in a row.** A valid word resets the count.
- The computer resigns when it has no legal word left.

## What counts as a word

The word list is [SEN](../WordChain-dataset) (`data/sen-2026-09-01.csv`, 61,537 rows, 8.5 MB) — the
dataset ships rejected words too, each with a reason, so the referee can answer with more than
"not found":

```
colour   → british/commonwealth spelling variant. Did you mean "color"?
happy    → adjective (not a noun).
absolver → inflected form (Wiktionary).
zzzqx    → not in the noun list.
```

Two house rules sit on top of the dataset (`HOUSE_REJECT` in `public/rules.js`), because it
deliberately leaves them to the game:

- Words a POS-tagged corpus almost always uses as a **verb, adjective, or name** are rejected even
  though they have a noun sense — `run`, `federal`, `bill`. This is the "primary use is not a noun"
  rule.
- Everything else the dataset marks `allowed=False` is rejected: plurals, proper nouns, inflected
  forms and British spellings (American is the kept form). Rarity is no longer one of those reasons:
  since 2026-08-30 the dataset keeps zero-frequency nouns and tiers them `OBSCURE`, so the
  vocabulary setting — not the word list — decides how obscure the game gets.

Singular only — the dataset has no plural forms, so `cats` is "not in the noun list". Words under
three letters are out (`MIN_LENGTH` in `public/rules.js`), for the computer too.

No word is played twice in a game — the referee rejects a repeat, and the computer never picks one.

### The dataset, in numbers

61,537 rows in, 51,895 marked `allowed=True`. The two house rules above take out 1,145 more, and the
3-letter minimum another 69, leaving **50,681 playable words**.

| tier     | words  | cumulative | what the setting draws |
| -------- | ------ | ---------- | ---------------------- |
| CORE     | 439    | 439        |                        |
| COMMON   | 2,272  | 2,711      | Common                 |
| FAMILIAR | 6,920  | 9,631      | Familiar (default)     |
| UNCOMMON | 11,982 | 21,613     |                        |
| RARE     | 13,103 | 34,716     | Expert                 |
| OBSCURE  | 15,965 | 50,681     | Insane                 |

Expert is everything but the obscure tail; Insane adds it. As of the 2026-09-01 dataset that tail is
no longer a rounding error: `wordfreq` scores 15,965 real nouns at zero, some too new for the
frequency tables (`lootbox`), some genuinely arcane (`ophicleide`), and the dataset now ships them
playable rather than cut. Insane is a third of the list, so the two settings are far apart.

The 9,642 rejected rows, by reason: verb 3,064 · spelling variant 1,628 · adjective 1,163 · proper
noun 1,026 · British spelling 707 · inflected form 498 · not in Wiktionary 411 · plural-only 409 ·
the rest 170 or fewer each. On top of those the house rules reject 437 verbs, 434 adjectives and 274
names that the dataset allows.

Length runs 3–14+ letters, peaking at 8 (7,429 words); 3-letter words are the scarce ones (661).
Mean Zipf frequency 1.69 — most of the list is rare vocabulary, which is why the default tier stops
at FAMILIAR.

Starting letters are lopsided and ending letters more so, which is the whole shape of the game:

|        | most                                            | fewest                               |
| ------ | ----------------------------------------------- | ------------------------------------ |
| starts | s 5,709 · c 5,135 · p 4,520 · a 3,296 · b 3,009 | z 173 · y 196 · x 237 · q 254 · j 408 |
| ends   | e 8,449 · r 6,031 · n 5,712 · s 5,014 · y 4,652 | q 2 · j 3 · v 18 · z 65 · u 150      |

8,449 words end in `e` but only 1,956 start with it, so `e` is a sink; `c` is a source (5,135 out,
405 in). That gap is exactly what caps the longest chain.

## The longest possible chain

**Build** on the start page walks the word list and hands back the chain to download, one word per
line. It takes under 100ms. The field beside it pins the opening word — leave it blank and the chain
starts wherever it runs longest (`jilbab` on Insane: not a special word, just the letter left
holding the spare exit).

The **Computer vocabulary** setting bounds the build, and here it is a hard wall — unlike the
computer's moves in a game, there is no fall back to the full list, so the setting changes the
answer:

| vocabulary | words in the chain | runs                   |
| ---------- | ------------------ | ---------------------- |
| Common     | 1,023              | job → nobody           |
| Familiar   | 3,861              | biceps → xerox         |
| Expert     | 15,612             | jackscrew → xerography |
| Insane     | 23,224             | jilbab → recency       |

A pinned opening word outside the chosen vocabulary is refused rather than quietly widening it.

The chain is a trail through a 26-node graph: nodes are letters, edges are words (start letter to
end letter), and each edge may be used once. `longestChain()` in `public/rules.js`:

1. keeps the largest connected clump of letters,
2. deletes the fewest words that leave every letter balanced — as many words out as in — except one
   letter with a spare exit (the start) and one with a spare entry (the end),
3. runs Hierholzer, which then walks every remaining edge exactly once.

A pinned word is spent before step 1 and step 2 is told to leave the spare exit on the letter it
ends with, so the trail resumes from there. Pinning costs a word or two: `cat`, `music` and `xylophone` reach
23,222, `zebra` 23,223.

### Step 2 is a min-cost flow

Deleting the fewest words is not a greedy problem — a letter with a surplus can only hand a word
to a letter with a deficit if words actually join them, and there are only so many. It is a
flow problem, and `deletions()` builds it directly: one unit of flow per surplus exit, an arc per
letter pair capped by how many words join them and costing one word per hop, a source feeding the
surplus letters and a sink draining the deficit ones. Two nodes in the middle carry a single free
unit — that is the chain's two loose ends, the spare exit at the start letter and the spare entry
at the end letter, which cost nothing. Minimum cost is therefore the minimum number of deleted
words, and the flow's decomposition into paths *is* the deletion. Successive shortest paths (SPFA)
solves it in a few milliseconds on 29 nodes.

### Is it actually the longest?

Yes, on two conditions that hold here and are checked at runtime.

The counting bound first: in any chain a letter is entered as many times as it is left, except once
at each end, so every letter must leave at least `out(v) − in(v) − [v is the start]` of its words
unplayed. The surpluses sum to 21,730, so at least 21,729 words are lost and no chain can beat
50,681 − 21,729 = **28,952**. That bound is loose, because it assumes every surplus word can be
dropped on a letter that needs it — capacity says otherwise. The flow prices that in: its minimum
is 27,457 deletions, which is the real floor, and `50,681 − 27,457 = 23,224` is the answer.

The two conditions: the flow has to saturate every surplus (it does — the residual imbalance is
exactly `j +1`, `y −1`, the trail's own ends), and the deletions must not strand a letter, since
Hierholzer would then skip a piece of the graph (they don't — the walk consumes all 23,224
remaining words). If a future word list broke either, the result would be a valid chain but no
longer a provably maximal one.

## Updating the dataset

A new SEN drop is a new dated CSV. The numbers above are all derived from it, so they move too:

1. Copy the file in: `cp ../WordChain-dataset/sen-YYYY-MM-DD.csv data/` and delete the old one.
2. Point the three references at it — `DATA` in `public/game.js`, the `readFileSync` in `test.js`,
   and the file table below.
3. `node test.js` — the rules, a full self-play game and the longest chain all run against the new
   list.
4. `node tools/stats.js` — prints every word-list number the docs quote, in the order they appear.
   It reads the file named by `DATA`, so step 2 comes first; pass a path to check a candidate file
   without swapping it in.
5. Paste the numbers back into **both** docs — this README (the funnel and tier table under *What
   counts as a word*, the letter table and chain numbers under *The longest possible chain*) and
   `public/ABOUT.md`, which repeats the playable total, the per-tier counts, the `c`/`e` letter
   counts and the Insane chain length in player-facing prose.

## Files

| file                                    | what                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `server.js`                             | 30-line static file server (`node:http`)                                            |
| `public/rules.js`                       | CSV parse, word index, referee, computer move — no DOM, shared with the test        |
| `public/game.js`                        | turns, strikes, rendering                                                           |
| `public/index.html`, `public/style.css` | the UI                                                                              |
| `public/ABOUT.md`                       | player-facing rules, shown in the About dialog                                      |
| `data/sen-2026-09-01.csv`               | the word list, copied from `../WordChain-dataset`                                   |
| `test.js`                               | asserts the rules, plays a full computer-vs-computer game, checks the longest chain |
| `tools/stats.js`                        | recomputes every word-list number quoted above, for a new dataset drop             |


