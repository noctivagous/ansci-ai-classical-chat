/**
 * The capability ledger. Every figure here is copied from a report in
 * docs/fork/ at the commit named below; the reports are the record and
 * this page is a view of them. Figures carry their caveats with them —
 * the project's standing demotions (Part C.5) are part of the data:
 * a fitted demonstration is not general accuracy, a parse success rate
 * is not a correct-meaning rate, and builder-authored sets are internal
 * evidence until independently authored sets reproduce them.
 */
export const EVIDENCE_AS_OF = "depth programme stages 0–5 complete · four coverage slices: H7 banking pass · anchor-quality repair · ingestion pipeline · verb classifications with the elemental-prior trial run (2026-11-15) · suite 355/355";

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
    figure: "97.7–98.2%",
    meaning:
      "Parse → regenerate → reparse, compared as atomic meaning features (roles, negation, aspect, voice…). Between 97.7% and 98.2% of features survive the round trip on the holdout — a range, not a point: the measuring instrument is warm-state dependent (derived entries register as sentences are parsed), moving the figure ±0.5pt between runs. Exact string match is far lower (~12–24%) and understates retention: canonicalisation is not loss.",
    caveat: "Feature preservation proves the system retains its own analysis — not that the analysis was correct.",
    source: "docs/fork/depth-baseline.md · construction-challenge.md",
  },
  {
    area: "Valency",
    headline: "FrameNet signatures discipline derived verbs",
    figure: "98.2% role precision",
    meaning:
      "Verbs the hand lexicon doesn't list get argument frames from FrameNet signatures, judged by a three-state assessment (supported / unusual-but-licensed / unsupported). Legitimate-argument acceptance 100%, invalid-argument rejection 91.7% across 12 verbs. On held-out verbs whose signatures are withheld, the system abstains — every argument unusual-but-licensed, nothing unsupported, nothing invented. Abstention is a designed behaviour, not a gap in the table.",
    caveat: "The elemental domain prior has now faced its baseline (2026-11-15): verbs carry classifications (574 of 3,071, VERB_DOMAIN_V1), and on the predeclared headline — exact shape match on held-out verbs — the prior tied the FrameNet-only baseline 0/4, so under the C.2 rule it FAILED and remains adopted nowhere. Partial-credit measures favoured the prior throughout; a retest would need a distributional predictor, argued before it runs.",
    source: "docs/fork/valency-challenge.md",
  },
  {
    area: "Aspect",
    headline: "Aspect is a feature bundle, dispatched compositionally",
    figure: "19/19 bundles · 98.6% irregular forms",
    meaning:
      "English and Chinese aspect were rebuilt as configurations over features (bounded, ongoing, perfect, experiential…) instead of single labels — 了/着/过 map distinctly, the perfect progressive round-trips exactly, and irregular verb forms are selected at 73/74 against a ratified ≥98% bar. The one miss is become's participle: identity forms are invisible to the forms index, a documented blindness, not a random error.",
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
      "When a word has anchored senses in different elements, coherence with the sentence's other elements picks the sense; a confidence band stops context overturning decisive gaps, and restraint corroborates rather than contradicts. Development set A: coherence 11/11, isolated-climb baseline 3/11. Sealed set B, run once at stage 4: 5/6 vs 4/6 — the gain survives. After the anchor-quality repair the sealed set reads 6/6: the one failure's rival candidate was itself a wayward anchor path (stock's Fire via blood's lineage synset), removed when anchors were pinned to their classified senses.",
    caveat: "The H3a/H3b rivalry this mechanism serves is NOT settled — its criterion needs human judges. Only 19 words in the lexicon have multi-element candidates after the anchor repair; anchor coverage is the real bottleneck.",
    source: "docs/fork/sense-challenge.md",
    bars: [
      { label: "isolated climb (baseline)", value: 3, max: 11 },
      { label: "sense-by-coherence", value: 11, max: 11 },
    ],
  },
  {
    area: "Generation depth — stage 5",
    headline: "Negation is a state with a carrier — and the weak family clears its floor",
    figure: "negation 91.2% · F1 closed",
    meaning:
      "Stage 5 was amended (Part F) to forbid silent engineering fixes: each remaining family had to be carried by the ontology or declared an ontology failure. Negation is now a structured state — a Water state with its Metal carrier recorded (the auxiliary in English; in Chinese the negator itself, its form 不/没 selected by the negated verb's aspect bundle, a rule that scored 15/15 on its admission probe including configurations the parser had never handled). Chinese preverbal negation, dropped at parse for the whole programme (defect F1), round-trips exactly; the negation family rose from 84.4% to 91.2%, over its 90% floor. Number gained counted-quantity atoms through the classifier — the Metal the noun generates — and temporal phrases resolve into the ontology's own time nodes. Two families are declared ontology failures in the report, in those words: precision (“the exact population”) and suppressed-role coverage.",
    caveat: "Admission probes and challenge sets are builder-authored — internal evidence until independently authored sets reproduce them (Part C.5).",
    source: "docs/fork/stage-5-report.md · docs/fork/stage5-admission-probes.md",
  },
  {
    area: "Knowledge graph",
    headline: "164 classifications drive derivations by correspondence",
    figure: "57 curated · 107 creative",
    meaning:
      "Concepts classified onto the Five-Element spine (as (concept, aspect) pairs with confidence and provenance) yield correspondence conclusions through the ontology: anger → Wood → liver, spring, east, sour… Classifications from attested sources and the project's creative extensions are labelled as what they are, never blended. The five planet rows began as creative extensions and were upgraded to attested (2026-11-15) when the surveys found them stated in Suwen ch. 4 and the Huainanzi — the project's heuristic had landed where two early texts land. The weather entries were re-scoped under hypothesis H6 and its follow-on: rain classifies only through its precipitation aspect, provisionally (0.71); sleet, snow, hail, frost and fog assert nothing — the table is phase-null for them; ice classifies as a substance, storm through its wind aspect only. The hypernym climb keeps its own anchors: an assertion and an anchor are different jobs. The livestock and grain rows of Suwen ch. 4 joined the table as attested entries in the anchor-quality slice (2026-11-15). Two further stores sit beside the table, fenced from it: 46 derived flavor correspondences banked from the mineral survey under the H7 bridge (flavor aspect only, derivation paths stored), and 63 source-scoped assertions ingested from Suwen ch. 5 by the citation-gated pipeline.",
    caveat: "Coverage is small and hand-built — see the pilot card below for what happens when the protocol meets 100 ordinary objects.",
    source: "src/fork/classify.ts · docs/fork/wp1-classification-survey.md · repair-programme.md (H6 record)",
  },
  {
    area: "Knowledge graph — classification pilot",
    headline: "A reproducible procedure for classifying ordinary objects",
    figure: "100 objects · 94/95 assertions supported",
    meaning:
      "Slice 1 of the repair programme: 100 ordinary objects (tools, substances, materials, plants, animals) classified under the ratified protocol — aspects, never the entity wholesale; composites by components; flavors bridge only to the flavor aspect. The run produced eight adjudication rulings (a living plant is not a material; animal material is the attested five-livestock row only; the glass family abstains) and one unsupported assertion in 95 (a flavor transferred from a rhizome to its juice). A blind second classification of a 20-object subsample agreed on every axis.",
    caveat: "Coverage, reframed: the pilot's ≥90% coverage bar was superseded by Part E (2026-11-15), which re-reads the pilot as an assertion-layer test and replaces the single bar with three evaluations for the 500-object run — heuristic coverage per epistemic tier, validated accuracy, abstention discipline. The 400-object test sample is ready and the creature-class prediction rule (P2) is registered from the Liji, Yueling. The blind agreement remains an upper bound (the primary classifier had seen the blind output before finalising). Nothing from the pilot is banked into the table yet.",
    source: "docs/fork/wp1-pilot-results.md",
  },
  {
    area: "Density behaviour",
    headline: "The brakes hold as classifications scale ×100",
    figure: "414 → 455 → 504 conclusions",
    meaning:
      "Multiplying classifications ×1/×10/×100 grows derived conclusions strongly sublinearly — per-relation decay, restraint arbitration and confidence gating keep the net from exploding into noise. These are the figures after the H6 weather re-scope and its follow-on withdrew or re-scoped the whole-phenomenon weather entries; the frozen first-run record (447 → 488 → 546) stands in docs/fork/density-run.md, and the deltas are the withdrawn assertions' derivations, exactly as expected.",
    caveat: "The automatic precision proxy degrades (0.913 → 0.752 on the latest re-run) and the first run's ×100 review queue was 1,047 items — beyond hand review. Whether the proxy or the system is wrong awaits the judged benchmark.",
    source: "docs/fork/density-run.md · repair-programme.md (H6 record)",
    bars: [
      { label: "×1 classifications", value: 414, max: 504 },
      { label: "×10", value: 455, max: 504 },
      { label: "×100", value: 504, max: 504 },
    ],
  },
  {
    area: "Demonstration corpus",
    headline: "The standing exhibit: 29 sentences, expectations met",
    figure: "29/29 · 27 exact",
    meaning:
      "A fixed English+Chinese corpus in demo/wuxing-parser/ is regenerated on every run — including two sentences that must be FLAGGED (a tense-carrier violation, a missing classifier). Weakening an expectation to fake progress would be visible in the file's own history.",
    caveat: "A fitted demonstration result, not general parser accuracy.",
    source: "demo/wuxing-parser/RESULTS.md",
  },
];

/**
 * The stage-4 sense decisions, item by item — transcribed from
 * docs/fork/sense-challenge.md. Support scores are the coherence
 * mechanism's own arithmetic: same element 1.0, generating 0.8,
 * controlling 0.4 (corroboration only — restraint never subtracts).
 */
export interface SenseRow {
  set: "A" | "B";
  target: string;
  sentence: string;
  expected: string;
  baseline: string;
  coherence: string;
  support: string;
  verdict: "pass" | "FAIL";
}

export const SENSE_ROWS: SenseRow[] = [
  { set: "A", target: "blow", sentence: "The blow of spring woke the garden.", expected: "Wood", baseline: "Water", coherence: "Wood", support: "Water 1.2 · Wood 1.4", verdict: "pass" },
  { set: "A", target: "blow", sentence: "The blow of snow buried the valley.", expected: "Water", baseline: "Water", coherence: "Water", support: "Water 1.0 · Wood 0.8", verdict: "pass" },
  { set: "A", target: "rest", sentence: "She found rest in the garden.", expected: "Earth", baseline: "Water", coherence: "Earth", support: "Water 0.4 · Earth 1.0", verdict: "pass" },
  { set: "A", target: "rest", sentence: "She found rest.", expected: "Water", baseline: "Water", coherence: "Water", support: "Water 0 · Earth 0", verdict: "pass" },
  { set: "A", target: "concern", sentence: "Her concern grew in the garden.", expected: "Earth", baseline: "Water", coherence: "Earth", support: "Earth 1.0 · Water 0.4", verdict: "pass" },
  { set: "A", target: "passion", sentence: "His passion became rage.", expected: "Wood", baseline: "Fire", coherence: "Wood", support: "Fire 0.8 · Wood 1.0", verdict: "pass" },
  { set: "A", target: "passion", sentence: "His passion became joy.", expected: "Fire", baseline: "Fire", coherence: "Fire", support: "Fire 1.0 · Wood 0.8", verdict: "pass" },
  { set: "A", target: "thrill", sentence: "A thrill of joy shook her.", expected: "Fire", baseline: "Water", coherence: "Fire", support: "Fire 1.0 · Water 0.4", verdict: "pass" },
  { set: "A", target: "puff", sentence: "A puff of garden dust rose.", expected: "Metal", baseline: "Wood", coherence: "Metal", support: "Metal 0.8 · Wood 0.4", verdict: "pass" },
  { set: "A", target: "lettuce", sentence: "The lemon shaded the lettuce.", expected: "Wood", baseline: "Earth", coherence: "Wood", support: "Wood 1.0 · Earth 0.4", verdict: "pass" },
  { set: "A", target: "outpouring", sentence: "An outpouring of grief filled the room.", expected: "Water", baseline: "Wood", coherence: "Water", support: "Water 0.8 · Wood 0.4", verdict: "pass" },
  { set: "B", target: "vexation", sentence: "His vexation became anger.", expected: "Wood", baseline: "Earth", coherence: "Wood", support: "Wood 1.0 · Earth 0.4", verdict: "pass" },
  { set: "B", target: "gloominess", sentence: "The gloominess became fear.", expected: "Water", baseline: "Metal", coherence: "Water", support: "Metal 0.8 · Water 1.0", verdict: "pass" },
  { set: "B", target: "acerbity", sentence: "The acerbity of the lemon startled her.", expected: "Wood", baseline: "Wood", coherence: "Wood", support: "Wood 1.0 · Fire 0.8", verdict: "pass" },
  { set: "B", target: "beak", sentence: "The beak pecked the grain.", expected: "Earth", baseline: "Earth", coherence: "Earth", support: "Earth 0 · Metal 0", verdict: "pass" },
  { set: "B", target: "alabaster", sentence: "The alabaster was white.", expected: "Metal", baseline: "Metal", coherence: "Metal", support: "Metal 1.0 · Water 0.8", verdict: "pass" },
  { set: "B", target: "stock", sentence: "The stock simmered in the pot.", expected: "Water", baseline: "Water", coherence: "Fire", support: "Water 0.4 · Fire 0.8", verdict: "FAIL" },
];
