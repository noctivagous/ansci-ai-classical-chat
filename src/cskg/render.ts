/**
 * render.ts — CSKG spike renderer: templates over conclusions ONLY.
 *
 * A Conclusion is one graph edge restated. The renderer never adds a
 * fact, a number, or a causal link that is not in the edge it was
 * handed. Hedging is mechanical, driven by dataset support:
 *   support >= 2 (two or more CSKG datasets attest the edge)
 *     -> plain assertion
 *   support == 1
 *     -> softened form ("often", "can", "tends to")
 * CSKG has no glosses, so there is no definition text to quote; every
 * sentence here is a relation restated in English.
 */
import type { CskgEdge, CskgGraph } from "./loader";

export interface Conclusion {
  edge: CskgEdge;
  /** which endpoint the sentence is about (the other is the content) */
  about: "from" | "to";
}

function article(term: string): string {
  return /^[aeiou]/.test(term) ? "an" : "a";
}

export function edgeText(g: CskgGraph, e: CskgEdge): string {
  return `${g.terms[e.from]} —${e.rel}→ ${g.terms[e.to]} [${e.sources.join("+")}]`;
}

/** Restate one edge as one plain sentence about the chosen endpoint. */
export function renderConclusion(g: CskgGraph, c: Conclusion): string {
  const e = c.edge;
  const from = g.terms[e.from];
  const to = g.terms[e.to];
  const strong = e.support >= 2;
  const subj = c.about === "from" ? from : to;
  const obj = c.about === "from" ? to : from;
  const S = cap(subj);
  switch (e.rel) {
    case "/r/IsA":
      return c.about === "from"
        ? `${S} is ${article(obj)} ${obj}.`
        : `${cap(from)} is ${article(to)} ${to} — one example of ${subj}.`;
    case "/r/HasProperty":
    case "mw:MayHaveProperty":
      return strong ? `${S} is ${obj}.` : `${S} is often ${obj}.`;
    case "/r/UsedFor":
      return c.about === "from"
        ? strong
          ? `${S} is used for ${obj}.`
          : `${S} can be used for ${obj}.`
        : `${cap(from)} is used for ${to}.`;
    case "/r/Causes":
      return strong ? `${S} causes ${obj}.` : `${S} can cause ${obj}.`;
    case "/r/CausesDesire":
      return `${S} can make you want ${obj}.`;
    case "/r/AtLocation":
      return strong
        ? `You find ${subj} at ${obj}.`
        : `You can often find ${subj} at ${obj}.`;
    case "/r/LocatedNear":
      return `${S} is often found near ${obj}.`;
    case "/r/CapableOf":
      return `${S} can ${obj}.`;
    case "/r/PartOf":
      return c.about === "from" ? `${S} is part of ${obj}.` : `${S} has ${from} as a part.`;
    case "/r/HasA":
      return c.about === "from" ? `${S} has ${obj}.` : `${S} is something ${from} has.`;
    case "/r/MadeOf":
      return `${S} is made of ${obj}.`;
    case "/r/HasSubevent":
    case "/r/HasFirstSubevent":
    case "/r/HasLastSubevent":
      return `${S} involves ${obj}.`;
    case "/r/HasPrerequisite":
      return `${S} requires ${obj} first.`;
    case "/r/MotivatedByGoal":
      return `People do ${subj} in order to ${obj}.`;
    case "/r/Desires":
      return `${S} wants ${obj}.`;
    case "/r/CreatedBy":
      return `${S} was created by ${obj}.`;
    case "/r/Entails":
      return `${S} entails ${obj}.`;
    case "/r/ReceivesAction":
      return `${S} can be ${obj}.`;
    case "/r/MannerOf":
      return `${S} is a way of ${obj}.`;
    case "/r/DefinedAs":
      return `${S} is defined as ${obj}.`;
    case "/r/InstanceOf":
      return `${S} is an instance of ${obj}.`;
    case "/r/Synonym":
      return `${S} can also be called ${obj}.`;
    case "/r/Antonym":
      return `The opposite of ${subj} is ${obj}.`;
    case "/r/SimilarTo":
      return `${S} is similar to ${obj}.`;
    case "/r/RelatedTo":
      return `${S} is related to ${obj}.`;
    case "at:xEffect":
      return `After ${subj}, they ${obj}.`;
    case "at:oEffect":
      return `After ${subj}, others ${obj}.`;
    case "at:xWant":
      return `After ${subj}, they want to ${obj}.`;
    case "at:oWant":
      return `After ${subj}, others want to ${obj}.`;
    case "at:xReact":
      return strong
        ? `People feel ${obj} when ${subj}.`
        : `People often feel ${obj} when ${subj}.`;
    case "at:oReact":
      return `Others often feel ${obj} when ${subj}.`;
    case "at:xNeed":
      return `${S} first needs ${obj}.`;
    case "at:xIntent":
      return `The point of ${subj} is to ${obj}.`;
    case "at:xAttr":
      return `Someone who does that is ${obj}.`;
    default:
      return `${S} — ${e.rel} — ${obj}.`;
  }
}

export function joinSentences(sentences: string[]): string {
  return sentences.join(" ");
}

/** Hedge wrapper for answers assembled from weak (support-1) evidence. */
export function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
