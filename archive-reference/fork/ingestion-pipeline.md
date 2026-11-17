# The ingestion pipeline — Slice 3 report (2026-11-16)

The pipeline from the project's 2026-11-08 design is built and
has run once, end to end, on a real chapter: **acquire →
segment → read → propose → review → apply**, over *Suwen* ch. 5
（陰陽應象大論， *Yin Yang Ying Xiang Da Lun*). Correspondence
knowledge now has a way into the graph that runs from cited
text rather than by hand. The machinery is
`src/fork/ingest.ts`; the run is driven by
`scripts/fork-ingest-suwen5.mjs` (`npm run fork:ingest`); the
banked output lives in `src/fork/ingested.ts`.

## The three hard rules, and where each is enforced

1. **No citation, no insertion.** Every proposal carries a
   citation: text, chapter, and the exact quoted passage it
   rests on. Enforcement is doubled. The review stage refuses a
   proposal whose citation is incomplete or whose quote does
   not occur verbatim in the acquired chapter text
   (whitespace-insensitive). The apply stage then re-checks
   citation completeness itself, so a citation-less proposal
   cannot be inserted even behind a forged "pass" review
   outcome. Both refusals are pinned by tests
   (`test/fork-ingest.test.ts`).
2. **Variant schemes coexist.** Assertions are source-scoped —
   text + chapter + scheme travel with every record. A proposal
   that disagrees with an existing record from a *different*
   chapter is banked alongside it, marked `variant`; nothing is
   merged, averaged, or overwritten. A disagreement within the
   *same* chapter and scheme is refused as a `conflict` and
   queued: one scheme contradicting itself must not be banked
   twice under one label. (A genuine intra-chapter textual
   variant would be banked under two scheme labels naming the
   readings — a deliberate act, not a pipeline default.)
3. **The apply target is a new store.** Apply writes only to
   `src/fork/ingested.ts`. `classify.ts` is untouched by this
   slice and stays hand-governed; `lookupClassification` and the
   parser do not read the ingested store. Ingestion banks
   source-scoped assertions for later governed promotion — the
   same posture as the H7 derived store (Slice 1), banked
   without consumers.

## The stage design

- **Acquire** (`acquireChapter`): extracts one chapter's body
  from a fetched source page and records it with its edition.
  A page may name the chapter more than once (navigation
  furniture lists chapter titles contiguously), so the chapter
  is taken as the longest heading-to-next-heading span;
  acquisition throws when no plausible body exists rather than
  ingesting the wrong text.
- **Segment** (`segmentChapter`): splits the body into citable
  passages (paragraphs), verbatim.
- **Read + propose** (`readPassages`): a mechanical reader over
  the chapter's own structures. The five directional blocks are
  strictly parallel — a generation chain followed by a table
  sentence of 在X為Y clauses — and the reader parses those
  clauses; its only hand-supplied knowledge is the scheme's
  vocabulary (row labels, glosses, phase names). Two further
  statement families are read by pattern: the yin-yang
  assignment （水為陰，火為陽） and the 通於 qi-correspondences
  （天氣通於肺，…). Statements the reader recognises but cannot
  honestly cast as (concept, aspect) → value assertions are
  returned as *not proposed*, with reasons, for the queue.
- **Review** (`reviewProposal`): deterministic checks —
  citation complete; quote verified verbatim against the
  acquired text; scheme fields complete and well-formed;
  duplicate/variant scan against the ingested store and the
  curated table. Review verifies form and presence. It does
  **not** judge whether the reader's gloss is right, and every
  outcome says so by construction: passing records are marked
  machine-reviewed (`ingest.review (deterministic)`), and each
  banked record additionally carries a per-assertion review
  note — the basis: the quoted passage, checked against the
  chapter, plus the reader's derivation note.
- **Apply** (`applyProposal`): appends a passed proposal to the
  store as a banked record with its citation (now including
  edition and source URL), provenance `ingested`, and review
  record. Refusals throw. Because duplicates and conflicts
  carry a "refuse" verdict, the store is idempotent under
  re-runs.

## The chapter run

Source: the Wikisource received text
(zh.wikisource.org, 黃帝內經/素問第二卷 — the book's index
presents this *Suwen* as the Jin-dynasty published text),
retrieved 2026-11-16. The acquired body is 2,486 characters,
sha256 `6c31e24a0764950dbde4f6932e926df7313333bd63bdc90c69eeeff663a1b3ab`,
recorded verbatim at `data/ingest/suwen-ch5.txt` with its
source record at `data/ingest/suwen-ch5.source.json`, so quote
verification can be re-checked offline.

| Stage | Count |
| --- | --- |
| Passages segmented | 37 |
| Proposals formed | 63 |
| Refused at review | 0 |
| Applied (banked) | 63 |
| — corroborates the curated table | 32 |
| — new to every store | 31 |
| — variants / duplicates in this run | 0 / 0 |
| Read but not proposed (queued) | 12 |
| Re-run against the banked store | 63 proposals, 0 applied, 63 refused as duplicates |

The 63: the five directional tables (5 blocks × 11 rows —
climate, direction, tissue, organ, color, sound, voice,
change, orifice, flavor, emotion), the two yin-yang
assignments, and the six 通於 correspondences.

**The queue (read, not banked).** The five generation chains
and the five 傷/勝 harm-and-overcome lines are relational
statements, outside this store's assertion shape. The east
block's cosmological preamble （其在天為玄，在人為道，在地為化）
likewise. And the collective line 人有五藏，化五氣，以生喜怒悲憂恐
names the five emotions as a set with no per-direction
assignment; it is also the only line in the chapter where 悲
appears. Proposing a phase for 悲 from this chapter would
import a later scheme, so it is queued, not banked — the
pipeline's abstention, recorded.

**Two reader decisions worth naming.** The character 憂 occurs
in two rows with two senses: the south's 在變動 row (halting,
trembling speech) and the west's 在志 row (sorrow). The reader
glosses by row, so the store holds `trembling-speech → Fire
(change)` and `sorrow → Metal (emotion)` as separate records;
the WP1 survey's warning against merging them is implemented,
not just cited. And the east color 蒼 is banked as `azure`,
its own concept: ch. 4's word for the east is 青 (green), and
when a ch. 4 run is banked the two wordings will stand as two
source-scoped records rather than one merged "green".

**The variant question, stated plainly.** This run produced no
mechanical variant, and the reason is in the project's own
history: the curated table was built from these chapters, and
WP1 already followed ch. 5 where the chapters differ — ch. 5's
orifice row (tongue for the heart, ear for the kidneys)
corroborates the table 5-for-5 precisely because the table's
body entries rest on it. Ch. 4's divergent scheme （心's orifice
耳； 腎's 二陰） stands in the WP1 variant register, a document,
not a store. What this slice guarantees is the mechanism: the
store is source-scoped, a disagreeing record from another
chapter banks alongside rather than overwriting, and that
behaviour is pinned by a test that banks ch. 4's ears (Fire)
next to ch. 5's (Water). The first real variant will arrive
with the first ch. 4 run.

**One defect found and fixed during the run.** The first
execution banked 52 records, not 63: the east block's preamble
sentence also carries 在天為/在地為 clauses, and a reader that
takes the *first* sentence containing 在天為 reads the preamble
as the table and stalls on its non-phase 在地為化. The reader
now identifies the table sentence by clause count (the full
parallel table, 11 clauses, against the preamble's 2). The
52-record store was regenerated, never patched by hand.

## What the pipeline does not do

- **No promotion.** Nothing moves from the ingested store into
  `classify.ts`; promotion is a later, separately governed act.
- **No consumption.** The parser, the join, and
  `lookupClassification` do not read the store (pinned by test:
  `sorrow` and `azure` exist only as ingested records and the
  ordinary lookup returns nothing for them).
- **No gloss judgment.** Review is mechanical. A wrong gloss
  with a verbatim quote would pass review and be caught only by
  a human reader or a later audit — the records are marked
  machine-reviewed so nobody mistakes the check for more than
  it is.
- **One chapter, one reader.** The reader knows Suwen ch. 5's
  structures. Other chapters and other texts need their own
  readers; the stage machinery (acquire, segment, review,
  apply, the store) is text-agnostic, the reader is not.
- **Relational statements are out of shape.** Generation
  chains and 勝/傷 relations are real knowledge in the chapter
  that this store does not hold; they belong to an edge-shaped
  store, not this one.

## Gates

- `npm test`: **350/350** (340 baseline + 10 new in
  `test/fork-ingest.test.ts`).
- `npm run typecheck`: clean.
- `npm run fork:demo`: **29/29** expectations met.
- `npm run fork:sense`: Set A **11/11**, Set B **6/6**.
- Foundation files (`seed.ts`, `graph.ts`, `engine.ts`,
  `propagate.ts`, `wordnet.ts`) and `src/fork/classify.ts`
  untouched. Not pushed.
