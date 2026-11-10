/**
 * situation.ts — Situation analysis (design §8, slice E5): the
 * owner of the conversation's SITUATION MODEL.
 *
 * The model is a small live graph of THIS conversation — its
 * entities, events, states and the relations among them — held
 * in the session (SessionState.situation, memory.ts) beside the
 * topic stack and the trace ring, and SEPARATE from CSKG, which
 * holds world knowledge. Before E5 the engine's per-turn world
 * was the breakdown: mentions, referents, topics — a statement
 * was answered with a topic fact because a happening had
 * nowhere to live. The model is that somewhere:
 *
 *   E5a — entities (one per referent, with their surface forms),
 *         events (a verb, participants in roles — actor, object,
 *         recipient, instrument, time, place — every participant
 *         taken from what the surface and the breakdown support,
 *         never invented), states (of entities and of the
 *         person), and identity/coreference: pronouns and
 *         definite references resolve against the model, so
 *         "he", "it" and "then" have somewhere to land (G4's
 *         full form).
 *   E5b — the relation families over that one model, in their
 *         own sections below: CausalityRelation (checked against
 *         CSKG's causal testimony where the graph offers any),
 *         social relations, temporal relations, state tracking.
 *
 * Every situation relation carries its ATTRIBUTION (§8):
 * *asserted* by the person, *known* from the graph, or
 * *inferred* by the engine — plus the standing tuple
 * (standing.ts) wherever a consumer branches on it. Inferred
 * relations are marked as inferences in the trace and in any
 * reply that uses them.
 *
 * Event extraction reads the turn the pieces already analysed:
 * discourse's breakdown and contents breakdown (people, places,
 * things, times — and, at E5, events), person.ts's captured
 * doings and feelings, and discourse's ATOMIC event matching.
 * Where a FrameNet frame matches the event's verb, the frame's
 * element names NAME the generic roles (frames.ts, a read-only
 * side store in the Definitions style); absent a bundle, the
 * generic roles stand and the trace says so.
 *
 * Writes (engine map): `situationModel` — a snapshot of the
 * model as the turn leaves it, assigned only here. The model
 * itself is mutated only by this module's functions.
 * Reads: `breakdown`, `context`, `activeContext`.
 */
import { displayTime, forAddressee } from "./articulate";
import { formSet, matchEvent, STOPWORDS } from "./discourse";
import { frameRoleName, framesForVerb, getFramesStore, type FrameInfo } from "./frames";
import type { CskgGraph } from "./loader";
import type { CaptureResult } from "./person";
import {
  certaintyFromAttribution,
  knownnessFromRecency,
  standingTrace,
  type Standing,
} from "./standing";
import { noteStep, type TurnWorkspace } from "./workspace";
import type { SessionState } from "./memory";

/* ---------------- the model ------------------------------------- */

export type Attribution = "asserted" | "known" | "inferred";

export type EntityKind = "person" | "thing" | "place" | "time" | "unknown";

export interface SituationEntity {
  id: string;
  /** the display label ("your brother", "Sarah", "a big pot of soup") */
  label: string;
  kind: EntityKind;
  /** the CSKG referent, when the surface resolved to one */
  referentId: number | null;
  /** every surface form this entity has been mentioned by */
  surfaces: string[];
  /** this entity is the person talking */
  speaker: boolean;
  /** a relation word when this person is the speaker's relation ("brother") */
  relationToSpeaker: string | null;
  /** the entity this one was stated to possess ("Sarah's book" → the book) */
  possessiveOf: string | null;
  firstTurn: number;
  lastTurn: number;
}

export type ParticipantRole =
  | "actor" | "object" | "recipient" | "instrument" | "place" | "time";

export interface Participant {
  entityId: string;
  role: ParticipantRole;
  /** the FrameNet element naming this role, when a frame matched */
  frameRole: string | null;
  /** for a container phrase ("a big pot of soup"): the container or its content */
  part?: "container" | "content";
}

export type EventTense = "past" | "present" | "future" | "unknown";

export interface SituationEvent {
  id: string;
  /** the verb as stated ("making", "moved") */
  verb: string;
  /** its base form ("make", "move") */
  verbLemma: string;
  /** the happening as a phrase ("making a big pot of soup") */
  action: string;
  /** the object phrase as stated ("his new girlfriend"), or null */
  objectText: string | null;
  participants: Participant[];
  /** the time expression as stated ("Saturday"), or null */
  timeText: string | null;
  tense: EventTense;
  /**
   * Loop 2 (L2-K): the event's MODE — an intention is not an
   * occurrence. A doing stated under "thinking of" / "plan to"
   * is "intended", with the marker as spoken in intentMarker;
   * everything else is "ongoing" (present, past and simple
   * future statements of fact). Rendering must preserve the
   * mode: "You're thinking of buying…" never "You are buying…".
   */
  mode: "ongoing" | "intended";
  /** the intention marker as spoken ("thinking of", "plan to"), when intended */
  intentMarker: string | null;
  turn: number;
  /** the FrameNet frame that named the roles, when one matched */
  frameName: string | null;
  /** the ATOMIC event term the happening keyed to, when it did */
  atomicText: string | null;
}

export interface SituationState {
  id: string;
  entityId: string;
  /** the state as stated ("tired", "flooded", "brown") */
  text: string;
  kind: "feeling" | "doing" | "circumstance" | "property";
  attribution: Attribution;
  turn: number;
  /** the state (or state-change event) that replaced this one */
  supersededBy: string | null;
}

export type RelationFamily =
  | "causal" | "social" | "temporal" | "state-change" | "identity";

export interface SituationRelation {
  id: string;
  family: RelationFamily;
  /** the relation's name ("causes", "isRelativeOf", "before", "supersedes", "sameAs", …) */
  kind: string;
  /** a model node id: an entity, event or state */
  from: string;
  to: string;
  attribution: Attribution;
  standing: Standing;
  /** how the relation was established, in trace words */
  note: string;
  turn: number;
}

export interface SituationModel {
  entities: SituationEntity[];
  events: SituationEvent[];
  states: SituationState[];
  relations: SituationRelation[];
  nextId: number;
}

export function createSituationModel(): SituationModel {
  return { entities: [], events: [], states: [], relations: [], nextId: 1 };
}

/** The workspace snapshot: the model as a turn leaves it, in counts. */
export interface SituationSnapshot {
  entities: number;
  events: number;
  states: number;
  relations: number;
  /** event ids this turn added */
  turnEvents: string[];
  /** the model's most recent event, if any */
  latestEvent: string | null;
}

/* ---------------- small surface vocabularies -------------------- */

const DAY_WORDS = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "tomorrow", "today", "tonight", "yesterday",
]);
const RELATION_WORDS = new Set([
  "brother", "sister", "mother", "father", "friend", "girlfriend",
  "boyfriend", "partner", "wife", "husband", "daughter", "son",
  "boss", "roommate", "colleague", "neighbour", "neighbor",
]);
const MALE_RELATIONS = new Set(["brother", "father", "boyfriend", "husband", "son"]);
const FEMALE_RELATIONS = new Set(["sister", "mother", "girlfriend", "wife", "daughter"]);

/** Base forms of the verbs event extraction recognises, with
 *  their give-class (a recipient may follow the object). */
const ACTION_VERBS = new Set([
  "make", "cook", "bake", "boil", "bring", "sell", "buy", "move",
  "give", "take", "go", "come", "write", "read", "fix", "build",
  "plant", "flood", "rain", "snow", "call", "meet", "visit",
  "chop", "open", "eat", "drink", "invite", "catch", "lose",
  "find", "clean", "wash", "paint", "play", "watch", "leave",
  "arrive", "start", "finish", "send", "show", "tell", "ask",
  "help", "drive", "walk", "run", "swim", "study", "work",
  "sleep", "wake", "fall", "break", "dry", "fill", "empty",
  "light", "set", "teach", "lend",
]);
const GIVE_VERBS = new Set(["give", "bring", "send", "show", "tell", "lend"]);

/**
 * Clause connectives and contractions: words that can sit in
 * a scan event's actor slot only as mention artefacts ("because
 * I can't swim" keys a junk event whose actor is the word
 * "because"). They are never referents, so an event attributed
 * to one was never stated and is discarded at extraction.
 */
const CONNECTIVE_WORDS = new Set([
  "because", "although", "though", "while", "when", "since",
  "until", "unless", "if", "as", "so", "but", "and", "or",
  "can't", "cant", "don't", "dont", "won't", "wont", "isn't",
  "didn't", "aren't", "wasn't", "weren't", "couldn't", "shouldn't",
]);

/** Modal auxiliaries: scaffolding around a happening, never its actor. */
const MODAL_AUX = new Set([
  "will", "would", "shall", "should", "can", "could", "may", "might", "must",
]);

/** Cognition verbs introducing the speaker's take, never an actor. */
const COGNITION_VERBS = new Set([
  "think", "believe", "feel", "suppose", "guess",
]);

/** Words in the actor slot that name no referent of their own. */
const ACTOR_FILLER = new Set([
  "i", "me", "my", "mine", "we", "us", "our", "ours",
  "you", "your", "yours", "he", "him", "his", "she", "her",
  "hers", "it", "its", "they", "them", "their", "theirs",
  "then", "that", "this", "there",
  "the", "a", "an", "ll", "m", "re", "ve", "d", "s", "t",
]);

/**
 * A scan-matched "actor" that is vocabulary, not a referent —
 * every word modal, cognition, filler or pronoun ("should",
 * "i think"). Such labels must never lead a reply: the scan
 * keeps looking outward for the stated actor, and the L2-D
 * gate refuses them as leads.
 */
export function isJunkActorLabel(label: string): boolean {
  const words = label
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(Boolean)
    .map((w) => w.replace(/^'+|'+$/g, ""));
  if (!words.length) return true;
  return words.every((w) =>
    MODAL_AUX.has(w) || COGNITION_VERBS.has(w) || ACTOR_FILLER.has(w));
}

/** Single words the actor scan walks past without stopping. */
const NON_ACTOR_WORDS = new Set([...MODAL_AUX, ...COGNITION_VERBS]);

/** Irregular pasts the regular form machinery cannot derive. */
const IRREGULAR_PASTS: Record<string, string> = {
  brought: "bring", gave: "give", took: "take", made: "make",
  went: "go", came: "come", bought: "buy", sold: "sell",
  told: "tell", sent: "send", found: "find", lost: "lose",
  left: "leave", caught: "catch", ate: "eat", drank: "drink",
  wrote: "write", fell: "fall", broke: "break", woke: "wake",
  swam: "swim", ran: "run", drove: "drive", slept: "sleep",
  met: "meet", lit: "light", set: "set", taught: "teach",
  lent: "lend",
};

/** surface form → base form, over the action vocabulary */
const FORM_TO_BASE = new Map<string, string>();
for (const base of ACTION_VERBS) {
  for (const f of formSet(base)) FORM_TO_BASE.set(f, base);
  // the e-drop past formSet does not generate ("moved", "baked")
  if (base.endsWith("e")) FORM_TO_BASE.set(base + "d", base);
  // consonant-doubled forms ("stopped", "chopped")
  if (/[^aeiou][aeiou][^aeiou]$/.test(base) && !/[wxy]$/.test(base)) {
    const doubled = base + base[base.length - 1];
    FORM_TO_BASE.set(doubled + "ed", base);
    FORM_TO_BASE.set(doubled + "ing", base);
  }
}
for (const [past, base] of Object.entries(IRREGULAR_PASTS)) {
  FORM_TO_BASE.set(past, base);
  ACTION_VERBS.add(base);
}

function verbBase(word: string): string | null {
  return FORM_TO_BASE.get(word) ?? null;
}

/**
 * Per-turn verb derivation (Item 2, G6 open half): the hand list
 * first, else the graph's own FormOf testimony for this turn's
 * word (g.lemmaOf). FormOf carries junk mappings (i→y,
 * the→lack of supplies, bananas→banana), so a derived verb must
 * look like a verb form (past/participle/gerund ending) and
 * resolve to a single verb-shaped base; closed-class words never
 * qualify. Third-person-singular out-of-list forms (flies) and
 * irregular out-of-list pasts (spent) remain limits, as do
 * -ing nouns with a real lemma (evening→even).
 */
/**
 * The graph-derived half of per-turn verb proof (no hand list):
 * an inflected surface whose FormOf lemma maps back, closed
 * classes and junk rows excluded (off→ov, the→lack of supplies).
 * A bare base ("paint") is genuinely ambiguous — noun or verb —
 * so it never qualifies here; inflected forms ("peeling") do.
 */
export function verbLemmaPerTurn(g: CskgGraph, word: string): string | null {
  if (PRONOUNS.has(word) || CONNECTIVE_WORDS.has(word)) return null;
  if (word === "i" || word === "we" || word === "you") return null;
  if (!/(ed|en|ing)$/.test(word)) return null;
  const lemma = g.lemmaOf(word);
  if (!lemma || !/^[a-z]{2,}$/.test(lemma)) return null;
  return lemma;
}

export function verbBasePerTurn(g: CskgGraph, word: string): string | null {
  const listed = verbBase(word);
  if (listed) return listed;
  return verbLemmaPerTurn(g, word);
}

/** Is this referent filed under food, within two IsA steps? */
function isFoodish(g: CskgGraph, id: number): boolean {
  const seen = new Set<number>([id]);
  let frontier = [id];
  for (let depth = 0; depth < 2; depth++) {
    const next: number[] = [];
    for (const f of frontier) {
      for (const e of g.outEdges(f, "/r/IsA")) {
        if (/food|dish|soup|meal/.test(g.terms[e.to])) return true;
        if (!seen.has(e.to)) { seen.add(e.to); next.push(e.to); }
      }
    }
    frontier = next;
  }
  return false;
}

const PRONOUNS = new Set([
  "he", "him", "his", "she", "her", "hers", "it", "its",
  "they", "them", "their", "then", "that", "this",
]);

/* ---------------- model primitives ------------------------------ */

function nid(model: SituationModel, prefix: string): string {
  return `${prefix}${model.nextId++}`;
}

/**
 * Find-or-create the entity for a referent/surface. Identity is
 * the model's first discipline: one entity per referent — a
 * repeat mention by referent id, by name, or (for the speaker)
 * by role lands on the SAME entity, its surfaces accumulate.
 */
export function ensureEntity(
  model: SituationModel,
  spec: {
    label: string;
    kind: EntityKind;
    referentId?: number | null;
    speaker?: boolean;
    relationToSpeaker?: string | null;
    surface?: string;
  },
  turn: number,
): SituationEntity {
  const norm = spec.label.trim().toLowerCase();
  let found: SituationEntity | undefined;
  if (spec.speaker) {
    found = model.entities.find((e) => e.speaker);
  } else if (spec.referentId !== null && spec.referentId !== undefined) {
    found = model.entities.find((e) => e.referentId === spec.referentId);
  }
  if (!found) found = model.entities.find((e) => e.label.toLowerCase() === norm);
  if (found) {
    const surface = spec.surface ?? spec.label;
    if (!found.surfaces.includes(surface)) found.surfaces.push(surface);
    if (found.referentId === null && spec.referentId != null) found.referentId = spec.referentId;
    if (spec.relationToSpeaker && !found.relationToSpeaker) {
      found.relationToSpeaker = spec.relationToSpeaker;
    }
    found.lastTurn = turn;
    return found;
  }
  const entity: SituationEntity = {
    id: nid(model, "ent"),
    label: spec.label,
    kind: spec.kind,
    referentId: spec.referentId ?? null,
    surfaces: [spec.surface ?? spec.label],
    speaker: spec.speaker ?? false,
    relationToSpeaker: spec.relationToSpeaker ?? null,
    possessiveOf: null,
    firstTurn: turn,
    lastTurn: turn,
  };
  model.entities.push(entity);
  return entity;
}

export function entityById(model: SituationModel, id: string): SituationEntity | null {
  return model.entities.find((e) => e.id === id) ?? null;
}

export function eventById(model: SituationModel, id: string): SituationEvent | null {
  return model.events.find((e) => e.id === id) ?? null;
}

export function stateById(model: SituationModel, id: string): SituationState | null {
  return model.states.find((s) => s.id === id) ?? null;
}

/** The display label of any model node (entity, event or state). */
export function nodeLabel(model: SituationModel, id: string): string {
  const ent = entityById(model, id);
  if (ent) return ent.label;
  const ev = eventById(model, id);
  if (ev) return ev.action;
  const st = stateById(model, id);
  if (st) {
    const owner = entityById(model, st.entityId);
    return `${owner ? owner.label : "it"} is ${st.text}`;
  }
  return id;
}

function addRelation(
  model: SituationModel,
  spec: {
    family: RelationFamily;
    kind: string;
    from: string;
    to: string;
    attribution: Attribution;
    note: string;
    certainty?: number;
    clarity?: number;
  },
  turn: number,
): SituationRelation {
  const existing = model.relations.find(
    (r) => r.family === spec.family && r.kind === spec.kind &&
      r.from === spec.from && r.to === spec.to,
  );
  if (existing) return existing;
  const rel: SituationRelation = {
    id: nid(model, "rel"),
    family: spec.family,
    kind: spec.kind,
    from: spec.from,
    to: spec.to,
    attribution: spec.attribution,
    standing: {
      certainty: spec.certainty ??
        (spec.attribution === "asserted" ? certaintyFromAttribution("self")
          : spec.attribution === "known" ? 0.85 : 0.45),
      clarity: spec.clarity ?? 0.85,
      knownnessFelt: knownnessFromRecency(0),
    },
    note: spec.note,
    turn,
  };
  model.relations.push(rel);
  return rel;
}

function addState(
  model: SituationModel,
  spec: {
    entityId: string;
    text: string;
    kind: SituationState["kind"];
    attribution: Attribution;
  },
  turn: number,
): SituationState {
  const existing = model.states.find(
    (s) => s.entityId === spec.entityId && s.text === spec.text && !s.supersededBy,
  );
  if (existing) return existing;
  const state: SituationState = {
    id: nid(model, "st"),
    entityId: spec.entityId,
    text: spec.text,
    kind: spec.kind,
    attribution: spec.attribution,
    turn,
    supersededBy: null,
  };
  model.states.push(state);
  return state;
}

/* ---------------- reference resolution (identity) --------------- */

export interface ReferenceResolution {
  /** the referring surface ("he", "it", "then", "Sarah") */
  surface: string;
  entityId: string | null;
  eventId: string | null;
  /** how it resolved, in trace words */
  via: string;
}

/**
 * Resolve one pronoun against the model. The full form of G4:
 * kind and (for people) gendered-relation compatibility first,
 * recency inside the compatible set — the most recent compatible
 * referent the conversation has, which is what a pronoun in
 * ordinary talk points at.
 */
export function resolvePronoun(
  model: SituationModel,
  pronoun: string,
  turn: number,
): ReferenceResolution {
  const p = pronoun.toLowerCase();
  const byRecency = (list: SituationEntity[]): SituationEntity | null =>
    list.length
      ? [...list].sort((a, b) => b.lastTurn - a.lastTurn || b.firstTurn - a.firstTurn)[0]
      : null;
  if (p === "then") {
    const ev = model.events[model.events.length - 1];
    return {
      surface: p, entityId: null, eventId: ev ? ev.id : null,
      via: ev ? `"then" → the latest event (${ev.action})` : `"then" → no event yet`,
    };
  }
  if (p === "it" || p === "its" || p === "that" || p === "this") {
    const ev = model.events[model.events.length - 1];
    const obj = ev
      ? [...ev.participants].reverse().find((x) => x.role === "object")
      : undefined;
    const objEnt = obj ? entityById(model, obj.entityId) : null;
    if (objEnt) {
      return {
        surface: p, entityId: objEnt.id, eventId: null,
        via: `"${p}" → ${objEnt.label} (the latest event's object)`,
      };
    }
    const thing = byRecency(model.entities.filter((e) => e.kind === "thing"));
    return {
      surface: p, entityId: thing ? thing.id : null, eventId: null,
      via: thing ? `"${p}" → ${thing.label} (the most recent thing)` : `"${p}" → nothing yet`,
    };
  }
  if (p === "he" || p === "him" || p === "his") {
    const males = model.entities.filter(
      (e) => e.kind === "person" && !e.speaker &&
        (e.relationToSpeaker ? MALE_RELATIONS.has(e.relationToSpeaker) : false),
    );
    const anyPerson = model.entities.filter((e) => e.kind === "person" && !e.speaker);
    const hit = byRecency(males) ?? byRecency(anyPerson);
    return {
      surface: p, entityId: hit ? hit.id : null, eventId: null,
      via: hit ? `"${p}" → ${hit.label} (the most recent male-compatible person)` : `"${p}" → no person yet`,
    };
  }
  if (p === "she" || p === "her" || p === "hers") {
    const females = model.entities.filter(
      (e) => e.kind === "person" && !e.speaker &&
        (e.relationToSpeaker ? FEMALE_RELATIONS.has(e.relationToSpeaker) : false),
    );
    const anyPerson = model.entities.filter((e) => e.kind === "person" && !e.speaker);
    const hit = byRecency(females) ?? byRecency(anyPerson);
    return {
      surface: p, entityId: hit ? hit.id : null, eventId: null,
      via: hit ? `"${p}" → ${hit.label} (the most recent female-compatible person)` : `"${p}" → no person yet`,
    };
  }
  if (p === "they" || p === "them" || p === "their") {
    const person = byRecency(model.entities.filter((e) => e.kind === "person" && !e.speaker));
    return {
      surface: p, entityId: person ? person.id : null, eventId: null,
      via: person ? `"${p}" → ${person.label} (the most recent other person)` : `"${p}" → no other person yet`,
    };
  }
  return { surface: p, entityId: null, eventId: null, via: `"${p}" → not a tracked pronoun` };
}

/* ---------------- FrameNet consultation ------------------------- */

/**
 * Consult the FrameNet side store for an event's verb: the
 * frame's element names for the roles E5 already found. Absent
 * bundle or no matching frame → nulls, and the trace (in the
 * caller) says the roles stayed generic. A frame may NAME a
 * role; it never adds a participant.
 */
export function consultFrame(
  verbLemma: string,
  objectIsFood: boolean,
): { frame: FrameInfo | null; status: string } {
  const store = getFramesStore();
  if (!store) return { frame: null, status: "no FrameNet bundle — generic roles" };
  const frames = framesForVerb(store, verbLemma, objectIsFood ? "food" : "thing");
  if (!frames || !frames.length) {
    return { frame: null, status: `FrameNet ${store.status}: no frame evoked by "${verbLemma}" — generic roles` };
  }
  return { frame: frames[0], status: `FrameNet ${store.status}: ${frames[0].name}` };
}

/* ---------------- E5b: CausalityRelation ------------------------ */

/**
 * The graph's causal testimony between two referent sets: a
 * direct Causes edge in either direction of reading
 * (cause → effect). This is solve's why-machinery's raw
 * material, lifted to a check the relation family can stamp:
 * a situation causal link the graph also attests is *known*;
 * one it does not stays as the person's assertion or the
 * engine's inference, and says so.
 */
export function causalTestimony(
  g: CskgGraph,
  causeIds: number[],
  effectIds: number[],
): { edge: string; rel: string } | null {
  for (const c of causeIds) {
    if (c < 0) continue;
    for (const e of g.outEdges(c)) {
      if (e.rel !== "/r/Causes" && e.rel !== "/r/HasPrerequisite") continue;
      if (effectIds.includes(e.to)) {
        return { edge: `${g.terms[c]} —${e.rel.replace("/r/", "")}→ ${g.terms[e.to]}`, rel: e.rel };
      }
    }
  }
  return null;
}

interface CausalCheck {
  checked: boolean;
  evidence: string | null;
}

/** Check a candidate causal link against the graph's testimony. */
function checkCausal(
  g: CskgGraph,
  model: SituationModel,
  causeNodeId: string,
  effectNodeId: string,
): CausalCheck {
  const idsOf = (nodeId: string): number[] => {
    const ent = entityById(model, nodeId);
    if (ent) return ent.referentId !== null ? [ent.referentId] : [];
    const ev = eventById(model, nodeId);
    if (ev) {
      const ids: number[] = [];
      for (const p of ev.participants) {
        const pe = entityById(model, p.entityId);
        if (pe && pe.referentId !== null) ids.push(pe.referentId);
      }
      const lemmaId = g.id(ev.verbLemma);
      if (lemmaId !== undefined) ids.push(lemmaId);
      const gerundId = g.id(`${ev.verbLemma}ing`.replace("eing", "ing"));
      if (gerundId !== undefined) ids.push(gerundId);
      return ids;
    }
    const st = stateById(model, nodeId);
    if (st) {
      const owner = entityById(model, st.entityId);
      const ids: number[] = [];
      if (owner && owner.referentId !== null) ids.push(owner.referentId);
      const stateId = g.id(st.text);
      if (stateId !== undefined) ids.push(stateId);
      return ids;
    }
    return [];
  };
  const testimony = causalTestimony(g, idsOf(causeNodeId), idsOf(effectNodeId));
  if (!testimony) {
    // also try the reverse reading: an effect stated as a state
    // of the cause's object ("rain flooded the garden")
    const back = causalTestimony(g, idsOf(effectNodeId), idsOf(causeNodeId));
    if (back) return { checked: true, evidence: back.edge };
    return { checked: false, evidence: null };
  }
  return { checked: true, evidence: testimony.edge };
}

/**
 * Record a causal link between two model nodes, checked against
 * the graph. The stamp is honest by construction: graph-checked
 * → known; stated by the person (an explicit "because", "so",
 * "because of") → asserted; juxtaposition the engine read as
 * causation → inferred.
 */
export function linkCausal(
  ws: TurnWorkspace,
  g: CskgGraph,
  model: SituationModel,
  causeNodeId: string,
  effectNodeId: string,
  base: Attribution,
  how: string,
): SituationRelation {
  const check = checkCausal(g, model, causeNodeId, effectNodeId);
  const attribution: Attribution = check.checked ? "known" : base;
  const rel = addRelation(model, {
    family: "causal",
    kind: "causes",
    from: causeNodeId,
    to: effectNodeId,
    attribution,
    note: check.checked
      ? `${how}; CSKG testifies: ${check.evidence}`
      : `${how}; CSKG offers no Causes testimony for this pair — unchecked`,
    certainty: check.checked ? 0.85 : base === "asserted" ? 0.8 : 0.45,
  }, ws.trace.turn);
  noteStep(ws, "situationModel", "situate-model",
    `causal: ${nodeLabel(model, causeNodeId)} —causes→ ${nodeLabel(model, effectNodeId)} ` +
    `[${attribution}${check.checked ? `, checked: ${check.evidence}` : ", unchecked"}] (${standingTrace(rel.standing)})`);
  return rel;
}

/* ---------------- E5b: social relations ------------------------- */

/**
 * Social relations between the model's people, from the surface:
 * possessive relation statements ("my brother", "[Name] is my
 * sister"), "knows", "works with", "belongs to", and possessive
 * ownership ("Sarah's book"). The model's relations are the
 * session's working copy; the PERSON FILE is their long-term
 * home, written only by person.ts's own capture (whose
 * acknowledged write discipline this module never bypasses —
 * a relation the person file also captured is the acknowledged
 * one; the model adds nothing silently to any file).
 */
function socialRelations(
  ws: TurnWorkspace,
  model: SituationModel,
  speaker: SituationEntity,
): void {
  const turn = ws.trace.turn;
  const words = ws.breakdown?.words ?? [];
  const lower = ws.input.toLowerCase();

  // possessive relations: an entity whose surface carried
  // "my <relation>" or who was introduced as one
  for (const e of model.entities) {
    if (e.kind === "person" && e.relationToSpeaker && e.id !== speaker.id) {
      const rel = addRelation(model, {
        family: "social", kind: "isRelativeOf",
        from: e.id, to: speaker.id, attribution: "asserted",
        note: `the person introduced them as "my ${e.relationToSpeaker}"`,
      }, turn);
      if (rel.turn === turn) {
        noteStep(ws, "situationModel", "situate-model",
          `social: ${e.label} —isRelativeOf(${e.relationToSpeaker})→ you [asserted]`);
      }
    }
  }

  // "sarah is my sister" / "my sister is sarah"
  const isMy = lower.match(/\b([a-z]+) is my ([a-z]+)\b/);
  if (isMy && RELATION_WORDS.has(isMy[2])) {
    const named = model.entities.find(
      (e) => e.kind === "person" && e.label.toLowerCase() === isMy[1]);
    if (named) {
      named.relationToSpeaker = isMy[2];
      addRelation(model, {
        family: "social", kind: "isRelativeOf",
        from: named.id, to: speaker.id, attribution: "asserted",
        note: `stated outright: "${isMy[1]} is my ${isMy[2]}"`,
      }, turn);
      noteStep(ws, "situationModel", "situate-model",
        `social: ${named.label} —isRelativeOf(${isMy[2]})→ you [asserted]`);
    }
  }

  // verb patterns between people mentions: knows / works with
  const patterns: [RegExp, string][] = [
    [/\bknows?\b/, "knows"],
    [/\bworks? with\b/, "worksWith"],
    [/\bbelongs to\b/, "belongsTo"],
  ];
  for (const [, kind] of patterns) {
    const joined = " " + words.join(" ") + " ";
    const hit = joined.match(new RegExp(` ([a-z]+) ${kind === "knows" ? "knows" : kind === "worksWith" ? "works with" : "belongs to"} ([a-z]+) `));
    if (!hit) continue;
    const a = model.entities.find((e) => e.surfaces.some((s) => s.toLowerCase() === hit[1]) || e.label.toLowerCase() === hit[1]);
    const b = model.entities.find((e) => e.surfaces.some((s) => s.toLowerCase() === hit[2]) || e.label.toLowerCase() === hit[2]);
    if (a && b && a.id !== b.id) {
      addRelation(model, {
        family: "social", kind, from: a.id, to: b.id, attribution: "asserted",
        note: `stated: "${hit[0].trim()}"`,
      }, turn);
      noteStep(ws, "situationModel", "situate-model",
        `social: ${a.label} —${kind}→ ${b.label} [asserted]`);
    }
  }

  // possessive ownership: "sarah's book"
  for (const e of model.entities) {
    if (e.possessiveOf) {
      const owned = model.entities.find((x) => x.id === e.possessiveOf);
      if (owned) {
        addRelation(model, {
          family: "social", kind: "belongsTo", from: owned.id, to: e.id,
          attribution: "asserted", note: `possessive surface: "${e.label}'s ${owned.label}"`,
        }, turn);
      }
    }
  }
}

/* ---------------- E5b: temporal relations ----------------------- */

/**
 * Temporal relations between events: the telling order is the
 * weak form (an INFERENCE from narration order, marked as one);
 * an explicit marker ("then", "after that", "first") makes the
 * sequence the person's own assertion. Planned vs past rides on
 * each event's tense (surface + time expressions).
 */
function temporalRelations(
  ws: TurnWorkspace,
  model: SituationModel,
  previousLatest: SituationEvent | null,
  newEvents: SituationEvent[],
): void {
  const turn = ws.trace.turn;
  const lower = ws.input.toLowerCase();
  const explicit = /\b(then|after that|afterwards|later|next|first|before that|earlier)\b/.test(lower);
  const chain = [...(previousLatest ? [previousLatest] : []), ...newEvents];
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1];
    const b = chain[i];
    const rel = addRelation(model, {
      family: "temporal", kind: "before",
      from: a.id, to: b.id,
      attribution: explicit ? "asserted" : "inferred",
      note: explicit
        ? `the person sequenced them ("${(lower.match(/\b(then|after that|afterwards|later|next|first|before that|earlier)\b/) ?? [""])[0]}")`
        : "telling order — the earlier-told event is read as earlier; an inference from narration, not a stated sequence",
      certainty: explicit ? 0.8 : 0.5,
    }, turn);
    if (rel.turn === turn) {
      noteStep(ws, "situationModel", "situate-model",
        `temporal: ${a.action} —before→ ${b.action} [${rel.attribution}]`);
    }
  }
}

/* ---------------- E5b: state tracking --------------------------- */

/**
 * Supersede a prior live state with a new one: the change is
 * itself recorded as a small state-change EVENT linked to the
 * state it supersedes (design §8 E5a: "a changed state is a
 * small event"), and as a state-change relation stamped
 * asserted — the person stated both states.
 */
function supersedeState(
  ws: TurnWorkspace,
  model: SituationModel,
  prior: SituationState,
  next: SituationState,
): void {
  const turn = ws.trace.turn;
  const owner = entityById(model, prior.entityId);
  const change: SituationEvent = {
    id: nid(model, "ev"),
    verb: "become",
    verbLemma: "become",
    action: `${owner ? owner.label : "it"} is no longer ${prior.text} — now ${next.text}`,
    objectText: null,
    participants: [{ entityId: prior.entityId, role: "object", frameRole: null }],
    timeText: null,
    tense: "present",
    mode: "ongoing",
    intentMarker: null,
    turn,
    frameName: null,
    atomicText: null,
  };
  model.events.push(change);
  prior.supersededBy = change.id;
  addRelation(model, {
    family: "state-change", kind: "supersedes",
    from: next.id, to: prior.id, attribution: "asserted",
    note: `the person stated "${prior.text}" (turn ${prior.turn}) and now "${next.text}"`,
  }, turn);
  noteStep(ws, "situationModel", "situate-model",
    `state change: ${owner ? owner.label : "it"} was ${prior.text}, now ${next.text} [asserted] — recorded as event ${change.id}`);
}

/* ---------------- event extraction (E5a) ------------------------ */

interface BuiltEvent {
  event: SituationEvent;
  actorEntity: SituationEntity | null;
}

/** Split one contents/discourse statement into clause strings. */
function clausesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|,\s+(?=(?:then|so|but)\b)|\s+and then\s+|\s+then\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Find a contents entity whose mention text appears in a phrase. */
function entityInPhrase(
  model: SituationModel,
  phrase: string,
): SituationEntity | null {
  const p = " " + phrase.toLowerCase().replace(/[^a-z ]/g, " ") + " ";
  let best: SituationEntity | null = null;
  let bestPos = Number.POSITIVE_INFINITY;
  let bestLen = 0;
  for (const e of model.entities) {
    const surfaces = [...e.surfaces, e.label];
    for (const s of surfaces) {
      const t = s.toLowerCase().replace(/^(your|my|the|a|an)\s+/, "").trim();
      if (t.length < 3) continue;
      const pos = p.indexOf(` ${t} `);
      if (pos < 0) continue;
      // Loop 2 (L2-G3): a phrase names its entity by its HEAD,
      // which comes first — "the street outside" is about the
      // street, not the outside. Longest-surface matching let
      // a longer modifier ("outside", 7) steal the state from
      // the head noun ("street", 5). Earliest position wins;
      // length breaks ties.
      if (pos < bestPos || (pos === bestPos && t.length > bestLen)) {
        best = e;
        bestPos = pos;
        bestLen = t.length;
      }
    }
  }
  return best;
}

const DAYPARTS = new Set(["morning", "afternoon", "evening", "night"]);
const MONTHS = new Set([
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
]);

/** The time expression inside a phrase, if any (day words,
 *  dayparts, and the contents layer's times — but ONLY when
 *  the time entry itself reads as a time: a season or a thing
 *  that happens to carry the time kind ("winter" in "a winter
 *  coat") is not when an event happens). */
function timeInPhrase(ws: TurnWorkspace, phrase: string): string | null {
  const words = phrase.toLowerCase().split(/[^a-z'-]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    if (DAY_WORDS.has(words[i])) {
      const prev = words[i - 1];
      const named = words[i][0].toUpperCase() + words[i].slice(1);
      return (prev === "on" || prev === "this" || prev === "next")
        ? `${prev} ${named}` : named;
    }
    if (DAYPARTS.has(words[i])) {
      const prev = words[i - 1];
      return (prev === "in" || prev === "this") ? `${prev} ${words[i]}` : words[i];
    }
    if (words[i] === "next" && words[i + 1] === "week") return "next week";
    if (words[i] === "this" && words[i + 1] === "weekend") return "this weekend";
  }
  const times = ws.breakdown?.contents?.times ?? [];
  for (const t of times) {
    const text = t.text.toLowerCase();
    const head = text.split(/\s+/)[0];
    const readsAsTime = DAY_WORDS.has(head) || DAYPARTS.has(head) ||
      MONTHS.has(head) || /\d/.test(text);
    if (readsAsTime && phrase.toLowerCase().includes(text)) return t.text;
  }
  return null;
}

function tenseOf(
  ws: TurnWorkspace,
  verbSurface: string,
  timeText: string | null,
  planned: boolean,
): EventTense {
  if (planned) return "future";
  if (timeText) {
    const t = timeText.toLowerCase();
    if (t.includes("yesterday")) return "past";
    if (t.includes("tomorrow")) return "future";
    const dayMatch = t.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (dayMatch && ws.situation) {
      const order = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = ws.situation.now.getDay();
      const target = order.indexOf(dayMatch[1]);
      if (target > today) return "future";
      if (target < today) return "past";
    }
  }
  if (/(ed|en)$/.test(verbSurface) && !/(ing)$/.test(verbSurface)) return "past";
  if (/ing$/.test(verbSurface)) return "present";
  return "unknown";
}


/**
 * Build one event from a verb-centred phrase: "making a big pot
 * of soup on saturday" / "moved the picnic indoors because of
 * the rain". Participants come ONLY from the phrase plus the
 * model's entities: the actor from the stated subject (or the
 * capture's doing-subject), the object from the noun phrase
 * after the verb, a recipient after "to" or in give-class
 * double-object position, an instrument after "with", a place
 * after "in/at" or as a trailing place word, the time from the
 * phrase's own time expression. Nothing is invented: a role the
 * surface does not support is simply absent.
 */
function buildEvent(
  ws: TurnWorkspace,
  g: CskgGraph,
  model: SituationModel,
  spec: {
    verbSurface: string;
    phrase: string;
    actor: SituationEntity | null;
    planned?: boolean;
    /** the intention marker as spoken, when planned (L2-K) */
    intentMarker?: string | null;
    clause: string;
  },
  speaker: SituationEntity,
): BuiltEvent | null {
  const turn = ws.trace.turn;
  const lemma = verbBase(spec.verbSurface) ?? g.lemmaOf(spec.verbSurface) ?? spec.verbSurface;
  const rest = spec.phrase.slice(spec.verbSurface.length).trim();
  const timeText = timeInPhrase(ws, spec.phrase);
  // the object phrase: the words after the verb, up to a
  // boundary (time, place, causal or recipient preposition)
  const restWords = rest.split(/\s+/).filter(Boolean);
  const boundary = ["on", "at", "because", "so", "before", "after", "tomorrow", "indoors", "online"];
  let objEnd = restWords.length;
  for (let i = 0; i < restWords.length; i++) {
    const w = restWords[i].toLowerCase().replace(/[^a-z]/g, "");
    if (i > 0 && (boundary.includes(w) || DAY_WORDS.has(w))) { objEnd = i; break; }
  }
  // a leading particle belongs to the verb ("set up the tent")
  const PARTICLES = new Set(["up", "out", "off", "down"]);
  let particle = "";
  let objStart = 0;
  if (restWords.length && PARTICLES.has(restWords[0].toLowerCase())) {
    particle = restWords[0].toLowerCase();
    objStart = 1;
  }
  let objectPhrase = restWords.slice(objStart, objEnd).join(" ");
  // an object phrase that OPENS with a preposition is no object
  // at all ("work at the city library" — the library is a place
  // the clause locates, not something worked)
  if (/^(at|in|on|to|for|with|about|into)\s/i.test(objectPhrase)) objectPhrase = "";

  const participants: Participant[] = [];
  const actor = spec.actor ?? speaker;
  let frame: FrameInfo | null = null;
  let frameStatus = "";
  // give-class double object: "sarah gave tom the book" — a
  // person at the head of the object phrase is the RECIPIENT,
  // and the remainder of the phrase is the object
  let recipientEntity: SituationEntity | null = null;
  if (GIVE_VERBS.has(lemma) && objectPhrase) {
    const head = objectPhrase.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    const headEnt = model.entities.find(
      (e) => e.kind === "person" && !e.speaker &&
        (e.label.toLowerCase() === head || e.surfaces.some((s) => s.toLowerCase() === head)));
    if (headEnt) {
      recipientEntity = headEnt;
      objectPhrase = objectPhrase.split(/\s+/).slice(1).join(" ");
    }
  }
  // the stated time is a circumstance of the event, recorded
  // separately as timeText (a time participant, below) — it is
  // not part of the action span. A time phrase the boundary
  // scan could not stop (bare "this weekend", with no
  // governing preposition for the scan to break on) otherwise
  // rides inside the object phrase, and every renderer that
  // appends the recorded time then says it twice ("lending
  // her ladder this weekend, this weekend" — Loop 2, L2-P).
  if (timeText && objectPhrase) {
    const t = timeText.toLowerCase();
    if (objectPhrase.toLowerCase().endsWith(t)) {
      objectPhrase = objectPhrase
        .slice(0, objectPhrase.length - timeText.length)
        .replace(/\s+(on|at|in|for|by)$/i, "")
        .trim();
    }
  }
  // a container phrase: "a big pot of soup" — the container and
  // its content are both participants in the event
  const ofMatch = objectPhrase ? objectPhrase.match(/^(.+?)\s+of\s+(.+)$/i) : null;
  const stripArticle = (s: string): string => s.replace(/^(a|an|the)\s+/i, "");
  const objectEntity = !objectPhrase
    ? null
    : ofMatch
      ? ensureEntity(model, {
          label: stripArticle(ofMatch[1]), kind: "thing",
          referentId: g.id(stripArticle(ofMatch[1])), surface: ofMatch[1],
        }, turn)
      : entityInPhrase(model, objectPhrase) ??
        ensureEntity(model, {
          label: stripArticle(objectPhrase), kind: "thing",
          referentId: g.id(stripArticle(objectPhrase)), surface: objectPhrase,
        }, turn);
  const contentEntity = ofMatch
    ? ensureEntity(model, {
        label: stripArticle(ofMatch[2]), kind: "thing",
        referentId: g.id(stripArticle(ofMatch[2])), surface: ofMatch[2],
      }, turn)
    : null;

  // FrameNet names the roles where a frame matches the verb.
  // Food-ness is judged over the whole object phrase and BOTH
  // the container and its content ("a big pot of soup" is a
  // food event by its content, not by its pot)
  const objIsFood =
    /\b(soup|food|meal|dinner|bread|cake)\b/.test(objectPhrase) ||
    (objectEntity !== null && objectEntity.referentId !== null &&
      isFoodish(g, objectEntity.referentId)) ||
    (contentEntity !== null && contentEntity.referentId !== null &&
      isFoodish(g, contentEntity.referentId));
  const consulted = consultFrame(lemma, objIsFood);
  frame = consulted.frame;
  frameStatus = consulted.status;
  const roleName = (generic: ParticipantRole): string | null =>
    frame ? frameRoleName(frame, generic) : null;

  if (actor) {
    participants.push({ entityId: actor.id, role: "actor", frameRole: roleName("actor") });
  }
  if (objectEntity) {
    participants.push({
      entityId: objectEntity.id, role: "object", frameRole: roleName("object"),
      ...(contentEntity ? { part: "container" as const } : {}),
    });
  }
  if (contentEntity) {
    participants.push({
      entityId: contentEntity.id, role: "object", frameRole: roleName("object"), part: "content",
    });
  }
  // recipient: the give-class double object found above, or
  // "… to sarah"
  if (recipientEntity) {
    participants.push({ entityId: recipientEntity.id, role: "recipient", frameRole: roleName("recipient") });
  } else {
    const toMatch = rest.match(/\bto\s+([a-z][a-z ]*?)(?=$|\s+(?:on|at|in|because|tomorrow)\b|[.,;])/i);
    const recipientPhrase = toMatch ? toMatch[1].trim() : null;
    if (recipientPhrase) {
      const rEnt = entityInPhrase(model, recipientPhrase);
      if (rEnt && rEnt.id !== objectEntity?.id) {
        participants.push({ entityId: rEnt.id, role: "recipient", frameRole: roleName("recipient") });
      }
    }
  }
  // instrument: "with a …"
  const withMatch = rest.match(/\bwith\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z ]*?)(?=$|[.,;])/i);
  if (withMatch && !/^(him|her|them|sarah|tom)\b/i.test(withMatch[1])) {
    const iEnt = entityInPhrase(model, withMatch[1]) ??
      ensureEntity(model, {
        label: withMatch[1].replace(/^(a|an|the)\s+/i, ""),
        kind: "thing",
        referentId: g.id(withMatch[1].replace(/^(a|an|the)\s+/i, "")),
        surface: withMatch[1],
      }, turn);
    if (iEnt.id !== objectEntity?.id) {
      participants.push({ entityId: iEnt.id, role: "instrument", frameRole: roleName("instrument") });
    }
  }
  // place: a contents place the clause LOCATES the event at —
  // it must be governed by a place preposition ("in the
  // kitchen"); a place-kind mention merely present in the
  // clause (the rain, in "because of the rain") is not where
  // the event happened
  const places = ws.breakdown?.contents?.places ?? [];
  for (const p of places) {
    const needle = new RegExp(
      `\\b(?:in|at|to|into)\\s+(?:the\\s+|a\\s+|an\\s+)?${p.text.replace(/[^a-z ]/g, "")}\\b`, "i");
    if (needle.test(spec.clause)) {
      const pEnt = model.entities.find((e) => e.surfaces.includes(p.text)) ??
        ensureEntity(model, { label: p.text, kind: "place", referentId: p.referentId, surface: p.text }, turn);
      participants.push({ entityId: pEnt.id, role: "place", frameRole: roleName("place") });
    }
  }
  for (const placeWord of ["indoors", "online"]) {
    if (new RegExp(`\\b${placeWord}\\b`, "i").test(spec.clause)) {
      const pEnt = ensureEntity(model, {
        label: placeWord, kind: "place",
        referentId: g.id(placeWord), surface: placeWord,
      }, turn);
      if (!participants.some((p) => p.entityId === pEnt.id)) {
        participants.push({ entityId: pEnt.id, role: "place", frameRole: roleName("place") });
      }
    }
  }
  if (timeText) {
    const tEnt = ensureEntity(model, { label: timeText, kind: "time", surface: timeText }, turn);
    participants.push({ entityId: tEnt.id, role: "time", frameRole: roleName("time") });
  }

  const actionWords = [spec.verbSurface, particle, objectPhrase].filter(Boolean).join(" ");
  const atomic = matchEvent(g, spec.clause.toLowerCase().split(/[^a-z'-]+/).filter(Boolean), ws.breakdown?.terms ?? []);
  const event: SituationEvent = {
    id: nid(model, "ev"),
    verb: spec.verbSurface,
    verbLemma: lemma,
    action: actionWords,
    objectText: objectPhrase || null,
    participants,
    timeText,
    tense: tenseOf(ws, spec.verbSurface, timeText, spec.planned ?? false),
    mode: spec.planned ? "intended" : "ongoing",
    intentMarker: spec.planned ? (spec.intentMarker ?? null) : null,
    turn,
    frameName: frame ? frame.name : null,
    atomicText: atomic ? atomic.text : null,
  };
  model.events.push(event);
  noteStep(ws, "situationModel", "situate-model",
    `event ${event.id}: "${event.action}" [${event.tense}] — participants: ` +
    (participants.length
      ? participants.map((p) => {
          const e = entityById(model, p.entityId);
          return `${p.role}${p.frameRole ? `/${p.frameRole}` : ""}=${e ? e.label : p.entityId}`;
        }).join(", ")
      : "none stated") +
    (event.atomicText ? `; ATOMIC event term: "${event.atomicText}"` : "") +
    `; ${frameStatus}`);
  return { event, actorEntity: actor };
}

/* ---------------- the analysis entry ---------------------------- */

export interface SituationTurnResult {
  /** events this turn added (not state-change pseudo-events) */
  events: SituationEvent[];
  /** this turn's first-person doing event, for the statement acknowledgement */
  doingEvent: SituationEvent | null;
  resolutions: ReferenceResolution[];
  statesAdded: SituationState[];
}

/**
 * Situation analysis: update the session's model from this
 * turn, and write the workspace snapshot. Runs on every turn
 * that reaches analysis (statements and questions alike —
 * questions resolve their pronouns against the model; only
 * statements assert new events), after discourse and person's
 * capture, before solve consumes.
 */
export function analyseSituationInto(
  ws: TurnWorkspace,
  g: CskgGraph,
  session: SessionState,
  opts: { isStatement: boolean; capture: CaptureResult | null },
): SituationTurnResult {
  const model = session.situation;
  const turn = ws.trace.turn;
  const result: SituationTurnResult = {
    events: [], doingEvent: null, resolutions: [], statesAdded: [],
  };
  const previousLatest = model.events.length ? model.events[model.events.length - 1] : null;
  const speakerName = ws.person && ws.person.kind === "known" ? ws.person.name : null;
  const speaker = ensureEntity(model, {
    label: speakerName ? speakerName.toLowerCase() : "you",
    kind: "person",
    speaker: true,
    surface: speakerName ?? "you",
  }, turn);

  const bd = ws.breakdown;
  const contents = bd?.contents ?? null;
  const lower = ws.input.toLowerCase();
  const original = ws.input;

  /* entities from the turn's contents */
  if (contents) {
    for (const entry of contents.entries) {
      const poss = entry.possessive;
      if (entry.chosen.includes("person")) {
        const bare = entry.text.toLowerCase().replace(/^your /, "").replace(/^my /, "");
        const relWord = RELATION_WORDS.has(bare) ? bare : null;
        const label = poss === "my" && relWord
          ? `your ${relWord}`
          : entry.text;
        const ent = ensureEntity(model, {
          label,
          kind: "person",
          referentId: entry.referentId,
          relationToSpeaker: poss === "my" ? relWord : null,
          surface: entry.text,
        }, turn);
        if (poss && poss !== "my" && poss !== "your") {
          // "his girlfriend", "her friend": the possessor
          // pronoun resolves against the model, and the new
          // person is associated with them
          const r = resolvePronoun(model, poss.toLowerCase(), turn);
          const possessor = r.entityId ? entityById(model, r.entityId) : null;
          if (possessor && possessor.id !== ent.id) {
            addRelation(model, {
              family: "social", kind: "associatedWith",
              from: ent.id, to: possessor.id, attribution: "asserted",
              note: `introduced as "${poss} ${entry.text}"`,
            }, turn);
          }
        }
      } else if (entry.chosen.includes("place")) {
        ensureEntity(model, {
          label: entry.text, kind: "place",
          referentId: entry.referentId, surface: entry.text,
        }, turn);
      } else if (entry.chosen.includes("time")) {
        ensureEntity(model, {
          label: entry.text, kind: "time",
          referentId: entry.referentId, surface: entry.text,
        }, turn);
      } else if (entry.chosen.includes("thing") || entry.chosen.includes("event")) {
        const ent = ensureEntity(model, {
          label: entry.text, kind: "thing",
          referentId: entry.referentId, surface: entry.text,
        }, turn);
        if (poss && poss !== "my" && poss !== "your" && !PRONOUNS.has(poss.toLowerCase())) {
          // "sarah's book": the named possessor owns the thing
          const possessor = ensureEntity(model, {
            label: poss.toLowerCase(), kind: "person", surface: poss,
          }, turn);
          if (possessor.id !== ent.id) possessor.possessiveOf = ent.id;
        }
      }
    }
    // names the contents layer did not type as people: a
    // capitalised word in the original that names a model
    // person ("Sarah gave Tom the book")
    const names = original.match(/\b[A-Z][a-z]+\b/g) ?? [];
    // sentence-initial words are capitalised by position, not by
    // naming — a sentence-initial candidate is accepted as a
    // name only with sentence-internal evidence ("Sarah is …",
    // "Sarah is my sister"); a mid-sentence capital is a name
    // unless it is a common opener word doing other duty
    const tokens = original.trim().split(/\s+/);
    const firstWord = tokens[0]?.replace(/[^A-Za-z]/g, "");
    const secondWord = tokens[1]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    for (const n of names) {
      if (/^(I|The|A|An|My|It|He|She|They|We|What|When|Who|Why|How|But|And|So)$/.test(n)) continue;
      if (n === firstWord && secondWord !== "is" && !/\bis my\b/.test(lower)) continue;
      ensureEntity(model, {
        label: n.toLowerCase(), kind: "person",
        referentId: g.id(n.toLowerCase()), surface: n,
      }, turn);
    }
  }

  /* coreference: the turn's pronouns resolve against the model */
  const words = bd?.words ?? lower.split(/[^a-z'-]+/).filter(Boolean);
  const seenSurfaces = new Set<string>();
  for (const w of words) {
    if (!PRONOUNS.has(w) || seenSurfaces.has(w)) continue;
    seenSurfaces.add(w);
    const r = resolvePronoun(model, w, turn);
    result.resolutions.push(r);
    if (r.entityId || r.eventId) {
      noteStep(ws, "situationModel", "situate-model", `reference: ${r.via}`);
      const target = r.entityId ?? r.eventId!;
      addRelation(model, {
        family: "identity", kind: "sameAs",
        from: `surface:${w}`, to: target, attribution: "inferred",
        note: `pronoun resolution — ${r.via}; the engine's reading of the reference, marked inferred`,
        certainty: 0.6,
      }, turn);
    }
  }

  /* social relations from this turn's surfaces */
  socialRelations(ws, model, speaker);

  /* the person's stated feeling mirrors into the model, as
   * the state it is (the capture keeps the full phrase; the
   * model's state text is its core: intensifiers and time
   * tails stripped) */
  if (opts.capture && opts.capture.feeling) {
    const core = opts.capture.feeling.text.toLowerCase()
      .replace(/^(so|very|really|much|a bit)\s+/, "")
      .replace(/\s+(today|now|tonight)$/, "")
      .trim();
    if (core) {
      const prior = model.states.find(
        (s) => s.entityId === speaker.id && s.kind === "feeling" && !s.supersededBy && s.text !== core,
      );
      const st = addState(model, {
        entityId: speaker.id, text: core, kind: "feeling", attribution: "asserted",
      }, turn);
      result.statesAdded.push(st);
      if (prior && prior.id !== st.id) supersedeState(ws, model, prior, st);
    }
  }
  // entity states stated in the surface: "the garden is flooded",
  // "my bananas have gone all brown"
  if (opts.isStatement) {
    const isState = lower.match(/\b([a-z][a-z ]*?) (?:is|are|was|were) (?:now )?([a-z][a-z ]*?)$/);
    if (isState && contents) {
      const subj = entityInPhrase(model, isState[1]);
      if (subj && !subj.speaker) {
        const st = addState(model, {
          entityId: subj.id, text: isState[2].trim(), kind: "property", attribution: "asserted",
        }, turn);
        result.statesAdded.push(st);
        noteStep(ws, "situationModel", "situate-model",
          `state: ${subj.label} is ${st.text} [asserted]`);
      }
    }
    // a stated duration of a phenomenon: "it's the third day
    // of rain" — the temporal family's duration case (§5 names
    // durations; before Loop 1 they were recorded nowhere the
    // question path could read). The duration is recorded as a
    // circumstance state on the phenomenon's entity, in the
    // person's own words, so "how long has it been raining?"
    // is answered from the record, not from generic weather.
    const duration = lower.match(
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) day of ([a-z]+)\b/);
    if (duration) {
      const phenomenon = model.entities.find(
        (e) => e.label.toLowerCase() === duration[2] ||
          e.surfaces.some((s) => s.toLowerCase() === duration[2])) ??
        entityInPhrase(model, duration[2]);
      if (phenomenon && !phenomenon.speaker) {
        const st = addState(model, {
          entityId: phenomenon.id,
          text: `${duration[1]} day of ${duration[2]}`,
          kind: "circumstance", attribution: "asserted",
        }, turn);
        result.statesAdded.push(st);
        noteStep(ws, "situationModel", "situate-model",
          `duration: ${phenomenon.label} — ${st.text} [asserted]`);
      }
    }
    // Loop 2 (L2-G): the same duration record in its other
    // common surface — an ongoing state of affairs with its
    // span stated: "my knee has been aching for a week". The
    // circumstance state sits on the subject entity, in the
    // person's words ("aching for a week"), so the how-long
    // question is answered from the record exactly as the
    // ordinal-day form is.
    const beenFor = lower.match(
      /\b([a-z][a-z ]*?) (?:has|have) been ([a-z]+) for (a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+) (days?|weeks?|months?|years?|hours?|mornings?|evenings?|nights?)\b/);
    if (beenFor) {
      const subj = entityInPhrase(model, beenFor[1]);
      if (subj && !subj.speaker) {
        const st = addState(model, {
          entityId: subj.id,
          text: `${beenFor[2]} for ${beenFor[3]} ${beenFor[4]}`,
          kind: "circumstance", attribution: "asserted",
        }, turn);
        result.statesAdded.push(st);
        noteStep(ws, "situationModel", "situate-model",
          `duration: ${subj.label} — ${st.text} [asserted]`);
      }
    }
    const goneState = lower.match(/\b([a-z][a-z ]*?) (?:have|has) gone (?:all )?([a-z]+)\b/);
    if (goneState) {
      const subj = entityInPhrase(model, goneState[1]);
      if (subj && !subj.speaker) {
        const prior = model.states.find(
          (s) => s.entityId === subj.id && !s.supersededBy && s.text !== goneState[2]);
        const st = addState(model, {
          entityId: subj.id, text: goneState[2], kind: "property", attribution: "asserted",
        }, turn);
        result.statesAdded.push(st);
        noteStep(ws, "situationModel", "situate-model",
          `state: ${subj.label} has gone ${st.text} [asserted]`);
        if (prior) supersedeState(ws, model, prior, st);
      }
    }
  }

  /* events — statements only (a question asserts no happening) */
  if (opts.isStatement) {
    const cap = opts.capture;
    if (cap && cap.doing) {
      const doingWords = cap.doing.split(/\s+/).filter(Boolean);
      const verbSurface = doingWords[0]?.toLowerCase() ?? "";
      if (verbSurface && (verbBasePerTurn(g, verbSurface) || /ing$/.test(verbSurface))) {
        const built = buildEvent(ws, g, model, {
          verbSurface,
          phrase: cap.doing,
          actor: speaker,
          planned: /\bi plan to\b/.test(lower) || lower.includes("thinking of"),
          intentMarker: /\bi plan to\b/.test(lower)
            ? "plan to"
            : lower.includes("thinking of")
              ? "thinking of"
              : null,
          clause: cap.doing,
        }, speaker);
        if (built) {
          result.events.push(built.event);
          result.doingEvent = built.event;
        }
      }
    }
    // verb scan over the statement's clauses, for the events
    // the capture's doing-patterns do not cover (third person,
    // past tense, weather actors)
    for (const clause of clausesOf(ws.input)) {
      const cw = clause.toLowerCase().split(/[^a-z'-]+/).filter(Boolean);
      // verb candidates: action-verb forms not riding an
      // infinitive or a preposition ("day of rain"). A candidate
      // directly after an article is a noun doing subject duty
      // ("the RAIN flooded the garden") — deprioritised below
      // any later true verb in the same clause.
      const candidates: number[] = [];
      for (let i = 0; i < cw.length; i++) {
        if (!verbBasePerTurn(g, cw[i])) continue;
        if (cw[i - 1] === "to" || cw[i - 1] === "of") continue;
        candidates.push(i);
      }
      const pick = candidates.find((i) => !/^(the|a|an)$/.test(cw[i - 1] ?? "")) ??
        candidates[0];
      if (pick === undefined) continue;
      const i = pick;
      const base = verbBasePerTurn(g, cw[i])!;
      // actor: the nearest preceding entity mention or pronoun.
      // Modals and cognition verbs are scaffolding around the
      // stated happening, never its actor ("I should make
      // coffee", "I think I'll go…"): the scan walks past them
      // to the speaker instead of naming them.
      let actor: SituationEntity | null = null;
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        if (cw[j] === "i" || cw[j] === "we" || cw[j] === "i'm" || cw[j] === "we're") { actor = speaker; break; }
        if (NON_ACTOR_WORDS.has(cw[j])) continue;
        if (PRONOUNS.has(cw[j])) {
          const r = resolvePronoun(model, cw[j], turn);
          actor = r.entityId ? entityById(model, r.entityId) : null;
          if (actor) break;
          continue;
        }
        const cand = entityInPhrase(model, cw.slice(Math.max(0, j - 2), j + 1).join(" "));
        if (cand) {
          // a function-word/modal/cognition label is the scan
          // matching vocabulary, not a referent ("i think",
          // "should"): keep scanning outward for the actor.
          if (isJunkActorLabel(cand.label)) continue;
          actor = cand; break;
        }
      }
      if (!actor && /^\s*(it|it's|there)\b/i.test(clause) &&
          (base === "rain" || base === "snow")) {
        // weather: "it's raining" — the actor is the weather itself
        actor = ensureEntity(model, {
          label: base, kind: "thing",
          referentId: g.id(base), surface: "it",
        }, turn);
      }
      // a subjectless verb gets the speaker as its DEFAULT actor
      // so the event can be recorded — but a defaulted actor is
      // not a STATED doing: "Tell me about the orange" is an
      // imperative addressed to the system, not the person
      // stating what they are doing, and it must not earn the
      // doingEvent promotion the reply acknowledgement keys on
      // (Loop 2, L2-A's trigger).
      const actorStated = actor !== null;
      if (!actor) actor = speaker;
      const phrase = cw.slice(i).join(" ");
      // skip when the capture's doing already built this event
      if (result.events.some((e) => e.verbLemma === base && e.turn === turn)) continue;
      const built = buildEvent(ws, g, model, {
        verbSurface: cw[i], phrase, actor, clause,
      }, speaker);
      if (!built) continue;
      // a connective or contraction in the actor slot is a
      // mention artefact, not a referent ("because I can't
      // swim very well" keys a junk "swim" event whose actor
      // is the word "because"): the happening was never
      // stated — discard it rather than recording nonsense
      if (built.actorEntity && CONNECTIVE_WORDS.has(built.actorEntity.label.toLowerCase())) {
        model.events = model.events.filter((e) => e.id !== built.event.id);
        continue;
      }
      // a speaker-actor scan event with no object is a state of
      // affairs, not a happening ("I work at the library" —
      // employment is the person file's business): discard it
      if (built.actorEntity?.speaker && !built.event.objectText) {
        model.events = model.events.filter((e) => e.id !== built.event.id);
        continue;
      }
      result.events.push(built.event);
      // a first-person happening found by the scan earns the
      // statement acknowledgement too, like a captured doing —
      // but only when the speaker was the STATED actor (see
      // actorStated above): a defaulted actor records the
      // event without promoting it to the person's doing
      if (!result.doingEvent && actorStated && built.actorEntity?.speaker && built.event.objectText) {
        result.doingEvent = built.event;
      }
    }

    /* causal links stated in this turn */
    const becauseOf = lower.match(/\bbecause of (?:the )?([a-z]+)\b/);
    if (becauseOf && result.events.length) {
      const causeEnt = model.entities.find(
        (e) => e.label.toLowerCase() === becauseOf[1] || e.surfaces.some((s) => s.toLowerCase() === becauseOf[1]));
      const priorEvent = causeEnt
        ? [...model.events].reverse().find((e) =>
            e.id !== result.events[0].id &&
            (e.participants.some((p) => p.entityId === causeEnt.id) ||
              e.verbLemma === becauseOf[1]))
        : null;
      const causeNode = priorEvent ? priorEvent.id : causeEnt ? causeEnt.id : null;
      if (causeNode) {
        linkCausal(ws, g, model, causeNode, result.events[0].id, "asserted",
          `stated: "because of the ${becauseOf[1]}"`);
      }
    }
    if (/\bbecause\b/.test(lower) && !becauseOf && result.events.length >= 2) {
      // "X because Y": the later clause is the cause
      linkCausal(ws, g, model,
        result.events[result.events.length - 1].id, result.events[0].id,
        "asserted", `stated with "because"`);
    }
    // an event whose actor is a known cause of its object's
    // state: "the rain flooded the garden" — check the testimony
    for (const ev of result.events) {
      const actorP = ev.participants.find((p) => p.role === "actor");
      const objP = ev.participants.find((p) => p.role === "object");
      if (actorP && objP && actorP.entityId !== speaker.id) {
        const check = checkCausal(g, model, actorP.entityId, ev.id);
        if (check.checked) {
          linkCausal(ws, g, model, actorP.entityId, ev.id, "known",
            `the event itself states it, and ${check.evidence}`);
        }
      }
    }

    /* temporal relations over the model's event chain */
    temporalRelations(ws, model, previousLatest, result.events);
  }

  /* Loop 2 (L2-M): a motive link. When this turn records the
   * person's doing while a feeling they stated EARLIER is
   * still live, the situation is connected, not a pile of
   * isolated entries: the feeling stands behind the doing as
   * its motive in the conversation's own record. The link is
   * the model's inference and is stamped inferred; the
   * follow-up policy consults it before ever asking for a
   * motive the conversation already contains. */
  if (result.doingEvent) {
    const feeling = [...model.states].reverse().find(
      (s) => s.entityId === speaker.id && s.kind === "feeling" &&
        !s.supersededBy && s.turn < turn);
    if (feeling) {
      addRelation(model, {
        family: "causal", kind: "motivatedBy",
        from: feeling.id, to: result.doingEvent.id,
        attribution: "inferred",
        note: `the stated feeling "${feeling.text}" (turn ${feeling.turn}) stands behind this doing — inferred from the conversation's own record`,
      }, turn);
      noteStep(ws, "situationModel", "situate-model",
        `motive link: feeling "${feeling.text}" —motivatedBy→ "${result.doingEvent.action}" [inferred]`);
    }
  }

  ws.situationModel = {
    entities: model.entities.length,
    events: model.events.length,
    states: model.states.length,
    relations: model.relations.length,
    turnEvents: result.events.map((e) => e.id),
    latestEvent: model.events.length ? model.events[model.events.length - 1].id : null,
  };
  if (result.events.length || result.statesAdded.length || result.resolutions.length) {
    noteStep(ws, "situationModel", "situate-model",
      `situation model: ${model.entities.length} entities, ${model.events.length} events, ` +
      `${model.states.length} states, ${model.relations.length} relations`);
  }
  return result;
}

/* ---------------- consumption: referring questions -------------- */

export interface SituationAnswer {
  text: string;
  grounded: boolean;
}

/** The actor entity of an event, if it has one. */
function eventActor(model: SituationModel, ev: SituationEvent): SituationEntity | null {
  const p = ev.participants.find((x) => x.role === "actor");
  return p ? entityById(model, p.entityId) : null;
}

function eventObject(model: SituationModel, ev: SituationEvent): SituationEntity | null {
  const p = ev.participants.find((x) => x.role === "object");
  return p ? entityById(model, p.entityId) : null;
}

/** Does an event involve (as any participant) an entity matching text? */
function eventMentions(model: SituationModel, ev: SituationEvent, text: string): boolean {
  const t = text.toLowerCase();
  if (ev.action.toLowerCase().includes(t) || ev.verbLemma === t) return true;
  return ev.participants.some((p) => {
    const e = entityById(model, p.entityId);
    return e !== null && (e.label.toLowerCase().includes(t) || t.includes(e.label.toLowerCase()));
  });
}

/**
 * Answer a follow-up / referring question FROM THE MODEL, when
 * the model holds what the question points at. The wording is
 * assembled here from model parts (event phrases, participant
 * labels, stated times) — every part something the conversation
 * itself supplied, so the answers are grounded in the record,
 * not in fresh topic lookup. Returns null when the question is
 * not the model's to answer; the caller falls through.
 */
/**
 * The subject head for restating the speaker's doing (L2-K):
 * an intended doing keeps its intention in the answer too —
 * "You are thinking of" / "You plan to" — never a bare
 * "You are" that upgrades the intention to a present fact.
 */
function doingSubject(ev: SituationEvent): string {
  if (ev.mode !== "intended") return "You are";
  return ev.intentMarker === "plan to" ? "You plan to" : "You are thinking of";
}

export function answerSituationQuestion(
  ws: TurnWorkspace,
  session: SessionState,
): SituationAnswer | null {
  const model = session.situation;
  if (!model.events.length && !model.states.length && !model.relations.length) return null;
  const lower = ws.input.toLowerCase();
  const turn = ws.trace.turn;
  const latest = model.events.length ? model.events[model.events.length - 1] : null;

  const actorForPronoun = (pronoun: string): SituationEntity | null => {
    const r = resolvePronoun(model, pronoun, turn);
    return r.entityId ? entityById(model, r.entityId) : null;
  };

  /* "what are you making?" / "what is he making?" / "what is sarah cooking?"
   * / "what am i selling?" — the first-person form names the
   * speaker with "am i"; the model holds the speaker's events
   * under the speaker entity, so it is the model's to answer
   * exactly like the second-person form. */
  const whatDoing = lower.match(
    /\bwhat (?:are|is|am) (you|he|she|they|i|[a-z]+) (\w+ing)\b/);
  if (whatDoing) {
    const who = whatDoing[1];
    const actor = who === "you" || who === "i"
      ? model.entities.find((e) => e.speaker) ?? null
      : PRONOUNS.has(who)
        ? actorForPronoun(who)
        : model.entities.find((e) => e.label.toLowerCase() === who) ?? null;
    const byActor = [...model.events].reverse().filter(
      (e) => actor !== null && eventActor(model, e)?.id === actor.id);
    const ev = byActor.find((e) => e.verb === whatDoing[2].toLowerCase()) ?? byActor[0];
    if (ev && actor) {
      const subject = actor.speaker ? doingSubject(ev) : `${cap(actor.label)} is`;
      noteStep(ws, "situationModel", "situate-model",
        `referring question answered from the model: ${ev.action} (event ${ev.id}, asserted turn ${ev.turn})`);
      return {
        text: `${subject} ${forAddressee(ev.action)}${ev.timeText ? `, ${displayTime(ev.timeText)}` : ""}.`,
        grounded: true,
      };
    }
  }

  /* "what are you doing?" / "what is he doing?" / "what am i doing?" */
  const whatDoingBare = lower.match(/\bwhat (?:are|is|am) (you|he|she|they|i) doing\b/);
  if (whatDoingBare && latest) {
    const who = whatDoingBare[1];
    const actor = who === "you" || who === "i"
      ? model.entities.find((e) => e.speaker) ?? null
      : actorForPronoun(who);
    const ev = actor
      ? [...model.events].reverse().find((e) => eventActor(model, e)?.id === actor.id) ?? latest
      : latest;
    const a = eventActor(model, ev);
    const subject = a && a.speaker ? doingSubject(ev) : a ? `${cap(a.label)} is` : "That is";
    return {
      text: `${subject} ${forAddressee(ev.action)}${ev.timeText ? `, ${displayTime(ev.timeText)}` : ""}.`,
      grounded: true,
    };
  }

  /* "when is it?" / "when are you making it?" / "when is the picnic?"
   * — a when-question LEADS with "when". A "when" embedded in
   * another question ("what happens when it rains?") is not
   * one: that question belongs to the event-consequence
   * machinery and must fall through untouched. */
  const whenQ = /^\s*when\b/.test(lower);
  if (whenQ) {
    const noun = (lower.match(/\b(?:the|a|an)\s+([a-z]+)\b/) ?? [])[1];
    const named = noun
      ? model.events.filter((e) => eventMentions(model, e, noun))
      : [];
    // Loop 2 (L2-E): the question's own content words — above
    // all the verb it names ("when is Dana arriving?") —
    // select the event they match BEFORE the recency fallback:
    // the fallback answers about whatever happened last, which
    // is how an arrival question came to be answered about an
    // unrelated later event's missing time. Pronoun questions
    // ("when is it?") name no content words and keep the
    // fallback, as designed.
    const qWords = new Set(
      lower.split(/[^a-z']+/).filter((w) =>
        w.length > 2 &&
        !["when", "is", "was", "are", "does", "did", "the", "it", "that", "this", "what"].includes(w)),
    );
    const wordMatched = qWords.size
      ? model.events.filter((e) =>
          e.action.toLowerCase().split(/[^a-z']+/).some((w) => qWords.has(w)))
      : [];
    const ev = named.length
      ? named[named.length - 1]
      : wordMatched.length
        ? wordMatched[wordMatched.length - 1]
        : latest;
    if (ev) {
      noteStep(ws, "situationModel", "situate-model",
        `when-question answered from the model: event ${ev.id} time ${ev.timeText ?? "(none stated)"}`);
      return ev.timeText
        ? { text: `${cap(forAddressee(ev.action))} — ${displayTime(ev.timeText)}.`, grounded: true }
        : {
            text: `You didn't say when ${forAddressee(ev.action)} is — no time was stated for it.`,
            grounded: false,
          };
    }
  }

  /* "what's in it?" / "what is in the pot?" — the container's content */
  if (/\bwhat(?:'s| is) in\b/.test(lower)) {
    const ev = [...model.events].reverse().find(
      (e) => e.participants.some((p) => p.part === "content"));
    if (ev) {
      const content = ev.participants.find((p) => p.part === "content");
      const container = ev.participants.find((p) => p.part === "container");
      const cEnt = content ? entityById(model, content.entityId) : null;
      const kEnt = container ? entityById(model, container.entityId) : null;
      if (cEnt) {
        return {
          text: `${cap(cEnt.label)} — that's what's in ${kEnt ? `the ${kEnt.label.replace(/^(a|an|the)\s+/i, "")}` : "it"}, from what you said.`,
          grounded: true,
        };
      }
    }
  }

  /* "who is making the soup?" / "who is cooking?" */
  const whoQ = lower.match(/\bwho (?:is|was) (\w+ing)(?:\s+the\s+([a-z]+))?\b/);
  if (whoQ) {
    const ev = [...model.events].reverse().find(
      (e) => e.verbLemma === (verbBase(whoQ[1]) ?? whoQ[1].replace(/ing$/, "")) &&
        (!whoQ[2] || eventMentions(model, e, whoQ[2])));
    if (ev) {
      const actor = eventActor(model, ev);
      if (actor) {
        return {
          // Loop 2 (L2-W): the answer said twice was a saying
          // defect — a false start ("Your brother is — your
          // brother is the one…") duplicated the clause. The
          // model's content was always right; say it once.
          text: actor.speaker
            ? `You're the one ${forAddressee(ev.action)}.`
            : `${cap(actor.label)} is the one ${forAddressee(ev.action)}.`,
          grounded: true,
        };
      }
    }
  }

  /* "who is sarah?" — a person the conversation itself
   * introduced, with their stated relation to the speaker:
   * the model's Sarah outranks the graph's stranger of the
   * same name */
  const whoNamed = lower.match(/\bwho is ([a-z]+)\b/);
  if (whoNamed) {
    const ent = model.entities.find(
      (e) => e.kind === "person" && !e.speaker &&
        (e.label.toLowerCase() === whoNamed[1] ||
          e.surfaces.some((s) => s.toLowerCase() === whoNamed[1])));
    if (ent && ent.relationToSpeaker) {
      noteStep(ws, "situationModel", "situate-model",
        `who-question answered from the model: ${ent.label} is the person's ${ent.relationToSpeaker} [asserted, turn ${ent.firstTurn}]`);
      return {
        text: `${cap(whoNamed[1])} is your ${ent.relationToSpeaker} — that's who you told me about.`,
        grounded: true,
      };
    }
  }

  /* "who is he bringing?" — the object of someone's event:
   * the phrase between "is" and the verb names the actor,
   * pronoun or description alike */
  const whoObject = lower.match(/\bwho is (?:the )?(.+?) (\w+ing)\b/);
  if (whoObject) {
    const actorPhrase = whoObject[1].trim();
    const actor = PRONOUNS.has(actorPhrase)
      ? actorForPronoun(actorPhrase)
      : model.entities.find((e) =>
          e.label.toLowerCase().includes(actorPhrase) ||
          actorPhrase.includes(e.label.toLowerCase().replace(/^your /, ""))) ?? null;
    const ev = actor
      ? [...model.events].reverse().find((e) => eventActor(model, e)?.id === actor.id)
      : null;
    if (ev && ev.objectText) {
      return { text: `${cap(forAddressee(ev.objectText))}.`, grounded: true };
    }
  }

  /* Loop 2 (L2-F): "what is Priya bringing?" — a named
   * person's doing asked by NAME: that person's recorded
   * event with the asked verb, restated with the name the
   * question used. The speaker forms are the what-am-I
   * branches above; until now the named form fell through
   * to a definition of the verb, as if the conversation had
   * never recorded the happening. A person with no such
   * recorded event falls through unchanged. */
  const whatNamed = lower.match(/\bwhat (is|was) ([a-z]+(?: [a-z]+)?) (\w+ing)\b/);
  if (whatNamed) {
    const actorPhrase = whatNamed[2].trim();
    const actor = PRONOUNS.has(actorPhrase)
      ? actorForPronoun(actorPhrase)
      : model.entities.find((e) =>
          e.label.toLowerCase() === actorPhrase ||
          e.label.toLowerCase().replace(/^your /, "") === actorPhrase ||
          e.surfaces.some((s) => s.toLowerCase() === actorPhrase)) ?? null;
    const lemma = verbBase(whatNamed[3]) ?? whatNamed[3].replace(/ing$/, "");
    const ev = actor
      ? [...model.events].reverse().find(
          (e) => eventActor(model, e)?.id === actor.id && e.verbLemma === lemma)
      : null;
    if (ev) {
      noteStep(ws, "situationModel", "situate-model",
        `referring question answered from the model: ${ev.action} (event ${ev.id}, asserted turn ${ev.turn})`);
      return {
        text: `${cap(actorPhrase)} ${whatNamed[1]} ${forAddressee(ev.action)}.`,
        grounded: true,
      };
    }
  }

  /* "how am i feeling?" — the speaker's live feeling state */
  if (/\bhow am i\b/.test(lower) || /\bhow do i feel\b/.test(lower)) {
    const speaker = model.entities.find((e) => e.speaker);
    if (speaker) {
      const live = [...model.states].reverse().find(
        (s) => s.entityId === speaker.id && s.kind === "feeling" && !s.supersededBy);
      const prior = [...model.states].reverse().find(
        (s) => s.entityId === speaker.id && s.kind === "feeling" && s.supersededBy);
      if (live) {
        return {
          text: `You're feeling ${live.text}${prior ? ` — you were ${prior.text} before` : ""}, by what you've said.`,
          grounded: true,
        };
      }
    }
  }

  /* order: "which happened first…?" / "did X come before Y?" / "what happened first?" */
  if (/\bwhich (?:happened|came|was) first\b/.test(lower) ||
      /\bwhat happened first\b/.test(lower)) {
    const rels = model.relations.filter((r) => r.family === "temporal" && r.kind === "before");
    const first = model.events[0];
    if (first && model.events.length >= 2) {
      const rel = rels[0];
      const rest = model.events.slice(1).map((e) => forAddressee(e.action)).join(", then ");
      return {
        text: `First: ${forAddressee(first.action)}. Then: ${rest}.` +
          (rel && rel.attribution === "inferred"
            ? " (That's the order you told me in — the sequence itself is my inference from the telling.)"
            : ""),
        grounded: true,
      };
    }
  }
  const didBefore = lower.match(/\bdid (?:the )?([a-z]+) (?:come|happen) before (?:the )?([a-z]+)/);
  if (didBefore) {
    const aEv = model.events.find((e) => eventMentions(model, e, didBefore[1]));
    const bEv = model.events.find((e) => eventMentions(model, e, didBefore[2]));
    if (aEv && bEv && aEv.id !== bEv.id) {
      const yes = model.events.indexOf(aEv) < model.events.indexOf(bEv);
      const rel = model.relations.find(
        (r) => r.family === "temporal" && r.kind === "before" &&
          ((r.from === aEv.id && r.to === bEv.id) || (r.from === bEv.id && r.to === aEv.id)));
      return {
        text: (yes
          ? `Yes — ${forAddressee(aEv.action)} came before ${forAddressee(bEv.action)}.`
          : `No — ${forAddressee(bEv.action)} came before ${forAddressee(aEv.action)}.`) +
          (rel && rel.attribution === "inferred"
            ? " (Going by the order you told me in.)"
            : ""),
        grounded: true,
      };
    }
  }

  /* state now: "how is sarah?" / "how does he feel?" / "is the garden still flooded?" */
  const howIs = lower.match(/\bhow is ([a-z]+)\b/) ??
    lower.match(/\bhow does (he|she|they) feel\b/);
  if (howIs) {
    const who = howIs[1];
    const ent = PRONOUNS.has(who)
      ? actorForPronoun(who)
      : model.entities.find((e) => e.label.toLowerCase().includes(who)) ?? null;
    if (ent) {
      const live = [...model.states].reverse().find(
        (s) => s.entityId === ent.id && !s.supersededBy);
      if (live) {
        return {
          text: `${cap(forAddressee(ent.label))} is ${live.text} — that's the latest state you mentioned.`,
          grounded: true,
        };
      }
    }
  }
  const stillQ = lower.match(/\bis (?:the )?([a-z]+) still ([a-z]+)\b/);
  if (stillQ) {
    const ent = model.entities.find((e) => e.label.toLowerCase().includes(stillQ[1]));
    if (ent) {
      const live = [...model.states].reverse().find(
        (s) => s.entityId === ent.id && !s.supersededBy);
      if (live) {
        return live.text === stillQ[2]
          ? { text: `As far as you've said, yes — the ${ent.label} is ${live.text}.`, grounded: true }
          : { text: `No — the latest you said is that the ${ent.label} is ${live.text}.`, grounded: true };
      }
    }
  }

  /* duration: "how long has it been raining?" — answered from
   * a duration the person stated ("the third day of rain"),
   * recorded as a circumstance state on the phenomenon. The
   * question's verb names the phenomenon by its base form; a
   * duration state whose text or entity matches it is the
   * record's answer. No recorded duration → null, and the
   * ordinary machinery answers as it always has. */
  const howLong = lower.match(/\bhow long (?:has|have) it been (\w+ing)\b/);
  if (howLong) {
    const lemma = verbBase(howLong[1]) ?? howLong[1].replace(/ing$/, "");
    const st = [...model.states].reverse().find((s) =>
      s.kind === "circumstance" && !s.supersededBy &&
      (s.text.includes(lemma) ||
        entityById(model, s.entityId)?.label.toLowerCase() === lemma));
    if (st) {
      noteStep(ws, "situationModel", "situate-model",
        `duration question answered from the model: "${st.text}" [${st.attribution}, stated turn ${st.turn}]`);
      return {
        text: `${cap(st.text)} — that's how long, by what you said.`,
        grounded: true,
      };
    }
  }

  /* Loop 2 (L2-G): the subject form of the same question —
   * "how long has my knee been aching?" — answered from the
   * circumstance state the "has been … for …" statement
   * recorded on that subject's entity. */
  const howLongSubject = lower.match(/\bhow long (?:has|have) ([a-z' ]+?) been ([a-z]+)\b/);
  if (howLongSubject && howLongSubject[1].trim() !== "it") {
    const subj = entityInPhrase(model, howLongSubject[1].trim());
    const predicate = howLongSubject[2];
    const st = [...model.states].reverse().find((s) =>
      s.kind === "circumstance" && !s.supersededBy &&
      s.text.includes(predicate) &&
      (!subj || s.entityId === subj.id));
    if (st) {
      noteStep(ws, "situationModel", "situate-model",
        `duration question answered from the model: "${st.text}" [${st.attribution}, stated turn ${st.turn}]`);
      return {
        text: `${cap(st.text)} — that's how long, by what you said.`,
        grounded: true,
      };
    }
  }

  return null;
}

/**
 * A why-question whose subject is one of the model's events or
 * entities: answer from the model's causal relations, with the
 * attribution said out loud — graph-checked testimony is quoted,
 * the person's own stated reason is credited to them, and an
 * engine inference is marked as one (grounding outranks fluency:
 * a why the record cannot support returns null and the ordinary
 * why-machinery declines on its own terms).
 */
/**
 * Content words for mention matching: length-gated like the old
 * scan, but function words can never be a mention — matching on
 * "the" let any causal relation answer any question containing
 * those three letters, and substring matching let "eat" match
 * "weather". Whole words only, at the call site.
 */
export function mentionWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Whole-word mention: "eat" must not match inside "weather". */
export function mentionsWord(lower: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower);
}

export function answerSituationWhy(
  ws: TurnWorkspace,
  session: SessionState,
  /** Item 5: a bare "Why?" names neither cause nor effect — take
   *  the standing (latest) causal relation instead of matching
   *  mentioned words. */
  bare = false,
): SituationAnswer | null {
  const model = session.situation;
  const lower = ws.input.toLowerCase();
  const causals = model.relations.filter((r) => r.family === "causal");
  for (const rel of [...causals].reverse()) {
    const effectLabel = nodeLabel(model, rel.to).toLowerCase();
    const effectEv = eventById(model, rel.to);
    const effectWords = new Set(mentionWords(effectEv ? effectEv.action : effectLabel));
    const causeText = nodeLabel(model, rel.from).toLowerCase().replace(/^the /, "");
    const mentioned = [...effectWords].some((w) => mentionsWord(lower, w)) ||
      (causeText !== "" && mentionsWord(lower, causeText));
    if (!mentioned && !bare) continue;
    const causeLabel = forAddressee(nodeLabel(model, rel.from));
    const effectText = forAddressee(nodeLabel(model, rel.to));
    noteStep(ws, "situationModel", "situate-model",
      `why-question answered from the model's causal relation ${rel.id} [${rel.attribution}]: ${rel.note}`);
    if (rel.attribution === "known") {
      return {
        text: `Because of ${causeLabel} — the graph backs that link: ${rel.note.split("CSKG testifies: ")[1] ?? rel.note}.`,
        grounded: true,
      };
    }
    if (rel.attribution === "asserted") {
      return {
        text: `Because of ${causeLabel} — that's the reason you gave for ${effectText}. ` +
          `The graph itself doesn't record that causation; I'm going on what you said.`,
        grounded: true,
      };
    }
    return {
      text: `My best reading is ${causeLabel} — but that link is my inference from how you told it, not something stated or graph-backed.`,
      grounded: false,
    };
  }
  return null;
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
