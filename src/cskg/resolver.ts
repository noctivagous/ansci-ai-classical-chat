/**
 * resolver.ts — the AmbiguityResolver (design §5; E4 Part 4).
 *
 * A submodule used by discourse and by solve, for the turns
 * where a mention or a term carries RIVAL READINGS. It first
 * tries to RESOLVE the rivals on two grounds, in this order:
 *
 *   1. WHAT THE PERSON SAID — the conversation's history and
 *      the person model: established topics, earlier usage,
 *      corrections and clarifications on record. A reading the
 *      person themselves settled is answered silently.
 *   2. COMMON SENSE — EverydaySense's default: the ordinary
 *      reading, absent any cue to the contrary.
 *
 * Only when resolution fails or stays too close does it
 * escalate to the clarification DECISION, taken over the whole
 * situation, not the ambiguity score alone: the score gap, the
 * semantic distance between the rivals (different filing
 * clusters are different worlds; near-synonyms cost nothing),
 * topic gravity (a reading that continues the active topic),
 * cost asymmetry (a wrong casual acknowledgement is cheap; a
 * wrong answer to a direct question wastes the person's turn),
 * the interruption budget (clarifications already asked; NEVER
 * two in a row), the role's clarification disposition, and the
 * person's history.
 *
 * Outputs: ANSWER (silently, the common case), ANSWER NAMING
 * THE READING, or ASK — an ask carries pre-mapped branches and
 * sets a pending clarification in memory that the next turn
 * resolves before new analysis (memory.ts, turn.ts). The
 * verdict carries the chosen reading's standing tuple
 * (standing.ts): certainty from the winner's share of the
 * evidence, clarity from the gap, knownnessFelt from the
 * conversation's own activity — and articulation's admissions
 * read off those axes.
 */
import type { ClarificationDisposition } from "./roles";
import {
  clarityFromGap,
  type Standing,
} from "./standing";

export interface RivalReading {
  /** stable key for the reading (a synset id, a term id as text, …) */
  key: string;
  /** the reading's label, as a person would name it */
  label: string;
  /** the reading's evidence score, on the caller's scale */
  score: number;
  /** the reading's EverydaySense filing cluster anchor, when known */
  cluster: string | null;
  /** the reading continues the conversation's active topic */
  gravity: boolean;
}

export interface ResolverInput {
  rivals: RivalReading[];
  /** ground 1: the key history/person settles on, if any */
  historyKey?: string | null;
  /** ground 2: EverydaySense's default key, if it has one */
  everydayKey?: string | null;
  /** a direct question's wrong answer costs more than a statement's */
  stakes: "question" | "statement";
  /** the role's clarification disposition */
  disposition: ClarificationDisposition;
  /** clarifications already asked this conversation */
  asksUsed: number;
  /** the previous turn ended in an ask — never two in a row */
  askedLastTurn: boolean;
  /** felt knownness per rival key, from the conversation's activity */
  knownness?: Record<string, number>;
}

export type ResolverGround = "history" | "everydaysense" | "score" | "escalation";

export interface ResolverVerdict {
  action: "answer" | "name" | "ask";
  /** the chosen rival's key (answer/name); null for an ask */
  key: string | null;
  ground: ResolverGround;
  /** the reasoning, for the trace */
  reason: string;
  /** the chosen reading's standing (for an ask: the situation's) */
  standing: Standing;
  /** the rivals, best first, as the verdict saw them */
  ranked: RivalReading[];
}

/**
 * The score gap at which a reading is simply answered, by
 * disposition: a role that asks SPARINGLY accepts thinner
 * evidence before answering; a role that asks READILY holds
 * out for a clearer lead. (On the caller's score scale —
 * callers normalise: definition sense scores run 0–36,
 * discourse candidate scores run wider; both dwarf these.)
 */
const ANSWER_GAP: Record<ClarificationDisposition, number> = {
  ready: 3,
  moderate: 2,
  sparing: 1,
};

/** Clarifications a conversation will bear before naming instead. */
const ASK_BUDGET = 3;

export function resolveRivalReadings(input: ResolverInput): ResolverVerdict {
  const ranked = input.rivals
    .slice()
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  const top = ranked[0];
  const second = ranked[1];
  const gap = second ? top.score - second.score : top.score;
  const totalScore = ranked.reduce((s, r) => s + Math.max(0, r.score), 0);
  const standingOf = (r: RivalReading): Standing => ({
    certainty: totalScore > 0 ? Math.max(0, Math.min(0.95, r.score / totalScore + 0.25)) : 0.3,
    clarity: clarityFromGap(r === top ? gap : 0),
    knownnessFelt: input.knownness?.[r.key] ?? 0,
  });

  // Ground 1 — what the person said. A settled reading is
  // answered silently, even when it is not the score leader:
  // the person's own usage outranks the graph's statistics.
  if (input.historyKey) {
    const settled = ranked.find((r) => r.key === input.historyKey);
    if (settled) {
      return {
        action: "answer",
        key: settled.key,
        ground: "history",
        reason: `history settles it: "${settled.label}" is the reading on record`,
        standing: { ...standingOf(settled), certainty: Math.max(standingOf(settled).certainty, 0.8) },
        ranked,
      };
    }
  }

  // A clear lead answers on score — and when the leader IS
  // EverydaySense's default, the ground is common sense.
  if (!second || gap >= ANSWER_GAP[input.disposition]) {
    const es = input.everydayKey === top.key;
    return {
      action: "answer",
      key: top.key,
      ground: es ? "everydaysense" : "score",
      reason: second
        ? `score gap ${gap.toFixed(1)} ≥ ${ANSWER_GAP[input.disposition]} (${input.disposition}) — "${top.label}" leads` +
          (es ? "; the leader is EverydaySense's default" : "")
        : `only one reading attested — "${top.label}"`,
      standing: standingOf(top),
      ranked,
    };
  }

  // Ground 2 — common sense breaks a near-tie: when
  // EverydaySense has a default and it is within reach of the
  // leader, the ordinary reading is the answer.
  if (input.everydayKey) {
    const es = ranked.find((r) => r.key === input.everydayKey);
    if (es && top.score - es.score <= 0.6) {
      return {
        action: "answer",
        key: es.key,
        ground: "everydaysense",
        reason: `near-tie (gap ${gap.toFixed(1)}); EverydaySense's default "${es.label}" breaks it`,
        standing: standingOf(es),
        ranked,
      };
    }
  }

  // Escalation — the whole-situation decision. Semantic
  // distance: rivals from different filing clusters are
  // different worlds (a wrong pick derails); rivals sharing a
  // cluster are near-synonyms (a wrong pick costs nothing).
  const far =
    top.cluster !== null && second.cluster !== null && top.cluster !== second.cluster;
  const gravitySettles = top.gravity && !second.gravity;
  if (gravitySettles) {
    return {
      action: "answer",
      key: top.key,
      ground: "escalation",
      reason: `close scores, but topic gravity settles it: "${top.label}" continues the active topic`,
      standing: standingOf(top),
      ranked,
    };
  }
  const budgetOk = !input.askedLastTurn && input.asksUsed < ASK_BUDGET;
  const askWorthy =
    far &&
    input.stakes === "question" &&
    budgetOk &&
    (input.disposition !== "sparing" || gap < 0.5);
  if (askWorthy) {
    return {
      action: "ask",
      key: null,
      ground: "escalation",
      reason:
        `near-tie (gap ${gap.toFixed(1)}) between different worlds ("${top.label}" / "${second.label}"), ` +
        `a direct question at stake, budget open (${input.asksUsed}/${ASK_BUDGET} used) — ask`,
      standing: {
        certainty: standingOf(top).certainty,
        clarity: clarityFromGap(gap),
        knownnessFelt: Math.max(...ranked.map((r) => input.knownness?.[r.key] ?? 0)),
      },
      ranked,
    };
  }
  const whyNotAsk = input.askedLastTurn
    ? "never two asks in a row"
    : input.asksUsed >= ASK_BUDGET
      ? "the interruption budget is spent"
      : !far
        ? "the rivals are near in meaning — a wrong pick costs little"
        : input.stakes === "statement"
          ? "a statement's acknowledgement is cheap to correct"
          : `the ${input.disposition} role does not spend an interruption here`;
  return {
    action: "name",
    key: top.key,
    ground: "escalation",
    reason: `near-tie (gap ${gap.toFixed(1)}); naming the reading taken — ${whyNotAsk}`,
    standing: standingOf(top),
    ranked,
  };
}
