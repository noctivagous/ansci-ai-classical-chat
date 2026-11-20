# CSKG

Schematic address: `intake/cskg` · Type: Source · State: partial · 50% completed to goal

Relational commonsense tier. Since 2026-11-17 a trimmed subset of
its data ships in the repo (the bundle below); the full extract
remains a local install artifact, never shipped.

Working code today: src/ansci/cskg-feed.ts, cskg-ingest.ts

## The shipped bundle (2026-11-17)

`data/cskg/cskg-trim.tsv` — 80,466 edges, 4,570,217 bytes, plain
lean TSV (from, relation, to, source code) — is part of the repo:
the edges of the full extract that this feeder's mapping keeps,
produced by the Run 2 trim measurement (stage counts
6,001,531 → 2,959,631 → 2,849,806 → 80,466; per-source AT 74,683 /
CN 5,451 / CN|WN 311 / WN 21). The generation record stands in
`data/cskg/manifest.json`; license CC BY-SA 4.0 with ShareAlike on
the bundle data (see NOTICE). Re-trimming runs against the locally
installed full extract (data/raw/cskg/, via scripts/install.mjs)
with the committed script `scripts/build-cskg-bundle.mjs`
(`npm run ansci:build-cskg-bundle`) — the measurement's staged
procedure, calling the feeder's own `mapTriple`; it regenerates
the bundle and its manifest, and its first run (2026-11-18)
reproduced the shipped trim byte-identically.

Loader order (src/ansci/cskg-ingest.ts): the shipped bundle first;
the full extract when the bundle is absent; an explicit extract
choice (the path option or ANSCI_CSKG_TSV) forces the extract;
neither present is the reported "absent" state. The bundle is
pre-trimmed but is still read through mapTriple, so both sources
share one mapping path and one kept/dropped accounting.

## The feeder's mapping (cskg-feed.ts, widened 2026-11-17)

Concept relations — both ends must classify (curated table in
classify.ts, or the WordNet climb in wordnet-lex.ts), or the triple
drops as `unclassified-endpoint`:

| CSKG relation | Fork kind | Notes |
| :--- | :--- | :--- |
| Causes | causal | |
| UsedFor | function | |
| AtLocation | location | |
| HasSubevent | subevent | ordered — procedure chain |
| HasPrerequisite | prerequisite | ordered — procedure chain |
| CapableOf | capability | added 2026-11-17 |
| PartOf | part | added 2026-11-17 |
| HasProperty | property | added 2026-11-17 |
| Desires | desire | added 2026-11-17 |
| MadeOf | material | added 2026-11-17 |
| IsA | classification-evidence | asserted: false — evidence, never an assertion |
| RelatedTo | association | kept only when both ends classify |

ATOMIC relations — the `at:*` family as spelled in the extract
(nine relations, enumerated from the data, 711,453 edges). These
never take the concept route; they anchor by the event rule below:

| CSKG relation | Fork kind | Notes |
| :--- | :--- | :--- |
| at:xNeed | prerequisite | ordered — what PersonX needed before the event |
| at:xEffect | consequence | what follows for PersonX |
| at:oEffect | consequence | what follows for others |
| at:xReact | reaction | the feeling the event produces in PersonX |
| at:oReact | reaction | the feeling it produces in others |
| at:xWant | desire | what PersonX wants next |
| at:oWant | desire | what others want next |
| at:xIntent | intent | why PersonX did the event |
| at:xAttr | attribution | the trait the event shows PersonX to have |

The extract carries no at:IsBefore / at:IsAfter / at:HinderedBy —
ATOMIC's sequence and hindrance relations are not in this merge —
so there is nothing to map there.

## The ATOMIC anchoring rule (v1, deliberately strict)

ATOMIC endpoints are event phrases ("personx gives persony a hug"
→ "feels tired") that the concept table cannot classify. An ATOMIC
triple anchors iff:

1. the event side's **head verb** — the first token of the
   normalised event phrase, after the PersonX/PersonY placeholders
   and auxiliaries, that the system knows as a verb (hand lexicon
   or the WordNet verb provider) — exists; and
2. the other side's **head word** — the first content token of the
   effect/reaction phrase whose lemma resolves through the same
   classifiability route as the concept relations (curated table
   or WordNet climb) — exists.

Anchored links keep the full normalised phrases as from/to (the
testimony is the phrase pair) and carry
`anchoring: { rule: "event-rule", verb, headWord, headVia }` so the
record says how it was placed. Unanchored triples drop with the
named reason `unanchored-endpoint`, counted in ingestion like every
other drop. The rule is strict on purpose: most ATOMIC phrases
anchor on neither condition and drop — a small honest yield beats
a large loose one. Yields per relation are measured, not assumed:
see the trim measurement reports (Run 1 / Run 2) in
~/workspace/cskg-trim-measurement-report.md.

## What stays unmapped, and why

Everything else in the extract drops as `unmapped-relation`:
Synonym, Antonym, SimilarTo, DistinctFrom (lexical relations —
the nets' own territory, not testimony); FormOf, DerivedFrom,
EtymologicallyRelatedTo, EtymologicallyDerivedFrom (word-form
history, not relational knowledge); HasContext, LocatedNear,
HasA, MannerOf, ReceivesAction, DefinedAs, InstanceOf, CreatedBy,
Entails, SymbolOf, HasFirstSubevent, HasLastSubevent,
MotivatedByGoal, CausesDesire (not commissioned; several are
plausible future mappings, none is silently absorbed); the
negations NotDesires, NotCapableOf, NotHasProperty (a positive
mapping would invert their meaning — negation needs its own
treatment, not a kind); mw:MayHaveProperty and fn:HasLexicalUnit
(source-internal bookkeeping); the dbpedia:* family (encyclopedic
facts — Wikidata's tier, when it comes, not this feeder's).

This is a placeholder: the unit's home in ai-system/ exists so the tree and the map agree. Its implementation migrates or is built here in a gated slice; until then the working code stays where PLACEHOLDER.md says it is.
