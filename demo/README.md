# Demo — chat with the CSKG spike

A working chat over CSKG, the CommonSense Knowledge Graph: ask what
things are for, what they cause, where they are found — or just tell
it something. It answers only from the graph (about 4.8 million edges
over 1.2 million terms), hedges when only one source attests a fact,
and says so when the graph has nothing. Every answer rests on a
recorded thought trace, session memory carries topics across turns,
and the chat knows where it is and what time it is if you tell it.

This demo is the front end for the self-contained spike in
`src/cskg/`. It is an experiment in conversational machinery, not the
ontology system described in the main README — no Wuxing, no WordNet
senses, no propagation. See `src/cskg/EVALUATION-REPORT.md` for what
that buys and what it costs.

## Quickstart

Prerequisite: **Node >= 20** (any current release). Nothing else —
no database, no accounts, no API keys.

From the repo root:

```sh
node scripts/install.mjs
```

The install script checks your Node version, downloads the CSKG data
(about 112 MB, from Zenodo) into `data/raw/cskg/`, verifies it,
installs dependencies and builds. It then verifies the WordNet
extract (which ships in the repo), installs the full FrameNet bundle
(the participant-role source for the chat's situation model — status
reported as full / fixture-only / absent; the chat runs in every
state, with generic role names where no bundle is present), and
pre-builds the serialised index so the first chat is fast. It is
safe to run again: on a ready repo it verifies what is there and
changes nothing.

## Three ways to chat

All commands run from the repo root. The first launch builds a
serialised index of the graph (about half a minute, once, beside the
data file); later launches load through it in a couple of seconds,
and answers are fast either way.

**Web UI** — a small chat page, served locally:

```sh
node demo/web/server.mjs
# then open http://localhost:4173
```

**Command line** — the spike's own chat:

```sh
node dist/src/cskg/chat.js
# add --debug to see the thought trace (steps + edges) per answer
# /quit exits
```

**Terminal UI** — the front door: on launch it runs a short setup
(data check with an in-place install offer, serialised-index build
on first run, the FrameNet bundle's status reported — never a
blocker — and place/person/role prompts), then chats under a header
carrying the situated frame, with an optional per-turn trace view
and slash commands (`/help` lists them; see `demo/tui/README.md`).
With piped stdin it hands off to the command-line chat instead:

```sh
node demo/tui/tui.mjs
```

## Configuration

Set these in the environment before starting any of the three:

| Variable | What it does |
|---|---|
| `CSKG_CHAT_LOCATION` | The place the chat believes it is in (e.g. `Chicago`, `Sydney`). A few common cities are recognised; any name works if you also give the hemisphere. |
| `CSKG_CHAT_HEMISPHERE` | `north` or `south`. Season is computed from the date *and* the hemisphere — December is winter in Chicago and summer in Sydney. |
| `PORT` | Web UI port (default `4173`). |
| `CSKG_PATH` | Path to the data file, if it is not at `data/raw/cskg/cskg.tsv.gz`. |

With no location set, the chat is honest about it: asked where it is
or what season it is, it says it doesn't know and answers for both
hemispheres where that matters.

## What to expect

- **Statements get answers, not shrugs.** "I'm making a big pot of
  soup on Saturday." gets a grounded reply from the graph, and the
  topic is remembered for follow-ups.
- **Follow-ups, corrections, receipts.** "What about the flu?" stays
  on topic; "no, I meant the illness" re-resolves; "why did you say
  that?" replays the actual reasoning trace of the last answer.
- **It declines.** When the graph has no edge for something, it says
  so and names what it couldn't place. Everyday causation is thinner
  than you might expect — in the merged CSKG data, onions have no
  Causes edges at all, and the chat will tell you it can't answer
  rather than improvise.
- **No dictionary definitions.** CSKG has no glosses, so "what is X?"
  answers with a sketch from the graph's neighbourhood of X (what it
  is a kind of, what it is part of, what it does), not a definition.
- **Edges are rendered as faithfully as they deserve — and some
  deserve little.** Loose or odd edges in the data surface as odd
  answers, softened when only one source attests them. The evaluation
  report quotes the failures verbatim; read it for the full picture.

## Going further: the evaluation

The evaluation scripts are plain lists of things to say, run through
the command-line chat in one session each:

```sh
npm run build
CSKG_CHAT_LOCATION=Chicago node dist/src/cskg/chat.js --script scripts/cskg-evaluation.txt --debug
CSKG_CHAT_LOCATION=Sydney  node dist/src/cskg/chat.js --script scripts/cskg-evaluation-sydney.txt --debug
```

`src/cskg/EVALUATION-REPORT.md` records the scored results — grounded,
ungrounded, declined, wrong-sense — transcripts included.

## Data and licence

CSKG is **not in this repository** (the download is gitignored). It is:
Ilievski, Szekely & Zhang, *CSKG: The CommonSense Knowledge Graph*,
ESWC 2021, USC Information Sciences Institute — a unification of
ConceptNet, WordNet, FrameNet, ATOMIC, Roget's Thesaurus, a Wikidata
subset and Visual Genome. Data: Zenodo record 4331372. Licence:
Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0) per the
project documentation; the component sources keep their own terms.
See the repo's `NOTICE` file.
