# NormalcyAssessment

- **Schematic address:** `lpu/normalcy-assessment` — inside the LPU, beside the Senses-Scening Unit (owner's placement, 2026-11-17)
- **Type:** Unit
- **State:** partial — **45% completed to goal** (set by us, assessed by the project, not measured or computed). The v1 bridge built 2026-11-17: `src/ansci/normalcy-assessment.ts` runs the three v1 determinations on every assessed person object and files the flags on its envelope. What is not built: the answered-earlier variant of self-redundancy is detected and priced but drives no reply move in v1; obviousness determinations for kinds without a degree profile; any reading of constructions (the bridge reads predications and tokens).

## What this unit is

The LPU's **bridge to the NormalcyUnit** (`ontology-core/normalcy-unit`),
in the Senses-Scening shape: the framework — the dimensions, their
standards, the filed word knowledge — is the authority's; the mapping
from TEXT is this bridge's. It reads a freshly assessed information
object (its parse, its surface, the Session as it stood before the
turn) and files **normalcy flags** on the object's **envelope**:
readings about the COMMUNICATION, never about the content, so they
ride the envelope side of the wall and the semantic core stays
untouched.

## Where it runs

Settled placement (owner, 2026-11-17): the bridge runs in the turn
loop **after Session & Situation and before CoherenceAnalysis**.
The interdependence is asymmetric: Normalcy supplies the flags
Coherence prices; Coherence supplies the content-incoherence
evidence behind the joint gibberish reading. CoherenceAnalysis
prices each flag **by kind**, in its own standings
(`src/ansci/coherence.ts`), and the priced flags are recorded as an
internal Awareness-side note on the turn trace.

**The hard rule:** a flag is an internal thought only. No reply text
ever contains the flag vocabulary or any verdict about oddity —
pinned by the specimen tests (`test/ansci-normalcy.test.ts`), which
scan every specimen reply for the verdict words.

## The three determinations (v1)

- **Obviousness** — a polar predication question whose subject and
  quality the authority's classifying-quality determination settles
  ("Is winter cold?"). The turn loop's definitional answer reads
  this same flag, so the move and the flag agree by construction.
- **Self-redundancy** — a question the Session record settles: a
  standing state IS the asked predication and the speaker stated it
  (the record answer, "You said so.", reads this flag), or the same
  question stands answered earlier (detected and priced; no move
  in v1).
- **Gibberish** — graded. Every content token of the utterance is
  read against the parse's token resolutions and the authority's
  attestation knowledge: the flag fires only when at least one
  token FAILED outright, none resolved directly, and none is an
  attested real word this parser could not place. Frequency and
  familiarity facts grade the strength (strong / moderate); they
  never fire the flag, and a rare real word never raises it.

## Who uses it

- The **turn loop** (`src/ansci/turn.ts`) runs it per assessed
  object and reads its flags at the reply sites: the record
  answer, the definitional answer, and the gibberish repair.
- **CoherenceAnalysis** prices its flags.

## Where the working code lives today

`src/ansci/normalcy-assessment.ts` (built 2026-11-17). The authority
it uses is `src/ansci/normalcy-unit.ts`.
