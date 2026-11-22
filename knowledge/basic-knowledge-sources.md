# Basic knowledge — external projects that could fill it

*Survey recorded 2026-11-22, from the OpenCog/AtomSpace side-chat investigation.
Status: discussion record only. No import, build or adoption is authorised by
this file. The prior question — how AnSci gains basic knowledge — is OPEN:
the admission-only account (item-by-item entry via conversion, the CSKG
feeder, corpus mining, live consultation and conversation, each
provenance-stamped) was judged by the owner "not really what we want
specifically". A proposed alternative — a frequency-by-domain syllabus
filled by cross-checked LLM authoring, a bulk-converted pack as
cross-check/floor, basics stored as priced generics — was put in reply;
no decision was taken.*

## The shape of the finding

No single project fills "basic knowledge", because basic knowledge is six
different things and each project fills one of them well:

1. everyday properties and relations,
2. generics ("birds fly"-type statements),
3. elementary science,
4. events, scripts and procedures,
5. hand-built axioms about the basics,
6. encyclopedic instances (already served by the Wikidata adapter).

Every candidate below still needs the feeder treatment before it can be
testified: endpoints classified onto AnSci's own spine, provenance on
every entry. The projects supply inventory; none supplies classification
onto the Wuxing/correspondence ontology.

## 1. Everyday properties and relations

| Project | What it holds | Notes |
| :--- | :--- | :--- |
| ConceptNet | 8M nodes, 21M edges of crowdsourced commonsense | Already inside CSKG. CC BY-SA |
| ATOMIC 2020 | 1.33M tuples across 23 relations — social, physical and event knowledge, built to cover what other graphs miss | Triples. **CC BY — no ShareAlike.** Newer and larger than the ATOMIC (2019) slice inside CSKG |
| Quasimodo | ~2.26M salient properties for ~80,000 concepts, mined from query logs and QA forums, scored for typicality and saliency | Triples *with scores* — the scores are ready-made pricing for a generics layer. Licence to verify before any use |
| Ascent | ~2M assertions with subgroups and aspects (diesel vs electric cars get different properties) plus temporal/spatial facets | The most AnSci-shaped of the extractors: facets are provenance-like discipline applied to commonsense. Licence to verify |
| WebChild | 2M nodes, 18M edges (taste, comparisons, part-whole) | Already inside CSKG; the noisy end of the family |

## 2. Generics as sentences

| Project | What it holds |
| :--- | :--- |
| GenericsKB-Best (AllenAI) | 1,020,868 generic sentences ("Trees remove carbon dioxide from the atmosphere"), each with its topic term and a confidence score. **CC BY 4.0** |

Sentences, not triples — they would enter through AnSci's parser /
conversion, but they arrive *as* generics, which is the form basic
knowledge actually takes.

## 3. Elementary science

| Project | What it holds |
| :--- | :--- |
| OpenBookQA "open book" (AllenAI) | 1,326 elementary science facts ("metals are thermal conductors"), curated as the facts central to scientific explanations |
| WorldTree (AllenAI) | Explanation graphs chaining such core facts together |

Tiny, and that is the virtue: the only candidate small enough for a human
to audit completely. It is a science core, not a general one.

## 4. Events, scripts, procedures

| Project | What it holds |
| :--- | :--- |
| ATOMIC (2019) | 877k if-then descriptions: pre/postconditions, causes, how each participant feels. Already reaching AnSci via CSKG |
| proScript (AllenAI) | 6,414 crowdsourced scripts as *partially ordered* graphs (bake a cake: recipe and ingredients before oven; some steps in any order), 311,502 event pairs. Maps almost one-to-one onto AnSci's ordered `HasSubevent / HasPrerequisite` chains |
| ROCStories | ~98k five-sentence everyday stories — script knowledge in narrative form |
| WikiHow | Step procedures at scale; form and licence are messier |

## 5. The hand-built attempts

| Project | State |
| :--- | :--- |
| Cyc | The one project whose stated goal *was* basic knowledge, hand-built since 1984: ~1.5M terms, ~24.5M assertions by 2017. **Commercial.** The open subset (OpenCyc) does not contain the axiomatic rules — a taxonomy without the knowledge — and is no longer maintained. ATOMIC 2020's authors could not include Cyc in their comparison: research licence discontinued, commercial licence too expensive |
| SUMO | The free counterpart: an axiomatised upper/mid-level ontology (rules like "two people sharing the same parents must be siblings"), **mapped onto WordNet synsets**, which AnSci already holds. Rules *about* basics rather than basics themselves |

## 6. Also named

- **HowNet / OpenHowNet** — words defined through ~2,000 primitive
  sememes; a decomposition of basic meaning that matters when the
  Chinese side becomes feasible.
- **LLM-distilled sets** — ATOMIC-10x (distilled from GPT-3), Gen-ATOMIC
  (14M generated statements): the authored-fill route, done by other
  people, carrying the same standing question as any model intake.
- **ASER** — a 64M-edge eventuality graph; breadth at a noise level the
  feeder would mostly drop anyway.

## Shortlist, as presented

```
Already inside CSKG (no new work):   ConceptNet · WebChild · ATOMIC (2019 slice)

Genuinely additive, AnSci-shaped:
  1. ATOMIC 2020      CC BY, relations already mapped by the feeder,
                      social + physical + event in one graph
  2. GenericsKB-Best  CC BY, the generics layer in its native form, scored
  3. Quasimodo        typicality/saliency scores = generics pricing, done
  4. OpenBookQA book  1,326 facts — auditable in full; the science core
     + WorldTree
  5. proScript        ordered scripts → procedure chains, a form CSKG lacks
  6. SUMO↔WordNet     axioms over synsets AnSci already holds

Dead ends:  OpenCyc (taxonomy only, unmaintained) · Cyc (paywalled)
```

## File sizes

Two kinds of figure below, kept apart: **measured** (a published download
size, or a file already in this repo) and **estimated** (derived from the
assertion count at roughly 60–120 bytes per TSV line uncompressed, gzip
typically 5–10× smaller — an order of magnitude, not a measurement).

| Resource | Download size | Basis |
| :--- | :--- | :--- |
| ConceptNet 5.7 assertions | **498 MB gz** (497,963,447 bytes); several GB uncompressed | Measured (host listing) |
| CSKG full (cskg.tsv.gz) | **112.3 MB gz** (+star variant 116.8 MB) | Measured (Zenodo record, project research 2026-11-17) |
| CSKG as shipped in this repo (trimmed bundle, 80,466 edges) | **4.4 MB** (`data/cskg/cskg-trim.tsv`) | Measured (on disk) |
| This repo's whole `data/` directory today | **30 MB** | Measured (on disk) |
| WebChild 2.0 (18M assertions) | ~1–3 GB across its files | Estimated — the giant of the list |
| Quasimodo (2.26M assertions) | ~150–300 MB uncompressed | Estimated |
| Ascent (~2M assertions) | ~150–300 MB uncompressed | Estimated |
| GenericsKB full (3.43M sentences, with context columns) | ~100–200 MB gz | Estimated |
| GenericsKB-Best (1.02M sentences) | ~40–80 MB gz | Estimated |
| ATOMIC 2020 (1.33M tuples) | ~25–40 MB zip | Estimated |
| ATOMIC 2019 (877k edges) | ~10–20 MB tgz | Estimated |
| SUMO (ontology + WordNet mappings) | Tens of MB | Estimated |
| ROCStories (~98k stories) | ~30–60 MB text | Estimated |
| proScript (6.4k scripts) | A few MB | Estimated |
| WorldTree | A few MB | Estimated |
| OpenBookQA (1,326 facts + ~6k questions) | ~2–5 MB total | Estimated — the smallest thing on the list |

Reading of the table: nothing here is a storage problem. Even the largest
candidate is a few GB as a download, and everything AnSci would actually
ship is the feeder's trimmed output — the precedent is the CSKG bundle:
112 MB of source became 4.4 MB in the repo. The cost of these nets was
never disk; it is the classification pass over their endpoints.

## Open decisions (owner's, not taken)

1. Route to basic knowledge: admission-only / syllabus + authored fill
   with converted pack as cross-check / bulk conversion only.
2. If a syllabus: frequency list × WordNet's 26 lexicographer domains,
   or a hand-designed domain grid first.
3. Standing of any model-authored entries: own provenance tier,
   cross-checked before banking — or bank only what a converted source
   confirms.
