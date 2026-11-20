# AnSci — Capability & Evaluation Dashboard

A single-page React exhibit for the AnSci fork: not a percentage-complete
meter, but the project's three ledgers made browsable — measured
capabilities with their caveats attached, the real fork engine running
live in the browser (parse, meaning graph, checker, derivations), the
steering probe's answers with their turn traces, and a wall of named
failures, two of which demonstrate themselves live.

## Site layout

The site root (`/`) is the zoomable schematic root page — a map of the
whole system whose "A Person Says" box is a working chat. Its source
is `root/index.html` (a self-contained page, no build step); the build
copies it to `dist/index.html`. This dashboard app builds into
`dist/dashboard/` and is served at `/dashboard/`. The map page's
header carries a **Full Chat** button to `/chat/`: a chat-room style
app (source in `chat/`, its own Vite config) with one live engine
session per tab and a settings bar for turn information (trace, walk
path, declines); it builds into `dist/chat/` in the same build.

The root page runs in two modes from one source. The build also emits
`dist/engine.js` (from `src/engine-entry.ts`, via
`vite.engine.config.ts`): the real fork turn loop as a single script.
Served from this build, the page finds it and runs LIVE — every
sentence goes through the code, and the walk drawn on the map is the
turn trace's own mapPath. Where the script is absent (the Muse
artifact preview), the same page walks recorded turns from the real
engine instead, and says so.

Sync loop: the schematic is revised in its Muse artifact first
(fast iteration), then the new revision replaces `root/index.html`,
the site is rebuilt, and the change is pushed. The page's registry
copy is gated against `ai-system/system-map.ts` by
`ai-system/check-page.mjs`: it runs as part of `npm run ai:check`,
first in this package's build (a stale page fails the build), and as
a warning in `npm run dev`.

The deploy is pinned by `wrangler.jsonc`: its assets directory is
`./dist`, so both the root page and the `/dashboard/` subtree are
served. Without it, wrangler auto-detects the assets directory from
the Vite `outDir` (`dist/dashboard`) and serves only the app subtree
— the root page is then built but never uploaded.

The engine is imported from `../../src/ansci/` — the same TypeScript the
test suite and evaluation runners measure. Nothing in the lab is canned.
The disk-backed providers (WordNet extract, FrameNet bundle) are stubbed
in the web build and the page labels them OFF rather than pretending.

## Run locally

```sh
npm install
npm run dev      # develop
npm run build    # static build into dist/
npm run preview  # serve the build
```

## Deploy (static — no server, no environment variables)

The build output is a fully static site (`dist/`), so either platform
works with the same files:

**Cloudflare Pages** — connect the repository, then:
- Production branch: `main`
- Root directory: `demo/dashboard`
- Framework preset: Vite (build command `npm run build`, output `dist`)

**Vercel** — import the repository, then:
- Root Directory: `demo/dashboard`
- Framework Preset: Vite (build/output auto-detected)

The build runs with the whole repository checked out, so the engine
imports from `../../src/` resolve exactly as they do locally.
