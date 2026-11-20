# SenseUnit

- **Schematic address:** `ontology-core/sense-unit` — inside the OntologyCore, beside the EmotionDesireUnit (owner's placement, 2026-11-17)
- **Type:** Unit
- **State:** partial — **40% completed to goal** (set by us, assessed by the project, not measured or computed). The naming authority built 2026-11-17: `src/ansci/sense-unit.ts` holds the channel framework as OKU-resident data (the three-list join below) and answers channel/discrimination lookups for the bridges; the one cross-channel implication the design names (overripe) is filed there as derived-tier knowledge. No larger-graph reach is built — unlike the EDU, this unit does not yet walk the OKU's graph from a channel's phase; its readers arrive with their own slices.

## What this unit is

The owner's direction (2026-11-17): a sentence is analysed for **all of the
different human senses**, and those senses are found in the Ontology
Knowledge Unit. This unit is the system's **medium-neutral authority on
the senses**, the same shape as the EDU one slice over: it names the
channels, what each channel distinguishes, and what each corresponds to,
and answers any medium's bridge unit:

- what sense is this, in the framework's terms;
- what it corresponds to (phase, organ, orifice — where the tradition
  files one);
- what values the channel can take (its discriminations).

**Settled (owner, 2026-11-17, the EDU pattern): the sense data lives in
the OKU** — the classification table and the correspondence graph hold
the phase rows, and the ch. 4 odour row is banked in the ingested store;
this unit is the specialist authority interpreting the sense slice, not
a private store. In code, the framework tables are held beside the
classification table (`src/ansci/sense-unit.ts`, as `edu.ts` holds 七情六欲),
and per-word phases are read FROM the OKU's tables by the bridges.

## Contents — the three-list join (owner's ruling, 2026-11-17: "1a, 2a")

The unit's contents are the **join of three provenance-labelled lists,
never silently harmonised**:

1. **Channels — 六根 / 六塵 (liùgēn / liùchén, "six roots / six dusts").**
   Eye → form/colour (sight), ear → sound (hearing), nose → smell,
   tongue → taste, body → touch, mind → mental objects. This list is
   the spine because it is the only classical inventory that carries
   body (touch) and mind as channels.
2. **Discriminations — Xunzi.** Tianlun's five 天官 (tiānguān,
   "heavenly faculties": ear, eye, nose, mouth, body/形 — body IS a
   faculty, and mouth does taste), and Rongru's assignments: the eye
   distinguishes white/black and beautiful/ugly; the ear, tones
   clear/muddy; the mouth, sour/salty/sweet/bitter; the nose,
   fragrant/fetid; bones, flesh and skin, cold/heat and pain/itching.
   These are what a language bridge maps words onto.
3. **Phase correspondences — the OKU's Suwen ch. 5 rows.** Orifices:
   eyes → Wood (liver), tongue → Fire (heart), mouth → Earth (spleen),
   nose → Metal (lung), ears → Water (kidney); the quality rows
   (colour, sound, voice, flavour) and the tissue row (skin → Metal).
   The odour row is Suwen ch. 4's, banked through the ingestion
   pipeline (臊 rank → Wood, 焦 scorched → Fire, 香 fragrant → Earth,
   腥 fishy → Metal, 腐 rotten → Water).

### Recorded tensions — labelled, not resolved

- **Taste is double-filed.** The Buddhist root is the tongue (→ Fire,
  and Suwen's tongue orifice agrees); Xunzi's faculty is the mouth,
  and Suwen's mouth orifice is Earth. Both stand, source-scoped.
- **Touch has no channel phase.** Its *values* carry phases (cold →
  Water, hot → Fire, filed as temperature), and its tissue (skin) is
  Metal; the channel itself is assigned no single phase — forcing one
  would be invention.
- **Mind's phase is unsettled**, as already recorded for the six
  desires in the EDU: the channel stands, its correspondence open.

## Boundary with the EDU

The SenseUnit owns the **channels**; the EDU owns the **cravings of
the channels** — the six desires （六欲） are per-root cravings, and
the EDU's desire table (`edu.ts`, SIX_DESIRES) references this unit's
root list by sense name rather than duplicating it. The two units
share the roots; each speaks for its own slice.

## Who uses it

- **Senses-Scening Unit** (`lpu/senses-scening-unit`) — language's
  unit, today: it produces the senses/scene part of a semantic
  object, consulting this authority.
- Other media's bridges, in the future, the same way the EDU is
  reached — noted, not drawn.

## Where the working code lives today

`src/ansci/sense-unit.ts` (built 2026-11-17). Before that, sense knowledge
existed only as scattered rows of the classification table (colour,
taste, temperature, body) with no authority naming the channels.
