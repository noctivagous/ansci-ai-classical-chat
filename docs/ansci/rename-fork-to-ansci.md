# Rename: fork → ansci (2026-11-20)

The system has no fork anymore: what lived under `src/fork/` is the
main conversational system, and the name confused. Owner's ruling
(2026-11-20): rename to **ansci**, paths only — nothing removed, no
behaviour change, identifiers and historical prose inventoried below
and deliberately untouched. One atomic commit on
`track/rename-fork-to-ansci`, based on origin/main `5d74ba1`.

## Moves (git mv, history preserved)

| From | To | Files |
|---|---|---|
| `src/fork/` | `src/ansci/` | 66 |
| `docs/fork/` | `docs/ansci/` | 89 |
| `test/fork-*.test.ts`, `test/fork.test.ts` | `test/ansci-*.test.ts`, `test/ansci.test.ts` | 84 |
| `scripts/fork-*.mjs` | `scripts/ansci-*.mjs` | 28 |

`archive-reference/fork/` (51 files) was **not** moved: it is an
archive of the fork era, and renaming an archive would falsify it.

## Targeted replacements (path strings only)

- `src/fork/` → `src/ansci/` — 868 occurrences
- `docs/fork/` → `docs/ansci/` — 205
- `test/fork-` → `test/ansci-` — 81, plus `test/fork.test.ts` — 1
- `scripts/fork-` → `scripts/ansci-` — 98 (incl. 19 in package.json values)
- package.json script keys: all 21 `fork:X` keys → `ansci:X`, and
  `chat:fork` → `chat:ansci` (the brief named `fork:chat`/`chat:fork`;
  the file carries a whole family of `fork:` keys and they were
  renamed as a family — `chat` itself kept)
- `npm run fork:` command citations → `npm run ansci:` — 84, plus the
  `chat:fork` alias citation — 1
- Bare filename citations (no directory prefix): `test/tiers.json`
  entries — 82; `TEST-TIERS.md` tables — 66; test files' own header
  self-citations — 86; scripts' header self-citations — 32
- One segment-constructed path (see surprises)

This sweep covers imports, `ai-system/system-map.ts` currentCode
values, the root page's "Current code" strings, GAPS.md and
TEST-TIERS.md path citations, and the dashboard/chat sources.

## Gates

- typecheck — clean
- full suite — **1258 tests, 1255 pass / 0 fail / 3 skipped**,
  identical totals to the pre-rename baseline on main (tests
  renamed, none lost; test contents changed only in import paths,
  header self-citations and comments)
- ai:check — green (100 nodes; root page carries all 97 percented nodes)
- dashboard build — green
- Closing grep audit: zero live references to `src/fork`, `docs/fork`,
  `scripts/fork`, `test/fork` remain outside `archive-reference/`;
  `test/tiers.json` and `package.json` carry zero `fork` references

## Identifier inventory (NOT renamed in this slice)

- **Identifier:** `buildForkGraph` — 33 occurrences in 15 files
  (defined in `src/graph.ts`; called across src, scripts and demo).
  The only true code identifier carrying the name.
- **Data literals with semantic weight:** the `Provenance` values
  `"fork-curated"` (13 occurrences, 7 files) and `"fork-creative"`
  (13, 9 files) — declared in `src/ansci/classify.ts`, banked into
  ingested records and used by scripts; renaming them is a data
  migration, not a path change. Likewise `domain: "fork"` (3, in
  `entities.ts`/`join.ts`) and `source: "fork-classify"` (2, in
  `join.ts`).
- **Comment prose:** 141 comment lines in code files mention the
  fork; docs and demo copy say "the fork" passim as narrative
  (e.g. the dashboard's "AnSci · the fork" kicker). Dated reports
  under `docs/ansci/` keep their period file names in prose
  (e.g. `fork-anchor.test.ts` in the merge-all record).
- **Natural-language data:** the CSKG bundle and the token
  dictionary contain the English words *fork/forks/forked* — data,
  not names.

## Surprises

1. **A path built from segments:** `scripts/ansci-holdout.mjs`
   wrote its report via `join(root, "docs", "fork", "holdout-run.md")`
   — invisible to every string sweep; found by auditing bare
   `"fork"` literals and fixed to `"ansci"`. It was the only such
   construction in the repo.
2. **Bare filenames:** `test/tiers.json` and the `TEST-TIERS.md`
   tables cite test files without the `test/` prefix, so the
   path sweep passed them by; a filename-level pass was needed.
   `fork-r7.5.test.ts` (a dot inside the name) escaped the first
   regex in both files and was caught on the closing audit.
3. **package.json carried 21 `fork:` script keys**, not the two the
   brief named — renamed as a family (above).
4. Noted, not fixed (out of scope, pre-existing on main): the two
   lack-machinery test files (`ansci-capability-registry.test.ts`,
   `ansci-decline-register-wiring.test.ts`) are absent from
   `test/tiers.json`'s 98 entries — they were equally absent, under
   their old names, before this rename.
