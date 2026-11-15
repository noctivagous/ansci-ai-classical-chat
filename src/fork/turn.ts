/**
 * turn.ts — one conversational turn of the fork (Slice C).
 *
 * Pipeline: parse (sentence layer) → record (session situation) →
 * reason (join derivations + the two cycles) → reply.
 *
 * Reply discipline, per the design's transcript gate (§5.1):
 *  - the reply is composed from the SITUATION (what the person said,
 *    taken up in second person) plus ONE steering choice made by the
 *    cycles, and the trace names that choice per turn;
 *  - steering by cycle: a state whose element GENERATES the next
 *    content is followed in the generating direction (toward its
 *    expression); a state that CONTROLS an earlier state is addressed
 *    itself, to release what it restrains; an expression already
 *    vented is met from the restraining side;
 *  - questions the net can answer are answered FROM the derivation
 *    path (shared-prior join), rendered in plain words;
 *  - when the net has no testimony, the turn declines in shape and
 *    names what is missing (AnSci's abstention discipline);
 *  - the ontology is NEVER named on the surface: no element, polarity
 *    or cycle vocabulary appears in replies (a test scans for it).
 *    Trace text is internal and may name the machinery.
 */
import { seasonDegreeProfile } from "../engine";
import { EN_LEXICON, type MeaningNode, type ParsedSentence, type VerbEntry } from "./sentence";
import { CONTROLS, GENERATES, type Element } from "./sentence";
import { parse } from "./parse";
import { lookupClassification } from "./classify";
import { derive } from "./join";
import { holderOf, recordEntity, resolvePronoun, type Session } from "./session";

export interface TurnTrace {
  turn: number;
  input: string;
  parseSummary: string;
  classifications: { concept: string; element: Element; confidence: number; provenance: string }[];
  resolutions: { pronoun: string; resolvedTo: string }[];
  /** The named cycle arc that steered the reply, when one did. */
  cyclePath?: string;
  /** The derivation path the reply was built from, when one was. */
  derivationPath?: string;
  /** Why no cycle path steered this turn (event-only turns), or the
   *  decline reason for unanswerable turns. */
  steeringNote?: string;
  declineReason?: string;
}

export interface TurnResult {
  reply: string;
  trace: TurnTrace;
}

const CONTROLLER_OF: Record<Element, Element> = { Wood: "Metal", Fire: "Water", Earth: "Wood", Metal: "Fire", Water: "Earth" };

function nodeById(p: ParsedSentence, id: string): MeaningNode {
  return p.meaning.nodes.find((n) => n.id === id)!;
}
function targets(p: ParsedSentence, fromId: string, relation: string): MeaningNode[] {
  return p.meaning.edges.filter((e) => e.from === fromId && e.relation === relation).map((e) => nodeById(p, e.to));
}
function pastOf(lemma: string): string {
  const e = EN_LEXICON[lemma] as VerbEntry | undefined;
  return e && e.kind === "verb" ? e.forms.past : lemma;
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function processTurn(session: Session, text: string): TurnResult {
  session.turnCount += 1;
  const turn = session.turnCount;
  const trace: TurnTrace = { turn, input: text, parseSummary: "", classifications: [], resolutions: [] };

  let parsed: ParsedSentence;
  try {
    parsed = parse(text, "en");
  } catch {
    trace.parseSummary = "parse failed";
    trace.declineReason = "the sentence could not be taken apart by the sentence layer";
    return { reply: "I couldn't take that sentence apart — could you put it another way?", trace };
  }
  const root = nodeById(parsed, parsed.meaning.rootId);
  trace.parseSummary = `root '${root.lemma}' (${root.syntacticElement}${root.role ? ", " + root.role : ""}); nodes: ${parsed.meaning.nodes.map((n) => n.lemma).join(", ")}; mood: ${root.states?.mood ?? "indicative"}`;

  /* ---- record: entities, pronoun resolutions, events, states ---- */
  const resolve = (lemma: string): string => {
    if (lemma === "it" || lemma === "them") {
      const hit = resolvePronoun(session, lemma, turn);
      if (hit) {
        trace.resolutions.push({ pronoun: lemma, resolvedTo: hit.lemma });
        return hit.lemma;
      }
    }
    return holderOf(lemma);
  };
  for (const n of parsed.meaning.nodes) {
    if (n.syntacticElement === "Earth") recordEntity(session, n.lemma, turn);
  }
  const classificationOf = (lemma: string) => {
    const c = lookupClassification(lemma);
    if (c) trace.classifications.push({ concept: c.concept, element: c.element, confidence: c.confidence, provenance: c.provenance });
    return c;
  };

  const predEdge = parsed.meaning.edges.find((e) => e.relation === "predicate" && e.to === root.id);
  const isVerbRoot = root.syntacticElement === "Wood" && root.role === "verb";

  if (isVerbRoot) {
    const agent = targets(parsed, root.id, "agent")[0];
    const ev = {
      verb: root.lemma,
      agent: agent ? resolve(agent.lemma) : undefined,
      patient: targets(parsed, root.id, "patient")[0]?.lemma,
      theme: targets(parsed, root.id, "theme")[0]?.lemma,
      location: targets(parsed, root.id, "location")[0]?.lemma,
      recipient: targets(parsed, root.id, "recipient")[0]?.lemma,
      turn,
      text,
    };
    if (ev.patient) ev.patient = resolve(ev.patient);
    if (ev.location) ev.location = resolve(ev.location);
    session.events.push(ev);
    // A classified verb-state (sleep) is also a state of its agent.
    const c = classificationOf(root.lemma);
    if (c && ev.agent) {
      session.states.push({ holder: ev.agent, lemma: root.lemma, concept: c.concept, element: c.element, negated: root.states?.negated, turn });
    }
  } else if (predEdge) {
    const subject = nodeById(parsed, predEdge.from);
    const c = classificationOf(root.lemma);
    session.states.push({
      holder: resolve(subject.lemma),
      lemma: root.lemma,
      concept: c?.concept,
      element: c?.element ?? root.semanticElement,
      turn,
    });
  }
  for (const n of parsed.meaning.nodes) {
    if (n.id !== root.id && n.syntacticElement !== "Wood") classificationOf(n.lemma);
  }
  trace.classifications = trace.classifications.filter(
    (c, i, a) => a.findIndex((x) => x.concept === c.concept && x.element === c.element) === i,
  );

  /* ---- questions: answer from the derivation, or decline in shape ---- */
  if (root.states?.mood === "interrogative" && predEdge) {
    const subject = nodeById(parsed, predEdge.from);
    return answerPredicateQuestion(session, trace, subject.lemma, root.lemma, root.states?.questionKind === "why");
  }
  if (root.states?.mood === "interrogative") {
    trace.declineReason = "this question shape is not one the net can answer yet";
    return { reply: "That question is outside what I can work through at the moment.", trace };
  }

  /* ---- statements: steer by cycle ---- */
  const thisState = session.states.filter((s) => s.turn === turn && s.element).pop();
  const thisEvent = session.events.filter((e) => e.turn === turn).pop();

  // (a) The new state CONTROLS an earlier state: address the restrainer.
  if (thisState?.element) {
    const restrained = session.states.find(
      (s) => s.turn < turn && s.element && CONTROLS[thisState.element!] === s.element,
    );
    if (restrained) {
      trace.cyclePath = `${thisState.element}→${restrained.element} (controlling)`;
      trace.derivationPath = derive(session.graph, thisState.concept ?? thisState.lemma).conclusions[0]?.path;
      const stateNoun = thisState.lemma === "worried" ? "worry" : thisState.concept ?? thisState.lemma;
      const reply =
        `You ${restrained.negated ? "couldn't" : "were held from"} ${restrained.lemma === "sleep" ? "sleep" : restrained.lemma}, and you were ${thisState.lemma}. ` +
        `What is the ${stateNoun} about? That seems to be the thing holding the ${restrained.lemma} back.`;
      return { reply, trace };
    }
  }

  // (b) An event vents an earlier state: meet it from the restraining side.
  if (thisEvent && !thisState) {
    const earlier = session.states.filter((s) => s.turn < turn && s.element).pop();
    if (earlier?.element) {
      const controller = CONTROLLER_OF[earlier.element];
      trace.cyclePath = `${controller}→${earlier.element} (controlling)`;
      const d = derive(session.graph, earlier.concept ?? earlier.lemma);
      trace.derivationPath = d.conclusions.find((c) => c.category.startsWith("restrained-by:"))?.path ?? d.conclusions[0]?.path;
      const patient = thisEvent.patient ?? thisEvent.theme;
      const reply =
        `You ${pastOf(thisEvent.verb)}${patient ? ` the ${patient}` : ""}${thisEvent.recipient ? ` at ${thisEvent.recipient}` : ""}${thisEvent.location ? ` in the ${thisEvent.location}` : ""}. ` +
        `Now that it's out — what would help you settle?`;
      return { reply, trace };
    }
  }

  // (c) A fresh state: follow the generating direction toward expression.
  if (thisState?.element) {
    const generated = GENERATES[thisState.element];
    trace.cyclePath = `${thisState.element}→${generated} (generating)`;
    const d = derive(session.graph, thisState.concept ?? thisState.lemma);
    trace.derivationPath = d.conclusions.find((c) => c.category.startsWith("generates:"))?.path ?? d.conclusions[0]?.path;
    const priorEvent = session.events.filter((e) => e.turn < turn).pop();
    if (isVerbRoot) {
      // A verb-carried state (can't sleep): acknowledge the state itself,
      // and follow the generating direction toward what fills it.
      const ack = thisState.negated ? `You can't ${thisState.lemma}.` : `You ${thisState.lemma}.`;
      const follow = thisState.lemma === "sleep"
        ? "What's on your mind when you lie awake?"
        : "What's on your mind when it happens?";
      return { reply: `${ack} ${follow}`, trace };
    }
    const ack = `You were ${thisState.lemma}${priorEvent?.patient ? ` when you ${pastOf(priorEvent.verb)} the ${priorEvent.patient}` : ""}.`;
    const follow = priorEvent?.patient
      ? `What did you say when you ${pastOf(priorEvent.verb)} the ${priorEvent.patient}?`
      : "What did you say or do?";
    return { reply: `${ack} ${follow}`, trace };
  }

  // (d) A classified verb-state (can't sleep): generating closure onward.
  // (Handled above via thisState when the verb carried a classification.)

  // (e) A need/state-of-affairs about a recorded thing (It needs more salt).
  if (isVerbRoot && root.lemma === "need") {
    const theme = targets(parsed, root.id, "theme")[0];
    const thing = thisEvent?.agent; // already resolved during recording
    if (theme) {
      const d = derive(session.graph, theme.lemma, "taste") ?? derive(session.graph, theme.lemma);
      const taste = d.conclusions.find((c) => c.category === "taste");
      trace.derivationPath = taste?.path ?? d.conclusions[0]?.path;
      trace.steeringNote = "answered from the theme's classification and its taste correspondence";
      return {
        reply: `${cap(thing ? `the ${thing}` : "it")} needs more ${theme.lemma}. How does it taste so far?`,
        trace,
      };
    }
  }

  // (f) A plain event: acknowledge it from the situation; if its patient
  // is classified food, the generating closure asks after the next step.
  if (thisEvent) {
    const patient = thisEvent.patient ?? thisEvent.theme;
    const patientClass = patient ? lookupClassification(patient) : undefined;
    const ackParts = [`You ${pastOf(thisEvent.verb)}`];
    if (thisEvent.theme && thisEvent.location) ackParts.push(`the ${thisEvent.theme} in the ${thisEvent.location}`);
    else if (patient) ackParts.push(`the ${patient}`);
    const ack = ackParts.join(" ") + ".";
    if (patientClass?.aspect === "food" || thisEvent.theme) {
      const el = patientClass?.element ?? "Water";
      trace.cyclePath = `${el}→${GENERATES[el]} (generating closure)`;
      trace.derivationPath = patient ? derive(session.graph, patient).conclusions[0]?.path : undefined;
      return { reply: `${ack} What goes in next?`, trace };
    }
    trace.steeringNote = "event recorded as a topic; no state yet for the cycles to steer by";
    return { reply: `${ack} What was in it?`, trace };
  }

  trace.steeringNote = "statement recorded; nothing in it for the cycles to steer by";
  return { reply: "Noted. What happened next?", trace };
}

/* ------------------------------------------------------------------ */

/**
 * "Why is winter cold?" / "Is summer hot?" — answered from the shared-
 * prior derivation (subject and predicate joined through the net), or
 * declined with the missing piece named. The plain rendering uses the
 * season degree profiles: how strongly the quality runs in the season.
 */
function answerPredicateQuestion(
  session: Session,
  trace: TurnTrace,
  subjectLemma: string,
  predicateLemma: string,
  isWhy: boolean,
): TurnResult {
  const graph = session.graph;
  const subjectNode = graph.nodeByName(subjectLemma);
  const qualityNode = graph.allNodes().find(
    (n) => n.type === "Quality" && (n.name === predicateLemma || graph.synonymsOf(n).includes(predicateLemma)),
  );
  const missing: string[] = [];
  if (!subjectNode || !lookupClassification(subjectLemma)) missing.push(`I have nothing on ${subjectLemma} in my notes`);
  if (!qualityNode) missing.push(`I have no way to connect anything to '${predicateLemma}'`);

  const path =
    subjectNode && qualityNode
      ? graph.findPath(subjectNode.id, qualityNode.id, {
          edgeTypes: ["ELEMENT_OF", "HAS_ELEMENT", "POLARITY_OF", "HAS_QUALITY", "CORRESPONDS_TO"],
          confidenceThreshold: 0,
        })
      : null;
  if (!path) {
    if (!missing.length) missing.push(`no path runs from ${subjectLemma} to ${predicateLemma} in what I know`);
    trace.declineReason = missing.join("; ");
    return {
      reply: `I can't answer that from what I know: ${missing.join(", and ")}.`,
      trace,
    };
  }
  trace.derivationPath = path.text;
  trace.steeringNote = "answered from the shared-prior derivation path";

  // Plain rendering via the season degree profile, when the subject is
  // a season and the predicate is one of its polarity qualities.
  const profile = seasonDegreeProfile(graph, subjectNode!.id);
  const isColdSide = ["cold", "dark", "cool"].includes(predicateLemma);
  const aspectKey = predicateLemma === "dark" ? "light" : "temperature";
  const yinShare = profile?.aspects[aspectKey];
  if (profile && yinShare !== undefined) {
    const share = isColdSide ? yinShare : 1 - yinShare;
    if (share >= 0.65) {
      return {
        reply: isWhy
          ? `${cap(subjectLemma)} is ${predicateLemma}, because it is the season turned most fully toward ${predicateLemma} — ${predicateLemma} runs at its strongest there.`
          : `Yes — ${subjectLemma} is ${predicateLemma}: it is the season turned most fully toward ${predicateLemma}.`,
        trace,
      };
    }
    const strength = share >= 0.35 ? "strong" : "faint";
    return { reply: `${cap(subjectLemma)} is ${predicateLemma} — ${predicateLemma} runs ${strength} there.`, trace };
  }
  return {
    reply: `${cap(subjectLemma)} is ${predicateLemma} — the two belong together in everything I have on them.`,
    trace,
  };
}
