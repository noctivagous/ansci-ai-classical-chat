/**
 * parse.ts — inward: connective graph → meaning graph.
 *
 * Lexicon- and template-driven over the evaluated vocabulary (see
 * sentence.ts). The mechanisms are the point, not coverage:
 *  - slot filling from connective templates (EN SVO, ZH SVO) against
 *    verb-lexicon valency frames;
 *  - passive as a voice STATE on the same meaning graph as the active;
 *  - verbless predication by cycle entry at Fire/Earth (R1): a cycle
 *    has no privileged entry point, so a clause may enter at the
 *    predicate instead of at a dummy verb;
 *  - interrogative force as clause-level modification (R2);
 *  - clause chaining at the generating cycle's Water→Wood closure
 *    (serial verbs, then/jiù);
 *  - ZH aspect/question particles as clause-scope attachments,
 *    recorded in surface order for the scope-order check (R7);
 *  - classifier generation (Earth→Metal) for counted ZH nouns;
 *  - A-not-A question formation (one interrogative force, realised
 *    by verb repetition under negation).
 * Repair tranche additions:
 *  - nominal predication: an Earth topic predicated as an Earth
 *    nominal takes the declared 'predicated-as' relation (ZH zero
 *    copula: 今天星期一； EN: the copula is its connective realisation).
 *    The relation is an architectural addition, not a cycle edge.
 *  - agentless passives keep the suppressed valency slots DECLARED on
 *    the predicate's states (suppressedRoles) instead of dropping
 *    them: the slot exists, unrealised (repair H1's representation).
 * Ungrammatical input is parsed best-effort; check.ts names what the
 * controlling cycle rejects.
 */
import {
  AspectBundle,
  ConnectiveGraph,
  EN_LEXICON,
  Language,
  MeaningEdge,
  MeaningGraph,
  MeaningNode,
  ParsedSentence,
  Relation,
  VerbEntry,
  ZH_FUNCTION,
  ZH_LEXICON,
  cycleOf,
  type LexEntry,
} from "./sentence";
import { registerDerivedEntry, wordnetAdjective, wordnetAdverb, wordnetNoun, wordnetVerb } from "./wordnet-lex";
import { linkgrammarNounOnly } from "./linkgrammar-lex";
import { solveLinkage, linkageRouting, setLinkageRouting } from "./linkage";

export { setLinkageRouting } from "./linkage";

/** The routing read: a solver failure is a routing silence,
 *  never a parse failure. */
function safeSolveLinkage(tokens: string[]) {
  try {
    const s = solveLinkage(tokens);
    return s && s.status === "complete" ? s : undefined;
  } catch {
    return undefined;
  }
}
import { resolveTokenList, type TokenClass } from "./token-resolve";
import { lookupClassification } from "./classify";
import { applySenseSelection } from "./sense";
import { zhAspectFor, zhPreverbalAspectFor } from "./aspect";

class Builder {
  nodes: MeaningNode[] = [];
  edges: MeaningEdge[] = [];
  realizes: Record<string, number[]> = {};
  private seq = 0;

  node(partial: Omit<MeaningNode, "id">, tokens: number[] = []): MeaningNode {
    const node: MeaningNode = { id: `n${++this.seq}`, ...partial };
    this.nodes.push(node);
    this.realizes[node.id] = tokens;
    return node;
  }
  edge(from: MeaningNode, to: MeaningNode, relation: Relation, marker?: string, element?: MeaningNode["syntacticElement"]): void {
    this.edges.push({
      from: from.id,
      to: to.id,
      relation,
      cycle: cycleOf(from.syntacticElement, to.syntacticElement),
      ...(marker ? { marker } : {}),
      ...(element ? { element } : {}),
    });
  }
  graph(root: MeaningNode): MeaningGraph {
    return { nodes: this.nodes, edges: this.edges, rootId: root.id, entryElement: root.syntacticElement };
  }
}

/** The predication relation for a copula/verbless-entry clause: an
 *  Earth (nominal) predicate takes the declared 'predicated-as'
 *  relation; a Fire (adjectival) predicate keeps 'predicate' (R1). */
function predRelation(root: MeaningNode): Relation {
  return root.syntacticElement === "Earth" ? "predicated-as" : "predicate";
}

function connective(
  language: Language,
  tokens: string[],
  spans: ConnectiveGraph["spans"],
  topicTokenIndex?: number,
  scaffolding?: { index: number; kind: string }[],
): ConnectiveGraph {
  return {
    language,
    tokens,
    next: tokens.map((_, i) => (i + 1 < tokens.length ? i + 1 : -1)),
    spans,
    ...(topicTokenIndex !== undefined ? { topicTokenIndex } : {}),
    ...(scaffolding && scaffolding.length ? { scaffolding } : {}),
  };
}

/* ================= English ================= */

interface EnItem {
  text: string;
  lower: string;
  index: number;
  kind: string; // det|prep|aux|be|neg|<lexicon kind>|proper
  entry?: LexEntry;
  formTag?: string;
}

const EN_DET = new Set(["the", "a", "an", "my", "his", "her", "that", "this", "more"]);
const EN_PREP = new Set(["on", "in", "by", "to", "with", "past", "at", "from"]);
const EN_BE: Record<string, "present" | "past"> = { is: "present", are: "present", am: "present", was: "past", were: "past" };
const EN_AUX = new Set(["had", "did", "does", "do", "has", "have", "can"]);
const EN_WH = new Set(["what", "who", "where", "when", "which"]);
const EN_MODAL = new Set(["would", "could", "should"]);

/**
 * Whether a word is one of the closed-class function words —
 * the parser's own closed sets above, the pronoun-kind entries
 * of the hand lexicon, and the closed particle/adverb set
 * stated here. Exported for the turn layer's clarification
 * discipline (conversation-shapes C4, 2026-11-18): a function
 * word offered as a spelling rival ("too" beside "took") is
 * not a reading the visitor could have meant as a content
 * choice, so it is not genuine doubt.
 */
const EN_PARTICLES = new Set([
  "too", "so", "very", "much", "just", "also", "not", "n't", "there", "here", "then", "now",
  "as", "if", "than", "but", "and", "or", "of", "for", "about", "into", "over", "under",
  "again", "once", "how", "why", "when", "while", "because", "per", "via",
]);
export function enIsFunctionWord(lower: string): boolean {
  if (
    EN_DET.has(lower) ||
    EN_PREP.has(lower) ||
    EN_AUX.has(lower) ||
    EN_WH.has(lower) ||
    EN_MODAL.has(lower) ||
    lower in EN_BE ||
    EN_PARTICLES.has(lower)
  ) {
    return true;
  }
  const entry = EN_LEXICON[lower];
  return entry?.kind === "pronoun";
}

/** The -ing form of a verb lemma (rain -> raining, make -> making). */
export function ingForm(lemma: string): string {
  if (/[^aeiou]e$/.test(lemma)) return lemma.slice(0, -1) + "ing";
  // Final-consonant doubling after a single short vowel, the same
  // rule as regularPast (swim -> swimming, stop -> stopping).
  // Multi-syllable cases (begin -> beginning) turn on stress, which
  // this rule cannot see; they stay undoubled — a recorded limit.
  if (/^[^aeiou]*[aeiou][^aeiouwx]$/.test(lemma)) return lemma + lemma.slice(-1) + "ing";
  return lemma + "ing";
}

/**
 * Structural question onset (Probe-2 Slice 1, 2026-11-20;
 * diagnostic SD1; owner ruling: questions without "?" should
 * be detected). Interrogative mood was a per-branch accident:
 * the tokeniser computed one punctuation flag — a terminal
 * "?" — and each parse branch then re-decided the clause's
 * mood, the wh-copular / wh-verbal / why branches hard-coding
 * interrogative and every other branch inheriting the flag.
 * So a wh-question survived losing its "?" and a how-, do- or
 * yes/no question did not: "how are you" without the mark was
 * assessed as a statement and acknowledged ("Ok. Noted."),
 * its content banked as an assertion. The layer decision now
 * lives here, taken from the sentence's FORM over the resolved
 * token stream: a question-word onset (wh-fronting), or a
 * sentence-initial auxiliary / copula / modal — subject–aux
 * inversion, the form an English yes/no or do-support
 * question takes. The punctuation flag remains one signal,
 * OR-ed with this one at the single call site in parseEn;
 * neither signal alone owns the mood any longer. A statement
 * opens with its subject, not with an auxiliary or a question
 * word, so ordinary statements — with a terminal period or
 * without one — are untouched by the structural signal.
 */
const EN_QUESTION_ONSET = new Set([...EN_WH, "how", "why", "whose", "whom"]);
const EN_INVERSION_ONSET = new Set([
  ...Object.keys(EN_BE),
  ...EN_AUX,
  ...EN_MODAL,
  "will",
  "shall",
  "may",
  "might",
  "must",
]);
/** Discourse openers that scaffold a clause without being its
 *  onset (the same standing the sentence-initial conjunction
 *  already has at the tag-question strip): skipped when the
 *  onset is read. */
const EN_ONSET_SCAFFOLD = new Set([",", "and", "but", "so", "well"]);

export function structuralQuestionOnset(tokens: string[]): boolean {
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (EN_ONSET_SCAFFOLD.has(lower)) continue;
    return EN_QUESTION_ONSET.has(lower) || EN_INVERSION_ONSET.has(lower);
  }
  return false;
}

function enTokenize(text: string): { tokens: string[]; interrogative: boolean } {
  const interrogative = /\?\s*$/.test(text);
  // The glued-comma transcription (IMP-1, the implementation
  // programme, 2026-11-19): the harvested corpora spell a comma
  // as the suffix "_comma_" glued to the word before it
  // ("Yes_comma_", "time_comma_"). A comma spelled that way is
  // a comma — the same punctuation this line has always
  // normalised to a token of its own — and leaving it glued
  // made the word before it an unrecognisable token that sank
  // whole tellings at the token exit (causal analysis C3: most
  // of its twelve primaries carry the suffix on the sinking
  // token). The normalisation lives here, where the comma's
  // own normalisation lives.
  const cleaned = text.trim().replace(/[.?!]\s*$/, "").replace(/_comma_/gi, " , ").replace(/,/g, " , ");
  const raw = cleaned.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const rawToken of raw) {
    // Surface symbols at a token's edges (Probe-2 Slice 3,
    // 2026-11-20; diagnostic IM1): the strip above and the
    // glued split below know only the sentence marks [.?!]
    // and the comma, so any other symbol a surface carries —
    // a stray ">" (the second transcript's typo: "who are
    // you>?"), brackets, quotes, a price's "$", a trailing
    // "%" — rode INTO the token as content: "you>" was not
    // the word "you" to any layer, and only the spelling
    // matcher's luck (a distance-1 correction) saved the
    // turns that survived. Such symbols are the surface's,
    // not the word's — the same standing the sentence marks
    // already have — so a run of them at either edge of a
    // token is removed here, before every other rule reads
    // the token; a token made only of them is dropped. The
    // set is explicit and closed: sentence marks, the comma,
    // the apostrophe and the hyphen are NOT in it (they are
    // grammatical or word-internal, and the rules below own
    // them), and nothing inside a token is touched.
    const t = rawToken
      .replace(/^[><\/\\|@#$%^&*_~`"“”()\[\]{}:;…•·«»—–]+/, "")
      .replace(/[><\/\\|@#$%^&*_~`"“”()\[\]{}:;…•·«»—–]+$/, "");
    if (!t) continue;
    if (/^can't$/i.test(t)) {
      tokens.push("can", "n't"); // can + n't contracts by apostrophe only
    } else if (/^won't$/i.test(t)) {
      tokens.push("will", "n't"); // will + n't: the irregular stem is
      // not "wo" — left to the generic n't rule it produced the stem
      // "wo", which the variant graph then read as the shortform of
      // "without" (IMP-1, 2026-11-19).
    } else if (/n't$/i.test(t) && t.length > 3) {
      tokens.push(t.slice(0, -3), "n't");
    } else if (/^(what|where|when|who|how|it|that|there|he|she)'s$/i.test(t)) {
      // Copula contraction on a question word or pronoun ("what's",
      // "it's"). Possessive 's on a noun is NOT split — the base list
      // is what licenses the split.
      tokens.push(t.slice(0, -2), "is");
    } else if (/^(you|we|they)'re$/i.test(t)) {
      tokens.push(t.slice(0, -3), "are");
    } else if (/^i'm$/i.test(t)) {
      tokens.push("I", "am");
    } else {
      // Sentence punctuation glued to a word mid-text (IMP-1,
      // 2026-11-19): the strip above removes only the text-final
      // mark, so in a multi-sentence surface the inner marks ride
      // on their words ("died.", "wallmart.", "soul-sapping.")
      // and the token layer meets a word-plus-period it cannot
      // file — the matcher luckily corrects some ("died." →
      // "died") and finds nothing for others, and the token exit
      // sinks the turn on the unfiled remainder. The mark is the
      // sentence's, not the word's: split it off as its own
      // token, as the final mark is stripped. A word part that
      // itself contains a period (an abbreviation, "e.g.",
      // "U.S.A.") is not split — its periods are its own.
      const glued = t.match(/^([^.?!]+?)([.?!]+)$/);
      if (glued && /[a-zA-Z]/.test(glued[1]) && !glued[1].includes(".")) {
        tokens.push(glued[1], glued[2]);
      } else {
        tokens.push(t);
      }
    }
  }
  return { tokens, interrogative };
}

function enItems(tokens: string[]): EnItem[] {
  const items = tokens.map((text, index) => {
    const lower = text.toLowerCase();
    const item: EnItem = { text, lower, index, kind: "proper" };
    if (lower === ",") item.kind = "comma";
    else if (EN_WH.has(lower)) item.kind = "wh";
    else if (lower === "why") item.kind = "why";
    else if (EN_MODAL.has(lower)) item.kind = "modal";
    else if (EN_DET.has(lower)) item.kind = "det";
    else if (EN_PREP.has(lower)) item.kind = "prep";
    else if (lower in EN_BE) item.kind = "be";
    else if (EN_AUX.has(lower)) item.kind = "aux";
    else if (lower === "n't" || lower === "not") item.kind = "neg";
    else {
      // Only HAND entries classify from the registry. A derived
      // entry sitting in EN_LEXICON was registered by an earlier
      // adoption (wordnet-lex.ts: registration is adoption), and
      // taking it here would make this word's classification a
      // function of parse history — the lexicon-state family:
      // probe-poisoning, the single-use imperative, the
      // existential reparse crash (2026-11-18). A derived entry
      // is therefore treated as a registry miss and re-derived
      // below, in the fixed precedence, every time.
      const registered = EN_LEXICON[lower];
      const entry = registered && !("source" in registered && registered.source === "wordnet") ? registered : undefined;
      if (entry) {
        item.entry = entry;
        item.kind = entry.kind;
        if (entry.kind === "verb") {
          const f = (entry as VerbEntry).forms;
          item.formTag =
            lower === ingForm(f.base) ? "ing"
            : lower === f.base ? "base" : lower === f.third ? "third" : lower === f.past && lower === f.participle ? "past/participle" : lower === f.past ? "past" : lower === f.participle ? "participle" : "base";
        }
      } else {
        // WordNet provider (wordnet-lex.ts): the hand lexicon missed,
        // so derive a noun entry, else an adjective entry. Verbs are
        // NOT derived here — a surface's POS is positional in this
        // parser, and the verb slot is resolved in parseEn, after the
        // subject chunk is known (a subject noun like 'wind' has verb
        // synsets too and must not be upgraded in place).
        const noun = wordnetNoun(lower);
        if (noun) {
          item.entry = noun;
          item.kind = "noun";
          registerDerivedEntry(noun, lower);
        } else {
          const adj = wordnetAdjective(lower);
          // Adverb derivation sits between the adjective's exact
          // reading and its morphological one (GAPS §6, adverb
          // restoration 2026-11-18): a surface that IS an adverb
          // lemma ('indoors') resolves as the adverb, not as the
          // adjective a stripping rule reaches ('indoor'); a
          // surface that is exactly an adjective lemma ('daily')
          // keeps the adjective; and a merely inflected adjective
          // surface ('colder') still resolves after the adverb
          // check, which has no inflectional readings to offer it.
          // One token is excepted: 'between'. The parser
          // deliberately leaves a between-NODE in the meaning
          // graph (an unclassified token the chunker cannot
          // take, landing as excess), and senses-scening builds
          // its two-landmark relation from that node — an
          // interface recorded in senses-scening.ts. Claiming
          // the token as an adverb (or a preposition) removes
          // the node and the landmark reading with it, so the
          // derivation does not reach it.
          const adv = adj && adj.lemma === lower ? undefined : lower === "between" ? undefined : wordnetAdverb(lower);
          if (adv) {
            item.entry = adv;
            item.kind = "adverb";
            registerDerivedEntry(adv, lower);
          } else if (adj) {
            item.entry = adj;
            item.kind = "adjective";
            registerDerivedEntry(adj, lower);
          }
        }
      }
      // Link Grammar class evidence (linkgrammar-lex.ts, the
      // dictionary slice 2026-11-21): the whole WordNet chain has
      // left this form unclassified — it sits as a "proper" item
      // with no entry, which no chunk can head. Where the Link
      // Grammar dictionary files the form under noun classes
      // ONLY (every entry agrees), that is dictionary evidence
      // the form is a noun, and it settles the classification
      // here: 'screenshot', which the WordNet extract files only
      // as a verb, is a noun in the dictionary, and "I took a
      // screenshot." previously lost its object to the chunker.
      // The evidence is deliberately narrow: it fires only on a
      // complete WordNet miss, only on unanimous noun evidence,
      // and the entry is NOT registered — classification stays a
      // function of the shipped tables, recomputed in this fixed
      // precedence every parse, exactly as the WordNet-derived
      // entries above are re-derived. Verb-only evidence is not
      // applied here: a surface's verb reading is positional in
      // this parser, and the verb slot is resolved in parseEn,
      // after the subject chunk is known.
      if (!item.entry && linkgrammarNounOnly(lower)) {
        item.entry = { kind: "noun", lemma: lower, element: "Earth", source: "linkgrammar" };
        item.kind = "noun";
      }
    }
    return item;
  });
  // "her" is classified as a determiner by EN_DET (the possessive),
  // but it is the object pronoun when no noun phrase can follow it:
  // in "showed her the photo" the next item is another determiner,
  // which no chunk can contain, so the pronoun reading is the only
  // one. Without this, the token was silently dropped by the chunker.
  // "been" after a have-auxiliary is the perfect progressive's (or
  // perfect passive's) be-carrier, never the main verb: left
  // unclassified, the WordNet provider derives a verb entry for it
  // (lemma "be", regular past "bed") and it steals the verb slot
  // from the -ing verb that follows.
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.lower === "been" && items.slice(0, k).some((x) => x.kind === "aux" && ["had", "have", "has"].includes(x.lower))) {
      it.kind = "be";
      it.entry = undefined;
    }
  }
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.lower !== "her" || it.kind !== "det") continue;
    const next = items[k + 1];
    // A "proper" item with no entry is an unknown word wearing
    // the default classification (e.g. "about", whose adverb
    // synsets the extract does not carry) — it is not evidence
    // a noun phrase follows, and counting it suppressed the
    // pronoun re-read in "Tell her about winter." (2026-11-18:
    // her stayed a determiner, the imperative signature's
    // pronoun test failed, and the sentence fell through).
    // An adjective is evidence only when a head follows IT
    // (IMP-2, 2026-11-19): "her red car" keeps the determiner,
    // but a lone adjective heads no noun phrase — "take her
    // away" read 'away' as the phantom NP's head, the chunk
    // failed, and 'her' was dropped whole.
    const afterNext = items[k + 2];
    const headsChunk = (x: EnItem | undefined): boolean =>
      Boolean(x && (x.kind === "noun" || x.kind === "pronoun" || (x.kind === "proper" && x.entry !== undefined)));
    const canHeadChunk = headsChunk(next) || (next?.kind === "adjective" && headsChunk(afterNext));
    if (!canHeadChunk) {
      const entry = EN_LEXICON["her"];
      if (entry) { it.entry = entry; it.kind = "pronoun"; }
    }
  }
  // "that" is classified as a determiner by EN_DET before any
  // lexicon lookup, but it is the demonstrative pronoun when no
  // noun phrase can follow it — sentence-finally, or before an
  // adverb ("Say that again"). A lone determiner cannot chunk,
  // so the token was silently dropped and the clause lost its
  // object ("Why did you say that?" — sealed-run mechanism 8,
  // H-062). The re-read is the "her" precedent above, with the
  // same can-head test: a following noun keeps the demonstrative
  // determiner ("that book"), and a following pronoun subject
  // keeps the relative/complementiser reading ("the book that
  // he read") — the relative branch keys on the word itself,
  // not its kind, so it is unaffected either way. There is no
  // hand pronoun entry for "that"; the pronoun kind alone is
  // what the chunker needs, and the node takes the word as its
  // lemma, unclassified, as the record expects.
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.lower !== "that" || it.kind !== "det") continue;
    const next = items[k + 1];
    const afterNext = items[k + 2];
    const headsChunk = (x: EnItem | undefined): boolean =>
      Boolean(x && (x.kind === "noun" || x.kind === "pronoun" || (x.kind === "proper" && x.entry !== undefined)));
    const canHeadChunk = headsChunk(next) || (next?.kind === "adjective" && headsChunk(afterNext));
    if (!canHeadChunk) {
      it.kind = "pronoun";
      it.entry = undefined;
    }
  }
  // "has/have/had" is classified as an auxiliary by EN_AUX, but it is
  // the main verb (possession) when nothing after it can be the
  // perfect's participle — "She has a cold" failed outright because
  // the sentence then had no verb at all. The test is the same one
  // the verb scan will apply: a later item that is a verb form (hand
  // entry, be-carrier, or WordNet-derivable) keeps the auxiliary
  // reading; otherwise the token is reclassified as the verb "have".
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.kind !== "aux" || !["has", "have", "had"].includes(it.lower)) continue;
    // The scan for the perfect's participle stops at a relative
    // 'that' (E2, the emotional-uptake programme, 2026-11-19): a
    // verb inside a relative clause is the subordinate clause's,
    // not the main clause's participle — "I have a job that I
    // love" kept the auxiliary reading on the strength of
    // 'love', and the sentence then rooted on the relative's
    // verb with the possession dropped. The relative signature
    // is the R5 branch's own: 'that' after a noun or pronoun.
    // A complementiser 'that' (after a verb) does not stop the
    // scan, and neither does the determiner ("that book" —
    // its predecessor is the verb or the auxiliary itself).
    const relBoundary = items.findIndex(
      (x, xi) => xi > k && x.lower === "that" && (items[xi - 1]?.kind === "noun" || items[xi - 1]?.kind === "pronoun"),
    );
    const laterVerbish = items.slice(k + 1, relBoundary === -1 ? undefined : relBoundary).some((x, xi) =>
      x.kind === "verb" || x.kind === "be" || x.entry?.kind === "verb" ||
      // A WordNet verb reading counts only outside a noun chunk: a
      // noun after a determiner ("had a garden" — garden has verb
      // synsets) is the object, not the perfect's participle.
      (items[k + xi]?.kind !== "det" && wordnetVerb(x.lower) !== undefined));
    if (laterVerbish) continue;
    const entry = EN_LEXICON["have"];
    if (entry && entry.kind === "verb") {
      it.kind = "verb";
      it.entry = entry;
      const f = (entry as VerbEntry).forms;
      it.formTag = it.lower === f.third ? "third" : it.lower === f.past ? "past" : "base";
    }
  }
  return items;
}

/**
 * The EN aspect dispatcher (WP4 spec §2): construction families over
 * the bundle. be + V-ing is {ongoing}; have/has/had + participle is
 * {perfect}; both together are {perfect, ongoing}; a simple past with
 * neither marking is {bounded}. Anything else abstains (no bundle).
 */
function enAspectBundle(
  auxItem: EnItem | undefined,
  beItem: EnItem | undefined,
  verbItem: EnItem,
  isPassive: boolean,
  hasBeen: boolean,
): { aspect?: AspectBundle } {
  if (isPassive) return {};
  const perfect = !!auxItem && ["had", "have", "has"].includes(auxItem.lower);
  // "been" is not in EN_BE (it is no copula), so the perfect
  // progressive's be-carrier is detected positionally: a "been"
  // token between the have-auxiliary and the -ing verb.
  const ongoing = (!!beItem || hasBeen) && verbItem.formTag === "ing";
  if (perfect && ongoing) return { aspect: { perfect: true, ongoing: true } };
  if (perfect) return { aspect: { perfect: true } };
  if (ongoing) return { aspect: { ongoing: true } };
  // A did-carrier carries the past itself (F.2: the carrier
  // takes the tense, the verb stays in base form), and a
  // did-carried simple past is bounded by the same rule the
  // past-form branch below applies — the carrier's clause is
  // a completed event, not an unmarked one (sealed-run
  // mechanism 6, H-003/H-062).
  if (auxItem?.lower === "did") return { aspect: { bounded: true } };
  if (verbItem.formTag === "past" || verbItem.formTag === "past/participle") return { aspect: { bounded: true } };
  return {};
}

/** Expected answer type by question word (Part D D1). */
function whExpectedType(wh: string): string {
  switch (wh) {
    case "who": return "person";
    case "where": return "location";
    case "when": return "time";
    case "which": return "selection";
    case "why": return "reason";
    default: return "entity";
  }
}

/* ================= Clausal complements (Transcript Slice 1) =================
 * The construction the diagnostic probe isolated (SD1/IM2/K2):
 * a clause standing as a verb's complement — "do you know who i
 * am?", "i know that you are here." The matrix dispatch below is
 * single-clause and keys its branch on the FIRST be/verb item in
 * the whole token stream, so an embedded clause's copula hijacked
 * the matrix parse (the throw site varied with mood; the cause
 * was constant). The remedy is at the same place: BEFORE the
 * dispatch runs, a clause-taking verb followed immediately by a
 * complementiser ('that') or a wh-word is taken as a matrix verb
 * whose complement is a clause, and the embedded clause is parsed
 * as a clause in its own right, into the same graph, under the
 * 'complement' relation (sentence.ts). The branch is attempted
 * only on that exact signature and falls through whole when the
 * embedded clause does not parse — every sentence it does not
 * claim keeps the reading it has always had.
 *
 * The know-class: 'know' itself (hand entry, clausalComplement)
 * plus the cognition/report verbs the parser can already resolve
 * through the WordNet fallback. The list is the class, stated
 * once here; a verb outside it followed by 'that' keeps the old
 * paths (a relative 'that' follows a noun, never the verb, so it
 * is never this signature in the first place). */

/** Lemmas whose verbs take a clausal complement in this slice,
 *  beyond the hand lexicon's flagged entry ('know'). */
const EN_CLAUSAL_COMPLEMENT_VERBS = new Set([
  "know", "think", "believe", "say", "wonder", "remember",
  "understand", "hope", "forget", "learn", "suppose", "imagine",
  "realize", "realise", "notice", "see", "hear", "feel", "tell", "mean",
]);

function enSubjectPerson(chunk: EnChunk): string {
  return chunk.head.entry && "person" in chunk.head.entry
    ? (chunk.head.entry as { person?: string }).person ?? "3sg"
    : chunk.head.lower.endsWith("s") ? "3pl" : "3sg";
}

/** Resolve an item in verb position to its verb entry: the item's
 *  own entry when it already carries one, else the WordNet
 *  derivation, adopted in place — the verb-slot fallback's own
 *  rule, applied inside an embedded clause. */
function enResolveVerbItem(item: EnItem): VerbEntry | undefined {
  if (item.entry?.kind === "verb") return item.entry as VerbEntry;
  const derived = wordnetVerb(item.lower);
  if (!derived) return undefined;
  const handEntry = EN_LEXICON[derived.lemma];
  const verbEntry = handEntry && handEntry.kind === "verb" && !("source" in handEntry && handEntry.source === "wordnet") ? (handEntry as VerbEntry) : derived;
  const f = verbEntry.forms;
  item.entry = verbEntry;
  item.kind = "verb";
  item.formTag =
    item.lower === ingForm(f.base) ? "ing"
    : item.lower === f.base ? "base" : item.lower === f.third ? "third" : item.lower === f.past && item.lower === f.participle ? "past/participle" : item.lower === f.past ? "past" : item.lower === f.participle ? "participle" : "base";
  registerDerivedEntry(verbEntry);
  return verbEntry;
}

/** The post-verbal argument loop of a verbal clause, shared by an
 *  embedded clause and kept deliberately to the main path's own
 *  rules: bare chunks fill the frame's slots in order, PPs fill
 *  the prep slot or goal/location (with the temporal resolution),
 *  adverbs modulate. Returns false when a bare chunk arrives with
 *  no slot left — an excess the embedded parse does not claim. */
function enFillVerbArgs(b: Builder, root: MeaningNode, verb: VerbEntry, items: EnItem[], start: number, slots?: string[]): boolean {
  const bareSlots = [...(slots ?? verb.slots)];
  let i = start;
  while (i < items.length) {
    const item = items[i];
    if (item.lower === "about") {
      // The about-phrase (Transcript Slice 6): 'about' classifies
      // as an adverb in the item stream (it is not in EN_PREP),
      // so neither the adverb rule below nor the prep rule ever
      // files it as a phrase — position decides, as in the
      // imperative branch: 'about' before a chunk is the
      // preposition, and its topic attaches under the 'about'
      // relation, never as the verb's theme and never as a
      // location. A chunkless 'about' falls through to the
      // adverb reading below ("walking about").
      const c = enChunk(items, i + 1);
      if (c) {
        const n = enNodeFromChunk(b, c.chunk, "about");
        n.prep = "about";
        b.edge(root, n, "about");
        i = c.next;
        continue;
      }
    }
    if (item.kind === "adverb") {
      const aNode = b.node({ lemma: item.entry ? item.entry.lemma : item.lower, form: item.text, syntacticElement: "Water" }, [item.index]);
      b.edge(aNode, root, "modulates");
      i++;
      continue;
    }
    if (item.kind === "prep") {
      const c = enChunk(items, i + 1);
      if (!c) return false;
      let slot = verb.prepSlot && verb.prepSlot.preps.includes(item.lower) ? verb.prepSlot.slot : item.lower === "to" ? "goal" : "location";
      if (slot === "location") {
        const headLemma = c.chunk.head.entry?.lemma ?? c.chunk.head.lower;
        const cls = lookupClassification(headLemma);
        if (cls && (cls.aspect === "season" || cls.aspect === "time")) slot = "time";
      }
      const n = enNodeFromChunk(b, c.chunk, slot);
      n.prep = item.lower;
      b.edge(root, n, slot as Relation);
      i = c.next;
      continue;
    }
    const c = enChunk(items, i);
    if (!c) return false;
    const slot = bareSlots.shift();
    if (!slot) return false;
    const n = enNodeFromChunk(b, c.chunk, slot);
    b.edge(root, n, slot as Relation);
    i = c.next;
  }
  return true;
}

/** A verbal embedded clause: subject chunk + verb + arguments,
 *  built into b; its root is the verb node. */
function enEmbeddedVerbalClause(b: Builder, emb: EnItem[], subjC: { chunk: EnChunk; next: number }, verbPos: number): MeaningNode | null {
  const verbItem = emb[verbPos];
  if (!verbItem) return null;
  const verb = enResolveVerbItem(verbItem);
  if (!verb) return null;
  const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" }, [verbItem.index]);
  root.states = {
    voice: "active",
    tense: verbItem.formTag === "past" || verbItem.formTag === "past/participle" ? "past" : "present",
    verbForm: verbItem.formTag,
    mood: "indicative",
    subjectPerson: enSubjectPerson(subjC.chunk),
  };
  const agent = enNodeFromChunk(b, subjC.chunk, "agent");
  b.edge(root, agent, "agent");
  // A complement-taking embedded verb takes its own clausal
  // complement the same way ("…that you know who i am"): the
  // construction recurses one clause down, as it must if the
  // embedded clause is genuinely parsed as a clause.
  const afterVerb = emb[verbPos + 1];
  const nestedThat = afterVerb?.lower === "that";
  const nestedWh = !!afterVerb && (afterVerb.kind === "wh" || afterVerb.lower === "how");
  if (afterVerb && (nestedThat || nestedWh) && (verb.clausalComplement || EN_CLAUSAL_COMPLEMENT_VERBS.has(verb.lemma))) {
    const nested = enEmbeddedClause(b, emb.slice(verbPos + 1 + (nestedThat ? 1 : 0)));
    if (!nested) return null;
    b.edge(root, nested, "complement", nestedThat ? "that" : undefined);
    return root;
  }
  if (!enFillVerbArgs(b, root, verb, emb, verbPos + 1)) return null;
  return root;
}

/** A copular embedded clause whose subject chunk and copula
 *  position are known: subject + be + complement, the predicate
 *  clause's own shapes (locative PP, NP chunk, adjective). Its
 *  root is the complement node, as in the matrix predicate path. */
function enEmbeddedCopularClause(b: Builder, emb: EnItem[], subjC: { chunk: EnChunk; next: number }, bePos: number): MeaningNode | null {
  const beItem = emb[bePos];
  const subject = enNodeFromChunk(b, subjC.chunk, "subject");
  const person = enSubjectPerson(subjC.chunk);
  const negItem = emb[bePos + 1]?.kind === "neg" ? emb[bePos + 1] : undefined;
  const compAt = bePos + 1 + (negItem ? 1 : 0);
  const firstAfter = emb[compAt];
  if (!firstAfter) return null;
  let root: MeaningNode;
  if (firstAfter.kind === "prep") {
    const pc = enChunk(emb, compAt + 1);
    if (!pc || pc.next !== emb.length) return null;
    root = enNodeFromChunk(b, pc.chunk, "location");
    root.prep = firstAfter.lower;
    root.states = { copulaTense: EN_BE[beItem.lower], mood: "indicative", subjectPerson: person };
    b.edge(subject, root, "location");
    return root;
  }
  const compChunk = enChunk(emb, compAt);
  if (compChunk && compChunk.next === emb.length && (firstAfter.kind === "det" || firstAfter.kind === "noun" || firstAfter.kind === "proper" || firstAfter.kind === "pronoun")) {
    root = enNodeFromChunk(b, compChunk.chunk, "predicate");
  } else {
    const adj = emb.slice(compAt).find((r) => r.kind === "adjective") ??
      emb.slice(compAt).find((r) => r.kind === "noun" && wordnetAdjective(r.lower) !== undefined);
    if (!adj) return null;
    const aEntry = adj.kind === "adjective" ? adj.entry : wordnetAdjective(adj.lower);
    if (adj.kind !== "adjective" && aEntry) registerDerivedEntry(aEntry, adj.lower);
    root = b.node(
      {
        lemma: aEntry ? aEntry.lemma : adj.lower,
        form: adj.text,
        syntacticElement: "Fire",
        ...(aEntry && "semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
        role: "predicate",
      },
      [adj.index],
    );
  }
  root.states = {
    copulaTense: EN_BE[beItem.lower],
    mood: "indicative",
    subjectPerson: person,
    ...(negItem ? { negated: true, negation: { negator: "not", carrier: beItem.lower } } : {}),
  };
  b.edge(subject, root, predRelation(root));
  return root;
}

/**
 * Parse an embedded clause (the items after a matrix verb's
 * complementiser / wh-word) into builder b, returning its root,
 * or null when the clause is none of the shapes this construction
 * claims. Claimed shapes:
 *  - wh-copular with clause-final copula: "who i am",
 *    "where oklahoma is", "what a dog is" — the wh-word is the
 *    embedded clause's questioned predicate/location, its subject
 *    stands between the wh-word and the copula, exactly as the
 *    matrix copular question holds its questioned node as root;
 *  - wh-verbal: "what you know" — the wh-word fills its ordinary
 *    slot in the embedded clause (R3's rule, one clause down);
 *  - plain copular: "you are here", "a dog is an animal";
 *  - plain verbal: "you know dogs".
 * The wh-copular mood is recorded as interrogative on the wh
 * node: the embedded clause IS an indirect question, and the
 * record says so where the clause's own root carries it — the
 * matrix clause's mood lives on the matrix verb and is untouched.
 */
function enEmbeddedClause(b: Builder, emb: EnItem[]): MeaningNode | null {
  if (emb.length < 2) return null;
  const firstEmb = emb[0];
  const isWh = firstEmb.kind === "wh" || firstEmb.lower === "how";
  if (isWh) {
    const last = emb[emb.length - 1];
    if (last.kind === "be" && emb.length >= 3) {
      const subjC = enChunk(emb, 1);
      if (subjC && subjC.next === emb.length - 1) {
        const subject = enNodeFromChunk(b, subjC.chunk, "subject");
        const role = firstEmb.lower === "where" ? "location" : "predicate";
        const whNode = b.node(
          { lemma: firstEmb.lower, form: firstEmb.text, syntacticElement: "Earth", role, questionWord: true },
          [firstEmb.index],
        );
        whNode.states = { copulaTense: EN_BE[last.lower], mood: "interrogative", subjectPerson: enSubjectPerson(subjC.chunk) };
        b.edge(subject, whNode, firstEmb.lower === "where" ? "location" : predRelation(whNode));
        return whNode;
      }
    }
    // Wh-verbal: a subject chunk follows the wh-word and a verb
    // follows the subject; the wh-word fills the verb's first slot.
    const subjC = enChunk(emb, 1);
    if (subjC && subjC.next < emb.length) {
      const verbItem = emb[subjC.next];
      const verb = verbItem ? enResolveVerbItem(verbItem) : undefined;
      if (verb && verbItem) {
        const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" }, [verbItem.index]);
        root.states = {
          voice: "active",
          tense: verbItem.formTag === "past" || verbItem.formTag === "past/participle" ? "past" : "present",
          verbForm: verbItem.formTag,
          mood: "indicative",
          subjectPerson: enSubjectPerson(subjC.chunk),
        };
        const agent = enNodeFromChunk(b, subjC.chunk, "agent");
        b.edge(root, agent, "agent");
        const slot = verb.required[0] ?? verb.slots[0] ?? "patient";
        const whNode = b.node(
          { lemma: firstEmb.lower, form: firstEmb.text, syntacticElement: "Earth", role: slot, questionWord: true },
          [firstEmb.index],
        );
        b.edge(root, whNode, slot as Relation);
        const rest = [...verb.slots];
        const at = rest.indexOf(slot);
        if (at >= 0) rest.splice(at, 1);
        // Remaining arguments fill the slots the wh-word did not.
        const ok = enFillVerbArgs(b, root, verb, emb, subjC.next + 1, rest);
        return ok ? root : null;
      }
    }
    // Wh-subject verbal: "who came …" — the wh-word is the agent.
    const verbItem = emb[1];
    const verb = verbItem ? enResolveVerbItem(verbItem) : undefined;
    if (verb && verbItem) {
      const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" }, [verbItem.index]);
      root.states = {
        voice: "active",
        tense: verbItem.formTag === "past" || verbItem.formTag === "past/participle" ? "past" : "present",
        verbForm: verbItem.formTag,
        mood: "indicative",
        subjectPerson: "3sg",
      };
      const whNode = b.node(
        { lemma: firstEmb.lower, form: firstEmb.text, syntacticElement: "Earth", role: "agent", questionWord: true },
        [firstEmb.index],
      );
      b.edge(root, whNode, "agent");
      return enFillVerbArgs(b, root, verb, emb, 2) ? root : null;
    }
    return null;
  }
  // Plain clause: copular when a copula follows the subject chunk,
  // verbal when a verb does.
  const subjC = enChunk(emb, 0, true);
  if (!subjC) return null;
  const after = emb[subjC.next];
  if (after?.kind === "be") return enEmbeddedCopularClause(b, emb, subjC, subjC.next);
  if (after) return enEmbeddedVerbalClause(b, emb, subjC, subjC.next);
  return null;
}

/** Measurable-property head nouns: a "what is the X of Y" question over
 *  one of these asks for a quantity, not a kind (stage 3, case 12). */
const MEASURABLE_HEADS = new Set([
  "population", "temperature", "price", "cost", "age", "size",
  "height", "weight", "distance", "speed", "number", "amount",
]);

interface EnChunk {
  head: EnItem;
  adjectives: EnItem[];
  /** Degree adverbs grading a chunk adjective ("a very good
   *  teacher"): each adverb pairs with the adjective item it
   *  grades, in surface order (E2, the emotional-uptake
   *  programme, 2026-11-19). */
  degreeMods?: { adverb: EnItem; adjective: EnItem }[];
  /** Noun modifiers absorbed into a compound ("ginger tea"):
   *  every noun before the head, in surface order. */
  compoundMods?: EnItem[];
  det?: string;
  start: number;
  end: number;
  /** An absorbed of-PP ("the population of Chicago"): NP-internal. */
  ofChunk?: EnChunk;
  /** Absorbed PP modifiers ("the man in the garden"): NP-internal,
   *  present only when the caller asked for PP absorption (subject
   *  chunks — a PP between subject and verb was silently dropped
   *  before this existed). */
  ppMods?: { prep: string; chunk: EnChunk }[];
}

/** Prepositions whose PP, sitting between a subject chunk and its
 *  verb, is a modifier of the subject rather than an argument of
 *  the verb. The nominal "to" case ("the key to the cabinet") is
 *  included when its complement parses as an NP; verbal goals do
 *  not form a noun chunk. "By" (passive agents) and "of" (handled
 *  inside the chunk) are excluded. */
const SUBJECT_PP_MODS = new Set(["in", "on", "at", "near", "from", "with", "to"]);

/** Parse an NP chunk starting at items[i]; returns chunk + next index.
 *  With absorbPP, trailing PP modifiers are absorbed into the chunk
 *  (subject call sites only — object chunks must leave their PPs to
 *  the verb's argument filling). */
/** The bare quantifiers that can stand in a chunk's determiner
 *  slot on positional evidence (see enChunkCore). */
const QUANTIFIER_DETS = new Set(["most", "all", "any"]);
function enChunk(items: EnItem[], i: number, absorbPP = false): { chunk: EnChunk; next: number } | null {
  const base = enChunkCore(items, i);
  if (!base || !absorbPP) return base;
  let { chunk, next } = base;
  for (;;) {
    const prep = items[next];
    if (!prep || prep.kind !== "prep" || !SUBJECT_PP_MODS.has(prep.lower)) break;
    const sub = enChunkCore(items, next + 1);
    if (!sub) break;
    (chunk.ppMods ??= []).push({ prep: prep.lower, chunk: sub.chunk });
    chunk = { ...chunk, end: sub.chunk.end };
    next = sub.next;
  }
  return { chunk, next };
}

/** Numeral tokens (digits, or the number words of
 *  quantification-language.ts's NUMBER_WORDS, mirrored here in
 *  the parser's closed-set style): a numeral stands as its own
 *  node and never joins a compound chunk. */
const EN_NUMBER_WORDS = new Set([
  "zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "eleven", "twelve", "thirteen",
  "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty", "hundred", "thousand",
]);
function isNumeralToken(item: EnItem): boolean {
  return /^\d+$/.test(item.text) || EN_NUMBER_WORDS.has(item.lower);
}

function enChunkCore(items: EnItem[], i: number): { chunk: EnChunk; next: number } | null {
  let det: string | undefined;
  const adjectives: EnItem[] = [];
  const degreeMods: { adverb: EnItem; adjective: EnItem }[] = [];
  let j = i;
  if (items[j]?.kind === "det") { det = items[j].lower; j++; }
  /* The bare quantifiers take the determiner slot positionally
   * (IMP-1, the implementation programme, 2026-11-19): "most",
   * "all" and "any" head a quantified noun phrase with no
   * article — "most circumstances", "all dogs", "any help" —
   * but the WordNet provider derives them as adjective/adverb
   * only, so no chunk could open with one: "All dogs are good."
   * failed on its subject and "In most circumstances." on "no
   * verb found" (the one specimen that parsed, "Most dogs.",
   * did so by upgrading "dogs" to a verb). They are NOT
   * determiners outright: "all" is a degree adverb in "gone
   * all brown" (it modulates the result adjective there, a
   * reading the demo corpus pins), and a predeterminer in
   * "all the cake". So the slot accepts the quantifier only
   * on position's evidence — a noun, pronoun, proper name or
   * adjective follows, and no true determiner does — the
   * same position-is-the-evidence idiom as the re-reads
   * below. */
  if (det === undefined && items[j] && QUANTIFIER_DETS.has(items[j].lower)) {
    const after = items[j + 1];
    if (after && after.kind !== "det" &&
        (after.kind === "noun" || after.kind === "pronoun" || after.kind === "proper" || after.kind === "adjective")) {
      det = items[j].lower;
      j++;
    }
  }
  /* Degree adverbs inside the noun phrase (E2, the emotional-
   * uptake programme, 2026-11-19): a degree adverb before a
   * quality grades it — "a very good teacher", "a really bad
   * spot", "a really big house". Before this, no chunk admitted
   * the pair: the adverb stopped the chunker outright, so the
   * complement either fell to a bare-adjective predication that
   * dropped the noun ("It is a really big house" graphed as
   * 'big' alone) or threw where the quality's item kind was not
   * "adjective". The quality after a degree adverb is read as
   * an adjective on position's evidence — a noun adjunct cannot
   * be graded ("a very government building" is not English) —
   * so a noun-kind item with an adjective derivation, standing
   * after the adverb and before a noun head, takes its
   * adjective reading here, as a copy (the head-position
   * re-read below is the same idiom, mirrored). The adverb
   * itself rides in degreeMods and attaches to the quality's
   * node in enNodeFromChunk, by the modulates closure every
   * adverb uses. */
  const adjectiveAt = (k: number, graded: boolean): EnItem | undefined => {
    const it = items[k];
    if (!it) return undefined;
    if (it.kind === "adjective") return it;
    if (graded && it.kind === "noun") {
      const adjEntry = wordnetAdjective(it.lower);
      const head = items[k + 1];
      if (adjEntry && head && (head.kind === "noun" || head.kind === "pronoun" || head.kind === "proper")) {
        registerDerivedEntry(adjEntry, it.lower);
        return { ...it, kind: "adjective", entry: adjEntry };
      }
    }
    return undefined;
  };
  for (;;) {
    const plain = adjectiveAt(j, false);
    if (plain) {
      adjectives.push(plain);
      j++;
      continue;
    }
    if (items[j]?.kind === "adverb") {
      const graded = adjectiveAt(j + 1, true);
      if (graded) {
        degreeMods.push({ adverb: items[j], adjective: graded });
        adjectives.push(graded);
        j += 2;
        continue;
      }
    }
    break;
  }
  let head = items[j];
  if ((!head || (head.kind !== "noun" && head.kind !== "pronoun" && head.kind !== "proper")) && adjectives.length) {
    // Adjective in head position: "a cold" (the illness) — the run of
    // adjectives consumed the only candidate head. If the last
    // adjective also has a noun reading, that reading is the head;
    // position is the evidence, as elsewhere in this parser.
    const lastAdj = adjectives[adjectives.length - 1];
    const nounEntry = wordnetNoun(lastAdj.lower);
    // A GRADED quality is not substantivised (E2): the re-read
    // below makes a bare quality the chunk's noun head ("a
    // cold", the illness), but a quality a degree adverb
    // grades ("awfully sorry", "a very cold") is being used
    // as a quality — letting it head the chunk turned "I am
    // awfully sorry…" into a noun predication and the feeling
    // fell out of the graph. With the re-read refused, the
    // chunk fails and the caller's quality path takes it.
    const graded = degreeMods.some((d) => d.adjective === lastAdj);
    if (nounEntry && !graded) {
      registerDerivedEntry(nounEntry, lastAdj.lower);
      head = { ...lastAdj, kind: "noun", entry: nounEntry };
      adjectives.pop();
      j = lastAdj.index;
    }
  }
  if (!head || (head.kind !== "noun" && head.kind !== "pronoun" && head.kind !== "proper")) return null;
  // Noun–noun compound absorption (sealed-run mechanism 3,
  // H-047): a bare noun immediately after the head is a compound
  // modifier, and the LAST noun is the head — "ginger tea" is a
  // tea. Without this the chunk stopped at 'ginger', the next
  // branch rooted on 'tea', and the complement after it was
  // never consumed. Only noun-kind items absorb (a pronoun or
  // proper head ends the NP as before), and the of-PP check
  // below still sees the item after the full compound. One
  // guard, learned from H-070: a following noun WITH a verb
  // derivation never absorbs — in subject position it is the
  // pending clause verb the fallback scan exists to upgrade
  // ("people take…"), and absorbing it left the sentence with
  // no verb at all. Compounds whose head carries a verb reading
  // ("water bottle") therefore stay unabsorbed, as before.
  // Second guard, learned from the apples specimens: a numeral
  // never takes part — by the QuantificationLanguageUnit's
  // design (quantification-language.ts) a numeral stands as
  // its own node beside the noun it counts ("I have 5 apples"
  // is numeral-theme + noun), and absorbing it into the chunk
  // starved the quantity ledger.
  const compoundMods: EnItem[] = [];
  while (
    items[j + 1]?.kind === "noun" &&
    (wordnetVerb(items[j + 1].lower) === undefined ||
      ["verb", "be", "aux", "comma", "terminal"].includes(items[j + 2]?.kind ?? "") ||
      items[j + 2] === undefined) &&
    !isNumeralToken(head) &&
    !isNumeralToken(items[j + 1])
  ) {
    compoundMods.push(head);
    j++;
    head = items[j];
  }
  const chunk: EnChunk = { head, adjectives, ...(degreeMods.length ? { degreeMods } : {}), ...(compoundMods.length ? { compoundMods } : {}), det, start: i, end: j };
  // Of-PP absorption: "the population of Chicago" is ONE noun phrase.
  // Only "of" is absorbed, and only immediately after the head — verb
  // arguments keep their own prepositions, so this cannot swallow a
  // clause-level PP.
  if (items[j + 1]?.lower === "of") {
    const sub = enChunk(items, j + 2);
    if (sub) {
      chunk.ofChunk = sub.chunk;
      chunk.end = sub.chunk.end;
      return { chunk, next: sub.next };
    }
    // A lone adjective after "of" is the complement substantivised:
    // "the opposite of hot" — hot is the opposed quality itself, and
    // its node keeps the adjective entry's classification.
    const adj = items[j + 2];
    if (adj?.kind === "adjective") {
      chunk.ofChunk = { head: adj, adjectives: [], start: j + 2, end: j + 2 };
      chunk.end = j + 2;
      return { chunk, next: j + 3 };
    }
  }
  return { chunk, next: j + 1 };
}

function enNodeFromChunk(b: Builder, chunk: EnChunk, role?: string): MeaningNode {
  const entry = chunk.head.entry;
  const node = b.node(
    {
      lemma: entry ? entry.lemma : chunk.head.text,
      form: chunk.head.text,
      syntacticElement: "Earth",
      ...(entry && "semanticElement" in entry && entry.semanticElement ? { semanticElement: entry.semanticElement } : {}),
      ...(role ? { role } : {}),
      ...(chunk.det ? { det: chunk.det } : {}),
    },
    [chunk.head.index, ...chunk.adjectives.map((a) => a.index), ...(chunk.compoundMods ?? []).map((m) => m.index)],
  );
  for (const mod of chunk.compoundMods ?? []) {
    // A compound modifier qualifies its head, as an adjective
    // does — but it stays an Earth (nominal) node with its own
    // classification, not a Fire quality.
    const mEntry = mod.entry;
    const mNode = b.node(
      {
        lemma: mEntry ? mEntry.lemma : mod.lower,
        form: mod.text,
        syntacticElement: "Earth",
        ...(mEntry && "semanticElement" in mEntry && mEntry.semanticElement ? { semanticElement: mEntry.semanticElement } : {}),
      },
      [mod.index],
    );
    b.edge(mNode, node, "qualifies"); // modifier → head
  }
  for (const adj of chunk.adjectives) {
    const aEntry = adj.entry;
    const aNode = b.node(
      {
        lemma: aEntry ? aEntry.lemma : adj.lower,
        form: adj.text,
        syntacticElement: "Fire",
        ...(aEntry && "semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
      },
      [adj.index],
    );
    b.edge(aNode, node, "qualifies"); // Fire→Earth: generating
    // A degree adverb grading this quality (E2): a Water node
    // modulating the quality's Fire node — the closure every
    // adverb attachment uses (Water→Fire: generating).
    const dm = chunk.degreeMods?.find((d) => d.adjective === adj);
    if (dm) {
      const advEntry = dm.adverb.entry;
      const advNode = b.node(
        { lemma: advEntry ? advEntry.lemma : dm.adverb.lower, form: dm.adverb.text, syntacticElement: "Water" },
        [dm.adverb.index],
      );
      b.edge(advNode, aNode, "modulates");
    }
  }
  if (chunk.ofChunk) {
    const ofNode = enNodeFromChunk(b, chunk.ofChunk);
    ofNode.prep = "of";
    b.edge(node, ofNode, "modifier");
  }
  for (const pp of chunk.ppMods ?? []) {
    const ppNode = enNodeFromChunk(b, pp.chunk);
    ppNode.prep = pp.prep;
    b.edge(node, ppNode, "modifier");
  }
  return node;
}

function parseEn(text: string): ParsedSentence {
  const { tokens, interrogative } = enTokenize(text);
  // Token resolution (token-resolve.ts): words the parser does not
  // recognise are resolved — variant graph, ported SymSpell matcher,
  // segmentation — before item classification, and every resolution
  // is recorded on the sentence. The recognition test is enItems'
  // own classification, reused: function words, the hand lexicon,
  // and WordNet-derivable nouns/adjectives/adverbs need no help.
  // (The adverb clause is the §6 restoration's other half: while
  // the extract carried no adverb synsets, 'indoors' counted as
  // unrecognised here and the resolver rewrote it to 'indoor'
  // before classification ever saw it.)
  const recognize = (lower: string): TokenClass => {
    if (
      lower === "," ||
      EN_WH.has(lower) ||
      lower === "why" ||
      EN_MODAL.has(lower) ||
      EN_DET.has(lower) ||
      EN_PREP.has(lower) ||
      lower in EN_BE ||
      EN_AUX.has(lower) ||
      lower === "n't" ||
      lower === "not"
    ) {
      return "function";
    }
    if (
      EN_LEXICON[lower] !== undefined ||
      wordnetNoun(lower) !== undefined ||
      wordnetAdjective(lower) !== undefined ||
      (lower !== "between" && wordnetAdverb(lower) !== undefined)
    ) {
      return "known";
    }
    return undefined;
  };
  const resolved = resolveTokenList(tokens, recognize);
  /* The mood decision (Probe-2 Slice 1): the punctuation flag
   * and the structural onset are OR-ed HERE, at the one call
   * site every branch below inherits — a question whose form
   * is interrogative is parsed as a question with or without
   * its "?". The tag-question strip keeps the punctuation
   * flag alone: a tag is defined by its mark, and its stripped
   * reading is attempted as the statement it is. */
  const formInterrogative = interrogative || structuralQuestionOnset(resolved.tokens);
  /* The tag question (IMP-2, the implementation programme,
   * 2026-11-19): a statement carrying a confirmation tag —
   * "It must be a very stressful job, right?", "You are
   * coming, aren't you?" — is a statement with a tag, not a
   * question: the tag asks the hearer to confirm the
   * speaker's own assertion, and the turn's content is the
   * assertion's. The sentence layer read the tag's question
   * mark as the clause's mood and the question path declined
   * the turn as a question-shape mismatch (causal analysis
   * C5, P-116) — a routing error at the sentence layer: the
   * tag is scaffolding, as the sentence-initial conjunction
   * is, and the clause is read without it. The strip is
   * narrow: a closed tag inventory at the token stream's
   * end (a lone "right", or a negated auxiliary + pronoun,
   * the auxiliary whole or split), a clause's worth of
   * tokens before it, and no interrogative onset at the
   * sentence's head (a genuine question keeps its tag-shaped
   * content: "Is the answer right?" opens with its verb).
   * If the stripped reading fails to parse, the original
   * reading stands — the attempt falls back whole. */
  const tagStripped = ((): { tokens: string[] } | undefined => {
    if (!interrogative) return undefined;
    const toks = resolved.tokens;
    const lower = toks.map((t) => t.toLowerCase());
    const onset = lower[0];
    if (!onset || EN_WH.has(onset) || onset in EN_BE || EN_AUX.has(onset) || EN_MODAL.has(onset) || onset === "do" || onset === "did") {
      return undefined;
    }
    let end = lower.length;
    if (lower[end - 1] === ",") end--;
    const TAG_PRONOUNS = new Set(["it", "you", "he", "she", "we", "they"]);
    const TAG_AUX = new Set(["isn't", "aren't", "don't", "won't", "can't", "couldn't", "didn't", "wasn't", "weren't"]);
    let cut = -1;
    if (lower[end - 1] === "right" && end >= 4) cut = end - 1;
    else if (end >= 4 && TAG_PRONOUNS.has(lower[end - 1]) && TAG_AUX.has(lower[end - 2])) cut = end - 2;
    else if (end >= 5 && TAG_PRONOUNS.has(lower[end - 1]) && lower[end - 2] === "n't" && (lower[end - 3] in EN_BE || EN_AUX.has(lower[end - 3]))) cut = end - 3;
    if (cut < 3) return undefined;
    const stripped = toks.slice(0, cut);
    if (stripped[stripped.length - 1] === ",") stripped.pop();
    return { tokens: stripped };
  })();
  const attempt = (bodyTokens: string[], bodyInterrogative: boolean): ParsedSentence => {
    try {
      const result = parseEnBody(text, bodyTokens, bodyInterrogative);
      /* Link Grammar shadow (coverage slice, shadow landing):
       * the bounded solver runs beside the parse and its record
       * rides the sentence. NOTHING in this stage reads the
       * record — it is the measurement instrument for the
       * family-routing gates, in the embeddedTask pattern. A
       * solver failure must never sink a parse: the shadow is
       * evidence, and its absence is silent. */
      try {
        const shadow = solveLinkage(bodyTokens);
        if (shadow) result.linkageShadow = shadow;
      } catch {
        /* the shadow's silence, by design */
      }
      if (resolved.resolutions.length > 0) result.tokenResolutions = resolved.resolutions;
      /* A controlled infinitive after a recipient is an embedded task
       * candidate, not another matrix patient. Preserve it separately until
       * the sentence graph can represent controlled subjects and ambiguity.
       * Require the complete simple shape and an attested verb; never infer
       * an object for an incomplete or more complex clause. */
      const root = result.meaning.nodes.find((n) => n.id === result.meaning.rootId);
      const lower = bodyTokens.map((t) => t.toLowerCase());
      const rootIndex = root ? (result.realizes[root.id] ?? [])[0] : undefined;
      if (root?.lemma === "help" && rootIndex !== undefined) {
        let index = rootIndex + 1;
        if (["me", "you", "him", "her", "us", "them"].includes(lower[index] ?? "")) index++;
        if (lower[index] === "to") index++;
        const taskVerb = lower[index] && wordnetVerb(lower[index]);
        const objectStart = index + 1;
        const objectWords = bodyTokens.slice(objectStart);
        if (taskVerb && objectWords.length > 0 && objectWords.length <= 3 &&
            !objectWords.some((word) => [",", "and", "or", "if", "because", "not"].includes(word.toLowerCase()))) {
          result.embeddedTask = {
            verb: taskVerb.lemma,
            object: objectWords.join(" "),
            verbToken: index,
            objectTokens: objectWords.map((_, offset) => objectStart + offset),
            confidence: "candidate",
          };
        }
      }
      return result;
    } catch (err) {
      // Parse-arbitrated candidate selection (v1): a context-free
      // correction can pick a word the sentence cannot use — "hto"
      // corrects to "to" on frequency where "hot" was meant. If the
      // first corrected token has a runner-up candidate, retry the
      // parse once with it: the sentence layer arbitrates between
      // the token layer's candidates. The record is updated to the
      // applied candidate at a discounted confidence, and its rule
      // names the retry.
      const rec = resolved.resolutions.find(
        (r) => r.outcome === "corrected" && (r.candidates?.length ?? 0) > 1,
      );
      if (rec && rec.tokenIndex < bodyTokens.length) {
        const next = rec.candidates![1].term;
        const retryTokens = [...bodyTokens];
        retryTokens[rec.tokenIndex] = next;
        try {
          const result = parseEnBody(text, retryTokens, bodyInterrogative);
          try {
            const shadow = solveLinkage(retryTokens);
            if (shadow) result.linkageShadow = shadow;
          } catch {
            /* the shadow's silence, by design */
          }
          rec.replacement = [next];
          rec.confidence = Math.round(rec.confidence * 0.8 * 100) / 100;
          rec.rule = "matcher:symspell+parse-retry";
          if (resolved.resolutions.length > 0) result.tokenResolutions = resolved.resolutions;
          return result;
        } catch {
          // The retry failed too: the original failure stands.
        }
      }
      // A parse failure keeps its token resolutions: the trace can
      // then locate the gap at the tokens that stayed unresolved,
      // not just at the sentence layer as a whole.
      if (resolved.resolutions.length > 0) {
        (err as { tokenResolutions?: unknown }).tokenResolutions = resolved.resolutions;
      }
      throw err;
    }
  };
  if (tagStripped) {
    try {
      return attempt(tagStripped.tokens, false);
    } catch {
      // The stripped reading failed: the original stands.
    }
  }
  return attempt(resolved.tokens, formInterrogative);
}

function parseEnBody(text: string, tokens: string[], interrogative: boolean): ParsedSentence {
  const items = enItems(tokens);
  const b = new Builder();
  const spans: ConnectiveGraph["spans"] = [];
  const scope: ParsedSentence["scopeAttachments"] = [];

  const beItem = items.find((i) => i.kind === "be");
  const auxItem = items.find((i) => i.kind === "aux");
  const negItem = items.find((i) => i.kind === "neg");
  const whyItem = items.find((i) => i.kind === "why");
  let contentStart = whyItem ? whyItem.index + 1 : 0;
  /* A sentence-initial coordinating conjunction is connective
   * scaffolding, not content (IMP-1, the implementation
   * programme, 2026-11-19): "But there are two more days." opens
   * with the link to the previous discourse, and the chunker —
   * asked to parse a subject from the conjunction — failed the
   * whole sentence ("cannot parse subject of"). The content the
   * branches below address begins after it, exactly as it begins
   * after the why item. One conjunction is skipped; a doubled
   * opening is not a shape running text takes. */
  if (
    contentStart < items.length &&
    (items[contentStart].lower === "but" || items[contentStart].lower === "and" || items[contentStart].lower === "so")
  ) {
    contentStart += 1;
  }

  /* --- Imperative (stage 3): a sentence-initial verb with no subject
   *     ("Tell me about winter."). The initial word is classified as a
   *     noun by the provider (a "tell" is also a mound), and the verb
   *     scan only looks AFTER a subject chunk, so the imperative was
   *     invisible and a later noun with verb synsets ("winter") stole
   *     the verb slot. The signature is exact: the first chunk is the
   *     single verb-resolvable word and a pronoun argument follows
   *     it — "Wind blows." fails the pronoun test and stays a
   *     declarative. The addressee agent is constructionally implicit
   *     (C.4), recorded as suppressed. --- */
  {
    const impItem = items[contentStart];
    if (impItem && impItem.kind !== "verb" && !items.some((i) => i.kind === "be") && !items.some((i) => i.kind === "aux")) {
      const impVerb = wordnetVerb(impItem.lower);
      if (impVerb) registerDerivedEntry(impVerb);
      const impChunk = enChunk(items, contentStart);
      if (impVerb && impChunk && impChunk.chunk.head === impItem && impChunk.next === contentStart + 1 && items[impChunk.next]?.kind === "pronoun") {
        const root = b.node({ lemma: impVerb.lemma, form: impItem.text, syntacticElement: "Wood", role: "verb" }, [impItem.index]);
        root.states = { mood: "imperative", construction: "imperative", tense: "present", verbForm: "base", voice: "active", suppressedRoles: ["agent"], subjectPerson: "2" };
        const bareSlots = [...impVerb.slots];
        let i = contentStart + 1;
        while (i < items.length) {
          const item = items[i];
          // The about-PP check precedes the adverb check: 'about'
          // before a chunk is the preposition-like marker this
          // branch has always special-cased, and since the §6
          // adverb restoration the token also carries an adverb
          // reading — position decides, as elsewhere in this
          // parser, and here the chunk follows it.
          if (item.kind === "prep" || item.lower === "about") {
            const pc = enChunk(items, i + 1);
            if (pc) {
              const slot = impVerb.prepSlot && impVerb.prepSlot.preps.includes(item.lower) ? impVerb.prepSlot.slot : bareSlots.includes("theme") ? "theme" : "location";
              if (slot === "theme") bareSlots.splice(bareSlots.indexOf("theme"), 1);
              const n = enNodeFromChunk(b, pc.chunk, slot);
              n.prep = item.lower;
              b.edge(root, n, slot as Relation);
              i = pc.next;
              continue;
            }
            i++;
            continue;
          }
          if (item.kind === "adverb") {
            const aNode = b.node({ lemma: item.entry ? item.entry.lemma : item.lower, form: item.text, syntacticElement: "Water" }, [item.index]);
            b.edge(aNode, root, "modulates");
            i++;
            continue;
          }
          const c = enChunk(items, i);
          if (c && bareSlots.length) {
            const rel = bareSlots.shift()!;
            const n = enNodeFromChunk(b, c.chunk, rel);
            b.edge(root, n, rel as Relation);
            i = c.next;
            continue;
          }
          break;
        }
        return { meaning: b.graph(root), connective: connective("en", tokens, spans), realizes: b.realizes, scopeAttachments: scope };
      }
    }
  }

  /* --- Verb-slot capture recovery (sealed-run mechanism 1,
   *     H-004): a subject noun whose HAND entry is verb-only
   *     ('rain' — the hand lexicon carries it only as a verb)
   *     sits in the subject chunk's head position wearing the
   *     verb classification, so items.find below takes it as
   *     the clause's verb and the real verb is demoted to an
   *     attachment ("The rain flooded the garden." rooted on
   *     rain). The signature is exact: the first verb item is
   *     preceded only by determiners — a chunk head position —
   *     the word has a noun reading, and a later item can serve
   *     as the clause's verb. Then the noun reading is adopted
   *     for the item and the verb search proceeds past it. A
   *     genuine clause verb is never preceded only by
   *     determiners (a determiner requires its noun), so the
   *     recovery cannot fire on one. --- */
  {
    const captured = items.find((i) => i.kind === "verb");
    if (captured && captured.index > contentStart) {
      const before = items.slice(contentStart, captured.index);
      if (before.length > 0 && before.every((i) => i.kind === "det")) {
        const nounEntry = wordnetNoun(captured.lower);
        const laterVerb = items
          .slice(captured.index + 1)
          .some((x) => x.kind === "verb" || wordnetVerb(x.lower) !== undefined);
        if (nounEntry && laterVerb) {
          captured.entry = nounEntry;
          captured.kind = "noun";
          captured.formTag = undefined;
          registerDerivedEntry(nounEntry, captured.lower);
        }
      }
    }
  }
  /* --- Daypart greeting fragment (Social Unit, conversation-shapes
   *     C1, 2026-11-18): "Good morning." / "Good afternoon." /
   *     "Good evening." / "Good night." — a verbless social form,
   *     exactly two items. It never reached the bare-fragment path
   *     below: the daypart noun's -ing/-night shapes draw verb
   *     classifications with no entry, so the sentence died at
   *     "no verb found". The signature is exact (the closed form
   *     itself), and the graph is the fragment's: the daypart as
   *     topic, "good" qualifying it — the shape SemanticAssessment
   *     recognises as the daypart greeting (or, for "night", the
   *     daypart farewell). --- */
  {
    const rest = items.slice(contentStart);
    const DAYPARTS = new Set(["morning", "afternoon", "evening", "night"]);
    if (
      rest.length === 2 &&
      rest[0].lower === "good" &&
      DAYPARTS.has(rest[1].lower) &&
      !items.some((i) => i.kind === "be" || i.kind === "aux")
    ) {
      const root = b.node({ lemma: rest[1].lower, form: rest[1].text, syntacticElement: "Earth", role: "topic" }, [rest[1].index]);
      const good = b.node({ lemma: "good", form: rest[0].text, syntacticElement: "Fire" }, [rest[0].index]);
      b.edge(good, root, "qualifies");
      return { meaning: b.graph(root), connective: connective("en", tokens, spans, rest[1].index), realizes: b.realizes, scopeAttachments: scope };
    }
  }

  /* --- Clausal complement (Transcript Slice 1): a clause-taking
   *     verb followed immediately by 'that' or a wh-word takes the
   *     whole following clause as its complement. The attempt runs
   *     BEFORE the verb-slot fallback and the single-clause
   *     dispatch below, both of which key on the first be/verb item
   *     in the WHOLE stream — left to them, the embedded clause's
   *     copula steers the matrix parse (IM2): the interrogatives
   *     threw at the subject, the statements at the complement,
   *     and "i know that you are here." silently rooted on the
   *     embedded 'here' with 'know' gone. (The fallback's copula
   *     guard is the same hijack from the other side: with an
   *     embedded copula present it refuses to upgrade a derived
   *     matrix verb at all — "i think that you are here.") The
   *     candidate scan is a probe: it reads lemmas without
   *     adopting any entry, claims only the FIRST clause-taking
   *     verb in that signature, and the build — in a scratch
   *     builder, the candidate adopted only once the embedded
   *     clause and the matrix subject have both parsed — falls
   *     through whole when its shapes fail, so a sentence this
   *     construction does not claim keeps its old reading. --- */
  {
    let compBuilt: ParsedSentence | undefined;
    for (let k = contentStart + 1; k < items.length - 1 && !compBuilt; k++) {
      const cand = items[k];
      const next = items[k + 1];
      const isThat = next?.lower === "that";
      const isWh = !!next && (next.kind === "wh" || next.lower === "how");
      if (!isThat && !isWh) continue;
      let lemma: string | undefined;
      let flagged = false;
      if (cand.entry?.kind === "verb") {
        lemma = (cand.entry as VerbEntry).lemma;
        flagged = !!(cand.entry as VerbEntry).clausalComplement;
      } else {
        const hand = EN_LEXICON[cand.lower];
        if (hand?.kind === "verb") {
          lemma = (hand as VerbEntry).lemma;
          flagged = !!(hand as VerbEntry).clausalComplement;
        } else {
          lemma = wordnetVerb(cand.lower)?.lemma;
        }
      }
      if (!lemma || (!flagged && !EN_CLAUSAL_COMPLEMENT_VERBS.has(lemma))) continue;
      const embItems = items.slice(k + 1 + (isThat ? 1 : 0));
      const matrixItems = items.slice(contentStart, k);
      const auxMain = matrixItems.find((i) => i.kind === "aux" || i.kind === "modal");
      const negMain = matrixItems.find((i) => i.kind === "neg");
      // The matrix subject is what remains of the matrix items
      // once the carrier (auxiliary/modal) and the negator are
      // set aside: "do you know …", "i know …", "she knows …".
      const subjItems = matrixItems.filter((i) => i !== auxMain && i.kind !== "neg");
      /* The subject side is checked FIRST, before anything is
       * adopted: a noun that merely carries a complement-verb
       * derivation ("a feeling that I won" — 'feeling' probes as
       * 'feel') is not a matrix verb, and its matrix side does
       * not parse as subject + this verb. Such a candidate is
       * simply passed over, with nothing adopted and nothing to
       * restore. Only once the subject stands is the embedded
       * clause parsed — and that parse ADOPTS its verb items in
       * place, so the candidate-and-embedded items' classifications
       * are snapshotted here and restored if the build fails: a
       * failed attempt must leave the item stream exactly as the
       * fallthrough dispatch expects it (the E2 regression: the
       * discarded attempt's adopted 'won' stayed verb-classified
       * and stole the matrix verb slot from 'have'). */
      const whSubject = subjItems.length === 1 && subjItems[0].kind === "wh";
      const subjC = whSubject ? undefined : enChunk(subjItems, 0);
      if (!whSubject && (!subjC || subjC.next !== subjItems.length)) continue;
      const snapshot = items.slice(k).map((i) => ({ item: i, kind: i.kind, entry: i.entry, formTag: i.formTag }));
      const restore = () => { for (const s of snapshot) { s.item.kind = s.kind; s.item.entry = s.entry; s.item.formTag = s.formTag; } };
      try {
        const sb = new Builder();
        const embRoot = enEmbeddedClause(sb, embItems);
        if (!embRoot) { restore(); break; }
        let agentNode: MeaningNode | undefined;
        let person = "3sg";
        let query: ParsedSentence["query"];
        if (whSubject) {
          // A questioned matrix subject: "who knows who i am?"
          agentNode = sb.node(
            { lemma: subjItems[0].lower, form: subjItems[0].text, syntacticElement: "Earth", role: "agent", questionWord: true },
            [subjItems[0].index],
          );
          query = { relation: "agent", expectedType: whExpectedType(subjItems[0].lower) };
        } else if (subjC) {
          agentNode = enNodeFromChunk(sb, subjC.chunk, "agent");
          person = enSubjectPerson(subjC.chunk);
        }
        if (!agentNode) { restore(); break; }
        const matrixVerb = enResolveVerbItem(cand);
        if (!matrixVerb) { restore(); break; }
        const root = sb.node(
          { lemma: matrixVerb.lemma, form: cand.text, syntacticElement: "Wood", role: "verb" },
          [cand.index, ...(auxMain ? [auxMain.index] : []), ...(negMain ? [negMain.index] : [])],
        );
        root.states = {
          voice: "active",
          tense: auxMain?.lower === "did" || cand.formTag === "past" || cand.formTag === "past/participle" ? "past" : "present",
          verbForm: cand.formTag,
          mood: interrogative ? "interrogative" : "indicative",
          subjectPerson: person,
          ...(auxMain && auxMain.kind === "aux" ? { aux: auxMain.lower } : {}),
          ...(auxMain && auxMain.kind === "modal" ? { modal: auxMain.lower } : {}),
          ...(negMain ? { negated: true, negation: { negator: "not", carrier: auxMain?.lower } } : {}),
          ...enAspectBundle(auxMain?.kind === "aux" ? auxMain : undefined, undefined, cand, false, false),
        };
        sb.edge(root, agentNode, "agent");
        sb.edge(root, embRoot, "complement", isThat ? "that" : undefined);
        compBuilt = {
          meaning: sb.graph(root),
          connective: connective("en", tokens, spans),
          realizes: sb.realizes,
          scopeAttachments: scope,
          ...(query ? { query } : {}),
        };
      } catch {
        restore();
        compBuilt = undefined; // The claimed shapes failed: the old dispatch stands.
      }
      break; // Only the first candidate in the signature is claimed.
    }
    if (compBuilt) return compBuilt;
  }

  let verbItem = items.find((i) => i.kind === "verb");
  if (!verbItem) {
    // WordNet fallback (wordnet-lex.ts): no hand-lexicon verb exists,
    // so try to derive one — but only for a content item AFTER the
    // subject chunk. Position is the POS evidence here: the subject's
    // own noun may carry verb synsets ('wind' the noun vs 'wind' the
    // verb) and must not be upgraded into the verb slot. Two more
    // positional guards, both learned from regressions:
    //  - in an inverted predicate question ("Why is winter cold?")
    //    the subject chunk follows the copula, so the scan starts
    //    after THAT chunk — 'winter' has verb synsets (to overwinter)
    //    and is the subject, not the verb;
    //  - an item immediately after a determiner is a noun phrase's
    //    head, never the verb ("a cat" — 'cat' has verb synsets and
    //    must stay the existential's presented noun).
    const subjChunk =
      beItem && beItem.index === contentStart
        ? enChunk(items, beItem.index + 1)
        : enChunk(items, contentStart, true);
    let scanFrom = subjChunk ? subjChunk.next : contentStart + 1;
    if (!subjChunk && auxItem && items[contentStart]?.kind === "wh") {
      // Wh-fronted order (sealed-run mechanism 2, H-070): the
      // chunk at contentStart fails on the question word itself,
      // so the fallback above started the scan one token into
      // the inverted subject — "What do people take…?" upgraded
      // 'people' (it has verb synsets) ahead of the real verb,
      // against the scan's own stated intent (only AFTER the
      // subject chunk). The subject of an inverted question
      // follows its auxiliary; start the scan after THAT chunk.
      // The auxiliary's presence is part of the signature: a
      // subject question ("Which happened first?") has none,
      // and the item after the wh-word there IS the verb —
      // skipping it left the sentence with no verb at all.
      const invSubj = enChunk(items, (auxItem?.index ?? contentStart) + 1);
      if (invSubj) scanFrom = invSubj.next;
      if (invSubj && invSubj.next >= items.length) {
        // The chunk ran to the end of the sentence: it has
        // swallowed the clause's verb as its head noun — an
        // adjective-led subject chunk needs a head, and a
        // noun-attested verb supplies it ("What does cold
        // mean?": the chunk is 'cold mean', 'mean' the head).
        // A do-question's subject is never the whole remainder
        // of the clause — a verb must follow it — so the scan
        // starts at the chunk's last item, the only place the
        // verb can be. (Merge fix, 2026-11-19: mechanism 2's
        // scan start regressed this sentence, which the main
        // path parsed before; the preference above still
        // governs whenever anything follows the chunk.)
        scanFrom = items.length - 1;
      }
    }
    for (let k = scanFrom; k < items.length; k++) {
      const it = items[k];
      // Candidates: nouns, proper nouns, and PROVIDER-derived
      // adjectives. A derived adjective entry is provisional — the
      // surface may be a verb in this position ("I live in Chicago":
      // 'live' is an adjective lemma, and the sentence's verb) — while
      // a HAND adjective entry is a settled classification and is
      // never upgraded.
      const derivedAdj = it.kind === "adjective" && it.entry && "source" in it.entry && it.entry.source === "wordnet";
      if (it.kind !== "noun" && it.kind !== "proper" && !derivedAdj) continue;
      if (items[k - 1]?.kind === "det") continue;
      const derived = wordnetVerb(it.lower);
      if (!derived) continue;
      // A hand entry for the derived LEMMA outranks the
      // derivation: the hand lexicon registers only some
      // surfaces (make/makes/made — not 'making'), so an
      // unregistered inflected surface of a hand verb fell
      // through to the WordNet frame (make: theme) where the
      // curated frame says patient — the same verb parsed with
      // two frames depending on its surface. Derivation is the
      // fallback for lemmas the hand lexicon lacks, not an
      // override of it (part of H-012's role divergence).
      const handEntry = EN_LEXICON[derived.lemma];
      const verbEntry = handEntry && handEntry.kind === "verb" && !("source" in handEntry && handEntry.source === "wordnet") ? (handEntry as VerbEntry) : derived;
      const f = verbEntry.forms;
      const formTag =
        it.lower === ingForm(f.base) ? "ing"
        : it.lower === f.base ? "base" : it.lower === f.third ? "third" : it.lower === f.past && it.lower === f.participle ? "past/participle" : it.lower === f.past ? "past" : it.lower === f.participle ? "participle" : "base";
      // A copula + -ing surface can be a progressive verb or an
      // adjectival predicate (is running vs is missing). When the
      // surface has a WordNet adjective reading and no following bare NP
      // that could fill a direct object, keep it available to the copula
      // predicate branch. A following NP remains evidence for the verbal
      // reading (is missing the target). This is a bounded default for
      // an ambiguity the current graph cannot preserve as two analyses;
      // it does not claim to resolve every stative/progressive contrast.
      const hasPostCopularAdjective =
        beItem &&
        formTag === "ing" &&
        wordnetAdjective(it.lower) &&
        !["det", "noun", "pronoun", "proper"].includes(items[it.index + 1]?.kind ?? "");
      if (hasPostCopularAdjective) continue;
      // With a copula present, only a participle or -ing surface can
      // be the clause's verb (passive / progressive). A base- or
      // third-shaped surface after the copula is its complement —
      // "They are doctors" names a complement noun that merely has
      // verb synsets ("doctor"), and upgrading it steals the clause
      // from the copula path.
      if (beItem && formTag !== "participle" && formTag !== "past/participle" && formTag !== "ing") continue;
      it.entry = verbEntry;
      it.kind = "verb";
      it.formTag = formTag;
      registerDerivedEntry(verbEntry);
      verbItem = it;
      break;
    }
    // Lexical do (Social Unit S3's located fix, 2026-11-18): a
    // do-form the clause did not take as its auxiliary, sitting
    // in verb position after the subject chunk, is the clause's
    // lexical verb — "What can you do?" (can is the auxiliary,
    // do the verb) and "What do you do?" (the first do is the
    // inverted auxiliary, the second the verb). Until this pass
    // those sentences failed with "no verb found": EN_AUX
    // classifies every do-form as an auxiliary, so the lexical
    // verb was invisible. Do-support questions with a real verb
    // never reach here (their verb fills the slot), and the item
    // already taken as the clause's auxiliary is never re-read —
    // position plus the already-taken auxiliary are the
    // evidence, as everywhere in this parser.
    if (!verbItem) {
      for (let k = scanFrom; k < items.length; k++) {
        const it = items[k];
        if (it.kind !== "aux" || (it.lower !== "do" && it.lower !== "does" && it.lower !== "did")) continue;
        if (auxItem && it.index === auxItem.index) continue;
        const derived = wordnetVerb(it.lower);
        if (!derived) continue;
        it.entry = derived;
        it.kind = "verb";
        it.formTag = it.lower === "did" ? "past" : "base";
        registerDerivedEntry(derived);
        verbItem = it;
        break;
      }
    }
  }
  const first = items[contentStart];


  /* --- Conditional (H2): if-clause as a condition relation between two
   *     clause graphs (Metal logical); the main clause carries the
   *     subjunctive mood state, and Fire→Metal (mood forces structure)
   *     is why 'were' serves a first-person subject here. --- */
  if (first?.lower === "if") {
    const comma = items.find((i) => i.kind === "comma");
    const condItems = items.slice(contentStart + 1, comma?.index);
    const condBePos = condItems.findIndex((i) => i.kind === "be");
    const condSubj = enChunk(condItems, 0);
    const condPred = condBePos >= 0 ? enChunk(condItems, condBePos + 1) : null;
    if (!condSubj || !condPred) throw new Error(`cannot parse condition clause of: ${text}`);
    const condSubject = enNodeFromChunk(b, condSubj.chunk, "subject");
    const condRoot = enNodeFromChunk(b, condPred.chunk, "predicate");
    condRoot.states = { mood: "subjunctive", copulaTense: EN_BE[condItems[condBePos].lower] };
    b.edge(condSubject, condRoot, predRelation(condRoot));
    const mainItems = items.slice((comma?.index ?? 0) + 1);
    const mainSubj = enChunk(mainItems, 0);
    const mainVerbItem = mainItems.find((i) => i.kind === "verb");
    const modalItem = mainItems.find((i) => i.kind === "modal");
    if (!mainSubj || !mainVerbItem?.entry) throw new Error(`cannot parse main clause of: ${text}`);
    const mainVerb = mainVerbItem.entry as VerbEntry;
    const root = b.node({ lemma: mainVerb.lemma, form: mainVerbItem.text, syntacticElement: "Wood", role: "verb" }, [mainVerbItem.index]);
    root.states = {
      mood: "subjunctive",
      tense: "present",
      verbForm: "base",
      ...(modalItem ? { modal: modalItem.lower } : {}),
      subjectPerson: mainSubj.chunk.head.entry && "person" in mainSubj.chunk.head.entry ? (mainSubj.chunk.head.entry as { person?: string }).person : "3sg",
    };
    const agent = enNodeFromChunk(b, mainSubj.chunk, "agent");
    b.edge(root, agent, "agent");
    b.edge(root, condRoot, "condition", undefined, "Metal");
    return { meaning: b.graph(root), connective: connective("en", tokens, spans), realizes: b.realizes, scopeAttachments: scope };
  }

  /* --- Existential (R4): 'there' is connective scaffolding realising no
   *     meaning node; the meaning graph holds the presented Earth and
   *     its location, entered at Earth under the existential template. --- */
  if (first?.lower === "there" && beItem) {
    const c = enChunk(items, beItem.index + 1);
    if (!c) throw new Error(`cannot parse existential subject of: ${text}`);
    const root = enNodeFromChunk(b, c.chunk, "theme");
    root.states = { construction: "existential", copulaTense: EN_BE[beItem.lower], mood: interrogative ? "interrogative" : "indicative" };
    let i = c.next;
    if (items[i]?.kind === "prep") {
      const loc = enChunk(items, i + 1);
      if (loc) {
        const locNode = enNodeFromChunk(b, loc.chunk, "location");
        locNode.prep = items[i].lower;
        b.edge(root, locNode, "location");
      }
    }
    const scaffolding = [
      { index: first.index, kind: "expletive-there" },
      { index: beItem.index, kind: "copula" },
    ];
    return { meaning: b.graph(root), connective: connective("en", tokens, spans, undefined, scaffolding), realizes: b.realizes, scopeAttachments: scope };
  }

  /* --- Weather (R4): expletive 'it'; the verb runs with zero Earth
   *     valency — nothing is doing the raining. --- */
  if (first?.lower === "it" && beItem && verbItem && verbItem.formTag === "ing" && verbItem.entry) {
    const verb = verbItem.entry as VerbEntry;
    const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" }, [verbItem.index]);
    root.states = { construction: "weather", aspect: { ongoing: true }, aux: beItem.lower, tense: "present", verbForm: "ing", mood: interrogative ? "interrogative" : "indicative" };
    const scaffolding = [
      { index: first.index, kind: "expletive-it" },
      { index: beItem.index, kind: "copula" },
    ];
    return { meaning: b.graph(root), connective: connective("en", tokens, spans, undefined, scaffolding), realizes: b.realizes, scopeAttachments: scope };
  }

  /* --- Wh-question (R3): the question word is fronted in the connective
   *     graph but fills its ordinary slot in the meaning graph — the gap
   *     is the empty surface position it left. 'did' is a Metal tense
   *     carrier realising no meaning node (R4 family). --- */
  if (first?.kind === "wh" && verbItem?.entry) {
    const verb = verbItem.entry as VerbEntry;
    const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" }, [verbItem.index]);
    root.states = {
      mood: "interrogative",
      // The carrier fixes tense when present ("did"); a questioned
      // subject has no carrier, so the verb's own form carries it
      // ("Who arrived?" is past though nothing says "did").
      tense: auxItem?.lower === "did" || verbItem.formTag === "past" || verbItem.formTag === "past/participle" ? "past" : "present",
      verbForm: verbItem.formTag,
      voice: "active",
      ...(auxItem ? { aux: auxItem.lower } : {}),
      // Aspect comes from the same bundle the main path uses
      // (sealed-run mechanism 5): this branch built its states
      // by hand and never called it, so the progressive of
      // "What is he bringing?" read as unmarked aspect.
      ...enAspectBundle(auxItem, beItem, verbItem, false, !!items.find((i) => i.lower === "been" && auxItem && i.index > auxItem.index && i.index < verbItem.index)),
    };
    const agentStart = (auxItem?.index ?? first.index) + 1;
    let subjC = enChunk(items, agentStart);
    if (!subjC && items[agentStart]?.kind === "be") {
      // Inverted progressive/passive order (sealed-run
      // mechanism 4, H-007/H-008/H-012): the subject sits AFTER
      // the be-carrier — "What is HE bringing?" Attempting the
      // chunk at the carrier itself failed, the wh-word took
      // the agent slot, and the pronoun was dropped entirely.
      // The main path's inverted-subject recovery (below) reads
      // the subject after the boundary auxiliary/copula; this
      // branch now does the same. A subject question ("Who is
      // bringing him?") still finds no chunk after the carrier
      // (the verb is there) and keeps the wh-as-agent reading.
      subjC = enChunk(items, agentStart + 1);
    }
    let slot: string;
    if (subjC) {
      const agent = enNodeFromChunk(b, subjC.chunk, "agent");
      b.edge(root, agent, "agent");
      // Person: the entry's own record, else agreement read in
      // reverse — a base-form do-carrier ("do", not "does") with
      // a third-person subject is plural ("What do people
      // take…?": 'people' carries no person record anywhere).
      root.states.subjectPerson = subjC.chunk.head.entry && "person" in subjC.chunk.head.entry
        ? (subjC.chunk.head.entry as { person?: string }).person
        : auxItem?.lower === "do" ? "3pl" : "3sg";
      slot = verb.required[0] ?? verb.slots[0] ?? "patient";
    } else {
      // No overt subject chunk: the question word IS the subject
      // ("Who arrived?", "Which happened first?"). Assigning it the
      // verb's object slot instead was the old behaviour and produced
      // a patient reading for an intransitive's only argument.
      slot = "agent";
    }
    const qNode = b.node(
      { lemma: first.lower, form: first.text, syntacticElement: "Earth", role: slot, questionWord: true },
      [first.index],
    );
    b.edge(root, qNode, slot as Relation);
    if (slot !== "agent") {
      // Post-gap PPs of an object question ("What do people take
      // TO THE BEACH?"): the gap is the questioned slot, but a
      // trailing PP is ordinary clause material with its own
      // slot — the main path's PP rule, applied here. Until this
      // existed the branch returned at the gap and the PP was
      // silently dropped (part of H-070's cascade: with the
      // subject noun upgraded to root, no take-clause formed at
      // all; with the root restored, the PP still had no path).
      let i = verbItem.index + 1;
      while (i < items.length) {
        const item = items[i];
        // The about-phrase (Transcript Slice 6, diagnostic IM3):
        // 'about' classifies as an adverb, so the prep test
        // below stopped this loop at it and the phrase was
        // silently dropped — "what do you know about dogs?"
        // parsed to know/you/what alone and its topic never
        // entered the graph. Position decides, as in the
        // imperative branch: 'about' before a chunk is the
        // preposition, and its topic attaches under the
        // 'about' relation — not the verb's prep slot, not a
        // location, and not the questioned theme.
        if (item.lower === "about") {
          const c = enChunk(items, i + 1);
          if (!c) break;
          const n = enNodeFromChunk(b, c.chunk, "about");
          n.prep = "about";
          b.edge(root, n, "about");
          i = c.next;
          continue;
        }
        if (item.kind !== "prep") break;
        const c = enChunk(items, i + 1);
        if (!c) break;
        let pslot = verb.prepSlot && verb.prepSlot.preps.includes(item.lower) ? verb.prepSlot.slot : item.lower === "to" ? "goal" : "location";
        if (pslot === "location") {
          const headLemma = c.chunk.head.entry?.lemma ?? c.chunk.head.lower;
          const cls = lookupClassification(headLemma);
          if (cls && (cls.aspect === "season" || cls.aspect === "time")) pslot = "time";
        }
        const n = enNodeFromChunk(b, c.chunk, pslot);
        n.prep = item.lower;
        b.edge(root, n, pslot as Relation);
        i = c.next;
      }
    }
    if (slot === "agent") {
      // Post-verbal material of a subject question: bare chunks fill
      // the frame's slots in order; adverbs modulate ("happened
      // first"). Object questions keep the earlier behaviour — their
      // post-verbal region was the gap itself.
      const bareSlots = [...verb.slots];
      let i = verbItem.index + 1;
      while (i < items.length) {
        const item = items[i];
        if (item.lower === "about") {
          // The about-phrase (Transcript Slice 6): as in the
          // object-question loop above — 'about' before a chunk
          // is the preposition, its topic under 'about'.
          const c = enChunk(items, i + 1);
          if (c) {
            const n = enNodeFromChunk(b, c.chunk, "about");
            n.prep = "about";
            b.edge(root, n, "about");
            i = c.next;
            continue;
          }
        }
        if (item.kind === "adverb") {
          const aNode = b.node({ lemma: item.entry ? item.entry.lemma : item.lower, form: item.text, syntacticElement: "Water" }, [item.index]);
          b.edge(aNode, root, "modulates");
          i++;
          continue;
        }
        const c = enChunk(items, i);
        if (c && bareSlots.length) {
          const rel = bareSlots.shift()!;
          const n = enNodeFromChunk(b, c.chunk, rel);
          b.edge(root, n, rel as Relation);
          i = c.next;
          continue;
        }
        break;
      }
    }
    const scaffolding = auxItem ? [{ index: auxItem.index, kind: "do-support" }] : [];
    return {
      meaning: b.graph(root), connective: connective("en", tokens, spans, undefined, scaffolding), realizes: b.realizes, scopeAttachments: scope,
      query: { relation: slot, expectedType: whExpectedType(first.lower) },
    };
  }

  /* --- Relative clause (R5): a clause graph attached as modifier of its
   *     Earth head; the head itself fills the clause's gap (R3 inside R5).
   *     This branch builds the SUBJECT-head shape: the head is the
   *     clause-initial chunk and the main clause is the copula clause
   *     after the relative ("The man that I saw was tall"). The gate
   *     therefore includes the head's position (E2, the emotional-
   *     uptake programme, 2026-11-19): an object-head relative —
   *     "I have a job that I love", the narrative's common shape —
   *     has its head mid-clause, and forcing it through this branch
   *     rooted the relative on the subject chunk and threw on the
   *     absent copula, sinking a turn the ordinary verb path takes
   *     up (with the relative's content dropped, as that path
   *     already drops it for other verbs' object relatives — "I
   *     saw a dog that I saw"). The branch fires only when the
   *     clause-initial chunk's head is the very item 'that'
   *     follows. --- */
  const relPos = items.findIndex((it, k) => it.lower === "that" && k > contentStart && (items[k - 1]?.kind === "noun" || items[k - 1]?.kind === "pronoun"));
  // Subject-gap relative embedded in a matrix object:
  // "You know the team that plays in New York." The relative head
  // supplies the subordinate subject, while the main clause keeps its
  // own subject and object. This is distinct from the clause-initial
  // subject-head relative below and is built compositionally.
  if (relPos > contentStart + 1) {
    const mainVerbItem = items.slice(contentStart, relPos).find((i) => i.kind === "verb");
    const matrixSubject = mainVerbItem ? enChunk(items, contentStart) : null;
    const headStart = relPos - 1;
    const headChunk = enChunk(items, headStart);
    const relativeVerb = items[relPos + 1];
    const relativeEntry =
      relativeVerb?.entry?.kind === "verb" ? relativeVerb.entry as VerbEntry : relativeVerb ? wordnetVerb(relativeVerb.lower) : undefined;
    if (
      mainVerbItem?.entry?.kind === "verb" &&
      matrixSubject && matrixSubject.next === mainVerbItem.index &&
      headChunk && headChunk.next === relPos &&
      relativeVerb && relativeEntry
    ) {
      const mainEntry = mainVerbItem.entry as VerbEntry;
      const matrixRoot = b.node(
        { lemma: mainEntry.lemma, form: mainVerbItem.text, syntacticElement: "Wood", role: "verb" },
        [mainVerbItem.index],
      );
      matrixRoot.states = {
        voice: "active",
        tense: mainVerbItem.formTag === "past" || mainVerbItem.formTag === "past/participle" ? "past" : "present",
        verbForm: mainVerbItem.formTag,
        mood: interrogative ? "interrogative" : "indicative",
        subjectPerson: enSubjectPerson(matrixSubject.chunk),
      };
      const matrixAgent = enNodeFromChunk(b, matrixSubject.chunk, "agent");
      const head = enNodeFromChunk(b, headChunk.chunk, "theme");
      b.edge(matrixRoot, matrixAgent, "agent");
      b.edge(matrixRoot, head, (mainEntry.slots[0] ?? "theme") as Relation);

      const relativeRoot = b.node(
        { lemma: relativeEntry.lemma, form: relativeVerb.text, syntacticElement: "Wood", role: "verb" },
        [relativeVerb.index],
      );
      relativeRoot.states = { voice: "active", tense: relativeVerb.formTag === "past" ? "past" : "present", mood: "indicative", verbForm: relativeVerb.formTag ?? "third" };
      b.edge(relativeRoot, head, "agent");
      b.edge(head, relativeRoot, "modifier", "that");
      const prep = items[relPos + 2];
      if (prep?.kind === "prep") {
        const location = enChunk(items, relPos + 3);
        if (location) {
          const place = enNodeFromChunk(b, location.chunk, "location");
          place.prep = prep.lower;
          b.edge(relativeRoot, place, "location");
        }
      }
      return { meaning: b.graph(matrixRoot), connective: connective("en", tokens, spans), realizes: b.realizes, scopeAttachments: scope };
    }
  }
  if (relPos > 0) {
    const headC = enChunk(items, contentStart);
    const relSubjC = enChunk(items, relPos + 1);
    const relVerbItem = relSubjC ? items.slice(relSubjC.next).find((i) => i.kind === "verb") : undefined;
    if (headC && headC.chunk.end === relPos - 1 && relSubjC && relVerbItem?.entry) {
      const head = enNodeFromChunk(b, headC.chunk, "subject");
      const relVerb = relVerbItem.entry as VerbEntry;
      const clauseRoot = b.node({ lemma: relVerb.lemma, form: relVerbItem.text, syntacticElement: "Wood", role: "verb" }, [relVerbItem.index]);
      clauseRoot.states = { voice: "active", mood: "indicative", tense: relVerbItem.formTag === "past" || relVerbItem.formTag === "past/participle" ? "past" : "present", verbForm: relVerbItem.formTag };
      const relAgent = enNodeFromChunk(b, relSubjC.chunk, "agent");
      b.edge(clauseRoot, relAgent, "agent");
      const gapSlot = relVerb.required[0] ?? relVerb.slots[0] ?? "patient";
      b.edge(clauseRoot, head, gapSlot as Relation);
      b.edge(head, clauseRoot, "modifier", "that");
      const mainBe = items.slice(relVerbItem.index + 1).find((i) => i.kind === "be");
      if (!mainBe) throw new Error(`cannot parse main clause of: ${text}`);
      const compC = enChunk(items, mainBe.index + 1);
      const adjItem = items.slice(mainBe.index + 1).find((i) => i.kind === "adjective");
      let root: MeaningNode;
      if (compC && items[mainBe.index + 1] && (items[mainBe.index + 1].kind === "det" || items[mainBe.index + 1].kind === "noun")) {
        root = enNodeFromChunk(b, compC.chunk, "predicate");
      } else if (adjItem?.entry) {
        const aEntry = adjItem.entry;
        root = b.node(
          { lemma: aEntry.lemma, form: adjItem.text, syntacticElement: "Fire", role: "predicate", ...("semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}) },
          [adjItem.index],
        );
      } else throw new Error(`cannot parse complement of: ${text}`);
      root.states = { copulaTense: EN_BE[mainBe.lower], mood: interrogative ? "interrogative" : "indicative" };
      b.edge(head, root, predRelation(root));
      return { meaning: b.graph(root), connective: connective("en", tokens, spans, headC.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
    }
  }

  /* --- Fragments (stage 3, Part D D2/D3): complete discourse acts
   *     that are not propositions. A topic proposal realises its act
   *     in the connective scaffolding and holds only the topic in the
   *     meaning graph — no predicate is invented for it. A bare
   *     "Why?" is a reason query over a discourse antecedent: with no
   *     antecedent in the sentence it stays unresolved rather than
   *     acquiring a manufactured target. --- */
  if (first?.lower === "what" && items[contentStart + 1]?.lower === "about") {
    const tc = enChunk(items, contentStart + 2);
    if (tc && tc.next >= items.length) {
      const topic = enNodeFromChunk(b, tc.chunk, "topic");
      const scaffolding = [
        { index: first.index, kind: "discourse-act" },
        { index: items[contentStart + 1].index, kind: "discourse-act" },
      ];
      return {
        meaning: b.graph(topic), connective: connective("en", tokens, spans, tc.chunk.head.index, scaffolding), realizes: b.realizes, scopeAttachments: scope,
        discourseAct: "topic-proposal",
      };
    }
  }
  if (items.length === 1 && whyItem) {
    // (whyItem, not first: contentStart already points past it.)
    const root = b.node({ lemma: "why", form: whyItem.text, syntacticElement: "Water", role: "reason", questionWord: true }, [whyItem.index]);
    root.states = { mood: "interrogative" };
    return {
      meaning: b.graph(root), connective: connective("en", tokens, spans), realizes: b.realizes, scopeAttachments: scope,
      discourseAct: "reason-query", query: { relation: "explanation", expectedType: "reason" },
    };
  }

  /* --- Reduced relative (R5, H9's structure): a participle/past clause
   *     with no marker modifies the subject head; the LAST verb is the
   *     clause root. (Reanalysis — recovering this reading after first
   *     taking 'raced' as the root — remains a named non-goal.) --- */
  const allVerbs = items.filter((i) => i.kind === "verb");
  if (allVerbs.length >= 2 && !beItem && !auxItem && !negItem) {
    const subjC0 = enChunk(items, contentStart);
    if (subjC0 && allVerbs[0].index === subjC0.chunk.end + 1) {
      const [v1, v2] = allVerbs;
      const head = enNodeFromChunk(b, subjC0.chunk, "agent");
      const modVerb = v1.entry as VerbEntry;
      const modRoot = b.node({ lemma: modVerb.lemma, form: v1.text, syntacticElement: "Wood", role: "verb" }, [v1.index]);
      modRoot.states = { voice: "active", mood: "indicative", tense: "past", verbForm: v1.formTag };
      b.edge(modRoot, head, "agent");
      let i = v1.index + 1;
      while (i < v2.index) {
        if (items[i].kind === "prep") {
          const pc = enChunk(items, i + 1);
          if (pc) {
            const slot = modVerb.prepSlot && modVerb.prepSlot.preps.includes(items[i].lower) ? modVerb.prepSlot.slot : "location";
            const n = enNodeFromChunk(b, pc.chunk, slot);
            n.prep = items[i].lower;
            b.edge(modRoot, n, slot as Relation);
            i = pc.next;
            continue;
          }
        }
        i++;
      }
      b.edge(head, modRoot, "modifier");
      const mainVerb = v2.entry as VerbEntry;
      const root = b.node({ lemma: mainVerb.lemma, form: v2.text, syntacticElement: "Wood", role: "verb" }, [v2.index]);
      root.states = { voice: "active", mood: interrogative ? "interrogative" : "indicative", tense: v2.formTag === "past" || v2.formTag === "past/participle" ? "past" : "present", verbForm: v2.formTag };
      b.edge(root, head, "agent");
      return { meaning: b.graph(root), connective: connective("en", tokens, spans, subjC0.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
    }
  }

  /* --- Copular question (stage 3, Part D D1): Wh + be + complement.
   *     The relation stays the declarative one (predicated-as /
   *     location / time / contains); the question is an operator over
   *     it, recorded in the query record — never an assertion with a
   *     null filler. The questioned node is the root for nominal,
   *     locative, temporal and containment questions, mirroring the
   *     declarative copula path where the complement is the root. --- */
  if (beItem && !verbItem && first?.kind === "wh") {
    const afterBe = beItem.index + 1;
    const firstAfter = items[afterBe];
    const whNode = (role: string) => b.node(
      { lemma: first.lower, form: first.text, syntacticElement: "Earth", role, questionWord: true },
      [first.index],
    );
    const scaffolding = [{ index: beItem.index, kind: "copula" }];
    if (firstAfter?.kind === "adjective") {
      // Questioned subject, adjective predicate: "What is hot?" — the
      // adjective stays the root; the question word is its topic.
      const aEntry = firstAfter.entry;
      const root = b.node(
        {
          lemma: aEntry ? aEntry.lemma : firstAfter.lower,
          form: firstAfter.text,
          syntacticElement: "Fire",
          ...(aEntry && "semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
          role: "predicate",
        },
        [firstAfter.index],
      );
      root.states = { copulaTense: EN_BE[beItem.lower], mood: "interrogative" };
      b.edge(whNode("subject"), root, "predicate");
      return {
        meaning: b.graph(root), connective: connective("en", tokens, spans, undefined, scaffolding), realizes: b.realizes, scopeAttachments: scope,
        query: { relation: "predicate", expectedType: "entity" },
      };
    }
    if (firstAfter?.kind === "prep" && firstAfter.lower === "in") {
      // Containment: "What's in it?" — NOT nominal predication (D4).
      const cc = enChunk(items, afterBe + 1);
      if (cc) {
        const container = enNodeFromChunk(b, cc.chunk, "container");
        container.prep = "in";
        const root = whNode("contained");
        root.states = { copulaTense: EN_BE[beItem.lower], mood: "interrogative" };
        b.edge(container, root, "contains");
        return {
          meaning: b.graph(root), connective: connective("en", tokens, spans, undefined, scaffolding), realizes: b.realizes, scopeAttachments: scope,
          query: { relation: "contains", expectedType: "entity" },
        };
      }
    }
    const subjC = enChunk(items, afterBe);
    if (subjC) {
      const subject = enNodeFromChunk(b, subjC.chunk, "subject");
      const person = subjC.chunk.head.entry && "person" in subjC.chunk.head.entry
        ? (subjC.chunk.head.entry as { person?: string }).person
        : subjC.chunk.head.lower.endsWith("s") ? "3pl" : "3sg";
      let root: MeaningNode;
      let query: ParsedSentence["query"];
      if (first.lower === "where") {
        root = whNode("location");
        b.edge(subject, root, "location");
        query = { relation: "location", expectedType: "location" };
      } else if (first.lower === "when") {
        root = whNode("time");
        b.edge(subject, root, "time");
        query = { relation: "time", expectedType: "time" };
      } else {
        root = whNode("predicate");
        b.edge(subject, root, "predicated-as");
        const headLemma = subjC.chunk.head.entry ? subjC.chunk.head.entry.lemma : subjC.chunk.head.lower;
        const expectedType =
          first.lower === "who" ? "person"
          : subjC.chunk.det === "a" || subjC.chunk.det === "an" ? "kind"
          : MEASURABLE_HEADS.has(headLemma) ? "quantity"
          : "entity";
        query = { relation: "predicated-as", expectedType };
      }
      root.states = { copulaTense: EN_BE[beItem.lower], mood: "interrogative", subjectPerson: person };
      // A trailing PP after the subject chunk is preserved as a
      // modifier of the subject ("...of Chicago at this moment") —
      // parse-side preservation (amendment A3); its round-trip
      // accounting belongs to stage 5.
      const tail = items[subjC.next];
      if (tail?.kind === "prep") {
        const tc = enChunk(items, subjC.next + 1);
        if (tc) {
          const tNode = enNodeFromChunk(b, tc.chunk, "modifier");
          tNode.prep = tail.lower;
          b.edge(subject, tNode, "modifier");
        }
      }
      return {
        meaning: b.graph(root), connective: connective("en", tokens, spans, subjC.chunk.head.index, scaffolding), realizes: b.realizes, scopeAttachments: scope,
        query,
      };
    }
    throw new Error(`cannot parse copular question: ${text}`);
  }

  /* --- Predicate clause: copula + NP/adjective complement (R1 entry at Earth/Fire). --- */
  if (beItem && !verbItem) {
    // Inverted order (questions: "Is summer hot?", "Why is winter cold?")
    // puts the copula first; the subject chunk follows it.
    const inverted = beItem.index === contentStart;
    const subj = enChunk(items, inverted ? beItem.index + 1 : contentStart, !inverted);
    if (!subj) throw new Error(`cannot parse subject of: ${text}`);
    const subject = enNodeFromChunk(b, subj.chunk, "subject");
    spans.push({ start: subj.chunk.start, end: subj.chunk.end + 1, label: "subject" });
    const compStart = inverted ? subj.chunk.end + 1 : beItem.index + 1;
    const rest = items.slice(compStart);
    let root: MeaningNode;
    if (rest[0]?.kind === "prep") {
      // Locative complement: the place is the predicate ("You are in
      // Chicago") — the declarative counterpart of "Where are you?".
      const pc = enChunk(items, compStart + 1);
      if (!pc) throw new Error(`cannot parse complement of: ${text}`);
      root = enNodeFromChunk(b, pc.chunk, "location");
      root.prep = rest[0].lower;
      root.states = { copulaTense: EN_BE[beItem.lower], mood: interrogative ? "interrogative" : "indicative", ...(whyItem ? { questionKind: "why" } : {}), subjectPerson: subj.chunk.head.entry && "person" in subj.chunk.head.entry ? (subj.chunk.head.entry as { person?: string }).person : "3sg" };
      b.edge(subject, root, "location");
      return { meaning: b.graph(root), connective: connective("en", tokens, spans, subj.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
    }
    // A neg item before the complement ("She is not a doctor") is
    // the clause's negation, not part of the complement chunk.
    const compAt = rest[0]?.kind === "neg" ? compStart + 1 : compStart;
    const compFirst = items[compAt];
    const compChunk = enChunk(items, compAt);
    // An adverb may lead the complement chunk only as a degree
    // adverb grading into a noun phrase (E2, 2026-11-19:
    // "They are very good schools") — the chunker admits that
    // shape and no other adverb-led one, so a bare graded
    // quality ("She is very happy") still falls to the
    // adjective path below, its chunk having failed. The
    // adverb-led admission requires a genuine noun head: a
    // "proper" head here is the unknown-word default wearing
    // a head's clothes ("I am awfully sorry for…" — 'for'
    // classifies proper after the quality, and a chunk headed
    // by it roots the clause on the preposition).
    if (compChunk && compFirst && (compFirst.kind === "det" || compFirst.kind === "noun" || compFirst.kind === "proper" || compFirst.kind === "pronoun" || (compFirst.kind === "adverb" && compChunk.chunk.head.kind === "noun"))) {
      const c = compChunk;
      root = enNodeFromChunk(b, c!.chunk, "predicate");
    } else {
      const adjItem = rest.find((r) => r.kind === "adjective");
      /* The predicate quality's second reading (E2, the
       * emotional-uptake programme, 2026-11-19): a noun-kind
       * item carrying an adjective derivation, standing where
       * the complement's quality must stand, is the quality —
       * "The spot was really bad", where 'bad' resolves
       * noun-first in the item fallback and the degree adverb
       * before it is a quality's company, not a noun's. The
       * chunker's graded re-read is the same judgement inside
       * a noun phrase; position is the evidence in both. */
      const nounItem = adjItem ? undefined : rest.find((r) => r.kind === "noun" && wordnetAdjective(r.lower) !== undefined);
      const adj = adjItem ?? nounItem;
      if (!adj) throw new Error(`cannot parse complement of: ${text}`);
      const aEntry = adjItem ? adj.entry : wordnetAdjective(adj.lower);
      if (nounItem && aEntry) registerDerivedEntry(aEntry, adj.lower);
      root = b.node(
        {
          lemma: aEntry ? aEntry.lemma : adj.lower,
          form: adj.text,
          syntacticElement: "Fire",
          ...(aEntry && "semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
          role: "predicate",
        },
        [adj.index],
      );
      // A degree adverb immediately before the quality grades
      // it (E2): the same Water modulates closure as inside a
      // noun phrase — "really bad" keeps its 'really'.
      const degAdv = rest[rest.indexOf(adj) - 1];
      if (degAdv?.kind === "adverb") {
        const advEntry = degAdv.entry;
        const advNode = b.node(
          { lemma: advEntry ? advEntry.lemma : degAdv.lower, form: degAdv.text, syntacticElement: "Water" },
          [degAdv.index],
        );
        b.edge(advNode, root, "modulates");
      }
    }
    root.states = { copulaTense: EN_BE[beItem.lower], mood: interrogative ? "interrogative" : "indicative", ...(whyItem ? { questionKind: "why" } : {}), subjectPerson: subj.chunk.head.entry && "person" in subj.chunk.head.entry ? (subj.chunk.head.entry as { person?: string }).person : subj.chunk.head.lower.endsWith("s") ? "3pl" : "3sg",
      // Copula negation ("She is not happy"): the copula is the
      // carrier (Metal), as with the auxiliary in a verbal clause.
      // Until stage 5 this branch never consumed the neg item and
      // the sentence regenerated affirmative — F1's English twin.
      ...(negItem ? { negated: true, negation: { negator: "not", carrier: beItem.lower } } : {}) };
    b.edge(subject, root, predRelation(root));
    return { meaning: b.graph(root), connective: connective("en", tokens, spans, subj.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
  }

  if (!verbItem && !beItem) {
    // Bare nominal fragment ("Coffee."): a complete discourse act
    // whose function is discourse-recovered — the parser records the
    // nominal and deliberately assigns NO discourse act (D2/A1: the
    // distinction from a topic proposal is exactly the act field).
    const c = enChunk(items, contentStart);
    if (c && c.next >= items.length) {
      const root = enNodeFromChunk(b, c.chunk, "topic");
      return { meaning: b.graph(root), connective: connective("en", tokens, spans, c.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
    }
    /* The prepositional and marker-led fragments (IMP-1, the
     * implementation programme, 2026-11-19): a verbless turn is
     * not always a bare nominal. An answer fragment is routinely
     * a prepositional phrase ("In most circumstances.") or a
     * nominal behind a discourse marker ("Yes, in most
     * circumstances.") — both complete discourse acts of the
     * same kind as the bare nominal, and both sank on "no verb
     * found" because the fragment path above only chunks from
     * the content start. The extension is the same shape, twice
     * widened: leading discourse markers and commas are
     * scaffolding (the answer's polarity carrier, not its
     * content), and a preposition before the chunk is the
     * fragment's own relation, recorded on the root as the
     * locative complement records it. Nothing else changes: the
     * chunk must still consume the turn entire, and no discourse
     * act is assigned. */
    {
      let fs = contentStart;
      const MARKERS = new Set(["yes", "no", "well", "ok", "yeah"]);
      while (fs < items.length && (items[fs].kind === "comma" || MARKERS.has(items[fs].lower))) fs++;
      if (fs < items.length && items[fs].kind === "prep") {
        const pc = enChunk(items, fs + 1);
        if (pc && pc.next >= items.length) {
          const root = enNodeFromChunk(b, pc.chunk, "topic");
          root.prep = items[fs].lower;
          return { meaning: b.graph(root), connective: connective("en", tokens, spans, pc.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
        }
      } else if (fs > contentStart && fs < items.length) {
        const mc = enChunk(items, fs);
        if (mc && mc.next >= items.length) {
          const root = enNodeFromChunk(b, mc.chunk, "topic");
          return { meaning: b.graph(root), connective: connective("en", tokens, spans, mc.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
        }
      }
    }
    // The thanked fragment with its intensifier tail (conversation-
    // shapes C1, 2026-11-18): "Thanks so much." / "Thanks very
    // much." / "Thanks a lot." — the nominal chunk is complete at
    // "thanks" and what follows is only the adverbial tail (or the
    // "a lot" chunk), which the fragment's graph does not carry,
    // as a fragment's trailing modifiers are not its content. The
    // signature is the head itself: no other fragment head takes
    // this tail in the closed social vocabulary.
    if (c && c.chunk.head.lower === "thanks") {
      const rest = items.slice(c.next);
      const INTENSIFIERS = new Set(["so", "very", "much", "really", "truly"]);
      const adverbialTail =
        rest.length > 0 && rest.every((i) => i.kind === "adverb" || INTENSIFIERS.has(i.lower));
      const aLotTail =
        rest.length === 2 && rest[0].lower === "a" && rest[1].lower === "lot";
      if (adverbialTail || aLotTail) {
        const root = enNodeFromChunk(b, c.chunk, "topic");
        return { meaning: b.graph(root), connective: connective("en", tokens, spans, c.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
      }
    }
  }
  if (!verbItem || !verbItem.entry) throw new Error(`no verb found in: ${text}`);
  const verb = verbItem.entry as VerbEntry;

  /* --- Passive: be + participle (voice state, same meaning graph as active). --- */
  const isPassive = !!beItem && (verbItem.formTag === "participle" || verbItem.formTag === "past/participle");

  const root = b.node(
    { lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" },
    [verbItem.index, ...(auxItem ? [auxItem.index] : []), ...(negItem ? [negItem.index] : [])],
  );
  // Tense rides the carrier when there is one (F.2): 'did' is past
  // though the verb it carries stays in base form — reading tense
  // off the verb's form alone reported a did-question as present
  // (sealed-run mechanism 6). In the passive the carrier is the
  // be-auxiliary, whose participle verb never carries tense itself:
  // 'is bitten' is present, 'was bitten' is past.
  const clauseTense =
    auxItem?.lower === "did" ? "past"
    : isPassive && beItem ? beItem.lower === "was" ? "past" : "present"
    : verbItem.formTag === "past" || verbItem.formTag === "past/participle" ? "past"
    : "present";
  root.states = {
    voice: isPassive ? "passive" : "active",
    tense: clauseTense,
    verbForm: verbItem.formTag,
    mood: interrogative ? "interrogative" : "indicative",
    ...(negItem ? { negated: true } : {}),
    // The structured negation record (Part F.2): the carrier is the
    // same auxiliary the aux spread below resolves — generation
    // emits the carrier the record specifies, and the feature
    // atoms read it back, so the carrier configuration survives
    // the round trip instead of being re-guessed from the surface.
    ...(negItem ? { negation: { negator: "not", carrier: auxItem?.lower ?? (beItem && (isPassive || verbItem.formTag === "ing") ? beItem.lower : undefined) } } : {}),
    ...(whyItem ? { questionKind: "why" as const } : {}),
    ...(auxItem ? { aux: auxItem.lower } : {}),
    ...(beItem && (isPassive || verbItem.formTag === "ing") && !auxItem ? { aux: beItem.lower } : {}),
    ...enAspectBundle(auxItem, beItem, verbItem, isPassive, !!items.find((i) => i.lower === "been" && auxItem && i.index > auxItem.index && i.index < verbItem.index)),
  };

  /* F1 routing (coverage slice, stage 3): the Link Grammar
   * shadow, computed here so the main branch can walk it.
   * Routing reads the linkage ONLY when it is complete — a
   * partial linkage (UNUSED > 0) never becomes a parse (the
   * brief's hard rule; negation is the named hazard) — and
   * only where the linkage's S/O evidence contradicts the
   * positional assignment. The record the sentence carries is
   * attached by parseEn's attempt() as before. */
  const f1Shadow = linkageRouting("f1") ? safeSolveLinkage(tokens) : undefined;
  const f1Link = (family: string, fromToken: number, toToken: number) =>
    f1Shadow?.links.find(
      (l) => l.family === family && f1Shadow.tokenIndices[l.left] === fromToken && f1Shadow.tokenIndices[l.right] === toToken,
    );
  const f1ObjectLink = (toToken: number) =>
    f1Shadow?.links.find(
      (l) => l.family === "O" && f1Shadow.tokenIndices[l.left] === verbItem.index && f1Shadow.tokenIndices[l.right] === toToken,
    );

  // Topic fronting (R3): a chunk set off by a comma before the clause is
  // a displaced constituent — it fills a clause slot in the meaning
  // graph (below, after the clause is built) and is marked as topic in
  // the connective graph only.
  const commaItem = items.find((i) => i.kind === "comma");
  let frontedChunk: EnChunk | undefined;
  let subjStart = contentStart;
  if (commaItem && commaItem.index > contentStart) {
    const fc = enChunk(items, contentStart);
    if (fc && fc.chunk.end === commaItem.index - 1) {
      frontedChunk = fc.chunk;
      subjStart = commaItem.index + 1;
    }
  }

  // Subject chunk: everything before the first of aux/be/verb.
  const boundary = Math.min(...[auxItem?.index, beItem?.index, verbItem.index].filter((x): x is number => x !== undefined));
  let subj = enChunk(items, subjStart, true);
  let invertedSubject = false;
  if ((!subj || subj.chunk.end >= boundary + 1) && interrogative && boundary < verbItem.index) {
    // Inverted question order ("Why did she leave?", "Why is the
    // garden flooded?"): the subject sits between the fronted
    // auxiliary/copula and the verb. Without this recovery the main
    // path silently dropped it — the parse behind the stage-0 F3
    // generation crash on "Why is the garden flooded?".
    const alt = enChunk(items, boundary + 1);
    if (alt && alt.chunk.end < verbItem.index) {
      subj = alt;
      invertedSubject = true;
    }
  }
  let subjectNode: MeaningNode | undefined;
  let subjectEdge: MeaningEdge | undefined;
  /** Passive bare-NP arguments, slot assignment deferred to finalisation. */
  const passiveBareArgs: { node: MeaningNode; edge: MeaningEdge }[] = [];
  if (subj && (invertedSubject || subj.chunk.end < boundary + 1)) {
    subjectNode = enNodeFromChunk(b, subj.chunk, isPassive ? "patient" : "agent");
    spans.push({ start: subj.chunk.start, end: subj.chunk.end + 1, label: "subject" });
    b.edge(root, subjectNode, isPassive ? "patient" : "agent");
    if (isPassive) subjectEdge = b.edges[b.edges.length - 1];
    const person = subj.chunk.head.entry && "person" in subj.chunk.head.entry ? (subj.chunk.head.entry as { person?: string }).person : subj.chunk.head.lower.endsWith("s") ? "3pl" : "3sg";
    root.states.subjectPerson = person;
    // Base/past-ambiguous forms ("put"): with a 3sg subject the bare
    // form can only be past — the present reading would have required
    // the third-person form (Metal→Wood agreement, read in reverse).
    if (root.states.verbForm === "base" && verb.forms.base === verb.forms.past && person === "3sg") {
      root.states.tense = "past";
      root.states.verbForm = "past";
    }
  }

  /* F1 subject routing was attempted here and REFUSED on
   * evidence: recovering a missing positional subject from a
   * complete linkage's S-link misfires on locative inversion
   * — "On the mat sat the cat." (positional: no agent, cat as
   * theme) gained agent:mat from the linkage's S partner,
   * which is the locative, not the subject. The S side of F1
   * therefore does not route in this slice; the refusal and
   * its case are recorded in the Linkage placeholder. */

  // Pre-verbal adverbs ("quickly chopped", "hadn't yet arrived") attach
  // to the verb by the same Water→Wood closure as post-verbal ones.
  for (const item of items) {
    if (item.kind === "adverb" && item.index < verbItem.index) {
      const aNode = b.node({ lemma: item.entry ? item.entry.lemma : item.lower, form: item.text, syntacticElement: "Water" }, [item.index]);
      b.edge(aNode, root, "modulates");
    }
  }

  // Post-verbal region: adverbs, bare NP chunks (frame slots in order), PPs.
  const bareSlots = [...verb.slots];
  let i = verbItem.index + 1;
  while (i < items.length) {
    const item = items[i];
    if (item.lower === "about") {
      // The about-phrase (Transcript Slice 6): 'about' classifies
      // as an adverb, so the adverb rule below took the word as a
      // modulator and the following chunk filled a bare slot —
      // "i know about dogs." filed 'dog' as know's THEME, the
      // thing known, where the sentence says only what the
      // knowing is about. Position decides, as in the imperative
      // branch: 'about' before a chunk is the preposition, and
      // its topic attaches under the 'about' relation. A
      // chunkless 'about' falls through to the adverb reading.
      const c = enChunk(items, i + 1);
      if (c) {
        const n = enNodeFromChunk(b, c.chunk, "about");
        n.prep = "about";
        b.edge(root, n, "about");
        spans.push({ start: i, end: c.chunk.end + 1, label: "pp" });
        i = c.next;
        continue;
      }
    }
    if (item.kind === "adjective") {
      // Resultative complement (R6): a bare post-verbal adjective is the
      // clause's result content — the generating Wood→Fire arc itself,
      // carried as main content, not dropped or demoted to a modifier.
      const aEntry = item.entry;
      const rNode = b.node(
        {
          lemma: aEntry ? aEntry.lemma : item.lower,
          form: item.text,
          syntacticElement: "Fire",
          role: "result",
          ...(aEntry && "semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
        },
        [item.index],
      );
      b.edge(root, rNode, "result");
      i++;
      continue;
    }
    if (item.kind === "adverb") {
      const aNode = b.node({ lemma: item.entry ? item.entry.lemma : item.lower, form: item.text, syntacticElement: "Water" }, [item.index]);
      b.edge(aNode, root, "modulates"); // Water→Wood: generating closure
      i++;
      continue;
    }
    if (item.kind === "prep") {
      const c = enChunk(items, i + 1);
      if (!c) { i++; continue; }
      const prep = item.lower;
      if (isPassive && prep === "by") {
        const agent = enNodeFromChunk(b, c.chunk, "agent");
        agent.prep = "by";
        b.edge(root, agent, "agent");
      } else {
        let slot = verb.prepSlot && verb.prepSlot.preps.includes(prep) ? verb.prepSlot.slot : prep === "to" ? "goal" : "location";
        // Temporal resolution (Part F.4): a PP whose head is one of
        // the ontology's classified time concepts (aspect season /
        // time — spring, dawn, night…) is a TIME attachment into
        // the ontology, not a location. "He sleeps in winter" was
        // parsed as sleeping in a place called winter.
        if (slot === "location") {
          const headLemma = c.chunk.head.entry?.lemma ?? c.chunk.head.lower;
          const cls = lookupClassification(headLemma);
          if (cls && (cls.aspect === "season" || cls.aspect === "time")) slot = "time";
        }
        const node = enNodeFromChunk(b, c.chunk, slot);
        node.prep = prep;
        b.edge(root, node, slot as Relation);
      }
      spans.push({ start: i, end: c.chunk.end + 1, label: "pp" });
      i = c.next;
      continue;
    }
    const c = enChunk(items, i);
    if (c) {
      if (isPassive) {
        // Defer: which slot a passive's bare NP fills depends on which
        // slot the promoted subject took, settled at finalisation.
        const node = enNodeFromChunk(b, c.chunk, "pending");
        b.edge(root, node, "patient");
        passiveBareArgs.push({ node, edge: b.edges[b.edges.length - 1] });
      } else {
        const slot = bareSlots.shift();
        if (slot) {
          const node = enNodeFromChunk(b, c.chunk, slot);
          b.edge(root, node, slot as Relation);
        } else {
          // Excess bare NP: keep it as an unslotted object so the valency
          // checker can name the excess (Wood→Earth control).
          const node = enNodeFromChunk(b, c.chunk, "excess");
          b.edge(root, node, "patient");
          node.role = "excess";
        }
      }
      spans.push({ start: c.chunk.start, end: c.chunk.end + 1, label: "object" });
      i = c.next;
      continue;
    }
    i++;
  }

  // A degree adverb caught between verb and result ("gone all brown")
  // modulates the result, not the verb: retarget its edge.
  const resultEdge = b.edges.find((e) => e.from === root.id && e.relation === "result");
  if (resultEdge) {
    const resultNode = b.nodes.find((n) => n.id === resultEdge.to)!;
    const resultToken = (b.realizes[resultNode.id] ?? [])[0] ?? Infinity;
    for (const e of b.edges) {
      if (e.relation === "modulates" && e.to === root.id) {
        const advToken = (b.realizes[e.from] ?? [])[0] ?? -1;
        if (advToken > verbItem.index && advToken < resultToken) {
          e.to = resultNode.id;
          e.cycle = cycleOf("Water", "Fire");
        }
      }
    }
  }

  /* --- F1 object classification (coverage slice, stage 3):
   *     a ditransitive's two bare objects were assigned the
   *     frame's slots positionally (first chunk = first slot).
   *     Link Grammar's O-links classify them independently:
   *     the indirect object carries the O*n connector, the
   *     direct object a plain O. Where a complete linkage
   *     classifies the two chunks opposite to the positional
   *     assignment, the linkage's classification stands and
   *     the two slots swap. Agreement, a single object, an
   *     excess argument, or a partial linkage: positional
   *     stands untouched. --- */
  if (!isPassive && linkageRouting("f1") && f1Shadow && verb.slots.includes("recipient")) {
    const objEdges = b.edges.filter(
      (e) =>
        e.from === root.id &&
        (e.relation === "recipient" || e.relation === "theme" || e.relation === "patient") &&
        !b.nodes.find((n) => n.id === e.to)?.prep &&
        b.nodes.find((n) => n.id === e.to)?.role !== "excess",
    );
    if (objEdges.length === 2) {
      const classify = (e: MeaningEdge): "indirect" | "direct" | undefined => {
        const node = b.nodes.find((n) => n.id === e.to);
        const toks = node ? (b.realizes[node.id] ?? []) : [];
        for (const t of toks) {
          const link = f1ObjectLink(t);
          if (link) return link.connector.startsWith("O*n") || link.connector === "Oi" ? "indirect" : "direct";
        }
        return undefined;
      };
      const [e1, e2] = objEdges;
      const c1 = classify(e1);
      const c2 = classify(e2);
      if (c1 && c2 && c1 !== c2) {
        const indirectEdge = c1 === "indirect" ? e1 : e2;
        const directEdge = c1 === "indirect" ? e2 : e1;
        if (indirectEdge.relation !== "recipient" && directEdge.relation === "recipient") {
          const directSlot = indirectEdge.relation;
          indirectEdge.relation = "recipient";
          directEdge.relation = directSlot;
          const inNode = b.nodes.find((n) => n.id === indirectEdge.to);
          const dirNode = b.nodes.find((n) => n.id === directEdge.to);
          if (inNode) inNode.role = "recipient";
          if (dirNode) dirNode.role = directSlot;
        }
      }
    }
  }

  /* --- Lone-object alternation (stage 1): a ditransitive frame
   *     ([recipient, theme]) with exactly ONE bare object has that
   *     object positionally in the recipient slot — but the canonical
   *     single-object reading is the required object role ("He showed
   *     the photo", "She taught grammar", "She sang a song"). Relabel
   *     it to the unfilled required object slot, unless the filler is
   *     a pronoun: a lone pronoun object keeps the recipient reading
   *     ("He showed her"). Full-NP animate objects ("the students")
   *     are the known trade-off of this partial animacy gate — the
   *     depth-cycle evaluation named the full gate as future work. --- */
  if (!isPassive) {
    const objectEdges = b.edges.filter(
      (e) => e.from === root.id && (e.relation === "recipient" || e.relation === "theme" || e.relation === "patient"),
    );
    const recipientEdge = objectEdges.find((e) => e.relation === "recipient");
    const coreRequired = verb.frameSignature?.required ?? verb.required;
    const requiredObject = ["theme", "patient"].find(
      (r) => coreRequired.includes(r) && !objectEdges.some((e) => e.relation === r),
    );
    if (objectEdges.length === 1 && recipientEdge && requiredObject) {
      const filler = b.nodes.find((n) => n.id === recipientEdge.to);
      const PRONOUNS = new Set(["i", "you", "it", "them", "she", "he", "him", "her", "we", "they", "me", "us"]);
      if (filler && !PRONOUNS.has(filler.lemma)) {
        recipientEdge.relation = requiredObject as Relation;
        filler.role = requiredObject;
      }
    }
  }

  /* --- Passive slot finalisation + suppression (repair H1's
   *     representation): the promoted subject and the surviving bare
   *     NPs fill the frame's bare slots RIGHT-ALIGNED — the objects
   *     surface in frame order, so with fewer NPs than slots the
   *     skipped slots are the early ones ("He was given a book":
   *     recipient + theme both present; "The book was given": the
   *     subject is the theme, the recipient skipped). Skipped required
   *     slots, and the agent when no by-phrase expresses it, stay
   *     DECLARED on the predicate as suppressedRoles: the valency is
   *     intact, the realisation is suppressed — not a missing argument
   *     for the checker, not a filler for generation to invent. --- */
  if (isPassive) {
    const slots = verb.slots;
    const total = (subjectNode ? 1 : 0) + passiveBareArgs.length;
    const subjectIdx = total <= slots.length ? slots.length - total : 0;
    if (subjectNode && subjectEdge) {
      const slot = slots[subjectIdx] ?? "patient";
      subjectNode.role = slot;
      subjectEdge.relation = slot as Relation;
    }
    passiveBareArgs.forEach(({ node, edge }, j) => {
      const idx = subjectIdx + (subjectNode ? 1 : 0) + j;
      if (idx < slots.length) {
        node.role = slots[idx];
        edge.relation = slots[idx] as Relation;
      } else {
        node.role = "excess";
        edge.relation = "patient";
      }
    });
    const suppressed: string[] = [];
    if (!b.edges.some((e) => e.from === root.id && e.relation === "agent")) suppressed.push("agent");
    for (let s = 0; s < subjectIdx; s++) if (verb.required.includes(slots[s])) suppressed.push(slots[s]);
    if (suppressed.length && root.states) root.states.suppressedRoles = suppressed;
  }

  // Fronted constituent (R3): the displaced chunk fills the clause slot
  // left empty on the surface — same meaning graph as the unfronted
  // sentence; only the connective graph knows it was fronted.
  let frontedTopic: number | undefined;
  if (frontedChunk) {
    const filled = new Set<string>(b.edges.filter((e) => e.from === root.id).map((e) => e.relation));
    const slot = verb.required.find((s) => !filled.has(s)) ?? verb.slots.find((s) => !filled.has(s)) ?? "patient";
    const node = enNodeFromChunk(b, frontedChunk, slot);
    b.edge(root, node, slot as Relation);
    frontedTopic = frontedChunk.head.index;
  }

  const topicIndex = frontedTopic ?? (isPassive ? (subjectNode ? items.findIndex((x) => x.lower === subjectNode!.form.toLowerCase()) : undefined) : undefined);
  return {
    meaning: b.graph(root), connective: connective("en", tokens, spans, topicIndex), realizes: b.realizes, scopeAttachments: scope,
    ...(whyItem && interrogative ? { query: { relation: "explanation", expectedType: "reason" } } : {}),
  };
}

/* ================= Chinese ================= */

interface ZhItem {
  text: string;
  index: number;
  entry?: LexEntry;
  func?: string;
}

function zhTokenize(text: string): { tokens: string[]; interrogative: boolean } {
  const interrogative = /[？?]\s*$/.test(text);
  const cleaned = text.trim().replace(/[。！？?!.\s]+$/, "");
  const keys = [...Object.keys(ZH_LEXICON), ...Object.keys(ZH_FUNCTION)].sort((a, b2) => b2.length - a.length);
  const tokens: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const rest = cleaned.slice(i);
    const key = keys.find((k) => rest.startsWith(k));
    if (key) { tokens.push(key); i += key.length; }
    else { tokens.push(cleaned[i]); i++; }
  }
  return { tokens, interrogative };
}

function zhItems(tokens: string[]): ZhItem[] {
  return tokens.flatMap((text, index) => {
    // 没有 is one token but two morphemes for this parser: the
    // negator 没 and the verb 有 it negates (categorically — 有
    // never takes 不）. Expand it here so the main loop's negation
    // handling sees the ordinary preverbal shape.
    if (text === "没有") {
      return [
        { text: "没", index, func: "negation" },
        { text: "有", index, entry: ZH_LEXICON["有"] },
      ] as ZhItem[];
    }
    return [{ text, index, entry: ZH_LEXICON[text], func: ZH_FUNCTION[text] }];
  });
}

function parseZh(text: string): ParsedSentence {
  const { tokens, interrogative } = zhTokenize(text);
  const items = zhItems(tokens);
  const b = new Builder();
  const spans: ConnectiveGraph["spans"] = [];
  const scope: ParsedSentence["scopeAttachments"] = [];

  const nounNode = (item: ZhItem, role?: string): MeaningNode => {
    const entry = item.entry;
    const node = b.node(
      {
        lemma: entry ? entry.lemma : item.text,
        form: item.text,
        syntacticElement: "Earth",
        ...(entry && "semanticElement" in entry && entry.semanticElement ? { semanticElement: entry.semanticElement } : {}),
        ...(entry && "question" in entry && entry.question ? { questionWord: true } : {}),
        ...(role ? { role } : {}),
      },
      [item.index],
    );
    // Classifier generation (Earth→Metal): a counted noun's classifier
    // is generated by the noun; parse it when numeral+classifier precede.
    return node;
  };

  const collectParticles = (from: number, upto: number, targets: MeaningNode[]) => {
    for (let k = from; k < upto; k++) {
      const it = items[k];
      if (it.func === "aspect-particle") scope.push({ form: it.text, kind: "aspect", targetId: targets[targets.length - 1]?.id });
      else if (it.func === "question-particle") scope.push({ form: it.text, kind: "question" });
      else if (it.func === "attitude-particle") scope.push({ form: it.text, kind: "attitude" });
    }
  };

  const baIdx = items.findIndex((i) => i.func === "ba-marker");
  const beiIdx = items.findIndex((i) => i.func === "bei-marker");

  /* --- 把 construction: agent 把 theme verb 在 location 上 (theme topicalised). --- */
  // The guard matters beyond tidiness: 把 is also a classifier
  // （三把刀）, where it follows a numeral and no verb follows IT —
  // without the verb check the counted phrase was dragged into
  // this branch and crashed on the missing verb.
  if (baIdx > 0 && items[baIdx + 2]?.entry?.kind === "verb") {
    const agent = nounNode(items[0], "agent");
    const theme = nounNode(items[baIdx + 1], "theme");
    const verbItem = items[baIdx + 2];
    const verb = verbItem.entry as VerbEntry;
    const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" }, [verbItem.index]);
    root.states = { voice: "active", construction: "ba", mood: interrogative ? "interrogative" : "indicative" };
    b.edge(root, agent, "agent");
    b.edge(root, theme, "theme");
    // Location phrase after the verb: 在 + noun + (上)
    const zaiIdx = items.findIndex((i, k) => k > verbItem.index && i.func === "preposition");
    if (zaiIdx > 0) {
      const loc = nounNode(items[zaiIdx + 1], "location");
      loc.prep = "在";
      if (items[zaiIdx + 2]?.func === "locative-suffix") loc.suffix = items[zaiIdx + 2].text;
      b.edge(root, loc, "location");
    }
    spans.push({ start: baIdx + 1, end: baIdx + 2, label: "theme(topic)" });
    return { meaning: b.graph(root), connective: connective("zh", tokens, spans, theme ? items[baIdx + 1].index : undefined), realizes: b.realizes, scopeAttachments: scope };
  }

  /* --- 被 passive: theme 被 agent verb (result) (了). Voice state, as in English.
   *     Agentless form （饭被吃了）: the verb follows 被 directly; the agent
   *     slot stays declared as suppressed (repair H1), as in English. --- */
  if (beiIdx > 0) {
    const theme = nounNode(items[0], "patient");
    const agentless = items[beiIdx + 1]?.entry?.kind === "verb";
    const agent = agentless ? undefined : nounNode(items[beiIdx + 1], "agent");
    const verbItem = items[agentless ? beiIdx + 1 : beiIdx + 2];
    // An unattested verb (outside the ZH lexicon's territory)
    // fails as a parse error, not as a crash on the missing
    // entry (GAPS §5, guarded 2026-11-18).
    if (!verbItem?.entry || verbItem.entry.kind !== "verb") {
      throw new Error(`cannot parse bei passive of: ${tokens.join("")} — the verb after 被 has no lexicon entry`);
    }
    const verb = verbItem.entry as VerbEntry;
    const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" }, [verbItem.index]);
    root.states = { voice: "passive", construction: "bei", mood: interrogative ? "interrogative" : "indicative" };
    if (agentless) root.states.suppressedRoles = ["agent"];
    const resultItem = items[(agentless ? beiIdx + 2 : beiIdx + 3)];
    if (resultItem && !resultItem.entry && !resultItem.func) root.states.result = resultItem.text;
    else if (resultItem?.text === "走") root.states.result = "走";
    if (root.states.result) b.realizes[root.id] = [verbItem.index, resultItem!.index];
    b.edge(root, theme, "patient");
    if (agent) b.edge(root, agent, "agent");
    collectParticles(0, items.length, [root]);
    const aspectP = scope.find((s) => s.kind === "aspect");
    if (aspectP) root.states.aspect = zhAspectFor(aspectP.form);
    spans.push({ start: 0, end: 1, label: "theme(topic)" });
    return { meaning: b.graph(root), connective: connective("zh", tokens, spans, 0), realizes: b.realizes, scopeAttachments: scope };
  }

  /* --- 一边…一边 correlative (R8): ONE Metal relation realised by two
   *     discontinuous tokens; the two verbs chain under it. --- */
  const corrIdxs = items.filter((i) => i.func === "correlative").map((i) => i.index);
  if (corrIdxs.length >= 2) {
    const v1Item = items[corrIdxs[0] + 1];
    const v2Item = items[corrIdxs[1] + 1];
    if (v1Item?.entry?.kind === "verb" && v2Item?.entry?.kind === "verb") {
      const subject = nounNode(items[0], "agent");
      const mkVerb = (it: ZhItem) => {
        const node = b.node({ lemma: (it.entry as VerbEntry).lemma, form: it.text, syntacticElement: "Wood", role: "verb" }, [it.index]);
        node.states = { voice: "active", mood: interrogative ? "interrogative" : "indicative", construction: "correlative" };
        b.edge(node, subject, "agent");
        return node;
      };
      const v1 = mkVerb(v1Item);
      const v2 = mkVerb(v2Item);
      b.edge(v1, v2, "chains-to", "一边…一边");
      const rel = b.node({ lemma: "一边…一边", form: "一边…一边", syntacticElement: "Metal", role: "correlative" }, [corrIdxs[0], corrIdxs[1]]);
      b.edge(rel, v1, "links");
      b.edge(rel, v2, "links");
      return { meaning: b.graph(v1), connective: connective("zh", tokens, spans, 0), realizes: b.realizes, scopeAttachments: scope };
    }
  }

  /* --- Relative clause (R5): clause + 的 before its head noun — a whole
   *     clause graph doing the modifying job, precedence reversed vs EN.
   *     The head fills the clause's object gap. --- */
  const relIdx = items.findIndex((i) => i.func === "relative-marker");
  if (relIdx > 0 && items[relIdx + 1] && (items[relIdx + 1].entry?.kind === "noun" || items[relIdx + 1].entry?.kind === "pronoun")) {
    const clauseVerbItem = items.slice(0, relIdx).find((i) => i.entry?.kind === "verb");
    const adjItem = items.slice(relIdx + 2).find((i) => i.entry?.kind === "adjective");
    if (clauseVerbItem && adjItem) {
      const head = nounNode(items[relIdx + 1], "subject");
      const clauseVerb = clauseVerbItem.entry as VerbEntry;
      const clauseRoot = b.node({ lemma: clauseVerb.lemma, form: clauseVerbItem.text, syntacticElement: "Wood", role: "verb" }, [clauseVerbItem.index]);
      clauseRoot.states = { voice: "active", mood: "indicative" };
      if (items[0] !== clauseVerbItem && items[0].entry && items[0].entry.kind !== "verb") {
        const agent = nounNode(items[0], "agent");
        b.edge(clauseRoot, agent, "agent");
      }
      b.edge(clauseRoot, head, (clauseVerb.slots[0] ?? "patient") as Relation);
      b.edge(head, clauseRoot, "modifier", "的");
      const aEntry = adjItem.entry!;
      const root = b.node(
        {
          lemma: aEntry.lemma, form: adjItem.text, syntacticElement: "Fire", role: "predicate",
          ...("semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
        },
        [adjItem.index],
      );
      root.states = { mood: interrogative ? "interrogative" : "indicative" };
      b.edge(head, root, "predicate");
      const degItem = items.find((i) => i.func === "degree");
      if (degItem) {
        const deg = b.node({ lemma: degItem.text, form: degItem.text, syntacticElement: "Water" }, [degItem.index]);
        b.edge(deg, root, "modulates");
      }
      return { meaning: b.graph(root), connective: connective("zh", tokens, spans, items[relIdx + 1].index), realizes: b.realizes, scopeAttachments: scope };
    }
  }

  /* --- Counted noun phrase standing alone: 三本书 / *三书. --- */
  const numeralIdx = items.findIndex((i) => i.func === "numeral");
  const verbItems = items.filter((i) => i.entry?.kind === "verb");
  if (numeralIdx >= 0 && verbItems.length === 0) {
    const nounItem = items[items.length - 1];
    const root = nounNode(nounItem);
    const clfItem = items.find((i) => i.func === "classifier");
    if (clfItem) {
      const clf = b.node({ lemma: clfItem.text, form: items[numeralIdx].text + clfItem.text, syntacticElement: "Metal" }, [numeralIdx, clfItem.index]);
      b.edge(root, clf, "has-classifier"); // Earth→Metal: generating
    }
    return { meaning: b.graph(root), connective: connective("zh", tokens, spans), realizes: b.realizes, scopeAttachments: scope };
  }

  /* --- A-not-A: verb 不/没 verb (one interrogative force, two realisations would clash). --- */
  const aNotA = items.findIndex((i, k) => i.func === "negation" && k > 0 && items[k - 1].entry?.kind === "verb" && items[k + 1]?.text === items[k - 1].text);
  if (aNotA > 0) {
    const verbItem = items[aNotA - 1];
    const verb = verbItem.entry as VerbEntry;
    const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" },
      [verbItem.index, items[aNotA].index, items[aNotA + 1].index]);
    // The embedded negator is recorded, not assumed: with a bounded
    // reading the A-not-A negator is 没 （他去没去）, elsewhere 不 —
    // the bundle rule of Part F.2 predicts which, and the record is
    // what generation re-emits.
    root.states = { mood: "interrogative", construction: "a-not-a", voice: "active", negation: { negator: items[aNotA].text, carrier: items[aNotA].text } };
    if (aNotA >= 2) {
      const subj = nounNode(items[0], "agent");
      b.edge(root, subj, "agent");
    }
    // Objects after the repeated verb, if any （他去不去学校）.
    for (let k = aNotA + 2; k < items.length; k++) {
      const it = items[k];
      if (it.entry?.kind === "noun" || it.entry?.kind === "pronoun") {
        const node = nounNode(it, verb.slots[0] ?? "patient");
        b.edge(root, node, node.role as Relation);
      }
    }
    collectParticles(0, items.length, [root]);
    return { meaning: b.graph(root), connective: connective("zh", tokens, spans), realizes: b.realizes, scopeAttachments: scope };
  }

  /* --- Verbless predication (R1): entry at Fire (adjective) or Earth (noun). --- */
  if (verbItems.length === 0) {
    const topic = nounNode(items[0], "subject");
    const adjItem = items.find((i) => i.entry?.kind === "adjective");
    if (adjItem) {
      const aEntry = adjItem.entry!;
      const root = b.node(
        {
          lemma: aEntry.lemma, form: adjItem.text, syntacticElement: "Fire", role: "predicate",
          ...("semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
        },
        [adjItem.index],
      );
      root.states = { mood: interrogative ? "interrogative" : "indicative" };
      // Preverbal negation on a verbless predicate （他不忙）: the
      // negator was silently dropped here too (the F1 defect's
      // adjectival branch). States are states, copula or not.
      const negItemV = items.find((i) => i.func === "negation");
      if (negItemV) root.states = { ...root.states, negated: true, negation: { negator: negItemV.text, carrier: negItemV.text } };
      b.edge(topic, root, "predicate");
      const degItem = items.find((i) => i.func === "degree");
      if (degItem) {
        const deg = b.node({ lemma: degItem.text, form: degItem.text, syntacticElement: "Water" }, [degItem.index]);
        b.edge(deg, root, "modulates"); // Water→Fire is controlling in the cycle table; degree scope is recorded as modulation
      }
      return { meaning: b.graph(root), connective: connective("zh", tokens, spans, 0), realizes: b.realizes, scopeAttachments: scope };
    }
    /* Nominal predication: topic Earth + predicate Earth, no copula
     * （今天星期一）. The declared 'predicated-as' relation — an
     * architectural addition, not a cycle edge (see sentence.ts). */
    const predItem = items.slice(1).find((i) => i.entry?.kind === "noun" || i.entry?.kind === "pronoun");
    if (predItem) {
      const root = nounNode(predItem, "predicate");
      root.states = { mood: interrogative ? "interrogative" : "indicative" };
      // The copula 是， when present, is connective scaffolding for
      // the same 'predicated-as' relation — recorded on the root,
      // not a node: 他是老师 and 今天星期一 are one relation with
      // two realisations, and generation re-emits the one the parse
      // saw. Its negation rides the same record （他不是老师）.
      const copItem = items.find((i) => i.func === "copula");
      if (copItem) {
        root.states.copulaForm = copItem.text;
        const negItemC = items.find((i) => i.func === "negation");
        if (negItemC) {
          root.states.negated = true;
          root.states.negation = { negator: negItemC.text, carrier: negItemC.text };
        }
      }
      b.edge(topic, root, "predicated-as");
      return { meaning: b.graph(root), connective: connective("zh", tokens, spans, 0), realizes: b.realizes, scopeAttachments: scope };
    }
    throw new Error(`cannot parse verbless sentence: ${text}`);
  }

  /* --- Plain / serial clauses: verbs chain at the generating closure. --- */
  const subjectItem = items[0].entry && items[0].entry.kind !== "verb" ? items[0] : undefined;
  const subject = subjectItem ? nounNode(subjectItem, "agent") : undefined;
  const verbNodes: MeaningNode[] = [];
  let pendingChainMarker: string | undefined;
  // Preverbal negation （不/没）: held until the verb it scopes over
  // is built. Until stage 5 the loop had no branch for the negation
  // item at all and it fell through every case — the F1 defect:
  // 他不去学校。 parsed affirmative, checker silent.
  let pendingNegation: string | undefined;
  let pendingModal: string | undefined;
  let pendingAspectMarker: { bundle: AspectBundle; marker: string } | undefined;
  let current: MeaningNode | undefined;
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.func === "degree-marker" && current) {
      // Degree complement (R6): 得 introduces the clause's degree content
      // — how far the verb's quality runs (跑得很快: the news is 很快）.
      let j = k + 1;
      let degItem: ZhItem | undefined;
      if (items[j]?.func === "degree") { degItem = items[j]; j++; }
      const adj = items[j];
      if (adj?.entry?.kind === "adjective") {
        const aEntry = adj.entry;
        const degNode = b.node(
          {
            lemma: aEntry.lemma, form: adj.text, syntacticElement: "Fire", role: "degree",
            ...("semanticElement" in aEntry && aEntry.semanticElement ? { semanticElement: aEntry.semanticElement } : {}),
          },
          [adj.index],
        );
        b.edge(current, degNode, "degree"); // Wood→Fire: the generating arc
        if (degItem) {
          const deg = b.node({ lemma: degItem.text, form: degItem.text, syntacticElement: "Water" }, [degItem.index]);
          b.edge(deg, degNode, "modulates");
        }
        k = j;
      }
      continue;
    }
    if (it.func === "chain-marker") { pendingChainMarker = it.text; continue; }
    if (it.func === "negation") { pendingNegation = it.text; continue; }
    if (it.func === "modal") { pendingModal = it.text; continue; }
    if (it.func === "preposition" && it.text === "在") {
      // Progressive 在: preverbal, immediately (modulo negation)
      // before the verb it marks （他在游泳）. The locative 在 of
      // this grammar is post-verbal (the ba branch, verb prep
      // slots), so a preverbal 在 whose next content item is a verb
      // is the aspect marker; any other 在 keeps its old fate —
      // it falls through, as it always has.
      const nextContent = items.slice(k + 1).find((x) => x.entry || x.func);
      if (nextContent?.entry?.kind === "verb") {
        pendingAspectMarker = zhPreverbalAspectFor(it.text);
        continue;
      }
    }
    if (it.func === "aspect-particle" || it.func === "question-particle" || it.func === "attitude-particle") {
      scope.push({
        form: it.text,
        kind: it.func === "aspect-particle" ? "aspect" : it.func === "question-particle" ? "question" : "attitude",
        ...(current ? { targetId: current.id } : {}),
      });
      if (it.func === "aspect-particle" && current) current.states = { ...current.states, aspect: zhAspectFor(it.text) };
      continue;
    }
    if (it.entry?.kind === "verb") {
      const verb = it.entry as VerbEntry;
      const node = b.node({ lemma: verb.lemma, form: it.text, syntacticElement: "Wood", role: "verb" }, [it.index]);
      node.states = { voice: "active", mood: interrogative ? "interrogative" : "indicative" };
      if (pendingNegation) {
        node.states.negated = true;
        node.states.negation = { negator: pendingNegation, carrier: pendingNegation };
        pendingNegation = undefined;
      }
      if (pendingModal) {
        node.states.modal = pendingModal;
        pendingModal = undefined;
      }
      if (pendingAspectMarker) {
        node.states.aspect = pendingAspectMarker.bundle;
        node.states.aspectMarker = pendingAspectMarker.marker;
        pendingAspectMarker = undefined;
      }
      if (subject) b.edge(node, subject, "agent");
      if (current) {
        b.edge(current, node, "chains-to", pendingChainMarker);
        node.states.construction = "serial";
      }
      pendingChainMarker = undefined;
      verbNodes.push(node);
      current = node;
      continue;
    }
    if ((it.entry?.kind === "noun" || it.entry?.kind === "pronoun") && current && it !== subjectItem) {
      // Counted object: numeral + classifier + noun.
      const prev = items[k - 1];
      const node = nounNode(it, (current ? (ZH_LEXICON[current.lemma] as VerbEntry).slots[0] : undefined) ?? "patient");
      // 把 after a numeral is the classifier, not the ba-marker.
      if (prev?.func === "classifier" || (prev?.text === "把" && items[k - 2]?.func === "numeral")) {
        const clf = b.node({ lemma: prev.text, form: (items[k - 2]?.func === "numeral" ? items[k - 2].text : "") + prev.text, syntacticElement: "Metal" }, [prev.index]);
        b.edge(node, clf, "has-classifier");
      }
      b.edge(current, node, node.role as Relation);
      continue;
    }
  }
  const root = verbNodes[0];
  if (scope.some((s) => s.kind === "question")) root.states = { ...root.states, mood: "interrogative" };
  // Wh-in-situ (P2): a question word in its ordinary slot makes the
  // clause interrogative by itself — no particle, no displacement.
  if (b.nodes.some((n) => n.questionWord)) root.states = { ...root.states, mood: "interrogative" };
  return { meaning: b.graph(root), connective: connective("zh", tokens, spans), realizes: b.realizes, scopeAttachments: scope };
}

export function parse(text: string, language: Language): ParsedSentence {
  if (language === "zh") return parseZh(text);
  const parsed = parseEn(text);
  // Sense selection by coherence (stage 4, sense.ts): derived senses
  // are chosen in isolation at entry derivation; the finished parse
  // is where the sentence's own evidence exists, so the re-choice
  // happens here, once, for every consumer of the parse.
  applySenseSelection(parsed);
  return parsed;
}
