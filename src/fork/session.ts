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
 *
 * R0 (reply-planning programme, design note §9.4) grows the record
 * by the four fields the planner will read: every state carries
 * its origin (the classification leg any derivation from it begins
 * with, that classification's confidence as its starting support,
 * and the tier of its provenance — or, for a state taken straight
 * from the person's sentence, an origin that says exactly that);
 * topics are first-class records with the turns they were raised
 * and last touched; the session carries its disposition
 * composition (§9.1) beside the turn counter; and a supersession,
 * when one happens, is recorded as a delta rather than a silent
 * overwrite. Nothing in R0 reads these fields to change a reply.
 *
 * R6 (design note §8.1) grows it again: the session may carry an
 * AWARENESS FRAME — the season and daypart of the session's
 * opening, supplied by the shell as a date/time and CLASSIFIED
 * into the record (the season's table row, the daypart's table
 * row and its seed polarity leg), in the same origin style as a
 * state's — and a ROLE composition beside the disposition, a
 * slot nothing reads behaviourally in this slice. The session
 * also records the initiative moves it has made (§8.10): the
 * bound (one move in any five turns) and the no-repeat rule
 * read that record.
 */
import type { Graph } from "../graph";
import { buildForkGraph } from "./join";
import type { Element } from "./sentence";
import { NEUTRAL_COMPOSITION, type Composition } from "./composition";
import { tierOfProvenance, type Tier } from "./pricing";
import { lookupClassification, type ClassificationEntry } from "./classify";
import type { SemanticObject, SenseChannel } from "./semantic-object";
import type { InformationObject, Need } from "./info-object";
import {
  initialConversation,
  initialInterlocutor,
  type ConversationRegister,
  type InterlocutorRegister,
} from "./social";

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

/**
 * Where a standing state came from (§9.4.1). A classified state's
 * origin is its classification: the leg every derivation from the
 * state begins with (in join.ts's path format), the
 * classification's confidence (the support any derivation from
 * this state starts from), and the tier of the classification's
 * provenance (pricing.ts). A parsed state's element, if it has
 * one, is only the sentence layer's semantic address for the
 * person's own words — no classification and no derivation stand
 * behind it, and the origin says so rather than dressing the
 * parse up as one.
 */
export interface StateOrigin {
  /** "stated" (E1, 2026-11-19): the state was read from the
   *  person's own first-person feeling statement on the surface
   *  (the feelings-first registration) — the word is filed as a
   *  feeling by the EDU/LEDU authorities but carries no
   *  classification entry, so no derivation stands behind the
   *  state beyond the statement itself. */
  kind: "classified" | "parsed" | "stated";
  path?: string;
  support?: number;
  tier?: Tier;
  provenance?: string;
}

/** The origin of a state classified by a table entry. */
export function classifiedOrigin(entry: ClassificationEntry): StateOrigin {
  return {
    kind: "classified",
    path: `${entry.concept} —HAS_ELEMENT→ ${entry.element}`,
    support: entry.confidence,
    tier: tierOfProvenance(entry.provenance),
    provenance: entry.provenance,
  };
}

export interface StateRecord {
  holder: string; // 'you' for the speaker
  lemma: string;
  concept?: string;
  element?: Element;
  negated?: boolean;
  turn: number;
  origin: StateOrigin;
}

/** A topic (§9.4.2): an entity, with the turns it was raised and
 *  last touched. Cohesion's "return" (§8.7 S3) and initiative
 *  (§8.10) read these indices. */
export interface TopicRecord {
  lemma: string;
  raisedTurn: number;
  lastTouchedTurn: number;
}

/**
 * A supersession recorded as a delta (§9.4.4): the state that was
 * replaced, the state that replaced it, and the turn it happened.
 * §8.7's S12 acknowledgement is built from this delta, not from a
 * formula.
 */
export interface SupersessionRecord {
  holder: string;
  replaced: StateRecord;
  replacing: StateRecord;
  turn: number;
}

/**
 * The shell's frame input (§8.1): a plain date/time record —
 * the hour always, the month and day directly or via an ISO
 * date string. Wiring a real clock into a shell is R7's work;
 * here the parameter exists and tests supply it.
 */
export interface FrameInput {
  month?: number;
  day?: number;
  hour: number;
  dateISO?: string;
}

/**
 * The calendar conventions of the frame, stated as data. Both
 * are CONNECTIVE-LAYER conventions: they map a calendar to a
 * season or daypart NAME, and assert nothing themselves. The
 * classification of the name — its element, its polarity — is
 * the table's and the seed's, read at session opening; the
 * convention is never presented as attested.
 */
export const SEASON_CONVENTION = "meteorological seasons by month, northern hemisphere (3–5 spring, 6–8 summer, 9–11 autumn, 12/1/2 winter) — a connective-layer convention; the season's classification is the table's";
export const DAYPART_CONVENTION = "dayparts by hour (5–10 dawn, 11–16 midday, 17–22 dusk, 23–4 night) — a connective-layer convention; the daypart's classification is the table's and the seed's";

/** The season a month falls in, under SEASON_CONVENTION. */
export function seasonForMonth(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/** The daypart an hour (0–23) falls in, under DAYPART_CONVENTION. */
export function daypartForHour(hour: number): string {
  if (hour >= 5 && hour <= 10) return "dawn";
  if (hour >= 11 && hour <= 16) return "midday";
  if (hour >= 17 && hour <= 22) return "dusk";
  return "night";
}

/**
 * The awareness frame (§8.1) as it stands in the record: the
 * season and the daypart of the session's opening, each
 * CLASSIFIED — the entry's element with a state origin in
 * R0's style (the classification leg, its confidence as
 * support, the tier of its provenance) — the daypart carrying
 * its polarity leg as well, read from the seed node's
 * POLARITY_OF edge. A leg the graph does not hold is absent,
 * with the reason recorded; nothing is invented to fill it.
 */
export interface FrameRecord {
  supplied: { month?: number; day?: number; hour: number };
  season?: { name: string; element: Element; origin: StateOrigin };
  seasonAbsentReason?: string;
  daypart: {
    name: string;
    element?: Element;
    origin?: StateOrigin;
    polarity?: string;
    polarityLeg?: string;
    unclassifiedReason?: string;
  };
}

/**
 * Build the frame from the shell's input, against the joined
 * graph: the season name from the month under the convention,
 * its classification from the table's "season" entry; the
 * daypart name from the hour, its element from the table's
 * "time" entry and its polarity from the seed node's
 * POLARITY_OF edge. No month (directly or via the ISO date)
 * → no season, with the reason named.
 */
export function buildFrame(graph: Graph, input: FrameInput): FrameRecord {
  let month = input.month;
  let day = input.day;
  if ((month === undefined || day === undefined) && input.dateISO) {
    const parts = input.dateISO.split("-").map((p) => Number.parseInt(p, 10));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      if (month === undefined) month = parts[1];
      if (day === undefined) day = parts[2];
    }
  }
  const frame: FrameRecord = {
    supplied: {
      ...(month !== undefined ? { month } : {}),
      ...(day !== undefined ? { day } : {}),
      hour: input.hour,
    },
    daypart: { name: daypartForHour(input.hour) },
  };
  if (month === undefined) {
    frame.seasonAbsentReason = "no month supplied (directly or via an ISO date), so no season is determined";
  } else {
    const name = seasonForMonth(month);
    const entry = lookupClassification(name, "season");
    if (entry) frame.season = { name, element: entry.element, origin: classifiedOrigin(entry) };
    else frame.seasonAbsentReason = `the classification table holds no "season" entry for '${name}'`;
  }
  const dp = frame.daypart;
  const dpEntry = lookupClassification(dp.name, "time");
  const missing: string[] = [];
  if (dpEntry) {
    dp.element = dpEntry.element;
    dp.origin = classifiedOrigin(dpEntry);
  } else {
    missing.push(`the classification table holds no "time" entry for '${dp.name}'`);
  }
  const dpNode = graph.nodeByName(dp.name);
  const polarityEdge = dpNode ? graph.outEdges(dpNode.id, "POLARITY_OF")[0] : undefined;
  const polarityName = polarityEdge ? graph.getNode(polarityEdge.to)?.name : undefined;
  if (polarityName) {
    dp.polarity = polarityName;
    dp.polarityLeg = `${dp.name} —POLARITY_OF→ ${polarityName}`;
  } else {
    missing.push(`the graph holds no POLARITY_OF leg for '${dp.name}'`);
  }
  if (missing.length) dp.unclassifiedReason = missing.join("; ");
  return frame;
}

/**
 * An initiative move the session has made (§8.10), recorded so
 * the bound (a move at turn t forbids another before t + 5)
 * and the no-repeat rule (a state, or an event's gap, once
 * taken up is not taken up again while the same record stands)
 * can read them.
 */
export interface InitiativeRecord {
  turn: number;
  shape: "unexpressed-state" | "persisting-gap" | "standing-feeling" | "topic-return";
  state?: { holder: string; lemma: string; stateTurn: number };
  event?: { verb: string; eventTurn: number; role: string };
}

/**
 * The persistent scene graph (2026-11-17): what is talked about,
 * as a scene, kept across the conversation — NOT rebuilt per
 * utterance. The Senses-Scening Unit (senses-scening.ts) produces
 * fragments; fragments are placed INTO the running scene here.
 * Entities are keyed by lemma (node ids are per-turn); an entity
 * already in the scene is referenced, not re-minted.
 */
export interface SceneEntityRecord {
  lemma: string;
  kind: "person" | "thing";
  firstTurn: number;
  lastTurn: number;
  /** Sensory qualities said of this entity, by channel. */
  qualities: { channel: SenseChannel; value: string; turn: number }[];
}

/** An unknown slot ON a scene entity (owner's ruling, 2026-11-17):
 *  a fact about an established entity the conversation has not
 *  supplied (the airport's city; a default-placed entity's exact
 *  location), explicit and typed, persistent until a later object
 *  fills it. The slots live here, on the scene graph — the
 *  session-and-situation/open-unknowns register is a derived view
 *  over them (listOpenUnknowns), never a second store. */
export interface SceneUnknownSlot {
  /** The scene entity's lemma. */
  of: string;
  /** The slot kind ("city", "exact-location", …). */
  kind: string;
  status: "open" | "filled";
  openedTurn: number;
  filledTurn?: number;
  value?: string;
}

/** A spatial relation standing in the scene graph, tiered:
 *  "said" (the sentence stated it), "placed-by-scene" (placement
 *  in the running scene gives it), "default-placed" (the spatial
 *  faculty's coarse placement — a region, never coordinates).
 *  Placements are defeasible: a later said relation for the same
 *  figure supersedes a placed one, recorded by supersededTurn —
 *  the supersession pattern, not an edit in place. */
export interface SceneStandingRelation {
  figure: string;
  relation: string;
  ground: string;
  tier: "said" | "placed-by-scene" | "default-placed";
  basis?: string;
  turn: number;
  supersededTurn?: number;
}

/** A relation the qualitative constraint engine DERIVED over the
 *  scene's standing placements (qualreas.ts, RCC-8 path
 *  consistency; senses-scening.ts runs it at every scene update):
 *  no turn stated or placed this pair directly — the algebra's
 *  composition over the standing relations leaves only these base
 *  relations possible. Tier "placed-by-scene": a derivation from
 *  placements is never a said fact. Recomputed wholesale at each
 *  update, never accumulated, and emptied when the standing
 *  placements are inconsistent (see SceneSpatialFlag). */
export interface SceneDerivedRelation {
  figure: string;
  ground: string;
  algebra: "rcc8";
  /** The RCC-8 base relations still possible between the pair. */
  relations: string[];
  tier: "placed-by-scene";
  basis: string;
  turn: number;
}

/** A flagged defect in the scene's spatial record: the standing
 *  placements, read as RCC-8 constraints, contradict each other
 *  (path consistency emptied a pair's relation set). The flag is
 *  recorded on the scene and an open unknown slot of kind
 *  "spatial-consistency" is opened for the figure — the flag is
 *  never silently kept as if the placements agreed. */
export interface SceneSpatialFlag {
  kind: "inconsistent-placement";
  detail: string;
  turn: number;
}

export interface SceneGraph {
  id: string;
  establishedTurn: number;
  /** The scene's container/anchor place lemma, when the
   *  establishing fragment named one (the airport). Placement
   *  and default placement locate entities against it. */
  container?: string;
  entities: SceneEntityRecord[];
  relations: SceneStandingRelation[];
  /** Relations derived by the qualitative constraint engine over
   *  the standing placements (SceneDerivedRelation) — recomputed
   *  at every update; absent until the first propagation runs. */
  derivedRelations?: SceneDerivedRelation[];
  /** Spatial defects flagged by that engine (SceneSpatialFlag). */
  spatialFlags?: SceneSpatialFlag[];
  unknowns: SceneUnknownSlot[];
  /** The scene's event sequence, in turn order: who did what,
   *  when — the "and then" of the owner's specimen is this
   *  ordering, nothing more exotic. */
  events: { turn: number; verb: string; agent?: string }[];
}

/**
 * A quantity standing in the conversation's ledger (2026-11-17):
 * how much of a kind a holder holds, as the QuantificationUnit
 * (quantification.ts) tracks it. The ledger lives HERE, on the
 * Session — the state is the conversation's, not the unit's
 * (the scene-graph settlement, one slice over: the unit reads,
 * updates and computes over state held on the Session/scene
 * graphs). Records are appended, never edited: a later record
 * for the same (holder, kind) supersedes the earlier as the
 * current amount, and the history is the audit trail.
 *
 * `amount: null` is a BOUNDED UNKNOWN: the conversation said
 * there is some ("some apples", a bare plural) without saying
 * how much — a bound, not a number, and never silently read
 * as one. `tier` is the record's own standing: "said" for a
 * stated amount, "derived" for one computed by an event (a
 * purchase, a transfer). `reading` carries the OKU Numbers
 * slice's filed phase for the amount, where one exists.
 */
export interface QuantityRecord {
  holder: string; // 'you' for the speaker
  /** The counted kind, singular-normalised ("apple"). */
  kind: string;
  amount: number | null;
  unit?: string;
  /** The quantifier the amount came with, where the sentence
   *  quantified without numbering ("some", "all", a bare
   *  plural). "none" records amount 0. */
  quantifier?: string;
  tier: "said" | "derived";
  turn: number;
  /** What produced this record, in plain words. */
  basis: string;
  /** The OKU Numbers slice's reading of this amount (the
   *  ch. 4 number row), where the slice files one. */
  reading?: { number: number; element: string; source: string };
}

/**
 * A quantity problem the ledger refused to paper over
 * (2026-11-17): a delta larger than the tracked amount (an
 * inconsistency — flagged, and the delta NOT applied), or a
 * delta against a bounded-unknown amount (unbounded — the
 * arithmetic has no ground). Flags are records, not edits:
 * the standing amount is left as it was, and the flag says why.
 */
export interface QuantityFlag {
  holder: string;
  kind: string;
  turn: number;
  flag: "inconsistency" | "unbounded";
  detail: string;
}

export interface Session {
  graph: Graph;
  turnCount: number;
  /** The session's disposition (§9.1): setup, set at session
   *  start, changeable only between sessions in v1. */
  disposition: Composition;
  /** The session's role (§8.1): an elemental composition
   *  beside the disposition. A slot in this slice — no
   *  behaviour reads it; it is named in every trace header. */
  role: Composition;
  /** The awareness frame (§8.1), when the shell supplied one
   *  at session opening. Absent otherwise. */
  frame?: FrameRecord;
  entities: EntityRecord[];
  events: EventRecord[];
  states: StateRecord[];
  topics: TopicRecord[];
  supersessions: SupersessionRecord[];
  /** The stream's semantic objects (assess.ts), in order — the
   *  graph of the conversation at object grain: each object links
   *  to the one it follows, and later slices add the fills /
   *  supersedes links between them. */
  objects: SemanticObject[];
  /** The Social Unit's Interlocutor register (social.ts, S1
   *  2026-11-18): the standing picture of the person being talked
   *  with, written only by the unit's reading. */
  interlocutor: InterlocutorRegister;
  /** The cross-conversation Interlocutor store (Social Unit
   *  S6), when the embedding supplies one. Absent, nothing
   *  persists and every conversation is self-contained —
   *  the S1–S5 behaviour exactly. The store is consulted
   *  only once an identity is stated (interlocutor-store.ts
   *  carries the discipline). */
  interlocutorStore?: import("./interlocutor-store").InterlocutorStore;
  /** The Social Unit's Conversation register (social.ts, S1):
   *  the conversation's phase and what is pending. */
  conversation: ConversationRegister;
  /** The conversation's scene graphs (senses-scening.ts), in
   *  order. v1 tracks one running scene — the last — and
   *  fragments are placed into it; scene switching is not yet
   *  distinguished. */
  scenes: SceneGraph[];
  /** The quantity ledger (quantification.ts): every quantity
   *  record the conversation has produced, in order. The
   *  current amount for a (holder, kind) is its LATEST record. */
  quantities: QuantityRecord[];
  /** Quantity problems flagged rather than papered over
   *  (quantification.ts): inconsistencies and unbounded deltas. */
  quantityFlags: QuantityFlag[];
  /** The initiative moves made in this session (§8.10). */
  initiatives: InitiativeRecord[];
}

/** The running scene: the scene fragments are placed into. */
export function currentScene(session: Session): SceneGraph | undefined {
  return session.scenes[session.scenes.length - 1];
}

/**
 * The open-unknowns register (session-and-situation/
 * open-unknowns): the currently-open unknown slots across all
 * the session's scenes, as a DERIVED VIEW over the scene graphs
 * — the slots' only store is the scenes themselves (owner's
 * ruling, 2026-11-17). Awareness's Open gaps reads this listing;
 * it does not own the slots.
 */
export function listOpenUnknowns(session: Session): (SceneUnknownSlot & { sceneId: string })[] {
  const out: (SceneUnknownSlot & { sceneId: string })[] = [];
  for (const s of session.scenes) {
    for (const u of s.unknowns) {
      if (u.status === "open") out.push({ ...u, sceneId: s.id });
    }
  }
  return out;
}

/**
 * The open-unknowns register's second source (the envelope
 * build, 2026-11-17): the SURVIVING needs across the stream's
 * information objects — needs seeded on an object's envelope
 * that no unit discharged and Coherence priced as surviving
 * (info-object.ts). Like listOpenUnknowns this is a DERIVED
 * VIEW: the needs' only store is the envelopes in the stream,
 * and a placement need listed here references its scene-graph
 * slot (its `ref`), which remains the slot's only store.
 * Awareness's Open gaps reads both listings.
 */
export function listSurvivingNeeds(session: Session): (Need & { objectId: string; turn: number })[] {
  const out: (Need & { objectId: string; turn: number })[] = [];
  for (const o of session.objects) {
    // Needs originate on the person's information objects; a
    // reply object's envelope CARRIES copies of the survivors
    // it answered (the reply's own record) — the register
    // reads the originals, so a need is never counted twice.
    if (o.producer !== "person") continue;
    const env = (o as InformationObject).envelope;
    if (!env) continue;
    for (const n of env.needs) {
      if (n.status === "surviving") out.push({ ...n, objectId: o.id, turn: o.turn });
    }
  }
  return out;
}

export function newSession(
  disposition: Composition = NEUTRAL_COMPOSITION,
  frameInput?: FrameInput,
  opts?: { interlocutorStore?: import("./interlocutor-store").InterlocutorStore },
): Session {
  const graph = buildForkGraph();
  return {
    graph,
    turnCount: 0,
    disposition,
    role: NEUTRAL_COMPOSITION,
    ...(frameInput ? { frame: buildFrame(graph, frameInput) } : {}),
    ...(opts?.interlocutorStore ? { interlocutorStore: opts.interlocutorStore } : {}),
    entities: [],
    events: [],
    states: [],
    topics: [],
    supersessions: [],
    objects: [],
    interlocutor: initialInterlocutor(),
    conversation: initialConversation(),
    scenes: [],
    quantities: [],
    quantityFlags: [],
    initiatives: [],
  };
}

/**
 * Replace the standing state for (holder, lemma) with a corrected
 * one, recording the delta. Returns the recorded delta, or
 * undefined when no standing state matches (nothing is recorded
 * then — a supersession of nothing is not an event). Since R5
 * the turn loop's correction trigger calls this for the
 * polarity case (§8.7 S12); supersedeRecord below covers the
 * matches keyed by more than (holder, lemma).
 */
export function supersedeState(session: Session, replacing: StateRecord): SupersessionRecord | undefined {
  const idx = session.states.findIndex((s) => s.holder === replacing.holder && s.lemma === replacing.lemma);
  if (idx < 0) return undefined;
  const [replaced] = session.states.splice(idx, 1);
  session.states.push(replacing);
  const delta: SupersessionRecord = { holder: replacing.holder, replaced, replacing, turn: replacing.turn };
  session.supersessions.push(delta);
  return delta;
}

/**
 * Replace one exact standing record with a corrected one,
 * recording the delta (R5, §8.7 S12). The correction trigger
 * (turn.ts) matches standing states by more than (holder,
 * lemma) — a restated value has a different lemma from the
 * state it corrects, and a polarity match must name the
 * specific duplicate it replaces — so it hands the matched
 * record itself here. Returns the recorded delta, or
 * undefined when the record no longer stands (nothing is
 * recorded then, as in supersedeState).
 */
export function supersedeRecord(session: Session, standing: StateRecord, replacing: StateRecord): SupersessionRecord | undefined {
  const idx = session.states.indexOf(standing);
  if (idx < 0) return undefined;
  session.states.splice(idx, 1);
  session.states.push(replacing);
  const delta: SupersessionRecord = { holder: replacing.holder, replaced: standing, replacing, turn: replacing.turn };
  session.supersessions.push(delta);
  return delta;
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
  const topic = session.topics.find((t) => t.lemma === lemma);
  if (topic) topic.lastTouchedTurn = turn;
  else session.topics.push({ lemma, raisedTurn: turn, lastTouchedTurn: turn });
}
