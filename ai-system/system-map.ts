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
      "percent": 90,
      "path": "lpu/parser/token",
      "file": null,
      "external": false,
      "currentCode": "src/fork/sentence.ts",
      "summary": "Breaks the sentence into addressed tokens."
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
      "percent": 85,
      "path": "lpu/parser/valency",
      "file": null,
      "external": false,
      "currentCode": "src/fork/framenet-lex.ts, features.ts",
      "summary": "What arguments each verb takes, and in which roles."
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
      "summary": "What the system holds: the correspondence graph and its tables and stores."
    },
    {
      "id": "knowledge/correspondence-graph",
      "title": "Correspondence graph",
      "type": "Store",
      "parent": "knowledge",
      "state": "partial",
      "percent": 75,
      "path": "knowledge/correspondence-graph",
      "file": null,
      "external": false,
      "currentCode": "src/fork/classify.ts; foundation src/graph.ts, src/seed.ts",
      "summary": "The meaning graph: correspondences, with the generating and controlling cycles as its relations."
    },
    {
      "id": "knowledge/classification",
      "title": "Classification",
      "type": "Table",
      "parent": "knowledge",
      "state": "partial",
      "percent": 60,
      "path": "knowledge/classification",
      "file": null,
      "external": false,
      "currentCode": "src/fork/classify.ts",
      "summary": "The classification table: (concept, aspect) assertions with provenance and confidence. 164 entries; coverage is the constraint."
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
      "currentCode": "src/fork/wordnet-lex.ts, framenet-lex.ts",
      "summary": "Word senses and verb frames the parser consults."
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
      "currentCode": "src/fork/plan.ts",
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
      "percent": 40,
      "path": "intake/cskg",
      "file": null,
      "external": false,
      "currentCode": "src/fork/cskg-feed.ts, cskg-ingest.ts",
      "summary": "Relational commonsense tier. Its data is a local artifact, never shipped."
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
      "to": "knowledge/correspondence-graph",
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
      "to": "knowledge/correspondence-graph",
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
      "to": "knowledge/correspondence-graph",
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
