# Geography G1 — the pair, the register, Nominatim (build report)

*Built 2026-11-20 in the track/geography-build worktree from
track/probe2-fixes `a29de53` (the probe-2 programme plus
Slices 7/8 and the Slice 7 amendment), under the owner's
commission of the geography design note's slices G1–G3
("do g1-g3"). The design note
(docs/ansci/geography-design-note.md) governs; this slice is
its §9.1. Nothing is pushed; the work stands as a local
branch commit awaiting the owner's word, like every push.*

## What was built

- **The place register** (`src/ansci/geography.ts`) —
  GeographyKnowledgeUnit's store: one record per resolved
  place, each fact (names, kind, coordinates, containment)
  carrying its own retrieved/configured provenance and its
  own shelf life from the note's §2.4 table, stated as data
  (coordinates 365d, containment 182d, kind/names 365d,
  what's-there 30d, route 7d). Banking is idempotent in the
  banks' manner; a fresh fact re-banked changes nothing, a
  stale fact is refreshed by re-banking, and a stale fact is
  never served as fresh. Process-level, like the banks (the
  owner's persistence default for this build, §10).
- **The resolution protocol** (`resolvePlace`, same file) —
  the §2.3 order as the unit's standing policy: register
  (fresh) → the Wikidata bank **imported on read** (§8's
  recommended P625 custody: the register entry's provenance
  names the bank as immediate source, the bank's SourceRecord
  behind it; a coordinateless banked record imports as the
  §3.6 incomplete case and the declines say so) → the
  Nominatim consultation. Staleness falls through to
  consultation; a stale-only holding whose re-consultation
  fails returns `stale-only`, never the stale point.
- **The Nominatim client** (`src/ansci/geography-client.ts`)
  — configurable endpoint (NOMINATIM_BASE_URL), the
  identifying User-Agent the usage policy requires, injected
  fetch, `{status:"unavailable"}` honesty, and the **1
  request/second rate enforced in code**: a shared
  RateThrottle serialises request starts, proven on a fake
  clock in the tests. Search and reverse both implemented
  and parser-pinned on recorded responses.
- **Ambiguity (§6)** — a consultation's candidates are
  disciplined before ranking by two stated rules mirroring
  the intake's honesty: **exact name** (when a candidate's
  name IS the asked name, only those are eligible — the
  Wikidata intake's exact-label rule; "Oklahoma" is the
  state, not its county) and **one place, one candidate**
  (same-name candidates within 25 km collapse to the
  highest-importance one — Nominatim returns a settlement
  twice, point and boundary; duplicates are not namesakes).
  The eligible set goes to the entity ranker with the
  situated place in context; **proximity is now a fourth
  ranker signal** (entity-rank.ts: +2 at the situated place
  decaying linearly to 0 at 2000 km, an auditable breakdown
  line showing the distance; inert for every pre-geography
  caller). A margin under **RANK_MARGIN (0.25)** — a quarter
  of the smallest evidence quantum, calibrated on the
  recorded Springfield set (exact tie at the top without a
  situated place; 0.44 points of stated distance with one)
  — is an unresolved tie: `ambiguous`, nothing banked,
  nothing picked.
- **GeographyAwareness** (`src/ansci/geography-awareness.ts`)
  — the situated home: a session register beside the Social
  Unit's (session.ts; the frame stays a time record, §8).
  The **configured seat** is the Place table read through
  the unit (place.ts's custody moved, its data and honesty
  unchanged); the **interlocutor's stated place** is read
  from the conversation record by the reading weather.ts
  grew privately in Slice 6, generalised and moved here —
  weather.ts's `resolveWeatherPlace` now delegates to it,
  outcomes unchanged. Shifts are recorded, not overwritten.
  The Social Unit's **self-location route re-points**:
  social.ts's `requestPlace()` now asks GeographyAwareness;
  the "where are you?" answer is byte-identical (pinned).
- **The weather chain lifted into the pair**
  (weather-turn.ts): the wrapper's private held-coordinates
  logic is gone. On lookup-needed it banks the configured
  seat's coordinates (when the place in force is the seat)
  as a configured-provenance register fact, then runs
  `resolvePlace` with the session's situated place as
  ranking evidence, and addresses weather.gov by the
  resolved point as before. New located declines join the
  trace's weather actions: **place-ambiguous** (namesakes
  unseparated — the reply names the leaders) and
  **stale-only**; coordinates-missing now stands after
  register + import + consultation all miss, its wording
  unchanged. The W family re-runs green (below).

## Found on the acceptance path, and fixed here

The live run exposed two latent faults in Slice 8's weather
client, both recorded here rather than silently absorbed:

1. **One station is not a witness set.** The client took
   the station list's first entry only. For the Oklahoma
   state point, the nearest station (KPVJ) 404s its latest
   observation outright. The client now walks the nearest
   stations in order (bounded at **MAX_STATION_ATTEMPTS =
   8**) until one serves a usable reading, and its failure
   names how many were tried.
2. **An empty textDescription is served inconsistently by
   the service itself.** The same KOUN report (19:45Z,
   "Partly Cloudy") was served with an empty
   textDescription on some requests and with its words on
   others — verified directly in both of the API's
   representations, so it is not a representation effect.
   A station serving an empty description is treated as
   serving no usable reading, and the walk continues —
   which is what the bound of 8 covers (the observed
   cluster: one 404, two empty descriptions, the fourth
   station complete).

## Live acceptance (2026-11-20, this VM, calls counted at the HTTP level)

Driver: fresh process, fresh register, EMPTY Wikidata
bank — the place established only by the statement
"i am in oklahoma.", then "what is the weather?" through
the weather wrapper with live sources:

1. **Nominatim: exactly 1 HTTP call.** "Oklahoma" resolved
   unopposed (the exact-name rule leaves the state alone in
   the eligible set); coordinates **34.9550817, -97.2684063**
   banked in the register with retrieved provenance
   (dataset openstreetmap-nominatim, uri
   relation/333152606).
2. **weather.gov: 4 HTTP calls** (points, stations, KPVJ's
   404, KOUN's observation) — answered from KOUN's
   19:45Z report: **"In Purcell, OK it is 21°C and partly
   cloudy. (From the National Weather Service.)"** — the
   reply names Purcell, the resolved point's nearest city,
   not the whole state: the state name resolves to a point
   and the reading is that point's, as the register's
   `standsFor` records.
3. **The repeat** (fresh session, same process): answered
   from the weather bank, **zero new HTTP calls of either
   kind** — the register served the coordinates and the
   bank served the reading.

## The ranker's precondition, stated plainly (§6, §9.1)

G1 consumes the entity ranker for live resolution. The
ranker's own evaluation remains **incomplete** (its fixture
recording was interrupted by a provider 429; on the two
recorded contexts it ranked 2/2 — no accuracy claim), and
this slice does not complete it. What G1 adds is narrower
and separately evidenced: the proximity signal is pinned by
unit tests, and the recorded Nominatim sets behave as the
design requires (Springfield ambiguous without a situated
place, resolved to the centred one with it; Oklahoma
unopposed). Trusting the ranker beyond that awaits its
evaluation, as the note says.

## Draft wordings — OWNER'S TO SETTLE

New visitor-facing texts, all flagged in code: the
place-ambiguous reply ("More than one place is called
<place> — <leaders> — and I can't tell which one you mean,
so I have no reading for it."); the stale-only reply ("The
only coordinates I hold for <place> are out of date, and I
couldn't refresh them, so I have no reading for it."). The
coordinates-missing and lookup-unavailable wordings are
Slice 8's/6's, unchanged.

## Pin bookkeeping

Slice 6/8 wrapper tests inject a fresh register and a
no-hit geography source under recorded supersessions in
their headers; the pins' substance stands (the bank-import
trace now names the import-on-read; the incomplete Oklahoma
City decline's detail names the §3.6 case as before; the
Texas pin's consultation now runs and resolves nothing,
and the weather source is still never consulted without a
point). No synchronous-shape pin moved.

## Gates (fresh complete runs, this branch; baseline at a29de53 in brackets)

| Gate | Result |
| --- | --- |
| Full suite | 1375 tests · 1372 pass · 0 fail · 3 skipped [1351 · 1348 · 0 · 3] |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/geography.ts` — the register, shelf lives,
  import-on-read, candidate discipline, resolvePlace.
- `src/ansci/geography-client.ts` — the Nominatim client,
  the rate throttle, the fixture source, the ranker mapping.
- `src/ansci/geography-awareness.ts` — the situated
  register's types and readings; the stated-place read.
- `src/ansci/entity-rank.ts` — the proximity signal and
  haversineKm (inert without situated context).
- `src/ansci/session.ts` — the `geography` session register.
- `src/ansci/weather.ts` — resolveWeatherPlace delegates to
  GeographyAwareness (outcomes unchanged).
- `src/ansci/weather-turn.ts` — the geography resolution in
  place of held-coordinates; the two new declines.
- `src/ansci/weather-client.ts` — the station walk
  (parseStationIds, MAX_STATION_ATTEMPTS).
- `src/ansci/social.ts`, `src/ansci/place.ts` — the
  self-location route re-pointed; the seat's custody
  recorded.
- `src/ansci/turn.ts` — the weather trace action union
  gains place-ambiguous and stale-only.
- `test/ansci-geography-g1.test.ts` — 24 tests.
- `test/ansci-probe2-slice6.test.ts`,
  `test/ansci-probe2-slice8.test.ts` — geography injections
  under recorded supersessions.
- `test/fixtures/nominatim/` — six responses recorded live
  (searches: Oklahoma, Oklahoma City, Springfield, Tulsa,
  a no-hit; one reverse), 2026-11-20.
- `test/fixtures/nws-points-oklahoma-city.json`,
  `nws-stations-oun-97-94.json`,
  `nws-observation-kokc-latest.json` — the Oklahoma City
  point's NWS responses, recorded live, 2026-11-20.
