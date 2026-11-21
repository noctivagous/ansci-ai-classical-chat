# Monitoring programme — M1 report: the register and the bank over its own holdings

2026-11-21 · Branch `track/monitoring-build`, worktree
`~/workspace/ansci-track-monitoring-build` · Base: `fd1c0bb` (the Time
programme's final head on `track/time-build` — T1 `c939d33`, T2 `a18edf9`,
T3 `1a87aa1`, C1 `ab55407`, C2 `5b72cf7`, C3 `e6be9d2`, programme report
`fd1c0bb`; the dependency state found was COMPLETE: all six slices plus
the programme report, tree clean; the time-build worktree was only read).
Local only — nothing pushed, nothing merged.
Design: `docs/ansci/monitoring-design-note.md` (the note governs; §2 the
record, §3 the composition, §5 the silence discipline, §7.2 the slice's
acceptance, §8 the catalogue).

## What was built

- **`src/ansci/monitoring.ts`** — the Monitoring Unit: the monitor
  register on the Session (`session.monitors`, on the problem/schedule/
  expectation register pattern), the §2.2 record (subject & source,
  interval as period + phase anchor with its standing named, change rule
  as a non-empty list of checkable clauses, registrar, expiry as a field
  never omitted, standing recorded as `turn-boundary`, last reading with
  its fetch stamp, complete history), registration with every §8 refusal
  located, the endings (registrar-only cancel; supersession — rules are
  revised by supersession, never edited in place; expired-unclosed closed
  at the next sweep with its check count in the closing words), the
  staleness check as the standing comparison, and the declined-check
  record with the one permitted heartbeat latched at one per monitor.
- **`src/ansci/monitoring-turn.ts`** — the wired layer, on the weather
  wrapper's pattern: runs the turn (through the weather wrapper where
  its deps are given, so the T2/T3 chains run inside it unchanged), the
  closing pass, then prices and executes the monitor checks the opening
  sweep raised. A staleness firing's proposed refresh is registered as a
  Scheduling item with the weather-reconsult consumer (§7.2.2).
- **Substrate, in the established style:** `Session.monitors` +
  `monitorSeq`; Scheduling's consumer union gains
  `{ kind: "monitor-check", monitorId }` (a monitor's checks ride due
  items, §3.3 — the Unit keeps no clock of its own); the turn trace
  gains `monitorChecks` and `monitorFirings` fields.
- **The seat (§9's closing paragraph):** map node `monitoring` (Unit,
  parent `system`, partial, 40%) with `ai-system/monitoring/
  PLACEHOLDER.md`, layout order 19, the root page's percent table
  synced; capability-registry holdings `monitor-registration` and
  `monitor-check` held by `monitoring`, the registry test's pinned list
  amended as each time slice amended it.
- **Tests:** `test/ansci-monitoring-m1.test.ts`, 15 tests, fixture
  clocks and fixture sources only.

## The acceptance (§7.2), as exercised

A weather reading banked with a 3-minute TTL under a passes-shelf-life
monitor (fact form, registrar "the weather wrapper"): the check inside
the shelf life records the baseline (not-comparable, §3.4) and raises
nothing; the next records no-change and raises nothing; the crossing
check fires — the demand names the monitor, the registrar, the rule,
and BOTH readings — and proposes the refresh as a scheduled
re-consultation. Between the firing and the asking, the bank holds
nothing fresh (asserted); the asking then answers from the re-banked
reading, its fetch stamp the asking turn's instant. The history stands
`[registered, not-comparable, no-change, change]` — every check, fired
and unfired. Around it: the margin rule fires entering the margin and
not twice; the class form fires per holding that crossed, naming it;
a monitor over the geography register's coordinates runs through the
same uniform operation; declined checks close fired-and-declined with
the next check registered as usual, and the heartbeat raises exactly
once at the third successive decline; an expired monitor closes at the
next sweep with no check running after its expiry.

**One composition finding, pinned by its own test.** Where the weather
wrapper's own T2 re-check also stands for a reading (armed by a live
ask, trigger at the reading's expiry), it refreshes inside the same
turn's sweep, before the monitor's check runs — so the check honestly
finds the fact fresh and records no firing. The two mechanisms compose
without double-firing: the monitor fires only when a check actually
finds the crossing. The acceptance above therefore banks its reading
directly, so the monitor is the only watcher and §7.2's chain is the
one exercised.

## §3.2 reconciled against the Form programme

The Form programme had landed when this build began (branch
`track/form-build`: F1 `79a18a6`, F2 `3e614a5`, F3 `639b131`, programme
report `638fefa`). Read: its programme report and the F3 report. What
was reconciled:

- Form's pattern register (`src/ansci/form.ts`,
  `src/ansci/form-repetition.ts`) holds patterns as KNOWLEDGE: a
  repeating unit as a sequence of steps over a domain, the period as
  its source states it, provenance and append-only lineage. There is no
  duration-pattern record type to reference for a plain hourly
  interval, and Form's code is not in this build's base (the programmes
  were built in parallel from different bases) — so, following the Time
  programme's own default 13 ("Form cited, not imported"), the monitor
  record's interval carries the period as a duration (Quantification's
  arithmetic), the phase anchor with its standing named, and an
  OPTIONAL pattern citation carried as data in the pattern register's
  terms (`{ pattern, citedAs }`) — e.g. a daypart-anchored watch cites
  the daypart pattern. The citation is resolvable via `citePattern`'s
  semantics once the trees stand together; no pattern records are
  minted per registration (the register is append-only knowledge, not
  a scratchpad).
- Repetition's detection floor (two full periods before asserting a
  repetition) governs ASSERTING a repetition in given material. It is
  not applied to a stated interval of intent, which is what §3.2 says
  the interval is — a pattern of intent, not a metronome. No detection
  is run at registration.

## Design readings taken (stated, not hidden)

1. **The change rule is a list of clauses**; the monitor fires when
   any clause fires, the firing naming the clause(s). §7.1's weather
   rule is compound (condition word OR precipitation), and §2.2's "no
   rule, no monitor" becomes: an empty list is refused at the rule.
2. **First-look firing for staleness rules.** The firing is ENTERING
   the named state, and a first check that finds the fact already stale
   (or already inside the margin) fires: the standing term before the
   first check is "unwatched" (the demand says so, in words). The
   alternative — a first check can never fire — would leave a monitor
   registered over an already-stale fact silent forever, against
   §7.2's purpose. For content rules (M2), the first check remains the
   ordinary not-comparable baseline, as §3.4 names it.
3. **Registration requires a standing instant** (to anchor the
   interval and place the first check); without one, registration is
   refused at the standing. Expectation's deadline rule is the
   precedent.
4. **Expiry reconciled:** the field is never omitted — an omitted
   expiry is refused (the note's mandatory lean, §6.2/§10.1, followed
   as the default per the commissioning brief) — and "no-expiry"
   stands as a stated value with its reason, on Scheduling's
   precedent.

## Defaults flagged for the owner's ratification

- **Expiry:** mandatory lean followed (above) — the note's §10.1 open
  question, taken as a default, not a ruling.
- **The waking floor:** `TURN_BOUNDARY_FLOOR_MS = 60_000` — one minute,
  stated in the code as this build's default. Below it, registration
  is refused at the interval, or restated as a check at every turn
  where the registrar accepts the restatement in the spec.
- **The heartbeat run:** `DECLINED_CHECK_HEARTBEAT_RUN = 3` successive
  declined checks, stated in the code as this build's default; the
  heartbeat fires once per monitor and is about the monitor itself.
- **Standing:** only `turn-boundary` is registrable; `driver-delivered`
  is refused at the standing (no host driver stands — the Time
  programme built the contract's entity side only).
- **Cancellation and change-rule authorship:** registrar-only, the
  registrar being a unit; rules change by supersession, never in
  place. No conversational registration or authoring surface is built
  (the brief's default at this rung).
- **Consultation subjects** (weather-reading, what's-there) are
  refused at registration in M1, at the subject, in §2.2's words: no
  consultation source stands wired to the register yet. M2/M3 lift
  the refusal as their sources stand.
- **Map seat wording:** a single top-level Unit node `monitoring`
  beside the OKU's units and Awareness, on the note §2.1's proposal;
  the note's §10.4 wording question stands open.
- **Registers session-scoped**, nothing persists — the standing
  default of every register in this system at this rung.
- All refusal and demand wordings are shapes in the §8 catalogue's
  terms, **owner's-to-settle**, as every programme's wordings have
  been.

## Gates

Baseline at `fd1c0bb`, reproduced before any change: suite 1461 tests /
1458 pass / 0 fail / 3 skip · demo 29/29 · holdout 80/80, 0 regressions
· sense A 11/11, B 6/6 · ai:check OK (105 nodes).

M1, fresh complete runs on the slice tree: suite **1476 tests / 1473
pass / 0 fail / 3 skip** · demo 29/29 · holdout 80/80, 0 regressions ·
sense A 11/11, B 6/6 · ai:check OK (106 nodes — the Monitoring seat).
(The gate battery's byproduct files were never committed, as in every
prior landing.)

## What remains open after M1

M2 (consultation monitors over the weather chain) and M3 (the monitor
as an Expectation's mechanism) follow in this programme. The note's
§10 questions stand as flagged above. Nothing in M1 was pushed or
merged.
