/**
 * response-policy.ts — the Response Policy: the one place that
 * decides, for an assessed utterance, WHAT KIND of reply the
 * system makes (the volvelle build, slice 2, 2026-11-25).
 *
 * Before this unit the behaviours all existed — the Planner's
 * moves (plan.ts) answer, record, correct, clarify, decline,
 * receive and acknowledge — but the CHOICE among them was made
 * site by site inside the turn loop, fed by three obligation
 * systems (the Social Unit's demands, Coherence's needs, the
 * conversation's pending state) that no one place reconciled.
 * This unit is that place. It reads:
 *
 *  - the inbound object as SemanticAssessment assessed it —
 *    its kind and, since slice 1, its wider speech act;
 *  - the Social Unit's open demands (social.ts openDemands);
 *  - the conversation's pending state (a clarification or a
 *    stance-repair standing open);
 *  - the needs the caller prices as outstanding/surviving
 *    (info-object.ts Need, coherence.ts priceSurvivingNeeds);
 *  - where the caller names a predication to check, the
 *    record/graph's support for it (coherence.ts
 *    premiseDegree / premiseSupport).
 *
 * and returns ONE typed decision: the reply act and the ground
 * it stands on. The decision decides the KIND of reply and its
 * ground only — wording still comes from the Planner and the
 * Verbalizer exactly as before, and no reply is ever composed
 * here. Testimony discipline is preserved in the table's
 * shape: a proposition the record contradicts is corrected, a
 * proposition nothing settles is declined AT that gap (the
 * decline names it), and clarification is its own row, never
 * a decline in disguise.
 *
 * The turn loop records the decision on the inbound object's
 * trail and on the trace for every turn; the ritual branches
 * (greeting / farewell / thanks) execute through it, and the
 * directive row executes through it as the located decline at
 * capability (routed 2026-11-25, owner ruling). Rows the loop
 * does not yet route through the decision are record-only —
 * the decision stands as the stated choice the branch's own
 * machinery is measured against.
 */
import type { ObjectKind, SemanticObject, SpeechAct } from "./semantic-object";
import type { Session } from "./session";
import type { Need } from "./info-object";
import { openDemands } from "./social";
import { premiseDegree, premiseSupport } from "./coherence";

/** The reply acts the policy can decide. Each names a KIND of
 *  reply the Planner already knows how to make; the policy
 *  adds no move of its own. */
export type ReplyAct =
  | "answer"
  | "affirm"
  | "correct"
  | "clarify"
  | "decline"
  | "store-acknowledge"
  | "ritual-return"
  | "uptake-acknowledge"
  | "ask-after-gap"
  | "self-answer";

export interface PolicyBasis {
  kind: ObjectKind;
  speechAct?: SpeechAct;
  /** The Social Unit's demands standing open at decision time. */
  demands: string[];
  /** The conversation's pending kind, when one stands. */
  pending?: string;
  /** The outstanding/surviving needs the caller supplied. */
  needs: { kind: string; slot: string }[];
  /** The premise reading, when the caller named a predication:
   *  "supported" (a path/record stands for it), "contradiction"
   *  or "absence" (premiseDegree's scale), else "not-consulted". */
  premise: "supported" | "contradiction" | "absence" | "not-consulted";
  /** The unfilled required role the caller named, when one stands. */
  gap?: { verb: string; role: string };
}

export interface ResponsePolicyDecision {
  act: ReplyAct;
  /** Why this act, in the system's own terms — the located
   *  ground a decline or correction stands on, the demand a
   *  ritual return discharges, the hole an answer fills. */
  ground: string;
  basis: PolicyBasis;
}

export interface ResponsePolicyInput {
  object: SemanticObject;
  session: Session;
  /** Needs the caller has priced (outstanding or surviving). */
  needs?: Need[];
  /** A predication whose support decides the proposition and
   *  false-premise rows: the subject and quality lemmas, as
   *  premiseDegree/premiseSupport take them. */
  premise?: { subject: string; quality: string };
  /** An unfilled required role in the inbound utterance (a
   *  valency gap the turn loop's checker found). */
  gap?: { verb: string; role: string };
}

const RITUAL_DEMANDS = ["greeting-return", "farewell-return", "thanks-receipt", "offer-answer"];

export function decideResponse(input: ResponsePolicyInput): ResponsePolicyDecision {
  const { object, session } = input;
  const kind = object.act.kind;
  const speechAct = object.act.speechAct;
  const demands = openDemands(session);
  const pending = session.conversation.pending;
  const needs = (input.needs ?? []).map((n) => ({ kind: n.kind, slot: n.slot }));

  const basis: PolicyBasis = {
    kind,
    ...(speechAct ? { speechAct } : {}),
    demands,
    ...(pending ? { pending: pending.kind } : {}),
    needs,
    premise: "not-consulted",
    ...(input.gap ? { gap: input.gap } : {}),
  };
  const decide = (act: ReplyAct, ground: string): ResponsePolicyDecision => ({ act, ground, basis });

  /* A stance-repair standing open holds its corrected ground:
   * the premise was contradicted by what stands established,
   * the stance has been taken, and this turn is read against
   * it — the reply keeps the correction's ground rather than
   * re-deciding the turn from its surface. */
  if (pending?.kind === "stance-repair" && pending.premise) {
    return decide(
      "correct",
      `a stance-repair stands open: the premise '${pending.premise.subject} is ${pending.premise.quality}' ` +
        `is contradicted by what stands established (${pending.premise.established}); the reply holds that ground`,
    );
  }

  /* A clarification standing open makes this turn its fill (or
   * its failure): the reply continues the clarification
   * exchange. Clarification is a move of its own — asking what
   * was meant — and is never filed as a decline. */
  if (pending?.kind === "clarification") {
    return decide(
      "clarify",
      `a clarification stands open at ${pending.point ?? "the utterance"}; the reply continues that exchange ` +
        `(attempt ${pending.attempts} of 2) rather than treating the turn as new content or declining it`,
    );
  }

  /* The ritual rows: a greeting, a farewell, a thanks — and an
   * offer, which is received in kind — are answered by the
   * ritual return, discharging the Social Unit's demand. The
   * demand is the primary evidence; the kind alone decides the
   * row when no demand stands (the reading is the same). */
  const ritualDemand = demands.find((d) => RITUAL_DEMANDS.includes(d));
  if (ritualDemand || kind === "greeting" || kind === "leave-taking" || kind === "thanks" || speechAct === "offer") {
    const what =
      kind === "greeting"
        ? "a greeting"
        : kind === "leave-taking"
          ? "a leave-taking"
          : kind === "thanks"
            ? "thanks"
            : "an offer of help";
    return decide(
      "ritual-return",
      `${what} is answered in kind — the ritual return${ritualDemand ? `, discharging the Social Unit's ${ritualDemand} demand` : ""}; nothing propositional is recorded from it`,
    );
  }

  /* A question about the system itself is answered from the
   * Self tables, never derived and never declined: the
   * self-answer. The self-answer demand is the Social Unit's
   * raising of the same row. */
  if (kind === "self-query" || demands.includes("self-answer")) {
    return decide(
      "self-answer",
      "the question asks about the system itself; the reply answers from the Self tables (identity, capabilities, limits, place)",
    );
  }

  /* A concern — a feeling predicated of the speaker — is met
   * by the uptake acknowledgement: the feeling is received and
   * recorded as theirs, with its stance, before any content
   * the turn also carries is dealt with. */
  if (speechAct === "concern") {
    return decide(
      "uptake-acknowledge",
      "the utterance predicates a feeling of the speaker; the reply is the uptake acknowledgement — the feeling received and recorded as the speaker's, not answered as a question about the world",
    );
  }

  /* An unfilled required role, or a placement need surviving
   * unfilled, is asked after: the reply names the gap and asks
   * the one who can fill it. This is the ask-after-gap row —
   * a question the system asks, not a decline. */
  const placementNeed = needs.find((n) => n.kind === "placement");
  if (input.gap) {
    return decide(
      "ask-after-gap",
      `the verb '${input.gap.verb}' requires its ${input.gap.role}, and the turn does not fill it; the reply asks after that gap`,
    );
  }
  if (placementNeed) {
    return decide(
      "ask-after-gap",
      `a placement need stands unfilled (${placementNeed.slot}); the reply asks after the unplaced slot rather than proceeding as if it were placed`,
    );
  }

  /* The premise rows, where the caller named a predication to
   * check: a question carrying a contradicted premise is met
   * with the correction (the stance); a proposition — content
   * put forward for the record's verdict — is affirmed when
   * support stands, corrected when contradicted, and declined
   * at the located gap when nothing established settles it.
   * The decline is at the knowledge, not at the turn. */
  if (input.premise) {
    const { subject, quality } = input.premise;
    const degree = premiseDegree(session, subject, quality);
    if (degree.degree === "contradiction") {
      basis.premise = "contradiction";
      if (kind === "question" || kind === "reason-query" || speechAct === "proposition") {
        return decide(
          "correct",
          `the premise '${subject} is ${quality}' is contradicted by what stands established` +
            `${degree.establishedQuality ? ` (${subject} stands as ${degree.establishedQuality})` : ""}` +
            `${degree.source ? ` — from the ${degree.source}` : ""}; the reply corrects the premise rather than answering on it`,
        );
      }
    } else if (premiseSupport(session, subject, quality)) {
      basis.premise = "supported";
      if (speechAct === "proposition") {
        return decide(
          "affirm",
          `the proposition '${subject} is ${quality}' is supported by what stands in the graph; the reply affirms it`,
        );
      }
    } else {
      basis.premise = "absence";
      if (speechAct === "proposition") {
        return decide(
          "decline",
          `nothing established settles the proposition '${subject} is ${quality}' — the decline is located at that knowledge: ` +
            `the record and the graph hold no standing for it, so the system neither affirms nor denies it`,
        );
      }
    }
  }

  /* A directive asks the system to act in the world. The
   * system has no actuators — its acts are sayings — so the
   * honest reply is the located decline at capability. (A
   * telling-request is not this row: it solicits a saying,
   * and is answered below.) */
  if (speechAct === "directive") {
    return decide(
      "decline",
      "the directive asks for an act in the world; the system has no means of acting except in speech — the decline is located at capability, not at the turn's content",
    );
  }

  /* The question rows: a question (or a request for a saying)
   * is answered — the answerer composes from the record and
   * the graph, qualifies where its pricing qualifies, and
   * declines at its located gap where nothing stands. The
   * policy's decision is the routing: to the answerer. A
   * surviving answer need standing on the object routes the
   * same way, whatever dress the question arrived in. */
  if (kind === "question" || kind === "reason-query" || speechAct === "request" || needs.some((n) => n.kind === "answer")) {
    const hole = object.content.holes[0];
    return decide(
      "answer",
      hole
        ? `the question opens ${hole.kind === "questioned-slot" ? `its ${hole.relation} slot` : "whether its predication holds"}; the reply answers it from the record and the graph, or declines at the located gap where nothing stands`
        : "the turn solicits something not given; the reply answers it from the record and the graph, or declines at the located gap where nothing stands",
    );
  }

  /* The default: what the turn supplies is taken into the
   * record and acknowledged as standing there. A hedged saying
   * (the uncertainty act) is recorded as the speaker's
   * tentative saying — taken in, not banked as settled — and a
   * polar answer (affirmation / negation) is recorded as the
   * stance it performs, filling the conversation's open
   * question where one stands. */
  if (speechAct === "uncertainty") {
    return decide(
      "store-acknowledge",
      "the saying is hedged by its own frame; the reply records it as the speaker's tentative saying and acknowledges it as such — it is not banked as settled",
    );
  }
  if (speechAct === "affirmation" || speechAct === "negation") {
    return decide(
      "store-acknowledge",
      `the turn performs a ${speechAct}; the reply records it in the stream${pending?.kind === "question" ? ", filling the conversation's open question," : ""} and acknowledges it as standing`,
    );
  }
  return decide(
    "store-acknowledge",
    "the turn supplies content; the reply takes it into the record and acknowledges what stands there from it",
  );
}

/** Record a decision on the inbound object's trail: the
 *  object's own record of what was decided about it, in the
 *  trail's attributed-annotation form. */
export function recordDecision(object: SemanticObject, decision: ResponsePolicyDecision): void {
  object.trail.push({
    unit: "reasoning/response-policy",
    note: `response policy: ${decision.act} — ${decision.ground}`,
    data: { responsePolicy: { ...decision } },
  });
}

/** The decision recorded on an object, when one stands —
 *  read back by the reply authoring (reply.ts) so a reply
 *  object carries the decision it was authored under. */
export function recordedDecision(object: SemanticObject): ResponsePolicyDecision | undefined {
  for (let i = object.trail.length - 1; i >= 0; i--) {
    const data = object.trail[i].data as { responsePolicy?: ResponsePolicyDecision } | undefined;
    if (data?.responsePolicy) return data.responsePolicy;
  }
  return undefined;
}
