/**
 * generate.ts — outward: meaning graph + language templates → surface.
 *
 * Generation enters the generating cycle at the clause's entry point
 * (the verb, or the predicate for verbless entry) and assembles in
 * cycle order; the connective templates of the target language own
 * the surface order. Aspect/question particles are emitted in scope
 * order (aspect, then question, then attitude) regardless of the
 * order they were parsed in — generation canonicalises scope order.
 */
import { EN_LEXICON, MeaningNode, ParsedSentence, VerbEntry } from "./sentence";
import { ingForm } from "./parse";

function nodeById(p: ParsedSentence, id: string): MeaningNode {
  return p.meaning.nodes.find((n) => n.id === id)!;
}
function targets(p: ParsedSentence, fromId: string, relation: string): MeaningNode[] {
  return p.meaning.edges.filter((e) => e.from === fromId && e.relation === relation).map((e) => nodeById(p, e.to));
}
function qualifiers(p: ParsedSentence, nodeId: string): MeaningNode[] {
  return p.meaning.edges.filter((e) => e.relation === "qualifies" && e.to === nodeId).map((e) => nodeById(p, e.from));
}

function enNp(p: ParsedSentence, node: MeaningNode): string {
  const parts: string[] = [];
  if (node.det) parts.push(node.det === "i" ? node.det : node.det);
  for (const q of qualifiers(p, node.id)) parts.push(q.form.toLowerCase());
  parts.push(node.form);
  // Relative clause (R5): a clause graph modifying this head renders
  // after it — overt with its marker ('that'), reduced without. The
  // head's own slot inside the clause (the gap) is never rendered.
  const modEdge = p.meaning.edges.find((e) => e.from === node.id && e.relation === "modifier");
  if (modEdge) {
    const clause = nodeById(p, modEdge.to);
    const entry = EN_LEXICON[clause.lemma] as VerbEntry;
    if (entry) {
      const form = clause.states?.tense === "past" ? entry.forms.past : entry.forms.base;
      const clauseAgent = targets(p, clause.id, "agent")[0];
      const rest = orderedArgs(p, clause, entry).filter((n) => n.id !== node.id && n.id !== clauseAgent?.id);
      const restSurface = rest.map((n) => (n.prep ? `${n.prep} ${enNp(p, n)}` : enNp(p, n)));
      if (modEdge.marker) parts.push(modEdge.marker, ...(clauseAgent ? [enNp(p, clauseAgent)] : []), form, ...restSurface);
      else parts.push(form, ...restSurface);
    }
  }
  return parts.join(" ");
}

const NEG_CONTRACTION: Record<string, string> = {
  had: "hadn't", did: "didn't", have: "haven't", has: "hasn't", do: "don't", does: "doesn't", can: "can't",
};

function enGenerate(p: ParsedSentence): string {
  const root = nodeById(p, p.meaning.rootId);
  const punct = root.states?.mood === "interrogative" ? "?" : ".";

  /* Conditional (H2): condition clause first, modal main clause second. */
  const condEdge = p.meaning.edges.find((e) => e.from === root.id && e.relation === "condition");
  if (condEdge) {
    const condRoot = nodeById(p, condEdge.to);
    const condSubjEdge = p.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === condRoot.id);
    const condSubject = condSubjEdge ? nodeById(p, condSubjEdge.from) : undefined;
    const agent = targets(p, root.id, "agent")[0];
    const entry = EN_LEXICON[root.lemma] as VerbEntry;
    const copula = condRoot.states?.mood === "subjunctive" ? "were" : condRoot.states?.copulaTense === "past" ? "was" : "is";
    return `If ${condSubject ? enNp(p, condSubject) : ""} ${copula} ${enNp(p, condRoot)}, ${agent ? enNp(p, agent) : ""} ${root.states?.modal ?? "would"} ${entry.forms.base}.`;
  }

  /* Existential (R4): the template re-emits the expletive scaffolding. */
  if (root.states?.construction === "existential") {
    const copula = root.states?.copulaTense === "past" ? "was" : "is";
    const loc = targets(p, root.id, "location")[0];
    return `There ${copula} ${enNp(p, root)}${loc ? ` ${loc.prep ?? "on"} ${enNp(p, loc)}` : ""}.`;
  }

  /* Weather (R4): expletive subject + progressive verb, zero valency. */
  if (root.states?.construction === "weather") {
    return `It ${root.states?.aux ?? "is"} ${ingForm(root.lemma)}.`;
  }

  /* Wh-question (R3): question word fronted, gap left in the clause. */
  const qNode = p.meaning.nodes.find((n) => n.questionWord);
  if (root.states?.mood === "interrogative" && qNode) {
    const entry = EN_LEXICON[root.lemma] as VerbEntry;
    const agent = targets(p, root.id, "agent")[0];
    const carrier = root.states?.aux ?? (root.states?.tense === "past" ? "did" : "does");
    return `${cap(qNode.form)} ${carrier} ${agent ? enNp(p, agent) : ""} ${entry.forms.base}?`;
  }

  /* Predicate (verbless-entry) clause: Subject + copula + predicate.
   * For a nominal predicate the copula is the connective realisation
   * of the 'predicated-as' relation — English spells out what the
   * meaning graph holds directly (and what ZH realises with no
   * copula at all). */
  const predEdge = p.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === root.id);
  if (predEdge) {
    const subject = nodeById(p, predEdge.from);
    const copula = root.states?.copulaTense === "past" ? "was" : "is";
    const comp = root.syntacticElement === "Earth" ? enNp(p, root) : root.form.toLowerCase();
    return `${cap(enNp(p, subject))} ${copula} ${comp}${punct}`;
  }

  const entry = EN_LEXICON[root.lemma] as VerbEntry;
  const st = root.states ?? {};
  const agent = targets(p, root.id, "agent")[0];
  const patient = targets(p, root.id, "patient")[0];
  const adverbs = p.meaning.edges.filter((e) => e.relation === "modulates" && e.to === root.id).map((e) => nodeById(p, e.from));

  const argSurface = (node: MeaningNode): string =>
    node.prep ? `${node.prep} ${enNp(p, node)}` : enNp(p, node);

  let words: string[] = [];
  if (st.voice === "passive") {
    /* The passive subject is whichever argument the promotion put
     * pre-verbally — patient, recipient, or theme depending on the
     * frame — identified by connective position via REALIZES. A
     * suppressed slot (suppressedRoles) is simply absent here:
     * generation neither demands nor invents a filler for it. */
    const verbTok = Math.min(...(p.realizes[root.id] ?? [Number.POSITIVE_INFINITY]));
    const subject =
      orderedArgs(p, root, entry)
        .filter((n) => Math.min(...(p.realizes[n.id] ?? [Number.POSITIVE_INFINITY])) < verbTok)
        .sort((a, b2) => Math.min(...(p.realizes[a.id] ?? [0])) - Math.min(...(p.realizes[b2.id] ?? [0])))[0] ??
      patient!;
    words.push(enNp(p, subject));
    words.push(st.aux ?? "was");
    words.push(entry.forms.participle);
    for (const node of orderedArgs(p, root, entry)) if (node.id !== subject.id && node.id !== agent?.id) words.push(argSurface(node));
    if (agent) words.push("by", enNp(p, agent));
    return cap(words.join(" ")) + punct;
  }

  // Canonical adverb placement: manner/degree adverbs ride pre-verb
  // (or between auxiliary and verb under negation); time adverbials
  // close the clause.
  const TIME_ADVERBS = new Set(["yesterday", "then"]);
  const preAdverbs = adverbs.filter((a) => !TIME_ADVERBS.has(a.lemma));
  const postAdverbs = adverbs.filter((a) => TIME_ADVERBS.has(a.lemma));
  if (agent) words.push(enNp(p, agent));
  if (st.negated && st.aux) {
    words.push(NEG_CONTRACTION[st.aux] ?? `${st.aux} not`);
    for (const a of preAdverbs) words.push(a.form.toLowerCase());
    words.push(st.aspect === "perfect" ? entry.forms.participle : entry.forms.base);
  } else if (st.aspect === "perfect" && st.aux) {
    words.push(st.aux);
    for (const a of preAdverbs) words.push(a.form.toLowerCase());
    words.push(entry.forms.participle);
  } else {
    for (const a of preAdverbs) words.push(a.form.toLowerCase());
    const form =
      st.tense === "past" ? entry.forms.past : st.subjectPerson === "3sg" ? entry.forms.third : entry.forms.base;
    words.push(form);
  }
  // Resultative complement (R6): the result is main content and follows
  // the verb, carrying its own degree modulators ("all brown").
  const result = targets(p, root.id, "result")[0];
  if (result) {
    for (const m of p.meaning.edges.filter((e) => e.relation === "modulates" && e.to === result.id)) {
      words.push(nodeById(p, m.from).form.toLowerCase());
    }
    words.push(result.form.toLowerCase());
  }
  for (const node of orderedArgs(p, root, entry)) words.push(argSurface(node));
  for (const a of postAdverbs) words.push(a.form.toLowerCase());
  return cap(words.join(" ")) + punct;
}

/** Arguments in the verb frame's slot order (bare slots, then the prep slot). */
function orderedArgs(p: ParsedSentence, root: MeaningNode, entry: VerbEntry): MeaningNode[] {
  const out: MeaningNode[] = [];
  const rels = [...entry.slots, ...(entry.prepSlot ? [entry.prepSlot.slot] : [])];
  for (const rel of rels) out.push(...targets(p, root.id, rel));
  // Any other argument relations, in graph order.
  for (const e of p.meaning.edges) {
    if (e.from === root.id && ["patient", "theme", "recipient", "location", "goal"].includes(e.relation)) {
      const n = nodeById(p, e.to);
      if (!out.includes(n)) out.push(n);
    }
  }
  return out;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------------- Chinese ---------------- */

function zhNp(p: ParsedSentence, node: MeaningNode): string {
  const clf = p.meaning.edges.filter((e) => e.from === node.id && e.relation === "has-classifier").map((e) => nodeById(p, e.to))[0];
  // Relative clause (R5): clause + 的 renders before its head.
  const modEdge = p.meaning.edges.find((e) => e.from === node.id && e.relation === "modifier");
  let prefix = "";
  if (modEdge) {
    const clause = nodeById(p, modEdge.to);
    const clauseAgent = targets(p, clause.id, "agent")[0];
    prefix = `${clauseAgent ? zhNp(p, clauseAgent) : ""}${clause.form}的`;
  }
  return prefix + (clf ? clf.form : "") + node.form + (node.suffix ?? "");
}

function zhClauseTail(p: ParsedSentence, verb: MeaningNode): string {
  // Aspect particle rides immediately after the verb's own chunk.
  return verb.states?.aspect === "perfect" ? "了" : "";
}

function zhGenerate(p: ParsedSentence): string {
  const root = nodeById(p, p.meaning.rootId);
  const punct = root.states?.mood === "interrogative" && root.states?.construction !== "a-not-a" ? "" : root.states?.construction === "a-not-a" ? "？" : "。";
  const questionTail = p.scopeAttachments.filter((s) => s.kind === "question").map((s) => s.form).join("");
  const attitudeTail = p.scopeAttachments.filter((s) => s.kind === "attitude").map((s) => s.form).join("");

  /* Predicate (verbless-entry) clause — adjectival ('predicate') or
   * nominal ('predicated-as', realised with no copula). */
  const predEdge = p.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === root.id);
  if (predEdge) {
    const topic = nodeById(p, predEdge.from);
    const degree = p.meaning.edges.filter((e) => e.relation === "modulates" && e.to === root.id).map((e) => nodeById(p, e.from))[0];
    return `${zhNp(p, topic)}${degree ? degree.form : ""}${root.form}。`;
  }

  /* Counted noun phrase standing alone. */
  if (root.syntacticElement === "Earth") return zhNp(p, root);

  const st = root.states ?? {};
  const agent = targets(p, root.id, "agent")[0];
  const patient = targets(p, root.id, "patient")[0];

  if (st.construction === "ba") {
    const theme = targets(p, root.id, "theme")[0];
    const loc = targets(p, root.id, "location")[0];
    return `${agent ? zhNp(p, agent) : ""}把${theme ? zhNp(p, theme) : ""}${root.form}${loc ? `${loc.prep ?? "在"}${zhNp(p, loc)}` : ""}。`;
  }
  if (st.construction === "bei") {
    return `${patient ? zhNp(p, patient) : ""}被${agent ? zhNp(p, agent) : ""}${root.form}${st.result ?? ""}${zhClauseTail(p, root)}。`;
  }
  if (st.construction === "a-not-a") {
    return `${agent ? zhNp(p, agent) : ""}${root.form}不${root.form}？`;
  }
  if (st.construction === "correlative") {
    // R8: the one Metal relation is re-emitted as its two discontinuous tokens.
    const chain = p.meaning.edges.find((e) => e.from === root.id && e.relation === "chains-to");
    const second = chain ? nodeById(p, chain.to) : undefined;
    return `${agent ? zhNp(p, agent) : ""}一边${root.form}${second ? `一边${second.form}` : ""}。`;
  }

  /* Plain / serial: subject once, then each verb chunk in chain order;
     the chain marker (就) rides on the chains-to edge that carries it. */
  let out = agent ? zhNp(p, agent) : "";
  let current: MeaningNode | undefined = root;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    // The aspect particle rides immediately after its own verb
    // (吃了饭), before the verb's arguments.
    out += current.form + zhClauseTail(p, current);
    // Degree complement (R6): 得 + degree content follows its verb.
    const deg = targets(p, current.id, "degree")[0];
    if (deg) {
      const mods = p.meaning.edges.filter((e) => e.relation === "modulates" && e.to === deg.id).map((e) => nodeById(p, e.from).form);
      out += `得${mods.join("")}${deg.form}`;
    }
    for (const e of p.meaning.edges) {
      if (e.from === current.id && ["patient", "theme", "recipient", "location", "goal"].includes(e.relation)) {
        const n = nodeById(p, e.to);
        out += (n.prep ?? "") + zhNp(p, n);
      }
    }
    const chain = p.meaning.edges.find((e) => e.from === current!.id && e.relation === "chains-to");
    if (!chain) break;
    out += chain.marker ?? "";
    current = nodeById(p, chain.to);
  }
  return out + questionTail + attitudeTail + (root.states?.mood === "interrogative" ? "？" : "。");
}

export function generate(p: ParsedSentence): string {
  return p.connective.language === "en" ? enGenerate(p) : zhGenerate(p);
}
