/**
 * info-object.ts — the information object: the ENVELOPE the
 * semantic object travels in (owner's adopted design, 2026-11-17:
 * "the ball that travels the system" is an information object —
 * an envelope carrying instructions and needs, wrapped around
 * the semantic object, which stays the unchanged descriptive
 * core inside it).
 *
 * The split, and the wall it keeps:
 *  - The CORE (semantic-object.ts) is descriptive: what the
 *    utterance is, its content, aspects, holes. Nothing
 *    imperative is ever written into it — no instruction, no
 *    need, no routing state. Stripping the envelope from an
 *    information object yields exactly the semantic object the
 *    pre-envelope pipeline produced (pinned by the wall gate,
 *    test/fork-info-object.test.ts).
 *  - The ENVELOPE is the routing slip: the act as assessed,
 *    provenance, the assessment's confidence, the route (the
 *    units that handled the object, in order), and the NEEDS —
 *    what this object still requires, each a named slot with
 *    what would discharge it, stated in the system's own terms.
 *    Units amend the envelope only.
 *
 * Needs are seeded ONLY from signals that already exist (no
 * new detectors):
 *  - a question act seeds an ANSWER need (its slot is the
 *    question's own hole), discharged when a reply answers it;
 *  - the Senses-Scening Unit's scene work seeds PLACEMENT
 *    needs, each REFERENCING a slot on the scene graph — the
 *    scene graph keeps its own slots; the envelope never
 *    duplicates them into a second store;
 *  - the QuantificationUnit's ledger flags seed
 *    RECONCILIATION needs;
 *  - a phatic turn (a greeting) seeds three SITUATE needs —
 *    who is speaking, where in the exchange this stands, and
 *    whether anything is owed — discharged by Session &
 *    Situation readers consulting actual session state.
 *
 * A need no unit discharges is priced by Coherence as
 * SURVIVING (coherence.ts, priceSurvivingNeeds): data for the
 * reply decision, carried onto the reply object's envelope,
 * and — when the turn declines — the located decline itself.
 *
 * The classical shape is the agent-communication one (FIPA
 * ACL / KQML): a performative and a needs list on the outside,
 * descriptive content on the inside.
 */
import {
  SENSE_CHANNELS,
  type ObjectKind,
  type SceneFace,
  type SemanticObject,
} from "./semantic-object";
import type { Session } from "./session";

/** The need kinds v1 knows — one per seeding signal above. */
export type NeedKind =
  | "answer"
  | "placement"
  | "reconciliation"
  | "situate-who"
  | "situate-where"
  | "situate-owed";

/**
 * A need's standing: OPEN when seeded, DISCHARGED when a named
 * unit met it (with the evidence recorded), SURVIVING when it
 * passed the whole route undischarged and Coherence priced it
 * as the turn's outstanding cost. Surviving is not terminal
 * for a placement need: when its referenced scene slot is
 * filled by a later utterance, the fill discharges it then.
 */
export type NeedStatus = "open" | "discharged" | "surviving";

export interface Need {
  kind: NeedKind;
  /** What is open, in the system's own terms. */
  slot: string;
  /** What would satisfy the need, stated. */
  discharge: string;
  status: NeedStatus;
  /** The unit that discharged it, when one did. */
  dischargedBy?: string;
  /** The reading the discharge (or the standing opening)
   *  rests on — the actual state consulted, in words. */
  evidence?: string;
  /** For a placement need: the scene-graph slot it references.
   *  The slot's only store is the scene graph (session.ts);
   *  this is a reference, never a copy of the slot. */
  ref?: { sceneId: string; of: string; slotKind: string };
}

export interface Envelope {
  /** The turn's speech-act shape as assessed — the core's own
   *  act vocabulary (semantic-object.ts): "greeting" is the
   *  phatic-opening shape. */
  act: ObjectKind;
  /** Where the core came from, in words. */
  provenance: string;
  /** The assessment's confidence in the core, mirrored at
   *  creation; not re-priced as the object travels in v1. */
  confidence: number;
  /** The units that handled the object, in order — the map's
   *  node ids where the map has them. */
  route: string[];
  needs: Need[];
}

/**
 * An information object: a semantic object (the core, every
 * field the pre-envelope type carries) plus its envelope. The
 * subtype is the wrap: readers of the core see the core
 * unchanged; readers of the journey see the envelope.
 */
export interface InformationObject extends SemanticObject {
  envelope: Envelope;
}

/** The information object an object travels as, when it has an
 *  envelope (objects authored before this build, or fixtures,
 *  may not). */
export function informationOf(object: SemanticObject): InformationObject | undefined {
  return (object as InformationObject).envelope ? (object as InformationObject) : undefined;
}

/** The object's envelope, when it travels with one. */
export function envelopeOf(object: SemanticObject): Envelope | undefined {
  return (object as InformationObject).envelope;
}

/**
 * Strip the envelope: exactly the semantic object the
 * pre-envelope pipeline produced. (The wall gate compares this
 * against the pre-envelope baseline.)
 */
export function stripEnvelope(object: SemanticObject): SemanticObject {
  if (!(object as InformationObject).envelope) return object;
  const { envelope: _dropped, ...core } = object as InformationObject;
  return core;
}

/** Record a unit's handling of the object on its route. */
export function noteHandled(info: InformationObject, unit: string): void {
  if (info.envelope.route[info.envelope.route.length - 1] !== unit) info.envelope.route.push(unit);
}

/** The object's needs still outstanding (open or surviving). */
export function outstandingNeeds(info: InformationObject): Need[] {
  return info.envelope.needs.filter((n) => n.status !== "discharged");
}

/** The object's surviving needs — priced, undischarged. */
export function survivingNeeds(info: InformationObject): Need[] {
  return info.envelope.needs.filter((n) => n.status === "surviving");
}

/**
 * SemanticAssessment's creation step: wrap a freshly assessed
 * core in its envelope, seeding the needs the ACT itself
 * raises (the answer need of a question; a greeting's three
 * situate needs — their discharge is the situation reading,
 * consultSituation, which the turn loop runs against the
 * session as it stood before this turn). The creation-time
 * consults the assessment already makes — the Senses-Scening
 * Unit for the face, the QuantificationLanguageUnit for the
 * mentions — are recorded on the route when they produced
 * something.
 */
export function createInformationObject(core: SemanticObject): InformationObject {
  const envelope: Envelope = {
    act: core.act.kind,
    provenance:
      core.producer === "person"
        ? "a person's utterance, assessed by SemanticAssessment (lpu/semantic-assessment)"
        : "a reply authored by the Planner (reasoning/planner)",
    confidence: core.confidence,
    route: ["lpu/semantic-assessment"],
    needs: [],
  };
  const info = core as InformationObject;
  info.envelope = envelope;

  if (
    core.senses &&
    (core.senses.scene || SENSE_CHANNELS.some((c) => core.senses.channels[c]?.length))
  ) {
    envelope.route.push("lpu/senses-scening-unit");
  }
  if (core.quantities?.length) envelope.route.push("lpu/quantification-language-unit");

  if (core.act.kind === "question" || core.act.kind === "reason-query") {
    const hole = core.content.holes[0];
    const slot =
      hole?.kind === "questioned-slot"
        ? `the ${hole.relation} the question asks after`
        : hole?.kind === "questioned-predication"
          ? "whether the questioned predication holds"
          : "the reason the question asks after";
    envelope.needs.push({
      kind: "answer",
      slot,
      discharge:
        "a reply that answers the question — authored by the Planner from the record or the derivation, " +
        "or read from the quantity ledger when the question is a how-many question",
      status: "open",
    });
  }

  if (core.act.kind === "greeting") {
    envelope.needs.push(
      {
        kind: "situate-who",
        slot: "who is speaking — the speaker's standing in this session",
        discharge:
          "Session's record establishes who is talking: a known speaker from prior turns, or a new " +
          "acquaintance met at this opening",
        status: "open",
      },
      {
        kind: "situate-where",
        slot: "where in the exchange this greeting stands — an opening, a resumption, a continuation",
        discharge: "the stream's standing (its turns and roles) places the greeting in the exchange",
        status: "open",
      },
      {
        kind: "situate-owed",
        slot: "anything owed — a question the system asked that the speaker has not answered",
        discharge:
          "the record shows no system question standing open, or the standing question is taken up",
        status: "open",
      },
    );
  }
  return info;
}

/**
 * Session & Situation's reading of the object (the situation
 * step of the route): for a phatic turn, the three situate
 * needs are discharged HERE, from actual session state — who
 * stands in the record, where the stream stands, whether a
 * system question is owed an answer. The reading runs against
 * the session as it stood BEFORE this turn's object is stored
 * (the turn loop calls it before recording, as the assessment
 * itself reads the prior stream).
 *
 * There is deliberately no greeting lookup anywhere in this:
 * the needs are met by consulting the situation, and the reply
 * is authored later, by the Planner, as for every other act.
 */
export function consultSituation(info: InformationObject, session: Session): void {
  noteHandled(info, "session-and-situation");
  if (info.act.kind !== "greeting") return;
  const priorPersons = session.objects.filter((o) => o.producer === "person");
  const lastSystem = [...session.objects].reverse().find((o) => o.producer === "system");
  for (const need of info.envelope.needs) {
    if (need.kind === "situate-who") {
      need.status = "discharged";
      need.dischargedBy = "session-and-situation";
      need.evidence = priorPersons.length
        ? `the speaker stands in the session record: ${priorPersons.length} prior utterance(s), the first at turn ${priorPersons[0].turn} — a known speaker resuming`
        : "no prior record: this greeting is the conversation's first turn — the speaker is met here, and the opening itself establishes who is talking (a new acquaintance, recorded from this turn)";
    } else if (need.kind === "situate-where") {
      need.status = "discharged";
      need.dischargedBy = "session-and-situation";
      need.evidence =
        info.act.streamRole === "opens"
          ? "the exchange opens here: turn 1, stream role 'opens' — no exchange stands before this greeting"
          : `the exchange already stands at turn ${info.turn}, with ${priorPersons.length} prior utterance(s) in the stream — this greeting is a resumption or continuation, not an opening`;
    } else if (need.kind === "situate-owed") {
      if (lastSystem && lastSystem.act.form === "interrogative") {
        // Stays open: the debt is real, and no greeting
        // discharges it. It survives the route and is carried
        // onto the reply object as data for the reply decision.
        need.evidence =
          `the system's reply at turn ${lastSystem.turn} (move: ${lastSystem.act.force}) asked a question ` +
          "that still stands unanswered — an answer is owed before the exchange can simply move on";
      } else {
        need.status = "discharged";
        need.dischargedBy = "session-and-situation";
        need.evidence = lastSystem
          ? `nothing is owed: the system's last reply object (turn ${lastSystem.turn}, move: ${lastSystem.act.force}) asked no question`
          : "nothing is owed: no reply object stands in the record before this turn — no question of the system's is open";
      }
    }
  }
}

/**
 * The Senses-Scening Unit's envelope amendments, run by the
 * turn loop after the scene update: each unknown slot this
 * fragment OPENED on the scene graph seeds a placement need
 * referencing that slot, and a spatial-consistency slot the
 * constraint check opened this turn seeds one too. A slot a
 * need already stands for (in any envelope in the stream) is
 * not re-seeded — the need already travels.
 */
export function seedSceneNeeds(info: InformationObject, session: Session, turn: number): void {
  const face = info.senses?.scene;
  if (!face || face.role === "references") return;
  const scene = session.scenes.find((s) => s.id === face.id);
  if (!scene) return;
  const alreadyStoodFor = (of: string, slotKind: string): boolean =>
    session.objects.some((o) => {
      const inf = informationOf(o);
      return inf?.envelope.needs.some(
        (n) => n.kind === "placement" && n.ref?.of === of && n.ref?.slotKind === slotKind && n.status !== "discharged",
      );
    });
  const seed = (of: string, slotKind: string, evidence: string) => {
    if (alreadyStoodFor(of, slotKind)) return;
    info.envelope.needs.push({
      kind: "placement",
      slot: `${of}.${slotKind}`,
      discharge:
        slotKind === "spatial-consistency"
          ? "the contradictory placements are resolved — a stated relation supersedes one of the placements the algebra found inconsistent"
          : "a later utterance fills the scene slot (a stated value or location), or a stronger-tier stated placement supersedes the placed one",
      status: "open",
      evidence,
      ref: { sceneId: scene.id, of, slotKind },
    });
  };
  for (const opened of face.unknownsOpened) {
    seed(
      opened.of,
      opened.kind,
      `the slot stands open on the scene graph (opened at turn ${turn}); this need references it — the slot's only store is the scene graph`,
    );
  }
  for (const slot of scene.unknowns) {
    if (slot.kind === "spatial-consistency" && slot.status === "open" && slot.openedTurn === turn) {
      seed(
        slot.of,
        slot.kind,
        `the scene's standing placements contradict each other (flagged at turn ${turn}); the scene graph opened this slot — this need references it`,
      );
    }
  }
}

/**
 * A later fragment FILLS scene slots (its face records the
 * fills): every outstanding placement need in the stream that
 * references a filled slot is discharged by that fill — the
 * one cross-turn discharge v1 has, and it works because the
 * need references the scene graph's own persistent slot.
 */
export function dischargeFilledSceneNeeds(session: Session, face: SceneFace, turn: number): void {
  if (!face.unknownsFilled?.length) return;
  for (const fill of face.unknownsFilled) {
    for (const o of session.objects) {
      const inf = informationOf(o);
      if (!inf) continue;
      for (const need of inf.envelope.needs) {
        if (
          need.kind === "placement" &&
          need.status !== "discharged" &&
          need.ref?.of === fill.of &&
          need.ref?.slotKind === fill.kind
        ) {
          need.status = "discharged";
          need.dischargedBy = "lpu/senses-scening-unit";
          need.evidence = `the scene slot was filled at turn ${turn} with '${fill.value}'`;
        }
      }
    }
  }
}

/**
 * The QuantificationLanguageUnit / QuantificationUnit's
 * envelope amendment, run by the turn loop after the turn's
 * mentions are applied to the ledger: each quantity flag the
 * ledger raised THIS turn seeds a reconciliation need. The
 * flag record on the session is the source; the need carries
 * its detail as evidence.
 */
export function seedQuantityNeeds(info: InformationObject, session: Session, turn: number): void {
  for (const flag of session.quantityFlags) {
    if (flag.turn !== turn) continue;
    info.envelope.needs.push({
      kind: "reconciliation",
      slot: `${flag.holder}.${flag.kind}`,
      discharge:
        "the flagged quantity problem is resolved — the tracked amount corrected in the record, or the impossible change withdrawn",
      status: "open",
      evidence: flag.detail,
    });
  }
}

/** Discharge the object's answer need, naming who answered
 *  and on what evidence. Returns whether a need was discharged. */
export function dischargeAnswerNeed(info: InformationObject, by: string, evidence: string): boolean {
  const need = info.envelope.needs.find((n) => n.kind === "answer" && n.status === "open");
  if (!need) return false;
  need.status = "discharged";
  need.dischargedBy = by;
  need.evidence = evidence;
  return true;
}

/**
 * The reply object's envelope (the Planner's creation site,
 * reply.ts): the reply travels with the surviving needs of the
 * object it answers — priced by Coherence, carried as data for
 * the reply decision — copied, so the reply's record stands
 * even as the inbound's envelope is read later.
 */
export function wrapReplyObject(core: SemanticObject, inbound: SemanticObject | undefined): InformationObject {
  const inboundInfo = inbound ? informationOf(inbound) : undefined;
  const carried = (inboundInfo?.envelope.needs ?? [])
    .filter((n) => n.status === "surviving")
    .map((n) => ({ ...n, ...(n.ref ? { ref: { ...n.ref } } : {}) }));
  const info = core as InformationObject;
  info.envelope = {
    act: "reply",
    provenance: "a reply authored by the Planner (reasoning/planner)",
    confidence: core.confidence,
    route: ["reasoning/planner"],
    needs: carried,
  };
  return info;
}
