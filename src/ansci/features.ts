/**
 * features.ts — the depth metric (repair programme Part C.1).
 *
 * Feature preservation measures whether the system RETAINS ITS OWN
 * ANALYSIS through generation: parse S0 -> G0, generate S1 from G0,
 * reparse S1 -> G1, and compare G0 and G1 as sets of atomic feature
 * records. It is ledger 1 of the three ledgers (Part C.0): a preserving
 * round trip is NOT evidence the analysis was correct — G0's own
 * accuracy is scored separately against sealed expected graphs
 * (amendment A1) using this same comparison machinery.
 *
 * Atoms are content-keyed (predicate lemma + role, particle form +
 * scope target lemma, ...), never node-id-keyed, so two parses of
 * related sentences produce comparable atom sets. Comparison is
 * multiset-aware per (family, key, value).
 *
 * The inventory covers only what the parser actually represents
 * (Part C.1): a represented feature may not be omitted because the
 * generator finds it hard, and an unimplemented feature is not scored
 * as present. Known representation gaps are findings, not scoring
 * errors — e.g. the parser records almost no number information, so
 * the number family is thin by construction and reports as such.
 */

import type { MeaningNode, ParsedSentence } from "./sentence";

export interface FeatureAtom {
  family: string;
  key: string;
  value: string;
}

export type AtomOutcome = "preserved" | "contradicted" | "lost" | "added";

export interface AtomRecord extends FeatureAtom {
  reparsedValue?: string;
  outcome: AtomOutcome;
  score: 0 | 1;
}

export interface FeatureComparison {
  records: AtomRecord[];
  /** Matched atoms / required atoms in G0. */
  micro: number;
  /** Unweighted mean of per-family preservation over families present in G0. */
  macro: number;
  familyScores: Record<string, { atoms: number; preserved: number; score: number }>;
  lostRate: number;
  contradictionRate: number;
  /** Added atoms / atoms in G1. */
  spuriousRate: number;
  total0: number;
  total1: number;
}

const ROLE_RELATIONS = new Set([
  "agent", "patient", "theme", "recipient", "location", "goal",
]);
const ATTACH_RELATIONS = new Set(["qualifies", "modulates", "degree", "result", "time"]);
/* "contains" rides with the links (the vocabulary pass, Part J.2):
 * the relation is declared in the graph's vocabulary (Part D,
 * stage 3) and the parse produces it ("What's in it?" — the
 * container node sourcing a contains edge to the contained,
 * questioned node), but no atom set carried it, so the edge
 * atomised to nothing — the uncommissioned sibling of G.5's
 * location extension, closed the same way: the determination
 * is the design (repair-programme Part J.2); this line is its
 * build. */
const LINK_RELATIONS = new Set(["chains-to", "modifier", "condition", "predicated-as", "links", "contains"]);

function atom(family: string, key: string, value: string): FeatureAtom {
  return { family, key, value };
}

/** Extract the atomic feature records of one parsed sentence. */
export function extractFeatures(p: ParsedSentence): FeatureAtom[] {
  const atoms: FeatureAtom[] = [];
  const byId = new Map<string, MeaningNode>(p.meaning.nodes.map((n) => [n.id, n]));
  const lemmaOf = (id: string) => byId.get(id)?.lemma ?? id;

  // Predicates: the root, plus any node carrying clause states or
  // sourcing a role edge. (Verbless entry makes an Earth/Fire node the
  // predicate; the rootId test covers it.)
  const roleSources = new Set(
    p.meaning.edges.filter((e) => ROLE_RELATIONS.has(e.relation)).map((e) => e.from),
  );
  const predicates = p.meaning.nodes.filter(
    (n) =>
      n.id === p.meaning.rootId ||
      roleSources.has(n.id) ||
      n.states?.voice !== undefined ||
      n.states?.aspect !== undefined ||
      n.states?.suppressedRoles !== undefined,
  );
  const predKey = new Map<string, string>();
  {
    const seen = new Map<string, number>();
    for (const n of predicates) {
      const occ = seen.get(n.lemma) ?? 0;
      seen.set(n.lemma, occ + 1);
      predKey.set(n.id, `${n.lemma}#${occ}`);
    }
  }

  for (const n of predicates) {
    const pk = predKey.get(n.id)!;
    const st = n.states ?? {};
    atoms.push(atom("predicate", pk, n.lemma));
    atoms.push(atom("voice", `${pk}|voice`, st.voice ?? "active"));
    // Aspect atoms are per bundle feature (WP4): a sentence can carry
    // several, and "unmarked" is the explicit absence of a bundle.
    if (st.aspect && Object.keys(st.aspect).length) {
      for (const feature of Object.keys(st.aspect).sort()) {
        atoms.push(atom("aspect", `${pk}|aspect:${feature}`, "true"));
      }
    } else {
      atoms.push(atom("aspect", `${pk}|aspect`, "unmarked"));
    }
    atoms.push(
      atom("tense", `${pk}|tense`, st.tense ?? st.copulaTense ?? "unmarked"),
    );
    atoms.push(atom("mood", `${pk}|mood`, st.mood ?? "indicative"));
    atoms.push(atom("negation", `${pk}|negated`, String(st.negated === true)));
    if (st.modal) atoms.push(atom("negation", `${pk}|modal`, st.modal));
    if (st.aux) atoms.push(atom("negation", `${pk}|aux`, st.aux));
    // The structured negation record (Part F.2): negator form and
    // carrier are atoms in their own right — the stage-0 baseline
    // found this family at 84.4% precisely because the carrier
    // configuration was not in the record to be preserved.
    if (st.negation) {
      atoms.push(atom("negation", `${pk}|negator`, st.negation.negator));
      atoms.push(atom("negation", `${pk}|carrier`, st.negation.carrier ?? "none"));
    }
    if (st.construction) atoms.push(atom("construction", `${pk}|construction`, st.construction));
    if (st.questionKind) atoms.push(atom("mood", `${pk}|questionKind`, st.questionKind));
    if (st.result) atoms.push(atom("aspect", `${pk}|result`, st.result));
    atoms.push(atom("number", `${pk}|subjectPerson`, st.subjectPerson ?? "unmarked"));
    for (const role of st.suppressedRoles ?? []) {
      atoms.push(atom("suppressed", `${pk}|suppressed:${role}`, "suppressed"));
    }
  }

  // Entity atoms: every non-predicate node, by lemma occurrence.
  {
    const seen = new Map<string, number>();
    for (const n of p.meaning.nodes) {
      if (predKey.has(n.id)) continue;
      const occ = seen.get(n.lemma) ?? 0;
      seen.set(n.lemma, occ + 1);
      atoms.push(atom("entity", `${n.lemma}#${occ}`, n.semanticElement ?? "none"));
      if (n.det) atoms.push(atom("entity", `${n.lemma}#${occ}|det`, n.det));
      if (n.prep) atoms.push(atom("entity", `${n.lemma}#${occ}|prep`, n.prep));
      if (n.suffix) atoms.push(atom("entity", `${n.lemma}#${occ}|suffix`, n.suffix));
      if (n.questionWord) atoms.push(atom("entity", `${n.lemma}#${occ}|questionWord`, "true"));
    }
  }

  // Edges: roles, attachments, classifiers, links.
  for (const e of p.meaning.edges) {
    const fromPk = predKey.get(e.from);
    // Part G.5: a location query over a copular clause ("Where are
    // you?") puts the question node as root and the topic as the
    // edge's source — that edge atomises as an attachment
    // (`where|location = you`), not as a role of the topic.
    const topicLocation =
      e.relation === "location" && e.to === p.meaning.rootId && byId.get(e.to)?.questionWord === true;
    if (ROLE_RELATIONS.has(e.relation) && fromPk && !topicLocation) {
      const filler = byId.get(e.to);
      atoms.push(
        atom("roles", `${fromPk}|${e.relation}`, `${lemmaOf(e.to)}${filler?.prep ? "@" + filler.prep : ""}`),
      );
    } else if (ATTACH_RELATIONS.has(e.relation) || topicLocation) {
      atoms.push(atom("attachment", `${lemmaOf(e.to)}|${e.relation}`, lemmaOf(e.from)));
    } else if (e.relation === "has-classifier") {
      atoms.push(atom("classifier", `classifier:${lemmaOf(e.from)}`, lemmaOf(e.to)));
      // The numeral rides in the classifier node's form (三本）.
      // Until stage 5 the number family held subject person only
      // (baseline finding F2, "thin by construction"); the counted
      // quantity is part of the mediation record now (Part F.3):
      // numeral + classifier + the noun whose classification
      // generated the classifier.
      const clfNode = byId.get(e.to);
      const numeral = clfNode && clfNode.form !== clfNode.lemma ? clfNode.form.slice(0, clfNode.form.length - clfNode.lemma.length) : "";
      if (numeral) atoms.push(atom("number", `numeral:${lemmaOf(e.from)}`, numeral));
    } else if (LINK_RELATIONS.has(e.relation)) {
      atoms.push(
        atom("connective", `${lemmaOf(e.from)}|${e.relation}|${lemmaOf(e.to)}`, e.marker ?? "present"),
      );
    }
  }

  // Clause-scope attachments (zh particles), in surface order.
  for (const s of p.scopeAttachments) {
    atoms.push(
      atom("particle-scope", `scope:${s.kind}:${s.form}`, s.targetId ? lemmaOf(s.targetId) : "clause"),
    );
  }

  /* ---- The vocabulary pass (Part J): the discourse-act and
   * event-ordering atoms. ---- */

  // Discourse acts (J.1): the parse already records the act on
  // the sentence (Part D D2 — a topic proposal, a bare reason
  // query); until now no atom carried it, so a sealed item
  // whose whole content is the act scored a graph with the act
  // nowhere in it. The atom is the act's name, family
  // "discourse".
  if (p.discourseAct) {
    atoms.push(atom("discourse", "act", p.discourseAct));
  }
  // A correction (J.1): a turn-initial "No," set off by its
  // comma, before a clause that carries tense — the surface
  // shape of a speaker replacing the exchange's current
  // reading with the proposition that follows. The comma is
  // part of the shape: "No one came." opens with the same
  // word and is a plain statement, and a bare "No." has no
  // clause to correct with. The act is atom-level only: the
  // parse's act union and the assessment's act kinds are not
  // extended by this pass (their consumers price acts the
  // atomiser does not).
  {
    const toks = p.connective.tokens;
    const propositional = predicates.some(
      (n) => n.states?.tense !== undefined || n.states?.copulaTense !== undefined,
    );
    if (
      propositional &&
      toks.length > 2 &&
      toks[0].toLowerCase() === "no" &&
      toks[1] === ","
    ) {
      atoms.push(atom("discourse", "act", "correction"));
    }
  }
  // Event ordering (J.3): the chains-to family extended to the
  // English ordering words. A 'before'/'after' modulator on an
  // event predicate, with the predicate's agent and theme both
  // filled, states a sequence between the agent's event and
  // the theme: the earlier term chains to the later. An
  // ordinal modulator ('first', 'second', 'third', 'last') on
  // an event predicate is an ordering position over such a
  // sequence, and atomises as the predicate's ordering
  // attachment beside its modulates atom.
  const ORDINALS = new Set(["first", "second", "third", "last"]);
  for (const pred of predicates) {
    const agentEdge = p.meaning.edges.find((e) => e.from === pred.id && e.relation === "agent");
    const themeEdge = p.meaning.edges.find((e) => e.from === pred.id && e.relation === "theme");
    for (const e of p.meaning.edges) {
      if (e.to !== pred.id || e.relation !== "modulates") continue;
      const word = lemmaOf(e.from);
      if ((word === "before" || word === "after") && agentEdge && themeEdge) {
        const earlier = word === "before" ? agentEdge.to : themeEdge.to;
        const later = word === "before" ? themeEdge.to : agentEdge.to;
        atoms.push(atom("connective", `${lemmaOf(earlier)}|chains-to|${lemmaOf(later)}`, word));
      }
      if (ORDINALS.has(word)) {
        atoms.push(atom("attachment", `${pred.lemma}|ordering`, word));
      }
    }
  }

  atoms.push(atom("connective", "entry", p.meaning.entryElement));
  return atoms;
}

const atomId = (a: FeatureAtom) => `${a.family} ${a.key} ${a.value}`;
const keyId = (a: FeatureAtom) => `${a.family} ${a.key}`;

/**
 * Compare G0's atoms (required) against G1's atoms. Matching is exact
 * on (family, key, value); a surviving key with a different value is a
 * contradiction; a vanished key is a loss; anything in G1 without a
 * G0 counterpart is an addition (spurious). No partial credit except
 * the atom granularity itself (Part C.1).
 */
export function compareFeatures(g0: FeatureAtom[], g1: FeatureAtom[]): FeatureComparison {
  const records: AtomRecord[] = [];
  const pool = new Map<string, FeatureAtom[]>();
  for (const a of g1) {
    const id = atomId(a);
    const arr = pool.get(id) ?? [];
    arr.push(a);
    pool.set(id, arr);
  }
  const take = (a: FeatureAtom): boolean => {
    const arr = pool.get(atomId(a));
    if (arr && arr.length > 0) {
      arr.pop();
      return true;
    }
    return false;
  };

  const matchedKeys = new Set<string>();
  const pending: FeatureAtom[] = [];
  for (const a of g0) {
    if (take(a)) {
      records.push({ ...a, outcome: "preserved", score: 1 });
      matchedKeys.add(keyId(a));
    } else {
      pending.push(a);
    }
  }
  // Contradictions: a pending G0 atom whose key survives in G1 with a
  // different value. Consume one such G1 atom so it is not also "added".
  const g1ByKey = new Map<string, FeatureAtom[]>();
  for (const [id, arr] of pool) {
    for (const a of arr) {
      const k = keyId(a);
      const list = g1ByKey.get(k) ?? [];
      list.push(a);
      g1ByKey.set(k, list);
    }
    void id;
  }
  const consumedAdded = new Set<FeatureAtom>();
  for (const a of pending) {
    const candidates = g1ByKey.get(keyId(a)) ?? [];
    const other = candidates.find((c) => !consumedAdded.has(c));
    if (other) {
      consumedAdded.add(other);
      records.push({ ...a, reparsedValue: other.value, outcome: "contradicted", score: 0 });
    } else {
      records.push({ ...a, outcome: "lost", score: 0 });
    }
  }
  for (const [, arr] of pool) {
    for (const a of arr) {
      if (!consumedAdded.has(a)) records.push({ ...a, outcome: "added", score: 0 });
    }
  }

  const total0 = g0.length;
  const total1 = g1.length;
  const preserved = records.filter((r) => r.outcome === "preserved").length;
  const lost = records.filter((r) => r.outcome === "lost").length;
  const contradicted = records.filter((r) => r.outcome === "contradicted").length;
  const added = records.filter((r) => r.outcome === "added").length;

  const familyScores: FeatureComparison["familyScores"] = {};
  for (const a of g0) {
    const f = (familyScores[a.family] ??= { atoms: 0, preserved: 0, score: 0 });
    f.atoms += 1;
  }
  for (const r of records) {
    if (r.outcome === "preserved") familyScores[r.family].preserved += 1;
  }
  for (const f of Object.values(familyScores)) {
    f.score = f.atoms > 0 ? f.preserved / f.atoms : 0;
  }
  const fams = Object.values(familyScores);
  const macro = fams.length > 0 ? fams.reduce((s, f) => s + f.score, 0) / fams.length : 0;

  return {
    records,
    micro: total0 > 0 ? preserved / total0 : 0,
    macro,
    familyScores,
    lostRate: total0 > 0 ? lost / total0 : 0,
    contradictionRate: total0 > 0 ? contradicted / total0 : 0,
    spuriousRate: total1 > 0 ? added / total1 : 0,
    total0,
    total1,
  };
}
