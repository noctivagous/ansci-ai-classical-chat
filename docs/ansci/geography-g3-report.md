# Geography G3 — OSRM how-far, as computation (build report)

*Built 2026-11-20 in the track/geography-build worktree on
top of G2 (`772909f`), under the owner's commission of the
geography design note's slices G1–G3 ("do g1-g3"). The
design note (docs/ansci/geography-design-note.md) governs;
this slice is its §9.3. Nothing is pushed; the work stands
as a local branch commit awaiting the owner's word.*

## What was built

- **The OSRM client** (`src/ansci/osrm-client.ts`) —
  configurable endpoint (OSRM_BASE_URL, default the
  FOSSGIS routing server routing.openstreetmap.de — its
  route path form is /routed-car/route/v1/driving/…, a
  form the first live probe established against the
  server's InvalidUrl answer), identifying User-Agent,
  injected fetch, request starts throttled to one per
  second through the G1 RateThrottle, and the consultation
  discipline: any failure returns
  `{ status: "unavailable", reason }`, never a throw and
  never a zero route. The route URL is built in exactly
  one place (longitude first — the classic silent-error
  site) and pinned by the tests.
- **How-far as computation** (`answerHowFar` in
  geography-turn.ts) — the shapes "how far is X from Y?",
  "how far is it from X to Y?" and the drive-time forms
  ("how long does it take to drive from X to Y?"). Both
  endpoints resolve through the G1 register protocol
  (a deictic end — "from here" — is supplied by
  GeographyAwareness's situated readings); the road figure
  is OSRM's computation over the two resolved points; the
  straight line is computed locally from the same points.
  **The derivation is the trace's content**: the geography
  record's detail carries both resolved points with their
  standings and resolution routes, the straight-line
  figure, the raw OSRM quantities (metres/seconds), the
  fetch time and the banked expiry. The answer is never
  presented as testimony — the reply itself names the
  computation ("Road distance and time computed by OSRM
  from the two resolved points").
- **Routes banked as derived facts** (geography.ts) —
  PlaceProvenance gains the **derived** kind (§3.5/§4.3:
  a computed fact cites its inputs' provenance and carries
  none of its own). A banked route records the two points,
  the raw road quantities, the straight line, and a
  derived provenance naming both endpoints' resolution
  routes as inputs, at the §2.4 **7-day shelf life** — the
  owner's standing default for this build (routes banked,
  §10). A fresh banked route answers without
  recomputation; direction matters (the reverse is a
  separate computation).
- **The straight line always answers (§9.3).** With the
  routing source unavailable, the answer is the
  straight-line figure alone (new trace action
  `computed-straight-line`), and the reply names the road
  figure it could not compute — a partial answer with the
  gap stated, not a decline and not a silent substitution.

## Found on the build path, and fixed here

**The stated-place reading truncated multi-word places.**
"i am in oklahoma city." entered the conversation record
with the location target as the head node "city" and
"oklahoma" as a qualifies edge into it; G1's reading took
the head alone, so the situated place stood as "city" —
and a deictic how-far ("how far is tulsa from here?") went
looking for a place called City. The reading
(geography-awareness.ts) now composes the full name from
the target's qualifiers in node order. Single-word places
are unaffected (every G1/G2 pin stands), and the fix
equally repairs the weather chain's stated-place reading
for multi-word places, which had the same truncation.

## Live acceptance (2026-11-20, this VM, calls counted at the HTTP level)

Driver: fresh process, fresh register, EMPTY Wikidata
bank, live sources — "how far is tulsa from oklahoma
city?":

1. **Nominatim: exactly 2 calls** (one per endpoint, the
   throttle spacing them): Oklahoma City resolved to
   35.4729886, -97.5170536 (relation/330717649) and Tulsa
   to 36.1563122, -95.9927516 (relation/336186759), both
   banked with retrieved provenance.
2. **OSRM: exactly 1 call** — 171260.1 m / 6794.7 s,
   banked at the 7-day shelf life under derived
   provenance.
3. **Reply:** "Tulsa is about 106 road-miles from Oklahoma
   City (about 1 h 53 min by road); as the crow flies,
   about 98 miles. (Road distance and time computed by
   OSRM from the two resolved points.)" — the trace's
   detail carries the full derivation (both points, both
   resolution routes, the 157.05 km straight line, the raw
   quantities, the fetch time 2026-11-20T22:00:18Z).
4. **The repeat** (fresh session, same process):
   answered-from-bank, identical reply, **zero new calls
   of either kind**.

The gated tests run on the same response recorded live
(test/fixtures/osrm-route-oklahoma-city-tulsa.json).

## The §9.4 declines, at their locations

How-far raises them per endpoint, and the trace's detail
names which end failed: **no-place** (a deictic end no
situated reading supplies), **place-unresolved**,
**place-ambiguous**, **source-unavailable** and
**stale-only** — each at the failing endpoint.
Outside-coverage has no how-far path (the routing source
is worldwide); it stands in the weather chain as built.

## Draft wordings — OWNER'S TO SETTLE

The how-far reply form (road-miles and duration, the
crow-flies figure, the computation note), the
straight-line-only form, and the per-endpoint decline
texts in geography-turn.ts are drafts flagged in code.
Units are the note's §5.3 example's (road-miles); the raw
quantities ride in the trace in metres/seconds.

## Gates (fresh complete runs, this branch; G2 baseline in brackets)

| Gate | Result |
| --- | --- |
| Full suite | 1390 tests · 1387 pass · 0 fail · 3 skipped [1383 · 1380 · 0 · 3] |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/osrm-client.ts` — the OSRM client, the route
  URL builder, the parser, the fixture source.
- `src/ansci/geography-turn.ts` — the how-far detection
  and answerHowFar: endpoint resolution, the computation,
  the banking, the per-endpoint declines.
- `src/ansci/geography.ts` — the derived provenance kind;
  the register's route store (bankRoute / routeFor).
- `src/ansci/geography-awareness.ts` — the stated-place
  reading composes qualifier + head (the fix above).
- `src/ansci/turn.ts` — the geography trace action union
  gains computed-straight-line.
- `test/ansci-geography-g3.test.ts` — 7 tests.
- `test/fixtures/osrm-route-oklahoma-city-tulsa.json` —
  the OSRM response recorded live, 2026-11-20.
