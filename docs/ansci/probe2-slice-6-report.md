# Probe-2 Slice 6 — Weather on the Wikidata pattern (SD4, second half + K1)

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `a093f57` + Slices 1–5
**Commission:** probe-2 diagnostic programme, item 6 (owner "rec", 2026-11-20;
pattern and place chain settled with the Wikidata adapter, 2026-11-19).
**Attribution:** SD4 (system design) — weather had no home: an external
placeholder on the map, no intake, no register, no shape; K1 (knowledge) —
no path from a weather question to a place, and no use of a
conversation-stated place or stated weather fact.

## What was built

Four new modules mirroring the wikidata-* division of work, plus the
synchronous shape in the turn layer:

- **`weather-client.ts`** — the Open-Meteo source. Configurable
  endpoints (`OPEN_METEO_GEOCODING_URL` / `OPEN_METEO_FORECAST_URL`,
  public defaults), no key, polite User-Agent, injected `FetchLike`
  (the Wikidata client's own type). Failures return
  `{status: "unavailable", reason}` — never a throw, never a fabricated
  reading. `FixtureWeatherSource` serves recorded responses through
  the same interface; a request no fixture carries is "unavailable",
  not empty.
- **`weather-bank.ts`** — banked readings with retrieved provenance,
  plus the discipline weather adds: **every reading carries its fetch
  time and a stated shelf life** (`WEATHER_TTL_MINUTES`, default 30).
  `fresh()` is the only read an answer may rest on; a stale reading
  answers nothing. The WMO weather-code table (the source's own
  vocabulary) is stated here as data.
- **`weather.ts`** — the commissioned shapes as surface patterns
  (what/how is the weather, what is the temperature, is it
  raining/snowing — with an optional "in <place>"), the place
  resolution, and reply composition from a reading (plain statement
  of fact carrying its source — "(From Open-Meteo.)" — never
  derivation language).
- **`weather-turn.ts`** — the async wrapper, the Wikidata wrapper's
  sibling: it acts on exactly one synchronous outcome,
  "lookup-needed" — geocode, fetch, bank, re-answer — and replaces
  the reply with a located lookup-unavailable or place-unresolved
  decline when the source cannot complete the lookup.
- **`turn.ts`** — the synchronous shape (`answerWeatherQuestion`,
  `trace.weather`), claimed at the interrogative dispatch before the
  predication routes: (1) the conversation's own stated weather
  answers from the record; (2) place resolution; (3) a fresh banked
  reading answers with its fetch time in the trace; (4) otherwise a
  decline located at the missing reading — the wrapper's trigger.

**Place resolution order** (weather.ts, the owner's chain): the place
the question itself names → the configured place (Place table,
unconfigured as it stands) → a place the conversation stated — the
residence event ("I live in Oklahoma") or the record's own location
graph ("I am in Oklahoma" writes no event; its turn object carries
the speaker's location edge, and the record is read where it stands)
→ no place: the reply names the place gap.

## Two findings inside the build

1. **The question's own residue is not stated weather.** A question
   turn registers a state for its own predication — holder 'weather',
   lemma 'what', the question word in the value slot. Reading the
   record naively answered "You said the weather is what." — the
   second transcript's vacuous completion by the record route. The
   record read (`statedWeather`) therefore takes only states from
   turns before the asking and never a question-word lemma: a stated
   quality is content; a question's unfilled slot is not a statement.
2. **The forecast endpoint rate-limits this egress IP.** Open-Meteo
   was verified reachable from this VM: the geocoding endpoint
   answered live from curl and from Node (HTTP 200; the live
   wrapper's geocode step succeeded), and the forecast endpoint
   answered live when the fixtures were recorded. It then began
   returning **HTTP 429** for this IP (curl and Node alike). Per the
   standing rule for 429s, live forecast calls stopped there. The
   full fetch→bank→answer flow is verified against the recorded live
   fixtures; the 429 path is verified live — the wrapper produced
   the located lookup-unavailable decline on the real 429, twice.
   A later live re-run needs no code change.

## Acceptance — W1–W7 + S2, each on its specified path

| Probe | Path |
| --- | --- |
| W1 "what is the weather?" | place-gap: "I don't know where you are, so I can't say what the weather is like there." |
| W2 "What is the weather now?" | the weather path (place-gap) — no 'now' misfire |
| W3 "how is the weather?" | the weather path (place-gap) |
| W4 "…in oklahoma?" | place from the question → lookup-needed; through the wrapper: answered from the fetched reading |
| W5 "is it raining?" | place-gap for that shape; with a banked reading: "No — it is not raining in Oklahoma City…" |
| W6 "i am in oklahoma." → ask | the stated place changes the answer: lookup-needed for Oklahoma (record graph); the "i live in…" event form likewise |
| W7 "what is the temperature?" | the weather shape (place-gap); with a reading: "In Oklahoma City… it is 11.5°C." |
| S2 "the weather is cold." → ask | answered from the record: "You said the weather is cold." — the stated fact is used, never contradicted |

Shelf life, pinned by test: a repeat asking inside the TTL answers
from the bank (new session, synchronous turn, fetch time in the
trace, no fetch); a banked reading past its TTL is never spoken as
current — the turn goes lookup-needed and the wrapper refetches.

## Draft wordings — OWNER'S TO SETTLE

All visitor-facing texts of this slice are hand-composed drafts,
flagged in code: the place-gap reply, the lookup-needed decline, the
record answer ("You said the weather is …"), the wrapper's
lookup-unavailable and place-unresolved declines, and the reading
composition's form ("In <resolved place> it is <t>°C and
<condition>. (From Open-Meteo.)"). One honesty note inside the form:
a state name geocodes to its capital's point, so the reply names the
resolved point (Oklahoma City, Oklahoma, United States), not the
whole state.

## Pin bookkeeping

Slice 4's weather-ownership pin and W2 assertion, and Slice 2's
"weather now" Family V pin, recorded replies this slice was
commissioned to replace; updated with supersessions recorded.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1318 tests / 1315 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/weather.ts`, `src/ansci/weather-bank.ts`,
  `src/ansci/weather-client.ts`, `src/ansci/weather-turn.ts` — new.
- `src/ansci/turn.ts` — the synchronous shape + `trace.weather`.
- `test/ansci-probe2-slice6.test.ts` — 19 tests (W1–W7, S2, the
  residue guard, client parsers on the recorded fixtures, the
  wrapper's fetch/bank/shelf-life/unavailable/unresolved paths).
- `test/fixtures/open-meteo-geocode-oklahoma.json`,
  `test/fixtures/open-meteo-forecast-oklahoma-city.json` — live
  responses recorded from this VM, 2026-11-20.
- `test/ansci-probe2-slice2.test.ts`, `test/ansci-probe2-slice4.test.ts`
  — pins updated under the recorded supersessions.
