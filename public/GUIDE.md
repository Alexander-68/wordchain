# WordChain — beginner's guide

You do not win by knowing more words. You win by knowing **which letter to hand over**.

## How many answers each letter has

Playable nouns starting with each letter, from `data/sen-2026-09-02.csv` — the whole list, then the
part an ordinary vocabulary actually reaches (CORE + COMMON + FAMILIAR):

| letter | all | familiar |   | letter |  all | familiar |
| ------ | --: | -------: | - | ------ | ---: | -------: |
| **x**  | 237 |    **2** |   | v      |  819 |      167 |
| **z**  | 176 |       22 |   | n      | 1175 |      178 |
| **y**  | 220 |       39 |   | o      | 1172 |      195 |
| **q**  | 256 |       40 |   | w      | 1135 |      252 |
| **k**  | 651 |       88 |   | …      |      |          |
| **u**  | 697 |       89 |   | c      | 5165 |     1057 |
| **j**  | 417 |       94 |   | s      | 5730 |     1165 |

End a word in `e` and your opponent has 2,000 answers. End it in `x` and they have two.

## Rule 1 — answer with an attack

A hard letter is not something to survive. It is a good chance to strike back:

- given **j** → `jinx` — you survive J and hand back X (2 answers)
- given **v** → `vortex` → X. Given **u** → `university` → Y. Given **z** → `zoology` → Y.
- given **x** → `xerox` — the only word that answers an X and hands one straight back

**Start strong:** jazz, buzz, blitz, waltz, six, tax, box, fox, mix, index, day, city, money, family.

## Rule 2 — words you should know

For each starting letter, **strongest first**: the words that hand back a hard letter.

| start | words |
| ----- | ----- |
| a | army, ability, agency, activity, authority, attorney, assembly, academy, apex, appendix, annex, aux, attack, artwork, ark, audiobook, asterisk, airlock, adieu, amadou |
| b | buzz, blitz, blintz, body, baby, boy, birthday, beauty, bay, battery, buddy, box, beeswax, borax, boombox, back, book, break, bank, block |
| c | chintz, capiz, city, company, country, community, county, century, copy, capacity, complex, cox, climax, cortex, check, click, cook, clock, crack, creek |
| d | ditz, day, duty, display, delivery, deputy, democracy, discovery, delay, detox, dex, duplex, dropbox, drink, desk, deck, duck, disk, dock, div |
| e | ersatz, equinox, energy, economy, emergency, enemy, entry, equity, equality, essay, embassy, entity, envy, ecology, empathy, ecstasy, eternity, electricity, efficiency, epoxy, envoy |
| f | fritz, fuzz, fizz, fez, family, fly, facility, factory, fantasy, frequency, fancy, faculty, fox, flex, flux, flax, frank, feedback, framework, folk |
| g | geez, glitz, grosz, gigahertz, guy, gallery, glory, galaxy, gravity, grocery, gameplay, geography, gearbox, geek, gimmick, groundwork, glock, guidebook, gridlock, guru |
| h | hertz, hafiz, history, henry, holiday, highway, hockey, honey, humanity, hurry, hoax, hex, helix, hotfix, hajj, hook, homework, hack, heck, handbook |
| i | industry, injury, identity, inquiry, integrity, intensity, inventory, ideology, index, influx, inbox, intersex, ink, ilk, interlock, ironwork, inglenook, ironbark, impromptu, improv |
| j | jinx, jukebox, jazz (just these 3, no need to learn more) |
| k | kilohertz, kuvasz, key, keyway, kidney, kitty, kersey, kex, kylix, kick, knock, kirk, knack, kayak, kink, kiosk |
| l | lutz, lady, library, legacy, luxury, liberty, laboratory, loyalty, liability, lex, latex, lux, lynx, link, lack, luck, lock, leak, landmark, lieu |
| m | megahertz, may, money, majority, memory, ministry, mystery, minority, mercy, mix, max, matrix, mailbox, mark, milk, mask, monk, mack, malik |
| n | nobody, navy, necessity, nursery, nationality, neutrality, novelty, nanny, nix, neocortex, narthex, nitrox, network, neck, nick, notebook, nook, needlework, nouveau |
| o | okay, opportunity, obesity, observatory, odyssey, obituary, occupancy, oncology, onyx, oryx, outbox, oropharynx, oak, outlook, outbreak, overlook, outback, obelisk, otaku, ormolu |
| p | prez, pizzazz, putz, play, party, policy, property, plenty, possibility, personality, philosophy, phoenix, prix, paradox, pax, park, pack, peak, punk, pork |
| q | quiz, quartz (just these 2, no need to learn more) |
| r | ritz, razz, razzmatazz, razzamatazz, reality, responsibility, ray, recovery, reply, railway, rugby, rally, remix, reflex, roux, reflux, raj, risk, rock, rank |
| s | showbiz, spitz, spritz, swizz, story, study, security, society, safety, secretary, supply, somebody, six, sex, syntax, smallpox, stock, stick, shock |
| t | topaz, terahertz, today, technology, theory, twenty, territory, turkey, therapy, thirty, tax, toolbox, thorax, tux, talk, track, task, truck, tank, trick |
| u | university, utility, unity, uncertainty, urgency, uniformity, usability, upholstery, uptick, uplink, umiak, uptalk, ubuntu, uhuru |
| v | vox, vortex, vertex, volvox, vernix, variety, victory, valley, velocity, vocabulary, vicinity, visibility |
| w | waltz, wiz, wax, why, whiskey, warranty, weekday, winery, walkway, waterway, weaponry, whey, week, walk, wreck, wink, whack, wick, whisk, woodwork |
| x | xerox, xerocopy, xerography, xenogamy, xenology, xenobiology, xenon, xanthan, xylan (keep xylophone to your opponent and respond with equinox) |
| y | yutz, yesterday, yeomanry, yuppy, yabby, yewberry, yobbery, yex, yearbook, yak, yuck, yolk, yank, yew, yahoo, yen, yuan, yarn |
| z | zizz, zoology, zany, zloty, zealotry, zoogeography, zax, zwieback, zhou, zaibatsu, zebu, zero, zoo, zorro, zippo, zeppelin, zillion, zircon, zooplankton |

## What not to do

- **Do not end on a vowel.** `-e`, `-a`, `-o` and `-s` are the four easiest letters to answer.
- **Do not save your good words.** A `quiz` you never played is worth nothing.
- **Do not fear a misspelling.** A typo or a British spelling comes back as a hint with no strike.
  Three *rejected* words in a row lose the game; three misspellings cost nothing.
- **Do not guess plurals, verbs or names.** `running`, `federal` and `paris` are all rejected. Only
  singular common nouns count.

## Practice

Set the computer to **Hard**, vocabulary **Common**. It hunts for exactly these endings, so it
teaches the list by playing it at you. When it hands you an `x`, you will remember `xerox`.
