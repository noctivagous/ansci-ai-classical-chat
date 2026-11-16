/**
 * aspect.ts — the aspect dispatcher's shared machinery (WP4 spec,
 * docs/fork/wp4-aspect-spec.md; depth programme stage 2).
 *
 * The five aspect patterns of the design are named configurations
 * over a compositional feature bundle (AspectBundle in sentence.ts),
 * not exclusive states. This module holds the pieces parse, generate
 * and check share: the ZH particle -> bundle mapping, the English
 * be-form agreement table, the bundle's configuration name for
 * reports, and the Vendler compatibility layer (v1: a curated
 * stative set; everything else abstains).
 */

import type { AspectBundle } from "./sentence";

/** ZH aspect particle -> the bundle it realises. */
/**
 * The Chinese negator selected by the negated predicate's aspect
 * bundle (Part F.2; admission probe: stage5-admission-probes.md,
 * 15/15 including both A-not-A configurations). 没 for bounded,
 * perfected or experiential predicates and for 有 (possession is
 * categorical); 不 elsewhere — states, habituals, volition,
 * adjectives. This is the generation-side form-selection rule:
 * at generation time there is no surface string to inspect, so
 * the choice is made from the bundle, the same machinery the
 * parser records.
 */
export function zhNegatorFor(lemma: string, aspect?: AspectBundle): "不" | "没" {
  return aspect?.bounded || aspect?.perfect || aspect?.experiential || lemma === "有" ? "没" : "不";
}

export function zhAspectFor(particle: string): AspectBundle | undefined {
  switch (particle) {
    case "了": return { bounded: true };
    case "着": return { ongoing: true };
    case "过": return { perfect: true, experiential: true };
    default: return undefined;
  }
}

/** The particle a bundle selects on ZH generation, in the order the
 *  language stacks them when several features are present. A bundle
 *  produced by the parser carries at most one particle feature. */
export function zhParticleFor(bundle: AspectBundle): string {
  if (bundle.experiential) return "过";
  if (bundle.ongoing) return "着";
  if (bundle.bounded) return "了";
  return "";
}

/** English be-form for the progressive, from tense + subject person. */
export function enBeForm(tense: string | undefined, person: string | undefined): string {
  if (tense === "past") return person === "1pl" || person === "3pl" || person === "2" ? "were" : "was";
  return person === "1sg" ? "am" : person === "3sg" ? "is" : "are";
}

/** The named configuration a bundle realises (reports, tests). */
export function bundleConfiguration(bundle: AspectBundle | undefined): string {
  if (!bundle || Object.keys(bundle).length === 0) return "unmarked";
  const names: string[] = [];
  if (bundle.perfect && bundle.experiential) names.push("experiential");
  else if (bundle.perfect && bundle.ongoing) names.push("perfect-progressive");
  else if (bundle.perfect) names.push("perfect");
  if (bundle.ongoing && !bundle.perfect) names.push("progressive");
  if (bundle.bounded) names.push("perfective");
  if (bundle.habitual) names.push("habitual");
  if (bundle.inchoative) names.push("inchoative");
  if (bundle.resultative) names.push("resultative");
  return names.length ? names.join("+") : "unmarked";
}

/* ---------------- Vendler compatibility layer (v1) ---------------- */

/**
 * Curated stative lemmas: verbs whose lexical aspect is a state.
 * The progressive over a state is the one compatibility judgement
 * v1 makes; every other verb is "unknown" and the layer abstains —
 * no verdict is better than an invented one (WP4 spec §3).
 */
export const STATIVE_VERBS = new Set([
  "know", "believe", "love", "hate", "want", "need", "seem", "own",
  "contain", "belong", "resemble", "exist", "matter", "consist",
]);

export function vendlerClass(lemma: string): "state" | "unknown" {
  return STATIVE_VERBS.has(lemma.toLowerCase()) ? "state" : "unknown";
}
