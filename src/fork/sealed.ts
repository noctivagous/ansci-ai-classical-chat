/**
 * sealed.ts — the sealed-materials protocol, mechanised
 * (repair programme Part C.5; WP2 benchmark infrastructure).
 *
 * What this module is: the machinery a sealed evaluation run needs —
 * a manifest format carrying the protocol's full per-item field set,
 * content and manifest hashing so post-sealing modification is
 * detectable, the role separation the protocol assigns (author /
 * operator / custodian) expressed as operations that keep the
 * operator's view blind, and G0-accuracy scoring (amendment A1)
 * against the sealed expected graphs using the same atom machinery
 * as the depth metric (features.ts), reported alongside G0↔G1
 * preservation.
 *
 * What it is not: a benchmark. No sealed item set exists until an
 * author independent of the system's builders writes one; the
 * judging itself needs independent humans and stays out of scope.
 * The fixture under test/fixtures/ exercises this machinery only,
 * and says so in its own fields.
 *
 * Roles, as operations:
 *  - AUTHOR: sealManifest(draft) — writes items, expected analyses
 *    and predictions, then seals. After sealing, any modification
 *    breaks the item's content_hash (verifyManifest detects it).
 *  - OPERATOR: operatorView(manifest) — the only run input: item_id,
 *    text, language, build target. Expected graphs, predictions and
 *    scoring fields are absent from the view by construction, not
 *    by the operator's restraint.
 *  - CUSTODIAN: verifyManifest + scoreSealedRun — holds the
 *    manifest, verifies hashes before and after the run, and joins
 *    the operator's raw output to the expected graphs only at
 *    scoring time. A run whose manifest_hash does not match the
 *    sealed manifest is not scored.
 */
import { createHash } from "node:crypto";
import type { FeatureAtom } from "./features";
import { compareFeatures } from "./features";

/** The protocol's item classes (C.5). */
export type SealedItemClass =
  | "positive-control"
  | "negative-control"
  | "near-miss"
  | "brake"
  | "discriminating";

/** Determinate: one expected graph, mechanical scoring.
 *  Finite-ambiguity: a declared set of acceptable graphs.
 *  Unresolved: no defensible expected graph — excluded from binary
 *  scoring, reported by class and count (C.5). */
export type SealedItemStatus = "determinate" | "finite-ambiguity" | "unresolved";

/** One sealed item, the protocol's full field set. The hash fields
 *  (content_hash) are added by sealing; a draft item omits them. */
export interface SealedItem {
  item_id: string;
  item_text: string;
  language: "en" | "zh";
  source_id: string;
  sampling_frame: string;
  selection_seed: string;
  item_class: SealedItemClass;
  item_status: SealedItemStatus;
  target_claim_id: string;
  conventional_prediction: string;
  elemental_prediction: string;
  /** Feature atoms (features.ts), not a sentence-level label.
   *  Null only for unresolved items. */
  expected_graph: { atoms: FeatureAtom[] } | null;
  /** Finite, declared in advance; consulted only for
   *  finite-ambiguity items. Empty otherwise. */
  acceptable_variants: { atoms: FeatureAtom[] }[];
  excluded_decisions: string;
  scoring_rule_version: string;
  parser_build_target: string;
  creation_timestamp: string;
  content_hash?: string;
}

export interface SealedManifest {
  manifest_id: string;
  created: string;
  scoring_rule_version: string;
  roles: { author: string; operator: string; custodian: string };
  items: SealedItem[];
  manifest_hash?: string;
}

/** Canonical JSON: recursively key-sorted, so hashes do not depend
 *  on the key order a file happened to be written in. */
export function canonicalise(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`).join(",")}}`;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

/** An item's content hash: every field except the hash itself. */
export function itemContentHash(item: SealedItem): string {
  const { content_hash: _omit, ...content } = item;
  return sha256(canonicalise(content));
}

/** The manifest hash: the manifest's own fields plus the ordered
 *  item content hashes — any item change moves it. */
export function manifestHash(manifest: SealedManifest): string {
  const { manifest_hash: _omit, items, ...head } = manifest;
  return sha256(canonicalise({ ...head, item_hashes: items.map((i) => i.content_hash ?? itemContentHash(i)) }));
}

/** AUTHOR step: seal a draft manifest. Computes every item's
 *  content_hash and the manifest_hash. After this, the manifest is
 *  frozen as far as the protocol is concerned: later edits are
 *  detectable, and a post-run claim that an unexpected output was
 *  "also acceptable" is inadmissible — variants live in the sealed
 *  fields or nowhere. */
export function sealManifest(draft: SealedManifest): SealedManifest {
  const items = draft.items.map((item) => ({ ...item, content_hash: itemContentHash(item) }));
  const sealed: SealedManifest = { ...draft, items };
  sealed.manifest_hash = manifestHash(sealed);
  return sealed;
}

export interface ManifestVerification {
  ok: boolean;
  manifest_hash_ok: boolean;
  /** item_ids whose content no longer matches their sealed hash. */
  tampered_items: string[];
}

/** CUSTODIAN step: verify a manifest still matches its seals. */
export function verifyManifest(manifest: SealedManifest): ManifestVerification {
  const tampered = manifest.items
    .filter((i) => i.content_hash !== itemContentHash(i))
    .map((i) => i.item_id);
  const hashOk = manifest.manifest_hash === manifestHash(manifest);
  return { ok: hashOk && tampered.length === 0, manifest_hash_ok: hashOk, tampered_items: tampered };
}

/** OPERATOR step: the blind run input. Expected graphs, predictions,
 *  classes and scoring fields are stripped by construction. */
export interface OperatorItem {
  item_id: string;
  item_text: string;
  language: "en" | "zh";
  parser_build_target: string;
}

export function operatorView(manifest: SealedManifest): { manifest_id: string; manifest_hash: string; items: OperatorItem[] } {
  return {
    manifest_id: manifest.manifest_id,
    manifest_hash: manifest.manifest_hash ?? "",
    items: manifest.items.map((i) => ({
      item_id: i.item_id,
      item_text: i.item_text,
      language: i.language,
      parser_build_target: i.parser_build_target,
    })),
  };
}

/** One item's raw run output, as the operator's run records it:
 *  G0 is the original parse's atoms; S1 the generated sentence; G1
 *  the reparse's atoms. No expected data appears here. */
export interface SealedRunItem {
  item_id: string;
  parsed: boolean;
  error?: string;
  generated?: string;
  g0_atoms: FeatureAtom[];
  g1_atoms: FeatureAtom[];
}

export interface SealedRun {
  manifest_id: string;
  manifest_hash: string;
  build_id: string;
  command: string;
  items: SealedRunItem[];
}

export interface ItemScore {
  item_id: string;
  item_class: SealedItemClass;
  item_status: SealedItemStatus;
  language: "en" | "zh";
  parsed: boolean;
  /** G0 accuracy against the sealed expected graph (A1): the
   *  comparison's micro over expected atoms, with the full record.
   *  Null for unresolved items (excluded from binary scoring). */
  g0_accuracy: number | null;
  g0_comparison: ReturnType<typeof compareFeatures> | null;
  /** G0↔G1 feature preservation, reported alongside (A1). */
  preservation: number | null;
  /** For finite-ambiguity items: which declared graph scored best
   *  ("expected" or "variant-N"). */
  matched_variant?: string;
}

export interface SealedScoreReport {
  manifest_id: string;
  manifest_hash: string;
  build_id: string;
  items: ItemScore[];
  /** Pooled G0 accuracy over scored items, and the same figure per
   *  language — reported separately, never pooled away (C.6
   *  language parity: no pooled pass may hide a Chinese failure). */
  g0_accuracy_pooled: number | null;
  g0_accuracy_by_language: Record<string, number | null>;
  g0_accuracy_by_class: Record<string, number | null>;
  preservation_pooled: number | null;
  family_scores: Record<string, { atoms: number; preserved: number; score: number }>;
  unresolved_by_class: Record<string, number>;
  scored_items: number;
  unresolved_items: number;
}

function scoreOne(item: SealedItem, run: SealedRunItem): ItemScore {
  const base: ItemScore = {
    item_id: item.item_id,
    item_class: item.item_class,
    item_status: item.item_status,
    language: item.language,
    parsed: run.parsed,
    g0_accuracy: null,
    g0_comparison: null,
    preservation: null,
  };
  if (item.item_status === "unresolved" || !item.expected_graph) return base;
  if (!run.parsed) {
    base.g0_accuracy = 0;
    return base;
  }
  // Determinate: the one expected graph. Finite-ambiguity: the best
  // of the declared set — expected first, then variants in order.
  const candidates = [item.expected_graph, ...item.acceptable_variants];
  let best: ReturnType<typeof compareFeatures> | null = null;
  let bestName = "expected";
  candidates.forEach((cand, idx) => {
    const cmp = compareFeatures(cand.atoms, run.g0_atoms);
    if (!best || cmp.micro > best.micro) {
      best = cmp;
      bestName = idx === 0 ? "expected" : `variant-${idx}`;
    }
  });
  base.g0_accuracy = best!.micro;
  base.g0_comparison = best;
  if (item.item_status === "finite-ambiguity") base.matched_variant = bestName;
  base.preservation = compareFeatures(run.g0_atoms, run.g1_atoms).micro;
  return base;
}

/** CUSTODIAN step: score a completed run against the sealed
 *  manifest. Refuses a run recorded against a different manifest
 *  hash — the run must be of THIS sealed set, on the frozen build
 *  it names. */
export function scoreSealedRun(manifest: SealedManifest, run: SealedRun): SealedScoreReport {
  if (run.manifest_hash !== manifest.manifest_hash) {
    throw new Error(
      `run manifest_hash ${run.manifest_hash} does not match the sealed manifest ${manifest.manifest_hash ?? "(unsealed)"} — not scored`,
    );
  }
  const runById = new Map(run.items.map((r) => [r.item_id, r]));
  const items: ItemScore[] = [];
  const unresolvedByClass: Record<string, number> = {};
  const familyScores: SealedScoreReport["family_scores"] = {};
  let accTotal = 0;
  let accAtoms = 0;
  let presTotal = 0;
  let presItems = 0;
  const byLang: Record<string, { total: number; atoms: number }> = {};
  const byClass: Record<string, { total: number; atoms: number }> = {};

  for (const item of manifest.items) {
    const runItem = runById.get(item.item_id);
    if (!runItem) throw new Error(`run is missing item ${item.item_id} — not scored`);
    const score = scoreOne(item, runItem);
    items.push(score);
    if (item.item_status === "unresolved") {
      unresolvedByClass[item.item_class] = (unresolvedByClass[item.item_class] ?? 0) + 1;
      continue;
    }
    if (score.g0_comparison) {
      const cmp = score.g0_comparison;
      accTotal += cmp.micro * cmp.total0;
      accAtoms += cmp.total0;
      for (const [fam, f] of Object.entries(cmp.familyScores)) {
        const agg = (familyScores[fam] ??= { atoms: 0, preserved: 0, score: 0 });
        agg.atoms += f.atoms;
        agg.preserved += f.preserved;
      }
      const lang = (byLang[item.language] ??= { total: 0, atoms: 0 });
      lang.total += cmp.micro * cmp.total0;
      lang.atoms += cmp.total0;
      const cls = (byClass[item.item_class] ??= { total: 0, atoms: 0 });
      cls.total += cmp.micro * cmp.total0;
      cls.atoms += cmp.total0;
    } else if (score.g0_accuracy === 0 && item.expected_graph) {
      // Unparsed determinate item: scores 0 over its expected atoms.
      accAtoms += item.expected_graph.atoms.length;
      const lang = (byLang[item.language] ??= { total: 0, atoms: 0 });
      lang.atoms += item.expected_graph.atoms.length;
      const cls = (byClass[item.item_class] ??= { total: 0, atoms: 0 });
      cls.atoms += item.expected_graph.atoms.length;
      for (const a of item.expected_graph.atoms) {
        const agg = (familyScores[a.family] ??= { atoms: 0, preserved: 0, score: 0 });
        agg.atoms += 1;
      }
    }
    if (score.preservation !== null) {
      presTotal += score.preservation;
      presItems += 1;
    }
  }
  for (const f of Object.values(familyScores)) f.score = f.atoms > 0 ? f.preserved / f.atoms : 0;
  const ratio = (r: { total: number; atoms: number }) => (r.atoms > 0 ? r.total / r.atoms : null);
  return {
    manifest_id: manifest.manifest_id,
    manifest_hash: manifest.manifest_hash ?? "",
    build_id: run.build_id,
    items,
    g0_accuracy_pooled: accAtoms > 0 ? accTotal / accAtoms : null,
    g0_accuracy_by_language: Object.fromEntries(Object.entries(byLang).map(([k, v]) => [k, ratio(v)])),
    g0_accuracy_by_class: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, ratio(v)])),
    preservation_pooled: presItems > 0 ? presTotal / presItems : null,
    family_scores: familyScores,
    unresolved_by_class: unresolvedByClass,
    scored_items: items.filter((i) => i.item_status !== "unresolved").length,
    unresolved_items: items.filter((i) => i.item_status === "unresolved").length,
  };
}
