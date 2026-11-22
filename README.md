# AnSci — AI Model

AnSci is a classical-AI system whose **mind is an ontology graph**, not a neural network.
An LLM learns that "cold" and "winter" go together statistically, in a 1000+-dimensional
embedding space. AnSci *already knows* they go together, a priori, because both are
Water/Yin — and night, also Yin, is longer in winter and cooler than day in every season.
Those correspondences are not training patterns. They are a **path through the graph**:

```
winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold
```

The same graph of ontological priors interrelates the seasons, times of day, astronomy,
the human body, sounds (pentatonic notes), colours and tastes — everything mapped onto
yin/yang and the Five Elements (Wuxing). New domains are acquired by mapping their
concepts onto those same priors, with confidence scores.

**The graph is the model. An LLM, when one is used at all, is only ever the trainer or
the translator — never the reasoner.**

## Where the project stands — 2026-11-20

AnSci is still AnSci, and the goal is still a chat. What has changed is the
**development approach**: the project is now developed **map-first**.

The system has a schematic map — it is the site's root page, live at
<https://ansci-ai-classical-chat.noctivagoussoft.workers.dev/> — and the map is not a
picture of the system. It is the system's own organisation, drawn from the same
registry the code is organised by:

- **`ai-system/` is the working directory.** Its tree *is* the map: every node's id is
  its directory path (`ai-system/system-map.ts` is the registry, `system-layout.ts`
  holds only presentation). The correspondence is checked, not hoped for —
  `npm run ai:check` fails if the registry, the layout and the directories disagree.
- **The map shows what is actually built.** Every node carries a state and a
  **% completed to goal, set by us** — assessed by the project, never computed.
  Placeholders are drawn as placeholders. A Plan / Built only switch on the page
  shows the whole plan, or only what exists.
- **The map is functional.** The "A Person Says" box on the root page is a real chat
  input: a sentence runs through the actual turn loop, and the walk drawn on the map
  is the walk the code took — every turn trace carries it (`trace.mapPath`, in the
  registry's own node ids, gated by `test/ansci-mappath.test.ts`). Where a turn stops,
  the map stops, and the stop's own words appear at the node where it stopped.
- **Work proceeds unit by unit against the map** — building what is placeholder,
  migrating what exists in the reference implementations, one gated slice at a time.
- **The map itself is organised as the Luoshu.** Since 2026-11-20 the root page's
  frames sit in a drawn 3×3 nine-palace scaffold: the knowledge core
  (OntologyCore + Knowledge) at the centre (5), the other top-level units in the
  eight palaces by function, sized by maximum correspondence and anchored toward
  the centre, and tinted by each palace's phase in the five colours. The
  correspondence and the layout rules are recorded in
  [`ai-system/SCHEMATICS-LUOSHU.md`](ai-system/SCHEMATICS-LUOSHU.md).
- **Recent landings.** The map gained a top-level Functions Unit (generic
  operations other units call) and an ErrorFailure Unit (which composes the
  account of a failure), with a ReasoningErrorFailure subunit inside
  ProblemSolving on the bridge pattern. The first lack machinery is in code: a
  capability registry as data, `capability` as a need kind with an audit, and
  decline registration wired into the turn — every priced decline now files a
  problem record.

Chat is the first configuration of a general-purpose system; the map and the
`ai-system/` tree are drawn configuration-neutral, with the configuration named on
the System frame.

## The two earlier paths

Two earlier paths built most of what the map now organises:

1. **The classical CSKG track** — a chat on the unified commonsense graph (CSKG),
   with the project's conversation machinery on top. Its written record is kept
   as **reference** in [`archive-reference/`](archive-reference/) — consulted and
   drawn on, no longer the line of development. Its code (`src/`, `src/cskg/`)
   stays in place and runnable as the conventional-knowledge baseline and a
   supporting knowledge feeder.
2. **The ancient-Chinese knowledge-graph path** (begun as "the fork") — the
   knowledge graph and its sentence layer: the classification table, the depth
   programme, and the reply-planning programme. This path became the live line:
   its code (`src/ansci/`) is the engine the root page runs, and new map-driven
   work is written there directly. Its earlier written record is in
   `archive-reference/` alongside the CSKG track's.

Neither path is discarded. The map-based approach exists to make their work
usable as one system; the archive's README is the guide to what each holds.

## Repository layout

- `ai-system/` — the working directory: registry, layout, correspondence gate,
  and one directory per schematic node.
- `demo/dashboard/` — the site: the schematic root page (`/`, source in
  `demo/dashboard/root/`, revised in its Muse artifact and synced here) and the
  capability & evaluation dashboard at `/dashboard/`, which runs the same engine
  in the browser and keeps the measured record, caveats included.
- `src/` — the classical core and the CSKG track (see above). `src/ansci/` —
  the live system code: the knowledge-graph engine and everything the
  map-driven line has built since.
- `archive-reference/` — the two paths' written record: designs, evaluations,
  challenge sets, acceptance transcripts.
- `docs/` — `docs/ansci/` holds the current line's design documents and build
  reports; the paths' original documents (copies of record are in
  `archive-reference/`); plus the user's own reference writings in `docs/user-ref/`.
- `test/` — the suite; transcripts and gates are the acceptance discipline.

## Third-party libraries and data

AnSci builds on external libraries, ported algorithms, converted datasets and
runtime services, in several different forms (npm dependencies, a vendored
WASM build, in-tree ports, derived data tables). The index by form is
[`EXTERNAL-LIBRARIES.md`](EXTERNAL-LIBRARIES.md); the legal attribution record
— full licence texts and copyright holders — is [`NOTICE`](NOTICE).

## Run it

```sh
npm install
npm test                 # the suite (1258 tests) — build + node --test
npm run ai:check         # the map ↔ code correspondence gate
npm run ansci:chat        # the AnSci surface: a parser demonstrator, not a finished chat
npm run chat:cskg        # the archived CSKG track, under its own name
```

The site builds from `demo/dashboard/` (`npm run build` there): the schematic at
the root, the dashboard at `/dashboard/`, and `engine.js` — the real turn loop as
a single script — beside the root page, which is what makes the map's chat live.

## A plain note on status

What the system can do today is what the map and the dashboard's capability ledger
show — no more, and the two are kept in agreement with the code by gates, not by
editing the prose. Conversation beyond the designed surface is the open work;
on the map it is exactly as open as the Awareness and Session nodes say it is.
