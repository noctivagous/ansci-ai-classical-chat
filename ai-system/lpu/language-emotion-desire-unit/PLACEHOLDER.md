# LanguageEmotionDesireUnit (LEDU)

- **Schematic address:** `lpu/language-emotion-desire-unit`
- **Type:** Unit
- **State:** partial — **45% completed to goal** (set by us, assessed by the project, not measured or computed). Inbound bridge built 2026-11-17: `src/ansci/ledu.ts` reads a word's emotion aspect for semantic objects (canonical face via the EDU, filed phase from the OKU table), and carries the EDU's larger-graph reach to language (`emotionReachForWord`). The outbound direction (an object's emotion aspect back into wording) is still to build.

## What this unit is

The owner's direction (2026-11-16): the LPU can make use of the
EmotionDesireUnit and will have a bridge or mapping that it maintains
inside — **LEDU, LanguageEmotionDesireUnit** — and it will make use of the
EDU.

The LEDU is the **language-side bridge** to the EDU, maintained inside the
LPU:

- **Inbound:** emotion and desire as expressed in language — "furious",
  "overjoyed", "longing to see her" — mapped into the EDU's 七情六欲
  framework (anger → Wood; a craving of the eyes → Wood by the orifice
  correspondence), so a semantic object's emotion and desire aspects carry
  the framework's readings, not ad-hoc labels.
- **Outbound:** an object's emotion or desire aspect mapped back into
  language — how this feeling would be said — for the Generator and the
  Verbalizer.

The mapping is language's; the framework is the EDU's. Another medium's
bridge (the future IDU for the Image Processing Unit) maintains its own
mapping to the same EDU.

## Where the working code lives today

Nowhere. Emotion words are currently classified directly in the
classification table without a bridge, and no outbound mapping exists.
