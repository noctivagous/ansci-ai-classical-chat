/**
 * The path to a working chatbot. The parser and the ontology below
 * are built and measured; a chatbot is a further system on top of
 * them. Each part states where it stands, the steps that remain
 * (in the order they can be taken), and the requirements it must
 * meet — the project's own rules, not aspirations. Statuses are
 * per part and deliberately never averaged into a single number:
 * this page's standing rule is that a gain in one ledger is not a
 * gain in another. Sources: docs/ansci/repair-programme.md, the
 * fork design records, and the capability ledger on this page.
 */

export interface RoadmapPart {
  id: string;
  tab: string;
  title: string;
  status: string;
  stands: string;
  /** The part's task list: done = already in place, with the evidence in the text. */
  roadmap: { done: boolean; text: string }[];
  /** The part's acceptance checklist — every box must hold before the part is called done. */
  requirements: string[];
  source: string;
}

export const ROADMAP_PARTS: RoadmapPart[] = [
  {
    id: "dialogue",
    tab: "Dialogue core",
    title: "The conversation engine",
    status: "session core built — record, planner inputs, gap questions, bounded initiative · intent arc, person model, wider situation and durable memory still open",
    stands:
      "The steering probe has grown into a session record the planner reads: entities, events and states (each state carrying its origin — the classification leg it came from, its support, its tier), first-class topics with the turns they were raised and last touched, corrections recorded as supersession deltas, a disposition and a role composition, and an awareness frame — the session's season and daypart, classified from the shell's clock. Follow-up questions arise from genuine gaps (an unfilled required role, a classification split between rival derivations), and bounded initiative takes up a standing thread whose generating direction has gone unexpressed. The dashboard chat above runs all of it. What does not exist is unchanged in kind: no intent arc, no person model, no situation wider than the frame. Evidence: docs/ansci/transcripts/T-R3.md, T-R5.md, T-R6.md and their results files; the §11 exercise in T-R7-dashboard-check.md.",
    roadmap: [
      { done: true, text: "A session that carries derived conclusions from turn to turn within a run — the steering probe did this much, and the record has since grown the fields the planner reads (origins, topics, deltas)." },
      { done: true, text: "Session state that persists across turns: later statements relate to earlier ones — states carry their origins and tiers, topics their raised and last-touched turns, corrections their recorded deltas (design note §9.4; slices R0 and R5)." },
      { done: false, text: "The intent arc: the accumulating picture of what the conversation is about, itself an input to processing. Not built — the planner's interface is shaped so as not to preclude it." },
      { done: false, text: "A situation model beyond the frame: who is speaking, what has been established and the standing topics are in the record, and the session's season and daypart are classified into it (slice R6) — but place and circumstance wider than that frame do not exist." },
      { done: true, text: "Question formation from processing: a follow-up question is asked when the combined conclusions have a genuine gap the person can fill — an unfilled valency role or a rival-derivation split — never from a template list hunting for slots (slice R3; initiative under its bound, slice R6). Evidence: T-R3, T-R6." },
      { done: false, text: "Conversation memory with a boundary: the in-session half is built — what a conversation establishes is available to later turns immediately. The durable half waits on part 4: reaching the graph only through the banking pipeline, gated, is still interface-only there." },
    ],
    requirements: [
      "Transcripts are the acceptance test: a turn counts only when the reply arises from the mechanism working, checkable in the turn's trace, with the mechanism named.",
      "The ontology is architecture, never surface: no reply names the Five Phases, the cycles, or any internal machinery.",
      "Address the person inside a sentence, in the second person, their content taken up — never by name as a vocative.",
      "A direct graph query pasted out as a reply is an architecture violation, however accurate the fact.",
    ],
    source: "src/ansci/turn.ts · session.ts · plan.ts · docs/ansci/reply-planning-design.md §§8–11 · transcripts T-R3/T-R5/T-R6/T-R7",
  },
  {
    id: "generation",
    tab: "Reply generation",
    title: "Making the generator the reply surface",
    status: "the generator is the reply surface · planner built and live in the dashboard chat",
    stands:
      "Built (reply-planning programme, slices R1–R7). The planner (src/ansci/plan.ts) builds a meaning graph for the reply from the turn's derivations and the session record, prices it — a reply's ceiling is set by the weakest classification on its derivation's path, and its support sets the strength at or below that ceiling — and the generator speaks from that graph: predications, compositions of several conclusions in both declared orderings, gap questions, corrections, initiative. The probe's hand wording remains only where no derivation backs a turn, and the trace flags those turns as wording-not-derived rather than letting them pass as generated. The session's disposition composition varies selection and qualification without varying what is concluded (slice R4). Evidence: docs/ansci/transcripts/T-R1.md, T-R2.md, T-R4.md and their results files; the dashboard exercise in T-R7-dashboard-check.md. English-first, as decided; the graphs are language-neutral and the turn loop's Chinese side is separate work.",
    roadmap: [
      { done: true, text: "The machinery exists: the generator already turns meaning graphs back into English and Chinese sentences (97.7–98.2% feature preservation on round trips)." },
      { done: true, text: "Reply planning: from the turn's derived conclusions and its situation record, a meaning graph is built for the reply — the same record type the parser produces, so replies and inputs share one representation (src/ansci/plan.ts, slice R1). (Intent is not yet an input — part 1's open item.)" },
      { done: true, text: "Generate the reply sentence from that graph (English first; Chinese as its coverage allows), including its questions, negations and qualifications as graph structure, not as phrasing choices (slices R1, R3, R5). Evidence: T-R1, T-R3, T-R5." },
      { done: true, text: "Wording variety from structure: different derivations produce different replies because their graphs differ — not because a template bank is sampled. Compositions of several conclusions are spoken in a declared order, with the alternate ordering visible in the trace (slice R2). Evidence: T-R2." },
      { done: true, text: "Confidence carried through: a reply asserts at the strength its derivation carries — priced by tier ceiling and support (§9.2) — and weak derivations surface as hedged replies or grounded declines, by construction (slices R1, R3, R4). Evidence: T-R1, T-R4, T-R7." },
    ],
    requirements: [
      "No canned sentence whose content is not in the reply's own meaning graph.",
      "Every claim in a reply is inspectable in the trace, back to the derivation that produced it.",
      "Abstention is a legitimate reply: when the derivation is empty, the honest output is not knowing — produced by the mechanism, not by a deflection template.",
    ],
    source: "src/ansci/generate.ts · plan.ts · pricing.ts · docs/ansci/reply-planning-design.md §§9–11 · transcripts T-R1/T-R2/T-R4/T-R7",
  },
  {
    id: "coverage",
    tab: "Knowledge coverage",
    title: "A graph big enough to talk about the world",
    status: "procedure proven · scale-up ready",
    stands:
      "The table holds 164 classifications, hand-built and surveyed against transmitted texts. The four commissioned coverage items are done: the mineral survey's flavor records are banked as derived correspondences; the climb's anchors are pinned to their classified senses (coverage fell from 646 to 416 candidate words — the price of removing paths that reached anchors by spelling, not sense); an ingestion pipeline banks source-scoped assertions from cited chapters (63 from Suwen ch. 5); and verbs carry classifications, which made the elemental valency prior's trial runnable at last — it was run, and on its predeclared headline it failed, so the prior remains adopted nowhere. Coverage is still the binding constraint on everything above: only 19 polysemous words have competing anchored senses. The classification procedure itself is proven: the 100-object pilot produced eight adjudication rulings and 94/95 supported assertions.",
    roadmap: [
      { done: true, text: "The classification procedure is proven: the 100-object pilot produced eight adjudication rulings and 94/95 supported assertions." },
      { done: true, text: "The 500-object run is designed and its sample ready: the pilot's 100 as calibration, 400 fresh objects on a prepared sheet, prediction rules P1/P2/P6/P7 registered." },
      { done: true, text: "Run the 500-object run under Part E, scored on the three evaluations — heuristic coverage per tier, validated accuracy, abstention discipline. (Executed 2026-11-15: coverage 457/800, the accuracy ledger open for independent judges.)" },
      { done: true, text: "The H7 banking pass: the mineral survey's 50 substances gain derived flavor correspondences in the graph, as B-derived records with their derivation paths stored." },
      { done: true, text: "Anchor quality: audit and repair the hypernym climb's wayward paths (rock arriving at Earth via “sweet”), and widen anchor coverage where the tradition actually offers anchors." },
      { done: true, text: "The ingestion pipeline as its own approved slice: acquire → segment → read → propose → review → apply over the classical texts — no citation, no insertion; variant schemes coexist as source-scoped assertions." },
      { done: true, text: "Verb classifications, last because they are hardest: the piece that finally makes the elemental-prior trial runnable — and lets it fail, if it fails, on evidence." },
    ],
    requirements: [
      "Every classification is an (concept, aspect) assertion with provenance and confidence — never an entity classified wholesale.",
      "Inference is permitted by default and priced always: a heuristic output names its registered rule and version, or it is an unresolved case, not a prediction (Part E's brakes amendment).",
      "Attested tradition, creative application and analysis stay in distinct labelled layers at every tier of the ladder.",
      "The brakes are constitutive: confidence band, confidence gate, per-relation decay and restraint arbitration ship with any growth, not after it.",
    ],
    source: "docs/ansci/repair-programme.md Parts E–F · wp1-pilot-results.md · wp1-scaleup-sample.md",
  },
  {
    id: "feeders",
    tab: "Feeders & banking",
    title: "Live knowledge, banked with provenance",
    status: "interface only · data not installed",
    stands:
      "The fork's answer to “the graph can't contain everything” is routing: local graph first, then Wikidata for facts, then web search for procedures, then a small model last — with successful retrievals distilled back into the graph (“bank what works”). Of this, only the CSKG feeder's interface and relation mapping exist in code; its data is not installed, and the Wikidata and web tiers are designed, not built.",
    roadmap: [
      { done: true, text: "The CSKG feeder's interface and relation mapping exist in code." },
      { done: false, text: "Install CSKG data as a feeder: relational commonsense (causes, uses, locations, subevents) that WordNet does not carry, its concepts classified onto the spine through the WordNet join." },
      { done: false, text: "The Wikidata tier for facts — dishes, ingredients, origins, dates — explicitly not procedures." },
      { done: false, text: "The web tier for how-to and procedural knowledge, behind the same provider interface, optional over the offline graph." },
      { done: false, text: "The banking pipeline: a successful retrieval is distilled into the overlay graph as structure with its source attached, gated on arrival, individually reversible thereafter." },
      { done: false, text: "A small, fast model as the final tier — used last, and labelled as model knowledge whenever it speaks." },
    ],
    requirements: [
      "Every answer carries its provenance — graph, Wikidata, web, model or conversation memory — visibly, not on request.",
      "Banked edges live only in the overlay graph; pristine sources are never edited by banking.",
      "Routing order is fixed: local graph → Wikidata → web → model. A later tier is reached only when the earlier ones genuinely come back empty.",
      "Banking never outruns the brakes: a banked edge enters at derived confidence, under the same gates as any heuristic output.",
    ],
    source: "src/ansci/cskg-feed.ts (interface) · fork design records (routing and banking)",
  },
  {
    id: "evaluation",
    tab: "Evaluation",
    title: "Independent evidence that it works",
    status: "internal evidence strong · human instruments unrun",
    stands:
      "Everything on this page below is internal evidence: builder-authored challenge sets (sealed by hash, but with no separate custodian), a fitted demonstration corpus, and automatic proxies. The programme's own protocol says what would make the claims external — and none of it has happened yet, because all of it needs people who are not the builder.",
    roadmap: [
      { done: true, text: "Internal evaluation is built and running: challenge sets sealed by hash, the three ledgers kept separate, the standing demotions in force on every figure." },
      { done: true, text: "The H3 sense experiment is designed and preregistered, its predictions frozen before any materials exist." },
      { done: false, text: "WP2, the judged benchmark: independent judges score derived conclusions against the ratified bars (precision ≥90% with the lower confidence bound ≥85%; unsupported inferences ≤5%; contradiction detection ≥95%)." },
      { done: false, text: "Run the H3 experiment: 40+ lexical items in a 2×2 design, free interpretation before forced choice — plus its Chinese arm, 60 native speakers judging original Chinese." },
      { done: false, text: "The first sealed set under the full C.5 protocol: author, operator and custodian as separate parties, so the scheme's author is bound by the same discipline as its evaluator." },
      { done: false, text: "Chat acceptance runs, when parts 1–2 exist: fresh, unscripted transcripts judged turn by turn — fix in the architecture, retest on new scenarios, never on the ones that failed." },
    ],
    requirements: [
      "The standing demotions stay in force until an instrument retires them: a parse success rate is not a correct-meaning rate; a fitted demonstration is not general accuracy; mechanical reproducibility is not independent validation.",
      "Judges are never the builder, and a claim graduates only when an independently authored set reproduces it.",
      "Failures found by evaluation stay in the record — the failure wall below is the model: named, evidenced, and closed only by a mechanism, not by editing the set.",
    ],
    source: "docs/ansci/repair-programme.md Parts C.5–C.6 · the preregistered H3 design",
  },
  {
    id: "gardener",
    tab: "The gardener",
    title: "A maintainer in the outer loop",
    status: "idea · two decisions open",
    stands:
      "Failures will keep arriving faster than a person can triage them. The floated design puts a fast model in the outer loop: read the traces, sort each failure into a knowledge fault (the graph is missing or wrong) or a processing fault (the code is), and act accordingly — freely on neither. It is undecided whether the gardener works only in the development loop or also live at runtime, and whether it is a hosted model or a local 3–4B-class model behind the same provider interface.",
    roadmap: [
      { done: false, text: "Decide the scope: development loop first; live runtime only if the development record earns it. (Open decision.)" },
      { done: false, text: "Decide the model: a hosted fast model, or a local 3–4B-class model behind the same provider interface. (Open decision.)" },
      { done: false, text: "Failure triage over traces: knowledge faults route to overlay adjustments; processing faults route to code proposals. The sort itself is evaluated — a mis-sorted fault is a gardener failure, recorded as one." },
      { done: false, text: "Propose-and-approve for code, until trust is earned on evidence; graph adjustments are cheaper and reversible, so they may run freer — still gated, still logged." },
      { done: false, text: "Every fix is judged on a fresh holdout, never on the material that produced the failure." },
    ],
    requirements: [
      "The gardener may learn how to ask, never what to answer: it adjusts the machinery and the graph's derived layer; it does not author attested knowledge.",
      "Code changes are proposals with diffs and reasons, not commits; nothing the gardener does is irreversible.",
      "A fix that only repairs the case that exposed it is overfitting, and the fresh-holdout rule exists to catch exactly that.",
    ],
    source: "fork design records — floated 2026-11-15, not decided",
  },
  {
    id: "runtime",
    tab: "Runtime & access",
    title: "Where the chatbot actually runs",
    status: "demonstrator runs locally · no served chat yet",
    stands:
      "The fork was shaped to be lightweight and run anywhere: the core loop is local, the web tier is optional, and the demonstrator already runs as a line-at-a-time terminal program (npm run ansci:chat) on a developer's machine. What does not exist is a served, persistent chatbot a person could simply talk to — sessions end with the process, and the large lexical assets (the ~20MB WordNet extract, the FrameNet bundle) are optional layers that a deployment has to carry deliberately, as this page's own web build shows by running without them.",
    roadmap: [
      { done: true, text: "The demonstrator runs locally as a line-at-a-time terminal program (npm run ansci:chat), its core loop fully offline." },
      { done: true, text: "Honest degraded configurations have a working precedent: this page's own web build runs without the WordNet and FrameNet providers and labels them off in the interface." },
      { done: false, text: "Session persistence: a conversation survives restarts, and its memory boundary (part 1) is enforced by storage, not by convention." },
      { done: false, text: "An asset strategy: which providers ship in the box (WordNet, FrameNet), which load on demand, and what the system honestly cannot do in each configuration — labelled, as this page labels its own build." },
      { done: false, text: "A first served surface: the simplest real one (a local web page over the same engine is the dashboard's own precedent), before any hosted deployment is considered." },
      { done: false, text: "Operations basics sized to the project: trace logging on by default, the failure wall's exhibits reproducible from logs, and the gardener (part 6) reading the same traces in development." },
    ],
    requirements: [
      "The core conversation loop must run fully offline against the local graph; connectivity buys reach, never basic function.",
      "No heavy stack in front of the user: where the runtime crosses awkward layers, a humane surface absorbs them — setup is a guided path, not a ritual.",
      "Degraded configurations say so: a build without a provider labels that provider off, in the interface, before it is asked a question it cannot answer.",
    ],
    source: "fork design records (lightweight shape) · demo/dashboard build notes (provider-off labelling)",
  },
];
