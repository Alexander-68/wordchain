# WordChain

Name a **singular English noun** that starts with the last letter of the word before —
`cat → tiger → river → ...`. Three letters or more, and no word twice in a game. The computer
referees every move and tells you *why* a word is rejected.

## Who plays

- **Human vs Human** — two people at one screen.
- **Human vs Computer** — you and the computer. The default.
- **Computer vs Computer** — it plays itself, with **Pause/Play** and a **Fast-forward** that plays the rest of the game with no delay and runs the word count up. While it runs that button reads **Stop**, which keeps the chain and carries on move by move.

## Computer vocabulary

Common, Familiar, Expert, Insane — how wide a word list the computer draws on. It handicaps the
computer only: you may play any legal word at any setting. Hover a button to see how many words it
covers. The tiers are cumulative, so Familiar means core plus common plus familiar words.

The setting is a preference, not a wall. When nothing unused is left in its own tier for the current
letter, the computer widens by one tier at a time rather than resigning.

Inside its tier it reaches for the far end: among moves it rates equally it plays the rarest word it
can, so the chain keeps putting words in front of you that you may not know. The game grows your
vocabulary while you play. Every word in the chain carries its definition — hover, tap or focus it.

## Computer difficulty

- **Hard** — the ending that leaves you the fewest unused answers.
- **Normal** — any word starting with the right letter, at random.
- **Easy** — the ending that leaves you the most answers.

Answers are counted over the whole word list minus everything already played, so the game tightens
as the chain grows. The number under the big letter is how many unplayed words start with it.

## Spelling costs nothing

A British spelling, a known variant or a plain typo comes back in yellow with the word you meant,
filled into the input and ready to play — no strike. `tabel` is `table`, `colour` is `color`.
Strikes are for words that are wrong, not for words that are misspelled.

## How you lose

- Tapping **I lose**.
- **Three rejected words in a row.** One valid word resets the count.
- The computer resigns when it has no legal word left.

However it ends, the log offers the game back as two text files: the chain, one word per line,
and the transcript — every move, hint, rejection and strike, in the order they happened.

## Word check

Type any word and the checker says whether it is in the list, what it means, which tier it sits in,
and whether it may be played — with the reason when it may not:

    colour   british/commonwealth spelling variant. Did you mean "color"?
    happy    adjective (not a noun)
    zzzqx    not in the word list

## The longest possible chain

**Build** walks the whole word list and hands back the longest chain it allows, to download one word
per line. It takes well under a second. The field beside it pins the opening word — leave it blank
and the chain starts wherever it runs longest. The vocabulary setting bounds the build, and here it
is a hard wall: Common gives about 1,000 words, Familiar about 4,000, Insane **23,914**.

That number is not a good guess — it is the proven maximum for this word list. Letters are places,
words are roads between them, and each road may be driven once. Some letters have far more roads out
than in (`c`: 5,256 words start with it, 423 end with it) and some are the reverse (`e`: 8,689 in,
1,981 out), so a chain must strand the excess. The game works out the smallest possible number to
strand and then walks everything that is left.

## What counts as a word

The list is **SEN**, the Single English Nouns dataset: 63,311 words, 51,929 of them playable at
three letters or more. Rejected words stay in the file with their reason, which is how the referee
can answer with more than "not found".

Singular nouns only. Plurals, proper nouns, verbs, adjectives and inflected forms are out — as are
words a tagged corpus almost always uses as something other than a noun, like `run`, `bill` and
`federal`, even though a noun sense exists. American spelling is the kept form.

Where the list keeps two spellings of the same word — `whisky` and `whiskey`, `adz` and `adze` —
either may be played, but only one of them per chain. The second one is "already played".

The playable words by tier: 445 core · 2,365 common · 7,033 familiar · 12,911 uncommon ·
13,156 rare · 16,019 obscure. That last band is words the frequency tables have never seen — real
words, some too new (`lootbox`) and some genuinely arcane (`ophicleide`). They are what Insane adds.
