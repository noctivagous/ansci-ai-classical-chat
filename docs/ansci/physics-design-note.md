# Physics Unit — design note

Written 2026-11-20, commissioned by the owner the same day.
Design only: no code is changed by this note, no library is
installed or vendored by it, and nothing in it is built. The
one decision the note carries as settled is the owner's
engine ruling of 2026-11-20 (§1); everything else is
specification, proposal, or an open question recorded for
the owner.

## §0 Basis

Read for this note, with the tree each source was read on:

- **The OKU and its unit charters** — main `e5ad6de`:
  the OntologyKnowledgeUnit's resident units and their
  charter pattern (SenseUnit, SemanticAssessment,
  QuantificationUnit), and the ParamorphicConcept ruling
  (instances in a registry, no engine built beyond need).
- **Mathematics and its residents** — main `e5ad6de`:
  `mathematics-placement.md` (the recorded tree:
  Mathematics inside the OKU; the QuantificationUnit under
  it over its Numbers slice; the Geometry Unit seated as a
  placeholder whose contents have never been stated) and
  the Form design note (branch `track/form-design`,
  worktree `~/workspace/ansci-track-form-design`):
  Curves · Proportion · Repetition as a co-division of
  Mathematics. Physics is specified as a CONSUMER of Form
  (§7): a simulated trajectory is a Form curve.
- **The derived provenance kind** — main `e5ad6de`:
  geography G3's routes. `docs/ansci/geography-g3-report.md`
  and `src/ansci/geography.ts`: PlaceProvenance gains the
  **derived** kind — in the design note's formulation
  (§3.5/§4.3 of `geography-design-note.md`, branch
  `track/geography-design`), *a computed fact cites its
  inputs' provenance and carries none of its own*. A banked
  route records its two points and raw quantities under a
  derived provenance naming both endpoints' resolution
  routes as inputs, at a stated shelf life; the reply
  itself names the computation and never presents the
  result as testimony. §4 of this note adopts that
  formulation verbatim for simulation outcomes.
- **The material record** — main `e5ad6de`:
  `docs/ansci/repair-programme.md` §H (the axis doctrine)
  and `src/ansci/coherence.ts`. A material carries a
  combination of Five Element manifestations, ONE PER AXIS:
  matter phase by behaviour (not chemistry), temperature as
  a state (never derivable from a phase path), reactivity,
  graded potential, composition, and surface reflectivity
  (§H.7, ordered along the element spine). §H.5's
  no-crossing rule: a determination on one axis never
  yields a conclusion on another. §3 of this note specifies
  the Physics Unit's knowledge side AGAINST that record.
- **The testimony discipline and the lack machinery** —
  main `e5ad6de`: knowledge enters by banked intake with
  provenance or by consultation with declared standing;
  declines are located gaps, and a missing CAPABILITY is
  one of the lack machinery's need kinds — the form §6's
  border declines take.
- **The external engines** — public sources, verified
  2026-11-20 (§2): the Planck.js repository and npm
  record; box2d.org; the Box3D repository and its release
  record. Only what those sources state is asserted there.

## §1 The settled design (owner, 2026-11-20)

1. **A Physics Unit stands in the OKU**, with two sides: a
   KNOWLEDGE side (physical laws and material behaviour,
   held under the testimony discipline) and an ACT —
   simulation as computation (§§3–4).
2. **The engine is Planck.js** — the owner's ruling,
   given in the conversation that commissioned this note
   ("Planck.js", 2026-11-20), choosing it over a direct
   Box2D adoption and over Box3D. The ruling settles the
   CHOICE; no code exists, and the adopting is a build
   slice's work (§9), not this note's.
3. **Simulation outcomes are derived facts** under the
   derived provenance kind geography G3 created: inputs
   cited, no testimony claimed for the outcome (§4).
4. **Box2D-WASM is the recorded upgrade path; Box3D is
   watched, not adopted** — with the evidence-based
   reasons stated in §2, including the specification
   problem (a 3D scene described in conversation is
   underdetermined in ways a 2D scene is not).
5. **Scope is 2D rigid bodies** (§6): falling, stacking,
   balancing, rolling, sliding, simple joints. Fluids,
   soft bodies, fracture, and 3D are other engines and
   other claims, and decline at the border.

## §2 The engines, on the evidence

### §2.1 Planck.js — the ruled engine

Verified from the project's own repository
(github.com/piqnt/planck.js) and the npm record for the
`planck` package, 2026-11-20:

- **What it is.** "Planck.js is JavaScript/TypeScript
  rewrite of Box2D physics engine" (the repository's own
  description). The port's algorithms follow the Box2D
  **2.x** line — the classic World / Body / Fixture /
  Joint API shape — and its source has been migrated to
  TypeScript: from v1.0 the package is published on npm
  as **`planck`** (the pre-1.0 line was `planck-js`).
  It does not implement Box2D v3's redesigned C API;
  that divergence is the upgrade question of §2.2.
- **Standing.** Repository created 2016, actively
  maintained; the npm `planck` package's latest release
  at verification is **1.5.1** (October 2026). Licence:
  **MIT** (the current repository and package; the older
  0.3 `planck-js` line was zlib — a build slice pins the
  exact package and version it adopts, and the licence of
  THAT artefact is what enters the record).
- **API shape, at the level this design needs.** A
  `World` created with a gravity vector; bodies created
  in the world (static / dynamic / kinematic) carrying
  `Fixture`s that pair a shape (circle, box/polygon,
  edge, chain) with material parameters — **density,
  friction, restitution** are per-fixture quantities in
  the engine's own model, which is what §3's held
  properties must map onto; `Joint`s (revolute, distance,
  prismatic, and others) between bodies; the world
  advanced by `step(dt, velocityIterations,
  positionIterations)`; and queries over the world
  (point and region/AABB queries, ray casts) for asking
  what rests where. Nothing in the design requires more
  of the engine than this surface.

### §2.2 Box2D direct, and the WASM upgrade path

Box2D itself (box2d.org; Erin Catto) is the classical
solved 2D rigid-body engine — the machinery Planck
ports. Adopting it directly from this system would mean
a native or WASM boundary: the engine's current line
(v3) is C, with a redesigned API. **Box2D-WASM is
recorded as the upgrade path**, to be taken when and if
a build slice demonstrates one of its two named gains
at a price worth paying:

- **Engine currency** — tracking Box2D v3's solver
  development rather than the 2.x line Planck follows;
- **Solver fidelity** — a measured case where Planck's
  outcome and Box2D v3's outcome differ on a scene this
  system actually answers from, and v3's is the one the
  derivation record should stand behind.

The price, stated now so the upgrade decision is never
made blind: a WASM boundary in the test gates (a binary
artefact to pin and load), and a second API shape for
the scene assembly of §5 to target. Until one of the
gains is demonstrated, the in-process TypeScript engine
is the honest fit: scenes here are described in words,
input precision is low, and integration honesty — not
solver sophistication — is the binding constraint.

### §2.3 Box3D — watched, not adopted

Verified from github.com/erincatto/box3d and its
release record, 2026-11-20 — the evidence CONFIRMS this
note's commissioning characterisation, and sharpens it:

- **One release: v0.1.0**, the "Initial Release"
  (2026-06-30), of which the author writes: *"This is
  the initial release of Box3D. I consider this to be
  alpha software."* The repository was created
  2026-05; it is a portable **C17** rigid-body engine
  (strictly rigid bodies — no soft-body support),
  MIT-licensed, developed by Erin Catto, with pull
  requests currently disabled and development carried
  overwhelmingly by the single author.
- **No JavaScript/TypeScript ecosystem exists around
  it** — no port, no WASM package of standing — so
  adoption from this system would mean building the
  boundary as well as crossing it.

The reasons for watching rather than adopting, in the
order the design weighs them: (i) **maturity** — an
alpha, single-release engine whose API has not yet had
to survive anyone's dependence on it; (ii) **ecosystem**
— no route into a TypeScript system that isn't new
work of the riskiest kind; (iii) **the specification
problem**, which would stand even if the engine were
mature: a 3D scene described in conversation is
underdetermined in ways a 2D scene is not (a stack
described in words fixes its 2D silhouette far more
than its depth arrangement), so §5's underdescription
machinery would carry a load it cannot honestly
discharge at this rung. What would change the ruling
is recorded as an open question (§10) rather than
re-argued here.

## §3 The knowledge side — physical behaviour, held

### §3.1 What already lives elsewhere, and stays there

The material record (§0) is not this Unit's to restate.
A material's manifestations per axis — phase by
behaviour, temperature as state, reactivity, graded
potential, composition, surface reflectivity — live in
the OntologyCore's material doctrine, under the
no-crossing rule. The Physics Unit does not hold a
second copy of any of it, and no determination on an
axis is ever restated by this Unit as a physical
property: that reflectivity is ordered along the spine
says nothing, by itself, about friction, and the Unit
that implied otherwise would be crossing axes with an
engine's authority behind the crossing.

### §3.2 What the Unit adds: the behavioural reading

What simulation needs, and what the record does not
currently hold, is a material's **behavioural-physical
reading**: the quantities the engine consumes —
**density, friction, restitution** — held as properties
OF a material (or of a material pairing, for friction,
where the record requires it), each with provenance
under the testimony discipline:

- a value enters by **banked intake** (an attested
  source, named) or by **the owner's authoring**, the
  two routes physical knowledge enters this system —
  never by derivation from an axis manifestation
  (§3.1), and never by the engine's defaults silently
  becoming the system's beliefs (§5.3);
- a material with **no held reading** is a located gap,
  not a zero: a scene naming it declines at the missing
  property (§5.2), because a simulation run on invented
  friction would produce a derived fact whose derivation
  record cites an invention as an input;
- the reading is **citable**: a derivation record (§4)
  names the property values it used and where the
  system holds them from, so a later session can
  re-derive, dispute, or supersede the value itself —
  the value is knowledge, with a knowledge's lifecycle,
  not a constant in code.

Whether these readings live in a Physics-owned table or
as a cited annex of the material record is the owner's
question (§10); the design's constraint either way is
the one above — held once, cited everywhere, never
duplicated into the engine layer as literals.

### §3.3 Laws

Physical laws enter the same way: as held knowledge
with provenance, in the form the system can state and
cite (gravity's acceleration as a held quantity with a
value and a standing; the qualitative laws a question
shape may cite — a resting body stays at rest — stated
as doctrine, not as code comments). The engine
*implements* mechanics; the Unit's knowledge side is
what lets the system SAY what it did and why the
outcome is the outcome, in its own testimony terms.
Where a held law and the engine's behaviour diverge,
the divergence is a finding about one of them, recorded
— never silently resolved in the engine's favour
because the engine produced a number.

## §4 The act — simulation as computation

### §4.1 The shape of an act

A simulation runs in four recorded movements:

1. **Scene assembly** (§5): a scene record is built —
   bodies, shapes, held material readings, gravity,
   stated assumptions — from conversation, from held
   knowledge, or mixed. The scene record is complete
   before the engine is touched; assembly is where
   every decline in §5.2 and §6 lives.
2. **Stepping**: the scene is instantiated in the
   engine (Planck, §2.1) and advanced a stated number
   of steps at a stated step size, with stated solver
   iteration counts. These are part of the derivation,
   not implementation detail.
3. **Reading the outcome**: the question the simulation
   was run to answer is read off the final (or a
   stated intermediate) state — a body at rest or
   fallen, a stack standing or toppled, contact made
   or not — by the world's queries, not by inspecting
   the engine's internals.
4. **The outcome enters as a derived fact** (§4.2) —
   or, where the question is about the MOTION rather
   than the end state, as a Form curve (§7) from which
   the answer is read.

### §4.2 Derived provenance, adopted from G3

The outcome's provenance is the **derived** kind,
exactly as geography G3 formulated it: *a computed
fact cites its inputs' provenance and carries none of
its own*. A simulation's derivation record cites:

- **the scene as described** — the scene record of
  §5.1, including every stated assumption (§5.2) marked
  as an assumption;
- **the held properties used** — each material reading
  of §3.2, with its own provenance standing behind the
  citation;
- **the engine and its version** — Planck, the pinned
  version a build slice adopts (§2.1), and the
  stepping parameters of §4.1(2);
- **the question** the run answers, so the record
  cannot be silently re-read as answering another.

The reply that reports an outcome names the computation
as the computation — the G3 discipline ("computed by
OSRM from the two resolved points" is the model) — and
never lets a simulated outcome wear testimony's
grammar. A simulated tower falling is a derivation
about a described scene; it is not an observation
about any tower in the world, and the reply's form
keeps that difference visible.

### §4.3 Reproducibility

A simulation result is reproducible from its
derivation record or it is not a result. The same
scene record, the same held properties, the same
engine version and stepping parameters give the same
outcome — the engine is deterministic for a fixed
stepping regimen, and the design treats any
non-reproduction as a defect in the record (an input
went unrecorded), not as weather. This is what makes
§9's test posture possible, and it is also the
derivation record's audit standard in production:
re-running a cited derivation is the check on it.

## §5 Scene specification — the centre of gravity

The engine is solved machinery. What this Unit
actually designs is how a scene comes to be SPECIFIED
honestly, because every interesting failure of the act
is a specification failure: the wrong body, the
invented property, the assumption nobody stated.

### §5.1 The scene record

A scene record holds, per body: its identity in the
description (which described thing it is), its shape
and dimensions, its initial position and orientation,
whether it is static or dynamic, and its material
(by citation to §3.2's reading). Per scene: the
ground or supports (themselves bodies, or the scene's
stated boundary), gravity (§5.3), joints where the
description states them, and the question the scene
is assembled to answer. Dimensions and positions are
Quantification's quantities, in UnitsMeasurement's
keeping — the scene record cites them in stated units
and converts nowhere silently.

A scene record has three sources, freely mixed:

- **from conversation** — a visitor's words: sizes,
  positions, materials, "stacked on", "leaning
  against". The parse of a scene description into a
  scene record is a shapes problem, and its limits at
  this rung are an open question (§10);
- **from held knowledge** — a known object's held
  properties and dimensions, cited;
- **from a prior scene** — a scene record is itself a
  held artefact: "and now remove the middle one" is a
  new scene citing the old, with the edit stated —
  the lineage discipline Form applies to curves,
  applied to scenes.

### §5.2 Underdescription — the normal case

Most described scenes are underdescribed. The design's
rule is absolute in one direction and permissive in
the other:

- **A stated assumption is an input.** Where the
  assembly supplies something the description did not
  determine — a thickness, a spacing, a position the
  words left open — and the question can still be
  honestly asked with it supplied, the supplied value
  enters the scene record MARKED as an assumption,
  rides into the derivation record (§4.2), and is
  visible in the reply when the outcome turns on it.
  Assumptions are how underdescription is carried, not
  hidden.
- **A missing determination declines.** Where the
  outcome turns on something neither described, held,
  nor honestly assumable — which body a pronoun
  reaches, a material with no held reading (§3.2), a
  support the description never places — assembly
  stops and the turn declines LOCATED at the missing
  determination: the gap names the body, the property,
  or the placement that is missing. Nothing is silently
  defaulted past this line. The decline is the lack
  machinery's located gap, at the location the
  simulation would have consumed the missing thing.

The line between the two is the question's sensitivity:
an assumption is honest where varying it within its
plausible range does not change the answer's kind
(a stack's exact spacing, within reason); it is a
missing determination where it does (which of two
materials, where friction decides). Assembly states
which side of the line each supplied value sits on —
and where assembly itself cannot tell, that is a
missing determination too.

### §5.3 Named defaults

Defaults are permitted only where the design names
them, with their standing stated:

- **Gravity**: Earth gravity, downward, at its held
  value (§3.3) — the standing default for every scene
  that does not state otherwise; a scene may state
  another (a described world, a stated "in space"),
  and the stated value replaces the default IN THE
  RECORD, not by a flag.
- **The ground plane**: where a description plainly
  presupposes ground ("on the floor", "on the table"
  — the table then being a body to specify), assembly
  may supply a static ground at the described level,
  recorded as an assumption under §5.2 — NOT a silent
  default, because scenes without ground are
  meaningful and the difference decides outcomes.

No other defaults exist. In particular the engine's
own fixture defaults (its density, friction,
restitution fallbacks) are NEVER inherited: a fixture
is created from held or assumed values, or the scene
does not assemble. This is the single easiest place
for the Unit to start believing things nobody told it,
and the design closes it by name.

## §6 Scope — borders, with declines

**Inside:** 2D rigid bodies — falling, stacking,
balancing, rolling, sliding, resting contact, and
simple joints (a hinge, a link) where the description
states them. Questions of the kinds: will it fall /
does it balance / does the stack stand / where does
it come to rest / does it reach, roll to, slide off.

**At the border, declining located at the border** —
the decline names the capability kind in the lack
machinery's terms (a capability the system does not
hold), never a generic inability:

- **fluids** — liquids and gases as simulated media
  are not rigid bodies; a scene whose outcome turns
  on flow, buoyancy in a described fluid, or pressure
  declines at the fluid capability;
- **soft bodies** — deformation as the outcome (a
  bending beam asked as bending, a cushion) declines
  at the soft-body capability; a body that merely
  rests ON something soft, where the outcome does not
  turn on the deformation, is assembly's judgment
  under §5.2, stated in the record;
- **fracture and destruction** — breaking, shattering,
  tearing: the engine does not do it and the Unit
  does not approximate it into a fall;
- **3D** — a scene whose determination is essentially
  three-dimensional (§2.3's specification problem)
  declines at the 3D capability; a scene that is
  honestly planar in its description and its question
  is inside, and assembly states the planar reading
  as an assumption where the description left it
  open.

A border decline is a located gap with a name, and —
like every located decline in this system — it is
also a record of what the Unit would need to grow,
filed where the lack machinery keeps such things.

## §7 Neighbours and consumers

- **Form (Mathematics)** — the first consumer. A
  body's motion through a simulation IS a curve:
  position against step, against Timekeeping's
  reading where time is the domain. Where a question
  asks about the motion (how fast at the bottom, when
  does it reach, does it oscillate and settle), the
  run's trajectory is handed to Form as a curve —
  held, citable, editable in Form's lineage — and the
  question is answered by EVALUATING THE CURVE, not
  by re-stepping the scene. Re-stepping to answer a
  second question about the same motion is waste the
  design refuses: the curve is the motion's record.
- **Quantification / Mathematics** — every number the
  scene and the outcome carry (dimensions, masses
  from density and area, durations, the outcome's
  measures) is Quantification's arithmetic and
  UnitsMeasurement's units; Physics states quantities
  and cites results, it does not grow a second
  arithmetic.
- **Geography** — the spaces are different and the
  design states it so the Units do not grow into each
  other: Geography's space is the world's surface —
  places, coordinates, containment, routes — attested
  and consulted. Physics' space is a described scene's
  plane — local, stipulated, existing only inside a
  scene record. A question about where a real thing is
  is Geography's; a question about what a described
  arrangement would do is Physics'. A scene may be
  SET somewhere Geography knows (a described stack in
  a named place) without the place entering the
  derivation — setting is description, not input,
  unless the question makes it one (gravity stated
  by place would be such a case, and none is designed
  here).
- **The Planner** — a simulation is priced work. The
  pricing surface, stated for the Planner to price
  against: bodies in the scene, steps to run, and
  whether a held curve or prior derivation already
  answers the question (§7, Form) — the cheap paths
  are checked before the expensive one is proposed.
  Assembly's declines (§5.2) happen before any priced
  stepping is proposed: the system does not charge
  for a scene it cannot assemble.

## §8 Determinism and testing posture

Simulations in tests run on FIXED scenes with FIXED
step counts — the fixture discipline this system
applies to consultations, applied to computation:
a test's scene record is a recorded artefact, its
held properties are recorded values, and its expected
outcome is read from the derivation, so a gate
failure says the engine, the assembly, or the record
changed — each distinguishable from the record. No
test consults a live anything; the engine is
in-process, so no test needs the network at all —
the first of this system's computation kinds of which
that is true without fixtures, and the note records
it as a property of the engine ruling (§2.1), not a
coincidence. Live conversation runs under §4.3's
standard: reproducible from the record, or not a
result.

## §9 Proposed build slices (not commissioned)

In the house pattern — one slice, one commit, full
gates, a report; nothing here is commissioned by this
note.

- **P1 — the scene record and one shape.** The scene
  record as a held artefact (§5.1), Planck adopted
  and pinned (§2.1 — package, version, licence of the
  adopted artefact recorded), assembly for the
  simplest described scenes (named bodies, stated
  dimensions and materials, ground under §5.3), and
  ONE question shape of the will-it-fall /
  does-it-balance class, answered as a derived fact
  (§4.2) with the full derivation record. Acceptance:
  a fixed described stack that stands and one that
  falls, both reproducible from their records (§4.3);
  a scene declining at a missing material reading
  (§3.2); the engine's defaults demonstrably never
  inherited (§5.3) — a fixture audit in the tests.
- **P2 — held material readings.** §3.2's readings as
  held knowledge with intake: a first attested set for
  the materials the knowledge graph already carries,
  each value provenanced; scenes citing readings by
  name; the missing-reading decline exercised across
  the set. Acceptance: every reading in the set
  traceable to its intake record; a derivation citing
  a reading re-derives after the reading is
  superseded, and says which standing it used.
- **P3 — trajectories to Form.** §7's hand-off: a run
  emits its motion as a Form curve; motion questions
  (when does it reach, how fast at) answered by
  curve evaluation with no re-stepping — call counts
  on the engine prove it. Acceptance: the curve's
  lineage cites the derivation record; an edited
  curve (Form's act) is never confused with the
  simulated one in any reply.
- **P4 — joints and the second shape family.**
  Stated joints in assembly; the reach / roll-to /
  slide-off shapes. Acceptance per shape, with the
  border declines of §6 exercised at fluids and 3D.

## §10 Open questions (the owner's, decided nowhere here)

1. **Conversational scene authoring at this rung.**
   How much scene may a visitor specify in words —
   dimensions, positions, relations — before the
   parsing of descriptions into scene records becomes
   a shapes programme of its own? P1 assumes the
   simplest descriptions; where the line sits is the
   owner's when the shapes are reviewed.
2. **Where held material readings live.** A
   Physics-owned table, or an annex of the material
   record cited by the Unit (§3.2 states the
   constraint — held once, cited everywhere; the
   custody is open).
3. **The 3D revisit trigger.** What evidence would
   change the Box3D ruling (§2.3) — a Box3D release
   the author no longer calls alpha, a JS/WASM route
   of standing, a demonstrated class of questions
   this system is asked that are essentially 3D — or
   some conjunction? Naming the trigger now keeps the
   watching honest.
4. **Map seat wording.** The Unit's seat in the OKU
   and its drawn cords — to Mathematics (its numbers
   and Form's curves), to the material record (its
   knowledge side's neighbour) — are the owner's when
   the map is next drawn.
5. **Assumption tolerance.** §5.2's line between a
   stated assumption and a missing determination is
   drawn by the question's sensitivity; whether any
   class of assumption (thicknesses from object
   kinds, standard sizes) should be HELD as doctrine
   — assumable by citation rather than invented per
   scene — is open, and would change what assembly
   may supply.

## Appendix — sources

Repo (main `e5ad6de` unless named): `docs/ansci/
geography-g3-report.md` and `src/ansci/geography.ts`
(the derived kind); `docs/ansci/geography-design-
note.md` §3.5/§4.3 (branch `track/geography-design`);
`docs/ansci/repair-programme.md` §H (the axis
doctrine) and `src/ansci/coherence.ts`;
`docs/ansci/mathematics-placement.md`;
`docs/ansci/form-design-note.md` (branch
`track/form-design`); the OKU unit charters and the
lack machinery's records, main. External, verified
2026-11-20: github.com/piqnt/planck.js (README,
repository record) and the npm `planck` package
record (v1.5.1); box2d.org; github.com/erincatto/
box3d and its v0.1.0 release record ("I consider
this to be alpha software").
