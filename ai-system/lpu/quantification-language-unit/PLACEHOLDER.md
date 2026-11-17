# QuantificationLanguageUnit

- **Schematic address:** `lpu/quantification-language-unit`
- **Type:** Unit
- **State:** partial — **45% completed to goal** (set by us, assessed by the project, not measured or computed). Built 2026-11-17: `src/fork/quantification-language.ts` reads a parsed sentence's quantity content as mentions (numerals, quantifiers, implied counts, unit words) for the wired verbs (have/buy/give), and renders tracked quantities back into language (`renderQuantity`) — the turn loop's how-many reader speaks through it. The outbound direction beyond that reader (a reply object's quantity content mapped into wording choices for the Generator) is still to build, as with the LEDU and the Senses-Scening Unit.

## What this unit is

The owner's direction (2026-11-17): the QuantificationUnit —
inside the Ontology Knowledge Unit, over its Numbers slice —
has a language bridge in the LPU, the EDU/LEDU pattern: this
unit. It **uses the QuantificationUnit** (the "uses" cord on
the map, pointing at the QuantificationUnit's OKU home).

- **Inbound:** quantity as expressed in language, mapped into
  the QuantificationUnit's records:
  - **numerals** — number words (one..twenty, hundred,
    thousand standing alone) and digit strings;
  - **quantifier words** — all / some / none / each / every as
    quantity *kinds*: a bound where they bound ("some" = at
    least one, no number), a number only where they fix one
    ("none" = 0);
  - **construction-implied counts** — "between" → two (filed
    by the QuantificationUnit; realised in the scene graph),
    a bare plural → at least two, exact count unknown;
  - **unit words** — named through the UnitsMeasurement Unit
    (`units-measurement.ts`), never by a table of this bridge's
    own.
  SemanticAssessment consults this unit at creation: the
  mentions ride on the semantic object (`object.quantities`),
  with the OKU Numbers slice's filed reading attached to each
  numbered amount where one exists (five → Earth). The turn
  loop applies the mentions to the Session's ledger after the
  object is recorded.
- **Outbound:** a tracked quantity rendered back into language
  — number words up to twenty, digits beyond, the kind named
  and pluralised ("two apples", "5 apples", "one apple"). The
  how-many reader in the turn loop is its first speaker.

The mapping is language's; the framework is the
QuantificationUnit's. Another medium's bridge would maintain
its own mapping to the same unit.

## Extraction grain — stated plainly

The bridge reads the shapes the sentence layer actually
produces (verified against the parser, 2026-11-17): a numeral
stands as a node under the verb (have's theme, buy's patient,
give's theme), the counted kind as a sibling Earth node
(usually the verb's patient), a pronoun's stock as a modifier
of the numeral ("3 of them"), a quantifier as a loose node
("some" as a result, "no" as a theme, "all" modulating the
verb). Limits, recorded not hidden:

- mentions are produced for the verbs the authority wires —
  **have / buy / give**, the EN lexicon's quantity verbs;
- **compound number words are not composed** ("twenty five"
  is two nodes to the parser);
- a how-many question's own parse is mangled by the sentence
  layer ('How' stands as the agent, the counted noun is
  lost), so no mention is read from it — the how-many reader
  works from the surface and the ledger instead.

## Who uses it / who it uses

- **Uses:** the QuantificationUnit
  (`ontology-core/ontology-knowledge-unit/quantification-unit`)
  — the "uses" cord on the map; and, for unit words, its
  UnitsMeasurement Unit.
- **Used by:** SemanticAssessment, which consults this unit at
  creation for every object; and the turn loop's how-many
  reader, outbound.

## Where the working code lives today

`src/fork/quantification-language.ts` (built 2026-11-17), over
the authority in `src/fork/quantification.ts`. Before that,
numerals in a sentence were nodes in a parse and nothing more
— counted by nobody, answered from nowhere.
