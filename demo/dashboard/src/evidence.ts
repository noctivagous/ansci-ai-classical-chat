/**
 * The capability ledger. Every figure here is copied from a report in
 * docs/fork/ at the commit named below; the reports are the record and
 * this page is a view of them. Figures carry their caveats with them —
 * the project's standing demotions (Part C.5) are part of the data:
 * a fitted demonstration is not general accuracy, a parse success rate
 * is not a correct-meaning rate, and builder-authored sets are internal
 * evidence until independently authored sets reproduce them.
 */
export const EVIDENCE_AS_OF = "main @ b38e663b · depth programme stages 0–4 · suite 308/308";

export interface Capability {
  area: string;
  headline: string;
  figure: string;
  meaning: string;
  caveat?: string;
  source: string;
  /** Optional paired bars: [label, value, max] — measured comparisons, not progress. */
  bars?: { label: string; value: number; max: number }[];
}

export const CAPABILITIES: Capability[] = [
  {
    area: "Sentence layer — breadth",
    headline: "Parses the frozen 80-sentence holdout end to end",
    figure: "80/80",
    meaning:
      "Eighty foreign sentences (a CSKG evaluation corpus the parser was not built against) all parse after the stage-3 construction repair, up from 68/80 at the baseline. The twelve failures were sentence shapes — inverted questions, contractions, fragments — not vocabulary.",
    caveat: "This is a parse success rate, not a correct-meaning rate.",
    source: "docs/fork/construction-challenge.md",
    bars: [
      { label: "baseline (stage 0)", value: 68, max: 80 },
      { label: "after stage 3", value: 80, max: 80 },
    ],
  },
  {
    area: "Sentence layer — depth",
    headline: "Round trips keep the analysis, not just the words",
    figure: "98.2%",
    meaning:
      "Parse → regenerate → reparse, compared as atomic meaning features (roles, negation, aspect, voice…). 98.2% of features survive the round trip on the holdout. Exact string match is far lower (~12–24%) and understates retention: canonicalisation is not loss.",
    caveat: "Feature preservation proves the system retains its own analysis — not that the analysis was correct.",
    source: "docs/fork/depth-baseline.md · construction-challenge.md",
  },
  {
    area: "Valency",
    headline: "FrameNet signatures discipline derived verbs",
    figure: "98.2% role precision",
    meaning:
      "Verbs the hand lexicon doesn't list get argument frames from FrameNet signatures, judged by a three-state assessment (supported / unusual-but-licensed / unsupported). Legitimate-argument acceptance 100%, invalid-argument rejection 91.7% across 12 verbs.",
    caveat: "The elemental domain prior has NOT faced its baseline: verbs carry no semantic classification yet, so its trial is unrunnable and it is adopted nowhere.",
    source: "docs/fork/valency-challenge.md",
  },
  {
    area: "Aspect",
    headline: "Aspect is a feature bundle, dispatched compositionally",
    figure: "19/19 bundles · 98.6% irregular forms",
    meaning:
      "English and Chinese aspect were rebuilt as configurations over features (bounded, ongoing, perfect, experiential…) instead of single labels — 了/着/过 map distinctly, the perfect progressive round-trips exactly, and irregular verb forms are selected at 73/74 against a ratified ≥98% bar.",
    source: "docs/fork/aspect-challenge.md",
  },
  {
    area: "Constructions",
    headline: "Questions and fragments are records, not templates",
    figure: "12/12 census · 6/6 adversarial pairs",
    meaning:
      "Copular questions are queries over the same relations assertions use (Who is Sarah? questions predicated-as; What's in it? questions containment — a different record). Fragments are discourse acts: “What about coffee?” proposes a topic; it is not a broken sentence.",
    source: "docs/fork/construction-challenge.md",
  },
  {
    area: "Sense selection",
    headline: "Sentence context overturns the isolated climb — with brakes",
    figure: "11/11 vs 3/11",
    meaning:
      "When a word has anchored senses in different elements, coherence with the sentence's other elements picks the sense; a confidence band stops context overturning decisive gaps, and restraint corroborates rather than contradicts. Development set A: coherence 11/11, isolated-climb baseline 3/11. Sealed set B, run once: 5/6 vs 4/6 — the gain survives, with one recorded failure (see the failure wall).",
    caveat: "The H3a/H3b rivalry this mechanism serves is NOT settled — its criterion needs human judges. Only 28 words in the lexicon even have multi-element candidates; anchor coverage is the real bottleneck.",
    source: "docs/fork/sense-challenge.md",
    bars: [
      { label: "isolated climb (baseline)", value: 3, max: 11 },
      { label: "sense-by-coherence", value: 11, max: 11 },
    ],
  },
  {
    area: "Knowledge graph",
    headline: "158 classifications drive derivations by correspondence",
    figure: "45 curated · 113 creative",
    meaning:
      "Concepts classified onto the Five-Element spine (as (concept, aspect) pairs with confidence and provenance) yield correspondence conclusions through the ontology: anger → Wood → liver, spring, east, sour… Classifications from attested sources and the project's creative extensions are labelled as what they are, never blended.",
    caveat: "Coverage is small and hand-built. The classification pilot (100 ordinary objects under the ratified protocol) has not run yet.",
    source: "src/fork/classify.ts · docs/fork/wp1-classification-survey.md",
  },
  {
    area: "Density behaviour",
    headline: "The brakes hold as classifications scale ×100",
    figure: "447 → 488 → 546 conclusions",
    meaning:
      "Multiplying classifications ×1/×10/×100 grows derived conclusions strongly sublinearly — per-relation decay, restraint arbitration and confidence gating keep the net from exploding into noise.",
    caveat: "The automatic precision proxy degrades (0.917 → 0.751) and the ×100 review queue is 1,047 items — beyond hand review. Whether the proxy or the system is wrong awaits the judged benchmark.",
    source: "docs/fork/density-run.md",
    bars: [
      { label: "×1 classifications", value: 447, max: 546 },
      { label: "×10", value: 488, max: 546 },
      { label: "×100", value: 546, max: 546 },
    ],
  },
  {
    area: "Demonstration corpus",
    headline: "The standing exhibit: 26 sentences, expectations met",
    figure: "26/26 · 24 exact",
    meaning:
      "A fixed English+Chinese corpus in demo/wuxing-parser/ is regenerated on every run — including two sentences that must be FLAGGED (a tense-carrier violation, a missing classifier). Weakening an expectation to fake progress would be visible in the file's own history.",
    caveat: "A fitted demonstration result, not general parser accuracy.",
    source: "demo/wuxing-parser/RESULTS.md",
  },
];
