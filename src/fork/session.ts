/**
 * session.ts — the fork turn loop's light situation record (Slice C).
 *
 * What persists across turns is deliberately small and is built ONLY
 * from parsed meaning graphs: entities mentioned (Earth nodes), events
 * (verb clauses with their agent/patient), and states (predicate
 * clauses and classified verb-states, with their holders). The speaker
 * is recorded as 'you' — the person talking — never by name.
 *
 * Pronoun resolution is recency-within-a-compatible-set: 'it'/'them'
 * resolve to the most recently mentioned thing-entity (not a person,
 * not another pronoun). That is the whole mechanism; it has no
 * gender/number agreement beyond the pronoun's own class and no
 * bridging inference. The limit is named here because it is real:
 * in a longer conversation this will misresolve, and the trace says
 * what it resolved to so the failure is visible.
 */
import type { Graph } from "../graph";
import { buildForkGraph } from "./join";
import type { Element } from "./sentence";

export interface EntityRecord {
  lemma: string;
  kind: "person" | "thing";
  turn: number;
}

export interface EventRecord {
  verb: string;
  agent?: string; // resolved lemma, 'you' for the speaker
  patient?: string;
  theme?: string;
  location?: string;
  recipient?: string;
  turn: number;
  text: string;
}

export interface StateRecord {
  holder: string; // 'you' for the speaker
  lemma: string;
  concept?: string;
  element?: Element;
  negated?: boolean;
  turn: number;
}

export interface Session {
  graph: Graph;
  turnCount: number;
  entities: EntityRecord[];
  events: EventRecord[];
  states: StateRecord[];
  topics: string[];
}

export function newSession(): Session {
  return {
    graph: buildForkGraph(),
    turnCount: 0,
    entities: [],
    events: [],
    states: [],
    topics: [],
  };
}

const PRONOUNS = new Set(["i", "you", "he", "she", "him", "it", "them", "we", "they"]);
const PERSON_LEMMAS = new Set(["i", "you", "he", "she", "him", "we", "they", "cook", "man", "sister"]);

/** The speaker's first person is the session's 'you'. */
export function holderOf(lemma: string): string {
  return lemma === "i" ? "you" : lemma;
}

/**
 * Resolve a pronoun lemma against the recorded entities: the most
 * recent compatible one ('it'/'them' → things; others → the speaker
 * record). Returns undefined when nothing compatible has been said.
 */
export function resolvePronoun(session: Session, pronoun: string, beforeTurn: number): EntityRecord | undefined {
  if (pronoun === "i") return { lemma: "you", kind: "person", turn: beforeTurn };
  const wantKind = pronoun === "it" || pronoun === "them" ? "thing" : "person";
  for (let i = session.entities.length - 1; i >= 0; i--) {
    const e = session.entities[i];
    if (e.turn < beforeTurn && e.kind === wantKind && !PRONOUNS.has(e.lemma)) return e;
  }
  return undefined;
}

export function recordEntity(session: Session, lemma: string, turn: number): void {
  if (PRONOUNS.has(lemma)) return;
  session.entities.push({ lemma, kind: PERSON_LEMMAS.has(lemma) ? "person" : "thing", turn });
  if (!session.topics.includes(lemma)) session.topics.push(lemma);
}
