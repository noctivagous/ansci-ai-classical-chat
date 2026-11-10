/**
 * engine-map.ts — the conversation engine's module graph, as data.
 *
 * Per docs/design-conversation-engine.md §1: the program is a graph
 * of interrelated pieces. Nodes are the pieces (§2, following the
 * user's proposal in docs/user-plans/chat-pieces.txt); edges are
 * their "informs" relations, each labelled with the turn-workspace
 * fields it carries. The wiring is NOT message-passing: pieces are
 * functions over one shared, typed turn workspace (workspace.ts),
 * and the trace cites these node ids, so a replay reads as a path
 * through the engine. Adding a piece edits this map and the code in
 * one motion.
 *
 * Field ownership (§4): each workspace field is written by exactly
 * one piece — the writes lists below are that contract, and the
 * piece modules enforce it (a field is only ever assigned inside
 * its owner's functions). `trace` is the exception by design: it is
 * the shared record every piece appends to, committed to the
 * session's trace ring by memory at the end of the turn.
 */

export type EngineNodeId =
  | "awareness"
  | "disposition"
  | "discourse"
  | "intent"
  | "memory"
  | "context"
  | "everydaysense"
  | "resolver"
  | "situationModel"
  | "solve"
  | "statement"
  | "articulate"
  | "interface";

export type WorkspaceField =
  | "input"
  | "situation"
  | "person"
  | "role"
  | "disposition"
  | "context"
  | "breakdown"
  | "intent"
  | "activeContext"
  | "situationModel"
  | "conclusions"
  | "reply"
  | "trace";

export interface EngineNode {
  id: EngineNodeId;
  /** the proposal's letter + name */
  label: string;
  file: string;
  /** workspace fields this piece is the sole writer of */
  writes: WorkspaceField[];
  /** workspace fields this piece reads */
  reads: WorkspaceField[];
}

export interface EngineEdge {
  from: EngineNodeId;
  to: EngineNodeId;
  /** workspace fields carried along this informs-relation */
  carries: WorkspaceField[];
}

export const ENGINE_NODES: EngineNode[] = [
  {
    id: "awareness",
    label: "A — Awareness (world state, orientation, the person, the role)",
    file: "src/cskg/awareness.ts",
    writes: ["situation", "person", "role"],
    reads: [],
  },
  {
    id: "disposition",
    label: "Disposition — the frame's riding assumptions (elicitation appetite, pattern-speech readiness); inclination only, no fact inventory (the valued-facts template was removed, round 3 T1); setup the turn consults, loaded with the frame by awareness — not a pipeline stage (§11)",
    file: "src/cskg/disposition.ts",
    writes: ["disposition"],
    reads: [],
  },
  {
    id: "context",
    label: "Context — the frame made operative (situation + person + role + memory)",
    file: "src/cskg/context.ts",
    writes: ["context"],
    reads: ["situation", "person", "role", "disposition", "activeContext"],
  },
  {
    id: "everydaysense",
    label: "EverydaySense — standing judgements of ordinariness (graph-derived)",
    file: "src/cskg/everydaysense.ts",
    writes: [],
    reads: ["breakdown"],
  },
  {
    id: "resolver",
    label: "AmbiguityResolver — rival readings: resolve, name, or ask",
    file: "src/cskg/resolver.ts",
    writes: [],
    reads: ["breakdown", "context", "person"],
  },
  {
    id: "discourse",
    label: "B — Information processor (discourse)",
    file: "src/cskg/discourse.ts",
    writes: ["breakdown"],
    reads: ["activeContext"],
  },
  {
    id: "intent",
    label: "C — Intent analyzer",
    file: "src/cskg/intent.ts",
    writes: ["intent"],
    reads: ["breakdown", "situation", "person"],
  },
  {
    id: "memory",
    label: "D — Memory (short-term, long-term)",
    file: "src/cskg/memory.ts",
    writes: ["activeContext"],
    reads: ["breakdown", "intent", "trace"],
  },
  {
    id: "situationModel",
    label: "Situation analysis — the conversation's own micro-world (E5: entities, events, states, attributed relations)",
    file: "src/cskg/situation.ts",
    writes: ["situationModel"],
    reads: ["breakdown", "context", "activeContext"],
  },
  {
    id: "solve",
    label: "E — Query / problem solving (incl. the attestation check: specific-fact asks decline on the graph's silence)",
    file: "src/cskg/solve.ts",
    writes: ["conclusions"],
    reads: ["breakdown", "intent", "activeContext", "situation"],
  },
  {
    id: "statement",
    label: "Statement-turn composition — the reply policy for statements: the conversation's own records lead (situation, person, state), graph testimony only as the graph-distance rule allows (extracted from the turn coordinator, Loop 2)",
    file: "src/cskg/statement.ts",
    writes: ["reply"],
    reads: ["breakdown", "intent", "situation", "person", "conclusions", "situationModel", "disposition"],
  },
  {
    id: "articulate",
    label: "F — Communication articulation",
    file: "src/cskg/articulate.ts",
    writes: ["reply"],
    reads: ["conclusions", "intent", "person", "situation"],
  },
  {
    id: "interface",
    label: "G — Technology interface (CLI, web UI, TUI)",
    file: "src/cskg/chat.ts, demo/",
    writes: ["input"],
    reads: ["reply", "trace"],
  },
];

export const ENGINE_EDGES: EngineEdge[] = [
  { from: "interface", to: "discourse", carries: ["input"] },
  { from: "awareness", to: "context", carries: ["situation", "person", "role"] },
  { from: "disposition", to: "context", carries: ["disposition"] },
  { from: "disposition", to: "statement", carries: ["disposition"] },
  { from: "memory", to: "context", carries: ["activeContext"] },
  { from: "context", to: "discourse", carries: ["context"] },
  { from: "context", to: "intent", carries: ["context"] },
  { from: "context", to: "solve", carries: ["context"] },
  { from: "context", to: "articulate", carries: ["context"] },
  { from: "everydaysense", to: "resolver", carries: [] },
  { from: "resolver", to: "discourse", carries: [] },
  { from: "resolver", to: "solve", carries: [] },
  { from: "awareness", to: "intent", carries: ["situation", "person"] },
  { from: "awareness", to: "solve", carries: ["situation"] },
  { from: "awareness", to: "articulate", carries: ["situation", "person"] },
  { from: "discourse", to: "intent", carries: ["breakdown"] },
  { from: "discourse", to: "memory", carries: ["breakdown"] },
  { from: "discourse", to: "solve", carries: ["breakdown"] },
  { from: "discourse", to: "situationModel", carries: ["breakdown"] },
  { from: "context", to: "situationModel", carries: ["context"] },
  { from: "memory", to: "situationModel", carries: ["activeContext"] },
  { from: "situationModel", to: "solve", carries: ["situationModel"] },
  { from: "situationModel", to: "articulate", carries: ["situationModel"] },
  { from: "situationModel", to: "memory", carries: ["situationModel"] },
  { from: "memory", to: "discourse", carries: ["activeContext"] },
  { from: "memory", to: "solve", carries: ["activeContext"] },
  { from: "intent", to: "memory", carries: ["intent"] },
  { from: "intent", to: "solve", carries: ["intent"] },
  { from: "intent", to: "articulate", carries: ["intent"] },
  { from: "solve", to: "articulate", carries: ["conclusions"] },
  { from: "articulate", to: "interface", carries: ["reply"] },
];

export const ENGINE_MAP = {
  nodes: ENGINE_NODES,
  edges: ENGINE_EDGES,
} as const;

export function engineNode(id: EngineNodeId): EngineNode {
  const n = ENGINE_NODES.find((x) => x.id === id);
  if (!n) throw new Error(`unknown engine node: ${id}`);
  return n;
}
