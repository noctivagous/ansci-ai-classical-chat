# Form — Curves, Proportion and Repetition — design note (2026-11-20)

The design record for **Form**: a division of **Mathematics**,
inside the QuantificationUnit's parent unit in the Ontology
Knowledge Unit, holding the system's forms of variation —
**Curves** (form over a continuum), **Proportion** (form
between magnitudes), and **Repetition** (form over count).
Mathematics answers *how much* through its Number division;
Form is the division that answers *in what shape*.

**Status: DESIGN ONLY.** Nothing in this note is built, and
no seat is created by it. The placement (one division, named
Form, inside Mathematics), the trio's unity, the testimony
boundary, and Scheduling's consumption of Repetition were
settled by the owner in conversation on 2026-11-20 and are
marked SETTLED where they appear. Record shapes, the preset
seed, slice definitions and protocols are this note's
PROPOSALS, stated so they can be ruled on. The build slices
in §9 are PROPOSED, not commissioned. Open questions are
collected in §10 and are decided nowhere in this note —
including the Form-versus-Space remit question, which is
stated there fairly both ways and adjudicated nowhere.

## 0. Basis — what this design rests on

Read before writing. Trees are named per source, because
the record this note designs against stands in more than
one state at once:

- **This note's own tree** — main
  `e5ad6de` (fetched fresh in `~/workspace/ansci-git`
  2026-11-20). At fetch time the probe-2 programme and the
  geography slices G1–G3 **had** reached origin/main (the
  landing commits `d0bc5eb` and `e5ad6de` stand on top of
  `a093f57`), so the weather, dictionary and geography
  machinery is cited from main. The two preceding design
  notes had **not** landed: the geography note and the
  time note stand on their branches, and are cited from
  there, exactly as those notes cited the then-unmerged
  work of their day.
- `ai-system/ontology-core/ontology-knowledge-unit/mathematics/PLACEHOLDER.md`
  and `docs/ansci/mathematics-placement.md` — main. The
  recorded placement, on the owner's direction and ruling
  of 2026-11-18, built 2026-11-19: **Mathematics** is a
  Unit (placeholder, **0%**) seated inside the OKU at
  `ontology-core/ontology-knowledge-unit/mathematics`,
  order 3 among the OKU's children — a container, not a
  solver, with no code and no machinery of its own. Its
  residents: the **QuantificationUnit** (45%), moved one
  level down under Mathematics in that placement, staying
  over its **Numbers slice**, with the UnitsMeasurement
  Unit nested inside it; and the **Geometry Unit**
  (placeholder, 0%), seated at
  `…/mathematics/geometry-unit`, order 2 inside
  Mathematics. Of the Geometry Unit the record states,
  verbatim in substance: *a seat only — its contents have
  never been stated; nothing is designed or built*; and,
  per the same ruling, **no Geometry need kind is
  registered until the Geometry Unit is built** —
  geometry-shaped problems route nowhere and are not
  forced under "quantification". §2 designs Form against
  exactly this record, no stronger.
- `ai-system/ontology-core/ontology-knowledge-unit/mathematics/quantification-unit/PLACEHOLDER.md`
  — main. The QuantificationUnit as it stands: the
  specialist reader of its OKU slice, keeping no private
  number lore (the EDU/SenseUnit pattern); the quantity
  ledger held on the Session, whose records are
  **appended, never edited** — the latest record for a
  (holder, kind) is the current amount, and every earlier
  record stands. That append-only discipline is the
  repo's standing lineage model, and §3.3 applies it to
  edited curves. The same file records the Luoshu as
  machinery built into the unit — numbers 1–9 in the nine
  palaces, every line summing to 15 — an attested named
  arrangement the system already holds, cited in §4.2 as
  precedent, not as a Form holding.
- `ai-system/ontology-core/ontology-knowledge-unit/mathematics/quantification-unit/units-measurement-unit/PLACEHOLDER.md`
  and `src/ansci/units-measurement.ts` — main. The
  UnitsMeasurement Unit: conversion between units stated
  as **factors** — a stated ratio per unit against its
  dimension's base. Proportion-as-machinery already stands
  in the system, inside the QuantificationUnit; §4
  designs Form's proportion records against it rather
  than beside it.
- `docs/ansci/time-scheduling-design-note.md` — branch
  `track/time-design` (worktree
  `~/workspace/ansci-track-time-design`), §2 and §3 read
  in full. **Timekeeping**: clock readings are
  consultations; the Situation frame is the conversation's
  *stated* time; arithmetic is not Timekeeping's (it
  belongs to Quantification's Mathematics — the time
  note's own boundary, which §2.3 of this note relies
  on). **Scheduling** (§3 of that note): commitments held
  as records in a session-scoped register; a trigger is a
  **time**, or **time + condition**; registration is not
  authorisation; Scheduling never acts — a due item raises
  a demand on the Planner. Its §3.3 states, as out of
  demonstrator scope: *recurring calendars*. §5.3 of this
  note specifies the Repetition boundary against exactly
  that record: the pattern's home is Form; admitting a
  periodic trigger is Scheduling's extension, and this
  note does not silently extend it.
- `docs/ansci/geography-design-note.md` — branch
  `track/geography-design` (worktree
  `~/workspace/ansci-track-geography`), §2 read for the
  register discipline: per-fact provenance in the
  retrieved discipline, per-kind shelf lives, banking of
  only what was actually consulted. Form's holdings
  (§3.3, §4.1, §5.1) follow the same discipline: a form
  is held with where it came from, or it is not held.
- `ai-system/functions/PLACEHOLDER.md` (as read for the
  time note) — main. The **Functions Unit** (schematic
  address `capabilities`): the library of operations —
  generic functions over abstract material; a function
  takes material and returns material; **it knows
  nothing, decides nothing, testifies to nothing**. Its
  families stand as placeholder seats, none built:
  Ordering And Sorting, Search, Editing, ExternalQuery,
  FileSystem. The machinery/knowledge split this note
  uses throughout is that file's: what *operates* is a
  Function or a unit's machinery; what is *held and
  cited* is knowledge in a unit's keeping. Form is
  designed on the knowledge side of that split (§2.2).
- `src/ansci/sentence.ts` — main. The two Five Element
  cycles stand in code as constants: `GENERATES`, the
  generating cycle (sheng): Wood→Fire→Earth→Metal→
  Water→Wood; and `CONTROLS`, the controlling cycle
  (ke): Wood→Earth→Water→Fire→Metal→Wood. These are
  attested traditional cycles the system already
  traffics in — §5.2's standing examples of worldly
  cycles stated as repetitions.
- `src/ansci/session.ts` — main. The Awareness frame's
  conventions: `SEASON_CONVENTION` (meteorological
  seasons by month, northern hemisphere — a cycle of
  four over twelve months) and `DAYPART_CONVENTION`
  (dayparts by hour: dawn, midday, dusk, night — a cycle
  of four over twenty-four hours). Two more standing
  repetitions, held today as connective-layer conventions
  in the frame's code — §5.2 cites them as evidence of
  the traffic, not as Form holdings awaiting a move.

## 1. The settled design (owner, 2026-11-20)

- **One division, three members (SETTLED).** Curves,
  Proportion and Repetition are not three designs. They
  are the three ways a quantity can have form: a curve
  is form over a **continuum** (how a value varies across
  a domain), a proportion is form **between magnitudes**
  (how one quantity stands to another — the relation that
  survives resizing), a repetition is form over **count**
  (how a thing recurs — the pattern that survives
  translation). They are designed together, in one
  division, because each is stated in the others' terms
  soon enough: a repetition is a curve's period read off
  it; a proportion is the constant a family of curves
  shares; a cycle is a repetition whose domain is time.
- **The division is named Form (SETTLED).** The name
  says the unifying thing — the shape of variation —
  without claiming Geometry's remit (see §10, first
  question, for the remit question the name deliberately
  does not settle).
- **Placement (SETTLED, as an equation).** Mathematics =
  **Number** (arithmetic, counting, duration — what
  stands) + **Form** (this trio) + **Space** (Geometry,
  the unbuilt placeholder). Number answers *how much*;
  Form answers *in what shape*. §2 states this against
  the recorded tree, including the one point where the
  conversation's shorthand and the record differ.
- **Curves are first-class, and so are their edits
  (SETTLED).** A curve may be named, held, asked about
  and applied. An edited curve is a new curve that keeps
  its lineage — the banked-provenance discipline applied
  to forms (§3.3).
- **An animation curve is a Curve whose domain is time
  (SETTLED).** Form owns the curve; Timekeeping owns the
  clock it plays against (§3.4). Neither annexes the
  other.
- **Scheduling consumes Repetition (SETTLED).** A
  periodic trigger is Form's pattern lent to a
  commitment. Form owns the pattern; Scheduling owns the
  commitment (§5.3).
- **Form originates no world claims (SETTLED).** Worldly
  cycles and proportions enter through the testimony
  gates like any knowledge. Form holds the *forms* by
  which such claims are stated and checked (§6).


## 2. Placement — Mathematics and its three divisions

### 2.1 The recorded tree, stated exactly

The seats as they stand on main today (Mathematics
placement, built 2026-11-19 on the owner's 2026-11-18
ruling):

```
ontology-core / ontology-knowledge-unit (the OKU)
└── mathematics            Unit, placeholder, 0% — a container, not a solver
    ├── quantification-unit   45% — over the Numbers slice
    │   └── units-measurement-unit   (nested inside it, as before)
    └── geometry-unit         placeholder, 0% — a seat only;
                              contents never stated, nothing designed or built
```

Form is proposed as a third resident of Mathematics,
beside these two:

```
    └── form                  PROPOSED — the division this note designs
```

### 2.2 The equation, mapped onto the tree

The owner's settled equation (§1) names three divisions
of Mathematics. Mapped onto the recorded seats:

| Division | Answers | Its seat as the record stands |
| :--- | :--- | :--- |
| **Number** | how much | The QuantificationUnit's remit — the Numbers slice it reads, the ledger it keeps, the arithmetic the time note already assigns to "Quantification's Mathematics". Number is not a new seat; it is the standing unit's division, named in the equation. |
| **Form** | in what shape | **New** — this note's proposal (§2.1). No seat exists; nothing about Form stands anywhere in the system today. |
| **Space** | (unbuilt) | The Geometry Unit's seat — a placeholder whose contents have never been stated. This note designs nothing for it and claims nothing about it beyond the record. |

One reconciliation, stated plainly because the note must
not paper over it: in the conversation of 2026-11-20 the
placement was spoken of as "in the Mathematics Unit",
and the commissioning shorthand placed Form "inside the
QuantificationUnit". The recorded tree has the nesting
the other way — the QuantificationUnit stands *inside*
Mathematics (2026-11-18 ruling, 2026-11-19 placement),
and Mathematics is the container. The settled equation
itself resolves the reading: Form is a **co-division of
Mathematics**, sibling to the QuantificationUnit's
Number remit and to the Geometry seat — not a sub-part
of the QuantificationUnit, whose slice is Numbers and
whose lore is number lore. If the owner intended the
other nesting, that is a ruling to make; it is recorded
in §10 with the map-wording question, and this note
proceeds on the equation.

### 2.3 What Form is, in the house pattern

Form follows the pattern the QuantificationUnit's own
statement names — the EDU/SenseUnit pattern: **the
specialist reader of its slice, keeping no private
lore**. Its slice is not a slice of the correspondence
graph; it is the register of forms (§3.3, §4.1, §5.1):
presets, held curves, named proportions, known cycles.
What the tradition files about a form — that this cycle
is the sheng cycle, that this ratio is the one a
calendrical rule states — lives in the OKU as knowledge,
entered through the gates (§6); Form reads and applies
it, and where the slice is silent, the absence is the
record. Form does not invent a period for a cycle the
record does not file, any more than the QuantificationUnit
invents a phase for a number the Numbers slice does not
file.

Form is **not a Function**. The Functions Unit's
discipline — knows nothing, decides nothing, testifies
to nothing — is the opposite of a division that *holds*
named presets and attested proportions as citable
knowledge. The acts Form performs over its holdings
(evaluate a curve at a point, compare two proportions,
detect a repetition in a sequence) are a unit's
reasoning acts over its own slice, in the same posture
as the ledger's computations are the QuantificationUnit's:
machinery in service of held knowledge, not a library
operation over abstract material. If a future design
wants curve evaluation as a generic Function any process
may call, that is a Functions question; this note does
not pre-decide it (§10).

### 2.4 Neighbours, and the cords between them

- **Number (the QuantificationUnit).** Form *uses*
  Number's results — counts, durations, computed
  amounts — and does not recount. A curve's value at a
  point is a number; the arithmetic that produces it is
  Mathematics' shared machinery, and the count of a
  repetition's recurrences is a count. The border is
  the equation's: Number says how much, Form says in
  what shape, and a question that needs both cites both.
- **UnitsMeasurement (inside the QuantificationUnit).**
  Its conversion factors are proportions already at
  work (§4.3). Form's proportion records must be able
  to *cite* a conversion factor as a proportion without
  duplicating it — the factor's home stays where it is.
- **Timekeeping (Functions, per the time note).**
  Supplies clock readings — the domain values an
  animation curve is evaluated at (§3.4). Form supplies
  no clock and reads none directly.
- **Scheduling (Functions, per the time note).** Consumes
  Repetition (§5.3). Form supplies patterns and never
  registers, fires, or cancels a commitment.
- **The knowledge graph (the OKU's correspondence
  graph).** Worldly cycles and proportions are filed
  there as knowledge with provenance (§6). Form's known
  cycles (§5.1) *cite* graph filings; the graph is not
  Form's register and Form's register is not the graph.

## 3. Curves

### 3.1 What a curve is, as a held object

A curve is a held object in Form's register: a stated
relation between a **domain** (what varies along it —
time, distance, a count, any quantity another unit can
supply values of) and a **range** (the value the curve
gives back). It is held in one of three forms, and the
form it is held in is part of the record:

- **A stated function** — a closed form the system can
  evaluate (a line, a parabola, a sine), stated in the
  record in terms the evaluator shares.
- **Control points** — a finite set of (domain, range)
  points with a stated interpolation between them (the
  edited-curve form: what an editor, human or otherwise,
  actually produces). The interpolation rule is part of
  the record; a set of points with no stated rule is not
  yet a curve, and §8 declines it as one.
- **A named preset** — a reference into the preset canon
  (§3.2): the curve is the preset, cited by name, with
  the canon's own statement of it standing behind the
  name.

Every curve record states its **domain interval** — the
stretch of the domain it is defined over. A curve is
not silently defined outside it (§8).

### 3.2 Presets — the canon, and where a canon comes from

A preset is a curve the system holds *by name*, so that
a name in a conversation, a design, or another unit's
record can cite it: the easing family is the standing
example class — the straight line (the degenerate case:
constant rate, the preset every family includes), the
ease-in (slow start), the ease-out (slow end), the
ease-in-out (the S-curve), and their kin. A preset is
held as a curve record (§3.1) whose provenance is the
canon it came from.

**This note does not invent the canon, and does not
adopt one.** It records where a canon would come from,
on the precedents by which canons have entered this
system before:

- **Banked intake from an attested source, with
  provenance** — the route of the Suwen number row into
  the Numbers slice, and of the retrieved banks
  (Wikidata, the geography register): a published,
  citable statement of the curves (the easing literature
  has such statements — published easing equations, and
  at least one public specification of named easing
  functions — named here as *candidate sources*, adopted
  nowhere in this note), ingested as records whose
  SourceRecords name the source.
- **The owner's authoring or ruling** — the route of the
  frame's conventions (`SEASON_CONVENTION` and
  `DAYPART_CONVENTION` are connective-layer conventions
  set by the project) and of the Luoshu's arrangement:
  the owner states the canon, or rules on a proposed
  one, and the ruling is the provenance.

Which route, and which source, is the owner's question
(§10). Until a canon is entered, the preset register
stands empty, and a question that names a preset takes
the unknown-preset decline (§8) — the absence is the
record, stated as such, never filled by a plausible
curve drawn from the name's sound.

### 3.3 Lineage — an edit is a new curve

An edited curve is a **new curve record**, not a
modification of the old one. The discipline is the
quantity ledger's, applied to forms: records are
appended, never edited; the new record **cites its
parent** (the curve it was edited from) and states the
edit in the editor's terms (points moved, a preset
parameter changed, the domain re-stretched); the parent
stands, citable, exactly as it was. A curve's lineage
is the chain of those citations, and any answer that
rests on an edited curve can be audited back along it —
the same audit the banks' provenance gives a fact.

Two consequences, stated because they are the point of
the discipline:

- **Nothing is silently re-shaped.** A consumer who
  cited a curve by its record cites the curve as it
  stood; an edit does not reach back and change what an
  earlier answer rested on. A consumer who wants the
  current form asks for the latest in the lineage, and
  the register says which that is.
- **A broken lineage is a located gap, not a quiet
  repair.** A curve record whose cited parent is not
  held cannot be audited; §8 declines on it rather than
  treating the orphan as a first curve.

Whether edits are *authored conversationally* at this
rung — a visitor shaping a curve in talk — or only held
and applied, with editing done by whatever surface
already edits things, is the owner's question (§10).
The lineage discipline is specified either way, because
it constrains any surface that edits.

### 3.4 Asking and applying

A curve is **asked about**, and the questions are Form's
reasoning acts over the record:

- **Value at a point** — the curve evaluated at a stated
  domain value, inside its domain interval. The answer
  is a number, produced by Mathematics' machinery, cited
  as the curve's value — a computation, stated as one.
- **Monotonic?** — whether the curve never decreases (or
  never increases) over a stated stretch, answered from
  the held form: exactly for a stated function, from the
  points and the interpolation rule for a control-point
  curve — and where the held form cannot decide it, the
  answer says so rather than sampling hopefully (§8).
- **Steepest where?** — the domain point of greatest
  rate of change over a stated stretch, with the same
  honesty condition: exact where the form allows, an
  evaluated answer with its method stated where it does
  not, a decline where neither stands.

A curve is **applied**: another unit supplies the domain
values and takes the range values — an animation takes
times and gets positions or opacities; a schedule of
readings takes distances and gets the curve's stated
fall-off. Application does not move the curve into the
consumer: the consumer cites the curve's record, and
Form remains its keeper.

**The animation case, stated once and plainly:** an
animation curve is a Curve whose domain is time. Form
owns the curve — its shape, its presets, its lineage.
Timekeeping owns the clock — what time it is, by a
reading, is Timekeeping's consultation, and the frame's
stated time is the frame's. An animation evaluated "now"
is Form evaluating its curve at a value Timekeeping
supplied; if no clock reading stands, the evaluation
declines at the missing reading, exactly as the time
shapes decline — Form does not read a clock to fill the
gap, and does not pretend the frame's stated time is a
reading.


## 4. Proportion

### 4.1 The relation record

A proportion is a held **relation between magnitudes**:
two (or more) quantities, the magnitudes they measure,
and the **ratio stated** — the record says what stands
to what, as what. A proportion record carries:

| Field | Content |
| :--- | :--- |
| terms | The magnitudes related, each stated with what it measures and in what unit, if any. A ratio between magnitudes of different dimensions is not a proportion until a stated relation makes them comparable (§8). |
| ratio | The stated relation — as a factor, a fraction, or a named proportion (§4.2). The record holds the ratio as stated by its source, not re-derived into a decimal it never claimed. |
| provenance | Where the relation comes from: an attested filing in the knowledge graph, a conversion factor cited from UnitsMeasurement (§4.3), a banked intake, or the owner's ruling. A proportion with no provenance is not held. |
| standing | What the record may be used for: cited in an answer, used to scale a quantity, checked against a claimed relation. A proportion held as knowledge is not thereby a licence to recompute anyone's holdings with it. |

Proportion's reasoning acts are the ones the record
supports: **state** the ratio between two held
magnitudes; **compare** two proportions (equal, greater,
lesser — Ordering's question asked of Form's records,
answered from the stated ratios); **scale** — given a
proportion and one term's value, give the other's, as a
computation whose derivation the answer can show (the
OSRM precedent from the geography design: a computation
states its inputs and is never presented as testimony).

### 4.2 Named proportions — held as knowledge, canon uninvented

Some proportions are held **by name**, the way presets
are: **doubling** and **the half** are the plain cases —
relations a conversation can cite without stating a
ratio. Beyond those, this note names no canon. The
system already holds attested named arrangements that
are proportion-shaped, and they are cited as precedent
for how such knowledge stands, not annexed as Form
holdings: the **Luoshu** (every line summing to 15, the
centre 5 — a stated invariant, held today as the
QuantificationUnit's built-in machinery), and the
**Suwen number row** in the Numbers slice (filed
correspondences, held in the OKU). A canon of named
proportions — which relations earn names, from what
attested source — enters by the same two routes as the
preset canon (§3.2): banked intake with provenance, or
the owner's authoring. Until then, a name the register
does not hold takes the same honest decline as an
unknown preset (§8).

### 4.3 The standing machinery — conversion factors

The UnitsMeasurement Unit already trades in proportions:
every conversion factor *is* a stated ratio between a
unit and its dimension's base. Form's design does not
duplicate that table. A proportion record may **cite** a
conversion factor as its ratio (the citation names the
UnitsMeasurement record as its source), and a question
that is really a unit conversion is answered by
UnitsMeasurement as today — Form is not a second
conversion route. What Form adds is the general record:
proportions whose terms are not units, held, named,
compared and scaled under one discipline.

## 5. Repetition

### 5.1 The pattern record

A repetition is a held **pattern**: a repeating unit,
its **period** (the domain distance between recurrences
— in time, in count, in whatever domain the pattern
runs over), and its **phase** (where in the period a
stated point falls). A pattern record carries the unit
that repeats, the period and phase as stated by its
source, and its provenance — a known cycle (§5.2) is
held the way a named proportion is: as knowledge, cited,
not re-derived from the name.

A repetition is also a *claim about a sequence*: that
this sequence recurs with this period. Holding the
pattern and detecting it in material are different acts,
and §5.2 keeps them apart.

### 5.2 Detection — the reasoning act, and its evidence floor

**Detection** is Repetition's reasoning act: given a
sequence — of values, of events, of turns — determine
whether it repeats, and if so, with what period and
phase, and whether the pattern it matches is a cycle
the system already knows ("this sequence repeats; this
cycle is the daypart cycle"). Detection is an assertion,
and assertions have a floor:

> **The evidence floor (PROPOSED, stated so it can be
> ruled on):** a repetition may be asserted only when
> the sequence shows **at least two full periods** —
> the repeating unit observed complete at least twice,
> three occurrences of its boundary. One recurrence is
> a pair, not a pattern; a period fitted to less is a
> guess wearing a period's clothes. Below the floor,
> the honest answers are "not enough sequence to tell"
> (§8) or a stated candidate offered *as* a candidate —
> never an asserted period.

The known cycles are the patterns detection matches
against, and the standing examples are already in the
record (§0): the **generating cycle** (sheng) and the
**controlling cycle** (ke) over the five elements —
period five, over the domain of elements; the
**seasons** — period four over twelve months, under
`SEASON_CONVENTION`; the **dayparts** — period four
over twenty-four hours, under `DAYPART_CONVENTION`.
These stand today as code constants and frame
conventions. Form's design gives them a second, citable
statement as pattern records — the *form* of the cycle,
held in the register, citing the convention or the
tradition as its source. The conventions stay where
they are and keep doing their work; Form's record is
how the cycle can be *named, asked about, and matched
against* — not a migration of the machinery.

### 5.3 The Scheduling boundary — patterns lent, commitments kept

Scheduling (time note §3) holds commitments: records
with a trigger that is a time, or a time plus a
condition. A **periodic trigger** — fire every period,
at this phase — is a trigger stated as a Repetition.
The boundary, settled by the owner and stated here
against that note:

- **Form owns the pattern.** The period, the phase, the
  pattern's identity and provenance are Form's record.
  A Scheduling item that fires periodically *cites* a
  pattern record, the way a curve's consumer cites the
  curve.
- **Scheduling owns the commitment.** Whether the item
  exists, what it owes, when it lapses, and the demand
  it raises when due are Scheduling's record and
  Scheduling's discipline (registration is not
  authorisation; a due item raises a demand; the Planner
  prices it). Form registers nothing, fires nothing,
  and cancels nothing.
- **Neither note silently extends the other.** The time
  note's demonstrator scope states recurring calendars
  out of scope, and its trigger grammar is time /
  time+condition. Admitting a periodic trigger — a
  trigger whose statement is a cited Repetition — is an
  extension of Scheduling's design, to be taken up in
  Scheduling's terms when it is taken up. This note
  specifies what Scheduling would cite, and stops there.
  What Form guarantees the citation: the pattern record
  is stable under the citation (a later edit to the
  pattern is a new record in a lineage, §3.3's
  discipline applied to patterns as to curves — the
  commitment cites the pattern as it stood, and a
  Scheduling item that wants the current pattern asks
  for the lineage's latest, explicitly).

**Monitoring** — chartered in conversation the same day
as a Unit that watches something at an interval — is
the standing consumer this boundary anticipates: an
interval *is* a period, and a monitor's interval would
be stated as a Repetition it cites. Monitoring's own
design is not this note's; the citation discipline
above is all this note settles for it.

## 6. The testimony boundary — what Form never does

Form holds **forms**: the shapes by which variation is
stated, named and checked. It originates **no world
claims** (SETTLED, §1). Stated against the system's
standing disciplines:

- **Worldly cycles and proportions are knowledge, and
  enter as knowledge.** That a river runs a seasonal
  cycle, that a calendrical rule states such-and-such a
  ratio, that a tradition files the sheng cycle — each
  is a claim about the world or a tradition, and it
  enters through the testimony gates (banked intake with
  provenance, or the owner's ruling) into the knowledge
  graph, like any claim. Form's register then holds the
  *form* of the filed cycle — its period, its phase, its
  unit — citing the filing. Form does not testify that
  the river does anything.
- **A detected repetition is a computation over given
  material, stated as one.** Detection (§5.2) asserts
  something about *the sequence it was given* — no more.
  It does not promote the sequence's pattern into a
  claim about the world the sequence came from; that
  promotion, if anyone makes it, is a knowledge claim
  and faces the gates.
- **A curve's value is a computation, never testimony.**
  §3.4's answers cite the curve and the evaluation. A
  curve fitted to worldly data does not become a witness
  about the world by being held in Form.
- **Form never speaks for another division.** It does
  not recount (Number), does not read a clock
  (Timekeeping), does not register or fire (Scheduling),
  and does not state what a place contains or where it
  lies (the geography register). Its answers are about
  shape, and say so.


## 7. Worked chains

### 7.1 An animation curve, evaluated now

```
"where is the marker in its sweep right now?"
  → the sweep is a held Curve (domain: time; a preset or an
    edited curve, cited by its record)
  → "now" is a clock value: Timekeeping's consultation
    supplies the reading — or no reading stands, and the
    chain declines there (§8), at the missing clock,
    exactly as the time shapes decline
  → Form evaluates its curve at the reading: the value is
    a computation, answered with the curve cited and the
    reading's standing named
```
Each link owned: the curve is Form's, the clock is
Timekeeping's, the number is Mathematics'. No link
borrows another's authority.

### 7.2 A periodic commitment (Scheduling's extension, shown not built)

```
a unit wants a banked fact re-consulted every day at dawn
  → the pattern — period one day, phase dawn — is a
    Repetition, held or stated as a pattern record
    (the daypart cycle is its phase's home: dawn is a
    daypart, and the pattern cites the convention)
  → the commitment is Scheduling's: an item whose trigger
    cites the pattern record, with its own registration
    expiry and its on-due demand (re-consult the fact)
  → when a period boundary passes, Scheduling's sweep —
    not Form — finds the item due; the Planner prices the
    re-consultation as at any firing
```
Shown to fix the citation's shape. Whether Scheduling
admits the periodic trigger at all is its design's
extension to make (§5.3); this chain builds nothing.

### 7.3 Detection against a known cycle

```
a sequence of stated dayparts across a conversation:
  dawn, midday, dusk, night, dawn, midday, …
  → detection (§5.2): the unit of four recurs; two full
    periods stand in the sequence — the floor is met
  → the pattern matches a known cycle: the daypart cycle,
    period four over the hours, phase fixed by the first
    term
  → the answer asserts the repetition of THIS sequence
    and names the cycle it matches — a computation over
    given material (§6), not a claim that the world is
    keeping daypart time
```

## 8. The located declines catalogue (all slices)

In the house style: each decline names the gap at its
location, and none serves a substitute in its place.
Draft wordings throughout are the note's proposals, the
owner's to settle.

| # | Location | The decline, in substance |
| :--- | :--- | :--- |
| D1 | **Unknown preset** — a curve is named by a preset the register does not hold | "I hold no preset by that name" — the canon's absence is the record (§3.2); no curve is drawn from the name's sound, and no near-name preset is silently substituted. |
| D2 | **Unknown named proportion / known cycle** — a relation or cycle cited by a name the register does not hold | The same honesty as D1, at the name: the register does not hold it; a stated ratio or period can still be taken on its own terms. |
| D3 | **Asked outside its domain** — a curve evaluated, or asked its steepest point, outside its stated domain interval | The decline names the curve and its domain: the curve is not defined there, and Form does not extrapolate a held form past the stretch it was stated over. |
| D4 | **No stated interpolation** — a control-point set offered as a curve with no rule between the points | Not yet a curve: the points are held as points, and the decline names the missing rule — the set is not silently joined by the nearest familiar rule. |
| D5 | **Undecidable shape question** — monotonicity or steepest-point asked of a held form that cannot decide it | The answer states what the form can and cannot decide; sampling is not dressed as determination. |
| D6 | **Too short a sequence** — a repetition claimed or asked of a sequence below the evidence floor (§5.2) | "Not enough sequence to tell": the decline states the floor and what the sequence does show (a pair, a candidate offered as a candidate) — never an asserted period. |
| D7 | **Incommensurable terms** — a proportion asked between magnitudes with no stated common measure | The decline names the two magnitudes and the missing relation; a ratio is not manufactured by dividing the numbers anyway. |
| D8 | **Broken lineage** — a held curve or pattern whose cited parent is not held | The record cannot be audited; the decline names the missing parent, and the orphan is not treated as a first record (§3.3). |
| D9 | **Application without a domain** — a curve applied where no unit supplies domain values (an animation with no clock reading standing) | The decline sits at the missing supply — for time, the missing clock reading, in the time shapes' own terms; Form does not read a clock to fill it (§3.4). |
| D10 | **World claim at the wrong gate** — Form asked to state that the world runs a cycle, or that a worldly ratio holds | Form declines as a witness: it can state the form of the filed claim and cite its filing, or detect the pattern in given material — the claim itself belongs to the knowledge graph and its gates (§6). |

## 9. Build slices (PROPOSED — not commissioned)

Each slice is stated with its acceptance sketch, in the
house pattern. None is commissioned by this note.

### 9.1 F1 — Curves held, asked, applied

The register for curves (§3.1's three held forms, domain
intervals, lineage citations on edit); the asking acts
of §3.4 (value at a point; monotonic; steepest where —
each with its honesty condition); application by citation.
The preset register stands with whatever canon the
owner's §10 ruling has entered by then — and empty,
declining at D1, if none has.
*Acceptance sketch:* a control-point curve is held, asked
its value inside its domain (computed, cited) and outside
it (D3); an edit produces a new record whose lineage
audits back to the parent, the parent unchanged; a named
preset with no canon entered declines at D1 rather than
answering from the name.

### 9.2 F2 — Proportion records

The relation record (§4.1) with its provenance and
standing; state / compare / scale; citation of
UnitsMeasurement factors without duplicating the table
(§4.3); the named-proportion register standing as §4.2
leaves it (doubling, the half; further names only as a
canon enters them).
*Acceptance sketch:* a stated proportion scales a
quantity with its derivation shown; two proportions
compare from their stated ratios; a proportion across
incommensurable magnitudes declines at D7; a conversion
question still answers through UnitsMeasurement, with
Form citing, not re-answering.

### 9.3 F3 — Repetition: patterns held, detection with its floor

Pattern records (§5.1) for the known cycles of §5.2,
citing their conventions and filings; detection over a
given sequence with the evidence floor enforced (assert
at two full periods; below it, D6 or a candidate offered
as one); matching against the known cycles by name.
The Scheduling cord is *specified* by this slice — a
pattern record is citable by a trigger — and *built*
only if Scheduling's own extension admits periodic
triggers (§5.3); F3 does not build Scheduling's side.
*Acceptance sketch:* the daypart sequence of §7.3 detects
and names its cycle; a one-and-a-half-period sequence
declines at D6 with the candidate named as a candidate;
a pattern edited produces a lineage, and a citation of
the parent still resolves to the parent.

## 10. Open questions (the owner's — decided nowhere here)

1. **The Form-versus-Space remit.** A curve is also a
   figure. Stated fairly both ways: *for Form keeping
   curves* — a curve, as this note designs it, is a
   relation between a domain and a range, asked about by
   evaluation and rate of change; its being drawable is
   incidental, and the Geometry seat's contents have
   never been stated, so nothing recorded is contradicted
   by Form holding curves now. *For the remit belonging
   to Space* — shape-in-space is the plain reading of
   geometry, a control-point curve is a spatial object
   before it is a function, and if the Geometry Unit is
   ever built with curves in its scope, two homes would
   hold the same objects under two disciplines. The
   note adjudicates neither way: Form is designed so its
   curve records could be *cited* by a future Geometry
   Unit without moving (the register's citations do not
   care who asks), and the question is the owner's when
   the map, or Geometry itself, is next drawn.
2. **Where the canons come from.** For presets (§3.2)
   and named proportions (§4.2) alike: banked intake
   from an attested source (and if so, which source —
   the easing literature offers published candidates,
   adopted nowhere here), the owner's own authoring, or
   a proposed canon ruled on item by item. Until a route
   is chosen, both registers stand as §3.2 and §4.2 leave
   them: the plain cases held, the named remainder
   honestly absent.
3. **Conversational authoring of edits.** Whether a
   visitor may shape a curve in talk at this rung —
   stating points, moving them, hearing the lineage grow
   — or whether curves at this rung are only held and
   applied, with editing reserved to whatever surface
   already edits things. The lineage discipline (§3.3)
   is specified either way; the posture question — what
   a visitor may make, versus what they may only ask
   about — is the owner's, and it rhymes with the same
   question recorded for Scheduling's visitor-registered
   items in the time note.
4. **The map wording for a division inside
   Mathematics.** Form is designed here as a *division*
   of Mathematics. The map's existing residents are
   *Units* with seats and placeholder statements
   (Mathematics itself, the QuantificationUnit, the
   Geometry Unit). Whether Form takes a Unit seat at
   `…/mathematics/form` with its own placeholder
   statement, stands as a named division inside the
   QuantificationUnit's keeping after all (the
   conversation's shorthand, against the recorded nesting
   — §2.2), or is drawn as a division of Mathematics
   without a unit seat of its own — and in any case its
   order among Mathematics' children — is the owner's
   when the map is next drawn. This note creates no seat.
5. **Curve evaluation as a Function.** Whether evaluating
   a curve (and comparing proportions, and detecting
   repetitions) should also stand in the Functions
   library as generic operations any process may call —
   or remain Form's acts over its own holdings, as §2.3
   designs them. The split is the house's machinery/
   knowledge question asked of this division, and it is
   recorded rather than pre-decided.

## Appendix — sources relied on

- `ai-system/ontology-core/ontology-knowledge-unit/mathematics/PLACEHOLDER.md`,
  `…/mathematics/quantification-unit/PLACEHOLDER.md`,
  `…/mathematics/geometry-unit/PLACEHOLDER.md`,
  `…/mathematics/quantification-unit/units-measurement-unit/PLACEHOLDER.md`
  — main `e5ad6de`: the recorded placement of Mathematics,
  the QuantificationUnit's standing and limits, the
  Geometry seat's exact placeholder status, the
  append-only ledger discipline, the Luoshu.
- `docs/ansci/mathematics-placement.md` — main: the
  2026-11-18 ruling and 2026-11-19 placement as built;
  "a placeholder seat is not a build"; no Geometry need
  kind.
- `docs/ansci/time-scheduling-design-note.md` — branch
  `track/time-design`: Timekeeping's readings and
  boundaries (§2), Scheduling's record, trigger grammar,
  never-acts discipline and stated scope (§3).
- `docs/ansci/geography-design-note.md` — branch
  `track/geography-design`: the register discipline —
  per-fact provenance, per-kind shelf lives, the
  stale-only decline (§2, §9.4); OSRM's computation
  precedent (§4.3 there).
- `ai-system/functions/PLACEHOLDER.md` — main (as read
  for the time note): the Functions Unit and the
  machinery/knowledge split.
- `src/ansci/sentence.ts` — main: `GENERATES` (sheng)
  and `CONTROLS` (ke), the standing cycle constants.
- `src/ansci/session.ts` — main: `SEASON_CONVENTION`,
  `DAYPART_CONVENTION`; the frame as a stated-time record.
- `src/ansci/units-measurement.ts` — main: conversion
  factors as standing stated ratios.
- The owner's conversation of 2026-11-20: the trio and
  its unity, the Form name, the Mathematics equation,
  the placement in Mathematics, curves with presets and
  edited curves, Scheduling's consumption of Repetition,
  and Monitoring named as the interval-watching consumer
  (§5.3).
