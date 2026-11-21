# Time programme — T3 report: Expectation

Date: 2026-11-20. Branch: `track/time-build`, on T2's commit
a18edf9 (base `origin/main` 836a5d0). Specification:
`docs/ansci/time-scheduling-design-note.md` §4 (Expectation),
§5.1, §5.3, and §6 slice T3. House pattern throughout.
Nothing was pushed; the commit is local.

## What was built

**`src/ansci/expectation.ts`** — the Expectation family
(`functions/expectation`, seat state `partial`, holdings
`expectation-registration` and `expectation-sweep`),
chartered jointly with the lack machinery (§4.3):

- **The record (§4.2).** A session-scoped register on the
  Session. Each expectation carries its **satisfier**
  stated checkably (a fact / a reply / an arrival — the
  union's shape makes an unstatable satisfier
  unregistrable), its statement in words, its
  **expected-from**, its **deadline** (required — a
  registration without one is refused, stated: open-ended
  waiting is how registers fill with the dead), the
  **on-satisfaction** and **on-timeout** demands stated at
  registration, its registrar and its registration stamp
  on a named standing.
- **The eligibility test (§4.3).**
  `expectationEligibility` applies the one test — could
  the world deliver the satisfier without the system
  changing? — over the four need kinds:
  `lack-of-information` eligible; `quantification`
  eligible only where the value is owed by the
  interlocutor (the record's bearer is the standing
  marker — flagged below); `capability` and
  `how-to-proceed` refused with their grounds stated, the
  audit's verdicts read, never re-priced.
- **The hand-off (§4.3).** Registering annotates the
  problem record with the expectation's id
  (`ProblemRecord.expectationId` — the one field this
  slice adds to `problem-records.ts`) and changes nothing
  else about the account: need, ground, seat history and
  status stand as they were, and the turn that opened the
  lack stays declined. One open watch per account (a
  second registration is refused, stated — the record
  carries one reference). On closing, the expectation
  **files its closing evidence into the problem record's
  closing-evidence field**: satisfied, the record closes
  with it (`closeProblem`, ProblemSolving's own rule);
  timed out, the evidence is filed and the record
  **stands** — the timeout leaves the need standing
  (§4.6), so the status is not this module's to close.
- **The gates (§4.4).** `offerSatisfier` is the seam
  where a candidate is noticed: the offer carries its
  route and the gates' verdict from the machinery that
  ran them. A refusal is recorded as an event on the
  expectation's record and satisfies nothing; a pass
  closes the expectation satisfied and returns the
  on-satisfaction demand. `deliverArrival` is the
  driver-delivered form of the same seam (§3.4, §4.5):
  delivery is not admission, and a satisfied-by-delivery
  record names the driver's watching as its route. No
  host driver is built.
- **The sweep (§3.5.1, §4.5, §4.6).** `sweepExpectations`
  runs in `processTurn`'s opening beside the schedule
  sweep, on the same standing: satisfactions the
  intervening turns already banked close as satisfied
  (the wired banked-fact checker is the weather bank's —
  a reading still fresh at the sweep, banked no later
  than the deadline); deadlines passed raise their
  timeouts with the on-timeout demand. Between turns,
  nothing is watched. A reading banked **after** the
  deadline is a late arrival, not a satisfaction — the
  checker and the banking-notice both refuse it, record
  it on the expectation's record, and leave the timeout
  as the verdict.
- **Registrar-only cancel** (§4.6's third recorded end),
  on the trio's shared discipline.

**One amendment to T2's sweep**, needed by §5.1's chain
and recorded here: a due-raised item with a wired
consumer now has its demand **re-raised at each sweep**
while its registration stands — §5.3's "the wait
continues" made mechanical, so a re-check whose source
was unavailable is retried at the next turn boundary
until it succeeds or its registration lapses. A due item
with no consumer is not re-annotated (the Planner priced
it at its raising; nothing has changed).

**The §5.1 chain, wired in `weather-turn.ts`.** The
three weather declines whose gap the world can close —
lookup unavailable, coordinates missing, stale-only —
register an expectation over the problem record the
decline filed, plus the §5.1-step-3 scheduled re-check
(trigger at the registration instant, so it is due at
the next turn boundary; registration expiring at the
expectation's deadline). The reply gains the keeping-open
clause (DRAFT, flagged): the visitor is told the located
gap **and** that the question is being kept open — a
statement about a registration that exists (§5.1 step 2;
registration does not un-decline the turn). Every weather
banking — the lookup's and the re-consultation's — is
noticed by `noteWeatherReadingBanked`: a waiting
expectation whose satisfier is that reading closes
satisfied, its evidence filed, the satisfaction appended
to the turn's `expectationSweep` annotation. The two
excluded declines, with their grounds: **coverage** (the
named source cannot serve the place — no arrival from
that chain can satisfy it) and **ambiguity** (its
satisfier is the interlocutor's disambiguation —
eligible in design as an interlocutor-owed value, not
wired in this slice).

## Acceptance (§6, T3) — what the tests show

`test/ansci-time-t3.test.ts`, 12 tests, all passing:

- Eligibility over all four need kinds; the hand-off
  leaves the problem record's need, ground and status
  untouched and adds the one reference; the registration
  refusals (no deadline, ineligible need, closed account,
  no account, second watch) all stated.
- A gates-refused offer satisfies nothing and is an
  event on the record; a gates-passed offer closes the
  expectation and the problem record, the evidence filed
  in both. Driver delivery: refused without gates,
  satisfied with them, the route naming the driver's
  watching.
- Sweep satisfaction from an intervening banking (fresh,
  in time) and the late-arrival refusal.
- **§5.1, satisfied ending**: the unavailable lookup
  declines with the keeping-open clause; the expectation
  and the re-check stand; the source restored, the next
  turn's re-check fires, the reading banks, the
  expectation closes satisfied (route: the re-check
  standing, noticed at the banking), the problem record
  closes with the satisfaction as its closing evidence,
  and the visitor is answered from the banked reading.
- **§5.1, timeout ending**: the source down at the
  re-check (a stated state; the wait continues), then
  past the deadline the timeout raises on the trace with
  its demand, files into the problem record — which
  **stands** at its declined-priced status with the
  timeout as its evidence — and the re-check lapses with
  it, its registration expiry reached.

## Gates (fresh, complete runs on this slice's tree)

| Gate | Figure |
|---|---|
| Suite | 1432 tests · 1429 pass · 0 fail · 3 skip (T2's 1420/1417/0/3; +12 = the T3 tests) |
| Demo | 29/29 expectations met |
| Holdout | 80/80 parsed · 0 parse regressions · 0 round-trip regressions |
| Sense evals | A 11/11 · B 6/6 |
| ai:check | OK — 103 nodes (83 directories); root page carries all 100 percented nodes |
| T3 tests | 12/12 (in the suite figure) |

## Verified by construction vs by test

- **By test:** both §5.1 endings end-to-end through the
  real wrapper; every filing landing in the problem
  record; the gates' refusal leaving every record
  untouched.
- **By construction:** satisfaction is routing — the
  module contains no banking, no testimony and no reply
  code; it notices candidates the other machinery banked
  or offered, and its only writes are its own register,
  the problem record's annotation and closing-evidence
  field, and trace annotations. The two standings are the
  only satisfaction routes the module exposes.

## Defaults taken — flagged for ratification

1. **The weather expectation's deadline horizon**: 30
   minutes past registration (one weather shelf life).
   §5.1 says "a stated horizon in the turn's time
   standing" without a length; the choice and its reason
   are recorded in the code (`weather-turn.ts`).
2. **The keeping-open clause's wording is a draft**:
   "I am keeping this question open and will check
   again." — appended to the three eligible declines'
   replies, owner's to settle like all wording here.
3. **Map percent 40** for `functions/expectation`.
4. **Session-scoped register; no caps; no conversational
   registration** — §7.2/§7.4/§7.3's conservative
   defaults, as in T2.
5. The `quantification` eligibility marker: the problem
   record's **bearer** (`user`) stands for "owed by the
   interlocutor". If ProblemSolving grows a more precise
   marker of an interlocutor-owed value, the test should
   read it instead — the eligibility rule's words would
   not change.

## What remains open after T3

- **The §4.6 telling.** Where a self-turn is registered
  alongside, the timeout is owed a located decline in
  retrospect. No self-turn is registered alongside the
  weather expectation in this build, so no telling is
  wired: the timeout raises its demand on the trace and
  files its evidence, and a later weather asking meets
  the ordinary routes. Registering the telling self-turn
  is a Planner-uptake build the note leaves open.
- **The interlocutor-statement satisfaction route**
  stands as machinery (the `reply` satisfier kind, the
  offer seam's interlocutor route) with no conversational
  shape wired to notice a visitor's statement as a
  satisfier — the same shapes question as §7.3, flagged
  rather than settled by implementing one.
- The expectation's deadline is an instant in its record;
  its **Calendar/Timeline home** (§8.10) is C3's to
  place, and §4.6's timeout is evaluated against that
  placement there.
