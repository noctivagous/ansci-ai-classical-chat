# Time, Scheduling and Expectation — design note (2026-11-20)

The design record for the system's time resources: **Timekeeping**
(clock readings as consultations, and staleness asked uniformly of
every bank), **Scheduling** (future commitments held as records,
never as behaviour), and **Expectation** (the waiting resource —
a registered openness toward the world, chartered jointly with
the lack machinery). All three are generic resources in the
Functions family, on the owner's framing that scheduling implies
doing something in the future, while waiting for something to
come in is a different thing and takes a different name.

An addendum (§8), settled by the owner in the same
conversation on 2026-11-20, places Scheduling in a trio:
beside it stand **Calendar** (the grid — date systems held
as attested knowledge, and the actual dates a commitment
lands on) and **Timeline** (the line — event sequences held
as objects with owners, their relations Allen's interval
algebra, ported). Timekeeping remains what all of them
read. The addendum extends this note; where it amends
§§1–7 it does so in place and says so (§8.1).

**Status: DESIGN ONLY.** Nothing in this note is built. The
three-way split, the names, the never-acts discipline and the
joint charter with the lack machinery were settled by the owner
in conversation on 2026-11-20 and are marked SETTLED where they
appear. Seat addresses, record shapes and protocols are this
note's PROPOSALS, stated so they can be ruled on. The build
slices in §6 and §8.12 are PROPOSED, not commissioned. Open
questions are collected in §7 (questions 6–9 added by the
addendum) and are decided nowhere in this note.

## 0. Basis — what this design rests on

Read before writing. Trees are named per source, because the
stack this note designs against stands in three states at once:

- **This note's own tree** — main `a093f57c5a43506de335ea7df2aa68cd5ba1452c`,
  fetched fresh 2026-11-20. At fetch time the probe-2 +
  geography landing had **not** yet reached origin/main: the
  probe-2 programme, Slices A/B and G1–G3 all stand on their
  branches, gated and awaiting the owner's push word (given
  2026-11-20, landing in flight in parallel with this note).
  Where this note cites that machinery it names the branch it
  was read on, exactly as the geography note handled the
  then-unmerged weather modules.
- `ai-system/functions/PLACEHOLDER.md` and
  `ai-system/system-map.ts` (the Functions seats) — main. The
  **Functions Unit** (schematic address `capabilities`, top
  level underneath the OntologyCore): the library of
  operations — generic functions over abstract material, called
  mid-step inside larger processes; a function takes material
  and returns material; **it knows nothing, decides nothing,
  testifies to nothing**. Its five families stand as
  placeholder seats, none built: Ordering And Sorting
  (`functions/ordering-and-sorting`), Search
  (`functions/search`), Editing (`functions/editing`),
  ExternalQuery (`functions/external-query`), FileSystem
  (`functions/file-system`). The same file records the
  separation the owner made on 2026-11-20: the library of
  operations (this unit) is not the inventory of holdings (the
  capability registry, held as data elsewhere); a placeholder
  seat is explicitly not a holding.
- `src/ansci/session.ts` — main. `FrameInput` / `FrameRecord` /
  `buildFrame`: the session's Awareness frame is a **time
  record** (supplied month/day/hour, season under
  `SEASON_CONVENTION`, daypart under `DAYPART_CONVENTION`).
  The frame holds no minutes, no year, no timezone — and, per
  the geography note's basis, no place. What the frame holds
  is the conversation's *stated* time: supplied, not read.
- Probe-2 Slice 5 (branch `track/probe2-fixes`,
  `docs/ansci/probe2-slice-5-report.md`; code in that branch's
  `src/ansci/turn.ts`) — the time/date shapes: "what is the
  time?" / "what is the date?" answered **from the frame**
  ("It is about 2 PM." — about, because the frame holds no
  minutes; "The date is November 20." — no year, because the
  frame holds none). With **no frame**, the shape declines
  located at the missing clock reading: *"this conversation
  has no clock reading — I wasn't given the time when we
  started."* Never an invented time. This behaviour is the
  standing fact §2 designs around; it is not a gap this note
  proposes to paper over. Recorded limit on that branch: the
  "what time is it?" form loses its noun in the parse and
  keeps its previous route — the parse's limit, not this
  note's to fix.
- The banks' shelf-life machinery, three instances, three
  trees: the **weather bank** (branch `track/probe2-fixes`,
  `src/ansci/weather-bank.ts`) — a banked reading carries its
  fetch time and a stated shelf life (`WEATHER_TTL_DEFAULT_MINUTES`
  = 30, configuration-overridable); a reading inside its shelf
  life answers as current, past it, it does not answer. The
  **geography register** (branch `track/geography-design`,
  `docs/ansci/geography-design-note.md` §2.4; built on branch
  `track/geography-build`) — the discipline generalised into a
  per-kind table (geocode 12 months, containment 6 months,
  what's-there 30 days, route 7 days if banked, weather
  30 minutes), with the **stale-only decline** in its declines
  catalogue: the only entry is past its shelf life and
  re-consultation failed — the decline names staleness and
  never serves the stale fact as current. The **Wikidata
  bank** (main, `src/ansci/wikidata-bank.ts`) — retrieved-kind
  records with SourceRecords under the provenance discipline
  of `docs/design-base-nets-and-chat.md` §§3.5–3.6, and
  **no shelf life at all**: a capital does not expire. §2.4's
  staleness design has to be honest about that asymmetry.
- `docs/ansci/lack-machinery-slice.md`,
  `src/ansci/problem-records.ts`,
  `src/ansci/capability-registry.ts` — main. The lack
  machinery: a ProblemRecord (seat + seat history, bearer,
  subject, need, ground, opened turn, status, closing
  evidence) filed in the session-scoped register
  `session.problems`; every declined turn now files one
  (Part C of that slice). Need kinds: `quantification`,
  `lack-of-information`, `how-to-proceed`, and `capability`
  (the fourth, added by that slice) — a capability
  requirement is audited against the registry and returns a
  typed verdict: **held / seat-exists-unbuilt / no-seat**,
  with the checked list part of the result. A how-to-proceed
  problem opens already closed for its turn at
  `declined-priced`, its closing evidence naming the unbuilt
  instrument. §4 specifies Expectation **against** these
  records — the ProblemRecord stays the account of the need;
  Expectation is not a second account.
- `docs/ansci/problem-solving-first-slice.md` and
  `docs/ansci/problem-solving-placeholder.md` — main. The
  ProblemSolving slice that built the records above: needs
  attached to objects, seat movement with history, the one
  standing route of record, and its deliberately-not-built
  list (approach walking, cross-conversation persistence —
  each a separate commission).
- `docs/ansci/social-s1-report.md` and
  `docs/ansci/geography-design-note.md` §3 — the **Planner
  demand posture**: the Social Unit inside Awareness reads the
  social situation and raises demands; it never speaks, never
  authors a reply, never originates a world claim; authorship
  stays with the Planner, wording with the Verbalizer.
  GeographyAwareness inherits the same discipline for space.
  §3 states it for commitments: Scheduling raises demands;
  it does not act.
- `docs/ansci/mathematics-placement.md` and
  `src/ansci/quantification.ts` — main. Mathematics sits
  inside the OKU with the QuantificationUnit under it; the
  quantity ledger is a registered capability-registry
  holding. Duration and interval arithmetic is proposed for
  that home in §2.3 — as a registry question, not a
  Timekeeping feature.
- **Addendum sources (§8)** — read for the addendum and
  named in its own basis (§8.1): the Form design note
  (branch `track/form-design`,
  `docs/ansci/form-design-note.md` §5); `src/ansci/session.ts`
  on this tree, read in full for the frame's conventions;
  `docs/user-ref/nct-ancientscience-Taiji.txt` (the owner's
  reference material, where the 24 solar terms stand in
  this repo's record); the UnitsMeasurement record
  (`ai-system/system-map.ts` and its PLACEHOLDER) and
  `src/ansci/ingested.ts` for the dynasty material in
  §8.7; the geography G3 report (branch
  `track/geography-build` as landed) for the derived
  provenance kind §8.5 cites; and the two ports' public
  records, verified 2026-11-20 and cited in §§8.5
  and 8.8.

## 1. The settled design (owner, 2026-11-20)

1. **Three resources, not one.** Time processing, Scheduling
   and waiting are separate generic resources. Scheduling
   implies doing something in the future — an action owed.
   Waiting for something to come in is a different thing and
   carries a different name: **Expectation**. SETTLED.
2. **Scheduling waits on time; Expectation waits on the
   world; Timekeeping is what both read.** SETTLED — this
   sentence is the note's organising line, and §5's worked
   chain is built to exercise exactly it.
3. **All three are Functions** — generic machinery in the
   Functions family, defined over abstract material, called
   by other units mid-process. None of them testifies, none
   speaks, none holds knowledge of its own beyond its
   registers. SETTLED as placement in kind; the seat
   addresses in §§2–4 are PROPOSED wording for the map.
4. **Clock readings are consultations.** The frame is the
   conversation's stated time; a clock is a source, read on
   demand under the retrieved provenance discipline. A time
   reading behaves like a weather reading. SETTLED.
5. **Scheduling never acts.** A due commitment raises a
   demand on the Planner, which prices and executes or
   declines located-ly — the Social Unit's posture, stated
   for commitments. SETTLED.
6. **Expectation is chartered jointly with the lack
   machinery.** A lack-of-information may stay open as an
   Expectation instead of ending its turn. SETTLED as the
   charter; the hand-off mechanics are §4.3's proposal.
7. **Timeout is information.** An expectation that expires
   unsatisfied raises its timeout as a fact to act on, never
   as silence. SETTLED.
8. **Scheduling is the commitment layer of a trio.** Beside
   Scheduling stand **Calendar** — the grid: date systems
   held as knowledge, and the actual dates a commitment or
   a pattern lands on — and **Timeline** — the line: event
   sequences held as objects with owners, in whose terms a
   commitment's sequence against other events is stated.
   Timekeeping (§2) is what all three read. SETTLED
   (addendum, 2026-11-20); §8 states the design.
9. **Date systems are held as attested knowledge, and they
   are plural.** At minimum the Gregorian and the Chinese
   lunisolar calendar stand in Calendar's register, each
   with its provenance; the lunisolar is arguably the home
   system for this knowledge graph. Conversion between
   held systems is computation over the holdings, not
   knowledge. SETTLED as placement (addendum); §§8.3–8.5.
10. **Interval relations are Allen's, ported, not
    invented.** The relations between events on a Timeline
    are the thirteen relations of Allen's interval algebra
    (1983), with its composition table, adopted as a port
    under the owner's solved-problem rule — as Lesk and
    SymSpell were ports before it. SETTLED as the port
    ruling (addendum); §8.8.

## 2. Timekeeping — the readings both others stand on

PROPOSED seat: `functions/timekeeping`, a family in the
Functions Unit alongside Ordering And Sorting, Search,
Editing, ExternalQuery and FileSystem.

### 2.1 What it owns

- **The clock-consultation operation**: given a named clock
  source, produce a **clock reading** (§2.2). One source is
  designed for here — the host's clock, the clock of the
  machine the entity is running on, named as a source the
  same way a weather source is named. Other clocks (a
  network time service, the interlocutor's stated clock as a
  frame fact) are other sources under the same operation,
  not other machinery.
- **The staleness operation** (§2.4): uniform questions over
  every bank's stated shelf lives.
- Nothing else. Timekeeping holds no register of its own
  beyond the readings it has taken and banked (§2.2), and it
  keeps no calendar knowledge: month names, season and
  daypart conventions already live with the frame's tables
  and stay there. (The addendum's Calendar is a separate
  seat, §8: the date systems and the solar terms are held
  there, not in Timekeeping, and what changes for the
  conventions' consumers is stated in §8.6.)

### 2.2 A clock reading is a retrieved fact

A clock reading carries: the time read (to the precision the
source gives — a host clock gives seconds; the reading does
not round itself into the frame's hour-only shape), the
**timezone the reading stands in**, named as part of the
reading (a host clock's zone is the host's, and is said so),
the source's name, and its provenance — **retrieved-kind,
with a SourceRecord naming the clock source**, under the
§§3.5–3.6 discipline the Wikidata bank established. A clock
reading is the limiting case of a banked reading: its
content and its fetch stamp coincide — the time it reports
*is* the time it was fetched. Its shelf life is therefore
stated differently from a weather reading's: **a clock
reading warrants the turn it was taken in.** A later turn
that needs the time re-consults; it does not inherit a
reading and call it now. (A reading banked for the record —
what the clock said when an event was stamped — keeps its
fetch stamp as history, which is a different use from
answering "now".)

Two times, two standings, no silent reconciliation:

- The **frame** is the conversation's stated time. Situated
  answers (Slice 5's shapes, the season/daypart machinery,
  SA-style situated reasoning over the frame) stand on it.
- A **clock reading** is a consulted fact about the host's
  world. It can *supply* a time where the frame has none —
  through the consultation route, with its provenance
  visible — and it can be *compared* with the frame's.
- Where both stand and they disagree, the disagreement is a
  statable fact ("the conversation was opened as 2 PM; the
  host clock reads 3:40 PM"), not a discrepancy one side
  silently absorbs. Which governs a given answer is the
  answering shape's stated choice; Timekeeping's job is
  that both readings exist with their standings intact.

### 2.3 What Timekeeping does not do

- **No arithmetic.** Durations, intervals, "how long
  between", date differences: computation over readings,
  homed in Quantification's Mathematics (the quantity
  ledger is already a registered holding; whether duration
  arithmetic registers there as a holding, or awaits a
  Mathematics build, is a registry question for the owner —
  recorded in §7's neighbourhood, not decided here).
- **No ordering.** Before/after, earliest/latest, sorting
  by time: the Ordering And Sorting family applied to
  readings. Timekeeping supplies readings that *bear* an
  order; it does not sort them.
- **No testimony.** A clock reading enters as a retrieved
  fact with provenance, exactly as a weather reading does;
  Timekeeping itself asserts nothing about what the time
  *means* — season, daypart and situated significance stay
  with the frame's tables and Awareness.

### 2.4 Staleness, asked uniformly

Every bank that states shelf lives states them in its own
terms today (weather's TTL configuration, the geography
register's per-kind table). Timekeeping's staleness
operation is the uniform question over all of them, asked
in one form:

- *Of a banked fact*: fresh or stale, under the shelf life
  its own bank states for its kind — and if stale, by how
  much; if fresh, how long it has left.
- *Of a kind or a bank*: what goes stale by a stated
  horizon — the question Scheduling's re-consultation
  (§3.3) is built from.
- *Where no shelf life is stated*: the honest answer is
  **"no shelf life stated"** — not "fresh". The Wikidata
  bank states none (a capital does not expire), and
  Timekeeping does not invent one for it. Staleness is
  defined only where a TTL stands.

Today the stale-only decline (geography catalogue) reaches
this answer by hand, per bank. Under this design it is one
operation's answer, cited the same way wherever it is
asked. Timekeeping *reports* staleness; what to do about a
stale fact — re-consult, decline, schedule — is the
asker's business.

### 2.5 The missing-clock decline stands

Nothing in this section weakens Slice 5's frame-less
behaviour. Frame-less **and** clock-unconsulted, "what is
the time?" declines at the missing clock reading, in the
words that slice shipped (themselves draft, owner's to
settle). The clock route is additive: a shape that today
declines may, where a clock source is wired and the owner
has ruled the route open, consult instead — and then its
answer cites a retrieved reading, never a frame fact it
does not have. Whether the time/date shapes gain the clock
route by default is a build-slice question (§6, T1), not
settled by this note.

## 3. Scheduling — commitments held as records

PROPOSED seat: `functions/scheduling`, a family in the
Functions Unit.

### 3.1 The record

A scheduled item is a record in a session-scoped register
(the register pattern of `session.problems` and the quantity
ledger: a register rides the Session, initialised empty).
Fields:

| Field | Content |
| :--- | :--- |
| owed | The action or plan owed, stated in the registering unit's terms — a re-consultation of a named banked fact, a self-turn on a named subject, a demand to be raised. Scheduling holds the statement; it does not interpret it. |
| trigger | A **time** (a clock reading's terms: at, by, or after a stated time), or **time + condition** (at the time, if the condition then holds — the condition stated in terms some named unit can evaluate). A bare condition with no time is not a Scheduling trigger; it is an Expectation's satisfaction (§4) or nothing. |
| registered-by | The unit that registered the item. Only the registering unit may cancel or amend its own items (§7 records the visitor question separately). |
| registered-at | The stamp of registration — a frame fact or a clock reading, with its standing named, as §2.2 requires of any stamp. |
| registration expiry | The registration's **own** shelf life: past it, an un-fired item lapses (§5.3) instead of standing forever. Every registration carries one; "no expiry" is stated as a value with a reason, never as an omitted field. |
| on-due | The demand the item will raise (§3.2), stated at registration so the firing is auditable against it. |
| calendar placement | The item's date(s) on the grid (§8.10): the calendar system the trigger's date stands in, named; and, for a recurring item, the pattern it cites (Form's Repetition) and the dates the grid gives that pattern. A trigger stated as a duration from now is placed as the date the duration lands on, computed at registration and recorded. |
| timeline placement | The item's sequence on the line (§8.10): its stated relations to named events or items, in Allen relations (§8.8) — due after a named expectation's deadline, before a named reading goes stale. Placement states where the item stands; it is not a second trigger — the trigger field above still governs firing. |

Registration is **not authorisation**. An item's presence
in the register records that a unit committed to ask; it
does not pre-approve the act. Pricing happens when the
item falls due, by the Planner, on the situation then
standing (§3.2).

### 3.2 Scheduling never acts

When an item falls due, Scheduling raises the demand its
record states — onto the Planner, in the same posture the
Social Unit and GeographyAwareness raise demands: it does
not execute the owed action, does not author a reply, does
not originate a claim. The Planner prices the demand
against the standing situation and either executes (through
whatever machinery the action names — a consultation
wrapper, a self-turn's reply planning) or **declines it
located-ly**: the decline names the item, its registering
unit, and the ground it failed on, and the item's record
closes with that decline as its closing evidence. A
scheduled item is therefore never a promise the system
cannot account for: fired-and-done, fired-and-declined, or
lapsed — each a recorded end, none a silence.

### 3.3 Demonstrator scope, stated as scope

Two uses are in scope for the demonstrator; the design
does not pretend to more:

- **Scheduled re-consultation.** A banked fact approaching
  its shelf life (Timekeeping's staleness horizon, §2.4)
  gets a scheduled item: before it stales, re-consult its
  source and re-bank. Weather readings and banked routes
  are the standing examples — both are facts the system
  already holds with TTLs, whose refresh is a consultation
  it already knows how to make. This is the use that turns
  the stale-only decline from a dead end into a usually-
  pre-empted event.
- **Scheduled self-turns.** The mechanism behind "I'll
  check again later": a unit that cannot finish a matter
  this turn registers a self-turn — a demand, at a stated
  time, to take the matter up again and say what it finds,
  including finding nothing (§4.6's timeout discipline is
  the same honesty, one resource over). Without this
  record, the sentence is a courtesy; with it, the
  sentence cites a registration that exists and can be
  audited.

Out of scope, stated: recurring calendars, visitor-facing
reminders as a product feature (§7 — a shapes and posture
question, not a Scheduling question), and any execution
that bypasses the Planner.

The addendum (§8.10) designs the *placement* a recurrence
needs — a pattern cited from Repetition, its dates supplied
by Calendar — as machinery. "Recurring calendars" above
names the product feature, and it stays out of scope;
whether periodic firing enters a build is C3's question
(§8.12), not settled here.

### 3.4 The waking limit, and the driver contract

**The limit, in this note's own voice:** the entity is
turn-based. Nothing inside it runs between turns. Due
items are therefore evaluated **at turn boundaries** — an
item whose time passes mid-silence is not fired late; it
is fired at the next turn's opening sweep (§3.5), and its
record says when it fell due and when it was taken up.
Any finer waking — firing at the minute, delivering an
arrival as it happens — needs a **host driver**: a process
outside the entity that holds the wall-clock watch, on the
precedent of the weather wrapper (asynchronous machinery
outside the synchronous `processTurn`, acting on exactly
the outcomes it is chartered to act on). This note does
not design that host process. It specifies the entity-side
contract a driver stands under:

A driver **may ask**:
- what is due — the items whose trigger time has passed
  under a clock reading the driver supplies;
- what is open — the scheduled items and expectations
  standing, with what would fire or satisfy each;
- what goes stale by a horizon (Timekeeping's question,
  §2.4, asked through the same seam).

A driver **may deliver**:
- a **clock reading** — which enters as a consultation
  result under §2.2, provenance and all;
- an **arrival** — a source name and a payload, offered to
  an open expectation (§4.5); the payload then faces the
  testimony gates like any consultation result (§4.4) —
  delivery is not admission;
- a **turn opportunity** — the occasion for a self-turn,
  which is a turn like any other: the Planner plans it,
  the Verbalizer words it.

A driver **may never**: execute a scheduled action, admit
testimony, author or word a reply, cancel or amend a
registration, or mark an expectation satisfied. The driver
is a clock and a doorbell. Everything it rings for is
decided inside.

### 3.5 The turn-boundary protocol

At each turn, in order:

1. **Opening sweep.** Before the new input is planned, the
   registers are swept under the turn's best time standing
   (the frame's, or a clock reading taken for the turn):
   due scheduled items raise their demands; lapsed
   registrations close as lapsed; expectations past their
   deadline raise their timeouts (§4.6); expectations whose
   satisfaction the intervening turns have already banked
   close as satisfied (§4.5). Sweep outcomes ride the
   turn's trail as annotations, in the Social Unit's
   manner — visible to the Planner, accounted in the
   trace, never silently merged into the visitor's input.
2. **The turn proceeds** on its own business; the sweep's
   demands are priced alongside it, and a self-turn owed
   from an earlier registration is taken up as the turn's
   business where the Planner so prices it.
3. **Closing registrations.** Items and expectations
   registered during the turn are stamped (§3.1) and stand
   from the next sweep forward. A registration made and
   due within the same turn fires no earlier than the next
   turn's sweep — the boundary is the boundary, stated so
   no slice has to discover it.

## 4. Expectation — the waiting resource

PROPOSED seat: `functions/expectation`, a family in the
Functions Unit, **chartered jointly with the lack
machinery** (§4.3): the seat is a Function family's, but
its registrar and its account of record live with
ProblemSolving's records, and neither side of the charter
is complete without the other.

### 4.1 The name

The owner ruled that waiting takes a different name from
Scheduling, and this note records the name as
**Expectation**, with the reasoning settled in the same
conversation: not *Watch* — a watch implies a sensor, a
standing apparatus pointed at the world, and the system
has none (§4.5 is explicit about what "standing" can
honestly mean); not *Vigil* — a vigil implies devotion, a
posture toward what is awaited that the record neither
has nor should pretend to. **Expectation names the
operative part: what would satisfy it.** An expectation
that cannot state its satisfier is not registered; that
is the name doing its work.

### 4.2 The record

An expectation is a record in a session-scoped register,
on the same register pattern as §3.1. Fields:

| Field | Content |
| :--- | :--- |
| satisfier | What would satisfy it, stated checkably: **a fact** (a named relation over named subjects, e.g. the coordinates of a named place), **a reply** (the interlocutor's answer to a named open question), or **an arrival** (a result from a named source, e.g. a reading from a named weather source for a named place). |
| expected-from | The source the satisfier is expected from: a named external source, the register/bank a consultation would fill, or **the interlocutor** — a visitor's later statement is an arrival from a named source like any other. |
| deadline | A stated time (frame terms or clock terms, standing named), past which the expectation times out (§4.6). An expectation without a deadline is not registered; open-ended waiting is how registers fill with the dead. |
| on-satisfaction | What it raises when satisfied: the demand, and the problem record it answers (§4.3). |
| on-timeout | What it raises when the deadline passes unsatisfied (§4.6). Stated at registration, like Scheduling's on-due — the timeout's firing is auditable against it. |
| registered-by / registered-at | As §3.1: the registering unit, and the stamp with its standing. |

**Addendum — the deadline's home (§8.10).** The deadline
above is a Calendar/Timeline fact: its date stands on
Calendar's grid, in a named system, and its sequence
stands on the conversation's Timeline — after the wait
was registered, before whatever the wait was protecting
goes stale, in Allen relations where they are stated.
§4.6's timeout is evaluated against that placement;
nothing in this section's record changes.

### 4.3 The joint charter — the hand-off from a lack

The ProblemRecord remains **the account of the need**.
Expectation is a watch kept over some of those accounts,
not a rival ledger. The hand-off, specified:

- **Which lacks may register an expectation** is decided
  by one test: *could the world — including the
  interlocutor — deliver the satisfier without the system
  itself changing?*
  - `lack-of-information` — **yes, the primary case.** The
    fact exists or may come to exist outside the system:
    a source can be consulted again, a source not yet wired
    can answer through a driver-delivered arrival, the
    interlocutor can state it. The turn that would have
    ended in the decline instead ends having registered
    the expectation, and says so (§5.1 shows the shape of
    the saying — wording is a build slice's draft, owner's
    to settle).
  - A stated value owed by the interlocutor (a quantity,
    a name, a place — the matter a `quantification` need
    or a clarification is waiting on) — **yes**, as an
    expectation whose expected-from is the interlocutor
    and whose satisfier is their statement of it. The
    statement, when it comes, is testimony from the
    speaker about their own matter, under the standing
    testimony rules — not a consultation result, and not
    admitted by the expectation (§4.4).
  - `capability` — **no.** A capability lack closes by the
    registry audit (held / seat-exists-unbuilt / no-seat)
    and, where unbuilt, by the owner's commissioning a
    build. The world arriving does not build a seat; an
    expectation registered over a capability lack would
    wait for an event that is not an arrival. The lack
    stands located, as the audit leaves it.
  - `how-to-proceed` — **no.** It already closes priced at
    its turn (`declined-priced`), its closing evidence
    naming the unbuilt instrument. The instrument is
    internal; nothing external satisfies it.
- **Who owns what.** The ProblemRecord is opened exactly
  as today (by a decline, by an assessed need), with its
  need, ground and seat history unchanged. Registering an
  expectation adds a **reference from the problem record
  to the expectation record** — the expectation's id,
  recorded on the problem record as an annotation of how
  the need is being carried, not a status the record's
  existing lifecycle has to learn. The expectation
  register owns the watch (deadline, satisfier, firings).
  When the expectation closes — satisfied or timed out —
  it **files its closing evidence back into the problem
  record's closing-evidence field**, and the problem
  record closes (or stands open, where the timeout leaves
  the need still standing — §4.6) by ProblemSolving's own
  rules. One account of the need; one register of the
  watch; the join is a reference, auditable both ways.
- **What registration does to the turn.** Registering an
  expectation does not un-decline the turn that opened
  the lack: the visitor is still told, located-ly, what
  the system does not have. What changes is the ending —
  the lack is carried openly instead of dropped, and a
  later satisfaction or timeout has somewhere to land.

### 4.4 Satisfaction enters through the gates, never by say-so

An expectation's being satisfied is a **routing** event,
not an **admission** event. When a candidate satisfier
appears — a consultation result, a driver-delivered
arrival, the interlocutor's statement — it faces exactly
the gates any such content faces: retrieved content banks
with its SourceRecord at the retrieved confidence and
never becomes a propagation anchor by arriving expected;
a consultation's `{ status: "unavailable" }` is a stated
state, not a satisfaction; the interlocutor's statement
is attributed testimony, checked against the standing
premise discipline like any statement. The expectation
contributes only this: it **notices the candidate, names
the need it answers, and raises the on-satisfaction
demand**. If the gates refuse the content, the
expectation is not satisfied — it stands, and the refusal
is recorded on its record as an event. Nothing enters
the system's knowledge because it was waited for.

### 4.5 What "standing" honestly means

Expectation is a **standing consultation** where the
Wikidata, weather and geography lookups are one-shot —
but "standing" has exactly two honest standings at this
system's rung, and the note states both rather than
letting the word imply a third:

- **Re-check on later turns.** At each turn's opening
  sweep (§3.5), open expectations are re-checked against
  what the intervening turns have banked and said: a
  satisfier already in the banks closes the expectation
  satisfied; a satisfier the visitor has just stated is
  caught by the same sweep that reads their turn. Between
  turns, nothing is watched. This standing costs no host
  machinery and is the demonstrator's default.
- **Driver-delivered arrival.** Where a host driver
  stands (§3.4), it may deliver an arrival to an open
  expectation as it happens — the expectation is then
  evaluated at delivery, under §4.4's gates, and its
  demand raised for the next turn (or a self-turn the
  driver also delivers the occasion for). The watching
  in this standing is the **driver's**, and the record
  says so: an expectation satisfied by delivery names the
  driver-delivered arrival as its closing evidence's
  route.

Continuous watching by the entity itself is not a
standing this note claims, at any point, in any wording.

### 4.6 Timeout is information

When the deadline passes unsatisfied, the expectation
**raises its on-timeout demand** at the next opening
sweep (or on driver delivery of the occasion). The
timeout states, as a fact the Planner can use: what was
waited for, from whom, until when, and that it did not
come. That fact closes some questions (the source did
not answer; the visitor did not say) and prices others
(the need reverts to a plain standing lack, its problem
record annotated with the timeout as evidence). Where
the timeout is owed a telling — a self-turn registered
alongside, §3.3 — the telling is a **located decline in
retrospect**: it names the original question, the wait,
and the deadline, and declines the original ask at the
timeout. It never presents the absence as an answer, and
an expectation never dies silently: satisfied, timed
out, or cancelled by its registering unit — each a
recorded end.

## 5. The three together

### 5.1 Worked chain — a weather expectation

The visitor asks for weather the system cannot yet serve,
and the three resources carry the matter across turns.
(Wordings are illustrative shapes, not settled text.)

1. **The ask.** "What is the weather in Tulsa?" — no
   situated place stands for the visitor, but the question
   names its own place, so GeographyAwareness is not the
   gap; the gap is that Tulsa stands in **no register**: no
   coordinates held, no banked reading. The weather shape
   declines located at the missing reading — and the
   decline files its ProblemRecord, need
   `lack-of-information`, as every decline now does.
2. **The lack stays open.** The lack passes §4.3's test —
   the world can deliver this without the system changing
   (a geocoding consultation can resolve Tulsa; a weather
   source can then read for the point). An **Expectation**
   is registered: satisfier = a current weather reading
   for Tulsa; expected-from = the geography consultation
   chain (Nominatim, then the weather source); deadline =
   a stated horizon in the turn's time standing;
   on-satisfaction = raise the weather answer as a
   self-turn demand; on-timeout = raise the timeout (§4.6).
   The problem record gains the reference. The visitor is
   told the located gap **and** that the system is keeping
   the question open — the second clause is a statement
   about a registration that exists.
3. **Scheduling holds the re-check.** Alongside the
   expectation, a **scheduled item**: at the next turn
   boundary (and, under a driver, at a stated interval),
   re-run the resolution — the owed action is the
   re-consultation, registered by the weather machinery,
   with its own registration expiry set no later than the
   expectation's deadline. Registration authorises
   nothing; it commits the system to *ask again*.
4. **Timekeeping decides.** At the next turn's opening
   sweep, the sweep's clock standing (frame, or a clock
   reading taken for the turn) decides three things: is
   the scheduled re-check **due**; is any reading since
   banked still **fresh** (a Tulsa reading banked by an
   intervening turn inside its 30 minutes would satisfy
   without new consultation); is the expectation's
   deadline **passed**. Ordering over those readings is
   Ordering's; the durations are Quantification's;
   Timekeeping supplied the readings and the staleness
   answers, and decided nothing else.
5. **Firing.** The re-check is due. Its demand reaches
   the Planner, which prices it against the standing
   situation and executes: the consultation runs (one-shot,
   as today — Nominatim resolves Tulsa, the point banks in
   the geography register, the weather source reads for
   it, the reading banks in the weather bank with its
   fetch time and shelf life). The content entered through
   §4.4's gates at every step — retrieved provenance,
   SourceRecords, no anchors made of arrivals.
6. **Satisfaction.** The banked reading matches the
   expectation's satisfier. The expectation closes
   satisfied, filing its closing evidence into the problem
   record, which closes with it. The on-satisfaction
   demand — the self-turn — is the turn's business: the
   visitor is answered, from the banked reading, with its
   source and fetch time stated, as weather answers
   already are. The answer is late, and says nothing to
   pretend otherwise; its fetch stamp *is* its lateness,
   stated.
7. **The other ending.** Had the deadline passed first —
   the source unavailable at every re-check, the place
   unresolvable — step 4's sweep raises the **timeout**
   instead: the expectation closes timed-out, the problem
   record stands open with the timeout as its evidence,
   and the owed telling (§4.6) declines the original ask
   located at the timeout: the question, the wait, the
   deadline, the non-arrival. The scheduled re-check,
   its registration expiry reached, lapses with it.

### 5.2 Short chain — re-consultation without Expectation

A weather reading stands banked, fresh, 30-minute shelf
life. Nothing is lacking; nobody is waiting. The weather
machinery registers a **scheduled item** alone: shortly
before the reading stales (Timekeeping's horizon answer),
re-consult and re-bank. At the sweep where it falls due,
the Planner prices and executes it, and the next asking
finds a fresh reading where the stale-only decline would
have stood. Scheduling and Timekeeping, no Expectation —
the resources compose pairwise as well as all three, and
no slice should build the trio as a monolith.

### 5.3 The declines catalogue

Every end the trio can reach that is not an answer, each
located at its own ground:

| Decline | Located at | Ground |
| :--- | :--- | :--- |
| No clock reading | Timekeeping: the missing reading | Frame-less and clock-unconsulted (or the clock source unavailable, stated as a state): Slice 5's standing decline; nothing in the trio invents a time to proceed on. |
| Registration expired unsatisfied | Scheduling: the lapsed item | The registration's own shelf life passed before its trigger fired (a long silence between turns is the ordinary cause); the item closes lapsed, its registering unit told through the record — a commitment the system let die is accounted, not vanished. |
| Expectation timed out | Expectation: the deadline | The satisfier did not arrive from its named source by its stated deadline; the timeout is raised as information (§4.6), the need reverts to a standing lack with the timeout as evidence. |
| Due item declined by the Planner | The Planner's pricing of the demand | The situation at firing does not carry the act (the conversation has closed, the ground has changed, the price fails); the decline names the item, its registrar, and the ground — Scheduling's record closes with it as evidence (§3.2). |
| Re-check source unavailable | The consultation, as today | A fired re-consultation meets `{ status: "unavailable" }`: a stated state, recorded on the item/expectation as an event; the wait continues to its deadline or lapses — unavailability is never dressed as satisfaction or as absence. |

## 6. Proposed build slices (not commissioned)

Stated so the design has prices attached; none of this is
commissioned by this note, and the order is a proposal.

- **T1 — Timekeeping.** The clock-consultation operation
  (host clock as the one wired source; readings banked
  retrieved-kind with SourceRecords), the staleness
  operation over the standing banks (weather, geography
  register; the Wikidata bank answering "no shelf life
  stated"), and — only on the owner's ruling — the
  time/date shapes' clock route beside the frame route.
  Acceptance sketch: frame-less "what is the time?" with
  a wired clock answers from a cited reading; with the
  clock source down, the standing decline, unchanged in
  ground; staleness answers cited against both TTL'd
  banks in tests.
- **T2 — Scheduling.** The register, the opening-sweep /
  closing-registration protocol (§3.5), and scheduled
  re-consultation for the weather bank as the one wired
  consumer (§5.2's chain). Acceptance sketch: a reading
  banked in tests with a short TTL is refreshed by the
  sweep before it stales, with the firing, the pricing
  and the re-bank all in the trace; a lapsed registration
  closes as lapsed in the catalogue's words.
- **T3 — Expectation.** The register, the §4.3 hand-off
  (lack-of-information and interlocutor-owed values
  eligible; capability and how-to-proceed excluded, with
  the audit's verdicts untouched), §4.4's gates, and
  §5.1's chain as the acceptance walk — satisfied ending
  and timeout ending both exercised, both filings landing
  in the problem record's closing evidence.

Each slice, when commissioned, also places its family's
seat on the system map (PROPOSED addresses in §§2–4) and
registers any built operation in the capability registry
— a seat is not a holding until the registry says so, on
the Functions Unit's own rule.

## 7. Open questions (owner's — decided nowhere in this note)

1. **The host driver.** §3.4 specifies the entity-side
   contract and no more. Is a driver built later as
   wrapper machinery of this system (the weather wrapper
   is the precedent for async machinery living outside
   `processTurn`), or is waking left to whatever host
   embeds the entity, with the contract as the whole
   design? The demonstrator runs honestly at turn
   boundaries without one; everything finer waits on
   this ruling.
2. **Persistence.** The schedule and expectation
   registers are designed session-scoped, on the standing
   register pattern — which is the banks' known limit in
   new dress: a process restart drops every commitment
   and every open wait, exactly as it drops every banked
   reading. Is that accepted for the trio (a commitment
   no more durable than the conversation is at least an
   honest one), or does a commitment's nature — a promise
   about the future — argue for durable registers before
   the rest of the banks get them?
3. **Visitor-registered items.** May a visitor register,
   amend or cancel scheduled items and expectations
   conversationally — "remind me…", "forget that", "keep
   watching for…"? This is a shapes question (the
   constructions do not exist) with a Rung-1 posture
   question inside it: a self-turn the visitor commissioned
   is a different social object from one the system
   registered for its own bookkeeping, and which of them
   the system may originate, at its current rung, is the
   owner's call — not a detail for a build slice to
   settle by implementing one.
4. **Caps.** How many open items may one conversation
   hold — scheduled items, expectations, in total and per
   registering unit? A cap is a pricing question (an open
   register is a standing claim on every future sweep),
   and an uncapped register is a decision too, made by
   default. The note proposes no number; it records that
   the question exists before the first register fills,
   not after.
5. **Seat wording on the map.** The addresses proposed in
   §§2–4 (`functions/timekeeping`, `functions/scheduling`,
   `functions/expectation`) are this note's wording.
   Whether Expectation sits as a Functions family with a
   joint charter, or is drawn with a cord to ProblemSolving
   that the map must express, is the owner's when the map
   is next drawn — the geography note left its own version
   of this question the same way.
6. **A conversation's default grid.** Calendar holds
   systems plural (§8.3). Which system a given
   conversation's dates stand in by default — the
   Gregorian of the frame's ISO input, the lunisolar of
   the knowledge graph's home tradition, the interlocutor's
   own — is a situated question, of the same kind
   GeographyAwareness answers for place: place and
   interlocutor bear on it, and it may shift
   mid-conversation as a stated place does. The addendum
   names the question (§8.3); which seat answers it, and
   by what order of suppliers, is the owner's.
7. **Authoring Timelines conversationally.** Reading a
   Timeline — "what happened before that?" — is one
   matter; authoring one in conversation (the visitor
   dictating an event sequence the system then holds as
   an object) is another, and it is question 3's shapes
   and posture problem in a second dress: constructions
   that do not exist, and a ruling owed on what the
   system may hold because it was told to hold it.
   Decided nowhere here.
8. **Historical timelines' testimony route.** A dynasty's
   dates are knowledge, and they enter as knowledge: from
   which attested sources, banked by what intake (§8.7)?
   The standing intake question, applied to time — with
   the addendum's qualification (§8.5) that a date
   recorded under a dynastic calendar is not converted by
   the modern lunisolar port without anachronism, so the
   route must say under which system each historical date
   stands before any conversion is run on it.
9. **Map wording for the trio.** §8.2's proposed seats
   (`functions/calendar`, `functions/timeline`) are this
   note's wording, beside `functions/scheduling`. Whether
   Calendar's systems register is drawn as knowledge in
   the OKU's keeping with its operations in Functions —
   the split §8.2 proposes — or drawn whole in one place,
   is the owner's when the map is next drawn, as question
   5 was left for Expectation.

## 8. Addendum — Calendar and Timeline beside Scheduling

Settled by the owner in conversation on 2026-11-20, after
§§1–7 were written, and integrated into this note the same
day: Scheduling does not stand alone. It is the commitment
layer of a trio, and this chapter designs the other two
members — **Calendar**, the grid a commitment's dates stand
on, and **Timeline**, the line its sequence is stated on —
in the terms §§1–7 established. Nothing in §§2–5 is
re-decided here. Where the addendum changes the front of
the note, it does so in place: §1 gains settled points
8–10; §2.1 and §3.3 gain pointers; §3.1's record gains two
placement fields; §4.2's deadline gains its home (§8.10);
§7 gains questions 6–9. This chapter's seat addresses and
record shapes are PROPOSALS, its slices (§8.12) are not
commissioned, and its open questions are recorded in §7,
not decided here.

### 8.1 Basis for this addendum

Read for this chapter, beyond §0's basis:

- The **Form design note** (branch `track/form-design`,
  `docs/ansci/form-design-note.md` §5) — Repetition: the
  pattern record (unit, period, phase, provenance), and
  §5.3's Scheduling boundary: Form owns the pattern,
  Scheduling owns the commitment, and a periodic trigger
  is an extension of Scheduling's design "to be taken up
  in Scheduling's terms when it is taken up". §8.10 is
  that taking-up, for placement.
- `src/ansci/session.ts` (this tree), read in full for the
  frame: `SEASON_CONVENTION` and `DAYPART_CONVENTION` are
  connective-layer conventions mapping a month or an hour
  to a season or daypart name — over a grid the frame
  nowhere names. `FrameInput` takes month/day/hour or an
  ISO date string, which is to say the Gregorian grid,
  assumed and nowhere held. The geography note's basis
  line on the frame stands: a time record (month/day/
  hour, season, daypart); there is no place in it, and —
  this chapter adds — no calendar in it either.
- `docs/user-ref/nct-ancientscience-Taiji.txt` — the
  owner's reference material, where the **24 solar terms**
  stand in this repo's record: the Taiji curve
  "traditionally derived" from them, their maxima and
  balance points the solstices and equinoxes. Reference
  material, not banked knowledge — §8.6 states what that
  standing means for the terms' home.
- The **dynasty material**, stated at the level actually
  read: the UnitsMeasurement record (`ai-system/
  system-map.ts`; its PLACEHOLDER) — historical measure
  values varied by dynasty, "a Han 斤 was not a Qing 斤",
  and **no dynasty table is banked**; and the ingested
  corpus (`src/ansci/ingested.ts`), whose classical texts
  carry dynasties in their edition provenance (the Suwen
  as a Jin-dynasty published text). Dynasty names stand
  in the record as provenance of texts and as a remark
  about measures — not as a banked chronology. §8.7
  designs against exactly that, no more.
- The **derived provenance kind** (geography G3, branch
  `track/geography-build` as landed;
  `docs/ansci/geography-g3-report.md`): a computed fact
  cites its inputs' provenance and carries none of its
  own — the kind §8.5's conversions take.
- The two **ports' public records**, verified 2026-11-20
  and cited where used: Dershowitz & Reingold,
  *Calendrical Calculations* (§8.5), and Allen's interval
  algebra (§8.8).

### 8.2 The trio, and what kind of things the new members are

```
Timekeeping — the readings: consulted, stamped (§2)
Calendar    — the grid: date systems held as knowledge;
              the dates patterns and triggers land on
Timeline    — the line: event sequences held as objects
              with owners; their relations Allen's
Scheduling  — the commitments: placed on the grid and
              on the line; due ⇒ a Planner demand (§3)
Expectation — waits on the world (§4); its deadline is
              a Calendar/Timeline fact (§8.10)
```

§1's organising line extends, it does not change:
Scheduling waits on time, and the time it waits on stands
somewhere — on a grid, in a sequence — or it is only a
duration looking for a date.

Calendar and Timeline are **held structures with
operations over them**, and the split is the design: a
date system, and a timeline's events, are *holdings* —
knowledge and records, kept under the provenance
discipline — while conversion, grid arithmetic and
relation computation are *operations*, generic machinery
in the Functions pattern (§1, point 3). PROPOSED seats
for the operations: `functions/calendar` and
`functions/timeline`, beside `functions/scheduling`; the
holdings' homes are stated in §§8.3 and 8.7, and the map
wording is the owner's (§7, question 9). Neither member
testifies, speaks or acts: Calendar's systems are attested
by their sources like any knowledge; Timeline's relations
are computed, not claimed; and a commitment placed on
either is priced by the Planner at due time exactly as
§3.2 already rules.

### 8.3 Calendar — date systems held as knowledge

A calendar system, as a holding, is a record: its name
and its **provenance** (the attested statement of the
system — where it is described, and by what intake the
description was banked); its **epoch and year count** (for
the lunisolar, the sixty-year sexagesimal cycle of
stem-and-branch year names — a Repetition of period sixty
over years, held as the system's own structure, Form's
pattern record citing it, not replacing it); its **month
structure** (the count of months, their lengths or the
rule that fixes them — on the lunisolar, months of 29 or
30 days beginning at the new moon); its **intercalation
rule** (leap months, and where in the year they may
fall); and its **named points of the year** — for the
lunisolar, the 24 solar terms (§8.6).

Two systems stand at minimum (SETTLED, §1, point 9):

- The **Gregorian** — the grid the frame's ISO input
  already assumes, the civil calendar of the host clock's
  readings, arithmetical in the port's terms (§8.5).
- The **Chinese lunisolar** — months by the moon, the
  year kept to the sun by leap months placed against the
  solar terms; arguably the home system for a knowledge
  graph whose holdings are the classical Chinese corpus.

Plurality is the design, not an accident of the examples:
a system not held is a system the machinery declines on
(§8.11), and holding a third — the Julian, for historical
European dates — is an intake decision of the same kind
as holding the first two. Which system a conversation's
dates stand in *by default* is a situated question, and
it is open (§7, question 6).

What a system holding is not: it is not the frame's
conventions (§8.6 keeps those exactly where they are),
not a clock (Timekeeping reads clocks; Calendar says
what a reading's date *is*, in a named system), and not a
timeline (Calendar holds no events — §8.7).

### 8.4 Calendar arithmetic is not duration arithmetic

§2.3 left duration arithmetic to Quantification, as a
registry question. The addendum draws the line's other
half: **arithmetic on the grid belongs to Calendar.** The
two arithmetics answer different questions:

- "+ 30 days" is a duration question — Quantification's,
  grid-free, the same on every calendar that has days.
- "One month from now" is a grid question. A month is a
  unit of a *system*, irregular by convention — 28 to 31
  days on the Gregorian grid; 29 or 30 on the lunisolar,
  with a leap month standing where no Gregorian month
  does. No duration answers it; the grid does.
- "What weekday?", "which solar term are we in?", "how
  many days in this month?" — grid questions, all.

One edge is stated now so no slice discovers it: a
monthly placement on the 31st meets February. What the
placement does there — lands on the month's last day,
skips the month, or declines — is a rule the placement
states (§8.10), in the system's own terms, recorded on
the item. It is never improvised at firing time: §3.2's
audit discipline, applied to dates.

### 8.5 Conversion is computation — the port, and its qualifications

Converting a date between two held systems is
**computation over the holdings**, and its result takes
the **derived provenance kind** geography G3 established
(§8.1): a computed fact cites its inputs' provenance and
carries none of its own. A converted date therefore
records the date as stated and the system it stands in,
the system converted to, and the conversion machinery
(the port, and its version); through those, the two
system records' provenance. A converted date is never
testimony that a date *is* anything in the second system;
it is the grid's answer, auditable to the systems held.

The machinery is a **port**: Dershowitz & Reingold,
*Calendrical Calculations* (4th edition, "The Ultimate
Edition", Cambridge University Press, 2018). Verified
from the publisher's table of contents, 2026-11-20:
Part I, "Arithmetical Calendars", specifies the Gregorian
(ch. 2), the Julian (ch. 3), the ISO calendar (ch. 5) and
nine more; Part II, "Astronomical Calendars", specifies
the Chinese calendar (ch. 19) among the Persian, Bahá'í,
modern Hindu and Tibetan; the appendices carry the Lisp
reference implementation and sample data. The port takes
the algorithms as the book states them, under the owner's
solved-problem rule (§1, point 10 records the same ruling
for Allen); calendrics is not re-derived here.

The Chinese-calendar coverage needs three qualifications,
stated as part of the design, not as footnotes to it:

1. **It is an astronomical calendar, in the book's own
   organisation.** The Chinese chapter stands in Part II,
   not Part I: its dates are computed from astronomical
   events — new moons and solar terms — reckoned for a
   stated location (the Chinese standard-time meridian;
   the Japanese, Korean and Vietnamese siblings differ by
   location), resting on the book's time-and-astronomy
   machinery (ch. 14). The Gregorian port is
   self-contained arithmetic; the lunisolar port is not,
   and C2 (§8.12) is sized accordingly.
2. **It is the modern calendar.** The system the book
   specifies is the calendar in force since the 1645
   reform. Chinese calendar rules changed repeatedly
   across the dynasties, and the public record is plain
   that many published accounts describe superseded rules
   — pre-1645, some pre-104 BCE. A date recorded under a
   dynastic era's own calendar is therefore **not**
   converted by this port without anachronism: such a
   system, if the system is ever to hold it, is a
   separate holding, attested separately (§8.7; §7,
   question 8).
3. **Its edge cases are delicate, on the record.** The
   leap month of 2033 was placed wrongly in published
   calendars until Chinese astronomers caught the error
   in the 1990s. The port's acceptance therefore runs on
   the book's own sample data (its Appendix C) as test
   vectors; and conversions at far ranges carry the
   astronomers' caveat — long-range astronomical
   prediction degrades, so a conversion's derivation
   record states the range it was computed over rather
   than implying exactness at every range.

### 8.6 The solar terms' home — and what changes for their consumers

The 24 solar terms are facts of the lunisolar system: the
year's 24 named points, spaced by the sun's course —
solstices and equinoxes among them, as the owner's
reference material states the derivation — and the
mechanism by which the lunisolar year is kept to the
solar year and its months numbered. Under this addendum
they are held **in Calendar**, as part of the lunisolar
system record (§8.3), entering through the same intake as
the system itself. The user-ref file named in §8.1 is
reference material toward that intake, not the holding:
the terms enter as attested knowledge or not at all.

What changes for the consumers that lean on the terms'
neighbourhood today — stated exactly, because nothing
here migrates silently:

- The frame's `SEASON_CONVENTION` stays what it is: a
  connective-layer convention mapping Gregorian months to
  season names, doing its work at session opening (§0).
  The season-name machinery does not move, and does not
  start citing Calendar.
- What the convention *approximates* becomes nameable:
  its four seasons are a coarse division of the same
  solar course the 24 terms divide finely. A consumer
  that needs a season *name* keeps the convention. A
  consumer that needs a **term** — which term a date
  falls in, when the next term falls, a term's own name
  and place in the year — asks Calendar, and cites the
  system record.
- The situated machinery that stands on the frame
  (§2.2's situated answers; GeographyAwareness for place,
  the frame for time) is a consumer of the second kind
  only where a shape asks a term-level question. Until
  one does, its behaviour changes not at all. The change
  this section makes is one of *address*: the terms have
  a home, and future asking goes there — the same
  discipline the geography note applied when it gave
  place a home rather than another frame field.

### 8.7 Timeline — event sequences as objects with owners

A Timeline is a held object: an ordered set of **events**,
each an entry with a name, an **extent** (a point, or an
interval with a start and an end), and the extent's
**standing** — a date in a named Calendar system, a clock
reading, a frame fact — stated the way §2.2 requires of
any stamp. A Timeline has an **owner**, and the owner kind
fixes where the object lives and how its entries enter:

- **A knowledge timeline** — a dynasty's, a reign's, a
  text's transmission. Its entries are knowledge: they
  enter through the testimony gates, banked with
  provenance, like any claim. The present record stated
  honestly (§8.1): no chronology is banked today —
  dynasties stand in the record as the provenance of
  texts and as a remark in the measurement record, not
  as dated entries. A dynasty Timeline is therefore
  designed here and populated by an intake this note
  does not perform (§7, question 8). Its dates, when they
  come, stand in a named system each — many will stand
  in era-year or lunisolar terms, which is §8.5's second
  qualification arriving as a data question.
- **A plan's timeline** — Scheduling items drawn in
  sequence: the register's items (§3.1, with §8.10's
  placements) read as a line. Its owner is the plan —
  the registering unit, or the matter the items serve.
  Nothing new is held: the Timeline is the register
  *viewed as a line*, its entries the commitments
  themselves, their extents their triggers and deadlines,
  and its relations (§8.8) computed over the placements.
- **A conversation's own timeline** — the session's turns
  and their events: what was asked, answered, declined,
  registered, in order. Its owner is the session; its
  material already exists in the session's own records,
  and the Timeline is that material held as one object —
  the line §5's chains are narrated over, and the line an
  Expectation's deadline is placed on (§8.10).

A Timeline holds no dates of its own invention: an entry
whose extent cannot be stated in a held system or a
standing reading stands **unplaced** — named as unplaced
in the owner's records, never silently dated — and
relations and durations over it decline at the placement
(§8.11).

### 8.8 Interval relations — Allen's algebra, ported

Relations between a Timeline's intervals are **Allen's
interval algebra**, adopted as a port (SETTLED, §1,
point 10): James F. Allen, "Maintaining Knowledge about
Temporal Intervals", *Communications of the ACM* 26(11),
1983. Verified from the public record, 2026-11-20: the
paper proposes **thirteen basic relations** between two
intervals — precedes, meets, overlaps, starts, during,
finishes, equals, and the converses of the six
asymmetric ones — distinct and jointly exhaustive; general
relations as *sets* of basics (a disjunction — "before or
meets" — is itself a relation in the algebra, which is
what an uncertain placement actually states); and a
**composition table** over the thirteen, by which
relations propagate along a line: A during B, B precedes
C, therefore A precedes C.

The port takes the thirteen, the converse structure and
the composition table as data and machinery — the way the
sense layer took Lesk's overlap and the token layer took
SymSpell's edits: the solved problem is not re-solved.
What Timeline does **not** do, stated as borders: invent a
fourteenth relation for a case the thirteen state as a
disjunction; reason metrically inside the algebra (how
*long* an overlap lasts is §8.9's read-off, not a
relation); or treat a computed relation as testimony — a
relation between two entries is a computation over their
extents, cited as one, and it inherits the weaker of the
two extents' standings.

### 8.9 Durations are read off the line

"How long between the founding and the fall?" is answered
from the line, not re-derived per question: the two
entries' extents are located on their Timeline, their
dates stand in a named system, and the difference is
taken **on that system's grid** — which makes date
difference Calendar's grid arithmetic (§8.4), with the
resulting quantity then Quantification's to state (a
number of years, of days). This gives §2.3's registry
question a partial answer, recorded here rather than in
§2: difference *between dates on a grid* has a home —
Calendar, over Timeline's endpoints. Duration arithmetic
in the abstract, over bare quantities with no grid under
them, remains the registry question §2.3 left open.

A duration read off a line whose endpoints stand in
*different* systems is computed through a conversion
(§8.5), and its derivation says so. A duration whose
endpoints cannot both be placed is declined (§8.11), not
estimated.

### 8.10 Placement — a commitment on the grid and on the line

§3.1's record gains two fields (added in place):
**calendar placement** and **timeline placement**.
Together they state where an item stands; the trigger
(§3.1) still governs firing, and §3.2's discipline is
untouched — placement authorises nothing, and a placed
item is priced at due time like any other.

- **On the grid.** The trigger's date stands in a named
  Calendar system. For a one-shot item, the placement is
  that date; a trigger stated as a duration from now is
  placed as the date the duration lands on, computed at
  registration and recorded — §3.5's sweep compares
  dates, not durations re-measured each turn. For a
  **recurring** item, the placement is a cited **pattern**
  plus the grid: Repetition (Form §5) supplies the
  pattern — period and phase, as Form's record states
  them — and **Calendar supplies the actual dates the
  pattern lands on**. The two are different gifts, and
  the worked example is the standing proof: ***monthly*
  is not *every 30 days*.** A commitment placed monthly
  on the 31st lands 31 January, then February — on the
  placement's stated rule for a month lacking the day
  (§8.4) — then 31 March; an every-30-days commitment
  from the same start lands 31 January, 2 March, 1 April.
  The same word at registration, different dates by the
  second firing: only the grid knows which sequence was
  meant, so the placement, not the trigger's wording, is
  the record of it. On the lunisolar grid the same
  pattern lands on months of 29 and 30 days and meets
  leap months as the system's rule places them — the
  pattern is portable; the dates are the grid's.

  This takes up, in Scheduling's terms, the extension
  the Form note (§5.3) anticipated: a periodic trigger
  is a trigger whose statement cites a pattern and whose
  dates are read from the grid. §3.3's scope is amended
  in place to say which part of "recurring calendars"
  stays out (the product feature) and which part is
  designed here (the placement).
- **On the line.** The item's sequence against named
  others, in Allen relations where stated: a re-check
  that would fall *after* an expectation's deadline is
  too late, so it is placed *before* it; a refresh stands
  *before* the moment its reading goes stale —
  Timekeeping's staleness horizon (§2.4) stated as a date
  on the grid and an event on the line. Placement
  relations are computed (§8.8) and re-computed when the
  line changes; a placement relation that stops holding
  (the reading refreshed early, the deadline moved) is an
  event on the item's record, not a silent edit.
- **The deadline's home.** §4.2's deadline is placed the
  same way, and §4.2 now says so in place: its date on
  the grid, its sequence on the conversation's Timeline.
  §4.6's timeout fires against that placement — §3.5's
  sweep asks Calendar whether the deadline's date has
  passed under the turn's time standing, and Timeline
  what the wait now stands after.

### 8.11 The addendum's declines

Every end the addendum's machinery can reach that is not
an answer, each located at its own ground, in §5.3's
manner:

| Decline | Located at | Ground |
| :--- | :--- | :--- |
| Unheld system | Calendar: the system named | A date, a conversion or a placement names a calendar system the register does not hold; the machinery declines at the holding and does not approximate the system from its name. |
| Historical date under an unheld dynastic system | Calendar: the system the date stands in | §8.5's second qualification as a decline: the date's own system is not held, and the modern port is not run on it under a pretence of equivalence. |
| Unplaceable entry | Timeline: the entry's extent | An event whose extent cannot be stated in a held system or a standing reading stands unplaced, named as such; relations and durations over it decline at the placement, not at the event. |
| Relation across unconverted systems | Timeline: the pair | Two extents standing in different systems, with no conversion held between them: the relation is not computed by silently sharing a grid. |
| Duration without both endpoints | Timeline: the missing endpoint | §8.9: a read-off needs two placed extents; one standing alone is a date, not a duration. |

### 8.12 Proposed build slices (not commissioned)

An addendum to §6's list; the T-slices' order is §6's
proposal, and these compose with it — C1 once T1's
readings exist to be placed, C3 once T2's register exists
to place items in. None of this is commissioned by this
note.

- **C1 — Calendar held; the arithmetical conversions.**
  The systems register; the Gregorian and ISO systems
  held with provenance; conversion between held
  arithmetical systems by the port, its sample data as
  test vectors; grid arithmetic ("one month from now",
  weekday, days-in-month) as Calendar's operations.
  Acceptance sketch: a date converts between held
  arithmetical systems with the derivation cited (§8.5);
  "one month from now" and "+ 30 days" from the same date
  give their different, correct answers side by side; an
  unheld system declines in §8.11's words.
- **C2 — The lunisolar holding.** The Chinese lunisolar
  system held — its structure, its intercalation, the 24
  solar terms as its named points, entering by the intake
  §8.6 names; the astronomical conversion port (the
  book's Part II machinery, its location stated); the
  frame's consumers unchanged (§8.6), with term-level
  asking routed to Calendar. Acceptance sketch: the
  book's Chinese sample data converts within the port's
  stated range; the 2033 leap month lands where the
  corrected record places it; a term question ("which
  solar term are we in?") answers from the system record
  with the frame standing exactly as it was.
- **C3 — Timelines and placement.** Timeline objects for
  the three owner kinds — the conversation's own first,
  its material already standing; the Allen port (the
  thirteen relations and the composition table as data)
  with relation computation over a line; §3.1's placement
  fields live, with the monthly/30-days pair as the
  acceptance walk; an Expectation deadline placed, and
  §4.6's timeout evaluated against the placement.
  Acceptance sketch: §8.10's two recurring placements
  produce their two different date sequences in tests; a
  relation asked across a plan's timeline composes
  through the table; an unplaceable entry declines in
  §8.11's words.

Each slice, when commissioned, places its seat on the
system map and registers its holdings as §6's closing
paragraph already requires of the T-slices.

### 8.13 Open questions

Recorded in §7 as questions 6–9 — a conversation's
default grid; conversational authoring of Timelines;
historical timelines' testimony route; the trio's map
wording — where they stand with the note's other open
questions. Nothing in this chapter decides them; a
C-slice commission that reaches one stops at it, as §6's
slices stop at §7's first five.

## Appendix — sources

Main `a093f57c5a43506de335ea7df2aa68cd5ba1452c` (fetched
2026-11-20): `ai-system/functions/PLACEHOLDER.md`;
`ai-system/system-map.ts` (Functions seats; the 2026-11-20
library/inventory separation); `ai-system/functions/external-query/PLACEHOLDER.md`;
`src/ansci/session.ts` (FrameInput / FrameRecord /
buildFrame, SEASON_CONVENTION, DAYPART_CONVENTION);
`src/ansci/wikidata-bank.ts`; `src/ansci/problem-records.ts`;
`src/ansci/capability-registry.ts`; `src/ansci/quantification.ts`;
`docs/design-base-nets-and-chat.md` §§3.5–3.6;
`docs/ansci/lack-machinery-slice.md`;
`docs/ansci/problem-solving-first-slice.md`;
`docs/ansci/problem-solving-placeholder.md`;
`docs/ansci/mathematics-placement.md`;
`docs/ansci/social-s1-report.md`.

Branch `track/probe2-fixes` (built, gated, landing in
flight at writing): `docs/ansci/probe2-slice-5-report.md`
(time/date shapes); `src/ansci/weather-bank.ts` (TTL
discipline); `src/ansci/turn.ts` (the frame shape and its
declines).

Branch `track/geography-design`:
`docs/ansci/geography-design-note.md` (§2.4 shelf-life
table; §3 GeographyAwareness; the stale-only decline in
its catalogue) — this note's structural precedent.
Branch `track/geography-build`: the register as built
(G1), read for the shelf-life machinery's implemented
form.

Addendum (§8): `docs/ansci/form-design-note.md` §5
(branch `track/form-design`); `src/ansci/session.ts`
(the frame's conventions, read in full);
`docs/user-ref/nct-ancientscience-Taiji.txt` (the solar
terms in the owner's reference material);
`ai-system/system-map.ts` and the UnitsMeasurement
PLACEHOLDER (the dynasty remark); `src/ansci/ingested.ts`
(dynasty attributions in edition provenance);
`docs/ansci/geography-g3-report.md` (the derived
provenance kind). Ports verified from the public record,
2026-11-20: Dershowitz & Reingold, *Calendrical
Calculations*, 4th ed. (Cambridge University Press,
2018) — the publisher's table of contents (Part I
arithmetical, Part II astronomical, the Chinese calendar
at ch. 19); Aslaksen, "The Mathematics of the Chinese
Calendar" (the 2033 leap month; superseded rules in
published accounts); Allen, "Maintaining Knowledge about
Temporal Intervals", *Communications of the ACM* 26(11),
1983 — the thirteen relations and the composition table,
as summarised in Alspaugh's foundations material.
