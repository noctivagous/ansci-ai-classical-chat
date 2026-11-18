# The five-batch merge — record (2026-11-18)

What was done to land Slices A, B, C, D batch 1 and Social Unit
S1 in one tree, how the interactions the slice reports
predicted were resolved, and the merged tree's delivered
figures. Each slice's own report stands as the record of its
build in its own tree; this document records only the union.

## The merge

Base: main at fcd2a96 (unchanged since the tracks branched).
Track 1 (Social Unit S1, 8a05263) and the classification track
(Slice B 1fd0b9c, Slice C 75b8121, Slice D proposal 4f7039a,
Slice D build 891e86d) merged by git without conflicts — the
two tracks touched turn.ts in different regions. Slice A,
which lived as file states in a non-git tree, was ported by
hand: its CREATURE_CLASS blocks in classify.ts, its
creature-class branch in wordnet-lex.ts (both BFS
implementations, with the exclusion set), its audit-script
section, its stock premise in fork-anchor.test.ts, its test
file and its report. The viaClass shape became a single record
with one family field set (creatureClass or stuffClass, keyed
by rule) so both slices' tests read it unchanged.

## Interactions, as they actually fell

- **Census (≥3-sense lemmas): 729 / 183 / 64**, up from Slice
  B's tree's 509 / 79 / 27 — the creature stops give animal
  words' senses candidates beside the stuff classes. The
  sense-challenge prose was rewritten to the merged figures.
- **Sense set B: 5/6** (baseline 3/6). The stock item, exactly
  as Slice A's report recorded in advance: stock's livestock
  sense takes the mammal class candidate (Metal @0.80), tying
  the broth candidate, and the coherence pick flips. No
  exception or exclusion was taken to protect the set. Set A
  stays 11/11.
- **Copper**: this extract's first noun sense of copper is the
  butterfly. It now takes the insect stop (scaled → Wood
  @0.80); the metal sense takes the metallic-element stop
  (Metal @0.80). Slice B's test premise was corrected to assert
  both candidates, one per reading; the isolated best-pick ties
  and takes the earlier sense, which is the recorded design
  (sense arbitration in a sentence is coherence's job).
- **Cinnabar**: its moth sense climbs to the insect stop; its
  mineral sense still reaches nothing. Slice D's overlay entry
  (the mineral, Earth @0.60) STANDS, and the overlay's
  fill-only eligibility test names cinnabar as its single
  recorded exception — a different reading, not a competing
  classification of the same one. The overlay module's header
  records the exception and its grounds.
- **fork-anchor.test.ts** carries all three premise
  corrections together: rock and brass (Slice B's) and stock
  (Slice A's).

## Gates (delivered runs, merged tree)

- Suite: **743 pass, 0 fail** (746 counted — the B/C/D tree's
  727 + Slice A's 12 + S1's 7, exactly).
- Demo: **29/29**, 27 exact. Holdout: **80/80 parsed**, no
  parse regressions; mean classifications ON 0.42.
- Sense sets: **A 11/11 · B 5/6** (see above).
- Anchor audit regenerated (1,140 dump rows; all three stop
  dumps written). ai:check OK (82 nodes).

## What this does not show

The union was assembled and gated by the same hands that built
the parts; nobody independent has checked it. Set B at 5/6 is
a real regression against the B/C/D tree's 6/6, accepted here
as the honest consequence of Slice A working as designed and
recorded in its report before the merge — it is not hidden,
and no mechanism was bent to avoid it.
