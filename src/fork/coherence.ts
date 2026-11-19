/**
 * coherence.ts — CoherenceAnalysis, inbound (the Coherence unit,
 * ai-system/coherence; the owner's note, docs/coherence-note.md).
 *
 * The analysis reads a freshly assessed semantic object against
 * the stream and the situation, and writes its reading onto the
 * object's trail: a FIT where the object belongs, a DEMAND where
 * something does not make sense yet — the demand being the
 * system's standing requirement that an utterance fit what is
 * known: who is talking, what information is missing, whether
 * what arrives fits what has been said.
 *
 * Slice 2 (the first reader): two readings, the two designed
 * scenarios.
 *  - A greeting: it fits when it opens the stream; a greeting
 *    after a greeting is an opener out of place (annotated; the
 *    reply that answers the demand is later work).
 *  - A feeling stated as the FIRST utterance, by a speaker the
 *    system does not know, with its cause unexpressed: the
 *    analysis adds the unexpressed-cause hole to the object and
 *    raises the demand the Planner answers — ask after the
 *    cause. Mid-stream feeling-statements are not annotated
 *    here: the stream may already hold the cause, and judging
 *    that is the fuller build.
 *
 * The analysis runs BEFORE the object is stored, so the session
 * it reads is the prior stream.
 */
import { CLASSIFICATIONS, lookupClassification } from "./classify";
import { CONTROLS, GENERATES, type Element } from "./sentence";
import { isNeutralComposition } from "./composition";
import type { Session } from "./session";
import { SENSE_CHANNELS, type SemanticObject } from "./semantic-object";
import { crossChannelImplications } from "./sense-unit";
import { informationOf, type Need } from "./info-object";

const UNIT = "coherence/coherence-analysis";

/** How two phases stand to one another, in the cycles' terms. */
export function relationBetween(a: Element, b: Element): string {
  if (a === b) return "resonance (the same phase)";
  if (GENERATES[a] === b) return `generating (${a} feeds ${b})`;
  if (GENERATES[b] === a) return `generated-by (${b} feeds ${a})`;
  if (CONTROLS[a] === b) return `controlling (${a} restrains ${b})`;
  if (CONTROLS[b] === a) return `controlled-by (${b} restrains ${a})`;
  return "no direct cycle relation";
}

/**
 * The composition comparison (slice 3): with the object's
 * aspects classified and rolled up (assess.ts), coherence
 * becomes partly a computable relation among three compositions
 * — the object's, the situation's (the awareness frame's season,
 * when the shell supplied one), and the disposition's (when it
 * is not the neutral). Each comparison is annotated on the
 * object's trail with the relation the OKU's correspondence
 * graph gives between the two predominants. No frame and a
 * neutral disposition → nothing to compare, nothing annotated.
 */
/**
 * The outbound analysis (slice 4): a reply object is judged
 * BEFORE its wording is spoken. Two checks in v1:
 *  - grounding — every entity the reply carries is established:
 *    in the record, or introduced by the object being answered
 *    (the speaker and the self are always grounded). A reference
 *    from nowhere draws the ungrounded-reference demand. The
 *    demand annotates; it does not block — what to do instead
 *    of speaking is a move the Planner does not have yet.
 *  - composition — the reply's own predominant against the
 *    situation's, annotated with the graph's relation, as
 *    inbound.
 */
export function analyseOutbound(reply: SemanticObject, inbound: SemanticObject | undefined, session: Session): void {
  const grounded = new Set<string>(["you", "i"]);
  for (const e of session.entities) grounded.add(e.lemma.toLowerCase());
  if (inbound) for (const n of inbound.content.meaning.nodes) grounded.add(n.lemma.toLowerCase());
  // Question words are not references: a "what" node is the
  // questioned slot itself, a hole the reply is asking to have
  // filled — exempt from the grounding demand.
  const ungrounded = reply.content.meaning.nodes.filter(
    (n) => n.syntacticElement === "Earth" && !n.questionWord && !grounded.has(n.lemma.toLowerCase()),
  );
  for (const n of ungrounded) {
    reply.trail.push({
      unit: UNIT,
      note: `demand (outbound): the reply refers to '${n.lemma}', which neither the record nor the answered object establishes`,
      data: { demand: "ungrounded-reference", lemma: n.lemma },
    });
  }
  if (!ungrounded.length) {
    reply.trail.push({
      unit: UNIT,
      note: "outbound fits: every reference in the reply is grounded in the record or the answered object",
      data: { fit: "outbound-grounding" },
    });
  }
  const season = session.frame?.season;
  if (reply.composition && season?.element) {
    reply.trail.push({
      unit: UNIT,
      note:
        `composition (outbound): the reply's predominant ${reply.composition.predominant} against the situation's ${season.element} ` +
        `— ${relationBetween(reply.composition.predominant, season.element)}`,
      data: { comparison: "reply-situation", relation: relationBetween(reply.composition.predominant, season.element), objectPredominant: reply.composition.predominant, otherPredominant: season.element },
    });
  }
}

/**
 * Coherence reads the senses face (2026-11-17, the
 * Senses-Scening build's first reader). Two annotation kinds,
 * both minimal and trail-only — no reply-behaviour change:
 *
 *  (a) A QUALITY QUESTION's questioned value belongs to a
 *  channel: "Is the table cold?" asks after a touch value
 *  (temperature). The annotation names the channel and the
 *  value, so downstream readers see WHICH sense is being asked
 *  about, not just that a quality is questioned.
 *  (b) DERIVED cross-channel implications: a sight-stated value
 *  with filed implications in the SenseUnit (overripe →
 *  smell/taste/touch) is annotated at tier "derived". These are
 *  annotations on the trail, explicitly NOT entries in the
 *  senses face — stated vs derived, kept apart.
 */
export function analyseSenses(object: SemanticObject): void {
  const face = object.senses;
  if (!face) return;
  if (object.act.kind === "question") {
    const rootId = object.content.meaning.rootId;
    const questioned = face.channels;
    for (const channel of SENSE_CHANNELS) {
      for (const entry of questioned[channel] ?? []) {
        // The questioned value is the entry the question's root
        // predicates; when the parse ties no entry to the root,
        // any entry in a one-entry face is the questioned one.
        const total = SENSE_CHANNELS.reduce((n, c) => n + (questioned[c]?.length ?? 0), 0);
        if (entry.nodeId === rootId || total === 1) {
          object.trail.push({
            unit: UNIT,
            note:
              `senses: the questioned value '${entry.value}' belongs to the ${channel} channel` +
              (entry.discrimination ? ` (${entry.discrimination})` : "") +
              " — the question asks after that sense",
            data: { senseChannel: channel, value: entry.value, discrimination: entry.discrimination },
          });
        }
      }
    }
  }
  for (const channel of SENSE_CHANNELS) {
    for (const entry of face.channels[channel] ?? []) {
      for (const impl of crossChannelImplications(entry.value)) {
        object.trail.push({
          unit: UNIT,
          note:
            `senses (derived): '${entry.value}' stated on ${channel} implies, on ${impl.channel}: ${impl.implication} — ` +
            "a derived-tier reading, not a stated entry",
          data: { derivedSense: impl.channel, fromValue: entry.value, fromChannel: channel, implication: impl.implication, tier: "derived" },
        });
      }
    }
  }
}

export function compareCompositions(object: SemanticObject, session: Session): void {
  const own = object.composition;
  if (!own) return;
  const season = session.frame?.season;
  if (season?.element) {
    object.trail.push({
      unit: UNIT,
      note:
        `composition: the object's predominant ${own.predominant} against the situation's ${season.element} ` +
        `(the ${season.name} season) — ${relationBetween(own.predominant, season.element)}`,
      data: { comparison: "object-situation", relation: relationBetween(own.predominant, season.element), objectPredominant: own.predominant, otherPredominant: season.element },
    });
  }
  if (!isNeutralComposition(session.disposition)) {
    const d = session.disposition.predominant;
    object.trail.push({
      unit: UNIT,
      note:
        `composition: the object's predominant ${own.predominant} against the disposition's ${d} — ${relationBetween(own.predominant, d)}`,
      data: { comparison: "object-disposition", relation: relationBetween(own.predominant, d), objectPredominant: own.predominant, otherPredominant: d },
    });
  }
}

/**
 * Coherence prices what SURVIVES the route (the envelope
 * build, 2026-11-17): a need on the object's envelope that no
 * unit discharged — an unanswered question, an unfilled
 * placement, an unreconciled quantity, an unmet situate need —
 * is marked SURVIVING and returned as the turn's outstanding
 * cost: data for the reply decision (the reply object's
 * envelope carries the list), and, when the turn declines,
 * the located decline itself — the decline is AT this need,
 * not vaguely at the turn. The pricing writes only the
 * envelope; the core is never touched (the wall).
 */
export function priceSurvivingNeeds(object: SemanticObject): Need[] {
  const info = informationOf(object);
  if (!info) return [];
  const survivors: Need[] = [];
  for (const need of info.envelope.needs) {
    if (need.status === "open") need.status = "surviving";
    if (need.status === "surviving") survivors.push(need);
  }
  return survivors;
}

/**
 * Coherence prices NormalcyAssessment's flags (the Normalcy
 * arc, 2026-11-17): each flag on the object's envelope is
 * priced BY KIND, at the standing this table files — the
 * system's own words for what the flag costs the reply
 * decision. The pricing NEVER reads the flag's evidence
 * values: a wordfreq Zipf or a Glasgow familiarity mean may
 * grade a flag's strength at the bridge, but no table number
 * reaches this table — kinds price, numbers don't (the
 * owner's governing principle: the tables supply knowledge
 * about the communication, not the system's values). The
 * priced flag is an internal reading: the turn loop records
 * it as an Awareness-side note on the trace, and no reply
 * speaks it.
 */
const NORMALCY_STANDINGS: Record<string, string> = {
  obviousness:
    "the question asks what the classification settles; the reply answers from the classification — the oddity is registered here and nowhere spoken",
  "self-redundancy":
    "the record already settles the question; the reply answers from the record — the oddity is registered here and nowhere spoken",
  gibberish:
    "no content arrived; the priced move is the repair question — the flag itself is never spoken as a verdict",
};

export function priceNormalcyFlags(object: SemanticObject): void {
  const info = informationOf(object);
  const flags = info?.envelope.normalcy;
  if (!info || !flags?.length) return;
  for (const flag of flags) {
    if (flag.priced) continue;
    flag.priced = { by: UNIT, standing: NORMALCY_STANDINGS[flag.kind] ?? "registered; nowhere spoken" };
    object.trail.push({
      unit: UNIT,
      note: `normalcy priced (${flag.kind}): ${flag.priced.standing}`,
      data: { normalcyPriced: flag.kind, ...(flag.strength ? { strength: flag.strength } : {}) },
    });
  }
}

export function analyseInbound(object: SemanticObject, session: Session): void {
  if (object.act.kind === "greeting") {
    const prior = session.objects.some((o) => o.act.kind === "greeting");
    if (prior) {
      object.trail.push({
        unit: UNIT,
        note: "demand: an opener out of place — a greeting already stands in this stream",
        data: { demand: "opener-out-of-place" },
      });
    } else {
      object.trail.push({
        unit: UNIT,
        note: "fits: an opening act in the opening slot",
        data: { fit: "opening" },
      });
    }
    return;
  }

  if (object.act.kind === "statement" && object.turn === 1) {
    const meaning = object.content.meaning;
    const root = meaning.nodes.find((n) => n.id === meaning.rootId);
    const subject = meaning.edges
      .filter((e) => e.relation === "predicate" && e.to === meaning.rootId)
      .map((e) => meaning.nodes.find((n) => n.id === e.from))
      .find((n) => n?.lemma === "i");
    if (root && subject) {
      const entry = lookupClassification(root.lemma, "emotion");
      // lookupClassification falls back to a concept's primary
      // entry when the aspect misses, so the emotion reading
      // stands only when the returned entry IS the emotion one.
      if (entry && entry.aspect === "emotion") {
        object.content.holes.push({ kind: "unexpressed-cause", of: root.lemma });
        object.trail.push({
          unit: UNIT,
          note:
            `demand: '${root.lemma}' is stated with its cause unexpressed, and the situation is unknown — ` +
            "first utterance, speaker unknown; what is missing is what the feeling is about",
          data: { demand: "unexpressed-cause", emotion: root.lemma, element: entry.element },
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* The premise degree (Social Unit S5, design §8; ruling 4a)          */
/* ------------------------------------------------------------------ */

export interface PremiseCheck {
  degree: "contradiction" | "absence";
  source?: "record" | "graph";
  establishedQuality?: string;
  establishedNegated?: boolean;
  ground?: string;
}

/**
 * The one rung of the degree scale this programme consumes
 * (design §8): is an utterance's presupposed predication —
 * subject + quality, as a why-question carries it —
 * CONTRADICTED by something established, or merely absent?
 * Coherence supplies the degree; the Social Unit owns the
 * response pattern (the stance), and the counter-fact comes
 * from the record or the graph, never from the unit.
 *
 * Contradiction is positive in both sources:
 *  - record: a standing state of the subject, from an earlier
 *    turn, occupying the asked quality's slot (the R5/R7.5
 *    aspect-slot discipline) with a different value, or the
 *    asked quality itself under negation;
 *  - graph: a path runs from the subject to another quality
 *    of the same aspect, over the same edge family the
 *    question-answerer itself uses — so what the check finds
 *    is exactly what the system would answer with on the
 *    corrected ground.
 * Anything else is absence: §7c's context-request territory,
 * not the stance's.
 *
 * The axes rule (property-axes slice, 2026-11-18; design
 * record Part H): a material carries one manifestation per
 * property axis, and no determination crosses axes. For a
 * TEMPERATURE predication the graph check therefore consults
 * temperature-axis determinations only. A HAS_ELEMENT edge is
 * a classification: it assigns the subject its element on the
 * edge's own aspect (food, grain, place…) — for a material,
 * its matter phase — and a path entering the element spine
 * through one emerges with the polarity's temperature quality
 * only by conflating that axis with temperature (soup
 * —HAS_ELEMENT {food}→ Water —POLARITY_OF→ Yin —HAS_QUALITY→
 * cold read a liquid food as a cold thing). Temperature
 * determinations in the graph run on correspondence
 * assignments — a season's or a time's ELEMENT_OF /
 * POLARITY_OF into the spine, where the temperature qualities
 * hang (winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin
 * —HAS_QUALITY→ cold; the classification record enters cold
 * as "winter's quality" under the temperature aspect) — so
 * the temperature check's edge family drops HAS_ELEMENT. A
 * material with no temperature determination is absent on
 * the temperature axis: its temperature tellings are recorded
 * as told, and its temperature questions decline as
 * don't-knows. The record check above is untouched: a
 * temperature asserted in the conversation is a temperature
 * determination, whatever the subject.
 */
export function premiseDegree(session: Session, subjectLemma: string, qualityLemma: string): PremiseCheck {
  const askedAspect = lookupClassification(qualityLemma)?.aspect;
  const occupiesSlot = (lemma: string): boolean =>
    askedAspect !== undefined ? lookupClassification(lemma)?.aspect === askedAspect : lemma === qualityLemma;
  const occupant = [...session.states]
    .reverse()
    .find((s) => s.holder === subjectLemma && s.turn < session.turnCount && occupiesSlot(s.lemma));
  if (occupant && (occupant.lemma !== qualityLemma || occupant.negated)) {
    return {
      degree: "contradiction",
      source: "record",
      establishedQuality: occupant.lemma,
      ...(occupant.negated && occupant.lemma === qualityLemma ? { establishedNegated: true } : {}),
      ground:
        `the record holds '${subjectLemma}' as '${occupant.lemma}'${occupant.negated && occupant.lemma === qualityLemma ? " under negation" : ""} ` +
        `from turn ${occupant.turn} — the asked quality's slot is occupied by another value`,
    };
  }
  if (askedAspect !== undefined) {
    const graph = session.graph;
    const subjectNode = graph.nodeByName(subjectLemma);
    if (subjectNode) {
      // The axes rule (see the note above): for temperature,
      // the path may not enter the spine through a
      // classification edge — HAS_ELEMENT is dropped from the
      // family, so only correspondence assignments
      // (ELEMENT_OF / POLARITY_OF) can ground the degree.
      const edgeTypes =
        askedAspect === "temperature"
          ? (["ELEMENT_OF", "POLARITY_OF", "HAS_QUALITY", "CORRESPONDS_TO"] as const)
          : (["ELEMENT_OF", "HAS_ELEMENT", "POLARITY_OF", "HAS_QUALITY", "CORRESPONDS_TO"] as const);
      const seen = new Set<string>();
      for (const entry of CLASSIFICATIONS) {
        if (entry.aspect !== askedAspect || entry.concept === qualityLemma || seen.has(entry.concept)) continue;
        seen.add(entry.concept);
        const target = graph.nodeByName(entry.concept);
        if (!target) continue;
        const path = graph.findPath(subjectNode.id, target.id, {
          edgeTypes: [...edgeTypes],
          confidenceThreshold: 0,
        });
        if (path) {
          return {
            degree: "contradiction",
            source: "graph",
            establishedQuality: entry.concept,
            ground: `a path runs from '${subjectLemma}' to '${entry.concept}' in the graph (${path.text}) — the aspect's established value is the other one`,
          };
        }
      }
    }
  }
  return { degree: "absence" };
}

/**
 * Whether the graph SUPPORTS a predication (S3, the S
 * programme, 2026-11-19): a path runs from the subject to
 * the quality itself, over the same edge family the premise
 * degree consults — the axes rule included, so for a
 * temperature predication a classification edge grounds no
 * support either (soup's road to cold through its matter
 * phase is not temperature support, exactly as it is not a
 * temperature contradiction). premiseDegree's absence
 * outcome does not distinguish this case — its search looks
 * for a RIVAL value and reports absence when none is found,
 * whether or not the asserted value itself is held — so the
 * absence stance reads support here: supported, no stance;
 * contradicted, the set-aside stance; neither, and the
 * claim checkable, the absence stance.
 */
/**
 * Whether a lemma names a term of the graph's correspondence
 * order (S3, the S programme, 2026-11-19): the node carries
 * an ELEMENT_OF or POLARITY_OF assignment of its own — it is
 * one of the standing terms (a season, a time, an element, a
 * polarity) whose correspondences the graph itself states.
 * A classified thing (soup, garden, tea) only RECEIVES an
 * assignment (HAS_ELEMENT): predications about it are
 * tellings about a thing in the world, the conversation's
 * ordinary business, and the absence stance is not for them.
 * A predication about a correspondence term is a claim
 * about the standing order the graph encodes — the claims
 * the stance family exists for (the season assertions are
 * its protected specimens).
 */
export function isCorrespondenceTerm(session: Session, lemma: string): boolean {
  const node = session.graph.nodeByName(lemma);
  if (!node) return false;
  return session.graph
    .outEdges(node.id)
    .some((e) => e.type === "ELEMENT_OF" || e.type === "POLARITY_OF");
}

export function premiseSupport(session: Session, subjectLemma: string, qualityLemma: string): boolean {
  const askedAspect = lookupClassification(qualityLemma)?.aspect;
  if (askedAspect === undefined) return false;
  const graph = session.graph;
  const subjectNode = graph.nodeByName(subjectLemma);
  const qualityNode = graph.nodeByName(qualityLemma);
  if (!subjectNode || !qualityNode) return false;
  const edgeTypes =
    askedAspect === "temperature"
      ? (["ELEMENT_OF", "POLARITY_OF", "HAS_QUALITY", "CORRESPONDS_TO"] as const)
      : (["ELEMENT_OF", "HAS_ELEMENT", "POLARITY_OF", "HAS_QUALITY", "CORRESPONDS_TO"] as const);
  return (
    graph.findPath(subjectNode.id, qualityNode.id, { edgeTypes: [...edgeTypes], confidenceThreshold: 0 }) !== null
  );
}
