// system-map.ts — the registry of the system.
//
// Every element on the schematic map is an entry here, and every entry
// is a place in this directory tree: a node's id IS its path (the
// System itself is the ai-system/ directory). The displayed map is
// drawn from this file, so the map and the code cannot drift apart
// without the correspondence check (npm run ai:check) failing.
//
// A node's state is read off its percent completed to goal:
//   0     -> placeholder (scaffold only; the function lives elsewhere
//            or nowhere yet — currentCode says where)
//   1-99  -> partial
//   100   -> functional
// External sources (person, clock, weather) carry no percent.
//
// Presentation lives in system-layout.ts, NOT here: this file says
// what exists, what it is, how complete it is and what connects to
// what. The layout file says only where things sit on the page.

export interface SystemNode {
  id: string;
  title: string;
  type: "Container" | "Unit" | "Store" | "Register" | "Table" | "Gate" | "Router" | "Source" | "Surface";
  parent: string | null;
  state: "placeholder" | "partial" | "functional" | "external";
  percent: number | null;
  path: string | null;
  file: string | null;
  external: boolean;
  currentCode: string | null;
  summary: string;
}

export interface SystemCord {
  from: string;
  to: string;
  kind: "pathway" | "connection";
  label: string | null;
}

export interface SystemMap {
  version: number;
  nodes: SystemNode[];
  cords: SystemCord[];
  traces: Record<string, string[]>;
}

// <map-data>
export const SYSTEM_MAP: SystemMap = {
  "version": 1,
  "nodes": [
    {
      "id": "system",
      "title": "System",
      "type": "Container",
      "parent": null,
      "state": "partial",
      "percent": 55,
      "path": ".",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "The whole system. Configuration-neutral; the chat configuration is its first."
    },
    {
      "id": "configuration",
      "title": "Configuration",
      "type": "Register",
      "parent": "system",
      "state": "partial",
      "percent": 50,
      "path": "configuration",
      "file": null,
      "external": false,
      "currentCode": "src/fork/disposition.ts (session setup)",
      "summary": "Which configuration the system runs — chat first. Held as a register on the System frame."
    },
    {
      "id": "awareness",
      "title": "Awareness Unit",
      "type": "Unit",
      "parent": "system",
      "state": "partial",
      "percent": 35,
      "path": "awareness",
      "file": null,
      "external": false,
      "currentCode": "fragments in src/fork/session.ts",
      "summary": "Knows where it is, who it is, what is around it, and what is currently happening."
    },
    {
      "id": "awareness/self",
      "title": "Self",
      "type": "Container",
      "parent": "awareness",
      "state": "partial",
      "percent": 15,
      "path": "awareness/self",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "The system's picture of itself."
    },
    {
      "id": "awareness/self/identity",
      "title": "Identity",
      "type": "Table",
      "parent": "awareness/self",
      "state": "placeholder",
      "percent": 0,
      "path": null,
      "file": "identity.ts",
      "external": false,
      "currentCode": "none",
      "summary": "Who the system is. Not yet written anywhere."
    },
    {
      "id": "awareness/self/capabilities",
      "title": "Capabilities & limits",
      "type": "Table",
      "parent": "awareness/self",
      "state": "placeholder",
      "percent": 0,
      "path": null,
      "file": "capabilities.ts",
      "external": false,
      "currentCode": "none",
      "summary": "What the system can and cannot do, in its own terms. Not yet written."
    },
    {
      "id": "awareness/self/disposition",
      "title": "Current disposition",
      "type": "Register",
      "parent": "awareness/self",
      "state": "partial",
      "percent": 80,
      "path": null,
      "file": "disposition.ts",
      "external": false,
      "currentCode": "src/fork/disposition.ts, src/fork/composition.ts",
      "summary": "The live composition for this session, copied from its table at open."
    },
    {
      "id": "awareness/self/own-state",
      "title": "Own state",
      "type": "Register",
      "parent": "awareness/self",
      "state": "partial",
      "percent": 30,
      "path": null,
      "file": "own-state.ts",
      "external": false,
      "currentCode": "partial — session record",
      "summary": "How the system itself is doing right now."
    },
    {
      "id": "awareness/place-and-time",
      "title": "Place & Time",
      "type": "Container",
      "parent": "awareness",
      "state": "partial",
      "percent": 70,
      "path": "awareness/place-and-time",
      "file": null,
      "external": false,
      "currentCode": "src/fork/session.ts (awareness frame)",
      "summary": "Where and when the system is operating."
    },
    {
      "id": "awareness/place-and-time/season-daypart",
      "title": "Season & daypart",
      "type": "Register",
      "parent": "awareness/place-and-time",
      "state": "partial",
      "percent": 85,
      "path": null,
      "file": "season-daypart.ts",
      "external": false,
      "currentCode": "src/fork/session.ts",
      "summary": "Season and daypart, classified from the shell's clock against a table."
    },
    {
      "id": "awareness/place-and-time/channel",
      "title": "Surface & channel",
      "type": "Register",
      "parent": "awareness/place-and-time",
      "state": "partial",
      "percent": 40,
      "path": null,
      "file": "channel.ts",
      "external": false,
      "currentCode": "partial — dashboard build labels",
      "summary": "Which surface and channel the system is speaking through."
    },
    {
      "id": "awareness/surroundings",
      "title": "Surroundings",
      "type": "Container",
      "parent": "awareness",
      "state": "partial",
      "percent": 25,
      "path": "awareness/surroundings",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "Who and what is around the system."
    },
    {
      "id": "awareness/surroundings/interlocutor-standing",
      "title": "Interlocutor standing",
      "type": "Register",
      "parent": "awareness/surroundings",
      "state": "partial",
      "percent": 10,
      "path": null,
      "file": "interlocutor-standing.ts",
      "external": false,
      "currentCode": "almost none",
      "summary": "Who the system is talking to: identity known or unknown, first contact or returning."
    },
    {
      "id": "awareness/surroundings/standing-topics",
      "title": "Standing topics",
      "type": "Register",
      "parent": "awareness/surroundings",
      "state": "partial",
      "percent": 75,
      "path": null,
      "file": "standing-topics.ts",
      "external": false,
      "currentCode": "src/fork/session.ts (topics)",
      "summary": "The topics currently standing in the interaction."
    },
    {
      "id": "awareness/surroundings/other-presences",
      "title": "Other presences",
      "type": "Register",
      "parent": "awareness/surroundings",
      "state": "placeholder",
      "percent": 0,
      "path": null,
      "file": "other-presences.ts",
      "external": false,
      "currentCode": "none",
      "summary": "Anyone or anything else present. Not tracked yet."
    },
    {
      "id": "awareness/current-activity",
      "title": "Current Activity",
      "type": "Container",
      "parent": "awareness",
      "state": "partial",
      "percent": 30,
      "path": "awareness/current-activity",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "What is happening right now."
    },
    {
      "id": "awareness/current-activity/composer",
      "title": "Composer",
      "type": "Unit",
      "parent": "awareness/current-activity",
      "state": "placeholder",
      "percent": 0,
      "path": null,
      "file": "composer.ts",
      "external": false,
      "currentCode": "none",
      "summary": "The one worker of Awareness: composes the situation statement from the registers. Not built."
    },
    {
      "id": "awareness/current-activity/situation-statement",
      "title": "Situation statement",
      "type": "Register",
      "parent": "awareness/current-activity",
      "state": "partial",
      "percent": 15,
      "path": null,
      "file": "situation-statement.ts",
      "external": false,
      "currentCode": "almost none",
      "summary": "The composed sentence of the situation — e.g. 'I am chatting to a person with unknown identity.'"
    },
    {
      "id": "awareness/current-activity/last-act",
      "title": "Last act",
      "type": "Register",
      "parent": "awareness/current-activity",
      "state": "partial",
      "percent": 35,
      "path": null,
      "file": "last-act.ts",
      "external": false,
      "currentCode": "src/fork/turn.ts (turn record)",
      "summary": "The last thing the system did."
    },
    {
      "id": "awareness/current-activity/open-gaps",
      "title": "Open gaps",
      "type": "Register",
      "parent": "awareness/current-activity",
      "state": "partial",
      "percent": 55,
      "path": null,
      "file": "open-gaps.ts",
      "external": false,
      "currentCode": "src/fork/plan.ts (gap questions)",
      "summary": "What is currently missing that the other party could supply."
    },
    {
      "id": "lpu",
      "title": "LPU — Language Processing Unit",
      "type": "Container",
      "parent": "system",
      "state": "partial",
      "percent": 80,
      "path": "lpu",
      "file": null,
      "external": false,
      "currentCode": "src/fork/ (the sentence layer)",
      "summary": "Language in, language out: the Parser and the Generator, and aspect units to come."
    },
    {
      "id": "lpu/parser",
      "title": "Parser Unit",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 85,
      "path": "lpu/parser",
      "file": null,
      "external": false,
      "currentCode": "src/fork/parse.ts, sentence.ts, join.ts, check.ts",
      "summary": "Sentence in, meaning graph out. IN and OUT ports."
    },
    {
      "id": "lpu/parser/token",
      "title": "Token",
      "type": "Unit",
      "parent": "lpu/parser",
      "state": "partial",
      "percent": 95,
      "path": "lpu/parser/token",
      "file": null,
      "external": false,
      "currentCode": "src/fork/sentence.ts, src/fork/symspell.ts, src/fork/token-resolve.ts",
      "summary": "Breaks the sentence into addressed tokens, and resolves the words it does not recognise — Variant Graph first, then the ported SymSpell matcher and its segmentation — every resolution recorded with its confidence in the trace, and an unresolved word locating the gap at itself."
    },
    {
      "id": "lpu/parser/sense",
      "title": "Sense",
      "type": "Unit",
      "parent": "lpu/parser",
      "state": "partial",
      "percent": 70,
      "path": "lpu/parser/sense",
      "file": null,
      "external": false,
      "currentCode": "src/fork/sense.ts, wordnet-lex.ts",
      "summary": "Chooses each word's sense by coherence over the meaning graph."
    },
    {
      "id": "lpu/parser/valency",
      "title": "Valency",
      "type": "Unit",
      "parent": "lpu/parser",
      "state": "partial",
      "percent": 90,
      "path": "lpu/parser/valency",
      "file": null,
      "external": false,
      "currentCode": "src/fork/framenet-lex.ts, src/fork/verbnet-lex.ts, features.ts",
      "summary": "What arguments each verb takes, and in which roles. Two evidence providers: FrameNet frame signatures (framenet-lex.ts) for derived verbs with a FrameNet LU, and — since 2026-11-17 — VerbNet 3.3 frame shapes (verbnet-lex.ts over data/verbnet/) checking the permissive frames of the derived verbs FrameNet does not reach: a realised argument structure no VerbNet frame allows is a located valency failure (valency-verbnet-disallowed), where the checker was previously blind."
    },
    {
      "id": "lpu/parser/aspect-and-forms",
      "title": "Aspect & Forms",
      "type": "Unit",
      "parent": "lpu/parser",
      "state": "partial",
      "percent": 90,
      "path": "lpu/parser/aspect-and-forms",
      "file": null,
      "external": false,
      "currentCode": "src/fork/aspect.ts",
      "summary": "Aspect as feature bundles; irregular forms selected, both languages."
    },
    {
      "id": "lpu/semantic-assessment",
      "title": "SemanticAssessment",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 65,
      "path": "lpu/semantic-assessment",
      "file": null,
      "external": false,
      "currentCode": "src/fork/semantic-object.ts, src/fork/assess.ts",
      "summary": "Answers 'What is this?' — what the text is saying. Takes the Parser's structure and renders the assessment of the utterance as a whole: its kind (a greeting, a question, a feeling-statement), what it asserts or asks, what it leaves unexpressed, its register and mood — packaged as a semantic object that then travels the system: Coherence judges its fit, the Planner chooses the move that answers its kind, Session records it as the turn's event. Placed 2026-11-16 at the owner's direction. Slice 1 built (shadow objects): assess.ts creates an object for every parsed utterance — kind, holes, grounding, stream role — stored on the session and named in the trace; nothing reads the objects yet. Every object now also carries its senses face (via the Senses-Scening Unit, 2026-11-17) and, where the utterance carries quantity content, the QuantificationLanguageUnit's quantity mentions, which the turn loop applies to the Session's quantity ledger."
    },
    {
      "id": "lpu/language-emotion-desire-unit",
      "title": "LanguageEmotionDesireUnit",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 45,
      "path": "lpu/language-emotion-desire-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/ledu.ts",
      "summary": "The LEDU: the LPU's bridge to the EmotionDesireUnit, maintained inside the LPU. Maps emotion and desire as expressed in language — 'furious', 'longing to see her' — into the EDU's 七情六欲 framework on the way in, and an object's emotion or desire aspect back into language on the way out. Uses the EDU; the mapping is language's, the framework is the EDU's. Placed 2026-11-16 at the owner's direction; nothing built."
    },
    {
      "id": "lpu/senses-scening-unit",
      "title": "Senses-Scening Unit",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 55,
      "path": "lpu/senses-scening-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/senses-scening.ts, src/fork/qualreas.ts",
      "summary": "The Senses-Scening Unit: the LPU's unit that produces the senses/scene part of a semantic object, maintained inside the LPU. It maps sensory content as expressed in language — 'salty', 'green', 'loudly', 'fragrant', 'cold', 'overripe' — through the SenseUnit's framework (channel, discrimination, the OKU's filed phase where one exists), and binds the entries across ALL channels into one described scene: the entities, their sensory qualities, and the spatial arrangement where the sentence gives one (the banana sat on the table). A scene is recorded whenever any channel has an entry; a turn with no sensory content records every channel none and no scene. Only what the sentence says enters the face — implied channels are Coherence's derived-tier annotations, never entries. SemanticAssessment consults it at creation for person and reply objects alike. Uses the SenseUnit; the mapping is language's, the framework is the SenseUnit's. Placed 2026-11-17 at the owner's direction; inbound built the same day, the outbound mapping back into wording still to build. Since 2026-11-17 the scene's standing placements also form a qualitative constraint network (qualreas.ts: RCC-8 algebra data from qualreas, MIT, and our path-consistency engine): derived relations are computed over the placements at every scene update, and an inconsistent placement set is flagged on the scene with a spatial-consistency unknown opened."
    },
    {
      "id": "lpu/quantification-language-unit",
      "title": "QuantificationLanguageUnit",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 45,
      "path": "lpu/quantification-language-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/quantification-language.ts",
      "summary": "The QuantificationLanguageUnit: the LPU's bridge to the QuantificationUnit, maintained inside the LPU (the EDU/LEDU pattern). Inbound: quantity as expressed in language — numerals and number words (one..twenty, hundred, thousand; digits), quantifier words (all/some/none/each/every) as bounded quantity kinds, construction-implied counts, unit words via the UnitsMeasurement Unit — read from the parse as quantity mentions, with the OKU Numbers slice's filed reading attached where one exists; SemanticAssessment attaches the mentions to the object at creation and the turn loop applies them to the Session's ledger. Outbound: a tracked quantity rendered back into language ('two apples') — the how-many reader speaks through it. Uses the QuantificationUnit at its home inside the OKU; the mapping is language's, the framework is the QuantificationUnit's. Placed and built 2026-11-17 at the owner's direction."
    },
    {
      "id": "lpu/generator",
      "title": "Generator Unit",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 80,
      "path": "lpu/generator",
      "file": null,
      "external": false,
      "currentCode": "src/fork/generate.ts",
      "summary": "Meaning graph in, sentence out — the Parser run in reverse."
    },
    {
      "id": "lpu/unplaced",
      "title": "Unplaced",
      "type": "Unit",
      "parent": "lpu",
      "state": "placeholder",
      "percent": 0,
      "path": "lpu/unplaced",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "Room for the LPU's other aspect units, to be settled."
    },
    {
      "id": "session-and-situation",
      "title": "Session & Situation",
      "type": "Register",
      "parent": "system",
      "state": "partial",
      "percent": 75,
      "path": "session-and-situation",
      "file": null,
      "external": false,
      "currentCode": "src/fork/session.ts, turn.ts",
      "summary": "The record of an ongoing interaction — general machinery; chat is its first use."
    },
    {
      "id": "session-and-situation/states-and-origins",
      "title": "States & origins",
      "type": "Register",
      "parent": "session-and-situation",
      "state": "partial",
      "percent": 85,
      "path": null,
      "file": "states-and-origins.ts",
      "external": false,
      "currentCode": "src/fork/session.ts",
      "summary": "Established states, each carrying the leg it came from, its support and tier."
    },
    {
      "id": "session-and-situation/events",
      "title": "Events",
      "type": "Register",
      "parent": "session-and-situation",
      "state": "partial",
      "percent": 70,
      "path": null,
      "file": "events.ts",
      "external": false,
      "currentCode": "src/fork/session.ts, turn.ts",
      "summary": "The events the interaction has established."
    },
    {
      "id": "session-and-situation/topics",
      "title": "Topics",
      "type": "Register",
      "parent": "session-and-situation",
      "state": "partial",
      "percent": 80,
      "path": null,
      "file": "topics.ts",
      "external": false,
      "currentCode": "src/fork/session.ts",
      "summary": "First-class topics: the turns they were raised and last touched."
    },
    {
      "id": "session-and-situation/open-unknowns",
      "title": "Open unknowns",
      "type": "Register",
      "parent": "session-and-situation",
      "state": "partial",
      "percent": 50,
      "path": "session-and-situation/open-unknowns",
      "file": null,
      "external": false,
      "currentCode": "src/fork/session.ts (listOpenUnknowns — a derived view over session.scenes)",
      "summary": "The register of currently-open unknowns across the conversation's scenes: facts about established scene entities that no turn has supplied yet (the airport's city), held as explicit typed slots ON the scene graphs themselves (owner's ruling, 2026-11-17). This register is a derived view over the scenes — one source of truth, no second store. Awareness's Open gaps reads from it; it does not own the slots. Built 2026-11-17: the view and the mint/fill wiring (the Senses-Scening Unit places fragments into the running scene); one slot-kind rule filed so far (airport → city)."
    },
    {
      "id": "session-and-situation/corrections",
      "title": "Corrections",
      "type": "Register",
      "parent": "session-and-situation",
      "state": "partial",
      "percent": 80,
      "path": null,
      "file": "corrections.ts",
      "external": false,
      "currentCode": "src/fork/session.ts",
      "summary": "Corrections recorded as supersession deltas, never edits in place."
    },
    {
      "id": "knowledge",
      "title": "Knowledge",
      "type": "Container",
      "parent": "system",
      "state": "partial",
      "percent": 70,
      "path": "knowledge",
      "file": null,
      "external": false,
      "currentCode": "src/fork/classify.ts and the foundation graph",
      "summary": "What the system holds as stores: the lexicon, the variant graph, and the banked stores. The correspondence graph and the classification table moved to the Ontology Knowledge Unit in the OntologyCore (owner's direction, 2026-11-16)."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/correspondence-graph",
      "title": "Correspondence graph",
      "type": "Store",
      "parent": "ontology-core/ontology-knowledge-unit",
      "state": "partial",
      "percent": 75,
      "path": "ontology-core/ontology-knowledge-unit/correspondence-graph",
      "file": null,
      "external": false,
      "currentCode": "src/fork/classify.ts; foundation src/graph.ts, src/seed.ts",
      "summary": "The meaning graph: correspondences, with the generating and controlling cycles as its relations."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/classification",
      "title": "Classification",
      "type": "Table",
      "parent": "ontology-core/ontology-knowledge-unit",
      "state": "partial",
      "percent": 60,
      "path": "ontology-core/ontology-knowledge-unit/classification",
      "file": null,
      "external": false,
      "currentCode": "src/fork/classify.ts",
      "summary": "The classification table: (concept, aspect) assertions with provenance and confidence. 164 entries; coverage is the constraint."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/quantification-unit",
      "title": "QuantificationUnit",
      "type": "Unit",
      "parent": "ontology-core/ontology-knowledge-unit",
      "state": "partial",
      "percent": 45,
      "path": "ontology-core/ontology-knowledge-unit/quantification-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/quantification.ts",
      "summary": "The QuantificationUnit: the system's authority on quantity, living INSIDE the Ontology Knowledge Unit over its Numbers slice (owner's placement, 2026-11-17 — moved into the OKU, superseding an earlier System-level seat). It is the specialist reader of the OKU Numbers slice — Suwen ch. 4's number row (eight/Wood, seven/Fire, five/Earth, nine/Metal, six/Water), banked in the ingested store — and keeps no private number lore. Its three jobs: READ quantities stated and implied (between implies two); TRACK them in a ledger held on the Session (stated amounts, event deltas as transfers/gains, each a new record, the latest standing as current); COMPUTE from the tracked state (how-many answers, and inconsistency flags — a delta larger than the tracked amount is flagged, never silently applied). The Luoshu is built in as its working apparatus (the nine palaces, the 15 invariant, the flight path) — machinery in the unit, distinct from the OKU's filed numbers; the tension stands labelled (ch. 4 files Wood/east as 8; the Luoshu places 3 in the east palace, 8 in the north-east). Language reaches it through the LPU's QuantificationLanguageUnit. Placed and built 2026-11-17 at the owner's direction."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/quantification-unit/units-measurement-unit",
      "title": "UnitsMeasurement Unit",
      "type": "Unit",
      "parent": "ontology-core/ontology-knowledge-unit/quantification-unit",
      "state": "partial",
      "percent": 60,
      "path": "ontology-core/ontology-knowledge-unit/quantification-unit/units-measurement-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/units-measurement.ts",
      "summary": "The UnitsMeasurement Unit: the QuantificationUnit's sub-unit for units of measurement (owner, 2026-11-17 — nested inside the QuantificationUnit). A quantity is a number OF something: this unit names the somethings — each unit's dimension (weight, length, volume, count, temperature) and its factor to the dimension's base unit, across three systems in one table: traditional Chinese （銖/兩/斤， 寸/尺/丈/里， 合/升/斗， and the counting measure words 個/隻/條/本/張/頭 — the units the banked classical quantities, bencao dosages above all, are stated in), Imperial (ounce/pound/stone, inch/foot/yard/mile, imperial pint/gallon), and SI (gram/kilogram, metre, litre). Conversion runs only within a dimension; across dimensions it refuses, typed. Temperature is a scale, not a factor: Fahrenheit/Celsius convert by offset and ratio, separately. Traditional factors are the MODERN STANDARDISED values （斤 = 500 g, 兩 = 50 g, 里 = 500 m, 尺 = 1/3 m, 升 = 1 L), labelled as such — historical values varied by dynasty and no dynasty table is banked. Placed and built 2026-11-17. Extended the same day with the QUDT port: every SI/Imperial factor cross-checked against the QUDT units vocabulary (CC BY 4.0; all shared units agreed), and QUDT-supplied coverage added under source 'qudt' — the US liquid variants distinguished from their Imperial namesakes (us-pint/us-gallon/us-quart/us-fluid-ounce, imperial quart and fluid ounce), plus two new dimensions: area (acre) and pressure (pascal, psi). The hand table remains the authority; traditional rows untouched."
    },
    {
      "id": "knowledge/lexicon",
      "title": "Lexicon",
      "type": "Store",
      "parent": "knowledge",
      "state": "partial",
      "percent": 80,
      "path": "knowledge/lexicon",
      "file": null,
      "external": false,
      "currentCode": "src/fork/wordnet-lex.ts, framenet-lex.ts, verbnet-lex.ts",
      "summary": "Word senses and verb frames the parser consults: the WordNet extract (wordnet-lex.ts), FrameNet frame signatures (framenet-lex.ts) and, since 2026-11-17, VerbNet 3.3 frame shapes (verbnet-lex.ts over data/verbnet/) for the derived verbs FrameNet does not reach."
    },
    {
      "id": "knowledge/variant-graph",
      "title": "Variant Graph",
      "type": "Store",
      "parent": "knowledge",
      "state": "partial",
      "percent": 45,
      "path": "knowledge/variant-graph",
      "file": null,
      "external": false,
      "currentCode": "ai-system/knowledge/variant-graph/variants.json, consulted by src/fork/token-resolve.ts",
      "summary": "AnSci's own graph of surface forms: variant nodes linked to the canonical forms they resolve to — shortforms, common misspellings, apostrophe-less contractions — each edge carrying register, provenance and confidence. Populated from published lists on the web, imported as sourced data, never hand-written into code. Consulted by Token during resolution; what is merely close is computed by the matcher, never stored; confirmed resolutions can be banked here."
    },
    {
      "id": "knowledge/banked",
      "title": "Banked stores",
      "type": "Store",
      "parent": "knowledge",
      "state": "partial",
      "percent": 65,
      "path": "knowledge/banked",
      "file": null,
      "external": false,
      "currentCode": "src/fork/flavor-bridge.ts, ingested.ts",
      "summary": "What the Retrieval Harborer has admitted: derived flavours, ingested assertions — derived layer only, each reversible."
    },
    {
      "id": "reasoning",
      "title": "Reasoning",
      "type": "Container",
      "parent": "system",
      "state": "partial",
      "percent": 80,
      "path": "reasoning",
      "file": null,
      "external": false,
      "currentCode": "src/fork/plan.ts, pricing.ts",
      "summary": "Derivation over the graph, and the planning of a reply."
    },
    {
      "id": "reasoning/derivation",
      "title": "Derivation",
      "type": "Unit",
      "parent": "reasoning",
      "state": "partial",
      "percent": 85,
      "path": "reasoning/derivation",
      "file": null,
      "external": false,
      "currentCode": "src/fork/turn.ts (deriveSentence), check.ts",
      "summary": "The cycle walks: what follows from what was said, by correspondence."
    },
    {
      "id": "reasoning/planner",
      "title": "Planner",
      "type": "Unit",
      "parent": "reasoning",
      "state": "partial",
      "percent": 80,
      "path": "reasoning/planner",
      "file": null,
      "external": false,
      "currentCode": "src/fork/plan.ts, src/fork/reply.ts (reply objects)",
      "summary": "Builds the reply's meaning graph from derivations and the session record; chooses the move."
    },
    {
      "id": "reasoning/pricing",
      "title": "Pricing",
      "type": "Table",
      "parent": "reasoning",
      "state": "partial",
      "percent": 85,
      "path": "reasoning/pricing",
      "file": null,
      "external": false,
      "currentCode": "src/fork/pricing.ts",
      "summary": "Strength pricing: weakest-tier ceiling times support; the level-to-surface ladder."
    },
    {
      "id": "reasoning/decline-floor",
      "title": "Decline floor",
      "type": "Gate",
      "parent": "reasoning",
      "state": "partial",
      "percent": 90,
      "path": "reasoning/decline-floor",
      "file": null,
      "external": false,
      "currentCode": "src/fork/pricing.ts, plan.ts",
      "summary": "Stands in the reply path: below the floor, the turn declines with its ground recorded."
    },
    {
      "id": "reasoning/compositions",
      "title": "Composition definitions",
      "type": "Table",
      "parent": "reasoning",
      "state": "partial",
      "percent": 85,
      "path": "reasoning/compositions",
      "file": null,
      "external": false,
      "currentCode": "src/fork/composition.ts",
      "summary": "The frozen composition definitions; the live copy is held in Awareness."
    },
    {
      "id": "intake",
      "title": "Intake",
      "type": "Container",
      "parent": "system",
      "state": "partial",
      "percent": 25,
      "path": "intake",
      "file": null,
      "external": false,
      "currentCode": "src/fork/cskg-feed.ts (interface only)",
      "summary": "The doorway for outside knowledge: routed, ordered, provenance-labelled."
    },
    {
      "id": "intake/router",
      "title": "Intake Router",
      "type": "Router",
      "parent": "intake",
      "state": "partial",
      "percent": 30,
      "path": "intake/router",
      "file": null,
      "external": false,
      "currentCode": "src/fork/cskg-feed.ts",
      "summary": "Walks the fixed order — local graph, CSKG, Wikidata, web, model — and stops at the first tier that answers."
    },
    {
      "id": "intake/cskg",
      "title": "CSKG",
      "type": "Source",
      "parent": "intake",
      "state": "partial",
      "percent": 50,
      "path": "intake/cskg",
      "file": null,
      "external": false,
      "currentCode": "src/fork/cskg-feed.ts, cskg-ingest.ts",
      "summary": "Relational commonsense tier. The feeder's map is widened to 21 relations: twelve concept relations whose endpoints must classify, plus the nine-relation ATOMIC at:* family anchored by an event rule (head verb + head word) rather than the concept table. Its data is a local artifact, never shipped."
    },
    {
      "id": "intake/wikidata",
      "title": "Wikidata",
      "type": "Source",
      "parent": "intake",
      "state": "placeholder",
      "percent": 0,
      "path": "intake/wikidata",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "Facts tier. Not built."
    },
    {
      "id": "intake/web",
      "title": "Web",
      "type": "Source",
      "parent": "intake",
      "state": "placeholder",
      "percent": 0,
      "path": "intake/web",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "Procedures tier. Not built."
    },
    {
      "id": "intake/model",
      "title": "Small model",
      "type": "Source",
      "parent": "intake",
      "state": "placeholder",
      "percent": 0,
      "path": "intake/model",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "Last tier, labelled as model knowledge when it speaks. Not built."
    },
    {
      "id": "retrieval-harborer",
      "title": "Retrieval Harborer",
      "type": "Unit",
      "parent": "system",
      "state": "partial",
      "percent": 45,
      "path": "retrieval-harborer",
      "file": null,
      "external": false,
      "currentCode": "src/fork/ingest.ts",
      "summary": "Keeps what was retrieved: distilled into the graph with its papers, behind its gate."
    },
    {
      "id": "retrieval-harborer/pipeline",
      "title": "Harboring pipeline",
      "type": "Unit",
      "parent": "retrieval-harborer",
      "state": "partial",
      "percent": 45,
      "path": "retrieval-harborer/pipeline",
      "file": null,
      "external": false,
      "currentCode": "src/fork/ingest.ts, cskg-ingest.ts",
      "summary": "Distils retrievals and texts into candidate assertions for the gate."
    },
    {
      "id": "retrieval-harborer/gate",
      "title": "Harboring gate",
      "type": "Gate",
      "parent": "retrieval-harborer",
      "state": "partial",
      "percent": 70,
      "path": "retrieval-harborer/gate",
      "file": null,
      "external": false,
      "currentCode": "src/fork/ingest.ts (review and apply)",
      "summary": "No citation, no insertion. Derived layer only; every admission reversible."
    },
    {
      "id": "ontology-core",
      "title": "OntologyCore",
      "type": "Container",
      "parent": "system",
      "state": "placeholder",
      "percent": 0,
      "path": "ontology-core",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "The system's ontological heart: the container for what the world is made of and how its kinds correspond, in the system's own terms. It holds the Ontology Knowledge Unit (the correspondence graph and the classification table), the EmotionDesireUnit (placed 2026-11-16) and the SenseUnit (placed 2026-11-17), at the owner's direction."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit",
      "title": "Ontology Knowledge Unit",
      "type": "Unit",
      "parent": "ontology-core",
      "state": "partial",
      "percent": 60,
      "path": "ontology-core/ontology-knowledge-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/classify.ts; foundation src/graph.ts, src/seed.ts",
      "summary": "The OKU: the OntologyCore's knowledge unit. It contains the correspondence graph and the classification table — the system's ontology as held, consultable knowledge. Placed 2026-11-16 at the owner's direction; the graph and the table moved here from Knowledge, which keeps the lexicon, the variant graph and the banked stores."
    },
    {
      "id": "ontology-core/emotion-desire-unit",
      "title": "EmotionDesireUnit",
      "type": "Unit",
      "parent": "ontology-core",
      "state": "partial",
      "percent": 50,
      "path": "ontology-core/emotion-desire-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/edu.ts, src/fork/edu-reach.ts",
      "summary": "The EDU: the system's medium-neutral authority on emotion and desire, sitting inside the OntologyCore. Holds the 七情六欲 framework — the seven emotions and six desires, their phase and organ correspondences — and answers any medium's bridge unit: what emotion or desire is this, what does it correspond to. Language reaches it through the LPU's LEDU today; in the future an IDU will contact it for the Image Processing Unit, the same way. Placed 2026-11-16 at the owner's direction; nothing built."
    },
    {
      "id": "ontology-core/sense-unit",
      "title": "SenseUnit",
      "type": "Unit",
      "parent": "ontology-core",
      "state": "partial",
      "percent": 40,
      "path": "ontology-core/sense-unit",
      "file": null,
      "external": false,
      "currentCode": "src/fork/sense-unit.ts",
      "summary": "The SenseUnit: the system's medium-neutral authority on the human senses, sitting inside the OntologyCore beside the EDU. Its contents are the join of three provenance-labelled lists, never silently harmonised: the channels from 六根/六塵 (eye→form, ear→sound, nose→smell, tongue→taste, body→touch, mind→mental objects), the per-channel discriminations from Xunzi (Tianlun's five 天官, Rongru's assignments), and the phase correspondences from the OKU's Suwen rows (orifices, colour/sound/flavour quality rows, the ch. 4 odour row, skin as tissue). Its data lives in the OKU, as the EDU's does; it is the specialist authority over that slice, not a private store. Recorded tensions stand labelled: taste double-filed (tongue/Fire, mouth/Earth), touch with no channel phase (its values carry phases), mind's phase unsettled. Boundary with the EDU: this unit owns the channels; the EDU owns the cravings OF the channels. Language reaches it through the LPU's Senses-Scening Unit. Placed 2026-11-17 at the owner's direction; the naming authority built the same day (channel/discrimination lookups, the overripe cross-channel implication filed as derived-tier knowledge); no larger-graph reach yet."
    },
    {
      "id": "verbalizer",
      "title": "Verbalizer",
      "type": "Unit",
      "parent": "system",
      "state": "partial",
      "percent": 40,
      "path": "verbalizer",
      "file": null,
      "external": false,
      "currentCode": "speaking sites in src/fork/plan.ts + generate.ts, not yet separated",
      "summary": "Decides that something is said and shapes the act of saying it. Uses the LPU; is not in it."
    },
    {
      "id": "coherence",
      "title": "Coherence",
      "type": "Unit",
      "parent": "system",
      "state": "placeholder",
      "percent": 0,
      "path": "coherence",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "The system's coherence demand, as a unit (the CoherenceProcessor of the worked example): analyses what arrives against who is talking, what is known of the situation, and what has been said — and says so when it doesn't make sense. Not one checkpoint: different units use it at different stages — on what comes in, at several levels, and on what goes out (the Verbalizer uses it to check what is said as it is verbalized). Consults Awareness and Session & Situation. Design capture: docs/coherence-note.md."
    },
    {
      "id": "coherence/coherence-demand",
      "title": "Coherence Demand",
      "type": "Register",
      "parent": "coherence",
      "state": "placeholder",
      "percent": 0,
      "path": "coherence/coherence-demand",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "The standing demand that things make sense, held as state: the current degree level of not-knowing the situation, and the system's personal boundaries. When the level is high and the input doesn't fit, the system says so and replies accordingly."
    },
    {
      "id": "coherence/coherence-analysis",
      "title": "Coherence Analysis",
      "type": "Unit",
      "parent": "coherence",
      "state": "partial",
      "percent": 55,
      "path": "coherence/coherence-analysis",
      "file": null,
      "external": false,
      "currentCode": "src/fork/coherence.ts",
      "summary": "Works in both directions, at several levels. Inbound: how what comes in makes sense — the words and the sentence, the situation, the stream of what has been said; what doesn't fit, and what information is missing (e.g. an unknown person's 'I was furious' → 'Furious about what?'). Outbound: used by the Verbalizer — what goes out is checked as it is verbalized, so that what is said makes sense too."
    },
    {
      "id": "surfaces",
      "title": "Surfaces",
      "type": "Container",
      "parent": "system",
      "state": "partial",
      "percent": 70,
      "path": "surfaces",
      "file": null,
      "external": false,
      "currentCode": "demo/dashboard/",
      "summary": "Where output leaves and is seen."
    },
    {
      "id": "surfaces/root-page",
      "title": "Root page — this map",
      "type": "Surface",
      "parent": "surfaces",
      "state": "partial",
      "percent": 90,
      "path": "surfaces/root-page",
      "file": null,
      "external": false,
      "currentCode": "demo/dashboard/root/index.html",
      "summary": "The schematic root page, live at the site root."
    },
    {
      "id": "surfaces/dashboard",
      "title": "Dashboard — /dashboard/",
      "type": "Surface",
      "parent": "surfaces",
      "state": "partial",
      "percent": 85,
      "path": "surfaces/dashboard",
      "file": null,
      "external": false,
      "currentCode": "demo/dashboard/src/",
      "summary": "The capability and evaluation dashboard, live at /dashboard/."
    },
    {
      "id": "surfaces/chat",
      "title": "Chat surface",
      "type": "Surface",
      "parent": "surfaces",
      "state": "partial",
      "percent": 45,
      "path": "surfaces/chat",
      "file": null,
      "external": false,
      "currentCode": "scripts/fork-chat.mjs",
      "summary": "The parser demonstrator in a terminal. A demonstrator, not a chat."
    },
    {
      "id": "surfaces/trace-view",
      "title": "Trace view",
      "type": "Surface",
      "parent": "surfaces",
      "state": "partial",
      "percent": 60,
      "path": "surfaces/trace-view",
      "file": null,
      "external": false,
      "currentCode": "demo/dashboard/src/Ask.tsx",
      "summary": "Turn traces made inspectable in the dashboard."
    },
    {
      "id": "unplaced",
      "title": "Unplaced",
      "type": "Container",
      "parent": "system",
      "state": "placeholder",
      "percent": 0,
      "path": "unplaced",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "Further units; territory not yet categorised."
    },
    {
      "id": "person",
      "title": "Person",
      "type": "Source",
      "parent": "system",
      "state": "external",
      "percent": null,
      "path": null,
      "file": null,
      "external": true,
      "currentCode": null,
      "summary": "The person speaking. Outside the boundary; the source of utterances."
    },
    {
      "id": "clock",
      "title": "Clock",
      "type": "Source",
      "parent": "system",
      "state": "external",
      "percent": null,
      "path": null,
      "file": null,
      "external": true,
      "currentCode": null,
      "summary": "The shell's clock, on the System edge."
    },
    {
      "id": "weather",
      "title": "Weather",
      "type": "Source",
      "parent": "system",
      "state": "external",
      "percent": null,
      "path": null,
      "file": null,
      "external": true,
      "currentCode": null,
      "summary": "A weather feed, when one is connected."
    }
  ],
  "cords": [
    {
      "from": "reasoning/planner",
      "to": "ontology-core/ontology-knowledge-unit/correspondence-graph",
      "kind": "connection",
      "label": "consults"
    },
    {
      "from": "reasoning/planner",
      "to": "session-and-situation",
      "kind": "connection",
      "label": "consults"
    },
    {
      "from": "reasoning/derivation",
      "to": "ontology-core/ontology-knowledge-unit/correspondence-graph",
      "kind": "connection",
      "label": "consults"
    },
    {
      "from": "lpu/parser/sense",
      "to": "knowledge/lexicon",
      "kind": "connection",
      "label": "consults"
    },
    {
      "from": "verbalizer",
      "to": "lpu/generator",
      "kind": "connection",
      "label": "uses"
    },
    {
      "from": "awareness/current-activity/composer",
      "to": "awareness/current-activity/situation-statement",
      "kind": "connection",
      "label": "writes"
    },
    {
      "from": "awareness/surroundings/standing-topics",
      "to": "session-and-situation/topics",
      "kind": "connection",
      "label": "reads"
    },
    {
      "from": "intake/router",
      "to": "ontology-core/ontology-knowledge-unit/correspondence-graph",
      "kind": "connection",
      "label": "asks first"
    },
    {
      "from": "retrieval-harborer/gate",
      "to": "knowledge/banked",
      "kind": "connection",
      "label": "admits into"
    },
    {
      "from": "reasoning/pricing",
      "to": "reasoning/planner",
      "kind": "connection",
      "label": "prices"
    },
    {
      "from": "reasoning/decline-floor",
      "to": "reasoning/planner",
      "kind": "connection",
      "label": "floors"
    },
    {
      "from": "configuration",
      "to": "awareness/self/disposition",
      "kind": "connection",
      "label": "sets at open"
    },
    {
      "from": "person",
      "to": "lpu/parser",
      "kind": "pathway",
      "label": null
    },
    {
      "from": "lpu/generator",
      "to": "verbalizer",
      "kind": "pathway",
      "label": null
    },
    {
      "from": "coherence",
      "to": "awareness",
      "kind": "connection",
      "label": "consults"
    },
    {
      "from": "coherence",
      "to": "session-and-situation",
      "kind": "connection",
      "label": "consults"
    },
    {
      "from": "verbalizer",
      "to": "coherence",
      "kind": "connection",
      "label": "uses"
    },
    {
      "from": "lpu/parser/token",
      "to": "knowledge/variant-graph",
      "kind": "connection",
      "label": "consults"
    },
    {
      "from": "lpu/language-emotion-desire-unit",
      "to": "ontology-core/emotion-desire-unit",
      "kind": "connection",
      "label": "uses"
    },
    {
      "from": "lpu/senses-scening-unit",
      "to": "ontology-core/sense-unit",
      "kind": "connection",
      "label": "uses"
    },
    {
      "from": "lpu/quantification-language-unit",
      "to": "ontology-core/ontology-knowledge-unit/quantification-unit",
      "kind": "connection",
      "label": "uses"
    }
  ],
  "traces": {
    "hello": [
      "person",
      "lpu/parser/token",
      "lpu/parser/sense",
      "lpu/parser/valency",
      "lpu/parser/aspect-and-forms",
      "lpu/parser",
      "session-and-situation",
      "awareness",
      "reasoning/derivation",
      "reasoning/planner",
      "lpu/generator",
      "verbalizer",
      "surfaces/chat"
    ]
  }
};
// </map-data>
