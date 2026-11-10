# The Loop — an executor's protocol for improving the AnSci engine

You are the **executor** of an improvement loop for the CSKG chat
engine in this repository. This document is your whole brief: it
tells you the direction, the cycle, the exact commands, and the
lines you do not cross. The toolset you drive is documented in
`docs/devloop.md` — read it before your first loop. Everything you
need is reachable from a plain terminal; state lives in files
under `.devloop/`, never in your context window.

```
diagnose → tree → (declare → edit → build → verdict) per leaf → diagnose → report
```

## Role split: executor and director

- **You (the executor)** run the loop: diagnose, draft the problem
  tree, execute leaves in order, keep the suite green, write the
  report. You work fast and in volume.
- **The director** (the user, or the frontier model working with
  them) owns the judgment calls: how the tree is classified, what
  the design should become, and **every push to git**. The tree
  you execute is the director's instrument, not your invention.

**Escalation rule — stop and return to the director when:**

- a leaf is classified **design** (a responsibility no existing
  piece owns) and the tree does not record the director's explicit
  go-ahead for that leaf. Prepare its evidence and a proposed
  declaration; do not improvise a design.
- a verdict is **ambiguous** — the diff shows changes you cannot
  attribute to the leaf's declared intent, or declared assertions
  pass only by coincidence of wording.
- reality disagrees with a declaration twice (see the two-verdict
  rule below). Mark the leaf blocked; do not widen the
  declaration and do not thrash.

## The standing direction

> Depend on CSKG for **testimony** — the facts, the relations, and
> their absence; silence in the graph is evidence for a decline —
> **not for everything**. State, memory tracking, decision, and
> chain of thought are **our directing layer**: build and fix those
> directly, never expect them from the graph. That directing layer
> **can** use the graph — ownership is the question, not isolation;
> it consults graph testimony as evidence wherever that is honest.
> Never hand-build factual knowledge the graph should supply.

Every leaf in the tree carries a `layer` field recording which
side of this division it lives on. If you cannot say which layer a
problem belongs to, you have not understood it yet — that is an
escalation, not a detail.

## The commands (verified against the toolset)

```bash
npm run build                                   # compile; the CLI always runs dist/
npm test                                        # full suite (builds first)
node dist/src/cskg/devcli.js status             # graph stats, readiness
node dist/src/cskg/devcli.js design             # engine map + gap register + the three standing questions
node dist/src/cskg/devcli.js diagnose           # default set: Chicago evaluation + all probe sets
node dist/src/cskg/devcli.js diagnose <script>  # a narrower diagnosis
node dist/src/cskg/devcli.js ask "…" [--session name]
node dist/src/cskg/devcli.js run <script> [--save-baseline]
node dist/src/cskg/devcli.js declare <declaration.json | ->   # JSON on file or stdin
node dist/src/cskg/devcli.js verdict <script>   # exit 1 on FAIL or no pending declaration
npm run loop:tree                               # draft a problem tree from the last diagnosis
npm run loop:tree -- --refresh                  # re-run diagnose first, then draft
```

Notes that matter:

- The CLI starts a fresh worker per invocation from `dist/` — so
  **rebuild after every edit, before every verdict**, or you are
  judging stale code. (`npm test` builds; a bare `npm run build`
  suffices before `verdict`.)
- A server (`npm run dev`, loopback :4174) exists and mirrors
  these operations over HTTP, with `/reload` instead of a manual
  rebuild. Prefer the CLI inside Muse Code; use whichever you
  start, consistently, within a leaf.
- CLI sessions do not persist between invocations. Multi-turn
  probing belongs in a script file, not a chain of `ask` calls.

## The cycle

### 1. Diagnose and orient

```bash
node dist/src/cskg/devcli.js diagnose
node dist/src/cskg/devcli.js design
```

Read the counted clusters and probe pass rates, then the engine
map and the gap register (§9 of the design doc, served by
`design`). Answer the three standing questions **from that
evidence**: what is missing from the design, what isn't working,
what should be fixed first. Diagnosis is written to
`.devloop/last-diagnosis.json`.

### 2. Draft and classify the problem tree

```bash
npm run loop:tree
```

This writes `.devloop/problem-tree.draft.json` from the latest
diagnosis. **It drafts; it does not decide.** Its heuristics are
starting points only:

| Draft suggestion | Means |
| --- | --- |
| cluster signature starts `error|` → **fix** | a turn threw; a piece exists and misbehaves |
| why-decline cluster → **data** | check the graph's causal testimony first — the decline may be correct |
| probe unmet, grouped by set → **extend-or-design**, unclassified | judgment required, per leaf |
| anything else → unclassified | judgment required |

Classify every leaf yourself (or confirm the director's
classification): assign a **category**, an **owner piece** (from
the engine map), a **layer** (per the standing direction), and
keep the leaf's **evidence** (example inputs, signatures, observed
replies). Heuristics get reclassified by judgment — e.g. the
generator files every why-decline under *data*, but a bare "Why?"
that declines for want of a standing subject is a
chain-of-thought problem (*extend*), not a testimony problem.
Save the classified tree as **`.devloop/problem-tree.json`** (the
draft file is scratch; the tree file is the loop's record).

Categories, in execution order:

1. **fix** — a piece exists and misbehaves (crash, wrong edge,
   broken route).
2. **extend** — a piece exists but lacks a case (a question form
   its model holds but nobody asks it; a context the chain of
   thought drops).
3. **design** — no piece owns this responsibility. **Director-
   gated** (see the escalation rule).
4. **data** — check CSKG's testimony before building anything. If
   the graph holds no such fact, an honest decline is *correct*
   and the leaf closes with **no action**; if the testimony
   exists and a piece fails to find it, the leaf is reclassified
   *extend* against that piece.
5. **sorted-out** — examined and found not to be a defect (e.g.
   behaviour that is ungrounded *by design*). Closed on sight,
   with the reason recorded. Sorting a problem *out* is a result.

Tree format (same shape as the standing example the director
keeps; keep these field names):

```json
{
  "loop": 1,
  "at": "2026-11-10T00:13:00-06:00",
  "direction": "…the standing direction, as it applies to this loop…",
  "source": "devcli diagnose, 60 turns: 57 grounded, 3 ungrounded, 2 declined; probes: abstention 0/8, …",
  "branches": [
    { "id": "fix", "label": "Fix — a piece exists and misbehaves",
      "leaves": [
        { "id": "fix-zorblax",
          "owner": "Solve/Definitions route (turn.ts)",
          "problem": "…what is wrong, in one or two sentences…",
          "evidence": "…cluster signature / probe reply / trace — the receipt…",
          "layer": "ours — decision route",
          "status": "pending" }
      ] }
  ]
}
```

Leaf statuses: `pending` → `in-progress` → `landed` |
`blocked` (with the blocking evidence appended) |
`closed-no-action` (sorted-out and correct-decline data leaves).

### 3. Execute each leaf, in order

For every leaf, in branch order (fix → extend → design →
data), **all five steps, in this order**:

1. **Declare — before any edit.**
   ```bash
   node dist/src/cskg/devcli.js declare declaration.json   # or: declare -  (stdin)
   ```
   The declaration names the exact turns expected to change and
   what the new replies must / must not contain:
   ```json
   { "note": "why this leaf, in one line",
     "changes": [
       { "script": "scripts/probes/coreference.txt",
         "input": "What am I selling?",
         "mustContain": ["bike"],
         "mustNotContain": ["set price"] }
     ],
     "allowOtherChanges": false }
   ```
   A declaration with an empty `changes` list is **rejected by
   the toolset** — a fix that expects nothing to change is not a
   declaration. If you cannot name the turns, you do not yet have
   a fix; go back to the traces. Set `allowOtherChanges: true`
   only when the leaf's nature requires it, and say why in the
   note.
2. **Edit** the engine source — the smallest change that owns the
   problem, in the piece that owns it. Small (a pattern, a
   weight) and large (a new piece) go through the same gate.
3. **Build and test.** `npm test` — the full suite must pass.
   A leaf that breaks the suite is **reverted**, not fixed
   forward.
4. **Verdict.**
   ```bash
   node dist/src/cskg/devcli.js verdict <script>    # once per declared script
   ```
   PASS means the change did exactly what it declared: every
   assertion holds and no undeclared turn moved. Read a FAIL
   literally — which assertion broke, or which undeclared turn
   changed. That second list is where regressions hide.
5. **Record.** Set the leaf's status in
   `.devloop/problem-tree.json`, appending the verdict outcome to
   its evidence. If the fix changes what a probe set observes,
   update that probe file's **header** to the new reality
   (headers describe reality; see the prohibitions).

**The two-verdict rule.** A leaf gets at most **two** verdict
attempts. On the second failure: mark it `blocked`, append the
diff evidence, and move to the next branch. **Never widen a
declaration after seeing a diff** — a declaration edited to match
reality certifies nothing. If reality disagrees, the leaf stops
and the report says what the diff actually showed.

**Baselines.** The first `run`/`verdict` of a script stores its
transcript as the baseline. Re-baseline (`--save-baseline`) only
deliberately — when the director accepts the new behaviour as the
standing one — never to make a diff go away.

### 4. Re-diagnose

```bash
node dist/src/cskg/devcli.js diagnose
```

Compare against the diagnosis you started from: probe pass
rates, grounded/declined totals, clusters gone and clusters new.
A new cluster your loop created is a finding, not an
embarrassment — it goes in the report.

### 5. Report

Write **`.devloo
...[truncated 9116 chars]