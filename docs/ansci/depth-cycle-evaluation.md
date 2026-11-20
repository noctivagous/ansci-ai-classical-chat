# Depth-cycle desk evaluation — can Wuxing classify the parse-depth problems?

Run 2026-11-15, in the fork's desk-evaluation manner: predictions fixed
first, then scored against what the built system and the real data
actually say (classify table + WordNet climb for classifications,
FrameNet 1.5 bundle for valency signatures, the two cycles as scoring
dynamics). Raw probe output: `~/workspace/ansci-fork/depth-probe.mjs`
(script prints classifications, coherence scores, and FrameNet core-FE
signatures; scoring below is the evaluator's, from that output).

The three claims under test, from the proposal:

1. **Role-by-element** — in prepositional phrases, the filler's own
   element predicts its role (Metal filler → instrument, Earth →
   material, Water → content, human → accompaniment, direction →
   source), reducing dependence on imported FrameNet role mapping.
2. **Sense-by-coherence** — when a word has several senses, the correct
   reading is the one whose element coheres with the sentence's other
   classifications: generating adjacency counts for, restraint counts
   against (two scoring variants: A symmetric restraint, B restraint
   only when directed into the candidate).
3. **Valency-by-element** — a verb's semantic element (assigned from
   attested correspondence domains: weather → Water; creation → Earth;
   the five senses → their organs' elements, see→Wood/eye, hear→Water/
   ear, smell→Metal/nose, taste→Fire/tongue; emotion per the table;
   motion → Wood, descent → Metal) predicts its FrameNet signature:
   Water → no agent, no patient; Earth-creation → created-patient core;
   perception → stimulus core, never an affected patient; transfer →
   theme + recipient core; motion → theme core.

## Claim 1 — role-by-element: FAILS as a mechanism at current coverage

14 cases (with/from phrases). Score: **2 full · 1 partial · 11 fail.**

- The two full hits are substances: *flour* (Earth, table) → material ✓,
  *bread* (Earth) → material ✓. Where a classification exists and the
  sense is right, the rule fires correctly.
- **The claim's centre case does not classify.** The tool nouns it most
  needs — *corkscrew, hammer, pen, chopsticks, steel* — are
  unclassified: no table entry, and their climbs anchor on nothing.
  The ontology currently carries almost no artefact/material
  classification, so "Metal filler → instrument" has almost no Metal
  fillers to work on. Even *water* the substance is unclassified (it
  exists in the table only as an element, not as a concept).
- **A wrong climb:** *knife* climbs to Fire via the anchor *tongue*
  (@0.70) — an anatomical correspondence chain that is nonsense for an
  artefact. Climb anchors are correspondence concepts; artefacts climb
  badly through them.
- **The designed hard case fails as designed:** *sadness* is Metal
  (table, grief) and the rule predicts *instrument* for "spoke with
  sadness"; the gold role is manner. Element alone cannot distinguish
  a Metal *thing* from a Metal *state* — an animacy/substance gate must
  precede the element rule.
- **Sense precedes role:** *spring* in "water from the spring"
  classifies Wood — the *season* sense — so any role derived from its
  element inherits the wrong sense. Role-by-element is downstream of
  sense choice (claim 2), not independent of it.
- *East* → source works, but the role comes from the direction lexeme
  + preposition, not from its Wood address; the element adds nothing.

**Diagnosis:** the claim is not wrong in shape — it is starved. Its
precondition is a classification layer the ontology doesn't have yet:
artefacts and substances classified *by material* (wood/metal/stone/
water/flour), which is genuinely native to the correspondence
tradition (the five materials are classifiable things). That is
slice-1 content work, not parser work. Until it exists, role-by-element
can only ever fire on the substance minority.

## Claim 2 — sense-by-coherence: PARTIAL, weak — signal real, coverage-bound

8 probes (cold, spring, crane, fall × 2 contexts each).
Score: **2 full · 2 partial · 4 fail**, with a structural caveat.

- **Where context classifies, the signal works.** *Cold* in winter/
  wind/snow context: temperature (Water) scores 2 vs illness (Metal) 1
  under variant A — correct pick. *Fall* in leaves/harvest/cool
  context: season (Metal) 1 vs waterfall (Water) 0.5 — correct.
- **The illness context defeats both variants.** *Cold* beside cough
  (Metal) / fever (Fire): illness scores −0.5 under both variants and
  loses to temperature. The restraint term is the problem: fever
  (Fire) restraining Metal counts *against* the illness reading, but
  in the tradition that restraint relation is exactly the pathological
  picture — being restrained by a present factor is evidence *for* a
  state, not against it. A coherence score for states needs restraint
  handled asymmetrically: restraint into a candidate from a pathogenic
  context is corroboration, not contradiction. (For thing-senses the
  symmetric version behaved better — cold-temperature was variant A's
  cleanest hit.)
- **Most contexts are silent.** Crane (both contexts), spring-source,
  and half the spring-season context have *zero* classified context
  words — flowers, bloom, marsh, wings, steel, iron are all
  unclassified — so the scores tie at 0 and the mechanism has nothing
  to say. 4 of the 8 probes were decided by coverage, not by scoring.
- Variant B (directed restraint) tied where A discriminated
  (cold-temperature 2–2): B is strictly weaker here.

**Diagnosis:** coherence is a real but faint signal, usable as one
voter (with same-element matches weighted above adjacency), never as
the sole mechanism at current density. Its ceiling is set by the same
coverage gap as claim 1. And its restraint term needs the asymmetric
treatment before it can be trusted on states — which, notably, is the
same shape as the net's restraint-arbitration rule (a restrained
leaning is damped, not deleted; here it should be *read as evidence*).

## Claim 3 — valency-by-element: HOLDS at coarse grain, fails at fine grain

18 verbs scored against their FrameNet signatures (relevant sense).
Score: **13 full · 4 partial · 0 verb-level fails · 1 sub-claim fail.**

- **Weather (Water):** rain, snow, drizzle in Precipitation —
  core Precipitation/Place/Time. No agent, no patient, exactly as
  predicted. ✓✓✓
- **Creation (Earth):** build → Building [Agent, Components,
  Created_entity]; bake → Cooking_creation [Cook, Produced_food];
  make → Intentionally_create [Creator, Created_entity]. The
  created-patient is core in every case. ✓✓✓
- **Perception:** see, hear, smell, taste all land in
  Perception_experience/active [Perceiver, Phenomenon] — stimulus
  core, no affected patient, as predicted. ✓ for the shared
  prediction — **but the fine claim fails**: the four senses carry
  four different elements (Wood/Water/Metal/Fire by organ) and
  *identical* signatures. Element does no discriminating work inside
  the perception family; FrameNet sees one frame where the
  correspondence table sees four addresses. Whatever the organ
  elements are for, it isn't valency.
- **Transfer/motion (Wood):** give → Giving [Donor, Recipient, Theme]
  — the exact predicted signature ✓. go → Motion [Theme, Source,
  Path, Goal, …] and fall → Motion_directional [Theme, Source, Path,
  Goal, …]: theme core as predicted, but the path roles are also core,
  where the prediction said theme-only — partial. grow → Expansion
  [Item]: theme-only ✓.
- **Emotion:** worry → Experiencer_obj [Experiencer, Stimulus]:
  experiencer core ✓, stimulus core where the prediction said
  optional — partial. love → Experiencer_focus [Experiencer, Content]
  ✓.
- **Fire's hard case:** burn's combustion sense does not surface among
  its first FrameNet frames (Cause_harm's Victim is an affected
  participant, but of a different sense) — a sense-selection artefact,
  scored partial, and a reminder that claim 3 inherits claim 2's
  problem: an LU's frame list is a sense list.
- cut (Metal) → Cutting [Agent, Item, Pieces]: agent + patient core
  ✓, as predicted for the one Metal verb with a concrete prediction.

**Tautology check (owed, since verbs were grouped by domain and
frames are domain groupings):** the non-trivial residue is that
signature *shape* followed the prediction across unrelated frame
families — Giving, Motion, Building, Precipitation share no frame
relations, yet each matched its element-domain's predicted shape.
What element predicts is the *kind* of participant inventory
(created-thing / theme-in-motion / stimulus / nothing), not the
frame's identity. That is precisely the granularity the parser needs
to replace permissive valency with a *probable* frame: assign the
signature shape from the verb's element-domain, let FrameNet confirm
or correct the specifics when it has the verb.

## Bottom line

| claim | verdict | binding constraint |
|---|---|---|
| 1 role-by-element | ✗ now | artefact/material classification doesn't exist yet |
| 2 sense-by-coherence | ◐ weak | context coverage; restraint asymmetry for states |
| 3 valency-by-element | ✓ coarse, ✗ fine | sense selection upstream; no within-family discrimination |

Three findings that outlast the individual claims:

1. **All three claims bottleneck on the same thing** — classification
   coverage of ordinary things (tools, substances, plants, animals).
   That is the correspondence build-out (slice 1), now with a sharper
   shopping list: materials and artefacts by element are not decorative
   content; two parser mechanisms are waiting on them.
2. **The dependency order is sense → role/frame.** Every claim that
   failed did so partly because a wrong or missing sense propagated
   (spring, burn, knife). Sense work is upstream of depth work.
3. **What survives is immediately buildable:** valency *signatures* by
   element-domain as the derived-verb default (claim 3 coarse), with
   FrameNet as confirmation — this closes the biggest depth deficit
   (permissive valency) with Wuxing doing the predicting and FrameNet
   demoted to testimony, the fork's standing division of labour.
   Coherence joins as a weighted voter in sense choice once the
   restraint asymmetry is designed. Role-by-element waits for the
   materials classification.
