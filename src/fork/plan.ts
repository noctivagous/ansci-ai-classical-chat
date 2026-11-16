/**
 * plan.ts — the reply planner (reply-planning design note §5,
 * slice R1): the one new transform. Situation plus derivations
 * in, a reply meaning graph out — or a priced decline, or a
 * named unrealisability. The graph it builds is an ordinary
 * meaning graph of the parser's own record type (§2.3), so the
 * existing generator realises it and the round-trip machinery
 * applies to replies unchanged. No new node or edge vocabulary
 * is introduced (§5): the transform uses the subject node, the
 * predicated quality node, and the declarative 'predicate'
 * relation the parser itself builds.
 *
 * The transform's shape is §2.3's mechanical one: the topic
 * entity as subject, the derived quality as its predicated
 * state, and the derivation path carried alongside as
 * subordinate causal material. Strength is §9.2's price,
 * computed here via pricing.ts and written into the graph as
 * qualification states the generator realises (R1.5 closed
 * the realisation gaps R1 recorded as G1–G3):
 *
 *  - PLAIN is a bare predication ("The salt is cold.").
 *  - LIGHTLY-QUALIFIED rides as a hedge modulator on the
 *    predicate ("likely") — a 'modulates' node, the same
 *    device the ZH predicate path reads its degree words
 *    through, now read on the EN predicate path too.
 *  - QUALIFIED rides as the modal state "may" on the
 *    predicate root ("The soup may be cold."); POSSIBILITY
 *    as the weaker modal "might". The mapping is
 *    QUALIFICATION_BY_LEVEL below — one table, as data.
 *    Every level has an honest surface form in the existing
 *    state vocabulary, so no level borrows a neighbour's.
 *  - A derivation's DEGREE (how strongly the quality runs in
 *    the subject — the season degree profile's content) rides
 *    as a degree modulator on the predicate, its form from
 *    DEGREE_FORM ("Winter is most fully cold.").
 *  - The causal form (§7.2, policy (a): demanded by a
 *    why-question or a challenge) is built when the
 *    derivation carries surfaceable causal content: its
 *    degree. The reply graph then holds a second predication
 *    — the same subject and quality, at the derivation's
 *    degree — joined to the main predicate root by a 'links'
 *    edge whose marker is "because" ('links' is the graph's
 *    existing clause-joining relation; the marker field is
 *    the connective layer's device for carrying the surface
 *    connective). The generator composes it as ", because …".
 *    A demanded causal form whose derivation carries NO
 *    degree has nothing it can honestly say: the path's
 *    remaining steps are correspondence assignments, which
 *    have no plain-words surface form under the surface ban.
 *    That outcome is still UNREALISABLE, with the reason
 *    named — never a bare conclusion passed off as a
 *    why-answer.
 *
 * A derivation whose price declines (support below the floor)
 * yields the priced decline (§2.2): the computation's output
 * is the decline, with its ground — the support shortfall —
 * named in the outcome for the trace; the caller renders it
 * in the turn loop's decline shape.
 */
import { cycleOf, CONTROLS, GENERATES, EN_LEXICON, type Element, type MeaningEdge, type MeaningNode, type ParsedSentence, type VerbEntry } from "./sentence";
import { generate } from "./generate";
import { SUPPORT_FLOOR, type PricingRecord, type StrengthLevel, type Tier } from "./pricing";
import { SUPPORT_CONTROLLING, SUPPORT_GENERATING, SUPPORT_SAME } from "./sense";
import { applyLength, arbitrateOrder, priceWithBoundary, type BiasRecord } from "./disposition";
import type { Composition } from "./composition";

/**
 * The level → graph-states table (§9.2's speech pricing, made
 * speakable in R1.5): how each spoken strength is written into
 * the reply graph, in the state vocabulary the graph already
 * has — one table, as data, in this one place. The generator
 * realises the states; nothing here is surface wording.
 *  - plain: no entry — no qualification state; the bare
 *    predication.
 *  - lightly-qualified: a hedge modulator ("likely") on the
 *    predicate — the predication stands, hedged as probable.
 *  - qualified: the modal state "may" — the predication is
 *    spoken as a genuine possibility.
 *  - possibility: the modal state "might" — the weaker modal,
 *    a remote possibility.
 * The ladder is monotone: each level is a real weakening of
 * the one above it in ordinary English, and each has its own
 * form — no level is mapped onto a neighbour's.
 */
export const QUALIFICATION_BY_LEVEL: Partial<Record<StrengthLevel, { modal?: string; hedge?: string }>> = {
  "lightly-qualified": { hedge: "likely" },
  qualified: { modal: "may" },
  possibility: { modal: "might" },
};

/**
 * Degree grades → surface forms (R1.5, gap G1): how strongly a
 * derived quality runs in its subject, graded on the season
 * degree profile's own bands (strongest / strong / faint, at
 * the shares the probe's rendering used: ≥0.65 / ≥0.35 /
 * below). The forms are the degree vocabulary of the ZH
 * predicate path's construction — a degree modulator before
 * the quality — in English: slightly / fully / most fully.
 * The grade → form table lives here, with the qualification
 * table; the caller supplies only the grade.
 */
export type DegreeGrade = "faint" | "strong" | "strongest";
export const DEGREE_FORM: Record<DegreeGrade, string> = {
  faint: "slightly",
  strong: "fully",
  strongest: "most fully",
};

export interface PredicationSubject {
  lemma: string;
  /** Surface form as parsed (the reply graph reuses the person's own node material). */
  form: string;
  det?: string;
  /** Subject person for the copula, as the parse recorded it ("3sg" default). */
  person?: string;
}

/**
 * The cohesion mapping (R5, §8.7 S3), as data: the relation a
 * reply graph stands in to the session record, and the 'links'
 * marker that relation earns. A connective is realised only
 * when its relation exists — an unearned marker is an
 * ungrounded claim, banned on the same ground as any other.
 * The caller (turn.ts) detects the relation against the
 * record and hands the earned marker in; the transforms here
 * write it into the graph as a 'links' edge from the subject
 * node to the lead predicate root, and the generator realises
 * it (sentence-initial for "and"/"so"/"but", a fronted topic
 * phrase for "as for"). R5 earns return and contrast at the
 * question sites; continuation and consequence stand in the
 * mapping unrealised until a site earns them (T-R5 §1 records
 * the scoping).
 */
export type CohesionRelation = "continuation" | "consequence" | "contrast" | "return";
export const COHESION_MARKERS: Record<CohesionRelation, string> = {
  continuation: "and",
  consequence: "so",
  contrast: "but",
  return: "as for",
};

export interface PlanPredicationInput {
  subject: PredicationSubject;
  /** The derived quality/state lemma to predicate of the subject. */
  qualityLemma: string;
  /** The derivation path the conclusion rests on (text form, as the trace carries it). */
  derivationPath: string;
  /** The derivation's support (§2.2's weights / the path's priced support). */
  support: number;
  /** The weakest classification tier standing on the path (§9.2). */
  weakestTier: Tier;
  /** True when the turn demands the causal form: a why-question
   *  or a challenge to the conclusion (§7.2, policy (a)). */
  causalDemanded?: boolean;
  /** The degree at which the derived quality runs in the
   *  subject, when the derivation carries one (the season
   *  degree profile's bands). Rides the reply graph as a
   *  degree modulator; under a demanded causal form it is
   *  also the causal subordinate's content. */
  degree?: DegreeGrade;
  /** The session's disposition composition (R4): its bias
   *  applies to this predication's pricing — the threshold
   *  channel only (§9.1(c)). Absent or neutral: the pre-R4
   *  pricing, and no bias record. */
  disposition?: Composition;
  /** R5 (§8.7 S3): the cohesion marker this predication has
   *  EARNED against the session record (COHESION_MARKERS),
   *  detected by the caller. Written into the graph as a
   *  'links' edge from the subject node to the predicate
   *  root. Absent: no relation held, no marker — the bare
   *  predication. */
  cohesionMarker?: string;
}

export type PlanOutcome =
  | {
      kind: "graph";
      /** The generated surface text. */
      sentence: string;
      /** The reply meaning graph the sentence was generated from. */
      graph: ParsedSentence;
      pricing: PricingRecord;
      level: StrengthLevel;
      /** The derivation path, carried as the graph's causal material. */
      derivationPath: string;
      /** R4: the disposition bias records this outcome carries
       *  (the threshold channel), when any applied. */
      bias?: BiasRecord[];
    }
  | {
      kind: "declined";
      pricing: PricingRecord;
      /** The decline's ground, with its numbers — for the trace (§6). */
      ground: string;
      derivationPath: string;
      bias?: BiasRecord[];
    }
  | {
      kind: "unrealisable";
      pricing: PricingRecord;
      /** The strength the reply was priced at and could not be spoken at. */
      level: StrengthLevel;
      /** Why the generator cannot realise this outcome — for the trace. */
      reason: string;
      derivationPath: string;
      bias?: BiasRecord[];
    };

/**
 * Plan one conclusion predication: subject + derived quality,
 * priced by §9.2. Pure: builds and generates the reply graph
 * without touching any session.
 */
export function planPredication(input: PlanPredicationInput): PlanOutcome {
  // R4 (§9.1(c)): the price is computed through the disposition
  // bias mechanism — the composition's boundary within its band,
  // ceilings and floor unmoved. No bias in force: priceReply
  // itself, exactly as before R4.
  const { priced, record } = priceWithBoundary(input.weakestTier, input.support, input.disposition);
  if (record) record.context = `the pricing of ${input.subject.lemma} → ${input.qualityLemma}`;
  const pricing: PricingRecord = {
    weakestTier: input.weakestTier,
    support: input.support,
    ...priced,
  };
  const base = { pricing, derivationPath: input.derivationPath, ...(record ? { bias: [record] } : {}) };

  if (pricing.declined) {
    return {
      ...base,
      kind: "declined",
      ground:
        `support ${input.support} is below the floor ${SUPPORT_FLOOR} — ` +
        `the derivation from ${input.subject.lemma} to ${input.qualityLemma} is too weak to speak from (§9.2)`,
    };
  }

  if (input.causalDemanded && !input.degree) {
    return {
      ...base,
      kind: "unrealisable",
      level: pricing.level,
      reason:
        "the causal form was demanded (a why-question, §7.2 policy (a)) but this derivation " +
        "carries no degree for the causal subordinate to state — the path's steps beyond the " +
        "conclusion are correspondence assignments, which have no plain-words surface form — " +
        "so the bare conclusion is not passed off as a why-answer",
    };
  }

  /* The reply graph: the predication built exactly as the
   * parser builds a declarative predicate clause, with the
   * priced qualification (§9.2) and the derivation's degree
   * written in as states and modulators (QUALIFICATION_BY_LEVEL
   * / DEGREE_FORM above). The generator realises all of them. */
  const qualification = QUALIFICATION_BY_LEVEL[pricing.level];
  const qualityEntry = EN_LEXICON[input.qualityLemma];
  const subject: MeaningNode = {
    id: "reply-subject",
    lemma: input.subject.lemma,
    form: input.subject.form,
    syntacticElement: "Earth",
    ...(input.subject.det ? { det: input.subject.det } : {}),
  };
  const quality: MeaningNode = {
    id: "reply-predicate",
    lemma: input.qualityLemma,
    form: input.qualityLemma,
    syntacticElement: "Fire",
    role: "predicate",
    ...(qualityEntry && "semanticElement" in qualityEntry && qualityEntry.semanticElement
      ? { semanticElement: qualityEntry.semanticElement }
      : {}),
    states: {
      copulaTense: "present",
      mood: "indicative",
      subjectPerson: input.subject.person ?? "3sg",
      ...(qualification?.modal ? { modal: qualification.modal } : {}),
    },
  };
  const nodes: MeaningNode[] = [subject, quality];
  const edges: MeaningEdge[] = [
    { from: subject.id, to: quality.id, relation: "predicate", cycle: cycleOf("Earth", "Fire") },
  ];
  const modulator = (id: string, form: string, to: string): void => {
    nodes.push({ id, lemma: form, form, syntacticElement: "Water" });
    edges.push({ from: id, to, relation: "modulates", cycle: cycleOf("Water", "Fire") });
  };
  // The hedge rides before the degree when both are present
  // ("likely most fully cold"): qualification scopes over the
  // degree, as the graph order here records.
  if (qualification?.hedge) modulator("reply-hedge", qualification.hedge, quality.id);
  if (input.degree && !input.causalDemanded) modulator("reply-degree", DEGREE_FORM[input.degree], quality.id);

  /* The causal form: a second predication — the same subject
   * and quality, carrying the derivation's degree — joined to
   * the main predicate by a 'links' edge marked "because".
   * The degree moves to the subordinate: it is the ground the
   * why-answer states, as the probe's hand rendering also put
   * it there ("Winter is cold, because … most fully …"). */
  if (input.causalDemanded && input.degree) {
    const causeSubject: MeaningNode = {
      id: "reply-cause-subject",
      lemma: input.subject.lemma,
      form: input.subject.form,
      syntacticElement: "Earth",
      ...(input.subject.det ? { det: input.subject.det } : {}),
    };
    const causeQuality: MeaningNode = {
      id: "reply-cause-predicate",
      lemma: input.qualityLemma,
      form: input.qualityLemma,
      syntacticElement: "Fire",
      role: "predicate",
      ...(qualityEntry && "semanticElement" in qualityEntry && qualityEntry.semanticElement
        ? { semanticElement: qualityEntry.semanticElement }
        : {}),
      states: { copulaTense: "present", mood: "indicative", subjectPerson: input.subject.person ?? "3sg" },
    };
    nodes.push(causeSubject, causeQuality);
    edges.push({ from: causeSubject.id, to: causeQuality.id, relation: "predicate", cycle: cycleOf("Earth", "Fire") });
    modulator("reply-cause-degree", DEGREE_FORM[input.degree], causeQuality.id);
    edges.push({ from: quality.id, to: causeQuality.id, relation: "links", cycle: cycleOf("Fire", "Fire"), marker: "because" });
  }

  /* R5 (§8.7 S3): an earned cohesion marker joins this
   * predication to the session record — a 'links' edge from
   * the subject node to the predicate root, the marker field
   * carrying the connective, as it carries "because" on the
   * causal edge above. No marker was earned, no edge. */
  if (input.cohesionMarker) {
    edges.push({ from: subject.id, to: quality.id, relation: "links", cycle: cycleOf("Earth", "Fire"), marker: input.cohesionMarker });
  }

  const graph: ParsedSentence = {
    meaning: { nodes, edges, rootId: quality.id, entryElement: "Fire" },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
  };
  return { ...base, kind: "graph", sentence: generate(graph), graph, level: pricing.level };
}

/* ------------------------------------------------------------------ */
/* Composition of conclusions (slice R2: §7.1, §8.7 S13)              */
/* ------------------------------------------------------------------ */

/**
 * The two orderings of §7.1, both built: by SUPPORT (descending)
 * and by RELATION to the newest state. Support is the default —
 * held in this one named data constant, so switching the default
 * is a data change, exactly as §7.1's decision requires. The
 * reply graph is built in the active order; both orderings are
 * recorded on the outcome so the comparison is visible in every
 * trace (§7.1: relation-order is the comparison that can displace
 * the default on evidence — evidence neither ordering can supply
 * unless both are computed).
 */
export type CompositionOrder = "support" | "relation";
export const DEFAULT_ORDER: CompositionOrder = "support";

/**
 * The relation precedence for relation order, as data: the kinds
 * a conclusion's element can stand in to the newest state's
 * element, weighted by the sense layer's support weights — the
 * arbitration pattern §2.1 names (sense.ts: same element 1.0, a
 * generating relation in either direction 0.8, a controlling
 * relation in either direction 0.4, no relation 0). The grounds
 * are §2.1's steering logic read as precedence: what the newest
 * state IS comes first; what generates or is generated by it —
 * the direction the steering follows toward expression — next;
 * what restrains or is restrained by it — the restrainer the
 * steering addresses — after that; and what bears no cycle
 * relation to it last. The restraint asymmetry of the sense
 * scorer is inherited with the weights: a controlling relation
 * corroborates, never counts against.
 */
export type RelationKind = "same-element" | "generating" | "controlling" | "unrelated";
export const RELATION_PRECEDENCE: { kind: RelationKind; weight: number }[] = [
  { kind: "same-element", weight: SUPPORT_SAME },
  { kind: "generating", weight: SUPPORT_GENERATING },
  { kind: "controlling", weight: SUPPORT_CONTROLLING },
  { kind: "unrelated", weight: 0 },
];

/** The relation one element stands in to another, for ordering —
 *  the sense scorer's relation test, named as a kind. */
export function relationKindTo(stateElement: Element, element: Element): RelationKind {
  if (stateElement === element) return "same-element";
  if (GENERATES[stateElement] === element || GENERATES[element] === stateElement) return "generating";
  if (CONTROLS[stateElement] === element || CONTROLS[element] === stateElement) return "controlling";
  return "unrelated";
}

function relationWeight(kind: RelationKind): number {
  return RELATION_PRECEDENCE.find((r) => r.kind === kind)!.weight;
}

/**
 * One priced conclusion offered to a composition: a predication
 * (subject + derived quality) with the derivation it rests on,
 * its support, the weakest tier on its path, and the element its
 * derivation stands on (for relation order). Composition is over
 * ONE subject — S13's shape, a set of predications under the one
 * subject over a shared derivation family; conclusions over
 * differing subjects are separate compositions, and offering
 * them together is an unrealisable outcome, named as such.
 */
export interface PricedConclusion {
  subject: PredicationSubject;
  qualityLemma: string;
  /** The element the conclusion's derivation stands on. */
  element: Element;
  derivationPath: string;
  support: number;
  weakestTier: Tier;
  degree?: DegreeGrade;
}

export interface ComposedMember {
  qualityLemma: string;
  level: StrengthLevel;
  pricing: PricingRecord;
  derivationPath: string;
  /** The member's relation to the newest state (the kind whose
   *  weight relation order used; "unrelated" when no earlier
   *  state stood in the record). */
  relation: RelationKind;
}

export interface DroppedConclusion {
  qualityLemma: string;
  pricing: PricingRecord;
  /** The drop's ground, with its numbers — for the trace (§6). */
  ground: string;
}

/**
 * A member held back by the disposition's length behaviour
 * (R4, §9.1(d)): grounded and priced above the floor, but not
 * spoken under a lead-only composition. Held is not dropped:
 * the member's price stands, and the record names the
 * selection that held it.
 */
export interface HeldConclusion {
  qualityLemma: string;
  pricing: PricingRecord;
  /** The selection's ground — for the trace (§9.1's observable). */
  ground: string;
}

export type CompositionOutcome =
  | {
      kind: "graph";
      sentence: string;
      graph: ParsedSentence;
      activeOrder: CompositionOrder;
      /** The above-floor members' quality lemmas, in support order. */
      supportOrder: string[];
      /** The above-floor members' quality lemmas, in relation order. */
      relationOrder: string[];
      /** The members as spoken (active order), each with its price. */
      members: ComposedMember[];
      /** Members priced below the floor: dropped, recorded (§2.2). */
      dropped: DroppedConclusion[];
      /** Members held by the disposition's length behaviour
       *  (R4): grounded, priced, not spoken. Empty unless a
       *  lead-only composition held any. */
      held: HeldConclusion[];
      /** R4: the disposition bias records this outcome carries
       *  (threshold, arbitration, length), when any applied. */
      bias?: BiasRecord[];
    }
  | {
      kind: "declined";
      /** The decline's ground: every member's shortfall (§6). */
      ground: string;
      activeOrder: CompositionOrder;
      supportOrder: string[];
      relationOrder: string[];
      dropped: DroppedConclusion[];
    }
  | {
      kind: "unrealisable";
      reason: string;
      activeOrder: CompositionOrder;
    };

/**
 * Compose several priced conclusions over one subject into ONE
 * reply graph (§7.1, §8.7 S13). Pure, like planPredication.
 *
 * Pricing is per conclusion (§9.2, computed through the
 * disposition bias mechanism since R4 — the threshold channel
 * may move the high/middling boundary within its band; the
 * ceilings and the floor never move): a member below the floor
 * is dropped from the composition with the drop recorded — it
 * neither silences nor drags down the others (§2.2's arithmetic
 * is per derivation); if every member is below the floor, the
 * composition is the decline, its ground naming each shortfall.
 * Each spoken member keeps its own priced level in the graph —
 * its own qualification states on its own predication
 * (QUALIFICATION_BY_LEVEL) — never flattened to the set's
 * strongest or weakest. R4's other channels act here too:
 * arbitration re-ranks both orderings inside their comparable
 * groups, and a lead-only disposition speaks the lead member
 * and holds the rest, recorded (disposition.ts).
 *
 * The graph: the shared subject node once; one predication per
 * member, in the active order; consecutive predications joined
 * by a 'links' edge whose marker is "and" — the graph's existing
 * clause-joining relation and marker device, the same machinery
 * R1.5's causal form uses with "because". The generator composes
 * the chain as coordinated clauses. No causal subordinate is
 * built here: the causal form remains the single-conclusion
 * transform's (§7.2), and composing subordinates for a set is
 * not part of this slice (recorded in T-R2).
 */
export function planComposition(input: {
  conclusions: PricedConclusion[];
  /** The element of the newest state from an earlier turn, when
   *  the record holds one — relation order's reference point. */
  newestStateElement?: Element;
  /** The active order; defaults to DEFAULT_ORDER (support). */
  order?: CompositionOrder;
  /** The session's disposition composition (R4): its bias
   *  applies to the members' pricing (threshold channel), to
   *  both orderings (arbitration channel) and to how many
   *  members are spoken (length channel) — §9.1(a)(c)(d).
   *  Absent or neutral: the pre-R4 composition, no records. */
  disposition?: Composition;
  /** R5 (§8.7 S3): the cohesion marker the composition's lead
   *  predication has EARNED against the session record
   *  (COHESION_MARKERS), detected by the caller — a 'links'
   *  edge from the shared subject node to the lead predicate
   *  root. Absent: no relation held, no marker. */
  cohesionMarker?: string;
}): CompositionOutcome {
  const activeOrder = input.order ?? DEFAULT_ORDER;
  const biasRecords: BiasRecord[] = [];

  const subjects = new Set(input.conclusions.map((c) => c.subject.lemma));
  if (subjects.size > 1) {
    return {
      kind: "unrealisable",
      activeOrder,
      reason:
        `composition is over one subject (§8.7 S13) — the conclusions offered stand over ` +
        `${[...subjects].join(", ")}, which are separate compositions, not one set`,
    };
  }

  interface PricedMember extends ComposedMember {
    conclusion: PricedConclusion;
    index: number;
  }
  const spoken: PricedMember[] = [];
  const dropped: DroppedConclusion[] = [];
  input.conclusions.forEach((conclusion, index) => {
    // R4 (§9.1(c)): each member's price is computed through
    // the disposition bias mechanism, as in planPredication.
    const { priced, record } = priceWithBoundary(conclusion.weakestTier, conclusion.support, input.disposition);
    if (record) {
      record.context = `the pricing of the member '${conclusion.qualityLemma}'`;
      biasRecords.push(record);
    }
    const pricing: PricingRecord = {
      weakestTier: conclusion.weakestTier,
      support: conclusion.support,
      ...priced,
    };
    if (pricing.declined) {
      dropped.push({
        qualityLemma: conclusion.qualityLemma,
        pricing,
        ground:
          `support ${conclusion.support} is below the floor ${SUPPORT_FLOOR} — ` +
          `the derivation from ${conclusion.subject.lemma} to ${conclusion.qualityLemma} is too weak to speak from (§9.2)`,
      });
      return;
    }
    spoken.push({
      conclusion,
      index,
      qualityLemma: conclusion.qualityLemma,
      level: pricing.level,
      pricing,
      derivationPath: conclusion.derivationPath,
      relation: input.newestStateElement ? relationKindTo(input.newestStateElement, conclusion.element) : "unrelated",
    });
  });

  // Both orderings, over the spoken members. Support order:
  // support descending, ties in enumeration order. Relation
  // order: relation weight descending (RELATION_PRECEDENCE),
  // then support descending, then enumeration order.
  const bySupportStanding = [...spoken].sort((a, b) => b.conclusion.support - a.conclusion.support || a.index - b.index);
  const byRelationStanding = [...spoken].sort(
    (a, b) =>
      relationWeight(b.relation) - relationWeight(a.relation) ||
      b.conclusion.support - a.conclusion.support ||
      a.index - b.index,
  );
  // R4 (§9.1(a)): the disposition's arbitration re-ranks each
  // ordering inside its comparable groups — support order
  // groups by support proximity alone; relation order groups
  // by equal relation weight and support proximity. No bias
  // in force: the standing orders pass through untouched.
  const arbitrationOf = (context: string, groupKeyOf?: (m: PricedMember) => string | number) => ({
    composition: input.disposition,
    supportOf: (m: PricedMember) => m.conclusion.support,
    elementOf: (m: PricedMember) => m.conclusion.element,
    labelOf: (m: PricedMember) => m.qualityLemma,
    ...(groupKeyOf ? { groupKeyOf } : {}),
    context,
  });
  const supportArb = arbitrateOrder(bySupportStanding, arbitrationOf("support order"));
  if (supportArb.record) biasRecords.push(supportArb.record);
  const bySupport = supportArb.ordered;
  const relationArb = arbitrateOrder(byRelationStanding, arbitrationOf("relation order", (m) => relationWeight(m.relation)));
  if (relationArb.record) biasRecords.push(relationArb.record);
  const byRelation = relationArb.ordered;
  const supportOrder = bySupport.map((m) => m.qualityLemma);
  const relationOrder = byRelation.map((m) => m.qualityLemma);

  if (!spoken.length) {
    return {
      kind: "declined",
      activeOrder,
      supportOrder,
      relationOrder,
      dropped,
      ground: dropped.length
        ? `every conclusion offered is below the floor: ${dropped.map((d) => d.ground).join("; ")}`
        : "no conclusions were offered to compose",
    };
  }

  const ordered = activeOrder === "support" ? bySupport : byRelation;

  // R4 (§9.1(d)): the disposition's length behaviour selects
  // how much of the ordered set is spoken — full set, or the
  // lead member with the rest held and recorded. The held
  // members keep their prices; the orderings above still
  // name the full above-floor set.
  const lengthApplied = applyLength(ordered, input.disposition, (m) => m.qualityLemma);
  if (lengthApplied.record) biasRecords.push(lengthApplied.record);
  const held: HeldConclusion[] = lengthApplied.held.map((m) => ({
    qualityLemma: m.qualityLemma,
    pricing: m.pricing,
    ground:
      `held by the disposition's length behaviour (lead-only, predominant ${input.disposition!.predominant}): ` +
      `the lead member of the set is spoken and this grounded member — priced ${m.pricing.level} at support ` +
      `${m.pricing.support} — is held, recorded rather than dropped (§9.1(d))`,
  }));
  const toSpeak = lengthApplied.spoken;

  /* The reply graph: the shared subject once, one predication
   * per member in the active order, each carrying its own
   * priced qualification and degree (the same node shapes
   * planPredication builds), consecutive predications joined
   * by 'links' edges marked "and". */
  const subjectInput = toSpeak[0].conclusion.subject;
  const subject: MeaningNode = {
    id: "reply-subject",
    lemma: subjectInput.lemma,
    form: subjectInput.form,
    syntacticElement: "Earth",
    ...(subjectInput.det ? { det: subjectInput.det } : {}),
  };
  const nodes: MeaningNode[] = [subject];
  const edges: MeaningEdge[] = [];
  let previousQualityId: string | undefined;
  toSpeak.forEach((member, position) => {
    const suffix = position === 0 ? "" : `-${position + 1}`;
    const qualityId = `reply-predicate${suffix}`;
    const conclusion = member.conclusion;
    const qualification = QUALIFICATION_BY_LEVEL[member.level];
    const qualityEntry = EN_LEXICON[conclusion.qualityLemma];
    const quality: MeaningNode = {
      id: qualityId,
      lemma: conclusion.qualityLemma,
      form: conclusion.qualityLemma,
      syntacticElement: "Fire",
      role: "predicate",
      ...(qualityEntry && "semanticElement" in qualityEntry && qualityEntry.semanticElement
        ? { semanticElement: qualityEntry.semanticElement }
        : {}),
      states: {
        copulaTense: "present",
        mood: "indicative",
        subjectPerson: conclusion.subject.person ?? "3sg",
        ...(qualification?.modal ? { modal: qualification.modal } : {}),
      },
    };
    nodes.push(quality);
    edges.push({ from: subject.id, to: quality.id, relation: "predicate", cycle: cycleOf("Earth", "Fire") });
    const modulator = (id: string, form: string): void => {
      nodes.push({ id, lemma: form, form, syntacticElement: "Water" });
      edges.push({ from: id, to: qualityId, relation: "modulates", cycle: cycleOf("Water", "Fire") });
    };
    if (qualification?.hedge) modulator(`reply-hedge${suffix}`, qualification.hedge);
    if (conclusion.degree) modulator(`reply-degree${suffix}`, DEGREE_FORM[conclusion.degree]);
    if (previousQualityId) {
      edges.push({ from: previousQualityId, to: qualityId, relation: "links", cycle: cycleOf("Fire", "Fire"), marker: "and" });
    }
    previousQualityId = qualityId;
  });

  /* R5 (§8.7 S3): an earned cohesion marker joins the lead
   * predication to the session record — a 'links' edge from
   * the shared subject node to the lead predicate root. */
  if (input.cohesionMarker) {
    edges.push({ from: subject.id, to: "reply-predicate", relation: "links", cycle: cycleOf("Earth", "Fire"), marker: input.cohesionMarker });
  }

  const graph: ParsedSentence = {
    meaning: { nodes, edges, rootId: "reply-predicate", entryElement: "Fire" },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
  };
  return {
    kind: "graph",
    sentence: generate(graph),
    graph,
    activeOrder,
    supportOrder,
    relationOrder,
    members: toSpeak.map(({ conclusion: _conclusion, index: _index, ...member }) => member),
    dropped,
    held,
    ...(biasRecords.length ? { bias: biasRecords } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Correction (slice R5: §8.7 S12 — the acknowledgement is the delta) */
/* ------------------------------------------------------------------ */

export interface PlanCorrectionInput {
  /** The person's own subject material (form/det as parsed) —
   *  the acknowledgement reuses their node, as every planner
   *  construction does (§8.7 S14). */
  subject: PredicationSubject;
  /** The state the correction replaced (the delta's left side). */
  replaced: { lemma: string; negated?: boolean };
  /** The state that now stands (the delta's right side). */
  replacing: { lemma: string; negated?: boolean };
  /** The correction turn's copula tense, as its parse recorded it. */
  copulaTense?: "present" | "past";
}

/**
 * Build the correction reply graph from a supersession delta
 * (§8.7 S12): the acknowledgement's content IS the delta, so
 * the graph is built from the delta record's fields and the
 * person's subject material — nothing else feeds it. Two
 * predications over the one subject: the replaced state
 * struck (its lemma predicated under negation — the only
 * form the graph has for "that no longer stands") and the
 * replacing state predicated as it stands, the two joined by
 * a 'links' edge marked "but" ("The soup is not cold, but it
 * is hot."). When the two predications coincide — the
 * polarity case, where striking the replaced state and
 * stating the replacing one are the same predication — the
 * graph is that single predication ("You are not furious.").
 *
 * No pricing is applied: at the correction sites the parser
 * supports, no derivation backs the corrected state, so the
 * predication is the record's own — the person's corrected
 * assertion restated, not a conclusion of the net's (the
 * scoping is recorded in T-R5 §7).
 */
export function planCorrection(input: PlanCorrectionInput): { sentence: string; graph: ParsedSentence } {
  const subject: MeaningNode = {
    id: "reply-subject",
    lemma: input.subject.lemma,
    form: input.subject.form,
    syntacticElement: "Earth",
    ...(input.subject.det ? { det: input.subject.det } : {}),
  };
  const predication = (id: string, lemma: string, negated: boolean): MeaningNode => {
    const entry = EN_LEXICON[lemma];
    return {
      id,
      lemma,
      form: lemma,
      syntacticElement: "Fire",
      role: "predicate",
      ...(entry && "semanticElement" in entry && entry.semanticElement ? { semanticElement: entry.semanticElement } : {}),
      states: {
        copulaTense: input.copulaTense ?? "present",
        mood: "indicative",
        subjectPerson: input.subject.person ?? "3sg",
        ...(negated ? { negated: true } : {}),
      },
    };
  };
  const strike = { lemma: input.replaced.lemma, negated: true };
  const main = { lemma: input.replacing.lemma, negated: !!input.replacing.negated };
  const coincide = strike.lemma === main.lemma && strike.negated === main.negated;

  const nodes: MeaningNode[] = [subject];
  const edges: MeaningEdge[] = [];
  if (coincide) {
    const only = predication("reply-predicate", main.lemma, main.negated);
    nodes.push(only);
    edges.push({ from: subject.id, to: only.id, relation: "predicate", cycle: cycleOf("Earth", "Fire") });
    const graph: ParsedSentence = {
      meaning: { nodes, edges, rootId: only.id, entryElement: "Fire" },
      connective: { language: "en", tokens: [], next: [], spans: [] },
      realizes: {},
      scopeAttachments: [],
    };
    return { sentence: generate(graph), graph };
  }
  const strikeNode = predication("reply-predicate", strike.lemma, strike.negated);
  const mainNode = predication("reply-predicate-2", main.lemma, main.negated);
  nodes.push(strikeNode, mainNode);
  edges.push({ from: subject.id, to: strikeNode.id, relation: "predicate", cycle: cycleOf("Earth", "Fire") });
  edges.push({ from: subject.id, to: mainNode.id, relation: "predicate", cycle: cycleOf("Earth", "Fire") });
  edges.push({ from: strikeNode.id, to: mainNode.id, relation: "links", cycle: cycleOf("Fire", "Fire"), marker: "but" });
  const graph: ParsedSentence = {
    meaning: { nodes, edges, rootId: strikeNode.id, entryElement: "Fire" },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
  };
  return { sentence: generate(graph), graph };
}

/* ------------------------------------------------------------------ */
/* Record predication (slice R7.5: §11.4 — the record answers)        */
/* ------------------------------------------------------------------ */

export interface PlanRecordPredicationInput {
  /** The person's own subject material (form/det as parsed) —
   *  the record answer reuses their node, as every planner
   *  construction does (§8.7 S14). */
  subject: PredicationSubject;
  /** The standing state's lemma, predicated as it stands. */
  stateLemma: string;
  /** The standing state's negated flag, as recorded. */
  negated?: boolean;
  /** R5 (§8.7 S3): the cohesion marker this predication has
   *  EARNED against the session record (COHESION_MARKERS),
   *  detected by the caller — a 'links' edge from the subject
   *  node to the predicate root. Absent: no relation held. */
  cohesionMarker?: string;
}

/**
 * Build the reply graph for a RECORD answer (§11.4's second
 * clause, T-R7.5): the question site found a standing state
 * occupying the asked quality's slot, and the answer is that
 * state, predicated as it stands — its lemma, its negated
 * flag — over the person's own subject material. The graph
 * is the predication construction of planPredication, in its
 * bare form.
 *
 * No pricing is applied, deliberately: no derivation backs
 * this answer, so there is no tier and no support to price
 * it with, and none is fabricated. The reply speaks the
 * person's own standing state plainly, as the record's echo
 * of what they established — never with a modal borrowed
 * from the table's price for the asked quality (the failure
 * this slice closes spoke "may" from exactly that price).
 */
export function planRecordPredication(input: PlanRecordPredicationInput): { sentence: string; graph: ParsedSentence } {
  const subject: MeaningNode = {
    id: "reply-subject",
    lemma: input.subject.lemma,
    form: input.subject.form,
    syntacticElement: "Earth",
    ...(input.subject.det ? { det: input.subject.det } : {}),
  };
  const entry = EN_LEXICON[input.stateLemma];
  const quality: MeaningNode = {
    id: "reply-predicate",
    lemma: input.stateLemma,
    form: input.stateLemma,
    syntacticElement: "Fire",
    role: "predicate",
    ...(entry && "semanticElement" in entry && entry.semanticElement ? { semanticElement: entry.semanticElement } : {}),
    states: {
      copulaTense: "present",
      mood: "indicative",
      subjectPerson: input.subject.person ?? "3sg",
      ...(input.negated ? { negated: true } : {}),
    },
  };
  const nodes: MeaningNode[] = [subject, quality];
  const edges: MeaningEdge[] = [
    { from: subject.id, to: quality.id, relation: "predicate", cycle: cycleOf("Earth", "Fire") },
  ];
  if (input.cohesionMarker) {
    edges.push({ from: subject.id, to: quality.id, relation: "links", cycle: cycleOf("Earth", "Fire"), marker: input.cohesionMarker });
  }
  const graph: ParsedSentence = {
    meaning: { nodes, edges, rootId: quality.id, entryElement: "Fire" },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
  };
  return { sentence: generate(graph), graph };
}

/* ------------------------------------------------------------------ */
/* Questions (slice R3: §2.3's transform run on a gap)                */
/* ------------------------------------------------------------------ */

/**
 * The question word each role is asked with, as data: the gap's
 * role determines the questioned element's surface form, the
 * same way the parser's wh-machinery reads it (parse.ts's
 * whExpectedType is the same Part D table from the other side).
 * A role with no entry here cannot be asked about in English
 * by this transform — the outcome is unrealisable, named,
 * never improvised.
 */
export const ROLE_QUESTION_WORD: Record<string, string> = {
  agent: "who",
  recipient: "who",
  theme: "what",
  patient: "what",
  location: "where",
  goal: "where",
  time: "when",
};

/** Expected answer type by question word (Part D D1) — the
 *  query record's data, mirroring parse.ts's whExpectedType. */
const EXPECTED_TYPE_BY_QUESTION_WORD: Record<string, string> = {
  who: "person",
  where: "location",
  when: "time",
  which: "selection",
  why: "reason",
  what: "entity",
};

export type QuestionOutcome =
  | {
      kind: "graph";
      /** The generated surface text. */
      sentence: string;
      /** The question meaning graph the sentence was generated from. */
      graph: ParsedSentence;
    }
  | {
      kind: "unrealisable";
      /** Why no honest question graph exists — for the trace. */
      reason: string;
    };

/** One filled role of the event the question is built over, in
 *  the person's own node material (form/det/prep as parsed). */
export interface QuestionFilledRole {
  relation: string;
  lemma: string;
  form: string;
  det?: string;
  prep?: string;
}

export interface PlanRoleQuestionInput {
  /** The event verb's lexicon entry (its frame orders the args). */
  verb: VerbEntry;
  /** The verb's form as the person said it ("gave"). */
  verbForm: string;
  /** The person's clause tense, as the parse recorded it. */
  tense?: "present" | "past";
  /** The agent as the question addresses them (the speaker: "you"). */
  agent: { lemma: string; form: string };
  /** The event's filled roles, in the person's own material. */
  filled: QuestionFilledRole[];
  /** The unfilled required role the question asks after — the gap. */
  gapRole: string;
}

/**
 * Build the question graph for a valency gap (§2.3, first
 * shape): the person's own event graph, with the missing
 * required role's slot filled by the questioned element — the
 * exact representation the parser builds for a wh-question
 * (the question word IS an ordinary slot-filler carrying
 * interrogative force; the verb root carries the interrogative
 * mood). The generator's wh-realisation then asks it: the
 * filled roles ride along, the gap is what is asked. No new
 * vocabulary: the nodes, the role relations and the query
 * record are the parser's own.
 */
export function planRoleQuestion(input: PlanRoleQuestionInput): QuestionOutcome {
  const questionWord = ROLE_QUESTION_WORD[input.gapRole];
  if (!questionWord) {
    return {
      kind: "unrealisable",
      reason:
        `no question word is recorded for the role '${input.gapRole}' (ROLE_QUESTION_WORD) — ` +
        `the transform cannot ask after that role honestly`,
    };
  }
  /* The question's subject is the agent as addressed ("you"),
   * so the question root carries the agent's person, and the
   * do-support carrier the surface will need is recorded as
   * the clause's aux — the same scaffolding the parser records
   * from a real question's surface (parse.ts's wh-branch): past
   * takes "did"; present takes "does" for a third-singular
   * subject and "do" otherwise. */
  const agentEntry = EN_LEXICON[input.agent.lemma];
  const agentPerson = agentEntry && "person" in agentEntry ? agentEntry.person : undefined;
  const tense = input.tense ?? "present";
  const aux = tense === "past" ? "did" : agentPerson === "3sg" ? "does" : "do";
  const root: MeaningNode = {
    id: "question-verb",
    lemma: input.verb.lemma,
    form: input.verbForm,
    syntacticElement: "Wood",
    role: "verb",
    states: {
      mood: "interrogative",
      tense,
      voice: "active",
      aux,
      ...(agentPerson ? { subjectPerson: agentPerson } : {}),
    },
  };
  const nodes: MeaningNode[] = [
    root,
    { id: "question-agent", lemma: input.agent.lemma, form: input.agent.form, syntacticElement: "Earth", role: "agent" },
  ];
  const edges: MeaningEdge[] = [{ from: root.id, to: "question-agent", relation: "agent", cycle: cycleOf("Wood", "Earth") }];
  for (const f of input.filled) {
    const id = `question-${f.relation}`;
    nodes.push({
      id,
      lemma: f.lemma,
      form: f.form,
      syntacticElement: "Earth",
      role: f.relation,
      ...(f.det ? { det: f.det } : {}),
      ...(f.prep ? { prep: f.prep } : {}),
    });
    edges.push({ from: root.id, to: id, relation: f.relation as MeaningEdge["relation"], cycle: cycleOf("Wood", "Earth") });
  }
  nodes.push({
    id: "question-gap",
    lemma: questionWord,
    form: questionWord,
    syntacticElement: "Earth",
    role: input.gapRole,
    questionWord: true,
  });
  edges.push({ from: root.id, to: "question-gap", relation: input.gapRole as MeaningEdge["relation"], cycle: cycleOf("Wood", "Earth") });
  const graph: ParsedSentence = {
    meaning: { nodes, edges, rootId: root.id, entryElement: "Wood" },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
    query: { relation: input.gapRole, expectedType: EXPECTED_TYPE_BY_QUESTION_WORD[questionWord] ?? "entity" },
  };
  return { kind: "graph", sentence: generate(graph), graph };
}

export interface PlanClarificationInput {
  /** The ambiguous entity, in the person's own node material. */
  subject: { lemma: string; form: string; det?: string };
  /** The two rival derivations' contents in plain words — the
   *  anchor concept each derivation lands on — in offer order. */
  alternatives: [string, string];
}

/**
 * Build the question graph for a rival split (§2.3, second
 * shape): the ambiguous entity predicated as each of its two
 * rival contents in turn, the two predications joined by a
 * 'links' edge marked "or" — the graph's existing clause-joining
 * relation, the marker field carrying the disjunction as it
 * carries "and" (R2) and "because" (R1.5). The root carries the
 * interrogative mood; the generator's disjunctive realisation
 * asks which of the two the person means. The missing piece of
 * this question graph is exactly the gap: which derivation is
 * the person's.
 */
export function planClarification(input: PlanClarificationInput): QuestionOutcome {
  const subject: MeaningNode = {
    id: "clarify-subject",
    lemma: input.subject.lemma,
    form: input.subject.form,
    syntacticElement: "Earth",
    role: "subject",
    ...(input.subject.det ? { det: input.subject.det } : {}),
  };
  const altNode = (id: string, anchor: string): MeaningNode => ({
    id,
    lemma: anchor,
    form: anchor,
    syntacticElement: "Earth",
    role: "predicate",
  });
  const alt1 = altNode("clarify-alt-1", input.alternatives[0]);
  const alt2 = altNode("clarify-alt-2", input.alternatives[1]);
  alt1.states = { mood: "interrogative", copulaTense: "present", subjectPerson: "3sg" };
  const graph: ParsedSentence = {
    meaning: {
      nodes: [subject, alt1, alt2],
      edges: [
        { from: subject.id, to: alt1.id, relation: "predicated-as", cycle: cycleOf("Earth", "Earth") },
        { from: subject.id, to: alt2.id, relation: "predicated-as", cycle: cycleOf("Earth", "Earth") },
        { from: alt1.id, to: alt2.id, relation: "links", cycle: cycleOf("Earth", "Earth"), marker: "or" },
      ],
      rootId: alt1.id,
      entryElement: "Earth",
    },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
    query: { relation: "predicated-as", expectedType: "selection" },
  };
  return { kind: "graph", sentence: generate(graph), graph };
}

/**
 * The reply graph as the trace carries it (§6: the trace names
 * the reply graph built from the derivation): a compact
 * serialisation of nodes, edges and root — enough to check
 * what was actually generated from.
 */
export function serialiseReplyGraph(p: ParsedSentence): string {
  return JSON.stringify({
    rootId: p.meaning.rootId,
    nodes: p.meaning.nodes.map((n) => ({
      id: n.id,
      lemma: n.lemma,
      form: n.form,
      element: n.syntacticElement,
      ...(n.role ? { role: n.role } : {}),
      ...(n.det ? { det: n.det } : {}),
      ...(n.questionWord ? { questionWord: true } : {}),
      ...(n.states ? { states: n.states } : {}),
    })),
    edges: p.meaning.edges.map((e) => ({
      from: e.from,
      to: e.to,
      relation: e.relation,
      ...(e.marker ? { marker: e.marker } : {}),
    })),
  });
}
