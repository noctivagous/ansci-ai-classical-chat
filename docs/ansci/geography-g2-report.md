# Geography G2 — Overpass what's-there (build report)

*Built 2026-11-20 in the track/geography-build worktree on
top of G1 (`10dce99`), under the owner's commission of the
geography design note's slices G1–G3 ("do g1-g3"). The
design note (docs/ansci/geography-design-note.md) governs;
this slice is its §9.2. Nothing is pushed; the work stands
as a local branch commit awaiting the owner's word.*

## What was built

- **The Overpass client** (`src/ansci/overpass-client.ts`) —
  configurable endpoint (OVERPASS_BASE_URL, default the
  public overpass-api.de), identifying User-Agent, injected
  fetch, and the §4.2 honesty: a timeout (configurable,
  30 s default), an HTTP failure, a 429, or the server's
  at-capacity answer all return
  `{ status: "unavailable", reason }`; the client never
  throws across the interface and never fabricates an
  element.
- **Bounded by construction (§9.2's acceptance).** The
  source interface takes a category set, a point and a
  radius — never a raw query. The one template builder
  emits every query from the **category table stated as
  data** (river, lake, school, hospital, park, library,
  museum, station, university — each with its question
  words and its OSM selectors), with the server timeout in
  the query, the radius clamped to 25 km and the element
  limit clamped to 50. An unbounded or untemplated query
  cannot be expressed through the interface.
- **What's-there banking** (geography.ts) — the register
  gains per-place, per-category what's-there sets with
  Overpass provenance and the §2.4 **30-day shelf life**,
  idempotent in the banks' manner; distances are computed
  locally from the returned points when a set is banked
  (a Function's output riding on retrieved points, named
  as computed in the provenance detail). A stale set
  answers nothing and stands as the stale-only decline's
  evidence.
- **The shapes** (`src/ansci/geography-turn.ts`) — the
  geography wrapper on the wikidata/weather division of
  work: what's-near, what's-in and is-there over the
  category table. The anchor is the question's own naming,
  else GeographyAwareness's situated readings (stated
  place, then the configured seat); the place resolves
  through the G1 protocol; the bank's fresh sets answer
  first, and ONE templated union query fetches every
  category the bank lacks. The trace gains a `geography`
  record (turn.ts) in the wikidata record's manner.
- **Absence is the source's, not the world's.** An empty
  set answers "I found no <category> within 10 km of
  <place> in OpenStreetMap's data" — an attested absence
  in the data, never a claim that nothing is there.

## A stated limit: what's-in is a radius, not a boundary

A what's-in question is answered over the same bounded
radius around the place's resolved point as what's-near,
and the reply states the radius and the point's standing
("In Tulsa (within 10 km of its resolved point): …").
True containment — inside the place's boundary polygon,
via Overpass area queries keyed by the boundary relation —
is NOT computed in this slice. The approximation is named
in the wrapper's header and in every what's-in reply's
form; it is not silently passed off as containment.

## The §9.4 declines, at their locations

All six catalogue declines exist in this slice's paths:
**no-place** (GeographyAwareness's gap: no named, stated
or configured place), **place-unresolved**,
**place-ambiguous** (the leaders named), **source-unavailable**
(both at the Nominatim consultation and at Overpass),
**stale-only** (a stale what's-there set the source could
not refresh, and the G1 coordinate form), and
**outside-coverage** (the trace union carries it; this
slice's sources are worldwide, so no G2 path raises it —
the weather chain's coverage decline stands as built in
Slice 8/G1).

## Live acceptance — THE GAP, STATED PLAINLY

The live what's-there answer could **not** be obtained
during this build. The public Overpass instance answered
exactly one small query from this VM (a node query around
Oklahoma City, ~30 s, an empty set) and then returned
HTTP 502 — "This Overpass API server is currently at
capacity. All query workers are busy and the request
queue is full" — for every further query, including the
fixture recordings. A final acceptance run through the
production wrapper (fresh register, live sources, calls
counted) ran the full chain honestly: **1 Nominatim call**
(Oklahoma City resolved and banked), **1 Overpass call**,
which hung past even a 90-second client timeout, whereupon
the wrapper produced exactly the designed outcome — the
**source-unavailable located decline**, nothing banked, no
fabricated answer. The mechanism is verified end-to-end
against fixtures (below); the live Overpass answer itself
remains unverified and is owed a re-run when the instance
has capacity. No further live calls were made after that
run.

**Fixture provenance follows from the gap:** the Overpass
responses under test/fixtures/overpass/ are CONSTRUCTED in
the exact envelope of the one real response received
(its envelope fields are genuine), with elements drawn
from real Oklahoma City geography — they are labelled
constructed in the test file's header, and they are not
recordings. The Nominatim fixtures they combine with ARE
recorded live (G1).

## Draft wordings — OWNER'S TO SETTLE

All what's-there reply forms and decline texts in
geography-turn.ts are drafts flagged in code: the
what's-near/in listing form, the is-there yes/no forms,
the attested-absence form, and the no-place /
place-unresolved / place-ambiguous / source-unavailable /
stale-only replies for these shapes.

## Gates (fresh complete runs, this branch's G2 tree; G1 baseline in brackets)

| Gate | Result |
| --- | --- |
| Full suite | 1383 tests · 1380 pass · 0 fail · 3 skipped [1375 · 1372 · 0 · 3] |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/overpass-client.ts` — the client, the
  category table as data, the template builder, the
  parser, the fixture source.
- `src/ansci/geography-turn.ts` — the geography wrapper:
  detection, the anchor order, the resolution, the
  bank-then-fetch what's-there flow, the declines.
- `src/ansci/geography.ts` — the register's what's-there
  store (bankWhatsThere / whatsThereFor /
  staleWhatsThereFor).
- `src/ansci/turn.ts` — the trace's `geography` record.
- `test/ansci-geography-g2.test.ts` — 8 tests.
- `test/fixtures/overpass/` — two CONSTRUCTED responses
  in the recorded envelope (see the provenance note
  above): rivers and a mixed what's-near set for
  Oklahoma City.
