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
 *
 * UN-1 (the narrative-uptake programme, 2026-11-19): the
 * event-register authority has joined, under its own
 * determination (event-register.ts) — the seam named above.
 * The NARRATIVE ground (assessNarrativeGround, below) stands
 * beside the stated ground: the telling's event matches a
 * banked event-kind over a participant bound to the visitor,
 * and the register is the entry's. The two grounds are
 * priced apart, as the strength discipline prices derived
 * support below stated: the stated ground's threshold is 2;
 * the narrative threshold is 3 (UPTAKE_NARRATIVE_THRESHOLD),
 * cleared through the DEGREE axis alone (the kind's weight
 * at the binding's closeness, plus a return). The axes
 * doctrine governs the ground's shape (the owner's ruling,
 * 2026-11-19): register and degree are separate
 * determinations, recorded separately — the register from
 * the event-kind's correspondence, the degree from kind
 * weight and relation closeness, never one read off the
 * other. The rendering licence for the narrative ground is
 * narrower than the stated ground's (UN-2): the stance and
 * the event as told, never a feeling predicated of the
 * visitor — the feeling was never stated, and testimony
 * discipline does not attribute it.
 *
 * MIX-2 (the emotion-mix programme, 2026-11-19): the
 * register walk reads MIXES. A word the emotion-mix table
 * files (emotion-mix.ts — the owner's two entries:
 * nostalgia, sentimental) registers as a MIX register: its
 * components standing together, the ground's provenance
 * naming the mix entry and the relations derived from the
 * components' elements. The determinations (recorded in
 * GAPS §2): DEGREE is the mix's own — Glasgow arousal read
 * on the word itself, cited as provenance, since a mix has
 * no single register to borrow a degree from (nostalgic
 * carries no Glasgow value and prices plain; sentimental's
 * 5.588 prices plain). WEIGHT rides the stated-ground spine
 * unchanged — the visitor DID state a feeling, in their own
 * word — with the mix form named in the derivation; the
 * mix's return is read on the MIX's own timeline (register
 * key `mix:<name>`), never on a component's. STANCE never
 * collapses the mix: the Planner's stance follows the ONE
 * component register the visitor's own record foregrounds —
 * a component feeling of theirs standing in the record at
 * the telling (sadness told earlier, nostalgia told now:
 * the grief component is foregrounded and the sympathy
 * stance answers it) — and where no component is
 * foregrounded, or more than one is, NO stance sentence is
 * generated: the predication of the word as told is the
 * whole acknowledgement head, the neutral acknowledgement.
 * PREDICATION predicates the mix WORD as told ("You are
 * nostalgic.") and never a component — the visitor did not
 * state one.
 */
import type { EventRecord, Session, StateRecord } from "./session";
import { canonicalEmotion } from "./edu";
import { canonicalNameFor, emotionPriorFor, uncategorisedEmotionWord } from "./ledu";
import { lookupClassification } from "./classify";
import { eventTimeline, stateTimeline } from "./discourse-record";
import { planRecordPredication, planStancePredication } from "./plan";
import { matchEventRegister, narrativeGuard, type EventRegisterMatch } from "./event-register";
import { mixDerivation, mixFor, type EmotionMixEntry } from "./emotion-mix";
import type { ParsedSentence } from "./sentence";

/* ------------------------------------------------------------------ */
/* The register: the telling's feeling as the authorities file it      */
/* ------------------------------------------------------------------ */

export type UptakeRegister =
  | { kind: "canonical"; name: string; authority: string }
  | { kind: "uncategorised"; word: string; authority: string }
  | { kind: "mix"; word: string; entry: EmotionMixEntry; authority: string };

export function registerKeyOf(register: UptakeRegister): string {
  if (register.kind === "canonical") return register.name;
  if (register.kind === "mix") return `mix:${register.entry.name}`;
  return `uncategorised:${register.word}`;
}

/**
 * The owner's register filings (determinations of
 * 2026-11-19: the corrected attested fivefold table, and the
 * layered mapping adopted the same day). The layered
 * mapping: the seven emotions are the RECOGNITION vocabulary
 * — words file into the seven-name space, family variants at
 * degrees inside a register — and the five wills are the
 * CORRESPONDENCE layer, element and organ attached where
 * attested (joy Fire/heart, anger Wood/liver, pensiveness
 * Earth/spleen, worry Earth/spleen, grief Metal/lung, fear
 * Water/kidney). FRIGHT stands recognised but UNSEATED: no
 * element, no organ (it disorders the qi rather than
 * residing) — it is not in this table because the canonical
 * walk already carries it in exactly those terms, and no
 * filing here seats it. LOVE stands in no filing: the
 * corrected table does not name it, an earlier same-day
 * filing of love under Fire was withdrawn by the owner
 * before any code carried it, and this walk files it
 * nowhere — its standing is reported, not changed.
 *
 * What this layer settles, word by word:
 *  - worry / worried / anxiety: the recognition name is
 *    'worry'; its correspondence is Earth/spleen, seated
 *    WITH pensiveness. Two provenances stood in tension —
 *    the classification table files the word at Earth
 *    ("the everyday face of attested pensiveness"), the
 *    EDU's canonical table seats 憂 at Metal/lung — and the
 *    owner's ruling resolves the register filing to the
 *    table's Earth. Both provenances are named in the
 *    authority string; neither is harmonised away, and the
 *    EDU's canonical table itself is not rewritten by this
 *    programme (the divergence is recorded in GAPS §2 as a
 *    located remainder of the layered mapping).
 *  - apprehension: a family variant inside fear, at LOW
 *    degree (the degree is the variant's own axis, recorded
 *    with the filing). It filed nowhere before this ruling.
 *  - elation: a family variant inside joy. It filed
 *    nowhere before this ruling.
 *  - frustration: a family variant inside anger. It filed
 *    nowhere before this ruling.
 * What already agreed and is NOT in this layer: pensiveness
 * at Earth/spleen (canonical, in the EDU's table and the
 * classification table alike — an earlier same-day filing of
 * pensiveness under Metal was withdrawn before any code
 * carried it); excitement under joy/Fire; irritation under
 * anger/Wood; sadness under grief/Metal.
 */
export interface OwnerRegisterFiling {
  name: string;
  authority: string;
  degree?: UptakeDegree;
  degreeEvidence?: string;
}

const OWNER_REGISTER_FILINGS: Record<string, OwnerRegisterFiling> = {
  worry: {
    name: "worry",
    authority:
      "the owner's determination (2026-11-19, the attested fivefold table under the layered mapping): " +
      "'worry' is recognised among the seven emotions and seated with pensiveness at Earth/spleen in the " +
      "correspondence layer; the classification table's own filing for the word is Earth ('the everyday " +
      "face of attested pensiveness'), and the ruling resolves the register filing to it — the EDU's " +
      "canonical table seats 憂 at Metal/lung, and that provenance stands beside this one, not harmonised with it",
  },
  apprehension: {
    name: "fear",
    authority:
      "the owner's determination (2026-11-19, the attested fivefold table): apprehension files under " +
      "fear (Water/kidney) as a family variant inside the register, at low degree — the variant's degree " +
      "sits on its own axis, as the axes doctrine holds degrees apart from registers",
    degree: "low",
    degreeEvidence:
      "the owner's determination (2026-11-19): apprehension is the fear register at low degree — degree evidence from the filing itself, not from arousal",
  },
  elation: {
    name: "joy",
    authority:
      "the owner's determination (2026-11-19, the attested fivefold table): elation files under joy " +
      "(Fire/heart) as a family variant inside the register",
  },
  frustration: {
    name: "anger",
    authority:
      "the owner's determination (2026-11-19, the attested fivefold table): frustration files under " +
      "anger (Wood/liver) as a family variant inside the register",
  },
};

/** The owner's filing for a word, where one stands: the
 *  worry faces read their filing under 'worry' itself. */
export function ownerFilingFor(word: string): OwnerRegisterFiling | undefined {
  const w = word.toLowerCase();
  if (w === "worried" || w === "anxiety") return OWNER_REGISTER_FILINGS.worry;
  return OWNER_REGISTER_FILINGS[w];
}

/**
 * The register a recorded feeling state files under, by the
 * authorities E1's filing reads (fileFeelingWord's
 * determination, restated for the move family): the
 * classification table's emotion aspect and the EDU's
 * canonical names land on the canonical category under the
 * category-filing rule; the LEDU's uncategorised register
 * stands as itself, with no category — its fitting is still
 * the owner's to give, and the register is evidence, not a
 * category claim. MIX-2 adds the emotion-mix table's leg,
 * standing ahead of the canonical face here (and behind the
 * canonical name in fileFeelingWord's filing, where no
 * competition exists for the ruled words either way): a
 * word the mix table files registers as a mix, its
 * components standing together — no single-register route
 * may capture it.
 */
export function registerOf(state: StateRecord): UptakeRegister | undefined {
  for (const word of [state.lemma, state.concept]) {
    if (!word) continue;
    const w = word.toLowerCase();
    const ownerFiling = ownerFilingFor(w);
    if (ownerFiling) {
      return { kind: "canonical", name: ownerFiling.name, authority: ownerFiling.authority };
    }
    const mix = mixFor(w);
    if (mix) {
      // MIX-2: a mix word registers as a MIX — its components
      // standing together under the mix entry's authority.
      // The leg stands ahead of the canonical face and the
      // classification entry on purpose: a mix word must
      // never be captured by a single-register route (a
      // future face or entry filing one of its components
      // would collapse it silently).
      return {
        kind: "mix",
        word: w,
        entry: mix,
        authority:
          `the emotion-mix table files '${w}' as a MIX (${mix.provenance}): ${mixDerivation(mix)} — ` +
          `a mix is filed by its components and their relations, never collapsed to a single element or register`,
      };
    }
    const face = canonicalNameFor(w);
    const canonical = canonicalEmotion(face) ?? canonicalEmotion(w);
    if (canonical) {
      return {
        kind: "canonical",
        name: canonical.name,
        authority:
          `the EDU names '${face}' a canonical emotion (${canonical.hanzi}, ${canonical.name})` +
          (canonical.element
            ? `, filed at ${canonical.element}`
            : " — recognised among the seven, but UNSEATED in the correspondence layer: no element, no organ " +
              "(the owner's layered determination, 2026-11-19; the tradition's own standing — fright disorders the qi rather than residing)"),
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
  const ownerFiling = ownerFilingFor(state.lemma);
  if (ownerFiling?.degree) {
    return { degree: ownerFiling.degree, evidence: ownerFiling.degreeEvidence ?? ownerFiling.authority };
  }
  if (mixFor(state.lemma)) {
    // MIX-2 (i): a mix's degree is its OWN — read on the
    // word itself. A mix has no single register to borrow a
    // degree from (no component's filing degree, no
    // component's arousal): the Glasgow register's arousal
    // for the word, at the family's standing thresholds,
    // cited as provenance; no value standing, the unmarked
    // degree, said so. (nostalgic carries no Glasgow value
    // and prices plain; sentimental's 5.588 prices plain.)
    const arousal = emotionPriorFor(state.lemma)?.arousal;
    if (arousal) {
      if (arousal.mean >= 6) {
        return {
          degree: "high",
          evidence:
            `Glasgow arousal ${arousal.mean} for '${state.lemma}' (degree evidence only, cited as provenance) — ` +
            `the mix's own degree, read on the word itself: a mix has no single register to borrow a degree from`,
        };
      }
      if (arousal.mean <= 3.5) {
        return {
          degree: "low",
          evidence:
            `Glasgow arousal ${arousal.mean} for '${state.lemma}' (degree evidence only, cited as provenance) — ` +
            `the mix's own degree, read on the word itself: a mix has no single register to borrow a degree from`,
        };
      }
      return {
        degree: "plain",
        evidence:
          `Glasgow arousal ${arousal.mean} for '${state.lemma}' — the unmarked degree; the mix's own degree, ` +
          `read on the word itself: a mix has no single register to borrow a degree from`,
      };
    }
    return {
      degree: "plain",
      evidence:
        `no degree evidence files for '${state.lemma}' — the unmarked degree; a mix carries its degree on ` +
        `the word itself, and no Glasgow value stands for it`,
    };
  }
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
  /** MIX-2: on a mix ground, the mix entry the register
   *  stands on, and the foregrounded component where the
   *  visitor's own record shows exactly one: a component
   *  register with a standing 'you' state at the telling
   *  (the telling's own state excluded). The stance follows
   *  the foregrounded component alone; with none — or with
   *  more than one — `foregrounded` is absent and the move
   *  carries no stance sentence (the neutral
   *  acknowledgement: the word as told, predicated). */
  mix?: {
    entry: EmotionMixEntry;
    foregrounded?: { register: string; stanceLemma: string };
  };
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
  // MIX-2 (iii): on a mix ground, read the record for a
  // foregrounded component — a component register under
  // which a feeling of the visitor's stands at the telling
  // (standing states only; the mix state itself excluded;
  // a negated component state does not foreground). Exactly
  // one foregrounded component lends the move its stance;
  // none, or more than one, and the move takes no stance
  // sentence at all — choosing one unconditionally would
  // collapse every telling of the mix to that component.
  let mix: UptakeGround["mix"];
  if (register.kind === "mix") {
    const componentNames = new Set(register.entry.components.map((c) => c.register));
    const foregrounded = new Map<string, UptakeRegister>();
    for (const s of session.states) {
      if (s.holder !== "you" || s.negated) continue;
      if (s.turn === feeling.turn && s.lemma === feeling.lemma) continue;
      const r = registerOf(s);
      if (r?.kind === "canonical" && componentNames.has(r.name)) foregrounded.set(r.name, r);
    }
    const only = foregrounded.size === 1 ? [...foregrounded.values()][0] : undefined;
    mix = {
      entry: register.entry,
      ...(only?.kind === "canonical"
        ? { foregrounded: { register: only.name, stanceLemma: stanceLemmaFor(only) } }
        : {}),
    };
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
      (mix
        ? `the ground is a MIX ground: the components stand together in the derivation and none is predicated ` +
          `of the visitor; ` +
          (mix.foregrounded
            ? `the visitor's own record foregrounds the '${mix.foregrounded.register}' component (a feeling of ` +
              `theirs stands under that register at this telling), and the stance follows that component alone; `
            : `no single component is foregrounded in the visitor's record, so the move carries no stance ` +
              `sentence — the word as told, predicated, is the whole acknowledgement; `)
        : "") +
      (returning
        ? `the register stood in the record before this turn (turns ${prior.map((i) => i.turn).join(", ")}, read from the Discourse Record reader's timeline) — a returning register, not a new one`
        : "the register is new to the record with this telling"),
    ...(mix ? { mix } : {}),
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
 * MIX-2: on a mix ground the stance sentence is present
 * only where the ground's foregrounded component lends one
 * (see the ground's `mix` field); the feeling sentence
 * predicates the mix word as told, never a component.
 */
export function buildUptakeReply(
  ground: UptakeGround,
  renderEventClause: (event: EventRecord) => string | undefined,
): { reply: string; stanceLemma: string | undefined } {
  // MIX-2 (iii): a mix ground's stance comes from its
  // foregrounded component alone, as assessed on the
  // ground; with none foregrounded there is NO stance
  // sentence — the predication of the word as told opens
  // the reply (the neutral acknowledgement). Every other
  // register takes its filed stance as before.
  const stanceLemma =
    ground.register.kind === "mix" ? ground.mix?.foregrounded?.stanceLemma : stanceLemmaFor(ground.register);
  const parts: string[] = [];
  if (stanceLemma) {
    parts.push(planStancePredication({ stanceLemma, degree: ground.degree }).sentence);
  }
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

/* ------------------------------------------------------------------ */
/* The narrative ground (UN-1)                                         */
/* ------------------------------------------------------------------ */

/** The narrative threshold (the build determination,
 *  recorded in GAPS.md): narrative ground is DERIVED
 *  support — an event-kind correspondence read through a
 *  binding — where the stated ground is the visitor's own
 *  words, so under the strength discipline (derived is
 *  qualified by default) its bar sits above the stated
 *  threshold of 2. The weight is the degree axis alone:
 *  high 3, plain 2, low 1, with a returning register adding
 *  1. A parent's death (high, 3) clears it on its telling;
 *  a plain narrative ground (2) is receipt matter until the
 *  register RETURNS (2 + 1) — recurrence is the record's own
 *  evidence that the telling carries weight; a low-degree
 *  narrative mention (1) never clears it alone. */
export const UPTAKE_NARRATIVE_THRESHOLD = 3;

export interface NarrativeUptakeGround {
  /** The register the event-kind files under, as a register
   *  object in the stated ground's shape: its authority is
   *  the event-register table's entry. */
  register: UptakeRegister;
  registerKey: string;
  degree: UptakeDegree;
  degreeEvidence: string;
  /** The table match: entry, binding, and the derivation
   *  naming the two axes apart. */
  match: EventRegisterMatch;
  /** The telling's event — the move's only object. */
  event: EventRecord;
  /** An earlier event in the record matched the same entry:
   *  the register is being returned to, not met first. */
  returning: boolean;
  priorTurns: number[];
  weight: number;
  provenance: string;
  /** Where the telling-level guards stood the ground down
   *  (mood, negation, mediation): the match stands, the
   *  telling does not carry it. The caller traces the
   *  stand-down by this name. */
  guardReason?: string;
}

/**
 * Assess one telling's NARRATIVE uptake ground: its event
 * (the segment's root event — the only event whose parse,
 * and therefore whose mood and negation, the record
 * retains) against the event-register authority, under the
 * telling-level guards. Returns undefined where no entry
 * matches — the telling carries no event-carried register
 * this authority files. The turn-level gates (weight,
 * phase, pending, episode) are the caller's, as they are
 * for the stated ground.
 */
export function assessNarrativeGround(
  session: Session,
  event: EventRecord,
  parsed: ParsedSentence,
): NarrativeUptakeGround | undefined {
  const match = matchEventRegister(session, event);
  if (!match) return undefined;
  const register: UptakeRegister = {
    kind: "canonical",
    name: match.entry.register,
    authority:
      `the event-register authority (UN-1) files the event-kind '${match.entry.id}' under ` +
      `${match.entry.register} — ${match.entry.note}`,
  };
  const registerKey = registerKeyOf(register);
  const priors = session.events.filter(
    (e) => e.turn < event.turn && matchEventRegister(session, e)?.entry.id === match.entry.id,
  );
  const returning = priors.length > 0;
  const weight = (match.degree === "high" ? 3 : match.degree === "low" ? 1 : 2) + (returning ? 1 : 0);
  return {
    register,
    registerKey,
    degree: match.degree,
    degreeEvidence: match.derivation,
    match,
    event,
    returning,
    priorTurns: priors.map((e) => e.turn),
    weight,
    provenance:
      `${match.derivation}; ground: narrative (event-carried), under the event-register authority — ` +
      `derived support, priced at the narrative threshold (${UPTAKE_NARRATIVE_THRESHOLD}) above the stated ` +
      `ground's (${UPTAKE_WEIGHT_THRESHOLD}); ` +
      (returning
        ? `the event-kind stood in the record before this turn (turns ${priors.map((e) => e.turn).join(", ")}) — a returning register`
        : "the event-kind is new to the record with this telling"),
    guardReason: narrativeGuard(session, event, parsed),
  };
}

/** Same-entry family test for the narrative episode
 *  discipline: does this recorded event match the ground's
 *  entry (the same event-kind told again)? */
export function inNarrativeEntry(session: Session, event: EventRecord, entryId: string): boolean {
  return matchEventRegister(session, event)?.entry.id === entryId;
}

/* ------------------------------------------------------------------ */
/* Rendering the narrative ground (UN-2)                               */
/* ------------------------------------------------------------------ */

/**
 * The narrative move's rendering licence — narrower than the
 * stated ground's, by testimony discipline: the visitor
 * never stated a feeling, so the move may NEVER predicate
 * one of them (no "You are sad." on narrative ground). What
 * it may do is the two things the record itself carries:
 * take the STANCE toward the telling (the sympathy stance
 * the Planner already files, selected from the ground's
 * register and degree exactly as the stated move selects
 * it), and refer to the event AS TOLD — the record's own
 * event clause, under the same S0 admission every event
 * rendering passes (the caller's renderer; a clause that
 * fails admission stands the whole move down — a stance
 * with no renderable object is an empty performance, and
 * the receipt answers the turn instead). Where a telling
 * carries BOTH grounds — a stated feeling riding a
 * narrative event — the stated ground owns the predication
 * and the narrative event supplies the particular through
 * the stated move's own object slot, as UP-1 already
 * composes; this builder serves the narrative ground alone.
 *
 * No templates: the sentences are generated from the
 * ground's own inputs (the stance predication from the
 * register and degree, the event clause from the record),
 * and the no-template audit's narrative arm (the programme's
 * tests) pins that replies across different tellings share
 * only what the shared inputs derive.
 */
export function buildNarrativeUptakeReply(
  ground: NarrativeUptakeGround,
  renderEventClause: (event: EventRecord) => string | undefined,
): { reply: string; stanceLemma: string } | undefined {
  const stanceLemma = stanceLemmaFor(ground.register);
  const stance = planStancePredication({ stanceLemma, degree: ground.degree });
  const clause = renderEventClause(ground.event);
  if (!clause) return undefined;
  return { reply: `${stance.sentence} ${clause}.`, stanceLemma };
}
