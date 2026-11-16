/**
 * fork-sealed.test.ts — the sealed-materials machinery (C.5 + A1).
 *
 * These tests exercise the TOOLING on the builders' own fixture
 * (test/fixtures/sealed-draft.json): sealing, tamper detection, the
 * operator's blind view, hash-gated scoring, G0 accuracy against
 * sealed expected graphs, finite-ambiguity variants, and unresolved
 * items excluded-but-reported. The fixture is not a benchmark and
 * its scores are not evidence about the parser — a WP2 set must be
 * authored independently (C.5's standing demotions).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../src/fork/parse";
import { generate } from "../src/fork/generate";
import { extractFeatures } from "../src/fork/features";
import {
  sealManifest, verifyManifest, operatorView, scoreSealedRun,
  type SealedManifest, type SealedRun,
} from "../src/fork/sealed";

const draft = JSON.parse(
  // Tests run from dist/test/; fixtures live in the source tree.
  readFileSync(join(__dirname, "..", "..", "test", "fixtures", "sealed-draft.json"), "utf-8"),
) as SealedManifest;

function runFixture(manifest: SealedManifest): SealedRun {
  return {
    manifest_id: manifest.manifest_id,
    manifest_hash: manifest.manifest_hash!,
    build_id: "test",
    command: "in-process fixture run",
    items: operatorView(manifest).items.map((it) => {
      const g0 = parse(it.item_text, it.language);
      const generated = generate(g0);
      return {
        item_id: it.item_id,
        parsed: true,
        generated,
        g0_atoms: extractFeatures(g0),
        g1_atoms: extractFeatures(parse(generated, it.language)),
      };
    }),
  };
}

test("sealing computes hashes and verification passes on the sealed manifest", () => {
  const sealed = sealManifest(draft);
  assert.ok(sealed.manifest_hash);
  for (const item of sealed.items) assert.ok(item.content_hash, item.item_id);
  assert.deepEqual(verifyManifest(sealed), { ok: true, manifest_hash_ok: true, tampered_items: [] });
});

test("any post-sealing modification is detected and named", () => {
  const sealed = sealManifest(draft);
  const tampered: SealedManifest = JSON.parse(JSON.stringify(sealed));
  tampered.items[0].item_text = "He sleeps in summer.";
  const v = verifyManifest(tampered);
  assert.equal(v.ok, false);
  assert.deepEqual(v.tampered_items, [sealed.items[0].item_id]);
});

test("the operator view is blind by construction: no expected graphs or predictions", () => {
  const sealed = sealManifest(draft);
  const view = operatorView(sealed);
  const raw = JSON.stringify(view);
  assert.ok(!raw.includes("expected_graph"), "expected graphs must not reach the operator");
  assert.ok(!raw.includes("elemental_prediction"), "predictions must not reach the operator");
  assert.ok(!raw.includes("acceptable_variants"));
  for (const it of view.items) {
    assert.deepEqual(Object.keys(it).sort(), ["item_id", "item_text", "language", "parser_build_target"]);
  }
});

test("scoring refuses a run recorded against a different manifest hash", () => {
  const sealed = sealManifest(draft);
  const run = runFixture(sealed);
  run.manifest_hash = "0".repeat(64);
  assert.throws(() => scoreSealedRun(sealed, run), /does not match/);
});

test("G0 accuracy scores against the sealed graphs; unresolved items are excluded but reported", () => {
  const sealed = sealManifest(draft);
  const report = scoreSealedRun(sealed, runFixture(sealed));
  assert.equal(report.unresolved_items, 1);
  assert.equal(report.scored_items, 6);
  assert.deepEqual(report.unresolved_by_class, { "negative-control": 1 });
  // The fixture's expected graphs were authored from verified
  // parses, so the machinery check is exact agreement.
  assert.equal(report.g0_accuracy_pooled, 1);
  assert.equal(report.g0_accuracy_by_language.en, 1);
  assert.equal(report.g0_accuracy_by_language.zh, 1);
  assert.ok(report.family_scores.negation.atoms > 0);
});

test("finite-ambiguity: a declared variant can be the matched graph", () => {
  const sealed = sealManifest(draft);
  const run = runFixture(sealed);
  // Rewrite F-003's G0 atoms to its declared variant (rest at Earth).
  const f3 = run.items.find((i) => i.item_id === "F-003")!;
  f3.g0_atoms = f3.g0_atoms.map((a) =>
    a.family === "entity" && a.key === "rest#0" ? { ...a, value: "Earth" } : a,
  );
  const report = scoreSealedRun(sealed, run);
  const score = report.items.find((i) => i.item_id === "F-003")!;
  assert.equal(score.g0_accuracy, 1);
  assert.equal(score.matched_variant, "variant-1");
});

test("an unparsed determinate item scores 0 and drags its families with it", () => {
  const sealed = sealManifest(draft);
  const run = runFixture(sealed);
  const f5 = run.items.find((i) => i.item_id === "F-005")!;
  f5.parsed = false;
  f5.g0_atoms = [];
  const report = scoreSealedRun(sealed, run);
  assert.equal(report.items.find((i) => i.item_id === "F-005")!.g0_accuracy, 0);
  assert.ok((report.g0_accuracy_by_language.zh ?? 1) < 1, "the Chinese denominator shows the failure (C.6 parity)");
});
