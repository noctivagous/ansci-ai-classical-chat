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
import { wordnetAdjective, wordnetNoun, wordnetVerb } from "./wordnet-lex";

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

const EN_DET = new Set(["the", "a", "an", "my", "his", "her", "that", "more"]);
const EN_PREP = new Set(["on", "in", "by", "to", "with", "past", "at", "from"]);
const EN_BE: Record<string, "present" | "past"> = { is: "present", are: "present", am: "present", was: "past", were: "past" };
const EN_AUX = new Set(["had", "did", "does", "do", "has", "have", "can"]);
const EN_WH = new Set(["what", "who", "where", "when"]);
const EN_MODAL = new Set(["would", "could", "should"]);

/** The -ing form of a verb lemma (rain -> raining, make -> making). */
export function ingForm(lemma: string): string {
  if (/[^aeiou]e$/.test(lemma)) return lemma.slice(0, -1) + "ing";
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
    } else {
      tokens.push(t);
    }
  }
  return { tokens, interrogative };
}

function enItems(tokens: string[]): EnItem[] {
  return tokens.map((text, index) => {
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
      const entry = EN_LEXICON[lower];
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
        } else {
          const adj = wordnetAdjective(lower);
          if (adj) {
            item.entry = adj;
            item.kind = "adjective";
          }
        }
      }
    }
    return item;
  });
}

interface EnChunk {
  head: EnItem;
  adjectives: EnItem[];
  det?: string;
  start: number;
  end: number;
}

/** Parse an NP chunk starting at items[i]; returns chunk + next index. */
function enChunk(items: EnItem[], i: number): { chunk: EnChunk; next: number } | null {
  let det: string | undefined;
  const adjectives: EnItem[] = [];
  let j = i;
  if (items[j]?.kind === "det") { det = items[j].lower; j++; }
  while (items[j]?.kind === "adjective") { adjectives.push(items[j]); j++; }
  const head = items[j];
  if (!head || (head.kind !== "noun" && head.kind !== "pronoun" && head.kind !== "proper")) return null;
  return { chunk: { head, adjectives, det, start: i, end: j }, next: j + 1 };
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
  return node;
}

function parseEn(text: string): ParsedSentence {
  const { tokens, interrogative } = enTokenize(text);
  const items = enItems(tokens);
  const b = new Builder();
  const spans: ConnectiveGraph["spans"] = [];
  const scope: ParsedSentence["scopeAttachments"] = [];

  const beItem = items.find((i) => i.kind === "be");
  const auxItem = items.find((i) => i.kind === "aux");
  const negItem = items.find((i) => i.kind === "neg");
  const whyItem = items.find((i) => i.kind === "why");
  const contentStart = whyItem ? whyItem.index + 1 : 0;
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
        : enChunk(items, contentStart);
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
      it.entry = derived;
      it.kind = "verb";
      const f = derived.forms;
      it.formTag =
        it.lower === ingForm(f.base) ? "ing"
        : it.lower === f.base ? "base" : it.lower === f.third ? "third" : it.lower === f.past && it.lower === f.participle ? "past/participle" : it.lower === f.past ? "past" : it.lower === f.participle ? "participle" : "base";
      verbItem = it;
      break;
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
    root.states = { construction: "weather", aspect: "progressive", aux: beItem.lower, tense: "present", verbForm: "ing", mood: interrogative ? "interrogative" : "indicative" };
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
      tense: auxItem?.lower === "did" ? "past" : "present",
      verbForm: verbItem.formTag,
      voice: "active",
      ...(auxItem ? { aux: auxItem.lower } : {}),
    };
    const agentStart = (auxItem?.index ?? first.index) + 1;
    const subjC = enChunk(items, agentStart);
    if (subjC) {
      const agent = enNodeFromChunk(b, subjC.chunk, "agent");
      b.edge(root, agent, "agent");
      root.states.subjectPerson = subjC.chunk.head.entry && "person" in subjC.chunk.head.entry ? (subjC.chunk.head.entry as { person?: string }).person : "3sg";
    }
    const slot = verb.required[0] ?? verb.slots[0] ?? "patient";
    const qNode = b.node(
      { lemma: first.lower, form: first.text, syntacticElement: "Earth", role: slot, questionWord: true },
      [first.index],
    );
    b.edge(root, qNode, slot as Relation);
    const scaffolding = auxItem ? [{ index: auxItem.index, kind: "do-support" }] : [];
    return { meaning: b.graph(root), connective: connective("en", tokens, spans, undefined, scaffolding), realizes: b.realizes, scopeAttachments: scope };
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

  /* --- Predicate clause: copula + NP/adjective complement (R1 entry at Earth/Fire). --- */
  if (beItem && !verbItem) {
    // Inverted order (questions: "Is summer hot?", "Why is winter cold?")
    // puts the copula first; the subject chunk follows it.
    const inverted = beItem.index === contentStart;
    const subj = enChunk(items, inverted ? beItem.index + 1 : contentStart);
    if (!subj) throw new Error(`cannot parse subject of: ${text}`);
    const subject = enNodeFromChunk(b, subj.chunk, "subject");
    spans.push({ start: subj.chunk.start, end: subj.chunk.end + 1, label: "subject" });
    const compStart = inverted ? subj.chunk.end + 1 : beItem.index + 1;
    const rest = items.slice(compStart);
    let root: MeaningNode;
    const compChunk = enChunk(rest.map((r, k) => ({ ...r, index: r.index })), 0);
    if (compChunk && rest[0] && (rest[0].kind === "det" || rest[0].kind === "noun" || rest[0].kind === "proper" || rest[0].kind === "pronoun")) {
      // re-index chunk onto the rest slice
      const c = enChunk(items, compStart);
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
    root.states = { copulaTense: EN_BE[beItem.lower], mood: interrogative ? "interrogative" : "indicative", ...(whyItem ? { questionKind: "why" } : {}) };
    b.edge(subject, root, predRelation(root));
    return { meaning: b.graph(root), connective: connective("en", tokens, spans, subj.chunk.head.index), realizes: b.realizes, scopeAttachments: scope };
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
    ...(auxItem ? { aux: auxItem.lower } : {}),
    ...(beItem && isPassive ? { aux: beItem.lower } : {}),
    ...(auxItem && ["had", "have", "has"].includes(auxItem.lower) ? { aspect: "perfect" as const } : {}),
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
  const subj = enChunk(items, subjStart);
  let subjectNode: MeaningNode | undefined;
  let subjectEdge: MeaningEdge | undefined;
  /** Passive bare-NP arguments, slot assignment deferred to finalisation. */
  const passiveBareArgs: { node: MeaningNode; edge: MeaningEdge }[] = [];
  if (subj && subj.chunk.end < boundary + 1) {
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
        const slot = verb.prepSlot && verb.prepSlot.preps.includes(prep) ? verb.prepSlot.slot : prep === "to" ? "goal" : "location";
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
  return { meaning: b.graph(root), connective: connective("en", tokens, spans, topicIndex), realizes: b.realizes, scopeAttachments: scope };
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
  return tokens.map((text, index) => ({
    text,
    index,
    entry: ZH_LEXICON[text],
    func: ZH_FUNCTION[text],
  }));
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
  if (baIdx > 0) {
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
    if (aspectP) root.states.aspect = "perfect";
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

  /* --- A-not-A: verb 不 verb (one interrogative force, two realisations would clash). --- */
  const aNotA = items.findIndex((i, k) => i.func === "negation" && k > 0 && items[k - 1].entry?.kind === "verb" && items[k + 1]?.text === items[k - 1].text);
  if (aNotA > 0) {
    const verbItem = items[aNotA - 1];
    const verb = verbItem.entry as VerbEntry;
    const root = b.node({ lemma: verb.lemma, form: verbItem.text, syntacticElement: "Wood", role: "verb" },
      [verbItem.index, items[aNotA].index, items[aNotA + 1].index]);
    root.states = { mood: "interrogative", construction: "a-not-a", voice: "active" };
    if (aNotA >= 2) {
      const subj = nounNode(items[0], "agent");
      b.edge(root, subj, "agent");
    }
    // Objects after the repeated verb, if any.
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
    if (it.func === "aspect-particle" || it.func === "question-particle" || it.func === "attitude-particle") {
      scope.push({
        form: it.text,
        kind: it.func === "aspect-particle" ? "aspect" : it.func === "question-particle" ? "question" : "attitude",
        ...(current ? { targetId: current.id } : {}),
      });
      if (it.func === "aspect-particle" && current) current.states = { ...current.states, aspect: "perfect" };
      continue;
    }
    if (it.entry?.kind === "verb") {
      const verb = it.entry as VerbEntry;
      const node = b.node({ lemma: verb.lemma, form: it.text, syntacticElement: "Wood", role: "verb" }, [it.index]);
      node.states = { voice: "active", mood: interrogative ? "interrogative" : "indicative" };
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
      if (prev?.func === "classifier") {
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
  return language === "en" ? parseEn(text) : parseZh(text);
}
