# Terminal UI

```sh
node demo/tui/tui.mjs
```

The chat's terminal front door: a real interface over the same
CSKG chat engine the web UI and the command line present
(`src/cskg/turn.ts` and the pieces it coordinates) — same
graph, same answers, presentation only.

## Setup before chat

An interactive launch sets itself up before the first turn,
reporting each step as it happens; any failure stops before
chat, with the reason:

1. **Data** — the CSKG file (`CSKG_PATH`, or
   `data/raw/cskg/cskg.tsv.gz`) is checked. If it is missing
   or empty, the install is offered on the spot — the same
   verified Zenodo download `scripts/install.mjs` performs.
   Decline or fail, and there is no chat: the TUI never opens
   a conversation on a missing graph.
2. **Serialise** — the loader's serialised index is probed.
   A current one loads in about two seconds, and the TUI says
   so. Otherwise the graph is parsed in full as a visible
   setup step (about half a minute, with a running clock) and
   the loader writes a fresh index beside the data file — a
   one-off cost, paid here, never as a silent hang inside the
   conversation.
3. **Configure** — place, person, role. Environment values
   (`CSKG_CHAT_LOCATION`, `CSKG_CHAT_PERSON`, `CSKG_CHAT_ROLE`,
   …) win when set; otherwise quick prompts with defaults
   (Chicago / general mode / assistant), each skippable by
   pressing Enter.

## The session

The header carries the situated frame in plain words —
place, season, daypart and time; the role pack in force; and
who is being talked with, or general mode when nobody is.
Under it, the conversation, plus any of:

| Command | What it does |
|---|---|
| `/help` | list the commands |
| `/trace off\|steps\|queries\|full` | show each reply's reasoning at that depth — the trace levels the trace file itself uses |
| `/why` | replay why the last reply was what it was |
| `/role <name>` | switch role pack; applies from your next message, the conversation continues |
| `/person <name>` | talk as someone else: a fresh conversation, their remembered facts loaded |
| `/person none` | back to general mode — nobody is remembered |
| `/quit` | end the session |

Type-ahead is kept: lines typed while setup is still loading
are answered by the prompts in order.

## Not interactive? Not the TUI

With piped stdin, or when `--script` is passed, `tui.mjs`
hands off to the command-line chat (`dist/src/cskg/chat.js`)
untouched — flags and all. Scripted runs and the evaluation
harness use that path; the TUI is the interactive path only.

## Cross-platform

Windows and UNIX alike: paths are built with `path.join`,
child processes are spawned as `node <file>` with argument
arrays (never through a shell), colour is ANSI and only when
the terminal supports it (a TTY, and `NO_COLOR` unset), and
input is Node's readline, which tolerates CRLF line endings.
No external commands are used.
