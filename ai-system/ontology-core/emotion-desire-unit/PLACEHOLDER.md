# EmotionDesireUnit (EDU)

- **Schematic address:** `ontology-core/emotion-desire-unit` — inside the OntologyCore (owner's placement, 2026-11-16)
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed)

## What this unit is

The owner's direction (2026-11-16): a unit called **EmotionDesireUnit** at
the top level of the system. The LPU makes use of it through its own bridge
(the LEDU, inside the LPU); in the future an IDU will contact the EDU for
the Image Processing Unit, the same way.

The EDU is the system's **medium-neutral authority on emotion and desire**.
It holds the 七情六欲 (qīqíng liùyù, "seven emotions and six desires")
framework — the seven emotions and six desires, their phase and organ
correspondences — and answers any medium's bridge unit:

- what emotion or desire is this, in the framework's terms;
- what it corresponds to (phase, organ, and what the correspondence
  machinery can derive from there);
- how emotion and desire states relate to one another.

Per the retention rule, the EDU's answers never replace the concrete value:
the emotion as named (anger) and the moment as read (3:50PM, the day, the
year) are recorded alongside every classification.

## Who uses it

- **LEDU** (`lpu/language-emotion-desire-unit`) — language's bridge, today.
- **IDU** — the Image Processing Unit's bridge, in the future. Noted here at
  the owner's direction; not drawn on the map until the Image Processing
  Unit itself is placed.

## Where the working code lives today

Nowhere as a unit. Emotion classification exists as entries in the
classification table (`src/fork/classify.ts`) and emotion statements are
handled inside the turn loop (`src/fork/turn.ts`); the framework as a
framework — one authority every medium consults — is this unit, unbuilt.
