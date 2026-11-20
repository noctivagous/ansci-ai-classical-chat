/**
 * discourse-record.ts — awareness/discourse-record: the Discourse
 * Record reader (the discourse/uptake programme, Design 1,
 * 2026-11-19).
 *
 * The unit's one-sentence charter: the Social Unit reads the
 * SITUATION (who is here, what phase, what is owed); this unit
 * reads the EXCHANGE — what has accumulated between the parties,
 * in what order, what moved, and what still stands available for
 * return. It is the reader the causal analysis (2026-11-19, cause
 * C4) found missing: the session ledgers held every fact, but no
 * unit read them INTO a discourse structure — X1's link
 * reconstructed connection by lemma-scan at render time, and
 * each consultee re-derived its own slice of the record.
 *
 * THE DERIVED-VIEW DISCIPLINE (the design's §1.2, binding): every
 * serving below is a pure derivation over the session ledgers,
 * computed on consult and never stored — the ledgers remain the
 * only store of the facts, exactly as `listOpenUnknowns` derives
 * its view in session.ts and as the Interlocutor register's
 * entries carry the manner of their evidence. Every served item
 * carries POINTERS to its ledger source (a ledger name and an
 * index), so a consultee — or an audit — can walk from any
 * serving back to the record it was derived from. The reader
 * keeps no state of its own between consults.
 *
 * WHAT IT SERVES (§1.3):
 *  - topic histories: a topic → its events, its standing states,
 *    and its superseded states recovered from the supersession
 *    deltas, sequenced by turn and stream order;
 *  - state movements: supersession chains as first-class
 *    objects — a holder's state that was replaced, and replaced
 *    again, is ONE movement with links, not scattered deltas;
 *  - salience: a ranking over topics with its derivation served
 *    beside the score (see the determination below);
 *  - open threads: standing subject matter available for
 *    return, owed by nobody — flatly distinct from the
 *    Conversation register's `pending`, which is an obligation
 *    with an owing party. An open thread obliges no one; it is
 *    the record saying "this still stands, if you want it".
 *
 * SALIENCE — THE BUILD DETERMINATION (owner ruling 5,
 * 2026-11-19: the weights are set at build as a recorded
 * determination; recorded here and in GAPS.md):
 *  - standing-ness is the GATE: a topic with no standing
 *    content (no standing state held by it, no event mentioning
 *    it) scores 0 and is never served as an open thread — what
 *    was superseded away and never replaced is not returnable
 *    matter, however often it recurred;
 *  - recurrence is the spine term: +1.0 per history item
 *    (events, standing states, superseded states alike — each
 *    is a turn the conversation spent on the topic);
 *  - recency is a bounded bonus: +2.0 × 1/(1 + age), age in
 *    turns since the topic was last touched — worth at most
 *    two returns, decaying hyperbolically, so a fresh topic can
 *    outrank a stale single mention but never a recurrent one
 *    on freshness alone, and an old recurrent topic stays
 *    reachable at a closing many turns later;
 *  - visitor-emphasis is named and EXCLUDED from v1: the record
 *    carries no emphasis signal distinct from recurrence and
 *    the Social reading, and inventing one would file evidence
 *    nobody recorded.
 *  score = standing ? recurrence + recency : 0. The derivation
 *  (item count, age, the two terms) is served with every score.
 *
 * LIMITS (§1.4, binding): the reader reads, derives and serves.
 * It never speaks, never authors a reply, never originates a
 * world claim, and raises NO demands (owner ruling 2) —
 * consultees pull during planning, after assessment and
 * registration and after the Social reading, and what they do
 * with a serving is their own move, priced and traced in their
 * own house. Placement: an Awareness unit beside the Social
 * Unit (owner ruling 1). The system map's awareness/ tree is
 * the owner's record to amend; this module does not add a map
 * node.
 */
import type { EventRecord, Session, StateRecord } from "./session";

/* ------------------------------------------------------------------ */
/* Pointers                                                            */
/* ------------------------------------------------------------------ */

/** A pointer to one ledger source: the ledger's name and the
 *  record's index in it. A serving's audit is walking its
 *  pointers back to these records. */
export type LedgerPointer =
  | { ledger: "event"; index: number }
  | { ledger: "state"; index: number }
  | { ledger: "supersession"; index: number }
  | { ledger: "topic"; index: number };

/** Resolve a pointer to the record it names (the audit walk). */
export function resolvePointer(session: Session, pointer: LedgerPointer): unknown {
  switch (pointer.ledger) {
    case "event":
      return session.events[pointer.index];
    case "state":
      return session.states[pointer.index];
    case "supersession":
      return session.supersessions[pointer.index];
    case "topic":
      return session.topics[pointer.index];
  }
}

/* ------------------------------------------------------------------ */
/* Topic histories                                                     */
/* ------------------------------------------------------------------ */

export interface HistoryItem {
  kind: "event" | "state" | "superseded-state";
  turn: number;
  /** The item's own ledger source. For a superseded state the
   *  pointer names the supersession delta the state was
   *  recovered from (the state itself no longer stands in the
   *  states ledger — the delta is its only store). */
  pointer: LedgerPointer;
  event?: EventRecord;
  state?: StateRecord;
}

export interface TopicHistory {
  lemma: string;
  raisedTurn: number;
  lastTouchedTurn: number;
  topicPointer: LedgerPointer;
  /** Sequenced by (turn, stream order): within a turn, events
   *  in ledger order, then states, then superseded states —
   *  the order the statement flow records a turn's content. */
  items: HistoryItem[];
  /** The topic's standing states (held by the topic), each with
   *  its states-ledger pointer. */
  standingStates: { state: StateRecord; pointer: LedgerPointer }[];
  /** Standing content stands: a standing state, or an event
   *  mentioning the topic (events are never superseded — an
   *  event in the record is standing record content). */
  standing: boolean;
}

/** The lemmas an event mentions, in role order. */
function eventLemmas(e: EventRecord): (string | undefined)[] {
  return [e.verb, e.agent, e.patient, e.theme, e.location, e.recipient, e.about];
}

/**
 * One topic's history, derived on consult. A state belongs to
 * the topic when the topic HOLDS it (states are predicated of
 * their holder: the leg's states are the states whose holder is
 * 'leg'); an event belongs when the topic fills any of its
 * roles. Superseded states are recovered from the deltas whose
 * replaced state the topic held.
 */
export function topicHistory(session: Session, lemma: string): TopicHistory | undefined {
  const topicIndex = session.topics.findIndex((t) => t.lemma === lemma);
  if (topicIndex < 0) return undefined;
  const topic = session.topics[topicIndex];
  const items: HistoryItem[] = [];
  session.events.forEach((event, index) => {
    if (eventLemmas(event).includes(lemma)) {
      items.push({ kind: "event", turn: event.turn, pointer: { ledger: "event", index }, event });
    }
  });
  const standingStates: TopicHistory["standingStates"] = [];
  session.states.forEach((state, index) => {
    if (state.holder === lemma) {
      standingStates.push({ state, pointer: { ledger: "state", index } });
      items.push({ kind: "state", turn: state.turn, pointer: { ledger: "state", index }, state });
    }
  });
  session.supersessions.forEach((delta, index) => {
    if (delta.replaced.holder === lemma) {
      items.push({
        kind: "superseded-state",
        turn: delta.replaced.turn,
        pointer: { ledger: "supersession", index },
        state: delta.replaced,
      });
    }
  });
  const streamRank = (i: HistoryItem): number => (i.kind === "event" ? 0 : i.kind === "state" ? 1 : 2);
  items.sort((a, b) => a.turn - b.turn || streamRank(a) - streamRank(b) || a.pointer.index - b.pointer.index);
  return {
    lemma,
    raisedTurn: topic.raisedTurn,
    lastTouchedTurn: topic.lastTouchedTurn,
    topicPointer: { ledger: "topic", index: topicIndex },
    items,
    standingStates,
    standing: standingStates.length > 0 || items.some((i) => i.kind === "event"),
  };
}

/** Every topic's history, in topic-ledger order. */
export function topicHistories(session: Session): TopicHistory[] {
  return session.topics
    .map((t) => topicHistory(session, t.lemma))
    .filter((h): h is TopicHistory => h !== undefined);
}

/* ------------------------------------------------------------------ */
/* State movements                                                     */
/* ------------------------------------------------------------------ */

export interface MovementLink {
  /** The turn the replacement was recorded. */
  turn: number;
  /** The supersession delta this link is read from. */
  pointer: LedgerPointer;
  from: StateRecord;
  to: StateRecord;
}

export interface StateMovement {
  holder: string;
  /** The chain's links, in turn order: each link's `to` is the
   *  next link's `from` (by record identity where the flow
   *  preserved it, else by holder/lemma/turn equality). */
  links: MovementLink[];
  /** The chain's standing head — the final link's `to`, when it
   *  still stands in the states ledger. Absent when the head
   *  was removed without a further delta (not a shape the
   *  recording flow produces; the absence is served, not
   *  papered over). */
  head?: { state: StateRecord; pointer: LedgerPointer };
  startTurn: number;
  lastTurn: number;
}

function sameState(a: StateRecord, b: StateRecord): boolean {
  return a === b || (a.holder === b.holder && a.lemma === b.lemma && a.turn === b.turn && a.negated === b.negated);
}

/**
 * The session's state movements, derived on consult: maximal
 * chains of supersession deltas, per holder. A state that was
 * never superseded is not a movement (it simply stands; the
 * timelines below serve it). Movements are returned in order of
 * their first link's turn.
 */
export function stateMovements(session: Session, holder?: string): StateMovement[] {
  const deltas = session.supersessions
    .map((delta, index) => ({ delta, index }))
    .filter(({ delta }) => holder === undefined || delta.holder === holder)
    .sort((a, b) => a.delta.turn - b.delta.turn || a.index - b.index);
  const used = new Set<number>();
  const movements: StateMovement[] = [];
  for (const start of deltas) {
    if (used.has(start.index)) continue;
    const links: MovementLink[] = [];
    let cursor: { delta: (typeof deltas)[number]["delta"]; index: number } | undefined = start;
    while (cursor) {
      used.add(cursor.index);
      links.push({
        turn: cursor.delta.turn,
        pointer: { ledger: "supersession", index: cursor.index },
        from: cursor.delta.replaced,
        to: cursor.delta.replacing,
      });
      const next = deltas.find(
        (c) => !used.has(c.index) && c.delta.holder === cursor!.delta.holder && sameState(c.delta.replaced, cursor!.delta.replacing),
      );
      cursor = next;
    }
    const last = links[links.length - 1];
    const headIndex = session.states.findIndex((s) => sameState(s, last.to));
    movements.push({
      holder: start.delta.holder,
      links,
      head: headIndex >= 0 ? { state: session.states[headIndex], pointer: { ledger: "state", index: headIndex } } : undefined,
      startTurn: links[0].turn,
      lastTurn: last.turn,
    });
  }
  return movements.sort((a, b) => a.startTurn - b.startTurn);
}

/**
 * One holder's states as a timeline — standing states and
 * superseded states recovered from the deltas, sequenced by
 * (turn, stream order) — filtered by the caller's predicate.
 * This is the general serving X2's feeling-chain walk is a
 * special case of; the walk stays where it is (its answers are
 * pinned), and new consultees read the timeline here.
 */
export interface TimelineItem {
  state: StateRecord;
  turn: number;
  standing: boolean;
  pointer: LedgerPointer;
}

export function stateTimeline(
  session: Session,
  holder: string,
  predicate: (s: StateRecord) => boolean,
): TimelineItem[] {
  const items: TimelineItem[] = [];
  session.states.forEach((state, index) => {
    if (state.holder === holder && predicate(state)) {
      items.push({ state, turn: state.turn, standing: true, pointer: { ledger: "state", index } });
    }
  });
  session.supersessions.forEach((delta, index) => {
    if (delta.holder === holder && predicate(delta.replaced)) {
      items.push({ state: delta.replaced, turn: delta.replaced.turn, standing: false, pointer: { ledger: "supersession", index } });
    }
  });
  items.sort((a, b) => a.turn - b.turn || a.pointer.index - b.pointer.index);
  return items;
}

/**
 * One agent's events as a timeline, in turn order, each with
 * its ledger pointer — the event counterpart of the state
 * timeline. Uptake reads it for the event a register's
 * earlier telling carried (DR-2's reader, UP-1's ground).
 */
export interface EventTimelineItem {
  event: EventRecord;
  turn: number;
  pointer: LedgerPointer;
}

export function eventTimeline(session: Session, agent: string): EventTimelineItem[] {
  const items: EventTimelineItem[] = [];
  session.events.forEach((event, index) => {
    if (event.agent === agent) {
      items.push({ event, turn: event.turn, pointer: { ledger: "event", index } });
    }
  });
  items.sort((a, b) => a.turn - b.turn || a.pointer.index - b.pointer.index);
  return items;
}

/* ------------------------------------------------------------------ */
/* Salience and open threads                                           */
/* ------------------------------------------------------------------ */

export interface Salience {
  score: number;
  /** The derivation, served with the score: the recurrence
   *  term is the history's item count, the recency term the
   *  bounded bonus of the determination above. */
  items: number;
  age: number;
  recency: number;
  standing: boolean;
}

/** One topic's salience at a turn, with its derivation. */
export function salienceOf(session: Session, lemma: string, currentTurn: number): Salience | undefined {
  const history = topicHistory(session, lemma);
  if (!history) return undefined;
  const age = Math.max(0, currentTurn - history.lastTouchedTurn);
  const recency = 2 / (1 + age);
  const items = history.items.length;
  return {
    score: history.standing ? items + recency : 0,
    items,
    age,
    recency,
    standing: history.standing,
  };
}

export interface RankedTopic {
  lemma: string;
  history: TopicHistory;
  salience: Salience;
}

/** All standing topics ranked by salience (score descending;
 *  ties by most recently touched, then lemma — a deterministic
 *  order consultees can rely on). */
export function rankedTopics(session: Session, currentTurn: number): RankedTopic[] {
  const ranked: RankedTopic[] = [];
  for (const history of topicHistories(session)) {
    const salience = salienceOf(session, history.lemma, currentTurn);
    if (salience && salience.standing) ranked.push({ lemma: history.lemma, history, salience });
  }
  return ranked.sort(
    (a, b) =>
      b.salience.score - a.salience.score ||
      b.history.lastTouchedTurn - a.history.lastTouchedTurn ||
      a.lemma.localeCompare(b.lemma),
  );
}

export interface OpenThread extends RankedTopic {
  /** The thread's salient spine, as pointers: the first item,
   *  the latest event (if any), and the standing states — the
   *  servings a return or a closing actually speaks from, each
   *  auditable to its ledger source. */
  spine: LedgerPointer[];
}

/**
 * The open threads at a turn: standing topics not touched in
 * the current turn, salience-ranked. Owed by nobody — see the
 * header. A topic touched this turn is the turn's own business,
 * not a thread available for return.
 */
export function openThreads(session: Session, currentTurn: number): OpenThread[] {
  return rankedTopics(session, currentTurn)
    .filter((r) => r.history.lastTouchedTurn < currentTurn)
    .map((r) => {
      const spine: LedgerPointer[] = [];
      const first = r.history.items[0];
      if (first) spine.push(first.pointer);
      const events = r.history.items.filter((i) => i.kind === "event");
      const latestEvent = events[events.length - 1];
      if (latestEvent && !spine.includes(latestEvent.pointer)) spine.push(latestEvent.pointer);
      for (const s of r.history.standingStates) {
        if (!spine.includes(s.pointer)) spine.push(s.pointer);
      }
      return { ...r, spine };
    });
}
