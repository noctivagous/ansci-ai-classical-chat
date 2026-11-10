/**
 * disposition.ts — the frame's RIDING ASSUMPTIONS (design §11,
 * disposition subsection; Loop 2 continuation, leaf A1; revised
 * by the template-removal round, leaf T1).
 *
 * A real system carries a stance for the frame of the
 * conversation — "I won't ask much upfront, I'll just listen"
 * vs "I'll ask a certain amount". The same opening line may
 * legitimately be answered many ways depending on this setup.
 * Until leaf A1 those assumptions were scattered and unnamed:
 * the role packs' follow-up stances (roles.ts), the schmooze
 * slot forms (articulate.ts), the classifier's motivation
 * licensing (intent.ts), the pattern sayability gate
 * (solve.ts), the resolver's clarification disposition
 * (roles.ts via discourse.ts). This piece NAMES them and
 * gathers the cross-cutting ones into one record the turn
 * consults.
 *
 * TEMPLATE REMOVAL (T1, owner's order): the disposition once
 * also carried a VALUED-FACTS inventory (age, relation) and a
 * mechanism that generated a question from it ("How old is
 * your sister? And you?"). The owner's correction: the age
 * question was an EXAMPLE of a question arising naturally,
 * not a target to mechanise — a fact inventory that hunts
 * slots is a conversational template, and templates decide
 * what to say from a script. Removed entire: the inventory,
 * the gap computation, and the question form. What remains is
 * INCLINATION ONLY — how readily the entity asks at all, and
 * whether pattern speech is ready or held silent. What (if
 * anything) is worth asking is the adaptive processing's own
 * conclusion, over the situation, the person and the
 * conversation — never this record's.
 *
 * The disposition is SETUP, like the role — not a pipeline
 * stage. Awareness loads it with the rest of the frame
 * (situation, person, role); Context carries it in the
 * operative context; the pieces that conclude consult it as an
 * appetite, never as a schedule (§11: questions come from the
 * adaptive tree; the disposition sets the tree's appetites,
 * never its schedule).
 *
 * Selection: `CSKG_CHAT_DISPOSITION` names a preset, default
 * `balanced`. An unknown name is a configuration error and
 * throws, exactly as an unknown role does — silently running
 * with the wrong stance would be worse than not running.
 */

/** How readily the entity asks the person questions at all. */
export type ElicitationAppetite = "listening" | "balanced" | "gathering";

/**
 * Whether a stated feeling's general pattern (§5's state
 * reaction) may be spoken when it can be said correctly.
 * "ready" is the standing behaviour (the sayability gate in
 * solve.ts decides); "silent" holds the pattern back entirely
 * — the state is still taken up and acknowledged.
 */
export type PatternSpeech = "ready" | "silent";

export interface Disposition {
  elicitation: ElicitationAppetite;
  patternSpeech: PatternSpeech;
}

/** The default: today's behaviour, named. */
export const BALANCED_DISPOSITION: Disposition = {
  elicitation: "balanced",
  patternSpeech: "ready",
};

export const DISPOSITION_PRESETS: Record<string, Disposition> = {
  /** "I won't ask much upfront, I'll just listen." */
  listening: { elicitation: "listening", patternSpeech: "ready" },
  /** The standing setup: the processing decides what is worth asking. */
  balanced: { ...BALANCED_DISPOSITION },
  /** "I'll ask a certain amount" — an appetite, not an inventory:
   *  what is asked must arise from the turn's own processing. */
  gathering: { elicitation: "gathering", patternSpeech: "ready" },
};

/**
 * Load the configured disposition. `CSKG_CHAT_DISPOSITION`
 * names a preset (default "balanced"); the value may also be
 * a JSON object overriding individual fields of the balanced
 * preset, so a judgement script can set one dial at a time.
 */
export function loadDisposition(env: NodeJS.ProcessEnv = process.env): Disposition {
  const raw = (env.CSKG_CHAT_DISPOSITION ?? "").trim();
  if (!raw) return { ...BALANCED_DISPOSITION };
  if (!raw.startsWith("{")) {
    const preset = DISPOSITION_PRESETS[raw.toLowerCase()];
    if (!preset) {
      throw new Error(
        `disposition "${raw}" not found — CSKG_CHAT_DISPOSITION names one of ${Object.keys(DISPOSITION_PRESETS).join(", ")} (or a JSON override)`,
      );
    }
    return { ...preset };
  }
  const over = JSON.parse(raw) as Partial<Disposition>;
  const d: Disposition = { ...BALANCED_DISPOSITION };
  if (over.elicitation !== undefined) {
    if (!["listening", "balanced", "gathering"].includes(over.elicitation)) {
      throw new Error(`disposition: elicitation must be listening|balanced|gathering (got ${JSON.stringify(over.elicitation)})`);
    }
    d.elicitation = over.elicitation;
  }
  if (over.patternSpeech !== undefined) {
    if (!["ready", "silent"].includes(over.patternSpeech)) {
      throw new Error(`disposition: patternSpeech must be ready|silent (got ${JSON.stringify(over.patternSpeech)})`);
    }
    d.patternSpeech = over.patternSpeech;
  }
  return d;
}

/** One line naming the setup, for traces and the operative context. */
export function describeDisposition(d: Disposition): string {
  return `elicitation ${d.elicitation}; pattern speech ${d.patternSpeech}`;
}
