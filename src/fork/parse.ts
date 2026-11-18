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
import { registerDerivedEntry, wordnetAdjective, wordnetNoun, wordnetVerb } from "./wordnet-lex";
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

function enTokenize(text: string): { tokens: string[]; interrogative: boolean } {
  const interrogative = /\?\s*$/.test(text);
  const cleaned = text.trim().replace(/[.?!]\s*$/, "").replace(/,/g, " , ");
  const raw = cleaned.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const t of raw) {
    if (/^can't$/i.test(t)) {
      tokens.push("can", "n't"); // can + n't contracts by apostrophe only
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
      tokens.push(t);
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
          if (adj) {
            item.entry = adj;
            item.kind = "adjective";
            registerDerivedEntry(adj, lower);
          }
        }
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
    const canHeadChunk = next && (next.kind === "noun" || next.kind === "pronoun" || (next.kind === "proper" && next.entry !== undefined) || next.kind === "adjective");
    if (!canHeadChunk) {
      const entry = EN_LEXICON["her"];
      if (entry) { it.entry = entry; it.kind = "pronoun"; }
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
    const laterVerbish = items.slice(k + 1).some((x, xi) =>
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

/** Measurable-property head nouns: a "what is the X of Y" question over
 *  one of these asks for a quantity, not a kind (stage 3, case 12). */
const MEASURABLE_HEADS = new Set([
  "population", "temperature", "price", "cost", "age", "size",
  "height", "weight", "distance", "speed", "number", "amount",
]);

interface EnChunk {
  head: EnItem;
  adjectives: EnItem[];
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
 *  the verb. Deliberately closed: "to" (goals), "by" (passive
 *  agents) and "of" (handled inside the chunk) are excluded. */
const SUBJECT_PP_MODS = new Set(["in", "on", "at", "near", "from", "with"]);

/** Parse an NP chunk starting at items[i]; returns chunk + next index.
 *  With absorbPP, trailing PP modifiers are absorbed into the chunk
 *  (subject call sites only — object chunks must leave their PPs to
 *  the verb's argument filling). */
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

function enChunkCore(items: EnItem[], i: number): { chunk: EnChunk; next: number } | null {
  let det: string | undefined;
  const adjectives: EnItem[] = [];
  let j = i;
  if (items[j]?.kind === "det") { det = items[j].lower; j++; }
  while (items[j]?.kind === "adjective") { adjectives.push(items[j]); j++; }
  let head = items[j];
  if ((!head || (head.kind !== "noun" && head.kind !== "pronoun" && head.kind !== "proper")) && adjectives.length) {
    // Adjective in head position: "a cold" (the illness) — the run of
    // adjectives consumed the only candidate head. If the last
    // adjective also has a noun reading, that reading is the head;
    // position is the evidence, as elsewhere in this parser.
    const lastAdj = adjectives[adjectives.length - 1];
    const nounEntry = wordnetNoun(lastAdj.lower);
    if (nounEntry) {
      registerDerivedEntry(nounEntry, lastAdj.lower);
      head = { ...lastAdj, kind: "noun", entry: nounEntry };
      adjectives.pop();
      j = lastAdj.index;
    }
  }
  if (!head || (head.kind !== "noun" && head.kind !== "pronoun" && head.kind !== "proper")) return null;
  const chunk: EnChunk = { head, adjectives, det, start: i, end: j };
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
    [chunk.head.index, ...chunk.adjectives.map((a) => a.index)],
  );
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
  // and WordNet-derivable nouns/adjectives need no help.
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
      wordnetAdjective(lower) !== undefined
    ) {
      return "known";
    }
    return undefined;
  };
  const resolved = resolveTokenList(tokens, recognize);
  try {
    const result = parseEnBody(text, resolved.tokens, interrogative);
    if (resolved.resolutions.length > 0) result.tokenResolutions = resolved.resolutions;
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
    if (rec) {
      const next = rec.candidates![1].term;
      const retryTokens = [...resolved.tokens];
      retryTokens[rec.tokenIndex] = next;
      try {
        const result = parseEnBody(text, retryTokens, interrogative);
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
  const contentStart = whyItem ? whyItem.index + 1 : 0;

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
          if (item.kind === "adverb") {
            const aNode = b.node({ lemma: item.entry ? item.entry.lemma : item.lower, form: item.text, syntacticElement: "Water" }, [item.index]);
            b.edge(aNode, root, "modulates");
            i++;
            continue;
          }
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
    const scanFrom = subjChunk ? subjChunk.next : contentStart + 1;
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
      const f = derived.forms;
      const formTag =
        it.lower === ingForm(f.base) ? "ing"
        : it.lower === f.base ? "base" : it.lower === f.third ? "third" : it.lower === f.past && it.lower === f.participle ? "past/participle" : it.lower === f.past ? "past" : it.lower === f.participle ? "participle" : "base";
      // With a copula present, only a participle or -ing surface can
      // be the clause's verb (passive / progressive). A base- or
      // third-shaped surface after the copula is its complement —
      // "They are doctors" names a complement noun that merely has
      // verb synsets ("doctor"), and upgrading it steals the clause
      // from the copula path.
      if (beItem && formTag !== "participle" && formTag !== "past/participle" && formTag !== "ing") continue;
      it.entry = derived;
      it.kind = "verb";
      it.formTag = formTag;
      registerDerivedEntry(derived);
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
    };
    const agentStart = (auxItem?.index ?? first.index) + 1;
    const subjC = enChunk(items, agentStart);
    let slot: string;
    if (subjC) {
      const agent = enNodeFromChunk(b, subjC.chunk, "agent");
      b.edge(root, agent, "agent");
      root.states.subjectPerson = subjC.chunk.head.entry && "person" in subjC.chunk.head.entry ? (subjC.chunk.head.entry as { person?: string }).person : "3sg";
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
    if (slot === "agent") {
      // Post-verbal material of a subject question: bare chunks fill
      // the frame's slots in order; adverbs modulate ("happened
      // first"). Object questions keep the earlier behaviour — their
      // post-verbal region was the gap itself.
      const bareSlots = [...verb.slots];
      let i = verbItem.index + 1;
      while (i < items.length) {
        const item = items[i];
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
   *     Earth head; the head itself fills the clause's gap (R3 inside R5). --- */
  const relPos = items.findIndex((it, k) => it.lower === "that" && k > contentStart && (items[k - 1]?.kind === "noun" || items[k - 1]?.kind === "pronoun"));
  if (relPos > 0) {
    const headC = enChunk(items, contentStart);
    const relSubjC = enChunk(items, relPos + 1);
    const relVerbItem = relSubjC ? items.slice(relSubjC.next).find((i) => i.kind === "verb") : undefined;
    if (headC && relSubjC && relVerbItem?.entry) {
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
    if (compChunk && compFirst && (compFirst.kind === "det" || compFirst.kind === "noun" || compFirst.kind === "proper" || compFirst.kind === "pronoun")) {
      const c = compChunk;
      root = enNodeFromChunk(b, c!.chunk, "predicate");
    } else {
      const adj = rest.find((r) => r.kind === "adjective");
      if (!adj) throw new Error(`cannot parse complement of: ${text}`);
      const aEntry = adj.entry;
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
  }
  if (!verbItem || !verbItem.entry) throw new Error(`no verb found in: ${text}`);
  const verb = verbItem.entry as VerbEntry;

  /* --- Passive: be + participle (voice state, same meaning graph as active). --- */
  const isPassive = !!beItem && (verbItem.formTag === "participle" || verbItem.formTag === "past/participle");

  const root = b.node(
    { lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" },
    [verbItem.index, ...(auxItem ? [auxItem.index] : []), ...(negItem ? [negItem.index] : [])],
  );
  root.states = {
    voice: isPassive ? "passive" : "active",
    tense: verbItem.formTag === "past" || verbItem.formTag === "past/participle" ? "past" : "present",
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
