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
