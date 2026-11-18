/**
 * check.ts — the controlling cycle as a constraint checker.
 *
 * Each named violation is one controlling arc doing its work:
 *  - Wood→Earth  valency: a verb controls how many Earth nodes it may
 *    take, and which are required (missing / excess arguments).
 *  - Metal→Wood  structure controls the verb: agreement (the subject's
 *    Metal cut — number/person — forces the verb form), and the K6
 *    negation-carrier rule (negation arrives on a Metal auxiliary,
 *    which carries the tense; the main verb must be bare / participial
 *    as the auxiliary demands — *"didn't arrived" double-carries tense).
 *  - Earth→Metal the noun's generated structure: a counted ZH noun
 *    must realise its classifier; clause-scope particles must surface
 *    in scope order; A-not-A and 吗 are two realisations of one
 *    interrogative force and may not combine.
 */
import { EN_LEXICON, ParsedSentence, VerbEntry, ZH_FUNCTION, ZH_LEXICON } from "./sentence";
import { vendlerClass } from "./aspect";

export interface Violation {
  name: string;
  cycle: string;
  message: string;
}

const ARG_RELATIONS = new Set(["patient", "theme", "recipient", "location", "goal"]);

export function checkSentence(parsed: ParsedSentence): Violation[] {
  const out: Violation[] = [];
  const { nodes, edges } = parsed.meaning;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lexicon = parsed.connective.language === "en" ? EN_LEXICON : ZH_LEXICON;

  for (const node of nodes) {
    if (node.syntacticElement !== "Wood" || node.role !== "verb") continue;
    const entry = lexicon[node.lemma];
    if (!entry || entry.kind !== "verb") continue;
    const frame = entry as VerbEntry;
    const args = edges.filter((e) => e.from === node.id && ARG_RELATIONS.has(e.relation));

    /* Wood→Earth: valency. */
    const requiredSlots = [...frame.required, ...(frame.prepSlot?.required ? [frame.prepSlot.slot] : [])];
    for (const slot of requiredSlots) {
      /* A suppressed slot (repair H1: agentless passive) is declared
       * but unrealised — suppressing it is the construction's doing,
       * not a valency failure, so Wood→Earth does not flag it. */
      if (node.states?.suppressedRoles?.includes(slot)) continue;
      const filled = args.some((e) => e.relation === slot);
      if (!filled) {
        out.push({
          name: "valency-missing-argument",
          cycle: "Wood→Earth",
          message: `'${node.lemma}' requires a ${slot} argument, and none is present`,
        });
      }
    }
    const capacity = frame.slots.length + (frame.prepSlot ? 1 : 0);
    const excess = args.filter((e) => byId.get(e.to)?.role === "excess");
    if (excess.length > 0) {
      out.push({
        name: "valency-excess-argument",
        cycle: "Wood→Earth",
        message: `'${node.lemma}' takes at most ${capacity} argument(s); an extra Earth node is unslotted`,
      });
    }

    /* Wood→Earth, VerbNet check (verbnet-lex): a derived verb the
     * permissive frame would license blindly, checked against the
     * argument shapes its VerbNet frames allow. Only excess is
     * judged — more bare objects than any frame's post-verbal NP
     * count, or a prepositional argument where no frame has one.
     * Fewer arguments than a frame shows is not a failure:
     * VerbNet frames list alternations, not obligations. */
    if (frame.verbnetSignature) {
      const vn = frame.verbnetSignature;
      const bareCount = args.filter((e) => ["patient", "theme", "recipient"].includes(e.relation)).length;
      const hasPrep = args.some((e) => ["location", "goal"].includes(e.relation));
      const maxNp = Math.max(...vn.shapes.map((s) => s.np));
      if (bareCount > maxNp || (hasPrep && !vn.shapes.some((s) => s.pp))) {
        out.push({
          name: "valency-verbnet-disallowed",
          cycle: "Wood→Earth",
          message:
            `'${node.lemma}' is VerbNet-covered (${vn.classes.join(", ")}): its frames allow at most ` +
            `${maxNp} bare object(s)${vn.shapes.some((s) => s.pp) ? " and prepositional arguments" : " and no prepositional argument"}; ` +
            `this use realises ${bareCount} bare object(s)${hasPrep ? " and a prepositional argument" : ""}`,
        });
      }
    }

    /* Metal→Wood: agreement + negation carrier (EN only; ZH has no agreement morphology — the edge is dormant there). */
    if (parsed.connective.language === "en" && node.states) {
      const st = node.states;
      if (st.tense === "present" && st.subjectPerson === "3sg" && st.verbForm === "base" && !st.negated) {
        out.push({
          name: "agreement",
          cycle: "Metal→Wood",
          message: `third-person singular subject requires the -s form of '${node.lemma}'`,
        });
      }
      // Vendler compatibility (WP4 §3): the progressive over a
      // stative lemma is a form the content cannot bear. The layer
      // abstains for every verb outside the curated stative set.
      if (st.aspect?.ongoing && vendlerClass(node.lemma) === "state") {
        out.push({
          name: "aspect-compatibility",
          cycle: "Metal→Wood",
          message: `'${node.lemma}' is stative; the progressive does not apply to a state`,
        });
      }
      if (st.negated && st.aux === "did" && st.verbForm !== "base") {
        out.push({
          name: "negation-carrier-tense",
          cycle: "Metal→Wood",
          message: `the auxiliary 'did' already carries the tense; the main verb must be bare, not '${node.form}'`,
        });
      }
      if (st.mood === "interrogative" && st.aux === "did" && st.verbForm !== "base") {
        out.push({
          name: "question-carrier-tense",
          cycle: "Metal→Wood",
          message: `in a question the auxiliary 'did' carries the tense; the main verb must be bare, not '${node.form}'`,
        });
      }
      if (st.negated && st.aux === "had" && st.verbForm === "base") {
        out.push({
          name: "negation-carrier-tense",
          cycle: "Metal→Wood",
          message: `the auxiliary 'had' requires the participle of '${node.lemma}', not the bare form`,
        });
      }
    }
  }

  if (parsed.connective.language === "zh") {
    const tokens = parsed.connective.tokens;
    /* Earth→Metal: counted noun without its generated classifier. */
    for (let i = 0; i + 1 < tokens.length; i++) {
      if (ZH_FUNCTION[tokens[i]] === "numeral") {
        const next = tokens[i + 1];
        if (ZH_LEXICON[next]?.kind === "noun") {
          out.push({
            name: "missing-classifier",
            cycle: "Earth→Metal",
            message: `counted noun '${next}' must realise the classifier it generates (e.g. ${ZH_LEXICON[next] && "classifier" in ZH_LEXICON[next] ? (ZH_LEXICON[next] as { classifier?: string }).classifier ?? "" : ""})`,
          });
        }
      }
    }
    /* Earth→Metal: counted noun with the WRONG classifier (Part
     * F.3's checker agreement). Applies only where the noun's
     * classifier is tabled — the admitted prediction mechanism's
     * scope; untabled nouns are the heuristic's abstention zone
     * and are not policed. */
    for (let i = 0; i + 2 < tokens.length; i++) {
      if (ZH_FUNCTION[tokens[i]] !== "numeral") continue;
      const clf = tokens[i + 1];
      const noun = tokens[i + 2];
      const isClf = ZH_FUNCTION[clf] === "classifier" || clf === "把";
      const tabled = ZH_LEXICON[noun] && "classifier" in ZH_LEXICON[noun] ? (ZH_LEXICON[noun] as { classifier?: string }).classifier : undefined;
      if (isClf && tabled && clf !== tabled) {
        out.push({
          name: "classifier-mismatch",
          cycle: "Earth→Metal",
          message: `counted noun '${noun}' generates classifier '${tabled}', not '${clf}'`,
        });
      }
    }
    /* Earth→Metal: particle scope order (aspect < question < attitude). */
    const rank = { aspect: 1, question: 2, attitude: 3 } as const;
    const kinds = parsed.scopeAttachments.map((s) => s.kind);
    for (let i = 1; i < kinds.length; i++) {
      if (rank[kinds[i]] < rank[kinds[i - 1]]) {
        out.push({
          name: "particle-scope-order",
          cycle: "Earth→Metal",
          message: `clause-scope particles must surface in scope order (aspect, then question, then attitude); found ${kinds.join(" < ")}`,
        });
        break;
      }
    }
    /* Earth→Metal: A-not-A + 吗 — two realisations of one interrogative force. */
    const root = byId.get(parsed.meaning.rootId);
    if (root?.states?.construction === "a-not-a" && parsed.scopeAttachments.some((s) => s.kind === "question")) {
      out.push({
        name: "a-not-a-with-ma",
        cycle: "Earth→Metal",
        message: "A-not-A and 吗 both realise the clause's one interrogative force; they may not combine",
      });
    }
  }

  return out;
}

/* ---------------- Three-state valency assessment (Part C.4) ----------------
 * checkSentence above is the binary gate the parser has always used.
 * assessValency is the C.4 instrument: every realised argument and
 * every missing required slot of every verb is classified as
 *   supported            — licensed by frame or lexicon evidence;
 *   unusual-but-licensed — no frame evidence licenses it, but nothing
 *                          rules it out either: the verb's frame is
 *                          evidence-free (a WordNet-derived verb with
 *                          no FrameNet LU), or the argument arrives by
 *                          a recognised rearrangement (passive
 *                          promotion, suppression);
 *   unsupported          — frame evidence exists and does not license
 *                          this argument, or a required slot is
 *                          missing with evidence behind the frame.
 * The demotion that matters: a permissive derived verb's arguments
 * used to be silently "supported" by a frame that licensed anything.
 * They are now unusual-but-licensed — visible as unlicensed, never
 * counted as frame-supported.
 *
 * VerbNet (verbnet-lex.ts, 2026-11-17) is a second evidence source
 * for exactly the evidence-free verbs: where VerbNet covers the
 * lemma, the assessment's basis is "verbnet" and the realised
 * object structure is judged against the verb's frame shapes —
 * supported when some frame allows it, unsupported when none does
 * (excess only; VerbNet frames list alternations, not obligations,
 * so an unfilled shape is never a failure here). */

export type ValencyState = "supported" | "unusual-but-licensed" | "unsupported";

export interface ValencyAssessment {
  verb: string;
  role: string;
  filler?: string;
  state: ValencyState;
  basis: "framenet" | "verbnet" | "hand-lexicon" | "evidence-free" | "construction";
  frame?: string;
}

const ARG_RELATIONS_CHECK = new Set(["agent", "patient", "theme", "recipient", "location", "goal"]);

export function assessValency(parsed: ParsedSentence): ValencyAssessment[] {
  const out: ValencyAssessment[] = [];
  const { nodes, edges } = parsed.meaning;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lexicon = parsed.connective.language === "en" ? EN_LEXICON : ZH_LEXICON;
  for (const node of nodes) {
    if (node.syntacticElement !== "Wood" || node.role !== "verb") continue;
    const entry = lexicon[node.lemma];
    if (!entry || entry.kind !== "verb") continue;
    const frame = entry as VerbEntry;
    const basis: ValencyAssessment["basis"] = frame.frameSignature
      ? "framenet"
      : frame.verbnetSignature
        ? "verbnet"
        : frame.source === "wordnet"
          ? "evidence-free"
          : "hand-lexicon";
    const licensed = new Set<string>([
      "agent",
      ...frame.slots,
      ...(frame.prepSlot ? [frame.prepSlot.slot] : []),
    ]);
    const args = edges.filter((e) => e.from === node.id && ARG_RELATIONS_CHECK.has(e.relation));
    /* VerbNet basis: the realised object structure is judged as
     * one whole against the verb's frame shapes (the same excess
     * rule as the binary checker's valency-verbnet-disallowed). */
    let vnDisallowed = false;
    if (basis === "verbnet" && frame.verbnetSignature) {
      const vn = frame.verbnetSignature;
      const bareCount = args.filter((e) => ["patient", "theme", "recipient"].includes(e.relation)).length;
      const hasPrep = args.some((e) => ["location", "goal"].includes(e.relation));
      vnDisallowed =
        bareCount > Math.max(...vn.shapes.map((s) => s.np)) ||
        (hasPrep && !vn.shapes.some((s) => s.pp));
    }
    for (const e of args) {
      const filler = byId.get(e.to);
      if (filler?.role === "excess") {
        out.push({
          verb: node.lemma, role: e.relation, filler: filler.lemma,
          state: basis === "evidence-free" ? "unusual-but-licensed" : "unsupported",
          basis, ...(frame.frameSignature ? { frame: frame.frameSignature.frame } : {}),
        });
        continue;
      }
      if (basis === "verbnet") {
        // The subject is presupposed by every VerbNet frame; the
        // object structure is what the shapes judge.
        out.push({
          verb: node.lemma, role: e.relation, filler: filler?.lemma,
          state: e.relation !== "agent" && vnDisallowed ? "unsupported" : "supported",
          basis,
        });
        continue;
      }
      if (basis === "evidence-free") {
        out.push({ verb: node.lemma, role: e.relation, filler: filler?.lemma, state: "unusual-but-licensed", basis });
      } else if (licensed.has(e.relation)) {
        out.push({
          verb: node.lemma, role: e.relation, filler: filler?.lemma, state: "supported",
          basis, ...(frame.frameSignature ? { frame: frame.frameSignature.frame } : {}),
        });
      } else if (node.states?.voice === "passive" || node.states?.suppressedRoles?.includes(e.relation)) {
        out.push({
          verb: node.lemma, role: e.relation, filler: filler?.lemma, state: "unusual-but-licensed",
          basis: "construction", ...(frame.frameSignature ? { frame: frame.frameSignature.frame } : {}),
        });
      } else {
        out.push({
          verb: node.lemma, role: e.relation, filler: filler?.lemma, state: "unsupported",
          basis, ...(frame.frameSignature ? { frame: frame.frameSignature.frame } : {}),
        });
      }
    }
    // Missing required slots (suppressed ones are the construction's,
    // not failures). For a FrameNet-backed entry the relevant record
    // is the signature's core-object set, and an unfilled core object
    // is core-optionally-unexpressed (C.4): unusual-but-licensed, not
    // unsupported — FrameNet core does not mean obligatory. Only the
    // hand lexicon's curated required slots are true obligations.
    const requiredSlots = [
      ...(frame.frameSignature ? frame.frameSignature.required : frame.required),
      ...(frame.prepSlot?.required ? [frame.prepSlot.slot] : []),
    ];
    for (const slot of requiredSlots) {
      if (node.states?.suppressedRoles?.includes(slot)) continue;
      if (!args.some((e) => e.relation === slot)) {
        out.push({
          verb: node.lemma, role: slot,
          state: basis === "hand-lexicon" ? "unsupported" : "unusual-but-licensed",
          basis, ...(frame.frameSignature ? { frame: frame.frameSignature.frame } : {}),
        });
      }
    }
  }
  return out;
}
