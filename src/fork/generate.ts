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
import { enBeForm, zhNegatorFor, zhParticleFor } from "./aspect";

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
  // Post-head modifiers. A PP modifier (stage 3: the absorbed of-PP,
  // "the population of Chicago", and preserved trailing PPs) renders
  // as prep + NP. A clause modifier is the relative clause (R5): a
  // clause graph modifying this head renders after it — overt with
  // its marker ('that'), reduced without. The head's own slot inside
  // the clause (the gap) is never rendered.
  for (const modEdge of p.meaning.edges.filter((e) => e.from === node.id && e.relation === "modifier")) {
    const target = nodeById(p, modEdge.to);
    if (target.prep) {
      parts.push(target.prep, enNp(p, target));
      continue;
    }
    const clause = target;
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

/**
 * Cohesion markers (R5, §8.7 S3) realised sentence-initially:
 * a 'links' edge from a predication's subject node into its
 * predicate root carries the marker the planner earned against
 * the session record (plan.ts's COHESION_MARKERS); the surface
 * is the capitalised connective heading the clause. The fourth
 * marker, "as for", is not a prefix but a fronted topic phrase
 * and is handled at the call site.
 */
const COHESION_PREFIX: Record<string, string> = { and: "And ", so: "So ", but: "But " };

/** The copula form for a copula root: tense from copulaTense, person
 *  from the subjectPerson the parse recorded (defaulting to 3sg). */
function copulaForm(root: MeaningNode): string {
  const person = root.states?.subjectPerson ?? "3sg";
  if (root.states?.copulaTense === "past") return person === "1sg" || person === "3sg" ? "was" : "were";
  return person === "1sg" ? "am" : person === "3sg" ? "is" : "are";
}

/**
 * One EN predicate clause (subject + copula + complement), without
 * terminal punctuation — composed once here so a main clause and a
 * causal subordinate are built by the same machinery (R1.5).
 *
 * Two state readings the predicate path did not make before R1.5:
 *  - Modulators of the predicate root ('modulates' edges in): the
 *    degree and hedge adverbs the graph carries, in graph order,
 *    before the complement ("is most fully cold", "is likely
 *    cold"). This is the EN counterpart of the ZH predicate path's
 *    degree reading — the same states, English placement.
 *  - A modal state on the predicate root: the modal carries the
 *    clause and the copula surfaces as bare "be" ("The soup may
 *    be cold."). Before R1.5 the state was silently dropped, so a
 *    qualified conclusion could not be spoken from a graph at all.
 * `subjectForm` overrides the subject's surface — a causal
 * subordinate whose subject is the main clause's own subject again
 * surfaces as "it", the connective layer's ordinary anaphora.
 */
function enPredicateClause(p: ParsedSentence, rootNode: MeaningNode, subjectForm?: string): string {
  const predEdge = p.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === rootNode.id);
  const subject = predEdge ? nodeById(p, predEdge.from) : undefined;
  const comp = rootNode.syntacticElement === "Earth" ? enNp(p, rootNode) : rootNode.form.toLowerCase();
  const mods = p.meaning.edges
    .filter((e) => e.relation === "modulates" && e.to === rootNode.id)
    .map((e) => nodeById(p, e.from).form.toLowerCase());
  const subj = subjectForm ?? (subject ? enNp(p, subject) : "");
  const modal = rootNode.states?.modal;
  if (modal) {
    return `${subj} ${modal}${rootNode.states?.negated ? " not" : ""} be${mods.length ? " " + mods.join(" ") : ""} ${comp}`;
  }
  return `${subj} ${copulaForm(rootNode)}${rootNode.states?.negated ? " not" : ""}${mods.length ? " " + mods.join(" ") : ""} ${comp}`;
}

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

  /* Fragments (stage 3, Part D D2): generation preserves the
   * fragment as the act it is — a topic proposal is never expanded
   * into an invented proposition, and a bare nominal stays bare. */
  if (p.discourseAct === "topic-proposal") {
    return `What about ${enNp(p, root)}?`;
  }
  if (p.discourseAct === "reason-query") {
    return "Why?";
  }
  if (root.syntacticElement === "Earth" && !root.states) {
    // A bare nominal fragment: its root carries no clause state at
    // all. (Copular roots always carry copulaTense; existentials a
    // construction state — neither is a fragment.)
    return `${cap(enNp(p, root))}.`;
  }

  /* Copular question (stage 3, Part D D1): the questioned node is the
   * root and the declarative relation's other end supplies the
   * subject (or, for containment, the container). The copula agrees
   * with the subject, whose person the parse recorded on the root. */
  if (root.questionWord && root.states?.mood === "interrogative") {
    const inEdge = p.meaning.edges.find((e) => e.to === root.id && (e.relation === "predicated-as" || e.relation === "location" || e.relation === "time" || e.relation === "contains"));
    if (inEdge) {
      const other = nodeById(p, inEdge.from);
      const person = root.states?.subjectPerson ?? "3sg";
      const copula = root.states?.copulaTense === "past"
        ? person === "1sg" || person === "3sg" ? "was" : "were"
        : person === "1sg" ? "am" : person === "3sg" ? "is" : "are";
      if (inEdge.relation === "contains") return `${cap(root.form)} ${copula} ${other.prep ?? "in"} ${enNp(p, other)}?`;
      return `${cap(root.form)} ${copula} ${enNp(p, other)}?`;
    }
  }

  /* Why-question over a verbal clause (stage 3): the reason adjunct
   * fronts, the tense carrier follows, then the clause in base form. */
  if (root.states?.questionKind === "why" && root.states?.mood === "interrogative" && root.states?.voice !== "passive") {
    const entry = EN_LEXICON[root.lemma] as VerbEntry;
    if (entry) {
      const agent = targets(p, root.id, "agent")[0];
      const carrier = root.states?.aux ?? (root.states?.tense === "past" ? "did" : "does");
      const rest = orderedArgs(p, root, entry).filter((n) => n.id !== agent?.id);
      const restSurface = rest.map((n) => (n.prep ? `${n.prep} ${enNp(p, n)}` : enNp(p, n)));
      return `Why ${carrier} ${agent ? enNp(p, agent) : ""} ${entry.forms.base}${restSurface.length ? " " + restSurface.join(" ") : ""}?`;
    }
  }

  /* Predicate (verbless-entry) clause: Subject + copula + predicate.
   * For a nominal predicate the copula is the connective realisation
   * of the 'predicated-as' relation — English spells out what the
   * meaning graph holds directly (and what ZH realises with no
   * copula at all). */
  const predEdge = p.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === root.id);
  if (predEdge) {
    const mainSubject = nodeById(p, predEdge.from);
    /* Disjunctive clarification question (R3): an interrogative
     * predication whose root carries a 'links' edge marked "or"
     * to a second, alternative predication of the same subject —
     * the representation plan.ts builds for a rival split (§2.3).
     * The question asks which of the two contents the subject is
     * meant as; the alternatives are the graph's own predicate
     * nodes, realised by the same NP machinery as everything else. */
    if (root.states?.mood === "interrogative") {
      const orEdge = p.meaning.edges.find((e) => e.from === root.id && e.relation === "links" && e.marker === "or");
      if (orEdge) {
        const alt = nodeById(p, orEdge.to);
        return `Do you mean ${enNp(p, mainSubject)} as in ${enNp(p, root)}, or as in ${enNp(p, alt)}?`;
      }
    }
    /* Cohesion (R5, §8.7 S3): a 'links' edge from the subject
     * node into the root, carrying an earned marker, joins this
     * clause to the prior discourse. "as for" fronts the
     * subject as a topic phrase and the clause's own subject
     * surfaces as "it" (a person subject keeps its own form —
     * the fronted phrase and the clause then name it alike);
     * the other markers head the clause as sentence-initial
     * connectives. The head replaces the capitalisation the
     * bare clause would get: the marker is already capitalised
     * and the clause keeps its own (lower) case. */
    const cohesionEdge = p.meaning.edges.find(
      (e) =>
        e.to === root.id &&
        e.from === predEdge.from &&
        e.relation === "links" &&
        !!e.marker &&
        (e.marker === "as for" || e.marker in COHESION_PREFIX),
    );
    let front = "";
    let subjectOverride: string | undefined;
    if (cohesionEdge?.marker === "as for") {
      front = `As for ${enNp(p, mainSubject)}, `;
      if (mainSubject.lemma !== "you" && mainSubject.lemma !== "i") subjectOverride = "it";
    } else if (cohesionEdge?.marker) {
      front = COHESION_PREFIX[cohesionEdge.marker];
    }
    let clause = enPredicateClause(p, root, subjectOverride);
    /* Coordinated predications (R2, §8.7 S13): 'links' edges out
     * of a predicate root whose marker is "and" chain further
     * predications onto the clause — the representation plan.ts
     * builds for a composed set. Each chained predication is
     * composed by the same predicate machinery, so its degree
     * and qualification states realise identically to the main
     * clause's; a chained subject repeating the main subject
     * surfaces as "it", the same anaphora as the causal form
     * below. R5: the same device with the marker "but" joins a
     * correction's struck predication to the state that
     * replaces it (planCorrection) — the join word is the
     * edge's own marker in both cases. */
    let cursor = root;
    for (;;) {
      const joinEdge = p.meaning.edges.find(
        (e) => e.from === cursor.id && e.relation === "links" && (e.marker === "and" || e.marker === "but"),
      );
      if (!joinEdge) break;
      const nextRoot = nodeById(p, joinEdge.to);
      const nextSubjEdge = p.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === nextRoot.id);
      const nextSubject = nextSubjEdge ? nodeById(p, nextSubjEdge.from) : undefined;
      // The repeated subject surfaces as "it" — for things.
      // A person subject is not "it": it repeats in its own
      // form ("You are not furious, but you are calm.").
      const override =
        nextSubject && nextSubject.lemma === mainSubject.lemma && mainSubject.lemma !== "you" && mainSubject.lemma !== "i"
          ? "it"
          : undefined;
      clause += `, ${joinEdge.marker} ${enPredicateClause(p, nextRoot, override)}`;
      cursor = nextRoot;
    }
    const head = front ? `${front}${clause}` : cap(clause);
    /* Causal subordinate (R1.5, gap G2): a 'links' edge out of the
     * root whose marker is "because" joins the clause's causal
     * graph — the representation plan.ts builds for a demanded
     * causal form (§7.2). 'links' is the graph's existing
     * clause-joining relation (its ZH use joins the correlative
     * construction's two verbs) and the edge's marker field is the
     * connective layer's own device for carrying the surface
     * connective (the same field that carries 就 on chains-to
     * edges); no new vocabulary is introduced. The subordinate is
     * composed by the same predicate machinery, so its degree and
     * qualification states realise identically. */
    const causeEdge = p.meaning.edges.find((e) => e.from === root.id && e.relation === "links" && e.marker === "because");
    if (causeEdge && root.states?.mood !== "interrogative") {
      const causeRoot = nodeById(p, causeEdge.to);
      const causeSubjEdge = p.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === causeRoot.id);
      const causeSubject = causeSubjEdge ? nodeById(p, causeSubjEdge.from) : undefined;
      const override =
        causeSubject && causeSubject.lemma === mainSubject.lemma && mainSubject.lemma !== "you" && mainSubject.lemma !== "i"
          ? "it"
          : undefined;
      return `${head}, because ${enPredicateClause(p, causeRoot, override)}${punct}`;
    }
    return `${head}${punct}`;
  }

  /* Locative copula (stage 3): the place is the predicate — the
   * declarative counterpart of the locative question. Keyed on the
   * copula state so a verb clause's location argument never lands
   * here (its root is the verb, not the place). */
  const locEdge = p.meaning.edges.find((e) => e.relation === "location" && e.to === root.id);
  if (locEdge && root.states?.copulaTense) {
    const subject = nodeById(p, locEdge.from);
    const copula = copulaForm(root);
    return `${cap(enNp(p, subject))} ${copula} ${root.prep ?? "in"} ${enNp(p, root)}${punct}`;
  }

  /* Wh-question (R3): question word fronted, gap left in the clause. */
  const qNode = p.meaning.nodes.find((n) => n.questionWord);
  if (root.states?.mood === "interrogative" && qNode) {
    const entry = EN_LEXICON[root.lemma] as VerbEntry;
    const agent = targets(p, root.id, "agent")[0];
    if (agent && agent.id === qNode.id) {
      // Questioned subject ("Who arrived?", "Which happened
      // first?"): no do-support and no separate subject — the
      // question word IS the subject, and the verb carries its
      // ordinary finite form.
      const form = root.states?.tense === "past" ? entry.forms.past : root.states?.subjectPerson === "3pl" ? entry.forms.base : entry.forms.third;
      const adverbs = p.meaning.edges.filter((e) => e.relation === "modulates" && e.to === root.id).map((e) => nodeById(p, e.from));
      const rest = orderedArgs(p, root, entry).filter((n) => n.id !== qNode.id);
      const restSurface = rest.map((n) => (n.prep ? `${n.prep} ${enNp(p, n)}` : enNp(p, n)));
      return `${cap(qNode.form)} ${form}${adverbs.length ? " " + adverbs.map((a) => a.form.toLowerCase()).join(" ") : ""}${restSurface.length ? " " + restSurface.join(" ") : ""}?`;
    }
    const carrier = root.states?.aux ?? (root.states?.tense === "past" ? "did" : "does");
    // The clause's other filled arguments ride along — the
    // why-branch above already composes them; an object question
    // over a fuller event ("What did you put in the soup?",
    // "What did you give him?") keeps its remaining roles rather
    // than dropping them. The questioned node itself is the gap
    // and is never among them.
    const rest = orderedArgs(p, root, entry).filter((n) => n.id !== agent?.id && n.id !== qNode.id);
    const restSurface = rest.map((n) => (n.prep ? `${n.prep} ${enNp(p, n)}` : enNp(p, n)));
    return `${cap(qNode.form)} ${carrier} ${agent ? enNp(p, agent) : ""} ${entry.forms.base}${restSurface.length ? " " + restSurface.join(" ") : ""}?`;
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
      patient ??
      orderedArgs(p, root, entry)[0]!;
    if (st.questionKind === "why" && st.mood === "interrogative") {
      // "Why is the garden flooded?" — the reason adjunct fronts and
      // the copula carrier follows it (stage 3; the parse-side half
      // of the F3 fix is the inverted-subject recovery in parse.ts).
      const rest = orderedArgs(p, root, entry).filter((n) => n.id !== subject.id && n.id !== agent?.id);
      const restSurface = rest.map((n) => argSurface(n));
      return `Why ${st.aux ?? "was"} ${enNp(p, subject)} ${entry.forms.participle}${restSurface.length ? " " + restSurface.join(" ") : ""}${agent ? " by " + enNp(p, agent) : ""}?`;
    }
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
  // The verb phrase is composed from the aspect bundle (WP4 spec):
  // perfect contributes the have-auxiliary + participle, ongoing the
  // be-form + -ing form, both together have + been + -ing; bounded
  // alone is the simple form, which is also the unmarked default.
  const bundle = st.aspect ?? {};
  const pushAdverbs = () => { for (const a of preAdverbs) words.push(a.form.toLowerCase()); };
  if (st.modal) {
    // A modal state on the verb root is part of the clause's
    // record (features.ts counts it as an atom): the modal
    // carries the clause and the verb surfaces in base form,
    // with the aspect bundle riding under it ("would have
    // gone", "would be going"). Generation dropped this state
    // until R1.5 — "You would go." came out as "You go." — which
    // spoke the clause at a strength its graph never claimed
    // (gap G3's verb-clause half).
    words.push(st.modal);
    if (st.negated) words.push("not");
    pushAdverbs();
    if (bundle.perfect && bundle.ongoing) words.push("have", "been", ingForm(entry.lemma));
    else if (bundle.perfect) words.push("have", entry.forms.participle);
    else if (bundle.ongoing) words.push("be", ingForm(entry.lemma));
    else words.push(entry.forms.base);
  } else if (st.negated && st.aux) {
    words.push(NEG_CONTRACTION[st.aux] ?? `${st.aux} not`);
    pushAdverbs();
    if (bundle.perfect && bundle.ongoing) words.push("been", ingForm(entry.lemma));
    else if (bundle.perfect) words.push(entry.forms.participle);
    else if (bundle.ongoing) words.push(ingForm(entry.lemma));
    else words.push(entry.forms.base);
  } else if (bundle.perfect && st.aux) {
    words.push(st.aux);
    pushAdverbs();
    if (bundle.ongoing) words.push("been", ingForm(entry.lemma));
    else words.push(entry.forms.participle);
  } else if (bundle.ongoing) {
    words.push(st.aux ?? enBeForm(st.tense, st.subjectPerson));
    pushAdverbs();
    words.push(ingForm(entry.lemma));
  } else {
    pushAdverbs();
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
    if (e.from === root.id && ["patient", "theme", "recipient", "location", "goal", "time"].includes(e.relation)) {
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
  // The aspect particle the verb's bundle selects (WP4 spec) rides
  // immediately after the verb's own chunk.
  return zhParticleFor(verb.states?.aspect ?? {});
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
    const neg = root.states?.negation?.negator ?? (root.states?.negated ? zhNegatorFor(root.lemma, root.states?.aspect) : "");
    // Nominal predication with a recorded copula: the negator
    // precedes 是 （他不是老师）, as it precedes a verb.
    if (root.states?.copulaForm) {
      return `${zhNp(p, topic)}${neg}${root.states.copulaForm}${root.form}。`;
    }
    const degree = p.meaning.edges.filter((e) => e.relation === "modulates" && e.to === root.id).map((e) => nodeById(p, e.from))[0];
    // Under negation the unmarked degree 很 is dropped: the
    // attested negative of 他很忙 is 他不忙， not 他很不忙 (a
    // stage-5 generation leftover). Marked degree words （非常）
    // are content and stay.
    const degForm = neg && degree?.form === "很" ? "" : degree ? degree.form : "";
    return `${zhNp(p, topic)}${degForm}${neg}${root.form}。`;
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
    const neg = st.negation?.negator ?? "不";
    const objs = p.meaning.edges.filter((e) => e.from === root.id && ["patient", "theme", "recipient"].includes(e.relation)).map((e) => zhNp(p, nodeById(p, e.to))).join("");
    return `${agent ? zhNp(p, agent) : ""}${root.form}${neg}${root.form}${objs}？`;
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
    // Negation rides immediately BEFORE its verb （他没去过北京）:
    // the recorded negator if parse supplied one, else the bundle
    // rule's selection (Part F.2) — never a surface guess.
    const negator = current.states?.negated ? current.states?.negation?.negator ?? zhNegatorFor(current.lemma, current.states?.aspect) : undefined;
    if (negator) out += negator;
    // The modal rides between the negator and its verb
    // （他会游泳 / 他不会游泳）: 会 scopes under negation, as it
    // surfaces.
    if (current.states?.modal) out += current.states.modal;
    // Progressive 在 rides immediately BEFORE its verb （他在游泳，
    // 他不在游泳） — and suppresses the post-verbal particle the
    // bundle would otherwise select: 在 and 着 are two realisations
    // of {ongoing}, and the record says which one the clause
    // carries. (A stage-5 leftover had 在 dropped under synthetic
    // negation; the marker is state, independent of the negator.)
    if (current.states?.aspectMarker) out += current.states.aspectMarker;
    // The aspect particle rides immediately after its own verb
    // (吃了饭), before the verb's arguments. One interaction the
    // stage-5 generation probe exposed: 没 absorbs the bounded
    // particle — the negated form is 他没去学校， never 他没去了学校；
    // the bounded feature is realised BY the choice of 没. （过 and
    // 着 are not absorbed: 他没去过北京 keeps its experiential.)
    let tail = zhClauseTail(p, current);
    if (negator === "没" && tail === "了") tail = "";
    if (current.states?.aspectMarker) tail = "";
    out += current.form + tail;
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
