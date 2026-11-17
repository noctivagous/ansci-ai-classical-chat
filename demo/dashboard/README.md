# AnSci — Capability & Evaluation Dashboard

A single-page React exhibit for the AnSci fork: not a percentage-complete
meter, but the project's three ledgers made browsable — measured
capabilities with their caveats attached, the real fork engine running
live in the browser (parse, meaning graph, checker, derivations), the
steering probe's answers with their turn traces, and a wall of named
failures, two of which demonstrate themselves live.

## Site layout

The site root (`/`) is the zoomable schematic root page — a map of the
whole system with the "Hello" trace. Its source is `root/index.html`
(a self-contained page, no build step); the build copies it to
`dist/index.html`. This dashboard app builds into `dist/dashboard/`
and is served at `/dashboard/`.

Sync loop: the schematic is revised in its Muse artifact first
(fast iteration), then the new revision replaces `root/index.html`,
the site is rebuilt, and the change is pushed.

The engine is imported from `../../src/fork/` — the same TypeScript the
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
