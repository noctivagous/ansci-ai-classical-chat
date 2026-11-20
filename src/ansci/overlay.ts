/**
 * THE OVERLAY — per-word classification mappings (Slice D of the
 * B-bucket anchor expansion, built 2026-11-18 under the owner's
 * pre-rulings 1b/2a/3a/4a and the sequence authorization; batch 1
 * ratified by the owner 2026-11-18, "rec").
 *
 * The overlay is a separate partition from the curated table
 * (classify.ts), per the project's standing pattern for layered
 * knowledge. Its law is FILL-ONLY (ruling 3a): an overlay entry
 * speaks only where the curated table and the WordNet climb are
 * both silent. It never overrides either — the join consults it
 * last, and the test suite pins the eligibility invariant: every
 * concept here is one the table does not own and the climb does
 * not classify, so if a future table or climb addition starts
 * speaking for one of these words, the entry's retirement is
 * forced by a failing test, not left to memory. One named
 * exception, recorded at the A+D merge (2026-11-18): cinnabar's
 * moth sense climbs to Slice A's insect stop — a different
 * reading from the mineral this partition files, whose own
 * chain still reaches nothing; the test names the exception
 * and its grounds rather than retiring the mineral's entry.
 *
 * Standing (ruling 2a): every entry carries its own provenance
 * ("overlay", priced at the derived tier by tierOfProvenance in
 * pricing.ts), a confidence capped at 0.80, and its reviewer and
 * rationale recorded on the entry. Review is tiered (ruling 1b):
 * in-loop review with a recorded rationale for every entry; the
 * owner personally reviewed batch 1's contested items and its
 * blind sample (the sample was unblinded at the owner's request
 * and explained, so the batch's error-count mechanism did not
 * run — recorded in docs/ansci/slice-d-batch-1.md).
 *
 * An entry may carry a non-"overall" aspect where its rationale
 * is aspect-bound (batch 1: flu, illness) — the table's own
 * shape, mirrored; lookup falls back the way the table's does.
 *
 * Entries below the join's CONFIDENCE_GATE (lacquer, resin,
 * camphor, coal at 0.45) are recorded knowledge: the join records
 * them as gated derivations and derives nothing from them. Their
 * grades are the pilot's honest ones, not inflated to clear the
 * gate.
 */
import type { Element } from "./sentence";

export interface OverlayEntry {
  concept: string;
  element: Element;
  aspect: string;
  confidence: number;
  provenance: "overlay";
  /** Who reviewed this entry in-loop, and its ratification. */
  reviewer: string;
  /** The recorded rationale (tiered review, ruling 1b). */
  rationale: string;
}

const R = "Kavi (in-loop); owner-ratified 2026-11-18";

const e = (
  concept: string,
  element: Element,
  confidence: number,
  rationale: string,
  aspect = "overall",
): OverlayEntry => ({ concept, element, aspect, confidence, provenance: "overlay", reviewer: R, rationale });

/**
 * Batch 1 (docs/ansci/slice-d-batch-1.md): 25 clean proposals as
 * ratified, plus the 4 contested items the owner's ruling
 * accepted (camphor, coal, saltpeter, flu). The 6 contested
 * abstentions (silk, leather, wool, sesame, ink, beeswax) are
 * NOT here — they stay located gaps, and the batch document
 * records why.
 */
export const OVERLAY_ENTRIES: OverlayEntry[] = [
  e("fire", "Fire", 0.8, "The phase's namesake phenomenon (combustion). Slice B took water → Water on the same ground; the table's silence on this lemma is a keying gap, not a judgment. Priced at the cap on the owner's ruling (decision 2a, 2026-11-18)."),
  e("paper", "Wood", 0.6, "The pilot's own call (Wood · C 0.60, 'constitutively plant fibre', wp1-pilot-results §6). The climb cannot see composition."),
  e("hemp", "Wood", 0.6, "A plant fibre — the pilot's paper precedent."),
  e("cotton", "Wood", 0.6, "A plant fibre — the pilot's paper precedent."),
  e("flax", "Wood", 0.6, "A plant fibre — the pilot's paper precedent."),
  e("linen", "Wood", 0.6, "Flax fibre cloth; the fibre rationale carries it."),
  e("ramie", "Wood", 0.6, "A plant fibre — the pilot's paper precedent."),
  e("lacquer", "Wood", 0.45, "The pilot's own call (Wood · C 0.45, 'a tree sap, prepared'). Sub-gate by its honest grade."),
  e("resin", "Wood", 0.45, "A tree exudate — the lacquer row's family and grade. Sub-gate, as lacquer."),
  e("camphor", "Wood", 0.45, "Contested item, accepted on the owner's ruling: a tree-derived preparation, covered exactly by the pilot's lacquer row. Sub-gate, as lacquer."),
  e("coal", "Wood", 0.45, "Contested item, accepted on the owner's ruling: carbonised plant matter; the pilot filed charcoal — also a fuel — as Wood by constitution, and this is the same call one geological step further. Sub-gate."),
  e("ear", "Water", 0.7, "The attested orifice correspondence: the kidney opens into the ear (腎開竅於耳), and the kidney is Water. The table holds the correspondence under its own keys; the English word was unmapped."),
  e("cinnabar", "Earth", 0.6, "A mineral (朱砂); stone class under R3. Its WordNet chain runs through the moth sense's family and never reaches the rock stop."),
  e("agate", "Earth", 0.6, "A mineral (a quartz kind); stone class under R3."),
  e("hematite", "Earth", 0.6, "An iron-ore mineral; stone class under R3."),
  e("magnetite", "Earth", 0.6, "An iron-ore mineral; stone class under R3."),
  e("mica", "Earth", 0.6, "A sheet mineral; stone class under R3."),
  e("orpiment", "Earth", 0.6, "A mineral pigment (雌黃); stone class under R3."),
  e("quartz", "Earth", 0.6, "A rock-forming mineral (its own gloss); stone class under R3."),
  e("realgar", "Earth", 0.6, "A mineral pigment (雄黃); stone class under R3."),
  e("sulphur", "Earth", 0.6, "The pilot's 'a stone that burns' (Earth · C); stone class under R3."),
  e("turquoise", "Earth", 0.6, "A mineral gemstone; stone class under R3."),
  e("lazuli", "Earth", 0.6, "Lapis lazuli, a mineral pigment stone; stone class under R3."),
  e("saltpeter", "Earth", 0.55, "Contested item, accepted on the owner's ruling: a mined mineral salt (硝石), a substance in its own right — not a second filing of the table's salt, and both land Earth."),
  e("brick", "Earth", 0.55, "Baked clay (its own gloss): earth by material, discounted one step under the minerals for the firing preparation."),
  e("ceramic", "Earth", 0.55, "Fired clay ware: earth by material, preparation discount as brick."),
  e("cement", "Earth", 0.55, "A mineral powder preparation: earth class by material, preparation discount as brick."),
  e("crystal", "Earth", 0.55, "Doubly routed to Earth: the mineral kind by stone class, and crystal glass by the pilot's glass-by-composition call (Earth · T4). Priced under the flat mineral price for the sense spread."),
  e("flu", "Metal", 0.5, "Contested item, accepted on the owner's ruling: an illness, filed under the illness aspect on the table's cold precedent (illness → Metal). The aspect is the entry's honesty: influenza's only sense is the illness.", "illness"),
];

/**
 * The overlay's read, mirroring lookupClassification's shape:
 * an aspect match wins; otherwise the concept's primary (first)
 * entry. Fill-only is the CALLER's discipline (the join consults
 * this last); this function simply answers for its own partition.
 */
export function lookupOverlay(concept: string, aspect?: string): OverlayEntry | undefined {
  const c = concept.toLowerCase();
  const entries = OVERLAY_ENTRIES.filter((x) => x.concept === c);
  if (!entries.length) return undefined;
  if (!aspect) return entries[0];
  return entries.find((x) => x.aspect === aspect) ?? entries[0];
}
