# Slice B — report (2026-11-18)

Stuff-class climb stops, built in the classification track's worktree
(branch `track/slice-b-design`, base = main `fcd2a96`) under the
owner's sequence authorization of 2026-11-18: the track runs
B → C → D without further commissions, each slice's batch landing
locally and waiting for its own push word. This batch is **not
pushed**.

Design: `slice-b-design.md` (coverage measurement folder). Its four
decisions were taken as recommended there — 1a the earth-stuff stop
is in, 2a pricing is flat per class from the pilot's specimens, 3a
alloy is a stop, 4a the candidate aspect is "material" — with one
located adjustment, flagged here rather than silently shipped:
decision 4a's aspect is carried in the candidate's `aspect` field
and in `viaClass`, but the candidate's `aspectKey` stays `"overall"`,
because `AspectKey` is a closed union owned by the foundation file
`src/graph.ts`, which stays byte-identical. If the owner wants a
`"material"` aspectKey, that is a foundation change for another word.

## What was built

The registered basis is the classification pilot's stuff-class
ruling R3 (`docs/fork/wp1-pilot-results.md` §6). Six stops, second
family on the climb's class-stop pattern (rule id
`STUFF_CLASS_R3_V1`; `STUFF_CLASS_STOPS` / `STUFF_CLASS_ELEMENTS` /
`STUFF_CLASS_PRICES` in `src/fork/classify.ts`; the class branch in
both BFS implementations in `src/fork/wordnet-lex.ts`;
`stuffStopReport()` exported; the anchor audit gained a stuff-stop
section writing `docs/fork/stuff-stop-dump.json`):

| stop synset | class → element | price | subtree |
|---|---|---|---|
| rock `wn-n14945132` | stone → Earth | 0.60 | 79 |
| metallic element `wn-n14873092` | metal → Metal | 0.80 | 130 |
| alloy `wn-n14834351` | metal → Metal | 0.80 | 95 |
| wood `wn-n15352510` | wood → Wood | 0.60 | 136 |
| water `wn-n08085056` | water → Water | 0.80 | 13 |
| earth `wn-n15092552` | earth → Earth | 0.60 | 57 |

A class candidate is an ordinary climb result plus
`viaClass {stuffClass, rule, stopSynset, stopLemmas}`, aspect
"material", provenance "wordnet-derived". The anchor test runs
first at every node; table-owned concepts never climb.

## The dump, eyeballed

Every subtree was read before this report was written. Stone,
alloy, wood, water and earth are clean: rock kinds; alloys and
steels; wood kinds (tree names in the wood subtree are the
wood-of-that-tree synsets — per-sense climbing keeps the organism
senses out, and the tests pin oak's split); water kinds (ice is
not a member — the H6 phase-null question is untouched); soils
and clays. One imperfection is recorded, not silently shipped:
the metallic-element subtree also holds a few compounds and ions
WordNet files under their element (alum ×2, barium dioxide /
hydroxide / monoxide, baryta, calcium ion, ferrite). R3's plain
reading does not call those metals. No exclusion was taken — the
design named none for stuffs, and Slice A's exclusion mechanism
is the shape to use if the owner wants one; the words sit outside
this slice's measured scope.

## Gates (delivered runs, this tree)

- **Suite: 708 pass, 0 fail** (711 counted). 10 new tests in
  `test/fork-stuff-climb.test.ts`.
- Two premises in `test/fork-anchor.test.ts` were corrected to
  the new truth (the Slice A precedent; the mechanism was not
  touched): rock's material sense now takes the stone class (the
  candy route to "sweet" stays dead), and brass takes the metal
  class via alloy (the "wind"/"face" routes stay dead).
- Demo **29/29** (27 exact). Holdout **80/80 parsed**, 0 parse
  regressions; the 1 round-trip regression ("Why do people get
  headaches?") is a pre-existing provider OFF/ON effect — no
  stuff candidate touches any word in it.
- Sense sets **A 11/11 · B 6/6**, unchanged. `npm run ai:check`
  OK (82 nodes).
- Census (≥3-sense lemmas): **509 / 79 / 27**, up from the
  post-repair 416 / 64 / 19; the sense-challenge script's prose
  was updated to this tree's figures and the sets regenerated.

## Coverage re-measurement

Same instrument, same 2,841-token population
(`coverage-report-sliceb.md` in the measurement folder):

- **All 43 in-scope tokens moved B → D; none stayed.** (Stone 8,
  metal elements 7, alloys 6, woods 15, water 1, earth-stuffs 7,
  counting "metal" once though both metal stops reach it.)
- This tree's totals: **D 481 (16.8%) · B 2,110 · A 261 · C 12**,
  against the original baseline's D 432 · B 2,127 · A 273 · C 9.
  Two cautions on reading those totals: this tree is main + B
  only (Slice A's batch is not in it, so its animal movement is
  absent here), and the baseline was measured against an older
  base (`7d7e2cc`), so the A-bucket movement (A→B, A→D) is
  base-tree drift — Slice B adds no synsets and no lexicon
  entries and cannot cause it. Slice B's own attribution is the
  43 scope tokens plus their morphological relatives (grounded,
  leads, logs reaching the same stops).
- C grew 9 → 12. Two of the three new divergences were verified
  by hand as genuine per-sense splits the slice intends: gold
  (Earth via the yellow colour anchor; Metal via the metal
  class) and chestnut (Metal via the horse anchor; Wood via the
  wood class). C is a risk bucket, not proven-wrong; sense
  arbitration separates these in sentences.

## Coordination with Slice A

Both slices extend the same two files. This tree's class branch
follows Slice A's pattern exactly, minus the exclusion set, so
when both batches land the two branches unite mechanically; the
`viaClass` records differ by family field (`stuffClass` here,
`creatureClass` there) under the shared shape. Two texts will
need one merged version at that point: the fork-anchor test
premises (each slice corrected different tests) and the
sense-challenge census prose (each tree's figures differ because
each holds one slice). Neither is a conflict of substance.

## Push state

Local commit on `track/slice-b-design` only. The batch: classify.ts,
wordnet-lex.ts, fork-stuff-climb.test.ts (new), fork-anchor.test.ts,
fork-anchor-audit.mjs, fork-sense-challenge.mjs,
stuff-stop-dump.json (new), anchor-audit-dump.jsonl,
sense-challenge.md, holdout-run.md (regenerated), this report.
