/**
 * uptake.ts — the uptake move family (the Planner's; Design 2
 * of the discourse/uptake programme, 2026-11-19).
 *
 * The causal analysis (2026-11-19, cause C1 — the largest
 * single cause in the run-4 attribution) found that empathic
 * uptake of the current telling had no owner: the
 * acknowledgement family's positive half was receipts, which
 * show the record neutrally whatever register the telling
 * carried. The owner's ruling (2026-11-19): uptake is
 * CHARTERED, and its seat is a move family in the Planner —
 * not a Social Unit demand (uptake is graded and selected,
 * never an owed dischargeable act; the Social Unit reads and
 * raises demands and does not gain a voice here), and not an
 * EDU-adjacent unit (the EDU classifies; it addresses
 * nobody). This module is that family: the ground assessment
 * and the move builder. The gating and composition live at
 * the turn's acknowledgement sites (turn.ts, UP-2), under the
 * composition ruling: ONE acknowledgement head per reply —
 * uptake where it fires, otherwise the receipt, never
 * stacked.
 *
 * THE GROUND (design §2.3). Four inputs vary, and the move is
 * generated from them:
 *  (1) the REGISTER — the telling's feeling as the system's
 *      own authorities file it: the EDU's canonical filings,
 *      the E programme's category filings with degree, the
 *      LEDU's uncategorised register. All are EVIDENCE WITH
 *      PROVENANCE (the authority string travels into the
 *      trace), never script: no filing anywhere says what to
 *      say.
 *  (2) the telling's own PREDICATIONS as the move's object —
 *      the visitor's feeling predicated back by the record
 *      construction, and the turn's event where one rides.
 *      Uptake asserts nothing about the world; it takes a
 *      stance toward what the visitor supplied (testimony
 *      discipline).
 *  (3) MOVEMENT and HISTORY from the Discourse Record
 *      reader: a returning grief is not a new grief — the
 *      register's prior standing in the record (standing or
 *      superseded, read off the reader's timeline) is part
 *      of the ground and part of the weight.
 *  (4) DEGREE — from the filing's own degree language where
 *      it carries one, else the Glasgow register's arousal,
 *      cited as degree evidence only (the standing rule for
 *      that register: values alone never create a reading).
 *
 * RENDERING. The stance is a Planner predication (plan.ts's
 * planStancePredication): the system-as-speaker predicated
 * with the register's stance quality — 'sorry', grief's own
 * face as the LEDU files it, for the sympathy registers;
 * 'glad', joy's everyday face as its classification filing
 * names it, for joy — with degree riding as the predication's
 * modulator. The object sentences are the record's own
 * constructions (planRecordPredication; the event clause
 * under the caller's S0 admission). NO STORED PHRASES EXIST
 * in this family: every sentence is generated from the
 * ground, so two tellings of one register share only what
 * their filings share — the no-template audit in the tests
 * is mechanical, not aspirational. Uptake never asks a
 * question.
 *
 * V1 SCOPE, stated: the register evidence is the visitor's
 * own feelings as filed by the three authorities — stated
 * (E1) or predicated in the current telling. The apology
 * formula is excluded by name: 'sorry' files under grief as
 * a feeling word, but its statement is canonically the
 * apology — a social form whose meeting belongs to the
 * social layer's forms, not to this family (E1's own
 * doctrine: formula uses never reach a predication; an
 * uptake over it would only echo it — "I am sorry. You are
 * sorry."). Event-carried
 * registers with no visitor feeling filed (a bare loss or
 * achievement event) are NOT claimed: no existing authority
 * files loss/achievement/threat on events (the classification
 * table carries no such filings, and the LEDU's discipline
 * bars Glasgow values from creating one), and inventing a
 * verb-list authority would be an improvised filing. The
 * seam is clean: the ground takes the turn's records, and an
 * event-register authority can join under its own
 * determination. A NEGATED feeling does not ground uptake
 * (X0's discipline generalised: the absence family owns
 * negations; the movement ground still serves a register's
 * return across one).
 */
import type { EventRecord, Session, StateRecord } from "./session";
import { canonicalEmotion } from "./edu";
import { canonicalNameFor, emotionPriorFor, uncategorisedEmotionWord } from "./ledu";
import { lookupClassification } from "./classify";
import { eventTimeline, stateTimeline } from "./discourse-record";
import { planRecordPredication, planStancePredication } from "./plan";

/* ------------------------------------------------------------------ */
/* The register: the telling's feeling as the authorities file it      */
/* ------------------------------------------------------------------ */

export type UptakeRegister =
  | { kind: "canonical"; name: string; authority: string }
  | { kind: "uncategorised"; word: string; authority: string };

export function registerKeyOf(register: UptakeRegister): string {
  return register.kind === "canonical" ? register.name : `uncategorised:${register.word}`;
}

/**
 * The register a recorded feeling state files under, by the
 * same authorities in the same order E1's filing reads
 * (fileFeelingWord's determination, restated for the move
 * family): the classification table's emotion aspect and the
 * EDU's canonical names land on the canonical category under
 * the category-filing rule; the LEDU's uncategorised register
 * stands as itself, with no category — its fitting is still
 * the owner's to give, and the register is evidence, not a
 * category claim.
 */
export function registerOf(state: StateRecord): UptakeRegister | undefined {
  for (const word of [state.lemma, state.concept]) {
    if (!word) continue;
    const w = word.toLowerCase();
    const face = canonicalNameFor(w);
    const canonical = canonicalEmotion(face) ?? canonicalEmotion(w);
    if (canonical) {
      return {
        kind: "canonical",
        name: canonical.name,
        authority:
          `the EDU names '${face}' a canonical emotion (${canonical.hanzi}, ${canonical.name})` +
          (canonical.element ? `, filed at ${canonical.element}` : " — the tradition leaves it unsettled"),
      };
    }
    const entry = lookupClassification(w, "emotion");
    if (entry) {
      return {
        kind: "canonical",
        name: face,
        authority:
          `the classification table files '${w}' under the emotion aspect (${entry.element}, ${entry.provenance})` +
          ` — under the category-filing rule its register is '${face}'`,
      };
    }
  }
  if (uncategorisedEmotionWord(state.lemma)) {
    return {
      kind: "uncategorised",
      word: state.lemma,
      authority:
        `the LEDU's uncategorised register names '${state.lemma}' a feeling with no reliable category — ` +
        `it registers with no element, and its category fitting waits on the owner in GAPS §2`,
    };
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Degree                                                              */
/* ------------------------------------------------------------------ */

export type UptakeDegree = "high" | "plain" | "low";

/**
 * The register's degree, with its evidence: the filing's own
 * degree language first (the classification entry's note —
 * 'furious' files as anger at high degree), else the Glasgow
 * register's arousal as degree evidence only (high at ≥ 6.0,
 * low at ≤ 3.5 — the recorded values place furious 6.43 and
 * excited 7.88 high, gloomy 2.94 low, sad 3.94 and angry 5.91
 * at the unmarked degree). No evidence: the unmarked degree,
 * said so.
 */
export function degreeOf(state: StateRecord): { degree: UptakeDegree; evidence: string } {
  const entry = lookupClassification(state.lemma, "emotion");
  const note = entry?.note ?? "";
  if (/high degree/.test(note)) {
    return { degree: "high", evidence: `the classification filing's own degree: '${state.lemma}' — ${note}` };
  }
  if (/low degree/.test(note)) {
    return { degree: "low", evidence: `the classification filing's own degree: '${state.lemma}' — ${note}` };
  }
  const arousal = emotionPriorFor(state.lemma)?.arousal;
  if (arousal) {
    if (arousal.mean >= 6) {
      return { degree: "high", evidence: `Glasgow arousal ${arousal.mean} for '${state.lemma}' (degree evidence only, cited as provenance)` };
    }
    if (arousal.mean <= 3.5) {
      return { degree: "low", evidence: `Glasgow arousal ${arousal.mean} for '${state.lemma}' (degree evidence only, cited as provenance)` };
    }
    return { degree: "plain", evidence: `Glasgow arousal ${arousal.mean} for '${state.lemma}' — the unmarked degree` };
  }
  return { degree: "plain", evidence: "no degree evidence files — the unmarked degree" };
}

/* ------------------------------------------------------------------ */
/* The stance                                                          */
/* ------------------------------------------------------------------ */

/**
 * The stance quality the register's filing carries: 'glad'
 * for joy (its classification filing names glad "joy's
 * everyday face"); 'sorry' for the sympathy registers —
 * sorry IS grief's face in the LEDU's filing, and for the
 * other registers no second stance quality is filed anywhere
 * in the authorities, so the sympathy stance stands and the
 * register matching lives where the design puts it: in the
 * object (the visitor's own state, predicated in its own
 * lemma and degree) and in the stance's degree modulator.
 * The uncategorised register takes the sympathy stance: the
 * stance claims no category, so it borrows none.
 */
export function stanceLemmaFor(register: UptakeRegister): string {
  if (register.kind === "canonical" && register.name === "joy") return "glad";
  return "sorry";
}

/* ------------------------------------------------------------------ */
/* The ground                                                          */
/* ------------------------------------------------------------------ */

/** The move's weight threshold (the build determination,
 *  recorded in GAPS.md): degree is the weight's spine (high
 *  3, plain 2, low 1); a returning register adds 1; a riding
 *  event adds 1. A plain first-telling feeling (2) is owed;
 *  a low-degree passing mention alone (1) is not — it is
 *  receipt matter, and the receipt answers it. */
export const UPTAKE_WEIGHT_THRESHOLD = 2;

export interface UptakeGround {
  register: UptakeRegister;
  registerKey: string;
  degree: UptakeDegree;
  degreeEvidence: string;
  /** The telling's feeling — the move's primary object. */
  feeling: StateRecord;
  /** Further predications the move takes as object (a third
   *  party's reported state, where the visitor's own reaction
   *  is the register — P-083's shape). */
  objectStates: StateRecord[];
  /** The turn's event, where one rides with the telling. */
  objectEvent?: EventRecord;
  /** Where the register is RETURNING: the event the
   *  register's most recent earlier telling itself carried —
   *  the visitor's own event recorded on that telling's turn
   *  or the turn immediately before it (a composed telling
   *  splits its event and its feeling across adjacent
   *  segment turns). The move's object then carries the
   *  retained particular from the record (P-020's shape:
   *  congratulation with the achievement in it) — never an
   *  invented one, and only the telling's own event, not any
   *  later or earlier matter. */
  historyEvent?: EventRecord;
  /** The register stood in the record before this turn
   *  (standing or superseded — the reader's timeline): a
   *  returning grief is not a new grief. */
  returning: boolean;
  priorTurns: number[];
  weight: number;
  provenance: string;
}

/**
 * Assess one telling's uptake ground. The feeling must be the
 * visitor's own (holder 'you') and unnegated; the register
 * must file under an authority; beyond that the ground is
 * descriptive — the WEIGHT gate and the turn-level gates are
 * the caller's (turn.ts's UP-2 wiring), which record their
 * stand-downs in the trace.
 */
export function assessUptakeGround(
  session: Session,
  feeling: StateRecord,
  opts?: { objectStates?: StateRecord[]; objectEvent?: EventRecord },
): UptakeGround | undefined {
  if (feeling.holder !== "you" || feeling.negated) return undefined;
  if (feeling.lemma === "sorry") return undefined;
  const register = registerOf(feeling);
  if (!register) return undefined;
  const registerKey = registerKeyOf(register);
  const { degree, evidence } = degreeOf(feeling);
  const timeline = stateTimeline(session, "you", (s) => {
    const r = registerOf(s);
    return r !== undefined && registerKeyOf(r) === registerKey;
  });
  const prior = timeline.filter((i) => i.turn < feeling.turn);
  const returning = prior.length > 0;
  const weight =
    (degree === "high" ? 3 : degree === "low" ? 1 : 2) + (returning ? 1 : 0) + (opts?.objectEvent ? 1 : 0);
  let historyEvent: EventRecord | undefined;
  if (returning && !opts?.objectEvent) {
    const lastPriorTurn = prior[prior.length - 1].turn;
    const carried = eventTimeline(session, "you").filter(
      (i) => i.turn < feeling.turn && (i.turn === lastPriorTurn || i.turn === lastPriorTurn - 1),
    );
    historyEvent = carried[carried.length - 1]?.event;
  }
  return {
    register,
    registerKey,
    degree,
    degreeEvidence: evidence,
    feeling,
    objectStates: opts?.objectStates ?? [],
    objectEvent: opts?.objectEvent,
    historyEvent,
    returning,
    priorTurns: prior.map((i) => i.turn),
    weight,
    provenance:
      `${register.authority}; degree: ${evidence}; ` +
      (returning
        ? `the register stood in the record before this turn (turns ${prior.map((i) => i.turn).join(", ")}, read from the Discourse Record reader's timeline) — a returning register, not a new one`
        : "the register is new to the record with this telling"),
  };
}

/** Same-register family test for the episode discipline: does
 *  this state file under the ground's register? */
export function inRegister(state: StateRecord, registerKey: string): boolean {
  const r = registerOf(state);
  return r !== undefined && registerKeyOf(r) === registerKey;
}

/* ------------------------------------------------------------------ */
/* The move                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the uptake reply from its ground: the stance
 * predication (the Planner's construction), then the object
 * — the visitor's feeling predicated by the record
 * construction, any further object states likewise, and the
 * riding event's clause under the caller's S0 admission
 * (turn.ts passes its soundEventClause; a clause that fails
 * admission is simply not an object sentence — the stance
 * and the feeling still stand). Every sentence is generated;
 * none is stored. The reply never contains a question.
 */
export function buildUptakeReply(
  ground: UptakeGround,
  renderEventClause: (event: EventRecord) => string | undefined,
): { reply: string; stanceLemma: string } {
  const stanceLemma = stanceLemmaFor(ground.register);
  const stance = planStancePredication({ stanceLemma, degree: ground.degree });
  const parts: string[] = [stance.sentence];
  const feelingSentence = planRecordPredication({
    subject: { lemma: "you", form: "you", person: "2sg" },
    stateLemma: ground.feeling.lemma,
  }).sentence;
  parts.push(feelingSentence);
  for (const s of ground.objectStates) {
    const subject =
      s.holder === "you"
        ? { lemma: "you", form: "you", person: "2sg" }
        : { lemma: s.holder, form: s.holder, det: "the", person: "3sg" };
    parts.push(planRecordPredication({ subject, stateLemma: s.lemma }).sentence);
  }
  const objectEvent = ground.objectEvent ?? ground.historyEvent;
  if (objectEvent) {
    const clause = renderEventClause(objectEvent);
    if (clause) parts.push(`${clause}.`);
  }
  return { reply: parts.join(" "), stanceLemma };
}
