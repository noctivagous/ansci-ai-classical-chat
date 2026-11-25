/**
 * quantification-language.ts — the QuantificationLanguageUnit
 * (lpu/quantification-language-unit): the LPU's bridge to the
 * QuantificationUnit, maintained inside the LPU — the EDU/LEDU
 * pattern, one slice over.
 *
 * INBOUND: quantity as expressed in language — numerals and
 * number words, quantifier words, construction-implied counts,
 * unit words — read from the parse and handed to the
 * QuantificationUnit (quantification.ts) as QuantityMentions,
 * which SemanticAssessment attaches to the object at creation
 * and the turn loop applies to the Session's ledger.
 *
 * OUTBOUND: a tracked quantity rendered back into language —
 * number words and counted kinds ("two apples") — for answers
 * (the how-many reader in turn.ts speaks through here).
 *
 * The mapping is language's; the framework is the
 * QuantificationUnit's. What the bridge files is language's
 * own knowledge: which words are numerals, which words
 * quantify, how a counted kind is named. What a number FILES
 * AS (its phase in the OKU Numbers slice) comes from the
 * authority, attached to the mention as its reading — never
 * decided here.
 *
 * EXTRACTION GRAIN (stated plainly): the bridge reads the
 * shapes the sentence layer actually produces, verified
 * against the parser (2026-11-17): a numeral stands as a node
 * under the verb (have's theme, buy's patient, give's theme),
 * the counted kind as a sibling Earth node (usually the
 * verb's patient), a pronoun's stock as a modifier of the
 * numeral ("3 of them"). Compound number words ("twenty
 * five") are two nodes to the parser and are NOT composed
 * here — a stated limitation, not a silent gap.
 */
import type { ParsedSentence, MeaningNode } from "./sentence";
import { holderOf } from "./session";
import {
  numberReading,
  type QuantityMention,
} from "./quantification";
import { unitForWord } from "./units-measurement";

/* ------------------------------------------------------------------ */
/* Numerals: language's table                                          */
/* ------------------------------------------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
};

/**
 * Ordinals (LUIS Ordinal checklist) live in ordinal-words.ts
 * — a leaf module, because the sentence layer's token
 * recognition reads the same table and cannot import this
 * bridge (which imports the session). Re-exported here so
 * the bridge stays the LPU's address for language's
 * numbers; ordinals are NOT amounts and never name a
 * counted kind, enforced below.
 */
import { parseOrdinalToken } from "./ordinal-words";

export { parseOrdinalToken };

/** A token's number, if it is one: a digit string ("5", up to
 *  and past 9999) or a number word (one..ninety, hundred,
 *  thousand standing alone). Compound forms are not composed
 *  (see the header). */
export function parseNumberToken(token: string): number | undefined {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) return Number.parseInt(t, 10);
  return NUMBER_WORDS[t];
}

/** A number as language says it: words up to twenty, digits
 *  beyond — the outbound grain for answers. */
export function numberWord(n: number): string {
  const w = Object.entries(NUMBER_WORDS).find(([, v]) => v === n)?.[0];
  return w ?? String(n);
}

/* ------------------------------------------------------------------ */
/* Quantifiers: quantity kinds without numbers                         */
/* ------------------------------------------------------------------ */

export interface QuantifierKind {
  quantifier: string;
  /** The amount the quantifier fixes, where it fixes one
   *  ("none" → 0). Null where it bounds without numbering. */
  amount: number | null;
  /** What the quantifier says, as a bound. */
  bound: string;
}

const QUANTIFIERS: Record<string, QuantifierKind> = {
  all: { quantifier: "all", amount: null, bound: "the whole of the kind in view" },
  some: { quantifier: "some", amount: null, bound: "at least one, no number said" },
  none: { quantifier: "none", amount: 0, bound: "zero — the kind is held not at all" },
  no: { quantifier: "none", amount: 0, bound: "zero — the kind is held not at all" },
  each: { quantifier: "each", amount: null, bound: "distributive: every one of the kind, taken singly" },
  every: { quantifier: "every", amount: null, bound: "distributive: every one of the kind, taken singly" },
};

export function quantifierKind(word: string): QuantifierKind | undefined {
  return QUANTIFIERS[word.toLowerCase()];
}

/* ------------------------------------------------------------------ */
/* Kinds: how a counted noun is named in the ledger                    */
/* ------------------------------------------------------------------ */

const KIND_EXCEPTIONS = new Set(["news"]);

/** The ledger's grain for a counted kind: the noun's lemma,
 *  singular-normalised ("bananas" → "banana", "apples" →
 *  "apple"), so a stated stock and a later question name the
 *  same kind. The parse's own entity grain is untouched —
 *  this normalisation is the ledger's, and it lives here
 *  because naming kinds is language's work. */
/**
 * Currency and percent synonyms (LUIS Currency/Percentage
 * checklist): surface forms naming the same counted kind.
 * "Bucks" are dollars — the colloquial name, not a second
 * kind — and "percentage" is "percent". Rates between
 * currencies are NOT filed: no FX table stands anywhere,
 * so dollars and euros stay distinct kinds that never
 * convert.
 */
const KIND_SYNONYMS: Record<string, string> = {
  $: "dollar",
  "¢": "cent",
  "%": "percent",
  buck: "dollar",
  percentage: "percent",
};

export function normaliseKind(lemma: string): string {
  const raw = lemma.toLowerCase();
  if (KIND_EXCEPTIONS.has(raw)) return raw;
  if (KIND_SYNONYMS[raw] !== undefined) return KIND_SYNONYMS[raw];
  if (raw.length > 3 && raw.endsWith("s") && !raw.endsWith("ss")) {
    const singular = raw.slice(0, -1);
    return KIND_SYNONYMS[singular] ?? singular;
  }
  return raw;
}

/**
 * A kind named in the plural ("apple" → "apples").
 * "Percent" is uncountable in this position ("fifty
 * percent", never "percents").
 */
export function pluraliseKind(kind: string): string {
  if (kind === "percent") return kind;
  return kind.endsWith("s") ? kind : `${kind}s`;
}

/** A tracked quantity as language: "two apples", "5 apples",
 *  "one apple". The outbound rendering the how-many reader
 *  speaks. */
export function renderQuantity(amount: number, kind: string): string {
  return `${numberWord(amount)} ${amount === 1 ? kind : pluraliseKind(kind)}`;
}

/* ------------------------------------------------------------------ */
/* Inbound: a parse's quantity mentions                                */
/* ------------------------------------------------------------------ */

const PRONOUNS = new Set(["i", "you", "he", "she", "him", "her", "it", "them", "we", "they", "me", "us"]);
const QUESTION_WORDS = new Set(["how", "what", "who", "where", "when", "which", "why"]);

function nodeById(parsed: ParsedSentence, id: string): MeaningNode | undefined {
  return parsed.meaning.nodes.find((n) => n.id === id);
}

function targetsOf(parsed: ParsedSentence, fromId: string, relation: string): MeaningNode[] {
  return parsed.meaning.edges
    .filter((e) => e.from === fromId && e.relation === relation)
    .map((e) => nodeById(parsed, e.to))
    .filter((n): n is MeaningNode => Boolean(n));
}

/**
 * Read a parsed sentence's quantity mentions. Pure — reads
 * the parse only; the ledger application is the authority's
 * (applyQuantityMentions in quantification.ts), run by the
 * turn loop after the object is recorded, as the scene
 * update is.
 */
/** The verbs whose quantity semantics the authority wires
 *  (quantification.ts): have states, buy gains/transfers,
 *  give transfers. Mentions are produced for these only —
 *  a numeral under another verb is the sentence's business,
 *  not the ledger's, in this slice. */
const QUANTITY_VERBS = new Set(["have", "buy", "give"]);

export function computeQuantityMentions(parsed: ParsedSentence): QuantityMention[] {
  const root = nodeById(parsed, parsed.meaning.rootId);
  if (!root || root.role !== "verb") return [];
  const verb = root.lemma.toLowerCase();
  if (!QUANTITY_VERBS.has(verb)) return [];

  const agent = targetsOf(parsed, root.id, "agent")[0];
  if (!agent) return [];
  const holder = holderOf(agent.lemma.toLowerCase());
  // A question's mangled parse ("How many…" leaves 'How' as
  // the agent) carries no quantity statement — the how-many
  // READER handles those turns from the ledger, elsewhere.
  if (QUESTION_WORDS.has(agent.lemma.toLowerCase())) return [];

  // The verb's own argument nodes (any relation), in parse order.
  const argNodes: { relation: string; node: MeaningNode }[] = [];
  for (const e of parsed.meaning.edges) {
    if (e.from !== root.id) continue;
    const node = nodeById(parsed, e.to);
    if (node) argNodes.push({ relation: e.relation, node });
  }

  const numeralNodes = argNodes
    .map((x) => x.node)
    .filter((n) => parseNumberToken(n.lemma) !== undefined);

  // Unit words among the arguments (a node the UnitsMeasurement
  // table names) — excluded from kind candidacy below.
  const unitNode = argNodes.map((x) => x.node).find((n) => unitForWord(n.lemma));
  const unit = unitNode ? unitForWord(unitNode.lemma)?.id : undefined;

  // The counted kind: an Earth argument node that is not the
  // agent, a numeral, an ordinal, a pronoun, a quantifier or
  // a unit. Ordinals rank; they never name a counted kind.
  const kindNode = argNodes
    .map((x) => x.node)
    .find(
      (n) =>
        n.syntacticElement === "Earth" &&
        n.id !== agent.id &&
        parseNumberToken(n.lemma) === undefined &&
        parseOrdinalToken(n.lemma) === undefined &&
        !PRONOUNS.has(n.lemma.toLowerCase()) &&
        !quantifierKind(n.lemma) &&
        !unitForWord(n.lemma),
    );
  const kind = kindNode ? normaliseKind(kindNode.lemma) : undefined;

  // The numeral rides on the kind, not the verb: "fifty
  // apples" and "fifty percent" both draw the numeral
  // qualifying the kind node (the probe reads n4 -qualifies->
  // n3). Where the verb carries no numeral of its own, the
  // kind's qualifying numeral is the amount; an ordinal there
  // ("the first apple") is rank, never an amount — the
  // filter below only admits numerals, exactly as above.
  let amountNodes = numeralNodes;
  if (amountNodes.length === 0 && kindNode) {
    amountNodes = parsed.meaning.edges
      .filter((e) => e.to === kindNode.id && e.relation === "qualifies")
      .map((e) => nodeById(parsed, e.from))
      .filter((n): n is MeaningNode => !!n && parseNumberToken(n.lemma) !== undefined);
  }

  // The recipient of a transfer verb: a recipient/goal
  // argument that is a person or pronoun (not the numeral,
  // not the kind — the parser's ditransitive shapes put the
  // numeral in the recipient slot in one of give's two forms).
  const recipientNode = argNodes
    .filter((x) => x.relation === "recipient" || x.relation === "goal")
    .map((x) => x.node)
    .find(
      (n) =>
        parseNumberToken(n.lemma) === undefined &&
        n.id !== kindNode?.id &&
        (PRONOUNS.has(n.lemma.toLowerCase()) || n.syntacticElement === "Earth"),
    );
  const recipient = recipientNode ? holderOf(recipientNode.lemma.toLowerCase()) : undefined;

  const mentions: QuantityMention[] = [];
  const base = {
    verb,
    holder,
    ...(recipient ? { recipient } : {}),
    ...(unit ? { unit } : {}),
  };

  if (amountNodes.length) {
    for (const n of amountNodes) {
      const amount = parseNumberToken(n.lemma)!;
      // A pronoun's stock: the numeral's modifier is a pronoun
      // ("3 of them") — the kind is the pronoun's, resolved
      // against the ledger at apply time.
      const stockTarget = targetsOf(parsed, n.id, "modifier")[0];
      const pronounStock = Boolean(stockTarget && PRONOUNS.has(stockTarget.lemma.toLowerCase()));
      const reading = numberReading(amount);
      mentions.push({
        ...base,
        amount,
        numeralWord: n.form ?? n.lemma,
        ...(pronounStock ? { pronounStock: true } : kind ? { kind } : {}),
        ...(reading ? { reading } : {}),
      });
    }
    return mentions;
  }

  // No numeral: a quantifier among the arguments (any edge —
  // the parser files "some" as a result, "no" as a theme,
  // "all" as a modulator of the verb), or, for have, the bare
  // plural's implied bound.
  const quantNode = parsed.meaning.nodes.find((n) => n.id !== root.id && quantifierKind(n.lemma));
  if (quantNode && kind) {
    mentions.push({ ...base, quantifier: quantifierKind(quantNode.lemma)!.quantifier, kind });
    return mentions;
  }
  if (verb === "have" && kind) {
    mentions.push({ ...base, quantifier: "plural", kind });
  }
  return mentions;
}
