# Data — what ships, what installs

The repo is turnkey as far as possible: a fresh clone works whole.
Every data resource the system reads at runtime ships in the repo,
trimmed to what the system uses, with its license in NOTICE. The
things that genuinely must be installed are named below, with their
route. Sizes are bytes, measured 2026-11-17.

## Ships in the repo

| Resource | Where | Size | License | Regeneration route |
| :--- | :--- | ---: | :--- | :--- |
| WordNet extract (Open English WordNet 2024, trimmed) | `data/wordnet/extract/` | 20,042,544 | CC BY 4.0 (Princeton WordNet license beneath) | Download `english-wordnet-2024.zip` from en-word.net into `data/raw/`, run `scripts/import-wordnet.py` |
| FrameNet bundle (Release 1.5, frames + relations) | `data/framenet/` | 2,191,753 | CC BY 3.0 | `python3 scripts/import-framenet.py` (downloads from the NLTK mirror; also run by `scripts/install.mjs`) |
| VerbNet table (3.3, classes + frames reduced to argument shapes) | `data/verbnet/` | 337,502 | VerbNet 3.0 License (permissive, notice) | Download `verbnet-3.3.tar.gz` from verbs.colorado.edu into `data/raw/`, run `scripts/import-verbnet.py` |
| qualreas relation algebras (RCC-8, Allen, point) | `data/qualreas/` | 7,218 | MIT | `scripts/import-qualreas.py` from github.com/alreich/qualreas |
| QUDT units subset | `data/qudt/` | 4,110 | CC BY 4.0 | `scripts/import-qudt.py` from github.com/qudt/qudt-public-repo |
| CSKG trimmed bundle (80,466 edges of 6,001,531) | `data/cskg/` | 4,570,217 | CC BY-SA 4.0 — ShareAlike on the bundle data | `node scripts/build-cskg-bundle.mjs` (or `npm run fork:build-cskg-bundle`) — re-trims from the full extract (below) by the feeder's own rules; verified byte-identical against the shipped bundle 2026-11-18 |
| Suwen （素問） ingest sources, ch. 4 + 5, with provenance records | `data/ingest/` | 11,616 | Classical text (public domain); Wikisource edition, provenance in `*.source.json` | Consumed by `scripts/fork-ingest-suwen*.mjs` |
| Banked assertions (ingested stores, generated) | `src/fork/ingested.ts` | 141,095 | AnSci work product from the sources above | `scripts/fork-ingest-*.mjs` over `data/ingest/` |
| Token dictionary (top-12,000 frequency list) | `ai-system/lpu/parser/token/token-dictionary.txt` | 198,492 | Derived from SymSpell's frequency dictionary (MIT) | `ai-system/lpu/parser/token/build-dictionary.mjs` |
| FrameNet test fixture (small subset for tests) | `test/fixtures/framenet/` | 10,198 | CC BY 3.0 | Ships with the tests |

## Installs — local only, gitignored, never shipped

| Resource | Where | Size | License | Install route |
| :--- | :--- | ---: | :--- | :--- |
| CSKG full extract (`cskg.tsv.gz`) | `data/raw/cskg/` | 112,312,195 | CC BY-SA 4.0 | `node scripts/install.mjs` — downloads from Zenodo record 4331372 and verifies size. Needed only to re-trim the bundle or to run the classical `src/cskg/` spike at full scale; the fork feeder runs on the shipped bundle without it |
| Importers' raw downloads (the shipped artefacts' sources) | `data/raw/` subdirs | 126,758,403 total | Per resource, above | Each `scripts/import-*.py` names its source; needed only to regenerate a shipped artefact |
| Experience memory | `data/experience/` | runtime | The user's own conversation data | None — created by running the system; local-first by design |
| Person files | `data/people/` | runtime | The user's own data | None — local-first by design |

Notes on the CSKG extract directory: a local install may also hold
`cskg_star.tsv.gz` (116,790,686) and a loader-built index
(`cskg.tsv.gz.index.bin`, 178,879,415). Neither is required by the
fork feeder, and `scripts/install.mjs` does not download the star
file.

## Gaps

- None open. The last one — CSKG bundle regeneration having no
  committed script — closed 2026-11-18: the bundle was produced by
  a one-off measurement run (Run 2, 2026-11-17) whose staged
  procedure (relation filter, English/source rules, the feeder's
  own `mapTriple` as the endpoint stage) is now committed as
  `scripts/build-cskg-bundle.mjs`, calling the feeder's compiled
  code rather than reimplementing it. Its first run against the
  installed extract reproduced the shipped bundle byte-identically
  (sha256 match; manifest counts equal), so every shipped artefact
  above now has a committed regeneration route under `scripts/`.
