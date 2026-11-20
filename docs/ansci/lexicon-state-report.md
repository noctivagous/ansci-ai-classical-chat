# The lexicon-state family — fix report (2026-11-18)

What was done, what it shows and what it does not show, and
what nobody independent has checked. Commissioned by the
owner as the first item from the GAPS.md reconciliation
("do everything recommended"): the §5 lexicon-state family
as one slice, the bei guard riding along, and the GAPS.md
strike-through pass for the work that had already landed.

## The family

Four recorded defects, one mechanism. The WordNet provider
(`src/ansci/wordnet-lex.ts`) registered every entry it
derived into the shared lexicon — including entries derived
by a mere probe, when the parser asked "could this word be
a verb here?" and went on to use a different reading. A
registered derived verb could displace the same surface's
derived noun or adjective, and parse classification read
the registry. A word's classification therefore depended
on what the process had parsed before:

- **Probe-poisoning** (found during Social Unit S2,
  recorded in its report): "You are welcome." parses as a
  predication the first time and as "You welcome." the
  second, in one process.
- **The imperative, single-use** (GAPS §5): the branch's
  signature requires the initial word NOT to be
  verb-classified; the first parse's probes registered
  exactly that classification, so the construction atom
  was lost at reparse — 0/5 on the construction-family set.
- **The existential reparse crash** (GAPS §5): "There is
  snow in winter." generates its identical surface, which
  then fails to reparse — "snow" had flipped to its verb
  entry, and the chunker found no subject.
- **The bei crash** (GAPS §5, adjacent rather than family):
  猫被狗咬了 threw a TypeError from the bei branch's
  unchecked dereference of a missing verb entry.

All four were reproduced on the tree before any change,
and the pre-fix construction-family figures were re-taken
from a separate worktree at the pre-fix head, so the
comparisons below are run-against-run, not remembered.

## The fix

- **wordnet-lex.ts — registration is adoption.** The
  `wordnetVerb/Noun/Adjective` providers derive, cache and
  return; they no longer register. A new exported
  `registerDerivedEntry` registers an entry a caller has
  adopted — assigned to an item, a node, or a clause root —
  under the same keys the providers always used. The
  by-lemma consumers the registry exists for (generate,
  check, turn) still see adopted entries exactly as before.
- **parse.ts — classification never reads a derived
  entry.** Item classification treats a registry entry
  carrying the WordNet source mark as a miss and re-derives
  in the parser's fixed precedence (noun, then adjective;
  verbs positional only, as the parser was already
  designed). Classification is now a function of the
  sentence and the shipped lexicon, never of parse
  history. Adoption registrations were added at the five
  sites that assign a derived entry: item classification,
  the adjective-head re-read, the imperative root, the
  verb scan's chosen candidate, and the lexical-do pass.
  The pure probes (the have-lookahead, the recogniser's
  known-word test) register nothing, which is the point.
- **parse.ts — the bei guard.** The branch throws a
  located parse error ("cannot parse bei passive of:
  猫被狗咬了 — the verb after 被 has no lexicon entry")
  when the verb item carries no verb entry.
- **plan.ts — a stale comment corrected.** The thanks
  receipt's construction was justified partly by the
  poisoning; the comment now records that the gap is
  closed and the construction stands on its own ground
  (the Planner authors its moves).

## Two knock-on corrections, stated plainly

**The initiative scan had been reading the poisoning.**
The first full-suite run after the fix failed one test:
the S5 record arc's insistence reply gained an appended
initiative sentence ("Cat is black, as I have it. The cat
is black."). The unexpressed-state scan excludes a state
whose lemma is a verb entry; "black" had counted as one
only because an earlier turn's probe registered its verb
derivation. With probes inert, the state stood as a
candidate and initiative volunteered the very fact the
stance had just restated. A first attempt — making the
scan probe for a verb reading deterministically — broke
R6-3 instead: "cold" also has a verb derivation, and it
is that programme's canonical candidate. The reading that
fits both records is that the exclusion was never the
right instrument for this. The fix sits at the turn
layer: **initiative stands down on stance turns**, whose
replies are designed moves complete in themselves — the
same standing the farewell already had via the phase
gate. The scan's registry read stays, and is sound now:
a verb entry stands in the registry only when a parse
adopted the lemma as a verb, which is what a verb-carried
state means.

**The garden probe now parses cold.** The
construction-family set's probe "Tell her about the
garden." — documented in the set itself as not parsing in
a cold process — had appeared to pass in pre-fix runs
only because earlier items in the process had polluted
the lexicon. Post-fix it failed deterministically, and
the blocker was located: "about" carries no entry and
wears the default "proper" classification (§6's adverb
hole), and the "her" re-read's can-head test counted that
entry-less item as evidence a noun phrase could follow,
so "her" stayed a determiner and the imperative
signature's pronoun test failed. The test now requires
an entry for a "proper" item to count. The sentence
parses cold and in sequence. The root — "about" having
no classification of its own — remains §6's item; this
change is at the re-read site only.

## Gates (delivered runs, this tree)

- Suite: **774 pass, 0 fail** (777 counted — the previous
  tree's 771 plus 6 new tests in
  `test/ansci-lexicon-state.test.ts`: parse-twice
  stability, poisoning by an innocent earlier sentence,
  the imperative round trip, the existential round trip,
  the bei failure mode, and a dual-category batch).
- Demo: **29/29** (27 exact). Holdout: **80/80 parsed**,
  0 parse regressions, 0 round-trip regressions. Sense
  sets: **A 11/11 · B 5/6** (B's figure is the known
  stock-item cost of Slice A; unchanged). ai:check OK
  (89 nodes).
- Construction family: **47/47 completed round trips at
  100%** — every family at 100%, imperative 0/5 → 5/5 —
  against the pre-fix worktree's 89.1% over 46 atoms.
  Instrument failures: 2, both honest parse failures —
  他把门关上 (pre-existing ba resultative, unchanged)
  and 猫被狗咬了, now failing as the located parse error
  above instead of a TypeError. Pooled holdout
  preservation on the delivered runs reads **98.7%**,
  where the pre-fix instrument read 98.2% and the sense
  record had carried 97.7% with a note attributing the
  wobble to warm-state dependence; the atom population
  was identical (1,075) across this tree's runs. That is
  consistent with the instrument steadier, and is stated
  as consistency, not as a re-measurement of the
  cold/warmed effect itself.

## What this does not show

- Nothing here has been checked by anyone outside this
  loop. The fix's evidence is the project's own suite and
  instruments, run as above.
- The sealed conversation probe set (§2) is still unrun;
  this fix removes a confound that run would have faced,
  and is not evidence about the run's outcome.
- Registration-on-adoption means the registry still
  changes as a process parses — by design, for the
  by-lemma consumers. What is claimed is narrower and is
  what the tests pin: no parse's *classification* of a
  word depends on that history, and probes leave no trace.
