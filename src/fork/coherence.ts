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
import { lookupClassification } from "./classify";
import { CONTROLS, GENERATES, type Element } from "./sentence";
import { isNeutralComposition } from "./composition";
import type { Session } from "./session";
import { SENSE_CHANNELS, type SemanticObject } from "./semantic-object";
import { crossChannelImplications } from "./sense-unit";

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
