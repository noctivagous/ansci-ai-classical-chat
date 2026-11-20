# Probe-2 Slice 8 — Weather source re-pointed to api.weather.gov

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `a093f57` + Slices 1–7
**Commission:** the owner's suggestion (2026-11-20) of
https://github.com/weather-gov/api — the US National Weather
Service API — as the weather source, after Slice 6's source
(Open-Meteo) rate-limited this egress IP mid-slice and left
live end-to-end weather unverified.
**Attribution:** SD4's remaining half — the adapter existed
but its live source could not complete a lookup from this
machine; the slice changes the source, the coordinate path
the new source's shape forces, and nothing else about the
weather programme's design (place first, bank before fetch,
readings expire).

## What changed

- **`weather-client.ts`** — rewritten as the api.weather.gov
  client, same discipline (configurable base URL —
  `WEATHER_GOV_BASE_URL`; injected fetch; failures return
  `{status:"unavailable", reason}`, never a throw, never a
  fabricated reading). No key; every request carries the
  descriptive User-Agent the service requires, identifying
  the application and the project contact
  (noct@muse.ai). The flow is the service's own:
  `GET /points/{lat,lon}` → the observation-stations URL
  and the relative location; `GET <stations>` → the
  nearest station; `GET /stations/{id}/observations/latest`
  → the current conditions. Current conditions come from
  the station OBSERVATION, not the grid forecast, by a
  stated choice: the shapes ask what the weather IS, the
  observation is measured rather than predicted, and its
  temperature is natively Celsius (a Fahrenheit report, if
  one ever arrives, is converted in the parser). The whole
  pipeline runs over a minimal JSON transport, so the
  fixture source serves the recorded responses BY URL
  through the same code the live source runs.
- **Coordinates, never guessed.** The new source reads
  weather for a point and offers no geocoding; Slice 6's
  geocode step is GONE, and no geocoding is kept anywhere.
  The wrapper (`weather-turn.ts`) resolves a resolved
  place's coordinates from what the system holds, in
  order: (1) the Place table's configuration, when the
  resolved place is the configured place and coordinates
  were configured with it — `place.ts`'s table gains
  optional `latitude`/`longitude` fields for this, unset
  as the place itself is unset; (2) the Wikidata bank's
  record for the place — the P625 coordinates banked as
  properties at translation time. A place with neither
  declines located at the missing coordinates (new trace
  action `coordinates-missing`, replacing
  `place-unresolved`, which died with the geocoding step);
  a banked record without coordinates is the §3.6
  incomplete case and supplies none (pinned: "Oklahoma
  City" is banked by the recorded fixture and holds no
  P625).
- **Coverage is a located decline, not a fallback.** The
  service covers the United States; a point outside it
  gets the points lookup's 404 ("Data Unavailable For
  Requested Point"), which the client returns as a
  distinct `{status:"out-of-coverage"}` and the wrapper
  renders as the coverage decline (new trace action
  `source-coverage`). No other source is consulted in its
  place.
- **`weather-bank.ts`** — the reading's shape follows the
  source: `weatherCode` (WMO) is gone; the reading carries
  the condition in the source's own words (the station's
  textDescription, lowercased at banking) and the
  raining/snowing facts determined at banking by a phrase
  table stated as data (rain/snow word families of the
  textDescription vocabulary), plus the station's measured
  precipitation where reported — precipitation makes it
  raining unless the words say snow (gauges report snow's
  liquid equivalent too). `source` is now
  "api.weather.gov". Fetch time and the 30-minute shelf
  life are unchanged, as is the freshness discipline.
- **`weather.ts`** — reply composition reads the reading's
  own flags and words; the source note is now "(From the
  National Weather Service.)".

## The W family, re-run (Slice 6's acceptance, this source)

| Probe | Path |
| --- | --- |
| W1 "what is the weather?" | place-gap — unchanged |
| W2 "What is the weather now?" | the weather path (place-gap) — unchanged |
| W3 "how is the weather?" | the weather path (place-gap) — unchanged |
| W4 "…in oklahoma?" | place from the question → lookup-needed; through the wrapper: coordinates from the banked record (35.5, -98), fetched, answered |
| W5 "is it raining?" | place-gap for that shape; with a banked reading: "No — it is not raining in El Reno, OK: mostly clear and windy, 21°C. (From the National Weather Service.)" (fixture reading) |
| W6 stated place | both forms (record graph, residence event) → lookup-needed for Oklahoma; the wrapper answers from the banked coordinates |
| W7 "what is the temperature?" | the weather shape (place-gap); with a reading: "In El Reno, OK it is 21°C. (From the National Weather Service.)" (fixture reading) |
| S2 stated weather | answered from the record — unchanged |

The resolved name is the point lookup's nearest city: the
banked state point (35.5, -98) resolves to **El Reno, OK**,
and the reply names El Reno — the reading is that point's,
not the whole state's, exactly the honesty Slice 6's note
required (its geocoder named the capital's point; this
source names the nearest city to the point it was given).

## Live acceptance — the point of the slice (2026-11-20, this VM)

One run of a driver against the branch build, all fetches
counted at the HTTP level:

1. **Banking, live**: "Where is Oklahoma?" through the
   Wikidata wrapper fetched and banked Oklahoma LIVE
   (Q1649; P625 properties 35.5, -98) — no rate limit was
   met anywhere in this run.
2. **Weather, live end-to-end**: with "i am in oklahoma."
   stated, "what is the weather?" at 2026-11-20T20:37:03Z
   made exactly **3 HTTP requests** —
   `/points/35.5000,-98.0000`, `/gridpoints/OUN/80,95/stations`,
   `/stations/KPWA/observations/latest` — and answered from
   station KPWA's observation reported 2026-11-20T20:10:00Z:
   **"In El Reno, OK it is 21°C and partly cloudy. (From the
   National Weather Service.)"** The reading banked with
   fetchedAt 2026-11-20T20:37:03.698Z and shelf life 30
   minutes (expires 21:07:03.698Z), provenance
   api.weather.gov, retrievedFrom "live", the trace naming
   the banked Q1649 record the coordinates came from.
3. **The bank serves the repeats**: "is it raining?" in
   the same session — "No — it is not raining in El Reno,
   OK: partly cloudy, 21°C. …" — answered-from-bank, **0
   additional HTTP calls**; a fresh session's repeat
   "what is the weather?" likewise answered-from-bank, 0
   calls.
4. **Coverage, live**: the client's lookup for Sydney's
   banked point (-33.87, 151.21) returned out-of-coverage
   on the service's real 404 (one further request; four in
   the run's total).

The gated tests run on fixtures recorded live from this VM
the same day (the points/stations/observation bodies for
the banked point — KPWA's 20:00Z report, "Mostly Clear and
Windy", where the acceptance run read the 20:10Z report,
"Partly Cloudy": the station's next report, not a
discrepancy — and the Sydney points 404 for exactly the
banked coordinates).

## Draft wordings — OWNER'S TO SETTLE

New or changed visitor-facing texts, all flagged in code:
the source note "(From the National Weather Service.)";
the coordinates-missing reply ("I have no coordinates for
<place> in what I hold, and my weather source reads
weather for a point, so I have no reading for it."); the
coverage reply ("My weather source covers the United
States, and <place> is outside it, so I have no reading
for it."). Slice 6's lookup-unavailable wording is carried
unchanged.

## Open question, recorded not decided

Whether Open-Meteo (or any second source) should remain
as a fallback for places outside the United States is NOT
decided, and no fallback was built: a non-US place
declines at the coverage, full stop. The Open-Meteo client
code is removed, not kept dormant; its two recorded
fixtures (`open-meteo-geocode-oklahoma.json`,
`open-meteo-forecast-oklahoma-city.json`) remain in
`test/fixtures/` unreferenced — Slice 6's record, left in
place.

## Pin bookkeeping

Slice 6's test file was reworked where the swap
legitimately changes it (recorded in its header): the
client-contract tests now pin the NWS parsers on the new
fixtures; the wrapper tests inject the banked-coordinate
Wikidata bank; the counting assertion counts one
`currentConditions` call (the pipeline's three HTTP
requests are counted separately in Slice 8's tests); the
place-unresolved test is replaced by the
coordinates-missing outcome; BANKED_REPLY and the
bank-read replies carry the new resolved name, reading
and source note. The synchronous W1–W7/S2 tests are
untouched.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1349 tests · 1346 pass · 0 fail · 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/weather-client.ts` — rewritten: the
  api.weather.gov client (points → stations → latest
  observation), parsers, the URL-keyed fixture source.
- `src/ansci/weather-turn.ts` — the wrapper: held
  coordinates (Place table → Wikidata bank), the
  coordinates-missing and source-coverage declines.
- `src/ansci/weather-bank.ts` — the reading's new shape
  (condition words + raining/snowing, no WMO code), the
  NWS phrase table.
- `src/ansci/weather.ts` — composition from the reading's
  flags; the new source note.
- `src/ansci/place.ts` — the Place table's optional
  configured coordinates (unset as it stands).
- `src/ansci/turn.ts` — the trace action union:
  `place-unresolved` out, `coordinates-missing` and
  `source-coverage` in.
- `test/ansci-probe2-slice8.test.ts` — 11 tests (parsers,
  the phrase table, the coordinate discipline incl. the
  incomplete banked record and the no-consult proof, the
  configured-place path, coverage, HTTP-level fetch
  accounting).
- `test/ansci-probe2-slice6.test.ts` — reworked client/
  wrapper sections under the recorded supersession.
- `test/fixtures/nws-points-oklahoma.json`,
  `nws-stations-oun-80-95.json`,
  `nws-observation-kpwa-latest.json`,
  `nws-points-sydney-404.json` — live responses recorded
  from this VM, 2026-11-20.
