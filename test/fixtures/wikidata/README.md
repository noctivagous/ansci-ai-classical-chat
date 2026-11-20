# Wikidata fixtures — provenance

Recorded live from `https://www.wikidata.org/w/api.php`
(`action=wbgetentities`, `props=labels|claims|sitelinks`,
`languages=en`) on 2026-11-19, then trimmed: each main item keeps
the statements the W1 tests exercise (one statement per kept
property) and each referenced item keeps only its English label,
so the files stay small while keeping the API's exact response
shape. The search fixture is an untrimmed `wbsearchentities`
response for "Oklahoma" (limit 3).

- `oklahoma-wbgetentities.json` — Q1649 Oklahoma (Q5215 in an early
  brief was wrong: Q5215 is "glossary of philosophy"; Q1649 is
  verified by the search fixture's first hit) + Q34863 Oklahoma
  City, Q30 United States, Q35657 U.S. state, Q578170 contiguous
  United States, Q1860 English.
- `texas-wbgetentities.json` — Q1439 Texas + Q16559 Austin, Q30,
  Q35657, Q578170.
- `mercury-wbgetentities.json` — Q308 Mercury (the non-place item;
  also the ambiguous join case: WordNet carries four noun synsets
  for "mercury") + Q7879772 inner Solar System, Q3504248 inner
  planet of the Solar System, Q3901935 inferior planet.
- `oklahoma-wbsearchentities.json` — search hits for "Oklahoma".
- `texas-wbsearchentities.json` — search hits for "Texas",
  recorded live 2026-11-19 for slice W2 (limit 3, untrimmed).
  Note its second hit: Q916484, a Scottish band also labelled
  "Texas" — the reason W2's resolution takes the FIRST
  exact-label hit in search rank, gated by the join proposal.
- `mercury-wbsearchentities.json` — search hits for "Mercury",
  recorded live 2026-11-19 for slice W2 (limit 3, untrimmed);
  the planet Q308 is not among the first hits at all, which is
  itself part of the recorded picture.

Tests must never touch the network (§2.2); these fixtures are the
only Wikidata data the gated suite reads.

## Hand-shaped fixtures (NOT live-recorded)

- `sydney-wbgetentities.json` — Q3130 Sydney, **HAND-SHAPED for
  slice W3 (2026-11-19)**: written by hand in the exact
  wbgetentities response shape the live-recorded fixtures above
  keep (same trimming: the main item keeps one statement per
  exercised property — P625 coordinates −33.87, 151.21; P17
  country Q408 Australia; P131 located in Q3224 New South
  Wales; P31 instance of Q515 city — and referenced items keep
  only their English labels). It was NOT recorded from
  wikidata.org: W2's live acceptance met HTTP 429 from
  wikidata.org, a hard stop for that provider in this
  programme, so no live call was made for W3. The coordinates
  are the ones the design's SA-DECEMBER case names for Sydney
  (§8.14: −33.869, 151.209, rounded to −33.87, 151.21 as the
  slice commission states).
