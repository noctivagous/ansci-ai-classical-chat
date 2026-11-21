# Monitoring — design note (2026-11-20)

The design record for the **Monitoring Unit**: a Unit in its
own right that owns *monitors* — standing watches over named
subjects, kept at stated intervals, raising demands only when
a reading changes in a way the monitor's own rule counts as a
change. Monitoring is a standing feature composed of generic
resources: Timekeeping supplies the readings and the clock,
Repetition supplies the interval, Scheduling holds each next
check as a due item, and every check is a consultation whose
successive results are compared. What a monitor surfaces is
difference, not diligence.

**Status: DESIGN ONLY.** Nothing in this note is built. The
Unit's existence, the monitor record's shape in outline, the
composition, the Expectation contrast and the silence
discipline were settled by the owner in conversation on
2026-11-20 and are marked SETTLED where they appear. Seat
address, field-level record shapes, protocols and wording
are this note's PROPOSALS, stated so they can be ruled on.
The build slices in §9 are PROPOSED, not commissioned. Open
questions are collected in §10 and are decided nowhere in
this note.

## 0. Basis — what this design rests on

Read before writing. Trees are named per source, because
the design this note composes from stands in three states
at once:

- **This note's own tree** — main
  `e5ad6de` ("Geography G1-G3 … (track/geography-build
  landing)"), fetched fresh 2026-11-20. The probe-2
  programme, Slices A/B and the geography build have all
  landed; the banks, the geography register and
  GeographyAwareness cited below are read on this main.
- `docs/ansci/time-scheduling-design-note.md` — branch
  `track/time-design` (local, unmerged at writing). The
  time trio this note composes and must not re-decide:
  **Timekeeping** (clock readings as consultations;
  staleness asked uniformly of every bank), **Scheduling**
  (commitments held as records; registration is not
  authorisation; a due item raises a Planner demand and
  Scheduling never acts; the **waking limit** — due items
  are evaluated at turn boundaries, finer waking needs a
  host driver under the entity-side contract of that
  note's §3.4), and **Expectation** (the waiting resource,
  chartered jointly with the lack machinery; timeout is
  information). Monitoring is specified **against** these:
  where this note needs a due item, a staleness answer or
  a wait, it cites the time note's machinery and builds
  none of its own.
- **Form — Curves, Proportion, Repetition** — the division
  of Mathematics inside the QuantificationUnit (placement
  of Mathematics itself: `docs/ansci/mathematics-placement.md`,
  main — Mathematics inside the OKU, QuantificationUnit
  under it, Geometry a placeholder sibling). The Form
  design note is being written in parallel (branch
  `track/form-design`) and did not exist to be read when
  this note was written; §3.2 therefore specifies
  Repetition's lending from the owner's settled points of
  2026-11-20 — Repetition is form over count: period and
  phase, counted recurrences, cycles — and records the
  dependency. If the Form note as written rules the
  lending differently, this note's §3.2 is the section to
  reconcile, and the reconciliation is a doc edit, not a
  redesign: Monitoring needs *an* interval with a period
  and a phase, from wherever Form seats it.
- The banks and their shelf lives — main. The **weather
  bank** (`src/ansci/weather-bank.ts`): a banked reading
  carries its fetch time and a stated shelf life
  (`WEATHER_TTL_DEFAULT_MINUTES` = 30). The **geography
  register** (`src/ansci/geography.ts`, `PlaceRegister`;
  design: branch `track/geography-design`,
  `docs/ansci/geography-design-note.md` §2.4): the per-kind
  shelf-life table generalised (geocode 12 months,
  containment 6 months, what's-there 30 days, route 7 days
  if banked, weather 30 minutes) and the stale-only
  decline. These two are §7.2's standing example: a bank
  is the registrar of a monitor over its own holdings'
  staleness — the design's most immediate customer is the
  machinery the system already has.
- `src/ansci/geography-awareness.ts` and
  `docs/ansci/social-s1-report.md` — main. The **Planner
  demand posture**: the Social Unit inside Awareness, and
  GeographyAwareness after it, read a situation and raise
  demands; neither speaks, authors a reply, or originates
  a world claim; authorship stays with the Planner,
  wording with the Verbalizer. GeographyAwareness's
  situated place is §7.1's registrar-side fact (the place
  a weather monitor watches is the situated one, taken up
  from configuration or statement, never guessed).
  Monitoring inherits the posture entire (§2.3).
- `ai-system/functions/PLACEHOLDER.md` and
  `ai-system/system-map.ts` — main. The Functions Unit:
  generic operations that know nothing, decide nothing,
  testify to nothing. Its standing families are Ordering
  And Sorting, Search, Editing, ExternalQuery and
  FileSystem, with Timekeeping, Scheduling and Expectation
  proposed by the time note. **On Compare:** the record
  gives Compare no seat of its own — no family, no
  placeholder, no registry holding under that name was
  found in the Functions Unit's record or the map. §3.4
  therefore specifies a monitor's comparison without
  inventing a seat for it, and records what would change
  if one is ever seated.

## 1. The settled design (owner, 2026-11-20)

1. **A Monitoring Unit in its own right.** Monitoring is
   not a Function and not a feature of Scheduling or
   Expectation: it is a Unit that owns monitors, the way
   the Social Unit owns the social reading. Its registrars
   can be anyone — a unit, a bank, a conversation — which
   is what puts it beside the OKU's units rather than
   inside one. SETTLED as the Unit's existence and
   standing; the seat address in §2.1 is PROPOSED wording
   for the map.
2. **A monitor is a record.** {subject & source ·
   INTERVAL · what counts as a change · registrar ·
   expiry}. A monitor without a change rule is not a
   monitor — an interval watch with nothing stated about
   what would matter is a recurring consultation wearing
   a name. SETTLED.
3. **Composition, not new machinery.** Timekeeping
   supplies readings and the clock; Repetition supplies
   the interval (period + phase); Scheduling holds each
   next check as a due item, under registration ≠
   authorisation; each check is a consultation under the
   usual testimony/provenance discipline; successive
   readings are compared — **a monitor is a standing
   comparison**. SETTLED.
4. **The Expectation contrast is the charter's spine.**
   An Expectation waits for ONE satisfying arrival and
   closes — satisfaction or timeout, both recorded. A
   Monitor PERSISTS across checks until expiry or
   cancellation, and what it raises on is CHANGE meeting
   its rule. SETTLED (§4 states the contrast in full).
5. **Silence discipline.** A check that finds no change
   is recorded and raises nothing — no heartbeat, no
   diligence reports. What a monitor surfaces is
   difference, not diligence. SETTLED (§5).
6. **Inherited limits are the Unit's own limits.**
   The waking limit and the pricing of consultations
   bind monitors as they bind the resources they compose;
   the Unit states them in its own voice rather than
   inheriting them silently. SETTLED as the stance;
   §6 states them.

## 2. The Unit and the monitor record

### 2.1 Seat (PROPOSED)

PROPOSED seat: a Unit standing beside the OKU's units, on
the Social Unit's precedent — a unit whose registrars and
customers are other units, whose outputs are Planner
demands, and whose registers ride the Session until the
owner rules on persistence (§10 carries the time note's
persistence question's local form). The exact map wording
is an open question (§10), as the geography and time
notes each left theirs.

### 2.2 The monitor record

A monitor is a record in the Unit's register
(session-scoped on the standing register pattern, on the
precedent of `session.problems` and the scheduled-items
register the time note proposes). Fields:

| Field | Content |
| :--- | :--- |
| subject & source | What is watched, and the named source a check consults: a banked fact in a named bank (its staleness), a reading from a named external source for a named subject (the weather source, for the situated place), a register's contents (the geography register, for a named place). A subject with no consultable source is not registrable — there would be nothing for a check to do. |
| interval | The period and phase of checking, stated in Repetition's terms (§3.2): a period (duration) and a phase (anchored to what — registration time, a frame fact, a clock reading — with its standing named, as the time note requires of any stamp). |
| change rule | What counts as a change, stated at registration in checkable terms over successive readings: a named field crossing a named threshold, a condition word differing, a fact passing its shelf life, a set gaining or losing a named member. The rule is evaluated by the Unit at each check (§3.4). **No rule, no monitor** (§1.2). |
| registrar | The unit, bank or conversation that registered the monitor. The registrar is the demand's addressee of record: a fired change raises its demand naming the registrar, and the registrar is who may amend or cancel (§10 records the visitor question separately, as the time note does for Scheduling). |
| expiry | When the monitor ends if nothing else ends it first. Whether expiry is MANDATORY is an open question (§10) with this note's reasoning shown in §6.2; the field itself is not optional in the record — "no expiry" would be stated as a value with a reason, on Scheduling's precedent for its own registrations, never as an omitted field. |
| standing | Which waking standing the monitor is under — turn-boundary sweep, or driver-delivered (§6.1). Recorded on the monitor, stated in its history; never left to be inferred from how promptly its checks appear to run. |
| last reading | The most recent check's reading, with its fetch stamp and provenance — the comparison's standing term (§3.4) and the history's spine (§5.2). A monitor that has not yet checked carries none, and says so. |

Registration is **not authorisation**, inherited from
Scheduling without restatement of the whole doctrine:
registering a monitor records that a registrar committed
to have checks proposed at an interval. Each check's
execution is a Scheduling due item, priced by the Planner
when it falls due (§3.3); what a fired change proposes —
a telling, a re-consultation, a further registration — is
priced again when it is proposed. A monitor is never a
standing pre-approval of anything.

### 2.3 The demand posture

The Unit raises demands; it does not speak, author a
reply, originate a world claim, or execute what its
checks propose. A fired change is a demand on the
Planner, in the Social Unit's posture: it names the
monitor, its registrar, the change the rule found, and
the two readings the change stands between — the evidence
travels with the demand, so the Planner prices a stated
difference, not a unit's say-so. Authorship of anything
said about a change stays with the Planner; wording with
the Verbalizer. The Unit's own outputs are records:
checks, comparisons, firings, ends.

### 2.4 A monitor's ends

A monitor ends in exactly the recorded ways, none silent:

- **expired** — its expiry passed; the record closes
  naming the expiry and the checks it ran;
- **cancelled** — by its registrar (or by whoever §10's
  ruling empowers), the cancellation recorded with its
  ground;
- **superseded** — replaced by a new monitor over the
  same subject, the successor named on the old record —
  the ordinary end when a change rule is revised, since
  a rule is not amended in place (§8 records why);
- **closed by satisfaction of its purpose** — where the
  registrar registered it as an Expectation's mechanism
  (§7.3), the expectation's closing closes the monitor
  with it, and the monitor's record names the expectation
  it served.

A monitor never lapses by being forgotten: an expired
registration the sweeps have not yet closed is closed at
the next sweep, in the open, on Scheduling's lapsed-item
precedent.

## 3. Composition — the resources a monitor stands on

### 3.1 Timekeeping supplies the readings and the clock

Every time a monitor touches is Timekeeping's: the clock
standing under which a check falls due, the fetch stamp
on each reading, and — for the staleness monitors of
§7.2 — the staleness operation itself, asked uniformly of
the subject bank in the time note's §2.4 form (fresh or
stale, by how much, how long left; "no shelf life stated"
where the bank states none — a monitor over a fact with
no stated shelf life can still watch its *content* change,
but its change rule cannot be a staleness rule, and the
registration says which it is). Monitoring keeps no clock
and no calendar of its own.

### 3.2 Repetition supplies the interval

An interval is a repetition: a **period** and a **phase**.
The period is a duration — computed and compared by
Quantification's Mathematics, as the time note assigns
duration arithmetic there. The phase anchors the
repetition to a standing: registration time is the
ordinary anchor; a monitor whose checks should fall on
frame boundaries (each new daypart, each stated hour)
anchors to the frame instead, and the anchor's standing
is named on the record (§2.2). What Monitoring borrows
from Form is the *pattern* — that this checking recurs,
at this period, from this phase — stated once at
registration in Repetition's terms, so that the interval
is a citable object and not a number loose in the record.
The lending is specified here from the owner's settled
points (§0); the Form note, when it lands, is the
authority for Repetition's own register and operations,
and a monitor's interval is a reference into that
register, not a copy of it.

One consequence the Unit states plainly: an interval is
a *pattern of intent*, not a metronome. Under the waking
limit (§6.1) the pattern is what the monitor is *trying*
to keep; the history records the checks that actually
ran, at the times they actually ran, and the difference
between pattern and history is itself auditable — a
monitor starved of turns shows a sparse history under a
dense interval, and neither the record nor any reply
pretends otherwise.

### 3.3 Scheduling holds each next check

A monitor does not hold its own appointments. At
registration, and again after each check, the Unit
registers a **scheduled item** (time note §3.1) whose
owed action is the monitor's next check, triggered at the
interval's next falling-due, registered-by the Monitoring
Unit on the monitor's behalf, with its registration
expiry set no later than the monitor's own expiry. The
consequences are inherited, deliberately:

- The check is **priced when it falls due**, by the
  Planner, like any due item (§2.2's registration ≠
  authorisation, one level down).
- A due check the Planner declines closes as
  fired-and-declined on the Scheduling precedent — and
  the monitor's history records the declined check as an
  event (§5.2), because a monitor whose checks are being
  declined is a fact its registrar should be able to see.
- The turn-boundary sweep that fires due items is the
  same sweep the time note specifies; Monitoring adds no
  second sweep. A monitor's check is taken up in the
  sweep's order among everything else that fell due.

### 3.4 Each check is a consultation; the comparison is the Unit's own act

A check runs the consultation the subject & source names,
under the standing discipline entire: the source's
`{ status: "unavailable" }` is a stated state, not a
reading (§8); a returned reading banks where its kind
banks, with its SourceRecord, at the retrieved
confidence, and never becomes a propagation anchor by
having been monitored for. The check then **compares**:
the new reading against the monitor's last reading,
under the change rule. The comparison's output is one
of: *change* (the rule fires — the demand of §2.3 is
raised, naming both readings), *no change* (recorded,
§5), or *not comparable* (the readings do not stand in
the rule's terms — a first check with no last reading is
the ordinary case, and §8 catalogues the pathological
ones). The new reading becomes the last reading in all
three cases where a reading exists.

On Compare's seat: the record gives it none (§0). This
note does not seat one. The comparison a monitor makes
is specified as **the Unit's own evaluation of its change
rule over two readings** — an act of the Monitoring Unit,
the way sense selection is an act of the sense layer —
resting on the standing machinery where it needs any:
Ordering for before/after and threshold crossings over
ordered values, Quantification's arithmetic for
differences and ratios. If a Compare function is ever
seated in the Functions Unit, monitors are its standing
customer and the change rule's evaluation is the first
operation it would be asked to hold; until then, no
monitor waits on it, and no wording in this note implies
the seat exists.

## 4. The Expectation contrast — the charter's spine

The two resources are easy to confuse because both are
about the future arriving. The design keeps them apart
on four axes, and the Unit's charter is the second
column of this table:

| | Expectation | Monitor |
| :--- | :--- | :--- |
| Waits on | The world delivering a stated satisfier | Successive readings of a named subject |
| Ends by | Satisfaction, or timeout — one arrival or one deadline | Expiry, cancellation, supersession — a standing watch stood down |
| Raises on | The satisfier's arrival (or its non-arrival by the deadline) | A **change** between readings that meets the change rule |
| Its record is | A watch over a need — the ProblemRecord stays the account (§4.3 of the time note) | A history of checks — the comparison's evidence (§5.2) |

Two corollaries the Unit holds to:

- **A monitor is not an expectation with a longer
  fuse.** An expectation that has been satisfied or has
  timed out is *closed*; nothing about it recurs. A
  monitor whose subject never changes is not failing —
  it is doing the whole of its job, in silence (§5).
  Registering a monitor where an expectation is meant
  produces a watch that never closes on the arrival it
  was actually for; registering an expectation where a
  monitor is meant produces a wait that closes on the
  first change and misses every later one. The registrar
  chooses, and the records keep the choice auditable.
- **They compose without merging.** An expectation may
  employ a monitor as its checking mechanism (§7.3):
  the expectation supplies the meaning (what would
  satisfy, what the timeout raises), the monitor supplies
  the checking (at its interval, by consultation and
  comparison). The records stay two: the expectation's
  closing evidence cites the monitor's firing; the
  monitor's record names the expectation it served. Neither
  record absorbs the other, and the expectation's
  satisfaction still enters only through the testimony
  gates — a monitor's firing is a routing event, never
  an admission, on the time note's §4.4 discipline
  applied unchanged.

## 5. Silence discipline

### 5.1 The rule

A check that finds no change is **recorded and raises
nothing**. No heartbeat reaches the Planner as a demand;
no diligence report reaches the visitor in any wording;
a monitor's existence is not announced by its operation.
What a monitor surfaces is difference, not diligence —
a conversation with three healthy monitors in it reads
exactly like a conversation with none, until one of them
finds its change. (What a registrar may *ask* — "what
are you watching for me, and what has it seen?" — is a
shapes question about reporting on demand, not an
exception to the silence: an answer composed when asked
is a reply, not a heartbeat. Whether such shapes exist
at this rung is §10's neighbourhood, not settled here.)

### 5.2 The history, and what it is for

Silence toward the Planner is not silence in the record.
Every check is entered in the monitor's history: its
time standing and fetch stamp, the reading taken (or the
unavailable state, §8), the comparison's outcome, and
what followed — a firing and its demand, a declined
check, a re-registration of the next check. The history
is complete precisely because most of it is no-change
entries; a history of only firings would be a log of
alarms, not an audit. The history is for:

- **Audit.** A firing can be traced to the two readings
  it stands between and the checks that preceded them;
  a registrar can establish that a watch was actually
  kept — that the checks ran, at roughly the interval,
  and found nothing — which is the only honest form
  "we've been watching it" can take.
- **The change rule's own review.** A rule that has
  never fired across a long history, or that fires on
  every check, is evidence about the rule, not just the
  world: thresholds set inside the noise, a subject
  whose readings oscillate across a boundary. The
  history is what a registrar reviews to supersede a
  monitor with a better-ruled one (§2.4) — rules are
  revised by supersession, on evidence, never edited in
  place under a running watch.
- **Pricing evidence.** Checks cost consultations (§6.2).
  The history is the record of what a monitor has
  actually cost and what it has produced, which is what
  a registrar or the Planner prices a renewal, a tighter
  interval, or a cancellation against. A monitor whose
  history is long, expensive and empty is a priced
  argument about itself.

## 6. Inherited limits, stated as the Unit's own

### 6.1 The waking limit

The entity is turn-based; nothing inside it runs between
turns. A monitor's interval therefore means, at this
rung: **its checks are evaluated at the first
turn-boundary sweep after each falls due** — or, where a
host driver stands under the time note's §3.4 contract,
delivered by the driver as occasions arise. The monitor's
record states which standing it is under (§2.2), and its
history shows the checks that ran, not the pattern they
were meant to keep (§3.2). No wording anywhere in the
Unit's outputs may claim continuity it does not have:
an hourly monitor in a conversation that resumes tomorrow
checked *when the conversation resumed*, and its record
says so. An interval shorter than the ordinary spacing
of turns is not forbidden — it is *degenerate*: every
sweep finds it due, and it degrades to "check at every
turn", which the registration should have said. §8
catalogues the floor this sets.

### 6.2 Pricing

Every check is a consultation, and consultations are the
system's priced acts. A monitor is therefore a standing
claim: interval × expected lifetime × the subject's
consultation cost. The pricing discipline is inherited
and applied at three points: at **registration**, where
the registrar's proposal is priced as a whole (a monitor
is not cheap because each check is); at **each due
check**, where Scheduling's pricing decides whether this
check runs now (§3.3); and at **expiry or review**, where
the history (§5.2) is the evidence a renewal is priced
against. A monitor with no expiry is an **unpriced claim
on the future** — its cost has no bound to price against.
This note's reasoning therefore leans to mandatory
expiry: a registrar who wants a longer watch renews it,
and the renewal is a priced, recorded act rather than an
assumption. The ruling is the owner's (§10); the design
is written so either ruling fits — the field stands in
the record either way, and §9's slices build the expiry
path first because both rulings need it.

### 6.3 What the Unit does not do

- **No watching of the interlocutor.** A monitor's
  subject is a consultable source's reading. The
  conversation itself — the visitor's statements, their
  cadence, their returns — is read by the units chartered
  to read it (the Social Unit, the uptake machinery),
  under their disciplines. "Monitor what the visitor
  says about X" is an Expectation whose expected-from is
  the interlocutor, or it is nothing this Unit registers.
- **No actions.** A monitor's firing raises a demand.
  Refreshing a bank, telling a visitor, registering a
  further watch — each is executed, if at all, by the
  machinery the Planner prices for it.
- **No private consultations.** A check uses the same
  sources, fixtures discipline and provenance as any
  one-shot consultation of the same kind. Monitoring
  creates no side channel to any source, and a source's
  rate limits bind a monitor's interval as a fact of the
  world: an interval a source's terms cannot sustain is
  a registration the pricing should refuse (§8).

## 7. Worked chains

### 7.1 Weather for the situated place

Awareness is the registrar; the change of condition is
the event; the routine re-readings are the silence.

1. **Registration.** The conversation has a situated
   place (GeographyAwareness: configured, or stated by
   the visitor and taken up). Awareness registers a
   monitor: subject & source = the weather source's
   current reading for the situated place's point (the
   point resolved through the geography register, as the
   weather chain already resolves it); interval = hourly,
   phase anchored at registration; change rule = *the
   condition word differs from the last reading's, or
   precipitation begins or ceases*; expiry = the
   conversation's horizon, stated; standing =
   turn-boundary. The weather bank's 30-minute shelf life
   and the monitor's hourly interval are different facts
   and the record keeps them so: the bank's TTL governs
   when a reading stops answering as current; the
   monitor's interval governs when the Unit next looks.
2. **Checks.** At each sweep where the monitor's
   scheduled item falls due and is priced through, the
   check consults the weather source, banks the reading
   in the weather bank (fetch stamp, shelf life, as any
   weather consultation banks), and compares. 21°C and
   partly cloudy, then 21°C and partly cloudy again: two
   history entries, no demand, nothing said. This is the
   monitor working, in its ordinary state.
3. **The change.** A later reading: rain, where the last
   was partly cloudy — the rule fires on the condition
   word. The Unit raises its demand: the monitor, its
   registrar, the rule, and the two readings. The Planner
   prices the telling against the standing conversation
   — a visitor who has moved on to another subject may
   not be owed an interruption at this rung, and the
   demand declined is recorded as declined, on the
   Scheduling precedent — or the turn takes it up, and
   the visitor hears that the weather where they are has
   turned, cited from the two readings, in the
   Verbalizer's words. Either end is in the history.
4. **The ends.** The conversation closes or the expiry
   passes: the monitor closes expired, its history
   complete — N checks, one firing, the rest silence,
   which is the audit §5.2 promised.

### 7.2 A bank watching its own staleness

The bank is the registrar; no visitor need be involved;
this is the design's most immediate customer.

1. **Registration.** The weather machinery — or the
   geography register, for a banked what's-there set —
   registers a monitor over one of its own banked facts:
   subject & source = the named fact, in its own bank;
   interval = a fraction of the fact's shelf life (the
   geography table's kinds give the periods their scale:
   a 30-day what's-there fact might be checked at 10
   days; a 30-minute weather reading's refresh is the
   time note's §5.2 chain, which is this chain at its
   shortest period); change rule = *the fact passes its
   shelf life* — a staleness rule, evaluated by
   Timekeeping's staleness operation (§3.1), not by
   re-consultation. Note what this monitor's checks are:
   staleness questions over the bank's own stamps, which
   cost no external consultation at all. Pricing still
   applies — the sweep's attention is not free — but the
   standing example deliberately includes a monitor whose
   checks are cheap, because most staleness watching is.
2. **The firing.** The sweep's staleness answer crosses:
   the fact is stale, or inside a stated margin of it.
   The demand raised proposes the remedy the stale-only
   decline currently names after the fact: **re-consult
   the source and re-bank**, through Scheduling as a
   one-off due item, priced by the Planner. Priced
   through, the fact is refreshed before any asking
   finds it stale; declined, the decline is recorded and
   the stale-only decline remains the honest end when an
   asking does arrive.
3. **Why a monitor, not just Scheduling.** The time
   note's §5.2 chain registers the refresh directly as a
   scheduled item, and for a single known fact that is
   the whole story. The monitor is the generalisation
   the banks actually need: one watch over *a bank's
   holdings as they accrue* — facts banked by turns the
   registrar did not foresee, each entering the watch by
   being banked, each with its own shelf life — where no
   one registration could have named them all. Where the
   fact is single and known, Scheduling alone is the
   honest tool and §5.2 of the time note governs; the
   monitor earns its record when the subject is a class
   of facts under a rule. The registration states which
   form it is.

### 7.3 A monitor as an Expectation's mechanism

The expectation supplies the meaning; the monitor
supplies the checking; the records stay two.

1. **The lack.** A turn declines located at a missing
   fact — say, whether a named place has a river the
   geography sources can attest (a what's-there question
   whose consultation returned unavailable). The decline
   files its ProblemRecord, need `lack-of-information`,
   and the lack passes the time note's §4.3 test: the
   world can deliver this. An **Expectation** is
   registered: satisfier = an attested what's-there
   result for the place, from the Overpass consultation;
   deadline stated; on-satisfaction and on-timeout as
   that note specifies.
2. **The mechanism.** Alongside it, a **monitor**:
   registrar = the expectation's registering unit, acting
   for the expectation; subject & source = the Overpass
   what's-there consultation for the place; interval =
   stated, priced against the source's known capacity
   discipline (the geography build's G2 report is the
   standing evidence that this source can be at capacity
   for long stretches — an interval that ignores that is
   priced wrong); change rule = *a consultation returns
   a reading where the last check returned unavailable*
   — the change that matters here is the world's
   answerability changing, not the answer's content;
   expiry = the expectation's deadline, neither earlier
   nor later.
3. **The satisfaction.** A check returns a reading. The
   monitor fires — a routing event. The reading faces
   the testimony gates as any consultation result; the
   expectation, its satisfier now banked through the
   gates, closes satisfied and files its closing
   evidence into the ProblemRecord, which closes with
   it. The monitor closes with the expectation (§2.4),
   its record naming the expectation it served and the
   check that fired. Two records, cross-cited, neither
   merged.
4. **The timeout.** Had every check returned unavailable
   to the deadline: the monitor's history is a run of
   unavailable states (§8) — recorded, and raising
   nothing, because the change rule was never met. The
   **expectation's** timeout is what raises: the deadline
   passes, the timeout demand states the wait and the
   non-arrival as information, and the monitor expires
   with it. The division of labour is the point: the
   monitor watched and reported nothing, correctly; the
   expectation owned what the nothing meant.

## 8. Declines and failures catalogue

Every end a monitor can reach that is not a firing, each
located at its own ground, in the house style. (Wordings
are shapes, not settled text.)

| Decline / failure | Located at | Ground |
| :--- | :--- | :--- |
| Source unavailable at a check | The consultation, as always | The check meets `{ status: "unavailable" }`: recorded in the history as an unavailable state, the last reading unchanged, the next check registered as usual. Unavailability raises **nothing by default** — whether it *can* raise is a **rule-design point**: a change rule may name unavailability itself as a change ("the source has been unavailable for three successive checks" is a statable rule over the history), and a registrar who wants unavailability surfaced writes that rule. A monitor whose rule is silent on unavailability treats it as weather, not news. |
| Change rule unsatisfiable as stated | Registration: the rule | The rule names a field the source's readings do not carry, a threshold in units the readings do not bear, or a comparison successive readings cannot stand in. The registration is declined located at the rule, before any check runs — a monitor that can never fire and can never honestly report no-change (its comparisons would be *not comparable* forever) is not registered and then discovered; it is refused at the door, with the rule's defect named. |
| Monitor expired unrenewed | The monitor's expiry | The watch ended on schedule and no renewal was registered. Any later interest in the subject starts a new monitor; the expired one's history stands as the record of the watch that was kept, and a firing that would have occurred after expiry is not owed — the registration's terms were the terms. |
| Interval below the waking floor | Registration: the interval | The stated period is shorter than the standing under which the monitor would run can meaningfully evaluate (at turn-boundary standing, materially shorter than the conversation's turn spacing). The registration is declined located at the interval, or — where the registrar accepts it — registered with the interval restated as what it will actually be ("at every turn"), so the record never promises a fineness the standing cannot deliver. The floor is a fact of the standing, stated per standing, not a universal constant this note fixes. |
| Checks repeatedly declined at pricing | The Planner's pricing of the due items | A monitor whose checks the Planner declines sweep after sweep is not firing and not silently healthy: the declines are history entries (§3.3), and past a stated run of them the Unit raises one demand — not about the subject, but about the monitor: that its watch is not being kept at its priced cost, for its registrar to renew, reprice or cancel. The one heartbeat the Unit permits itself is about its own failure to operate, never about the subject's quietness. |
| Readings not comparable | The comparison | Successive readings arrive in terms the rule cannot compare (the source changed its shape; the subject's resolution moved to a different point). Recorded as *not comparable*; the new reading becomes the last reading, so comparability resumes from it. A run of not-comparable outcomes is the change rule's review evidence (§5.2), and if the first check after registration is not comparable for a reason registration should have caught, that is the unsatisfiable-rule decline discovered late — recorded as such, against the registration. |

## 9. Proposed build slices (not commissioned)

Stated so the design has prices attached; none of this
is commissioned by this note, and the order is a
proposal. Each slice depends on the time note's slices
it composes (T1 Timekeeping, T2 Scheduling, T3
Expectation, in that note's §6) — Monitoring's slices
are numbered M to keep the dependency visible rather
than to claim a queue position.

- **M1 — The register and the staleness monitor.**
  The monitor register, registration with the §2.2
  record (change rule required, expiry path built
  first per §6.2), and the one wired registrar: a bank
  over its own holdings (§7.2's chain), whose checks are
  Timekeeping staleness questions costing no external
  consultation. Acceptance sketch: in tests, a fact
  banked with a short TTL under a staleness monitor
  fires its refresh demand before an asking meets the
  stale-only decline; the history shows every sweep's
  check, fired and unfired; a rule naming a field the
  bank's facts do not carry is refused at registration
  in the catalogue's words.
- **M2 — Consultation monitors and the weather chain.**
  The situated-place weather monitor (§7.1) as the one
  wired consultation monitor: checks through the weather
  wrapper, readings banked as today, the condition-word
  change rule, the firing demand priced by the Planner.
  Acceptance sketch: fixture-driven readings across
  turns produce history entries and silence until the
  condition changes; the change turn's trace shows the
  demand, both readings, and the Planner's pricing —
  including a declined telling, recorded as declined.
- **M3 — The Expectation's mechanism.** A monitor
  registered as an expectation's checking mechanism
  (§7.3), the cross-citation of the two records, and
  the joint closing. Acceptance sketch: the time note's
  T3 acceptance walk re-run with the monitor as the
  re-check's mechanism — satisfied ending and timeout
  ending both exercised; the monitor's history shows
  the unavailable run in the timeout ending, raising
  nothing, while the expectation's timeout raises.

Each slice, when commissioned, also places the Unit's
seat on the system map (PROPOSED in §2.1) and registers
any built operation in the capability registry — a seat
is not a holding until the registry says so.

## 10. Open questions (owner's — decided nowhere in this note)

1. **Mandatory expiry.** §6.2 shows this note's
   reasoning leaning to mandatory expiry (an unexpired
   monitor is an unpriced claim; renewal is the priced,
   recorded way to continue a watch). The counterweight,
   stated fairly: the system's own banks are watched by
   monitors whose natural life is the process's, and a
   mandatory expiry there manufactures renewals nobody
   means. Mandatory, or stated-with-reason, or different
   answers for system registrars and conversational
   ones — the owner's.
2. **Who may cancel.** The registrar cancels its own —
   that much the record assumes. May the **visitor**
   cancel a monitor conversationally ("stop watching
   that") — including one they did not register, over a
   subject that concerns them (the situated place's
   weather)? This is the time note's visitor question
   one Unit over: a shapes question with a Rung-1
   posture question inside it — which watches the system
   may originate, and which it may end at a visitor's
   word, is the owner's call, not a slice's detail.
3. **Who authors change rules.** At this rung, are
   change rules authored only by units, in code and
   configuration — or may a rule be stated in
   conversation ("tell me if it rains", "let me know if
   the price moves") and compiled into the record? The
   conversational form is the monitor a visitor would
   recognise as theirs; it is also a shapes build and a
   posture question (a visitor-authored rule makes the
   visitor a registrar, with §10.2's cancellation rights
   presumably attached). The note designs the record so
   either answer fits; it does not smuggle one in.
4. **Map placement wording.** The seat proposed in
   §2.1 is this note's wording: a Unit beside the OKU's
   units, on the Social Unit's precedent. Whether the
   map draws it there, or inside Awareness (its
   registrars include Awareness, but are not only
   Awareness), or with cords to the Functions it composes
   that the map must express — the owner's, when the map
   is next drawn, as the geography and time notes left
   theirs.

## Appendix — sources

Main `e5ad6de` (fetched 2026-11-20):
`ai-system/functions/PLACEHOLDER.md`;
`ai-system/system-map.ts` (Functions seats — and the
absence of any Compare seat, §0);
`src/ansci/weather-bank.ts` (`WEATHER_TTL_DEFAULT_MINUTES`);
`src/ansci/geography.ts` (`PlaceRegister`,
`resolvePlace`, `importFromWikidataBank`);
`src/ansci/geography-awareness.ts` (the situated place;
the Social Unit's discipline stated for space);
`src/ansci/problem-records.ts`;
`docs/ansci/mathematics-placement.md` (Mathematics in
the OKU; QuantificationUnit under it; Geometry a
placeholder);
`docs/ansci/social-s1-report.md` (the demand posture).

Branch `track/time-design` (local, unmerged at
writing): `docs/ansci/time-scheduling-design-note.md`
— Timekeeping (§2, staleness §2.4), Scheduling (§3; the
record, registration ≠ authorisation, the waking limit
and driver contract §3.4, the turn-boundary sweep §3.5),
Expectation (§4; the joint charter §4.3, satisfaction
through the gates §4.4, timeout §4.6), the worked chains
and declines catalogue (§5), slices T1–T3 (§6).

Branch `track/geography-design`:
`docs/ansci/geography-design-note.md` (§2.4 the
shelf-life table; §3 GeographyAwareness).
Branch `track/geography-build` (landed as `e5ad6de`):
`docs/ansci/geography-g2-report.md` (the Overpass
source's capacity behaviour, cited in §7.3).

Form (Curves, Proportion, Repetition): design note in
parallel on branch `track/form-design`, not extant at
writing; §3.2 is specified from the owner's settled
points of 2026-11-20 and names itself the section to
reconcile when that note lands.
