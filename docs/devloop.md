# The dev loop — a toolset for improving the engine

The dev loop exists so that an AI agent (or a developer) can ask the
CSKG engine questions, read the traces behind its answers, form a
judgment about what to change, edit the code, and have that judgment
checked — all from a plain terminal, in a tight cycle:

```
diagnose → declare → edit → reload → run (verdict) → diagnose …
```

It is built with the **judgment layer from the start**. A fast
ask/edit/ask loop alone makes an agent faster, not righter; what
makes the loop trustworthy is the discipline around it, and the
toolset scaffolds that discipline mechanically:

1. **The design is served as data.** `/design` returns the engine
   map (pieces, workspace fields, who writes what), the gap
   register (design §9), and the three standing questions below.
2. **Diagnosis is counted, not anecdotal.** `/diagnose` runs the
   evaluation and probe scripts and clusters the failures by
   outcome signature. One bad answer is an anecdote; forty turns
   dying in the same place is a work order.
3. **Changes are declared before they are made.** A declaration
   names the exact turns expected to change and what the new
   replies must (and must not) contain. After the edit, the verdict
   judges the declaration: it passes only if every declared
   assertion holds **and** no undeclared turn changed.

## The three standing questions

Every `/design` response carries these prompts. The toolset
supplies the evidence; answering them is the consuming agent's job.

- **missingFromDesign** — What is missing from the design? Compare
  the diagnosis clusters against the gap register and the engine
  map: which observed failure has no owning piece and no
  registered gap?
- **notWorking** — What isn't working? Answer from the counted
  failure clusters and the probe pass rates, not from single
  anecdotes.
- **shouldFix** — What should be fixed first? Declare it, with the
  exact turns expected to change, then edit, reload, and let the
  verdict judge the declaration.

## Architecture

Four files, additions only — the engine itself is untouched.

| File | Role |
| --- | --- |
| `src/cskg/devworker.ts` | Engine worker. Loads the graph once (~2 s from the serialised index), holds named sessions, speaks JSON-lines over stdio (`status`, `design`, `ask`, `reset`, `runScript`). |
| `src/cskg/devserver.ts` | Thin supervisor: node:http on port 4174 (`DEVLOOP_PORT`), loopback only. Imports **no** engine modules — it forwards ops to the worker and owns `/reload` (build + worker swap). Because the supervisor never loads engine code, it never needs reloading itself. |
| `src/cskg/devcli.ts` | CLI twin. Every operation as a one-shot command that prints JSON to stdout and exits; starts its own short-lived worker per invocation. |
| `src/cskg/devloop-core.ts` | Pure judgment logic: transcript diffing, declaration verdicts, failure clustering, probe parsing/checking. Unit-tested (`test/cskg-devloop.test.ts`). |
| `src/cskg/devloop-state.ts` | File-state orchestration shared by server and CLI. |

**All shared state lives in files** under `.devloop/` (gitignored),
never in server memory — a CLI call, an HTTP call, and a server
restart all see the same world:

```
.devloop/baselines/<script-name>.json   stored transcript baselines
.devloop/declaration.json               the pending declaration
.devloop/declaration-runs.json          runs accumulated toward it
.devloop/last-diagnosis.json            the most recent diagnosis
```

Start the server with:

```bash
npm run dev          # builds, then serves http://127.0.0.1:4174
```

Situated self: the worker defaults `CSKG_CHAT_LOCATION` to
`Chicago` (the evaluation frame) unless the environment or a
per-call `location` says otherwise. `CSKG_PATH` overrides the data
file, as with the chat CLI.

## HTTP API

All request/response bodies are JSON.

### `GET /status`
Graph stats, live session names, worker pid.

### `GET /design`
`{engineMap: {nodes, edges}, gapRegister, standingQuestions}` —
the engine map from `engine-map.ts`, §9 of
`docs/design-conversation-engine.md` extracted verbatim, and the
three standing questions as prompts (deliberately unfilled).

### `POST /ask` — `{session?, text, location?}`
Runs one turn in the named session (default `main`; sessions
persist across calls on the server). Returns
`{session, reply, intent, grounded, trace}` where `trace` is the
turn's trace record at *steps* level (module path + query count,
built by `buildTraceRecord` — the same record the chat's trace
files carry).

### `POST /reset` — `{session?}`
Replaces the named session with a fresh one.

### `POST /declare` — a declaration
```json
{
  "note": "E5b: selling questions should consult the situation model",
  "changes": [
    {"script": "scripts/probes/coreference.txt",
     "input": "What am I selling?",
     "mustContain": ["bike"],
     "mustNotContain": ["set price"]}
  ],
  "allowOtherChanges": false
}
```
Stored as the pending declaration. A declaration with an **empty
`changes` list is rejected** (HTTP 400): a fix that expects
nothing to change is not a declaration.

### `POST /run` — `{script, saveBaseline?, location?}`
Runs a script in a fresh session and returns
`{script, transcript, baselineStored, diff, verdict?}`.

- The first run of a script stores its transcript as the baseline
  and says so (`baselineStored: true`, `diff: null`).
- Later runs diff against the baseline: changed turns with
  before/after replies, plus added/removed inputs when the script
  itself was edited.
- `saveBaseline: true` re-baselines from this run.
- When a declaration is pending and this run covers its last
  outstanding script, the response carries the **verdict** and the
  declaration is consumed. Multi-script declarations accumulate
  runs (`verdictPending`) until complete.

**Verdict rules** (computed in `devloop-core.ts`, never vibed):
PASS only if every declared change's `mustContain` /
`mustNotContain` assertions hold against the new replies, and —
unless `allowOtherChanges` — no undeclared turn changed in any
declared script. Undeclared changes are always reported, even
when tolerated.

### `POST /diagnose` — `{scripts?, location?}`
Runs the given scripts (default: `scripts/cskg-evaluation.txt`
plus all four probe sets) and returns counted evidence:

```json
{
  "totals":   {"turns": 60, "grounded": 57, "ungrounded": 3, "declined": 2, "intents": {…}},
  "clusters": [{"signature": "why|ungrounded|decline@solve: …", "count": 1, "examples": […]}],
  "probes":   [{"script": "…", "annotated": 8, "met": 8, "passRate": 1, "unmet": […]}],
  "perScript": […]
}
```

Clusters group **ungrounded** turns by outcome signature
(intent + grounding + normalised decline detail — digits and
quoted spans normalised away). Diagnosis is evidence, not a
verdict; it is also written to `.devloop/last-diagnosis.json`.

### `POST /reload`
Runs `npm run build`. On success the worker process is replaced
(sessions reset; file state survives) and the response is
`{ok: true, buildMs, workerPid, status}`. On failure the response
is `{ok: false, buildMs, errors}` with the compiler output
**verbatim** — an agent editing code needs the real error text —
and the old worker keeps serving.

## CLI twin

Identical semantics, one shot per command, JSON on stdout,
diagnostics on stderr:

```bash
node dist/src/cskg/devcli.js status
node dist/src/cskg/devcli.js design
node dist/src/cskg/devcli.js ask "What are you making?" --session soup
node dist/src/cskg/devcli.js reset --session soup
node dist/src/cskg/devcli.js run scripts/cskg-evaluation-e5-soup.txt
node dist/src/cskg/devcli.js run scripts/cskg-evaluation-e5-soup.txt --save-baseline
node dist/src/cskg/devcli.js diagnose                 # default set
node dist/src/cskg/devcli.js diagnose scripts/probes/kbqa.txt
node dist/src/cskg/devcli.js declare declaration.json # or: declare -  (stdin)
node dist/src/cskg/devcli.js verdict scripts/cskg-evaluation-e5-soup.txt
```

`verdict <script>` runs the script and judges the pending
declaration; exit code 1 when the verdict is FAIL or no
declaration is pending. Note the CLI's sessions do not persist
between invocations (each starts a fresh worker) — multi-turn
probing belongs in a script file or on the server.

## Probe library (`scripts/probes/`)

The free-form evaluation scripts show transcripts; the probe sets
carry **machine-checkable expectations**, so a diagnosis can
report pass rates per category instead of leaving every judgment
to a reader. Four small sets, each in the project's own terms:

| Set | What it probes |
| --- | --- |
| `abstention.txt` | Questions the engine must **decline** — personal facts nobody told it, live events, private data, specifics no commonsense graph attests. Refusing what it cannot know earns the credit. |
| `coreference.txt` | Multi-turn pronoun and definite chains ("it", "them", "when is it") that only resolve against the conversation's situation model. |
| `kbqa.txt` | Factual graph questions, **one relation each** (purpose, location, part-of, made-of, relatedness, consequence), so a failure names the relation. |
| `correction.txt` | Conversational repair: "No, I meant X" replaces a referent; "What about Y?" shifts topic while keeping the question shape. |

### Annotation format

One input per line; `#` comments are ignored. An annotation line
**immediately following** an input line attaches an expectation
to it:

```
What can I use a hammer for?
#! expect=grounded contains=hammer
```

Grammar (the parser is small and strict — a malformed annotation
is an error, never a silent skip):

```
#! expect=decline|grounded|clarify [contains=a,b] [notcontains=c]
```

- `decline` — the engine refused (a decline step, or an answer it
  did not stand behind). `grounded` — it answered and stood behind
  it. `clarify` — it asked a clarification question.
- `contains=` / `notcontains=` — comma-separated substrings the
  reply must / must not contain (case-insensitive; no spaces or
  commas inside a token).

### Standing results (first diagnose, 2026-11-10)

| Set | Pass rate | Standing |
| --- | --- | --- |
| abstention | **0 / 8** | The engine declines none of them. Each is answered with a grounded definition or fact about some term in the question ("Night is a time of day." for last night's football match). Grounded in the graph, not in the question — no piece owns "this asks for something no graph can attest". The set stays as the standing probe for that gap. |
| coreference | **4 / 6** | The soup chain resolves fully. "What am I selling?" answers about selling in general instead of the situation model's bike; "How long has it been raining?" answers generic weather instead of the stated third day. |
| kbqa | 8 / 8 | — |
| correction | 4 / 4 | — |

Expectations in a probe file are the behaviour the set *asks
for*, and known failures are recorded in the file's header with
the observed behaviour — probes are honest on day one, never
rigged green. When a fix lands, update the header from the new
diagnosis.

## Using this as an AI agent

Terminal-first, by design:

1. **Orient.** `devcli design` (or `GET /design`) — read the
   engine map and the gap register before touching anything.
2. **Diagnose.** `devcli diagnose` — work from the counted
   clusters and probe rates. Answer the three standing questions
   from that evidence.
3. **Declare.** Write the declaration JSON naming the exact turns
   your fix should change and the substrings the new replies must
   or must not contain. `devcli declare fix.json`. If you cannot
   name the turns, you do not yet have a fix — you have a hope.
4. **Edit** the engine source (small: a pattern, a weight; large:
   a new piece — both go through the same gate).
5. **Reload.** `POST /reload` on the server, or just rebuild —
   the CLI starts a fresh worker per invocation anyway. Read
   compiler errors verbatim; fix them before judging behaviour.
6. **Verdict.** `devcli verdict <script>` (or `POST /run`). PASS
   means the change did exactly what it declared. FAIL tells you
   which assertion broke or which undeclared turn moved — that
   second list is where regressions hide.
7. **Re-diagnose** and update the gap register / probe headers
   with what changed. The loop's memory is the repo's documents,
   not your context window.

Rules of the house that the toolset enforces or assumes:

- Transcripts are the acceptance test. A verdict judges declared
  transcript effects, not code elegance.
- State lives in `.devloop/`; delete it to start clean. Baselines
  are per script-name; re-baseline only deliberately
  (`--save-baseline`), never to make a diff go away.
- The server is a dev tool: loopback only, no auth, never the
  public chat surface.

## Honest limits

- **Clustering sees ungrounded turns only.** A grounded answer to
  the wrong question (the abstention failure mode) is invisible to
  clusters — probe annotations exist precisely to catch what
  clustering cannot.
- **A turn can throw.** The engine has paths that raise on some
  inputs (e.g. a definition question about a word with no
  candidate: `candidates[0]` in the definition route). Script runs
  isolate the throw per turn and record it as an `error` outcome
  with a decline-shaped signature, so it clusters instead of
  sinking the run; a single `/ask` reports the error to the
  caller. The engine bug itself is out of this toolset's scope.
- **Verdicts judge replies, not reasons.** Two different
  mechanisms producing the same reply text are the same change as
  far as a verdict is concerned — read traces (`/ask` digests,
  the chat's `--trace` files) when the mechanism matters.
- **Baselines are snapshots of behaviour, including its bugs.**
  A PASS against a stale baseline can certify yesterday's wrong
  answer; keep baselines current with the engine you mean to keep.
