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
      "currentCode": "src/ansci/disposition.ts (session setup)",
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
      "currentCode": "fragments in src/ansci/session.ts",
      "summary": "Knows where it is, who it is, what is around it, and what is currently happening."
    },
    {
      "id": "monitoring",
      "title": "Monitoring Unit",
      "type": "Unit",
      "parent": "system",
      "state": "partial",
      "percent": 40,
      "path": "monitoring",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/monitoring.ts (the register, the standing comparison, the endings) and src/ansci/monitoring-turn.ts (the wired layer: pricing, check execution, the refresh proposal)",
      "summary": "Keeps standing watches: a subject and a source, checked at an interval under a change rule, for a registrar, until an expiry — raising a demand only when a check finds change, its no-change checks recorded in full and raising nothing."
    },
    {
      "id": "awareness/self",
      "title": "Self",
      "type": "Container",
      "parent": "awareness",
      "state": "partial",
      "percent": 25,
      "path": "awareness/self",
      "file": null,
      "external": false,
      "currentCode": "—",
      "summary": "The system's picture of itself. Its Identity and Capabilities & limits tables are built (2026-11-18, Social Unit S3) and read through the Social Unit; Disposition and Own state stand as they were."
    },
    {
      "id": "awareness/self/identity",
      "title": "Identity",
      "type": "Table",
      "parent": "awareness/self",
      "state": "partial",
      "percent": 75,
      "path": null,
      "file": null,
      "external": false,
      "currentCode": "src/ansci/identity.ts",
      "summary": "Who the system is, as data: the name (AnSci) and the kind line, in visitor language. Built 2026-11-18 (Social Unit S3): the Social Unit requests these facts for a self-query and holds no copy. The text is configuration — its final wording is the owner's."
    },
    {
      "id": "awareness/self/capabilities",
      "title": "Capabilities & limits",
      "type": "Table",
      "parent": "awareness/self",
      "state": "partial",
      "percent": 75,
      "path": null,
      "file": null,
      "external": false,
      "currentCode": "src/ansci/capabilities.ts",
      "summary": "What the system can and cannot do, in its own terms: two lists of plain first-person sentences, the limits as candid as the capabilities. Built 2026-11-18 (Social Unit S3): the Social Unit requests these facts for a capability self-query and holds no copy. The text is configuration — its final wording is the owner's."
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
      "currentCode": "src/ansci/disposition.ts, src/ansci/composition.ts",
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
      "currentCode": "src/ansci/session.ts (awareness frame)",
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
      "currentCode": "src/ansci/session.ts",
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
      "id": "awareness/surroundings/standing-topics",
      "title": "Standing topics",
      "type": "Register",
      "parent": "awareness/surroundings",
      "state": "partial",
      "percent": 75,
      "path": null,
      "file": "standing-topics.ts",
      "external": false,
      "currentCode": "src/ansci/session.ts (topics)",
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
      "currentCode": "src/ansci/turn.ts (turn record)",
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
      "currentCode": "src/ansci/plan.ts (gap questions)",
      "summary": "What is currently missing that the other party could supply."
    },
    {
      "id": "awareness/social-unit",
      "title": "Social Unit",
      "type": "Unit",
      "parent": "awareness",
      "state": "partial",
      "percent": 95,
      "path": "awareness/social-unit",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/social.ts (S1) + assess.ts (social kinds)",
      "summary": "Awareness of the interlocutor as a social presence, not only as a source of statements. Holds the Interlocutor and Conversation. Designed 2026-11-18 (ansci-social-unit-design.md; placement inside Awareness confirmed, rulings 1a-5a). S1 built: the social reading annotates assessed objects and the two registers live in the Session. S2 built: the Planner discharges the greeting-return, farewell-return and thanks-receipt demands as authored moves, obligations are tracked, and the phase is consulted before initiative. S3 built: self-facts live in Awareness Self's Identity and Capabilities tables and self-queries — identity and capability — are answered from that record through the unit. Remaining: clarification (S4), the premise stance (S5); cross-conversation persistence (S6) is deferred by ruling 5a. S4 built: the clarification move end to end — all four trigger classes wired (token, sense, referent, whole utterance), the pending register live with the fill reading, attempt counting and the best-reading fallback, and clarified senses remembered for the conversation. S5 built: the premise stance — Coherence supplies a contradiction degree (record or graph), the unit owns the three-beat response and the insistence handling (supposition framing, disagreements recorded, the premise never adopted). S6 remains deferred under ruling 5a (no identified returners exist). S6 built (owner's commission, ahead of ruling 5a's deployment precondition, on synthetic-returner gates): identity-keyed persistence across conversations — the durable core only, consulted only on a stated identity, recognition never performed before it. All six slices are now built; what remains is the sealed probe acceptance run, the holder's to commission."
    },
    {
      "id": "awareness/social-unit/interlocutor",
      "title": "The Interlocutor",
      "type": "Register",
      "parent": "awareness/social-unit",
      "state": "partial",
      "percent": 75,
      "path": null,
      "file": "interlocutor-standing.ts",
      "external": false,
      "currentCode": "src/ansci/social.ts (register) + src/ansci/session.ts (held)",
      "summary": "The system's standing picture of the person it is talking with: identity known or unknown, first contact or returning, and the picture the conversation itself accumulates. S1 (2026-11-18): contact, a stated-name identity, pointers to the content established with them, and the social state (greeted / thanked / leave taken), updated only from speaker-attributed content. Returning-contact persistence is slice S6, deferred. This is the register formerly at awareness/surroundings/interlocutor-standing, moved into the Social Unit by the owner's direction (2026-11-18). S6 (2026-11-18): the register persists across conversations through the identity-keyed store — prior conversations and their established topics load at the moment the identity is stated, and the durable core is rewritten at each turn's end."
    },
    {
      "id": "awareness/social-unit/conversation",
      "title": "Conversation",
      "type": "Container",
      "parent": "awareness/social-unit",
      "state": "partial",
      "percent": 70,
      "path": "awareness/social-unit/conversation",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/social.ts (phase & pending register)",
      "summary": "Conversation lives inside the Social Unit: greeting and leave-taking, identity and capabilities as socially presented, thanks, acknowledgement, turn-taking. S1 (2026-11-18): the phase machine and pending register live in the Session and the reading tracks them. S2 (2026-11-18): the moves are authored through the Planner — greeting and farewell mirrors, the thanks receipt — obligations are tracked in the register and discharged by the unit, and the phase is consulted before initiative. The design adds two moves to this container: clarification and the premise stance (slices S4, S5). S4 (2026-11-18): the pending register is live — clarifications open it, the next turn is read against it first, attempts are counted, and clarified sense readings are held for the conversation. S5 (2026-11-18): the stance-repair pending is live, and the register holds the conversation's premise disagreements in plain renderings."
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
      "currentCode": "src/ansci/ (the sentence layer)",
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
      "currentCode": "src/ansci/parse.ts, sentence.ts, join.ts, check.ts",
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
      "currentCode": "src/ansci/sentence.ts, src/ansci/symspell.ts, src/ansci/token-resolve.ts",
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
      "currentCode": "src/ansci/sense.ts, wordnet-lex.ts",
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
      "currentCode": "src/ansci/framenet-lex.ts, src/ansci/verbnet-lex.ts, features.ts",
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
      "currentCode": "src/ansci/aspect.ts",
      "summary": "Aspect as feature bundles; irregular forms selected, both languages."
    },
    {
      "id": "lpu/semantic-assessment",
      "title": "SemanticAssessment",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 70,
      "path": "lpu/semantic-assessment",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/semantic-object.ts, src/ansci/assess.ts, src/ansci/info-object.ts",
      "summary": "Answers 'What is this?' — what the text is saying. Takes the Parser's structure and renders the assessment of the utterance as a whole: its kind (a greeting, a question, a feeling-statement), what it asserts or asks, what it leaves unexpressed, its register and mood — packaged as a semantic object that then travels the system: Coherence judges its fit, the Planner chooses the move that answers its kind, Session records it as the turn's event. Placed 2026-11-16 at the owner's direction. Slice 1 built (shadow objects): assess.ts creates an object for every parsed utterance — kind, holes, grounding, stream role — stored on the session and named in the trace; nothing reads the objects yet. Every object now also carries its senses face (via the Senses-Scening Unit, 2026-11-17) and, where the utterance carries quantity content, the QuantificationLanguageUnit's quantity mentions, which the turn loop applies to the Session's quantity ledger. Since the envelope build (2026-11-17, info-object.ts) the object travels as an INFORMATION object: this unit wraps the core in an envelope at creation — act, provenance, confidence, the route of units that handled it, and its needs (answer / placement / reconciliation / the phatic turn's three situate needs), seeded from existing signals and discharged by the units that meet them; the core inside is unchanged (the wall), Coherence prices the needs that survive, and a phatic turn is answered only through the Planner authoring a reply object from the assessed situation — no greeting shortcut exists."
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
      "currentCode": "src/ansci/ledu.ts",
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
      "currentCode": "src/ansci/senses-scening.ts, src/ansci/qualreas.ts",
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
      "currentCode": "src/ansci/quantification-language.ts",
      "summary": "The QuantificationLanguageUnit: the LPU's bridge to the QuantificationUnit, maintained inside the LPU (the EDU/LEDU pattern). Inbound: quantity as expressed in language — numerals and number words (one..twenty, hundred, thousand; digits), quantifier words (all/some/none/each/every) as bounded quantity kinds, construction-implied counts, unit words via the UnitsMeasurement Unit — read from the parse as quantity mentions, with the OKU Numbers slice's filed reading attached where one exists; SemanticAssessment attaches the mentions to the object at creation and the turn loop applies them to the Session's ledger. Outbound: a tracked quantity rendered back into language ('two apples') — the how-many reader speaks through it. Uses the QuantificationUnit at its home inside the OKU; the mapping is language's, the framework is the QuantificationUnit's. Placed and built 2026-11-17 at the owner's direction."
    },
    {
      "id": "lpu/normalcy-assessment",
      "title": "NormalcyAssessment",
      "type": "Unit",
      "parent": "lpu",
      "state": "partial",
      "percent": 45,
      "path": "lpu/normalcy-assessment",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/normalcy-assessment.ts",
      "summary": "NormalcyAssessment: the LPU's bridge to the NormalcyUnit, maintained inside the LPU (the Senses-Scening shape). It reads a freshly assessed information object — its parse, its surface, the Session as it stood before the turn — and files NORMALCY FLAGS on the object's envelope: obviousness (the question asks what the Classification already settles), self-redundancy (the Session record already settles the question), gibberish (no content arrived — graded, and only on token-resolution failure). The flags describe the communication, never the content, so they ride the envelope side of the wall. The bridge runs after Session & Situation and before CoherenceAnalysis, which prices the flags by kind; a flag is an internal thought only — no reply ever speaks one. Uses the NormalcyUnit; the mapping from text is language's, the standards and the filed word knowledge are the authority's. Placed and built 2026-11-17 at the owner's direction."
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
      "currentCode": "src/ansci/generate.ts",
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
      "currentCode": "src/ansci/session.ts, turn.ts",
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
      "currentCode": "src/ansci/session.ts",
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
      "currentCode": "src/ansci/session.ts, turn.ts",
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
      "currentCode": "src/ansci/session.ts",
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
      "currentCode": "src/ansci/session.ts (listOpenUnknowns — a derived view over session.scenes)",
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
      "currentCode": "src/ansci/session.ts",
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
      "currentCode": "src/ansci/classify.ts and the foundation graph",
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
      "currentCode": "src/ansci/classify.ts; foundation src/graph.ts, src/seed.ts",
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
      "currentCode": "src/ansci/classify.ts",
      "summary": "The classification table: (concept, aspect) assertions with provenance and confidence. 164 entries; coverage is the constraint."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/mathematics",
      "title": "Mathematics",
      "type": "Unit",
      "parent": "ontology-core/ontology-knowledge-unit",
      "state": "placeholder",
      "percent": 0,
      "path": "ontology-core/ontology-knowledge-unit/mathematics",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "Mathematics: the larger unit inside the Ontology Knowledge Unit that holds the Quantification Unit and the Geometry Unit, which will work with each other (owner's direction, 2026-11-18, in the ProblemSolving design §9; placement ruled the same day and built 2026-11-19). The QuantificationUnit moved one level down under Mathematics, staying inside the OKU over its Numbers slice; the Geometry Unit stands here as a placeholder seat, its contents not yet stated. Mathematics is a container, not a solver: ProblemSolving's MathPS section delegates its solving to the units standing here and keeps no math machinery of its own. Placement only — no code of its own, and no Geometry need kind is registered until the Geometry Unit is built."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit",
      "title": "QuantificationUnit",
      "type": "Unit",
      "parent": "ontology-core/ontology-knowledge-unit/mathematics",
      "state": "partial",
      "percent": 45,
      "path": "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/quantification.ts",
      "summary": "The QuantificationUnit: the system's authority on quantity, living inside Mathematics in the Ontology Knowledge Unit over its Numbers slice (owner's placement, 2026-11-17 — moved into the OKU, superseding an earlier System-level seat; moved one level down under Mathematics 2026-11-19, per the owner's 2026-11-18 ruling). It is the specialist reader of the OKU Numbers slice — Suwen ch. 4's number row (eight/Wood, seven/Fire, five/Earth, nine/Metal, six/Water), banked in the ingested store — and keeps no private number lore. Its three jobs: READ quantities stated and implied (between implies two); TRACK them in a ledger held on the Session (stated amounts, event deltas as transfers/gains, each a new record, the latest standing as current); COMPUTE from the tracked state (how-many answers, and inconsistency flags — a delta larger than the tracked amount is flagged, never silently applied). The Luoshu is built in as its working apparatus (the nine palaces, the 15 invariant, the flight path) — machinery in the unit, distinct from the OKU's filed numbers; the tension stands labelled (ch. 4 files Wood/east as 8; the Luoshu places 3 in the east palace, 8 in the north-east). Language reaches it through the LPU's QuantificationLanguageUnit. Placed and built 2026-11-17 at the owner's direction."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit/units-measurement-unit",
      "title": "UnitsMeasurement Unit",
      "type": "Unit",
      "parent": "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit",
      "state": "partial",
      "percent": 60,
      "path": "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit/units-measurement-unit",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/units-measurement.ts",
      "summary": "The UnitsMeasurement Unit: the QuantificationUnit's sub-unit for units of measurement (owner, 2026-11-17 — nested inside the QuantificationUnit). A quantity is a number OF something: this unit names the somethings — each unit's dimension (weight, length, volume, count, temperature) and its factor to the dimension's base unit, across three systems in one table: traditional Chinese （銖/兩/斤， 寸/尺/丈/里， 合/升/斗， and the counting measure words 個/隻/條/本/張/頭 — the units the banked classical quantities, bencao dosages above all, are stated in), Imperial (ounce/pound/stone, inch/foot/yard/mile, imperial pint/gallon), and SI (gram/kilogram, metre, litre). Conversion runs only within a dimension; across dimensions it refuses, typed. Temperature is a scale, not a factor: Fahrenheit/Celsius convert by offset and ratio, separately. Traditional factors are the MODERN STANDARDISED values （斤 = 500 g, 兩 = 50 g, 里 = 500 m, 尺 = 1/3 m, 升 = 1 L), labelled as such — historical values varied by dynasty and no dynasty table is banked. Placed and built 2026-11-17. Extended the same day with the QUDT port: every SI/Imperial factor cross-checked against the QUDT units vocabulary (CC BY 4.0; all shared units agreed), and QUDT-supplied coverage added under source 'qudt' — the US liquid variants distinguished from their Imperial namesakes (us-pint/us-gallon/us-quart/us-fluid-ounce, imperial quart and fluid ounce), plus two new dimensions: area (acre) and pressure (pascal, psi). The hand table remains the authority; traditional rows untouched."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/mathematics/geometry-unit",
      "title": "Geometry Unit",
      "type": "Unit",
      "parent": "ontology-core/ontology-knowledge-unit/mathematics",
      "state": "placeholder",
      "percent": 0,
      "path": "ontology-core/ontology-knowledge-unit/mathematics/geometry-unit",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "The Geometry Unit: ruled to stand inside Mathematics beside the Quantification Unit, the two to work with each other (owner's direction, 2026-11-18, ProblemSolving design §9; placeholder seat placed 2026-11-19). A placeholder seat only: the unit's contents have never been stated, nothing is designed and nothing is built. The one place quantity and geometry already meet is the UnitsMeasurement Unit's area dimension. Per the same ruling, a Geometry need kind is registered when this unit is built — not before — and until then geometry-shaped problems route nowhere and are not forced under quantification."
    },
    {
      "id": "ontology-core/ontology-knowledge-unit/paramorphic-concept-unit",
      "title": "ParamorphicConcept Unit",
      "type": "Unit",
      "parent": "ontology-core/ontology-knowledge-unit",
      "state": "placeholder",
      "percent": 0,
      "path": "ontology-core/ontology-knowledge-unit/paramorphic-concept-unit",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/paramorphic-concepts.ts",
      "summary": "The ParamorphicConcept Unit: the OKU's unit holding the paramorphic concepts — the generic abstract structures of the paramorphic-components framework, each a family generated by a declared parameter set (owner's ruling, 2026-11-19: all paramorphic concepts are in a ParamorphicConcept Unit in the OKU). Contents closed at the six of the components record: Grid, Graph, Tree, Path, Protocol, Logic. The unit holds the generic concepts, their parameters and their shared operations as a registry of data; the system's existing structures (the correspondence graph, the meaning graph, the WordNet climb, the Luoshu) are instances of these concepts and stay where they live — nothing is moved and nothing is re-expressed. First slice is placeholder grade (the ProblemSolving placeholder shape): the seat, the placeholder and the registry; no engine runs any named operation and no consumer is rewired. Protocol stands with no AnSci specimen — a located gap, recorded in the registry rather than filled."
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
      "currentCode": "src/ansci/wordnet-lex.ts, framenet-lex.ts, verbnet-lex.ts",
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
      "currentCode": "ai-system/knowledge/variant-graph/variants.json, consulted by src/ansci/token-resolve.ts",
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
      "currentCode": "src/ansci/flavor-bridge.ts, ingested.ts",
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
      "currentCode": "src/ansci/plan.ts, pricing.ts",
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
      "currentCode": "src/ansci/turn.ts (deriveSentence), check.ts",
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
      "currentCode": "src/ansci/plan.ts, src/ansci/reply.ts (reply objects)",
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
      "currentCode": "src/ansci/pricing.ts",
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
      "currentCode": "src/ansci/pricing.ts, plan.ts",
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
      "currentCode": "src/ansci/composition.ts",
      "summary": "The frozen composition definitions; the live copy is held in Awareness."
    },
    {
      "id": "reasoning/problem-solving",
      "title": "ProblemSolving Unit",
      "type": "Unit",
      "parent": "reasoning",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/problem-solving.ts",
      "summary": "A general-purpose problem-solving unit inside Reasoning (owner's commission, 2026-11-18) — not limited to mathematics. A router in the turn asks 'does this need problem-solving?': on the person's instruction (a how-many question is its first wired case), or assessed by the AI from the object itself (quantity content is its first wired signal) — and attaches the needs to the object, routed here. The unit's repertoire is the standard acronym cycles people use (OODA — Observe, Orient, Decide, Act; PDCA — Plan, Do, Check, Act; the rest as registered), each held as a small graph of steps with the cycle edge that closes it. Placeholder: the seat, the router and the approach graphs are wired; no approach engine runs yet. For issues of how to proceed in a general situation, its evaluation mechanism will be based on the 64 hexagrams, making use of OntologyCore — the hexagrams read where they stand in the ontology the Ontology Knowledge Unit holds, not copied here (owner's addition, 2026-11-18); that mechanism is likewise designed, not built. Its six divisions — external, abstract, internal, internal-system, external-system, and the user's problems — are seats a problem moves between rather than bins, the bearer recorded per problem (owner's divisions, settled 2026-11-18; placeholder subunits). The solving engine, as designed with the owner (2026-11-20): the unit walks a chosen strategy's graph; each step declares what it requires, and the requirement is checked per step — first against the capability registry of built operations and the system's distributed holdings (the OKU's mathematics / quantification / geometry, the nets, the session record, consultation), and where the step needs a generic operation, against the Functions Unit ('do I need anything from the Functions Unit?' is the gate's generic branch); a step's unmet requirement is a CAPABILITY need, a kind distinct from lack-of-information in the need registry. The walk runs under a LOOP BUDGET carried on the problem record (cycles attempted plus a cost ceiling the Planner prices); reaching the budget is a located outcome, not a failure of the machinery, and the problem then passes through the unit's ReasoningErrorFailure subunit, which assembles the attempt record and files it to the ErrorFailure Unit, which authors the account of why from the record. Designed, not built: no engine walks an approach graph yet."
    },
    {
      "id": "reasoning/problem-solving/external",
      "title": "External problems",
      "type": "Unit",
      "parent": "reasoning/problem-solving",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving/external",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "Problems in the encountered world — situations and states of affairs the system is presented with or told about, including a situation inside a story provided. A division (seat) of the ProblemSolving Unit; placeholder."
    },
    {
      "id": "reasoning/problem-solving/abstract",
      "title": "Abstract problems",
      "type": "Unit",
      "parent": "reasoning/problem-solving",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving/abstract",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "Problems whose matter is ideas — meaning, value, and how to proceed in a general situation. The evaluation based on the 64 hexagrams, making use of OntologyCore, is this division's instrument. A division (seat) of the ProblemSolving Unit; placeholder."
    },
    {
      "id": "reasoning/problem-solving/internal",
      "title": "Internal problems",
      "type": "Unit",
      "parent": "reasoning/problem-solving",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving/internal",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "The system's own problems in the encounter — error, lack of information, lack of how to do. The decline doctrine already lives here in embryo: a decline is an internal problem surfaced at its location, and clarification is one asking outward for its missing piece. A division (seat) of the ProblemSolving Unit; placeholder."
    },
    {
      "id": "reasoning/problem-solving/internal-system",
      "title": "Internal-system problems",
      "type": "Unit",
      "parent": "reasoning/problem-solving",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving/internal-system",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "The system as a standing thing in the world — its fixed limits and accumulated condition, as they bear on external issues. The capabilities and limits stated to a visitor are this division's facts in visitor language. A division (seat) of the ProblemSolving Unit; placeholder."
    },
    {
      "id": "reasoning/problem-solving/external-system",
      "title": "External-system problems",
      "type": "Unit",
      "parent": "reasoning/problem-solving",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving/external-system",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "The boundary — the system's interfaces to the outside: surfaces, channels, stores; what can reach the system and what it can reach. The identity channel a returner is recognised through is this division's standing example. A division (seat) of the ProblemSolving Unit; placeholder."
    },
    {
      "id": "reasoning/problem-solving/user-problems",
      "title": "User's problems",
      "type": "Unit",
      "parent": "reasoning/problem-solving",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving/user-problems",
      "file": null,
      "external": false,
      "currentCode": "none",
      "summary": "Problems the user brings or has — the intake seat. Its standing route feeds them back to Internal problems, where the solving is taken up; the bearer may be the user, a third party, or the matter itself. A division (seat) of the ProblemSolving Unit; placeholder."
    },
    {
      "id": "reasoning/problem-solving/reasoning-error-failure",
      "title": "ReasoningErrorFailure Unit",
      "type": "Unit",
      "parent": "reasoning/problem-solving",
      "state": "placeholder",
      "percent": 0,
      "path": "reasoning/problem-solving/reasoning-error-failure",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "The ReasoningErrorFailure Unit: the ProblemSolving Unit's own error-and-failure subunit (owner's direction, 2026-11-20), following the system's bridge pattern — as SemanticAssessment in the LPU uses the SemanticAssessmentUnit in the OntologyCore, this subunit does the failure work inside Reasoning and files to the top-level ErrorFailure Unit, which holds the authority: the authored account and the accumulated failure knowledge. When a strategy walk exhausts its approaches or reaches its loop budget, or a step's requirement survives the capability audit unmet, this subunit assembles the attempt record — the problem and its seat history, the strategies tried, the loops spent, the stopping step, the lack (capability or information) and the holdings that were checked — marks the problem's record with the failure, and files the record to the ErrorFailure Unit. It is not one of the six divisions: problems do not sit in it, they pass through it on their way to being accounted for. It never speaks; the account it files is a typed record, and the Planner authors any reply that carries it. Placeholder seat only: no filing machinery is built, nothing is built."
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
      "currentCode": "src/ansci/cskg-feed.ts (interface only)",
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
      "currentCode": "src/ansci/cskg-feed.ts",
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
      "currentCode": "src/ansci/cskg-feed.ts, cskg-ingest.ts",
      "summary": "Relational commonsense tier. The feeder's map is widened to 21 relations: twelve concept relations whose endpoints must classify, plus the nine-relation ATOMIC at:* family anchored by an event rule (head verb + head word) rather than the concept table. Its data is a local artifact, never shipped."
    },
    {
      "id": "intake/wikidata",
      "title": "Wikidata",
      "type": "Source",
      "parent": "intake",
      "state": "partial",
      "percent": 85,
      "path": "intake/wikidata",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/wikidata.ts, wikidata-client.ts, wikidata-mapping.ts, wikidata-bank.ts, wikidata-turn.ts, src/situation.ts (shared §8.10 primitives)",
      "summary": "Facts tier. Slice W1 (adapter core) built: Action API client (WIKIDATA_BASE_URL, fetch injected), wbgetentities parser, mapping table v1 as a data module (P36 CAPITAL_OF inverted, P17/P131 LOCATED_IN, P361 PART_OF, P625 as lat/lon node properties, P31/P279 IS_A), skip-log for unmapped properties, retrieved-kind SourceRecord provenance at 0.9, never-anchor KB nodes, and conflict-flagging join proposals. Slice W2 (lookup + banking + answering) built: translations bank idempotently into a dedicated retrieved-facts store (wikidata-bank.ts), mirrored into the session graph's base partition (CAPITAL_OF/LOCATED_IN now in graph.ts's EdgeType union, SOURCED_FROM source nodes, never-anchor preserved); the async wrapper processTurnWithWikidata (wikidata-turn.ts) answers the where/capital/country shapes from the bank with no fetch, and on a located knowledge decline resolves, fetches (mapped references only, ≤50-id chunks), banks and re-answers in the same turn, with retrieved provenance in the trace and lookup-unavailable / ambiguous declines kept distinct. Slice W3 (place associations) built: at bank time a coordinated node banks hemisphere + latitude band computed by the shared §8.10 primitives in src/situation.ts (one implementation, two callers — the live Situation and the bank), as derived-kind associations consuming the retrieved P625 step (§3.5 rule 2, steps marked); coordinateless banked places are flagged incomplete and situation questions over them decline located on the missing coordinates; situationForPlace feeds banked coordinates into computeSituation itself (source 'kb'), and nightForPlace gives SA-TONIGHT in computed form (§8.10b night proportion, source 'computed'). Climate remains unmapped-and-skip-logged in v1 (no mapping row; see the W3 report). Remaining: the Slice 0 re-base and W2's live acceptance items, both blocked/carried as recorded in the W2/W3 reports (the live items under the wikidata.org 429 hard stop)."
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
      "currentCode": "src/ansci/ingest.ts",
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
      "currentCode": "src/ansci/ingest.ts, cskg-ingest.ts",
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
      "currentCode": "src/ansci/ingest.ts (review and apply)",
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
      "summary": "The system's ontological heart: the container for what the world is made of and how its kinds correspond, in the system's own terms. It holds the Ontology Knowledge Unit (the correspondence graph and the classification table), the EmotionDesireUnit (placed 2026-11-16), the SenseUnit (placed 2026-11-17) and the NormalcyUnit (placed 2026-11-17), at the owner's direction."
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
      "currentCode": "src/ansci/classify.ts; foundation src/graph.ts, src/seed.ts",
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
      "currentCode": "src/ansci/edu.ts, src/ansci/edu-reach.ts",
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
      "currentCode": "src/ansci/sense-unit.ts",
      "summary": "The SenseUnit: the system's medium-neutral authority on the human senses, sitting inside the OntologyCore beside the EDU. Its contents are the join of three provenance-labelled lists, never silently harmonised: the channels from 六根/六塵 (eye→form, ear→sound, nose→smell, tongue→taste, body→touch, mind→mental objects), the per-channel discriminations from Xunzi (Tianlun's five 天官, Rongru's assignments), and the phase correspondences from the OKU's Suwen rows (orifices, colour/sound/flavour quality rows, the ch. 4 odour row, skin as tissue). Its data lives in the OKU, as the EDU's does; it is the specialist authority over that slice, not a private store. Recorded tensions stand labelled: taste double-filed (tongue/Fire, mouth/Earth), touch with no channel phase (its values carry phases), mind's phase unsettled. Boundary with the EDU: this unit owns the channels; the EDU owns the cravings OF the channels. Language reaches it through the LPU's Senses-Scening Unit. Placed 2026-11-17 at the owner's direction; the naming authority built the same day (channel/discrimination lookups, the overripe cross-channel implication filed as derived-tier knowledge); no larger-graph reach yet."
    },
    {
      "id": "ontology-core/normalcy-unit",
      "title": "NormalcyUnit",
      "type": "Unit",
      "parent": "ontology-core",
      "state": "partial",
      "percent": 35,
      "path": "ontology-core/normalcy-unit",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/normalcy-unit.ts, src/ansci/wordfreq.ts, src/ansci/glasgow.ts",
      "summary": "The NormalcyUnit: the system's medium-neutral authority on the normal shape of a communication, sitting inside the OntologyCore beside the SenseUnit. It files the norm dimensions — obviousness (a predication is obvious iff the OKU Classification settles it without testimony: the asked quality is the kind's classifying quality on its filed degree profile), self-redundancy (the Session record already settles the question), gibberish (no content arrived; the flag requires token-resolution failure, frequency/familiarity evidence grades strength only) — and serves the labelled word knowledge the bridges read: wordfreq frequency (CC BY-SA 4.0) and the Glasgow Norms' nine dimensions (Scott et al. 2019, CC BY 4.0), whole table banked. The governing principle is the owner's (2026-11-17): the tables supply KNOWLEDGE about what is happening in the communication, never the system's values — no table number sets a price, fires a flag by itself, or decides a reply; CoherenceAnalysis prices the flags by kind. Gender association is guarded knowledge: the labelled access path exists, and in v1 its values change no price, flag, referent or pronoun decision, or reply. Language reaches it through the LPU's NormalcyAssessment. Placed and built 2026-11-17 at the owner's direction."
    },
    {
      "id": "functions",
      "title": "Functions Unit",
      "type": "Unit",
      "parent": "system",
      "state": "placeholder",
      "percent": 0,
      "path": "functions",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "The Functions Unit: a top-level unit holding families of generic functions, placed underneath the OntologyCore (owner's direction, 2026-11-19, as the Capabilities Unit; renamed 2026-11-20 when the owner separated two jobs the word capability was doing). This unit is the LIBRARY OF OPERATIONS: Ordering And Sorting, Search, Editing, ExternalQuery, and FileSystem — callable functions over abstract material (elements and an ordering, a space and a criterion, ranges over anything range-bearing, a query over anything on the web, a tree of named places holding content), never over a particular kind of data, called mid-step inside larger processes such as a problem-solving walk; it owns no data and knows nothing of what the material means. The other job — the INVENTORY of what the system can actually do (its built-ins: mathematics, quantification, geometry, the nets' knowledge, the session record, consultation) — is answered by a capability registry held as data, in which every built operation registers itself (name, what it takes, what it returns); a placeholder seat is explicitly NOT a holding. When a problem-solving step declares a requirement, the registry and the distributed holdings are what it is checked against, and a lack is declared only on that audit. The five original families stand as placeholder seats; the time programme (2026-11-20) adds further families beside them as they are designed and built — Timekeeping first (T1: clock consultation and the staleness operation, registered as holdings in the capability registry), then Scheduling (T2: the register, the opening sweep, and scheduled re-consultation as the one wired consumer), then Expectation (T3: the joint charter with the lack machinery, the two honest standings, timeout as information), then Calendar (C1–C2: the systems register, the arithmetical conversions, the lunisolar held) and Timeline (C3: the line, Allen's algebra, placement live)."
    },
    {
      "id": "functions/ordering-and-sorting",
      "title": "Ordering And Sorting",
      "type": "Unit",
      "parent": "functions",
      "state": "placeholder",
      "percent": 0,
      "path": "functions/ordering-and-sorting",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "Ordering And Sorting: the Functions Unit's home for the algorithms that sort and order data of different types, held generically. The operations are defined over elements plus an ordering — a comparator, a key, a ranking, a partial order — and the unit knows nothing of what the elements are: the same machinery orders words, records, candidates, quantities or priced claims, with the caller supplying the elements and the terms of the ordering (stability, ties, ascending or descending, total or partial). Not data-specific: no sort here knows what it is sorting. Placeholder seat only (owner's direction, 2026-11-19): no algorithm is banked, no caller is wired, nothing is built."
    },
    {
      "id": "functions/search",
      "title": "Search",
      "type": "Unit",
      "parent": "functions",
      "state": "placeholder",
      "percent": 0,
      "path": "functions/search",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "Search: the Functions Unit's generic search resource. The operations are defined over a space plus a criterion — find by key or by predicate, match a pattern, traverse a structure, return the best or nearest candidate under a supplied measure — and the unit knows nothing of what the space holds: the same machinery searches a sequence, a table, a graph or a store, with the caller supplying the space, the criterion and what counts as found. Not data-specific: no search here knows what it is searching. Placeholder seat only (owner's direction, 2026-11-19): no algorithm is banked, no caller is wired, nothing is built."
    },
    {
      "id": "functions/editing",
      "title": "Editing",
      "type": "Unit",
      "parent": "functions",
      "state": "placeholder",
      "percent": 0,
      "path": "functions/editing",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "Editing: the Functions Unit's generic editing resource — the notions that go with editing anything that bears ranges, held once, generically. The operations are defined over ranges of an abstract range-bearing material: select a range, insert, delete and replace within it, trim a range's head or tail, split and join at a point, move or copy a range, and the roll edit — move a boundary shared by two adjacent ranges so one grows and the other shrinks by the same amount, the whole preserved. A string, a media timeline and a token sequence are instances of the material, not cases in the code: the unit holds no string-specific and no media-specific editing, and knows nothing of what the ranges are ranges of. Not data-specific. Placeholder seat only (owner's direction, 2026-11-19): no operation is implemented, no caller is wired, nothing is built."
    },
    {
      "id": "functions/external-query",
      "title": "ExternalQuery",
      "type": "Unit",
      "parent": "functions",
      "state": "placeholder",
      "percent": 0,
      "path": "functions/external-query",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "ExternalQuery: the Functions Unit's function family for querying anything on the web. The machinery is held once, in common form: state a query — what is asked, in what terms, against what kind of source, and what shape of answer is wanted — dispatch it, and receive what comes back in a declared common shape, with its source named. The unit knows nothing of what is being queried or what the answer means: a reference work, a catalogue, a live service and a public page are all just sources a query can be put to, and no query here is written for one of them. Not data-specific. It supplies the querying machinery only: what may enter the system as knowledge, and under what standing, remains Intake's and the gate's to decide — a result returned is not testimony admitted. The one working instance-in-effect today is the Wikidata adapter's fetch half — resolving an entity to its item and fetching it — which is this unit's machinery in source-specific form; the adapter stays where it lives, at intake/wikidata, unmoved and unclaimed (owner's ruling, 2026-11-19), and when this unit gets its design slice that fetch layer is the first thing re-expressed in the generic form. Placeholder seat only (owner's direction, 2026-11-19): no query machinery is built, no source is wired, no caller is wired, nothing is built."
    },
    {
      "id": "functions/file-system",
      "title": "FileSystem",
      "type": "Unit",
      "parent": "functions",
      "state": "placeholder",
      "percent": 0,
      "path": "functions/file-system",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "FileSystem: the Functions Unit's function family for working with a file system — a tree of named places (directories) holding content (files), addressed by paths. The operations are the generic ones that go with such a tree, held once: name and resolve a path, list what a place holds, read and write content at a place, create and remove places and content, move and copy between places, and ask what stands at a path (whether it is there, what kind of thing it is, how large, when it changed). The unit knows nothing of what any file contains or means: a document, a data bundle and a program are all just content at a place, and what content may be read, written or trusted belongs to the units that own it. Not data-specific. Placeholder seat only (owner's direction, 2026-11-19): no operation is implemented over the system's existing file access, no caller is wired, nothing is built."
    },
    {
      "id": "functions/timekeeping",
      "title": "Timekeeping",
      "type": "Unit",
      "parent": "functions",
      "state": "partial",
      "percent": 40,
      "path": "functions/timekeeping",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/timekeeping.ts (consultClock, askStaleness, staleByHorizon); the time/date shapes' clock route in src/ansci/turn.ts",
      "summary": "Timekeeping: the Functions Unit's time resource (design: docs/ansci/time-scheduling-design-note.md §2; built T1, 2026-11-20). Two operations, held generically. THE CLOCK-CONSULTATION OPERATION: a clock is a source, read on demand — one source wired, the host's clock — and a reading is a RETRIEVED FACT: the instant read, the timezone it stands in (named, the host's own), and its source record under the retrieved provenance discipline; a reading's content and fetch stamp coincide, and it warrants the turn it was taken in — a later turn re-consults rather than inheriting a 'now'. The frame remains the conversation's stated time; where frame and clock disagree the disagreement is statable, never silently reconciled, and the time/date shapes answer from the frame where a frame reading stands and consult the clock only where none does. THE STALENESS OPERATION: fresh / stale / absent asked uniformly over the banks under the shelf life each bank states for its kind (weather TTL, the geography register's per-kind table), and 'no shelf life stated' — never 'fresh' — where a bank states none (the Wikidata bank). Timekeeping does no arithmetic (Quantification's Mathematics), no ordering (Ordering And Sorting over readings), and no testimony: what a time means stays with the frame's tables and Awareness. Registered holdings: clock-consultation, staleness-query (capability-registry.ts)."
    },
    {
      "id": "functions/scheduling",
      "title": "Scheduling",
      "type": "Unit",
      "parent": "functions",
      "state": "partial",
      "percent": 40,
      "path": "functions/scheduling",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/scheduling.ts (registerSchedule, sweepSchedule, declineDueItem); the opening sweep wired in src/ansci/turn.ts; the weather re-consultation consumer in src/ansci/weather-turn.ts",
      "summary": "Scheduling: the Functions Unit's commitment resource (design: docs/ansci/time-scheduling-design-note.md §3; built T2, 2026-11-20). Commitments held as records in a session-scoped register: what is owed, its trigger (a time, or a time and a condition — never a bare condition), its registrar (only the registering unit may cancel or amend its own items), its registration stamp on a named standing, and the registration's own shelf life ('no expiry' a stated value with a reason, never an omitted field). Registration is NOT authorisation: at each turn's opening sweep, under the turn's best time standing, due items raise the demands stated at registration and lapsed registrations close as lapsed; the Planner prices each demand at due time and a decline closes the item with the decline as its closing evidence. Scheduling never acts, never authors a reply, never originates a claim. The one wired consumer is scheduled re-consultation — a banked weather reading registers its own refresh, and the sweep's firing, the pricing and the re-bank all ride the trace. The waking limit stands as designed: nothing fires between turns, items are evaluated at turn boundaries, and no host driver is built (the driver contract's entity side stands as the pure queries whatIsDue / whatIsOpen). Registered holdings: schedule-registration, schedule-sweep (capability-registry.ts)."
    },
    {
      "id": "functions/expectation",
      "title": "Expectation",
      "type": "Unit",
      "parent": "functions",
      "state": "partial",
      "percent": 40,
      "path": "functions/expectation",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/expectation.ts (registerExpectation, sweepExpectations, offerSatisfier, deliverArrival); the hand-off annotation on src/ansci/problem-records.ts; the weather chain in src/ansci/weather-turn.ts",
      "summary": "Expectation: the Functions Unit's waiting resource (design: docs/ansci/time-scheduling-design-note.md §4; built T3, 2026-11-20), chartered JOINTLY with the lack machinery — the seat is a Function family's, but the account of the need lives in ProblemSolving's problem records, and neither side is complete without the other. An expectation is a watch over a problem record: its satisfier stated checkably (a fact, a reply, or an arrival — an expectation that cannot state its satisfier is not registered), the source it is expected from, a deadline (required; open-ended waiting is how registers fill with the dead), and the on-satisfaction and on-timeout demands stated at registration. Eligibility is §4.3's one test — could the world deliver the satisfier without the system changing? lack-of-information yes; an interlocutor-owed value yes; capability and how-to-proceed no, their audit verdicts untouched. Satisfaction is routing, not admission: a candidate faces the gates any content faces, a refusal is recorded on the expectation's record, and nothing enters knowledge because it was waited for. Two honest standings only: re-check at turn openings, and driver-delivered arrival (no driver is built; the entity-side contract stands). A timeout is information — what was waited for, from whom, until when, that it did not come — filed into the problem record, which stands with it as evidence; a satisfaction files its evidence and the record closes. The weather chain (§5.1) is the wired walk: a weather decline the world can close registers an expectation plus a scheduled re-check, and the visitor is told the gap and that the question is being kept open. Registered holdings: expectation-registration, expectation-sweep (capability-registry.ts)."
    },
    {
      "id": "functions/calendar",
      "title": "Calendar",
      "type": "Unit",
      "parent": "functions",
      "state": "partial",
      "percent": 40,
      "path": "functions/calendar",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/calendar.ts (CalendarRegister, convertDate, addMonths) and src/ansci/calendar-chinese.ts (chineseFromFixed, fixedFromChinese, currentSolarTerms)",
      "summary": "Calendar: the Functions Unit's grid resource (design: docs/ansci/time-scheduling-design-note.md §8.3–§8.5; built C1–C2, 2026-11-20). Date systems held as knowledge in a systems register — name, provenance, epoch, month structure, intercalation — with conversion and grid arithmetic as operations over the holdings. C1 holds three arithmetical systems (the Gregorian the frame's ISO input assumes, the ISO week calendar, the Julian for historical dates), each with its provenance stated: Dershowitz & Reingold, Calendrical Calculations (4th ed.), Part I, ported from the authors' public Lisp distribution — calendrics is not re-derived here. C2 holds the Chinese lunisolar: an astronomical system (Part II), its conversions computed from new moons and solar terms at the Chinese standard-time meridian, the modern post-1645 system only — pre-1645 conversions carry the qualification on their derivation — with the 24 solar terms held as its named points and term-level questions answered here (§8.6); 2033's leap month lands as the eleventh by the machinery. Conversion is computation: a converted date carries the derived provenance kind, citing the date as stated, the system converted to, and the machinery — never testimony. Grid arithmetic is not duration arithmetic: 'one month from now' is the grid's question and only the grid answers it, while '+ 30 days' stays Quantification's. A system not held declines at the holding (§8.11), unapproximated from its name; the frame's season convention does not move and does not start citing Calendar. Registered holdings: calendar-conversion, calendar-grid-arithmetic, calendar-lunisolar-conversion, calendar-solar-terms (capability-registry.ts)."
    },
    {
      "id": "functions/timeline",
      "title": "Timeline",
      "type": "Unit",
      "parent": "functions",
      "state": "partial",
      "percent": 40,
      "path": "functions/timeline",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/timeline.ts (conversationTimeline, planTimeline, relateEntries, ALLEN_COMPOSITION_TABLE)",
      "summary": "Timeline: the Functions Unit's line resource (design: docs/ansci/time-scheduling-design-note.md §8.7–§8.11; built C3, 2026-11-20) — the line to Calendar's grid. A Timeline is a held object: entries with extents (a point, or an interval) and their standings, under an owner whose kind fixes how entries enter — the conversation's own (built from the session's records: problems opened, expectations and schedule items registered and taken up, on the turn-order axis), a plan's (the schedule register viewed as a line, nothing new held), a knowledge timeline (entries through the testimony gates; none banked today, and the seat says so). Relations are Allen's interval algebra, ported: the thirteen basic relations from their endpoint definitions, the converse structure, and the composition table materialised as data by endpoint enumeration — checked against the paper's own example, not transcribed. A computed relation is a derivation, inheriting the weaker extent's standing. Durations are read off the line (§8.9), through a conversion where endpoints stand in different systems. The addendum's declines stand at their locations: the unplaceable entry, the relation across unconverted systems, the duration without both endpoints (§8.11). Scheduling's placement fields went live alongside (C3): patterns from Form's Repetition, dates from Calendar, relations re-computed at the sweep with a lapse recorded as an event. Registered holdings: timeline-relations, timeline-duration-read-off (capability-registry.ts); the placement holding is Scheduling's."
    },
    {
      "id": "error-failure",
      "title": "ErrorFailure Unit",
      "type": "Unit",
      "parent": "system",
      "state": "placeholder",
      "percent": 0,
      "path": "error-failure",
      "file": null,
      "external": false,
      "currentCode": null,
      "summary": "The ErrorFailure Unit: a top-level unit (owner's direction, 2026-11-20) that authors the account of why something could not be done. When a problem-solving walk exhausts its strategies or reaches its loop budget, or a route ends with a need undischarged, the record of the attempt comes here — the problem, the strategies tried, the loops spent, the step where it stopped, the capability or information lacked, and which holdings were checked before the lack was declared — and this unit composes the explanation from that record: it assembles, it does not invent. Its working counterpart inside Reasoning is the ProblemSolving Unit's ReasoningErrorFailure subunit, which assembles attempt records and files them here, following the system's bridge pattern. Like the ProblemSolving Unit it never speaks: its accounts are typed records, and the Planner authors any reply that carries one. Its accounts also accumulate as the system's failure knowledge — the same lack recurring is a located work item (a capability to build, knowledge to bank, a strategy to repair), not a repeated surprise. Placeholder seat only (owner's direction, 2026-11-20): no account machinery is built, no producer is wired, nothing is built."
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
      "currentCode": "speaking sites in src/ansci/plan.ts + generate.ts, not yet separated",
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
      "percent": 60,
      "path": "coherence/coherence-analysis",
      "file": null,
      "external": false,
      "currentCode": "src/ansci/coherence.ts",
      "summary": "Works in both directions, at several levels. Inbound: how what comes in makes sense — the words and the sentence, the situation, the stream of what has been said; what doesn't fit, and what information is missing (e.g. an unknown person's 'I was furious' → 'Furious about what?'). Outbound: used by the Verbalizer — what goes out is checked as it is verbalized, so that what is said makes sense too. Since 2026-11-17 it also prices NormalcyAssessment's flags — by KIND, at standings filed in its own words (an obviousness or self-redundancy flag: answered from the classification or the record, the oddity registered and nowhere spoken; a gibberish flag: the priced move is the repair question). The pricing never reads the flags' table evidence: kinds price, numbers don't. Standing raised 55 → 60 for the new pricing duty, which is built and specimen-pinned."
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
      "currentCode": "scripts/ansci-chat.mjs",
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
      "to": "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit",
      "kind": "connection",
      "label": "uses"
    },
    {
      "from": "lpu/normalcy-assessment",
      "to": "ontology-core/normalcy-unit",
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
