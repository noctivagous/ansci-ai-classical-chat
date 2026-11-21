# Expectation

- **Schematic address:** `functions/expectation` — inside the Functions Unit
- **Type:** Unit
- **State:** partial — **40% completed to goal** (set by us, assessed by the project, not measured or computed). Seat placed and built 2026-11-20 (Time programme T3; design: `docs/ansci/time-scheduling-design-note.md` §4).

## The joint charter

Expectation is the Functions Unit's **waiting resource** — the
owner ruled that waiting takes a different name from Scheduling,
and the name does the work: an expectation names **what would
satisfy it**. Its charter is joint with the lack machinery
(§4.3): the seat is a Function family's, but its registrar and
its account of record live with ProblemSolving's records, and
neither side of the charter is complete without the other. The
ProblemRecord remains **the account of the need**; Expectation
is a watch kept over some of those accounts, not a rival
ledger.

## What stands here

**The record.** A session-scoped register of expectations, each
carrying: its **satisfier**, stated checkably (a fact — a named
relation over named subjects; a reply — the interlocutor's
answer to a named open question; or an arrival — a result from
a named source); its **expected-from** (a named external source,
the bank a consultation would fill, or the interlocutor); its
**deadline** — required: an expectation without a deadline is
not registered, open-ended waiting being how registers fill
with the dead; its **on-satisfaction** and **on-timeout**
demands, stated at registration so both firings are auditable;
and its registrar and registration stamp, as §3.1 rules for the
trio.

**Eligibility — one test (§4.3).** *Could the world — including
the interlocutor — deliver the satisfier without the system
itself changing?* `lack-of-information` — **yes**, the primary
case. A stated value owed by the interlocutor (a quantity, a
name, a place) — **yes**, expected-from the interlocutor.
`capability` — **no**: the world arriving does not build a seat,
and the lack stands as the registry audit leaves it.
`how-to-proceed` — **no**: it closes priced at its turn, and
its instrument is internal. The audit's verdicts are read by
this test, never re-priced.

**The hand-off.** Registering adds one reference — the
expectation's id, annotated on the problem record — and does
**not** un-decline the turn that opened the lack: the visitor
is still told, located-ly, what the system does not have. What
changes is the ending: the lack is carried openly instead of
dropped. When the expectation closes it **files its closing
evidence back into the problem record's closing-evidence
field**: satisfied, the problem record closes with it; timed
out, the record stands with the timeout as its evidence — by
ProblemSolving's own rules either way.

**Satisfaction is routing, not admission (§4.4).** A candidate
satisfier faces exactly the gates any such content faces —
retrieved content banks with its SourceRecord and never
becomes a propagation anchor by arriving expected; a
consultation's `{ status: "unavailable" }` is a stated state,
not a satisfaction; the interlocutor's statement is attributed
testimony under the premise discipline. The expectation
notices the candidate, names the need it answers, and raises
the on-satisfaction demand. If the gates refuse, the
expectation stands and the refusal is an event on its record.
**Nothing enters the system's knowledge because it was waited
for.**

**Two honest standings (§4.5).** *Re-check on later turns* —
at each opening sweep, open expectations are re-checked
against what the intervening turns have banked and said;
between turns, nothing is watched. *Driver-delivered arrival*
— where a host driver stands, it may deliver an arrival to an
open expectation; the watching is the driver's and the record
says so. Continuous watching by the entity itself is not a
standing claimed here, at any point, in any wording. No driver
is built; `deliverArrival` is the entity-side contract.

**Timeout is information (§4.6).** Past its deadline
unsatisfied, an expectation raises its on-timeout demand at
the next opening sweep: what was waited for, from whom, until
when, and that it did not come. An expectation never dies
silently: satisfied, timed out, or cancelled by its
registering unit — each a recorded end.

**The wired walk** is §5.1's weather chain: a weather decline
whose gap the world can close (the lookup unavailable, the
coordinates missing, the only holding stale) registers an
expectation plus a scheduled re-check, and the reply tells the
visitor the located gap **and** that the question is being
kept open. The coverage and ambiguity declines are not wired
(their satisfiers are not arrivals this chain can deliver —
see the T3 report).

## What is deliberately not here

- **No conversational registration** (§7.3's posture question,
  the owner's): units register expectations; visitors do not,
  in this slice.
- **No persistence** (§7.2's conservative default) and **no
  caps** (§7.4: no number proposed, none imposed).
- **The deadline's Calendar/Timeline home** (§8.10) is placed
  by C3; the deadline instant stands in the record from here.

Code: `src/ansci/expectation.ts` (`registerExpectation`,
`expectationEligibility`, `sweepExpectations`, `offerSatisfier`,
`deliverArrival`, `noteWeatherReadingBanked`); the annotation on
`src/ansci/problem-records.ts`; the weather chain in
`src/ansci/weather-turn.ts`. Registered holdings:
`expectation-registration`, `expectation-sweep`
(`src/ansci/capability-registry.ts`).
