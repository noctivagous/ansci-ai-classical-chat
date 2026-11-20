# Slice C — report (2026-11-18)

The recognised-but-unclassified climb outcome, built in the
classification track's worktree (branch `track/slice-b-design`,
on top of Slice B's local commit `1fd0b9c`) under the owner's
sequence authorization of 2026-11-18 and the pre-rulings 1a–4a
recorded in `slice-c-pre-rulings.md` (coverage measurement
folder). This batch is **not pushed**.

## What was built

A third climb outcome beside classified and nothing (ruling 1a).
When a noun sense's climb finds no anchor and no class stop, its
walk can still end at a **category stop** — a synset naming a
function category — and the sense is *recognised*: the system
knows the kind of thing the word names and claims no element
for it. `climbRecognitions(lemma)` in `src/ansci/wordnet-lex.ts`
returns one `RecognitionResult` per such sense, carrying the
category, the stop synset, the hops, a readable path, and every
stop on the sense's paths with the nearest marked primary
(ruling 4a). The type has **no element, no aspect and no
confidence field** — by construction, not by convention — and
nothing in sense arbitration reads it.

Classification takes precedence per sense (ruling 3a): a sense
with any climb hit — anchor, gated anchor, or class stop — never
recognises. The two outcomes coexist inside one word: marble's
stone sense classifies under Slice B while its game sense is
recognised as equipment.

Visibility (ruling 1a): the climb audit shows a hitless sense's
recognition beside the absence of a hit (the decline diagnosis's
window), and the turn trace gained a `recognitions` record —
when a lemma in a turn is classified by neither the table nor
the climb, the trace records the recognised kind (lemma-level,
as classifications are traced). The join deliberately does not
consume recognitions: they carry no element, so there is
nothing it could lawfully derive from one. Reply phrasing
("it's a kind of tool") is **not** built — ruling 2a defers it
to the Social Unit track.

## The stop list (ruling 3a: function categories only)

Fourteen stops, keyed by synset id in `CATEGORY_STOPS`
(`src/ansci/classify.ts`), certified from Slice B's audit dumps
and the post-B re-measurement as the authorization directs:
device (fallback; subtree 3,048, audited by its mid-level
composition — every direct child is itself a device category),
implement 787, tool 379, utensil 99, appliance 74, equipment
527, container 527, vehicle 548, vessel 197, clothing 585,
garment 281, weapon 207, furniture 206, food 2,571 (sampled at
head, middle and tail). Every other subtree was read in full.
Recorded imperfections, none silently shipped: equipment is the
loosest subtree (sports gear, apparatus, game pieces — all
equipment by the taxonomy's filing); garment holds a few
process nouns (ironing, laundry); vessel holds named ships as
instance members and one odd filing (sharpshooter, a ship-name
sense); weapon holds chemical and biological agents, which are
weapons by use — the recognition principle itself.

Not stops, with the reasons recorded in classify.ts: the
scaffolding ancestors (entity, abstraction, physical entity,
object, artifact — they would recognise everything and mean
nothing); instrumentality (artifact in function dress; device
is its concrete child); structure (formal, not functional);
organism kinds (animal, plant, vertebrate — kinds, not
functions); the abstracta (communication, cognition, act);
food's parent nutrient (not a sayable category word; its solid
members take the food stop).

## Gates (delivered runs, this tree)

- **Suite: 717 pass, 0 fail** (720 counted). 9 new tests in
  `test/ansci-recognition.test.ts`, including a runtime check
  that no recognition result carries element/aspect/confidence
  keys, and the precedence invariant checked against the audit
  over probe words.
- Demo **29/29** (27 exact). Holdout **80/80 parsed**, 0 parse
  regressions (the 1 round-trip regression is the pre-existing
  provider OFF/ON effect Slice B's report dispositions).
  Sense sets **A 11/11 · B 6/6**, unchanged. `npm run ai:check`
  OK (82 nodes).

## The B split (ruling 2a) — and Slice D's size

Re-measured over the post-B measurement's 2,110 B tokens
(`slice-d-population.json` in the measurement folder):

- **B-recognised: 343** — device 143, food 98, tool 35,
  equipment 35, container 29, implement 16, vehicle 12,
  garment 9, utensil 9, clothing 7, furniture 7, weapon 4,
  vessel 3, appliance 1 (a token may carry several senses'
  categories).
- **B-unknown: 1,767**, of which 1,488 are test-suite-only
  tokens — the meta-vocabulary Slice D's pre-ruling 4a puts out
  of scope. The real-vocabulary remainder (tokens sourced from
  the 500-object corpus and/or the holdout sentences) is
  **279 tokens**: that is Slice D's working population on this
  tree. When Slice A lands, its fifteen stayed animals (frog,
  toad, spider, octopus, …) join it.

## Push state

Local commit on `track/slice-b-design` only, stacked on Slice
B's. The batch: classify.ts, wordnet-lex.ts, turn.ts,
fork-anchor-audit.mjs, category-stop-dump.json (new),
fork-recognition.test.ts (new), this report. (The regenerated
anchor-audit and holdout dumps came back byte-identical and are
not in the batch.)
