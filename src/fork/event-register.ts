/**
 * event-register.ts — the event-register authority (UN-1 of
 * the narrative-uptake programme, 2026-11-19): a banked
 * table, sibling to the classification table (classify.ts),
 * filing EVENT-KINDS under the uptake family's registers.
 *
 * Why this table exists. Uptake v1 (UP-1) grounded its
 * register only in filed feeling words, and recorded the
 * scope line plainly: event-carried registers with no filed
 * visitor feeling were NOT claimed, because no existing
 * authority files loss / achievement / threat on events, and
 * inventing a verb-list authority on the spot would have
 * been an improvised filing. Probe run 5 priced that line:
 * 17 of cause C1's 19 non-passing probes carry their
 * register narratively — an event, and the visitor's binding
 * to it — so no register stood and no uptake was owed. This
 * table is the authority UP-1's scope line waited for. Its
 * entries are this programme's determination, recorded here
 * in the classification table's manner (each entry carries
 * its ground as a note); fittings judged genuinely
 * contestable were withheld and stand in the programme's
 * report as owner questions, not in the table.
 *
 * THE AXES DOCTRINE (the owner's ruling, 2026-11-19,
 * governing this table): the REGISTER (which emotion family)
 * and DEGREE are separate axes, never collapsed — as
 * temperature is never derivable from a material's phase.
 * An entry therefore files two determinations separately:
 * the register (from the event-KIND's correspondence), and
 * the degree (from the kind's weight and the closeness of
 * the visitor's recorded relation to the event's
 * participants — the degreeByCloseness rows). Neither is
 * read off the other: the same register stands at high
 * degree for a parent's death and at low degree for a
 * spoiled plan, and the derivation served with a match
 * names the two determinations apart.
 *
 * THE REGISTERS are the canonical family names of the
 * layered mapping (the owner's determinations, 2026-11-19):
 * the seven emotions are the recognition vocabulary; the
 * five wills are the correspondence layer (joy Fire/heart,
 * anger Wood/liver, pensiveness Earth/spleen, worry
 * Earth/spleen, grief Metal/lung, fear Water/kidney; fright
 * recognised but UNSEATED — no element, no organ — and no
 * entry here targets it). The table's targets are grief,
 * joy and fear: the families event-kinds correspond to.
 * (Anger at a complained-of act and pensiveness at a
 * setback are real correspondences the table does NOT file:
 * the complaint's meeting is the social layer's, and a
 * setback's register without a stated feeling is a fitting
 * this programme judged contestable — both stand as owner
 * questions in the programme's report, withheld, not
 * silently encoded.)
 *
 * THE BINDING is half of every entry: an event-kind files
 * its register only over a participant BOUND to the visitor
 * — by the visitor's own agency or patienthood in the event
 * (self), by recorded relation (a kin noun the telling
 * attributes to the visitor: the possessive in the event's
 * retained surface, or kin standing unattributed in the
 * visitor's own telling, which is the record's grain for
 * told kin), or by possession in the surface ("my job").
 * An event whose participants bind to nobody in the room —
 * the neighbour's father (a competing possessor stands in
 * the surface), the newborn in the news story, the king in
 * the article — matches nothing: P-005's third-party
 * discipline, generalised from feelings to events. The
 * guards are the family's standing ones, restated for
 * events: a modal, subjunctive or negated clause is not a
 * told event (a feared death is not a death), and a telling
 * the same turn occasions by a mediated report (read /
 * heard / watched / learned — IMP-3's discipline) is a
 * report, not an episode of the visitor's own.
 */
import type { EventRecord, Session } from "./session";
import type { ParsedSentence } from "./sentence";
import { wordnetNoun, wordnetVerb } from "./wordnet-lex";

/* ------------------------------------------------------------------ */
/* Kinship and closeness                                               */
/* ------------------------------------------------------------------ */

/** The household/generational core: a death at this
 *  closeness is the register at high degree. */
export const IMMEDIATE_KIN = new Set([
  "parent", "father", "mother", "dad", "mom", "mum",
  "son", "daughter", "child", "husband", "wife", "spouse",
  "brother", "sister", "sibling",
]);

/** Kin beyond the core: the register at the plain degree. */
export const EXTENDED_KIN = new Set([
  "grandparent", "grandfather", "grandmother", "grandchild",
  "grandson", "granddaughter", "uncle", "aunt", "cousin",
  "nephew", "niece",
]);

export const KIN_NOUNS: ReadonlySet<string> = new Set([...IMMEDIATE_KIN, ...EXTENDED_KIN]);

export type BindingCloseness = "self" | "immediate-kin" | "extended-kin" | "possessed-thing";

export interface Binding {
  closeness: BindingCloseness;
  /** The participant lemma the binding runs through. */
  through: string;
  /** How the binding was evidenced, in the record's grain. */
  derivation: string;
}

const COMPETING_POSSESSORS = new Set(["her", "his", "their", "your"]);

function surfaceWords(text: string): string[] {
  return text.toLowerCase().split(/[^a-z']+/).filter(Boolean);
}

/** The surface index of a recorded lemma: the record's
 *  lemmas are singular-normalised, so the surface word may
 *  carry the plural the lemma dropped ("my parents" binds
 *  'parent'). */
function surfaceIndexOf(words: string[], lemma: string): number {
  const exact = words.indexOf(lemma);
  if (exact >= 0) return exact;
  return words.findIndex((w) => w === `${lemma}s` || (w.endsWith("s") && w.slice(0, -1) === lemma));
}

/**
 * The binding of one participant lemma to the visitor, read
 * from the event and its retained surface. The possessive
 * legs read the surface because the record's fields do not
 * carry possession: the surface is the record's own retained
 * telling (the manner IMP-3's disciplines already read
 * retained surfaces in).
 */
export function bindingFor(event: EventRecord, participant: string | undefined): Binding | undefined {
  if (!participant) return undefined;
  if (participant === "you" || participant === "us" || participant === "me") {
    return {
      closeness: "self",
      through: participant,
      derivation: "the participant is the visitor themselves (their own agency or patienthood in the event)",
    };
  }
  const words = surfaceWords(event.text);
  const at = surfaceIndexOf(words, participant);
  const before = at > 0 ? words[at - 1] : undefined;
  if (KIN_NOUNS.has(participant)) {
    const closeness: BindingCloseness = IMMEDIATE_KIN.has(participant) ? "immediate-kin" : "extended-kin";
    if (before === "my" || before === "our") {
      return {
        closeness,
        through: participant,
        derivation: `the telling's own possessive binds the kin to the visitor ("${before} ${participant}" in the retained surface)`,
      };
    }
    if (before && (COMPETING_POSSESSORS.has(before) || before.endsWith("'s"))) {
      return undefined; // attributed to another — the neighbour's father binds to the neighbour
    }
    return {
      closeness,
      through: participant,
      derivation:
        "kin standing unattributed in the visitor's own telling — the record's grain for told kin " +
        "(no competing possessor stands in the surface)",
    };
  }
  // Possession: the participant is the visitor's own, by the
  // surface's possessive ("my job", "our weekend").
  if (at > 0 && (before === "my" || before === "our")) {
    return {
      closeness: "possessed-thing",
      through: participant,
      derivation: `the surface's possessive binds the thing to the visitor ("${before} ${participant}")`,
    };
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* The table                                                           */
/* ------------------------------------------------------------------ */

export type NarrativeDegree = "high" | "plain" | "low";

export interface EventRegisterEntry {
  id: string;
  register: "grief" | "joy" | "fear";
  /** The degree determination, by binding closeness — the
   *  degree axis, filed apart from the register axis. A
   *  closeness the row does not carry does not match at
   *  that closeness. */
  degreeByCloseness: Partial<Record<BindingCloseness, NarrativeDegree>>;
  /** The filing's ground (this programme's determination). */
  note: string;
}

export const EVENT_REGISTER: EventRegisterEntry[] = [
  {
    id: "death-of-a-bound-person",
    register: "grief",
    degreeByCloseness: { "immediate-kin": "high", "extended-kin": "plain" },
    note:
      "a death is grief's event-kind in every filing the system holds (the EmpatheticDialogues situation " +
      "prompts file bereavement under grief/sadness without exception); the degree is the closeness axis — " +
      "the household core at high, wider kin at plain. The dying one is never the visitor: a stated death " +
      "of oneself is figurative or hypothetical, and the modal guard stands it down before this row is read.",
  },
  {
    id: "injury-or-harm-to-a-bound-person",
    register: "grief",
    degreeByCloseness: { self: "plain", "immediate-kin": "plain", "extended-kin": "plain" },
    note:
      "harm befalling the visitor or their kin — the accident, the injury — is met at grief's register at " +
      "the plain degree: the sympathy stance is the family's answer to a hurt, and no filing prices a " +
      "non-fatal harm at a death's weight. (Serious illness reaches the record mostly as states, not " +
      "events; this row's verbs are the harm verbs the event ledger carries.)",
  },
  {
    id: "loss-of-a-bound-person-or-thing",
    register: "grief",
    degreeByCloseness: { "immediate-kin": "high", "extended-kin": "plain", self: "plain", "possessed-thing": "plain" },
    note:
      "losing is grief's other event-kind: a lost person at the death row's degrees (a loss told without " +
      "an outcome is not priced below a death — the telling has not bounded it), a lost possession or " +
      "position at plain. The row requires the lost one bound: losing a stranger's keys is no telling " +
      "of the visitor's.",
  },
  {
    id: "loss-of-ones-job",
    register: "grief",
    degreeByCloseness: { self: "plain" },
    note:
      "dismissal — the visitor as the firing's patient, in the passive/get construction the record " +
      "retains ('I got fired') — is a loss of one's position and files with loss, at plain degree.",
  },
  {
    id: "achievement-of-the-visitor",
    register: "joy",
    degreeByCloseness: { self: "plain" },
    note:
      "an achievement the visitor themselves brought off — passed, won, completed, graduated — is joy's " +
      "event-kind (the congratulation shape of the design's specimens). The row requires a real object: " +
      "a verb-form standing in the object slot ('won't be able' mis-segmented to a 'win' event whose " +
      "theme is 'be') is no achievement, and the object must be a noun the lexicon knows.",
  },
  {
    id: "threat-to-a-bound-person",
    register: "fear",
    degreeByCloseness: { self: "plain", "immediate-kin": "plain", "extended-kin": "plain" },
    note:
      "a threat directed at the visitor or their kin — threatened, attacked, followed — is fear's " +
      "event-kind: the register answers the danger's direction, not an outcome. The threatening party " +
      "must be another: the visitor's own following (of a recipe, of a road) is no threat, and the row " +
      "requires the visitor or their kin in the patient role.",
  },
  {
    id: "ruin-of-the-visitors-own-undertaking",
    register: "grief",
    degreeByCloseness: { self: "low", "possessed-thing": "low" },
    note:
      "the spoiled plan, the ruined weekend — the design's P-027 specimen shape: grief at LOW degree, " +
      "the axes doctrine's own example (a material loss inside the visitor's undertakings, priced below " +
      "a person's harm). At the family's threshold a low-degree narrative mention is receipt matter; " +
      "the row stands in the table because the filing is the authority's content, priced as it files.",
  },
];

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

export interface EventRegisterMatch {
  entry: EventRegisterEntry;
  binding: Binding;
  degree: NarrativeDegree;
  /** The two determinations named apart (the axes doctrine):
   *  the register from the event-kind, the degree from the
   *  kind's weight at the binding's closeness. */
  derivation: string;
}

const HARM_VERBS = new Set(["injure", "hurt", "wound"]);
const ACHIEVEMENT_VERBS = new Set(["pass", "win", "achieve", "complete", "finish", "graduate"]);
const THREAT_VERBS = new Set(["threaten", "attack", "follow"]);
const RUIN_VERBS = new Set(["ruin", "spoil", "wreck"]);

/** Is this participant another person — a third party the
 *  visitor's own harm cannot run through? Read from the
 *  entity ledger's kind, the record's own grain. */
function isOtherPerson(session: Session, lemma: string): boolean {
  if (lemma === "you" || lemma === "us" || lemma === "me") return false;
  if (KIN_NOUNS.has(lemma)) return false;
  return session.entities.some((e) => e.lemma === lemma && e.kind === "person");
}

/**
 * Match one recorded event against the table, on the
 * record's fields and retained surface alone. This is the
 * match the returning test also uses (an earlier event's
 * parse is not retained; its record is). The telling-level
 * guards (mood, negation, mediation) are the caller's —
 * they read the current telling's parse, which only the
 * current event has.
 */
export function matchEventRegister(session: Session, event: EventRecord): EventRegisterMatch | undefined {
  const byId = (id: string): EventRegisterEntry => EVENT_REGISTER.find((e) => e.id === id)!;
  const finish = (entry: EventRegisterEntry, binding: Binding): EventRegisterMatch | undefined => {
    const degree = entry.degreeByCloseness[binding.closeness];
    if (!degree) return undefined;
    return {
      entry,
      binding,
      degree,
      derivation:
        `register axis: the event-kind '${entry.id}' files under ${entry.register} (the event-register ` +
        `authority, entry '${entry.id}'); degree axis: ${degree} — the kind's weight at ${binding.closeness} ` +
        `closeness (${binding.derivation})`,
    };
  };
  const verb = event.verb;

  if (verb === "die") {
    const binding = bindingFor(event, event.agent);
    if (binding && binding.closeness !== "self" && binding.closeness !== "possessed-thing") {
      return finish(byId("death-of-a-bound-person"), binding);
    }
    return undefined;
  }
  if (HARM_VERBS.has(verb)) {
    // The harmed one: the patient where the patient is a
    // person or kin; where the patient is the visitor's own
    // body or a thing and the agent is the visitor, the harm
    // is the visitor's own (I injured my leg).
    const patientBinding = bindingFor(event, event.patient);
    if (patientBinding) return finish(byId("injury-or-harm-to-a-bound-person"), patientBinding);
    if (event.agent === "you" && event.patient && !isOtherPerson(session, event.patient)) {
      return finish(byId("injury-or-harm-to-a-bound-person"), {
        closeness: "self",
        through: event.agent,
        derivation: "the visitor is the event's agent and its patient is their own body or a thing — the harm is the visitor's own",
      });
    }
    return undefined;
  }
  if (verb === "lose") {
    if (event.agent !== "you") return undefined;
    // The lost one stands in the patient or the theme role —
    // the record files it by the verb's frame, and the row
    // reads both.
    const binding = bindingFor(event, event.patient) ?? bindingFor(event, event.theme);
    if (binding) return finish(byId("loss-of-a-bound-person-or-thing"), binding);
    return undefined;
  }
  if (verb === "fire" && event.patient === "you") {
    return finish(byId("loss-of-ones-job"), {
      closeness: "self",
      through: "you",
      derivation: "the visitor stands as the firing's patient",
    });
  }
  if (/\b(got|was|were|am|is|are|been|get) fired\b/.test(event.text.toLowerCase()) && event.agent === "you") {
    return finish(byId("loss-of-ones-job"), {
      closeness: "self",
      through: "you",
      derivation: "the retained surface carries the dismissal construction ('got fired') with the visitor as its subject",
    });
  }
  if (ACHIEVEMENT_VERBS.has(verb)) {
    if (event.agent !== "you") return undefined;
    const object = event.patient ?? event.theme;
    // A real object: a noun the lexicon knows, and not a
    // verb standing in the slot — 'be' carries a stray noun
    // reading in WordNet, so the noun test alone would pass
    // the 'won't be able' phantom; the verb test closes it.
    if (!object || object === "be" || wordnetNoun(object) === undefined || wordnetVerb(object) !== undefined) {
      return undefined;
    }
    return finish(byId("achievement-of-the-visitor"), {
      closeness: "self",
      through: "you",
      derivation: `the visitor is the achievement's agent, and its object ('${object}') is a noun the lexicon knows and no verb — a real object, not a verb-form in the slot`,
    });
  }
  if (THREAT_VERBS.has(verb)) {
    if (!event.agent || event.agent === "you") return undefined;
    const binding = bindingFor(event, event.patient);
    if (binding) return finish(byId("threat-to-a-bound-person"), binding);
    return undefined;
  }
  if (RUIN_VERBS.has(verb)) {
    const binding = bindingFor(event, event.patient) ?? bindingFor(event, event.theme);
    if (binding && (binding.closeness === "possessed-thing" || binding.closeness === "self")) {
      return finish(byId("ruin-of-the-visitors-own-undertaking"), binding);
    }
    return undefined;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* The telling-level guards                                            */
/* ------------------------------------------------------------------ */

/** Mediated-report verbs (IMP-3's set, restated for the
 *  event side): a telling occasioned by one of these is a
 *  report of the world, not an episode of the visitor's. */
export const NARRATIVE_REPORT_VERBS = new Set(["read", "hear", "watch", "learn"]);

/**
 * The guards on a CURRENT telling's event, read from its
 * parse and the turn's record: the clause must stand as a
 * told event (indicative, unnegated — a feared or averted
 * death is not a death), and no mediated-report event of the
 * visitor's on the same turn may occasion it. Returns the
 * stand-down reason, or undefined when the telling stands.
 */
export function narrativeGuard(
  session: Session,
  event: EventRecord,
  parsed: ParsedSentence,
): string | undefined {
  const root = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);
  const mood = root?.states?.mood ?? "indicative";
  if (mood !== "indicative") {
    return `the telling's clause stands in the ${mood} mood — a supposed or wished event is not a told event`;
  }
  if (root?.states?.negated) {
    return "the telling's clause stands negated — an averted event is not a told event";
  }
  const mediated = session.events.find(
    (e) => e.turn === event.turn && e.agent === "you" && NARRATIVE_REPORT_VERBS.has(e.verb) && e !== event,
  );
  if (mediated) {
    return `the telling is occasioned by a mediated report ('${mediated.verb}') on its own turn — a report, not an episode of the visitor's (IMP-3's discipline)`;
  }
  return undefined;
}
