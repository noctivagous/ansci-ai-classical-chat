# NormalcyUnit

- **Schematic address:** `ontology-core/normalcy-unit` — inside the OntologyCore, beside the SenseUnit (owner's placement, 2026-11-17)
- **Type:** Unit
- **State:** partial — **35% completed to goal** (set by us, assessed by the project, not measured or computed). The v1 authority built 2026-11-17: `src/ansci/normalcy-unit.ts` files the three v1 dimensions with their standards, operationalises the obviousness standard over the OKU Classification's degree profiles, and serves the labelled table access (wordfreq frequency, the Glasgow Norms' nine dimensions) the bridges read. What is not built: any dimension beyond the three; any medium's bridge but text's; a norm for whole constructions (the dimensions read predications and tokens, not syntax).

## What this unit is

The system's **medium-neutral authority on the normal shape of a
communication**: what an utterance ordinarily carries, and what it is
for an utterance to depart from that — a question that asks what the
system already settles, a question the conversation itself already
settles, an utterance no content arrives in. It answers any medium's
bridge unit:

- whether a predication is **obvious** — settled by the OKU
  Classification without testimony (the standard below);
- what the filed knowledge says about a word's currency — its
  frequency (wordfreq), its familiarity and the other Glasgow
  dimensions — as **labelled facts about the communication**.

**The governing principle (owner's words, 2026-11-17): "we use these
things for knowledge for the ontology units about what is happening
in the communications but not to direct its values."** External
tables supply descriptive KNOWLEDGE (this word is rare; this wording
is unfamiliar); the system's VALUES — what counts as odd, the
pricing, the thresholds, every reply decision — remain its own, from
its own framework. Table values enter as labelled,
provenance-carrying facts; **no table number ever sets a price,
fires a flag by itself, or decides a reply.** CoherenceAnalysis
prices the bridge's flags BY KIND, in its own words; the tables'
numbers stop at this unit's knowledge.

## The dimensions (v1)

1. **Obviousness.** A predication is obvious iff the OKU
   Classification settles it without testimony: operationally, the
   asked quality is the subject kind's CLASSIFYING quality on an
   aspect of its filed degree profile — the quality the profile
   itself names as dominant for the kind ("winter is cold" holds by
   the kind's definition). Standards for kinds without a degree
   profile are not yet filed.
2. **Self-redundancy.** A question is self-redundant when the
   Session record already settles it — the speaker stated the
   predication, or it stands answered. The determination is the
   bridge's (it reads the record); the standard is filed here.
3. **Gibberish.** An utterance is gibberish when no content
   arrived. The discipline is strict: the flag requires
   token-resolution FAILURE — frequency and familiarity evidence
   only GRADE the flag's strength; a rare or unfamiliar REAL word
   (attested and resolvable) never raises it by itself.

**Not a dimension:** unanchored definites ("What table?") — a
comprehension gap, handled as a reply matter in the turn loop, not
an oddity of the communication. No flag rides on it.

## The banked knowledge

- **wordfreq** (Robyn Speer): per-word Zipf frequency, English,
  trimmed at Zipf ≥ 2.0 (95,641 words). Data CC BY-SA 4.0; see
  `data/wordfreq/manifest.json` and NOTICE.
- **The Glasgow Norms** (Scott et al. 2019): 5,553 words × nine
  dimensions — arousal, valence, dominance, concreteness,
  imageability, familiarity, age of acquisition, semantic size,
  gender association — each a mean with its SD and rater count,
  whole table imported. CC BY 4.0; see `data/glasgow/manifest.json`
  and NOTICE. Familiarity is wired to NormalcyAssessment in this
  arc; the other eight dimensions are prepared as labelled access
  for their consumer units (the scope extension, 2026-11-17) under
  the same principle — priors a consumer may weigh, never values
  that decide. **Gender association is guarded knowledge:** the
  access path exists and is labelled; in v1 its values must not
  change any price, flag, referent or pronoun decision, or reply —
  pinned by test.

## Who uses it

- **NormalcyAssessment** (`lpu/normalcy-assessment`) — language's
  bridge, today: it runs the determinations on text turns and
  files the flags on the information object's envelope.
- Other media's bridges, in the future, the same way — noted, not
  drawn.

## Where the working code lives today

`src/ansci/normalcy-unit.ts` (built 2026-11-17), with the table
loaders `src/wordfreq.ts` and `src/glasgow.ts`. Before this arc,
nothing in the system could say what was ordinary about an
utterance; oddity existed only as scattered steering behaviour.
